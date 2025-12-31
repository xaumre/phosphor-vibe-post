-- Database Backup Generated: 2025-12-31T19:02:58.384Z
-- Phosphor Vibe Post Application

-- Create tables if they don't exist
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
);

CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  topic TEXT NOT NULL,
  content TEXT NOT NULL,
  ascii_art TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert users data
INSERT INTO users (id, email, password, email_verified, verification_token, verification_token_expires, reset_token, reset_token_expires, created_at) VALUES
(1, 'test@bentforce.com', '$2b$10$.mjd.qyunK6Hpq7aB2w1o.8VF8RibVwog8gDslKMb68lffTp11che', true, NULL, NULL, NULL, NULL, '2025-12-02T20:37:03.177Z'),
(2, 'behinds-soils.0k@icloud.com', '$2b$10$V5NxQB3qT/9RW43VS52X0utZqk6ll3GD8rY5wKRkz55J2JWmIekgK', true, NULL, NULL, NULL, NULL, '2025-12-03T18:42:28.275Z')
ON CONFLICT (email) DO UPDATE SET
  password = EXCLUDED.password,
  email_verified = EXCLUDED.email_verified,
  verification_token = EXCLUDED.verification_token,
  verification_token_expires = EXCLUDED.verification_token_expires,
  reset_token = EXCLUDED.reset_token,
  reset_token_expires = EXCLUDED.reset_token_expires;

-- Reset sequences
SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM users));
SELECT setval('posts_id_seq', (SELECT COALESCE(MAX(id), 1) FROM posts));

-- Backup completed successfully
