import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { createCanvas } from 'canvas';
import authRouter from './routes/auth.js';
import Grid from './models/Grid.js';
import User from './models/User.js';

const app = express();
const PORT = process.env.PORT || 3000;


const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.FRONTEND_URL
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


// BDD des Canvas sur le serveur
const activeGrids = {};

// Sauvegarde les pixels de la grid dans MongoDB
async function saveGridToDB(roomId, grid) {
  try {
    await Grid.findByIdAndUpdate(roomId, { pixels: grid.pixels });
    console.log(`💾 Grid "${grid.name}" mise à jour dans MongoDB`);
  } catch (err) {
    console.error(`❌ Erreur sauvegarde grid:`, err);
  }
}

// Connection avec socket
io.on('connection', (socket) => {

  //Reception + envoi des messages du chat
  socket.on('sendMessage', (data) => {
    activeGrids[data.roomId].chatMessages.push({ pseudo: data.pseudo, message: data.message, senderId: socket.id });
    io.to(data.roomId).emit('receiveMessage', { senderId: socket.id, pseudo: data.pseudo, message: data.message });
  });

  // Recup historique messages
  socket.on('getChatMessages', (data) => {
    socket.emit('chatMessages', activeGrids[data.roomId].chatMessages);
  });

  // Envoi des rooms après demande du lobby
  socket.on('getActiveGrids', (data) => {


    socket.emit('activeGrids', activeGrids);
  });

  // verification token pour log auto
  socket.on('verifyToken', async (token) => {
    if (!token) return;
    try {
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decodedToken.idUser);
      if (user) {
        socket.emit('verifyToken', { pseudo: user.pseudo, gridID: user.gridID });
      }
    } catch (err) {
      console.error("Token invalide:", err.message);
    }
  });

  //Création du Canvas avec callback pour renvoyer direct l'ID
  socket.on('newGrid', async (data, callback) => {

    // Vérifie si le token est valide
    const decoded = jwt.verify(data.token, process.env.JWT_SECRET);

    // Vérifier si l'utilisateur a déjà une grille
    const user = await User.findById(decoded.idUser);
    if (user.gridID) {
      return callback({ error: "Vous avez déjà une partie en cours ! Veuillez la reprendre." });
    }

    // Premiere save dans la DB
    const newGrid = new Grid({
      name: data.name,
      width: data.width,
      height: data.height,
      ownerID: decoded.idUser
    });
    await newGrid.save();
    // On lie à l'user
    await User.findByIdAndUpdate(decoded.idUser, {
      $set: { gridID: newGrid.id }
    });


    //Save du Canvas dans la mémoire
    activeGrids[newGrid.id] = {
      id: newGrid.id,
      host: socket.id,
      name: data.name,
      width: data.width,
      height: data.height,
      chatMessages: [],
      playersList: [],
      pixels: {}
    }

    // le host rejoint la room
    socket.join(newGrid.id)

    // On prévient TOUT LE MONDE qu'une nouvelle room existe (pour le lobby)
    io.emit('createCanvas', { width: data.width, height: data.height, name: data.name, id: newGrid.id, host: socket.id })

    // On répond au host avec l'ID de sa room (comme un return)
    callback({ id: newGrid.id, name: data.name, host: socket.id })
  });

  // Reprendre la grid
  socket.on('resumeGrid', async (data, callback) => {
    try {
      const decoded = jwt.verify(data.token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.idUser);

      if (!user || !user.gridID) {
        return callback({ error: "Aucune partie trouvée." });
      }

      const gridIdStr = user.gridID.toString();

      // On récupère la grille en BDD
      const grid = await Grid.findById(user.gridID);
      if (!grid) {
        return callback({ error: "Grille introuvable dans la base de données." });
      }

      // On la charge en mémoire
      activeGrids[gridIdStr] = {
        id: gridIdStr,
        host: socket.id,
        name: grid.name,
        width: grid.width,
        height: grid.height,
        chatMessages: [],
        playersList: [],
        pixels: grid.pixels ? Object.fromEntries(grid.pixels) : {}
      };

      // Prévenir le lobby qu'une "ancienne" room est à nouveau active
      io.emit('createCanvas', { width: grid.width, height: grid.height, name: grid.name, id: gridIdStr, host: socket.id });

      socket.join(gridIdStr);
      callback({ id: gridIdStr, name: activeGrids[gridIdStr].name, host: activeGrids[gridIdStr].host });

    } catch (err) {
      console.error("Erreur resumeGrid:", err);
      callback({ error: "Erreur lors de la reprise de la partie." });
    }
  });

  //Placement de pixel
  socket.on('pixelPlaced', async (data) => {

    if (!data.token) {
      return;
    }

    try {
      // Vérifie si le token est valide
      const decoded = jwt.verify(data.token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.idUser);

      if (!user) {
        return;
      }

      //Ajout du pixel dans le canvas
      activeGrids[data.roomId].pixels[`${data.x},${data.y}`] = data.color;

      // Envoie du pixel à tous les joueurs de la room
      socket.to(data.roomId).emit('drawPixel', { x: data.x, y: data.y, color: data.color });

    } catch (err) {
      console.error("Erreur token foireux:", err);
      return;
    }

  });

  socket.on('getPlayersList', (data) => {
    socket.emit('playersList', activeGrids[data.roomId].playersList);
  });

  // Rejoindre room
  socket.on('joinRoom', (data) => {
    socket.join(data.roomId);

    socket.data.pseudo = data.pseudo;
    socket.data.roomId = data.roomId;

    activeGrids[data.roomId].playersList.push(data.pseudo);
    // On prévient tout le monde que quelqu'un est entré dans la room
    socket.to(data.roomId).emit('joinedRoom', { pseudo: data.pseudo });

    // Envoi de l'état de la Grid au joueur qui vient de rejoindre
    const grid = activeGrids[data.roomId];
    socket.emit('gridState', { pixels: grid.pixels, width: grid.width, height: grid.height, name: grid.name });
  });

  // Joueur quitte la room
  socket.on('exitGame', (data) => {
    if (activeGrids[data.roomId]) {
      activeGrids[data.roomId].playersList = activeGrids[data.roomId].playersList.filter(p => p !== data.user);

      // On prévient tous les joueurs que la liste a changé
      io.in(data.roomId).emit('playersList', activeGrids[data.roomId].playersList);
      socket.to(data.roomId).emit('exitGame', { user: data.user });
    }
    socket.leave(data.roomId);
  });

  // L'host ferme la room → tout le monde est renvoyé au lobby
  socket.on('closeRoom', async (data) => {

    // On récupère la grid AVANT de la supprimer
    const grid = activeGrids[data.roomId];

    // On prévient tous les joueurs dans la room qu'elle est fermée
    io.emit('roomClosed', data.roomId);

    // On supprime de la mémoire tout de suite (pour que le lobby soit à jour)
    delete activeGrids[data.roomId];

    // Puis on sauvegarde dans MongoDB en arrière-plan
    if (grid) await saveGridToDB(data.roomId, grid);

    socket.leave(data.roomId)
  })

  // Finish du Canvas
  socket.on('finishCanvas', async (data) => {
    const decoded = jwt.verify(data.token, process.env.JWT_SECRET);
    await User.findByIdAndUpdate(decoded.idUser, {
      $set: { gridID: null }
    })

    const grid = activeGrids[data.roomId];

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
    await User.findByIdAndUpdate(decoded.idUser, {
      $push: { myGrids: { nom: grid.name, image: gridImage } }
    });

    delete activeGrids[data.roomId];
    await Grid.findByIdAndDelete(data.roomId)
    io.emit('roomClosed', data.roomId);
  })

  // Delete Canvas
  socket.on('deleteCanvas', async (data) => {
    const decoded = jwt.verify(data.token, process.env.JWT_SECRET);
    await User.findByIdAndUpdate(decoded.idUser, {
      $set: { gridID: null }
    })

    // Delete dans la mémoire
    delete activeGrids[data.roomId];
    // Delete dans la DB
    await Grid.findByIdAndDelete(data.roomId)
    io.emit('roomClosed', data.roomId);
  })

  //Get Gallery
  socket.on('askGallery', async (callback) => {

    const users = await User.find({ "myGrids.0": { $exists: true } });

    const allGrids = users.flatMap(user =>
      user.myGrids.map(grid => ({
        name: grid.nom,
        image: grid.image,
        author: user.pseudo
      }))
    );

    callback({ grids: allGrids });
  })

  //Deco
  socket.on('disconnect', async () => {
    // On parcourt toutes les grids pour voir si ce joueur en hostait une pour la fermer
    for (const roomId in activeGrids) {
      if (activeGrids[roomId].host === socket.id) {
        console.log(`🔒 Fermeture auto de la room ${roomId} (host déconnecté)`)
        const grid = activeGrids[roomId];
        io.emit('roomClosed', roomId);
        delete activeGrids[roomId];
        await saveGridToDB(roomId, grid);
      }
    }
  });
});

//Lancement du serveur
httpServer.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
});