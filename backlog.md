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

- **ADD-57** — **SEO + GEO** : meta (`title`, description, canonical, Open Graph / Twitter), `robots.txt`, `sitemap.xml`, JSON-LD, `llms.txt` (crawlers IA). Titres par route (landing + documentation). Copy landing actuelle trop générique (« Partagez vos assets ») — l'aligner sur le teambuilding pixel-art. Slice MVP de **FF-06**.
- **ADD-58** — **Bandeau bêta** : encart visible (landing + app) indiquant que c'est une bêta testée en conditions réelles ; retours bugs / frictions / idées à `hello@pixeltogether.ch`.
- **ADD-55** — **Favicon PixelTogether** : l’icône d’onglet est redevenue le favicon Angular par défaut (`frontend/public/favicon.ico` / `index.html`). Remettre l’icône PixelTogether (et vérifier qu’un `ng` / rebuild ne la réécrase pas). Bloquant partage / onglets campagne.

### MOYEN

- **ADD-59** — **Pass go-live campagne** : last check avant ramener du monde (CORS / `FRONTEND_URL` vs `pixeltogether.ch`, favicon, bandeau, meta sociales, logs qui écrivent bien en Docker `USER node`, parcours landing → WR → partie, doc, écran mobile, bannière connexion). Corriger les trous bloquants ; le reste → ticket.
- **ADD-60** — **Origines prod** : `.env.example` cite encore Vercel / `pixel.dokkcorp.ch`. Vérifier que CORS (`FRONTEND_URL`, `FRONTEND_URL2`) et le front (`runtime-config` / `environment`) ciblent le domaine campagne (`pixeltogether.ch` / API réelle). Le compose VPS a les mêmes origines.
- **ADD-62** — **Secrets héritage VPS** : le `docker-compose.yml` du VPS (`/home/debian/pixeltogether`) contient encore `JWT_SECRET` et `MONGOURL` (ancienne stack persistante, plus utilisés par le code actuel). Les retirer du compose ; rotator la clé Mongo si le cluster existe encore.

### INFO

- **ADD-61** — **Mentions minimales** : pied de page ou page courte (éditeur, contact `hello@pixeltogether.ch`, pas de compte / pas de tracking). Utile dès qu'on communique publiquement ; pas bloquant si le bandeau bêta + mail sont en place. lien "qu'est ce qu'on collecte" avec petit pop up qui fait la liste des données qu'on récup, clair et transparent.

## Questionnement, problèmatiques

- La limitation des couleurs pourraient exclure passivement certains joueurs s'ils ont des couleurs inutiles. Particulierement en coop a 8 joueur. (pret ?) 

## FF

Idées, évolutions et améliorations secondaires — tri libre.

- **FF-00** — **Logs conservés (export distant)** : après **ADD-56** (JSONL local / bot Grok). Export automatique vers un stockage perso accessible de partout (Google Drive, bucket, etc.) + rotation / rétention.
- **FF-01** — **Emojis d'émotion sur l'avatar** : réactions émotionnelles sur l'avatar.
- **FF-02** — **Composant modales warning** : composant unique pour toutes les modales de type « warning ».
- **FF-03** — **Config manager avancée** : taille de grille, pool 20–30 couleurs.
- **FF-04** — **Journal d'audit par partie** : preuve de service B2B, hors RAM.
- **FF-05** — **Landing portfolio** : documentation landing + README GitHub + grille de démo 8×8 animée (palettes exclusives joueurs fictifs) pour expliquer le concept en un coup d'œil.
- **FF-06** — **SEO avancé** : après **ADD-57** (meta + GEO de base). Prerender / SSR landing+doc, image OG dédiée, Search Console, hreflang EN quand **FF-15**.
- **FF-07** — **Mode démo** : 2–4 joueurs (manager inclus), **1 session** uniquement, durée max **15 min**, grille **75×75**. Format essai gratuit (landing / pitch) — friction minimale, distinct du coop et du compétitif payant (voir **FF-13**).
- **FF-08** — **Récap export PDF** : `recap.pdf` stylé dans le ZIP de fin de partie (en plus du `recap.txt`), modèle avec champs adaptables au nombre de sessions/joueurs — nom de partie, détail par session (groupes, votes), podium dessins + joueurs. Réutiliser `buildRecapData` côté back (`renderRecapPdf` à créer, ex. `pdfkit`).
- **FF-10** — **Constructeur d'avatar** : personnalisation (peau, chapeau…).
- **FF-11** — **Choix de musique manager** : pistes prédéfinies sélectionnables par le manager.
- **FF-13** — **Monétisation** : **mode démo** — 2–4 joueurs (manager inclus) ; **partie payante** — facturation à la minute (durée session × nombre de sessions) — **coop** : 2–16 joueurs (32 couleurs) ; **compét** : 6–40 joueurs. **À ne pas oublier** : disclaimer remboursement sur la modale « Fermer la partie » manager (ADD-48).
- **FF-14** — **Pixels posés par joueur dans le récap** : dans le récap final (`recap.txt` / export ZIP, et **FF-08** si PDF), afficher le nombre de pixels placés par joueur (par session et/ou total partie). S'appuyer sur `buildRecapData` — compter côté back à la fin de session ou agréger depuis l'état grille.
- **FF-15** - **Traduction** Donner la possibilité de passer en anglais