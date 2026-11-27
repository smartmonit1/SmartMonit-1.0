import { describe, it, expect } from 'vitest';
import { EXERCISE_DATABASE, EXERCISES_CATALOG_VERSION } from '../data/exercises';
import {
  DIFFICULTY_ORDER,
  EXERCISE_DOMAINS,
  IMPACT_ORDER,
  filterExercises,
  sortExercises
} from '../utils/exerciseFilters';

describe('Base de données Maître (475 exercices) & Filtres/Tri unifiés', () => {
  it('contient exactement 475 exercices uniques et la version v7_master_475', () => {
    expect(EXERCISES_CATALOG_VERSION).toBe('v7_master_475');
    expect(EXERCISE_DATABASE).toHaveLength(475);

    const uniqueIds = new Set(EXERCISE_DATABASE.map((e) => e.id));
    expect(uniqueIds.size).toBe(475);
  });

  it('couvre exactement les 11 domaines attendus avec les bons comptages', () => {
    const countsByDomain: Record<string, number> = {};
    EXERCISE_DATABASE.forEach((e) => {
      const key = e.domain || 'unknown';
      countsByDomain[key] = (countsByDomain[key] || 0) + 1;
    });

    expect(countsByDomain).toEqual({
      musculation_en_salle: 75,
      renfort_musculaire: 55,
      cardio_en_salle: 30,
      hyrox_crossfit: 50,
      pilates: 40,
      mobilite: 45,
      sport_sante: 40,
      reeducation: 45,
      course: 30,
      preparation_physique: 35,
      echauffement: 30
    });

    const categoriesInOrder = EXERCISE_DOMAINS.map((d) => d.id);
    expect(categoriesInOrder).toHaveLength(11);
    EXERCISE_DATABASE.forEach((e) => {
      expect(categoriesInOrder).toContain(e.category);
    });
  });

  it('supporte la recherche bilingue FR/EN, sans accent et tolérante aux fautes', () => {
    const enMatch = filterExercises(EXERCISE_DATABASE, { search: 'Barbell Back Squat' });
    expect(enMatch.some((e) => e.id === 'ex_001_barbell_back_squat')).toBe(true);

    const noAccentMatch = filterExercises(EXERCISE_DATABASE, { search: 'developpe couche barre' });
    expect(noAccentMatch.some((e) => e.id === 'ex_006_barbell_flat_bench_press')).toBe(true);

    const typoMatch = filterExercises(EXERCISE_DATABASE, { search: 'souleve de tere' });
    expect(typoMatch.length).toBeGreaterThan(0);
  });

  it('applique les filtres combinés (domaine, muscle, matériel, niveau, impact, latéralité)', () => {
    const filtered = filterExercises(EXERCISE_DATABASE, {
      category: 'Musculation',
      equipment: 'Barre',
      difficulty: 'Intermédiaire',
      laterality: 'bilateral'
    });

    expect(filtered.length).toBeGreaterThan(0);
    filtered.forEach((e) => {
      expect(e.category).toBe('Musculation');
      expect(e.equipment).toBe('Barre');
      expect(e.difficulty).toBe('Intermédiaire');
      expect(e.laterality).toBe('bilateral');
    });

    const eliteExercises = filterExercises(EXERCISE_DATABASE, { difficulty: 'Élite' });
    expect(eliteExercises.length).toBe(8);
  });

  it('trie correctement par nom, niveau (Débutant → Élite) et impact articulaire', () => {
    const byNameAsc = sortExercises(EXERCISE_DATABASE, 'name_asc');
    expect(byNameAsc[0].name.localeCompare(byNameAsc[1].name, 'fr')).toBeLessThanOrEqual(0);

    const byDiffAsc = sortExercises(EXERCISE_DATABASE, 'difficulty_asc');
    for (let i = 1; i < byDiffAsc.length; i++) {
      expect(DIFFICULTY_ORDER[byDiffAsc[i - 1].difficulty]).toBeLessThanOrEqual(
        DIFFICULTY_ORDER[byDiffAsc[i].difficulty]
      );
    }

    const byDiffDesc = sortExercises(EXERCISE_DATABASE, 'difficulty_desc');
    expect(byDiffDesc[0].difficulty).toBe('Élite');

    const byImpactAsc = sortExercises(EXERCISE_DATABASE, 'impact_asc');
    for (let i = 1; i < byImpactAsc.length; i++) {
      const prev = IMPACT_ORDER[byImpactAsc[i - 1].impactLevel || 'low'];
      const curr = IMPACT_ORDER[byImpactAsc[i].impactLevel || 'low'];
      expect(prev).toBeLessThanOrEqual(curr);
    }
  });
});
