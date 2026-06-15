
import { UserProfile, Program, Infrastructure, Equipment, UserRole, Gender, JobType, InfrastructureType, WorkSchedule, ServiceEPMS, CollectiveSession, ExerciseLibraryItem, ActiveSession, Session, AppNotification, SportsRoute, RouteType } from '../types';

const MOCK_ROUTES: SportsRoute[] = [
  {
    id: 'r1',
    name: 'P1 - Parcours Base',
    type: RouteType.RUNNING,
    distanceKm: 5.2,
    elevationMeters: 45,
    description: 'Parcours officiel de course à pied P1. Boucle autour de la base, terrain mixte (bitume et chemin).',
    gpxContent: `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="SmartMonit"><trk><name>P1</name><trkseg><trkpt lat="48.8566" lon="2.3522"><ele>35</ele></trkpt><trkpt lat="48.8567" lon="2.3523"><ele>36</ele></trkpt></trkseg></trk></gpx>`,
    mapImageUrl: 'https://picsum.photos/seed/route1/800/600',
    serviceId: 'ba105'
  },
  {
    id: 'r2',
    name: 'P2 - Parcours Long',
    type: RouteType.RUNNING,
    distanceKm: 10.5,
    elevationMeters: 120,
    description: 'Parcours officiel de course à pied P2. Idéal pour les sorties longues et l\'endurance fondamentale.',
    gpxContent: `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="SmartMonit"><trk><name>P2</name><trkseg><trkpt lat="48.8566" lon="2.3522"><ele>35</ele></trkpt><trkpt lat="48.8567" lon="2.3523"><ele>36</ele></trkpt></trkseg></trk></gpx>`,
    mapImageUrl: 'https://picsum.photos/seed/route2/800/600',
    serviceId: 'ba105'
  },
  {
    id: 'r3',
    name: 'P3 - Parcours Trail',
    type: RouteType.RUNNING,
    distanceKm: 8.0,
    elevationMeters: 250,
    description: 'Parcours officiel de course à pied P3. Terrain accidenté, fort dénivelé.',
    gpxContent: `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="SmartMonit"><trk><name>P3</name><trkseg><trkpt lat="48.8566" lon="2.3522"><ele>35</ele></trkpt><trkpt lat="48.8567" lon="2.3523"><ele>36</ele></trkpt></trkseg></trk></gpx>`,
    mapImageUrl: 'https://picsum.photos/seed/route3/800/600',
    serviceId: 'ba105'
  },
  {
    id: 'r4',
    name: 'VTT1 - Forêt Domaniale',
    type: RouteType.VTT,
    distanceKm: 15.0,
    elevationMeters: 300,
    description: 'Parcours officiel VTT1. Circuit technique en forêt avec passages boueux.',
    gpxContent: `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="SmartMonit"><trk><name>VTT1</name><trkseg><trkpt lat="48.8566" lon="2.3522"><ele>35</ele></trkpt><trkpt lat="48.8567" lon="2.3523"><ele>36</ele></trkpt></trkseg></trk></gpx>`,
    mapImageUrl: 'https://picsum.photos/seed/route4/800/600',
    serviceId: 'ba105'
  },
  {
    id: 'r5',
    name: 'VTT2 - Circuit des Crêtes',
    type: RouteType.VTT,
    distanceKm: 25.5,
    elevationMeters: 600,
    description: 'Parcours officiel VTT2. Circuit exigeant physiquement, beaux points de vue.',
    gpxContent: `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="SmartMonit"><trk><name>VTT2</name><trkseg><trkpt lat="48.8566" lon="2.3522"><ele>35</ele></trkpt><trkpt lat="48.8567" lon="2.3523"><ele>36</ele></trkpt></trkseg></trk></gpx>`,
    mapImageUrl: 'https://picsum.photos/seed/route5/800/600',
    serviceId: 'ba105'
  },
  {
    id: 'r6',
    name: 'Route 1 - Plaine',
    type: RouteType.CYCLING,
    distanceKm: 40.0,
    elevationMeters: 150,
    description: 'Parcours officiel Vélo Route 1. Idéal pour le travail de vélocité et l\'endurance.',
    gpxContent: `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="SmartMonit"><trk><name>Route 1</name><trkseg><trkpt lat="48.8566" lon="2.3522"><ele>35</ele></trkpt><trkpt lat="48.8567" lon="2.3523"><ele>36</ele></trkpt></trkseg></trk></gpx>`,
    mapImageUrl: 'https://picsum.photos/seed/route6/800/600',
    serviceId: 'ba105'
  },
  {
    id: 'r7',
    name: 'Test CCPM 2400m (Piste)',
    type: RouteType.RUNNING,
    distanceKm: 2.4,
    elevationMeters: 0,
    description: 'Tracé officiel pour le test CCPM sur la piste de la base.',
    gpxContent: `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="SmartMonit"><trk><name>CCPM 2400</name></trk></gpx>`,
    serviceId: 'ba105'
  }
];

