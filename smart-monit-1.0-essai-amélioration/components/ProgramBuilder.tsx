import React, { useState, useMemo, useEffect } from 'react';
import {
  ProgramCycle,
  ProgramWeek,
  ProgramSessionBuilder,
  ExerciseLibraryItem,
  Program,
  ProgramStatus,
  UserProfile,
  UserRole,
  Session,
  WorkoutType
} from '../types';
import { db } from '../services/mockDatabase';
import { generateFullProgram } from '../services/geminiService';
import { MILITARY_UNITS, getBaseCode } from '../utils/bases';
import { calculateVMA, buildStrengthZonesTable, buildVmaZonesTable } from '../utils/biometrics';
import { useToast } from './ToastProvider';
import ExerciseIllustration from './ExerciseIllustration';
import ExerciseCatalogBrowser from './ExerciseCatalogBrowser';

interface Props {
  onClose: () => void;
  existingProgram?: Program;
  defaultTargetUserId?: string;
  user: UserProfile;
}

const ProgramBuilder: React.FC<Props> = ({ onClose, existingProgram, defaultTargetUserId, user }) => {
  const { showToast } = useToast();
  const [activeView, setActiveView] = useState<'settings' | 'structure'>('settings');

  // Macrocycle settings
  const [title, setTitle] = useState(existingProgram?.title || '');
  const [goal, setGoal] = useState(existingProgram?.goal || '');
  const [type, setType] = useState<Program['type']>(existingProgram?.type || 'Musculation');
  const [targetMode, setTargetMode] = useState<'USER' | 'UNIT' | 'TEMPLATE'>(
    existingProgram?.isTemplate
      ? 'TEMPLATE'
      : existingProgram?.assignedUnit
      ? 'UNIT'
      : 'USER'
  );
  const [targetUserId, setTargetUserId] = useState<string>(
    existingProgram?.userId || defaultTargetUserId || ''
  );
  const [targetUnit, setTargetUnit] = useState<string>(existingProgram?.assignedUnit || '');
  const [isSharedNational, setIsSharedNational] = useState<boolean>(
    existingProgram?.isSharedNational ?? true
  );
  const [aiWeeks, setAiWeeks] = useState<number>(existingProgram?.durationWeeks || 4);
  const [aiFreq, setAiFreq] = useState<number>(existingProgram?.sessionsPerWeek || 3);
  const [generatingAI, setGeneratingAI] = useState(false);

  const [structure, setStructure] = useState<ProgramCycle[]>(existingProgram?.structure || []);

  const baseUsers = useMemo(
    () => db.getUsers().filter((u) => u.serviceId === user.serviceId && u.role === UserRole.USER),
    [user.serviceId]
  );

  // Pré-remplissage si demande PENDING ou programme existant avec sessions sans structure
  useEffect(() => {
    if (existingProgram && (!existingProgram.structure || existingProgram.structure.length === 0)) {
      if (existingProgram.sessions && existingProgram.sessions.length > 0) {
        // Reconstruit une structure éditable depuis les sessions existantes (ex: import IA)
        const week: ProgramWeek = {
          id: `w_1_${Date.now()}`,
          number: 1,
          objective: 'Semaine 1',
          isCollapsed: false,
          sessions: existingProgram.sessions.map((s, idx) => ({
            id: s.id || `s_${idx}_${Date.now()}`,
            title: s.title,
            type: s.workoutType || s.type || 'MUSCU',
            description: s.description,
            locationName: s.locationName,
            exercises: (s.content?.mainBlock || []).map((b, bIdx) => ({
              id: `ex_${idx}_${bIdx}_${Date.now()}`,
              libraryId: 'custom',
              name: b.exercise,
              sets: 3,
              reps: b.prescription,
              load: '',
              rest: b.rest || '1:30',
              tempo: b.tempo,
              durationSeconds: b.durationSeconds,
              isRecovery: b.isRecovery
            }))
          }))
        };
        setStructure([
          {
            id: `c_1_${Date.now()}`,
            title: `Mésocycle 1 — ${existingProgram.goal || 'PPO'}`,
            objective: existingProgram.goal || 'PPO',
            weeks: [week],
            isCollapsed: false
          }
        ]);
      } else if (existingProgram.status === ProgramStatus.PENDING) {
        const weeksCount = existingProgram.durationWeeks || 4;
        const sessionsCount = existingProgram.sessionsPerWeek || 3;
        const reqLocs = existingProgram.requestedLocations || [];
        let defaultType: Program['type'] = 'Musculation';
        if (existingProgram.goal.toLowerCase().includes('cardio') || existingProgram.goal.toLowerCase().includes('vma')) {
          defaultType = 'Course';
        } else if (existingProgram.goal.toLowerCase().includes('ccpm') || existingProgram.goal.toLowerCase().includes('commando')) {
          defaultType = 'Hybride';
        }
        setType(defaultType);

        const cycle: ProgramCycle = {
          id: `c_${Date.now()}`,
          title: `Mésocycle 1 — ${existingProgram.goal}`,
          objective: existingProgram.goal,
          weeks: [],
          isCollapsed: false
        };
        for (let w = 1; w <= weeksCount; w++) {
          const week: ProgramWeek = {
            id: `w_${w}_${Date.now()}`,
            number: w,
            objective: w % 4 === 0 ? 'Décharge (Deload -40%)' : 'Progression',
            sessions: [],
            isCollapsed: false
          };
          for (let s = 1; s <= sessionsCount; s++) {
            const loc = reqLocs.length > 0 ? reqLocs[(s - 1) % reqLocs.length] : undefined;
            week.sessions.push({
              id: `s_${w}_${s}_${Date.now()}`,
              title: `Séance ${s} — ${loc || defaultType}`,
              type: defaultType === 'Course' ? 'CARDIO' : 'MUSCU',
              locationName: loc,
              exercises: []
            });
          }
          cycle.weeks.push(week);
        }
        setStructure([cycle]);
      }
    }
  }, [existingProgram]);

  const library = db.getExerciseLibrary();
  const infras = db.getInfrastructures().filter((i) => i.serviceId === user.serviceId);
  const equipment = db.getEquipment().filter((e) => infras.some((i) => i.id === e.infrastructureId));

  const [editingSession, setEditingSession] = useState<{ cIdx: number; wIdx: number; sIdx: number } | null>(null);
  const [filterSearch, setFilterSearch] = useState('');
  const [selectedInfraId, setSelectedInfraId] = useState<string>('');
  const [showBiomechRef, setShowBiomechRef] = useState(false);

  const selectedAthlete = useMemo(
    () => baseUsers.find((u) => u.nid === targetUserId) || null,
    [baseUsers, targetUserId]
  );

  const weeklyLoadMetrics = useMemo(() => {
    const out: { label: string; sets: number; sessions: number; isDeload: boolean }[] = [];
    structure.forEach((cycle, cIdx) => {
      cycle.weeks.forEach((w) => {
        const sets = w.sessions.reduce(
          (sum, s) => sum + s.exercises.reduce((es, ex) => es + (ex.isRecovery ? 0 : ex.sets || 3), 0),
          0
        );
        const isDeload = w.number % 4 === 0 || (w.objective || '').toLowerCase().includes('décharge') || (w.objective || '').toLowerCase().includes('deload');
        out.push({
          label: structure.length > 1 ? `C${cIdx + 1}S${w.number}` : `Sem ${w.number}`,
          sets,
          sessions: w.sessions.length,
          isDeload
        });
      });
    });
    return out;
  }, [structure]);

  const applyProCyclePreset = async (preset: { title: string; goal: string; type: Program['type']; weeks: number; freq: number }) => {
    setTitle(preset.title);
    setGoal(preset.goal);
    setType(preset.type);
    setAiWeeks(preset.weeks);
    setAiFreq(preset.freq);
    setGeneratingAI(true);
    try {
      const refUser = selectedAthlete || baseUsers[0] || user;
      const result = await generateFullProgram(refUser, preset.goal, preset.freq, preset.weeks, infras.map((i) => i.name));
      const weeksMap = new Map<number, ProgramSessionBuilder[]>();
      (result.sessions || []).forEach((s: any, idx: number) => {
        const wNum = s.weekNumber || Math.floor(idx / preset.freq) + 1;
        if (!weeksMap.has(wNum)) weeksMap.set(wNum, []);
        weeksMap.get(wNum)!.push({
          id: `pre_s_${wNum}_${idx}_${Date.now()}`,
          title: s.title || `Séance ${idx + 1}`,
          type: (s.type || 'MUSCU').toUpperCase(),
          description: s.description,
          locationName: s.locationName,
          exercises: (s.content?.mainBlock || []).map((b: any, bIdx: number) => ({
            id: `pre_ex_${idx}_${bIdx}_${Date.now()}`,
            libraryId: 'preset',
            name: b.exercise,
            sets: wNum % 4 === 0 ? 3 : 4,
            reps: b.prescription,
            load: '',
            rest: b.rest || '1:30',
            tempo: b.tempo
          }))
        });
      });
      const generatedWeeks: ProgramWeek[] = Array.from(weeksMap.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([wNum, sessions]) => ({
          id: `w_${wNum}_${Date.now()}`,
          number: wNum,
          objective: wNum % 4 === 0 ? 'Décharge PIA 7.1.1 (-40% volume)' : `Montée en charge S${wNum}`,
          sessions,
          isCollapsed: false
        }));
      setStructure([
        {
          id: `c_pre_${Date.now()}`,
          title: `Mésocycle — ${preset.title}`,
          objective: preset.goal,
          weeks: generatedWeeks,
          isCollapsed: false
        }
      ]);
      setActiveView('structure');
      showToast(`Modèle pro « ${preset.title} » chargé et personnalisable !`, 'success');
    } finally {
      setGeneratingAI(false);
    }
  };

  // Génération IA Human-in-the-Loop (Section 4.2 & 4.5.3)
  const handleGenerateAITemplate = async () => {
    if (!goal.trim()) {
      showToast('Renseignez d\'abord l\'objectif principal pour guider l\'IA.', 'warning');
      return;
    }
    setGeneratingAI(true);
    try {
      const refUser =
        baseUsers.find((u) => u.nid === targetUserId) ||
        baseUsers[0] ||
        user;
      const result = await generateFullProgram(
        refUser,
        goal,
        aiFreq,
        aiWeeks,
        infras.map((i) => i.name)
      );

      if (!title.trim() && result.programTitle) {
        setTitle(result.programTitle);
      }

      const weeksMap = new Map<number, ProgramSessionBuilder[]>();
      (result.sessions || []).forEach((s: any, idx: number) => {
        const wNum = s.weekNumber || Math.floor(idx / aiFreq) + 1;
        if (!weeksMap.has(wNum)) weeksMap.set(wNum, []);
        weeksMap.get(wNum)!.push({
          id: `ai_s_${wNum}_${idx}_${Date.now()}`,
          title: s.title || `Séance ${idx + 1}`,
          type: (s.type || 'MUSCU').toUpperCase(),
          description: s.description,
          locationName: s.locationName,
          exercises: (s.content?.mainBlock || []).map((b: any, bIdx: number) => ({
            id: `ai_ex_${idx}_${bIdx}_${Date.now()}`,
            libraryId: 'ai',
            name: b.exercise,
            sets: 3,
            reps: b.prescription,
            load: '',
            rest: b.rest || '1:30',
            tempo: b.tempo
          }))
        });
      });

      const generatedWeeks: ProgramWeek[] = Array.from(weeksMap.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([wNum, sessions]) => ({
          id: `w_${wNum}_${Date.now()}`,
          number: wNum,
          objective: wNum % 4 === 0 ? 'Décharge (Deload -40%)' : 'Charge progressive',
          sessions,
          isCollapsed: false
        }));

      setStructure([
        {
          id: `c_ai_${Date.now()}`,
          title: `Mésocycle IA (à valider) — ${goal}`,
          objective: goal,
          weeks: generatedWeeks,
          isCollapsed: false
        }
      ]);
      setActiveView('structure');
      showToast('Trame IA générée ! Vérifiez et ajustez les séances avant validation (Human-in-the-Loop).', 'success');
    } catch (e) {
      console.error(e);
      showToast('Erreur lors de la génération de la trame.', 'error');
    } finally {
      setGeneratingAI(false);
    }
  };

  const addCycle = () => {
    setStructure([
      ...structure,
      {
        id: `c_${Date.now()}`,
        title: `Mésocycle ${structure.length + 1}`,
        objective: 'Objectif du cycle',
        weeks: [],
        isCollapsed: false
      }
    ]);
  };

  const addWeek = (cIdx: number) => {
    const next = [...structure];
    next[cIdx].weeks.push({
      id: `w_${Date.now()}_${Math.random()}`,
      number: next[cIdx].weeks.length + 1,
      objective: '',
      sessions: [],
      isCollapsed: false
    });
    setStructure(next);
  };

  const addSession = (cIdx: number, wIdx: number) => {
    const next = [...structure];
    next[cIdx].weeks[wIdx].sessions.push({
      id: `s_${Date.now()}_${Math.random()}`,
      title: `Séance ${next[cIdx].weeks[wIdx].sessions.length + 1}`,
      type: type === 'Course' ? 'CARDIO' : 'MUSCU',
      exercises: []
    });
    setStructure(next);
    setEditingSession({ cIdx, wIdx, sIdx: next[cIdx].weeks[wIdx].sessions.length - 1 });
  };

  const addExercise = (exItem: ExerciseLibraryItem) => {
    if (!editingSession) return;
    const { cIdx, wIdx, sIdx } = editingSession;
    const next = [...structure];
    const isTimeBased = exItem.type === 'Cardio' || exItem.type === 'Mobility';

    next[cIdx].weeks[wIdx].sessions[sIdx].exercises.push({
      id: `ex_${Date.now()}_${Math.random()}`,
      libraryId: exItem.id,
      name: exItem.name,
      sets: isTimeBased ? 1 : 4,
      reps: isTimeBased ? undefined : '8 à [75% 1RM]',
      durationSeconds: isTimeBased ? 60 : undefined,
      load: isTimeBased ? '[85% VMA]' : '[75% 1RM]',
      rest: '1:30'
    });
    setStructure(next);
  };

  const addRecovery = () => {
    if (!editingSession) return;
    const { cIdx, wIdx, sIdx } = editingSession;
    const next = [...structure];
    next[cIdx].weeks[wIdx].sessions[sIdx].exercises.push({
      id: `rec_${Date.now()}_${Math.random()}`,
      libraryId: 'recovery',
      name: 'Récupération active',
      durationSeconds: 90,
      isRecovery: true
    });
    setStructure(next);
  };

  const duplicateSequence = () => {
    if (!editingSession) return;
    const { cIdx, wIdx, sIdx } = editingSession;
    const next = [...structure];
    const sess = next[cIdx].weeks[wIdx].sessions[sIdx];
    if (sess.exercises.length === 0) return;
    sess.exercises.push(...sess.exercises.map((ex) => ({ ...ex, id: `dup_${Date.now()}_${Math.random()}` })));
    setStructure(next);
  };

  const exercisesAvailableInInfra = useMemo(() => {
    const base = !selectedInfraId
      ? library
      : library.filter((ex) => {
          const infraEquip = equipment.filter((e) => e.infrastructureId === selectedInfraId && e.status === 'Operational');
          const needs = ex.equipment.toLowerCase();
          if (needs === 'pdc') return true;
          if (infraEquip.some((e) => e.name.toLowerCase().includes(needs))) return true;
          if (ex.type === 'Cardio' && infraEquip.some((e) => e.category === 'Cardio')) return true;
          if (ex.type === 'Force' && infraEquip.some((e) => e.category === 'Musculation')) return true;
          return false;
        });

    const q = filterSearch.toLowerCase();
    return q ? base.filter((e) => e.name.toLowerCase().includes(q) || e.muscleGroup.toLowerCase().includes(q)) : base;
  }, [selectedInfraId, library, equipment, filterSearch]);

  const handleSave = () => {
    if (!title.trim()) {
      showToast('Veuillez saisir un titre pour le programme.', 'warning');
      return;
    }
    if (targetMode === 'USER' && !targetUserId) {
      showToast('Sélectionnez un militaire destinataire (ou choisissez Unité / Modèle).', 'warning');
      return;
    }
    if (targetMode === 'UNIT' && !targetUnit) {
      showToast('Sélectionnez l\'unité cible pour la personnalisation de masse.', 'warning');
      return;
    }

    const programId = existingProgram?.id || `prog_${Date.now()}`;
    const flattenedSessions: Session[] = [];
    let sessionCount = 0;
    const daySlots = [1, 3, 5, 6, 2, 4, 7];

    structure.forEach((cycle, cIdx) => {
      cycle.weeks.forEach((week) => {
        week.sessions.forEach((sess, sIdx) => {
          sessionCount++;
          const mainBlock = sess.exercises.map((ex) => {
            const presc = ex.durationSeconds
              ? `${Math.floor(ex.durationSeconds / 60)}:${(ex.durationSeconds % 60).toString().padStart(2, '0')}${ex.load ? ` à ${ex.load}` : ''}`
              : ex.reps
              ? `${ex.sets ? `${ex.sets} x ` : ''}${ex.reps}${ex.load && !ex.reps.includes('%') ? ` à ${ex.load}` : ''}`
              : `${ex.sets || 3} séries ${ex.load || ''}`.trim();
            return {
              exercise: ex.name,
              prescription: presc,
              rest: ex.rest || '1:30',
              tempo: ex.tempo,
              durationSeconds: ex.durationSeconds,
              isRecovery: ex.isRecovery
            };
          });

          const estimatedMinutes = Math.max(
            20,
            Math.round(sess.exercises.reduce((acc, ex) => acc + (ex.durationSeconds ? ex.durationSeconds / 60 : (ex.sets || 3) * 2.5), 0) + 12)
          );

          flattenedSessions.push({
            id: `sess_${programId}_${sessionCount}`,
            programId,
            title: sess.title || `Séance ${sessionCount}`,
            description: sess.description || `Mésocycle ${cIdx + 1} • Semaine ${week.number} ${week.objective ? `(${week.objective})` : ''}`,
            durationMinutes: estimatedMinutes,
            type: sess.type || 'MUSCU',
            workoutType: sess.type || 'MUSCU',
            dateScheduled: `S${week.number}J${daySlots[sIdx % daySlots.length]}`,
            locationName: sess.locationName || infras.find((i) => i.id === sess.infrastructureId)?.name || 'Installation Base',
            infrastructureId: sess.infrastructureId || 'any',
            isCompleted: false,
            content: {
              warmup: 'Échauffement articulaire progressif et cardio léger (8-10 min).',
              mainBlock,
              cooldown: 'Retour au calme et étirements doux (5 min).',
              advice: 'Charges et allures adaptées automatiquement à votre 1RM, VMA et bilan du jour.'
            }
          });
        });
      });
    });

    const assignedUserIds =
      targetMode === 'UNIT'
        ? baseUsers.filter((u) => u.unit === targetUnit).map((u) => u.nid)
        : targetMode === 'USER'
        ? [targetUserId]
        : [];

    const newProgram: Program = {
      id: programId,
      userId: targetMode === 'USER' ? targetUserId : '',
      assignedUserIds,
      assignedUnit: targetMode === 'UNIT' ? targetUnit : undefined,
      isTemplate: targetMode === 'TEMPLATE',
      isSharedNational,
      createdByNid: existingProgram?.createdByNid || user.nid,
      createdByName: existingProgram?.createdByName || user.name,
      createdByBase: existingProgram?.createdByBase || getBaseCode(user.serviceId),
      validatorId: user.nid,
      title: title.trim(),
      goal: goal.trim() || 'Préparation Physique Opérationnelle',
      type,
      startDate: existingProgram?.startDate || new Date().toISOString().split('T')[0],
      durationWeeks: Math.max(1, structure.reduce((acc, c) => acc + c.weeks.length, 0)),
      sessionsPerWeek: structure[0]?.weeks[0]?.sessions.length || aiFreq,
      status: ProgramStatus.VALIDATED,
      sessions: flattenedSessions,
      structure
    };

    if (existingProgram) {
      db.updateProgram(newProgram);
    } else {
      db.addProgram(newProgram);
    }

    if (assignedUserIds.length > 0) {
      db.addNotification({
        id: `prog_val_${Date.now()}`,
        title: 'Nouveau programme validé',
        message: `${user.name} vous a affecté le programme "${newProgram.title}" (${newProgram.sessions.length} séances personnalisées).`,
        type: 'success',
        category: 'PROGRAM',
        timestamp: Date.now(),
        read: false,
        serviceId: user.serviceId,
        targetNids: assignedUserIds
      });
    }

    showToast(
      targetMode === 'UNIT'
        ? `Programme directeur diffusé à l'unité ${targetUnit} (${assignedUserIds.length} militaire(s)) !`
        : targetMode === 'TEMPLATE'
        ? 'Modèle enregistré dans la Mémoire EPMS.'
        : 'Programme validé et transmis au militaire !',
      'success'
    );
    onClose();
  };

  // --- 1. SETTINGS VIEW ---
  if (activeView === 'settings') {
    return (
      <div className="bg-white rounded-3xl shadow-sm border border-military-100 p-6 md:p-8 max-w-2xl mx-auto animate-[fadeIn_0.3s] space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-black text-military-900 uppercase">
              {existingProgram ? 'Édition Programme' : 'Nouveau Programme Directeur'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Définissez le cadre (Macrocycle) et le destinataire (individuel ou personnalisation de masse).
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-military-900">
            <span className="material-icons">close</span>
          </button>
        </div>

        {/* Destinataire : Individuel / Unité (Personnalisation de masse) / Modèle */}
        <div className="bg-military-50 p-4 rounded-2xl border border-military-200 space-y-3">
          <label className="text-[10px] font-black uppercase tracking-widest text-military-600 block">
            Mode d'affectation (Personnalisation de masse)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'USER', label: '1 Militaire', icon: 'person' },
              { id: 'UNIT', label: 'Toute une Unité', icon: 'groups' },
              { id: 'TEMPLATE', label: 'Modèle EPMS', icon: 'bookmark' }
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setTargetMode(m.id as any)}
                className={`p-3 rounded-xl text-xs font-black uppercase flex flex-col items-center gap-1 border-2 transition-all ${
                  targetMode === m.id
                    ? 'bg-military-900 text-white border-military-900'
                    : 'bg-white text-military-600 border-gray-200 hover:border-military-400'
                }`}
              >
                <span className="material-icons text-lg">{m.icon}</span>
                {m.label}
              </button>
            ))}
          </div>

          {targetMode === 'USER' && (
            <select
              className="w-full p-3 bg-white border border-gray-200 rounded-xl font-bold text-sm"
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
            >
              <option value="">-- Sélectionner le militaire --</option>
              {baseUsers.map((u) => (
                <option key={u.nid} value={u.nid}>
                  {u.name} (NID {u.nid} — {u.unit || u.jobType})
                </option>
              ))}
            </select>
          )}

          {targetMode === 'UNIT' && (
            <div>
              <select
                className="w-full p-3 bg-white border border-gray-200 rounded-xl font-bold text-sm"
                value={targetUnit}
                onChange={(e) => setTargetUnit(e.target.value)}
              >
                <option value="">-- Sélectionner l'unité cible --</option>
                {MILITARY_UNITS.map((unit) => {
                  const count = baseUsers.filter((u) => u.unit === unit).length;
                  return (
                    <option key={unit} value={unit}>
                      {unit} ({count} inscrit(s) sur votre base)
                    </option>
                  );
                })}
              </select>
              <p className="text-[11px] text-military-600 mt-1.5">
                L'application calculera automatiquement les charges (1RM) et allures (VMA) individuelles de chaque militaire de l'unité.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Titre du Programme *</label>
            <input
              className="w-full p-3.5 bg-gray-50 rounded-xl font-bold border border-gray-200 focus:border-action-500 outline-none"
              placeholder="ex: Prépa CCPM Printemps / Cycle Force ESIS"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Objectif Principal *</label>
            <input
              className="w-full p-3.5 bg-gray-50 rounded-xl font-bold border border-gray-200 focus:border-action-500 outline-none"
              placeholder="ex: Développement VMA & Endurance musculaire"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type Dominant</label>
            <div className="flex flex-wrap gap-2">
              {(['Musculation', 'Course', 'Hybride', 'Réathlétisation', 'Natation', 'Pilates', 'Mobilité'] as Program['type'][]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`px-3.5 py-2 rounded-xl font-black text-[11px] uppercase border-2 ${
                    type === t
                      ? 'border-action-500 bg-action-50 text-action-700'
                      : 'border-gray-100 text-gray-400 hover:border-gray-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Templates Préparateur Physique Pro en 1 clic */}
          <div className="p-4 rounded-2xl bg-military-50 border border-military-200 space-y-2.5">
            <div className="text-[10px] font-black uppercase tracking-widest text-military-700 flex items-center gap-1.5">
              <span className="material-icons text-sm text-action-600">bolt</span>
              Modèles de Cycles Pro (1 clic — Périodisation 3:1 PIA 7.1.1)
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { title: 'Cycle CCPM 4 Semaines', goal: 'Préparation CCPM (VMA 2400m + Pompes + Gainage)', type: 'Hybride' as const, weeks: 4, freq: 3 },
                { title: 'Force & Hypertrophie PPO', goal: 'Développement Force Max & Hypertrophie PPO', type: 'Musculation' as const, weeks: 4, freq: 4 },
                { title: 'Reprise & Prévention ORFA', goal: 'Réathlétisation, Mobilité & Prévention TMS', type: 'Mobilité' as const, weeks: 3, freq: 2 },
                { title: 'Prépa OPEX Hybride 6 Sem', goal: 'Endurance opérationnelle, force utile et VMA', type: 'Hybride' as const, weeks: 6, freq: 4 }
              ].map((preset) => (
                <button
                  key={preset.title}
                  type="button"
                  disabled={generatingAI}
                  onClick={() => applyProCyclePreset(preset)}
                  className="p-3 bg-white hover:bg-action-50 border border-gray-200 hover:border-action-500 rounded-xl text-left transition-all"
                >
                  <div className="font-black text-xs text-military-900">{preset.title}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{preset.weeks} sem • {preset.freq} séa/sem</div>
                </button>
              ))}
            </div>
          </div>

          {/* Paramètres IA Human-in-the-Loop */}
          <div className="p-4 rounded-2xl bg-action-50 border border-action-200 space-y-3">
            <div className="flex items-center gap-2 text-military-900 font-black text-xs uppercase">
              <span className="material-icons text-action-600 text-base">auto_awesome</span>
              Assistant IA (Human-in-the-Loop)
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-500">Semaines</label>
                <select className="w-full p-2 bg-white border border-gray-200 rounded-lg font-bold text-xs" value={aiWeeks} onChange={(e) => setAiWeeks(Number(e.target.value))}>
                  {[2, 4, 6, 8, 12].map((n) => <option key={n} value={n}>{n} semaines</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-500">Séances / semaine</label>
                <select className="w-full p-2 bg-white border border-gray-200 rounded-lg font-bold text-xs" value={aiFreq} onChange={(e) => setAiFreq(Number(e.target.value))}>
                  {[2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} séances/sem</option>)}
                </select>
              </div>
            </div>
            <button
              type="button"
              onClick={handleGenerateAITemplate}
              disabled={generatingAI}
              className="w-full py-3 bg-action-500 hover:bg-action-400 text-military-950 font-black uppercase text-xs rounded-xl shadow flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span className={`material-icons text-sm ${generatingAI ? 'animate-spin' : ''}`}>
                {generatingAI ? 'refresh' : 'psychology'}
              </span>
              {generatingAI ? 'Génération de la trame PPO...' : 'Générer une trame IA modifiable'}
            </button>
          </div>

          <label className="flex items-center gap-2.5 text-xs font-bold text-military-700 cursor-pointer">
            <input
              type="checkbox"
              checked={isSharedNational}
              onChange={(e) => setIsSharedNational(e.target.checked)}
              className="w-4 h-4 accent-military-900"
            />
            Partager dans la Mémoire EPMS Nationale (mutualisation inter-bases AAE)
          </label>
        </div>

        <div className="pt-4 flex gap-3 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-3.5 font-bold text-gray-500 uppercase text-xs">
            Annuler
          </button>
          <button
            onClick={() => {
              if (!title.trim()) {
                showToast('Titre requis pour continuer.', 'warning');
                return;
              }
              if (structure.length === 0) addCycle();
              setActiveView('structure');
            }}
            className="flex-[2] bg-military-900 text-white font-black py-3.5 rounded-xl uppercase text-xs tracking-wider shadow-lg hover:bg-military-800"
          >
            Suivant : Construire la Structure →
          </button>
        </div>
      </div>
    );
  }

  // --- 3. SESSION EDITOR OVERLAY ---
  if (editingSession) {
    const { cIdx, wIdx, sIdx } = editingSession;
    const sessionData = structure[cIdx].weeks[wIdx].sessions[sIdx];

    return (
      <div className="fixed inset-0 bg-white z-[70] flex flex-col animate-[slideUp_0.25s]">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-military-900 text-white">
          <div className="min-w-0 flex-grow mr-4">
            <div className="text-[10px] font-bold uppercase text-action-400">
              Mésocycle {cIdx + 1} • Semaine {structure[cIdx].weeks[wIdx].number}
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <input
                className="bg-military-800 px-3 py-1.5 rounded-lg font-black text-base outline-none text-white"
                value={sessionData.title}
                onChange={(e) => {
                  const n = [...structure];
                  n[cIdx].weeks[wIdx].sessions[sIdx].title = e.target.value;
                  setStructure(n);
                }}
              />
              <select
                className="bg-military-800 text-white text-xs font-black uppercase px-2.5 py-1.5 rounded-lg border border-white/20 outline-none"
                value={sessionData.type}
                onChange={(e) => {
                  const n = [...structure];
                  n[cIdx].weeks[wIdx].sessions[sIdx].type = e.target.value;
                  setStructure(n);
                }}
              >
                {Object.values(WorkoutType).map((t) => (
                  <option key={t} value={t} className="text-black">{t}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={() => setEditingSession(null)}
            className="bg-action-500 text-military-950 px-4 py-2 rounded-xl font-black uppercase text-xs flex items-center gap-1"
          >
            <span className="material-icons text-sm">check</span> Terminer
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-grow overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 custom-scrollbar">
            <div className="bg-white p-4 rounded-2xl border border-gray-200">
              <label className="text-[10px] font-black text-gray-400 uppercase mb-1.5 block">
                Lieu prévu (filtre la bibliothèque selon le matériel opérationnel)
              </label>
              <select
                className="w-full p-2.5 bg-military-50 rounded-xl font-bold text-sm outline-none"
                value={selectedInfraId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedInfraId(val);
                  const n = [...structure];
                  n[cIdx].weeks[wIdx].sessions[sIdx].infrastructureId = val;
                  n[cIdx].weeks[wIdx].sessions[sIdx].locationName = infras.find((i) => i.id === val)?.name;
                  setStructure(n);
                }}
              >
                <option value="">-- Tout matériel / Libre --</option>
                {infras.map((i) => (
                  <option key={i.id} value={i.id}>{i.name} ({i.type})</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button onClick={addRecovery} className="flex-1 bg-blue-50 text-blue-700 p-3 rounded-xl font-black text-[11px] uppercase border border-blue-100 hover:bg-blue-100 flex items-center justify-center gap-1">
                <span className="material-icons text-sm">timer</span> + Récupération
              </button>
              <button onClick={duplicateSequence} className="flex-1 bg-purple-50 text-purple-700 p-3 rounded-xl font-black text-[11px] uppercase border border-purple-100 hover:bg-purple-100 flex items-center justify-center gap-1">
                <span className="material-icons text-sm">content_copy</span> Dupliquer bloc
              </button>
            </div>

            {sessionData.exercises.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm italic border-2 border-dashed border-gray-200 rounded-2xl">
                Cliquez sur un exercice dans le panneau de droite pour l'ajouter. Utilisez [75% 1RM] ou [85% VMA] pour le calcul automatique.
              </div>
            ) : (
              sessionData.exercises.map((ex, i) => (
                <div key={ex.id} className={`bg-white p-4 rounded-2xl shadow-sm border ${ex.isRecovery ? 'border-blue-200 bg-blue-50/40' : 'border-gray-100'}`}>
                  <div className="flex justify-between items-center font-black text-sm text-military-900 mb-2 gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {!ex.isRecovery && <ExerciseIllustration exerciseName={ex.name} fallbackType={sessionData.type} size="xs" />}
                      <span className="truncate">{i + 1}. {ex.name}</span>
                    </div>
                    <button
                      onClick={() => {
                        const n = [...structure];
                        n[cIdx].weeks[wIdx].sessions[sIdx].exercises.splice(i, 1);
                        setStructure(n);
                      }}
                      className="text-red-400 hover:text-red-600"
                    >
                      <span className="material-icons text-sm">close</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {!ex.isRecovery && (
                      <input
                        className="bg-gray-50 p-2 rounded-lg text-xs font-bold border border-gray-200"
                        type="number"
                        value={ex.sets ?? ''}
                        onChange={(e) => {
                          const n = [...structure];
                          n[cIdx].weeks[wIdx].sessions[sIdx].exercises[i].sets = parseInt(e.target.value, 10) || 1;
                          setStructure(n);
                        }}
                        placeholder="Séries"
                      />
                    )}
                    {ex.durationSeconds !== undefined ? (
                      <input
                        className="bg-gray-50 p-2 rounded-lg text-xs font-bold border border-gray-200"
                        type="number"
                        value={ex.durationSeconds}
                        onChange={(e) => {
                          const n = [...structure];
                          n[cIdx].weeks[wIdx].sessions[sIdx].exercises[i].durationSeconds = parseInt(e.target.value, 10) || 30;
                          setStructure(n);
                        }}
                        placeholder="Secondes"
                      />
                    ) : (
                      <input
                        className="bg-gray-50 p-2 rounded-lg text-xs font-bold border border-gray-200"
                        value={ex.reps || ''}
                        onChange={(e) => {
                          const n = [...structure];
                          n[cIdx].weeks[wIdx].sessions[sIdx].exercises[i].reps = e.target.value;
                          setStructure(n);
                        }}
                        placeholder="Reps (ex: 8)"
                      />
                    )}
                    {!ex.isRecovery && (
                      <input
                        className="bg-gray-50 p-2 rounded-lg text-xs font-bold border border-gray-200"
                        value={ex.load || ''}
                        onChange={(e) => {
                          const n = [...structure];
                          n[cIdx].weeks[wIdx].sessions[sIdx].exercises[i].load = e.target.value;
                          setStructure(n);
                        }}
                        placeholder="[75% 1RM] / [85% VMA]"
                      />
                    )}
                    <input
                      className="bg-gray-50 p-2 rounded-lg text-xs font-bold border border-gray-200"
                      value={ex.rest || ''}
                      onChange={(e) => {
                        const n = [...structure];
                        n[cIdx].weeks[wIdx].sessions[sIdx].exercises[i].rest = e.target.value;
                        setStructure(n);
                      }}
                      placeholder="Repos (1:30)"
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="w-full md:w-[420px] bg-gray-50 border-l border-gray-200 flex flex-col">
            <div className="p-3.5 border-b border-gray-200 bg-white">
              <h4 className="font-black text-xs text-military-900 uppercase">
                Exercices {selectedInfraId ? '(Compatibles lieu)' : `(${exercisesAvailableInInfra.length})`}
              </h4>
            </div>
            <div className="flex-grow overflow-y-auto p-3 custom-scrollbar">
              <ExerciseCatalogBrowser
                exercises={exercisesAvailableInInfra}
                mode="picker"
                compact
                onSelectExercise={addExercise}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- 2. STRUCTURE VIEW ---
  return (
    <div className="space-y-6 animate-[fadeIn_0.25s]">
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-military-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-black text-xl text-military-900 uppercase">{title}</h2>
          <p className="text-xs text-gray-500 font-semibold">
            {type} • {goal} •{' '}
            {targetMode === 'UNIT'
              ? `Unité : ${targetUnit}`
              : targetMode === 'TEMPLATE'
              ? 'Modèle National EPMS'
              : `Militaire : ${baseUsers.find((u) => u.nid === targetUserId)?.name || targetUserId}`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {selectedAthlete && (
            <button
              type="button"
              onClick={() => setShowBiomechRef(!showBiomechRef)}
              className="px-3.5 py-2.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-xl text-xs font-black uppercase flex items-center gap-1"
            >
              <span className="material-icons text-sm">calculate</span>
              Zones VMA / 1RM
            </button>
          )}
          <button
            onClick={() => setActiveView('settings')}
            className="px-4 py-2.5 bg-gray-100 text-military-800 rounded-xl text-xs font-black uppercase flex items-center gap-1"
          >
            <span className="material-icons text-sm">settings</span> Paramètres
          </button>
          <button
            onClick={handleSave}
            className="bg-action-500 hover:bg-action-400 text-military-950 px-5 py-2.5 rounded-xl text-xs font-black uppercase shadow-lg flex items-center gap-1.5"
          >
            <span className="material-icons text-sm">check_circle</span> Valider & Diffuser
          </button>
        </div>
      </div>

      {/* Référentiel biomécanique express de l'athlète ciblé (Préparateur Physique Pro) */}
      {showBiomechRef && selectedAthlete && (
        <div className="bg-white rounded-3xl p-5 border border-blue-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4 text-xs animate-[fadeIn_0.2s]">
          <div>
            <div className="font-black uppercase text-blue-900 mb-2">
              Allures Piste — VMA {calculateVMA(selectedAthlete.tests)} km/h ({selectedAthlete.name})
            </div>
            <div className="space-y-1">
              {buildVmaZonesTable(calculateVMA(selectedAthlete.tests)).map((z) => (
                <div key={z.pct} className="flex justify-between bg-blue-50/50 px-2.5 py-1 rounded-lg">
                  <span className="font-black text-blue-800">{z.pct}% ({z.speedKmH} km/h)</span>
                  <span className="font-mono text-gray-700">{z.pacePerKm} • 400m: {z.split400m}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="font-black uppercase text-military-900 mb-2">
              Charges 1RM (DC {selectedAthlete.tests.benchPress1RM || 65}kg / Squat {selectedAthlete.tests.squat1RM || 85}kg)
            </div>
            <div className="space-y-1">
              {buildStrengthZonesTable(selectedAthlete.tests.squat1RM || 85).slice(0, 6).map((r) => (
                <div key={r.pct} className="flex justify-between bg-military-50 px-2.5 py-1 rounded-lg">
                  <span className="font-black text-military-800">{r.pct}% ({r.reps} reps)</span>
                  <span className="font-mono text-gray-700">
                    DC {Math.round(((selectedAthlete.tests.benchPress1RM || 65) * r.pct) / 100 / 2.5) * 2.5} kg • SQ {r.kg} kg
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Courbe de Périodisation Volume / Décharge 3:1 (PIA 7.1.1) */}
      {weeklyLoadMetrics.length > 0 && (
        <div className="bg-white rounded-3xl p-5 border border-military-100 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-black uppercase text-military-900 flex items-center gap-1.5">
              <span className="material-icons text-sm text-action-600">bar_chart</span>
              Périodisation du Volume Hebdomadaire (Règle 3:1 PIA 7.1.1)
            </h3>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              Vert = Semaine de décharge
            </span>
          </div>
          <div className="flex items-end gap-2 h-24 pt-2">
            {weeklyLoadMetrics.map((m, idx) => {
              const maxSets = Math.max(12, ...weeklyLoadMetrics.map((x) => x.sets));
              const hPct = Math.max(12, Math.round((m.sets / maxSets) * 100));
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <span className="text-[9px] font-black text-gray-500">{m.sets}s</span>
                  <div
                    className={`w-full max-w-[44px] rounded-t-lg transition-all ${
                      m.isDeload ? 'bg-emerald-500' : 'bg-military-900'
                    }`}
                    style={{ height: `${hPct}%` }}
                    title={`${m.label}: ${m.sets} séries (${m.sessions} séances)`}
                  />
                  <span className="text-[9px] font-black uppercase text-military-700">{m.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-5 pb-10">
        {structure.map((cycle, cIdx) => (
          <div key={cycle.id} className="bg-white rounded-3xl shadow-sm border border-military-100 overflow-hidden">
            <div
              className="bg-military-100 p-4 flex justify-between items-center cursor-pointer"
              onClick={() => {
                const n = [...structure];
                n[cIdx].isCollapsed = !n[cIdx].isCollapsed;
                setStructure(n);
              }}
            >
              <div className="flex-grow mr-4">
                <span className="text-[10px] font-black uppercase text-military-600 tracking-widest">Mésocycle {cIdx + 1}</span>
                <input
                  onClick={(e) => e.stopPropagation()}
                  className="block w-full bg-transparent font-black text-military-900 text-base outline-none"
                  value={cycle.title}
                  onChange={(e) => {
                    const n = [...structure];
                    n[cIdx].title = e.target.value;
                    setStructure(n);
                  }}
                />
              </div>
              <span className="material-icons text-military-600">{cycle.isCollapsed ? 'expand_more' : 'expand_less'}</span>
            </div>

            {!cycle.isCollapsed && (
              <div className="p-5 space-y-5">
                {cycle.weeks.map((week, wIdx) => (
                  <div key={week.id} className="border-l-2 border-military-200 pl-4">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <h4 className="font-black text-xs text-military-800 uppercase">
                          Semaine {week.number} {week.objective ? `— ${week.objective}` : ''}
                        </h4>
                      </div>
                      <button
                        onClick={() => addSession(cIdx, wIdx)}
                        className="bg-white border border-gray-200 text-military-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase hover:border-action-500 hover:text-action-700"
                      >
                        + Séance
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {week.sessions.map((sess, sIdx) => (
                        <div
                          key={sess.id}
                          onClick={() => setEditingSession({ cIdx, wIdx, sIdx })}
                          className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200 cursor-pointer hover:border-action-500 hover:shadow transition-all"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <span className="font-bold text-sm text-military-900">{sess.title}</span>
                            <span className="material-icons text-sm text-gray-400">edit</span>
                          </div>
                          <div className="text-[11px] text-gray-500 mt-1.5 font-semibold">
                            {sess.type} • {sess.exercises.length} exercice(s)
                          </div>
                          {sess.exercises.length > 0 && (
                            <div className="flex items-center gap-1 mt-2 overflow-hidden">
                              {sess.exercises.slice(0, 3).map((ex) => (
                                <ExerciseIllustration key={ex.id} exerciseName={ex.name} fallbackType={sess.type} size="xs" clickable={false} />
                              ))}
                              {sess.exercises.length > 3 && (
                                <span className="text-[10px] font-black text-military-600 pl-1">+{sess.exercises.length - 3}</span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                      {week.sessions.length === 0 && (
                        <div className="text-xs italic text-gray-400 py-2">Aucune séance cette semaine.</div>
                      )}
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => addWeek(cIdx)}
                  className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-xs font-black text-gray-400 uppercase hover:border-military-400 hover:text-military-700"
                >
                  + Ajouter une semaine
                </button>
              </div>
            )}
          </div>
        ))}

        <button
          onClick={addCycle}
          className="w-full py-4 bg-military-900 text-white rounded-2xl font-black uppercase text-xs tracking-wider shadow-lg hover:bg-military-800"
        >
          + Ajouter un Mésocycle
        </button>
      </div>
    </div>
  );
};

export default ProgramBuilder;
