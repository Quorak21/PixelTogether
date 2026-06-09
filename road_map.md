# PixelTogether — Roadmap

**Rôle** : **ta vision** du produit — phase en cours + backlog (features « plus tard »). Odin y ajoute aussi de manière autonome ce qu'on a évoqué sans l'implémenter tout de suite (ex. JWT session).

| Fichier | Rôle |
|---------|------|
| `road_map.md` | À faire / plus tard |
| `dette_technique.md` | Problèmes à corriger |
| `journal.md` | Phases terminées (résumé) |

> Phase **clôturée** → résumé dans `journal.md`, tickets retirés d'ici. Jamais de secrets en clair.

---

## Vision actuelle

Flux cible : **landing** → **waiting room** (`/room/:eventId`) → **shuffle par session** → **sous-parties** (`/game/:eventId/:groupCode`). Le **code 6 caractères** = identifiant de la **partie** (`Event`, thème global). Chaque **session** (manche) produit de **nouveaux groupes** et de **nouveaux codes sous-partie** (ex. `XYZ/1234`, `XYZ/5678` en session 1 ; `XYZ/4321`, `XYZ/8765` en session 2 après reshuffle).

### Hiérarchie produit

```
Event XYZ (code partie, thème, sessionCount = ex. 2)
├── Waiting room     — inscription joueurs (session 1 : tout le monde ici avant le 1er lancement)
├── Lobby host       — supervision : sous-games de la session en cours
└── Session[]        — manches 1…N
    ├── Session 1
    │   ├── Group → Grid  XYZ/1234  (joueurs shufflés A,B,C)
    │   └── Group → Grid  XYZ/5678  (joueurs shufflés D,E,F)
    ├── [fin session 1 → vote]
    └── Session 2      — nouveau shuffle, nouveaux groupId
        ├── Group → Grid  XYZ/4321
        └── Group → Grid  XYZ/8765
```

### Exemple de déroulé (2 sessions)

1. Manager **crée** la partie `XYZ` (thème + **nombre de sessions** = 2) → **lobby**.
2. Joueurs rejoignent `XYZ` → **waiting room**. Tout le monde est là.
3. Manager **lance session 1** depuis la waiting room → **shuffle** → manager **lobby** ; joueurs → `XYZ/1234`, `XYZ/5678`…
4. Fin de session 1 → **phase vote** (toutes les grilles de la session).
5. **Début session 2** → **nouveau shuffle** → manager **lobby** (nouvelles cards) ; joueurs → `XYZ/4321`, `XYZ/8765`…
6. Dernière session terminée + vote → **écran final** / export (backlog FLOW-02/03).

**Flux manager** : création (avec `sessionCount`) → lobby. Lancement **session N** depuis la **waiting room** (session 1) ou depuis le **lobby** (sessions suivantes, après vote — à préciser en implémentation). Après chaque lancement : lobby = liste des sous-games de la session active ; spectateur sur chaque grille.

**Flux joueur** : code `XYZ` → waiting room (session 1) → shuffle → `/game/XYZ/1234` + modale 5 s. Sessions suivantes : redirection directe vers la nouvelle grille assignée (pas de repassage waiting room sauf si déconnecté).

---

## PHASE 3 — GESTION DE LA PARTIE

> Event multi-sessions, groupes, palettes par joueur, supervision host, transition joueur.

### Partie 2 — Socle serveur *(prérequis technique)*

- **P3-00** — **Création event + sessions** : à la création, le manager saisit le **thème** et le **nombre de sessions** (ex. 2). Stockage `Event { id, name, sessionCount, currentSessionIndex, status }`. Pas encore de durée/timer par session (→ HOST-01).
- **P3-01** — **Modèle runtime en mémoire** *(ex-CORE-01)* : `Event` → `Session[]` → `Group[]` → `Grid` + `Player[]`. Identifiant sous-partie lisible : **`eventId/groupCode`** (ex. `XYZ/1234`, code groupe court unique **par session**). Socket rooms par groupe. Cycle de vie : création → waiting → sessions (playing → voting) → fermeture → **purge complète**. Seul le code **Event** est partagé aux joueurs pour rejoindre.
- **P3-02** — **Shuffle & dispatch** *(ex-GRP-01)* : à chaque **démarrage de session** (`startSession`), le serveur **remélange** tous les joueurs inscrits à l'event et les répartit en groupes de **2 à 4** (dernier ≥ 2). Une **grille 75×75 par groupe**, **nouveaux `groupCode`** à chaque session. Émission `sessionStarted` : chaque joueur reçoit `{ eventId, groupCode, colors, teammates }` ; le manager reçoit la liste des groupes pour le lobby.
- **P3-04** — **Pool de 20 couleurs, répartie par joueur** *(ex-GRP-02)* : tirage par **groupe** à chaque session, répartition exclusive (~10/5/4 selon effectif). Garde-fou serveur sur `pixelPlaced` (refus host + couleur hors palette joueur).

### Partie 1 — UX supervision & jeu multi-grilles *(scope actuel)*

