/**
 * VS Code Copilot Auto-Continue Script v2.3
 * 
 * Automates VS Code Copilot Chat by clicking action buttons and sending prompts.
 * 
 * Commands: autoContinue.stop(), autoContinue.restart(), autoContinue.debug()
 */

// Configuration
const BUTTON_COOLDOWN_MS = 3000;
const CHECK_INTERVAL = 5000;
const MAX_RETRIES = 3;

// State tracking
let lastClick = Date.now();
let isProcessing = false;
let intervalId = null;
let observer = null;
let retryCount = 0;
let debugMode = false;

// Buttons to automatically click
const BUTTONS_TO_CLICK = [
  {
    name: 'Continue',
    selectors: [
      'button[aria-label*="Continue"]',
      'button[title*="Continue"]',
      'a.monaco-button[role="button"]',
      'button.monaco-button',
      '.action-item button[title*="Continue"]',
      '.chat-response-controls button',
      '.interactive-session .monaco-button'
    ]
  },
  {
    name: 'Try Again',
    selectors: [
      'button[aria-label*="Try"]',
      'button[title*="Try"]',
      'button[aria-label*="Retry"]',
      'button[title*="Retry"]',
      'a.monaco-button[role="button"]',
      'button.monaco-button',
      '.action-item button[title*="Try"]'
    ]
  },
  {
    name: 'Keep',
    selectors: [
      'button[aria-label*="Keep"]',
      'button[title*="Keep"]',
      'button[aria-label*="Accept"]',
      'a.action-label[role="button"]',
      'button.monaco-button',
      '.action-item button[title*="Keep"]'
    ]
  },
  {
    name: 'Accept',
    selectors: [
      'button[aria-label*="Accept"]',
      'button[title*="Accept"]',
      'button[aria-label*="Apply"]',
      'button.monaco-button',
      '.action-item button[title*="Accept"]'
    ]
  }
];

