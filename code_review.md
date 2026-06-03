# 📋 PixelTogether — Backlog dette technique & roadmap

> **Mise à jour** : 2026-06-03 · **Tâches actives** : 48
>
> Tâches résolues -> `journal.md`. Jamais de secrets en clair.
>
> Contexte : projet MVP perso (apprentissage). Stack : Angular 21 (front) + Node/Express + Socket.io + MongoDB (back). Audit post-migration React → Angular + intégration de la roadmap de lancement Facebook.

---

## 🔴 CRITIQUE — Bloquants avant toute mise en prod

> Ces points cassent des données, ouvrent des failles ou plantent le serveur. Priorité absolue (= Étape 1 « Stabilité » de ta roadmap).

- **BACK-10** — **Fuite mémoire à la déconnexion** : dans le handler `disconnect`, `delete activeUsers[socket.userId]` n'est appelé **que dans la branche hôte**. Un joueur non-hôte qui quitte laisse son entrée (timestamp de cooldown) dans `activeUsers` à vie. Sur la durée → l'objet enfle indéfiniment. Piste : purger `activeUsers[socket.userId]` systématiquement en fin de `disconnect`, hors de toute condition, et nettoyer aussi les références liées à la `roomId`.
- **BACK-11** — **Race condition boutique (`buyColor`)** : le handler fait `findById` → vérifie `colors.includes` / `gold >= 100` → `user.save()`. Deux requêtes d'achat à quelques ms d'écart lisent l'or **avant** que l'une ait écrit → double achat / double débit possible (lag réseau ou double-clic). Piste : opération atomique côté Mongo (update conditionnel `$inc`/`$addToSet` en une requête) ou verrou applicatif par `userId`.
- **BACK-12** — **Doubles connexions** : le middleware Socket.io n'empêche pas un même `userId` d'ouvrir plusieurs sockets (ex. double host sur la même grille → `grid.host` écrasé, états incohérents). Piste : à la connexion, si le `userId` est déjà présent, déconnecter l'ancienne socket (kick) ou refuser la nouvelle ; indexer les sockets par `userId`.
- **SEC-02** — **Validation des actions critiques par identité réelle** : `closeRoom`, `deleteCanvas`, `finishCanvas`, `exitGame` vérifient `socket.id === grid.host`. Or `socket.id` est **volatil** (change à chaque reconnexion) et n'identifie pas l'utilisateur. Un host qui se reconnecte n'est plus reconnu, et la garde est contournable. Piste : comparer l'identité stable (`socket.userId` vs `grid.ownerID`) et **toujours** vérifier `if (!grid) return;` avant d'accéder à `grid.host` (sinon crash sur room déjà fermée — voir `closeRoom`).
- **FRONT-04** — **Crash serveur silencieux non géré côté client** : `SocketService` expose bien un signal `isConnected`, mais aucune route/écran ne réagit à une perte de connexion en pleine partie. Si le back tombe, le joueur reste bloqué sur une grille « morte ». Piste : écouter `disconnect`/`connect_error`, sortir le joueur de la grille et afficher une page « Serveur hors ligne » (+ tentative de reconnexion).

---

## 🟠 ÉLEVÉ

- **FRONT-01** — **Race condition `authGuard` au rafraîchissement** : sur les routes protégées (`/lobby`, `/game/:id`), le guard lit `auth.isLoggedIn()` de façon synchrone alors que la session est restaurée *en asynchrone* via le socket (timeout 3 s). Un F5 ou un lien direct renvoie l'utilisateur connecté vers la landing. Piste : résoudre l'auth avant l'évaluation du guard (`APP_INITIALIZER` ou guard qui attend `isAuthLoading`).
- **FRONT-05** — **Notifications de chat muettes** : la souscription à `receiveMessage` vit **dans `ChatboxComponent`**, qui n'est instancié qu'à l'ouverture du chat. Tant que le joueur n'a jamais ouvert le chat, aucune notif/aucun badge. Piste : déplacer l'écoute des messages + le compteur de non-lus dans un service persistant (ou le `game-page`) toujours monté, le chatbox ne faisant que consommer l'état.
- **BACK-02** — **Entrées socket non validées / non gardées** : plusieurs handlers font confiance à `data` (`deleteGrid`, `likeGrid`, `updateGridOnGallery`, `buyColor`, `getChatMessages`, `getPlayersList`…). `data` `undefined`/malformé → crash ou abus. Piste : helper de validation commun appliqué à l'entrée de chaque handler.
- **BACK-04** — **Pas de rate-limit sur les events socket** : seul `pixelPlaced` a un cooldown (200 ms). `buyColor`, `newGrid`, `likeGrid`, `sendMessage` sont spammables. Piste : throttling par socket/event + garde-fous métier.
- **INFRA-01** — **Nettoyer la migration React→Angular** : l'arbre git contient encore les sources React supprimées (`frontend/src/*.jsx`, `components/`, `views/`, `context/`, `layouts/`) et l'ancien dossier `server/`. En plus, `frontend/dist/` et `frontend/.angular/cache/` sont trackés alors qu'ils devraient être ignorés. Piste : commiter les suppressions + vérifier le `.gitignore` (build/cache).
- **FRONT-02** — **`environment.ts` (prod) = `environment.development.ts`** : les deux pointent sur `http://localhost:3000`. Un build de prod ciblera localhost. Piste : configurer l'URL de prod (ou documenter clairement l'injection `window.__PT_API_URL__` de `runtime-config.ts`).

