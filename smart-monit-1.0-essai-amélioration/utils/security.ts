import { UserProfile } from '../types';

export const RGPD_POLICY_VERSION = '2026.1-CNIL-AAE';
export const CNIL_K_ANONYMITY_THRESHOLD = 5;
export const SESSION_INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes (Recommandation CNIL / Défense)

export const RETENTION_DAYS = {
  DAILY_FORMS: 365,          // 12 mois glissants (données forme/santé)
  NOTIFICATIONS_READ: 90,    // 3 mois
  AUDIT_LOGS: 365,           // 12 mois (recommandation CNIL journaux d'accès)
  SPORT_REGISTRY: 365 * 5,   // 5 ans (statut en service / accidents — Directive 17615)
  INSPECTION_LOGS: 365 * 5   // 5 ans (Registre de sécurité Art. R.322-25)
};

export const RGPD_INFORMATION_NOTICE = {
  controller: 'Ministère des Armées — Armée de l\'Air et de l\'Espace (DRH-AAE / Bureau EPMS)',
  dpo: 'Délégué à la Protection des Données (DPD) du Ministère des Armées — dpd@intradef.gouv.fr',
  purposes: [
    'Gestion des activités physiques militaires et sportives (APMS), inscriptions et sécurité des installations (Code du Sport Art. L.322-2, R.322-25).',
    'Suivi individuel et continuité de la préparation physique opérationnelle (PPO — PIA 7.1.1) tout au long de la carrière via le NID.',
    'Tenue du Registre Sport Unité numérique justifiant le statut « en service » (Directive ministérielle n°17615).',
    'Pilotage statistique strictement agrégé et anonymisé (seuil de k-anonymat CNIL ≥ 5) au profit du commandement.'
  ],
  legalBasis: [
    'Mission d\'intérêt public et obligation statutaire (Art. 6.1.e RGPD, Code de la Défense Art. L.4111-1).',
    'Consentement explicite pour les auto-évaluations quotidiennes de forme, fatigue, stress et douleurs (Art. 9.2.a RGPD).'
  ],
  retention: [
    'Bilans de forme quotidiens : purge automatique après 12 mois glissants.',
    'Journaux d\'accès et d\'audit de sécurité : 12 mois (recommandation CNIL).',
    'Registre Sport Unité & Registre de Sécurité des installations : 5 ans (obligations légales et traçabilité accident en service).',
    'Profil d\'entraînement : durée d\'activité au sein des armées, effaçable à tout moment sur exercice du droit à l\'effacement.'
  ],
  aiPrivacy:
    'En phase de test, l\'application fonctionne exclusivement via son moteur expert local (aucune donnée transmise sur un cloud externe). Lors du passage futur à Mistral AI souverain (AMIAD), aucune donnée directement identifiante (ni NID, ni nom, ni prénom, ni unité) ne sera transmise : seules des métriques pseudonymisées sont utilisées, et vous pouvez désactiver l\'IA externe à tout moment (Art. 21 RGPD).'
};

// --- HACHAGE CRYPTOGRAPHIQUE PBKDF2-SHA256 (Web Crypto API) ---

const toHex = (buffer: ArrayBuffer | Uint8Array): string => {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

const fromHex = (hex: string): Uint8Array => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
};

const PBKDF2_ITERATIONS = 100000;

export const hashPassword = async (plainPassword: string, existingSaltHex?: string): Promise<string> => {
  const salt = existingSaltHex
    ? fromHex(existingSaltHex)
    : crypto.getRandomValues(new Uint8Array(16));
  const saltHex = toHex(salt);

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(plainPassword),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt as BufferSource,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );
    return `pbkdf2$${PBKDF2_ITERATIONS}$${saltHex}$${toHex(derivedBits)}`;
  }

  // Fallback si contexte non-HTTPS hors localhost (hachage itératif salé déterministe)
  let acc = `${saltHex}:${plainPassword}`;
  for (let i = 0; i < 1000; i++) {
    let h = 2166136261;
    for (let j = 0; j < acc.length; j++) {
      h ^= acc.charCodeAt(j);
      h = Math.imul(h, 16777619);
    }
    acc = `${(h >>> 0).toString(16)}:${saltHex}`;
  }
  return `fallback$1000$${saltHex}$${acc.split(':')[0]}`;
};

const timingSafeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
};

export const verifyPassword = async (
  plainPassword: string,
  user: Pick<UserProfile, 'password' | 'passwordHash'>
): Promise<boolean> => {
  if (user.passwordHash) {
    const parts = user.passwordHash.split('$');
    if (parts.length === 4) {
      const saltHex = parts[2];
      const recomputed = await hashPassword(plainPassword, saltHex);
      return timingSafeEqual(recomputed, user.passwordHash);
    }
  }
  // Compatibilité migration transparente d'anciens comptes non encore migrés
  if (user.password) {
    return timingSafeEqual(plainPassword, user.password);
  }
  return false;
};

// --- POLITIQUE MOT DE PASSE CNIL (Recommandation 2022/2026) ---

export interface PasswordValidationResult {
  valid: boolean;
  score: number; // 0-5
  checks: {
    minLength: boolean;
    hasUpper: boolean;
    hasLower: boolean;
    hasDigit: boolean;
    hasSpecial: boolean;
  };
}

export const validateCnilPassword = (pwd: string): PasswordValidationResult => {
  const checks = {
    minLength: pwd.length >= 12,
    hasUpper: /[A-Z]/.test(pwd),
    hasLower: /[a-z]/.test(pwd),
    hasDigit: /\d/.test(pwd),
    hasSpecial: /[^A-Za-z0-9]/.test(pwd)
  };
  const score = Object.values(checks).filter(Boolean).length;
  return {
    valid: checks.minLength && checks.hasUpper && checks.hasLower && checks.hasDigit && checks.hasSpecial,
    score,
    checks
  };
};

// --- PROTECTION ANTI FORCE-BRUTE (Verrouillage 60s après 5 échecs) ---

const LOCKOUT_KEY = 'sm_auth_lockouts';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 1000;

interface LockoutRecord {
  attempts: number;
  lockedUntil?: number;
}

const getLockoutMap = (): Record<string, LockoutRecord> => {
  try {
    return JSON.parse(sessionStorage.getItem(LOCKOUT_KEY) || '{}');
  } catch {
    return {};
  }
};

const saveLockoutMap = (map: Record<string, LockoutRecord>) => {
  sessionStorage.setItem(LOCKOUT_KEY, JSON.stringify(map));
};

export const checkLoginLockout = (nid: string): { locked: boolean; remainingSeconds: number } => {
  const map = getLockoutMap();
  const rec = map[nid];
  if (rec?.lockedUntil && rec.lockedUntil > Date.now()) {
    return { locked: true, remainingSeconds: Math.ceil((rec.lockedUntil - Date.now()) / 1000) };
  }
  return { locked: false, remainingSeconds: 0 };
};

export const recordFailedLoginAttempt = (nid: string): { lockedNow: boolean; attemptsLeft: number } => {
  const map = getLockoutMap();
  const prev = map[nid] || { attempts: 0 };
  const attempts = prev.attempts + 1;
  if (attempts >= MAX_ATTEMPTS) {
    map[nid] = { attempts: 0, lockedUntil: Date.now() + LOCKOUT_DURATION_MS };
    saveLockoutMap(map);
    return { lockedNow: true, attemptsLeft: 0 };
  }
  map[nid] = { attempts };
  saveLockoutMap(map);
  return { lockedNow: false, attemptsLeft: MAX_ATTEMPTS - attempts };
};

export const clearLoginAttempts = (nid: string) => {
  const map = getLockoutMap();
  if (map[nid]) {
    delete map[nid];
    saveLockoutMap(map);
  }
};

// --- ASSAINISSEMENT DES DONNÉES ---

export const sanitizeText = (input: string): string => {
  return input.replace(/[<>]/g, '').trim();
};

export const stripSecretsFromUser = (user: UserProfile): UserProfile => {
  const clone = { ...user };
  delete clone.password;
  delete clone.passwordHash;
  return clone;
};
