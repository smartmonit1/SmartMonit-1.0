import React, { useEffect, useMemo, useState } from 'react';
import { Equipment, ExerciseCategory, ExerciseLibraryItem, JobType } from '../../types';
import { db } from '../../services/mockDatabase';
import {
  EXERCISE_DOMAINS,
  ExerciseSortOption,
  IMPACT_LABELS,
  MOVEMENT_PATTERN_LABELS,
  SORT_OPTIONS,
  filterExercises,
  inferExerciseCategory,
  sortExercises
} from '../../utils/exerciseFilters';
import ExerciseIllustration from '../ExerciseIllustration';

interface ExercisePickerDrawerProps {
  exercises: ExerciseLibraryItem[];
  infraEquipment?: Equipment[];
  onSelect: (item: ExerciseLibraryItem) => void;
  onExerciseCreated?: (item: ExerciseLibraryItem) => void;
  dark?: boolean;
}

const PAGE_SIZE = 40;

const DIFFICULTY_BADGE: Record<string, string> = {
  Débutant: 'bg-emerald-100 text-emerald-800',
  Intermédiaire: 'bg-amber-100 text-amber-800',
  Avancé: 'bg-red-100 text-red-800',
  Élite: 'bg-purple-100 text-purple-800'
};

const CUSTOM_MUSCLE_OPTIONS = [
  'Pectoraux',
  'Dos',
  'Épaules',
  'Bras',
  'Jambes',
  'Chaîne Postérieure',
  'Mollets',
  'Core / Abdos',
  'Cardio / Full Body'
];

const CUSTOM_EQUIP_OPTIONS = [
  'Poids du corps / Tapis',
  'Barre',
  'Haltères',
  'Kettlebell',
  'Poulie',
  'Machine guidée',
  'Machine cardio',
  'Élastiques',
  'Barre de traction',
  'Anneaux / Sangles',
  'Box / Banc',
  'Médecine-ball / Sac',
  'Pilates Reformer',
  'Course / Extérieur',
  'Matériel spécifique'
];

