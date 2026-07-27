const fetch = require('node-fetch');

const GRAPH_VERSION = 'v20.0';

async function sendMessage(phoneNumberId, accessToken, to, text) {
  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`WhatsApp API error: ${data.error?.message || JSON.stringify(data)}`);
  }
  return data;
}

module.exports = { sendMessage };
