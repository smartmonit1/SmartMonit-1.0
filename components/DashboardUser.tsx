import React, { useState, useEffect, useMemo } from 'react';
import {
  UserProfile,
  DailyForm,
  Program,
  Infrastructure,
  ProgramStatus,
  CollectiveSession,
  Session,
  SportsRoute
} from '../types';
import DailyCheckIn from './DailyCheckIn';
import { generateFlashSession, suggestSessionModifications } from '../services/geminiService';
import { calculateVMA, analyzeDailyFormStructured, adaptPrescription, calculateReadinessScore } from '../utils/biometrics';
import { db } from '../services/mockDatabase';
import { getBaseName } from '../utils/bases';
import { useToast } from './ToastProvider';
import ExerciseIllustration from './ExerciseIllustration';

interface DashboardUserProps {
  user: UserProfile;
  onUpdateUser: (u: UserProfile) => void;
  onOpenLibrary: (tab?: 'sessions' | 'programs' | 'global' | 'routes') => void;
  onOpenAgenda: () => void;
  onOpenProgram: (programId: string) => void;
  onStartSession: (session: Session, sessionType?: 'FLASH' | 'PROGRAM' | 'COLLECTIVE' | 'FREE' | 'LIBRARY') => void;
}

const PROGRAM_OBJECTIVES = [
  'Préparation CCPM',
  'Renforcement Musculaire',
  'Amélioration Cardio (VMA)',
  'Préparation Stage Commando',
  'Prévention TMS / Posture Métier',
  'Remise en forme',
  'Perte de poids',
  'Réathlétisation',
  'Autre'
];

