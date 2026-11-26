import { Equipment, ExerciseLibraryItem, JobType, WorkSchedule } from '../../../types';
import { analyzeDailyFormStructured, JOB_PROFILES_DB } from '../../../utils/biometrics';
import {
  IAIProvider,
  FlashSessionRequest,
  FullProgramRequest,
  SessionAdaptationRequest
} from '../types';

const normalizeText = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const equipmentMatches = (requirement: string, equipment: Equipment[]): boolean => {
  const normalizedRequirement = normalizeText(requirement);
  if (!normalizedRequirement || /(aucun|aucune|poids du corps|bodyweight|sans materiel|sol libre)/.test(normalizedRequirement)) {
    return true;
  }
  const requirements = normalizedRequirement.split(/[,/+]| et /).map((part) => part.trim()).filter(Boolean);
  return requirements.every((part) =>
    equipment.some((item) => {
      const name = normalizeText(item.name);
      return name.includes(part) || part.includes(name);
    })
  );
};

const findExercise = (
  exerciseName: string,
  library: ExerciseLibraryItem[]
): ExerciseLibraryItem | undefined => {
  const name = normalizeText(exerciseName);
  return library.find((item) => normalizeText(item.name) === name) ||
    library.find((item) => {
      const candidate = normalizeText(item.name);
      return candidate.length >= 5 && name.length >= 5 && (candidate.includes(name) || name.includes(candidate));
    });
};

/**
 * Filtre les exercices contre-indiqués en fonction de la zone douloureuse déclarée.
 */
const isExerciseContraindicated = (exerciseName: string, painZone?: string): boolean => {
  if (!painZone || !painZone.trim()) return false;
  const ex = normalizeText(exerciseName);
  const pain = normalizeText(painZone);

  if (pain.includes('genou') || pain.includes('rotul') || pain.includes('quadri')) {
    return /(squat|fente|saut|box jump|burpee|course|sprint|presse)/.test(ex);
  }
  if (pain.includes('dos') || pain.includes('lomb') || pain.includes('rachis') || pain.includes('colonne')) {
    return /(souleve de terre|deadlift|squat arriere|good morning|rowing barre|burpee|sit-up|crunch)/.test(ex);
  }
  if (pain.includes('epaule') || pain.includes('coiffe') || pain.includes('deltoid')) {
    return /(developpe|pompe|traction|dips|militaire|arrache|overhead|epaule|tirage vertical)/.test(ex);
  }
  if (pain.includes('cheville') || pain.includes('pied') || pain.includes('mollet') || pain.includes('achille')) {
    return /(course|fractionne|sprint|corde|saut|box jump|fente|footing)/.test(ex);
  }
  if (pain.includes('poignet') || pain.includes('coude') || pain.includes('avant-bras')) {
    return /(pompe|developpe|barre|traction|dips|burpee|planche bras tendus)/.test(ex);
  }
  return false;
};

/**
 * Variantes de mobilité ciblées à partir de la zone sensible déclarée.
 */
const getPainCorrectiveExercise = (painZone?: string) => {
  const pain = normalizeText(painZone || '');
  if (pain.includes('dos') || pain.includes('lomb')) {
    return {
      exercise: 'Décompression Rachis & Bird-Dog Contrôlé',
      prescription: '3 séries x 8 reps lentes / côté',
      tempo: '3-2-3',
      rest: '0:45'
    };
  }
  if (pain.includes('epaule')) {
    return {
      exercise: 'Mobilité Scapulaire & Rotations Externes Élastique',
      prescription: '3 séries x 12 reps sans douleur',
      tempo: '3-1-2',
      rest: '0:45'
    };
  }
  if (pain.includes('genou')) {
    return {
      exercise: 'Pont Fessier & Gainage Isométrique Chaîne Postérieure',
      prescription: '3 séries x 12 reps contrôlées',
      tempo: '2-2-2',
      rest: '0:45'
    };
  }
  return {
    exercise: 'Mobilité Articulaire Globale & Respiration Diaphragmatique',
    prescription: '3 x 45 sec amplitude confortable',
    tempo: 'Lent et contrôlé',
    rest: '0:30'
  };
};

/**
 * Décode un contenu base64 en texte UTF-8 lorsque le fichier importé est textuel (CSV/TXT/JSON/MD).
 */
const tryDecodeBase64Text = (base64Data: string, mimeType: string): string | null => {
  const isTextLike =
    mimeType.startsWith('text/') ||
    mimeType.includes('csv') ||
    mimeType.includes('json') ||
    mimeType.includes('xml');
  if (!isTextLike) return null;
  try {
    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return null;
  }
};

