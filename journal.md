# 📓 Journal de bord — PixelTogether

**Rôle** : mémoire de ce qui est **fait** — résumés de phase, pas le détail ticket par ticket.

| Fichier | Rôle |
|---------|------|
| `backlog.md` | Tâches en cours + idées futures |
| `journal.md` | Ce qu'on a **terminé** (résumés) |

> **Convention** : entrées du **plus récent au plus ancien**. Une entrée = **un jalon clôturé** (phase, feature ou ticket). Pas de détail ticket par ticket ici — le détail vit dans git / les PR. Quand une tâche est résolue : retirée de `backlog.md` (section Tâches en cours) + **une ligne** ajoutée ici.

---

## Entrées

- **ADD-39** — **Chrono navbar coloré** : badge chrono dans la navbar visible en mode jeu uniquement, avec changement de couleur progressif selon le temps restant — violet/indigo en normal (> 5 min), ambre en avertissement (1–5 min), rouge/coral en urgence (< 1 min). Rafraîchissement chaque seconde via signal `now` + `setInterval` nettoyé dans `DestroyRef`.

- **ADD-38** — **Annonces chat présence** : annonce système dans le chat des sous-parties à l'arrivée et au départ du manager spectateur (avec pseudo stylisé, couronne et couleur) ; isolation de l'historique de chat pour que le manager spectateur ne voie pas les messages précédents mais uniquement les nouveaux pendant qu'il est présent.

- **CONFIG-01** — **Nettoyage agents** : suppression subagents Odin/Alex/Steve/Picasso, rules `.cursor/rules/`, `.agents/AGENTS.md` (OpenHands) ; `.cursorrules` unique comme source de vérité Cursor.

- **ADD-36** — **Égalité sur les votes** : en cas d'égalité au 1er tour, phase `tieBreak` — grilles ex æquo visibles pour tous, seul le manager tranche (1 clic), sans impact sur le podium individuel.

- **AUDIT-30** — **Flush previews à la clôture** : `flushAllEventPreviews` appelé dans `closeEvent` avant `getEventGroupImages`.

- **AUDIT-29** — **CI tests avant déploiement** : workflow unifié `ci.yml` (backend `node:test` + frontend Vitest sur push/PR) ; gate `needs` avant build/push Docker Hub ; suppression de `docker-build.yml`.

- **AUDIT-22** — **Plafond 40 joueurs par salon** : `EVENT_PLAYERS_MAX` back/front ; blocage `registerPlayer` et nouvel `enterWaitingRoom` ; message rouge en waiting room quand la salle est pleine.

- **AUDIT-20** — **Double-start startGame** : claim synchrone `status`/`partyStarted` dans `session.handlers.js` avant effets de bord ; test double appel `startGame` (2e ack rejeté, un seul shuffle).

- **ADD-02** — **Polish podium final** : refonte visuelle complète de la phase podium (dessins et joueurs) sous forme de colonnes physiques fixes de trois rangs avec badges or/argent/bronze ; transmission et affichage de la liste des joueurs contributeurs avec pastilles colorées lors du zoom sur un dessin (du podium ou de la galerie).

- **ADD-08** — **Chat Global WR** : chat partie sur WR (toutes phases) via `chatbox` existant (`scope: 'party'`, titre Global) ; handlers `sendMessage`/`getChatMessages` étendus ; reset à `finishCurrentSession` et `openResults` ; sidebar WR.

- **ADD-12** — **Grille décorative waiting room** : abandonné — ratio complexité/utilité trop faible pour une attente courte ; ADD-33 (fond décoratif) + chat WR (ADD-08) suffisent.

- **ADD-33** — **Background landing pixels** : canvas overlay `GridPixelSplashComponent` (~3 % de cellules colorées aléatoirement sur la grille CSS 20×20) en fond de landing et waiting room ; nouveau tirage à chaque visite.

- **AUDIT-16** — **Découpage Waiting Room en 3 phases** : `WaitingRoomComponent`, `TransitionRoomComponent`, `FinalRoomComponent` (présentationnels input/output) ; orchestrateur `WaitingRoomPageComponent` garde sockets et état ; `resolveWrPhase` + tests ; backend handlers découpés par phase (`waitingRoom/`) et `getWrMode` / `resolveReconnectPhase` unifiés dans `wrPhase.js`.

