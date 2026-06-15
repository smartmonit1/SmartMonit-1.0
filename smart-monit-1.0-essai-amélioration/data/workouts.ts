export interface WorkoutDetails {
  format_label: string;
  intro?: string;
  exercises: { text: string }[];
  scaled?: {
    intro: string;
    exercises: { text: string }[];
  };
  conseil?: string;
  type_special?: string;
  niveaux?: any[];
}

export interface Workout {
  title: string;
  material: string | string[];
  body: string;
  duration: number;
  type: string;
  level: string;
  desc: string;
  details?: WorkoutDetails;
  pdf?: string;
}

export const workouts: Workout[] = [
    { title: "Le WOD du Voyageur", material: ["poids-corps"], body: "complet", duration: 0, type: "FOR TIME", level: "Moyen", desc: "100 Air Squats, 50 Push-ups(pompes), 100 Sit-ups(abdos), 50 Push-ups, 100 Air Squats.",
      details: { format_label: "FOR TIME", exercises: [
          { text: "100 Air squats" }, { text: "50 Pompes (push-ups)" }, { text: "100 Sit-ups (abdos)" }, { text: "50 Pompes (push-ups)" }, { text: "100 Air squats" }
        ], conseil: "Durée estimée 20 minutes. Entraînement parfait en déplacement." }},

    { title: "Le WOD 10 to 1", material: ["poids-corps"], body: "complet", duration: 0, type: "FOR TIME", level: "Moyen", desc: "10-9-8-7-6-5-4-3-2-1 répétitions de : Burpees et Sit-ups(abdos).",
      details: { format_label: "FOR TIME", intro: "Réaliser 10 puis 9 / 8 / 7 / 6 / 5 / 4 / 3 / 2 / 1 reps des exercices suivants :", exercises: [
          { text: "Burpees" }, { text: "Sit-ups (abdos)" }
        ], conseil: "Format dégressif — durée estimée 15 minutes." }},

    { title: "Le WOD Lunges & Co", material: ["poids-corps"], body: "bas", duration: 20, type: "AMRAP", level: "Facile", desc: "<strong>AMRAP 20 min :</strong> 20 Jumping Lunges(fentes), 20 Sit-ups(abdos), 20 Air Squats.",
      details: { format_label: "AMRAP 20 MINUTES", intro: "Réaliser les exercices :", exercises: [
          { text: "20 Fentes sautées (Jumping lunges)" }, { text: "20 Sit-ups (abdos)" }, { text: "20 Squats poids de corps (air squats)" }
        ], conseil: "But d'un AMRAP : faire le plus de tours dans le temps imparti. Essayer de garder un rythme régulier du début à la fin." }},

    { title: "Le WOD Annie", material: ["corde"], body: "complet", duration: 0, type: "FOR TIME", level: "Intense", desc: "50-40-30-20-10 : Double-Unders et Sit-ups(abdos).",
      details: { format_label: "FOR TIME", intro: "Réaliser 50 puis 40 / 30 / 20 / 10 reps :", exercises: [
          { text: "Double unders (corde à sauter)" }, { text: "Sit-ups (abdos)" }
        ], scaled: { intro: "VERSION SCALED — même schéma 50 / 40 / 30 / 20 / 10 :", exercises: [
          { text: "Single unders (corde à sauter)" }, { text: "Sit-ups (abdos)" }
        ]}, conseil: "Faire 50 DU - 50 sit-ups, puis 40 DU - 40 sit-ups, etc. Si difficile avec les double unders, faire des single unders. Le but est d'aller vite — faire les reps unbroken (sans pause)." }},

    { title: "Le WOD Cindy", material: ["traction"], body: "complet", duration: 20, type: "AMRAP", level: "Moyen", desc: "<strong>AMRAP 20 min :</strong> 5 Pull-ups(tractions), 10 Push-ups(pompes), 15 Air Squats.",
      details: { format_label: "AMRAP 20 MINUTES", intro: "Réaliser les exercices :", exercises: [
          { text: "5 Tractions (pull-ups)" }, { text: "10 Pompes (push-ups)" }, { text: "15 Squats poids de corps (air squats)" }
        ], scaled: { intro: "VERSION SCALED :", exercises: [
          { text: "5 Tractions australiennes ou tractions TRX" }, { text: "10 Pompes sur les genoux ou pompes inclinées" }, { text: "15 Squats poids de corps (air squats)" }
        ]}, conseil: "But d'un AMRAP : faire le plus de tours dans le temps imparti. Essayer de garder un rythme régulier du début à la fin." }},

    { title: "Le WOD Death by Burpees", material: ["poids-corps"], body: "complet", duration: 15, type: "EMOM", level: "Intense", desc: "<strong>EMOM :</strong> Minute 1 : 1 Burpee, Minute 2 : 2 Burpees...",
      details: { format_label: "EMOM 15 MINUTES", exercises: [
          { text: "1ère minute : 1 burpee (reste de la minute = repos)" },
          { text: "2ème minute : 2 burpees" }, { text: "3ème minute : 3 burpees" },
          { text: "4ème minute : 4 burpees … et ainsi de suite …" },
          { text: "15ème minute : 15 burpees" }
        ], scaled: { intro: "VERSION SCALED — 2 suggestions :", exercises: [
          { text: "Faire les burpees sans saut" }, { text: "Faire les burpees sans la pompe" }
        ]}, conseil: "EMOM : faire le nombre de répétitions prévu, le reste du temps dans la minute sert à se reposer. Cela se corse à partir de la 10ème minute." }},

    { title: "Le WOD Angie", material: ["traction"], body: "complet", duration: 0, type: "FOR TIME", level: "Intense", desc: "100 Pull-ups(tractions), 100 Push-ups(pompes), 100 Sit-ups(abdos), 100 Squats.",
      details: { format_label: "FOR TIME", exercises: [
          { text: "100 Tractions (pull-ups)" }, { text: "100 Pompes (push-ups)" }, { text: "100 Sit-ups (abdos)" }, { text: "100 Squats au poids de corps (air squats)" }
        ], scaled: { intro: "VERSION SCALED :", exercises: [
          { text: "30 Tractions australiennes ou tractions TRX" }, { text: "30 Pompes inclinées ou sur les genoux" }, { text: "30 Crunches" }, { text: "30 Squats au poids de corps" }
        ]}, conseil: "Durée estimée 35 minutes. 400 répétitions à effectuer." }},

    { title: "Le WOD Barbara", material: ["traction"], body: "complet", duration: 0, type: "FOR TIME", level: "Intense", desc: "5 rounds (3' repos) : 20 Pull-ups, 30 Push-ups, 40 Sit-ups, 50 Squats.",
      details: { format_label: "5 ROUNDS FOR TIME", intro: "Réaliser 5 rounds :", exercises: [
          { text: "20 Tractions (pull-ups)" }, { text: "30 Pompes (push-ups)" }, { text: "40 Sit-ups (abdos)" }, { text: "50 Squats au poids de corps (air squats)" }, { text: "3 minutes de pause entre les rounds" }
        ], scaled: { intro: "VERSION SCALED — 5 rounds :", exercises: [
          { text: "10 Tractions australiennes ou tractions TRX" }, { text: "15 Pompes inclinées ou sur les genoux" }, { text: "20 Crunches" }, { text: "25 Squats au poids de corps" }, { text: "3 minutes de pause entre les rounds" }
        ]}, conseil: "Durée estimée 45 minutes." }},

    { title: "Le WOD Murph", material: ["traction", "gilet-leste"], body: "complet", duration: 0, type: "FOR TIME", level: "Intense", desc: "1.6km course, 100 Pull-ups(tractions), 200 Push-ups(pompes), 300 Squats, 1.6km course.",
      details: { format_label: "FOR TIME", exercises: [
          { text: "1,6 km de course à pied" }, { text: "100 Tractions (pull-ups)" }, { text: "200 Pompes (push-ups)" }, { text: "300 Squats au poids de corps (air squats)" }, { text: "1,6 km de course à pied" }
        ], conseil: "Durée estimée 50 minutes. WOD très dur — ne pas hésiter à partitionner les séries de tractions / pompes / squats. Les plus forts portent un gilet lesté (9 kg homme / 6 kg femme)." }},

    { title: "Le WOD Sit-ups & Burpees", material: ["poids-corps"], body: "abdos", duration: 0, type: "FOR TIME", level: "Intense", desc: "10-20-30-40-30-20-10 : Sit-ups(abdos) et Burpees.",
      details: { format_label: "FOR TIME", intro: "Réaliser 10-20-30-40-30-20-10 répétitions de :", exercises: [
          { text: "Sit-ups (abdos)" }, { text: "Burpees" }
        ], conseil: "Durée estimée 15 minutes en format pyramidale. Mieux vaut un rythme régulier et lent pour les burpees." }},
    
    { title: "Le WOD Chelsea", material: ["traction"], body: "complet", duration: 30, type: "EMOM", level: "Moyen", desc: "<strong>EMOM 30 min :</strong> 5 Pull-ups(tractions), 10 Push-ups(pompes), 15 Squats.",
      details: { format_label: "EMOM 30 MINUTES", exercises: [
          { text: "5 Tractions (pull-ups)" }, { text: "10 Pompes (push-ups)" }, { text: "15 Squats au poids de corps (air squats)" }
        ], scaled: { intro: "VERSION SCALED :", exercises: [
          { text: "5 Tractions australiennes ou tractions TRX" }, { text: "10 Pompes inclinées ou sur les genoux" }, { text: "15 Squats au poids de corps (air squats)" }
        ]}, conseil: "Effectuer tous les mouvements dans la minute. Le reste du temps sert de repos." }},
    
    { title: "Le WOD Candy", material: ["traction"], body: "complet", duration: 0, type: "FOR TIME", level: "Intense", desc: "5 rounds : 20 Pull-ups(tractions), 40 Push-ups(pompes), 60 Squats.",
      details: { format_label: "FOR TIME", intro: "Réaliser 5 rounds :", exercises: [
          { text: "20 Tractions (pull-ups)" }, { text: "40 Pompes (push-ups)" }, { text: "60 Squats au poids de corps (air squats)" }
        ], conseil: "Durée estimée 40 minutes. Version allégée du Murph (sans la course)." }},
    
    { title: "Le WOD Karabel", material: ["ballon-leste"], body: "complet", duration: 0, type: "FOR TIME", level: "Moyen", desc: "10 rounds : 15 Wall Balls(ballon lesté) et 15 Burpees.",
      details: { format_label: "FOR TIME", intro: "Réaliser 10 rounds :", exercises: [
          { text: "15 Wall balls (ballon lesté)" }, { text: "15 Burpees" }
        ], conseil: "Durée estimée 15 minutes." }},
    
    { title: "Le WOD Mary", material: ["poids-corps"], body: "complet", duration: 20, type: "AMRAP", level: "Intense", desc: "5 Handstand Push-ups(pompes inversées), 10 Pistols(squat une jambe), 15 Pull-ups(tractions).",
      details: { format_label: "AMRAP 20 MINUTES", exercises: [
          { text: "5 Handstand Push-ups (pompes en poirier contre un mur)" }, { text: "10 Pistols (squats sur une seule jambe)" }, { text: "15 Tractions (pull-ups)" }
        ], scaled: { intro: "VERSION SCALED :", exercises: [
          { text: "HSPU → pompes avec pieds surélevés" }, { text: "Pistols → fentes arrières alternées (ou pistols en tenant un poteau)" }
        ]}, conseil: "AMRAP = autant de répétitions que possible en enchaînant les séries pendant 20 minutes." }},
    
    { title: "Le WOD Nicole", material: ["traction"], body: "complet", duration: 20, type: "AMRAP", level: "Intense", desc: "Run 400m, Max Pull-ups(tractions).",
      details: { format_label: "AMRAP 20 MINUTES", exercises: [
          { text: "400 mètres de course à pied" }, { text: "Maximum de tractions (pull-ups)" }
        ], conseil: "Le score est le nombre total de tractions effectuées." }},
    
    { title: "Le WOD Jump & Push", material: ["box-jump"], body: "complet", duration: 20, type: "AMRAP", level: "Moyen", desc: "10 Box Jumps, 15 Push-ups(pompes), 20 Sit-ups(abdos).",
      details: { format_label: "AMRAP 20 MINUTES", exercises: [
          { text: "10 Box jumps (sauts sur boîte/banc)" }, { text: "15 Pompes (push-ups)" }, { text: "20 Sit-ups (abdos)" }
        ], conseil: "On peut remplacer les box jumps par des squats jumps (sans matériel)." }},
    
    { title: "Le WOD Handstand", material: ["poids-corps"], body: "complet", duration: 0, type: "FOR TIME", level: "Intense", desc: "5 rounds : 10 HSPU(pompes inversées), 20 Squats, 10 HSPU, 20 Lunges(fentes).",
      details: { format_label: "FOR TIME", intro: "Réaliser 5 rounds :", exercises: [
          { text: "10 Handstand Push-ups (pompes en poirier contre un mur)" }, { text: "20 Squats au poids de corps (air squats)" }, { text: "10 Handstand Push-ups (pompes en poirier contre un mur)" }, { text: "20 Fentes (lunges)" }
        ], scaled: { intro: "VERSION SCALED :", exercises: [
          { text: "Remplacer les HSPU par des pompes avec pieds surélevés" }
        ]}, conseil: "-" }},
    
    { title: "Le WOD Super Legs", material: ["poids-corps"], body: "bas", duration: 0, type: "FOR TIME", level: "Facile", desc: "<strong>5 rounds :</strong> 20 Air Squats, 20 Alternating Lunges(fentes), 20 Split Squat Jumps, 10 Squat Jumps.",
      details: { format_label: "FOR TIME", intro: "Réaliser 5 rounds :", exercises: [
          { text: "20 Squats au poids de corps (air squats)" }, { text: "20 Fentes alternées (lunges)" }, { text: "20 Fentes sautées" }, { text: "10 Squats sautés (squats jumps)" }
        ], conseil: "Ça brûle ! Penser à ne pas s'avachir avec la fatigue, on garde le buste droit." }},
    
    { title: "Le WOD Air Squat Galore", material: ["poids-corps"], body: "bas", duration: 0, type: "FOR TIME", level: "Facile", desc: "500 Air Squats pour le temps.",
      details: { format_label: "FOR TIME", exercises: [
          { text: "500 Squats au poids de corps le plus rapidement possible (air-squats)" }
        ], conseil: "Durée estimée 20 minutes." }},
    
    { title: "Le WOD Plank & Push", material: ["poids-corps"], body: "complet", duration: 15, type: "AMRAP", level: "Facile", desc: "10 Push-ups(pompes), 20 Sit-ups(abdos), 30 sec Plank(gainage planche-abdos).",
      details: { format_label: "AMRAP 15 MINUTES", exercises: [
          { text: "10 Pompes (push-ups)" }, { text: "20 Sit-ups (abdos)" }, { text: "30 sec de gainage en planche" }
        ], conseil: "Sur la planche, aspirer le nombril et serrer les fessiers." }},
    
    { title: "Le WOD Lunges & Run", material: ["poids-corps"], body: "bas", duration: 0, type: "FOR TIME", level: "Facile", desc: "5 rounds : Run 400m, 30 Walking Lunges(fentes marchées).",
      details: { format_label: "FOR TIME", intro: "Réaliser 5 rounds :", exercises: [
          { text: "400m de course à pied" }, { text: "30 Fentes marchées (walking lunges)" }
        ], conseil: "Durée estimée 25 minutes. Utiliser la course pour récupérer le souffle après les fentes." }},
    
    { title: "Le WOD Burpee Marathon", material: ["poids-corps"], body: "complet", duration: 0, type: "FOR TIME", level: "Intense", desc: "150 Burpees le plus vite possible.",
      details: { format_label: "FOR TIME", exercises: [
          { text: "150 Burpees le plus rapidement possible" }
        ], conseil: "Trouver un rythme pour tenir le plus longtemps possible sans pause. Mieux vaut être lent." }},
    
    { title: "Le WOD Cloverfield", material: ["poids-corps"], body: "complet", duration: 0, type: "FOR TIME", level: "Intense", desc: "Run 2400m(course à pied), 150 Burpees, Run 2400m.",
      details: { format_label: "FOR TIME", exercises: [
          { text: "1,6 km de course à pied (run)" }, { text: "150 Burpees" }, { text: "1,6 km de course à pied (run)" }
        ], conseil: "Trouver un rythme pour tenir le plus longtemps possible sans pause. Mieux vaut être lent." }},
    
    { title: "Le WOD Shawn", material: ["poids-corps"], body: "complet", duration: 0, type: "FOR TIME", level: "Moyen", desc: "Run 8km. Toutes les 5 min : 50 Squats et 50 Push-ups(pompes).",
      details: { format_label: "FOR TIME", exercises: [
          { text: "8 km de course à pied avec un arrêt toutes les 5 minutes pour exécuter :" }, { text: "→ 50 Squats au poids de corps (air-squats)" }, { text: "→ 50 Pompes (push-ups)" }
        ], conseil: "Prévoir de quoi s'hydrater, l'effort dépasse l'heure de travail." }},
    
    { title: "Le WOD Cindy XXX", material: ["traction"], body: "complet", duration: 20, type: "AMRAP", level: "Intense", desc: "<strong>AMRAP 20 min :</strong> WOD CINDY version hard ; Pull-ups(tractions), Push-ups(pompes), Air Squats.",
      details: { format_label: "AMRAP 20 MINUTES", intro: "Enchaîner les séries progressives :", exercises: [
          { text: "10 Pull-Ups + 20 Push-Ups + 30 Air Squats" }, { text: "15 Pull-Ups + 30 Push-Ups + 45 Air Squats" }, { text: "20 Pull-Ups + 40 Push-Ups + 60 Air Squats" }, { text: "25 Pull-Ups + 50 Push-Ups + 75 Air Squats" }, { text: "30 Pull-Ups + 60 Push-Ups + 90 Air Squats" }
        ], scaled: { intro: "VERSION SCALED :", exercises: [
          { text: "Remplacer les tractions par des tractions australiennes ou TRX" }, { text: "Pompes sur les genoux ou inclinées" }
        ]}, conseil: "Version musclée du WOD CINDY." }},
    
    { title: "Le WOD Zachary Tellier", material: ["poids-corps"], body: "complet", duration: 0, type: "FOR TIME", level: "Intense", desc: "10 Burpees au départ, puis enchainement Burpees / Push-ups(pompes) / Lunges(fentes) / Sit-ups(abdos).",
      details: { format_label: "FOR TIME", intro: "10 burpees buy-in, puis enchaîner :", exercises: [
          { text: "10 Burpees + 25 Push-ups" }, { text: "10 Burpees + 25 Push-ups + 50 Lunges" }, { text: "10 Burpees + 25 Push-ups + 50 Lunges + 100 Sit-ups" }, { text: "10 Burpees + 25 Push-ups + 50 Lunges + 100 Sit-ups + 150 Air Squats" }
        ], scaled: { intro: "VERSION SCALED :", exercises: [
          { text: "Pompes sur les genoux ou inclinées" }, { text: "Burpees sans le saut et/ou sans la pompe" }
        ]}, conseil: "Durée estimée 35 minutes." }},
    
    { title: "Le WOD Loredo", material: ["poids-corps"], body: "complet", duration: 0, type: "FOR TIME", level: "Moyen", desc: "<strong>6 tours :</strong> 24 Squats, 24 Push-ups(pompes), 24 Walking Lunges(fentes marchées), 400m Run.",
      details: { format_label: "FOR TIME", intro: "Réaliser 6 rounds :", exercises: [
          { text: "24 Air squats" }, { text: "24 Pompes (push-ups)" }, { text: "24 Fentes marchées (walking lunges)" }, { text: "400m Course à pied (run)" }
        ], scaled: { intro: "VERSION SCALED — 4 rounds :", exercises: [
          { text: "24 Air squats" }, { text: "24 Pompes inclinées ou sur les genoux" }, { text: "24 Fentes marchées (walking lunges)" }, { text: "400m Course à pied (run)" }
        ]}, conseil: "144 reps par exercice." }},
    
    { title: "Le WOD Bert", material: ["poids-corps"], body: "complet", duration: 0, type: "FOR TIME", level: "Intense", desc: "50 Burpees, 400m Run(course), 100 Push-ups(pompes), 400m Run, 150 Walking Lunges(fentes marchées), 400m Run, 200 Squats, 400m Run, 150 Walking Lunges, 400m Run, 100 Push-ups, 400m Run, 50 Burpees.",
      details: { format_label: "FOR TIME", exercises: [
          { text: "50 Burpees" }, { text: "400m Run" }, { text: "100 Push-Ups (pompes)" }, { text: "400m Run" }, { text: "150 Walking Lunges (fentes marchées)" }, { text: "400m Run" }, { text: "200 Air Squats" }, { text: "400m Run" }, { text: "150 Walking Lunges" }, { text: "400m Run" }, { text: "100 Push-Ups" }, { text: "400m Run" }, { text: "50 Burpees" }
        ], scaled: { intro: "VERSION SCALED :", exercises: [
          { text: "20 Burpees / 200m Run / 30 Knee Push-Ups / 200m Run / 40 Walking Lunges / 200m Run / 50 Air Squats / 200m Run / (miroir en sens inverse)" }
        ]}, conseil: "Durée estimée 70 minutes." }},
    
    { title: "Le WOD Hero Mark Klement", material: ["poids-corps"], body: "complet", duration: 0, type: "FOR TIME", level: "Intense", desc: "<strong>7 tours :</strong> 74-44-11 reps de Burpees, Push-ups(pompes), Sit-ups(abdos), Air squats.",
      details: { format_label: "FOR TIME", intro: "Réaliser 74 puis 44 puis 11 reps de :", exercises: [
          { text: "Burpees" }, { text: "Pompes (push-ups)" }, { text: "Sit-ups (abdos)" }, { text: "Air squats" }
        ], scaled: { intro: "VERSION SCALED — mêmes séries avec :", exercises: [
          { text: "Burpees sans sauts et/ou sans pompes" }, { text: "Pompes sur les genoux ou inclinées" }
        ]}, conseil: "129 reps par exercice au total." }},
    
    { title: "Le WOD Hero Maupin", material: ["poids-corps"], body: "complet", duration: 0, type: "FOR TIME", level: "Moyen", desc: "800m Run(course), 49 Push-ups(pompes), 49 Sit-ups(abdos), 49 Air Squats.",
      details: { format_label: "FOR TIME", intro: "Réaliser 4 rounds :", exercises: [
          { text: "800m de course à pied (run)" }, { text: "49 Pompes (push-ups)" }, { text: "49 Sit-ups (abdos)" }, { text: "49 Air squats" }
        ], scaled: { intro: "VERSION SCALED — 4 rounds :", exercises: [
          { text: "800m de course à pied" }, { text: "49 Pompes inclinées ou sur les genoux" }, { text: "49 Sit-ups ou crunches" }, { text: "49 Air squats" }
        ]}, conseil: "196 reps par exercice au total." }},
    
    { title: "Le WOD Chad", material: ["box-jump","gilet-leste"], body: "bas", duration: 0, type: "FOR TIME", level: "Intense", desc: "1000 Box Step-ups. Option : gilet lesté.",
      details: { format_label: "FOR TIME", exercises: [
          { text: "1000 montées de box à 50cm (Box Step-Ups)" }, { text: "Avec gilet lesté : 20 kg/homme, 15 kg/femme" }
        ], scaled: { intro: "VERSION SCALED (sans gilet) :", exercises: [
          { text: "1000 montées de box à 50cm (Box Step-Ups)" }
        ]}, conseil: "Box de 50 cm." }},
    
    { title: "Le WOD Cooper", material: ["poids-corps"], body: "complet", duration: 0, type: "FOR TIME", level: "Facile", desc: "10 rounds : 10 Burpees, 10 Air Squats, 10 Push-ups(pompes), 10 Sit-ups(abdos).",
      details: { format_label: "FOR TIME", intro: "Réaliser 10 rounds :", exercises: [
          { text: "10 Burpees" }, { text: "10 Air squats" }, { text: "10 Pompes (push-ups)" }, { text: "10 Sit-ups (abdos)" }
        ], scaled: { intro: "VERSION SCALED — 5 rounds :", exercises: [
          { text: "10 Burpees" }, { text: "10 Air squats" }, { text: "10 Pompes inclinées ou sur les genoux" }, { text: "10 Sit-ups (abdos)" }
        ]}, conseil: "Durée estimée 30 minutes." }},
    
    { title: "Le WOD Orbison", material: ["poids-corps"], body: "complet", duration: 0, type: "EMOM", level: "Moyen", desc: "<strong>EMOM 20 min :</strong> 4 Burpees, 6 Air Squats, 8 Sit-Ups(abdos).",
      details: { format_label: "EMOM 20 MINUTES", exercises: [
          { text: "4 Burpees" }, { text: "6 Air squats" }, { text: "8 Sit-ups (abdos)" }
        ], scaled: { intro: "VERSION SCALED :", exercises: [
          { text: "2 Burpees" }, { text: "3 Air squats" }, { text: "4 Sit-ups (abdos)" }
        ]}, conseil: "Sur 1 minute, effectuer les 4 burpees, 6 air squats, 8 sit-ups. Le reste de la minute sert de repos. À enchaîner 20 fois." }},
    
    { title: "Le WOD It's a trap", material: ["poids-corps"], body: "complet", duration: 0, type: "FOR TIME", level: "Intense", desc: "commencer par 200m Run(course) puis effectuer 100 Burpees avec toutes les 2 minutes un Run de 200m.",
      details: { format_label: "FOR TIME", exercises: [
          { text: "200m de course à pied au départ (run)" }, { text: "100 Burpees" }, { text: "200m de course à pied toutes les 2 minutes" }
        ], scaled: { intro: "VERSION SCALED :", exercises: [
          { text: "200m de course à pied au départ" }, { text: "50 Burpees" }, { text: "200m de course à pied toutes les 2 minutes" }
        ]}, conseil: "Toutes les 2 minutes (donc min 2, 4, 6, 8…), stopper les burpees et repartir pour 200m de course." }},
    
    { title: "Le WOD The Longest Mile", material: ["poids-corps"], body: "complet", duration: 0, type: "FOR TIME", level: "Moyen", desc: "4 rounds : 10 Burpees, 100m Run(course), 10 Air Squats, 100m Run, 10 Push-ups(pompes), 100m Run, 10 Sit-ups(abdos), 100m Run.",
      details: { format_label: "FOR TIME", intro: "Réaliser 4 rounds :", exercises: [
          { text: "10 Burpees" }, { text: "100m Run" }, { text: "10 Air Squats" }, { text: "100m Run" }, { text: "10 Push-Ups (pompes)" }, { text: "100m Run" }, { text: "10 Sit-Ups (abdos)" }, { text: "100m Run" }
        ], scaled: { intro: "VERSION SCALED — 3 rounds (mêmes exercices)", exercises: [
          { text: "10 Burpees" }, { text: "100m Run" }, { text: "10 Air Squats" }, { text: "100m Run" }, { text: "10 Push-Ups (pompes)" }, { text: "100m Run" }, { text: "10 Sit-Ups (abdos)" }, { text: "100m Run" }
        ]}, conseil: "-" }},
    
    { title: "Le WOD Durante Core", material: ["poids-corps"], body: "abdos", duration: 0, type: "FOR TIME", level: "Facile", desc: "<strong>ABDOS - 5 tours :</strong> 10 Hollow Rocks, 10 V-ups, 10 Tuck-ups, 10 sec Hollow Hold, 1 minute de pause.",
      details: { format_label: "FOR TIME", intro: "Réaliser 5 rounds :", exercises: [
          { text: "10 Hollow Rocks" }, { text: "10 V-Ups" }, { text: "10 Tucks-Ups" }, { text: "10 sec Hollow Hold" }, { text: "1 minute de pause" }
        ], scaled: { intro: "VERSION SCALED — 5 rounds :", exercises: [
          { text: "10 Hollow Rock Scaled" }, { text: "10 Sit-Ups" }, { text: "10 Tucks-Ups" }, { text: "10 sec Hollow Hold Scaled" }, { text: "1 minute de pause" }
        ]}, conseil: "-" }},
    
    { title: "Le WOD Dee", material: ["poids-corps"], body: "complet", duration: 0, type: "FOR TIME", level: "Moyen", desc: "4 rounds : 40 Air Squats, 30 Hand Release Push-Up(pompes), 20 Burpees.",
      details: { format_label: "FOR TIME", intro: "Réaliser 4 rounds :", exercises: [
          { text: "40 Air Squats" }, { text: "30 Pompes avec décollement des mains en position basse (Hand Release Push-Ups)" }, { text: "20 Burpees" }, { text: "400m de course à pied (run)" }
        ], scaled: { intro: "VERSION SCALED — 4 rounds :", exercises: [
          { text: "40 Air Squats" }, { text: "30 Pompes ou pompes sur les genoux" }, { text: "20 Burpees" }, { text: "400m de course à pied" }
        ]}, conseil: "-" }},
    
    { title: "Le WOD Open 12.1", material: ["poids-corps"], body: "complet", duration: 7, type: "AMRAP", level: "Facile", desc: "<strong>AMRAP 7 min :</strong> Maximum de Burpees.",
      details: { format_label: "AMRAP 7 MINUTES", exercises: [
          { text: "Burpees — maximum de répétitions" }
        ], conseil: "Max de burpees en 7 minutes. Privilégier un maximum de répétitions sans pause. Les plus forts touchent lors du saut une barre à 15 cm au-dessus de la position bras levés." }},
    
    { title: "Le WOD Riley", material: ["poids-corps","gilet-leste"], body: "complet", duration: 0, level: "Intense", type: "FOR TIME", desc: "2.4km Run, 150 Burpees, 2.4km Run.",
      details: { format_label: "FOR TIME", intro: "Avec gilet lesté de 9 kg/6 kg :", exercises: [
          { text: "2400m de course à pied (run)" }, { text: "150 Burpees" }, { text: "2400m de course à pied" }
        ], scaled: { intro: "VERSION SCALED (avec ou sans gilet) :", exercises: [
          { text: "1000m de course à pied" }, { text: "100 Burpees" }, { text: "1000m de course à pied" }
        ]}, conseil: "-" }},
    
    { title: "RENFO Haut & Postérieur", material: ["barre"], body: "complet", duration: 0, type: "MUSCU", level: "Moyen", desc: "5 rounds : 10 Deadlifts (soulevé de terre), 10 Bench Press (développé couché).",
      details: { format_label: "MUSCU / RENFORCEMENT", intro: "Réaliser 5 séries de ces 2 exercices (superset) :", exercises: [
          { text: "10 Soulevé de terre (Deadlift → renforcement chaîne postérieure)" }, { text: "10 Développé couché (Bench Press → renforcement pectoraux, triceps, avant de l'épaule)" }
        ], conseil: "Entraînement barre libre — adapter la charge à votre niveau. Demander conseils si vous débutez sur ces mouvements." }},
    
    { title: "Séance BikeERG orientée FORCE", material: ["bike-erg"], body: "bas", duration: 40, type: "CARDIO", level: "Intense", desc: "séance de fractionné pendant 40 minutes.",
      details: { format_label: "SÉANCE CARDIO — 40 MINUTES", exercises: [
          { text: "Échauffement : 10 minutes (damper 2-3)" }, { text: "Fractionné : 20 minutes — 10 fois :" }, { text: "→ 1 minute d'effort (damper et RPM selon niveau, min. 70-75 RPM)" }, { text: "→ 1 minute de récupération" }, { text: "Récupération : 10 minutes (damper 2-3)" }
        ], conseil: "40 minutes avec 20 de fractionné. Adapter le damper (minimum 4) et le RPM. Le RPM doit rester constant pendant les minutes d'effort." }},
    { title: "Séance intervalle BikeERG", material: ["bike-erg"], body: "bas", duration: 30, type: "CARDIO", level: "Moyen", desc: "séance de fractionné pendant 30 minutes.",
      details: { format_label: "SÉANCE CARDIO — 30 MINUTES", exercises: [
          { text: "Échauffement : 10 minutes (damper 2-3)" }, { text: "Fractionné : 10 minutes — 10 fois :" }, { text: "→ 1 minute intensité max. (pédalage le plus rapide possible)" }, { text: "→ 1 minute de récupération" }, { text: "Récupération : 10 minutes (damper 2-3)" }
        ], conseil: "Adapter le damper (minimum 3) et le RPM selon votre niveau." }},
    
    { title: "WOD TABATA 30/10", material: ["poids-corps"], body: "complet", duration: 6.5, type: "TABATA", level: "Facile", desc: "<strong>30 sec travail / 10 sec repos :</strong> Squats, Burpees, Mountain Climbers, Jumping jacks, Fente avant(lunges).",
      details: { format_label: "TABATA — 6 min 30", intro: "30 sec travail / 10 sec repos — 2 tours complets :", exercises: [
          { text: "30 sec SQUATS / 10 sec repos" }, { text: "30 sec BURPEES / 10 sec repos" }, { text: "30 sec MOUNTAIN CLIMBERS / 10 sec repos" }, { text: "30 sec JUMPING JACKS / 10 sec repos" }, { text: "30 sec FENTE AVANT / 10 sec repos" }, { text: "→ Répéter une 2ème fois (même ordre)" }
        ], conseil: "30 secondes de travail / 10 secondes de repos." }},
    
    { title: "WOD TABATA 40/10", material: ["poids-corps"], body: "complet", duration: 9.5, type: "TABATA", level: "Facile", desc: "<strong>40 sec travail / 10 sec repos :</strong> Squats sautées, Pompes(push-ups), Sit-ups(abdos), Burpees.",
      details: { format_label: "TABATA — 9 min 30", intro: "3 tours avec 40 sec de travail et 10 sec de repos :", exercises: [
          { text: "40 sec SQUATS SAUTÉS / 10 sec repos" }, { text: "40 sec POMPES / 10 sec repos" }, { text: "40 sec SIT-UPS / 10 sec repos" }, { text: "30 sec BURPEES / 10 sec repos" }, { text: "→ Répéter 3 tours au total" }
        ], scaled: { intro: "VERSION SCALED :", exercises: [
          { text: "Remplacer les sit-ups par des crunches" }, { text: "Pompes sur les genoux ou inclinées" }, { text: "Burpees sans saut et/ou sans pompe" }
        ]}, conseil: "40 secondes de travail / 10 secondes de repos." }},
    
    { title: "WOD TABATA 30/10 ABDOS", material: ["poids-corps"], body: "abdos", duration: 5, type: "TABATA", level: "Facile", desc: "<strong>30 sec travail / 10 sec repos pour les abdos :</strong> focus gainage.",
      details: { format_label: "TABATA ABDOS — 5 min 10", intro: "30 sec travail / 10 sec repos — 2 tours :", exercises: [
          { text: "30 sec GAINAGE SUR LES COUDES / 10 sec repos" }, { text: "30 sec GAINAGE LATÉRAL GAUCHE / 10 sec repos" }, { text: "30 sec GAINAGE SUR LES MAINS / 10 sec repos" }, { text: "30 sec GAINAGE LATÉRAL DROIT / 10 sec repos" }, { text: "30 sec GAINAGE SUR LES COUDES / 10 sec repos" }, { text: "30 sec GAINAGE LATÉRAL GAUCHE / 10 sec repos" }, { text: "30 sec GAINAGE SUR LES MAINS / 10 sec repos" }, { text: "30 sec GAINAGE LATÉRAL DROIT / 10 sec repos" }
        ], conseil: "30 secondes de travail / 10 secondes de repos. Focus gainage." }},
    
    { title: "WOD For Time 6 EXOS#1", material: ["traction", "poids-corps", "station-dips"], body: "complet", duration: 0, type: "FOR TIME", level: "Moyen", desc: "<strong>4 tours (1' repos) :</strong> 10 Tractions(pull-ups), 15 Tractions australiennes, 10 Dips, 15 Pompes diamant(push-ups), 10 Fentes/jambe(lunges), 15 Squats.",
      details: { format_label: "FOR TIME", intro: "Réaliser 4 rounds (1 min repos entre chaque) :", exercises: [
          { text: "10 Tractions (pull-ups)" }, { text: "15 Tractions australiennes" }, { text: "10 Dips" }, { text: "15 Pompes diamant" }, { text: "10 Fentes/jambe (lunges)" }, { text: "15 Squats" }, { text: "1 minute de repos" }
        ], scaled: { intro: "VERSION SCALED :", exercises: [
          { text: "Pompes inclinées ou sur genoux" }, { text: "Tractions avec TRX ou élastique" }
        ]}, conseil: "-" }},
    
    { title: "WOD 500 REPS", material: ["poids-corps"], body: "complet", duration: 0, type: "FOR TIME", level: "Moyen", desc: "50 Montées de genoux, 50 Squats, 50 Demi squats sautés, 50 Pompes(push-ups), 50 Mountains climbers, 50 Coups de genoux, 50 Fentes(lunges), 50 Directs bras gauche/droit, 50 Burpees, 50 Jumping jacks.",
      details: { format_label: "FOR TIME", exercises: [
          { text: "50 Montées de genoux" }, { text: "50 Squats" }, { text: "50 Demi-squats sautés (position basse)" }, { text: "50 Pompes" }, { text: "50 Mountains climbers" }, { text: "50 Coups de genoux" }, { text: "50 Fentes (vers l'avant)" }, { text: "50 Directs bras avant / bras arrière" }, { text: "50 Burpees" }, { text: "50 Jumping jacks" }
        ], conseil: "WOD orienté sport de combat." }},
    
    { title: "WOD 3 EXOS 10 MIN", material: ["poids-corps"], body: "complet", duration: 10, type: "EMOM", level: "Facile", desc: "<strong>Chaque minute :</strong> 5 Burpees, 10 Squats jump, 5 Pompes(push-ups).",
      details: { format_label: "EMOM 10 MINUTES", exercises: [
          { text: "5 Burpees" }, { text: "10 Squats jump" }, { text: "5 Pompes" }
        ], scaled: { intro: "VERSION SCALED :", exercises: [
          { text: "5 Burpees sans saut et/ou sans pompes" }, { text: "10 Squats" }, { text: "5 Pompes inclinées ou sur les genoux" }
        ]}, conseil: "EMOM : pendant la minute exécuter les burpees, squats jump et pompes. Le reste de la minute sert de repos." }},
    
    { title: "WOD Burpees Pyramide", material: ["poids-corps"], body: "complet", duration: 16, type: "EMOM", level: "Intense", desc: "<strong>Pyramide Burpees :</strong> Commencer à 6 burpees la 1ère min, puis gravir et descendre la pyramide pendant 16 minutes",
      details: { format_label: "EMOM 16 MINUTES — PYRAMIDE BURPEES", intro: "Monter puis descendre la pyramide :", exercises: [
          { text: "Min 1 : 6 burpees → Min 2 : 7 → Min 3 : 8 → Min 4 : 9 → Min 5 : 10 → Min 6 : 11 → Min 7 : 12 → Min 8 : 13" }, { text: "Min 9 : 13 → Min 10 : 12 → Min 11 : 11 → Min 12 : 10 → Min 13 : 9 → Min 14 : 8 → Min 15 : 7 → Min 16 : 6" }, { text: "Total : 152 burpees" }
        ], conseil: "EMOM : exécuter les burpees pendant la minute, le reste sert de repos. Selon le niveau, partir de plus bas (ex : 1ère min = 2 burpees)." }},
    
    { title: "WOD For Time 6 EXOS#2", material: ["traction"], body: "complet", duration: 0, type: "FOR TIME", level: "Moyen", desc: "<strong>4 tours (1' repos) :</strong> 15 Burpees, 15 Squats jump, 15 Pompes(push-ups), 15 Tractions(pull-ups), 15 Fentes(lunges), 15 Sit-ups(abdos).",
      details: { format_label: "FOR TIME", intro: "Réaliser 4 rounds (1 min repos entre chaque) :", exercises: [
          { text: "15 Burpees" }, { text: "15 Squats jump" }, { text: "15 Pompes" }, { text: "15 Tractions (pull-ups)" }, { text: "15 Fentes (lunges)" }, { text: "15 Sit-ups (abdos)" }, { text: "1 minute de repos" }
        ], scaled: { intro: "VERSION SCALED :", exercises: [
          { text: "Pompes inclinées ou sur genoux" }, { text: "Tractions avec TRX ou élastique" }, { text: "Remplacer les sit-ups par des crunches" }
        ]}, conseil: "-" }},
    
    { title: "WOD AMRAP 6 EXOS", material: ["poids-corps"], body: "complet", duration: 28, type: "AMRAP", level: "Facile", desc: "<strong>4 tours (1' repos) :</strong> 1 min Burpees, 1 min Pompes(push-ups), 1 min Squat jump, 1 min Marche de l'ours, 1 min Mountain climber, 1 min Sit-up(abdos).",
      details: { format_label: "AMRAP 28 MINUTES", intro: "Réaliser 4 rounds (1 min repos entre chaque) :", exercises: [
          { text: "1 minute Burpees" }, { text: "1 minute Pompes" }, { text: "1 minute Squat jump" }, { text: "1 minute Marche de l'ours" }, { text: "1 minute Mountain climber" }, { text: "1 minute Sit-up (abdos)" }, { text: "1 minute de repos" }
        ], scaled: { intro: "VERSION SCALED :", exercises: [
          { text: "Pompes inclinées ou sur genoux" }, { text: "Burpees sans saut et/ou sans pompe" }, { text: "Remplacer les sit-ups par des crunches" }
        ]}, conseil: "-" }},
    
    { title: "WOD AMRAP 4 EXOS", material: ["traction"], body: "complet", duration: 30, type: "AMRAP", level: "Moyen", desc: "<strong>Pendant 30 min :</strong> 5 Burpees, 7 Tractions(pull-ups), 10 Pompes(push-ups), 15 Squats.",
      details: { format_label: "AMRAP 30 MINUTES", intro: "Enchaîner les exercices suivants pendant 30 minutes :", exercises: [
          { text: "5 Burpees" }, { text: "7 Tractions (pull-ups)" }, { text: "10 Pompes" }, { text: "15 Squats" }
        ], scaled: { intro: "VERSION SCALED :", exercises: [
          { text: "Pompes inclinées ou sur les genoux" }, { text: "Burpees sans saut et/ou sans pompe" }, { text: "Tractions TRX ou avec élastique" }
        ]}, conseil: "-" }},
    
    { title: "WOD 1000 REPS", material: ["poids-corps", "traction", "station-dips", "box-jump"], body: "complet", duration: 0, type: "FOR TIME", level: "Intense", desc: "100 Tractions australiennes(pull-ups), 100 Pompes diamants(push-ups), 100 Squats jumps, 100 Mountain climbers, 100 Burpees, 100 Dips, 100 Gainage dynamique, 100 Box jumps, 100 Relevés de jambe, 100 Fentes marchées(walking lunges)",
      details: { format_label: "FOR TIME — 1000 REPS", exercises: [
          { text: "100 Tractions australiennes" }, { text: "100 Pompes diamants" }, { text: "100 Squats jump" }, { text: "100 Mountain climbers" }, { text: "100 Burpees" }, { text: "100 Dips" }, { text: "100 Gainage dynamique" }, { text: "100 Box jump" }, { text: "100 Relevés de jambes" }, { text: "100 Fentes marchées (walking lunges)" }
        ], conseil: "WOD haut niveau." }},
    
    { title: "WOD BRI", material: ["poids-corps"], body: "complet", duration: 0, type: "FOR TIME", level: "Intense", desc: "<strong>36Reps / 2X18Reps / 3x12Reps / 4X9Reps / 6X6Reps :</strong> Burpees, Pompes(push-ups), Sit-ups(abdos), Squats.",
      details: { format_label: "FOR TIME — 720 REPS", intro: "À chaque étape : Burpees / Push-ups / Sit-ups / Squats", exercises: [
          { text: "Étape 1 : 36 reps × 4 exercices (1 fois)" }, { text: "Étape 2 : 18 reps × 4 exercices (2 fois)" }, { text: "Étape 3 : 12 reps × 4 exercices (3 fois)" }, { text: "Étape 4 : 9 reps × 4 exercices (4 fois)" }, { text: "Étape 5 : 6 reps × 4 exercices (6 fois)" }
        ], conseil: "720 reps au total. À chaque étape on effectue 36 reps de chaque mouvement." }},
    
    { title: "WOD AMRAP 3 EXOS", material: ["traction", "poids-corps"], body: "complet", duration: 20, type: "AMRAP", level: "Facile", desc: "<strong>Pendant 20 min :</strong> 5 Tractions(pull-ups), 10 Pompes(push-ups), 15 Squats.",
      details: { format_label: "AMRAP 20 MINUTES", intro: "Enchaîner les exercices suivants pendant 20 minutes :", exercises: [
          { text: "5 Tractions (pull-ups)" }, { text: "10 Pompes" }, { text: "15 Squats" }
        ], scaled: { intro: "VERSION SCALED :", exercises: [
          { text: "Tractions TRX ou avec élastique" }, { text: "Pompes inclinées ou sur les genoux" }
        ]}, conseil: "-" }},
    
    { title: "WOD 300", material: ["barre", "haltere", "box-jump", "traction"], body: "complet", duration: 0, type: "MUSCU", level: "Intense", desc: "<strong>l'entrainement spartiate :</strong> 25 Tractions, 50 Deadlifts(soulevé de terre), 50 Pompes(push-ups), 50 Box jumps, 50 relevés de jambes avec barre, 50 Arrachés épaules à 1 bras(25-25), 25 Tractions.",
      details: { format_label: "FOR TIME — L'ENTRAÎNEMENT SPARTIATE", exercises: [
          { text: "25 Tractions (pull-ups)" }, { text: "50 Soulevé de terre 60 kg (deadlift)" }, { text: "50 Pompes (push-ups)" }, { text: "50 Sauts box jump" }, { text: "50 Relevés de jambes avec barre 60 kg" }, { text: "50 Arrachés épaules 1 bras (25-25) — haltère 16 kg" }, { text: "25 Tractions (pull-ups)" }
        ], scaled: { intro: "VERSION SCALED :", exercises: [
          { text: "Adapter les poids à son niveau" }, { text: "Pompes sur les genoux ou inclinées" }, { text: "Tractions australiennes ou TRX" }
        ]}, conseil: "relevés de jambes avec barre : placer au sol sur le dos, tenir la barre olympique chargée bras tendus. Jambes tendues et jointes : position 1- la pointe de pieds touchent les disques de droite;position 2- les talons touchent le sol; position 3-les pointes de pied touchent les disques de gauche (on alterne donc 1 – 2 – 3 – 2 – 1 – 2 …)" }},
    
    { title: "RENFO 10TOURS/3EXOS", material: ["poids-corps"], body: "complet", duration: 0, type: "MUSCU", level: "Facile", desc: "10 Squats, 5 Pompes(push-ups), 10 Sit-ups(abdos).",
      details: { format_label: "RENFO — 10 TOURS", intro: "Enchaîner les 10 tours :", exercises: [
          { text: "10 Squats" }, { text: "5 Pompes" }, { text: "10 Sit-ups (abdos)" }, { text: "30 sec à 1 min de repos entre les tours" }
        ], scaled: { intro: "VERSION SCALED :", exercises: [
          { text: "Pompes inclinées ou sur les genoux" }, { text: "Remplacer les sit-ups par des crunches" }
        ]}, conseil: "-" }},
    
    { title: "RENFO 5TOURS/3EXOS", material: ["poids-corps", "station-dips"], body: "complet", duration: 0, type: "MUSCU", level: "Facile", desc: "20 Squats, 10 Dips, 1 min de gainage(abdos).",
      details: { format_label: "RENFO — 5 TOURS", intro: "Enchaîner les 5 tours :", exercises: [
          { text: "20 Squats" }, { text: "10 Dips" }, { text: "1 minute de gainage" }, { text: "1 minute de repos" }
        ], conseil: "Alterner le type de gainage (latéral, dynamique, appui main, appui coude). Dips : sur station ou entre 2 bancs." }},
    
    { title: "WOD HYROX ANDRE", material: ["poids-corps", "rameur"], body: "complet", duration: 0, type: "HYROX", level: "Intense", desc: "<strong>FOR TIME:</strong> alternance Rameur(row), Burpees.",
      details: { format_label: "HYROX — FOR TIME", exercises: [
          { text: "1000m Rameur" }, { text: "50 Burpees" }, { text: "800m Rameur" }, { text: "40 Burpees" }, { text: "600m Rameur" }, { text: "30 Burpees" }, { text: "400m Rameur" }, { text: "20 Burpees" }, { text: "200m Rameur" }, { text: "10 Burpees" }
        ], conseil: "Durée estimée 40 minutes." }},
    
    { title: "WOD HYROX DOMINO", material: ["poids-corps", "tapis-incurve"], body: "complet", duration: 0, type: "HYROX", level: "Moyen", desc: "<strong>FOR TIME:</strong> alternance Course à pied(run), Squats/Burpees/Pompes(Push-ups)/Sit-ups(abdos).",
      details: { format_label: "HYROX — FOR TIME", exercises: [
          { text: "5 min Course à pied" }, { text: "50 Squats au poids de corps" }, { text: "5 min Course à pied" }, { text: "50 Burpees" }, { text: "5 min Course à pied" }, { text: "50 Pompes" }, { text: "5 min Course à pied" }, { text: "50 Sit-ups (abdos)" }
        ], conseil: "Durée estimée 45 minutes." }},
    
    { title: "WOD HYROX 4 TOURS#1", material: ["ballon-leste", "tapis-incurve", "traction"], body: "complet", duration: 0, type: "HYROX", level: "Intense", desc: "<strong>4 TOURS FOR TIME:</strong> 600m. Course à pied(run), 30 Lancers de ballon lesté(wall-ball), 20 Sit-ups(abdos), 20 Tractions(pull-ups).",
      details: { format_label: "HYROX — 4 TOURS FOR TIME", intro: "Effectuer 4 tours :", exercises: [
          { text: "600m de course à pied" }, { text: "30 Wall-Balls (ballon lesté)" }, { text: "20 Sit-ups (abdos)" }, { text: "20 Tractions (pull-ups)" }
        ], conseil: "-" }},
    
    { title: "WOD HYROX 4 TOURS#2", material: ["rameur", "tapis-incurve", "box-jump", "ski-erg"], body: "complet", duration: 0, type: "HYROX", level: "Moyen", desc: "<strong>4 TOUS FOR TIME:</strong> 400m. Course à pied(run), 15 Burpees Box-jump Over, 400m. de rameur(row), 400 m. de SkiERG.",
      details: { format_label: "HYROX — 4 TOURS FOR TIME", intro: "Effectuer 4 tours :", exercises: [
          { text: "400m de course à pied (rapide)" }, { text: "15 Burpees Box Jump Over" }, { text: "400m de Rameur (rapide)" }, { text: "400m de SkiERG (rapide)" }
        ], conseil: "Ajuster la hauteur de la box-jump selon le niveau, ou effectuer des burpees simples." }},
    
    { title: "WOD HYROX AMRAP40", material: ["rameur", "tapis-incurve", "ballon-leste", "sand-bag"], body: "complet", duration: 40, type: "HYROX", level: "Moyen", desc: "<strong>AMRAP de 40 minutes:</strong> 1km de Rameur(row), 20 Fentes marchées avec sandbag(Lunges), 1km de Course à pied(run), 20 lancé de ballon lesté(wall-balls).",
      details: { format_label: "HYROX — AMRAP 40 MINUTES", intro: "Enchaîner le circuit en effectuant un maximum de tours :", exercises: [
          { text: "1 km de Rameur" }, { text: "20 Fentes marchées avec SandBag" }, { text: "1 km de Course à pied" }, { text: "20 Lancés de ballon lesté contre un mur (wall-balls)" }
        ], conseil: "Pour les fentes et les wall-balls, adapter le poids en fonction du niveau et/ou de votre forme du jour." }}
];
