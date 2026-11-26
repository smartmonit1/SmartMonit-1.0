import React, { useMemo, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  BlockType,
  ExerciseLibraryItem,
  PrescriptionMode,
  ProgramExercise,
  SessionBlock
} from '../../types';
import { parseQuickPrescription } from '../../utils/quickEntryParser';
import { BLOCK_TYPE_META } from './useProgramEditorState';
import ExerciseIllustration from '../ExerciseIllustration';

interface ExerciseRowProps {
  exercise: ProgramExercise;
  exIndex: number;
  totalExercises: number;
  exerciseLibrary: ExerciseLibraryItem[];
  dark: boolean;
  onUpdate: (patch: Partial<ProgramExercise>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

const MODE_LABELS: Record<PrescriptionMode, string> = {
  STRENGTH: 'Force / Muscu',
  RUNNING: 'Course / VMA',
  BODYWEIGHT: 'Poids de corps',
  MOBILITY: 'Mobilité / Gainage',
  LOADED_MARCH: 'Marche chargée'
};

const SortableExerciseRow: React.FC<ExerciseRowProps> = ({
  exercise,
  exIndex,
  totalExercises,
  exerciseLibrary,
  dark,
  onUpdate,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: exercise.id
  });
  const [quickInput, setQuickInput] = useState('');
  const [showBounds, setShowBounds] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 40 : undefined,
    opacity: isDragging ? 0.85 : 1
  };

  const parsedQuick = useMemo(() => parseQuickPrescription(quickInput), [quickInput]);
  const mode: PrescriptionMode = exercise.mode || (exercise.percentVMA ? 'RUNNING' : 'STRENGTH');

  const libItem = useMemo(
    () =>
      exerciseLibrary.find(
        (e) => e.id === exercise.libraryId || e.name.toLowerCase() === exercise.name.toLowerCase()
      ),
    [exerciseLibrary, exercise.libraryId, exercise.name]
  );

