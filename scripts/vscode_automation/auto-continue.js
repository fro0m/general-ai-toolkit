/**
 * VS Code Copilot Auto-Continue Script v2.3
 *
 * Automates VS Code Copilot Chat by clicking action buttons and sending prompts.
 *
 * Commands: autoContinue.stop()
 */

// Configuration module as per architecture specification
const config = {
  // CSS selectors for buttons and UI elements
  selectors: {
    // Action buttons to automatically click
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
    },
    // Chat input field selectors
    input: [
      // VS Code Copilot Chat specific selectors
      '.interactive-input-part .chat-editor-container .interactive-input-editor textarea',
      '.interactive-input-part .chat-editor-container textarea',
      '.interactive-input-part .monaco-editor textarea',
      '.chat-input-container .monaco-editor textarea',
      '.chat-editor-container .monaco-editor textarea',
      '.interactive-input-editor textarea',
      // Generic chat input selectors
      'div[role="textbox"][contenteditable="true"]',
      '.interactive-input .monaco-editor textarea',
      '.chat-input .monaco-editor textarea',
      '.copilot-chat .monaco-editor textarea',
      // Broader Monaco editor search within chat context
      '.interactive-input-part textarea',
      '.chat-input-container textarea',
      '.interactive-session textarea',
      // Generic input selectors
      'textarea[placeholder*="Ask"]',
      'textarea[placeholder*="Message"]',
      'textarea[placeholder*="Chat"]',
      'textarea[placeholder*="Send"]',
      'textarea[aria-label*="Ask"]',
      'textarea[aria-label*="Chat"]',
      // Monaco specific
      '.monaco-inputbox input',
      '.monaco-editor textarea',
      '.monaco-editor .view-line',
      // Broader search for contenteditable in chat areas
      '.chat-container [contenteditable="true"]',
      '.copilot-chat [contenteditable="true"]',
      '.interactive-session [contenteditable="true"]',
      '.interactive-input-part [contenteditable="true"]',
      '.chat-input-container [contenteditable="true"]',
      '.chat-container textarea',
      '.copilot-chat textarea'
    ],
    // Send button selectors
    sendButton: [
      '.interactive-input-part button[aria-label*="Send"]:not([disabled])',
      '.interactive-input-part button[title*="Send"]:not([disabled])',
      '.chat-input-container button[aria-label*="Send"]:not([disabled])',
      '.chat-input-container button[title*="Send"]:not([disabled])',
      '.chat-input-toolbars button:not([disabled])',
      '.interactive-input-and-side-toolbar button:not([disabled])',
      'button[aria-label*="Send"]:not([disabled])',
      'button[title*="Send"]:not([disabled])',
      'button[aria-label*="Submit"]:not([disabled])',
      'button[title*="Submit"]:not([disabled])',
      'button[type="submit"]:not([disabled])',
      '.send-button:not([disabled])',
      '.submit-button:not([disabled])',
      '.chat-input button:not([disabled])',
      '.interactive-input-part button:not([disabled])',
      '.copilot-chat button:not([disabled])',
      '.action-item button[title*="Send"]:not([disabled])',
      'button.monaco-button:not([disabled])',
      'button[class*="send"]:not([disabled])',
      'button[class*="submit"]:not([disabled])'
    ]
  },
  // Predefined prompts
  prompts: {
    continuation: "Continue executing the current task if it exists or do tasks on the dartboard iteratively until no uncompleted tasks left. Use build_run_rules, general, product_requirements_design instructions.md files."
  },
  // Time intervals and timing configuration
  intervals: {
    buttonCooldown: 3000,     // Cooldown between button clicks (ms)
    checkInterval: 5000,      // Main loop check interval (ms)
    maxRetries: 3,            // Maximum retry attempts
    maxPromptAttempts: 3,     // Maximum attempts to set prompt text
    fastTaskThreshold: 20000, // Task duration threshold for "fast" tasks (ms)
    maxConsecutiveFastTasks: 3 // Auto-stop after this many consecutive fast tasks
  }
};

// Legacy constants for backward compatibility
const BUTTON_COOLDOWN_MS = config.intervals.buttonCooldown;
const CHECK_INTERVAL = config.intervals.checkInterval;
const MAX_RETRIES = config.intervals.maxRetries;

// Logging utility as per architecture specification
const log = (function() {
  // Log levels configuration
  const levels = {
    debug: { priority: 0, color: '#8E44AD', prefix: '🐛' },
    info: { priority: 1, color: '#2196F3', prefix: 'ℹ️' },
    warn: { priority: 2, color: '#FF9800', prefix: '⚠️' },
    error: { priority: 3, color: '#F44336', prefix: '❌' },
    success: { priority: 4, color: '#4CAF50', prefix: '✅' },
    critical: { priority: 5, color: '#E91E63', prefix: '🚨' }
  };

  /**
   * Structured logging function that respects debug flag
   * @param {string} message - The message to log
   * @param {string} level - Log level: 'debug', 'info', 'warn', 'error', 'success', 'critical'
   * @param {object} data - Optional additional data to log
   */
  function log(message, level = 'info', data = null) {
    // Validate level
    if (!levels[level]) {
      console.warn(`[auto] Invalid log level: ${level}. Using 'info' instead.`);
      level = 'info';
    }

    // Skip debug messages if debug mode is disabled
    if (level === 'debug' && !state.debugMode) {
      return;
    }

    const levelConfig = levels[level];
    const timestamp = new Date().toISOString().substr(11, 12); // HH:MM:SS.mmm
    const formattedMessage = `[auto][${timestamp}] ${levelConfig.prefix} ${message}`;

    // Use appropriate console method based on level
    const consoleMethod = level === 'error' || level === 'critical' ? 'error' :
                         level === 'warn' ? 'warn' :
                         'log';

    // Apply styling for better visibility
    if (data) {
      console[consoleMethod](
        `%c${formattedMessage}`,
        `color: ${levelConfig.color}; font-weight: ${level === 'critical' ? 'bold' : 'normal'};`,
        data
      );
    } else {
      console[consoleMethod](
        `%c${formattedMessage}`,
        `color: ${levelConfig.color}; font-weight: ${level === 'critical' ? 'bold' : 'normal'};`
      );
    }

    // For critical errors, also log to error console
    if (level === 'critical') {
      console.error('CRITICAL ERROR DETAILS:', { message, data, timestamp });
    }
  }

  // Convenience methods for common log levels
  log.debug = (message, data) => log(message, 'debug', data);
  log.info = (message, data) => log(message, 'info', data);
  log.warn = (message, data) => log(message, 'warn', data);
  log.error = (message, data) => log(message, 'error', data);
  log.success = (message, data) => log(message, 'success', data);
  log.critical = (message, data) => log(message, 'critical', data);

  return log;
})();

// State management object as per architecture specification
const state = {
  isRunning: false,
  timerId: null,
  // lastActivityTime: Tracks when AI activity was last detected for idle detection
  // Updated in the following scenarios:
  // 1. Script initialization (immediate update)
  // 2. Initial startup check if AI activity detected
  // 3. When active task is detected in checkForIdle()
  // 4. When buttons are successfully clicked (mainLoop)
  // 5. When continuation prompts are sent (mainLoop)
  lastActivityTime: new Date(),
  // shortTaskCount: Counter for consecutive fast tasks (under config.intervals.fastTaskThreshold)
  // Incremented when task completes under the threshold, reset when normal task (≥threshold) completes
  // Used by autoStopLogic() to detect when AI is completing trivial tasks or stuck in loops
  // Auto-stop triggers when shortTaskCount reaches config.intervals.maxConsecutiveFastTasks
  shortTaskCount: 0,
  // Additional state for current implementation compatibility
  lastClick: Date.now(),
  isProcessing: false,
  retryCount: 0,
  // Cleanup counter for periodic maintenance tasks
  cleanupCounter: 0,
  debugMode: false,
  // Auto-stop functionality tracking
  taskHistory: [],          // Array to track recent task completion times
  currentTaskStartTime: null, // When the current task started
  maxTaskHistorySize: 3     // Keep track of last 3 tasks for auto-stop logic
};

