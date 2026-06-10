import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GAME_PALETTE_16 } from '../../config/constants.js';
import { splitPalette, assignPalettesToGroup } from './colorSplit.js';

describe('splitPalette', () => {
  const pool = [...GAME_PALETTE_16];

  for (const count of [2, 3, 4]) {
    it(`uses all ${pool.length} colors exactly once for ${count} players`, () => {
      const slices = splitPalette(pool, count);
      assert.equal(slices.length, count);
      const flat = slices.flat();
      assert.equal(flat.length, pool.length);
      assert.equal(new Set(flat).size, pool.length);
      for (const color of pool) {
        assert.ok(flat.includes(color));
      }
    });
  }

  it('splits 16 colors as 8/8 for 2 players', () => {
    const slices = splitPalette(pool, 2);
    assert.deepEqual(slices.map((s) => s.length), [8, 8]);
  });

  it('splits 16 colors as 6/5/5 for 3 players', () => {
    const slices = splitPalette(pool, 3);
    assert.deepEqual(slices.map((s) => s.length).sort((a, b) => b - a), [6, 5, 5]);
  });

  it('splits 16 colors as 4/4/4/4 for 4 players', () => {
    const slices = splitPalette(pool, 4);
    assert.deepEqual(slices.map((s) => s.length), [4, 4, 4, 4]);
  });
});

describe('assignPalettesToGroup', () => {
  function makeGroup(size) {
    return {
      players: Array.from({ length: size }, (_, i) => ({
        socketId: `p${i}`,
        pseudo: `Player${i}`,
        avatarColor: '#ef4444',
      })),
    };
  }

  for (const size of [2, 3, 4]) {
    it(`assigns disjoint palettes to ${size} players`, () => {
      const group = makeGroup(size);
      assignPalettesToGroup(group);

      const allAssigned = group.players.flatMap((p) => p.assignedColors);
      assert.equal(allAssigned.length, GAME_PALETTE_16.length);
      assert.equal(new Set(allAssigned).size, GAME_PALETTE_16.length);

      for (let i = 0; i < group.players.length; i++) {
        for (let j = i + 1; j < group.players.length; j++) {
          const a = new Set(group.players[i].assignedColors);
          const overlap = group.players[j].assignedColors.filter((c) => a.has(c));
          assert.equal(overlap.length, 0);
        }
      }
    });
  }
});
