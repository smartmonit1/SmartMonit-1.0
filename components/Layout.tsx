import React, { useState, useEffect, useRef } from 'react';
import { UserRole, UserProfile, AppNotification } from '../types';
import { db, getSyncStatus } from '../services/mockDatabase';
import { getBaseCode } from '../utils/bases';
import { formatDateTimeFr } from '../utils/compliance';
import InstallPWAButton from './InstallPWAButton';

interface LayoutProps {
  children: React.ReactNode;
  user: UserProfile;
  effectiveRole: UserRole;
  onToggleEffectiveRole?: () => void;
  onLogout: () => void;
  currentPage: string;
  setPage: (page: string) => void;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  user,
  effectiveRole,
  onToggleEffectiveRole,
  onLogout,
  currentPage,
  setPage
}) => {
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [syncOnline, setSyncOnline] = useState(getSyncStatus().firestoreConnected);
  const closeNotifsButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!showNotifs) return;
    closeNotifsButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowNotifs(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [showNotifs]);

  useEffect(() => {
    const loadNotifs = () => {
      const all = db.getNotifications();
      const visible = all.filter((n) => {
        if (n.targetNids && n.targetNids.length > 0) {
          return n.targetNids.includes(user.nid);
        }
        if (n.targetRoles && n.targetRoles.length > 0) {
          return n.targetRoles.includes(user.role) && (!n.serviceId || n.serviceId === user.serviceId);
        }
        if (n.serviceId && n.serviceId !== user.serviceId) return false;
        return true;
      });
      setNotifs(visible.slice(0, 25));
      setSyncOnline(getSyncStatus().firestoreConnected);
    };
    loadNotifs();
    window.addEventListener('db_updated', loadNotifs);
    return () => window.removeEventListener('db_updated', loadNotifs);
  }, [user.nid, user.role, user.serviceId]);

  const unreadCount = notifs.filter((n) => !n.read).length;

  const navItems =
    effectiveRole === UserRole.MONITOR
      ? [
          { id: 'dashboard', icon: 'dashboard', label: 'Console' },
        { id: 'library', icon: 'library_books', label: 'Bibliothèque' },
          { id: 'calendar', icon: 'calendar_month', label: 'Planning' },
          { id: 'profile', icon: 'person', label: 'Profil' }
        ]
      : effectiveRole === UserRole.ADMINISTRATOR
      ? [
        { id: 'dashboard', icon: 'analytics', label: 'Pilotage' },
        { id: 'calendar', icon: 'calendar_month', label: 'Planning' },
          { id: 'profile', icon: 'person', label: 'Profil' }
        ]
      : [
          { id: 'dashboard', icon: 'dashboard', label: 'Accueil' },
          { id: 'library', icon: 'library_books', label: 'Biblio' },
          { id: 'calendar', icon: 'calendar_month', label: 'Agenda' },
          { id: 'tracking', icon: 'insights', label: 'Suivi' },
          { id: 'profile', icon: 'person', label: 'Profil' }
        ];

  const canSwitchToUser = user.role === UserRole.MONITOR || user.role === UserRole.ADMINISTRATOR;
  const isInPratiquantMode = canSwitchToUser && effectiveRole === UserRole.USER;

  const roleBadgeLabel =
    effectiveRole === UserRole.MONITOR
      ? 'Moniteur'
      : effectiveRole === UserRole.ADMINISTRATOR
      ? 'Autorité'
      : 'Utilisateur';
  const activeNavItem = navItems.find((item) => item.id === currentPage);
  const pageLabel =
    activeNavItem?.label ||
    (currentPage === 'live-session' ? 'Séance en cours' : 'Espace personnel');
  const workspaceClass =
    effectiveRole === UserRole.MONITOR
      ? 'workspace-monitor'
      : effectiveRole === UserRole.ADMINISTRATOR
      ? 'workspace-authority'
      : 'workspace-practitioner';

  return (
    <div className={`app-shell ${workspaceClass} min-h-screen bg-military-50 font-sans text-military-900 flex flex-col`}>
      {/* Top Header */}
      <header className="bg-military-900 text-white px-4 py-3 sticky top-0 z-50 shadow-md flex justify-between items-center border-b border-military-800 no-print">
        <button
          type="button"
          className="flex items-center gap-3 text-left rounded-xl focus-visible:outline-offset-4"
          onClick={() => setPage('dashboard')}
          aria-label="SmartMonit — revenir à l’accueil"
        >
          <img
            src="/icons/icon-192.png"
            alt="SmartMonit"
            className="w-9 h-9 rounded-xl border border-action-500/40 shadow-sm"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base md:text-lg font-black tracking-wider leading-none">SMART MONIT</h1>
              <span className="text-[9px] font-black uppercase bg-action-500 text-military-950 px-1.5 py-0.5 rounded">1.0</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-military-300 font-semibold mt-0.5">
              <span>{getBaseCode(user.serviceId)}</span>
              <span>•</span>
              <span className="uppercase">{roleBadgeLabel}</span>
              <span className="hidden sm:inline-flex items-center gap-1 ml-1 text-[9px] px-1.5 py-0.2 rounded bg-white/10">
                <span className={`w-1.5 h-1.5 rounded-full ${syncOnline ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                {syncOnline ? 'Sync Cloud' : 'Sync Local'}
              </span>
            </div>
          </div>
        </button>

        <div className="flex items-center gap-2">
          {/* Installation 1 clic Smartphone / PWA */}
          <InstallPWAButton variant="header" />

          {/* Bascule Mode Pratiquant / Espace Métier (Section 4.4 du dossier) */}
          {canSwitchToUser && onToggleEffectiveRole && (
            <button
              onClick={onToggleEffectiveRole}
              className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border transition-all ${
                isInPratiquantMode
                  ? 'bg-action-500 text-military-950 border-action-400 hover:bg-action-400'
                  : 'bg-military-800 text-military-100 border-military-700 hover:bg-military-700'
              }`}
              title="Basculer entre votre espace métier et votre entraînement personnel"
            >
              <span className="material-icons text-sm">swap_horiz</span>
              <span className="hidden sm:inline">
                {isInPratiquantMode
                  ? user.role === UserRole.MONITOR
                    ? 'Retour Moniteur'
                    : 'Retour Autorité'
                  : 'Mon Entraînement'}
              </span>
            </button>
          )}

          {/* Notifications Bell */}
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative bg-military-800 hover:bg-military-700 text-gray-200 w-10 h-10 rounded-xl border border-white/5 flex items-center justify-center transition-colors"
            aria-label="Notifications"
          >
            <span className="material-icons text-lg">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Logout */}
          <button
            onClick={onLogout}
            className="text-gray-300 hover:text-white flex items-center justify-center bg-military-800 hover:bg-red-600/80 w-10 h-10 rounded-xl border border-white/5 transition-colors"
            title="Déconnexion"
            aria-label="Déconnexion"
          >
            <span className="material-icons text-lg">logout</span>
          </button>
        </div>
      </header>

      {/* Body with Desktop Sidebar + Main */}
      <div className="flex flex-1 min-h-0">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-60 shrink-0 bg-white border-r border-military-200/80 p-4 justify-between sticky top-[61px] h-[calc(100vh-61px)] no-print">
          <div className="space-y-1.5">
            <div className="px-3 py-2 mb-3 bg-military-50 rounded-xl border border-military-100">
              <div className="text-[9px] font-black uppercase tracking-widest text-military-400 mb-1">
                Espace {roleBadgeLabel}
              </div>
              <div className="text-xs font-black text-military-900 truncate">{user.name}</div>
              <div className="text-[10px] font-mono text-military-500">ID {user.nid}</div>
              {user.unit && <div className="text-[10px] text-action-700 font-bold truncate mt-0.5">{user.unit}</div>}
            </div>

            <nav className="space-y-1.5" aria-label="Navigation principale">
              {navItems.map((item) => {
                const active = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPage(item.id)}
                    aria-current={active ? 'page' : undefined}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                      active
                        ? 'bg-military-900 text-white shadow-md'
                        : 'text-military-600 hover:bg-military-50 hover:text-military-900'
                    }`}
                  >
                    <span className={`material-icons text-lg ${active ? 'text-action-400' : 'text-military-400'}`}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-3 rounded-xl bg-military-900 text-white text-[10px] space-y-1">
            <div className="font-black uppercase tracking-widest text-action-400">SmartMonit</div>
            <p className="text-military-200 leading-relaxed">
              Pratique, coaching et gestion des installations réunis. Les recommandations restent des aides à la décision.
            </p>
          </div>
        </aside>

        {/* Main Content */}
        <main className="app-main flex-grow p-4 md:p-6 w-full max-w-7xl mx-auto pb-24 md:pb-10 min-w-0">
          <div className="workspace-breadcrumb" aria-label="Emplacement actuel">
            <span>{roleBadgeLabel}</span>
            <span className="material-icons" aria-hidden="true">chevron_right</span>
            <strong>{pageLabel}</strong>
          </div>
          {children}
        </main>
      </div>

      {/* Notifications Drawer */}
      {showNotifs && (
        <div
          className="fixed inset-0 bg-black/40 z-[70] flex justify-end no-print"
          onClick={() => setShowNotifs(false)}
        >
          <div
            className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-[fadeIn_0.2s]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="notifications-title"
          >
            <div className="p-5 bg-military-900 text-white flex justify-between items-center">
              <div>
                <h3 id="notifications-title" className="font-black uppercase tracking-wider text-sm">Centre de notifications</h3>
                <p className="text-[11px] text-military-300">{unreadCount} non lue(s)</p>
              </div>
              <button
                type="button"
                ref={closeNotifsButtonRef}
                onClick={() => setShowNotifs(false)}
                className="text-gray-300 hover:text-white rounded-lg p-2"
                aria-label="Fermer les notifications"
              >
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="flex-grow overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {notifs.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">Aucune notification pour le moment.</div>
              ) : (
                notifs.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => db.markNotificationRead(n.id)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all ${
                      n.read ? 'bg-gray-50 border-gray-100 opacity-75' : 'bg-white border-action-300 shadow-sm'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <span className="font-black text-xs uppercase text-military-900">{n.title}</span>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-action-500 shrink-0 mt-1" />}
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">{n.message}</p>
                    <div className="text-[10px] text-gray-400 mt-2">
                      {formatDateTimeFr(new Date(n.timestamp).toISOString())}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sticky Bottom Nav */}
      <nav
        className="fixed bottom-0 w-full bg-white border-t border-military-200 shadow-[0_-2px_10px_rgba(0,0,0,0.08)] z-40 md:hidden no-print"
        aria-label="Navigation principale"
      >
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => (
            <NavBtn
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={currentPage === item.id}
              current={currentPage === item.id}
              onClick={() => setPage(item.id)}
            />
          ))}
        </div>
      </nav>
    </div>
  );
};

const NavBtn: React.FC<{ icon: string; label: string; active: boolean; current: boolean; onClick: () => void }> = ({
  icon,
  label,
  active,
  current,
  onClick
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-current={current ? 'page' : undefined}
    className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
      active ? 'text-action-600 bg-military-50/60 border-t-2 border-action-500' : 'text-military-400'
    }`}
  >
    <span className="material-icons text-2xl mb-0.5">{icon}</span>
    <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
  </button>
);

export default Layout;