- **AUDIT-13** — **Broadcast roomClosed global** : `closeEvent` cible désormais la room Socket.io de la partie via `io.to(eventId).emit('roomClosed')` au lieu d'un broadcast global. Test unitaire `lifecycle.test.js`.

- **AUDIT-19** — **Resync applicative après reconnexion socket** : Au `connect` post-coupure, `ReconnectService` rappelle `reconnectSession` (token conservé si erreur réseau transitoire), resync in-place sur game/room/lobby via handlers enregistrés, `joinGroup` pour manager spectateur, navigation si phase changée ou `PARTY_GONE`. 6 tests, 38 tests verts au total.

- **AUDIT-12** — **Frontend gestion connect_error** : Signal `connectionStatus` (`connecting` / `reconnecting` / `connected`) et `connectionMessage` dans `SocketService` avec écoute de `connect_error`, `disconnect` et `connect`. Bannière globale non bloquante dans `app.html`. 7 tests unitaires, 32 tests verts au total.

- **AUDIT-11** — **Frontend signal hasActiveSession non réactif** : Ajout d'un signal `_hasValidSession` dans `SessionTokenService` mis à jour dans `save()`/`clear()`, exposé en readonly `hasSessionSignal`. Remplacement du `computed` cassé dans `landing-page.ts`. 3 nouveaux tests, 25 tests verts au total.

- **AUDIT-10** — **Route guards Angular** : `sessionGuard` sur `/lobby` et `/game` (session valide + match `eventId`/`groupCode`, manager spectateur exempté du match `groupCode`). `roomGuard` sur `/room` (join sans session autorisé ; si session, match `roomId`). Comparaisons normalisées en uppercase. 8 tests Vitest. Constructeurs simplifiés dans WR, lobby et game.

- **AUDIT-09** — **Frontend emitWithAck sans timeout** : Ajout d'un timeout de 10s avec reject dans `SocketService.emitWithAck()`. Wrapper des 11 appels frontend dans des `try/catch` avec message d'erreur générique et reset des signaux bloquants. Tous les tests passent.

- **AUDIT-08** — **Validation types/longueurs backend** : Mise en place d'un middleware global (`socket.use` dans `register.js`) qui intercepte et rejette (avec une réponse d'erreur le cas échéant) tout paquet Socket.io dont le payload principal n'est pas un objet non nul. Séparation des expressions régulières pour les pseudos et les thèmes dans `constants.js` : la longueur maximale des pseudos a été ramenée à 20 caractères tandis que celle des thèmes a été maintenue à 30. Mise à jour de la validation et des messages d'erreur dans `waitingRoom.handlers.js`. Côté frontend, limitation de la longueur du pseudo à 20 caractères dans les validateurs de `onboarding-modal.ts` et dans l'attribut HTML `maxlength` de `onboarding-modal.html`. Création de tests d'intégration complets dans `validation.test.js`.

- **AUDIT-07** — **Auth Chat & messages** : Ajout de vérifications de sécurité dans les écouteurs d'événements socket `sendMessage` et `getChatMessages` (dans `game.handlers.js`). Le serveur vérifie désormais que le socket appartient au groupe ciblé ou est le manager de la partie avant d'autoriser l'envoi ou la récupération des messages de chat. Création de tests unitaires complets validant les autorisations pour les membres, les managers et le rejet pour les intrus dans `chat.test.js`.

- **AUDIT-06** — **DoS Chat messages illimités** : Configuration de la constante `CHAT_MAX_MESSAGES` à `750` dans `constants.js` pour limiter le stockage mémoire des messages. Mise en place d'une logique de buffer circulaire dans le gestionnaire socket `sendMessage` (dans `game.handlers.js`) pour supprimer automatiquement le plus ancien message du groupe en mémoire (via `.shift()`) lorsque la limite est franchie. Création de tests unitaires dédiés dans `chat.test.js`.

- **AUDIT-05** — **DoS Canvas / Preview CPU** : Mise en place d'un système de throttle de 1000 ms (configurable via `PREVIEW_THROTTLE_MS` dans `constants.js`) sur la mise à jour et la diffusion de la preview PNG de grille de dessin de chaque groupe. Ajout d'une fonction `flushAllEventPreviews` dans `preview.js` appelée au terme de chaque session (dans `finishCurrentSession`) pour s'assurer que les snapshots d'archive ou de vote incluent tous les pixels dessinés sans omission. Création de tests unitaires complets dans `preview.test.js`.

