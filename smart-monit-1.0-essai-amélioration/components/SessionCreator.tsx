import React, { useState, useEffect } from 'react';
import { UserProfile, Session, ExerciseLibraryItem, WorkoutType } from '../types';
import { db } from '../services/mockDatabase';

interface SessionCreatorProps {
  user: UserProfile;
  onSessionCreated: (session: Session) => void;
  onCancel: () => void;
}

const SessionCreator: React.FC<SessionCreatorProps> = ({ user, onSessionCreated, onCancel }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [workoutType, setWorkoutType] = useState<WorkoutType>(WorkoutType.MUSCU);
  const [duration, setDuration] = useState<number>(45);
  const [infrastructureId, setInfrastructureId] = useState<string>('any');
  const [exercises, setExercises] = useState<ExerciseLibraryItem[]>([]);
  const [infras, setInfras] = useState(db.getInfrastructures().filter(i => i.serviceId === user.serviceId));
  const [selectedExercises, setSelectedExercises] = useState<{ex: ExerciseLibraryItem, presc: string, rest: string}[]>([]);
  
  const [search, setSearch] = useState('');

  useEffect(() => {
    setExercises(db.getExerciseLibrary());
    
    // Listen for db updates
    const handleDbUpdate = () => {
      setInfras(db.getInfrastructures().filter(i => i.serviceId === user.serviceId));
    };
    window.addEventListener('db_updated', handleDbUpdate);
    return () => window.removeEventListener('db_updated', handleDbUpdate);
  }, [user.serviceId]);

  const handleAddExercise = (ex: ExerciseLibraryItem) => {
    setSelectedExercises([...selectedExercises, { ex, presc: '3x10', rest: '1:30' }]);
  };

  const handleRemoveExercise = (index: number) => {
    const newEx = [...selectedExercises];
    newEx.splice(index, 1);
    setSelectedExercises(newEx);
  };

  const handleUpdateExercise = (index: number, field: 'presc' | 'rest', value: string) => {
    const newEx = [...selectedExercises];
    newEx[index][field] = value;
    setSelectedExercises(newEx);
  };

  const handleSave = () => {
    if (!title) {
      alert("Veuillez donner un titre à la séance.");
      return;
    }

    const newSession: Session = {
      id: 'custom-' + Date.now(),
      infrastructureId,
      title,
      type: workoutType,
      workoutType,
      durationMinutes: duration,
      description,
      isCompleted: false,
      content: {
        mainBlock: selectedExercises.map(se => ({
          exercise: se.ex.name,
          prescription: se.presc,
          rest: se.rest
        }))
      }
    };

    onSessionCreated(newSession);
  };

  const filteredExercises = exercises.filter(e => e.name.toLowerCase().includes(search.toLowerCase()) || e.muscleGroup.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 max-w-5xl mx-auto overflow-hidden animate-[fadeIn_0.3s] flex flex-col md:flex-row h-[80vh]">
      
      {/* Left Panel: Form & Selected Exercises */}
      <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col h-full overflow-y-auto border-r border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black uppercase tracking-tight">Créer une séance</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-military-900 transition-colors">
            <span className="material-icons">close</span>
          </button>
        </div>

        <div className="space-y-4 mb-8">
          <div>
            <label className="block text-xs font-bold text-military-700 mb-1 uppercase tracking-wider">Titre</label>
            <input 
              type="text" 
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-military-900 outline-none focus:border-action-500"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Séance Jambes Force"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-military-700 mb-1 uppercase tracking-wider">Type</label>
              <select 
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-military-900 outline-none focus:border-action-500"
                value={workoutType}
                onChange={e => setWorkoutType(e.target.value as WorkoutType)}
              >
                {Object.values(WorkoutType).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-military-700 mb-1 uppercase tracking-wider">Lieu</label>
              <select 
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-military-900 outline-none focus:border-action-500"
                value={infrastructureId}
                onChange={e => setInfrastructureId(e.target.value)}
              >
                <option value="any">Peu importe / Chez moi</option>
                {infras.map(infra => (
                  <option key={infra.id} value={infra.id}>{infra.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-military-700 mb-1 uppercase tracking-wider">Durée (min)</label>
              <input 
                type="number" 
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-military-900 outline-none focus:border-action-500"
                value={duration}
                onChange={e => setDuration(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-military-700 mb-1 uppercase tracking-wider">Description</label>
            <textarea 
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium text-military-900 outline-none focus:border-action-500 resize-none h-20"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Objectifs, consignes particulières..."
            />
          </div>
        </div>

        <div className="flex-grow">
          <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-100 pb-2">Exercices sélectionnés ({selectedExercises.length})</h3>
          
          {selectedExercises.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm font-medium border-2 border-dashed border-gray-200 rounded-xl">
              Ajoutez des exercices depuis la bibliothèque
            </div>
          ) : (
            <div className="space-y-3">
              {selectedExercises.map((se, idx) => (
                <div key={idx} className="bg-gray-50 p-3 rounded-xl border border-gray-200 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-military-900">{idx + 1}. {se.ex.name}</span>
                    <button onClick={() => handleRemoveExercise(idx)} className="text-red-500 hover:text-red-700">
                      <span className="material-icons text-sm">delete</span>
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Prescription (ex: 3x10)"
                      className="flex-1 p-2 text-xs font-bold bg-white border border-gray-200 rounded outline-none focus:border-action-500"
                      value={se.presc}
                      onChange={e => handleUpdateExercise(idx, 'presc', e.target.value)}
                    />
                    <input 
                      type="text" 
                      placeholder="Repos (ex: 1:30)"
                      className="w-24 p-2 text-xs font-bold bg-white border border-gray-200 rounded outline-none focus:border-action-500"
                      value={se.rest}
                      onChange={e => handleUpdateExercise(idx, 'rest', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button 
          onClick={handleSave}
          className="w-full py-4 mt-6 bg-military-900 hover:bg-military-800 text-white rounded-xl font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
        >
          <span className="material-icons">save</span>
          Sauvegarder la séance
        </button>
      </div>

      {/* Right Panel: Exercise Library */}
      <div className="w-full md:w-1/2 bg-gray-50 p-6 md:p-8 flex flex-col h-full overflow-y-auto">
        <h3 className="text-lg font-black text-military-900 uppercase tracking-tight mb-4">Bibliothèque d'exercices</h3>
        
        <div className="relative mb-6">
          <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
          <input 
            type="text" 
            placeholder="Rechercher un exercice..." 
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-action-500 font-medium shadow-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          {filteredExercises.map(ex => (
            <div key={ex.id} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center hover:border-action-300 transition-colors">
              <div>
                <h4 className="font-bold text-military-900 text-sm">{ex.name}</h4>
                <div className="flex gap-2 mt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{ex.muscleGroup}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-action-600 bg-action-50 px-2 py-0.5 rounded">{ex.equipment}</span>
                </div>
              </div>
              <button 
                onClick={() => handleAddExercise(ex)}
                className="w-8 h-8 rounded-full bg-military-100 text-military-900 hover:bg-action-500 hover:text-white transition-colors flex items-center justify-center"
              >
                <span className="material-icons text-sm">add</span>
              </button>
            </div>
          ))}
          {filteredExercises.length === 0 && (
            <div className="text-center py-10 text-gray-400 text-sm">Aucun exercice trouvé.</div>
          )}
        </div>
      </div>

    </div>
  );
};

export default SessionCreator;
