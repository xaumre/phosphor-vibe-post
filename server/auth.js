const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('./db');
const { sendVerificationEmail } = require('./email');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
const SALT_ROUNDS = 10;

// Generate JWT token
function generateToken(userId, email) {
  return jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Generate verification token
function generateVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Signup
async function signup(email, password) {
  // Validate input
  if (!email || !password) {
    throw new Error('Email and password are required');
  }
  
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }
  
  // Hash password
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  
  // Generate verification token
  const verificationToken = generateVerificationToken();
  const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  try {
    // Insert user into database
    const result = await pool.query(
      `INSERT INTO users (email, password, verification_token, verification_token_expires) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, email, email_verified, created_at`,
      [email, hashedPassword, verificationToken, tokenExpires]
    );
    
    const user = result.rows[0];
    
    // Send verification email
    try {
      await sendVerificationEmail(email, verificationToken);
      console.log(`✅ Verification email sent successfully to ${email}`);
    } catch (emailError) {
      console.error('❌ Failed to send verification email:', emailError.message);
      if (emailError.response) {
        console.error('SendGrid error details:', emailError.response.body);
      }
      // Don't fail signup if email fails, but log it
    }
    
    // Generate token (user can still use the app, but some features may be restricted)
    const token = generateToken(user.id.toString(), user.email);
    
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.email_verified
      },
      message: 'Account created! Please check your email to verify your account.'
    };
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      throw new Error('User already exists');
    }
    throw error;
  }
}

// Login
async function login(email, password) {
  // Validate input
  if (!email || !password) {
    throw new Error('Email and password are required');
  }
  
  // Find user in database
  const result = await pool.query(
    'SELECT id, email, password, email_verified FROM users WHERE email = $1',
    [email]
  );
  
  if (result.rows.length === 0) {
    throw new Error('Invalid credentials');
  }
  
  const user = result.rows[0];
  
  // Verify password
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    throw new Error('Invalid credentials');
  }
  
  // Generate token
  const token = generateToken(user.id.toString(), user.email);
  
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      emailVerified: user.email_verified
    }
  };
}

// Verify email with token
async function verifyEmail(token) {
  if (!token) {
    throw new Error('Verification token is required');
  }
  
  const result = await pool.query(
    `SELECT id, email, verification_token_expires 
     FROM users 
     WHERE verification_token = $1`,
    [token]
  );
  
  if (result.rows.length === 0) {
    throw new Error('Invalid verification token');
  }
  
  const user = result.rows[0];
  
  // Check if token is expired
  if (new Date() > new Date(user.verification_token_expires)) {
    throw new Error('Verification token has expired');
  }
  
  // Update user as verified
  await pool.query(
    `UPDATE users 
     SET email_verified = TRUE, 
         verification_token = NULL, 
         verification_token_expires = NULL 
     WHERE id = $1`,
    [user.id]
  );
  
  return {
    message: 'Email verified successfully!',
    email: user.email
  };
}

// Resend verification email
async function resendVerificationEmail(email) {
  if (!email) {
    throw new Error('Email is required');
  }
  
  const result = await pool.query(
    'SELECT id, email, email_verified FROM users WHERE email = $1',
    [email]
  );
  
  if (result.rows.length === 0) {
    throw new Error('User not found');
  }
  
  const user = result.rows[0];
  
  if (user.email_verified) {
    throw new Error('Email is already verified');
  }
  
  // Generate new verification token
  const verificationToken = generateVerificationToken();
  const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  await pool.query(
    `UPDATE users 
     SET verification_token = $1, 
         verification_token_expires = $2 
     WHERE id = $3`,
    [verificationToken, tokenExpires, user.id]
  );
  
  // Send verification email
  await sendVerificationEmail(email, verificationToken);
  
  return {
    message: 'Verification email sent! Please check your inbox.'
  };
}

// Request password reset
async function requestPasswordReset(email) {
  if (!email) {
    throw new Error('Email is required');
  }
  
  const result = await pool.query(
    'SELECT id, email FROM users WHERE email = $1',
    [email]
  );
  
  if (result.rows.length === 0) {
    // Don't reveal if user exists or not for security
    return {
      message: 'If an account with that email exists, a password reset link has been sent.'
    };
  }
  
  const user = result.rows[0];
  
  // Generate reset token
  const resetToken = generateVerificationToken();
  const tokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  
  await pool.query(
    `UPDATE users 
     SET reset_token = $1, 
         reset_token_expires = $2 
     WHERE id = $3`,
    [resetToken, tokenExpires, user.id]
  );
  
  // Send password reset email
  const { sendPasswordResetEmail } = require('./email');
  try {
    await sendPasswordResetEmail(email, resetToken);
    console.log(`✅ Password reset email sent successfully to ${email}`);
  } catch (emailError) {
    console.error('❌ Failed to send password reset email:', emailError.message);
    if (emailError.response) {
      console.error('SendGrid error details:', emailError.response.body);
    }
    // Don't fail the request if email fails, but log it
  }
  
  return {
    message: 'If an account with that email exists, a password reset link has been sent.'
  };
}

// Reset password with token
async function resetPassword(token, newPassword) {
  if (!token || !newPassword) {
    throw new Error('Reset token and new password are required');
  }
  
  if (newPassword.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }
  
  const result = await pool.query(
    `SELECT id, email, reset_token_expires 
     FROM users 
     WHERE reset_token = $1`,
    [token]
  );
  
  if (result.rows.length === 0) {
    throw new Error('Invalid or expired reset token');
  }
  
  const user = result.rows[0];
  
  // Check if token is expired
  if (new Date() > new Date(user.reset_token_expires)) {
    throw new Error('Reset token has expired');
  }
  
  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
  
  // Update password and clear reset token
  await pool.query(
    `UPDATE users 
     SET password = $1, 
         reset_token = NULL, 
         reset_token_expires = NULL 
     WHERE id = $2`,
    [hashedPassword, user.id]
  );
  
  return {
    message: 'Password reset successfully!',
    email: user.email
  };
}

// Middleware to verify authentication
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  
  // Fetch user's email verification status from database
  try {
    const result = await pool.query(
      'SELECT id, email, email_verified FROM users WHERE id = $1',
      [decoded.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    req.user = {
      ...decoded,
      emailVerified: result.rows[0].email_verified
    };
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
}

// Middleware to require email verification
function requireVerifiedEmail(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (!req.user.emailVerified) {
    return res.status(403).json({ 
      error: 'Email verification required',
      message: 'Please verify your email address to access this feature.'
    });
  }
  
  next();
}

module.exports = {
  signup,
  login,
  verifyEmail,
  resendVerificationEmail,
  requestPasswordReset,
  resetPassword,
  authMiddleware,
  requireVerifiedEmail,
  verifyToken
};
