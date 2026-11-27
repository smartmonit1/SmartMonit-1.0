import { ExerciseCategory, ExerciseLibraryItem, JobType } from '../types';

export interface DomainMeta {
  id: ExerciseCategory;
  label: string;
  shortLabel: string;
  order: number;
}

export const EXERCISE_DOMAINS: DomainMeta[] = [
  { id: 'Musculation', label: 'Musculation', shortLabel: 'Muscu', order: 1 },
  { id: 'Renforcement', label: 'Renforcement', shortLabel: 'Renfo', order: 2 },
  { id: 'Cardio en salle', label: 'Cardio en salle', shortLabel: 'Cardio', order: 3 },
  { id: 'Hyrox / CrossFit', label: 'Hyrox / CrossFit', shortLabel: 'Hyrox', order: 4 },
  { id: 'Pilates', label: 'Pilates', shortLabel: 'Pilates', order: 5 },
  { id: 'Mobilité', label: 'Mobilité', shortLabel: 'Mobilité', order: 6 },
  { id: 'Sport Santé', label: 'Sport Santé', shortLabel: 'Santé', order: 7 },
  { id: 'Rééducation', label: 'Rééducation', shortLabel: 'Rééduc.', order: 8 },
  { id: 'Course', label: 'Course', shortLabel: 'Course', order: 9 },
  { id: 'Préparation physique', label: 'Préparation physique', shortLabel: 'Prépa', order: 10 },
  { id: 'Échauffement', label: 'Échauffement', shortLabel: 'Échauf.', order: 11 }
];

export const DOMAIN_ORDER_MAP: Record<string, number> = Object.fromEntries(
  EXERCISE_DOMAINS.map((d) => [d.id, d.order])
);

export const DIFFICULTY_ORDER: Record<string, number> = {
  Débutant: 1,
  Intermédiaire: 2,
  Avancé: 3,
  Élite: 4
};

export const IMPACT_LABELS: Record<string, string> = {
  none: 'Aucun impact',
  low: 'Impact faible',
  medium: 'Impact modéré',
  high: 'Impact élevé'
};

export const IMPACT_ORDER: Record<string, number> = {
  none: 1,
  low: 2,
  medium: 3,
  high: 4
};

export const ENERGY_SYSTEM_LABELS: Record<string, string> = {
  anaerobic_alactic: 'Anaérobie alactique',
  anaerobic_lactic: 'Anaérobie lactique',
  aerobic: 'Aérobie'
};

export const LATERALITY_LABELS: Record<string, string> = {
  bilateral: 'Bilatéral',
  unilateral: 'Unilatéral',
  unilateral_reciprocal: 'Unilatéral alterné'
};

export const MOVEMENT_PATTERN_LABELS: Record<string, string> = {
  KNEE_DOM: 'Squat / Genou',
  HIP_DOM: 'Charnière / Hanche',
  PUSH_H: 'Poussée horizontale',
  PUSH_V: 'Poussée verticale',
  PULL_H: 'Tirage horizontal',
  PULL_V: 'Tirage vertical',
  CORE: 'Gainage / Core',
  CARDIO: 'Cardio / Locomotion',
  MOBILITY: 'Mobilité',
  CARRY: 'Port de charge'
};

export type ExerciseSortOption =
  | 'domain'
  | 'name_asc'
  | 'name_desc'
  | 'difficulty_asc'
  | 'difficulty_desc'
  | 'impact_asc';

export const SORT_OPTIONS: Array<{ id: ExerciseSortOption; label: string }> = [
  { id: 'domain', label: 'Tri : Domaine' },
  { id: 'name_asc', label: 'Nom : A → Z' },
  { id: 'name_desc', label: 'Nom : Z → A' },
  { id: 'difficulty_asc', label: 'Niveau : Facile → Élite' },
  { id: 'difficulty_desc', label: 'Niveau : Élite → Facile' },
  { id: 'impact_asc', label: 'Impact : Doux → Élevé' }
];

export const normalizeText = (s: string): string =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

/**
 * Recherche bilingue (FR + EN) insensible aux accents et tolérante aux fautes de frappe légères.
 */