// Mock Service EPMS
const MOCK_SERVICES: ServiceEPMS[] = [
  { id: 's1', name: 'Service EPMS BA 123', monitorId: '1234567890' }
];

// Mock Infrastructures
const MOCK_INFRASTRUCTURES: Infrastructure[] = [
  { 
      id: 'infra1', name: 'Salle Musculation Principale', type: InfrastructureType.GYM_WEIGHTS, serviceId: 'ba105', 
      lastVisualInspection: '2025-02-01', lastRegulatoryInspection: '2024-06-15'
  },
  { 
      id: 'infra2', name: 'Piste Athlétisme 400m', type: InfrastructureType.OUTDOOR_FIELD, serviceId: 'ba105', 
      lastVisualInspection: '2025-01-10', lastRegulatoryInspection: '2024-05-01'
  },
  { 
      id: 'infra3', name: 'Cage Crossfit Extérieure', type: InfrastructureType.CROSSFIT_CAGE, serviceId: 'ba105', 
      lastVisualInspection: '2025-03-20', lastRegulatoryInspection: '2024-05-20' 
  },
  { 
      id: 'infra4', name: 'Gymnase Bat. B (Cardio)', type: InfrastructureType.GYM_MIXED, serviceId: 'ba105', 
      lastVisualInspection: '2025-01-15', lastRegulatoryInspection: '2024-08-10' 
  },
  { 
      id: 'infra5', name: 'Dojo - Salle Combat', type: InfrastructureType.DOJO, serviceId: 'ba105', 
      lastVisualInspection: '2024-12-10', lastRegulatoryInspection: '2024-06-20' 
  },
  { 
      id: 'infra6', name: 'Piscine Municipale (Luynes)', type: InfrastructureType.POOL, serviceId: 'ba105', 
      lastVisualInspection: '2025-04-01', lastRegulatoryInspection: '2024-09-15' 
  },
  { 
      id: 'infra7', name: 'Parcours d\'Obstacles (P.O.)', type: InfrastructureType.OBSTACLE_COURSE, serviceId: 'ba105', 
      lastVisualInspection: '2025-02-15', lastRegulatoryInspection: '2024-03-10' 
  },
  { 
      id: 'infra8', name: 'Salle Biking / Studio', type: InfrastructureType.FITNESS, serviceId: 'ba105', 
      lastVisualInspection: '2025-03-01', lastRegulatoryInspection: '2024-10-01' 
  }
];

// Mock Equipment
const MOCK_EQUIPMENT: Equipment[] = [
  // Infra 1 - Muscu
  { id: 'eq1', name: 'Banc Développé Couché (1)', category: 'Musculation', status: 'Operational', infrastructureId: 'infra1', lastVisualInspection: '2025-04-01', lastRegulatoryInspection: '2024-06-15' },
  { id: 'eq2', name: 'Cage à Squat Olympique', category: 'Musculation', status: 'Operational', infrastructureId: 'infra1', lastVisualInspection: '2025-04-01', lastRegulatoryInspection: '2024-06-15' },
  { id: 'eq3', name: 'Set Haltères 2-40kg', category: 'Musculation', status: 'Operational', infrastructureId: 'infra1', lastVisualInspection: '2025-04-01', lastRegulatoryInspection: '2024-06-15' },
  { id: 'eq4', name: 'Presse à cuisses 45°', category: 'Musculation', status: 'Operational', infrastructureId: 'infra1', lastVisualInspection: '2025-04-01', lastRegulatoryInspection: '2024-06-15' },
  // Infra 4 - Cardio
  { id: 'eq5', name: 'Tapis de course Matrix (1)', category: 'Cardio', status: 'Operational', infrastructureId: 'infra4', lastVisualInspection: '2025-01-15', lastRegulatoryInspection: '2024-08-10' },
  { id: 'eq6', name: 'Vélo Elliptique Technogym', category: 'Cardio', status: 'Operational', infrastructureId: 'infra4', lastVisualInspection: '2025-01-15', lastRegulatoryInspection: '2024-08-10' },
  { id: 'eq7', name: 'Rameur Concept 2 PM5', category: 'Cardio', status: 'Operational', infrastructureId: 'infra4', lastVisualInspection: '2025-01-15', lastRegulatoryInspection: '2024-08-10' },
  // Infra 3 - Crossfit
  { id: 'eq8', name: 'Set Kettlebells (8-24kg)', category: 'Petit matériel', status: 'Operational', infrastructureId: 'infra3', lastVisualInspection: '2025-03-20', lastRegulatoryInspection: '2024-05-20' },
  { id: 'eq9', name: 'Anneaux de gym', category: 'Petit matériel', status: 'Operational', infrastructureId: 'infra3', lastVisualInspection: '2025-03-20', lastRegulatoryInspection: '2024-05-20' },
  // Infra 8 - Biking
  { id: 'eq10', name: 'Vélo Biking Keiser M3i (1)', category: 'Cardio', status: 'Operational', infrastructureId: 'infra8', lastVisualInspection: '2025-03-01', lastRegulatoryInspection: '2024-10-01' },
  { id: 'eq11', name: 'Système Audio Studio', category: 'Petit matériel', status: 'Operational', infrastructureId: 'infra8', lastVisualInspection: '2025-03-01', lastRegulatoryInspection: '2024-10-01' },
  // Pool / Dojo
  { id: 'eq12', name: 'Tatami IJF approved (100m2)', category: 'Petit matériel', status: 'Operational', infrastructureId: 'infra5', lastVisualInspection: '2024-12-10', lastRegulatoryInspection: '2024-06-20' },
  { id: 'eq13', name: 'Lignes d\'eau 25m', category: 'Petit matériel', status: 'Operational', infrastructureId: 'infra6', lastVisualInspection: '2025-04-01', lastRegulatoryInspection: '2024-09-15' }
];

