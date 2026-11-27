export enum UserRole {
  USER = 'USER',
  MONITOR = 'MONITOR',
  ADMINISTRATOR = 'ADMINISTRATOR'
}

export type MonitorPermission = 'CHEF_CELLULE' | 'RESP_MATERIEL' | 'MONITEUR';
export type AuthorityScope = 'UNIT' | 'BASE' | 'AAE';
export type AIProviderId = 'algorithmic' | 'mistral';

export interface RgpdConsent {
  version: string;
  acceptedAt: string;          // ISO horodatage preuve consentement (Art. 7)
  healthDataConsent: boolean;  // Art. 9 RGPD (bilans forme, douleurs)
  aiProcessingConsent: boolean;// Droit d'opposition traitement IA (Art. 21)
  analyticsConsent: boolean;   // Agrégation anonymisée commandement
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorNid: string;
  actorName: string;
  actorRole: UserRole;
  serviceId?: string;
  action:
    | 'LOGIN_SUCCESS'
    | 'LOGIN_FAILED'
    | 'LOGIN_LOCKED'
    | 'LOGOUT'
    | 'REGISTER'
    | 'VIEW_USER_PROFILE'
    | 'EXPORT_RGPD_DATA'
    | 'DELETE_ACCOUNT'
    | 'UPDATE_RGPD_CONSENT'
    | 'EXPORT_SECURITY_REGISTRY'
    | 'EXPORT_SPORT_REGISTRY'
    | 'AUTHORITY_HANDOVER'
    | 'AI_PROVIDER_CHANGED'
    | 'PROGRAM_PUBLISHED'
    | 'PROGRAM_ASSIGNED'
    | 'UPDATE_FORMULA_CONFIG';
  targetId?: string;
  details: string;
}

export enum Gender {
  MALE = 'H',
  FEMALE = 'F'
}

export enum JobType {
  PN = 'Personnel Navigant (PN)',
  TECH = 'Personnel Logistique et Technique',
  FUSCO = 'Pompiers et Commandos',
  ADMIN = 'Poste Assis (Administratif, SIC, Contrôle Aérien)'
}

export enum WorkSchedule {
  OFFICE = 'Horaires de bureau',
  SHIFT = 'Horaires décalés',
  ON_CALL = 'Permanence / Astreintes'
}

export enum InfrastructureType {
  GYM_MIXED = 'Musculation-Cardio',
  GYM_WEIGHTS = 'Musculation',
  GYM_CARDIO = 'Cardio',
  DOJO = 'Dojo',
  FITNESS = 'Salle Fitness',
  OUTDOOR_FIELD = 'Terrain extérieur',
  SPORTS_GOALS = 'Terrains / Buts sportifs',
  CROSSFIT_CAGE = 'Cage Crossfit',
  OBSTACLE_COURSE = 'Parcours obstacle',
  CLIMBING_WALL = 'Escalade (SAE)',
  POOL = 'Piscine',
  TRACK = 'Piste Athlétisme',
  RESTRICTED = 'Zone restreinte'
}

export enum ProgramStatus {
  PENDING = 'PENDING',
  VALIDATED = 'VALIDATED',
  REJECTED = 'REJECTED',
  ARCHIVED = 'ARCHIVED'
}

export interface PhysicalTests {
  vamevalPalier?: number;
  lucLegerPalier?: number;
  run2400mTime?: string;
  cooperDistance?: number;
  run5kmTime?: string;
  run10kmTime?: string;
  runSemiMarathonTime?: string;
  run20kmTime?: string;
  runMarathonTime?: string;
  pushups?: number;
  pullups?: number;
  maxPullups?: number;
  swim100mTime?: string;
  benchPress1RM?: number;
  squat1RM?: number;
  deadlift1RM?: number;
  calculatedVMA?: number;
  isInjured?: boolean;
  ccpmInaptitude?: boolean;
  lastCcpmDate?: string;
  lastCcpmScore?: number; // sur 20
}

