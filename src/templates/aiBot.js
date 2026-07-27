const db = require('../db');
const anthropic = require('../ai/anthropic');
const openai = require('../ai/openai');

const HISTORY_TURNS = 10; // messages of context kept per user, not tokens -- keeps cost/latency predictable

/**
 * AI Chatbot Template
 * config shape:
 * {
 *   welcomeMessage: "Hi! Ask me anything.",
 *   systemPrompt: "You are a friendly assistant for Joey's Shop. Keep replies under 3 sentences.",
 *   aiProvider: "anthropic",      // or "openai"
 *   apiKey: "sk-...",             // the bot owner's own key -- their own billing, not Solenex's
 *   model: "claude-sonnet-4-5"    // optional, provider-specific default is used if omitted
 * }
 */

async function handleUpdate(bot, update, { tg, logEvent }) {
  const msg = update.message;
  if (!msg || !msg.text) return;

  const chatId = msg.chat.id;
  const text = msg.text.trim();

  if (text === '/start') {
    await tg.sendMessage(bot.telegram_token, chatId, bot.config.welcomeMessage || 'Hi! Ask me anything.');
    return;
  }

  if (text === '/reset') {
    await db.query('DELETE FROM bot_conversations WHERE bot_id = $1 AND telegram_user_id = $2', [bot.id, msg.from.id]);
    await tg.sendMessage(bot.telegram_token, chatId, 'Conversation cleared -- starting fresh.');
    return;
  }

  if (!bot.config.apiKey) {
    await tg.sendMessage(bot.telegram_token, chatId, 'This bot is not fully set up yet -- no AI API key configured.');
    return;
  }

  await logEvent(bot.id, 'message_in', { chat_id: chatId });
  await saveTurn(bot.id, msg.from.id, 'user', text);

  try {
    const history = await getRecentHistory(bot.id, msg.from.id);
    const provider = bot.config.aiProvider === 'openai' ? openai : anthropic;

    const reply = await provider.generateReply({
      apiKey: bot.config.apiKey,
      model: bot.config.model,
      systemPrompt: bot.config.systemPrompt,
      messages: history,
    });

    await saveTurn(bot.id, msg.from.id, 'assistant', reply);
    await tg.sendMessage(bot.telegram_token, chatId, reply);
  } catch (err) {
    await logEvent(bot.id, 'error', { message: err.message, context: 'ai_reply' });
    await tg.sendMessage(bot.telegram_token, chatId, "Sorry, I couldn't generate a reply just now. Please try again in a moment.");
  }
}

async function saveTurn(botId, telegramUserId, role, content) {
  await db.query(
    'INSERT INTO bot_conversations (bot_id, telegram_user_id, role, content) VALUES ($1, $2, $3, $4)',
    [botId, telegramUserId, role, content]
  );
}

async function getRecentHistory(botId, telegramUserId) {
  const result = await db.query(
    `SELECT role, content FROM bot_conversations
     WHERE bot_id = $1 AND telegram_user_id = $2
     ORDER BY created_at DESC LIMIT $3`,
    [botId, telegramUserId, HISTORY_TURNS]
  );
  return result.rows.reverse(); // chronological order for the API call
}

module.exports = { handleUpdate };
