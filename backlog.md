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


## Features minimum

Fonctionnalités indispensables et prioritaires pour la V1.

- **ADD-49** — **Gestion des erreurs dans le formulaire de création de partie** : améliorer la remontée et l'affichage des erreurs du formulaire lors de la création d'un salon.
- **ADD-50** — **Zoom + vote par cœur sur les œuvres** : pendant la phase de vote, un clic sur une miniature de grille ouvre un zoom (comme le zoom coop existant). Un cœur ❤️ positionné en haut à droite de l'image zoomée permet de voter : clic sur le cœur = +1 vote pour cette œuvre. Le clic direct sur la grille déclenche le zoom, pas le vote — séparation claire des deux actions. + compte des votes pour le manager
- **ADD-51** — **Amélioration de la documentation sur landing page** : Améliorer la documentation et les textes explicatifs sur la page d'accueil pour guider les utilisateurs.
- UI => Sur le podium, plutot qu'ecrire session + theme en dessous. Mettre juste le theme
- **ADD-52** — **Améliorer le final coop** : Améliorer la galerie et la présentation finale de la partie en mode coopératif.
- **ADD-53** — **Popover membres du groupe (navbar)** : à côté du pseudo du joueur, un bouton « groupe » affiche au survol un panneau listant tous les membres du groupe (avatar + pseudo). Fermeture automatique dès que le curseur quitte le bouton et le panneau (plus de hover). MODE COOP
- **ADD-54** — **Placeholder joueur en inscription** : dans la waiting room, afficher un avatar placeholder dès qu'un visiteur a rejoint la salle mais n'a pas encore validé son pseudo (modale onboarding ouverte). Le manager voit qu'une personne est en train de s'inscrire et évite de lancer la partie sans elle.

## FF

Idées, évolutions et améliorations secondaires — tri libre.

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
- **FF-12** — **Badge carré « +x » (navbar)** : quand des joueurs extérieurs au groupe rejoignent ou sont présents, afficher un carré compact « +x » (x = nombre masqué) à côté de la barre joueurs — même interaction que **ADD-53** (popover au survol : liste avatar + pseudo) et réutilisation de l’indicateur **en train d’écrire** (ADD-40) sur chaque membre dans le panneau. MODE COOP.
- **FF-13** — **Monétisation** : **mode démo** — 2–4 joueurs (manager inclus) ; **partie payante** — facturation à la minute (durée session × nombre de sessions) — **coop** : 2–16 joueurs (32 couleurs) ; **compét** : 6–40 joueurs. **À ne pas oublier** : disclaimer remboursement sur la modale « Fermer la partie » manager (ADD-48).
- **FF-14** — **Pixels posés par joueur dans le récap** : dans le récap final (`recap.txt` / export ZIP, et **FF-08** si PDF), afficher le nombre de pixels placés par joueur (par session et/ou total partie). S'appuyer sur `buildRecapData` — compter côté back à la fin de session ou agréger depuis l'état grille.