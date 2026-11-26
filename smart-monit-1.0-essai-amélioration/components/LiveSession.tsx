import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Session, WorkoutType, UserProfile } from '../types';
import { adaptPrescription, parseRestToSeconds, calculatePlateBreakdown } from '../utils/biometrics';
import { db } from '../services/mockDatabase';
import ExerciseIllustration, { ExerciseDetailModal } from './ExerciseIllustration';
import { resolveExerciseVisual } from '../utils/exerciseVisuals';

interface LiveSessionProps {
  user: UserProfile;
  session: Session;
  sessionType?: 'FLASH' | 'PROGRAM' | 'COLLECTIVE' | 'FREE' | 'LIBRARY';
  onComplete: (
    session: Session,
    meta: { durationMinutes: number; rpe: number; notes: string; totalVolumeKg?: number; setsCompleted?: number }
  ) => void;
  onCancel: () => void;
}

interface SetLogEntry {
  done: boolean;
  kg: number;
  reps: number;
}

// Singleton AudioContext (évite la saturation navigateur)
let sharedAudioCtx: AudioContext | null = null;
const playBeep = (frequency = 440, duration = 200, type: OscillatorType = 'sine', muted = false) => {
  if (muted) return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    if (!sharedAudioCtx) sharedAudioCtx = new AudioCtx();
    if (sharedAudioCtx.state === 'suspended') sharedAudioCtx.resume();

    const osc = sharedAudioCtx.createOscillator();
    const gainNode = sharedAudioCtx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gainNode.gain.setValueAtTime(0.18, sharedAudioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, sharedAudioCtx.currentTime + duration / 1000);

    osc.connect(gainNode);
    gainNode.connect(sharedAudioCtx.destination);
    osc.start();
    osc.stop(sharedAudioCtx.currentTime + duration / 1000);
  } catch {
    // Audio bloqué avant interaction utilisateur
  }
};

const parseInitialSets = (prescription: string, adapted: string): SetLogEntry[] => {
  const setsMatch = prescription.match(/(\d+)\s*(?:s[eé]ries?|tours?|x)/i);
  const count = Math.min(6, Math.max(1, setsMatch ? parseInt(setsMatch[1], 10) : 3));
  const repsMatch = prescription.match(/[x×]\s*(\d+)/i) || prescription.match(/(\d+)\s*reps?/i);
  const reps = repsMatch ? parseInt(repsMatch[1], 10) : 10;
  const kgMatch = adapted.match(/(\d+(?:[.,]\d+)?)\s*kg/i);
  const kg = kgMatch ? Math.round(parseFloat(kgMatch[1].replace(',', '.'))) : 0;
  return Array.from({ length: count }, () => ({ done: false, kg, reps }));
};

