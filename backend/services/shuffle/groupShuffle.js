/**
 * Calcule des tailles de groupes équilibrées pour répartir les joueurs.
 * L'objectif est d'avoir des groupes de 2 à 4 joueurs pour favoriser la coopération.
 * Si le nombre total de joueurs est impair ou ne se divise pas par 4, l'algorithme
 * tente d'ajuster le nombre de groupes pour que tout le monde ait une équipe équilibrée.
 * 
 * @param {number} playerCount - Le nombre total de joueurs.
 * @returns {number[]} Un tableau contenant la taille de chaque groupe triée par ordre décroissant (ex: [3, 3, 2]).
 */
export function computeGroupSizes(playerCount) {
  if (playerCount < 2) {
    return [];
  }

  if (playerCount <= 4) {
    return [playerCount];
  }

  let numGroups = Math.ceil(playerCount / 4);

  while (numGroups > 1) {
    const min = Math.floor(playerCount / numGroups);
    const max = Math.ceil(playerCount / numGroups);
    if (min >= 2 && max <= 4) {
      break;
    }
    numGroups -= 1;
  }

  const baseSize = Math.floor(playerCount / numGroups);
  let remainder = playerCount % numGroups;
  const sizes = [];

  for (let i = 0; i < numGroups; i += 1) {
    sizes.push(baseSize + (remainder > 0 ? 1 : 0));
    if (remainder > 0) {
      remainder -= 1;
    }
  }

  return sizes.sort((a, b) => b - a);
}

/**
 * Mélange aléatoirement les éléments d'un tableau.
 * C'est une implémentation simple utilisant l'algorithme de Fisher-Yates.
 * 
 * @param {Array} items - Le tableau à mélanger.
 * @returns {Array} Une copie mélangée du tableau d'origine.
 */
export function shuffleArray(items) {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Mélange les joueurs puis les découpe en sous-groupes selon les tailles calculées par computeGroupSizes.
 * Cette fonction est principalement appelée au démarrage d'une session de dessin compétitive.
 * 
 * @param {Object[]} players - La liste des joueurs à répartir.
 * @returns {Object[][]} Un tableau de groupes, chaque groupe étant un tableau de joueurs.
 */
export function splitIntoGroups(players) {
  const sizes = computeGroupSizes(players.length);
  const shuffled = shuffleArray(players);
  const groups = [];
  let offset = 0;

  for (const size of sizes) {
    groups.push(shuffled.slice(offset, offset + size));
    offset += size;
  }

  return groups;
}