function isTaskActive() {
  console.log('%c[auto] 🔍 === ACTIVE TASK CHECK STARTED ===', 'font-weight: bold; color: #2196F3;');
  
  try {
    // Enhanced active task indicators based on VS Code Copilot Chat source analysis
    const activeIndicators = [
      // Loading indicators
      '.codicon-loading:not([style*="display: none"])',
      '.codicon-sync-spin:not([style*="display: none"])',
      '.monaco-progress-container:not([style*="display: none"])',
      '.progress-bar:not([style*="display: none"])',
      
      // VS Code specific chat elements indicating activity
      '.interactive-session .monaco-progress-container',
      '.interactive-result-editor.loading',
      '.interactive-result .codicon-loading',
      '.chat-response-part .codicon-loading',
      '.chat-request-part .codicon-loading',
      
      // Response streaming/generating states
      'div[class*="typing"]:not([style*="display: none"])',
      'div[class*="streaming"]:not([style*="display: none"])',
      'div[class*="generating"]:not([style*="display: none"])',
      'div[class*="processing"]:not([style*="display: none"])',
      '.response-streaming:not([style*="display: none"])',
      '.generating-response:not([style*="display: none"])',
      
      // ARIA busy indicators
      '[aria-busy="true"]:not([style*="display: none"])',
      '[role="progressbar"]:not([style*="display: none"])',
      
      // Stop/Cancel buttons (indicate active processing)
      'button[aria-label*="Stop"]:not([disabled]):not([style*="display: none"])',
      'button[title*="Stop"]:not([disabled]):not([style*="display: none"])',
      'button[aria-label*="Cancel"]:not([disabled]):not([style*="display: none"])',
      'button[title*="Cancel"]:not([disabled]):not([style*="display: none"])',
      
      // Chat-specific progress states
      '.chat-response.in-progress:not([style*="display: none"])',
      '.chat-typing-indicator:not([style*="display: none"])',
      '.copilot-thinking:not([style*="display: none"])',
      '.chat-response-progress:not([style*="display: none"])',
      
      // Workbench and editor states
      '.workbench .monaco-progress-container:not([style*="display: none"])',
      '.editor-widget .monaco-progress-container:not([style*="display: none"])',
      
      // Additional VS Code patterns
      '.monaco-workbench [class*="loading"]:not([style*="display: none"])',
      '.monaco-workbench [class*="progress"]:not([style*="display: none"])',
      '.part[class*="loading"]:not([style*="display: none"])'
    ];
    
    console.log(`[auto] 🔍 Checking ${activeIndicators.length} active task indicators...`);
    
    for (const selector of activeIndicators) {
      try {
        const elements = Array.from(document.querySelectorAll(selector));
        if (elements.length > 0) {
          console.log(`[auto] 📊 Found ${elements.length} elements with selector: ${selector}`);
          
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
                // Check if element is in relevant context (broader search)
                const inRelevantContext = el.closest('.chat-response, .copilot-chat, .interactive-result, .interactive-session, .chat-container, .workbench, .monaco-workbench, .part') ||
                                         el.matches('.monaco-progress-container, .codicon-loading, [aria-busy="true"], [role="progressbar"]');
                
                if (inRelevantContext) {
                  const elementInfo = {
                    tag: el.tagName,
                    class: el.className,
                    text: (el.textContent || '').trim().substring(0, 50),
                    ariaLabel: el.getAttribute('aria-label') || '',
                    ariaBusy: el.getAttribute('aria-busy'),
                    selector: selector
                  };
                  console.log(`[auto] 🎯 Active element found:`, elementInfo);
                  return true;
                }
              }
              return false;
            } catch (e) {
              return false;
            }
          });
          
          if (visibleElements.length > 0) {
            console.log(`[auto] ✅ ${visibleElements.length} visible active elements found with selector: ${selector}`);
            console.log('%c[auto] 🟡 === ACTIVE TASK DETECTED ===', 'font-weight: bold; background: #fff3cd; color: #856404;');
            return true;
          }
        }
      } catch (selectorError) {
        console.log(`[auto] ❌ Selector error for ${selector}:`, selectorError.message);
        continue;
      }
    }
    
    // Additional check: look for any elements with working/busy text content
    try {
      const textBasedBusyElements = Array.from(document.querySelectorAll('*')).filter(el => {
        const text = (el.textContent || '').toLowerCase();
        const isSmallElement = text.length < 200; // Avoid large content blocks
        return isSmallElement && (
          text.includes('generating') ||
          text.includes('thinking') ||
          text.includes('processing') ||
          text.includes('working') ||
          text.includes('loading')
        );
      });
      
      if (textBasedBusyElements.length > 0) {
        console.log(`[auto] 📝 Found ${textBasedBusyElements.length} elements with busy text content`);
        for (const el of textBasedBusyElements.slice(0, 3)) { // Check first 3
          const rect = el.getBoundingClientRect();
          const isVisible = rect.width > 0 && rect.height > 0 && el.offsetParent !== null;
          if (isVisible) {
            console.log(`[auto] 📝 Busy text element: "${el.textContent.trim().substring(0, 50)}"`);
            console.log('%c[auto] 🟡 === ACTIVE TASK DETECTED (TEXT-BASED) ===', 'font-weight: bold; background: #fff3cd; color: #856404;');
            return true;
          }
        }
      }
    } catch (textError) {
      console.log('[auto] ❌ Error in text-based detection:', textError.message);
    }
    
    console.log('%c[auto] 🟢 === NO ACTIVE TASK - READY FOR ACTION ===', 'font-weight: bold; background: #d4edda; color: #155724;');
    return false;
  } catch (error) {
    console.error('[auto] ❌ Error in isTaskActive:', error);
    return false;
  }
}

function isInputReady() {
  try {
    const inputSelectors = [
      'div[role="textbox"][contenteditable="true"]',
      'textarea[placeholder*="Ask"]',
      'textarea[placeholder*="Message"]',
      'textarea[placeholder*="Chat"]',
      '.monaco-inputbox input',
      '.chat-input textarea',
      '.copilot-chat-input textarea',
      '.interactive-input textarea'
    ];
    
    for (const selector of inputSelectors) {
      try {
        const inputs = Array.from(document.querySelectorAll(selector));
        
        for (let i = 0; i < inputs.length; i++) {
          const input = inputs[i];
          const isDisabled = input.getAttribute('aria-disabled') === 'true' || 
                           input.disabled || 
                           input.getAttribute('disabled') !== null ||
                           input.readOnly;
          
          const rect = input.getBoundingClientRect();
          const isVisible = rect.width > 0 && rect.height > 0 && 
                           input.offsetParent !== null;
          
          if (!isDisabled && isVisible) {
            return input;
          }
        }
      } catch (selectorError) {
        continue;
      }
    }
    
    return null;
  } catch (error) {
    console.error('[auto] ❌ Error in isInputReady:', error);
    return null;
  }
}

