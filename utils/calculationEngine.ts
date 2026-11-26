import {
  AdaptationBounds,
  CalculationTrace,
  DailyForm,
  FormulaSystemConfig,
  IndividualizedBlockResult,
  IndividualizedExerciseResult,
  IndividualizedProgramResult,
  IndividualizedSessionResult,
  MissingReferenceKind,
  PhysicalTests,
  Program,
  ProgramExercise,
  ProgramSessionBuilder,
  Session,
  SessionBlock,
  UserProfile
} from '../types';
import { analyzeDailyFormStructured, formatPaceFromSpeed } from './biometrics';

const FORMULA_STORAGE_KEY = 'sm_v4_formula_config';

/**
 * Paramètres système modifiables par un administrateur métier (Chef Cellule / Commandement).
 * Chaque formule embarque sa référence scientifique officielle.
 */
export const DEFAULT_FORMULA_CONFIG: FormulaSystemConfig = {
  id: 'default_pia_711',
  updatedAt: '2026-01-01T00:00:00.000Z',
  updatedBy: 'Doctrine PIA 7.1.1 — EPMS AAE',
  brzycki: {
    numerator: 36,
    denominatorBase: 37,
    maxValidReps: 10,
    reference: 'Brzycki M. (1993), Strength Testing — Predicting a One-Rep Max from Reps-to-Fatigue, JOPERD 64(1):88-90'
  },
  lucLeger: {
    baseSpeed: 8,
    stepPerStage: 0.5,
    vo2Slope: 5.857,
    vo2Intercept: 19.458,
    vo2Divisor: 3.5,
    reference: 'Léger L. & Lambert J. (1982), A maximal multistage 20-m shuttle run test to predict VO2max, Eur J Appl Physiol 49:1-12'
  },
  vameval: {
    baseSpeed: 8,
    stepPerStage: 0.5,
    reference: 'Cazorla G. & Léger L. (1993), Protocole progressif de terrain VAMEVAL (paliers 1 min, +0,5 km/h)'
  },
  performanceVmaFactors: {
    demiCooper: 1.0,
    run2400m: 0.95,
    run5km: 0.9,
    run10km: 0.85,
    runSemi: 0.8,
    run20km: 0.8,
    runMarathon: 0.7,
    reference: 'Mercier D. & Léger L. / Barème d\'équivalence VMA — Doctrine PIA 7.1.1 EPMS'
  },
  defaultWeightStepKg: 2.5,
  piaRules: {
    maxWeeklyVolumeIncreasePct: 15,
    maxConsecutiveHighIntensityDays: 2,
    deloadCycleWeeks: 4,
    reference: 'PIA 7.1.1 — Principes de progressivité, continuité et alternance des charges'
  }
};

export const getFormulaConfig = (): FormulaSystemConfig => {
  if (typeof localStorage === 'undefined') return DEFAULT_FORMULA_CONFIG;
  try {
    const raw = localStorage.getItem(FORMULA_STORAGE_KEY);
    if (!raw) return DEFAULT_FORMULA_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_FORMULA_CONFIG,
      ...parsed,
      brzycki: { ...DEFAULT_FORMULA_CONFIG.brzycki, ...(parsed.brzycki || {}) },
      lucLeger: { ...DEFAULT_FORMULA_CONFIG.lucLeger, ...(parsed.lucLeger || {}) },
      vameval: { ...DEFAULT_FORMULA_CONFIG.vameval, ...(parsed.vameval || {}) },
      performanceVmaFactors: {
        ...DEFAULT_FORMULA_CONFIG.performanceVmaFactors,
        ...(parsed.performanceVmaFactors || {})
      },
      piaRules: { ...DEFAULT_FORMULA_CONFIG.piaRules, ...(parsed.piaRules || {}) }
    };
  } catch {
    return DEFAULT_FORMULA_CONFIG;
  }
};

export const saveFormulaConfig = (config: FormulaSystemConfig): void => {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(FORMULA_STORAGE_KEY, JSON.stringify(config));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('formula_config_updated'));
  }
};

export const resetFormulaConfig = (): FormulaSystemConfig => {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(FORMULA_STORAGE_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('formula_config_updated'));
    }
  }
  return DEFAULT_FORMULA_CONFIG;
};

// ============================================================================
// 1. FORMULES DE CALCUL DÉTERMINISTES AVEC TRAÇABILITÉ
// ============================================================================

export const parseTimeToHours = (timeStr?: string): number => {
  if (!timeStr) return 0;
  const clean = timeStr.trim();
  const parts = clean.split(':').map(Number);
  if (parts.some((n) => Number.isNaN(n) || n < 0)) return 0;
  if (parts.length === 3) {
    return parts[0] + parts[1] / 60 + parts[2] / 3600;
  }
  if (parts.length === 2) {
    return parts[0] / 60 + parts[1] / 3600;
  }
  return 0;
};

export const formatDurationSec = (sec?: number): string => {
  if (!sec || sec <= 0) return '0s';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}`;
  if (m > 0 && s > 0) return `${m}'${String(s).padStart(2, '0')}"`;
  if (m > 0) return `${m} min`;
  return `${s}s`;
};

export interface BrzyckiResult {
  valueKg: number | null;
  valid: boolean;
  warning?: string;
  trace: CalculationTrace;
}

/**
 * Formule de Brzycki paramétrable : 1RM = charge × 36 / (37 - répétitions).
 * Strictement valable jusqu'à `maxValidReps` (10 reps par défaut).
 * Au-delà ou sans donnée : aucune valeur inventée, signalement clair + suggestion de test sous-maximal.
 */
