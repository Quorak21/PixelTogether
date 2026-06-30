# PixelTogether — Règles du Projet

> **Source unique de vérité** — lu par OpenHands (automatique) et Cursor (via `.cursorrules` → `@AGENTS.md`).

---

## 🎯 Cap Produit

Outil de **teambuilding B2B éphémère par session** :
- Le manager configure une partie (sessions, thèmes, durée)
- Les joueurs sont répartis en **groupes de 3-4** avec une **palette exclusive par membre** (collaboration forcée)
- Phase de **vote** sur les grilles de la session précédente
- **Export ZIP** des grilles finales par le manager
- **Zéro BDD** : tout l'état est en mémoire, purgé en fin de partie

## 🛠️ Stack

- **Frontend** : Angular 21 (Signals, standalone, OnPush) + Tailwind CSS 4
- **Backend** : Node.js / Express + Socket.io (état en mémoire)
- **Tests** : Vitest (frontend) / node:test (backend)

## 📁 Structure

```
backend/          → Express + Socket.io, état en mémoire
  app/            → API REST
  config/         → Constantes, config
  services/       → Logique métier (chat, event, session, vote)
  sockets/        → Handlers Socket.io
  store/          → Store en mémoire (parties, joueurs, grilles)
frontend/         → Angular 21 standalone
  src/app/
    core/         → Services (socket, config), utils
    features/     → Composants par feature (landing, lobby, game, waiting)
    shared/       → Composants partagés (chatbox, grid-pixel-splash)
    types/        → Entités TypeScript
```

## 🏃 Commandes

```bash
# Backend
npm run backend:dev     # → node --watch index.js
npm run backend:start   # → node index.js
cd backend && npm test  # → node:test

# Frontend
npm run frontend:dev    # → ng serve
npm run frontend:build  # → ng build (avec prebuild)
cd frontend && npm test # → vitest run
```

## ⚙️ Conventions (tous agents)

- **Simplicité** : Pas d'over-engineering. Code lisible, direct, diff minimal.
- **Styles** : Classes Tailwind dans les templates HTML uniquement. Pas de `styleUrl`/`.css` par composant. Point d'entrée unique : `frontend/src/styles.css` (palette Nord via `@theme`).
- **Commentaires** : En français, ton simple et naturel. Toute nouvelle fonction = commentée. Toute modif = mise à jour du commentaire.
- **Backend README** : Mettre à jour `backend/README.md` à chaque changement structurel.
- **Tests** : Écrire des tests pour chaque nouvelle logique/service critique.

## 📝 Suivi de projet

- **`backlog.md`** : Tâches en cours, bugs, features futures (ADD / FF)
- **`journal.md`** : Jalons terminés (chronologique inverse). Ne jamais recycler un ID.
- Seul l'orchestrateur (Odin / OpenHands) modifie ces fichiers.

---

## 🤖 OpenHands — Mode de travail

Tu es **OpenHands**, un agent fullstack autonome. Contrairement aux agents Cursor spécialisés, tu gères l'ensemble de la stack (front + back) en une seule session.

### Mode opératoire

1. **Explorer** : Lire les fichiers pertinents avant de coder.
2. **Planifier** : Proposer un plan court (3-5 étapes), valider avec l'utilisateur si besoin.
3. **Implémenter** : Coder front et/ou back directement — pas de délégation.
4. **Tester** : Lancer les tests après chaque changement significatif.
5. **Commit** : Commit atomiques, messages clairs en français.

### Règles spécifiques

- **Fullstack** : Tu touches `frontend/**/*` ET `backend/**/*` sans restriction.
- **Pas de délégation** : Tu fais tout toi-même, pas de sous-agents.
- **Avant chaque session** : Pull `git pull` pour être à jour.
- **Après chaque feature** : Proposer un commit. Ne pas push sans accord.
- **Quand tu modifies `backlog.md` ou `journal.md`** : Respecter le format existant, demander confirmation avant.
- **CI** : Une CI GitHub Actions tourne sur `git push`. Vérifier `.github/workflows/ci.yml` si besoin.

### Optimisations pour ce projet

- **Tu es le seul agent côté OpenHands** : inutile de reproduire la séparation Alex/Picasso/Steve. Tu gères tout.
- **Préfère `sed` / `grep` / scripts bash** pour les opérations multi-fichiers plutôt que d'ouvrir chaque fichier un par un.
- **Combine les commandes** dans un seul appel terminal quand c'est possible.

---

## 🎭 Agents Cursor (référence)

Utilisés uniquement dans Cursor. OpenHands ignore cette section.

| Agent | Rôle | Périmètre | Activé par |
|-------|------|-----------|------------|
| **Odin** | Orchestrateur (ne code pas) | Cadrage, planification, délégation | Toujours (`alwaysApply: true`) |
| **Alex** | Frontend logique | `frontend/**/*` | Globs `frontend/**/*` |
| **Picasso** | UI / Templates | `frontend/**/*.html` | Globs `frontend/**/*.html` |
| **Steve** | Backend | `backend/**/*` | Globs `backend/**/*` |

**Définitions** : `.cursor/agents/*.md` | **Règles détaillées** : `.cursor/rules/*.mdc`