export const matchesExerciseSearch = (ex: ExerciseLibraryItem, query: string): boolean => {
  const q = normalizeText(query).trim();
  if (!q) return true;

  const haystack = normalizeText(
    `${ex.name} ${ex.nameEn || ''} ${ex.muscleGroup} ${ex.equipment} ${(ex.equipmentList || []).join(' ')} ${ex.category || ''} ${ex.description || ''}`
  );

  if (haystack.includes(q)) return true;

  const qWords = q.split(/\s+/).filter(Boolean);
  const tWords = haystack.split(/[\s\-/(),_+]+/).filter(Boolean);

  return qWords.every((qw) => {
    if (haystack.includes(qw)) return true;
    if (qw.length <= 2) return false;
    return tWords.some((tw) => {
      if (Math.abs(tw.length - qw.length) > 2) return false;
      let diffs = 0;
      let i = 0;
      let j = 0;
      while (i < qw.length && j < tw.length) {
        if (qw[i] === tw[j]) {
          i++;
          j++;
        } else {
          diffs++;
          if (diffs > 2) return false;
          if (qw.length > tw.length) i++;
          else if (tw.length > qw.length) j++;
          else {
            i++;
            j++;
          }
        }
      }
      diffs += qw.length - i + (tw.length - j);
      return diffs <= 2;
    });
  });
};

export interface ExerciseFilterCriteria {
  search?: string;
  category?: string;
  muscleGroup?: string;
  equipment?: string;
  difficulty?: string;
  movementPattern?: string;
  impactLevel?: string;
  laterality?: string;
  jobProfile?: string;
}

export const inferExerciseCategory = (ex: ExerciseLibraryItem): ExerciseCategory => {
  if (ex.category) return ex.category;
  if (ex.type === 'Cardio') return 'Course';
  if (ex.type === 'Mobility') return 'Mobilité';
  return 'Musculation';
};

export const filterExercises = (
  list: ExerciseLibraryItem[],
  criteria: ExerciseFilterCriteria
): ExerciseLibraryItem[] => {
  return list.filter((ex) => {
    if (criteria.search && !matchesExerciseSearch(ex, criteria.search)) return false;
    if (criteria.category && criteria.category !== 'all' && inferExerciseCategory(ex) !== criteria.category) {
      return false;
    }
    if (criteria.muscleGroup && criteria.muscleGroup !== 'all' && ex.muscleGroup !== criteria.muscleGroup) {
      return false;
    }
    if (criteria.equipment && criteria.equipment !== 'all' && ex.equipment !== criteria.equipment) {
      return false;
    }
    if (criteria.difficulty && criteria.difficulty !== 'all' && ex.difficulty !== criteria.difficulty) {
      return false;
    }
    if (
      criteria.movementPattern &&
      criteria.movementPattern !== 'all' &&
      ex.movementPattern !== criteria.movementPattern
    ) {
      return false;
    }
    if (criteria.impactLevel && criteria.impactLevel !== 'all' && ex.impactLevel !== criteria.impactLevel) {
      return false;
    }
    if (criteria.laterality && criteria.laterality !== 'all') {
      if (criteria.laterality === 'unilateral') {
        if (ex.laterality !== 'unilateral' && ex.laterality !== 'unilateral_reciprocal') return false;
      } else if (ex.laterality !== criteria.laterality) {
        return false;
      }
    }
    if (criteria.jobProfile && criteria.jobProfile !== 'all') {
      if (ex.adaptedJobProfiles && !ex.adaptedJobProfiles.includes(criteria.jobProfile as JobType)) {
        return false;
      }
    }
    return true;
  });
};

export const sortExercises = (
  list: ExerciseLibraryItem[],
  sortBy: ExerciseSortOption
): ExerciseLibraryItem[] => {
  const copy = [...list];
  switch (sortBy) {
    case 'name_asc':
      return copy.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    case 'name_desc':
      return copy.sort((a, b) => b.name.localeCompare(a.name, 'fr'));
    case 'difficulty_asc':
      return copy.sort(
        (a, b) =>
          (DIFFICULTY_ORDER[a.difficulty] || 99) - (DIFFICULTY_ORDER[b.difficulty] || 99) ||
          a.name.localeCompare(b.name, 'fr')
      );
    case 'difficulty_desc':
      return copy.sort(
        (a, b) =>
          (DIFFICULTY_ORDER[b.difficulty] || 0) - (DIFFICULTY_ORDER[a.difficulty] || 0) ||
          a.name.localeCompare(b.name, 'fr')
      );
    case 'impact_asc':
      return copy.sort(
        (a, b) =>
          (IMPACT_ORDER[a.impactLevel || 'low'] || 2) - (IMPACT_ORDER[b.impactLevel || 'low'] || 2) ||
          a.name.localeCompare(b.name, 'fr')
      );
    case 'domain':
    default:
      return copy.sort((a, b) => {
        const da = DOMAIN_ORDER_MAP[inferExerciseCategory(a)] || 99;
        const db = DOMAIN_ORDER_MAP[inferExerciseCategory(b)] || 99;
        if (da !== db) return da - db;
        return a.id.localeCompare(b.id, 'fr');
      });
  }
};
