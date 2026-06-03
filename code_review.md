# 📋 PixelTogether — Backlog dette technique & roadmap

> **Mise à jour** : 2026-06-03 · **PIVOT PRODUIT MAJEUR**
>
> Tâches résolues / décisions historiques -> `journal.md`. Jamais de secrets en clair.
>
> **Nouveau cap** : ce n'est PLUS un jeu communautaire persistant. C'est un **outil de teambuilding B2B éphémère par session**. Un **manager** configure une partie (manches, thèmes, durées), invite ses employés (compte temporaire : avatar + pseudo), lance le jeu. Les joueurs sont répartis en **groupes de 3-4** devant **une grille partagée**, avec une **palette de couleurs répartie exclusivement** entre eux (collaboration forcée). Fin de manche → **vote** → classement → le manager **télécharge un ZIP** de toutes les grilles → la partie se ferme.
>
> **Décisions d'architecture verrouillées** :
> - 🧠 **ZÉRO base de données** : tout l'état vit en mémoire le temps de la partie. Rien n'est persisté.
> - 🔑 **Pas de comptes persistants** : identité temporaire (socket + pseudo + avatar), morte à la fermeture.
> - 🛒 **Achat de sessions simulé** (hors MVP) : le manager arrive direct sur l'écran de config.
> - 👥 **Groupes auto** : le serveur répartit aléatoirement en paquets de **3-4 stricts** (min. de joueurs requis).
> - 🎨 **Palette par groupe** : ~20 couleurs réparties aléatoirement et **exclusivement** entre les membres (≈5 chacun). On ne peut poser QUE ses couleurs → la communication est la mécanique de collaboration.
> - 🗳️ **Vote** : 1 vote par participant, sa propre grille autorisée.
>
> Stack conservée : **Angular 21** (front) + **Node/Express + Socket.io** (back). **MongoDB supprimé.**

---

## 🧹 ÉTAPE 0 — DÉMOLITION (faire de la place avant de construire)

> À traiter **en premier**. On retire tout l'héritage communautaire qui n'a plus de sens en B2B éphémère.

- **DEMO-01** — **Retirer MongoDB** : supprimer `backend/db.js`, `backend/models/User.js`, `backend/models/Grid.js`, la dépendance `mongoose`, l'autosave `saveGridToDB` / `setInterval`, et tous les `findById`/`save`. L'état devient 100 % en mémoire.
- **DEMO-02** — **Retirer l'auth persistante** : supprimer `backend/routes/auth.js`, `backend/middleware/auth.js`, le JWT (`jsonwebtoken`), `register`/`login`, et côté front `auth.service.ts` + `auth.guard.ts` dans leur forme actuelle. Remplacé par une **identité temporaire** (voir CORE-02).
- **DEMO-03** — **Retirer la galerie publique** : supprimer `gallery-modal`, `gallery-card` (front) et les handlers socket `likeGrid`, `getGridsImagesFromDB`, `updateGridOnGallery`, `deleteGrid` (back).
- **DEMO-04** — **Retirer la boutique / l'économie** : supprimer `buyColor`, le concept de `gold`, l'achat de couleurs. La palette est désormais imposée par la partie.
- **DEMO-05** — **Retirer gamification & roadmap FB** : niveaux/XP, endurance, ads, et toute la logique de lancement Facebook deviennent caduques.
- **DEMO-06** — **Nettoyer les reliquats** : supprimer les sources React mortes (`*.jsx`, `components/`, `views/`, `context/`, `layouts/`), l'ancien dossier `server/`, et sortir `frontend/dist/` + `frontend/.angular/cache/` du suivi git (`.gitignore`).

---

## 🟦 ÉTAPE 1 — SOCLE « PARTIE EN MÉMOIRE »

> Le nouveau cœur technique : un modèle d'état runtime, sans BDD.

- **CORE-01** — **Modèle runtime en mémoire** : définir la hiérarchie d'objets vivants côté serveur — `Event` (créé par le manager) → `Round[]` (manches) → `Group[]` (3-4 joueurs) → `Grid` (partagée) + `Player[]`. Une seule source de vérité en mémoire (remplace `activeGrids`/`activeUsers`). Penser au cycle de vie : création, transitions de phase, **purge complète à la fermeture**.
- **CORE-02** — **Identité temporaire** : un joueur = `socketId` + `pseudo` + `avatar`, rattaché à un `Event`. Pas de mot de passe, pas de token long terme. Gérer la reconnexion courte (refresh/coupure réseau) sans BDD (ex. jeton de session volatil en mémoire).
- **FRONT-03** — **Constantes d'events socket partagées** : centraliser les noms d'events (typés) pour éviter la divergence front/back. À poser dès maintenant pour tout le nouveau code.

