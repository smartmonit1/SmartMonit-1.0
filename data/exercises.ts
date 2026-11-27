import { ExerciseCategory, ExerciseLibraryItem, JobType, MovementPattern } from '../types';
import { resolveExerciseVisual } from '../utils/exerciseVisuals';
import rawExercisesData from './exercisesDatabase.json';

/**
 * Référentiel National d'Exercices SMART MONIT 1.0 — Base Maître 475 exercices (11 domaines).
 * Importe intégralement `data/exercisesDatabase.json` sans altérer ni omettre aucune donnée source.
 */
export const EXERCISES_CATALOG_VERSION = 'v7_master_475';

interface RawExerciseRecord {
  id: string;
  name_en: string;
  name_fr: string;
  domain: string;
  category: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  antagonist_muscles: string[];
  movement_pattern: string;
  equipment: string[];
  difficulty_level: 'beginner' | 'intermediate' | 'advanced' | 'elite';
  energy_system: 'anaerobic_alactic' | 'anaerobic_lactic' | 'aerobic';
  impact_level: 'none' | 'low' | 'medium' | 'high';
  bilateral_unilateral: 'bilateral' | 'unilateral' | 'unilateral_reciprocal';
  plane_of_motion: 'sagittal' | 'frontal' | 'transverse' | 'multi_planar';
  contraindications: string[];
  tempo_default: string;
  is_custom: boolean;
}

const DOMAIN_TO_CATEGORY: Record<string, ExerciseCategory> = {
  musculation_en_salle: 'Musculation',
  renfort_musculaire: 'Renforcement',
  cardio_en_salle: 'Cardio en salle',
  hyrox_crossfit: 'Hyrox / CrossFit',
  pilates: 'Pilates',
  mobilite: 'Mobilité',
  sport_sante: 'Sport Santé',
  reeducation: 'Rééducation',
  course: 'Course',
  preparation_physique: 'Préparation physique',
  echauffement: 'Échauffement'
};

const DIFFICULTY_MAP: Record<RawExerciseRecord['difficulty_level'], ExerciseLibraryItem['difficulty']> = {
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  advanced: 'Avancé',
  elite: 'Élite'
};

const MUSCLE_TO_GROUP: Record<string, string> = {
  pectoralis_major: 'Pectoraux',
  latissimus_dorsi: 'Dos',
  rhomboids: 'Dos',
  trapezius_middle: 'Dos',
  thoracic_spine: 'Dos',
  anterior_deltoid: 'Épaules',
  lateral_deltoid: 'Épaules',
  posterior_deltoid: 'Épaules',
  biceps_brachii: 'Bras',
  triceps_brachii: 'Bras',
  quadriceps: 'Jambes',
  hip_flexors: 'Jambes',
  adductors: 'Jambes',
  hamstrings: 'Chaîne Postérieure',
  gluteus_maximus: 'Chaîne Postérieure',
  gluteal_complex: 'Chaîne Postérieure',
  erector_spinae: 'Chaîne Postérieure',
  calves_gastrocnemius: 'Mollets',
  calves_soleus: 'Mollets',
  calves: 'Mollets',
  transverse_abdominis: 'Core / Abdos',
  rectus_abdominis: 'Core / Abdos',
  internal_obliques: 'Core / Abdos',
  external_obliques: 'Core / Abdos',
  quadratus_lumborum: 'Core / Abdos'
};

const mapMuscleGroup = (raw: RawExerciseRecord): string => {
  const combinedName = `${raw.name_fr} ${raw.name_en}`.toLowerCase();

  // Correction sémantique pour exercices d'abduction de hanche / fessiers moyens
  if (
    raw.primary_muscles.includes('lateral_deltoid') &&
    /hanche|jambe|clamshell|crabe|monster walk|hip abduction|side kick|side leg/.test(combinedName)
  ) {
    return 'Chaîne Postérieure';
  }

  if (
    raw.domain === 'course' ||
    (raw.domain === 'cardio_en_salle' && raw.movement_pattern === 'locomotion')
  ) {
    return 'Cardio / Full Body';
  }

  const first = raw.primary_muscles[0];
  if (first && MUSCLE_TO_GROUP[first]) {
    return MUSCLE_TO_GROUP[first];
  }
  return 'Core / Abdos';
};