export const computeBrzycki1RM = (
  weightKg?: number,
  reps?: number,
  config: FormulaSystemConfig = DEFAULT_FORMULA_CONFIG
): BrzyckiResult => {
  const { numerator, denominatorBase, maxValidReps, reference } = config.brzycki;

  if (!weightKg || weightKg <= 0 || !reps || reps <= 0) {
    return {
      valueKg: null,
      valid: false,
      warning: 'Données absentes (charge ou répétitions) — planifier un test sous-maximal avec un moniteur EPMS.',
      trace: {
        metric: '1RM',
        formulaName: 'Brzycki (données absentes)',
        scientificReference: reference,
        inputs: { weightKg: weightKg ?? 0, reps: reps ?? 0 },
        note: 'Calcul refusé : aucune valeur inventée.'
      }
    };
  }

  if (reps > maxValidReps) {
    return {
      valueKg: null,
      valid: false,
      warning: `Formule de Brzycki valable jusqu'à ${maxValidReps} répétitions (${reps} saisies) — planifier un test sous-maximal (3 à 8 RM) avec un moniteur EPMS.`,
      trace: {
        metric: '1RM',
        formulaName: 'Brzycki (hors domaine de validité)',
        scientificReference: reference,
        inputs: { weightKg, reps, maxValidReps },
        note: `Hors borne ≤ ${maxValidReps} répétitions.`
      }
    };
  }

  if (reps === 1) {
    const val = Number(weightKg.toFixed(1));
    return {
      valueKg: val,
      valid: true,
      trace: {
        metric: '1RM',
        formulaName: '1RM direct mesuré',
        scientificReference: reference,
        inputs: { weightKg, reps: 1 },
        rawValue: weightKg,
        finalValue: val
      }
    };
  }

  const raw = (weightKg * numerator) / (denominatorBase - reps);
  const finalValue = Number(raw.toFixed(1));
  return {
    valueKg: finalValue,
    valid: true,
    trace: {
      metric: '1RM',
      formulaName: `Brzycki : charge × ${numerator} / (${denominatorBase} - reps)`,
      scientificReference: reference,
      inputs: { weightKg, reps },
      rawValue: raw,
      finalValue
    }
  };
};

export interface VMAResult {
  vmaKmH: number | null;
  hasReference: boolean;
  source:
    | 'VAMEVAL'
    | 'LUC_LEGER'
    | 'DEMI_COOPER'
    | 'RUN_2400M'
    | 'RUN_5KM'
    | 'RUN_10KM'
    | 'RUN_SEMI'
    | 'RUN_20KM'
    | 'RUN_MARATHON'
    | 'MANUAL'
    | 'MISSING';
  warning?: string;
  trace: CalculationTrace;
}

/**
 * Calcul déterministe et traçable de la VMA selon l'ordre de priorité exact :
 * 1. VAMEVAL (8 + 0,5 × palier)
 * 2. Luc Léger (VN = 8 + 0,5 × palier ; VO2max = 5,857 × VN - 19,458 ; VMA = VO2max / 3,5)
 * 3. Performances connues : Demi-Cooper 100%, 2400m 95%, 5km 90%, 10km 85%, Semi/20km 80%, Marathon 70%
 * 4. VMA manuelle explicitement renseignée
 * Sans donnée : retourne `vmaKmH: null` + alerte explicite (jamais de valeur inventée).
 */