// Buttons to automatically click - using configuration
const BUTTONS_TO_CLICK = [
  {
    name: 'Continue',
    selectors: config.selectors.buttons.continue
  },
  {
    name: 'Try Again',
    selectors: config.selectors.buttons.tryAgain
  },
  {
    name: 'Keep',
    selectors: config.selectors.buttons.keep
  },
  {
    name: 'Accept',
    selectors: config.selectors.buttons.accept
  }
];

function isTaskActive() {
  log('🔍 === ACTIVE TASK CHECK STARTED ===', 'info');

  try {
    // Focused active task indicators - only actual loading/processing states
    const activeIndicators = [
      // Core loading indicators
      '.codicon-loading:not([style*="display: none"])',
      '.codicon-sync-spin:not([style*="display: none"])',
      '.codicon-sync.codicon-spin:not([style*="display: none"])',

      // Active progress bars (not static ones)
      '.monaco-progress-container.active:not([style*="display: none"])',
      '.monaco-progress-container.infinite:not([style*="display: none"])',
      '.progress-bar.active:not([style*="display: none"])',

      // Chat-specific active states
      '.chat-response.in-progress:not([style*="display: none"])',
      '.chat-response .codicon-loading:not([style*="display: none"])',
      '.interactive-result-editor.loading:not([style*="display: none"])',
      '.chat-typing-indicator:not([style*="display: none"])',
      '.copilot-thinking:not([style*="display: none"])',
      '.generating-response:not([style*="display: none"])',

      // Response streaming/generating states
      'div[class*="typing"]:not([style*="display: none"])',
      'div[class*="streaming"]:not([style*="display: none"])',
      'div[class*="generating"]:not([style*="display: none"])',
      'div[class*="processing"]:not([style*="display: none"])',
      '.response-streaming:not([style*="display: none"])',

      // ARIA busy indicators (active elements only)
      '[aria-busy="true"]:not([style*="display: none"])',
      '[role="progressbar"]:not([style*="display: none"])',

      // Stop/Cancel buttons (indicate active processing)
      'button[aria-label*="Stop"]:not([disabled]):not([style*="display: none"])',
      'button[title*="Stop"]:not([disabled]):not([style*="display: none"])',
      'button[aria-label*="Cancel"]:not([disabled]):not([style*="display: none"])',
      'button[title*="Cancel"]:not([disabled]):not([style*="display: none"])',

      // Terminal/execution specific loading
      '.terminal .codicon-loading:not([style*="display: none"])',
      '.execution-progress:not([style*="display: none"])',

      // Active workbench states (more specific)
      '.editor-widget .monaco-progress-container.active:not([style*="display: none"])',
      '.part.loading:not([style*="display: none"])'
    ];

    // Exclude static/completed progress indicators that cause false positives
    const excludedStaticIndicators = [
      '.progress-container', // Static progress containers from completed tasks
      '.rendered-markdown.progress-step', // Completed task step indicators
      '.progress-step', // Static step indicators
      '.task-summary', // Task summary containers
      '.command-result', // Command result containers
      '.execution-summary' // Execution summary containers
    ];

    log(`🔍 Checking ${activeIndicators.length} active task indicators...`, 'debug');

    for (const selector of activeIndicators) {
      try {
        const elements = Array.from(document.querySelectorAll(selector));
        if (elements.length > 0) {
          log(`📊 Found ${elements.length} elements with selector: ${selector}`, 'debug');

          const visibleElements = elements.filter(el => {
            try {
              const rect = el.getBoundingClientRect();
              const style = window.getComputedStyle(el);
              const isVisible = rect.width > 0 && rect.height > 0 &&
                               el.offsetParent !== null &&
                               style.display !== 'none' &&
                               style.visibility !== 'hidden' &&
                               style.opacity !== '0';

              if (isVisible) {
                // Check if element is excluded (static indicator)
                const isExcluded = excludedStaticIndicators.some(excludeSelector => {
                  return el.matches(excludeSelector) || el.closest(excludeSelector);
                });

                if (isExcluded) {
                  log(`🚫 Excluded static indicator: ${el.className}`, 'debug');
                  return false;
                }

                // Check if element is in relevant context (more specific filtering)
                const inRelevantContext = el.closest('.chat-response, .copilot-chat, .interactive-result, .interactive-session, .chat-container') ||
                                         el.matches('.monaco-progress-container.active, .codicon-loading, [aria-busy="true"], [role="progressbar"], .terminal .codicon-loading');

                if (inRelevantContext) {
                  // Additional check: ensure it's actually an active indicator, not just a static element
                  const hasActiveClass = el.classList.contains('active') ||
                                        el.classList.contains('loading') ||
                                        el.classList.contains('spinning') ||
                                        el.classList.contains('in-progress') ||
                                        el.getAttribute('aria-busy') === 'true' ||
                                        el.matches('[role="progressbar"]') ||
                                        el.matches('.codicon-loading, .codicon-sync-spin');

                  // Check for animated elements (truly active)
                  const isAnimated = style.animationName !== 'none' ||
                                   style.transform.includes('rotate') ||
                                   el.matches('.codicon-loading, .codicon-sync-spin');

                  if (hasActiveClass || isAnimated) {
                    const elementInfo = {
                      tag: el.tagName,
                      class: el.className,
                      text: (el.textContent || '').trim().substring(0, 50),
                      ariaLabel: el.getAttribute('aria-label') || '',
                      ariaBusy: el.getAttribute('aria-busy'),
                      selector: selector,
                      hasActiveClass: hasActiveClass,
                      isAnimated: isAnimated
                    };
                    log('🎯 Active element found:', 'debug', elementInfo);
                    return true;
                  } else {
                    log(`🟠 Element found but not active: ${el.className}`, 'debug');
                  }
                }
              }
              return false;
            } catch (e) {
              return false;
            }
          });

          if (visibleElements.length > 0) {
            log(`✅ ${visibleElements.length} visible active elements found with selector: ${selector}`, 'success');
            log('🟡 === ACTIVE TASK DETECTED ===', 'warn');
            return true;
          }
        }
      } catch (selectorError) {
        log(`❌ Selector error for ${selector}:`, 'error', selectorError.message);
        continue;
      }
    }

    // Additional check: look for any elements with working/busy text content (more specific)
    try {
      const textBasedBusyElements = Array.from(document.querySelectorAll('.chat-response, .copilot-chat, .interactive-result, .terminal')).filter(el => {
        const text = (el.textContent || '').toLowerCase();
        const isSmallElement = text.length < 500; // Avoid large content blocks
        const hasActiveBusyText = isSmallElement && (
          text.includes('generating...') ||
          text.includes('thinking...') ||
          text.includes('processing...') ||
          text.includes('working...') ||
          text.includes('loading...') ||
          text.includes('executing...') ||
          text.includes('running...')
        );

        // Exclude static/completed text patterns
        const hasStaticText = text.includes('created') ||
                             text.includes('completed') ||
                             text.includes('finished') ||
                             text.includes('done') ||
                             text.includes('success');

        return hasActiveBusyText && !hasStaticText;
      });

      if (textBasedBusyElements.length > 0) {
        log(`📝 Found ${textBasedBusyElements.length} elements with active busy text content`, 'debug');
        for (const el of textBasedBusyElements.slice(0, 3)) { // Check first 3
          const rect = el.getBoundingClientRect();
          const isVisible = rect.width > 0 && rect.height > 0 && el.offsetParent !== null;
          if (isVisible) {
            log(`📝 Active busy text element: "${el.textContent.trim().substring(0, 50)}"`, 'debug');
            log('🟡 === ACTIVE TASK DETECTED (TEXT-BASED) ===', 'warn');
            return true;
          }
        }
      }
    } catch (textError) {
      log('❌ Error in text-based detection:', 'error', textError.message);
    }

    // Final check: Look for actual spinning/loading animations
    try {
      const spinningElements = Array.from(document.querySelectorAll('.codicon-loading, .codicon-sync-spin, [class*="spin"], [class*="rotate"]')).filter(el => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        const isVisible = rect.width > 0 && rect.height > 0 && el.offsetParent !== null;
        const isAnimated = style.animationName !== 'none' || style.animationDuration !== '0s';

        if (isVisible && isAnimated) {
          log(`🌀 Found animated loading element: ${el.className}`, 'debug');
          return true;
        }
        return false;
      });

      if (spinningElements.length > 0) {
        log('🟡 === ACTIVE TASK DETECTED (ANIMATION-BASED) ===', 'warn');
        return true;
      }
    } catch (animationError) {
      log('❌ Error in animation-based detection:', 'error', animationError.message);
    }

    log('🟢 === NO ACTIVE TASK - READY FOR ACTION ===', 'success');
    return false;
  } catch (error) {
    log('❌ Error in isTaskActive:', 'error', error);
    return false;
  }
}