function sendPrompt() {
  try {
    const prompt = "Continue executing the current task if it exists or do tasks on the dartboard iteratively until no uncompleted tasks left. Use build_run_rules, general, product_requirements_design instructions.md files.";
    const input = isInputReady();
    
    if (input) {
      input.focus();
      
      if (input.contentEditable === 'true') {
        input.textContent = prompt;
        const inputEvent = new InputEvent('input', {
          bubbles: true,
          cancelable: true,
          data: prompt
        });
        input.dispatchEvent(inputEvent);
        
        const changeEvent = new Event('change', {
          bubbles: true,
          cancelable: true
        });
        input.dispatchEvent(changeEvent);
      } else {
        input.value = prompt;
        const inputEvent = new Event('input', { bubbles: true });
        const changeEvent = new Event('change', { bubbles: true });
        input.dispatchEvent(inputEvent);
        input.dispatchEvent(changeEvent);
      }
      
      const sendSelectors = [
        'button[title*="Send"]:not([disabled])',
        'button[aria-label*="Send"]:not([disabled])',
        '.chat-input button[type="submit"]:not([disabled])',
        '.send-button:not([disabled])',
        '.action-item button[title*="Send"]:not([disabled])',
        'button.monaco-button:not([disabled])',
        'button[class*="send"]:not([disabled])',
        '.interactive-input-part button:not([disabled])',
        '.chat-request-part button:not([disabled])'
      ];
      
      let sendButton = null;
      for (const selector of sendSelectors) {
        try {
          const candidates = Array.from(document.querySelectorAll(selector));
          
          sendButton = candidates.find(btn => {
            const rect = btn.getBoundingClientRect();
            const buttonText = (btn.textContent || btn.getAttribute('aria-label') || btn.getAttribute('title') || '').toLowerCase();
            const looksLikeSend = buttonText.includes('send') || buttonText.includes('submit') || btn.type === 'submit';
            const isVisible = rect.width > 0 && rect.height > 0;
            
            return isVisible && looksLikeSend;
          });
          if (sendButton) {
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (sendButton) {
        sendButton.click();
        console.log('[auto] ✅ Prompt sent successfully');
      } else {
        const enterEvent = new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          bubbles: true,
          cancelable: true
        });
        input.dispatchEvent(enterEvent);
        console.log('[auto] ✅ Prompt sent via Enter key');
      }
      
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error('[auto] ❌ Error in sendPrompt:', error);
    return false;
  }
}

function findAndClickButton() {
  const now = Date.now();
  if (now - lastClick < BUTTON_COOLDOWN_MS) {
    return false;
  }

  // Block phantom messages
  const originalConsoleLog = console.log;
  console.log = function(...args) {
    const message = args.join(' ');
    if (message.includes('[auto] Clicked ') && 
        !message.includes('[AUTO-CONTINUE-CLICK]') && 
        !message.includes('🎯 Successfully clicked')) {
      console.warn('[auto] 🚫 BLOCKED PHANTOM CLICK MESSAGE:', message);
      return;
    }
    return originalConsoleLog.apply(console, args);
  };

  try {
    for (const buttonConfig of BUTTONS_TO_CLICK) {
      for (const selector of buttonConfig.selectors) {
        try {
          const buttons = Array.from(document.querySelectorAll(selector));
          
          if (buttons.length > 0) {
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
                
                const buttonText = (btn.textContent || btn.getAttribute('aria-label') || btn.getAttribute('title') || '').toLowerCase().trim();
                const nameMatch = buttonText.includes(buttonConfig.name.toLowerCase());
                const alreadyClicked = btn.getAttribute('data-auto-continue-clicked') === 'true';
                
                return isVisible && isEnabled && nameMatch && !alreadyClicked;
              } catch (e) {
                return false;
              }
            });

            if (button) {
              try {
                const buttonText = (button.textContent || button.getAttribute('aria-label') || button.getAttribute('title') || '').trim();
                
                const rect = button.getBoundingClientRect();
                const isStillVisible = rect.width > 0 && rect.height > 0 && button.offsetParent !== null;
                const isStillEnabled = !button.disabled && button.getAttribute('aria-disabled') !== 'true';
                
                if (!isStillVisible || !isStillEnabled) {
                  continue;
                }
                
                button.setAttribute('data-auto-continue-clicked', 'true');
                button.scrollIntoView({ block: 'center', inline: 'center' });
                
                const clickEvent = new MouseEvent('click', {
                  bubbles: true,
                  cancelable: true,
                  view: window
                });
                clickEvent.autoContinueSource = true;
                
                const clickResult = button.dispatchEvent(clickEvent);
                
                if (clickResult) {
                  lastClick = now;
                  retryCount = 0;
                  console.log(`[auto] 🎯 Successfully clicked '${buttonConfig.name}' button with text: "${buttonText}" [AUTO-CONTINUE-CLICK]`);
                  return true;
                }
              } catch (error) {
                console.error(`[auto] ❌ Error clicking '${buttonConfig.name}' button:`, error);
              }
            }
          }
        } catch (selectorError) {
          continue;
        }
      }
      
      // Text-based matching fallback
      try {
        const allButtons = Array.from(document.querySelectorAll('button, a[role="button"], .monaco-button, .action-label'));
        const textMatchButtons = allButtons.filter(btn => {
          const text = (btn.textContent || btn.getAttribute('aria-label') || btn.getAttribute('title') || '').toLowerCase().trim();
          return text.includes(buttonConfig.name.toLowerCase());
        });

        if (textMatchButtons.length > 0) {
          const button = textMatchButtons.find(btn => {
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

          if (button) {
            try {
              const buttonText = (button.textContent || button.getAttribute('aria-label') || button.getAttribute('title') || '').trim();
              
              const rect = button.getBoundingClientRect();
              const isStillVisible = rect.width > 0 && rect.height > 0 && button.offsetParent !== null;
              const isStillEnabled = !button.disabled && button.getAttribute('aria-disabled') !== 'true';
              
              if (!isStillVisible || !isStillEnabled) {
                continue;
              }
              
              button.setAttribute('data-auto-continue-clicked', 'true');
              button.scrollIntoView({ block: 'center', inline: 'center' });
              
              const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
              });
              clickEvent.autoContinueSource = true;
              
              const clickResult = button.dispatchEvent(clickEvent);
              
              if (clickResult) {
                lastClick = now;
                retryCount = 0;
                console.log(`[auto] 🎯 Successfully clicked '${buttonConfig.name}' button (text match) with text: "${buttonText}" [AUTO-CONTINUE-CLICK]`);
                return true;
              }
            } catch (error) {
              console.error(`[auto] ❌ Error clicking text-matched '${buttonConfig.name}' button:`, error);
            }
          }
        }
      } catch (textError) {
        // Silent continue
      }
    }
    
    return false;
  } catch (error) {
    console.error('[auto] ❌ Critical error in findAndClickButton:', error);
    return false;
  } finally {
    console.log = originalConsoleLog;
  }
}

