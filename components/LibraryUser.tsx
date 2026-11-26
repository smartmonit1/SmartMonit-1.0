import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, Session, Program, SportsRoute, RouteType, ExerciseLibraryItem } from '../types';
import { db } from '../services/mockDatabase';
import WorkoutCard from './WorkoutCard';
import ExerciseCatalogBrowser from './ExerciseCatalogBrowser';
import { useToast } from './ToastProvider';

interface LibraryUserProps {
  user: UserProfile;
  onStartSession: (session: Session, type?: 'PROGRAM' | 'LIBRARY') => void;
  defaultTab?: 'sessions' | 'programs' | 'global' | 'routes' | 'exercises';
  defaultProgramId?: string;
}

const LibraryUser: React.FC<LibraryUserProps> = ({
  user,
  onStartSession,
  defaultTab = 'global',
  defaultProgramId
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'sessions' | 'programs' | 'global' | 'routes' | 'exercises'>(defaultTab);
  const [globalSessions, setGlobalSessions] = useState<Session[]>([]);
  const [exercisesList, setExercisesList] = useState<ExerciseLibraryItem[]>([]);
  const [mySessions, setMySessions] = useState<Session[]>([]);
  const [myPrograms, setMyPrograms] = useState<Program[]>([]);
  const [routes, setRoutes] = useState<SportsRoute[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<SportsRoute | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [materialFilter, setMaterialFilter] = useState('all');
  const [bodyFilter, setBodyFilter] = useState('all');
  const [routeTypeFilter, setRouteTypeFilter] = useState('all');
  const [durationFilter, setDurationFilter] = useState('all');

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    const loadData = () => {
      setGlobalSessions(db.getGlobalSessions());
      setExercisesList(db.getExerciseLibrary());
      setRoutes(db.getRoutes().filter((r) => r.serviceId === user.serviceId));

      const programs = db
        .getPrograms()
        .filter(
          (p) =>
            p.userId === user.nid ||
            (p.assignedUserIds && p.assignedUserIds.includes(user.nid)) ||
            (p.assignedUnit && user.unit && p.assignedUnit === user.unit && !p.isTemplate)
        );
      setMyPrograms(programs);

      if (defaultProgramId) {
        const prog = programs.find((p) => p.id === defaultProgramId);
        if (prog) setSelectedProgram(prog);
      }

      const done: Session[] = [];
      programs.forEach((p) => p.sessions.forEach((s) => s.isCompleted && done.push(s)));
      if (user.completedSessions) done.push(...user.completedSessions);
      setMySessions(done);
    };

    loadData();
    window.addEventListener('db_updated', loadData);
    return () => window.removeEventListener('db_updated', loadData);
  }, [user, defaultProgramId]);

  const filterSessions = (sessions: Session[]) => {
    return sessions.filter((s) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        s.title.toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q);
      const matchType = typeFilter === 'all' || (s.workoutType || s.type) === typeFilter;
      const matchLevel = levelFilter === 'all' || s.level === levelFilter;
      const matchMat = materialFilter === 'all' || (s.material && s.material.includes(materialFilter));
      const matchBody = bodyFilter === 'all' || s.bodyZone === bodyFilter;

      let matchDuration = true;
      if (durationFilter === 'under20') matchDuration = s.durationMinutes > 0 && s.durationMinutes < 20;
      else if (durationFilter === '20to45') matchDuration = s.durationMinutes >= 20 && s.durationMinutes <= 45;
      else if (durationFilter === 'over45') matchDuration = s.durationMinutes > 45;

      return matchSearch && matchType && matchLevel && matchMat && matchBody && matchDuration;
    });
  };

  const filteredGlobal = useMemo(
    () => filterSessions(globalSessions),
    [globalSessions, search, typeFilter, levelFilter, materialFilter, bodyFilter, durationFilter]
  );

  const filteredRoutes = useMemo(
    () =>
      routes.filter((r) => {
        const q = search.toLowerCase();
        const matchSearch = !q || r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q);
        const matchType = routeTypeFilter === 'all' || r.type === routeTypeFilter;
        return matchSearch && matchType;
      }),
    [routes, search, routeTypeFilter]
  );

  const downloadGPX = (route: SportsRoute) => {
    const blob = new Blob([route.gpxContent], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${route.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.gpx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Fichier GPX téléchargé : ${route.name}`, 'success');
  };

  const openInApp = async (route: SportsRoute) => {
    try {
      const file = new File([route.gpxContent], `${route.name.replace(/\s+/g, '_')}.gpx`, { type: 'application/gpx+xml' });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: route.name, text: `Parcours GPX : ${route.name}` });
      } else {
        downloadGPX(route);
      }
    } catch {
      downloadGPX(route);
    }
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s]">
      <div>
        <h2 className="text-2xl md:text-3xl font-black text-military-900 uppercase tracking-tight">
          Bibliothèque EPMS
        </h2>
        <p className="text-sm text-military-500 font-medium">
          Parcours GPX de votre base, bibliothèque nationale ({globalSessions.length} séances & WODs) et vos programmes.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 border-b border-gray-200 no-scrollbar" role="group" aria-label="Rubriques de la bibliothèque">
        {[
          { id: 'global', label: `Séances & WODs (${globalSessions.length})` },
          { id: 'exercises', label: `Exercices (${exercisesList.length})` },
          { id: 'routes', label: `Parcours GPX (${routes.length})` },
          { id: 'programs', label: `Mes Programmes (${myPrograms.length})` },
          { id: 'sessions', label: `Terminées (${mySessions.length})` }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-pressed={activeTab === tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              setSelectedProgram(null);
            }}
            className={`px-5 py-3 rounded-t-2xl font-black uppercase tracking-wider text-xs whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-military-900 border-t-2 border-l border-r border-gray-200 border-t-action-500'
                : 'text-gray-500 hover:text-military-900 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filtres */}
      {(activeTab === 'global' || activeTab === 'sessions' || activeTab === 'routes') && (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-military-100 flex flex-wrap gap-3">
          <div className="flex-grow min-w-[200px] relative">
            <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
            <input
              type="text"
              placeholder={activeTab === 'routes' ? 'Rechercher un parcours...' : 'Rechercher un WOD, un mouvement...'}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-action-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {activeTab !== 'routes' ? (
            <>
              <select
                className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs uppercase outline-none"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="all">Tous types</option>
                <option value="AMRAP">AMRAP</option>
                <option value="TABATA">TABATA</option>
                <option value="EMOM">EMOM</option>
                <option value="FOR TIME">FOR TIME</option>
                <option value="HYROX">HYROX</option>
                <option value="MUSCU">MUSCU</option>
                <option value="CARDIO">CARDIO</option>
                <option value="MOBILITE">MOBILITÉ</option>
              </select>
              <select
                className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs uppercase outline-none"
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
              >
                <option value="all">Tous niveaux</option>
                <option value="Facile">Facile</option>
                <option value="Moyen">Moyen</option>
                <option value="Intense">Intense</option>
              </select>
              <select
                className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs uppercase outline-none"
                value={materialFilter}
                onChange={(e) => setMaterialFilter(e.target.value)}
              >
                <option value="all">Tout matériel</option>
                <option value="poids-corps">Sans matériel</option>
                <option value="barre">Barre</option>
                <option value="traction">Traction</option>
                <option value="rameur">Rameur</option>
                <option value="bike-erg">BikeErg</option>
                <option value="box-jump">Box Jump</option>
              </select>
              <select
                className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs uppercase outline-none"
                value={bodyFilter}
                onChange={(e) => setBodyFilter(e.target.value)}
              >
                <option value="all">Toutes zones</option>
                <option value="complet">Complet</option>
                <option value="haut">Haut</option>
                <option value="bas">Bas</option>
                <option value="abdos">Abdos</option>
              </select>
              <select
                className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs uppercase outline-none"
                value={durationFilter}
                onChange={(e) => setDurationFilter(e.target.value)}
              >
                <option value="all">Toutes durées</option>
                <option value="under20">&lt; 20 min</option>
                <option value="20to45">20 - 45 min</option>
                <option value="over45">&gt; 45 min</option>
              </select>
            </>
          ) : (
            <select
              className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs uppercase outline-none"
              value={routeTypeFilter}
              onChange={(e) => setRouteTypeFilter(e.target.value)}
            >
              <option value="all">Tous les sports</option>
              <option value={RouteType.RUNNING}>{RouteType.RUNNING}</option>
              <option value={RouteType.VTT}>{RouteType.VTT}</option>
              <option value={RouteType.CYCLING}>{RouteType.CYCLING}</option>
            </select>
          )}
        </div>
      )}

      {/* Contenu */}
      {activeTab === 'global' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredGlobal.length === 0 ? (
            <div className="col-span-full text-center py-10 text-gray-400 italic">Aucune séance trouvée.</div>
          ) : (
            filteredGlobal.map((s) => (
              <WorkoutCard
                key={s.id}
                session={s}
                onAction={(sess) => onStartSession(sess, 'LIBRARY')}
                actionLabel="Démarrer la séance"
              />
            ))
          )}
        </div>
      )}

      {activeTab === 'sessions' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filterSessions(mySessions).length === 0 ? (
            <div className="col-span-full text-center py-10 text-gray-400 italic">Aucune séance terminée pour le moment.</div>
          ) : (
            filterSessions(mySessions).map((s, idx) => (
              <WorkoutCard
                key={`${s.id}_${idx}`}
                session={s}
                onAction={(sess) => onStartSession(sess, 'LIBRARY')}
                actionLabel="Refaire la séance"
              />
            ))
          )}
        </div>
      )}

      {activeTab === 'programs' &&
        (selectedProgram ? (
          <div>
            <button
              onClick={() => setSelectedProgram(null)}
              className="mb-4 text-military-700 font-black text-xs uppercase flex items-center gap-1 hover:text-action-600"
            >
              <span className="material-icons text-sm">arrow_back</span> Retour aux programmes
            </button>
            <div className="mb-5">
              <h3 className="text-2xl font-black text-military-900 uppercase">{selectedProgram.title}</h3>
              <p className="text-sm text-gray-500">{selectedProgram.goal}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {selectedProgram.sessions.map((s) => (
                <WorkoutCard
                  key={s.id}
                  session={s}
                  onAction={(sess) => onStartSession({ ...sess, programId: selectedProgram.id }, 'PROGRAM')}
                  actionLabel={s.isCompleted ? 'Refaire la séance ✓' : 'Démarrer la séance'}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {myPrograms.length === 0 ? (
              <div className="col-span-full text-center py-10 text-gray-400 italic">Aucun programme affecté.</div>
            ) : (
              myPrograms.map((p) => (
                <div key={p.id} className="bg-white p-6 rounded-2xl shadow-sm border border-military-100 flex flex-col">
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <h3 className="text-lg font-black text-military-900 uppercase">{p.title}</h3>
                    <span className="bg-military-100 text-military-800 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">
                      {p.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-4 flex-grow">{p.goal}</p>
                  <div className="flex gap-4 text-xs font-bold text-military-500 mb-5">
                    <span>{p.durationWeeks} semaines</span>
                    <span>• {p.sessionsPerWeek} séa/sem</span>
                    <span>• {p.sessions.filter((s) => s.isCompleted).length}/{p.sessions.length} faites</span>
                  </div>
                  <button
                    onClick={() => setSelectedProgram(p)}
                    className="w-full bg-military-900 hover:bg-military-800 text-white py-3 rounded-xl font-black uppercase text-xs tracking-wider"
                  >
                    Ouvrir les séances
                  </button>
                </div>
              ))
            )}
          </div>
        ))}

      {activeTab === 'exercises' && (
        <ExerciseCatalogBrowser exercises={exercisesList} mode="catalog" />
      )}

      {activeTab === 'routes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRoutes.length === 0 ? (
            <div className="col-span-full text-center py-10 text-gray-400 italic">Aucun parcours GPX disponible sur votre base.</div>
          ) : (
            filteredRoutes.map((r) => (
              <div
                key={r.id}
                onClick={() => setSelectedRoute(r)}
                className="bg-white rounded-2xl shadow-sm border border-military-100 flex flex-col overflow-hidden cursor-pointer hover:shadow-md transition-all group"
              >
                <div className="h-36 bg-gradient-to-br from-military-800 to-military-950 p-5 flex flex-col justify-between relative">
                  <span
                    className={`self-end px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                      r.type === RouteType.RUNNING
                        ? 'bg-blue-500 text-white'
                        : r.type === RouteType.VTT
                        ? 'bg-emerald-500 text-white'
                        : 'bg-orange-500 text-white'
                    }`}
                  >
                    {r.type}
                  </span>
                  <div className="flex items-end justify-between text-white">
                    <div>
                      <div className="text-2xl font-black leading-none">{r.distanceKm} km</div>
                      <div className="text-[11px] text-action-400 font-bold mt-1">D+ {r.elevationMeters} m</div>
                    </div>
                    <span className="material-icons text-4xl text-white/20 group-hover:text-action-400/50 transition-colors">
                      route
                    </span>
                  </div>
                </div>
                <div className="p-5 flex flex-col flex-grow">
                  <h3 className="text-base font-black text-military-900 uppercase mb-1.5">{r.name}</h3>
                  <p className="text-xs text-gray-600 line-clamp-2 flex-grow">{r.description}</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadGPX(r);
                    }}
                    className="mt-4 w-full py-2.5 bg-military-50 hover:bg-military-900 hover:text-white text-military-900 rounded-xl font-black uppercase text-[11px] tracking-wider transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span className="material-icons text-sm">download</span> Télécharger GPX
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal Détails Parcours */}
      {selectedRoute && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[80] flex items-center justify-center p-4"
          onClick={() => setSelectedRoute(null)}
        >
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-[zoomIn_0.2s]" onClick={(e) => e.stopPropagation()}>
            <div className="bg-military-900 p-6 text-white flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase bg-action-500 text-military-950 px-2.5 py-0.5 rounded">
                  {selectedRoute.type}
                </span>
                <h3 className="text-xl font-black uppercase mt-2">{selectedRoute.name}</h3>
              </div>
              <button onClick={() => setSelectedRoute(null)} className="text-gray-300 hover:text-white">
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-4 rounded-2xl text-center">
                  <span className="text-[10px] font-black uppercase text-gray-400 block">Distance</span>
                  <span className="text-2xl font-black text-military-900">{selectedRoute.distanceKm} km</span>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl text-center">
                  <span className="text-[10px] font-black uppercase text-gray-400 block">Dénivelé +</span>
                  <span className="text-2xl font-black text-military-900">+{selectedRoute.elevationMeters} m</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">{selectedRoute.description}</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => openInApp(selectedRoute)}
                  className="py-3 bg-military-900 text-white rounded-xl font-black uppercase text-xs flex items-center justify-center gap-1.5"
                >
                  <span className="material-icons text-sm">share</span> Ouvrir / Partager
                </button>
                <button
                  onClick={() => downloadGPX(selectedRoute)}
                  className="py-3 bg-action-500 text-military-950 rounded-xl font-black uppercase text-xs flex items-center justify-center gap-1.5"
                >
                  <span className="material-icons text-sm">download</span> Fichier GPX
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
