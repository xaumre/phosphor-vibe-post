# Database Migration Guide

This guide helps you migrate your PostgreSQL database from one instance to another, particularly useful when moving from an expiring Render free tier database.

## Prerequisites

- PostgreSQL client tools installed (`pg_dump` and `psql`)
  - **macOS**: `brew install postgresql`
  - **Ubuntu**: `sudo apt-get install postgresql-client`
- Access to both old and new database instances

## Migration Options

### Option 1: Automated Migration (Recommended)

Run the complete migration process:

```bash
npm run db:migrate-complete
```

This script will:
1. Backup your current database
2. Prompt you to update the DATABASE_URL
3. Restore data to the new database
4. Verify the migration

### Option 2: Manual Step-by-Step

#### Step 1: Backup Current Database

```bash
npm run db:backup
```

This creates a backup file in `backups/database-backup.sql`

#### Step 2: Create New Database Instance

**Via Render Dashboard:**
1. Go to https://dashboard.render.com
2. Create new PostgreSQL instance
3. Copy the new DATABASE_URL

**Via Render MCP (if payment info added):**
- The system can create it programmatically

#### Step 3: Update Configuration

Update your `.env` file with the new DATABASE_URL:

```env
DATABASE_URL=postgresql://new_user:new_pass@new_host:port/new_db
```

#### Step 4: Restore Database

```bash
npm run db:restore
```

This will:
- Test connection to new database
- Import data from backup
- Verify data integrity

## Migration Scripts

### `backup-database.js`
- Exports current database using `pg_dump`
- Creates timestamped backup in `backups/` directory
- Verifies backup file integrity

### `restore-database.js`
- Imports backup to new database using `psql`
- Tests connection before restore
- Verifies data after restore (user count, post count)

### `migrate-database.js`
- Orchestrates complete migration process
- Interactive prompts for safety
- Handles error cases gracefully

### `generateBackup()` and `restoreFromSQL()` in `server/db.js`
- **generateBackup()**: Programmatic SQL backup generation from within the application
- **restoreFromSQL(sqlContent)**: Programmatic SQL restore from content string
- Both functions create complete SQL operations with table creation, data insertion, and sequence resets
- Return detailed statistics (user count, post count, file size, restoration results)
- Used internally by migration tools and available for custom backup/restore workflows

## Troubleshooting

### Common Issues

**"pg_dump: command not found"**
- Install PostgreSQL client tools (see Prerequisites)

**"Connection refused"**
- Verify DATABASE_URL is correct
- Check network connectivity
- Ensure database instance is running

**"Permission denied"**
- Verify database credentials
- Check if user has necessary permissions

**"Backup file is empty"**
- Database might be empty (expected for new instances)
- Check if pg_dump completed successfully

### Verification

After migration, verify:
1. Application starts without errors
2. User login works
3. Posts are visible
4. New posts can be created

## Cleanup

After successful migration:
1. Test application thoroughly
2. Update production environment variables
3. Delete old database instance
4. Archive or delete backup files

## Database Schema

The migration preserves:
- **users** table: Authentication, email verification, password reset
- **posts** table: User-generated content
- **indexes**: Performance optimizations
- **relationships**: Foreign key constraints

## Security Notes

- Backup files contain sensitive data
- Store backups securely
- Delete backups after successful migration
- Use environment variables for database URLs
- Never commit database URLs to version control