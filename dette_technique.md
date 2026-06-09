# PixelTogether — Dette technique

**Rôle** : tout ce qu'on **reporte** — failles, risques, polish — classés par gravité. Odin y ajoute de manière autonome dès qu'un souci est repéré (en session ou en revue). Toi aussi quand tu dis « on fera plus tard ».

> **Convention** : gravité **CRITIQUE → ÉLEVÉ → MOYEN → INFO**. Résolu → **retirer** d'ici + **une ligne** dans `journal.md`. Jamais de secrets en clair.

---

## CRITIQUE

- **BACK-10** — **Purge de l'etat memoire a la deconnexion** : le handler `disconnect` ne nettoie l'utilisateur que dans la branche hote → fuite memoire. Desormais **critique** : tout l'etat (joueurs, grilles, votes) est en memoire, une mauvaise purge fait enfler le process et corrompt les parties. Purger systematiquement, hors condition.
- **BACK-12** — **Doubles connexions** : un meme utilisateur peut ouvrir plusieurs sockets → etats incoherents (ex. double presence dans un groupe, host duplique). Indexer/dedupliquer par identite.
- **SEC-02** — **Actions host validees par identite stable** : les actions sensibles (lancer la partie, manche suivante, fermer, telecharger) doivent verifier l'**identite stable** de l'host, pas `socket.id` (volatil). **Court terme (P1-07)** : `socket.id === grid.host` suffit en dev. **Moyen terme (AUTH-01)** : JWT session ~1h emis au create/join, rattache au role host/player. Toujours `if (!event) return;` avant d'acceder a l'etat.
- **FRONT-04** — **Perte de connexion en pleine partie** : encore plus grave sans BDD (aucune reprise possible depuis le serveur). Detecter `disconnect`/`connect_error`, tenter une reconnexion, afficher un ecran clair, et eviter qu'un crash serveur ne laisse les joueurs bloques.

---

## ELEVE

- **FRONT-01** — **Reconnexion a sa partie au refresh** : un F5 ne doit pas ejecter le joueur. Restaurer sa session temporaire avant d'evaluer l'acces a l'ecran de jeu.
- **FRONT-05** — **Notifications de chat** : deplacer l'ecoute des messages dans un service toujours monte (pas seulement quand le chat est ouvert), pour le badge de non-lus.
- **BACK-02** — **Validation des entrees socket** : helper commun de validation sur chaque handler (data `undefined`/malformee = abus/crash).
- **BACK-04** — **Rate-limit des events** : throttling par socket/event (pixel, chat, vote) — seul `pixelPlaced` avait un cooldown.
- **PERF-04** — **Transition create/join lente (1–2 s)** : lazy-load du chunk `game-routes` au premier accès ; attente `emitWithAck` avant navigation (création) ; puis `joinRoom` + `gridState` + `renderGrid` (152 lignes canvas 75×75). Pistes : preload module game sur landing, loader modal, alléger le tracé de grille.

---

## MOYEN

- **BACK-03** — **Decouper le god file `index.js`** : extraire la logique par domaine (event/lobby, groupes, jeu/grid, chat, vote, export) au fil de la reconstruction. Ideal a faire en construisant le nouveau code plutot qu'apres.
- **PERF-03** — **Export image correct** : `toDataURL('image/webp')` avec node-canvas retombe en PNG silencieusement. Pour le ZIP souvenir (FLOW-03), encoder explicitement (PNG propre ou WebP via `sharp`).
- **ARCH-02** — **Limiter le god service d'UI** : `UiStateService` est injecte partout. Separer les responsabilites au fil du nouveau code (eviter le couplage autour de la grille).
- **ARCH-03** — **Routing sur-dimensionne** : 3 fichiers `*.routes.ts` (host, lobby, game) pour 1 page chacun → triple indirection + lazy-load inutile sur host/lobby (~7–9 KB). Simplifier : routes plates dans `app.routes.ts` pour `/` et `/lobby`, lazy-load **uniquement** sur `game/:roomId`. A faire de preference en phase 2 quand `host/` et `player/` auront plusieurs routes.

---

## INFO / POLISH

- **DOC-01** — **Documentation** : README racine decrivant le nouveau produit + `.env.example` (PORT, FRONTEND_URL…).
- **TEST-01** — **Tests** : aucune couverture aujourd'hui. A planifier progressivement sur la nouvelle logique (repartition groupes, allocation couleurs, vote).
- **UX-02** — **Chat** : compteur de caracteres + gestion des mots trop longs (aligner limites front/back).
- **UX-03** — **Feedback create/join** : spinner ou état « Chargement… » pendant ack socket + navigation (éviter l'impression de bug).

---

## Resume

| Severite | Restant |
|----------|---------|
| Critique | 4 |
| Eleve | 5 |
| Moyen | 4 |
| Info / Polish | 5 |