function isInputReady() {
  try {
    log('🔍 Checking for input field...', 'debug');

    const inputSelectors = config.selectors.input;

    for (const selector of inputSelectors) {
      try {
        const inputs = Array.from(document.querySelectorAll(selector));
        log(`📋 Found ${inputs.length} elements for selector: ${selector}`, 'debug');

        for (let i = 0; i < inputs.length; i++) {
          const input = inputs[i];

          // Check if disabled (but be more lenient for chat inputs)
          const isExplicitlyDisabled = input.getAttribute('aria-disabled') === 'true' ||
                                     input.disabled === true ||
                                     input.getAttribute('disabled') === 'disabled' ||
                                     input.getAttribute('readonly') === 'readonly';

          // Check visibility
          const rect = input.getBoundingClientRect();
          const style = window.getComputedStyle(input);
          const isVisible = rect.width > 0 && rect.height > 0 &&
                           input.offsetParent !== null &&
                           style.display !== 'none' &&
                           style.visibility !== 'hidden' &&
                           style.opacity !== '0';

          // Check if it's in a relevant chat context (more permissive)
          const inChatContext = input.closest('.chat-container, .copilot-chat, .interactive-session, .interactive-input, .chat-input, .interactive-input-part, .chat-input-container, .chat-editor-container') ||
                               input.matches('.monaco-editor textarea, [role="textbox"], .interactive-input-editor textarea') ||
                               input.classList.contains('interactive-input-editor');

          // For chat inputs, also check if the parent container suggests it's an input area
          const hasInputContext = input.closest('.editor-container, .input-container, .chat-editor-container, .interactive-input-editor') ||
                                 input.parentElement?.classList.contains('monaco-editor') ||
                                 input.parentElement?.classList.contains('editor-container');

          const isGoodCandidate = !isExplicitlyDisabled && isVisible && (inChatContext || hasInputContext);

          if (isGoodCandidate) {
            const inputInfo = {
              tag: input.tagName,
              type: input.type || 'none',
              placeholder: input.placeholder || '',
              ariaLabel: input.getAttribute('aria-label') || '',
              contentEditable: input.contentEditable,
              selector: selector,
              classes: input.className,
              rect: {width: rect.width, height: rect.height},
              disabled: isExplicitlyDisabled,
              context: input.closest('.interactive-input-part, .chat-input-container, .monaco-editor')?.className || 'none'
            };
            log('✅ Found ready input field:', 'success', inputInfo);
            return input;
          } else {
            const rejectReason = !isVisible ? 'not visible' :
                               isExplicitlyDisabled ? 'explicitly disabled' :
                               (!inChatContext && !hasInputContext) ? 'not in chat context' : 'unknown';
            log(`🟠 Input rejected (${rejectReason}):`, 'debug', {
              tag: input.tagName,
              disabled: isExplicitlyDisabled,
              visible: isVisible,
              inContext: inChatContext || hasInputContext,
              selector: selector,
              classes: input.className.substring(0, 50)
            });
          }
        }
      } catch (selectorError) {
        log(`❌ Selector error for ${selector}:`, 'error', selectorError.message);
        continue;
      }
    }

    // Enhanced fallback: search more broadly for any focusable element in chat areas
    try {
      log('🔍 Enhanced fallback: searching for any chat input elements...', 'debug');

      // First, look specifically in interactive input parts
      const interactiveInputParts = Array.from(document.querySelectorAll('.interactive-input-part, .chat-input-container, .chat-editor-container, .interactive-input-editor'));
      for (const container of interactiveInputParts) {
        const allFocusable = Array.from(container.querySelectorAll('input, textarea, [contenteditable="true"], [tabindex], .monaco-editor textarea'));

        const bestMatch = allFocusable.find(el => {
          const rect = el.getBoundingClientRect();
          const isVisible = rect.width > 0 && rect.height > 0 && el.offsetParent !== null;
          const looksLikeInput = el.tagName === 'TEXTAREA' ||
                                el.tagName === 'INPUT' ||
                                el.contentEditable === 'true' ||
                                el.getAttribute('role') === 'textbox';

          return isVisible && looksLikeInput;
        });

        if (bestMatch) {
          log('✅ Using enhanced fallback input:', 'success', {
            tag: bestMatch.tagName,
            contentEditable: bestMatch.contentEditable,
            role: bestMatch.getAttribute('role'),
            container: container.className
          });
          return bestMatch;
        }
      }

      // Final fallback: any visible input-like element in workbench
      const allFocusable = Array.from(document.querySelectorAll('input, textarea, [contenteditable="true"], [tabindex]'));
      const chatFocusable = allFocusable.filter(el => {
        const rect = el.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0 && el.offsetParent !== null;
        const inChatArea = el.closest('.chat-container, .copilot-chat, .interactive-session, .monaco-workbench, .interactive-input-part');
        const looksLikeInput = el.tagName === 'TEXTAREA' ||
                              el.tagName === 'INPUT' ||
                              el.contentEditable === 'true' ||
                              el.getAttribute('role') === 'textbox';

        return isVisible && inChatArea && looksLikeInput;
      });

      if (chatFocusable.length > 0) {
        log(`📋 Found ${chatFocusable.length} focusable elements in chat areas`, 'debug');
        const bestMatch = chatFocusable[0]; // Take the first one
        log('✅ Using final fallback input:', 'success', {
          tag: bestMatch.tagName,
          contentEditable: bestMatch.contentEditable,
          role: bestMatch.getAttribute('role')
        });
        return bestMatch;
      }
    } catch (fallbackError) {
      log('❌ Error in fallback search:', 'error', fallbackError.message);
    }

    log('❌ No input field found', 'error');
    return null;
  } catch (error) {
    log('❌ Error in isInputReady:', 'error', error);
    return null;
  }
}

