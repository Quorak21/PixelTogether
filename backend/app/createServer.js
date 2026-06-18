import express from 'express';
import { createServer as createHttpServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import * as constants from '../config/constants.js';
import * as store from '../store/eventStore.js';
import * as participants from '../services/event/participants.js';
import * as payloads from '../services/event/payloads.js';
import * as preview from '../services/grid/preview.js';
import * as lifecycle from '../services/event/lifecycle.js';
import { registerSocketHandlers } from '../sockets/register.js';

/**
 * Crée le serveur de l'application.
 * Configure Express pour gérer les requêtes HTTP de base et le CORS.
 * Instancie le serveur Socket.io pour la communication bidirectionnelle temps réel.
 * Prépare et injecte l'ensemble des dépendances (`deps`) dans les handlers de sockets.
 * Démarre enfin un sweep d'inactivité périodique (garbage collector) pour nettoyer les salons fantômes.
 * 
 * @returns {http.Server} Le serveur HTTP configuré et prêt à écouter.
 * 
 */
export function createServer() {
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

  const app = express();
  app.use(cors(corsOptions));

  const httpServer = createHttpServer(app);
  const io = new Server(httpServer, { cors: corsOptions });

  // sac partagé injecté dans tous les handlers (évite les imports circulaires)
  const deps = {
    io,
    store,
    constants,
    participants,
    payloads,
    preview,
    lifecycle,
  };

  registerSocketHandlers(io, deps);

  // Lancement du sweep d'inactivité périodique
  const sweepInterval = setInterval(() => {
    lifecycle.sweepInactiveEvents(io, store.activeEvents, constants.EVENT_INACTIVITY_TTL_MS);
  }, constants.EVENT_SWEEP_INTERVAL_MS);

  if (typeof sweepInterval.unref === 'function') {
    sweepInterval.unref();
  }

  return httpServer;
}

