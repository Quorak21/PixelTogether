# Documentation Technique du Backend - PixelTogether 🎨

Bienvenue ! Ce document a été conçu pour prendre en main rapidement le backend de **PixelTogether**. 

Ici, pas de jargon inutile. C'est un guide rédigé sur un ton simple et naturel pour comprendre comment s'articule le code, le rôle de chaque fichier, et comment naviguent les informations en arrière-plan.

---

## 🗺️ Architecture Globale & Choix Techniques

PixelTogether est un jeu collaboratif et compétitif de dessin sur grille en temps réel.
Le backend fonctionne entièrement en **temps réel** via des connexions bidirectionnelles.

1. **Serveur principal** : [Express](file:///h:/Taches/Programmation/PixelTogether/backend/index.js) n'est utilisé que comme coquille vide pour le routage HTTP de base et la gestion de la sécurité CORS.
2. **Communication en temps réel** : Tout passe par [Socket.io](file:///h:/Taches/Programmation/PixelTogether/backend/app/createServer.js). C'est lui qui gère le chat, la pose des pixels et la synchronisation des écrans.
3. **Base de données** : Il n'y a **pas de base de données persistante** (pas de SQL ni de NoSQL) ! Tout est stocké en mémoire vive dans l'objet global `activeEvents` du fichier [eventStore.js](file:///h:/Taches/Programmation/PixelTogether/backend/store/eventStore.js). Si le serveur redémarre, toutes les parties en cours sont perdues.
4. **Génération d'images** : On utilise la bibliothèque `canvas` (node-canvas) côté serveur pour transformer les coordonnées de pixels peints en de vraies images PNG Base64 pour le podium et les archives.

---

## 📁 Structure du Code Backend

Voici comment sont répartis les fichiers :

```text
backend/
├── app/
│   └── createServer.js          # Initialisation Express, Socket.io et dépendances
├── config/
│   └── constants.js             # Règles métier, tailles de grilles, délais et constantes
├── index.js                     # Point d'entrée de l'application (lance le serveur)
├── services/
│   ├── colors/
│   │   └── colorSplit.js        # Distribution des palettes de couleurs aux joueurs
│   ├── event/
│   │   ├── gameMode.js          # Validation des modes coop / compétitif et des nombres de joueurs
│   │   ├── lifecycle.js         # Démarrage, arrêt et sweep (nettoyage) automatique des salons
│   │   └── payloads.js          # Formatage des messages (structures JSON) envoyés au front
│   ├── grid/
│   │   ├── gridPreview.js       # Rendu canvas 2D vers image PNG
│   │   └── preview.js           # Mise à jour des aperçus des dessins des équipes
│   ├── reconnect/
│   │   └── sessionToken.js      # Génération et validation des tokens de reconnexion
│   ├── session/
│   │   ├── groupAccess.js       # Accès lobby joueur et mode spectateur
│   │   ├── groupFinish.js       # Statut « j'ai fini » compétitif (compteur, lobby joueur)
│   │   ├── sessionLifecycle.js  # Déroulement d'une session de dessin (début, fin)
│   │   └── sessionTimer.js      # Planification du chronomètre de fin de session
│   └── vote/
│       └── voteLifecycle.js     # Logique des votes, calculs de scores et podiums
├── sockets/
│   ├── handlers/
│   │   ├── game.handlers.js     # Réception du chat, pose de pixels et canvas
│   │   ├── lifecycle.handlers.js# Déconnexion et fermeture de salon
│   │   ├── lobby.handlers.js    # Création de partie et lobby du manager
│   │   ├── socketGuards.js      # Sécurité (callbacks obligatoires et anti-spam)
│   │   └── waitingRoom.handlers.js # Inscriptions, votes et transitions hors-jeu
│   └── register.js              # Enregistrement de tous les écouteurs sur les sockets connectés
└── store/
    └── eventStore.js            # Notre BDD temporaire en mémoire et ses fonctions utilitaires
```

---

## 💾 La Structure de Données Majeure : L'objet `Event`

Chaque salon de jeu créé est modélisé par un objet `Event` stocké dans la base en mémoire d' [eventStore.js](file:///h:/Taches/Programmation/PixelTogether/backend/store/eventStore.js). Voici à quoi il ressemble :

```javascript
{
  id: "ABCDEF",               // Code unique de la partie (6 lettres)
  manager: "socketId...",     // ID de socket actuel du créateur de la partie
  managerPlayerId: "uuid...", // Identifiant permanent du manager (pour la reconnexion)
  partyName: "Soirée Pixel",  // Nom de la partie
  theme: "Château fort",      // Thème de la session en cours
  themes: ["Thème 1", ...],   // Liste de tous les thèmes configurés
  gameMode: "competitive",    // Mode de jeu : 'coop' ou 'competitive'
  sessionCount: 3,            // Nombre de sessions de dessin programmées
  currentSession: 1,          // Numéro de la session en cours
  sessionDurationMinutes: 15, // Durée d'une session en minutes
  sessionEndsAt: 1718712312,  // Timestamp exact de fin de la session active
  status: "waiting",          // Statut : 'waiting' (en attente/votes) ou 'started' (en dessin)
  partyStarted: false,        // La partie a-t-elle déjà démarré au moins une fois ?
  players: [ ... ],           // Tableau des profils de joueurs inscrits ({playerId, socketId, pseudo, avatarColor})
  groups: {                   // Dictionnaires des équipes actives sur la session en cours
    "4829": {
      groupCode: "4829",      // Code groupe à 4 chiffres
      groupIndex: 1,
      players: [ ... ],       // Liste des membres affectés au groupe
      pixels: {               // Coordonnées peintes de la grille : {"x,y": "#colorHex"}
        "12,34": "#ffffff"
      },
      chatMessages: [ ... ],  // Historique des messages du groupe
      finishedPlayerIds: [],  // Compétitif : joueurs ayant cliqué « j'ai fini »
      finished: false,        // Compétitif : true quand tout le groupe a terminé
      image: "data:image/png..." // Preview Base64 de la grille générée par canvas
    }
  },
  sessionArchive: [ ... ],    // Historique des sessions passées (dessins figés, scores de vote)
  activeVote: {               // État du vote de la session compétitive qui vient de finir
    sessionNumber: 1,
    status: "open",           // 'open' ou 'closed'
    votes: { "playerId": "groupCode" }, // Qui a voté pour quoi
    winnerGroupCode: null
  },
  playerVoteTotals: {},       // Cumul des votes reçus par chaque joueur (pour le podium individuel)
  showingResults: false,      // Est-ce qu'on affiche le podium final ?
  coopWrMode: null,           // Pour la coop : 'sessionResult' ou 'gallery' pour animer la transition
  sessionsByToken: {},        // Index local token -> playerId
  lastActivityAt: 1718701234  // Dernier timestamp d'activité (pour purger les inactifs)
}
```

---

## 🛠️ Guide Détaillé des Fichiers et Fonctions

Voici le rôle précis de chaque fonction du backend, classé par module.

### 1. Base de données en mémoire ([eventStore.js](file:///h:/Taches/Programmation/PixelTogether/backend/store/eventStore.js))
Ce fichier sert à manipuler l'état global du serveur.
* **`generateRoomCode()`** : Génère un code de salon à 6 lettres majuscules (ex: `AJDKSL`). Boucle tant que le code généré est déjà utilisé pour éviter les collisions.
* **`generateGroupCode(event)`** : Génère un code de groupe à 4 chiffres (ex: `9845`) propre à un événement.
* **`normalizeEventId(eventId)`** / **`normalizeGroupCode(groupCode)`** : Nettoient les chaînes reçues (retirent les espaces, passent en majuscules) et valident le format avec des expressions régulières pour éviter les bugs d'injections.
* **`groupRoomName(eventId, groupCode)`** : Renvoie une chaîne combinée `"eventId:groupCode"`. C'est le nom de la room Socket.io sur laquelle s'abonnent les membres d'une équipe pour dessiner et tchatter ensemble.
* **`getEvent(eventId)`** / **`getGroup(event, groupCode)`** : Fonctions d'accès rapide pour récupérer proprement un salon ou un groupe après normalisation de son identifiant.
* **`getSortedGroups(event)`** : Convertit l'objet groups en tableau et le trie par index (`groupIndex`). Utilisé par le lobby manager et l'affichage des votes pour garder le même ordre visuel.

---

### 2. Attribution des couleurs ([colorSplit.js](file:///h:/Taches/Programmation/PixelTogether/backend/services/colors/colorSplit.js))
* **`splitPalette(pool, playerCount)`** : Reçoit la palette globale de 16 couleurs et le nombre de joueurs. Divise le tableau en parts égales. S'il y a un reste de division (ex: 16 couleurs pour 3 joueurs, reste 1), elle distribue le reste équitablement aux premiers joueurs.
  * *Lien avec* : `shuffleArray` de [groupShuffle.js](file:///h:/Taches/Programmation/PixelTogether/backend/services/shuffle/groupShuffle.js) pour mélanger les couleurs avant découpe.
* **`assignPalettesToGroup(group)`** : Mélange la liste des joueurs d'un groupe et attribue à chacun son lot de couleurs exclusives. Ainsi, deux équipiers ne partagent aucune couleur sur la palette de dessin.
  * *Lien avec* : `GAME_PALETTE_16` dans [constants.js](file:///h:/Taches/Programmation/PixelTogether/backend/config/constants.js).

---

### 3. Logique des groupes ([groupShuffle.js](file:///h:/Taches/Programmation/PixelTogether/backend/services/shuffle/groupShuffle.js))
* **`computeGroupSizes(playerCount)`** : Calcule comment découper les joueurs pour avoir des équipes équilibrées de 2 à 4 personnes. Par exemple, pour 10 joueurs, elle renverra `[4, 3, 3]`.
* **`shuffleArray(items)`** : Un utilitaire générique de mélange (mélange de Fisher-Yates simplifié).
* **`splitIntoGroups(players)`** : Mélange les joueurs connectés et les répartit en équipes selon les tailles calculées par `computeGroupSizes`.
  * *Lien avec* : `beginSession()` pour former les équipes au démarrage d'une session de dessin.

---

### 4. Configuration des modes ([gameMode.js](file:///h:/Taches/Programmation/PixelTogether/backend/services/event/gameMode.js))
* **`isCoop(event)`** : Vérifie si le mode de jeu actuel est coopératif.
* **`parseGameMode(raw)`** : Valide la chaîne de caractères du mode de jeu et applique le mode compétitif par défaut si invalide.
* **`validateSessionCountForMode(gameMode, sessionCount)`** : S'assure que le nombre de sessions configuré respecte les règles du mode de jeu (par ex. Coop: de 1 à 4 sessions, Compétitif: de 3 à 8).
* **`validateStartPlayerCount(event)`** : Bloque le départ de la partie si le nombre de joueurs requis n'est pas atteint (min 2 invités en coop, min 6 joueurs en compétitif).
* **`validateGuestRegistration(event)`** : Bloque l'inscription de nouveaux invités en cours de route si la partie coop est déjà complète (limite de 7 invités max).

---

### 5. Gestion des sessions de reconnexion ([sessionToken.js](file:///h:/Taches/Programmation/PixelTogether/backend/services/reconnect/sessionToken.js))
C'est le module de tolérance aux pannes réseau. Il évite qu'un joueur perde ses données en cas de micro-coupure.
* **`computeExpiresAt(event)`** : Estime l'heure théorique de fin de la partie et rajoute 15 minutes. C'est la date d'expiration de la session de reconnexion.
* **`issueSession(event, params)`** : Crée une session de reconnexion en générant un jeton aléatoire de 16 octets (`token`). Enregistre cette session dans l'index global `playerSessions` pour pouvoir y accéder plus tard.
* **`validateToken(token)`** : Vérifie la validité du token. Retourne l'objet session ou `null` s'il est expiré ou inexistant.
* **`getSessionByPlayerId(playerId)`** : Retrouve une session active via le playerId stable.
* **`updateSessionGroupCode(playerId, groupCode)`** : Assigne le nouveau code de groupe d'un joueur dans sa session lors des changements de manches (reshuffle).
* **`setSessionConnected(playerId, connected, socketId)`** : Met à jour le flag `connected` de la session d'un joueur et mémorise son nouveau `socketId` en cas de déconnexion/reconnexion.
* **`purgePlayerSession(playerId)`** / **`purgeEventSessions(event)`** / **`removePlayerSessionFromEvent(event, playerId)`** : Fonctions de nettoyage qui effacent les sessions des index en mémoire.
* **`hasActiveSessionOnOtherEvent(token, eventId)`** : Vérifie qu'un joueur est déjà rattaché à une autre partie active (ignore les sessions détachées, `eventId` null).
* **`isBannedFromEvent(session, eventId)`** : `true` si `session.kicksByEvent[eventId] >= 2` (ban room-scoped via le token).
* **`recordRoomKick(session, eventId)`** : Incrémente `kicksByEvent` pour ce salon.
* **`detachSessionFromEvent(session, event)`** : Kick — retire le lien room sans supprimer le token.
* **`reattachSessionToEvent(session, event)`** : Réattache un token détaché lors d'un retour en waiting room.

---

### 6. Gestion des participants ([participants.js](file:///h:/Taches/Programmation/PixelTogether/backend/services/event/participants.js))
* **`isAvatarColorValid(color)`** : Valide que la couleur d'avatar transmise par le front respecte la regex hexadécimale.
* **`resolvePlayerId(event, socketId, playerId)`** : Retrouve le playerId unique d'un participant connecté à partir de son socket temporaire actuel.
* **`getParticipantRole(event, socketId, playerId)`** : Retourne `'manager'` ou `'player'`.
* **`isManager(event, socket)`** : Raccourci retournant true si le socket ou playerId correspond à l'hôte créateur de la partie.
* **`isRegistered(event, socketId, playerId)`** : Indique si le joueur a complété son inscription (pseudo + avatar) et figure dans la liste `event.players`.
* **`getParticipantPseudo(event, socketId, group, playerId)`** : Récupère le pseudo d'un joueur.
* **`removePlayerFromEvent(event, socketId, playerId)`** : Retire un joueur de la liste de l'événement s'il s'en va.
* **`findPlayerGroup(event, socketId, playerId)`** / **`findPlayerGroupByPlayerId(event, playerId)`** : Retrouvent dans quel groupe (équipe de dessin) est actuellement affecté le joueur.
* **`remapSocket(event, playerId, newSocketId)`** : Réassocie les nouveaux IDs de socket dans toutes les listes internes (joueurs de la room, joueurs du groupe, session active) après une reconnexion.
  * *Lien avec* : `setSessionConnected` dans [sessionToken.js](file:///h:/Taches/Programmation/PixelTogether/backend/services/reconnect/sessionToken.js).
* **`clearManagerDisconnectTimer(event)`** : Supprime les timeouts de déconnexion du manager. Appelé si le manager se reconnecte à temps.
* **`scheduleManagerAbsentClose(io, event, eventId, closeEvent)`** : Déclenche la grâce de reconnexion du manager. Avant le démarrage de la partie : alerte puis fermeture à 5 min. En **compétitif** après `partyStarted` : active le pilote auto (`autoPilot.js`) sans fermer la salle. En **coop** après `partyStarted` : bannière après 2 min + `coopManagerAbsent` (fin de session par tous les joueurs).
* **`isManagerConnected(event)`** : Indique si la session manager est connectée (via `sessionToken`).
  * *Lien avec* : [autoPilot.js](services/event/autoPilot.js) pour l'enchaînement vote 60s → roulette 7s → session 10s → podium 300s → `closeEvent`.
  * *Lien avec* : `closeEvent` dans [lifecycle.js](file:///h:/Taches/Programmation/PixelTogether/backend/services/event/lifecycle.js).

---

### 7. Déroulement du dessin ([sessionLifecycle.js](file:///h:/Taches/Programmation/PixelTogether/backend/services/session/sessionLifecycle.js))
* **`clearSessionTimer(event)`** : Arrête le minuteur d'arrière-plan de la session active de dessin.
* **`buildCoopGroupMembers(event)`** : Regroupe tous les invités et le manager dans un seul tableau de membres pour la grille de dessin coopérative.
* **`beginCoopSession(event, deps)`** : Prépare la session coopérative (un seul groupe unique, distribution de couleurs sur tout le monde).
* **`beginSession(event, deps)`** : Démarre une session de dessin en découpant les joueurs en groupes (compétitif) ou en lançant la structure unique (coopératif).
* **`dissolveSessionGroups(event)`** : Dissout les groupes et remet l'événement en attente à la fin de la manche.
* **`emitSessionEnded(io, event)`** : Émet l'événement de fin de session à chaque participant avec un payload personnalisé.
* **`finishCurrentSession(io, event)`** : Enregistre l'archive, dissout les groupes, incrémente le numéro de session de dessin, change le thème courant, et appelle `emitSessionEnded`.
* **`handleEndSession(socket, data, callback, deps)`** : Point d'écoute socket pour permettre au manager d'abréger manuellement la manche de dessin.

---

### 7b. Fin de groupe compétitif ([groupFinish.js](file:///h:/Taches/Programmation/PixelTogether/backend/services/session/groupFinish.js))
* **`markPlayerFinished(io, event, group, playerId)`** : Enregistre un clic « j'ai fini », diffuse `groupFinishProgress` au groupe, et appelle `completeGroup` si tout le monde a cliqué.
* **`completeGroup(io, event, groupCode)`** : Verrouille la grille (`finished: true`), émet `groupFinished` aux membres, `lobbyGroupsUpdated` au salon, et `finishCurrentSession` si toutes les grilles sont terminées.
* **`canAccessLobby(event, playerId)`** / **`isGroupSpectator(event, socket, group)`** : Autorisent l'accès au lobby joueur et le mode spectateur (chat sans historique, pas de pixel). Voir aussi [groupAccess.js](file:///h:/Taches/Programmation/PixelTogether/backend/services/session/groupAccess.js).

---

### 8. Chronomètres de session ([sessionTimer.js](file:///h:/Taches/Programmation/PixelTogether/backend/services/session/sessionTimer.js))
* **`scheduleSessionEnd(event, io)`** : Calcule le timestamp exact de la fin de la manche en ajoutant la durée de dessin et 10 secondes de transition (temps de latence pour que le front affiche l'alerte). Enregistre un `setTimeout` qui appellera `finishCurrentSession()` une fois ce délai écoulé.

---

### 9. Rendu d'images ([gridPreview.js](file:///h:/Taches/Programmation/PixelTogether/backend/services/grid/gridPreview.js) & [preview.js](file:///h:/Taches/Programmation/PixelTogether/backend/services/grid/preview.js))
* **`generateGridImage(pixels, gridSize, pixelSize)`** : Crée un canvas virtuel 2D de taille `gridSize * pixelSize`, peint le fond en blanc, dessine chaque pixel stocké à ses coordonnées, puis génère une URL de données PNG (`data:image/png;base64,...`).
* **`updateGroupPreview(eventId, groupCode)`** : Appelé après chaque pixel posé pour rafraîchir la preview PNG de l'équipe. C'est cette preview que le manager voit s'animer sur son écran de contrôle.
* **`getEventGroupImages(event)`** : Récupère les miniatures PNG de tous les groupes.

---

### 10. Formatage des données de vote ([voteLifecycle.js](file:///h:/Taches/Programmation/PixelTogether/backend/services/vote/voteLifecycle.js))
Ce fichier pilote tout ce qui se passe après le dessin : les votes, l'élection de la plus belle grille, les podiums individuels et la galerie.
* **`snapshotSessionArchive(event)`** / **`snapshotSessionForVote(event)`** : Figent les dessins, les groupes et les joueurs de la session terminée pour l'archivage. `snapshotSessionForVote` prépare en plus l'objet `activeVote` pour démarrer les scrutins compétitifs.
* **`applyVoteDelta(event, groupCode, delta)`** : Incrémente ou décrémente les scores de vote d'un groupe et met à jour le total individuel de chaque joueur qui a dessiné dans ce groupe.
* **`pickWinner(archiveSession)`** : Détermine le gagnant d'une session de vote en élisant l'équipe qui a collecté le plus grand nombre de voix.
* **`buildTopPlayers(event, limit)`** : Calcule le classement individuel des joueurs pour dresser le podium final.
* **`buildTopGrids(event, limit)`** : Calcule le classement des plus belles grilles toutes sessions confondues.
* **`getWrMode(event)`** : Calcule l'état de l'écran d'attente (lobby) pour les joueurs (`players`, `voting`, `voteResult`, `podium`, `sessionResult`, `gallery`).
* **`buildVoteCandidates(event)`** : Liste les grilles en lice pour l'écran des votes.
* **`buildVoteFields(event, playerId)`** : Construit le payload récapitulatif des données de vote adapté à chaque joueur.
* **`castVote(event, playerId, groupCode)`** : Gère l'action de voter en reportant les points. Si le joueur avait déjà voté pour une autre équipe, elle soustrait un point à l'ancien groupe avant d'en ajouter un au nouveau.
* **`closeVote(event)`** : Clôture le scrutin et calcule le vainqueur via `pickWinner`.
* **`handleCastVote()`** / **`handleCloseVote()`** / **`handleShowResults()`** / **`handleEndParty()`** : Handlers Socket.io qui réceptionnent les actions de vote, de passage aux résultats et de clôture de partie émises par les clients.

---

Voici comment se déroule une partie de A à Z à travers les échanges de messages en temps réel :

### 1. Création de la partie (Lobby)
* **`newGrid`** (Manager ➔ Serveur) : Le manager envoie les paramètres (thèmes, mode, etc.) pour créer le salon.
* **Confirmation** (Serveur ➔ Manager) : Le serveur renvoie le code unique de salon (ex: `AJDKSL`) et le jeton (`token`) de reconnexion.

### 2. Inscription des joueurs (Salle d'attente)
* **`enterWaitingRoom`** (Joueur ➔ Serveur) : Le joueur entre le code du salon pour s'y connecter. L'ack `waitingRoomState` inclut `themes` (liste complète des thèmes configurés) en plus de `theme` (thème de la session courante).
* **`registerPlayer`** (Joueur ➔ Serveur) : Le joueur s'inscrit en choisissant son pseudo et son avatar.
* **`kickPlayer`** (Manager ➔ Serveur) : Expulse un joueur de la salle d'attente (détache le token, compteur de kicks sur le token). Ack `{ ok }` ou `{ error }`.
* **`playerKicked`** (Serveur ➔ Joueur expulsé) : Notification de kick avec `{ roomId, message, banned }`.
* **`waitingRoomUpdated`** (Serveur ➔ Salon) : Diffuse à tout le monde la liste des joueurs connectés pour mettre à jour l'écran d'attente.

### 3. Démarrage du jeu
* **`startGame`** (Manager ➔ Serveur) : Le manager clique sur "Lancer la partie".
* **`gameStarted`** (Serveur ➔ Salon) :
  * Les **joueurs** reçoivent leur groupe assigné, leur palette de couleurs, le thème et le chrono. En mode **coopératif**, le champ `managerPlayerId` est inclus pour permettre au front d'identifier et de mettre en avant le manager parmi les coéquipiers (couronne + pseudo doré).
  * Le **manager** reçoit le tableau de bord (lobby de supervision) avec les miniatures des grilles.

### 4. Phase de dessin et chat (En temps réel)
* **`markFinished`** (Joueur ➔ Serveur) : Compétitif — le joueur signale qu'il a terminé sa grille. Ack `{ ok, finishedCount, totalCount }`.
* **`groupFinishProgress`** (Serveur ➔ Équipe) : Mise à jour du compteur « X/Y » dans le groupe.
* **`groupFinished`** (Serveur ➔ Membres du groupe) : Tout le groupe a cliqué — redirection lobby joueur.
* **`lobbyGroupsUpdated`** (Serveur ➔ Salon) : Liste des grilles encore actives (grilles terminées retirées).
* **`pixelPlaced`** (Joueur ➔ Serveur) : Un joueur pose un pixel sur sa grille.
* **`drawPixel`** (Serveur ➔ Équipe) : Le serveur répercute le pixel uniquement aux membres de cette équipe.
* **`groupPreviewUpdated`** (Serveur ➔ Manager) : Le serveur envoie l'image mise à jour à l'écran de contrôle du manager.
* **`sendMessage`** (Joueur ➔ Serveur) / **`receiveMessage`** (Serveur ➔ Équipe) : Gèrent le chat interne de l'équipe.
* **`gridState`** (Serveur ➔ Client) : État initial du canvas ; inclut `groupVisitors` (spectateurs présents dans la room : manager, joueurs ayant fini ailleurs).
* **`groupVisitorsUpdated`** (Serveur ➔ Équipe) : Liste à jour des spectateurs quand l'un rejoint ou quitte la discussion du groupe.
* **`chatTyping`** (Joueur ➔ Serveur) / **`playerTyping`** (Serveur ➔ Équipe) : Indicateur « en train d'écrire » dans le chat de groupe.

### 5. Fin d'une manche (Session)
* **`sessionEnded`** (Serveur ➔ Salon) : Le temps est écoulé, le manager clique sur « Terminer la session », ou **toutes les grilles compétitives sont terminées**. Le serveur bloque le dessin et redirige tout le monde vers la salle d'attente.

### 6. Phase de vote (Compétitif uniquement)
* **`castVote`** (Joueur ➔ Serveur) : Un joueur vote pour le dessin d'un groupe.
* **`voteStateUpdated`** (Serveur ➔ Salon) : Diffuse en temps réel les jauges de votes.
* **`closeVote`** (Manager ➔ Serveur) : Le manager clôture les votes, le serveur calcule et diffuse le vainqueur de la manche.

### 7. Fin de la partie et podiums
* **`showResults`** (Manager ➔ Serveur) : Affiche le podium des meilleurs dessinateurs et le classement des plus beaux dessins.
* **`endParty`** (Manager ➔ Serveur) : Le manager ferme définitivement la session.
* **`roomClosed`** (Serveur ➔ Salon) : Ferme le salon pour tout le monde, déconnecte les clients et libère la mémoire.

---

## 💡 Conseils pour le Junior reprenant le code

1. **Pas de persistence** : N'essaie pas de chercher de base de données SQL ou Mongo, tout est dans `activeEvents` dans [eventStore.js](file:///h:/Taches/Programmation/PixelTogether/backend/store/eventStore.js). Si tu as besoin d'ajouter un attribut persistant à un salon ou un joueur, rajoute-le à la création de l'objet dans `newGrid` ([lobby.handlers.js](file:///h:/Taches/Programmation/PixelTogether/backend/sockets/handlers/lobby.handlers.js)) ou `registerPlayer` ([waitingRoom.handlers.js](file:///h:/Taches/Programmation/PixelTogether/backend/sockets/handlers/waitingRoom.handlers.js)).
2. **Le sac de dépendances (`deps`)** : Dans `createServer()`, toutes les dépendances métier importantes (`io`, `store`, `constants`, `participants`, `lifecycle`...) sont regroupées dans un objet `deps` injecté dans les écouteurs de sockets. Cela évite les dépendances cycliques (imports infinis) entre les fichiers de handlers et les services. Pense à l'utiliser si tu ajoutes un nouveau handler !
3. **Throttling (Limitation de fréquence)** : Pour éviter que le serveur ne sature si un joueur clique 100 fois par seconde ou envoie un script pour spammer le canvas, utilise `isRateLimited(socket, 'nomAction', délaiMs)` de [socketGuards.js](file:///h:/Taches/Programmation/PixelTogether/backend/sockets/handlers/socketGuards.js).
