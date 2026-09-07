import 'dotenv/config';
import { createServer } from './app/createServer.js';
import { activeEvents } from './store/eventStore.js';
import { closeEvent } from './services/event/lifecycle.js';
import { ensureLogDir, logError } from './services/log/logger.js';

const PORT = process.env.PORT || 3000;

const { httpServer, io } = createServer();

void ensureLogDir();

httpServer.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
});

let shuttingDown = false;

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const eventId of Object.keys(activeEvents)) {
    closeEvent(io, eventId, 'server_shutdown');
  }

  httpServer.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1500).unref();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

process.on('uncaughtException', (err) => {
  logError(err);
  shutdown();
});

process.on('unhandledRejection', (reason) => {
  logError(reason);
});
