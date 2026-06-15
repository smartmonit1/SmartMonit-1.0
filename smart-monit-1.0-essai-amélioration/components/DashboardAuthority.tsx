import React, { useState, useEffect } from 'react';
import { UserProfile, ActiveSession } from '../types';
import { db } from '../services/mockDatabase';
import { calculateVMA } from '../utils/biometrics';

interface DashboardAuthorityProps {
  user: UserProfile;
}

const DashboardAuthority: React.FC<DashboardAuthorityProps> = ({ user }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [activeSessions, setActiveSessions] = useState<number>(0);
  const [detailedActiveSessions, setDetailedActiveSessions] = useState<ActiveSession[]>([]);

  const fetchStats = () => {
    // Collect stats from the db for users of the same serviceId
    const allUsers = db.getUsers().filter(u => u.serviceId === user.serviceId && u.role === 'USER');
    setUsers(allUsers);
    
    // Active sessions for the unit
    const unitActiveSessions = db.getActiveSessions().filter(s => allUsers.some(u => u.nid === s.userId));
    setDetailedActiveSessions(unitActiveSessions);
    setActiveSessions(unitActiveSessions.length);
  };

  useEffect(() => {
    fetchStats();
    window.addEventListener('db_updated', fetchStats);
    
    // Poll for active sessions
    const intervalId = setInterval(() => {
        fetchStats();
    }, 5000);
    
    return () => {
        window.removeEventListener('db_updated', fetchStats);
        clearInterval(intervalId);
    };
  }, [user.serviceId]);

  // Calculations
  const averageVMA = users.length > 0
    ? (users.reduce((acc, u) => acc + (u.tests.calculatedVMA || calculateVMA(u.tests)), 0) / users.length).toFixed(1)
    : '-';

  const averageAge = "-"; // Assuming age can be derived if birthdate exists, which isn't currently tracked, so omit. 

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s]">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-military-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-military-900">Tableau de Bord Autorité - {user.serviceId || 'Base'}</h2>
          <p className="text-military-500 text-sm">Vue globale des statistiques anonymisées du personnel.</p>
        </div>
        <div className="flex gap-4">
           <div className="text-right">
             <div className="text-[10px] font-black uppercase text-gray-400">Total Personnel Actif</div>
             <div className="text-2xl font-black text-military-900">{users.length}</div>
           </div>
           <div className="text-right pl-4 border-l border-gray-100">
             <div className="text-[10px] font-black uppercase text-gray-400">En cours de séance</div>
             <div className="text-2xl font-black text-action-600 animate-pulse flex items-center gap-1">
                <span className="material-icons text-sm">fiber_manual_record</span>
                {activeSessions}
             </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
           <h3 className="font-bold text-lg mb-2 text-military-800">Santé Globale de l'Unité</h3>
           <div className="flex items-end gap-2">
             <span className="text-4xl font-black text-military-900">{averageVMA}</span>
             <span className="text-sm font-bold text-gray-500 mb-1">km/h VMA Moyenne</span>
           </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
           <h3 className="font-bold text-lg mb-4 text-military-800">Répartition H/F</h3>
           <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden flex">
              <div 
                  style={{ width: `${(users.filter(u => u.gender === 'H').length / (users.length || 1)) * 100}%` }} 
                  className="bg-blue-500 h-full"
              ></div>
              <div 
                  style={{ width: `${(users.filter(u => u.gender === 'F').length / (users.length || 1)) * 100}%` }} 
                  className="bg-pink-500 h-full"
              ></div>
           </div>
           <div className="flex justify-between mt-2 text-xs font-bold text-gray-500">
              <span className="text-blue-600">Hommes ({users.filter(u => u.gender === 'H').length})</span>
              <span className="text-pink-600">Femmes ({users.filter(u => u.gender === 'F').length})</span>
           </div>
        </div>
      </div>
      
      {/* Registre Sport Unité en temps réel */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h3 className="font-black text-xl text-military-900 uppercase">Registre Sport Unité (Live)</h3>
            {detailedActiveSessions.length > 0 && (
                <span className="bg-green-100 text-green-700 font-bold px-3 py-1 rounded-full text-xs uppercase animate-pulse">Actif</span>
            )}
        </div>
        <div className="p-0">
            {detailedActiveSessions.length === 0 ? (
                <div className="p-6 text-center text-gray-500 font-medium">
                    Aucun personnel de l'unité actuellement en séance.
                </div>
            ) : (
                <ul className="divide-y divide-gray-100">
                    {detailedActiveSessions.map(session => (
                        <li key={session.id} className="p-4 hover:bg-gray-50 transition-colors flex justify-between items-center">
                            <div>
                                <div className="font-bold text-military-900">{session.userName} <span className="text-gray-400 font-normal text-sm ml-2">({session.userId})</span></div>
                                <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                                    <span className="material-icons text-[14px]">place</span>
                                    {session.infrastructureName}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Durée</div>
                                <div className="font-medium text-military-800">{Math.floor((Date.now() - session.startTime) / 60000)} min</div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
      </div>
    </div>
  );
};

export default DashboardAuthority;
