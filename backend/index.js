import 'dotenv/config';
import { createServer } from './app/createServer.js';

const PORT = process.env.PORT || 3000;

createServer().listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
});
