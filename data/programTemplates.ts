import { JobType, Program, ProgramSessionBuilder, ProgramStatus } from '../types';
import { flattenBuilderSessionToLegacy } from '../utils/calculationEngine';

export interface SessionTemplateItem {
  id: string;
  name: string;
  category: 'PPG' | 'CCPM' | 'VMA' | 'RENFO' | 'PN_POST_VOL' | 'MARCHE_FUSCO';
  level: 'Débutant' | 'Intermédiaire' | 'Avancé';
  targetJobProfiles: JobType[];
  tags: string[];
  session: ProgramSessionBuilder;
}

/**
 * 6 séances types prêtes à l'emploi (conformes PIA 7.1.1 : Échauffement / Corps / Retour au calme)
 */
export const SESSION_TEMPLATES: SessionTemplateItem[] = [
  {
    id: 'tpl_ppg_full',
    name: 'Séance Type PPG Complète (Force & Gainage)',
    category: 'PPG',
    level: 'Intermédiaire',
    targetJobProfiles: [JobType.ADMIN, JobType.TECH, JobType.FUSCO],
    tags: ['PPG', 'PIA 7.1.1', 'Full Body'],
    session: {
      id: 'sess_tpl_ppg',
      title: 'PPG Complète — Force & Prévention',
      type: 'MUSCU',
      objective: 'Développement polyarticulaire équilibré poussée/tirage/jambes',
      intensity: 'MODERATE',
      estimatedDurationMin: 50,
      locationName: 'Salle Musculation',
      safetyCues: 'Respecter le tempo contrôlé et la neutralité rachidienne.',
      blocks: [
        {
          id: 'blk_ppg_wu',
          type: 'WARMUP',
          title: 'Échauffement articulaire & cardio',
          rounds: 1,
          exercises: [
            { id: 'ppg_w1', libraryId: 'ex_cardio_02', name: 'Rameur Concept2 (RowErg)', mode: 'RUNNING', sets: 1, durationSeconds: 360, equipment: 'Rameur', muscleGroup: 'Full Body' },
            { id: 'ppg_w2', libraryId: 'ex_pilates_06', name: 'Shoulder Bridge (Pont Épaules Pilates)', mode: 'MOBILITY', sets: 2, reps: '12', rest: '0:30', restSec: 30, equipment: 'Tapis', muscleGroup: 'Fessiers' }
          ]
        },
        {
          id: 'blk_ppg_main',
          type: 'MAIN',
          title: 'Corps de séance — Force PPO',
          rounds: 1,
          exercises: [
            { id: 'ppg_m1', libraryId: 'ex_muscu_32', name: 'Squat Arrière (Back Squat)', mode: 'STRENGTH', sets: 4, reps: '8', percent1RM: 75, load: '[75% 1RM]', tempo: '3-1-1-0', rest: '2:00', restSec: 120, equipment: 'Barre', muscleGroup: 'Jambes', adaptationBounds: { minIntensityDeltaPct: -20, maxIntensityDeltaPct: 5, substitutable: true, approvedAlternatives: ['Goblet Squat Haltère / Kettlebell', 'Presse à Cuisses Inclinée'] } },
            { id: 'ppg_m2', libraryId: 'ex_muscu_01', name: 'Développé Couché Barre', mode: 'STRENGTH', sets: 4, reps: '8', percent1RM: 75, load: '[75% 1RM]', tempo: '3-0-1-0', rest: '2:00', restSec: 120, equipment: 'Barre', muscleGroup: 'Pectoraux', adaptationBounds: { minIntensityDeltaPct: -20, maxIntensityDeltaPct: 5, substitutable: true, approvedAlternatives: ['Pompes Classiques (Standard CCPM)', 'Développé Couché Haltères'] } },
            { id: 'ppg_m3', libraryId: 'ex_muscu_12', name: 'Rowing Barre Buste Penché', mode: 'STRENGTH', sets: 4, reps: '10', percent1RM: 70, load: '[70% 1RM]', tempo: '2-1-2-0', rest: '1:30', restSec: 90, equipment: 'Barre', muscleGroup: 'Dos', adaptationBounds: { minIntensityDeltaPct: -15, maxIntensityDeltaPct: 5, substitutable: true, approvedAlternatives: ['Tractions Australiennes / TRX'] } },
            { id: 'ppg_m4', libraryId: 'ex_muscu_46', name: 'Pallof Press Poulie (Anti-Rotation)', mode: 'MOBILITY', sets: 3, reps: '12', bilateral: true, rest: '1:00', restSec: 60, equipment: 'Poulie', muscleGroup: 'Core / Gainage' }
          ]
        },
        {
          id: 'blk_ppg_cd',
          type: 'COOLDOWN',
          title: 'Retour au calme & mobilité',
          rounds: 1,
          exercises: [
            { id: 'ppg_c1', libraryId: 'ex_pilates_07', name: 'Spine Stretch Forward (Étirement Rachis)', mode: 'MOBILITY', sets: 2, holdSec: 45, rest: '0:20', restSec: 20, equipment: 'Tapis', muscleGroup: 'Dos' }
          ]
        }
      ],
      exercises: []
    }
  },
  {
    id: 'tpl_ccpm_prep',
    name: 'Séance Préparation CCPM (Pompes / Tractions / Abdos / Navette)',
    category: 'CCPM',
    level: 'Intermédiaire',
    targetJobProfiles: [JobType.ADMIN, JobType.TECH, JobType.FUSCO, JobType.PN],
    tags: ['CCPM', 'Barème AAE', 'Poids du corps'],
    session: {
      id: 'sess_tpl_ccpm',
      title: 'Spécifique CCPM — Épreuves Complètes',
      type: 'PPO',
      objective: 'Optimiser les standards CCPM (pompes, gainage, course 2400m / navette)',
      intensity: 'HIGH',
      estimatedDurationMin: 45,
      locationName: 'Piste Athlétisme',
      blocks: [
        {
          id: 'blk_ccpm_wu',
          type: 'WARMUP',
          title: 'Échauffement progressif',
          rounds: 1,
          exercises: [
            { id: 'ccpm_w1', libraryId: 'ex_course_09', name: 'Footing Récupération Active (< 60% VMA)', mode: 'RUNNING', sets: 1, durationSeconds: 480, percentVMA: 65, equipment: 'Piste / Extérieur', muscleGroup: 'Cardio' }
          ]
        },
        {
          id: 'blk_ccpm_run',
          type: 'INTERVALS',
          title: 'Bloc Course Allure Spécifique CCPM',
          rounds: 1,
          exercises: [
            { id: 'ccpm_r1', libraryId: 'ex_course_04', name: 'VMA Longue 400m Piste (95% VMA)', mode: 'RUNNING', sets: 6, distanceMeters: 400, percentVMA: 95, rest: '1:30', restSec: 90, runningSubType: 'INTERVALS', equipment: 'Piste Athlétisme', muscleGroup: 'Cardio', adaptationBounds: { minIntensityDeltaPct: -15, maxIntensityDeltaPct: 5, substitutable: true, approvedAlternatives: ['BikeErg Concept2 (Vélo Stationnaire)'] } }
          ]
        },
        {
          id: 'blk_ccpm_str',
          type: 'CIRCUIT',
          title: 'Circuit Standards CCPM',
          rounds: 3,
          restBetweenBlocksSec: 90,
          exercises: [
            { id: 'ccpm_s1', libraryId: 'ex_renfo_01', name: 'Pompes Classiques (Standard CCPM)', mode: 'BODYWEIGHT', sets: 1, reps: '15-20', rest: '0:45', restSec: 45, equipment: 'PDC', muscleGroup: 'Pectoraux' },
            { id: 'ccpm_s2', libraryId: 'ex_muscu_08', name: 'Tractions Pronation Lestées', mode: 'BODYWEIGHT', sets: 1, reps: '6-10', rest: '0:45', restSec: 45, equipment: 'Barre Traction', muscleGroup: 'Dos', adaptationBounds: { minIntensityDeltaPct: -20, maxIntensityDeltaPct: 0, substitutable: true, approvedAlternatives: ['Tractions Australiennes / TRX'] } },
            { id: 'ccpm_s3', libraryId: 'ex_renfo_12', name: 'Gainage Planche Ventrale (CCPM)', mode: 'MOBILITY', sets: 1, holdSec: 60, rest: '0:45', restSec: 45, equipment: 'Tapis', muscleGroup: 'Core / Gainage' }
          ]
        },
        {
          id: 'blk_ccpm_cd',
          type: 'COOLDOWN',
          title: 'Retour au calme',
          rounds: 1,
          exercises: [
            { id: 'ccpm_c1', libraryId: 'ex_course_09', name: 'Footing Récupération Active (< 60% VMA)', mode: 'RUNNING', sets: 1, durationSeconds: 300, percentVMA: 60, equipment: 'Piste / Extérieur', muscleGroup: 'Cardio' }
          ]
        }
      ],
      exercises: []
    }
  },
  {
    id: 'tpl_vma_seuil',
    name: 'Séance VMA / Seuil (3 x 10\' @80% VMA ou 30/30)',
    category: 'VMA',
    level: 'Intermédiaire',
    targetJobProfiles: [JobType.ADMIN, JobType.FUSCO, JobType.PN, JobType.TECH],
    tags: ['VMA', 'Seuil', 'Course', 'Piste'],
    session: {
      id: 'sess_tpl_vma',
      title: 'Développement Seuil Aérobie — 3 × 10\' @80% VMA',
      type: 'CARDIO',
      objective: 'Élever la vitesse soutenable au seuil aérobie',
      intensity: 'HIGH',
      estimatedDurationMin: 50,
      locationName: 'Piste Athlétisme',
      blocks: [
        {
          id: 'blk_vma_wu',
          type: 'WARMUP',
          title: 'Échauffement footing + gammes',
          rounds: 1,
          exercises: [
            { id: 'vma_w1', libraryId: 'ex_course_01', name: 'Course Endurance Fondamentale (65–70% VMA)', mode: 'RUNNING', sets: 1, durationSeconds: 600, percentVMA: 65, runningSubType: 'CONTINUOUS', equipment: 'Piste / Extérieur', muscleGroup: 'Cardio' }
          ]
        },
        {
          id: 'blk_vma_main',
          type: 'INTERVALS',
          title: 'Blocs Seuil Aérobie',
          rounds: 1,
          exercises: [
            { id: 'vma_m1', libraryId: 'ex_course_05', name: 'Course au Seuil Aérobie (80–85% VMA)', mode: 'RUNNING', sets: 3, durationSeconds: 600, percentVMA: 80, rest: '2:00', restSec: 120, runningSubType: 'THRESHOLD', equipment: 'Piste / Extérieur', muscleGroup: 'Cardio', adaptationBounds: { minIntensityDeltaPct: -15, maxIntensityDeltaPct: 5, substitutable: true, approvedAlternatives: ['BikeErg Concept2 (Vélo Stationnaire)', 'Rameur Concept2 (RowErg)'] } }
          ]
        },
        {
          id: 'blk_vma_cd',
          type: 'COOLDOWN',
          title: 'Retour au calme',
          rounds: 1,
          exercises: [
            { id: 'vma_c1', libraryId: 'ex_course_09', name: 'Footing Récupération Active (< 60% VMA)', mode: 'RUNNING', sets: 1, durationSeconds: 420, percentVMA: 60, equipment: 'Piste / Extérieur', muscleGroup: 'Cardio' }
          ]
        }
      ],
      exercises: []
    }
  },
  {
    id: 'tpl_circuit_renfo',
    name: 'Circuit Renforcement Opérationnel (Sans matériel)',
    category: 'RENFO',
    level: 'Débutant',
    targetJobProfiles: [JobType.ADMIN, JobType.TECH, JobType.FUSCO],
    tags: ['Circuit', 'PDC', 'Terrain'],
    session: {
      id: 'sess_tpl_circ',
      title: 'Circuit Renforcement Fonctionnel (4 Tours)',
      type: 'HIIT',
      objective: 'Endurance de force corps entier utilisable partout',
      intensity: 'MODERATE',
      estimatedDurationMin: 35,
      locationName: 'Extérieur / Gymnase',
      blocks: [
        {
          id: 'blk_circ_wu',
          type: 'WARMUP',
          title: 'Mise en route articulaire',
          rounds: 1,
          exercises: [
            { id: 'circ_w1', libraryId: 'ex_pilates_19', name: 'Bird-Dog Pilates (Quadrupédie Croisée)', mode: 'MOBILITY', sets: 2, reps: '10', bilateral: true, rest: '0:20', restSec: 20, equipment: 'Tapis', muscleGroup: 'Core / Gainage' }
          ]
        },
        {
          id: 'blk_circ_main',
          type: 'CIRCUIT',
          title: 'Circuit 4 Tours (40s travail / 20s récup)',
          rounds: 4,
          restBetweenBlocksSec: 90,
          exercises: [
            { id: 'circ_m1', libraryId: 'ex_renfo_05', name: 'Air Squats Contrôlés', mode: 'BODYWEIGHT', sets: 1, reps: '18', rest: '0:20', restSec: 20, equipment: 'PDC', muscleGroup: 'Jambes' },
            { id: 'circ_m2', libraryId: 'ex_renfo_01', name: 'Pompes Classiques (Standard CCPM)', mode: 'BODYWEIGHT', sets: 1, reps: '12', rest: '0:20', restSec: 20, equipment: 'PDC', muscleGroup: 'Pectoraux' },
            { id: 'circ_m3', libraryId: 'ex_renfo_07', name: 'Fentes Alternées Poids du Corps', mode: 'BODYWEIGHT', sets: 1, reps: '12', bilateral: true, rest: '0:20', restSec: 20, equipment: 'PDC', muscleGroup: 'Jambes' },
            { id: 'circ_m4', libraryId: 'ex_renfo_16', name: 'Mountain Climbers', mode: 'BODYWEIGHT', sets: 1, durationSeconds: 40, rest: '0:20', restSec: 20, equipment: 'PDC', muscleGroup: 'Core / Gainage' }
          ]
        },
        {
          id: 'blk_circ_cd',
          type: 'COOLDOWN',
          title: 'Retour au calme',
          rounds: 1,
          exercises: [
            { id: 'circ_c1', libraryId: 'ex_pilates_18', name: 'Mermaid Stretch (La Sirène)', mode: 'MOBILITY', sets: 2, holdSec: 30, bilateral: true, rest: '0:15', restSec: 15, equipment: 'Tapis', muscleGroup: 'Core / Gainage' }
          ]
        }
      ],
      exercises: []
    }
  },
  {
    id: 'tpl_pn_postvol',
    name: 'Séance Pilote Post-Vol (PN — Décompression & Cervicales)',
    category: 'PN_POST_VOL',
    level: 'Débutant',
    targetJobProfiles: [JobType.PN],
    tags: ['PN', 'Post-Vol', 'Décompression', 'Pilates'],
    session: {
      id: 'sess_tpl_pn',
      title: 'PPS Navigant Post-Vol — Décompression & Stabilisation',
      type: 'PILATES',
      objective: 'Décompression axiale post-facteurs G, stabilisation profonde et drainage doux',
      intensity: 'LOW',
      estimatedDurationMin: 35,
      locationName: 'Dojo / Salle Fitness',
      safetyCues: 'AUCUNE charge axiale lourde. Respiration thoraco-abdominale lente.',
      blocks: [
        {
          id: 'blk_pn_wu',
          type: 'WARMUP',
          title: 'Drainage aérobie doux (< 65% FCmax)',
          rounds: 1,
          exercises: [
            { id: 'pn_w1', libraryId: 'ex_cardio_03', name: 'BikeErg Concept2 (Vélo Stationnaire)', mode: 'RUNNING', sets: 1, durationSeconds: 480, percentVMA: 60, equipment: 'Vélo Erg', muscleGroup: 'Jambes' }
          ]
        },
        {
          id: 'blk_pn_main',
          type: 'MAIN',
          title: 'Stabilisation Segmentaire & Rachis',
          rounds: 1,
          exercises: [
            { id: 'pn_m1', libraryId: 'ex_pilates_06', name: 'Shoulder Bridge (Pont Épaules Pilates)', mode: 'MOBILITY', sets: 3, reps: '12', rest: '0:45', restSec: 45, equipment: 'Tapis', muscleGroup: 'Fessiers' },
            { id: 'pn_m2', libraryId: 'ex_pilates_19', name: 'Bird-Dog Pilates (Quadrupédie Croisée)', mode: 'MOBILITY', sets: 3, reps: '10', bilateral: true, rest: '0:45', restSec: 45, equipment: 'Tapis', muscleGroup: 'Core / Gainage' },
            { id: 'pn_m3', libraryId: 'ex_muscu_22', name: 'Face Pull Poulie Haute', mode: 'STRENGTH', sets: 3, reps: '15', rpe: 6, rest: '1:00', restSec: 60, equipment: 'Poulie', muscleGroup: 'Épaules' },
            { id: 'pn_m4', libraryId: 'ex_pilates_08', name: 'Spine Twist (Rotation Thoracique Assise)', mode: 'MOBILITY', sets: 3, reps: '8', bilateral: true, rest: '0:30', restSec: 30, equipment: 'Tapis', muscleGroup: 'Core / Gainage' }
          ]
        },
        {
          id: 'blk_pn_cd',
          type: 'COOLDOWN',
          title: 'Relaxation ORFA & Décompression',
          rounds: 1,
          exercises: [
            { id: 'pn_c1', libraryId: 'ex_pilates_20', name: 'Rolling Like a Ball (Massage Rachis)', mode: 'MOBILITY', sets: 2, reps: '8', rest: '0:30', restSec: 30, equipment: 'Tapis', muscleGroup: 'Core / Gainage' }
          ]
        }
      ],
      exercises: []
    }
  },
  {
    id: 'tpl_fusco_marche',
    name: 'Marche Chargée & Franchissement Commando (FUSCO)',
    category: 'MARCHE_FUSCO',
    level: 'Avancé',
    targetJobProfiles: [JobType.FUSCO],
    tags: ['FUSCO', 'Marche chargée', 'Franchissement', 'PPS'],
    session: {
      id: 'sess_tpl_fusco',
      title: 'PPS Commando — Marche Chargée & Port de Charge',
      type: 'PPO',
      objective: 'Endurance tactique avec gilet/sac et stabilité de la ceinture lombo-pelvienne',
      intensity: 'HIGH',
      estimatedDurationMin: 75,
      locationName: 'Parcours Obstacle / Extérieur',
      safetyCues: 'Vérifier le serrage du sac (centre de gravité haut), hydratation toutes les 20 min.',
      blocks: [
        {
          id: 'blk_f_wu',
          type: 'WARMUP',
          title: 'Activation chevilles & hanches',
          rounds: 1,
          exercises: [
            { id: 'f_w1', libraryId: 'ex_renfo_11', name: 'Step-Ups sur Box (Montées Alternées)', mode: 'BODYWEIGHT', sets: 2, reps: '12', bilateral: true, rest: '0:30', restSec: 30, equipment: 'Box', muscleGroup: 'Jambes' }
          ]
        },
        {
          id: 'blk_f_main',
          type: 'CONTINUOUS',
          title: 'Marche Tactique & Franchissement',
          rounds: 1,
          exercises: [
            { id: 'f_m1', libraryId: 'ex_mil_01', name: 'Marche Chargée Tactique (Sac / Gilet)', mode: 'LOADED_MARCH', sets: 1, distanceMeters: 8000, carriedLoadKg: 12, targetTimeSec: 4200, equipment: 'Gilet / Sac Lesté', muscleGroup: 'Full Body' },
            { id: 'f_m2', libraryId: 'ex_muscu_50', name: 'Farmer Walk (Port de Charge Lourd)', mode: 'STRENGTH', sets: 4, distanceMeters: 40, loadKg: 24, rest: '1:30', restSec: 90, equipment: 'Haltères', muscleGroup: 'Full Body' }
          ]
        },
        {
          id: 'blk_f_cd',
          type: 'COOLDOWN',
          title: 'Décompression & étirements mollets/rachis',
          rounds: 1,
          exercises: [
            { id: 'f_c1', libraryId: 'ex_pilates_07', name: 'Spine Stretch Forward (Étirement Rachis)', mode: 'MOBILITY', sets: 2, holdSec: 60, rest: '0:20', restSec: 20, equipment: 'Tapis', muscleGroup: 'Dos' }
          ]
        }
      ],
      exercises: []
    }
  }
];

