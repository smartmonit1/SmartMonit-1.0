import React, { Suspense, lazy, useState, useEffect } from 'react';
import Layout from './components/Layout';
const Auth = lazy(() => import('./components/Auth'));
const DashboardUser = lazy(() => import('./components/DashboardUser'));
const DashboardMonitor = lazy(() => import('./components/DashboardMonitor'));
const DashboardAuthority = lazy(() => import('./components/DashboardAuthority'));
const CalendarView = lazy(() => import('./components/CalendarView'));
import EmergencyButton from './components/EmergencyButton';
const LibraryUser = lazy(() => import('./components/LibraryUser'));
const LibraryMonitor = lazy(() => import('./components/LibraryMonitor'));
const LiveSession = lazy(() => import('./components/LiveSession'));
const ProfileView = lazy(() => import('./components/ProfileView'));
const TrackingView = lazy(() => import('./components/TrackingView'));
import EmergencyAlertPopup from './components/EmergencyAlertPopup';
import InstallPWAButton from './components/InstallPWAButton';
import { ToastProvider, useToast } from './components/ToastProvider';
import { UserRole, UserProfile, Session, CompletedSessionLog } from './types';
import { db, initializeDatabaseSync } from './services/mockDatabase';
import { SESSION_INACTIVITY_TIMEOUT_MS, stripSecretsFromUser } from './utils/security';

const PageLoading: React.FC = () => (
  <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-live="polite">
    <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 text-sm font-bold text-military-700 shadow-sm">
      <span className="material-icons animate-spin text-action-600" aria-hidden="true">progress_activity</span>
      Chargement de l’espace…
    </div>
  </div>
);

