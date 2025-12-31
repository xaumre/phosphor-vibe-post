# Product Overview

**Phosphor Vibe Post** is a social media post generator with a vintage IBM 5250 terminal UI aesthetic. It combines nostalgic CRT terminal styling with modern AI capabilities to generate platform-optimized social media content.

## Core Features

- **AI-Powered Content Generation**: Uses Google Gemini 2.5 Flash to generate posts, trending topics, quotes, and ASCII art
- **Multi-Platform Support**: Optimized content for Twitter/X, LinkedIn, Facebook, and Instagram with platform-specific tone and character limits
- **Authentication System**: JWT-based auth with bcrypt password hashing, email verification, and password reset via SendGrid
- **Email Verification**: Required for post generation and saving features
- **Topic Methods**: Users can write their own topics, get AI-generated trending suggestions, or use famous quotes
- **ASCII Art Generation**: Vintage terminal-style decorative art for each post
- **Post Management**: Save, view, and delete generated posts (requires verified email)

## User Flow

1. Sign up with email/password → receive verification email
2. Verify email via link (required for full access)
3. Select platform (Twitter, LinkedIn, Facebook, Instagram)
4. Choose topic method (own topic, AI suggestions, or famous quotes)
5. Generate AI-optimized post with ASCII art
6. Copy text or download ASCII art
7. Save posts for later reference

## Technical Approach

The app gracefully degrades when API keys are missing, using static fallback data for suggestions and quotes, and mock post generation. This allows development and testing without requiring immediate API access.
