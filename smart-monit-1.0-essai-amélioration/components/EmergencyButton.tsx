import React, { useState } from 'react';
import { UserProfile, AppNotification } from '../types';
import { db } from '../services/mockDatabase';

interface EmergencyButtonProps {
  user: UserProfile | null;
}

const EmergencyButton: React.FC<EmergencyButtonProps> = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [alertSent, setAlertSent] = useState(false);

  // If user is not logged in, we might still want to show it, but without the "Alert Monitor" option,
  // or just hide it. Let's hide it if no user.
  if (!user) return null;

  const sendAlert = (action: 'called_112' | 'alerted_monitor') => {
    const activeSessions = db.getActiveSessions();
    const userSession = activeSessions.find(s => s.userId === user.nid);
    const location = userSession ? userSession.infrastructureName : 'Lieu non précisé (hors séance active)';

    const newNotification: AppNotification = {
      id: 'urg-' + Date.now(),
      title: 'URGENCE MÉDICALE',
      message: `L'utilisateur ${user.name} (NID: ${user.nid}) a signalé une urgence. Lieu: ${location}.`,
      type: 'alert',
      timestamp: Date.now(),
      read: false,
      emergencyData: {
        nid: user.nid,
        userName: user.name,
        location,
        action
      }
    };

    db.addNotification(newNotification);
  };

  const handleAlertMonitor = () => {
    sendAlert('alerted_monitor');
    setAlertSent(true);
    
    setTimeout(() => {
      setIsOpen(false);
      setAlertSent(false);
    }, 3000);
  };

  const handleCall112 = () => {
    sendAlert('called_112');
    window.location.href = 'tel:112';
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating Emergency Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 md:bottom-8 md:right-8 w-14 h-14 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 hover:scale-105 transition-all flex items-center justify-center z-50 border-2 border-white"
        aria-label="Urgence"
      >
        <span className="material-icons text-3xl">medical_services</span>
      </button>

      {/* Emergency Popup */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-[fadeIn_0.2s]">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-[slideUp_0.2s]">
            
            {/* Header */}
            <div className="bg-red-600 p-6 text-white text-center">
              <span className="material-icons text-5xl mb-2 animate-pulse">warning</span>
              <h2 className="text-2xl font-black uppercase tracking-tight">Urgence Médicale</h2>
            </div>
            
            {/* Content */}
            <div className="p-6 space-y-4">
              {alertSent ? (
                <div className="text-center text-green-600 font-bold py-8">
                  <span className="material-icons text-5xl mb-3 block">check_circle</span>
                  Alerte envoyée au moniteur avec succès.
                </div>
              ) : (
                <>
                  <p className="text-center text-gray-600 font-medium mb-6">
                    Sélectionnez l'action appropriée à la situation.
                  </p>
                  
                  {/* Call 112 */}
                  <button
                    onClick={handleCall112}
                    className="w-full py-4 bg-red-50 text-red-700 hover:bg-red-100 rounded-xl font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-3 border-2 border-red-200"
                  >
                    <span className="material-icons">phone</span>
                    Appeler les secours (112)
                  </button>
                  
                  {/* Alert Monitor */}
                  <button
                    onClick={handleAlertMonitor}
                    className="w-full py-4 bg-military-900 text-white hover:bg-military-800 rounded-xl font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-3"
                  >
                    <span className="material-icons">notifications_active</span>
                    Alerter le moniteur
                  </button>
                  
                  {/* Cancel */}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-full py-3 mt-4 text-gray-500 hover:text-gray-700 font-bold uppercase tracking-wider text-sm transition-colors"
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
