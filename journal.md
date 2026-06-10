# 📓 Journal de bord — PixelTogether

**Rôle** : mémoire de ce qui est **fait** — résumés de phase, pas le détail ticket par ticket.

| Fichier | Rôle |
|---------|------|
| `road_map.md` | Prochaines phases + idées futures |
| `dette_technique.md` | Bugs et flows pourris (non bloquants) |
| `journal.md` | Ce qu'on a **terminé** (résumés) |

> **Convention** : entrées du **plus récent au plus ancien**. Une entrée = **une phase clôturée** (ou un jalon historique majeur). Pas de P1-01, P1-02… ici — le détail vit dans git / les PR. Quand une dette est résolue : retirée de `dette_technique.md` + **une ligne** ajoutée ici.

---

## Entrées

**P3-04** — Pool **16 couleurs** par groupe (`GAME_PALETTE_16`), split exclusif 8/8 · 6-5-5 · 4×4 via `colorSplit` + `beginSession` / `dissolveSessionGroups`. Palettes sur modale transition (swatches par joueur) ; `gridState` et `pixelPlaced` scopés par joueur. Cycle session (brique 1) : manager **Arrêter la session** depuis le lobby → `sessionEnded` → waiting room, roster conservé. Hooks prêts pour P3-07. Hors scope : vote, session N+1 auto, UI refonte (→ P3-UI-01).

**BACK-03 / BACK-REFACTOR** — Découpage de `backend/index.js` (~777 lignes → bootstrap ~8 lignes) : `config/constants.js`, `store/eventStore.js`, `lib/` (participants, payloads, preview, lifecycle), handlers Socket par domaine (`lobby`, `waitingRoom`, `game`, `lifecycle`), `app/createServer.js`. Contrat Socket inchangé.

**Phase 3 — Boucle gameplay (slice 1)** — Event + groupes en mémoire (`activeEvents`), shuffle équilibré (2–4 joueurs, priorité groupes de 4) au `startGame`, une grille 75×75 par groupe. Routes `/game/:eventId/:groupCode`, `/lobby/:eventId` (lobby existant adapté). Création : **nom de partie** + **thème** ; waiting room affiche le nom. Modales transition 5 s (joueur : équipe + « Groupe N » ; manager : récap puis lobby). Lobby host : titre = nom de partie, sous-titre thème + Session 1/1, cards « Groupe N » + previews live. Jeu : spectateur manager (chat, pas pixel/palette, retour lobby), navbar = nom de partie, chat et palette contextualisés (groupe / thème). Fermeture event → landing (`/`). Hors scope : multi-session, vote, pool 20 couleurs, barre joueurs, `sessionCount` configurable.

**Phase 2 — Waiting room** — Salle d'attente `/room/:id` entre landing et jeu : onboarding pseudo + couleur avatar (`AVATAR_COLORS`, placeholder Lucide `User`), cards joueurs temps réel, modales host (inviter avec code stream + URL, démarrer min. 2 joueurs). Serveur : `status` waiting/started, `registerPlayer`, `startGame`, verrou `joinRoom`. Navbar : profil avatar + pseudo ; chat par pseudo. Hors scope : F5/reconnexion, chat waiting room, grille d'attente.

**Phase 1 — Base gameplay fonctionnelle** — Socle jouable : landing host, création de partie (code 6 car.), join par code, grille 75×75 collaborative, pixels temps réel, chat, palette, lobby. P1-06 (constantes socket) abandonné : strings littérales conservées.

**P1-05** — Refonte game page : thème en navbar, layout fixe (chat à droite, palette en bas), palette sans gomme avec blanc posable, zoom molette + déplacement clic droit, fit initial de la grille.

**Démolition (DEMO-01 → 06)** — Héritage retiré (Mongo, auth, galerie, économie, gamification). Base remise à plat : lobby, pixels temps réel, `socket.id`.

**Pivot produit** — Fin du jeu communautaire persistant → outil B2B éphémère par session (host, groupes, vote, export ZIP). Zéro BDD, état en mémoire.
