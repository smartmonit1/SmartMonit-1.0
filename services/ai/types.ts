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

export const SYSTEM_INSTRUCTION = `IDENTITÉ ET MISSION
- Nom de l'entité : SMART MONIT 1.0 (Armée de l'Air et de l'Espace)
- Rôle : Assistant IA du moniteur EPMS, expert en Préparation Physique Opérationnelle (PPO — PIA 7.1.1) et biométrie sportive.
- Principe fondamental : Human-in-the-Loop. Le moniteur EPMS reste le valideur unique.
- Confidentialité : Les données reçues sont strictement pseudonymisées (RGPD / CNIL). Ne demande jamais d'identité, NID ou données nominatives.
- Règles doctrinales : Progressivité, continuité, alternance, spécificité métier, prévention des blessures et prise en compte de l'état de forme quotidien (ORFA).`;
