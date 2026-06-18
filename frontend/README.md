# Documentation Technique du Frontend - PixelTogether 🎨

Bienvenue ! Ce document présente l'architecture, la structure et le fonctionnement du frontend de **PixelTogether**.

Le frontend est une application moderne construite avec **Angular 21+**, utilisant les **Signals** pour la réactivité de l'état local et **Socket.io-client** pour les communications temps réel avec le serveur.

---

## 📁 Structure du Code Frontend

L'application suit une organisation modulaire sous `frontend/src/app/` :

```text
frontend/src/app/
│
├── core/                        # Services et configurations partagés globalement
│   ├── config/                  # Configuration dynamique et URLs de l'API
│   ├── constants/               # Constantes (couleurs par défaut, avatars...)
│   ├── services/                # Services principaux (Socket, UI, Reconnexion...)
│   └── utils/                   # Utilitaires génériques (gestion du temps, preload...)
│
├── features/                    # Modules métiers et pages de l'application
│   ├── game/                    # Module de jeu (Canvas interactif, palette de couleurs...)
│   ├── landing/                 # Page d'accueil (Création / Connexion à un salon)
│   ├── lobby/                   # Vue d'ensemble pour le manager (mode compétitif)
│   └── waiting/                 # Salle d'attente (choix du pseudo, liste des joueurs)
│
├── shared/                      # Composants réutilisables
│   ├── avatar-placeholder/      # Affichage des avatars des joueurs
│   └── chatbox/                 # Boîte de discussion temps réel
│
├── types/                       # Interfaces TypeScript pour le typage des entités et des sockets
│   ├── entities.ts              # Modèles de données (Player, Group, GridState...)
│   └── socket-payloads.ts       # Typage des événements Socket.io entrants et sortants
│
├── app.config.ts                # Configuration Angular de base (Providers, Routing)
├── app.routes.ts                # Définition des routes principales
├── app.ts                       # Composant racine de l'application
└── app.html                     # Template racine
```

---

## ⚙️ Services Core & Gestion d'État

La gestion d'état ne nécessite pas d'outil complexe comme NgRx ; nous utilisons les **Angular Signals** au sein de services injectables à portée globale (`providedIn: 'root'`).

### 1. Gestion de l'état UI ([ui-state.service.ts](file:///h:/Taches/Programmation/PixelTogether/frontend/src/app/core/services/ui-state.service.ts))
Ce service centralise l'état visuel et contextuel de l'application pour toutes les routes.
* **`joinWaitingRoom(eventId)`** : Initialise la salle d'attente pour l'événement désigné.
* **`joinGame(eventId, groupCode)`** : Oriente l'état vers le mode jeu actif pour un groupe.
* **`leaveCanvasForWaitingRoom(eventId)`** : Gère le retour en salle d'attente après une manche.
* **`isCoopParty` / `isCompetitiveParty`** : Signaux calculés (`computed`) indiquant le mode de jeu actuel.
* **`currentRole`** : Définit si l'utilisateur est `manager` ou `player`.

### 2. Gestion de la reconnexion ([reconnect.service.ts](file:///h:/Taches/Programmation/PixelTogether/frontend/src/app/core/services/reconnect.service.ts))
Permet la tolérance aux coupures réseau en gérant les jetons d'accès.
* **`reconnect()`** : Tente de renvoyer le token stocké au serveur via `reconnectSession` pour récupérer l'état actuel de la partie.
* **`resumeAndNavigate(response)`** : Re-synchronise l'UI (salle d'attente, canvas ou lobby) et redirige l'utilisateur vers la bonne page après une déconnexion.
* **`hydrateGridState(data)`** : Injecte l'état complet de la grille de dessin dans `UiStateService` lors de la reconnexion à une manche.

### 3. Jeton de Session ([session-token.service.ts](file:///h:/Taches/Programmation/PixelTogether/frontend/src/app/core/services/session-token.service.ts))
Wrapper pour manipuler le stockage persistant dans le navigateur (`localStorage`).
* **`save(session)`** : Enregistre le token de session, l'ID joueur et le rôle.
* **`read()`** : Lit les données de session du stockage local.
* **`isExpired(session)`** : Vérifie si le jeton a dépassé sa durée d'expiration théorique.
* **`clear()`** : Supprime les données pour forcer une nouvelle connexion.

### 4. Communication Socket ([socket.service.ts](file:///h:/Taches/Programmation/PixelTogether/frontend/src/app/core/services/socket.service.ts))
Un wrapper fin autour de `socket.io-client` qui fournit des méthodes typées et des signaux sur l'état de la connexion.
* **`isConnected`** : Signal indiquant si le socket est connecté.
* **`emit(event, payload)`** : Envoie un événement simple au serveur.
* **`emitWithAck(event, payload)`** : Envoie un événement avec promesse d'acquittement (équivalent d'un appel API Request/Response).
* **`on(event, handler)`** : Enregistre un écouteur d'événements.