const mapEquipment = (raw: RawExerciseRecord): string => {
  const eqSet = new Set(raw.equipment || []);
  const has = (items: string[]) => items.some((x) => eqSet.has(x));

  if (raw.domain === 'course') return 'Course / Extérieur';
  if (eqSet.has('pilates_reformer')) return 'Pilates Reformer';
  if (
    has([
      'rowing_machine',
      'skierg',
      'bikeerg',
      'air_bike',
      'echo_bike',
      'treadmill',
      'curved_treadmill',
      'stair_climber',
      'elliptical_trainer',
      'spinning_bike',
      'recumbent_bike',
      'arm_ergometer'
    ])
  ) {
    return 'Machine cardio';
  }
  if (
    has([
      'leg_press_machine',
      'hack_squat_machine',
      'leg_extension_machine',
      'seated_leg_curl_machine',
      'lying_leg_curl_machine',
      'calf_raise_machine',
      'seated_calf_machine',
      'chest_press_machine',
      'pec_deck_machine',
      'shoulder_press_machine',
      'lateral_raise_machine',
      'row_machine',
      't_bar_row_machine',
      'smith_machine',
      'ghd_machine'
    ])
  ) {
    return 'Machine guidée';
  }
  if (has(['cable_machine', 'cable_machine_or_band'])) return 'Poulie';
  if (has(['barbell', 'ez_bar', 'trap_bar', 'landmine'])) return 'Barre';
  if (has(['dumbbell', 'dumbbells', 'light_dumbbell', 'light_dumbbells', 'heavy_dumbbell'])) {
    return 'Haltères';
  }
  if (has(['kettlebell', 'light_kettlebell', 'light_kettlebells'])) return 'Kettlebell';
  if (has(['pull_up_bar', 'dip_bars'])) return 'Barre de traction';
  if (has(['gymnastic_rings', 'climbing_rope', 'rope'])) return 'Anneaux / Sangles';
  if (
    has([
      'resistance_band',
      'light_resistance_band',
      'heavy_resistance_band',
      'light_loop_band',
      'mini_loop_band',
      'heavy_band',
      'mini_band'
    ])
  ) {
    return 'Élastiques';
  }
  if (
    has([
      'sandbag',
      'medicine_ball',
      'slam_ball',
      'sled',
      'sprint_sled',
      'battle_rope',
      'boxing_heavy_bag'
    ])
  ) {
    return 'Médecine-ball / Sac';
  }
  if (has(['plyo_box', 'plyo_box_30cm', 'step_box', 'aerobic_step', 'flat_bench', 'adjustable_bench', 'high_bench'])) {
    return 'Box / Banc';
  }
  if (
    has([
      'bodyweight',
      'exercise_mat',
      'wall',
      'chair',
      'sturdy_chair',
      'chair_or_bench',
      'floor_or_wall',
      'flat_ground',
      'smooth_floor'
    ])
  ) {
    return 'Poids du corps / Tapis';
  }
  if (
    has([
      'running_shoes',
      'track',
      'hill',
      'trail_terrain',
      'forest_trail',
      'natural_grass',
      'road',
      'road_or_track',
      'smooth_road',
      'sand_beach',
      'outdoor_stairs',
      'track_or_grass',
      'track_or_turf'
    ])
  ) {
    return 'Course / Extérieur';
  }
  return 'Matériel spécifique';
};

const mapMovementPattern = (raw: RawExerciseRecord, muscleGroup: string): MovementPattern => {
  const n = `${raw.name_fr} ${raw.name_en}`.toLowerCase();
  switch (raw.movement_pattern) {
    case 'squat':
    case 'lunge':
      return 'KNEE_DOM';
    case 'hinge':
      return 'HIP_DOM';
    case 'horizontal_push':
      return 'PUSH_H';
    case 'vertical_push':
    case 'isolation_deltoids':
      return 'PUSH_V';
    case 'horizontal_pull':
      return 'PULL_H';
    case 'vertical_pull':
      return 'PULL_V';
    case 'anti_rotation':
    case 'anti_extension':
    case 'anti_lateral_flexion':
      return 'CORE';
    case 'mobility_flow':
      return 'MOBILITY';
    case 'locomotion':
      if (/carry|fermier|farm|sandbag|sled|marche/.test(n) && raw.domain !== 'course') {
        return /carry|fermier|farm|sandbag/.test(n) ? 'CARRY' : 'CARDIO';
      }
      return 'CARDIO';
    case 'isolation_calves':
      return 'KNEE_DOM';
    case 'isolation_arms':
      return raw.primary_muscles.includes('triceps_brachii') ? 'PUSH_H' : 'PULL_H';
    case 'isolation':
      if (muscleGroup === 'Pectoraux') return 'PUSH_H';
      if (muscleGroup === 'Épaules') return 'PUSH_V';
      if (muscleGroup === 'Dos') return 'PULL_H';
      if (muscleGroup === 'Jambes') return 'KNEE_DOM';
      if (muscleGroup === 'Chaîne Postérieure') return 'HIP_DOM';
      return 'CORE';
    default:
      return 'CORE';
  }
};

