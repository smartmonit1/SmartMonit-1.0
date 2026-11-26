import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  UserProfile,
  UserRole,
  Program,
  Infrastructure,
  Equipment,
  InspectionLog,
  ProgramStatus,
  InfrastructureType,
  ActiveSession,
  MaintenanceTicket,
  Session
} from '../types';
import { db, DEFAULT_LOCAL_RULES } from '../services/mockDatabase';
import {
  analyzeDailyFormStructured,
  calculateVMA,
  calculateReadinessScore,
  calculateACWR,
  buildVmaZonesTable,
  buildStrengthZonesTable
} from '../utils/biometrics';
import {
  parseTrainingFile,
  getRegulatoryInfo,
  listAIProvidersStatus,
  setPreferredAIProvider
} from '../services/geminiService';
import { AIProviderId } from '../types';
import {
  getDaysRemaining,
  getComplianceStatus,
  formatDateFr,
  formatDateTimeFr,
  getRegulatoryRuleForInfra,
  getRegulatoryRuleForEquipment,
  exportSecurityRegistryCSV
} from '../utils/compliance';
import { getBaseName, getBaseCode } from '../utils/bases';
import ProgramBuilder from './ProgramBuilder';
import FormulaSettingsModal from './program-builder/FormulaSettingsModal';
import { exportProgramPrintPDF } from '../utils/programExport';
import CalendarView from './CalendarView';
import { useToast } from './ToastProvider';
import CoachLaunchPanel from './CoachLaunchPanel';

interface Props {
  user: UserProfile;
  onLaunchCoachedSession: (session: Session, participant: UserProfile) => void;
}

type TabView = 'home' | 'coach' | 'users' | 'programs' | 'infras' | 'inventory' | 'registry' | 'agenda' | 'governance';

