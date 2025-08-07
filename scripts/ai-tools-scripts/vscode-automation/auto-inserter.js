/**
 * VS Code Copilot Auto-Inserter Script v3.0
 * Advanced automation with prompt insertion, task detection, and idle monitoring
 * 
 * This script works in conjunction with auto-continue.js:
 * - auto-continue.js: Handles basic button clicking automation
 * - auto-inserter.js: Provides advanced features like prompt insertion, task detection, idle detection
 * 
 * Core Features:
 * - Intelligent idle detection to determine when AI has stopped working
 * - Automatic prompt insertion to continue stalled AI sessions
 * - Advanced task activity monitoring with multiple detection strategies
 * 
 * Depends on: auto-continue.js for basic button clicking functionality
 */

// Configuration for advanced automation features
const PROMPTS = {
  continue: [
    "Continue.",
    "Please continue.",
    "Continue where you left off.",
    "Keep going.",
    "Please proceed."
  ]
};

// State management for advanced features
const advancedState = {
  isRunning: false,
  lastActivityTime: new Date(),
  debugMode: false,
  timerId: null
};

// Configuration for advanced features
const advancedConfig = {
  intervals: {
    idleTimeout: 30000,        // 30 seconds before considering AI idle
    checkInterval: 1000        // 1 second main loop interval
  }
};

/**
 * Advanced logging function that extends basic logging
 * Uses auto-continue's logging if available, otherwise provides fallback
 */
function advancedLog(message, level = 'info', data = null) {
  // Try to use auto-continue's logging system if available
  if (window.autoContinue && window.autoContinue.log) {
    return window.autoContinue.log(`[AUTO-INSERTER] ${message}`, level, data);
  }
  
  // Fallback logging
  const timestamp = new Date().toISOString().substr(11, 12);
  const prefix = `[${timestamp}] [AUTO-INSERTER]`;
  
  const logData = data ? ` | Data: ${JSON.stringify(data)}` : '';
  const fullMessage = `${prefix} ${message}${logData}`;
  
  switch (level) {
    case 'error':
      console.error(fullMessage);
      break;
    case 'warn':
      console.warn(fullMessage);
      break;
    case 'success':
      console.log(`✅ ${fullMessage}`);
      break;
    case 'debug':
      if (advancedState.debugMode) {
        console.log(`🐛 ${fullMessage}`);
      }
      break;
    default:
      console.log(fullMessage);
  }
}

/**
 * Advanced Task Detection: Detects if AI is actively working
 * Unique to auto-inserter.js
 */
function isTaskActive() {
  try {
    // Look for active spinner/loading indicators
    const spinnerSelectors = [
      '.codicon-loading~.codicon-modifier-spin',
      '.codicon-sync~.codicon-modifier-spin',
      '.loading-indicator',
      '.spinner',
      '.monaco-progress-container.active'
    ];

    for (const selector of spinnerSelectors) {
      const spinner = document.querySelector(selector);
      if (spinner) {
        const style = window.getComputedStyle(spinner);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
          advancedLog(`🔄 Active spinner detected: ${selector}`, 'debug');
          return true;
        }
      }
    }

    // Check for streaming text indicators
    const streamingSelectors = [
      '.chat-response .value .markdown-string:not(.completed)',
      '.interactive-result-code-block:not(.completed)',
      '.chat-response:not(.complete)',
      '.interactive-session .response:not(.complete)'
    ];

    for (const selector of streamingSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        advancedLog(`📝 Streaming content detected: ${selector} (${elements.length} elements)`, 'debug');
        return true;
      }
    }

    // Check for "thinking" or working indicators in chat
    const workingTextPatterns = [
      /thinking\.\.\./i,
      /working\.\.\./i,
      /generating\.\.\./i,
      /analyzing\.\.\./i,
      /processing\.\.\./i
    ];

    const chatMessages = document.querySelectorAll('.chat-response .value, .interactive-result-editor-wrapper .value');
    for (const message of chatMessages) {
      const text = message.textContent || '';
      if (workingTextPatterns.some(pattern => pattern.test(text))) {
        advancedLog(`🤔 Working indicator detected in text: "${text.substring(0, 50)}..."`, 'debug');
        return true;
      }
    }

    return false;
  } catch (error) {
    advancedLog('❌ Error in isTaskActive:', 'error', error);
    return false;
  }
}

/**
 * Input Readiness Detection: Checks if chat input is ready for prompt insertion
 * Unique to auto-inserter.js
 */