  const applyQuick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedQuick.valid) return;
    onUpdate(parsedQuick.patch);
    setQuickInput('');
  };

  const bounds = exercise.adaptationBounds || {
    minIntensityDeltaPct: -20,
    maxIntensityDeltaPct: 5,
    substitutable: true,
    approvedAlternatives: libItem?.substitutes?.slice(0, 3) || []
  };

  const rowBg = dark
    ? 'bg-military-900 border-military-700 text-white'
    : 'bg-white border-gray-200 text-military-900';
  const inputBg = dark
    ? 'bg-military-800 border-military-700 text-white placeholder-military-400'
    : 'bg-gray-50 border-gray-200 text-military-900';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border p-3 transition-shadow ${rowBg} ${
        isDragging ? 'shadow-xl ring-2 ring-action-500' : 'hover:border-action-400'
      }`}
    >
      {/* En-tête exercice : poignée DnD + illustration + titre + mode + actions rapides */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 rounded-lg text-gray-400 hover:text-action-500 touch-none"
            aria-label={`Déplacer ${exercise.name}`}
            title="Glisser-déposer"
          >
            <span className="material-icons text-base">drag_indicator</span>
          </button>
          <ExerciseIllustration
            exerciseName={exercise.name}
            fallbackType={libItem?.type || 'Force'}
            size="xs"
            dark={dark}
          />
          <div className="min-w-0">
            <div className="font-black text-xs sm:text-sm truncate">{exercise.name}</div>
            <div className="flex flex-wrap items-center gap-1 mt-0.5">
              <select
                aria-label="Mode de dosage"
                value={mode}
                onChange={(e) => onUpdate({ mode: e.target.value as PrescriptionMode })}
                className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded border outline-none ${inputBg}`}
              >
                {(Object.keys(MODE_LABELS) as PrescriptionMode[]).map((m) => (
                  <option key={m} value={m}>
                    {MODE_LABELS[m]}
                  </option>
                ))}
              </select>
              {exercise.equipment && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                  {exercise.equipment}
                </span>
              )}
              {exercise.muscleGroup && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                  {exercise.muscleGroup}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Contrôles tactiles 1-main + Dupliquer + Bornes + Supprimer */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            disabled={exIndex === 0}
            onClick={onMoveUp}
            className="p-1 rounded-lg text-gray-400 hover:text-action-500 disabled:opacity-30"
            aria-label="Monter l'exercice"
          >
            <span className="material-icons text-sm">arrow_upward</span>
          </button>
          <button
            type="button"
            disabled={exIndex === totalExercises - 1}
            onClick={onMoveDown}
            className="p-1 rounded-lg text-gray-400 hover:text-action-500 disabled:opacity-30"
            aria-label="Descendre l'exercice"
          >
            <span className="material-icons text-sm">arrow_downward</span>
          </button>
          <button
            type="button"
            onClick={() => setShowBounds((v) => !v)}
            className={`p-1 rounded-lg ${
              showBounds ? 'bg-action-500 text-military-950' : 'text-gray-400 hover:text-action-500'
            }`}
            title="Bornes d'adaptation & substitutions (Human-in-the-Loop)"
            aria-label="Bornes d'adaptation"
          >
            <span className="material-icons text-sm">tune</span>
          </button>
          <button
            type="button"
            onClick={onDuplicate}
            className="p-1 rounded-lg text-gray-400 hover:text-blue-500"
            title="Dupliquer l'exercice"
            aria-label="Dupliquer l'exercice"
          >
            <span className="material-icons text-sm">content_copy</span>
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1 rounded-lg text-gray-400 hover:text-red-500"
            title="Supprimer l'exercice"
            aria-label="Supprimer l'exercice"
          >
            <span className="material-icons text-sm">delete_outline</span>
          </button>
        </div>
      </div>

      {/* Saisie rapide syntaxe naturelle */}
      <form onSubmit={applyQuick} className="mt-2.5">
        <div className="flex gap-1.5">
          <div className="relative flex-1">
            <span className="material-icons absolute left-2 top-1/2 -translate-y-1/2 text-action-500 text-sm">
              bolt
            </span>
            <input
              type="text"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              placeholder='Saisie rapide : "4x8 @75% r2&#39;", "3x10&#39; @80% VMA r2&#39;", "8x400m @95% VMA r1&#39;30"...'
              aria-label={`Saisie rapide pour ${exercise.name}`}
              className={`w-full pl-7 pr-2 py-1.5 rounded-lg border text-[11px] font-mono outline-none focus:border-action-500 ${inputBg}`}
            />
          </div>
          {quickInput.trim() && (
            <button
              type="submit"
              disabled={!parsedQuick.valid}
              className="px-2.5 py-1 rounded-lg bg-action-500 text-military-950 font-black text-[10px] uppercase disabled:opacity-40"
            >
              Appliquer
            </button>
          )}
        </div>
        {quickInput.trim() && (
          <div
            className={`mt-1 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 ${
              parsedQuick.valid
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}
          >
            <span className="material-icons text-xs">
              {parsedQuick.valid ? 'check_circle' : 'help_outline'}
            </span>
            <span>
              {parsedQuick.valid
                ? `Aperçu : ${parsedQuick.humanPreview}`
                : 'Syntaxe non reconnue (ex: 4x8 @75% r2\' ou 3x10\' @80% VMA r2\')'}
            </span>
          </div>
        )}
      </form>

      {/* Champs structurés selon la modalité */}
      <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-6 gap-2">
        {mode === 'STRENGTH' && (
          <>
            <label className="text-[10px] font-bold uppercase opacity-75">
              Séries
              <input
                type="number"
                min={1}
                max={20}
                value={exercise.sets ?? 3}
                onChange={(e) => onUpdate({ sets: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                className={`mt-0.5 w-full px-2 py-1 rounded-lg border text-xs font-black ${inputBg}`}
              />
            </label>
            <label className="text-[10px] font-bold uppercase opacity-75">
              Reps
              <input
                type="text"
                value={exercise.reps ?? '8'}
                onChange={(e) => onUpdate({ reps: e.target.value })}
                placeholder="8 ou 8-10"
                className={`mt-0.5 w-full px-2 py-1 rounded-lg border text-xs font-black ${inputBg}`}
              />
            </label>
            <label className="text-[10px] font-bold uppercase opacity-75">
              % 1RM
              <input
                type="number"
                min={20}
                max={105}
                value={exercise.percent1RM ?? ''}
                placeholder="75"
                onChange={(e) => {
                  const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                  onUpdate({
                    percent1RM: val,
                    load: val ? `[${val}% 1RM]` : exercise.loadKg ? `${exercise.loadKg} kg` : ''
                  });
                }}
                className={`mt-0.5 w-full px-2 py-1 rounded-lg border text-xs font-black ${inputBg}`}
              />
            </label>
            <label className="text-[10px] font-bold uppercase opacity-75">
              Charge kg
              <input
                type="number"
                step={0.5}
                value={exercise.loadKg ?? ''}
                placeholder="Auto"
                onChange={(e) => {
                  const val = e.target.value ? parseFloat(e.target.value) : undefined;
                  onUpdate({
                    loadKg: val,
                    load: val ? `${val} kg` : exercise.percent1RM ? `[${exercise.percent1RM}% 1RM]` : ''
                  });
                }}
                className={`mt-0.5 w-full px-2 py-1 rounded-lg border text-xs font-black ${inputBg}`}
              />
            </label>
            <label className="text-[10px] font-bold uppercase opacity-75">
              Tempo / RPE
              <input
                type="text"
                value={exercise.tempo || (exercise.rpe ? `RPE ${exercise.rpe}` : '')}
                placeholder="3-1-1-0"
                onChange={(e) => {
                  const v = e.target.value;
                  const rpeM = v.match(/rpe\s*(\d+(?:\.\d+)?)/i);
                  if (rpeM) onUpdate({ rpe: parseFloat(rpeM[1]), tempo: undefined });
                  else onUpdate({ tempo: v });
                }}
                className={`mt-0.5 w-full px-2 py-1 rounded-lg border text-xs font-bold ${inputBg}`}
              />
            </label>
            <label className="text-[10px] font-bold uppercase opacity-75">
              Repos
              <input
                type="text"
                value={exercise.rest ?? '1:30'}
                onChange={(e) => onUpdate({ rest: e.target.value })}
                placeholder="1:30"
                className={`mt-0.5 w-full px-2 py-1 rounded-lg border text-xs font-bold ${inputBg}`}
              />
            </label>
          </>
        )}

        {mode === 'RUNNING' && (
          <>
            <label className="text-[10px] font-bold uppercase opacity-75">
              Répétitions
              <input
                type="number"
                min={1}
                max={40}
                value={exercise.sets ?? 1}
                onChange={(e) => onUpdate({ sets: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                className={`mt-0.5 w-full px-2 py-1 rounded-lg border text-xs font-black ${inputBg}`}
              />
            </label>
            <label className="text-[10px] font-bold uppercase opacity-75">
              Distance (m)
              <input
                type="number"
                step={50}
                value={exercise.distanceMeters ?? ''}
                placeholder="400"
                onChange={(e) =>
                  onUpdate({ distanceMeters: e.target.value ? parseInt(e.target.value, 10) : undefined })
                }
                className={`mt-0.5 w-full px-2 py-1 rounded-lg border text-xs font-black ${inputBg}`}
              />
            </label>
            <label className="text-[10px] font-bold uppercase opacity-75">
              Durée (s)
              <input
                type="number"
                step={15}
                value={exercise.durationSeconds ?? ''}
                placeholder="600"
                onChange={(e) =>
                  onUpdate({ durationSeconds: e.target.value ? parseInt(e.target.value, 10) : undefined })
                }
                className={`mt-0.5 w-full px-2 py-1 rounded-lg border text-xs font-black ${inputBg}`}
              />
            </label>
            <label className="text-[10px] font-bold uppercase opacity-75">
              % VMA
              <input
                type="number"
                min={50}
                max={120}
                value={exercise.percentVMA ?? ''}
                placeholder="80"
                onChange={(e) =>
                  onUpdate({ percentVMA: e.target.value ? parseInt(e.target.value, 10) : undefined })
                }
                className={`mt-0.5 w-full px-2 py-1 rounded-lg border text-xs font-black ${inputBg}`}
              />
            </label>
            <label className="text-[10px] font-bold uppercase opacity-75">
              Type course
              <select
                value={exercise.runningSubType || 'INTERVALS'}
                onChange={(e) => onUpdate({ runningSubType: e.target.value as any })}
                className={`mt-0.5 w-full px-2 py-1 rounded-lg border text-xs font-bold ${inputBg}`}
              >
                <option value="INTERVALS">Fractionné</option>
                <option value="THRESHOLD">Seuil</option>
                <option value="CONTINUOUS">Footing / Continu</option>
                <option value="FARTLEK">Fartlek</option>
                <option value="HILLS">Côtes</option>
              </select>
            </label>
            <label className="text-[10px] font-bold uppercase opacity-75">
              Récup
              <input
                type="text"
                value={exercise.rest ?? '1:30'}
                onChange={(e) => onUpdate({ rest: e.target.value })}
                placeholder="1:30 trot"
                className={`mt-0.5 w-full px-2 py-1 rounded-lg border text-xs font-bold ${inputBg}`}
              />
            </label>
          </>
        )}

        {mode === 'BODYWEIGHT' && (
          <>
            <label className="text-[10px] font-bold uppercase opacity-75">
              Séries
              <input
                type="number"
                min={1}
                value={exercise.sets ?? 4}
                onChange={(e) => onUpdate({ sets: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                className={`mt-0.5 w-full px-2 py-1 rounded-lg border text-xs font-black ${inputBg}`}
              />
            </label>
            <label className="text-[10px] font-bold uppercase opacity-75">
              Reps / MAX
              <input
                type="text"
                value={exercise.reps ?? '15'}
                onChange={(e) => onUpdate({ reps: e.target.value })}
                className={`mt-0.5 w-full px-2 py-1 rounded-lg border text-xs font-black ${inputBg}`}
              />
            </label>
            <label className="text-[10px] font-bold uppercase opacity-75">
              Travail (s)
              <input
                type="number"
                value={exercise.workSec ?? ''}
                placeholder="40"
                onChange={(e) =>
                  onUpdate({ workSec: e.target.value ? parseInt(e.target.value, 10) : undefined })
                }
                className={`mt-0.5 w-full px-2 py-1 rounded-lg border text-xs font-black ${inputBg}`}
              />
            </label>
            <label className="text-[10px] font-bold uppercase opacity-75">
              Repos
              <input
                type="text"
                value={exercise.rest ?? '1:00'}
                onChange={(e) => onUpdate({ rest: e.target.value })}
                className={`mt-0.5 w-full px-2 py-1 rounded-lg border text-xs font-bold ${inputBg}`}
              />
            </label>
            <label className="col-span-2 flex items-center gap-2 pt-4 text-xs font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(exercise.toTechnicalFailure)}
                onChange={(e) => onUpdate({ toTechnicalFailure: e.target.checked })}
                className="accent-action-500"
              />
              Échec technique (qualité gestuelle)
            </label>
          </>
        )}

        {mode === 'MOBILITY' && (
          <>
            <label className="text-[10px] font-bold uppercase opacity-75">
              Séries
              <input
                type="number"
                min={1}
                value={exercise.sets ?? 3}
                onChange={(e) => onUpdate({ sets: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                className={`mt-0.5 w-full px-2 py-1 rounded-lg border text-xs font-black ${inputBg}`}
              />
            </label>
            <label className="text-[10px] font-bold uppercase opacity-75">
              Maintien (s)
              <input
                type="number"
                value={exercise.holdSec ?? 45}
                onChange={(e) =>
                  onUpdate({
                    holdSec: parseInt(e.target.value, 10) || 30,
                    durationSeconds: parseInt(e.target.value, 10) || 30
                  })
                }
                className={`mt-0.5 w-full px-2 py-1 rounded-lg border text-xs font-black ${inputBg}`}
              />
            </label>
            <label className="text-[10px] font-bold uppercase opacity-75">
              Repos
              <input
                type="text"
                value={exercise.rest ?? '0:30'}
                onChange={(e) => onUpdate({ rest: e.target.value })}
                className={`mt-0.5 w-full px-2 py-1 rounded-lg border text-xs font-bold ${inputBg}`}
              />
            </label>
            <label className="col-span-3 flex items-center gap-2 pt-4 text-xs font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(exercise.bilateral)}
                onChange={(e) => onUpdate({ bilateral: e.target.checked })}
                className="accent-action-500"
              />
              Bilatéral (Gauche + Droite)
            </label>
          </>
        )}

        {mode === 'LOADED_MARCH' && (
          <>
            <label className="text-[10px] font-bold uppercase opacity-75 col-span-2">
              Distance (m)
              <input
                type="number"
                step={500}
                value={exercise.distanceMeters ?? 8000}
                onChange={(e) => onUpdate({ distanceMeters: parseInt(e.target.value, 10) || 4000 })}
                className={`mt-0.5 w-full px-2 py-1 rounded-lg border text-xs font-black ${inputBg}`}
              />
            </label>
            <label className="text-[10px] font-bold uppercase opacity-75 col-span-2">
              Charge portée (kg)
              <input
                type="number"
                step={1}
                value={exercise.carriedLoadKg ?? 12}
                onChange={(e) => onUpdate({ carriedLoadKg: parseFloat(e.target.value) || 0 })}
                className={`mt-0.5 w-full px-2 py-1 rounded-lg border text-xs font-black ${inputBg}`}
              />
            </label>
            <label className="text-[10px] font-bold uppercase opacity-75 col-span-2">
              Temps cible (min)
              <input
                type="number"
                value={exercise.targetTimeSec ? Math.round(exercise.targetTimeSec / 60) : 75}
                onChange={(e) =>
                  onUpdate({ targetTimeSec: (parseInt(e.target.value, 10) || 60) * 60 })
                }
                className={`mt-0.5 w-full px-2 py-1 rounded-lg border text-xs font-black ${inputBg}`}
              />
            </label>
          </>
        )}
      </div>

      {/* Note coach compacte */}
      <input
        type="text"
        value={exercise.note || ''}
        onChange={(e) => onUpdate({ note: e.target.value })}
        placeholder="Consigne technique / sécurité (optionnel)..."
        className={`mt-2 w-full px-2.5 py-1 rounded-lg border text-[11px] outline-none ${inputBg}`}
      />

      {/* Panneau dépliable Human-in-the-Loop : Bornes d'adaptation & Alternatives validées */}
      {showBounds && (
        <div
          className={`mt-2.5 p-3 rounded-xl border text-xs space-y-2 ${
            dark ? 'bg-military-950/70 border-military-700' : 'bg-amber-50/70 border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-amber-700 flex items-center gap-1">
              <span className="material-icons text-xs">verified_user</span>
              Cadre d'adaptation autorisé par le moniteur (Human-in-the-Loop)
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <label className="text-[10px] font-bold">
              Baisse max intensité (%)
              <input
                type="number"
                max={0}
                min={-50}
                value={bounds.minIntensityDeltaPct}
                onChange={(e) =>
                  onUpdate({
                    adaptationBounds: {
                      ...bounds,
                      minIntensityDeltaPct: Math.min(0, parseInt(e.target.value, 10) || -20)
                    }
                  })
                }
                className={`mt-0.5 w-full px-2 py-1 rounded-lg border text-xs font-black ${inputBg}`}
              />
            </label>
            <label className="text-[10px] font-bold">
              Hausse max intensité (%)
              <input
                type="number"
                min={0}
                max={25}
                value={bounds.maxIntensityDeltaPct}
                onChange={(e) =>
                  onUpdate({
                    adaptationBounds: {
                      ...bounds,
                      maxIntensityDeltaPct: Math.max(0, parseInt(e.target.value, 10) || 5)
                    }
                  })
                }
                className={`mt-0.5 w-full px-2 py-1 rounded-lg border text-xs font-black ${inputBg}`}
              />
            </label>
            <label className="flex items-center gap-2 pt-4 text-xs font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={bounds.substitutable}
                onChange={(e) =>
                  onUpdate({
                    adaptationBounds: { ...bounds, substitutable: e.target.checked }
                  })
                }
                className="accent-action-500"
              />
              Exercice substituable
            </label>
          </div>
          {bounds.substitutable && (
            <label className="block text-[10px] font-bold">
              Alternatives validées (séparées par des virgules)
              <input
                type="text"
                value={(bounds.approvedAlternatives || []).join(', ')}
                onChange={(e) =>
                  onUpdate({
                    adaptationBounds: {
                      ...bounds,
                      approvedAlternatives: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean)
                    }
                  })
                }
                placeholder="Ex: Pompes inclinées, Développé haltères"
                className={`mt-0.5 w-full px-2 py-1 rounded-lg border text-xs ${inputBg}`}
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
};

interface BlockEditorProps {
  blocks: SessionBlock[];
  activeBlockIndex: number;
  exerciseLibrary: ExerciseLibraryItem[];
  dark?: boolean;
  onSelectBlock: (bIdx: number) => void;
  onUpdateBlock: (bIdx: number, patch: Partial<SessionBlock>) => void;
  onAddBlock: (blockType: BlockType) => void;
  onDuplicateBlock: (bIdx: number) => void;
  onCopyBlock: (block: SessionBlock) => void;
  onPasteBlock?: () => void;
  hasClipboardBlock?: boolean;
  onDeleteBlock: (bIdx: number) => void;
  onReorderBlocks: (oldIdx: number, newIdx: number) => void;
  onUpdateExercise: (bIdx: number, eIdx: number, patch: Partial<ProgramExercise>) => void;
  onDuplicateExercise: (bIdx: number, eIdx: number) => void;
  onDeleteExercise: (bIdx: number, eIdx: number) => void;
  onReorderExercises: (bIdx: number, oldIdx: number, newIdx: number) => void;
  onOpenExercisePickerForBlock: (bIdx: number) => void;
}

const ALL_BLOCK_TYPES: BlockType[] = [
  'WARMUP',
  'MAIN',
  'SUPERSET',
  'CIRCUIT',
  'EMOM',
  'AMRAP',
  'TABATA',
  'FOR_TIME',
  'INTERVALS',
  'RELAY',
  'CONTINUOUS',
  'COOLDOWN'
];

const BlockEditor: React.FC<BlockEditorProps> = ({
  blocks,
  activeBlockIndex,
  exerciseLibrary,
  dark = false,
  onSelectBlock,
  onUpdateBlock,
  onAddBlock,
  onDuplicateBlock,
  onCopyBlock,
  onPasteBlock,
  hasClipboardBlock,
  onDeleteBlock,
  onReorderBlocks,
  onUpdateExercise,
  onDuplicateExercise,
  onDeleteExercise,
  onReorderExercises,
  onOpenExercisePickerForBlock
}) => {
  const [newBlockMenuOpen, setNewBlockMenuOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleExerciseDragEnd = (bIdx: number) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const list = blocks[bIdx]?.exercises || [];
    const oldIdx = list.findIndex((e) => e.id === active.id);
    const newIdx = list.findIndex((e) => e.id === over.id);
    if (oldIdx !== -1 && newIdx !== -1) {
      onReorderExercises(bIdx, oldIdx, newIdx);
    }
  };

  const cardBg = dark ? 'bg-military-950/70 border-military-700' : 'bg-gray-50/80 border-gray-200';
  const inputBg = dark
    ? 'bg-military-800 border-military-700 text-white'
    : 'bg-white border-gray-200 text-military-900';

  return (
    <div className="space-y-4">
      {blocks.map((block, bIdx) => {
        const meta = BLOCK_TYPE_META[block.type] || BLOCK_TYPE_META.MAIN;
        const isSelected = bIdx === activeBlockIndex;
        return (
          <div
            key={block.id}
            onClick={() => onSelectBlock(bIdx)}
            className={`rounded-2xl border-2 p-3 sm:p-4 transition-all ${cardBg} ${
              isSelected ? 'border-action-500 shadow-md' : 'hover:border-military-400'
            }`}
          >
            {/* En-tête de bloc */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-gray-200/60">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase ${meta.colorClass}`}
                >
                  <span className="material-icons text-xs">{meta.icon}</span>
                  {meta.shortLabel}
                </span>
                <input
                  type="text"
                  value={block.title}
                  onChange={(e) => onUpdateBlock(bIdx, { title: e.target.value })}
                  aria-label="Titre du bloc"
                  className={`px-2 py-1 rounded-lg border text-xs sm:text-sm font-black outline-none focus:border-action-500 ${inputBg}`}
                />
                <select
                  aria-label="Type de bloc"
                  value={block.type}
                  onChange={(e) =>
                    onUpdateBlock(bIdx, {
                      type: e.target.value as BlockType,
                      title: BLOCK_TYPE_META[e.target.value as BlockType].label
                    })
                  }
                  className={`px-2 py-1 rounded-lg border text-[11px] font-bold ${inputBg}`}
                >
                  {ALL_BLOCK_TYPES.map((bt) => (
                    <option key={bt} value={bt}>
                      {BLOCK_TYPE_META[bt].label}
                    </option>
                  ))}
                </select>
                {['CIRCUIT', 'SUPERSET', 'EMOM', 'AMRAP', 'TABATA', 'FOR_TIME', 'RELAY'].includes(
                  block.type
                ) && (
                  <label className="flex items-center gap-1 text-[10px] font-black uppercase">
                    Tours
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={block.rounds ?? 3}
                      onChange={(e) =>
                        onUpdateBlock(bIdx, { rounds: Math.max(1, parseInt(e.target.value, 10) || 1) })
                      }
                      className={`w-14 px-1.5 py-1 rounded-lg border text-xs font-black text-center ${inputBg}`}
                    />
                  </label>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={bIdx === 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onReorderBlocks(bIdx, bIdx - 1);
                  }}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-action-500 disabled:opacity-30"
                  title="Monter le bloc"
                  aria-label="Monter le bloc"
                >
                  <span className="material-icons text-sm">keyboard_arrow_up</span>
                </button>
                <button
                  type="button"
                  disabled={bIdx === blocks.length - 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    onReorderBlocks(bIdx, bIdx + 1);
                  }}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-action-500 disabled:opacity-30"
                  title="Descendre le bloc"
                  aria-label="Descendre le bloc"
                >
                  <span className="material-icons text-sm">keyboard_arrow_down</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopyBlock(block);
                  }}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600"
                  title="Copier le bloc pour coller dans une autre séance"
                >
                  <span className="material-icons text-sm">content_paste_go</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicateBlock(bIdx);
                  }}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500"
                  title="Dupliquer ce bloc"
                >
                  <span className="material-icons text-sm">content_copy</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteBlock(bIdx);
                  }}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500"
                  title="Supprimer ce bloc"
                >
                  <span className="material-icons text-sm">delete</span>
                </button>
              </div>
            </div>

            {/* Exercices du bloc (glisser-déposer tactile + souris + clavier) */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleExerciseDragEnd(bIdx)}
            >
              <SortableContext
                items={block.exercises.map((e) => e.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2.5">
                  {block.exercises.map((ex, eIdx) => (
                    <SortableExerciseRow
                      key={ex.id}
                      exercise={ex}
                      exIndex={eIdx}
                      totalExercises={block.exercises.length}
                      exerciseLibrary={exerciseLibrary}
                      dark={dark}
                      onUpdate={(patch) => onUpdateExercise(bIdx, eIdx, patch)}
                      onDuplicate={() => onDuplicateExercise(bIdx, eIdx)}
                      onDelete={() => onDeleteExercise(bIdx, eIdx)}
                      onMoveUp={() => eIdx > 0 && onReorderExercises(bIdx, eIdx, eIdx - 1)}
                      onMoveDown={() =>
                        eIdx < block.exercises.length - 1 &&
                        onReorderExercises(bIdx, eIdx, eIdx + 1)
                      }
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {/* Bouton ajout exercice dans ce bloc */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectBlock(bIdx);
                  onOpenExercisePickerForBlock(bIdx);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-military-900 text-action-400 font-black text-xs uppercase hover:bg-military-800 shadow-sm"
              >
                <span className="material-icons text-sm">add_circle</span>
                Ajouter un exercice dans « {block.title} »
              </button>
              <span className="text-[11px] font-bold opacity-60">
                {block.exercises.length} exercice{block.exercises.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        );
      })}

      {/* Barre d'ajout de bloc + Coller bloc */}
      <div className="relative flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => setNewBlockMenuOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-action-500 text-military-950 font-black text-xs uppercase shadow hover:bg-action-400"
        >
          <span className="material-icons text-sm">add_box</span>
          Ajouter un bloc (Superset, Circuit, EMOM, VMA...)
        </button>

        {hasClipboardBlock && onPasteBlock && (
          <button
            type="button"
            onClick={onPasteBlock}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border-2 border-emerald-500 text-emerald-700 bg-emerald-50 font-black text-xs uppercase hover:bg-emerald-100"
          >
            <span className="material-icons text-sm">content_paste</span>
            Coller le bloc copié
          </button>
        )}

        {newBlockMenuOpen && (
          <div
            className={`w-full mt-2 p-3 rounded-2xl border shadow-lg grid grid-cols-2 sm:grid-cols-4 gap-2 ${
              dark ? 'bg-military-900 border-military-700' : 'bg-white border-gray-200'
            }`}
          >
            {ALL_BLOCK_TYPES.map((bt) => {
              const m = BLOCK_TYPE_META[bt];
              return (
                <button
                  key={bt}
                  type="button"
                  onClick={() => {
                    onAddBlock(bt);
                    setNewBlockMenuOpen(false);
                  }}
                  className={`flex items-center gap-2 p-2 rounded-xl border text-left text-xs font-bold hover:border-action-500 transition-all ${
                    dark ? 'bg-military-800 border-military-700 text-white' : 'bg-gray-50 border-gray-200 text-military-900'
                  }`}
                >
                  <span className="material-icons text-sm text-action-500">{m.icon}</span>
                  <span className="truncate">{m.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default BlockEditor;
