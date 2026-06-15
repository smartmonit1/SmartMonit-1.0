import React from 'react';
import { Session, WorkoutType } from '../types';

interface WorkoutCardProps {
  session: Session;
  onAction: (session: Session) => void;
  actionLabel: string;
}

const WorkoutCard: React.FC<WorkoutCardProps> = ({ session, onAction, actionLabel }) => {
  const getTypeColor = (type?: string) => {
    switch (type) {
      case WorkoutType.EMOM: return 'border-t-[#d4af37] bg-[#fffdf5] text-[#b8962e]';
      case WorkoutType.TABATA: return 'border-t-[#fb8c00] bg-[#fffaf0] text-[#e65100]';
      case WorkoutType.AMRAP: return 'border-t-[#e53935] bg-[#fff8f8] text-[#c62828]';
      case WorkoutType.FOR_TIME: return 'border-t-[#1a237e] bg-[#f5f6ff] text-[#1a237e]';
      case WorkoutType.HYROX: return 'border-t-[#00695c] bg-[#f2fdfb] text-[#004d40]';
      case WorkoutType.MUSCU: return 'border-t-[#424242] bg-[#f9f9f9] text-[#212121]';
      case WorkoutType.CARDIO: return 'border-t-[#000000] bg-[#f9f9f9] text-[#212121]';
      default: return 'border-t-military-600 bg-white text-military-900';
    }
  };

  const getBtnColor = (type?: string) => {
    switch (type) {
      case WorkoutType.EMOM: return 'bg-[#d4af37] hover:bg-[#b8962e] text-black';
      case WorkoutType.TABATA: return 'bg-[#fb8c00] hover:bg-[#ef6c00] text-white';
      case WorkoutType.AMRAP: return 'bg-[#e53935] hover:bg-[#c62828] text-white';
      case WorkoutType.FOR_TIME: return 'bg-[#1a237e] hover:bg-[#121858] text-white';
      case WorkoutType.HYROX: return 'bg-[#00695c] hover:bg-[#004d40] text-white';
      case WorkoutType.MUSCU: return 'bg-[#424242] hover:bg-[#212121] text-white';
      case WorkoutType.CARDIO: return 'bg-[#000000] hover:bg-[#212121] text-white';
      default: return 'bg-military-800 hover:bg-military-900 text-white';
    }
  };

  const getLevelColor = (level?: string) => {
    switch (level) {
      case 'Facile': return 'bg-white text-green-700 border border-green-200';
      case 'Moyen': return 'bg-white text-orange-600 border border-orange-200';
      case 'Intense': return 'bg-white text-red-700 border border-red-200';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const typeColors = getTypeColor(session.workoutType);
  const btnColors = getBtnColor(session.workoutType);

  return (
    <div className={`rounded-xl p-5 shadow-sm flex flex-col justify-between border-t-[5px] ${typeColors.split(' ')[0]} ${typeColors.split(' ')[1]}`}>
      <div>
        <div className="flex flex-wrap gap-2 mb-3">
          {session.material?.map(m => (
            <span key={m} className="bg-blue-50 text-blue-800 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
              {m}
            </span>
          ))}
          {session.bodyZone && (
            <span className="bg-green-50 text-green-800 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
              {session.bodyZone}
            </span>
          )}
          <span className="bg-orange-50 text-orange-800 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
            {session.durationMinutes === 0 ? 'Temps libre' : `${session.durationMinutes} min`}
          </span>
          {session.level && (
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getLevelColor(session.level)}`}>
              {session.level}
            </span>
          )}
        </div>
        <h3 className={`text-lg font-black mb-2 ${typeColors.split(' ')[2]}`}>{session.title}</h3>
        <p className="text-sm text-gray-700 mb-4 line-clamp-3 leading-relaxed">{session.description}</p>
      </div>
      <button 
        onClick={() => onAction(session)}
        className={`w-full py-3 rounded-lg font-bold uppercase tracking-wider text-sm transition-colors ${btnColors}`}
      >
        {actionLabel}
      </button>
    </div>
  );
};

export default WorkoutCard;
