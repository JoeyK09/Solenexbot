const { v4: uuidv4 } = require('uuid');
const db = require('./db');
const whatsapp = require('./whatsappClient');

async function createChannel({ ownerId, name, phoneNumberId, accessToken, config = {} }) {
  const existing = await db.query('SELECT id FROM whatsapp_channels WHERE phone_number_id = $1', [phoneNumberId]);
  if (existing.rows.length) {
    const err = new Error('This WhatsApp phone number is already connected to a channel.');
    err.status = 409;
    throw err;
  }

  const id = uuidv4();
  await db.query(
    `INSERT INTO whatsapp_channels (id, owner_id, name, phone_number_id, access_token, config_json, active)
     VALUES ($1, $2, $3, $4, $5, $6, TRUE)`,
    [id, ownerId, name, phoneNumberId, accessToken, config]
  );
  return getChannelById(id);
}

async function getChannelById(id) {
  const result = await db.query('SELECT * FROM whatsapp_channels WHERE id = $1', [id]);
  const row = result.rows[0];
  if (!row) return null;
  return { ...row, config: row.config_json };
}

async function getChannelByPhoneNumberId(phoneNumberId) {
  const result = await db.query('SELECT * FROM whatsapp_channels WHERE phone_number_id = $1', [phoneNumberId]);
  const row = result.rows[0];
  if (!row) return null;
  return { ...row, config: row.config_json };
}

async function listChannelsForOwner(ownerId) {
  const result = await db.query('SELECT * FROM whatsapp_channels WHERE owner_id = $1 ORDER BY created_at DESC', [ownerId]);
  return result.rows.map(row => ({ ...row, config: row.config_json }));
}

async function deleteChannel(id, ownerId) {
  const channel = await getChannelById(id);
  if (!channel || channel.owner_id !== ownerId) return false;
  await db.query('DELETE FROM whatsapp_channels WHERE id = $1', [id]);
  return true;
}

/**
 * FAQ-style handling: same keyword-match pattern as the Telegram FAQ bot.
 * config shape: { welcomeMessage, faqs: [{ keywords: [...], answer }], fallback }
 */
async function handleInboundMessage(channel, from, text) {
  const trimmed = (text || '').trim();
  const lower = trimmed.toLowerCase();

  if (['hi', 'hello', 'start', '/start'].includes(lower)) {
    await whatsapp.sendMessage(channel.phone_number_id, channel.access_token, from, channel.config.welcomeMessage || 'Hi! Ask me a question.');
    return;
  }

  const faqs = channel.config.faqs || [];
  const match = faqs.find(f => f.keywords.some(k => lower.includes(k.toLowerCase())));

  if (match) {
    await whatsapp.sendMessage(channel.phone_number_id, channel.access_token, from, match.answer);
  } else {
    await whatsapp.sendMessage(
      channel.phone_number_id,
      channel.access_token,
      from,
      channel.config.fallback || "Sorry, I don't have an answer for that yet."
    );
  }
}

module.exports = {
  createChannel,
  getChannelById,
  getChannelByPhoneNumberId,
  listChannelsForOwner,
  deleteChannel,
  handleInboundMessage,
};
