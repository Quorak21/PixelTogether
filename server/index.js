import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

// Charger les variables d'environnement (plus tard)
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Middleware (Sécurité et JSON)
app.use(cors());
app.use(express.json());

// 2. Création du serveur HTTP (Nécessaire pour Socket.io)
const server = http.createServer(app);

// 3. Configuration de Socket.io
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // L'adresse de ton React (Vite)
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  // Ici, 'socket' existe ! C'est la ligne directe avec CE joueur précis.
  console.log(`Un utilisateur s'est connecté : ${socket.id}`);

  // On place les écouteurs DANS la connexion
  socket.on('createCanvas', (data) => {
    console.log(`Demande de canvas reçue : ${data.width}x${data.height}`);
    
    // On répond au client
    socket.emit('canvasCreated', {
      width: data.width,
      height: data.height,
      id: 'nouvelle-id-unique'
    });
  });

  socket.on('disconnect', () => {
    console.log('Utilisateur parti');
  });
});

server.listen(PORT, () => {
  console.log(`✅ Le serveur tourne sur http://localhost:${PORT}`);
});