const DashboardUser: React.FC<DashboardUserProps> = ({
  user,
  onUpdateUser,
  onOpenLibrary,
  onOpenAgenda,
  onOpenProgram,
  onStartSession
}) => {
  const { showToast } = useToast();

  const [clockNow, setClockNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setClockNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const todayDate = clockNow;
  const nowTimeKey = `${String(todayDate.getHours()).padStart(2, '0')}:${String(todayDate.getMinutes()).padStart(2, '0')}`;
  const toLocalDateKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const todayStr = toLocalDateKey(todayDate);

  const hasDaily = user.dailyForms.find((d) => d.date === todayStr);
  const [showDaily, setShowDaily] = useState(!hasDaily);
  const [generating, setGenerating] = useState(false);

  // Sport Autonome State
  const [flashMode, setFlashMode] = useState<'generate' | 'search' | 'free'>('generate');
  const [flashSession, setFlashSession] = useState<any>(null);
  const [flashLocation, setFlashLocation] = useState('Chez moi');
  const [flashType, setFlashType] = useState('Musculation');
  const [flashDuration, setFlashDuration] = useState(40);
  const [filteredSessions, setFilteredSessions] = useState<Session[]>([]);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [modifiedSession, setModifiedSession] = useState<any>(null);
  const [adaptingTargetId, setAdaptingTargetId] = useState<string | null>(null);

  // Synchronized DB State
  const [infras, setInfras] = useState<Infrastructure[]>([]);
  const [routes, setRoutes] = useState<SportsRoute[]>([]);
  const [allCollectiveSessions, setAllCollectiveSessions] = useState<CollectiveSession[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [bookingFilter, setBookingFilter] = useState<'all' | 'available' | 'mine'>('all');

  useEffect(() => {
    const fetchDB = () => {
      const baseInfras = db.getInfrastructures().filter((i) => i.serviceId === user.serviceId);
      const baseRoutes = db.getRoutes().filter((r) => r.serviceId === user.serviceId);
      setInfras(baseInfras);
      setRoutes(baseRoutes);
      setAllCollectiveSessions(db.getCollectiveSessions().filter((c) => c.serviceId === user.serviceId));
      setPrograms(db.getPrograms());
    };
    fetchDB();
    window.addEventListener('db_updated', fetchDB);
    return () => window.removeEventListener('db_updated', fetchDB);
  }, [user.serviceId]);

  // Synchronise le lieu par défaut quand on passe en Séance libre
  useEffect(() => {
    if (flashMode === 'free' && flashLocation === 'Chez moi' && infras.length > 0) {
      setFlashLocation(infras[0].name);
    }
  }, [flashMode, infras]);

  const [selectedCollSession, setSelectedCollSession] = useState<CollectiveSession | null>(null);

  // Program Request State
  const [reqProgram, setReqProgram] = useState(false);
  const [goal, setGoal] = useState('');
  const [selectedObjective, setSelectedObjective] = useState('');
  const [weeks, setWeeks] = useState(6);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);

  const upcomingCollectiveSessions = useMemo(() => {
    const upcoming: Array<{ session: CollectiveSession; date: Date; dateKey: string }> = [];
    for (let offset = 0; offset < 7; offset += 1) {
      const date = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() + offset);
      const dateKey = toLocalDateKey(date);
      const jsDay = date.getDay();
      const appDay = jsDay === 0 ? 7 : jsDay;
      allCollectiveSessions.forEach((session) => {
        const occursOnDate = session.eventDate ? session.eventDate === dateKey : session.dayOfWeek === appDay;
        const alreadyEndedToday = dateKey === todayStr && session.timeEnd <= nowTimeKey;
        if (!session.cancelled && occursOnDate && !alreadyEndedToday) upcoming.push({ session, date, dateKey });
      });
    }
    return upcoming.sort((a, b) =>
      a.dateKey === b.dateKey
        ? a.session.timeStart.localeCompare(b.session.timeStart)
        : a.dateKey.localeCompare(b.dateKey)
    );
  }, [allCollectiveSessions, todayStr, nowTimeKey, todayDate]);

  const visibleCollectiveSessions = upcomingCollectiveSessions.filter(({ session }) => {
    if (bookingFilter === 'available') {
      return (
        session.participants.length < session.maxParticipants &&
        !session.participants.includes(user.nid) &&
        !session.waitlist?.includes(user.nid)
      );
    }
    if (bookingFilter === 'mine') {
      return session.participants.includes(user.nid) || Boolean(session.waitlist?.includes(user.nid));
    }
    return true;
  });

  // Programmes individuels OU assignés via personnalisation de masse
  const userPrograms = useMemo(
    () =>
      programs.filter(
        (p) =>
          p.userId === user.nid ||
          (p.assignedUserIds && p.assignedUserIds.includes(user.nid)) ||
          (p.assignedUnit && user.unit && p.assignedUnit === user.unit && !p.isTemplate)
      ),
    [programs, user.nid, user.unit]
  );

  const activeProgram = userPrograms.find((p) => p.status === ProgramStatus.VALIDATED);
  const pendingProgram = userPrograms.find((p) => p.status === ProgramStatus.PENDING);

  const nextProgramSession = useMemo(() => {
    if (!activeProgram) return null;
    return activeProgram.sessions.find((s) => !s.isCompleted) || null;
  }, [activeProgram]);

  const completedInActive = activeProgram
    ? activeProgram.sessions.filter((s) => s.isCompleted).length
    : 0;

  const dailyAnalysis = hasDaily ? analyzeDailyFormStructured(hasDaily) : null;
  const service = db.getServiceById(user.serviceId);
  const vma = calculateVMA(user.tests);

  const handleDailySubmit = (form: DailyForm) => {
    const filteredForms = user.dailyForms.filter((d) => d.date !== form.date);
    const updatedUser: UserProfile = {
      ...user,
      dailyForms: [...filteredForms, form],
      rulesAcceptedAt: form.date
    };
    onUpdateUser(updatedUser);
    setShowDaily(false);
    showToast('Bilan quotidien validé. Vos intensités sont adaptées.', 'success');
  };

  const handleToggleJoin = (sessionId: string) => {
    const session = allCollectiveSessions.find((item) => item.id === sessionId);
    if (!session) {
      showToast('Cette séance n’est plus disponible. Actualisez le planning.', 'error');
      return;
    }
    const alreadyJoined = session.participants.includes(user.nid) || Boolean(session.waitlist?.includes(user.nid));
    const location = infras.find((infra) => infra.name === session.locationName);
    if (!alreadyJoined && location && location.status !== 'Operational') {
      showToast(
        `Inscription impossible : ${location.name} est ${location.status === 'Closed' ? 'fermée' : 'en maintenance'}.`,
        'warning'
      );
      return;
    }
    const updated = db.toggleSessionJoin(sessionId, user.nid);
    if (updated) {
      setAllCollectiveSessions(db.getCollectiveSessions().filter((c) => c.serviceId === user.serviceId));
      if (updated.participants.includes(user.nid)) {
        showToast(`Inscription confirmée : ${updated.title}`, 'success');
      } else if (updated.waitlist?.includes(user.nid)) {
        showToast(`Créneau complet : vous êtes en liste d'attente pour ${updated.title}`, 'info');
      } else {
        showToast(`Désinscription enregistrée : ${updated.title}`, 'info');
      }
    }
  };

  const handleSearchSessions = () => {
    if (!hasDaily) {
      setShowDaily(true);
      return;
    }
    const globals = db.getGlobalSessions();
    const typeUpper = flashType.toUpperCase();
    const filtered = globals.filter((s) => {
      const sType = (s.workoutType || s.type || '').toUpperCase();
      const matchType =
        (typeUpper.includes('MUSCU') && sType.includes('MUSCU')) ||
        (typeUpper.includes('POIDS') && (s.material?.includes('poids-corps') || sType === 'FOR TIME')) ||
        (typeUpper.includes('COURSE') && sType.includes('CARDIO')) ||
        (typeUpper.includes('CROSS') && ['AMRAP', 'EMOM', 'TABATA', 'FOR TIME', 'HIIT', 'HYROX'].includes(sType)) ||
        (typeUpper.includes('MOBIL') && (sType.includes('MOBIL') || sType.includes('PILATES')));
      const matchDuration = s.durationMinutes === 0 || s.durationMinutes <= flashDuration + 10;
      return matchType && matchDuration;
    });
    setFilteredSessions(filtered.slice(0, 12));
    setSearchAttempted(true);
  };

  const handleAdaptSession = async (session: Session) => {
    if (!hasDaily) {
      setShowDaily(true);
      return;
    }
    setGenerating(true);
    setAdaptingTargetId(session.id);
    try {
      const modifiedContent = await suggestSessionModifications(session, user, hasDaily);
      setModifiedSession({
        ...session,
        title: modifiedContent.title || session.title,
        description: modifiedContent.description || session.description,
        content: {
          equipmentNeeded: modifiedContent.equipmentNeeded || session.content?.equipmentNeeded,
          warmup: modifiedContent.warmup || session.content?.warmup,
          mainBlock: modifiedContent.mainBlock || session.content?.mainBlock,
          cooldown: modifiedContent.cooldown || session.content?.cooldown,
          advice: modifiedContent.advice || session.content?.advice
        }
      });
      showToast('Proposition d\'adaptation générée selon votre bilan du jour.', 'success');
    } catch (e) {
      console.error(e);
      showToast('Erreur lors de l\'adaptation de la séance.', 'error');
    } finally {
      setGenerating(false);
      setAdaptingTargetId(null);
    }
  };

  const handleFlashGen = async () => {
    if (!hasDaily) {
      setShowDaily(true);
      return;
    }
    setGenerating(true);
    setFlashSession(null);
    setModifiedSession(null);

    const exerciseLibrary = db.getExerciseLibrary();
    const allEquipment = db.getEquipment();
    const selectedInfra = infras.find((i) => i.name === flashLocation);
    const availableEquipment = selectedInfra
      ? allEquipment.filter((e) => e.infrastructureId === selectedInfra.id && e.status === 'Operational')
      : [];

    try {
      const session = await generateFlashSession(
        user,
        hasDaily,
        flashLocation,
        flashType,
        flashDuration,
        infras,
        exerciseLibrary,
        availableEquipment
      );

      setFlashSession({
        id: `flash_${Date.now()}`,
        infrastructureId: selectedInfra?.id || 'any',
        title: session.title,
        type: flashType,
        workoutType: flashType.toUpperCase().includes('COURSE')
          ? 'CARDIO'
          : flashType.toUpperCase().includes('CROSS')
          ? 'HIIT'
          : flashType.toUpperCase().includes('MOBIL')
          ? 'MOBILITE'
          : 'MUSCU',
        description: session.description,
        durationMinutes: flashDuration,
        locationName: flashLocation,
        isCompleted: false,
        content: {
          equipmentNeeded: session.equipmentNeeded,
          warmup: session.warmup,
          mainBlock: session.mainBlock,
          cooldown: session.cooldown,
          advice: session.advice
        }
      });
      showToast('Séance flash personnalisée prête !', 'success');
    } catch (e) {
      console.error(e);
      showToast('Erreur lors de la génération de la séance.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleProgramRequest = () => {
    const finalGoal = selectedObjective === 'Autre' ? goal : selectedObjective;
    if (!finalGoal || !finalGoal.trim()) {
      showToast('Veuillez sélectionner ou préciser votre objectif.', 'warning');
      return;
    }
    const locs = selectedLocations.length > 0 ? selectedLocations : [infras[0]?.name || 'Chez moi'];

    const newProgram: Program = {
      id: `prog_${Date.now()}`,
      userId: user.nid,
      title: `Demande : ${finalGoal.slice(0, 35)}${finalGoal.length > 35 ? '...' : ''}`,
      goal: finalGoal,
      startDate: todayStr,
      durationWeeks: weeks,
      sessionsPerWeek,
      requestedLocations: locs,
      status: ProgramStatus.PENDING,
      sessions: []
    };

    db.addProgram(newProgram);
    db.addNotification({
      id: `prog_req_${Date.now()}`,
      title: 'Nouvelle demande de programme',
      message: `${user.name} demande un programme "${finalGoal}" (${weeks} sem, ${sessionsPerWeek} séa/sem).`,
      type: 'info',
      category: 'PROGRAM',
      timestamp: Date.now(),
      read: false,
      serviceId: user.serviceId,
      targetRoles: ['MONITOR' as any]
    });
    setReqProgram(false);
    showToast('Demande transmise à votre cellule EPMS.', 'success');
  };

  const handleLocationToggle = (loc: string) => {
    setSelectedLocations((prev) => (prev.includes(loc) ? prev.filter((l) => l !== loc) : [...prev, loc]));
  };

  const launchFreeSession = () => {
    if (!hasDaily) {
      setShowDaily(true);
      return;
    }
    const selectedInfra = infras.find((i) => i.name === flashLocation);
    const selectedRoute = routes.find((r) => r.name === flashLocation);
    const session: Session = {
      id: `free_${Date.now()}`,
      infrastructureId: selectedInfra?.id || selectedRoute?.id || 'home',
      title: `Séance Libre — ${flashLocation}`,
      type: 'LIBRE',
      workoutType: 'MUSCU',
      description: `Entraînement autonome déclaré au Registre Sport Unité (${flashLocation}).`,
      durationMinutes: 0,
      locationName: flashLocation,
      isCompleted: false,
      content: {
        mainBlock: [{ exercise: 'Entraînement en autonomie', prescription: 'Chronomètre libre actif', rest: '-' }],
        advice: 'Votre présence est enregistrée au Registre Sport Unité (Directive 17615).'
      }
    };
    onStartSession(session, 'FREE');
  };

  const zoneBadge = () => {
    if (!dailyAnalysis) return null;
    const styles = {
      GREEN: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      ORANGE: 'bg-amber-100 text-amber-800 border-amber-200',
      RED: 'bg-red-100 text-red-800 border-red-200',
      BLACK: 'bg-red-900 text-white border-red-950'
    }[dailyAnalysis.zone];
    const labels = {
      GREEN: 'Zone Verte (100%)',
      ORANGE: 'Zone Orange (-15%)',
      RED: 'Zone Rouge (Récup)',
      BLACK: 'Zone Noire (Alerte)'
    }[dailyAnalysis.zone];
    return (
      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black border ${styles}`}>
        {labels}
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-8 animate-[fadeIn_0.3s]">
      {showDaily && (
        <DailyCheckIn
          serviceId={user.serviceId}
          onSubmit={handleDailySubmit}
          onCancel={hasDaily ? () => setShowDaily(false) : undefined}
        />
      )}

      {/* Hero Utilisateur */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-military-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-military-900">Bonjour, {user.name}</h2>
          <p className="text-military-500 text-xs font-semibold mt-0.5">
            {getBaseName(user.serviceId)} {user.unit ? `• ${user.unit}` : ''}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg font-black">
              VMA : {vma} km/h
            </span>
            <span className="px-2.5 py-1 bg-military-900 text-action-400 rounded-lg font-black">
              Readiness : {calculateReadinessScore(hasDaily).score}/100
            </span>
            <span className="px-2.5 py-1 bg-military-50 text-military-800 border border-military-200 rounded-lg font-bold">
              {user.jobType}
            </span>
            {zoneBadge()}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onOpenAgenda}
            className="px-4 py-2.5 rounded-xl font-black uppercase text-xs tracking-wider bg-military-900 text-white hover:bg-military-800 shadow-sm transition-all flex items-center gap-1.5"
          >
            <span className="material-icons text-base text-action-400">meeting_room</span>
            Réserver Salle / Cours
          </button>
          <button
            onClick={() => setShowDaily(true)}
            className={`px-4 py-2.5 rounded-xl font-black uppercase text-xs tracking-wider shadow-sm transition-all active:scale-95 flex items-center gap-2 ${
              hasDaily
                ? 'bg-military-100 text-military-800 hover:bg-military-200'
                : 'bg-action-500 text-military-950 hover:bg-action-400'
            }`}
          >
            <span className="material-icons text-base">monitor_heart</span>
            {hasDaily ? 'Modifier mon bilan' : 'Faire mon Bilan Forme'}
          </button>
        </div>
      </div>

      {/* Alerte Critique Zone Noire / Rouge */}
      {dailyAnalysis && (dailyAnalysis.zone === 'BLACK' || dailyAnalysis.zone === 'RED') && (
        <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded-r-2xl shadow-sm flex items-start gap-3">
          <span className="material-icons text-red-600 text-2xl shrink-0">warning</span>
          <div>
            <p className="text-red-900 font-black text-sm">{dailyAnalysis.summary}</p>
            <p className="text-red-700 text-xs mt-1">
              L'adaptation automatique bascule vos séances vers la récupération active et la mobilité pour prévenir toute blessure.
            </p>
          </div>
        </div>
      )}

      {/* Alerte ORFA dédiée (Section 4.9.3 : fatigue > 6 & stress > 6 ou sommeil < 4) */}
      {dailyAnalysis?.orfaRecommended && (
        <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <span className="material-icons">psychology</span>
            </div>
            <div>
              <h4 className="font-black text-xs uppercase text-indigo-900 tracking-wider">
                Accompagnement ORFA Recommandé
              </h4>
              <p className="text-xs text-indigo-800 mt-0.5 leading-relaxed">
                Votre bilan traduit une charge de stress/fatigue importante ou un sommeil réduit. Contactez un moniteur ORFA pour optimiser votre récupération :{' '}
                <strong>{service?.orfaContact || 'Bureau EPMS / Référent ORFA de votre base'}</strong>.
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenLibrary('global')}
            className="shrink-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-black uppercase tracking-wider"
          >
            Séance Mobilité / ORFA
          </button>
        </div>
      )}

      {/* Réservations collectives */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-military-100">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
          <h3 className="font-black text-base uppercase flex items-center gap-2 text-military-900">
            <span className="material-icons text-action-600">groups</span>
            Cours et réservations
          </h3>
          <button
            onClick={onOpenAgenda}
            className="text-xs font-black uppercase text-action-700 hover:text-action-800 flex items-center gap-1 self-start sm:self-auto"
          >
            Planning complet <span className="material-icons text-base">arrow_forward</span>
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
          {[
            { id: 'all', label: '7 prochains jours' },
            { id: 'available', label: 'Places disponibles' },
            { id: 'mine', label: 'Mes inscriptions' }
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setBookingFilter(filter.id as 'all' | 'available' | 'mine')}
              aria-pressed={bookingFilter === filter.id}
              className={`shrink-0 px-3 py-2 rounded-xl text-[11px] font-black uppercase transition-colors ${
                bookingFilter === filter.id
                  ? 'bg-military-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {visibleCollectiveSessions.length > 0 ? (
          <div className="space-y-3">
            {visibleCollectiveSessions.map(({ session: cs, date, dateKey }) => {
              const isJoined = cs.participants.includes(user.nid);
              const isWaitlisted = cs.waitlist?.includes(user.nid);
              const isFull = cs.participants.length >= cs.maxParticipants;
              const spotsLeft = Math.max(0, cs.maxParticipants - cs.participants.length);
              const location = infras.find((infra) => infra.name === cs.locationName);
              const locationUnavailable = Boolean(location && location.status !== 'Operational');

              return (
                <div
                  key={`${cs.id}_${dateKey}`}
                  className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl border transition-all ${
                    isJoined
                      ? 'bg-emerald-50/70 border-emerald-200'
                      : isWaitlisted
                      ? 'bg-amber-50/70 border-amber-200'
                      : 'bg-gray-50 border-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-grow">
                    <div className="bg-military-900 text-white px-2.5 py-1.5 rounded-xl text-[10px] font-black flex flex-col items-center min-w-[62px]">
                      <span>{cs.timeStart}</span>
                      <span className="opacity-30">—</span>
                      <span>{cs.timeEnd}</span>
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="text-[10px] font-black uppercase tracking-wide text-action-700 mb-1">
                        {dateKey === todayStr
                          ? "Aujourd'hui"
                          : dateKey === toLocalDateKey(new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() + 1))
                          ? 'Demain'
                          : new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date)}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => setSelectedCollSession(cs)}
                          className="font-black text-sm text-military-900 hover:text-action-600 text-left transition-colors"
                        >
                          {cs.title}
                        </button>
                        {cs.category === 'CCPM' && (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-red-100 text-red-700">CCPM</span>
                        )}
                        {cs.category === 'EVENEMENT' && (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-action-100 text-action-700">Événement</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5 flex-wrap">
                        <span className={`font-bold ${locationUnavailable ? 'text-red-700' : 'text-military-600'}`}>
                          {locationUnavailable
                            ? `${location?.status === 'Closed' ? 'Installation fermée' : 'Installation en maintenance'}`
                            : isFull
                            ? `Complet · ${cs.waitlist?.length || 0} en attente`
                            : `${spotsLeft} places disponibles`}
                        </span>
                        <span>• {cs.locationName}</span>
                        <span>• {cs.instructorName}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleJoin(cs.id)}
                    disabled={locationUnavailable && !isJoined && !isWaitlisted}
                    title={locationUnavailable ? 'Réservation désactivée : installation indisponible' : undefined}
                    className={`shrink-0 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                      isJoined
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-red-50 hover:text-red-700 hover:border-red-200'
                        : isWaitlisted
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : locationUnavailable
                        ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                        : isFull
                        ? 'bg-military-100 text-military-800 hover:bg-military-200'
                        : 'bg-action-500 text-military-950 hover:bg-action-400 shadow-sm'
                    }`}
                  >
                    <span className="material-icons text-sm">
                      {isJoined ? 'check_circle' : isWaitlisted ? 'hourglass_top' : isFull ? 'queue' : 'login'}
                    </span>
                    {isJoined ? 'Inscrit · annuler' : isWaitlisted ? 'En attente · quitter' : isFull ? 'Liste d\'attente' : 'Réserver'}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6">
            <span className="material-icons text-3xl text-gray-300">event_busy</span>
            <p className="text-gray-500 text-sm font-bold mt-2">
              {bookingFilter === 'mine'
                ? 'Aucune inscription à venir.'
                : bookingFilter === 'available'
                ? 'Aucune place disponible sur cette période.'
                : `Aucun cours collectif prévu dans les 7 prochains jours sur ${getBaseName(user.serviceId)}.`}
            </p>
            {bookingFilter !== 'all' && (
              <button onClick={() => setBookingFilter('all')} className="mt-2 text-xs font-black uppercase text-action-700 hover:underline">
                Voir tous les cours
              </button>
            )}
          </div>
        )}
      </div>

      {/* Mon Programme & Prochaine Séance */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-military-100 space-y-5">
        <div className="flex justify-between items-center">
          <h3 className="font-black text-base uppercase flex items-center gap-2 text-military-900">
            <span className="material-icons text-military-600">assignment</span>
            Mon Programme EPMS
          </h3>
          {activeProgram && (
            <button
              onClick={() => onOpenProgram(activeProgram.id)}
              className="text-xs font-black uppercase text-action-700 hover:underline"
            >
              Voir tout ({completedInActive}/{activeProgram.sessions.length})
            </button>
          )}
        </div>

        {activeProgram ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-emerald-900 text-sm">{activeProgram.title}</span>
                  <span className="text-[9px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-black uppercase">Actif</span>
                </div>
                <p className="text-xs text-emerald-700 mt-0.5">{activeProgram.goal}</p>
              </div>
              <span className="text-xs font-black text-emerald-800 shrink-0">
                {activeProgram.durationWeeks} sem • {activeProgram.sessionsPerWeek} séa/sem
              </span>
            </div>

            {nextProgramSession ? (
              <div className="bg-military-50 p-5 rounded-2xl border border-military-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex-grow min-w-0 w-full">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase bg-military-900 text-white px-2 py-0.5 rounded">
                      Prochaine séance • {nextProgramSession.type}
                    </span>
                    <span className="text-xs font-bold text-military-500 break-words">
                      {nextProgramSession.durationMinutes} min • {nextProgramSession.locationName || 'Base'}
                    </span>
                  </div>
                  <h4 className="text-lg font-black text-military-900 break-words">{nextProgramSession.title}</h4>
                  <p className="text-xs text-military-600 mt-1 break-words">{nextProgramSession.description}</p>
                  {nextProgramSession.content?.mainBlock && nextProgramSession.content.mainBlock.length > 0 && (
                    <div className="flex items-center gap-2 mt-3 overflow-x-auto no-scrollbar pb-0.5">
                      {nextProgramSession.content.mainBlock.slice(0, 4).map((b, i) => (
                        <div key={i} className="flex items-center gap-1.5 bg-white pr-2.5 rounded-xl border border-military-200 shrink-0 max-w-[170px]">
                          <ExerciseIllustration exerciseName={b.exercise} fallbackType={nextProgramSession.type} size="xs" />
                          <span className="text-[10px] font-bold text-military-800 truncate">{b.exercise}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto shrink-0">
                  <button
                    onClick={() => handleAdaptSession(nextProgramSession)}
                    disabled={generating}
                    className="px-4 py-3 bg-white border border-military-300 text-military-900 rounded-xl font-black uppercase text-[11px] hover:bg-action-50 hover:border-action-500 transition-all flex items-center justify-center gap-1.5"
                  >
                    <span className="material-icons text-sm text-action-600">auto_awesome</span>
                    {generating && adaptingTargetId === nextProgramSession.id ? 'Adaptation...' : 'Adapter Forme'}
                  </button>
                  <button
                    onClick={() => onStartSession(nextProgramSession, 'PROGRAM')}
                    className="px-6 py-3 bg-military-900 text-white rounded-xl font-black uppercase text-[11px] tracking-wider shadow-lg hover:bg-military-800 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    Démarrer <span className="material-icons text-sm text-action-400">play_arrow</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-action-50 border border-action-200 rounded-2xl text-center">
                <p className="text-sm font-black text-military-900">Bravo ! Toutes les séances du programme sont terminées.</p>
                <button
                  onClick={() => setReqProgram(true)}
                  className="mt-2 px-4 py-2 bg-military-900 text-white rounded-xl text-xs font-black uppercase"
                >
                  Demander un nouveau cycle
                </button>
              </div>
            )}
          </div>
        ) : pendingProgram ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3">
            <div>
              <span className="font-black text-amber-900 text-sm block">Demande en cours d'étude</span>
              <p className="text-xs text-amber-800 mt-0.5">
                Objectif « {pendingProgram.goal} » ({pendingProgram.durationWeeks} sem) transmis à la cellule EPMS.
              </p>
            </div>
            <span className="material-icons text-amber-600 animate-pulse text-2xl">hourglass_empty</span>
          </div>
        ) : !reqProgram ? (
          <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
            <p className="text-gray-500 mb-3 text-sm font-medium">Aucun programme actif actuellement.</p>
            <button
              onClick={() => setReqProgram(true)}
              className="px-6 py-2.5 bg-military-900 text-white font-black uppercase text-xs tracking-wider rounded-xl hover:bg-military-800 transition-all shadow-sm"
            >
              Demander un programme au moniteur
            </button>
          </div>
        ) : (
          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 space-y-4 animate-[fadeIn_0.2s]">
            <h4 className="font-black text-military-900 uppercase tracking-wider text-xs">Paramètres de la demande</h4>
            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase mb-1 block">Objectif principal</label>
              <select
                className="w-full p-3 border border-gray-200 rounded-xl bg-white text-sm font-bold outline-none focus:border-action-500"
                value={selectedObjective}
                onChange={(e) => setSelectedObjective(e.target.value)}
              >
                <option value="">-- Sélectionner --</option>
                {PROGRAM_OBJECTIVES.map((obj) => (
                  <option key={obj} value={obj}>{obj}</option>
                ))}
              </select>
              {selectedObjective === 'Autre' && (
                <textarea
                  className="w-full mt-2 p-3 border border-gray-200 rounded-xl text-sm bg-white outline-none focus:border-action-500"
                  placeholder="Précisez votre objectif, échéance ou contrainte..."
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                />
              )}
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase mb-2 block">Lieux de pratique souhaités</label>
              <div className="flex flex-wrap gap-2">
                {['Chez moi', ...infras.map((i) => i.name)].map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => handleLocationToggle(loc)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      selectedLocations.includes(loc)
                        ? 'bg-military-900 text-white border-military-900'
                        : 'bg-white text-military-700 border-gray-200 hover:border-military-400'
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase mb-1 block">Durée</label>
                <select className="w-full p-2.5 border border-gray-200 rounded-xl bg-white text-sm font-bold" value={weeks} onChange={(e) => setWeeks(Number(e.target.value))}>
                  {[4, 6, 8, 12, 16].map((n) => <option key={n} value={n}>{n} semaines</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase mb-1 block">Fréquence</label>
                <select className="w-full p-2.5 border border-gray-200 rounded-xl bg-white text-sm font-bold" value={sessionsPerWeek} onChange={(e) => setSessionsPerWeek(Number(e.target.value))}>
                  {[2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} séances / sem</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setReqProgram(false)} className="flex-1 py-3 text-gray-500 font-bold text-xs uppercase">Annuler</button>
              <button onClick={handleProgramRequest} className="flex-[2] bg-military-900 text-white font-black py-3 rounded-xl uppercase text-xs tracking-wider shadow-lg">
                Envoyer la demande
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sport Autonome (Générer / Rechercher / Séance libre -> Registre Sport Unité) */}
      <div className="bg-gradient-to-br from-military-800 to-military-950 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <span className="material-icons text-9xl">bolt</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5 relative z-10">
          <div>
            <h3 className="font-black text-lg uppercase flex items-center gap-2">
              <span className="material-icons text-action-400">electric_bolt</span>
              Sport Autonome & Registre Sport
            </h3>
            <p className="text-military-300 text-xs">
              Toute séance démarrée alimente automatiquement le Registre Sport Unité (statut « en service »).
            </p>
          </div>
          <button
            onClick={() => onOpenLibrary('global')}
            className="text-[11px] font-black uppercase text-action-400 hover:underline self-start sm:self-center"
          >
            Ouvrir les +50 WODs →
          </button>
        </div>

        <div className="flex gap-2 mb-5 bg-black/30 p-1.5 rounded-2xl relative z-10" role="group" aria-label="Mode de séance autonome">
          {[
            { id: 'generate', label: 'Générer (IA)' },
            { id: 'search', label: 'Rechercher' },
            { id: 'free', label: 'Séance libre' }
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={flashMode === m.id}
              onClick={() => {
                setFlashMode(m.id as any);
                setSearchAttempted(false);
                setFilteredSessions([]);
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                flashMode === m.id ? 'bg-action-500 text-military-950 shadow' : 'text-military-200 hover:text-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="space-y-4 relative z-10">
          {flashMode === 'free' ? (
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-military-300 block mb-1">
                  Lieu de pratique ou Parcours officiel (Registre Unité)
                </label>
                <select
                  className="w-full bg-military-900 border border-military-600 rounded-xl p-3 text-sm font-bold text-white outline-none focus:border-action-500"
                  value={flashLocation}
                  onChange={(e) => setFlashLocation(e.target.value)}
                >
                  <optgroup label="Infrastructures de votre base">
                    {infras.map((infra) => (
                      <option key={infra.id} value={infra.name}>{infra.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Parcours officiels (Course, VTT, Route)">
                    {routes.map((route) => (
                      <option key={route.id} value={route.name}>{route.name} ({route.type})</option>
                    ))}
                  </optgroup>
                  <option value="Extérieur / Hors base">Extérieur / Hors base</option>
                </select>
              </div>
              <button
                onClick={launchFreeSession}
                className="w-full bg-white text-military-900 px-5 py-3.5 rounded-xl font-black uppercase text-xs tracking-wider shadow-xl hover:bg-action-100 flex items-center justify-center gap-2 transition-transform active:scale-95"
              >
                <span className="material-icons text-base">play_arrow</span>
                Déclarer & Démarrer la séance libre
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-military-300 block mb-1">Type de séance</label>
                  <select
                    className="w-full bg-military-900 border border-military-600 rounded-xl p-3 text-sm font-bold text-white outline-none focus:border-action-500"
                    value={flashType}
                    onChange={(e) => setFlashType(e.target.value)}
                  >
                    <option value="Musculation">Musculation</option>
                    <option value="Poids du corps">Poids du corps</option>
                    <option value="Course">Course / VMA</option>
                    <option value="Crosstraining">Cross-Training / WOD</option>
                    <option value="Mobilité et posture">Mobilité & Posture (ORFA)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-military-300 block mb-1">Lieu (adapte le matériel)</label>
                  <select
                    className="w-full bg-military-900 border border-military-600 rounded-xl p-3 text-sm font-bold text-white outline-none focus:border-action-500"
                    value={flashLocation}
                    onChange={(e) => setFlashLocation(e.target.value)}
                  >
                    <option value="Chez moi">Chez moi (Sans matériel)</option>
                    {infras.map((infra) => (
                      <option key={infra.id} value={infra.name}>{infra.name}</option>
                    ))}
                    {routes.map((route) => (
                      <option key={route.id} value={route.name}>{route.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-military-300 block mb-1">Temps disponible</label>
                  <select
                    className="w-full bg-military-900 border border-military-600 rounded-xl p-3 text-sm font-bold text-white outline-none focus:border-action-500"
                    value={flashDuration}
                    onChange={(e) => setFlashDuration(Number(e.target.value))}
                  >
                    <option value={20}>20 min</option>
                    <option value={30}>30 min</option>
                    <option value={40}>40 min</option>
                    <option value={60}>60 min</option>
                  </select>
                </div>
              </div>

              <button
                onClick={flashMode === 'generate' ? handleFlashGen : handleSearchSessions}
                disabled={generating}
                className="w-full bg-white text-military-900 px-5 py-3.5 rounded-xl font-black uppercase text-xs tracking-wider shadow-xl hover:bg-action-100 flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
              >
                <span className={`material-icons text-base ${generating ? 'animate-spin' : ''}`}>
                  {generating ? 'refresh' : flashMode === 'generate' ? 'bolt' : 'search'}
                </span>
                {generating
                  ? 'Adaptation en cours...'
                  : flashMode === 'generate'
                  ? 'Générer ma séance flash personnalisée'
                  : 'Rechercher dans la bibliothèque EPMS'}
              </button>
            </>
          )}
        </div>

        {/* Résultats recherche rapide */}
        {flashMode === 'search' && filteredSessions.length > 0 && (
          <div className="mt-5 space-y-2 relative z-10">
            <h4 className="text-xs font-black text-military-300 uppercase">
              Séances trouvées ({filteredSessions.length})
            </h4>
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {filteredSessions.map((s) => (
                <div
                  key={s.id}
                  className="bg-black/30 p-3.5 rounded-xl border border-white/10 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <h5 className="font-bold text-sm text-white truncate">{s.title}</h5>
                    <p className="text-[11px] text-military-300">
                      {s.durationMinutes || 20} min • {s.workoutType || s.type} • {s.level || 'Standard'}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleAdaptSession(s)}
                      disabled={generating}
                      className="bg-action-500 text-military-950 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase"
                    >
                      Adapter
                    </button>
                    <button
                      onClick={() => onStartSession({ ...s, locationName: flashLocation }, 'LIBRARY')}
                      className="bg-white/15 hover:bg-white/25 text-white px-3 py-1.5 rounded-lg text-[11px] font-black uppercase"
                    >
                      Go
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {flashMode === 'search' && searchAttempted && filteredSessions.length === 0 && (
          <div className="mt-4 text-center text-military-300 text-xs italic">
            Aucune séance trouvée pour ces critères. Essayez le mode « Générer (IA) ».
          </div>
        )}
      </div>

      {/* Aperçu Séance Générée ou Adaptée (avec prescriptions converties en kg et min/km !) */}
      {(flashSession || modifiedSession) && (() => {
        const preview = modifiedSession || flashSession;
        const isAdaptation = Boolean(modifiedSession);
        return (
          <div className="bg-white rounded-3xl p-6 border-l-8 border-action-500 shadow-xl animate-[slideUp_0.3s_ease-out] relative space-y-5">
            <button
              onClick={() => {
                setFlashSession(null);
                setModifiedSession(null);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-red-500"
            >
              <span className="material-icons">close</span>
            </button>

            <div>
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-action-100 text-action-700 rounded-full text-[10px] font-black uppercase tracking-widest mb-2">
                <span className="material-icons text-xs">auto_awesome</span>
                {isAdaptation ? 'Séance Adaptée à votre Bilan du Jour' : 'Séance Flash Personnalisée'}
              </span>
              <h3 className="text-xl md:text-2xl font-black text-military-900 uppercase leading-tight">{preview.title}</h3>
              <p className="text-gray-600 text-xs mt-1">{preview.description}</p>
            </div>

            {preview.content?.advice && (
              <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-900 flex gap-2 items-start">
                <span className="material-icons text-blue-600 text-base shrink-0">tips_and_updates</span>
                <span>{preview.content.advice}</span>
              </div>
            )}

            {preview.content?.mainBlock && preview.content.mainBlock.length > 0 && (
              <div className="space-y-2">
                <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                  Exercices illustrés (Charges & Allures calculées pour vous • cliquer schéma = technique)
                </div>
                {preview.content.mainBlock.map((b: any, i: number) => (
                  <div key={i} className="p-3 rounded-xl bg-military-50 border border-military-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <ExerciseIllustration exerciseName={b.exercise} fallbackType={preview.workoutType || preview.type} size="xs" />
                      <span className="font-black text-xs text-military-900 truncate">{b.exercise}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-[11px] font-bold justify-end shrink-0">
                      <span className="text-military-700 bg-white px-2 py-0.5 rounded border border-military-200">
                        {adaptPrescription(b.prescription, user, hasDaily, b.exercise)}
                      </span>
                      {b.rest && b.rest !== '-' && b.rest !== '0' && (
                        <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded">Repos {b.rest}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => {
                const sessionToRun: Session = {
                  ...preview,
                  id: preview.id || `flash_${Date.now()}`,
                  locationName: preview.locationName || flashLocation
                };
                setFlashSession(null);
                setModifiedSession(null);
                onStartSession(sessionToRun, preview.programId ? 'PROGRAM' : 'FLASH');
              }}
              className="w-full py-4 bg-military-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-military-800 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-icons text-action-400">play_circle_filled</span>
              Lancer la séance en direct (Timer & Registre Sport)
            </button>
          </div>
        );
      })()}

      {/* Modal Détails Séance Collective */}
      {selectedCollSession && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-[zoomIn_0.2s]">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-black text-military-900">{selectedCollSession.title}</h3>
                <p className="text-action-700 text-xs font-bold uppercase tracking-widest mt-0.5">
                  {selectedCollSession.instructorName}
                </p>
              </div>
              <button onClick={() => setSelectedCollSession(null)} className="text-gray-400 hover:text-red-500">
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="space-y-4 text-sm text-gray-600">
              <div className="flex items-center gap-4 text-xs font-bold py-2.5 border-y border-gray-100">
                <span className="flex items-center gap-1">
                  <span className="material-icons text-sm text-action-600">schedule</span>
                  {selectedCollSession.timeStart} - {selectedCollSession.timeEnd}
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-icons text-sm text-action-600">place</span>
                  {selectedCollSession.locationName}
                </span>
              </div>
              <p className="text-xs leading-relaxed">
                {selectedCollSession.detailedDescription || 'Séance encadrée par la cellule EPMS.'}
              </p>
              <div className="bg-military-50 p-4 rounded-2xl border border-military-100 text-xs font-bold text-military-800">
                Inscrits : {selectedCollSession.participants.length} / {selectedCollSession.maxParticipants}
                {(selectedCollSession.waitlist?.length || 0) > 0 && (
                  <span className="ml-2 text-amber-700">({selectedCollSession.waitlist?.length} en liste d'attente)</span>
                )}
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setSelectedCollSession(null)} className="flex-1 py-3 text-xs font-bold uppercase text-gray-500">
                Fermer
              </button>
              <button
                onClick={() => {
                  handleToggleJoin(selectedCollSession.id);
                  setSelectedCollSession(null);
                }}
                className="flex-1 py-3 bg-military-900 text-white rounded-xl font-black uppercase text-xs"
              >
                {selectedCollSession.participants.includes(user.nid)
                  ? 'Se désinscrire'
                  : selectedCollSession.participants.length >= selectedCollSession.maxParticipants
                  ? 'Liste d\'attente'
                  : 'S\'inscrire'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardUser;