const cloneSessionForWeek = (
  tpl: ProgramSessionBuilder,
  weekNum: number,
  dayOfWeek: number,
  intensityShiftPct: number,
  isDeload: boolean
): ProgramSessionBuilder => {
  const blocks = (tpl.blocks || []).map((b) => ({
    ...b,
    id: `${b.id}_w${weekNum}_${dayOfWeek}`,
    rounds: isDeload && b.rounds && b.rounds > 2 ? b.rounds - 1 : b.rounds,
    exercises: b.exercises.map((e) => ({
      ...e,
      id: `${e.id}_w${weekNum}_${dayOfWeek}`,
      sets: isDeload && e.sets && e.sets > 2 ? Math.max(2, e.sets - 1) : e.sets,
      percent1RM: e.percent1RM ? Math.min(90, Math.max(55, e.percent1RM + intensityShiftPct)) : undefined,
      percentVMA: e.percentVMA ? Math.min(102, Math.max(60, e.percentVMA + Math.round(intensityShiftPct / 2))) : undefined
    }))
  }));
  return {
    ...tpl,
    id: `sess_w${weekNum}_d${dayOfWeek}_${tpl.id}`,
    title: `S${weekNum} — ${isDeload ? '[Décharge] ' : ''}${tpl.title}`,
    dayOfWeek,
    blocks,
    exercises: blocks.flatMap((b) => b.exercises)
  };
};

