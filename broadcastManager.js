const { v4: uuidv4 } = require('uuid');
const db = require('./db');
const tg = require('./telegramClient');

async function listContactsForBot(botId) {
  const result = await db.query('SELECT * FROM bot_contacts WHERE bot_id = $1 ORDER BY last_seen_at DESC', [botId]);
  return result.rows;
}

async function countContactsForBot(botId) {
  const result = await db.query('SELECT COUNT(*)::int AS count FROM bot_contacts WHERE bot_id = $1', [botId]);
  return result.rows[0].count;
}

async function createBroadcast({ botId, message, scheduledAt }) {
  const id = uuidv4();
  const status = scheduledAt ? 'scheduled' : 'sending';
  await db.query(
    `INSERT INTO broadcasts (id, bot_id, message, status, scheduled_at, total_count)
     VALUES ($1, $2, $3, $4, $5, (SELECT COUNT(*) FROM bot_contacts WHERE bot_id = $2))`,
    [id, botId, message, status, scheduledAt || null]
  );
  return getBroadcastById(id);
}

async function getBroadcastById(id) {
  const result = await db.query('SELECT * FROM broadcasts WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function listBroadcastsForBot(botId) {
  const result = await db.query('SELECT * FROM broadcasts WHERE bot_id = $1 ORDER BY created_at DESC', [botId]);
  return result.rows;
}

async function findDueScheduledBroadcasts() {
  const result = await db.query(
    `SELECT * FROM broadcasts WHERE status = 'scheduled' AND scheduled_at <= NOW()`
  );
  return result.rows;
}

/**
 * Sends a broadcast to every contact of its bot, one message at a time
 * with a small delay -- Telegram's guidance is to stay well under ~30
 * messages/sec to distinct users, so 50ms between sends (~20/sec) leaves
 * headroom. Runs in the background; the caller doesn't wait for this.
 */
async function sendBroadcastNow(broadcastId) {
  const broadcast = await getBroadcastById(broadcastId);
  if (!broadcast) return;

  await db.query(`UPDATE broadcasts SET status = 'sending' WHERE id = $1`, [broadcastId]);

  const botResult = await db.query('SELECT * FROM bots WHERE id = $1', [broadcast.bot_id]);
  const bot = botResult.rows[0];
  if (!bot) {
    await db.query(`UPDATE broadcasts SET status = 'failed' WHERE id = $1`, [broadcastId]);
    return;
  }

  const contacts = await listContactsForBot(broadcast.bot_id);
  let sent = 0;
  let failed = 0;

  for (const contact of contacts) {
    try {
      await tg.sendMessage(bot.telegram_token, contact.telegram_user_id, broadcast.message);
      sent++;
    } catch (err) {
      failed++; // most commonly: user blocked the bot -- expected and not fatal
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  await db.query(
    `UPDATE broadcasts SET status = 'sent', sent_count = $1, failed_count = $2, sent_at = NOW() WHERE id = $3`,
    [sent, failed, broadcastId]
  );
}

module.exports = {
  listContactsForBot,
  countContactsForBot,
  createBroadcast,
  getBroadcastById,
  listBroadcastsForBot,
  findDueScheduledBroadcasts,
  sendBroadcastNow,
};
