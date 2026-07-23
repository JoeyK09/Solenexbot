const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const db = require('./db');
const tg = require('./telegramClient');

const templates = {
  faq: require('./templates/faqBot'),
  subscription: require('./templates/subscriptionBot'),
};

/**
 * Registers a brand new tenant bot:
 * 1. Validates the token against Telegram
 * 2. Saves it to the DB with a random webhook secret
 * 3. Points Telegram's webhook at OUR single shared endpoint,
 *    scoped by this bot's id: {BASE_URL}/webhook/{botId}
 */
async function createBot({ ownerId, name, telegramToken, templateType, config = {} }) {
  if (!templates[templateType]) {
    throw new Error(`Unknown template_type "${templateType}". Valid: ${Object.keys(templates).join(', ')}`);
  }

  const me = await tg.getMe(telegramToken); // throws if token invalid

  const id = uuidv4();
  const webhookSecret = crypto.randomBytes(24).toString('hex');

  await db.query(
    `INSERT INTO bots (id, owner_id, name, telegram_token, telegram_bot_username, template_type, config_json, webhook_secret, active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)`,
    [id, ownerId, name, telegramToken, me.username, templateType, config, webhookSecret]
  );

  const baseUrl = process.env.BASE_URL;
  await tg.setWebhook(telegramToken, `${baseUrl}/webhook/${id}`, webhookSecret);

  return getBotById(id);
}

async function getBotById(id) {
  const result = await db.query('SELECT * FROM bots WHERE id = $1', [id]);
  const row = result.rows[0];
  if (!row) return null;
  // config_json comes back already parsed as a JS object -- pg parses jsonb natively.
  return { ...row, config: row.config_json };
}

async function listBotsForOwner(ownerId) {
  const result = await db.query('SELECT * FROM bots WHERE owner_id = $1 ORDER BY created_at DESC', [ownerId]);
  return result.rows.map(row => ({ ...row, config: row.config_json }));
}

async function deleteBot(id, ownerId) {
  const bot = await getBotById(id);
  if (!bot || bot.owner_id !== ownerId) return false;
  await tg.deleteWebhook(bot.telegram_token).catch(() => {});
  await db.query('DELETE FROM bots WHERE id = $1', [id]);
  return true;
}

async function logEvent(botId, eventType, meta = {}) {
  await db.query(
    'INSERT INTO bot_events (bot_id, event_type, meta_json) VALUES ($1, $2, $3)',
    [botId, eventType, meta]
  );
}

/**
 * Entry point called by the webhook route for every inbound Telegram update.
 * Looks up which tenant bot this belongs to and hands off to its template handler.
 */
async function handleUpdate(botId, secretTokenFromHeader, update) {
  const bot = await getBotById(botId);
  if (!bot || !bot.active) {
    return { status: 404, body: { error: 'bot not found or inactive' } };
  }
  if (secretTokenFromHeader !== bot.webhook_secret) {
    return { status: 401, body: { error: 'invalid webhook secret' } };
  }

  const handler = templates[bot.template_type];
  try {
    await handler.handleUpdate(bot, update, { tg, logEvent });
  } catch (err) {
    await logEvent(bot.id, 'error', { message: err.message });
    console.error(`[bot ${bot.id}] handler error:`, err);
  }

  return { status: 200, body: { ok: true } };
}

module.exports = {
  createBot,
  getBotById,
  listBotsForOwner,
  deleteBot,
  handleUpdate,
  logEvent,
  templates,
};
