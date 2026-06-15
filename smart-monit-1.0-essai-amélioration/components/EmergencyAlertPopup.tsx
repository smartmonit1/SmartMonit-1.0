import React, { useEffect, useState } from 'react';
import { AppNotification } from '../types';
import { db } from '../services/mockDatabase';

const EmergencyAlertPopup: React.FC = () => {
  const [alerts, setAlerts] = useState<AppNotification[]>([]);

  useEffect(() => {
    const checkAlerts = () => {
      const allNotifs = db.getNotifications();
      const activeAlerts = allNotifs.filter(n => n.type === 'alert' && !n.read && n.emergencyData);
      setAlerts(activeAlerts);
    };

    // Check immediately and then poll every 2 seconds
    checkAlerts();
    const interval = setInterval(checkAlerts, 2000);
    
    // Listen to storage events for cross-tab communication
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'notifications') {
        checkAlerts();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const handleAcknowledge = (id: string) => {
    const allNotifs = db.getNotifications();
    const updated = allNotifs.map(n => n.id === id ? { ...n, read: true } : n);
    db.setNotifications(updated);
    setAlerts(alerts.filter(a => a.id !== id));
  };

  if (alerts.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-red-900/90 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
      <div className="space-y-6 w-full max-w-2xl">
        {alerts.map(alert => (
          <div key={alert.id} className="bg-white rounded-3xl shadow-2xl overflow-hidden animate-[pulse_1s_infinite]">
            <div className="bg-red-600 p-6 text-white text-center flex flex-col items-center">
              <span className="material-icons text-6xl mb-2">warning</span>
              <h2 className="text-4xl font-black uppercase tracking-tight">URGENCE SIGNALÉE</h2>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Utilisateur</span>
                  <span className="text-xl font-black text-military-900">{alert.emergencyData?.userName}</span>
                  <span className="block text-sm font-bold text-military-600">NID: {alert.emergencyData?.nid}</span>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Lieu</span>
                  <span className="text-xl font-black text-military-900">{alert.emergencyData?.location}</span>
                </div>
              </div>
              
              <div className={`p-6 rounded-xl border-2 flex items-center gap-4 ${alert.emergencyData?.action === 'called_112' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-orange-50 border-orange-200 text-orange-800'}`}>
                <span className="material-icons text-4xl">
                  {alert.emergencyData?.action === 'called_112' ? 'phone_in_talk' : 'notifications_active'}
                </span>
                <div>
                  <span className="block text-sm font-bold uppercase tracking-wider opacity-80">Action entreprise par l'utilisateur</span>
                  <span className="text-xl font-black">
                    {alert.emergencyData?.action === 'called_112' 
                      ? 'A APPELÉ LES SECOURS (112)' 
                      : 'A JUSTE PRÉVENU LE MONITEUR'}
                  </span>
                </div>
              </div>

              <button 
                onClick={() => handleAcknowledge(alert.id)}
                className="w-full py-6 bg-military-900 hover:bg-military-800 text-white rounded-xl font-black uppercase tracking-widest text-xl transition-colors"
              >
                Acquitter l'alerte
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EmergencyAlertPopup;
