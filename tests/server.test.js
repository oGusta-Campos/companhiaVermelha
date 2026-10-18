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

async function startRealSiteServer(t) {
  assert.ok(appModule, 'server/app.js deve criar o app Express');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'companhia-site-test-'));
  const { db, initialAdminPassword } = initializeDatabase(
    path.join(root, 'data', 'test.sqlite'),
    path.resolve(__dirname, '../data/seed-cards.json')
  );
  const app = appModule.createApp({
    db,
    sessionSecret: 'test-only-session-secret-32-bytes-minimum',
    publicDir: path.resolve(__dirname, '..')
  });
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
  return { baseUrl: `http://127.0.0.1:${server.address().port}`, initialAdminPassword };
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
  const userCardsApi = await fetch(`${baseUrl}/api/admin/cards`, { headers: { cookie: userLogin.cookie } });
  assert.equal(userCardsApi.status, 403);
  const userWrite = await fetch(`${baseUrl}/api/admin/cards`, {
    method: 'POST',
    headers: { cookie: userLogin.cookie, 'content-type': 'application/json' },
    body: JSON.stringify({})
  });
  assert.equal(userWrite.status, 403);

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

test('disponibiliza formulário de login e painel administrativo com papéis e CRUD', async (t) => {
  const { baseUrl, initialAdminPassword } = await startRealSiteServer(t);

  const loginPage = await fetch(`${baseUrl}/login.html`);
  assert.equal(loginPage.status, 200);
  assert.match(await loginPage.text(), /id="login-form"/);
  for (const page of ['index.html', 'destinos.html', 'experiencias.html', 'roteiros.html', 'caderno.html', 'contato.html']) {
    const response = await fetch(`${baseUrl}/${page}`);
    assert.equal(response.status, 200, `${page} deve continuar público`);
    const html = await response.text();
    assert.match(html, /src="\/js\/auth\.js"/, `${page} deve oferecer acesso à conta`);
    if (page === 'destinos.html' || page === 'caderno.html') {
      assert.match(html, /src="\/js\/public-cards\.js"/, `${page} deve carregar cards do banco`);
    } else {
      assert.doesNotMatch(html, /src="\/js\/public-cards\.js"/, `${page} não deve carregar o renderizador de cards`);
    }
  }

  const adminLogin = await login(baseUrl, 'admin', initialAdminPassword);
  const adminCookie = adminLogin.cookie;
  const adminPage = await fetch(`${baseUrl}/admin`, { headers: { cookie: adminCookie } });
  assert.equal(adminPage.status, 200);
  const adminHtml = await adminPage.text();
  assert.match(adminHtml, /id="user-form"/);
  assert.match(adminHtml, /id="card-form"/);

  const userResponse = await fetch(`${baseUrl}/api/admin/users`, {
    method: 'POST',
    headers: { cookie: adminCookie, 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'professor', password: 'senha-forte-123', role: 'user' })
  });
  assert.equal(userResponse.status, 201);
  assert.deepEqual(await userResponse.json().then(({ username, role }) => ({ username, role })), {
    username: 'professor', role: 'user'
  });

  const duplicateUser = await fetch(`${baseUrl}/api/admin/users`, {
    method: 'POST',
    headers: { cookie: adminCookie, 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'PROFESSOR', password: 'senha-forte-123', role: 'admin' })
  });
  assert.equal(duplicateUser.status, 409);

  const invalidRole = await fetch(`${baseUrl}/api/admin/users`, {
    method: 'POST',
    headers: { cookie: adminCookie, 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'teste-admin', password: 'senha-forte-123', role: 'owner' })
  });
  assert.equal(invalidRole.status, 400);

  const adminUser = await fetch(`${baseUrl}/api/admin/users`, {
    method: 'POST',
    headers: { cookie: adminCookie, 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'outro-admin', password: 'senha-forte-456', role: 'admin' })
  });
  assert.equal(adminUser.status, 201);
  const secondAdmin = await login(baseUrl, 'outro-admin', 'senha-forte-456');
  assert.equal((await secondAdmin.response.json()).role, 'admin');
  assert.equal((await fetch(`${baseUrl}/api/admin/users`, { headers: { cookie: secondAdmin.cookie } })).status, 200);

  const cardInput = {
    type: 'article',
    title: '<script>texto</script>',
    category: 'História',
    summary: 'Resumo criado no painel',
    details: '<script>detalhes</script>',
    tags: ['história'],
    image: 'assets/images/cuba.jpg',
    sortOrder: 20
  };
  const cardsBeforeInvalidInput = await fetch(`${baseUrl}/api/admin/cards?type=article`, {
    headers: { cookie: adminCookie }
  }).then((response) => response.json());
  for (const image of ['assets/images/../secret.jpg', 'C:\\outside.jpg', 'assets/outside.jpg']) {
    const invalidImage = await fetch(`${baseUrl}/api/admin/cards`, {
      method: 'POST',
      headers: { cookie: adminCookie, 'content-type': 'application/json' },
      body: JSON.stringify({ ...cardInput, image })
    });
    assert.equal(invalidImage.status, 400, `deve recusar imagem ${image}`);
  }
  for (const invalidCard of [
    { ...cardInput, image: false },
    { ...cardInput, sortOrder: true },
    { ...cardInput, title: 123 },
    { ...cardInput, details: undefined }
  ]) {
    const invalidResponse = await fetch(`${baseUrl}/api/admin/cards`, {
      method: 'POST',
      headers: { cookie: adminCookie, 'content-type': 'application/json' },
      body: JSON.stringify(invalidCard)
    });
    assert.equal(invalidResponse.status, 400);
  }
  const cardsAfterInvalidInput = await fetch(`${baseUrl}/api/admin/cards?type=article`, {
    headers: { cookie: adminCookie }
  }).then((response) => response.json());
  assert.equal(cardsAfterInvalidInput.length, cardsBeforeInvalidInput.length, 'entrada inválida não deve gravar cards');

  const createCard = await fetch(`${baseUrl}/api/admin/cards`, {
    method: 'POST',
    headers: { cookie: adminCookie, 'content-type': 'application/json' },
    body: JSON.stringify(cardInput)
  });
  assert.equal(createCard.status, 201);
  const createdCard = await createCard.json();
  assert.equal(createdCard.title, '<script>texto</script>');
  assert.equal(createdCard.details, '<script>detalhes</script>');
  assert.equal(createdCard.image, 'assets/images/cuba.jpg');
  const rawPublicCard = await fetch(`${baseUrl}/api/cards?type=article`).then((response) => response.json());
  assert.ok(rawPublicCard.some((card) => card.title === '<script>texto</script>'));

  const patchCard = await fetch(`${baseUrl}/api/admin/cards/${createdCard.id}`, {
    method: 'PATCH',
    headers: { cookie: adminCookie, 'content-type': 'application/json' },
    body: JSON.stringify({ ...cardInput, title: 'Artigo editado' })
  });
  assert.equal((await patchCard.json()).title, 'Artigo editado');

  const publicCards = await fetch(`${baseUrl}/api/cards?type=article`);
  assert.ok((await publicCards.json()).some((card) => card.title === 'Artigo editado'));

  const deleteCard = await fetch(`${baseUrl}/api/admin/cards/${createdCard.id}`, {
    method: 'DELETE', headers: { cookie: adminCookie }
  });
  assert.deepEqual(await deleteCard.json(), { deleted: true });
});
