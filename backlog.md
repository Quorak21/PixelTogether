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

- **AUDIT-02** — **Bug reconnexion manager** : `clearManagerDisconnectTimer` annulé à tort par tout reconnect de joueur.
  Restreindre l'appel au rôle manager seul dans `reconnect.handlers.js` (L68/L132) pour éviter le blocage de room.
- **AUDIT-03** — **Shuffle de groupes biaisé** : `sort(() => Math.random() - 0.5)` dans `groupShuffle.js` n'est pas uniforme.
  Remplacer par un algorithme de Fisher-Yates (Knuth) robuste et uniforme.
- **AUDIT-04** — **Token coop NaN expiry** : En coop, `sessionDurationMinutes` vaut `null` provoquant un TTL infini (`NaN`).
  Ajouter un fallback propre à `MAX_PARTY_DURATION_MINUTES` pour éviter une accumulation mémoire de tokens.
- **AUDIT-05** — **DoS Canvas / Preview CPU** : `updateGroupPreview()` génère un PNG base64 lourd à chaque pixel posé.
  Debouncer la génération (ex : max 1 fois par 3 secondes par groupe) ou générer à la demande (lobby/vote).
- **AUDIT-06** — **DoS Chat messages illimités** : `chatMessages` grandit sans limite en RAM.
  Fixer un plafond strict de messages stockés par groupe (buffer circulaire, ex: max 500).
- **AUDIT-07** — **Auth Chat & messages** : Pas de check de membership sur `sendMessage` et `getChatMessages`.
  Vérifier que le socket demandeur appartient bien au groupe ciblé (ou est le manager) avant d'autoriser.
- **AUDIT-08** — **Validation types/longueurs backend** : Aucun typecheck strict sur payloads socket et pas de max pseudo.
  Valider le type des objets reçus et plafonner la taille des pseudos/thèmes (ex: 30/100 chars).
- **AUDIT-09** — **Frontend emitWithAck sans timeout** : Les promises d'ack socket peuvent freeze l'UI indéfiniment si pas de réponse.
  Ajouter un timeout de 10s avec reject et wrapper tous les appels du front dans des `try/catch` avec message d'erreur.
- **AUDIT-10** — **Frontend pas de route guards** : Pas de protection sur `/game`, `/lobby` ou `/room`.
  Ajouter des guards Angular `canActivate` pour empêcher les accès directs sans session/autorisation active.
- **AUDIT-11** — **Frontend signal hasActiveSession non réactif** : Lit `localStorage` dans un computed sans signal sous-jacent.
  Utiliser un signal interne dans `SessionTokenService` pour propager dynamiquement l'état de session active.
- **AUDIT-12** — **Frontend pas de gestion connect_error** : Les coupures serveurs ou échecs initiaux sont silencieux pour l'utilisateur.
  Écouter `connect_error` sur Socket.IO pour afficher un statut de déconnexion/reconnexion global à l'écran.

### MOYEN

- **AUDIT-13** — **Broadcast roomClosed global** : `io.emit('roomClosed')` envoie l'event de clôture à tous les serveurs du projet.
  Cibler uniquement la room de l'event concerné via `io.to(eventId).emit()`.
- **AUDIT-14** — **Rate-limits incomplets** : Seuls 3 events socket sont protégés.
  Ajouter des rate-limits sur `newGrid` (create event), `enterWaitingRoom` et `reconnectSession` pour parer aux bots.
- **AUDIT-15** — **Manque max joueurs compétitif** : Pas de cap pour limiter l'afflux et le nombre de groupes générés.
  Plafonner le nombre max de joueurs dans l'event compétitif pour préserver la RAM et le CPU.
- **AUDIT-16** — **WaitingRoomPageComponent god component** : Fichier trop lourd (700+ lignes) centralisant trop de logique.
  Découper les sous-vues (podium, vote, lobby) et la logique socket Angular en sous-composants dédiés.
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

- **ADD-36** — **Partie sans manager**: Permettre aux joueurs de quitter officielement la partie avec disclaimer de non-retour possible + purge token. Pareil pour manager, peut a tout moment tout fermer avec disclaimer pas de retour en arrière et non remboursement.