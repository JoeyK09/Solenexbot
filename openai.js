const fetch = require('node-fetch');

async function generateReply({ apiKey, model, systemPrompt, messages, maxTokens }) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      max_tokens: maxTokens || 500,
      messages: [
        { role: 'system', content: systemPrompt || 'You are a helpful assistant.' },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ],
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`OpenAI API error: ${data.error?.message || JSON.stringify(data)}`);
  }
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('OpenAI API returned no text content.');
  return text;
}

module.exports = { generateReply };
