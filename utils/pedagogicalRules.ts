import {
  Equipment,
  ExerciseLibraryItem,
  FormulaSystemConfig,
  JobType,
  MovementPattern,
  PedagogicalAlert,
  ProgramCycle,
  ProgramExercise,
  ProgramSessionBuilder
} from '../types';
import { DEFAULT_FORMULA_CONFIG, ensureSessionBlocks } from './calculationEngine';

export interface WeeklyAnalyticsPoint {
  weekLabel: string;
  weekNumber: number;
  totalSets: number;
  estimatedTonnageKg: number;
  runningKm: number;
  estimatedMinutes: number;
  avgIntensityScore: number; // 0-100
  isDeload: boolean;
}

export interface ProgramAnalytics {
  totalSessions: number;
  totalEstimatedMinutes: number;
  avgSessionMinutes: number;
  estimatedTonnageKg: number;
  totalRunningKm: number;
  totalSets: number;
  trainingLoadSRPE: number;
  energyDistribution: {
    force: number;
    aerobie: number;
    anaerobie: number;
    mobilite: number;
  };
  muscleHeat: Record<string, number>; // 0..100 par groupe musculaire normalisé
  weeklySeries: WeeklyAnalyticsPoint[];
}

const inferPattern = (ex: ProgramExercise, libMap: Map<string, ExerciseLibraryItem>): MovementPattern => {
  const lib = libMap.get(ex.libraryId) || libMap.get(ex.name.toLowerCase());
  if (lib?.movementPattern) return lib.movementPattern;
  const s = ex.name.toLowerCase();
  if (/(course|vma|fractionn|footing|seuil|rameur|bike|velo|vélo|elliptique|natation|crawl|brasse|corde)/.test(s)) return 'CARDIO';
  if (/(mobilit|étirement|etirement|pilates|psoas|thoracique|respiration|mermaid|spine)/.test(s)) return 'MOBILITY';
  if (/(farmer|marche charg|port de charge|franchissement)/.test(s)) return 'CARRY';
  if (/(gainage|planche|plank|pallof|abdo|sit-up|crunch|hollow|bird-dog|hundred|teaser)/.test(s)) return 'CORE';
  if (/(traction|pull-up|tirage vertical|skierg)/.test(s)) return 'PULL_V';
  if (/(rowing|tirage horizontal|australienne|face pull|oiseau)/.test(s)) return 'PULL_H';
  if (/(militaire|overhead|handstand|hspu|élévation|elevation)/.test(s)) return 'PUSH_V';
  if (/(développé|developpe|bench|pompe|push-up|dips|écarté|ecarte|chest press|triceps)/.test(s)) return 'PUSH_H';
  if (/(soulevé|souleve|deadlift|roumain|hip thrust|pont fessier|leg curl|kettlebell swing|superman)/.test(s)) return 'HIP_DOM';
  if (/(squat|fente|lunge|presse|leg ext|box jump|step-up|chaise|mollet)/.test(s)) return 'KNEE_DOM';
  return 'CORE';
};

const normalizeMuscleBucket = (rawMuscle: string): string => {
  const m = rawMuscle.toLowerCase();
  if (m.includes('pec')) return 'Pectoraux';
  if (m.includes('dos') || m.includes('dorsal') || m.includes('rhombo')) return 'Dos';
  if (m.includes('épaule') || m.includes('epaule') || m.includes('delto') || m.includes('cervic')) return 'Épaules';
  if (m.includes('bras') || m.includes('bicep') || m.includes('tricep')) return 'Bras';
  if (m.includes('abdo') || m.includes('core') || m.includes('gainage') || m.includes('oblique') || m.includes('transverse')) return 'Abdos / Core';
  if (m.includes('fess') || m.includes('chaîne post') || m.includes('ischio')) return 'Fessiers / Ischios';
  if (m.includes('jambe') || m.includes('quadri') || m.includes('mollet')) return 'Quadriceps / Mollets';
  if (m.includes('cardio') || m.includes('full')) return 'Cardio / Full Body';
  return 'Abdos / Core';
};

