import { describe, it, expect } from 'vitest';
import { parseQuickPrescription } from '../utils/quickEntryParser';

describe('Parseur de saisie rapide naturelle (Quick Entry)', () => {
  it('interprète "4x8 @75%" en 4 séries de 8 à 75% 1RM', () => {
    const res = parseQuickPrescription('4x8 @75%');
    expect(res.valid).toBe(true);
    expect(res.mode).toBe('STRENGTH');
    expect(res.patch.sets).toBe(4);
    expect(res.patch.reps).toBe('8');
    expect(res.patch.percent1RM).toBe(75);
    expect(res.humanPreview).toContain('4 séries de 8');
    expect(res.humanPreview).toContain('75 %');
  });

  it('interprète "3x10\' @80% VMA r2\'" en fractionné course 3 fois 10 min à 80% VMA avec 2 min récup', () => {
    const res = parseQuickPrescription("3x10' @80% VMA r2'");
    expect(res.valid).toBe(true);
    expect(res.mode).toBe('RUNNING');
    expect(res.patch.sets).toBe(3);
    expect(res.patch.durationSeconds).toBe(600);
    expect(res.patch.percentVMA).toBe(80);
    expect(res.patch.rest).toBe('2:00');
    expect(res.patch.restSec).toBe(120);
  });

  it('interprète "8x400m @95% VMA r1\'30" en intervalles piste', () => {
    const res = parseQuickPrescription("8x400m @95% VMA r1'30");
    expect(res.valid).toBe(true);
    expect(res.mode).toBe('RUNNING');
    expect(res.patch.sets).toBe(8);
    expect(res.patch.distanceMeters).toBe(400);
    expect(res.patch.percentVMA).toBe(95);
    expect(res.patch.rest).toBe('1:30');
  });

  it('interprète une charge fixe avec tempo et RPE : "4x8-10 @80kg tempo 3-1-1-0 RPE 8 r1\'30"', () => {
    const res = parseQuickPrescription("4x8-10 @80kg tempo 3-1-1-0 RPE 8 r1'30");
    expect(res.valid).toBe(true);
    expect(res.patch.sets).toBe(4);
    expect(res.patch.reps).toBe('8-10');
    expect(res.patch.loadKg).toBe(80);
    expect(res.patch.tempo).toBe('3-1-1-0');
    expect(res.patch.rpe).toBe(8);
    expect(res.patch.restSec).toBe(90);
  });

  it('interprète une marche chargée : "10km 15kg 1h30"', () => {
    const res = parseQuickPrescription('10km 15kg 1h30');
    expect(res.valid).toBe(true);
    expect(res.mode).toBe('LOADED_MARCH');
    expect(res.patch.distanceMeters).toBe(10000);
    expect(res.patch.carriedLoadKg).toBe(15);
    expect(res.patch.targetTimeSec).toBe(5400);
  });

  it('interprète le poids du corps à l\'échec technique : "3xMAX r1\'"', () => {
    const res = parseQuickPrescription("3xMAX r1'");
    expect(res.valid).toBe(true);
    expect(res.mode).toBe('BODYWEIGHT');
    expect(res.patch.sets).toBe(3);
    expect(res.patch.reps).toBe('MAX');
    expect(res.patch.toTechnicalFailure).toBe(true);
  });
});
