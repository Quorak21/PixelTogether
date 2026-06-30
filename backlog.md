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

### MOYEN

Pas de tâches moyennes pour le moment

### INFO

Pas de tâches info pour le moment


## Features minimum

Fonctionnalités indispensables et prioritaires pour la V1.

- **ADD-37** — **Export ZIP fin de partie** : export de toutes les grilles par le manager, avant `endParty`.
- **ADD-40** — **Indicateur « en train d'écrire »** : sur la barre joueurs.
- **ADD-41** — **Statut « j'ai fini »** : quand tout le groupe a fini → grille lock + joueurs au lobby (accès autres grilles en chat, pas de pixel).

- **ADD-43** — **Choix de musique manager** : pistes prédéfinies sélectionnables par le manager.
- **ADD-44** — **Copy waiting room** : encart déroulement rapide + pool de sous-titres sous le titre (ex. « {pseudo} vous a préparé un super thème ! ») — tirage aléatoire à chaque entrée.
- **ADD-45** — **Kick joueur waiting room** : expulser un joueur de la salle d'attente.
- **ADD-46** — **Gestion du blanc adjacent** : si deux blancs côte à côte, enlever la bordure entre eux.
- **ADD-47** — **Partie sans manager** : en cas d'absence prolongée du manager, ne pas fermer brutalement — enchaînement auto (vote, podium, export ZIP) pour que tous les joueurs puissent récupérer le pack final.
- **ADD-48** — **Joueur peuvent quitter** : Permettre aux joueurs de quitter officielement la partie avec disclaimer de non-retour possible + purge token. Pareil pour manager, peut a tout moment tout fermer avec disclaimer pas de retour en arrière et non remboursement. => Si moitié des joueurs quittent => go final
- **ADD-49** — **Gestion des erreurs dans le formulaire de création de partie** : améliorer la remontée et l'affichage des erreurs du formulaire lors de la création d'un salon.
- **ADD-50** — **Zoom + vote par cœur sur les œuvres** : pendant la phase de vote, un clic sur une miniature de grille ouvre un zoom (comme le zoom coop existant). Un cœur ❤️ positionné en haut à droite de l'image zoomée permet de voter : clic sur le cœur = +1 vote pour cette œuvre. Le clic direct sur la grille déclenche le zoom, pas le vote — séparation claire des deux actions.
- **ADD-51** — **Amélioration de la documentation sur landing page** : Améliorer la documentation et les textes explicatifs sur la page d'accueil pour guider les utilisateurs.
- UI => Sur le podium, plutot qu'ecrire session + theme en dessous. Mettre juste le theme

## FF

Idées, évolutions et améliorations secondaires — tri libre.

- **FF-01** — **Emojis d'émotion sur l'avatar** : réactions émotionnelles sur l'avatar.
- **FF-02** — **Composant modales warning** : composant unique pour toutes les modales de type « warning ».
- **FF-03** — **Config manager avancée** : taille de grille, pool 20–30 couleurs.
- **FF-04** — **Journal d'audit par partie** : preuve de service B2B, hors RAM.
- **FF-05** — **Landing portfolio** : documentation landing + README GitHub + grille de démo 8×8 animée (palettes exclusives joueurs fictifs) pour expliquer le concept en un coup d'œil.
- **FF-06** — **SEO** : optimisation pour les moteurs de recherche.
- **FF-07** — **Mode démo** : 2–5 joueurs (manager inclus), **1 session** uniquement, durée max **15 min**, grille **75×75**. Format essai rapide (landing / pitch) — friction minimale, distinct du coop et du compétitif.
- **FF-08** — **Popover membres du groupe (navbar)** : à côté du pseudo du joueur, un bouton « groupe » affiche au survol un panneau listant tous les membres du groupe (avatar + pseudo). Fermeture automatique dès que le curseur quitte le bouton et le panneau (plus de hover).
- **FF-09** — **Améliorer le final coop** : Améliorer la galerie et la présentation finale de la partie en mode coopératif.
- **FF-10** — **Constructeur d'avatar** : personnalisation (peau, chapeau…).