export const computeVMAWithTrace = (
  tests?: PhysicalTests,
  config: FormulaSystemConfig = DEFAULT_FORMULA_CONFIG
): VMAResult => {
  if (!tests) {
    return {
      vmaKmH: null,
      hasReference: false,
      source: 'MISSING',
      warning: 'Aucune référence VMA enregistrée — planifier un test VAMEVAL, Luc Léger ou 2400m avec un moniteur EPMS.',
      trace: {
        metric: 'VMA',
        formulaName: 'VMA absente',
        scientificReference: config.performanceVmaFactors.reference,
        inputs: {},
        note: 'Aucune donnée de test disponible.'
      }
    };
  }

  // 1. VAMEVAL
  if (tests.vamevalPalier && tests.vamevalPalier > 0) {
    const raw = config.vameval.baseSpeed + config.vameval.stepPerStage * tests.vamevalPalier;
    const vmaKmH = Number(raw.toFixed(2));
    return {
      vmaKmH,
      hasReference: true,
      source: 'VAMEVAL',
      trace: {
        metric: 'VMA',
        formulaName: `VAMEVAL : ${config.vameval.baseSpeed} + ${config.vameval.stepPerStage} × palier`,
        scientificReference: config.vameval.reference,
        inputs: { vamevalPalier: tests.vamevalPalier },
        rawValue: raw,
        finalValue: vmaKmH
      }
    };
  }

  // 2. Luc Léger
  if (tests.lucLegerPalier && tests.lucLegerPalier > 0) {
    const { baseSpeed, stepPerStage, vo2Slope, vo2Intercept, vo2Divisor, reference } = config.lucLeger;
    const vn = baseSpeed + stepPerStage * tests.lucLegerPalier;
    const vo2max = vo2Slope * vn - vo2Intercept;
    const raw = vo2max / vo2Divisor;
    const vmaKmH = Number(raw.toFixed(2));
    return {
      vmaKmH,
      hasReference: true,
      source: 'LUC_LEGER',
      trace: {
        metric: 'VMA',
        formulaName: `Luc Léger : VN=${vn.toFixed(1)} ; VO2max=${vo2max.toFixed(2)} ; VMA=VO2max/${vo2Divisor}`,
        scientificReference: reference,
        inputs: { lucLegerPalier: tests.lucLegerPalier, vn },
        rawValue: raw,
        finalValue: vmaKmH
      }
    };
  }

  const pf = config.performanceVmaFactors;

  // 3. Demi-Cooper (6 min = 0,1 h) -> 100% VMA
  if (tests.cooperDistance && tests.cooperDistance > 0) {
    const speedKmH = (tests.cooperDistance / 1000) / 0.1;
    const raw = speedKmH / pf.demiCooper;
    const vmaKmH = Number(raw.toFixed(2));
    return {
      vmaKmH,
      hasReference: true,
      source: 'DEMI_COOPER',
      trace: {
        metric: 'VMA',
        formulaName: `Demi-Cooper (${Math.round(pf.demiCooper * 100)}% VMA)`,
        scientificReference: pf.reference,
        inputs: { cooperDistanceMeters: tests.cooperDistance },
        rawValue: raw,
        finalValue: vmaKmH
      }
    };
  }

  // 4. 2400m -> 95% VMA
  const perfCandidates: Array<{
    timeStr?: string;
    distKm: number;
    factor: number;
    source: VMAResult['source'];
    label: string;
  }> = [
    { timeStr: tests.run2400mTime, distKm: 2.4, factor: pf.run2400m, source: 'RUN_2400M', label: '2400m CCPM' },
    { timeStr: tests.run5kmTime, distKm: 5, factor: pf.run5km, source: 'RUN_5KM', label: '5 km' },
    { timeStr: tests.run10kmTime, distKm: 10, factor: pf.run10km, source: 'RUN_10KM', label: '10 km' },
    { timeStr: tests.runSemiMarathonTime, distKm: 21.0975, factor: pf.runSemi, source: 'RUN_SEMI', label: 'Semi-marathon' },
    { timeStr: tests.run20kmTime, distKm: 20, factor: pf.run20km, source: 'RUN_20KM', label: '20 km' },
    { timeStr: tests.runMarathonTime, distKm: 42.195, factor: pf.runMarathon, source: 'RUN_MARATHON', label: 'Marathon' }
  ];

  for (const cand of perfCandidates) {
    const hours = parseTimeToHours(cand.timeStr);
    if (hours > 0) {
      const speedKmH = cand.distKm / hours;
      const raw = speedKmH / cand.factor;
      const vmaKmH = Number(raw.toFixed(2));
      return {
        vmaKmH,
        hasReference: true,
        source: cand.source,
        trace: {
          metric: 'VMA',
          formulaName: `${cand.label} (${Math.round(cand.factor * 100)}% VMA)`,
          scientificReference: pf.reference,
          inputs: { time: cand.timeStr, distanceKm: cand.distKm, factor: cand.factor },
          rawValue: raw,
          finalValue: vmaKmH
        }
      };
    }
  }

  // 5. VMA manuelle explicitement renseignée
  if (tests.calculatedVMA && tests.calculatedVMA > 0) {
    return {
      vmaKmH: Number(tests.calculatedVMA.toFixed(2)),
      hasReference: true,
      source: 'MANUAL',
      trace: {
        metric: 'VMA',
        formulaName: 'VMA de référence renseignée',
        scientificReference: pf.reference,
        inputs: { calculatedVMA: tests.calculatedVMA },
        rawValue: tests.calculatedVMA,
        finalValue: Number(tests.calculatedVMA.toFixed(2))
      }
    };
  }

  return {
    vmaKmH: null,
    hasReference: false,
    source: 'MISSING',
    warning: 'Aucune référence VMA enregistrée — planifier un test VAMEVAL, Luc Léger ou 2400m avec un moniteur EPMS.',
    trace: {
      metric: 'VMA',
      formulaName: 'VMA absente',
      scientificReference: pf.reference,
      inputs: {},
      note: 'Aucune donnée VMA renseignée : aucune valeur inventée.'
    }
  };
};

/**
 * Arrondi strict au pas de charge réel du matériel disponible (ex. 2,5 kg par défaut).
 */
export const roundToEquipmentStep = (weightKg: number, stepKg = 2.5): number => {
  if (!Number.isFinite(weightKg) || weightKg <= 0) return 0;
  const safeStep = stepKg > 0 ? stepKg : 2.5;
  return Math.max(safeStep, Math.round(weightKg / safeStep) * safeStep);
};

/**
 * Résout le 1RM réel du militaire pour un exercice donné SANS JAMAIS inventer une charge.
 */
export const resolveUser1RMForExercise = (
  tests: PhysicalTests | undefined,
  exerciseName: string
): { rmKg: number | null; kind: MissingReferenceKind; sourceLabel: string } => {
  const lower = (exerciseName || '').toLowerCase();
  const isDeadlift = /(soulev[ée]|deadlift|roumain|rdl|trap bar|hip thrust)/.test(lower);
  const isLower =
    isDeadlift ||
    /(squat|jambe|presse|fente|lunge|ischio|quadri|mollet|leg |hack )/.test(lower);

  if (isDeadlift) {
    if (tests?.deadlift1RM && tests.deadlift1RM > 0) {
      return { rmKg: tests.deadlift1RM, kind: '1RM_DEADLIFT', sourceLabel: '1RM Soulevé de terre' };
    }
    if (tests?.squat1RM && tests.squat1RM > 0) {
      return { rmKg: tests.squat1RM, kind: '1RM_LOWER', sourceLabel: '1RM Squat (référence bas du corps)' };
    }
    return { rmKg: null, kind: '1RM_DEADLIFT', sourceLabel: 'Absent' };
  }

  if (isLower) {
    if (tests?.squat1RM && tests.squat1RM > 0) {
      return { rmKg: tests.squat1RM, kind: '1RM_LOWER', sourceLabel: '1RM Squat' };
    }
    return { rmKg: null, kind: '1RM_LOWER', sourceLabel: 'Absent' };
  }

  if (tests?.benchPress1RM && tests.benchPress1RM > 0) {
    return { rmKg: tests.benchPress1RM, kind: '1RM_UPPER', sourceLabel: '1RM Développé couché' };
  }
  return { rmKg: null, kind: '1RM_UPPER', sourceLabel: 'Absent' };
};