async function sendPrompt() {
  try {
    const prompt = config.prompts.continuation;
    const input = isInputReady();

    if (input) {
      const previouslyFocusedElement = document.activeElement;
      log('🧠 Storing previously focused element:', 'debug', previouslyFocusedElement);

      log('📝 Input field found, setting prompt text...', 'info');
      log('📝 Input details:', 'debug', {
        tag: input.tagName,
        type: input.type || 'textarea',
        contentEditable: input.contentEditable,
        classes: input.className
      });

      // Ensure input field is focused
      log('🎯 Ensuring input field is focused...', 'debug');
      
      // Focus parent containers that might contain Monaco editor
      const chatContainer = input.closest('.chat-container, .copilot-chat, .interactive-session, .interactive-input-part');
      if (chatContainer) {
        chatContainer.focus();
        log('✅ Focused chat container', 'debug');
      }
      
      const editorContainer = input.closest('.monaco-editor, .chat-editor-container, .interactive-input-editor');
      if (editorContainer) {
        editorContainer.focus();
        log('✅ Focused editor container', 'debug');
      }
      
      input.focus();
      log('✅ Focused input element', 'debug');
      
      // Try to click the input to ensure proper focus for Monaco
      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
      input.dispatchEvent(clickEvent);
      log('✅ Triggered Monaco focus via click', 'debug');
      
      // Short delay to ensure focus is established
      await new Promise(resolve => setTimeout(resolve, 100));

      log('📝 Setting prompt text in input field...', 'info');

      // Enhanced prompt setting with multiple verification attempts
      let promptSetSuccessfully = false;
      let attemptCount = 0;
      const maxAttempts = config.intervals.maxPromptAttempts;
      
      // Enhanced Monaco editor approach with multiple fallback methods
      if (input.closest('.monaco-editor')) {
        log('🎯 Detected Monaco editor, using enhanced Monaco methods...', 'debug');
        
        // Declare monacoEditor outside the loop for proper scope
        let monacoEditor = null;
        while (!promptSetSuccessfully && attemptCount < maxAttempts) {
          attemptCount++;
          log(`📝 Monaco attempt ${attemptCount}/${maxAttempts}`, 'debug');
          
          try {
            // Look for Monaco editor instance in various ways
            // Method 1: Check if the input element has a Monaco editor attached
            if (input._monacoEditor) {
              monacoEditor = input._monacoEditor;
            }
            // Method 2: Look for editor in parent elements
            else {
              const editorContainer = input.closest('.monaco-editor');
              if (editorContainer && editorContainer._monacoEditor) {
                monacoEditor = editorContainer._monacoEditor;
              }
            }
            
            // Method 3: Try to access global Monaco API
            if (!monacoEditor && typeof window.monaco !== 'undefined') {
              const editors = window.monaco.editor.getEditors?.() || [];
              for (const editor of editors) {
                const editorDomNode = editor.getDomNode();
                if (editorDomNode && (editorDomNode.contains(input) || editorDomNode === input.closest('.monaco-editor'))) {
                  monacoEditor = editor;
                  break;
                }
              }
            }

            if (monacoEditor) {
              // Method A: Direct setValue with verification
              if (attemptCount === 1) {
                monacoEditor.setValue('');
                await new Promise(resolve => setTimeout(resolve, 100));
                monacoEditor.setValue(prompt);
                await new Promise(resolve => setTimeout(resolve, 100));
                
                const editorValue = monacoEditor.getValue();
                if (editorValue === prompt) {
                  log('✅ Set prompt using Monaco setValue method', 'success');
                  promptSetSuccessfully = true;
                } else {
                  log(`⚠️ Monaco setValue verification failed. Expected: ${prompt.length} chars, Got: ${editorValue.length} chars`, 'warn');
                }
              }
              
              // Method B: executeEdits with full range replacement
              if (!promptSetSuccessfully && attemptCount === 2) {
                const model = monacoEditor.getModel();
                if (model) {
                  const fullRange = model.getFullModelRange();
                  monacoEditor.executeEdits('auto-continue', [{
                    range: fullRange,
                    text: prompt
                  }]);
                  await new Promise(resolve => setTimeout(resolve, 100));
                  const finalValue = monacoEditor.getValue();
                  if (finalValue === prompt) {
                    log('✅ Set prompt using Monaco executeEdits method', 'success');
                    promptSetSuccessfully = true;
                  } else {
                    log(`⚠️ Monaco executeEdits verification failed. Expected: ${prompt.length} chars, Got: ${finalValue.length} chars`, 'warn');
                  }
                }
              }
              
              // Method C: Clear and insert using composition events
              if (!promptSetSuccessfully && attemptCount === 3) {
                monacoEditor.setValue('');
                await new Promise(resolve => setTimeout(resolve, 100));
                
              // Trigger composition events to simulate typing
              const model = monacoEditor.getModel();
              const position = { lineNumber: 1, column: 1 };
              let range;
              if (typeof window.monaco !== 'undefined' && typeof window.monaco.Range === 'function') {
                range = new window.monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column);
              } else if (typeof monaco !== 'undefined' && typeof monaco.Range === 'function') {
                range = new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column);
              } else {
                log('❌ Monaco.Range constructor not available', 'error');
                range = null;
              }
              if (range) {
                monacoEditor.executeEdits('auto-continue', [{
                  range: range,
                  text: prompt
                }]);
                // Force editor to update
                monacoEditor.focus();
                await new Promise(resolve => setTimeout(resolve, 150));
                
                const finalValue = monacoEditor.getValue();
                if (finalValue === prompt) {
                  log('✅ Set prompt using Monaco composition method', 'success');
                  promptSetSuccessfully = true;
                } else {
                  log(`⚠️ Monaco composition method failed. Expected: ${prompt.length} chars, Got: ${finalValue.length} chars`, 'warn');
                }
              }
              log('⚠️ Monaco instance not found, will use clipboard fallback method', 'warn');
              break; // Exit Monaco attempts and use clipboard
            }
            }
          } catch (monacoError) {
            log(`⚠️ Monaco editor attempt ${attemptCount} failed:`, 'warn', monacoError.message);
          }
        }
        // If Monaco editor was not found after all attempts, log the warning and run clipboard fallback here
        if (!monacoEditor) {
          log('⚠️ Monaco instance not found, will use clipboard fallback method', 'warn');
          log('🔄 Using enhanced clipboard method for Monaco editor...', 'debug');
          try {
            await navigator.clipboard.writeText(prompt);
            log('✅ Copied full prompt to clipboard', 'debug');
            
            // Multiple clipboard paste attempts
            for (let pasteAttempt = 1; pasteAttempt <= 2; pasteAttempt++) {
              input.focus();
              await new Promise(resolve => setTimeout(resolve, 100));
              
              // Select all existing text
              document.execCommand('selectAll', false, null);
              await new Promise(resolve => setTimeout(resolve, 100));
              
              // Paste using different methods
              if (pasteAttempt === 1) {
                const pasteSuccess = document.execCommand('paste', false, null);
                if (pasteSuccess) {
                  log('✅ Pasted prompt from clipboard using execCommand', 'success');
                } else {
                  log('⚠️ execCommand paste failed, trying navigator.clipboard', 'warn');
                  continue;
                }
              } else {
                try {
                  const clipboardText = await navigator.clipboard.readText();
                  if (clipboardText === prompt) {
                    // Simulate paste event
                    const pasteEvent = new ClipboardEvent('paste', {
                      clipboardData: new DataTransfer()
                    });
                    pasteEvent.clipboardData.setData('text/plain', prompt);
                    input.dispatchEvent(pasteEvent);
                    log('✅ Pasted prompt using ClipboardEvent', 'success');
                  }
                } catch (clipboardReadError) {
                  log('⚠️ Clipboard read failed:', 'warn', clipboardReadError.message);
                }
              }
              
              // Verify paste result
              await new Promise(resolve => setTimeout(resolve, 200));
              const currentValue = input.value || input.textContent || input.innerText || '';
              if (currentValue === prompt || currentValue.includes(prompt)) {
                promptSetSuccessfully = true;
                break;
              }
            }
          } catch (clipboardError) {
            log('⚠️ Clipboard operation failed:', 'warn', clipboardError.message);
          }
        }
      }
        log('🔄 Using enhanced fallback text setting methods...', 'debug');
        
        // Method 1: Enhanced character-by-character typing simulation
        if (input.closest('.monaco-editor, .interactive-input-editor')) {
          log('📝 Using enhanced character-by-character typing simulation...', 'debug');
          
          for (let typingAttempt = 1; typingAttempt <= 2; typingAttempt++) {
            try {
              // Clear existing content first
              input.focus();
              await new Promise(resolve => setTimeout(resolve, 100));
              
              // Select all and delete
              document.execCommand('selectAll', false, null);
              await new Promise(resolve => setTimeout(resolve, 50));
              document.execCommand('delete', false, null);
              await new Promise(resolve => setTimeout(resolve, 50));
              
              // Type character by character with enhanced method
              if (typingAttempt === 1) {
                // Method 1A: Using insertText with batching
                const batchSize = 10;
                for (let i = 0; i < prompt.length; i += batchSize) {
                  const batch = prompt.substring(i, i + batchSize);
                  const insertSuccess = document.execCommand('insertText', false, batch);
                  if (!insertSuccess) {
                    // Fallback to individual character events
                    for (const char of batch) {
                      const inputEvent = new InputEvent('input', {
                        inputType: 'insertText',
                        data: char,
                        bubbles: true,
                        cancelable: true
                      });
                      input.dispatchEvent(inputEvent);
                    }
                  }
                  await new Promise(resolve => setTimeout(resolve, 20));
                }
              } else {
                // Method 1B: Using composition events
                const compositionStart = new CompositionEvent('compositionstart', { bubbles: true });
                const compositionUpdate = new CompositionEvent('compositionupdate', { bubbles: true, data: prompt });
                const compositionEnd = new CompositionEvent('compositionend', { bubbles: true, data: prompt });
                
                input.dispatchEvent(compositionStart);
                await new Promise(resolve => setTimeout(resolve, 50));
                input.dispatchEvent(compositionUpdate);
                await new Promise(resolve => setTimeout(resolve, 50));
                input.dispatchEvent(compositionEnd);
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Also trigger input event with full data
                const inputEvent = new InputEvent('input', {
                  inputType: 'insertCompositionText',
                  data: prompt,
                  bubbles: true,
                  cancelable: true
                });
                input.dispatchEvent(inputEvent);
              }
              
              // Verify the result
              await new Promise(resolve => setTimeout(resolve, 200));
              const finalValue = input.value || input.textContent || input.innerText || '';
              if (finalValue === prompt || (finalValue.includes(prompt.substring(0, 50)) && finalValue.length >= prompt.length * 0.9)) {
                log(`✅ Character-by-character typing successful (attempt ${typingAttempt})`, 'success');
                promptSetSuccessfully = true;
                break;
              } else {
                log(`⚠️ Typing attempt ${typingAttempt} verification failed. Expected: ${prompt.length} chars, Got: ${finalValue.length} chars`, 'warn');
              }
            } catch (typingError) {
              log(`⚠️ Character typing simulation attempt ${typingAttempt} failed:`, 'warn', typingError.message);
            }
          }
        }
        
        // Method 2: Enhanced contenteditable handling
        if (!promptSetSuccessfully && (input.contentEditable === 'true' || input.getAttribute('contenteditable') === 'true')) {
          log('📝 Using enhanced contenteditable element handling...', 'debug');
          
          // Clear and set content using multiple approaches
          input.textContent = '';
          input.innerHTML = '';
          await new Promise(resolve => setTimeout(resolve, 50));
          
          // Method 2A: Direct content setting
          input.textContent = prompt;
          input.innerHTML = prompt.replace(/\n/g, '<br>');
          
          // Method 2B: Using Range API for more precise control
          const range = document.createRange();
          const selection = window.getSelection();
          selection.removeAllRanges();
          range.selectNodeContents(input);
          selection.addRange(range);
          
          // Insert text using different methods
          try {
            document.execCommand('insertText', false, prompt);
          } catch (e) {
            // Fallback to direct manipulation
            const textNode = document.createTextNode(prompt);
            input.appendChild(textNode);
          }
          
          // Trigger comprehensive events
          const events = ['input', 'change', 'keyup', 'textInput'];
          events.forEach(eventType => {
            const event = eventType === 'textInput' ? 
              new TextEvent('textInput', { data: prompt, bubbles: true }) :
              new Event(eventType, { bubbles: true });
            input.dispatchEvent(event);
          });
          
          await new Promise(resolve => setTimeout(resolve, 100));
          const finalValue = input.textContent || input.innerText || '';
          if (finalValue === prompt) {
            log('✅ Enhanced contenteditable handling successful', 'success');
            promptSetSuccessfully = true;
          }
        }
        
        // Method 3: Enhanced textarea/input handling
        else if (!promptSetSuccessfully && (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT')) {
          log('📝 Using enhanced textarea/input element handling...', 'debug');
          
          // Clear and set value using multiple approaches
          input.value = '';
          await new Promise(resolve => setTimeout(resolve, 50));
          
          // Method 3A: Direct value setting with verification
          input.value = prompt;
          
          // Method 3B: Using setSelectionRange for more control
          input.setSelectionRange(0, 0);
          input.setSelectionRange(0, input.value.length);
          document.execCommand('insertText', false, prompt);
          
          // Trigger comprehensive events
          const events = ['input', 'change', 'keyup', 'paste'];
          events.forEach(eventType => {
            const event = new Event(eventType, { bubbles: true });
            input.dispatchEvent(event);
          });
          
          await new Promise(resolve => setTimeout(resolve, 100));
          if (input.value === prompt) {
            log('✅ Enhanced textarea/input handling successful', 'success');
            promptSetSuccessfully = true;
          }
        }
        
        // Method 4: Enhanced insertText with multiple retry attempts  
        else if (!promptSetSuccessfully) {
          log('📝 Using enhanced insertText with retry logic...', 'debug');
          
          for (let insertAttempt = 1; insertAttempt <= 3; insertAttempt++) {
            try {
              // Clear existing content
              input.focus();
              await new Promise(resolve => setTimeout(resolve, 100));
              
              // Select all and prepare for insert
              document.execCommand('selectAll', false, null);
              await new Promise(resolve => setTimeout(resolve, 50));
              
              // Try different insert methods
              if (insertAttempt === 1) {
                // Method 4A: Single insertText command
                const success = document.execCommand('insertText', false, prompt);
                if (success) {
                  log('✅ Prompt set using single insertText command', 'success');
                }
              } else if (insertAttempt === 2) {
                // Method 4B: Chunked insertText
                const chunkSize = 50;
                for (let i = 0; i < prompt.length; i += chunkSize) {
                  const chunk = prompt.substring(i, i + chunkSize);
                  document.execCommand('insertText', false, chunk);
                  await new Promise(resolve => setTimeout(resolve, 10));
                }
              } else {
                // Method 4C: Keyboard simulation
                for (const char of prompt) {
                  const keyboardEvent = new KeyboardEvent('keydown', {
                    key: char,
                    char: char,
                    bubbles: true,
                    cancelable: true
                  });
                  input.dispatchEvent(keyboardEvent);
                  
                  const inputEvent = new InputEvent('input', {
                    inputType: 'insertText',
                    data: char,
                    bubbles: true,
                    cancelable: true
                  });
                  input.dispatchEvent(inputEvent);
                  
                  if (char === ' ' || char === '\n') {
                    await new Promise(resolve => setTimeout(resolve, 5));
                  }
                }
              }
              
              // Verify the result
              await new Promise(resolve => setTimeout(resolve, 200));
              const currentValue = input.value || input.textContent || input.innerText || '';
              if (currentValue === prompt || (currentValue.includes(prompt.substring(0, 50)) && currentValue.length >= prompt.length * 0.85)) {
                log(`✅ Enhanced insertText successful (attempt ${insertAttempt})`, 'success');
                promptSetSuccessfully = true;
                break;
              } else {
                log(`⚠️ InsertText attempt ${insertAttempt} verification failed. Expected: ${prompt.length} chars, Got: ${currentValue.length} chars`, 'warn');
              }
            } catch (insertError) {
              log(`⚠️ Enhanced insertText attempt ${insertAttempt} failed:`, 'warn', insertError.message);
            }
          }
        }
      }

      // Comprehensive verification and debugging
      await new Promise(resolve => setTimeout(resolve, 300)); // Allow time for all operations to complete
      
      const currentValue = input.value || input.textContent || input.innerText || '';
      const promptLength = prompt.length;
      const currentLength = currentValue.length;
      const matchesStart = currentValue.startsWith(prompt.substring(0, Math.min(50, promptLength)));
      const matchesFull = currentValue === prompt;
      const matchesSubstantial = currentValue.includes(prompt.substring(0, Math.min(100, promptLength))) && currentLength >= promptLength * 0.85;
      
      log('🔍 Comprehensive verification:', 'debug', {
        'Expected length': promptLength,
        'Actual length': currentLength,
        'Length ratio': (currentLength / promptLength).toFixed(2),
        'Matches start (50 chars)': matchesStart,
        'Matches full prompt': matchesFull,
        'Matches substantial content': matchesSubstantial,
        'Expected prompt preview': prompt.substring(0, 150) + (prompt.length > 150 ? '...' : ''),
        'Actual value preview': currentValue.substring(0, 150) + (currentValue.length > 150 ? '...' : ''),
        'Prompt set successfully flag': promptSetSuccessfully
      });
      
      // Additional detailed logging for debugging
      if (!matchesFull) {
        log('🔍 Detailed mismatch analysis:', 'debug', {
          'Expected prompt': prompt,
          'Actual value': currentValue,
          'First difference at index': (() => {
            for (let i = 0; i < Math.min(prompt.length, currentValue.length); i++) {
              if (prompt[i] !== currentValue[i]) {
                return i;
              }
            }
            return -1;
          })(),
          'Missing characters': prompt.length - currentValue.length,
          'Starts with expected': currentValue.startsWith(prompt.substring(0, 20)),
          'Ends with expected': currentValue.endsWith(prompt.substring(prompt.length - 20))
        });
      }
      
      // Final success determination with multiple criteria
      const finalSuccess = matchesFull || (promptSetSuccessfully && matchesSubstantial);
      log(`🔍 Final verification - prompt set correctly: ${finalSuccess}`, finalSuccess ? 'success' : 'error');
      
      if (!finalSuccess) {
        log('❌ Failed to set prompt text properly - attempting one final recovery', 'error');
        
        // One final attempt using a different approach
        try {
          input.focus();
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Try setting via multiple simultaneous methods
          if (input.value !== undefined) input.value = prompt;
          if (input.textContent !== undefined) input.textContent = prompt;
          if (input.innerText !== undefined) input.innerText = prompt;
          
          // Trigger all possible events
          const allEvents = ['input', 'change', 'keyup', 'keydown', 'paste', 'textInput'];
          allEvents.forEach(eventType => {
            try {
              const event = new Event(eventType, { bubbles: true, cancelable: true });
              input.dispatchEvent(event);
            } catch (e) {
              // Ignore event creation errors
            }
          });
          
          await new Promise(resolve => setTimeout(resolve, 200));
          const recoveryValue = input.value || input.textContent || input.innerText || '';
          if (recoveryValue === prompt) {
            log('✅ Recovery attempt successful', 'success');
            promptSetSuccessfully = true;
          } else {
            log('❌ Recovery attempt failed', 'error', {
              method: 'final recovery',
              attemptedMethods: [
                'Monaco setValue',
                'Monaco executeEdits',
                'Clipboard paste',
                'Character-by-character typing',
                'Contenteditable direct set',
                'Textarea/input direct set',
                'insertText with retry',
                'final recovery (direct set and events)'
              ],
              reason: 'Prompt text did not match after all methods',
              expected: prompt,
              actual: recoveryValue,
              lengthExpected: prompt.length,
              lengthActual: recoveryValue.length
            });
            return false;
          }
        } catch (recoveryError) {
          log('❌ Recovery attempt error:', 'error', {
            method: 'final recovery',
            attemptedMethods: [
              'Monaco setValue',
              'Monaco executeEdits',
              'Clipboard paste',
              'Character-by-character typing',
              'Contenteditable direct set',
              'Textarea/input direct set',
              'insertText with retry',
              'final recovery (direct set and events)'
            ],
            error: recoveryError.message
          });
          return false;
        }
      }

      // Try to find and click send button
      log('🔍 Looking for send button...', 'debug');
      
      const sendButtonSelectors = config.selectors.sendButton;

      let sendButtonFound = false;
      for (const selector of sendButtonSelectors) {
        const buttons = Array.from(document.querySelectorAll(selector));
        log(`🔍 Found ${buttons.length} candidates for selector: ${selector}`, 'debug');
        
        const sendButton = buttons.find(btn => {
          const rect = btn.getBoundingClientRect();
          const isVisible = rect.width > 0 && rect.height > 0 && btn.offsetParent !== null;
          const isEnabled = !btn.disabled && btn.getAttribute('aria-disabled') !== 'true';
          return isVisible && isEnabled;
        });
        
        if (sendButton) {
          log('🎯 Found send button, clicking...', 'info');
          sendButton.click();
          sendButtonFound = true;
          break;
        }
      }

      // If no send button found, use Enter key
      if (!sendButtonFound) {
        log('⌨️ No send button found, trying multiple Enter key approaches...', 'debug');
        
        input.focus();
        
        // Try multiple Enter key approaches
        const enterEvents = [
          new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }),
          new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }),
          new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true })
        ];
        
        for (const event of enterEvents) {
          input.dispatchEvent(event);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // Also try on parent containers
        const containers = [
          input.closest('.chat-editor-container'),
          input.closest('.interactive-input-part'),
          input.closest('.monaco-editor')
        ].filter(Boolean);
        
        for (const container of containers) {
          container.dispatchEvent(new KeyboardEvent('keydown', { 
            key: 'Enter', 
            code: 'Enter', 
            keyCode: 13, 
            which: 13, 
            bubbles: true, 
            cancelable: true 
          }));
        }
        
        log('✅ Prompt sent via Enter key combinations', 'success');
      }

      // Restore focus to the previously active element
      if (previouslyFocusedElement && typeof previouslyFocusedElement.focus === 'function') {
        log('↩️ Restoring focus to previous element:', previouslyFocusedElement);
        previouslyFocusedElement.focus();
        log('✅ Focus restored successfully.', 'debug');
      }
      
      return true;
    } else {
      log('❌ No input field available for sending prompt', 'error');
      return false;
    }
  } catch (error) {
    log('❌ Error in sendPrompt:', 'error', error);
    return false;
  }
}

