# PixelTogether

Teambuilding B2B éphémère par session :
- Le manager configure une partie (sessions, thèmes, durée)
- Joueurs en groupes de 3-4, palette exclusive par membre (collaboration forcée)
- Phase de vote sur les grilles de la session précédente ; export ZIP par le manager
- Zéro BDD : état en mémoire, purgé en fin de partie

**Stack** : Angular 21 (signals, standalone, OnPush) + Tailwind 4 · Node/Express + Socket.io (mémoire) · Vitest / node:test

**Suivi** : `backlog.md` (en cours + FF) · `journal.md` (terminé, une ligne)

`npm run frontend:dev` · `npm run backend:dev`

## Mono-repo

Travailler **un seul côté** (`frontend/` ou `backend/`) sauf demande fullstack explicite.
Info de l'autre côté (event socket, payload, constante) → sous-agent `explore` borné à cet arbre, réponse courte. Pas de délégation d'implémentation, pas d'exploration « au cas où ».

Conventions de code : `.cursor/rules/` (front / back / socket), attachées par glob.

Repères (lire 2–4 fichiers du sujet) :
- WR / vote : `frontend/src/app/features/waiting/` · `backend/sockets/handlers/waitingRoom/`
- Jeu : `frontend/src/app/features/game/` · `backend/sockets/handlers/game.handlers.js`
- Lobby / landing : `frontend/src/app/features/{lobby,landing}/` · `backend/sockets/handlers/lobby.handlers.js`
- Contrat socket : `frontend/src/app/types/socket-payloads.ts` · `backend/services/event/payloads.js`
- État : `frontend/src/app/core/services/` · `backend/store/eventStore.js` + `backend/config/constants.js`

## Règles

- Petits diffs, réutiliser l'existant, pas de fichier bonus. Nouvelle dep npm : demander.
- Commentaires code : français, niveau junior, uniquement le non-évident.
- Textes UI en français, ton pro. Desktop only (écran mobile déjà dans `app.ts`).
- Pas de secret / `.env` dans le code. Pas de commit/push sans demande.
- « Plus tard » → ticket `backlog.md`. Résolu → retirer + une ligne `journal.md`.
- Fin de tâche : fichiers touchés, comment tester à la main, alerte si contrat socket modifié.
