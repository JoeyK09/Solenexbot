const fetch = require('node-fetch');

async function generateReply({ apiKey, model, systemPrompt, messages, maxTokens }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model || 'claude-sonnet-4-5',
      max_tokens: maxTokens || 500,
      system: systemPrompt || 'You are a helpful assistant.',
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Anthropic API error: ${data.error?.message || JSON.stringify(data)}`);
  }
  const text = data.content?.find(c => c.type === 'text')?.text;
  if (!text) throw new Error('Anthropic API returned no text content.');
  return text;
}

module.exports = { generateReply };
