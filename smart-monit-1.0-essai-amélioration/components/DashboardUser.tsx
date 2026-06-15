
import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, DailyForm, Program, Infrastructure, ProgramStatus, CollectiveSession, Session } from '../types';
import DailyCheckIn from './DailyCheckIn';
import { generateFlashSession, suggestSessionModifications } from '../services/geminiService';
import { calculateVMA, analyzeDailyForm, adaptPrescription } from '../utils/biometrics';
import { db } from '../services/mockDatabase';

interface DashboardUserProps {
  user: UserProfile;
  onUpdateUser: (u: UserProfile) => void;
  onOpenLibrary: () => void;
  onOpenProgram: (programId: string) => void;
  onStartSession: (session: Session) => void;
}

const PROGRAM_OBJECTIVES = [
  "Remise en forme",
  "Renforcement Musculaire",
  "Amélioration Cardio (VMA)",
  "Préparation CCPM",
  "Perte de poids",
  "Préparation Stage Commando",
  "Réathlétisation",
  "Autre"
];

const DashboardUser: React.FC<DashboardUserProps> = ({ user, onUpdateUser, onOpenLibrary, onOpenProgram, onStartSession }) => {
  const todayDate = new Date();
  const todayStr = todayDate.toISOString().split('T')[0];
  const dayOfWeek = todayDate.getDay(); 

  const hasDaily = user.dailyForms.find(d => d.date === todayStr);
  const [showDaily, setShowDaily] = useState(!hasDaily);
  const [generating, setGenerating] = useState(false);
  
  // Flash Session State
  const [flashMode, setFlashMode] = useState<'generate' | 'search' | 'free'>('generate');
  const [flashSession, setFlashSession] = useState<any>(null);
  const [flashLocation, setFlashLocation] = useState('Chez moi');
  const [flashType, setFlashType] = useState('Musculation');
  const [flashDuration, setFlashDuration] = useState(40);
  const [filteredSessions, setFilteredSessions] = useState<any[]>([]);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [selectedSessionToModify, setSelectedSessionToModify] = useState<any>(null);
  const [modifiedSession, setModifiedSession] = useState<any>(null);

  // Player State
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  // Data Sync State (Fetched directly from DB to ensure sync with Monitor updates)
  const [infras, setInfras] = useState<Infrastructure[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [allCollectiveSessions, setAllCollectiveSessions] = useState<CollectiveSession[]>([]);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch data on mount and on db update
  useEffect(() => {
    const fetchDB = () => {
      setInfras(db.getInfrastructures().filter(i => i.serviceId === user.serviceId));
      setRoutes(db.getRoutes().filter(r => r.serviceId === user.serviceId));
      setAllCollectiveSessions(db.getCollectiveSessions().filter(c => c.serviceId === user.serviceId));
      // Force a full component re-render so useMemo hooks pick up new programs/users
      setRefreshTrigger(prev => prev + 1);
    };
    fetchDB();
    
    window.addEventListener('db_updated', fetchDB);
    return () => window.removeEventListener('db_updated', fetchDB);
  }, [user.serviceId]);

  const [selectedCollSession, setSelectedCollSession] = useState<CollectiveSession | null>(null);

  // Program Request State
  const [reqProgram, setReqProgram] = useState(false);
  const [goal, setGoal] = useState('');
  const [selectedObjective, setSelectedObjective] = useState('');
  const [weeks, setWeeks] = useState(8);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);
  const [selectedLocations, setSelectedLocations] = useState<string[]>(['BA927']);

  const collectiveSessionsToday = allCollectiveSessions.filter(cs => cs.dayOfWeek === dayOfWeek);

  const activeProgram = db.getPrograms().find(p => p.userId === user.nid && p.status === ProgramStatus.VALIDATED);
  const pendingProgram = db.getPrograms().find(p => p.userId === user.nid && p.status === ProgramStatus.PENDING);

  const nextProgramSession = useMemo(() => {
    if (!activeProgram) return null;
    return activeProgram.sessions.find(s => !s.isCompleted);
  }, [activeProgram]);

  const dailyAnalysis = hasDaily ? analyzeDailyForm(hasDaily) : null;
  const isCriticalAlert = typeof dailyAnalysis === 'string';

  const handleDailySubmit = (form: DailyForm) => {
    const updatedUser = { ...user, dailyForms: [...user.dailyForms, form] };
    onUpdateUser(updatedUser);
    setShowDaily(false);
  };

  const handleToggleJoin = (sessionId: string) => {
    const updated = db.toggleSessionJoin(sessionId, user.nid);
    if (updated) {
      setAllCollectiveSessions(db.getCollectiveSessions());
    }
  };

  const handleSearchSessions = () => {
    if (!hasDaily) { setShowDaily(true); return; }
    const globals = db.getGlobalSessions();
    const filtered = globals.filter(s => {
      const matchLoc = s.locationName === flashLocation || s.infrastructureId === 'any' || (flashLocation === 'Chez moi' && !s.locationName);
      const matchType = s.workoutType === flashType || s.type === flashType || (flashType === 'Crosstraining' && ['AMRAP', 'EMOM', 'TABATA'].includes(s.type));
      const matchDuration = s.durationMinutes <= flashDuration;
      return matchLoc && matchType && matchDuration;
    });
    setFilteredSessions(filtered);
    setSearchAttempted(true);
  };

  const handleSelectSessionToModify = async (session: any) => {
    if (!hasDaily) return;
    setGenerating(true);
    setSelectedSessionToModify(session);
    try {
      const modifiedContent = await suggestSessionModifications(session, user, hasDaily);
      setModifiedSession({
        title: modifiedContent.title || session.title,
        description: modifiedContent.description || session.description,
        durationMinutes: session.durationMinutes,
        locationName: session.locationName,
        content: {
            warmup: modifiedContent.warmup || session.content?.warmup,
            mainBlock: modifiedContent.mainBlock || session.content?.mainBlock,
            cooldown: modifiedContent.cooldown || session.content?.cooldown,
            advice: modifiedContent.advice || session.content?.advice
        }
      });
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'adaptation de la séance.");
    } finally {
      setGenerating(false);
    }
  };

  const handleFlashGen = async () => {
    if (!hasDaily) { setShowDaily(true); return; }
    setGenerating(true);
    setFlashSession(null);

    // 1. Récupérer le contexte matériel et bibliothèque
    const exerciseLibrary = db.getExerciseLibrary();
    const allEquipment = db.getEquipment();
    
    // Trouver l'ID de l'infrastructure sélectionnée pour filtrer le matériel
    const selectedInfra = infras.find(i => i.name === flashLocation);
    const availableEquipment = selectedInfra 
        ? allEquipment.filter(e => e.infrastructureId === selectedInfra.id && e.status === 'Operational')
        : []; // Si "Chez moi" ou non trouvé, liste vide = Poids du corps / Système D

    try {
        const session = await generateFlashSession(
            user, 
            hasDaily, 
            flashLocation, 
            flashType, 
            flashDuration, 
            infras,
            exerciseLibrary,
            availableEquipment
        );

        setFlashSession({
            title: session.title,
            description: session.description,
            durationMinutes: flashDuration,
            locationName: flashLocation,
            content: {
                warmup: session.warmup,
                mainBlock: session.mainBlock,
                cooldown: session.cooldown,
                advice: session.advice
            }
        });
    } catch (e) { 
        console.error(e);
        alert("Erreur IA lors de la génération de la séance."); 
    } 
    finally { setGenerating(false); }
  };

  const handleProgramRequest = () => {
      const finalGoal = selectedObjective === 'Autre' ? goal : selectedObjective;

      if (!finalGoal || !finalGoal.trim()) {
          alert("Veuillez sélectionner ou indiquer votre objectif.");
          return;
      }
      if (selectedLocations.length === 0) {
          alert("Veuillez sélectionner au moins un lieu.");
          return;
      }
      
      const newProgram: Program = {
          id: Date.now().toString(),
          userId: user.nid,
          title: `Demande: ${finalGoal.slice(0, 30)}${finalGoal.length > 30 ? '...' : ''}`,
          goal: finalGoal,
          startDate: todayStr,
          durationWeeks: weeks,
          sessionsPerWeek: sessionsPerWeek,
          requestedLocations: selectedLocations,
          status: ProgramStatus.PENDING,
          sessions: [] 
      };
      
      db.addProgram(newProgram);
      setReqProgram(false);
      alert("Votre demande a été envoyée au moniteur EPMS pour élaboration.");
  };

  const handleLocationToggle = (loc: string) => {
    setSelectedLocations(prev => 
      prev.includes(loc) ? prev.filter(l => l !== loc) : [...prev, loc]
    );
  };

  const vma = calculateVMA(user.tests);

  return (
    <div className="space-y-6 pb-8">
      {showDaily && <DailyCheckIn onSubmit={handleDailySubmit} />}

      {/* Hero */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-military-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-military-900">Bonjour, {user.name}</h2>
          <p className="text-military-500 text-sm">{hasDaily ? "Bilan validé. Adaptation active." : "N'oubliez pas votre bilan forme !"}</p>
          <div className="mt-2 flex gap-3 text-xs md:text-sm">
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-bold">VMA: {vma} km/h</span>
            <span className="px-2 py-1 bg-green-100 text-green-800 rounded font-bold">{user.jobType}</span>
          </div>
        </div>
        {!hasDaily && (
             <button onClick={() => setShowDaily(true)} className="px-4 py-2 bg-action-500 text-white rounded-lg font-bold shadow-md text-sm transition-transform active:scale-95">
                Bilan Forme
             </button>
        )}
      </div>

      {/* Critical Alert Banner */}
      {isCriticalAlert && dailyAnalysis && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 animate-pulse rounded-r-xl shadow-sm">
            <div className="flex items-center">
                <span className="material-icons text-red-600 mr-2">warning</span>
                <p className="text-red-700 font-bold">{dailyAnalysis as string}</p>
            </div>
            <p className="text-red-600 text-sm mt-1 ml-8">L'IA ne générera que des séances de récupération ou mobilité.</p>
        </div>
      )}

      {/* Séance encadrées du jour */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-military-800">
            <span className="material-icons text-action-600">groups</span>
            Séances encadrées du jour
        </h3>
        {collectiveSessionsToday.length > 0 ? (
          <div className="space-y-3">
            {collectiveSessionsToday.sort((a,b) => a.timeStart.localeCompare(b.timeStart)).map((cs) => {
              const isJoined = cs.participants.includes(user.nid);
              const isFull = cs.participants.length >= cs.maxParticipants;
              const spotsLeft = cs.maxParticipants - cs.participants.length;

              return (
                <div key={cs.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${isJoined ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'}`}>
                  <div className="bg-military-800 text-white px-2 py-1 rounded text-[10px] font-black flex flex-col items-center min-w-[60px]">
                    <span>{cs.timeStart}</span>
                    <span className="opacity-30">—</span>
                    <span>{cs.timeEnd}</span>
                  </div>
                  <div className="flex-grow">
                    <button 
                      onClick={() => setSelectedCollSession(cs)}
                      className="font-bold text-sm text-military-900 hover:text-action-600 text-left transition-colors"
                    >
                      {cs.title}
                    </button>
                    <div className="flex items-center gap-3 text-[10px] text-gray-500 mt-1">
                      <span className="font-bold text-military-400">{spotsLeft} places dispos</span>
                      <span>• {cs.locationName}</span>
                    </div>
                  </div>
                  
                  {isJoined ? (
                    <button 
                      onClick={() => handleToggleJoin(cs.id)}
                      className="flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-3 py-1.5 rounded-lg border border-green-200 shadow-sm"
                    >
                      <span className="material-icons text-sm">check_circle</span> Inscrit
                    </button>
                  ) : isFull ? (
                    <span className="text-xs font-black text-red-600 px-3 py-1.5 uppercase tracking-wider border border-red-100 bg-red-50 rounded-lg">Complet</span>
                  ) : (
                    <button 
                      onClick={() => handleToggleJoin(cs.id)}
                      className="whitespace-nowrap shrink-0 flex items-center gap-1 text-xs font-bold text-action-600 border-2 border-action-500 px-4 py-1.5 rounded-lg hover:bg-action-500 hover:text-white transition-all shadow-sm active:scale-95"
                    >
                      S'inscrire <span className="material-icons text-sm">login</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-400 text-sm italic text-center py-4">Aucune séance prévue aujourd'hui.</p>
        )}
      </div>

      {/* Program Request / Status */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-military-800">
            <span className="material-icons text-military-500">assignment</span>
            Mon Programme
        </h3>
        
        {activeProgram ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-green-800">{activeProgram.title}</span>
                    <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded font-bold uppercase tracking-widest">Actif</span>
                </div>
                <p className="text-sm text-green-700">{activeProgram.goal}</p>
                <div className="mt-4 flex justify-between items-center">
                    <span className="text-xs text-green-600 font-bold">{activeProgram.durationWeeks} semaines • {activeProgram.sessionsPerWeek} séa/sem</span>
                    <button onClick={() => onOpenProgram(activeProgram.id)} className="text-sm text-military-800 font-bold underline decoration-2 underline-offset-4 decoration-military-200 hover:decoration-military-600">Voir les séances</button>
                </div>
            </div>
        ) : pendingProgram ? (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <div className="flex justify-between items-center mb-2">
                     <span className="font-bold text-yellow-800">Demande en cours</span>
                     <span className="material-icons text-yellow-600 animate-pulse">hourglass_empty</span>
                </div>
                <p className="text-sm text-yellow-700">Votre demande d'objectif "{pendingProgram.goal}" est en cours d'élaboration par le moniteur EPMS.</p>
            </div>
        ) : (
            <div>
                {!reqProgram ? (
                    <div className="text-center py-6 border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/30">
                        <p className="text-gray-400 mb-4 text-sm italic">Aucun programme en cours.</p>
                        <button onClick={() => setReqProgram(true)} className="px-6 py-2 border-2 border-military-600 text-military-600 font-bold rounded-xl hover:bg-military-50 transition-all shadow-sm active:scale-95">
                            Demander un programme
                        </button>
                    </div>
                ) : (
                    <div className="bg-gray-50 p-6 rounded-2xl animate-[fadeIn_0.3s] border border-gray-100 shadow-inner">
                        <h4 className="font-bold text-military-800 mb-6 text-center uppercase tracking-wider text-sm">Paramètres du programme</h4>
                        <div className="space-y-5">
                            <div>
                                <label className="text-xs font-bold text-military-400 uppercase mb-1 block">Objectif</label>
                                <select 
                                    className="w-full p-3 border rounded-xl bg-white shadow-sm text-sm font-bold focus:ring-2 focus:ring-military-400 outline-none mb-3"
                                    value={selectedObjective} 
                                    onChange={e => setSelectedObjective(e.target.value)}
                                >
                                    <option value="">-- Sélectionner un type --</option>
                                    {PROGRAM_OBJECTIVES.map(obj => (
                                        <option key={obj} value={obj}>{obj}</option>
                                    ))}
                                </select>
                                
                                {selectedObjective === 'Autre' && (
                                    <textarea 
                                        className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-military-400 outline-none text-sm min-h-[80px] bg-white shadow-sm animate-[fadeIn_0.3s]" 
                                        placeholder="Précisez votre demande..."
                                        value={goal} 
                                        onChange={e => setGoal(e.target.value)}
                                    />
                                )}
                            </div>

                            <div>
                                <label className="text-xs font-bold text-military-400 uppercase mb-2 block">Lieux possibles</label>
                                <div className="flex flex-wrap gap-2">
                                    {['Chez moi'].map(loc => (
                                        <label key={loc} className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-all ${selectedLocations.includes(loc) ? 'bg-military-800 text-white border-military-800' : 'bg-white text-military-600 border-gray-200 hover:border-military-300 shadow-sm'}`}>
                                            <input 
                                                type="checkbox" 
                                                className="hidden"
                                                checked={selectedLocations.includes(loc)}
                                                onChange={() => handleLocationToggle(loc)}
                                            />
                                            <span className="material-icons text-xs">{selectedLocations.includes(loc) ? 'check_box' : 'check_box_outline_blank'}</span>
                                            <span className="text-xs font-bold">{loc}</span>
                                        </label>
                                    ))}
                                    {/* Infrastructures dynamiques */}
                                    {infras.map(infra => (
                                        <label key={infra.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-all ${selectedLocations.includes(infra.name) ? 'bg-military-800 text-white border-military-800' : 'bg-white text-military-600 border-gray-200 hover:border-military-300 shadow-sm'}`}>
                                            <input 
                                                type="checkbox" 
                                                className="hidden"
                                                checked={selectedLocations.includes(infra.name)}
                                                onChange={() => handleLocationToggle(infra.name)}
                                            />
                                            <span className="material-icons text-xs">{selectedLocations.includes(infra.name) ? 'check_box' : 'check_box_outline_blank'}</span>
                                            <span className="text-xs font-bold">{infra.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-military-400 uppercase mb-1 block">Semaines</label>
                                    <select className="w-full p-2 border rounded-xl bg-white shadow-sm text-sm font-bold" value={weeks} onChange={e => setWeeks(Number(e.target.value))}>
                                        {[4,8,12,16,24].map(n => <option key={n} value={n}>{n} semaines</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-military-400 uppercase mb-1 block">Fréquence</label>
                                    <select className="w-full p-2 border rounded-xl bg-white shadow-sm text-sm font-bold" value={sessionsPerWeek} onChange={e => setSessionsPerWeek(Number(e.target.value))}>
                                        {[2,3,4,5].map(n => <option key={n} value={n}>{n} séa/sem</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-8">
                                <button onClick={() => setReqProgram(false)} className="flex-1 py-3 text-gray-500 font-bold text-sm hover:text-gray-700">ANNULER</button>
                                <button 
                                    onClick={handleProgramRequest} 
                                    className="flex-[2] bg-military-800 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-military-900 transition-all uppercase tracking-widest text-xs"
                                >
                                    Envoyer la demande
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}
      </div>

      {/* Prochaine séance du programme */}
      {activeProgram && nextProgramSession && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 animate-[fadeIn_0.3s]">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-military-800">
            <span className="material-icons text-military-500">event_available</span>
            Prochaine séance du programme
          </h3>
          <div className="bg-military-50 p-5 rounded-2xl border border-military-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex-grow">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest bg-military-800 text-white px-2 py-0.5 rounded">
                  {nextProgramSession.type}
                </span>
                <span className="text-xs font-bold text-military-400">
                  {nextProgramSession.durationMinutes} min • {nextProgramSession.locationName}
                </span>
              </div>
              <h4 className="text-xl font-black text-military-900 leading-tight">{nextProgramSession.title}</h4>
              <p className="text-sm text-military-500 mt-1 line-clamp-2">{nextProgramSession.description}</p>
            </div>
            <button 
              onClick={() => onStartSession(nextProgramSession)}
              className="w-full md:w-auto px-8 py-4 bg-military-800 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg hover:bg-military-900 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              Démarrer <span className="material-icons text-sm">play_arrow</span>
            </button>
          </div>
        </div>
      )}

      {/* Flash Session Generator */}
      <div className="bg-gradient-to-br from-military-700 to-military-800 rounded-xl p-6 text-white shadow-xl relative overflow-hidden">
         <div className="absolute top-0 right-0 p-4 opacity-10"><span className="material-icons text-8xl">bolt</span></div>
         <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
            <span className="material-icons text-action-500">electric_bolt</span>
            Sport Autonome
         </h3>
         <p className="text-military-200 text-sm mb-6">Générez, recherchez ou démarrez une séance libre.</p>
         
         <div className="flex gap-2 mb-6 bg-military-900/50 p-1 rounded-xl flex-wrap">
            <button 
              onClick={() => { setFlashMode('generate'); setFilteredSessions([]); setModifiedSession(null); setSearchAttempted(false); }}
              className={`flex-1 min-w-[100px] py-2 rounded-lg text-sm font-bold transition-colors ${flashMode === 'generate' ? 'bg-action-500 text-white' : 'text-military-300 hover:text-white'}`}
            >
              Générer
            </button>
            <button 
              onClick={() => { onOpenLibrary(); }}
              className={`flex-1 min-w-[100px] py-2 rounded-lg text-sm font-bold transition-colors text-military-300 hover:text-white`}
            >
              Rechercher
            </button>
            <button 
              onClick={() => { setFlashMode('free'); setFlashSession(null); setModifiedSession(null); setSearchAttempted(false); }}
              className={`flex-1 min-w-[100px] py-2 rounded-lg text-sm font-bold transition-colors ${flashMode === 'free' ? 'bg-action-500 text-white' : 'text-military-300 hover:text-white'}`}
            >
              Séance libre
            </button>
         </div>

         <div className="space-y-4 relative z-10">
            {flashMode === 'free' ? (
                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-military-400">Lieu de pratique ou Parcours</label>
                        <select 
                            className="w-full bg-military-900/50 border border-military-600 rounded-xl p-3 text-sm focus:ring-2 focus:ring-action-500 outline-none font-medium"
                            value={flashLocation}
                            onChange={(e) => setFlashLocation(e.target.value)}
                        >
                            <optgroup label="Infrastructures">
                                {infras.map(infra => (
                                    <option key={infra.id} value={infra.name}>{infra.name}</option>
                                ))}
                            </optgroup>
                            <optgroup label="Parcours (Course, Vélo, VTT)">
                                {routes.map(route => (
                                    <option key={route.id} value={route.name}>{route.name} ({route.type})</option>
                                ))}
                            </optgroup>
                        </select>
                    </div>
                    <button 
                        onClick={() => {
                            if (!hasDaily) { setShowDaily(true); return; }
                            const sessionId = `sess-${Date.now()}`;
                            const selectedInfra = infras.find(i => i.name === flashLocation);
                            const selectedRoute = routes.find(r => r.name === flashLocation);
                            
                            db.startSession({
                                id: sessionId,
                                userId: user.nid,
                                userName: user.name,
                                infrastructureId: selectedInfra ? selectedInfra.id : (selectedRoute ? selectedRoute.id : 'home'),
                                infrastructureName: flashLocation,
                                sessionType: 'FLASH',
                                startTime: new Date().toISOString(),
                                details: `Séance Libre - ${flashLocation}`
                            });
                            setCurrentSessionId(sessionId);
                            onStartSession({
                                id: sessionId,
                                title: `Séance Libre`,
                                description: `Entraînement autonome à ${flashLocation}`,
                                durationMinutes: 0,
                                locationName: flashLocation,
                                workoutType: flashType as any,
                                content: {
                                    mainBlock: [{ exercise: "Entraînement libre", prescription: "Selon vos objectifs", rest: "-" }]
                                }
                            });
                        }} 
                        className="w-full bg-white text-military-800 px-5 py-4 rounded-xl font-bold shadow-xl hover:bg-gray-100 flex items-center justify-center gap-2 text-sm transition-transform active:scale-95"
                    >
                        <span className="material-icons text-sm">play_arrow</span>
                        Démarrer la séance libre
                    </button>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-military-400">Type de séance</label>
                            <select 
                                className="w-full bg-military-900/50 border border-military-600 rounded-xl p-3 text-sm focus:ring-2 focus:ring-action-500 outline-none font-medium"
                                value={flashType}
                                onChange={(e) => {
                                    const newType = e.target.value;
                                    setFlashType(newType);
                                    if (newType === 'Course') {
                                        const courseRoutes = routes.filter(r => r.type === 'Course à pied');
                                        if (courseRoutes.length > 0) {
                                            setFlashLocation(courseRoutes[0].name);
                                        } else {
                                            const muscuInfra = infras.find(i => i.name.toLowerCase().includes('musculation'));
                                            if (muscuInfra) setFlashLocation(muscuInfra.name);
                                        }
                                    } else if (flashLocation && !infras.find(i => i.name === flashLocation) && flashLocation !== 'Chez moi') {
                                        setFlashLocation('Chez moi');
                                    }
                                }}
                            >
                                <option value="Musculation">Musculation</option>
                                <option value="Poids du corps">Poids du corps</option>
                                <option value="Course">Course</option>
                                <option value="Crosstraining">Crosstraining</option>
                                <option value="Mobilité et posture">Mobilité et posture</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-military-400">Lieu de pratique</label>
                            <select 
                                className="w-full bg-military-900/50 border border-military-600 rounded-xl p-3 text-sm focus:ring-2 focus:ring-action-500 outline-none font-medium"
                                value={flashLocation}
                                onChange={(e) => setFlashLocation(e.target.value)}
                            >
                                {flashType === 'Course' ? (
                                    <>
                                        <optgroup label="Parcours Course Officiels">
                                            {routes.filter(r => r.type === 'Course à pied').map(route => (
                                                <option key={route.id} value={route.name}>{route.name}</option>
                                            ))}
                                        </optgroup>
                                        <optgroup label="Infrastructures">
                                            {infras.filter(i => i.name.toLowerCase().includes('musculation')).map(infra => (
                                                <option key={infra.id} value={infra.name}>{infra.name}</option>
                                            ))}
                                        </optgroup>
                                    </>
                                ) : (
                                    <>
                                        <option value="Chez moi">Chez moi (Sans matériel)</option>
                                        {infras.map(infra => (
                                            <option key={infra.id} value={infra.name}>{infra.name}</option>
                                        ))}
                                    </>
                                )}
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-4 items-end">
                        <div className="flex-1 space-y-1">
                            <label className="text-[10px] font-bold uppercase text-military-400">Temps disponible</label>
                            <select 
                                className="w-full bg-military-900/50 border border-military-600 rounded-xl p-3 text-sm focus:ring-2 focus:ring-action-500 outline-none font-medium"
                                value={flashDuration}
                                onChange={(e) => setFlashDuration(Number(e.target.value))}
                            >
                                <option value={20}>20 min</option>
                                <option value={40}>40 min</option>
                                <option value={60}>60 min</option>
                            </select>
                        </div>
                        {flashMode === 'generate' ? (
                          <button 
                              onClick={handleFlashGen} 
                              disabled={generating} 
                              className="flex-[2] bg-white text-military-800 px-5 py-3 rounded-xl font-bold shadow-xl hover:bg-gray-100 flex items-center justify-center gap-2 text-sm transition-transform active:scale-95 disabled:opacity-50"
                          >
                              {generating ? (
                                  <>
                                      <span className="animate-spin material-icons text-sm">refresh</span>
                                      Génération...
                                  </>
                              ) : (
                                  <>
                                      <span className="material-icons text-sm">bolt</span>
                                      Générer Séance
                                  </>
                              )}
                          </button>
                        ) : (
                          <button 
                              onClick={handleSearchSessions} 
                              className="flex-[2] bg-white text-military-800 px-5 py-3 rounded-xl font-bold shadow-xl hover:bg-gray-100 flex items-center justify-center gap-2 text-sm transition-transform active:scale-95"
                          >
                              <span className="material-icons text-sm">search</span>
                              Rechercher
                          </button>
                        )}
                    </div>
                </>
            )}
         </div>

         {/* Search Results */}
         {flashMode === 'search' && filteredSessions.length > 0 && (
           <div className="mt-6 space-y-3">
             <h4 className="text-sm font-bold text-military-300 uppercase">Séances trouvées ({filteredSessions.length})</h4>
             <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
               {filteredSessions.map(s => (
                 <div key={s.id} className="bg-military-900/50 p-4 rounded-xl border border-military-600 flex justify-between items-center">
                   <div>
                     <h5 className="font-bold text-white">{s.title}</h5>
                     <p className="text-xs text-military-300">{s.durationMinutes} min • {s.workoutType || s.type}</p>
                   </div>
                   <button 
                     onClick={() => handleSelectSessionToModify(s)}
                     disabled={generating}
                     className="bg-action-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-action-600 transition-colors disabled:opacity-50"
                   >
                     {generating && selectedSessionToModify?.id === s.id ? 'Adaptation...' : 'Adapter'}
                   </button>
                 </div>
               ))}
             </div>
           </div>
         )}
         {flashMode === 'search' && filteredSessions.length === 0 && searchAttempted && (
           <div className="mt-6 text-center text-military-300 text-sm italic">
             Aucune séance trouvée pour ces critères.
           </div>
         )}
      </div>

      {/* NEW: Generated Session Tile (Summary) */}
      {flashSession && !modifiedSession && (
        <div className="bg-white rounded-3xl p-6 border-l-8 border-action-500 shadow-xl animate-[slideUp_0.4s_ease-out] relative">
            <button 
                onClick={() => setFlashSession(null)} 
                className="absolute top-4 right-4 text-gray-300 hover:text-red-500"
            >
                <span className="material-icons">close</span>
            </button>
            
            <div className="mb-6">
                 <div className="inline-block px-3 py-1 bg-action-100 text-action-700 rounded-full text-[10px] font-black uppercase tracking-widest mb-2">
                    {flashMode === 'generate' ? 'Séance Générée' : 'Séance Adaptée'}
                 </div>
                 <h3 className="text-2xl font-black text-military-900 uppercase leading-none">{flashSession.title}</h3>
                 <p className="text-gray-500 text-sm mt-2 font-medium">{flashSession.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 p-3 rounded-xl">
                     <span className="text-[10px] font-bold text-gray-400 uppercase block">Durée</span>
                     <span className="text-military-900 font-black text-lg">{flashSession.durationMinutes || flashDuration} min</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl">
                     <span className="text-[10px] font-bold text-gray-400 uppercase block">Intensité</span>
                     <span className="text-military-900 font-black text-lg">Adaptée</span>
                </div>
            </div>

            <button 
                onClick={() => {
                    const sessionId = `sess-${Date.now()}`;
                    const locName = flashSession.locationName || flashLocation;
                    const selectedInfra = infras.find(i => i.name === locName);
                    db.startSession({
                        id: sessionId,
                        userId: user.nid,
                        userName: user.name,
                        infrastructureId: selectedInfra ? selectedInfra.id : 'home',
                        infrastructureName: locName,
                        sessionType: 'FLASH',
                        startTime: new Date().toISOString(),
                        details: flashSession.title
                    });
                    setCurrentSessionId(sessionId);
                    onStartSession({
                        id: sessionId,
                        title: flashSession.title,
                        description: flashSession.description,
                        durationMinutes: flashSession.durationMinutes || flashDuration,
                        locationName: locName,
                        workoutType: flashType as any,
                        content: flashSession.content
                    });
                }}
                className="w-full py-4 bg-military-900 text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-lg hover:bg-military-800 hover:scale-[1.01] transition-all flex items-center justify-center gap-2"
            >
                <span className="material-icons text-action-500">play_circle_filled</span>
                Démarrer la séance
            </button>
        </div>
      )}

      {/* Suggested Modifications Tile */}
      {modifiedSession && (
        <div className="bg-white rounded-3xl p-6 border-l-8 border-yellow-500 shadow-xl animate-[slideUp_0.4s_ease-out] relative">
            <div className="mb-6">
                 <div className="inline-block px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-1">
                    <span className="material-icons text-[12px]">auto_awesome</span>
                    Suggestions d'adaptation
                 </div>
                 <h3 className="text-2xl font-black text-military-900 uppercase leading-none">{modifiedSession.title}</h3>
                 <p className="text-gray-500 text-sm mt-2 font-medium">{modifiedSession.description}</p>
                 
                 {modifiedSession.content?.advice && (
                   <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800 flex gap-2 items-start">
                     <span className="material-icons text-blue-500 text-base mt-0.5">info</span>
                     <p>{modifiedSession.content.advice}</p>
                   </div>
                 )}
            </div>

            <div className="flex gap-3 mt-6">
                <button 
                    onClick={() => setModifiedSession(null)}
                    className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors"
                >
                    Refuser
                </button>
                <button 
                    onClick={() => {
                        setFlashSession(modifiedSession);
                        setModifiedSession(null);
                    }}
                    className="flex-1 py-3 bg-action-500 text-white rounded-xl font-bold text-sm hover:bg-action-600 transition-colors shadow-lg shadow-action-500/30"
                >
                    Accepter
                </button>
            </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedCollSession && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-[zoomIn_0.2s_ease-out]">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-military-900">{selectedCollSession.title}</h3>
                <p className="text-action-600 text-xs font-bold uppercase tracking-widest">{selectedCollSession.instructorName}</p>
              </div>
              <button onClick={() => setSelectedCollSession(null)} className="text-gray-300 hover:text-red-500">
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
              <div className="flex items-center gap-4 text-xs font-bold py-2 border-y border-gray-50">
                 <span className="flex items-center gap-1"><span className="material-icons text-sm">schedule</span> {selectedCollSession.timeStart} - {selectedCollSession.timeEnd}</span>
                 <span className="flex items-center gap-1"><span className="material-icons text-sm">place</span> {selectedCollSession.locationName}</span>
              </div>
              <p>{selectedCollSession.detailedDescription || "Pas de description détaillée disponible pour cette séance."}</p>
              
              <div className="bg-military-50 p-4 rounded-xl border border-military-100">
                 <span className="text-[10px] font-black uppercase text-military-400 block mb-1">Participants inscrits ({selectedCollSession.participants.length}/{selectedCollSession.maxParticipants})</span>
                 <div className="flex -space-x-2 overflow-hidden py-1">
                    {selectedCollSession.participants.map(nid => (
                      <div key={nid} className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-military-800 text-white flex items-center justify-center text-[10px] font-bold">
                        {nid.slice(-2)}
                      </div>
                    ))}
                    {selectedCollSession.participants.length === 0 && <span className="text-xs italic text-gray-400">Aucun inscrit pour le moment.</span>}
                 </div>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button 
                onClick={() => setSelectedCollSession(null)}
                className="flex-1 py-3 text-sm font-bold text-gray-400 hover:text-gray-600"
              >
                FERMER
              </button>
              <button 
                onClick={() => { handleToggleJoin(selectedCollSession.id); setSelectedCollSession(null); }}
                className={`flex-1 py-3 rounded-xl font-bold text-sm shadow-lg transition-all ${
                  selectedCollSession.participants.includes(user.nid)
                  ? 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100'
                  : 'bg-military-800 text-white hover:bg-military-900'
                }`}
                disabled={!selectedCollSession.participants.includes(user.nid) && selectedCollSession.participants.length >= selectedCollSession.maxParticipants}
              >
                {selectedCollSession.participants.includes(user.nid) ? 'SE DÉSINSCRIRE' : 'S\'INSCRIRE'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardUser;
