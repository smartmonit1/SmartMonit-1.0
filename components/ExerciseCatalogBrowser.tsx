import React, { useEffect, useMemo, useState } from 'react';
import { ExerciseCategory, ExerciseLibraryItem } from '../types';
import {
  EXERCISE_DOMAINS,
  ExerciseSortOption,
  IMPACT_LABELS,
  LATERALITY_LABELS,
  MOVEMENT_PATTERN_LABELS,
  SORT_OPTIONS,
  filterExercises,
  inferExerciseCategory,
  sortExercises
} from '../utils/exerciseFilters';
import ExerciseIllustration from './ExerciseIllustration';

interface ExerciseCatalogBrowserProps {
  exercises: ExerciseLibraryItem[];
  mode?: 'catalog' | 'picker';
  onSelectExercise?: (ex: ExerciseLibraryItem) => void;
  compact?: boolean;
  headerAction?: React.ReactNode;
}

const PAGE_SIZE = 48;

const DIFFICULTY_BADGE: Record<string, string> = {
  Débutant: 'bg-emerald-100 text-emerald-800',
  Intermédiaire: 'bg-amber-100 text-amber-800',
  Avancé: 'bg-red-100 text-red-800',
  Élite: 'bg-purple-100 text-purple-800'
};

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
  const [patternFilter, setPatternFilter] = useState('all');
  const [impactFilter, setImpactFilter] = useState('all');
  const [lateralityFilter, setLateralityFilter] = useState('all');
  const [sortBy, setSortBy] = useState<ExerciseSortOption>('domain');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [
    search,
    categoryFilter,
    muscleFilter,
    equipmentFilter,
    difficultyFilter,
    patternFilter,
    impactFilter,
    lateralityFilter,
    sortBy
  ]);

  const muscleOptions = useMemo(
    () =>
      Array.from(new Set<string>(exercises.map((e) => e.muscleGroup))).sort((a, b) =>
        a.localeCompare(b, 'fr')
      ),
    [exercises]
  );

  const equipmentOptions = useMemo(
    () =>
      Array.from(new Set<string>(exercises.map((e) => e.equipment))).sort((a, b) =>
        a.localeCompare(b, 'fr')
      ),
    [exercises]
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: exercises.length };
    exercises.forEach((e) => {
      const c = inferExerciseCategory(e);
      counts[c] = (counts[c] || 0) + 1;
    });
    return counts;
  }, [exercises]);

  const filteredAndSorted = useMemo(() => {
    const matched = filterExercises(exercises, {
      search,
      category: categoryFilter,
      muscleGroup: muscleFilter,
      equipment: equipmentFilter,
      difficulty: difficultyFilter,
      movementPattern: patternFilter,
      impactLevel: impactFilter,
      laterality: lateralityFilter
    });
    return sortExercises(matched, sortBy);
  }, [
    exercises,
    search,
    categoryFilter,
    muscleFilter,
    equipmentFilter,
    difficultyFilter,
    patternFilter,
    impactFilter,
    lateralityFilter,
    sortBy
  ]);

  const displayed = useMemo(
    () => filteredAndSorted.slice(0, visibleCount),
    [filteredAndSorted, visibleCount]
  );

  const advancedCount =
    (patternFilter !== 'all' ? 1 : 0) +
    (impactFilter !== 'all' ? 1 : 0) +
    (lateralityFilter !== 'all' ? 1 : 0);

  const hasActiveFilter =
    search.trim() !== '' ||
    categoryFilter !== 'all' ||
    muscleFilter !== 'all' ||
    equipmentFilter !== 'all' ||
    difficultyFilter !== 'all' ||
    advancedCount > 0 ||
    sortBy !== 'domain';

  const resetFilters = () => {
    setSearch('');
    setCategoryFilter('all');
    setMuscleFilter('all');
    setEquipmentFilter('all');
    setDifficultyFilter('all');
    setPatternFilter('all');
    setImpactFilter('all');
    setLateralityFilter('all');
    setSortBy('domain');
  };

  return (
    <div className="space-y-3">
      {/* Barre de recherche, domaines, filtres simplifiés et tri */}
      <div
        className={`bg-white rounded-2xl border border-military-100 shadow-sm ${
          compact ? 'p-3 space-y-2.5' : 'p-4 space-y-3'
        }`}
      >
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
              search
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher (FR/EN), muscle, matériel..."
              className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-action-500 focus:bg-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className={`px-3 py-2 rounded-xl border text-[11px] font-black uppercase whitespace-nowrap flex items-center gap-1 transition-all ${
                showAdvanced || advancedCount > 0
                  ? 'bg-military-900 text-action-400 border-military-900'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <span className="material-icons text-sm">tune</span>
              <span>Filtres{advancedCount > 0 ? ` (${advancedCount})` : ''}</span>
            </button>
            {headerAction}
          </div>
        </div>

        {/* Onglets des 11 domaines EPMS avec compteurs */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase whitespace-nowrap transition-all flex items-center gap-1 ${
              categoryFilter === 'all'
                ? 'bg-military-900 text-action-400 shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span>Tous</span>
            <span className="opacity-75">({categoryCounts.all || 0})</span>
          </button>
          {EXERCISE_DOMAINS.map((dom) => (
            <button
              key={dom.id}
              type="button"
              onClick={() => setCategoryFilter(dom.id)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase whitespace-nowrap transition-all flex items-center gap-1 ${
                categoryFilter === dom.id
                  ? 'bg-military-900 text-action-400 shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>{compact ? dom.shortLabel : dom.label}</span>
              <span className="opacity-75">({categoryCounts[dom.id] || 0})</span>
            </button>
          ))}
        </div>

        {/* Filtres essentiels cohérents : Muscle, Matériel, Niveau, Tri */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
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
            aria-label="Filtrer par matériel"
            value={equipmentFilter}
            onChange={(e) => setEquipmentFilter(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-military-900 outline-none focus:border-action-500"
          >
            <option value="all">Matériel : Tous ({equipmentOptions.length})</option>
            {equipmentOptions.map((eq) => (
              <option key={eq} value={eq}>
                {eq}
              </option>
            ))}
          </select>

          <select
            aria-label="Filtrer par niveau"
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-military-900 outline-none focus:border-action-500"
          >
            <option value="all">Niveau : Tous</option>
            <option value="Débutant">Débutant</option>
            <option value="Intermédiaire">Intermédiaire</option>
            <option value="Avancé">Avancé</option>
            <option value="Élite">Élite</option>
          </select>

          <div className="flex gap-1.5">
            <select
              aria-label="Trier les exercices"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as ExerciseSortOption)}
              className="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-military-900 outline-none focus:border-action-500"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            {hasActiveFilter && (
              <button
                type="button"
                onClick={resetFilters}
                className="px-3 py-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 text-[10px] font-black uppercase shrink-0"
                title="Réinitialiser les filtres et le tri"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Filtres biomécaniques avancés (repliables) */}
        {showAdvanced && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-gray-100">
            <select
              aria-label="Filtrer par schéma moteur"
              value={patternFilter}
              onChange={(e) => setPatternFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-military-900 outline-none focus:border-action-500"
            >
              <option value="all">Schéma moteur : Tous</option>
              {Object.entries(MOVEMENT_PATTERN_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>

            <select
              aria-label="Filtrer par niveau d'impact"
              value={impactFilter}
              onChange={(e) => setImpactFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-military-900 outline-none focus:border-action-500"
            >
              <option value="all">Impact articulaire : Tous</option>
              {Object.entries(IMPACT_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>

            <select
              aria-label="Filtrer par latéralité"
              value={lateralityFilter}
              onChange={(e) => setLateralityFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-military-900 outline-none focus:border-action-500"
            >
              <option value="all">Latéralité : Toutes</option>
              {Object.entries(LATERALITY_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 pt-0.5">
          <span>
            {filteredAndSorted.length} exercice(s) correspondant(s) sur {exercises.length}
          </span>
          <span>Cliquer sur un schéma = fiche biomécanique animée</span>
        </div>
      </div>

      {/* Résultats */}
      {filteredAndSorted.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-2xl py-10 text-center text-xs text-gray-500 space-y-2">
          <div>Aucun exercice ne correspond à ces critères.</div>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={resetFilters}
              className="px-4 py-1.5 rounded-xl bg-military-900 text-action-400 text-[10px] font-black uppercase"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      ) : mode === 'picker' ? (
        <div className="space-y-2">
          {displayed.map((ex) => {
            const cat = inferExerciseCategory(ex);
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
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${
                          DIFFICULTY_BADGE[ex.difficulty] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {ex.difficulty}
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
          {displayed.map((ex) => {
            const cat = inferExerciseCategory(ex);
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
                        DIFFICULTY_BADGE[ex.difficulty] || 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {ex.difficulty}
                    </span>
                    {ex.impactLevel && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                        {IMPACT_LABELS[ex.impactLevel]}
                      </span>
                    )}
                  </div>
                  <h4 className="font-black text-sm text-military-900 leading-snug">{ex.name}</h4>
                  {ex.nameEn && ex.nameEn !== ex.name && (
                    <div className="text-[10px] font-medium text-gray-400 truncate">{ex.nameEn}</div>
                  )}
                  {ex.description && (
                    <p className="text-[11px] text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                      {ex.description}
                    </p>
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

      {/* Pagination progressive pour fluidité mobile/desktop sur 475 exercices */}
      {displayed.length < filteredAndSorted.length && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
            className="px-5 py-2.5 rounded-xl bg-white border border-military-200 hover:border-action-500 text-xs font-black uppercase text-military-900 shadow-sm transition-all"
          >
            Afficher plus (+{Math.min(PAGE_SIZE, filteredAndSorted.length - displayed.length)}) —{' '}
            {filteredAndSorted.length - displayed.length} restant(s)
          </button>
        </div>
      )}
    </div>
  );
};

export default ExerciseCatalogBrowser;