function isInputReady() {
  try {
    const inputSelectors = [
      '.interactive-input-part .chat-editor-container textarea',
      '.interactive-input-part .monaco-editor textarea',
      '.chat-input-container .monaco-editor textarea',
      'div[role="textbox"][contenteditable="true"]'
    ];

    for (const selector of inputSelectors) {
      const input = document.querySelector(selector);
      if (input) {
        const rect = input.getBoundingClientRect();
        const style = window.getComputedStyle(input);
        
        const isVisible = rect.width > 0 && rect.height > 0 && 
                         input.offsetParent !== null &&
                         style.display !== 'none' && 
                         style.visibility !== 'hidden';
        
        const isEnabled = !input.disabled && 
                         input.getAttribute('aria-disabled') !== 'true' &&
                         !input.hasAttribute('disabled');
        
        if (isVisible && isEnabled) {
          advancedLog(`✅ Input ready: ${selector}`, 'debug');
          return { ready: true, input, type: input.tagName.toLowerCase() };
        }
      }
    }

    advancedLog('❌ No ready input found', 'debug');
    return { ready: false, input: null, type: null };
  } catch (error) {
    advancedLog('❌ Error in isInputReady:', 'error', error);
    return { ready: false, input: null, type: null };
  }
}

/**
 * Prompt Insertion: Sends a continuation prompt to the chat
 * Unique to auto-inserter.js
 */
