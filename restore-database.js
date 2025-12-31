require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Configuration
const NEW_DATABASE_URL = process.env.DATABASE_URL;
const BACKUP_FILE = path.join(__dirname, 'backups', 'database-backup.sql');

async function restoreDatabase() {
  console.log('🔄 Starting database restore...');
  
  if (!NEW_DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in environment variables');
    console.error('💡 Make sure to update .env with the new database URL');
    process.exit(1);
  }

  if (!fs.existsSync(BACKUP_FILE)) {
    console.error(`❌ Backup file not found: ${BACKUP_FILE}`);
    console.error('💡 Run backup-database.js first');
    process.exit(1);
  }

  try {
    // Test connection to new database
    console.log('🔗 Testing connection to new database...');
    const pool = new Pool({
      connectionString: NEW_DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    await pool.query('SELECT 1');
    await pool.end();
    console.log('✅ Connection to new database successful');

    // Restore database from backup
    console.log(`📥 Restoring database from: ${BACKUP_FILE}`);
    
    const command = `psql "${NEW_DATABASE_URL}" < "${BACKUP_FILE}"`;
    
    execSync(command, { 
      stdio: 'inherit',
      env: { ...process.env }
    });
    
    console.log('✅ Database restore completed successfully');
    
    // Verify data was restored
    await verifyRestore();
    
  } catch (error) {
    console.error('❌ Restore failed:', error.message);
    
    if (error.message.includes('psql: command not found')) {
      console.error('\n💡 Install PostgreSQL client tools:');
      console.error('   macOS: brew install postgresql');
      console.error('   Ubuntu: sudo apt-get install postgresql-client');
    }
    
    process.exit(1);
  }
}

async function verifyRestore() {
  console.log('🔍 Verifying restored data...');
  
  const pool = new Pool({
    connectionString: NEW_DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // Check users table
    const usersResult = await pool.query('SELECT COUNT(*) FROM users');
    const userCount = parseInt(usersResult.rows[0].count);
    
    // Check posts table
    const postsResult = await pool.query('SELECT COUNT(*) FROM posts');
    const postCount = parseInt(postsResult.rows[0].count);
    
    console.log(`📊 Verification results:`);
    console.log(`   👥 Users: ${userCount}`);
    console.log(`   📝 Posts: ${postCount}`);
    
    if (userCount === 0 && postCount === 0) {
      console.warn('⚠️  No data found - this might be expected for a new database');
    } else {
      console.log('✅ Data verification successful');
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run restore if called directly
if (require.main === module) {
  restoreDatabase()
    .then(() => {
      console.log('\n🎉 Database migration completed successfully!');
      console.log('💡 Test your application to ensure everything works correctly');
    })
    .catch((error) => {
      console.error('Restore script failed:', error);
      process.exit(1);
    });
}

module.exports = { restoreDatabase, verifyRestore };