// --- EXERCISE LIBRARY ---
const MOCK_EXERCISES: ExerciseLibraryItem[] = [
  // Musculation / Renforcement
  { id: 'ex1', name: 'Développé Couché Barre', muscleGroup: 'Pectoraux', equipment: 'Barre', type: 'Force', difficulty: 'Intermédiaire' },
  { id: 'ex2', name: 'Développé Incliné Haltères', muscleGroup: 'Pectoraux', equipment: 'Haltères', type: 'Force', difficulty: 'Intermédiaire' },
  { id: 'ex3', name: 'Pompes Classiques', muscleGroup: 'Pectoraux', equipment: 'PDC', type: 'Force', difficulty: 'Débutant' },
  { id: 'ex4', name: 'Ecarté Poulie Vis-à-vis', muscleGroup: 'Pectoraux', equipment: 'Machine', type: 'Force', difficulty: 'Avancé' },
  { id: 'ex5', name: 'Tractions Pronation', muscleGroup: 'Dos', equipment: 'Barre Fixe', type: 'Force', difficulty: 'Avancé' },
  { id: 'ex6', name: 'Tirage Vertical Poitrine', muscleGroup: 'Dos', equipment: 'Machine', type: 'Force', difficulty: 'Débutant' },
  { id: 'ex7', name: 'Rowing Barre', muscleGroup: 'Dos', equipment: 'Barre', type: 'Force', difficulty: 'Intermédiaire' },
  { id: 'ex8', name: 'Squat Arrière', muscleGroup: 'Jambes', equipment: 'Barre', type: 'Force', difficulty: 'Avancé' },
  { id: 'ex9', name: 'Presse à Cuisses', muscleGroup: 'Jambes', equipment: 'Machine', type: 'Force', difficulty: 'Débutant' },
  { id: 'ex10', name: 'Fentes Marchées', muscleGroup: 'Jambes', equipment: 'Haltères', type: 'Force', difficulty: 'Intermédiaire' },
  { id: 'ex11', name: 'Soulevé de Terre Roumain', muscleGroup: 'Jambes', equipment: 'Barre', type: 'Force', difficulty: 'Intermédiaire' },
  { id: 'ex17', name: 'Développé Militaire', muscleGroup: 'Epaules', equipment: 'Barre', type: 'Force', difficulty: 'Intermédiaire' },
  { id: 'ex18', name: 'Elévations Latérales', muscleGroup: 'Epaules', equipment: 'Haltères', type: 'Force', difficulty: 'Débutant' },
  
  // Cardio / Course
  { id: 'ex12', name: 'Burpees', muscleGroup: 'Cardio', equipment: 'PDC', type: 'Cardio', difficulty: 'Intermédiaire' },
  { id: 'ex13', name: 'Rameur (500m Sprint)', muscleGroup: 'Cardio', equipment: 'Machine', type: 'Cardio', difficulty: 'Intermédiaire' },
  { id: 'ex15', name: 'Course 400m VMA', muscleGroup: 'Cardio', equipment: 'Piste', type: 'Cardio', difficulty: 'Avancé' },
  { id: 'ex_run_1', name: 'Course Endurance Fondamentale', muscleGroup: 'Cardio', equipment: 'Extérieur', type: 'Cardio', difficulty: 'Débutant' },
  { id: 'ex_run_2', name: 'Fractionné 30/30', muscleGroup: 'Cardio', equipment: 'Piste', type: 'Cardio', difficulty: 'Intermédiaire' },
  { id: 'ex_run_3', name: 'Sprint 100m', muscleGroup: 'Cardio', equipment: 'Piste', type: 'Cardio', difficulty: 'Avancé' },

  // Natation
  { id: 'ex_swim_1', name: 'Crawl 100m', muscleGroup: 'Full Body', equipment: 'Piscine', type: 'Cardio', difficulty: 'Intermédiaire' },
  { id: 'ex_swim_2', name: 'Brasse 50m', muscleGroup: 'Full Body', equipment: 'Piscine', type: 'Cardio', difficulty: 'Débutant' },
  { id: 'ex_swim_3', name: 'Battements de jambes avec planche', muscleGroup: 'Jambes', equipment: 'Planche', type: 'Cardio', difficulty: 'Débutant' },
  { id: 'ex_swim_4', name: 'Natation Combat (avec tenue)', muscleGroup: 'Full Body', equipment: 'Piscine', type: 'Cardio', difficulty: 'Avancé' },

  // Pilates / Sport Santé
  { id: 'ex_pil_1', name: 'The Hundred (Centaine)', muscleGroup: 'Abdominaux', equipment: 'Tapis', type: 'Mobility', difficulty: 'Intermédiaire' },
  { id: 'ex_pil_2', name: 'Single Leg Stretch', muscleGroup: 'Abdominaux', equipment: 'Tapis', type: 'Mobility', difficulty: 'Débutant' },
  { id: 'ex_pil_3', name: 'Swimming (Pilates)', muscleGroup: 'Dos', equipment: 'Tapis', type: 'Mobility', difficulty: 'Intermédiaire' },
  { id: 'ex_pil_4', name: 'Planche Pilates', muscleGroup: 'Complet', equipment: 'Tapis', type: 'Mobility', difficulty: 'Intermédiaire' },

  // Mobilité
  { id: 'ex_mob_1', name: 'Cobra / Chien tête en haut', muscleGroup: 'Dos', equipment: 'PDC', type: 'Mobility', difficulty: 'Débutant' },
  { id: 'ex_mob_2', name: 'Ouverture de hanche (Pigeon)', muscleGroup: 'Hanches', equipment: 'PDC', type: 'Mobility', difficulty: 'Intermédiaire' },
  { id: 'ex_mob_3', name: 'Mobilité Thoracique (Rotation)', muscleGroup: 'Dos', equipment: 'PDC', type: 'Mobility', difficulty: 'Débutant' },
  { id: 'ex_mob_4', name: 'Étirement Ischio-jambiers', muscleGroup: 'Jambes', equipment: 'PDC', type: 'Mobility', difficulty: 'Débutant' },

  // Polyarticulaire / Cross
  { id: 'ex14', name: 'Box Jumps', muscleGroup: 'Jambes', equipment: 'Box', type: 'Polyarticulaire', difficulty: 'Intermédiaire' },
  { id: 'ex16', name: 'Thruster', muscleGroup: 'Full Body', equipment: 'Barre', type: 'Polyarticulaire', difficulty: 'Avancé' },
  { id: 'ex_cross_1', name: 'Kettlebell Swing', muscleGroup: 'Chaîne Postérieure', equipment: 'Kettlebell', type: 'Polyarticulaire', difficulty: 'Intermédiaire' },
  { id: 'ex_cross_2', name: 'Wall Ball', muscleGroup: 'Full Body', equipment: 'Med Ball', type: 'Polyarticulaire', difficulty: 'Intermédiaire' }
];

