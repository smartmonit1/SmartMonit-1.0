
import { PhysicalTests, Gender, DailyForm, UserProfile } from '../types';

// Luc Leger Table (Strictly from instructions)
const lucLegerTable: Record<number, number> = {
  1: 7.86, 2: 8.76, 3: 9.63, 4: 10.50, 5: 11.37, 
  6: 12.24, 7: 13.11, 8: 13.98, 9: 14.88, 10: 15.75,
  11: 16.62, 12: 17.49, 13: 18.36, 14: 19.23, 15: 20.13
};

// Vameval Table
const vamevalTable: Record<number, number> = {
  1: 8.5, 2: 9, 3: 9.5, 4: 10, 5: 10.5, 6: 11, 7: 11.5, 8: 12, 9: 12.5,
  10: 13, 11: 13.5, 12: 14, 13: 14.5, 14: 15, 15: 15.5, 16: 16, 17: 16.5,
  18: 17, 19: 17.5, 20: 18, 21: 18.5, 22: 19, 23: 19.5, 24: 20, 25: 20.5
};

export const calculateVMA = (tests: PhysicalTests): number => {
  // Priority 1: VAMEVAL
  if (tests.vamevalPalier) {
    return parseFloat((8 + (0.5 * tests.vamevalPalier)).toFixed(2));
  }
  // Priority 2: Luc Leger (Strictly applying formula from PDF)
  if (tests.lucLegerPalier) {
    const vn = 8 + (0.5 * tests.lucLegerPalier);
    const vo2max = (5.857 * vn) - 19.458;
    return parseFloat((vo2max / 3.5).toFixed(2));
  }
  // Priority 3: Test CCPM 2400m
  if (tests.run2400mTime) {
    const parts = tests.run2400mTime.split(':').map(Number);
    const mins = parts[0] + (parts[1] / 60);
    if (mins > 0) {
      const speedKmH = (2.4 / (mins / 60));
      return parseFloat((speedKmH / 0.95).toFixed(2));
    }
  }
  // Priority 4: Demi-Cooper (recorded as cooperDistance in meters in UI)
  if (tests.cooperDistance) {
    return parseFloat((tests.cooperDistance / 100).toFixed(2)); // Distance(km)*10 = Distance(m)/1000 * 10 = Distance(m)/100
  }
  // Fallbacks:
  if (tests.run10kmTime) {
    const parts = tests.run10kmTime.split(':').map(Number);
    let hours = 0, mins = 0, secs = 0;
    if (parts.length === 3) { [hours, mins, secs] = parts; }
    else if (parts.length === 2) { [mins, secs] = parts; } 
    const totalHours = hours + (mins / 60) + (secs / 3600);
    if (totalHours > 0) {
      const speedKmH = 10 / totalHours;
      return parseFloat((speedKmH / 0.85).toFixed(2));
    }
  }
  if (tests.runSemiMarathonTime) {
    const parts = tests.runSemiMarathonTime.split(':').map(Number);
    let hours = 0, mins = 0, secs = 0;
    if (parts.length === 3) { [hours, mins, secs] = parts; }
    else if (parts.length === 2) { [mins, secs] = parts; } 
    const totalHours = hours + (mins / 60) + (secs / 3600);
    if (totalHours > 0) {
      const speedKmH = 21.1 / totalHours;
      return parseFloat((speedKmH / 0.80).toFixed(2));
    }
  }
  if (tests.run20kmTime) {
    const parts = tests.run20kmTime.split(':').map(Number);
    let hours = 0, mins = 0, secs = 0;
    if (parts.length === 3) { [hours, mins, secs] = parts; }
    else if (parts.length === 2) { [mins, secs] = parts; } 
    const totalHours = hours + (mins / 60) + (secs / 3600);
    if (totalHours > 0) {
      const speedKmH = 20.0 / totalHours;
      return parseFloat((speedKmH / 0.80).toFixed(2));
    }
  }

  return 10.0; // Default
};

export const calculate1RM = (weight: number, reps: number): number => {
  if (reps === 1) return weight;
  if (reps >= 37) return weight;
  // Brzycki: 1RM = Charge * (36 / (37 - Reps)) as per PDF
  return parseFloat((weight * (36 / (37 - reps))).toFixed(1));
};

export const estimate1RMFromBodyweight = (reps: number, gender: Gender): number => {
  // Python: base 80kg (H) ou 60kg (F)
  const baseWeight = gender === Gender.MALE ? 80 : 60;
  return calculate1RM(baseWeight, reps);
};

