const { verifyPassword } = require('./database');

function createAuthMiddleware(db) {
  function requireLogin(req, res, next) {
    const userId = req.session && req.session.userId;
    const user = userId ? db.getUserById(userId) : null;
    if (!user) {
      if (req.session) req.session.userId = null;
      return res.status(401).json({ error: 'Autenticação necessária.' });
    }
    req.user = user;
    return next();
  }

  function requireAdmin(req, res, next) {
    return requireLogin(req, res, () => {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso restrito a administradores.' });
      }
      return next();
    });
  }

  function authenticate(username, password) {
    const user = db.getUserByUsername(username);
    if (!user || !verifyPassword(user, password)) return null;
    return { id: user.id, username: user.username, role: user.role };
  }

  return { authenticate, requireLogin, requireAdmin };
}

module.exports = { createAuthMiddleware };