/**
 * Applique un delta d'intensité (issu du bilan de forme quotidien) en respectant
 * strictement les bornes Human-in-the-Loop fixées par le moniteur.
 */
export const clampIntensityDelta = (
  requestedDeltaPct: number,
  bounds?: AdaptationBounds
): { appliedDeltaPct: number; clamped: boolean } => {
  if (!bounds) {
    return { appliedDeltaPct: requestedDeltaPct, clamped: false };
  }
  const minD = bounds.minIntensityDeltaPct ?? -20;
  const maxD = bounds.maxIntensityDeltaPct ?? 5;
  const applied = Math.min(maxD, Math.max(minD, requestedDeltaPct));
  return { appliedDeltaPct: applied, clamped: applied !== requestedDeltaPct };
};

/**
 * Convertit un % 1RM en charge arrondie au pas matériel, avec bornes Human-in-the-Loop et traçabilité.
 */
export const convertPercent1RMToKg = (params: {
  rmKg: number;
  percent1RM: number;
  stepKg?: number;
  dailyDeltaPct?: number;
  bounds?: AdaptationBounds;
  sourceLabel?: string;
  config?: FormulaSystemConfig;
}): {
  loadKg: number;
  effectivePct: number;
  appliedDeltaPct: number;
  boundsClamped: boolean;
  trace: CalculationTrace;
} => {
  const cfg = params.config || DEFAULT_FORMULA_CONFIG;
  const stepKg = params.stepKg ?? cfg.defaultWeightStepKg;
  const { appliedDeltaPct, clamped } = clampIntensityDelta(params.dailyDeltaPct || 0, params.bounds);
  const effectivePct = Math.max(30, Math.min(100, params.percent1RM * (1 + appliedDeltaPct / 100)));
  const rawKg = params.rmKg * (effectivePct / 100);
  const loadKg = roundToEquipmentStep(rawKg, stepKg);

  return {
    loadKg,
    effectivePct: Number(effectivePct.toFixed(1)),
    appliedDeltaPct,
    boundsClamped: clamped,
    trace: {
      metric: 'LOAD_KG',
      formulaName: `Charge = 1RM × %cible (arrondi ${stepKg} kg)`,
      scientificReference: cfg.brzycki.reference,
      inputs: {
        rmKg: params.rmKg,
        source: params.sourceLabel || '1RM',
        percent1RM: params.percent1RM,
        dailyDeltaPct: appliedDeltaPct,
        stepKg
      },
      rawValue: Number(rawKg.toFixed(2)),
      finalValue: `${loadKg} kg`,
      note: clamped ? `Ajustement borné au cadre moniteur (${params.bounds?.minIntensityDeltaPct}% à +${params.bounds?.maxIntensityDeltaPct}%).` : undefined
    }
  };
};

/**
 * Convertit un % VMA en vitesse km/h et allure min/km, avec bornes Human-in-the-Loop et traçabilité.
 */
export const convertPercentVMAToPace = (params: {
  vmaKmH: number;
  percentVMA: number;
  dailyDeltaPct?: number;
  bounds?: AdaptationBounds;
  config?: FormulaSystemConfig;
}): {
  speedKmH: number;
  pace: string;
  effectivePct: number;
  appliedDeltaPct: number;
  boundsClamped: boolean;
  trace: CalculationTrace;
} => {
  const cfg = params.config || DEFAULT_FORMULA_CONFIG;
  const { appliedDeltaPct, clamped } = clampIntensityDelta(params.dailyDeltaPct || 0, params.bounds);
  const effectivePct = Math.max(45, Math.min(115, params.percentVMA * (1 + appliedDeltaPct / 100)));
  const rawSpeed = params.vmaKmH * (effectivePct / 100);
  const speedKmH = Number(rawSpeed.toFixed(1));
  const pace = formatPaceFromSpeed(rawSpeed);

  return {
    speedKmH,
    pace,
    effectivePct: Number(effectivePct.toFixed(1)),
    appliedDeltaPct,
    boundsClamped: clamped,
    trace: {
      metric: 'PACE_VMA',
      formulaName: 'Vitesse = VMA × %cible ; Allure = 60 / Vitesse',
      scientificReference: cfg.performanceVmaFactors.reference,
      inputs: {
        vmaKmH: params.vmaKmH,
        percentVMA: params.percentVMA,
        dailyDeltaPct: appliedDeltaPct
      },
      rawValue: Number(rawSpeed.toFixed(2)),
      finalValue: `${speedKmH} km/h (${pace})`,
      note: clamped ? `Ajustement borné au cadre moniteur.` : undefined
    }
  };
};

// ============================================================================
// 2. PONTS DE COMPATIBILITÉ BLOCS ↔ SÉANCES LEGACY
// ============================================================================

/**
 * Garantit qu'une séance builder dispose toujours de `blocks[]` (migration non destructive des anciennes séances plates).
 */
export const ensureSessionBlocks = (session: ProgramSessionBuilder): SessionBlock[] => {
  if (session.blocks && session.blocks.length > 0) {
    return session.blocks;
  }
  const exs = session.exercises || [];
  return [
    {
      id: `blk_main_${session.id}`,
      type: 'MAIN',
      title: 'Corps de séance',
      rounds: 1,
      exercises: exs
    }
  ];
};

