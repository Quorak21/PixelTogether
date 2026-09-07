# PixelTogether — schéma des logs

Fichier : `events.jsonl`  
Contrat : **une ligne = un event**. JSON compact, pas de pretty-print.

Champs communs : `ts` (ISO-8601 UTC), `level` (`info` | `error`), `type`.

Pas de PII : pas de pseudo, chat, pixels, IP.

## `party.started` (`level: info`)

Émis au premier lancement de partie (`startGame`), pas à la création du salon.

| Champ | Sens |
|-------|------|
| `eventId` | Code salon 6 caractères |
| `gameMode` | `coop` ou `competitive` |
| `playerCount` | Joueurs inscrits + manager |
| `sessionCount` | Manches prévues |

## `party.ended` (`level: info`)

Émis seulement si la partie avait démarré.

| Champ | Sens |
|-------|------|
| `eventId` | Code salon |
| `gameMode` | `coop` ou `competitive` |
| `playerCount` | Effectif au moment de la fermeture |
| `sessionCount` | Manches prévues |
| `sessionsCompleted` | Manches réellement terminées (archive) |
| `durationMs` | Durée depuis `party.started` |
| `completed` | `true` si galerie coop / podium compétitif atteint |
| `endReason` | Voir ci-dessous |

`endReason` :

- `completed` — clôture normale (manager, après podium/galerie)
- `manager_closed` — fermeture manuelle en cours de partie
- `manager_absent` — manager parti trop longtemps (salle d'attente)
- `players_left` — trop de joueurs partis (seuil 50 %, compétitif)
- `inactivity` — salon inactif ~2 h
- `auto_pilot` — clôture auto après podium (manager absent)
- `server_shutdown` — SIGTERM / SIGINT / crash process
- `unknown` — fallback

## `error` (`level: error`)

| Champ | Sens |
|-------|------|
| `message` | Message |
| `stack` | Stack (échappée, toujours une seule ligne JSON) |
| `eventId` | Si connu |

## Urgences (bot)

Traiter comme urgent : `level=error`, ou `party.ended` avec `completed=false`.
