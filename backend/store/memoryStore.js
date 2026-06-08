import { randomUUID } from 'crypto';

const DEFAULT_COLORS = ['#000000', '#ff0000', '#0000ff', '#00ff00', '#ffff00', '#c0c0c0', '#905a29'];

const usersById = new Map();
const usersByPseudo = new Map();
const gridsById = new Map();

export function createUser({ pseudo, password }) {
  const normalizedPseudo = pseudo.toLowerCase().trim();
  if (usersByPseudo.has(normalizedPseudo)) {
    const err = new Error('Ce pseudo est déjà pris');
    err.code = 11000;
    throw err;
  }
  const user = {
    id: randomUUID(),
    pseudo: normalizedPseudo,
    password,
    gridID: null,
    myGrids: [],
    colors: [...DEFAULT_COLORS],
    gold: 0,
    token: null,
  };
  usersById.set(user.id, user);
  usersByPseudo.set(normalizedPseudo, user);
  return user;
}

export function findUserByPseudo(pseudo) {
  return usersByPseudo.get(pseudo.toLowerCase().trim()) ?? null;
}

export function findUserById(id) {
  return usersById.get(id) ?? null;
}

export function updateUser(id, updates) {
  const user = findUserById(id);
  if (!user) return null;
  Object.assign(user, updates);
  return user;
}

export function incrementUserGold(id, amount = 1) {
  const user = findUserById(id);
  if (!user) return null;
  user.gold += amount;
  return user;
}

export function setUserGridId(userId, gridId) {
  return updateUser(userId, { gridID: gridId });
}

export function clearUserGridId(userId) {
  return updateUser(userId, { gridID: null });
}

export function createGrid({ name, width, height, ownerID, type, invitedUsers }) {
  const grid = {
    id: randomUUID(),
    name,
    width,
    height,
    ownerID,
    pixels: {},
    image: null,
    type,
    invitedUsers: [...invitedUsers],
  };
  gridsById.set(grid.id, grid);
  return grid;
}

export function findGridById(id) {
  return gridsById.get(id) ?? null;
}

export function updateGrid(id, updates) {
  const grid = findGridById(id);
  if (!grid) return null;
  Object.assign(grid, updates);
  return grid;
}

export function deleteGrid(id) {
  return gridsById.delete(id);
}

export function persistGrid(id, { pixels, invitedUsers, image, name, width, height, type, ownerID }) {
  let grid = findGridById(id);
  if (!grid) {
    grid = {
      id,
      name,
      width,
      height,
      ownerID,
      pixels: {},
      image: null,
      type,
      invitedUsers: [],
    };
    gridsById.set(id, grid);
  }
  grid.pixels = { ...pixels };
  grid.invitedUsers = [...invitedUsers];
  if (image !== undefined) grid.image = image;
  if (name !== undefined) grid.name = name;
  if (width !== undefined) grid.width = width;
  if (height !== undefined) grid.height = height;
  if (type !== undefined) grid.type = type;
  if (ownerID !== undefined) grid.ownerID = ownerID;
  return grid;
}

export function addMyGrid(userId, { nom, image, onGallery, date }) {
  const user = findUserById(userId);
  if (!user) return null;
  const entry = {
    id: randomUUID(),
    nom,
    image,
    onGallery,
    date,
    likedBy: [],
  };
  user.myGrids.push(entry);
  return entry;
}

export function findMyGridById(userId, gridId) {
  const user = findUserById(userId);
  if (!user) return null;
  return user.myGrids.find((g) => g.id === gridId) ?? null;
}

export function updateMyGrid(userId, gridId, updates) {
  const grid = findMyGridById(userId, gridId);
  if (!grid) return null;
  Object.assign(grid, updates);
  return grid;
}

export function deleteMyGrid(userId, gridId) {
  const user = findUserById(userId);
  if (!user) return false;
  const index = user.myGrids.findIndex((g) => g.id === gridId);
  if (index === -1) return false;
  user.myGrids.splice(index, 1);
  return true;
}

export function findUserByMyGridId(gridId) {
  for (const user of usersById.values()) {
    const grid = user.myGrids.find((g) => g.id === gridId);
    if (grid) return { user, grid };
  }
  return null;
}

export function getUsersWithGalleryGrids() {
  return [...usersById.values()].filter((user) => user.myGrids.length > 0);
}

export function likeMyGrid(gridId, userId) {
  const result = findUserByMyGridId(gridId);
  if (!result) return null;
  const { grid } = result;
  if (!grid.likedBy.includes(userId)) {
    grid.likedBy.push(userId);
  }
  return grid;
}
