import React, { useState } from 'react';
import { UserProfile, JobType, WorkSchedule } from '../types';
import { calculateVMA, calculate1RM, formatPaceFromSpeed, JOB_PROFILES_DB } from '../utils/biometrics';
import { generateNumberOptions, generateTimeOptionsMMSS, generateTimeOptionsHHMMSS } from '../utils/options';
import { AIR_BASES, MILITARY_UNITS, getBaseName } from '../utils/bases';
import { db } from '../services/mockDatabase';
import { RGPD_INFORMATION_NOTICE, RGPD_POLICY_VERSION } from '../utils/security';
import { formatDateTimeFr } from '../utils/compliance';
import { useToast } from './ToastProvider';

interface ProfileViewProps {
  user: UserProfile;
  onUpdateUser: (updated: UserProfile) => void;
  onAccountDeleted?: () => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ user, onUpdateUser, onAccountDeleted }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [edited, setEdited] = useState<UserProfile>(JSON.parse(JSON.stringify(user)));
  const { showToast } = useToast();

  // RGPD Deletion confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmNid, setDeleteConfirmNid] = useState('');
  const [showRgpdDetails, setShowRgpdDetails] = useState(false);

  // Assistant Calculateur 1RM Brzycki (Section 4.5.3)
  const [brzyckiWeight, setBrzyckiWeight] = useState<number>(60);
  const [brzyckiReps, setBrzyckiReps] = useState<number>(6);
  const [showBrzycki, setShowBrzycki] = useState(false);

  const vma = calculateVMA(isEditing ? edited.tests : user.tests);
  const jobGuidance = JOB_PROFILES_DB[user.jobType];
  const estimated1RM = calculate1RM(brzyckiWeight, brzyckiReps);

  const startEditing = () => {
    setEdited(JSON.parse(JSON.stringify(user)));
    setIsEditing(true);
  };

  const handleSave = () => {
    const newVma = calculateVMA(edited.tests);
    // Gestion portabilité NID lors d'une mutation de base (Section 4.8)
    const previousBases = [...(user.previousBases || [])];
    if (user.serviceId && edited.serviceId && user.serviceId !== edited.serviceId) {
      if (!previousBases.includes(user.serviceId)) {
        previousBases.push(user.serviceId);
      }
      showToast(
        `Mutation enregistrée vers ${getBaseName(edited.serviceId)}. Votre historique NID suit automatiquement.`,
        'info'
      );
    }

    const finalUser: UserProfile = {
      ...edited,
      previousBases,
      tests: {
        ...edited.tests,
        calculatedVMA: newVma
      }
    };
    onUpdateUser(finalUser);
    setIsEditing(false);
    showToast('Profil mis à jour. Vos charges et allures ont été recalculées.', 'success');
  };

  const applyBrzyckiTo = (field: 'benchPress1RM' | 'squat1RM' | 'deadlift1RM') => {
    const rounded = Math.round(estimated1RM * 2) / 2;
    const baseUser = isEditing ? edited : JSON.parse(JSON.stringify(user));
    baseUser.tests = { ...baseUser.tests, [field]: rounded };
    if (isEditing) {
      setEdited(baseUser);
    } else {
      onUpdateUser(baseUser);
    }
    showToast(`1RM estimé (${rounded} kg) appliqué au profil.`, 'success');
  };

  const paceZones = [
    { label: 'Endurance Fondamentale', pct: 65, color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    { label: 'Allure Active', pct: 75, color: 'bg-blue-50 text-blue-800 border-blue-200' },
    { label: 'Seuil / 10 km', pct: 85, color: 'bg-amber-50 text-amber-800 border-amber-200' },
    { label: 'CCPM 2400m', pct: 95, color: 'bg-orange-50 text-orange-800 border-orange-200' },
    { label: 'Fractionné VMA', pct: 100, color: 'bg-red-50 text-red-800 border-red-200' }
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-[fadeIn_0.3s]">
      {/* En-tête Profil */}
      <div className="bg-white rounded-3xl shadow-sm border border-military-100 overflow-hidden">
        <div className="bg-military-900 p-6 md:p-8 text-white flex flex-col md:flex-row items-center gap-6">
          <div className="w-20 h-20 bg-military-700 rounded-3xl flex items-center justify-center text-3xl font-black shadow-inner border-2 border-action-500/40">
            {user.name.charAt(0)}
          </div>
          <div className="text-center md:text-left flex-grow">
            {isEditing ? (
              <input
                className="text-2xl font-black bg-military-800 text-white border border-military-600 rounded-xl p-2 w-full mb-2 outline-none focus:border-action-500"
                value={edited.name}
                onChange={(e) => setEdited({ ...edited, name: e.target.value })}
              />
            ) : (
              <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight">{user.name}</h2>
            )}
            <p className="text-military-300 font-bold text-xs uppercase tracking-widest">
              {user.role} • NID {user.nid} (Portable National)
            </p>
            <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-2">
              <span className="bg-action-500 text-military-950 px-3 py-1.5 rounded-xl text-xs font-black uppercase shadow">
                VMA {vma} km/h
              </span>
              <span className="bg-military-800 text-military-100 px-3 py-1.5 rounded-xl text-xs font-bold border border-military-700">
                {getBaseName(user.serviceId)}
              </span>
              {!isEditing && (
                <button
                  onClick={startEditing}
                  className="bg-white text-military-900 px-4 py-1.5 rounded-xl text-xs font-black uppercase hover:bg-gray-100 transition-colors flex items-center gap-1.5"
                >
                  <span className="material-icons text-sm">edit</span> Modifier
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Formulaire & Informations */}
        <div className="p-6 md:p-8 space-y-8">
          {/* Infos Pro & Mutation */}
          <section>
            <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Affectation & Profil Métier</h3>
              {user.previousBases && user.previousBases.length > 0 && (
                <span className="text-[10px] font-bold text-military-600 bg-military-50 px-2.5 py-1 rounded-lg">
                  Historique mutations : {user.previousBases.map((b) => getBaseName(b)).join(' → ')}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-military-700 mb-1">Base d'affectation (Continuité NID)</label>
                {isEditing ? (
                  <select
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm text-military-900 outline-none focus:border-action-500"
                    value={edited.serviceId || ''}
                    onChange={(e) => setEdited({ ...edited, serviceId: e.target.value })}
                  >
                    {AIR_BASES.map((base) => (
                      <option key={base.id} value={base.id}>{base.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 bg-gray-50 rounded-xl font-bold text-sm text-military-900">
                    {getBaseName(user.serviceId)}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-military-700 mb-1">Unité</label>
                {isEditing ? (
                  <select
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm text-military-900 outline-none focus:border-action-500"
                    value={edited.unit || ''}
                    onChange={(e) => setEdited({ ...edited, unit: e.target.value })}
                  >
                    <option value="">Sélectionner une unité</option>
                    {MILITARY_UNITS.map((unit) => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 bg-gray-50 rounded-xl font-bold text-sm text-military-900">
                    {user.unit || 'Non renseignée'}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-military-700 mb-1">Profil Métier PPO</label>
                {isEditing ? (
                  <select
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm text-military-900 outline-none focus:border-action-500"
                    value={edited.jobType}
                    onChange={(e) => setEdited({ ...edited, jobType: e.target.value as JobType })}
                  >
                    {Object.values(JobType).map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                ) : (
                  <div className="p-3 bg-gray-50 rounded-xl font-bold text-sm text-military-900">{user.jobType}</div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-military-700 mb-1">Rythme / Horaires</label>
                {isEditing ? (
                  <select
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm text-military-900 outline-none focus:border-action-500"
                    value={edited.workSchedule}
                    onChange={(e) => setEdited({ ...edited, workSchedule: e.target.value as WorkSchedule })}
                  >
                    {Object.values(WorkSchedule).map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                ) : (
                  <div className="p-3 bg-gray-50 rounded-xl font-bold text-sm text-military-900">{user.workSchedule}</div>
                )}
              </div>
            </div>
          </section>

          {/* Tests Physiques */}
          <section>
            <div className="flex flex-wrap justify-between items-center gap-2 mb-4 border-b border-gray-100 pb-2">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Tests Physiques & Biométrie</h3>
              <button
                type="button"
                onClick={() => setShowBrzycki(!showBrzycki)}
                className="text-xs font-black text-action-700 bg-action-50 hover:bg-action-100 border border-action-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <span className="material-icons text-sm">calculate</span>
                Calculateur 1RM (Brzycki)
              </button>
            </div>

            {/* Calculateur Brzycki interactif (Section 4.5.3) */}
            {showBrzycki && (
              <div className="mb-6 p-5 rounded-2xl bg-military-900 text-white space-y-4 animate-[fadeIn_0.2s]">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-black text-sm uppercase text-action-400">Calculateur 1RM Sous-Maximal (Brzycki)</h4>
                    <p className="text-[11px] text-military-300">Formule : 1RM = Charge × (36 / (37 − Répétitions)) — fiable jusqu'à 10 reps.</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase text-military-400 block">1RM Estimé</span>
                    <span className="text-2xl font-black text-action-400">{estimated1RM} kg</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-military-300 block mb-1">Charge soulevée (kg)</label>
                    <input
                      type="number"
                      min={10}
                      max={300}
                      step={2.5}
                      value={brzyckiWeight}
                      onChange={(e) => setBrzyckiWeight(parseFloat(e.target.value) || 0)}
                      className="w-full p-2.5 bg-military-800 border border-military-700 rounded-xl font-bold text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-military-300 block mb-1">Répétitions réalisées (1 à 12)</label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={brzyckiReps}
                      onChange={(e) => setBrzyckiReps(Math.min(12, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                      className="w-full p-2.5 bg-military-800 border border-military-700 rounded-xl font-bold text-white"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => applyBrzyckiTo('benchPress1RM')} className="px-3 py-2 bg-action-500 text-military-950 rounded-xl text-[11px] font-black uppercase hover:bg-action-400">
                    Appliquer au Développé Couché
                  </button>
                  <button type="button" onClick={() => applyBrzyckiTo('squat1RM')} className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[11px] font-black uppercase">
                    Appliquer au Squat
                  </button>
                  <button type="button" onClick={() => applyBrzyckiTo('deadlift1RM')} className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[11px] font-black uppercase">
                    Appliquer au Soulevé de Terre
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Course */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-military-800 uppercase flex items-center gap-2">
                  <span className="material-icons text-sm text-action-600">directions_run</span> Course à pied & VMA
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Luc Léger (Palier)', key: 'lucLegerPalier', opts: generateNumberOptions(1, 15, 0.5), isNum: true },
                    { label: 'VAMEVAL (Palier)', key: 'vamevalPalier', opts: generateNumberOptions(1, 25, 0.5), isNum: true },
                    { label: 'Demi-Cooper (m)', key: 'cooperDistance', opts: generateNumberOptions(1000, 2600, 50), isNum: true },
                    { label: '2400m CCPM (MM:SS)', key: 'run2400mTime', opts: generateTimeOptionsMMSS(7, 20, 15), isNum: false },
                    { label: '5 km (MM:SS)', key: 'run5kmTime', opts: generateTimeOptionsMMSS(15, 45, 30), isNum: false },
                    { label: '10 km (HH:MM:SS)', key: 'run10kmTime', opts: generateTimeOptionsHHMMSS(30, 90, 60), isNum: false },
                    { label: 'Semi (HH:MM:SS)', key: 'runSemiMarathonTime', opts: generateTimeOptionsHHMMSS(65, 180, 60), isNum: false },
                    { label: 'Marathon (HH:MM:SS)', key: 'runMarathonTime', opts: generateTimeOptionsHHMMSS(140, 360, 120), isNum: false }
                  ].map((field) => (
                    <div key={field.key} className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                      <label className="block text-[10px] font-bold text-gray-500 mb-1">{field.label}</label>
                      {isEditing ? (
                        <select
                          className="w-full p-1.5 bg-white border border-gray-200 rounded-lg font-bold text-xs"
                          value={(edited.tests as any)[field.key] ?? ''}
                          onChange={(e) => {
                            const raw = e.target.value;
                            setEdited({
                              ...edited,
                              tests: {
                                ...edited.tests,
                                [field.key]: raw === '' ? undefined : field.isNum ? parseFloat(raw) : raw
                              }
                            });
                          }}
                        >
                          <option value="">Non renseigné</option>
                          {field.opts.map((opt) => (
                            <option key={String(opt)} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="font-black text-sm text-military-900">
                          {(user.tests as any)[field.key] ?? '-'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Musculation & CCPM */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-military-800 uppercase flex items-center gap-2">
                  <span className="material-icons text-sm text-action-600">fitness_center</span> Musculation & CCPM
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Pompes (Max CCPM)', key: 'pushups', opts: generateNumberOptions(0, 120, 1) },
                    { label: 'Tractions (Max)', key: 'pullups', opts: generateNumberOptions(0, 50, 1) },
                    { label: '1RM Développé Couché (kg)', key: 'benchPress1RM', opts: generateNumberOptions(20, 200, 2.5) },
                    { label: '1RM Squat (kg)', key: 'squat1RM', opts: generateNumberOptions(20, 250, 2.5) },
                    { label: '1RM Soulevé de Terre (kg)', key: 'deadlift1RM', opts: generateNumberOptions(20, 300, 2.5) },
                    { label: 'Note CCPM (/20)', key: 'lastCcpmScore', opts: generateNumberOptions(0, 20, 0.5) }
                  ].map((field) => (
                    <div key={field.key} className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                      <label className="block text-[10px] font-bold text-gray-500 mb-1">{field.label}</label>
                      {isEditing ? (
                        <select
                          className="w-full p-1.5 bg-white border border-gray-200 rounded-lg font-bold text-xs"
                          value={(edited.tests as any)[field.key] ?? ''}
                          onChange={(e) => {
                            const raw = e.target.value;
                            setEdited({
                              ...edited,
                              tests: {
                                ...edited.tests,
                                [field.key]: raw === '' ? undefined : parseFloat(raw)
                              }
                            });
                          }}
                        >
                          <option value="">Non renseigné</option>
                          {field.opts.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="font-black text-sm text-military-900">
                          {(user.tests as any)[field.key] ?? '-'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {isEditing && (
            <div className="flex gap-4 pt-4 border-t border-gray-100">
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 py-3.5 rounded-xl font-bold uppercase text-xs text-gray-500 hover:bg-gray-100"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                className="flex-[2] py-3.5 rounded-xl bg-action-500 text-military-950 font-black uppercase text-xs shadow-lg hover:bg-action-400 active:scale-95 transition-all"
              >
                Enregistrer les modifications
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Zones d'allures calculées automatiquement */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-military-100">
        <h3 className="text-xs font-black text-military-500 uppercase tracking-widest mb-4">
          Allures d'entraînement calculées (VMA {vma} km/h)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {paceZones.map((z) => {
            const speed = vma * (z.pct / 100);
            return (
              <div key={z.pct} className={`p-3 rounded-2xl border ${z.color} text-center`}>
                <div className="text-[10px] font-black uppercase opacity-80">{z.pct}% VMA</div>
                <div className="text-lg font-black mt-1">{formatPaceFromSpeed(speed)}</div>
                <div className="text-[11px] font-bold">{speed.toFixed(1)} km/h</div>
                <div className="text-[9px] font-semibold mt-1 opacity-75">{z.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fiche Analyse Métier PPO (Section 4.3.3) */}
      {jobGuidance && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-military-100">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-icons text-action-600">engineering</span>
            <h3 className="text-sm font-black text-military-900 uppercase">Analyse Métier PPO — {jobGuidance.jobType}</h3>
          </div>
          <p className="text-xs text-gray-500 mb-4">Cœur de cible : {jobGuidance.target}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {jobGuidance.constraints.map((c, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-military-50 border border-military-100 space-y-2">
                <div className="text-xs font-black text-military-900">{c.issue}</div>
                <p className="text-xs text-military-600 leading-relaxed">{c.solution}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Centre de Confidentialité, RGPD & Droits CNIL (Art. 7, 9, 15, 17, 20, 21) */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-military-100 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-sm font-black text-military-900 uppercase flex items-center gap-2">
              <span className="material-icons text-emerald-700 text-base">verified_user</span>
              Confidentialité, RGPD & Droits CNIL
            </h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Politique {user.rgpdConsent?.version || RGPD_POLICY_VERSION}
              {user.rgpdConsent?.acceptedAt ? ` • Consentement horodaté le ${formatDateTimeFr(user.rgpdConsent.acceptedAt)}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowRgpdDetails(!showRgpdDetails)}
            className="text-xs font-black text-military-700 underline self-start sm:self-center"
          >
            {showRgpdDetails ? 'Masquer la notice' : 'Consulter la notice CNIL'}
          </button>
        </div>

        {/* Gestion des consentements granulaires */}
        <div className="space-y-3">
          {[
            {
              key: 'aiProcessingConsent' as const,
              title: 'Assistance IA souveraine sur données pseudonymisées (Art. 21)',
              desc: 'Si désactivé, aucune requête n\'est transmise vers un moteur IA externe (futur Mistral AI / AMIAD) : vos séances utilisent exclusivement le moteur expert local intégré.'
            },
            {
              key: 'analyticsConsent' as const,
              title: 'Statistiques collectives anonymisées Commandement (k-anonymat ≥ 5)',
              desc: 'Autorise l\'agrégation anonyme de vos indicateurs de forme au profit du pilotage de votre unité/base.'
            }
          ].map((item) => {
            const currentVal = user.rgpdConsent ? user.rgpdConsent[item.key] : true;
            return (
              <div key={item.key} className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex items-start justify-between gap-4">
                <div>
                  <div className="font-bold text-xs text-military-900">{item.title}</div>
                  <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextConsent = {
                      version: RGPD_POLICY_VERSION,
                      acceptedAt: new Date().toISOString(),
                      healthDataConsent: user.rgpdConsent?.healthDataConsent ?? true,
                      aiProcessingConsent: user.rgpdConsent?.aiProcessingConsent ?? true,
                      analyticsConsent: user.rgpdConsent?.analyticsConsent ?? true,
                      [item.key]: !currentVal
                    };
                    onUpdateUser({ ...user, rgpdConsent: nextConsent });
                    db.logAudit({
                      actorNid: user.nid,
                      actorName: user.name,
                      actorRole: user.role,
                      serviceId: user.serviceId,
                      action: 'UPDATE_RGPD_CONSENT',
                      details: `Modification consentement ${item.key} -> ${!currentVal}`
                    });
                    showToast('Préférence RGPD enregistrée et horodatée.', 'success');
                  }}
                  className={`shrink-0 px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase transition-colors ${
                    currentVal
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-300 text-gray-700'
                  }`}
                >
                  {currentVal ? 'Activé' : 'Désactivé'}
                </button>
              </div>
            );
          })}
        </div>

        {showRgpdDetails && (
          <div className="p-4 rounded-2xl bg-military-50 border border-military-200 text-xs text-military-800 space-y-2 animate-[fadeIn_0.2s]">
            <p><strong>Responsable :</strong> {RGPD_INFORMATION_NOTICE.controller}</p>
            <p><strong>DPO Défense :</strong> {RGPD_INFORMATION_NOTICE.dpo}</p>
            <p><strong>Pseudonymisation IA :</strong> {RGPD_INFORMATION_NOTICE.aiPrivacy}</p>
            <p><strong>Conservation :</strong> {RGPD_INFORMATION_NOTICE.retention.join(' | ')}</p>
          </div>
        )}

        {/* Exercice des droits Art. 15, 20 & 17 */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              const payload = db.exportUserRgpdData(user.nid);
              if (!payload) return;
              const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `SMARTMONIT_Mes_Donnees_RGPD_${user.nid}_${new Date().toISOString().split('T')[0]}.json`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              db.logAudit({
                actorNid: user.nid,
                actorName: user.name,
                actorRole: user.role,
                serviceId: user.serviceId,
                action: 'EXPORT_RGPD_DATA',
                details: 'Exercice du droit d\'accès & portabilité (Art. 15 & 20 RGPD) — Export JSON.'
              });
              showToast('Export RGPD (JSON) téléchargé avec succès.', 'success');
            }}
            className="flex-1 py-3 px-4 bg-military-900 hover:bg-military-800 text-white rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2"
          >
            <span className="material-icons text-sm text-action-400">download</span>
            Exporter mes données (Art. 15 & 20)
          </button>
          <button
            type="button"
            onClick={() => {
              setDeleteConfirmNid('');
              setShowDeleteModal(true);
            }}
            className="py-3 px-4 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2"
          >
            <span className="material-icons text-sm">delete_forever</span>
            Effacer mon compte (Art. 17)
          </button>
        </div>
      </div>

      {/* Modal confirmation Effacement RGPD Art. 17 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/75 z-[80] flex items-center justify-center p-4" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-[zoomIn_0.2s]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 text-red-700">
              <span className="material-icons text-2xl">warning</span>
              <h3 className="text-lg font-black uppercase">Droit à l'effacement (Art. 17 RGPD)</h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Cette action supprime définitivement votre profil, vos bilans de forme, vos programmes individuels et anonymise vos entrées du Registre Sport Unité. Pour confirmer, saisissez votre NID (<strong>{user.nid}</strong>) :
            </p>
            <input
              type="text"
              maxLength={10}
              value={deleteConfirmNid}
              onChange={(e) => setDeleteConfirmNid(e.target.value)}
              placeholder={user.nid}
              className="w-full p-3 bg-gray-50 border border-red-200 rounded-xl font-bold text-sm"
            />
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 text-xs font-bold uppercase text-gray-500">
                Annuler
              </button>
              <button
                type="button"
                disabled={deleteConfirmNid.trim() !== user.nid}
                onClick={() => {
                  db.deleteUserAccountRgpd(user.nid);
                  setShowDeleteModal(false);
                  showToast('Votre compte a été définitivement supprimé conformément à l\'Art. 17 RGPD.', 'info');
                  onAccountDeleted?.();
                }}
                className="flex-[2] py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black uppercase text-xs disabled:opacity-40"
              >
                Confirmer l'effacement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileView;