/**
 * 2 programmes complets multi-semaines de démonstration (prêts à dupliquer / affecter en masse)
 */
export const DEMO_COMPLETE_PROGRAMS: Program[] = (() => {
  const todayStr = new Date().toISOString().split('T')[0];

  const makeProg = (
    id: string,
    title: string,
    goal: string,
    type: Program['type'],
    phaseType: 'PPG' | 'PPS' | 'MIXTE',
    jobs: JobType[],
    s1: ProgramSessionBuilder,
    s2: ProgramSessionBuilder,
    s3: ProgramSessionBuilder
  ): Program => {
    const weeks = [1, 2, 3, 4].map((w) => {
      const isDeload = w === 4;
      const shift = isDeload ? -10 : (w - 1) * 3;
      const sessions = [
        cloneSessionForWeek(s1, w, 1, shift, isDeload),
        cloneSessionForWeek(s2, w, 3, shift, isDeload),
        cloneSessionForWeek(s3, w, 5, shift, isDeload)
      ];
      return {
        id: `w_${id}_${w}`,
        number: w,
        objective: isDeload ? 'Décharge PIA 7.1.1 (-35% volume)' : `Montée en charge progressive S${w}`,
        isDeload,
        sessions,
        isCollapsed: false
      };
    });
    const structure = [
      {
        id: `c_${id}_1`,
        title: `Mésocycle 1 (${phaseType}) — ${title}`,
        objective: goal,
        phaseType,
        weeks,
        isCollapsed: false
      }
    ];
    const flattened = weeks.flatMap((w) =>
      w.sessions.map((sess, idx) =>
        flattenBuilderSessionToLegacy(sess, {
          programId: id,
          weekNumber: w.number,
          dayNumber: sess.dayOfWeek || [1, 3, 5][idx]
        })
      )
    );
    return {
      id,
      userId: '',
      isTemplate: true,
      isSharedNational: true,
      visibility: 'AAE',
      version: 1,
      phaseType,
      level: 'Intermédiaire',
      targetJobProfiles: jobs,
      tags: [phaseType, 'PIA 7.1.1', 'Cycle 3:1'],
      createdByNid: '1234567890',
      createdByName: 'ADJ BARBOTIN Nicolas',
      createdByBase: 'EAR 927',
      title,
      goal,
      status: ProgramStatus.VALIDATED,
      type,
      startDate: todayStr,
      durationWeeks: 4,
      sessionsPerWeek: 3,
      sessions: flattened,
      structure
    };
  };

  return [
    makeProg(
      'prog_demo_ccpm_4w',
      'Programme Directeur CCPM — Cycle 4 Semaines (3:1)',
      'Préparation complète aux épreuves CCPM (2400m, pompes, tractions, gainage) avec individualisation VMA/1RM.',
      'CCPM',
      'MIXTE',
      [JobType.ADMIN, JobType.TECH, JobType.FUSCO, JobType.PN],
      SESSION_TEMPLATES[0].session,
      SESSION_TEMPLATES[2].session,
      SESSION_TEMPLATES[1].session
    ),
    makeProg(
      'prog_demo_tech_tms_4w',
      'Force Utile & Prévention TMS — Mécaniciens (4 Semaines)',
      'Rééquilibrage postural, chaîne postérieure, anti-rotation et endurance aérobie pour personnel technique.',
      'Musculation',
      'PPS',
      [JobType.TECH],
      SESSION_TEMPLATES[0].session,
      SESSION_TEMPLATES[3].session,
      SESSION_TEMPLATES[4].session
    )
  ];
})();