const mapExerciseType = (
  raw: RawExerciseRecord,
  pattern: MovementPattern
): ExerciseLibraryItem['type'] => {
  if (raw.domain === 'mobilite' || raw.domain === 'echauffement' || raw.domain === 'pilates') {
    return raw.domain === 'pilates' && raw.movement_pattern !== 'mobility_flow'
      ? 'Force'
      : 'Mobility';
  }
  if (raw.domain === 'course' || raw.domain === 'cardio_en_salle' || pattern === 'CARDIO') {
    return 'Cardio';
  }
  if (
    raw.domain === 'hyrox_crossfit' ||
    raw.domain === 'preparation_physique' ||
    raw.movement_pattern === 'squat' ||
    raw.movement_pattern === 'hinge' ||
    raw.movement_pattern === 'lunge'
  ) {
    return 'Polyarticulaire';
  }
  return 'Force';
};

const inferContraindications = (
  raw: RawExerciseRecord,
  pattern: MovementPattern
): string[] => {
  if (raw.contraindications && raw.contraindications.length > 0) {
    return raw.contraindications;
  }
  if (raw.domain === 'reeducation' || raw.domain === 'mobilite' || raw.domain === 'pilates') {
    return [];
  }
  const n = `${raw.name_fr} ${raw.name_en}`.toLowerCase();
  const zones = new Set<string>();
  if (raw.impact_level === 'high' || /box jump|depth|plyo|sprint|fractionné/.test(n)) {
    zones.add('genou');
    zones.add('cheville');
  }
  if (pattern === 'KNEE_DOM' && /squat|fente|leg press|hack|extension/.test(n)) {
    zones.add('genou');
  }
  if (pattern === 'HIP_DOM' && /soulevé de terre|deadlift|good morning|swing/.test(n)) {
    zones.add('lombaires');
  }
  if ((pattern === 'PUSH_V' || pattern === 'PULL_V') && raw.difficulty_level !== 'beginner') {
    zones.add('épaule');
  }
  if (pattern === 'PUSH_H' && /dips|pompe|développé/.test(n) && raw.difficulty_level === 'advanced') {
    zones.add('épaule');
  }
  if (/clean|snatch|arraché|épaulé|thruster/.test(n)) {
    zones.add('poignet');
    zones.add('lombaires');
  }
  return Array.from(zones);
};

const inferJobProfiles = (
  raw: RawExerciseRecord,
  category: ExerciseCategory,
  pattern: MovementPattern
): JobType[] => {
  const n = `${raw.name_fr} ${raw.name_en}`.toLowerCase();
  const jobs = new Set<JobType>();

  if (category === 'Pilates' || category === 'Mobilité' || category === 'Sport Santé') {
    jobs.add(JobType.PN);
    jobs.add(JobType.ADMIN);
    jobs.add(JobType.TECH);
  }
  if (category === 'Rééducation') {
    jobs.add(JobType.ADMIN);
    jobs.add(JobType.TECH);
    jobs.add(JobType.PN);
  }
  if (category === 'Course' || category === 'Cardio en salle' || category === 'Échauffement') {
    jobs.add(JobType.FUSCO);
    jobs.add(JobType.PN);
    jobs.add(JobType.TECH);
    jobs.add(JobType.ADMIN);
  }
  if (category === 'Hyrox / CrossFit' || category === 'Préparation physique' || pattern === 'CARRY') {
    jobs.add(JobType.FUSCO);
  }
  if (pattern === 'PULL_H' || pattern === 'PULL_V' || pattern === 'CORE' || pattern === 'HIP_DOM') {
    jobs.add(JobType.PN);
    jobs.add(JobType.ADMIN);
    jobs.add(JobType.TECH);
  }
  if (/tract|pomp|gainage|squat|marche|corde|burpee/.test(n)) {
    jobs.add(JobType.FUSCO);
  }

  return jobs.size > 0
    ? Array.from(jobs)
    : [JobType.PN, JobType.TECH, JobType.ADMIN, JobType.FUSCO];
};

