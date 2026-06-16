# PixelTogether — Backlog

**Statut produit** : MVP team building livré (sessions, vote, podium). Ce fichier regroupe tout le travail restant.

| Fichier | Rôle |
|---------|------|
| `backlog.md` | **Tâches en cours** (dettes, bugs, chantiers) + **Futur features** (idées) |
| `journal.md` | Jalons et tâches **terminées** |

> **Convention tickets** : `ID` — **Titre** : description. Gravité **CRITIQUE → ÉLEVÉ → MOYEN → INFO** pour les tâches en cours. Préfixe **ADD-** pour les futur features. Résolu → retirer d'ici + **une ligne** dans `journal.md`. Jamais de secrets en clair.

---

## Tâches en cours

Bugs, risques, dettes et chantiers actifs. Odin y ajoute de manière autonome dès qu'un souci est repéré ; toi aussi quand tu dis « on fera plus tard ».

### ÉLEVÉ

- **MODE-01** — **Backend modes coop / compétitif** : champ `gameMode` sur l'event (`coop` | `competitive`). **Coop** : une seule grille, un seul groupe — 2–7 invités + manager joueur (3–8 sur la grille), pas de shuffle multi-groupes, palettes `GAME_PALETTE_16` inchangées. **Compétitif** : shuffle et règles actuels, min **6** joueurs, manager spectateur. Grille **75×75** partout pour le moment (taille ajustable plus tard selon retours).
- **MODE-02** — **Fin de session coop (sans vote)** : pas de vote ni podium — écran **galerie** sur la grille unique, manager enchaîne les sessions ou termine. Chat **unique** (plus de canal par groupe en coop).
- **MODE-03** — **Manager joueur en coop** : en coop le manager reçoit une palette et place des pixels ; en compétitif il reste spectateur (comportement actuel).
- **MODE-04** — **Garde-fous démarrage par mode** : start bloqué + message explicite si coop avec &lt; 2 invités ou &gt; 7 ; compétitif avec &lt; 6 joueurs.
- **MODE-05** — **Landing cartes de création** : cartes **Coop** et **Compétitif** sur la landing ; bloc **Rejoindre par code** en dessous. Libellés clairs (ex. coop : « 2–7 invités + vous sur une grille » ; compétitif : « 6 joueurs min, vote entre équipes »).

- **BACK-02** — **Validation des entrées socket** : helper commun de validation sur chaque handler (data `undefined`/malformée = abus/crash).
- **BACK-04** — **Rate-limit des events** : throttling par socket/event (pixel, chat, vote) — seul `pixelPlaced` avait un cooldown.
- **PERF-04** — **Transition create/join lente (1–2 s)** : lazy-load du chunk `game-routes` au premier accès ; attente `emitWithAck` avant navigation (création) ; puis `joinRoom` + `gridState` + `renderGrid` (152 lignes canvas 75×75). Pistes : preload module game sur landing, loader modal, alléger le tracé de grille.

### MOYEN

- **TEST-01** — **Process de tests** : aucun pipeline aujourd'hui (specs supprimées, pas de scripts `test`). À définir puis implémenter : scripts npm back (`node:test` sur logique pure : shuffle, validation socket) et front (Vitest/Angular), règles agents alignées, première couverture utile, intégration CI — pas de fichiers orphelins sans process.
- **PERF-03** — **Export image correct** : `toDataURL('image/webp')` avec node-canvas retombe en PNG silencieusement. Pour le ZIP souvenir, encoder explicitement (PNG propre ou WebP via `sharp`).
- **ARCH-03** — **Routing sur-dimensionné** : 3 fichiers `*.routes.ts` (manager, lobby, game) pour 1 page chacun → triple indirection + lazy-load inutile sur manager/lobby (~7–9 KB). Simplifier : routes plates dans `app.routes.ts` pour `/` et `/lobby`, lazy-load **uniquement** sur `game/:roomId`.

## Futur features

Idées et évolutions — pas de priorité imposée, tri libre. Quand une idée devient un chantier concret, la déplacer en **Tâches en cours** (avec un `ID`).

