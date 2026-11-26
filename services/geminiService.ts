import {
  UserProfile,
  DailyForm,
  Infrastructure,
  ExerciseLibraryItem,
  Equipment,
  AIProviderId
} from '../types';
import { REGULATORY_RULES_DB } from '../utils/compliance';
import { buildAnonymizedAIContext } from './ai/anonymizer';
import {
  resolveEffectiveProvider,
  getFallbackProvider,
  getPreferredAIProvider,
  setPreferredAIProvider,
  listAIProvidersStatus
} from './ai/aiRouter';

export { getPreferredAIProvider, setPreferredAIProvider, listAIProvidersStatus };

export const getActiveAIProvider = (): AIProviderId => getPreferredAIProvider();

const buildLocalRegulatoryReference = (itemName: string, itemType: string): string => {
  const lower = `${itemName} ${itemType}`.toLowerCase();
  let localRule = REGULATORY_RULES_DB.STANDARD_INFRA;
  if (lower.includes('but') || lower.includes('foot') || lower.includes('hand') || lower.includes('basket')) {
    localRule = REGULATORY_RULES_DB.BUTS;
  } else if (lower.includes('escalade') || lower.includes('sae') || lower.includes('ancrage')) {
    localRule = REGULATORY_RULES_DB.ESCALADE;
  } else if (
    lower.includes('muscu') ||
    lower.includes('cardio') ||
    lower.includes('banc') ||
    lower.includes('rack') ||
    lower.includes('presse') ||
    lower.includes('tapis') ||
    lower.includes('rameur')
  ) {
    localRule = REGULATORY_RULES_DB.MUSCULATION;
  }
  return `Norme applicable : ${localRule.normCode} (${localRule.legalBasis}).\n• ${localRule.visualLabel}\n• ${localRule.regulatoryLabel}\n${localRule.summary}`;
};

export const generateFlashSession = async (
  user: UserProfile,
  lastDaily: DailyForm,
  locationName: string,
  sessionType: string,
  duration: number,
  _availableInfras: Infrastructure[],
  exerciseLibrary: ExerciseLibraryItem[] = [],
  availableEquipment: Equipment[] = []
): Promise<any> => {
  const provider = resolveEffectiveProvider(user);
  const req = {
    anonUser: buildAnonymizedAIContext(user),
    dailyForm: lastDaily,
    locationLabel: locationName,
    sessionType,
    durationMinutes: duration,
    exerciseLibrary,
    availableEquipment
  };
  try {
    return await provider.generateFlashSession(req);
  } catch (err) {
    console.warn(`[SmartMonit AI] Fallback local après échec ${provider.id}:`, err);
    return getFallbackProvider().generateFlashSession(req);
  }
};

export const generateFullProgram = async (
  user: UserProfile,
  goal: string,
  sessionsPerWeek: number,
  weeks: number,
  allowedLocations: string[] = []
): Promise<any> => {
  const provider = resolveEffectiveProvider(user);
  const req = {
    anonUser: buildAnonymizedAIContext(user),
    goal,
    sessionsPerWeek,
    weeks,
    allowedLocations
  };
  try {
    return await provider.generateFullProgram(req);
  } catch (err) {
    console.warn(`[SmartMonit AI] Fallback local après échec ${provider.id}:`, err);
    return getFallbackProvider().generateFullProgram(req);
  }
};

export const suggestSessionModifications = async (
  session: any,
  user: UserProfile,
  lastDaily: DailyForm
): Promise<any> => {
  const provider = resolveEffectiveProvider(user);
  const req = {
    anonUser: buildAnonymizedAIContext(user),
    dailyForm: lastDaily,
    session
  };
  try {
    return await provider.suggestSessionModifications(req);
  } catch (err) {
    console.warn(`[SmartMonit AI] Fallback local après échec ${provider.id}:`, err);
    return getFallbackProvider().suggestSessionModifications(req);
  }
};

export const parseTrainingFile = async (base64Data: string, mimeType: string): Promise<any> => {
  const provider = resolveEffectiveProvider();
  try {
    return await provider.parseTrainingFile(base64Data, mimeType);
  } catch (err) {
    console.warn(`[SmartMonit AI] Fallback local sur parseTrainingFile (${provider.id}):`, err);
    return getFallbackProvider().parseTrainingFile(base64Data, mimeType);
  }
};

export const parsePlanningFile = async (base64Data: string, mimeType: string): Promise<any> => {
  const provider = resolveEffectiveProvider();
  try {
    return await provider.parsePlanningFile(base64Data, mimeType);
  } catch (err) {
    console.warn(`[SmartMonit AI] Fallback local sur parsePlanningFile (${provider.id}):`, err);
    return getFallbackProvider().parsePlanningFile(base64Data, mimeType);
  }
};

export const getRegulatoryInfo = async (itemName: string, itemType: string): Promise<string> => {
  const localRef = buildLocalRegulatoryReference(itemName, itemType);
  const provider = resolveEffectiveProvider();
  try {
    return await provider.getRegulatoryInfo(itemName, itemType, localRef);
  } catch {
    return localRef;
  }
};

export const chatWithCoach = async (
  history: { role: 'user' | 'assistant'; content: string }[],
  message: string,
  user?: UserProfile
): Promise<string> => {
  const provider = resolveEffectiveProvider(user);
  try {
    return await provider.chatWithCoach(history, message);
  } catch {
    return getFallbackProvider().chatWithCoach(history, message);
  }
};
