import React, { useEffect, useState } from 'react';
import {
  getPWAState,
  subscribePWA,
  triggerNativeInstall,
  applyPWAUpdate,
  PWAState
} from '../utils/pwa';

interface InstallPWAButtonProps {
  variant?: 'card' | 'header' | 'banner';
}

const DISMISS_KEY = 'sm_pwa_banner_dismissed_at';

const InstallPWAButton: React.FC<InstallPWAButtonProps> = ({ variant = 'card' }) => {
  const [pwa, setPwa] = useState<PWAState>(() => getPWAState());
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    const ts = Number(localStorage.getItem(DISMISS_KEY) || 0);
    // Ré-affiche après 3 jours si non installée
    return ts > 0 && Date.now() - ts < 3 * 24 * 60 * 60 * 1000;
  });

  useEffect(() => {
    return subscribePWA(() => setPwa(getPWAState()));
  }, []);

  // Déjà installée sur le smartphone -> rien à afficher (sauf mise à jour dispo sur la bannière)
  if (pwa.isStandalone) {
    if (variant === 'banner' && pwa.updateAvailable) {
      return (
        <div className="pwa-floating-banner pwa-update-banner fixed z-50 bg-military-900 text-white p-3.5 rounded-2xl shadow-2xl border border-action-500/40 flex items-center justify-between gap-3 animate-[slideUp_0.25s]">
          <div className="flex items-center gap-2.5">
            <span className="material-icons text-action-400">system_update</span>
            <div className="text-xs">
              <div className="font-black">Nouvelle version prête</div>
              <div className="text-[11px] text-military-300">Actualisez pour profiter des améliorations.</div>
            </div>
          </div>
          <button
            onClick={applyPWAUpdate}
            className="bg-action-500 text-military-950 font-black text-[11px] uppercase px-3 py-2 rounded-xl hover:bg-action-400 shrink-0"
          >
            Mettre à jour
          </button>
        </div>
      );
    }
    return null;
  }

  const handleInstallClick = async () => {
    if (pwa.canNativeInstall) {
      setInstalling(true);
      const outcome = await triggerNativeInstall();
      setInstalling(false);
      if (outcome === 'unavailable') {
        setShowGuideModal(true);
      }
      return;
    }
    // iOS Safari ou navigateur ne déclenchant pas encore beforeinstallprompt -> guide visuel instantané
    setShowGuideModal(true);
  };

  const dismissBanner = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setBannerDismissed(true);
  };

  const renderModal = () =>
    showGuideModal && (
      <div
        className="fixed inset-0 bg-black/75 z-[120] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-[fadeIn_0.2s]"
        onClick={() => setShowGuideModal(false)}
      >
        <div
          className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-[slideUp_0.25s]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-3">
              <img
                src="/icons/icon-192.png"
                alt="SmartMonit"
                className="w-11 h-11 rounded-2xl shadow-sm border border-military-200"
              />
              <div>
                <h3 className="font-black text-sm text-military-900 uppercase">Installer SMART MONIT</h3>
                <p className="text-[11px] text-gray-500">
                  {pwa.isIOS ? 'iPhone / iPad (Safari)' : 'Smartphone & Ordinateur'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowGuideModal(false)}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600"
              aria-label="Fermer"
            >
              <span className="material-icons text-base">close</span>
            </button>
          </div>

          {pwa.isIOS ? (
            <ol className="space-y-3 text-xs text-gray-700">
              <li className="flex items-start gap-3 bg-military-50 p-3 rounded-2xl">
                <span className="w-6 h-6 rounded-full bg-military-900 text-action-400 font-black flex items-center justify-center shrink-0">
                  1
                </span>
                <div>
                  Appuyez sur le bouton <strong>Partager</strong>{' '}
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
                    <span className="material-icons text-xs mr-0.5">ios_share</span> Partager
                  </span>{' '}
                  en bas de votre navigateur <strong>Safari</strong>.
                </div>
              </li>
              <li className="flex items-start gap-3 bg-military-50 p-3 rounded-2xl">
                <span className="w-6 h-6 rounded-full bg-military-900 text-action-400 font-black flex items-center justify-center shrink-0">
                  2
                </span>
                <div>
                  Faites défiler et touchez <strong>« Sur l'écran d'accueil »</strong>{' '}
                  <span className="material-icons text-xs align-middle text-military-700">add_box</span>.
                </div>
              </li>
              <li className="flex items-start gap-3 bg-emerald-50 p-3 rounded-2xl border border-emerald-200">
                <span className="w-6 h-6 rounded-full bg-emerald-700 text-white font-black flex items-center justify-center shrink-0">
                  3
                </span>
                <div>
                  Confirmez avec <strong>« Ajouter »</strong> : l'icône <strong>SmartMonit</strong> apparaît sur votre écran d'accueil en plein écran, utilisable même hors-ligne.
                </div>
              </li>
            </ol>
          ) : (
            <ol className="space-y-3 text-xs text-gray-700">
              <li className="flex items-start gap-3 bg-military-50 p-3 rounded-2xl">
                <span className="w-6 h-6 rounded-full bg-military-900 text-action-400 font-black flex items-center justify-center shrink-0">
                  1
                </span>
                <div>
                  Ouvrez le menu <strong>⋮</strong> en haut à droite de votre navigateur (Chrome, Edge, Samsung Internet).
                </div>
              </li>
              <li className="flex items-start gap-3 bg-military-50 p-3 rounded-2xl">
                <span className="w-6 h-6 rounded-full bg-military-900 text-action-400 font-black flex items-center justify-center shrink-0">
                  2
                </span>
                <div>
                  Appuyez sur <strong>« Installer l'application »</strong> ou <strong>« Ajouter à l'écran d'accueil »</strong>.
                </div>
              </li>
              <li className="flex items-start gap-3 bg-emerald-50 p-3 rounded-2xl border border-emerald-200">
                <span className="w-6 h-6 rounded-full bg-emerald-700 text-white font-black flex items-center justify-center shrink-0">
                  3
                </span>
                <div>
                  SMART MONIT s'installe comme une application native, en plein écran et accessible hors-ligne en salle de sport.
                </div>
              </li>
            </ol>
          )}

          <button
            onClick={() => setShowGuideModal(false)}
            className="w-full py-3 rounded-xl bg-military-900 text-white font-black uppercase text-xs hover:bg-military-800 transition-colors"
          >
            J'ai compris
          </button>
        </div>
      </div>
    );

  if (variant === 'header') {
    return (
      <>
        <button
          onClick={handleInstallClick}
          disabled={installing}
          className="bg-action-500 hover:bg-action-400 text-military-950 px-2.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all shadow-sm"
          title="Installer SMART MONIT sur votre smartphone en 1 clic"
        >
          <span className="material-icons text-sm">install_mobile</span>
          <span className="hidden md:inline">{installing ? 'Installation...' : 'Installer'}</span>
        </button>
        {renderModal()}
      </>
    );
  }

  if (variant === 'banner') {
    if (bannerDismissed) return null;
    // Sur desktop sans prompt natif, inutile d'encombrer le bas d'écran (le bouton header/login suffit)
    if (!pwa.canNativeInstall && !pwa.isIOS && !pwa.isAndroid) return null;

    return (
      <>
        <div className="pwa-floating-banner pwa-install-banner fixed z-40 bg-military-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-2xl border border-action-500/40 flex items-center justify-between gap-3 animate-[slideUp_0.3s] no-print">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/icons/icon-192.png"
              alt="SmartMonit"
              className="w-10 h-10 rounded-xl border border-action-500/40 shrink-0"
            />
            <div className="min-w-0">
              <div className="font-black text-xs text-white truncate">Installer SMART MONIT</div>
              <div className="text-[10px] text-military-300 truncate">
                Accès plein écran & mode hors-ligne
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleInstallClick}
              disabled={installing}
              className="bg-action-500 hover:bg-action-400 text-military-950 font-black text-[10px] uppercase px-3 py-2 rounded-xl transition-colors"
            >
              {installing ? '...' : 'Installer'}
            </button>
            <button
              onClick={dismissBanner}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-military-300"
              aria-label="Masquer"
            >
              <span className="material-icons text-sm">close</span>
            </button>
          </div>
        </div>
        {renderModal()}
      </>
    );
  }

  // Variant 'card' (écran de connexion Auth.tsx)
  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        disabled={installing}
        className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-action-500 to-action-400 hover:from-action-400 hover:to-action-300 text-military-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98]"
      >
        <span className="material-icons text-base">install_mobile</span>
        <span>
          {installing
            ? 'Installation en cours...'
            : pwa.canNativeInstall
            ? 'Installer l\'application en 1 clic'
            : 'Installer sur mon smartphone'}
        </span>
      </button>
      {renderModal()}
    </>
  );
};

export default InstallPWAButton;
