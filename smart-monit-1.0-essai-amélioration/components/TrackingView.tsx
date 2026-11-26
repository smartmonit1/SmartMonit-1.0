import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  BarChart,
  Bar
} from 'recharts';
import { UserProfile } from '../types';
import {
  calculateVMA,
  analyzeDailyFormStructured,
  calculateReadinessScore,
  calculateACWR,
  calculateWeeklyStreak,
  buildStrengthZonesTable,
  buildVmaZonesTable
} from '../utils/biometrics';
import { formatDateFr, formatDateTimeFr } from '../utils/compliance';

interface TrackingViewProps {
  user: UserProfile;
}

const TrackingView: React.FC<TrackingViewProps> = ({ user }) => {
  const [zoneTab, setZoneTab] = useState<'vma' | 'force'>('vma');
  const vma = calculateVMA(user.tests);
  const logs = user.sessionLogs || [];

  const dailyData = [...user.dailyForms]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14)
    .map((d) => ({
      date: formatDateFr(d.date).slice(0, 5),
      Sommeil: d.sleepQuality,
      Fatigue: d.fatigueLevel,
      Stress: d.stressLevel,
      Douleur: d.painLevel
    }));

  const strengthData = [
    { name: 'Dév. Couché', kg: user.tests.benchPress1RM || 0 },
    { name: 'Squat', kg: user.tests.squat1RM || 0 },
    { name: 'Soulevé Terre', kg: user.tests.deadlift1RM || 0 }
  ].filter((d) => d.kg > 0);

  const totalMinutes = logs.reduce((acc, l) => acc + (l.durationMinutes || 0), 0);
  const totalTonnageKg = logs.reduce((acc, l) => acc + (l.totalVolumeKg || 0), 0);
  const last7DaysCount = logs.filter((l) => Date.now() - new Date(l.date).getTime() <= 7 * 24 * 60 * 60 * 1000).length;
  const avgRpe =
    logs.filter((l) => l.rpe).length > 0
      ? (logs.reduce((acc, l) => acc + (l.rpe || 0), 0) / logs.filter((l) => l.rpe).length).toFixed(1)
      : '-';

  const lastForm = user.dailyForms.length > 0 ? user.dailyForms[user.dailyForms.length - 1] : undefined;
  const lastAnalysis = lastForm ? analyzeDailyFormStructured(lastForm) : null;
  const readiness = calculateReadinessScore(lastForm);
  const acwr = calculateACWR(logs);
  const weeklyStreak = calculateWeeklyStreak(logs);
  const vmaTable = buildVmaZonesTable(vma);
  const best1RM = Math.max(user.tests.squat1RM || 0, user.tests.benchPress1RM || 0, user.tests.deadlift1RM || 0, 70);
  const strengthTable = buildStrengthZonesTable(best1RM);

  // Jauge circulaire Readiness
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (readiness.score / 100) * circumference;

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s]">
      <div>
        <h2 className="text-2xl md:text-3xl font-black text-military-900 uppercase tracking-tight">
          Suivi & Performance Athlète
        </h2>
        <p className="text-sm text-military-500 font-medium">
          Readiness, ratio de charge ACWR, records personnels (PR) et tables d'allures/charges liées à votre NID.
        </p>
      </div>

      {/* Bandeau Performance Pro (façon Whoop / Strava / Garmin) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Jauge Readiness */}
        <div className="bg-military-900 text-white rounded-3xl p-5 shadow-lg flex items-center gap-5">
          <div className="relative w-24 h-24 shrink-0">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
              <circle cx="48" cy="48" r={radius} stroke="rgba(255,255,255,0.12)" strokeWidth="8" fill="none" />
              <circle
                cx="48"
                cy="48"
                r={radius}
                stroke={readiness.strokeColor}
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black leading-none">{readiness.score}</span>
              <span className="text-[8px] font-bold uppercase text-military-300">/ 100</span>
            </div>
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-action-400">
              Indice Readiness du Jour
            </span>
            <div className="text-lg font-black uppercase mt-0.5">{readiness.label.replace('_', ' ')}</div>
            <p className="text-[11px] text-military-200 mt-1 leading-relaxed">{readiness.recommendation}</p>
          </div>
        </div>

        {/* ACWR & Régularité (Streak) */}
        <div className="bg-white rounded-3xl p-5 border border-military-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-black uppercase text-gray-400">Charge Aiguë / Chronique (ACWR)</span>
              <div className="text-3xl font-black text-military-900 mt-1">
                {acwr.ratio > 0 ? acwr.ratio.toFixed(2) : '—'}
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${acwr.badgeClass}`}>
              {acwr.label}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100 mt-3">
            <span>Charge 7j : <strong>{acwr.acuteLoad}</strong> u.a.</span>
            <span>Moy. 28j : <strong>{acwr.chronicLoad}</strong> u.a.</span>
          </div>
        </div>

        {/* Streak & Objectif Hebdo */}
        <div className="bg-white rounded-3xl p-5 border border-military-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-[10px] font-black uppercase text-gray-400">Série Régularité</span>
              <div className="text-3xl font-black text-orange-600 mt-1 flex items-center gap-1">
                <span className="material-icons text-3xl">local_fire_department</span>
                {weeklyStreak} <span className="text-xs font-bold text-gray-400">sem.</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black uppercase text-gray-400">Objectif Hebdo</span>
              <div className="text-xl font-black text-military-900">{last7DaysCount} / 3</div>
            </div>
          </div>
          <div className="mt-3">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-action-500 to-emerald-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, (last7DaysCount / 3) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* KPIs + Salle des Records (PR) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-military-100 shadow-sm">
          <span className="text-[10px] font-black uppercase text-gray-400">VMA Actuelle</span>
          <div className="text-2xl font-black text-military-900 mt-1">
            {vma} <span className="text-xs font-bold text-gray-400">km/h</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-military-100 shadow-sm">
          <span className="text-[10px] font-black uppercase text-gray-400">Tonnage Cumulé</span>
          <div className="text-2xl font-black text-action-600 mt-1">
            {totalTonnageKg > 0 ? `${(totalTonnageKg / 1000).toFixed(1)}t` : '0 kg'}
          </div>
          <span className="text-[10px] text-gray-400">{totalTonnageKg.toLocaleString('fr-FR')} kg soulevés</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-military-100 shadow-sm">
          <span className="text-[10px] font-black uppercase text-gray-400">Volume Horaire</span>
          <div className="text-2xl font-black text-military-900 mt-1">
            {Math.floor(totalMinutes / 60)}h{String(totalMinutes % 60).padStart(2, '0')}
          </div>
          <span className="text-[10px] text-gray-400">{logs.length} séance(s)</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-military-100 shadow-sm">
          <span className="text-[10px] font-black uppercase text-gray-400">RPE Moyen</span>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            {avgRpe} <span className="text-xs font-bold text-gray-400">/10</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-military-100 shadow-sm">
          <span className="text-[10px] font-black uppercase text-gray-400">PR CCPM / 2400m</span>
          <div className="text-2xl font-black text-indigo-700 mt-1">
            {user.tests.lastCcpmScore ? `${user.tests.lastCcpmScore}/20` : user.tests.run2400mTime || '—'}
          </div>
          <span className="text-[10px] text-gray-400">Record personnel</span>
        </div>
      </div>

      {/* Alerte ORFA si dernier bilan critique */}
      {lastAnalysis?.orfaRecommended && (
        <div className="bg-indigo-50 border-l-4 border-indigo-600 p-4 rounded-r-2xl flex items-start gap-3">
          <span className="material-icons text-indigo-600">psychology</span>
          <div>
            <h4 className="font-black text-xs uppercase text-indigo-900">Indicateur ORFA Détecté</h4>
            <p className="text-xs text-indigo-800 mt-0.5">
              Votre dernier bilan traduit une fatigue ou un stress élevé (ou un sommeil dégradé). N'hésitez pas à solliciter un moniteur ORFA pour optimiser votre récupération mentale et physique.
            </p>
          </div>
        </div>
      )}

      {/* Tables Biomécaniques Personnalisées (Allures VMA 200/400/1000m & Charges % 1RM) */}
      <div className="bg-white rounded-3xl border border-military-100 shadow-sm p-5 md:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div>
            <h3 className="text-sm font-black text-military-900 uppercase flex items-center gap-2">
              <span className="material-icons text-action-600 text-base">calculate</span>
              Mes Zones d'Entraînement Personnalisées (PIA 7.1.1)
            </h3>
            <p className="text-xs text-gray-500">
              Calculées automatiquement à partir de votre VMA ({vma} km/h) et de vos 1RM.
            </p>
          </div>
          <div className="flex bg-military-50 p-1 rounded-xl border border-military-100">
            <button
              type="button"
              onClick={() => setZoneTab('vma')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase ${
                zoneTab === 'vma' ? 'bg-military-900 text-action-400' : 'text-gray-500'
              }`}
            >
              Allures VMA & Piste
            </button>
            <button
              type="button"
              onClick={() => setZoneTab('force')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase ${
                zoneTab === 'force' ? 'bg-military-900 text-action-400' : 'text-gray-500'
              }`}
            >
              Charges % 1RM
            </button>
          </div>
        </div>

        {zoneTab === 'vma' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-military-50 text-military-700 font-black uppercase text-[10px]">
                  <th className="p-2.5 rounded-l-xl">% VMA</th>
                  <th className="p-2.5">Zone</th>
                  <th className="p-2.5">Vitesse</th>
                  <th className="p-2.5">Allure / km</th>
                  <th className="p-2.5">200m</th>
                  <th className="p-2.5">400m</th>
                  <th className="p-2.5 rounded-r-xl">1000m</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vmaTable.map((z) => (
                  <tr key={z.pct} className="hover:bg-military-50/50">
                    <td className="p-2.5 font-black text-action-700">{z.pct}%</td>
                    <td className="p-2.5 font-bold text-military-900">{z.label}</td>
                    <td className="p-2.5 font-mono">{z.speedKmH} km/h</td>
                    <td className="p-2.5 font-mono font-bold text-emerald-700">{z.pacePerKm}</td>
                    <td className="p-2.5 font-mono">{z.split200m}</td>
                    <td className="p-2.5 font-mono">{z.split400m}</td>
                    <td className="p-2.5 font-mono font-bold">{z.split1000m}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-military-50 text-military-700 font-black uppercase text-[10px]">
                  <th className="p-2.5 rounded-l-xl">% 1RM</th>
                  <th className="p-2.5">Filière</th>
                  <th className="p-2.5">Répétitions cibles</th>
                  <th className="p-2.5">Dév. Couché ({user.tests.benchPress1RM || 65} kg)</th>
                  <th className="p-2.5 rounded-r-xl">Squat ({user.tests.squat1RM || 85} kg)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {strengthTable.map((row) => {
                  const benchKg = Math.round(((user.tests.benchPress1RM || 65) * (row.pct / 100)) / 2.5) * 2.5;
                  const squatKg = Math.round(((user.tests.squat1RM || 85) * (row.pct / 100)) / 2.5) * 2.5;
                  return (
                    <tr key={row.pct} className="hover:bg-military-50/50">
                      <td className="p-2.5 font-black text-action-700">{row.pct}%</td>
                      <td className="p-2.5 font-bold text-military-900">{row.zone}</td>
                      <td className="p-2.5 font-mono">{row.reps} reps</td>
                      <td className="p-2.5 font-mono font-bold text-military-900">{benchKg} kg</td>
                      <td className="p-2.5 font-mono font-bold text-emerald-700">{squatKg} kg</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-military-100 shadow-sm">
          <h3 className="text-sm font-black text-military-900 uppercase mb-4 flex items-center gap-2">
            <span className="material-icons text-action-600 text-base">monitor_heart</span>
            Évolution du Bilan de Forme (14 derniers jours)
          </h3>
          {dailyData.length > 0 ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData} margin={{ top: 5, right: 15, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line type="monotone" dataKey="Sommeil" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Fatigue" stroke="#ea580c" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Stress" stroke="#9333ea" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Douleur" stroke="#dc2626" strokeWidth={2} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-60 flex items-center justify-center text-sm text-gray-400 italic">
              Validez vos bilans quotidiens pour voir apparaître vos courbes de forme.
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-3xl border border-military-100 shadow-sm">
          <h3 className="text-sm font-black text-military-900 uppercase mb-4 flex items-center gap-2">
            <span className="material-icons text-action-600 text-base">fitness_center</span>
            Références Force (1RM kg)
          </h3>
          {strengthData.length > 0 ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={strengthData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="kg" fill="#232d29" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-60 flex items-center justify-center text-center text-sm text-gray-400 italic px-4">
              Renseignez vos 1RM (ou utilisez le calculateur Brzycki dans votre Profil) pour afficher votre graphique de force.
            </div>
          )}
        </div>
      </div>

      {/* Historique des séances réalisées */}
      <div className="bg-white rounded-3xl border border-military-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-sm font-black text-military-900 uppercase flex items-center gap-2">
            <span className="material-icons text-action-600 text-base">history</span>
            Journal d'Entraînement ({logs.length})
          </h3>
        </div>
        {logs.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm italic">
            Aucune séance terminée enregistrée pour le moment.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {[...logs]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((log) => (
                <div key={log.id} className="p-4 md:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-gray-50">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-military-900">{log.title}</span>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-military-100 text-military-700">
                        {log.type}
                      </span>
                      {log.adaptedForDailyForm && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-action-100 text-action-700">
                          Adaptée forme
                        </span>
                      )}
                      {log.totalVolumeKg && log.totalVolumeKg > 0 && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          {log.totalVolumeKg.toLocaleString('fr-FR')} kg
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-3">
                      <span>{formatDateTimeFr(log.date)}</span>
                      <span>• {log.locationName}</span>
                    </div>
                    {log.notes && <p className="text-xs text-gray-600 italic mt-1">"{log.notes}"</p>}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-black text-military-800 bg-gray-100 px-3 py-1.5 rounded-xl">
                      {log.durationMinutes} min
                    </span>
                    {log.rpe && (
                      <span className="text-xs font-black text-action-700 bg-action-50 border border-action-200 px-3 py-1.5 rounded-xl">
                        RPE {log.rpe}/10
                      </span>
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

export default TrackingView;
