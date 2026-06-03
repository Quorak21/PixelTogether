# 📓 Journal de bord — PixelTogether

Historique des tâches, décisions et dette technique du projet (Angular 21 + Node/Express + Socket.io).

- **Tâches réalisées depuis l'implémentation du workflow : 0**

---

## 2026-06-03 — 🔄 PIVOT PRODUIT MAJEUR : jeu communautaire → outil de teambuilding B2B

Le projet abandonne le modèle « jeu communautaire persistant » au profit d'un **outil de teambuilding B2B éphémère par session** (manager qui configure/lance, employés temporaires, groupes de 3-4, grille partagée à palette répartie, vote, export ZIP, puis fermeture). Détail produit & roadmap découpée → `code_review.md`.

**Décisions d'architecture verrouillées** : zéro base de données (état 100 % en mémoire) ; pas de comptes persistants (identité temporaire) ; achat de sessions simulé hors MVP ; groupes auto 3-4 stricts ; palette répartie exclusivement par groupe ; 1 vote/participant (sa grille incluse). Stack conservée : Angular 21 + Node/Express + Socket.io ; **MongoDB retiré**.

Tout l'héritage communautaire (économie, galerie publique, likes, comptes persistants, modération, gamification, lancement Facebook) est abandonné. La roadmap découpée et la dette encore pertinente vivent désormais dans `code_review.md`.