const estimateExerciseIntensity = (ex: ProgramExercise): number => {
  if (ex.percent1RM) return ex.percent1RM;
  if (ex.percentVMA) return Math.min(100, ex.percentVMA);
  if (ex.rpe) return ex.rpe * 10;
  if (ex.mode === 'MOBILITY') return 35;
  if (ex.mode === 'LOADED_MARCH') return 75;
  return 68;
};

/**
 * Calcule en temps réel les métriques analytiques complètes du programme (HUD éditeur).
 */
export const computeProgramAnalytics = (
  structure: ProgramCycle[],
  exerciseLibrary: ExerciseLibraryItem[]
): ProgramAnalytics => {
  const libMap = new Map<string, ExerciseLibraryItem>();
  exerciseLibrary.forEach((e) => {
    libMap.set(e.id, e);
    libMap.set(e.name.toLowerCase(), e);
  });

  let totalSessions = 0;
  let totalEstimatedMinutes = 0;
  let estimatedTonnageKg = 0;
  let totalRunningKm = 0;
  let totalSets = 0;
  let trainingLoadSRPE = 0;

  let energyForce = 0;
  let energyAerobie = 0;
  let energyAnaerobie = 0;
  let energyMobilite = 0;

  const rawMuscleScores: Record<string, number> = {};
  const weeklySeries: WeeklyAnalyticsPoint[] = [];

  structure.forEach((cycle, cIdx) => {
    cycle.weeks.forEach((week) => {
      let wSets = 0;
      let wTonnage = 0;
      let wKm = 0;
      let wMin = 0;
      let wIntSum = 0;
      let wIntCount = 0;

      week.sessions.forEach((sess) => {
        totalSessions += 1;
        const blocks = ensureSessionBlocks(sess);
        let sessMin = 0;

        blocks.forEach((blk) => {
          const rounds = Math.max(1, blk.rounds || 1);
          blk.exercises.forEach((ex) => {
            if (ex.isRecovery) return;
            const sets = (ex.sets || 3) * rounds;
            const repsNum = parseInt((ex.reps || '8').match(/\d+/)?.[0] || '8', 10);
            const pattern = inferPattern(ex, libMap);
            const intensity = estimateExerciseIntensity(ex);
            wIntSum += intensity;
            wIntCount += 1;

            if (blk.type !== 'WARMUP' && blk.type !== 'COOLDOWN') {
              wSets += sets;
              totalSets += sets;
            }

            // Estimation durée
            if (ex.durationSeconds) {
              sessMin += (ex.durationSeconds * sets) / 60 + ((ex.restSec || 45) * sets) / 60;
            } else if (ex.holdSec) {
              sessMin += (ex.holdSec * sets * (ex.bilateral ? 2 : 1)) / 60 + 0.5 * sets;
            } else if (ex.targetTimeSec) {
              sessMin += ex.targetTimeSec / 60;
            } else {
              sessMin += sets * (0.7 + (ex.restSec || 90) / 60);
            }

            // Kilométrage
            if (ex.distanceMeters) {
              const km = (ex.distanceMeters * sets) / 1000;
              wKm += km;
              totalRunningKm += km;
            }

            // Tonnage estimé (référence 70kg pour %1RM si pas de charge fixe)
            if (ex.loadKg) {
              const ton = ex.loadKg * repsNum * sets;
              wTonnage += ton;
              estimatedTonnageKg += ton;
            } else if (ex.percent1RM) {
              const refBase = pattern === 'KNEE_DOM' || pattern === 'HIP_DOM' ? 95 : 70;
              const ton = Math.round(refBase * (ex.percent1RM / 100)) * repsNum * sets;
              wTonnage += ton;
              estimatedTonnageKg += ton;
            }

            // Filières énergétiques
            if (blk.type === 'WARMUP' || blk.type === 'COOLDOWN' || pattern === 'MOBILITY') {
              energyMobilite += sets;
            } else if (pattern === 'CARDIO') {
              if ((ex.percentVMA && ex.percentVMA >= 90) || blk.type === 'TABATA' || blk.type === 'HIIT' as any) {
                energyAnaerobie += sets * 1.5;
              } else {
                energyAerobie += sets * 2;
              }
            } else if (['EMOM', 'AMRAP', 'TABATA', 'FOR_TIME', 'CIRCUIT'].includes(blk.type)) {
              energyAnaerobie += sets;
              energyForce += sets * 0.5;
            } else {
              energyForce += sets;
            }

            // Carte musculaire
            const lib = libMap.get(ex.libraryId) || libMap.get(ex.name.toLowerCase());
            const primary = normalizeMuscleBucket(ex.muscleGroup || lib?.muscleGroup || pattern);
            rawMuscleScores[primary] = (rawMuscleScores[primary] || 0) + sets * 2;
            (lib?.secondaryMuscles || []).forEach((sm) => {
              const bucket = normalizeMuscleBucket(sm);
              rawMuscleScores[bucket] = (rawMuscleScores[bucket] || 0) + sets;
            });
          });
        });

        const finalSessMin = sess.estimatedDurationMin || Math.max(15, Math.round(sessMin));
        wMin += finalSessMin;
        totalEstimatedMinutes += finalSessMin;
        const rpeEst = sess.intensity === 'MAX' ? 9 : sess.intensity === 'HIGH' ? 8 : sess.intensity === 'LOW' ? 4 : 6;
        trainingLoadSRPE += finalSessMin * rpeEst;
      });

      const isDeload = Boolean(
        week.isDeload ||
          week.number % 4 === 0 ||
          (week.objective || '').toLowerCase().includes('décharge') ||
          (week.objective || '').toLowerCase().includes('deload')
      );

      weeklySeries.push({
        weekLabel: structure.length > 1 ? `P${cIdx + 1}-S${week.number}` : `Sem ${week.number}`,
        weekNumber: week.number,
        totalSets: Math.round(wSets),
        estimatedTonnageKg: Math.round(wTonnage),
        runningKm: Number(wKm.toFixed(1)),
        estimatedMinutes: Math.round(wMin),
        avgIntensityScore: wIntCount > 0 ? Math.round(wIntSum / wIntCount) : 0,
        isDeload
      });
    });
  });

  const energyTotal = Math.max(1, energyForce + energyAerobie + energyAnaerobie + energyMobilite);
  const maxMuscle = Math.max(1, ...Object.values(rawMuscleScores));
  const muscleHeat: Record<string, number> = {};
  Object.entries(rawMuscleScores).forEach(([k, v]) => {
    muscleHeat[k] = Math.round((v / maxMuscle) * 100);
  });

  return {
    totalSessions,
    totalEstimatedMinutes: Math.round(totalEstimatedMinutes),
    avgSessionMinutes: totalSessions > 0 ? Math.round(totalEstimatedMinutes / totalSessions) : 0,
    estimatedTonnageKg: Math.round(estimatedTonnageKg),
    totalRunningKm: Number(totalRunningKm.toFixed(1)),
    totalSets: Math.round(totalSets),
    trainingLoadSRPE: Math.round(trainingLoadSRPE),
    energyDistribution: {
      force: Math.round((energyForce / energyTotal) * 100),
      aerobie: Math.round((energyAerobie / energyTotal) * 100),
      anaerobie: Math.round((energyAnaerobie / energyTotal) * 100),
      mobilite: Math.round((energyMobilite / energyTotal) * 100)
    },
    muscleHeat,
    weeklySeries
  };
};

