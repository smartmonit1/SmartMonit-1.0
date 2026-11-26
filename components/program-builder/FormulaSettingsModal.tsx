import React, { useState } from 'react';
import { FormulaSystemConfig, UserProfile, UserRole } from '../../types';
import {
  DEFAULT_FORMULA_CONFIG,
  getFormulaConfig,
  resetFormulaConfig,
  saveFormulaConfig
} from '../../utils/calculationEngine';
import { db } from '../../services/mockDatabase';

interface FormulaSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onSaved?: (cfg: FormulaSystemConfig) => void;
}

const FormulaSettingsModal: React.FC<FormulaSettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  onSaved
}) => {
  const [config, setConfig] = useState<FormulaSystemConfig>(() => getFormulaConfig());
  const canEdit =
    user.role === UserRole.ADMINISTRATOR || user.monitorPermission === 'CHEF_CELLULE';

  if (!isOpen) return null;

  const handleSave = () => {
    if (!canEdit) return;
    const updated: FormulaSystemConfig = {
      ...config,
      updatedAt: new Date().toISOString(),
      updatedBy: user.nid
    };
    saveFormulaConfig(updated);
    db.logAudit({
      actorNid: user.nid,
      actorName: user.name,
      actorRole: user.role,
      action: 'UPDATE_FORMULA_CONFIG',
      details: `Arrondi ${updated.defaultWeightStepKg}kg, Brzycki <= ${updated.brzycki.maxValidReps} reps, seuil PIA +${updated.piaRules.maxWeeklyVolumeIncreasePct}%, cycle décharge ${updated.piaRules.deloadCycleWeeks} sem.`,
      serviceId: user.serviceId
    });
    onSaved?.(updated);
    onClose();
  };

  const handleReset = () => {
    if (!canEdit) return;
    const reset = resetFormulaConfig();
    setConfig(reset);
    onSaved?.(reset);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-military-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Paramétrage des formules scientifiques"
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-military-200 text-military-900">
        <div className="bg-military-900 text-white p-4 sm:p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-action-400">
              Transparence & Paramétrage biométrique (PIA 7.1.1)
            </span>
            <h3 className="text-lg font-black">Formules de calcul 1RM, VMA & seuils pédagogiques</h3>
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

        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {!canEdit && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 font-bold flex items-center gap-2">
              <span className="material-icons text-base">lock</span>
              Consultation seule : la modification des formules système est réservée au Chef de
              Cellule EPMS ou à l'Autorité (RBAC).
            </div>
          )}

          {/* Force & 1RM */}
          <div className="p-4 rounded-2xl border border-gray-200 space-y-3">
            <h4 className="font-black text-sm text-military-900">1. Force & 1RM (Brzycki)</h4>
            <p className="text-gray-600">
              Formule : <code>1RM = Charge × ({config.brzycki.numerator} / ({config.brzycki.denominatorBase} − Reps))</code> —{' '}
              <em>{config.brzycki.reference}</em>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="font-bold">
                Plafond de validité Brzycki (reps max)
                <input
                  type="number"
                  min={5}
                  max={12}
                  disabled={!canEdit}
                  value={config.brzycki.maxValidReps}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      brzycki: {
                        ...config.brzycki,
                        maxValidReps: parseInt(e.target.value, 10) || 10
                      }
                    })
                  }
                  className="mt-1 w-full p-2 rounded-xl border border-gray-300 font-black disabled:bg-gray-100"
                />
              </label>
              <label className="font-bold">
                Arrondi matériel charges (kg)
                <select
                  disabled={!canEdit}
                  value={config.defaultWeightStepKg}
                  onChange={(e) =>
                    setConfig({ ...config, defaultWeightStepKg: parseFloat(e.target.value) })
                  }
                  className="mt-1 w-full p-2 rounded-xl border border-gray-300 font-black disabled:bg-gray-100"
                >
                  <option value={1}>1 kg</option>
                  <option value={2}>2 kg</option>
                  <option value={2.5}>2,5 kg (standard olympique)</option>
                  <option value={5}>5 kg</option>
                </select>
              </label>
            </div>
          </div>

          {/* VMA */}
          <div className="p-4 rounded-2xl border border-gray-200 space-y-3">
            <h4 className="font-black text-sm text-military-900">
              2. Facteurs de conversion VMA par protocole
            </h4>
            <p className="text-gray-600">
              Références : <em>{config.performanceVmaFactors.reference}</em> |{' '}
              <em>{config.lucLeger.reference}</em>
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { key: 'run2400m', label: '2400 m (% VMA)' },
                { key: 'run5km', label: '5 km (% VMA)' },
                { key: 'run10km', label: '10 km (% VMA)' },
                { key: 'runSemi', label: 'Semi / 20 km (% VMA)' },
                { key: 'runMarathon', label: 'Marathon (% VMA)' }
              ].map((f) => (
                <label key={f.key} className="font-bold">
                  {f.label}
                  <input
                    type="number"
                    step={0.01}
                    min={0.6}
                    max={1.0}
                    disabled={!canEdit}
                    value={(config.performanceVmaFactors as any)[f.key]}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        performanceVmaFactors: {
                          ...config.performanceVmaFactors,
                          [f.key]:
                            parseFloat(e.target.value) ||
                            (DEFAULT_FORMULA_CONFIG.performanceVmaFactors as any)[f.key]
                        }
                      })
                    }
                    className="mt-1 w-full p-2 rounded-xl border border-gray-300 font-black disabled:bg-gray-100"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Règles PIA 7.1.1 */}
          <div className="p-4 rounded-2xl border border-gray-200 space-y-3">
            <h4 className="font-black text-sm text-military-900">3. Seuils d'alertes PIA 7.1.1</h4>
            <p className="text-gray-600">
              <em>{config.piaRules.reference}</em>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="font-bold">
                Hausse hebdo max (%)
                <input
                  type="number"
                  min={5}
                  max={30}
                  disabled={!canEdit}
                  value={config.piaRules.maxWeeklyVolumeIncreasePct}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      piaRules: {
                        ...config.piaRules,
                        maxWeeklyVolumeIncreasePct: parseInt(e.target.value, 10) || 15
                      }
                    })
                  }
                  className="mt-1 w-full p-2 rounded-xl border border-gray-300 font-black disabled:bg-gray-100"
                />
              </label>
              <label className="font-bold">
                Cycle décharge (semaines)
                <input
                  type="number"
                  min={3}
                  max={6}
                  disabled={!canEdit}
                  value={config.piaRules.deloadCycleWeeks}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      piaRules: {
                        ...config.piaRules,
                        deloadCycleWeeks: parseInt(e.target.value, 10) || 4
                      }
                    })
                  }
                  className="mt-1 w-full p-2 rounded-xl border border-gray-300 font-black disabled:bg-gray-100"
                />
              </label>
              <label className="font-bold">
                Jours intensité haute max consécutifs
                <input
                  type="number"
                  min={1}
                  max={4}
                  disabled={!canEdit}
                  value={config.piaRules.maxConsecutiveHighIntensityDays}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      piaRules: {
                        ...config.piaRules,
                        maxConsecutiveHighIntensityDays: parseInt(e.target.value, 10) || 2
                      }
                    })
                  }
                  className="mt-1 w-full p-2 rounded-xl border border-gray-300 font-black disabled:bg-gray-100"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          {canEdit ? (
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100"
            >
              Réinitialiser valeurs PIA
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-bold"
            >
              Fermer
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 rounded-xl bg-action-500 text-military-950 font-black text-xs uppercase shadow"
              >
                Enregistrer les formules
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormulaSettingsModal;
