import test from 'node:test';
import assert from 'node:assert';
import { closeVote, castVote } from './voteLifecycle.js';
import { issueSession, purgePlayerSession } from '../reconnect/sessionToken.js';

function makeEvent(archiveGroups, activeVoteOverrides = {}, { managerConnected = false } = {}) {
  const event = {
    id: 'TEST01',
    status: 'waiting',
    sessionCount: 3,
    sessionDurationMinutes: 15,
    managerPlayerId: 'mgr-1',
    manager: 'sock-mgr',
    managerProfile: { pseudo: 'Boss', avatarColor: '#fff' },
    players: [{ playerId: 'p-1', pseudo: 'Alice', avatarColor: '#000' }],
    playerVoteTotals: {},
    sessionArchive: [{ sessionNumber: 1, theme: 'Test', groups: archiveGroups }],
    activeVote: {
      sessionNumber: 1,
      status: 'open',
      votes: {},
      winnerGroupCode: null,
      tiedGroupCodes: null,
      ...activeVoteOverrides,
    },
  };

  if (managerConnected) {
    issueSession(event, { playerId: 'mgr-1', role: 'manager', socketId: 'sock-mgr' });
  }

  return event;
}

test('closeVote — égalité (tiebreak ou roulette) et gagnant unique', () => {
  const tiedWithManager = makeEvent(
    [
      { groupCode: 'A', groupIndex: 1, label: 'G1', voteCount: 2, players: [] },
      { groupCode: 'B', groupIndex: 2, label: 'G2', voteCount: 2, players: [] },
    ],
    {},
    { managerConnected: true },
  );
  assert.strictEqual(closeVote(tiedWithManager).ok, true);
  assert.strictEqual(tiedWithManager.activeVote.status, 'tiebreak');
  purgePlayerSession('mgr-1');

  const tiedNoManager = makeEvent([
    { groupCode: 'A', groupIndex: 1, label: 'G1', voteCount: 2, players: [] },
    { groupCode: 'B', groupIndex: 2, label: 'G2', voteCount: 2, players: [] },
  ]);
  assert.strictEqual(closeVote(tiedNoManager).roulette, true);
  assert.strictEqual(tiedNoManager.activeVote.status, 'tiebreak_roulette');

  const clearWinner = makeEvent([
    { groupCode: 'A', groupIndex: 1, label: 'G1', voteCount: 3, players: [] },
    { groupCode: 'B', groupIndex: 2, label: 'G2', voteCount: 1, players: [] },
  ]);
  assert.strictEqual(closeVote(clearWinner).ok, true);
  assert.strictEqual(clearWinner.activeVote.status, 'closed');
  assert.strictEqual(clearWinner.activeVote.winnerGroupCode, 'A');
});

test('castVote — joueur refusé en tiebreak, manager tranche', () => {
  const event = makeEvent(
    [
      { groupCode: 'A', groupIndex: 1, label: 'G1', voteCount: 2, players: [{ playerId: 'p-1' }] },
      { groupCode: 'B', groupIndex: 2, label: 'G2', voteCount: 2, players: [{ playerId: 'p-2' }] },
    ],
    { status: 'tiebreak', tiedGroupCodes: ['A', 'B'] },
  );
  event.playerVoteTotals = { 'p-1': 2, 'p-2': 2 };

  assert.strictEqual(castVote(event, 'p-1', 'A').error, 'Vous ne pouvez pas voter.');

  assert.strictEqual(castVote(event, 'mgr-1', 'B').ok, true);
  assert.strictEqual(event.activeVote.status, 'closed');
  assert.strictEqual(event.activeVote.winnerGroupCode, 'B');
  const groupB = event.sessionArchive[0].groups.find((g) => g.groupCode === 'B');
  assert.strictEqual(groupB.voteCount, 3);
});
