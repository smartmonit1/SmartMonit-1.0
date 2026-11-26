import { useCallback, useEffect, useReducer, useState } from 'react';
import {
  BlockType,
  ExerciseLibraryItem,
  ProgramCycle,
  ProgramExercise,
  ProgramSessionBuilder,
  SessionBlock
} from '../../types';
import { ensureSessionBlocks } from '../../utils/calculationEngine';

export interface EditorHistoryState {
  past: ProgramCycle[][];
  present: ProgramCycle[];
  future: ProgramCycle[][];
}

type Action =
  | { type: 'SET'; payload: ProgramCycle[]; skipHistory?: boolean }
  | { type: 'UNDO' }
  | { type: 'REDO' };

const MAX_HISTORY = 50;

const clone = <T,>(obj: T): T => JSON.parse(JSON.stringify(obj));

const reducer = (state: EditorHistoryState, action: Action): EditorHistoryState => {
  switch (action.type) {
    case 'SET': {
      if (action.skipHistory) {
        return { ...state, present: action.payload };
      }
      const nextPast = [...state.past, state.present].slice(-MAX_HISTORY);
      return { past: nextPast, present: action.payload, future: [] };
    }
    case 'UNDO': {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future].slice(0, MAX_HISTORY)
      };
    }
    case 'REDO': {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        past: [...state.past, state.present].slice(-MAX_HISTORY),
        present: next,
        future: state.future.slice(1)
      };
    }
    default:
      return state;
  }
};

export const BLOCK_TYPE_META: Record<
  BlockType,
  { label: string; shortLabel: string; colorClass: string; icon: string }
> = {
  WARMUP: { label: 'Échauffement', shortLabel: 'Échauf.', colorClass: 'bg-orange-100 text-orange-800 border-orange-200', icon: 'local_fire_department' },
  MAIN: { label: 'Corps de séance', shortLabel: 'Corps', colorClass: 'bg-military-900 text-action-400 border-military-800', icon: 'fitness_center' },
  COOLDOWN: { label: 'Retour au calme', shortLabel: 'Calme', colorClass: 'bg-cyan-100 text-cyan-800 border-cyan-200', icon: 'ac_unit' },
  SUPERSET: { label: 'Superset', shortLabel: 'Superset', colorClass: 'bg-purple-100 text-purple-800 border-purple-200', icon: 'sync_alt' },
  CIRCUIT: { label: 'Circuit', shortLabel: 'Circuit', colorClass: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: 'loop' },
  EMOM: { label: 'EMOM', shortLabel: 'EMOM', colorClass: 'bg-amber-100 text-amber-900 border-amber-300', icon: 'schedule' },
  AMRAP: { label: 'AMRAP', shortLabel: 'AMRAP', colorClass: 'bg-red-100 text-red-800 border-red-200', icon: 'bolt' },
  TABATA: { label: 'Tabata', shortLabel: 'Tabata', colorClass: 'bg-rose-100 text-rose-800 border-rose-200', icon: 'timer' },
  FOR_TIME: { label: 'For Time', shortLabel: 'For Time', colorClass: 'bg-blue-100 text-blue-800 border-blue-200', icon: 'flag' },
  INTERVALS: { label: 'Intervalles / VMA', shortLabel: 'Intervalles', colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: 'directions_run' },
  RELAY: { label: 'Tour de rôle / Relais', shortLabel: 'Relais', colorClass: 'bg-teal-100 text-teal-800 border-teal-200', icon: 'groups' },
  CONTINUOUS: { label: 'Travail continu', shortLabel: 'Continu', colorClass: 'bg-sky-100 text-sky-800 border-sky-200', icon: 'trending_flat' }
};

export const createDefaultTernaryBlocks = (uid = Date.now()): SessionBlock[] => [
  { id: `blk_wu_${uid}`, type: 'WARMUP', title: 'Échauffement', rounds: 1, exercises: [] },
  { id: `blk_main_${uid}`, type: 'MAIN', title: 'Corps de séance', rounds: 1, exercises: [] },
  { id: `blk_cd_${uid}`, type: 'COOLDOWN', title: 'Retour au calme', rounds: 1, exercises: [] }
];