// ============================================================================
// ALERTES PÉDAGOGIQUES PIA 7.1.1 (NON BLOQUANTES)
// ============================================================================

export const analyzeProgramPedagogy = (params: {
  structure: ProgramCycle[];
  exerciseLibrary: ExerciseLibraryItem[];
  targetJobProfiles?: JobType[];
  availableEquipment?: Equipment[];
  config?: FormulaSystemConfig;
}): PedagogicalAlert[] => {
  const { structure, exerciseLibrary, targetJobProfiles = [], availableEquipment } = params;
  const cfg = params.config || DEFAULT_FORMULA_CONFIG;
  const alerts: PedagogicalAlert[] = [];

  const libMap = new Map<string, ExerciseLibraryItem>();
  exerciseLibrary.forEach((e) => {
    libMap.set(e.id, e);
    libMap.set(e.name.toLowerCase(), e);
  });

  const analytics = computeProgramAnalytics(structure, exerciseLibrary);

  // 1. PIA-01 : Structure ternaire obligatoire (Échauffement + Retour au calme)
  structure.forEach((cycle) => {
    cycle.weeks.forEach((week) => {
      let pushSets = 0;
      let pullSets = 0;
      let consecutiveHigh = 0;

      const sortedSessions = [...week.sessions].sort((a, b) => (a.dayOfWeek || 0) - (b.dayOfWeek || 0));

      sortedSessions.forEach((sess) => {
        const blocks = ensureSessionBlocks(sess);
        const hasWarmup = blocks.some((b) => b.type === 'WARMUP' && (b.exercises.length > 0 || Boolean(b.notes)));
        const hasCooldown = blocks.some((b) => b.type === 'COOLDOWN' && (b.exercises.length > 0 || Boolean(b.notes)));
        const hasCoreEx = blocks.some((b) => b.type !== 'WARMUP' && b.type !== 'COOLDOWN' && b.exercises.length > 0);

        if (hasCoreEx && !hasWarmup) {
          alerts.push({
            id: `pia01_w_${sess.id}`,
            code: 'PIA-01',
            severity: 'warning',
            title: `Échauffement manquant : ${sess.title}`,
            message: `La séance « ${sess.title} » (Semaine ${week.number}) ne comporte pas de bloc d'échauffement structuré.`,
            ruleReference: 'PIA 7.1.1 — Structure ternaire obligatoire de séance (Échauffement / Corps / Retour au calme)',
            targetWeek: week.number,
            targetSessionId: sess.id,
            suggestedActionLabel: 'Ajouter Échauffement',
            suggestedActionType: 'ADD_WARMUP'
          });
        }

        if (hasCoreEx && !hasCooldown) {
          alerts.push({
            id: `pia01_c_${sess.id}`,
            code: 'PIA-01',
            severity: 'info',
            title: `Retour au calme manquant : ${sess.title}`,
            message: `Pensez à inclure un retour au calme (mobilité/respiration) en fin de séance « ${sess.title} ».`,
            ruleReference: 'PIA 7.1.1 — Structure ternaire obligatoire de séance (Récupération post-effort)',
            targetWeek: week.number,
            targetSessionId: sess.id,
            suggestedActionLabel: 'Ajouter Retour au calme',
            suggestedActionType: 'ADD_COOLDOWN'
          });
        }

        // Détection intensité élevée
        const isHighSess =
          sess.intensity === 'HIGH' ||
          sess.intensity === 'MAX' ||
          blocks.some((b) =>
            b.exercises.some((ex) => (ex.percent1RM && ex.percent1RM >= 85) || (ex.percentVMA && ex.percentVMA >= 92) || (ex.rpe && ex.rpe >= 8))
          );

        if (isHighSess) {
          consecutiveHigh += 1;
          if (consecutiveHigh > cfg.piaRules.maxConsecutiveHighIntensityDays) {
            alerts.push({
              id: `pia04_${week.id}_${sess.id}`,
              code: 'PIA-04',
              severity: 'warning',
              title: `Intensités élevées consécutives (Semaine ${week.number})`,
              message: `${consecutiveHigh} séances à haute intensité s'enchaînent sans séance de récupération ou d'endurance fondamentale intercalée.`,
              ruleReference: 'PIA 7.1.1 — Principe d\'alternance des charges et prévention du surentraînement',
              targetWeek: week.number,
              targetSessionId: sess.id
            });
          }
        } else {
          consecutiveHigh = 0;
        }

        // Comptage agonistes / antagonistes & compatibilité métier
        blocks.forEach((b) => {
          b.exercises.forEach((ex) => {
            const pattern = inferPattern(ex, libMap);
            const sCount = ex.sets || 3;
            if (pattern === 'PUSH_H' || pattern === 'PUSH_V') pushSets += sCount;
            if (pattern === 'PULL_H' || pattern === 'PULL_V') pullSets += sCount;

            // Compatibilité profil PN (Personnel Navigant)
            if (
              targetJobProfiles.includes(JobType.PN) &&
              ex.percent1RM &&
              ex.percent1RM >= 88 &&
              /(squat arri|soulev|militaire)/.test(ex.name.toLowerCase())
            ) {
              alerts.push({
                id: `pia06_pn_${ex.id}`,
                code: 'PIA-06',
                severity: 'warning',
                title: `Compression axiale forte pour profil PN (${ex.name})`,
                message: `Charge ≥ ${ex.percent1RM}% 1RM sur ${ex.name} : à éviter en période de vols / post-vol chez les navigants (facteurs G).`,
                ruleReference: 'PIA 7.1.1 — Spécificité PPS Personnel Navigant (protection rachis cervical & lombaire)',
                targetWeek: week.number,
                targetSessionId: sess.id
              });
            }
          });
        });
      });

      // PIA-05 : Équilibre Poussée / Tirage
      if (pushSets >= 6 && pullSets > 0 && pushSets / pullSets > 1.8) {
        alerts.push({
          id: `pia05_push_${week.id}`,
          code: 'PIA-05',
          severity: 'warning',
          title: `Déséquilibre Poussée / Tirage (Semaine ${week.number})`,
          message: `Ratio Poussée (${pushSets} séries) vs Tirage (${pullSets} séries) trop élevé : ajoutez du rowing, tirage ou Face Pull pour protéger la coiffe des rotateurs.`,
          ruleReference: 'PIA 7.1.1 — Équilibre agonistes / antagonistes et prévention TMS épaules',
          targetWeek: week.number
        });
      } else if (pushSets >= 8 && pullSets === 0) {
        alerts.push({
          id: `pia05_nopull_${week.id}`,
          code: 'PIA-05',
          severity: 'warning',
          title: `Aucun exercice de tirage dorsal (Semaine ${week.number})`,
          message: `${pushSets} séries de poussée programmées sans aucun tirage antagoniste cette semaine.`,
          ruleReference: 'PIA 7.1.1 — Équilibre agonistes / antagonistes',
          targetWeek: week.number
        });
      }
    });
  });

  // 2. PIA-02 : Progressivité de charge / volume inter-semaines
  for (let i = 1; i < analytics.weeklySeries.length; i++) {
    const prev = analytics.weeklySeries[i - 1];
    const curr = analytics.weeklySeries[i];
    if (prev.isDeload || prev.totalSets === 0) continue;

    const setsIncreasePct = ((curr.totalSets - prev.totalSets) / prev.totalSets) * 100;
    const kmIncreasePct = prev.runningKm > 1 ? ((curr.runningKm - prev.runningKm) / prev.runningKm) * 100 : 0;

    if (setsIncreasePct > cfg.piaRules.maxWeeklyVolumeIncreasePct) {
      alerts.push({
        id: `pia02_sets_${i}`,
        code: 'PIA-02',
        severity: 'danger',
        title: `Progression de volume excessive (${prev.weekLabel} → ${curr.weekLabel})`,
        message: `Le volume augmente de +${Math.round(setsIncreasePct)}% (${prev.totalSets} → ${curr.totalSets} séries), au-delà du seuil recommandé de +${cfg.piaRules.maxWeeklyVolumeIncreasePct}%.`,
        ruleReference: `PIA 7.1.1 — Principe de progressivité (augmentation max +${cfg.piaRules.maxWeeklyVolumeIncreasePct}% / semaine)`,
        targetWeek: curr.weekNumber
      });
    } else if (kmIncreasePct > cfg.piaRules.maxWeeklyVolumeIncreasePct + 5) {
      alerts.push({
        id: `pia02_km_${i}`,
        code: 'PIA-02',
        severity: 'warning',
        title: `Hausse brutale du kilométrage course (${prev.weekLabel} → ${curr.weekLabel})`,
        message: `Le volume de course passe de ${prev.runningKm} km à ${curr.runningKm} km (+${Math.round(kmIncreasePct)}%).`,
        ruleReference: 'PIA 7.1.1 — Progressivité aérobie et prévention périostites/tendinopathies',
        targetWeek: curr.weekNumber
      });
    }
  }

  // 3. PIA-03 : Absence de semaine de décharge sur un cycle >= 4 semaines
  if (analytics.weeklySeries.length >= cfg.piaRules.deloadCycleWeeks) {
    const hasDeload = analytics.weeklySeries.some((w) => w.isDeload);
    if (!hasDeload) {
      alerts.push({
        id: 'pia03_nodeload',
        code: 'PIA-03',
        severity: 'warning',
        title: 'Aucune semaine de décharge planifiée',
        message: `Votre programme s'étend sur ${analytics.weeklySeries.length} semaines sans semaine de récupération/décharge (-30 à -40% volume).`,
        ruleReference: `PIA 7.1.1 — Règle d'alternance 3:1 (1 semaine de décharge toutes les ${cfg.piaRules.deloadCycleWeeks} semaines)`,
        suggestedActionLabel: 'Marquer S4 en Décharge',
        suggestedActionType: 'MARK_DELOAD'
      });
    }
  }

  // 4. PIA-07 : Vérification inventaire matériel si fourni
  if (availableEquipment && availableEquipment.length > 0) {
    const okNames = availableEquipment
      .filter((e) => e.status === 'Operational')
      .map((e) => `${e.name} ${e.category}`.toLowerCase());

    const missingEquipExercises = new Set<string>();
    structure.forEach((c) =>
      c.weeks.forEach((w) =>
        w.sessions.forEach((s) => {
          ensureSessionBlocks(s).forEach((b) =>
            b.exercises.forEach((ex) => {
              const eq = (ex.equipment || libMap.get(ex.libraryId)?.equipment || '').toLowerCase();
              if (
                !eq ||
                eq === 'pdc' ||
                eq === 'tapis' ||
                eq.includes('poids du corps') ||
                eq.includes('élastiques') ||
                eq.includes('course / ext') ||
                eq.includes('piste') ||
                eq.includes('ext')
              ) {
                return;
              }
              const found = okNames.some(
                (n) =>
                  n.includes(eq) ||
                  (eq.includes('barre') && (n.includes('rack') || n.includes('muscu') || n.includes('barre'))) ||
                  (eq.includes('halt') && n.includes('muscu')) ||
                  (eq.includes('poulie') && n.includes('muscu')) ||
                  (eq.includes('cardio') && (n.includes('cardio') || n.includes('vélo') || n.includes('rameur')))
              );
              if (!found) missingEquipExercises.add(`${ex.name} (${eq})`);
            })
          );
        })
      )
    );

    if (missingEquipExercises.size > 0) {
      alerts.push({
        id: 'pia07_equip',
        code: 'PIA-07',
        severity: 'info',
        title: `Matériel à vérifier dans l'inventaire (${missingEquipExercises.size})`,
        message: `Non détecté comme opérationnel dans l'inventaire du site : ${Array.from(missingEquipExercises).slice(0, 3).join(', ')}. Des substitutions sont proposées dans l'éditeur.`,
        ruleReference: 'Cohérence Installation / Inventaire Matériel EPMS',
        suggestedActionLabel: 'Vérifier les substitutions',
        suggestedActionType: 'INSPECT_EQUIPMENT'
      });
    }
  }

  return alerts;
};

