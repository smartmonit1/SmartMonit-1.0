# SmartMonit — sport, coaching et installations

SmartMonit réunit trois espaces — utilisateur, moniteur et autorité — autour de l’entraînement, des réservations, du coaching et de la gestion des installations et du matériel.

## Démarrer en local

Prérequis : Node.js.

```powershell
npm install
npm run dev
```

Contrôles avant livraison :

```powershell
npm run lint
npm run build
```

Les styles et polices sont compilés dans l’application. L’installation PWA exige un hébergement HTTPS (sauf `localhost`).

## Périmètre actuel

Cette version est destinée aux tests et démonstrations avec des données synthétiques uniquement. N’y saisissez pas d’identifiants réels, de données de santé, de dossiers individuels ou d’informations opérationnelles.

Dans l’espace moniteur, l’onglet **Assistant coach** permet de choisir un membre, une séance, une installation et le matériel disponible. L’assistant local propose des adaptations à partir du bilan du jour et des substitutions documentées dans la bibliothèque d’exercices. Le moniteur doit vérifier et valider la proposition; l’outil ne pose pas de diagnostic et bloque le lancement si une douleur élevée est signalée ou si le matériel requis reste indisponible.

La branche `smartmonit-v2-test` contient cette version d’essai. Pour revenir à la version précédente, utilisez `git switch main`. Pour reprendre les essais, utilisez `git switch smartmonit-v2-test`.

La connexion de démonstration et les règles Firestore du prototype ne constituent pas une authentification ni une isolation de données adaptées à la production. Si les variables Firebase de `.env.local` sont configurées, les données peuvent être synchronisées avec le projet Firebase correspondant; ne connectez qu’un projet de test avec des données fictives.

Les appels Mistral ne reçoivent volontairement aucune clé depuis le navigateur. Avant d’activer un fournisseur d’IA externe, il faut passer par un service serveur authentifié et vérifier le consentement et la minimisation des données envoyées.

## Prérequis avant toute utilisation réelle

- Authentifier chaque personne avec Firebase Authentication ou le SSO approuvé par l’organisation.
- Vérifier les rôles et le périmètre unité/base côté serveur, puis remplacer les règles Firestore de démonstration par des règles strictes testées.
- Déplacer les secrets d’IA et les écritures privilégiées vers des fonctions serveur; ne jamais injecter de secret dans un bundle Vite.
- Appliquer la politique de conservation et de suppression dans Firestore comme dans les données locales et gérer les conflits hors ligne.
- Faire valider les parcours, les contrôles d’accès, la protection des données et les registres par les responsables compétents avant ouverture aux données réelles.

Voir [DEPLOIEMENT.md](./DEPLOIEMENT.md) pour le guide de mise en ligne et la checklist de préparation.