async function sendPrompt() {
  try {
    advancedLog('🔄 Attempting to send continuation prompt...', 'info');

    const inputCheck = isInputReady();
    if (!inputCheck.ready) {
      advancedLog('❌ Input not ready for prompt insertion', 'warn');
      return false;
    }

    const input = inputCheck.input;
    const inputType = inputCheck.type;

    // Select a random prompt
    const prompt = PROMPTS.continue[Math.floor(Math.random() * PROMPTS.continue.length)];
    advancedLog(`📝 Selected prompt: "${prompt}"`, 'debug');

    // Clear existing content
    if (inputType === 'textarea') {
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (input.contentEditable === 'true') {
      input.textContent = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Wait a moment for clearing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Insert the prompt
    if (inputType === 'textarea') {
      input.value = prompt;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (input.contentEditable === 'true') {
      input.textContent = prompt;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Focus the input
    input.focus();

    // Wait a moment before sending
    await new Promise(resolve => setTimeout(resolve, 200));

    // Look for send button and click it
    const sendSelectors = [
      '.interactive-input-part button[aria-label*="Send"]:not([disabled])',
      '.chat-input-container button[aria-label*="Send"]:not([disabled])',
      '.chat-input-toolbars button:not([disabled])',
      'button[aria-label*="Send"]:not([disabled])',
      'button[type="submit"]:not([disabled])'
    ];

    let sendButton = null;
    for (const selector of sendSelectors) {
      const btn = document.querySelector(selector);
      if (btn) {
        const rect = btn.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0 && btn.offsetParent !== null;
        if (isVisible && !btn.disabled) {
          sendButton = btn;
          break;
        }
      }
    }

    if (sendButton) {
      sendButton.click();
      advancedLog(`✅ Prompt sent successfully: "${prompt}"`, 'success');
      
      // Update activity tracking
      advancedState.lastActivityTime = new Date();
      
      return true;
    } else {
      advancedLog('❌ No send button found', 'warn');
      return false;
    }

  } catch (error) {
    advancedLog('❌ Error in sendPrompt:', 'error', error);
    return false;
  }
}

/**
 * Idle Detection: Checks if AI has been idle for too long
 * Unique to auto-inserter.js
 */
function checkForIdle() {
  try {
    // Check if there's an active task running
    const hasActiveTask = isTaskActive();
    if (hasActiveTask) {
      // Update lastActivityTime since we just detected AI activity
      advancedState.lastActivityTime = new Date();
      advancedLog('🟡 Active task detected, AI is not idle - updated lastActivityTime', 'debug');
      return false;
    }

    // Check if enough time has passed since last activity for idle detection
    const now = new Date();
    const timeSinceActivity = now - advancedState.lastActivityTime;
    const idleThreshold = advancedConfig.intervals.idleTimeout;

    if (timeSinceActivity >= idleThreshold) {
      advancedLog(`🕐 AI appears to be idle (${Math.round(timeSinceActivity / 1000)}s since last activity, threshold: ${Math.round(idleThreshold / 1000)}s)`, 'info');
      return true;
    }

    advancedLog(`⏰ AI not idle yet (${Math.round(timeSinceActivity / 1000)}s since activity, need ${Math.round(idleThreshold / 1000)}s)`, 'debug');
    return false;
  } catch (error) {
    advancedLog('❌ Error in checkForIdle:', 'error', error);
    return false;
  }
}

/**
 * Send Continuation Prompt: Wrapper for sending continuation prompts
 * Unique to auto-inserter.js
 */
async function sendContinuationPrompt() {
  try {
    advancedLog('🔄 Sending continuation prompt due to idle detection...', 'info');
    
    const result = await sendPrompt();
    if (result) {
      advancedLog('✅ Continuation prompt sent successfully', 'success');
      return true;
    } else {
      advancedLog('❌ Failed to send continuation prompt', 'warn');
      return false;
    }
  } catch (error) {
    advancedLog('❌ Error in sendContinuationPrompt:', 'error', error);
    return false;
  }
}

/**
 * Advanced Main Loop: Handles advanced automation features
 * Works alongside auto-continue.js basic button clicking
 */
async function advancedMainLoop() {
  if (!advancedState.isRunning) {
    return;
  }

  try {
    advancedLog('🔄 Advanced loop iteration...', 'debug');

    // Check for idle state and send continuation prompt if needed
    const isIdle = checkForIdle();
    if (isIdle) {
      advancedLog('🕐 AI is idle, attempting to send continuation prompt...', 'info');
      const promptSent = await sendContinuationPrompt();
      if (promptSent) {
        advancedLog('✅ Continuation prompt sent due to idle detection', 'success');
        return; // Exit this iteration
      }
    }

  } catch (error) {
    advancedLog('❌ Error in advancedMainLoop:', 'error', error);
  }
}

/**
 * Start Advanced Automation
 */
function startAdvancedAutomation() {
  try {
    advancedLog('=== VS Code Copilot Auto-Inserter v3.0 STARTING ===', 'info');
    
    // Check if auto-continue is available
    if (!window.autoContinue) {
      advancedLog('⚠️ Warning: auto-continue.js not detected. Basic button clicking may not work.', 'warn');
    }

    // Clean up existing automation if present
    if (advancedState.timerId) {
      clearInterval(advancedState.timerId);
    }

    // Set up advanced automation interval
    advancedState.timerId = setInterval(() => {
      advancedMainLoop().catch(console.error);
    }, advancedConfig.intervals.checkInterval);

    // Set initial state
    advancedState.isRunning = true;
    advancedState.lastActivityTime = new Date();

    advancedLog('🚀 Auto-Inserter advanced features are running!', 'success');
    advancedLog('Commands: autoInserter.stop(), autoInserter.start()', 'info');

    return true;
  } catch (error) {
    advancedLog('❌ Error starting advanced automation:', 'error', error);
    return false;
  }
}

/**
 * Stop Advanced Automation
 */
function stopAdvancedAutomation() {
  try {
    advancedLog('🛑 Stopping Auto-Inserter advanced features...', 'info');
    
    advancedState.isRunning = false;
    
    if (advancedState.timerId) {
      clearInterval(advancedState.timerId);
      advancedState.timerId = null;
    }
    
    advancedLog('✅ Auto-Inserter advanced features stopped', 'success');
    return true;
  } catch (error) {
    advancedLog('❌ Error stopping advanced automation:', 'error', error);
    return false;
  }
}

/**
 * Public API for Auto-Inserter
 */
window.autoInserter = {
  // Start advanced automation features
  start() {
    advancedLog('🚀 Starting auto-inserter via public API', 'info');
    return startAdvancedAutomation();
  },
  
  // Stop advanced automation features
  stop() {
    advancedLog('🛑 Stopping auto-inserter via public API', 'info');
    return stopAdvancedAutomation();
  },
  
  // Enable debug mode
  enableDebug() {
    advancedState.debugMode = true;
    advancedLog('🐛 Debug mode enabled', 'info');
  },
  
  // Disable debug mode
  disableDebug() {
    advancedState.debugMode = false;
    advancedLog('🐛 Debug mode disabled', 'info');
  },
  
  // Get current state
  getStatus() {
    return {
      isRunning: advancedState.isRunning,
      debugMode: advancedState.debugMode,
      lastActivityTime: advancedState.lastActivityTime
    };
  },
  
  // Test prompt sending
  async testPrompt() {
    advancedLog('🧪 Testing prompt sending...', 'info');
    const result = await sendPrompt();
    advancedLog('🧪 Test prompt result:', 'info', result);
    return result;
  },
  
  // Manual idle check
  checkIdle() {
    return checkForIdle();
  },
  
  // Manual task active check
  isTaskActive() {
    return isTaskActive();
  }
};

// Initialize debug mode if needed
if (typeof window.autoInserterDebug !== 'undefined' && window.autoInserterDebug) {
  window.autoInserter.enableDebug();
}

advancedLog('✅ Auto-Inserter script loaded successfully', 'info');
advancedLog('📝 Available commands: autoInserter.start(), autoInserter.stop(), autoInserter.enableDebug(), autoInserter.testPrompt()', 'info');
advancedLog('🔗 This script works with auto-continue.js for complete automation', 'info');
