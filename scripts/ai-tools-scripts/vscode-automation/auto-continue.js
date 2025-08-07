/**
 * VS Code Copilot Auto-Continue Script v3.0
 *
 * Simplified button clicking automation for VS Code Copilot Chat.
 * Clicks action buttons immediately when they become visible.
 *
 * Usage: autoContinue.start(), autoContinue.stop(), autoContinue.enableDebug()
 */

// Configuration
const config = {
  selectors: {
    buttons: {
      continue: [
        'button[aria-label*="Continue"]',
        'button[title*="Continue"]',
        'a.monaco-button[role="button"]',
        'button.monaco-button',
        '.action-item button[title*="Continue"]',
        '.chat-response-controls button',
        '.interactive-session .monaco-button'
      ],
      tryAgain: [
        'button[aria-label*="Try"]',
        'button[title*="Try"]',
        'button[aria-label*="Retry"]',
        'button[title*="Retry"]',
        'a.monaco-button[role="button"]',
        'button.monaco-button',
        '.action-item button[title*="Try"]'
      ],
      keep: [
        'button[aria-label*="Keep"]',
        'button[title*="Keep"]',
        'button[aria-label*="Accept"]',
        'a.action-label[role="button"]',
        'button.monaco-button',
        '.action-item button[title*="Keep"]'
      ],
      accept: [
        'button[aria-label*="Accept"]',
        'button[title*="Accept"]',
        'button[aria-label*="Apply"]',
        'button.monaco-button',
        '.action-item button[title*="Accept"]'
      ]
    }
  },
  intervals: {
    buttonCooldown: 3000,
    checkInterval: 5000
  }
};

// Logging utility
const log = (function() {
  const levels = {
    debug: { priority: 0, color: '#8E44AD', prefix: '🐛' },
    info: { priority: 1, color: '#2196F3', prefix: 'ℹ️' },
    warn: { priority: 2, color: '#FF9800', prefix: '⚠️' },
    error: { priority: 3, color: '#F44336', prefix: '❌' },
    success: { priority: 4, color: '#4CAF50', prefix: '✅' }
  };

  function log(message, level = 'info', data = null) {
    if (!levels[level]) {
      level = 'info';
    }

    if (level === 'debug' && !state.debugMode) {
      return;
    }

    const levelConfig = levels[level];
    const timestamp = new Date().toISOString().substr(11, 12);
    const formattedMessage = `[auto][${timestamp}] ${levelConfig.prefix} ${message}`;

    const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';

    if (data) {
      console[consoleMethod](
        `%c${formattedMessage}`,
        `color: ${levelConfig.color}; font-weight: normal;`,
        data
      );
    } else {
      console[consoleMethod](
        `%c${formattedMessage}`,
        `color: ${levelConfig.color}; font-weight: normal;`
      );
    }
  }

  log.debug = (message, data) => log(message, 'debug', data);
  log.info = (message, data) => log(message, 'info', data);
  log.warn = (message, data) => log(message, 'warn', data);
  log.error = (message, data) => log(message, 'error', data);
  log.success = (message, data) => log(message, 'success', data);

  return log;
})();

// State management
const state = {
  isRunning: false,
  timerId: null,
  lastClick: Date.now(),
  isProcessing: false,
  cleanupCounter: 0,
  debugMode: false
};

// Button configuration
const BUTTONS_TO_CLICK = [
  { name: 'Continue', selectors: config.selectors.buttons.continue },
  { name: 'Try Again', selectors: config.selectors.buttons.tryAgain },
  { name: 'Keep', selectors: config.selectors.buttons.keep },
  { name: 'Accept', selectors: config.selectors.buttons.accept }
];