// --- GLOBAL SESSIONS LIBRARY ---
const MOCK_GLOBAL_SESSIONS: Session[] = [
  {
    id: 'gs1',
    infrastructureId: 'any',
    title: "Le WOD du Voyageur",
    type: "FOR TIME",
    workoutType: "FOR TIME",
    level: "Moyen",
    material: ["poids-corps"],
    bodyZone: "complet",
    durationMinutes: 20,
    description: "100 Air Squats, 50 Push-ups, 100 Sit-ups, 50 Push-ups, 100 Air Squats.",
    isCompleted: false,
    isGlobal: true,
    content: {
      advice: "Durée estimée 20 minutes. Entraînement parfait en déplacement.",
      mainBlock: [
        { exercise: "Air squats", prescription: "100 reps", rest: "0" },
        { exercise: "Pompes (push-ups)", prescription: "50 reps", rest: "0" },
        { exercise: "Sit-ups (abdos)", prescription: "100 reps", rest: "0" },
        { exercise: "Pompes (push-ups)", prescription: "50 reps", rest: "0" },
        { exercise: "Air squats", prescription: "100 reps", rest: "0" }
      ]
    }
  },
  {
    id: 'gs2',
    infrastructureId: 'any',
    title: "Séance Mobilité & Posture",
    type: "MOBILITE",
    workoutType: "MOBILITE",
    level: "Facile",
    material: ["tapis"],
    bodyZone: "complet",
    durationMinutes: 30,
    description: "Amélioration de la posture et relâchement des tensions liées au poste assis.",
    isCompleted: false,
    isGlobal: true,
    content: {
      advice: "Respirez profondément sur chaque position.",
      mainBlock: [
        { exercise: "Cobra", prescription: "3 x 30 sec", rest: "15 sec" },
        { exercise: "Pigeon Stretch", prescription: "2 x 45 sec / côté", rest: "10 sec" },
        { exercise: "Mobilité Thoracique", prescription: "3 x 12 reps", rest: "30 sec" },
        { exercise: "Enfant (Child's Pose)", prescription: "1 x 2 min", rest: "0" }
      ]
    }
  },
  {
    id: 'gs3',
    infrastructureId: 'infra1',
    title: "Full Body Force (MCO)",
    type: "MUSCU",
    workoutType: "MUSCU",
    level: "Intense",
    material: ["barre", "halteres"],
    bodyZone: "complet",
    durationMinutes: 60,
    description: "Travail de force de base pour le maintien en condition opérationnelle.",
    isCompleted: false,
    isGlobal: true,
    content: {
      advice: "Charge cible [75-80% 1RM]. Tempo contrôlé sur la descente.",
      mainBlock: [
        { exercise: "Squat Arrière", prescription: "5 séries x 5 reps", rest: "3 min" },
        { exercise: "Développé Couché", prescription: "4 séries x 8 reps", rest: "2 min" },
        { exercise: "Tractions Lestées", prescription: "4 séries x Max", rest: "2 min" },
        { exercise: "Développé Militaire", prescription: "3 séries x 10 reps", rest: "90 sec" }
      ]
    }
  },
  {
    id: 'gs4',
    infrastructureId: 'infra3',
    title: "Cross-Training Intense",
    type: "HIIT",
    workoutType: "HIIT",
    level: "Intense",
    material: ["kettlebell", "medball", "box"],
    bodyZone: "complet",
    durationMinutes: 45,
    description: "Circuit haute intensité pour la puissance et l'endurance cardiovasculaire.",
    isCompleted: false,
    isGlobal: true,
    content: {
      advice: "Enchaînez les mouvements sans repos dans le circuit.",
      mainBlock: [
        { exercise: "Kettlebell Swings", prescription: "20 reps", rest: "0" },
        { exercise: "Wall Balls", prescription: "20 reps", rest: "0" },
        { exercise: "Box Jumps", prescription: "20 reps", rest: "0" },
        { exercise: "Burpees", prescription: "10 reps", rest: "90 sec après le tour" }
      ],
      cooldown: "5 min de marche lente."
    }
  },
  {
    id: 'gs5',
    infrastructureId: 'infra2',
    title: "Séance VMA 400m",
    type: "CARDIO",
    workoutType: "CARDIO",
    level: "Intense",
    material: ["piste"],
    bodyZone: "bas",
    durationMinutes: 40,
    description: "Travail de la vitesse maximale aérobie sur piste.",
    isCompleted: false,
    isGlobal: true,
    content: {
      warmup: "15 min footing + gammes.",
      advice: "Allure cible [95-100% VMA].",
      mainBlock: [
        { exercise: "Course 400m", prescription: "2 blocs de 6 x 400m", rest: "1 min entre reps / 3 min entre blocs" }
      ]
    }
  }
];

