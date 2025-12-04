// Post generation logic
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const platformConfig = {
  twitter: {
    name: 'X (Twitter)',
    maxLength: 280,
    tone: 'concise, witty, engaging',
    hashtags: 3
  },
  linkedin: {
    name: 'LinkedIn',
    maxLength: 3000,
    tone: 'professional, insightful, thought-leadership',
    hashtags: 5
  },
  facebook: {
    name: 'Facebook',
    maxLength: 63206,
    tone: 'conversational, friendly, relatable',
    hashtags: 3
  },
  instagram: {
    name: 'Instagram',
    maxLength: 2200,
    tone: 'visual, inspirational, lifestyle-focused',
    hashtags: 10
  }
};

// Generate trending topic suggestions using LLM
async function getSuggestions(platform) {
  console.log('getSuggestions called, API key exists:', !!process.env.GEMINI_API_KEY);
  
  // Fallback to static suggestions if no API key
  if (!process.env.GEMINI_API_KEY) {
    console.log('No Gemini API key, using static suggestions');
    return getStaticSuggestions(platform);
  }
  
  try {
    console.log('Attempting to generate suggestions with Gemini...');
    const config = platformConfig[platform];
    const prompt = `You are a social media trends expert who identifies engaging, timely topics.

Search the web for current trending topics and generate 5 trending, engaging topic ideas for ${config.name} posts.

Requirements:
- Search for what's trending RIGHT NOW in December 2025
- Topics should be current, relevant, and based on real-time trends
- Make them specific and actionable
- Consider the platform's audience and tone: ${config.tone}
- Topics should inspire engaging posts
- Keep each topic concise (under 50 characters)

Return ONLY a JSON array of 5 topic strings, no explanations or markdown.
Example format: ["Topic 1", "Topic 2", "Topic 3", "Topic 4", "Topic 5"]`;

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      tools: [{ googleSearch: {} }]
    });
    const result = await model.generateContent(prompt);
    
    // Check if response is valid
    if (!result || !result.response) {
      throw new Error('Invalid response from Gemini API');
    }
    
    const response = result.response.text().trim();
    console.log('Gemini response received:', response.substring(0, 100));
    
    // Remove markdown code blocks if present
    const cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Validate JSON before parsing
    let suggestions;
    try {
      suggestions = JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error('JSON parse error:', parseError.message);
      console.error('Response was:', cleanResponse.substring(0, 200));
      throw new Error('Failed to parse Gemini response as JSON');
    }
    
    console.log('Parsed suggestions:', suggestions);
    
    // Validate it's an array with 5 items
    if (Array.isArray(suggestions) && suggestions.length === 5) {
      console.log('Returning Gemini-generated suggestions');
      return suggestions;
    }
    
    console.log('Invalid suggestions format, using static');
    return getStaticSuggestions(platform);
  } catch (error) {
    console.error('Suggestions generation error:', error.message || error);
    console.error('Error details:', error);
    return getStaticSuggestions(platform);
  }
}

// Fallback static suggestions
function getStaticSuggestions(platform) {
  const suggestions = {
    twitter: [
      'AI and the future of work',
      'Productivity hacks for remote teams',
      'The rise of sustainable tech',
      'Mental health in the digital age',
      'Web3 and decentralization'
    ],
    linkedin: [
      'Leadership lessons from 2025',
      'Building resilient teams',
      'The future of professional development',
      'Navigating career transitions',
      'Innovation in enterprise software'
    ],
    facebook: [
      'Weekend wellness tips',
      'Family traditions that matter',
      'Local community initiatives',
      'Home cooking adventures',
      'Travel memories and recommendations'
    ],
    instagram: [
      'Morning routine inspiration',
      'Minimalist lifestyle tips',
      'Creative workspace setups',
      'Fitness journey milestones',
      'Sustainable fashion choices'
    ]
  };
  
  return suggestions[platform] || suggestions.twitter;
}

// Generate famous quotes using LLM
async function getQuotes() {
  // Fallback to static quotes if no API key
  if (!process.env.GEMINI_API_KEY) {
    return getStaticQuotes();
  }
  
  try {
    const prompt = `You are a quotes expert with deep knowledge of famous quotations.

Generate 8 inspiring, famous quotes from well-known historical figures, leaders, artists, or thinkers.

Requirements:
- Mix of different themes: success, creativity, perseverance, innovation, life wisdom
- Include diverse voices (different eras, backgrounds, fields)
- Quotes should be authentic and well-known
- Keep quotes concise and impactful
- Each quote should be under 100 characters

Return ONLY a JSON array of 8 objects with "text" and "author" fields, no explanations or markdown.
Example format: [{"text": "Quote text here", "author": "Author Name"}, ...]`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    
    // Check if response is valid
    if (!result || !result.response) {
      throw new Error('Invalid response from Gemini API');
    }
    
    let response = result.response.text().trim();
    
    // Remove markdown code blocks if present
    response = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Validate JSON before parsing
    let quotes;
    try {
      quotes = JSON.parse(response);
    } catch (parseError) {
      console.error('JSON parse error:', parseError.message);
      console.error('Response was:', response.substring(0, 200));
      throw new Error('Failed to parse Gemini response as JSON');
    }
    
    // Validate it's an array with 8 items
    if (Array.isArray(quotes) && quotes.length === 8 && quotes[0].text && quotes[0].author) {
      return quotes;
    }
    
    return getStaticQuotes();
  } catch (error) {
    console.error('Quotes generation error:', error.message || error);
    console.error('Error details:', error);
    return getStaticQuotes();
  }
}