---

## 🟡 MOYEN

- **BACK-03** — **`index.js` = god file (645 lignes)** : toute la logique socket, la génération d'image et l'autosave sont inline. `backend/services/socketManager.js` existe mais est **vide** (refactor prévu jamais fait). Piste : extraire les handlers par domaine (auth, grid, chat, gallery) et remplir/supprimer `socketManager.js`.
- **ARCH-02** — **Éclater le « God service » d'état** : l'équivalent Angular de l'ancien `UIProvider` React est aujourd'hui `UiStateService` (état modales + UI globale) injecté un peu partout. Piste : séparer les responsabilités (ex. `ModalService`, `UserStateService`) pour limiter le couplage et les re-rendus inutiles, notamment autour de `Canvas`.
- **INFRA-02** — **Migration du stockage des images** : aujourd'hui les images sont en base64 (webp) **dans MongoDB** → base lourde, payloads socket énormes. Piste : stocker sur un bucket externe (S3 / Cloudinary) et ne garder que l'URL en base. (Couplé à **BACK-05**.)
- **BACK-05** — **Perf galerie / N+1** : `getGridsImagesFromDB` fait un `findById` par grille active, et les images base64 sont renvoyées en masse via socket. Piste : ne renvoyer que les vignettes utiles + cache, requête groupée (`$in`).
- **PERF-03** — **Conversion PNG → WebP** : `canvas.toDataURL('image/webp')` avec node-canvas ne produit **pas** réellement du WebP (format non géré nativement → fallback PNG silencieux). Piste : encoder explicitement en WebP via `sharp` après génération du canvas.
- **UX-07** — **Sécurité suppression (galerie perso)** : le clic sur la poubelle rouge supprime sans confirmation. Piste : ajouter une modale de confirmation (disclaimer) avant `deleteGrid`.
- **UX-02** — **Amélioration visuelle du chat** : ajouter un compteur de caractères `0/100` (clignote en rouge à la limite) et « clamper » proprement les mots trop longs qui cassent l'interface. (NB : le back limite à 200 caractères dans `sendMessage` — aligner front/back.)

---

## 🔵 INFO / Polish

- **UX-01** — **Refonte du message « Saved… »** : rendre l'indicateur d'autosave plus discret et moderne (toast léger / pastille).
- **UX-03** — **Skeleton loaders galerie** : affichage fantôme pendant le chargement des grilles pour éviter le tressautement.
- **UX-04** — **Tooltips sur la palette** : afficher le code `#hex` (ou nom personnalisé) au survol d'une couleur.
- **UX-05** — **Feedback visuel sur les likes** : petite animation (« pop » / confettis) au clic sur Like.
- **UX-06** — **Timestamps relatifs galerie** : afficher « il y a X heures/jours » au lieu d'une date brute sur les cartes.
- **BACK-06** — **Validation mot de passe incohérente** : la regex n'impose que « 6+ caractères » alors que le commentaire vise maj + min + chiffre. Aligner règle et message.
- **BACK-07** — **Code mort dans `register`** : un `token` généré puis affecté à `nouveauJoueur.token`, champ absent du schéma User → ignoré.
- **BACK-08** — **CORS résiduel** : `http://localhost:5173` (Vite/React) encore autorisé. À retirer maintenant qu'on est sur Angular.
- **BACK-09** — **Pas de fail-fast config** : aucune vérification au démarrage de `JWT_SECRET` / `MONGOURL`. Ajouter une garde au boot + fournir un `.env.example`.
- **ARCH-01** — **État serveur en mémoire** : `activeGrids` / `activeUsers` vivent dans le process → mono-instance. OK pour un MVP, à garder en tête pour le scaling (Redis).
- **SEC-01** — **JWT en `localStorage`** : exposition en cas de XSS. Acceptable pour un MVP ; envisager un cookie `httpOnly` à terme.
- **TEST-01** — **Convention « quartet » non respectée** : la plupart des composants n'ont ni `.css` ni `.spec.ts`. Aucune couverture de tests. À planifier progressivement.
- **DOC-01** — **Documentation manquante** : pas de README racine ni de `.env.example` ; le README front est le template Angular par défaut.
- **FRONT-03** — **Noms d'events socket dupliqués en dur** des deux côtés (`'pixelPlaced'`, `'gridState'`…) → risque de divergence. Piste : constantes partagées/typées.

---

## ✨ FEATURES prévues (après stabilisation)

> À attaquer **une fois les 🔴 réglés**. Estimation d'effort indicative.

