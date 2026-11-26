import React, { useEffect, useMemo, useState } from 'react';
import { DailyForm, Equipment, Infrastructure, Session, UserProfile } from '../types';
import { analyzeDailyFormStructured } from '../utils/biometrics';
import { suggestLocalCoachAdaptation } from '../services/geminiService';
import { db } from '../services/mockDatabase';
import { useToast } from './ToastProvider';

interface CoachLaunchPanelProps {
  users: UserProfile[];
  infrastructures: Infrastructure[];
  equipment: Equipment[];
  onLaunch: (session: Session, participant: UserProfile) => void;
}

const localDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const CoachLaunchPanel: React.FC<CoachLaunchPanelProps> = ({
  users,
  infrastructures,
  equipment,
  onLaunch
}) => {
  const { showToast } = useToast();
  const [participantId, setParticipantId] = useState(users[0]?.nid || '');
  const [infrastructureId, setInfrastructureId] = useState(infrastructures[0]?.id || '');
  const [sessionId, setSessionId] = useState('');
  const [availableEquipmentIds, setAvailableEquipmentIds] = useState<string[]>([]);
  const [adaptedSession, setAdaptedSession] = useState<Session | null>(null);
  const [adaptationNotes, setAdaptationNotes] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const participant = users.find((item) => item.nid === participantId);
  const infrastructure = infrastructures.find((item) => item.id === infrastructureId);
  const sessions = useMemo(
    () => db.getGlobalSessions().filter((session) => session.content?.mainBlock?.length),
    []
  );
  const selectedSession = sessions.find((session) => session.id === sessionId);
  const facilityEquipment = equipment.filter((item) => item.infrastructureId === infrastructureId);
  const operationalEquipment = facilityEquipment.filter((item) => item.status === 'Operational');
  const todayForm: DailyForm | undefined = participant?.dailyForms.find(
    (form) => form.date === localDateKey(new Date())
  );
  const formAnalysis = todayForm ? analyzeDailyFormStructured(todayForm) : null;
  const hasUnresolvedMaterial = adaptationNotes.some((note) => note.includes('choisir une variante'));
  const hasCriticalPain = formAnalysis?.isCritical === true;

  useEffect(() => {
    setAvailableEquipmentIds(operationalEquipment.map((item) => item.id));
    setAdaptedSession(null);
    setAdaptationNotes([]);
  }, [infrastructureId, equipment]);

  useEffect(() => {
    setAdaptedSession(null);
    setAdaptationNotes([]);
  }, [participantId, sessionId]);

  const toggleEquipment = (item: Equipment) => {
    setAvailableEquipmentIds((current) =>
      current.includes(item.id)
        ? current.filter((id) => id !== item.id)
        : [...current, item.id]
    );
    setAdaptedSession(null);
    setAdaptationNotes([]);
  };

  const analyzeSession = async () => {
    if (!participant || !todayForm || !selectedSession || !infrastructure) return;
    setIsAnalyzing(true);
    try {
      const availableEquipment = operationalEquipment.filter((item) =>
        availableEquipmentIds.includes(item.id)
      );
      const suggestion = await suggestLocalCoachAdaptation(
        selectedSession,
        participant,
        todayForm,
        availableEquipment
      );
      setAdaptedSession({
        ...selectedSession,
        title: suggestion.title || selectedSession.title,
        description: suggestion.description || selectedSession.description,
        locationName: infrastructure.name,
        infrastructureId: infrastructure.id,
        content: {
          ...selectedSession.content,
          equipmentNeeded: suggestion.equipmentNeeded || selectedSession.content?.equipmentNeeded,
          warmup: suggestion.warmup || selectedSession.content?.warmup,
          mainBlock: suggestion.mainBlock || selectedSession.content?.mainBlock,
          cooldown: suggestion.cooldown || selectedSession.content?.cooldown,
          advice: suggestion.advice || selectedSession.content?.advice
        }
      });
      setAdaptationNotes(suggestion.adaptationNotes || []);
    } catch (error) {
      console.error('[SmartMonit] Échec de la proposition locale d’adaptation', error);
      showToast('Impossible de préparer la proposition. Réessayez ou choisissez une autre séance.', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <section className="space-y-5">
      <header className="rounded-3xl bg-gradient-to-br from-military-950 to-military-800 p-6 text-white shadow-lg">
        <div className="flex items-start gap-3">
          <span className="material-icons rounded-2xl bg-action-500 p-3 text-military-950" aria-hidden="true">
            auto_awesome
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-action-300">Assistant du coach · traitement local</p>
            <h2 className="mt-1 text-xl font-black sm:text-2xl">Préparer une séance adaptée</h2>
            <p className="mt-2 max-w-2xl text-sm text-military-100">
              L’assistant propose des ajustements à partir du bilan du jour et du matériel sélectionné.
              Vous vérifiez et validez la séance avant son lancement.
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <label className="space-y-1.5 text-xs font-bold text-military-700">
          <span>Membre</span>
          <select
            value={participantId}
            onChange={(event) => setParticipantId(event.target.value)}
            className="w-full rounded-xl border border-military-200 bg-white px-3 py-3 text-sm"
          >
            {users.map((item) => (
              <option key={item.nid} value={item.nid}>{item.name}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5 text-xs font-bold text-military-700">
          <span>Séance du catalogue</span>
          <select
            value={sessionId}
            onChange={(event) => setSessionId(event.target.value)}
            className="w-full rounded-xl border border-military-200 bg-white px-3 py-3 text-sm"
          >
            <option value="">Choisir une séance…</option>
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>{session.title}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5 text-xs font-bold text-military-700 lg:col-span-2">
          <span>Installation</span>
          <select
            value={infrastructureId}
            onChange={(event) => setInfrastructureId(event.target.value)}
            className="w-full rounded-xl border border-military-200 bg-white px-3 py-3 text-sm"
          >
            {infrastructures.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </label>
      </div>

      {participant && (
        <div className={`rounded-2xl border p-4 ${
          todayForm ? 'border-sky-200 bg-sky-50' : 'border-amber-200 bg-amber-50'
        }`}>
          {todayForm && formAnalysis ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-black text-military-900">Bilan du jour · {formAnalysis.zone === 'GREEN' ? 'forme habituelle' : formAnalysis.zone === 'ORANGE' ? 'vigilance' : 'récupération conseillée'}</h3>
                <span className="text-xs font-bold text-military-600">
                  Fatigue {todayForm.fatigueLevel}/10 · Sommeil {todayForm.sleepQuality}/10 · Douleur {todayForm.painLevel}/10
                </span>
              </div>
              <p className="mt-1 text-xs text-military-700">{formAnalysis.summary}</p>
              {todayForm.painLevel > 0 && todayForm.painZone && (
                <p className="mt-2 text-xs font-bold text-amber-900">Zone signalée : {todayForm.painZone}</p>
              )}
              {hasCriticalPain && (
                <p className="mt-2 text-xs font-black text-red-800">
                  Une douleur élevée a été signalée. L’assistant ne peut pas valider une séance : demandez un avis professionnel de santé avant toute activité.
                </p>
              )}
            </>
          ) : (
            <p className="text-sm font-bold text-amber-900">
              Aucun bilan forme n’a été renseigné aujourd’hui. Le membre doit saisir son ressenti avant que l’assistant puisse proposer une adaptation.
            </p>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-military-100 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-black text-military-900">Matériel disponible pour cette séance</h3>
            <p className="text-xs text-gray-500">Décochez les équipements indisponibles aujourd’hui.</p>
          </div>
          <span className="rounded-full bg-military-100 px-3 py-1 text-xs font-black text-military-700">
            {availableEquipmentIds.length} disponible(s)
          </span>
        </div>
        {facilityEquipment.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {facilityEquipment.map((item) => {
              const isOperational = item.status === 'Operational';
              const isSelected = availableEquipmentIds.includes(item.id);
              return (
                <label key={item.id} className={`flex items-center gap-3 rounded-xl border p-3 text-sm ${
                  isSelected ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-gray-50'
                }`}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={!isOperational}
                    onChange={() => toggleEquipment(item)}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  <span className="min-w-0 flex-1 font-bold text-military-800">{item.name}</span>
                  {!isOperational && <span className="text-[10px] font-black uppercase text-amber-800">Indisponible</span>}
                </label>
              );
            })}
          </div>
        ) : (
          <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600">Aucun matériel suivi pour cette installation. Vérifiez les besoins de la séance avant de la lancer.</p>
        )}
      </div>

      <button
        type="button"
        onClick={analyzeSession}
        disabled={!participant || !todayForm || !selectedSession || !infrastructure || isAnalyzing}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-action-500 px-5 py-4 text-sm font-black uppercase tracking-wide text-military-950 transition hover:bg-action-400 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
      >
        <span className={`material-icons ${isAnalyzing ? 'animate-spin' : ''}`} aria-hidden="true">
          {isAnalyzing ? 'progress_activity' : 'auto_awesome'}
        </span>
        {isAnalyzing ? 'Analyse locale en cours…' : 'Proposer une adaptation'}
      </button>

      {adaptedSession && (
        <div className="space-y-4 rounded-3xl border border-emerald-200 bg-emerald-50/60 p-5">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800">Proposition à valider · aucun lancement automatique</span>
            <h3 className="mt-1 text-lg font-black text-military-950">{adaptedSession.title}</h3>
            <p className="mt-1 text-sm text-gray-700">{adaptedSession.description}</p>
          </div>

          {adaptationNotes.length > 0 && (
            <ul className="space-y-2" aria-label="Explications des adaptations">
              {adaptationNotes.map((note, index) => (
                <li key={`${index}-${note}`} className="flex gap-2 rounded-xl bg-white p-3 text-sm text-military-800">
                  <span className="material-icons text-base text-sky-700" aria-hidden="true">info</span>
                  {note}
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-2">
            {adaptedSession.content?.mainBlock?.map((block, index) => (
              <div key={`${block.exercise}-${index}`} className="flex flex-wrap justify-between gap-2 rounded-xl bg-white p-3 text-sm">
                <span className="font-bold text-military-900">{block.exercise}</span>
                <span className="text-gray-600">{block.prescription}{block.rest ? ` · repos ${block.rest}` : ''}</span>
              </div>
            ))}
          </div>

          {adaptedSession.content?.advice && (
            <p className="rounded-xl bg-sky-50 p-3 text-sm text-sky-900">{adaptedSession.content.advice}</p>
          )}

          <button
            type="button"
            disabled={!participant || hasUnresolvedMaterial || hasCriticalPain}
            onClick={() => participant && onLaunch(adaptedSession, participant)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-military-900 px-5 py-4 text-sm font-black uppercase tracking-wide text-white transition hover:bg-military-800 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            <span className="material-icons text-action-400" aria-hidden="true">play_circle</span>
            Valider et lancer pour {participant?.name || 'le membre'}
          </button>
          {hasUnresolvedMaterial && (
            <p className="text-center text-xs font-bold text-amber-900">
              La séance contient un besoin matériel non couvert. Choisissez une séance avec une alternative documentée avant de la lancer.
            </p>
          )}
          {hasCriticalPain && (
            <p className="text-center text-xs font-bold text-red-800">
              Le lancement est bloqué en raison du signalement de douleur élevée.
            </p>
          )}
        </div>
      )}
    </section>
  );
};

export default CoachLaunchPanel;
