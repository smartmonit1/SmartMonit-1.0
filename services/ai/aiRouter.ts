import { AIProviderId, UserProfile } from '../../types';
import { IAIProvider } from './types';
import { MistralProvider } from './providers/mistralProvider';
import { AlgorithmicProvider } from './providers/algorithmicProvider';

const PROVIDER_STORAGE_KEY = 'sm_ai_provider_preference';

const providers: Record<AIProviderId, IAIProvider> = {
  algorithmic: new AlgorithmicProvider(),
  mistral: new MistralProvider()
};

/** Sélectionne le moteur local par défaut ou le fournisseur externe explicitement configuré. */
export const getPreferredAIProvider = (): AIProviderId => {
  const stored = localStorage.getItem(PROVIDER_STORAGE_KEY) as string | null;
  if (stored && stored in providers) {
    return stored as AIProviderId;
  }
  // Nettoyage d'une éventuelle ancienne préférence 'gemini'
  if (stored && !(stored in providers)) {
    localStorage.removeItem(PROVIDER_STORAGE_KEY);
  }

  const envPref = (process.env.AI_PROVIDER || '').toLowerCase();
  if (envPref && envPref in providers) {
    return envPref as AIProviderId;
  }

  return 'algorithmic';
};

export const setPreferredAIProvider = (providerId: AIProviderId) => {
  if (providers[providerId]) {
    localStorage.setItem(PROVIDER_STORAGE_KEY, providerId);
    window.dispatchEvent(new Event('ai_provider_changed'));
  }
};

export const listAIProvidersStatus = () => {
  const active = getPreferredAIProvider();
  return (['algorithmic', 'mistral'] as AIProviderId[]).map((id) => ({
    id,
    label: providers[id].label,
    configured: providers[id].isConfigured(),
    active: active === id,
    sovereigntyNote: providers[id].sovereigntyNote
  }));
};

export const resolveEffectiveProvider = (user?: UserProfile): IAIProvider => {
  // Respect strict du droit d'opposition IA RGPD (Art. 21)
  if (user && user.rgpdConsent && user.rgpdConsent.aiProcessingConsent === false) {
    return providers.algorithmic;
  }

  const preferred = getPreferredAIProvider();
  if (providers[preferred].isConfigured()) {
    return providers[preferred];
  }

  return providers.algorithmic;
};

export const getFallbackProvider = (): IAIProvider => providers.algorithmic;
