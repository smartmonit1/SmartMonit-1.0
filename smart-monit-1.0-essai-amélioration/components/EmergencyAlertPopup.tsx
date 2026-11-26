import React, { useEffect, useState } from 'react';
import { AppNotification } from '../types';
import { db } from '../services/mockDatabase';

interface EmergencyAlertPopupProps {
  serviceId?: string;
}

const EmergencyAlertPopup: React.FC<EmergencyAlertPopupProps> = ({ serviceId }) => {
  const [alerts, setAlerts] = useState<AppNotification[]>([]);

  useEffect(() => {
    const checkAlerts = () => {
      const allNotifs = db.getNotifications();
      const activeAlerts = allNotifs.filter(
        (n) =>
          n.type === 'alert' &&
          !n.read &&
          n.emergencyData &&
          (!serviceId || !n.serviceId || n.serviceId === serviceId)
      );
      setAlerts(activeAlerts);
    };

    checkAlerts();
    const interval = setInterval(checkAlerts, 3000);

    const handleStorage = (e: StorageEvent) => {
      if (e.key && e.key.includes('notifications')) {
        checkAlerts();
      }
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('db_updated', checkAlerts);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('db_updated', checkAlerts);
    };
  }, [serviceId]);

  const handleAcknowledge = (id: string) => {
    db.markNotificationRead(id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  if (alerts.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-red-950/90 backdrop-blur-md z-[9999] flex items-center justify-center p-4 no-print">
      <div className="space-y-6 w-full max-w-xl">
        {alerts.slice(0, 2).map((alert) => (
          <div key={alert.id} className="bg-white rounded-3xl shadow-2xl overflow-hidden border-4 border-red-500">
            <div className="bg-red-600 p-6 text-white text-center flex flex-col items-center">
              <span className="material-icons text-5xl mb-2 animate-bounce">warning</span>
              <h2 className="text-3xl font-black uppercase tracking-tight">URGENCE SIGNALÉE</h2>
            </div>
            <div className="p-6 md:p-8 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <span className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Militaire</span>
                  <span className="text-lg font-black text-military-900">{alert.emergencyData?.userName}</span>
                  <span className="block text-xs font-mono font-bold text-military-600">NID: {alert.emergencyData?.nid}</span>
                  {alert.emergencyData?.unit && (
                    <span className="block text-xs text-gray-500 mt-0.5">{alert.emergencyData.unit}</span>
                  )}
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <span className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Localisation</span>
                  <span className="text-lg font-black text-military-900">{alert.emergencyData?.location}</span>
                </div>
              </div>

              <div
                className={`p-4 rounded-xl border-2 flex items-center gap-4 ${
                  alert.emergencyData?.action === 'called_112'
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : 'bg-orange-50 border-orange-200 text-orange-800'
                }`}
              >
                <span className="material-icons text-3xl">
                  {alert.emergencyData?.action === 'called_112' ? 'phone_in_talk' : 'notifications_active'}
                </span>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider opacity-80">Action déclenchée</span>
                  <span className="text-base font-black">
                    {alert.emergencyData?.action === 'called_112'
                      ? 'A APPELÉ LES SECOURS (112)'
                      : 'A PRÉVENU LE BUREAU EPMS'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleAcknowledge(alert.id)}
                className="w-full py-4 bg-military-900 hover:bg-military-800 text-white rounded-xl font-black uppercase tracking-widest text-sm transition-colors shadow-lg"
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
