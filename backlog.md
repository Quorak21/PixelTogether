# PixelTogether — Backlog

**Statut produit** : MVP team building livré (sessions, vote, podium). Ce fichier regroupe tout le travail restant.

| Fichier | Rôle |
|---------|------|
| `backlog.md` | **Tâches en cours** + **FF** (idées) + **Monétisation** (beaucoup plus tard) |
| `journal.md` | Jalons et tâches **terminées** |

> **Convention tickets** : `ID` — **Titre** : description. Gravité **CRITIQUE → ÉLEVÉ → MOYEN → INFO** pour les tâches en cours. Préfixes : **ADD-** (V1 / en cours), **FF-** (idées), **MON-** (monétisation, vraiment plus tard). Résolu → retirer d'ici + **une ligne** dans `journal.md`. Jamais de secrets en clair.

---

## Tâches en cours

Bugs, risques, dettes et chantiers actifs. L'agent peut y ajouter un ticket si un souci est repéré ; toi aussi quand tu dis « on fera plus tard ».

### CRITIQUE

- **ADD-Final- Beta** — **Pass go-live campagne** : last check avant ramener du monde (favicon, bandeau, meta sociales, logs, parcours landing → WR → partie, doc, écran mobile, bannière connexion). Corriger les trous bloquants ; le reste → ticket.

### ÉLEVÉ

Pas de tâches élevées pour le moment

### MOYEN

- **ADD-64** — **Encart « à venir » landing** : panneau à droite des cartes Coop / Compétitif, listant des features prévues avant la version définitive (teaser, pas tout le FF). Ton bêta, cohérent avec le bandeau. Desktop only.
- **ADD-66** — **Halo / carré clair autour des pixels (canvas jeu)** : depuis **ADD-46**, `strokeSelectiveGrid` trace des arêtes `#ddd` entre cellules de couleurs différentes — un pixel isolé a un cadre blanc-gris moche au zoom. Absent du PNG / rendu final (preview/export). Revoir le trait (plus discret, seulement la grille vide, ou option off). `frontend/src/app/features/game/canvas/canvas-grid.util.ts`.

### INFO

- **ADD-69** — **Catégorisation domaines sécurité** : soumettre `www.pixeltogether.ch`, `pixeltogether.ch`, `api.pixeltogether.ch`. **Constat DGEP** : catégorie **Games**. Cible FortiGuard : **Education** (fallback Web-based Applications / Business). Formulaire : https://www.fortiguard.com/faq/wfratingsubmit — Talos : https://www.talosintel.com/reputation_center/web_categorization — Palo Alto : https://urlfiltering.paloaltonetworks.com/ . Pitch EN : « PixelTogether is a B2B team-building web app for companies and schools: collaborative pixel-art sessions (exclusive color palettes per player), timed rounds, voting, and manager export. Not consumer gaming. Miscategorized as Games; blocked on school networks (DGEP). Please reclassify to Education. » Contact : `hello@pixeltogether.ch` / Dokk Corp. Captcha à valider à la main.

## Questionnement, problèmatiques

- La limitation des couleurs pourraient exclure passivement certains joueurs s'ils ont des couleurs inutiles. Particulierement en coop a 8 joueur. (preter ?) 

## FF

Idées, évolutions et améliorations secondaires — tri libre.

- **FF-01** — **Emojis d'émotion sur l'avatar** : réactions émotionnelles sur l'avatar.
- **FF-02** — **Composant modales warning** : composant unique pour toutes les modales de type « warning ».
- **FF-03** — **Config manager avancée** : taille de grille, pool 20–30 couleurs.
- **FF-05** — **Landing portfolio** : grille de démo 8×8 animée (palettes exclusives joueurs fictifs) pour expliquer le concept en un coup d'œil. Visuel à brancher sur **FF-16** (grande page doc).
- **FF-08** — **Récap export PDF** : `recap.pdf` stylé dans le ZIP de fin de partie (en plus du `recap.txt`), modèle avec champs adaptables au nombre de sessions/joueurs — nom de partie, détail par session (groupes, votes), podium dessins + joueurs. Réutiliser `buildRecapData` côté back (`renderRecapPdf` à créer, ex. `pdfkit`).
- **FF-10** — **Constructeur d'avatar** : personnalisation (peau, chapeau…).
- **FF-11** — **Choix de musique manager** : pistes prédéfinies sélectionnables par le manager.
- **FF-14** — **Pixels posés par joueur dans le récap** : dans le récap final (`recap.txt` / export ZIP, et **FF-08** si PDF), afficher le nombre de pixels placés par joueur (par session et/ou total partie). S'appuyer sur `buildRecapData` — compter côté back à la fin de session ou agréger depuis l'état grille.
- **FF-15** — **Traduction EN** : passer l’app (et la doc) en anglais. Vrai step-up marché hors Romandie / Europe FR ; c’est là qu’on ajoute hreflang + copy EN (suite de **ADD-67**).
- **FF-16** — **Site vitrine + CTA Jouer** : `/` devient une grande page (présentation, doc, preuves) avec un gros bouton **Jouer** toujours visible au scroll. Le bouton mène à la landing actuelle (création coop/compét + code). La page `/documentation` peut être absorbée ou rester un ancre de cette vitrine.
- **FF-17** — **Self-host VPS** : front nginx à côté du back, quitter Vercel, GitHub privé OK, Java Dokk ailleurs (ex. mini-pc). **Revoir la sécu VPS** (SSH, firewall, updates — secrets compose nettoyés en **ADD-62**). **Cloudflare** en façade (DNS / proxy / DDoS) plutôt au moment de **MON-02**, pour un setup plus pro.
- **FF-18** — **Identité visuelle** : remplacer d’un coup le logo vite-fait (`logoPixel500.png`), favicons, icône navbar et `og-1200x630.png` (carte LinkedIn) quand le visuel définitif existe.

## Monétisation

Vraiment plus tard — après les campagnes FR et un usage réel. Ne pas piocher ici dans le quotidien.

- **MON-01** — **Mode démo** : 2–4 joueurs (manager inclus), **1 session** uniquement, durée max **15 min**, grille **75×75**. Format essai gratuit (landing / pitch) — friction minimale, distinct du coop et du compétitif payant (voir **MON-02**).
- **MON-02** — **Parties payantes** : facturation à la minute (durée session × nombre de sessions) — **coop** : 2–16 joueurs (32 couleurs) ; **compét** : 6–40 joueurs. **À ne pas oublier** : disclaimer remboursement sur la modale « Fermer la partie » manager (ADD-48).