// Simple state management
const state = {
  token: localStorage.getItem('token'),
  user: null,
  selectedPlatform: null,
  topicMethod: null,
  topic: null,
  generatedPost: null
};

// DOM elements
const authScreen = document.getElementById('auth-screen');
const verifyScreen = document.getElementById('verify-screen');
const mainScreen = document.getElementById('main-screen');
const authForm = document.getElementById('auth-form');
const authMessage = document.getElementById('auth-message');
const verifyMessage = document.getElementById('verify-message');
const verificationBanner = document.getElementById('verification-banner');
const resendVerificationBtn = document.getElementById('resend-verification-btn');

// Initialize app
async function init() {
  // Check for verification token in URL
  const urlParams = new URLSearchParams(window.location.search);
  const verifyToken = urlParams.get('token');
  
  if (verifyToken) {
    await handleEmailVerification(verifyToken);
    return;
  }
  
  if (state.token) {
    // Verify token is still valid
    try {
      const response = await fetch('/api/auth/verify', {
        headers: { 'Authorization': `Bearer ${state.token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        state.user = data.user;
        showMainScreen();
      } else {
        // Token invalid, clear and show auth
        state.token = null;
        localStorage.removeItem('token');
        showAuthScreen();
      }
    } catch (error) {
      showAuthScreen();
    }
  } else {
    showAuthScreen();
  }
}

// Handle email verification from URL
async function handleEmailVerification(token) {
  showVerifyScreen();
  verifyMessage.innerHTML = '<p class="text-yellow-400">Verifying your email...</p>';
  
  try {
    const response = await fetch(`/api/auth/verify-email?token=${token}`);
    const data = await response.json();
    
    if (response.ok) {
      verifyMessage.innerHTML = `
        <p class="text-green-400 mb-2">✓ ${data.message}</p>
        <p class="text-sm">You can now log in to your account.</p>
      `;
    } else {
      verifyMessage.innerHTML = `
        <p class="text-red-400 mb-2">✗ ${data.error}</p>
        <p class="text-sm">The verification link may have expired. Please request a new one.</p>
      `;
    }
  } catch (error) {
    verifyMessage.innerHTML = '<p class="text-red-400">Failed to verify email. Please try again.</p>';
  }
  
  // Clear URL parameters
  window.history.replaceState({}, document.title, window.location.pathname);
}

function showAuthScreen() {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  authScreen.classList.add('active');
  
  // Reset screen indicator to LOGIN
  const screenIndicator = document.getElementById('screen-indicator');
  if (screenIndicator) {
    screenIndicator.textContent = 'LOGIN';
  }
  
  setTimeout(() => {
    document.getElementById('auth-selection')?.focus();
  }, 100);
}

function showVerifyScreen() {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  verifyScreen.classList.add('active');
}

function showMainScreen() {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  mainScreen.classList.add('active');
  
  // Update screen indicator with user email
  const screenIndicator = document.getElementById('screen-indicator');
  if (screenIndicator && state.user && state.user.email) {
    screenIndicator.textContent = state.user.email;
  }
  
  // Show verification banner if email not verified
  if (state.user && !state.user.emailVerified) {
    verificationBanner.classList.remove('hidden');
  } else {
    verificationBanner.classList.add('hidden');
  }
  
  showStep('step-platform');
}

function showMessage(message, isError = false) {
  authMessage.textContent = message;
  authMessage.className = isError ? 'mt-4 text-red-400' : 'mt-4 text-yellow-400';
}

// Auth selection handler
const authSelection = document.getElementById('auth-selection');
if (authSelection) {
  authSelection.addEventListener('keypress', async (e) => {
  if (e.key === 'Enter') {
    const selection = authSelection.value.trim();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Basic validation
    if (!email || !password) {
      showMessage('Please enter email and password', true);
      return;
    }

    if (password.length < 6) {
      showMessage('Password must be at least 6 characters', true);
      return;
    }

    let action;
    if (selection === '1') {
      action = 'login';
    } else if (selection === '2') {
      action = 'signup';
    } else if (selection === '90') {
      window.close();
      return;
    } else {
      showMessage('Invalid selection. Please enter 1, 2, or 90', true);
      authSelection.value = '';
      return;
    }

    showMessage('Processing...');
    authSelection.value = '';

    try {
      const response = await fetch(`/api/auth/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        state.token = data.token;
        state.user = data.user;
        localStorage.setItem('token', data.token);
        
        if (action === 'signup') {
          showMessage('Account created! Please check your email to verify your account.');
        } else {
          showMessage('Login successful!');
        }
        
        setTimeout(showMainScreen, 1500);
      } else {
        showMessage(data.error || 'Authentication failed', true);
      }
    } catch (error) {
      showMessage('Connection error. Please try again.', true);
    }
  }
  });
}