// Generic button clicking function
function clickButton(selector) {
  try {
    const buttons = Array.from(document.querySelectorAll(selector));
    
    if (buttons.length === 0) {
      return false;
    }

    const button = buttons.find(btn => {
      try {
        const rect = btn.getBoundingClientRect();
        const style = window.getComputedStyle(btn);
        const isVisible = rect.width > 0 && rect.height > 0 &&
                         btn.offsetParent !== null &&
                         style.display !== 'none' &&
                         style.visibility !== 'hidden' &&
                         style.opacity !== '0';

        const isEnabled = !btn.disabled &&
                         btn.getAttribute('aria-disabled') !== 'true' &&
                         !btn.hasAttribute('disabled');

        const alreadyClicked = btn.getAttribute('data-auto-continue-clicked') === 'true';

        return isVisible && isEnabled && !alreadyClicked;
      } catch (e) {
        return false;
      }
    });

    if (!button) {
      return false;
    }

    // Check cooldown
    const now = Date.now();
    if (now - state.lastClick < config.intervals.buttonCooldown) {
      log(`⏱️ Button cooldown active, skipping click`, 'debug');
      return false;
    }

    try {
      const buttonText = (button.textContent || button.getAttribute('aria-label') || button.getAttribute('title') || '').trim();

      // Exclude specific button patterns
      const excludedPatterns = ['go back', 'keep all edits'];
      const lowerButtonText = buttonText.toLowerCase();
      const isExcluded = excludedPatterns.some(pattern => lowerButtonText.includes(pattern));
      
      if (isExcluded) {
        log(`🚫 Excluded button: ${buttonText}`, 'debug');
        return false;
      }

      // Final validation
      const rect = button.getBoundingClientRect();
      const isStillVisible = rect.width > 0 && rect.height > 0 && button.offsetParent !== null;
      const isStillEnabled = !button.disabled && button.getAttribute('aria-disabled') !== 'true';

      if (!isStillVisible || !isStillEnabled) {
        log(`🚫 Button no longer clickable: ${buttonText}`, 'debug');
        return false;
      }

      // Mark as clicked and perform click
      button.setAttribute('data-auto-continue-clicked', 'true');
      button.scrollIntoView({ block: 'center', inline: 'center' });

      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      
      const clickResult = button.dispatchEvent(clickEvent);

      if (clickResult) {
        log(`🎯 Successfully clicked: ${buttonText}`, 'success');
        state.lastClick = now;
        return true;
      } else {
        log(`❌ Click was cancelled: ${buttonText}`, 'warn');
        return false;
      }
    } catch (clickError) {
      log(`❌ Error clicking button:`, 'error', clickError);
      return false;
    }
  } catch (error) {
    log(`❌ Critical error in clickButton:`, 'error', error);
    return false;
  }
}

// Check for and click actionable buttons
function checkForButtons() {
  log('🔍 Checking for actionable buttons...', 'debug');
  
  try {
    for (const buttonConfig of BUTTONS_TO_CLICK) {
      for (const selector of buttonConfig.selectors) {
        if (clickButton(selector)) {
          log(`✅ Clicked ${buttonConfig.name} button`, 'info');
          return true;
        }
      }
    }
    
    log('🔍 No actionable buttons found', 'debug');
    return false;
  } catch (error) {
    log('❌ Error in checkForButtons:', 'error', error);
    return false;
  }
}

// Main loop
async function mainLoop() {
  if (!state.isRunning || state.isProcessing) {
    return;
  }

  state.isProcessing = true;
  const checkId = Math.random().toString(36).substr(2, 6);

  log(`[${checkId}] 🔄 Main loop iteration`, 'info');

  try {
    // Periodic cleanup
    state.cleanupCounter++;
    if (state.cleanupCounter >= 30) {
      const clickedButtons = document.querySelectorAll('[data-auto-continue-clicked="true"]');
      clickedButtons.forEach(btn => btn.removeAttribute('data-auto-continue-clicked'));
      log(`🧹 Cleaned up ${clickedButtons.length} clicked button markers`, 'debug');
      state.cleanupCounter = 0;
    }

    // Check for and click buttons
    checkForButtons();

  } catch (error) {
    log(`❌ Error in main loop [${checkId}]:`, 'error', error);
  } finally {
    state.isProcessing = false;
  }
}

// Control functions
function clickButtonByText(buttonName) {
  const buttonConfig = BUTTONS_TO_CLICK.find(config => 
    config.name.toLowerCase() === buttonName.toLowerCase()
  );
  
  if (!buttonConfig) {
    log(`❌ Unknown button type: ${buttonName}`, 'error');
    return false;
  }

  for (const selector of buttonConfig.selectors) {
    if (clickButton(selector)) {
      log(`✅ Successfully clicked ${buttonName} button`, 'success');
      return true;
    }
  }
  
  log(`❌ Could not find ${buttonName} button to click`, 'warn');
  return false;
}

function startAutoContinue() {
  if (state.isRunning) {
    log('⚠️ Auto-continue is already running', 'warn');
    return;
  }

  log('🚀 Starting auto-continue...', 'info');
  state.isRunning = true;
  state.timerId = setInterval(mainLoop, config.intervals.checkInterval);
  log('✅ Auto-continue started successfully', 'success');
}

function stopAutoContinue() {
  if (!state.isRunning) {
    log('⚠️ Auto-continue is not running', 'warn');
    return;
  }

  log('🛑 Stopping auto-continue...', 'info');
  state.isRunning = false;
  
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
  
  log('✅ Auto-continue stopped successfully', 'success');
}

// Public API
window.autoContinue = {
  start: startAutoContinue,
  stop: stopAutoContinue,
  clickButtonByText: clickButtonByText,
  enableDebug: () => {
    state.debugMode = true;
    log('🐛 Debug mode enabled', 'info');
  },
  disableDebug: () => {
    state.debugMode = false;
    log('🔇 Debug mode disabled', 'info');
  },
  getState: () => ({ ...state }),
  version: '3.0'
};

log('🎯 VS Code Copilot Auto-Continue Script v3.0 loaded', 'success');
log('📖 Available commands: autoContinue.start(), autoContinue.stop(), autoContinue.enableDebug()', 'info');
