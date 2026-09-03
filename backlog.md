# PixelTogether — Backlog

**Statut produit** : MVP team building livré (sessions, vote, podium). Ce fichier regroupe tout le travail restant.

| Fichier | Rôle |
|---------|------|
| `backlog.md` | **Tâches en cours** (dettes, bugs, chantiers) + **FF** (idées et features futures) |
| `journal.md` | Jalons et tâches **terminées** |

> **Convention tickets** : `ID` — **Titre** : description. Gravité **CRITIQUE → ÉLEVÉ → MOYEN → INFO** pour les tâches en cours. Préfixe **ADD-** pour les features minimum (V1) et **FF-** pour les futurs features (FF). Résolu → retirer d'ici + **une ligne** dans `journal.md`. Jamais de secrets en clair.

---

## Tâches en cours

Bugs, risques, dettes et chantiers actifs. L'agent peut y ajouter un ticket si un souci est repéré ; toi aussi quand tu dis « on fera plus tard ».

### CRITIQUE

Pas de tâches critique pour le moment

### ÉLEVÉ

Pas de tâches élevées pour le moment

### MOYEN

Pas de tâches moyennes pour le moment

### INFO

Pas de tâches info pour le moment

## Questionnement, problèmatiques

- La limitation des couleurs pourraient exclure passivement certains joueurs s'ils ont des couleurs inutiles. Particulierement en coop a 8 joueur. (pret ?) 

## FF

Idées, évolutions et améliorations secondaires — tri libre.

- **FF-00** - **Logs conservé** Créer un systeme de conservation des logs pour chaque partie a des fins statistiques, uniquement date, heures, durée de la partie, nombre d'user, si la partie est arrivée au bout et sinon qu'est ce qui a provoquer la fin de la partie. Export automatique dans un document perso que je peux accèder depuis n'importe ou comme mon google cloud ou autre service plus simple
- **FF-01** — **Emojis d'émotion sur l'avatar** : réactions émotionnelles sur l'avatar.
- **FF-02** — **Composant modales warning** : composant unique pour toutes les modales de type « warning ».
- **FF-03** — **Config manager avancée** : taille de grille, pool 20–30 couleurs.
- **FF-04** — **Journal d'audit par partie** : preuve de service B2B, hors RAM.
- **FF-05** — **Landing portfolio** : documentation landing + README GitHub + grille de démo 8×8 animée (palettes exclusives joueurs fictifs) pour expliquer le concept en un coup d'œil.
- **FF-06** — **SEO** : optimisation pour les moteurs de recherche.
- **FF-07** — **Mode démo** : 2–4 joueurs (manager inclus), **1 session** uniquement, durée max **15 min**, grille **75×75**. Format essai gratuit (landing / pitch) — friction minimale, distinct du coop et du compétitif payant (voir **FF-13**).
- **FF-08** — **Récap export PDF** : `recap.pdf` stylé dans le ZIP de fin de partie (en plus du `recap.txt`), modèle avec champs adaptables au nombre de sessions/joueurs — nom de partie, détail par session (groupes, votes), podium dessins + joueurs. Réutiliser `buildRecapData` côté back (`renderRecapPdf` à créer, ex. `pdfkit`).
- **FF-10** — **Constructeur d'avatar** : personnalisation (peau, chapeau…).
- **FF-11** — **Choix de musique manager** : pistes prédéfinies sélectionnables par le manager.
- **FF-13** — **Monétisation** : **mode démo** — 2–4 joueurs (manager inclus) ; **partie payante** — facturation à la minute (durée session × nombre de sessions) — **coop** : 2–16 joueurs (32 couleurs) ; **compét** : 6–40 joueurs. **À ne pas oublier** : disclaimer remboursement sur la modale « Fermer la partie » manager (ADD-48).
- **FF-14** — **Pixels posés par joueur dans le récap** : dans le récap final (`recap.txt` / export ZIP, et **FF-08** si PDF), afficher le nombre de pixels placés par joueur (par session et/ou total partie). S'appuyer sur `buildRecapData` — compter côté back à la fin de session ou agréger depuis l'état grille.
- **FF-15** - **Traduction** Donner la possibilité de passer en anglais