// Keep old form handler for backwards compatibility
authForm.addEventListener('submit', (e) => {
  e.preventDefault();
});

// Resend verification email handler
resendVerificationBtn.addEventListener('click', async () => {
  if (!state.user || !state.user.email) return;
  
  resendVerificationBtn.disabled = true;
  resendVerificationBtn.textContent = 'SENDING...';
  
  try {
    const response = await fetch('/api/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: state.user.email })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      alert('✓ Verification email sent! Please check your inbox.');
    } else {
      alert('✗ ' + (data.error || 'Failed to send email'));
    }
  } catch (error) {
    alert('✗ Connection error. Please try again.');
  } finally {
    resendVerificationBtn.disabled = false;
    resendVerificationBtn.textContent = 'RESEND VERIFICATION EMAIL';
  }
});

// Back to auth button
document.getElementById('back-to-auth').addEventListener('click', () => {
  showAuthScreen();
});

// Logout handler
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    state.token = null;
    localStorage.removeItem('token');
    showAuthScreen();
    authForm.reset();
    showMessage('');
    resetFlow();
  });
}

// Flow management
function showStep(stepId) {
  ['step-platform', 'step-topic', 'step-input', 'step-result'].forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });
  document.getElementById(stepId).classList.remove('hidden');
  
  // Auto-focus on selection inputs
  setTimeout(() => {
    if (stepId === 'step-platform') {
      document.getElementById('platform-selection')?.focus();
    } else if (stepId === 'step-topic') {
      document.getElementById('topic-selection')?.focus();
    } else if (stepId === 'step-input') {
      const manualInput = document.getElementById('manual-input');
      if (!manualInput.classList.contains('hidden')) {
        document.getElementById('topic-text')?.focus();
      }
    }
  }, 100);
}

function resetFlow() {
  state.selectedPlatform = null;
  state.topicMethod = null;
  state.topic = null;
  state.generatedPost = null;
  showStep('step-platform');
}

// Platform selection
const platformSelection = document.getElementById('platform-selection');
const platformMap = {
  '1': { platform: 'twitter', name: 'X (Twitter) posts' },
  '2': { platform: 'linkedin', name: 'LinkedIn posts' },
  '3': { platform: 'facebook', name: 'Facebook posts' },
  '4': { platform: 'instagram', name: 'Instagram posts' }
};

if (platformSelection) {
  platformSelection.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const selection = platformSelection.value.trim();
    
    if (selection === '90') {
      logoutBtn.click();
      return;
    }
    
    const platform = platformMap[selection];
    if (platform) {
      state.selectedPlatform = platform.platform;
      document.getElementById('selected-platform').textContent = platform.name;
      document.getElementById('selected-platform-2').textContent = platform.name;
      document.getElementById('selected-platform-3').textContent = platform.name;
      platformSelection.value = '';
      showStep('step-topic');
    } else {
      alert('Invalid selection. Please enter 1, 2, 3, 4, or 90');
      platformSelection.value = '';
    }
  }
  });
}

