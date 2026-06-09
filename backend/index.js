import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import 'dotenv/config';
import { createCanvas } from 'canvas';

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = [
  'http://localhost:4200',
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL2,
].filter(Boolean);

const corsOptions = {
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
};

app.use(cors(corsOptions));

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: corsOptions });

const activeGrids = {};
const regColor = /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i;

const GRID_SIZE = 75;
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_CODE_LENGTH = 6;
const ROOM_CODE_REGEX = /^[A-HJ-NP-Z2-9]{6}$/;
const DEFAULT_COLORS = [
  '#000000',
  '#ff0000',
  '#ff6600',
  '#ffff00',
  '#00ff00',
  '#00ccff',
  '#0000ff',
  '#9900ff',
  '#ff00cc',
  '#ffffff',
];

const AVATAR_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
];

const PSEUDO_REGEX = /^[a-zA-Z0-9_ ']{3,20}$/;

function generateRoomCode() {
  let code;
  do {
    code = '';
    for (let i = 0; i < ROOM_CODE_LENGTH; i += 1) {
      code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
    }
  } while (activeGrids[code]);
  return code;
}

function normalizeRoomId(roomId) {
  if (typeof roomId !== 'string') return null;
  const normalized = roomId.trim().toUpperCase();
  if (!ROOM_CODE_REGEX.test(normalized)) return null;
  return normalized;
}

function generateGridImage(grid) {
  const canvas = createCanvas(GRID_SIZE * 20, GRID_SIZE * 20);
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

function updateGridPreview(roomId) {
  const grid = activeGrids[roomId];
  if (!grid) return;
  grid.image = generateGridImage(grid);
}

function getGridsImages() {
  const images = {};
  for (const gridId in activeGrids) {
    if (activeGrids[gridId]?.image) {
      images[gridId] = activeGrids[gridId].image;
    }
  }
  return images;
}

function syncPlayersList(grid) {
  const ids = new Set([grid.host]);
  grid.players.forEach((player) => ids.add(player.socketId));
  grid.playersList = [...ids];
}

function isAvatarColorValid(color) {
  return typeof color === 'string' && AVATAR_COLORS.includes(color.toLowerCase());
}

function getParticipantRole(grid, socketId) {
  return socketId === grid.host ? 'host' : 'player';
}

function isRegistered(grid, socketId) {
  if (socketId === grid.host) {
    return Boolean(grid.hostProfile);
  }
  return grid.players.some((player) => player.socketId === socketId);
}

function getParticipantPseudo(grid, socketId) {
  if (socketId === grid.host && grid.hostProfile) {
    return grid.hostProfile.pseudo;
  }

  const player = grid.players.find((entry) => entry.socketId === socketId);
  return player?.pseudo ?? 'Joueur';
}

function toChatMessage(grid, entry) {
  return {
    socketId: entry.socketId,
    pseudo: entry.pseudo ?? getParticipantPseudo(grid, entry.socketId),
    message: entry.message,
    senderId: entry.socketId,
  };
}

function buildWaitingRoomState(grid, socketId) {
  const role = getParticipantRole(grid, socketId);
  return {
    roomId: grid.id,
    name: grid.name,
    status: grid.status,
    role,
    hostProfile: grid.hostProfile,
    players: grid.players.map(({ socketId: id, pseudo, avatarColor }) => ({
      socketId: id,
      pseudo,
      avatarColor,
      role: 'player',
    })),
    isRegistered: isRegistered(grid, socketId),
  };
}

function toLobbyRoom(grid) {
  return {
    id: grid.id,
    host: grid.host,
    name: grid.name,
    width: GRID_SIZE,
    height: GRID_SIZE,
    playersList: [...grid.playersList],
  };
}

function removePlayerFromGrid(grid, socketId) {
  if (socketId === grid.host) {
    return false;
  }

  const before = grid.players.length;
  grid.players = grid.players.filter((player) => player.socketId !== socketId);
  syncPlayersList(grid);
  return grid.players.length !== before;
}

io.on('connection', (socket) => {
  socket.emit('connected', { socketId: socket.id });

  socket.on('getActiveGrids', () => {
    const lobbyGrids = {};
    for (const gridId in activeGrids) {
      lobbyGrids[gridId] = toLobbyRoom(activeGrids[gridId]);
    }
    socket.emit('activeGrids', { activeGrids: lobbyGrids, images: getGridsImages() });
  });

  socket.on('newGrid', (data, callback) => {
    const regexGridName = /^[a-zA-Z0-9_ ']{3,20}$/;
    if (!data.name || typeof data.name !== 'string' || !regexGridName.test(data.name)) {
      return callback({
        error: "Le thème doit contenir entre 3 et 20 caractères (lettres, chiffres, espaces, apostrophe).",
      });
    }

    const roomId = generateRoomCode();

    activeGrids[roomId] = {
      id: roomId,
      host: socket.id,
      name: data.name,
      status: 'waiting',
      hostProfile: null,
      players: [],
      playersList: [socket.id],
      pixels: {},
      image: null,
      chatMessages: [],
    };

    socket.data.role = 'host';
    socket.data.roomId = roomId;
    socket.join(roomId);
    const images = getGridsImages();
    io.emit('createCanvas', {
      id: roomId,
      host: socket.id,
      name: data.name,
      width: GRID_SIZE,
      height: GRID_SIZE,
      playersList: [socket.id],
      image: images,
    });

    callback({ id: roomId, host: socket.id, name: data.name, role: 'host' });
  });

  socket.on('enterWaitingRoom', (data, callback) => {
    const roomId = normalizeRoomId(data?.roomId);
    if (!roomId) {
      const error = 'Code de partie invalide.';
      if (typeof callback === 'function') {
        callback({ error });
      }
      socket.emit('waitingRoomError', { error });
      return;
    }

    const grid = activeGrids[roomId];
    if (!grid) {
      const error = "La partie n'existe pas.";
      if (typeof callback === 'function') {
        callback({ error });
      }
      socket.emit('waitingRoomError', { error });
      return;
    }

    if (grid.status === 'started') {
      const error = 'La partie a déjà commencé.';
      if (typeof callback === 'function') {
        callback({ error });
      }
      socket.emit('waitingRoomError', { error });
      return;
    }

    const role = getParticipantRole(grid, socket.id);
    socket.data.role = role;
    socket.data.roomId = roomId;
    socket.join(roomId);

    const state = buildWaitingRoomState(grid, socket.id);
    socket.emit('waitingRoomState', state);
    if (typeof callback === 'function') {
      callback({ ...state });
    }
  });

  socket.on('registerPlayer', (data, callback) => {
    const roomId = normalizeRoomId(data?.roomId);
    const grid = roomId ? activeGrids[roomId] : null;

    if (!grid) {
      return callback({ error: "La partie n'existe pas." });
    }

    if (grid.status === 'started') {
      return callback({ error: 'La partie a déjà commencé.' });
    }

    if (isRegistered(grid, socket.id)) {
      return callback({ error: 'Vous êtes déjà enregistré.' });
    }

    const pseudo = typeof data?.pseudo === 'string' ? data.pseudo.trim() : '';
    if (!PSEUDO_REGEX.test(pseudo)) {
      return callback({
        error: 'Le pseudo doit contenir entre 3 et 20 caractères (lettres, chiffres, espaces, apostrophe).',
      });
    }

    const avatarColor = typeof data?.avatarColor === 'string' ? data.avatarColor.toLowerCase() : '';
    if (!isAvatarColorValid(avatarColor)) {
      return callback({ error: 'Couleur avatar invalide.' });
    }

    const role = getParticipantRole(grid, socket.id);

    if (role === 'host') {
      grid.hostProfile = { pseudo, avatarColor };
    } else {
      grid.players.push({
        socketId: socket.id,
        pseudo,
        avatarColor,
        role: 'player',
      });
    }

    syncPlayersList(grid);
    socket.data.role = role;
    socket.data.roomId = roomId;

    const state = buildWaitingRoomState(grid, socket.id);
    socket.to(roomId).emit('waitingRoomUpdated', { players: state.players });
    callback({ ...state });
  });

  socket.on('startGame', (data, callback) => {
    const roomId = normalizeRoomId(data?.roomId);
    const grid = roomId ? activeGrids[roomId] : null;

    if (!grid) {
      return callback({ error: "La partie n'existe pas." });
    }

    if (socket.id !== grid.host) {
      return callback({ error: 'Seul le manager peut démarrer la partie.' });
    }

    if (grid.status !== 'waiting') {
      return callback({ error: 'La partie est déjà lancée.' });
    }

    if (!grid.hostProfile) {
      return callback({ error: 'Le manager doit compléter son profil avant de démarrer.' });
    }

    if (grid.players.length < 2) {
      return callback({ error: 'Au moins 2 joueurs sont requis pour démarrer.' });
    }

    grid.status = 'started';
    io.to(roomId).emit('gameStarted', { roomId });
    callback({ roomId, status: 'started' });
  });

  socket.on('leaveWaitingRoom', (data) => {
    const roomId = normalizeRoomId(data?.roomId);
    const grid = roomId ? activeGrids[roomId] : null;
    if (!grid || socket.id === grid.host) {
      return;
    }

    const removed = removePlayerFromGrid(grid, socket.id);
    socket.leave(roomId);
    socket.data.roomId = undefined;

    if (removed && grid.status === 'waiting') {
      io.to(roomId).emit('waitingRoomUpdated', {
        players: grid.players.map(({ socketId: id, pseudo, avatarColor }) => ({
          socketId: id,
          pseudo,
          avatarColor,
          role: 'player',
        })),
      });
    }
  });

  socket.on('joinRoom', (data) => {
    const roomId = normalizeRoomId(data?.roomId);
    if (!roomId) {
      socket.emit('joinRoomError', { error: 'Code de partie invalide.' });
      return;
    }

    const grid = activeGrids[roomId];
    if (!grid) {
      socket.emit('joinRoomError', { error: "La partie n'existe pas" });
      return;
    }

    if (grid.status !== 'started') {
      socket.emit('joinRoomError', { error: 'La partie n\'a pas encore démarré.' });
      return;
    }

    const role = socket.id === grid.host ? 'host' : 'player';

    socket.data.role = role;
    socket.join(roomId);
    socket.data.roomId = roomId;

    if (!grid.playersList.includes(socket.id)) {
      syncPlayersList(grid);
      if (!grid.playersList.includes(socket.id)) {
        grid.playersList.push(socket.id);
      }
      socket.to(roomId).emit('joinedRoom', { socketId: socket.id });
    }

    socket.emit('gridState', {
      pixels: grid.pixels,
      width: GRID_SIZE,
      height: GRID_SIZE,
      name: grid.name,
      colors: DEFAULT_COLORS,
      role,
    });
  });

  socket.on('sendMessage', (data) => {
    const roomId = normalizeRoomId(data?.roomId);
    const grid = roomId ? activeGrids[roomId] : null;
    if (!grid) return;

    const regexMessage = /^.{1,200}$/;
    if (!data.message || typeof data.message !== 'string' || !regexMessage.test(data.message)) {
      return;
    }

    const message = data.message.trim();
    const pseudo = getParticipantPseudo(grid, socket.id);
    const entry = { socketId: socket.id, pseudo, message };
    grid.chatMessages.push(entry);
    io.to(roomId).emit('receiveMessage', toChatMessage(grid, entry));
  });

  socket.on('getChatMessages', (data) => {
    const roomId = normalizeRoomId(data?.roomId);
    const grid = roomId ? activeGrids[roomId] : null;
    if (!grid) return;
    socket.emit(
      'chatMessages',
      grid.chatMessages.map((entry) => toChatMessage(grid, entry)),
    );
  });

  socket.on('getPlayersList', (data) => {
    const roomId = normalizeRoomId(data?.roomId);
    const grid = roomId ? activeGrids[roomId] : null;
    if (!grid) return;
    socket.emit('playersList', { activePlayers: grid.playersList, hostSocketId: grid.host });
  });

  socket.on('pixelPlaced', (data) => {
    const roomId = normalizeRoomId(data?.roomId);
    const grid = roomId ? activeGrids[roomId] : null;
    if (!grid) return;

    if (
      !Number.isInteger(data.x) ||
      !Number.isInteger(data.y) ||
      data.x < 0 ||
      data.y < 0 ||
      data.x >= GRID_SIZE ||
      data.y >= GRID_SIZE ||
      !regColor.test(data.color)
    ) {
      return;
    }

    const pixelSpot = `${data.x},${data.y}`;
    grid.pixels[pixelSpot] = data.color;

    io.to(roomId).emit('drawPixel', { x: data.x, y: data.y, color: data.color });
  });

  socket.on('exitGame', (data) => {
    const roomId = normalizeRoomId(data?.roomId);
    const grid = roomId ? activeGrids[roomId] : null;
    if (!grid || socket.id === grid.host) return;

    removePlayerFromGrid(grid, socket.id);
    socket.to(roomId).emit('exitGame', { socketId: socket.id });
    socket.leave(roomId);
  });

  socket.on('closeRoom', (data) => {
    const roomId = normalizeRoomId(data?.roomId);
    const grid = roomId ? activeGrids[roomId] : null;
    if (!grid || socket.id !== grid.host) return;

    const images = getGridsImages();
    io.emit('roomClosed', { roomId, image: images });
    delete activeGrids[roomId];
    socket.leave(roomId);
  });

  socket.on('disconnect', () => {
    for (const roomId in activeGrids) {
      const grid = activeGrids[roomId];

      if (grid.host === socket.id) {
        const images = getGridsImages();
        io.emit('roomClosed', { roomId, image: images });
        delete activeGrids[roomId];
      } else if (grid.playersList.includes(socket.id) || grid.players.some((p) => p.socketId === socket.id)) {
        const wasWaiting = grid.status === 'waiting';
        const removed = removePlayerFromGrid(grid, socket.id);

        if (grid.status === 'started') {
          socket.to(roomId).emit('exitGame', { socketId: socket.id });
        } else if (wasWaiting && removed) {
          io.to(roomId).emit('waitingRoomUpdated', {
            players: grid.players.map(({ socketId: id, pseudo, avatarColor }) => ({
              socketId: id,
              pseudo,
              avatarColor,
              role: 'player',
            })),
          });
        }
      }
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
});
