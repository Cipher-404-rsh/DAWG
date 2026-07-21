# Yo, Whaddup Bot

A slang-talking chatbot UI (styled like Claude's chat interface) backed by
OpenRouter's free `google/gemma-4-31b-it:free` model.

## How it's structured

- `public/index.html` — the frontend chat UI. Talks only to your own `/api/chat` endpoint.
- `server.js` — a small Express backend that holds your real OpenRouter API key
  and forwards chat requests to OpenRouter. The key never reaches the browser.
- `.env` (you create this) — holds your secret key. Never commit it to git.

## Setup (local)

1. Install Node.js if you don't have it: https://nodejs.org

2. Install dependencies:
   ```
   npm install
   ```

3. Create your `.env` file:
   ```
   cp .env.example .env
   ```
   Then open `.env` and paste in your real OpenRouter key:
   ```
   OPENROUTER_API_KEY=sk-or-v1-your-real-key-here
   ```

   ⚠️ Get a fresh key from https://openrouter.ai/keys — regenerate a new one
   if you've ever pasted your key anywhere public (chat, forum, screenshot, etc.)
   since it should be treated as compromised at that point.

4. Run the server:
   ```
   npm start
   ```

5. Open http://localhost:3000 in your browser. Chat away!

## Deploying it publicly

You can deploy this to any Node-friendly host. Below are step-by-step guides for
a few good free/cheap options. The core idea is always the same: your code goes
to a Git repo, the host runs `npm start`, and your API key lives only in the
host's environment variable settings — never in your code.

### 0. Push your project to GitHub (needed for all options below)

1. Create a new repo on https://github.com/new (keep it private if you'd like).
2. In your project folder:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```
3. Double check `.env` was NOT pushed (it shouldn't appear on GitHub — `.gitignore`
   already excludes it). If you ever see it there, rotate your key immediately.

### Option A: Render (free tier, simplest)

1. Go to https://render.com and sign up / log in (GitHub login is easiest).
2. Click **New +** → **Web Service**.
3. Connect your GitHub repo.
4. Fill in the settings:
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
5. Scroll to **Environment Variables** → click **Add Environment Variable**:
   - Key: `OPENROUTER_API_KEY` → Value: your real key
   - (optional) Key: `SITE_URL` → Value: your Render URL once you have it
6. Click **Create Web Service**. Render will build and deploy automatically.
7. Once live, Render gives you a URL like `https://your-app.onrender.com` —
   that's your chatbot, publicly hosted.

Note: Render's free tier "spins down" after inactivity, so the first request
after idle time can take ~30–60 seconds to wake back up. Fine for a personal
project; upgrade to a paid instance if you need it always-on.

### Option B: Railway

1. Go to https://railway.app and sign up / log in with GitHub.
2. Click **New Project** → **Deploy from GitHub repo** → select your repo.
3. Railway auto-detects Node and runs `npm install` + `npm start` for you.
4. Go to your project's **Variables** tab → add:
   - `OPENROUTER_API_KEY` = your real key
5. Go to **Settings** → **Networking** → click **Generate Domain** to get a
   public URL.
6. Redeploy if prompted. Your app is now live at the generated URL.

### Option C: Fly.io

1. Install the Fly CLI: https://fly.io/docs/flyctl/install/
2. In your project folder, run:
   ```
   fly launch
   ```
   Follow the prompts (choose a region, skip adding a database, don't deploy yet
   if it asks).
3. Set your secret key (this is the Fly equivalent of an env variable, and it's
   encrypted rather than stored in plain text):
   ```
   fly secrets set OPENROUTER_API_KEY=your-real-key-here
   ```
4. Deploy:
   ```
   fly deploy
   ```
5. Fly will give you a URL like `https://your-app.fly.dev`.

### Option D: A VPS you manage yourself (DigitalOcean, AWS EC2, etc.)

1. SSH into your server, install Node.js (https://nodejs.org).
2. Clone your repo:
   ```
   git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
   cd YOUR_REPO
   npm install
   ```
3. Create `.env` directly on the server (never sync this file via git):
   ```
   nano .env
   ```
   Paste in `OPENROUTER_API_KEY=your-real-key-here`, save, exit.
4. Run the app persistently with a process manager so it survives reboots/crashes:
   ```
   npm install -g pm2
   pm2 start server.js --name yo-whaddup-bot
   pm2 save
   pm2 startup
   ```
5. (Recommended) Put Nginx in front of it as a reverse proxy and set up HTTPS
   with Certbot/Let's Encrypt so your site loads over `https://`.

## Post-deploy checklist

- [ ] Visit your live URL and send a test message to confirm it replies.
- [ ] Confirm `.env` is not visible anywhere in your GitHub repo.
- [ ] If you ever pasted your key in chat, a doc, or a screenshot, regenerate
      it from https://openrouter.ai/keys and update it in your host's env vars.
- [ ] Keep an eye on OpenRouter's free-tier rate limits (about 20 requests/min,
      up to 200/day depending on the model) — if traffic grows, consider adding
      credits or switching to a paid model.

## Notes

- The free Gemma model has rate limits (roughly 20 requests/minute, 200/day).
  If you hit them, the app will show an error message from the server.
- If you want a different personality or a different free model, edit the
  `SYSTEM_PROMPT` and `model` values in `server.js`.
