# Quick Start Guide

## Development Setup (5 minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment
```bash
cp .env.example .env
```

### 3. Configure Database
**Option A: Docker (Recommended)**
```bash
docker-compose up -d
npm run migrate
```

**Option B: Local PostgreSQL**
See `DATABASE_SETUP.md` for detailed instructions.

### 4. Configure Email (Optional)
Add to `.env`:
```bash
SENDGRID_API_KEY=your-sendgrid-key
FROM_EMAIL=your-verified-email@example.com
```

### 5. Configure AI (Optional)
Add to `.env`:
```bash
GEMINI_API_KEY=your-gemini-key
```

### 6. Start Development
```bash
npm run dev
```

## Available Scripts

- `npm run dev` - Build CSS and start development server
- `npm start` - Start server only
- `npm run build` - Build CSS and run migrations
- `npm run migrate` - Run database migrations
- `npm run db:migrate-complete` - Complete database migration tool
- `npm run db:backup` - Backup current database
- `npm run db:restore` - Restore database from backup

## Database Migration

To migrate from one database to another:
```bash
npm run db:migrate-complete
```

This interactive tool handles the complete migration process.

---

# Email Verification - Quick Start

## What Was Implemented

✓ Email verification system using SendGrid Web API (works on Render free tier)
✓ Database schema updated with verification fields
✓ Verification emails sent on signup
✓ Email verification page and flow
✓ Resend verification email functionality
✓ Verification status banner in UI

## Quick Setup (5 minutes)

### 1. Install SendGrid Package
Already done! `@sendgrid/mail` has been installed.

### 2. Get SendGrid API Key
1. Sign up at https://sendgrid.com (free tier: 100 emails/day)
2. Go to Settings > API Keys > Create API Key
3. Give it "Mail Send" permissions
4. Copy the key

### 3. Verify Your Sender Email
1. In SendGrid: Settings > Sender Authentication
2. Choose "Single Sender Verification"
3. Add and verify your email address

### 4. Update .env File
```bash
SENDGRID_API_KEY=SG.your-actual-key-here
FROM_EMAIL=your-verified-email@example.com
APP_URL=http://localhost:3000
```

### 5. Run Migration
```bash
npm run migrate:verification
```

### 6. Test It!
```bash
npm run dev
```

Then:
1. Sign up with a real email
2. Check your inbox
3. Click the verification link
4. Done!

## For Production (Render)

Update environment variables in Render dashboard:
- `SENDGRID_API_KEY` - your SendGrid API key
- `FROM_EMAIL` - your verified sender email
- `APP_URL` - your Render app URL (e.g., https://yourapp.onrender.com)

## Files Modified/Created

**New Files:**
- `server/email.js` - SendGrid email functions
- `server/migrations/add_email_verification.js` - Database migration
- `EMAIL_VERIFICATION_SETUP.md` - Detailed setup guide

**Modified Files:**
- `server/auth.js` - Added verification logic
- `server/db.js` - Updated schema
- `server/server.js` - Added verification endpoints
- `public/index.html` - Added verification UI
- `public/app.js` - Added verification handlers
- `.env.example` - Added new variables
- `package.json` - Added migration script

## Need Help?

See `EMAIL_VERIFICATION_SETUP.md` for detailed documentation and troubleshooting.
