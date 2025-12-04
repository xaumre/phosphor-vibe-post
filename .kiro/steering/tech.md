# Tech Stack

## Backend

- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL with `pg` driver
- **Authentication**: JWT tokens (`jsonwebtoken`) + bcrypt password hashing
- **Email**: SendGrid Web API (`@sendgrid/mail`)
- **AI/LLM**: Google Gemini 2.5 Flash (`@google/generative-ai`)
- **Environment**: dotenv for configuration

## Frontend

- **Vanilla JavaScript**: No framework, direct DOM manipulation
- **Styling**: Tailwind CSS (compiled from `input.css` to `styles.css`)
- **UI Theme**: Vintage IBM 5250 terminal aesthetic with CRT effects

## Database

- **Local Development**: Docker Compose with PostgreSQL 15 Alpine
- **Production**: Render PostgreSQL (or compatible)
- **Schema Management**: Migration scripts in `server/migrations/`

## Common Commands

### Development
```bash
npm run dev              # Build CSS and start server
npm start                # Start server only
```

### Building
```bash
npm run build            # Build CSS and run migrations
npm run build:css        # Compile and minify Tailwind CSS
```

### Database
```bash
npm run migrate          # Run main database migrations
npm run migrate:verification  # Run email verification migration
```

### Docker (Local PostgreSQL)
```bash
docker-compose up -d     # Start PostgreSQL container
docker-compose down      # Stop PostgreSQL container
```

## Environment Variables

Required in `.env` (see `.env.example`):
- `GEMINI_API_KEY` - Google Gemini API key (optional, falls back to mock data)
- `JWT_SECRET` - Secret for JWT token signing
- `DATABASE_URL` - PostgreSQL connection string
- `SENDGRID_API_KEY` - SendGrid API key for emails
- `FROM_EMAIL` - Verified sender email address
- `APP_URL` - Application URL for email links
- `PORT` - Server port (default: 3000)

## Deployment

Configured for Render with:
- Build command: `npm install && npm run build:css`
- Start command: `npm start`
- Health check endpoint: `/health`