const SmartMonitApp: React.FC = () => {
  const { showToast } = useToast();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [effectiveRole, setEffectiveRole] = useState<UserRole>(UserRole.USER);
  const [currentPage, setCurrentPage] = useState('dashboard');

  // Session Live State
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [activeSessionType, setActiveSessionType] = useState<'FLASH' | 'PROGRAM' | 'COLLECTIVE' | 'FREE' | 'LIBRARY'>('FLASH');
  const [activeSessionUser, setActiveSessionUser] = useState<UserProfile | null>(null);

  // Library navigation context
  const [libraryDefaultTab, setLibraryDefaultTab] = useState<'sessions' | 'programs' | 'global' | 'routes'>('global');
  const [libraryDefaultProgramId, setLibraryDefaultProgramId] = useState<string | undefined>();

  useEffect(() => {
    initializeDatabaseSync();

    const syncCurrentUserFromDb = () => {
      const saved = localStorage.getItem('sm_currentUser');
      if (!saved) return;
      try {
        const parsed: UserProfile = JSON.parse(saved);
        const latest = db.getUsers().find((u) => u.nid === parsed.nid);
        if (latest) {
          const clean = stripSecretsFromUser(latest);
          setCurrentUser(clean);
          localStorage.setItem('sm_currentUser', JSON.stringify(clean));
        }
      } catch {
        localStorage.removeItem('sm_currentUser');
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'sm_currentUser') {
        if (!e.newValue) setCurrentUser(null);
        else {
          try {
            const parsed: UserProfile = JSON.parse(e.newValue);
            setCurrentUser(parsed);
            setEffectiveRole(parsed.role);
          } catch {}
        }
      } else if (e.key && e.key.startsWith('sm_v4_')) {
        window.dispatchEvent(new Event('db_updated'));
      }
    };

    window.addEventListener('db_updated', syncCurrentUserFromDb);
    window.addEventListener('storage', handleStorage);

    const savedUser = localStorage.getItem('sm_currentUser');
    if (savedUser) {
      try {
        const parsed: UserProfile = JSON.parse(savedUser);
        const fresh = db.getUsers().find((u) => u.nid === parsed.nid) || parsed;
        setCurrentUser(fresh);
        setEffectiveRole(fresh.role);
      } catch {
        localStorage.removeItem('sm_currentUser');
      }
    }

    return () => {
      window.removeEventListener('db_updated', syncCurrentUserFromDb);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const handleLogin = (user: UserProfile) => {
    const clean = stripSecretsFromUser(user);
    setCurrentUser(clean);
    setEffectiveRole(clean.role);
    setCurrentPage('dashboard');
    localStorage.setItem('sm_currentUser', JSON.stringify(clean));
    showToast(`Bienvenue, ${clean.name}`, 'success');
  };

  const handleLogout = (reason?: string) => {
    if (currentUser) {
      db.logAudit({
        actorNid: currentUser.nid,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        serviceId: currentUser.serviceId,
        action: 'LOGOUT',
        details: reason || 'Déconnexion volontaire de l\'utilisateur.'
      });
    }
    setCurrentUser(null);
    setActiveSession(null);
    setActiveSessionUser(null);
    localStorage.removeItem('sm_currentUser');
    setCurrentPage('dashboard');
  };

  // Expiration automatique de session après 30 min d'inactivité (Recommandation CNIL / Défense)
  useEffect(() => {
    if (!currentUser) return;
    let timeoutId: ReturnType<typeof setTimeout>;
    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        showToast('Session expirée après 30 minutes d\'inactivité (sécurité CNIL).', 'warning');
        handleLogout('Déconnexion automatique pour inactivité (30 min).');
      }, SESSION_INACTIVITY_TIMEOUT_MS);
    };

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((ev) => window.addEventListener(ev, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
  }, [currentUser]);

  const handleUpdateUser = (updatedUser: UserProfile) => {
    // Préserve le passwordHash existant en base lors des mises à jour de profil
    const existing = db.getUsers().find((u) => u.nid === updatedUser.nid);
    const toPersist: UserProfile = {
      ...updatedUser,
      passwordHash: updatedUser.passwordHash || existing?.passwordHash
    };
    delete toPersist.password;
    db.updateUser(toPersist);
    const clean = stripSecretsFromUser(toPersist);
    setCurrentUser(clean);
    if (clean.role === UserRole.USER) {
      setEffectiveRole(UserRole.USER);
    }
    localStorage.setItem('sm_currentUser', JSON.stringify(clean));
  };

  const handleToggleEffectiveRole = () => {
    if (!currentUser) return;
    if (effectiveRole === UserRole.USER) {
      setEffectiveRole(currentUser.role);
      setCurrentPage('dashboard');
      showToast(
        `Bascule vers votre espace ${currentUser.role === UserRole.MONITOR ? 'Moniteur' : 'Autorité'}.`,
        'info'
      );
    } else {
      setEffectiveRole(UserRole.USER);
      setCurrentPage('dashboard');
      showToast('Bascule vers votre espace Pratiquant personnel.', 'info');
    }
  };

  const handleStartSession = (
    session: Session,
    type: 'FLASH' | 'PROGRAM' | 'COLLECTIVE' | 'FREE' | 'LIBRARY' = 'FLASH'
  ) => {
    setActiveSession(session);
    setActiveSessionUser(null);
    setActiveSessionType(type);
    setCurrentPage('live-session');
  };

  const handleLaunchCoachedSession = (session: Session, participant: UserProfile) => {
    setActiveSession({
      ...session,
      description: `${session.description}${currentUser ? ` · Séance accompagnée par ${currentUser.name}` : ''}`
    });
    setActiveSessionUser(participant);
    setActiveSessionType('FLASH');
    setCurrentPage('live-session');
  };

  if (!currentUser) {
    return (
      <Suspense fallback={<PageLoading />}>
        <Auth onLogin={handleLogin} />
      </Suspense>
    );
  }

  return (
    <Layout
      user={currentUser}
      effectiveRole={effectiveRole}
      onToggleEffectiveRole={handleToggleEffectiveRole}
      onLogout={() => handleLogout()}
      currentPage={currentPage}
      setPage={setCurrentPage}
    >
      <Suspense fallback={<PageLoading />}>
        {currentPage === 'dashboard' && effectiveRole === UserRole.USER && (
          <DashboardUser
            user={currentUser}
            onUpdateUser={handleUpdateUser}
            onOpenLibrary={(tab = 'global') => {
              setLibraryDefaultTab(tab);
              setLibraryDefaultProgramId(undefined);
              setCurrentPage('library');
            }}
            onOpenAgenda={() => setCurrentPage('calendar')}
            onOpenProgram={(programId) => {
              setLibraryDefaultTab('programs');
              setLibraryDefaultProgramId(programId);
              setCurrentPage('library');
            }}
            onStartSession={handleStartSession}
          />
        )}

        {currentPage === 'dashboard' && effectiveRole === UserRole.MONITOR && (
          <DashboardMonitor user={currentUser} onLaunchCoachedSession={handleLaunchCoachedSession} />
        )}

        {currentPage === 'dashboard' && effectiveRole === UserRole.ADMINISTRATOR && (
          <DashboardAuthority user={currentUser} onUserUpdated={handleUpdateUser} />
        )}

        {currentPage === 'calendar' && (
          <CalendarView user={currentUser} canEdit={effectiveRole === UserRole.MONITOR} />
        )}

        {currentPage === 'tracking' && <TrackingView user={currentUser} />}

        {currentPage === 'profile' && (
          <ProfileView
            user={currentUser}
            onUpdateUser={handleUpdateUser}
            onAccountDeleted={() => {
              setCurrentUser(null);
              setActiveSession(null);
              localStorage.removeItem('sm_currentUser');
              setCurrentPage('dashboard');
            }}
          />
        )}

        {currentPage === 'library' && effectiveRole === UserRole.USER && (
          <LibraryUser
            user={currentUser}
            defaultTab={libraryDefaultTab}
            defaultProgramId={libraryDefaultProgramId}
            onStartSession={(sess, t) => handleStartSession(sess, t || 'LIBRARY')}
          />
        )}

        {currentPage === 'library' && effectiveRole === UserRole.MONITOR && (
          <LibraryMonitor user={currentUser} />
        )}

        {currentPage === 'live-session' && activeSession && (
          <LiveSession
            user={activeSessionUser || currentUser}
            session={activeSession}
            sessionType={activeSessionType}
            onComplete={(completedSession, meta) => {
            const nowIso = new Date().toISOString();
            const finishedSession: Session = {
              ...completedSession,
              isCompleted: true,
              rpe: meta.rpe,
              completedAt: nowIso
            };

            // 1. Marque la séance comme terminée dans le programme parent si applicable
            if (completedSession.programId) {
              db.markProgramSessionCompleted(completedSession.programId, completedSession.id);
            }

            // 2. Ajoute au journal de suivi de l'utilisateur
            const log: CompletedSessionLog = {
              id: `log_${Date.now()}`,
              sessionId: completedSession.id,
              title: completedSession.title,
              type: completedSession.workoutType || completedSession.type || 'SPORT',
              date: nowIso,
              durationMinutes: meta.durationMinutes,
              locationName: completedSession.locationName || 'Installation sportive',
              rpe: meta.rpe,
              notes: meta.notes || undefined,
              programId: completedSession.programId,
              adaptedForDailyForm: completedSession.title.toLowerCase().includes('adapt'),
              totalVolumeKg: meta.totalVolumeKg,
              setsCompleted: meta.setsCompleted
            };

            const sessionUser = activeSessionUser || currentUser;
            const updatedUser: UserProfile = {
              ...sessionUser,
              completedSessions: [finishedSession, ...(sessionUser.completedSessions || [])],
              sessionLogs: [log, ...(sessionUser.sessionLogs || [])]
            };

            const wasCoachLed = Boolean(activeSessionUser);
            if (wasCoachLed && activeSessionUser) {
              const existingParticipant = db.getUsers().find((item) => item.nid === activeSessionUser.nid);
              db.updateUser({
                ...updatedUser,
                passwordHash: updatedUser.passwordHash || existingParticipant?.passwordHash
              });
            } else {
              handleUpdateUser(updatedUser);
            }
            setActiveSession(null);
            setActiveSessionUser(null);
            setCurrentPage(wasCoachLed ? 'dashboard' : 'tracking');
            showToast(
              wasCoachLed
                ? 'Séance clôturée. Le suivi du membre a été mis à jour.'
                : 'Séance clôturée. Votre suivi a été mis à jour.',
              'success'
            );
            }}
            onCancel={() => {
              setActiveSession(null);
              setActiveSessionUser(null);
              setCurrentPage('dashboard');
              showToast('Séance interrompue et enregistrée dans le suivi.', 'info');
            }}
          />
        )}
      </Suspense>

      <EmergencyButton user={currentUser} />

      {(currentUser.role === UserRole.MONITOR || currentUser.role === UserRole.ADMINISTRATOR) && (
        <EmergencyAlertPopup serviceId={currentUser.serviceId} />
      )}

      <InstallPWAButton variant="banner" />
    </Layout>
  );
};

const App: React.FC = () => (
  <ToastProvider>
    <SmartMonitApp />
  </ToastProvider>
);

export default App;
