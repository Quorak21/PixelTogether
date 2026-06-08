import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { createCanvas } from 'canvas';
import authRouter from './routes/auth.js';
import sanitizeHtml from 'sanitize-html';
import {
  findUserById,
  findUserByPseudo,
  createGrid,
  findGridById,
  deleteGrid,
  persistGrid,
  setUserGridId,
  clearUserGridId,
  incrementUserGold,
  addMyGrid,
  updateMyGrid,
  deleteMyGrid,
  getUsersWithGalleryGrids,
  likeMyGrid,
} from './store/memoryStore.js';

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = [
  "http://localhost:4200",
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL2
].filter(Boolean);

const corsOptions = {
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.use('/api', authRouter);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: corsOptions
});

const activeGrids = {};
const activeUsers = {};
const pixelCooldown = 200;
const regColor = /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i;

function generateGridImage(grid) {
  const canvas = createCanvas(grid.width * 20, grid.height * 20);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const coords in grid.pixels) {
    const pixelColor = grid.pixels[coords];
    const [x, y] = coords.split(',');
    ctx.fillStyle = pixelColor;
    ctx.fillRect(x * 20, y * 20, 20, 20);
  }

  return canvas.toDataURL('image/webp');
}

async function persistGridToMemory(roomId, grid) {
  try {
    const gridImage = generateGridImage(grid);
    persistGrid(roomId, {
      pixels: grid.pixels,
      invitedUsers: grid.invitedUsers,
      image: gridImage,
      name: grid.name,
      width: grid.width,
      height: grid.height,
      type: grid.type,
      ownerID: grid.ownerID,
    });
    activeGrids[roomId].image = gridImage;
  } catch (err) {
    console.error('❌ Erreur persistGridToMemory:', err);
  }
}

async function getGridsImagesFromDB() {
  const images = {};
  for (const gridId in activeGrids) {
    const active = activeGrids[gridId];
    if (active?.image) {
      images[gridId] = active.image;
    } else {
      const stored = findGridById(gridId);
      if (stored?.image) {
        images[gridId] = stored.image;
      }
    }
  }
  return images;
}

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Token manquant'));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = findUserById(decoded.idUser);
    if (!user) {
      return next(new Error('Utilisateur introuvable'));
    }
    socket.userId = user.id;
    socket.pseudo = user.pseudo;
    socket.gold = user.gold;
    next();
  } catch (err) {
    return next(new Error('Token invalide'));
  }
});

