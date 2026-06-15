
import React, { useState, useMemo, useEffect } from 'react';
import { UserProfile, Program, Session, ProgramStatus, UserRole, CollectiveSession } from '../types';
import { db } from '../services/mockDatabase';

interface CalendarViewProps {
  user: UserProfile;
}

type ViewMode = 'week' | 'month';

const CalendarView: React.FC<CalendarViewProps> = ({ user }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  // Vue par défaut sur 'week' pour le mobile
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedCollSession, setSelectedCollSession] = useState<CollectiveSession | null>(null);
  
  // States pour édition (Admin/Monitor)
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editData, setEditData] = useState<Partial<CollectiveSession>>({});

  // Data retrieval
  const [allCollectiveSessions, setAllCollectiveSessions] = useState(db.getCollectiveSessions().filter(c => c.serviceId === user.serviceId));
  const [programs, setPrograms] = useState(db.getPrograms());

  useEffect(() => {
    const handleDbUpdate = () => {
      setAllCollectiveSessions(db.getCollectiveSessions().filter(c => c.serviceId === user.serviceId));
      setPrograms(db.getPrograms());
    };
    window.addEventListener('db_updated', handleDbUpdate);
    return () => window.removeEventListener('db_updated', handleDbUpdate);
  }, [user.serviceId]);

  const userPrograms = programs.filter(p => p.userId === user.nid && p.status === ProgramStatus.VALIDATED);
  
  // Reset edit state on close
  useEffect(() => {
    if (!selectedCollSession) {
        setIsEditing(false);
        setIsCreating(false);
        setEditData({});
    }
  }, [selectedCollSession]);

  const handleCreateNew = () => {
    const newSession: CollectiveSession = {
        id: 'coll_' + Date.now().toString(),
        title: 'Nouvelle Séance',
        instructorName: user.name,
        timeStart: '12:00',
        timeEnd: '13:00',
        locationName: '',
        dayOfWeek: 1, // Lundi par défaut
        maxParticipants: 10,
        participants: [],
        detailedDescription: '',
        serviceId: user.serviceId || ''
    };
    setSelectedCollSession(newSession);
    setEditData(newSession);
    setIsCreating(true);
    setIsEditing(true);
  };

  const handleToggleJoin = (sessionId: string) => {
    const updated = db.toggleSessionJoin(sessionId, user.nid);
    if (updated) {
      setAllCollectiveSessions(db.getCollectiveSessions().filter(c => c.serviceId === user.serviceId));
    }
  };

  const handleDelete = () => {
    if (selectedCollSession && window.confirm("Supprimer cette séance du planning ?")) {
        db.deleteCollectiveSession(selectedCollSession.id);
        setAllCollectiveSessions(db.getCollectiveSessions().filter(c => c.serviceId === user.serviceId));
        setSelectedCollSession(null);
    }
  };

  const handleSave = () => {
    if (selectedCollSession) {
        const updated = { ...selectedCollSession, ...editData } as CollectiveSession;
        if (isCreating) {
            db.addCollectiveSession(updated);
            setIsCreating(false);
        } else {
            db.updateCollectiveSession(updated);
        }
        setAllCollectiveSessions(db.getCollectiveSessions().filter(c => c.serviceId === user.serviceId));
        setSelectedCollSession(updated);
        setIsEditing(false);
    }
  };

  const parseSessionDate = (startDateStr: string, dateScheduled: string): Date | null => {
    if (!dateScheduled.startsWith('S')) return null;
    const match = dateScheduled.match(/S(\d+)J(\d+)/);
    if (!match) return null;
    const week = parseInt(match[1]);
    const day = parseInt(match[2]);
    const startDate = new Date(startDateStr);
    const totalDaysOffset = (week - 1) * 7 + (day - 1);
    const resultDate = new Date(startDate);
    resultDate.setDate(startDate.getDate() + totalDaysOffset);
    return resultDate;
  };

  // --- GENERATION DES DONNEES ---

  const getDayContent = (date: Date) => {
    const items: { type: string, label: string, color: string, time?: string, duration?: string, location?: string, raw?: any, instructor?: string }[] = [];
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay(); // 0 = Dimanche, 1 = Lundi...

    // 1. Programmes Individuels
    userPrograms.forEach(prog => {
      prog.sessions.forEach(sess => {
        if (sess.dateScheduled) {
          const sessDate = parseSessionDate(prog.startDate, sess.dateScheduled);
          if (sessDate && sessDate.toISOString().split('T')[0] === dateStr) {
            items.push({ 
                type: 'session', 
                label: sess.title, 
                color: 'border-l-4 border-military-600 bg-military-50 text-military-900',
                location: 'Autonomie',
                time: 'Libre',
                instructor: 'Moi-même'
            });
          }
        }
      });
    });

    // 2. Séances Collectives (Récurrentes hebdo)
    // Conversion JS getDay (0=Dimanche) vers App (1=Lundi... 5=Vendredi, 6=Samedi, 7=Dimanche)
    const appDayIndex = dayOfWeek === 0 ? 7 : dayOfWeek;

    allCollectiveSessions.forEach(cs => {
      if (cs.dayOfWeek === appDayIndex) {
        const isJoined = cs.participants.includes(user.nid);
        const isFull = cs.participants.length >= cs.maxParticipants;
        
        let colorClass = 'border-l-4 border-action-500 bg-white shadow-sm';
        if (isJoined) colorClass = 'border-l-4 border-green-500 bg-green-50 shadow-sm';
        else if (isFull) colorClass = 'border-l-4 border-gray-300 bg-gray-50 opacity-70';

        items.push({ 
            type: 'collective', 
            label: cs.title, 
            color: colorClass,
            time: cs.timeStart,
            duration: cs.timeEnd,
            location: cs.locationName,
            instructor: cs.instructorName,
            raw: cs
        });
      }
    });

    return items.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  };

  const calendarDays = useMemo(() => {
    const days: Date[] = [];
    
    if (viewMode === 'month') {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1);
        const dayOfWeek = firstDayOfMonth.getDay(); 
        const mondayBasedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        
        const startDate = new Date(year, month, 1 - mondayBasedDay);

        // 42 cases pour la grille mois
        for (let i = 0; i < 42; i++) {
            const d = new Date(startDate);
            d.setDate(startDate.getDate() + i);
            days.push(d);
        }
    } else {
        // Vue Semaine : 7 jours à partir du Lundi
        const day = currentDate.getDay(); // 0 Dimanche
        const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(currentDate);
        monday.setDate(diff);
        
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            days.push(d);
        }
    }
    return days;
  }, [currentDate, viewMode]);

  // --- RENDERERS ---

  // VUE SEMAINE (AGENDA VERTICAL - MOBILE FIRST)
  const renderWeekView = () => {
    return (
        <div className="flex flex-col space-y-4 pb-20">
            {calendarDays.map((day, i) => {
                const dayContent = getDayContent(day);
                const isToday = day.toDateString() === new Date().toDateString();
                const isPast = day < new Date() && !isToday;

                return (
                    <div key={i} className={`flex gap-4 ${isPast ? 'opacity-60' : ''}`}>
                        {/* Colonne Date */}
                        <div className="flex flex-col items-center w-14 shrink-0 pt-2">
                            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                                {day.toLocaleString('fr-FR', { weekday: 'short' }).replace('.', '')}
                            </span>
                            <div className={`w-10 h-10 flex items-center justify-center rounded-full text-lg font-black mt-1 ${isToday ? 'bg-action-500 text-white shadow-lg scale-110' : 'bg-white text-military-900 border border-gray-100'}`}>
                                {day.getDate()}
                            </div>
                        </div>

                        {/* Colonne Contenu (Ligne de temps) */}
                        <div className="flex-grow space-y-3 pt-2 pb-4 border-b border-gray-100">
                            {dayContent.length > 0 ? (
                                dayContent.map((item, idx) => (
                                    <div 
                                        key={idx}
                                        onClick={() => item.type === 'collective' && setSelectedCollSession(item.raw)}
                                        className={`w-full p-4 rounded-xl transition-all active:scale-95 ${item.color} ${item.type === 'collective' ? 'cursor-pointer' : ''}`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-black text-sm text-military-900">{item.time}</span>
                                                <span className="text-xs font-medium text-gray-500">- {item.duration}</span>
                                            </div>
                                            <span className="text-[9px] font-bold uppercase bg-white/50 px-2 py-1 rounded text-military-700 border border-black/5">
                                                {item.location}
                                            </span>
                                        </div>
                                        <h4 className="font-bold text-base text-military-900 leading-tight mb-1">{item.label}</h4>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <span className="material-icons text-[14px]">person</span>
                                            {item.instructor}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="h-12 border-2 border-dashed border-gray-100 rounded-xl flex items-center justify-center text-gray-300 text-xs italic">
                                    Repos
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
  };

  // VUE MOIS (GRILLE CLASSIQUE OPTIMISÉE)
  const renderMonthView = () => {
      const daysHeader = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
      return (
          <div className="flex flex-col h-full bg-white rounded-b-3xl border-x border-b border-military-100">
             {/* Header Jours */}
             <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
                 {daysHeader.map(d => (
                     <div key={d} className="py-2 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                         {d}
                     </div>
                 ))}
             </div>
             
             {/* Grille */}
             <div className="grid grid-cols-7 auto-rows-fr flex-grow overflow-y-auto">
                 {calendarDays.map((day, i) => {
                     const dayContent = getDayContent(day);
                     const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                     const isToday = day.toDateString() === new Date().toDateString();

                     return (
                         <div 
                            key={i} 
                            onClick={() => {
                                setCurrentDate(day);
                                setViewMode('week');
                            }}
                            className={`min-h-[80px] border-b border-r border-gray-100 p-1 flex flex-col relative transition-colors cursor-pointer hover:bg-gray-50 active:bg-gray-100 ${!isCurrentMonth ? 'bg-gray-50/50' : 'bg-white'}`}
                        >
                            <span className={`text-[10px] font-bold w-6 h-6 flex items-center justify-center rounded-full ml-auto ${isToday ? 'bg-action-500 text-white' : isCurrentMonth ? 'text-military-900' : 'text-gray-300'}`}>
                                {day.getDate()}
                            </span>

                            {/* Indicateurs (Dots pour mobile, Liste pour Tablette) */}
                            <div className="flex-grow flex flex-col justify-end gap-1 mt-1">
                                {dayContent.slice(0, 3).map((item, idx) => (
                                    <div key={idx}>
                                        {/* Version Desktop/Tablette */}
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if(item.type === 'collective') setSelectedCollSession(item.raw);
                                            }}
                                            className="hidden md:block w-full text-left truncate text-[9px] font-bold px-1 rounded bg-military-50 text-military-900 border-l-2 border-action-500 hover:bg-action-100"
                                        >
                                            {item.label}
                                        </button>
                                        {/* Version Mobile (Point) */}
                                        <div 
                                            className={`md:hidden w-2 h-2 rounded-full mx-auto mb-0.5 ${item.type === 'collective' ? 'bg-action-500' : 'bg-military-500'}`}
                                        />
                                    </div>
                                ))}
                                {dayContent.length > 3 && (
                                    <span className="text-[8px] text-gray-400 text-center">+ {dayContent.length - 3}</span>
                                )}
                            </div>
                         </div>
                     );
                 })}
             </div>
          </div>
      );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] md:h-[calc(100vh-140px)]">
      {/* HEADER PRINCIPAL */}
      <div className="bg-military-900 rounded-t-3xl p-4 md:p-6 shadow-lg z-10 shrink-0">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              
              {/* Titre Mois */}
              <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
                <button onClick={() => { const n = new Date(currentDate); n.setDate(n.getDate() - (viewMode === 'month' ? 30 : 7)); setCurrentDate(n); }} className="w-10 h-10 flex items-center justify-center bg-military-800 hover:bg-action-500 text-white rounded-full transition-colors active:scale-95"><span className="material-icons">chevron_left</span></button>
                
                <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-wider text-center">
                    {new Intl.DateTimeFormat('fr-FR', {month: 'long', year: 'numeric'}).format(currentDate)}
                </h2>

                <button onClick={() => { const n = new Date(currentDate); n.setDate(n.getDate() + (viewMode === 'month' ? 30 : 7)); setCurrentDate(n); }} className="w-10 h-10 flex items-center justify-center bg-military-800 hover:bg-action-500 text-white rounded-full transition-colors active:scale-95"><span className="material-icons">chevron_right</span></button>
              </div>

              {/* Contrôles */}
              <div className="flex items-center gap-2 bg-military-800 p-1 rounded-xl w-full md:w-auto">
                  <button 
                    onClick={() => setViewMode('week')} 
                    className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'week' ? 'bg-action-500 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
                  >
                      Semaine
                  </button>
                  <button 
                    onClick={() => setViewMode('month')} 
                    className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'month' ? 'bg-action-500 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
                  >
                      Mois
                  </button>
              </div>

              <button onClick={() => setCurrentDate(new Date())} className="hidden md:block px-4 py-2 bg-military-800 border border-military-700 text-xs font-bold text-gray-300 rounded-xl hover:text-white uppercase transition-colors">
                  Aujourd'hui
              </button>

              {user.role === UserRole.MONITOR && (
                  <div className="flex gap-2 w-full md:w-auto">
                      <label className="cursor-pointer flex flex-1 md:flex-none px-4 py-2 bg-white text-action-500 border border-action-500 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-action-50 active:scale-95 transition-all shadow-sm items-center justify-center gap-2">
                          <span className="material-icons text-sm">upload_file</span> Importer
                          <input type="file" accept=".pdf,.png,.jpg,.jpeg,.xlsx,.csv" className="hidden" onChange={(e) => {
                              if(e.target.files?.length) {
                                  alert("Fichier analysé avec succès. Les séances ont été intégrées au planning (Simulation IA)");
                                  e.target.value = '';
                              }
                          }} />
                      </label>
                      <button onClick={handleCreateNew} className="flex flex-1 md:flex-none px-6 py-2.5 bg-action-500 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-action-600 active:scale-95 transition-all shadow-lg items-center justify-center gap-2">
                          <span className="material-icons text-sm">add</span> Séance
                      </button>
                  </div>
              )}
          </div>
      </div>

      {/* CONTENU SCROLLABLE */}
      <div className="flex-grow bg-white overflow-y-auto custom-scrollbar md:rounded-b-3xl shadow-sm md:border-x md:border-b md:border-military-100 p-4 md:p-0">
          {viewMode === 'week' ? renderWeekView() : renderMonthView()}
      </div>

      {/* MODAL DETAIL / EDITION (FULLSCREEN MOBILE) */}
      {selectedCollSession && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center md:p-4 bg-military-900/80 backdrop-blur-sm">
          <div className="bg-white w-full h-[90vh] md:h-auto md:max-w-lg rounded-t-[32px] md:rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-[slideUp_0.3s_ease-out]">
            
            {/* Modal Header */}
            <div className="p-6 md:p-8 bg-white border-b border-gray-50 flex justify-between items-start shrink-0">
               <div>
                  <h3 className="text-2xl font-black text-military-900 uppercase leading-tight">{isEditing ? 'Modifier' : selectedCollSession.title}</h3>
                  {!isEditing && <p className="text-action-600 text-xs font-bold uppercase tracking-widest mt-1">{selectedCollSession.instructorName}</p>}
               </div>
               <button onClick={() => setSelectedCollSession(null)} className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all active:scale-95">
                  <span className="material-icons">close</span>
               </button>
            </div>

            {/* Modal Content Scrollable */}
            <div className="flex-grow overflow-y-auto p-6 md:p-8 space-y-6">
                {!isEditing ? (
                    // VIEW MODE
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Horaire</span>
                                <div className="flex items-center gap-2 text-military-900 font-bold">
                                    <span className="material-icons text-action-500 text-sm">schedule</span>
                                    {selectedCollSession.timeStart} - {selectedCollSession.timeEnd}
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Lieu</span>
                                <div className="flex items-center gap-2 text-military-900 font-bold">
                                    <span className="material-icons text-action-500 text-sm">place</span>
                                    {selectedCollSession.locationName}
                                </div>
                            </div>
                        </div>

                        <div className="p-5 rounded-2xl border border-gray-100 bg-white">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Description</span>
                            <p className="text-sm text-gray-600 leading-relaxed">{selectedCollSession.detailedDescription}</p>
                        </div>

                        <div className="bg-military-50 p-5 rounded-2xl border border-military-100">
                             <div className="flex justify-between items-center mb-3">
                                <span className="text-[10px] font-black uppercase text-military-500">Inscrits ({selectedCollSession.participants.length}/{selectedCollSession.maxParticipants})</span>
                                {selectedCollSession.participants.length >= selectedCollSession.maxParticipants && <span className="text-[9px] font-black bg-red-100 text-red-600 px-2 py-0.5 rounded">COMPLET</span>}
                             </div>
                             <div className="flex flex-wrap gap-2">
                                {selectedCollSession.participants.map(nid => (
                                  <div key={nid} className="h-8 w-8 rounded-xl bg-white border border-gray-200 text-military-800 flex items-center justify-center text-[10px] font-black shadow-sm">
                                    {nid.slice(-2)}
                                  </div>
                                ))}
                                {selectedCollSession.participants.length === 0 && <span className="text-xs italic text-gray-400">Aucun participant.</span>}
                             </div>
                        </div>
                    </>
                ) : (
                    // EDIT MODE (Monitor Only)
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Titre</label>
                            <input type="text" className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm outline-none border focus:border-action-500" 
                                defaultValue={selectedCollSession.title} onChange={e => setEditData({...editData, title: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Début</label>
                                <input type="time" className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm outline-none border focus:border-action-500" 
                                    defaultValue={selectedCollSession.timeStart} onChange={e => setEditData({...editData, timeStart: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Fin</label>
                                <input type="time" className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm outline-none border focus:border-action-500" 
                                    defaultValue={selectedCollSession.timeEnd} onChange={e => setEditData({...editData, timeEnd: e.target.value})} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Jour</label>
                                <select 
                                    className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm outline-none border focus:border-action-500"
                                    defaultValue={selectedCollSession.dayOfWeek}
                                    onChange={e => setEditData({...editData, dayOfWeek: parseInt(e.target.value)})}
                                >
                                    <option value={1}>Lundi</option>
                                    <option value={2}>Mardi</option>
                                    <option value={3}>Mercredi</option>
                                    <option value={4}>Jeudi</option>
                                    <option value={5}>Vendredi</option>
                                    <option value={6}>Samedi</option>
                                    <option value={7}>Dimanche</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Lieu</label>
                                <input type="text" className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm outline-none border focus:border-action-500" 
                                    defaultValue={selectedCollSession.locationName} onChange={e => setEditData({...editData, locationName: e.target.value})} />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Capacité Max</label>
                            <input type="number" className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm outline-none border focus:border-action-500" 
                                defaultValue={selectedCollSession.maxParticipants} onChange={e => setEditData({...editData, maxParticipants: parseInt(e.target.value)})} />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Description</label>
                            <textarea className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm outline-none border focus:border-action-500 min-h-[100px]" 
                                defaultValue={selectedCollSession.detailedDescription} onChange={e => setEditData({...editData, detailedDescription: e.target.value})} />
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-6 md:p-8 border-t border-gray-50 bg-white shrink-0 pb-10 md:pb-8">
                {user.role === UserRole.MONITOR ? (
                    isEditing ? (
                        <div className="flex gap-3">
                            <button onClick={() => setIsEditing(false)} className="flex-1 py-4 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-military-900 bg-gray-50 rounded-2xl">Annuler</button>
                            <button onClick={handleSave} className="flex-[2] bg-action-500 text-white font-black py-4 rounded-2xl uppercase text-xs tracking-widest shadow-lg hover:bg-action-600 active:scale-95 transition-transform">Enregistrer</button>
                        </div>
                    ) : (
                        <div className="flex gap-3">
                            <button onClick={handleDelete} className="px-6 py-4 bg-red-50 text-red-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-100 transition-colors">
                                <span className="material-icons text-sm">delete</span>
                            </button>
                            <button onClick={() => { setEditData(selectedCollSession); setIsEditing(true); }} className="flex-1 bg-military-100 text-military-800 font-black py-4 rounded-2xl uppercase text-xs tracking-widest hover:bg-military-200">
                                Modifier
                            </button>
                        </div>
                    )
                ) : (
                   <button 
                    onClick={() => { handleToggleJoin(selectedCollSession.id); setSelectedCollSession(null); }}
                    className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${
                      selectedCollSession.participants.includes(user.nid)
                      ? 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100'
                      : 'bg-military-900 text-white hover:bg-military-800'
                    }`}
                    disabled={!selectedCollSession.participants.includes(user.nid) && selectedCollSession.participants.length >= selectedCollSession.maxParticipants}
                  >
                    {selectedCollSession.participants.includes(user.nid) ? (
                        <>Se Désinscrire <span className="material-icons text-sm">logout</span></>
                    ) : (
                        <>S'inscrire <span className="material-icons text-sm">login</span></>
                    )}
                  </button>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