function setupMutationObserver() {
  const observerConfig = {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true,
    attributeFilter: ['class', 'style', 'disabled', 'role', 'placeholder', 'aria-label', 'title']
  };

  observer = new MutationObserver((mutations) => {
    try {
      const relevantChange = mutations.some(mutation => {
        const target = mutation.target;
        const isRelevant = target.closest && (
          target.closest('.chat-container') ||
          target.closest('.copilot-chat') ||
          target.closest('.interactive-result') ||
          target.closest('.chat-response') ||
          target.closest('.monaco-button') ||
          target.classList.contains('codicon-loading') ||
          target.classList.contains('progress-bar')
        );
        
        return isRelevant || 
               mutation.type === 'attributes' && 
               ['disabled', 'aria-busy', 'class'].includes(mutation.attributeName);
      });
      
      if (relevantChange) {
        clearTimeout(window.autoCheckTimeout);
        window.autoCheckTimeout = setTimeout(() => {
          checkAndContinue().catch(console.error);
        }, 500);
      }
    } catch (error) {
      console.error('[auto] Error in MutationObserver callback:', error);
    }
  });
  
  try {
    observer.observe(document.body, observerConfig);
    
    if (window.autoContinueObservers) {
      window.autoContinueObservers.push(observer);
    }
  } catch (error) {
    console.error('[auto] Error starting MutationObserver:', error);
  }
}

