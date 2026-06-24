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

### CRITIQUE

Aucune tâche critique pour le moment

### ÉLEVÉ

Aucune tâche élevée pour le moment

### MOYEN

- **AUDIT-16** — **Découpage WaitingRoomPageComponent en 3 états/composants** : Fichier trop lourd (700+ lignes).
  Séparer en trois composants ou états distincts : un composant "Waiting Room" pour le rassemblement initial des joueurs au tout début, un composant "Transition Room" pour les phases intermédiaires (votes, résultats de sessions intermédiaires), et un composant "Final Room" pour la fin de la partie (podiums et résultats finaux). Adapter également le backend pour la cohérence (ex: découper `waitingRoom.handlers.js` en modules de handlers dédiés par phase).
- **AUDIT-17** — **Timers redondants Angular** : 3 `setInterval(1000)` tournent simultanément sur la page game.
  Centraliser la gestion du temps restant dans `UiStateService` avec un unique timer ou signal.
- **AUDIT-18** — **State Angular non reset** : Retourner à la landing conserve les infos de la partie précédente.
  Ajouter un hook de reset global sur l'état du store de session lors d'un retour à la landing.


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

- **ADD-39** — **Popover membres du groupe (navbar)** : à côté du pseudo du joueur, un bouton « groupe » affiche au survol un panneau listant tous les membres du groupe (avatar + pseudo). Fermeture automatique dès que le curseur quitte le bouton et le panneau (plus de hover) (@picasso UI, @alex logique).

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

- **ADD-36** — **Joueur peuvent quitter**: Permettre aux joueurs de quitter officielement la partie avec disclaimer de non-retour possible + purge token. Pareil pour manager, peut a tout moment tout fermer avec disclaimer pas de retour en arrière et non remboursement.

- **ADD-37** — **Gestion des erreurs dans le formulaire de création de partie** : améliorer la remontée et l'affichage des erreurs du formulaire lors de la création d'un salon.

- **ADD-38** — **Zoom + vote par cœur sur les œuvres** : pendant la phase de vote, un clic sur une miniature de grille ouvre un zoom (comme le zoom coop existant). Un cœur ❤️ positionné en haut à droite de l'image zoomée permet de voter : clic sur le cœur = +1 vote pour cette œuvre. Le clic direct sur la grille déclenche le zoom, pas le vote — séparation claire des deux actions.