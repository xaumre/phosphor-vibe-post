require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const OLD_DATABASE_URL = process.env.DATABASE_URL;
const BACKUP_FILE = 'database-backup.sql';

async function backupDatabase() {
  console.log('🔄 Starting database backup...');
  
  if (!OLD_DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in environment variables');
    process.exit(1);
  }

  try {
    // Create backup directory if it doesn't exist
    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }

    const backupPath = path.join(backupDir, BACKUP_FILE);
    
    console.log(`📦 Exporting database to: ${backupPath}`);
    
    // Use pg_dump to create backup
    const command = `pg_dump "${OLD_DATABASE_URL}" > "${backupPath}"`;
    
    execSync(command, { 
      stdio: 'inherit',
      env: { ...process.env }
    });
    
    // Verify backup file exists and has content
    const stats = fs.statSync(backupPath);
    if (stats.size === 0) {
      throw new Error('Backup file is empty');
    }
    
    console.log(`✅ Database backup completed successfully`);
    console.log(`📊 Backup size: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`📁 Backup location: ${backupPath}`);
    
    return backupPath;
    
  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    
    if (error.message.includes('pg_dump: command not found')) {
      console.error('\n💡 Install PostgreSQL client tools:');
      console.error('   macOS: brew install postgresql');
      console.error('   Ubuntu: sudo apt-get install postgresql-client');
    }
    
    process.exit(1);
  }
}

// Run backup if called directly
if (require.main === module) {
  backupDatabase()
    .then((backupPath) => {
      console.log('\n🎉 Backup process completed!');
      console.log(`Next step: Update DATABASE_URL and run: node restore-database.js`);
    })
    .catch((error) => {
      console.error('Backup script failed:', error);
      process.exit(1);
    });
}

module.exports = { backupDatabase };