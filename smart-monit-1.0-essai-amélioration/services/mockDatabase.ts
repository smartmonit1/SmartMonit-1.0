import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { dbFirestore, handleFirestoreError, OperationType } from './firebase';
import {
  UserProfile,
  Program,
  ProgramStatus,
  Infrastructure,
  Equipment,
  InspectionLog,
  UserRole,
  Gender,
  JobType,
  InfrastructureType,
  WorkSchedule,
  ServiceEPMS,
  CollectiveSession,
  ExerciseLibraryItem,
  ActiveSession,
  SportRegistryEntry,
  Session,
  AppNotification,
  SportsRoute,
  RouteType,
  AuthorityHandover,
  AuditLogEntry,
  FacilityBooking,
  MaintenanceTicket
} from '../types';
import { workouts } from '../data/workouts';
import { EXERCISE_DATABASE, EXERCISES_CATALOG_VERSION } from '../data/exercises';
import {
  hashPassword,
  RETENTION_DAYS,
  RGPD_POLICY_VERSION,
  stripSecretsFromUser
} from '../utils/security';

const PREFIX = 'sm_v4_';

// Helpers dates relatives pour que les données démo restent toujours cohérentes
const daysAgoISO = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
};

const daysAgoTimestamp = (days: number, hour = 10): string => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

const stripHtml = (html: string): string =>
  html.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();

// --- RÈGLEMENT INTÉRIEUR PAR DÉFAUT ---
export const DEFAULT_LOCAL_RULES = `Article 1 : Accès et Tenue
L'accès aux installations sportives est réservé au personnel militaire et civil de la Défense autorisé. Une tenue de sport adaptée et propre est exigée. Les chaussures utilisées en salle doivent être propres et exclusivement réservées à cet usage.

Article 2 : Utilisation du Matériel
Le matériel doit être utilisé conformément à sa destination. Après chaque utilisation, les appareils, haltères et tapis doivent être désinfectés et rangés. Il est interdit de laisser tomber brutalement les barres et poids hors zones prévues.

Article 3 : Sécurité et Hygiène (Code du Sport — Art. L.322-2)
L'utilisation d'une serviette est obligatoire sur les appareils et tapis. Tout incident, blessure ou matériel défectueux doit être immédiatement signalé au moniteur EPMS ou via le bouton d'urgence de l'application SMART MONIT.

Article 4 : Statut « En Service » (Directive 17615)
Tout militaire pratiquant en autonomie doit déclarer son lieu de pratique dans SMART MONIT afin d'alimenter le Registre Sport Unité numérique.

Article 5 : Comportement et Responsabilité
Un comportement respectueux envers les usagers et l'encadrement EPMS est exigé. L'administration décline toute responsabilité en cas de vol ou de perte d'effets personnels dans les vestiaires.`;

// --- SERVICES EPMS (NATIONAUX) ---
const MOCK_SERVICES: ServiceEPMS[] = [
  {
    id: 'ear927',
    code: 'EAR 927',
    name: 'Cellule EPMS — EAR 927 Cinq-Mars-la-Pile',
    region: 'Centre-Val de Loire',
    monitorId: '1234567890',
    localRules: DEFAULT_LOCAL_RULES,
    emergencyPhone: '112 / Poste Sécurité EAR 927 (02 47 96 XX XX)',
    orfaContact: 'Moniteur ORFA EAR 927 — Bureau EPMS / Antenne Médicale'
  },
  {
    id: 'ba705',
    code: 'BA 705',
    name: 'Service des Sports — BA 705 Tours',
    region: 'Centre-Val de Loire',
    monitorId: '1234567890',
    localRules: DEFAULT_LOCAL_RULES,
    emergencyPhone: '112 / PC Base BA 705',
    orfaContact: 'Référent ORFA BA 705 — Cellule EPMS'
  },
  {
    id: 'ba105',
    code: 'BA 105',
    name: 'Service des Sports — BA 105 Évreux-Fauville',
    region: 'Normandie',
    monitorId: '1234567890',
    localRules: DEFAULT_LOCAL_RULES,
    emergencyPhone: '112 / PC Base BA 105',
    orfaContact: 'Référent ORFA BA 105 — Cellule EPMS'
  }
];

// --- PARCOURS GPX OFFICIELS ---
const MOCK_ROUTES: SportsRoute[] = [
  {
    id: 'r_ear_1',
    name: 'P1 — Boucle EAR 927 (5,2 km)',
    type: RouteType.RUNNING,
    distanceKm: 5.2,
    elevationMeters: 45,
    description: 'Parcours officiel P1 de l\'EAR 927. Boucle mixte bitume et chemin autour du site.',
    gpxContent: `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="SmartMonit"><trk><name>P1 EAR 927</name><trkseg><trkpt lat="47.3478" lon="0.4614"><ele>85</ele></trkpt><trkpt lat="47.3520" lon="0.4680"><ele>98</ele></trkpt><trkpt lat="47.3560" lon="0.4620"><ele>112</ele></trkpt><trkpt lat="47.3478" lon="0.4614"><ele>85</ele></trkpt></trkseg></trk></gpx>`,
    serviceId: 'ear927'
  },
  {
    id: 'r_ear_2',
    name: 'P2 — Parcours Long Loire (10,5 km)',
    type: RouteType.RUNNING,
    distanceKm: 10.5,
    elevationMeters: 120,
    description: 'Parcours officiel P2 idéal pour l\'endurance fondamentale et la préparation 10 km.',
    gpxContent: `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="SmartMonit"><trk><name>P2 Loire</name><trkseg><trkpt lat="47.3478" lon="0.4614"><ele>85</ele></trkpt><trkpt lat="47.3610" lon="0.4810"><ele>140</ele></trkpt><trkpt lat="47.3478" lon="0.4614"><ele>85</ele></trkpt></trkseg></trk></gpx>`,
    serviceId: 'ear927'
  },
  {
    id: 'r_ear_3',
    name: 'P3 — Trail Coteaux (8,0 km)',
    type: RouteType.RUNNING,
    distanceKm: 8.0,
    elevationMeters: 235,
    description: 'Parcours vallonné avec relances et dénivelé positif pour le renforcement spécifique.',
    gpxContent: `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="SmartMonit"><trk><name>P3 Trail</name><trkseg><trkpt lat="47.3478" lon="0.4614"><ele>85</ele></trkpt><trkpt lat="47.3590" lon="0.4510"><ele>195</ele></trkpt></trkseg></trk></gpx>`,
    serviceId: 'ear927'
  },
  {
    id: 'r_ear_4',
    name: 'VTT1 — Forêt de Cinq-Mars (18 km)',
    type: RouteType.VTT,
    distanceKm: 18.0,
    elevationMeters: 290,
    description: 'Circuit VTT technique en sous-bois avec singles roulants et relances.',
    gpxContent: `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="SmartMonit"><trk><name>VTT1</name><trkseg><trkpt lat="47.3478" lon="0.4614"><ele>85</ele></trkpt><trkpt lat="47.3700" lon="0.4700"><ele>160</ele></trkpt></trkseg></trk></gpx>`,
    serviceId: 'ear927'
  },
  {
    id: 'r_ear_5',
    name: 'Route 1 — Boucle Touraine (42 km)',
    type: RouteType.CYCLING,
    distanceKm: 42.0,
    elevationMeters: 210,
    description: 'Parcours vélo de route sécurisé idéal pour la vélocité et le foncier.',
    gpxContent: `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="SmartMonit"><trk><name>Route 1</name><trkseg><trkpt lat="47.3478" lon="0.4614"><ele>85</ele></trkpt><trkpt lat="47.3900" lon="0.5200"><ele>110</ele></trkpt></trkseg></trk></gpx>`,
    serviceId: 'ear927'
  },
  {
    id: 'r_ba705_1',
    name: 'P1 — Piste & Tour Base BA 705 (6,0 km)',
    type: RouteType.RUNNING,
    distanceKm: 6.0,
    elevationMeters: 30,
    description: 'Boucle officielle course à pied de la Base Aérienne 705 de Tours.',
    gpxContent: `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="SmartMonit"><trk><name>P1 BA 705</name><trkseg><trkpt lat="47.4322" lon="0.7276"><ele>108</ele></trkpt></trkseg></trk></gpx>`,
    serviceId: 'ba705'
  },
  {
    id: 'r_ba105_1',
    name: 'P1 — Parcours Base BA 105 (5,0 km)',
    type: RouteType.RUNNING,
    distanceKm: 5.0,
    elevationMeters: 40,
    description: 'Parcours officiel course à pied BA 105 Évreux.',
    gpxContent: `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="SmartMonit"><trk><name>P1 BA 105</name><trkseg><trkpt lat="49.0287" lon="1.2198"><ele>141</ele></trkpt></trkseg></trk></gpx>`,
    serviceId: 'ba105'
  }
];

// --- INFRASTRUCTURES SPORTIVES (Multi-bases) ---
const MOCK_INFRASTRUCTURES: Infrastructure[] = [
  // EAR 927
  {
    id: 'infra_ear_1',
    name: 'Salle Musculation Principale',
    type: InfrastructureType.GYM_WEIGHTS,
    serviceId: 'ear927',
    status: 'Operational',
    normReference: 'NF EN ISO 20957',
    visualIntervalDays: 30,
    regulatoryIntervalDays: 90,
    lastVisualInspection: daysAgoISO(12),
    lastRegulatoryInspection: daysAgoISO(65)
  },
  {
    id: 'infra_ear_2',
    name: 'Salle Cardio & Biking',
    type: InfrastructureType.GYM_CARDIO,
    serviceId: 'ear927',
    status: 'Operational',
    normReference: 'NF EN ISO 20957',
    visualIntervalDays: 30,
    regulatoryIntervalDays: 90,
    lastVisualInspection: daysAgoISO(24), // WARNING (J-6)
    lastRegulatoryInspection: daysAgoISO(40)
  },
  {
    id: 'infra_ear_3',
    name: 'Cage Cross-Training Extérieure',
    type: InfrastructureType.CROSSFIT_CAGE,
    serviceId: 'ear927',
    status: 'Operational',
    normReference: 'PIA 7.1.1 (Annexe B)',
    visualIntervalDays: 90,
    regulatoryIntervalDays: 365,
    lastVisualInspection: daysAgoISO(98), // EXPIRED (-8j)
    lastRegulatoryInspection: daysAgoISO(200)
  },
  {
    id: 'infra_ear_4',
    name: 'Gymnase & Buts Multisports',
    type: InfrastructureType.SPORTS_GOALS,
    serviceId: 'ear927',
    status: 'Operational',
    normReference: 'NF S52-409',
    visualIntervalDays: 180,
    regulatoryIntervalDays: 730,
    lastVisualInspection: daysAgoISO(165), // WARNING (J-15)
    lastRegulatoryInspection: daysAgoISO(300)
  },
  {
    id: 'infra_ear_5',
    name: 'Dojo / Salle Combat & Mobilité',
    type: InfrastructureType.DOJO,
    serviceId: 'ear927',
    status: 'Operational',
    normReference: 'PIA 7.1.1 (Annexe B)',
    visualIntervalDays: 90,
    regulatoryIntervalDays: 365,
    lastVisualInspection: daysAgoISO(30),
    lastRegulatoryInspection: daysAgoISO(120)
  },
  {
    id: 'infra_ear_6',
    name: 'Piste Athlétisme & Zone CCPM',
    type: InfrastructureType.TRACK,
    serviceId: 'ear927',
    status: 'Operational',
    normReference: 'PIA 7.1.1 (Annexe B)',
    visualIntervalDays: 90,
    regulatoryIntervalDays: 365,
    lastVisualInspection: daysAgoISO(20),
    lastRegulatoryInspection: daysAgoISO(180)
  },
  {
    id: 'infra_ear_7',
    name: 'Piscine de Luynes (Conventionnée)',
    type: InfrastructureType.POOL,
    serviceId: 'ear927',
    status: 'Operational',
    normReference: 'Code du Sport Art. L.322-2',
    visualIntervalDays: 90,
    regulatoryIntervalDays: 365,
    lastVisualInspection: daysAgoISO(15),
    lastRegulatoryInspection: daysAgoISO(90)
  },
  // BA 705 Tours
  {
    id: 'infra_705_1',
    name: 'Halle Musculation BA 705',
    type: InfrastructureType.GYM_MIXED,
    serviceId: 'ba705',
    status: 'Operational',
    normReference: 'NF EN ISO 20957',
    visualIntervalDays: 30,
    regulatoryIntervalDays: 90,
    lastVisualInspection: daysAgoISO(8),
    lastRegulatoryInspection: daysAgoISO(45)
  },
  {
    id: 'infra_705_2',
    name: 'Structure Escalade (SAE) BA 705',
    type: InfrastructureType.CLIMBING_WALL,
    serviceId: 'ba705',
    status: 'Operational',
    normReference: 'NF EN 12572',
    visualIntervalDays: 90,
    regulatoryIntervalDays: 365,
    lastVisualInspection: daysAgoISO(40),
    lastRegulatoryInspection: daysAgoISO(350)
  },
  // BA 105
  {
    id: 'infra_105_1',
    name: 'Salle Musculation BA 105',
    type: InfrastructureType.GYM_MIXED,
    serviceId: 'ba105',
    status: 'Operational',
    normReference: 'NF EN ISO 20957',
    visualIntervalDays: 30,
    regulatoryIntervalDays: 90,
    lastVisualInspection: daysAgoISO(10),
    lastRegulatoryInspection: daysAgoISO(50)
  }
];

