import { describe, it, expect } from 'vitest';
import {
  DEFAULT_FORMULA_CONFIG,
  computeBrzycki1RM,
  computeVMAWithTrace,
  roundToEquipmentStep,
  convertPercent1RMToKg,
  convertPercentVMAToPace,
  individualizeProgramForUser
} from '../utils/calculationEngine';
import { DEMO_COMPLETE_PROGRAMS } from '../data/programTemplates';
import { Gender, JobType, UserProfile, UserRole, WorkSchedule } from '../types';

const makeSoldier = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  nid: '0987654321',
  name: 'SGT MARTIN Lucas',
  role: UserRole.USER,
  gender: Gender.MALE,
  jobType: JobType.TECH,
  workSchedule: WorkSchedule.OFFICE,
  serviceId: 'ear927',
  unit: 'ESTA 15.927',
  tests: {
    vamevalPalier: 14, // VMA = 8 + 0.5*14 = 15.0 km/h
    benchPress1RM: 100,
    squat1RM: 120,
    deadlift1RM: 140
  },
  dailyForms: [],
  ...overrides
});

describe('Moteur de Calcul Paramétrable (PIA 7.1.1)', () => {
  describe('Formule de Brzycki (1RM)', () => {
    it('calcule exactement 1RM = charge × 36 / (37 - reps) pour reps ≤ 10', () => {
      const res = computeBrzycki1RM(80, 7);
      expect(res.valid).toBe(true);
      expect(res.valueKg).toBe(96); // 80 * 36 / 30 = 96
      expect(res.trace.scientificReference).toContain('Brzycki');
    });

    it('renvoie 1RM direct si reps === 1', () => {
      const res = computeBrzycki1RM(105, 1);
      expect(res.valid).toBe(true);
      expect(res.valueKg).toBe(105);
    });

    it('refuse le calcul au-delà de 10 répétitions et signale un test sous-maximal', () => {
      const res = computeBrzycki1RM(60, 12);
      expect(res.valid).toBe(false);
      expect(res.valueKg).toBeNull();
      expect(res.warning).toContain('10 répétitions');
    });

    it('gère les données manquantes sans jamais inventer de valeur', () => {
      const res = computeBrzycki1RM(0, 5);
      expect(res.valid).toBe(false);
      expect(res.valueKg).toBeNull();
      expect(res.warning).toBeTruthy();
    });
  });

  describe('Calcul VMA (priorités et formules scientifiques)', () => {
    it('calcule VAMEVAL : VMA = 8 + 0,5 × palier', () => {
      const res = computeVMAWithTrace({ vamevalPalier: 14 });
      expect(res.hasReference).toBe(true);
      expect(res.source).toBe('VAMEVAL');
      expect(res.vmaKmH).toBe(15);
    });

    it('calcule Luc Léger : VN = 8 + 0,5 × palier ; VO2max = 5,857×VN - 19,458 ; VMA = VO2max / 3,5', () => {
      const res = computeVMAWithTrace({ lucLegerPalier: 10 });
      const vn = 8 + 0.5 * 10; // 13
      const expected = Number(((5.857 * vn - 19.458) / 3.5).toFixed(2));
      expect(res.hasReference).toBe(true);
      expect(res.source).toBe('LUC_LEGER');
      expect(res.vmaKmH).toBe(expected);
    });

    it('respecte l\'ordre de priorité : Demi-Cooper (100%) > 2400m (95%) > 5km (90%) > 10km (85%) > Semi/20km (80%) > Marathon (70%)', () => {
      const rCooper = computeVMAWithTrace({ cooperDistance: 1600, run2400mTime: '10:00' });
      expect(rCooper.source).toBe('DEMI_COOPER');
      expect(rCooper.vmaKmH).toBe(16);

      const r2400 = computeVMAWithTrace({ run2400mTime: '10:00', run5kmTime: '22:00' });
      expect(r2400.source).toBe('RUN_2400M');
      expect(r2400.vmaKmH).toBeCloseTo(2.4 / (10 / 60) / 0.95, 1);

      const r5k = computeVMAWithTrace({ run5kmTime: '20:00', run10kmTime: '45:00' });
      expect(r5k.source).toBe('RUN_5KM');
      expect(r5k.vmaKmH).toBeCloseTo(15 / 0.9, 1);

      const r10k = computeVMAWithTrace({ run10kmTime: '45:00', runMarathonTime: '3:30:00' });
      expect(r10k.source).toBe('RUN_10KM');

      const rMarathon = computeVMAWithTrace({ runMarathonTime: '3:30:00' });
      expect(rMarathon.source).toBe('RUN_MARATHON');
      expect(rMarathon.vmaKmH).toBeCloseTo(42.195 / 3.5 / 0.7, 1);
    });

    it('signale explicitement l\'absence de VMA (vmaKmH === null) sans valeur inventée', () => {
      const res = computeVMAWithTrace({});
      expect(res.hasReference).toBe(false);
      expect(res.vmaKmH).toBeNull();
      expect(res.source).toBe('MISSING');
      expect(res.warning).toContain('Aucune référence VMA');
    });
  });

  describe('Conversions, arrondis matériel & bornes Human-in-the-Loop', () => {
    it('arrondit au pas matériel de 2,5 kg', () => {
      expect(roundToEquipmentStep(73.8, 2.5)).toBe(75);
      expect(roundToEquipmentStep(73.1, 2.5)).toBe(72.5);
    });

    it('borne l\'adaptation fatigue dans le cadre fixé par le moniteur (-20% à +5%)', () => {
      const res = convertPercent1RMToKg({
        rmKg: 100,
        percent1RM: 80,
        stepKg: 2.5,
        dailyDeltaPct: -35, // supérieur à la borne -20%
        bounds: { minIntensityDeltaPct: -20, maxIntensityDeltaPct: 5, substitutable: true }
      });
      expect(res.boundsClamped).toBe(true);
      expect(res.appliedDeltaPct).toBe(-20);
      expect(res.loadKg).toBe(65); // 80 * 0.8 = 64 -> arrondi 2.5 kg = 65 kg
    });

    it('convertit un % VMA en vitesse km/h et allure min/km exacte', () => {
      const res = convertPercentVMAToPace({ vmaKmH: 15, percentVMA: 80 });
      expect(res.speedKmH).toBe(12);
      expect(res.pace).toBe('5:00/km');
    });
  });

  describe('Individualisation de masse & traçabilité', () => {
    it('individualise un programme pour 30 militaires différents sans erreur', () => {
      const master = DEMO_COMPLETE_PROGRAMS[0];
      const results = Array.from({ length: 30 }, (_, idx) => {
        const soldier = makeSoldier({
          nid: String(1000000000 + idx),
          name: `MILITAIRE #${idx + 1}`,
          tests: {
            vamevalPalier: 10 + (idx % 8),
            benchPress1RM: 60 + idx * 2,
            squat1RM: 80 + idx * 2
          }
        });
        return individualizeProgramForUser(master, soldier, undefined, DEFAULT_FORMULA_CONFIG);
      });

      expect(results).toHaveLength(30);
      expect(results[0].rmUpperKg).toBe(60);
      expect(results[29].rmUpperKg).toBe(118);
      // Vérifie que les charges calculées diffèrent bien d'un militaire à l'autre
      const loadFirst = results[0].sessions[0].blocks[1].exercises[0].computedLoadKg;
      const loadLast = results[29].sessions[0].blocks[1].exercises[0].computedLoadKg;
      expect(loadFirst).not.toBeNull();
      expect(loadLast).not.toBeNull();
      expect(loadLast!).toBeGreaterThan(loadFirst!);
    });

    it('déclenche une alerte claire (et aucune charge inventée) pour un militaire sans 1RM ni VMA', () => {
      const master = DEMO_COMPLETE_PROGRAMS[0];
      const noRefSoldier = makeSoldier({ tests: {} });
      const res = individualizeProgramForUser(master, noRefSoldier);

      expect(res.vmaKmH).toBeNull();
      expect(res.rmUpperKg).toBeNull();
      expect(res.rmLowerKg).toBeNull();
      expect(res.missingReferences).toContain('VMA');
      expect(res.missingReferences).toContain('1RM_LOWER');
      expect(res.warnings.length).toBeGreaterThan(0);

      const squatEx = res.sessions[0].blocks[1].exercises[0];
      expect(squatEx.computedLoadKg).toBeNull();
      expect(squatEx.displayPrescription).toContain('1RM absent');
    });

    it('applique une substitution validée par le moniteur en cas de douleur déclarée', () => {
      const master = DEMO_COMPLETE_PROGRAMS[0];
      const soldier = makeSoldier();
      const res = individualizeProgramForUser(master, soldier, {
        date: '2026-11-26',
        sleepQuality: 7,
        fatigueLevel: 4,
        stressLevel: 3,
        painLevel: 5,
        painZone: 'genou droit'
      });

      const squatEx = res.sessions[0].blocks[1].exercises[0];
      expect(squatEx.substitutedFrom).toBe('Squat Arrière (Back Squat)');
      expect(squatEx.exercise.name).toBe('Goblet Squat Haltère / Kettlebell');
    });
  });
});
