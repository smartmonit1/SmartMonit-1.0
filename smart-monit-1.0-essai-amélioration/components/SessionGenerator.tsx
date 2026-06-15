import React, { useState } from 'react';
import { UserProfile, Session, WorkoutType } from '../types';
import { generateFlashSession } from '../services/geminiService';
import { db } from '../services/mockDatabase';

interface SessionGeneratorProps {
  user: UserProfile;
  onSessionGenerated: (session: Session) => void;
  onCancel: () => void;
}

const SessionGenerator: React.FC<SessionGeneratorProps> = ({ user, onSessionGenerated, onCancel }) => {
  const [infras, setInfras] = useState(db.getInfrastructures().filter(i => i.serviceId === user.serviceId));
  const [location, setLocation] = useState('Chez moi (Poids du corps)');
  const [workoutType, setWorkoutType] = useState<string>('Musculation');
  const [duration, setDuration] = useState<number>(40);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  // Add an effect to listen for DB updates in case infras change while component is open
  React.useEffect(() => {
    const handleDbUpdate = () => {
      setInfras(db.getInfrastructures().filter(i => i.serviceId === user.serviceId));
    };
    window.addEventListener('db_updated', handleDbUpdate);
    return () => window.removeEventListener('db_updated', handleDbUpdate);
  }, [user.serviceId]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError('');
    try {
      // Create a mock DailyForm if user doesn't have one for today
      const lastDaily = user.dailyForms?.[0] || {
        date: new Date().toISOString(),
        sleepQuality: 7,
        fatigueLevel: 3,
        stressLevel: 3,
        painLevel: 0
      };
      
      const infras = db.getInfrastructures().filter(i => i.serviceId === user.serviceId);
      const equip = db.getEquipment().filter(e => infras.some(i => i.id === e.infrastructureId));
      
      const rawSession = await generateFlashSession(
        user, 
        lastDaily, 
        location, 
        workoutType, 
        duration,
        infras,
        db.getExerciseLibrary(),
        equip
      );
      
      const newSession: Session = {
        id: 'flash-' + Date.now(),
        infrastructureId: 'any',
        title: rawSession.title || `Séance Flash ${workoutType}`,
        type: workoutType,
        workoutType: workoutType.toUpperCase(),
        durationMinutes: duration,
        description: rawSession.description || `Séance générée par IA pour ${workoutType}`,
        isCompleted: false,
        locationName: location,
        content: {
          warmup: rawSession.warmup,
          mainBlock: rawSession.mainBlock,
          cooldown: rawSession.cooldown,
          advice: rawSession.advice
        }
      };
      
      onSessionGenerated(newSession);
    } catch (err) {
      console.error(err);
      setError('Erreur lors de la génération de la séance. Veuillez réessayer.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 max-w-2xl mx-auto overflow-hidden animate-[fadeIn_0.3s]">
      <div className="bg-action-500 p-6 text-white flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
            <span className="material-icons">bolt</span>
            Générateur Flash IA
          </h2>
          <p className="text-action-100 font-bold text-sm uppercase tracking-widest">Séance sur-mesure</p>
        </div>
        <button onClick={onCancel} className="text-action-200 hover:text-white transition-colors">
          <span className="material-icons">close</span>
        </button>
      </div>

      <div className="p-8 space-y-6">
        {error && (
          <div className="bg-red-50 text-red-800 p-4 rounded-xl text-sm font-bold border border-red-200 flex items-center gap-2">
            <span className="material-icons">error_outline</span>
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-military-700 mb-2 uppercase tracking-wider">Lieu / Matériel disponible</label>
          <select 
            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-military-900 outline-none focus:border-action-500 transition-colors"
            value={location}
            onChange={e => setLocation(e.target.value)}
          >
            <option value="Chez moi (Poids du corps)">Chez moi (Poids du corps)</option>
            {infras.map(infra => (
              <option key={infra.id} value={infra.name}>{infra.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-military-700 mb-2 uppercase tracking-wider">Objectif / Type de séance</label>
          <select 
            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-military-900 outline-none focus:border-action-500 transition-colors"
            value={workoutType}
            onChange={e => setWorkoutType(e.target.value)}
          >
            <option value="Musculation">Musculation (Force/Hypertrophie)</option>
            <option value="Poids du corps">Poids du corps (Calisthenics)</option>
            <option value="Course">Course à pied (Fractionné/Endurance)</option>
            <option value="HIIT">HIIT / Cardio intense</option>
            <option value="Crosstraining">Crosstraining (Mixte)</option>
            <option value="Posture et mobilité">Posture et mobilité (Récupération)</option>
            <option value="Natation">Natation</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-military-700 mb-2 uppercase tracking-wider">Temps disponible</label>
          <div className="grid grid-cols-3 gap-4">
            {[20, 40, 60].map(time => (
              <button
                key={time}
                onClick={() => setDuration(time)}
                className={`py-4 rounded-xl font-black text-lg transition-colors border-2 ${duration === time ? 'bg-military-900 text-white border-military-900' : 'bg-white text-military-500 border-gray-200 hover:border-military-300'}`}
              >
                {time} <span className="text-xs uppercase tracking-widest block font-bold">min</span>
              </button>
            ))}
          </div>
        </div>

        <div className="pt-6 border-t border-gray-100">
          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className={`w-full py-4 rounded-xl font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${isGenerating ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-action-500 hover:bg-action-600 text-white shadow-lg shadow-action-500/30'}`}
          >
            {isGenerating ? (
              <>
                <span className="material-icons animate-spin">autorenew</span>
                Analyse IA en cours...
              </>
            ) : (
              <>
                <span className="material-icons">auto_awesome</span>
                Générer ma séance
              </>
            )}
          </button>
          <p className="text-center text-xs text-gray-400 font-medium mt-4">
            L'IA adaptera la séance selon votre profil métier, vos tests physiques et votre bilan de forme du jour.
          </p>
        </div>

      </div>
    </div>
  );
};

export default SessionGenerator;