// Fallback static quotes
function getStaticQuotes() {
  return [
    { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
    { text: 'Innovation distinguishes between a leader and a follower.', author: 'Steve Jobs' },
    { text: 'The future belongs to those who believe in the beauty of their dreams.', author: 'Eleanor Roosevelt' },
    { text: 'Success is not final, failure is not fatal: it is the courage to continue that counts.', author: 'Winston Churchill' },
    { text: 'Be yourself; everyone else is already taken.', author: 'Oscar Wilde' },
    { text: 'The best time to plant a tree was 20 years ago. The second best time is now.', author: 'Chinese Proverb' },
    { text: 'Your time is limited, don\'t waste it living someone else\'s life.', author: 'Steve Jobs' },
    { text: 'The only impossible journey is the one you never begin.', author: 'Tony Robbins' }
  ];
}

// Generate post using Gemini
async function generatePost(platform, topic) {
  const config = platformConfig[platform];
  
  // Fallback to mock if no API key
  if (!process.env.GEMINI_API_KEY) {
    return generateMockPost(platform, topic, config);
  }
  
  try {
    const prompt = `You are a social media expert who creates engaging, authentic posts optimized for different platforms.

Create an engaging social media post for ${config.name} about: "${topic}"

Requirements:
- Tone: ${config.tone}
- Maximum length: ${config.maxLength} characters
- Include ${config.hashtags} relevant hashtags at the end
- Make it authentic, engaging, and platform-appropriate
- Use emojis sparingly and naturally
- Don't use quotation marks around the entire post

Just return the post text, nothing else.`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    
    // Check if response is valid
    if (!result || !result.response) {
      throw new Error('Invalid response from Gemini API');
    }
    
    let text = result.response.text().trim();
    
    // Ensure within character limit
    if (text.length > config.maxLength) {
      text = text.substring(0, config.maxLength - 3) + '...';
    }
    
    return text;
  } catch (error) {
    console.error('Gemini API error:', error.message || error);
    console.error('Error details:', error);
    return generateMockPost(platform, topic, config);
  }
}

// Fallback mock post generation
function generateMockPost(platform, topic, config) {
  let text = `${topic}\n\n`;
  
  if (platform === 'twitter') {
    text += `Quick thoughts on this topic. What's your take? 🚀`;
  } else if (platform === 'linkedin') {
    text += `I've been reflecting on this lately. In my experience, understanding ${topic.toLowerCase()} is crucial for professional growth.\n\nKey takeaways:\n• Stay curious\n• Keep learning\n• Share knowledge\n\nWhat's your perspective?`;
  } else if (platform === 'facebook') {
    text += `Just wanted to share some thoughts about this! It's been on my mind lately. Would love to hear what you all think! 💭`;
  } else {
    text += `Inspired by this idea today ✨\n\nDouble tap if you agree! 👇`;
  }
  
  // Add hashtags
  const hashtags = generateHashtags(topic, config.hashtags);
  text += `\n\n${hashtags}`;
  
  // Ensure within character limit
  if (text.length > config.maxLength) {
    text = text.substring(0, config.maxLength - 3) + '...';
  }
  
  return text;
}

// Generate hashtags
function generateHashtags(topic, count) {
  const words = topic.split(' ').filter(w => w.length > 3);
  const tags = words.slice(0, count).map(w => 
    '#' + w.replace(/[^a-zA-Z0-9]/g, '')
  );
  
  // Add some generic popular tags
  const genericTags = ['#Viral', '#Trending', '#MustRead', '#Inspiration', '#Growth'];
  while (tags.length < count && genericTags.length > 0) {
    tags.push(genericTags.shift());
  }
  
  return tags.join(' ');
}

// Generate ASCII art using LLM
async function generateAsciiArt(topic) {
  // Fallback to simple art if no API key
  if (!process.env.GEMINI_API_KEY) {
    return generateSimpleAsciiArt(topic);
  }
  
  try {
    const prompt = `You are an expert ASCII artist who creates creative, compact ASCII art.

Create creative ASCII art related to: "${topic}"

Requirements:
- Use standard ASCII characters only (no Unicode box-drawing characters)
- Keep it compact: maximum 15 lines tall and 50 characters wide
- Make it visually represent the topic creatively
- Include the topic text incorporated into or below the art
- Use characters like: * # @ $ % & + = - _ / \\ | ( ) [ ] { } < >
- Make it look good in a monospace terminal font
- Be creative and topic-specific

Return ONLY the ASCII art, no explanations or markdown code blocks.`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    
    // Check if response is valid
    if (!result || !result.response) {
      throw new Error('Invalid response from Gemini API');
    }
    
    let art = result.response.text().trim();
    
    // Remove markdown code blocks if present
    art = art.replace(/```[\w]*\n?/g, '').trim();
    
    // Add branding footer
    art += `\n\n    ⚡ VIBE TERMINAL ⚡`;
    
    return art;
  } catch (error) {
    console.error('ASCII art generation error:', error.message || error);
    console.error('Error details:', error);
    return generateSimpleAsciiArt(topic);
  }
}

// Fallback simple ASCII art
function generateSimpleAsciiArt(topic) {
  const width = 40;
  const border = '═'.repeat(width);
  const words = topic.toUpperCase().match(/.{1,36}/g) || [topic.toUpperCase()];
  
  let art = `╔${border}╗\n`;
  words.forEach(line => {
    const padding = Math.floor((width - line.length) / 2);
    art += `║${' '.repeat(padding)}${line}${' '.repeat(width - padding - line.length)}║\n`;
  });
  art += `╚${border}╝\n\n`;
  
  // Add some decorative ASCII
  art += `
    ⚡ VIBE TERMINAL ⚡
    
    ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
    ▓ VIRAL POST  ▓
    ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
  `;
  
  return art;
}

module.exports = {
  platformConfig,
  getSuggestions,
  getQuotes,
  generatePost,
  generateAsciiArt
};