// NOTE: findAndClickButton() has been refactored into clickButton(selector) and clickButtonByText(buttonName)
// as per the Action Functions section in vscode_auto_continue_architecture.md

// Action function: Generic button clicking function per architecture specification
function clickButton(selector) {
  try {
    const buttons = Array.from(document.querySelectorAll(selector));
    
    if (buttons.length === 0) {
      log(`🔍 No buttons found for selector: ${selector}`, 'debug');
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
      log(`🔍 No clickable button found for selector: ${selector}`, 'debug');
      return false;
    }

    // Check cooldown
    const now = Date.now();
    if (now - state.lastClick < config.intervals.buttonCooldown) {
      log(`⏱️ Button cooldown active, skipping click (${now - state.lastClick}ms < ${config.intervals.buttonCooldown}ms)`, 'debug');
      return false;
    }

    try {
      const buttonText = (button.textContent || button.getAttribute('aria-label') || button.getAttribute('title') || '').trim();

      // Exclude specific button patterns that should not be auto-clicked
      const excludedPatterns = [
        'go back',
        'keep all edits'
      ];
      
      const lowerButtonText = buttonText.toLowerCase();
      const isExcluded = excludedPatterns.some(pattern => lowerButtonText.includes(pattern));
      if (isExcluded) {
        log(`🚫 Skipping excluded button by selector: "${buttonText}"`, 'debug');
        return false;
      }

      // Final validation before clicking
      const rect = button.getBoundingClientRect();
      const isStillVisible = rect.width > 0 && rect.height > 0 && button.offsetParent !== null;
      const isStillEnabled = !button.disabled && button.getAttribute('aria-disabled') !== 'true';

      if (!isStillVisible || !isStillEnabled) {
        log(`🚫 Button no longer clickable: ${buttonText}`, 'debug');
        return false;
      }

      // Mark as clicked to prevent duplicate clicks
      button.setAttribute('data-auto-continue-clicked', 'true');
      
      // Scroll into view
      button.scrollIntoView({ block: 'center', inline: 'center' });

      // Create and dispatch click event
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      clickEvent.autoContinueSource = true;

      const clickResult = button.dispatchEvent(clickEvent);

      if (clickResult) {
        state.lastClick = now;
        state.retryCount = 0;
        log(`🎯 Successfully clicked button: "${buttonText}" [${selector}]`, 'success');
        return true;
      } else {
        log(`❌ Click event failed for button: "${buttonText}"`, 'warn');
        return false;
      }
    } catch (clickError) {
      log(`❌ Error clicking button with selector ${selector}:`, 'error', clickError);
      return false;
    }
  } catch (error) {
    log(`❌ Critical error in clickButton(${selector}):`, 'error', error);
    return false;
  }
}