// Topic method selection
const topicSelection = document.getElementById('topic-selection');
if (topicSelection) {
  topicSelection.addEventListener('keypress', async (e) => {
  if (e.key === 'Enter') {
    const selection = topicSelection.value.trim();
    topicSelection.value = '';
    
    if (selection === '1') {
      state.topicMethod = 'manual';
      document.getElementById('input-title').textContent = 'ENTER TOPIC';
      document.getElementById('manual-input').classList.remove('hidden');
      document.getElementById('suggestions-input').classList.add('hidden');
      document.getElementById('quotes-input').classList.add('hidden');
      showStep('step-input');
    } else if (selection === '2') {
      state.topicMethod = 'suggestions';
      document.getElementById('input-title').textContent = 'SELECT SUGGESTION';
      document.getElementById('manual-input').classList.add('hidden');
      document.getElementById('suggestions-input').classList.remove('hidden');
      document.getElementById('quotes-input').classList.add('hidden');
      showStep('step-input');
      await loadSuggestions();
    } else if (selection === '3') {
      state.topicMethod = 'quotes';
      document.getElementById('input-title').textContent = 'SELECT QUOTE';
      document.getElementById('manual-input').classList.add('hidden');
      document.getElementById('suggestions-input').classList.add('hidden');
      document.getElementById('quotes-input').classList.remove('hidden');
      showStep('step-input');
      await loadQuotes();
    } else {
      alert('Invalid selection. Please enter 1, 2, or 3');
    }
  }
  });
}

// Load suggestions
async function loadSuggestions() {
  const list = document.getElementById('suggestions-list');
  list.innerHTML = '<div style="color: #ffff00;">LOADING SUGGESTIONS...</div>';
  
  try {
    const response = await fetch(`/api/suggestions?platform=${state.selectedPlatform}`);
    
    if (!response.ok) {
      throw new Error('Failed to load suggestions');
    }
    
    const data = await response.json();
    
    if (!data.suggestions || !Array.isArray(data.suggestions)) {
      throw new Error('Invalid suggestions data');
    }
    
    const suggestions = data.suggestions;
    list.innerHTML = suggestions.map((s, i) => 
      `<div class="menu-item">
        <span class="menu-number">${i + 1}.</span>
        <span class="menu-text">${s}</span>
      </div>`
    ).join('') + `
      <div class="input-line">
        Selection ===> <input type="text" id="suggestion-selection" class="input-field" style="width: 50px;" maxlength="2">
        <span class="cursor"></span>
      </div>
    `;
    
    // Add selection handler
    const suggestionSelection = document.getElementById('suggestion-selection');
    suggestionSelection.focus();
    suggestionSelection.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const selection = parseInt(suggestionSelection.value.trim());
        if (selection >= 1 && selection <= suggestions.length) {
          state.topic = suggestions[selection - 1];
          document.getElementById('topic-text').value = state.topic;
          // Call generatePost directly
          generatePost();
        } else {
          alert(`Invalid selection. Please enter 1-${suggestions.length}`);
          suggestionSelection.value = '';
        }
      }
    });
  } catch (error) {
    console.error('Suggestions error:', error);
    list.innerHTML = '<div style="color: var(--ibm-red);">Error loading suggestions. Please try again.</div>';
  }
}

// Load quotes
async function loadQuotes() {
  const list = document.getElementById('quotes-list');
  list.innerHTML = '<div style="color: #ffff00;">LOADING QUOTES...</div>';
  
  try {
    const response = await fetch('/api/quotes');
    
    if (!response.ok) {
      throw new Error('Failed to load quotes');
    }
    
    const data = await response.json();
    
    if (!data.quotes || !Array.isArray(data.quotes)) {
      throw new Error('Invalid quotes data');
    }
    
    const quotes = data.quotes;
    list.innerHTML = quotes.map((q, i) => 
      `<div class="menu-item">
        <span class="menu-number">${i + 1}.</span>
        <span class="menu-text">"${q.text}" - ${q.author}</span>
      </div>`
    ).join('') + `
      <div class="input-line">
        Selection ===> <input type="text" id="quote-selection" class="input-field" style="width: 50px;" maxlength="2">
        <span class="cursor"></span>
      </div>
    `;
    
    // Add selection handler
    const quoteSelection = document.getElementById('quote-selection');
    quoteSelection.focus();
    quoteSelection.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const selection = parseInt(quoteSelection.value.trim());
        if (selection >= 1 && selection <= quotes.length) {
          state.topic = quotes[selection - 1].text;
          document.getElementById('topic-text').value = state.topic;
          // Call generatePost directly
          generatePost();
        } else {
          alert(`Invalid selection. Please enter 1-${quotes.length}`);
          quoteSelection.value = '';
        }
      }
    });
  } catch (error) {
    console.error('Quotes error:', error);
    list.innerHTML = '<div style="color: var(--ibm-red);">Error loading quotes. Please try again.</div>';
  }
}

