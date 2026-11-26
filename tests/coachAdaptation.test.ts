import { describe, expect, it } from 'vitest';
import { ExerciseLibraryItem, Gender, JobType, WorkSchedule } from '../types';
import { AlgorithmicProvider } from '../services/ai/providers/algorithmicProvider';

const exerciseLibrary: ExerciseLibraryItem[] = [
  {
    id: 'bench-press',
    name: 'Développé couché',
    muscleGroup: 'Pectoraux',
    equipment: 'Barre olympique',
    type: 'Force',
    difficulty: 'Intermédiaire',
    movementPattern: 'PUSH_H',
    substitutes: ['Pompes inclinées']
  },
  {
    id: 'incline-push-up',
    name: 'Pompes inclinées',
    muscleGroup: 'Pectoraux',
    equipment: 'Poids du corps',
    type: 'Polyarticulaire',
    difficulty: 'Débutant',
    movementPattern: 'PUSH_H'
  }
];

describe('coach session adaptation', () => {
  it('proposes a documented substitute when session equipment is unavailable', async () => {
    const provider = new AlgorithmicProvider();
    const suggestion = await provider.suggestSessionModifications({
      anonUser: {
        gender: Gender.MALE,
        jobType: JobType.ADMIN,
        jobDirective: '',
        workSchedule: WorkSchedule.OFFICE,
        vmaKmH: 10,
        rmUpperKg: 60,
        rmLowerKg: 80
      },
      dailyForm: {
        date: '2026-11-26',
        sleepQuality: 7,
        fatigueLevel: 2,
        stressLevel: 2,
        painLevel: 0
      },
      session: {
        id: 'session-1',
        infrastructureId: 'gym-1',
        title: 'Force haut du corps',
        type: 'Musculation',
        durationMinutes: 45,
        description: 'Séance de force',
        isCompleted: false,
        content: {
          mainBlock: [{
            exercise: 'Développé couché',
            prescription: '3 séries x 8 reps',
            rest: '1:30'
          }]
        }
      },
      availableEquipment: [],
      exerciseLibrary
    });

    expect(suggestion.mainBlock[0].exercise).toBe('Pompes inclinées');
    expect(suggestion.adaptationNotes[0]).toContain('Barre olympique non disponible');
    expect(suggestion.requiresCoachReview).toBe(true);
  });
});
