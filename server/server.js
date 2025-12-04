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
const { initDatabase } = require('./db');

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