async function checkAndContinue() {
  if (isProcessing) {
    return;
  }
  
  isProcessing = true;
  const now = Date.now();
  const checkId = Math.random().toString(36).substr(2, 6);
  let actionTaken = false;
  let hasActiveTask = false;

  console.log(`[auto][${checkId}] 🔄 ===== STARTING CHECK =====`);

  try {
    hasActiveTask = isTaskActive();
    console.log(`[auto][${checkId}] ${hasActiveTask ? '🟡' : '🟢'} Active task: ${hasActiveTask}`);

    if (!hasActiveTask) {
      console.log(`[auto][${checkId}] 🔍 No active task detected, checking for buttons to click...`);
      const buttonClicked = findAndClickButton();
      if (buttonClicked) {
        actionTaken = true;
        console.log(`[auto][${checkId}] ✅ Action taken: Button clicked successfully`);
      } else {
        console.log(`[auto][${checkId}] 🔍 No buttons available, checking if we should send prompt...`);
        const inputElement = isInputReady();
        if (inputElement) {
          console.log(`[auto][${checkId}] 📝 Input field ready, attempting to send continuation prompt...`);
          const promptSent = sendPrompt();
          if (promptSent) {
            actionTaken = true;
            console.log(`[auto][${checkId}] ✅ Action taken: Prompt sent successfully`);
          } else {
            console.log(`[auto][${checkId}] ❌ Failed to send prompt`);
          }
        } else {
          console.log(`[auto][${checkId}] ❌ Input field not ready for sending prompt`);
        }
      }
    }

    // Increment retry count if no action was taken
    if (!actionTaken && !hasActiveTask) {
      retryCount++;
      console.log(`[auto][${checkId}] 📈 No action taken, incrementing retry count to ${retryCount}/${MAX_RETRIES}`);
      if (retryCount > MAX_RETRIES) {
        console.log(`[auto][${checkId}] 🔄 Max retries (${MAX_RETRIES}) reached. Resetting retry count to 0.`);
        retryCount = 0;
      }
    } else if (actionTaken) {
      console.log(`[auto][${checkId}] 🔄 Action taken successfully, resetting retry count to 0`);
      retryCount = 0; // Reset on successful action
    }

  } catch (error) {
    console.error(`[auto][${checkId}] ❌ Error in checkAndContinue:`, error);
    retryCount++;
  } finally {
    isProcessing = false;
    console.log(`[auto][${checkId}] 🏁 ===== CHECK COMPLETE =====`);
    console.log(`[auto][${checkId}] 📊 Final state: actionTaken=${actionTaken}, retryCount=${retryCount}, hasActiveTask=${hasActiveTask}`);
  }
}

function init() {
  console.log('%c=== VS Code Copilot Auto-Continue v2.3 STARTING ===', 'font-weight: bold; color: #2196F3;');
  
  try {
    // Check for multiple instances
    if (window.autoContinueInstanceId && window.autoContinueInstanceId !== 'stopped') {
      console.warn('[auto] ⚠️  Multiple instances detected, cleaning up...');
      
      if (typeof window.autoContinueIntervals !== 'undefined') {
        window.autoContinueIntervals.forEach(id => {
          try {
            clearInterval(id);
          } catch (e) {}
        });
      }
      if (typeof window.autoContinueObservers !== 'undefined') {
        window.autoContinueObservers.forEach(obs => {
          try {
            obs.disconnect();
          } catch (e) {}
        });
      }
    }
    
    // Set unique instance ID
    window.autoContinueInstanceId = 'instance_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    window.autoContinueIntervals = [];
    window.autoContinueObservers = [];
    
    // Clean up existing automation
    if (window.autoContinue && window.autoContinue.stop) {
      const originalStop = window.autoContinue.stop;
      window.autoContinue.stop = function() {
        try {
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
          if (observer) {
            observer.disconnect();
            observer = null;
          }
          if (window.autoCheckTimeout) {
            clearTimeout(window.autoCheckTimeout);
          }
          
          lastClick = 0;
          isProcessing = false;
          retryCount = 0;
          
          return true;
        } catch (error) {
          console.error('[auto] ❌ Error during cleanup:', error);
          return false;
        }
      };
      
      window.autoContinue.stop();
      window.autoContinue.stop = originalStop;
    }
    
    // Set up main interval
    intervalId = setInterval(() => {
      checkAndContinue().catch(console.error);
    }, CHECK_INTERVAL);
    
    if (window.autoContinueIntervals) {
      window.autoContinueIntervals.push(intervalId);
    }
    
    // Set up cleanup interval
    const cleanupInterval = setInterval(() => {
      try {
        const clickedButtons = document.querySelectorAll('[data-auto-continue-clicked="true"]');
        if (clickedButtons.length > 0) {
          clickedButtons.forEach(btn => btn.removeAttribute('data-auto-continue-clicked'));
        }
      } catch (e) {}
    }, 30000);
    
    window.autoCleanupInterval = cleanupInterval;
    if (window.autoContinueIntervals) {
      window.autoContinueIntervals.push(cleanupInterval);
    }

    setupMutationObserver();

    // Initial check
    setTimeout(() => {
      checkAndContinue().catch(console.error);
    }, 2000);

    console.log('%c🚀 Auto-Continue is running!', 'color: #4CAF50; font-weight: bold;');
    console.log('Commands: autoContinue.stop(), autoContinue.restart(), autoContinue.debug()');
    
    return true;
  } catch (error) {
    console.error('[auto] ❌ Error initializing:', error);
    return false;
  }
}

