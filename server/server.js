require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Import modules
const generator = require('./generator');
const auth = require('./auth');
const { initDatabase, generateBackup, restoreFromSQL } = require('./db');
const multer = require('multer');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/sql' || 
        file.mimetype === 'text/plain' || 
        file.originalname.endsWith('.sql')) {
      cb(null, true);
    } else {
      cb(new Error('Only SQL files are allowed'));
    }
  }
});

// Health check for Render
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API routes
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working' });
});

// Auth routes
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await auth.signup(email, password);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await auth.login(email, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

app.get('/api/auth/verify', auth.authMiddleware, (req, res) => {
  res.json({ 
    valid: true,
    user: req.user
  });
});

// Verify email with token
app.get('/api/auth/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    const result = await auth.verifyEmail(token);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Resend verification email
app.post('/api/auth/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    const result = await auth.resendVerificationEmail(email);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Request password reset
app.post('/api/auth/request-password-reset', async (req, res) => {
  try {
    const { email } = req.body;
    const result = await auth.requestPasswordReset(email);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Reset password with token
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    const result = await auth.resetPassword(token, password);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Admin backup endpoint
app.get('/api/admin/backup', async (req, res) => {
  try {
    // Simple token-based authentication
    const token = req.query.token || req.headers['x-backup-token'];
    const expectedToken = process.env.ADMIN_BACKUP_TOKEN || 'backup-token-change-me';
    
    if (!token || token !== expectedToken) {
      return res.status(401).json({ error: 'Invalid backup token' });
    }
    
    console.log('🔄 Admin backup requested');
    
    // Generate backup
    const backup = await generateBackup();
    
    // Set headers for file download
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `phosphor-vibe-backup-${timestamp}.sql`;
    
    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', Buffer.byteLength(backup.sql, 'utf8'));
    
    // Add backup stats as headers
    res.setHeader('X-Backup-Users', backup.stats.users);
    res.setHeader('X-Backup-Posts', backup.stats.posts);
    res.setHeader('X-Backup-Size', backup.stats.size);
    
    console.log(`✅ Backup download started: ${backup.stats.users} users, ${backup.stats.posts} posts`);
    
    res.send(backup.sql);
    
  } catch (error) {
    console.error('❌ Backup endpoint error:', error);
    res.status(500).json({ error: 'Backup generation failed' });
  }
});

// Admin restore endpoint
app.post('/api/admin/restore', upload.single('sqlFile'), async (req, res) => {
  try {
    // Simple token-based authentication
    const token = req.body.token || req.headers['x-backup-token'];
    const expectedToken = process.env.ADMIN_BACKUP_TOKEN || 'backup-token-change-me';
    
    if (!token || token !== expectedToken) {
      return res.status(401).json({ error: 'Invalid backup token' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No SQL file uploaded' });
    }
    
    console.log('🔄 Admin restore requested');
    console.log(`📁 File: ${req.file.originalname} (${req.file.size} bytes)`);
    
    // Convert buffer to string
    const sqlContent = req.file.buffer.toString('utf8');
    
    if (!sqlContent.trim()) {
      return res.status(400).json({ error: 'SQL file is empty' });
    }
    
    // Restore from SQL
    const result = await restoreFromSQL(sqlContent);
    
    console.log(`✅ Restore completed: ${result.usersRestored} users, ${result.postsRestored} posts`);
    
    res.json({
      success: true,
      message: 'Database restored successfully',
      stats: {
        usersRestored: result.usersRestored,
        postsRestored: result.postsRestored,
        statementsProcessed: result.statementsProcessed
      }
    });
    
  } catch (error) {
    console.error('❌ Restore endpoint error:', error);
    res.status(500).json({ 
      error: 'Database restore failed',
      details: error.message 
    });
  }
});

// Admin restore form (simple HTML interface)
app.get('/admin/restore', (req, res) => {
  const token = req.query.token;
  const expectedToken = process.env.ADMIN_BACKUP_TOKEN || 'backup-token-change-me';
  
  if (!token || token !== expectedToken) {
    return res.status(401).send('<h1>Invalid Token</h1><p>Access denied.</p>');
  }
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Database Restore - Phosphor Vibe Post</title>
      <style>
        body { 
          font-family: 'Courier New', monospace; 
          background: #000; 
          color: #0f0; 
          padding: 20px; 
          max-width: 600px; 
          margin: 0 auto; 
        }
        .container { 
          border: 2px solid #0f0; 
          padding: 20px; 
          border-radius: 8px; 
        }
        input[type="file"] { 
          background: #000; 
          color: #0f0; 
          border: 1px solid #0f0; 
          padding: 10px; 
          width: 100%; 
          margin: 10px 0; 
        }
        button { 
          background: #0f0; 
          color: #000; 
          border: none; 
          padding: 12px 24px; 
          cursor: pointer; 
          font-weight: bold; 
          border-radius: 4px; 
        }
        button:hover { background: #0a0; }
        .status { 
          margin-top: 20px; 
          padding: 10px; 
          border: 1px solid #0f0; 
          display: none; 
        }
        .success { border-color: #0f0; color: #0f0; }
        .error { border-color: #f00; color: #f00; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🔄 Database Restore</h1>
        <p>Upload your SQL backup file to restore your database.</p>
        
        <form id="restoreForm" enctype="multipart/form-data">
          <input type="hidden" name="token" value="${token}">
          <input type="file" name="sqlFile" accept=".sql" required>
          <button type="submit">Restore Database</button>
        </form>
        
        <div id="status" class="status"></div>
      </div>
      
      <script>
        document.getElementById('restoreForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          
          const formData = new FormData(e.target);
          const statusDiv = document.getElementById('status');
          
          statusDiv.style.display = 'block';
          statusDiv.className = 'status';
          statusDiv.innerHTML = '🔄 Restoring database...';
          
          try {
            const response = await fetch('/api/admin/restore', {
              method: 'POST',
              body: formData
            });
            
            const result = await response.json();
            
            if (response.ok) {
              statusDiv.className = 'status success';
              statusDiv.innerHTML = \`
                ✅ <strong>Restore Successful!</strong><br>
                👥 Users restored: \${result.stats.usersRestored}<br>
                📝 Posts restored: \${result.stats.postsRestored}<br>
                📊 Statements processed: \${result.stats.statementsProcessed}
              \`;
            } else {
              throw new Error(result.error || 'Restore failed');
            }
          } catch (error) {
            statusDiv.className = 'status error';
            statusDiv.innerHTML = \`❌ <strong>Restore Failed:</strong> \${error.message}\`;
          }
        });
      </script>
    </body>
    </html>
  `);
});

// Get topic suggestions
app.get('/api/suggestions', async (req, res) => {
  try {
    const platform = req.query.platform || 'twitter';
    const suggestions = await generator.getSuggestions(platform);
    res.json({ suggestions });
  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

// Get famous quotes
app.get('/api/quotes', async (req, res) => {
  try {
    const quotes = await generator.getQuotes();
    res.json({ quotes });
  } catch (error) {
    console.error('Quotes error:', error);
    res.status(500).json({ error: 'Failed to get quotes' });
  }
});

// Generate post (requires verified email)
app.post('/api/generate', auth.authMiddleware, auth.requireVerifiedEmail, async (req, res) => {
  const { platform, topic } = req.body;
  
  if (!platform || !topic) {
    return res.status(400).json({ error: 'Platform and topic required' });
  }
  
  try {
    // Generate both post text and ASCII art in parallel
    const [text, asciiArt] = await Promise.all([
      generator.generatePost(platform, topic),
      generator.generateAsciiArt(topic)
    ]);
    
    res.json({
      text,
      asciiArt,
      platform,
      topic
    });
  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ error: 'Failed to generate post' });
  }
});

// Save post (requires verified email)
app.post('/api/posts', auth.authMiddleware, auth.requireVerifiedEmail, async (req, res) => {
  const { platform, topic, content, asciiArt } = req.body;
  const userId = req.user.userId;
  
  if (!platform || !topic || !content) {
    return res.status(400).json({ error: 'Platform, topic, and content required' });
  }
  
  try {
    const { pool } = require('./db');
    const result = await pool.query(
      'INSERT INTO posts (user_id, platform, topic, content, ascii_art) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, platform, topic, content, asciiArt]
    );
    
    res.json({ post: result.rows[0] });
  } catch (error) {
    console.error('Save post error:', error);
    res.status(500).json({ error: 'Failed to save post' });
  }
});

// Get user's saved posts (requires verified email)
app.get('/api/posts', auth.authMiddleware, auth.requireVerifiedEmail, async (req, res) => {
  const userId = req.user.userId;
  
  try {
    const { pool } = require('./db');
    const result = await pool.query(
      'SELECT * FROM posts WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    
    res.json({ posts: result.rows });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: 'Failed to retrieve posts' });
  }
});

// Delete a post (requires verified email)
app.delete('/api/posts/:id', auth.authMiddleware, auth.requireVerifiedEmail, async (req, res) => {
  const postId = req.params.id;
  const userId = req.user.userId;
  
  try {
    const { pool } = require('./db');
    const result = await pool.query(
      'DELETE FROM posts WHERE id = $1 AND user_id = $2 RETURNING id',
      [postId, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Initialize database and start server
async function startServer() {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