const DashboardMonitor: React.FC<Props> = ({ user, onLaunchCoachedSession }) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabView>('home');
  const [showBuilder, setShowBuilder] = useState(false);
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [builderTargetUserId, setBuilderTargetUserId] = useState<string | undefined>(undefined);

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const refresh = () => setRefreshTrigger((prev) => prev + 1);

  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [selectedLiveSession, setSelectedLiveSession] = useState<ActiveSession | null>(null);

  useEffect(() => {
    const syncLiveSessions = () => {
      setActiveSessions(db.getActiveSessions().filter((s) => !s.serviceId || s.serviceId === user.serviceId));
    };
    const syncAll = () => {
      syncLiveSessions();
      refresh();
    };
    syncLiveSessions();
    window.addEventListener('db_updated', syncAll);
    const interval = setInterval(syncLiveSessions, 4000);
    return () => {
      window.removeEventListener('db_updated', syncAll);
      clearInterval(interval);
    };
  }, [user.serviceId]);

  const users = useMemo(
    () => db.getUsers().filter((u) => u.serviceId === user.serviceId),
    [user.serviceId, refreshTrigger]
  );
  const infras = useMemo(
    () => db.getInfrastructures().filter((i) => i.serviceId === user.serviceId),
    [user.serviceId, refreshTrigger]
  );
  const equipment = useMemo(
    () => db.getEquipment().filter((e) => infras.some((i) => i.id === e.infrastructureId)),
    [infras, refreshTrigger]
  );
  const programs = useMemo(() => db.getPrograms(), [refreshTrigger]);
  const inspections = useMemo(
    () => db.getInspections().filter((l) => l.serviceId === user.serviceId),
    [user.serviceId, refreshTrigger]
  );
  const auditLogs = useMemo(
    () => db.getAuditLogs().filter((l) => !l.serviceId || l.serviceId === user.serviceId).slice(0, 60),
    [user.serviceId, refreshTrigger]
  );
  const maintenanceTickets = useMemo(
    () => db.getMaintenanceTickets(user.serviceId),
    [user.serviceId, refreshTrigger]
  );
  const [aiProviders, setAiProviders] = useState(listAIProvidersStatus());

  // GMAO Pro : Modale création ticket maintenance & Fiche QR signalétique imprimable
  const [ticketDraft, setTicketDraft] = useState<{
    targetType: 'INFRASTRUCTURE' | 'EQUIPMENT';
    targetId: string;
    targetName: string;
    priority: MaintenanceTicket['priority'];
    title: string;
    description: string;
    setAssetMaintenance: boolean;
  } | null>(null);
  const [qrAssetModal, setQrAssetModal] = useState<{
    name: string;
    subtitle: string;
    norm: string;
    lastVisual?: string;
    lastReg?: string;
    status: string;
  } | null>(null);

  const handleCreateTicket = () => {
    if (!ticketDraft || !ticketDraft.title.trim()) {
      showToast('Veuillez saisir un intitulé de panne ou d\'intervention.', 'warning');
      return;
    }
    const newTicket: MaintenanceTicket = {
      id: `tkt_${Date.now()}`,
      serviceId: user.serviceId || 'ear927',
      targetType: ticketDraft.targetType,
      targetId: ticketDraft.targetId,
      targetName: ticketDraft.targetName,
      priority: ticketDraft.priority,
      title: ticketDraft.title.trim(),
      description: ticketDraft.description.trim() || 'Intervention technique signalée via GMAO SmartMonit.',
      status: 'OUVERT',
      reportedByNid: user.nid,
      reportedByName: user.name,
      createdAt: new Date().toISOString()
    };
    db.addMaintenanceTicket(newTicket);

    if (ticketDraft.setAssetMaintenance) {
      if (ticketDraft.targetType === 'INFRASTRUCTURE') {
        const infra = infras.find((i) => i.id === ticketDraft.targetId);
        if (infra) {
          db.updateInfrastructure({
            ...infra,
            status: ticketDraft.priority === 'CRITIQUE' ? 'Closed' : 'Maintenance'
          });
        }
      } else {
        const eq = equipment.find((e) => e.id === ticketDraft.targetId);
        if (eq) {
          db.updateEquipment({
            ...eq,
            status: ticketDraft.priority === 'CRITIQUE' ? 'Damaged' : 'Maintenance'
          });
        }
      }
    }
    setTicketDraft(null);
    showToast(`Ticket GMAO ouvert (${newTicket.priority}) pour ${newTicket.targetName}.`, 'warning');
    refresh();
  };

  const handleUpdateTicketStatus = (ticket: MaintenanceTicket, nextStatus: MaintenanceTicket['status']) => {
    const updated: MaintenanceTicket = {
      ...ticket,
      status: nextStatus,
      resolvedAt: nextStatus === 'RESOLU' ? new Date().toISOString() : ticket.resolvedAt
    };
    db.updateMaintenanceTicket(updated);
    if (nextStatus === 'RESOLU') {
      if (ticket.targetType === 'INFRASTRUCTURE') {
        const infra = infras.find((i) => i.id === ticket.targetId);
        if (infra && infra.status !== 'Operational') {
          db.updateInfrastructure({ ...infra, status: 'Operational' });
        }
      } else {
        const eq = equipment.find((e) => e.id === ticket.targetId);
        if (eq && eq.status !== 'Operational') {
          db.updateEquipment({ ...eq, status: 'Operational' });
        }
      }
      db.addInspectionLog({
        id: `insp_tkt_${Date.now()}`,
        serviceId: user.serviceId || 'ear927',
        targetId: ticket.targetId,
        targetName: ticket.targetName,
        targetType: ticket.targetType === 'INFRASTRUCTURE' ? 'INFRA' : 'EQUIP',
        inspectionType: 'VISUAL',
        date: new Date().toISOString().split('T')[0],
        inspectorNid: user.nid,
        inspectorName: user.name,
        timestamp: new Date().toISOString(),
        status: 'CONFORME',
        notes: `Clôture ticket GMAO : ${ticket.title} — Remis en service opérationnel.`
      });
      showToast(`Ticket résolu et ${ticket.targetName} remis en service (tracé au Registre) !`, 'success');
    } else {
      showToast(`Ticket passé en statut : ${nextStatus}.`, 'info');
    }
    refresh();
  };

  const handleSelectAIProvider = (providerId: AIProviderId) => {
    setPreferredAIProvider(providerId);
    setAiProviders(listAIProvidersStatus());
    db.logAudit({
      actorNid: user.nid,
      actorName: user.name,
      actorRole: user.role,
      serviceId: user.serviceId,
      action: 'AI_PROVIDER_CHANGED',
      details: `Bascule du moteur IA actif vers : ${providerId.toUpperCase()}`
    });
    showToast(`Moteur IA configuré sur : ${providerId.toUpperCase()}`, 'success');
    refresh();
  };

  // Import & Modals
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const [editingInfra, setEditingInfra] = useState<Infrastructure | null>(null);
  const [editingEquip, setEditingEquip] = useState<Equipment | null>(null);
  const [inspectionDraft, setInspectionDraft] = useState<{
    target: Infrastructure | Equipment;
    targetType: 'INFRA' | 'EQUIP';
    inspectionType: 'VISUAL' | 'REGULATORY';
    status: InspectionLog['status'];
    notes: string;
  } | null>(null);
  const [regInfo, setRegInfo] = useState<string | null>(null);
  const [loadingReg, setLoadingReg] = useState(false);

  // Règlement Intérieur Local modal
  const [showRulesEditor, setShowRulesEditor] = useState(false);
  const currentService = db.getServiceById(user.serviceId);
  const [localRulesDraft, setLocalRulesDraft] = useState(currentService?.localRules || DEFAULT_LOCAL_RULES);

  // Sorting & Filtering
  const [infraSort, setInfraSort] = useState<'name' | 'visual' | 'regulatory'>('visual');
  const [infraSearch, setInfraSearch] = useState('');
  const [infraStatusFilter, setInfraStatusFilter] = useState<'all' | 'Operational' | 'Maintenance' | 'Closed'>('all');
  const [equipFilterCategory, setEquipFilterCategory] = useState<string>('all');
  const [equipFilterInfra, setEquipFilterInfra] = useState<string>('all');
  const [equipFilterStatus, setEquipFilterStatus] = useState<'all' | Equipment['status']>('all');
  const [equipSearch, setEquipSearch] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [programSearch, setProgramSearch] = useState('');
  const [programFilter, setProgramFilter] = useState<'all' | 'pending' | 'active' | 'templates'>('all');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  const sortedInfras = useMemo(() => {
    return [...infras].sort((a, b) => {
      if (infraSort === 'name') return a.name.localeCompare(b.name);
      const rA = getRegulatoryRuleForInfra(a.type);
      const rB = getRegulatoryRuleForInfra(b.type);
      if (infraSort === 'visual') {
        return (
          getDaysRemaining(a.lastVisualInspection, a.visualIntervalDays || rA.visualIntervalDays) -
          getDaysRemaining(b.lastVisualInspection, b.visualIntervalDays || rB.visualIntervalDays)
        );
      }
      return (
        getDaysRemaining(a.lastRegulatoryInspection, a.regulatoryIntervalDays || rA.regulatoryIntervalDays) -
        getDaysRemaining(b.lastRegulatoryInspection, b.regulatoryIntervalDays || rB.regulatoryIntervalDays)
      );
    });
  }, [infras, infraSort]);

  const filteredEquipment = useMemo(() => {
    return equipment.filter((eq) => {
      const matchCat = equipFilterCategory === 'all' || eq.category === equipFilterCategory;
      const matchInfra = equipFilterInfra === 'all' || eq.infrastructureId === equipFilterInfra;
      const matchStatus = equipFilterStatus === 'all' || eq.status === equipFilterStatus;
      const query = equipSearch.trim().toLocaleLowerCase('fr');
      const matchSearch =
        !query ||
        eq.name.toLocaleLowerCase('fr').includes(query) ||
        (eq.notes || '').toLocaleLowerCase('fr').includes(query);
      return matchCat && matchInfra && matchStatus && matchSearch;
    });
  }, [equipment, equipFilterCategory, equipFilterInfra, equipFilterStatus, equipSearch]);

  const filteredInfras = useMemo(() => {
    const query = infraSearch.trim().toLocaleLowerCase('fr');
    return sortedInfras.filter((infra) => {
      const matchStatus = infraStatusFilter === 'all' || (infra.status || 'Operational') === infraStatusFilter;
      const matchSearch =
        !query ||
        infra.name.toLocaleLowerCase('fr').includes(query) ||
        infra.type.toLocaleLowerCase('fr').includes(query);
      return matchStatus && matchSearch;
    });
  }, [sortedInfras, infraSearch, infraStatusFilter]);

  const filteredPrograms = useMemo(() => {
    const query = programSearch.trim().toLocaleLowerCase('fr');
    return programs.filter((program) => {
      if (programFilter === 'pending' && (program.status !== ProgramStatus.PENDING || program.isTemplate)) return false;
      if (programFilter === 'active' && (program.status !== ProgramStatus.VALIDATED || program.isTemplate)) return false;
      if (programFilter === 'templates' && !program.isTemplate) return false;
      const targetUser = users.find((item) => item.nid === program.userId);
      return (
        !query ||
        program.title.toLocaleLowerCase('fr').includes(query) ||
        program.goal.toLocaleLowerCase('fr').includes(query) ||
        (targetUser?.name || '').toLocaleLowerCase('fr').includes(query) ||
        (program.assignedUnit || '').toLocaleLowerCase('fr').includes(query)
      );
    });
  }, [programs, programFilter, programSearch, users]);

  // --- ALERTES ACTIONNABLES ---
  const alerts = useMemo(() => {
    const list: {
      id: string;
      type: 'health' | 'program' | 'compliance_infra' | 'compliance_equip';
      msg: string;
      priority: 'high' | 'med';
      target?: any;
    }[] = [];

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Demandes de programmes en attente
    programs
      .filter((p) => p.status === ProgramStatus.PENDING && users.some((u) => u.nid === p.userId))
      .forEach((p) => {
        const u = users.find((x) => x.nid === p.userId);
        list.push({
          id: `p_${p.id}`,
          type: 'program',
          msg: `Demande programme : ${u?.name || p.userId} (${p.goal})`,
          priority: 'med',
          target: p
        });
      });

    // Alerts related to the current wellness check-in.
    users.forEach((u) => {
      const daily = u.dailyForms.find((d) => d.date === today);
      if (daily) {
        const analysis = analyzeDailyFormStructured(daily);
        if (analysis.zone === 'BLACK' || analysis.zone === 'RED') {
          list.push({
            id: `h_${u.nid}`,
            type: 'health',
            msg: `Alerte Forme (${analysis.zone}) : ${u.name}${daily.painZone ? ` — ${daily.painZone}` : ''}`,
            priority: 'high',
            target: u
          });
        }
      }
    });

    // Conformité Infrastructures (règles normatives réelles)
    infras.forEach((i) => {
      const rule = getRegulatoryRuleForInfra(i.type);
      const dVis = getDaysRemaining(i.lastVisualInspection, i.visualIntervalDays || rule.visualIntervalDays);
      if (getComplianceStatus(dVis) !== 'VALID') {
        list.push({
          id: `ci_v_${i.id}`,
          type: 'compliance_infra',
          msg: `${rule.visualLabel} — ${i.name} (${dVis < 0 ? `Expiré ${Math.abs(dVis)}j` : `J-${dVis}`})`,
          priority: dVis < 0 ? 'high' : 'med',
          target: i
        });
      }
      const dReg = getDaysRemaining(i.lastRegulatoryInspection, i.regulatoryIntervalDays || rule.regulatoryIntervalDays);
      if (getComplianceStatus(dReg) !== 'VALID') {
        list.push({
          id: `ci_r_${i.id}`,
          type: 'compliance_infra',
          msg: `${rule.regulatoryLabel} — ${i.name} (${dReg < 0 ? `Expiré ${Math.abs(dReg)}j` : `J-${dReg}`})`,
          priority: dReg < 0 ? 'high' : 'med',
          target: i
        });
      }
    });

    // Conformité Matériel
    equipment.forEach((e) => {
      const rule = getRegulatoryRuleForEquipment(e.category);
      const dVis = getDaysRemaining(e.lastVisualInspection, e.visualIntervalDays || rule.visualIntervalDays);
      if (getComplianceStatus(dVis) !== 'VALID') {
        list.push({
          id: `ce_v_${e.id}`,
          type: 'compliance_equip',
          msg: `${rule.visualLabel} — ${e.name} (${dVis < 0 ? `Expiré ${Math.abs(dVis)}j` : `J-${dVis}`})`,
          priority: dVis < 0 ? 'high' : 'med',
          target: e
        });
      }
    });

    return list;
  }, [users, infras, equipment, programs]);

  // --- COMPLIANCE ACTIONS (Horodatage Registre Sécurité Art. R.322-25) ---
  const logQuickInspection = (
    target: Infrastructure | Equipment,
    targetType: 'INFRA' | 'EQUIP',
    inspectionType: 'VISUAL' | 'REGULATORY',
    status: InspectionLog['status'],
    notes: string
  ) => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const normReference =
      targetType === 'INFRA'
        ? (target as Infrastructure).normReference || getRegulatoryRuleForInfra((target as Infrastructure).type).normCode
        : (target as Equipment).normReference || getRegulatoryRuleForEquipment((target as Equipment).category).normCode;

    if (targetType === 'INFRA') {
      const updated: Infrastructure = {
        ...(target as Infrastructure),
        lastVisualInspection: inspectionType === 'VISUAL' ? today : target.lastVisualInspection,
        lastRegulatoryInspection: inspectionType === 'REGULATORY' ? today : target.lastRegulatoryInspection,
        status:
          status === 'NON_CONFORME'
            ? 'Closed'
            : status === 'RESERVE'
            ? 'Maintenance'
            : (target as Infrastructure).status
      };
      db.upsertInfrastructure(updated);
      setEditingInfra(updated);
    } else {
      const updated: Equipment = {
        ...(target as Equipment),
        lastVisualInspection: inspectionType === 'VISUAL' ? today : target.lastVisualInspection,
        lastRegulatoryInspection: inspectionType === 'REGULATORY' ? today : target.lastRegulatoryInspection,
        status:
          status === 'NON_CONFORME'
            ? 'Damaged'
            : status === 'RESERVE'
            ? 'Maintenance'
            : (target as Equipment).status
      };
      db.upsertEquipment(updated);
      setEditingEquip(updated);
    }

    const log: InspectionLog = {
      id: `insp_${Date.now()}`,
      targetId: target.id,
      targetType,
      targetName: target.name,
      serviceId: user.serviceId || 'ear927',
      inspectionType,
      date: today,
      timestamp: new Date().toISOString(),
      inspectorNid: user.nid,
      inspectorName: user.name,
      status,
      normReference,
      notes: notes.trim() || `Contrôle ${inspectionType === 'VISUAL' ? 'visuel' : 'réglementaire'} enregistré.`
    };
    db.addInspectionLog(log);
    showToast(
      status === 'CONFORME'
        ? `Contrôle conforme enregistré pour ${target.name}.`
        : status === 'RESERVE'
        ? `Contrôle avec réserves enregistré. ${target.name} passe en maintenance.`
        : `Non-conformité enregistrée. ${target.name} est retiré(e) de l'utilisation.`,
      status === 'CONFORME' ? 'success' : 'warning'
    );
    refresh();
  };

  const openInspectionForm = (
    target: Infrastructure | Equipment,
    targetType: 'INFRA' | 'EQUIP',
    inspectionType: 'VISUAL' | 'REGULATORY'
  ) => {
    setInspectionDraft({ target, targetType, inspectionType, status: 'CONFORME', notes: '' });
  };

  const saveInfra = (infra: Infrastructure) => {
    if (!infra.name.trim()) {
      showToast('Le nom de l\'infrastructure est requis.', 'warning');
      return;
    }
    const rule = getRegulatoryRuleForInfra(infra.type);
    db.upsertInfrastructure({
      ...infra,
      serviceId: user.serviceId || 'ear927',
      normReference: infra.normReference || rule.normCode,
      visualIntervalDays: infra.visualIntervalDays || rule.visualIntervalDays,
      regulatoryIntervalDays: infra.regulatoryIntervalDays || rule.regulatoryIntervalDays
    });
    setEditingInfra(null);
    setRegInfo(null);
    showToast('Infrastructure enregistrée.', 'success');
    refresh();
  };

  const deleteInfra = (id: string) => {
    if (window.confirm('Supprimer cette infrastructure ?')) {
      db.deleteInfrastructure(id);
      setEditingInfra(null);
      showToast('Infrastructure supprimée.', 'info');
      refresh();
    }
  };

  const saveEquip = (eq: Equipment) => {
    if (!eq.name.trim()) {
      showToast('Le nom de l\'équipement est requis.', 'warning');
      return;
    }
    const rule = getRegulatoryRuleForEquipment(eq.category);
    db.upsertEquipment({
      ...eq,
      serviceId: user.serviceId || 'ear927',
      normReference: eq.normReference || rule.normCode,
      visualIntervalDays: eq.visualIntervalDays || rule.visualIntervalDays,
      regulatoryIntervalDays: eq.regulatoryIntervalDays || rule.regulatoryIntervalDays
    });
    setEditingEquip(null);
    setRegInfo(null);
    showToast('Équipement enregistré dans l\'inventaire.', 'success');
    refresh();
  };

  const deleteEquip = (id: string) => {
    if (window.confirm('Supprimer cet équipement de l\'inventaire ?')) {
      db.deleteEquipment(id);
      setEditingEquip(null);
      showToast('Équipement supprimé.', 'info');
      refresh();
    }
  };

  const handleGetRegInfo = async (name: string, type: string) => {
    setLoadingReg(true);
    setRegInfo(null);
    try {
      const info = await getRegulatoryInfo(name, type);
      setRegInfo(info);
    } catch {
      setRegInfo('Information réglementaire indisponible.');
    } finally {
      setLoadingReg(false);
    }
  };

  // Import IA réel de programme -> ouvre ProgramBuilder pré-rempli !
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1] || '');
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const parsed = await parseTrainingFile(base64, file.type || 'application/pdf');
      const draftProgram: Program = {
        id: `prog_imp_${Date.now()}`,
        userId: '',
        title: parsed.title || `Import : ${file.name}`,
        goal: parsed.goal || 'Programme importé par IA',
        status: ProgramStatus.VALIDATED,
        startDate: new Date().toISOString().split('T')[0],
        durationWeeks: 4,
        sessionsPerWeek: Math.max(1, (parsed.sessions || []).length),
        sessions: (parsed.sessions || []).map((s: any, idx: number) => ({
          id: `imp_s_${idx}`,
          infrastructureId: 'any',
          title: s.title || `Séance ${idx + 1}`,
          type: s.type || 'MUSCU',
          workoutType: s.type || 'MUSCU',
          durationMinutes: 45,
          description: s.description || '',
          isCompleted: false,
          content: {
            mainBlock: (s.exercises || []).map((ex: any) => ({
              exercise: ex.name,
              prescription: `${ex.sets || 3}x${ex.reps || '10'}`,
              rest: ex.rest || '1:30'
            }))
          }
        }))
      };
      setSelectedProgram(draftProgram);
      setShowBuilder(true);
      showToast('Document analysé ! Vérifiez et affectez le programme dans le Builder.', 'success');
    } catch {
      showToast('Erreur lors de l\'import du fichier.', 'error');
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  const handleSaveLocalRules = () => {
    const baseId = user.serviceId || 'ear927';
    db.upsertService({
      id: baseId,
      code: getBaseCode(baseId),
      name: currentService?.name || `Équipe sportive — ${getBaseName(baseId)}`,
      monitorId: currentService?.monitorId || user.nid,
      emergencyPhone: currentService?.emergencyPhone,
      orfaContact: currentService?.orfaContact,
      localRules: localRulesDraft
    });
    setShowRulesEditor(false);
    showToast('Consignes locales mises à jour; elles seront présentées lors du prochain bilan.', 'success');
  };

  const ComplianceBadge = ({ days }: { days: number }) => {
    const status = getComplianceStatus(days);
    if (status === 'EXPIRED') {
      return (
        <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[9px] font-black uppercase">
          {days <= -999 ? 'Non fait' : `Expiré (${Math.abs(days)}j)`}
        </span>
      );
    }
    if (status === 'WARNING') {
      return <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[9px] font-black uppercase">J-{days}</span>;
    }
    return <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[9px] font-black uppercase">Valide ({days}j)</span>;
  };

  if (showBuilder) {
    return (
      <ProgramBuilder
        onClose={() => {
          setShowBuilder(false);
          setSelectedProgram(null);
          setBuilderTargetUserId(undefined);
          refresh();
        }}
        existingProgram={selectedProgram || undefined}
        defaultTargetUserId={builderTargetUserId}
        user={user}
      />
    );
  }

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s]">
      <section className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-military-500">
            <span className="material-icons text-base text-emerald-700" aria-hidden="true">monitoring</span>
            Gestion & coaching
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-military-900 mt-1">Espace moniteur</h2>
          <p className="text-sm text-military-500 mt-1">{getBaseName(user.serviceId)} · Coaching, cours et équipements</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800">
            <span className={`h-2 w-2 rounded-full ${activeSessions.length ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
            {activeSessions.length} séance{activeSessions.length === 1 ? '' : 's'} en cours
          </span>
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 ${
            alerts.length ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-military-200 bg-white text-military-600'
          }`}>
            <span className="material-icons text-sm" aria-hidden="true">{alerts.length ? 'priority_high' : 'check_circle'}</span>
            {alerts.length ? `${alerts.length} action${alerts.length === 1 ? '' : 's'} à traiter` : 'Aucune action en attente'}
          </span>
        </div>
      </section>

      {/* Barre d'onglets Moniteur */}
      <div className="overflow-x-auto pb-1 no-scrollbar">
        <div className="flex gap-2 min-w-max" role="group" aria-label="Sections de l’espace moniteur">
          {[
            { id: 'home', label: 'Vue d’ensemble', icon: 'dashboard' },
            { id: 'coach', label: 'Assistant coach', icon: 'auto_awesome' },
            { id: 'users', label: 'Membres', icon: 'people' },
            { id: 'programs', label: 'Programmes', icon: 'model_training' },
            { id: 'infras', label: 'Installations', icon: 'stadium' },
            { id: 'inventory', label: 'Matériel', icon: 'fitness_center' },
            { id: 'registry', label: 'Suivi & sécurité', icon: 'verified_user' },
            { id: 'agenda', label: 'Planning des cours', icon: 'calendar_today' },
            { id: 'governance', label: 'IA & confidentialité', icon: 'security' }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-pressed={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id as TabView)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${
                activeTab === tab.id
                  ? 'bg-military-900 text-white shadow-md'
                  : 'bg-white text-military-600 border border-military-100 hover:bg-military-50'
              }`}
            >
              <span className={`material-icons text-base ${activeTab === tab.id ? 'text-action-400' : 'text-military-400'}`}>
                {tab.icon}
              </span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'coach' && (
        <CoachLaunchPanel
          users={users.filter((member) => member.role === UserRole.USER)}
          infrastructures={infras.filter((infrastructure) => infrastructure.status !== 'Closed')}
          equipment={equipment}
          onLaunch={onLaunchCoachedSession}
        />
      )}

      {/* --- VUE GLOBALE --- */}
      {activeTab === 'home' && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-military-100">
              <div className="text-gray-400 text-[10px] font-black uppercase">Membres ({getBaseCode(user.serviceId)})</div>
              <div className="text-3xl font-black text-military-900 mt-1">
                {users.filter((u) => u.role === UserRole.USER).length}
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-military-100">
              <div className="text-gray-400 text-[10px] font-black uppercase">En Séance (Live)</div>
              <div className="text-3xl font-black text-action-600 mt-1 flex items-center gap-2">
                {activeSessions.length}
                {activeSessions.length > 0 && <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />}
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-military-100">
              <div className="text-gray-400 text-[10px] font-black uppercase">Actions Requises</div>
              <div className="text-3xl font-black text-red-600 mt-1">{alerts.length}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-military-100">
              <div className="text-gray-400 text-[10px] font-black uppercase">Matériel HS / Maint.</div>
              <div className="text-3xl font-black text-amber-600 mt-1">
                {equipment.filter((e) => e.status !== 'Operational').length}
              </div>
            </div>
          </div>

          {/* Actions rapides */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="bg-military-900 text-white p-5 rounded-2xl shadow-md flex items-center justify-between hover:bg-military-800 transition-all active:scale-95"
            >
              <div className="text-left">
                <h3 className="font-black text-sm uppercase">{isImporting ? 'Analyse IA...' : 'Import IA Programme'}</h3>
                <p className="text-military-300 text-[11px] mt-0.5">PDF / Image → Program Builder</p>
              </div>
              <span className="material-icons text-3xl text-action-400">cloud_upload</span>
            </button>
            <input type="file" ref={fileInputRef} hidden onChange={handleFileUpload} accept="image/*,.pdf" />

            <button
              onClick={() => {
                setSelectedProgram(null);
                setBuilderTargetUserId(undefined);
                setShowBuilder(true);
              }}
              className="bg-action-500 text-military-950 p-5 rounded-2xl shadow-md flex items-center justify-between hover:bg-action-400 transition-all active:scale-95"
            >
              <div className="text-left">
                <h3 className="font-black text-sm uppercase">Nouveau Programme</h3>
                <p className="text-military-900/80 text-[11px] mt-0.5">Individuel ou Personnalisation de masse</p>
              </div>
              <span className="material-icons text-3xl">add_circle</span>
            </button>

            <button
              onClick={() => {
                setLocalRulesDraft(currentService?.localRules || DEFAULT_LOCAL_RULES);
                setShowRulesEditor(true);
              }}
              className="bg-white border border-military-200 text-military-900 p-5 rounded-2xl shadow-sm flex items-center justify-between hover:border-action-500 transition-all"
            >
              <div className="text-left">
                <h3 className="font-black text-sm uppercase">Règlement Local</h3>
                <p className="text-gray-500 text-[11px] mt-0.5">Éditer les consignes de votre base</p>
              </div>
              <span className="material-icons text-3xl text-military-500">gavel</span>
            </button>
          </div>

          {/* Actions Requises cliquables */}
          {alerts.length > 0 && (
            <div className="bg-red-50/70 rounded-3xl p-5 border border-red-200">
              <h3 className="font-black text-red-900 mb-3 flex items-center gap-2 text-xs uppercase tracking-wider">
                <span className="material-icons text-base text-red-600">notifications_active</span>
                Actions Requises ({alerts.length})
              </h3>
              <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                {alerts.map((a) => (
                  <div key={a.id} className="bg-white p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-sm border border-red-100">
                    <span className="font-bold text-xs text-gray-800">{a.msg}</span>
                    <button
                      onClick={() => {
                        if (a.type === 'program') {
                          setSelectedProgram(a.target);
                          setShowBuilder(true);
                        } else if (a.type === 'health') {
                          setSelectedUser(a.target);
                        } else if (a.type === 'compliance_infra') {
                          setEditingInfra(a.target);
                        } else if (a.type === 'compliance_equip') {
                          setEditingEquip(a.target);
                        }
                      }}
                      className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase ${
                        a.type === 'program'
                          ? 'bg-military-900 text-white'
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }`}
                    >
                      {a.type === 'program' ? 'Traiter' : a.type === 'health' ? 'Voir profil' : 'Contrôler'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Monitoring Live (Section 4.9.5) */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-military-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-sm text-military-900 uppercase flex items-center gap-2">
                <span className="material-icons text-red-500 text-base animate-pulse">fiber_manual_record</span>
                Activité en cours
              </h3>
              <span className="bg-military-100 text-military-800 px-3 py-1 rounded-full text-xs font-black">
                {activeSessions.length} actif(s)
              </span>
            </div>
            {activeSessions.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm italic">
                Aucune séance en cours pour le moment.
              </div>
            ) : (
              <div className="space-y-2.5">
                {activeSessions.map((session) => {
                  const elapsedMin = Math.max(0, Math.floor((Date.now() - new Date(session.startTime).getTime()) / 60000));
                  return (
                    <div
                      key={session.id}
                      onClick={() => setSelectedLiveSession(session)}
                      className="flex items-center justify-between p-4 bg-military-50 hover:bg-action-50 rounded-2xl border border-military-100 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-military-900 text-action-400 rounded-xl flex items-center justify-center font-black">
                          {session.userName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-black text-sm text-military-900">{session.userName}</div>
                          <div className="text-xs text-gray-500">
                            {session.infrastructureName} • {session.details}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-black uppercase bg-action-100 text-action-700 px-2 py-0.5 rounded">
                          {session.sessionType}
                        </span>
                        <div className="text-xs font-bold text-military-700 mt-1">Depuis {elapsedMin} min</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- MILITAIRES --- */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="relative">
            <span className="material-icons absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">search</span>
            <input
              type="text"
              placeholder="Rechercher par identifiant, nom ou équipe…"
              className="w-full pl-11 pr-4 py-3 bg-white border border-military-200 rounded-2xl font-bold text-sm outline-none focus:border-action-500"
              value={userSearchTerm}
              onChange={(e) => setUserSearchTerm(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users
              .filter(
                (u) =>
                  u.role === UserRole.USER &&
                  (u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                    u.nid.includes(userSearchTerm) ||
                    (u.unit || '').toLowerCase().includes(userSearchTerm.toLowerCase()))
              )
              .map((u) => {
                const lastForm = u.dailyForms?.[u.dailyForms.length - 1];
                const readiness = calculateReadinessScore(lastForm);
                const acwr = calculateACWR(u.sessionLogs);
                return (
                  <div
                    key={u.nid}
                    onClick={() => {
                      db.logAudit({
                        actorNid: user.nid,
                        actorName: user.name,
                        actorRole: user.role,
                        serviceId: user.serviceId,
                        action: 'VIEW_USER_PROFILE',
                        targetId: u.nid,
                        details: `Consultation de la fiche membre de ${u.name} (identifiant ${u.nid}).`
                      });
                      setSelectedUser(u);
                    }}
                    className="bg-white p-5 rounded-2xl border border-military-100 shadow-sm cursor-pointer hover:border-action-500 transition-all space-y-3"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 bg-military-900 text-action-400 rounded-2xl flex items-center justify-center font-black text-lg shrink-0">
                        {u.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-black text-sm text-military-900 truncate">{u.name}</h4>
                        <p className="text-[11px] text-gray-500 font-mono">ID {u.nid} • VMA {calculateVMA(u.tests)}</p>
                        <p className="text-[10px] text-action-700 font-bold truncate mt-0.5">{u.unit || u.jobType}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 text-[10px] font-black uppercase">
                      <span className={`px-2 py-0.5 rounded bg-gray-50 ${readiness.colorClass}`}>
                        Readiness {readiness.score}/100
                      </span>
                      <span className={`px-2 py-0.5 rounded ${acwr.badgeClass}`}>
                        ACWR {acwr.ratio > 0 ? acwr.ratio.toFixed(2) : '—'}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* --- PROGRAMMES --- */}
      {activeTab === 'programs' && (
        <div className="space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <h3 className="text-lg font-black text-military-900 uppercase">Programmes & Demandes</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFormulaModal(true)}
                className="px-3.5 py-2.5 bg-white border border-military-200 text-military-900 rounded-xl font-black uppercase text-xs flex items-center gap-1 hover:border-action-500"
                title="Paramètres des formules d'entraînement"
              >
                <span className="material-icons text-sm text-action-600">functions</span> Formules d'entraînement
              </button>
              <button
                onClick={() => {
                  setSelectedProgram(null);
                  setBuilderTargetUserId(undefined);
                  setShowBuilder(true);
                }}
                className="px-4 py-2.5 bg-action-500 text-military-950 rounded-xl font-black uppercase text-xs flex items-center gap-1 shadow"
              >
                <span className="material-icons text-sm">add</span> Nouveau Programme
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Programmes suivis', value: programs.length },
              { label: 'Demandes à traiter', value: programs.filter((item) => item.status === ProgramStatus.PENDING && !item.isTemplate).length },
              { label: 'Programmes actifs', value: programs.filter((item) => item.status === ProgramStatus.VALIDATED && !item.isTemplate).length },
              { label: 'Modèles disponibles', value: programs.filter((item) => item.isTemplate).length }
            ].map((item) => (
              <div key={item.label} className="bg-white border border-military-100 rounded-2xl p-4">
                <div className="text-2xl font-black text-military-900">{item.value}</div>
                <div className="text-[9px] font-black uppercase tracking-wide text-gray-500">{item.label}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <label className="relative flex-1">
              <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
              <input
                type="search"
                value={programSearch}
                onChange={(event) => setProgramSearch(event.target.value)}
                placeholder="Rechercher un programme, un objectif, une personne..."
                className="w-full pl-10 pr-3 py-2.5 bg-white border border-military-200 rounded-xl text-sm"
              />
            </label>
            <select
              aria-label="Filtrer les programmes"
              value={programFilter}
              onChange={(event) => setProgramFilter(event.target.value as typeof programFilter)}
              className="bg-white border border-military-200 text-sm font-bold rounded-xl px-3 py-2.5"
            >
              <option value="all">Tous les programmes</option>
              <option value="pending">Demandes à traiter</option>
              <option value="active">Programmes actifs</option>
              <option value="templates">Modèles</option>
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPrograms.map((p) => {
              const targetUser = users.find((u) => u.nid === p.userId);
              const completedCount = p.sessions.filter((session) => session.isCompleted).length;
              const progress = p.sessions.length ? Math.round((completedCount / p.sessions.length) * 100) : 0;
              return (
                <div key={p.id} className="bg-white p-5 rounded-2xl border border-military-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <span
                        className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                          p.status === ProgramStatus.PENDING
                            ? 'bg-amber-100 text-amber-800'
                            : p.isTemplate
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {p.status === ProgramStatus.PENDING ? 'En attente' : p.isTemplate ? 'Modèle partagé' : 'Actif'}
                      </span>
                      {p.assignedUnit && (
                        <span className="text-[9px] font-black bg-purple-100 text-purple-800 px-2 py-0.5 rounded uppercase">
                          Unité : {p.assignedUnit}
                        </span>
                      )}
                    </div>
                    <h4 className="font-black text-military-900 text-sm">{p.title}</h4>
                    <p className="text-xs text-gray-500 mt-1">
                      {targetUser?.name || p.assignedUnit || 'Modèle mutualisé'} • {p.durationWeeks} sem • {p.sessions.length} séances
                    </p>
                    {!p.isTemplate && p.status === ProgramStatus.VALIDATED && (
                      <div className="mt-4">
                        <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1.5">
                          <span>Progression du programme</span>
                          <span>{completedCount}/{p.sessions.length} séances · {progress}%</span>
                        </div>
                        <div
                          className="h-2 bg-gray-100 rounded-full overflow-hidden"
                          role="progressbar"
                          aria-label={`Progression de ${p.title}`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={progress}
                        >
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedProgram(p);
                        setShowBuilder(true);
                      }}
                      className="flex-1 py-2.5 bg-military-50 hover:bg-military-900 hover:text-white text-military-900 rounded-xl text-xs font-black uppercase transition-colors"
                    >
                      {p.status === ProgramStatus.PENDING ? 'Traiter la demande' : 'Ouvrir Studio / Suivi'}
                    </button>
                    <button
                      onClick={() => exportProgramPrintPDF(p)}
                      className="px-3 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-black uppercase"
                      title="Exporter en PDF propre"
                    >
                      PDF
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {filteredPrograms.length === 0 && (
            <div className="bg-white border border-dashed border-gray-300 rounded-2xl py-10 text-center text-sm text-gray-500">
              Aucun programme ne correspond à ces filtres.
            </div>
          )}
        </div>
      )}

      {/* --- INSTALLATIONS --- */}
      {activeTab === 'infras' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Installations suivies', value: infras.length, icon: 'sports', tone: 'text-military-900 bg-military-50' },
              { label: 'En service', value: infras.filter((infra) => !infra.status || infra.status === 'Operational').length, icon: 'check_circle', tone: 'text-emerald-700 bg-emerald-50' },
              { label: 'Maintenance / fermées', value: infras.filter((infra) => infra.status === 'Maintenance' || infra.status === 'Closed').length, icon: 'build', tone: 'text-amber-700 bg-amber-50' },
              { label: 'Contrôles à traiter', value: new Set(alerts.filter((alert) => alert.type === 'compliance_infra').map((alert) => alert.target?.id)).size, icon: 'event_busy', tone: 'text-red-700 bg-red-50' }
            ].map((item) => (
              <div key={item.label} className="bg-white border border-military-100 rounded-2xl p-4 flex items-center gap-3">
                <span className={`material-icons rounded-xl p-2 ${item.tone}`}>{item.icon}</span>
                <div>
                  <div className="text-xl font-black text-military-900">{item.value}</div>
                  <div className="text-[9px] font-black uppercase tracking-wide text-gray-500">{item.label}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap justify-between items-center gap-2">
            <h3 className="text-lg font-black text-military-900 uppercase">Installations Sportives</h3>
            <div className="flex items-center gap-2">
              <div className="flex gap-1 bg-white border border-gray-200 p-1 rounded-xl">
                {[
                  { id: 'visual', label: 'Urgence Visuel' },
                  { id: 'regulatory', label: 'Urgence Régl.' },
                  { id: 'name', label: 'Nom' }
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setInfraSort(s.id as any)}
                    className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-lg ${
                      infraSort === s.id ? 'bg-military-900 text-white' : 'text-gray-500'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() =>
                  setEditingInfra({
                    id: `infra_${Date.now()}`,
                    name: '',
                    type: InfrastructureType.GYM_MIXED,
                    serviceId: user.serviceId || 'ear927',
                    status: 'Operational'
                  })
                }
                className="bg-military-900 text-white px-4 py-2 rounded-xl text-xs font-black uppercase"
              >
                + Ajouter
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <label className="relative flex-1">
              <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
              <input
                type="search"
                value={infraSearch}
                onChange={(event) => setInfraSearch(event.target.value)}
                placeholder="Rechercher une installation ou un type..."
                className="w-full pl-10 pr-3 py-2.5 bg-white border border-military-200 rounded-xl text-sm font-medium"
              />
            </label>
            <select
              aria-label="Filtrer les installations par disponibilité"
              value={infraStatusFilter}
              onChange={(event) => setInfraStatusFilter(event.target.value as typeof infraStatusFilter)}
              className="bg-white border border-military-200 text-sm font-bold rounded-xl px-3 py-2.5"
            >
              <option value="all">Toutes disponibilités</option>
              <option value="Operational">En service</option>
              <option value="Maintenance">En maintenance</option>
              <option value="Closed">Fermées</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredInfras.map((infra) => {
              const rule = getRegulatoryRuleForInfra(infra.type);
              const vDays = getDaysRemaining(infra.lastVisualInspection, infra.visualIntervalDays || rule.visualIntervalDays);
              const rDays = getDaysRemaining(infra.lastRegulatoryInspection, infra.regulatoryIntervalDays || rule.regulatoryIntervalDays);
              const status = infra.status || 'Operational';
              return (
                <div
                  key={infra.id}
                  onClick={() => {
                    setRegInfo(null);
                    setEditingInfra(infra);
                  }}
                  className="bg-white p-5 rounded-2xl border border-military-100 shadow-sm cursor-pointer hover:border-action-500 transition-all"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-black text-base text-military-900">{infra.name}</h4>
                      <div className="flex gap-1.5 mt-1 flex-wrap">
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold uppercase">{infra.type}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase ${
                          status === 'Operational' ? 'bg-emerald-50 text-emerald-700' : status === 'Maintenance' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {status === 'Operational' ? 'En service' : status === 'Maintenance' ? 'Maintenance' : 'Fermée'}
                        </span>
                        <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-black uppercase">
                          {infra.normReference || rule.normCode}
                        </span>
                        <span className="text-[10px] bg-military-50 text-military-800 px-2 py-0.5 rounded font-black uppercase">
                          Live : {activeSessions.filter((s) => s.infrastructureId === infra.id || s.infrastructureName === infra.name).length}/{infra.capacity || 15}
                        </span>
                      </div>
                    </div>
                    <span className="material-icons text-gray-400 text-lg">edit</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 bg-gray-50 rounded-xl">
                      <span className="text-[9px] text-gray-400 font-black uppercase block mb-1">{rule.visualLabel}</span>
                      <ComplianceBadge days={vDays} />
                      <span className="block text-[10px] text-gray-500 mt-1">{formatDateFr(infra.lastVisualInspection)}</span>
                    </div>
                    <div className="p-2.5 bg-gray-50 rounded-xl">
                      <span className="text-[9px] text-gray-400 font-black uppercase block mb-1">{rule.regulatoryLabel}</span>
                      <ComplianceBadge days={rDays} />
                      <span className="block text-[10px] text-gray-500 mt-1">{formatDateFr(infra.lastRegulatoryInspection)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredInfras.length === 0 && (
              <div className="md:col-span-2 bg-white border border-dashed border-gray-300 rounded-2xl py-10 text-center text-sm text-gray-500">
                Aucune installation ne correspond à ces filtres.
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- MATÉRIEL --- */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Équipements suivis', value: equipment.length, icon: 'fitness_center', tone: 'text-military-900 bg-military-50' },
              { label: 'Disponibles', value: equipment.filter((item) => item.status === 'Operational').length, icon: 'check_circle', tone: 'text-emerald-700 bg-emerald-50' },
              { label: 'À réparer / contrôler', value: equipment.filter((item) => item.status !== 'Operational').length, icon: 'build', tone: 'text-amber-700 bg-amber-50' },
              { label: 'Contrôles à traiter', value: new Set(alerts.filter((alert) => alert.type === 'compliance_equip').map((alert) => alert.target?.id)).size, icon: 'event_busy', tone: 'text-red-700 bg-red-50' }
            ].map((item) => (
              <div key={item.label} className="bg-white border border-military-100 rounded-2xl p-4 flex items-center gap-3">
                <span className={`material-icons rounded-xl p-2 ${item.tone}`}>{item.icon}</span>
                <div>
                  <div className="text-xl font-black text-military-900">{item.value}</div>
                  <div className="text-[9px] font-black uppercase tracking-wide text-gray-500">{item.label}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap justify-between items-center gap-2">
            <h3 className="text-lg font-black text-military-900 uppercase">Inventaire Matériel</h3>
            <button
              onClick={() =>
                setEditingEquip({
                  id: `eq_${Date.now()}`,
                  name: '',
                  category: 'Musculation',
                  status: 'Operational',
                  infrastructureId: infras[0]?.id || '',
                  serviceId: user.serviceId || 'ear927'
                })
              }
              className="bg-action-500 text-military-950 px-4 py-2 rounded-xl text-xs font-black uppercase shadow"
            >
              + Ajouter Matériel
            </button>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap gap-2">
            <label className="relative flex-1 min-w-[220px]">
              <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
              <input
                type="search"
                value={equipSearch}
                onChange={(event) => setEquipSearch(event.target.value)}
                placeholder="Rechercher un équipement..."
                className="w-full pl-10 pr-3 py-2.5 bg-white border border-military-200 rounded-xl text-sm font-medium"
              />
            </label>
            <select
              className="bg-white border border-gray-200 text-xs font-bold rounded-xl px-3 py-2.5"
              value={equipFilterCategory}
              onChange={(e) => setEquipFilterCategory(e.target.value)}
            >
              <option value="all">Toutes Catégories</option>
              <option value="Musculation">Musculation (ISO 20957)</option>
              <option value="Cardio">Cardio (ISO 20957)</option>
              <option value="Buts sportifs">Buts sportifs (NF S52-409)</option>
              <option value="Escalade (SAE)">Escalade SAE (NF EN 12572)</option>
              <option value="Petit matériel">Petit matériel</option>
            </select>
            <select
              className="bg-white border border-gray-200 text-xs font-bold rounded-xl px-3 py-2.5"
              value={equipFilterInfra}
              onChange={(e) => setEquipFilterInfra(e.target.value)}
            >
              <option value="all">Toutes Installations</option>
              {infras.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
            <select
              aria-label="Filtrer le matériel par état"
              className="bg-white border border-gray-200 text-xs font-bold rounded-xl px-3 py-2.5"
              value={equipFilterStatus}
              onChange={(event) => setEquipFilterStatus(event.target.value as typeof equipFilterStatus)}
            >
              <option value="all">Tous les états</option>
              <option value="Operational">Disponible</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Damaged">Hors service</option>
            </select>
          </div>

          <div className="bg-white rounded-2xl border border-military-100 divide-y divide-gray-100 overflow-hidden">
            {filteredEquipment.map((eq) => {
              const rule = getRegulatoryRuleForEquipment(eq.category);
              const vDays = getDaysRemaining(eq.lastVisualInspection, eq.visualIntervalDays || rule.visualIntervalDays);
              const rDays = getDaysRemaining(eq.lastRegulatoryInspection, eq.regulatoryIntervalDays || rule.regulatoryIntervalDays);
              return (
                <div
                  key={eq.id}
                  onClick={() => {
                    setRegInfo(null);
                    setEditingEquip(eq);
                  }}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-gray-50"
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-sm text-military-900">{eq.name}</span>
                      <span className="text-[9px] font-black uppercase bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{eq.category}</span>
                      <span className="text-[9px] font-black uppercase bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                        {eq.normReference || rule.normCode}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {infras.find((i) => i.id === eq.infrastructureId)?.name || 'Non affecté'}
                      {eq.notes ? ` • ${eq.notes}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <ComplianceBadge days={vDays} />
                    <ComplianceBadge days={rDays} />
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                        eq.status === 'Operational'
                          ? 'bg-emerald-100 text-emerald-700'
                          : eq.status === 'Maintenance'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {eq.status === 'Operational' ? 'OK' : eq.status === 'Maintenance' ? 'Maintenance' : 'HS'}
                    </span>
                  </div>
                </div>
              );
            })}
            {filteredEquipment.length === 0 && (
              <div className="py-10 text-center text-sm text-gray-500">
                Aucun équipement ne correspond à ces filtres.
              </div>
            )}
          </div>

          {/* GMAO Pro : Ordres de Travail & Tickets Maintenance Actifs */}
          <div className="bg-white rounded-3xl p-5 border border-military-100 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-black text-military-900 uppercase flex items-center gap-2">
                <span className="material-icons text-amber-600 text-base">engineering</span>
                GMAO — Ordres de Travail & Tickets Maintenance ({maintenanceTickets.filter((t) => t.status !== 'RESOLU').length} ouvert(s))
              </h4>
            </div>
            {maintenanceTickets.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Aucun ticket de maintenance enregistré.</p>
            ) : (
              <div className="space-y-2">
                {maintenanceTickets.slice(0, 8).map((t) => (
                  <div key={t.id} className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                          t.priority === 'CRITIQUE' ? 'bg-red-600 text-white' : t.priority === 'HAUTE' ? 'bg-amber-500 text-white' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {t.priority}
                        </span>
                        <span className="font-black text-xs text-military-900">{t.targetName}</span>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                          t.status === 'RESOLU' ? 'bg-emerald-100 text-emerald-800' : t.status === 'EN_COURS' ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {t.status}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-gray-700 mt-1">{t.title}</div>
                      <div className="text-[11px] text-gray-500">{t.description}</div>
                    </div>
                    {t.status !== 'RESOLU' && (
                      <div className="flex gap-1.5 shrink-0">
                        {t.status === 'OUVERT' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateTicketStatus(t, 'EN_COURS')}
                            className="px-2.5 py-1.5 rounded-lg bg-purple-100 text-purple-800 text-[10px] font-black uppercase hover:bg-purple-200"
                          >
                            Prendre en charge
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleUpdateTicketStatus(t, 'RESOLU')}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-black uppercase hover:bg-emerald-700"
                        >
                          Clôturer & Remettre OK
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- REGISTRE DE SÉCURITÉ NUMÉRIQUE (Art. R.322-25 Code du Sport) --- */}
      {activeTab === 'registry' && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-military-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-black text-military-900 uppercase">
                Registre de Sécurité Numérique (Art. R.322-25)
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Historique interne horodaté des vérifications et observations — {getBaseName(user.serviceId)}.
                Cet outil de suivi ne remplace pas les registres et contrôles réglementaires exigés.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  exportSecurityRegistryCSV(getBaseName(user.serviceId), infras, equipment, inspections);
                  db.logAudit({
                    actorNid: user.nid,
                    actorName: user.name,
                    actorRole: user.role,
                    serviceId: user.serviceId,
                    action: 'EXPORT_SECURITY_REGISTRY',
                    details: `Export CSV du Registre de Sécurité (${getBaseName(user.serviceId)}).`
                  });
                  showToast('Registre de Sécurité exporté en CSV !', 'success');
                }}
                className="px-4 py-2.5 bg-military-900 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1.5 shadow"
              >
                <span className="material-icons text-sm">download</span> Exporter CSV
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2.5 bg-action-500 text-military-950 rounded-xl text-xs font-black uppercase flex items-center gap-1.5"
              >
                <span className="material-icons text-sm">print</span> Imprimer / PDF
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-military-100 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-military-50 border-b border-gray-200 font-black uppercase text-military-700">
                  <th className="p-3.5">Horodatage</th>
                  <th className="p-3.5">Installation / Équipement</th>
                  <th className="p-3.5">Contrôle</th>
                  <th className="p-3.5">Norme</th>
                  <th className="p-3.5">Contrôleur</th>
                  <th className="p-3.5">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {inspections.map((log) => (
                  <tr key={log.id}>
                    <td className="p-3.5 font-mono text-gray-600">{formatDateTimeFr(log.timestamp)}</td>
                    <td className="p-3.5 font-bold text-military-900">
                      {log.targetName}
                      {log.notes && <div className="text-[11px] font-normal text-gray-500">{log.notes}</div>}
                    </td>
                    <td className="p-3.5 font-bold uppercase">{log.inspectionType}</td>
                    <td className="p-3.5 font-semibold text-blue-700">{log.normReference || '-'}</td>
                    <td className="p-3.5">{log.inspectorName} ({log.inspectorNid})</td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded font-black uppercase text-[10px] ${
                          log.status === 'CONFORME'
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.status === 'RESERVE'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {inspections.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400 italic">
                      Aucun contrôle enregistré pour cette base.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- PLANNING APMS --- */}
      {activeTab === 'agenda' && <CalendarView user={user} canEdit />}

      {/* --- GOUVERNANCE MOTEUR IA (LOCAL AUTONOME <-> MISTRAL AMIAD) & AUDIT CNIL --- */}
      {activeTab === 'governance' && (
        <div className="space-y-6 animate-[fadeIn_0.25s]">
          {/* Sélecteur de moteur IA */}
          <div className="bg-white rounded-3xl p-6 border border-military-100 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-black text-military-900 uppercase flex items-center gap-2">
                <span className="material-icons text-action-600">psychology</span>
                Moteur de recommandation — local ↔ Mistral
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Le moteur local fonctionne sans appel API. Le fournisseur Mistral est externe lorsqu’il est activé : son usage doit respecter le consentement, les règles de protection des données et la configuration de l’organisation. Cette version de démonstration n’est pas une certification de conformité.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {aiProviders.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleSelectAIProvider(p.id)}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                    p.active
                      ? 'border-action-500 bg-action-50/40 shadow-md'
                      : 'border-gray-200 bg-gray-50/40 hover:border-military-400'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-military-900 text-action-400">
                        {p.id === 'algorithmic' ? 'LOCAL' : 'MISTRAL'}
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                          p.configured ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {p.configured ? 'Opérationnel' : 'En attente livraison finale'}
                      </span>
                    </div>
                    <h4 className="font-black text-sm text-military-900">{p.label}</h4>
                    <p className="text-[11px] text-gray-600 mt-1.5 leading-relaxed">{p.sovereigntyNote}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-200/70 flex justify-between items-center text-[11px] font-black uppercase">
                    <span className={p.active ? 'text-action-700' : 'text-gray-400'}>
                      {p.active ? '● Moteur Actif' : 'Cliquer pour sélectionner'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Journal d'Audit Sécurité & Accès CNIL (sm_audit_logs) */}
          <div className="bg-white rounded-3xl border border-military-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-base font-black text-military-900 uppercase flex items-center gap-2">
                  <span className="material-icons text-emerald-700 text-base">policy</span>
                  Journal d'Audit Sécurité & Accès (Recommandation CNIL)
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Traçabilité immuable (append-only, rétention 12 mois) : connexions, consultations de fiches individuelles, exports et bascules IA.
                </p>
              </div>
              <span className="text-xs font-black bg-military-100 text-military-800 px-3 py-1 rounded-full">
                {auditLogs.length} événement(s)
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-military-50 border-b border-gray-200 font-black uppercase text-military-700">
                    <th className="p-3.5">Horodatage</th>
                    <th className="p-3.5">Acteur (ID)</th>
                    <th className="p-3.5">Action</th>
                    <th className="p-3.5">Détails</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="p-3.5 font-mono text-gray-600">{formatDateTimeFr(log.timestamp)}</td>
                      <td className="p-3.5 font-bold text-military-900">
                        {log.actorName} <span className="text-gray-400 font-mono">({log.actorNid})</span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded font-black uppercase text-[10px] ${
                            log.action.includes('FAILED') || log.action.includes('LOCKED') || log.action === 'DELETE_ACCOUNT'
                              ? 'bg-red-100 text-red-800'
                              : log.action.includes('EXPORT') || log.action === 'VIEW_USER_PROFILE'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3.5 text-gray-600">{log.details}</td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-400 italic">
                        Aucun événement d'audit enregistré.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {inspectionDraft && (
        <div className="fixed inset-0 bg-black/75 z-[80] flex items-center justify-center p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="inspection-title"
            className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4"
          >
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-action-700">
                {inspectionDraft.inspectionType === 'VISUAL' ? 'Contrôle visuel' : 'Contrôle réglementaire'}
              </p>
              <h3 id="inspection-title" className="text-lg font-black text-military-900 mt-1">
                {inspectionDraft.target.name}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Le résultat, l’agent et l’horodatage seront ajoutés au registre de sécurité.
              </p>
            </div>
            <label className="block">
              <span className="text-[10px] font-black uppercase text-gray-500">Résultat du contrôle</span>
              <select
                autoFocus
                value={inspectionDraft.status}
                onChange={(event) =>
                  setInspectionDraft({
                    ...inspectionDraft,
                    status: event.target.value as InspectionLog['status']
                  })
                }
                className="mt-1 w-full p-3 border border-gray-200 rounded-xl bg-white text-sm font-bold"
              >
                <option value="CONFORME">Conforme</option>
                <option value="RESERVE">Conforme avec réserves</option>
                <option value="NON_CONFORME">Non conforme</option>
              </select>
            </label>
            {/* Check-list AFNOR guidée (GMAO Pro) */}
            <div className="bg-military-50 p-3.5 rounded-2xl border border-military-200 space-y-2">
              <div className="text-[10px] font-black uppercase text-military-700">
                Check-list points de contrôle AFNOR (cliquer pour ajouter aux observations)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Ancrages & stabilité OK',
                  'Câbles / poulies / serrages conformes',
                  'Revêtement sol sain',
                  'Affichage règlement & secours (112) visible',
                  'Trousse secours / DAE vérifiés'
                ].map((item) => {
                  const included = inspectionDraft.notes.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() =>
                        setInspectionDraft({
                          ...inspectionDraft,
                          notes: included
                            ? inspectionDraft.notes
                            : `${inspectionDraft.notes ? `${inspectionDraft.notes} • ` : ''}${item}`
                        })
                      }
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                        included
                          ? 'bg-emerald-600 text-white border-emerald-700'
                          : 'bg-white text-military-800 border-military-200 hover:border-action-500'
                      }`}
                    >
                      {included ? '✓ ' : '+ '}
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="block">
              <span className="text-[10px] font-black uppercase text-gray-500">
                Observations {inspectionDraft.status !== 'CONFORME' ? '(obligatoires)' : '(facultatives)'}
              </span>
              <textarea
                value={inspectionDraft.notes}
                onChange={(event) => setInspectionDraft({ ...inspectionDraft, notes: event.target.value })}
                rows={4}
                maxLength={1000}
                required={inspectionDraft.status !== 'CONFORME'}
                placeholder="Décrire les points vérifiés, défauts constatés ou mesures prises..."
                className="mt-1 w-full p-3 border border-gray-200 rounded-xl text-sm resize-y"
              />
              <span className="block text-right text-[10px] text-gray-400 mt-1">
                {inspectionDraft.notes.length}/1000
              </span>
            </label>
            {inspectionDraft.status !== 'CONFORME' && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                {inspectionDraft.status === 'NON_CONFORME'
                  ? 'L’installation sera fermée ou le matériel retiré du service.'
                  : 'L’installation ou le matériel sera placé en maintenance.'}
              </div>
            )}
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => setInspectionDraft(null)}
                className="flex-1 py-3 text-xs font-bold uppercase text-gray-500"
              >
                Annuler
              </button>
              <button
                disabled={inspectionDraft.status !== 'CONFORME' && !inspectionDraft.notes.trim()}
                onClick={() => {
                  logQuickInspection(
                    inspectionDraft.target,
                    inspectionDraft.targetType,
                    inspectionDraft.inspectionType,
                    inspectionDraft.status,
                    inspectionDraft.notes
                  );
                  setInspectionDraft(null);
                }}
                className="flex-[2] py-3 bg-military-900 text-white font-black uppercase text-xs rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Enregistrer au registre
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL INFRASTRUCTURE */}
      {editingInfra && (
        <div className="fixed inset-0 bg-black/75 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar space-y-4 animate-[zoomIn_0.2s]">
            <h3 className="text-lg font-black text-military-900 uppercase">Installation & Conformité</h3>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase">Nom</label>
              <input
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm"
                value={editingInfra.name}
                onChange={(e) => setEditingInfra({ ...editingInfra, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase">Type</label>
                <select
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs"
                  value={editingInfra.type}
                  onChange={(e) => {
                    const newType = e.target.value as InfrastructureType;
                    const rule = getRegulatoryRuleForInfra(newType);
                    setEditingInfra({
                      ...editingInfra,
                      type: newType,
                      normReference: rule.normCode,
                      visualIntervalDays: rule.visualIntervalDays,
                      regulatoryIntervalDays: rule.regulatoryIntervalDays
                    });
                  }}
                >
                  {Object.values(InfrastructureType).map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase">Disponibilité</label>
                <select
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs"
                  value={editingInfra.status || 'Operational'}
                  onChange={(e) => setEditingInfra({ ...editingInfra, status: e.target.value as any })}
                >
                  <option value="Operational">Ouverte</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Closed">Fermée</option>
                </select>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 space-y-3">
              <div className="text-xs font-black text-blue-900 uppercase">
                Contrôles ({editingInfra.normReference || getRegulatoryRuleForInfra(editingInfra.type).normCode})
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-bold text-blue-700 uppercase">Dernier contrôle Visuel</label>
                  <button
                    type="button"
                    onClick={() => openInspectionForm(editingInfra, 'INFRA', 'VISUAL')}
                    className="text-[10px] font-black bg-emerald-700 text-white px-2.5 py-1 rounded-lg hover:bg-emerald-800"
                  >
                    Enregistrer un contrôle
                  </button>
                </div>
                <input
                  type="date"
                  className="w-full p-2 bg-white rounded-lg font-bold text-xs border border-blue-200"
                  value={editingInfra.lastVisualInspection || ''}
                  readOnly
                  aria-label="Date du dernier contrôle visuel"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-bold text-blue-700 uppercase">Dernier contrôle Réglementaire</label>
                  <button
                    type="button"
                    onClick={() => openInspectionForm(editingInfra, 'INFRA', 'REGULATORY')}
                    className="text-[10px] font-black bg-blue-700 text-white px-2.5 py-1 rounded-lg hover:bg-blue-800"
                  >
                    Enregistrer un contrôle
                  </button>
                </div>
                <input
                  type="date"
                  className="w-full p-2 bg-white rounded-lg font-bold text-xs border border-blue-200"
                  value={editingInfra.lastRegulatoryInspection || ''}
                  readOnly
                  aria-label="Date du dernier contrôle réglementaire"
                />
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={() => handleGetRegInfo(editingInfra.name || editingInfra.type, editingInfra.type)}
                className="text-xs font-black text-action-700 uppercase flex items-center gap-1 hover:underline"
              >
                <span className="material-icons text-sm">psychology</span> Consulter la réglementation applicable
              </button>
              {loadingReg && <div className="text-xs text-gray-400 mt-1">Analyse réglementaire...</div>}
              {regInfo && <div className="mt-2 p-3 bg-action-50 text-xs text-military-800 rounded-xl whitespace-pre-line">{regInfo}</div>}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setTicketDraft({
                    targetType: 'INFRASTRUCTURE',
                    targetId: editingInfra.id,
                    targetName: editingInfra.name || 'Installation',
                    priority: 'HAUTE',
                    title: '',
                    description: '',
                    setAssetMaintenance: true
                  })
                }
                className="flex-1 py-2.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1"
              >
                <span className="material-icons text-sm">build</span> Ouvrir Ticket GMAO
              </button>
              <button
                type="button"
                onClick={() =>
                  setQrAssetModal({
                    name: editingInfra.name || 'Installation sportive',
                    subtitle: `${editingInfra.type} • ${getBaseName(user.serviceId)}`,
                    norm: editingInfra.normReference || getRegulatoryRuleForInfra(editingInfra.type).normCode,
                    lastVisual: editingInfra.lastVisualInspection,
                    lastReg: editingInfra.lastRegulatoryInspection,
                    status: editingInfra.status || 'Operational'
                  })
                }
                className="flex-1 py-2.5 px-3 bg-military-50 hover:bg-military-100 text-military-900 border border-military-200 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1"
              >
                <span className="material-icons text-sm">qr_code_2</span> Fiche QR Salle
              </button>
            </div>

            <div className="flex gap-2 pt-3 border-t border-gray-100">
              {infras.some((i) => i.id === editingInfra.id) && (
                <button onClick={() => deleteInfra(editingInfra.id)} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100">
                  <span className="material-icons text-base">delete</span>
                </button>
              )}
              <button onClick={() => setEditingInfra(null)} className="flex-1 py-3 text-xs font-bold uppercase text-gray-500">
                Annuler
              </button>
              <button onClick={() => saveInfra(editingInfra)} className="flex-[2] py-3 bg-military-900 text-white font-black uppercase text-xs rounded-xl">
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MATÉRIEL */}
      {editingEquip && (
        <div className="fixed inset-0 bg-black/75 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar space-y-4 animate-[zoomIn_0.2s]">
            <h3 className="text-lg font-black text-military-900 uppercase">Équipement & Vérifications</h3>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase">Nom</label>
              <input
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm"
                value={editingEquip.name}
                onChange={(e) => setEditingEquip({ ...editingEquip, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase">Catégorie</label>
                <select
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs"
                  value={editingEquip.category}
                  onChange={(e) => {
                    const cat = e.target.value as Equipment['category'];
                    const rule = getRegulatoryRuleForEquipment(cat);
                    setEditingEquip({
                      ...editingEquip,
                      category: cat,
                      normReference: rule.normCode,
                      visualIntervalDays: rule.visualIntervalDays,
                      regulatoryIntervalDays: rule.regulatoryIntervalDays
                    });
                  }}
                >
                  <option value="Musculation">Musculation</option>
                  <option value="Cardio">Cardio</option>
                  <option value="Buts sportifs">Buts sportifs</option>
                  <option value="Escalade (SAE)">Escalade (SAE)</option>
                  <option value="Petit matériel">Petit matériel</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase">État</label>
                <select
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs"
                  value={editingEquip.status}
                  onChange={(e) => setEditingEquip({ ...editingEquip, status: e.target.value as any })}
                >
                  <option value="Operational">Opérationnel</option>
                  <option value="Maintenance">En maintenance</option>
                  <option value="Damaged">Hors Service (HS)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase">Installation rattachée</label>
              <select
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs"
                value={editingEquip.infrastructureId}
                onChange={(e) => setEditingEquip({ ...editingEquip, infrastructureId: e.target.value })}
              >
                {infras.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase">Observations / Anomalie</label>
              <input
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium"
                value={editingEquip.notes || ''}
                onChange={(e) => setEditingEquip({ ...editingEquip, notes: e.target.value })}
                placeholder="Ex: Câble vérifié, RAS..."
              />
            </div>

            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 space-y-3">
              <div className="text-xs font-black text-blue-900 uppercase">
                Norme {editingEquip.normReference || getRegulatoryRuleForEquipment(editingEquip.category).normCode}
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-bold text-blue-700 uppercase">Contrôle Visuel</label>
                  <button
                    type="button"
                    onClick={() => openInspectionForm(editingEquip, 'EQUIP', 'VISUAL')}
                    className="text-[10px] font-black bg-emerald-700 text-white px-2.5 py-1 rounded-lg"
                  >
                    Enregistrer un contrôle
                  </button>
                </div>
                <input
                  type="date"
                  className="w-full p-2 bg-white rounded-lg font-bold text-xs border border-blue-200"
                  value={editingEquip.lastVisualInspection || ''}
                  readOnly
                  aria-label="Date du dernier contrôle visuel"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-bold text-blue-700 uppercase">Contrôle Réglementaire / Opérationnel</label>
                  <button
                    type="button"
                    onClick={() => openInspectionForm(editingEquip, 'EQUIP', 'REGULATORY')}
                    className="text-[10px] font-black bg-blue-700 text-white px-2.5 py-1 rounded-lg"
                  >
                    Enregistrer un contrôle
                  </button>
                </div>
                <input
                  type="date"
                  className="w-full p-2 bg-white rounded-lg font-bold text-xs border border-blue-200"
                  value={editingEquip.lastRegulatoryInspection || ''}
                  readOnly
                  aria-label="Date du dernier contrôle réglementaire"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setTicketDraft({
                    targetType: 'EQUIPMENT',
                    targetId: editingEquip.id,
                    targetName: editingEquip.name || 'Équipement',
                    priority: 'HAUTE',
                    title: '',
                    description: '',
                    setAssetMaintenance: true
                  })
                }
                className="flex-1 py-2.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1"
              >
                <span className="material-icons text-sm">build</span> Signaler Panne
              </button>
              <button
                type="button"
                onClick={() =>
                  setQrAssetModal({
                    name: editingEquip.name || 'Équipement sportif',
                    subtitle: `${editingEquip.category} • ${infras.find((i) => i.id === editingEquip.infrastructureId)?.name || 'Base'}`,
                    norm: editingEquip.normReference || getRegulatoryRuleForEquipment(editingEquip.category).normCode,
                    lastVisual: editingEquip.lastVisualInspection,
                    lastReg: editingEquip.lastRegulatoryInspection,
                    status: editingEquip.status
                  })
                }
                className="flex-1 py-2.5 px-3 bg-military-50 hover:bg-military-100 text-military-900 border border-military-200 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1"
              >
                <span className="material-icons text-sm">qr_code_2</span> Étiquette QR
              </button>
            </div>

            <div className="flex gap-2 pt-3 border-t border-gray-100">
              {equipment.some((e) => e.id === editingEquip.id) && (
                <button onClick={() => deleteEquip(editingEquip.id)} className="p-3 bg-red-50 text-red-600 rounded-xl">
                  <span className="material-icons text-base">delete</span>
                </button>
              )}
              <button onClick={() => setEditingEquip(null)} className="flex-1 py-3 text-xs font-bold uppercase text-gray-500">
                Annuler
              </button>
              <button onClick={() => saveEquip(editingEquip)} className="flex-[2] py-3 bg-action-500 text-military-950 font-black uppercase text-xs rounded-xl">
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DÉTAIL SÉANCE LIVE (Section 4.9.5) */}
      {selectedLiveSession && (
        <div className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4" onClick={() => setSelectedLiveSession(null)}>
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-[zoomIn_0.2s]" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded">
                  En cours • {selectedLiveSession.sessionType}
                </span>
                <h3 className="text-xl font-black text-military-900 mt-1">{selectedLiveSession.userName}</h3>
                <p className="text-xs text-gray-500">
                  {selectedLiveSession.infrastructureName} • Début : {formatDateTimeFr(selectedLiveSession.startTime)}
                </p>
              </div>
              <button onClick={() => setSelectedLiveSession(null)}><span className="material-icons">close</span></button>
            </div>

            <div className="p-4 bg-military-50 rounded-2xl border border-military-100">
              <div className="font-black text-sm text-military-900 mb-2">{selectedLiveSession.details}</div>
              {selectedLiveSession.sessionPayload?.content?.mainBlock ? (
                <ul className="space-y-1.5 text-xs text-military-700">
                  {selectedLiveSession.sessionPayload.content.mainBlock.map((b, i) => (
                    <li key={i} className="flex justify-between gap-2 bg-white p-2 rounded-lg">
                      <span className="font-bold">{b.exercise}</span>
                      <span className="text-gray-500">{b.prescription}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-500 italic">Séance autonome libre.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL FICHE MILITAIRE */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/75 z-[70] flex items-center justify-center p-4" onClick={() => setSelectedUser(null)}>
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar space-y-5 animate-[zoomIn_0.2s]" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-black text-military-900 uppercase">{selectedUser.name}</h3>
                <p className="text-xs font-mono text-gray-500">
                  ID {selectedUser.nid} • {selectedUser.unit || 'Équipe non renseignée'} • {selectedUser.jobType}
                </p>
              </div>
              <button onClick={() => setSelectedUser(null)}><span className="material-icons">close</span></button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-blue-50 p-3 rounded-xl text-center">
                <span className="text-[10px] font-black text-blue-600 uppercase block">VMA</span>
                <span className="font-black text-lg text-blue-900">{calculateVMA(selectedUser.tests)} km/h</span>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl text-center">
                <span className="text-[10px] font-black text-gray-500 uppercase block">Pompes</span>
                <span className="font-black text-lg">{selectedUser.tests.pushups ?? '-'}</span>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl text-center">
                <span className="text-[10px] font-black text-gray-500 uppercase block">1RM DC / Squat</span>
                <span className="font-black text-sm">
                  {selectedUser.tests.benchPress1RM || '-'} / {selectedUser.tests.squat1RM || '-'} kg
                </span>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl text-center">
                <span className="text-[10px] font-black text-gray-500 uppercase block">Séances</span>
                <span className="font-black text-lg">{selectedUser.sessionLogs?.length || 0}</span>
              </div>
            </div>

            {selectedUser.dailyForms.length > 0 && (() => {
              const lastForm = selectedUser.dailyForms[selectedUser.dailyForms.length - 1];
              const analysis = analyzeDailyFormStructured(lastForm);
              const readiness = calculateReadinessScore(lastForm);
              const acwr = calculateACWR(selectedUser.sessionLogs);
              return (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl bg-military-900 text-white">
                      <span className="text-[9px] font-black uppercase text-action-400">Readiness Athlète</span>
                      <div className="text-2xl font-black mt-0.5">{readiness.score}/100</div>
                      <div className="text-[10px] text-military-200">{readiness.label.replace('_', ' ')}</div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-military-50 border border-military-200">
                      <span className="text-[9px] font-black uppercase text-gray-500">Charge ACWR (7j/28j)</span>
                      <div className="text-2xl font-black text-military-900 mt-0.5">{acwr.ratio > 0 ? acwr.ratio.toFixed(2) : '—'}</div>
                      <span className={`inline-block mt-0.5 text-[9px] font-black uppercase px-2 py-0.5 rounded ${acwr.badgeClass}`}>
                        {acwr.label}
                      </span>
                    </div>
                  </div>
                  <div className={`p-4 rounded-2xl border ${analysis.zone === 'GREEN' ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                    <div className="flex justify-between text-xs font-black uppercase mb-2">
                      <span>Dernier bilan ({formatDateFr(lastForm.date)})</span>
                      <span>Zone {analysis.zone}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold">
                      <div>Sommeil {lastForm.sleepQuality}/10</div>
                      <div>Fatigue {lastForm.fatigueLevel}/10</div>
                      <div>Stress {lastForm.stressLevel}/10</div>
                      <div>Douleur {lastForm.painLevel}/10</div>
                    </div>
                    <p className="text-xs mt-2">{analysis.summary}</p>
                  </div>
                </div>
              );
            })()}

            {/* Table express Préparateur Physique : Allures VMA & Charges % 1RM de l'athlète */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-2 text-[11px]">
              <div className="font-black uppercase text-military-800 text-[10px]">
                Repères Préparateur Physique — Allures Piste & Charges Clés
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {buildVmaZonesTable(calculateVMA(selectedUser.tests))
                  .filter((z) => [65, 85, 95, 100].includes(z.pct))
                  .map((z) => (
                    <div key={z.pct} className="bg-white px-2.5 py-1.5 rounded-lg border border-gray-200 flex justify-between">
                      <span className="font-black text-blue-800">{z.pct}% VMA</span>
                      <span className="font-mono">{z.pacePerKm} (400m: {z.split400m})</span>
                    </div>
                  ))}
              </div>
              {buildStrengthZonesTable(selectedUser.tests.squat1RM || 85).slice(2, 5).length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {buildStrengthZonesTable(selectedUser.tests.squat1RM || 85)
                    .filter((r) => [70, 80, 90].includes(r.pct))
                    .map((r) => (
                      <span key={r.pct} className="bg-white px-2.5 py-1 rounded-lg border border-gray-200 font-mono text-[10px]">
                        <strong>{r.pct}% 1RM</strong> : Squat {r.kg} kg • DC {Math.round(((selectedUser.tests.benchPress1RM || 65) * r.pct) / 100 / 2.5) * 2.5} kg
                      </span>
                    ))}
                </div>
              )}
            </div>

            <button
              onClick={() => {
                const target = selectedUser.nid;
                setSelectedUser(null);
                setSelectedProgram(null);
                setBuilderTargetUserId(target);
                setShowBuilder(true);
              }}
              className="w-full py-3.5 bg-military-900 text-white rounded-xl font-black uppercase text-xs tracking-wider"
            >
              Créer / Affecter un Programme à {selectedUser.name}
            </button>
          </div>
        </div>
      )}

      {/* MODAL TICKET MAINTENANCE GMAO */}
      {ticketDraft && (
        <div className="fixed inset-0 bg-black/75 z-[85] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 animate-[zoomIn_0.2s]">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                  GMAO — Nouvel Ordre de Travail
                </span>
                <h3 className="text-lg font-black text-military-900 mt-1">{ticketDraft.targetName}</h3>
              </div>
              <button type="button" onClick={() => setTicketDraft(null)}><span className="material-icons">close</span></button>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Priorité</label>
              <div className="grid grid-cols-3 gap-2">
                {(['NORMALE', 'HAUTE', 'CRITIQUE'] as const).map((prio) => (
                  <button
                    key={prio}
                    type="button"
                    onClick={() => setTicketDraft({ ...ticketDraft, priority: prio })}
                    className={`py-2 rounded-xl text-[10px] font-black uppercase border ${
                      ticketDraft.priority === prio
                        ? prio === 'CRITIQUE'
                          ? 'bg-red-600 text-white border-red-700'
                          : prio === 'HAUTE'
                          ? 'bg-amber-500 text-white border-amber-600'
                          : 'bg-military-900 text-white border-military-900'
                        : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}
                  >
                    {prio}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Intitulé de la panne *</label>
              <input
                type="text"
                value={ticketDraft.title}
                onChange={(e) => setTicketDraft({ ...ticketDraft, title: e.target.value })}
                placeholder="Ex: Câble poulie haute effiloché"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Diagnostic / Action attendue</label>
              <textarea
                rows={3}
                value={ticketDraft.description}
                onChange={(e) => setTicketDraft({ ...ticketDraft, description: e.target.value })}
                placeholder="Précisez la pièce à commander ou la mesure conservatoire..."
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
              />
            </div>

            <label className="flex items-center gap-2 text-xs font-bold text-military-800 cursor-pointer">
              <input
                type="checkbox"
                checked={ticketDraft.setAssetMaintenance}
                onChange={(e) => setTicketDraft({ ...ticketDraft, setAssetMaintenance: e.target.checked })}
                className="accent-military-900"
              />
              Placer automatiquement en « Maintenance » (ou Hors service si Critique)
            </label>

            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <button type="button" onClick={() => setTicketDraft(null)} className="flex-1 py-3 text-xs font-bold uppercase text-gray-500">
                Annuler
              </button>
              <button type="button" onClick={handleCreateTicket} className="flex-[2] py-3 bg-military-900 text-white rounded-xl text-xs font-black uppercase">
                Créer le ticket GMAO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FICHE SIGNALÉTIQUE QR IMPRIMABLE (SALLE / MACHINE) */}
      {qrAssetModal && (
        <div
          className="fixed inset-0 bg-black/75 z-[85] flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setQrAssetModal(null)}
        >
          <div
            className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-[zoomIn_0.2s]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-military-900 text-white p-5 text-center">
              <span className="text-[9px] font-black uppercase tracking-widest bg-action-500 text-military-950 px-2.5 py-0.5 rounded-full">
                Fiche équipement • {qrAssetModal.norm}
              </span>
              <h3 className="text-lg font-black mt-2">{qrAssetModal.name}</h3>
              <p className="text-xs text-military-300">{qrAssetModal.subtitle}</p>
            </div>
            <div className="p-6 text-center space-y-4">
              <div className="mx-auto w-32 h-32 rounded-2xl border-2 border-military-900 bg-military-50 flex flex-col items-center justify-center p-2">
                <span className="material-icons text-6xl text-military-900">qr_code_2</span>
                <span className="text-[9px] font-mono font-bold text-military-600 mt-1">SMART MONIT GMAO</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200">
                  <span className="text-[9px] font-black uppercase text-gray-400 block">Contrôle Visuel</span>
                  <span className="font-bold text-military-900">{formatDateFr(qrAssetModal.lastVisual)}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200">
                  <span className="text-[9px] font-black uppercase text-gray-400 block">Réglementaire</span>
                  <span className="font-bold text-military-900">{formatDateFr(qrAssetModal.lastReg)}</span>
                </div>
              </div>
              <div className="flex gap-2 no-print">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 py-2.5 bg-action-500 text-military-950 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1"
                >
                  <span className="material-icons text-sm">print</span> Imprimer
                </button>
                <button
                  type="button"
                  onClick={() => setQrAssetModal(null)}
                  className="flex-1 py-2.5 bg-military-900 text-white rounded-xl text-xs font-black uppercase"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ÉDITEUR RÈGLEMENT LOCAL */}
      {showRulesEditor && (
        <div className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl animate-[zoomIn_0.2s]">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black uppercase text-military-900">
                Règlement Intérieur — {getBaseName(user.serviceId)}
              </h3>
              <button onClick={() => setShowRulesEditor(false)}><span className="material-icons">close</span></button>
            </div>
            <p className="text-xs text-gray-500">
              Ce texte est soumis à acceptation obligatoire (case à cocher) à chaque membre de votre structure.
            </p>
            <textarea
              value={localRulesDraft}
              onChange={(e) => setLocalRulesDraft(e.target.value)}
              rows={12}
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium outline-none focus:border-action-500"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowRulesEditor(false)} className="flex-1 py-3 text-xs font-bold uppercase text-gray-500">
                Annuler
              </button>
              <button onClick={handleSaveLocalRules} className="flex-[2] py-3 bg-military-900 text-white rounded-xl text-xs font-black uppercase">
                Publier le règlement
              </button>
            </div>
          </div>
        </div>
      )}
      <FormulaSettingsModal
        isOpen={showFormulaModal}
        onClose={() => setShowFormulaModal(false)}
        user={user}
        onSaved={() => showToast('Paramètres des formules enregistrés.', 'success')}
      />
    </div>
  );
};

export default DashboardMonitor;
