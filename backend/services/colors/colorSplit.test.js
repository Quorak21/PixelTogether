import test from 'node:test';
import assert from 'node:assert';
import { splitPalette, assignPalettesToGroup } from './colorSplit.js';
import { GAME_PALETTE_16 } from '../../config/constants.js';

test('colorSplit — découpage équitable et palettes disjointes', () => {
  const pool = ['#1', '#2', '#3', '#4', '#5', '#6', '#7', '#8', '#9', '#10'];
  const slices = splitPalette(pool, 3);
  assert.deepStrictEqual(slices.map((s) => s.length), [4, 3, 3]);
  assert.deepStrictEqual(slices.flat().sort(), pool.sort());

  const group = {
    players: [
      { socketId: 's1', pseudo: 'Alice' },
      { socketId: 's2', pseudo: 'Bob' },
      { socketId: 's3', pseudo: 'Charlie' },
    ],
  };
  assignPalettesToGroup(group);

  const allAssigned = group.players.flatMap((p) => p.assignedColors);
  assert.strictEqual(new Set(allAssigned).size, allAssigned.length);
  for (const color of allAssigned) {
    assert.ok(GAME_PALETTE_16.map((c) => c.toLowerCase()).includes(color));
  }
});
