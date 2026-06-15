import React, { useState, useEffect } from 'react';
import { UserProfile, Session, Program, SportsRoute, RouteType } from '../types';
import { db } from '../services/mockDatabase';
import WorkoutCard from './WorkoutCard';

interface LibraryUserProps {
  user: UserProfile;
  onStartSession: (session: Session) => void;
  defaultTab?: 'sessions' | 'programs' | 'global' | 'routes';
  defaultProgramId?: string;
}

const LibraryUser: React.FC<LibraryUserProps> = ({ user, onStartSession, defaultTab = 'routes', defaultProgramId }) => {
  const [activeTab, setActiveTab] = useState<'sessions' | 'programs' | 'global' | 'routes'>(defaultTab);
  const [globalSessions, setGlobalSessions] = useState<Session[]>([]);
  const [mySessions, setMySessions] = useState<Session[]>([]);
  const [myPrograms, setMyPrograms] = useState<Program[]>([]);
  const [routes, setRoutes] = useState<SportsRoute[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<SportsRoute | null>(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [routeTypeFilter, setRouteTypeFilter] = useState('all');
  const [durationFilter, setDurationFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');

  const [infras, setInfras] = useState(db.getInfrastructures().filter(i => i.serviceId === user.serviceId));

  const loadData = () => {
    setGlobalSessions(db.getGlobalSessions());
    setRoutes(db.getRoutes().filter(r => r.serviceId === user.serviceId));
    setInfras(db.getInfrastructures().filter(i => i.serviceId === user.serviceId));
    
    // Get user's past sessions from their programs
    const programs = db.getPrograms().filter(p => p.userId === user.nid);
    setMyPrograms(programs);
    
    if (defaultProgramId) {
      const prog = programs.find(p => p.id === defaultProgramId);
      if (prog) setSelectedProgram(prog);
    }
    
    const sessions: Session[] = [];
    programs.forEach(p => {
      p.sessions.forEach(s => {
        if (s.isCompleted) {
          sessions.push(s);
        }
      });
    });
    
    if (user.completedSessions) {
      sessions.push(...user.completedSessions);
    }
    
    setMySessions(sessions);
  };

  useEffect(() => {
    loadData();
    window.addEventListener('db_updated', loadData);
    return () => window.removeEventListener('db_updated', loadData);
  }, [user, defaultProgramId]);

  const filterSessions = (sessions: Session[]) => {
    return sessions.filter(s => {
      const matchSearch = s.title.toLowerCase().includes(search.toLowerCase()) || 
                          s.description.toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === 'all' || s.workoutType === typeFilter;
      const matchLevel = levelFilter === 'all' || s.level === levelFilter;
      
      let matchDuration = true;
      if (durationFilter === 'under30') matchDuration = s.durationMinutes < 30;
      else if (durationFilter === '30to60') matchDuration = s.durationMinutes >= 30 && s.durationMinutes <= 60;
      else if (durationFilter === 'over60') matchDuration = s.durationMinutes > 60;

      const matchLocation = locationFilter === 'all' || s.infrastructureId === locationFilter;

      return matchSearch && matchType && matchLevel && matchDuration && matchLocation;
    });
  };

  const filterRoutes = () => {
    return routes.filter(r => {
      const matchSearch = r.name.toLowerCase().includes(search.toLowerCase()) || 
                          r.description.toLowerCase().includes(search.toLowerCase());
      const matchType = routeTypeFilter === 'all' || r.type === routeTypeFilter;
      return matchSearch && matchType;
    });
  };

  const downloadGPX = (route: SportsRoute) => {
    const blob = new Blob([route.gpxContent], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${route.name.replace(/\s+/g, '_')}.gpx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const openInApp = async (route: SportsRoute) => {
    try {
      const file = new File([route.gpxContent], `${route.name.replace(/\s+/g, '_')}.gpx`, { type: 'application/gpx+xml' });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: route.name,
          text: `Parcours GPX: ${route.name}`,
        });
      } else {
        // Fallback: download if share not supported
        downloadGPX(route);
        alert("Le partage de fichiers n'est pas supporté sur ce navigateur. Le fichier a été téléchargé.");
      }
    } catch (err) {
      console.error("Erreur partage:", err);
      downloadGPX(route);
    }
  };

  const renderSessions = (sessions: Session[]) => {
    const filtered = filterSessions(sessions);
    if (filtered.length === 0) {
      return <div className="text-center py-10 text-gray-500">Aucune séance trouvée.</div>;
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(s => (
          <WorkoutCard 
            key={s.id} 
            session={s} 
            onAction={onStartSession} 
            actionLabel="Démarrer la séance" 
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-military-900 uppercase tracking-tight">Bibliothèque</h2>
          <p className="text-military-500 font-medium">Retrouvez toutes les séances et programmes.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-gray-200">
        <button 
          onClick={() => setActiveTab('routes')}
          className={`px-6 py-3 rounded-t-xl font-bold uppercase tracking-wider text-sm whitespace-nowrap transition-colors ${activeTab === 'routes' ? 'bg-white text-military-900 border-t-2 border-l border-r border-gray-200 border-t-action-500' : 'text-gray-500 hover:text-military-900 hover:bg-gray-50'}`}
        >
          Parcours
        </button>
        <button 
          onClick={() => setActiveTab('global')}
          className={`px-6 py-3 rounded-t-xl font-bold uppercase tracking-wider text-sm whitespace-nowrap transition-colors ${activeTab === 'global' ? 'bg-white text-military-900 border-t-2 border-l border-r border-gray-200 border-t-action-500' : 'text-gray-500 hover:text-military-900 hover:bg-gray-50'}`}
        >
          Séances type
        </button>
        <button 
          onClick={() => setActiveTab('sessions')}
          className={`px-6 py-3 rounded-t-xl font-bold uppercase tracking-wider text-sm whitespace-nowrap transition-colors ${activeTab === 'sessions' ? 'bg-white text-military-900 border-t-2 border-l border-r border-gray-200 border-t-action-500' : 'text-gray-500 hover:text-military-900 hover:bg-gray-50'}`}
        >
          Mes Séances
        </button>
        <button 
          onClick={() => setActiveTab('programs')}
          className={`px-6 py-3 rounded-t-xl font-bold uppercase tracking-wider text-sm whitespace-nowrap transition-colors ${activeTab === 'programs' ? 'bg-white text-military-900 border-t-2 border-l border-r border-gray-200 border-t-action-500' : 'text-gray-500 hover:text-military-900 hover:bg-gray-50'}`}
        >
          Mes Programmes
        </button>
      </div>

      {/* Filters */}
      {(activeTab === 'global' || activeTab === 'sessions' || activeTab === 'routes') && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4">
          <div className="flex-grow min-w-[200px] relative">
            <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
            <input 
              type="text" 
              placeholder={activeTab === 'routes' ? "Rechercher un parcours..." : "Rechercher une séance..."}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-action-500 font-medium"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          
          {activeTab !== 'routes' ? (
            <>
              <select 
                className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-action-500 font-bold text-sm uppercase tracking-wider"
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
              >
                <option value="all">Tous les types</option>
                <option value="AMRAP">AMRAP</option>
                <option value="TABATA">TABATA</option>
                <option value="EMOM">EMOM</option>
                <option value="FOR TIME">FOR TIME</option>
                <option value="HYROX">HYROX</option>
                <option value="MUSCU">MUSCU - RENFO</option>
                <option value="CARDIO">CARDIO - FRACTIONNE</option>
              </select>
              <select 
                className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-action-500 font-bold text-sm uppercase tracking-wider"
                value={levelFilter}
                onChange={e => setLevelFilter(e.target.value)}
              >
                <option value="all">Tous niveaux</option>
                <option value="Facile">Facile</option>
                <option value="Moyen">Moyen</option>
                <option value="Intense">Intense</option>
              </select>
              <select 
                className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-action-500 font-bold text-sm uppercase tracking-wider"
                value={durationFilter}
                onChange={e => setDurationFilter(e.target.value)}
              >
                <option value="all">Toutes durées</option>
                <option value="under30">&lt; 30 min</option>
                <option value="30to60">30 - 60 min</option>
                <option value="over60">&gt; 60 min</option>
              </select>
              <select 
                className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-action-500 font-bold text-sm uppercase tracking-wider"
                value={locationFilter}
                onChange={e => setLocationFilter(e.target.value)}
              >
                <option value="all">Tous les lieux</option>
                {infras.map(infra => (
                  <option key={infra.id} value={infra.id}>{infra.name}</option>
                ))}
              </select>
            </>
          ) : (
            <select 
              className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-action-500 font-bold text-sm uppercase tracking-wider"
              value={routeTypeFilter}
              onChange={e => setRouteTypeFilter(e.target.value)}
            >
              <option value="all">Tous les types</option>
              <option value={RouteType.RUNNING}>{RouteType.RUNNING}</option>
              <option value={RouteType.VTT}>{RouteType.VTT}</option>
              <option value={RouteType.CYCLING}>{RouteType.CYCLING}</option>
            </select>
          )}
        </div>
      )}

      {/* Content */}
      <div className="mt-6">
        {activeTab === 'global' && renderSessions(globalSessions)}
        {activeTab === 'sessions' && renderSessions(mySessions)}
        {activeTab === 'programs' && (
          selectedProgram ? (
            <div>
              <button onClick={() => setSelectedProgram(null)} className="mb-4 text-military-600 font-bold flex items-center gap-1 hover:text-military-900">
                <span className="material-icons text-sm">arrow_back</span> Retour aux programmes
              </button>
              <h2 className="text-2xl font-black text-military-900 uppercase mb-6">{selectedProgram.title}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {selectedProgram.sessions.map(s => (
                  <WorkoutCard 
                    key={s.id} 
                    session={s} 
                    onAction={onStartSession} 
                    actionLabel={s.isCompleted ? "Refaire la séance" : "Démarrer la séance"} 
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {myPrograms.length === 0 ? (
                <div className="col-span-full text-center py-10 text-gray-500">Aucun programme trouvé.</div>
              ) : (
                myPrograms.map(p => (
                  <div key={p.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-black text-military-900 uppercase tracking-tight">{p.title}</h3>
                      <span className="bg-military-100 text-military-800 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        {p.type || 'Général'}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-4 font-medium flex-grow">{p.goal}</p>
                    <div className="flex gap-4 text-sm font-bold text-military-500 mb-6">
                      <span className="flex items-center gap-1"><span className="material-icons text-sm">calendar_today</span> {p.durationWeeks} semaines</span>
                      <span className="flex items-center gap-1"><span className="material-icons text-sm">fitness_center</span> {p.sessionsPerWeek} séances/sem</span>
                    </div>
                    <button 
                      onClick={() => setSelectedProgram(p)}
                      className="w-full bg-military-900 hover:bg-military-800 text-white px-4 py-3 rounded-xl font-bold uppercase tracking-wider text-sm transition-colors"
                    >
                      Voir les séances
                    </button>
                  </div>
                ))
              )}
            </div>
          )
        )}
        {activeTab === 'routes' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filterRoutes().length === 0 ? (
              <div className="col-span-full text-center py-10 text-gray-500">Aucun parcours trouvé.</div>
            ) : (
              filterRoutes().map(r => (
                <div 
                  key={r.id} 
                  onClick={() => setSelectedRoute(r)}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden cursor-pointer hover:shadow-md transition-all group"
                >
                  <div className="h-40 bg-gray-200 relative overflow-hidden">
                    <img 
                      src={r.mapImageUrl || `https://picsum.photos/seed/${r.id}/800/600`} 
                      alt={r.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-3 right-3">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm ${
                        r.type === RouteType.RUNNING ? 'bg-blue-600 text-white' :
                        r.type === RouteType.VTT ? 'bg-green-600 text-white' :
                        'bg-orange-600 text-white'
                      }`}>
                        {r.type}
                      </span>
                    </div>
                  </div>
                  <div className="p-5 flex flex-col flex-grow">
                    <h3 className="text-lg font-black text-military-900 uppercase tracking-tight mb-2">{r.name}</h3>
                    <p className="text-gray-600 text-sm mb-4 font-medium line-clamp-2 flex-grow">{r.description}</p>
                    <div className="flex justify-between items-center text-xs font-bold text-military-500 bg-gray-50 p-2 rounded-lg">
                      <span className="flex items-center gap-1"><span className="material-icons text-sm">straighten</span> {r.distanceKm} km</span>
                      <span className="flex items-center gap-1"><span className="material-icons text-sm">terrain</span> +{r.elevationMeters}m</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Route Details Modal */}
      {selectedRoute && (
        <div className="fixed inset-0 bg-military-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-[fadeIn_0.2s]">
          <div className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl animate-[scaleIn_0.3s]">
            <div className="relative h-64 md:h-80 bg-gray-200">
              <img 
                src={selectedRoute.mapImageUrl || `https://picsum.photos/seed/${selectedRoute.id}/800/600`} 
                alt={selectedRoute.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <button 
                onClick={() => setSelectedRoute(null)}
                className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white p-2 rounded-full transition-colors"
              >
                <span className="material-icons">close</span>
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
                    selectedRoute.type === RouteType.RUNNING ? 'bg-blue-500 text-white' :
                    selectedRoute.type === RouteType.VTT ? 'bg-green-500 text-white' :
                    'bg-orange-500 text-white'
                  }`}>
                    {selectedRoute.type}
                  </span>
                </div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">{selectedRoute.name}</h3>
              </div>
            </div>

            <div className="p-6 md:p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Distance</span>
                  <span className="text-2xl font-black text-military-900">{selectedRoute.distanceKm} <span className="text-sm">km</span></span>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Dénivelé</span>
                  <span className="text-2xl font-black text-military-900">+{selectedRoute.elevationMeters} <span className="text-sm">m</span></span>
                </div>
              </div>

              <div>
                <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Description</span>
                <p className="text-gray-600 font-medium leading-relaxed">{selectedRoute.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4">
                <button 
                  onClick={() => openInApp(selectedRoute)}
                  className="flex items-center justify-center gap-3 bg-military-900 hover:bg-military-800 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95"
                >
                  <span className="material-icons text-sm">open_in_new</span>
                  Ouvrir dans une application
                </button>
                <button 
                  onClick={() => downloadGPX(selectedRoute)}
                  className="flex items-center justify-center gap-3 bg-gray-100 hover:bg-gray-200 text-military-900 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95"
                >
                  <span className="material-icons text-sm">download</span>
                  Télécharger le fichier GPX
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibraryUser;
