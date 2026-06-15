import React, { useState, useMemo } from 'react';
import { workouts, Workout } from '../data/workouts';

export default function WorkoutLibrary() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [materialFilter, setMaterialFilter] = useState('all');
  const [bodyFilter, setBodyFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [selectedNiveau, setSelectedNiveau] = useState<number>(1);

  const filteredWorkouts = useMemo(() => {
    return workouts.filter(w => {
      const matchSearch = w.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          w.desc.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchMat = materialFilter === 'all' || (Array.isArray(w.material) ? w.material.includes(materialFilter) : w.material === materialFilter);
      const matchBody = bodyFilter === 'all' || w.body === bodyFilter;
      const matchType = typeFilter === 'all' || w.type === typeFilter;
      const matchLevel = levelFilter === 'all' || w.level === levelFilter;

      let matchTime = true;
      if (timeFilter === 'court') matchTime = w.duration > 0 && w.duration < 15;
      else if (timeFilter === 'moyen') matchTime = w.duration >= 15 && w.duration <= 30;
      else if (timeFilter === 'long') matchTime = w.duration > 30;
      else if (timeFilter === 'libre') matchTime = w.duration === 0;

      return matchSearch && matchMat && matchBody && matchType && matchLevel && matchTime;
    });
  }, [searchTerm, typeFilter, levelFilter, materialFilter, bodyFilter, timeFilter]);

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'EMOM': return 'border-yellow-500 text-yellow-600 bg-yellow-50';
      case 'TABATA': return 'border-orange-500 text-orange-600 bg-orange-50';
      case 'AMRAP': return 'border-red-500 text-red-600 bg-red-50';
      case 'FOR TIME': return 'border-blue-800 text-blue-800 bg-blue-50';
      case 'HYROX': return 'border-teal-700 text-teal-700 bg-teal-50';
      case 'MUSCU': return 'border-gray-700 text-gray-700 bg-gray-50';
      case 'CARDIO': return 'border-black text-black bg-gray-100';
      default: return 'border-military-500 text-military-700 bg-military-50';
    }
  };

  const getLevelColor = (level: string) => {
    switch(level) {
      case 'Facile': return 'text-green-700 bg-green-50';
      case 'Moyen': return 'text-orange-600 bg-orange-50';
      case 'Intense': return 'text-red-700 bg-red-50';
      default: return 'text-gray-700 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s]">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-black text-military-900 uppercase tracking-tight mb-6">Bibliothèque d'Entraînements</h2>
        
        <div className="space-y-4">
          <input 
            type="text" 
            placeholder="🔍 Rechercher un exercice, un titre, un mouvement..." 
            className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-action-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <select className="p-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-action-500" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="all">Types de séance : tous</option>
              <option value="AMRAP">AMRAP</option>
              <option value="TABATA">TABATA</option>
              <option value="EMOM">EMOM</option>
              <option value="FOR TIME">FOR TIME</option>
              <option value="HYROX">HYROX</option>
              <option value="MUSCU">MUSCU - RENFO</option>
              <option value="CARDIO">CARDIO - FRACTIONNE</option>
            </select>
            
            <select className="p-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-action-500" value={levelFilter} onChange={e => setLevelFilter(e.target.value)}>
              <option value="all">Difficulté : Tous niveaux</option>
              <option value="Facile">Facile 🟢</option>
              <option value="Moyen">Moyen 🟡</option>
              <option value="Intense">Intense 🔴</option>
            </select>
            
            <select className="p-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-action-500" value={materialFilter} onChange={e => setMaterialFilter(e.target.value)}>
              <option value="all">Matériels : Tous</option>
              <option value="poids-corps">Sans matériel</option>
              <option value="barre">Barre et poids</option>
              <option value="haltere">Haltère</option>
              <option value="traction">Barre de traction</option>
              <option value="rameur">Rameur</option>
              <option value="bike-erg">BikeErg</option>
              <option value="ski-erg">SkiErg</option>
              <option value="tapis-incurve">Tapis de course</option>
              <option value="ballon-leste">Ballon lesté</option>
              <option value="gilet-leste">Gilet lesté</option>
              <option value="box-jump">Box jump</option>
              <option value="station-dips">Station à dips</option>
              <option value="sand-bag">SandBag - Sac lesté</option>
            </select>

            <select className="p-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-action-500" value={bodyFilter} onChange={e => setBodyFilter(e.target.value)}>
              <option value="all">Corps : Toutes les zones</option>
              <option value="haut">Haut du corps</option>
              <option value="bas">Bas du corps</option>
              <option value="complet">Corps complet</option>
              <option value="abdos">Abdos / Core</option>
            </select>
            
            <select className="p-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-action-500" value={timeFilter} onChange={e => setTimeFilter(e.target.value)}>
              <option value="all">Durées : Toutes</option>
              <option value="court">Moins de 15 min</option>
              <option value="moyen">15 à 30 min</option>
              <option value="long">Plus de 30 min</option>
              <option value="libre">Temps libre / For Time</option>
            </select>
          </div>
        </div>
      </div>

      <div className="text-sm font-bold text-military-600">
        {filteredWorkouts.length} séance(s) trouvée(s)
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredWorkouts.map((workout, idx) => {
          const typeColors = getTypeColor(workout.type);
          const levelColors = getLevelColor(workout.level);
          const materials = Array.isArray(workout.material) ? workout.material : [workout.material];
          
          return (
            <div key={idx} className={`bg-white rounded-2xl shadow-sm border-t-4 flex flex-col justify-between overflow-hidden ${typeColors.split(' ')[0]}`}>
              <div className="p-5 flex-grow">
                <div className="flex flex-wrap gap-2 mb-3">
                  {materials.map(m => (
                    <span key={m} className="px-2 py-1 text-[10px] font-bold uppercase rounded-md bg-blue-50 text-blue-700">{m}</span>
                  ))}
                  <span className="px-2 py-1 text-[10px] font-bold uppercase rounded-md bg-green-50 text-green-700">{workout.body}</span>
                  <span className="px-2 py-1 text-[10px] font-bold uppercase rounded-md bg-orange-50 text-orange-700">
                    {workout.duration === 0 ? "Temps libre" : `${workout.duration} min`}
                  </span>
                  <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md ${levelColors}`}>{workout.level}</span>
                </div>
                <h3 className={`text-lg font-black uppercase tracking-tight mb-2 ${typeColors.split(' ')[1]}`}>{workout.title}</h3>
                <div className="text-sm text-gray-600 line-clamp-4" dangerouslySetInnerHTML={{__html: workout.desc}}></div>
              </div>
              <div className="p-4 pt-0">
                <button 
                  onClick={() => setSelectedWorkout(workout)}
                  className="w-full py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-colors bg-military-900 text-white hover:bg-military-800"
                >
                  📋 Voir la séance
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {selectedWorkout && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedWorkout(null)}>
          <div 
            className={`bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border-t-8 ${getTypeColor(selectedWorkout.type).split(' ')[0]}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tight text-military-900 mb-2">{selectedWorkout.title}</h2>
                <div className="flex flex-wrap gap-2">
                  <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md ${getTypeColor(selectedWorkout.type).split(' ')[2]} ${getTypeColor(selectedWorkout.type).split(' ')[1]}`}>{selectedWorkout.type}</span>
                  <span className="px-2 py-1 text-[10px] font-bold uppercase rounded-md bg-green-50 text-green-700">{selectedWorkout.body}</span>
                  <span className="px-2 py-1 text-[10px] font-bold uppercase rounded-md bg-orange-50 text-orange-700">
                    ⏱ {selectedWorkout.duration === 0 ? "Temps libre" : `${selectedWorkout.duration} min`}
                  </span>
                  <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md ${getLevelColor(selectedWorkout.level)}`}>{selectedWorkout.level}</span>
                </div>
              </div>
              <button onClick={() => setSelectedWorkout(null)} className="text-gray-400 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center transition-colors">
                ✕
              </button>
            </div>
            
            <div className="p-6">
              {selectedWorkout.details && (
                <>
                  <p className="text-lg font-black uppercase tracking-wide mb-4 text-military-900">{selectedWorkout.details.format_label}</p>
                  
                  {selectedWorkout.details.type_special === 'run_tempo' && selectedWorkout.details.niveaux ? (
                    <div className="mb-6">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Choisir votre niveau</p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {selectedWorkout.details.niveaux.map(nv => (
                          <button 
                            key={nv.n}
                            onClick={() => setSelectedNiveau(nv.n)}
                            className={`w-10 h-10 rounded-full font-bold text-sm flex items-center justify-center transition-all ${selectedNiveau === nv.n ? 'bg-military-900 text-white scale-110' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                          >
                            {nv.n}
                          </button>
                        ))}
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-sm italic text-gray-600 mb-3">Min 1-10 : Échauffement — course lente avec 3 accélérations de 30 sec</p>
                        <ul className="space-y-2">
                          {selectedWorkout.details.niveaux.find(n => n.n === selectedNiveau)?.phases.map((p: any, i: number) => (
                            <li key={i} className={`flex justify-between items-center p-3 rounded-lg ${p.type === 'effort' ? 'bg-orange-50 border-b-2 border-orange-200' : 'bg-green-50 border-b-2 border-green-200'}`}>
                              <span className="text-sm text-gray-500 font-medium">Min {p.min}</span>
                              <span className={`text-sm font-bold ${p.type === 'effort' ? 'text-orange-700' : 'text-green-700 italic font-medium'}`}>
                                {p.type === 'effort' ? '🏃 ' : '😮‍💨 '} {p.vitesse}
                              </span>
                            </li>
                          ))}
                        </ul>
                        <p className="text-sm italic text-gray-600 mt-3">Min 33-40 : Récupération — course lente</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {selectedWorkout.details.intro && <p className="text-sm italic text-gray-600 mb-4">{selectedWorkout.details.intro}</p>}
                      <ul className="space-y-3 mb-6">
                        {selectedWorkout.details.exercises.map((ex, i) => (
                          <li key={i} className="flex items-start gap-3 pb-3 border-b border-gray-50 last:border-0">
                            <span className="text-action-500 mt-1 text-xs">▸</span>
                            <span className="text-military-800">{ex.text}</span>
                          </li>
                        ))}
                      </ul>
                      
                      {selectedWorkout.details.scaled && (
                        <div className="bg-gray-50 rounded-xl p-5 mb-6">
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Version Scaled (Adaptée)</p>
                          {selectedWorkout.details.scaled.intro && <p className="text-sm italic text-gray-600 mb-3">{selectedWorkout.details.scaled.intro}</p>}
                          <ul className="space-y-2">
                            {selectedWorkout.details.scaled.exercises.map((ex, i) => (
                              <li key={i} className="flex items-start gap-3 pb-2 border-b border-gray-100 last:border-0">
                                <span className="text-gray-400 mt-1 text-xs">▸</span>
                                <span className="text-gray-700 text-sm">{ex.text}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}

                  {selectedWorkout.details.conseil && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-r-xl p-4 mt-6">
                      <strong className="block text-xs uppercase tracking-widest text-yellow-700 mb-1">💡 Conseil</strong>
                      <p className="text-sm text-gray-700 italic">{selectedWorkout.details.conseil}</p>
                    </div>
                  )}
                </>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-100 text-center">
              <button onClick={() => setSelectedWorkout(null)} className="px-8 py-3 bg-military-900 text-white rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-military-800 transition-colors">
                Fermer la fiche
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
