
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Auth from './components/Auth';
import DashboardUser from './components/DashboardUser';
import DashboardMonitor from './components/DashboardMonitor';
import DashboardAuthority from './components/DashboardAuthority';
import CalendarView from './components/CalendarView';
import EmergencyButton from './components/EmergencyButton';
import LibraryUser from './components/LibraryUser';
import LibraryMonitor from './components/LibraryMonitor';
import LiveSession from './components/LiveSession';
import SessionGenerator from './components/SessionGenerator';
import SessionCreator from './components/SessionCreator';
import EmergencyAlertPopup from './components/EmergencyAlertPopup';
import { UserRole, UserProfile, PhysicalTests, JobType, WorkSchedule, Session } from './types';
import { db, initializeDatabaseSync } from './services/mockDatabase';
import { calculateVMA } from './utils/biometrics';
import { generateNumberOptions, generateTimeOptionsMMSS, generateTimeOptionsHHMMSS } from './utils/options';
import { AIR_BASES, MILITARY_UNITS } from './utils/bases';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  
  // Profile Editing State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedUser, setEditedUser] = useState<UserProfile | null>(null);

  // Session State
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [libraryDefaultTab, setLibraryDefaultTab] = useState<'sessions' | 'programs' | 'global' | 'routes'>('routes');
  const [libraryDefaultProgramId, setLibraryDefaultProgramId] = useState<string | undefined>();

  // Check for session persistence and database updates
  useEffect(() => {
    initializeDatabaseSync();
    const handleStorage = (e: StorageEvent) => {
      // Sync auth state if changed
      if (e.key === 'currentUser') {
        if (!e.newValue) setCurrentUser(null);
        else {
          try {
            setCurrentUser(JSON.parse(e.newValue));
          } catch (error) {}
        }
      } else {
        // Any other storage change triggers a DB update
        window.dispatchEvent(new Event('db_updated'));
      }
    };
    
    const handleDbUpdate = () => {
      // Refresh currentUser if it exists in the updated users list
      const saved = localStorage.getItem('currentUser');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const users = db.getUsers();
          const updatedUser = users.find(u => u.nid === parsed.nid);
          if (updatedUser) {
            setCurrentUser(updatedUser);
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
          }
        } catch (e) {}
      }
    };
    
    window.addEventListener('db_updated', handleDbUpdate);
    window.addEventListener('storage', handleStorage);
    
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setCurrentUser(parsed);
      } catch (e) {
        console.error("Error parsing currentUser from localStorage:", e);
        localStorage.removeItem('currentUser');
      }
    }
    
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('db_updated', handleDbUpdate);
    };
  }, []);

  const handleLogin = (user: UserProfile) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    setCurrentPage('dashboard');
    setIsEditingProfile(false);
  };

  const handleUpdateUser = (updatedUser: UserProfile) => {
    const users = db.getUsers();
    const idx = users.findIndex(u => u.nid === updatedUser.nid);
    if (idx !== -1) {
        users[idx] = updatedUser;
        db.setUsers(users);
    }
    setCurrentUser(updatedUser);
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
  };

  const startEditing = () => {
      if (currentUser) {
          setEditedUser(JSON.parse(JSON.stringify(currentUser))); // Deep copy
          setIsEditingProfile(true);
      }
  };

  const cancelEditing = () => {
      setIsEditingProfile(false);
      setEditedUser(null);
  };

  const saveProfile = () => {
      if (!editedUser) return;
      
      // 1. Recalculate VMA based on new inputs to ensure consistency
      const newVma = calculateVMA(editedUser.tests);
      
      // 2. Prepare final object
      const finalUser: UserProfile = {
          ...editedUser,
          tests: {
              ...editedUser.tests,
              calculatedVMA: newVma
          }
      };

      // 3. Save
      handleUpdateUser(finalUser);
      setIsEditingProfile(false);
      setEditedUser(null);
      alert("Profil mis à jour. Les intensités de vos futurs programmes seront adaptées.");
  };

  if (!currentUser) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <Layout 
      userRole={currentUser.role} 
      onLogout={handleLogout}
      currentPage={currentPage}
      setPage={setCurrentPage}
    >
      {currentPage === 'dashboard' && currentUser.role === UserRole.USER && (
        <DashboardUser 
            user={currentUser} 
            onUpdateUser={handleUpdateUser} 
            onOpenLibrary={() => {
              setLibraryDefaultTab('routes');
              setLibraryDefaultProgramId(undefined);
              setCurrentPage('library');
            }}
            onOpenProgram={(programId) => {
              setLibraryDefaultTab('programs');
              setLibraryDefaultProgramId(programId);
              setCurrentPage('library');
            }}
            onStartSession={(session) => {
              setActiveSession(session);
              setCurrentPage('live-session');
            }}
        />
      )}

      {currentPage === 'dashboard' && currentUser.role === UserRole.MONITOR && (
        <DashboardMonitor user={currentUser} />
      )}

      {currentPage === 'dashboard' && currentUser.role === UserRole.ADMINISTRATOR && (
         <DashboardAuthority user={currentUser} />
      )}
      
      {currentPage === 'calendar' && (
        <CalendarView user={currentUser} />
      )}

      {currentPage === 'profile' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 max-w-3xl mx-auto overflow-hidden animate-[fadeIn_0.3s]">
              {/* Header Profile */}
              <div className="bg-military-900 p-8 text-white flex flex-col md:flex-row items-center gap-6">
                  <div className="w-24 h-24 bg-military-700 rounded-3xl flex items-center justify-center text-4xl font-black shadow-inner border-2 border-military-600">
                      {currentUser.name.charAt(0)}
                  </div>
                  <div className="text-center md:text-left flex-grow">
                      {isEditingProfile && editedUser ? (
                          <input 
                            className="text-2xl font-black bg-military-800 text-white border border-military-600 rounded p-2 w-full text-center md:text-left mb-2 outline-none focus:border-action-500"
                            value={editedUser.name}
                            onChange={e => setEditedUser({...editedUser, name: e.target.value})}
                          />
                      ) : (
                          <h2 className="text-3xl font-black uppercase tracking-tight">{currentUser.name}</h2>
                      )}
                      <p className="text-military-300 font-bold text-sm uppercase tracking-widest">{currentUser.role} • NID {currentUser.nid}</p>
                      <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-3">
                          <span className="bg-action-500 text-white px-3 py-1 rounded-lg text-xs font-black uppercase shadow-lg">
                              VMA {calculateVMA(currentUser.tests)} km/h
                          </span>
                          {!isEditingProfile && (
                              <button onClick={startEditing} className="bg-white text-military-900 px-4 py-1 rounded-lg text-xs font-black uppercase hover:bg-gray-100 transition-colors flex items-center gap-2">
                                  <span className="material-icons text-sm">edit</span> Modifier
                              </button>
                          )}
                      </div>
                  </div>
              </div>

              {/* Form Content */}
              <div className="p-8 space-y-8">
                  
                  {/* Section 1: Infos Pro */}
                  <section>
                      <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-100 pb-2">Informations Métier</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          <div>
                              <label className="block text-xs font-bold text-military-700 mb-1">Affectation (Base)</label>
                              {isEditingProfile && editedUser ? (
                                  <select 
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-military-900 outline-none focus:border-action-500"
                                    value={editedUser.serviceId || ''}
                                    onChange={e => setEditedUser({...editedUser, serviceId: e.target.value})}
                                  >
                                      <option value="" disabled>Sélectionner une base</option>
                                      {AIR_BASES.map(base => <option key={base.id} value={base.id}>{base.name}</option>)}
                                  </select>
                              ) : (
                                  <div className="p-3 bg-gray-50 rounded-xl font-bold text-military-900">
                                      {AIR_BASES.find(b => b.id === currentUser.serviceId)?.name || 'Non renseignée'}
                                  </div>
                              )}
                          </div>
                          {((isEditingProfile && editedUser?.serviceId) || (!isEditingProfile && currentUser.serviceId)) && (
                              <div className="animate-[fadeIn_0.3s]">
                                  <label className="block text-xs font-bold text-military-700 mb-1">Unité</label>
                                  {isEditingProfile && editedUser ? (
                                      <select 
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-military-900 outline-none focus:border-action-500"
                                        value={editedUser.unit || ''}
                                        onChange={e => setEditedUser({...editedUser, unit: e.target.value})}
                                      >
                                          <option value="">Sélectionner une unité</option>
                                          {MILITARY_UNITS.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                                      </select>
                                  ) : (
                                      <div className="p-3 bg-gray-50 rounded-xl font-bold text-military-900">
                                          {currentUser.unit || 'Non renseignée'}
                                      </div>
                                  )}
                              </div>
                          )}
                          <div>
                              <label className="block text-xs font-bold text-military-700 mb-1">Type de Poste</label>
                              {isEditingProfile && editedUser ? (
                                  <select 
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-military-900 outline-none focus:border-action-500"
                                    value={editedUser.jobType}
                                    onChange={e => setEditedUser({...editedUser, jobType: e.target.value as any})}
                                  >
                                      {Object.values(JobType).map(v => <option key={v} value={v}>{v}</option>)}
                                  </select>
                              ) : (
                                  <div className="p-3 bg-gray-50 rounded-xl font-bold text-military-900">{currentUser.jobType}</div>
                              )}
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-military-700 mb-1">Horaires</label>
                              {isEditingProfile && editedUser ? (
                                  <select 
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-military-900 outline-none focus:border-action-500"
                                    value={editedUser.workSchedule}
                                    onChange={e => setEditedUser({...editedUser, workSchedule: e.target.value as any})}
                                  >
                                      {Object.values(WorkSchedule).map(v => <option key={v} value={v}>{v}</option>)}
                                  </select>
                              ) : (
                                  <div className="p-3 bg-gray-50 rounded-xl font-bold text-military-900">{currentUser.workSchedule}</div>
                              )}
                          </div>
                      </div>
                  </section>

                  {/* Section 2: Performances */}
                  <section>
                      <div className="flex justify-between items-end mb-4 border-b border-gray-100 pb-2">
                          <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Tests Physiques (Données brutes)</h3>
                          {isEditingProfile && <span className="text-[10px] text-action-600 font-bold">Mise à jour VMA auto</span>}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Course */}
                          <div className="space-y-4">
                              <h4 className="text-xs font-black text-military-800 uppercase flex items-center gap-2">
                                  <span className="material-icons text-sm">directions_run</span> Course à pied
                              </h4>
                              
                              <div className="grid grid-cols-2 gap-4">
                                  <div>
                                      <label className="block text-[10px] font-bold text-gray-500 mb-1">Luc Léger (Palier)</label>
                                      {isEditingProfile && editedUser ? (
                                          <select className="w-full p-2 bg-white border border-gray-200 rounded-lg font-bold" 
                                            value={editedUser.tests.lucLegerPalier || ''} 
                                            onChange={e => setEditedUser({...editedUser, tests: {...editedUser.tests, lucLegerPalier: parseFloat(e.target.value)}})}
                                          >
                                              <option value="" disabled>Palier</option>
                                              {generateNumberOptions(1, 15, 0.5).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                          </select>
                                      ) : (
                                          <div className="font-bold text-military-900">{currentUser.tests.lucLegerPalier || '-'}</div>
                                      )}
                                  </div>
                                  <div>
                                      <label className="block text-[10px] font-bold text-gray-500 mb-1">VAMEVAL (Palier)</label>
                                      {isEditingProfile && editedUser ? (
                                          <select className="w-full p-2 bg-white border border-gray-200 rounded-lg font-bold" 
                                            value={editedUser.tests.vamevalPalier || ''} 
                                            onChange={e => setEditedUser({...editedUser, tests: {...editedUser.tests, vamevalPalier: parseFloat(e.target.value)}})}
                                          >
                                              <option value="" disabled>Palier</option>
                                              {generateNumberOptions(1, 25, 0.5).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                          </select>
                                      ) : (
                                          <div className="font-bold text-military-900">{currentUser.tests.vamevalPalier || '-'}</div>
                                      )}
                                  </div>
                                  <div>
                                      <label className="block text-[10px] font-bold text-gray-500 mb-1">Cooper (Mètres)</label>
                                      {isEditingProfile && editedUser ? (
                                          <select className="w-full p-2 bg-white border border-gray-200 rounded-lg font-bold" 
                                            value={editedUser.tests.cooperDistance || ''} 
                                            onChange={e => setEditedUser({...editedUser, tests: {...editedUser.tests, cooperDistance: parseFloat(e.target.value)}})}
                                          >
                                              <option value="" disabled>Distance</option>
                                              {generateNumberOptions(1000, 4000, 50).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                          </select>
                                      ) : (
                                          <div className="font-bold text-military-900">{currentUser.tests.cooperDistance || '-'}</div>
                                      )}
                                  </div>
                                  <div>
                                      <label className="block text-[10px] font-bold text-gray-500 mb-1">2400m (MM:SS)</label>
                                      {isEditingProfile && editedUser ? (
                                          <select className="w-full p-2 bg-white border border-gray-200 rounded-lg font-bold" 
                                            value={editedUser.tests.run2400mTime || ''} 
                                            onChange={e => setEditedUser({...editedUser, tests: {...editedUser.tests, run2400mTime: e.target.value}})}
                                          >
                                              <option value="" disabled>Temps</option>
                                              {generateTimeOptionsMMSS(8, 20, 15).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                          </select>
                                      ) : (
                                          <div className="font-bold text-military-900">{currentUser.tests.run2400mTime || '-'}</div>
                                      )}
                                  </div>
                                  <div>
                                      <label className="block text-[10px] font-bold text-gray-500 mb-1">10km (HH:MM:SS)</label>
                                      {isEditingProfile && editedUser ? (
                                          <select className="w-full p-2 bg-white border border-gray-200 rounded-lg font-bold" 
                                            value={editedUser.tests.run10kmTime || ''} 
                                            onChange={e => setEditedUser({...editedUser, tests: {...editedUser.tests, run10kmTime: e.target.value}})}
                                          >
                                              <option value="" disabled>Temps</option>
                                              {generateTimeOptionsHHMMSS(30, 90, 60).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                          </select>
                                      ) : (
                                          <div className="font-bold text-military-900">{currentUser.tests.run10kmTime || '-'}</div>
                                      )}
                                  </div>
                                  <div>
                                      <label className="block text-[10px] font-bold text-gray-500 mb-1">Semi-marathon (HH:MM:SS)</label>
                                      {isEditingProfile && editedUser ? (
                                          <select className="w-full p-2 bg-white border border-gray-200 rounded-lg font-bold" 
                                            value={editedUser.tests.runSemiMarathonTime || ''} 
                                            onChange={e => setEditedUser({...editedUser, tests: {...editedUser.tests, runSemiMarathonTime: e.target.value}})}
                                          >
                                              <option value="" disabled>Temps</option>
                                              {generateTimeOptionsHHMMSS(60, 180, 60).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                          </select>
                                      ) : (
                                          <div className="font-bold text-military-900">{currentUser.tests.runSemiMarathonTime || '-'}</div>
                                      )}
                                  </div>
                                  <div>
                                      <label className="block text-[10px] font-bold text-gray-500 mb-1">20km (HH:MM:SS)</label>
                                      {isEditingProfile && editedUser ? (
                                          <select className="w-full p-2 bg-white border border-gray-200 rounded-lg font-bold" 
                                            value={editedUser.tests.run20kmTime || ''} 
                                            onChange={e => setEditedUser({...editedUser, tests: {...editedUser.tests, run20kmTime: e.target.value}})}
                                          >
                                              <option value="" disabled>Temps</option>
                                              {generateTimeOptionsHHMMSS(60, 180, 60).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                          </select>
                                      ) : (
                                          <div className="font-bold text-military-900">{currentUser.tests.run20kmTime || '-'}</div>
                                      )}
                                  </div>
                              </div>
                          </div>

                          {/* Musculation */}
                          <div className="space-y-4">
                              <h4 className="text-xs font-black text-military-800 uppercase flex items-center gap-2">
                                  <span className="material-icons text-sm">fitness_center</span> Musculation
                              </h4>
                              
                              <div className="grid grid-cols-2 gap-4">
                                  <div>
                                      <label className="block text-[10px] font-bold text-gray-500 mb-1">Pompes (Max)</label>
                                      {isEditingProfile && editedUser ? (
                                          <select className="w-full p-2 bg-white border border-gray-200 rounded-lg font-bold" 
                                            value={editedUser.tests.pushups ?? ''} 
                                            onChange={e => setEditedUser({...editedUser, tests: {...editedUser.tests, pushups: parseInt(e.target.value)}})}
                                          >
                                              <option value="" disabled>Répétitions</option>
                                              {generateNumberOptions(0, 120, 1).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                          </select>
                                      ) : (
                                          <div className="font-bold text-military-900">{currentUser.tests.pushups ?? '-'}</div>
                                      )}
                                  </div>
                                  <div>
                                      <label className="block text-[10px] font-bold text-gray-500 mb-1">Tractions (Max CCPM)</label>
                                      {isEditingProfile && editedUser ? (
                                          <select className="w-full p-2 bg-white border border-gray-200 rounded-lg font-bold" 
                                            value={editedUser.tests.pullups ?? ''} 
                                            onChange={e => setEditedUser({...editedUser, tests: {...editedUser.tests, pullups: parseInt(e.target.value)}})}
                                          >
                                              <option value="" disabled>Répétitions</option>
                                              {generateNumberOptions(0, 50, 1).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                          </select>
                                      ) : (
                                          <div className="font-bold text-military-900">{currentUser.tests.pullups ?? '-'}</div>
                                      )}
                                  </div>
                                  <div>
                                      <label className="block text-[10px] font-bold text-gray-500 mb-1">Tractions (Max Absolu)</label>
                                      {isEditingProfile && editedUser ? (
                                          <select className="w-full p-2 bg-white border border-gray-200 rounded-lg font-bold" 
                                            value={editedUser.tests.maxPullups ?? ''} 
                                            onChange={e => setEditedUser({...editedUser, tests: {...editedUser.tests, maxPullups: parseInt(e.target.value)}})}
                                          >
                                              <option value="" disabled>Répétitions</option>
                                              {generateNumberOptions(0, 50, 1).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                          </select>
                                      ) : (
                                          <div className="font-bold text-military-900">{currentUser.tests.maxPullups ?? '-'}</div>
                                      )}
                                  </div>
                                  <div>
                                      <label className="block text-[10px] font-bold text-gray-500 mb-1">1RM Squat (kg)</label>
                                      {isEditingProfile && editedUser ? (
                                          <select className="w-full p-2 bg-white border border-gray-200 rounded-lg font-bold" 
                                            value={editedUser.tests.squat1RM || ''} 
                                            onChange={e => setEditedUser({...editedUser, tests: {...editedUser.tests, squat1RM: parseFloat(e.target.value)}})}
                                          >
                                              <option value="" disabled>Poids (kg)</option>
                                              {generateNumberOptions(20, 250, 2.5).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                          </select>
                                      ) : (
                                          <div className="font-bold text-military-900">{currentUser.tests.squat1RM || '-'}</div>
                                      )}
                                  </div>
                                  <div>
                                      <label className="block text-[10px] font-bold text-gray-500 mb-1">1RM DC (kg)</label>
                                      {isEditingProfile && editedUser ? (
                                          <select className="w-full p-2 bg-white border border-gray-200 rounded-lg font-bold" 
                                            value={editedUser.tests.benchPress1RM || ''} 
                                            onChange={e => setEditedUser({...editedUser, tests: {...editedUser.tests, benchPress1RM: parseFloat(e.target.value)}})}
                                          >
                                              <option value="" disabled>Poids (kg)</option>
                                              {generateNumberOptions(20, 200, 2.5).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                          </select>
                                      ) : (
                                          <div className="font-bold text-military-900">{currentUser.tests.benchPress1RM || '-'}</div>
                                      )}
                                  </div>
                                  <div>
                                      <label className="block text-[10px] font-bold text-gray-500 mb-1">1RM Soulevé de Terre (kg)</label>
                                      {isEditingProfile && editedUser ? (
                                          <select className="w-full p-2 bg-white border border-gray-200 rounded-lg font-bold" 
                                            value={editedUser.tests.deadlift1RM || ''} 
                                            onChange={e => setEditedUser({...editedUser, tests: {...editedUser.tests, deadlift1RM: parseFloat(e.target.value)}})}
                                          >
                                              <option value="" disabled>Poids (kg)</option>
                                              {generateNumberOptions(20, 300, 2.5).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                          </select>
                                      ) : (
                                          <div className="font-bold text-military-900">{currentUser.tests.deadlift1RM || '-'}</div>
                                      )}
                                  </div>
                              </div>
                          </div>
                      </div>
                  </section>

                  {/* Actions Buttons */}
                  {isEditingProfile && (
                      <div className="flex gap-4 pt-6 border-t border-gray-100 animate-[slideUp_0.2s]">
                          <button onClick={cancelEditing} className="flex-1 py-4 rounded-xl font-bold uppercase text-xs text-gray-500 hover:bg-gray-50">
                              Annuler
                          </button>
                          <button onClick={saveProfile} className="flex-[2] py-4 rounded-xl bg-action-500 text-white font-black uppercase text-xs shadow-lg hover:bg-action-600 active:scale-95 transition-all">
                              Enregistrer les modifications
                          </button>
                      </div>
                  )}
              </div>
          </div>
      )}

      {currentPage === 'tracking' && (
           <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center py-20">
              <span className="material-icons text-6xl text-gray-200 mb-4">insights</span>
              <h2 className="text-2xl font-black text-military-900 uppercase">Suivi de progression</h2>
              <p className="text-gray-500 mt-2">Les graphiques de performance seront disponibles prochainement.</p>
          </div>
      )}

      {currentPage === 'library' && currentUser.role === UserRole.USER && (
        <LibraryUser 
          user={currentUser} 
          defaultTab={libraryDefaultTab}
          defaultProgramId={libraryDefaultProgramId}
          onStartSession={(session) => {
            setActiveSession(session);
            setCurrentPage('live-session');
          }}
        />
      )}

      {currentPage === 'library' && currentUser.role === UserRole.MONITOR && (
        <LibraryMonitor user={currentUser} />
      )}

      {currentPage === 'session-generator' && currentUser && (
        <SessionGenerator 
          user={currentUser}
          onSessionGenerated={(session) => {
            setActiveSession(session);
            setCurrentPage('live-session');
          }}
          onCancel={() => setCurrentPage('library')}
        />
      )}

      {currentPage === 'session-creator' && currentUser && (
        <SessionCreator 
          user={currentUser}
          onSessionCreated={(session) => {
            setActiveSession(session);
            setCurrentPage('live-session');
          }}
          onCancel={() => setCurrentPage('library')}
        />
      )}

      {currentPage === 'live-session' && activeSession && (
        <LiveSession 
          session={activeSession}
          onComplete={(completedSession) => {
            if (currentUser) {
              const updatedUser = { ...currentUser };
              if (!updatedUser.completedSessions) {
                updatedUser.completedSessions = [];
              }
              completedSession.isCompleted = true;
              updatedUser.completedSessions.push(completedSession);
              
              // Update user in db
              const users = db.getUsers();
              const idx = users.findIndex(u => u.nid === currentUser.nid);
              if (idx !== -1) {
                users[idx] = updatedUser;
                db.setUsers(users);
              }
              
              setCurrentUser(updatedUser);
              localStorage.setItem('currentUser', JSON.stringify(updatedUser));
            }
            setActiveSession(null);
            setCurrentPage('library');
          }}
          onCancel={() => {
            setActiveSession(null);
            setCurrentPage('library');
          }}
        />
      )}

      <EmergencyButton user={currentUser} />
      
      {currentUser && (currentUser.role === UserRole.MONITOR || currentUser.role === UserRole.ADMINISTRATOR) && (
        <EmergencyAlertPopup />
      )}
    </Layout>
  );
};

export default App;
