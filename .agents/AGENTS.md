# Règles du Projet (PixelTogether)

Ces règles s'appliquent à tous les agents travaillant sur cette base de code.

## 🎯 Cap Produit

Outil de **teambuilding B2B éphémère par session** :
- Le manager configure une partie (nombre de sessions, thèmes, durée).
- Les joueurs s'inscrivent et sont répartis en **groupes de 3 à 4 joueurs**.
- Chaque membre d'un groupe reçoit une **palette de couleurs exclusive** (collaboration forcée pour remplir la grille 75x75).
- Phase de **vote** sur les grilles de la session précédente à chaque fin de session.
- **Export ZIP** des grilles finales par le manager.
- **Zéro base de données** : tout l'état est stocké **en mémoire** sur le serveur Node et est purgé à la fin de la partie.

## 🛠️ Stack Technique

- **Frontend** : Angular 21 (Signals, standalone components) + Tailwind CSS 4.
- **Backend** : Node.js / Express + Socket.io.
- **Tests** : `Vitest` (frontend) et `node:test` (backend).

## 📝 Règles de Documentation et de Commentaires

1. **Mise à jour du README du Backend** :
   À chaque modification structurelle (changement de modèle de données, nouveaux endpoints, modification d'événements Socket.io, nouveau fichier), mets impérativement à jour le fichier de documentation technique [backend/README.md](file:///h:/Taches/Programmation/PixelTogether/backend/README.md) pour qu'il reste à jour.

2. **Commentaires des fonctions** :
   - Toute nouvelle fonction implémentée doit être commentée de manière claire et détaillée.
   - Si tu modifies une fonction existante, mets à jour ses commentaires pour refléter fidèlement les modifications apportées.
   - **Style et Ton** : Les commentaires doivent être rédigés en **français**, sur un ton **humain, simple et naturel**, à la portée d'un développeur junior reprenant le code.

## ⚙️ Conventions de Développement

- **Simplicité** : Évite absolument l'over-engineering. Fais un code simple et lisible. C'est un petit jeu gratuit de teambuilding, pas une plateforme critique de la NASA.
- **Styles Frontend** : Classes Tailwind CSS uniquement dans les templates HTML. Pas de `styleUrl` ou de CSS par composant. L'unique point d'entrée pour la personnalisation est [frontend/src/styles.css](file:///h:/Taches/Programmation/PixelTogether/frontend/src/styles.css).
- **Architecture Frontend** : Utilise les Angular Signals pour la réactivité. Optimise le rendu en utilisant `ChangeDetectionStrategy.OnPush` sur les composants.
- **Suivi de projet** :
  - **Backlog** : [backlog.md](file:///h:/Taches/Programmation/PixelTogether/backlog.md) sert à stocker les dettes, bugs et features futures (ADD / FF).
  - **Journal de bord** : [journal.md](file:///h:/Taches/Programmation/PixelTogether/journal.md) trace les jalons terminés dans l'ordre chronologique inverse. Ne recycle JAMAIS un ID de ticket existant.