/**
 * Assistant algorithmique local, disponible hors ligne sans transmettre de données personnelles.
 */
export class AlgorithmicProvider implements IAIProvider {
  readonly id = 'algorithmic' as const;
  readonly label = 'Assistant local SmartMonit';
  readonly sovereigntyNote =
    'Propositions calculées localement dans le navigateur, sans appel à un service IA externe.';

  isConfigured(): boolean {
    return true;
  }

  async generateFlashSession(req: FlashSessionRequest): Promise<any> {
    const {
      anonUser,
      dailyForm,
      locationLabel,
      sessionType,
      durationMinutes,
      exerciseLibrary,
      availableEquipment
    } = req;
    const analysis = analyzeDailyFormStructured(dailyForm);
    const jobGuidance = JOB_PROFILES_DB[anonUser.jobType] || JOB_PROFILES_DB[JobType.ADMIN];
    const hasGym = availableEquipment.some((e) => e.category === 'Musculation');
    const hasCardio = availableEquipment.some((e) => e.category === 'Cardio');
    const isShiftWorker =
      anonUser.workSchedule === WorkSchedule.SHIFT ||
      anonUser.workSchedule === WorkSchedule.ON_CALL;

    // 1. Sécurité sanitaire prioritaire : Zones NOIRE & ROUGE
    if (analysis.zone === 'BLACK' || analysis.zone === 'RED') {
      const blocks: any[] = [
        {
          exercise: 'Mobilité Thoracique & Ouverture Cage',
          prescription: '3 x 10 rotations lentes / côté',
          tempo: 'Très lent',
          rest: '0:30'
        },
        {
          exercise: 'Étirement Psoas & Mobilité Bassin',
          prescription: '2 x 45 sec / côté',
          tempo: 'Statique doux',
          rest: '0:20'
        },
        {
          exercise: 'Activation Transverse & Gainage Doux au Sol',
          prescription: '3 x 30 sec respiration contrôlée',
          tempo: 'Contrôlé',
          rest: '0:45'
        }
      ];
      if (dailyForm.painZone) {
        blocks.unshift(getPainCorrectiveExercise(dailyForm.painZone));
      }
      if (analysis.zone === 'RED' && !isExerciseContraindicated('Marche active', dailyForm.painZone)) {
        blocks.push({
          exercise: hasCardio ? 'Vélo Erg / Marche Active Douce' : 'Marche Active Souple',
          prescription: `${Math.min(15, Math.max(8, Math.round(durationMinutes * 0.3)))} min à [55% VMA]`,
          tempo: 'Souple',
          rest: '0'
        });
      }
      return {
        title: `Récupération active & mobilité (${durationMinutes} min)`,
        description: 'Proposition de récupération à revoir avec votre coach selon votre ressenti.',
        equipmentNeeded: ['Tapis de sol'],
        warmup: '5 min de respiration calme et de mobilité articulaire confortable.',
        mainBlock: blocks,
        cooldown: '5 min de retour au calme et hydratation.',
        advice: `${analysis.summary}${
          analysis.orfaRecommended ? ' Si la fatigue persiste, privilégiez la récupération et échangez avec votre coach.' : ''
        }`
      };
    }

    // 2. Calibrage biométrique selon forme, durée et horaires
    const intensityPct = analysis.zone === 'ORANGE' ? 65 : isShiftWorker ? 72 : 78;
    const vmaPct = analysis.zone === 'ORANGE' ? 82 : 95;
    const setsCount = durationMinutes >= 55 ? 4 : durationMinutes >= 35 ? 3 : 2;
    const typeLower = normalizeText(sessionType);
    const shiftAdvice = isShiftWorker
      ? ' Horaires décalés/garde : privilégiez la qualité technique et hydratez-vous régulièrement.'
      : '';
    const painAdvice = dailyForm.painZone
      ? ` Zone déclarée (${dailyForm.painZone}) : les mouvements à risque ont été filtrés/adaptés.`
      : '';

    // 3. CARDIO / COURSE / CCPM
    if (typeLower.includes('course') || typeLower.includes('cardio') || typeLower.includes('endurance') || typeLower.includes('vma')) {
      const hasLowerPain = isExerciseContraindicated('Course', dailyForm.painZone);
      if (hasLowerPain) {
        return {
          title: `Cardio Sans Impact Protégé — ${locationLabel} (${durationMinutes} min)`,
          description: `Développement aérobie sans impact articulaire (protection ${dailyForm.painZone}).`,
          equipmentNeeded: hasCardio ? ['Rameur / BikeErg / Vélo'] : ['Tapis de sol'],
          warmup: '8 min mobilité haut du corps + mise en route progressive très douce.',
          mainBlock: [
            {
              exercise: hasCardio ? 'Intervalles Rameur / Vélo sans impact' : 'Circuit Gainage Dynamique Haut du Corps',
              prescription: `${setsCount + 2} x (2 min effort modéré / 1 min récup)`,
              tempo: 'Fluide sans à-coup',
              rest: '1:00'
            },
            getPainCorrectiveExercise(dailyForm.painZone),
            {
              exercise: 'Gainage Planche & Transverse',
              prescription: `${setsCount} x 45 sec`,
              tempo: 'Isométrique',
              rest: '0:45'
            }
          ],
          cooldown: '6 min respiration profonde et relâchement musculaire.',
          advice: `Séance adaptée sans impact pour préserver la zone "${dailyForm.painZone}".${shiftAdvice}`
        };
      }

      const repsPerBlock = durationMinutes >= 50 ? 10 : durationMinutes >= 35 ? 8 : 6;
      return {
        title: `Séance Cardio VMA — ${locationLabel} (${durationMinutes} min)`,
        description: `Développement aérobie calibré sur votre VMA (${anonUser.vmaKmH} km/h) et profil ${anonUser.jobType}.`,
        equipmentNeeded: hasCardio ? ['Piste ou Cardio (Tapis / Rameur / BikeErg)'] : ['Chaussures de running', 'Chronomètre'],
        warmup: '10 min footing progressif à [65% VMA] + gammes athlétiques (montées de genoux, talons-fesses, déroulés).',
        mainBlock: [
          {
            exercise: 'Fractionné 30/30 — Bloc 1',
            prescription: `${repsPerBlock} x (30s à [${vmaPct}% VMA] / 30s trot actif)`,
            tempo: 'Régulier',
            rest: '2:30'
          },
          {
            exercise: 'Récupération Active Inter-Bloc',
            prescription: '2 min 30 marche rapide / hydratation',
            tempo: 'Souple',
            rest: '0',
            isRecovery: true,
            durationSeconds: 150
          },
          {
            exercise: 'Fractionné 30/30 — Bloc 2',
            prescription: `${repsPerBlock} x (30s à [${vmaPct}% VMA] / 30s trot actif)`,
            tempo: 'Régulier',
            rest: '1:30'
          },
          ...(durationMinutes >= 45
            ? [
                {
                  exercise: 'Gainage Planche & Anti-Rotation',
                  prescription: '3 x 45 sec',
                  tempo: 'Isométrique',
                  rest: '0:45'
                }
              ]
            : [])
        ],
        cooldown: '8 min footing lent à [60% VMA] + mobilité chevilles et hanches.',
        advice: `Adaptation métier : ${jobGuidance.constraints[0].solution}${shiftAdvice}${painAdvice}`
      };
    }

    // 4. Mobilité et posture
    if (typeLower.includes('mobilit') || typeLower.includes('posture') || typeLower.includes('recup') || typeLower.includes('orfa')) {
      return {
        title: `Mobilité & posture (${durationMinutes} min)`,
        description: `Proposition adaptée au profil renseigné (${anonUser.jobType}).`,
        equipmentNeeded: ['Tapis de sol'],
        warmup: '5 min respiration diaphragmatique + déverrouillage cervical, scapulaire et coxo-fémoral.',
        mainBlock: [
          ...(dailyForm.painZone ? [getPainCorrectiveExercise(dailyForm.painZone)] : []),
          { exercise: 'Ouverture Thoracique & Rhomboïdes', prescription: `${setsCount} séries x 12 reps`, tempo: '3-2-3', rest: '0:45' },
          { exercise: 'Étirement Psoas & Mobilité Hanche 90/90', prescription: '3 x 40 sec / côté', tempo: 'Fluide', rest: '0:20' },
          { exercise: 'Pont Fessier Unilatéral', prescription: `${setsCount} séries x 12 reps / jambe`, tempo: '2-2-2', rest: '0:45' },
          { exercise: 'Gainage Planche & Transverse', prescription: `${setsCount} x 45 sec`, tempo: 'Isométrique', rest: '0:45' }
        ],
        cooldown: '5 min relâchement global au sol et cohérence cardiaque.',
        advice: `${jobGuidance.constraints[0].solution}${shiftAdvice}`
      };
    }

    // 5. MUSCULATION / FORCE (avec sélection intelligente depuis la bibliothèque + filtrage douleur)
    if (hasGym && (typeLower.includes('muscu') || typeLower.includes('force') || typeLower.includes('renfo'))) {
      const candidateExercises = [
        { exercise: 'Squat Arrière', prescription: `${setsCount} séries x 8 reps à [${intensityPct}% 1RM]`, tempo: '3-1-1-0', rest: '2:00' },
        { exercise: 'Développé Couché Barre', prescription: `${setsCount} séries x 8 reps à [${intensityPct}% 1RM]`, tempo: '3-0-1-0', rest: '2:00' },
        { exercise: 'Rowing Barre / Haltères', prescription: `${setsCount} séries x 10 reps à [${Math.max(55, intensityPct - 6)}% 1RM]`, tempo: '2-1-2-0', rest: '1:30' },
        { exercise: 'Fentes Bulgares Haltères', prescription: '3 séries x 10 reps / jambe', tempo: '2-1-1-0', rest: '1:15' },
        { exercise: 'Pallof Press (Anti-Rotation)', prescription: '3 séries x 12 reps / côté', tempo: 'Contrôlé', rest: '1:00' },
        { exercise: 'Face Pull Poulie Haute (Prévention Épaules)', prescription: '3 séries x 15 reps', tempo: '2-2-2-0', rest: '1:00' }
      ];

      // Complète avec la bibliothèque locale si elle contient des exercices pertinents
      const libMuscu = exerciseLibrary
        .filter((e) => normalizeText(e.type).includes('muscu') || normalizeText(e.type).includes('renfo'))
        .filter((e) => !isExerciseContraindicated(e.name, dailyForm.painZone))
        .slice(0, 2)
        .map((e) => ({
          exercise: e.name,
          prescription: `${setsCount} séries x 10 reps à [${Math.max(55, intensityPct - 5)}% 1RM]`,
          tempo: '2-1-2-0',
          rest: '1:30'
        }));

      const safeBlock = candidateExercises.filter((b) => !isExerciseContraindicated(b.exercise, dailyForm.painZone));
      const targetCount = durationMinutes >= 55 ? 5 : durationMinutes >= 35 ? 4 : 3;
      const finalBlock = [...safeBlock, ...libMuscu].slice(0, targetCount);
      if (dailyForm.painZone) {
        finalBlock.push(getPainCorrectiveExercise(dailyForm.painZone));
      }

      return {
        title: `Renforcement musculaire — ${locationLabel} (${durationMinutes} min)`,
        description: `Proposition construite à partir des références de force renseignées et du profil ${anonUser.jobType}.`,
        equipmentNeeded: availableEquipment.slice(0, 4).map((e) => e.name),
        warmup: '8 min cardio léger + mobilité épaules/hanches + 2 séries de chauffe progressives.',
        mainBlock: finalBlock,
        cooldown: '5 min décompression rachis et étirements doux.',
        advice: `${jobGuidance.constraints[0].solution}${shiftAdvice}${painAdvice}`
      };
    }

    // 6. Entraînement fonctionnel et poids du corps
    const circuitCandidates = [
      { exercise: 'Air Squats Contrôlés', prescription: `${setsCount} séries x 18 reps`, tempo: '2-1-1-0', rest: '0:45' },
      { exercise: 'Pompes classiques', prescription: `${setsCount} séries x 12-15 reps`, tempo: '2-0-1-0', rest: '1:00' },
      { exercise: 'Fentes Alternées Dynamiques', prescription: `${setsCount} séries x 10 reps / jambe`, tempo: 'Contrôlé', rest: '0:45' },
      { exercise: 'Tirage Inversé / Rowing Élastique', prescription: `${setsCount} séries x 12 reps`, tempo: '2-1-2-0', rest: '0:45' },
      { exercise: 'Gainage Planche & Superman', prescription: `${setsCount} x (40s Planche + 30s Superman)`, tempo: 'Isométrique', rest: '1:00' },
      { exercise: 'Mountain Climbers Contrôlés', prescription: `${setsCount} x 35 sec`, tempo: 'Rythmé', rest: '0:45' }
    ];
    const safeCircuit = circuitCandidates
      .filter((c) => !isExerciseContraindicated(c.exercise, dailyForm.painZone))
      .slice(0, durationMinutes >= 45 ? 5 : 4);
    if (dailyForm.painZone) {
      safeCircuit.push(getPainCorrectiveExercise(dailyForm.painZone));
    }

    return {
      title: `Circuit Opérationnel ${sessionType} — ${locationLabel} (${durationMinutes} min)`,
      description: `Entraînement fonctionnel adapté au profil renseigné (${anonUser.jobType}).`,
      equipmentNeeded: ['Poids du corps', 'Tapis de sol'],
      warmup: '6 min mobilité articulaire complète + 2 tours d\'activation progressive.',
      mainBlock: safeCircuit,
      cooldown: '5 min marche lente et respiration abdominale profonde.',
      advice: `${analysis.summary} ${jobGuidance.constraints[0].solution}${shiftAdvice}${painAdvice}`
    };
  }

