import test from 'node:test';
import assert from 'node:assert';
import { getOrBuildExportZip } from './sessionZip.js';
import { generateGridImage } from '../grid/gridPreview.js';
import { GAME_MODE_COMPETITIVE } from '../../config/constants.js';

test('getOrBuildExportZip — produit un buffer ZIP non vide', async () => {
  const image = generateGridImage({ '0,0': '#ff0000' }, 75);
  const event = {
    id: 'ABC123',
    partyName: 'Test Party',
    gameMode: GAME_MODE_COMPETITIVE,
    players: [{ playerId: 'p-1', pseudo: 'Alice', avatarColor: '#111' }],
    playerVoteTotals: { 'p-1': 5 },
    sessionArchive: [
      {
        sessionNumber: 1,
        theme: 'Maison',
        groups: [
          {
            groupCode: 'A',
            groupIndex: 1,
            label: 'Groupe A',
            voteCount: 5,
            image,
            players: [{ pseudo: 'Alice' }],
          },
        ],
      },
    ],
  };

  const first = await getOrBuildExportZip(event);
  const second = await getOrBuildExportZip(event);

  assert.ok(first.buffer.length > 100);
  assert.match(first.filename, /^pixeltogether-test-party\.zip$/);
  assert.strictEqual(first.buffer, second.buffer);
});
