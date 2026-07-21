// server.js
// Tiny backend that keeps your OpenRouter API key private and proxies
// chat requests from the frontend to OpenRouter's API.

require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  console.warn('WARNING: OPENROUTER_API_KEY is not set. Add it to your .env file.');
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const SYSTEM_PROMPT = `You are "Yo, Whaddup Bot" — a laid-back, high-energy chatbot with a fun street/hip-hop slang persona.
Speak casually with slang like "yo", "dawg", "fam", "no cap", "straight up", "that's fire", "let's get it", "for real for real".
Keep it playful, upbeat, and friendly — like a supportive homie who hypes people up.
Never use slurs, never reference violence, crime, drugs, or weapons, and never stereotype any real ethnic or cultural group — this is just a fun, exaggerated slang persona, not an impression of any real group of people.
Keep responses fairly short (2-4 sentences), fun, and conversational. Still be genuinely helpful if the user asks a real question — just answer it in this voice.`;

// Free models to try, in order. If one is rate-limited (429) or the
// provider is down (5xx), we automatically fall through to the next.
// Feel free to reorder/edit this list — check current free models at
// https://openrouter.ai/models?supported_parameters=tools&order=top-weekly
const FREE_MODELS = [
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'openai/gpt-oss-20b:free',
  'openrouter/free' // auto-router: picks whatever free model is available right now
];

async function callOpenRouter(model, messages) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.SITE_URL || 'http://localhost:3000',
      'X-Title': 'Yo, Whaddup Bot'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages
      ]
    })
  });

  const data = await response.json();
  return { ok: response.ok, status: response.status, data };
}

// POST /api/chat
// Body: { messages: [{ role: 'user' | 'assistant', content: string }, ...] }
app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages must be an array' });
    }

    console.log('Key loaded?', !!OPENROUTER_API_KEY, '| Key length:', OPENROUTER_API_KEY ? OPENROUTER_API_KEY.length : 0);

    let lastResult = null;

    for (const model of FREE_MODELS) {
      const result = await callOpenRouter(model, messages);
      lastResult = result;

      if (result.ok) {
        console.log(`Success with model: ${model}`);
        const reply = result.data.choices?.[0]?.message?.content || "My bad fam, brain glitched. Try again?";
        return res.json({ reply });
      }

      const isRetryable = result.status === 429 || result.status >= 500;
      console.error(`Model ${model} failed (status ${result.status}):`, JSON.stringify(result.data, null, 2));

      if (!isRetryable) break; // don't bother trying other models for e.g. a 401 (bad key)
      // otherwise loop continues to the next model in the list
    }

    // Every model in the list failed (or the first failure wasn't retryable)
    const data = lastResult.data;
    const isRateLimit = lastResult.status === 429;
    const detail = data.error?.message
      ? `${data.error.message}${data.error.code ? ` (code: ${data.error.code})` : ''}`
      : JSON.stringify(data);

    const userMessage = isRateLimit
      ? "Yo fam, every free model's slammed with traffic right now 😅 give it like 30 seconds and try again."
      : `OpenRouter says: ${detail}`;

    return res.status(lastResult.status).json({ error: userMessage });

  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Something went wrong on the server.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
