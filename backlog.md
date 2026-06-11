# PixelTogether — Backlog

**Statut produit** : MVP team building livré (sessions, vote, podium). Ce fichier regroupe tout le travail restant.

| Fichier | Rôle |
|---------|------|
| `backlog.md` | **Tâches en cours** (dettes, bugs, chantiers) + **Futur features** (idées) |
| `journal.md` | Jalons et tâches **terminées** |

> **Convention tickets** : `ID` — **Titre** : description. Gravité **CRITIQUE → ÉLEVÉ → MOYEN → INFO** pour les tâches en cours. Résolu → retirer d'ici + **une ligne** dans `journal.md`. Jamais de secrets en clair.

---

## Tâches en cours

Bugs, risques, dettes et chantiers actifs. Odin y ajoute de manière autonome dès qu'un souci est repéré ; toi aussi quand tu dis « on fera plus tard ».

### CRITIQUE

- **SEC-02** — **Actions manager validées par identité stable** : actions sensibles (start, close, vote, télécharger) doivent vérifier l'identité stable, pas `socket.id`. Dev : `socket.id === event.manager` OK. Prod : → **AUTH-01**. Toujours `if (!event) return;` avant d'accéder à l'état.
- **FRONT-04** — **Perte de connexion en pleine partie** : encore plus grave sans BDD (aucune reprise possible depuis le serveur). Détecter `disconnect`/`connect_error`, tenter une reconnexion, afficher un écran clair, et éviter qu'un crash serveur ne laisse les joueurs bloqués.

### ÉLEVÉ

- **AUTH-01** — **Session JWT éphémère (~1 h)** : émis au create/join, identité stable manager/player. Prérequis pour SEC-02 (hors dev) et FRONT-01 (reconnexion F5).
- **FRONT-01** — **Reconnexion à sa partie au refresh** : un F5 ne doit pas éjecter le joueur. → **AUTH-01** + restauration session avant contrôle d'accès.
- **FRONT-05** — **Notifications de chat** : déplacer l'écoute des messages dans un service toujours monté (pas seulement quand le chat est ouvert), pour le badge de non-lus.
- **BACK-02** — **Validation des entrées socket** : helper commun de validation sur chaque handler (data `undefined`/malformée = abus/crash).
- **BACK-04** — **Rate-limit des events** : throttling par socket/event (pixel, chat, vote) — seul `pixelPlaced` avait un cooldown.
- **PERF-04** — **Transition create/join lente (1–2 s)** : lazy-load du chunk `game-routes` au premier accès ; attente `emitWithAck` avant navigation (création) ; puis `joinRoom` + `gridState` + `renderGrid` (152 lignes canvas 75×75). Pistes : preload module game sur landing, loader modal, alléger le tracé de grille.

### MOYEN

- **TEST-01** — **Process de tests** : aucun pipeline aujourd'hui (specs supprimées, pas de scripts `test`). À définir puis implémenter : scripts npm back (`node:test` sur logique pure : shuffle, validation socket) et front (Vitest/Angular), règles agents alignées, première couverture utile, intégration CI — pas de fichiers orphelins sans process.
- **PERF-03** — **Export image correct** : `toDataURL('image/webp')` avec node-canvas retombe en PNG silencieusement. Pour le ZIP souvenir, encoder explicitement (PNG propre ou WebP via `sharp`).
- **ARCH-03** — **Routing sur-dimensionné** : 3 fichiers `*.routes.ts` (manager, lobby, game) pour 1 page chacun → triple indirection + lazy-load inutile sur manager/lobby (~7–9 KB). Simplifier : routes plates dans `app.routes.ts` pour `/` et `/lobby`, lazy-load **uniquement** sur `game/:roomId`.

## Futur features

Idées et évolutions — pas de priorité imposée, tri libre. Quand une idée devient un chantier concret, la déplacer en **Tâches en cours** (avec un `ID`).

- Polish podium final (UI @picasso)
- Vote par timer (30 s ou 1 min à tester) — le manager ne gère plus, moins de friction
- Égalité sur les votes : le manager décide du gagnant
- Export ZIP de toutes les grilles en fin de partie (manager, avant `endParty`)
- Avatar des joueurs du groupe visible sur la grid
- Chat : annonce quand le manager rejoint/quitte la room (idem joueurs ayant fini)
- Chrono navbar qui change de couleur quand le temps baisse
- Chat commun en waiting room (manager + joueurs en attente des derniers arrivants)
- Barre joueurs en jeu (membres du groupe + manager spectateur)
- Indicateur « en train d'écrire » sur la barre joueurs
- Décompte 5…4…3…2…1 sur la modale de transition de groupe
- Grille décorative (mais fonctionnelle) en fond de waiting room
- Statut « j'ai fini » : quand tout le groupe a fini → grille lock + joueurs au lobby (accès autres grilles en chat, pas de pixel)
- Emojis d'émotion sur l'avatar
- Constructeur d'avatar (peau, chapeau…)
- Créer un composant unique pour toutes les modales de "warning"
- Avatar généré par IA (lol)
- Refonte UI totale (tous les écrans)
- Config manager avancée : taille grille, pool 20–30 couleurs
- Compte manager + crédits (facturation simulée)
- Journal d'audit par partie (preuve de service B2B, hors RAM)
- Mode marathon (sans limite 60 min)
- Manager : choix de musique (pistes prédéfinies)
- Documentation sur landing page pour expliquer le principe + readme github pour le portfolio // a terminer
- Waiting room : encart qui explique rapidement le déroulement
- SEO
- Kick un joueur de la waiting room
- Rendre invisible la création de nouvelle game (éviter les trolls — à définir)
- Meilleure gestion du blanc : si deux blancs côte à côte, enlever la bordure entre eux
- Spinner ou état « Chargement… » pendant ack socket + navigation (éviter l'impression de bug)
- Showcase visuel de gameplay interactif sur la landing (grille de démo 8x8 animée, palettes exclusives des joueurs fictifs) pour expliquer le concept en un coup d'œil