  async generateFullProgram(req: FullProgramRequest): Promise<any> {
    const { anonUser, goal, sessionsPerWeek, weeks, allowedLocations } = req;
    const sessions: any[] = [];
    const locDefault = allowedLocations[0] || 'Installation Base';
    const goalLower = normalizeText(goal);
    const isCardioGoal = /(vma|course|endurance|marathon|10km|ccpm|cardio)/.test(goalLower);
    const isForceGoal = /(force|muscu|hypertrophie|masse|puissance)/.test(goalLower);
    const daySlots = sessionsPerWeek <= 2 ? [1, 4] : sessionsPerWeek === 3 ? [1, 3, 5] : sessionsPerWeek === 4 ? [1, 2, 4, 6] : [1, 2, 3, 5, 6];

    for (let w = 1; w <= weeks; w++) {
      const isDeload = w % 4 === 0;
      const pct = isDeload ? 60 : Math.min(86, 68 + ((w - 1) % 4) * 5);
      const vmaTarget = isDeload ? 82 : Math.min(100, 90 + ((w - 1) % 4) * 3);

      for (let d = 1; d <= sessionsPerWeek; d++) {
        const dayNum = daySlots[(d - 1) % daySlots.length];
        const isCardio = isCardioGoal ? d % 3 !== 2 : isForceGoal ? d % 3 === 0 : d % 2 === 0;
        const isUpper = d % 2 === 1;

        const titleSuffix = isCardio
          ? d % 4 === 0
            ? 'Endurance Fondamentale & Seuil'
            : 'Fractionné VMA & Gainage'
          : isUpper
          ? 'Force Haut du Corps & Prévention'
          : 'Force Bas du Corps & Puissance';

        sessions.push({
          weekNumber: w,
          dayNumber: dayNum,
          title: `S${w}J${d} — ${isDeload ? '[Décharge 3:1] ' : ''}${titleSuffix}`,
          type: isCardio ? 'CARDIO' : 'MUSCU',
          locationName: allowedLocations[(d - 1) % Math.max(1, allowedLocations.length)] || locDefault,
          description: `${
            isDeload ? 'Semaine de récupération prévue dans le cycle; ajustez-la selon la réponse à l’entraînement.' : 'Progression proposée, à ajuster selon la récupération et les progrès observés.'
          } Objectif : ${goal}.`,
          durationMinutes: isDeload ? 35 : 45,
          content: {
            warmup: isCardio
              ? '10 min footing progressif [65% VMA] + gammes athlétiques.'
              : '8 min cardio doux + mobilité épaules/hanches + 2 séries d\'activation.',
            mainBlock: isCardio
              ? d % 4 === 0
                ? [
                    { exercise: 'Course au Seuil Aérobie', prescription: `${isDeload ? 15 : 25} min à [${isDeload ? 75 : 82}% VMA]`, tempo: 'Constant', rest: '0' },
                    { exercise: 'Gainage Planche & Transverse', prescription: '3 x 45 sec', tempo: 'Isométrique', rest: '0:45' }
                  ]
                : [
                    { exercise: 'Fractionné VMA 30/30', prescription: `${isDeload ? 6 : 10} x (30s à [${vmaTarget}% VMA] / 30s trot)`, tempo: 'Régulier', rest: '2:30' },
                    { exercise: 'Gainage Latéral & Anti-Rotation', prescription: '3 x 35 sec / côté', tempo: 'Isométrique', rest: '0:45' }
                  ]
              : isUpper
              ? [
                  { exercise: 'Développé Couché Barre', prescription: `${isDeload ? 3 : 4} séries x 8 reps à [${pct}% 1RM]`, tempo: '3-0-1-0', rest: '2:00' },
                  { exercise: 'Rowing Barre / Haltères', prescription: `${isDeload ? 3 : 4} séries x 10 reps à [${Math.max(55, pct - 5)}% 1RM]`, tempo: '2-1-2-0', rest: '1:30' },
                  { exercise: 'Tractions / Tirage Vertical', prescription: '3 séries x 8-10 reps', tempo: '2-1-2-0', rest: '1:30' },
                  { exercise: 'Face Pull & Pallof Press', prescription: '3 séries x 12 reps', tempo: 'Contrôlé', rest: '1:00' }
                ]
              : [
                  { exercise: 'Squat Arrière', prescription: `${isDeload ? 3 : 4} séries x 8 reps à [${pct}% 1RM]`, tempo: '3-1-1-0', rest: '2:00' },
                  { exercise: 'Soulevé de Terre Roumain', prescription: `${isDeload ? 3 : 4} séries x 10 reps à [${Math.max(55, pct - 8)}% 1RM]`, tempo: '3-1-1-0', rest: '1:45' },
                  { exercise: 'Fentes Alternées', prescription: '3 séries x 10 reps / jambe', tempo: 'Contrôlé', rest: '1:15' },
                  { exercise: 'Gainage Planche & Transverse', prescription: '3 x 50 sec', tempo: 'Isométrique', rest: '0:45' }
                ],
            cooldown: '5 min retour au calme, hydratation et étirements doux.',
            advice: JOB_PROFILES_DB[anonUser.jobType]?.constraints[0].solution || 'Privilégiez une progression graduelle et une technique maîtrisée.'
          }
        });
      }
    }
    return { programTitle: `Programme ${goal} (${weeks} semaines)`, sessions };
  }