// --- MATÉRIEL SPORTIF ---
const MOCK_EQUIPMENT: Equipment[] = [
  { id: 'eq1', name: 'Banc Développé Couché Olympique', category: 'Musculation', status: 'Operational', infrastructureId: 'infra_ear_1', serviceId: 'ear927', normReference: 'NF EN ISO 20957', visualIntervalDays: 30, regulatoryIntervalDays: 90, lastVisualInspection: daysAgoISO(10), lastRegulatoryInspection: daysAgoISO(60) },
  { id: 'eq2', name: 'Cage à Squat & Rack Olympique', category: 'Musculation', status: 'Operational', infrastructureId: 'infra_ear_1', serviceId: 'ear927', normReference: 'NF EN ISO 20957', visualIntervalDays: 30, regulatoryIntervalDays: 90, lastVisualInspection: daysAgoISO(10), lastRegulatoryInspection: daysAgoISO(60) },
  { id: 'eq3', name: 'Set Haltères 2-40 kg', category: 'Musculation', status: 'Operational', infrastructureId: 'infra_ear_1', serviceId: 'ear927', normReference: 'NF EN ISO 20957', visualIntervalDays: 30, regulatoryIntervalDays: 90, lastVisualInspection: daysAgoISO(34), lastRegulatoryInspection: daysAgoISO(60) }, // EXPIRED visuel
  { id: 'eq4', name: 'Presse à Cuisses 45°', category: 'Musculation', status: 'Maintenance', infrastructureId: 'infra_ear_1', serviceId: 'ear927', normReference: 'NF EN ISO 20957', visualIntervalDays: 30, regulatoryIntervalDays: 90, lastVisualInspection: daysAgoISO(5), lastRegulatoryInspection: daysAgoISO(95), notes: 'Câble sécurité commandé' },
  { id: 'eq5', name: 'Poulie Vis-à-Vis Double', category: 'Musculation', status: 'Operational', infrastructureId: 'infra_ear_1', serviceId: 'ear927', normReference: 'NF EN ISO 20957', visualIntervalDays: 30, regulatoryIntervalDays: 90, lastVisualInspection: daysAgoISO(12), lastRegulatoryInspection: daysAgoISO(55) },
  { id: 'eq6', name: 'Tapis de course Matrix #1', category: 'Cardio', status: 'Operational', infrastructureId: 'infra_ear_2', serviceId: 'ear927', normReference: 'NF EN ISO 20957', visualIntervalDays: 30, regulatoryIntervalDays: 90, lastVisualInspection: daysAgoISO(15), lastRegulatoryInspection: daysAgoISO(45) },
  { id: 'eq7', name: 'Rameur Concept2 PM5 (x4)', category: 'Cardio', status: 'Operational', infrastructureId: 'infra_ear_2', serviceId: 'ear927', normReference: 'NF EN ISO 20957', visualIntervalDays: 30, regulatoryIntervalDays: 90, lastVisualInspection: daysAgoISO(15), lastRegulatoryInspection: daysAgoISO(45) },
  { id: 'eq8', name: 'Vélo BikeErg / Keiser (x10)', category: 'Cardio', status: 'Operational', infrastructureId: 'infra_ear_2', serviceId: 'ear927', normReference: 'NF EN ISO 20957', visualIntervalDays: 30, regulatoryIntervalDays: 90, lastVisualInspection: daysAgoISO(20), lastRegulatoryInspection: daysAgoISO(50) },
  { id: 'eq9', name: 'Kettlebells (8-24 kg) & Med Balls', category: 'Petit matériel', status: 'Operational', infrastructureId: 'infra_ear_3', serviceId: 'ear927', normReference: 'PIA 7.1.1 (Annexe B)', visualIntervalDays: 90, regulatoryIntervalDays: 365, lastVisualInspection: daysAgoISO(25), lastRegulatoryInspection: daysAgoISO(150) },
  { id: 'eq10', name: 'Barres de Traction & Anneaux', category: 'Musculation', status: 'Operational', infrastructureId: 'infra_ear_3', serviceId: 'ear927', normReference: 'NF EN ISO 20957', visualIntervalDays: 30, regulatoryIntervalDays: 90, lastVisualInspection: daysAgoISO(38), lastRegulatoryInspection: daysAgoISO(100) },
  { id: 'eq11', name: 'Buts Handball / Futsal (Paire)', category: 'Buts sportifs', status: 'Operational', infrastructureId: 'infra_ear_4', serviceId: 'ear927', normReference: 'NF S52-409', visualIntervalDays: 180, regulatoryIntervalDays: 730, lastVisualInspection: daysAgoISO(170), lastRegulatoryInspection: daysAgoISO(400) },
  { id: 'eq12', name: 'Tatami IJF 100 m²', category: 'Petit matériel', status: 'Operational', infrastructureId: 'infra_ear_5', serviceId: 'ear927', normReference: 'PIA 7.1.1 (Annexe B)', visualIntervalDays: 90, regulatoryIntervalDays: 365, lastVisualInspection: daysAgoISO(30), lastRegulatoryInspection: daysAgoISO(180) },
  // BA 705
  { id: 'eq_705_1', name: 'Rack Squat Olympique BA 705', category: 'Musculation', status: 'Operational', infrastructureId: 'infra_705_1', serviceId: 'ba705', normReference: 'NF EN ISO 20957', visualIntervalDays: 30, regulatoryIntervalDays: 90, lastVisualInspection: daysAgoISO(5), lastRegulatoryInspection: daysAgoISO(40) },
  { id: 'eq_705_2', name: 'Points d\'ancrage SAE BA 705', category: 'Escalade (SAE)', status: 'Operational', infrastructureId: 'infra_705_2', serviceId: 'ba705', normReference: 'NF EN 12572', visualIntervalDays: 90, regulatoryIntervalDays: 365, lastVisualInspection: daysAgoISO(40), lastRegulatoryInspection: daysAgoISO(350) }
];

// --- HISTORIQUE REGISTRE DE SÉCURITÉ ---
const MOCK_INSPECTIONS: InspectionLog[] = [
  {
    id: 'insp_1',
    targetId: 'infra_ear_1',
    targetType: 'INFRA',
    targetName: 'Salle Musculation Principale',
    serviceId: 'ear927',
    inspectionType: 'VISUAL',
    date: daysAgoISO(12),
    timestamp: daysAgoTimestamp(12, 8),
    inspectorNid: '1234567890',
    inspectorName: 'ADJ BARBOTIN Nicolas',
    status: 'CONFORME',
    normReference: 'NF EN ISO 20957',
    notes: 'Sols, ancrages et affichage consignes conformes.'
  },
  {
    id: 'insp_2',
    targetId: 'eq4',
    targetType: 'EQUIP',
    targetName: 'Presse à Cuisses 45°',
    serviceId: 'ear927',
    inspectionType: 'VISUAL',
    date: daysAgoISO(5),
    timestamp: daysAgoTimestamp(5, 9),
    inspectorNid: '1234567891',
    inspectorName: 'SGC MOREAU Clara',
    status: 'RESERVE',
    normReference: 'NF EN ISO 20957',
    notes: 'Butée de sécurité usée — mise en maintenance préventive.'
  },
  {
    id: 'insp_3',
    targetId: 'infra_ear_4',
    targetType: 'INFRA',
    targetName: 'Gymnase & Buts Multisports',
    serviceId: 'ear927',
    inspectionType: 'REGULATORY',
    date: daysAgoISO(300),
    timestamp: daysAgoTimestamp(300, 14),
    inspectorNid: '1234567890',
    inspectorName: 'ADJ BARBOTIN Nicolas',
    status: 'CONFORME',
    normReference: 'NF S52-409',
    notes: 'Contrôle charge statique organisme agréé validé.'
  }
];

// --- RÉFÉRENTIEL EXERCICES EPMS (108 exercices classés & illustrés) ---
const MOCK_EXERCISES: ExerciseLibraryItem[] = EXERCISE_DATABASE;

// --- CONVERSION DES WODS DE data/workouts.ts EN SÉANCES NATIONALES ---
const convertedWorkouts: Session[] = workouts.map((w, index) => {
  const mats = Array.isArray(w.material) ? w.material : [w.material];
  const mainBlock = (w.details?.exercises || []).map(ex => ({
    exercise: ex.text,
    prescription: w.details?.format_label || w.type,
    rest: w.type === 'TABATA' ? '10 sec' : w.type === 'EMOM' ? 'Reste min' : '-'
  }));
  return {
    id: `wod_${index + 1}`,
    infrastructureId: 'any',
    title: w.title,
    type: w.type,
    workoutType: w.type,
    level: (w.level as 'Facile' | 'Moyen' | 'Intense') || 'Moyen',
    material: mats,
    bodyZone: (w.body as 'haut' | 'bas' | 'complet' | 'abdos') || 'complet',
    durationMinutes: w.duration || 20,
    description: stripHtml(w.desc),
    isCompleted: false,
    isGlobal: true,
    createdByName: 'ADC DUBUS / Mémoire EPMS',
    createdByBase: 'EETIS / EAR 927',
    content: {
      equipmentNeeded: mats,
      warmup: 'Échauffement articulaire 5-8 min + montée cardio progressive.',
      mainBlock,
      scaledBlock: w.details?.scaled
        ? {
            intro: w.details.scaled.intro,
            exercises: w.details.scaled.exercises.map(e => e.text)
          }
        : undefined,
      cooldown: 'Retour au calme 5 min : marche lente et étirements doux.',
      advice: w.details?.conseil && w.details.conseil !== '-' ? w.details.conseil : 'Maintenez une exécution technique propre.'
    }
  };
});