/**
 * Aplatit les blocs en liste d'exercices et génère une `Session` compatible avec `LiveSession`, `CalendarView`, `DashboardUser`.
 */
export const flattenBuilderSessionToLegacy = (
  sess: ProgramSessionBuilder,
  meta: { programId: string; weekNumber: number; dayNumber: number; fallbackLocation?: string }
): Session => {
  const blocks = ensureSessionBlocks(sess);
  const warmupBlock = blocks.find((b) => b.type === 'WARMUP');
  const cooldownBlock = blocks.find((b) => b.type === 'COOLDOWN');
  const coreBlocks = blocks.filter((b) => b.type !== 'WARMUP' && b.type !== 'COOLDOWN');

  const formatExPresc = (ex: ProgramExercise): string => {
    if (ex.percentVMA) {
      const vol = ex.distanceMeters
        ? `${ex.sets && ex.sets > 1 ? `${ex.sets} x ` : ''}${ex.distanceMeters >= 1000 ? `${(ex.distanceMeters / 1000).toFixed(1).replace('.0', '')} km` : `${ex.distanceMeters}m`}`
        : ex.durationSeconds
        ? `${ex.sets && ex.sets > 1 ? `${ex.sets} x ` : ''}${formatDurationSec(ex.durationSeconds)}`
        : ex.reps || '';
      return `${vol ? `${vol} ` : ''}à [${ex.percentVMA}% VMA]`.trim();
    }
    if (ex.percent1RM) {
      return `${ex.sets || 3} x ${ex.reps || '8'} à [${ex.percent1RM}% 1RM]`;
    }
    if (ex.loadKg) {
      return `${ex.sets || 3} x ${ex.reps || '8'} à ${ex.loadKg} kg`;
    }
    if (ex.carriedLoadKg) {
      const dist = ex.distanceMeters ? `${(ex.distanceMeters / 1000).toFixed(1).replace('.0', '')} km` : '';
      const time = ex.targetTimeSec ? ` (obj. ${formatDurationSec(ex.targetTimeSec)})` : '';
      return `${dist} charge ${ex.carriedLoadKg} kg${time}`.trim();
    }
    if (ex.holdSec) {
      return `${ex.sets || 3} x ${ex.holdSec}s${ex.bilateral ? ' / côté' : ''}`;
    }
    if (ex.reps && ex.load) {
      return `${ex.sets ? `${ex.sets} x ` : ''}${ex.reps} ${ex.load}`.trim();
    }
    if (ex.reps) {
      return `${ex.sets ? `${ex.sets} x ` : ''}${ex.reps}`;
    }
    if (ex.durationSeconds) {
      return `${ex.sets && ex.sets > 1 ? `${ex.sets} x ` : ''}${formatDurationSec(ex.durationSeconds)}`;
    }
    return ex.load || `${ex.sets || 3} séries`;
  };

  const mainBlock = coreBlocks.flatMap((blk) =>
    blk.exercises.map((ex) => ({
      exercise: blk.rounds && blk.rounds > 1 ? `[${blk.title} ×${blk.rounds}] ${ex.name}` : ex.name,
      prescription: formatExPresc(ex),
      rest: ex.rest || (ex.restSec ? formatDurationSec(ex.restSec) : '1:30'),
      tempo: ex.tempo,
      durationSeconds: ex.durationSeconds,
      isRecovery: ex.isRecovery
    }))
  );

  const warmupText = warmupBlock
    ? warmupBlock.exercises.map((e) => `• ${e.name} : ${formatExPresc(e)}`).join('\n') || warmupBlock.notes || 'Échauffement articulaire progressif (8–10 min).'
    : 'Échauffement articulaire progressif (8–10 min).';

  const cooldownText = cooldownBlock
    ? cooldownBlock.exercises.map((e) => `• ${e.name} : ${formatExPresc(e)}`).join('\n') || cooldownBlock.notes || 'Retour au calme et étirements doux (5 min).'
    : 'Retour au calme et étirements doux (5 min).';

  const equipmentSet = new Set<string>();
  blocks.forEach((b) =>
    b.exercises.forEach((e) => {
      if (e.equipment && e.equipment !== 'PDC') equipmentSet.add(e.equipment);
    })
  );

  const estimatedMinutes =
    sess.estimatedDurationMin ||
    Math.max(
      15,
      Math.round(
        blocks.reduce(
          (acc, blk) =>
            acc +
            (blk.rounds || 1) *
              blk.exercises.reduce(
                (ea, ex) =>
                  ea +
                  (ex.durationSeconds
                    ? (ex.durationSeconds * (ex.sets || 1)) / 60
                    : (ex.sets || 3) * 2.2),
                0
              ),
          0
        ) + 6
      )
    );

  return {
    id: sess.id || `sess_${meta.programId}_${meta.weekNumber}_${meta.dayNumber}`,
    programId: meta.programId,
    title: sess.title,
    description: sess.description || sess.objective || `Semaine ${meta.weekNumber}`,
    durationMinutes: estimatedMinutes,
    type: sess.type || 'MUSCU',
    workoutType: sess.type || 'MUSCU',
    dateScheduled: `S${meta.weekNumber}J${meta.dayNumber}`,
    locationName: sess.locationName || meta.fallbackLocation || 'Installation Base',
    infrastructureId: sess.infrastructureId || 'any',
    isCompleted: false,
    builderData: { ...sess, blocks, exercises: blocks.flatMap((b) => b.exercises) },
    content: {
      equipmentNeeded: Array.from(equipmentSet),
      warmup: warmupText,
      mainBlock,
      cooldown: cooldownText,
      advice:
        sess.safetyCues ||
        sess.monitorNotes ||
        'Charges et allures calculées selon vos références 1RM / VMA et votre bilan de forme du jour.'
    }
  };
};

