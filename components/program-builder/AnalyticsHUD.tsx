import React, { useMemo } from 'react';
import {
  Equipment,
  ExerciseLibraryItem,
  JobType,
  PedagogicalAlert,
  ProgramCycle,
  ProgramSessionBuilder
} from '../../types';
import {
  analyzeProgramPedagogy,
  checkSessionEquipmentCompatibility,
  computeProgramAnalytics
} from '../../utils/pedagogicalRules';
import BodyMuscleMap from './BodyMuscleMap';

interface AnalyticsHUDProps {
  structure: ProgramCycle[];
  activeSession?: ProgramSessionBuilder;
  exerciseLibrary: ExerciseLibraryItem[];
  targetJobProfiles?: JobType[];
  availableEquipment?: Equipment[];
  dark?: boolean;
  onQuickFixAlert?: (alert: PedagogicalAlert) => void;
  onSubstituteExercise?: (exerciseId: string, substitute: ExerciseLibraryItem) => void;
}

const AnalyticsHUD: React.FC<AnalyticsHUDProps> = ({
  structure,
  activeSession,
  exerciseLibrary,
  targetJobProfiles,
  availableEquipment = [],
  dark = false,
  onQuickFixAlert,
  onSubstituteExercise
}) => {
  const analytics = useMemo(
    () => computeProgramAnalytics(structure, exerciseLibrary),
    [structure, exerciseLibrary]
  );

  const alerts = useMemo(
    () =>
      analyzeProgramPedagogy({
        structure,
        exerciseLibrary,
        targetJobProfiles,
        availableEquipment
      }),
    [structure, exerciseLibrary, targetJobProfiles, availableEquipment]
  );

  const equipmentCheck = useMemo(() => {
    if (!activeSession || availableEquipment.length === 0) return null;
    return checkSessionEquipmentCompatibility(activeSession, availableEquipment, exerciseLibrary);
  }, [activeSession, availableEquipment, exerciseLibrary]);

  const maxWeekSets = Math.max(1, ...analytics.weeklySeries.map((w) => w.totalSets));

  const cardBg = dark
    ? 'bg-military-900 border-military-700 text-white'
    : 'bg-white border-gray-200 text-military-900';

  return (
    <div className="space-y-4">
      {/* KPIs temps réel */}
      <div className={`p-3.5 rounded-2xl border ${cardBg}`}>
        <div className="flex items-center justify-between mb-2.5">
          <h4 className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
            <span className="material-icons text-sm text-action-500">insights</span>
            Analytique temps réel
          </h4>
          <span className="text-[10px] font-bold opacity-70">{analytics.totalSessions} séances</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className={`p-2.5 rounded-xl ${dark ? 'bg-military-800' : 'bg-gray-50'}`}>
            <div className="text-[9px] font-bold uppercase opacity-70">Durée moy. / séance</div>
            <div className="text-lg font-black text-action-500">{analytics.avgSessionMinutes} min</div>
          </div>
          <div className={`p-2.5 rounded-xl ${dark ? 'bg-military-800' : 'bg-gray-50'}`}>
            <div className="text-[9px] font-bold uppercase opacity-70">Charge sRPE</div>
            <div className="text-lg font-black">{analytics.trainingLoadSRPE} UA</div>
          </div>
          <div className={`p-2.5 rounded-xl ${dark ? 'bg-military-800' : 'bg-gray-50'}`}>
            <div className="text-[9px] font-bold uppercase opacity-70">Tonnage estimé</div>
            <div className="text-base font-black">
              {(analytics.estimatedTonnageKg / 1000).toFixed(1)} t
            </div>
          </div>
          <div className={`p-2.5 rounded-xl ${dark ? 'bg-military-800' : 'bg-gray-50'}`}>
            <div className="text-[9px] font-bold uppercase opacity-70">Volume course</div>
            <div className="text-base font-black">{analytics.totalRunningKm.toFixed(1)} km</div>
          </div>
        </div>

        {/* Répartition par filière */}
        <div className="mt-3">
          <div className="text-[10px] font-bold uppercase opacity-70 mb-1">Répartition par filière</div>
          <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-gray-200">
            <div
              style={{ width: `${analytics.energyDistribution.force}%` }}
              className="bg-military-900"
              title={`Force ${analytics.energyDistribution.force}%`}
            />
            <div
              style={{ width: `${analytics.energyDistribution.aerobie}%` }}
              className="bg-emerald-500"
              title={`Aérobie ${analytics.energyDistribution.aerobie}%`}
            />
            <div
              style={{ width: `${analytics.energyDistribution.anaerobie}%` }}
              className="bg-orange-500"
              title={`Anaérobie ${analytics.energyDistribution.anaerobie}%`}
            />
            <div
              style={{ width: `${analytics.energyDistribution.mobilite}%` }}
              className="bg-cyan-500"
              title={`Mobilité ${analytics.energyDistribution.mobilite}%`}
            />
          </div>
          <div className="mt-1.5 flex flex-wrap gap-2 text-[9px] font-bold">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-military-900" /> Force {analytics.energyDistribution.force}%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Aérobie {analytics.energyDistribution.aerobie}%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-500" /> Anaérobie {analytics.energyDistribution.anaerobie}%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-cyan-500" /> Mobilité {analytics.energyDistribution.mobilite}%
            </span>
          </div>
        </div>
      </div>

      {/* Graphique charge / volume par semaine */}
      {analytics.weeklySeries.length > 0 && (
        <div className={`p-3.5 rounded-2xl border ${cardBg}`}>
          <div className="text-[11px] font-black uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <span className="material-icons text-sm text-action-500">bar_chart</span>
            Progression hebdomadaire (séries & intensité)
          </div>
          <div className="flex items-end gap-2 h-28 pt-2">
            {analytics.weeklySeries.map((wk) => {
              const pct = Math.max(12, Math.round((wk.totalSets / maxWeekSets) * 100));
              return (
                <div key={wk.weekLabel} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <span className="text-[9px] font-black opacity-75">{wk.totalSets}s</span>
                  <div
                    style={{ height: `${pct}%` }}
                    className={`w-full rounded-t-lg transition-all ${
                      wk.isDeload
                        ? 'bg-cyan-500'
                        : wk.avgIntensityScore >= 82
                        ? 'bg-orange-500'
                        : 'bg-action-500'
                    }`}
                    title={`${wk.weekLabel}: ${wk.totalSets} séries • Intensité moy. ${wk.avgIntensityScore}% • ${wk.runningKm} km`}
                  />
                  <span className="text-[9px] font-black uppercase">
                    {wk.weekLabel}
                    {wk.isDeload ? ' ↓' : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Carte corporelle SVG */}
      <div className={`p-3.5 rounded-2xl border ${cardBg}`}>
        <div className="text-[11px] font-black uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <span className="material-icons text-sm text-action-500">accessibility_new</span>
          Muscles sollicités
        </div>
        <BodyMuscleMap muscleHeat={analytics.muscleHeat} dark={dark} />
      </div>

      {/* Vérificateur compatibilité matériel de la séance active */}
      {equipmentCheck && !equipmentCheck.compatible && (
        <div className="p-3.5 rounded-2xl border border-amber-300 bg-amber-50 text-amber-950 space-y-2">
          <div className="text-[11px] font-black uppercase flex items-center gap-1.5">
            <span className="material-icons text-sm text-amber-600">build_circle</span>
            Matériel manquant dans l'installation ({equipmentCheck.missingItems.length})
          </div>
          {equipmentCheck.missingItems.map((item) => (
            <div key={item.exerciseId} className="p-2 rounded-xl bg-white border border-amber-200 text-xs">
              <div className="font-bold">
                {item.exerciseName}{' '}
                <span className="text-amber-700 font-black">({item.requiredEquipment})</span>
              </div>
              {item.suggestedSubstitutes.length > 0 && onSubstituteExercise && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {item.suggestedSubstitutes.map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => onSubstituteExercise(item.exerciseId, sub)}
                      className="px-2 py-0.5 rounded-lg bg-military-900 text-action-400 text-[10px] font-black hover:bg-military-800"
                    >
                      Remplacer par {sub.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Alertes pédagogiques PIA 7.1.1 (non bloquantes) */}
      <div className={`p-3.5 rounded-2xl border ${cardBg}`}>
        <div className="flex items-center justify-between mb-2.5">
          <h4 className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
            <span className="material-icons text-sm text-action-500">shield</span>
            Contrôle doctrinal PIA 7.1.1
          </h4>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              alerts.length === 0
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-900'
            }`}
          >
            {alerts.length === 0 ? 'Conforme' : `${alerts.length} alerte${alerts.length > 1 ? 's' : ''}`}
          </span>
        </div>

        {alerts.length === 0 ? (
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-medium flex items-center gap-2">
            <span className="material-icons text-emerald-600 text-base">verified</span>
            Structure ternaire, progressivité, équilibre agonistes/antagonistes et récupération conformes PIA 7.1.1.
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((al) => (
              <div
                key={al.id}
                className={`p-2.5 rounded-xl border text-xs ${
                  al.severity === 'danger'
                    ? 'bg-red-50 border-red-200 text-red-950'
                    : al.severity === 'warning'
                    ? 'bg-amber-50 border-amber-200 text-amber-950'
                    : 'bg-blue-50 border-blue-200 text-blue-950'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-black text-[11px]">
                    [{al.code}] {al.title}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-snug">{al.message}</p>
                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[9px] font-black uppercase opacity-75">{al.ruleReference}</span>
                  {al.suggestedActionLabel && onQuickFixAlert && (
                    <button
                      type="button"
                      onClick={() => onQuickFixAlert(al)}
                      className="px-2 py-1 rounded-lg bg-military-900 text-action-400 text-[10px] font-black uppercase hover:bg-military-800"
                    >
                      {al.suggestedActionLabel}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsHUD;
