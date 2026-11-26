import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, Firestore } from 'firebase/firestore';

/**
 * Configuration Firebase 100 % autonome (indépendante de Google AI Studio).
 * Renseignez vos variables VITE_FIREBASE_* dans .env.local (ou dans les variables d'environnement
 * de votre hébergeur Vercel / Netlify / Firebase Hosting) pour activer la synchronisation temps réel
 * multi-appareils sur votre propre projet Firebase Spark (gratuit).
 *
 * En l'absence de configuration cloud, l'application fonctionne intégralement en mode local hors-ligne.
 */
const env = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: env.VITE_FIREBASE_APP_ID || ''
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    !firebaseConfig.apiKey.includes('votre_') &&
    !firebaseConfig.projectId.includes('votre_')
);

let app: FirebaseApp | null = null;
let firestoreInstance: Firestore | null = null;
let authInstance: Auth | null = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    const databaseId = env.VITE_FIREBASE_DATABASE_ID || '(default)';
    firestoreInstance =
      databaseId === '(default)' ? getFirestore(app) : getFirestore(app, databaseId);

    // Persistance hors-ligne IndexedDB pour l'usage en salle / zones blanches
    enableIndexedDbPersistence(firestoreInstance).catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('[SmartMonit] Persistance IndexedDB active dans un autre onglet.');
      } else if (err.code === 'unimplemented') {
        console.warn('[SmartMonit] Persistance IndexedDB non supportée par ce navigateur.');
      }
    });

    authInstance = getAuth(app);
  } catch (err) {
    console.warn('[SmartMonit] Initialisation Firebase ignorée, bascule en mode local autonome:', err);
    firestoreInstance = null;
    authInstance = null;
  }
}

export const dbFirestore: Firestore | null = firestoreInstance;
export const auth: Auth | null = authInstance;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[SmartMonit Sync] Fallback local actif (${operationType} ${path || ''}):`, message);
}
