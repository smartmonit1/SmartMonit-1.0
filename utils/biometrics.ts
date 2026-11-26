import { PhysicalTests, Gender, DailyForm, UserProfile, JobType } from '../types';

export interface JobProfileGuidance {
  jobType: JobType;
  target: string;
  constraints: { issue: string; solution: string }[];
  aiPromptDirective: string;
}

export const JOB_PROFILES_DB: Record<JobType, JobProfileGuidance> = {
  [JobType.PN]: {
    jobType: JobType.PN,
    target: 'Pilotes, Équipages de transport et d\'hélicoptère',
    constraints: [
      {
        issue: 'Compression axiale (facteurs G) & Vibrations (cervicalgies, lombalgies)',
        solution: 'Stabilisation segmentaire : transverse, stabilisateurs du bassin et extensions contrôlées.'
      },
      {
        issue: 'Surcharge cervicale (Casque / JVN)',
        solution: 'Renforcement profond : flexion cervicale isométrique, trapèzes et rhomboïdes.'
      },
      {
        issue: 'Désorganisation circadienne (vigilance & récupération)',
        solution: 'Programmation adaptative : bannir la force maximale post-vol, privilégier mobilité et cardio < 70% FCmax.'
      }
    ],
    aiPromptDirective: 'Personnel Navigant (PN): privilégier stabilisation segmentaire (transverse/bassin), renforcement cervical profond (trapèzes/rhomboïdes) et mobilité. Bannir la force maximale si fatigue post-vol.'
  },
  [JobType.TECH]: {
    jobType: JobType.TECH,
    target: 'Mécaniciens, Armuriers, Techniciens de maintenance',
    constraints: [
      {
        issue: 'Asymétrie posturale (gestes répétitifs et postures contraintes)',
        solution: 'Rééquilibrage musculaire : chaîne postérieure, rotateurs d\'épaules, mobilité bassin/cervicales/épaules.'
      },
      {
        issue: 'Troubles Musculo-Squelettiques (TMS : épaules, poignets, genoux)',
        solution: 'Protocole excentrique lent contrôlé (type Stanish) et force isométrique sur les tendons sollicités.'
      },
      {
        issue: 'Port de charges lourdes (risque lombaire en torsion)',
        solution: 'Éducation gestuelle : soulevé de terre (Trap Bar), gainage anti-rotation (Pallof Press), mobilité vertébrale.'
      }
    ],
    aiPromptDirective: 'Personnel Logistique & Technique: rééquilibrage chaîne postérieure et rotateurs d\'épaules, travail excentrique contrôlé anti-TMS (type Stanish), gainage anti-rotation (Pallof Press) et éducation gestuelle.'
  },
  [JobType.FUSCO]: {
    jobType: JobType.FUSCO,
    target: 'Pompiers de l\'air, Fusiliers de l\'air, CPA, Maîtres-chiens',
    constraints: [
      {
        issue: 'Choc cardiovasculaire (départ intervention brutal)',
        solution: 'HIIT & fractionné court pour préparer le cœur aux montées en charge brutales.'
      },
      {
        issue: 'Contrainte de charge portée (gilets, équipements lourds)',
        solution: 'Renforcement lourd sangle abdominale et lombaires : Farmer Walk, Pallof Press lourd, Soulevé de terre.'
      },
      {
        issue: 'Instabilité du terrain (chevilles & genoux)',
        solution: 'Proprioception active et travail excentrique des membres inférieurs.'
      }
    ],
    aiPromptDirective: 'Pompiers et Commandos: HIIT/fractionné, endurance tactique, port de charge/gainage lourd (Farmer Walk, Pallof Press, soulevé de terre), proprioception chevilles/genoux.'
  },
  [JobType.ADMIN]: {
    jobType: JobType.ADMIN,
    target: 'Gestionnaires, Opérateurs radar, Contrôleurs aériens, SIC, Renseignement',
    constraints: [
      {
        issue: 'Inhibition musculaire (amnésie fessiers, raideur psoas, relâchement abdominal)',
        solution: 'Réactivation fessiers, transverse et obliques ; étirement/contraction du psoas et mobilité bassin.'
      },
      {
        issue: 'Stress chronique & charge cognitive élevée (horaires décalés/gardes)',
        solution: 'Régulation par endurance fondamentale (30-45 min) ; HIIT uniquement si fatigue faible.'
      },
      {
        issue: 'Déséquilibre postural (écrans : épaules enroulées, hyperlordose)',
        solution: 'Ouverture thoracique, mobilité épaules, renforcement rhomboïdes et deltoïdes postérieurs.'
      }
    ],
    aiPromptDirective: 'Poste Assis / Contrôle Aérien / SIC: réactivation fessiers/transverse, étirement psoas, ouverture thoracique (rhomboïdes/deltoïdes postérieurs), régulation du stress par cardio fondamental.'
  }
};