/**
 * Analyse la forme du jour (BiometricEngine).
 * Retourne soit une liste d'instructions (string[]), soit une chaine unique (ALERTE) si critique.
 */
export const analyzeDailyForm = (daily: DailyForm): string[] | string => {
  const instructions: string[] = [];

  // Zone Noire (Douleur)
  if (daily.painLevel >= 6) {
    return "ALERTE: Douleur aiguë détectée. Séance physique annulée. Veuillez consulter la chaîne médicale de l'unité et alerter le moniteur EPMS.";
  } else if (daily.painLevel > 0 && daily.painZone) {
    instructions.push(`Substitution obligatoire: Exclure immédiatement tout exercice sollicitant la zone douloureuse (${daily.painZone}). Remplacer par du gainage au sol ou de la natation.`);
  }

  // Zone Rouge (Fatigue extrême ou Sommeil dégradé)
  if (daily.fatigueLevel >= 8 || daily.sleepQuality <= 3) {
    instructions.push("ALERTE: Zone Rouge. Verrouillage des séances anaérobie lactique, PAM et force maximale. Imposer une séance type Récupération ORFA, yoga, ou cardio basse intensité (ex: marche inclinée).");
    return instructions;
  }

  // Zone Orange (Fatigue modérée, Stress, Sommeil moyen)
  if ((daily.fatigueLevel >= 5 && daily.fatigueLevel <= 7) || daily.sleepQuality < 6 || daily.stressLevel > 6) {
    instructions.push("Application d'un coefficient réducteur immédiat: baisse d'intensité de 15% à 20% (VMA ou 1RM) ou réduction du volume global. Augmenter la récupération active.");
  }

  // Zone Verte (Fatigue < 5, Sommeil OK, Stress OK, Douleur 0)
  if (instructions.length === 0) {
    instructions.push("Zone Verte: Validation de la séance calculée à 100% de l'intensité nominale.");
  }

  return instructions;
};

/**
 * MOTEUR D'ADAPTATION LIVE
 * Transforme les prescriptions relatives (ex: "[70% VMA]") en valeurs réelles (ex: "10.5 km/h")
 * Applique automatiquement une baisse d'intensité si fatigue élevée.
 */
export const adaptPrescription = (text: string, user: UserProfile, daily?: DailyForm): string => {
  if (!text) return "";
  
  // 1. Détection Fatigue
  const fatigueMod = (daily && daily.fatigueLevel > 4) ? 0.85 : 1.0; // -15% si fatigue > 4

  let adaptedText = text;

  // 2. Remplacement VMA: "[XX% VMA]"
  const vma = calculateVMA(user.tests);
  adaptedText = adaptedText.replace(/\[(\d+)%\s*VMA\]/gi, (match, p1) => {
    const percent = parseInt(p1);
    const targetSpeed = vma * (percent / 100) * fatigueMod;
    const paceMinPerKm = 60 / targetSpeed;
    const min = Math.floor(paceMinPerKm);
    const sec = Math.round((paceMinPerKm - min) * 60);
    const secStr = sec < 10 ? `0${sec}` : sec;
    
    let result = `${targetSpeed.toFixed(1)} km/h (${min}:${secStr}/km)`;
    if (fatigueMod < 1.0) result += " 📉 Adapté Fatigue";
    return result;
  });

  // 3. Remplacement 1RM: "[XX% 1RM]" (Basé sur une estimation moyenne Upper/Lower pour l'affichage général)
  // Idéalement, il faudrait savoir quel exercice c'est pour choisir entre Bench et Squat.
  // Pour ce moteur générique, on détecte le contexte ou on met les deux si ambigu.
  
  const rmUpper = user.tests.benchPress1RM || estimate1RMFromBodyweight(user.tests.pushups || 10, user.gender);
  const rmLower = user.tests.squat1RM || 0;

  adaptedText = adaptedText.replace(/\[(\d+)%\s*1RM\]/gi, (match, p1) => {
    const percent = parseInt(p1);
    // On affiche une fourchette ou une valeur générique si on ne connait pas l'exo
    // Si l'exo contient "Squat" ou "Jambes" dans le titre (géré en amont), ce serait mieux, mais ici on fait simple.
    const loadUpper = Math.round(rmUpper * (percent / 100) * fatigueMod);
    const loadLower = rmLower > 0 ? Math.round(rmLower * (percent / 100) * fatigueMod) : null;
    
    let result = `${loadUpper}kg (Haut)`;
    if (loadLower) result += ` / ${loadLower}kg (Bas)`;
    if (fatigueMod < 1.0) result += " 📉";
    return result;
  });

  return adaptedText;
};
