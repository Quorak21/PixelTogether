import test from 'node:test';
import assert from 'node:assert';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  resetLogDirCache,
  writeLog,
  logPartyEnded,
  logError,
  getLogFile,
  countPartyPlayers,
} from './logger.js';

async function withTempLogDir(fn) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'pxl-logs-'));
  const previous = process.env.LOG_DIR;
  process.env.LOG_DIR = dir;
  resetLogDirCache();
  try {
    await fn(dir);
  } finally {
    if (previous === undefined) delete process.env.LOG_DIR;
    else process.env.LOG_DIR = previous;
    resetLogDirCache();
  }
}

test('writeLog — une ligne JSON compacte et SCHEMA.md copié', async () => {
  await withTempLogDir(async (dir) => {
    await writeLog({ level: 'info', type: 'party.started', eventId: 'AB12CD' });
    const raw = await readFile(getLogFile(), 'utf8');
    const lines = raw.trimEnd().split('\n');
    assert.strictEqual(lines.length, 1);
    const parsed = JSON.parse(lines[0]);
    assert.strictEqual(parsed.type, 'party.started');
    assert.strictEqual(parsed.eventId, 'AB12CD');
    assert.ok(parsed.ts);

    const schema = await readFile(path.join(dir, 'SCHEMA.md'), 'utf8');
    assert.match(schema, /une ligne = un event/);
  });
});

test('logPartyEnded — ignore une partie jamais lancée', async () => {
  await withTempLogDir(async () => {
    logPartyEnded({ id: 'ZZZZZZ', partyStarted: false, gameMode: 'coop' }, 'manager_closed');
    await writeLog({ level: 'info', type: 'probe' });
    const raw = await readFile(getLogFile(), 'utf8');
    const types = raw
      .trimEnd()
      .split('\n')
      .map((line) => JSON.parse(line).type);
    assert.deepStrictEqual(types, ['probe']);
  });
});

test('logError — stack multiligne reste une seule ligne fichier', async () => {
  await withTempLogDir(async () => {
    const err = new Error('boom');
    err.stack = 'Error: boom\n    at foo.js:1:1\n    at bar.js:2:2';
    await logError(err);
    const raw = await readFile(getLogFile(), 'utf8');
    const lines = raw.trimEnd().split('\n');
    assert.strictEqual(lines.length, 1);
    const parsed = JSON.parse(lines[0]);
    assert.strictEqual(parsed.level, 'error');
    assert.match(parsed.stack, /foo\.js/);
  });
});

test('countPartyPlayers — invités + manager', () => {
  assert.strictEqual(
    countPartyPlayers({
      players: [{}, {}, {}],
      managerProfile: { pseudo: 'M' },
    }),
    4,
  );
  assert.strictEqual(countPartyPlayers({ players: [{}] }), 1);
});
