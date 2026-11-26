/**
 * Contrôleur PWA universel SMART MONIT 1.0 :
 * - Capture `beforeinstallprompt` dès le chargement (avant même le montage React) pour installation en 1 clic sur Android / Edge / Chrome / Desktop.
 * - Détecte iOS / iPadOS Safari pour proposer le guide visuel d'ajout à l'écran d'accueil.
 * - Détecte le mode déjà installé (`standalone`) et gère les mises à jour du Service Worker.
 */

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface PWAState {
  isStandalone: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  canNativeInstall: boolean;
  updateAvailable: boolean;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let waitingWorker: ServiceWorker | null = null;
const listeners = new Set<() => void>();

const notify = () => {
  listeners.forEach((fn) => fn());
};

export const detectStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.startsWith('android-app://')
  );
};

export const detectIOS = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
};

export const detectAndroid = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent || '');
};

export const getPWAState = (): PWAState => ({
  isStandalone: detectStandalone(),
  isIOS: detectIOS(),
  isAndroid: detectAndroid(),
  canNativeInstall: Boolean(deferredPrompt),
  updateAvailable: Boolean(waitingWorker)
});

export const subscribePWA = (cb: () => void): (() => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export const triggerNativeInstall = async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
  if (!deferredPrompt) return 'unavailable';
  try {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    notify();
    return outcome;
  } catch {
    return 'unavailable';
  }
};

export const applyPWAUpdate = () => {
  if (waitingWorker) {
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  }
};

let initialized = false;

export const initPWA = () => {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  // Capture immédiate du prompt natif d'installation (Android Chrome, Samsung Internet, Edge, Desktop)
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notify();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notify();
  });

  // Enregistrement du Service Worker pour rendre l'app installable en 1 clic et utilisable hors-ligne
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          if (reg.waiting) {
            waitingWorker = reg.waiting;
            notify();
          }
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                waitingWorker = newWorker;
                notify();
              }
            });
          });
        })
        .catch((err) => {
          console.warn('[SmartMonit PWA] Service Worker non enregistré:', err);
        });
    });
  }
};