// ============================================================================
// 3. FONCTION UNIQUE D'INDIVIDUALISATION D'UN PROGRAMME POUR UN MILITAIRE
// ============================================================================

const extractPercentFromLegacyLoad = (loadStr?: string, kind?: '1RM' | 'VMA'): number | null => {
  if (!loadStr) return null;
  const regex = kind === 'VMA' ? /(\d+)\s*%\s*VMA/i : /(\d+)\s*%\s*1RM/i;
  const m = loadStr.match(regex);
  return m ? parseInt(m[1], 10) : null;
};

const isPainZoneConflict = (exerciseName: string, painZone?: string): boolean => {
  if (!painZone || !painZone.trim()) return false;
  const ex = exerciseName.toLowerCase();
  const pain = painZone.toLowerCase();
  if (pain.includes('genou')) return /(squat|fente|saut|box|course|sprint|presse|leg ext)/.test(ex);
  if (pain.includes('dos') || pain.includes('lomb')) return /(soulev|deadlift|squat arri|good morning|rowing barre|sit-up|crunch)/.test(ex);
  if (pain.includes('epaule') || pain.includes('épaule')) return /(d[eé]velopp|pompe|traction|dips|militaire|arrach|overhead|tirage vertical)/.test(ex);
  if (pain.includes('cheville') || pain.includes('pied')) return /(course|fractionn|sprint|corde|saut|box|fente)/.test(ex);
  return false;
};

/**
 * Individualise une séance builder pour un profil militaire (+ bilan de forme optionnel).
 */