// Manual topic selection handler
const manualSelection = document.getElementById('manual-selection');
if (manualSelection) {
  manualSelection.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const selection = manualSelection.value.trim();
      if (selection === '1') {
        manualSelection.value = '';
        generatePost();
      } else {
        alert('Invalid selection. Please enter 1');
        manualSelection.value = '';
      }
    }
  });
}

// Generate post function
async function generatePost() {
  const topicText = document.getElementById('topic-text').value.trim();
  
  if (!topicText) {
    alert('Please enter or select a topic');
    return;
  }
  
  state.topic = topicText;
  
  // Show loading
  showStep('step-result');
  document.getElementById('generated-text').textContent = 'GENERATING...';
  document.getElementById('generated-image').querySelector('pre').textContent = 'GENERATING...';
  
  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Add auth token if available
    if (state.token) {
      headers['Authorization'] = `Bearer ${state.token}`;
    }
    
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        platform: state.selectedPlatform,
        topic: state.topic
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      if (response.status === 403) {
        // Email verification required
        document.getElementById('generated-text').textContent = '⚠ Email Verification Required';
        document.getElementById('generated-image').querySelector('pre').textContent = 
          'Please verify your email address to generate posts.\n\nCheck your inbox for the verification email.';
        return;
      }
      throw new Error(data.error || 'Failed to generate post');
    }
    
    state.generatedPost = data;
    
    document.getElementById('generated-text').textContent = data.text;
    document.getElementById('generated-image').querySelector('pre').textContent = data.asciiArt;
    
    // Setup result selection after content is loaded
    setTimeout(setupResultSelection, 100);
  } catch (error) {
    document.getElementById('generated-text').textContent = 'Error generating post. Please try again.';
    document.getElementById('generated-image').querySelector('pre').textContent = error.message || 'An error occurred';
  }
}

// Result selection handler
function setupResultSelection() {
  const resultSelection = document.getElementById('result-selection');
  if (!resultSelection) return;
  
  resultSelection.focus();
  resultSelection.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const selection = resultSelection.value.trim();
      resultSelection.value = '';
      
      if (selection === '1') {
        copyText();
      } else if (selection === '2') {
        downloadImage();
      } else if (selection === '3') {
        resetFlow();
      } else {
        alert('Invalid selection. Please enter 1, 2, or 3');
      }
    }
  });
}

// Copy text
function copyText() {
  const text = document.getElementById('generated-text').textContent;
  navigator.clipboard.writeText(text);
  document.getElementById('result-message').textContent = 'Text copied to clipboard!';
  setTimeout(() => {
    document.getElementById('result-message').textContent = '';
  }, 2000);
}

// Download image
function downloadImage() {
  const ascii = document.getElementById('generated-image').querySelector('pre').textContent;
  
  // Create a canvas element
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Set font and measure text
  const fontSize = 14;
  const fontFamily = "'IBM Plex Mono', 'Courier New', monospace";
  ctx.font = `${fontSize}px ${fontFamily}`;
  
  // Split ASCII art into lines
  const lines = ascii.split('\n');
  const lineHeight = fontSize * 1.2;
  
  // Calculate canvas dimensions
  const maxWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
  const padding = 40;
  canvas.width = maxWidth + (padding * 2);
  canvas.height = (lines.length * lineHeight) + (padding * 2);
  
  // Set background color (terminal green theme)
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Set text style
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.fillStyle = '#00ff00';
  ctx.textBaseline = 'top';
  
  // Draw each line of ASCII art
  lines.forEach((line, index) => {
    ctx.fillText(line, padding, padding + (index * lineHeight));
  });
  
  // Convert canvas to blob and download
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ascii-art.png';
    a.click();
    URL.revokeObjectURL(url);
    
    document.getElementById('result-message').textContent = 'ASCII art image downloaded!';
    setTimeout(() => {
      document.getElementById('result-message').textContent = '';
    }, 2000);
  }, 'image/png');
}

// Back buttons - removed as we're using number selection now

