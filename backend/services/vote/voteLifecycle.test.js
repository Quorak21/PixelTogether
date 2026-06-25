import test from 'node:test';
import assert from 'node:assert';
import {
  findTiedTopGroups,
  pickWinner,
  closeVote,
  castVote,
  buildTopGrids,
} from './voteLifecycle.js';

function makeArchive(groups) {
  return { sessionNumber: 1, theme: 'Test', groups };
}

function makeEvent(archiveGroups, activeVoteOverrides = {}) {
  return {
    status: 'waiting',
    managerPlayerId: 'mgr-1',
    managerProfile: { pseudo: 'Boss', avatarColor: '#fff' },
    players: [{ playerId: 'p-1', pseudo: 'Alice', avatarColor: '#000' }],
    playerVoteTotals: {},
    sessionArchive: [makeArchive(archiveGroups)],
    activeVote: {
      sessionNumber: 1,
      status: 'open',
      votes: {},
      winnerGroupCode: null,
      tiedGroupCodes: null,
      ...activeVoteOverrides,
    },
  };
}

test('findTiedTopGroups — gagnant unique', () => {
  const archive = makeArchive([
    { groupCode: 'A', groupIndex: 1, voteCount: 3 },
    { groupCode: 'B', groupIndex: 2, voteCount: 1 },
  ]);
  const tied = findTiedTopGroups(archive);
  assert.strictEqual(tied.length, 1);
  assert.strictEqual(tied[0].groupCode, 'A');
});

test('findTiedTopGroups — double égalité', () => {
  const archive = makeArchive([
    { groupCode: 'A', groupIndex: 1, voteCount: 2 },
    { groupCode: 'B', groupIndex: 2, voteCount: 2 },
    { groupCode: 'C', groupIndex: 3, voteCount: 0 },
  ]);
  const tied = findTiedTopGroups(archive);
  assert.strictEqual(tied.length, 2);
  assert.deepStrictEqual(tied.map((g) => g.groupCode).sort(), ['A', 'B']);
});

test('findTiedTopGroups — tous à zéro', () => {
  const archive = makeArchive([
    { groupCode: 'A', groupIndex: 1, voteCount: 0 },
    { groupCode: 'B', groupIndex: 2, voteCount: 0 },
  ]);
  assert.strictEqual(findTiedTopGroups(archive).length, 2);
});

test('pickWinner — retourne null en cas d\'égalité', () => {
  const archive = makeArchive([
    { groupCode: 'A', groupIndex: 1, voteCount: 1 },
    { groupCode: 'B', groupIndex: 2, voteCount: 1 },
  ]);
  assert.strictEqual(pickWinner(archive), null);
});

test('pickWinner — retourne le gagnant unique', () => {
  const archive = makeArchive([
    { groupCode: 'A', groupIndex: 1, voteCount: 2 },
    { groupCode: 'B', groupIndex: 2, voteCount: 1 },
  ]);
  assert.strictEqual(pickWinner(archive), 'A');
});

test('closeVote — passe en tiebreak si égalité', () => {
  const event = makeEvent([
    { groupCode: 'A', groupIndex: 1, label: 'Groupe 1', voteCount: 2, players: [] },
    { groupCode: 'B', groupIndex: 2, label: 'Groupe 2', voteCount: 2, players: [] },
  ]);

  const result = closeVote(event);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(event.activeVote.status, 'tiebreak');
  assert.deepStrictEqual(event.activeVote.tiedGroupCodes?.sort(), ['A', 'B']);
  assert.strictEqual(event.activeVote.winnerGroupCode, null);
});

test('closeVote — ferme directement si gagnant unique', () => {
  const event = makeEvent([
    { groupCode: 'A', groupIndex: 1, label: 'Groupe 1', voteCount: 3, players: [] },
    { groupCode: 'B', groupIndex: 2, label: 'Groupe 2', voteCount: 1, players: [] },
  ]);

  const result = closeVote(event);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(event.activeVote.status, 'closed');
  assert.strictEqual(event.activeVote.winnerGroupCode, 'A');
});

test('castVote en tiebreak — refuse un joueur', () => {
  const event = makeEvent(
    [
      { groupCode: 'A', groupIndex: 1, label: 'Groupe 1', voteCount: 2, players: [] },
      { groupCode: 'B', groupIndex: 2, label: 'Groupe 2', voteCount: 2, players: [] },
    ],
    { status: 'tiebreak', tiedGroupCodes: ['A', 'B'] },
  );

  const result = castVote(event, 'p-1', 'A');
  assert.strictEqual(result.error, 'Vous ne pouvez pas voter.');
});

test('castVote en tiebreak — manager tranche et +1 vote sur la grille choisie', () => {
  const event = makeEvent(
    [
      {
        groupCode: 'A',
        groupIndex: 1,
        label: 'Groupe 1',
        voteCount: 2,
        players: [{ playerId: 'p-1' }],
      },
      {
        groupCode: 'B',
        groupIndex: 2,
        label: 'Groupe 2',
        voteCount: 2,
        players: [{ playerId: 'p-2' }],
      },
    ],
    { status: 'tiebreak', tiedGroupCodes: ['A', 'B'] },
  );
  event.playerVoteTotals = { 'p-1': 2, 'p-2': 2 };

  const result = castVote(event, 'mgr-1', 'B');
  assert.strictEqual(result.ok, true);
  assert.strictEqual(event.activeVote.status, 'closed');
  assert.strictEqual(event.activeVote.winnerGroupCode, 'B');

  const groupA = event.sessionArchive[0].groups.find((g) => g.groupCode === 'A');
  const groupB = event.sessionArchive[0].groups.find((g) => g.groupCode === 'B');
  assert.strictEqual(groupA.voteCount, 2);
  assert.strictEqual(groupB.voteCount, 3);
  assert.strictEqual(event.playerVoteTotals['p-1'], 2);
  assert.strictEqual(event.playerVoteTotals['p-2'], 3);

  const topGrids = buildTopGrids(event, 3);
  assert.strictEqual(topGrids[0].label, 'Groupe 2 — Session 1');
  assert.strictEqual(topGrids[0].voteCount, 3);
});
