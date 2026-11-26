import { UserProfile } from '../../types';
import { calculateVMA, estimate1RMFromBodyweight, JOB_PROFILES_DB } from '../../utils/biometrics';
import { AnonymizedUserContext } from './types';

/**
 * Construit un contexte biométrique strictement pseudonymisé avant tout appel IA.
 * Supprime toute donnée identifiante (NID, nom, prénom, base, unité, historique complet).
 */
export const buildAnonymizedAIContext = (user: UserProfile): AnonymizedUserContext => {
  const vmaKmH = calculateVMA(user.tests);
  const rmUpperKg =
    user.tests.benchPress1RM ||
    estimate1RMFromBodyweight(user.tests.pushups || 20, user.gender);
  const rmLowerKg = user.tests.squat1RM || Math.round(rmUpperKg * 1.25);
  const jobDirective = JOB_PROFILES_DB[user.jobType]?.aiPromptDirective || '';

  return {
    gender: user.gender,
    jobType: user.jobType,
    jobDirective,
    workSchedule: user.workSchedule,
    vmaKmH,
    rmUpperKg,
    rmLowerKg,
    pushups: user.tests.pushups,
    pullups: user.tests.maxPullups || user.tests.pullups,
    run10kmTime: user.tests.run10kmTime,
    runSemiMarathonTime: user.tests.runSemiMarathonTime,
    run20kmTime: user.tests.run20kmTime,
    ccpmInaptitude: user.tests.ccpmInaptitude
  };
};
