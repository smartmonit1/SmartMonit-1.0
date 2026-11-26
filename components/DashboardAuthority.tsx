import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  UserProfile,
  UserRole,
  ActiveSession,
  SportRegistryEntry,
  AuthorityScope
} from '../types';
import { db } from '../services/mockDatabase';
import { calculateVMA } from '../utils/biometrics';
import { getBaseName, getBaseCode } from '../utils/bases';
import { formatDateTimeFr } from '../utils/compliance';
import { CNIL_K_ANONYMITY_THRESHOLD } from '../utils/security';
import { useToast } from './ToastProvider';

interface DashboardAuthorityProps {
  user: UserProfile;
  onUserUpdated: (updated: UserProfile) => void;
}

const PIE_COLORS = ['#232d29', '#e1ad01', '#2563eb', '#059669'];

const DashboardAuthority: React.FC<DashboardAuthorityProps> = ({ user, onUserUpdated }) => {
  const { showToast } = useToast();
  const [scope, setScope] = useState<AuthorityScope>(user.authorityScope || 'BASE');
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<string>('ALL');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [registry, setRegistry] = useState<SportRegistryEntry[]>([]);
  const [nowMs, setNowMs] = useState(Date.now());

  // Postage Numérique (Section 4.4.2 & 4.10.2)
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [targetHandoverNid, setTargetHandoverNid] = useState('');

  useEffect(() => {
    const fetchStats = () => {
      const allUsers = db.getUsers().filter((u) => u.role === UserRole.USER);
      const scopedUsers = allUsers.filter((u) => {
        if (scope === 'AAE') return true;
        if (scope === 'BASE') return u.serviceId === user.serviceId;
        // UNIT
        return u.serviceId === user.serviceId && (!user.unit || u.unit === user.unit);
      });

      const finalUsers =
        selectedUnitFilter === 'ALL'
          ? scopedUsers
          : scopedUsers.filter((u) => u.unit === selectedUnitFilter);

      setUsers(finalUsers);

      const nids = new Set(finalUsers.map((u) => u.nid));
      setActiveSessions(db.getActiveSessions().filter((s) => nids.has(s.userId)));
      setRegistry(db.getSportRegistry().filter((r) => nids.has(r.userId)));
    };

    fetchStats();
    window.addEventListener('db_updated', fetchStats);
    const interval = setInterval(() => {
      setNowMs(Date.now());
      fetchStats();
    }, 5000);

    return () => {
      window.removeEventListener('db_updated', fetchStats);
      clearInterval(interval);
    };
  }, [user.serviceId, user.unit, scope, selectedUnitFilter]);

  const availableUnits = useMemo(() => {
    const all = db
      .getUsers()
      .filter((u) => u.role === UserRole.USER && (scope === 'AAE' || u.serviceId === user.serviceId))
      .map((u) => u.unit)
      .filter(Boolean) as string[];
    return Array.from(new Set(all));
  }, [scope, user.serviceId]);

  // --- INDICATEURS AGRÉGÉS & ANONYMISÉS (Section 4.7) ---
  const averageVMA = useMemo(() => {
    if (users.length === 0) return '-';
    const sum = users.reduce((acc, u) => acc + calculateVMA(u.tests), 0);
    return (sum / users.length).toFixed(1);
  }, [users]);

  const practiceRate = useMemo(() => {
    if (users.length === 0) return 0;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const regulars = users.filter((u) => {
      const recent = (u.sessionLogs || []).filter((l) => nowMs - new Date(l.date).getTime() <= sevenDaysMs);
      return recent.length >= 2;
    }).length;
    return Math.round((regulars / users.length) * 100);
  }, [users, nowMs]);

  const inaptitudeCount = users.filter((u) => u.tests.ccpmInaptitude).length;

  // Bilan forme collectif anonymisé (respecte consentement analytics + seuil CNIL k-anonymat >= 5)
  const collectiveWellness = useMemo(() => {
    const consentingUsers = users.filter((u) => u.rgpdConsent?.analyticsConsent !== false);
    const latestForms = consentingUsers
      .map((u) => (u.dailyForms.length > 0 ? u.dailyForms[u.dailyForms.length - 1] : null))
      .filter(Boolean);
    const kAnonymityMet = latestForms.length >= CNIL_K_ANONYMITY_THRESHOLD;
    if (!kAnonymityMet) {
      return { sleep: 0, fatigue: 0, stress: 0, count: latestForms.length, kAnonymityMet: false, orfaAlert: false };
    }
    const sleep = latestForms.reduce((a, f) => a + f!.sleepQuality, 0) / latestForms.length;
    const fatigue = latestForms.reduce((a, f) => a + f!.fatigueLevel, 0) / latestForms.length;
    const stress = latestForms.reduce((a, f) => a + f!.stressLevel, 0) / latestForms.length;
    return {
      sleep: parseFloat(sleep.toFixed(1)),
      fatigue: parseFloat(fatigue.toFixed(1)),
      stress: parseFloat(stress.toFixed(1)),
      count: latestForms.length,
      kAnonymityMet: true,
      orfaAlert: (fatigue >= 6 && stress >= 6) || sleep < 4.5
    };
  }, [users]);

  // Fréquentation par installation
  const facilityStats = useMemo(() => {
    const map = new Map<string, number>();
    registry.forEach((entry) => {
      const key = entry.infrastructureName || 'Autre';
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, sessions]) => ({ name: name.length > 18 ? name.slice(0, 18) + '…' : name, sessions }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 6);
  }, [registry]);

  // Répartition par profil métier
  const jobDistribution = useMemo(() => {
    const map = new Map<string, number>();
    users.forEach((u) => {
      const short = u.jobType.split('(')[0].trim();
      map.set(short, (map.get(short) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [users]);

  const exportSportRegistryCSV = () => {
    const bom = '\uFEFF';
    const rows = [
      '"REGISTRE SPORT UNITE NUMERIQUE (Directive 17615 — Statut En Service)"',
      `"Périmètre";"${scope === 'AAE' ? 'Toutes les structures' : getBaseName(user.serviceId)}";"Extrait le";"${new Date().toLocaleString('fr-FR')}"`,
      '',
      '"Statut";"Début";"Fin";"Durée (min)";"Identifiant";"Membre";"Équipe";"Lieu";"Type"'
    ];
    registry.forEach((r) => {
      rows.push(
        `"${r.status}";"${formatDateTimeFr(r.startTime)}";"${r.endTime ? formatDateTimeFr(r.endTime) : 'En cours'}";"${r.durationMinutes || '-'}";"${r.userId}";"${r.userName}";"${r.unit}";"${r.infrastructureName}";"${r.sessionType}"`
      );
    });
    const blob = new Blob([bom + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Registre_Sport_Unite_${getBaseCode(user.serviceId)}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    db.logAudit({
      actorNid: user.nid,
      actorName: user.name,
      actorRole: user.role,
      serviceId: user.serviceId,
      action: 'EXPORT_SPORT_REGISTRY',
      details: `Export CSV du Registre Sport Unité (périmètre: ${scope}, ${registry.length} entrées).`
    });
    showToast('Registre Sport Unité exporté en CSV.', 'success');
  };

  const handleHandover = (e: React.FormEvent) => {
    e.preventDefault();
    const res = db.performAuthorityHandover(user, targetHandoverNid.trim());
    if (!res.ok) {
      showToast(res.message, 'error');
      return;
    }
    db.logAudit({
      actorNid: user.nid,
      actorName: user.name,
      actorRole: user.role,
      serviceId: user.serviceId,
      action: 'AUTHORITY_HANDOVER',
      targetId: targetHandoverNid.trim(),
      details: `Transfert des droits Autorité vers l’identifiant ${targetHandoverNid.trim()}.`
    });
    showToast(res.message, 'success');
    setShowHandoverModal(false);
    // Met à jour la session courante (l'ancien titulaire repasse Utilisateur)
    const refreshed = db.getUsers().find((u) => u.nid === user.nid);
    if (refreshed) onUserUpdated(refreshed);
  };

  const formatElapsed = (startIso: string) => {
    const ms = new Date(startIso).getTime();
    if (isNaN(ms)) return '0 min';
    return `${Math.max(0, Math.floor((nowMs - ms) / 60000))} min`;
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s]">
      {/* En-tête de pilotage et sélecteur de périmètre */}
      <div className="command-dashboard-hero bg-military-900 text-white rounded-3xl p-6 shadow-lg flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-action-400">
            Espace autorité • Données agrégées et anonymisées
          </span>
          <h2 className="text-2xl font-black uppercase mt-1">
            Pilotage — {scope === 'AAE' ? 'Toutes les structures' : getBaseName(user.serviceId)}
          </h2>
          <p className="text-xs text-military-300 mt-1">
            Indicateurs collectifs anonymisés et suivi des activités de la structure.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-military-800 p-1 rounded-xl" role="group" aria-label="Périmètre du tableau de bord">
            {(
              [
                { id: 'UNIT', label: 'Équipe' },
                { id: 'BASE', label: 'Structure' },
                { id: 'AAE', label: 'Toutes les structures' }
              ] as { id: AuthorityScope; label: string }[]
            ).map((sc) => (
              <button
                key={sc.id}
                type="button"
                aria-pressed={scope === sc.id}
                onClick={() => {
                  setScope(sc.id);
                  setSelectedUnitFilter('ALL');
                }}
                className={`px-3.5 py-2 rounded-lg text-[11px] font-black uppercase transition-all ${
                  scope === sc.id ? 'bg-action-500 text-military-950' : 'text-military-300 hover:text-white'
                }`}
              >
                {sc.label}
              </button>
            ))}
          </div>

          {availableUnits.length > 0 && scope !== 'UNIT' && (
            <select
              value={selectedUnitFilter}
              onChange={(e) => setSelectedUnitFilter(e.target.value)}
              className="bg-military-800 border border-military-700 text-white text-xs font-bold px-3 py-2 rounded-xl outline-none"
            >
              <option value="ALL">Toutes les équipes</option>
              {availableUnits.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          )}

          <button
            onClick={() => setShowHandoverModal(true)}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[11px] font-black uppercase flex items-center gap-1.5"
            title="Préparer la transmission des droits à un successeur"
          >
            <span className="material-icons text-sm text-action-400">swap_horiz</span> Passation
          </button>
        </div>
      </div>

      {/* KPIs Agrégés */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-military-100 shadow-sm">
          <div className="text-[10px] font-black uppercase text-gray-400">Effectif suivi</div>
          <div className="text-3xl font-black text-military-900 mt-1">{users.length}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-military-100 shadow-sm">
          <div className="text-[10px] font-black uppercase text-gray-400">En séance (Live)</div>
          <div className="text-3xl font-black text-action-600 mt-1 flex items-center gap-1.5">
            {activeSessions.length}
            {activeSessions.length > 0 && <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />}
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-military-100 shadow-sm">
          <div className="text-[10px] font-black uppercase text-gray-400">Pratique hebdomadaire</div>
          <div className="text-3xl font-black text-emerald-700 mt-1">{practiceRate}%</div>
          <span className="text-[10px] text-gray-400 font-semibold">≥ 2 séances / 7j</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-military-100 shadow-sm">
          <div className="text-[10px] font-black uppercase text-gray-400">VMA Moyenne</div>
          <div className="text-3xl font-black text-military-900 mt-1">
            {averageVMA} <span className="text-xs text-gray-400">km/h</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-military-100 shadow-sm col-span-2 lg:col-span-1">
          <div className="text-[10px] font-black uppercase text-gray-400">Accompagnement à prévoir</div>
          <div className="text-3xl font-black text-red-600 mt-1">{inaptitudeCount}</div>
        </div>
      </div>

      {/* Indicateurs collectifs masqués si le groupe est trop petit. */}
      <div className="bg-white rounded-3xl p-6 border border-military-100 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <h3 className="text-sm font-black text-military-900 uppercase flex items-center gap-2">
            <span className="material-icons text-indigo-600 text-base">psychology</span>
            État de Forme & Charge Mentale Collectifs (Anonymisés — {collectiveWellness.count} bilans)
          </h3>
          {collectiveWellness.kAnonymityMet && collectiveWellness.orfaAlert && (
            <span className="bg-indigo-100 text-indigo-900 px-3 py-1 rounded-full text-[10px] font-black uppercase">
              Tendance collective : fatigue ou récupération à surveiller
            </span>
          )}
        </div>
        {!collectiveWellness.kAnonymityMet ? (
          <div className="p-5 rounded-2xl bg-military-50 border border-military-200 flex items-start gap-3">
            <span className="material-icons text-emerald-700 text-xl shrink-0">shield</span>
            <div className="text-xs text-military-800 leading-relaxed">
              <strong className="uppercase block mb-0.5">Protection CNIL — Seuil de k-anonymat ({CNIL_K_ANONYMITY_THRESHOLD} personnes minimum)</strong>
              Ce périmètre compte actuellement <strong>{collectiveWellness.count}</strong> bilan(s) forme consentant(s). Par précaution contre la ré-identification, les moyennes collectives de sommeil, fatigue et stress ne sont affichées qu'à partir de {CNIL_K_ANONYMITY_THRESHOLD} personnes. Élargissez le périmètre si nécessaire.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Qualité Sommeil Moy.', val: collectiveWellness.sleep, color: 'bg-blue-600', text: 'text-blue-700' },
              { label: 'Fatigue Collective', val: collectiveWellness.fatigue, color: 'bg-orange-500', text: 'text-orange-700' },
              { label: 'Stress Collectif', val: collectiveWellness.stress, color: 'bg-purple-600', text: 'text-purple-700' }
            ].map((m) => (
              <div key={m.label} className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-xs font-bold text-gray-600">{m.label}</span>
                  <span className={`text-xl font-black ${m.text}`}>{m.val}/10</span>
                </div>
                <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full ${m.color}`} style={{ width: `${(m.val / 10) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Graphiques Anonymisés */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-military-100 shadow-sm">
          <h3 className="text-sm font-black text-military-900 uppercase mb-4">
            Fréquentation des Installations (Nb séances)
          </h3>
          {facilityStats.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={facilityStats} margin={{ top: 5, right: 10, left: -15, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" interval={0} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="sessions" fill="#232d29" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center text-gray-400 text-sm italic">
              Aucune donnée de fréquentation enregistrée.
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-3xl border border-military-100 shadow-sm">
          <h3 className="text-sm font-black text-military-900 uppercase mb-4">
            Répartition par Profil Métier PPO & Genre
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div className="h-56 w-full">
              {jobDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={jobDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label>
                      {jobDistribution.map((_entry, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-xs italic">Aucune donnée</div>
              )}
            </div>
            <div className="space-y-3">
              {jobDistribution.map((j, idx) => (
                <div key={j.name} className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-2 text-gray-700">
                    <span className="w-3 h-3 rounded-full" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                    {j.name}
                  </span>
                  <span className="font-black text-military-900">{j.value}</span>
                </div>
              ))}
              <div className="pt-3 border-t border-gray-100 text-xs font-bold flex justify-between text-gray-500">
                <span className="text-blue-700">Hommes : {users.filter((u) => u.gender === 'H').length}</span>
                <span className="text-pink-700">Femmes : {users.filter((u) => u.gender === 'F').length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Registre Sport Unité (Live + Historique officiel Directive 17615) */}
      <div className="bg-white rounded-3xl border border-military-100 shadow-sm overflow-hidden">
        <div className="p-5 md:p-6 border-b border-gray-100 bg-military-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="font-black text-base text-military-900 uppercase flex items-center gap-2">
              <span className="material-icons text-action-600">fact_check</span>
              Registre Sport Unité (Directive 17615)
            </h3>
            <p className="text-xs text-gray-500">
              Localisation individuelle en direct et journal horodaté début/fin (statut « en service »).
            </p>
          </div>
          <button
            onClick={exportSportRegistryCSV}
            className="px-4 py-2.5 bg-military-900 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1.5 shadow"
          >
            <span className="material-icons text-sm">download</span> Exporter CSV
          </button>
        </div>

        {/* En direct */}
        {activeSessions.length > 0 && (
          <div className="p-4 bg-emerald-50/60 border-b border-emerald-100 space-y-2">
            <div className="text-[10px] font-black uppercase tracking-widest text-emerald-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Actuellement en séance ({activeSessions.length})
            </div>
            {activeSessions.map((session) => (
              <div key={session.id} className="bg-white p-3.5 rounded-2xl border border-emerald-200 flex justify-between items-center">
                <div>
                  <div className="font-black text-sm text-military-900">
                    {session.userName}{' '}
                    <span className="text-xs font-mono text-gray-400">({session.userId})</span>
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5 flex items-center gap-2">
                    <span className="material-icons text-[14px] text-action-600">place</span>
                    {session.infrastructureName} • {session.unit || 'Unité N/A'}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                    En cours
                  </span>
                  <div className="text-sm font-black text-military-900 mt-1">{formatElapsed(session.startTime)}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Journal Historique */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 font-black uppercase text-gray-500">
                <th className="p-3.5">Membre</th>
                <th className="p-3.5">Unité</th>
                <th className="p-3.5">Lieu / Parcours</th>
                <th className="p-3.5">Début</th>
                <th className="p-3.5">Fin</th>
                <th className="p-3.5">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {registry.slice(0, 30).map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="p-3.5 font-bold text-military-900">
                    {entry.userName} <span className="text-gray-400 font-mono">({entry.userId})</span>
                  </td>
                  <td className="p-3.5 text-gray-600">{entry.unit}</td>
                  <td className="p-3.5 font-semibold text-military-800">{entry.infrastructureName}</td>
                  <td className="p-3.5 font-mono text-gray-600">{formatDateTimeFr(entry.startTime)}</td>
                  <td className="p-3.5 font-mono text-gray-600">
                    {entry.endTime ? formatDateTimeFr(entry.endTime) : '—'}
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        entry.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : entry.status === 'COMPLETED'
                          ? 'bg-military-100 text-military-800'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {entry.status === 'ACTIVE' ? 'En cours' : entry.status === 'COMPLETED' ? `${entry.durationMinutes || 0} min` : 'Annulée'}
                    </span>
                  </td>
                </tr>
              ))}
              {registry.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400 italic">
                    Aucune entrée enregistrée dans le Registre Sport Unité sur ce périmètre.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Postage Numérique Autorité */}
      {showHandoverModal && (
        <div className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4" onClick={() => setShowHandoverModal(false)}>
          <form
            onSubmit={handleHandover}
            className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-[zoomIn_0.2s]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black uppercase text-military-900">Postage Numérique Autorité</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Saisissez l’identifiant du prochain responsable. Ses droits Autorité seront activés et vos droits actuels automatiquement révoqués.
            </p>
            <div>
              <label className="text-[10px] font-black uppercase text-gray-500 block mb-1">Identifiant du prochain responsable (10 chiffres)</label>
              <input
                required
                maxLength={10}
                value={targetHandoverNid}
                onChange={(e) => setTargetHandoverNid(e.target.value)}
                placeholder="Ex: 0987654321"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowHandoverModal(false)} className="flex-1 py-3 text-xs font-bold uppercase text-gray-500">
                Annuler
              </button>
              <button type="submit" className="flex-[2] py-3 bg-military-900 text-white rounded-xl text-xs font-black uppercase">
                Valider le transfert
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default DashboardAuthority;
