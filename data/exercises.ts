import { ExerciseLibraryItem, JobType, MovementPattern } from '../types';
import { resolveExerciseVisual } from '../utils/exerciseVisuals';

/**
 * Référentiel National d'Exercices SMART MONIT 1.0 (112 exercices inventoriés, classés & enrichis PIA 7.1.1) :
 * - 50 exercices de Musculation (Pectoraux, Dos, Épaules, Bras, Jambes, Chaîne Postérieure, Core)
 * - 20 exercices de Pilates (Méthode contrôlée : Centrage, Respiration, Alignement)
 * - 20 exercices de Renforcement Musculaire (PPO, CCPM, Gainage, Pliométrie, Fonctionnel)
 * - 9 Machines Cardio courantes
 * - 9 formats de Course à pied
 * - 4 spécialités militaires & sports complémentaires (Marche chargée, Franchissement, Natation, Sports collectifs)
 */
export const EXERCISES_CATALOG_VERSION = 'v6_pro_112';

const RAW_EXERCISE_DATABASE: ExerciseLibraryItem[] = [
  // ===========================================================================
  // 1. MUSCULATION (50 EXERCICES)
  // ===========================================================================
  // Pectoraux (7)
  {
    id: 'ex_muscu_01',
    name: 'Développé Couché Barre',
    category: 'Musculation',
    muscleGroup: 'Pectoraux',
    equipment: 'Barre',
    type: 'Force',
    difficulty: 'Intermédiaire',
    description: 'Mouvement de référence pour la force et le volume des pectoraux, triceps et deltoïdes antérieurs.'
  },
  {
    id: 'ex_muscu_02',
    name: 'Développé Incliné Barre',
    category: 'Musculation',
    muscleGroup: 'Pectoraux',
    equipment: 'Barre',
    type: 'Force',
    difficulty: 'Intermédiaire',
    description: 'Cible prioritairement le faisceau claviculaire (haut) des pectoraux sur banc incliné à 30°.'
  },
  {
    id: 'ex_muscu_03',
    name: 'Développé Couché Haltères',
    category: 'Musculation',
    muscleGroup: 'Pectoraux',
    equipment: 'Haltères',
    type: 'Force',
    difficulty: 'Intermédiaire',
    description: 'Permet une plus grande amplitude et un travail d\'équilibrage unilatéral des pectoraux.'
  },
  {
    id: 'ex_muscu_04',
    name: 'Développé Incliné Haltères',
    category: 'Musculation',
    muscleGroup: 'Pectoraux',
    equipment: 'Haltères',
    type: 'Force',
    difficulty: 'Intermédiaire',
    description: 'Développement du haut des pectoraux avec trajectoire naturelle des épaules.'
  },
  {
    id: 'ex_muscu_05',
    name: 'Écarté Poulie Vis-à-vis',
    category: 'Musculation',
    muscleGroup: 'Pectoraux',
    equipment: 'Poulie',
    type: 'Force',
    difficulty: 'Débutant',
    description: 'Isolation des pectoraux avec tension mécanique continue grâce aux câbles.'
  },
  {
    id: 'ex_muscu_06',
    name: 'Écarté Couché Haltères',
    category: 'Musculation',
    muscleGroup: 'Pectoraux',
    equipment: 'Haltères',
    type: 'Force',
    difficulty: 'Débutant',
    description: 'Étirement contrôlé des fibres pectorales coudes légèrement fléchis.'
  },
  {
    id: 'ex_muscu_07',
    name: 'Chest Press Machine (Pectoraux)',
    category: 'Musculation',
    muscleGroup: 'Pectoraux',
    equipment: 'Machine Guidée',
    type: 'Force',
    difficulty: 'Débutant',
    description: 'Poussée horizontale guidée idéale pour la sécurité articulaire et les séries lourdes.'
  },

  // Dos (9)
  {
    id: 'ex_muscu_08',
    name: 'Tractions Pronation Lestées',
    category: 'Musculation',
    muscleGroup: 'Dos',
    equipment: 'Barre Traction',
    type: 'Force',
    difficulty: 'Avancé',
    description: 'Tirage vertical complet développant la largeur du grand dorsal et la force de préhension.'
  },
  {
    id: 'ex_muscu_09',
    name: 'Tractions Supination (Chin-Ups)',
    category: 'Musculation',
    muscleGroup: 'Dos',
    equipment: 'Barre Traction',
    type: 'Force',
    difficulty: 'Intermédiaire',
    description: 'Tirage vertical paumes vers soi sollicitant fortement le grand dorsal et les biceps.'
  },
  {
    id: 'ex_muscu_10',
    name: 'Tirage Vertical Poitrine Poulie Haute',
    category: 'Musculation',
    muscleGroup: 'Dos',
    equipment: 'Poulie',
    type: 'Force',
    difficulty: 'Débutant',
    description: 'Développement de la largeur dorsale en prise large contrôlée.'
  },
  {
    id: 'ex_muscu_11',
    name: 'Tirage Vertical Prise Serrée Neutre',
    category: 'Musculation',
    muscleGroup: 'Dos',
    equipment: 'Poulie',
    type: 'Force',
    difficulty: 'Débutant',
    description: 'Tirage vertical avec triangle sollicitant le bas des dorsaux et les rhomboïdes.'
  },
  {
    id: 'ex_muscu_12',
    name: 'Rowing Barre Buste Penché',
    category: 'Musculation',
    muscleGroup: 'Dos',
    equipment: 'Barre',
    type: 'Force',
    difficulty: 'Intermédiaire',
    description: 'Exercice polyarticulaire d\'épaisseur du dos (rhomboïdes, trapèzes, grand dorsal).'
  },
  {
    id: 'ex_muscu_13',
    name: 'Rowing Haltère Unilatéral sur Banc',
    category: 'Musculation',
    muscleGroup: 'Dos',
    equipment: 'Haltères',
    type: 'Force',
    difficulty: 'Débutant',
    description: 'Tirage unilatéral permettant de corriger les asymétries tout en protégeant les lombaires.'
  },
  {
    id: 'ex_muscu_14',
    name: 'Tirage Horizontal Poulie Basse',
    category: 'Musculation',
    muscleGroup: 'Dos',
    equipment: 'Poulie',
    type: 'Force',
    difficulty: 'Débutant',
    description: 'Renforcement postural des fixateurs d\'omoplates en position assise.'
  },
  {
    id: 'ex_muscu_15',
    name: 'Rowing T-Bar',
    category: 'Musculation',
    muscleGroup: 'Dos',
    equipment: 'Barre',
    type: 'Force',
    difficulty: 'Intermédiaire',
    description: 'Tirage lourd guidé au sol ciblant la densité du milieu du dos.'
  },
  {
    id: 'ex_muscu_16',
    name: 'Pull-Over Haltère / Poulie',
    category: 'Musculation',
    muscleGroup: 'Dos',
    equipment: 'Haltères',
    type: 'Force',
    difficulty: 'Intermédiaire',
    description: 'Ouverture de la cage thoracique et isolation du grand dorsal bras quasi tendus.'
  },

  // Épaules (7)
  {
    id: 'ex_muscu_17',
    name: 'Développé Militaire Barre Debout',
    category: 'Musculation',
    muscleGroup: 'Épaules',
    equipment: 'Barre',
    type: 'Force',
    difficulty: 'Intermédiaire',
    description: 'Poussée verticale stricte sollicitant deltoïdes, triceps et gainage complet.'
  },
  {
    id: 'ex_muscu_18',
    name: 'Développé Épaules Haltères Assis',
    category: 'Musculation',
    muscleGroup: 'Épaules',
    equipment: 'Haltères',
    type: 'Force',
    difficulty: 'Débutant',
    description: 'Poussée verticale sécurisée sur banc avec amplitude optimale pour les deltoïdes.'
  },
  {
    id: 'ex_muscu_19',
    name: 'Élévations Latérales Haltères',
    category: 'Musculation',
    muscleGroup: 'Épaules',
    equipment: 'Haltères',
    type: 'Force',
    difficulty: 'Débutant',
    description: 'Isolation du faisceau moyen du deltoïde pour la largeur et la stabilité scapulaire.'
  },
  {
    id: 'ex_muscu_20',
    name: 'Élévations Frontales Haltères / Disque',
    category: 'Musculation',
    muscleGroup: 'Épaules',
    equipment: 'Haltères',
    type: 'Force',
    difficulty: 'Débutant',
    description: 'Travail ciblé du faisceau antérieur du deltoïde.'
  },
  {
    id: 'ex_muscu_21',
    name: 'Oiseau Buste Penché Haltères',
    category: 'Musculation',
    muscleGroup: 'Épaules',
    equipment: 'Haltères',
    type: 'Force',
    difficulty: 'Intermédiaire',
    description: 'Renforcement de l\'arrière d\'épaule (deltoïde postérieur) essentiel pour la posture.'
  },
  {
    id: 'ex_muscu_22',
    name: 'Face Pull Poulie Haute',
    category: 'Musculation',
    muscleGroup: 'Épaules',
    equipment: 'Poulie',
    type: 'Force',
    difficulty: 'Débutant',
    description: 'Prévention des blessures d\'épaule : renforce coiffe des rotateurs et trapèzes moyens.'
  },
  {
    id: 'ex_muscu_23',
    name: 'Shrugs Barre / Haltères (Trapèzes)',
    category: 'Musculation',
    muscleGroup: 'Épaules',
    equipment: 'Haltères',
    type: 'Force',
    difficulty: 'Débutant',
    description: 'Élévation contrôlée des épaules pour le renforcement des trapèzes supérieurs et port de charge.'
  },

  // Bras : Biceps & Triceps (8)
  {
    id: 'ex_muscu_24',
    name: 'Curl Biceps Barre Droite / EZ',
    category: 'Musculation',
    muscleGroup: 'Bras',
    equipment: 'Barre',
    type: 'Force',
    difficulty: 'Débutant',
    description: 'Flexion des coudes debout pour la force et le volume des biceps.'
  },
  {
    id: 'ex_muscu_25',
    name: 'Curl Haltères Alterné',
    category: 'Musculation',
    muscleGroup: 'Bras',
    equipment: 'Haltères',
    type: 'Force',
    difficulty: 'Débutant',
    description: 'Flexion avec supination progressive du poignet ciblant le biceps brachial.'
  },
  {
    id: 'ex_muscu_26',
    name: 'Curl Marteau Haltères',
    category: 'Musculation',
    muscleGroup: 'Bras',
    equipment: 'Haltères',
    type: 'Force',
    difficulty: 'Débutant',
    description: 'Prise neutre renforçant le brachial antérieur et le long supinateur (avant-bras).'
  },
  {
    id: 'ex_muscu_27',
    name: 'Curl Poulie Basse',
    category: 'Musculation',
    muscleGroup: 'Bras',
    equipment: 'Poulie',
    type: 'Force',
    difficulty: 'Débutant',
    description: 'Isolation des biceps avec résistance constante sur toute la course.'
  },
  {
    id: 'ex_muscu_28',
    name: 'Extension Triceps Poulie Haute Corde',
    category: 'Musculation',
    muscleGroup: 'Bras',
    equipment: 'Poulie',
    type: 'Force',
    difficulty: 'Débutant',
    description: 'Extension complète des coudes avec écartement de la corde en bas du mouvement.'
  },
  {
    id: 'ex_muscu_29',
    name: 'Barre au Front (Skull Crusher)',
    category: 'Musculation',
    muscleGroup: 'Bras',
    equipment: 'Barre',
    type: 'Force',
    difficulty: 'Intermédiaire',
    description: 'Extension des coudes allongé sur banc ciblant la longue portion du triceps.'
  },
  {
    id: 'ex_muscu_30',
    name: 'Extension Triceps Haltère Nuque',
    category: 'Musculation',
    muscleGroup: 'Bras',
    equipment: 'Haltères',
    type: 'Force',
    difficulty: 'Débutant',
    description: 'Étirement maximal du triceps en position verticale au-dessus de la tête.'
  },
  {
    id: 'ex_muscu_31',
    name: 'Dips Lestés Barres Parallèles',
    category: 'Musculation',
    muscleGroup: 'Bras',
    equipment: 'Station Dips',
    type: 'Force',
    difficulty: 'Avancé',
    description: 'Poussée polyarticulaire lourde pour triceps, bas des pectoraux et épaules.'
  },

  // Jambes & Chaîne Postérieure (14)
  {
    id: 'ex_muscu_32',
    name: 'Squat Arrière (Back Squat)',
    category: 'Musculation',
    muscleGroup: 'Jambes',
    equipment: 'Barre',
    type: 'Force',
    difficulty: 'Avancé',
    description: 'Roi des mouvements de force du bas du corps : quadriceps, fessiers et gainage rachidien.'
  },
  {
    id: 'ex_muscu_33',
    name: 'Front Squat (Squat Avant)',
    category: 'Musculation',
    muscleGroup: 'Jambes',
    equipment: 'Barre',
    type: 'Force',
    difficulty: 'Avancé',
    description: 'Squat barre sur clavicules accentuant le travail des quadriceps et du haut du dos.'
  },
  {
    id: 'ex_muscu_34',
    name: 'Goblet Squat Haltère / Kettlebell',
    category: 'Musculation',
    muscleGroup: 'Jambes',
    equipment: 'Haltères',
    type: 'Force',
    difficulty: 'Débutant',
    description: 'Apprentissage idéal de la profondeur du squat avec charge maintenue devant le sternum.'
  },
  {
    id: 'ex_muscu_35',
    name: 'Presse à Cuisses Inclinée',
    category: 'Musculation',
    muscleGroup: 'Jambes',
    equipment: 'Machine Guidée',
    type: 'Force',
    difficulty: 'Débutant',
    description: 'Développement de la force des quadriceps et fessiers sans compression rachidienne.'
  },
  {
    id: 'ex_muscu_36',
    name: 'Hack Squat Machine',
    category: 'Musculation',
    muscleGroup: 'Jambes',
    equipment: 'Machine Guidée',
    type: 'Force',
    difficulty: 'Intermédiaire',
    description: 'Squat guidé avec appui dorsal ciblant intensément les quadriceps.'
  },
  {
    id: 'ex_muscu_37',
    name: 'Leg Extension (Quadriceps)',
    category: 'Musculation',
    muscleGroup: 'Jambes',
    equipment: 'Machine Guidée',
    type: 'Force',
    difficulty: 'Débutant',
    description: 'Isolation contrôlée des quadriceps et stabilisation du tendon rotulien.'
  },
  {
    id: 'ex_muscu_38',
    name: 'Leg Curl Allongé / Assis (Ischios)',
    category: 'Musculation',
    muscleGroup: 'Chaîne Postérieure',
    equipment: 'Machine Guidée',
    type: 'Force',
    difficulty: 'Débutant',
    description: 'Isolation des ischio-jambiers indispensable pour la prévention des claquages en sprint.'
  },
  {
    id: 'ex_muscu_39',
    name: 'Soulevé de Terre Conventionnel',
    category: 'Musculation',
    muscleGroup: 'Chaîne Postérieure',
    equipment: 'Barre',
    type: 'Force',
    difficulty: 'Avancé',
    description: 'Soulevé complet développant la puissance globale de toute la chaîne postérieure.'
  },
  {
    id: 'ex_muscu_40',
    name: 'Soulevé de Terre Trap Bar',
    category: 'Musculation',
    muscleGroup: 'Chaîne Postérieure',
    equipment: 'Trap Bar',
    type: 'Force',
    difficulty: 'Intermédiaire',
    description: 'Variante ergonomique réduisant le cisaillement lombaire et optimisant l\'explosivité.'
  },
  {
    id: 'ex_muscu_41',
    name: 'Soulevé de Terre Roumain (RDL)',
    category: 'Musculation',
    muscleGroup: 'Chaîne Postérieure',
    equipment: 'Barre',
    type: 'Force',
    difficulty: 'Intermédiaire',
    description: 'Charnière de hanche stricte ciblant ischio-jambiers et fessiers en excentrique.'
  },
  {
    id: 'ex_muscu_42',
    name: 'Hip Thrust Barre (Relevé de Bassin)',
    category: 'Musculation',
    muscleGroup: 'Fessiers',
    equipment: 'Barre',
    type: 'Force',
    difficulty: 'Intermédiaire',
    description: 'Extension de hanche chargée maximisant la force des fessiers et la vitesse de sprint.'
  },
  {
    id: 'ex_muscu_43',
    name: 'Fentes Bulgares Haltères',
    category: 'Musculation',
    muscleGroup: 'Jambes',
    equipment: 'Haltères',
    type: 'Force',
    difficulty: 'Intermédiaire',
    description: 'Travail unilatéral intense corrigeant les déséquilibres droite/gauche.'
  },
  {
    id: 'ex_muscu_44',
    name: 'Fentes Marchées Haltères',
    category: 'Musculation',
    muscleGroup: 'Jambes',
    equipment: 'Haltères',
    type: 'Force',
    difficulty: 'Intermédiaire',
    description: 'Enchaînement dynamique de fentes développant force et stabilité du bassin.'
  },
  {
    id: 'ex_muscu_45',
    name: 'Mollets Debout / Presse (Calf Raise)',
    category: 'Musculation',
    muscleGroup: 'Jambes',
    equipment: 'Machine Guidée',
    type: 'Force',
    difficulty: 'Débutant',
    description: 'Renforcement des gastrocnémiens et soléaires pour la propulsion et la protection achilléenne.'
  },

  // Core / Fonctionnel Chargé (5)
  {
    id: 'ex_muscu_46',
    name: 'Pallof Press Poulie (Anti-Rotation)',
    category: 'Musculation',
    muscleGroup: 'Core / Gainage',
    equipment: 'Poulie',
    type: 'Force',
    difficulty: 'Débutant',
    description: 'Gainage dynamique anti-rotation protégeant le rachis lombaire.'
  },
  {
    id: 'ex_muscu_47',
    name: 'Woodchopper Poulie (Rotation Obliques)',
    category: 'Musculation',
    muscleGroup: 'Core / Gainage',
    equipment: 'Poulie',
    type: 'Force',
    difficulty: 'Intermédiaire',
    description: 'Rotation diagonale du tronc développant la puissance des obliques.'
  },
  {
    id: 'ex_muscu_48',
    name: 'Crunch à la Poulie Haute',
    category: 'Musculation',
    muscleGroup: 'Abdominaux',
    equipment: 'Poulie',
    type: 'Force',
    difficulty: 'Intermédiaire',
    description: 'Flexion du buste lestée à genoux ciblant le grand droit avec charge progressive.'
  },
  {
    id: 'ex_muscu_49',
    name: 'Relevés de Jambes Suspendu Barre',
    category: 'Musculation',
    muscleGroup: 'Abdominaux',
    equipment: 'Barre Traction',
    type: 'Force',
    difficulty: 'Avancé',
    description: 'Élévation contrôlée des jambes en suspension sollicitant abdos profonds et grip.'
  },
  {
    id: 'ex_muscu_50',
    name: 'Farmer Walk (Port de Charge Lourd)',
    category: 'Musculation',
    muscleGroup: 'Full Body',
    equipment: 'Haltères',
    type: 'Polyarticulaire',
    difficulty: 'Intermédiaire',
    description: 'Marche chargée renforçant la poigne, les trapèzes, le gainage et la posture opérationnelle.'
  },

  // ===========================================================================
  // 2. PILATES (20 EXERCICES)
  // ===========================================================================
  {
    id: 'ex_pilates_01',
    name: 'The Hundred (La Centaine Pilates)',
    category: 'Pilates',
    muscleGroup: 'Core / Gainage',
    equipment: 'Tapis',
    type: 'Mobility',
    difficulty: 'Intermédiaire',
    description: 'Exercice fondamental de respiration thoracique et d\'activation profonde du transverse (100 battements de bras).'
  },
  {
    id: 'ex_pilates_02',
    name: 'Roll-Up Pilates (Enroulé Vertébral)',
    category: 'Pilates',
    muscleGroup: 'Abdominaux',
    equipment: 'Tapis',
    type: 'Mobility',
    difficulty: 'Intermédiaire',
    description: 'Articulation vertèbre par vertèbre de la colonne avec contrôle excentrique abdominal.'
  },
  {
    id: 'ex_pilates_03',
    name: 'Single Leg Stretch (Étirement 1 Jambe)',
    category: 'Pilates',
    muscleGroup: 'Abdominaux',
    equipment: 'Tapis',
    type: 'Mobility',
    difficulty: 'Débutant',
    description: 'Alternance fluide des jambes en gardant le buste relevé et le bassin parfaitement stable.'
  },
  {
    id: 'ex_pilates_04',
    name: 'Double Leg Stretch',
    category: 'Pilates',
    muscleGroup: 'Abdominaux',
    equipment: 'Tapis',
    type: 'Mobility',
    difficulty: 'Intermédiaire',
    description: 'Extension simultanée bras et jambes sans jamais décoller les lombaires du tapis.'
  },
  {
    id: 'ex_pilates_05',
    name: 'Crisscross Pilates (Obliques)',
    category: 'Pilates',
    muscleGroup: 'Abdominaux',
    equipment: 'Tapis',
    type: 'Mobility',
    difficulty: 'Intermédiaire',
    description: 'Rotation contrôlée de la cage thoracique (aisselle vers genou opposé) sans tirer sur la nuque.'
  },
  {
    id: 'ex_pilates_06',
    name: 'Shoulder Bridge (Pont Épaules Pilates)',
    category: 'Pilates',
    muscleGroup: 'Fessiers',
    equipment: 'Tapis',
    type: 'Mobility',
    difficulty: 'Débutant',
    description: 'Déroulement vertébral du bassin activant fessiers, ischios et mobilité lombaire.'
  },
  {
    id: 'ex_pilates_07',
    name: 'Spine Stretch Forward (Étirement Rachis)',
    category: 'Pilates',
    muscleGroup: 'Dos',
    equipment: 'Tapis',
    type: 'Mobility',
    difficulty: 'Débutant',
    description: 'Assis jambes tendues, enroulement vers l\'avant créant de l\'espace intervertébral.'
  },
  {
    id: 'ex_pilates_08',
    name: 'Spine Twist (Rotation Thoracique Assise)',
    category: 'Pilates',
    muscleGroup: 'Core / Gainage',
    equipment: 'Tapis',
    type: 'Mobility',
    difficulty: 'Débutant',
    description: 'Rotation de la colonne vertébrale en auto-grandissement avec maintien des obliques.'
  },
  {
    id: 'ex_pilates_09',
    name: 'The Saw (La Scie Pilates)',
    category: 'Pilates',
    muscleGroup: 'Dos',
    equipment: 'Tapis',
    type: 'Mobility',
    difficulty: 'Débutant',
    description: 'Combinaison de rotation thoracique et flexion vers le pied opposé (chaîne postérieure).'
  },
  {
    id: 'ex_pilates_10',
    name: 'Swan Dive Prep (Extension Dorsale)',
    category: 'Pilates',
    muscleGroup: 'Dos',
    equipment: 'Tapis',
    type: 'Mobility',
    difficulty: 'Débutant',
    description: 'Extension douce du haut du dos à plat ventre renforçant les érecteurs du rachis.'
  },
  {
    id: 'ex_pilates_11',
    name: 'Swimming Pilates (Nage au Sol)',
    category: 'Pilates',
    muscleGroup: 'Dos',
    equipment: 'Tapis',
    type: 'Mobility',
    difficulty: 'Intermédiaire',
    description: 'Battements alternés bras/jambes opposés à plat ventre avec nombril décollé du tapis.'
  },
  {
    id: 'ex_pilates_12',
    name: 'Single Leg Kick',
    category: 'Pilates',
    muscleGroup: 'Chaîne Postérieure',
    equipment: 'Tapis',
    type: 'Mobility',
    difficulty: 'Débutant',
    description: 'En appui sur avant-bras, double flexion dynamique du genou pour étirer le quadriceps et renforcer les ischios.'
  },
  {
    id: 'ex_pilates_13',
    name: 'Side Kick Series (Battements Latéraux)',
    category: 'Pilates',
    muscleGroup: 'Fessiers',
    equipment: 'Tapis',
    type: 'Mobility',
    difficulty: 'Débutant',
    description: 'Allongé sur le côté, stabilisation du tronc et travail ciblé du moyen fessier.'
  },
  {
    id: 'ex_pilates_14',
    name: 'Clamshell Pilates (Coquillage)',
    category: 'Pilates',
    muscleGroup: 'Fessiers',
    equipment: 'Tapis',
    type: 'Mobility',
    difficulty: 'Débutant',
    description: 'Ouverture contrôlée du genou en décubitus latéral pour activer les rotateurs externes de hanche.'
  },
  {
    id: 'ex_pilates_15',
    name: 'Teaser Pilates (Équilibre Fessier V)',
    category: 'Pilates',
    muscleGroup: 'Abdominaux',
    equipment: 'Tapis',
    type: 'Mobility',
    difficulty: 'Avancé',
    description: 'Posture emblématique de contrôle central formant un V équilibré entre buste et jambes.'
  },
  {
    id: 'ex_pilates_16',
    name: 'Leg Pull Front (Planche & Élévation)',
    category: 'Pilates',
    muscleGroup: 'Core / Gainage',
    equipment: 'Tapis',
    type: 'Mobility',
    difficulty: 'Intermédiaire',
    description: 'Planche haute bras tendus avec élévation alternée d\'une jambe sans bascule du bassin.'
  },
  {
    id: 'ex_pilates_17',
    name: 'Side Plank Pilates (Gainage Latéral)',
    category: 'Pilates',
    muscleGroup: 'Core / Gainage',
    equipment: 'Tapis',
    type: 'Mobility',
    difficulty: 'Intermédiaire',
    description: 'Alignement latéral sur un appui renforçant obliques, carré des lombes et ceinture scapulaire.'
  },
  {
    id: 'ex_pilates_18',
    name: 'Mermaid Stretch (La Sirène)',
    category: 'Pilates',
    muscleGroup: 'Core / Gainage',
    equipment: 'Tapis',
    type: 'Mobility',
    difficulty: 'Débutant',
    description: 'Inclinaison latérale fluide ouvrant les côtes et assouplissant les obliques et le grand dorsal.'
  },
  {
    id: 'ex_pilates_19',
    name: 'Bird-Dog Pilates (Quadrupédie Croisée)',
    category: 'Pilates',
    muscleGroup: 'Core / Gainage',
    equipment: 'Tapis',
    type: 'Mobility',
    difficulty: 'Débutant',
    description: 'Extension contrôlée bras/jambe opposés maintenant le dos neutre et les hanches alignées.'
  },
  {
    id: 'ex_pilates_20',
    name: 'Rolling Like a Ball (Massage Rachis)',
    category: 'Pilates',
    muscleGroup: 'Core / Gainage',
    equipment: 'Tapis',
    type: 'Mobility',
    difficulty: 'Débutant',
    description: 'Roulade contrôlée en boule par la force du centre (transverse) pour masser et détendre le dos.'
  },

  // ===========================================================================
  // 3. RENFORCEMENT MUSCULAIRE (20 EXERCICES — PPO / CCPM / PDC / FONCTIONNEL)
  // ===========================================================================
  {
    id: 'ex_renfo_01',
    name: 'Pompes Classiques (Standard CCPM)',
    category: 'Renforcement',
    muscleGroup: 'Pectoraux',
    equipment: 'PDC',
    type: 'Force',
    difficulty: 'Débutant',
    description: 'Mouvement officiel du contrôle de la condition physique militaire (CCPM).'
  },
  {
    id: 'ex_renfo_02',
    name: 'Pompes Diamant (Triceps)',
    category: 'Renforcement',
    muscleGroup: 'Bras',
    equipment: 'PDC',
    type: 'Force',
    difficulty: 'Intermédiaire',
    description: 'Mains rapprochées formant un losange pour intensifier le travail des triceps et du centre.'
  },
  {
    id: 'ex_renfo_03',
    name: 'Dips Entre Deux Bancs',
    category: 'Renforcement',
    muscleGroup: 'Bras',
    equipment: 'Banc',
    type: 'Force',
    difficulty: 'Débutant',
    description: 'Renforcement fonctionnel des triceps et épaules sans station spécifique.'
  },
  {
    id: 'ex_renfo_04',
    name: 'Tractions Australiennes / TRX',
    category: 'Renforcement',
    muscleGroup: 'Dos',
    equipment: 'TRX / Barre Basse',
    type: 'Force',
    difficulty: 'Débutant',
    description: 'Tirage horizontal au poids du corps idéal pour progresser vers les tractions strictes.'
  },
  {
    id: 'ex_renfo_05',
    name: 'Air Squats Contrôlés',
    category: 'Renforcement',
    muscleGroup: 'Jambes',
    equipment: 'PDC',
    type: 'Force',
    difficulty: 'Débutant',
    description: 'Squats au poids du corps développant l\'endurance musculaire des membres inférieurs.'
  },
  {
    id: 'ex_renfo_06',
    name: 'Squats Sautés (Squat Jumps)',
    category: 'Renforcement',
    muscleGroup: 'Jambes',
    equipment: 'PDC',
    type: 'Polyarticulaire',
    difficulty: 'Intermédiaire',
    description: 'Pliométrie bas du corps améliorant détente verticale et explosivité.'
  },
  {
    id: 'ex_renfo_07',
    name: 'Fentes Alternées Poids du Corps',
    category: 'Renforcement',
    muscleGroup: 'Jambes',
    equipment: 'PDC',
    type: 'Force',
    difficulty: 'Débutant',
    description: 'Renforcement unilatéral des quadriceps et fessiers avec contrôle de l\'équilibre.'
  },
  {
    id: 'ex_renfo_08',
    name: 'Fentes Sautées (Jumping Lunges)',
    category: 'Renforcement',
    muscleGroup: 'Jambes',
    equipment: 'PDC',
    type: 'Polyarticulaire',
    difficulty: 'Avancé',
    description: 'Fentes explosives alternées développant puissance et résistance lactique.'
  },
  {
    id: 'ex_renfo_09',
    name: 'Chaise Isométrique au Mur',
    category: 'Renforcement',
    muscleGroup: 'Jambes',
    equipment: 'PDC',
    type: 'Force',
    difficulty: 'Débutant',
    description: 'Maintien statique cuisses parallèles au sol pour l\'endurance de force des quadriceps.'
  },
  {
    id: 'ex_renfo_10',
    name: 'Box Jumps (Sauts sur Box)',
    category: 'Renforcement',
    muscleGroup: 'Jambes',
    equipment: 'Box',
    type: 'Polyarticulaire',
    difficulty: 'Intermédiaire',
    description: 'Sauts pliométriques sur box stabilisant chevilles, genoux et puissance de hanche.'
  },
  {
    id: 'ex_renfo_11',
    name: 'Step-Ups sur Box (Montées Alternées)',
    category: 'Renforcement',
    muscleGroup: 'Jambes',
    equipment: 'Box',
    type: 'Force',
    difficulty: 'Débutant',
    description: 'Montées unilatérales sur caisse simulant le franchissement d\'obstacle et le port de sac.'
  },
  {
    id: 'ex_renfo_12',
    name: 'Gainage Planche Ventrale (CCPM)',
    category: 'Renforcement',
    muscleGroup: 'Core / Gainage',
    equipment: 'Tapis',
    type: 'Force',
    difficulty: 'Débutant',
    description: 'Épreuve officielle CCPM : maintien isométrique sur avant-bras en alignement strict.'
  },
  {
    id: 'ex_renfo_13',
    name: 'Gainage Commando (Coude ↔ Main)',
    category: 'Renforcement',
    muscleGroup: 'Core / Gainage',
    equipment: 'Tapis',
    type: 'Polyarticulaire',
    difficulty: 'Intermédiaire',
    description: 'Passage dynamique de la planche avant-bras à la planche mains sans balancer le bassin.'
  },
  {
    id: 'ex_renfo_14',
    name: 'Superman (Lombaires & Dorsaux)',
    category: 'Renforcement',
    muscleGroup: 'Chaîne Postérieure',
    equipment: 'Tapis',
    type: 'Force',
    difficulty: 'Débutant',
    description: 'Extension douce bras/jambes à plat ventre protégeant la région lombaire.'
  },
  {
    id: 'ex_renfo_15',
    name: 'Sit-Ups / Relevés de Buste',
    category: 'Renforcement',
    muscleGroup: 'Abdominaux',
    equipment: 'Tapis',
    type: 'Force',
    difficulty: 'Débutant',
    description: 'Renforcement dynamique de la sangle abdominale antérieure.'
  },
  {
    id: 'ex_renfo_16',
    name: 'Mountain Climbers',
    category: 'Renforcement',
    muscleGroup: 'Core / Gainage',
    equipment: 'PDC',
    type: 'Polyarticulaire',
    difficulty: 'Intermédiaire',
    description: 'Montées rapides de genoux en appui facial sollicitant abdos, fléchisseurs et cardio.'
  },
  {
    id: 'ex_renfo_17',
    name: 'Burpees Complets',
    category: 'Renforcement',
    muscleGroup: 'Full Body',
    equipment: 'PDC',
    type: 'Polyarticulaire',
    difficulty: 'Intermédiaire',
    description: 'Enchaînement complet passage au sol, pompe et saut vertical explosif.'
  },
  {
    id: 'ex_renfo_18',
    name: 'Kettlebell Swing',
    category: 'Renforcement',
    muscleGroup: 'Chaîne Postérieure',
    equipment: 'Kettlebell',
    type: 'Polyarticulaire',
    difficulty: 'Intermédiaire',
    description: 'Projection balistique des hanches renforçant fessiers, ischios, dos et cardio.'
  },
  {
    id: 'ex_renfo_19',
    name: 'Wall Ball (Lancer Ballon Lesté)',
    category: 'Renforcement',
    muscleGroup: 'Full Body',
    equipment: 'Med Ball',
    type: 'Polyarticulaire',
    difficulty: 'Intermédiaire',
    description: 'Squat complet suivi d\'un lancer explosif contre cible murale.'
  },
  {
    id: 'ex_renfo_20',
    name: 'Thruster Haltères / Barre',
    category: 'Renforcement',
    muscleGroup: 'Full Body',
    equipment: 'Haltères',
    type: 'Polyarticulaire',
    difficulty: 'Avancé',
    description: 'Combinaison fluide Front Squat + Développé vertical au-dessus de la tête.'
  },

  // ===========================================================================
  // 4. MACHINES CARDIO COURANTES (9 EXERCICES)
  // ===========================================================================
  {
    id: 'ex_cardio_01',
    name: 'Tapis de Course (Treadmill)',
    category: 'Machine Cardio',
    muscleGroup: 'Cardio',
    equipment: 'Tapis de Course',
    type: 'Cardio',
    difficulty: 'Débutant',
    description: 'Travail aérobie, pente ou fractionné VMA contrôlé en salle à vitesse calibrée.'
  },
  {
    id: 'ex_cardio_02',
    name: 'Rameur Concept2 (RowErg)',
    category: 'Machine Cardio',
    muscleGroup: 'Full Body',
    equipment: 'Rameur',
    type: 'Cardio',
    difficulty: 'Intermédiaire',
    description: 'Cardio complet sans impact mobilisant 85 % de la masse musculaire (jambes, dos, bras).'
  },
  {
    id: 'ex_cardio_03',
    name: 'BikeErg Concept2 (Vélo Stationnaire)',
    category: 'Machine Cardio',
    muscleGroup: 'Jambes',
    equipment: 'Vélo Erg',
    type: 'Cardio',
    difficulty: 'Débutant',
    description: 'Vélo à résistance à air idéal pour le travail au seuil, en endurance ou sans impact articulaire.'
  },
  {
    id: 'ex_cardio_04',
    name: 'Vélo Elliptique (Cross-Trainer)',
    category: 'Machine Cardio',
    muscleGroup: 'Full Body',
    equipment: 'Elliptique',
    type: 'Cardio',
    difficulty: 'Débutant',
    description: 'Mouvement fluide bras + jambes sans choc articulaire (parfait en reprise ou décharge).'
  },
  {
    id: 'ex_cardio_05',
    name: 'SkiErg Concept2',
    category: 'Machine Cardio',
    muscleGroup: 'Dos',
    equipment: 'SkiErg',
    type: 'Cardio',
    difficulty: 'Intermédiaire',
    description: 'Machine cardio ciblant le haut du corps, les dorsaux et la sangle abdominale.'
  },
  {
    id: 'ex_cardio_06',
    name: 'Assault AirBike (Vélo à Bras)',
    category: 'Machine Cardio',
    muscleGroup: 'Full Body',
    equipment: 'AirBike',
    type: 'Cardio',
    difficulty: 'Avancé',
    description: 'Ergomètre haute intensité combinant poussée/tirage des bras et pédalage des jambes.'
  },
  {
    id: 'ex_cardio_07',
    name: 'Stepper / Escalier (StairMaster)',
    category: 'Machine Cardio',
    muscleGroup: 'Jambes',
    equipment: 'Stepper',
    type: 'Cardio',
    difficulty: 'Intermédiaire',
    description: 'Simulation de montée d\'escaliers développant puissance des fessiers, quadriceps et souffle.'
  },
  {
    id: 'ex_cardio_08',
    name: 'Vélo Semi-Allongé (Rééducation)',
    category: 'Machine Cardio',
    muscleGroup: 'Jambes',
    equipment: 'Vélo Allongé',
    type: 'Cardio',
    difficulty: 'Débutant',
    description: 'Cardio doux avec soutien lombaire intégral adapté aux protocoles ORFA ou douleurs dorsales.'
  },
  {
    id: 'ex_cardio_09',
    name: 'Corde à Sauter (Single / Double Unders)',
    category: 'Machine Cardio',
    muscleGroup: 'Cardio',
    equipment: 'Corde à Sauter',
    type: 'Cardio',
    difficulty: 'Intermédiaire',
    description: 'Travail cardio, coordination, pliométrie légère et réactivité des appuis.'
  },

  // ===========================================================================
  // 5. COURSE À PIED — SÉANCES & FORMATS PISTE / EXTÉRIEUR (9 EXERCICES)
  // ===========================================================================
  {
    id: 'ex_course_01',
    name: 'Course Endurance Fondamentale (65–70% VMA)',
    category: 'Course',
    muscleGroup: 'Cardio',
    equipment: 'Piste / Extérieur',
    type: 'Cardio',
    difficulty: 'Débutant',
    description: 'Footing en aisance respiratoire développant la capillarisation et le socle aérobie.'
  },
  {
    id: 'ex_course_02',
    name: 'Fractionné VMA 30/30 (95–105% VMA)',
    category: 'Course',
    muscleGroup: 'Cardio',
    equipment: 'Piste / Extérieur',
    type: 'Cardio',
    difficulty: 'Intermédiaire',
    description: 'Alternance 30 sec rapides / 30 sec trot actif pour élever la VO2max et la VMA.'
  },
  {
    id: 'ex_course_03',
    name: 'VMA Courte 200m Piste (100–105% VMA)',
    category: 'Course',
    muscleGroup: 'Cardio',
    equipment: 'Piste Athlétisme',
    type: 'Cardio',
    difficulty: 'Avancé',
    description: 'Répétitions rapides sur 200m avec récupération courte pour la vitesse aérobie.'
  },
  {
    id: 'ex_course_04',
    name: 'VMA Longue 400m Piste (95% VMA)',
    category: 'Course',
    muscleGroup: 'Cardio',
    equipment: 'Piste Athlétisme',
    type: 'Cardio',
    difficulty: 'Avancé',
    description: 'Tours de piste calibrés développant la capacité à soutenir un haut % de VMA.'
  },
  {
    id: 'ex_course_05',
    name: 'Course au Seuil Aérobie (80–85% VMA)',
    category: 'Course',
    muscleGroup: 'Cardio',
    equipment: 'Piste / Extérieur',
    type: 'Cardio',
    difficulty: 'Intermédiaire',
    description: 'Blocs soutenus de 6 à 12 min améliorant la tolérance à l\'effort et l\'allure CCPM 2400m.'
  },
  {
    id: 'ex_course_06',
    name: 'Fartlek Nature (Jeu d\'Allures)',
    category: 'Course',
    muscleGroup: 'Cardio',
    equipment: 'Extérieur / Parcours',
    type: 'Cardio',
    difficulty: 'Intermédiaire',
    description: 'Variations d\'allures libres ou chronométrées sur terrain varié / parcours GPX.'
  },
  {
    id: 'ex_course_07',
    name: 'Sprint & Travail en Côtes',
    category: 'Course',
    muscleGroup: 'Jambes',
    equipment: 'Extérieur / Parcours',
    type: 'Cardio',
    difficulty: 'Avancé',
    description: 'Montées explosives développant la puissance de poussée, la foulée et la force des mollets/fessiers.'
  },
  {
    id: 'ex_course_08',
    name: 'Test / Allure Spécifique 2400m CCPM',
    category: 'Course',
    muscleGroup: 'Cardio',
    equipment: 'Piste Athlétisme',
    type: 'Cardio',
    difficulty: 'Avancé',
    description: 'Calibrage d\'allure sur 6 tours de piste pour optimiser la performance à l\'épreuve CCPM.'
  },
  {
    id: 'ex_course_09',
    name: 'Footing Récupération Active (< 60% VMA)',
    category: 'Course',
    muscleGroup: 'Cardio',
    equipment: 'Piste / Extérieur',
    type: 'Cardio',
    difficulty: 'Débutant',
    description: 'Course très souple favorisant le drainage et la récupération entre deux séances intenses.'
  },

  // ===========================================================================
  // 6. SPÉCIALITÉS MILITAIRES & SPORTS COMPLÉMENTAIRES (4 EXERCICES)
  // ===========================================================================
  {
    id: 'ex_mil_01',
    name: 'Marche Chargée Tactique (Sac / Gilet)',
    category: 'Marche / Franchissement',
    muscleGroup: 'Full Body',
    equipment: 'Gilet / Sac Lesté',
    type: 'Polyarticulaire',
    difficulty: 'Intermédiaire',
    description: 'Marche rapide avec charge opérationnelle (10 à 20 kg) sur distance calibrée.'
  },
  {
    id: 'ex_mil_02',
    name: 'Franchissement d\'Obstacles / Parcours Combattant',
    category: 'Marche / Franchissement',
    muscleGroup: 'Full Body',
    equipment: 'Parcours Obstacle',
    type: 'Polyarticulaire',
    difficulty: 'Avancé',
    description: 'Enchaînement franchissement, grimper, ramper et appuis dynamiques opérationnels.'
  },
  {
    id: 'ex_mil_03',
    name: 'Natation Crawl / Brasse (Séance Bassin)',
    category: 'Natation',
    muscleGroup: 'Full Body',
    equipment: 'Piscine',
    type: 'Cardio',
    difficulty: 'Intermédiaire',
    description: 'Travail cardio-respiratoire déchargé en milieu aquatique, idéal en récupération ou PPO.'
  },
  {
    id: 'ex_mil_04',
    name: 'Sports Collectifs / Jeux d\'Opposition',
    category: 'Sports Collectifs',
    muscleGroup: 'Cardio',
    equipment: 'Terrain / Gymnase',
    type: 'Cardio',
    difficulty: 'Débutant',
    description: 'Cohésion d\'unité, changements de direction, lecture de jeu et filière intermittente.'
  }
];

