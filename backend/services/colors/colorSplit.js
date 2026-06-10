import { GAME_PALETTE_16 } from '../../config/constants.js';
import { shuffleArray } from '../shuffle/groupShuffle.js';

export function splitPalette(pool, playerCount) {
  if (playerCount < 1) {
    return [];
  }

  const shuffled = shuffleArray(pool);
  const base = Math.floor(shuffled.length / playerCount);
  const remainder = shuffled.length % playerCount;
  const slices = [];
  let offset = 0;

  for (let i = 0; i < playerCount; i++) {
    const size = base + (i < remainder ? 1 : 0);
    slices.push(shuffled.slice(offset, offset + size));
    offset += size;
  }

  return slices;
}

export function assignPalettesToGroup(group) {
  const orderedPlayers = shuffleArray(group.players);
  const slices = splitPalette(GAME_PALETTE_16, orderedPlayers.length);

  for (let i = 0; i < orderedPlayers.length; i++) {
    orderedPlayers[i].assignedColors = slices[i].map((color) => color.toLowerCase());
  }

  group.players = orderedPlayers;
}
