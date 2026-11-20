const crypto = require('node:crypto');
const os = require('node:os');
const path = require('node:path');
const { createApp } = require('./server/app');
const { initializeDatabase } = require('./server/database');
const { startLocalServer } = require('./server/startup');

// No Vercel o código roda como função serverless: o disco do projeto é somente
// leitura (só o diretório temporário aceita escrita) e não existe porta para abrir.
const IS_VERCEL = Boolean(process.env.VERCEL);
const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, 'public');
const ADMIN_DIR = path.join(__dirname, 'admin');
const SEED_PATH = path.join(__dirname, 'data', 'seed-cards.json');
const DB_PATH = process.env.DB_PATH || (IS_VERCEL
  ? path.join(os.tmpdir(), 'companhia-vermelha.sqlite')
  : path.join(__dirname, 'data', 'companhia-vermelha.sqlite'));

const { db, initialAdminPassword } = initializeDatabase(DB_PATH, SEED_PATH, {
  adminPassword: process.env.ADMIN_PASSWORD
});
const app = createApp({
  db,
  sessionSecret: process.env.SESSION_SECRET || crypto.randomBytes(48).toString('hex'),
  publicDir: PUBLIC_DIR,
  adminDir: ADMIN_DIR,
  secureCookies: IS_VERCEL
});

if (IS_VERCEL) {
  if (initialAdminPassword) {
    console.warn('ADMIN_PASSWORD não definida: a senha do admin muda a cada nova instância da função.');
  }
  module.exports = app;
} else {
  if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
    console.error('PORT precisa ser um número entre 1 e 65535.');
    process.exit(1);
  }

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

  const shutdown = () => {
    server.close(() => {
      db.close();
      process.exit(0);
    });
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}
