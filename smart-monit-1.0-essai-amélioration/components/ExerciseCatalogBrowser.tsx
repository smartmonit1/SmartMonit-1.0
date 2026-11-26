import React, { useMemo, useState } from 'react';
import { ExerciseCategory, ExerciseLibraryItem } from '../types';
import ExerciseIllustration from './ExerciseIllustration';

interface ExerciseCatalogBrowserProps {
  exercises: ExerciseLibraryItem[];
  mode?: 'catalog' | 'picker';
  onSelectExercise?: (ex: ExerciseLibraryItem) => void;
  compact?: boolean;
  headerAction?: React.ReactNode;
}

const CATEGORIES: Array<{ id: 'all' | ExerciseCategory; label: string }> = [
  { id: 'all', label: 'Tous' },
  { id: 'Musculation', label: 'Musculation' },
  { id: 'Pilates', label: 'Pilates' },
  { id: 'Renforcement', label: 'Renforcement' },
  { id: 'Machine Cardio', label: 'Machines Cardio' },
  { id: 'Course', label: 'Course' }
];

const ExerciseCatalogBrowser: React.FC<ExerciseCatalogBrowserProps> = ({
  exercises,
  mode = 'catalog',
  onSelectExercise,
  compact = false,
  headerAction
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | ExerciseCategory>('all');
  const [muscleFilter, setMuscleFilter] = useState('all');
  const [equipmentFilter, setEquipmentFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');

  const inferCategory = (ex: ExerciseLibraryItem): ExerciseCategory => {
    if (ex.category) return ex.category;
    if (ex.type === 'Cardio') return ex.equipment.toLowerCase().includes('piste') || ex.equipment.toLowerCase().includes('ext') ? 'Course' : 'Machine Cardio';
    if (ex.type === 'Mobility') return 'Pilates';
    return 'Musculation';
  };

  const muscleOptions = useMemo(
    () => Array.from(new Set<string>(exercises.map((e) => e.muscleGroup))).sort((a, b) => a.localeCompare(b)),
    [exercises]
  );

  const equipmentOptions = useMemo(
    () => Array.from(new Set<string>(exercises.map((e) => e.equipment))).sort((a, b) => a.localeCompare(b)),
    [exercises]
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: exercises.length };
    exercises.forEach((e) => {
      const c = inferCategory(e);
      counts[c] = (counts[c] || 0) + 1;
    });
    return counts;
  }, [exercises]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return exercises.filter((ex) => {
      const cat = inferCategory(ex);
      const matchSearch =
        !q ||
        ex.name.toLowerCase().includes(q) ||
        ex.muscleGroup.toLowerCase().includes(q) ||
        ex.equipment.toLowerCase().includes(q) ||
        (ex.description || '').toLowerCase().includes(q);
      const matchCat = categoryFilter === 'all' || cat === categoryFilter;
      const matchMuscle = muscleFilter === 'all' || ex.muscleGroup === muscleFilter;
      const matchEquip = equipmentFilter === 'all' || ex.equipment === equipmentFilter;
      const matchDiff = difficultyFilter === 'all' || ex.difficulty === difficultyFilter;
      return matchSearch && matchCat && matchMuscle && matchEquip && matchDiff;
    });
  }, [exercises, search, categoryFilter, muscleFilter, equipmentFilter, difficultyFilter]);

  const hasActiveFilter =
    search.trim() !== '' ||
    categoryFilter !== 'all' ||
    muscleFilter !== 'all' ||
    equipmentFilter !== 'all' ||
    difficultyFilter !== 'all';

  const resetFilters = () => {
    setSearch('');
    setCategoryFilter('all');
    setMuscleFilter('all');
    setEquipmentFilter('all');
    setDifficultyFilter('all');
  };

  return (
    <div className="space-y-3">
      {/* Barre de recherche & filtres pro */}
      <div className={`bg-white rounded-2xl border border-military-100 shadow-sm ${compact ? 'p-3 space-y-2.5' : 'p-4 space-y-3'}`}>
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un exercice, muscle, appareil..."
              className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-action-500 focus:bg-white"
            />
          </div>
          {headerAction}
        </div>

        {/* Onglets Catégories avec compteurs */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase whitespace-nowrap transition-all flex items-center gap-1 ${
                categoryFilter === cat.id
                  ? 'bg-military-900 text-action-400 shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>{cat.label}</span>
              <span className="opacity-75">({categoryCounts[cat.id] || 0})</span>
            </button>
          ))}
        </div>

        {/* Filtres multi-critères : Muscle, Appareil, Difficulté */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <select
            aria-label="Filtrer par groupe musculaire"
            value={muscleFilter}
            onChange={(e) => setMuscleFilter(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-military-900 outline-none focus:border-action-500"
          >
            <option value="all">Muscle : Tous ({muscleOptions.length})</option>
            {muscleOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <select
            aria-label="Filtrer par appareil ou équipement"
            value={equipmentFilter}
            onChange={(e) => setEquipmentFilter(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-military-900 outline-none focus:border-action-500"
          >
            <option value="all">Appareil : Tous ({equipmentOptions.length})</option>
            {equipmentOptions.map((eq) => (
              <option key={eq} value={eq}>
                {eq}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <select
              aria-label="Filtrer par niveau"
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-military-900 outline-none focus:border-action-500"
            >
              <option value="all">Niveau : Tous</option>
              <option value="Débutant">Débutant</option>
              <option value="Intermédiaire">Intermédiaire</option>
              <option value="Avancé">Avancé</option>
            </select>
            {hasActiveFilter && (
              <button
                type="button"
                onClick={resetFilters}
                className="px-3 py-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 text-[10px] font-black uppercase shrink-0"
                title="Réinitialiser les filtres"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 pt-0.5">
          <span>
            {filtered.length} exercice(s) affiché(s) sur {exercises.length}
          </span>
          <span>Cliquer sur un schéma = fiche biomécanique animée</span>
        </div>
      </div>

      {/* Résultats */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-2xl py-10 text-center text-xs text-gray-500">
          Aucun exercice ne correspond à ces critères.
        </div>
      ) : mode === 'picker' ? (
        <div className="space-y-2">
          {filtered.map((ex) => {
            const cat = inferCategory(ex);
            return (
              <div
                key={ex.id}
                onClick={() => onSelectExercise?.(ex)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectExercise?.(ex);
                  }
                }}
                className="w-full text-left p-2.5 rounded-xl bg-white border border-gray-200 hover:border-action-500 hover:bg-action-50/40 transition-all flex items-center justify-between gap-2.5 cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <ExerciseIllustration exerciseName={ex.name} fallbackType={ex.type} size="xs" />
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-military-900 truncate">{ex.name}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span className="text-[9px] bg-military-900 text-action-400 px-1.5 py-0.5 rounded uppercase font-black">
                        {cat}
                      </span>
                      <span className="text-[9px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded uppercase font-bold">
                        {ex.muscleGroup}
                      </span>
                      <span className="text-[9px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded uppercase font-bold">
                        {ex.equipment}
                      </span>
                    </div>
                  </div>
                </div>
                <span className="w-7 h-7 rounded-lg bg-military-900 text-action-400 flex items-center justify-center shrink-0">
                  <span className="material-icons text-sm">add</span>
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((ex) => {
            const cat = inferCategory(ex);
            return (
              <div
                key={ex.id}
                className="bg-white rounded-2xl p-4 border border-military-100 shadow-sm hover:border-action-500 transition-all flex gap-3.5 items-start"
              >
                <ExerciseIllustration exerciseName={ex.name} fallbackType={ex.type} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-military-900 text-action-400">
                      {cat}
                    </span>
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                        ex.difficulty === 'Débutant'
                          ? 'bg-emerald-100 text-emerald-800'
                          : ex.difficulty === 'Intermédiaire'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {ex.difficulty}
                    </span>
                  </div>
                  <h4 className="font-black text-sm text-military-900 leading-snug">{ex.name}</h4>
                  {ex.description && (
                    <p className="text-[11px] text-gray-500 mt-1 line-clamp-2 leading-relaxed">{ex.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="text-[9px] font-bold uppercase bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                      {ex.muscleGroup}
                    </span>
                    <span className="text-[9px] font-bold uppercase bg-blue-50 text-blue-800 px-2 py-0.5 rounded">
                      {ex.equipment}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ExerciseCatalogBrowser;