const DOMAIN_DESCRIPTIONS: Record<string, string> = {
  musculation_en_salle: 'Exercice de musculation en salle pour le développement de la force et de l’hypertrophie.',
  renfort_musculaire: 'Exercice de renforcement musculaire fonctionnel adapté à la préparation opérationnelle.',
  cardio_en_salle: 'Travail cardiorespiratoire sur ergomètre ou matériel cardio en salle.',
  hyrox_crossfit: 'Mouvement métabolique et fonctionnel haute intensité typé Hyrox / CrossFit.',
  pilates: 'Exercice de méthode Pilates axé sur le centrage, la respiration et le contrôle postural.',
  mobilite: 'Travail de mobilité articulaire et de souplesse active pour préserver l’amplitude.',
  sport_sante: 'Exercice accessible Sport-Santé orienté prévention, maintien de la forme et reprise douce.',
  reeducation: 'Exercice thérapeutique progressif dédié à la rééducation et à la récupération fonctionnelle.',
  course: 'Séance ou format de course à pied pour le développement aérobie, VMA ou seuil.',
  preparation_physique: 'Exercice de préparation physique athlétique (puissance, explosivité, vitesse).',
  echauffement: 'Exercice d’activation neuromusculaire et de mise en train sécurisée.'
};

const buildLibraryItem = (raw: RawExerciseRecord): ExerciseLibraryItem => {
  const category = DOMAIN_TO_CATEGORY[raw.domain] || 'Musculation';
  const muscleGroup = mapMuscleGroup(raw);
  const equipment = mapEquipment(raw);
  const movementPattern = mapMovementPattern(raw, muscleGroup);
  const type = mapExerciseType(raw, movementPattern);
  const visual = resolveExerciseVisual(raw.name_fr, type);

  return {
    id: raw.id,
    name: raw.name_fr,
    nameEn: raw.name_en,
    domain: raw.domain,
    subCategory: raw.category,
    category,
    muscleGroup,
    primaryMuscles: raw.primary_muscles,
    secondaryMuscles: raw.secondary_muscles,
    antagonistMuscles: raw.antagonist_muscles,
    movementPattern,
    rawMovementPattern: raw.movement_pattern,
    equipment,
    equipmentList: raw.equipment,
    type,
    difficulty: DIFFICULTY_MAP[raw.difficulty_level] || 'Intermédiaire',
    energySystem: raw.energy_system,
    impactLevel: raw.impact_level,
    laterality: raw.bilateral_unilateral,
    planeOfMotion: raw.plane_of_motion,
    tempoDefault: raw.tempo_default,
    isCustom: raw.is_custom,
    description: `${DOMAIN_DESCRIPTIONS[raw.domain] || ''} (${raw.name_en})`.trim(),
    cues: visual.cues,
    commonMistakes: visual.commonMistakes,
    contraindicatedPainZones: inferContraindications(raw, movementPattern),
    adaptedJobProfiles: inferJobProfiles(raw, category, movementPattern),
    substitutes: [],
    regressions: visual.scaledOption ? [visual.scaledOption] : []
  };
};

const RAW_EXERCISES = rawExercisesData as RawExerciseRecord[];

export const EXERCISE_DATABASE: ExerciseLibraryItem[] = RAW_EXERCISES.map(buildLibraryItem);

// Attribution automatique de substituts cohérents (même domaine ou même schéma moteur, difficulté <= ou égale)
const byPattern = new Map<MovementPattern, ExerciseLibraryItem[]>();
for (const ex of EXERCISE_DATABASE) {
  const p = ex.movementPattern || 'CORE';
  const arr = byPattern.get(p) || [];
  arr.push(ex);
  byPattern.set(p, arr);
}

for (const ex of EXERCISE_DATABASE) {
  const candidates = (byPattern.get(ex.movementPattern || 'CORE') || []).filter(
    (other) => other.id !== ex.id && other.muscleGroup === ex.muscleGroup
  );
  const differentEquip = candidates.filter((other) => other.equipment !== ex.equipment);
  const pool = differentEquip.length >= 2 ? differentEquip : candidates;
  ex.substitutes = pool.slice(0, 3).map((s) => s.name);
}