---

## 🟩 ÉTAPE 2 — MANAGER : CONFIG & LOBBY

- **MGR-01** — **Écran de configuration** (achat simulé) : le manager règle le **nombre de manches**, et pour chaque manche son **thème** + sa **durée**. Plus globalement : taille de grille, et taille du set de couleurs (20-30).
- **MGR-02** — **Invitation & lobby temps réel** : générer un **code/lien d'invitation**, afficher la liste des joueurs présents (avatar + pseudo) en direct au fur et à mesure qu'ils rejoignent.
- **MGR-03** — **Lancer la partie** : bouton de démarrage, **verrou : minimum 3 joueurs** (assez pour au moins un groupe).

---

## 🟥 ÉTAPE 3 — JOUEUR : REJOINDRE & AVATAR

- **PLY-01** — **Rejoindre une partie** : via code/lien, sans création de compte.
- **PLY-02** — **Constructeur d'avatar** : par composants (couleur de peau, chapeau, lunettes…) + pseudo.
- **PLY-03** — **Salle d'attente joueur** : écran « en attente du lancement par le manager ».

---

## 🟧 ÉTAPE 4 — LANCEMENT & GROUPES

- **GRP-01** — **Répartition automatique** : au lancement, le serveur répartit aléatoirement les joueurs en **groupes de 3-4**.
- **GRP-02** — **Allocation exclusive des couleurs** : répartir aléatoirement les ~20 couleurs entre les membres du groupe (≈5 chacun pour 4 joueurs), chaque couleur appartenant à **un seul** joueur.
- **GRP-03** — **Grille partagée par groupe** : instancier une grille collaborative unique par groupe, liée aux joueurs et à leurs couleurs.

---

## 🟪 ÉTAPE 5 — LA MANCHE (JEU)

- **PLAY-01** — **Écran de jeu** : grille partagée au centre, **thème** affiché, **timer**, les **3-4 avatars/pseudos en haut**, **chat** dispo.
- **PLAY-02** — **Dessin collaboratif contraint** : chaque joueur ne peut poser **que ses propres couleurs** ; synchro temps réel des pixels sur la grille du groupe (réutiliser/adapter `canvas` + `pixelPlaced`). Garde-fou serveur : refuser un pixel d'une couleur non possédée.
- **PLAY-03** — **Fin du timer** : figer la grille à 0, passer la manche en phase « vote ».

---

## 🗳️ ÉTAPE 6 — VOTE & CLASSEMENT

- **VOTE-01** — **Galerie de manche** : afficher toutes les grilles produites dans la manche.
- **VOTE-02** — **Vote** : 1 vote par participant (sa propre grille autorisée), anti double-vote.
- **VOTE-03** — **Classement** : afficher le classement des grilles les plus votées.

---

## ⬛ ÉTAPE 7 — ENCHAÎNEMENT & FIN DE PARTIE

- **FLOW-01** — **Enchaîner les manches** : passer à la manche suivante (nouveau thème + durée) jusqu'à la dernière.
- **FLOW-02** — **Écran final** : classement global de la partie.
- **FLOW-03** — **Export ZIP & fermeture** : le manager télécharge **un ZIP de toutes les grilles** (souvenir), puis fermeture propre de la partie + **purge mémoire** de l'`Event`.

---

## ✨ BONUS / FUTUR (après le MVP fonctionnel)

- **BONUS-01** — **Émojis d'émotion** : emoji cliquable sur son avatar pour exprimer une émotion en jeu.
- **BONUS-02** — **Statut « j'ai fini »** : signaler sa grille terminée avant la fin du timer, et pouvoir regarder celles des autres en attendant.
- **BONUS-03** — **Mode marathon** : grande grille + partie longue ; le manager ajoute un **nouveau thème toutes les X minutes** que les équipes doivent intégrer à leur œuvre en cours.
- **BONUS-04** — **Avatar généré par IA** : style graphique unifié, l'utilisateur décrit (« un barbu avec des lunettes ») → génération. *(À explorer : coût, latence, modèle spécialisé.)*
- **BONUS-05** — **Vrai système d'achat** : compte manager persistant + flux de paiement / crédits de sessions (réintroduit une mini-persistance, à isoler proprement).

---

## 🐛 DETTE TECHNIQUE CONSERVÉE (adaptée au nouveau modèle)

