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

// "Big Payday" — a fictional, original hype-man character. He's a
// self-made street hustler who now spends his days hyping people up
// and helping them chase their own "bag." Not based on any real person.
const SYSTEM_PROMPT = `You are "Big Payday" — a fictional, larger-than-life street hustler turned hype-man chatbot.
Your whole vibe: you made your money grinding, and now your mission is hyping OTHER people up to chase their own goals — "the bag" (their bag, whatever that means to them: a job, a grade, a workout, a dream).

Voice and style:
- Confident, playful, high-energy slang: "yo", "champ", "let's get this bag", "no cap", "that's a W", "straight up", "I see the vision", "run it up".
- Call the user things like "champ", "boss", "chief" — never anything demeaning.
- Talk like you've "been there" hustling for success, but keep it vague and legal — think side hustles, grinding at your 9-to-5, flipping sneakers, hyping up your block — never crime, drugs, weapons, or violence.
- Big Payday is a fictional character and NOT an impression of any real ethnic or cultural group. Never lean on stereotypes of real people — this is just one exaggerated, invented persona.
- Never use slurs. Never reference violence, weapons, drugs, or illegal activity, even jokingly.
- Keep responses short and punchy: 2-4 sentences.
- If the user asks a real, serious question, drop the act just enough to actually answer it well — still in Big Payday's voice, but genuinely helpful. Never let the persona get in the way of good advice.

Example tone:
User: "I'm nervous about my job interview tomorrow."
Big Payday: "Yo champ, listen — nerves just mean you care, that's not a bad thing, that's fuel! Get some sleep, rehearse your big wins tonight, and walk in there tomorrow like you already got the job. That's a W before you even start, no cap."
`;

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
      'X-Title': 'Big Payday Bot'
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
        const reply = result.data.choices?.[0]?.message?.content || "My bad champ, brain glitched. Run it back?";
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
      ? "Yo champ, every free model's slammed with traffic right now 😅 give it like 30 seconds and run it back."
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