export interface DailyForm {
  date: string;
  sleepQuality: number; // 0-10 (10 = excellent)
  fatigueLevel: number; // 0-10 (10 = épuisé)
  stressLevel: number;  // 0-10 (10 = stressé)
  painLevel: number;    // 0-10 (10 = intense)
  painZone?: string;
  rulesAccepted?: boolean;
}

export interface ServiceEPMS {
  id: string;
  code: string;
  name: string;
  region?: string;
  monitorId: string;
  localRules?: string;
  emergencyPhone?: string;
  orfaContact?: string;
}

export interface CompletedSessionLog {
  id: string;
  sessionId: string;
  title: string;
  type: string;
  date: string; // ISO
  durationMinutes: number;
  locationName: string;
  rpe?: number; // 1-10
  notes?: string;
  programId?: string;
  adaptedForDailyForm?: boolean;
  totalVolumeKg?: number;
  setsCompleted?: number;
}

export interface UserProfile {
  nid: string;
  name: string;
  role: UserRole;
  monitorPermission?: MonitorPermission;
  authorityScope?: AuthorityScope;
  password?: string;      // Legacy uniquement pour migration initiale -> converti en passwordHash
  passwordHash?: string;  // PBKDF2-SHA256 salé (jamais en clair)
  gender: Gender;
  jobType: JobType;
  workSchedule: WorkSchedule;
  tests: PhysicalTests;
  dailyForms: DailyForm[];
  serviceId?: string;
  unit?: string;
  previousBases?: string[];
  completedSessions?: Session[];
  sessionLogs?: CompletedSessionLog[];
  rulesAcceptedAt?: string;
  rgpdConsent?: RgpdConsent;
  createdAt?: string;
}

export interface Infrastructure {
  id: string;
  name: string;
  type: InfrastructureType;
  rules?: string;
  serviceId: string;
  status?: 'Operational' | 'Maintenance' | 'Closed';
  normReference?: string;
  visualIntervalDays?: number;
  regulatoryIntervalDays?: number;
  lastVisualInspection?: string;     // YYYY-MM-DD
  lastRegulatoryInspection?: string; // YYYY-MM-DD
  capacity?: number;
  notes?: string;
}

export interface Equipment {
  id: string;
  name: string;
  category: 'Musculation' | 'Cardio' | 'Buts sportifs' | 'Escalade (SAE)' | 'Petit matériel';
  status: 'Operational' | 'Damaged' | 'Maintenance';
  infrastructureId: string;
  serviceId?: string;
  normReference?: string;
  visualIntervalDays?: number;
  regulatoryIntervalDays?: number;
  lastVisualInspection?: string;
  lastRegulatoryInspection?: string;
  notes?: string;
}

export interface InspectionLog {
  id: string;
  targetId: string;
  targetType: 'INFRA' | 'EQUIP';
  targetName: string;
  serviceId: string;
  inspectionType: 'VISUAL' | 'OPERATIONAL' | 'REGULATORY';
  date: string;      // YYYY-MM-DD
  timestamp: string; // ISO horodatage infalsifiable
  inspectorNid: string;
  inspectorName: string;
  status: 'CONFORME' | 'RESERVE' | 'NON_CONFORME';
  normReference?: string;
  notes?: string;
}

export interface ActiveSession {
  id: string;
  userId: string;
  userName: string;
  serviceId?: string;
  unit?: string;
  infrastructureId: string;
  infrastructureName: string;
  sessionType: 'FLASH' | 'PROGRAM' | 'COLLECTIVE' | 'FREE' | 'LIBRARY';
  startTime: string; // ISO string
  details: string;
  sessionPayload?: Session;
}

export interface SportRegistryEntry {
  id: string;
  userId: string;
  userName: string;
  serviceId: string;
  unit: string;
  infrastructureName: string;
  sessionType: 'FLASH' | 'PROGRAM' | 'COLLECTIVE' | 'FREE' | 'LIBRARY';
  title: string;
  startTime: string; // ISO
  endTime?: string;  // ISO
  durationMinutes?: number;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}

// --- BUILDER TYPES ---