// Séances phares EPMS (avec prescriptions dynamiques % 1RM et % VMA)
const FEATURED_GLOBAL_SESSIONS: Session[] = [
  {
    id: 'gs_epms_1',
    infrastructureId: 'infra_ear_1',
    title: 'Full Body Force MCO (Adapté 1RM)',
    type: 'MUSCU',
    workoutType: 'MUSCU',
    level: 'Intense',
    material: ['barre', 'halteres'],
    bodyZone: 'complet',
    durationMinutes: 55,
    description: 'Séance de force opérationnelle avec calcul automatique des charges selon votre 1RM et votre fatigue du jour.',
    isCompleted: false,
    isGlobal: true,
    createdByName: 'ADJ BARBOTIN Nicolas',
    createdByBase: 'EAR 927',
    content: {
      equipmentNeeded: ['Barre olympique', 'Banc développé couché', 'Cage à squat'],
      warmup: '8 min mobilité épaules/hanches + 2 séries légères à vide.',
      advice: 'Respectez les tempos contrôlés. Les charges en kg sont adaptées automatiquement à votre profil.',
      mainBlock: [
        { exercise: 'Squat Arrière', prescription: '4 séries x 6 reps à [75% 1RM]', tempo: '3-1-1-0', rest: '2:30' },
        { exercise: 'Développé Couché Barre', prescription: '4 séries x 8 reps à [75% 1RM]', tempo: '3-0-1-0', rest: '2:00' },
        { exercise: 'Tractions Pronation', prescription: '4 séries x Max propre', tempo: 'Contrôlé', rest: '2:00' },
        { exercise: 'Pallof Press (Anti-Rotation)', prescription: '3 séries x 12 reps / côté', tempo: 'Lent', rest: '1:00' }
      ],
      cooldown: '5 min ouverture thoracique et décompression lombaire.'
    }
  },
  {
    id: 'gs_epms_2',
    infrastructureId: 'infra_ear_6',
    title: 'Fractionné VMA 400m (Prépa CCPM)',
    type: 'CARDIO',
    workoutType: 'CARDIO',
    level: 'Intense',
    material: ['piste'],
    bodyZone: 'bas',
    durationMinutes: 45,
    description: 'Développement de la VMA sur piste avec calcul automatique de vos allures personnalisées.',
    isCompleted: false,
    isGlobal: true,
    createdByName: 'ADJ BARBOTIN Nicolas',
    createdByBase: 'EAR 927',
    content: {
      equipmentNeeded: ['Piste 400m ou parcours plat', 'Chronomètre'],
      warmup: '15 min footing à [65% VMA] + gammes athlétiques + 3 lignes droites.',
      advice: 'Allure cible calculée sur votre VMA individuelle.',
      mainBlock: [
        { exercise: 'Course 400m VMA (Bloc 1)', prescription: '6 x 400m à [95% VMA]', rest: '1:00' },
        { exercise: 'Récupération entre blocs', prescription: '3 min marche / trot léger', rest: '3:00', isRecovery: true, durationSeconds: 180 },
        { exercise: 'Course 400m VMA (Bloc 2)', prescription: '6 x 400m à [95% VMA]', rest: '1:00' }
      ],
      cooldown: '10 min footing lent à [60% VMA] + hydratation.'
    }
  },
  {
    id: 'gs_epms_3',
    infrastructureId: 'any',
    title: 'Mobilité, Posture & ORFA (Poste Assis / PN)',
    type: 'MOBILITE',
    workoutType: 'MOBILITE',
    level: 'Facile',
    material: ['poids-corps'],
    bodyZone: 'complet',
    durationMinutes: 25,
    description: 'Protocole de décompression rachidienne, ouverture thoracique et régulation du stress (compatible récupération ORFA).',
    isCompleted: false,
    isGlobal: true,
    createdByName: 'SGC MOREAU Clara',
    createdByBase: 'EAR 927',
    content: {
      equipmentNeeded: ['Tapis de sol'],
      warmup: '3 min respiration abdominale lente (cohérence cardiaque 5s/5s).',
      advice: 'Idéal en Zone Orange/Rouge ou après une garde / vol prolongé.',
      mainBlock: [
        { exercise: 'Ouverture Thoracique au sol', prescription: '3 x 10 rotations / côté', rest: '30 sec' },
        { exercise: 'Étirement Psoas & Mobilité Hanche', prescription: '2 x 45 sec / côté', rest: '15 sec' },
        { exercise: 'Pont Fessier (Réactivation)', prescription: '3 x 15 reps', tempo: '2-2-2', rest: '45 sec' },
        { exercise: 'Gainage Planche & Transverse', prescription: '3 x 45 sec', rest: '45 sec' }
      ],
      cooldown: '5 min relaxation respiratoire guidée.'
    }
  }
];

const MOCK_GLOBAL_SESSIONS: Session[] = [...FEATURED_GLOBAL_SESSIONS, ...convertedWorkouts];

// --- PLANNING APMS HEBDOMADAIRE (EAR 927 & BA 705) ---
const MOCK_COLLECTIVE_SESSIONS: CollectiveSession[] = [
  { id: 'c1', title: 'Prépa CCPM — Course & Gainage', instructorName: 'ADJ BARBOTIN Nicolas', timeStart: '08:30', timeEnd: '09:45', locationName: 'Piste Athlétisme & Zone CCPM', dayOfWeek: 1, maxParticipants: 20, participants: ['0987654321', '0987654322'], waitlist: [], detailedDescription: 'Travail d\'allure spécifique 2400m / Luc Léger et renforcement sangle abdominale.', serviceId: 'ear927', category: 'CCPM' },
  { id: 'c2', title: 'Coaching Musculation Personnalisé', instructorName: 'SGC MOREAU Clara', timeStart: '11:30', timeEnd: '12:30', locationName: 'Salle Musculation Principale', dayOfWeek: 1, maxParticipants: 12, participants: ['0987654323'], waitlist: [], detailedDescription: 'Correction posturale, tests 1RM sous-maximaux (Brzycki) et suivi programmes.', serviceId: 'ear927', category: 'COLLECTIF' },
  { id: 'c3', title: 'Pilates / Postural & Anti-TMS', instructorName: 'SGC MOREAU Clara', timeStart: '10:00', timeEnd: '11:00', locationName: 'Dojo / Salle Combat & Mobilité', dayOfWeek: 2, maxParticipants: 15, participants: ['0987654321'], waitlist: [], detailedDescription: 'Séance dédiée au renforcement profond, mobilité rachidienne et prévention TMS.', serviceId: 'ear927', category: 'COLLECTIF' },
  { id: 'c4', title: 'CCPM Officiel (Pompes / Luc Léger)', instructorName: 'ADJ BARBOTIN Nicolas', timeStart: '14:00', timeEnd: '15:30', locationName: 'Gymnase & Buts Multisports', dayOfWeek: 2, maxParticipants: 25, participants: [], waitlist: [], detailedDescription: 'Session officielle d\'évaluation CCPM. Tenue réglementaire et certificat d\'aptitude requis.', serviceId: 'ear927', category: 'CCPM' },
  { id: 'c5', title: 'Sport Unité CDC (Horaires Décalés)', instructorName: 'ADJ BARBOTIN Nicolas', timeStart: '08:30', timeEnd: '10:00', locationName: 'Cage Cross-Training Extérieure', dayOfWeek: 3, maxParticipants: 20, participants: ['0987654321'], waitlist: [], detailedDescription: 'Créneau adapté aux contrôleurs aériens et personnels de permanence.', serviceId: 'ear927', category: 'COHESION' },
  { id: 'c6', title: 'Biking Haute Intensité (HIIT)', instructorName: 'SGC MOREAU Clara', timeStart: '11:30', timeEnd: '12:30', locationName: 'Salle Cardio & Biking', dayOfWeek: 3, maxParticipants: 10, participants: ['0987654322', '0987654323'], waitlist: [], detailedDescription: 'Fractionné cardio sur BikeErg/Keiser, idéal pour encaisser les montées en charge.', serviceId: 'ear927', category: 'COLLECTIF' },
  { id: 'c7', title: 'Natation Perfectionnement & CCPM', instructorName: 'ADJ BARBOTIN Nicolas', timeStart: '11:30', timeEnd: '12:30', locationName: 'Piscine de Luynes (Conventionnée)', dayOfWeek: 4, maxParticipants: 16, participants: ['0987654323'], waitlist: [], detailedDescription: 'Travail technique crawl/brasse et préparation 100m nage libre.', serviceId: 'ear927', category: 'CCPM' },
  { id: 'c8', title: 'Cross-Training Opérationnel (PPO)', instructorName: 'ADJ BARBOTIN Nicolas', timeStart: '09:00', timeEnd: '10:15', locationName: 'Cage Cross-Training Extérieure', dayOfWeek: 5, maxParticipants: 18, participants: ['0987654321', '0987654323'], waitlist: [], detailedDescription: 'Circuit fonctionnel haute intensité orienté aguerrissement et port de charge.', serviceId: 'ear927', category: 'COLLECTIF' },
  { id: 'c9', title: 'Challenge Cohésion — Relais Base EAR 927', instructorName: 'Cellule EPMS EAR 927', timeStart: '14:00', timeEnd: '16:30', locationName: 'Piste Athlétisme & Zone CCPM', dayOfWeek: 5, maxParticipants: 60, participants: ['0987654321', '0987654322', '0987654323'], waitlist: [], detailedDescription: 'Événement sportif trimestriel inter-unités : relais 4x1000m + ateliers fonctionnels.', serviceId: 'ear927', category: 'EVENEMENT', eventDate: daysAgoISO(-7) },
  // BA 705
  { id: 'c_705_1', title: 'Renforcement Spécifique PN (Facteurs G)', instructorName: 'Staff EPMS BA 705', timeStart: '08:30', timeEnd: '09:45', locationName: 'Halle Musculation BA 705', dayOfWeek: 2, maxParticipants: 15, participants: ['0987654324'], waitlist: [], detailedDescription: 'Stabilisation cervicale, transverse et cardio basse intensité.', serviceId: 'ba705', category: 'COLLECTIF' }
];