const inferMovementPattern = (ex: ExerciseLibraryItem): MovementPattern => {
  const s = ex.name.toLowerCase();
  if (ex.category === 'Course' || ex.category === 'Machine Cardio' || ex.category === 'Natation' || ex.category === 'Sports Collectifs') {
    return 'CARDIO';
  }
  if (ex.category === 'Marche / Franchissement' || s.includes('farmer')) return 'CARRY';
  if (ex.category === 'Pilates' && !/(hundred|roll-up|teaser|crisscross|plank|pull front)/.test(s)) return 'MOBILITY';
  if (/(gainage|planche|plank|pallof|woodchopper|crunch|sit-up|relevés de jambes|hundred|roll-up|stretch|crisscross|teaser|bird-dog|climber)/.test(s)) return 'CORE';
  if (/(traction pronation|traction supination|tirage vertical|skierg)/.test(s)) return 'PULL_V';
  if (/(rowing|tirage horizontal|australienne|face pull|oiseau|pull-over)/.test(s)) return 'PULL_H';
  if (/(militaire|développé épaules|élévations|shrug|thruster|wall ball)/.test(s)) return 'PUSH_V';
  if (/(développé|écarté|chest press|pompe|dips|triceps|barre au front|curl)/.test(s)) return 'PUSH_H';
  if (/(soulevé|deadlift|hip thrust|bridge|leg curl|kettlebell swing|superman|single leg kick|side kick|clamshell)/.test(s)) return 'HIP_DOM';
  if (/(squat|presse|fente|chaise|box|step-up|leg extension|mollet)/.test(s)) return 'KNEE_DOM';
  return 'CORE';
};

