import { describe, it, expect } from 'vitest';
import { analyzeProgramPedagogy, computeProgramAnalytics } from '../utils/pedagogicalRules';
import { EXERCISE_DATABASE } from '../data/exercises';
import { JobType, ProgramCycle } from '../types';

describe('Moteur d\'Alertes Pédagogiques PIA 7.1.1 & Analytique', () => {
  it('détecte une progression de volume excessive (> +15%) en citant la règle PIA-02', () => {
    const structure: ProgramCycle[] = [
      {
        id: 'c1',
        title: 'Cycle test',
        objective: 'Force',
        weeks: [
          {
            id: 'w1',
            number: 1,
            sessions: [
              {
                id: 's1',
                title: 'Séance S1',
                type: 'MUSCU',
                blocks: [
                  { id: 'wu1', type: 'WARMUP', title: 'Échauffement', exercises: [{ id: 'w1e', libraryId: 'ex_pilates_06', name: 'Shoulder Bridge', sets: 2, reps: '10' }] },
                  { id: 'm1', type: 'MAIN', title: 'Corps', exercises: [{ id: 'e1', libraryId: 'ex_muscu_01', name: 'Développé Couché Barre', sets: 4, reps: '8', percent1RM: 75 }, { id: 'e2', libraryId: 'ex_muscu_12', name: 'Rowing Barre Buste Penché', sets: 4, reps: '8', percent1RM: 70 }] },
                  { id: 'cd1', type: 'COOLDOWN', title: 'Retour au calme', exercises: [{ id: 'c1e', libraryId: 'ex_pilates_07', name: 'Spine Stretch Forward', sets: 1, holdSec: 45 }] }
                ],
                exercises: []
              }
            ]
          },
          {
            id: 'w2',
            number: 2,
            sessions: [
              {
                id: 's2',
                title: 'Séance S2',
                type: 'MUSCU',
                blocks: [
                  { id: 'wu2', type: 'WARMUP', title: 'Échauffement', exercises: [{ id: 'w2e', libraryId: 'ex_pilates_06', name: 'Shoulder Bridge', sets: 2, reps: '10' }] },
                  { id: 'm2', type: 'MAIN', title: 'Corps', exercises: [{ id: 'e3', libraryId: 'ex_muscu_01', name: 'Développé Couché Barre', sets: 8, reps: '8', percent1RM: 80 }, { id: 'e4', libraryId: 'ex_muscu_12', name: 'Rowing Barre Buste Penché', sets: 8, reps: '8', percent1RM: 75 }] },
                  { id: 'cd2', type: 'COOLDOWN', title: 'Retour au calme', exercises: [{ id: 'c2e', libraryId: 'ex_pilates_07', name: 'Spine Stretch Forward', sets: 1, holdSec: 45 }] }
                ],
                exercises: []
              }
            ]
          }
        ]
      }
    ];

    const alerts = analyzeProgramPedagogy({ structure, exerciseLibrary: EXERCISE_DATABASE });
    const pia02 = alerts.find((a) => a.code === 'PIA-02');
    expect(pia02).toBeDefined();
    expect(pia02?.ruleReference).toContain('PIA 7.1.1');
  });

  it('signale l\'absence d\'échauffement et de retour au calme (PIA-01)', () => {
    const structure: ProgramCycle[] = [
      {
        id: 'c1',
        title: 'Cycle test',
        objective: 'Force',
        weeks: [
          {
            id: 'w1',
            number: 1,
            sessions: [
              {
                id: 's1',
                title: 'Séance nue',
                type: 'MUSCU',
                blocks: [
                  { id: 'm1', type: 'MAIN', title: 'Corps', exercises: [{ id: 'e1', libraryId: 'ex_muscu_01', name: 'Développé Couché Barre', sets: 4, reps: '8' }] }
                ],
                exercises: []
              }
            ]
          }
        ]
      }
    ];

    const alerts = analyzeProgramPedagogy({ structure, exerciseLibrary: EXERCISE_DATABASE });
    const pia01Alerts = alerts.filter((a) => a.code === 'PIA-01');
    expect(pia01Alerts.length).toBe(2);
  });

  it('signale un déséquilibre poussée/tirage (PIA-05) et une surcharge axiale PN (PIA-06)', () => {
    const structure: ProgramCycle[] = [
      {
        id: 'c1',
        title: 'Cycle PN',
        objective: 'Force',
        weeks: [
          {
            id: 'w1',
            number: 1,
            sessions: [
              {
                id: 's1',
                title: 'Séance Poussée',
                type: 'MUSCU',
                blocks: [
                  {
                    id: 'm1',
                    type: 'MAIN',
                    title: 'Corps',
                    exercises: [
                      { id: 'e1', libraryId: 'ex_muscu_01', name: 'Développé Couché Barre', sets: 5, reps: '6', percent1RM: 80 },
                      { id: 'e2', libraryId: 'ex_muscu_17', name: 'Développé Militaire Barre Debout', sets: 5, reps: '5', percent1RM: 90 }
                    ]
                  }
                ],
                exercises: []
              }
            ]
          }
        ]
      }
    ];

    const alerts = analyzeProgramPedagogy({
      structure,
      exerciseLibrary: EXERCISE_DATABASE,
      targetJobProfiles: [JobType.PN]
    });
    expect(alerts.some((a) => a.code === 'PIA-05')).toBe(true);
    expect(alerts.some((a) => a.code === 'PIA-06')).toBe(true);

    const analytics = computeProgramAnalytics(structure, EXERCISE_DATABASE);
    expect(analytics.totalSets).toBe(10);
    expect(analytics.estimatedTonnageKg).toBeGreaterThan(0);
    expect(Object.keys(analytics.muscleHeat).length).toBeGreaterThan(0);
  });
});
