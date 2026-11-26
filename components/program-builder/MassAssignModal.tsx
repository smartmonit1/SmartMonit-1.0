import React, { useMemo, useState } from 'react';
import {
  ExerciseLibraryItem,
  JobType,
  Program,
  ProgramCycle,
  ProgramStatus,
  UserProfile
} from '../../types';
import { MILITARY_UNITS } from '../../utils/bases';
import { getFormulaConfig, individualizeProgramForUser } from '../../utils/calculationEngine';
import { db } from '../../services/mockDatabase';

export interface MassAssignPayload {
  mode: 'SINGLE' | 'GROUP' | 'UNIT' | 'JOB_PROFILE';
  selectedUserIds: string[];
  assignedUnit?: string;
  targetJobProfile?: JobType;
  startDate: string;
  recurrence: 'ONCE' | 'WEEKLY_CYCLE';
  editPolicy: 'APPLY_NOW' | 'FUTURE_SESSIONS_ONLY';
}

interface MassAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  programTitle: string;
  isExistingProgram: boolean;
  structure: ProgramCycle[];
  soldiers: UserProfile[];
  exerciseLibrary: ExerciseLibraryItem[];
  monitor: UserProfile;
  initialSelectedIds?: string[];
  initialUnit?: string;
  onConfirm: (payload: MassAssignPayload) => void;
  onPreviewSoldier?: (soldierId: string) => void;
}