const inferContraindications = (pattern: MovementPattern, name: string): string[] => {
  const s = name.toLowerCase();
  if (pattern === 'KNEE_DOM' || s.includes('course') || s.includes('box')) return ['genou', 'cheville'];
  if (pattern === 'HIP_DOM' && /(soulevé|deadlift|barre)/.test(s)) return ['lombaires'];
  if (pattern === 'PUSH_V' || pattern === 'PULL_V') return ['épaule'];
  if (pattern === 'PUSH_H') return ['épaule', 'poignet'];
  if (pattern === 'CARRY') return ['lombaires', 'épaule'];
  return [];
};

const inferJobProfiles = (ex: ExerciseLibraryItem, pattern: MovementPattern): JobType[] => {
  if (ex.category === 'Pilates' || pattern === 'MOBILITY' || pattern === 'CORE') {
    return [JobType.PN, JobType.ADMIN, JobType.TECH, JobType.FUSCO];
  }
  if (pattern === 'PULL_H' || ex.name.toLowerCase().includes('face pull') || ex.name.toLowerCase().includes('pallof')) {
    return [JobType.TECH, JobType.ADMIN, JobType.PN];
  }
  if (pattern === 'CARRY' || ex.category === 'Marche / Franchissement' || ex.name.toLowerCase().includes('burpee')) {
    return [JobType.FUSCO, JobType.TECH];
  }
  if (ex.category === 'Course' || ex.category === 'Machine Cardio') {
    return [JobType.FUSCO, JobType.ADMIN, JobType.PN, JobType.TECH];
  }
  return [JobType.FUSCO, JobType.TECH, JobType.ADMIN];
};