  async suggestSessionModifications(req: SessionAdaptationRequest): Promise<any> {
    const {
      anonUser,
      dailyForm,
      session,
      availableEquipment = [],
      exerciseLibrary = []
    } = req;
    const analysis = analyzeDailyFormStructured(dailyForm);
    if (analysis.zone === 'BLACK' || analysis.zone === 'RED') {
      const recoverySession = await this.generateFlashSession({
        anonUser,
        dailyForm,
        locationLabel: session.locationName || 'Base',
        sessionType: 'Mobilité',
        durationMinutes: 25,
        exerciseLibrary,
        availableEquipment
      });
      return {
        ...recoverySession,
        adaptationNotes: [
          'La charge a été remplacée par une proposition de récupération à valider avec le pratiquant.',
          ...(analysis.zone === 'BLACK'
            ? ['Une douleur élevée a été signalée : ne pas poursuivre l’activité en cas de douleur et demander un avis professionnel de santé.']
            : [])
        ]
      };
    }

    const existingMain = session.content?.mainBlock || [];
    const adaptationNotes: string[] = [];
    const adaptedMain = existingMain.map((b: any) => {
      if (isExerciseContraindicated(b.exercise || '', dailyForm.painZone)) {
        adaptationNotes.push(`${b.exercise} remplacé en raison de la zone sensible déclarée.`);
        return getPainCorrectiveExercise(dailyForm.painZone);
      }

      const exercise = findExercise(b.exercise || '', exerciseLibrary);
      if (exercise?.equipment && !equipmentMatches(exercise.equipment, availableEquipment)) {
        const substitutions = exercise.substitutes || [];
        const substitute = exerciseLibrary.find((candidate) => {
          const namedSubstitute = substitutions.some(
            (name) =>
              normalizeText(name) === normalizeText(candidate.name) ||
              normalizeText(name) === normalizeText(candidate.id)
          );
          const similarMovement =
            Boolean(exercise.movementPattern) &&
            candidate.movementPattern === exercise.movementPattern;
          return (
            candidate.id !== exercise.id &&
            (namedSubstitute || similarMovement) &&
            equipmentMatches(candidate.equipment, availableEquipment) &&
            !isExerciseContraindicated(candidate.name, dailyForm.painZone)
          );
        });

        if (substitute) {
          adaptationNotes.push(`${b.exercise} remplacé par ${substitute.name} : ${exercise.equipment} non disponible.`);
          return { ...b, exercise: substitute.name };
        }

        adaptationNotes.push(
          `${b.exercise} nécessite du matériel non disponible (${exercise.equipment}) : choisir une variante avant le lancement.`
        );
      }

      let prescription = b.prescription || '';
      if (analysis.zone === 'ORANGE') {
        // Réduction douce de -10% sur les pourcentages prescrits
        prescription = prescription.replace(/\[(\d+)%\s*(1RM|VMA)\]/gi, (_m: string, val: string, unit: string) => {
          const reduced = Math.max(55, Number(val) - 10);
          return `[${reduced}% ${unit.toUpperCase()}]`;
        });
      }
      return {
        ...b,
        prescription,
        rest: analysis.zone === 'ORANGE' ? `${b.rest || '1:30'} (+30s récup)` : b.rest
      };
    });
    const adaptedExercises = adaptedMain.map((block: any) =>
      findExercise(block.exercise || '', exerciseLibrary)
    );
    const adaptedEquipmentNeeded = adaptedExercises.every(Boolean)
      ? Array.from(new Set(adaptedExercises.map((item) => item?.equipment).filter(Boolean)))
      : session.content?.equipmentNeeded || [];

    return {
      title: `${session.title} (Adaptée ${analysis.zone === 'GREEN' ? 'Nominale' : 'Vigilance Forme'})`,
      description: session.description,
      equipmentNeeded: adaptedEquipmentNeeded,
      warmup: session.content?.warmup || '8 min échauffement articulaire progressif.',
      mainBlock: adaptedMain,
      cooldown: session.content?.cooldown || '5 min retour au calme.',
      advice: `${analysis.summary}${
        dailyForm.painZone
          ? ` Zone signalée (${dailyForm.painZone}) : les propositions de substitution doivent être validées avant l’effort.`
          : ''
      }`,
      adaptationNotes,
      requiresCoachReview: true
    };
  }

