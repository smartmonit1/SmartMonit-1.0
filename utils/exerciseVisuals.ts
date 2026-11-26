/**
 * Moteur de classification biomécanique & fiches techniques illustrées SMART MONIT 1.0
 * Audit complet couvrant 100 % des exercices de la bibliothèque EPMS, des WODs et des programmes.
 * Règle stricte : le nom de l'exercice est TOUJOURS analysé en priorité avant tout type global de séance.
 */

export type ExerciseVisualKind =
  | 'barbell_squat'
  | 'air_squat'
  | 'wall_ball'
  | 'bench_press'
  | 'overhead_press'
  | 'lateral_raise'
  | 'biceps_curl'
  | 'triceps_ext'
  | 'leg_machine'
  | 'pushup'
  | 'dips'
  | 'hspu'
  | 'pullup'
  | 'rowing'
  | 'deadlift'
  | 'glute_bridge'
  | 'lunge'
  | 'plank'
  | 'situps'
  | 'running'
  | 'bike_erg'
  | 'rowing_erg'
  | 'ski_erg'
  | 'swimming'
  | 'burpee'
  | 'mountain_climber'
  | 'jump_rope'
  | 'jumping_jacks'
  | 'box_jump'
  | 'kettlebell'
  | 'farmer_walk'
  | 'combat'
  | 'mobility'
  | 'rest';

