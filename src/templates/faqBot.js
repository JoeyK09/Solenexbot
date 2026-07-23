/**
 * FAQ Bot Template
 * config shape:
 * {
 *   welcomeMessage: "Hi! Ask me anything about our shop.",
 *   faqs: [ { keywords: ["hours","open"], answer: "We're open 8am-6pm daily." }, ... ],
 *   fallback: "I'm not sure about that -- a human will follow up soon."
 * }
 */

async function handleUpdate(bot, update, { tg, logEvent }) {
  const msg = update.message;
  if (!msg || !msg.text) return;

  const chatId = msg.chat.id;
  const text = msg.text.trim();
  logEvent(bot.id, 'message_in', { chat_id: chatId });

  if (text === '/start') {
    await tg.sendMessage(bot.telegram_token, chatId, bot.config.welcomeMessage || 'Hi! Ask me a question.');
    return;
  }

  const faqs = bot.config.faqs || [];
  const lower = text.toLowerCase();
  const match = faqs.find(f => f.keywords.some(k => lower.includes(k.toLowerCase())));

  if (match) {
    await tg.sendMessage(bot.telegram_token, chatId, match.answer);
  } else {
    await tg.sendMessage(bot.telegram_token, chatId, bot.config.fallback || "Sorry, I don't have an answer for that yet.");
  }
}

module.exports = { handleUpdate };