// --- UTILISATEURS NATIONAUX DE DÉMO (Cohérents sur EAR 927 & BA 705) ---
const MOCK_USERS: UserProfile[] = [
  {
    nid: '1234567890',
    name: 'ADJ BARBOTIN Nicolas',
    role: UserRole.MONITOR,
    monitorPermission: 'CHEF_CELLULE',
    password: 'password',
    gender: Gender.MALE,
    jobType: JobType.FUSCO,
    workSchedule: WorkSchedule.OFFICE,
    tests: { run2400mTime: '09:00', pushups: 55, pullups: 18, benchPress1RM: 105, squat1RM: 135, deadlift1RM: 165, calculatedVMA: 16.84, lastCcpmScore: 18.5, lastCcpmDate: daysAgoISO(60) },
    dailyForms: [
      { date: daysAgoISO(1), sleepQuality: 8, fatigueLevel: 3, stressLevel: 3, painLevel: 0 }
    ],
    completedSessions: [],
    sessionLogs: [],
    serviceId: 'ear927',
    unit: 'Cellule EPMS',
    previousBases: ['ba705', 'ba123']
  },
  {
    nid: '1234567891',
    name: 'SGC MOREAU Clara',
    role: UserRole.MONITOR,
    monitorPermission: 'RESP_MATERIEL',
    password: 'password',
    gender: Gender.FEMALE,
    jobType: JobType.FUSCO,
    workSchedule: WorkSchedule.OFFICE,
    tests: { vamevalPalier: 14, pushups: 35, pullups: 10, benchPress1RM: 65, squat1RM: 95, calculatedVMA: 15.0, lastCcpmScore: 17.5, lastCcpmDate: daysAgoISO(45) },
    dailyForms: [],
    completedSessions: [],
    sessionLogs: [],
    serviceId: 'ear927',
    unit: 'Cellule EPMS'
  },
  {
    nid: '0987654321',
    name: 'SGT MARTIN Lucas',
    role: UserRole.USER,
    password: 'password',
    gender: Gender.MALE,
    jobType: JobType.ADMIN,
    workSchedule: WorkSchedule.SHIFT,
    tests: { lucLegerPalier: 9.5, pushups: 32, pullups: 8, benchPress1RM: 80, squat1RM: 100, deadlift1RM: 120, run10kmTime: '00:48:00', calculatedVMA: 15.32, lastCcpmScore: 14.5, lastCcpmDate: daysAgoISO(90) },
    dailyForms: [
      { date: daysAgoISO(10), sleepQuality: 7, fatigueLevel: 4, stressLevel: 4, painLevel: 0 },
      { date: daysAgoISO(8), sleepQuality: 6, fatigueLevel: 5, stressLevel: 5, painLevel: 1, painZone: 'Lombaires' },
      { date: daysAgoISO(6), sleepQuality: 5, fatigueLevel: 6, stressLevel: 6, painLevel: 0 },
      { date: daysAgoISO(4), sleepQuality: 4, fatigueLevel: 7, stressLevel: 7, painLevel: 2, painZone: 'Trapèzes' },
      { date: daysAgoISO(2), sleepQuality: 7, fatigueLevel: 4, stressLevel: 3, painLevel: 0 },
      { date: daysAgoISO(1), sleepQuality: 8, fatigueLevel: 3, stressLevel: 3, painLevel: 0 }
    ],
    completedSessions: [],
    sessionLogs: [
      { id: 'sl1', sessionId: 'gs_epms_1', title: 'Full Body Force MCO', type: 'MUSCU', date: daysAgoTimestamp(6, 12), durationMinutes: 52, locationName: 'Salle Musculation Principale', rpe: 7 },
      { id: 'sl2', sessionId: 'gs_epms_2', title: 'Fractionné VMA 400m', type: 'CARDIO', date: daysAgoTimestamp(4, 17), durationMinutes: 42, locationName: 'Piste Athlétisme & Zone CCPM', rpe: 8, adaptedForDailyForm: true },
      { id: 'sl3', sessionId: 'gs_epms_3', title: 'Mobilité & Posture', type: 'MOBILITE', date: daysAgoTimestamp(2, 11), durationMinutes: 25, locationName: 'Dojo / Salle Combat & Mobilité', rpe: 4 }
    ],
    serviceId: 'ear927',
    unit: 'CDC / Contrôle Aérien',
    previousBases: ['ba702'],
    rulesAcceptedAt: daysAgoISO(1)
  },
  {
    nid: '0987654322',
    name: 'CPL DURAND Léa',
    role: UserRole.USER,
    password: 'password',
    gender: Gender.FEMALE,
    jobType: JobType.TECH,
    workSchedule: WorkSchedule.OFFICE,
    tests: { lucLegerPalier: 8, pushups: 24, pullups: 4, benchPress1RM: 47.5, squat1RM: 72.5, calculatedVMA: 13.98, lastCcpmScore: 15.0, lastCcpmDate: daysAgoISO(75) },
    dailyForms: [
      { date: daysAgoISO(5), sleepQuality: 7, fatigueLevel: 4, stressLevel: 4, painLevel: 2, painZone: 'Épaule droite' },
      { date: daysAgoISO(2), sleepQuality: 6, fatigueLevel: 5, stressLevel: 5, painLevel: 1, painZone: 'Épaule droite' },
      { date: daysAgoISO(0), sleepQuality: 7, fatigueLevel: 4, stressLevel: 4, painLevel: 0 }
    ],
    completedSessions: [],
    sessionLogs: [
      { id: 'sl4', sessionId: 'gs_epms_3', title: 'Renfo Chaîne Postérieure Anti-TMS', type: 'MUSCU', date: daysAgoTimestamp(3, 12), durationMinutes: 45, locationName: 'Salle Musculation Principale', rpe: 6 },
      { id: 'sl5', sessionId: 'wod_1', title: 'Le WOD du Voyageur', type: 'FOR TIME', date: daysAgoTimestamp(1, 16), durationMinutes: 22, locationName: 'Cage Cross-Training Extérieure', rpe: 7 }
    ],
    serviceId: 'ear927',
    unit: 'Escadron de Soutien Technique Aéronautique (ESTA)',
    rulesAcceptedAt: daysAgoISO(0)
  },
  {
    nid: '0987654323',
    name: 'ADJ LEFEBVRE Tom',
    role: UserRole.USER,
    password: 'password',
    gender: Gender.MALE,
    jobType: JobType.FUSCO,
    workSchedule: WorkSchedule.ON_CALL,
    tests: { run2400mTime: '08:45', pushups: 62, pullups: 16, benchPress1RM: 100, squat1RM: 130, deadlift1RM: 160, calculatedVMA: 17.32, lastCcpmScore: 19.0, lastCcpmDate: daysAgoISO(30) },
    dailyForms: [
      { date: daysAgoISO(3), sleepQuality: 3, fatigueLevel: 8, stressLevel: 7, painLevel: 1, painZone: 'Genou gauche' },
      { date: daysAgoISO(0), sleepQuality: 6, fatigueLevel: 5, stressLevel: 5, painLevel: 0 }
    ],
    completedSessions: [],
    sessionLogs: [
      { id: 'sl6', sessionId: 'wod_9', title: 'Le WOD Murph', type: 'FOR TIME', date: daysAgoTimestamp(5, 10), durationMinutes: 48, locationName: 'Cage Cross-Training Extérieure', rpe: 9 },
      { id: 'sl7', sessionId: 'gs_epms_1', title: 'Full Body Force MCO', type: 'MUSCU', date: daysAgoTimestamp(2, 14), durationMinutes: 60, locationName: 'Salle Musculation Principale', rpe: 8 },
      { id: 'sl8', sessionId: 'gs_epms_2', title: 'Fractionné VMA 400m', type: 'CARDIO', date: daysAgoTimestamp(1, 9), durationMinutes: 40, locationName: 'Piste Athlétisme & Zone CCPM', rpe: 8 }
    ],
    serviceId: 'ear927',
    unit: 'Escadron Sécurité Incendie Sauvetage (ESIS)',
    rulesAcceptedAt: daysAgoISO(0)
  },
  {
    nid: '0987654324',
    name: 'CNE MOREAU Paul',
    role: UserRole.USER,
    password: 'password',
    gender: Gender.MALE,
    jobType: JobType.PN,
    workSchedule: WorkSchedule.SHIFT,
    tests: { vamevalPalier: 15.5, pushups: 42, pullups: 12, benchPress1RM: 85, squat1RM: 110, calculatedVMA: 15.75, lastCcpmScore: 16.5, lastCcpmDate: daysAgoISO(50) },
    dailyForms: [
      { date: daysAgoISO(1), sleepQuality: 5, fatigueLevel: 6, stressLevel: 6, painLevel: 2, painZone: 'Cervicales' }
    ],
    completedSessions: [],
    sessionLogs: [
      { id: 'sl9', sessionId: 'gs_epms_3', title: 'Stabilisation Axiale PN', type: 'MOBILITE', date: daysAgoTimestamp(2, 16), durationMinutes: 35, locationName: 'Halle Musculation BA 705', rpe: 5 }
    ],
    serviceId: 'ba705',
    unit: 'Escadron de Chasse',
    previousBases: ['ba118']
  },
  {
    nid: '1122334455',
    name: 'COL RIGOLLET',
    role: UserRole.ADMINISTRATOR,
    authorityScope: 'BASE',
    password: 'password',
    gender: Gender.MALE,
    jobType: JobType.ADMIN,
    workSchedule: WorkSchedule.OFFICE,
    tests: { run10kmTime: '00:50:00', pushups: 30, calculatedVMA: 14.12 },
    dailyForms: [],
    completedSessions: [],
    sessionLogs: [],
    serviceId: 'ear927',
    unit: 'État-Major / Commandement'
  }
];