> Bugs/risques de l'ancien code qui restent pertinents après le pivot. La gravité est **réévaluée** : sans BDD, la robustesse de l'état mémoire devient critique.

### 🔴 CRITIQUE

- **BACK-10** — **Purge de l'état mémoire à la déconnexion** : le handler `disconnect` ne nettoie l'utilisateur que dans la branche hôte → fuite mémoire. Désormais **critique** : tout l'état (joueurs, grilles, votes) est en mémoire, une mauvaise purge fait enfler le process et corrompt les parties. Purger systématiquement, hors condition.
- **BACK-12** — **Doubles connexions** : un même utilisateur peut ouvrir plusieurs sockets → états incohérents (ex. double présence dans un groupe, manager dupliqué). Indexer/dédupliquer par identité.
- **SEC-02** — **Actions manager validées par identité stable** : les actions sensibles (lancer la partie, manche suivante, fermer, télécharger) doivent vérifier l'**identité stable** du manager, pas `socket.id` (volatil). Toujours `if (!event) return;` avant d'accéder à l'état.
- **FRONT-04** — **Perte de connexion en pleine partie** : encore plus grave sans BDD (aucune reprise possible depuis le serveur). Détecter `disconnect`/`connect_error`, tenter une reconnexion, afficher un écran clair, et éviter qu'un crash serveur ne laisse les joueurs bloqués.

### 🟠 ÉLEVÉ

- **FRONT-01** — **Reconnexion à sa partie au refresh** : un F5 ne doit pas éjecter le joueur. Restaurer sa session temporaire avant d'évaluer l'accès à l'écran de jeu.
- **FRONT-05** — **Notifications de chat** : déplacer l'écoute des messages dans un service toujours monté (pas seulement quand le chat est ouvert), pour le badge de non-lus.
- **BACK-02** — **Validation des entrées socket** : helper commun de validation sur chaque handler (data `undefined`/malformée = abus/crash).
- **BACK-04** — **Rate-limit des events** : throttling par socket/event (pixel, chat, vote) — seul `pixelPlaced` avait un cooldown.

### 🟡 MOYEN

- **BACK-03** — **Découper le god file `index.js`** : extraire la logique par domaine (event/lobby, groupes, jeu/grid, chat, vote, export) et **remplir/utiliser** `services/socketManager.js` (aujourd'hui vide). Idéal à faire en construisant le nouveau code plutôt qu'après.
- **PERF-03** — **Export image correct** : `toDataURL('image/webp')` avec node-canvas retombe en PNG silencieusement. Pour le ZIP souvenir (FLOW-03), encoder explicitement (PNG propre ou WebP via `sharp`).
- **ARCH-02** — **Limiter le god service d'UI** : `UiStateService` est injecté partout. Séparer les responsabilités au fil du nouveau code (éviter le couplage autour de la grille).

### 🔵 INFO / POLISH

- **BACK-08** — **CORS résiduel** : retirer les origines mortes (ex. `http://localhost:5173` Vite/React).
- **DOC-01** — **Documentation** : README racine décrivant le nouveau produit + `.env.example` (PORT, FRONTEND_URL…).
- **TEST-01** — **Tests** : aucune couverture aujourd'hui. À planifier progressivement sur la nouvelle logique (répartition groupes, allocation couleurs, vote).
- **UX-02** — **Chat** : compteur de caractères + gestion des mots trop longs (aligner limites front/back).

---

## 📊 Résumé

### Roadmap MVP (ordre d'implémentation)

| Étape | Lot | Tickets |
|-------|-----|---------|
| 0 | 🧹 Démolition | DEMO-01 → 06 |
| 1 | 🟦 Socle mémoire | CORE-01/02, FRONT-03 |
| 2 | 🟩 Manager config/lobby | MGR-01 → 03 |
| 3 | 🟥 Joueur & avatar | PLY-01 → 03 |
| 4 | 🟧 Groupes & couleurs | GRP-01 → 03 |
| 5 | 🟪 La manche | PLAY-01 → 03 |
| 6 | 🗳️ Vote & classement | VOTE-01 → 03 |
| 7 | ⬛ Enchaînement & fin | FLOW-01 → 03 |

### Dette conservée (réévaluée)

| Sévérité | Restant |
|----------|---------|
| 🔴 Critique | 4 |
| 🟠 Élevé | 4 |
| 🟡 Moyen | 3 |
| 🔵 Info / Polish | 4 |

### Bonus / futur

| Catégorie | Items |
|-----------|-------|
| ✨ Bonus | 5 (BONUS-01 → 05) |
