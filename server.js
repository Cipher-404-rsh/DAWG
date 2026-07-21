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

// POST /api/chat
// Body: { messages: [{ role: 'user' | 'assistant', content: string }, ...] }
app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages must be an array' });
    }

    console.log('Key loaded?', !!OPENROUTER_API_KEY, '| Key length:', OPENROUTER_API_KEY ? OPENROUTER_API_KEY.length : 0);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        // Optional but recommended by OpenRouter for analytics/rankings:
        'HTTP-Referer': process.env.SITE_URL || 'http://localhost:3000',
        'X-Title': 'Yo, Whaddup Bot'
      },
      body: JSON.stringify({
        model: 'google/gemma-4-31b-it:free',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('OpenRouter error (full):', JSON.stringify(data, null, 2));
      const detail = data.error?.message
        ? `${data.error.message}${data.error.code ? ` (code: ${data.error.code})` : ''}`
        : JSON.stringify(data);
      return res.status(response.status).json({ error: `OpenRouter says: ${detail}` });
    }

    const reply = data.choices?.[0]?.message?.content || "My bad fam, brain glitched. Try again?";
    res.json({ reply });

  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Something went wrong on the server.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
