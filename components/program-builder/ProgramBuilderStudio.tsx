import React, { useMemo, useState } from 'react';
import {
  ExerciseLibraryItem,
  JobType,
  PedagogicalAlert,
  Program,
  ProgramCycle,
  ProgramSessionBuilder,
  ProgramStatus,
  ProgramVersionSnapshot,
  ProgramVisibility,
  Session,
  UserProfile,
  UserRole
} from '../../types';
import { db } from '../../services/mockDatabase';
import { getBaseCode } from '../../utils/bases';
import {
  ensureSessionBlocks,
  flattenBuilderSessionToLegacy
} from '../../utils/calculationEngine';
import { SESSION_TEMPLATES, SessionTemplateItem } from '../../data/programTemplates';
import { generateFullProgram } from '../../services/geminiService';
import {
  exportProgramExcelCSV,
  exportProgramJSON,
  exportProgramPrintPDF
} from '../../utils/programExport';
import { useToast } from '../ToastProvider';
import {
  createDefaultTernaryBlocks,
  useProgramEditorState
} from './useProgramEditorState';
import BlockEditor from './BlockEditor';
import ExercisePickerDrawer from './ExercisePickerDrawer';
import AnalyticsHUD from './AnalyticsHUD';
import SoldierPreviewModal from './SoldierPreviewModal';
import MassAssignModal, { MassAssignPayload } from './MassAssignModal';
import ProgramTrackingTable from './ProgramTrackingTable';
import FormulaSettingsModal from './FormulaSettingsModal';
import ImportReviewModal from './ImportReviewModal';

export interface ProgramBuilderStudioProps {
  onClose: () => void;
  existingProgram?: Program;
  defaultTargetUserId?: string;
  user: UserProfile;
}

const CUSTOM_TPL_STORAGE_KEY = 'sm_v4_custom_session_templates';
const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const PROGRAM_TYPES: NonNullable<Program['type']>[] = [
  'Musculation',
  'Course',
  'Hybride',
  'CCPM',
  'HIIT',
  'Fitness',
  'Mobilité',
  'Pilates',
  'Marche chargée',
  'Franchissement',
  'Natation',
  'Sports collectifs',
  'Réathlétisation'
];

const buildInitialStructure = (existing?: Program): ProgramCycle[] => {
  if (existing?.structure && existing.structure.length > 0) {
    return JSON.parse(JSON.stringify(existing.structure));
  }
  const uid = Date.now();
  if (existing?.sessions && existing.sessions.length > 0) {
    const mapped: ProgramSessionBuilder[] = existing.sessions.map((s, idx) => ({
      id: s.id || `s_${uid}_${idx}`,
      title: s.title,
      type: s.workoutType || s.type || 'MUSCU',
      description: s.description,
      locationName: s.locationName,
      dayOfWeek: [1, 3, 5, 2, 4, 6, 7][idx % 7],
      blocks: [
        { id: `b_wu_${uid}_${idx}`, type: 'WARMUP', title: 'Échauffement', rounds: 1, exercises: [] },
        {
          id: `b_main_${uid}_${idx}`,
          type: 'MAIN',
          title: 'Corps de séance',
          rounds: 1,
          exercises: (s.content?.mainBlock || []).map((ex, eIdx) => ({
            id: `ex_${uid}_${idx}_${eIdx}`,
            libraryId: 'legacy',
            name: ex.exercise,
            sets: 3,
            reps: ex.prescription,
            rest: ex.rest || '1:30',
            tempo: ex.tempo,
            durationSeconds: ex.durationSeconds,
            isRecovery: ex.isRecovery
          }))
        },
        { id: `b_cd_${uid}_${idx}`, type: 'COOLDOWN', title: 'Retour au calme', rounds: 1, exercises: [] }
      ],
      exercises: []
    }));
    return [
      {
        id: `c_${uid}`,
        title: `Phase 1 — ${existing.goal || 'PPG'}`,
        objective: existing.goal || 'Préparation Physique Générale',
        phaseType: existing.phaseType === 'PPS' ? 'PPS' : 'PPG',
        weeks: [{ id: `w_${uid}_1`, number: 1, objective: 'Semaine 1', sessions: mapped }]
      }
    ];
  }

  return [
    {
      id: `c_${uid}`,
      title: 'Phase 1 (PPG)',
      objective: 'Préparation Physique Générale — socle PIA 7.1.1',
      phaseType: 'PPG',
      weeks: [
        {
          id: `w_${uid}_1`,
          number: 1,
          objective: 'Mise en charge progressive',
          sessions: [
            {
              id: `s_${uid}_1`,
              title: 'Séance 1',
              type: 'MUSCU',
              intensity: 'MODERATE',
              dayOfWeek: 1,
              blocks: createDefaultTernaryBlocks(uid),
              exercises: []
            }
          ]
        }
      ]
    }
  ];
};

