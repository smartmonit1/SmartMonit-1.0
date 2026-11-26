import React, { useState } from 'react';
import { DailyForm } from '../types';
import { db, DEFAULT_LOCAL_RULES } from '../services/mockDatabase';
import { getBaseName } from '../utils/bases';

interface DailyCheckInProps {
  serviceId?: string;
  onSubmit: (form: DailyForm) => void;
  onCancel?: () => void;
}

const DailyCheckIn: React.FC<DailyCheckInProps> = ({ serviceId, onSubmit, onCancel }) => {
  const [form, setForm] = useState<Partial<DailyForm>>({
    sleepQuality: 7,
    fatigueLevel: 3,
    stressLevel: 3,
    painLevel: 0,
    painZone: ''
  });

  const [acceptedRules, setAcceptedRules] = useState(false);
  const [showRulesPopup, setShowRulesPopup] = useState(false);

  const service = db.getServiceById(serviceId);
  const localRulesText = service?.localRules || DEFAULT_LOCAL_RULES;

  const isOrfaTrigger =
    ((form.fatigueLevel ?? 0) > 6 && (form.stressLevel ?? 0) > 6) ||
    (form.sleepQuality ?? 10) < 4;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedRules) return;
    onSubmit({
      sleepQuality: form.sleepQuality ?? 5,
      fatigueLevel: form.fatigueLevel ?? 5,
      stressLevel: form.stressLevel ?? 5,
      painLevel: form.painLevel ?? 0,
      painZone: form.painLevel && form.painLevel > 0 ? form.painZone : undefined,
      rulesAccepted: true,
      date: new Date().toISOString().split('T')[0]
    });
  };

  const Slider = ({
    label,
    val,
    setVal,
    min,
    max,
    lowLabel,
    highLabel,
    colorClass
  }: {
    label: string;
    val: number;
    setVal: (v: number) => void;
    min: number;
    max: number;
    lowLabel: string;
    highLabel: string;
    colorClass: string;
  }) => (
    <div className="mb-5">
      <div className="flex justify-between mb-1.5">
        <label className="font-bold text-sm text-gray-700">{label}</label>
        <span className={`font-black text-sm ${colorClass}`}>{val}/10</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={val}
        onChange={(e) => setVal(Number(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-military-700"
      />
      <div className="flex justify-between text-[11px] text-gray-400 font-medium mt-1">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 animate-[zoomIn_0.2s_ease-out] max-h-[90vh] overflow-y-auto custom-scrollbar">
          <div className="flex justify-between items-start mb-1">
            <div>
              <h2 className="text-2xl font-black text-military-900 uppercase tracking-tight">Bilan Quotidien</h2>
              <p className="text-gray-500 text-xs mt-0.5">
                Ces données adaptent automatiquement vos charges, allures et exercices du jour.
              </p>
            </div>
            {onCancel && (
              <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-700 p-1">
                <span className="material-icons">close</span>
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="mt-5">
            <Slider
              label="Qualité du Sommeil"
              val={form.sleepQuality ?? 7}
              setVal={(v) => setForm({ ...form, sleepQuality: v })}
              min={0}
              max={10}
              lowLabel="Mauvais"
              highLabel="Excellent"
              colorClass="text-blue-600"
            />
            <Slider
              label="Niveau de Fatigue"
              val={form.fatigueLevel ?? 3}
              setVal={(v) => setForm({ ...form, fatigueLevel: v })}
              min={0}
              max={10}
              lowLabel="En forme"
              highLabel="Épuisé"
              colorClass="text-orange-600"
            />
            <Slider
              label="Niveau de Stress"
              val={form.stressLevel ?? 3}
              setVal={(v) => setForm({ ...form, stressLevel: v })}
              min={0}
              max={10}
              lowLabel="Zen"
              highLabel="Stressé"
              colorClass="text-purple-600"
            />
            <Slider
              label="Douleur Corporelle"
              val={form.painLevel ?? 0}
              setVal={(v) => setForm({ ...form, painLevel: v })}
              min={0}
              max={10}
              lowLabel="Aucune"
              highLabel="Intense"
              colorClass="text-red-600"
            />

            {(form.painLevel ?? 0) > 0 && (
              <div className="mb-5 animate-[fadeIn_0.2s]">
                <label className="block text-xs font-bold uppercase text-red-700 mb-1">Zone douloureuse *</label>
                <input
                  type="text"
                  placeholder="Ex: Genou droit, Épaule, Lombaires..."
                  className="w-full border border-red-200 bg-red-50/40 rounded-xl p-2.5 text-sm font-semibold focus:ring-2 focus:ring-red-400 focus:outline-none"
                  value={form.painZone || ''}
                  onChange={(e) => setForm({ ...form, painZone: e.target.value })}
                  required
                />
              </div>
            )}

            {isOrfaTrigger && (
              <div className="mb-5 p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 flex items-start gap-2.5 animate-[fadeIn_0.2s]">
                <span className="material-icons text-indigo-600 text-lg shrink-0">psychology</span>
                <div>
                  <span className="font-black uppercase block mb-0.5">Recommandation ORFA</span>
                  Votre niveau de fatigue, stress ou sommeil indique un besoin de récupération mentale/physique. Un contact avec un moniteur ORFA vous sera proposé.
                </div>
              </div>
            )}

            <div className="mb-5 bg-gray-50 p-4 rounded-2xl border border-gray-200">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 w-4 h-4 text-military-700 rounded focus:ring-military-500"
                  checked={acceptedRules}
                  onChange={(e) => setAcceptedRules(e.target.checked)}
                  required
                />
                <span className="text-xs text-gray-700 leading-relaxed">
                  J'accepte le{' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowRulesPopup(true);
                    }}
                    className="text-military-800 font-black underline hover:text-action-600"
                  >
                    règlement intérieur des installations sportives ({getBaseName(serviceId)})
                  </button>{' '}
                  et je m'engage à le respecter.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={!acceptedRules}
              className={`w-full py-3.5 rounded-2xl font-black uppercase tracking-wider text-xs transition-all ${
                acceptedRules
                  ? 'bg-military-900 text-white hover:bg-military-800 shadow-lg active:scale-95'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Valider mon état du jour
            </button>
          </form>
        </div>
      </div>

      {/* Modal Règlement Intérieur Local */}
      {showRulesPopup && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 animate-[zoomIn_0.2s_ease-out] flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-4 border-b pb-4">
              <div>
                <h2 className="text-lg font-black text-military-900 uppercase">Règlement des Installations Sportives</h2>
                <p className="text-xs text-military-500 font-bold">{service?.name || getBaseName(serviceId)}</p>
              </div>
              <button onClick={() => setShowRulesPopup(false)} className="text-gray-400 hover:text-gray-700">
                <span className="material-icons">close</span>
              </button>
            </div>

            <div className="overflow-y-auto custom-scrollbar pr-2 text-sm text-gray-700 whitespace-pre-line leading-relaxed flex-grow">
              {localRulesText}
            </div>

            <div className="mt-6 pt-4 border-t flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowRulesPopup(false)}
                className="px-4 py-2 text-xs font-bold text-gray-500 uppercase"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={() => {
                  setAcceptedRules(true);
                  setShowRulesPopup(false);
                }}
                className="bg-military-900 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase hover:bg-military-800 transition-colors"
              >
                J'ai lu et j'accepte
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DailyCheckIn;
