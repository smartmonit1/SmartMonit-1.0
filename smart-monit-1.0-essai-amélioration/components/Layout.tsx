
import React from 'react';
import { UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  userRole?: UserRole;
  onLogout: () => void;
  currentPage: string;
  setPage: (page: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, userRole, onLogout, currentPage, setPage }) => {
  return (
    <div className="min-h-screen bg-military-50 font-sans text-military-900 flex flex-col">
      {/* Header */}
      <header className="bg-[#27322A] text-white p-4 sticky top-0 z-50 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setPage('dashboard')}>
          <span className="material-icons text-yellow-500 transform -rotate-45">fitness_center</span>
          <h1 className="text-xl font-bold tracking-wider">SMART MONIT</h1>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={onLogout} className="text-gray-300 hover:text-white flex items-center justify-center bg-black/20 w-10 h-10 rounded-lg border border-white/5 transition-colors">
            <span className="material-icons text-base">logout</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 md:p-6 w-full max-w-6xl mx-auto pb-24 md:pb-6">
        {children}
      </main>

      {/* Mobile/Tablet Sticky Bottom Nav */}
      {userRole && (
        <nav className="fixed bottom-0 w-full bg-white border-t border-military-200 shadow-[0_-2px_10px_rgba(0,0,0,0.1)] z-40 md:hidden">
          <div className="flex justify-around items-center h-16">
             {userRole === UserRole.MONITOR ? (
               <>
                <NavBtn 
                  icon="dashboard" 
                  label="Console" 
                  active={currentPage === 'dashboard'} 
                  onClick={() => setPage('dashboard')} 
                />
                <NavBtn 
                  icon="library_books" 
                  label="Biblio" 
                  active={currentPage === 'library'} 
                  onClick={() => setPage('library')} 
                />
                <NavBtn 
                  icon="person" 
                  label="Profil" 
                  active={currentPage === 'profile'} 
                  onClick={() => setPage('profile')} 
                />
               </>
            ) : (
              <>
                <NavBtn 
                  icon="dashboard" 
                  label="Accueil" 
                  active={currentPage === 'dashboard'} 
                  onClick={() => setPage('dashboard')} 
                />
                <NavBtn 
                  icon="library_books" 
                  label="Biblio" 
                  active={currentPage === 'library'} 
                  onClick={() => setPage('library')} 
                />
                <NavBtn 
                  icon="calendar_month" 
                  label="Agenda" 
                  active={currentPage === 'calendar'} 
                  onClick={() => setPage('calendar')} 
                />
                <NavBtn 
                  icon="assessment" 
                  label="Suivi" 
                  active={currentPage === 'tracking'} 
                  onClick={() => setPage('tracking')} 
                />
                <NavBtn 
                  icon="person" 
                  label="Profil" 
                  active={currentPage === 'profile'} 
                  onClick={() => setPage('profile')} 
                />
              </>
            )}
          </div>
        </nav>
      )}
    </div>
  );
};

const NavBtn = ({ icon, label, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-full h-full transition-colors ${active ? 'text-action-600 bg-military-50/50 border-t-2 border-action-500' : 'text-military-400'}`}
  >
    <span className="material-icons text-2xl mb-0.5">{icon}</span>
    <span className="text-[10px] font-medium uppercase tracking-wide">{label}</span>
  </button>
);

export default Layout;