export interface ExerciseVisualGuide {
  kind: ExerciseVisualKind;
  categoryLabel: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  cues: string[];
  commonMistakes: string[];
  breathing: string;
  scaledOption: string;
  accentColor: string;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export const EXERCISE_GUIDES: Record<ExerciseVisualKind, ExerciseVisualGuide> = {
  barbell_squat: {
    kind: 'barbell_squat',
    categoryLabel: 'Force Bas du Corps • Squat Chargé',
    primaryMuscles: ['Quadriceps', 'Grands Fessiers'],
    secondaryMuscles: ['Ischio-jambiers', 'Érecteurs du rachis', 'Sangle abdominale'],
    cues: [
      'Barre posée sur les trapèzes (jamais sur les cervicales), pieds largeur d\'épaules ouverts à 15°.',
      'Descendez en contrôlant (3 sec) hanches vers l\'arrière, genoux alignés dans l\'axe des orteils.',
      'Poussez fort dans tout le pied en maintenant le buste gainé jusqu\'à l\'extension complète.'
    ],
    commonMistakes: [
      'Genoux qui rentrent vers l\'intérieur (valgus) à la remontée.',
      'Talons qui décollent ou bas du dos qui s\'arrondit en bas du squat.'
    ],
    breathing: 'Inspiration abdominale profonde avant la descente (gainage), expiration sur le haut de la remontée.',
    scaledOption: 'Goblet Squat avec haltère léger ou Presse à cuisses guidée.',
    accentColor: '#e1ad01'
  },
  air_squat: {
    kind: 'air_squat',
    categoryLabel: 'Bas du Corps • Squat Poids du Corps',
    primaryMuscles: ['Quadriceps', 'Grands Fessiers'],
    secondaryMuscles: ['Ischio-jambiers', 'Mollets', 'Tronc'],
    cues: [
      'Pieds largeur d\'épaules, bras tendus devant pour équilibrer le buste droit.',
      'Descendez les hanches sous le niveau des genoux en gardant les talons ancrés au sol.',
      'Verrouillez complètement hanches et genoux en haut (ou impulsion souple pour Squat Jump).'
    ],
    commonMistakes: [
      'Buste qui plonge vers l\'avant avec dos rond sous l\'effet de la fatigue.',
      'Amplitude trop courte (demi-squats) ou réception jambes tendues sur Squat Jump.'
    ],
    breathing: 'Inspirez à la descente, expirez dynamiquement à la remontée.',
    scaledOption: 'Squat jusqu\'à toucher un banc / une box pour contrôler la profondeur.',
    accentColor: '#e1ad01'
  },
  wall_ball: {
    kind: 'wall_ball',
    categoryLabel: 'Complet • Wall Ball / Thruster',
    primaryMuscles: ['Quadriceps', 'Fessiers', 'Deltoïdes'],
    secondaryMuscles: ['Triceps', 'Sangle abdominale', 'Système cardiovasculaire'],
    cues: [
      'Maintenez le ballon/la barre devant la poitrine, coudes hauts et buste fier.',
      'Descendez en squat complet puis utilisez l\'explosivité des jambes pour propulser vers le haut.',
      'Amortissez immédiatement la réception du ballon/de la charge dans la descente du squat suivant.'
    ],
    commonMistakes: [
      'Pousser uniquement avec les bras au lieu d\'utiliser la poussée des hanches et des jambes.',
      'Laisser les coudes tomber et le dos s\'arrondir en bas du squat.'
    ],
    breathing: 'Inspirez au squat, expirez vigoureusement au lancer / à la poussée au-dessus de la tête.',
    scaledOption: 'Ballon plus léger (4–6 kg) ou cible plus basse / Thruster haltères légers.',
    accentColor: '#f59e0b'
  },
  bench_press: {
    kind: 'bench_press',
    categoryLabel: 'Haut du Corps • Poussée Horizontale',
    primaryMuscles: ['Grand Pectoral', 'Triceps'],
    secondaryMuscles: ['Deltoïde Antérieur', 'Stabilisateurs Scapulaires'],
    cues: [
      'Omoplates serrées et abaissées sur le banc, pieds solidement ancrés au sol.',
      'Descendez la charge sous contrôle vers le bas du sternum avec coudes à ~45° du buste.',
      'Repoussez de manière fluide en conservant les épaules collées au banc.'
    ],
    commonMistakes: [
      'Coudes trop ouverts à 90° (surcharge de la coiffe des rotateurs).',
      'Rebond de la barre sur la poitrine ou décollement des fessiers du banc.'
    ],
    breathing: 'Inspirez à la descente, expirez pendant la poussée.',
    scaledOption: 'Développé couché haltères charge modérée ou pompe inclinée mains sur banc.',
    accentColor: '#e1ad01'
  },
  overhead_press: {
    kind: 'overhead_press',
    categoryLabel: 'Épaules • Poussée Verticale',
    primaryMuscles: ['Deltoïdes (Antérieur & Moyen)', 'Triceps'],
    secondaryMuscles: ['Trapèze Supérieur', 'Sangle abdominale', 'Fessiers'],
    cues: [
      'Debout pieds largeur bassin, abdos et fessiers contractés pour verrouiller les lombaires.',
      'Départ charge aux clavicules, coudes légèrement devant la barre/les haltères.',
      'Poussez verticalement au-dessus de la tête en terminant bras alignés avec les oreilles.'
    ],
    commonMistakes: [
      'Cambrer excessivement le bas du dos pour compenser un manque de mobilité d\'épaule.',
      'Pousser la charge trop en avant au lieu de rester dans l\'axe vertical.'
    ],
    breathing: 'Inspirez en gainant avant de pousser, expirez au verrouillage en haut.',
    scaledOption: 'Développé assis avec dossier ou haltères unilatéraux à charge modérée.',
    accentColor: '#f59e0b'
  },
  lateral_raise: {
    kind: 'lateral_raise',
    categoryLabel: 'Épaules • Élévations & Trapèzes',
    primaryMuscles: ['Deltoïde Moyen / Postérieur', 'Trapèzes'],
    secondaryMuscles: ['Coiffe des rotateurs', 'Avant-bras'],
    cues: [
      'Buste droit et gainé, coudes légèrement fléchis et verrouillés à ~15°.',
      'Élevez les charges jusqu\'à l\'horizontale (hauteur d\'épaules) sans hausser les trapèzes.',
      'Freinez la descente (2–3 sec) pour conserver une tension continue.'
    ],
    commonMistakes: [
      'Donner de l\'élan avec le bas du dos pour monter une charge trop lourde.',
      'Monter les mains plus haut que les coudes.'
    ],
    breathing: 'Expirez à l\'élévation, inspirez pendant la descente contrôlée.',
    scaledOption: 'Élévations avec haltères légers ou élastique.',
    accentColor: '#f59e0b'
  },
  biceps_curl: {
    kind: 'biceps_curl',
    categoryLabel: 'Bras • Flexion Biceps',
    primaryMuscles: ['Biceps Brachial', 'Brachial Antérieur'],
    secondaryMuscles: ['Long Supinateur (Avant-bras)', 'Stabilisateurs Épaules'],
    cues: [
      'Coudes collés le long des flancs, épaules basses et buste gainé.',
      'Fléchissez les avant-bras sans avancer les coudes jusqu\'à contraction maximale.',
      'Contrôlez la descente jusqu\'à extension quasi complète.'
    ],
    commonMistakes: [
      'Balancer le buste en arrière pour initier la montée.',
      'Avancer les coudes en fin de mouvement.'
    ],
    breathing: 'Expirez en montant la charge, inspirez en redescendant.',
    scaledOption: 'Curl haltères alterné assis avec charge légère.',
    accentColor: '#e1ad01'
  },
  triceps_ext: {
    kind: 'triceps_ext',
    categoryLabel: 'Bras • Extension Triceps',
    primaryMuscles: ['Triceps Brachial (3 chefs)'],
    secondaryMuscles: ['Anconé', 'Stabilisateurs d\'épaule'],
    cues: [
      'Bras et coudes strictement fixes près des côtes (ou au-dessus de la tête en extension nuque).',
      'Tendez complètement les avant-bras en contractant fort les triceps 1 sec.',
      'Remontez lentement sans laisser les coudes s\'écarter.'
    ],
    commonMistakes: [
      'Transformer l\'extension en poussée avec les épaules et le dos.',
      'Amplitude incomplète en haut du mouvement.'
    ],
    breathing: 'Expirez sur l\'extension, inspirez à la flexion contrôlée.',
    scaledOption: 'Extension corde poulie haute à charge modérée.',
    accentColor: '#d97706'
  },
  leg_machine: {
    kind: 'leg_machine',
    categoryLabel: 'Jambes • Isolation Machine (Leg Ext / Curl / Mollets)',
    primaryMuscles: ['Quadriceps ou Ischio-jambiers', 'Mollets'],
    secondaryMuscles: ['Stabilisateurs Genoux & Chevilles'],
    cues: [
      'Alignez l\'axe de rotation de la machine avec l\'articulation du genou.',
      'Amplitude complète fluide sans claquer les poids en fin de course.',
      'Marquez 1 sec de contraction en pic avant de freiner le retour.'
    ],
    commonMistakes: [
      'Décoller les fessiers du siège ou donner des à-coups.',
      'Verrouiller violemment les genoux en extension.'
    ],
    breathing: 'Expirez sur l\'effort (poussée/flexion), inspirez au retour.',
    scaledOption: 'Charge légère en unilatéral pour équilibrer droite/gauche.',
    accentColor: '#e1ad01'
  },
  pushup: {
    kind: 'pushup',
    categoryLabel: 'CCPM • Pompes Poids du Corps',
    primaryMuscles: ['Grand Pectoral', 'Triceps'],
    secondaryMuscles: ['Deltoïde Antérieur', 'Sangle Abdominale', 'Dentelé Antérieur'],
    cues: [
      'Alignement strict tête–épaules–bassin–chevilles (fessiers et abdos gainés).',
      'Mains sous les épaules, descendez la poitrine au ras du sol avec coudes à ~45°.',
      'Tendez complètement les bras à la remontée sans creuser les lombaires (standard CCPM).'
    ],
    commonMistakes: [
      'Bassin qui s\'affaisse vers le sol ou fesses levées en « V ».',
      'Amplitude partielle (demi-répétitions non validées au CCPM).'
    ],
    breathing: 'Inspirez à la descente contrôlée, expirez à la poussée.',
    scaledOption: 'Pompes inclinées mains sur banc/box ou pompes sur les genoux corps gainé.',
    accentColor: '#f59e0b'
  },
  dips: {
    kind: 'dips',
    categoryLabel: 'Haut du Corps • Dips Barres Parallèles',
    primaryMuscles: ['Triceps', 'Grand Pectoral (faisceau inférieur)'],
    secondaryMuscles: ['Deltoïde Antérieur', 'Stabilisateurs Scapulaires'],
    cues: [
      'Épaules abaissées loin des oreilles, buste gainé et légèrement incliné vers l\'avant.',
      'Fléchissez les coudes vers l\'arrière jusqu\'à ce que les épaules arrivent au niveau des coudes.',
      'Repoussez fort jusqu\'au verrouillage complet des bras sans à-coup.'
    ],
    commonMistakes: [
      'Descendre trop bas avec les épaules qui s\'enroulent vers l\'avant (risque épaule).',
      'Balancer les jambes pour tricher sur la remontée.'
    ],
    breathing: 'Inspirez à la descente contrôlée, expirez sur l\'extension des bras.',
    scaledOption: 'Dips assistés avec élastique ou dips pieds au sol sur banc solide.',
    accentColor: '#d97706'
  },
  hspu: {
    kind: 'hspu',
    categoryLabel: 'Gymnastique • Handstand Push-Ups (HSPU)',
    primaryMuscles: ['Deltoïdes', 'Triceps'],
    secondaryMuscles: ['Trapèzes', 'Sangle abdominale', 'Dentelé Antérieur'],
    cues: [
      'Mains posées à largeur d\'épaules à ~20 cm du mur, talons en appui léger contre le mur.',
      'Descendez la tête sous contrôle en formant un triangle entre vos deux mains et le sommet du crâne.',
      'Poussez fort vers le haut en gardant le corps gainé jusqu\'au verrouillage complet.'
    ],
    commonMistakes: [
      'Chuter lourdement sur la tête (utilisez un tapis / abmat de protection).',
      'Cambrer excessivement le dos contre le mur (« banane »).'
    ],
    breathing: 'Inspirez à la descente contrôlée, expirez à la poussée verticale.',
    scaledOption: 'Pike Push-Ups (pompes en V) pieds au sol ou surélevés sur une box.',
    accentColor: '#ea580c'
  },
  pullup: {
    kind: 'pullup',
    categoryLabel: 'Dos • Tractions & Tirage Vertical',
    primaryMuscles: ['Grand Dorsal', 'Biceps'],
    secondaryMuscles: ['Rhomboïdes', 'Trapèze Inférieur', 'Avant-bras'],
    cues: [
      'Suspension bras tendus, abaissez d\'abord les omoplates vers le bas et l\'arrière.',
      'Tirez la poitrine vers la barre jusqu\'à passer franchement le menton au-dessus.',
      'Redescendez lentement en contrôlant la phase excentrique sans balancer les jambes.'
    ],
    commonMistakes: [
      'Tirer avec les épaules montées vers les oreilles.',
      'Se laisser tomber brutalement bras tendus en bas (stress coudes/épaules).'
    ],
    breathing: 'Expirez pendant la traction, inspirez durant la descente contrôlée.',
    scaledOption: 'Tractions assistées avec élastique, tractions australiennes ou tirage poulie haute.',
    accentColor: '#3b82f6'
  },
  rowing: {
    kind: 'rowing',
    categoryLabel: 'Dos • Tirage Horizontal / Rowing',
    primaryMuscles: ['Grand Dorsal', 'Rhomboïdes', 'Trapèze Moyen'],
    secondaryMuscles: ['Deltoïde Postérieur', 'Biceps', 'Érecteurs du rachis'],
    cues: [
      'Dos strictement plat et gainé (buste penché à 45° ou corps gainé sous barre en australien).',
      'Tirez les coudes près du corps en resserrant franchement les omoplates en haut.',
      'Marquez 1 seconde de contraction dorsale avant de contrôler le retour.'
    ],
    commonMistakes: [
      'Dos arrondi ou coups de reins pour soulever une charge trop lourde.',
      'Tirer uniquement avec les avant-bras sans engager les omoplates.'
    ],
    breathing: 'Expirez lors du tirage vers le buste, inspirez lors du retour.',
    scaledOption: 'Tractions australiennes / TRX jambes fléchies ou tirage assis poulie basse.',
    accentColor: '#2563eb'
  },
  deadlift: {
    kind: 'deadlift',
    categoryLabel: 'Chaîne Postérieure • Soulevé de Terre',
    primaryMuscles: ['Ischio-jambiers', 'Grands Fessiers', 'Érecteurs du rachis'],
    secondaryMuscles: ['Quadriceps', 'Grand Dorsal', 'Trapèzes', 'Avant-bras'],
    cues: [
      'Barre collée aux tibias, dos parfaitement plat, omoplates serrées (« casser la barre »).',
      'Poussez le sol avec les jambes puis verrouillez les hanches en contractant les fessiers.',
      'À la descente, poussez d\'abord les hanches vers l\'arrière en longeant les cuisses.'
    ],
    commonMistakes: [
      'Arrondir les lombaires au décollage (risque discal majeur).',
      'Barre qui s\'éloigne des jambes ou hyperextension du dos en haut.'
    ],
    breathing: 'Grande inspiration abdominale (gainage) avant le tirage, expiration en haut du mouvement.',
    scaledOption: 'Soulevé de terre Trap Bar ou kettlebell entre les pieds.',
    accentColor: '#dc2626'
  },
  glute_bridge: {
    kind: 'glute_bridge',
    categoryLabel: 'Chaîne Postérieure • Pont Fessier',
    primaryMuscles: ['Grands Fessiers', 'Ischio-jambiers'],
    secondaryMuscles: ['Transverse', 'Lombaires stabilisateurs'],
    cues: [
      'Allongé sur le dos, genoux fléchis à 90°, talons ancrés à largeur de bassin.',
      'Poussez dans les talons pour monter le bassin jusqu\'à l\'alignement épaules–hanches–genoux.',
      'Contractez fortement les fessiers 2 secondes en haut sans cambrer les lombaires.'
    ],
    commonMistakes: [
      'Monter trop haut en creusant excessivement le bas du dos.',
      'Pousser sur la pointe des pieds au lieu des talons.'
    ],
    breathing: 'Expirez en montant le bassin, inspirez en redescendant vertèbre par vertèbre.',
    scaledOption: 'Maintien bilatéral au poids du corps avant de passer en unilatéral.',
    accentColor: '#e1ad01'
  },
  lunge: {
    kind: 'lunge',
    categoryLabel: 'Unilatéral Jambes • Fentes',
    primaryMuscles: ['Quadriceps', 'Grands Fessiers'],
    secondaryMuscles: ['Ischio-jambiers', 'Moyen Fessier (Stabilité)', 'Tronc'],
    cues: [
      'Écart latéral largeur de hanches (jamais sur une ligne droite), buste droit et gainé.',
      'Fléchissez les deux genoux à ~90° en effleurant le sol avec le genou arrière.',
      'Repoussez principalement par le talon avant pour vous redresser de façon stable.'
    ],
    commonMistakes: [
      'Genou avant qui s\'effondre vers l\'intérieur.',
      'Buste penché en avant ou choc brutal du genou arrière au sol.'
    ],
    breathing: 'Inspirez à la descente, expirez sur la poussée de remontée.',
    scaledOption: 'Fentes arrière statiques (split squat) au poids du corps sans saut.',
    accentColor: '#e1ad01'
  },
  plank: {
    kind: 'plank',
    categoryLabel: 'Core • Gainage Planche & Anti-Rotation',
    primaryMuscles: ['Transverse', 'Grand Droit', 'Obliques'],
    secondaryMuscles: ['Grands Fessiers', 'Épaules', 'Lombaires'],
    cues: [
      'Coudes ou mains à l\'aplomb des épaules, bassin en légère rétroversion (nombril aspiré).',
      'Contractez simultanément abdos, fessiers et quadriceps pour verrouiller la ligne.',
      'Gardez la nuque dans le prolongement du dos et respirez de manière fluide.'
    ],
    commonMistakes: [
      'Laisser les lombaires se creuser sous la fatigue.',
      'Monter les fesses trop haut (annule le travail abdominal).'
    ],
    breathing: 'Respiration abdominale contrôlée et continue (jamais d\'apnée).',
    scaledOption: 'Planche inclinée mains sur banc ou appui sur les genoux alignés.',
    accentColor: '#0ea5e9'
  },
  situps: {
    kind: 'situps',
    categoryLabel: 'Abdominaux • Flexion Tronc / Sit-Ups / Relevés',
    primaryMuscles: ['Grand Droit de l\'abdomen', 'Fléchisseurs de hanche'],
    secondaryMuscles: ['Transverse', 'Obliques'],
    cues: [
      'Allongé sur le dos, bas du dos plaqué au tapis avant d\'initier la contraction.',
      'Enroulez le buste ou montez les jambes de manière contrôlée sans tirer sur la nuque.',
      'Maîtrisez la descente en freinant le retour pour maintenir la tension abdominale.'
    ],
    commonMistakes: [
      'Tirer violemment sur la nuque avec les mains.',
      'Cambrer le bas du dos lors des relevés de jambes / Hollow Rocks.'
    ],
    breathing: 'Expirez franchement à la montée (contraction), inspirez au retour.',
    scaledOption: 'Crunches jambes fléchies ou Hollow Hold genoux ramenés vers la poitrine.',
    accentColor: '#0284c7'
  },
  running: {
    kind: 'running',
    categoryLabel: 'Cardio • Course à Pied & VMA',
    primaryMuscles: ['Système Cardiovasculaire', 'Quadriceps', 'Mollets'],
    secondaryMuscles: ['Fessiers', 'Ischio-jambiers', 'Sangle abdominale'],
    cues: [
      'Posture grande et dynamique, légère inclinaison vers l\'avant depuis les chevilles.',
      'Cadence régulière (~170–180 pas/min), pose du pied sous le centre de gravité.',
      'Respectez scrupuleusement vos allures cibles (% VMA) sans sur-régime au départ.'
    ],
    commonMistakes: [
      'Partir trop vite sur les premiers intervalles et s\'effondrer en fin de bloc.',
      'Épaules crispées ou attaque talon très loin devant le bassin.'
    ],
    breathing: 'Rythme respiratoire régulier synchronisé sur la foulée (ex. 2 pas inspi / 2 pas expi).',
    scaledOption: 'Course plus lente (65–70% VMA), marche rapide active ou vélo sans impact.',
    accentColor: '#10b981'
  },
  bike_erg: {
    kind: 'bike_erg',
    categoryLabel: 'Cardio Sans Impact • BikeErg / Vélo',
    primaryMuscles: ['Quadriceps', 'Système Cardiovasculaire'],
    secondaryMuscles: ['Fessiers', 'Ischio-jambiers', 'Mollets'],
    cues: [
      'Réglez la selle à hauteur de hanche (jambe quasi tendue en bas de pédale).',
      'Maintenez une cadence (RPM) constante et fluide (75–90 RPM selon la consigne).',
      'Gardez les épaules relâchées et le dos neutre, poussez et tirez rond sur les pédales.'
    ],
    commonMistakes: [
      'Selle trop basse provoquant une surcharge sur la rotule.',
      'Damper trop fort cassant la fluidité du pédalage.'
    ],
    breathing: 'Respiration profonde et rythmée sur la cadence de pédalage.',
    scaledOption: 'Réduisez le damper (2–3) et maintenez une zone aérobie confortable.',
    accentColor: '#059669'
  },
  rowing_erg: {
    kind: 'rowing_erg',
    categoryLabel: 'Cardio Complet • Rameur Concept2',
    primaryMuscles: ['Quadriceps', 'Grand Dorsal', 'Système Cardiovasculaire'],
    secondaryMuscles: ['Fessiers', 'Ischio-jambiers', 'Tronc', 'Biceps'],
    cues: [
      'Phase effort (Drive) : Jambes d\'abord → Buste incliné → Tirage Bras vers le bas des côtes.',
      'Phase retour (Recovery) : Bras tendus → Buste basculé → Flexion des jambes contrôlée.',
      'Damper réglé entre 4 et 6 pour une glisse puissante et un dos toujours neutre.'
    ],
    commonMistakes: [
      'Tirer avec les bras avant d\'avoir fini de pousser avec les jambes.',
      'Arrondir le bas du dos en position avant (« catch »).'
    ],
    breathing: 'Expirez sur la poussée/tirage, inspirez calmement pendant le retour.',
    scaledOption: 'Cadence modérée (20–24 coups/min) en soignant la séquence Jambes-Buste-Bras.',
    accentColor: '#059669'
  },
  ski_erg: {
    kind: 'ski_erg',
    categoryLabel: 'Cardio Haut du Corps • SkiErg',
    primaryMuscles: ['Grand Dorsal', 'Triceps', 'Sangle Abdominale'],
    secondaryMuscles: ['Système Cardiovasculaire', 'Fessiers', 'Épaules'],
    cues: [
      'Départ mains hautes, déclenchez la traction en engageant les abdos et les dorsaux.',
      'Fléchissez légèrement les hanches et les genoux pour transférer le poids du corps.',
      'Terminez le tirage mains le long des cuisses puis remontez fluide en vous grandissant.'
    ],
    commonMistakes: [
      'Tirer uniquement avec les bras sans engager le tronc et les hanches.',
      'S\'affaisser complètement en squat profond à chaque coup.'
    ],
    breathing: 'Expirez vigoureusement pendant la traction vers le bas, inspirez en remontant.',
    scaledOption: 'Damper 3–4 et cadence régulière sans à-coups.',
    accentColor: '#0d9488'
  },
  swimming: {
    kind: 'swimming',
    categoryLabel: 'Aquatique • Natation (Crawl / Brasse)',
    primaryMuscles: ['Grand Dorsal', 'Deltoïdes', 'Système Cardiovasculaire'],
    secondaryMuscles: ['Pectoraux', 'Triceps', 'Tronc', 'Jambes'],
    cues: [
      'Corps horizontal et gainé à la surface, regard dirigé vers le fond du bassin.',
      'Allongez loin devant pour maximiser la glisse, puis tirez coude haut sous l\'eau.',
      'Battements réguliers depuis les hanches (crawl) ou ciseau dynamique groupé (brasse).'
    ],
    commonMistakes: [
      'Relever la tête devant (fait couler les jambes et augmente la traînée).',
      'Bloquer sa respiration sous l\'eau au lieu d\'expirer en continu.'
    ],
    breathing: 'Expiration continue sous l\'eau (bulles), inspiration rapide sur le côté (crawl) ou en sortie (brasse).',
    scaledOption: 'Utilisation d\'un pull-buoy ou planche pour isoler technique et respiration.',
    accentColor: '#0284c7'
  },
  burpee: {
    kind: 'burpee',
    categoryLabel: 'Métabolique • Burpees (Corps Entier)',
    primaryMuscles: ['Corps Entier', 'Système Cardiovasculaire'],
    secondaryMuscles: ['Pectoraux', 'Quadriceps', 'Tronc', 'Épaules'],
    cues: [
      'Posez les mains au sol, passez en planche gainée puis poitrine au sol sans creuser le dos.',
      'Repoussez et ramenez les deux pieds à plat près des mains avant de vous redresser.',
      'Terminez par une extension dynamique sautée bras levés au-dessus de la tête.'
    ],
    commonMistakes: [
      'Laisser tomber le bassin lourdement au sol (hyperextension lombaire).',
      'Partir en sprint et exploser au bout de 15 répétitions.'
    ],
    breathing: 'Expirez à la remontée et au saut, inspirez à la descente.',
    scaledOption: 'Up-Downs (sans pompe ni saut) ou Burpees en pas chassés (step-back / step-up).',
    accentColor: '#ef4444'
  },
  mountain_climber: {
    kind: 'mountain_climber',
    categoryLabel: 'Cardio Core • Mountain Climbers / Quadrupédie',
    primaryMuscles: ['Sangle Abdominale', 'Fléchisseurs de hanche', 'Épaules'],
    secondaryMuscles: ['Quadriceps', 'Système Cardiovasculaire', 'Dentelé'],
    cues: [
      'Position planche haute, mains fermement ancrées directement sous les épaules.',
      'Montez alternativement chaque genou vers la poitrine en gardant le bassin bas et stable.',
      'Sur la marche de l\'ours, avancez main et pied opposés genoux à 3 cm du sol, dos plat.'
    ],
    commonMistakes: [
      'Monter les fesses vers le plafond au fil des répétitions.',
      'Épaules qui reculent derrière les mains.'
    ],
    breathing: 'Respiration courte, rythmée et continue sans jamais bloquer le souffle.',
    scaledOption: 'Exécution lente contrôlée ou mains surélevées sur un banc.',
    accentColor: '#f97316'
  },
  jump_rope: {
    kind: 'jump_rope',
    categoryLabel: 'Cardio Coordination • Corde à Sauter (SU / DU)',
    primaryMuscles: ['Mollets', 'Système Cardiovasculaire'],
    secondaryMuscles: ['Avant-bras', 'Épaules', 'Stabilisateurs Chevilles'],
    cues: [
      'Coudes proches des côtes : la rotation de la corde vient uniquement des poignets.',
      'Sauts légers et rebondissants sur l\'avant-pied, corps droit et gainé.',
      'Sur Double Unders, sautez légèrement plus haut tout en accélérant les poignets (sans plier les jambes).'
    ],
    commonMistakes: [
      'Écarter les bras très loin du corps (raccourcit la corde).',
      'Replier les talons vers les fesses (« donkey kick ») en plein saut.'
    ],
    breathing: 'Respiration fluide et régulière, épaules relâchées.',
    scaledOption: 'Single Unders (1 tour par saut) ou sauts sans corde (Penguin Taps).',
    accentColor: '#10b981'
  },
  jumping_jacks: {
    kind: 'jumping_jacks',
    categoryLabel: 'Cardio Échauffement • Jumping Jacks',
    primaryMuscles: ['Système Cardiovasculaire', 'Mollets', 'Deltoïdes'],
    secondaryMuscles: ['Abducteurs / Adducteurs', 'Tronc'],
    cues: [
      'Écartez simultanément pieds et bras au-dessus de la tête dans un mouvement fluide.',
      'Amortissez souplement sur l\'avant-pied avec genoux légèrement déverrouillés.',
      'Maintenez un gainage abdominal léger et une cadence dynamique constante.'
    ],
    commonMistakes: [
      'Atterrir lourdement sur les talons jambes raides.',
      'Ne pas monter les bras complètement au-dessus de la tête.'
    ],
    breathing: 'Inspirez à l\'ouverture, expirez au retour ou rythme régulier continu.',
    scaledOption: 'Step Jacks (sans saut : un pied après l\'autre sur le côté).',
    accentColor: '#10b981'
  },
  box_jump: {
    kind: 'box_jump',
    categoryLabel: 'Pliométrie • Box Jump / Step-Up',
    primaryMuscles: ['Quadriceps', 'Grands Fessiers', 'Mollets'],
    secondaryMuscles: ['Ischio-jambiers', 'Tronc', 'Stabilisateurs Genoux'],
    cues: [
      'Impulsion explosive avec balancier des bras, réception silencieuse et souple sur toute la surface du pied.',
      'Terminez toujours en extension complète des hanches debout sur la box.',
      'Redescendez un pied après l\'autre (step-down) pour protéger les tendons d\'Achille.'
    ],
    commonMistakes: [
      'Sauter en arrière pour redescendre de la box (risque rupture tendon d\'Achille).',
      'Réception sur le bord de la box ou genoux qui rentrent vers l\'intérieur.'
    ],
    breathing: 'Expirez à l\'impulsion, inspirez en redescendant.',
    scaledOption: 'Box Step-Ups (montées alternées sans saut) ou hauteur de box réduite.',
    accentColor: '#ea580c'
  },
  kettlebell: {
    kind: 'kettlebell',
    categoryLabel: 'Puissance Balistique • Kettlebell Swing / Arraché',
    primaryMuscles: ['Grands Fessiers', 'Ischio-jambiers', 'Épaules'],
    secondaryMuscles: ['Érecteurs du rachis', 'Tronc', 'Avant-bras'],
    cues: [
      'Mouvement de charnière de hanche (hinge) : poussez les fesses vers l\'arrière, dos parfaitement plat.',
      'Propulsez la charge vers l\'avant/haut par une contraction explosive des fessiers et abdos.',
      'Les bras servent de guides : ne tirez pas avec le bas du dos.'
    ],
    commonMistakes: [
      'Transformer le Kettlebell Swing en squat (trop de flexion de genoux).',
      'Cambrer les lombaires en fin de poussée.'
    ],
    breathing: 'Expiration courte et puissante au sommet de l\'extension de hanche.',
    scaledOption: 'Kettlebell Swing hauteur poitrine (Russian Swing) avec poids modéré.',
    accentColor: '#d97706'
  },
  farmer_walk: {
    kind: 'farmer_walk',
    categoryLabel: 'Force Opérationnelle • Port de Charge (Farmer Walk)',
    primaryMuscles: ['Avant-bras (Grip)', 'Trapèzes', 'Sangle Abdominale'],
    secondaryMuscles: ['Fessiers', 'Quadriceps', 'Stabilisateurs Rachis'],
    cues: [
      'Soulevez les charges dos plat (comme un soulevé de terre), poitrine fière et épaules abaissées.',
      'Marchez d\'un pas rapide, court et maîtrisé sans laisser le buste osciller latéralement.',
      'Gardez le regard droit devant et la sangle abdominale verrouillée sur toute la distance.'
    ],
    commonMistakes: [
      'Enrouler les épaules vers l\'avant ou pencher le buste sur le côté.',
      'Faire des pas trop grands provoquant un balancement incontrôlé des charges.'
    ],
    breathing: 'Respiration thoracique courte et régulière tout en maintenant le gainage.',
    scaledOption: 'Réduisez la charge par main ou raccourcissez les allers-retours (15–20 m).',
    accentColor: '#b45309'
  },
  combat: {
    kind: 'combat',
    categoryLabel: 'Combat & Dynamique • Frappes / Montées de Genoux',
    primaryMuscles: ['Système Cardiovasculaire', 'Épaules', 'Fléchisseurs de hanche'],
    secondaryMuscles: ['Obliques (Rotation)', 'Quadriceps', 'Mollets'],
    cues: [
      'Garde haute, menton rentré, appuis légers et dynamiques sur l\'avant-pied.',
      'Sur les directs, pivotez légèrement les hanches et les épaules en expirant sec à l\'impact.',
      'Sur les montées/coups de genoux, gardez le buste droit et montez le genou au-dessus de la hanche.'
    ],
    commonMistakes: [
      'Baisser la garde ou verrouiller brutalement les coudes en hyperextension.',
      'Se pencher en arrière lors des montées de genoux.'
    ],
    breathing: 'Expiration sèche et rythmée sur chaque frappe ou montée de genou.',
    scaledOption: 'Cadence contrôlée sans saut en privilégiant la précision du geste.',
    accentColor: '#dc2626'
  },
  mobility: {
    kind: 'mobility',
    categoryLabel: 'Mobilité • Prévention TMS, Proprioception & ORFA',
    primaryMuscles: ['Mobilité Articulaire', 'Posture & Stabilisateurs Profonds'],
    secondaryMuscles: ['Coiffe des rotateurs', 'Rachis', 'Chevilles / Hanches', 'Diaphragme'],
    cues: [
      'Exécutez lentement, avec un contrôle moteur total et toujours sans douleur vive.',
      'Maintenez chaque amplitude extrême 2 à 3 secondes en relâchant les tensions parasites.',
      'Sur proprioception/cervicales : maintenez l\'alignement neutre en respirant calmement.'
    ],
    commonMistakes: [
      'Effectuer des à-coups balistiques ou retenir sa respiration.',
      'Bâcler la vitesse d\'exécution (la mobilité exige lenteur et précision).'
    ],
    breathing: 'Cohérence respiratoire lente (4–5 sec inspiration nasale / 5–6 sec expiration buccale).',
    scaledOption: 'Réduisez l\'amplitude ou utilisez un appui mural/tapis pour sécuriser l\'équilibre.',
    accentColor: '#6366f1'
  },
  rest: {
    kind: 'rest',
    categoryLabel: 'Récupération Active • Pause & Hydratation',
    primaryMuscles: ['Système Nerveux', 'Récupération Cardiaque'],
    secondaryMuscles: ['Diaphragme', 'Relâchement Musculaire'],
    cues: [
      'Restez debout ou marchez lentement pour favoriser le retour veineux (évitez de vous effondrer).',
      'Hydratez-vous par petites gorgées et pratiquez 4 à 6 respirations abdominales profondes.',
      'Préparez mentalement votre posture et vos charges pour le bloc suivant.'
    ],
    commonMistakes: [
      'S\'allonger brutalement après un effort VMA maximal.',
      'Ne pas surveiller le chronomètre et dépasser le temps de récupération prescrit.'
    ],
    breathing: 'Inspiration nasale lente (4 sec), expiration buccale prolongée (6 sec) pour abaisser la FC.',
    scaledOption: 'Prolongez la récupération de +30 sec si votre bilan de forme est en Zone Orange.',
    accentColor: '#0ea5e9'
  }
};

/**
 * Classifie avec précision le nom de l'exercice SANS JAMAIS être pollué par `fallbackType` (ex: HYROX).
 * `fallbackType` n'est utilisé qu'en ultime recours si le texte d'exercice ne contient aucun mot-clé reconnu.
 */
export const resolveExerciseVisual = (name: string, fallbackType?: string): ExerciseVisualGuide => {
  const s = norm(name || '');

  // 1. Récupération / Pause / Consigne générique de repos
  if (/(recuperation|pause entre|minute de pause|minute de repos|sec.*repos|repos entre|echauffement)/.test(s) && !/(squat|pompe|burpee|course|fente|traction|gainage|sit-up|rameur|bike)/.test(s)) {
    return EXERCISE_GUIDES.rest;
  }

  // 2. Mobilité, étirements, ORFA, prévention, cervicales, proprioception, face pull, Pilates postural
  if (/(mobilite|etirement|stretch|psoas|orfa|respiration|thoracique|face pull|rotateur|coherence|relaxation|decompression|postur|scapulaire|cervical|proprioception|cheville unipodale|yoga|pilates|spine|saw|mermaid|swan dive|swimming pilates|bird-dog|bird dog|rolling like|clamshell|side kick|single leg kick)/.test(s) && !/(leg stretch)/.test(s)) {
    return EXERCISE_GUIDES.mobility;
  }

  // 3. Natation aquatique (Crawl, Brasse, Dos, Papillon) — hors "Swimming Pilates" déjà géré ci-dessus
  if (/(crawl|brasse|natation|nage|papillon|bassin)/.test(s)) {
    return EXERCISE_GUIDES.swimming;
  }

  // 4. Ergomètres spécifiques (SkiErg, BikeErg, Vélo, Elliptique, AirBike, Rameur, Stepper) — AVANT rowing barre & course !
  if (/(skierg|ski erg|ski-erg)/.test(s)) {
    return EXERCISE_GUIDES.ski_erg;
  }
  if (/(bikeerg|bike erg|bike-erg|airbike|velo|assault|pedala|elliptique|cross-trainer)/.test(s)) {
    return EXERCISE_GUIDES.bike_erg;
  }
  if (/(rameur|rowerg|concept2|ergo)/.test(s)) {
    return EXERCISE_GUIDES.rowing_erg;
  }
  if (/(stepper|stairmaster|escalier)/.test(s)) {
    return EXERCISE_GUIDES.box_jump;
  }

  // 5. Burpees (y compris Burpees Box Jump Over)
  if (/(burpee|sprawl|up-down|devil press|man maker)/.test(s)) {
    return EXERCISE_GUIDES.burpee;
  }

  // 6. Mountain Climbers & Marche de l'ours
  if (/(mountain|climber|marche de l'ours|marche de l ours|bear crawl)/.test(s)) {
    return EXERCISE_GUIDES.mountain_climber;
  }

  // 7. Corde à sauter (Double Unders / Single Unders)
  if (/(double under|single under|double-under|corde a sauter|\bdu\b)/.test(s)) {
    return EXERCISE_GUIDES.jump_rope;
  }

  // 8. Jumping Jacks
  if (/(jumping jack|jumping-jack)/.test(s)) {
    return EXERCISE_GUIDES.jumping_jacks;
  }

  // 9. Box Jump & Box Step-Ups (montées de box)
  if (/(box jump|box-jump|box step|montees? de box|sauts? box|sauts? sur boite)/.test(s)) {
    return EXERCISE_GUIDES.box_jump;
  }

  // 10. Combat & montées/coups de genoux & directs boxe
  if (/(directs? bras|coups? de genoux|montees? de genoux|boxe|shadow|frappe)/.test(s)) {
    return EXERCISE_GUIDES.combat;
  }

  // 11. Wall Ball & Thruster
  if (/(wall ball|wall-ball|ballon leste|thruster)/.test(s)) {
    return EXERCISE_GUIDES.wall_ball;
  }

  // 12. Fentes (y compris fentes sautées / marchées / bulgares) — AVANT squat & jump !
  if (/(fente|lunge|bulgare|split squat)/.test(s)) {
    return EXERCISE_GUIDES.lunge;
  }

  // 13. Machines isolation jambes (Leg Extension, Leg Curl, Mollets)
  if (/(leg extension|leg curl|mollets?|calf raise)/.test(s)) {
    return EXERCISE_GUIDES.leg_machine;
  }

  // 13b. Squats : distinguer Air Squat / PDC / Pistol / Chaise / Squat Jump VS Squat chargé barre / Presse
  if (/(air squat|air-squat|poids de corps|poids du corps|squat jump|squats? saute|demi-squat|pistol|chaise)/.test(s)) {
    return EXERCISE_GUIDES.air_squat;
  }
  if (/(squat arriere|back squat|front squat|hack squat|presse a cuisse|leg press|goblet squat)/.test(s)) {
    return EXERCISE_GUIDES.barbell_squat;
  }
  if (/\bsquats?\b/.test(s)) {
    // Dans un WOD sans mention de barre, "20 Squats" = Air Squats au poids du corps
    return /(barre|charge|1rm|leste)/.test(s) ? EXERCISE_GUIDES.barbell_squat : EXERCISE_GUIDES.air_squat;
  }

  // 14. Pont fessier / Hip Thrust / Shoulder Bridge — AVANT deadlift !
  if (/(pont fessier|hip thrust|glute bridge|shoulder bridge)/.test(s)) {
    return EXERCISE_GUIDES.glute_bridge;
  }

  // 15. Soulevé de terre / Deadlift / Chaîne postérieure barre / Superman
  if (/(souleve de terre|deadlift|roumain|good morning|trap bar|superman)/.test(s)) {
    return EXERCISE_GUIDES.deadlift;
  }

  // 16. Handstand Push-ups (HSPU / pompes en poirier) — AVANT pompes classiques !
  if (/(handstand|hspu|poirier|pompes? inverse)/.test(s)) {
    return EXERCISE_GUIDES.hspu;
  }

  // 17. Dips — AVANT pompes !
  if (/\bdips\b/.test(s)) {
    return EXERCISE_GUIDES.dips;
  }

  // 18. Pompes (Push-ups, diamant, hand release)
  if (/(pompe|push-up|pushup|push up)/.test(s)) {
    return EXERCISE_GUIDES.pushup;
  }

  // 19. Isolation Bras (Biceps Curl & Extensions Triceps)
  if (/(curl biceps|curl halteres|curl marteau|curl poulie|\bcurl\b)/.test(s) && !/(leg curl)/.test(s)) {
    return EXERCISE_GUIDES.biceps_curl;
  }
  if (/(extension triceps|barre au front|skull crusher)/.test(s)) {
    return EXERCISE_GUIDES.triceps_ext;
  }

  // 19b. Élévations latérales / frontales / oiseau / shrugs
  if (/(elevations? laterale|elevations? frontale|oiseau|shrug)/.test(s)) {
    return EXERCISE_GUIDES.lateral_raise;
  }

  // 19c. Développé Militaire / Épaules vertical — AVANT développé couché !
  if (/(developpe militaire|developpe epaule|overhead press|push press|strict press|militaire)/.test(s)) {
    return EXERCISE_GUIDES.overhead_press;
  }

  // 20. Développé couché / Incliné / Écarté / Chest Press / Pull-Over
  if (/(developpe couche|developpe incline|bench press|ecarte|chest press|pull-over|pectoraux|pec)/.test(s)) {
    return EXERCISE_GUIDES.bench_press;
  }

  // 21. Rowing / Tirage horizontal / Tractions australiennes / TRX — AVANT tractions verticales !
  if (/(australienne|trx|rowing|tirage horizontal|tirage inverse|buste penche|anneaux|t-bar)/.test(s)) {
    return EXERCISE_GUIDES.rowing;
  }

  // 22. Tractions verticales / Pull-ups / Tirage vertical
  if (/(traction|pull-up|pullup|pull up|tirage vertical|chin-up|muscle-up)/.test(s) && !/(leg pull)/.test(s)) {
    return EXERCISE_GUIDES.pullup;
  }

  // 23. Sit-ups, Crunches, Pilates abdominaux (Hundred, Roll-Up, Leg Stretch, Crisscross, Teaser, Woodchopper) — AVANT plank !
  if (/(sit-up|situp|crunch|hollow|v-up|tuck-up|tucks-up|releves? de jambe|abdo|hundred|roll-up|leg stretch|crisscross|teaser|woodchopper)/.test(s) && !/(gainage|planche|plank)/.test(s)) {
    return EXERCISE_GUIDES.situps;
  }

  // 24. Gainage / Planche / Pallof Press / Transverse / Leg Pull Front / Side Plank / Gainage Commando
  if (/(gainage|planche|plank|pallof|transverse|bird-dog|bird dog|anti-rotation|l-sit|leg pull)/.test(s)) {
    return EXERCISE_GUIDES.plank;
  }

  // 25. Farmer Walk / Port de charge
  if (/(farmer|port de charge|valise|marche.*charge)/.test(s)) {
    return EXERCISE_GUIDES.farmer_walk;
  }

  // 26. Kettlebell Swing / Arraché / Clean / Snatch
  if (/(kettlebell|swing|arrache|snatch|clean|haltere)/.test(s)) {
    return EXERCISE_GUIDES.kettlebell;
  }

  // 27. Course à pied / Run / Fractionné / VMA / Tapis de Course / Fartlek / Footing / Côtes
  if (/(course|courir|footing|fractionne|vma|sprint|\brun\b|30\/30|seuil|2400|cooper|luc leger|fartlek|tapis de course|cotes|marche active|km de course|m de course|\d+m\s*run)/.test(s)) {
    return EXERCISE_GUIDES.running;
  }

  // 28. Ultime recours uniquement : fallbackType (si le titre d'exercice est générique ex: "Étape 1 : 36 reps")
  const fb = norm(fallbackType || '');
  if (/(cardio|course|endurance)/.test(fb)) return EXERCISE_GUIDES.running;
  if (/(mobilit|recup|orfa)/.test(fb)) return EXERCISE_GUIDES.mobility;
  if (/(tabata|emom|amrap|hiit|hyrox|for time)/.test(fb)) return EXERCISE_GUIDES.burpee;
  if (/(muscu|force|renfo)/.test(fb)) return EXERCISE_GUIDES.barbell_squat;

  return EXERCISE_GUIDES.air_squat;
};