const LiveSession: React.FC<LiveSessionProps> = ({
  user,
  session,
  sessionType = 'FLASH',
  onComplete,
  onCancel
}) => {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState((session.durationMinutes || 0) * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [phaseTimeLeft, setPhaseTimeLeft] = useState(10);
  const [currentPhase, setCurrentPhase] = useState<'prep' | 'work' | 'rest'>('prep');
  const [completedExercises, setCompletedExercises] = useState<number[]>([]);
  const [customRestTimer, setCustomRestTimer] = useState<number>(0);

  // Outils Pro Hevy / SmartWOD : Chrono WOD, Calculateur de Disques & Suivi Séries/Tonnage
  const [wodMode, setWodMode] = useState<'SESSION' | 'EMOM' | 'TABATA'>('SESSION');
  const [showPlateCalc, setShowPlateCalc] = useState(false);
  const [plateTargetKg, setPlateTargetKg] = useState(80);
  const [plateBarKg, setPlateBarKg] = useState<20 | 15>(20);
  const [detailExerciseName, setDetailExerciseName] = useState<string | null>(null);

  // Modal fin de séance (RPE + ressenti)
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [rpe, setRpe] = useState(6);
  const [notes, setNotes] = useState('');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeSessionIdRef = useRef<string>(`live_${user.nid}_${Date.now()}`);

  const currentDate = new Date();
  const todayStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
  const todayDaily = user.dailyForms.find((d) => d.date === todayStr);

  const mainBlock = session.content?.mainBlock || [];

  // Journal série par série (Set-by-Set Logger façon Hevy)
  const [setLogs, setSetLogs] = useState<Record<number, SetLogEntry[]>>(() => {
    const initial: Record<number, SetLogEntry[]> = {};
    mainBlock.forEach((b, idx) => {
      if (!b.isRecovery && !b.durationSeconds) {
        const adapted = adaptPrescription(b.prescription || '', user, todayDaily, b.exercise);
        initial[idx] = parseInitialSets(b.prescription || '', adapted);
      }
    });
    return initial;
  });

  const { totalVolumeKg, totalSetsDone } = useMemo(() => {
    let vol = 0;
    let sets = 0;
    (Object.values(setLogs) as SetLogEntry[][]).forEach((entries) => {
      entries.forEach((entry) => {
        if (entry.done) {
          sets += 1;
          vol += (entry.kg || 0) * (entry.reps || 0);
        }
      });
    });
    return { totalVolumeKg: Math.round(vol), totalSetsDone: sets };
  }, [setLogs]);

  // Enregistre la présence dans le Monitoring Live + Registre Sport Unité dès l'ouverture
  useEffect(() => {
    const sid = activeSessionIdRef.current;
    db.startSession({
      id: sid,
      userId: user.nid,
      userName: user.name,
      serviceId: user.serviceId,
      unit: user.unit,
      infrastructureId: session.infrastructureId || 'any',
      infrastructureName: session.locationName || 'Installation Base',
      sessionType: sessionType as 'FLASH' | 'PROGRAM' | 'COLLECTIVE' | 'FREE' | 'LIBRARY',
      startTime: new Date().toISOString(),
      details: session.title,
      sessionPayload: session
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    };
  }, [session, sessionType, user.nid, user.name, user.serviceId, user.unit]);

  const currentExercise = mainBlock[currentExerciseIndex];

  const resetWorkout = () => {
    setIsRunning(false);
    setTimeElapsed(0);
    if (session.durationMinutes > 0) setTimeRemaining(session.durationMinutes * 60);
    setCurrentExerciseIndex(0);
    setCompletedExercises([]);
    setCurrentPhase('prep');
    setPhaseTimeLeft(10);
    setCustomRestTimer(0);
    if (restTimerRef.current) clearInterval(restTimerRef.current);
  };

  const wType = (session.workoutType || session.type || '').toUpperCase();
  let layoutCategory: 'cardio' | 'muscu' | 'crosstraining' | 'renfo' = 'renfo';
  if (['CARDIO', 'NATATION', 'COURSE'].some((k) => wType.includes(k))) layoutCategory = 'cardio';
  else if (wType.includes('MUSCU')) layoutCategory = 'muscu';
  else if ([WorkoutType.TABATA, WorkoutType.EMOM, WorkoutType.AMRAP, WorkoutType.HIIT, WorkoutType.FOR_TIME, WorkoutType.HYROX].includes(wType as WorkoutType)) {
    layoutCategory = 'crosstraining';
  }

  const isIntervalDriven =
    wodMode !== 'SESSION' ||
    (mainBlock.some((ex) => ex.durationSeconds !== undefined) && layoutCategory !== 'muscu');

  const playWorkBeep = useCallback(() => playBeep(880, 350, 'square', muted), [muted]);
  const playRestBeep = useCallback(() => playBeep(440, 350, 'square', muted), [muted]);
  const playCountdownBeep = useCallback(() => playBeep(660, 120, 'sine', muted), [muted]);
  const playEndBeep = useCallback(() => {
    playBeep(880, 180, 'square', muted);
    setTimeout(() => playBeep(1046.5, 450, 'square', muted), 250);
  }, [muted]);

  useEffect(() => {
    if (!isRunning) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeElapsed((prev) => prev + 1);

      if (wodMode === 'EMOM') {
        setPhaseTimeLeft((prev) => {
          if (prev <= 4 && prev > 1) playCountdownBeep();
          if (prev <= 1) {
            playWorkBeep();
            return 60;
          }
          return prev - 1;
        });
        return;
      }

      if (wodMode === 'TABATA') {
        setPhaseTimeLeft((prev) => {
          if (prev <= 4 && prev > 1) playCountdownBeep();
          if (prev <= 1) {
            if (currentPhase === 'work') {
              setCurrentPhase('rest');
              playRestBeep();
              return 10;
            }
            setCurrentPhase('work');
            playWorkBeep();
            return 20;
          }
          return prev - 1;
        });
        return;
      }

      if (session.durationMinutes > 0 && !isIntervalDriven) {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            setIsRunning(false);
            playEndBeep();
            return 0;
          }
          if (prev <= 4 && prev > 1) playCountdownBeep();
          return prev - 1;
        });
      }

      if (isIntervalDriven) {
        setPhaseTimeLeft((prev) => {
          if (prev <= 4 && prev > 1) playCountdownBeep();
          if (prev <= 1) {
            if (currentPhase === 'prep') {
              setCurrentPhase('work');
              playWorkBeep();
              return currentExercise?.durationSeconds || 60;
            }
            setCompletedExercises((done) => (done.includes(currentExerciseIndex) ? done : [...done, currentExerciseIndex]));
            if (currentExerciseIndex < mainBlock.length - 1) {
              const nextIdx = currentExerciseIndex + 1;
              setCurrentExerciseIndex(nextIdx);
              const nextEx = mainBlock[nextIdx];
              if (nextEx.isRecovery) {
                setCurrentPhase('rest');
                playRestBeep();
                return nextEx.durationSeconds || 30;
              }
              setCurrentPhase('work');
              playWorkBeep();
              return nextEx.durationSeconds || 60;
            } else {
              if (timerRef.current) clearInterval(timerRef.current);
              setIsRunning(false);
              playEndBeep();
              return 0;
            }
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, wodMode, currentPhase, currentExerciseIndex, mainBlock, session.durationMinutes, isIntervalDriven, currentExercise, playWorkBeep, playRestBeep, playCountdownBeep, playEndBeep]);

  const startRestCountdown = (seconds: number) => {
    if (seconds <= 0) return;
    setCustomRestTimer(seconds);
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    restTimerRef.current = setInterval(() => {
      setCustomRestTimer((p) => {
        if (p <= 4 && p > 1) playCountdownBeep();
        if (p <= 1) {
          if (restTimerRef.current) clearInterval(restTimerRef.current);
          playWorkBeep();
          return 0;
        }
        return p - 1;
      });
    }, 1000);
  };

  const adjustRestTimer = (delta: number) => {
    setCustomRestTimer((prev) => Math.max(5, prev + delta));
  };

  const toggleSetDone = (exIdx: number, setIdx: number) => {
    setSetLogs((prev) => {
      const list = [...(prev[exIdx] || [])];
      if (!list[setIdx]) return prev;
      const nowDone = !list[setIdx].done;
      list[setIdx] = { ...list[setIdx], done: nowDone };
      const allDone = list.every((s) => s.done);
      if (nowDone) {
        const restSecs = parseRestToSeconds(mainBlock[exIdx]?.rest) || 60;
        startRestCountdown(restSecs);
        setCurrentExerciseIndex(exIdx);
        if (allDone && !completedExercises.includes(exIdx)) {
          setCompletedExercises((c) => [...c, exIdx]);
        }
      } else if (!allDone && completedExercises.includes(exIdx)) {
        setCompletedExercises((c) => c.filter((i) => i !== exIdx));
      }
      return { ...prev, [exIdx]: list };
    });
  };

  const updateSetField = (exIdx: number, setIdx: number, field: 'kg' | 'reps', val: number) => {
    setSetLogs((prev) => {
      const list = [...(prev[exIdx] || [])];
      if (!list[setIdx]) return prev;
      list[setIdx] = { ...list[setIdx], [field]: Math.max(0, val) };
      return { ...prev, [exIdx]: list };
    });
  };

  const toggleExercise = (index: number) => {
    setCurrentExerciseIndex(index);
    if (completedExercises.includes(index)) {
      setCompletedExercises(completedExercises.filter((i) => i !== index));
    } else {
      setCompletedExercises([...completedExercises, index]);
      const restSecs = parseRestToSeconds(mainBlock[index]?.rest);
      if (restSecs > 0) {
        startRestCountdown(restSecs);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const safe = Math.max(0, Math.floor(seconds));
    const m = Math.floor(safe / 60);
    const s = safe % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleConfirmCancel = () => {
    db.endSession(activeSessionIdRef.current, 'CANCELLED');
    onCancel();
  };

  const handleConfirmComplete = () => {
    db.endSession(activeSessionIdRef.current, 'COMPLETED');
    const actualMinutes = Math.max(1, Math.round(timeElapsed / 60) || session.durationMinutes || 15);
    onComplete(session, {
      durationMinutes: actualMinutes,
      rpe,
      notes,
      totalVolumeKg: totalVolumeKg > 0 ? totalVolumeKg : undefined,
      setsCompleted: totalSetsDone > 0 ? totalSetsDone : undefined
    });
  };

  const theme =
    layoutCategory === 'cardio'
      ? { bg: 'bg-emerald-950', accentBg: 'bg-emerald-500', accentText: 'text-emerald-400', icon: 'directions_run' }
      : layoutCategory === 'muscu'
      ? { bg: 'bg-zinc-950', accentBg: 'bg-action-500', accentText: 'text-action-400', icon: 'fitness_center' }
      : layoutCategory === 'crosstraining'
      ? { bg: 'bg-military-950', accentBg: 'bg-action-500', accentText: 'text-action-400', icon: 'timer' }
      : { bg: 'bg-slate-950', accentBg: 'bg-blue-500', accentText: 'text-blue-400', icon: 'accessibility_new' };

  const equipmentNeeded = session.content?.equipmentNeeded || session.material || [];
  const activeExerciseName = currentExercise?.exercise || session.title;
  const activeGuide = resolveExerciseVisual(activeExerciseName, session.workoutType || session.type);
  const plateBreakdown = calculatePlateBreakdown(plateTargetKg, plateBarKg);

  return (
    <div className={`fixed inset-0 z-50 ${theme.bg} text-white flex flex-col overflow-hidden animate-[fadeIn_0.25s]`}>
      {/* Header */}
      <div className="flex justify-between items-center px-4 md:px-5 py-3.5 shrink-0 border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`${theme.accentBg} bg-opacity-20 p-2 rounded-xl flex items-center justify-center shrink-0`}>
            <span className={`material-icons ${theme.accentText} text-xl`}>{theme.icon}</span>
          </div>
          <div className="min-w-0">
            <h2 className="text-sm md:text-lg font-black uppercase tracking-tight text-white truncate">
              {session.title}
            </h2>
            <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold flex-wrap">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Registre Sport actif ({session.locationName || 'Base'})
              </span>
              {totalVolumeKg > 0 && (
                <span className="px-2 py-0.5 rounded bg-action-500/20 text-action-300 font-black">
                  Tonnage : {totalVolumeKg.toLocaleString('fr-FR')} kg ({totalSetsDone} séries)
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowPlateCalc(true)}
            className="text-action-300 hover:text-action-200 px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase flex items-center gap-1"
            title="Calculateur de disques olympiques"
          >
            <span className="material-icons text-base">fitness_center</span>
            <span className="hidden sm:inline">Disques</span>
          </button>
          <button
            type="button"
            onClick={() => setMuted(!muted)}
            className="text-gray-300 hover:text-white p-2 rounded-xl bg-white/5 hover:bg-white/10"
            title={muted ? 'Activer les bips sonores' : 'Couper le son'}
          >
            <span className="material-icons text-xl">{muted ? 'volume_off' : 'volume_up'}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowCancelConfirm(true)}
            className="text-gray-300 hover:text-red-400 p-2 rounded-xl bg-white/5 hover:bg-white/10"
            title="Quitter la séance"
            aria-label="Quitter la séance"
          >
            <span className="material-icons text-xl">close</span>
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Colonne Gauche : Schéma animé de l'exercice actif + Chronomètre Pro */}
        <div className="flex flex-col items-center justify-center p-4 md:p-6 border-b md:border-b-0 md:border-r border-white/10 md:w-[40%] shrink-0 overflow-y-auto custom-scrollbar">
          {/* Sélecteur rapide mode Chrono (Séance / EMOM / Tabata) */}
          <div className="flex bg-white/10 p-1 rounded-xl mb-3 text-[10px] font-black uppercase">
            {[
              { id: 'SESSION', label: 'Séance' },
              { id: 'EMOM', label: 'EMOM 1\'' },
              { id: 'TABATA', label: 'Tabata 20/10' }
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setWodMode(m.id as any);
                  setIsRunning(false);
                  if (m.id === 'EMOM') {
                    setCurrentPhase('work');
                    setPhaseTimeLeft(60);
                  } else if (m.id === 'TABATA') {
                    setCurrentPhase('work');
                    setPhaseTimeLeft(20);
                  }
                }}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  wodMode === m.id ? `${theme.accentBg} text-military-950` : 'text-gray-300 hover:text-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Schéma Biomécanique Animé de l'exercice en cours */}
          <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-3 mb-4 w-full max-w-sm">
            <ExerciseIllustration
              exerciseName={activeExerciseName}
              fallbackType={session.workoutType || session.type}
              size="md"
              dark
            />
            <div className="min-w-0 flex-1">
              <span className={`text-[9px] font-black uppercase tracking-widest ${theme.accentText}`}>
                {wodMode !== 'SESSION'
                  ? `${wodMode} • ${currentPhase === 'rest' ? 'REPOS' : 'EFFORT'}`
                  : `Exercice ${Math.min(currentExerciseIndex + 1, Math.max(1, mainBlock.length))}/${Math.max(1, mainBlock.length)}`}
              </span>
              <div className="font-black text-sm text-white truncate mt-0.5">{activeExerciseName}</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {activeGuide.primaryMuscles.slice(0, 2).map((m) => (
                  <span key={m} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-gray-200">
                    {m}
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setDetailExerciseName(activeExerciseName)}
                className="text-[10px] font-black text-action-400 hover:underline mt-1.5 flex items-center gap-0.5"
              >
                <span className="material-icons text-xs">menu_book</span> Fiche technique & consignes
              </button>
            </div>
          </div>

          {customRestTimer > 0 && (
            <div className="mb-3 px-4 py-2.5 rounded-2xl bg-blue-900/60 border border-blue-400/40 flex items-center justify-between gap-3 w-full max-w-sm">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-blue-300 block">Repos actif</span>
                <span className="text-2xl font-black tabular-nums text-white">{formatTime(customRestTimer)}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => adjustRestTimer(-15)}
                  className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-black"
                >
                  -15s
                </button>
                <button
                  type="button"
                  onClick={() => adjustRestTimer(15)}
                  className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-black"
                >
                  +15s
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (restTimerRef.current) clearInterval(restTimerRef.current);
                    setCustomRestTimer(0);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-action-500 text-military-950 text-[10px] font-black uppercase"
                >
                  Go
                </button>
              </div>
            </div>
          )}

          <div className="font-black tabular-nums tracking-tighter leading-none text-6xl md:text-7xl mb-4 drop-shadow-2xl">
            {isIntervalDriven
              ? formatTime(phaseTimeLeft)
              : session.durationMinutes > 0
              ? formatTime(timeRemaining)
              : formatTime(timeElapsed)}
          </div>

          <div className="flex gap-3 w-full max-w-sm">
            <button
              type="button"
              onClick={() => setIsRunning(!isRunning)}
              className={`flex-1 py-3.5 rounded-2xl font-black uppercase tracking-wider text-sm flex items-center justify-center gap-2 shadow-xl transition-transform active:scale-95 ${
                isRunning ? 'bg-red-600 hover:bg-red-500 text-white' : `${theme.accentBg} text-military-950`
              }`}
            >
              <span className="material-icons text-2xl">{isRunning ? 'pause' : 'play_arrow'}</span>
              {isRunning ? 'Pause' : 'Démarrer'}
            </button>
            <button
              type="button"
              onClick={resetWorkout}
              className="px-4 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
              title="Réinitialiser"
              aria-label="Réinitialiser la séance"
            >
              <span className="material-icons">replay</span>
            </button>
          </div>

          {/* Boutons rapides chrono repos */}
          <div className="mt-4 flex items-center gap-1.5 flex-wrap justify-center">
            <span className="text-[10px] font-bold uppercase text-gray-400">Repos :</span>
            {[30, 60, 90, 120, 180].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => startRestCountdown(sec)}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-bold"
              >
                {sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}'${sec % 60 ? sec % 60 : ''}`}
              </button>
            ))}
          </div>

          {session.durationMinutes > 0 && (
            <div className="w-full max-w-sm mt-4">
              <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase mb-1">
                <span>Temps écoulé</span>
                <span>
                  {formatTime(timeElapsed)} / {formatTime(session.durationMinutes * 60)}
                </span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full ${theme.accentBg} transition-all duration-1000`}
                  style={{ width: `${Math.min(100, (timeElapsed / (session.durationMinutes * 60)) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Colonne Droite : Exercices illustrés + Logger Série par Série (Hevy Pro) */}
        <div className="flex-1 overflow-y-auto p-4 md:p-7 bg-black/35 custom-scrollbar space-y-5">
          {session.content?.advice && (
            <div className="p-4 rounded-2xl bg-white/10 border border-white/10 text-xs text-gray-200 leading-relaxed">
              <span className={`font-black uppercase tracking-wider block mb-1 ${theme.accentText}`}>
                Conseil EPMS
              </span>
              {adaptPrescription(session.content.advice, user, todayDaily)}
            </div>
          )}

          {equipmentNeeded.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-[10px] font-black uppercase text-gray-400">Matériel :</span>
              {equipmentNeeded.map((eq, i) => (
                <span key={i} className="px-2.5 py-1 bg-white/10 text-white rounded-lg text-[11px] font-bold uppercase">
                  {eq}
                </span>
              ))}
            </div>
          )}

          {session.content?.warmup && (
            <div>
              <h3 className="text-xs font-black text-orange-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <span className="material-icons text-sm">local_fire_department</span> Échauffement
              </h3>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-xs text-gray-200 leading-relaxed whitespace-pre-line">
                {adaptPrescription(session.content.warmup, user, todayDaily)}
              </div>
            </div>
          )}

          {mainBlock.length > 0 && (
            <div>
              <div className="mb-3">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <h3 className={`text-xs font-black ${theme.accentText} uppercase tracking-widest flex items-center gap-1.5`}>
                    <span className="material-icons text-sm">{theme.icon}</span> Corps de séance illustré
                  </h3>
                  <span className="text-[11px] font-bold text-gray-300">
                    {completedExercises.length}/{mainBlock.length} validé(s)
                  </span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${theme.accentBg} transition-all`}
                    style={{ width: `${(completedExercises.length / mainBlock.length) * 100}%` }}
                  />
                </div>
              </div>

              <div className="space-y-3">
                {mainBlock.map((block, idx) => {
                  const isCompleted = completedExercises.includes(idx);
                  const adaptedPresc = adaptPrescription(block.prescription, user, todayDaily, block.exercise);
                  const sets = setLogs[idx] || [];
                  const kgMatch = adaptedPresc.match(/(\d+(?:[.,]\d+)?)\s*kg/i);

                  return (
                    <div
                      key={idx}
                      onClick={() => setCurrentExerciseIndex(idx)}
                      className={`p-4 rounded-2xl border transition-all space-y-3 ${
                        isCompleted
                          ? 'bg-emerald-900/35 border-emerald-500/40'
                          : idx === currentExerciseIndex
                          ? 'bg-white/10 border-action-400/70 shadow-lg'
                          : 'bg-white/5 border-white/10 hover:border-white/25'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <ExerciseIllustration
                          exerciseName={block.exercise}
                          fallbackType={session.workoutType || session.type}
                          size="sm"
                          dark
                        />
                        <div className="flex-grow min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className={`text-sm md:text-base font-black ${isCompleted ? 'text-emerald-300 line-through' : 'text-white'}`}>
                              {block.exercise}
                            </h4>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExercise(idx);
                              }}
                              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors ${
                                isCompleted
                                  ? 'bg-emerald-500 border-emerald-500 text-white'
                                  : 'border-white/30 text-white/60 hover:border-action-400 hover:text-action-400'
                              }`}
                              title={isCompleted ? 'Dévalider' : 'Valider l\'exercice'}
                            >
                              <span className="material-icons text-sm">check</span>
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-white/15 text-action-200">
                              {block.durationSeconds ? formatTime(block.durationSeconds) : adaptedPresc}
                            </span>
                            {block.tempo && block.tempo !== '-' && (
                              <span className="text-[10px] font-bold text-purple-200 bg-purple-900/40 px-2 py-0.5 rounded-lg">
                                Tempo {block.tempo}
                              </span>
                            )}
                            {block.rest && block.rest !== '-' && block.rest !== '0' && (
                              <span className="text-[10px] font-bold text-blue-200 bg-blue-900/40 px-2 py-0.5 rounded-lg">
                                Repos {block.rest}
                              </span>
                            )}
                            {kgMatch && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPlateTargetKg(Math.round(parseFloat(kgMatch[1].replace(',', '.'))));
                                  setShowPlateCalc(true);
                                }}
                                className="text-[10px] font-black text-action-300 bg-action-500/15 hover:bg-action-500/30 px-2 py-0.5 rounded-lg"
                              >
                                Disques →
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Suivi Série par Série (Hevy Style) */}
                      {sets.length > 0 && (
                        <div className="pt-2 border-t border-white/10 space-y-1.5">
                          <div className="grid grid-cols-12 gap-2 text-[9px] font-black uppercase text-gray-400 px-1">
                            <span className="col-span-2">Série</span>
                            <span className="col-span-4">Charge (kg)</span>
                            <span className="col-span-4">Reps</span>
                            <span className="col-span-2 text-right">OK</span>
                          </div>
                          {sets.map((st, sIdx) => (
                            <div
                              key={sIdx}
                              className={`grid grid-cols-12 gap-2 items-center p-1.5 rounded-xl transition-colors ${
                                st.done ? 'bg-emerald-500/20' : 'bg-black/25'
                              }`}
                            >
                              <span className="col-span-2 text-xs font-black text-gray-300 pl-1">S{sIdx + 1}</span>
                              <input
                                type="number"
                                min={0}
                                step={2.5}
                                value={st.kg}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => updateSetField(idx, sIdx, 'kg', Number(e.target.value))}
                                className="col-span-4 bg-white/10 border border-white/15 rounded-lg px-2 py-1 text-xs font-bold text-white text-center outline-none focus:border-action-400"
                                aria-label={`Charge série ${sIdx + 1}`}
                              />
                              <input
                                type="number"
                                min={1}
                                value={st.reps}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => updateSetField(idx, sIdx, 'reps', Number(e.target.value))}
                                className="col-span-4 bg-white/10 border border-white/15 rounded-lg px-2 py-1 text-xs font-bold text-white text-center outline-none focus:border-action-400"
                                aria-label={`Répétitions série ${sIdx + 1}`}
                              />
                              <div className="col-span-2 flex justify-end">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSetDone(idx, sIdx);
                                  }}
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                                    st.done
                                      ? 'bg-emerald-500 text-white'
                                      : 'bg-white/10 text-gray-400 hover:bg-action-500 hover:text-military-950'
                                  }`}
                                  title="Valider la série et lancer le repos"
                                >
                                  <span className="material-icons text-sm">check</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {session.content?.scaledBlock && (
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-2">
              <div className="text-[11px] font-black uppercase text-action-400">Option Scaled (Adaptée)</div>
              {session.content.scaledBlock.intro && (
                <p className="text-xs text-gray-300 italic">{session.content.scaledBlock.intro}</p>
              )}
              <ul className="text-xs text-gray-300 space-y-1">
                {session.content.scaledBlock.exercises.map((txt, i) => (
                  <li key={i}>• {txt}</li>
                ))}
              </ul>
            </div>
          )}

          {session.content?.cooldown && (
            <div>
              <h3 className="text-xs font-black text-cyan-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <span className="material-icons text-sm">ac_unit</span> Retour au calme
              </h3>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-xs text-gray-200 leading-relaxed whitespace-pre-line">
                {adaptPrescription(session.content.cooldown, user, todayDaily)}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setIsRunning(false);
              setShowFinishModal(true);
            }}
            className={`w-full py-4 ${theme.accentBg} text-military-950 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2`}
          >
            <span className="material-icons">task_alt</span>
            Terminer & Clôturer la séance
          </button>
        </div>
      </div>

      {/* Modal Fiche Biomécanique Exercice */}
      {detailExerciseName && (
        <ExerciseDetailModal
          exerciseName={detailExerciseName}
          guide={resolveExerciseVisual(detailExerciseName, session.workoutType || session.type)}
          onClose={() => setDetailExerciseName(null)}
        />
      )}

      {/* Modal Calculateur de Disques Olympiques */}
      {showPlateCalc && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
          onClick={() => setShowPlateCalc(false)}
        >
          <div
            className="bg-white text-military-900 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-[zoomIn_0.2s]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <h3 className="text-base font-black uppercase flex items-center gap-2">
                <span className="material-icons text-action-600">fitness_center</span>
                Calculateur de Disques Olympiques
              </h3>
              <button type="button" onClick={() => setShowPlateCalc(false)} className="text-gray-400 hover:text-red-500">
                <span className="material-icons">close</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Charge cible (kg)</label>
                <input
                  type="number"
                  step={2.5}
                  min={15}
                  value={plateTargetKg}
                  onChange={(e) => setPlateTargetKg(Number(e.target.value) || 20)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-black text-lg text-center"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Barre</label>
                <div className="flex gap-1.5">
                  {([20, 15] as const).map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setPlateBarKg(b)}
                      className={`flex-1 py-3 rounded-xl font-black text-sm border ${
                        plateBarKg === b ? 'bg-military-900 text-action-400 border-military-900' : 'bg-gray-50 text-gray-600 border-gray-200'
                      }`}
                    >
                      {b} kg
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-military-50 rounded-2xl p-4 border border-military-200 text-center space-y-3">
              <div className="text-[10px] font-black uppercase text-military-600">
                À charger DE CHAQUE CÔTÉ de la barre ({plateBarKg} kg)
              </div>
              {plateBreakdown.perSide.length > 0 ? (
                <div className="flex items-center justify-center gap-1.5 flex-wrap py-2">
                  <span className="h-3 w-8 bg-zinc-400 rounded-l" />
                  {plateBreakdown.perSide.map((p, idx) => (
                    <div
                      key={idx}
                      className={`px-2.5 py-4 rounded-lg font-black text-xs shadow-sm ${p.color}`}
                    >
                      {p.label}
                    </div>
                  ))}
                  <span className="h-3 w-4 bg-zinc-500 rounded-r" />
                </div>
              ) : (
                <p className="text-xs font-bold text-gray-500 py-2">Barre à vide uniquement ({plateBarKg} kg).</p>
              )}
              <div className="text-xs font-black text-military-900">
                Total chargé : <span className="text-action-700">{plateBreakdown.achievedKg} kg</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cancel-session-title"
            className="bg-white text-military-900 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl"
          >
            <div>
              <h3 id="cancel-session-title" className="text-lg font-black uppercase">Quitter cette séance ?</h3>
              <p className="text-sm text-gray-600 mt-2">
                La séance sera clôturée comme interrompue et ne sera pas enregistrée comme terminée.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-3 rounded-xl text-xs font-bold uppercase text-gray-600 bg-gray-100"
              >
                Continuer
              </button>
              <button
                onClick={handleConfirmCancel}
                className="flex-1 py-3 rounded-xl text-xs font-black uppercase text-white bg-red-600 hover:bg-red-700"
              >
                Quitter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Fin de Séance (RPE, Tonnage & Clôture Registre Sport) */}
      {showFinishModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white text-military-900 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-[zoomIn_0.2s]">
            <div>
              <h3 className="text-xl font-black uppercase">Clôture de la séance</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Votre heure de fin sera enregistrée au Registre Sport Unité et votre suivi sera mis à jour.
              </p>
            </div>

            {totalVolumeKg > 0 && (
              <div className="grid grid-cols-2 gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-center">
                <div>
                  <div className="text-[10px] font-black uppercase text-emerald-700">Tonnage Soulevé</div>
                  <div className="text-xl font-black text-emerald-900">{totalVolumeKg.toLocaleString('fr-FR')} kg</div>
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase text-emerald-700">Séries Validées</div>
                  <div className="text-xl font-black text-emerald-900">{totalSetsDone}</div>
                </div>
              </div>
            )}

            <div>
              <div className="flex justify-between text-xs font-black uppercase mb-2">
                <span>Ressenti d'effort (RPE)</span>
                <span className="text-action-600">{rpe}/10</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={rpe}
                onChange={(e) => setRpe(Number(e.target.value))}
                className="w-full accent-military-800"
              />
              <div className="flex justify-between text-[10px] text-gray-400 font-bold">
                <span>Très facile</span>
                <span>Modéré</span>
                <span>Maximal</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-gray-500 block mb-1">Notes / Sensations (optionnel)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Charges validées, bonne récup, légère tension mollet..."
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-action-500"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowFinishModal(false)}
                className="flex-1 py-3 rounded-xl text-xs font-bold uppercase text-gray-500 bg-gray-100"
              >
                Continuer
              </button>
              <button
                onClick={handleConfirmComplete}
                className="flex-[2] py-3 rounded-xl text-xs font-black uppercase bg-military-900 text-white shadow-lg hover:bg-military-800"
              >
                Enregistrer la séance
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveSession;