---

## 🎨 Composants Clés & Interface Utilisateur

### 1. Le Canvas Interactif ([canvas.ts](file:///h:/Taches/Programmation/PixelTogether/frontend/src/app/features/game/canvas/canvas.ts))
Le cœur créatif du projet. Il affiche le dessin partagé du groupe en temps réel.
* Dessine la grille de pixels pixel par pixel en écoutant l'événement `pixelPlaced` du serveur.
* Envoie au serveur via `placePixel` les coordonnées et la couleur sélectionnée lorsque l'utilisateur clique.
* Gère le zoom et le déplacement de caméra pour dessiner confortablement.

### 2. Palette de Couleurs ([color-palette.ts](file:///h:/Taches/Programmation/PixelTogether/frontend/src/app/features/game/color-palette/color-palette.ts))
Affiche les couleurs attribuées au joueur pour la manche en cours.
* Permet de sélectionner la couleur active.
* Met à jour `UiStateService.selectedColor`.

### 3. Boîte de discussion ([chatbox.ts](file:///h:/Taches/Programmation/PixelTogether/frontend/src/app/shared/chatbox/chatbox.ts))
Permet de communiquer au sein du groupe ou du salon de jeu.
* S'intègre sur la droite de l'écran lors du dessin.
* Gère les messages textuels émis via `chatMessage` et reçus via `message`.

---

## 🔁 Flux de connexion et reconnexion typique

Voici comment se déroule l'initialisation et la reconnexion automatique d'un joueur ou du manager :

1. **Connexion initiale** : L'utilisateur arrive sur l'application frontend.
2. **Recherche de session locale** : Le service client regarde dans le `localStorage` s'il y a un jeton de session enregistré et non expiré.
3. **Appel au serveur** :
   * S'il y a une session locale, le client envoie l'événement socket `reconnectSession` contenant le jeton.
   * Le backend valide le jeton de reconnexion en mémoire.
4. **Restauration et Navigation** :
   * **Si le jeton est valide** : Le serveur renvoie l'état complet du jeu. Le client hydrate son `UiStateService` (rôle, couleurs, joueurs, chronomètres) et le redirige automatiquement vers la bonne page (salle d'attente `/room`, canvas `/game` ou lobby manager `/lobby`).
   * **Si le jeton est invalide ou expiré** : Le client efface la session locale et laisse l'utilisateur sur la page d'accueil pour qu'il puisse rejoindre ou créer un nouveau salon.

---

## 💡 Conseils pour le Junior reprenant le code

1. **La puissance des Signals d'Angular** : Nous n'utilisons pas RxJS (comme les `BehaviorSubject`) ni de gestionnaires d'état lourds comme NgRx pour l'état global de l'UI. Tout passe par les **Angular Signals** (`signal`, `computed`). C'est beaucoup plus simple à lire et à mettre à jour. Si tu dois ajouter une information globale, ajoute un signal dans [ui-state.service.ts](file:///h:/Taches/Programmation/PixelTogether/frontend/src/app/core/services/ui-state.service.ts).
2. **Ne réinstancie pas de Socket** : La connexion en temps réel est centralisée dans le [socket.service.ts](file:///h:/Taches/Programmation/PixelTogether/frontend/src/app/core/services/socket.service.ts). Injecte simplement ce service là où tu en as besoin. Les méthodes `emitWithAck` te permettent de faire des appels requêtes-réponses asynchrones (comme des requêtes HTTP mais sur WebSocket).
3. **Le mécanisme de reconnexion** : Quand un utilisateur actualise la page ou subit une coupure internet temporaire, il ne perd pas sa partie. Tout est sauvegardé dans le `localStorage` du navigateur via [session-token.service.ts](file:///h:/Taches/Programmation/PixelTogether/frontend/src/app/core/services/session-token.service.ts). Au chargement, le [reconnect.service.ts](file:///h:/Taches/Programmation/PixelTogether/frontend/src/app/core/services/reconnect.service.ts) s'occupe de renvoyer le token au serveur pour récupérer l'état exact de la partie.
4. **Optimisation du Canvas** : Le canvas de dessin ([canvas.ts](file:///h:/Taches/Programmation/PixelTogether/frontend/src/app/features/game/canvas/canvas.ts)) est optimisé pour ne redessiner que les pixels qui changent lors de la réception des événements `drawPixel`, évitant ainsi de reconstruire toute la grille à chaque action d'un joueur.
5. **Pré-chargement des routes** : Pour éviter les temps de latence au moment où le manager clique sur "Lancer la partie", le code pré-charge en tâche de fond le module de jeu (les composants de dessin) dès qu'il arrive sur le lobby grâce à `preloadGameRoutes()` dans [preload-game.ts](file:///h:/Taches/Programmation/PixelTogether/frontend/src/app/core/utils/preload-game.ts).


