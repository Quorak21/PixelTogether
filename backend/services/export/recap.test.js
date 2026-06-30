import test from 'node:test';
import assert from 'node:assert';
import { buildRecapData, renderRecapTxt } from './recap.js';
import { GAME_MODE_COMPETITIVE, GAME_MODE_COOP } from '../../config/constants.js';

test('renderRecapTxt — compétitif deux sessions avec podium', () => {
  const event = {
    partyName: 'Team Building ACME',
    gameMode: GAME_MODE_COMPETITIVE,
    players: [
      { playerId: 'p-1', pseudo: 'Alice', avatarColor: '#111' },
      { playerId: 'p-2', pseudo: 'Bob', avatarColor: '#222' },
    ],
    playerVoteTotals: { 'p-1': 43, 'p-2': 12 },
    sessionArchive: [
      {
        sessionNumber: 1,
        theme: 'Animaux',
        groups: [
          {
            groupCode: 'A',
            groupIndex: 1,
            label: 'Groupe A',
            voteCount: 5,
            players: [{ pseudo: 'Alice' }],
          },
          {
            groupCode: 'B',
            groupIndex: 2,
            label: 'Groupe B',
            voteCount: 8,
            players: [{ pseudo: 'Bob' }],
          },
        ],
      },
      {
        sessionNumber: 2,
        theme: 'Maison',
        groups: [
          {
            groupCode: 'C',
            groupIndex: 1,
            label: 'Groupe A',
            voteCount: 10,
            players: [{ pseudo: 'Alice' }, { pseudo: 'Bob' }],
          },
          {
            groupCode: 'D',
            groupIndex: 2,
            label: 'Groupe B',
            voteCount: 12,
            players: [{ pseudo: 'Bob' }],
          },
        ],
      },
    ],
  };

  const text = renderRecapTxt(buildRecapData(event));

  assert.match(text, /Partie : Team Building ACME/);
  assert.match(text, /Mode : Compétitif/);
  assert.match(text, /Thème : Maison/);
  assert.match(text, /1\. Groupe B — 12 votes/);
  assert.match(text, /Top dessins/);
  assert.match(text, /1\. Thème : Maison - Groupe B — 12 votes/);
  assert.match(text, /Top joueurs/);
  assert.match(text, /1\. Alice — 43 votes/);
  assert.doesNotMatch(text, /Code :/);
});

test('renderRecapTxt — coop minimal participants et thèmes', () => {
  const event = {
    partyName: 'Coop Fun',
    gameMode: GAME_MODE_COOP,
    players: [
      { playerId: 'p-1', pseudo: 'Alice', avatarColor: '#111' },
      { playerId: 'p-2', pseudo: 'Bob', avatarColor: '#222' },
    ],
    sessionArchive: [
      {
        sessionNumber: 1,
        theme: 'Animaux',
        groups: [{ groupCode: 'A', label: 'Animaux', voteCount: 0, players: [{ pseudo: 'Alice' }] }],
      },
      {
        sessionNumber: 2,
        theme: 'Maison',
        groups: [{ groupCode: 'A', label: 'Maison', voteCount: 0, players: [{ pseudo: 'Bob' }] }],
      },
    ],
  };

  const text = renderRecapTxt(buildRecapData(event));

  assert.match(text, /Mode : Coopératif/);
  assert.match(text, /Participants :\n  Alice, Bob/);
  assert.match(text, /── Session 1 ──/);
  assert.match(text, /Thème : Animaux/);
  assert.match(text, /── Session 2 ──/);
  assert.match(text, /Thème : Maison/);
  assert.doesNotMatch(text, /Top dessins/);
  assert.doesNotMatch(text, /Top joueurs/);
  assert.doesNotMatch(text, /votes/);
});
