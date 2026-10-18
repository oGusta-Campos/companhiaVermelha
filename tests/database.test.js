const assert = require('node:assert/strict');
const { after, test } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

let databaseModule = null;
try {
  databaseModule = require('../server/database.js');
} catch (error) {
  if (error.code !== 'MODULE_NOT_FOUND') throw error;
}

function makeSeedCards() {
  const destinations = ['Cuba', 'China', 'Vietnã'].map((country, index) => ({
    type: 'destination',
    title: country,
    category: country,
    summary: `Resumo de ${country}`,
    details: `Detalhes de ${country}`,
    tags: ['cultura', 'turismo'],
    image: `assets/images/${['cuba', 'china', 'vietna'][index]}.jpg`,
    sortOrder: index
  }));
  const articles = ['Havana', 'Pequim', 'Vietnã', 'Acadêmica', 'China atual'].map((title, index) => ({
    type: 'article',
    title,
    category: 'Cultura',
    summary: `Resumo de ${title}`,
    details: `Detalhes de ${title}`,
    tags: ['cultura'],
    image: null,
    sortOrder: index
  }));
  return [...destinations, ...articles];
}

async function openDatabase(t) {
  assert.ok(databaseModule, 'server/database.js deve exportar o armazenamento SQLite');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'companhia-db-test-'));
  const dbPath = path.join(directory, 'data', 'test.sqlite');
  const seedPath = path.join(directory, 'seed.json');
  fs.writeFileSync(seedPath, JSON.stringify(makeSeedCards()));
  const opened = databaseModule.initializeDatabase(dbPath, seedPath);
  let cleanupDatabase = opened.db;
  t.after(() => {
    cleanupDatabase.close();
    fs.rmSync(directory, { recursive: true, force: true });
  });
  return {
    ...opened,
    dbPath,
    seedPath,
    replaceCleanupDatabase(database) { cleanupDatabase = database; }
  };
}

test('cria admin inicial, semeia os oito cards e não reaplica o seed ao reabrir', async (t) => {
  const opened = await openDatabase(t);
  const { db, initialAdminPassword } = opened;

  assert.equal(db.listCards('destination').length, 3);
  assert.equal(db.listCards('article').length, 5);
  assert.equal(db.listCards('destination')[0].title, 'Cuba');
  assert.equal(typeof initialAdminPassword, 'string');
  assert.ok(initialAdminPassword.length >= 24);

  const admin = db.getUserByUsername('admin');
  assert.equal(admin.role, 'admin');
  assert.notEqual(admin.passwordHash, initialAdminPassword);
  assert.ok(admin.passwordSalt);
  assert.equal(databaseModule.verifyPassword(admin, initialAdminPassword), true);
  assert.equal(databaseModule.verifyPassword(admin, 'senha-incorreta'), false);

  const card = db.listCards('destination')[0];
  db.updateCard(card.id, { ...card, title: 'Cuba editada' });
  db.close();

  const reopened = databaseModule.initializeDatabase(opened.dbPath, opened.seedPath);
  opened.replaceCleanupDatabase(reopened.db);
  assert.equal(reopened.initialAdminPassword, null);
  assert.equal(reopened.db.getUserByUsername('admin').username, 'admin');
  assert.equal(reopened.db.listCards('destination')[0].title, 'Cuba editada');
  assert.equal(reopened.db.listCards('destination').length, 3);
});

test('cria, edita e apaga cards mantendo tags e ordem', async (t) => {
  const { db } = await openDatabase(t);
  const created = db.createCard({
    type: 'article',
    title: 'Novo artigo',
    category: 'História',
    summary: 'Resumo novo',
    details: 'Texto detalhado',
    tags: ['história', 'cultura'],
    image: null,
    sortOrder: 20
  });

  assert.equal(created.title, 'Novo artigo');
  assert.deepEqual(created.tags, ['história', 'cultura']);
  assert.equal(db.listCards('article').at(-1).id, created.id);

  const updated = db.updateCard(created.id, { ...created, title: 'Artigo revisado' });
  assert.equal(updated.title, 'Artigo revisado');
  assert.equal(db.deleteCard(created.id), true);
  assert.equal(db.listCards('article').some((card) => card.id === created.id), false);
  assert.equal(db.deleteCard(created.id), false);
});

test('recusa tipo de card e papel de usuário inválidos', async (t) => {
  const { db } = await openDatabase(t);

  assert.throws(() => db.createCard({
    type: 'user', title: 'x', category: 'x', summary: 'x', details: 'x', tags: []
  }), /tipo|type/i);
  assert.throws(() => db.createUser({
    username: 'alice', password: 'senha-segura-123', role: 'owner'
  }), /papel|role/i);
  assert.equal(db.getUserByUsername('alice'), null);
});

test('persiste usuários e lista apenas informações seguras', async (t) => {
  const { db } = await openDatabase(t);
  const created = db.createUser({
    username: 'maria',
    password: 'senha-forte-123',
    role: 'user'
  });

  assert.equal(created.username, 'maria');
  assert.equal(created.role, 'user');
  assert.equal(typeof created.id, 'number');
  assert.deepEqual(db.listUsers().map(({ username, role }) => ({ username, role })), [
    { username: 'admin', role: 'admin' },
    { username: 'maria', role: 'user' }
  ]);
  assert.equal(Object.hasOwn(db.listUsers()[1], 'passwordHash'), false);
});