// Mock Collective Sessions (Planning Fictif Cohérent)
const MOCK_COLLECTIVE_SESSIONS: CollectiveSession[] = [
  // LUNDI (1)
  { 
    id: 'c1', title: 'STEP', instructorName: 'Moniteur EPMS', timeStart: '08:30', timeEnd: '10:00', 
    locationName: 'Salle Fitness', dayOfWeek: 1, maxParticipants: 30, participants: [], 
    detailedDescription: 'Séance modérée.', serviceId: 'ba105'
  },
  { 
    id: 'c2', title: 'COACHING PERSONNALISE', instructorName: 'Moniteur EPMS', timeStart: '10:00', timeEnd: '11:00', 
    locationName: 'Salle', dayOfWeek: 1, maxParticipants: 30, participants: [], 
    detailedDescription: '', serviceId: 'ba105'
  },
  { 
    id: 'c3', title: 'CCPM Pompes - L. Léger', instructorName: 'Moniteur EPMS', timeStart: '11:00', timeEnd: '12:00', 
    locationName: 'Infrastructures', dayOfWeek: 1, maxParticipants: 30, participants: [], 
    detailedDescription: 'De juin à février', serviceId: 'ba105'
  },
  // MARDI (2)
  { 
    id: 'c4', title: 'SPORT EDCM', instructorName: 'Moniteur EPMS', timeStart: '09:00', timeEnd: '10:00', 
    locationName: 'Extérieur', dayOfWeek: 2, maxParticipants: 30, participants: [],
    detailedDescription: 'Séance élevée', serviceId: 'ba105'
  },
  { 
    id: 'c5', title: 'COURSE A PIED', instructorName: 'Moniteur EPMS', timeStart: '09:00', timeEnd: '10:00', 
    locationName: 'Extérieur', dayOfWeek: 2, maxParticipants: 30, participants: [],
    detailedDescription: 'Séance élevée', serviceId: 'ba105'
  },
  { 
    id: 'c6', title: 'PILATES / POSTURAL ou RENFO MUSCULAIRE', instructorName: 'Moniteur EPMS', timeStart: '10:00', timeEnd: '11:00', 
    locationName: 'Salle', dayOfWeek: 2, maxParticipants: 30, participants: [],
    detailedDescription: 'Séance modérée', serviceId: 'ba105'
  },
  { 
    id: 'c7', title: 'CCPM Pompes - L. Léger', instructorName: 'Moniteur EPMS', timeStart: '11:00', timeEnd: '12:00', 
    locationName: 'Infrastructures', dayOfWeek: 2, maxParticipants: 30, participants: [],
    detailedDescription: 'De juin à février', serviceId: 'ba105'
  },
  { 
    id: 'c8', title: 'COACHING PERSONNALISE', instructorName: 'Moniteur EPMS', timeStart: '15:30', timeEnd: '16:30', 
    locationName: 'Salle', dayOfWeek: 2, maxParticipants: 30, participants: [],
    detailedDescription: '', serviceId: 'ba105'
  },
  // MERCREDI (3)
  { 
    id: 'c9', title: 'SPORT ESCADRON CDC', instructorName: 'Moniteur EPMS', timeStart: '08:30', timeEnd: '10:00', 
    locationName: 'Infrastructures', dayOfWeek: 3, maxParticipants: 30, participants: [],
    detailedDescription: '', serviceId: 'ba105'
  },
  { 
    id: 'c10', title: 'COACHING PERSONNALISE', instructorName: 'Moniteur EPMS', timeStart: '10:00', timeEnd: '11:00', 
    locationName: 'Salle', dayOfWeek: 3, maxParticipants: 30, participants: [],
    detailedDescription: '', serviceId: 'ba105'
  },
  { 
    id: 'c11', title: 'ENTRAINEMENT CANDIDATS ECOLE DE L\'AIR SPRINT/ MUSCULATION', instructorName: 'Moniteur EPMS', timeStart: '15:00', timeEnd: '17:00', 
    locationName: 'Infrastructures', dayOfWeek: 3, maxParticipants: 30, participants: [],
    detailedDescription: 'Séance très élevée', serviceId: 'ba105'
  },
  // JEUDI (4)
  { 
    id: 'c12', title: 'SPORT CDC CMDT / OPS', instructorName: 'Moniteur EPMS', timeStart: '08:30', timeEnd: '10:00', 
    locationName: 'Infrastructures', dayOfWeek: 4, maxParticipants: 30, participants: [],
    detailedDescription: '', serviceId: 'ba105'
  },
  { 
    id: 'c13', title: 'COURSE A PIED', instructorName: 'Moniteur EPMS', timeStart: '08:30', timeEnd: '10:00', 
    locationName: 'Extérieur', dayOfWeek: 4, maxParticipants: 30, participants: [],
    detailedDescription: 'Séance modérée', serviceId: 'ba105'
  },
  { 
    id: 'c14', title: 'BIKING', instructorName: 'Moniteur EPMS', timeStart: '10:00', timeEnd: '11:30', 
    locationName: 'Salle Biking', dayOfWeek: 4, maxParticipants: 30, participants: [],
    detailedDescription: 'Séance très élevée', serviceId: 'ba105'
  },
  { 
    id: 'c15', title: 'COURS NATATION Apprentissage ou perfectionnement', instructorName: 'Moniteur EPMS', timeStart: '11:30', timeEnd: '12:30', 
    locationName: 'PISCINE DE LUYNES', dayOfWeek: 4, maxParticipants: 30, participants: [],
    detailedDescription: 'De Septembre à juin', serviceId: 'ba105'
  },
  // VENDREDI (5)
  { 
    id: 'c16', title: 'SPORT EOTS CDC', instructorName: 'Moniteur EPMS', timeStart: '08:30', timeEnd: '09:00', 
    locationName: 'Infrastructures', dayOfWeek: 5, maxParticipants: 30, participants: [],
    detailedDescription: '', serviceId: 'ba105'
  },
  { 
    id: 'c17', title: 'CROSS TRAINING ou INSANITY ou TABATA', instructorName: 'Moniteur EPMS', timeStart: '09:00', timeEnd: '10:00', 
    locationName: 'Salle Crossfit', dayOfWeek: 5, maxParticipants: 30, participants: [],
    detailedDescription: 'Séance très élevée', serviceId: 'ba105'
  },
  { 
    id: 'c18', title: 'CCPM + NAGE LIBRE', instructorName: 'Moniteur EPMS', timeStart: '11:30', timeEnd: '12:30', 
    locationName: 'PISCINE DE LUYNES', dayOfWeek: 5, maxParticipants: 30, participants: [],
    detailedDescription: 'De juin à décembre', serviceId: 'ba105'
  }
];

