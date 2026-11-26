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
    | 'AI_PROVIDER_CHANGED';
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
  | 'Pilates'
  | 'Renforcement'
  | 'Machine Cardio'
  | 'Course';

export interface ExerciseLibraryItem {
  id: string;
  name: string;
  category?: ExerciseCategory;
  muscleGroup: string;
  equipment: string;
  type: 'Force' | 'Cardio' | 'Mobility' | 'Polyarticulaire';
  difficulty: 'Débutant' | 'Intermédiaire' | 'Avancé';
  description?: string;
  createdByBase?: string;
}

export interface ProgramExercise {
  id: string;
  libraryId: string;
  name: string;
  sets?: number;
  reps?: string;
  load?: string;
  rest?: string;
  tempo?: string;
  durationSeconds?: number;
  note?: string;
  isRecovery?: boolean;
}

export interface ProgramSessionBuilder {
  id: string;
  title: string;
  type: string;
  description?: string;
  locationName?: string;
  infrastructureId?: string;
  exercises: ProgramExercise[];
}

export interface ProgramWeek {
  id: string;
  number: number;
  objective?: string;
  sessions: ProgramSessionBuilder[];
  isCollapsed?: boolean;
}

export interface ProgramCycle {
  id: string;
  title: string;
  objective: string;
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

export interface Program {
  id: string;
  userId: string; // NID ou '' si modèle/template
  assignedUserIds?: string[]; // Personnalisation de masse
  assignedUnit?: string;
  isTemplate?: boolean;
  isSharedNational?: boolean; // Mutualisation EPMS AAE
  createdByNid?: string;
  createdByName?: string;
  createdByBase?: string;
  validatorId?: string;
  title: string;
  goal: string;
  status: ProgramStatus;
  type?: 'Course' | 'Musculation' | 'Hybride' | 'Réathlétisation' | 'Natation' | 'Pilates' | 'Mobilité';
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