const MassAssignModal: React.FC<MassAssignModalProps> = ({
  isOpen,
  onClose,
  programTitle,
  isExistingProgram,
  structure,
  soldiers,
  exerciseLibrary,
  monitor,
  initialSelectedIds = [],
  initialUnit = '',
  onConfirm,
  onPreviewSoldier
}) => {
  const [mode, setMode] = useState<MassAssignPayload['mode']>(
    initialUnit ? 'UNIT' : initialSelectedIds.length > 1 ? 'GROUP' : 'GROUP'
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [selectedUnit, setSelectedUnit] = useState<string>(initialUnit || MILITARY_UNITS[0]);
  const [selectedJob, setSelectedJob] = useState<JobType>(JobType.FUSCO);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [recurrence, setRecurrence] = useState<MassAssignPayload['recurrence']>('ONCE');
  const [editPolicy, setEditPolicy] = useState<MassAssignPayload['editPolicy']>(
    'FUTURE_SESSIONS_ONLY'
  );
  const [notifiedIds, setNotifiedIds] = useState<string[]>([]);
  const [quickRefEdit, setQuickRefEdit] = useState<Record<string, { vma?: string; bench?: string; squat?: string }>>({});
  const [refreshTick, setRefreshTick] = useState(0);

  const effectiveTargets = useMemo(() => {
    void refreshTick;
    if (mode === 'UNIT') return soldiers.filter((s) => s.unit === selectedUnit);
    if (mode === 'JOB_PROFILE') return soldiers.filter((s) => s.jobType === selectedJob);
    return soldiers.filter((s) => selectedIds.includes(s.nid));
  }, [mode, soldiers, selectedUnit, selectedJob, selectedIds, refreshTick]);

  // Diagnostic automatique des militaires sélectionnés sans 1RM ou sans VMA
  const diagnostics = useMemo(() => {
    const cfg = getFormulaConfig();
    const pseudoProgram: Program = {
      id: 'diag_prog',
      userId: '',
      title: programTitle || 'Programme EPMS',
      goal: '',
      status: ProgramStatus.VALIDATED,
      startDate,
      durationWeeks: Math.max(1, structure.reduce((a, c) => a + c.weeks.length, 0)),
      sessionsPerWeek: 3,
      sessions: [],
      structure
    };
    return effectiveTargets.map((soldier) => {
      const ind = individualizeProgramForUser(pseudoProgram, soldier, undefined, cfg);
      return {
        soldier,
        missingSummary: ind.warnings.length > 0 ? ind.warnings : ind.missingReferences,
        hasMissing: ind.missingReferences.length > 0,
        vmaKmH: ind.vmaKmH
      };
    });
  }, [effectiveTargets, structure, programTitle, startDate]);

  const missingCount = diagnostics.filter((d) => d.hasMissing).length;

  const filteredSoldiers = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return soldiers;
    return soldiers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.unit || '').toLowerCase().includes(q) ||
        (s.jobType || '').toLowerCase().includes(q)
    );
  }, [soldiers, search]);

  const toggleId = (id: string) => {
    if (mode === 'SINGLE') {
      setSelectedIds([id]);
    } else {
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
    }
  };

  const handlePlanTestNotification = (soldier: UserProfile) => {
    db.addNotification({
      id: `notif_test_${Date.now()}_${soldier.nid}`,
      targetNids: [soldier.nid],
      title: 'Test EPMS de référence à planifier',
      message: `Votre moniteur ${monitor.name} vous affecte au programme « ${programTitle || 'Programme EPMS'} ». Merci de réaliser votre évaluation VMA / 1RM au plateau sportif pour activer le calcul automatique de vos charges et allures.`,
      timestamp: Date.now(),
      category: 'PROGRAM',
      read: false,
      type: 'warning'
    });
    setNotifiedIds((prev) => [...prev, soldier.nid]);
  };

  const handleSaveQuickRef = (soldier: UserProfile) => {
    const draft = quickRefEdit[soldier.nid];
    if (!draft) return;
    const updated: UserProfile = {
      ...soldier,
      tests: {
        ...soldier.tests,
        calculatedVMA: draft.vma ? parseFloat(draft.vma) : soldier.tests?.calculatedVMA,
        benchPress1RM: draft.bench ? parseFloat(draft.bench) : soldier.tests?.benchPress1RM,
        squat1RM: draft.squat ? parseFloat(draft.squat) : soldier.tests?.squat1RM
      }
    };
    db.updateUser(updated);
    setQuickRefEdit((prev) => {
      const copy = { ...prev };
      delete copy[soldier.nid];
      return copy;
    });
    setRefreshTick((t) => t + 1);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-military-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Affectation et personnalisation de masse"
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-military-200">
        <div className="bg-military-900 text-white p-4 sm:p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-action-400">
              Personnalisation de masse — Un programme directeur, N versions calculées
            </span>
            <h3 className="text-lg font-black">{programTitle || 'Programme EPMS'}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-military-800 hover:bg-military-700 flex items-center justify-center"
            aria-label="Fermer"
          >
            <span className="material-icons text-lg">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Choix du mode d'affectation */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'GROUP', label: 'Groupe / Sélection', icon: 'groups' },
              { id: 'SINGLE', label: 'Militaire unique', icon: 'person' },
              { id: 'UNIT', label: 'Escadron / Unité', icon: 'military_tech' },
              { id: 'JOB_PROFILE', label: 'Profil Métier', icon: 'work' }
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id as any)}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  mode === m.id
                    ? 'border-action-500 bg-military-900 text-action-400'
                    : 'border-gray-200 bg-gray-50 text-military-900 hover:border-military-400'
                }`}
              >
                <span className="material-icons text-base">{m.icon}</span>
                <div className="text-xs font-black mt-1">{m.label}</div>
              </button>
            ))}
          </div>

          {/* Cible selon mode */}
          {(mode === 'GROUP' || mode === 'SINGLE') && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher par nom, unité, métier..."
                  className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border border-gray-300 text-xs font-medium"
                />
                {mode === 'GROUP' && (
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedIds(filteredSoldiers.map((s) => s.nid))}
                      className="px-3 py-1.5 rounded-lg bg-military-100 text-military-900 text-[11px] font-black"
                    >
                      Tout sélectionner ({filteredSoldiers.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedIds([])}
                      className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-[11px] font-bold"
                    >
                      Vider
                    </button>
                  </div>
                )}
              </div>

              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-2xl divide-y divide-gray-100">
                {filteredSoldiers.map((s) => {
                  const checked = selectedIds.includes(s.nid);
                  return (
                    <label
                      key={s.nid}
                      className={`flex items-center justify-between px-3 py-2 text-xs cursor-pointer hover:bg-gray-50 ${
                        checked ? 'bg-action-50/60' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type={mode === 'SINGLE' ? 'radio' : 'checkbox'}
                          checked={checked}
                          onChange={() => toggleId(s.nid)}
                          className="accent-action-500"
                        />
                        <div>
                          <span className="font-black text-military-900">{s.name}</span>
                          <span className="ml-2 text-[11px] text-gray-500">
                            {s.unit || 'Unité NC'} • {s.jobType}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold">
                        <span
                          className={`px-1.5 py-0.5 rounded ${
                            s.tests?.calculatedVMA ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'
                          }`}
                        >
                          VMA: {s.tests?.calculatedVMA ? `${s.tests.calculatedVMA}` : '—'}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded ${
                            s.tests?.benchPress1RM || s.tests?.squat1RM
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          1RM: {s.tests?.benchPress1RM || s.tests?.squat1RM ? 'OK' : 'Absent'}
                        </span>
                      </div>
                    </label>
                  );
                })}
                {filteredSoldiers.length === 0 && (
                  <div className="p-4 text-center text-xs text-gray-400">
                    Aucun militaire trouvé dans votre base.
                  </div>
                )}
              </div>
            </div>
          )}

          {mode === 'UNIT' && (
            <label className="block text-xs font-bold">
              Escadron / Unité cible
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="mt-1 w-full p-2.5 rounded-xl border border-gray-300 text-xs font-black"
              >
                {MILITARY_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </label>
          )}

          {mode === 'JOB_PROFILE' && (
            <label className="block text-xs font-bold">
              Profil métier cible
              <select
                value={selectedJob}
                onChange={(e) => setSelectedJob(e.target.value as JobType)}
                className="mt-1 w-full p-2.5 rounded-xl border border-gray-300 text-xs font-black"
              >
                {Object.values(JobType).map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </select>
            </label>
          )}

          {/* Planification & Politique de modification */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-gray-50 border border-gray-200">
            <label className="text-xs font-bold">
              Date de début
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 w-full p-2 rounded-xl border border-gray-300 bg-white text-xs font-bold"
              />
            </label>
            <label className="text-xs font-bold">
              Récurrence
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as any)}
                className="mt-1 w-full p-2 rounded-xl border border-gray-300 bg-white text-xs font-bold"
              >
                <option value="ONCE">Cycle unique (selon durée)</option>
                <option value="WEEKLY_CYCLE">Répétition cyclique automatique</option>
              </select>
            </label>
            {isExistingProgram && (
              <label className="text-xs font-bold">
                Politique de mise à jour
                <select
                  value={editPolicy}
                  onChange={(e) => setEditPolicy(e.target.value as any)}
                  className="mt-1 w-full p-2 rounded-xl border border-gray-300 bg-white text-xs font-bold"
                >
                  <option value="FUTURE_SESSIONS_ONLY">Modifier uniquement les séances futures</option>
                  <option value="APPLY_NOW">Appliquer dès maintenant (toutes séances)</option>
                </select>
              </label>
            )}
          </div>

          {/* Diagnostic de masse : Militaires sans 1RM / VMA */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase text-military-900">
                Vérification biométrique ({effectiveTargets.length} militaire
                {effectiveTargets.length > 1 ? 's' : ''} ciblé{effectiveTargets.length > 1 ? 's' : ''})
              </h4>
              {missingCount > 0 ? (
                <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black">
                  ⚠ {missingCount} profil{missingCount > 1 ? 's' : ''} avec référence manquante
                </span>
              ) : (
                effectiveTargets.length > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                    ✓ 100% des charges & allures calculables
                  </span>
                )
              )}
            </div>

            {missingCount > 0 && (
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                <p className="text-[11px] font-bold text-amber-950">
                  Aucune valeur n'est jamais inventée. Saisissez les références manquantes ci-dessous ou
                  planifiez un test EPMS avant le démarrage :
                </p>
                {diagnostics
                  .filter((d) => d.hasMissing)
                  .map(({ soldier, missingSummary }) => {
                    const draft = quickRefEdit[soldier.nid] || {};
                    const isNotified = notifiedIds.includes(soldier.nid);
                    return (
                      <div
                        key={soldier.nid}
                        className="p-2.5 rounded-xl bg-white border border-amber-200 text-xs space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="font-black text-military-900">{soldier.name}</span>
                            <div className="text-[10px] text-amber-800">{missingSummary.join(' • ')}</div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {onPreviewSoldier && (
                              <button
                                type="button"
                                onClick={() => onPreviewSoldier(soldier.nid)}
                                className="px-2 py-1 rounded-lg border border-gray-300 text-[10px] font-bold"
                              >
                                Prévisualiser
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={isNotified}
                              onClick={() => handlePlanTestNotification(soldier)}
                              className="px-2.5 py-1 rounded-lg bg-military-900 text-action-400 text-[10px] font-black disabled:opacity-50"
                            >
                              {isNotified ? '✓ Test planifié' : 'Planifier test EPMS'}
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                          <input
                            type="number"
                            step={0.1}
                            placeholder="VMA (km/h)"
                            value={draft.vma || ''}
                            onChange={(e) =>
                              setQuickRefEdit((prev) => ({
                                ...prev,
                                [soldier.nid]: { ...draft, vma: e.target.value }
                              }))
                            }
                            className="px-2 py-1 rounded-lg border text-[11px]"
                          />
                          <input
                            type="number"
                            placeholder="1RM DC (kg)"
                            value={draft.bench || ''}
                            onChange={(e) =>
                              setQuickRefEdit((prev) => ({
                                ...prev,
                                [soldier.nid]: { ...draft, bench: e.target.value }
                              }))
                            }
                            className="px-2 py-1 rounded-lg border text-[11px]"
                          />
                          <input
                            type="number"
                            placeholder="1RM Squat (kg)"
                            value={draft.squat || ''}
                            onChange={(e) =>
                              setQuickRefEdit((prev) => ({
                                ...prev,
                                [soldier.nid]: { ...draft, squat: e.target.value }
                              }))
                            }
                            className="px-2 py-1 rounded-lg border text-[11px]"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveQuickRef(soldier)}
                            className="px-2 py-1 rounded-lg bg-emerald-600 text-white font-black text-[10px] uppercase"
                          >
                            Enregistrer
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold text-gray-600">
            {effectiveTargets.length} militaire{effectiveTargets.length > 1 ? 's' : ''} recevront leur
            version individualisée.
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-700"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() =>
                onConfirm({
                  mode,
                  selectedUserIds: effectiveTargets.map((u) => u.nid),
                  assignedUnit: mode === 'UNIT' ? selectedUnit : undefined,
                  targetJobProfile: mode === 'JOB_PROFILE' ? selectedJob : undefined,
                  startDate,
                  recurrence,
                  editPolicy
                })
              }
              className="px-5 py-2.5 rounded-xl bg-action-500 text-military-950 font-black text-xs uppercase shadow hover:bg-action-400"
            >
              Valider & Affecter ({effectiveTargets.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MassAssignModal;