- **AUDIT-04** — **Token coop NaN expiry** : Ajout d'un fallback à `MAX_PARTY_DURATION_MINUTES * 2` lorsque `sessionDurationMinutes` vaut `null` (mode coopératif) lors du calcul d'expiration du token de reconnexion dans `computeExpiresAt`, évitant ainsi un TTL infini (`NaN`) et l'accumulation mémoire des jetons ; tests unitaires ajoutés et validés.

- **AUDIT-03** — **Shuffle de groupes biaisé** : `shuffleArray` dans `groupShuffle.js` remplacé par Fisher-Yates sur une copie du tableau (plus de `sort(() => Math.random() - 0.5)` ni de mutation de l'original) ; tests `groupShuffle` verts.

- **AUDIT-02** — **Bug reconnexion manager** : Restreint l'appel à `clearManagerDisconnectTimer` aux seules sessions ayant le rôle `'manager'` lors d'une reconnexion ou de l'entrée dans la salle d'attente (dans `reconnect.handlers.js`), évitant ainsi l'annulation erronée du minuteur d'absence du manager par les joueurs.

- **AUDIT-01** — **Fuite mémoire events abandonnés** : Ajout d'un cap maximal de salons de jeu actifs (50), d'un horodatage de dernière activité sur les salons mis à jour à chaque interaction (création, action socket via middleware, reconnexion), et d'un sweep périodique d'arrière-plan (toutes les 5 minutes) fermant proprement les salons inactifs depuis plus de 2 heures. Côté frontend, désactivation des boutons de création de partie avec affichage d'une bannière d'information si la capacité maximale est atteinte.

- **TEST-01** — **Mise en place du process de tests (Phase 1)** : Configuration de `node:test` sur le backend et de `Vitest` sur le frontend. Ajout de tests unitaires couvrant la logique d'attribution des groupes, le découpage de la palette de couleurs, les règles de validation des modes de jeu, la gestion des sessions/tokens de reconnexion, et l'état réactif de l'UI (signaux et warnings).

- **ARCH-03** — **Simplification du routing** : routes plates dans `app.routes.ts` pour `/` et `/lobby/:eventId`, suppression de `landing.routes.ts` et `lobby.routes.ts` (lazy-load uniquement sur la page jeu `game`).

- **PERF-03** — **Export image correct** : encodage PNG explicite pour les aperçus de grille (fond blanc).

- **PERF-04** — **Transition vers /game** : preload `game.routes` (landing, lobby, modale création) ; signal `gameCanvasLoading` + overlay spinner ; `renderGrid` en rAF.

- **BACK-04** — **Rate-limit events socket** : `isRateLimited` dans `socketGuards.js` ; cooldowns 50/500/300 ms sur `pixelPlaced`, `sendMessage`, `castVote` (ack noop sur vote).

- **BACK-02** — **Validation entrées socket (ACK guards)** : helper `socketGuards.js` (`guardAck`/`ack`) ; protection callback sur `newGrid`, `registerPlayer`/`startGame` et handlers vote — plus de crash si ACK absent.

- **ADD-35** — **Pseudo navbar waiting room** : avatar + pseudo du joueur en haut à droite en salle d'attente (manager et joueurs enregistrés).

- **MODE-01** — **Modes coop / compétitif (backend)** : `gameMode` + `managerParticipates` sur l'event ; lifecycle coop (groupe unique, pas de timer/vote) ; garde-fous joueurs par mode.
- **MODE-02** — **Fin de session coop** : `sessionResult` + `gallery` (sans vote ni podium) ; manager enchaîne ou `endParty`.
- **MODE-03** — **Manager joueur en coop** : toggle à la création ; palette + pixels si participation ; spectateur sinon.
- **MODE-04** — **Garde-fous démarrage** : validation start/register par mode (coop 2–7/8 invités, compétitif min 6).
- **MODE-05** — **Landing & création** : cartes Coop/Compétitif + rejoindre ; modale adaptée ; compteur joueurs WR manager.

- **AUTH-03** — **Reconnexion session par token (v2)** : `playerId` UUID stable + token opaque en `localStorage` (`pxl-session`), event `reconnectSession`, remap socket à la reconnexion ; landing auto-resume ; garde-fous une partie/navigateur et fermeture si manager absent 5 min (`managerAbsent`).

- **UI-GROUP-NAV** — **Coéquipiers dans la navbar** : affichage des autres membres du groupe (avatar + pseudo) à côté du joueur courant en mode jeu ; données `teammates` persistées via `UiStateService` (`gameStarted` + `gridState`).

- **AUTH-ROLLBACK** — **Abandon reprise session / JWT** : retour au modèle classique `socket.id` (pas de handshake auth, pas de `localStorage`/`sessionStorage`, pas d'overlay reconnexion). Tentatives AUTH-01 / AUTH-02 / FRONT-04 retirées du code ; chantier repris plus tard sous **AUTH-03** (`backlog.md`).
- **FRONT-04** — **Perte de connexion en pleine partie** : soft-disconnect (joueur reste dans la partie), overlay global, rejoin socket via `resumeSession`, blocage canvas/chat hors ligne. *(Abandonné avec AUTH-ROLLBACK — à refaire dans AUTH-03.)*

- **SEC-02** — Actions manager par identité stable : `managerId` + `assertIsManager` sur start/close/vote/endSession ; plus de garde via `socket.id`.
- **AUTH-01** — JWT éphémère (exp calée sur config partie), `JWT_SECRET` en env, `revokedEvents` à la clôture, un seul event manager actif, token en `sessionStorage`.

**GAME-UI-01** — Refonte layout du jeu & contrastes :
- Le fond autour du canvas blanc a été éclairci (`bg-slate-200`) pour éliminer le contraste trop agressif.
- Le timer de session a été retiré de la navbar pour être positionné en haut à gauche de la zone de dessin pour la grid (et dans le titre de supervision pour le lobby manager).
- La barre de chat va désormais jusqu'en bas de la fenêtre, alignant sa boîte de saisie avec la barre des couleurs.
- Le thème de la session est mis en valeur avec un badge dégradé premium.
- Tous les participants du groupe (pseudos et avatars) sont maintenant affichés dans la navbar en cours de partie.

**LOBBY-01** — Refonte lobby manager : adaptation de la page supervision au thème glassmorphism dark (en-tête, vignette avec prévisualisations, modale de confirmation). Les avatars des joueurs dans les vignettes de sous-parties s'adaptent désormais dynamiquement à leur effectif (3 joueurs alignés, ou 4 joueurs en 2x2).

**WR-02** — Bouton de démarrage vert : le bouton de démarrage du manager dans la salle d'attente passe désormais au vert sobre (success theme token) lorsqu'il y a assez de joueurs pour démarrer la partie (minimum 2 joueurs).

**WR-UI-01** — Refonte waiting room glass dark : panneau central (titre dégradé, grille joueurs, statut, CTA manager, stats), tous les modes WR harmonisés, modales dark glass ; navbar WR épurée (logo seul, pas avatar/pseudo ni nom de partie).

**UI-01** — Styling Tailwind seul : palette Nord via `@theme`, classes composant migrées en utilitaires.

**MVP team building** — Cycle complet livré : waiting room → sessions multi-thèmes → gameplay groupes → vote inter-sessions → podium → fin de partie. État 100 % en mémoire. Dettes et idées post-MVP → `backlog.md`.

**Phase 6 — Vote inter-sessions** — Après chaque session : retour WR, vote sur les grilles de la session précédente (modifiable, 1 voix par participant). Clôture → gagnant affiché → session suivante ou, au dernier vote, podium top 3 joueurs / top 3 œuvres puis `endParty` (purge). État : `sessionArchive`, `activeVote`, `playerVoteTotals`, `showingResults`. Socket : `castVote`, `closeVote`, `showResults`, `endParty`, `voteStateUpdated`. Hors scope : export ZIP, polish podium (→ idées futures).

**Phase 5 — Multi-sessions** — Création : nb sessions (max 5), thème par session, durée totale affichée (`sessions × durée ≤ 60 min`). Event : `themes[]`, `sessionCount`, `currentSession`, `partyStarted` (roster figé après 1er `startGame`, min 2 joueurs uniquement au départ). Cycle : WR → session → WR → … ; `finishCurrentSession` (timer + `endSession`) ; dernière session → `closeEvent`. Lobby : Arrêter la session / Terminer la partie. WR reprise : lancement direct session N+1 sans modale. UI Session N/M + thème (WR, lobby, navbar). Hors scope : vote (→ P6), reconnexion (→ FRONT-01).

**Phase 4 — Timer de session** — Durée configurable à la création (1–60 min, défaut 15) via `sessionDurationMinutes`. Timer serveur (`sessionEndsAt` + `setTimeout`) au `startGame`, avec marge transition (`SESSION_TRANSITION_SECONDS` / `GROUP_TRANSITION_SECONDS`, 5 s). Chrono `MM:SS` navbar pour manager et joueurs. Fin timer ou bouton manager **Terminer la partie** → `closeEvent` / `roomClosed` (fermeture complète, pas de retour waiting room). `endSession` conservé côté back pour la phase 5.

**P3-04** — Pool **16 couleurs** par groupe (`GAME_PALETTE_16`), split exclusif 8/8 · 6-5-5 · 4×4 via `colorSplit` + `beginSession` / `dissolveSessionGroups`. Palettes sur modale transition (swatches par joueur) ; `gridState` et `pixelPlaced` scopés par joueur. Cycle session (brique 1) : manager **Arrêter la session** depuis le lobby → `sessionEnded` → waiting room, roster conservé. Hooks prêts pour P3-07. Hors scope : vote, session N+1 auto, UI refonte (→ P3-UI-01).

**BACK-03 / BACK-REFACTOR** — Découpage de `backend/index.js` (~777 lignes → bootstrap ~8 lignes) : `config/constants.js`, `store/eventStore.js`, `lib/` (participants, payloads, preview, lifecycle), handlers Socket par domaine (`lobby`, `waitingRoom`, `game`, `lifecycle`), `app/createServer.js`. Contrat Socket inchangé.

**Phase 3 — Boucle gameplay (slice 1)** — Event + groupes en mémoire (`activeEvents`), shuffle équilibré (2–4 joueurs, priorité groupes de 4) au `startGame`, une grille 75×75 par groupe. Routes `/game/:eventId/:groupCode`, `/lobby/:eventId` (lobby existant adapté). Création : **nom de partie** + **thème** ; waiting room affiche le nom. Modales transition 5 s (joueur : équipe + « Groupe N » ; manager : récap puis lobby). Lobby manager : titre = nom de partie, sous-titre thème + Session 1/1, cards « Groupe N » + previews live. Jeu : spectateur manager (chat, pas pixel/palette, retour lobby), navbar = nom de partie, chat et palette contextualisés (groupe / thème). Fermeture event → landing (`/`). Hors scope : multi-session, vote, pool 20 couleurs, barre joueurs, `sessionCount` configurable.

**Phase 2 — Waiting room** — Salle d'attente `/room/:id` entre landing et jeu : onboarding pseudo + couleur avatar (`AVATAR_COLORS`, placeholder Lucide `User`), cards joueurs temps réel, modales manager (inviter avec code stream + URL, démarrer min. 2 joueurs). Serveur : `status` waiting/started, `registerPlayer`, `startGame`, verrou `joinRoom`. Navbar : profil avatar + pseudo ; chat par pseudo. Hors scope : F5/reconnexion, chat waiting room, grille d'attente.

**Phase 1 — Base gameplay fonctionnelle** — Socle jouable : landing manager, création de partie (code 6 car.), join par code, grille 75×75 collaborative, pixels temps réel, chat, palette, lobby. P1-06 (constantes socket) abandonné : strings littérales conservées.

**P1-05** — Refonte game page : thème en navbar, layout fixe (chat à droite, palette en bas), palette sans gomme avec blanc posable, zoom molette + déplacement clic droit, fit initial de la grille.

**Démolition (DEMO-01 → 06)** — Héritage retiré (Mongo, auth, galerie, économie, gamification). Base remise à plat : lobby, pixels temps réel, `socket.id`.

**Pivot produit** — Fin du jeu communautaire persistant → outil B2B éphémère par session (manager, groupes, vote, export ZIP). Zéro BDD, état en mémoire.