const ExercisePickerDrawer: React.FC<ExercisePickerDrawerProps> = ({
  exercises,
  infraEquipment = [],
  onSelect,
  onExerciseCreated,
  dark = false
}) => {
  const [tab, setTab] = useState<'all' | 'favorites' | 'recent' | 'create'>('all');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [muscleFilter, setMuscleFilter] = useState<string>('all');
  const [equipFilter, setEquipFilter] = useState<string>('all');
  const [diffFilter, setDiffFilter] = useState<string>('all');
  const [jobFilter, setJobFilter] = useState<string>('all');
  const [patternFilter, setPatternFilter] = useState<string>('all');
  const [impactFilter, setImpactFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<ExerciseSortOption>('domain');
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [favorites, setFavorites] = useState<string[]>(() => db.getFavoriteExerciseIds());
  const recentIds = useMemo(() => db.getRecentExerciseIds(), [tab]);

  // Création rapide exercice personnalisé (< 30s)
  const [customName, setCustomName] = useState('');
  const [customCat, setCustomCat] = useState<ExerciseCategory>('Musculation');
  const [customMuscle, setCustomMuscle] = useState('Cardio / Full Body');
  const [customEquip, setCustomEquip] = useState('Poids du corps / Tapis');
  const [customDiff, setCustomDiff] = useState<ExerciseLibraryItem['difficulty']>('Intermédiaire');

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [tab, search, catFilter, muscleFilter, equipFilter, diffFilter, jobFilter, patternFilter, impactFilter, sortBy]);

  const operationalEquipTokens = useMemo(
    () =>
      infraEquipment
        .filter((e) => e.status === 'Operational')
        .map((e) => `${e.name} ${e.category}`.toLowerCase()),
    [infraEquipment]
  );

  const isEquipmentAvailable = (eq: string): boolean => {
    if (operationalEquipTokens.length === 0) return true;
    const low = eq.toLowerCase();
    if (
      [
        'pdc',
        'tapis',
        'poids du corps / tapis',
        'élastiques',
        'elastiques',
        'course / extérieur',
        'piste / extérieur',
        'piste athlétisme',
        'extérieur / parcours',
        'terrain / gymnase',
        'matériel spécifique'
      ].includes(low)
    ) {
      return true;
    }
    return operationalEquipTokens.some(
      (tok) =>
        tok.includes(low) ||
        (low.includes('barre de traction') && (tok.includes('traction') || tok.includes('rack') || tok.includes('cage'))) ||
        (low.includes('barre') && (tok.includes('rack') || tok.includes('banc') || tok.includes('barre'))) ||
        (low.includes('halt') && tok.includes('musculation')) ||
        (low.includes('kettlebell') && (tok.includes('kettlebell') || tok.includes('musculation'))) ||
        (low.includes('poulie') && tok.includes('musculation')) ||
        (low.includes('machine guid') && tok.includes('musculation')) ||
        ((low.includes('machine cardio') || low.includes('vélo')) &&
          (tok.includes('vélo') || tok.includes('bike') || tok.includes('rameur') || tok.includes('tapis') || tok.includes('cardio')))
    );
  };

  const muscles = useMemo(
    () =>
      Array.from(new Set<string>(exercises.map((e) => e.muscleGroup))).sort((a, b) =>
        a.localeCompare(b, 'fr')
      ),
    [exercises]
  );
  const equips = useMemo(
    () =>
      Array.from(new Set<string>(exercises.map((e) => e.equipment))).sort((a, b) =>
        a.localeCompare(b, 'fr')
      ),
    [exercises]
  );

  const filtered = useMemo(() => {
    let base = exercises;
    if (tab === 'favorites') base = exercises.filter((e) => favorites.includes(e.id));
    if (tab === 'recent') {
      base = recentIds
        .map((id) => exercises.find((e) => e.id === id))
        .filter(Boolean) as ExerciseLibraryItem[];
    }
    const matched = filterExercises(base, {
      search,
      category: catFilter,
      muscleGroup: muscleFilter,
      equipment: equipFilter,
      difficulty: diffFilter,
      jobProfile: jobFilter,
      movementPattern: patternFilter,
      impactLevel: impactFilter
    });
    return sortExercises(matched, sortBy);
  }, [
    exercises,
    tab,
    favorites,
    recentIds,
    search,
    catFilter,
    muscleFilter,
    equipFilter,
    diffFilter,
    jobFilter,
    patternFilter,
    impactFilter,
    sortBy
  ]);

  const displayed = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  const hasActiveFilter =
    search.trim() !== '' ||
    catFilter !== 'all' ||
    muscleFilter !== 'all' ||
    equipFilter !== 'all' ||
    diffFilter !== 'all' ||
    jobFilter !== 'all' ||
    patternFilter !== 'all' ||
    impactFilter !== 'all' ||
    sortBy !== 'domain';

  const resetFilters = () => {
    setSearch('');
    setCatFilter('all');
    setMuscleFilter('all');
    setEquipFilter('all');
    setDiffFilter('all');
    setJobFilter('all');
    setPatternFilter('all');
    setImpactFilter('all');
    setSortBy('domain');
  };

  const handleToggleFav = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(db.toggleFavoriteExercise(id));
  };

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;
    const isCardio = customCat === 'Course' || customCat === 'Cardio en salle' || customCat === 'Machine Cardio';
    const isMob = customCat === 'Mobilité' || customCat === 'Échauffement' || customCat === 'Pilates';
    const item: ExerciseLibraryItem = {
      id: `ex_custom_${Date.now()}`,
      name: customName.trim(),
      domain: customCat,
      category: customCat,
      muscleGroup: customMuscle,
      equipment: customEquip,
      type: isCardio ? 'Cardio' : isMob ? 'Mobility' : 'Force',
      difficulty: customDiff,
      isCustom: true,
      description: 'Exercice personnalisé créé par le moniteur EPMS.'
    };
    db.addExercise(item);
    onExerciseCreated?.(item);
    db.recordRecentExercise(item.id);
    onSelect(item);
    setCustomName('');
    setTab('all');
  };

  const cardBg = dark ? 'bg-military-900 border-military-700 text-white' : 'bg-white border-gray-200 text-military-900';
  const inputBg = dark
    ? 'bg-military-800 border-military-700 text-white placeholder-military-400'
    : 'bg-gray-50 border-gray-200 text-military-900';

  return (
    <div className="flex flex-col h-full space-y-2.5">
      {/* Onglets rapides */}
      <div className="grid grid-cols-4 gap-1 bg-military-950/10 p-1 rounded-xl">
        {[
          { id: 'all', label: `Tous (${exercises.length})` },
          { id: 'favorites', label: `★ (${favorites.length})` },
          { id: 'recent', label: 'Récents' },
          { id: 'create', label: '+ Perso' }
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id as any)}
            className={`py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
              tab === t.id ? 'bg-military-900 text-action-400 shadow' : dark ? 'text-military-300' : 'text-gray-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'create' ? (
        <form onSubmit={handleCreateCustom} className={`p-4 rounded-2xl border space-y-3 ${cardBg}`}>
          <div className="text-xs font-black uppercase text-action-600">Créer un exercice personnalisé (&lt; 30s)</div>
          <input
            required
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Nom de l'exercice (ex: Tirage corde franchissement)"
            className={`w-full p-2.5 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              aria-label="Domaine de l'exercice"
              value={customCat}
              onChange={(e) => setCustomCat(e.target.value as ExerciseCategory)}
              className={`p-2 rounded-xl border text-xs font-bold ${inputBg}`}
            >
              {EXERCISE_DOMAINS.map((dom) => (
                <option key={dom.id} value={dom.id}>
                  {dom.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Muscle principal"
              value={customMuscle}
              onChange={(e) => setCustomMuscle(e.target.value)}
              className={`p-2 rounded-xl border text-xs font-bold ${inputBg}`}
            >
              {CUSTOM_MUSCLE_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              aria-label="Matériel requis"
              value={customEquip}
              onChange={(e) => setCustomEquip(e.target.value)}
              className={`p-2 rounded-xl border text-xs font-bold ${inputBg}`}
            >
              {CUSTOM_EQUIP_OPTIONS.map((eq) => (
                <option key={eq} value={eq}>
                  {eq}
                </option>
              ))}
            </select>
            <select
              aria-label="Difficulté"
              value={customDiff}
              onChange={(e) => setCustomDiff(e.target.value as any)}
              className={`p-2 rounded-xl border text-xs font-bold ${inputBg}`}
            >
              <option value="Débutant">Débutant</option>
              <option value="Intermédiaire">Intermédiaire</option>
              <option value="Avancé">Avancé</option>
              <option value="Élite">Élite</option>
            </select>
          </div>
          <button
            type="submit"
            className="w-full py-2.5 bg-action-500 text-military-950 font-black uppercase text-xs rounded-xl shadow hover:bg-action-400"
          >
            Créer &amp; Ajouter à la séance
          </button>
        </form>
      ) : (
        <>
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">
                search
              </span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Recherche instantanée FR/EN (tolère les fautes)..."
                className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs font-medium outline-none focus:border-action-500 ${inputBg}`}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowMoreFilters((v) => !v)}
              className={`px-2.5 py-2 rounded-xl border text-[10px] font-black uppercase shrink-0 ${
                showMoreFilters || jobFilter !== 'all' || patternFilter !== 'all' || impactFilter !== 'all'
                  ? 'bg-military-900 text-action-400 border-military-900'
                  : inputBg
              }`}
              title="Filtres complémentaires (Métier, Schéma, Impact)"
            >
              + Filtres
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <select
              aria-label="Filtrer par domaine"
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
              className={`p-1.5 rounded-lg border text-[11px] font-bold ${inputBg}`}
            >
              <option value="all">Domaine : Tous (11)</option>
              {EXERCISE_DOMAINS.map((dom) => (
                <option key={dom.id} value={dom.id}>
                  {dom.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Filtrer par muscle"
              value={muscleFilter}
              onChange={(e) => setMuscleFilter(e.target.value)}
              className={`p-1.5 rounded-lg border text-[11px] font-bold ${inputBg}`}
            >
              <option value="all">Muscle : Tous</option>
              {muscles.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <select
              aria-label="Filtrer par matériel"
              value={equipFilter}
              onChange={(e) => setEquipFilter(e.target.value)}
              className={`p-1.5 rounded-lg border text-[11px] font-bold ${inputBg}`}
            >
              <option value="all">Matériel : Tous</option>
              {equips.map((eq) => (
                <option key={eq} value={eq}>
                  {eq}
                </option>
              ))}
            </select>
            <select
              aria-label="Filtrer par niveau"
              value={diffFilter}
              onChange={(e) => setDiffFilter(e.target.value)}
              className={`p-1.5 rounded-lg border text-[11px] font-bold ${inputBg}`}
            >
              <option value="all">Niveau : Tous</option>
              <option value="Débutant">Débutant</option>
              <option value="Intermédiaire">Intermédiaire</option>
              <option value="Avancé">Avancé</option>
              <option value="Élite">Élite</option>
            </select>
          </div>

          {showMoreFilters && (
            <div className="grid grid-cols-3 gap-1.5">
              <select
                aria-label="Filtrer par profil métier"
                value={jobFilter}
                onChange={(e) => setJobFilter(e.target.value)}
                className={`p-1.5 rounded-lg border text-[10px] font-bold ${inputBg}`}
              >
                <option value="all">Métier : Tous</option>
                {Object.values(JobType).map((j) => (
                  <option key={j} value={j}>
                    {j.split(' ')[0]}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filtrer par schéma moteur"
                value={patternFilter}
                onChange={(e) => setPatternFilter(e.target.value)}
                className={`p-1.5 rounded-lg border text-[10px] font-bold ${inputBg}`}
              >
                <option value="all">Schéma : Tous</option>
                {Object.entries(MOVEMENT_PATTERN_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filtrer par impact"
                value={impactFilter}
                onChange={(e) => setImpactFilter(e.target.value)}
                className={`p-1.5 rounded-lg border text-[10px] font-bold ${inputBg}`}
              >
                <option value="all">Impact : Tous</option>
                {Object.entries(IMPACT_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-gray-500">
              {filtered.length} résultat(s)
            </span>
            <div className="flex items-center gap-1.5">
              <select
                aria-label="Trier la sélection"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as ExerciseSortOption)}
                className={`px-2 py-1 rounded-lg border text-[10px] font-bold ${inputBg}`}
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
                  className="px-2 py-1 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 text-[10px] font-black uppercase"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-0.5">
            {displayed.map((ex) => {
              const isFav = favorites.includes(ex.id);
              const eqOk = isEquipmentAvailable(ex.equipment);
              const cat = inferExerciseCategory(ex);
              return (
                <div
                  key={ex.id}
                  onClick={() => {
                    db.recordRecentExercise(ex.id);
                    onSelect(ex);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      db.recordRecentExercise(ex.id);
                      onSelect(ex);
                    }
                  }}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all hover:border-action-500 ${cardBg}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ExerciseIllustration exerciseName={ex.name} fallbackType={ex.type} size="xs" dark={dark} />
                    <div className="min-w-0">
                      <div className="font-bold text-xs truncate">{ex.name}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-military-900 text-action-400">
                          {cat}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                          {ex.muscleGroup}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            eqOk ? 'bg-blue-50 text-blue-700' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {eqOk ? ex.equipment : `⚠ ${ex.equipment}`}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            DIFFICULTY_BADGE[ex.difficulty] || 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {ex.difficulty}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleToggleFav(ex.id, e)}
                      className={`p-1 rounded-lg ${isFav ? 'text-action-500' : 'text-gray-400 hover:text-action-500'}`}
                      aria-label={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                    >
                      <span className="material-icons text-base">{isFav ? 'star' : 'star_border'}</span>
                    </button>
                    <span className="w-7 h-7 rounded-lg bg-action-500 text-military-950 flex items-center justify-center">
                      <span className="material-icons text-sm">add</span>
                    </span>
                  </div>
                </div>
              );
            })}
            {displayed.length < filtered.length && (
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                className="w-full py-2 rounded-xl border border-military-200 text-[10px] font-black uppercase text-military-700 hover:border-action-500"
              >
                Afficher +{Math.min(PAGE_SIZE, filtered.length - displayed.length)} exercice(s) ({filtered.length - displayed.length} restant(s))
              </button>
            )}
            {filtered.length === 0 && (
              <div className="text-center py-8 text-xs text-gray-400 italic">
                Aucun exercice trouvé. Utilisez l'onglet « + Perso » pour le créer en 15 secondes.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ExercisePickerDrawer;