export const individualizeSessionForUser = (
  session: ProgramSessionBuilder,
  weekNumber: number,
  user: UserProfile,
  dailyForm?: DailyForm,
  config: FormulaSystemConfig = DEFAULT_FORMULA_CONFIG,
  stepKg?: number
): IndividualizedSessionResult => {
  const vmaRes = computeVMAWithTrace(user.tests, config);
  const dailyAnalysis = dailyForm ? analyzeDailyFormStructured(dailyForm) : null;

  // Delta d'intensité demandé par le bilan de forme
  let requestedDeltaPct = 0;
  if (dailyAnalysis) {
    if (dailyAnalysis.zone === 'ORANGE') requestedDeltaPct = -15;
    else if (dailyAnalysis.zone === 'RED') requestedDeltaPct = -25;
    else if (dailyAnalysis.zone === 'BLACK') requestedDeltaPct = -50;
  }

  const missingSet = new Set<MissingReferenceKind>();
  const warnings: string[] = [];
  const adaptationsApplied: string[] = [];
  const sessionTraces: CalculationTrace[] = [vmaRes.trace];

  if (dailyAnalysis && dailyAnalysis.zone !== 'GREEN') {
    adaptationsApplied.push(`Bilan forme Zone ${dailyAnalysis.zone} : ajustement cible ${requestedDeltaPct}% (borné au cadre moniteur).`);
  }

  const blocks = ensureSessionBlocks(session);
  const indBlocks: IndividualizedBlockResult[] = blocks.map((blk) => {
    const indExercises: IndividualizedExerciseResult[] = blk.exercises.map((ex) => {
      const exTraces: CalculationTrace[] = [];
      let activeExercise = ex;
      let substitutedFrom: string | undefined;

      // Vérification douleur / substitution autorisée Human-in-the-Loop
      if (dailyForm && dailyForm.painLevel >= 4 && isPainZoneConflict(ex.name, dailyForm.painZone)) {
        if (ex.adaptationBounds?.substitutable && ex.adaptationBounds.approvedAlternatives && ex.adaptationBounds.approvedAlternatives.length > 0) {
          substitutedFrom = ex.name;
          const altName = ex.adaptationBounds.approvedAlternatives[0];
          activeExercise = { ...ex, name: altName };
          const subMsg = `Substitution validée : ${substitutedFrom} → ${altName} (douleur ${dailyForm.painZone}).`;
          adaptationsApplied.push(subMsg);
          exTraces.push({
            metric: 'SUBSTITUTION',
            formulaName: 'Substitution douleur Human-in-the-Loop',
            scientificReference: config.piaRules.reference,
            inputs: { original: substitutedFrom, alternative: altName, painZone: dailyForm.painZone, painLevel: dailyForm.painLevel },
            finalValue: altName
          });
        } else {
          const warn = `${ex.name} : zone douloureuse (${dailyForm.painZone}) déclarée et exercice non marqué substituable — solliciter le moniteur EPMS.`;
          warnings.push(warn);
        }
      }

      const pctVMA = activeExercise.percentVMA ?? extractPercentFromLegacyLoad(activeExercise.load, 'VMA') ?? extractPercentFromLegacyLoad(activeExercise.reps, 'VMA');
      const pct1RM = activeExercise.percent1RM ?? extractPercentFromLegacyLoad(activeExercise.load, '1RM') ?? extractPercentFromLegacyLoad(activeExercise.reps, '1RM');

      // Cas 1 : Prescription Course / VMA
      if (pctVMA && pctVMA > 0) {
        if (!vmaRes.hasReference || vmaRes.vmaKmH === null) {
          missingSet.add('VMA');
          const warn = `${activeExercise.name} (${pctVMA}% VMA) : VMA absente pour ${user.name} — planifier un test VAMEVAL / Luc Léger / 2400m.`;
          warnings.push(warn);
          return {
            exercise: activeExercise,
            displayPrescription: `${activeExercise.sets && activeExercise.sets > 1 ? `${activeExercise.sets} × ` : ''}${activeExercise.distanceMeters ? `${activeExercise.distanceMeters}m` : activeExercise.durationSeconds ? formatDurationSec(activeExercise.durationSeconds) : activeExercise.reps || ''} à ${pctVMA}% VMA — ⚠️ VMA manquante`,
            computedLoadKg: null,
            computedSpeedKmH: null,
            computedPace: null,
            appliedIntensityDeltaPct: 0,
            boundsClamped: false,
            substitutedFrom,
            missingReference: 'VMA',
            warning: warn,
            traces: [...exTraces, vmaRes.trace]
          };
        }

        const paceRes = convertPercentVMAToPace({
          vmaKmH: vmaRes.vmaKmH,
          percentVMA: pctVMA,
          dailyDeltaPct: requestedDeltaPct,
          bounds: activeExercise.adaptationBounds,
          config
        });
        exTraces.push(paceRes.trace);
        sessionTraces.push(paceRes.trace);

        const volPart = activeExercise.distanceMeters
          ? `${activeExercise.sets && activeExercise.sets > 1 ? `${activeExercise.sets} × ` : ''}${activeExercise.distanceMeters >= 1000 ? `${(activeExercise.distanceMeters / 1000).toFixed(1).replace('.0', '')} km` : `${activeExercise.distanceMeters}m`}`
          : activeExercise.durationSeconds
          ? `${activeExercise.sets && activeExercise.sets > 1 ? `${activeExercise.sets} × ` : ''}${formatDurationSec(activeExercise.durationSeconds)}`
          : activeExercise.reps || '';

        const restPart = activeExercise.rest ? ` (récup ${activeExercise.rest})` : '';
        return {
          exercise: activeExercise,
          displayPrescription: `${volPart} à ${paceRes.speedKmH} km/h (${paceRes.pace}) [${paceRes.effectivePct}% VMA]${restPart}`.trim(),
          computedLoadKg: null,
          computedSpeedKmH: paceRes.speedKmH,
          computedPace: paceRes.pace,
          appliedIntensityDeltaPct: paceRes.appliedDeltaPct,
          boundsClamped: paceRes.boundsClamped,
          substitutedFrom,
          traces: exTraces
        };
      }

      // Cas 2 : Prescription Force (% 1RM)
      if (pct1RM && pct1RM > 0) {
        const rmInfo = resolveUser1RMForExercise(user.tests, activeExercise.name);
        if (rmInfo.rmKg === null) {
          missingSet.add(rmInfo.kind);
          const warn = `${activeExercise.name} (${pct1RM}% 1RM) : référence ${rmInfo.kind} absente pour ${user.name} — planifier un test sous-maximal (≤ 10 RM) avec le moniteur.`;
          warnings.push(warn);
          return {
            exercise: activeExercise,
            displayPrescription: `${activeExercise.sets || 3} × ${activeExercise.reps || '8'} à ${pct1RM}% 1RM — ⚠️ 1RM absent (test requis)`,
            computedLoadKg: null,
            computedSpeedKmH: null,
            computedPace: null,
            appliedIntensityDeltaPct: 0,
            boundsClamped: false,
            substitutedFrom,
            missingReference: rmInfo.kind,
            warning: warn,
            traces: exTraces
          };
        }

        const loadRes = convertPercent1RMToKg({
          rmKg: rmInfo.rmKg,
          percent1RM: pct1RM,
          stepKg: stepKg ?? config.defaultWeightStepKg,
          dailyDeltaPct: requestedDeltaPct,
          bounds: activeExercise.adaptationBounds,
          sourceLabel: rmInfo.sourceLabel,
          config
        });
        exTraces.push(loadRes.trace);
        sessionTraces.push(loadRes.trace);

        const tempoPart = activeExercise.tempo ? ` • Tempo ${activeExercise.tempo}` : '';
        const restPart = activeExercise.rest ? ` • Repos ${activeExercise.rest}` : '';
        return {
          exercise: activeExercise,
          displayPrescription: `${activeExercise.sets || 3} × ${activeExercise.reps || '8'} à ${loadRes.loadKg} kg (${loadRes.effectivePct}% 1RM)${tempoPart}${restPart}`,
          computedLoadKg: loadRes.loadKg,
          computedSpeedKmH: null,
          computedPace: null,
          appliedIntensityDeltaPct: loadRes.appliedDeltaPct,
          boundsClamped: loadRes.boundsClamped,
          substitutedFrom,
          traces: exTraces
        };
      }

      // Cas 3 : Charge fixe en kg
      if (activeExercise.loadKg && activeExercise.loadKg > 0) {
        const { appliedDeltaPct, clamped } = clampIntensityDelta(requestedDeltaPct, activeExercise.adaptationBounds);
        const adjustedKg = roundToEquipmentStep(
          activeExercise.loadKg * (1 + appliedDeltaPct / 100),
          stepKg ?? config.defaultWeightStepKg
        );
        return {
          exercise: activeExercise,
          displayPrescription: `${activeExercise.sets || 3} × ${activeExercise.reps || '8'} à ${adjustedKg} kg${activeExercise.rest ? ` • Repos ${activeExercise.rest}` : ''}`,
          computedLoadKg: adjustedKg,
          computedSpeedKmH: null,
          computedPace: null,
          appliedIntensityDeltaPct: appliedDeltaPct,
          boundsClamped: clamped,
          substitutedFrom,
          traces: exTraces
        };
      }

      // Cas 4 : Marche chargée / Mobilité / Poids du corps
      let display = '';
      if (activeExercise.carriedLoadKg) {
        const dist = activeExercise.distanceMeters ? `${(activeExercise.distanceMeters / 1000).toFixed(1).replace('.0', '')} km` : '';
        const target = activeExercise.targetTimeSec ? ` • Objectif ${formatDurationSec(activeExercise.targetTimeSec)}` : '';
        display = `${dist} — Charge portée ${activeExercise.carriedLoadKg} kg${target}`.trim();
      } else if (activeExercise.holdSec) {
        display = `${activeExercise.sets || 3} × ${activeExercise.holdSec}s${activeExercise.bilateral ? ' / côté' : ''}${activeExercise.rest ? ` • Repos ${activeExercise.rest}` : ''}`;
      } else if (activeExercise.durationSeconds) {
        display = `${activeExercise.sets && activeExercise.sets > 1 ? `${activeExercise.sets} × ` : ''}${formatDurationSec(activeExercise.durationSeconds)}${activeExercise.rest ? ` • Repos ${activeExercise.rest}` : ''}`;
      } else {
        display = `${activeExercise.sets ? `${activeExercise.sets} × ` : ''}${activeExercise.reps || '10 reps'}${activeExercise.rpe ? ` (RPE ${activeExercise.rpe})` : ''}${activeExercise.rest ? ` • Repos ${activeExercise.rest}` : ''}`;
      }

      return {
        exercise: activeExercise,
        displayPrescription: display,
        computedLoadKg: null,
        computedSpeedKmH: null,
        computedPace: null,
        appliedIntensityDeltaPct: 0,
        boundsClamped: false,
        substitutedFrom,
        traces: exTraces
      };
    });

    return { block: blk, exercises: indExercises };
  });

  return {
    sessionId: session.id,
    title: session.title,
    weekNumber,
    dayOfWeek: session.dayOfWeek,
    blocks: indBlocks,
    warnings: Array.from(new Set(warnings)),
    missingReferences: Array.from(missingSet),
    adaptationsApplied: Array.from(new Set(adaptationsApplied)),
    traces: sessionTraces
  };
};

