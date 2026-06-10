/**
Fonction pour calculer les tailles de groupes équilibrées : min 2, max 4
1. On définit les groupes 2, on melange 3, on coupe et on renvoie les groupes finaux
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

export function shuffleArray(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

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
