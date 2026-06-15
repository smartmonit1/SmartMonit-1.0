
export enum UserRole {
  USER = 'USER',
  MONITOR = 'MONITOR',
  ADMINISTRATOR = 'ADMINISTRATOR'
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
  SHIFT = 'Horaires décalées',
  ON_CALL = 'Permanence / Astreintes'
}

export enum InfrastructureType {
  GYM_MIXED = 'Musculation-Cardio',
  GYM_WEIGHTS = 'Musculation',
  GYM_CARDIO = 'Cardio',
  DOJO = 'Dojo',
  FITNESS = 'Salle Fitness',
  OUTDOOR_FIELD = 'Terrain extérieur',
  CROSSFIT_CAGE = 'Cage Crossfit',
  OBSTACLE_COURSE = 'Parcours obstacle',
  POOL = 'Piscine',
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
  run10kmTime?: string;
  runSemiMarathonTime?: string;
  run20kmTime?: string;
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
}

export interface DailyForm {
  date: string;
  sleepQuality: number;
  fatigueLevel: number;
  stressLevel: number;
  painLevel: number;
  painZone?: string;
}

export interface ServiceEPMS {
  id: string;
  name: string;
  monitorId: string;
}

export interface UserProfile {
  nid: string;
  name: string;
  role: UserRole;
  password?: string;
  gender: Gender;
  jobType: JobType;
  workSchedule: WorkSchedule;
  tests: PhysicalTests;
  dailyForms: DailyForm[];
  serviceId?: string;
  unit?: string;
  completedSessions?: Session[];
}

export interface Infrastructure {
  id: string;
  name: string;
  type: InfrastructureType;
  rules?: string;
  serviceId: string;
  // Compliance Fields
  lastVisualInspection?: string; // Date YYYY-MM-DD (Souvent trimestriel)
  lastRegulatoryInspection?: string; // Date YYYY-MM-DD (Contrôle Annuel obligatoire)
}

export interface ActiveSession {
  id: string;
  userId: string;
  userName: string;
  infrastructureId: string;
  infrastructureName: string;
  sessionType: 'FLASH' | 'PROGRAM' | 'COLLECTIVE';
  startTime: string; // ISO string
  details: string; // Brief description
}

export interface Equipment {
  id: string;
  name: string;
  category: 'Musculation' | 'Cardio' | 'Petit matériel';
  status: 'Operational' | 'Damaged' | 'Maintenance';
  infrastructureId: string;
  // Compliance Fields
  lastVisualInspection?: string; 
  lastRegulatoryInspection?: string; 
}

// --- BUILDER TYPES ---

export interface ExerciseLibraryItem {
  id: string;
  name: string;
  muscleGroup: string; 
  equipment: string; 
  type: 'Force' | 'Cardio' | 'Mobility' | 'Polyarticulaire';
  difficulty: 'Débutant' | 'Intermédiaire' | 'Avancé';
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
}

export interface CollectiveSession {
  id: string;
  title: string;
  instructorName: string;
  timeStart: string; 
  timeEnd: string;   
  locationName: string;
  dayOfWeek: number; 
  maxParticipants: number;
  participants: string[]; 
  detailedDescription?: string;
  serviceId?: string;
}

export interface Program {
  id: string;
  userId: string;
  validatorId?: string;
  title: string;
  goal: string;
  status: ProgramStatus;
  type?: 'Course' | 'Musculation' | 'Hybride' | 'Réathlétisation'; 
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
  timestamp: number;
  read: boolean;
  emergencyData?: {
    nid: string;
    userName: string;
    location: string;
    action: 'called_112' | 'alerted_monitor';
  };
}
