# Project Structure

## Directory Layout

```
/
├── server/              # Backend Node.js application
│   ├── server.js        # Main Express server and route definitions
│   ├── auth.js          # Authentication logic (signup, login, JWT, email verification)
│   ├── db.js            # Database connection and initialization
│   ├── email.js         # SendGrid email sending functions
│   ├── generator.js     # AI content generation (posts, topics, quotes, ASCII art)
│   ├── migrate.js       # Main database migration runner
│   └── migrations/      # Database migration scripts
│       └── add_email_verification.js
│
├── public/              # Frontend static files
│   ├── index.html       # Single-page application HTML
│   ├── app.js           # Client-side JavaScript (auth, API calls, UI)
│   ├── input.css        # Tailwind source CSS
│   └── styles.css       # Compiled Tailwind CSS (generated)
│
├── .env                 # Environment variables (not in git)
├── .env.example         # Environment template
├── docker-compose.yml   # Local PostgreSQL setup
├── package.json         # Dependencies and scripts
└── tailwind.config.js   # Tailwind CSS configuration
```

## Key Architectural Patterns

### Server Architecture
- **Modular separation**: Auth, database, email, and generation logic in separate modules
- **Middleware chain**: CORS → JSON parsing → auth verification → email verification
- **Error handling**: Try-catch blocks with appropriate HTTP status codes
- **Database pooling**: Single pool instance exported from `db.js`

### Authentication Flow
- JWT tokens with 7-day expiration
- Middleware: `authMiddleware` (validates token) → `requireVerifiedEmail` (checks verification status)
- Protected routes require both valid JWT and verified email

### Database Patterns
- **Migrations**: Versioned scripts that check for existing tables/columns before applying changes
- **Schema**: `users` table (auth + verification) and `posts` table (user-generated content)
- **Queries**: Direct SQL with parameterized queries (no ORM)

### AI Generation
- **Graceful degradation**: Falls back to static/mock data when API key is missing
- **Parallel generation**: Post text and ASCII art generated concurrently with `Promise.all`
- **Platform-specific**: Configuration object defines tone, length, and hashtag count per platform

### Frontend Patterns
- **SPA routing**: Hash-based navigation (`#login`, `#signup`, `#app`, `#verify`)
- **State management**: JWT stored in localStorage, user state in memory
- **API communication**: Fetch with Bearer token authentication
- **UI updates**: Direct DOM manipulation, no virtual DOM

## File Responsibilities

- `server.js`: Route definitions, middleware setup, server initialization
- `auth.js`: All authentication logic including verification tokens
- `generator.js`: All AI/LLM interactions and fallback logic
- `db.js`: Database connection, pool management, schema initialization
- `email.js`: SendGrid integration for verification emails
- `app.js`: Client-side routing, API calls, UI state management
