import test from 'node:test';
import assert from 'node:assert';
import { computeGroupSizes, shuffleArray, splitIntoGroups } from './groupShuffle.js';

test('groupShuffle - computeGroupSizes', async (t) => {
  await t.test('returns empty array for less than 2 players', () => {
    assert.deepStrictEqual(computeGroupSizes(0), []);
    assert.deepStrictEqual(computeGroupSizes(1), []);
  });

  await t.test('returns single group size for 2, 3 or 4 players', () => {
    assert.deepStrictEqual(computeGroupSizes(2), [2]);
    assert.deepStrictEqual(computeGroupSizes(3), [3]);
    assert.deepStrictEqual(computeGroupSizes(4), [4]);
  });

  await t.test('splits larger groups into balanced sizes of 2-4 players', () => {
    assert.deepStrictEqual(computeGroupSizes(5), [3, 2]);
    assert.deepStrictEqual(computeGroupSizes(6), [3, 3]);
    assert.deepStrictEqual(computeGroupSizes(7), [4, 3]);
    assert.deepStrictEqual(computeGroupSizes(8), [4, 4]);
    assert.deepStrictEqual(computeGroupSizes(9), [3, 3, 3]);
    assert.deepStrictEqual(computeGroupSizes(10), [4, 3, 3]);
    assert.deepStrictEqual(computeGroupSizes(11), [4, 4, 3]);
    assert.deepStrictEqual(computeGroupSizes(12), [4, 4, 4]);
    assert.deepStrictEqual(computeGroupSizes(13), [4, 3, 3, 3]);
    assert.deepStrictEqual(computeGroupSizes(16), [4, 4, 4, 4]);
  });
});

test('groupShuffle - shuffleArray', async (t) => {
  await t.test('returns a new array with same items', () => {
    const original = ['alice', 'bob', 'charlie', 'david', 'eve'];
    const shuffled = shuffleArray(original);
    
    assert.notEqual(original, shuffled); // should be a new array reference
    assert.strictEqual(original.length, shuffled.length);
    
    // check that elements are the same
    const sortedOrig = [...original].sort();
    const sortedShuf = [...shuffled].sort();
    assert.deepStrictEqual(sortedOrig, sortedShuf);
  });
});

test('groupShuffle - splitIntoGroups', async (t) => {
  await t.test('splits players list according to group sizes', () => {
    const players = ['p1', 'p2', 'p3', 'p4', 'p5'];
    const groups = splitIntoGroups(players);
    
    assert.strictEqual(groups.length, 2);
    // group sizes should be 3 and 2 (as computeGroupSizes(5) returns [3, 2])
    const totalCount = groups.reduce((acc, g) => acc + g.length, 0);
    assert.strictEqual(totalCount, players.length);
    
    const sizes = groups.map(g => g.length).sort((a, b) => b - a);
    assert.deepStrictEqual(sizes, [3, 2]);
    
    // check that all players are in one of the groups
    const flatPlayers = groups.flat();
    assert.deepStrictEqual([...flatPlayers].sort(), [...players].sort());
  });
});
