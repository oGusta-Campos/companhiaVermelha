const crypto = require('node:crypto');
const path = require('node:path');
const { createApp } = require('./server/app');
const { initializeDatabase } = require('./server/database');
const { startLocalServer } = require('./server/startup');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 3000);
const DB_PATH = path.join(ROOT, 'data', 'companhia-vermelha.sqlite');
const SEED_PATH = path.join(ROOT, 'data', 'seed-cards.json');

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  console.error('PORT precisa ser um número entre 1 e 65535.');
  process.exit(1);
}

const { db, initialAdminPassword } = initializeDatabase(DB_PATH, SEED_PATH);
const app = createApp({
  db,
  sessionSecret: crypto.randomBytes(48).toString('hex'),
  publicDir: ROOT
});

const server = startLocalServer(app, {
  port: PORT,
  initialAdminPassword,
  logger: console,
  onError(error) {
    if (error.code === 'EADDRINUSE') {
      console.error(`A porta ${PORT} já está em uso. No PowerShell, tente $env:PORT=3001; npm start.`);
    } else {
      console.error(`Não foi possível iniciar o servidor: ${error.message}`);
    }
    db.close();
    process.exitCode = 1;
  }
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