// Main Loop function as per architecture specification
async function mainLoop() {
  // Check if the script is in the running state. If not, exit.
  if (!state.isRunning) {
    return;
  }

  if (state.isProcessing) {
    return;
  }

  state.isProcessing = true;
  const checkId = Math.random().toString(36).substr(2, 6);

  log(`[${checkId}] 🔄 ===== MAIN LOOP ITERATION =====`, 'info');

  try {
    // Periodic cleanup of clicked button markers (every ~30 seconds)
    state.cleanupCounter++;
    if (state.cleanupCounter >= 30) { // ~30 seconds at 1-second intervals
      try {
        const clickedButtons = document.querySelectorAll('[data-auto-continue-clicked="true"]');
        if (clickedButtons.length > 0) {
          clickedButtons.forEach(btn => btn.removeAttribute('data-auto-continue-clicked'));
          log(`🧹 Cleaned up ${clickedButtons.length} button markers`, 'debug');
        }
      } catch (e) {
        log('⚠️ Error during cleanup:', 'warn', e);
      }
      state.cleanupCounter = 0;
    }

    // 1. Call checkForButtons() to find and click any actionable buttons
    const buttonClicked = checkForButtons();
    if (buttonClicked) {
      // If a button is clicked, reset the idle timer and exit the current loop iteration
      state.lastActivityTime = new Date();
      log(`[${checkId}] ✅ Button clicked, resetting idle timer and exiting loop iteration`, 'success');
      return;
    }

    // 2. If no buttons are found, call checkForIdle() to see if the AI has stalled
    const isIdle = checkForIdle();
    if (!isIdle) {
      log(`[${checkId}] 🟡 AI is still active, waiting for completion`, 'debug');
      // Start task tracking if AI is active and we're not already tracking
      if (!state.currentTaskStartTime) {
        startTaskTracking();
      }
      return;
    }

    // AI is now idle - complete task tracking if we were tracking
    if (state.currentTaskStartTime) {
      const taskDuration = completeTaskTracking();
      log(`[${checkId}] 📊 Completed task tracking: ${Math.round(taskDuration / 1000)}s`, 'info');
    }

    // 3. If the AI is idle, check if the chat input field is empty to avoid interfering with user input
    const inputElement = isInputReady();
    if (!inputElement) {
      log(`[${checkId}] ❌ Input field not ready or has user content`, 'warn');
      return;
    }

    // 4. If the input field is empty, call sendContinuationPrompt()
    const promptSent = await sendContinuationPrompt();
    if (promptSent) {
      state.lastActivityTime = new Date();
      // Start tracking the new task that we just initiated
      startTaskTracking();
      log(`[${checkId}] ✅ Continuation prompt sent successfully, started new task tracking`, 'success');
    }

    // 5. Call autoStopLogic() to check if the script should terminate itself
    const shouldStop = autoStopLogic();
    if (shouldStop) {
      log(`[${checkId}] 🛑 Auto-stop logic triggered, stopping script`, 'warn');
      autoContinue.stop();
      return;
    }

  } catch (error) {
    log(`[${checkId}] ❌ Error in mainLoop:`, 'error', error);
    state.retryCount++;
  } finally {
    state.isProcessing = false;
    log(`[${checkId}] 🏁 ===== MAIN LOOP COMPLETE =====`, 'debug');
  }
}