export type ExerciseCategory =
  | 'Musculation'
  | 'Renforcement'
  | 'Cardio en salle'
  | 'Hyrox / CrossFit'
  | 'Pilates'
  | 'Mobilité'
  | 'Sport Santé'
  | 'Rééducation'
  | 'Course'
  | 'Préparation physique'
  | 'Échauffement'
  // Rétrocompatibilité éventuelle
  | 'Machine Cardio'
  | 'Marche / Franchissement'
  | 'Natation'
  | 'Sports Collectifs';

export type MovementPattern =
  | 'PUSH_H'
  | 'PUSH_V'
  | 'PULL_H'
  | 'PULL_V'
  | 'KNEE_DOM'
  | 'HIP_DOM'
  | 'CORE'
  | 'CARDIO'
  | 'MOBILITY'
  | 'CARRY';

export interface ExerciseLibraryItem {
  id: string;
  name: string;
  nameEn?: string;
  domain?: string;
  subCategory?: string;
  category?: ExerciseCategory;
  muscleGroup: string;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  antagonistMuscles?: string[];
  movementPattern?: MovementPattern;
  rawMovementPattern?: string;
  equipment: string;
  equipmentList?: string[];
  type: 'Force' | 'Cardio' | 'Mobility' | 'Polyarticulaire';
  difficulty: 'Débutant' | 'Intermédiaire' | 'Avancé' | 'Élite';
  energySystem?: 'anaerobic_alactic' | 'anaerobic_lactic' | 'aerobic';
  impactLevel?: 'none' | 'low' | 'medium' | 'high';
  laterality?: 'bilateral' | 'unilateral' | 'unilateral_reciprocal';
  planeOfMotion?: 'sagittal' | 'frontal' | 'transverse' | 'multi_planar';
  tempoDefault?: string;
  isCustom?: boolean;
  description?: string;
  cues?: string[];
  commonMistakes?: string[];
  contraindicatedPainZones?: string[]; // ex: ['genou', 'lombaires', 'épaule', 'cheville', 'poignet']
  adaptedJobProfiles?: JobType[];
  substitutes?: string[];  // noms ou IDs d'exercices de substitution
  progressions?: string[];
  regressions?: string[];
  mediaUrl?: string;
  createdByBase?: string;
  createdByNid?: string;
}

export type BlockType =
  | 'WARMUP'
  | 'MAIN'
  | 'COOLDOWN'
  | 'SUPERSET'
  | 'CIRCUIT'
  | 'EMOM'
  | 'AMRAP'
  | 'TABATA'
  | 'FOR_TIME'
  | 'INTERVALS'
  | 'RELAY'
  | 'CONTINUOUS';

export type PrescriptionMode =
  | 'STRENGTH'
  | 'RUNNING'
  | 'BODYWEIGHT'
  | 'MOBILITY'
  | 'LOADED_MARCH';

export interface AdaptationBounds {
  minIntensityDeltaPct: number; // ex: -20
  maxIntensityDeltaPct: number; // ex: +5
  substitutable: boolean;
  approvedAlternatives?: string[];
}

export interface PrescriptionSet {
  setNumber: number;
  reps?: string;
  loadKg?: number;
  percent1RM?: number;
  rpe?: number;
  rir?: number;
  restSec?: number;
}

export interface ProgramExercise {
  id: string;
  libraryId: string;
  name: string;
  mode?: PrescriptionMode;
  sets?: number;
  reps?: string;           // ex: "8" ou "8-10" ou "MAX"
  load?: string;           // legacy string ou affichage libre (ex: "[75% 1RM]")
  loadKg?: number;         // charge fixe kg (si définie)
  percent1RM?: number;     // ex: 75
  rpe?: number;            // 1-10
  rir?: number;            // 0-5
  tempo?: string;          // ex: "3-1-1-0"
  rest?: string;           // ex: "1:30"
  restSec?: number;        // ex: 90
  // Course / Cardio
  durationSeconds?: number;
  distanceMeters?: number;
  percentVMA?: number;     // ex: 95
  targetPace?: string;     // ex: "4:15/km"
  hrZone?: 1 | 2 | 3 | 4 | 5;
  runningSubType?: 'CONTINUOUS' | 'INTERVALS' | 'HILLS' | 'THRESHOLD' | 'FARTLEK' | 'RECOVERY';
  slopePct?: number;
  // Poids de corps / Fitness
  workSec?: number;
  toTechnicalFailure?: boolean;
  // Mobilité / Gainage
  holdSec?: number;
  bilateral?: boolean;     // côté gauche/droite
  amplitudeNote?: string;
  // Marche chargée & franchissement
  carriedLoadKg?: number;
  targetTimeSec?: number;
  // Human-in-the-Loop
  adaptationBounds?: AdaptationBounds;
  detailedSets?: PrescriptionSet[];
  note?: string;
  isRecovery?: boolean;
  equipment?: string;
  muscleGroup?: string;
}

