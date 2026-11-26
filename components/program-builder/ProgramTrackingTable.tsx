import React, { useMemo } from 'react';
import { ExerciseLibraryItem, Program, UserProfile } from '../../types';
import { getFormulaConfig, individualizeProgramForUser } from '../../utils/calculationEngine';

interface ProgramTrackingTableProps {
  program: Program;
  soldiers: UserProfile[];
  exerciseLibrary: ExerciseLibraryItem[];
  onInspectSoldier: (soldierId: string) => void;
  onAssignMore?: () => void;
}

const ProgramTrackingTable: React.FC<ProgramTrackingTableProps> = ({
  program,
  soldiers,
  exerciseLibrary,
  onInspectSoldier,
  onAssignMore
}) => {
  const assignedSoldiers = useMemo(() => {
    const ids = new Set<string>(program.assignedUserIds || []);
    if (program.userId) ids.add(program.userId);
    return soldiers.filter((s) => {
      if (ids.has(s.nid)) return true;
      if (program.assignedUnit && s.unit === program.assignedUnit) return true;
      return false;
    });
  }, [program, soldiers]);

  const rows = useMemo(() => {
    const totalSessions = Math.max(
      1,
      (program.structure || []).reduce(
        (acc, c) => acc + c.weeks.reduce((wa, w) => wa + w.sessions.length, 0),
        0
      ) || program.sessions?.length || 1
    );

    const cfg = getFormulaConfig();
    return assignedSoldiers.map((soldier) => {
      const latestDaily =
        soldier.dailyForms && soldier.dailyForms.length > 0
          ? soldier.dailyForms[soldier.dailyForms.length - 1]
          : undefined;
      const ind = individualizeProgramForUser(program, soldier, latestDaily, cfg);
      const completed = (soldier.sessionLogs || []).filter(
        (h) => h.programId === program.id || h.title?.includes(program.title)
      ).length;
      const pct = Math.min(100, Math.round((completed / totalSessions) * 100));
      const adaptationsCount = ind.sessions.reduce(
        (acc, s) =>
          acc +
          s.adaptationsApplied.length +
          s.blocks.reduce(
            (ba, b) => ba + b.exercises.filter((e) => Boolean(e.substitutedFrom || e.appliedIntensityDeltaPct !== 0)).length,
            0
          ),
        0
      );
      return {
        soldier,
        completed,
        totalSessions,
        pct,
        vmaKmH: ind.vmaKmH,
        missingCount: ind.missingReferences.length,
        adaptationsCount,
        zone: ind.dailyFormZone || 'GREEN'
      };
    });
  }, [assignedSoldiers, program, exerciseLibrary]);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2 bg-gray-50">
        <div>
          <h4 className="font-black text-sm text-military-900">
            Suivi individuel & adaptations ({rows.length} militaire{rows.length > 1 ? 's' : ''})
          </h4>
          <p className="text-[11px] text-gray-500">
            Consultez la version calculée (kg, allures, substitutions) de chaque militaire affecté.
          </p>
        </div>
        {onAssignMore && (
          <button
            type="button"
            onClick={onAssignMore}
            className="px-3 py-2 rounded-xl bg-military-900 text-action-400 font-black text-xs uppercase hover:bg-military-800"
          >
            + Gérer les affectations
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="p-8 text-center text-xs text-gray-500">
          Aucun militaire encore affecté à ce programme. Cliquez sur « Affecter » pour diffuser ce
          programme à un militaire, un groupe ou un escadron.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-500 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2.5">Militaire</th>
                <th className="px-4 py-2.5">Références</th>
                <th className="px-4 py-2.5">Réalisation</th>
                <th className="px-4 py-2.5">Forme / Adaptations</th>
                <th className="px-4 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.soldier.nid} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-black text-military-900">{r.soldier.name}</div>
                    <div className="text-[10px] text-gray-500">
                      {r.soldier.unit || 'Unité NC'} • {r.soldier.jobType}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {r.missingCount > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black">
                        ⚠ {r.missingCount} réf. absente{r.missingCount > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                        ✓ VMA {r.vmaKmH ?? '—'} • 1RM OK
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 rounded-full bg-gray-200 overflow-hidden">
                        <div className="h-full bg-action-500" style={{ width: `${r.pct}%` }} />
                      </div>
                      <span className="font-black text-[11px]">
                        {r.completed}/{r.totalSessions} ({r.pct}%)
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        r.zone === 'GREEN'
                          ? 'bg-emerald-100 text-emerald-800'
                          : r.zone === 'ORANGE'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      Zone {r.zone}
                    </span>
                    {r.adaptationsCount > 0 && (
                      <span className="ml-1.5 text-[10px] font-bold text-purple-700">
                        {r.adaptationsCount} adapt.
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onInspectSoldier(r.soldier.nid)}
                      className="px-3 py-1.5 rounded-lg bg-military-900 text-action-400 font-black text-[10px] uppercase hover:bg-military-800"
                    >
                      Voir sa version
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ProgramTrackingTable;