// Action function: Check for and click actionable buttons
function checkForButtons() {
  log('🔍 Checking for actionable buttons...', 'debug');
  
  try {
    // Check each button type in priority order
    for (const buttonConfig of BUTTONS_TO_CLICK) {
      log(`🔍 Checking for '${buttonConfig.name}' buttons...`, 'debug');
      
      // Try each selector for this button type
      for (const selector of buttonConfig.selectors) {
        const clicked = clickButton(selector);
        if (clicked) {
          log(`✅ Successfully clicked '${buttonConfig.name}' button`, 'info');
          return true;
        }
      }
      
      // Fallback: text-based matching for this button type
      const textMatchClicked = clickButtonByText(buttonConfig.name);
      if (textMatchClicked) {
        log(`✅ Successfully clicked '${buttonConfig.name}' button (text match)`, 'info');
        return true;
      }
    }
    
    log('🔍 No actionable buttons found', 'debug');
    return false;
  } catch (error) {
    log('❌ Error in checkForButtons:', 'error', error);
    return false;
  }
}

// Action function: Check if AI is idle (stalled)
function checkForIdle() {
  log('🔍 Checking for idle state...', 'debug');
  
  try {
    // Check if there's an active task running
    const hasActiveTask = isTaskActive();
    if (hasActiveTask) {
      // Update lastActivityTime since we just detected AI activity
      state.lastActivityTime = new Date();
      log('🟡 Active task detected, AI is not idle - updated lastActivityTime', 'debug');
      return false;
    }

    // Check if enough time has passed since last activity for idle detection
    const now = new Date();
    const timeSinceLastActivity = now - state.lastActivityTime;
    const idleThreshold = config.intervals.checkInterval * 2; // 2x check interval as idle threshold
    
    const isIdle = timeSinceLastActivity > idleThreshold;
    log(`${isIdle ? '🟢' : '🟡'} Idle check: ${timeSinceLastActivity}ms since last activity (threshold: ${idleThreshold}ms)`, 'debug');
    
    return isIdle;
  } catch (error) {
    log('❌ Error in checkForIdle:', 'error', error);
    return true; // Assume idle on error to allow continuation
  }
}

// Action function: Send continuation prompt
async function sendContinuationPrompt() {
  log('📝 Sending continuation prompt...', 'info');
  log('📝 Full prompt to send:', 'debug', {
    'Prompt': config.prompts.continuation,
    'Length': config.prompts.continuation.length,
    'Preview': config.prompts.continuation.substring(0, 100) + (config.prompts.continuation.length > 100 ? '...' : '')
  });
  
  try {
    const result = await sendPrompt();
    log('📝 Continuation prompt sending result:', 'info', result);
    return result;
  } catch (error) {
    log('❌ Error in sendContinuationPrompt:', 'error', error);
    return false;
  }
}

// Helper function: Start tracking a new task
function startTaskTracking() {
  state.currentTaskStartTime = new Date();
  log('📊 Started tracking new task at:', 'debug', state.currentTaskStartTime.toISOString());
}