- **ADD-02** — **Polish podium final** : amélioration UI du podium de fin de partie (@picasso).
- **ADD-03** — **Vote par timer** : vote automatique après 30 s ou 1 min (à tester) — le manager ne gère plus, moins de friction.
- **ADD-04** — **Égalité sur les votes** : en cas d'égalité, le manager décide du gagnant.
- **ADD-05** — **Export ZIP fin de partie** : export de toutes les grilles par le manager, avant `endParty`.
- **ADD-06** — **Annonces chat présence** : annonce quand le manager rejoint/quitte la room (idem joueurs ayant fini).
- **ADD-07** — **Chrono navbar coloré** : le chrono de la navbar change de couleur quand le temps baisse.
- **ADD-08** — **Chat waiting room** : chat commun en salle d'attente (manager + joueurs en attente des derniers arrivants).
- **ADD-09** — **Barre joueurs en jeu** : afficher les membres du groupe + manager spectateur.
- **ADD-10** — **Indicateur « en train d'écrire »** : sur la barre joueurs.
- **ADD-11** — **Décompte transition de groupe** : 5…4…3…2…1 sur la modale de transition de groupe.
- **ADD-12** — **Grille décorative waiting room** : grille décorative mais fonctionnelle en fond de salle d'attente.
- **ADD-13** — **Statut « j'ai fini »** : quand tout le groupe a fini → grille lock + joueurs au lobby (accès autres grilles en chat, pas de pixel).
- **ADD-14** — **Emojis d'émotion sur l'avatar** : réactions émotionnelles sur l'avatar.
- **ADD-15** — **Constructeur d'avatar** : personnalisation (peau, chapeau…).
- **ADD-16** — **Composant modales warning** : composant unique pour toutes les modales de type « warning ».
- **ADD-17** — **Avatar généré par IA** : génération d'avatar par IA (lol).
- **ADD-18** — **Refonte UI totale** : refonte de tous les écrans.
- **ADD-19** — **Config manager avancée** : taille de grille, pool 20–30 couleurs.
- **ADD-20** — **Compte manager + crédits** : facturation simulée.
- **ADD-21** — **Journal d'audit par partie** : preuve de service B2B, hors RAM.
- **ADD-22** — **Mode marathon** : sans limite des 60 min.
- **ADD-23** — **Choix de musique manager** : pistes prédéfinies sélectionnables par le manager.
- **ADD-24** — **Documentation landing + README** : expliquer le principe sur la landing + readme GitHub pour le portfolio (à terminer).
- **ADD-25** — **Encart déroulement waiting room** : encart qui explique rapidement le déroulement.
- **ADD-26** — **Sous-titres marrants waiting room** : pool de sous-titres sous le titre (ex. « {pseudo} vous a préparé un super thème ! ») — tirage aléatoire à chaque entrée.
- **ADD-27** — **SEO** : optimisation pour les moteurs de recherche.
- **ADD-28** — **Kick joueur waiting room** : expulser un joueur de la salle d'attente.
- **ADD-29** — **Masquer création de game** : rendre invisible la création de nouvelle partie (éviter les trolls — à définir).
- **ADD-30** — **Gestion du blanc adjacent** : si deux blancs côte à côte, enlever la bordure entre eux.
- **ADD-31** — **Spinner chargement socket** : spinner ou état « Chargement… » pendant ack socket + navigation (éviter l'impression de bug).
- **ADD-32** — **Showcase gameplay landing** : grille de démo 8×8 animée, palettes exclusives de joueurs fictifs, pour expliquer le concept en un coup d'œil.
- **ADD-33** — **Background landing pixels** : pixels décoratifs épars dans la grille en fond de landing.
- **ADD-34** — **Mode démo** : 2–5 joueurs (manager inclus), **1 session** uniquement, durée max **15 min**, grille **75×75**. Format essai rapide (landing / pitch) — friction minimale, distinct du coop et du compétitif.
- **ADD-35** — **Purge parties abandonnées** : TTL serveur si manager absent (ex. 30 min → `closeEvent`) + purge client des identités obsolètes. Scope **AUTH-03** — rien en place aujourd'hui (modèle `socket.id` pur).
- **AUTH-03** — **Reprise session & identité stable (v2)** — chantier à cadrer avant implémentation (tentative juin 2026 abandonnée, trop de régressions). **Objectif** : F5 / déco courte / multi-onglets sans casser le gameplay. **Non-objectifs** : auto-resume magique sur la landing ; une partie par navigateur. **Décisions à trancher** : `socket.id` seul vs `playerId` UUID stable (cf. SEC-02) ; handshake minimal (`eventId` + identité) vs JWT. **Règles produit** : interdire `enterWaitingRoom` si `status === started` (sauf reconnexion du même participant) ; manager F5 en game → lobby ou groupe avec état complet ; canvas `joinGroup` idempotent. **Par route — critères d'acceptation** : `/` code seul, pas de reprise implicite ; `/room/:id` → `enterWaitingRoom` ack ou erreur ; `/lobby/:id` manager → `getEventLobby` ; `/game/:id/:group` → `joinGroup` + `gridState` (couleurs, grille, quadrillage). **UI** : overlay « reconnexion… » uniquement sur routes jeu ; pas de blocage landing. **Tests manuels** : 2 onglets même code ; manager quitte 30 min ; joueur déco Wi-Fi 10 s ; F5 en pleine partie. **Livrables** : spec 1 page dans le ticket avant code ; petit diff ; pas de `jsonwebtoken` tant que handshake suffit.