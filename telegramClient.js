const fetch = require('node-fetch');

const API_ROOT = 'https://api.telegram.org';

/**
 * Low-level call to Telegram's Bot API for a given bot token.
 * Every tenant bot uses its own token, so this is called per-bot, not globally.
 */
async function callTelegram(token, method, payload = {}) {
  const res = await fetch(`${API_ROOT}/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.ok) {
    const err = new Error(`Telegram API error on ${method}: ${data.description}`);
    err.telegram = data;
    throw err;
  }
  return data.result;
}

async function getMe(token) {
  return callTelegram(token, 'getMe');
}

async function setWebhook(token, url, secretToken) {
  return callTelegram(token, 'setWebhook', {
    url,
    secret_token: secretToken,
  });
}

async function deleteWebhook(token) {
  return callTelegram(token, 'deleteWebhook');
}

async function sendMessage(token, chatId, text, extra = {}) {
  return callTelegram(token, 'sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    ...extra,
  });
}

/**
 * Sends a Telegram Stars invoice. Stars payments use currency "XTR"
 * and provider_token is left empty (Stars are handled natively by Telegram).
 */
async function sendStarsInvoice(token, chatId, { title, description, payload, amountStars }) {
  return callTelegram(token, 'sendInvoice', {
    chat_id: chatId,
    title,
    description,
    payload,
    provider_token: '',
    currency: 'XTR',
    prices: [{ label: title, amount: amountStars }],
  });
}

async function answerPreCheckoutQuery(token, preCheckoutQueryId, ok, errorMessage) {
  return callTelegram(token, 'answerPreCheckoutQuery', {
    pre_checkout_query_id: preCheckoutQueryId,
    ok,
    ...(errorMessage ? { error_message: errorMessage } : {}),
  });
}

async function createChatInviteLink(token, chatId, extra = {}) {
  return callTelegram(token, 'createChatInviteLink', {
    chat_id: chatId,
    member_limit: 1,
    ...extra,
  });
}

module.exports = {
  callTelegram,
  getMe,
  setWebhook,
  deleteWebhook,
  sendMessage,
  sendStarsInvoice,
  answerPreCheckoutQuery,
  createChatInviteLink,
};