// --- PROGRAMMES INITIAUX (dont 1 actif, 1 demande en attente, 2 mutualisés nationaux) ---
const MOCK_PROGRAMS: Program[] = [
  {
    id: 'prog_active_1',
    userId: '0987654321',
    assignedUserIds: ['0987654321'],
    validatorId: '1234567890',
    createdByNid: '1234567890',
    createdByName: 'ADJ BARBOTIN Nicolas',
    createdByBase: 'EAR 927',
    isSharedNational: true,
    title: 'Préparation CCPM & Résilience CDC',
    goal: 'Préparation CCPM (VMA + Pompes + Posture Contrôleur)',
    status: ProgramStatus.VALIDATED,
    type: 'Hybride',
    startDate: daysAgoISO(3),
    durationWeeks: 4,
    sessionsPerWeek: 3,
    requestedLocations: ['Salle Musculation Principale', 'Piste Athlétisme & Zone CCPM'],
    sessions: [
      {
        id: 'ps_1',
        programId: 'prog_active_1',
        infrastructureId: 'infra_ear_1',
        title: 'S1J1 — Force Haut du Corps & Ouverture Thoracique',
        type: 'MUSCU',
        workoutType: 'MUSCU',
        durationMinutes: 45,
        description: 'Renforcement poussée/tirage équilibré + compensation posture poste assis.',
        isCompleted: false,
        dateScheduled: 'S1J1',
        locationName: 'Salle Musculation Principale',
        content: {
          equipmentNeeded: ['Barre olympique', 'Poulie', 'Haltères'],
          warmup: '8 min mobilité épaules/thorax + 2x10 pompes légères.',
          mainBlock: [
            { exercise: 'Développé Couché Barre', prescription: '4 séries x 8 reps à [75% 1RM]', tempo: '3-0-1-0', rest: '2:00' },
            { exercise: 'Rowing Barre / Haltères', prescription: '4 séries x 10 reps à [70% 1RM]', tempo: '2-1-1-0', rest: '1:30' },
            { exercise: 'Face Pull / Rotateurs Externes', prescription: '3 séries x 15 reps', tempo: 'Contrôlé', rest: '1:00' },
            { exercise: 'Gainage Planche & Transverse', prescription: '3 x 50 sec', rest: '0:45' }
          ],
          cooldown: '5 min étirement pectoraux et psoas.',
          advice: 'En cas de fatigue après quart de nuit, baissez la charge de 15%.'
        }
      },
      {
        id: 'ps_2',
        programId: 'prog_active_1',
        infrastructureId: 'infra_ear_6',
        title: 'S1J3 — Développement VMA 30/30',
        type: 'CARDIO',
        workoutType: 'CARDIO',
        durationMinutes: 40,
        description: 'Fractionné court pour progresser au Luc Léger et 2400m.',
        isCompleted: false,
        dateScheduled: 'S1J3',
        locationName: 'Piste Athlétisme & Zone CCPM',
        content: {
          equipmentNeeded: ['Piste 400m'],
          warmup: '12 min footing à [65% VMA] + gammes.',
          mainBlock: [
            { exercise: 'Fractionné 30/30 — Bloc 1', prescription: '10 x (30s à [100% VMA] / 30s trot)', rest: '3:00' },
            { exercise: 'Fractionné 30/30 — Bloc 2', prescription: '10 x (30s à [100% VMA] / 30s trot)', rest: '0' }
          ],
          cooldown: '8 min footing lent à [60% VMA].',
          advice: 'Gardez une foulée régulière et relâchée.'
        }
      },
      {
        id: 'ps_3',
        programId: 'prog_active_1',
        infrastructureId: 'infra_ear_1',
        title: 'S1J5 — Bas du Corps & Endurance Pompes',
        type: 'MUSCU',
        workoutType: 'MUSCU',
        durationMinutes: 45,
        description: 'Réactivation fessiers/jambes + volume spécifique épreuve CCPM pompes.',
        isCompleted: false,
        dateScheduled: 'S1J5',
        locationName: 'Salle Musculation Principale',
        content: {
          equipmentNeeded: ['Barre olympique', 'Tapis'],
          warmup: '8 min mobilité hanches + 2x10 air squats.',
          mainBlock: [
            { exercise: 'Squat Arrière', prescription: '4 séries x 8 reps à [70% 1RM]', tempo: '3-1-1-0', rest: '2:00' },
            { exercise: 'Pompes Classiques (CCPM)', prescription: 'EMOM 10 min : 10 reps/min', rest: 'Reste min' },
            { exercise: 'Pont Fessier (Réactivation)', prescription: '3 séries x 15 reps', rest: '1:00' }
          ],
          cooldown: '5 min étirements doux ischios et quadriceps.'
        }
      }
    ]
  },
  {
    id: 'prog_pending_1',
    userId: '0987654322',
    title: 'Demande: Renforcement Anti-TMS Épaules & Dos',
    goal: 'Prévenir douleurs épaules (mécanicienne ESTA) et préparer CCPM',
    status: ProgramStatus.PENDING,
    type: 'Musculation',
    startDate: daysAgoISO(0),
    durationWeeks: 6,
    sessionsPerWeek: 3,
    requestedLocations: ['Salle Musculation Principale', 'Dojo / Salle Combat & Mobilité'],
    sessions: []
  },
  {
    id: 'prog_template_national_1',
    userId: '',
    isTemplate: true,
    isSharedNational: true,
    createdByNid: '1234567890',
    createdByName: 'ADJ BARBOTIN Nicolas',
    createdByBase: 'EAR 927',
    title: '[Modèle AAE] Prépa Commando & Port de Charge (6 sem)',
    goal: 'Endurance tactique, gainage lourd et résistance lactique (ESIS / EP / CPA)',
    status: ProgramStatus.VALIDATED,
    type: 'Hybride',
    startDate: daysAgoISO(0),
    durationWeeks: 6,
    sessionsPerWeek: 4,
    sessions: [
      {
        id: 'pt_1',
        programId: 'prog_template_national_1',
        infrastructureId: 'any',
        title: 'S1J1 — Force Lourde & Port de Charge',
        type: 'MUSCU',
        workoutType: 'MUSCU',
        durationMinutes: 55,
        description: 'Soulevé de terre, Farmer Walk et gainage anti-rotation.',
        isCompleted: false,
        dateScheduled: 'S1J1',
        locationName: 'Salle Musculation',
        content: {
          warmup: '10 min mobilité complète + activation core.',
          mainBlock: [
            { exercise: 'Soulevé de Terre (Trap Bar / Barre)', prescription: '5 séries x 5 reps à [80% 1RM]', rest: '3:00' },
            { exercise: 'Farmer Walk (Port de charge)', prescription: '4 x 40m charge lourde', rest: '1:30' },
            { exercise: 'Pallof Press (Anti-Rotation)', prescription: '4 x 12 reps / côté', rest: '1:00' }
          ],
          cooldown: '5 min décompression rachis.'
        }
      }
    ]
  }
];

// --- REGISTRE SPORT UNITÉ HISTORIQUE (Statut "en service" Directive 17615) ---
const MOCK_SPORT_REGISTRY: SportRegistryEntry[] = [
  {
    id: 'reg_1',
    userId: '0987654321',
    userName: 'SGT MARTIN Lucas',
    serviceId: 'ear927',
    unit: 'CDC / Contrôle Aérien',
    infrastructureName: 'Salle Musculation Principale',
    sessionType: 'PROGRAM',
    title: 'Full Body Force MCO',
    startTime: daysAgoTimestamp(2, 11),
    endTime: daysAgoTimestamp(2, 12),
    durationMinutes: 52,
    status: 'COMPLETED'
  },
  {
    id: 'reg_2',
    userId: '0987654322',
    userName: 'CPL DURAND Léa',
    serviceId: 'ear927',
    unit: 'Escadron de Soutien Technique Aéronautique (ESTA)',
    infrastructureName: 'Cage Cross-Training Extérieure',
    sessionType: 'LIBRARY',
    title: 'Le WOD du Voyageur',
    startTime: daysAgoTimestamp(1, 16),
    endTime: daysAgoTimestamp(1, 17),
    durationMinutes: 25,
    status: 'COMPLETED'
  },
  {
    id: 'reg_3',
    userId: '0987654323',
    userName: 'ADJ LEFEBVRE Tom',
    serviceId: 'ear927',
    unit: 'Escadron Sécurité Incendie Sauvetage (ESIS)',
    infrastructureName: 'Piste Athlétisme & Zone CCPM',
    sessionType: 'FLASH',
    title: 'Fractionné VMA 400m',
    startTime: daysAgoTimestamp(1, 9),
    endTime: daysAgoTimestamp(1, 10),
    durationMinutes: 40,
    status: 'COMPLETED'
  }
];

// --- MOTEUR DE PERSISTANCE HYBRIDE LOCAL + FIRESTORE PAR COLLECTION ---

interface CollectionConfig<T> {
  localKey: string;
  firestoreCollection: string;
  idField: keyof T;
  defaults: T[];
}

const MOCK_MAINTENANCE_TICKETS: MaintenanceTicket[] = [
  {
    id: 'tkt_demo_1',
    serviceId: 'ear927',
    targetType: 'EQUIPMENT',
    targetId: 'eq_ear927_3',
    targetName: 'Rameur Concept2 RowErg #1',
    priority: 'NORMALE',
    title: 'Tension chaîne & nettoyage rail à prévoir',
    description: 'Légère vibration ressentie au tirage au-delà de 30 coups/min. Graissage préventif planifié.',
    status: 'OUVERT',
    reportedByNid: '1234567890',
    reportedByName: 'ADJ BARBOTIN Nicolas',
    createdAt: daysAgoTimestamp(2, 11)
  }
];

const COLLECTIONS = {
  users: { localKey: 'users', firestoreCollection: 'sm_users', idField: 'nid', defaults: MOCK_USERS } as CollectionConfig<UserProfile>,
  services: { localKey: 'services', firestoreCollection: 'sm_services', idField: 'id', defaults: MOCK_SERVICES } as CollectionConfig<ServiceEPMS>,
  infras: { localKey: 'infras', firestoreCollection: 'sm_infrastructures', idField: 'id', defaults: MOCK_INFRASTRUCTURES } as CollectionConfig<Infrastructure>,
  equipment: { localKey: 'equipment', firestoreCollection: 'sm_equipment', idField: 'id', defaults: MOCK_EQUIPMENT } as CollectionConfig<Equipment>,
  inspections: { localKey: 'inspections', firestoreCollection: 'sm_inspections', idField: 'id', defaults: MOCK_INSPECTIONS } as CollectionConfig<InspectionLog>,
  programs: { localKey: 'programs', firestoreCollection: 'sm_programs', idField: 'id', defaults: MOCK_PROGRAMS } as CollectionConfig<Program>,
  collectiveSessions: { localKey: 'collectiveSessions', firestoreCollection: 'sm_collective_sessions', idField: 'id', defaults: MOCK_COLLECTIVE_SESSIONS } as CollectionConfig<CollectiveSession>,
  globalSessions: { localKey: 'globalSessions', firestoreCollection: 'sm_global_sessions', idField: 'id', defaults: MOCK_GLOBAL_SESSIONS } as CollectionConfig<Session>,
  exercises: { localKey: 'exercises', firestoreCollection: 'sm_exercises', idField: 'id', defaults: MOCK_EXERCISES } as CollectionConfig<ExerciseLibraryItem>,
  routes: { localKey: 'routes', firestoreCollection: 'sm_routes', idField: 'id', defaults: MOCK_ROUTES } as CollectionConfig<SportsRoute>,
  activeSessions: { localKey: 'activeSessions', firestoreCollection: 'sm_active_sessions', idField: 'id', defaults: [] } as CollectionConfig<ActiveSession>,
  sportRegistry: { localKey: 'sportRegistry', firestoreCollection: 'sm_sport_registry', idField: 'id', defaults: MOCK_SPORT_REGISTRY } as CollectionConfig<SportRegistryEntry>,
  notifications: { localKey: 'notifications', firestoreCollection: 'sm_notifications', idField: 'id', defaults: [] } as CollectionConfig<AppNotification>,
  handovers: { localKey: 'handovers', firestoreCollection: 'sm_handovers', idField: 'id', defaults: [] } as CollectionConfig<AuthorityHandover>,
  auditLogs: { localKey: 'auditLogs', firestoreCollection: 'sm_audit_logs', idField: 'id', defaults: [] } as CollectionConfig<AuditLogEntry>,
  facilityBookings: { localKey: 'facilityBookings', firestoreCollection: 'sm_facility_bookings', idField: 'id', defaults: [] } as CollectionConfig<FacilityBooking>,
  maintenanceTickets: { localKey: 'maintenanceTickets', firestoreCollection: 'sm_maintenance_tickets', idField: 'id', defaults: MOCK_MAINTENANCE_TICKETS } as CollectionConfig<MaintenanceTicket>
};

type CollectionName = keyof typeof COLLECTIONS;

let firestoreConnected = false;

const loadLocal = <T>(cfg: CollectionConfig<T>): T[] => {
  const raw = localStorage.getItem(PREFIX + cfg.localKey);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      console.error(`[SmartMonit] Corrupted localStorage key ${cfg.localKey}:`, e);
    }
  }
  localStorage.setItem(PREFIX + cfg.localKey, JSON.stringify(cfg.defaults));
  return cfg.defaults;
};

const emitUpdate = () => {
  window.dispatchEvent(new Event('db_updated'));
};

const saveLocal = <T>(cfg: CollectionConfig<T>, items: T[]) => {
  localStorage.setItem(PREFIX + cfg.localKey, JSON.stringify(items));
  emitUpdate();
};

