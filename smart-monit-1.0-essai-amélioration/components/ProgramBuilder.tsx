
import React, { useState, useMemo } from 'react';
import { 
  ProgramCycle, ProgramWeek, ProgramSessionBuilder, ProgramExercise, 
  ExerciseLibraryItem, Program, ProgramStatus, UserRole, UserProfile,
  Session, WorkoutType
} from '../types';
import { db } from '../services/mockDatabase';

interface Props {
  onClose: () => void;
  existingProgram?: Program;
  user: UserProfile;
}

const ProgramBuilder: React.FC<Props> = ({ onClose, existingProgram, user }) => {
  // --- STATE ---
  const [activeView, setActiveView] = useState<'settings' | 'structure'>('settings');
  
  // Program Settings (Macrocycle)
  const [title, setTitle] = useState(existingProgram?.title || '');
  const [goal, setGoal] = useState(existingProgram?.goal || '');
  const [type, setType] = useState<Program['type']>('Musculation');
  
  // Hierarchy: Structure (Mesocycles) -> Weeks (Microcycles) -> Sessions
  const [structure, setStructure] = useState<ProgramCycle[]>(existingProgram?.structure || []);

  // Pre-fill structure if it's a pending request
  React.useEffect(() => {
    if (existingProgram && existingProgram.status === ProgramStatus.PENDING && (!existingProgram.structure || existingProgram.structure.length === 0)) {
        const weeksCount = existingProgram.durationWeeks || 4;
        const sessionsCount = existingProgram.sessionsPerWeek || 3;
        const reqLocs = existingProgram.requestedLocations || [];
        
        // Determine a default type based on goal
        let defaultType = 'Musculation';
        if (existingProgram.goal.toLowerCase().includes('cardio') || existingProgram.goal.toLowerCase().includes('vma')) defaultType = 'Course';
        if (existingProgram.goal.toLowerCase().includes('hybride')) defaultType = 'Hybride';
        setType(defaultType as any);

        const newStructure: ProgramCycle[] = [];
        
        // Create 1 cycle for the whole program
        const cycle: ProgramCycle = {
            id: Date.now().toString(),
            title: `Mésocycle 1 - ${existingProgram.goal}`,
            objective: existingProgram.goal,
            weeks: [],
            isCollapsed: false
        };

        for (let w = 1; w <= weeksCount; w++) {
            const week: ProgramWeek = {
                id: `w_${w}_${Date.now()}`,
                number: w,
                objective: w === weeksCount && weeksCount >= 4 ? 'Décharge (Deload)' : 'Progression',
                sessions: [],
                isCollapsed: false
            };

            for (let s = 1; s <= sessionsCount; s++) {
                // Distribute requested locations if available
                const loc = reqLocs.length > 0 ? reqLocs[(s - 1) % reqLocs.length] : undefined;
                
                week.sessions.push({
                    id: `s_${w}_${s}_${Date.now()}`,
                    title: `Séance ${s} - ${loc || defaultType}`,
                    type: defaultType,
                    description: loc ? `Lieu prévu: ${loc}` : undefined,
                    exercises: []
                });
            }
            cycle.weeks.push(week);
        }
        newStructure.push(cycle);
        setStructure(newStructure);
    }
  }, [existingProgram]);

  // Library & filtering
  const library = db.getExerciseLibrary();
  const infras = db.getInfrastructures().filter(i => i.serviceId === user.serviceId);
  const equipment = db.getEquipment().filter(e => infras.some(i => i.id === e.infrastructureId));

  // Session Editing State
  const [editingSession, setEditingSession] = useState<{cIdx: number, wIdx: number, sIdx: number} | null>(null);
  const [filterSearch, setFilterSearch] = useState('');

  // --- LOGIC ---

  const addCycle = () => {
    const newCycle: ProgramCycle = {
      id: Date.now().toString(),
      title: `Mésocycle ${structure.length + 1}`,
      objective: 'Objectif du cycle',
      weeks: [],
      isCollapsed: false
    };
    setStructure([...structure, newCycle]);
  };

  const addWeek = (cIdx: number) => {
    const newStruct = [...structure];
    const newWeek: ProgramWeek = {
      id: Date.now().toString() + Math.random(),
      number: newStruct[cIdx].weeks.length + 1,
      objective: '',
      sessions: [],
      isCollapsed: false
    };
    newStruct[cIdx].weeks.push(newWeek);
    setStructure(newStruct);
  };

  const addSession = (cIdx: number, wIdx: number) => {
    const newStruct = [...structure];
    const newSession: ProgramSessionBuilder = {
      id: Date.now().toString() + Math.random(),
      title: 'Séance',
      type: type || 'Musculation',
      exercises: []
    };
    newStruct[cIdx].weeks[wIdx].sessions.push(newSession);
    setStructure(newStruct);
    // Open editor immediately
    setEditingSession({ cIdx, wIdx, sIdx: newStruct[cIdx].weeks[wIdx].sessions.length - 1 });
  };

  const addExercise = (exItem: ExerciseLibraryItem) => {
    if (!editingSession) return;
    const { cIdx, wIdx, sIdx } = editingSession;
    const newStruct = [...structure];
    
    const isTimeBased = exItem.type === 'Cardio' || exItem.type === 'Mobility';

    newStruct[cIdx].weeks[wIdx].sessions[sIdx].exercises.push({
      id: Date.now().toString() + Math.random(),
      libraryId: exItem.id,
      name: exItem.name,
      sets: isTimeBased ? 1 : 3,
      reps: isTimeBased ? undefined : '10',
      durationSeconds: isTimeBased ? 60 : undefined,
      load: isTimeBased ? 'VMA / Intensité' : 'RPE 7',
      rest: '1:30'
    });
    setStructure(newStruct);
  };

  const addRecovery = () => {
    if (!editingSession) return;
    const { cIdx, wIdx, sIdx } = editingSession;
    const newStruct = [...structure];
    
    newStruct[cIdx].weeks[wIdx].sessions[sIdx].exercises.push({
      id: Date.now().toString() + Math.random(),
      libraryId: 'recovery',
      name: 'Récupération / Repos',
      durationSeconds: 60,
      isRecovery: true
    });
    setStructure(newStruct);
  };

  const duplicateSequence = () => {
    if (!editingSession) return;
    const { cIdx, wIdx, sIdx } = editingSession;
    const newStruct = [...structure];
    const session = newStruct[cIdx].weeks[wIdx].sessions[sIdx];
    
    if (session.exercises.length === 0) return;

    // Duplicate all current exercises as a new sequence
    const duplicated = session.exercises.map(ex => ({
        ...ex,
        id: Date.now().toString() + Math.random()
    }));

    session.exercises.push(...duplicated);
    setStructure(newStruct);
  };

  // --- FILTERED LIBRARY LOGIC ---
  const getFilteredLibrary = () => {
      if (!editingSession) return [];
      const { cIdx, wIdx, sIdx } = editingSession;
      // We need to know which infra is selected for this session to filter exercises
      // For the prototype, we assume we add an 'infraId' to the builder session state temporarily
      // or we just use a dropdown in the UI.
      // Let's rely on a state local to the editor if possible, or just global search.
      
      return library.filter(ex => ex.name.toLowerCase().includes(filterSearch.toLowerCase()));
  };
  
  // We need a way to link infrastructure to session in builder to enable the "Equipment Filter" feature requested.
  // I will add a local state for the currently edited session's infrastructure ID.
  const [selectedInfraId, setSelectedInfraId] = useState<string>('');

  const exercisesAvailableInInfra = useMemo(() => {
      if (!selectedInfraId) return library; // If no infra selected, show all (or none? show all for flexibility)
      
      const infraEquip = equipment.filter(e => e.infrastructureId === selectedInfraId && e.status === 'Operational');
      const infraEquipNames = infraEquip.map(e => e.name.toLowerCase());
      const infraEquipCats = infraEquip.map(e => e.category);

      // Simple heuristic: If library item equipment matches a category or name available
      return library.filter(ex => {
          // If exercise needs 'Barre', check if we have 'Barre' or similar in infra
          // This is a mock matching logic. In real app, IDs would match.
          const needs = ex.equipment.toLowerCase();
          
          if (needs === 'pdc') return true; // Bodyweight always available
          
          // Check against equipment list
          const hasExact = infraEquipNames.some(n => n.includes(needs));
          if (hasExact) return true;

          // Check categories as fallback
          if (ex.type === 'Cardio' && infraEquipCats.includes('Cardio')) return true;
          if (ex.type === 'Force' && infraEquipCats.includes('Musculation')) return true;

          return false;
      });
  }, [selectedInfraId, library, equipment]);

  // --- SAVE ---
  const handleSave = () => {
      if(!title) return alert("Titre requis");
      
      // Flatten structure into a list of Session objects
      const flattenedSessions: Session[] = [];
      let sessionCount = 0;

      structure.forEach((cycle, cIdx) => {
          cycle.weeks.forEach((week, wIdx) => {
              week.sessions.forEach((sess, sIdx) => {
                  sessionCount++;
                  
                  // Convert ProgramExercise[] to SessionContent['mainBlock']
                  const mainBlock = sess.exercises.map(ex => ({
                      exercise: ex.name,
                      prescription: ex.durationSeconds ? `${Math.floor(ex.durationSeconds / 60)}:${(ex.durationSeconds % 60).toString().padStart(2, '0')}` : (ex.reps ? `${ex.sets}x${ex.reps}` : `${ex.sets} sets`),
                      rest: ex.rest || '1:00',
                      tempo: ex.tempo,
                      durationSeconds: ex.durationSeconds,
                      isRecovery: ex.isRecovery
                  }));

                  flattenedSessions.push({
                      id: `sess_${Date.now()}_${sessionCount}`,
                      title: sess.title || `Séance ${sessionCount}`,
                      description: sess.description || `Mésocycle ${cIdx+1} - Semaine ${week.number}`,
                      durationMinutes: sess.exercises.reduce((acc, ex) => acc + (ex.durationSeconds || 0) / 60, 0) + 10, // +10 for warmup/cool
                      type: sess.type as any,
                      workoutType: sess.type as any,
                      locationName: 'Base Militaire', // Default or from infra
                      infrastructureId: selectedInfraId || 'any',
                      isCompleted: false,
                      content: {
                          warmup: "Échauffement articulaire et cardio léger (5-10 min)",
                          mainBlock: mainBlock,
                          cooldown: "Retour au calme et étirements légers (5 min)",
                          advice: "Respectez les temps de repos et l'intensité prescrite."
                      }
                  });
              });
          });
      });

      const newProgram: Program = {
          id: existingProgram?.id || Date.now().toString(),
          userId: existingProgram?.userId || '', // Should be set by caller or from context
          title,
          goal,
          startDate: existingProgram?.startDate || new Date().toISOString().split('T')[0],
          durationWeeks: structure.reduce((acc, c) => acc + c.weeks.length, 0),
          sessionsPerWeek: structure.length > 0 && structure[0].weeks.length > 0 ? structure[0].weeks[0].sessions.length : 0,
          status: ProgramStatus.VALIDATED,
          sessions: flattenedSessions,
          structure: structure // Keep structure for future editing
      };

      if (existingProgram) {
          db.updateProgram(newProgram);
      } else {
          // If it's a new program, we might need to know which user it's for.
          // For now, we assume it's for the user passed in props if we are in a specific user context.
          // But monitor creates for any user.
          // Let's assume the monitor selected a user or we are editing a pending one.
          db.addProgram(newProgram);
      }

      alert("Programme sauvegardé et validé !");
      onClose();
  };

  // --- RENDER ---

  // 1. SETTINGS VIEW
  if (activeView === 'settings') {
      return (
          <div className="h-full bg-white flex flex-col p-6 animate-[fadeIn_0.3s]">
              <div className="max-w-xl mx-auto w-full space-y-8 mt-10">
                  <div className="text-center">
                      <h2 className="text-3xl font-black text-military-900 uppercase mb-2">Nouveau Programme</h2>
                      <p className="text-gray-500">Définissez le cadre général (Macrocycle)</p>
                  </div>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Titre du Programme</label>
                          <input className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-lg border-2 border-transparent focus:border-action-500 outline-none" 
                              placeholder="ex: Prépa Commando S1" value={title} onChange={e => setTitle(e.target.value)} />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Objectif Principal</label>
                          <input className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-lg border-2 border-transparent focus:border-action-500 outline-none" 
                              placeholder="ex: Endurance Musculaire" value={goal} onChange={e => setGoal(e.target.value)} />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Type Dominant</label>
                          <div className="flex flex-wrap gap-2">
                              {['Musculation', 'Course', 'Natation', 'Pilates', 'Mobilité', 'Hybride'].map(t => (
                                  <button key={t} onClick={() => setType(t as any)} 
                                      className={`px-4 py-3 rounded-xl font-bold text-xs uppercase border-2 ${type === t ? 'border-action-500 bg-action-50 text-action-700' : 'border-gray-100 text-gray-400'}`}>
                                      {t}
                                  </button>
                              ))}
                          </div>
                      </div>
                  </div>

                  <div className="pt-10 flex gap-4">
                      <button onClick={onClose} className="flex-1 py-4 font-bold text-gray-400 uppercase">Annuler</button>
                      <button onClick={() => { if(title) setActiveView('structure'); }} className="flex-[2] bg-military-900 text-white font-black py-4 rounded-2xl uppercase shadow-xl hover:scale-[1.02] transition-transform">
                          Suivant : Structure
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  // 3. SESSION EDITOR VIEW (OVERLAY)
  if (editingSession) {
      const { cIdx, wIdx, sIdx } = editingSession;
      const sessionData = structure[cIdx].weeks[wIdx].sessions[sIdx];
      const displayExercises = selectedInfraId ? exercisesAvailableInInfra : library.filter(ex => ex.name.toLowerCase().includes(filterSearch));

      return (
          <div className="fixed inset-0 bg-white z-50 flex flex-col animate-[slideUp_0.3s]">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-military-900 text-white">
                  <div>
                      <div className="text-[10px] font-bold uppercase opacity-70">Meso {cIdx+1} • Sem {structure[cIdx].weeks[wIdx].number}</div>
                      <div className="flex items-center gap-4">
                        <input className="bg-transparent font-black text-xl outline-none placeholder-white/50" 
                            value={sessionData.title} 
                            onChange={e => {
                                const n = [...structure]; n[cIdx].weeks[wIdx].sessions[sIdx].title = e.target.value;
                                setStructure(n);
                            }} 
                        />
                        <select 
                            className="bg-white/10 text-white text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border border-white/20 outline-none"
                            value={sessionData.type}
                            onChange={e => {
                                const n = [...structure]; n[cIdx].weeks[wIdx].sessions[sIdx].type = e.target.value;
                                setStructure(n);
                            }}
                        >
                            {Object.values(WorkoutType).map(t => <option key={t} value={t} className="text-black">{t}</option>)}
                        </select>
                      </div>
                  </div>
                  <button onClick={() => setEditingSession(null)} className="bg-white/10 p-2 rounded-full hover:bg-white/20">
                      <span className="material-icons">check</span>
                  </button>
              </div>

              <div className="flex flex-col md:flex-row flex-grow overflow-hidden">
                  {/* LEFT: EXERCISE LIST OF SESSION */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                      <div className="bg-white p-4 rounded-2xl border border-gray-200">
                          <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">Lieu de la séance (Filtre Matériel)</label>
                          <select 
                            className="w-full p-3 bg-military-50 rounded-xl font-bold text-sm outline-none"
                            value={selectedInfraId}
                            onChange={e => setSelectedInfraId(e.target.value)}
                          >
                              <option value="">-- Aucun lieu défini (Tout matériel) --</option>
                              {infras.map(i => <option key={i.id} value={i.id}>{i.name} ({i.type})</option>)}
                          </select>
                      </div>

                      <div className="flex gap-2 mb-4">
                          <button onClick={addRecovery} className="flex-1 bg-blue-50 text-blue-700 p-3 rounded-xl font-bold text-[10px] uppercase border border-blue-100 hover:bg-blue-100 transition-colors flex items-center justify-center gap-1">
                              <span className="material-icons text-sm">timer</span> + Récupération
                          </button>
                          <button onClick={duplicateSequence} className="flex-1 bg-purple-50 text-purple-700 p-3 rounded-xl font-bold text-[10px] uppercase border border-purple-100 hover:bg-purple-100 transition-colors flex items-center justify-center gap-1">
                              <span className="material-icons text-sm">content_copy</span> Dupliquer Séquence
                          </button>
                      </div>

                      {sessionData.exercises.length === 0 ? (
                          <div className="text-center py-10 text-gray-400 italic">
                              Ajoutez des exercices depuis la bibliothèque {selectedInfraId ? 'filtrée' : ''}.
                          </div>
                      ) : (
                          sessionData.exercises.map((ex, i) => (
                              <div key={ex.id} className={`bg-white p-4 rounded-2xl shadow-sm border ${ex.isRecovery ? 'border-blue-200 bg-blue-50/30' : 'border-gray-100'}`}>
                                  <div className="flex justify-between font-bold text-military-900 mb-2">
                                      <div className="flex items-center gap-2">
                                          {ex.isRecovery && <span className="material-icons text-blue-500 text-sm">timer</span>}
                                          <span>{ex.name}</span>
                                      </div>
                                      <button onClick={() => {
                                          const n = [...structure]; n[cIdx].weeks[wIdx].sessions[sIdx].exercises.splice(i, 1); setStructure(n);
                                      }} className="text-red-400"><span className="material-icons text-sm">close</span></button>
                                  </div>
                                  <div className="grid grid-cols-4 gap-2">
                                      {!ex.isRecovery && (
                                          <input className="bg-gray-50 p-2 rounded-lg text-center text-xs font-bold" value={ex.sets} onChange={(e) => {
                                              const n = [...structure]; n[cIdx].weeks[wIdx].sessions[sIdx].exercises[i].sets = parseInt(e.target.value); setStructure(n);
                                          }} placeholder="Séries" />
                                      )}
                                      
                                      {ex.durationSeconds !== undefined ? (
                                          <div className="col-span-2 flex items-center bg-gray-50 rounded-lg px-2">
                                              <input className="w-full bg-transparent p-2 text-center text-xs font-bold outline-none" 
                                                  value={ex.durationSeconds} 
                                                  onChange={(e) => {
                                                      const n = [...structure]; n[cIdx].weeks[wIdx].sessions[sIdx].exercises[i].durationSeconds = parseInt(e.target.value); setStructure(n);
                                                  }} 
                                                  placeholder="Secondes" 
                                              />
                                              <span className="text-[10px] font-bold text-gray-400">sec</span>
                                          </div>
                                      ) : (
                                          <input className="bg-gray-50 p-2 rounded-lg text-center text-xs font-bold" value={ex.reps} onChange={(e) => {
                                              const n = [...structure]; n[cIdx].weeks[wIdx].sessions[sIdx].exercises[i].reps = e.target.value; setStructure(n);
                                          }} placeholder="Reps" />
                                      )}

                                      {!ex.isRecovery && (
                                          <input className="bg-gray-50 p-2 rounded-lg text-center text-xs font-bold" value={ex.load} onChange={(e) => {
                                              const n = [...structure]; n[cIdx].weeks[wIdx].sessions[sIdx].exercises[i].load = e.target.value; setStructure(n);
                                          }} placeholder="Charge" />
                                      )}
                                      
                                      <input className="bg-gray-50 p-2 rounded-lg text-center text-xs font-bold" value={ex.rest} onChange={(e) => {
                                          const n = [...structure]; n[cIdx].weeks[wIdx].sessions[sIdx].exercises[i].rest = e.target.value; setStructure(n);
                                      }} placeholder="Repos" />
                                  </div>
                              </div>
                          ))
                      )}
                  </div>

                  {/* RIGHT: LIBRARY */}
                  <div className="w-full md:w-80 bg-white border-l border-gray-100 flex flex-col shadow-xl z-10">
                      <div className="p-4 border-b border-gray-100 bg-gray-50">
                          <h4 className="font-black text-xs text-military-900 uppercase mb-2">Bibliothèque {selectedInfraId ? 'Adaptée' : 'Globale'}</h4>
                          <input className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs outline-none" 
                              placeholder="Rechercher..." value={filterSearch} onChange={e => setFilterSearch(e.target.value)} />
                      </div>
                      <div className="flex-grow overflow-y-auto p-2 space-y-2">
                          {displayExercises.map(ex => (
                              <button key={ex.id} onClick={() => addExercise(ex)} className="w-full text-left p-3 rounded-xl border border-gray-100 hover:border-action-500 hover:bg-action-50 transition-all group">
                                  <div className="font-bold text-xs text-military-900 group-hover:text-action-700">{ex.name}</div>
                                  <div className="flex gap-2 mt-1">
                                      <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase">{ex.muscleGroup}</span>
                                      <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase">{ex.equipment}</span>
                                  </div>
                              </button>
                          ))}
                          {displayExercises.length === 0 && <div className="p-4 text-center text-xs text-gray-400">Aucun exercice compatible trouvé.</div>}
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  // 2. STRUCTURE VIEW
  return (
      <div className="h-full bg-gray-50 flex flex-col">
          {/* HEADER */}
          <div className="bg-white p-4 shadow-sm z-10 flex justify-between items-center">
              <div>
                  <h2 className="font-black text-xl text-military-900 uppercase">{title}</h2>
                  <p className="text-xs text-gray-500">{type} • {goal}</p>
              </div>
              <div className="flex gap-2">
                  <button onClick={() => setActiveView('settings')} className="p-2 text-gray-400 hover:text-military-900"><span className="material-icons">settings</span></button>
                  <button onClick={handleSave} className="bg-action-500 text-white px-4 py-2 rounded-xl text-xs font-black uppercase shadow-lg">Sauvegarder</button>
              </div>
          </div>

          {/* CONTENT */}
          <div className="flex-grow overflow-y-auto p-4 space-y-6 pb-20">
              {structure.map((cycle, cIdx) => (
                  <div key={cycle.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className="bg-military-100 p-4 flex justify-between items-center cursor-pointer" 
                          onClick={() => { const n = [...structure]; n[cIdx].isCollapsed = !n[cIdx].isCollapsed; setStructure(n); }}>
                          <div>
                              <span className="text-[10px] font-black uppercase text-military-500 tracking-widest">Mésocycle {cIdx + 1}</span>
                              <input onClick={e => e.stopPropagation()} className="block bg-transparent font-bold text-military-900 text-lg outline-none" 
                                  value={cycle.title} onChange={e => { const n = [...structure]; n[cIdx].title = e.target.value; setStructure(n); }} />
                          </div>
                          <span className="material-icons text-military-500">{cycle.isCollapsed ? 'expand_more' : 'expand_less'}</span>
                      </div>

                      {!cycle.isCollapsed && (
                          <div className="p-4 space-y-4">
                              {cycle.weeks.map((week, wIdx) => (
                                  <div key={week.id} className="border-l-2 border-military-200 pl-4">
                                      <div className="flex justify-between items-center mb-3">
                                          <h4 className="font-bold text-sm text-military-700 uppercase">Semaine {week.number}</h4>
                                          <button onClick={() => addSession(cIdx, wIdx)} className="bg-white border border-gray-200 text-gray-600 px-3 py-1 rounded-lg text-[10px] font-bold uppercase hover:bg-action-50 hover:border-action-500 hover:text-action-600 transition-colors">
                                              + Séance
                                          </button>
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                          {week.sessions.map((sess, sIdx) => (
                                              <div key={sess.id} onClick={() => setEditingSession({cIdx, wIdx, sIdx})} 
                                                  className="bg-gray-50 p-3 rounded-xl border border-gray-100 cursor-pointer hover:border-action-400 hover:shadow-md transition-all group">
                                                  <div className="flex justify-between items-start">
                                                      <span className="font-bold text-sm text-military-900">{sess.title}</span>
                                                      <span className="material-icons text-xs text-gray-300 group-hover:text-action-500">edit</span>
                                                  </div>
                                                  <div className="text-[10px] text-gray-500 mt-2">{sess.exercises.length} exercices</div>
                                              </div>
                                          ))}
                                          {week.sessions.length === 0 && <div className="text-[10px] italic text-gray-400 py-2">Aucune séance.</div>}
                                      </div>
                                  </div>
                              ))}
                              <button onClick={() => addWeek(cIdx)} className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-xs font-bold text-gray-400 uppercase hover:border-military-400 hover:text-military-600 transition-colors">
                                  + Ajouter une semaine
                              </button>
                          </div>
                      )}
                  </div>
              ))}
              
              <button onClick={addCycle} className="w-full py-6 bg-military-900 text-white rounded-2xl font-black uppercase text-sm shadow-xl hover:scale-[1.01] transition-transform">
                  + Ajouter un Mésocycle
              </button>
          </div>
      </div>
  );
};

export default ProgramBuilder;