io.on('connection', (socket) => {
  const user = findUserById(socket.userId);
  socket.emit('authenticated', { pseudo: socket.pseudo, gridID: user?.gridID ?? null, gold: user?.gold ?? 0 });

  socket.on('sendMessage', (data) => {
    if (!activeGrids[data.roomId]) return;

    const regexMessage = /^.{1,200}$/;
    if (!data.message || typeof data.message !== 'string' || !regexMessage.test(data.message)) {
      return;
    }

    const cleanMessage = sanitizeHtml(data.message);

    activeGrids[data.roomId].chatMessages.push({ pseudo: socket.pseudo, message: cleanMessage, senderId: socket.id });
    io.to(data.roomId).emit('receiveMessage', { senderId: socket.id, pseudo: socket.pseudo, message: cleanMessage });
  });

  socket.on('getChatMessages', (data) => {
    if (!activeGrids[data.roomId]) return;
    socket.emit('chatMessages', activeGrids[data.roomId].chatMessages);
  });

  socket.on('getActiveGrids', async () => {
    const images = await getGridsImagesFromDB();
    const filteredGrids = {};
    for (const gridId in activeGrids) {
      if (activeGrids[gridId].type !== 'private') {
        filteredGrids[gridId] = activeGrids[gridId];
      }
    }
    const currentUser = findUserById(socket.userId);
    socket.emit('activeGrids', { activeGrids: filteredGrids, images, gold: currentUser?.gold ?? 0 });
  });

  socket.on('invitePlayer', async (data, callback) => {
    if (!activeGrids[data.roomId]) return;
    const grid = activeGrids[data.roomId];

    const regexPseudo = /^[a-zA-Z0-9_]{3,20}$/;
    if (!data.pseudo || typeof data.pseudo !== 'string' || !regexPseudo.test(data.pseudo)) {
      return callback({ error: "Pseudo invalide." });
    }

    const invitedUser = findUserByPseudo(data.pseudo);
    if (!invitedUser) {
      return callback({ error: data.pseudo + " n'a pas été trouvé !" });
    }

    if (!grid.invitedUsers.includes(data.pseudo)) {
      grid.invitedUsers.push(data.pseudo);
      socket.emit('playerList', { roomId: data.roomId, invitedUsers: grid.invitedUsers });
      callback({ success: data.pseudo + " a été invité !" });
    } else {
      callback({ error: data.pseudo + " est déjà invité !" });
    }

    if (grid) await persistGridToMemory(data.roomId, grid);
  });

  socket.on('newGrid', async (data, callback) => {
    try {
      const currentUser = findUserById(socket.userId);
      if (currentUser?.gridID) {
        return callback({ error: "Vous avez déjà une partie en cours ! Veuillez la reprendre." });
      }

      const allowedTypes = ['public', 'limited', 'private'];
      if (!data.type || !allowedTypes.includes(data.type)) {
        return callback({ error: "Type de grille invalide." });
      }

      if (!Number.isInteger(data.width) || !Number.isInteger(data.height) || data.width < 20 || data.width > 100 || data.height < 20 || data.height > 100) {
        return callback({ error: "Les dimensions doivent être comprises entre 20 et 100." });
      }

      const regexGridName = /^[a-zA-Z0-9_ ]{3,20}$/;
      if (!data.name || typeof data.name !== 'string' || !regexGridName.test(data.name)) {
        return callback({ error: "Le nom doit contenir entre 3 et 20 caractères." });
      }

      const hostID = [socket.pseudo];

      const newGrid = createGrid({
        name: data.name,
        width: data.width,
        height: data.height,
        ownerID: socket.userId,
        type: data.type,
        invitedUsers: hostID,
      });

      setUserGridId(socket.userId, newGrid.id);

      activeGrids[newGrid.id] = {
        id: newGrid.id,
        host: socket.id,
        pseudo: socket.pseudo,
        name: data.name,
        width: data.width,
        height: data.height,
        ownerID: socket.userId,
        chatMessages: [],
        playersList: [],
        pixels: {},
        isModified: false,
        type: data.type,
        invitedUsers: hostID,
        image: null,
      };

      socket.join(newGrid.id);
      const images = await getGridsImagesFromDB();

      if (data.type !== 'private') {
        io.emit('createCanvas', { width: data.width, height: data.height, name: data.name, id: newGrid.id, host: socket.id, image: images, type: data.type, pseudo: socket.pseudo });
      }

      callback({ id: newGrid.id, name: data.name, host: socket.id });
    } catch (err) {
      console.error('Erreur newGrid:', err);
      callback({ error: 'Erreur lors de la création de la grille.' });
    }
  });

  socket.on('resumeGrid', async (data, callback) => {
    try {
      const currentUser = findUserById(socket.userId);

      if (!currentUser || !currentUser.gridID) {
        return callback({ error: "Aucune partie trouvée." });
      }

      const gridIdStr = currentUser.gridID;

      const storedGrid = findGridById(gridIdStr);
      if (!storedGrid) {
        return callback({ error: "Grille introuvable." });
      }

      const alreadyActive = !!activeGrids[gridIdStr];

      activeGrids[gridIdStr] = {
        id: gridIdStr,
        host: socket.id,
        pseudo: socket.pseudo,
        name: storedGrid.name,
        width: storedGrid.width,
        height: storedGrid.height,
        ownerID: storedGrid.ownerID,
        chatMessages: activeGrids[gridIdStr]?.chatMessages || [],
        playersList: activeGrids[gridIdStr]?.playersList || [],
        pixels: alreadyActive ? activeGrids[gridIdStr].pixels : { ...storedGrid.pixels },
        isModified: false,
        type: storedGrid.type,
        invitedUsers: alreadyActive ? activeGrids[gridIdStr].invitedUsers : [...(storedGrid.invitedUsers || [])],
        image: storedGrid.image ?? null,
      };

      if (storedGrid.type !== 'private') {
        if (!alreadyActive) {
          const images = await getGridsImagesFromDB();
          io.emit('createCanvas', { width: storedGrid.width, height: storedGrid.height, name: storedGrid.name, id: gridIdStr, host: socket.id, image: images, pseudo: socket.pseudo });
        }
      }

      socket.join(gridIdStr);
      callback({ id: gridIdStr, name: activeGrids[gridIdStr].name, host: activeGrids[gridIdStr].host });
    } catch (err) {
      console.error("Erreur resumeGrid:", err);
      callback({ error: "Erreur lors de la reprise de la partie." });
    }
  });

  socket.on('pixelPlaced', async (data, callback) => {
    if (!activeGrids[data.roomId]) return;

    const now = Date.now();
    if (now - (activeUsers[socket.userId] || 0) > pixelCooldown) {
      if (!Number.isInteger(data.x) || !Number.isInteger(data.y) || data.x < 0 || data.y < 0 || data.x >= activeGrids[data.roomId].width || data.y >= activeGrids[data.roomId].height || !regColor.test(data.color)) return;

      if ((activeGrids[data.roomId].type === 'limited' || activeGrids[data.roomId].type === 'private') && !activeGrids[data.roomId].invitedUsers.includes(socket.pseudo)) return;

      const pixelSpot = `${data.x},${data.y}`;
      const oldColor = activeGrids[data.roomId].pixels[pixelSpot];
      const colorChanged = oldColor !== data.color;

      activeGrids[data.roomId].pixels[pixelSpot] = data.color;
      activeGrids[data.roomId].isModified = true;

      io.to(data.roomId).emit('drawPixel', { x: data.x, y: data.y, color: data.color });
      activeUsers[socket.userId] = now;

      if (colorChanged) {
        const updatedUser = incrementUserGold(socket.userId, 1);
        socket.gold = updatedUser.gold;
        callback({ gold: updatedUser.gold });
      } else {
        const currentUser = findUserById(socket.userId);
        callback({ gold: currentUser.gold });
      }
    }
  });

  socket.on('getPlayersList', (data) => {
    if (!activeGrids[data.roomId]) return;
    socket.emit('playersList', {
      activePlayers: activeGrids[data.roomId].playersList,
      invitedUsers: activeGrids[data.roomId].invitedUsers,
      hostPseudo: activeGrids[data.roomId].pseudo
    });
  });

  socket.on('joinRoom', (data) => {
    if (!activeGrids[data.roomId]) return;
    if (activeGrids[data.roomId].type === 'private' && !activeGrids[data.roomId].invitedUsers.includes(socket.pseudo)) return;

    socket.join(data.roomId);
    socket.data.roomId = data.roomId;

    if (!activeGrids[data.roomId].playersList.includes(socket.pseudo)) {
      activeGrids[data.roomId].playersList.push(socket.pseudo);
      socket.to(data.roomId).emit('joinedRoom', { pseudo: socket.pseudo });
    }

    const grid = activeGrids[data.roomId];
    socket.emit('gridState', { pixels: grid.pixels, width: grid.width, height: grid.height, name: grid.name, type: grid.type });
  });

  socket.on('exitGame', (data) => {
    if (activeGrids[data.roomId]) {
      if (socket.id === activeGrids[data.roomId].host) {
        return;
      }
      activeGrids[data.roomId].playersList = activeGrids[data.roomId].playersList.filter(p => p !== socket.pseudo);

      io.in(data.roomId).emit('playersList', {
        activePlayers: activeGrids[data.roomId].playersList,
        invitedUsers: activeGrids[data.roomId].invitedUsers,
        hostPseudo: activeGrids[data.roomId].pseudo
      });
      socket.to(data.roomId).emit('exitGame', { user: socket.pseudo });
    }
    socket.leave(data.roomId);
  });

  socket.on('closeRoom', async (data) => {
    const grid = activeGrids[data.roomId];
    if (!grid || socket.id !== grid.host) return;

    const images = await getGridsImagesFromDB();
    io.emit('roomClosed', { roomId: data.roomId, image: images });
    delete activeGrids[data.roomId];

    await persistGridToMemory(data.roomId, grid);
    socket.leave(data.roomId);
  });

  socket.on('finishCanvas', async (data) => {
    try {
      clearUserGridId(socket.userId);

      const grid = activeGrids[data.roomId];
      if (!grid) return;

      if (socket.id !== grid.host) {
        return;
      }

      const gridImage = generateGridImage(grid);

      addMyGrid(socket.userId, {
        nom: grid.name,
        image: gridImage,
        onGallery: data.onGallery,
        date: Date.now(),
      });

      delete activeGrids[data.roomId];
      deleteGrid(data.roomId);

      const images = await getGridsImagesFromDB();
      io.emit('roomClosed', { roomId: data.roomId, image: images });
    } catch (err) {
      console.error('Erreur finishCanvas:', err);
    }
  });

  socket.on('deleteCanvas', async (data) => {
    const grid = activeGrids[data.roomId];
    if (!grid) return;

    if (socket.id !== grid.host) {
      return;
    }

    try {
      clearUserGridId(socket.userId);
      delete activeGrids[data.roomId];
      deleteGrid(data.roomId);

      const images = await getGridsImagesFromDB();
      io.emit('roomClosed', { roomId: data.roomId, image: images });
    } catch (err) {
      console.error('Erreur deleteCanvas:', err);
    }
  });

  socket.on('askGallery', async (callback) => {
    const users = getUsersWithGalleryGrids();

    const allGrids = users.flatMap(u =>
      u.myGrids.filter(g => g.onGallery === true).map(g => ({
        id: g.id,
        name: g.nom,
        image: g.image,
        likes: g.likedBy.length,
        author: u.pseudo,
        date: g.date,
        liked: g.likedBy.includes(socket.userId),
      }))
    );

    allGrids.sort((a, b) => b.date - a.date);
    const finalGrids = allGrids.slice(0, 50);

    callback({ grids: finalGrids });
  });

  socket.on('askMyGallery', async (callback) => {
    const currentUser = findUserById(socket.userId);
    if (!currentUser) return callback({ grids: [] });

    const myGrids = currentUser.myGrids.map(g => ({
      name: g.nom,
      image: g.image,
      author: currentUser.pseudo,
      onGallery: g.onGallery,
      id: g.id,
      date: g.date,
      likes: g.likedBy.length,
      liked: g.likedBy.includes(socket.userId),
    })).sort((a, b) => b.date - a.date);

    callback({ grids: myGrids });
  });

  socket.on('updateGridOnGallery', async (data) => {
    updateMyGrid(socket.userId, data.gridId, { onGallery: data.newValue });
  });

  socket.on('deleteGrid', async ({ gridId }) => {
    deleteMyGrid(socket.userId, gridId);
  });

  socket.on('getColors', async () => {
    const currentUser = findUserById(socket.userId);
    socket.emit('colors', { colors: currentUser?.colors ?? [] });
  });

  socket.on('buyColor', async (data, callback) => {
    const currentUser = findUserById(socket.userId);
    if (!currentUser) {
      callback({ success: false, message: "Utilisateur introuvable" });
      return;
    }
    if (!regColor.test(data.color)) {
      callback({ success: false, message: "Couleur invalide" });
      return;
    }
    if (currentUser.colors.includes(data.color)) {
      callback({ success: false, message: "Vous avez déjà cette couleur" });
      return;
    }
    if (currentUser.gold >= 100) {
      currentUser.gold -= 100;
      currentUser.colors.push(data.color);
      socket.gold = currentUser.gold;
      callback({ success: true, gold: currentUser.gold });
    } else {
      callback({ success: false, message: "Pas assez d'or" });
    }
  });

  socket.on('likeGrid', async ({ gridId }, callback) => {
    const grid = likeMyGrid(gridId, socket.userId);
    if (!grid) return;
    callback({ success: true, likes: grid.likedBy.length });
  });

  socket.on('disconnect', async () => {
    for (const roomId in activeGrids) {
      if (activeGrids[roomId].host === socket.id) {
        const grid = activeGrids[roomId];
        const images = await getGridsImagesFromDB();
        io.emit('roomClosed', { roomId, image: images });
        delete activeGrids[roomId];
        await persistGridToMemory(roomId, grid);
        delete activeUsers[socket.userId];
      } else if (activeGrids[roomId].playersList.includes(socket.pseudo)) {
        activeGrids[roomId].playersList = activeGrids[roomId].playersList.filter(p => p !== socket.pseudo);
        io.in(roomId).emit('playersList', {
          activePlayers: activeGrids[roomId].playersList,
          invitedUsers: activeGrids[roomId].invitedUsers,
          hostPseudo: activeGrids[roomId].pseudo
        });
        socket.to(roomId).emit('exitGame', { user: socket.pseudo });
      }
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
});
