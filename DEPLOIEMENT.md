# Démonstration et préparation au déploiement

## Démonstration

1. Installer les dépendances avec `npm install`.
2. Lancer `npm run dev` et utiliser les accès de démonstration affichés dans l’écran de connexion.
3. Pour tester la synchronisation, créer un projet Firebase distinct, avec des données fictives uniquement, et renseigner les variables `VITE_FIREBASE_*` de `.env.local`.
4. Construire avec `npm run build`, puis déployer le contenu de `dist/` sur un hébergement HTTPS pour tester l’installation PWA.

Cette configuration est une démonstration. Les règles Firestore actuelles autorisent un accès non authentifié; elles ne doivent pas être déployées avec des données réelles. Toute personne pouvant ouvrir le projet de démonstration peut potentiellement accéder aux données qui y sont stockées.

## Passage à l’utilisation réelle

Avant d’activer un compte utilisateur ou d’importer des données opérationnelles :

1. Intégrer Firebase Authentication (ou le SSO officiel retenu) et faire dépendre la connexion de la validation serveur.
2. Émettre et contrôler les rôles et périmètres organisationnels côté serveur. Les choix d’interface ne sont pas une autorisation.
3. Remplacer et tester `firestore.rules` : authentification obligatoire, accès par rôle et périmètre, validation des champs et opérations, refus par défaut.
4. Déplacer les clés Mistral et les opérations privilégiées dans des fonctions serveur authentifiées. Un secret placé dans `.env.local` de Vite serait inclus dans le bundle public.
5. Définir une stratégie de synchronisation hors ligne avec détection des conflits, état d’envoi et reprise explicite; ne pas écraser silencieusement les modifications locales.
6. Faire respecter la conservation et l’effacement dans le cloud comme sur l’appareil, et valider les consentements avec les responsables de la protection des données.
7. Tester séparation entre unités, comptes désactivés, récupération de compte, perte de réseau, partage d’appareil, sauvegardes et journalisation.

Le produit n’est pas encore validé pour des données réelles, un registre réglementaire certifié ou un contrôle d’accès physique.

## Variables de démonstration

Copier `.env.example` vers `.env.local` pour connecter un projet Firebase de test. Ne jamais committer `.env.local`, un mot de passe, un jeton ou une clé de fournisseur.

`MISTRAL_API_KEY` doit être conservée dans un gestionnaire de secrets serveur; la configuration Vite ne l’expose pas au navigateur.
