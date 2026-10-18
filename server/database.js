const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const CARD_TYPES = new Set(['destination', 'article']);
const USER_ROLES = new Set(['user', 'admin']);
const MAX_TAGS = 12;

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const passwordHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { passwordHash, passwordSalt: salt };
}

function verifyPassword(user, password) {
  if (!user || typeof password !== 'string' || !user.passwordHash || !user.passwordSalt) return false;
  const candidate = crypto.scryptSync(password, user.passwordSalt, 64);
  const expected = Buffer.from(user.passwordHash, 'hex');
  return expected.length === candidate.length && crypto.timingSafeEqual(candidate, expected);
}

function validateCard(card) {
  if (!card || typeof card !== 'object' || !CARD_TYPES.has(card.type)) {
    throw new TypeError('Tipo de card inválido.');
  }
  const limits = { title: 140, category: 80, summary: 600, details: 8000 };
  for (const [field, maxLength] of Object.entries(limits)) {
    if (typeof card[field] !== 'string' || !card[field].trim() || card[field].length > maxLength) {
      throw new TypeError(`Campo ${field} inválido.`);
    }
  }
  if (!Array.isArray(card.tags) || card.tags.length > MAX_TAGS || card.tags.some((tag) =>
    typeof tag !== 'string' || !tag.trim() || tag.length > 40
  )) {
    throw new TypeError('Tags inválidas.');
  }
  if (card.image !== null && card.image !== undefined &&
      (typeof card.image !== 'string' || !/^assets\/images\/[\w.-]+$/.test(card.image))) {
    throw new TypeError('Caminho de imagem inválido.');
  }
  if (card.sortOrder !== undefined && (!Number.isInteger(card.sortOrder) || card.sortOrder < 0)) {
    throw new TypeError('Ordem inválida.');
  }
  return {
    type: card.type,
    title: card.title.trim(),
    category: card.category.trim(),
    summary: card.summary.trim(),
    details: card.details.trim(),
    tags: card.tags.map((tag) => tag.trim()),
    image: card.image || null,
    sortOrder: card.sortOrder || 0
  };
}

function toCard(row) {
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    category: row.category,
    summary: row.summary,
    details: row.details,
    tags: JSON.parse(row.tags_json),
    image: row.image,
    sortOrder: row.sort_order
  };
}

function toUser(row, includePassword = false) {
  if (!row) return null;
  const user = {
    id: row.id,
    username: row.username,
    role: row.role,
    createdAt: row.created_at
  };
  if (includePassword) {
    user.passwordHash = row.password_hash;
    user.passwordSalt = row.password_salt;
  }
  return user;
}

function validateUser({ username, password, role }) {
  if (typeof username !== 'string' || !/^[a-zA-Z0-9_.-]{3,32}$/.test(username)) {
    throw new TypeError('Nome de usuário inválido. Use de 3 a 32 letras, números, ponto, hífen ou sublinhado.');
  }
  if (typeof password !== 'string' || password.length < 10 || password.length > 200) {
    throw new TypeError('A senha deve ter de 10 a 200 caracteres.');
  }
  if (!USER_ROLES.has(role)) throw new TypeError('Papel de usuário inválido.');
}

function initializeDatabase(dbPath, seedPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const connection = new DatabaseSync(dbPath);
  connection.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL COLLATE NOCASE UNIQUE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'admin')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK (type IN ('destination', 'article')),
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      summary TEXT NOT NULL,
      details TEXT NOT NULL,
      tags_json TEXT NOT NULL,
      image TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const existingCards = connection.prepare('SELECT COUNT(*) AS total FROM cards').get().total;
  if (existingCards === 0) {
    const seedCards = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    if (!Array.isArray(seedCards)) throw new TypeError('O arquivo de seed precisa conter uma lista de cards.');
    const insert = connection.prepare(`
      INSERT INTO cards (type, title, category, summary, details, tags_json, image, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    connection.exec('BEGIN');
    try {
      seedCards.forEach((card, index) => {
        const valid = validateCard({ ...card, sortOrder: card.sortOrder ?? index });
        insert.run(valid.type, valid.title, valid.category, valid.summary, valid.details,
          JSON.stringify(valid.tags), valid.image, valid.sortOrder);
      });
      connection.exec('COMMIT');
    } catch (error) {
      connection.exec('ROLLBACK');
      connection.close();
      throw error;
    }
  }

  let initialAdminPassword = null;
  const adminCount = connection.prepare("SELECT COUNT(*) AS total FROM users WHERE role = 'admin'").get().total;
  if (adminCount === 0) {
    initialAdminPassword = crypto.randomBytes(24).toString('base64url');
    const { passwordHash, passwordSalt } = hashPassword(initialAdminPassword);
    connection.prepare(`
      INSERT INTO users (username, password_hash, password_salt, role)
      VALUES (?, ?, ?, 'admin')
    `).run('admin', passwordHash, passwordSalt);
  }

  const cardQuery = connection.prepare('SELECT * FROM cards WHERE type = ? ORDER BY sort_order, id');
  const getCard = connection.prepare('SELECT * FROM cards WHERE id = ?');
  const usersQuery = connection.prepare('SELECT id, username, role, created_at FROM users ORDER BY id');
  const getUser = connection.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE');
  const getUserById = connection.prepare('SELECT id, username, role, created_at FROM users WHERE id = ?');

  const db = {
    listCards(type) {
      if (!CARD_TYPES.has(type)) throw new TypeError('Tipo de card inválido.');
      return cardQuery.all(type).map(toCard);
    },
    createCard(card) {
      const valid = validateCard(card);
      const result = connection.prepare(`
        INSERT INTO cards (type, title, category, summary, details, tags_json, image, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(valid.type, valid.title, valid.category, valid.summary, valid.details,
        JSON.stringify(valid.tags), valid.image, valid.sortOrder);
      return toCard(getCard.get(Number(result.lastInsertRowid)));
    },
    updateCard(id, card) {
      const valid = validateCard(card);
      const result = connection.prepare(`
        UPDATE cards SET type = ?, title = ?, category = ?, summary = ?, details = ?,
          tags_json = ?, image = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(valid.type, valid.title, valid.category, valid.summary, valid.details,
        JSON.stringify(valid.tags), valid.image, valid.sortOrder, id);
      return result.changes ? toCard(getCard.get(id)) : null;
    },
    deleteCard(id) {
      return connection.prepare('DELETE FROM cards WHERE id = ?').run(id).changes > 0;
    },
    listUsers() {
      return usersQuery.all().map((row) => toUser(row));
    },
    getUserByUsername(username) {
      return toUser(getUser.get(username), true);
    },
    getUserById(id) {
      return toUser(getUserById.get(id));
    },
    createUser(user) {
      validateUser(user);
      const { passwordHash, passwordSalt } = hashPassword(user.password);
      const result = connection.prepare(`
        INSERT INTO users (username, password_hash, password_salt, role) VALUES (?, ?, ?, ?)
      `).run(user.username.trim(), passwordHash, passwordSalt, user.role);
      return toUser(getUserById.get(Number(result.lastInsertRowid)));
    },
    close() {
      connection.close();
    }
  };

  return { db, initialAdminPassword };
}

module.exports = { initializeDatabase, verifyPassword };
