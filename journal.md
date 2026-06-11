# 📓 Journal de bord — PixelTogether

**Rôle** : mémoire de ce qui est **fait** — résumés de phase, pas le détail ticket par ticket.

| Fichier | Rôle |
|---------|------|
| `backlog.md` | Tâches en cours + idées futures |
| `journal.md` | Ce qu'on a **terminé** (résumés) |

> **Convention** : entrées du **plus récent au plus ancien**. Une entrée = **un jalon clôturé** (phase, feature ou ticket). Pas de détail ticket par ticket ici — le détail vit dans git / les PR. Quand une tâche est résolue : retirée de `backlog.md` (section Tâches en cours) + **une ligne** ajoutée ici.

---

## Entrées

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