- **FEAT-01** — **Mode Spectateur (Guest)** : accès au lobby + visualisation des salons en direct sans compte (lecture seule, pas de dessin/chat). *(Effort : moyen-élevé — toucher auth + guards + handlers socket.)*
- **FEAT-02** — **Refonte de l'inventaire des couleurs** : pouvoir supprimer une couleur du stock rapide (appui long) pour faire de la place. *(Prérequis de **FEAT-07** et de **EPIC-04**.)*
- **FEAT-03** — **Gestion des likes** : retirer son like + bouton « Refresh » manuel dans la galerie publique (au lieu du temps réel).
- **FEAT-08** — **Auto-like impossible** : l'auteur d'une grille ne peut pas se liker lui-même (garde dans `likeGrid`).
- **FEAT-06** — **Crédits des œuvres** : afficher sur la `GalleryCard` les joueurs ayant posé ≥ 1 pixel. *(Prérequis : tracer les contributeurs par grille en base.)*
- **FEAT-04** — **Historique du chat** : limiter l'historique chargé + persister les logs proprement en base (aujourd'hui en mémoire seulement, perdu à la fermeture).
- **FEAT-05** — **Épinglage galerie perso** : « Pin » des grilles pour les garder en haut de sa galerie.
- **FEAT-07** — **Limite de 30 couleurs en stock** : max 30 couleurs différentes. ⚠️ **Dépend de FEAT-02** (il faut pouvoir supprimer une couleur avant d'imposer un plafond).
- **FEAT-09** — **Système d'endurance** : jauge (ex. 50 pts), -1 par pixel, recharge auto (+1/2 min). *(Base de la monétisation par pub — voir **FEAT-10**. Recoupe **EPIC-02**.)*
- **FEAT-10** — **Emplacements pub (Ads)** : boutons « Regarder une pub → +20 endurance / +100 or ». *(Dépend de **FEAT-09** + intégration SDK pub — voir **PROD-05**.)*

---

## 🧭 EPICS (gros chantiers, à découper plus tard)

- **EPIC-01** — **Système de modération complet** :
  - Bouton « Report » (icône drapeau) en jeu et en galerie.
  - Auto-lock : champs `reportCount` + `reportedBy` (anti multi-report) sur le schéma `Grid` ; à `reportCount >= 5` → `isPublic = false` automatiquement + log.
  - Interface « Super Admin » (voir toutes les grilles, bannir, delete, super-pouvoirs chat).
  - Profil modération (ratio reports acceptés/refusés, blocage des reports abusifs).
- **EPIC-02** — **Progression & gamification** : niveaux & XP ; couleurs de chat débloquées selon le niveau ; tailles de grilles max conditionnées par le niveau ; système d'endurance (cf. **FEAT-09**).
- **EPIC-03** — **Classement & compétition** : page « Leaderboard » ; onglet « Top du mois » (basé sur les likes) avec reset mensuel et couronnement du 1er.
- **EPIC-04** — **Refonte majeure de la palette (« Le Marché des Couleurs »)** : page dédiée « Gros Stock » ; revente de couleurs (remboursement partiel 10/50 %) ; renommage personnalisé des couleurs. *(Dépend de **FEAT-02**.)*
- **EPIC-05** — **Communautaire avancé** : profils utilisateurs publics (clic sur un pseudo dans le chat → sa galerie) ; commentaires sous les grilles publiques.

---

## 🚀 PRÉ-PROD — Roadmap Lancement Facebook

> Opérations à dérouler **dans l'ordre, juste avant le lancement public** (issues du PDF de roadmap).

- **PROD-01** — **Analytics & tracking** : durée moyenne de session (log connexion/déconnexion), comptage des « Ad Impressions » par user, suivi des DAU. Outil : GA for Firebase ou table de logs custom en BDD.
- **PROD-02** — **Remise à zéro de la base (Database Wipe)** : backup des données actuelles → wipe des collections → seed des données de base (couleurs de départ, paramètres globaux).
- **PROD-03** — **Rotation des secrets** : nouveau `JWT_SECRET` (64+ caractères) sur Render ; nouvel utilisateur Mongo « Production » + suppression de l'utilisateur de dev ; mise à jour du `MONGOURL`.
- **PROD-04** — **Vérification finale `.gitignore`** : s'assurer que `.env` est bien ignoré (aucun secret poussé). *(Recoupe **BACK-09** / **DOC-01**.)*
- **PROD-05** — **Déploiement Facebook** : créer l'app sur le portail développeur, intégrer le SDK FB (auth + pubs, Instant Games ou Web), configurer les URLs de redirection et soumettre à validation.

---

## 💀 MÊME PAS EN RÊVE (Dette technique acceptée ad aeternam)
*(Aucune dette acceptée pour le moment.)*

---

## 📊 Résumé

### Par sévérité (bugs & dette uniquement)

| Sévérité | Restant |
|----------|---------|
| 🔴 Critique | 5 |
| 🟠 Élevé | 6 |
| 🟡 Moyen | 7 |
| 🔵 Info / Polish | 13 |

### Backlog produit

| Catégorie | Items |
|----------|-------|
| ✨ Features | 10 (FEAT-01→10) |
| 🧭 Epics | 5 (EPIC-01→05) |
| 🚀 Pré-prod | 5 (PROD-01→05) |
