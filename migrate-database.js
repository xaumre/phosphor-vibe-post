require('dotenv').config();
const { backupDatabase } = require('./backup-database');
const { restoreDatabase } = require('./restore-database');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function migrateDatabaseComplete() {
  console.log('🚀 PostgreSQL Database Migration Tool');
  console.log('=====================================\n');
  
  try {
    // Step 1: Backup current database
    console.log('Step 1: Backing up current database...');
    const backupPath = await backupDatabase();
    console.log(`✅ Backup completed: ${backupPath}\n`);
    
    // Step 2: Prompt for new database URL
    console.log('Step 2: Update database configuration');
    console.log('📝 Please update your .env file with the new DATABASE_URL');
    console.log('   Example: DATABASE_URL=postgresql://user:pass@host:port/dbname\n');
    
    const proceed = await askQuestion('Have you updated the DATABASE_URL in .env? (y/n): ');
    
    if (proceed !== 'y' && proceed !== 'yes') {
      console.log('⏸️  Migration paused. Update .env and run this script again.');
      process.exit(0);
    }
    
    // Reload environment variables
    delete require.cache[require.resolve('dotenv')];
    require('dotenv').config();
    
    // Step 3: Restore to new database
    console.log('\nStep 3: Restoring to new database...');
    await restoreDatabase();
    
    console.log('\n🎉 Database migration completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Test your application thoroughly');
    console.log('   2. Update production environment variables if deployed');
    console.log('   3. Delete the old database instance once confirmed working');
    console.log('   4. Clean up backup files when no longer needed');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   - Ensure PostgreSQL client tools are installed');
    console.log('   - Verify database URLs are correct');
    console.log('   - Check network connectivity to databases');
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateDatabaseComplete();
}

module.exports = { migrateDatabaseComplete };