const loadCustomTemplates = (): SessionTemplateItem[] => {
  try {
    const raw = localStorage.getItem(CUSTOM_TPL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const ProgramBuilderStudio: React.FC<ProgramBuilderStudioProps> = ({
  onClose,
  existingProgram,
  defaultTargetUserId,
  user
}) => {
  const { showToast } = useToast();

  // Métadonnées du programme
  const [title, setTitle] = useState(existingProgram?.title || 'Nouveau Programme EPMS');
  const [goal, setGoal] = useState(existingProgram?.goal || 'Préparation Physique Opérationnelle (PIA 7.1.1)');
  const [type, setType] = useState<NonNullable<Program['type']>>(existingProgram?.type || 'Hybride');
  const [phaseType, setPhaseType] = useState<NonNullable<Program['phaseType']>>(
    existingProgram?.phaseType || 'PPG'
  );
  const [level, setLevel] = useState<NonNullable<Program['level']>>(
    existingProgram?.level || 'Intermédiaire'
  );
  const [visibility, setVisibility] = useState<ProgramVisibility>(
    existingProgram?.visibility || (existingProgram?.isSharedNational ? 'AAE' : 'SERVICE')
  );
  const [targetJobProfiles, setTargetJobProfiles] = useState<JobType[]>(
    existingProgram?.targetJobProfiles || [JobType.FUSCO, JobType.TECH]
  );
  const [tagsRaw, setTagsRaw] = useState<string>((existingProgram?.tags || ['PIA 7.1.1', 'PPG']).join(', '));
  const [isDraftAI, setIsDraftAI] = useState<boolean>(Boolean(existingProgram?.isDraftAI));
  const [version, setVersion] = useState<number>(existingProgram?.version || 1);
  const [versionHistory, setVersionHistory] = useState<ProgramVersionSnapshot[]>(
    existingProgram?.versionHistory || []
  );

  // Affectations courantes
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>(
    existingProgram?.assignedUserIds ||
      (existingProgram?.userId ? [existingProgram.userId] : defaultTargetUserId ? [defaultTargetUserId] : [])
  );
  const [assignedUnit, setAssignedUnit] = useState<string | undefined>(existingProgram?.assignedUnit);
  const [assignedJobProfile, setAssignedJobProfile] = useState<JobType | undefined>(
    existingProgram?.assignedJobProfile
  );
  const [startDate, setStartDate] = useState<string>(
    existingProgram?.startDate || new Date().toISOString().split('T')[0]
  );
  const [editPolicy, setEditPolicy] = useState<'APPLY_FROM_NOW' | 'FUTURE_ONLY'>(
    existingProgram?.editPolicy || 'FUTURE_ONLY'
  );

  // État éditeur Undo/Redo + Autosave
  const draftKey = `sm_prog_draft_${existingProgram?.id || 'new'}`;
  const editor = useProgramEditorState(buildInitialStructure(existingProgram), draftKey);

  // Navigation active dans la hiérarchie
  const [activeCIdx, setActiveCIdx] = useState(0);
  const [activeWIdx, setActiveWIdx] = useState(0);
  const [activeSIdx, setActiveSIdx] = useState(0);
  const [activeBIdx, setActiveBIdx] = useState(1);

  // Modes UX : Expert vs Assistant débutant, Vue calendrier, Suivi, Historique, Thème clair/sombre
  const [viewMode, setViewMode] = useState<'expert' | 'wizard' | 'calendar' | 'tracking' | 'versions'>('expert');
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [wizardWeeks, setWizardWeeks] = useState(4);
  const [wizardFreq, setWizardFreq] = useState(3);
  const [dark, setDark] = useState(false);

  // Onglet mobile 1-main & tiroir droit desktop
  const [mobilePane, setMobilePane] = useState<'editor' | 'exercises' | 'analytics'>('editor');
  const [desktopRightTab, setDesktopRightTab] = useState<'exercises' | 'analytics'>('exercises');

  // Modales & tiroirs auxiliaires
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showAIBriefModal, setShowAIBriefModal] = useState(false);
  const [aiBriefText, setAiBriefText] = useState('');
  const [aiBriefWeeks, setAiBriefWeeks] = useState(4);
  const [aiBriefFreq, setAiBriefFreq] = useState(3);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewInitialSoldier, setPreviewInitialSoldier] = useState<string | undefined>(undefined);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [customTemplates, setCustomTemplates] = useState<SessionTemplateItem[]>(() =>
    loadCustomTemplates()
  );

  // Données de la base
  const [exerciseLibrary, setExerciseLibrary] = useState<ExerciseLibraryItem[]>(() =>
    db.getExerciseLibrary()
  );
  const baseSoldiers = useMemo(
    () => db.getUsers().filter((u) => u.serviceId === user.serviceId && u.role === UserRole.USER),
    [user.serviceId]
  );
  const infras = useMemo(
    () => db.getInfrastructures().filter((i) => i.serviceId === user.serviceId),
    [user.serviceId]
  );
  const baseEquipment = useMemo(
    () => db.getEquipment().filter((e) => infras.some((i) => i.id === e.infrastructureId)),
    [infras]
  );

  // Sélections sécurisées
  const safeCIdx = Math.min(activeCIdx, Math.max(0, editor.structure.length - 1));
  const activeCycle = editor.structure[safeCIdx];
  const safeWIdx = Math.min(activeWIdx, Math.max(0, (activeCycle?.weeks.length || 1) - 1));
  const activeWeek = activeCycle?.weeks[safeWIdx];
  const safeSIdx = Math.min(activeSIdx, Math.max(0, (activeWeek?.sessions.length || 1) - 1));
  const activeSession = activeWeek?.sessions[safeSIdx];
  const activeBlocks = activeSession ? ensureSessionBlocks(activeSession) : [];
  const safeBIdx = Math.min(activeBIdx, Math.max(0, activeBlocks.length - 1));

  // Matériel requis automatiquement déduit des exercices de la séance active
  const deducedEquipment = useMemo(() => {
    if (!activeSession) return [];
    const set = new Set<string>();
    ensureSessionBlocks(activeSession).forEach((b) =>
      b.exercises.forEach((ex) => {
        if (ex.equipment && ex.equipment !== 'PDC') set.add(ex.equipment);
      })
    );
    return Array.from(set);
  }, [activeSession]);

  // Mise à jour champs séance active
  const updateActiveSession = (patch: Partial<ProgramSessionBuilder>) => {
    if (!activeSession) return;
    editor.mutate((d) => {
      Object.assign(d[safeCIdx].weeks[safeWIdx].sessions[safeSIdx], patch);
    });
  };

  // Correctifs rapides 1-clic depuis les alertes PIA 7.1.1
  const handleQuickFixAlert = (alert: PedagogicalAlert) => {
    if (alert.suggestedActionType === 'ADD_WARMUP' && activeSession) {
      editor.addBlock(safeCIdx, safeWIdx, safeSIdx, 'WARMUP', 0);
      showToast('Bloc Échauffement (PIA 7.1.1) ajouté.', 'success');
    } else if (alert.suggestedActionType === 'ADD_COOLDOWN' && activeSession) {
      editor.addBlock(safeCIdx, safeWIdx, safeSIdx, 'COOLDOWN');
      showToast('Bloc Retour au calme (PIA 7.1.1) ajouté.', 'success');
    } else if (alert.suggestedActionType === 'MARK_DELOAD') {
      editor.mutate((d) => {
        const weeks = d[safeCIdx]?.weeks || [];
        const target = weeks[3] || weeks[weeks.length - 1];
        if (target) {
          target.isDeload = true;
          target.objective = 'Semaine de décharge PIA 7.1.1 (-35% volume)';
        }
      });
      showToast('Semaine de décharge (règle 3:1 PIA) activée.', 'success');
    }
  };

  // Substitution matériel 1-clic
  const handleSubstituteExercise = (exerciseId: string, sub: ExerciseLibraryItem) => {
    editor.mutate((d) => {
      const sess = d[safeCIdx]?.weeks[safeWIdx]?.sessions[safeSIdx];
      if (!sess) return;
      ensureSessionBlocks(sess).forEach((blk) => {
        blk.exercises.forEach((ex) => {
          if (ex.id === exerciseId) {
            ex.libraryId = sub.id;
            ex.name = sub.name;
            ex.equipment = sub.equipment;
            ex.muscleGroup = sub.muscleGroup;
          }
        });
      });
    });
    showToast(`Exercice remplacé par ${sub.name} (${sub.equipment}).`, 'success');
  };

  // Sauvegarder la séance courante comme modèle réutilisable du moniteur
  const handleSaveSessionAsTemplate = () => {
    if (!activeSession) return;
    const item: SessionTemplateItem = {
      id: `tpl_custom_${Date.now()}`,
      name: `${activeSession.title} (Perso)`,
      category: 'PPG',
      level,
      targetJobProfiles,
      tags: ['Perso', user.name],
      session: JSON.parse(JSON.stringify(activeSession))
    };
    const next = [item, ...customTemplates];
    setCustomTemplates(next);
    try {
      localStorage.setItem(CUSTOM_TPL_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore quota
    }
    showToast('Séance enregistrée dans vos modèles réutilisables.', 'success');
  };

  // Génération assistant pas-à-pas (débutant) : 100% déterministe sans IA
  const handleBuildWizardSkeleton = () => {
    const uid = Date.now();
    const weeks = [];
    const defaultDays = [1, 3, 5, 2, 4, 6, 7];
    for (let w = 1; w <= wizardWeeks; w++) {
      const isDeload = w % 4 === 0;
      const sessions: ProgramSessionBuilder[] = [];
      for (let s = 0; s < wizardFreq; s++) {
        const tpl =
          type === 'Course'
            ? SESSION_TEMPLATES[2].session
            : type === 'CCPM'
            ? SESSION_TEMPLATES[1].session
            : targetJobProfiles.includes(JobType.PN) && s === wizardFreq - 1
            ? SESSION_TEMPLATES[4].session
            : s % 2 === 0
            ? SESSION_TEMPLATES[0].session
            : SESSION_TEMPLATES[3].session;
        const cloned: ProgramSessionBuilder = JSON.parse(JSON.stringify(tpl));
        cloned.id = `s_wiz_${uid}_${w}_${s}`;
        cloned.title = `S${w} — ${tpl.title}`;
        cloned.dayOfWeek = defaultDays[s % defaultDays.length];
        sessions.push(cloned);
      }
      weeks.push({
        id: `w_wiz_${uid}_${w}`,
        number: w,
        objective: isDeload ? 'Décharge PIA 7.1.1 (-35%)' : `Semaine ${w} — Progression`,
        isDeload,
        sessions
      });
    }
    editor.commit([
      {
        id: `c_wiz_${uid}`,
        title: `Phase 1 (${phaseType})`,
        objective: goal,
        phaseType: phaseType === 'MIXTE' ? 'MIXTE' : phaseType,
        weeks
      }
    ]);
    setActiveCIdx(0);
    setActiveWIdx(0);
    setActiveSIdx(0);
    setWizardStep(2);
    showToast(`Trame PIA 7.1.1 générée (${wizardWeeks} semaines × ${wizardFreq} séances).`, 'success');
  };

  // Génération Brouillon IA depuis un brief (Human-in-the-Loop + repli 100% déterministe)
  const handleGenerateAIDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiBriefText.trim()) return;
    setGeneratingAI(true);
    try {
      const targetSoldier = baseSoldiers[0] || user;
      const res = await generateFullProgram(
        targetSoldier,
        aiBriefText.trim(),
        aiBriefFreq,
        aiBriefWeeks,
        infras.map((i) => i.name)
      );
      if (res && Array.isArray(res.sessions) && res.sessions.length > 0) {
        const uid = Date.now();
        const weeks: ProgramCycle['weeks'] = [];
        for (let w = 1; w <= aiBriefWeeks; w++) {
          const slice = res.sessions.slice((w - 1) * aiBriefFreq, w * aiBriefFreq);
          const sourceSessions = slice.length > 0 ? slice : res.sessions.slice(0, aiBriefFreq);
          weeks.push({
            id: `w_ai_${uid}_${w}`,
            number: w,
            objective: w % 4 === 0 ? 'Décharge PIA 7.1.1' : `Semaine ${w}`,
            isDeload: w % 4 === 0,
            sessions: sourceSessions.map((s: any, idx: number) => ({
              id: `s_ai_${uid}_${w}_${idx}`,
              title: s.title || `Séance ${idx + 1}`,
              type: s.type || 'MUSCU',
              dayOfWeek: [1, 3, 5, 2, 4, 6][idx % 6],
              blocks: [
                { id: `b_wu_${uid}_${w}_${idx}`, type: 'WARMUP', title: 'Échauffement', rounds: 1, exercises: [] },
                {
                  id: `b_m_${uid}_${w}_${idx}`,
                  type: 'MAIN',
                  title: 'Corps de séance',
                  rounds: 1,
                  exercises: (s.content?.mainBlock || []).map((ex: any, eIdx: number) => ({
                    id: `ex_ai_${uid}_${w}_${idx}_${eIdx}`,
                    libraryId: 'ai_draft',
                    name: ex.exercise || 'Exercice',
                    sets: 3,
                    reps: ex.prescription || '10',
                    rest: ex.rest || '1:30'
                  }))
                },
                { id: `b_cd_${uid}_${w}_${idx}`, type: 'COOLDOWN', title: 'Retour au calme', rounds: 1, exercises: [] }
              ],
              exercises: []
            }))
          });
        }
        editor.commit([
          {
            id: `c_ai_${uid}`,
            title: `Brouillon IA — ${phaseType}`,
            objective: aiBriefText.trim(),
            phaseType,
            weeks
          }
        ]);
        if (res.title) setTitle(res.title);
        setGoal(aiBriefText.trim());
        setIsDraftAI(true);
        setShowAIBriefModal(false);
        showToast('Brouillon IA généré — Vérifiez et validez avant affectation (Human-in-the-Loop).', 'info');
      }
    } catch {
      showToast('IA indisponible : bascule sur génération locale PIA 7.1.1.', 'warning');
      setWizardWeeks(aiBriefWeeks);
      setWizardFreq(aiBriefFreq);
      setGoal(aiBriefText.trim());
      handleBuildWizardSkeleton();
      setShowAIBriefModal(false);
    } finally {
      setGeneratingAI(false);
    }
  };

  // Construction de l'objet Program complet prêt à sauvegarder ou exporter
  const buildProgramPayload = (overrides?: Partial<Program>): Program => {
    const allSessions: Session[] = [];
    let totalWeeks = 0;
    let maxSessPerWeek = 0;
    editor.structure.forEach((cycle) => {
      cycle.weeks.forEach((wk) => {
        totalWeeks += 1;
        maxSessPerWeek = Math.max(maxSessPerWeek, wk.sessions.length);
        wk.sessions.forEach((sb, sIdx) => {
          allSessions.push({
            ...flattenBuilderSessionToLegacy(sb, {
              programId: existingProgram?.id || `prog_tmp`,
              weekNumber: wk.number,
              dayNumber: sb.dayOfWeek || sIdx + 1,
              fallbackLocation: infras[0]?.name
            }),
            infrastructureId: sb.infrastructureId || infras[0]?.id || 'infra_default',
            createdByName: user.name,
            createdByBase: getBaseCode(user.serviceId)
          });
        });
      });
    });

    const nextVersion = existingProgram ? version + 1 : 1;
    const snapshot: ProgramVersionSnapshot = {
      version: nextVersion,
      savedAt: new Date().toISOString(),
      savedByNid: user.nid,
      savedByName: user.name,
      summary: `${totalWeeks} sem. • ${allSessions.length} séances • ${visibility}`,
      editPolicy,
      structure: JSON.parse(JSON.stringify(editor.structure))
    };

    const nextHistory = [snapshot, ...versionHistory].slice(0, 15);
    const id = existingProgram?.id || `prog_${Date.now()}`;

    return {
      id,
      userId: assignedUserIds[0] || existingProgram?.userId || '',
      assignedUserIds,
      assignedUnit,
      assignedJobProfile,
      isTemplate: assignedUserIds.length === 0 && !assignedUnit && !assignedJobProfile,
      isSharedNational: visibility === 'AAE',
      visibility,
      version: nextVersion,
      versionHistory: nextHistory,
      sourceProgramId: existingProgram?.sourceProgramId,
      sourceAuthorName: existingProgram?.sourceAuthorName,
      sourceBase: existingProgram?.sourceBase,
      isDraftAI,
      phaseType,
      level,
      targetJobProfiles,
      tags: tagsRaw
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      appliedFromDate: startDate,
      editPolicy,
      createdByNid: existingProgram?.createdByNid || user.nid,
      createdByName: existingProgram?.createdByName || user.name,
      createdByBase: existingProgram?.createdByBase || getBaseCode(user.serviceId),
      validatorId: user.nid,
      title: title.trim() || 'Programme EPMS',
      goal: goal.trim() || 'Préparation Physique Opérationnelle',
      status: ProgramStatus.VALIDATED,
      type,
      startDate,
      durationWeeks: Math.max(1, totalWeeks),
      sessionsPerWeek: Math.max(1, maxSessPerWeek),
      sessions: allSessions.map((s) => ({ ...s, programId: id })),
      structure: JSON.parse(JSON.stringify(editor.structure)),
      ...overrides
    };
  };

  const handleSaveProgram = (assignOverrides?: Partial<Program>, closeAfter = true) => {
    const payload = buildProgramPayload(assignOverrides);
    if (existingProgram) {
      db.updateProgram(payload);
    } else {
      db.addProgram(payload);
    }
    setVersion(payload.version || 1);
    setVersionHistory(payload.versionHistory || []);
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // Ignore
    }
    db.logAudit({
      actorNid: user.nid,
      actorName: user.name,
      actorRole: user.role,
      action: assignOverrides?.assignedUserIds?.length ? 'PROGRAM_ASSIGNED' : 'PROGRAM_PUBLISHED',
      targetId: payload.id,
      details: `${payload.title} (v${payload.version}, visibilité ${payload.visibility}, ${(payload.assignedUserIds || []).length} affectés)`,
      serviceId: user.serviceId
    });
    showToast(
      `Programme « ${payload.title} » enregistré (v${payload.version}).`,
      'success'
    );
    if (closeAfter) onClose();
  };

  const handleConfirmMassAssign = (assign: MassAssignPayload) => {
    const mappedPolicy =
      assign.editPolicy === 'APPLY_NOW' ? 'APPLY_FROM_NOW' : 'FUTURE_ONLY';
    setAssignedUserIds(assign.selectedUserIds);
    setAssignedUnit(assign.assignedUnit);
    setAssignedJobProfile(assign.targetJobProfile);
    setStartDate(assign.startDate);
    setEditPolicy(mappedPolicy);
    setShowAssignModal(false);

    handleSaveProgram(
      {
        userId: assign.selectedUserIds[0] || '',
        assignedUserIds: assign.selectedUserIds,
        assignedUnit: assign.assignedUnit,
        assignedJobProfile: assign.targetJobProfile,
        isTemplate: false,
        startDate: assign.startDate,
        appliedFromDate: assign.startDate,
        editPolicy: mappedPolicy,
        recurrence: assign.recurrence === 'WEEKLY_CYCLE' ? 'WEEKLY' : undefined
      },
      false
    );

    // Notification aux militaires affectés
    assign.selectedUserIds.forEach((nid) => {
      db.addNotification({
        id: `notif_prog_${Date.now()}_${nid}`,
        targetNids: [nid],
        title: `Nouveau programme EPMS : ${title}`,
        message: `Votre moniteur ${user.name} vous a affecté au programme « ${title} » (début le ${assign.startDate}). Vos charges et allures ont été calculées automatiquement.`,
        timestamp: Date.now(),
        category: 'PROGRAM',
        read: false,
        type: 'info'
      });
    });
  };

  // Thème Studio Clair / Sombre
  const shellBg = dark ? 'bg-military-950 text-white' : 'bg-gray-100 text-military-900';
  const panelBg = dark
    ? 'bg-military-900 border-military-800 text-white'
    : 'bg-white border-gray-200 text-military-900';
  const inputBg = dark
    ? 'bg-military-800 border-military-700 text-white placeholder-military-400'
    : 'bg-gray-50 border-gray-200 text-military-900';

  const currentProgramSnapshot = useMemo(
    () => buildProgramPayload(),
    [title, goal, type, phaseType, level, visibility, editor.structure, assignedUserIds, assignedUnit]
  );

  return (
    <div className={`fixed inset-0 z-40 flex flex-col overflow-hidden ${shellBg}`}>
      {/* BANDEAU BROUILLON IA (Human-in-the-Loop obligatoire) */}
      {isDraftAI && (
        <div className="bg-amber-400 text-military-950 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs font-black">
          <div className="flex items-center gap-2">
            <span className="material-icons text-base">auto_awesome</span>
            <span>
              BROUILLON IA — Contenu généré par assistance IA, non validé. Le moniteur EPMS reste
              seul décideur (Human-in-the-Loop).
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsDraftAI(false);
              showToast('Brouillon IA validé sous la responsabilité du moniteur EPMS.', 'success');
            }}
            className="px-3 py-1 rounded-lg bg-military-950 text-action-400 uppercase text-[10px]"
          >
            Valider ce programme (Moniteur)
          </button>
        </div>
      )}

      {/* BARRE SUPÉRIEURE DU STUDIO */}
      <header className="bg-military-900 text-white px-3 sm:px-5 py-2.5 border-b border-military-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-military-800 hover:bg-military-700 text-white shrink-0"
            aria-label="Fermer l'éditeur"
          >
            <span className="material-icons text-base">arrow_back</span>
          </button>
          <div className="min-w-0 flex-1 max-w-md">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-label="Titre du programme"
              placeholder="Titre du programme EPMS..."
              className="w-full bg-transparent font-black text-sm sm:text-base text-white outline-none border-b border-transparent focus:border-action-500 truncate"
            />
            <div className="flex flex-wrap items-center gap-2 text-[10px] text-military-300 font-bold">
              <span>v{version}</span>
              <span>•</span>
              <span className="text-action-400">
                {editor.autosaveStatus === 'saving'
                  ? 'Enregistrement...'
                  : editor.lastSavedAt
                  ? `Sauvegardé ${editor.lastSavedAt}`
                  : 'Brouillon local prêt'}
              </span>
              {existingProgram?.sourceAuthorName && (
                <span>• Adapté de {existingProgram.sourceAuthorName}</span>
              )}
            </div>
          </div>
        </div>

        {/* Outils rapides : Undo/Redo, Thème, Modèles, Import/Export, IA, Preview, Affecter, Enregistrer */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center bg-military-800 rounded-xl p-0.5">
            <button
              type="button"
              disabled={!editor.canUndo}
              onClick={editor.undo}
              className="p-1.5 rounded-lg hover:bg-military-700 disabled:opacity-30"
              title="Annuler (Ctrl+Z)"
              aria-label="Annuler"
            >
              <span className="material-icons text-sm">undo</span>
            </button>
            <button
              type="button"
              disabled={!editor.canRedo}
              onClick={editor.redo}
              className="p-1.5 rounded-lg hover:bg-military-700 disabled:opacity-30"
              title="Rétablir (Ctrl+Y)"
              aria-label="Rétablir"
            >
              <span className="material-icons text-sm">redo</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setDark((d) => !d)}
            className="p-2 rounded-xl bg-military-800 hover:bg-military-700"
            title={dark ? 'Passer en mode clair' : 'Passer en mode sombre'}
            aria-label="Basculer thème clair/sombre"
          >
            <span className="material-icons text-sm">{dark ? 'light_mode' : 'dark_mode'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowTemplatesModal(true)}
            className="px-2.5 py-1.5 rounded-xl bg-military-800 hover:bg-military-700 text-[11px] font-black uppercase flex items-center gap-1"
          >
            <span className="material-icons text-sm text-action-400">dashboard_customize</span>
            <span className="hidden sm:inline">Modèles</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAIBriefModal(true)}
            className="px-2.5 py-1.5 rounded-xl bg-military-800 hover:bg-military-700 text-[11px] font-black uppercase flex items-center gap-1"
          >
            <span className="material-icons text-sm text-purple-400">auto_awesome</span>
            <span className="hidden md:inline">Brouillon IA</span>
          </button>

          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="px-2.5 py-1.5 rounded-xl bg-military-800 hover:bg-military-700 text-[11px] font-black uppercase flex items-center gap-1"
            title="Importer (JSON, Excel CSV, TXT, PDF/Word)"
          >
            <span className="material-icons text-sm text-cyan-400">upload_file</span>
            <span className="hidden lg:inline">Importer</span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExportMenu((v) => !v)}
              className="px-2.5 py-1.5 rounded-xl bg-military-800 hover:bg-military-700 text-[11px] font-black uppercase flex items-center gap-1"
            >
              <span className="material-icons text-sm text-emerald-400">download</span>
              <span className="hidden lg:inline">Exporter</span>
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-1.5 w-52 rounded-2xl bg-white text-military-900 shadow-xl border border-gray-200 p-1.5 z-50 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    exportProgramPrintPDF(currentProgramSnapshot);
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-gray-100 flex items-center gap-2"
                >
                  <span className="material-icons text-sm text-red-600">picture_as_pdf</span>
                  Fiche PDF propre (Imprimer)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    exportProgramExcelCSV(currentProgramSnapshot);
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-gray-100 flex items-center gap-2"
                >
                  <span className="material-icons text-sm text-emerald-600">table_view</span>
                  Tableur Excel (.csv UTF-8)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    exportProgramJSON(currentProgramSnapshot);
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-gray-100 flex items-center gap-2"
                >
                  <span className="material-icons text-sm text-blue-600">code</span>
                  Archive structurée (.json)
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowFormulaModal(true)}
            className="p-2 rounded-xl bg-military-800 hover:bg-military-700"
            title="Formules 1RM / VMA & seuils PIA 7.1.1"
            aria-label="Paramètres formules"
          >
            <span className="material-icons text-sm text-action-400">functions</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPreviewInitialSoldier(assignedUserIds[0]);
              setShowPreviewModal(true);
            }}
            className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black uppercase flex items-center gap-1"
          >
            <span className="material-icons text-sm">visibility</span>
            <span className="hidden sm:inline">Vue Militaire</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAssignModal(true)}
            className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black uppercase flex items-center gap-1"
          >
            <span className="material-icons text-sm">group_add</span>
            <span className="hidden sm:inline">Affecter ({assignedUserIds.length})</span>
          </button>

          <button
            type="button"
            onClick={() => handleSaveProgram(undefined, true)}
            className="px-3.5 py-1.5 rounded-xl bg-action-500 hover:bg-action-400 text-military-950 text-[11px] font-black uppercase shadow flex items-center gap-1"
          >
            <span className="material-icons text-sm">save</span>
            Enregistrer
          </button>
        </div>
      </header>

      {/* BARRE DE NAVIGATION DE VUES & MÉTADONNÉES RAPIDES */}
      <div
        className={`px-3 sm:px-5 py-2 border-b flex flex-wrap items-center justify-between gap-2 shrink-0 ${panelBg}`}
      >
        <div className="flex flex-wrap items-center gap-1">
          {[
            { id: 'expert', label: 'Éditeur Expert', icon: 'tune' },
            { id: 'wizard', label: 'Assistant Débutant', icon: 'school' },
            { id: 'calendar', label: 'Calendrier Semaines', icon: 'calendar_month' },
            { id: 'tracking', label: `Suivi (${assignedUserIds.length})`, icon: 'monitoring' },
            { id: 'versions', label: `Versions (${versionHistory.length})`, icon: 'history' }
          ].map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setViewMode(v.id as any)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase flex items-center gap-1 transition-all ${
                viewMode === v.id
                  ? 'bg-military-900 text-action-400 shadow-sm'
                  : dark
                  ? 'text-military-300 hover:bg-military-800'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="material-icons text-sm">{v.icon}</span>
              {v.label}
            </button>
          ))}
        </div>

        {/* Sélecteurs compacts : Type, Phase PIA, Niveau, Visibilité */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <select
            aria-label="Type de programme"
            value={type}
            onChange={(e) => setType(e.target.value as any)}
            className={`px-2 py-1 rounded-lg border font-bold ${inputBg}`}
          >
            {PROGRAM_TYPES.map((pt) => (
              <option key={pt} value={pt}>
                {pt}
              </option>
            ))}
          </select>
          <select
            aria-label="Phase PIA"
            value={phaseType}
            onChange={(e) => setPhaseType(e.target.value as any)}
            className={`px-2 py-1 rounded-lg border font-bold ${inputBg}`}
          >
            <option value="PPG">PPG (Générale)</option>
            <option value="PPS">PPS (Spécifique Métier)</option>
            <option value="MIXTE">Mixte PPG/PPS</option>
          </select>
          <select
            aria-label="Niveau"
            value={level}
            onChange={(e) => setLevel(e.target.value as any)}
            className={`px-2 py-1 rounded-lg border font-bold ${inputBg}`}
          >
            <option value="Débutant">Débutant</option>
            <option value="Intermédiaire">Intermédiaire</option>
            <option value="Avancé">Avancé</option>
          </select>
          <select
            aria-label="Visibilité mutualisation"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as ProgramVisibility)}
            className={`px-2 py-1 rounded-lg border font-black ${inputBg}`}
          >
            <option value="PRIVATE">Privé (Moniteur)</option>
            <option value="SERVICE">Service EPMS (Base)</option>
            <option value="AAE">Mutualisé AAE (National)</option>
          </select>
        </div>
      </div>

      {/* CONTENU PRINCIPAL SELON LE MODE */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* === MODE 1 : ASSISTANT DÉBUTANT PAS-À-PAS === */}
        {viewMode === 'wizard' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-5">
            <div className="flex items-center justify-between gap-2">
              {[
                { step: 1, label: '1. Cadrage PIA' },
                { step: 2, label: '2. Séances & Blocs' },
                { step: 3, label: '3. Contrôle & Affectation' }
              ].map((s) => (
                <button
                  key={s.step}
                  type="button"
                  onClick={() => setWizardStep(s.step as any)}
                  className={`flex-1 py-2.5 rounded-xl font-black text-xs uppercase border-2 transition-all ${
                    wizardStep === s.step
                      ? 'bg-military-900 text-action-400 border-action-500'
                      : panelBg
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {wizardStep === 1 && (
              <div className={`p-5 rounded-3xl border space-y-4 ${panelBg}`}>
                <h3 className="font-black text-base">
                  Étape 1 — Définissez votre objectif et le public ciblé
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <label className="font-bold">
                    Objectif principal
                    <input
                      type="text"
                      value={goal}
                      onChange={(e) => setGoal(e.target.value)}
                      className={`mt-1 w-full p-2.5 rounded-xl border font-bold ${inputBg}`}
                    />
                  </label>
                  <label className="font-bold">
                    Tags (séparés par virgules)
                    <input
                      type="text"
                      value={tagsRaw}
                      onChange={(e) => setTagsRaw(e.target.value)}
                      className={`mt-1 w-full p-2.5 rounded-xl border font-bold ${inputBg}`}
                    />
                  </label>
                  <label className="font-bold">
                    Durée du cycle (semaines)
                    <input
                      type="number"
                      min={1}
                      max={16}
                      value={wizardWeeks}
                      onChange={(e) => setWizardWeeks(Math.max(1, parseInt(e.target.value, 10) || 4))}
                      className={`mt-1 w-full p-2.5 rounded-xl border font-black ${inputBg}`}
                    />
                  </label>
                  <label className="font-bold">
                    Fréquence (séances / semaine)
                    <input
                      type="number"
                      min={1}
                      max={7}
                      value={wizardFreq}
                      onChange={(e) => setWizardFreq(Math.max(1, parseInt(e.target.value, 10) || 3))}
                      className={`mt-1 w-full p-2.5 rounded-xl border font-black ${inputBg}`}
                    />
                  </label>
                </div>

                <div>
                  <div className="text-xs font-bold mb-1.5">Profils métier AAE ciblés</div>
                  <div className="flex flex-wrap gap-2">
                    {Object.values(JobType).map((j) => {
                      const active = targetJobProfiles.includes(j);
                      return (
                        <button
                          key={j}
                          type="button"
                          onClick={() =>
                            setTargetJobProfiles((prev) =>
                              prev.includes(j) ? prev.filter((x) => x !== j) : [...prev, j]
                            )
                          }
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                            active
                              ? 'bg-military-900 text-action-400 border-action-500'
                              : inputBg
                          }`}
                        >
                          {j}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleBuildWizardSkeleton}
                    className="px-5 py-2.5 rounded-xl bg-action-500 text-military-950 font-black text-xs uppercase shadow"
                  >
                    Générer la trame PIA 7.1.1 & Continuer →
                  </button>
                </div>
              </div>
            )}

            {wizardStep === 2 && (
              <div className={`p-5 rounded-3xl border space-y-4 ${panelBg}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-black text-base">
                    Étape 2 — Personnalisez vos séances ou basculez en Éditeur Expert
                  </h3>
                  <button
                    type="button"
                    onClick={() => setViewMode('expert')}
                    className="px-3 py-1.5 rounded-xl bg-military-900 text-action-400 text-xs font-black uppercase"
                  >
                    Ouvrir l'Éditeur complet
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SESSION_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => {
                        const idx = editor.addSession(safeCIdx, safeWIdx, tpl.session);
                        setActiveSIdx(idx);
                        showToast(`Modèle « ${tpl.name} » ajouté à S${activeWeek?.number || 1}.`, 'success');
                      }}
                      className={`p-3.5 rounded-2xl border text-left hover:border-action-500 transition-all ${inputBg}`}
                    >
                      <div className="font-black text-xs">{tpl.name}</div>
                      <div className="text-[11px] opacity-75 mt-1">{tpl.session.objective}</div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {tpl.tags.map((t) => (
                          <span
                            key={t}
                            className="px-1.5 py-0.5 rounded bg-military-900 text-action-400 text-[9px] font-black"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setWizardStep(1)}
                    className="px-4 py-2 rounded-xl border text-xs font-bold"
                  >
                    ← Retour
                  </button>
                  <button
                    type="button"
                    onClick={() => setWizardStep(3)}
                    className="px-5 py-2.5 rounded-xl bg-action-500 text-military-950 font-black text-xs uppercase shadow"
                  >
                    Étape 3 : Vérification & Affectation →
                  </button>
                </div>
              </div>
            )}

            {wizardStep === 3 && (
              <div className="space-y-4">
                <AnalyticsHUD
                  structure={editor.structure}
                  activeSession={activeSession}
                  exerciseLibrary={exerciseLibrary}
                  targetJobProfiles={targetJobProfiles}
                  availableEquipment={baseEquipment}
                  dark={dark}
                  onQuickFixAlert={handleQuickFixAlert}
                  onSubstituteExercise={handleSubstituteExercise}
                />
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPreviewModal(true)}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 text-white font-black text-xs uppercase"
                  >
                    Prévisualiser en tant que militaire
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAssignModal(true)}
                    className="px-5 py-2.5 rounded-xl bg-action-500 text-military-950 font-black text-xs uppercase shadow"
                  >
                    Affecter & Publier
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* === MODE 2 : VUE CALENDRIER MULTI-SEMAINES === */}
        {viewMode === 'calendar' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
            {editor.structure.map((cycle, cIdx) => (
              <div key={cycle.id} className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-black text-sm uppercase tracking-wider">
                    {cycle.title} — <span className="opacity-70">{cycle.objective}</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => editor.addWeek(cIdx)}
                    className="px-3 py-1.5 rounded-xl bg-military-900 text-action-400 text-xs font-black uppercase"
                  >
                    + Ajouter semaine
                  </button>
                </div>

                {cycle.weeks.map((wk, wIdx) => (
                  <div key={wk.id} className={`rounded-2xl border p-3.5 space-y-2.5 ${panelBg}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs uppercase">Semaine {wk.number}</span>
                        {wk.isDeload && (
                          <span className="px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 text-[10px] font-black">
                            DÉCHARGE PIA
                          </span>
                        )}
                        <span className="text-xs opacity-70">{wk.objective}</span>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => editor.duplicateWeek(cIdx, wIdx)}
                          className="px-2.5 py-1 rounded-lg border text-[10px] font-bold"
                        >
                          Dupliquer semaine
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const idx = editor.addSession(cIdx, wIdx);
                            setActiveCIdx(cIdx);
                            setActiveWIdx(wIdx);
                            setActiveSIdx(idx);
                            setViewMode('expert');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-action-500 text-military-950 text-[10px] font-black uppercase"
                        >
                          + Séance
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
                      {DAYS_FR.map((dayLabel, dIdx) => {
                        const dayNum = dIdx + 1;
                        const daySessions = wk.sessions
                          .map((s, sIdx) => ({ s, sIdx }))
                          .filter(({ s, sIdx }) => (s.dayOfWeek || ((sIdx % 7) + 1)) === dayNum);
                        return (
                          <div
                            key={dayLabel}
                            className={`min-h-[92px] p-2 rounded-xl border ${inputBg}`}
                          >
                            <div className="text-[10px] font-black uppercase opacity-60 mb-1.5">
                              {dayLabel}
                            </div>
                            <div className="space-y-1.5">
                              {daySessions.map(({ s, sIdx }) => (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => {
                                    setActiveCIdx(cIdx);
                                    setActiveWIdx(wIdx);
                                    setActiveSIdx(sIdx);
                                    setViewMode('expert');
                                  }}
                                  className="w-full text-left p-2 rounded-lg bg-military-900 text-white hover:ring-2 hover:ring-action-400 transition-all"
                                >
                                  <div className="text-[10px] font-black truncate text-action-400">
                                    {s.title}
                                  </div>
                                  <div className="text-[9px] opacity-75">
                                    {s.type} • {ensureSessionBlocks(s).reduce((a, b) => a + b.exercises.length, 0)} ex.
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* === MODE 3 : SUIVI DES MILITAIRES AFFECTÉS === */}
        {viewMode === 'tracking' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 max-w-5xl mx-auto w-full">
            <ProgramTrackingTable
              program={currentProgramSnapshot}
              soldiers={baseSoldiers}
              exerciseLibrary={exerciseLibrary}
              onInspectSoldier={(nid) => {
                setPreviewInitialSoldier(nid);
                setShowPreviewModal(true);
              }}
              onAssignMore={() => setShowAssignModal(true)}
            />
          </div>
        )}

        {/* === MODE 4 : HISTORIQUE DES VERSIONS === */}
        {viewMode === 'versions' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 max-w-4xl mx-auto w-full space-y-3">
            <h3 className="font-black text-base">Historique des versions du programme</h3>
            {versionHistory.length === 0 ? (
              <div className={`p-6 rounded-2xl border text-xs opacity-75 ${panelBg}`}>
                Aucune version archivée pour le moment. Chaque enregistrement crée automatiquement un
                instantané restaurable.
              </div>
            ) : (
              versionHistory.map((snap) => (
                <div
                  key={`${snap.version}_${snap.savedAt}`}
                  className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-2 ${panelBg}`}
                >
                  <div>
                    <div className="font-black text-sm">
                      Version {snap.version}{' '}
                      <span className="text-xs font-normal opacity-70">
                        — {new Date(snap.savedAt).toLocaleString('fr-FR')} par {snap.savedByName}
                      </span>
                    </div>
                    <div className="text-xs opacity-75 mt-0.5">{snap.summary}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      editor.commit(JSON.parse(JSON.stringify(snap.structure)));
                      setViewMode('expert');
                      showToast(`Version v${snap.version} restaurée dans l'éditeur (Ctrl+Z possible).`, 'info');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-military-900 text-action-400 text-xs font-black uppercase"
                  >
                    Restaurer cette version
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* === MODE 5 : ÉDITEUR EXPERT 3 COLONNES (DESKTOP) / 1-MAIN (MOBILE) === */}
        {viewMode === 'expert' && (
          <div className="flex-1 overflow-hidden flex flex-col lg:grid lg:grid-cols-12">
            {/* COLONNE GAUCHE : Arborescence Cycles > Semaines > Séances */}
            <aside
              className={`lg:col-span-3 border-b lg:border-b-0 lg:border-r p-3 overflow-y-auto custom-scrollbar space-y-3 ${panelBg}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider opacity-70">
                  Structure du programme
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => editor.addCycle('PPG')}
                    className="px-2 py-1 rounded-lg bg-military-900 text-action-400 text-[10px] font-black"
                    title="Ajouter une phase PPG"
                  >
                    + PPG
                  </button>
                  <button
                    type="button"
                    onClick={() => editor.addCycle('PPS')}
                    className="px-2 py-1 rounded-lg bg-blue-700 text-white text-[10px] font-black"
                    title="Ajouter une phase PPS métier"
                  >
                    + PPS
                  </button>
                </div>
              </div>

              {editor.structure.map((cycle, cIdx) => (
                <div key={cycle.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-1 px-2 py-1 rounded-lg bg-military-900/5">
                    <span className="text-[11px] font-black truncate">{cycle.title}</span>
                    <button
                      type="button"
                      onClick={() => editor.addWeek(cIdx)}
                      className="text-[10px] font-black text-action-600 hover:underline shrink-0"
                    >
                      + Sem.
                    </button>
                  </div>

                  {cycle.weeks.map((wk, wIdx) => (
                    <div key={wk.id} className="pl-2 space-y-1.5">
                      <div className="flex items-center justify-between gap-1 text-[11px] font-bold">
                        <span className="flex items-center gap-1">
                          S{wk.number}
                          {wk.isDeload && (
                            <span className="px-1.5 py-0.2 rounded bg-cyan-100 text-cyan-800 text-[9px] font-black">
                              Décharge
                            </span>
                          )}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              editor.mutate((d) => {
                                d[cIdx].weeks[wIdx].isDeload = !d[cIdx].weeks[wIdx].isDeload;
                              })
                            }
                            className="text-[9px] px-1.5 py-0.5 rounded border opacity-75 hover:opacity-100"
                            title="Basculer semaine de décharge PIA"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() => editor.duplicateWeek(cIdx, wIdx)}
                            className="text-[9px] px-1.5 py-0.5 rounded border opacity-75 hover:opacity-100"
                            title="Dupliquer la semaine"
                          >
                            ⧉
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const idx = editor.addSession(cIdx, wIdx);
                              setActiveCIdx(cIdx);
                              setActiveWIdx(wIdx);
                              setActiveSIdx(idx);
                            }}
                            className="text-[10px] font-black text-action-600"
                          >
                            + Séance
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        {wk.sessions.map((sess, sIdx) => {
                          const isCurrent =
                            cIdx === safeCIdx && wIdx === safeWIdx && sIdx === safeSIdx;
                          return (
                            <div
                              key={sess.id}
                              onClick={() => {
                                setActiveCIdx(cIdx);
                                setActiveWIdx(wIdx);
                                setActiveSIdx(sIdx);
                                setActiveBIdx(0);
                              }}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  setActiveCIdx(cIdx);
                                  setActiveWIdx(wIdx);
                                  setActiveSIdx(sIdx);
                                }
                              }}
                              className={`px-2.5 py-2 rounded-xl border text-xs flex items-center justify-between gap-1 cursor-pointer transition-all ${
                                isCurrent
                                  ? 'bg-military-900 text-action-400 border-action-500 font-black shadow-sm'
                                  : dark
                                  ? 'bg-military-800 border-military-700 hover:border-action-500'
                                  : 'bg-gray-50 border-gray-200 hover:border-action-400'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="truncate font-bold">{sess.title}</div>
                                <div className="text-[9px] opacity-75">
                                  {DAYS_FR[(sess.dayOfWeek || 1) - 1]} • {sess.type} •{' '}
                                  {ensureSessionBlocks(sess).reduce(
                                    (acc, b) => acc + b.exercises.length,
                                    0
                                  )}{' '}
                                  ex.
                                </div>
                              </div>
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    editor.duplicateSession(cIdx, wIdx, sIdx);
                                  }}
                                  className="p-1 rounded hover:bg-white/10"
                                  title="Dupliquer la séance"
                                >
                                  <span className="material-icons text-xs">content_copy</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    editor.deleteSession(cIdx, wIdx, sIdx);
                                  }}
                                  className="p-1 rounded hover:bg-red-500/20"
                                  title="Supprimer la séance"
                                >
                                  <span className="material-icons text-xs">close</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </aside>

            {/* ZONE CENTRALE : Constructeur visuel en blocs */}
            <main
              className={`lg:col-span-6 overflow-y-auto custom-scrollbar p-3 sm:p-5 space-y-4 ${
                mobilePane !== 'editor' ? 'hidden lg:block' : 'block'
              }`}
            >
              {activeSession ? (
                <>
                  {/* En-tête de la séance sélectionnée */}
                  <div className={`p-4 rounded-2xl border space-y-3 ${panelBg}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <input
                        type="text"
                        value={activeSession.title}
                        onChange={(e) => updateActiveSession({ title: e.target.value })}
                        aria-label="Titre de la séance"
                        className={`flex-1 min-w-[180px] px-3 py-1.5 rounded-xl border font-black text-sm outline-none focus:border-action-500 ${inputBg}`}
                      />
                      <button
                        type="button"
                        onClick={handleSaveSessionAsTemplate}
                        className="px-2.5 py-1.5 rounded-xl border text-[10px] font-black uppercase hover:border-action-500 flex items-center gap-1"
                        title="Enregistrer cette séance comme modèle réutilisable"
                      >
                        <span className="material-icons text-xs text-action-500">bookmark_add</span>
                        Sauver modèle
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <select
                        aria-label="Type de séance"
                        value={activeSession.type}
                        onChange={(e) => updateActiveSession({ type: e.target.value })}
                        className={`p-1.5 rounded-lg border font-bold ${inputBg}`}
                      >
                        {['MUSCU', 'CARDIO', 'HIIT', 'PPO', 'MOBILITE', 'PILATES', 'NATATION', 'HYROX', 'AMRAP', 'EMOM', 'TABATA'].map(
                          (t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          )
                        )}
                      </select>
                      <select
                        aria-label="Intensité globale"
                        value={activeSession.intensity || 'MODERATE'}
                        onChange={(e) => updateActiveSession({ intensity: e.target.value as any })}
                        className={`p-1.5 rounded-lg border font-bold ${inputBg}`}
                      >
                        <option value="LOW">Intensité Basse</option>
                        <option value="MODERATE">Intensité Modérée</option>
                        <option value="HIGH">Intensité Haute</option>
                        <option value="MAX">Intensité Maximale</option>
                      </select>
                      <select
                        aria-label="Jour de la semaine"
                        value={activeSession.dayOfWeek || 1}
                        onChange={(e) =>
                          updateActiveSession({ dayOfWeek: parseInt(e.target.value, 10) })
                        }
                        className={`p-1.5 rounded-lg border font-bold ${inputBg}`}
                      >
                        {DAYS_FR.map((d, i) => (
                          <option key={d} value={i + 1}>
                            {d}
                          </option>
                        ))}
                      </select>
                      <select
                        aria-label="Installation"
                        value={activeSession.locationName || ''}
                        onChange={(e) => updateActiveSession({ locationName: e.target.value })}
                        className={`p-1.5 rounded-lg border font-bold ${inputBg}`}
                      >
                        <option value="">Lieu libre / Tous sites</option>
                        {infras.map((inf) => (
                          <option key={inf.id} value={inf.name}>
                            {inf.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <input
                      type="text"
                      value={activeSession.safetyCues || ''}
                      onChange={(e) => updateActiveSession({ safetyCues: e.target.value })}
                      placeholder="Consignes de sécurité / notes moniteur EPMS..."
                      className={`w-full px-3 py-1.5 rounded-xl border text-xs outline-none ${inputBg}`}
                    />

                    {deducedEquipment.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 text-[10px]">
                        <span className="font-black uppercase opacity-60">Matériel requis :</span>
                        {deducedEquipment.map((eq) => (
                          <span
                            key={eq}
                            className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 font-bold"
                          >
                            {eq}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Constructeur visuel en blocs (DnD + saisie rapide) */}
                  <BlockEditor
                    blocks={activeBlocks}
                    activeBlockIndex={safeBIdx}
                    exerciseLibrary={exerciseLibrary}
                    dark={dark}
                    onSelectBlock={(bIdx) => setActiveBIdx(bIdx)}
                    onUpdateBlock={(bIdx, patch) =>
                      editor.mutate((d) => {
                        const blks = ensureSessionBlocks(
                          d[safeCIdx].weeks[safeWIdx].sessions[safeSIdx]
                        );
                        blks[bIdx] = { ...blks[bIdx], ...patch };
                        d[safeCIdx].weeks[safeWIdx].sessions[safeSIdx].blocks = blks;
                      })
                    }
                    onAddBlock={(bt) => editor.addBlock(safeCIdx, safeWIdx, safeSIdx, bt)}
                    onDuplicateBlock={(bIdx) =>
                      editor.duplicateBlock(safeCIdx, safeWIdx, safeSIdx, bIdx)
                    }
                    onCopyBlock={(blk) => {
                      editor.setClipboardBlock(JSON.parse(JSON.stringify(blk)));
                      showToast(`Bloc « ${blk.title} » copié.`, 'info');
                    }}
                    onPasteBlock={() => {
                      editor.pasteClipboardBlock(safeCIdx, safeWIdx, safeSIdx);
                      showToast('Bloc collé dans la séance.', 'success');
                    }}
                    hasClipboardBlock={Boolean(editor.clipboardBlock)}
                    onDeleteBlock={(bIdx) => {
                      editor.deleteBlock(safeCIdx, safeWIdx, safeSIdx, bIdx);
                      showToast('Bloc supprimé (Ctrl+Z pour annuler).', 'info');
                    }}
                    onReorderBlocks={(o, n) =>
                      editor.reorderBlocks(safeCIdx, safeWIdx, safeSIdx, o, n)
                    }
                    onUpdateExercise={(bIdx, eIdx, patch) =>
                      editor.updateExercise(safeCIdx, safeWIdx, safeSIdx, bIdx, eIdx, patch)
                    }
                    onDuplicateExercise={(bIdx, eIdx) =>
                      editor.duplicateExercise(safeCIdx, safeWIdx, safeSIdx, bIdx, eIdx)
                    }
                    onDeleteExercise={(bIdx, eIdx) =>
                      editor.deleteExercise(safeCIdx, safeWIdx, safeSIdx, bIdx, eIdx)
                    }
                    onReorderExercises={(bIdx, o, n) =>
                      editor.reorderExercisesInBlock(safeCIdx, safeWIdx, safeSIdx, bIdx, o, n)
                    }
                    onOpenExercisePickerForBlock={(bIdx) => {
                      setActiveBIdx(bIdx);
                      setDesktopRightTab('exercises');
                      setMobilePane('exercises');
                    }}
                  />
                </>
              ) : (
                <div className={`p-8 rounded-2xl border text-center space-y-3 ${panelBg}`}>
                  <p className="text-sm font-bold opacity-75">
                    Aucune séance dans cette semaine. Ajoutez une séance vierge ou depuis un modèle
                    PIA 7.1.1.
                  </p>
                  <div className="flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => editor.addSession(safeCIdx, safeWIdx)}
                      className="px-4 py-2 rounded-xl bg-action-500 text-military-950 font-black text-xs uppercase"
                    >
                      + Nouvelle séance
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowTemplatesModal(true)}
                      className="px-4 py-2 rounded-xl bg-military-900 text-action-400 font-black text-xs uppercase"
                    >
                      Choisir un modèle
                    </button>
                  </div>
                </div>
              )}
            </main>

            {/* COLONNE DROITE : Bibliothèque d'exercices + Analytique & PIA HUD */}
            <aside
              className={`lg:col-span-3 border-t lg:border-t-0 lg:border-l p-3 overflow-hidden flex flex-col ${panelBg} ${
                mobilePane === 'editor' ? 'hidden lg:flex' : 'flex flex-1'
              }`}
            >
              <div className="grid grid-cols-2 gap-1 bg-military-950/10 p-1 rounded-xl mb-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setDesktopRightTab('exercises');
                    setMobilePane('exercises');
                  }}
                  className={`py-1.5 rounded-lg text-[11px] font-black uppercase ${
                    desktopRightTab === 'exercises'
                      ? 'bg-military-900 text-action-400 shadow'
                      : 'opacity-70'
                  }`}
                >
                  Exercices ({exerciseLibrary.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDesktopRightTab('analytics');
                    setMobilePane('analytics');
                  }}
                  className={`py-1.5 rounded-lg text-[11px] font-black uppercase ${
                    desktopRightTab === 'analytics'
                      ? 'bg-military-900 text-action-400 shadow'
                      : 'opacity-70'
                  }`}
                >
                  Analyse & PIA
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {desktopRightTab === 'exercises' ? (
                  <ExercisePickerDrawer
                    exercises={exerciseLibrary}
                    infraEquipment={baseEquipment}
                    dark={dark}
                    onExerciseCreated={(item) => setExerciseLibrary((prev) => [item, ...prev])}
                    onSelect={(item) => {
                      if (!activeSession) return;
                      editor.addExerciseToBlock(safeCIdx, safeWIdx, safeSIdx, safeBIdx, item);
                      showToast(
                        `${item.name} ajouté dans « ${activeBlocks[safeBIdx]?.title || 'Bloc'} ».`,
                        'success'
                      );
                    }}
                  />
                ) : (
                  <AnalyticsHUD
                    structure={editor.structure}
                    activeSession={activeSession}
                    exerciseLibrary={exerciseLibrary}
                    targetJobProfiles={targetJobProfiles}
                    availableEquipment={baseEquipment}
                    dark={dark}
                    onQuickFixAlert={handleQuickFixAlert}
                    onSubstituteExercise={handleSubstituteExercise}
                  />
                )}
              </div>
            </aside>

            {/* BARRE BASSE MOBILE 1-MAIN */}
            <nav className="lg:hidden grid grid-cols-3 border-t border-military-800 bg-military-900 text-white shrink-0">
              {[
                { id: 'editor', label: 'Séance', icon: 'edit_note' },
                { id: 'exercises', label: '+ Exercice', icon: 'fitness_center' },
                { id: 'analytics', label: 'Analyse PIA', icon: 'insights' }
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setMobilePane(t.id as any);
                    if (t.id === 'exercises') setDesktopRightTab('exercises');
                    if (t.id === 'analytics') setDesktopRightTab('analytics');
                  }}
                  className={`py-2.5 flex flex-col items-center gap-0.5 text-[10px] font-black uppercase ${
                    mobilePane === t.id ? 'text-action-400 bg-military-800' : 'text-military-300'
                  }`}
                >
                  <span className="material-icons text-base">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </nav>
          </div>
        )}
      </div>

      {/* === MODALE MODÈLES PRÊTS À L'EMPLOI === */}
      {showTemplatesModal && (
        <div
          className="fixed inset-0 z-50 bg-military-950/80 backdrop-blur-sm flex items-center justify-center p-3"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white text-military-900 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="bg-military-900 text-white p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-action-400">
                  Modèles PIA 7.1.1 prêts à l'emploi
                </span>
                <h3 className="font-black text-base">Insérer une séance type dans S{activeWeek?.number || 1}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTemplatesModal(false)}
                className="w-8 h-8 rounded-xl bg-military-800 flex items-center justify-center"
              >
                <span className="material-icons text-base">close</span>
              </button>
            </div>
            <div className="p-4 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[...customTemplates, ...SESSION_TEMPLATES].map((tpl) => (
                <div
                  key={tpl.id}
                  className="p-3.5 rounded-2xl border border-gray-200 hover:border-action-500 flex flex-col justify-between gap-2"
                >
                  <div>
                    <div className="font-black text-xs text-military-900">{tpl.name}</div>
                    <p className="text-[11px] text-gray-600 mt-1">{tpl.session.objective}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tpl.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-[9px] font-bold"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const idx = editor.addSession(safeCIdx, safeWIdx, tpl.session);
                      setActiveSIdx(idx);
                      setShowTemplatesModal(false);
                      setViewMode('expert');
                      showToast(`Séance type « ${tpl.name} » insérée.`, 'success');
                    }}
                    className="w-full py-2 rounded-xl bg-military-900 text-action-400 font-black text-[11px] uppercase hover:bg-military-800"
                  >
                    Insérer cette séance
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* === MODALE GÉNÉRATION BROUILLON IA (HUMAN-IN-THE-LOOP) === */}
      {showAIBriefModal && (
        <div
          className="fixed inset-0 z-50 bg-military-950/80 backdrop-blur-sm flex items-center justify-center p-3"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleGenerateAIDraft}
            className="bg-white text-military-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
          >
            <div className="bg-military-900 text-white p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-purple-300">
                  Assistant IA Souverain — Brouillon soumis à validation moniteur
                </span>
                <h3 className="font-black text-base">Générer un brouillon depuis un brief</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAIBriefModal(false)}
                className="w-8 h-8 rounded-xl bg-military-800 flex items-center justify-center"
              >
                <span className="material-icons text-base">close</span>
              </button>
            </div>
            <div className="p-4 space-y-3 text-xs">
              <p className="text-gray-600">
                Décrivez votre besoin en français. Le résultat est systématiquement étiqueté{' '}
                <strong>BROUILLON IA</strong> et reste entièrement modifiable. Fonctionne aussi en
                mode dégradé sans IA.
              </p>
              <textarea
                required
                rows={4}
                value={aiBriefText}
                onChange={(e) => setAiBriefText(e.target.value)}
                placeholder="Ex: Programme 4 semaines PPG + préparation CCPM pour 20 mécaniciens avion, 3 séances/semaine, accès salle musculation et piste 400m..."
                className="w-full p-3 rounded-xl border border-gray-300 outline-none focus:border-action-500"
              />
              <div className="grid grid-cols-2 gap-3">
                <label className="font-bold">
                  Durée (semaines)
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={aiBriefWeeks}
                    onChange={(e) => setAiBriefWeeks(parseInt(e.target.value, 10) || 4)}
                    className="mt-1 w-full p-2 rounded-xl border border-gray-300 font-black"
                  />
                </label>
                <label className="font-bold">
                  Séances / semaine
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={aiBriefFreq}
                    onChange={(e) => setAiBriefFreq(parseInt(e.target.value, 10) || 3)}
                    className="mt-1 w-full p-2 rounded-xl border border-gray-300 font-black"
                  />
                </label>
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAIBriefModal(false)}
                className="px-4 py-2 rounded-xl border text-xs font-bold"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={generatingAI}
                className="px-5 py-2 rounded-xl bg-action-500 text-military-950 font-black text-xs uppercase shadow disabled:opacity-50"
              >
                {generatingAI ? 'Génération...' : 'Générer le brouillon'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* === MODALES AVANCÉES === */}
      <SoldierPreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        programTitle={title}
        structure={editor.structure}
        soldiers={baseSoldiers}
        exerciseLibrary={exerciseLibrary}
        initialSoldierId={previewInitialSoldier}
      />

      <MassAssignModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        programTitle={title}
        isExistingProgram={Boolean(existingProgram)}
        structure={editor.structure}
        soldiers={baseSoldiers}
        exerciseLibrary={exerciseLibrary}
        monitor={user}
        initialSelectedIds={assignedUserIds}
        initialUnit={assignedUnit}
        onConfirm={handleConfirmMassAssign}
        onPreviewSoldier={(nid) => {
          setPreviewInitialSoldier(nid);
          setShowAssignModal(false);
          setShowPreviewModal(true);
        }}
      />

      <FormulaSettingsModal
        isOpen={showFormulaModal}
        onClose={() => setShowFormulaModal(false)}
        user={user}
        onSaved={() => showToast('Formules scientifiques mises à jour.', 'success')}
      />

      <ImportReviewModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onApplyImport={(imp) => {
          setTitle(imp.title);
          setGoal(imp.goal);
          if (imp.isAIDraft) setIsDraftAI(true);
          editor.commit(imp.structure);
          setActiveCIdx(0);
          setActiveWIdx(0);
          setActiveSIdx(0);
          showToast(`Programme « ${imp.title} » importé dans l'éditeur.`, 'success');
        }}
      />
    </div>
  );
};

export default ProgramBuilderStudio;
