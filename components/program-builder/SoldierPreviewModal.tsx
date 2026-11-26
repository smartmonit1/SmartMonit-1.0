import React, { useMemo, useState } from 'react';
import {
  DailyForm,
  ExerciseLibraryItem,
  Gender,
  JobType,
  MissingReferenceKind,
  Program,
  ProgramCycle,
  ProgramStatus,
  UserProfile,
  UserRole,
  WorkSchedule
} from '../../types';
import { getFormulaConfig, individualizeProgramForUser } from '../../utils/calculationEngine';

interface SoldierPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  programTitle: string;
  structure: ProgramCycle[];
  soldiers: UserProfile[];
  exerciseLibrary: ExerciseLibraryItem[];
  initialSoldierId?: string;
}

const MISSING_LABELS: Record<MissingReferenceKind, string> = {
  VMA: 'VMA absente (aucun test VAMEVAL / Luc Léger / Demi-Cooper / course saisi)',
  '1RM_UPPER': '1RM Haut du corps absent (Développé couché)',
  '1RM_LOWER': '1RM Bas du corps absent (Squat)',
  '1RM_DEADLIFT': '1RM Soulevé de terre absent'
};

const ARCHETYPES: UserProfile[] = [
  {
    nid: '0000000001',
    name: 'Profil Type — Commando FUSCO (Complet)',
    role: UserRole.USER,
    serviceId: 'ARCH',
    gender: Gender.MALE,
    jobType: JobType.FUSCO,
    workSchedule: WorkSchedule.SHIFT,
    tests: {
      vamevalPalier: 17,
      calculatedVMA: 16.5,
      benchPress1RM: 100,
      squat1RM: 130,
      deadlift1RM: 150,
      pushups: 55,
      pullups: 18
    },
    dailyForms: []
  },
  {
    nid: '0000000002',
    name: 'Profil Type — Pilote Chasse (PN)',
    role: UserRole.USER,
    serviceId: 'ARCH',
    gender: Gender.FEMALE,
    jobType: JobType.PN,
    workSchedule: WorkSchedule.OFFICE,
    tests: {
      cooperDistance: 1450,
      calculatedVMA: 14.5,
      benchPress1RM: 50,
      squat1RM: 75
    },
    dailyForms: []
  },
  {
    nid: '0000000003',
    name: 'Profil Type — Militaire SANS 1RM ni VMA (Test alerte)',
    role: UserRole.USER,
    serviceId: 'ARCH',
    gender: Gender.MALE,
    jobType: JobType.TECH,
    workSchedule: WorkSchedule.OFFICE,
    tests: {},
    dailyForms: []
  }
];

