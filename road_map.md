# PixelTogether — Roadmap

**Priorité actuelle** : finir la transition jeu casual → outil team building B2B — MVP jouable de bout en bout (timer, multi-sessions, vote).

| Fichier | Rôle |
|---------|------|
| `road_map.md` | Prochaines phases + idées futures (à transformer en phases) |
| `dette_technique.md` | Bugs et flows pourris, non bloquants pour l'instant |
| `journal.md` | Ce qui est terminé |

> Phase **clôturée** → résumé dans `journal.md`, retirée d'ici. Jamais de secrets en clair.

---

## PHASE 4 — Timer de session *(en cours)*

Le manager configure la **durée d'une session** (minutes, max 60) à la création. Le chrono démarre au `startGame`, s'affiche dans la navbar pour tous. Fin du timer → session terminée. Le manager peut aussi **terminer la partie** (fermeture event).

- **P4-01** — Formulaire création : input « Durée d'une session » (minutes, 1–60).
- **P4-02** — Timer serveur : `sessionEndsAt` au démarrage, fin auto → `endSession`.
- **P4-03** — Navbar chrono : affichage `MM:SS` pour tous en jeu.
- **P4-04** — Terminer la partie : action manager → `closeEvent`, redirection landing.

---

## PHASE 5 — Multi-sessions

Le manager choisit le **nombre de sessions** et un **thème par session** (formulaire dynamique). Contrainte : `sessions × durée ≤ 60 min`. Affichage « Durée de la partie : X minutes ». Cycle : waiting room → session N → vote → waiting room → session N+1…

- **P5-01** — Formulaire dynamique : nombre de sessions + N champs thème + validation durée totale.
- **P5-02** — Modèle Event : `themes[]`, `sessionDurationMinutes`, `sessionCount` ; thème courant = `themes[currentSession - 1]`.
- **P5-03** — Enchaînement : fin session → vote (P6) → `currentSession++`, reshuffle groupes, nouvelles couleurs, retour waiting room.
- **P5-04** — UI session : libellé « Session N/M » + thème courant (waiting room, lobby, navbar).

---

## PHASE 6 — Vote inter-sessions

Entre deux sessions (et après la dernière) : **modale plein écran** (fond flou) avec les grilles de chaque groupe. 1 vote/joueur (modifiable tant que le vote est ouvert). Vote manager = **×2**. Manager **Terminer le vote** → session suivante ; dernière session → **Terminer la partie** + écran résultats.

- **P6-01** — Galerie vote : modale avec previews grandes, sélection visuelle.
- **P6-02** — Logique vote : `castVote` / `changeVote`, poids host ×2.
- **P6-03** — Scoring : chaque vote → +1 point aux membres du groupe voté ; cumul sur toute la partie.
- **P6-04** — Clôture vote : `closeVote` (host) → session N+1 ou fin de partie.
- **P6-05** — Écran final : top 3 œuvres + top 3 joueurs (points), puis fermeture event.

---

## Futures features / idées

> Une ligne par idée — piocher ici pour ouvrir une phase plus tard.

- Chrono navbar : couleur qui change quand le temps baisse.
- Chat commun en waiting room (manager + joueurs attendent ensemble les derniers arrivants).
- Barre joueurs en jeu : membres du groupe + manager spectateur visible.
- Indicateur « en train d'écrire » sur la barre joueurs.
- Décompte 5…4…3…2…1 sur la modale de transition de groupe.
- Grille décorative en fond de waiting room.
- Statut « j'ai fini » (joueur a terminé sa contribution).
- Emojis d'émotion sur l'avatar.
- Constructeur d'avatar (peau, chapeau…) à la place du placeholder couleur.
- Avatar généré par IA.
- Refonte UI totale : hiérarchie visuelle, layout stable, identité cohérente sur tous les écrans.
- Passage Tailwind seul (retrait DaisyUI).
- Configuration avancée host : taille de grille, pool de couleurs 20–30.
- Export ZIP de toutes les grilles en fin de partie.
- Compte host + système de crédits (facturation simulée).
- Session JWT éphémère (~1 h) pour reconnexion fiable.
- Journal d'audit par partie (preuve de service B2B, persistance hors RAM).
- Mode marathon (sessions longues ou enchaînées sans limite 60 min).
