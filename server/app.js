const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const session = require('express-session');
const { createAuthMiddleware } = require('./auth');

const PUBLIC_PAGES = [
  'index.html', 'destinos.html', 'experiencias.html', 'roteiros.html', 'caderno.html', 'contato.html'
];
const CARD_TYPES = new Set(['destination', 'article']);
const AUTH_SCRIPT = '<script src="/js/auth.js" defer></script>';

function sendPublicPage(publicDir, page) {
  return (req, res) => {
    fs.readFile(path.join(publicDir, page), 'utf8', (error, markup) => {
      if (error) return res.status(error.code === 'ENOENT' ? 404 : 500).send('Página não encontrada.');
      const scripts = [];
      if (!markup.includes('/js/auth.js') && !markup.includes('js/auth.js')) scripts.push(AUTH_SCRIPT);
      if (scripts.length) {
        const injected = scripts.join('\n');
        markup = /<\/body\s*>/i.test(markup)
          ? markup.replace(/<\/body\s*>/i, `${injected}\n</body>`)
          : `${markup}\n${injected}`;
      }
      return res.type('html').send(markup);
    });
  };
}

function makeCardInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new TypeError('Envie os dados do card em JSON.');
  }
  return {
    type: body.type,
    title: body.title,
    category: body.category,
    summary: body.summary,
    details: body.details,
    tags: body.tags,
    image: body.image || null,
    sortOrder: body.sortOrder === undefined ? 0 : Number(body.sortOrder)
  };
}

function validateImageAsset(image, publicDir) {
  if (image === null || image === undefined || image === '') return null;
  if (typeof image !== 'string' || !/^assets\/images\/[a-zA-Z0-9_.-]+$/.test(image)) {
    throw new TypeError('Escolha uma imagem existente dentro de assets/images.');
  }
  const imagesRoot = fs.realpathSync(path.join(publicDir, 'assets', 'images'));
  const imagePath = fs.realpathSync(path.resolve(publicDir, image));
  const prefix = imagesRoot.endsWith(path.sep) ? imagesRoot : `${imagesRoot}${path.sep}`;
  if (!imagePath.startsWith(prefix) || !fs.statSync(imagePath).isFile()) {
    throw new TypeError('Escolha uma imagem existente dentro de assets/images.');
  }
  return path.relative(publicDir, imagePath).split(path.sep).join('/');
}

function sendError(res, error) {
  if (error instanceof TypeError) {
    return res.status(400).json({ error: error.message });
  }
  if (error && /UNIQUE constraint failed/i.test(error.message)) {
    return res.status(409).json({ error: 'Já existe um registro com esses dados.' });
  }
  return res.status(500).json({ error: 'Não foi possível concluir a operação.' });
}

function createApp({ db, sessionSecret, publicDir }) {
  if (!db || !sessionSecret || !publicDir) throw new TypeError('Banco, segredo de sessão e pasta pública são obrigatórios.');

  const app = express();
  const auth = createAuthMiddleware(db);
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));
  app.use(session({
    name: 'companhia.sid',
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'strict',
      secure: false,
      maxAge: 4 * 60 * 60 * 1000
    }
  }));

  app.get('/', sendPublicPage(publicDir, 'index.html'));
  PUBLIC_PAGES.forEach((page) => {
    app.get(`/${page}`, sendPublicPage(publicDir, page));
  });
  app.get('/login.html', (req, res) => res.sendFile(path.join(publicDir, 'login.html')));
  for (const folder of ['css', 'js', 'assets']) {
    app.use(`/${folder}`, express.static(path.join(publicDir, folder), { index: false, dotfiles: 'deny' }));
  }

  app.get('/admin', (req, res, next) => {
    if (!req.session.userId) return res.redirect('/login.html?next=%2Fadmin');
    return auth.requireAdmin(req, res, next);
  }, (req, res) => {
    res.sendFile(path.join(publicDir, 'admin', 'admin.html'), (error) => {
      if (error && !res.headersSent) res.status(error.statusCode || 404).send('Painel administrativo não encontrado.');
    });
  });

  app.get('/api/session', (req, res) => {
    const user = req.session && req.session.userId ? db.getUserById(req.session.userId) : null;
    if (!user) return res.json({ authenticated: false, username: null, role: null });
    return res.json({ authenticated: true, username: user.username, role: user.role });
  });

  app.post('/api/login', (req, res) => {
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const user = auth.authenticate(username, password);
    if (!user) return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
    req.session.regenerate((error) => {
      if (error) return res.status(500).json({ error: 'Não foi possível iniciar a sessão.' });
      req.session.userId = user.id;
      return res.json({ authenticated: true, username: user.username, role: user.role });
    });
  });

  app.post('/api/logout', (req, res) => {
    if (!req.session) return res.json({ authenticated: false });
    req.session.destroy((error) => {
      if (error) return res.status(500).json({ error: 'Não foi possível encerrar a sessão.' });
      res.clearCookie('companhia.sid', { httpOnly: true, sameSite: 'strict', secure: false });
      return res.json({ authenticated: false });
    });
  });

  app.get('/api/cards', (req, res) => {
    const type = req.query.type;
    if (!CARD_TYPES.has(type)) return res.status(400).json({ error: 'Tipo de card inválido.' });
    return res.json(db.listCards(type));
  });

  app.get('/api/admin/users', auth.requireAdmin, (req, res) => res.json(db.listUsers()));
  app.post('/api/admin/users', auth.requireAdmin, (req, res) => {
    try {
      const created = db.createUser(req.body);
      return res.status(201).json(created);
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.get('/api/admin/cards', auth.requireAdmin, (req, res) => {
    const type = req.query.type;
    if (type && !CARD_TYPES.has(type)) return res.status(400).json({ error: 'Tipo de card inválido.' });
    try {
      return res.json(type ? db.listCards(type) : [...db.listCards('destination'), ...db.listCards('article')]);
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.post('/api/admin/cards', auth.requireAdmin, (req, res) => {
    try {
      const card = makeCardInput(req.body);
      card.image = validateImageAsset(card.image, publicDir);
      return res.status(201).json(db.createCard(card));
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.patch('/api/admin/cards/:id', auth.requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'Identificador de card inválido.' });
    try {
      const card = makeCardInput(req.body);
      card.image = validateImageAsset(card.image, publicDir);
      const updated = db.updateCard(id, card);
      if (!updated) return res.status(404).json({ error: 'Card não encontrado.' });
      return res.json(updated);
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.delete('/api/admin/cards/:id', auth.requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'Identificador de card inválido.' });
    if (!db.deleteCard(id)) return res.status(404).json({ error: 'Card não encontrado.' });
    return res.json({ deleted: true });
  });

  app.use((req, res) => res.status(404).json({ error: 'Página não encontrada.' }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error instanceof SyntaxError && error.status === 400) {
      return res.status(400).json({ error: 'JSON inválido.' });
    }
    return sendError(res, error);
  });

  return app;
}

module.exports = { createApp, validateImageAsset };