- **P3-03** — **Modale de transition joueur (5 s)** : à l'arrivée sur `/game/:eventId/:groupCode`, grille **floutée** en arrière-plan ; modale avec **thème**, **session en cours** (ex. « Session 1 / 2 »), **membres du groupe** + **couleurs assignées**. Fermeture auto **5 s** → canvas. *Bonus : décompte 5…4…3…2…1… (→ BONUS-06).*
- **P3-05** — **Barre joueurs en jeu** : bandeau en haut de l'écran de jeu listant **tous les membres du groupe** (avatar + pseudo, format lisible). Le **manager spectateur** y apparaît aussi quand il rejoint une grille (badge ou style distinct « Manager »). *Bonus futur : bulle « en train d'écrire » (→ BONUS-09).*
- **P3-05-suite** — **Écran de jeu par groupe** *(ex-PLAY-01 + PLAY-02, ajusté)* : grille collaborative, thème en navbar, chat ouvert, palette en bas (**couleurs du joueur uniquement** ; masquée pour le host spectateur). Synchro temps réel (`canvas` + `pixelPlaced`).
- **P3-06** — **Vue host — lobby de supervision** :
  - Création → **lobby** (`/lobby/:eventId`). Titre = thème ; indicateur **session courante / total** (ex. « Session 1 sur 2 »).
  - Lien **waiting room** pour lancer la **session 1** (`startSession` + shuffle). Sessions suivantes : lancement depuis le lobby **après vote** (→ P3-07).
  - Lobby = cards des **sous-games de la session active** (`XYZ/1234`…) — preview + avatars/pseudos larges.
  - Spectateur sur `/game/:eventId/:groupCode` : chat OK, pas de palette/pixel, **Retour lobby**.
  - **Terminer l'event** (purge totale) — hors scope timer auto.
  - Onboarding manager à la création ou première entrée lobby.

### Partie 3 — Boucle multi-sessions *(après socle + UX session unique)*

- **P3-07** — **Enchaînement sessions** *(rapproche FLOW-01)* : fin de session → phase `voting` → quand vote clos (ou skip manager en dev), `startSession` suivante → **reshuffle** + nouveaux `groupCode` + lobby manager rafraîchi + redirection joueurs.
- **P3-08** — **Vote inter-sessions** *(rapproche VOTE-01→03)* : galerie des grilles de la session terminée, 1 vote/participant, classement affiché avant la session suivante. Timer fin de grille (PLAY-03) optionnel en première itération.

> **Note** : la partie 1 + 2 livrent le **premier cycle complet** (création → session 1 → jeu → lobby spectateur). La **boucle session 2+** et le **vote** = partie 3, sauf décision de tout fusionner.

---

## BACKLOG — après le socle gameplay (ancienne roadmap conservée)

> Items déjà réfléchis, **hors scope immédiat**. À reprendre une fois les phases 1–3 stables.

### Configuration & parties avancées

- **HOST-01** — **Configuration avancée** (achat simulé) : **durée** par session, taille de grille configurable, taille du set de couleurs (20–30). Le **nombre de sessions** est couvert par **P3-00** ; l'enchaînement par **P3-07**.
- **FLOW-01** — *(couvert par P3-07)* — Enchaîner les sessions jusqu'à la dernière.
- **FLOW-02** — **Écran final** : classement global de la partie.
- **FLOW-03** — **Export ZIP & fermeture** : l'host télécharge un ZIP de toutes les grilles, puis purge de l'`Event`.

### Joueur & identité enrichie

- **PLY-02** — **Constructeur d'avatar** : remplace les placeholders **couleur** temporaires — choix par composants (peau, chapeau, lunettes…) + affichage en waiting room et en jeu.
- **CORE-02-suite** — **Reconnexion post-refresh** : restaurer pseudo + rattachement `Event` / groupe après F5 (voir aussi dette **FRONT-01**).
- **AUTH-01** — **Session éphémère (JWT ~1h)** : à la création/join, le serveur émet un token signé `{ roomId, role, participantId }` ; le client le stocke (`sessionStorage`) et le renvoie à la reconnexion socket pour retrouver son rôle sans dépendre du `socket.id` volatile. Prérequis avant prod / F5 fiable (dette **SEC-02**, **BACK-12**).

### Manche, timer & vote

- **PLAY-03** — **Fin du timer** : figer la grille à 0, passer en phase « vote ».
- **VOTE-01** — **Galerie de manche** : afficher toutes les grilles produites dans la manche.
- **VOTE-02** — **Vote** : 1 vote par participant (sa propre grille autorisée), anti double-vote.
- **VOTE-03** — **Classement** : afficher le classement des grilles les plus votées.

### Bonus / futur

- **BONUS-01** — **Emojis d'émotion** : emoji cliquable sur son avatar.
- **BONUS-02** — **Statut « j'ai fini »** : signaler sa grille terminée avant la fin du timer.
- **BONUS-03** — **Mode marathon** : grande grille + thèmes ajoutés toutes les X minutes.
- **BONUS-04** — **Avatar généré par IA** : description textuelle → génération (coût, latence à explorer).
- **BONUS-05** — **Vrai système d'achat** : compte host persistant + crédits de sessions.
- **BONUS-06** — **Décompte de lancement** : animation 5…4…3…2…1… sur la modale de transition (extension de P3-03).
- **BONUS-09** — **Indicateur « en train d'écrire »** : petite bulle de dialogue sur l'avatar dans la barre joueurs quand un membre tape dans le chat.
- **BONUS-07** — **Chat waiting room** : fil de discussion léger avant le lancement.
- **BONUS-08** — **Grille d'attente** : canvas fixe en arrière-plan (derrière les cards) — clic → couleur aléatoire, sans impact sur la partie.

---

## Ordre de travail suggéré

| Priorité | Phase | Première brique concrète |
|----------|-------|--------------------------|
| 1 | Phase 3 — Partie 2 | P3-00 → P3-01 → P3-02 → P3-04 (Event/Sessions/Group/shuffle/couleurs) |
| 2 | Phase 3 — Partie 1 | P3-06 + P3-03 + P3-05 (lobby, transition, barre joueurs) — **session 1** |
| 3 | Phase 3 — Partie 3 | P3-07 + P3-08 (reshuffle session 2+, vote) |
