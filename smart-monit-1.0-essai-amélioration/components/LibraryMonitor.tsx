import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, Session, Program, ExerciseLibraryItem, SportsRoute, RouteType } from '../types';
import { db } from '../services/mockDatabase';
import { getBaseCode } from '../utils/bases';
import WorkoutCard from './WorkoutCard';
import SessionCreator from './SessionCreator';
import ProgramBuilder from './ProgramBuilder';
import { useToast } from './ToastProvider';
import ExerciseCatalogBrowser from './ExerciseCatalogBrowser';

interface LibraryMonitorProps {
  user: UserProfile;
}

const LibraryMonitor: React.FC<LibraryMonitorProps> = ({ user }) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'sessions' | 'programs' | 'exercises' | 'routes'>('sessions');
  const [globalSessions, setGlobalSessions] = useState<Session[]>([]);
  const [allPrograms, setAllPrograms] = useState<Program[]>([]);
  const [exercises, setExercises] = useState<ExerciseLibraryItem[]>([]);
  const [routes, setRoutes] = useState<SportsRoute[]>([]);

  // Creators / Editors
  const [showSessionCreator, setShowSessionCreator] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [newEx, setNewEx] = useState<Partial<ExerciseLibraryItem>>({
    name: '',
    muscleGroup: 'Pectoraux',
    equipment: 'PDC',
    type: 'Force',
    difficulty: 'Intermédiaire'
  });

  // GPX Import State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [parsedRoute, setParsedRoute] = useState<Partial<SportsRoute> | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [routeTypeFilter, setRouteTypeFilter] = useState('all');
  const [programScope, setProgramScope] = useState<'ALL' | 'MINE' | 'NATIONAL'>('ALL');

  const loadData = () => {
    setGlobalSessions(db.getGlobalSessions());
    setAllPrograms(db.getPrograms());
    setExercises(db.getExerciseLibrary());
    setRoutes(db.getRoutes().filter((r) => r.serviceId === user.serviceId));
  };

  useEffect(() => {
    loadData();
    window.addEventListener('db_updated', loadData);
    return () => window.removeEventListener('db_updated', loadData);
  }, [user.serviceId]);

  const filterSessions = (sessions: Session[]) =>
    sessions.filter((s) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        s.title.toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q) ||
        (s.createdByBase || '').toLowerCase().includes(q);
      const matchType = typeFilter === 'all' || (s.workoutType || s.type) === typeFilter;
      const matchLevel = levelFilter === 'all' || s.level === levelFilter;
      return matchSearch && matchType && matchLevel;
    });

  const filteredPrograms = allPrograms.filter((p) => {
    if (programScope === 'MINE') return p.createdByBase === getBaseCode(user.serviceId) || p.createdByNid === user.nid;
    if (programScope === 'NATIONAL') return p.isSharedNational || p.isTemplate;
    return true;
  });

  const filterRoutes = () =>
    routes.filter((r) => {
      const q = search.toLowerCase();
      const matchSearch = !q || r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q);
      const matchType = routeTypeFilter === 'all' || r.type === routeTypeFilter;
      return matchSearch && matchType;
    });

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
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.name.toLowerCase().endsWith('.gpx')) {
      setIsAnalyzing(true);
      setIsImportModalOpen(true);

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(content, 'text/xml');
        const nameNode = xmlDoc.querySelector('name');
        const name = nameNode?.textContent || file.name.replace(/\.gpx$/i, '');

        const trkpts = xmlDoc.querySelectorAll('trkpt');
        let distance = 0;
        let elevation = 0;
        let lastLat: number | null = null;
        let lastLon: number | null = null;
        let lastEle: number | null = null;
        const R = 6371;
        const toRad = (val: number) => (val * Math.PI) / 180;

        trkpts.forEach((pt) => {
          const lat = parseFloat(pt.getAttribute('lat') || '0');
          const lon = parseFloat(pt.getAttribute('lon') || '0');
          const eleNode = pt.querySelector('ele');
          const ele = eleNode ? parseFloat(eleNode.textContent || '0') : null;

          if (lastLat !== null && lastLon !== null) {
            const dLat = toRad(lat - lastLat);
            const dLon = toRad(lon - lastLon);
            const a =
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lastLat)) * Math.cos(toRad(lat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
            distance += R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
          }
          if (lastEle !== null && ele !== null && ele > lastEle) {
            elevation += ele - lastEle;
          }
          lastLat = lat;
          lastLon = lon;
          lastEle = ele;
        });

        setParsedRoute({
          id: `route_${Date.now()}`,
          name,
          description: `Parcours officiel importé par ${user.name}.`,
          type: RouteType.RUNNING,
          distanceKm: parseFloat(distance.toFixed(2)),
          elevationMeters: Math.round(elevation),
          gpxContent: content
        });
        setIsAnalyzing(false);
      };
      reader.readAsText(file);
    } else {
      showToast('Sélectionnez un fichier .gpx pour importer un parcours.', 'warning');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveRoute = () => {
    if (parsedRoute && parsedRoute.id) {
      const newRoute = { ...(parsedRoute as SportsRoute), serviceId: user.serviceId || 'ear927' };
      db.addRoute(newRoute);
      setIsImportModalOpen(false);
      setParsedRoute(null);
      setActiveTab('routes');
      showToast('Parcours GPX ajouté et synchronisé sur votre base.', 'success');
    }
  };

  const handleCreateExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEx.name?.trim()) return;
    db.addExercise({
      id: `ex_${Date.now()}`,
      name: newEx.name.trim(),
      muscleGroup: newEx.muscleGroup || 'Complet',
      equipment: newEx.equipment || 'PDC',
      type: newEx.type || 'Force',
      difficulty: newEx.difficulty || 'Intermédiaire',
      createdByBase: getBaseCode(user.serviceId)
    });
    setShowAddExercise(false);
    setNewEx({ name: '', muscleGroup: 'Pectoraux', equipment: 'PDC', type: 'Force', difficulty: 'Intermédiaire' });
    showToast('Exercice ajouté au référentiel national EPMS.', 'success');
  };

  if (showSessionCreator) {
    return (
      <SessionCreator
        user={user}
        onSessionCreated={(newSess) => {
          db.upsertGlobalSession({
            ...newSess,
            isGlobal: true,
            createdByName: user.name,
            createdByBase: getBaseCode(user.serviceId)
          });
          setShowSessionCreator(false);
          showToast('Séance ajoutée à la Mémoire EPMS nationale !', 'success');
        }}
        onCancel={() => setShowSessionCreator(false)}
      />
    );
  }

  if (editingProgram) {
    return (
      <ProgramBuilder
        user={user}
        existingProgram={editingProgram}
        onClose={() => setEditingProgram(null)}
      />
    );
  }

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-military-900 uppercase tracking-tight">
            Mémoire EPMS & Bibliothèque
          </h2>
          <p className="text-sm text-military-500 font-medium">
            Mutualisation nationale AAE des séances, programmes directeurs, exercices et parcours GPX.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <input type="file" accept=".gpx" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 md:flex-none bg-action-500 hover:bg-action-400 text-military-950 px-4 py-2.5 rounded-xl font-black uppercase text-xs flex items-center justify-center gap-1.5 shadow-sm"
          >
            <span className="material-icons text-sm">route</span> Import GPX
          </button>
          <button
            onClick={() => setShowSessionCreator(true)}
            className="flex-1 md:flex-none bg-military-900 hover:bg-military-800 text-white px-4 py-2.5 rounded-xl font-black uppercase text-xs flex items-center justify-center gap-1.5 shadow-sm"
          >
            <span className="material-icons text-sm">add</span> Créer Séance
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 border-b border-gray-200 no-scrollbar" role="group" aria-label="Rubriques de la bibliothèque">
        {[
          { id: 'sessions', label: `Séances (${globalSessions.length})` },
          { id: 'programs', label: `Programmes (${allPrograms.length})` },
          { id: 'routes', label: `Parcours GPX (${routes.length})` },
          { id: 'exercises', label: `Exercices (${exercises.length})` }
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={activeTab === t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`px-5 py-3 rounded-t-2xl font-black uppercase tracking-wider text-xs whitespace-nowrap transition-colors ${
              activeTab === t.id
                ? 'bg-white text-military-900 border-t-2 border-l border-r border-gray-200 border-t-action-500'
                : 'text-gray-500 hover:text-military-900 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      {(activeTab === 'sessions' || activeTab === 'routes') && (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-military-100 flex flex-col md:flex-row gap-3">
          <div className="flex-grow relative">
            <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
            <input
              type="text"
              placeholder={activeTab === 'routes' ? 'Rechercher un parcours...' : 'Rechercher par titre, base ou mot-clé...'}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-action-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {activeTab === 'sessions' ? (
            <>
              <select className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs uppercase" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
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
              <select className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs uppercase" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
                <option value="all">Tous niveaux</option>
                <option value="Facile">Facile</option>
                <option value="Moyen">Moyen</option>
                <option value="Intense">Intense</option>
              </select>
            </>
          ) : (
            <select className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs uppercase" value={routeTypeFilter} onChange={(e) => setRouteTypeFilter(e.target.value)}>
              <option value="all">Tous sports</option>
              <option value={RouteType.RUNNING}>{RouteType.RUNNING}</option>
              <option value={RouteType.VTT}>{RouteType.VTT}</option>
              <option value={RouteType.CYCLING}>{RouteType.CYCLING}</option>
            </select>
          )}
        </div>
      )}

      {/* Sessions */}
      {activeTab === 'sessions' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filterSessions(globalSessions).map((s) => (
            <WorkoutCard
              key={s.id}
              session={s}
              onAction={() => {
                if (window.confirm(`Supprimer "${s.title}" de la bibliothèque ?`)) {
                  db.deleteGlobalSession(s.id);
                  showToast('Séance retirée de la bibliothèque.', 'info');
                }
              }}
              actionLabel="Retirer de la bibliothèque"
            />
          ))}
        </div>
      )}

      {/* Programmes (Mutualisation EPMS AAE) */}
      {activeTab === 'programs' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {[
              { id: 'ALL', label: 'Tous' },
              { id: 'MINE', label: `Ma Base (${getBaseCode(user.serviceId)})` },
              { id: 'NATIONAL', label: 'Mémoire Nationale AAE' }
            ].map((sc) => (
              <button
                key={sc.id}
                onClick={() => setProgramScope(sc.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase ${
                  programScope === sc.id ? 'bg-military-900 text-white' : 'bg-white border border-gray-200 text-gray-600'
                }`}
              >
                {sc.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPrograms.length === 0 ? (
              <div className="col-span-full text-center py-10 text-gray-400 italic">Aucun programme trouvé.</div>
            ) : (
              filteredPrograms.map((p) => (
                <div key={p.id} className="bg-white p-5 rounded-2xl shadow-sm border border-military-100 flex justify-between items-start gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {p.isSharedNational && (
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                          Mutualisé AAE
                        </span>
                      )}
                      {p.createdByBase && (
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                          {p.createdByBase}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-black text-military-900 uppercase">{p.title}</h3>
                    <p className="text-xs text-gray-600 mt-1">{p.goal}</p>
                    <p className="text-[11px] text-gray-400 mt-2 font-semibold">
                      {p.durationWeeks} sem • {p.sessions.length} séance(s) {p.createdByName ? `• par ${p.createdByName}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => setEditingProgram(p)}
                    className="bg-military-100 hover:bg-military-900 hover:text-white text-military-900 p-2.5 rounded-xl transition-colors shrink-0"
                    title="Ouvrir / Adapter dans le Program Builder"
                  >
                    <span className="material-icons text-lg">edit</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Exercices */}
      {activeTab === 'exercises' && (
        <ExerciseCatalogBrowser
          exercises={exercises}
          mode="catalog"
          headerAction={
            <button
              onClick={() => setShowAddExercise(true)}
              className="px-4 py-2.5 bg-military-900 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1.5 shrink-0"
            >
              <span className="material-icons text-sm">add</span> Nouvel Exercice
            </button>
          }
        />
      )}

      {/* Parcours GPX */}
      {activeTab === 'routes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filterRoutes().map((r) => (
            <div key={r.id} className="bg-white p-5 rounded-2xl shadow-sm border border-military-100 flex flex-col">
              <div className="flex justify-between items-start gap-2 mb-3">
                <h3 className="text-base font-black text-military-900 uppercase">{r.name}</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-military-100 text-military-800 shrink-0">
                  {r.type}
                </span>
              </div>
              <p className="text-xs text-gray-600 mb-4 flex-grow">{r.description}</p>
              <div className="flex justify-between text-xs font-black text-military-700 bg-gray-50 p-3 rounded-xl mb-4">
                <span>{r.distanceKm} km</span>
                <span>D+ {r.elevationMeters} m</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => downloadGPX(r)}
                  className="flex-1 bg-military-900 hover:bg-military-800 text-white py-2.5 rounded-xl font-black uppercase text-[11px] flex items-center justify-center gap-1"
                >
                  <span className="material-icons text-sm">download</span> GPX
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`Supprimer le parcours "${r.name}" ?`)) {
                      db.deleteRoute(r.id);
                      showToast('Parcours supprimé.', 'info');
                    }
                  }}
                  className="px-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl"
                >
                  <span className="material-icons text-sm">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Ajout Exercice */}
      {showAddExercise && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
          <form onSubmit={handleCreateExercise} className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-[zoomIn_0.2s]">
            <h3 className="text-lg font-black uppercase text-military-900">Nouvel Exercice EPMS</h3>
            <input
              required
              placeholder="Nom de l'exercice"
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm"
              value={newEx.name || ''}
              onChange={(e) => setNewEx({ ...newEx, name: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                placeholder="Groupe musculaire"
                className="p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm"
                value={newEx.muscleGroup || ''}
                onChange={(e) => setNewEx({ ...newEx, muscleGroup: e.target.value })}
              />
              <input
                placeholder="Matériel (PDC, Barre...)"
                className="p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm"
                value={newEx.equipment || ''}
                onChange={(e) => setNewEx({ ...newEx, equipment: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select className="p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm" value={newEx.type} onChange={(e) => setNewEx({ ...newEx, type: e.target.value as any })}>
                <option value="Force">Force</option>
                <option value="Cardio">Cardio</option>
                <option value="Mobility">Mobilité</option>
                <option value="Polyarticulaire">Polyarticulaire</option>
              </select>
              <select className="p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm" value={newEx.difficulty} onChange={(e) => setNewEx({ ...newEx, difficulty: e.target.value as any })}>
                <option value="Débutant">Débutant</option>
                <option value="Intermédiaire">Intermédiaire</option>
                <option value="Avancé">Avancé</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowAddExercise(false)} className="flex-1 py-3 text-xs font-bold uppercase text-gray-500">
                Annuler
              </button>
              <button type="submit" className="flex-[2] py-3 bg-military-900 text-white rounded-xl text-xs font-black uppercase">
                Ajouter
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Import GPX */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full p-6 animate-[zoomIn_0.2s]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black text-military-900 uppercase">Import Parcours GPX</h3>
              <button onClick={() => setIsImportModalOpen(false)} disabled={isAnalyzing}>
                <span className="material-icons">close</span>
              </button>
            </div>
            {isAnalyzing ? (
              <div className="py-10 text-center text-sm font-bold text-military-700">Analyse du tracé GPX...</div>
            ) : parsedRoute ? (
              <div className="space-y-4">
                <input
                  type="text"
                  value={parsedRoute.name || ''}
                  onChange={(e) => setParsedRoute({ ...parsedRoute, name: e.target.value })}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                />
                <select
                  value={parsedRoute.type || RouteType.RUNNING}
                  onChange={(e) => setParsedRoute({ ...parsedRoute, type: e.target.value as RouteType })}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm"
                >
                  <option value={RouteType.RUNNING}>{RouteType.RUNNING}</option>
                  <option value={RouteType.VTT}>{RouteType.VTT}</option>
                  <option value={RouteType.CYCLING}>{RouteType.CYCLING}</option>
                </select>
                <textarea
                  value={parsedRoute.description || ''}
                  onChange={(e) => setParsedRoute({ ...parsedRoute, description: e.target.value })}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                  rows={3}
                />
                <div className="grid grid-cols-2 gap-3 bg-military-50 p-3 rounded-xl text-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-500 block">Distance</span>
                    <span className="text-lg font-black">{parsedRoute.distanceKm} km</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-500 block">Dénivelé +</span>
                    <span className="text-lg font-black">+{parsedRoute.elevationMeters} m</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setIsImportModalOpen(false)} className="flex-1 py-3 bg-gray-100 rounded-xl text-xs font-bold uppercase">Annuler</button>
                  <button onClick={handleSaveRoute} className="flex-1 py-3 bg-action-500 text-military-950 rounded-xl text-xs font-black uppercase">Enregistrer</button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default LibraryMonitor;