// Global keyboard shortcuts and navigation
document.addEventListener('keydown', (e) => {
  // Arrow key navigation between fields
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    const activeElement = document.activeElement;
    
    // Get all focusable elements in the current active screen
    const activeScreen = document.querySelector('.screen.active');
    if (!activeScreen) return;
    
    // Get all input and textarea elements
    const focusableElements = Array.from(activeScreen.querySelectorAll(
      'input, textarea'
    )).filter(el => {
      // Filter out hidden elements and disabled elements
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && 
             style.visibility !== 'hidden' && 
             !el.disabled &&
             el.offsetParent !== null;
    });
    
    if (focusableElements.length === 0) return;
    
    const currentIndex = focusableElements.indexOf(activeElement);
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      // Move to next field
      const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % focusableElements.length;
      focusableElements[nextIndex].focus();
      // Select all text in the field for easy replacement
      if (focusableElements[nextIndex].select) {
        focusableElements[nextIndex].select();
      }
      // Update cursor visibility
      manageCursorVisibility();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      // Move to previous field
      const prevIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1;
      focusableElements[prevIndex].focus();
      // Select all text in the field for easy replacement
      if (focusableElements[prevIndex].select) {
        focusableElements[prevIndex].select();
      }
      // Update cursor visibility
      manageCursorVisibility();
    }
  }
  
  // Tab key navigation (forward)
  if (e.key === 'Tab' && !e.shiftKey) {
    const activeScreen = document.querySelector('.screen.active');
    if (!activeScreen) return;
    
    const focusableElements = Array.from(activeScreen.querySelectorAll(
      'input[type="email"], input[type="password"], input[type="text"], textarea, button'
    )).filter(el => el.offsetParent !== null && !el.disabled);
    
    if (focusableElements.length === 0) return;
    
    const currentIndex = focusableElements.indexOf(document.activeElement);
    if (currentIndex >= 0 && currentIndex < focusableElements.length - 1) {
      e.preventDefault();
      focusableElements[currentIndex + 1].focus();
      manageCursorVisibility();
    } else if (currentIndex === focusableElements.length - 1) {
      e.preventDefault();
      focusableElements[0].focus();
      manageCursorVisibility();
    }
  }
  
  // Shift+Tab key navigation (backward)
  if (e.key === 'Tab' && e.shiftKey) {
    const activeScreen = document.querySelector('.screen.active');
    if (!activeScreen) return;
    
    const focusableElements = Array.from(activeScreen.querySelectorAll(
      'input[type="email"], input[type="password"], input[type="text"], textarea, button'
    )).filter(el => el.offsetParent !== null && !el.disabled);
    
    if (focusableElements.length === 0) return;
    
    const currentIndex = focusableElements.indexOf(document.activeElement);
    if (currentIndex > 0) {
      e.preventDefault();
      focusableElements[currentIndex - 1].focus();
      manageCursorVisibility();
    } else if (currentIndex === 0) {
      e.preventDefault();
      focusableElements[focusableElements.length - 1].focus();
      manageCursorVisibility();
    }
  }
  
  // F3 - Logout
  if (e.key === 'F3') {
    e.preventDefault();
    const activeScreen = document.querySelector('.screen.active');
    if (activeScreen && activeScreen.id === 'main-screen') {
      // Logout
      const logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn) {
        logoutBtn.click();
      } else {
        // Manual logout if button not found
        state.token = null;
        localStorage.removeItem('token');
        showAuthScreen();
        const authForm = document.getElementById('auth-form');
        if (authForm) authForm.reset();
        showMessage('');
        resetFlow();
      }
    }
  }
  
  // F12 - Back to main menu / Cancel
  if (e.key === 'F12') {
    e.preventDefault();
    const activeScreen = document.querySelector('.screen.active');
    if (activeScreen && activeScreen.id === 'main-screen') {
      // Go back to platform selection (main menu)
      showStep('step-platform');
    }
  }
  
  // F4 - Login (on auth screen)
  if (e.key === 'F4') {
    const activeScreen = document.querySelector('.screen.active');
    if (activeScreen && activeScreen.id === 'auth-screen') {
      e.preventDefault();
      authSelection.value = '1';
      authSelection.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter' }));
    }
  }
  
  // F9 - Signup (on auth screen) or Generate/Retrieve
  if (e.key === 'F9') {
    e.preventDefault();
    const activeScreen = document.querySelector('.screen.active');
    if (activeScreen && activeScreen.id === 'auth-screen') {
      authSelection.value = '2';
      authSelection.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter' }));
    } else if (!document.getElementById('step-input').classList.contains('hidden')) {
      const manualInput = document.getElementById('manual-input');
      if (manualInput && !manualInput.classList.contains('hidden')) {
        generatePost();
      }
    } else if (!document.getElementById('step-result').classList.contains('hidden')) {
      resetFlow();
    }
  }
  
  // F5 - Copy (on result screen)
  if (e.key === 'F5' && !document.getElementById('step-result').classList.contains('hidden')) {
    e.preventDefault();
    copyText();
  }
  
  // F6 - Download (on result screen)
  if (e.key === 'F6' && !document.getElementById('step-result').classList.contains('hidden')) {
    e.preventDefault();
    downloadImage();
  }
});

