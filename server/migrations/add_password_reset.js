const { Pool } = require('pg');

async function addPasswordResetColumns() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔄 Adding password reset columns...');
    
    // Check if reset_token column exists
    const resetTokenCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'reset_token'
    `);
    
    if (resetTokenCheck.rows.length === 0) {
      await pool.query('ALTER TABLE users ADD COLUMN reset_token VARCHAR(64)');
      console.log('✅ Added reset_token column');
    } else {
      console.log('ℹ️  reset_token column already exists');
    }
    
    // Check if reset_token_expires column exists
    const resetExpiresCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'reset_token_expires'
    `);
    
    if (resetExpiresCheck.rows.length === 0) {
      await pool.query('ALTER TABLE users ADD COLUMN reset_token_expires TIMESTAMP');
      console.log('✅ Added reset_token_expires column');
    } else {
      console.log('ℹ️  reset_token_expires column already exists');
    }
    
    console.log('✅ Password reset migration completed successfully');
    
  } catch (error) {
    console.error('❌ Password reset migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migration if called directly
if (require.main === module) {
  require('dotenv').config();
  addPasswordResetColumns()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addPasswordResetColumns };