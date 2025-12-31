const { Pool } = require('pg');

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Initialize database tables
async function initDatabase() {
  const client = await pool.connect();
  try {
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        email_verified BOOLEAN DEFAULT FALSE,
        verification_token VARCHAR(255),
        verification_token_expires TIMESTAMP,
        reset_token VARCHAR(64),
        reset_token_expires TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add password reset columns if they don't exist (for existing databases)
    try {
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS reset_token VARCHAR(64),
        ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP
      `);
    } catch (error) {
      // Ignore error if columns already exist (PostgreSQL < 9.6 doesn't support IF NOT EXISTS for ADD COLUMN)
      console.log('Password reset columns may already exist');
    }

    // Create posts table for saving generated posts
    await client.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        platform VARCHAR(50) NOT NULL,
        topic TEXT NOT NULL,
        content TEXT NOT NULL,
        ascii_art TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index on user_id for faster queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id)
    `);

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Generate SQL backup of database
async function generateBackup() {
  const client = await pool.connect();
  try {
    console.log('🔄 Generating database backup...');
    
    // Get all users
    const usersResult = await client.query('SELECT * FROM users ORDER BY id');
    const users = usersResult.rows;
    
    // Get all posts
    const postsResult = await client.query('SELECT * FROM posts ORDER BY id');
    const posts = postsResult.rows;
    
    // Generate SQL backup content
    let backup = '';
    backup += '-- Database Backup Generated: ' + new Date().toISOString() + '\n';
    backup += '-- Phosphor Vibe Post Application\n\n';
    
    // Add table creation statements
    backup += '-- Create tables if they don\'t exist\n';
    backup += `CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  verification_token VARCHAR(255),
  verification_token_expires TIMESTAMP,
  reset_token VARCHAR(64),
  reset_token_expires TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);\n\n`;

    backup += `CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  topic TEXT NOT NULL,
  content TEXT NOT NULL,
  ascii_art TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);\n\n`;

    // Add users data
    if (users.length > 0) {
      backup += '-- Insert users data\n';
      backup += 'INSERT INTO users (id, email, password, email_verified, verification_token, verification_token_expires, reset_token, reset_token_expires, created_at) VALUES\n';
      
      const userValues = users.map(user => {
        const values = [
          user.id,
          `'${user.email.replace(/'/g, "''")}'`,
          `'${user.password.replace(/'/g, "''")}'`,
          user.email_verified,
          user.verification_token ? `'${user.verification_token.replace(/'/g, "''")}'` : 'NULL',
          user.verification_token_expires ? `'${user.verification_token_expires.toISOString()}'` : 'NULL',
          user.reset_token ? `'${user.reset_token.replace(/'/g, "''")}'` : 'NULL',
          user.reset_token_expires ? `'${user.reset_token_expires.toISOString()}'` : 'NULL',
          `'${user.created_at.toISOString()}'`
        ];
        return `(${values.join(', ')})`;
      });
      
      backup += userValues.join(',\n');
      backup += '\nON CONFLICT (email) DO UPDATE SET\n';
      backup += '  password = EXCLUDED.password,\n';
      backup += '  email_verified = EXCLUDED.email_verified,\n';
      backup += '  verification_token = EXCLUDED.verification_token,\n';
      backup += '  verification_token_expires = EXCLUDED.verification_token_expires,\n';
      backup += '  reset_token = EXCLUDED.reset_token,\n';
      backup += '  reset_token_expires = EXCLUDED.reset_token_expires;\n\n';
    }
    
    // Add posts data
    if (posts.length > 0) {
      backup += '-- Insert posts data\n';
      backup += 'INSERT INTO posts (id, user_id, platform, topic, content, ascii_art, created_at) VALUES\n';
      
      const postValues = posts.map(post => {
        const values = [
          post.id,
          post.user_id,
          `'${post.platform.replace(/'/g, "''")}'`,
          `'${post.topic.replace(/'/g, "''")}'`,
          `'${post.content.replace(/'/g, "''")}'`,
          post.ascii_art ? `'${post.ascii_art.replace(/'/g, "''")}'` : 'NULL',
          `'${post.created_at.toISOString()}'`
        ];
        return `(${values.join(', ')})`;
      });
      
      backup += postValues.join(',\n');
      backup += '\nON CONFLICT (id) DO NOTHING;\n\n';
    }
    
    // Reset sequences
    backup += '-- Reset sequences\n';
    backup += `SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM users));\n`;
    backup += `SELECT setval('posts_id_seq', (SELECT COALESCE(MAX(id), 1) FROM posts));\n\n`;
    
    backup += '-- Backup completed successfully\n';
    
    console.log(`✅ Backup generated: ${users.length} users, ${posts.length} posts`);
    
    return {
      sql: backup,
      stats: {
        users: users.length,
        posts: posts.length,
        size: backup.length
      }
    };
    
  } catch (error) {
    console.error('❌ Backup generation failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Restore database from SQL content
async function restoreFromSQL(sqlContent) {
  const client = await pool.connect();
  try {
    console.log('🔄 Starting SQL restore...');
    
    // Split SQL content into individual statements
    const statements = sqlContent
      .split('\n')
      .filter(line => line.trim() && !line.trim().startsWith('--'))
      .join('\n')
      .split(';')
      .filter(stmt => stmt.trim());
    
    let usersRestored = 0;
    let postsRestored = 0;
    
    for (const statement of statements) {
      const trimmedStmt = statement.trim();
      if (!trimmedStmt) continue;
      
      try {
        // Execute the statement
        const result = await client.query(trimmedStmt);
        
        // Count restored records
        if (trimmedStmt.toLowerCase().includes('insert into users')) {
          usersRestored += result.rowCount || 0;
        } else if (trimmedStmt.toLowerCase().includes('insert into posts')) {
          postsRestored += result.rowCount || 0;
        }
        
        console.log(`✅ Executed: ${trimmedStmt.substring(0, 50)}...`);
        
      } catch (error) {
        // Log but don't fail on individual statement errors
        console.warn(`⚠️  Statement failed: ${error.message}`);
        console.warn(`Statement: ${trimmedStmt.substring(0, 100)}...`);
      }
    }
    
    console.log(`✅ Restore completed: ${usersRestored} users, ${postsRestored} posts`);
    
    return {
      success: true,
      usersRestored,
      postsRestored,
      statementsProcessed: statements.length
    };
    
  } catch (error) {
    console.error('❌ SQL restore failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  initDatabase,
  generateBackup,
  restoreFromSQL
};