// Manage cursor visibility based on focus
function manageCursorVisibility() {
  // Hide all cursors initially
  document.querySelectorAll('.cursor').forEach(cursor => {
    cursor.style.display = 'none';
  });
  
  // Show cursor next to focused input
  const activeElement = document.activeElement;
  if (activeElement && activeElement.classList.contains('input-field')) {
    const cursor = activeElement.nextElementSibling;
    if (cursor && cursor.classList.contains('cursor')) {
      cursor.style.display = 'inline-block';
    }
  }
}

// Add focus/blur listeners to all input fields
document.addEventListener('focusin', (e) => {
  if (e.target.classList.contains('input-field')) {
    manageCursorVisibility();
  }
});

document.addEventListener('focusout', (e) => {
  if (e.target.classList.contains('input-field')) {
    manageCursorVisibility();
  }
});

// Start app
init();

// Initial cursor setup
setTimeout(manageCursorVisibility, 200);

// Make function key buttons clickable
document.addEventListener('DOMContentLoaded', () => {
  const functionButtons = document.querySelectorAll('.function-key');
  
  functionButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const keyText = button.textContent.trim();
      
      // Handle each function key directly
      if (keyText === 'F3') {
        // Logout
        const activeScreen = document.querySelector('.screen.active');
        if (activeScreen && activeScreen.id === 'main-screen') {
          const logoutBtn = document.getElementById('logout-btn');
          if (logoutBtn) {
            logoutBtn.click();
          } else {
            state.token = null;
            localStorage.removeItem('token');
            showAuthScreen();
            const authForm = document.getElementById('auth-form');
            if (authForm) authForm.reset();
            showMessage('');
            resetFlow();
          }
        }
      } else if (keyText === 'F12') {
        // Back to main menu
        const activeScreen = document.querySelector('.screen.active');
        if (activeScreen && activeScreen.id === 'main-screen') {
          showStep('step-platform');
        }
      } else if (keyText === 'F4') {
        // Login
        const activeScreen = document.querySelector('.screen.active');
        if (activeScreen && activeScreen.id === 'auth-screen') {
          const authSelection = document.getElementById('auth-selection');
          if (authSelection) {
            authSelection.value = '1';
            authSelection.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', bubbles: true }));
          }
        }
      } else if (keyText === 'F9') {
        // Signup / Generate / New Post
        const activeScreen = document.querySelector('.screen.active');
        if (activeScreen && activeScreen.id === 'auth-screen') {
          const authSelection = document.getElementById('auth-selection');
          if (authSelection) {
            authSelection.value = '2';
            authSelection.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', bubbles: true }));
          }
        } else if (!document.getElementById('step-input').classList.contains('hidden')) {
          const manualInput = document.getElementById('manual-input');
          if (manualInput && !manualInput.classList.contains('hidden')) {
            generatePost();
          }
        } else if (!document.getElementById('step-result').classList.contains('hidden')) {
          resetFlow();
        }
      }
    });
  });
});

// CRT Jitter effect - trigger occasionally
function triggerCRTJitter() {
  const terminal = document.querySelector('.terminal');
  if (terminal) {
    terminal.style.animation = 'crt-jitter 0.15s steps(1)';
    setTimeout(() => {
      terminal.style.animation = 'none';
    }, 150);
  }
  
  // Random interval between 5-15 seconds
  const nextJitter = 5000 + Math.random() * 10000;
  setTimeout(triggerCRTJitter, nextJitter);
}

// Start jitter effect after page loads
setTimeout(triggerCRTJitter, 5000);
