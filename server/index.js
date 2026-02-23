import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import 'dotenv/config';
import jwt from 'jsonwebtoken';

import authRouter from './routes/auth.js';
import Grid from './models/Grid.js';
import User from './models/User.js';
import handleChat from './routes/chat.js';

const app = express();
const PORT = process.env.PORT || 3000;


app.use(cors());
app.use(express.json());
app.use('/api', authRouter);

// Création du serveur HTTP & Socket.io
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
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

  //chat
  handleChat(io, socket);

  // Envoi des rooms après demande du lobby
  socket.on('getActiveGrids', () => {
    socket.emit('activeGrids', activeGrids);
  });

  // verification token pour log auto
  socket.on('verifyToken', async (token) => {
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decodedToken.idUser);
    socket.emit('verifyToken', { pseudo: user.pseudo, gridID: user.gridID });
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
    console.log(`💾 Grid "${data.name}, ${newGrid.id}" sauvegardée dans MongoDB`);
    // On lie à l'user
    await User.findByIdAndUpdate(decoded.idUser, {
      $set: { gridID: newGrid.id },
      $push: { myGrids: newGrid.id }
    });


    //Save du Canvas dans la mémoire
    activeGrids[newGrid.id] = {
      id: newGrid.id,
      host: socket.id,
      name: data.name,
      width: data.width,
      height: data.height,
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
  socket.on('pixelPlaced', (data) => {
    console.log(`Pixel placé : ${data.x}:${data.y} avec la couleur ${data.color} et id: ${data.roomId}`)


    //Ajout du pixel dans le canvas
    activeGrids[data.roomId].pixels[`${data.x},${data.y}`] = data.color;

    // Envoie du pixel à tous les joueurs de la room
    socket.to(data.roomId).emit('drawPixel', { x: data.x, y: data.y, color: data.color });

  });

  // Rejoindre room
  socket.on('joinRoom', (data) => {
    console.log(`Le joueur ${socket.id} a rejoint la room id: ${data.roomId}`)
    socket.join(data.roomId)

    // Envoi de l'état de la Grid au joueur qui vient de rejoindre
    const grid = activeGrids[data.roomId];
    socket.emit('gridState', { pixels: grid.pixels, width: grid.width, height: grid.height, name: grid.name });
  })

  // Joueur quitte la room
  socket.on('exitGame', (data) => {
    console.log(`Le joueur ${socket.id} a quitté la room id: ${data.roomId}`)
    socket.leave(data.roomId)
  })

  // L'host ferme la room → tout le monde est renvoyé au lobby
  socket.on('closeRoom', async (data) => {
    console.log(`${socket.id} (host) ferme la room ${data.roomId}`)

    // On récupère la grid AVANT de la supprimer
    const grid = activeGrids[data.roomId];

    // On prévient tous les joueurs dans la room qu'elle est fermée
    io.emit('roomClosed', data.roomId);

    // On supprime de la mémoire tout de suite (pour que le lobby soit à jour)
    delete activeGrids[data.roomId];

    // Puis on sauvegarde dans MongoDB en arrière-plan
    if (grid) await saveGridToDB(data.roomId, grid);

    // L'host quitte aussi la room socket
    socket.leave(data.roomId)
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