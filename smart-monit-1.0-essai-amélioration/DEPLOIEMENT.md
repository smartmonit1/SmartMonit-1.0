# Déploiement Autonome SMART MONIT 1.0 (Tests Multi-Appareils & PWA 1 Clic)

L'application est **100 % détachée de Google AI Studio** :
- **0 € de frais IA** même avec des centaines de testeurs simultanés (Moteur Expert Local EPMS autonome & hors-ligne).
- **Installable sur tous les smartphones en 1 clic** (Android Chrome/Samsung/Edge via prompt natif, iPhone/iPad Safari via guide intégré) dès qu'elle est servie en **HTTPS**.
- **Prête pour Mistral AI (AMIAD)** à la livraison finale post-tests (`AI_PROVIDER=mistral`).

---

## 1. Déploiement HTTPS gratuit en 2 minutes (pour des centaines de testeurs)

Les smartphones exigent une adresse **HTTPS** pour activer le bouton d'installation PWA en 1 clic. Trois options gratuites sont pré-configurées dans ce dossier :

### Option A — Vercel (le plus rapide depuis GitHub)
1. Poussez ce dossier sur votre dépôt GitHub.
2. Sur [vercel.com](https://vercel.com) → **Add New Project** → sélectionnez le dépôt → définissez *Root Directory* sur `smart-monit-1.0-essai-amélioration`.
3. Cliquez sur **Deploy** : `vercel.json` est déjà configuré. Vous obtenez immédiatement une URL `https://votre-app.vercel.app` partageable (lien ou QR code) à tous les testeurs.

### Option B — Netlify ou Cloudflare Pages
1. Glissez-déposez le dossier `dist/` (généré par `npm.cmd run build`) ou connectez le dépôt GitHub.
2. Les fichiers `public/_redirects` et `public/_headers` sont déjà prêts.

### Option C — Firebase Hosting (indépendant de Google AI Studio)
```powershell
npm.cmd run build
npx firebase-tools login
npx firebase-tools use --add   # sélectionnez votre propre projet Firebase (plan Spark gratuit)
npx firebase-tools deploy
```

---

## 2. Activer la synchronisation temps réel entre tous les smartphones (optionnel)

Par défaut, chaque testeur dispose d'une base locale complète et autonome (zéro serveur requis).
Si vous souhaitez que **tous les testeurs partagent la même base synchronisée en temps réel** (alertes urgence, plannings collectifs, registres sport) :

1. Créez un projet gratuit (**Plan Spark — 0 €**) sur [console.firebase.google.com](https://console.firebase.google.com) (sans aucun lien avec Google AI Studio).
2. Activez **Cloud Firestore** (région Europe `eur3` ou `europe-west9` Paris pour la conformité RGPD).
3. Déployez les règles de sécurité incluses dans `firestore.rules`.
4. Renseignez les 6 variables `VITE_FIREBASE_*` (voir `.env.example`) dans votre `.env.local` ou dans les variables d'environnement de Vercel / Netlify.

---

## 3. Comptes de démonstration intégrés (mot de passe : `password`)

| Profil | NID | Nom |
| :--- | :--- | :--- |
| **Militaire Pratiquant** | `0987654321` | SGT MARTIN Lucas (EAR 927) |
| **Moniteur-Chef EPMS** | `1234567890` | ADJ BARBOTIN Nicolas (EAR 927) |
| **Autorité / Commandement** | `1122334455` | COL RIGOLLET (EAR 927) |

Codes d'inscription pour créer de nouveaux comptes test : Moniteur = `EPMS2026`, Autorité = `CMDT2026`.
