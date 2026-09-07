import { appendFile, copyFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_SRC = path.join(HERE, 'SCHEMA.md');

let preparedDir = null;

export function getLogDir() {
  return process.env.LOG_DIR || path.join(process.cwd(), 'logs');
}

export function getLogFile() {
  return path.join(getLogDir(), 'events.jsonl');
}

/** Pour les tests : oublier le cache de dossier déjà préparé. */
export function resetLogDirCache() {
  preparedDir = null;
}

export async function ensureLogDir() {
  const dir = getLogDir();
  if (preparedDir === dir) return dir;

  await mkdir(dir, { recursive: true });
  const dest = path.join(dir, 'SCHEMA.md');
  if (!existsSync(dest)) {
    await copyFile(SCHEMA_SRC, dest);
  }
  preparedDir = dir;
  return dir;
}

/**
 * Une ligne JSON compacte. Les retours dans `stack` sont échappés par stringify.
 * Ne jette jamais : un échec disque ne doit pas casser une partie.
 */
export function writeLog(entry) {
  const line = `${JSON.stringify({ ts: new Date().toISOString(), ...entry })}\n`;
  return ensureLogDir()
    .then(() => appendFile(getLogFile(), line, 'utf8'))
    .catch(() => {});
}

export function countPartyPlayers(event) {
  const guests = Array.isArray(event?.players) ? event.players.length : 0;
  return guests + (event?.managerProfile ? 1 : 0);
}

function isPartyCompleted(event) {
  if (event.gameMode === 'coop') return event.coopWrMode === 'gallery';
  return Boolean(event.showingResults);
}

export function logPartyStarted(event) {
  return writeLog({
    level: 'info',
    type: 'party.started',
    eventId: event.id,
    gameMode: event.gameMode,
    playerCount: countPartyPlayers(event),
    sessionCount: event.sessionCount,
  });
}

export function logPartyEnded(event, endReason = 'unknown') {
  if (!event?.partyStarted) return Promise.resolve();

  return writeLog({
    level: 'info',
    type: 'party.ended',
    eventId: event.id,
    gameMode: event.gameMode,
    playerCount: countPartyPlayers(event),
    sessionCount: event.sessionCount,
    sessionsCompleted: Array.isArray(event.sessionArchive) ? event.sessionArchive.length : 0,
    durationMs: event.startedAt ? Date.now() - event.startedAt : 0,
    completed: isPartyCompleted(event),
    endReason,
  });
}

export function logError(error, extra = {}) {
  const err = error instanceof Error ? error : new Error(String(error));
  return writeLog({
    level: 'error',
    type: 'error',
    message: err.message,
    stack: err.stack,
    ...extra,
  });
}
