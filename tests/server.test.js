const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

const { initializeDatabase } = require('../server/database.js');
let appModule = null;
try {
  appModule = require('../server/app.js');
} catch (error) {
  if (error.code !== 'MODULE_NOT_FOUND') throw error;
}

async function startTestServer(t) {
  assert.ok(appModule, 'server/app.js deve criar o app Express');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'companhia-http-test-'));
  const publicDir = path.join(root, 'public');
  const adminDir = path.join(publicDir, 'admin');
  const assetsDir = path.join(publicDir, 'assets', 'images');
  fs.mkdirSync(adminDir, { recursive: true });
  fs.mkdirSync(assetsDir, { recursive: true });
  fs.writeFileSync(path.join(publicDir, 'index.html'), '<h1>público</h1>');
  fs.writeFileSync(path.join(publicDir, 'login.html'), '<h1>login</h1>');
  fs.writeFileSync(path.join(adminDir, 'admin.html'), '<h1>painel privado</h1>');
  fs.writeFileSync(path.join(assetsDir, 'cuba.jpg'), 'imagem local');
  const { db, initialAdminPassword } = initializeDatabase(
    path.join(root, 'data', 'test.sqlite'),
    path.resolve(__dirname, '../data/seed-cards.json')
  );
  db.createUser({ username: 'aluno', password: 'senha-aluno-123', role: 'user' });
  const app = appModule.createApp({ db, sessionSecret: 'test-only-session-secret-32-bytes-minimum', publicDir });
  const server = http.createServer(app);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    db.close();
    fs.rmSync(root, { recursive: true, force: true });
  });
  const address = server.address();
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    initialAdminPassword
  };
}

async function login(baseUrl, username, password) {
  const response = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  return { response, cookie: response.headers.get('set-cookie')?.split(';')[0] };
}

test('mantém páginas e cards públicos sem sessão e bloqueia a área administrativa', async (t) => {
  const { baseUrl } = await startTestServer(t);

  const home = await fetch(`${baseUrl}/`);
  assert.equal(home.status, 200);
  assert.match(await home.text(), /público/);

  const session = await fetch(`${baseUrl}/api/session`);
  assert.deepEqual(await session.json(), { authenticated: false, username: null, role: null });

  const cards = await fetch(`${baseUrl}/api/cards?type=article`);
  assert.equal(cards.status, 200);
  assert.equal((await cards.json()).length, 5);

  const adminPage = await fetch(`${baseUrl}/admin`, { redirect: 'manual' });
  assert.equal(adminPage.status, 302);
  assert.match(adminPage.headers.get('location'), /login\.html/);

  const adminApi = await fetch(`${baseUrl}/api/admin/users`);
  assert.equal(adminApi.status, 401);
  assert.equal((await adminApi.json()).error, 'Autenticação necessária.');

  assert.equal((await fetch(`${baseUrl}/data/seed-cards.json`)).status, 404);
  assert.equal((await fetch(`${baseUrl}/server/database.js`)).status, 404);
  assert.equal((await fetch(`${baseUrl}/admin/admin.html`)).status, 404);
});

test('permite admin, limita usuário comum e invalida a sessão ao sair', async (t) => {
  const { baseUrl, initialAdminPassword } = await startTestServer(t);

  const denied = await login(baseUrl, 'admin', 'senha-incorreta');
  assert.equal(denied.response.status, 401);
  assert.equal((await denied.response.json()).error, 'Usuário ou senha inválidos.');

  const adminLogin = await login(baseUrl, 'admin', initialAdminPassword);
  assert.equal(adminLogin.response.status, 200);
  assert.ok(adminLogin.cookie);
  const adminSession = await fetch(`${baseUrl}/api/session`, { headers: { cookie: adminLogin.cookie } });
  assert.deepEqual(await adminSession.json(), { authenticated: true, username: 'admin', role: 'admin' });
  const adminPage = await fetch(`${baseUrl}/admin`, { headers: { cookie: adminLogin.cookie } });
  assert.equal(adminPage.status, 200);
  assert.match(await adminPage.text(), /painel privado/);
  assert.equal((await fetch(`${baseUrl}/api/admin/users`, { headers: { cookie: adminLogin.cookie } })).status, 200);

  const userLogin = await login(baseUrl, 'aluno', 'senha-aluno-123');
  assert.equal(userLogin.response.status, 200);
  const userPage = await fetch(`${baseUrl}/admin`, { headers: { cookie: userLogin.cookie }, redirect: 'manual' });
  assert.equal(userPage.status, 403);
  const userApi = await fetch(`${baseUrl}/api/admin/users`, { headers: { cookie: userLogin.cookie } });
  assert.equal(userApi.status, 403);

  const logout = await fetch(`${baseUrl}/api/logout`, {
    method: 'POST',
    headers: { cookie: adminLogin.cookie }
  });
  assert.equal(logout.status, 200);
  assert.equal((await fetch(`${baseUrl}/api/session`, { headers: { cookie: adminLogin.cookie } })).status, 200);
  assert.deepEqual(await (await fetch(`${baseUrl}/api/session`, {
    headers: { cookie: logout.headers.get('set-cookie')?.split(';')[0] || adminLogin.cookie }
  })).json(), { authenticated: false, username: null, role: null });
});