  async parseTrainingFile(base64Data: string, mimeType: string): Promise<any> {
    const decoded = tryDecodeBase64Text(base64Data, mimeType);
    if (decoded) {
      // Tentative JSON direct
      try {
        const parsed = JSON.parse(decoded);
        if (parsed && Array.isArray(parsed.sessions)) return parsed;
      } catch {}

      // Parseur texte / CSV / Markdown intelligent
      const lines = decoded
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 2);
      const exercises = lines
        .filter((l) => /(\d+\s*[xX×]\s*\d+|sec|min|1RM|VMA)/i.test(l))
        .slice(0, 10)
        .map((line) => {
          const parts = line.split(/[;,\-:|]/).map((p) => p.trim()).filter(Boolean);
          return {
            name: parts[0] || line.slice(0, 45),
            reps: parts[1] || '10 reps',
            sets: 3,
            rest: parts[2] || '1:30'
          };
        });
      if (exercises.length > 0) {
        return {
          title: lines[0]?.slice(0, 60) || 'Programme Importé (Analyse Locale)',
          goal: 'Préparation physique générale',
          sessions: [
            {
              dayNumber: 1,
              title: 'Séance extraite du fichier',
              type: 'MUSCU',
              description: `${exercises.length} exercice(s) détecté(s) automatiquement en local.`,
              exercises
            }
          ]
        };
      }
    }

