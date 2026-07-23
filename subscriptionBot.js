const db = require('../db');

/**
 * Subscription Bot Template
 * config shape:
 * {
 *   welcomeMessage: "Get exclusive trading signals for 50 Stars/month.",
 *   priceStars: 50,
 *   productTitle: "Monthly Signal Access",
 *   productDescription: "30 days of premium signals in our private channel.",
 *   privateChannelId: -1001234567890,
 *   durationDays: 30
 * }
 */

async function handleUpdate(bot, update, { tg, logEvent }) {
  if (update.message) return handleMessage(bot, update.message, { tg, logEvent });
  if (update.pre_checkout_query) return handlePreCheckout(bot, update.pre_checkout_query, { tg, logEvent });
}

async function handleMessage(bot, msg, { tg, logEvent }) {
  const chatId = msg.chat.id;

  if (msg.successful_payment) {
    await grantAccess(bot, msg.from, { tg, logEvent });
    return;
  }

  if (msg.text === '/start') {
    await tg.sendMessage(bot.telegram_token, chatId, bot.config.welcomeMessage || 'Welcome!');
    return;
  }

  if (msg.text === '/subscribe') {
    await tg.sendStarsInvoice(bot.telegram_token, chatId, {
      title: bot.config.productTitle || 'Subscription',
      description: bot.config.productDescription || 'Premium access',
      payload: `sub_${bot.id}_${msg.from.id}`,
      amountStars: bot.config.priceStars || 50,
    });
    await logEvent(bot.id, 'invoice_sent', { telegram_user_id: msg.from.id });
    return;
  }

  await tg.sendMessage(
    bot.telegram_token,
    chatId,
    "Send /subscribe to get access."
  );
}

async function handlePreCheckout(bot, query, { tg, logEvent }) {
  // Always approve Stars pre-checkout unless you have a specific reason to reject
  // (e.g. product sold out). Telegram requires a response within 10 seconds.
  await tg.answerPreCheckoutQuery(bot.telegram_token, query.id, true);
  await logEvent(bot.id, 'pre_checkout', { telegram_user_id: query.from.id });
}

async function grantAccess(bot, telegramUser, { tg, logEvent }) {
  const durationDays = bot.config.durationDays || 30;
  const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

  await db.query(
    `INSERT INTO bot_subscribers (bot_id, telegram_user_id, telegram_username, status, expires_at)
     VALUES ($1, $2, $3, 'active', $4)
     ON CONFLICT (bot_id, telegram_user_id)
     DO UPDATE SET status = 'active', expires_at = EXCLUDED.expires_at`,
    [bot.id, telegramUser.id, telegramUser.username || null, expiresAt]
  );

  await logEvent(bot.id, 'payment', { telegram_user_id: telegramUser.id, expires_at: expiresAt });

  if (bot.config.privateChannelId) {
    const link = await tg.createChatInviteLink(bot.telegram_token, bot.config.privateChannelId, {
      expire_date: Math.floor(Date.now() / 1000) + 3600, // link itself expires in 1hr, single use
    });
    await tg.sendMessage(
      bot.telegram_token,
      telegramUser.id,
      `Payment received! Here's your access link (valid 1 hour, single use):\n${link.invite_link}`
    );
  } else {
    await tg.sendMessage(bot.telegram_token, telegramUser.id, 'Payment received! Access unlocked.');
  }
}

/**
 * Should be run on a schedule (e.g. daily cron) to expire subscribers
 * whose expires_at has passed and remove them from the private channel.
 */
async function expireOverdueSubscribers(bot, { tg, logEvent }) {
  const result = await db.query(
    `SELECT * FROM bot_subscribers
     WHERE bot_id = $1 AND status = 'active' AND expires_at < NOW()`,
    [bot.id]
  );

  for (const sub of result.rows) {
    await db.query(`UPDATE bot_subscribers SET status = 'expired' WHERE id = $1`, [sub.id]);
    if (bot.config.privateChannelId) {
      await tg.callTelegram(bot.telegram_token, 'banChatMember', {
        chat_id: bot.config.privateChannelId,
        user_id: sub.telegram_user_id,
      }).catch(() => {});
      await tg.callTelegram(bot.telegram_token, 'unbanChatMember', {
        chat_id: bot.config.privateChannelId,
        user_id: sub.telegram_user_id,
      }).catch(() => {});
    }
    await logEvent(bot.id, 'subscription_expired', { telegram_user_id: sub.telegram_user_id });
  }
}

module.exports = { handleUpdate, expireOverdueSubscribers };
