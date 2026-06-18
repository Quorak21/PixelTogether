import { GAME_PALETTE_16 } from '../../config/constants.js';
import { shuffleArray } from '../shuffle/groupShuffle.js';

/**
 * Découpe une palette de couleurs (le pool) en parts les plus égales possibles pour chaque joueur.
 * S'il reste des couleurs après la division entière (le reste), on en donne une supplémentaire 
 * aux premiers joueurs de la liste jusqu'à ce qu'il n'y ait plus de reste.
 * 
 * @param {string[]} pool - Le tableau de couleurs de départ (généralement GAME_PALETTE_16).
 * @param {number} playerCount - Le nombre de joueurs dans le groupe.
 * @returns {string[][]} Un tableau contenant les sous-ensembles de couleurs pour chaque joueur.
 */
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

/**
 * Mélange les joueurs d'un groupe et leur attribue à chacun un sous-ensemble unique et exclusif
 * de la palette globale de 16 couleurs du jeu.
 * Ainsi, deux joueurs d'un même groupe ne dessineront jamais avec les mêmes couleurs !
 * 
 * @param {Object} group - Le groupe de joueurs auquel attribuer les couleurs.
 */
export function assignPalettesToGroup(group) {
  const orderedPlayers = shuffleArray(group.players);
  const slices = splitPalette(GAME_PALETTE_16, orderedPlayers.length);

  for (let i = 0; i < orderedPlayers.length; i++) {
    orderedPlayers[i].assignedColors = slices[i].map((color) => color.toLowerCase());
  }

  group.players = orderedPlayers;
}
