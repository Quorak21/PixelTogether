# PixelTogether — Backlog



**Statut produit** : MVP team building livré (sessions, vote, podium). Ce fichier regroupe tout le travail restant.



| Fichier | Rôle |

|---------|------|

| `backlog.md` | **Tâches en cours** (dettes, bugs, chantiers) + **Futur features** (idées) |

| `journal.md` | Jalons et tâches **terminées** |



> **Convention tickets** : `ID` — **Titre** : description. Gravité **CRITIQUE → ÉLEVÉ → MOYEN → INFO** pour les tâches en cours. Préfixe **ADD-** pour les futur features. Résolu → retirer d'ici + **une ligne** dans `journal.md`. Jamais de secrets en clair.



---



## Tâches en cours



Bugs, risques, dettes et chantiers actifs. Odin y ajoute de manière autonome dès qu'un souci est repéré ; toi aussi quand tu dis « on fera plus tard ».



### ÉLEVÉ



- **PERF-04** — **Transition create/join lente + feedback chargement** : lazy-load du chunk `game-routes` au premier accès ; attente `emitWithAck` avant navigation (création) ; puis `joinRoom` + `gridState` + `renderGrid` (152 lignes canvas 75×75). Pistes : preload module game sur landing, alléger le tracé de grille ; spinner ou état « Chargement… » pendant ack socket + navigation (éviter l'impression de bug).



### MOYEN



- **TEST-01** — **Process de tests** : aucun pipeline aujourd'hui (specs supprimées, pas de scripts `test`). À définir puis implémenter : scripts npm back (`node:test` sur logique pure : shuffle, validation socket) et front (Vitest/Angular), règles agents alignées, première couverture utile, intégration CI — pas de fichiers orphelins sans process.

- **PERF-03** — **Export image correct** : `toDataURL('image/webp')` avec node-canvas retombe en PNG silencieusement. Pour le ZIP souvenir, encoder explicitement (PNG propre ou WebP via `sharp`).

- **ARCH-03** — **Routing sur-dimensionné** : 3 fichiers `*.routes.ts` (manager, lobby, game) pour 1 page chacun → triple indirection + lazy-load inutile sur manager/lobby (~7–9 KB). Simplifier : routes plates dans `app.routes.ts` pour `/` et `/lobby`, lazy-load **uniquement** sur `game/:roomId`.



## Futur features



Idées et évolutions — pas de priorité imposée, tri libre. Quand une idée devient un chantier concret, la déplacer en **Tâches en cours** (avec un `ID`).



- **ADD-02** — **Polish podium final** : amélioration UI du podium de fin de partie (@picasso).

- **ADD-03** — **Vote par timer** : vote automatique après 30 s ou 1 min (à tester) — le manager ne gère plus, moins de friction.

- **ADD-04** — **Égalité sur les votes** : en cas d'égalité, le manager décide du gagnant.

- **ADD-05** — **Export ZIP fin de partie** : export de toutes les grilles par le manager, avant `endParty`.

- **ADD-06** — **Annonces chat présence** : annonce quand le manager rejoint/quitte la room (idem joueurs ayant fini).

- **ADD-07** — **Chrono navbar coloré** : le chrono de la navbar change de couleur quand le temps baisse.

- **ADD-08** — **Chat waiting room** : chat commun en salle d'attente (manager + joueurs en attente des derniers arrivants).

- **ADD-10** — **Indicateur « en train d'écrire »** : sur la barre joueurs.

- **ADD-12** — **Grille décorative waiting room** : grille décorative mais fonctionnelle en fond de salle d'attente.

- **ADD-13** — **Statut « j'ai fini »** : quand tout le groupe a fini → grille lock + joueurs au lobby (accès autres grilles en chat, pas de pixel).

- **ADD-14** — **Emojis d'émotion sur l'avatar** : réactions émotionnelles sur l'avatar.

- **ADD-15** — **Constructeur d'avatar** : personnalisation (peau, chapeau…).

- **ADD-16** — **Composant modales warning** : composant unique pour toutes les modales de type « warning ».

- **ADD-19** — **Config manager avancée** : taille de grille, pool 20–30 couleurs.

- **ADD-21** — **Journal d'audit par partie** : preuve de service B2B, hors RAM.

- **ADD-23** — **Choix de musique manager** : pistes prédéfinies sélectionnables par le manager.

- **ADD-24** — **Landing portfolio** : documentation landing + README GitHub + grille de démo 8×8 animée (palettes exclusives joueurs fictifs) pour expliquer le concept en un coup d'œil.

- **ADD-25** — **Copy waiting room** : encart déroulement rapide + pool de sous-titres sous le titre (ex. « {pseudo} vous a préparé un super thème ! ») — tirage aléatoire à chaque entrée.

- **ADD-27** — **SEO** : optimisation pour les moteurs de recherche.

- **ADD-28** — **Kick joueur waiting room** : expulser un joueur de la salle d'attente.

- **ADD-30** — **Gestion du blanc adjacent** : si deux blancs côte à côte, enlever la bordure entre eux.

- **ADD-33** — **Background landing pixels** : pixels décoratifs épars dans la grille en fond de landing.

- **ADD-34** — **Mode démo** : 2–5 joueurs (manager inclus), **1 session** uniquement, durée max **15 min**, grille **75×75**. Format essai rapide (landing / pitch) — friction minimale, distinct du coop et du compétitif.

- **ADD-36** — **Partie sans manager** : en cas d'absence prolongée du manager, ne pas fermer brutalement — enchaînement auto (vote, podium, export ZIP) pour que tous les joueurs puissent récupérer le pack final.


