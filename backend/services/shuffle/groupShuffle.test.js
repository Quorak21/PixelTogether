import test from 'node:test';
import assert from 'node:assert';
import { computeGroupSizes, splitIntoGroups } from './groupShuffle.js';

test('groupShuffle — tailles 2-4 et répartition complète', () => {
  assert.deepStrictEqual(computeGroupSizes(0), []);
  assert.deepStrictEqual(computeGroupSizes(4), [2, 2]);
  assert.deepStrictEqual(computeGroupSizes(7), [4, 3]);
  assert.deepStrictEqual(computeGroupSizes(10), [4, 3, 3]);

  const players = ['p1', 'p2', 'p3', 'p4', 'p5'];
  const groups = splitIntoGroups(players);
  assert.deepStrictEqual(groups.map((g) => g.length).sort((a, b) => b - a), [3, 2]);
  assert.deepStrictEqual(groups.flat().sort(), players.sort());
});