const inferSubstitutes = (ex: ExerciseLibraryItem, pattern: MovementPattern): string[] => {
  if (pattern === 'KNEE_DOM') return ['Air Squats Contrôlés', 'Fentes Alternées Poids du Corps', 'Goblet Squat Haltère / Kettlebell'];
  if (pattern === 'HIP_DOM') return ['Shoulder Bridge (Pont Épaules Pilates)', 'Soulevé de Terre Trap Bar', 'Kettlebell Swing'];
  if (pattern === 'PUSH_H') return ['Pompes Classiques (Standard CCPM)', 'Développé Couché Haltères', 'Chest Press Machine (Pectoraux)'];
  if (pattern === 'PUSH_V') return ['Développé Épaules Haltères Assis', 'Élévations Latérales Haltères', 'Face Pull Poulie Haute'];
  if (pattern === 'PULL_V' || pattern === 'PULL_H') return ['Tractions Australiennes / TRX', 'Rowing Haltère Unilatéral sur Banc', 'Tirage Horizontal Poulie Basse'];
  if (pattern === 'CARDIO') return ['BikeErg Concept2 (Vélo Stationnaire)', 'Rameur Concept2 (RowErg)', 'Vélo Elliptique (Cross-Trainer)'];
  return ['Gainage Planche Ventrale (CCPM)', 'Bird-Dog Pilates (Quadrupédie Croisée)'];
};

export const EXERCISE_DATABASE: ExerciseLibraryItem[] = RAW_EXERCISE_DATABASE.map((ex) => {
  const pattern = ex.movementPattern || inferMovementPattern(ex);
  const visual = resolveExerciseVisual(ex.name, ex.type);
  return {
    ...ex,
    movementPattern: pattern,
    secondaryMuscles: ex.secondaryMuscles || visual.secondaryMuscles,
    cues: ex.cues || visual.cues,
    commonMistakes: ex.commonMistakes || visual.commonMistakes,
    contraindicatedPainZones: ex.contraindicatedPainZones || inferContraindications(pattern, ex.name),
    adaptedJobProfiles: ex.adaptedJobProfiles || inferJobProfiles(ex, pattern),
    substitutes: (ex.substitutes || inferSubstitutes(ex, pattern)).filter((s) => s !== ex.name),
    regressions: ex.regressions || [visual.scaledOption],
    progressions: ex.progressions || (ex.difficulty === 'Débutant' ? ['Augmenter la charge (+5%) ou le tempo excentrique (3-1-1-0)'] : ['Ajouter une pause isométrique 2s ou réduire la récupération'])
  };
});
