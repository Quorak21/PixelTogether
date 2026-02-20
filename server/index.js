import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import 'dotenv/config';

import authRouter from './routes/auth.js';

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

// Connection avec socket
io.on('connection', (socket) => {

  // Envoi des rooms après demande du lobby
  socket.on('getActiveGrids', () => {
    socket.emit('activeGrids', activeGrids);
  });

  //Création du Canvas avec callback pour renvoyer direct l'ID
  socket.on('newGrid', (data, callback) => {
    const idGrid = crypto.randomUUID(); // On lui donne une ID randomn mais unique
    console.log(`Donnée canvas : ${data.width} et ${data.height}, nom : ${data.name}. id: ${idGrid}`)

    //Save du Canvas
    activeGrids[idGrid] = {
      id: idGrid,
      host: socket.id,
      name: data.name,
      width: data.width,
      height: data.height,
      pixels: {}
    }

    // le host rejoint la room
    socket.join(idGrid)

    // On prévient TOUT LE MONDE qu'une nouvelle room existe (pour le lobby)
    io.emit('createCanvas', { width: data.width, height: data.height, name: data.name, id: idGrid, host: socket.id })

    // On répond au host avec l'ID de sa room (comme un return)
    callback({ id: idGrid, name: data.name, host: socket.id })
  });

  //Placement de pixel
  socket.on('pixelPlaced', (data) => {
    console.log(`Pixel placé : ${data.x}:${data.y} avec la couleur ${data.color} et id: ${data.roomId}`)

    // Pour eviter les crash TEMPORAIRE 
    if (!activeGrids[data.roomId]) {
      console.log(`⚠️ Room ${data.roomId} introuvable (le serveur a peut-être redémarré)`)
      return;
    }

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
  socket.on('closeRoom', (data) => {
    console.log(`${socket.id} (host) ferme la room ${data.roomId}`)

    // On prévient tous les joueurs dans la room qu'elle est fermée
    io.emit('roomClosed', data.roomId);

    // On supprime la grid de la mémoire
    delete activeGrids[data.roomId];

    // L'host quitte aussi la room socket
    socket.leave(data.roomId)
  })

  //Deco
  socket.on('disconnect', () => {
    console.log(`🔴 Joueur déconnecté : ${socket.id}`);

    // On parcourt toutes les grids pour voir si ce joueur en hostait une pour la fermer
    for (const roomId in activeGrids) {
      if (activeGrids[roomId].host === socket.id) {
        console.log(`🔒 Fermeture auto de la room ${roomId} (host déconnecté)`)
        io.emit('roomClosed', roomId);
        delete activeGrids[roomId];
      }
    }
  });
});

//Lancement du serveur
httpServer.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
});