// Synchronisation Firestore par document (évite la limite 1 Mo et les écrasements concurrents)
const sanitizeForFirestore = <T>(cfg: CollectionConfig<T>, obj: T): any => {
  const clean = JSON.parse(JSON.stringify(obj));
  // Sécurité : ne JAMAIS transmettre de mot de passe en clair vers Firestore
  if (cfg.firestoreCollection === 'sm_users' && clean && typeof clean === 'object') {
    delete clean.password;
  }
  return clean;
};

const pushDocToFirestore = <T>(cfg: CollectionConfig<T>, item: T) => {
  if (!dbFirestore) return;
  const docId = String(item[cfg.idField]);
  if (!docId) return;
  setDoc(doc(dbFirestore, cfg.firestoreCollection, docId), sanitizeForFirestore(cfg, item)).catch((err) => {
    handleFirestoreError(err, OperationType.WRITE, `${cfg.firestoreCollection}/${docId}`);
  });
};

const deleteDocFromFirestore = <T>(cfg: CollectionConfig<T>, docId: string) => {
  if (!dbFirestore || !docId) return;
  deleteDoc(doc(dbFirestore, cfg.firestoreCollection, docId)).catch((err) => {
    handleFirestoreError(err, OperationType.DELETE, `${cfg.firestoreCollection}/${docId}`);
  });
};

const syncFullCollectionToFirestore = <T>(cfg: CollectionConfig<T>, items: T[]) => {
  if (!dbFirestore) return;
  try {
    const batch = writeBatch(dbFirestore);
    items.slice(0, 400).forEach((item) => {
      const id = String(item[cfg.idField]);
      if (id) {
        batch.set(doc(dbFirestore, cfg.firestoreCollection, id), sanitizeForFirestore(cfg, item));
      }
    });
    batch.commit().catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, cfg.firestoreCollection);
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, cfg.firestoreCollection);
  }
};

/**
 * Migration automatique des mots de passe en clair vers PBKDF2-SHA256 salé
 * + Purge automatique RGPD (Art. 5.1.e — limitation de conservation CNIL)
 */
const enforceSecurityAndRetention = async () => {
  // 1. Migration mots de passe en clair -> PBKDF2-SHA256 + consentement démo par défaut
  const users = loadLocal(COLLECTIONS.users);
  let usersChanged = false;
  const dailyCutoffMs = Date.now() - RETENTION_DAYS.DAILY_FORMS * 24 * 60 * 60 * 1000;

  for (let i = 0; i < users.length; i++) {
    const u = { ...users[i] };
    if (u.password && !u.passwordHash) {
      u.passwordHash = await hashPassword(u.password);
      delete u.password;
      usersChanged = true;
    } else if (u.password && u.passwordHash) {
      delete u.password;
      usersChanged = true;
    }

    if (!u.rgpdConsent) {
      u.rgpdConsent = {
        version: RGPD_POLICY_VERSION,
        acceptedAt: u.createdAt || new Date().toISOString(),
        healthDataConsent: true,
        aiProcessingConsent: true,
        analyticsConsent: true
      };
      usersChanged = true;
    }

    // Purge bilans forme > 12 mois glissants
    if (u.dailyForms && u.dailyForms.length > 0) {
      const kept = u.dailyForms.filter((d) => new Date(d.date).getTime() >= dailyCutoffMs);
      if (kept.length !== u.dailyForms.length) {
        u.dailyForms = kept;
        usersChanged = true;
      }
    }
    users[i] = u;
  }
  if (usersChanged) {
    saveLocal(COLLECTIONS.users, users);
  }

  // 2. Purge notifications lues > 90 jours
  const notifCutoffMs = Date.now() - RETENTION_DAYS.NOTIFICATIONS_READ * 24 * 60 * 60 * 1000;
  const notifs = loadLocal(COLLECTIONS.notifications);
  const keptNotifs = notifs.filter((n) => !n.read || n.timestamp >= notifCutoffMs);
  if (keptNotifs.length !== notifs.length) {
    saveLocal(COLLECTIONS.notifications, keptNotifs);
  }

  // 3. Purge journaux d'audit > 12 mois (recommandation CNIL)
  const auditCutoffMs = Date.now() - RETENTION_DAYS.AUDIT_LOGS * 24 * 60 * 60 * 1000;
  const audits = loadLocal(COLLECTIONS.auditLogs);
  const keptAudits = audits.filter((a) => new Date(a.timestamp).getTime() >= auditCutoffMs);
  if (keptAudits.length !== audits.length) {
    saveLocal(COLLECTIONS.auditLogs, keptAudits);
  }
};

export const getSyncStatus = () => ({ firestoreConnected });

export const initializeDatabaseSync = () => {
  // Remise à neuf automatique du catalogue d'exercices vers la v5 (108 exercices classés)
  const currentCatalogVersion = localStorage.getItem(PREFIX + 'exercises_version');
  if (currentCatalogVersion !== EXERCISES_CATALOG_VERSION) {
    localStorage.setItem(PREFIX + 'exercises', JSON.stringify(MOCK_EXERCISES));
    localStorage.setItem(PREFIX + 'exercises_version', EXERCISES_CATALOG_VERSION);
  }

  // Initialisation locale immédiate (zero latence au démarrage)
  (Object.keys(COLLECTIONS) as CollectionName[]).forEach((name) => {
    loadLocal(COLLECTIONS[name] as CollectionConfig<any>);
  });

  // Migration cryptographique PBKDF2-SHA256 & purge rétention RGPD/CNIL
  enforceSecurityAndRetention().catch((err) =>
    console.warn('[SmartMonit Security] Erreur migration/purge:', err)
  );

  // Nettoyage des abonnements précédents
  if ((window as any)._smUnsubscribes) {
    (window as any)._smUnsubscribes.forEach((unsub: () => void) => unsub());
  }
  const unsubscribes: (() => void)[] = [];
  (window as any)._smUnsubscribes = unsubscribes;

  // Abonnements temps réel Firestore par collection (uniquement si Firebase autonome configuré)
  if (!dbFirestore) {
    firestoreConnected = false;
    return;
  }
  const activeDb = dbFirestore;
  (Object.keys(COLLECTIONS) as CollectionName[]).forEach((name) => {
    const cfg = COLLECTIONS[name] as CollectionConfig<any>;
    try {
      const colRef = collection(activeDb, cfg.firestoreCollection);
      const unsub = onSnapshot(
        colRef,
        (snapshot) => {
          firestoreConnected = true;
          if (!snapshot.empty) {
            const remoteItems = snapshot.docs.map((d) => d.data());
            localStorage.setItem(PREFIX + cfg.localKey, JSON.stringify(remoteItems));
            emitUpdate();
          } else {
            // Premier déploiement sur cette collection : on pousse les données de référence nationales
            const localItems = loadLocal(cfg);
            if (localItems.length > 0 && name !== 'globalSessions') {
              syncFullCollectionToFirestore(cfg, localItems);
            } else if (name === 'globalSessions') {
              // Pour les séances globales, on pousse les 15 premières dans Firestore pour garder un boot rapide
              syncFullCollectionToFirestore(cfg, localItems.slice(0, 15));
            }
          }
        },
        (error) => {
          firestoreConnected = false;
          handleFirestoreError(error, OperationType.LIST, cfg.firestoreCollection);
        }
      );
      unsubscribes.push(unsub);
    } catch (err) {
      firestoreConnected = false;
      handleFirestoreError(err, OperationType.LIST, cfg.firestoreCollection);
    }
  });
};

export const resetLocalDemoDatabase = () => {
  (Object.keys(COLLECTIONS) as CollectionName[]).forEach((name) => {
    const cfg = COLLECTIONS[name] as CollectionConfig<any>;
    localStorage.setItem(PREFIX + cfg.localKey, JSON.stringify(cfg.defaults));
  });
  emitUpdate();
};

// --- API BASE DE DONNÉES NATIONALE ---