const SoldierPreviewModal: React.FC<SoldierPreviewModalProps> = ({
  isOpen,
  onClose,
  programTitle,
  structure,
  soldiers,
  initialSoldierId
}) => {
  const allTargets = useMemo(() => [...soldiers, ...ARCHETYPES], [soldiers]);
  const [selectedNid, setSelectedNid] = useState<string>(
    initialSoldierId || allTargets[0]?.nid || ARCHETYPES[0].nid
  );
  const [simulateDaily, setSimulateDaily] = useState(false);
  const [fatigue, setFatigue] = useState(6);
  const [sleep, setSleep] = useState(5);
  const [painLevel, setPainLevel] = useState(0);
  const [painZone, setPainZone] = useState('');
  const [expandedTraceId, setExpandedTraceId] = useState<string | null>(null);

  const selectedUser = useMemo(
    () => allTargets.find((u) => u.nid === selectedNid) || allTargets[0],
    [allTargets, selectedNid]
  );

  const simulatedDailyForm: DailyForm | undefined = useMemo(() => {
    if (!simulateDaily) return undefined;
    return {
      date: new Date().toISOString().split('T')[0],
      fatigueLevel: fatigue,
      sleepQuality: sleep,
      stressLevel: 5,
      painLevel,
      painZone: painLevel > 0 ? painZone : undefined
    };
  }, [simulateDaily, fatigue, sleep, painLevel, painZone]);

  const result = useMemo(() => {
    const pseudoProgram: Program = {
      id: 'preview_prog',
      userId: selectedUser.nid,
      title: programTitle || 'Programme EPMS',
      goal: '',
      status: ProgramStatus.VALIDATED,
      startDate: new Date().toISOString().split('T')[0],
      durationWeeks: Math.max(1, structure.reduce((a, c) => a + c.weeks.length, 0)),
      sessionsPerWeek: 3,
      sessions: [],
      structure
    };
    return individualizeProgramForUser(
      pseudoProgram,
      selectedUser,
      simulatedDailyForm,
      getFormulaConfig()
    );
  }, [structure, programTitle, selectedUser, simulatedDailyForm]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-military-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Prévisualisation en tant que militaire"
    >
      <div className="bg-white text-military-900 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-military-200">
        {/* Header */}
        <div className="bg-military-900 text-white p-4 sm:p-5 flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-action-400">
              Prévisualisation individualisée (Personnalisation de masse)
            </span>
            <h3 className="text-lg font-black">{programTitle || 'Programme sans titre'}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-military-800 hover:bg-military-700 flex items-center justify-center text-white"
            aria-label="Fermer"
          >
            <span className="material-icons text-lg">close</span>
          </button>
        </div>

        {/* Sélecteur militaire + Simulateur Bilan de Forme */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-xs font-bold text-military-900">
              Militaire ou profil type
              <select
                value={selectedUser.nid}
                onChange={(e) => setSelectedNid(e.target.value)}
                className="mt-1 w-full p-2.5 rounded-xl border border-gray-300 bg-white text-xs font-black"
              >
                {soldiers.length > 0 && (
                  <optgroup label={`Effectif de la base (${soldiers.length})`}>
                    {soldiers.map((s) => (
                      <option key={s.nid} value={s.nid}>
                        {s.name} — {s.unit || s.jobType}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Profils types de validation">
                  {ARCHETYPES.map((a) => (
                    <option key={a.nid} value={a.nid}>
                      {a.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>

            <div className="flex flex-col justify-between">
              <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
                <span className="px-2.5 py-1 rounded-lg bg-white border border-gray-200">
                  VMA :{' '}
                  <strong className={result.vmaKmH ? 'text-emerald-700' : 'text-red-600'}>
                    {result.vmaKmH ? `${result.vmaKmH} km/h` : 'ABSENTE'}
                  </strong>
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-white border border-gray-200">
                  DC 1RM :{' '}
                  <strong>{result.rmUpperKg ? `${result.rmUpperKg} kg` : 'Absent'}</strong>
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-white border border-gray-200">
                  Squat 1RM :{' '}
                  <strong>{result.rmLowerKg ? `${result.rmLowerKg} kg` : 'Absent'}</strong>
                </span>
              </div>
              <label className="mt-2 inline-flex items-center gap-2 text-xs font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={simulateDaily}
                  onChange={(e) => setSimulateDaily(e.target.checked)}
                  className="accent-action-500"
                />
                Simuler un bilan de forme quotidien (fatigue, sommeil, douleur)
              </label>
            </div>
          </div>

          {simulateDaily && (
            <div className="p-3 rounded-2xl bg-white border border-amber-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <label className="font-bold">
                Fatigue ({fatigue}/10)
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={fatigue}
                  onChange={(e) => setFatigue(parseInt(e.target.value, 10))}
                  className="w-full accent-action-500"
                />
              </label>
              <label className="font-bold">
                Sommeil ({sleep}/10)
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={sleep}
                  onChange={(e) => setSleep(parseInt(e.target.value, 10))}
                  className="w-full accent-action-500"
                />
              </label>
              <label className="font-bold">
                Douleur ({painLevel}/10)
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={painLevel}
                  onChange={(e) => setPainLevel(parseInt(e.target.value, 10))}
                  className="w-full accent-red-500"
                />
              </label>
              <label className="font-bold">
                Zone douloureuse
                <select
                  value={painZone}
                  onChange={(e) => setPainZone(e.target.value)}
                  className="mt-1 w-full p-1.5 rounded-lg border text-xs"
                >
                  <option value="">Aucune</option>
                  <option value="Épaule">Épaule</option>
                  <option value="Genou">Genou</option>
                  <option value="Lombaires">Bas du dos / Lombaires</option>
                  <option value="Cheville">Cheville</option>
                  <option value="Cervicales">Cervicales</option>
                </select>
              </label>
            </div>
          )}

          {/* Alerte globale références manquantes */}
          {result.missingReferences.length > 0 && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-2">
              <span className="material-icons text-red-600 text-base">warning</span>
              <div>
                <div className="font-black uppercase text-[11px]">
                  Références manquantes — Aucune valeur inventée
                </div>
                <ul className="list-disc pl-4 mt-1 space-y-0.5">
                  {result.missingReferences.map((kind) => (
                    <li key={kind}>{MISSING_LABELS[kind]}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Séances individualisées */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {result.sessions.map((sess) => (
            <div key={sess.sessionId} className="rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-2.5 bg-military-900 text-white flex items-center justify-between">
                <div className="font-black text-sm">
                  S{sess.weekNumber} — {sess.title}
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-military-800 text-action-400">
                  Zone {result.dailyFormZone || 'GREEN'}
                </span>
              </div>
              <div className="p-3.5 space-y-3">
                {sess.blocks.map((blk) => (
                  <div key={blk.block.id} className="space-y-2">
                    <div className="text-[11px] font-black uppercase text-military-700 border-b border-gray-100 pb-1">
                      {blk.block.title}{' '}
                      {blk.block.rounds && blk.block.rounds > 1 ? `(${blk.block.rounds} tours)` : ''}
                    </div>
                    {blk.exercises.map((exRes) => {
                      const traceKey = `${sess.sessionId}_${exRes.exercise.id}`;
                      const showTrace = expandedTraceId === traceKey;
                      return (
                        <div
                          key={exRes.exercise.id}
                          className={`p-2.5 rounded-xl border text-xs ${
                            exRes.missingReference
                              ? 'bg-amber-50 border-amber-300'
                              : exRes.substitutedFrom
                              ? 'bg-purple-50 border-purple-200'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <span className="font-black text-military-900">
                                {exRes.exercise.name}
                              </span>
                              {exRes.substitutedFrom && (
                                <span className="ml-2 px-2 py-0.5 rounded bg-purple-700 text-white text-[10px] font-black">
                                  Substitué (remplace {exRes.substitutedFrom})
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-military-900 bg-white px-2.5 py-1 rounded-lg border border-gray-200">
                                {exRes.displayPrescription}
                              </span>
                              {exRes.traces.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setExpandedTraceId(showTrace ? null : traceKey)}
                                  className="text-[10px] font-black text-blue-700 underline"
                                >
                                  {showTrace ? 'Masquer calcul' : 'Voir formule'}
                                </button>
                              )}
                            </div>
                          </div>

                          {exRes.warning && (
                            <div className="mt-1.5 text-[11px] font-bold text-amber-900 flex items-center gap-1">
                              <span className="material-icons text-xs">error_outline</span>
                              {exRes.warning}
                            </div>
                          )}

                          {showTrace && (
                            <div className="mt-2 p-2.5 rounded-lg bg-white border border-gray-200 text-[11px] font-mono space-y-1.5">
                              {exRes.traces.map((tr, tIdx) => (
                                <div key={tIdx} className="border-b last:border-b-0 border-gray-100 pb-1">
                                  <div>
                                    <strong>{tr.metric} — {tr.formulaName}</strong>
                                  </div>
                                  <div>Réf. : {tr.scientificReference}</div>
                                  <div>Entrées : {JSON.stringify(tr.inputs)}</div>
                                  {tr.note && <div className="text-emerald-700">{tr.note}</div>}
                                </div>
                              ))}
                              {exRes.boundsClamped && (
                                <div className="text-emerald-700 font-bold">
                                  Bornes moniteur appliquées (delta limité dans le cadre autorisé).
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SoldierPreviewModal;
