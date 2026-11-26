import React, { useState, useEffect } from 'react';
import { UserProfile, Session, ExerciseLibraryItem, WorkoutType } from '../types';
import { db } from '../services/mockDatabase';
import { useToast } from './ToastProvider';
import ExerciseIllustration from './ExerciseIllustration';
import ExerciseCatalogBrowser from './ExerciseCatalogBrowser';

interface SessionCreatorProps {
  user: UserProfile;
  onSessionCreated: (session: Session) => void;
  onCancel: () => void;
}

const SessionCreator: React.FC<SessionCreatorProps> = ({ user, onSessionCreated, onCancel }) => {
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [workoutType, setWorkoutType] = useState<WorkoutType>(WorkoutType.MUSCU);
  const [level, setLevel] = useState<'Facile' | 'Moyen' | 'Intense'>('Moyen');
  const [bodyZone, setBodyZone] = useState<'haut' | 'bas' | 'complet' | 'abdos'>('complet');
  const [duration, setDuration] = useState<number>(45);
  const [infrastructureId, setInfrastructureId] = useState<string>('any');
  const [exercises, setExercises] = useState<ExerciseLibraryItem[]>([]);
  const [infras, setInfras] = useState(db.getInfrastructures().filter((i) => i.serviceId === user.serviceId));
  const [selectedExercises, setSelectedExercises] = useState<{ ex: ExerciseLibraryItem; presc: string; rest: string }[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setExercises(db.getExerciseLibrary());
    const handleDbUpdate = () => {
      setInfras(db.getInfrastructures().filter((i) => i.serviceId === user.serviceId));
      setExercises(db.getExerciseLibrary());
    };
    window.addEventListener('db_updated', handleDbUpdate);
    return () => window.removeEventListener('db_updated', handleDbUpdate);
  }, [user.serviceId]);

  const handleAddExercise = (ex: ExerciseLibraryItem) => {
    setSelectedExercises([...selectedExercises, { ex, presc: '4 x 8 à [75% 1RM]', rest: '1:30' }]);
  };

  const handleRemoveExercise = (index: number) => {
    setSelectedExercises(selectedExercises.filter((_, i) => i !== index));
  };

  const handleUpdateExercise = (index: number, field: 'presc' | 'rest', value: string) => {
    const next = [...selectedExercises];
    next[index] = { ...next[index], [field]: value };
    setSelectedExercises(next);
  };

  const handleSave = () => {
    if (!title.trim()) {
      showToast('Veuillez donner un titre à la séance.', 'warning');
      return;
    }

    const materials: string[] = Array.from(new Set<string>(selectedExercises.map((s) => s.ex.equipment.toLowerCase())));
    const newSession: Session = {
      id: 'sess_epms_' + Date.now(),
      infrastructureId,
      locationName: infras.find((i) => i.id === infrastructureId)?.name || 'Installation Base',
      title: title.trim(),
      type: workoutType,
      workoutType,
      level,
      bodyZone,
      material: materials.length > 0 ? materials : ['poids-corps'],
      durationMinutes: duration,
      description: description.trim() || `Séance ${workoutType} créée par ${user.name}.`,
      isCompleted: false,
      isGlobal: true,
      content: {
        equipmentNeeded: materials,
        warmup: 'Échauffement articulaire et cardio progressif (8 min).',
        mainBlock: selectedExercises.map((se) => ({
          exercise: se.ex.name,
          prescription: se.presc,
          rest: se.rest
        })),
        cooldown: 'Retour au calme et étirements doux (5 min).'
      }
    };

    onSessionCreated(newSession);
  };

  const filteredExercises = exercises.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.muscleGroup.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-military-100 max-w-5xl mx-auto overflow-hidden animate-[fadeIn_0.25s] flex flex-col md:flex-row min-h-[75vh]">
      <div className="w-full md:w-1/2 p-6 flex flex-col overflow-y-auto border-b md:border-b-0 md:border-r border-gray-100 custom-scrollbar">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-black uppercase text-military-900">Créer une séance EPMS</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-military-900">
            <span className="material-icons">close</span>
          </button>
        </div>

        <div className="space-y-3 mb-6">
          <div>
            <label className="block text-[10px] font-black text-military-700 mb-1 uppercase">Titre *</label>
            <input
              type="text"
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:border-action-500"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Force Jambes & Prévention Genoux"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black text-military-700 mb-1 uppercase">Type</label>
              <select
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs"
                value={workoutType}
                onChange={(e) => setWorkoutType(e.target.value as WorkoutType)}
              >
                {Object.values(WorkoutType).map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-military-700 mb-1 uppercase">Niveau</label>
              <select
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs"
                value={level}
                onChange={(e) => setLevel(e.target.value as any)}
              >
                <option value="Facile">Facile</option>
                <option value="Moyen">Moyen</option>
                <option value="Intense">Intense</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-military-700 mb-1 uppercase">Zone</label>
              <select
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs"
                value={bodyZone}
                onChange={(e) => setBodyZone(e.target.value as any)}
              >
                <option value="complet">Complet</option>
                <option value="haut">Haut du corps</option>
                <option value="bas">Bas du corps</option>
                <option value="abdos">Abdos / Core</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-military-700 mb-1 uppercase">Durée (min)</label>
              <input
                type="number"
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value, 10) || 0)}
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black text-military-700 mb-1 uppercase">Installation</label>
            <select
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs"
              value={infrastructureId}
              onChange={(e) => setInfrastructureId(e.target.value)}
            >
              <option value="any">Tout lieu / Autonomie</option>
              {infras.map((infra) => <option key={infra.id} value={infra.id}>{infra.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-military-700 mb-1 uppercase">Description</label>
            <textarea
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium resize-none h-16 outline-none focus:border-action-500"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Consignes techniques, objectifs PPO..."
            />
          </div>
        </div>

        <div className="flex-grow">
          <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">
            Exercices sélectionnés ({selectedExercises.length})
          </h3>
          {selectedExercises.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-xs border-2 border-dashed border-gray-200 rounded-xl">
              Ajoutez des exercices depuis le référentiel à droite.
            </div>
          ) : (
            <div className="space-y-2.5">
              {selectedExercises.map((se, idx) => (
                <div key={idx} className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-2">
                  <div className="flex justify-between items-center text-xs font-black text-military-900 gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <ExerciseIllustration exerciseName={se.ex.name} fallbackType={se.ex.type} size="xs" />
                      <span className="truncate">{idx + 1}. {se.ex.name}</span>
                    </div>
                    <button onClick={() => handleRemoveExercise(idx)} className="text-red-500 hover:text-red-700">
                      <span className="material-icons text-sm">delete</span>
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ex: 4x8 à [75% 1RM]"
                      className="flex-1 p-2 text-xs font-bold bg-white border border-gray-200 rounded-lg"
                      value={se.presc}
                      onChange={(e) => handleUpdateExercise(idx, 'presc', e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Repos 1:30"
                      className="w-24 p-2 text-xs font-bold bg-white border border-gray-200 rounded-lg"
                      value={se.rest}
                      onChange={(e) => handleUpdateExercise(idx, 'rest', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleSave}
          className="w-full py-3.5 mt-5 bg-military-900 hover:bg-military-800 text-white rounded-xl font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 shadow-lg"
        >
          <span className="material-icons text-base">save</span>
          Enregistrer dans la Mémoire EPMS
        </button>
      </div>

      <div className="w-full md:w-1/2 bg-gray-50 p-4 md:p-6 flex flex-col overflow-y-auto custom-scrollbar">
        <h3 className="text-sm font-black text-military-900 uppercase mb-3">
          Référentiel d'exercices ({exercises.length})
        </h3>
        <ExerciseCatalogBrowser
          exercises={exercises}
          mode="picker"
          compact
          onSelectExercise={handleAddExercise}
        />
      </div>
    </div>
  );
};

export default SessionCreator;
