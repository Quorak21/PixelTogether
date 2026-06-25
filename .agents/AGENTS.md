# Règles du Projet (PixelTogether)

Ces règles s'appliquent à tous les agents travaillant sur cette base de code.

## 🎯 Cap Produit

Outil de **teambuilding B2B éphémère par session** :
- Le manager configure une partie (nombre de sessions, thèmes, durée).
- Les joueurs s'inscrivent et sont répartis en **groupes de 3 à 4 joueurs**.
- Chaque membre d'un groupe reçoit une **palette de couleurs exclusive** (collaboration forcée pour remplir la grille 75x75).
- Phase de **vote** sur les grilles de la session précédente à chaque fin de session.
- **Export ZIP** des grilles finales par le manager.
- **Zéro base de données** : tout l'état est stocké **en mémoire** (RAM uniquement) sur le serveur Node et est purgé à la fin de la partie.

## 🔍 Où Chercher (Structure du projet)

| Sujet | Front (Angular 21) | Back (Node/Express) |
| :--- | :--- | :--- |
| **Waiting / vote / sessions** | `features/waiting/` | `sockets/handlers/waitingRoom/` |
| **Jeu / canvas** | `features/game/` | `handlers/game.handlers.js` |
| **Lobby / landing** | `features/lobby/`, `landing/` | `handlers/lobby.handlers.js` |
| **Contrats socket** | `types/socket-payloads.ts`, `entities.ts` | handlers + `services/event/payloads.js` |
| **État / constantes** | `core/services/socket.service.ts` | `store/eventStore.js`, `config/constants.js` |

## 🛠️ Stack Technique & Tests

- **Frontend** : Angular 21 (Signals, standalone components, `OnPush`, `inject`, `@if`/`@for`) + Tailwind CSS 4.
- **Backend** : Node.js / Express + Socket.io.
- **Tests** :
  - Couverture unitaire et d'intégration avec `Vitest` (frontend) et `node:test` (backend).
  - Lancer les tests avec `npm run test` dans chaque dossier respectif.
  - **IMPORTANT** : Ne pas ajouter de tests sans accord. Proposer d'abord en expliquant concrètement ce qu'ils couvriraient et pourquoi ça en vaut la peine. Pas de tests triviaux ou de couverture juste pour la couverture.

## 📝 Règles de Documentation et de Commentaires

1. **Mise à jour du README du Backend** :
   À chaque modification structurelle (changement de modèle de données, nouveaux endpoints, modification d'événements Socket.io, nouveau fichier), mets impérativement à jour le fichier de documentation technique [backend/README.md](file:///C:/Users/chju/Desktop/PixelTogether/backend/README.md) pour qu'il reste à jour.

2. **Commentaires des fonctions** :
   - Toute nouvelle fonction ou logique non évidente doit être commentée de manière claire et détaillée.
   - Si tu modifies une fonction existante, mets à jour ses commentaires pour refléter fidèlement les modifications apportées.
   - **Style et Ton** : Les commentaires doivent être rédigés en **français**, sur un ton **humain, simple et naturel**, à la portée d'un développeur junior reprenant le code.

## ⚙️ Conventions de Développement

- **Simplicité & Cohérence** : Évite absolument l'over-engineering. Réutiliser l'existant, faire des petits diffs, pas d'abstraction « au cas où ». Le code doit être simple, cohérent et lisible.
- **Styles Frontend** : Classes Tailwind CSS uniquement dans les templates HTML. Pas de `styleUrl` ou de CSS par composant. L'unique point d'entrée pour la personnalisation est [frontend/src/styles.css](file:///C:/Users/chju/Desktop/PixelTogether/frontend/src/styles.css) (qui contient le point d'entrée Tailwind `@theme` avec la palette Nord).
- **Socket** : Tout changement d'event ou payload doit être synchronisé avec `socket-payloads.ts` côté front.
- **Périmètre** : Modifier uniquement ce qui est nécessaire. Pas de refactor ou de fichier bonus hors demande. Pour toute nouvelle dépendance npm, demander avant et justifier en une phrase.

## 🔒 Sécurité

- Jamais de secret, token ou contenu `.env` dans le code, les commits ou le chat.
- URLs API : Utiliser `runtime-config.ts` / `environment.ts` — pas d'URL en dur dans les composants.

## 🎨 UI

- Textes utilisateur en français, ton direct et pro (B2B teambuilding).
- **Desktop uniquement** : l'application est conçue pour desktop. Le mobile affiche déjà un écran d'erreur (`app.ts`). Pas de travail responsive mobile.

## 📅 Suivi de projet & Backlog

- **Backlog** : [backlog.md](file:///C:/Users/chju/Desktop/PixelTogether/backlog.md) sert à stocker les dettes, bugs et features futures (ADD / FF). Si un souci ou une dette mérite d'être tracé, ajouter un ticket dans la section adaptée.
- **Journal de bord** : [journal.md](file:///C:/Users/chju/Desktop/PixelTogether/journal.md) trace les jalons terminés dans l'ordre chronologique inverse (une ligne par tâche résolue). Ne recycle JAMAIS un ID de ticket existant.
- Lorsqu'un ticket est résolu : le retirer de `backlog.md` et ajouter une ligne dans `journal.md`.

## 🚀 Efficacité & Fin de tâche

- **Efficacité** : Lire 2–4 fichiers du périmètre avant d'explorer ailleurs. Préférer modifier l'existant plutôt que de créer un nouveau fichier.
- **Fin de tâche** : Résumer les fichiers touchés, expliquer comment tester manuellement, et alerter si un contrat socket a été modifié.
