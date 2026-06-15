import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, Session, Program, ExerciseLibraryItem, SportsRoute, RouteType } from '../types';
import { db } from '../services/mockDatabase';
import WorkoutCard from './WorkoutCard';

interface LibraryMonitorProps {
  user: UserProfile;
}

const LibraryMonitor: React.FC<LibraryMonitorProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'sessions' | 'programs' | 'exercises' | 'routes'>('routes');
  const [globalSessions, setGlobalSessions] = useState<Session[]>([]);
  const [allPrograms, setAllPrograms] = useState<Program[]>([]);
  const [exercises, setExercises] = useState<ExerciseLibraryItem[]>([]);
  const [routes, setRoutes] = useState<SportsRoute[]>([]);
  
  // Import State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [parsedRoute, setParsedRoute] = useState<Partial<SportsRoute> | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [routeTypeFilter, setRouteTypeFilter] = useState('all');

  useEffect(() => {
    setGlobalSessions(db.getGlobalSessions());
    setAllPrograms(db.getPrograms());
    setExercises(db.getExerciseLibrary());
    setRoutes(db.getRoutes().filter(r => r.serviceId === user.serviceId));
  }, [user.serviceId]);

  const filterSessions = (sessions: Session[]) => {
    return sessions.filter(s => {
      const matchSearch = s.title.toLowerCase().includes(search.toLowerCase()) || 
                          s.description.toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === 'all' || s.workoutType === typeFilter;
      const matchLevel = levelFilter === 'all' || s.level === levelFilter;
      return matchSearch && matchType && matchLevel;
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.name.toLowerCase().endsWith('.gpx')) {
      setIsAnalyzing(true);
      setIsImportModalOpen(true);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        
        // Simulate IA analysis delay
        setTimeout(() => {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(content, "text/xml");
          
          const nameNode = xmlDoc.querySelector('name');
          const name = nameNode ? nameNode.textContent || 'Nouveau Parcours' : 'Nouveau Parcours';
          
          const trkpts = xmlDoc.querySelectorAll('trkpt');
          let distance = 0;
          let elevation = 0;
          let lastLat: number | null = null;
          let lastLon: number | null = null;
          let lastEle: number | null = null;

          const R = 6371; // km
          const toRad = (val: number) => val * Math.PI / 180;

          trkpts.forEach(pt => {
            const lat = parseFloat(pt.getAttribute('lat') || '0');
            const lon = parseFloat(pt.getAttribute('lon') || '0');
            const eleNode = pt.querySelector('ele');
            const ele = eleNode ? parseFloat(eleNode.textContent || '0') : null;

            if (lastLat !== null && lastLon !== null) {
              const dLat = toRad(lat - lastLat);
              const dLon = toRad(lon - lastLon);
              const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                        Math.cos(toRad(lastLat)) * Math.cos(toRad(lat)) *
                        Math.sin(dLon/2) * Math.sin(dLon/2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
              distance += R * c;
            }

            if (lastEle !== null && ele !== null && ele > lastEle) {
              elevation += (ele - lastEle);
            }

            lastLat = lat;
            lastLon = lon;
            lastEle = ele;
          });

          setParsedRoute({
            id: `route-${Date.now()}`,
            name: name,
            description: 'Parcours importé via IA.',
            type: RouteType.RUNNING,
            distanceKm: parseFloat(distance.toFixed(2)),
            elevationMeters: Math.round(elevation),
            gpxContent: content
          });
          setIsAnalyzing(false);
        }, 1500);
      };
      reader.readAsText(file);
    } else {
      alert("Seuls les fichiers GPX sont supportés pour l'import de parcours pour le moment.");
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveRoute = () => {
    if (parsedRoute && parsedRoute.id) {
      const newRoute = parsedRoute as SportsRoute;
      newRoute.serviceId = user.serviceId;
      db.addRoute(newRoute);
      setRoutes(db.getRoutes().filter(r => r.serviceId === user.serviceId));
      setIsImportModalOpen(false);
      setParsedRoute(null);
      setActiveTab('routes');
    }
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-military-900 uppercase tracking-tight">Bibliothèque Globale</h2>
          <p className="text-military-500 font-medium">Gestion des séances, programmes et exercices.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <input 
            type="file" 
            accept=".gpx" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 md:flex-none bg-action-500 hover:bg-action-600 text-white px-4 py-2 rounded-xl font-bold uppercase tracking-wider text-sm transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-icons text-sm">auto_awesome</span>
            Import IA
          </button>
          <button className="flex-1 md:flex-none bg-military-800 hover:bg-military-900 text-white px-4 py-2 rounded-xl font-bold uppercase tracking-wider text-sm transition-colors flex items-center justify-center gap-2">
            <span className="material-icons text-sm">add</span>
            Créer
          </button>
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
          onClick={() => setActiveTab('sessions')}
          className={`px-6 py-3 rounded-t-xl font-bold uppercase tracking-wider text-sm whitespace-nowrap transition-colors ${activeTab === 'sessions' ? 'bg-white text-military-900 border-t-2 border-l border-r border-gray-200 border-t-action-500' : 'text-gray-500 hover:text-military-900 hover:bg-gray-50'}`}
        >
          Séances
        </button>
        <button 
          onClick={() => setActiveTab('programs')}
          className={`px-6 py-3 rounded-t-xl font-bold uppercase tracking-wider text-sm whitespace-nowrap transition-colors ${activeTab === 'programs' ? 'bg-white text-military-900 border-t-2 border-l border-r border-gray-200 border-t-action-500' : 'text-gray-500 hover:text-military-900 hover:bg-gray-50'}`}
        >
          Programmes
        </button>
        <button 
          onClick={() => setActiveTab('exercises')}
          className={`px-6 py-3 rounded-t-xl font-bold uppercase tracking-wider text-sm whitespace-nowrap transition-colors ${activeTab === 'exercises' ? 'bg-white text-military-900 border-t-2 border-l border-r border-gray-200 border-t-action-500' : 'text-gray-500 hover:text-military-900 hover:bg-gray-50'}`}
        >
          Exercices
        </button>
      </div>

      {/* Filters */}
      {(activeTab === 'sessions' || activeTab === 'routes') && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
          <div className="flex-grow relative">
            <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
            <input 
              type="text" 
              placeholder={activeTab === 'routes' ? "Rechercher un parcours..." : "Rechercher une séance..."}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-action-500 font-medium"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          
          {activeTab === 'sessions' ? (
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
        {activeTab === 'sessions' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filterSessions(globalSessions).map(s => (
              <WorkoutCard 
                key={s.id} 
                session={s} 
                onAction={() => alert('Édition de séance à venir')} 
                actionLabel="Modifier la séance" 
              />
            ))}
          </div>
        )}
        
        {activeTab === 'programs' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {allPrograms.length === 0 ? (
              <div className="col-span-full text-center py-10 text-gray-500">Aucun programme trouvé.</div>
            ) : (
              allPrograms.map(p => (
                <div key={p.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-black text-military-900 uppercase tracking-tight">{p.title}</h3>
                    <p className="text-gray-600 font-medium">{p.goal}</p>
                  </div>
                  <button className="bg-military-100 hover:bg-military-200 text-military-900 p-2 rounded-lg transition-colors">
                    <span className="material-icons">edit</span>
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'exercises' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-military-50 border-b border-gray-200">
                  <th className="p-4 font-bold text-sm uppercase tracking-wider text-military-700">Nom</th>
                  <th className="p-4 font-bold text-sm uppercase tracking-wider text-military-700">Groupe</th>
                  <th className="p-4 font-bold text-sm uppercase tracking-wider text-military-700">Matériel</th>
                  <th className="p-4 font-bold text-sm uppercase tracking-wider text-military-700">Type</th>
                  <th className="p-4 font-bold text-sm uppercase tracking-wider text-military-700">Difficulté</th>
                </tr>
              </thead>
              <tbody>
                {exercises.map((ex, i) => (
                  <tr key={ex.id} className={`border-b border-gray-100 hover:bg-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <td className="p-4 font-bold text-military-900">{ex.name}</td>
                    <td className="p-4 text-gray-600 font-medium">{ex.muscleGroup}</td>
                    <td className="p-4 text-gray-600 font-medium">{ex.equipment}</td>
                    <td className="p-4 text-gray-600 font-medium">{ex.type}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                        ex.difficulty === 'Débutant' ? 'bg-green-100 text-green-800' :
                        ex.difficulty === 'Intermédiaire' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {ex.difficulty}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'routes' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filterRoutes().length === 0 ? (
              <div className="col-span-full text-center py-10 text-gray-500">Aucun parcours trouvé.</div>
            ) : (
              filterRoutes().map(r => (
                <div key={r.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-black text-military-900 uppercase tracking-tight">{r.name}</h3>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      r.type === RouteType.RUNNING ? 'bg-blue-100 text-blue-800' :
                      r.type === RouteType.VTT ? 'bg-green-100 text-green-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {r.type}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-6 font-medium flex-grow">{r.description}</p>
                  <div className="flex justify-between items-center mb-6 text-sm font-bold text-military-500 bg-gray-50 p-3 rounded-lg">
                    <span className="flex items-center gap-1"><span className="material-icons text-sm">straighten</span> {r.distanceKm} km</span>
                    <span className="flex items-center gap-1"><span className="material-icons text-sm">terrain</span> +{r.elevationMeters}m</span>
                  </div>
                  <button 
                    onClick={() => downloadGPX(r)}
                    className="w-full bg-military-900 hover:bg-military-800 text-white px-4 py-3 rounded-xl font-bold uppercase tracking-wider text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="material-icons text-sm">download</span>
                    Télécharger GPX
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 animate-[fadeIn_0.3s]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-military-900 uppercase tracking-tight flex items-center gap-2">
                <span className="material-icons text-action-500">auto_awesome</span>
                Analyse IA du Parcours
              </h3>
              <button 
                onClick={() => { setIsImportModalOpen(false); setParsedRoute(null); }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isAnalyzing}
              >
                <span className="material-icons">close</span>
              </button>
            </div>

            {isAnalyzing ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-12 h-12 border-4 border-military-200 border-t-action-500 rounded-full animate-spin mb-4"></div>
                <p className="text-military-900 font-bold uppercase tracking-wider text-sm">Extraction des données GPX...</p>
                <p className="text-gray-500 text-sm mt-2 text-center">Calcul de la distance et du dénivelé en cours.</p>
              </div>
            ) : parsedRoute ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-military-900 uppercase tracking-wider mb-2">Nom du parcours</label>
                  <input 
                    type="text" 
                    value={parsedRoute.name || ''} 
                    onChange={e => setParsedRoute({...parsedRoute, name: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-action-500 font-medium"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-military-900 uppercase tracking-wider mb-2">Type de parcours</label>
                  <select 
                    value={parsedRoute.type || RouteType.RUNNING}
                    onChange={e => setParsedRoute({...parsedRoute, type: e.target.value as RouteType})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-action-500 font-bold uppercase tracking-wider text-sm"
                  >
                    <option value={RouteType.RUNNING}>{RouteType.RUNNING}</option>
                    <option value={RouteType.VTT}>{RouteType.VTT}</option>
                    <option value={RouteType.CYCLING}>{RouteType.CYCLING}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-military-900 uppercase tracking-wider mb-2">Description</label>
                  <textarea 
                    value={parsedRoute.description || ''} 
                    onChange={e => setParsedRoute({...parsedRoute, description: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-action-500 font-medium min-h-[100px]"
                    placeholder="Description du parcours..."
                  />
                </div>

                <div className="bg-military-50 p-4 rounded-xl flex justify-around items-center">
                  <div className="text-center">
                    <span className="block text-xs font-bold text-military-500 uppercase tracking-wider mb-1">Distance</span>
                    <span className="text-xl font-black text-military-900">{parsedRoute.distanceKm} km</span>
                  </div>
                  <div className="w-px h-10 bg-gray-200"></div>
                  <div className="text-center">
                    <span className="block text-xs font-bold text-military-500 uppercase tracking-wider mb-1">Dénivelé</span>
                    <span className="text-xl font-black text-military-900">+{parsedRoute.elevationMeters} m</span>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => { setIsImportModalOpen(false); setParsedRoute(null); }}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-military-900 px-4 py-3 rounded-xl font-bold uppercase tracking-wider text-sm transition-colors"
                  >
                    Annuler
                  </button>
                  <button 
                    onClick={handleSaveRoute}
                    className="flex-1 bg-action-500 hover:bg-action-600 text-white px-4 py-3 rounded-xl font-bold uppercase tracking-wider text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="material-icons text-sm">save</span>
                    Enregistrer
                  </button>
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
