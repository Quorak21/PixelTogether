import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import 'dotenv/config';
import './db.js';
import jwt from 'jsonwebtoken';
import { createCanvas } from 'canvas';
import authRouter from './routes/auth.js';
import Grid from './models/Grid.js';
import User from './models/User.js';
import sanitizeHtml from 'sanitize-html';

const app = express();
const PORT = process.env.PORT || 3000;


const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.FRONTEND_URL
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

// Création du serveur HTTP & Socket.io
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: corsOptions
});


// Variable nécessaire
const activeGrids = {};
const activeUsers = {};
const pixelCooldown = 200;
// Regex couleur
const regColor = /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i;
// Auto-save toutes les 15 secondes
setInterval(() => {
  Object.values(activeGrids).forEach(grid => {
    if (grid.isModified) {
      saveGridToDB(grid.id, grid);
      grid.isModified = false;
      io.to(grid.id).emit('gridSaved', grid.id);
    }
  });
}, 15000);
// Sauvegarde les pixels de la grid dans MongoDB
async function saveGridToDB(roomId, grid) {
  try {
    await Grid.findByIdAndUpdate(roomId, { pixels: grid.pixels, invitedUsers: grid.invitedUsers });

    //Création de l'image via Canvas
    const canvas = createCanvas(grid.width * 20, grid.height * 20);
    const ctx = canvas.getContext('2d');
    // Fond blanc
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const coords in grid.pixels) {
      const pixelColor = grid.pixels[coords];
      const [x, y] = coords.split(',');
      ctx.fillStyle = pixelColor;
      ctx.fillRect(x * 20, y * 20, 20, 20);
    }
    const gridImage = canvas.toDataURL('image/webp');
    //Et on save l'image dans la BDD
    await Grid.findByIdAndUpdate(roomId, { image: gridImage });

  } catch (err) {
    console.error(`❌ Erreur sauvegarde grid:`, err);
  }
}
// Recup des images pour lobby
async function getGridsImagesFromDB() {
  const images = {};
  for (const gridId in activeGrids) {
    const grid = await Grid.findById(gridId);
    if (grid && grid.image) {
      images[gridId] = grid.image;
    }
  }
  return images;
}
// Middleware d'authentification Socket.io, check 1x le token
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Token manquant'));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.idUser);
    if (!user) {
      return next(new Error('Utilisateur introuvable'));
    }
    // On attache les infos au socket — disponibles dans TOUS les handlers ensuite
    socket.userId = decoded.idUser;
    socket.pseudo = user.pseudo;
    socket.gold = user.gold;
    next();
  } catch (err) {
    return next(new Error('Token invalide'));
  }
});
// Connection avec socket (le middleware a déjà vérifié le token, on a socket.userId et socket.pseudo)
io.on('connection', (socket) => {

  // On renvoie les infos de l'utilisateur au client pour l'auto-connect
  socket.emit('authenticated', { pseudo: socket.pseudo, gridID: null, gold: socket.gold });

  // On cherche le gridID en async (pour ne pas bloquer la connexion)
  User.findById(socket.userId).then(async user => {
    if (user && user.gridID) {
      let userImg = null;
      try {
        const grid = await Grid.findById(user.gridID);
        if (grid) userImg = grid.image;
      } catch (e) { }
      socket.emit('authenticated', { pseudo: socket.pseudo, gridID: user.gridID, userImg });
    }
  });

  //Reception + envoi des messages du chat
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

  // Recup historique messages
  socket.on('getChatMessages', (data) => {
    if (!activeGrids[data.roomId]) return;
    socket.emit('chatMessages', activeGrids[data.roomId].chatMessages);
  });

  // Envoi des rooms après demande du lobby
  socket.on('getActiveGrids', async (data) => {
    const images = await getGridsImagesFromDB();
    // Filtrer les grids privées pour ne pas les afficher dans le lobby
    const filteredGrids = {};
    for (const gridId in activeGrids) {
      if (activeGrids[gridId].type !== 'private') {
        filteredGrids[gridId] = activeGrids[gridId];
      }
    }
    const user = await User.findById(socket.userId);
    socket.emit('activeGrids', { activeGrids: filteredGrids, images, gold: user.gold });
  });

  // Invitation d'un joueur
  socket.on('invitePlayer', async (data, callback) => {
    if (!activeGrids[data.roomId]) return;
    const grid = activeGrids[data.roomId];

    const regexPseudo = /^[a-zA-Z0-9_]{3,20}$/;
    if (!data.pseudo || typeof data.pseudo !== 'string' || !regexPseudo.test(data.pseudo)) {
      return callback({ error: "Pseudo invalide." });
    }

    const user = await User.findOne({ pseudo: data.pseudo });
    if (!user) {
      return callback({ error: data.pseudo + " n'a pas été trouvé !" });
    }


    if (!grid.invitedUsers.includes(data.pseudo)) {
      grid.invitedUsers.push(data.pseudo);
      socket.emit('playerList', { roomId: data.roomId, invitedUsers: grid.invitedUsers });
      callback({ success: data.pseudo + " a été invité !" });
    }
    else
      callback({ error: data.pseudo + " est déjà invité !" });

    if (grid) await saveGridToDB(data.roomId, grid);

  });

  //Création du Canvas avec callback pour renvoyer direct l'ID
  socket.on('newGrid', async (data, callback) => {
    try {
      // Vérifier si l'utilisateur a déjà une grille
      const user = await User.findById(socket.userId);
      if (user.gridID) {
        return callback({ error: "Vous avez déjà une partie en cours ! Veuillez la reprendre." });
      }

      // Vérification du type
      const allowedTypes = ['public', 'limited', 'private'];
      if (!data.type || !allowedTypes.includes(data.type)) {
        return callback({ error: "Type de grille invalide." });
      }

      // Vérification des dimensions
      if (!Number.isInteger(data.width) || !Number.isInteger(data.height) || data.width < 20 || data.width > 100 || data.height < 20 || data.height > 100) {
        return callback({ error: "Les dimensions doivent être comprises entre 20 et 100." });
      }
      // Vérif du nom
      const regexGridName = /^[a-zA-Z0-9_ ]{3,20}$/;
      if (!data.name || typeof data.name !== 'string' || !regexGridName.test(data.name)) {
        return callback({ error: "Le nom doit contenir entre 3 et 20 caractères." });
      }

      // L'hôte est toujours invité par défaut (si limited ou private)
      const hostID = [socket.pseudo];

      // Premiere save dans la DB
      const newGrid = new Grid({
        name: data.name,
        width: data.width,
        height: data.height,
        ownerID: socket.userId,
        type: data.type,
        invitedUsers: hostID
      });
      await newGrid.save();
      // On lie à l'user
      await User.findByIdAndUpdate(socket.userId, {
        $set: { gridID: newGrid.id }
      });

      //Save du Canvas dans la mémoire
      activeGrids[newGrid.id] = {
        id: newGrid.id,
        host: socket.id,
        pseudo: socket.pseudo,
        name: data.name,
        width: data.width,
        height: data.height,
        chatMessages: [],
        playersList: [],
        pixels: {},
        isModified: false,
        type: data.type,
        invitedUsers: hostID
      }

      // le host rejoint la room
      socket.join(newGrid.id)
      const images = await getGridsImagesFromDB();

      // On prévient TOUT LE MONDE qu'une nouvelle room existe (pour le lobby)
      if (data.type !== 'private') {
        io.emit('createCanvas', { width: data.width, height: data.height, name: data.name, id: newGrid.id, host: socket.id, image: images, type: data.type, pseudo: socket.pseudo })
      }

      // On répond au host avec l'ID de sa room (comme un return)
      callback({ id: newGrid.id, name: data.name, host: socket.id })
    } catch (err) {
      console.error('Erreur newGrid:', err);
      callback({ error: 'Erreur lors de la création de la grille.' });
    }
  });

  // Reprendre la grid
  socket.on('resumeGrid', async (data, callback) => {
    try {
      const user = await User.findById(socket.userId);

      if (!user || !user.gridID) {
        return callback({ error: "Aucune partie trouvée." });
      }

      const gridIdStr = user.gridID.toString();

      // On récupère la grille en BDD
      const grid = await Grid.findById(user.gridID);
      if (!grid) {
        return callback({ error: "Grille introuvable dans la base de données." });
      }

      // On la charge en mémoire (seulement si pas déjà active)
      const alreadyActive = !!activeGrids[gridIdStr];

      activeGrids[gridIdStr] = {
        id: gridIdStr,
        host: socket.id,
        pseudo: socket.pseudo,
        name: grid.name,
        width: grid.width,
        height: grid.height,
        chatMessages: activeGrids[gridIdStr]?.chatMessages || [],
        playersList: activeGrids[gridIdStr]?.playersList || [],
        pixels: alreadyActive ? activeGrids[gridIdStr].pixels : (grid.pixels ? Object.fromEntries(grid.pixels) : {}),
        isModified: false,
        type: grid.type,
        invitedUsers: alreadyActive ? activeGrids[gridIdStr].invitedUsers : (grid.invitedUsers || [])
      };

      // Prévenir le lobby qu'une "ancienne" room est à nouveau active (seulement si elle n'existait pas déjà)
      if (grid.type !== 'private') { // Grille privée = 0 visu sur le lobby
        if (!alreadyActive) {
          const images = await getGridsImagesFromDB();
          io.emit('createCanvas', { width: grid.width, height: grid.height, name: grid.name, id: gridIdStr, host: socket.id, image: images, pseudo: socket.pseudo });
        }
      }


      socket.join(gridIdStr);
      callback({ id: gridIdStr, name: activeGrids[gridIdStr].name, host: activeGrids[gridIdStr].host });

    } catch (err) {
      console.error("Erreur resumeGrid:", err);
      callback({ error: "Erreur lors de la reprise de la partie." });
    }
  });

  //Placement de pixel (plus besoin de vérifier le token, le middleware l'a déjà fait)
  socket.on('pixelPlaced', async (data, callback) => {
    if (!activeGrids[data.roomId]) return;

    // Gestion cooldown
    const now = Date.now();
    if (now - (activeUsers[socket.userId] || 0) > pixelCooldown) {


      if (!Number.isInteger(data.x) || !Number.isInteger(data.y) || data.x < 0 || data.y < 0 || data.x >= activeGrids[data.roomId].width || data.y >= activeGrids[data.roomId].height || !regColor.test(data.color)) return;

      // Bloquer les joueurs non invités en limited
      if ((activeGrids[data.roomId].type === 'limited' || activeGrids[data.roomId].type === 'private') && !activeGrids[data.roomId].invitedUsers.includes(socket.pseudo)) return;

      // Vérifier si la couleur change
      const pixelSpot = `${data.x},${data.y}`;
      const oldColor = activeGrids[data.roomId].pixels[pixelSpot];
      const colorChanged = oldColor !== data.color;

      //Ajout du pixel dans le canvas
      activeGrids[data.roomId].pixels[pixelSpot] = data.color;

      // On marque la grille comme modifiée pour l'autosave
      activeGrids[data.roomId].isModified = true;

      // Envoie du pixel à tous les joueurs de la room
      io.to(data.roomId).emit('drawPixel', { x: data.x, y: data.y, color: data.color });
      activeUsers[socket.userId] = now;



      // On donne 1 gold seulement si la couleur a changé
      if (colorChanged) {
        const user = await User.findByIdAndUpdate(socket.userId, { $inc: { gold: 1 } }, { new: true });
        callback({ gold: user.gold });
      } else {
        const user = await User.findById(socket.userId);
        callback({ gold: user.gold });
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

  // Rejoindre room (pseudo vient du middleware, plus du client)
  socket.on('joinRoom', (data) => {
    if (!activeGrids[data.roomId]) return;
    if (activeGrids[data.roomId].type === 'private' && !activeGrids[data.roomId].invitedUsers.includes(socket.pseudo)) return;

    socket.join(data.roomId);

    socket.data.roomId = data.roomId;

    if (!activeGrids[data.roomId].playersList.includes(socket.pseudo)) {
      activeGrids[data.roomId].playersList.push(socket.pseudo);
      // On prévient tout le monde que quelqu'un est entré dans la room
      socket.to(data.roomId).emit('joinedRoom', { pseudo: socket.pseudo });
    }

    // Envoi de l'état de la Grid au joueur qui vient de rejoindre
    const grid = activeGrids[data.roomId];
    socket.emit('gridState', { pixels: grid.pixels, width: grid.width, height: grid.height, name: grid.name, type: grid.type });

  });

  // Joueur quitte la room
  socket.on('exitGame', (data) => {
    if (activeGrids[data.roomId]) {
      activeGrids[data.roomId].playersList = activeGrids[data.roomId].playersList.filter(p => p !== socket.pseudo);

      // On prévient tous les joueurs que la liste a changé
      io.in(data.roomId).emit('playersList', {
        activePlayers: activeGrids[data.roomId].playersList,
        invitedUsers: activeGrids[data.roomId].invitedUsers,
        hostPseudo: activeGrids[data.roomId].pseudo
      });
      socket.to(data.roomId).emit('exitGame', { user: socket.pseudo });
    }
    socket.leave(data.roomId);
  });

  // L'host ferme la room → tout le monde est renvoyé au lobby
  socket.on('closeRoom', async (data) => {

    // On récupère la grid AVANT de la supprimer
    const grid = activeGrids[data.roomId];

    const images = await getGridsImagesFromDB();

    // On prévient tous les joueurs dans la room qu'elle est fermée
    io.emit('roomClosed', { roomId: data.roomId, image: images });

    // On supprime de la mémoire tout de suite (pour que le lobby soit à jour)
    delete activeGrids[data.roomId];

    // Puis on sauvegarde dans MongoDB en arrière-plan
    if (grid) await saveGridToDB(data.roomId, grid);

    socket.leave(data.roomId)
  })

  // Finish du Canvas
  socket.on('finishCanvas', async (data) => {
    try {
      await User.findByIdAndUpdate(socket.userId, {
        $set: { gridID: null }
      })

      const grid = activeGrids[data.roomId];
      if (!grid) return;

      //Création du canvas
      const canvas = createCanvas(grid.width * 20, grid.height * 20);
      const ctx = canvas.getContext('2d');

      // Fond blanc
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (const coords in grid.pixels) {
        const pixelColor = grid.pixels[coords];
        const [x, y] = coords.split(',');
        ctx.fillStyle = pixelColor;
        ctx.fillRect(x * 20, y * 20, 20, 20);
      }

      const gridImage = canvas.toDataURL('image/webp');

      // On ajoute la grille à l'utilisateur
      await User.findByIdAndUpdate(socket.userId, {
        $push: { myGrids: { nom: grid.name, image: gridImage, onGallery: data.onGallery, date: Date.now() } }
      });

      delete activeGrids[data.roomId];
      await Grid.findByIdAndDelete(data.roomId)
      const images = await getGridsImagesFromDB();
      io.emit('roomClosed', { roomId: data.roomId, image: images });
    } catch (err) {
      console.error('Erreur:', err);
    }
  })

  // Delete Canvas
  socket.on('deleteCanvas', async (data) => {
    try {
      await User.findByIdAndUpdate(socket.userId, {
        $set: { gridID: null }
      })

      // Delete dans la mémoire
      delete activeGrids[data.roomId];
      // Delete dans la DB
      await Grid.findByIdAndDelete(data.roomId)
      // On fait close tout le monde
      const images = await getGridsImagesFromDB();
      io.emit('roomClosed', { roomId: data.roomId, image: images });
    } catch (err) {
      console.error('Erreur deleteCanvas:', err);
    }
  })

  //Get Gallery
  socket.on('askGallery', async (callback) => {

    const users = await User.find({ "myGrids.0": { $exists: true } });

    // On recup d'abord tout
    const allGrids = users.flatMap(user =>
      user.myGrids.filter(grid => grid.onGallery === true).map(grid => ({
        id: grid.id,
        name: grid.nom,
        image: grid.image,
        likes: grid.likedBy.length,
        author: user.pseudo,
        date: grid.date,
        liked: grid.likedBy.includes(socket.userId),
      }))
    );

    // On trie par date
    allGrids.sort((a, b) => b.date - a.date);

    // On slice les 50 derniers
    const finalGrids = allGrids.slice(0, 50);

    callback({ grids: finalGrids });
  })

  // Gallery Perso
  socket.on('askMyGallery', async (callback) => {
    const user = await User.findById(socket.userId);

    const myGrids = user.myGrids.map(grid => ({
      name: grid.nom,
      image: grid.image,
      author: user.pseudo,
      onGallery: grid.onGallery,
      id: grid.id,
      date: grid.date,
      likes: grid.likedBy.length,
      liked: grid.likedBy.includes(socket.userId),
    })).sort((a, b) => b.date - a.date);


    callback({ grids: myGrids });
  })


  // Update grid pour public
  socket.on('updateGridOnGallery', async (data) => {
    const user = await User.findById(socket.userId);
    const grid = user.myGrids.id(data.gridId);
    if (grid) {
      grid.onGallery = data.newValue;
      await user.save();
    }
  })

  // delete Grid
  socket.on('deleteGrid', async ({ gridId }) => {
    const user = await User.findById(socket.userId);
    const grid = user.myGrids.id(gridId);
    if (grid) {
      grid.deleteOne();
      await user.save();
    }
  })

  socket.on('getColors', async () => {
    const user = await User.findById(socket.userId);
    socket.emit('colors', { colors: user.colors });
  })

  // Achat nouvelle couleur
  socket.on('buyColor', async (data, callback) => {
    const user = await User.findById(socket.userId);
    if (!regColor.test(data.color)) {
      callback({ success: false, message: "Couleur invalide" });
      return;
    }
    if (user.colors.includes(data.color)) {
      callback({ success: false, message: "Vous avez déjà cette couleur" });
      return;
    }
    if (user.gold >= 100) {
      user.gold -= 100;
      user.colors.push(data.color);
      await user.save();
      callback({ success: true, gold: user.gold });
    } else {
      callback({ success: false, message: "Pas assez d'or" });
    }
  })

  // Système de like
  socket.on('likeGrid', async ({ gridId }, callback) => {
    const user = await User.findOneAndUpdate(
      { "myGrids._id": gridId },
      { $addToSet: { "myGrids.$.likedBy": socket.userId } },
      { new: true }
    );
    if (!user) return;
    const likes = user.myGrids.id(gridId).likedBy.length;

    callback({ success: true, likes: likes });
  })

  //Deco
  socket.on('disconnect', async () => {
    // On parcourt toutes les grids pour voir si ce joueur en hostait une pour la fermer
    for (const roomId in activeGrids) {
      if (activeGrids[roomId].host === socket.id) {
        const grid = activeGrids[roomId];
        const images = await getGridsImagesFromDB();
        io.emit('roomClosed', { roomId, image: images });
        delete activeGrids[roomId];
        await saveGridToDB(roomId, grid);
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

//Lancement du serveur
httpServer.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
}); 