    return {
      title: 'Programme Importé (Trame Locale Modifiable)',
      goal: 'Préparation physique générale',
      sessions: [
        {
          dayNumber: 1,
          title: 'Séance 1 — Force & Gainage',
          type: 'MUSCU',
          description: 'Trame structurée locale modifiable dans le Program Builder (import texte/CSV/JSON analysé automatiquement).',
          exercises: [
            { name: 'Squat Arrière', reps: '8 à [75% 1RM]', sets: 4, rest: '2:00' },
            { name: 'Développé Couché Barre', reps: '8 à [75% 1RM]', sets: 4, rest: '2:00' },
            { name: 'Gainage Planche & Transverse', reps: '45 sec', sets: 3, rest: '0:45' }
          ]
        },
        {
          dayNumber: 3,
          title: 'Séance 2 — Développement VMA',
          type: 'CARDIO',
          description: 'Travail fractionné aérobie.',
          exercises: [{ name: 'Fractionné 30/30', reps: '2 x 8 reps à [95% VMA]', sets: 2, rest: '3:00' }]
        }
      ]
    };
  }

  async parsePlanningFile(base64Data: string, mimeType: string): Promise<any> {
    const decoded = tryDecodeBase64Text(base64Data, mimeType);
    if (decoded) {
      const dayMap: Record<string, number> = {
        lundi: 1,
        mardi: 2,
        mercredi: 3,
        jeudi: 4,
        vendredi: 5,
        samedi: 6,
        dimanche: 7
      };
      const extracted: any[] = [];
      decoded.split(/\r?\n/).forEach((rawLine) => {
        const line = rawLine.trim();
        if (!line) return;
        const lower = normalizeText(line);
        const dayEntry = Object.entries(dayMap).find(([k]) => lower.includes(k));
        const timeMatch = line.match(/(\d{1,2}[:h]\d{2})\s*[-–aà]\s*(\d{1,2}[:h]\d{2})/i);
        if (dayEntry && timeMatch) {
          const timeStart = timeMatch[1].replace(/h/i, ':').padStart(5, '0');
          const timeEnd = timeMatch[2].replace(/h/i, ':').padStart(5, '0');
          const titleClean = line
            .replace(new RegExp(dayEntry[0], 'i'), '')
            .replace(timeMatch[0], '')
            .replace(/[;|,]+/g, ' ')
            .trim();
          extracted.push({
            title: titleClean || 'Cours collectif',
            dayOfWeek: dayEntry[1],
            timeStart,
            timeEnd,
            locationName: 'Installation sportive',
            instructorName: 'Coach'
          });
        }
      });
      if (extracted.length > 0) {
        return { extractedSessions: extracted };
      }
    }

    return {
      extractedSessions: [
        { title: 'Course & renforcement (exemple)', dayOfWeek: 1, timeStart: '09:00', timeEnd: '10:15', locationName: 'Piste d’athlétisme', instructorName: 'Coach' },
        { title: 'Entraînement fonctionnel (exemple)', dayOfWeek: 3, timeStart: '11:30', timeEnd: '12:30', locationName: 'Salle de sport', instructorName: 'Coach' },
        { title: 'Mobilité & récupération (exemple)', dayOfWeek: 5, timeStart: '10:00', timeEnd: '11:00', locationName: 'Studio', instructorName: 'Coach' }
      ]
    };
  }

  async getRegulatoryInfo(_itemName: string, _itemType: string, localReference: string): Promise<string> {
    return localReference;
  }

  async chatWithCoach(_history: { role: 'user' | 'assistant'; content: string }[], message: string): Promise<string> {
    const q = normalizeText(message);

    if (/(ccpm|luc leger|cooper|2400|pompe|gainage|bareme)/.test(q)) {
      return `**Préparer un test de condition physique :**\n• Choisissez des séances cohérentes avec les épreuves et votre niveau actuel.\n• Alternez les efforts exigeants avec des séances plus faciles et des temps de récupération suffisants.\n• Répétez les gestes du test sans aller systématiquement à l'échec; un coach peut ajuster le volume et l'allure à partir de vos résultats.\n• Les barèmes et modalités varient selon le test : consultez sa documentation officielle.`;
    }

    if (/(vma|allure|cardio|course|courir|fractionne)/.test(q)) {
      return `**Construire une séance d’endurance :**\n• Utilisez un test récent et adapté pour estimer vos zones; ces estimations restent indicatives.\n• La majorité des sorties peut rester à une allure confortable où la conversation est possible.\n• Introduisez les intervalles progressivement, avec une récupération suffisante et une technique stable.\n• Si les sensations s’écartent nettement de l’allure prévue, adaptez ou interrompez la séance.`;
    }

    if (/(1rm|muscu|charge|poids|squat|developpe|force|hypertrophie)/.test(q)) {
      return `**Construire une séance de renforcement :**\n• Choisissez une charge qui permet de garder une exécution maîtrisée et une marge adaptée à votre niveau.\n• Ajustez progressivement répétitions, charge ou volume, sans augmenter toutes les variables à la fois.\n• Prévoyez des récupérations suffisantes; réduisez la charge si la technique se dégrade.\n• Les pourcentages estimés d’un maximum sont indicatifs et ne remplacent pas une évaluation encadrée.`;
    }

    if (/(douleur|mal|bless|genou|dos|lomb|epaule|cheville|tendin)/.test(q)) {
      return `**En cas de douleur :**\n• L’application ne peut pas évaluer une blessure ni poser un diagnostic.\n• Interrompez l’exercice en cas de douleur vive, inhabituelle ou qui s’aggrave; ne cherchez pas à la contourner pour poursuivre à tout prix.\n• Demandez conseil à un professionnel de santé avant de reprendre si la douleur persiste ou vous inquiète.`;
    }

    if (/(sommeil|fatigue|stress|nuit|3x8|garde|orfa|recup)/.test(q)) {
      return `**Adapter l’entraînement à la récupération :**\n• Tenez compte de la qualité du sommeil, de la fatigue et de votre ressenti avant la séance.\n• En cas de fatigue inhabituelle, choisissez une séance plus courte ou plus légère, ou prenez un jour de récupération.\n• Les curseurs de l’application aident à ouvrir la discussion; ils ne constituent pas une évaluation médicale.`;
    }

    if (/(reglement|afnor|norme|controle|registre|securite|materiel)/.test(q)) {
      return `**Vérifier une exigence pour une installation :**\n• Les obligations dépendent du type d’équipement, de son usage, de l’établissement et des textes en vigueur.\n• Vérifiez les références à jour auprès des sources officielles et du responsable compétent.\n• Cette démonstration peut aider à organiser le suivi, mais ne certifie pas la conformité et ne remplace ni une inspection ni un avis juridique.`;
    }

    return `**Assistant SmartMonit — mode local**\nJe peux aider à réfléchir à un objectif d’entraînement, une séance, la récupération, l’usage du matériel ou l’organisation des cours. Les réponses sont des suggestions générales : un coach doit les vérifier et elles ne remplacent pas un avis médical, technique ou juridique.`;
  }
}