export interface SessionBlock {
  id: string;
  type: BlockType;
  title: string;
  rounds?: number;
  restBetweenBlocksSec?: number;
  notes?: string;
  exercises: ProgramExercise[];
}

export interface ProgramSessionBuilder {
  id: string;
  title: string;
  type: string;
  description?: string;
  objective?: string;
  estimatedDurationMin?: number;
  intensity?: 'LOW' | 'MODERATE' | 'HIGH' | 'MAX';
  dayOfWeek?: number; // 1..7
  locationName?: string;
  infrastructureId?: string;
  monitorNotes?: string;
  safetyCues?: string;
  /** Nouvelle architecture hiérarchique par blocs (Échauffement / Corps / Retour au calme / Superset / Circuit...) */
  blocks?: SessionBlock[];
  /** Compatibilité descendante : miroir aplati des exercices */
  exercises: ProgramExercise[];
}

export interface ProgramWeek {
  id: string;
  number: number;
  objective?: string;
  isDeload?: boolean;
  sessions: ProgramSessionBuilder[];
  isCollapsed?: boolean;
}

export interface ProgramCycle {
  id: string;
  title: string;
  objective: string;
  phaseType?: 'PPG' | 'PPS' | 'MIXTE' | 'AFFUTAGE' | 'REPRISE';
  weeks: ProgramWeek[];
  isCollapsed?: boolean;
}

// --- END BUILDER TYPES ---

export enum WorkoutType {
  AMRAP = 'AMRAP',
  TABATA = 'TABATA',
  EMOM = 'EMOM',
  FOR_TIME = 'FOR TIME',
  HYROX = 'HYROX',
  MUSCU = 'MUSCU',
  CARDIO = 'CARDIO',
  HIIT = 'HIIT',
  NATATION = 'NATATION',
  PILATES = 'PILATES',
  MOBILITE = 'MOBILITE',
  PPO = 'PPO'
}

export interface SessionContent {
  equipmentNeeded?: string[];
  warmup?: string;
  mainBlock?: {
    exercise: string;
    prescription: string;
    rest: string;
    tempo?: string;
    durationSeconds?: number;
    isRecovery?: boolean;
  }[];
  scaledBlock?: {
    intro?: string;
    exercises: string[];
  };
  cooldown?: string;
  advice?: string;
}

export interface Session {
  id: string;
  programId?: string;
  infrastructureId: string;
  title: string;
  type: string;
  workoutType?: WorkoutType | string;
  level?: 'Facile' | 'Moyen' | 'Intense';
  material?: string[];
  bodyZone?: 'haut' | 'bas' | 'complet' | 'abdos';
  isGlobal?: boolean;
  durationMinutes: number;
  description: string;
  isCompleted: boolean;
  dateScheduled?: string;
  locationName?: string;
  content?: SessionContent;
  builderData?: ProgramSessionBuilder;
  createdByName?: string;
  createdByBase?: string;
  rpe?: number;
  completedAt?: string;
}

export interface CollectiveSession {
  id: string;
  title: string;
  instructorName: string;
  timeStart: string;
  timeEnd: string;
  locationName: string;
  dayOfWeek: number; // 1 = Lundi ... 7 = Dimanche
  maxParticipants: number;
  participants: string[];
  waitlist?: string[];
  detailedDescription?: string;
  serviceId?: string;
  category?: 'COLLECTIF' | 'CCPM' | 'EVENEMENT' | 'COHESION';
  eventDate?: string; // Optionnel YYYY-MM-DD pour les événements ponctuels
  cancelled?: boolean;
}