const parseTimeToHours = (timeStr?: string): number => {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  let hours = 0;
  let mins = 0;
  let secs = 0;
  if (parts.length === 3) {
    [hours, mins, secs] = parts;
  } else if (parts.length === 2) {
    [mins, secs] = parts;
  } else {
    return 0;
  }
  return hours + mins / 60 + secs / 3600;
};

/**
 * Calcul de la VMA théorique conforme au dossier SMART MONIT 1.0 (Section 4.5.3)
 */
export const calculateVMA = (tests: PhysicalTests): number => {
  if (!tests) return 10.0;

  // 1. VAMEVAL : VMA = 8 + (0.5 * palier)
  if (tests.vamevalPalier && tests.vamevalPalier > 0) {
    return parseFloat((8 + 0.5 * tests.vamevalPalier).toFixed(2));
  }

  // 2. Luc Léger : VN = 8 + 0.5*palier ; VO2Max = 5.857*VN - 19.458 ; VMA = VO2Max / 3.5
  if (tests.lucLegerPalier && tests.lucLegerPalier > 0) {
    const vn = 8 + 0.5 * tests.lucLegerPalier;
    const vo2max = 5.857 * vn - 19.458;
    return parseFloat((vo2max / 3.5).toFixed(2));
  }

  // 3. Demi-Cooper (6 min) : 100% VMA -> distance(m) / 100
  if (tests.cooperDistance && tests.cooperDistance > 0) {
    return parseFloat((tests.cooperDistance / 100).toFixed(2));
  }

  // 4. Test CCPM 2400m : 95% VMA
  if (tests.run2400mTime) {
    const totalHours = parseTimeToHours(tests.run2400mTime);
    if (totalHours > 0) {
      const speedKmH = 2.4 / totalHours;
      return parseFloat((speedKmH / 0.95).toFixed(2));
    }
  }

  // 5. 5 km : 90% VMA
  if (tests.run5kmTime) {
    const totalHours = parseTimeToHours(tests.run5kmTime);
    if (totalHours > 0) {
      return parseFloat((5 / totalHours / 0.90).toFixed(2));
    }
  }

  // 6. 10 km : 85% VMA
  if (tests.run10kmTime) {
    const totalHours = parseTimeToHours(tests.run10kmTime);
    if (totalHours > 0) {
      return parseFloat((10 / totalHours / 0.85).toFixed(2));
    }
  }

  // 7. Semi-Marathon (21.1 km) : 80% VMA
  if (tests.runSemiMarathonTime) {
    const totalHours = parseTimeToHours(tests.runSemiMarathonTime);
    if (totalHours > 0) {
      return parseFloat((21.1 / totalHours / 0.80).toFixed(2));
    }
  }

  // 8. 20 km : 80% VMA
  if (tests.run20kmTime) {
    const totalHours = parseTimeToHours(tests.run20kmTime);
    if (totalHours > 0) {
      return parseFloat((20 / totalHours / 0.80).toFixed(2));
    }
  }

  // 9. Marathon (42.195 km) : 70% VMA
  if (tests.runMarathonTime) {
    const totalHours = parseTimeToHours(tests.runMarathonTime);
    if (totalHours > 0) {
      return parseFloat((42.195 / totalHours / 0.70).toFixed(2));
    }
  }

  return tests.calculatedVMA && tests.calculatedVMA > 0 ? tests.calculatedVMA : 12.0;
};

/**
 * Formule de Brzycki (Section 4.5.3) : 1RM = Charge × (36 / (37 - Reps))
 * Fiable jusqu'à 10-12 reps ; au-delà on plafonne en sécurité.
 */
export const calculate1RM = (weight: number, reps: number): number => {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return parseFloat(weight.toFixed(1));
  const clampedReps = Math.min(reps, 15);
  return parseFloat((weight * (36 / (37 - clampedReps))).toFixed(1));
};