// Helper function: Complete current task and add to history
function completeTaskTracking() {
  if (state.currentTaskStartTime) {
    const completionTime = new Date();
    const taskDuration = completionTime - state.currentTaskStartTime;
    
    // Add to task history
    state.taskHistory.push({
      startTime: state.currentTaskStartTime,
      endTime: completionTime,
      duration: taskDuration
    });
    
    // Keep only the last N tasks
    if (state.taskHistory.length > state.maxTaskHistorySize) {
      state.taskHistory = state.taskHistory.slice(-state.maxTaskHistorySize);
    }
    
    // Update shortTaskCount for consecutive fast tasks tracking
    const shortTaskThreshold = config.intervals.fastTaskThreshold; // Use configurable threshold
    if (taskDuration < shortTaskThreshold) {
      state.shortTaskCount++;
      log(`📊 Task completed in ${taskDuration}ms (FAST). Consecutive short tasks: ${state.shortTaskCount}`, 'info');
    } else {
      // Reset counter if this task was not fast
      if (state.shortTaskCount > 0) {
        log(`📊 Task completed in ${taskDuration}ms (NORMAL). Resetting short task counter (was ${state.shortTaskCount})`, 'info');
        state.shortTaskCount = 0;
      } else {
        log(`📊 Task completed in ${taskDuration}ms (NORMAL). Short task counter remains 0`, 'info');
      }
    }
    
    log(`📊 Task tracking summary: duration=${Math.round(taskDuration/1000)}s, history_size=${state.taskHistory.length}, short_task_count=${state.shortTaskCount}`, 'info');
    state.currentTaskStartTime = null;
    
    return taskDuration;
  }
  return null;
}

// Action function: Auto-stop logic based on task completion heuristics
function autoStopLogic() {
  log('🤖 Checking auto-stop logic...', 'debug');
  
  try {
    // Simple heuristic: check if we've had too many retries without progress
    if (state.retryCount > config.intervals.maxRetries * 2) {
      log(`🛑 Too many retries (${state.retryCount}) without progress, triggering auto-stop`, 'warn');
      return true;
    }

    // Enhanced auto-stop using shortTaskCount: stop if we have consecutive fast tasks
    const consecutiveFastTaskThreshold = config.intervals.maxConsecutiveFastTasks;
    if (state.shortTaskCount >= consecutiveFastTaskThreshold) {
      log('🛑 AUTO-STOP TRIGGERED: Detected ' + state.shortTaskCount + ' consecutive fast tasks (threshold: ' + consecutiveFastTaskThreshold + ')', 'warn');
      log('📊 Fast task detection indicates AI may be completing trivial tasks or stuck in a loop', 'info');
      return true;
    }

    // Fallback auto-stop heuristic: check if last 3 tasks were all completed under threshold
    if (state.taskHistory.length >= 3) {
      const recentTasks = state.taskHistory.slice(-3); // Get last 3 tasks
      const maxTaskDuration = config.intervals.fastTaskThreshold; // Use configurable threshold
      
      const allTasksWereShort = recentTasks.every(task => task.duration < maxTaskDuration);
      const totalTime = recentTasks.reduce((sum, task) => sum + task.duration, 0);
      const maxTotalTime = 60000; // 1 minute in milliseconds
      
      log('📊 Auto-stop analysis:', 'debug', {
        shortTaskCount: state.shortTaskCount,
        recentTaskCount: recentTasks.length,
        taskDurations: recentTasks.map(t => `${Math.round(t.duration / 1000)}s`),
        allTasksUnder20s: allTasksWereShort,
        totalTime: `${Math.round(totalTime / 1000)}s`,
        totalUnder60s: totalTime < maxTotalTime
      });
      
      if (allTasksWereShort && totalTime < maxTotalTime) {
        log('🛑 AUTO-STOP TRIGGERED: Last 3 tasks completed rapidly (all under ' + Math.round(maxTaskDuration/1000) + 's each, total under 60s)', 'warn');
        log('📊 Task completion summary:', 'info', recentTasks.map((task, i) => 
          `Task ${i+1}: ${Math.round(task.duration / 1000)}s (${task.startTime.toLocaleTimeString()} - ${task.endTime.toLocaleTimeString()})`
        ));
        return true;
      }
    } else {
      log(`📊 Not enough task history for fallback auto-stop analysis (${state.taskHistory.length}/3 tasks)`, 'debug');
    }
    
    log(`✅ Auto-stop conditions not met (short_tasks: ${state.shortTaskCount}/${consecutiveFastTaskThreshold}), continuing operation`, 'debug');
    return false;
  } catch (error) {
    log('❌ Error in autoStopLogic:', 'error', error);
    return false; // Don't stop on error
  }
}

function init() {
  log('=== VS Code Copilot Auto-Continue v2.3 STARTING ===', 'info');

  try {
    // Clean up existing automation if present
    if (window.autoContinue && window.autoContinue.stop) {
      window.autoContinue.stop();
    }

    // Set up main interval
    state.timerId = setInterval(() => {
      mainLoop().catch(console.error);
    }, CHECK_INTERVAL);

    // Set initial state
    state.isRunning = true;
    // Initialize lastActivityTime to current time for proper idle detection
    state.lastActivityTime = new Date();
    log('🔄 Initialized lastActivityTime:', 'debug', state.lastActivityTime.toISOString());

    // Check for initial AI activity and update lastActivityTime if found
    const hasInitialActivity = isTaskActive();
    if (hasInitialActivity) {
      state.lastActivityTime = new Date();
      log('🔄 Initial AI activity detected, updated lastActivityTime', 'debug');
    }
    
    // Start the main loop immediately
    mainLoop().catch(console.error);

    log('🚀 Auto-Continue is running!', 'success');
    log('Commands: autoContinue.stop()', 'info');

    return true;
  } catch (error) {
    log('❌ Error initializing:', 'error', error);
    return false;
  }
}

// Enhanced public API for debugging and control
window.autoContinue = {
  // Start the auto-continue process
  start() {
    log('🚀 Starting auto-continue via public API', 'info');
    startAutoContinue();
  },
  
  // Stop the auto-continue process
  stop() {
    log('🛑 Stopping auto-continue via public API', 'info');
    stopAutoContinue();
  },
  
  // Enable debug mode for detailed logging
  enableDebug() {
    state.debugMode = true;
    log('🐛 Debug mode enabled', 'info');
    log('📝 Current prompt configuration:', 'debug', {
      'Prompt': config.prompts.continuation,
      'Length': config.prompts.continuation.length,
      'Full text': config.prompts.continuation
    });
  },
  
  // Disable debug mode
  disableDebug() {
    state.debugMode = false;
    log('🐛 Debug mode disabled', 'info');
  },
  
  // Get current state information
  getStatus() {
    return {
      isRunning: state.isRunning,
      debugMode: state.debugMode,
      promptLength: config.prompts.continuation.length,
      lastActivityTime: state.lastActivityTime,
      shortTaskCount: state.shortTaskCount
    };
  },
  
  // Test prompt sending (for debugging)
  async testPrompt() {
    log('🧪 Testing prompt sending...', 'info');
    const result = await sendContinuationPrompt();
    log('🧪 Test prompt result:', 'info', result);
    return result;
  },
  
  // Get the current prompt text
  getCurrentPrompt() {
    return config.prompts.continuation;
  },
  
  // Set a custom prompt (for testing)
  setPrompt(newPrompt) {
    if (typeof newPrompt === 'string' && newPrompt.trim().length > 0) {
      config.prompts.continuation = newPrompt;
      log('📝 Custom prompt set:', 'info', {
        'New prompt': newPrompt,
        'Length': newPrompt.length
      });
      return true;
    } else {
      log('❌ Invalid prompt provided', 'error');
      return false;
    }
  },
  
  // Reset to default prompt
  resetPrompt() {
    config.prompts.continuation = "Continue executing the current task if it exists or do tasks on the dartboard iteratively until no uncompleted tasks left. Use build_run_rules, general, product_requirements_design instructions.md files.";
    log('📝 Prompt reset to default', 'info');
  }
};

// Legacy support
window.autoContinue.stop = window.autoContinue.stop;

// Initialize debug mode if needed
if (typeof window.autoContinueDebug !== 'undefined' && window.autoContinueDebug) {
  window.autoContinue.enableDebug();
}

log('✅ Auto-continue script loaded successfully', 'info');
log('📝 Available commands: autoContinue.start(), autoContinue.stop(), autoContinue.enableDebug(), autoContinue.testPrompt()', 'info');