/**
 * Vérifie la faisabilité d'une séance dans une installation donnée et propose des substitutions validées.
 */
export const checkSessionEquipmentCompatibility = (
  session: ProgramSessionBuilder,
  infraEquipment: Equipment[],
  exerciseLibrary: ExerciseLibraryItem[]
): {
  compatible: boolean;
  missingItems: Array<{
    exerciseId: string;
    exerciseName: string;
    requiredEquipment: string;
    suggestedSubstitutes: ExerciseLibraryItem[];
  }>;
} => {
  const libById = new Map(exerciseLibrary.map((e) => [e.id, e]));
  const libByName = new Map(exerciseLibrary.map((e) => [e.name.toLowerCase(), e]));
  const operationalTokens = infraEquipment
    .filter((e) => e.status === 'Operational')
    .map((e) => `${e.name} ${e.category}`.toLowerCase());

  const missingItems: Array<{
    exerciseId: string;
    exerciseName: string;
    requiredEquipment: string;
    suggestedSubstitutes: ExerciseLibraryItem[];
  }> = [];

  ensureSessionBlocks(session).forEach((blk) => {
    blk.exercises.forEach((ex) => {
      const lib = libById.get(ex.libraryId) || libByName.get(ex.name.toLowerCase());
      const reqEq = ex.equipment || lib?.equipment || 'Poids du corps / Tapis';
      const eqLower = reqEq.toLowerCase();
      if (
        [
          'pdc',
          'tapis',
          'poids du corps / tapis',
          'élastiques',
          'course / extérieur',
          'piste',
          'extérieur',
          'piste / extérieur',
          'piste athlétisme',
          'extérieur / parcours'
        ].includes(eqLower)
      ) {
        return;
      }

      const available =
        operationalTokens.length === 0 ||
        operationalTokens.some(
          (tok) =>
            tok.includes(eqLower) ||
            (eqLower.includes('barre') && (tok.includes('barre') || tok.includes('rack') || tok.includes('banc') || tok.includes('musculation'))) ||
            (eqLower.includes('halt') && (tok.includes('halt') || tok.includes('musculation'))) ||
            (eqLower.includes('poulie') && (tok.includes('poulie') || tok.includes('musculation'))) ||
            (eqLower.includes('machine guidée') && tok.includes('musculation')) ||
            (eqLower.includes('machine cardio') && (tok.includes('cardio') || tok.includes('rameur') || tok.includes('vélo'))) ||
            (eqLower.includes('rameur') && tok.includes('rameur')) ||
            (eqLower.includes('vélo') && (tok.includes('vélo') || tok.includes('bike')))
        );

      if (!available) {
        const subNames = lib?.substitutes || [];
        const byNameSubs = subNames
          .map((sn) => libByName.get(sn.toLowerCase()))
          .filter(Boolean) as ExerciseLibraryItem[];
        const fallbackPdc = exerciseLibrary
          .filter(
            (candidate) =>
              candidate.id !== lib?.id &&
              candidate.muscleGroup === (lib?.muscleGroup || ex.muscleGroup) &&
              ['PDC', 'Tapis'].includes(candidate.equipment)
          )
          .slice(0, 3);

        missingItems.push({
          exerciseId: ex.id,
          exerciseName: ex.name,
          requiredEquipment: reqEq,
          suggestedSubstitutes: byNameSubs.length > 0 ? byNameSubs : fallbackPdc
        });
      }
    });
  });

  return { compatible: missingItems.length === 0, missingItems };
};