/**
 * Estimation conservatrice du 1RM poussée haut du corps à partir des pompes max (si 1RM DC absent).
 * Charge effective en pompe ≈ 64% du poids de corps moyen (75kg H -> 48kg ; 60kg F -> 38kg).
 */
export const estimate1RMFromBodyweight = (reps: number, gender: Gender): number => {
  if (!reps || reps <= 0) return gender === Gender.MALE ? 50 : 30;
  const effectivePushWeight = gender === Gender.MALE ? 48 : 38;
  // Formule Epley adoucie pour les séries longues au poids du corps
  const estimated = effectivePushWeight * (1 + Math.min(reps, 50) / 30);
  return parseFloat(estimated.toFixed(1));
};

export const formatPaceFromSpeed = (speedKmH: number): string => {
  if (!speedKmH || speedKmH <= 0) return '--:--/km';
  const totalSecondsPerKm = Math.round(3600 / speedKmH);
  const mins = Math.floor(totalSecondsPerKm / 60);
  const secs = totalSecondsPerKm % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}/km`;
};

export interface DailyFormAnalysis {
  zone: 'BLACK' | 'RED' | 'ORANGE' | 'GREEN';
  intensityMultiplier: number; // 0, 0.7, 0.85, 1.0
  orfaRecommended: boolean;
  isCritical: boolean;
  summary: string;
  instructions: string[];
}

/**
 * Analyse structurée du bilan forme quotidien pour proposer des ajustements prudents.
 */
export const analyzeDailyFormStructured = (daily: DailyForm): DailyFormAnalysis => {
  const instructions: string[] = [];
  const orfaRecommended =
    (daily.fatigueLevel > 6 && daily.stressLevel > 6) || daily.sleepQuality < 4;

  // Douleur élevée : ne pas proposer une séance intense.
  if (daily.painLevel >= 6) {
    const msg = `Douleur importante rapportée (${daily.painLevel}/10${daily.painZone ? ` — ${daily.painZone}` : ''}). SmartMonit ne peut pas en évaluer la cause. Évitez les efforts intenses et demandez conseil à un professionnel de santé si la douleur est forte, inhabituelle ou persistante.`;
    return {
      zone: 'BLACK',
      intensityMultiplier: 0.5,
      orfaRecommended,
      isCritical: true,
      summary: msg,
      instructions: [msg]
    };
  }

  if (daily.painLevel > 0 && daily.painZone) {
    instructions.push(
      `Substitution obligatoire : exclure tout exercice sollicitant la zone douloureuse (${daily.painZone}). Remplacer par mobilité douce, gainage adapté ou natation.`
    );
  }

  // Fatigue marquée ou sommeil très dégradé.
  if (daily.fatigueLevel >= 8 || daily.sleepQuality <= 3) {
    const msg =
      'Fatigue importante ou sommeil très dégradé : privilégiez le repos ou une activité douce si elle reste confortable. Cette suggestion ne remplace pas un avis médical.';
    instructions.push(msg);
    return {
      zone: 'RED',
      intensityMultiplier: 0.75,
      orfaRecommended: true,
      isCritical: false,
      summary: msg,
      instructions
    };
  }

  // Fatigue modérée, stress élevé ou sommeil moyen.
  if (
    (daily.fatigueLevel >= 5 && daily.fatigueLevel <= 7) ||
    daily.sleepQuality < 6 ||
    daily.stressLevel > 6
  ) {
    const msg =
      'Vigilance récupération : une réduction de charge et des temps de repos supplémentaires sont proposés. Ajustez-les selon vos sensations.';
    instructions.push(msg);
    return {
      zone: 'ORANGE',
      intensityMultiplier: 0.85,
      orfaRecommended,
      isCritical: false,
      summary: msg,
      instructions
    };
  }

  // Ressenti favorable.
  const greenMsg = 'Ressenti favorable : la séance prévue peut être envisagée si l’échauffement et les sensations restent confortables.';
  instructions.push(greenMsg);
  return {
    zone: 'GREEN',
    intensityMultiplier: 1.0,
    orfaRecommended,
    isCritical: false,
    summary: greenMsg,
    instructions
  };
};

/**
 * Compatibilité rétroactive : retourne string si critique (Zone Noire), sinon string[]
 */
export const analyzeDailyForm = (daily: DailyForm): string[] | string => {
  const analysis = analyzeDailyFormStructured(daily);
  if (analysis.zone === 'BLACK') return analysis.summary;
  return analysis.instructions;
};

/**
 * Moteur d'adaptation LIVE : convertit les marqueurs [XX% VMA], [XX-YY% VMA], [XX% 1RM], [XX-YY% 1RM]
 * en valeurs personnalisées réelles (km/h + allure min/km, ou kg adaptés au groupe musculaire).
 */
export const adaptPrescription = (
  text: string,
  user: UserProfile,
  daily?: DailyForm,
  exerciseName?: string
): string => {
  if (!text) return '';

  const analysis = daily ? analyzeDailyFormStructured(daily) : null;
  const fatigueMod = analysis ? analysis.intensityMultiplier : 1.0;

  let adaptedText = text;

  // Vérification stricte de présence d'une référence VMA réelle (ne jamais inventer 12.0 km/h)
  const t = user.tests || {};
  const hasRealVma = Boolean(
    (t.vamevalPalier && t.vamevalPalier > 0) ||
      (t.lucLegerPalier && t.lucLegerPalier > 0) ||
      (t.cooperDistance && t.cooperDistance > 0) ||
      t.run2400mTime ||
      t.run5kmTime ||
      t.run10kmTime ||
      t.runSemiMarathonTime ||
      t.run20kmTime ||
      t.runMarathonTime ||
      (t.calculatedVMA && t.calculatedVMA > 0)
  );
  const vma = hasRealVma ? calculateVMA(t) : null;

  // 1. Plage VMA : "[80-85% VMA]"
  adaptedText = adaptedText.replace(/\[(\d+)\s*-\s*(\d+)%\s*VMA\]/gi, (_match, p1, p2) => {
    if (!vma) {
      return `⚠ VMA absente (${p1}-${p2}% VMA — test VMA requis)`;
    }
    const s1 = vma * (parseInt(p1, 10) / 100) * fatigueMod;
    const s2 = vma * (parseInt(p2, 10) / 100) * fatigueMod;
    const suffix = fatigueMod < 1 ? ' (adapté)' : '';
    return `${s1.toFixed(1)}-${s2.toFixed(1)} km/h (${formatPaceFromSpeed(s2)} à ${formatPaceFromSpeed(s1)})${suffix}`;
  });

  // 2. Valeur unique VMA : "[80% VMA]"
  adaptedText = adaptedText.replace(/\[(\d+)%\s*VMA\]/gi, (_match, p1) => {
    if (!vma) {
      return `⚠ VMA absente (${p1}% VMA — test VMA requis)`;
    }
    const percent = parseInt(p1, 10);
    const targetSpeed = vma * (percent / 100) * fatigueMod;
    const suffix = fatigueMod < 1 ? ' (adapté fatigue)' : '';
    return `${targetSpeed.toFixed(1)} km/h (${formatPaceFromSpeed(targetSpeed)})${suffix}`;
  });

  // Détection haut vs bas du corps selon le nom d'exercice (ne jamais inventer un 1RM absent)
  const exoLower = (exerciseName || text).toLowerCase();
  const isLowerBody = /squat|jambe|presse|fente|soulev[ée]|deadlift|ischio|quadri|mollet/.test(exoLower);
  const isDeadlift = /soulev[ée]|deadlift/.test(exoLower);

  const rmUpper = t.benchPress1RM && t.benchPress1RM > 0 ? t.benchPress1RM : null;
  const rmLower = isDeadlift
    ? t.deadlift1RM && t.deadlift1RM > 0
      ? t.deadlift1RM
      : t.squat1RM && t.squat1RM > 0
      ? t.squat1RM
      : null
    : t.squat1RM && t.squat1RM > 0
    ? t.squat1RM
    : t.deadlift1RM && t.deadlift1RM > 0
    ? t.deadlift1RM
    : null;

  const targetRM = isLowerBody ? rmLower : rmUpper;
  const roundToEquipStep = (val: number) => Math.max(2.5, Math.round(val / 2.5) * 2.5);

  // 3. Plage 1RM : "[75-80% 1RM]"
  adaptedText = adaptedText.replace(/\[(\d+)\s*-\s*(\d+)%\s*1RM\]/gi, (_match, p1, p2) => {
    if (!targetRM) {
      return `⚠ 1RM absent (${p1}-${p2}% 1RM — test force requis)`;
    }
    const l1 = roundToEquipStep(targetRM * (parseInt(p1, 10) / 100) * fatigueMod);
    const l2 = roundToEquipStep(targetRM * (parseInt(p2, 10) / 100) * fatigueMod);
    const suffix = fatigueMod < 1 ? ' (adapté)' : '';
    return `${l1}–${l2} kg${suffix}`;
  });

  // 4. Valeur unique 1RM : "[75% 1RM]"
  adaptedText = adaptedText.replace(/\[(\d+)%\s*1RM\]/gi, (_match, p1) => {
    if (!targetRM) {
      return `⚠ 1RM absent (${p1}% 1RM — test force requis)`;
    }
    const percent = parseInt(p1, 10);
    const load = roundToEquipStep(targetRM * (percent / 100) * fatigueMod);
    const suffix = fatigueMod < 1 ? ' (adapté fatigue)' : '';
    return `${load} kg (${percent}%)${suffix}`;
  });

  return adaptedText;
};

/**
 * Parseur robuste de temps de repos (ex: "1:30" -> 90s, "2 min" -> 120s, "45 sec" -> 45s)
 */
export const parseRestToSeconds = (restStr?: string): number => {
  if (!restStr) return 0;
  const s = restStr.trim().toLowerCase();
  if (!s || s === '-' || s === '0') return 0;

  // Format MM:SS (ex: "1:30")
  const colonMatch = s.match(/(\d+)\s*:\s*(\d+)/);
  if (colonMatch) {
    return parseInt(colonMatch[1], 10) * 60 + parseInt(colonMatch[2], 10);
  }

  // Format X'YY" (ex: "1'30")
  const primeMatch = s.match(/(\d+)\s*'\s*(\d+)?/);
  if (primeMatch) {
    return parseInt(primeMatch[1], 10) * 60 + (primeMatch[2] ? parseInt(primeMatch[2], 10) : 0);
  }

  // Format "X min"
  const minMatch = s.match(/(\d+(?:[.,]\d+)?)\s*min/);
  if (minMatch) {
    return Math.round(parseFloat(minMatch[1].replace(',', '.')) * 60);
  }

  // Format "X sec" ou "Xs" ou nombre brut
  const secMatch = s.match(/(\d+)/);
  if (secMatch) {
    return parseInt(secMatch[1], 10);
  }

  return 0;
};

// ============================================================================
// OUTILS EXPERTS PRÉPARATION PHYSIQUE (Whoop / TrainingPeaks / Hevy)
// ============================================================================

export interface ReadinessResult {
  score: number; // 0 - 100
  label: 'OPTIMAL' | 'BON' | 'VIGILANCE' | 'REPOS_REQUIS';
  colorClass: string;
  strokeColor: string;
  recommendation: string;
}

/**
 * Score de Disponibilité / Readiness (0–100) façon Whoop / Garmin Body Battery
 */
export const calculateReadinessScore = (daily?: DailyForm): ReadinessResult => {
  if (!daily) {
    return {
      score: 78,
      label: 'BON',
      colorClass: 'text-emerald-600',
      strokeColor: '#10b981',
      recommendation: 'Validez votre bilan du jour pour un indice de disponibilité précis.'
    };
  }
  const sleepPart = (daily.sleepQuality / 10) * 35;
  const fatiguePart = ((10 - daily.fatigueLevel) / 10) * 25;
  const stressPart = ((10 - daily.stressLevel) / 10) * 20;
  const painPart = ((10 - daily.painLevel) / 10) * 20;
  let score = Math.round(sleepPart + fatiguePart + stressPart + painPart);
  if (daily.painLevel >= 6) score = Math.min(score, 32);
  score = Math.max(5, Math.min(100, score));

  if (score >= 78) {
    return {
      score,
      label: 'OPTIMAL',
      colorClass: 'text-emerald-600',
      strokeColor: '#10b981',
      recommendation: 'Feu vert maximal : idéal pour battre un record (PR) ou travailler en zone haute VMA/1RM.'
    };
  }
  if (score >= 60) {
    return {
      score,
      label: 'BON',
      colorClass: 'text-action-600',
      strokeColor: '#e1ad01',
      recommendation: 'Bonne disponibilité : séance nominale avec qualité technique prioritaire.'
    };
  }
  if (score >= 42) {
    return {
      score,
      label: 'VIGILANCE',
      colorClass: 'text-orange-600',
      strokeColor: '#ea580c',
      recommendation: 'Charge modérée recommandée (-15% intensité) et récupération prolongée.'
    };
  }
  return {
    score,
    label: 'REPOS_REQUIS',
    colorClass: 'text-red-600',
    strokeColor: '#dc2626',
    recommendation: 'Priorité absolue à la récupération active, mobilité douce et protocole ORFA.'
  };
};

export interface ACWRResult {
  ratio: number;
  acuteLoad: number;
  chronicLoad: number;
  status: 'SOUS_CHARGE' | 'OPTIMAL' | 'VIGILANCE' | 'SURCHARGE' | 'INSUFFISANT';
  label: string;
  badgeClass: string;
}

/**
 * Ratio Charge Aiguë (7j) / Chronique (28j) — Modèle Gabbett sRPE (durée × RPE)
 */
export const calculateACWR = (logs: { date: string; durationMinutes: number; rpe?: number }[] = []): ACWRResult => {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  let acute = 0;
  let total28 = 0;

  logs.forEach((l) => {
    const diff = now - new Date(l.date).getTime();
    if (diff < 0 || diff > 28 * dayMs) return;
    const load = (l.durationMinutes || 30) * (l.rpe || 6);
    total28 += load;
    if (diff <= 7 * dayMs) acute += load;
  });

  const chronic = Math.round(total28 / 4);
  if (total28 === 0) {
    return {
      ratio: 0,
      acuteLoad: 0,
      chronicLoad: 0,
      status: 'INSUFFISANT',
      label: 'Données insuffisantes',
      badgeClass: 'bg-gray-100 text-gray-600'
    };
  }

  const ratio = chronic > 0 ? Number((acute / chronic).toFixed(2)) : 1.0;
  if (ratio < 0.8) {
    return {
      ratio,
      acuteLoad: Math.round(acute),
      chronicLoad: chronic,
      status: 'SOUS_CHARGE',
      label: 'Sous-charge (< 0.8)',
      badgeClass: 'bg-blue-100 text-blue-800'
    };
  }
  if (ratio <= 1.3) {
    return {
      ratio,
      acuteLoad: Math.round(acute),
      chronicLoad: chronic,
      status: 'OPTIMAL',
      label: 'Zone Optimale (0.8–1.3)',
      badgeClass: 'bg-emerald-100 text-emerald-800'
    };
  }
  if (ratio <= 1.5) {
    return {
      ratio,
      acuteLoad: Math.round(acute),
      chronicLoad: chronic,
      status: 'VIGILANCE',
      label: 'Vigilance (1.3–1.5)',
      badgeClass: 'bg-amber-100 text-amber-800'
    };
  }
  return {
    ratio,
    acuteLoad: Math.round(acute),
    chronicLoad: chronic,
    status: 'SURCHARGE',
    label: 'Risque Surcharge (> 1.5)',
    badgeClass: 'bg-red-100 text-red-800'
  };
};

/**
 * Calcule le nombre de semaines consécutives avec au moins 1 séance (Streak régularité)
 */
export const calculateWeeklyStreak = (logs: { date: string }[] = []): number => {
  if (logs.length === 0) return 0;
  const weekKey = (d: Date) => {
    const tmp = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = tmp.getDay() || 7;
    tmp.setDate(tmp.getDate() - day + 1);
    return `${tmp.getFullYear()}-${tmp.getMonth()}-${tmp.getDate()}`;
  };
  const activeWeeks = new Set(logs.map((l) => weekKey(new Date(l.date))));
  let streak = 0;
  const cursor = new Date();
  while (streak < 52) {
    if (activeWeeks.has(weekKey(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 7);
    } else if (streak === 0) {
      // Tolère que la semaine en cours ne soit pas encore commencée
      cursor.setDate(cursor.getDate() - 7);
      if (!activeWeeks.has(weekKey(cursor))) break;
    } else {
      break;
    }
  }
  return streak;
};

/**
 * Calculateur de disques olympiques par côté (barre 20 kg ou 15 kg)
 */
export interface PlateBreakdown {
  barKg: number;
  targetKg: number;
  achievedKg: number;
  perSide: { kg: number; color: string; label: string }[];
}

export const calculatePlateBreakdown = (targetKg: number, barKg = 20): PlateBreakdown => {
  const platesCatalog = [
    { kg: 25, color: 'bg-red-600 text-white', label: '25' },
    { kg: 20, color: 'bg-blue-600 text-white', label: '20' },
    { kg: 15, color: 'bg-yellow-400 text-military-950', label: '15' },
    { kg: 10, color: 'bg-emerald-600 text-white', label: '10' },
    { kg: 5, color: 'bg-gray-100 text-military-900 border border-gray-300', label: '5' },
    { kg: 2.5, color: 'bg-zinc-900 text-white', label: '2.5' },
    { kg: 1.25, color: 'bg-slate-400 text-white', label: '1.25' }
  ];

  let remainingSide = Math.max(0, (targetKg - barKg) / 2);
  const perSide: { kg: number; color: string; label: string }[] = [];

  for (const plate of platesCatalog) {
    while (remainingSide + 0.001 >= plate.kg) {
      perSide.push(plate);
      remainingSide -= plate.kg;
    }
  }

  const achievedKg = barKg + perSide.reduce((acc, p) => acc + p.kg * 2, 0);
  return { barKg, targetKg, achievedKg, perSide };
};

/**
 * Grille de zones de force (% 1RM) pour préparateurs physiques & pratiquants
 */
export const buildStrengthZonesTable = (oneRM: number) => {
  const safeRM = Math.max(20, oneRM || 60);
  const rows = [
    { pct: 95, reps: '1–2', zone: 'Force Maximale' },
    { pct: 90, reps: '3–4', zone: 'Force Pure' },
    { pct: 85, reps: '5–6', zone: 'Force / Puissance' },
    { pct: 80, reps: '7–8', zone: 'Force-Hypertrophie' },
    { pct: 75, reps: '9–10', zone: 'Hypertrophie PPO' },
    { pct: 70, reps: '11–12', zone: 'Volume Musculaire' },
    { pct: 60, reps: '15+', zone: 'Endurance / Décharge' }
  ];
  return rows.map((r) => ({
    ...r,
    kg: Math.max(2.5, Math.round((safeRM * (r.pct / 100)) / 2.5) * 2.5)
  }));
};

/**
 * Grille de zones VMA & temps de passage sur piste (200m / 400m / 1000m)
 */
export const buildVmaZonesTable = (vmaKmH: number) => {
  const safeVma = Math.max(8, vmaKmH || 14);
  const fmtSplit = (sec: number) => {
    const s = Math.round(sec);
    if (s < 60) return `${s}"`;
    return `${Math.floor(s / 60)}'${String(s % 60).padStart(2, '0')}"`;
  };
  const zones = [
    { pct: 65, label: 'Endurance Fondamentale' },
    { pct: 75, label: 'Aérobie Active' },
    { pct: 85, label: 'Seuil Aérobie / CCPM' },
    { pct: 95, label: 'VMA Longue (400m–800m)' },
    { pct: 100, label: 'VMA Soutenue (30/30)' },
    { pct: 105, label: 'VMA Courte / Sur-vitesse' }
  ];
  return zones.map((z) => {
    const speed = safeVma * (z.pct / 100);
    const secPerKm = 3600 / speed;
    return {
      ...z,
      speedKmH: speed.toFixed(1),
      pacePerKm: `${Math.floor(secPerKm / 60)}'${String(Math.round(secPerKm % 60)).padStart(2, '0')}"/km`,
      split200m: fmtSplit(secPerKm * 0.2),
      split400m: fmtSplit(secPerKm * 0.4),
      split1000m: fmtSplit(secPerKm)
    };
  });
};

/**
 * Génère et télécharge un fichier calendrier universel .ics (Apple Calendar / Google Calendar / Outlook)
 */
export const downloadICSFile = (params: {
  title: string;
  description: string;
  location: string;
  dateStr: string; // YYYY-MM-DD
  timeStart: string; // HH:MM
  timeEnd: string; // HH:MM
}) => {
  const cleanDate = params.dateStr.replace(/-/g, '');
  const cleanStart = `${params.timeStart.replace(':', '')}00`;
  const cleanEnd = `${params.timeEnd.replace(':', '')}00`;
  const nowStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SMART MONIT 1.0//EPMS AAE//FR',
    'BEGIN:VEVENT',
    `UID:sm_${Date.now()}@smartmonit.aae`,
    `DTSTAMP:${nowStamp}`,
    `DTSTART:${cleanDate}T${cleanStart}`,
    `DTEND:${cleanDate}T${cleanEnd}`,
    `SUMMARY:${params.title}`,
    `LOCATION:${params.location}`,
    `DESCRIPTION:${params.description.replace(/\n/g, '\\n')}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SmartMonit_${params.title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 32)}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
