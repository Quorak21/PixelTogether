import test from 'node:test';
import assert from 'node:assert';
import { splitPalette, assignPalettesToGroup } from './colorSplit.js';
import { GAME_PALETTE_16 } from '../../config/constants.js';

test('colorSplit - splitPalette', async (t) => {
  await t.test('returns empty array if playerCount < 1', () => {
    assert.deepStrictEqual(splitPalette(GAME_PALETTE_16, 0), []);
    assert.deepStrictEqual(splitPalette(GAME_PALETTE_16, -1), []);
  });

  await t.test('splits palette into equal sizes with remainder distributed', () => {
    const pool = ['#1', '#2', '#3', '#4', '#5', '#6', '#7', '#8', '#9', '#10'];
    const slices = splitPalette(pool, 3);

    assert.strictEqual(slices.length, 3);
    
    // sizes should be: 4, 3, 3 (remainder = 10 % 3 = 1)
    const sizes = slices.map(s => s.length);
    assert.deepStrictEqual(sizes, [4, 3, 3]);

    // all elements are unique and sum up to 10
    const flat = slices.flat();
    assert.strictEqual(flat.length, 10);
    assert.deepStrictEqual([...flat].sort(), [...pool].sort());
  });
});

test('colorSplit - assignPalettesToGroup', async (t) => {
  await t.test('assigns disjoint subsets of GAME_PALETTE_16 to players', () => {
    const players = [
      { socketId: 's1', pseudo: 'Alice' },
      { socketId: 's2', pseudo: 'Bob' },
      { socketId: 's3', pseudo: 'Charlie' }
    ];
    const group = { players };

    assignPalettesToGroup(group);

    assert.strictEqual(group.players.length, 3);
    
    // verify that every player has assignedColors
    const allAssigned = [];
    for (const player of group.players) {
      assert.ok(Array.isArray(player.assignedColors));
      assert.ok(player.assignedColors.length > 0);
      
      // verify colors are lowercase
      for (const color of player.assignedColors) {
        assert.strictEqual(color, color.toLowerCase());
        assert.ok(GAME_PALETTE_16.map(c => c.toLowerCase()).includes(color));
        allAssigned.push(color);
      }
    }

    // verify colors are disjoint (no duplicate color assigned to multiple players)
    const uniqueAssigned = new Set(allAssigned);
    assert.strictEqual(uniqueAssigned.size, allAssigned.length);
  });
});
