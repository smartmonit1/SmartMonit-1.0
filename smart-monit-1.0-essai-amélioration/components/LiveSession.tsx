import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Session, WorkoutType } from '../types';

interface LiveSessionProps {
  session: Session;
  onComplete: (session: Session) => void;
  onCancel: () => void;
}

const playBeep = (frequency = 440, duration = 200, type = 'sine') => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = type as OscillatorType;
    osc.frequency.value = frequency;
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start();
    gainNode.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + duration / 1000);
    osc.stop(ctx.currentTime + duration / 1000);
  } catch (e) {
    console.error("Audio play failed", e);
  }
};

const LiveSession: React.FC<LiveSessionProps> = ({ session, onComplete, onCancel }) => {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(session.durationMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [phaseTimeLeft, setPhaseTimeLeft] = useState(10); // 10s prep time
  const [currentPhase, setCurrentPhase] = useState<'prep' | 'work' | 'rest'>('prep');
  const [completedExercises, setCompletedExercises] = useState<number[]>([]);
  const [customRestTimer, setCustomRestTimer] = useState<number>(0);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const restTimerRef = useRef<NodeJS.Timeout | null>(null);

  const mainBlock = session.content?.mainBlock || [];
  const currentExercise = mainBlock[currentExerciseIndex];

  const wType = session.workoutType as WorkoutType;
  let layoutCategory = 'renfo';
  if ([WorkoutType.CARDIO, WorkoutType.NATATION].includes(wType)) layoutCategory = 'cardio';
  else if ([WorkoutType.MUSCU].includes(wType)) layoutCategory = 'muscu';
  else if ([WorkoutType.TABATA, WorkoutType.EMOM, WorkoutType.AMRAP, WorkoutType.HIIT, WorkoutType.FOR_TIME, WorkoutType.HYROX].includes(wType)) layoutCategory = 'crosstraining';

  const isTimerBased = layoutCategory === 'crosstraining' || mainBlock.some(ex => ex.durationSeconds !== undefined && layoutCategory !== 'muscu');

  const playWorkBeep = useCallback(() => playBeep(880, 400, 'square'), []);
  const playRestBeep = useCallback(() => playBeep(440, 400, 'square'), []);
  const playCountdownBeep = useCallback(() => playBeep(660, 150, 'sine'), []);
  const playEndBeep = useCallback(() => {
    playBeep(880, 200, 'square');
    setTimeout(() => playBeep(880, 200, 'square'), 300);
    setTimeout(() => playBeep(1046.50, 600, 'square'), 600);
  }, []);

  // Timer Logic
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
        
        if (session.durationMinutes > 0 && !isTimerBased) {
          setTimeRemaining(prev => {
            if (prev <= 1) {
              clearInterval(timerRef.current!);
              setIsRunning(false);
              playEndBeep();
              return 0;
            }
            if (prev <= 4 && prev > 1) playCountdownBeep();
            return prev - 1;
          });
        }

        // Phase logic for interval/timer based sessions
        if (isTimerBased) {
          setPhaseTimeLeft(prev => {
            if (prev <= 4 && prev > 1) {
              playCountdownBeep();
            }
            if (prev <= 1) {
              // Switch to next step or phase
              if (currentPhase === 'prep') {
                setCurrentPhase('work');
                playWorkBeep();
                return currentExercise?.durationSeconds || 60;
              } else if (currentPhase === 'work') {
                // Mark current as completed
                setCompletedExercises(prev => [...prev, currentExerciseIndex]);
                
                // Check if there's a next exercise
                if (currentExerciseIndex < mainBlock.length - 1) {
                  setCurrentExerciseIndex(prev => prev + 1);
                  const nextEx = mainBlock[currentExerciseIndex + 1];
                  
                  if (nextEx.isRecovery) {
                    setCurrentPhase('rest');
                    playRestBeep();
                    return nextEx.durationSeconds || 30;
                  } else {
                    setCurrentPhase('work');
                    playWorkBeep();
                    return nextEx.durationSeconds || 60;
                  }
                } else {
                  // End of session
                  clearInterval(timerRef.current!);
                  setIsRunning(false);
                  playEndBeep();
                  return 0;
                }
              } else if (currentPhase === 'rest') {
                // After rest, go to next work
                setCompletedExercises(prev => [...prev, currentExerciseIndex]);
                if (currentExerciseIndex < mainBlock.length - 1) {
                  setCurrentExerciseIndex(prev => prev + 1);
                  const nextEx = mainBlock[currentExerciseIndex + 1];
                  setCurrentPhase('work');
                  playWorkBeep();
                  return nextEx.durationSeconds || 60;
                } else {
                  clearInterval(timerRef.current!);
                  setIsRunning(false);
                  playEndBeep();
                  return 0;
                }
              }
            }
            return prev - 1;
          });
        }

      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, currentPhase, currentExerciseIndex, mainBlock, session.workoutType, session.durationMinutes, isTimerBased, playWorkBeep, playRestBeep, playCountdownBeep, playEndBeep]);

  const toggleTimer = () => setIsRunning(!isRunning);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleExercise = (index: number) => {
    if (completedExercises.includes(index)) {
      setCompletedExercises(completedExercises.filter(i => i !== index));
    } else {
      setCompletedExercises([...completedExercises, index]);
      if (isTimerBased && index === currentExerciseIndex) {
          // Skip to next if manually checked?
          // For now just toggle
      }
      
      // Auto-start rest timer for Muscu/Renfo if there's a rest
      if (!isTimerBased && mainBlock[index]?.rest) {
         const restStr = mainBlock[index].rest;
         const restSecs = parseInt(restStr || "0", 10);
         if (!isNaN(restSecs) && restSecs > 0) {
             setCustomRestTimer(restSecs);
             if (restTimerRef.current) clearInterval(restTimerRef.current);
             restTimerRef.current = setInterval(() => {
                 setCustomRestTimer(p => {
                     if (p <= 1) {
                         if (restTimerRef.current) clearInterval(restTimerRef.current);
                         playRestBeep();
                         return 0;
                     }
                     return p - 1;
                 });
             }, 1000);
         }
      }
    }
  };

  useEffect(() => {
      return () => {
          if (restTimerRef.current) clearInterval(restTimerRef.current);
      }
  }, []);

  const getPhaseColor = () => {
    if (!isTimerBased) return 'text-white';
    if (currentPhase === 'prep') return 'text-orange-400';
    if (currentPhase === 'work') return 'text-action-400';
    if (currentPhase === 'rest') return 'text-green-400';
    return 'text-white';
  };

  const getThemeClasses = () => {
    switch (layoutCategory) {
      case 'cardio': return { bg: 'bg-emerald-950', accentBg: 'bg-emerald-500', accentText: 'text-emerald-400', restBg: 'bg-emerald-900/50', icon: 'directions_run' };
      case 'muscu': return { bg: 'bg-zinc-950', accentBg: 'bg-yellow-500', accentText: 'text-yellow-400', restBg: 'bg-zinc-900/50', icon: 'fitness_center' };
      case 'crosstraining': return { bg: 'bg-military-950', accentBg: 'bg-action-500', accentText: 'text-action-400', restBg: 'bg-military-900/50', icon: 'timer' };
      default: return { bg: 'bg-slate-950', accentBg: 'bg-blue-500', accentText: 'text-blue-400', restBg: 'bg-slate-900/50', icon: 'accessibility_new' };
    }
  };

  const theme = getThemeClasses();

  const getPhaseBg = () => {
    if (!isTimerBased) return theme.restBg;
    if (currentPhase === 'prep') return 'bg-orange-900/20';
    if (currentPhase === 'work') return 'bg-action-900/20';
    if (currentPhase === 'rest') return 'bg-green-900/20';
    return theme.restBg;
  };

  return (
    <div className={`fixed inset-0 z-50 ${theme.bg} text-white flex flex-col overflow-hidden animate-[fadeIn_0.3s]`}>
      {/* Header */}
      <div className={`flex justify-between items-center p-6 shrink-0 border-b border-white/10`}>
        <div className="flex items-center gap-4">
          <div className={`${theme.accentBg} bg-opacity-20 p-3 rounded-xl flex items-center justify-center`}>
            <span className={`material-icons ${theme.accentText} text-2xl`}>{theme.icon}</span>
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white">{session.title}</h2>
            <p className="text-gray-400 font-bold text-xs md:text-sm uppercase tracking-widest">{session.workoutType || 'Séance'}</p>
          </div>
        </div>
        <button onClick={onCancel} className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10">
          <span className="material-icons">close</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 flex ${layoutCategory === 'cardio' ? 'flex-col' : 'flex-col md:flex-row'} overflow-hidden`}>
        
        {/* Timer Section */}
        <div className={`flex flex-col items-center justify-center p-8 ${getPhaseBg()} transition-colors duration-500 border-b ${layoutCategory === 'cardio' ? '' : 'md:border-b-0 md:border-r'} border-white/10 ${layoutCategory === 'cardio' ? 'py-12' : 'flex-1'}`}>
          
          {isTimerBased && (
            <div className="text-center mb-8">
              <div className={`text-2xl md:text-4xl font-black uppercase tracking-widest mb-2 ${getPhaseColor()} animate-pulse`}>
                {currentPhase === 'prep' ? 'Préparation' : currentPhase === 'work' ? 'Travail' : 'Repos'}
              </div>
              <div className="text-lg md:text-2xl font-bold text-white/80 uppercase tracking-tight">
                {currentPhase === 'prep' ? 'Préparez-vous' : currentExercise?.exercise || 'Exercice'}
              </div>
            </div>
          )}

          {(!isTimerBased && customRestTimer > 0) && (
              <div className="mb-6 flex flex-col items-center animate-bounce">
                  <span className={`text-sm font-bold uppercase tracking-widest ${theme.accentText}`}>Temps de repos</span>
                  <div className={`text-6xl font-black tabular-nums tracking-tighter ${theme.accentText}`}>
                      {formatTime(customRestTimer)}
                  </div>
              </div>
          )}

          <div className={`font-black tabular-nums tracking-tighter leading-none mb-12 ${getPhaseColor()} drop-shadow-2xl ${layoutCategory === 'cardio' ? 'text-[8rem] md:text-[14rem]' : 'text-8xl md:text-[10rem]'}`}>
            {isTimerBased ? formatTime(phaseTimeLeft) : 
             session.durationMinutes > 0 ? formatTime(timeRemaining) : 
             formatTime(timeElapsed)}
          </div>

          <div className="flex gap-6 w-full max-w-md">
            <button 
              onClick={toggleTimer}
              className={`flex-1 py-5 rounded-2xl font-black uppercase tracking-wider text-white transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3 text-lg md:text-xl shadow-2xl ${isRunning ? 'bg-red-500/80 hover:bg-red-500' : `${theme.accentBg} hover:opacity-80`}`}
            >
              <span className="material-icons text-3xl">{isRunning ? 'pause' : 'play_arrow'}</span>
              {isRunning ? 'Pause' : 'Start'}
            </button>
            <button 
              onClick={() => {
                setIsRunning(false);
                setTimeElapsed(0);
                if (session.durationMinutes > 0) setTimeRemaining(session.durationMinutes * 60);
                setPhaseTimeLeft(10);
                setCurrentPhase('prep');
                setCustomRestTimer(0);
              }}
              className="px-6 py-5 rounded-2xl font-black uppercase tracking-wider text-white bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center"
            >
              <span className="material-icons text-3xl">stop</span>
            </button>
          </div>

          {/* Overall progress */}
          {session.durationMinutes > 0 && (
            <div className={`w-full max-w-md mt-12`}>
              <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                <span>Progression Globale</span>
                <span>{formatTime(timeElapsed)} / {formatTime(session.durationMinutes * 60)}</span>
              </div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${theme.accentBg} transition-all duration-1000`}
                  style={{ width: `${(timeElapsed / (session.durationMinutes * 60)) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Exercises List (Right/Bottom) */}
        <div className={`flex-1 overflow-y-auto p-6 md:p-8 bg-black/40 custom-scrollbar`}>
          
          {session.content?.advice && (
            <div className={`${theme.accentBg} bg-opacity-20 ${theme.accentText} p-5 rounded-2xl text-sm font-medium mb-8 backdrop-blur-sm`}>
              <span className="font-black uppercase tracking-wider block mb-2 flex items-center gap-2">
                <span className="material-icons text-sm">lightbulb</span> Conseil
              </span>
              {session.content.advice}
            </div>
          )}

          {session.equipmentNeeded && session.equipmentNeeded.length > 0 && (
             <div className="mb-8">
               <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                 <span className="material-icons text-sm">inventory_2</span> Matériel requis
               </h3>
               <div className="flex flex-wrap gap-2">
                 {session.equipmentNeeded.map((eq, i) => (
                   <span key={i} className="px-3 py-1.5 bg-white/10 text-white rounded-lg text-xs font-bold uppercase">{eq}</span>
                 ))}
               </div>
             </div>
          )}

          {session.content?.warmup && (
            <div className="mb-8">
              <h3 className="text-sm font-black text-orange-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="material-icons text-sm">local_fire_department</span> Échauffement
              </h3>
              <div className="p-5 bg-white/5 rounded-2xl border border-white/10 text-sm text-gray-300 font-medium leading-relaxed whitespace-pre-line">
                {session.content.warmup}
              </div>
            </div>
          )}

          {(session.content?.mainBlock && session.content.mainBlock.length > 0) && (
            <div className="mb-8">
              <h3 className={`text-sm font-black ${theme.accentText} uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-white/10 pb-3`}>
                  <span className="material-icons text-sm">{theme.icon}</span> Corps de séance
              </h3>
              <div className={layoutCategory === 'cardio' ? "grid grid-cols-1 md:grid-cols-2 gap-3" : "space-y-3"}>
                {session.content.mainBlock.map((block, idx) => {
                  const isCompleted = completedExercises.includes(idx);
                  const isNext = !isCompleted && (idx === 0 || completedExercises.includes(idx - 1));
                  const isCurrent = isTimerBased && idx === currentExerciseIndex && isRunning;
                  
                  return (
                    <div 
                      key={idx} 
                      onClick={() => toggleExercise(idx)}
                      className={`p-5 rounded-2xl border cursor-pointer transition-all flex items-center gap-5 
                          ${isCompleted ? 'bg-green-900/40 border-green-500/30 opacity-60' : 
                            isCurrent ? `${theme.accentBg} bg-opacity-30 ${theme.accentText} border-white/20 transform scale-[1.02] z-10` :
                            isNext ? 'bg-white/10 border-white/20' : 
                            'bg-white/5 border-white/5 hover:border-white/20'}
                          ${block.isRecovery ? 'border-blue-500/30 bg-blue-900/20' : ''}`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-colors
                          ${isCompleted ? 'bg-green-500 border-green-500 text-white' : 
                            isCurrent ? `${theme.accentBg} border-white/40 text-black` :
                            isNext ? 'border-white/40 text-white/40' : 
                            'border-white/10 text-transparent'}`}>
                        <span className="material-icons text-lg">
                          {isCompleted ? 'check' : isCurrent ? 'timer' : isNext ? 'play_arrow' : ''}
                        </span>
                      </div>
                      <div className="flex-grow">
                        <h4 className={`text-lg font-black uppercase tracking-tight 
                          ${isCompleted ? 'text-green-400 line-through' : 
                            isCurrent ? 'text-white' : 
                            block.isRecovery ? 'text-blue-400' : 'text-gray-200'}`}>
                          {block.exercise}
                        </h4>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {block.durationSeconds ? (
                             <span className={`text-xs font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider ${isCurrent ? 'bg-white/20 text-white' : 'bg-white/10 text-gray-300'}`}>
                               {formatTime(block.durationSeconds)}
                             </span>
                          ) : (
                             <span className={`text-xs font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider ${isCurrent ? 'bg-white/20 text-white' : 'bg-white/10 text-gray-300'}`}>
                               {block.prescription}
                             </span>
                          )}
                          {block.tempo && block.tempo !== "-" && (
                            <span className="text-xs font-bold text-purple-300 bg-purple-900/30 px-3 py-1.5 rounded-lg uppercase tracking-wider flex items-center gap-1.5 border border-purple-500/20">
                                <span className="material-icons text-[12px]">speed</span> {block.tempo}
                            </span>
                          )}
                          {block.rest && block.rest !== "-" && block.rest !== "0" && (
                            <span className="text-xs font-bold text-blue-300 bg-blue-900/30 px-3 py-1.5 rounded-lg uppercase tracking-wider flex items-center gap-1.5 border border-blue-500/20">
                                <span className="material-icons text-[12px]">timer</span> Repos: {block.rest}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {session.content?.cooldown && (
            <div className="mb-12">
              <h3 className="text-sm font-black text-cyan-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="material-icons text-sm">ac_unit</span> Retour au calme
              </h3>
              <div className="p-5 bg-white/5 rounded-2xl border border-white/10 text-sm text-gray-300 font-medium leading-relaxed whitespace-pre-line">
                {session.content.cooldown}
              </div>
            </div>
          )}

          <button 
            onClick={() => onComplete(session)}
            className={`w-full py-5 ${theme.accentBg} hover:opacity-80 text-white rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 text-lg cursor-pointer ${theme.bg === 'bg-zinc-950' ? 'text-black' : ''}`}
          >
            <span className="material-icons">task_alt</span>
            Terminer la séance
          </button>
        </div>

      </div>
    </div>
  );
};

export default LiveSession;
