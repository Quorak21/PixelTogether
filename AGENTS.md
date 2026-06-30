# PixelTogether — Règles du Projet

> **Source unique de vérité** — lue par **Cursor** (via `.cursorrules` → `@AGENTS.md`, ~95 % du travail) et **Hermes** (via `.agents/AGENTS.md`, ~5 % depuis Discord).

---

## Cap produit

Outil de **teambuilding B2B éphémère par session** :
- Le manager configure une partie (sessions, thèmes, durée)
- Les joueurs sont répartis en **groupes de 3-4** avec une **palette exclusive par membre** (collaboration forcée)
- Phase de **vote** sur les grilles de la session précédente
- **Export ZIP** des grilles finales par le manager
- **Zéro BDD** : tout l'état est en mémoire, purgé en fin de partie

Suivi : `backlog.md` (en cours + idées FF), `journal.md` (terminé — une ligne par tâche résolue).

## Où chercher

| Sujet | Front | Back |
|-------|-------|------|
| Waiting / vote / sessions | `features/waiting/` | `sockets/handlers/waitingRoom/` |
| Jeu / canvas | `features/game/` | `handlers/game.handlers.js` |
| Lobby / landing | `features/lobby/`, `landing/` | `handlers/lobby.handlers.js` |
| Contrats socket | `types/socket-payloads.ts`, `entities.ts` | handlers + `services/event/payloads.js` |
| État / constantes | `core/services/socket.service.ts` | `store/eventStore.js`, `config/constants.js` |

## Stack

- **Frontend** : Angular 21 (Signals, standalone, OnPush) + Tailwind CSS 4
- **Backend** : Node.js / Express + Socket.io (état en mémoire)
- **Tests** : Vitest (frontend) / node:test (backend)

```bash
npm run backend:dev      # node --watch index.js
npm run backend:start    # node index.js
cd backend && npm test   # node:test

npm run frontend:dev     # ng serve
npm run frontend:build   # ng build (avec prebuild)
cd frontend && npm test  # vitest run
```

## Conventions code

- **Simplicité** : réutiliser l'existant, petits diffs, pas d'abstraction « au cas où ». Rester cohérent avec le style du fichier touché.
- **Bonnes pratiques** : suivre les patterns déjà en place (Angular signals, handlers fins, etc.).
- **Styles** : Tailwind dans les HTML seulement — pas de `styleUrl`, pas de `.css` composant. Thème Nord : `frontend/src/styles.css`.
- **Front** : `OnPush`, signals, `inject`, `@if`/`@for`. Composant = `.ts` + `.html`. Nouveau composant ou feature → MCP `get_best_practices`.
- **Back** : logique dans `services/`, handlers légers. Pas de BDD.
- **Socket** : changement d'event ou payload → sync `socket-payloads.ts` côté front.
- **Commentaires** : niveau dev junior — commenter les fonctions ou logiques non évidentes, en français, ton simple et naturel.
- **Backend README** : mettre à jour `backend/README.md` à chaque changement structurel.

## Sécurité

- Jamais de secret, token ou contenu `.env` dans le code, les commits ou le chat.
- URLs API : `runtime-config.ts` / `environment.ts` — pas d'URL en dur dans les composants.

## Périmètre

- Modifier uniquement ce qui est nécessaire. Pas de refactor ou fichier bonus hors demande.
- Nouvelle dépendance npm : demander avant, justifier en une phrase.

## UI

- Textes utilisateur en français, ton direct et pro (B2B teambuilding).
- **Desktop uniquement** — le mobile affiche déjà un écran d'erreur (`app.ts`). Pas de travail responsive mobile.

## Tests

Ne pas ajouter de tests sans accord. Proposer d'abord en expliquant concrètement ce qu'ils couvriraient et pourquoi ça vaut le coup — pas de tests triviaux ou de couverture pour la couverture.

## Backlog

- « Plus tard » / « on fera après » → ticket dans `backlog.md` (section adaptée).
- L'agent peut aussi y ajouter un ticket par initiative si un souci ou une dette mérite d'être tracé.
- Ticket résolu → retirer de `backlog.md` + une ligne dans `journal.md`.

## Efficacité

- Lire 2–4 fichiers du périmètre avant d'explorer ailleurs.
- Préférer modifier l'existant à créer un nouveau fichier.

## Fin de tâche

- Résumer : fichiers touchés, comment tester à la main, alerte si contrat socket modifié.
