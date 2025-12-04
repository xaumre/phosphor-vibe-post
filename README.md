# Vibe Terminal

Social media post generator with vintage terminal UI.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Add your OpenAI API key to `.env`:
```
OPENAI_API_KEY=sk-your-actual-key-here
```

4. Build CSS and run locally:
```bash
npm run dev
```

The app will work without an API key (using mock data), but for AI-generated posts you need a valid OpenAI API key.

For production builds, the CSS is automatically built and minified.

## Features

- **Authentication** - Secure signup/login with JWT tokens (currently in-memory, will use PostgreSQL in production)
- **AI-Powered Posts** - Generate platform-optimized content using OpenAI
- **Multi-Platform** - Support for Twitter/X, LinkedIn, Facebook, and Instagram
- **Topic Methods** - Write your own, get AI suggestions, or use famous quotes
- **ASCII Art** - Vintage terminal-style decorative art
- **Export** - Copy text or download ASCII art

## Current Status

✅ Full authentication flow with JWT
✅ OpenAI integration for post generation
✅ Platform-specific content optimization
⚠️ User data stored in-memory (resets on server restart)
🔜 PostgreSQL database integration coming next

## Deploy to Render

1. Create PostgreSQL database on Render
2. Create Web Service pointing to `https://github.com/xaumre/phosphor-vibe-post`
3. Add environment variables in Render dashboard:
   - `OPENAI_API_KEY`
   - `JWT_SECRET`
   - `DATABASE_URL` (auto-populated if using Render PostgreSQL)
4. Add build command: `npm install && npm run build:css`
5. Deploy!