const MOCK_USERS: UserProfile[] = [
  {
    nid: '1234567890',
    name: 'Moniteur Chef',
    role: UserRole.MONITOR,
    password: 'password',
    gender: Gender.MALE,
    jobType: JobType.FUSCO,
    workSchedule: WorkSchedule.OFFICE,
    tests: { run2400mTime: "09:30", pullups: 15 },
    dailyForms: [],
    completedSessions: [],
    serviceId: 'ba105'
  },
  {
    nid: '0987654321',
    name: 'Sergent User',
    role: UserRole.USER,
    password: 'password',
    gender: Gender.FEMALE,
    jobType: JobType.PN,
    workSchedule: WorkSchedule.SHIFT,
    tests: { lucLegerPalier: 9, pushups: 20 },
    dailyForms: [],
    completedSessions: []
  },
  {
    nid: '1122334455',
    name: 'Colonel Authority',
    role: UserRole.ADMINISTRATOR,
    password: 'password',
    gender: Gender.MALE,
    jobType: JobType.ADMIN,
    workSchedule: WorkSchedule.OFFICE,
    tests: {},
    dailyForms: [],
    completedSessions: []
  }
];

import { doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { dbFirestore, handleFirestoreError, OperationType } from './firebase';

const PREFIX = 'v3_';

const load = <T,>(key: string, defaultVal: T): T => {
  const stored = localStorage.getItem(PREFIX + key);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error(`Error parsing JSON from localStorage for key "${key}":`, e);
      localStorage.setItem(PREFIX + key, JSON.stringify(defaultVal));
      return defaultVal;
    }
  }
  localStorage.setItem(PREFIX + key, JSON.stringify(defaultVal));
  return defaultVal;
};