export const buildExerciseFromLibraryItem = (item: ExerciseLibraryItem): ProgramExercise => {
  const isRun = item.category === 'Course' || item.category === 'Machine Cardio';
  const isMob = item.category === 'Pilates' || item.type === 'Mobility';
  const isMarch = item.category === 'Marche / Franchissement';
  const isPdc = item.equipment === 'PDC' || item.equipment === 'Tapis';

  return {
    id: `ex_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    libraryId: item.id,
    name: item.name,
    equipment: item.equipment,
    muscleGroup: item.muscleGroup,
    mode: isMarch ? 'LOADED_MARCH' : isRun ? 'RUNNING' : isMob ? 'MOBILITY' : isPdc ? 'BODYWEIGHT' : 'STRENGTH',
    sets: isRun ? 1 : 3,
    reps: isRun || isMob || isMarch ? undefined : '10',
    percent1RM: !isRun && !isMob && !isMarch && !isPdc ? 75 : undefined,
    load: !isRun && !isMob && !isMarch && !isPdc ? '[75% 1RM]' : undefined,
    percentVMA: isRun ? 80 : undefined,
    durationSeconds: isRun ? 600 : undefined,
    holdSec: isMob ? 45 : undefined,
    distanceMeters: isMarch ? 8000 : undefined,
    carriedLoadKg: isMarch ? 12 : undefined,
    rest: isMob ? '0:30' : '1:30',
    restSec: isMob ? 30 : 90,
    adaptationBounds: {
      minIntensityDeltaPct: -20,
      maxIntensityDeltaPct: 5,
      substitutable: true,
      approvedAlternatives: (item.substitutes || []).slice(0, 3)
    }
  };
};

export const useProgramEditorState = (initialStructure: ProgramCycle[], draftKey: string) => {
  const [history, dispatch] = useReducer(reducer, {
    past: [],
    present: initialStructure,
    future: []
  });
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string>('');
  const [clipboardBlock, setClipboardBlock] = useState<SessionBlock | null>(null);

  const structure = history.present;

  const commit = useCallback((next: ProgramCycle[], skipHistory = false) => {
    // Synchronise toujours session.exercises depuis session.blocks pour compatibilité
    const normalized = next.map((c) => ({
      ...c,
      weeks: c.weeks.map((w) => ({
        ...w,
        sessions: w.sessions.map((s) => {
          const blocks = ensureSessionBlocks(s);
          return { ...s, blocks, exercises: blocks.flatMap((b) => b.exercises) };
        })
      }))
    }));
    dispatch({ type: 'SET', payload: normalized, skipHistory });
  }, []);

  // Sauvegarde automatique locale toutes les 600 ms après modification
  useEffect(() => {
    if (!draftKey || structure.length === 0) return;
    setAutosaveStatus('saving');
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({ savedAt: new Date().toISOString(), structure }));
        setAutosaveStatus('saved');
        setLastSavedAt(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } catch {
        setAutosaveStatus('idle');
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [structure, draftKey]);

  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const redo = useCallback(() => dispatch({ type: 'REDO' }), []);

  // Raccourcis clavier Ctrl+Z / Ctrl+Y
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo]);

  const mutate = useCallback(
    (mutator: (draft: ProgramCycle[]) => void) => {
      const draft = clone(structure);
      mutator(draft);
      commit(draft);
    },
    [structure, commit]
  );

  const addCycle = useCallback(
    (phaseType: ProgramCycle['phaseType'] = 'PPG') => {
      mutate((d) => {
        const uid = Date.now();
        d.push({
          id: `c_${uid}`,
          title: `Phase ${d.length + 1} (${phaseType})`,
          objective: phaseType === 'PPG' ? 'Préparation Physique Générale' : 'Préparation Physique Spécifique Métier',
          phaseType,
          isCollapsed: false,
          weeks: [
            {
              id: `w_${uid}_1`,
              number: 1,
              objective: 'Mise en charge progressive',
              sessions: [],
              isCollapsed: false
            }
          ]
        });
      });
    },
    [mutate]
  );

  const addWeek = useCallback(
    (cIdx: number) => {
      mutate((d) => {
        const weeks = d[cIdx].weeks;
        const nextNum = weeks.length + 1;
        const isDeload = nextNum % 4 === 0;
        weeks.push({
          id: `w_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
          number: nextNum,
          objective: isDeload ? 'Décharge PIA 7.1.1 (-35% volume)' : `Semaine ${nextNum}`,
          isDeload,
          sessions: [],
          isCollapsed: false
        });
      });
    },
    [mutate]
  );

  const duplicateWeek = useCallback(
    (cIdx: number, wIdx: number) => {
      mutate((d) => {
        const src = clone(d[cIdx].weeks[wIdx]);
        const nextNum = d[cIdx].weeks.length + 1;
        const stamp = Date.now();
        src.id = `w_dup_${stamp}`;
        src.number = nextNum;
        src.objective = `${src.objective || `Semaine ${wIdx + 1}`} (copie)`;
        src.sessions = src.sessions.map((s, si) => ({
          ...s,
          id: `s_dup_${stamp}_${si}`,
          blocks: ensureSessionBlocks(s).map((b, bi) => ({
            ...b,
            id: `b_dup_${stamp}_${si}_${bi}`,
            exercises: b.exercises.map((e, ei) => ({ ...e, id: `e_dup_${stamp}_${si}_${bi}_${ei}` }))
          }))
        }));
        d[cIdx].weeks.push(src);
      });
    },
    [mutate]
  );

  const addSession = useCallback(
    (cIdx: number, wIdx: number, template?: ProgramSessionBuilder) => {
      let createdIndex = 0;
      mutate((d) => {
        const sessions = d[cIdx].weeks[wIdx].sessions;
        const uid = Date.now();
        const defaultDays = [1, 3, 5, 2, 4, 6, 7];
        const dayOfWeek = defaultDays[sessions.length % defaultDays.length];
        if (template) {
          const copied = clone(template);
          copied.id = `s_${uid}`;
          copied.dayOfWeek = dayOfWeek;
          copied.blocks = ensureSessionBlocks(copied).map((b, bi) => ({
            ...b,
            id: `b_${uid}_${bi}`,
            exercises: b.exercises.map((e, ei) => ({ ...e, id: `e_${uid}_${bi}_${ei}` }))
          }));
          sessions.push(copied);
        } else {
          const blocks = createDefaultTernaryBlocks(uid);
          sessions.push({
            id: `s_${uid}`,
            title: `Séance ${sessions.length + 1}`,
            type: 'MUSCU',
            intensity: 'MODERATE',
            dayOfWeek,
            blocks,
            exercises: []
          });
        }
        createdIndex = sessions.length - 1;
      });
      return createdIndex;
    },
    [mutate]
  );

  const duplicateSession = useCallback(
    (cIdx: number, wIdx: number, sIdx: number) => {
      mutate((d) => {
        const src = clone(d[cIdx].weeks[wIdx].sessions[sIdx]);
        const uid = Date.now();
        src.id = `s_dup_${uid}`;
        src.title = `${src.title} (copie)`;
        src.blocks = ensureSessionBlocks(src).map((b, bi) => ({
          ...b,
          id: `b_dup_${uid}_${bi}`,
          exercises: b.exercises.map((e, ei) => ({ ...e, id: `e_dup_${uid}_${bi}_${ei}` }))
        }));
        d[cIdx].weeks[wIdx].sessions.splice(sIdx + 1, 0, src);
      });
    },
    [mutate]
  );

  const moveSessionToWeek = useCallback(
    (fromC: number, fromW: number, fromS: number, toC: number, toW: number) => {
      if (fromC === toC && fromW === toW) return;
      mutate((d) => {
        const [moved] = d[fromC].weeks[fromW].sessions.splice(fromS, 1);
        if (moved) d[toC].weeks[toW].sessions.push(moved);
      });
    },
    [mutate]
  );

  const deleteSession = useCallback(
    (cIdx: number, wIdx: number, sIdx: number) => {
      mutate((d) => {
        d[cIdx].weeks[wIdx].sessions.splice(sIdx, 1);
      });
    },
    [mutate]
  );

  const addBlock = useCallback(
    (cIdx: number, wIdx: number, sIdx: number, blockType: BlockType, insertAt?: number) => {
      mutate((d) => {
        const sess = d[cIdx].weeks[wIdx].sessions[sIdx];
        const blocks = ensureSessionBlocks(sess);
        const meta = BLOCK_TYPE_META[blockType];
        const newBlock: SessionBlock = {
          id: `blk_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
          type: blockType,
          title: meta.label,
          rounds: ['CIRCUIT', 'SUPERSET', 'TABATA'].includes(blockType) ? 3 : 1,
          restBetweenBlocksSec: 90,
          exercises: []
        };
        if (insertAt !== undefined) {
          blocks.splice(insertAt, 0, newBlock);
        } else {
          const cdIdx = blocks.findIndex((b) => b.type === 'COOLDOWN');
          if (blockType === 'WARMUP') blocks.unshift(newBlock);
          else if (blockType !== 'COOLDOWN' && cdIdx !== -1) blocks.splice(cdIdx, 0, newBlock);
          else blocks.push(newBlock);
        }
        sess.blocks = blocks;
      });
    },
    [mutate]
  );

  const duplicateBlock = useCallback(
    (cIdx: number, wIdx: number, sIdx: number, bIdx: number) => {
      mutate((d) => {
        const sess = d[cIdx].weeks[wIdx].sessions[sIdx];
        const blocks = ensureSessionBlocks(sess);
        const src = clone(blocks[bIdx]);
        const uid = Date.now();
        src.id = `blk_dup_${uid}`;
        src.title = `${src.title} (copie)`;
        src.exercises = src.exercises.map((e, i) => ({ ...e, id: `ex_dup_${uid}_${i}` }));
        blocks.splice(bIdx + 1, 0, src);
        sess.blocks = blocks;
      });
    },
    [mutate]
  );

  const pasteClipboardBlock = useCallback(
    (cIdx: number, wIdx: number, sIdx: number) => {
      if (!clipboardBlock) return;
      mutate((d) => {
        const sess = d[cIdx].weeks[wIdx].sessions[sIdx];
        const blocks = ensureSessionBlocks(sess);
        const uid = Date.now();
        const copy = clone(clipboardBlock);
        copy.id = `blk_paste_${uid}`;
        copy.exercises = copy.exercises.map((e, i) => ({ ...e, id: `ex_paste_${uid}_${i}` }));
        blocks.push(copy);
        sess.blocks = blocks;
      });
    },
    [clipboardBlock, mutate]
  );

  const deleteBlock = useCallback(
    (cIdx: number, wIdx: number, sIdx: number, bIdx: number) => {
      mutate((d) => {
        const sess = d[cIdx].weeks[wIdx].sessions[sIdx];
        const blocks = ensureSessionBlocks(sess);
        blocks.splice(bIdx, 1);
        sess.blocks = blocks;
      });
    },
    [mutate]
  );

  const reorderBlocks = useCallback(
    (cIdx: number, wIdx: number, sIdx: number, oldIndex: number, newIndex: number) => {
      if (oldIndex === newIndex) return;
      mutate((d) => {
        const sess = d[cIdx].weeks[wIdx].sessions[sIdx];
        const blocks = ensureSessionBlocks(sess);
        const [moved] = blocks.splice(oldIndex, 1);
        blocks.splice(newIndex, 0, moved);
        sess.blocks = blocks;
      });
    },
    [mutate]
  );

  const addExerciseToBlock = useCallback(
    (cIdx: number, wIdx: number, sIdx: number, bIdx: number, item: ExerciseLibraryItem) => {
      mutate((d) => {
        const sess = d[cIdx].weeks[wIdx].sessions[sIdx];
        const blocks = ensureSessionBlocks(sess);
        if (!blocks[bIdx]) return;
        blocks[bIdx].exercises.push(buildExerciseFromLibraryItem(item));
        sess.blocks = blocks;
      });
    },
    [mutate]
  );

  const updateExercise = useCallback(
    (cIdx: number, wIdx: number, sIdx: number, bIdx: number, eIdx: number, patch: Partial<ProgramExercise>) => {
      mutate((d) => {
        const sess = d[cIdx].weeks[wIdx].sessions[sIdx];
        const blocks = ensureSessionBlocks(sess);
        if (!blocks[bIdx]?.exercises[eIdx]) return;
        blocks[bIdx].exercises[eIdx] = { ...blocks[bIdx].exercises[eIdx], ...patch };
        sess.blocks = blocks;
      });
    },
    [mutate]
  );

  const duplicateExercise = useCallback(
    (cIdx: number, wIdx: number, sIdx: number, bIdx: number, eIdx: number) => {
      mutate((d) => {
        const sess = d[cIdx].weeks[wIdx].sessions[sIdx];
        const blocks = ensureSessionBlocks(sess);
        const src = clone(blocks[bIdx].exercises[eIdx]);
        src.id = `ex_dup_${Date.now()}`;
        blocks[bIdx].exercises.splice(eIdx + 1, 0, src);
        sess.blocks = blocks;
      });
    },
    [mutate]
  );

  const deleteExercise = useCallback(
    (cIdx: number, wIdx: number, sIdx: number, bIdx: number, eIdx: number) => {
      mutate((d) => {
        const sess = d[cIdx].weeks[wIdx].sessions[sIdx];
        const blocks = ensureSessionBlocks(sess);
        blocks[bIdx].exercises.splice(eIdx, 1);
        sess.blocks = blocks;
      });
    },
    [mutate]
  );

  const reorderExercisesInBlock = useCallback(
    (cIdx: number, wIdx: number, sIdx: number, bIdx: number, oldIndex: number, newIndex: number) => {
      if (oldIndex === newIndex) return;
      mutate((d) => {
        const sess = d[cIdx].weeks[wIdx].sessions[sIdx];
        const blocks = ensureSessionBlocks(sess);
        const [moved] = blocks[bIdx].exercises.splice(oldIndex, 1);
        blocks[bIdx].exercises.splice(newIndex, 0, moved);
        sess.blocks = blocks;
      });
    },
    [mutate]
  );

  return {
    structure,
    commit,
    mutate,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    autosaveStatus,
    lastSavedAt,
    clipboardBlock,
    setClipboardBlock,
    addCycle,
    addWeek,
    duplicateWeek,
    addSession,
    duplicateSession,
    moveSessionToWeek,
    deleteSession,
    addBlock,
    duplicateBlock,
    pasteClipboardBlock,
    deleteBlock,
    reorderBlocks,
    addExerciseToBlock,
    updateExercise,
    duplicateExercise,
    deleteExercise,
    reorderExercisesInBlock
  };
};
