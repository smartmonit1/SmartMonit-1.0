import React, { useState, useMemo, useEffect } from 'react';
import {
  UserProfile,
  ProgramStatus,
  UserRole,
  CollectiveSession,
  FacilityBooking,
  Infrastructure,
  ActiveSession
} from '../types';
import { db } from '../services/mockDatabase';
import { parsePlanningFile } from '../services/geminiService';
import { downloadICSFile } from '../utils/biometrics';
import { useToast } from './ToastProvider';

interface CalendarViewProps {
  user: UserProfile;
  canEdit?: boolean;
}

type ViewMode = 'week' | 'month';
type MainMode = 'classes' | 'facilities';

const FACILITY_SLOTS = [
  { start: '07:00', end: '08:00' },
  { start: '08:00', end: '09:00' },
  { start: '09:00', end: '10:00' },
  { start: '10:00', end: '11:00' },
  { start: '11:30', end: '12:30' },
  { start: '12:30', end: '13:30' },
  { start: '14:00', end: '15:00' },
  { start: '15:00', end: '16:00' },
  { start: '16:30', end: '17:30' },
  { start: '17:30', end: '18:30' },
  { start: '18:30', end: '19:30' }
];

const toLocalDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const CalendarView: React.FC<CalendarViewProps> = ({ user, canEdit }) => {
  const { showToast } = useToast();
  const isMonitorEditor = canEdit ?? user.role === UserRole.MONITOR;

  const [mainMode, setMainMode] = useState<MainMode>('classes');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [classFilter, setClassFilter] = useState<'ALL' | 'MINE' | 'AVAILABLE' | 'CCPM' | 'COLLECTIF'>('ALL');
  const [selectedCollSession, setSelectedCollSession] = useState<CollectiveSession | null>(null);

  // Réservation installations (Basic-Fit / ClassPass)
  const [clockNow, setClockNow] = useState(() => new Date());
  const [bookingDateKey, setBookingDateKey] = useState(() => toLocalDateKey(new Date()));
  const [facilityBookings, setFacilityBookings] = useState<FacilityBooking[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [qrPassModal, setQrPassModal] = useState<{
    title: string;
    dateStr: string;
    timeRange: string;
    location: string;
    code: string;
  } | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isImportingPlanning, setIsImportingPlanning] = useState(false);
  const [editData, setEditData] = useState<Partial<CollectiveSession>>({});

  const [allCollectiveSessions, setAllCollectiveSessions] = useState<CollectiveSession[]>([]);
  const [programs, setPrograms] = useState(db.getPrograms());
  const [serviceInfrastructures, setServiceInfrastructures] = useState<Infrastructure[]>([]);

  useEffect(() => {
    const load = () => {
      setAllCollectiveSessions(db.getCollectiveSessions().filter((c) => c.serviceId === user.serviceId));
      setPrograms(db.getPrograms());
      setServiceInfrastructures(db.getInfrastructures().filter((infra) => infra.serviceId === user.serviceId));
      setFacilityBookings(db.getFacilityBookings(user.serviceId));
      setActiveSessions(db.getActiveSessions().filter((s) => !s.serviceId || s.serviceId === user.serviceId));
    };
    load();
    window.addEventListener('db_updated', load);
    return () => window.removeEventListener('db_updated', load);
  }, [user.serviceId]);

  const selectedLocation = selectedCollSession
    ? serviceInfrastructures.find((infra) => infra.name === selectedCollSession.locationName)
    : undefined;
  const selectedLocationUnavailable = Boolean(selectedLocation && selectedLocation.status !== 'Operational');

  const userPrograms = useMemo(
    () =>
      programs.filter(
        (p) =>
          p.status === ProgramStatus.VALIDATED &&
          (p.userId === user.nid ||
            (p.assignedUserIds && p.assignedUserIds.includes(user.nid)) ||
            (p.assignedUnit && user.unit && p.assignedUnit === user.unit && !p.isTemplate))
      ),
    [programs, user.nid, user.unit]
  );

  const myConfirmedFacilityBookings = useMemo(() => {
    const todayKey = toLocalDateKey(clockNow);
    return facilityBookings.filter(
      (b) => b.userNid === user.nid && b.status === 'CONFIRMED' && b.date >= todayKey
    );
  }, [facilityBookings, user.nid, clockNow]);

  const next7Days = useMemo(() => {
    const out: Date[] = [];
    const base = clockNow;
    for (let i = 0; i < 7; i++) {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
      out.push(d);
    }
    return out;
  }, [clockNow]);

  useEffect(() => {
    const timer = setInterval(() => setClockNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const todayKey = toLocalDateKey(clockNow);
    if (bookingDateKey < todayKey || !next7Days.some((day) => toLocalDateKey(day) === bookingDateKey)) {
      setBookingDateKey(todayKey);
    }
  }, [bookingDateKey, clockNow, next7Days]);

  useEffect(() => {
    if (!selectedCollSession) {
      setIsEditing(false);
      setIsCreating(false);
      setEditData({});
    }
  }, [selectedCollSession]);

  const handleCreateNew = () => {
    const newSession: CollectiveSession = {
      id: 'coll_' + Date.now(),
      title: 'Nouvelle Séance APMS',
      instructorName: user.name,
      timeStart: '11:30',
      timeEnd: '12:30',
      locationName: serviceInfrastructures[0]?.name || 'Installation Base',
      dayOfWeek: 1,
      maxParticipants: 20,
      participants: [],
      waitlist: [],
      detailedDescription: '',
      serviceId: user.serviceId || 'ear927',
      category: 'COLLECTIF'
    };
    setSelectedCollSession(newSession);
    setEditData(newSession);
    setIsCreating(true);
    setIsEditing(true);
  };

  const handleImportPlanning = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImportingPlanning(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1] || '');
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await parsePlanningFile(base64, file.type || 'text/plain');
      const extracted = res?.extractedSessions || [];
      if (extracted.length === 0) {
        showToast('Aucun créneau détecté dans ce document.', 'warning');
      } else {
        extracted.forEach((item: any, idx: number) => {
          db.addCollectiveSession({
            id: `imp_${Date.now()}_${idx}`,
            title: item.title || 'Séance APMS',
            instructorName: item.instructorName || user.name,
            timeStart: item.timeStart || '09:00',
            timeEnd: item.timeEnd || '10:00',
            locationName: item.locationName || 'Base',
            dayOfWeek: Number(item.dayOfWeek) || 1,
            maxParticipants: 20,
            participants: [],
            waitlist: [],
            serviceId: user.serviceId || 'ear927',
            category: 'COLLECTIF',
            detailedDescription: 'Importé automatiquement depuis le planning du service.'
          });
        });
        showToast(`${extracted.length} créneau(x) importé(s) dans le planning APMS !`, 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('Erreur lors de l\'analyse du planning.', 'error');
    } finally {
      setIsImportingPlanning(false);
      e.target.value = '';
    }
  };

  const handleToggleJoin = (sessionId: string) => {
    const session = allCollectiveSessions.find((item) => item.id === sessionId);
    if (!session) {
      showToast('Cette séance n’est plus disponible. Actualisez le planning.', 'error');
      return;
    }
    const alreadyJoined = session.participants.includes(user.nid) || Boolean(session.waitlist?.includes(user.nid));
    const location = serviceInfrastructures.find((infra) => infra.name === session.locationName);
    if (!alreadyJoined && location && location.status !== 'Operational') {
      showToast(
        `Inscription impossible : ${location.name} est ${location.status === 'Closed' ? 'fermée' : 'en maintenance'}.`,
        'warning'
      );
      return;
    }
    const updated = db.toggleSessionJoin(sessionId, user.nid);
    if (updated) {
      showToast(
        updated.participants.includes(user.nid)
          ? `Place confirmée : ${updated.title}`
          : updated.waitlist?.includes(user.nid)
          ? `Placé en liste d'attente (${updated.title})`
          : `Réservation annulée (${updated.title})`,
        'info'
      );
    }
  };

  const handleToggleFacilitySlot = (infra: Infrastructure, slot: { start: string; end: string }) => {
    const todayKey = toLocalDateKey(clockNow);
    const currentTime = `${String(clockNow.getHours()).padStart(2, '0')}:${String(clockNow.getMinutes()).padStart(2, '0')}`;
    if (bookingDateKey < todayKey || (bookingDateKey === todayKey && slot.end <= currentTime)) {
      showToast('Ce créneau est déjà passé. Choisissez un horaire à venir.', 'warning');
      return;
    }
    if (infra.status && infra.status !== 'Operational') {
      showToast(`${infra.name} est actuellement indisponible (${infra.status}).`, 'warning');
      return;
    }
    const slotBookings = facilityBookings.filter(
      (b) =>
        b.infrastructureId === infra.id &&
        b.date === bookingDateKey &&
        b.timeStart === slot.start &&
        b.status === 'CONFIRMED'
    );
    const mine = slotBookings.find((b) => b.userNid === user.nid);
    if (mine) {
      db.cancelFacilityBooking(mine.id);
      showToast(`Créneau annulé : ${infra.name} (${slot.start}–${slot.end}).`, 'info');
      return;
    }
    const maxCap = infra.capacity || 15;
    if (slotBookings.length >= maxCap) {
      showToast(`Créneau complet (${maxCap}/${maxCap} places). Choisissez un autre horaire.`, 'warning');
      return;
    }
    const newBooking: FacilityBooking = {
      id: `book_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      serviceId: user.serviceId || 'ear927',
      infrastructureId: infra.id,
      infrastructureName: infra.name,
      date: bookingDateKey,
      timeStart: slot.start,
      timeEnd: slot.end,
      userNid: user.nid,
      userName: user.name,
      status: 'CONFIRMED',
      createdAt: new Date().toISOString()
    };
    db.addFacilityBooking(newBooking);
    showToast(`Créneau réservé : ${infra.name} le ${bookingDateKey} (${slot.start}–${slot.end}) !`, 'success');
  };

  const handleDelete = () => {
    if (selectedCollSession && window.confirm('Supprimer cette séance du planning ? Les inscrits seront notifiés.')) {
      db.deleteCollectiveSession(selectedCollSession.id);
      setSelectedCollSession(null);
      showToast('Créneau supprimé et participants notifiés.', 'warning');
    }
  };

  const handleSave = () => {
    if (!selectedCollSession) return;
    const updated = { ...selectedCollSession, ...editData } as CollectiveSession;
    if (isCreating) {
      db.addCollectiveSession(updated);
      setIsCreating(false);
      showToast('Créneau ajouté au planning APMS.', 'success');
    } else {
      db.updateCollectiveSession(updated, true);
      showToast('Créneau mis à jour (inscrits notifiés automatiquement).', 'success');
    }
    setSelectedCollSession(updated);
    setIsEditing(false);
  };

  const parseSessionDate = (startDateStr: string, dateScheduled: string): Date | null => {
    const match = dateScheduled.match(/S(\d+)J(\d+)/);
    if (!match) return null;
    const week = parseInt(match[1], 10);
    const day = parseInt(match[2], 10);
    const [year, month, dayOfMonth] = startDateStr.split('-').map(Number);
    const startDate = new Date(year, month - 1, dayOfMonth);
    const resultDate = new Date(startDate);
    resultDate.setDate(startDate.getDate() + (week - 1) * 7 + (day - 1));
    return resultDate;
  };

  const getDayContent = (date: Date) => {
    const items: {
      type: string;
      label: string;
      color: string;
      time?: string;
      duration?: string;
      location?: string;
      raw?: CollectiveSession;
      instructor?: string;
      badge?: string;
      dateKey: string;
    }[] = [];

    const dateStr = toLocalDateKey(date);
    const dayOfWeek = date.getDay();
    const appDayIndex = dayOfWeek === 0 ? 7 : dayOfWeek;

    // 1. Séances des programmes individuels / unité
    if (classFilter === 'ALL' || classFilter === 'MINE') {
      userPrograms.forEach((prog) => {
        prog.sessions.forEach((sess) => {
          if (sess.dateScheduled) {
            const sessDate = parseSessionDate(prog.startDate, sess.dateScheduled);
            if (sessDate && toLocalDateKey(sessDate) === dateStr) {
              items.push({
                type: 'session',
                label: sess.title,
                color: sess.isCompleted
                  ? 'border-l-4 border-emerald-500 bg-emerald-50 text-emerald-900'
                  : 'border-l-4 border-military-700 bg-military-50 text-military-900',
                location: sess.locationName || 'Autonomie',
                time: 'Programme',
                duration: `${sess.durationMinutes} min`,
                instructor: 'Mon Programme',
                badge: sess.isCompleted ? 'Fait' : 'Prévu',
                dateKey: dateStr
              });
            }
          }
        });
      });
    }

    // 2. Mes réservations de salles ce jour-là
    if (classFilter === 'ALL' || classFilter === 'MINE') {
      facilityBookings
        .filter((b) => b.userNid === user.nid && b.status === 'CONFIRMED' && b.date === dateStr)
        .forEach((b) => {
          items.push({
            type: 'facility',
            label: `Créneau Salle — ${b.infrastructureName}`,
            color: 'border-l-4 border-blue-600 bg-blue-50/70 text-blue-950',
            time: b.timeStart,
            duration: b.timeEnd,
            location: b.infrastructureName,
            instructor: 'Accès Réservé',
            badge: 'SALLE RÉSERVÉE',
            dateKey: dateStr
          });
        });
    }

    // 3. Séances Collectives & Événements APMS
    allCollectiveSessions.forEach((cs) => {
      const matchesDay = cs.eventDate ? cs.eventDate === dateStr : cs.dayOfWeek === appDayIndex;
      if (!matchesDay) return;

      const isJoined = cs.participants.includes(user.nid);
      const isWaitlisted = cs.waitlist?.includes(user.nid);
      const isFull = cs.participants.length >= cs.maxParticipants;

      if (classFilter === 'MINE' && !isJoined && !isWaitlisted) return;
      if (classFilter === 'AVAILABLE' && (isFull || cs.cancelled)) return;
      if (classFilter === 'CCPM' && cs.category !== 'CCPM') return;
      if (classFilter === 'COLLECTIF' && cs.category && cs.category !== 'COLLECTIF') return;

      let colorClass = 'border-l-4 border-action-500 bg-white shadow-sm';
      if (cs.cancelled) colorClass = 'border-l-4 border-red-400 bg-red-50/70 opacity-75 line-through';
      else if (isJoined) colorClass = 'border-l-4 border-emerald-500 bg-emerald-50 shadow-sm';
      else if (isWaitlisted) colorClass = 'border-l-4 border-amber-500 bg-amber-50 shadow-sm';
      else if (isFull) colorClass = 'border-l-4 border-gray-300 bg-gray-50';

      items.push({
        type: 'collective',
        label: cs.title,
        color: colorClass,
        time: cs.timeStart,
        duration: cs.timeEnd,
        location: cs.locationName,
        instructor: cs.instructorName,
        badge: cs.cancelled ? 'Annulé' : cs.category,
        raw: cs,
        dateKey: dateStr
      });
    });

    return items.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  };

  const calendarDays = useMemo(() => {
    const days: Date[] = [];
    if (viewMode === 'month') {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const dow = firstDay.getDay();
      const mondayOffset = dow === 0 ? 6 : dow - 1;
      const start = new Date(year, month, 1 - mondayOffset);
      for (let i = 0; i < 42; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        days.push(d);
      }
    } else {
      const day = currentDate.getDay();
      const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(currentDate);
      monday.setDate(diff);
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        days.push(d);
      }
    }
    return days;
  }, [currentDate, viewMode]);

  return (
    <div className="flex flex-col space-y-4 animate-[fadeIn_0.3s]">
      {/* Switcher Principal : Cours Collectifs vs Réservation de Salles / Installations */}
      <div className="bg-military-900 rounded-3xl p-4 md:p-5 shadow-lg text-white space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex bg-military-800 p-1 rounded-2xl w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setMainMode('classes')}
              className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1.5 transition-all ${
                mainMode === 'classes' ? 'bg-action-500 text-military-950 shadow' : 'text-gray-300 hover:text-white'
              }`}
            >
              <span className="material-icons text-sm">groups</span>
              Cours Collectifs & Agenda
            </button>
            <button
              type="button"
              onClick={() => setMainMode('facilities')}
              className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1.5 transition-all ${
                mainMode === 'facilities' ? 'bg-action-500 text-military-950 shadow' : 'text-gray-300 hover:text-white'
              }`}
            >
              <span className="material-icons text-sm">meeting_room</span>
              Réserver une Salle ({myConfirmedFacilityBookings.length})
            </button>
          </div>

          {mainMode === 'classes' && isMonitorEditor && (
            <div className="flex items-center gap-2">
              <label className="cursor-pointer px-3.5 py-2 bg-white text-military-900 rounded-xl font-black text-xs uppercase flex items-center gap-1.5 hover:bg-action-100">
                <span className={`material-icons text-sm ${isImportingPlanning ? 'animate-spin' : ''}`}>
                  {isImportingPlanning ? 'refresh' : 'upload_file'}
                </span>
                {isImportingPlanning ? 'Analyse...' : 'Import Planning'}
                <input type="file" accept=".csv,.txt,.pdf,.png,.jpg,.jpeg" className="hidden" onChange={handleImportPlanning} />
              </label>
              <button
                onClick={handleCreateNew}
                className="px-3.5 py-2 bg-action-500 text-military-950 rounded-xl font-black text-xs uppercase flex items-center gap-1 hover:bg-action-400"
              >
                <span className="material-icons text-sm">add</span> Créneau
              </button>
            </div>
          )}
        </div>

        {/* Navigation Dates (mode Cours Collectifs) */}
        {mainMode === 'classes' && (
          <div className="flex flex-col md:flex-row justify-between items-center gap-3 pt-2 border-t border-white/10">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Période précédente"
                onClick={() => {
                  const n = new Date(currentDate);
                  n.setDate(n.getDate() - (viewMode === 'month' ? 30 : 7));
                  setCurrentDate(n);
                }}
                className="w-9 h-9 flex items-center justify-center bg-military-800 hover:bg-action-500 hover:text-military-950 rounded-full transition-colors"
              >
                <span className="material-icons">chevron_left</span>
              </button>
              <h2 className="text-base md:text-lg font-black uppercase tracking-wider text-center min-w-[160px]">
                {new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(currentDate)}
              </h2>
              <button
                type="button"
                aria-label="Période suivante"
                onClick={() => {
                  const n = new Date(currentDate);
                  n.setDate(n.getDate() + (viewMode === 'month' ? 30 : 7));
                  setCurrentDate(n);
                }}
                className="w-9 h-9 flex items-center justify-center bg-military-800 hover:bg-action-500 hover:text-military-950 rounded-full transition-colors"
              >
                <span className="material-icons">chevron_right</span>
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-center">
              <div className="flex bg-military-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setViewMode('week')}
                  className={`px-3.5 py-1.5 rounded-lg text-[11px] font-black uppercase ${viewMode === 'week' ? 'bg-white text-military-900' : 'text-gray-300'}`}
                >
                  Semaine
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('month')}
                  className={`px-3.5 py-1.5 rounded-lg text-[11px] font-black uppercase ${viewMode === 'month' ? 'bg-white text-military-900' : 'text-gray-300'}`}
                >
                  Mois
                </button>
              </div>
              <button
                type="button"
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1.5 bg-military-800 border border-military-700 text-[11px] font-bold text-gray-200 rounded-xl hover:text-white uppercase"
              >
                Aujourd'hui
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* MODE 1 : COURS COLLECTIFS & PLANNING APMS (ClassPass / Resamania)     */}
      {/* ===================================================================== */}
      {mainMode === 'classes' && (
        <>
          {/* Filtres rapides par discipline / statut */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {[
              { id: 'ALL', label: 'Tous les créneaux' },
              { id: 'MINE', label: 'Mes réservations' },
              { id: 'AVAILABLE', label: 'Places disponibles' },
              { id: 'COLLECTIF', label: 'Cours Collectifs' },
              { id: 'CCPM', label: 'Prépa CCPM' }
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setClassFilter(f.id as any)}
                className={`px-3.5 py-2 rounded-xl text-[11px] font-black uppercase whitespace-nowrap transition-all ${
                  classFilter === f.id
                    ? 'bg-military-900 text-action-400 shadow'
                    : 'bg-white text-gray-600 border border-military-100 hover:border-military-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-military-100 p-4 md:p-6">
            {viewMode === 'week' ? (
              <div className="space-y-4">
                {calendarDays.map((day, i) => {
                  const dayContent = getDayContent(day);
                  const isToday = day.toDateString() === new Date().toDateString();
                  return (
                    <div key={i} className="flex min-w-0 gap-4">
                      <div className="flex flex-col items-center w-12 shrink-0 pt-1">
                        <span className="text-[10px] font-black uppercase text-gray-400">
                          {day.toLocaleString('fr-FR', { weekday: 'short' }).replace('.', '')}
                        </span>
                        <div
                          className={`w-10 h-10 flex items-center justify-center rounded-full text-base font-black mt-1 ${
                            isToday ? 'bg-action-500 text-military-950 shadow-md' : 'bg-gray-50 text-military-900 border border-gray-200'
                          }`}
                        >
                          {day.getDate()}
                        </div>
                      </div>
                      <div className="flex-grow min-w-0 space-y-2.5 pb-4 border-b border-gray-100">
                        {dayContent.length > 0 ? (
                          dayContent.map((item, idx) => {
                            const cs = item.raw;
                            const spotsLeft = cs ? cs.maxParticipants - cs.participants.length : 0;
                            const isJoined = cs ? cs.participants.includes(user.nid) : false;
                            return (
                              <div
                                key={idx}
                                onClick={() => cs && setSelectedCollSession(cs)}
                                className={`min-w-0 p-3.5 rounded-2xl border border-gray-100 transition-all ${item.color} ${
                                  cs ? 'cursor-pointer hover:shadow-md' : ''
                                }`}
                              >
                                <div className="flex flex-wrap justify-between items-start gap-2 mb-1">
                                  <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs font-black">
                                    <span>{item.time}</span>
                                    {item.duration && <span className="text-gray-400 font-semibold">— {item.duration}</span>}
                                    {item.badge && (
                                      <span className="text-[9px] uppercase px-2 py-0.5 rounded bg-military-900/10 text-military-800">
                                        {item.badge}
                                      </span>
                                    )}
                                    {isJoined && (
                                      <span className="text-[9px] uppercase px-2 py-0.5 rounded bg-emerald-600 text-white">
                                        ✓ Réservé
                                      </span>
                                    )}
                                    {cs && !cs.cancelled && !isJoined && spotsLeft > 0 && spotsLeft <= 3 && (
                                      <span className="text-[9px] uppercase px-2 py-0.5 rounded bg-orange-100 text-orange-800">
                                        Plus que {spotsLeft} place(s) !
                                      </span>
                                    )}
                                    {cs && !cs.cancelled && spotsLeft <= 0 && !isJoined && (
                                      <span className="text-[9px] uppercase px-2 py-0.5 rounded bg-red-100 text-red-700">
                                        Complet • Liste d'attente
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] font-bold uppercase text-military-600 bg-white/80 px-2 py-0.5 rounded border border-gray-200">
                                    {item.location}
                                  </span>
                                </div>
                                <h4 className="break-words font-black text-sm text-military-900">{item.label}</h4>
                                <div className="text-[11px] text-gray-500 mt-1.5 flex flex-wrap items-center justify-between gap-2">
                                  <span>{item.instructor}</span>
                                  {cs && (
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-military-700">
                                        {cs.participants.length}/{cs.maxParticipants} places
                                      </span>
                                      {isJoined && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setQrPassModal({
                                              title: cs.title,
                                              dateStr: item.dateKey,
                                              timeRange: `${cs.timeStart} – ${cs.timeEnd}`,
                                              location: cs.locationName,
                                              code: `SM-CLASS-${cs.id}-${user.nid}`
                                            });
                                          }}
                                          className="px-2 py-0.5 rounded-lg bg-military-900 text-action-400 text-[10px] font-black uppercase flex items-center gap-1"
                                        >
                                          <span className="material-icons text-xs">qr_code_2</span> Pass
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="h-11 border border-dashed border-gray-200 rounded-xl flex items-center justify-center text-gray-300 text-xs italic">
                            Aucun créneau correspondant
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-7 border-b border-gray-100 pb-2 mb-2">
                  {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
                    <div key={d} className="text-center text-[10px] font-black text-gray-400 uppercase">
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, i) => {
                    const content = getDayContent(day);
                    const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                    const isToday = day.toDateString() === new Date().toDateString();
                    return (
                      <div
                        key={i}
                        onClick={() => {
                          setCurrentDate(day);
                          setViewMode('week');
                        }}
                        className={`min-h-[78px] p-1.5 rounded-xl border cursor-pointer transition-colors ${
                          isToday ? 'border-action-500 bg-action-50/40' : isCurrentMonth ? 'border-gray-100 bg-white hover:bg-gray-50' : 'border-transparent bg-gray-50/50 opacity-50'
                        }`}
                      >
                        <div className="text-right text-[11px] font-black text-military-800">{day.getDate()}</div>
                        <div className="space-y-1 mt-1">
                          {content.slice(0, 2).map((item, idx) => (
                            <div key={idx} className="truncate text-[9px] font-bold px-1 py-0.5 rounded bg-military-100 text-military-900">
                              {item.label}
                            </div>
                          ))}
                          {content.length > 2 && <div className="text-[9px] text-gray-400 font-bold">+{content.length - 2}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Réservation des créneaux d’installations */}
      {mainMode === 'facilities' && (
        <div className="space-y-5">
          {/* Mes réservations actives de salles */}
          {myConfirmedFacilityBookings.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-4 md:p-5 space-y-3">
              <h3 className="text-xs font-black uppercase text-emerald-900 flex items-center gap-1.5">
                <span className="material-icons text-base text-emerald-600">confirmation_number</span>
                Mes créneaux salles réservés ({myConfirmedFacilityBookings.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {myConfirmedFacilityBookings.map((b) => (
                  <div key={b.id} className="bg-white p-3.5 rounded-2xl border border-emerald-200 flex items-center justify-between gap-2 shadow-sm">
                    <div className="min-w-0">
                      <div className="font-black text-xs text-military-900 truncate">{b.infrastructureName}</div>
                      <div className="text-[11px] font-bold text-emerald-700 mt-0.5">
                        {b.date} • {b.timeStart} – {b.timeEnd}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setQrPassModal({
                            title: `Réservation — ${b.infrastructureName}`,
                            dateStr: b.date,
                            timeRange: `${b.timeStart} – ${b.timeEnd}`,
                            location: b.infrastructureName,
                            code: `SM-FAC-${b.id}`
                          })
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-military-900 text-action-400 text-[10px] font-black uppercase flex items-center gap-1"
                      >
                        <span className="material-icons text-xs">confirmation_number</span> Réf.
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          downloadICSFile({
                            title: `EPMS — ${b.infrastructureName}`,
                            description: `Créneau réservé via SMART MONIT 1.0 (${user.name}).`,
                            location: b.infrastructureName,
                            dateStr: b.date,
                            timeStart: b.timeStart,
                            timeEnd: b.timeEnd
                          })
                        }
                        className="p-1.5 rounded-lg bg-military-50 text-military-700 hover:bg-military-100"
                        title="Ajouter à mon agenda (.ics)"
                      >
                        <span className="material-icons text-sm">event</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          db.cancelFacilityBooking(b.id);
                          showToast('Réservation annulée.', 'info');
                        }}
                        className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                        title="Annuler ce créneau"
                      >
                        <span className="material-icons text-sm">close</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bandeau sélecteur de jour 7 jours glissants */}
          <div className="bg-white rounded-3xl p-4 border border-military-100 shadow-sm">
            <div className="text-[10px] font-black uppercase text-gray-400 mb-2.5">Choisissez votre jour</div>
            <div className="grid grid-cols-7 gap-1.5">
              {next7Days.map((d) => {
                const key = toLocalDateKey(d);
                const selected = key === bookingDateKey;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setBookingDateKey(key)}
                    className={`py-2.5 rounded-2xl flex flex-col items-center transition-all border ${
                      selected
                        ? 'bg-military-900 text-white border-military-900 shadow-md scale-[1.02]'
                        : 'bg-gray-50 text-military-800 border-gray-200 hover:border-action-500'
                    }`}
                  >
                    <span className={`text-[9px] font-black uppercase ${selected ? 'text-action-400' : 'text-gray-400'}`}>
                      {d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}
                    </span>
                    <span className="text-base font-black mt-0.5">{d.getDate()}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cartes d'Installations avec jauge live + créneaux cliquables en 1 clic */}
          <div className="space-y-4">
            {serviceInfrastructures.map((infra) => {
              const isOpen = !infra.status || infra.status === 'Operational';
              const maxCap = infra.capacity || 15;
              const liveNow = activeSessions.filter(
                (s) => s.infrastructureId === infra.id || s.infrastructureName === infra.name
              ).length;
              const occupancyPct = Math.min(100, Math.round((liveNow / maxCap) * 100));

              return (
                <div
                  key={infra.id}
                  className={`bg-white rounded-3xl p-5 border shadow-sm space-y-4 ${
                    isOpen ? 'border-military-100' : 'border-red-200 opacity-75'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-base text-military-900">{infra.name}</h3>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                          {infra.type}
                        </span>
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                            isOpen
                              ? 'bg-emerald-100 text-emerald-800'
                              : infra.status === 'Maintenance'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {isOpen ? '● Ouverte' : infra.status === 'Maintenance' ? 'Maintenance' : 'Fermée'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Capacité max : {maxCap} pers. • Affluence en direct :{' '}
                        <strong className="text-military-900">{liveNow} actif(s) ({occupancyPct}%)</strong>
                      </p>
                    </div>
                    {isOpen && (
                      <div className="w-full sm:w-32">
                        <div className="text-[9px] font-black uppercase text-gray-400 mb-1">Affluence Live</div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              occupancyPct >= 80 ? 'bg-red-500' : occupancyPct >= 50 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.max(8, occupancyPct)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {isOpen ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                      {FACILITY_SLOTS.map((slot) => {
                        const bookedHere = facilityBookings.filter(
                          (b) =>
                            b.infrastructureId === infra.id &&
                            b.date === bookingDateKey &&
                            b.timeStart === slot.start &&
                            b.status === 'CONFIRMED'
                        );
                        const isMine = bookedHere.some((b) => b.userNid === user.nid);
                        const left = maxCap - bookedHere.length;
                        const isFull = left <= 0 && !isMine;
                        const todayKey = toLocalDateKey(clockNow);
                        const currentTime = `${String(clockNow.getHours()).padStart(2, '0')}:${String(clockNow.getMinutes()).padStart(2, '0')}`;
                        const isPastSlot = bookingDateKey < todayKey ||
                          (bookingDateKey === todayKey && slot.end <= currentTime);

                        return (
                          <button
                            key={slot.start}
                            type="button"
                            disabled={isFull || (isPastSlot && !isMine)}
                            onClick={() => handleToggleFacilitySlot(infra, slot)}
                            className={`p-2.5 rounded-2xl border text-left transition-all ${
                              isMine
                                ? 'bg-emerald-600 text-white border-emerald-700 shadow-md'
                                : isFull || isPastSlot
                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                : 'bg-military-50/70 hover:bg-action-50 text-military-900 border-military-200 hover:border-action-500'
                            }`}
                          >
                            <div className="font-black text-xs">{slot.start}–{slot.end}</div>
                            <div
                              className={`text-[10px] font-bold mt-0.5 ${
                                isMine ? 'text-emerald-100' : left <= 3 ? 'text-orange-600' : 'text-gray-500'
                              }`}
                            >
                              {isMine ? '✓ Réservé' : isPastSlot ? 'Terminé' : isFull ? 'Complet' : `${left}/${maxCap} places`}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3 bg-red-50 rounded-xl text-xs font-bold text-red-700">
                      Réservation suspendue tant que l'installation n'est pas remise en service par la cellule EPMS.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Référence de réservation et export calendrier */}
      {qrPassModal && (
        <div
          className="fixed inset-0 z-[90] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setQrPassModal(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl animate-[zoomIn_0.2s]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-military-900 text-white p-5 text-center">
              <span className="text-[9px] font-black uppercase tracking-widest bg-action-500 text-military-950 px-2.5 py-0.5 rounded-full">
                Référence de réservation (démo)
              </span>
              <h3 className="font-black text-lg mt-2">{qrPassModal.title}</h3>
              <p className="text-xs text-military-300 mt-0.5">{qrPassModal.location}</p>
            </div>
            <div className="p-6 flex flex-col items-center space-y-4">
              <div className="w-full p-5 rounded-2xl border border-dashed border-military-300 bg-military-50 text-center">
                <span className="material-icons text-3xl text-military-600">confirmation_number</span>
                <div className="font-mono font-black text-sm text-military-900 mt-2 break-all">{qrPassModal.code}</div>
                <p className="text-[11px] text-gray-600 mt-2">
                  Référence informative uniquement. Ce prototype ne valide pas les accès à une installation.
                </p>
              </div>
              <div className="text-center">
                <div className="font-black text-sm text-military-900">{user.name}</div>
                <div className="text-xs font-bold text-emerald-700 mt-1">
                  {qrPassModal.dateStr} • {qrPassModal.timeRange}
                </div>
              </div>
              <div className="flex gap-2 w-full">
                <button
                  type="button"
                  onClick={() => {
                    const [start, end] = qrPassModal.timeRange.split('–').map((s) => s.trim());
                    downloadICSFile({
                      title: qrPassModal.title,
                      description: `Pass EPMS SMART MONIT (${user.name})`,
                      location: qrPassModal.location,
                      dateStr: qrPassModal.dateStr,
                      timeStart: start || '09:00',
                      timeEnd: end || '10:00'
                    });
                    showToast('Événement ajouté (.ics téléchargé) !', 'success');
                  }}
                  className="flex-1 py-2.5 bg-military-50 hover:bg-military-100 text-military-900 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1"
                >
                  <span className="material-icons text-sm">event</span> Agenda .ics
                </button>
                <button
                  type="button"
                  onClick={() => setQrPassModal(null)}
                  className="flex-1 py-2.5 bg-military-900 text-white rounded-xl text-xs font-black uppercase"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Détail / Édition Cours Collectif */}
      {selectedCollSession && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-[zoomIn_0.2s]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-start">
              <div>
                <h3 className="text-xl font-black text-military-900 uppercase">
                  {isEditing ? (isCreating ? 'Nouveau Créneau' : 'Modifier le Créneau') : selectedCollSession.title}
                </h3>
                {!isEditing && <p className="text-action-700 text-xs font-bold uppercase mt-0.5">{selectedCollSession.instructorName}</p>}
              </div>
              <button onClick={() => setSelectedCollSession(null)} className="text-gray-400 hover:text-red-500">
                <span className="material-icons">close</span>
              </button>
            </div>

            <div className="flex-grow overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {!isEditing ? (
                <>
                  <div className="grid grid-cols-2 gap-3 text-xs font-bold">
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-[10px] uppercase text-gray-400 block">Horaire</span>
                      {selectedCollSession.timeStart} — {selectedCollSession.timeEnd}
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-[10px] uppercase text-gray-400 block">Lieu</span>
                      {selectedCollSession.locationName}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {selectedCollSession.detailedDescription || 'Séance encadrée par la cellule EPMS.'}
                  </p>
                  <div className="bg-military-50 p-4 rounded-2xl border border-military-100 space-y-2">
                    <div className="flex justify-between text-xs font-black text-military-800">
                      <span>Inscrits ({selectedCollSession.participants.length}/{selectedCollSession.maxParticipants})</span>
                      {(selectedCollSession.waitlist?.length || 0) > 0 && (
                        <span className="text-amber-700">{selectedCollSession.waitlist?.length} en attente</span>
                      )}
                    </div>
                    <div className="h-2 bg-white rounded-full overflow-hidden border border-military-100">
                      <div
                        className="h-full bg-emerald-600 rounded-full"
                        style={{
                          width: `${Math.min(100, (selectedCollSession.participants.length / Math.max(1, selectedCollSession.maxParticipants)) * 100)}%`
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {selectedCollSession.participants.map((nid) => {
                        const u = db.getUsers().find((x) => x.nid === nid);
                        return (
                          <span key={nid} className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-[11px] font-bold text-military-800">
                            {u ? u.name : `NID ${nid}`}
                          </span>
                        );
                      })}
                      {selectedCollSession.participants.length === 0 && (
                        <span className="text-xs italic text-gray-400">Aucun inscrit pour le moment.</span>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Titre</label>
                    <input
                      type="text"
                      className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm border border-gray-200"
                      value={editData.title ?? selectedCollSession.title}
                      onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Catégorie</label>
                      <select
                        className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm border border-gray-200"
                        value={editData.category ?? selectedCollSession.category ?? 'COLLECTIF'}
                        onChange={(e) => setEditData({ ...editData, category: e.target.value as any })}
                      >
                        <option value="COLLECTIF">Cours collectif</option>
                        <option value="CCPM">Créneau CCPM</option>
                        <option value="COHESION">Sport Cohésion / Unité</option>
                        <option value="EVENEMENT">Événement / Challenge</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Capacité Max</label>
                      <input
                        type="number"
                        className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm border border-gray-200"
                        value={editData.maxParticipants ?? selectedCollSession.maxParticipants}
                        onChange={(e) => setEditData({ ...editData, maxParticipants: parseInt(e.target.value, 10) || 10 })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Début</label>
                      <input
                        type="time"
                        className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm border border-gray-200"
                        value={editData.timeStart ?? selectedCollSession.timeStart}
                        onChange={(e) => setEditData({ ...editData, timeStart: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Fin</label>
                      <input
                        type="time"
                        className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm border border-gray-200"
                        value={editData.timeEnd ?? selectedCollSession.timeEnd}
                        onChange={(e) => setEditData({ ...editData, timeEnd: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Jour récurrent</label>
                      <select
                        className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm border border-gray-200"
                        value={editData.dayOfWeek ?? selectedCollSession.dayOfWeek}
                        onChange={(e) => setEditData({ ...editData, dayOfWeek: parseInt(e.target.value, 10) })}
                      >
                        <option value={1}>Lundi</option>
                        <option value={2}>Mardi</option>
                        <option value={3}>Mercredi</option>
                        <option value={4}>Jeudi</option>
                        <option value={5}>Vendredi</option>
                        <option value={6}>Samedi</option>
                        <option value={7}>Dimanche</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Date ponctuelle (opt.)</label>
                      <input
                        type="date"
                        className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm border border-gray-200"
                        value={editData.eventDate ?? selectedCollSession.eventDate ?? ''}
                        onChange={(e) => setEditData({ ...editData, eventDate: e.target.value || undefined })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Lieu</label>
                    <input
                      type="text"
                      className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm border border-gray-200"
                      value={editData.locationName ?? selectedCollSession.locationName}
                      onChange={(e) => setEditData({ ...editData, locationName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Description</label>
                    <textarea
                      className="w-full p-3 bg-gray-50 rounded-xl font-medium text-sm border border-gray-200"
                      rows={3}
                      value={editData.detailedDescription ?? selectedCollSession.detailedDescription ?? ''}
                      onChange={(e) => setEditData({ ...editData, detailedDescription: e.target.value })}
                    />
                  </div>
                  {!isCreating && (
                    <label className="flex items-center gap-2 text-xs font-bold text-red-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editData.cancelled ?? selectedCollSession.cancelled ?? false}
                        onChange={(e) => setEditData({ ...editData, cancelled: e.target.checked })}
                      />
                      Marquer cette séance comme annulée (notifie instantanément les inscrits)
                    </label>
                  )}
                </div>
              )}
            </div>

            <div className="p-5 border-t border-gray-100 bg-gray-50">
              {isMonitorEditor ? (
                isEditing ? (
                  <div className="flex gap-3">
                    <button onClick={() => setIsEditing(false)} className="flex-1 py-3 text-xs font-bold uppercase text-gray-500">
                      Annuler
                    </button>
                    <button onClick={handleSave} className="flex-[2] py-3 bg-action-500 text-military-950 font-black uppercase text-xs rounded-xl shadow">
                      Enregistrer
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <button onClick={handleDelete} className="px-4 py-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100">
                      <span className="material-icons text-sm">delete</span>
                    </button>
                    <button
                      onClick={() => {
                        setEditData(selectedCollSession);
                        setIsEditing(true);
                      }}
                      className="flex-1 py-3 bg-military-900 text-white font-black uppercase text-xs rounded-xl"
                    >
                      Modifier le créneau
                    </button>
                  </div>
                )
              ) : (
                <div className="flex gap-2">
                  {selectedCollSession.participants.includes(user.nid) && (
                    <button
                      type="button"
                      onClick={() =>
                        downloadICSFile({
                          title: selectedCollSession.title,
                          description: selectedCollSession.detailedDescription || 'Séance collective EPMS',
                          location: selectedCollSession.locationName,
                          dateStr: selectedCollSession.eventDate || toLocalDateKey(currentDate),
                          timeStart: selectedCollSession.timeStart,
                          timeEnd: selectedCollSession.timeEnd
                        })
                      }
                      className="px-4 py-3 rounded-xl bg-white border border-military-200 text-military-900 font-black uppercase text-xs flex items-center gap-1"
                    >
                      <span className="material-icons text-sm">event</span> .ics
                    </button>
                  )}
                  <button
                    onClick={() => {
                      handleToggleJoin(selectedCollSession.id);
                      setSelectedCollSession(null);
                    }}
                    disabled={
                      selectedCollSession.cancelled ||
                      (selectedLocationUnavailable &&
                        !selectedCollSession.participants.includes(user.nid) &&
                        !selectedCollSession.waitlist?.includes(user.nid))
                    }
                    className="flex-1 py-3.5 rounded-xl font-black uppercase text-xs bg-military-900 text-white hover:bg-military-800 disabled:opacity-40"
                  >
                    {selectedCollSession.cancelled
                      ? 'Séance annulée'
                      : selectedLocationUnavailable
                      ? `Lieu indisponible : ${selectedLocation?.status === 'Closed' ? 'fermé' : 'en maintenance'}`
                      : selectedCollSession.participants.includes(user.nid)
                      ? 'Se désinscrire'
                      : selectedCollSession.waitlist?.includes(user.nid)
                      ? 'Quitter la liste d\'attente'
                      : selectedCollSession.participants.length >= selectedCollSession.maxParticipants
                      ? 'Rejoindre la liste d\'attente'
                      : 'Réserver ma place'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