// Ignore sync loop
let isSyncingFromFirebase = false;

const save = (key: string, val: any) => {
  localStorage.setItem(PREFIX + key, JSON.stringify(val));
  window.dispatchEvent(new Event('db_updated'));
  
  if (!isSyncingFromFirebase) {
    // Attempt to push to Firebase in the background
    setDoc(doc(dbFirestore, 'database_state', key), { data: val }).catch(err => {
      handleFirestoreError(err, OperationType.WRITE, `database_state/${key}`);
    });
  }
};

// Start listening to Firebase for all keys to keep LocalStorage in sync across devices
export const initializeDatabaseSync = () => {
  const keys = [
    'activeSessions', 'users', 'services', 'programs', 'infras', 
    'equipment', 'collectiveSessions', 'globalSessions', 
    'notifications', 'routes'
  ];

  // Prime local storage with defaults so they can be pushed if Firebase is empty
  db.getUsers();
  db.getServices();
  db.getPrograms();
  db.getInfrastructures();
  db.getEquipment();
  db.getCollectiveSessions();
  db.getGlobalSessions();
  db.getNotifications();
  db.getRoutes();

  let unsubscribes: (() => void)[] = [];
  
  // Clear any existing subscriptions first
  if ((window as any)._dbUnsubscribes) {
    (window as any)._dbUnsubscribes.forEach((unsub: () => void) => unsub());
  }
  (window as any)._dbUnsubscribes = unsubscribes;

  keys.forEach(key => {
    const unsub = onSnapshot(doc(dbFirestore, 'database_state', key), (snapshot) => {
      // Ignore errors initially wait we only catch errors in onError callback
      if (snapshot.exists()) {
        const val = snapshot.data().data;
        isSyncingFromFirebase = true;
        localStorage.setItem(PREFIX + key, JSON.stringify(val));
        window.dispatchEvent(new Event('db_updated'));
        isSyncingFromFirebase = false;
      } else {
        // First time initialization for this key in Firebase, deploy the default data
        const localData = localStorage.getItem(PREFIX + key);
        if (localData) {
          try {
            setDoc(doc(dbFirestore, 'database_state', key), { data: JSON.parse(localData) }).catch(err => {
              handleFirestoreError(err, OperationType.WRITE, `database_state/${key}`);
            });
          } catch(e) {}
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `database_state/${key}`);
    });
    unsubscribes.push(unsub);
  });
};


export const db = {
  getActiveSessions: () => load<ActiveSession[]>('activeSessions', []),
  startSession: (session: ActiveSession) => {
    const sessions = load<ActiveSession[]>('activeSessions', []);
    sessions.push(session);
    save('activeSessions', sessions);
    return session;
  },
  endSession: (sessionId: string) => {
    let sessions = load<ActiveSession[]>('activeSessions', []);
    sessions = sessions.filter(s => s.id !== sessionId);
    save('activeSessions', sessions);
  },
  getUsers: () => load<UserProfile[]>('users', MOCK_USERS),
  setUsers: (users: UserProfile[]) => save('users', users),
  getServices: () => load<ServiceEPMS[]>('services', MOCK_SERVICES),
  getPrograms: () => load<Program[]>('programs', []),
  setPrograms: (programs: Program[]) => save('programs', programs),
  getInfrastructures: () => load<Infrastructure[]>('infras', MOCK_INFRASTRUCTURES),
  setInfrastructures: (infras: Infrastructure[]) => save('infras', infras),
  getEquipment: () => load<Equipment[]>('equipment', MOCK_EQUIPMENT),
  setEquipment: (eq: Equipment[]) => save('equipment', eq),
  getCollectiveSessions: () => load<CollectiveSession[]>('collectiveSessions', MOCK_COLLECTIVE_SESSIONS),
  setCollectiveSessions: (cs: CollectiveSession[]) => save('collectiveSessions', cs),
  getExerciseLibrary: () => MOCK_EXERCISES,
  getGlobalSessions: () => load<Session[]>('globalSessions', MOCK_GLOBAL_SESSIONS),
  setGlobalSessions: (sessions: Session[]) => save('globalSessions', sessions),
  getNotifications: () => load<AppNotification[]>('notifications', []),
  setNotifications: (notifs: AppNotification[]) => save('notifications', notifs),
  getRoutes: () => load<SportsRoute[]>('routes', MOCK_ROUTES),
  setRoutes: (routes: SportsRoute[]) => save('routes', routes),
  addRoute: (route: SportsRoute) => {
    const routes = db.getRoutes();
    routes.push(route);
    db.setRoutes(routes);
  },
  addNotification: (notif: AppNotification) => {
    const notifs = db.getNotifications();
    notifs.push(notif);
    save('notifications', notifs);
  },

  addUser: (user: UserProfile) => {
    const users = db.getUsers();
    users.push(user);
    db.setUsers(users);
  },

  addProgram: (program: Program) => {
    const programs = db.getPrograms();
    programs.push(program);
    db.setPrograms(programs);
  },

  updateCollectiveSession: (updated: CollectiveSession) => {
    const sessions = db.getCollectiveSessions();
    const idx = sessions.findIndex(s => s.id === updated.id);
    if (idx !== -1) {
      sessions[idx] = updated;
      db.setCollectiveSessions(sessions);
    }
  },

  deleteCollectiveSession: (id: string) => {
    let sessions = db.getCollectiveSessions();
    sessions = sessions.filter(s => s.id !== id);
    db.setCollectiveSessions(sessions);
  },

  addCollectiveSession: (session: CollectiveSession) => {
    const sessions = db.getCollectiveSessions();
    sessions.push(session);
    db.setCollectiveSessions(sessions);
  },

  toggleSessionJoin: (sessionId: string, userNid: string) => {
    const sessions = db.getCollectiveSessions();
    const sess = sessions.find(s => s.id === sessionId);
    if (!sess) return;

    const isJoined = sess.participants.includes(userNid);
    if (isJoined) {
      sess.participants = sess.participants.filter(id => id !== userNid);
    } else {
      if (sess.participants.length < sess.maxParticipants) {
        sess.participants.push(userNid);
      }
    }
    db.setCollectiveSessions(sessions);
    return sess;
  },

  updateProgram: (updated: Program) => {
    const programs = db.getPrograms();
    const idx = programs.findIndex(p => p.id === updated.id);
    if (idx !== -1) {
      programs[idx] = updated;
      db.setPrograms(programs);
    }
  },

  updateInfrastructure: (updated: Infrastructure) => {
    const infras = db.getInfrastructures();
    const idx = infras.findIndex(i => i.id === updated.id);
    if (idx !== -1) {
      infras[idx] = updated;
      db.setInfrastructures(infras);
    }
  },

  updateEquipment: (updated: Equipment) => {
    const equipment = db.getEquipment();
    const idx = equipment.findIndex(e => e.id === updated.id);
    if (idx !== -1) {
      equipment[idx] = updated;
      db.setEquipment(equipment);
    }
  }
};
