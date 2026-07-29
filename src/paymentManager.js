const db = require('./db');

async function createPayment({ botId, provider, externalRef, telegramUserId, telegramUsername, amount, currency, status = 'pending', meta = {} }) {
  const result = await db.query(
    `INSERT INTO payments (bot_id, provider, external_ref, telegram_user_id, telegram_username, amount, currency, status, meta_json)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [botId, provider, externalRef, telegramUserId, telegramUsername || null, amount, currency, status, meta]
  );
  return result.rows[0];
}

async function getPaymentById(id) {
  const result = await db.query('SELECT * FROM payments WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function getPaymentByExternalRef(provider, externalRef) {
  const result = await db.query(
    'SELECT * FROM payments WHERE provider = $1 AND external_ref = $2 ORDER BY created_at DESC LIMIT 1',
    [provider, externalRef]
  );
  return result.rows[0] || null;
}

async function updatePaymentStatus(id, status, extraMeta = {}) {
  const result = await db.query(
    `UPDATE payments
     SET status = $1, meta_json = meta_json || $2::jsonb
     WHERE id = $3
     RETURNING *`,
    [status, extraMeta, id]
  );
  return result.rows[0] || null;
}

module.exports = { createPayment, getPaymentById, getPaymentByExternalRef, updatePaymentStatus };
