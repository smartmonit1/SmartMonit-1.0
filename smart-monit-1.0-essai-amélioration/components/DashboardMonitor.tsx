
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { UserProfile, Program, Infrastructure, Equipment, ProgramStatus, CollectiveSession, InfrastructureType, ActiveSession } from '../types';
import { db } from '../services/mockDatabase';
import { analyzeDailyForm } from '../utils/biometrics';
import { parseTrainingFile, parsePlanningFile, getRegulatoryInfo } from '../services/geminiService';
import { getDaysRemaining, getComplianceStatus, formatDateFr } from '../utils/compliance';
import ProgramBuilder from './ProgramBuilder';
import CalendarView from './CalendarView';

interface Props {
  user: UserProfile;
}

type TabView = 'home' | 'infras' | 'inventory' | 'programs' | 'agenda' | 'users';

const DashboardMonitor: React.FC<Props> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<TabView>('home');
  const [showBuilder, setShowBuilder] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  
  // Refresh trigger for CRUD operations
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const refresh = () => setRefreshTrigger(prev => prev + 1);

  const users = db.getUsers().filter(u => u.serviceId === user.serviceId);
  const infras = db.getInfrastructures().filter(i => i.serviceId === user.serviceId);
  const equipment = db.getEquipment().filter(e => infras.some(i => i.id === e.infrastructureId));
  const programs = db.getPrograms();

  // Inputs refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Modal States
  const [editingInfra, setEditingInfra] = useState<Infrastructure | null>(null);
  const [editingEquip, setEditingEquip] = useState<Equipment | null>(null);
  const [regInfo, setRegInfo] = useState<string | null>(null);
  const [loadingReg, setLoadingReg] = useState(false);

  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [showCompliancePopup, setShowCompliancePopup] = useState(true);

  useEffect(() => {
    const fetchSessions = () => setActiveSessions(db.getActiveSessions());
    fetchSessions();
    const interval = setInterval(fetchSessions, 2000); // Keep polling just in case
    
    const handleDbUpdate = () => {
      refresh();
      fetchSessions();
    };
    window.addEventListener('db_updated', handleDbUpdate);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('db_updated', handleDbUpdate);
    };
  }, []);

  // --- SORTING & FILTERING STATES ---
  const [infraSort, setInfraSort] = useState<'name' | 'visual' | 'regulatory'>('name');
  
  const [equipFilterCategory, setEquipFilterCategory] = useState<string>('all');
  const [equipFilterInfra, setEquipFilterInfra] = useState<string>('all');

  // --- USER SEARCH STATES ---
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  // --- DERIVED DATA ---

  const sortedInfras = useMemo(() => {
    return [...infras].sort((a, b) => {
        if (infraSort === 'name') return a.name.localeCompare(b.name);
        // Sort by urgency (lowest days remaining first)
        if (infraSort === 'visual') {
             return getDaysRemaining(a.lastVisualInspection, 90) - getDaysRemaining(b.lastVisualInspection, 90);
        }
        if (infraSort === 'regulatory') {
             return getDaysRemaining(a.lastRegulatoryInspection, 365) - getDaysRemaining(b.lastRegulatoryInspection, 365);
        }
        return 0;
    });
  }, [infras, infraSort]);

  const filteredEquipment = useMemo(() => {
    return equipment.filter(eq => {
        const matchCat = equipFilterCategory === 'all' || eq.category === equipFilterCategory;
        const matchInfra = equipFilterInfra === 'all' || eq.infrastructureId === equipFilterInfra;
        return matchCat && matchInfra;
    });
  }, [equipment, equipFilterCategory, equipFilterInfra]);


  // --- COMPLIANCE HELPERS ---

  const ComplianceBadge = ({ days }: { days: number }) => {
      const status = getComplianceStatus(days);
      if (status === 'EXPIRED') return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wide">Expiré ({Math.abs(days)}j)</span>;
      if (status === 'WARNING') return <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wide">J-{days}</span>;
      return <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wide">Valide</span>;
  };

  const handleGetRegInfo = async (name: string, type: string) => {
      setLoadingReg(true);
      setRegInfo(null);
      try {
          const info = await getRegulatoryInfo(name, type);
          setRegInfo(info);
      } catch { setRegInfo("Erreur récupération réglementation."); }
      finally { setLoadingReg(false); }
  };

  // --- CRUD HELPERS ---

  const saveInfra = (infra: Infrastructure) => {
      if (infras.find(i => i.id === infra.id)) {
          db.updateInfrastructure(infra);
      } else {
          db.setInfrastructures([...infras, infra]);
      }
      setEditingInfra(null);
      setRegInfo(null);
      refresh();
  };

  const deleteInfra = (id: string) => {
      if(window.confirm("Supprimer cette infrastructure ? Le matériel associé devra être réaffecté.")) {
        const filtered = infras.filter(i => i.id !== id);
        db.setInfrastructures(filtered);
        refresh();
      }
  };

  const saveEquip = (eq: Equipment) => {
      if (equipment.find(e => e.id === eq.id)) {
          db.updateEquipment(eq);
      } else {
          db.setEquipment([...equipment, eq]);
      }
      setEditingEquip(null);
      setRegInfo(null);
      refresh();
  };

  const deleteEquip = (id: string) => {
      if(window.confirm("Supprimer cet équipement de l'inventaire ?")) {
          const filtered = equipment.filter(e => e.id !== id);
          db.setEquipment(filtered);
          refresh();
      }
  };

  // --- ACTIONS ---

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
        const reader = new FileReader();
        reader.onload = async () => {
            const base64 = (reader.result as string).split(',')[1];
            await parseTrainingFile(base64, file.type);
            alert("Analyse terminée. Données intégrées.");
        };
        reader.readAsDataURL(file);
    } catch { alert("Erreur import"); } 
    finally { setIsImporting(false); }
  };

  const handleCreateProgram = (baseProgram?: Program) => {
      setSelectedProgram(baseProgram || null);
      setShowBuilder(true);
  };

  // --- NOTIFICATIONS ---
  const notifications = useMemo(() => {
    const alerts: any[] = [];
    const today = new Date().toISOString().split('T')[0];
    users.forEach(u => {
        const daily = u.dailyForms.find(d => d.date === today);
        if (daily && typeof analyzeDailyForm(daily) === 'string') { 
            alerts.push({ type: 'health', user: u, msg: 'État critique', date: today });
        }
    });
    // Compliance Alerts
    infras.forEach(i => {
        const dReg = getDaysRemaining(i.lastRegulatoryInspection, 365);
        if (getComplianceStatus(dReg) !== 'VALID') alerts.push({ type: 'compliance', msg: `Contrôle Réglementaire Infra: ${i.name}`, priority: dReg < 0 ? 'high' : 'med' });
        
        const dVis = getDaysRemaining(i.lastVisualInspection, 90);
        if (getComplianceStatus(dVis) !== 'VALID') alerts.push({ type: 'compliance', msg: `Contrôle Visuel Infra: ${i.name}`, priority: dVis < 0 ? 'high' : 'med' });
    });
    equipment.forEach(e => {
        const dReg = getDaysRemaining(e.lastRegulatoryInspection, 365);
        if (getComplianceStatus(dReg) !== 'VALID') alerts.push({ type: 'compliance', msg: `Contrôle Réglementaire Matériel: ${e.name}`, priority: dReg < 0 ? 'high' : 'med' });
        
        const dVis = getDaysRemaining(e.lastVisualInspection, 90);
        if (getComplianceStatus(dVis) !== 'VALID') alerts.push({ type: 'compliance', msg: `Contrôle Visuel Matériel: ${e.name}`, priority: dVis < 0 ? 'high' : 'med' });
    });

    return alerts;
  }, [users, infras, equipment, refreshTrigger]);

  if (showBuilder) {
      return <ProgramBuilder onClose={() => setShowBuilder(false)} existingProgram={selectedProgram || undefined} user={user} />;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] bg-gray-50/50">
        {/* TOP NAV SCROLLABLE FOR MOBILE */}
        <div className="overflow-x-auto pt-4 pb-4 shrink-0 no-scrollbar">
            <div className="flex gap-2 px-1 min-w-max">
                {[
                    {id: 'home', label: 'Vue Globale', icon: 'dashboard'},
                    {id: 'users', label: 'Utilisateurs', icon: 'people'},
                    {id: 'programs', label: 'Programmes', icon: 'model_training'},
                    {id: 'infras', label: 'Infrastructures', icon: 'stadium'},
                    {id: 'inventory', label: 'Matériel', icon: 'swap_horiz'},
                    {id: 'agenda', label: 'Planning', icon: 'calendar_today'},
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as TabView)}
                        className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg transition-all font-bold text-xs uppercase tracking-wide ${
                            activeTab === tab.id 
                            ? 'bg-[#27322A] text-white' 
                            : 'bg-white text-slate-500 hover:bg-gray-50'
                        }`}
                    >
                        {tab.icon && (
                            <span className={`material-icons text-[16px] ${'rotateIcon' in tab && tab.rotateIcon ? 'transform -rotate-45' : ''}`}>
                                {tab.icon}
                            </span>
                        )}
                        {tab.label}
                    </button>
                ))}
            </div>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-grow overflow-y-auto custom-scrollbar pb-24">
            
            {/* --- HOME VIEW --- */}
            {activeTab === 'home' && (
                <div className="space-y-6 animate-[fadeIn_0.3s]">
                    {/* KPI CARDS */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                            <div className="text-gray-400 text-[10px] font-black uppercase">Effectif</div>
                            <div className="text-2xl font-black text-military-900">{users.filter(u => u.role === 'USER').length}</div>
                        </div>
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                            <div className="text-gray-400 text-[10px] font-black uppercase">En Salle</div>
                            <div className="text-2xl font-black text-action-600 animate-pulse">{activeSessions.length}</div>
                        </div>
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                            <div className="text-gray-400 text-[10px] font-black uppercase">Alertes</div>
                            <div className="text-2xl font-black text-red-500">{notifications.length}</div>
                        </div>
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                            <div className="text-gray-400 text-[10px] font-black uppercase">Matériel HS</div>
                            <div className="text-2xl font-black text-orange-500">{equipment.filter(e => e.status !== 'Operational').length}</div>
                        </div>
                    </div>

                    {/* ALERTS SECTION */}
                    {notifications.length > 0 && (
                        <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
                            <h3 className="font-bold text-red-800 mb-2 flex items-center gap-2 text-sm uppercase">
                                <span className="material-icons text-base">notifications_active</span> Actions Requises
                            </h3>
                            <div className="space-y-2">
                                {notifications.map((n, i) => (
                                    <div key={i} className="bg-white p-3 rounded-xl flex justify-between items-center shadow-sm">
                                        <div>
                                            <span className="font-bold text-gray-800 text-sm">{n.msg}</span>
                                        </div>
                                        {n.type === 'compliance' ? (
                                            <span className="bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase">Contrôle</span>
                                        ) : n.type === 'program' ? (
                                            <button onClick={() => {setActiveTab('programs');}} className="bg-military-900 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase">Voir</button>
                                        ) : (
                                            <button className="bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase">Contacter</button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* LIVE MONITORING */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-black text-military-900 uppercase flex items-center gap-2">
                                <span className="material-icons text-red-500 animate-pulse">fiber_manual_record</span>
                                Monitoring Live
                            </h3>
                            <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-xs font-bold">
                                {activeSessions.length} actifs
                            </span>
                        </div>
                        
                        {activeSessions.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 text-sm">
                                Aucune séance en cours.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {activeSessions.map(session => (
                                    <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => alert(`Détails de la séance de ${session.userName}:\n${session.details}\nDébut: ${new Date(session.startTime).toLocaleTimeString()}`)}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-military-100 rounded-full flex items-center justify-center text-military-700 font-black">
                                                {session.userName.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-military-900 text-sm">{session.userName}</div>
                                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                                    <span className="material-icons text-[10px]">location_on</span>
                                                    {session.infrastructureName}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] font-black uppercase text-action-600 bg-action-50 px-2 py-1 rounded mb-1 inline-block">
                                                {session.sessionType}
                                            </div>
                                            <div className="text-xs text-gray-400 font-mono">
                                                {new Date(session.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* QUICK ACTIONS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button onClick={() => fileInputRef.current?.click()} className="bg-military-800 text-white p-6 rounded-3xl shadow-lg flex items-center justify-between group active:scale-95 transition-transform">
                            <div className="text-left">
                                <h3 className="font-black text-lg uppercase">Import IA</h3>
                                <p className="text-military-300 text-xs">Scanner programme ou document</p>
                            </div>
                            <span className="material-icons text-4xl text-action-500 group-hover:rotate-12 transition-transform">cloud_upload</span>
                        </button>
                        <input type="file" ref={fileInputRef} hidden onChange={handleFileUpload} accept="image/*,.pdf" />

                        <button onClick={() => handleCreateProgram()} className="bg-action-500 text-white p-6 rounded-3xl shadow-lg flex items-center justify-between group active:scale-95 transition-transform">
                             <div className="text-left">
                                <h3 className="font-black text-lg uppercase">Nouveau Programme</h3>
                                <p className="text-white/80 text-xs">Créer un cycle personnalisé</p>
                            </div>
                            <span className="material-icons text-4xl text-white group-hover:rotate-12 transition-transform">add_circle</span>
                        </button>
                    </div>
                </div>
            )}

            {/* --- PROGRAMS MANAGEMENT --- */}
            {activeTab === 'programs' && (
                <div className="space-y-4 animate-[fadeIn_0.3s]">
                     <div className="flex justify-between items-center">
                        <h3 className="text-xl font-black text-military-900 uppercase">Programmes</h3>
                        <button onClick={() => handleCreateProgram()} className="bg-action-500 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg active:scale-95">
                            <span className="material-icons">add</span>
                        </button>
                     </div>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {programs.map(p => {
                             const u = users.find(user => user.nid === p.userId);
                             return (
                                 <div key={p.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative group">
                                     <div className="absolute top-4 right-4">
                                         {p.status === ProgramStatus.PENDING && <span className="bg-yellow-100 text-yellow-700 text-[9px] font-black px-2 py-1 rounded uppercase">En attente</span>}
                                         {p.status === ProgramStatus.VALIDATED && <span className="bg-green-100 text-green-700 text-[9px] font-black px-2 py-1 rounded uppercase">Actif</span>}
                                     </div>
                                     <h4 className="font-bold text-military-900 mb-1">{p.title}</h4>
                                     <p className="text-xs text-gray-500 mb-3">{u?.name} • {p.durationWeeks} semaines</p>
                                     <div className="flex gap-2 mt-4">
                                         <button onClick={() => handleCreateProgram(p)} className="flex-1 bg-military-50 text-military-800 py-2 rounded-xl text-xs font-bold hover:bg-military-900 hover:text-white transition-colors">
                                             {p.status === ProgramStatus.PENDING ? 'Traiter la demande' : 'Modifier / Suivre'}
                                         </button>
                                     </div>
                                 </div>
                             );
                        })}
                     </div>
                </div>
            )}

            {/* --- INFRASTRUCTURES --- */}
            {activeTab === 'infras' && (
                <div className="space-y-4 animate-[fadeIn_0.3s]">
                    <div className="flex flex-wrap justify-between items-center px-2 gap-2">
                        <h3 className="text-xl font-black text-military-900 uppercase">Infrastructures</h3>
                        
                        {/* Tri Buttons */}
                        <div className="flex gap-1 bg-gray-200 p-1 rounded-lg">
                            <button onClick={() => setInfraSort('name')} className={`px-3 py-1 text-[10px] font-bold uppercase rounded ${infraSort === 'name' ? 'bg-white shadow text-military-900' : 'text-gray-500'}`}>Nom</button>
                            <button onClick={() => setInfraSort('visual')} className={`px-3 py-1 text-[10px] font-bold uppercase rounded ${infraSort === 'visual' ? 'bg-white shadow text-military-900' : 'text-gray-500'}`}>Visuel</button>
                            <button onClick={() => setInfraSort('regulatory')} className={`px-3 py-1 text-[10px] font-bold uppercase rounded ${infraSort === 'regulatory' ? 'bg-white shadow text-military-900' : 'text-gray-500'}`}>Réglementaire</button>
                        </div>

                        <button onClick={() => setEditingInfra({id: Date.now().toString(), name: '', type: InfrastructureType.GYM_MIXED, serviceId: user.serviceId || 's1'})} className="bg-military-900 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase shadow-lg">
                            + Ajouter
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {sortedInfras.map(infra => (
                            <div key={infra.id} onClick={() => setEditingInfra(infra)} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm cursor-pointer active:scale-[0.98] transition-transform">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h4 className="font-bold text-lg text-military-900">{infra.name}</h4>
                                        <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded uppercase font-bold">{infra.type}</span>
                                    </div>
                                    <span className="material-icons text-gray-300">edit</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <div className={`p-2 rounded-lg ${infraSort === 'visual' ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'}`}>
                                        <span className="text-[9px] text-gray-400 font-bold uppercase block">Visuel (3 mois)</span>
                                        <ComplianceBadge days={getDaysRemaining(infra.lastVisualInspection, 90)} />
                                        <span className="text-[9px] ml-1 text-gray-500">{formatDateFr(infra.lastVisualInspection)}</span>
                                    </div>
                                    <div className={`p-2 rounded-lg ${infraSort === 'regulatory' ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'}`}>
                                        <span className="text-[9px] text-gray-400 font-bold uppercase block">Réglementaire (1 an)</span>
                                        <ComplianceBadge days={getDaysRemaining(infra.lastRegulatoryInspection, 365)} />
                                        <span className="text-[9px] ml-1 text-gray-500">{formatDateFr(infra.lastRegulatoryInspection)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- INVENTORY --- */}
            {activeTab === 'inventory' && (
                <div className="space-y-4 animate-[fadeIn_0.3s]">
                     <div className="flex justify-between items-center px-2">
                        <h3 className="text-xl font-black text-military-900 uppercase">Matériel</h3>
                        <button onClick={() => setEditingEquip({id: Date.now().toString(), name: '', category: 'Musculation', status: 'Operational', infrastructureId: infras[0]?.id || ''})} className="bg-action-500 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase shadow-lg">
                            + Ajouter
                        </button>
                    </div>

                    {/* Filter Bar */}
                    <div className="flex gap-2 px-2 overflow-x-auto pb-2 no-scrollbar">
                        <select 
                            className="bg-white border border-gray-200 text-xs font-bold text-gray-600 rounded-lg px-3 py-2 outline-none focus:border-action-500"
                            value={equipFilterCategory}
                            onChange={(e) => setEquipFilterCategory(e.target.value)}
                        >
                            <option value="all">Toutes Catégories</option>
                            <option value="Musculation">Musculation</option>
                            <option value="Cardio">Cardio</option>
                            <option value="Petit matériel">Petit matériel</option>
                        </select>

                        <select 
                            className="bg-white border border-gray-200 text-xs font-bold text-gray-600 rounded-lg px-3 py-2 outline-none focus:border-action-500 max-w-[200px]"
                            value={equipFilterInfra}
                            onChange={(e) => setEquipFilterInfra(e.target.value)}
                        >
                            <option value="all">Tout Lieu</option>
                            {infras.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                        </select>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                        {filteredEquipment.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-sm italic">Aucun équipement ne correspond aux filtres.</div>
                        ) : (
                            filteredEquipment.map((eq, i) => (
                                <div key={eq.id} onClick={() => setEditingEquip(eq)} className={`p-4 flex flex-col md:flex-row md:justify-between md:items-center cursor-pointer hover:bg-gray-50 ${i !== filteredEquipment.length-1 ? 'border-b border-gray-50' : ''}`}>
                                    <div className="mb-2 md:mb-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-sm text-military-900">{eq.name}</p>
                                            <span className="text-[8px] uppercase font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{eq.category}</span>
                                        </div>
                                        <p className="text-xs text-gray-400">{infras.find(i => i.id === eq.infrastructureId)?.name || 'Non affecté'}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex gap-2">
                                            <ComplianceBadge days={getDaysRemaining(eq.lastVisualInspection, 90)} />
                                            <ComplianceBadge days={getDaysRemaining(eq.lastRegulatoryInspection, 365)} />
                                        </div>
                                        <span className={`w-2 h-2 rounded-full ${eq.status === 'Operational' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                        <span className="material-icons text-gray-300 text-sm">chevron_right</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* --- USERS --- */}
            {activeTab === 'users' && (
                <div className="space-y-4 animate-[fadeIn_0.3s]">
                    <div className="flex justify-between items-center px-2">
                        <h3 className="text-xl font-black text-military-900 uppercase">Utilisateurs</h3>
                    </div>

                    <div className="px-2">
                        <div className="relative">
                            <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                            <input 
                                type="text" 
                                placeholder="Rechercher par NID ou Nom..." 
                                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl font-bold text-sm focus:ring-2 focus:ring-action-500 outline-none"
                                value={userSearchTerm}
                                onChange={(e) => setUserSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-2">
                        {users
                            .filter(u => u.role === 'USER' && (u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) || u.nid.includes(userSearchTerm)))
                            .map(u => (
                                <div key={u.nid} onClick={() => setSelectedUser(u)} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors flex items-center gap-4">
                                    <div className="w-12 h-12 bg-military-100 rounded-full flex items-center justify-center text-military-700 font-black text-lg">
                                        {u.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-military-900">{u.name}</h4>
                                        <p className="text-xs text-gray-500 font-mono">NID: {u.nid}</p>
                                        <p className="text-[10px] text-gray-400 uppercase mt-1">{u.jobType}</p>
                                    </div>
                                </div>
                            ))
                        }
                    </div>
                </div>
            )}

            {/* --- AGENDA / PLANNING --- */}
            {activeTab === 'agenda' && (
                <div className="h-full flex flex-col">
                     <CalendarView user={user} />
                </div>
            )}
        </div>

        {/* --- MODALS FOR EDITING (Mobile Friendly) --- */}
        
        {/* INFRA MODAL */}
        {editingInfra && (
            <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-[zoomIn_0.2s] max-h-[90vh] overflow-y-auto">
                    <h3 className="text-xl font-black text-military-900 mb-6 uppercase">
                        {infras.find(i => i.id === editingInfra.id) ? 'Conformité' : 'Nouvelle'} Infrastructure
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase">Nom</label>
                            <input className="w-full p-3 bg-gray-50 rounded-xl font-bold border-none focus:ring-2 focus:ring-military-900" 
                                value={editingInfra.name} onChange={e => setEditingInfra({...editingInfra, name: e.target.value})} />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase">Type</label>
                            <select className="w-full p-3 bg-gray-50 rounded-xl font-bold border-none"
                                value={editingInfra.type} onChange={e => setEditingInfra({...editingInfra, type: e.target.value as any})}>
                                {Object.values(InfrastructureType).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                             <h4 className="text-xs font-black text-blue-800 uppercase mb-3 flex items-center gap-2">
                                <span className="material-icons text-sm">verified_user</span> Contrôles
                             </h4>
                             <div className="space-y-3">
                                 <div>
                                     <label className="text-[10px] font-bold text-blue-600 uppercase">Dernier contrôle Visuel</label>
                                     <input type="date" className="w-full p-2 bg-white rounded-lg font-bold text-sm" 
                                        value={editingInfra.lastVisualInspection || ''} 
                                        onChange={e => setEditingInfra({...editingInfra, lastVisualInspection: e.target.value})} />
                                 </div>
                                 <div>
                                     <label className="text-[10px] font-bold text-blue-600 uppercase">Dernier contrôle Réglementaire</label>
                                     <input type="date" className="w-full p-2 bg-white rounded-lg font-bold text-sm" 
                                        value={editingInfra.lastRegulatoryInspection || ''} 
                                        onChange={e => setEditingInfra({...editingInfra, lastRegulatoryInspection: e.target.value})} />
                                 </div>
                             </div>
                        </div>

                         {/* AI Regulation Helper */}
                         <div className="pt-2">
                            <button 
                                onClick={() => handleGetRegInfo(editingInfra.name, editingInfra.type)} 
                                className="text-[10px] font-bold text-action-600 uppercase flex items-center gap-1 hover:underline"
                            >
                                <span className="material-icons text-sm">psychology</span>
                                Demander réglementation IA
                            </button>
                            {loadingReg && <div className="text-xs text-gray-400 animate-pulse mt-1">Recherche normes en cours...</div>}
                            {regInfo && <div className="mt-2 p-3 bg-action-50 text-xs text-military-800 rounded-xl leading-relaxed">{regInfo}</div>}
                        </div>
                    </div>

                    <div className="flex gap-3 mt-8">
                         {infras.find(i => i.id === editingInfra.id) && (
                             <button onClick={() => {deleteInfra(editingInfra.id); setEditingInfra(null);}} className="p-4 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                                 <span className="material-icons">delete</span>
                             </button>
                         )}
                         <button onClick={() => setEditingInfra(null)} className="flex-1 py-4 font-bold text-gray-400">Annuler</button>
                         <button onClick={() => saveInfra(editingInfra)} className="flex-[2] bg-military-900 text-white font-bold rounded-xl shadow-lg">Valider</button>
                    </div>
                </div>
            </div>
        )}

        {/* EQUIPMENT MODAL */}
        {editingEquip && (
            <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-[zoomIn_0.2s] max-h-[90vh] overflow-y-auto">
                    <h3 className="text-xl font-black text-military-900 mb-6 uppercase">
                        {equipment.find(e => e.id === editingEquip.id) ? 'Conformité' : 'Nouvel'} Équipement
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase">Nom</label>
                            <input className="w-full p-3 bg-gray-50 rounded-xl font-bold border-none focus:ring-2 focus:ring-action-500" 
                                value={editingEquip.name} onChange={e => setEditingEquip({...editingEquip, name: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase">Catégorie</label>
                                <select className="w-full p-3 bg-gray-50 rounded-xl font-bold border-none"
                                    value={editingEquip.category} onChange={e => setEditingEquip({...editingEquip, category: e.target.value as any})}>
                                    <option value="Musculation">Musculation</option>
                                    <option value="Cardio">Cardio</option>
                                    <option value="Petit matériel">Petit matériel</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase">Lieu</label>
                                <select className="w-full p-3 bg-gray-50 rounded-xl font-bold border-none focus:ring-2 focus:ring-action-500"
                                    value={editingEquip.infrastructureId} onChange={e => setEditingEquip({...editingEquip, infrastructureId: e.target.value})}>
                                    {infras.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                </select>
                            </div>
                        </div>
                        
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                             <h4 className="text-xs font-black text-blue-800 uppercase mb-3 flex items-center gap-2">
                                <span className="material-icons text-sm">fact_check</span> Vérifications
                             </h4>
                             <div className="space-y-3">
                                 <div>
                                     <label className="text-[10px] font-bold text-blue-600 uppercase">Dernier contrôle Visuel (3 mois)</label>
                                     <input type="date" className="w-full p-2 bg-white rounded-lg font-bold text-sm" 
                                        value={editingEquip.lastVisualInspection || ''} 
                                        onChange={e => setEditingEquip({...editingEquip, lastVisualInspection: e.target.value})} />
                                 </div>
                                 <div>
                                     <label className="text-[10px] font-bold text-blue-600 uppercase">Dernier contrôle Organisme (1 an)</label>
                                     <input type="date" className="w-full p-2 bg-white rounded-lg font-bold text-sm" 
                                        value={editingEquip.lastRegulatoryInspection || ''} 
                                        onChange={e => setEditingEquip({...editingEquip, lastRegulatoryInspection: e.target.value})} />
                                 </div>
                             </div>
                        </div>

                         {/* AI Regulation Helper */}
                         <div className="pt-2">
                            <button 
                                onClick={() => handleGetRegInfo(editingEquip.name, editingEquip.category)} 
                                className="text-[10px] font-bold text-action-600 uppercase flex items-center gap-1 hover:underline"
                            >
                                <span className="material-icons text-sm">psychology</span>
                                Demander réglementation IA
                            </button>
                            {loadingReg && <div className="text-xs text-gray-400 animate-pulse mt-1">Recherche normes en cours...</div>}
                            {regInfo && <div className="mt-2 p-3 bg-action-50 text-xs text-military-800 rounded-xl leading-relaxed">{regInfo}</div>}
                        </div>
                    </div>

                    <div className="flex gap-3 mt-8">
                         {equipment.find(e => e.id === editingEquip.id) && (
                             <button onClick={() => {deleteEquip(editingEquip.id); setEditingEquip(null);}} className="p-4 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                                 <span className="material-icons">delete</span>
                             </button>
                         )}
                         <button onClick={() => setEditingEquip(null)} className="flex-1 py-4 font-bold text-gray-400">Annuler</button>
                         <button onClick={() => saveEquip(editingEquip)} className="flex-[2] bg-action-500 text-white font-bold rounded-xl shadow-lg">Valider</button>
                    </div>
                </div>
            </div>
        )}
        {/* USER DETAILS MODAL */}
        {selectedUser && (
            <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white w-full max-w-2xl rounded-3xl p-6 shadow-2xl animate-[zoomIn_0.2s] max-h-[90vh] overflow-y-auto custom-scrollbar">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-military-900 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-inner">
                                {selectedUser.name.charAt(0)}
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-military-900 uppercase leading-none">{selectedUser.name}</h3>
                                <p className="text-military-500 font-mono text-sm mt-1">NID: {selectedUser.nid}</p>
                            </div>
                        </div>
                        <button onClick={() => setSelectedUser(null)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                            <span className="material-icons text-gray-600">close</span>
                        </button>
                    </div>

                    <div className="space-y-6">
                        {/* Infos Pro */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">Profil Métier</span>
                                <span className="font-bold text-military-900">{selectedUser.jobType}</span>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">Horaires</span>
                                <span className="font-bold text-military-900">{selectedUser.workSchedule}</span>
                            </div>
                        </div>

                        {/* Performances */}
                        <div>
                            <h4 className="text-xs font-black text-military-400 uppercase mb-3 tracking-widest border-b pb-2">Performances & Tests</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-center">
                                    <span className="text-[10px] font-black text-blue-600 uppercase block mb-1">VMA</span>
                                    <span className="font-black text-xl text-blue-900">{selectedUser.tests.calculatedVMA || '-'} <span className="text-xs">km/h</span></span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                                    <span className="text-[10px] font-black text-gray-500 uppercase block mb-1">Pompes</span>
                                    <span className="font-black text-xl text-military-900">{selectedUser.tests.pushups || '-'}</span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                                    <span className="text-[10px] font-black text-gray-500 uppercase block mb-1">Tractions</span>
                                    <span className="font-black text-xl text-military-900">{selectedUser.tests.pullups || '-'}</span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                                    <span className="text-[10px] font-black text-gray-500 uppercase block mb-1">Luc Léger</span>
                                    <span className="font-black text-xl text-military-900">{selectedUser.tests.lucLegerPalier || '-'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Bilan Forme (Dernier) */}
                        <div>
                            <h4 className="text-xs font-black text-military-400 uppercase mb-3 tracking-widest border-b pb-2">Dernier Bilan Forme</h4>
                            {selectedUser.dailyForms.length > 0 ? (
                                (() => {
                                    const lastForm = selectedUser.dailyForms[selectedUser.dailyForms.length - 1];
                                    const analysis = analyzeDailyForm(lastForm);
                                    const isAlert = typeof analysis === 'string';
                                    return (
                                        <div className={`p-4 rounded-2xl border ${isAlert ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="text-xs font-bold text-gray-500">{formatDateFr(lastForm.date)}</span>
                                                {isAlert && <span className="bg-red-100 text-red-700 text-[10px] font-black px-2 py-1 rounded uppercase">Alerte</span>}
                                            </div>
                                            <div className="grid grid-cols-4 gap-2 mb-3">
                                                <div className="text-center"><div className="text-[10px] text-gray-500 uppercase">Sommeil</div><div className="font-bold">{lastForm.sleepQuality}/10</div></div>
                                                <div className="text-center"><div className="text-[10px] text-gray-500 uppercase">Fatigue</div><div className="font-bold">{lastForm.fatigueLevel}/10</div></div>
                                                <div className="text-center"><div className="text-[10px] text-gray-500 uppercase">Stress</div><div className="font-bold">{lastForm.stressLevel}/10</div></div>
                                                <div className="text-center"><div className="text-[10px] text-gray-500 uppercase">Douleur</div><div className="font-bold">{lastForm.painLevel}/10</div></div>
                                            </div>
                                            {lastForm.painZone && <div className="text-xs text-red-600 font-bold mt-2">Zone douloureuse: {lastForm.painZone}</div>}
                                            {isAlert && <div className="mt-3 text-xs text-red-700 font-medium bg-white/50 p-2 rounded">{analysis}</div>}
                                        </div>
                                    );
                                })()
                            ) : (
                                <p className="text-sm text-gray-400 italic">Aucun bilan renseigné.</p>
                            )}
                        </div>

                        {/* Programmes */}
                        <div>
                            <h4 className="text-xs font-black text-military-400 uppercase mb-3 tracking-widest border-b pb-2">Programmes</h4>
                            <div className="space-y-3">
                                {programs.filter(p => p.userId === selectedUser.nid).length > 0 ? (
                                    programs.filter(p => p.userId === selectedUser.nid).map(p => (
                                        <div key={p.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-between items-center">
                                            <div>
                                                <div className="font-bold text-military-900">{p.title}</div>
                                                <div className="text-xs text-gray-500">{p.durationWeeks} semaines • {p.sessionsPerWeek} séa/sem</div>
                                            </div>
                                            <span className={`text-[10px] font-black px-2 py-1 rounded uppercase ${
                                                p.status === ProgramStatus.VALIDATED ? 'bg-green-100 text-green-700' :
                                                p.status === ProgramStatus.PENDING ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-gray-200 text-gray-600'
                                            }`}>
                                                {p.status}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-gray-400 italic">Aucun programme.</p>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        )}

        {/* COMPLIANCE POPUP */}
        {showCompliancePopup && notifications.filter(n => n.type === 'compliance').length > 0 && (
            <div className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-50 bg-white rounded-2xl shadow-2xl border-l-4 border-red-500 p-5 max-w-sm animate-[fadeIn_0.3s]">
                <div className="flex justify-between items-start mb-2">
                    <h4 className="font-black text-red-600 uppercase tracking-tight flex items-center gap-2">
                        <span className="material-icons text-xl animate-pulse">warning</span>
                        Alertes Contrôles
                    </h4>
                    <button onClick={() => setShowCompliancePopup(false)} className="text-gray-400 hover:text-gray-600 bg-gray-50 rounded-full p-1">
                        <span className="material-icons text-sm">close</span>
                    </button>
                </div>
                <p className="text-sm font-medium text-gray-600 mb-4">
                    <strong className="text-red-500">{notifications.filter(n => n.type === 'compliance').length}</strong> équipement(s) ou infrastructure(s) nécessitent une inspection visuelle ou réglementaire urgente.
                </p>
                <div className="flex gap-2">
                    <button 
                        onClick={() => {
                            setShowCompliancePopup(false);
                            setActiveTab('home');
                        }}
                        className="flex-1 bg-red-50 text-red-700 py-2 rounded-xl text-xs font-black uppercase hover:bg-red-100 transition-colors"
                    >
                        Voir les alertes
                    </button>
                </div>
            </div>
        )}

    </div>
  );
};

export default DashboardMonitor;
