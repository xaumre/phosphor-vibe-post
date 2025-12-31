# PostgreSQL Database Setup

## Local Development with Docker (Recommended)

### 1. Prerequisites
- Install [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Ensure Docker Desktop is running

### 2. Start PostgreSQL Container
```bash
# Start the database
docker-compose up -d

# Check if it's running
docker-compose ps

# View logs
docker-compose logs postgres
```

### 3. Configure Environment
Update your `.env` file:
```
DATABASE_URL=postgresql://vibe_user:vibe_password@localhost:5432/vibe_terminal
JWT_SECRET=your-secret-key-here
```

### 4. Run Migrations
```bash
npm run migrate
```

### 5. Stop/Restart Database
```bash
# Stop the database
docker-compose down

# Stop and remove data (fresh start)
docker-compose down -v

# Restart
docker-compose up -d
```

### 6. Connect to Database (Optional)
```bash
# Using psql in the container
docker-compose exec postgres psql -U vibe_user -d vibe_terminal

# Or install psql locally and connect
psql postgresql://vibe_user:vibe_password@localhost:5432/vibe_terminal
```

## Local Development (Native Installation)

### 1. Install PostgreSQL
- **macOS**: `brew install postgresql@15`
- **Ubuntu/Debian**: `sudo apt-get install postgresql postgresql-contrib`
- **Windows**: Download from [postgresql.org](https://www.postgresql.org/download/)

### 2. Start PostgreSQL
```bash
# macOS (Homebrew)
brew services start postgresql@15

# Linux
sudo systemctl start postgresql
```

### 3. Create Database
```bash
# Connect to PostgreSQL
psql postgres

# Create database and user
CREATE DATABASE vibe_terminal;
CREATE USER vibe_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE vibe_terminal TO vibe_user;
\q
```

### 4. Configure Environment
Update your `.env` file:
```
DATABASE_URL=postgresql://vibe_user:your_password@localhost:5432/vibe_terminal
JWT_SECRET=your-secret-key-here
```

### 5. Run Migrations
```bash
npm run migrate
```

## Production (Render, Heroku, etc.)

### Render
1. Create a PostgreSQL database in Render dashboard
2. Copy the "Internal Database URL"
3. Add it as `DATABASE_URL` environment variable
4. Migrations run automatically on startup

### Heroku
1. Add Heroku Postgres addon: `heroku addons:create heroku-postgresql:mini`
2. Database URL is automatically set as `DATABASE_URL`
3. Run migrations: `heroku run npm run migrate`

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Posts Table
```sql
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  topic TEXT NOT NULL,
  content TEXT NOT NULL,
  ascii_art TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Database Migration Tool

### Complete Database Migration
For migrating from one PostgreSQL instance to another (e.g., local to production, or between hosting providers):

```bash
npm run db:migrate-complete
```

This interactive tool will:
1. **Backup** your current database to `backups/database-backup.sql`
2. **Prompt** you to update your `.env` file with the new `DATABASE_URL`
3. **Restore** the backup to the new database
4. **Verify** the migration was successful

### Programmatic Backup & Restore
The application includes internal backup and restore functions in `server/db.js`:
- `generateBackup()` - Creates SQL backups programmatically with statistics
- `restoreFromSQL(sqlContent)` - Restores database from SQL content programmatically

These functions are used by the migration tools and can be integrated into custom backup/restore workflows.

### Manual Migration Steps
If you prefer to run each step individually:

```bash
# 1. Backup current database
npm run db:backup

# 2. Update DATABASE_URL in .env file

# 3. Restore to new database
npm run db:restore
```

### Prerequisites for Migration
- PostgreSQL client tools installed (`pg_dump` and `psql`)
  - **macOS**: `brew install postgresql`
  - **Ubuntu**: `sudo apt-get install postgresql-client`
- Network access to both source and destination databases

## Troubleshooting

### Connection Issues
- Verify PostgreSQL is running: `pg_isready`
- Check connection string format
- Ensure database exists: `psql -l`

### Migration Issues
- Ensure PostgreSQL client tools are installed
- Verify both source and destination database URLs are correct
- Check network connectivity to both databases
- Backup files are stored in `backups/` directory

### Permission Issues
```sql
GRANT ALL PRIVILEGES ON DATABASE vibe_terminal TO vibe_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO vibe_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO vibe_user;
```

### Reset Database
```bash
# Drop and recreate
psql postgres
DROP DATABASE vibe_terminal;
CREATE DATABASE vibe_terminal;
\q

# Run migrations again
npm run migrate
```