// Initialize autoContinue object
const autoContinue = {
  start: init,
  stop: function() {
    let wasRunning = intervalId !== null || observer !== null;
    
    try {
      let stoppedSomething = false;
      
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        stoppedSomething = true;
      }
      if (observer) {
        observer.disconnect();
        observer = null;
        stoppedSomething = true;
      }
      if (window.autoCheckTimeout) {
        clearTimeout(window.autoCheckTimeout);
        stoppedSomething = true;
      }
      if (window.autoCleanupInterval) {
        clearInterval(window.autoCleanupInterval);
        stoppedSomething = true;
      }
      
      // Clean up tracked intervals and observers
      if (window.autoContinueIntervals) {
        window.autoContinueIntervals.forEach(id => {
          try {
            clearInterval(id);
          } catch (e) {}
        });
        window.autoContinueIntervals = [];
      }
      
      if (window.autoContinueObservers) {
        window.autoContinueObservers.forEach(obs => {
          try {
            obs.disconnect();
          } catch (e) {}
        });
        window.autoContinueObservers = [];
      }
      
      // Reset state
      lastClick = Date.now();
      isProcessing = false;
      retryCount = 0;
      window.autoContinueInstanceId = 'stopped';
      
      // Clear click markers
      try {
        const clickedButtons = document.querySelectorAll('[data-auto-continue-clicked="true"]');
        clickedButtons.forEach(btn => btn.removeAttribute('data-auto-continue-clicked'));
      } catch (e) {}
      
      if (stoppedSomething) {
        console.log('%c[auto] 🛑 Automation stopped successfully', 'color: #f44336; font-weight: bold;');
      }
      
      return true;
    } catch (error) {
      console.error('[auto] ❌ Error stopping automation:', error);
      return false;
    }
  },
  restart: function() {
    console.log('[auto] 🔄 Restarting automation...');
    this.stop();
    setTimeout(() => {
      this.start();
    }, 1000);
  },
  debug: function() {
    const info = {
      status: intervalId ? 'RUNNING' : 'STOPPED',
      lastClick: lastClick ? new Date(lastClick).toISOString() : 'Never',
      isProcessing,
      retryCount,
      debugMode,
      settings: {
        checkInterval: CHECK_INTERVAL,
        buttonCooldown: BUTTON_COOLDOWN_MS,
        maxRetries: MAX_RETRIES
      },
      currentState: {
        isTaskActive: isTaskActive(),
        inputReady: !!isInputReady(),
        timeSinceLastClick: Date.now() - lastClick
      }
    };
    
    console.table(info.settings);
    console.table(info.currentState);
    console.log('[auto] Full debug info:', info);
    return info;
  },
  toggle: function() {
    debugMode = !debugMode;
    console.log(`[auto] 🔧 Debug mode ${debugMode ? 'ENABLED' : 'DISABLED'}`);
    return debugMode;
  },
  forceAction: function() {
    console.log('[auto] 🔧 Forcing action check...');
    checkAndContinue().catch(console.error);
  },
  version: '2.3.0'
};

window.autoContinue = autoContinue;

// Auto-start
console.log('[auto] 🔍 Checking for existing instances...');
if (typeof window.autoContinue !== 'undefined' && window.autoContinue && typeof window.autoContinue.stop === 'function') {
  console.log('[auto] ⚠️  Stopping existing instance...');
  try {
    window.autoContinue.stop();
    console.log('[auto] ✅ Previous instance stopped');
  } catch (error) {
    console.warn('[auto] ⚠️  Error stopping previous instance:', error);
  }
  setTimeout(() => {
    init();
  }, 500);
} else {
  init();
}
