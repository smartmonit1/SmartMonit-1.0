import React from 'react';
import { Session, WorkoutType } from '../types';
import ExerciseIllustration from './ExerciseIllustration';
import { resolveExerciseVisual } from '../utils/exerciseVisuals';

interface WorkoutCardProps {
  session: Session;
  onAction: (session: Session) => void;
  actionLabel: string;
}

const WorkoutCard: React.FC<WorkoutCardProps> = ({ session, onAction, actionLabel }) => {
  const getTypeColor = (type?: string) => {
    switch (type) {
      case WorkoutType.EMOM:
        return { border: 'border-t-[#d4af37]', bg: 'bg-[#fffdf5]', text: 'text-[#9e7d19]', btn: 'bg-[#d4af37] hover:bg-[#b8962e] text-military-950' };
      case WorkoutType.TABATA:
        return { border: 'border-t-[#fb8c00]', bg: 'bg-[#fffaf0]', text: 'text-[#c25000]', btn: 'bg-[#fb8c00] hover:bg-[#e67e00] text-white' };
      case WorkoutType.AMRAP:
        return { border: 'border-t-[#e53935]', bg: 'bg-[#fff8f8]', text: 'text-[#b71c1c]', btn: 'bg-[#e53935] hover:bg-[#c62828] text-white' };
      case WorkoutType.FOR_TIME:
        return { border: 'border-t-[#1a237e]', bg: 'bg-[#f5f6ff]', text: 'text-[#1a237e]', btn: 'bg-[#1a237e] hover:bg-[#121858] text-white' };
      case WorkoutType.HYROX:
        return { border: 'border-t-[#00695c]', bg: 'bg-[#f2fdfb]', text: 'text-[#004d40]', btn: 'bg-[#00695c] hover:bg-[#004d40] text-white' };
      case WorkoutType.CARDIO:
        return { border: 'border-t-emerald-700', bg: 'bg-white', text: 'text-emerald-900', btn: 'bg-emerald-800 hover:bg-emerald-900 text-white' };
      case WorkoutType.MOBILITE:
        return { border: 'border-t-indigo-600', bg: 'bg-white', text: 'text-indigo-900', btn: 'bg-indigo-700 hover:bg-indigo-800 text-white' };
      default:
        return { border: 'border-t-military-800', bg: 'bg-white', text: 'text-military-900', btn: 'bg-military-900 hover:bg-military-800 text-white' };
    }
  };

  const getLevelColor = (level?: string) => {
    switch (level) {
      case 'Facile':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Moyen':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Intense':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const theme = getTypeColor(session.workoutType || session.type);
  const exercises = (session.content?.mainBlock || []).filter((b) => !b.isRecovery);
  const previewExercises =
    exercises.length > 0
      ? exercises.slice(0, 3).map((e) => e.exercise)
      : [session.title];
  const primaryGuide = resolveExerciseVisual(previewExercises[0], session.workoutType || session.type);

  return (
    <div className={`rounded-2xl p-5 shadow-sm border border-gray-100 border-t-4 flex flex-col justify-between transition-all hover:shadow-md ${theme.border} ${theme.bg}`}>
      <div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {session.workoutType && (
            <span className="bg-military-900 text-white px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
              {session.workoutType}
            </span>
          )}
          <span className="bg-orange-50 text-orange-800 border border-orange-100 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase">
            {session.durationMinutes === 0 ? 'Temps libre' : `${session.durationMinutes} min`}
          </span>
          {session.level && (
            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${getLevelColor(session.level)}`}>
              {session.level}
            </span>
          )}
          {session.bodyZone && (
            <span className="bg-blue-50 text-blue-800 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase">
              {session.bodyZone}
            </span>
          )}
        </div>

        <h3 className={`text-base font-black mb-1.5 leading-snug ${theme.text}`}>{session.title}</h3>
        <p className="text-xs text-gray-600 mb-3 line-clamp-2 leading-relaxed">{session.description}</p>

        {/* Bandeau illustré animé des exercices (clic = fiche biomécanique complète) */}
        <div className="mb-3 p-2.5 rounded-xl bg-military-50/70 border border-military-100">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-black uppercase tracking-wider text-military-600 flex items-center gap-1">
              <span className="material-icons text-[12px] text-action-600">accessibility_new</span>
              {exercises.length > 0 ? `${exercises.length} exercice(s) illustré(s)` : primaryGuide.categoryLabel}
            </span>
            <span className="text-[9px] text-gray-400 font-semibold">Cliquer schéma = technique</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {previewExercises.map((exName, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-white pr-2.5 rounded-xl border border-gray-200/80 shrink-0 max-w-[165px]">
                <ExerciseIllustration
                  exerciseName={exName}
                  fallbackType={session.workoutType || session.type}
                  size="xs"
                />
                <span className="text-[10px] font-bold text-military-800 truncate">{exName}</span>
              </div>
            ))}
            {exercises.length > 3 && (
              <span className="text-[10px] font-black text-military-600 bg-white px-2 py-1 rounded-lg border border-gray-200 shrink-0">
                +{exercises.length - 3}
              </span>
            )}
          </div>
        </div>

        {session.createdByBase && (
          <p className="text-[10px] font-bold text-gray-400 mb-3">Source : {session.createdByBase}</p>
        )}
      </div>
      <button
        onClick={() => onAction(session)}
        className={`w-full py-2.5 rounded-xl font-black uppercase tracking-wider text-xs transition-colors active:scale-95 flex items-center justify-center gap-1.5 ${theme.btn}`}
      >
        <span className="material-icons text-sm">play_arrow</span>
        {actionLabel}
      </button>
    </div>
  );
};

export default WorkoutCard;
