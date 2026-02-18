import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import 'dotenv/config';

import User from './models/User.js';

const app = express();
const PORT = process.env.PORT || 3000;


app.use(cors());
app.use(express.json());

// Connexion à la Base de Données via .env
mongoose.connect(process.env.MONGOURL)
  .then(() => console.log('✅ Connecté à MongoDB'))
  .catch(err => console.error('❌ Erreur MongoDB:', err));

// Route API pour tester la DB
app.post('/api/test-db', async (req, res) => {
  console.log("📩 Données reçues du Front :", req.body);

  try {
    const nouveauJoueur = new User({
      pseudo: req.body.pseudo,
      password: req.body.password
    });

    await nouveauJoueur.save();
    console.log("✅ Sauvegardé dans MongoDB !");

    res.json({ message: "C'est tout bon, c'est dans la boîte !" });

  } catch (err) {
    console.error("❌ Erreur :", err);
    res.status(500).json({ error: err.message });
  }
});
// Laisser tel quel pour l'instant, juste pour tester. Passage par Auth.js avec cryptage et tout le tsoin-tsoin

// Création du serveur HTTP & Socket.io
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});



// Connection avec socket
io.on('connection', (socket) => {
  console.log(`🟢 Joueur connecté : ${socket.id}`);


  //Création du Canvas
  socket.on('newGrid', (data) => {
    const idGrid = crypto.randomUUID(); // On lui donne une ID
    console.log(`Donnée canvas : ${data.width} et ${data.height}, nom : ${data.name}. id: ${idGrid}`)

    //Save du Canvas
    const actualCanvas = {
      iD: idGrid,
      name: data.name,
      width: data.width,
      height: data.height,
      pixels: {}
    }

    io.emit('createCanvas', { width: data.width, height: data.height, roomName: data.name, id: idGrid })
  });

  //Placement de pixel
  socket.on('pixelPlaced', (data) => {
    console.log(`Pixel placé : ${data.x}:${data.y} avec la couleur ${data.color}`)

    //Ajout du pixel dans le canvas
    actualCanvas.pixels[`${data.x},${data.y}`] = data.color;

    io.emit('drawPixel', { x: data.x, y: data.y, color: data.color })
  });


  socket.on('disconnect', () => {
    console.log(`🔴 Joueur déconnecté : ${socket.id}`);
  });
});

//Lancement du serveur
httpServer.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
});