export type ProgramVisibility = 'PRIVATE' | 'SERVICE' | 'AAE';

export interface ProgramVersionSnapshot {
  version: number;
  savedAt: string;
  savedByNid: string;
  savedByName: string;
  summary: string;
  editPolicy?: 'APPLY_FROM_NOW' | 'FUTURE_ONLY';
  structure: ProgramCycle[];
}

export interface Program {
  id: string;
  userId: string; // NID ou '' si modèle/template
  assignedUserIds?: string[]; // Personnalisation de masse
  assignedUnit?: string;
  assignedJobProfile?: JobType;
  isTemplate?: boolean;
  isSharedNational?: boolean; // Mutualisation EPMS AAE (legacy sync avec visibility === 'AAE')
  visibility?: ProgramVisibility;
  version?: number;
  versionHistory?: ProgramVersionSnapshot[];
  sourceProgramId?: string;
  sourceAuthorName?: string;
  sourceBase?: string;
  isDraftAI?: boolean;
  phaseType?: 'PPG' | 'PPS' | 'MIXTE';
  level?: 'Débutant' | 'Intermédiaire' | 'Avancé';
  targetJobProfiles?: JobType[];
  tags?: string[];
  recurrence?: 'WEEKLY' | 'BIWEEKLY' | 'CUSTOM';
  appliedFromDate?: string;
  editPolicy?: 'APPLY_FROM_NOW' | 'FUTURE_ONLY';
  createdByNid?: string;
  createdByName?: string;
  createdByBase?: string;
  validatorId?: string;
  title: string;
  goal: string;
  status: ProgramStatus;
  type?: 'Course' | 'Musculation' | 'Hybride' | 'Réathlétisation' | 'Natation' | 'Pilates' | 'Mobilité' | 'Fitness' | 'HIIT' | 'CCPM' | 'Franchissement' | 'Marche chargée' | 'Sports collectifs';
  startDate: string;
  durationWeeks: number;
  sessionsPerWeek: number;
  requestedLocations?: string[];
  sessions: Session[];
  structure?: ProgramCycle[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: number;
}

export enum RouteType {
  RUNNING = 'Course à pied',
  VTT = 'VTT',
  CYCLING = 'Vélo Route'
}

export interface SportsRoute {
  id: string;
  name: string;
  type: RouteType;
  distanceKm: number;
  elevationMeters: number;
  description: string;
  gpxContent: string;
  mapImageUrl?: string;
  serviceId?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'alert' | 'success';
  category?: 'EMERGENCY' | 'PLANNING' | 'PROGRAM' | 'COMPLIANCE' | 'ORFA' | 'SYSTEM';
  timestamp: number;
  read: boolean;
  serviceId?: string;
  targetNids?: string[];
  targetRoles?: UserRole[];
  emergencyData?: {
    nid: string;
    userName: string;
    location: string;
    serviceId?: string;
    unit?: string;
    action: 'called_112' | 'alerted_monitor';
  };
}

export interface AuthorityHandover {
  id: string;
  fromNid: string;
  fromName: string;
  toNid: string;
  serviceId: string;
  unit?: string;
  scope: AuthorityScope;
  timestamp: string;
  status: 'COMPLETED';
}

export interface FacilityBooking {
  id: string;
  serviceId: string;
  infrastructureId: string;
  infrastructureName: string;
  date: string; // YYYY-MM-DD
  timeStart: string; // HH:MM
  timeEnd: string; // HH:MM
  userNid: string;
  userName: string;
  status: 'CONFIRMED' | 'CANCELLED';
  createdAt: string;
}

export interface MaintenanceTicket {
  id: string;
  serviceId: string;
  targetType: 'INFRASTRUCTURE' | 'EQUIPMENT';
  targetId: string;
  targetName: string;
  priority: 'CRITIQUE' | 'HAUTE' | 'NORMALE';
  title: string;
  description: string;
  status: 'OUVERT' | 'EN_COURS' | 'RESOLU';
  reportedByNid: string;
  reportedByName: string;
  createdAt: string;
  resolvedAt?: string;
  resolutionNotes?: string;
}

// ============================================================================
// MOTEUR DE CALCUL PARAMÉTRABLE & INDIVIDUALISATION TRAÇABLE (PIA 7.1.1)
// ============================================================================

export interface FormulaSystemConfig {
  id: string;
  updatedAt: string;
  updatedBy?: string;
  brzycki: {
    numerator: number;         // 36
    denominatorBase: number;   // 37
    maxValidReps: number;      // 10
    reference: string;
  };
  lucLeger: {
    baseSpeed: number;         // 8
    stepPerStage: number;      // 0.5
    vo2Slope: number;          // 5.857
    vo2Intercept: number;      // 19.458
    vo2Divisor: number;        // 3.5
    reference: string;
  };
  vameval: {
    baseSpeed: number;         // 8
    stepPerStage: number;      // 0.5
    reference: string;
  };
  performanceVmaFactors: {
    demiCooper: number;        // 1.00
    run2400m: number;          // 0.95
    run5km: number;            // 0.90
    run10km: number;           // 0.85
    runSemi: number;           // 0.80
    run20km: number;           // 0.80
    runMarathon: number;       // 0.70
    reference: string;
  };
  defaultWeightStepKg: number; // 2.5
  piaRules: {
    maxWeeklyVolumeIncreasePct: number;     // 15
    maxConsecutiveHighIntensityDays: number;// 2
    deloadCycleWeeks: number;               // 4
    reference: string;
  };
}

export interface CalculationTrace {
  metric: '1RM' | 'VMA' | 'LOAD_KG' | 'PACE_VMA' | 'DAILY_ADAPTATION' | 'SUBSTITUTION';
  formulaName: string;
  scientificReference: string;
  inputs: Record<string, string | number | boolean | undefined>;
  rawValue?: number;
  finalValue?: string | number;
  note?: string;
}

export type MissingReferenceKind = 'VMA' | '1RM_UPPER' | '1RM_LOWER' | '1RM_DEADLIFT';

export interface IndividualizedExerciseResult {
  exercise: ProgramExercise;
  displayPrescription: string;
  computedLoadKg: number | null;
  computedSpeedKmH: number | null;
  computedPace: string | null;
  appliedIntensityDeltaPct: number;
  boundsClamped: boolean;
  substitutedFrom?: string;
  missingReference?: MissingReferenceKind;
  warning?: string;
  traces: CalculationTrace[];
}

export interface IndividualizedBlockResult {
  block: SessionBlock;
  exercises: IndividualizedExerciseResult[];
}

export interface IndividualizedSessionResult {
  sessionId: string;
  title: string;
  weekNumber: number;
  dayOfWeek?: number;
  blocks: IndividualizedBlockResult[];
  warnings: string[];
  missingReferences: MissingReferenceKind[];
  adaptationsApplied: string[];
  traces: CalculationTrace[];
}

export interface IndividualizedProgramResult {
  programId: string;
  programTitle: string;
  userNid: string;
  userName: string;
  computedAt: string;
  vmaKmH: number | null;
  vmaSource: string;
  rmUpperKg: number | null;
  rmLowerKg: number | null;
  rmDeadliftKg: number | null;
  dailyFormZone?: 'BLACK' | 'RED' | 'ORANGE' | 'GREEN';
  sessions: IndividualizedSessionResult[];
  missingReferences: MissingReferenceKind[];
  warnings: string[];
  traces: CalculationTrace[];
}

export interface PedagogicalAlert {
  id: string;
  code: string; // ex: 'PIA-01'
  severity: 'info' | 'warning' | 'danger';
  title: string;
  message: string;
  ruleReference: string;
  targetWeek?: number;
  targetSessionId?: string;
  suggestedActionLabel?: string;
  suggestedActionType?: 'ADD_WARMUP' | 'ADD_COOLDOWN' | 'MARK_DELOAD' | 'INSPECT_EQUIPMENT';
}
