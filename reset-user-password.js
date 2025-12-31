require('dotenv').config();
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const SALT_ROUNDS = 10;

async function resetUserPassword(email, newPassword) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // Check if user exists
    const userResult = await pool.query(
      'SELECT id, email FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      console.log(`❌ User with email ${email} not found`);
      return false;
    }

    const user = userResult.rows[0];
    console.log(`✅ Found user: ${user.email} (ID: ${user.id})`);

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update password
    await pool.query(
      'UPDATE users SET password = $1 WHERE id = $2',
      [hashedPassword, user.id]
    );

    console.log(`✅ Password updated successfully for ${email}`);
    return true;

  } catch (error) {
    console.error('❌ Error resetting password:', error.message);
    return false;
  } finally {
    await pool.end();
  }
}

// Command line usage
if (require.main === module) {
  const email = process.argv[2];
  const newPassword = process.argv[3];

  if (!email || !newPassword) {
    console.log('Usage: node reset-user-password.js <email> <new-password>');
    console.log('Example: node reset-user-password.js test@bentforce.com newpassword123');
    process.exit(1);
  }

  if (newPassword.length < 6) {
    console.log('❌ Password must be at least 6 characters');
    process.exit(1);
  }

  resetUserPassword(email, newPassword)
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { resetUserPassword };