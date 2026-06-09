# 📓 Journal de bord — PixelTogether

**Rôle** : mémoire de ce qui est **fait** — résumés de phase, pas le détail ticket par ticket.

| Fichier | Rôle |
|---------|------|
| `road_map.md` | Vision + ce qu'on fera (actif + plus tard) |
| `dette_technique.md` | Failles et soucis à traiter plus tard |
| `journal.md` | Ce qu'on a **terminé** (résumés) |

> **Convention** : entrées du **plus récent au plus ancien**. Une entrée = **une phase clôturée** (ou un jalon historique majeur). Pas de P1-01, P1-02… ici — le détail vit dans git / les PR. Quand une dette est résolue : retirée de `dette_technique.md` + **une ligne** ajoutée ici.

---

## Entrées

**Phase 2 — Waiting room** — Salle d'attente `/room/:id` entre landing et jeu : onboarding pseudo + couleur avatar (`AVATAR_COLORS`, placeholder Lucide `User`), cards joueurs temps réel, modales host (inviter avec code stream + URL, démarrer min. 2 joueurs). Serveur : `status` waiting/started, `registerPlayer`, `startGame`, verrou `joinRoom`. Navbar : profil avatar + pseudo ; chat par pseudo. Hors scope : F5/reconnexion, chat waiting room, grille d'attente.

**Phase 1 — Base gameplay fonctionnelle** — Socle jouable : landing host, création de partie (code 6 car.), join par code, grille 75×75 collaborative, pixels temps réel, chat, palette, lobby. P1-06 (constantes socket) abandonné : strings littérales conservées.

**P1-05** — Refonte game page : thème en navbar, layout fixe (chat à droite, palette en bas), palette sans gomme avec blanc posable, zoom molette + déplacement clic droit, fit initial de la grille.

**Démolition (DEMO-01 → 06)** — Héritage retiré (Mongo, auth, galerie, économie, gamification). Base remise à plat : lobby, pixels temps réel, `socket.id`.

**Pivot produit** — Fin du jeu communautaire persistant → outil B2B éphémère par session (host, groupes, vote, export ZIP). Zéro BDD, état en mémoire.


