import {
  AIProviderId,
  DailyForm,
  Equipment,
  ExerciseLibraryItem,
  Gender,
  JobType,
  WorkSchedule
} from '../../types';

/**
 * Contexte utilisateur STRICTEMENT PSEUDONYMISÉ (Privacy by Design — RGPD Art. 25)
 * Ne contient JAMAIS de NID, nom, prénom, base, unité ou donnée directement identifiante.
 */
export interface AnonymizedUserContext {
  gender: Gender;
  jobType: JobType;
  jobDirective: string;
  workSchedule: WorkSchedule;
  vmaKmH: number;
  rmUpperKg: number;
  rmLowerKg: number;
  pushups?: number;
  pullups?: number;
  run10kmTime?: string;
  runSemiMarathonTime?: string;
  run20kmTime?: string;
  ccpmInaptitude?: boolean;
}

export interface FlashSessionRequest {
  anonUser: AnonymizedUserContext;
  dailyForm: DailyForm;
  locationLabel: string;
  sessionType: string;
  durationMinutes: number;
  exerciseLibrary: ExerciseLibraryItem[];
  availableEquipment: Equipment[];
}

export interface FullProgramRequest {
  anonUser: AnonymizedUserContext;
  goal: string;
  sessionsPerWeek: number;
  weeks: number;
  allowedLocations: string[];
}

export interface SessionAdaptationRequest {
  anonUser: AnonymizedUserContext;
  dailyForm: DailyForm;
  session: any;
  availableEquipment?: Equipment[];
  exerciseLibrary?: ExerciseLibraryItem[];
}

export interface IAIProvider {
  readonly id: AIProviderId;
  readonly label: string;
  readonly sovereigntyNote: string;
  isConfigured(): boolean;
  generateFlashSession(req: FlashSessionRequest): Promise<any>;
  generateFullProgram(req: FullProgramRequest): Promise<any>;
  suggestSessionModifications(req: SessionAdaptationRequest): Promise<any>;
  parseTrainingFile(base64Data: string, mimeType: string): Promise<any>;
  parsePlanningFile(base64Data: string, mimeType: string): Promise<any>;
  getRegulatoryInfo(itemName: string, itemType: string, localReference: string): Promise<string>;
  chatWithCoach(history: { role: 'user' | 'assistant'; content: string }[], message: string): Promise<string>;
}

export const SYSTEM_INSTRUCTION = `MISSION
- Tu assistes les utilisateurs et les coachs dans la pratique sportive et la préparation physique.
- Tes propositions sont des suggestions explicables, jamais un diagnostic médical ni une décision automatique.
- Le coach garde la responsabilité de vérifier, modifier et valider les programmes et adaptations.
- Tiens compte de l'objectif, de l'expérience, du temps disponible, de la récupération et du matériel réellement accessible.
- Privilégie une progression individualisée, une technique maîtrisée, une récupération suffisante et des adaptations réversibles.
- Ne recommande pas de s'entraîner à travers une douleur importante; invite à interrompre l'effort et à demander un avis professionnel de santé.
- Ne demande ni n'inclus de données directement identifiantes. Les traitements externes nécessitent un cadre serveur et une base légale appropriés.`;