export const db = {
  // Active Sessions & Registre Sport Unité
  getActiveSessions: () => loadLocal(COLLECTIONS.activeSessions),
  getSportRegistry: () => loadLocal(COLLECTIONS.sportRegistry),

  startSession: (session: ActiveSession) => {
    const active = loadLocal(COLLECTIONS.activeSessions);
    // Évite les doublons pour un même utilisateur (clôt l'éventuelle précédente)
    const filtered = active.filter((s) => s.userId !== session.userId);
    filtered.push(session);
    saveLocal(COLLECTIONS.activeSessions, filtered);
    pushDocToFirestore(COLLECTIONS.activeSessions, session);

    // Enregistre l'entrée dans le Registre Sport Unité (Directive 17615)
    const users = loadLocal(COLLECTIONS.users);
    const u = users.find((x) => x.nid === session.userId);
    const registry = loadLocal(COLLECTIONS.sportRegistry);
    const entry: SportRegistryEntry = {
      id: session.id,
      userId: session.userId,
      userName: session.userName,
      serviceId: session.serviceId || u?.serviceId || 'ear927',
      unit: session.unit || u?.unit || 'Non renseignée',
      infrastructureName: session.infrastructureName,
      sessionType: session.sessionType,
      title: session.details,
      startTime: session.startTime,
      status: 'ACTIVE'
    };
    const nextReg = [entry, ...registry.filter((r) => r.id !== entry.id)];
    saveLocal(COLLECTIONS.sportRegistry, nextReg);
    pushDocToFirestore(COLLECTIONS.sportRegistry, entry);

    return session;
  },

  endSession: (sessionId: string, status: 'COMPLETED' | 'CANCELLED' = 'COMPLETED') => {
    const active = loadLocal(COLLECTIONS.activeSessions);
    const target = active.find((s) => s.id === sessionId);
    const remaining = active.filter((s) => s.id !== sessionId);
    saveLocal(COLLECTIONS.activeSessions, remaining);
    deleteDocFromFirestore(COLLECTIONS.activeSessions, sessionId);

    // Clôture l'entrée correspondante du Registre Sport Unité avec horodatage fin
    const registry = loadLocal(COLLECTIONS.sportRegistry);
    const idx = registry.findIndex((r) => r.id === sessionId);
    const nowIso = new Date().toISOString();
    if (idx !== -1) {
      const startMs = new Date(registry[idx].startTime).getTime();
      const durationMinutes = Math.max(1, Math.round((Date.now() - startMs) / 60000));
      const updatedEntry: SportRegistryEntry = {
        ...registry[idx],
        endTime: nowIso,
        durationMinutes,
        status
      };
      registry[idx] = updatedEntry;
      saveLocal(COLLECTIONS.sportRegistry, registry);
      pushDocToFirestore(COLLECTIONS.sportRegistry, updatedEntry);
    } else if (target) {
      const startMs = new Date(target.startTime).getTime();
      const entry: SportRegistryEntry = {
        id: target.id,
        userId: target.userId,
        userName: target.userName,
        serviceId: target.serviceId || 'ear927',
        unit: target.unit || 'Non renseignée',
        infrastructureName: target.infrastructureName,
        sessionType: target.sessionType,
        title: target.details,
        startTime: target.startTime,
        endTime: nowIso,
        durationMinutes: Math.max(1, Math.round((Date.now() - startMs) / 60000)),
        status
      };
      saveLocal(COLLECTIONS.sportRegistry, [entry, ...registry]);
      pushDocToFirestore(COLLECTIONS.sportRegistry, entry);
    }
  },

  // Users (NID Portable)
  getUsers: () => loadLocal(COLLECTIONS.users),
  setUsers: (users: UserProfile[]) => {
    saveLocal(COLLECTIONS.users, users);
    syncFullCollectionToFirestore(COLLECTIONS.users, users);
  },
  addUser: (user: UserProfile) => {
    const users = loadLocal(COLLECTIONS.users);
    const filtered = users.filter((u) => u.nid !== user.nid);
    filtered.push(user);
    saveLocal(COLLECTIONS.users, filtered);
    pushDocToFirestore(COLLECTIONS.users, user);
  },
  updateUser: (updated: UserProfile) => {
    const users = loadLocal(COLLECTIONS.users);
    const idx = users.findIndex((u) => u.nid === updated.nid);
    if (idx !== -1) {
      users[idx] = updated;
    } else {
      users.push(updated);
    }
    saveLocal(COLLECTIONS.users, users);
    pushDocToFirestore(COLLECTIONS.users, updated);
  },

  // Services EPMS
  getServices: () => loadLocal(COLLECTIONS.services),
  getServiceById: (serviceId?: string): ServiceEPMS | undefined => {
    if (!serviceId) return undefined;
    return loadLocal(COLLECTIONS.services).find((s) => s.id === serviceId);
  },
  upsertService: (service: ServiceEPMS) => {
    const services = loadLocal(COLLECTIONS.services);
    const idx = services.findIndex((s) => s.id === service.id);
    if (idx !== -1) services[idx] = service;
    else services.push(service);
    saveLocal(COLLECTIONS.services, services);
    pushDocToFirestore(COLLECTIONS.services, service);
  },

  // Infrastructures (Multi-bases sûr : jamais d'écrasement inter-bases)
  getInfrastructures: () => loadLocal(COLLECTIONS.infras),
  setInfrastructures: (infras: Infrastructure[]) => {
    saveLocal(COLLECTIONS.infras, infras);
    syncFullCollectionToFirestore(COLLECTIONS.infras, infras);
  },
  upsertInfrastructure: (infra: Infrastructure) => {
    const all = loadLocal(COLLECTIONS.infras);
    const idx = all.findIndex((i) => i.id === infra.id);
    if (idx !== -1) all[idx] = infra;
    else all.push(infra);
    saveLocal(COLLECTIONS.infras, all);
    pushDocToFirestore(COLLECTIONS.infras, infra);
  },
  updateInfrastructure: (updated: Infrastructure) => {
    db.upsertInfrastructure(updated);
  },
  deleteInfrastructure: (id: string) => {
    const all = loadLocal(COLLECTIONS.infras).filter((i) => i.id !== id);
    saveLocal(COLLECTIONS.infras, all);
    deleteDocFromFirestore(COLLECTIONS.infras, id);
  },

  // Equipment (Multi-bases sûr)
  getEquipment: () => loadLocal(COLLECTIONS.equipment),
  setEquipment: (eq: Equipment[]) => {
    saveLocal(COLLECTIONS.equipment, eq);
    syncFullCollectionToFirestore(COLLECTIONS.equipment, eq);
  },
  upsertEquipment: (item: Equipment) => {
    const all = loadLocal(COLLECTIONS.equipment);
    const idx = all.findIndex((e) => e.id === item.id);
    if (idx !== -1) all[idx] = item;
    else all.push(item);
    saveLocal(COLLECTIONS.equipment, all);
    pushDocToFirestore(COLLECTIONS.equipment, item);
  },
  updateEquipment: (updated: Equipment) => {
    db.upsertEquipment(updated);
  },
  deleteEquipment: (id: string) => {
    const all = loadLocal(COLLECTIONS.equipment).filter((e) => e.id !== id);
    saveLocal(COLLECTIONS.equipment, all);
    deleteDocFromFirestore(COLLECTIONS.equipment, id);
  },

  // Registre de Sécurité (Inspections horodatées)
  getInspections: () => loadLocal(COLLECTIONS.inspections),
  addInspectionLog: (log: InspectionLog) => {
    const logs = loadLocal(COLLECTIONS.inspections);
    const next = [log, ...logs];
    saveLocal(COLLECTIONS.inspections, next);
    pushDocToFirestore(COLLECTIONS.inspections, log);
  },

  // Programs
  getPrograms: () => loadLocal(COLLECTIONS.programs),
  setPrograms: (programs: Program[]) => {
    saveLocal(COLLECTIONS.programs, programs);
    syncFullCollectionToFirestore(COLLECTIONS.programs, programs);
  },
  addProgram: (program: Program) => {
    const programs = loadLocal(COLLECTIONS.programs);
    programs.unshift(program);
    saveLocal(COLLECTIONS.programs, programs);
    pushDocToFirestore(COLLECTIONS.programs, program);
  },
  updateProgram: (updated: Program) => {
    const programs = loadLocal(COLLECTIONS.programs);
    const idx = programs.findIndex((p) => p.id === updated.id);
    if (idx !== -1) {
      programs[idx] = updated;
    } else {
      programs.unshift(updated);
    }
    saveLocal(COLLECTIONS.programs, programs);
    pushDocToFirestore(COLLECTIONS.programs, updated);
  },
  deleteProgram: (id: string) => {
    const programs = loadLocal(COLLECTIONS.programs).filter((p) => p.id !== id);
    saveLocal(COLLECTIONS.programs, programs);
    deleteDocFromFirestore(COLLECTIONS.programs, id);
  },
  markProgramSessionCompleted: (programId: string, sessionId: string) => {
    const programs = loadLocal(COLLECTIONS.programs);
    const idx = programs.findIndex((p) => p.id === programId);
    if (idx === -1) return;
    const prog = { ...programs[idx] };
    prog.sessions = prog.sessions.map((s) =>
      s.id === sessionId ? { ...s, isCompleted: true, completedAt: new Date().toISOString() } : s
    );
    programs[idx] = prog;
    saveLocal(COLLECTIONS.programs, programs);
    pushDocToFirestore(COLLECTIONS.programs, prog);
  },

  // Collective Sessions (Planning APMS + Liste d'attente + Notifications)
  getCollectiveSessions: () => loadLocal(COLLECTIONS.collectiveSessions),
  setCollectiveSessions: (cs: CollectiveSession[]) => {
    saveLocal(COLLECTIONS.collectiveSessions, cs);
    syncFullCollectionToFirestore(COLLECTIONS.collectiveSessions, cs);
  },
  addCollectiveSession: (session: CollectiveSession) => {
    const sessions = loadLocal(COLLECTIONS.collectiveSessions);
    sessions.push({ ...session, waitlist: session.waitlist || [] });
    saveLocal(COLLECTIONS.collectiveSessions, sessions);
    pushDocToFirestore(COLLECTIONS.collectiveSessions, session);
  },
  updateCollectiveSession: (updated: CollectiveSession, notifyParticipants = false) => {
    const sessions = loadLocal(COLLECTIONS.collectiveSessions);
    const idx = sessions.findIndex((s) => s.id === updated.id);
    if (idx !== -1) {
      sessions[idx] = updated;
      saveLocal(COLLECTIONS.collectiveSessions, sessions);
      pushDocToFirestore(COLLECTIONS.collectiveSessions, updated);

      if (notifyParticipants && updated.participants.length > 0) {
        db.addNotification({
          id: `plan_${Date.now()}`,
          title: updated.cancelled ? 'Séance annulée' : 'Séance modifiée',
          message: `Le créneau "${updated.title}" (${updated.timeStart} - ${updated.locationName}) a été ${updated.cancelled ? 'annulé' : 'mis à jour'} par le service EPMS.`,
          type: updated.cancelled ? 'warning' : 'info',
          category: 'PLANNING',
          timestamp: Date.now(),
          read: false,
          serviceId: updated.serviceId,
          targetNids: updated.participants
        });
      }
    }
  },
  deleteCollectiveSession: (id: string) => {
    const sessions = loadLocal(COLLECTIONS.collectiveSessions);
    const target = sessions.find((s) => s.id === id);
    const remaining = sessions.filter((s) => s.id !== id);
    saveLocal(COLLECTIONS.collectiveSessions, remaining);
    deleteDocFromFirestore(COLLECTIONS.collectiveSessions, id);

    if (target && target.participants.length > 0) {
      db.addNotification({
        id: `del_${Date.now()}`,
        title: 'Créneau supprimé',
        message: `La séance "${target.title}" (${target.timeStart}) a été supprimée du planning.`,
        type: 'warning',
        category: 'PLANNING',
        timestamp: Date.now(),
        read: false,
        serviceId: target.serviceId,
        targetNids: target.participants
      });
    }
  },
  toggleSessionJoin: (sessionId: string, userNid: string) => {
    const sessions = loadLocal(COLLECTIONS.collectiveSessions);
    const sess = sessions.find((s) => s.id === sessionId);
    if (!sess) return null;

    if (!sess.waitlist) sess.waitlist = [];
    const isJoined = sess.participants.includes(userNid);
    const isWaitlisted = sess.waitlist.includes(userNid);

    if (isJoined) {
      sess.participants = sess.participants.filter((id) => id !== userNid);
      // Promotion automatique depuis la liste d'attente (Section 4.5.2)
      if (sess.waitlist.length > 0 && sess.participants.length < sess.maxParticipants) {
        const promotedNid = sess.waitlist.shift()!;
        sess.participants.push(promotedNid);
        db.addNotification({
          id: `wait_${Date.now()}`,
          title: 'Place libérée — Inscription confirmée',
          message: `Une place s'est libérée ! Vous êtes désormais inscrit à "${sess.title}" (${sess.timeStart}).`,
          type: 'success',
          category: 'PLANNING',
          timestamp: Date.now(),
          read: false,
          serviceId: sess.serviceId,
          targetNids: [promotedNid]
        });
      }
    } else if (isWaitlisted) {
      sess.waitlist = sess.waitlist.filter((id) => id !== userNid);
    } else if (sess.participants.length < sess.maxParticipants) {
      sess.participants.push(userNid);
    } else {
      // Ajout automatique en liste d'attente
      sess.waitlist.push(userNid);
    }

    saveLocal(COLLECTIONS.collectiveSessions, sessions);
    pushDocToFirestore(COLLECTIONS.collectiveSessions, sess);
    return sess;
  },

  // Exercise Library
  getExerciseLibrary: () => loadLocal(COLLECTIONS.exercises),
  addExercise: (ex: ExerciseLibraryItem) => {
    const list = loadLocal(COLLECTIONS.exercises);
    list.unshift(ex);
    saveLocal(COLLECTIONS.exercises, list);
    pushDocToFirestore(COLLECTIONS.exercises, ex);
  },

  // Global Sessions Library (Mémoire EPMS + WODs)
  getGlobalSessions: () => loadLocal(COLLECTIONS.globalSessions),
  setGlobalSessions: (sessions: Session[]) => {
    saveLocal(COLLECTIONS.globalSessions, sessions);
  },
  upsertGlobalSession: (session: Session) => {
    const list = loadLocal(COLLECTIONS.globalSessions);
    const idx = list.findIndex((s) => s.id === session.id);
    if (idx !== -1) list[idx] = session;
    else list.unshift(session);
    saveLocal(COLLECTIONS.globalSessions, list);
    pushDocToFirestore(COLLECTIONS.globalSessions, session);
  },
  deleteGlobalSession: (id: string) => {
    const list = loadLocal(COLLECTIONS.globalSessions).filter((s) => s.id !== id);
    saveLocal(COLLECTIONS.globalSessions, list);
    deleteDocFromFirestore(COLLECTIONS.globalSessions, id);
  },

  // Routes GPX
  getRoutes: () => loadLocal(COLLECTIONS.routes),
  setRoutes: (routes: SportsRoute[]) => {
    saveLocal(COLLECTIONS.routes, routes);
    syncFullCollectionToFirestore(COLLECTIONS.routes, routes);
  },
  addRoute: (route: SportsRoute) => {
    const routes = loadLocal(COLLECTIONS.routes);
    routes.unshift(route);
    saveLocal(COLLECTIONS.routes, routes);
    pushDocToFirestore(COLLECTIONS.routes, route);
  },
  deleteRoute: (id: string) => {
    const routes = loadLocal(COLLECTIONS.routes).filter((r) => r.id !== id);
    saveLocal(COLLECTIONS.routes, routes);
    deleteDocFromFirestore(COLLECTIONS.routes, id);
  },

  // Notifications
  getNotifications: () => loadLocal(COLLECTIONS.notifications),
  setNotifications: (notifs: AppNotification[]) => {
    saveLocal(COLLECTIONS.notifications, notifs);
    syncFullCollectionToFirestore(COLLECTIONS.notifications, notifs);
  },
  addNotification: (notif: AppNotification) => {
    const notifs = loadLocal(COLLECTIONS.notifications);
    notifs.unshift(notif);
    saveLocal(COLLECTIONS.notifications, notifs);
    pushDocToFirestore(COLLECTIONS.notifications, notif);
  },
  markNotificationRead: (id: string) => {
    const notifs = loadLocal(COLLECTIONS.notifications);
    const idx = notifs.findIndex((n) => n.id === id);
    if (idx !== -1) {
      notifs[idx] = { ...notifs[idx], read: true };
      saveLocal(COLLECTIONS.notifications, notifs);
      pushDocToFirestore(COLLECTIONS.notifications, notifs[idx]);
    }
  },

  // Postage numérique Autorité (Section 4.4.2 & 4.10.2)
  getHandovers: () => loadLocal(COLLECTIONS.handovers),
  performAuthorityHandover: (fromUser: UserProfile, targetNid: string): { ok: boolean; message: string } => {
    const users = loadLocal(COLLECTIONS.users);
    const target = users.find((u) => u.nid === targetNid);
    if (!target) {
      return { ok: false, message: `Aucun utilisateur trouvé avec le NID ${targetNid}.` };
    }
    if (target.nid === fromUser.nid) {
      return { ok: false, message: 'Vous êtes déjà titulaire de ce poste.' };
    }

    // Le nouvel arrivant prend les droits Autorité, l'ancien repasse Utilisateur (postage numérique)
    const promoted: UserProfile = {
      ...target,
      role: UserRole.ADMINISTRATOR,
      authorityScope: fromUser.authorityScope || 'BASE',
      serviceId: fromUser.serviceId || target.serviceId,
      unit: fromUser.authorityScope === 'UNIT' ? fromUser.unit : target.unit
    };
    const demoted: UserProfile = {
      ...fromUser,
      role: UserRole.USER,
      authorityScope: undefined
    };

    db.updateUser(promoted);
    db.updateUser(demoted);

    const handover: AuthorityHandover = {
      id: `handover_${Date.now()}`,
      fromNid: fromUser.nid,
      fromName: fromUser.name,
      toNid: target.nid,
      serviceId: fromUser.serviceId || 'ear927',
      unit: fromUser.unit,
      scope: fromUser.authorityScope || 'BASE',
      timestamp: new Date().toISOString(),
      status: 'COMPLETED'
    };
    const all = loadLocal(COLLECTIONS.handovers);
    all.unshift(handover);
    saveLocal(COLLECTIONS.handovers, all);
    pushDocToFirestore(COLLECTIONS.handovers, handover);

    db.addNotification({
      id: `postage_${Date.now()}`,
      title: 'Postage Numérique Autorité Validé',
      message: `${fromUser.name} vous a transféré les droits Autorité (${handover.scope}).`,
      type: 'success',
      category: 'SYSTEM',
      timestamp: Date.now(),
      read: false,
      serviceId: handover.serviceId,
      targetNids: [target.nid]
    });

    return { ok: true, message: `Droits Autorité transférés à ${target.name} (${target.nid}).` };
  },

  // --- AUDIT SÉCURITÉ & CONFORMITÉ RGPD / CNIL ---
  getAuditLogs: () => loadLocal(COLLECTIONS.auditLogs),

  logAudit: (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => {
    const log: AuditLogEntry = {
      ...entry,
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString()
    };
    const logs = loadLocal(COLLECTIONS.auditLogs);
    const next = [log, ...logs].slice(0, 1000);
    saveLocal(COLLECTIONS.auditLogs, next);
    pushDocToFirestore(COLLECTIONS.auditLogs, log);
  },

  // --- RÉSERVATIONS CRÉNEAUX INSTALLATIONS (ClassPass / Basic-Fit) ---
  getFacilityBookings: (serviceId?: string): FacilityBooking[] => {
    const all = loadLocal(COLLECTIONS.facilityBookings);
    const filtered = serviceId ? all.filter((b) => b.serviceId === serviceId) : all;
    return filtered.sort((a, b) => `${a.date} ${a.timeStart}`.localeCompare(`${b.date} ${b.timeStart}`));
  },
  addFacilityBooking: (booking: FacilityBooking) => {
    const all = loadLocal(COLLECTIONS.facilityBookings);
    const next = [booking, ...all];
    saveLocal(COLLECTIONS.facilityBookings, next);
    pushDocToFirestore(COLLECTIONS.facilityBookings, booking);
  },
  cancelFacilityBooking: (bookingId: string) => {
    const all = loadLocal(COLLECTIONS.facilityBookings);
    let updatedBooking: FacilityBooking | null = null;
    const next = all.map((b) => {
      if (b.id === bookingId) {
        updatedBooking = { ...b, status: 'CANCELLED' };
        return updatedBooking;
      }
      return b;
    });
    saveLocal(COLLECTIONS.facilityBookings, next);
    if (updatedBooking) pushDocToFirestore(COLLECTIONS.facilityBookings, updatedBooking);
  },

  // --- GMAO / TICKETS MAINTENANCE INSTALLATIONS & MATÉRIEL ---
  getMaintenanceTickets: (serviceId?: string): MaintenanceTicket[] => {
    const all = loadLocal(COLLECTIONS.maintenanceTickets);
    const filtered = serviceId ? all.filter((t) => t.serviceId === serviceId) : all;
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
  addMaintenanceTicket: (ticket: MaintenanceTicket) => {
    const all = loadLocal(COLLECTIONS.maintenanceTickets);
    const next = [ticket, ...all];
    saveLocal(COLLECTIONS.maintenanceTickets, next);
    pushDocToFirestore(COLLECTIONS.maintenanceTickets, ticket);
  },
  updateMaintenanceTicket: (ticket: MaintenanceTicket) => {
    const all = loadLocal(COLLECTIONS.maintenanceTickets);
    const next = all.map((t) => (t.id === ticket.id ? ticket : t));
    saveLocal(COLLECTIONS.maintenanceTickets, next);
    pushDocToFirestore(COLLECTIONS.maintenanceTickets, ticket);
  },

  // Droit d'accès & Portabilité (Art. 15 & Art. 20 RGPD)
  exportUserRgpdData: (nid: string) => {
    const user = loadLocal(COLLECTIONS.users).find((u) => u.nid === nid);
    if (!user) return null;

    const cleanProfile = stripSecretsFromUser(user);
    const myPrograms = loadLocal(COLLECTIONS.programs).filter(
      (p) => p.userId === nid || p.assignedUserIds?.includes(nid)
    );
    const myRegistry = loadLocal(COLLECTIONS.sportRegistry).filter((r) => r.userId === nid);
    const myCollectives = loadLocal(COLLECTIONS.collectiveSessions)
      .filter((c) => c.participants.includes(nid) || c.waitlist?.includes(nid))
      .map((c) => ({ id: c.id, title: c.title, dayOfWeek: c.dayOfWeek, timeStart: c.timeStart, locationName: c.locationName }));
    const myAudits = loadLocal(COLLECTIONS.auditLogs).filter((a) => a.actorNid === nid || a.targetId === nid);

    return {
      exportMetadata: {
        application: 'SMART MONIT 1.0 — EPMS AAE',
        rgpdArticle: 'Articles 15 & 20 du RGPD (Droit d\'accès et de portabilité)',
        policyVersion: RGPD_POLICY_VERSION,
        exportedAt: new Date().toISOString()
      },
      profile: cleanProfile,
      programs: myPrograms,
      collectiveRegistrations: myCollectives,
      sportRegistryHistory: myRegistry,
      accessAuditHistory: myAudits
    };
  },

  // Droit à l'effacement (Art. 17 RGPD) avec préservation anonymisée de l'obligation légale Directive 17615
  deleteUserAccountRgpd: (nid: string) => {
    const users = loadLocal(COLLECTIONS.users);
    const target = users.find((u) => u.nid === nid);
    if (!target) return;

    // 1. Journalise l'effacement (traçabilité RGPD sans conserver le nom)
    db.logAudit({
      actorNid: nid,
      actorName: 'COMPTE_EFFACE_RGPD',
      actorRole: target.role,
      serviceId: target.serviceId,
      action: 'DELETE_ACCOUNT',
      targetId: nid,
      details: 'Exercice du droit à l\'effacement (Art. 17 RGPD) — suppression profil & anonymisation registre.'
    });

    // 2. Supprime le profil utilisateur
    const remainingUsers = users.filter((u) => u.nid !== nid);
    saveLocal(COLLECTIONS.users, remainingUsers);
    deleteDocFromFirestore(COLLECTIONS.users, nid);

    // 3. Supprime ses programmes individuels et retire son NID des programmes de groupe
    const programs = loadLocal(COLLECTIONS.programs)
      .filter((p) => p.userId !== nid)
      .map((p) =>
        p.assignedUserIds?.includes(nid)
          ? { ...p, assignedUserIds: p.assignedUserIds.filter((x) => x !== nid) }
          : p
      );
    saveLocal(COLLECTIONS.programs, programs);

    // 4. Désinscrit des séances collectives et listes d'attente
    const collectives = loadLocal(COLLECTIONS.collectiveSessions).map((c) => ({
      ...c,
      participants: c.participants.filter((x) => x !== nid),
      waitlist: (c.waitlist || []).filter((x) => x !== nid)
    }));
    saveLocal(COLLECTIONS.collectiveSessions, collectives);

    // 5. Clôt toute séance active
    const actives = loadLocal(COLLECTIONS.activeSessions).filter((s) => s.userId !== nid);
    saveLocal(COLLECTIONS.activeSessions, actives);

    // 6. Anonymise le Registre Sport Unité (conserve statistique/obligation légale sans identité)
    const reg = loadLocal(COLLECTIONS.sportRegistry).map((r) =>
      r.userId === nid ? { ...r, userId: 'ANONYMISE', userName: 'Anonyme (RGPD Art. 17)' } : r
    );
    saveLocal(COLLECTIONS.sportRegistry, reg);
  }
};
