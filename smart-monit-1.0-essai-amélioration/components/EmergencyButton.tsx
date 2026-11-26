import React, { useState } from 'react';
import { UserProfile, AppNotification, UserRole } from '../types';
import { db } from '../services/mockDatabase';
import { useToast } from './ToastProvider';

interface EmergencyButtonProps {
  user: UserProfile | null;
}

const EmergencyButton: React.FC<EmergencyButtonProps> = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [alertSent, setAlertSent] = useState(false);
  const { showToast } = useToast();

  if (!user) return null;

  const service = db.getServiceById(user.serviceId);

  const sendAlert = (action: 'called_112' | 'alerted_monitor') => {
    const activeSessions = db.getActiveSessions();
    const userSession = activeSessions.find((s) => s.userId === user.nid);
    const location = userSession
      ? userSession.infrastructureName
      : 'Lieu non précisé (hors séance déclarée)';

    const newNotification: AppNotification = {
      id: 'urg-' + Date.now(),
      title: 'URGENCE MÉDICALE',
      message: `${user.name} (NID ${user.nid}) a déclenché une alerte d'urgence. Lieu : ${location}.`,
      type: 'alert',
      category: 'EMERGENCY',
      timestamp: Date.now(),
      read: false,
      serviceId: user.serviceId,
      targetRoles: [UserRole.MONITOR, UserRole.ADMINISTRATOR],
      emergencyData: {
        nid: user.nid,
        userName: user.name,
        location,
        serviceId: user.serviceId,
        unit: user.unit,
        action
      }
    };

    db.addNotification(newNotification);
  };

  const handleAlertMonitor = () => {
    sendAlert('alerted_monitor');
    setAlertSent(true);
    showToast('Alerte d\'urgence transmise au bureau EPMS et à l\'autorité.', 'warning');
    setTimeout(() => {
      setIsOpen(false);
      setAlertSent(false);
    }, 2500);
  };

  const handleCall112 = () => {
    sendAlert('called_112');
    showToast('Alerte enregistrée — Appel des secours (112).', 'error');
    window.location.href = 'tel:112';
    setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 md:bottom-8 md:right-8 w-14 h-14 bg-red-600 text-white rounded-full shadow-2xl hover:bg-red-700 hover:scale-105 active:scale-95 transition-all flex items-center justify-center z-50 border-2 border-white no-print"
        aria-label="Urgence médicale"
        title="Bouton d'urgence"
      >
        <span className="material-icons text-3xl">medical_services</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-[fadeIn_0.2s]">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-[slideUp_0.2s]">
            <div className="bg-red-600 p-6 text-white text-center">
              <span className="material-icons text-5xl mb-2 animate-pulse">warning</span>
              <h2 className="text-2xl font-black uppercase tracking-tight">Urgence Médicale</h2>
              {service?.emergencyPhone && (
                <p className="text-xs text-red-100 font-semibold mt-1">{service.emergencyPhone}</p>
              )}
            </div>

            <div className="p-6 space-y-3">
              {alertSent ? (
                <div className="text-center text-emerald-700 font-bold py-8">
                  <span className="material-icons text-5xl mb-3 block">check_circle</span>
                  Alerte transmise au service EPMS avec votre localisation.
                </div>
              ) : (
                <>
                  <p className="text-center text-gray-600 text-sm font-medium mb-4">
                    Sélectionnez l'action adaptée. Votre position déclarée en séance est transmise automatiquement.
                  </p>

                  <button
                    onClick={handleCall112}
                    className="w-full py-4 bg-red-600 text-white hover:bg-red-700 rounded-xl font-black uppercase tracking-wider text-xs transition-colors flex items-center justify-center gap-2 shadow-lg"
                  >
                    <span className="material-icons">phone</span>
                    Appeler les secours (112)
                  </button>

                  <button
                    onClick={handleAlertMonitor}
                    className="w-full py-4 bg-military-900 text-white hover:bg-military-800 rounded-xl font-black uppercase tracking-wider text-xs transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="material-icons">notifications_active</span>
                    Alerter le bureau EPMS
                  </button>

                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-full py-2.5 mt-2 text-gray-500 hover:text-gray-800 font-bold uppercase tracking-wider text-xs transition-colors"
                  >
                    Annuler
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EmergencyButton;
