const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_TTL = '7d';

async function registerUser(email, password) {
  const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length) {
    const err = new Error('An account with this email already exists.');
    err.status = 409;
    throw err;
  }
  const hash = await bcrypt.hash(password, 10);
  const result = await db.query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING *',
    [email, hash]
  );
  return sanitizeUser(result.rows[0]);
}

async function loginUser(email, password) {
  const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  const row = result.rows[0];
  if (!row) {
    const err = new Error('Invalid email or password.');
    err.status = 401;
    throw err;
  }
  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) {
    const err = new Error('Invalid email or password.');
    err.status = 401;
    throw err;
  }
  const token = signToken(row);
  return { token, user: sanitizeUser(row) };
}

function signToken(userRow) {
  return jwt.sign({ sub: userRow.id, email: userRow.email, plan: userRow.plan }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

async function getUserById(id) {
  const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] ? sanitizeUser(result.rows[0]) : null;
}

function sanitizeUser(row) {
  const { password_hash, ...rest } = row;
  return rest;
}

/**
 * Express middleware: verifies the Bearer JWT and attaches req.userId.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing Authorization header' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.sub;
    req.userPlan = payload.plan;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { registerUser, loginUser, requireAuth, getUserById };