/**
 * Fonction unique qui prend un programme directeur et un profil militaire (+ bilan forme optionnel)
 * et retourne le programme intégralement individualisé avec le détail traçable de chaque calcul.
 */
export const individualizeProgramForUser = (
  program: Program,
  user: UserProfile,
  dailyForm?: DailyForm,
  config: FormulaSystemConfig = DEFAULT_FORMULA_CONFIG,
  stepKg?: number
): IndividualizedProgramResult => {
  const vmaRes = computeVMAWithTrace(user.tests, config);
  const dailyAnalysis = dailyForm ? analyzeDailyFormStructured(dailyForm) : null;

  const sessionsOut: IndividualizedSessionResult[] = [];
  const allMissing = new Set<MissingReferenceKind>();
  const allWarnings = new Set<string>();
  const allTraces: CalculationTrace[] = [vmaRes.trace];

  if (program.structure && program.structure.length > 0) {
    program.structure.forEach((cycle) => {
      cycle.weeks.forEach((week) => {
        week.sessions.forEach((sess) => {
          const ind = individualizeSessionForUser(sess, week.number, user, dailyForm, config, stepKg);
          sessionsOut.push(ind);
          ind.missingReferences.forEach((m) => allMissing.add(m));
          ind.warnings.forEach((w) => allWarnings.add(w));
          allTraces.push(...ind.traces);
        });
      });
    });
  } else if (program.sessions && program.sessions.length > 0) {
    // Rétrocompatibilité programmes legacy sans structure
    program.sessions.forEach((s, idx) => {
      const builder: ProgramSessionBuilder = s.builderData || {
        id: s.id,
        title: s.title,
        type: s.type,
        exercises: (s.content?.mainBlock || []).map((b, bi) => ({
          id: `leg_${idx}_${bi}`,
          libraryId: 'legacy',
          name: b.exercise,
          reps: b.prescription,
          load: b.prescription,
          rest: b.rest,
          tempo: b.tempo,
          durationSeconds: b.durationSeconds,
          isRecovery: b.isRecovery
        }))
      };
      const weekMatch = (s.dateScheduled || '').match(/S(\d+)/);
      const ind = individualizeSessionForUser(
        builder,
        weekMatch ? parseInt(weekMatch[1], 10) : 1,
        user,
        dailyForm,
        config,
        stepKg
      );
      sessionsOut.push(ind);
      ind.missingReferences.forEach((m) => allMissing.add(m));
      ind.warnings.forEach((w) => allWarnings.add(w));
      allTraces.push(...ind.traces);
    });
  }

  return {
    programId: program.id,
    programTitle: program.title,
    userNid: user.nid,
    userName: user.name,
    computedAt: new Date().toISOString(),
    vmaKmH: vmaRes.vmaKmH,
    vmaSource: vmaRes.source,
    rmUpperKg: user.tests?.benchPress1RM && user.tests.benchPress1RM > 0 ? user.tests.benchPress1RM : null,
    rmLowerKg: user.tests?.squat1RM && user.tests.squat1RM > 0 ? user.tests.squat1RM : null,
    rmDeadliftKg: user.tests?.deadlift1RM && user.tests.deadlift1RM > 0 ? user.tests.deadlift1RM : null,
    dailyFormZone: dailyAnalysis?.zone,
    sessions: sessionsOut,
    missingReferences: Array.from(allMissing),
    warnings: Array.from(allWarnings),
    traces: allTraces
  };
};
