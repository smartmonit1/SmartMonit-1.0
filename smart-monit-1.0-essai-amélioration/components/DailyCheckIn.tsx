import React, { useState } from 'react';
import { DailyForm } from '../types';

interface DailyCheckInProps {
  onSubmit: (form: DailyForm) => void;
}

const DailyCheckIn: React.FC<DailyCheckInProps> = ({ onSubmit }) => {
  const [form, setForm] = useState<Partial<DailyForm>>({
    sleepQuality: 5,
    fatigueLevel: 5,
    stressLevel: 5,
    painLevel: 0,
    painZone: ''
  });
  
  const [acceptedRules, setAcceptedRules] = useState(false);
  const [showRulesPopup, setShowRulesPopup] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedRules) {
      alert("Vous devez accepter le règlement des installations sportives.");
      return;
    }
    onSubmit({
      ...form,
      date: new Date().toISOString().split('T')[0]
    } as DailyForm);
  };

  const Slider = ({ label, val, setVal, min, max, lowLabel, highLabel, colorClass }: any) => (
    <div className="mb-6">
      <div className="flex justify-between mb-2">
        <label className="font-medium text-gray-700">{label}</label>
        <span className={`font-bold ${colorClass}`}>{val}/10</span>
      </div>
      <input 
        type="range" min={min} max={max} value={val} 
        onChange={(e) => setVal(Number(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-military-600"
      />
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-[fadeIn_0.3s_ease-out] max-h-[90vh] overflow-y-auto custom-scrollbar">
          <h2 className="text-2xl font-bold text-military-800 mb-2">Bilan Quotidien</h2>
          <p className="text-gray-500 mb-6 text-sm">Ces données adaptent votre séance du jour.</p>
          
          <form onSubmit={handleSubmit}>
            <Slider 
              label="Qualité du Sommeil" val={form.sleepQuality} setVal={(v:number)=>setForm({...form, sleepQuality: v})}
              min={0} max={10} lowLabel="Mauvais" highLabel="Excellent" colorClass="text-blue-600"
            />
            <Slider 
              label="Niveau de Fatigue" val={form.fatigueLevel} setVal={(v:number)=>setForm({...form, fatigueLevel: v})}
              min={0} max={10} lowLabel="En forme" highLabel="Épuisé" colorClass="text-orange-600"
            />
            <Slider 
              label="Niveau de Stress" val={form.stressLevel} setVal={(v:number)=>setForm({...form, stressLevel: v})}
              min={0} max={10} lowLabel="Zen" highLabel="Stressé" colorClass="text-purple-600"
            />
            <Slider 
              label="Douleur Corporelle" val={form.painLevel} setVal={(v:number)=>setForm({...form, painLevel: v})}
              min={0} max={10} lowLabel="Aucune" highLabel="Intense" colorClass="text-red-600"
            />

            {form.painLevel! > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Zone douloureuse</label>
                <input 
                  type="text" 
                  placeholder="Ex: Genou droit, Lombaires..."
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-military-500 focus:outline-none"
                  value={form.painZone}
                  onChange={(e) => setForm({...form, painZone: e.target.value})}
                  required
                />
              </div>
            )}

            <div className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <label className="flex items-start gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="mt-1 w-4 h-4 text-military-600 rounded focus:ring-military-500"
                  checked={acceptedRules}
                  onChange={(e) => setAcceptedRules(e.target.checked)}
                  required
                />
                <span className="text-sm text-gray-700">
                  J'accepte le{' '}
                  <button 
                    type="button" 
                    onClick={(e) => { e.preventDefault(); setShowRulesPopup(true); }}
                    className="text-military-600 font-bold underline hover:text-military-800"
                  >
                    règlement des installations sportives
                  </button>
                  {' '}et je m'engage à le respecter.
                </span>
              </label>
            </div>

            <button 
              type="submit"
              disabled={!acceptedRules}
              className={`w-full py-3 rounded-xl font-bold transition-colors ${acceptedRules ? 'bg-military-700 text-white hover:bg-military-800' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
            >
              Valider mon état
            </button>
          </form>
        </div>
      </div>

      {/* Rules Popup Modal */}
      {showRulesPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 animate-[fadeIn_0.2s_ease-out] flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center mb-4 border-b pb-4">
              <h2 className="text-xl font-black text-military-900 uppercase">Règlement des installations sportives</h2>
              <button 
                onClick={() => setShowRulesPopup(false)}
                className="text-gray-400 hover:text-gray-700 transition-colors"
              >
                <span className="material-icons">close</span>
              </button>
            </div>
            
            <div className="overflow-y-auto custom-scrollbar pr-2 space-y-4 text-sm text-gray-700 flex-grow">
              <h3 className="font-bold text-military-800">Article 1 : Accès et Tenue</h3>
              <p>L'accès aux installations sportives est réservé au personnel autorisé. Une tenue de sport adaptée et propre est exigée. Les chaussures de sport utilisées en salle doivent être propres et exclusivement réservées à cet usage.</p>
              
              <h3 className="font-bold text-military-800">Article 2 : Utilisation du Matériel</h3>
              <p>Le matériel doit être utilisé conformément à sa destination. Après chaque utilisation, le matériel (haltères, poids, tapis) doit être nettoyé et remis à sa place initiale. Il est interdit de laisser tomber brutalement les poids au sol.</p>
              
              <h3 className="font-bold text-military-800">Article 3 : Sécurité et Hygiène</h3>
              <p>L'utilisation d'une serviette est obligatoire sur les appareils et les tapis. Il est interdit de manger dans les salles de sport. Les bouteilles d'eau (fermées) sont autorisées. Tout accident ou matériel défectueux doit être immédiatement signalé au moniteur EPMS.</p>
              
              <h3 className="font-bold text-military-800">Article 4 : Comportement</h3>
              <p>Un comportement respectueux envers les autres usagers et le personnel d'encadrement est exigé. L'utilisation de matériel sonore (enceintes) est interdite sans autorisation préalable.</p>
              
              <h3 className="font-bold text-military-800">Article 5 : Responsabilité</h3>
              <p>L'administration décline toute responsabilité en cas de vol ou de perte d'objets personnels dans les vestiaires ou les installations sportives.</p>
            </div>
            
            <div className="mt-6 pt-4 border-t flex justify-end">
              <button 
                onClick={() => {
                  setAcceptedRules(true);
                  setShowRulesPopup(false);
                }}
                className="bg-military-700 text-white px-6 py-2 rounded-lg font-bold hover:bg-military-800 transition-colors"
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