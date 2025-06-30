/**
 * VS Code Copilot Auto-Continue Script v2.3
 * 
 * This script automates interactions with VS Code's Copilot Chat by:
 * 1. 🔍 Automatically detecting and clicking action buttons (Continue, Try Again, Keep, Accept)
 * 2. 📝 Sending continuation prompts when the chat is idle and no buttons are available
 * 3. 🧠 Smart task detection to avoid interrupting active Copilot operations
 * 4. 📊 Comprehensive logging and debugging capabilities
 * 
 * FEATURES:
 * • Smart button detection with text validation to prevent false clicks
 * • Real-time DOM monitoring for instant response to UI changes
 * • Configurable cooldowns and retry logic for button clicks
 * • Extensive logging for troubleshooting and monitoring
 * • Debug mode for detailed operation inspection
 * • Safe cleanup and restart capabilities
 * 
 * ===========================================================================
 * 🚀 HOW TO START:
 * 1. Open VS Code's Developer Tools (Help > Toggle Developer Tools or Ctrl+Shift+I)
 * 2. Go to the Console tab
 * 3. Paste this entire script and press Enter to execute
 * 4. The script will automatically start and show initialization messages
 *
 * 🛑 HOW TO STOP:
 * Run this command in the Console tab:
 * autoContinue.stop()
 * 
 * 🔧 AVAILABLE COMMANDS:
 * • autoContinue.stop()         - Stop the automation
 * • autoContinue.restart()      - Restart the automation  
 * • autoContinue.debug()        - Show current status and debug info
 * • autoContinue.toggle()       - Toggle debug mode (more detailed logging)
 * • autoContinue.forceAction()  - Force an immediate action check
 * • autoContinue.setButtonCooldown(seconds)  - Adjust button click cooldown
 * 
 * 📋 WHAT IT DOES:
 * The script continuously monitors VS Code's Copilot Chat interface and:
 * 1. Waits for any active tasks (typing, generating responses) to complete
 * 2. Searches for actionable buttons like "Continue", "Try Again", "Keep", "Accept"
 * 3. Validates buttons actually contain the expected text before clicking
 * 4. If no buttons are found, sends a continuation prompt to keep the workflow going
 * 5. Respects button cooldowns to avoid overwhelming the system
 * 
 * 🔧 CONFIGURATION:
 * Default settings can be adjusted by modifying the constants at the top of the script:
 * • BUTTON_COOLDOWN_MS: Time between button clicks (default: 3 seconds)
 * • CHECK_INTERVAL: How often to check for actions (default: 2 seconds)
 * • MAX_RETRIES: Maximum retry attempts before resetting (default: 3)
 * 
 * Note: The script automatically stops if you close the Developer Tools.
 * ===========================================================================
 */

// Configuration
const BUTTON_COOLDOWN_MS = 3000; // 3 seconds between button clicks
const CHECK_INTERVAL = 5000; // Check every 2 seconds
const MAX_RETRIES = 3; // Maximum retries for button clicks

// State tracking
let lastClick = Date.now();
let isProcessing = false;
let intervalId = null;
let observer = null;
let retryCount = 0;
let debugMode = false;

// Buttons to automatically click - Fixed selectors for browser compatibility
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

/**
 * Check if there's an active task in progress
 */
function isTaskActive() {
  console.log('%c[auto] 🔍 === ACTIVE TASK CHECK STARTED ===', 'font-weight: bold; color: #2196F3;');
  console.log('[auto] 🔍 Checking for active task indicators...');
  
  try {
    // Check for any active indicators with improved selectors
    const activeIndicators = [
      // Loading and progress indicators - more specific to avoid general VS Code loading
      '.chat-response .codicon-loading:not([style*="display: none"])',
      '.copilot-chat .codicon-loading:not([style*="display: none"])',
      '.interactive-result .codicon-loading:not([style*="display: none"])',
      '.monaco-progress-container:not([style*="display: none"])',
      
      // Copilot specific indicators
      'div[class*="typing"]:not([style*="display: none"])',
      'div[class*="response"][class*="streaming"]:not([style*="display: none"])',
      'div[class*="response"][class*="generating"]:not([style*="display: none"])',
      'div[class*="markdown"][class*="typing"]:not([style*="display: none"])',
      '.response-streaming:not([style*="display: none"])',
      '.generating-response:not([style*="display: none"])',
      
      // Button states - specific to chat context
      '.chat-response button[aria-label*="Stop"]:not([style*="display: none"])',
      '.copilot-chat button[title*="Stop"]:not([style*="display: none"])',
      '.interactive-result button[aria-busy="true"]:not([style*="display: none"])',
      
      // Chat specific indicators
      '.chat-response.in-progress:not([style*="display: none"])',
      '.chat-typing-indicator:not([style*="display: none"])',
      '.copilot-thinking:not([style*="display: none"])'
    ];
    
    // Check each indicator
    for (const selector of activeIndicators) {
      console.log(`[auto] 🔍 Checking indicator: ${selector}`);
      try {
        const elements = Array.from(document.querySelectorAll(selector));
        console.log(`[auto] 📊 Found ${elements.length} elements for selector: ${selector}`);
        
        if (elements.length > 0) {
          // Check if any matching element is actually visible
          const visibleElements = elements.filter(el => {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            const isVisible = rect.width > 0 && rect.height > 0 &&
                             el.offsetParent !== null &&
                             style.display !== 'none' &&
                             style.visibility !== 'hidden' &&
                             style.opacity !== '0';
            
            if (isVisible) {
              // Check if it's in a chat-related container to avoid false positives
              const inChatContext = el.closest('.chat-response, .copilot-chat, .interactive-result, .chat-container');
              console.log(`[auto] 🟡 Visible active indicator found:`, el, 'Selector:', selector, 'InChatContext:', !!inChatContext);
              return inChatContext; // Only count if it's in chat context
            }
            return false;
          });
          
          if (visibleElements.length > 0) {
            console.log(`[auto] ✅ Active task detected via selector: ${selector} (${visibleElements.length} visible chat-context elements)`);
            console.log('%c[auto] 🟡 === ACTIVE TASK CHECK RESULT: ACTIVE TASK DETECTED ===', 'font-weight: bold; background: #fff3cd; color: #856404;');
            return true;
          }
        }
      } catch (selectorError) {
        console.log(`[auto] ❌ Error with selector ${selector}:`, selectorError.message);
        continue;
      }
    }
    
    // Additional check for text content indicating activity
    console.log('[auto] 🔍 Checking for text-based activity indicators...');
    const chatContainer = document.querySelector('.chat-response-container, .copilot-chat-container, .interactive-result-container');
    if (chatContainer) {
      console.log('[auto] 📋 Found chat container, checking last response...');
      const lastResponse = chatContainer.querySelector('.chat-response:last-child, .response:last-child');
      if (lastResponse) {
        const responseText = lastResponse.textContent || '';
        console.log(`[auto] 📝 Last response text (first 100 chars): "${responseText.substring(0, 100)}..."`);
        if (responseText.includes('...') || responseText.includes('thinking') || responseText.includes('processing')) {
          console.log('[auto] ✅ Active task detected via text content');
          console.log('%c[auto] 🟡 === ACTIVE TASK CHECK RESULT: ACTIVE TASK DETECTED (TEXT CONTENT) ===', 'font-weight: bold; background: #fff3cd; color: #856404;');
          return true;
        }
      } else {
        console.log('[auto] ❌ No last response found in chat container');
      }
    } else {
      console.log('[auto] ❌ No chat container found');
    }
    
    console.log('[auto] 🟢 No active task detected');
    console.log('%c[auto] 🟢 === ACTIVE TASK CHECK RESULT: NO ACTIVE TASK - READY FOR ACTION ===', 'font-weight: bold; background: #d4edda; color: #155724;');
    return false;
  } catch (error) {
    console.error('[auto] ❌ Critical error in isTaskActive:', error);
    console.log('%c[auto] ❌ === ACTIVE TASK CHECK RESULT: ERROR - ASSUMING NO ACTIVE TASK ===', 'font-weight: bold; background: #f8d7da; color: #721c24;');
    return false; // Default to false on error
  }
}

/**
 * Check if the input is ready to receive text
 */
function isInputReady() {
  console.log('[auto] 🔍 Checking for ready input fields...');
  
  try {
    // Updated selectors for current VS Code Copilot Chat
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
      console.log(`[auto] 🔍 Trying input selector: ${selector}`);
      try {
        const inputs = Array.from(document.querySelectorAll(selector));
        console.log(`[auto] 📊 Found ${inputs.length} input elements with selector: ${selector}`);
        
        for (let i = 0; i < inputs.length; i++) {
          const input = inputs[i];
          const isDisabled = input.getAttribute('aria-disabled') === 'true' || 
                           input.disabled || 
                           input.getAttribute('disabled') !== null ||
                           input.readOnly;
          
          const rect = input.getBoundingClientRect();
          const isVisible = rect.width > 0 && rect.height > 0 && 
                           input.offsetParent !== null;
          
          const placeholder = input.getAttribute('placeholder') || '';
          
          console.log(`[auto] 📋 Input ${i + 1}: placeholder="${placeholder}", disabled=${isDisabled}, visible=${isVisible}, rect=${rect.width}x${rect.height}`);
          
          if (!isDisabled && isVisible) {
            console.log(`[auto] ✅ Ready input field found with selector: ${selector}`);
            return input;
          }
        }
      } catch (selectorError) {
        console.log(`[auto] ❌ Error with input selector ${selector}:`, selectorError.message);
        continue;
      }
    }
    
    console.log('[auto] ❌ No enabled and visible input field found');
    return null;
  } catch (error) {
    console.error('[auto] ❌ Critical error in isInputReady:', error);
    return null;
  }
}

/**
 * Send a continuation prompt to the chat
 */
function sendPrompt() {
  console.log('[auto] 📝 Attempting to send continuation prompt...');
  
  try {
    const prompt = "Continue executing the current task if it exists or do tasks on the dartboard iteratively until no uncompleted tasks left. Use build_run_rules, general, product_requirements_design instructions.md files.";
    const input = isInputReady();
    
    if (input) {
      console.log('[auto] ✅ Input field ready, proceeding with prompt sending...');
      console.log(`[auto] 📝 Prompt text: "${prompt.substring(0, 50)}..."`);
      
      // Focus the input first
      input.focus();
      
      // Set the prompt text based on input type
      if (input.contentEditable === 'true') {
        console.log('[auto] 📝 Using contenteditable div input method');
        // For contenteditable divs
        input.textContent = prompt;
        
        // Trigger input events
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
        console.log('[auto] 📝 Using textarea/input element method');
        // For textarea/input elements
        input.value = prompt;
        
        // Trigger events
        const inputEvent = new Event('input', { bubbles: true });
        const changeEvent = new Event('change', { bubbles: true });
        input.dispatchEvent(inputEvent);
        input.dispatchEvent(changeEvent);
      }
      
      // Immediately search for and click the send button
      console.log('[auto] 🔍 Searching for send button...');
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
          console.log(`[auto] 🔍 Trying send button selector: ${selector}`);
          const candidates = Array.from(document.querySelectorAll(selector));
          console.log(`[auto] 📊 Found ${candidates.length} candidates with selector: ${selector}`);
          
          sendButton = candidates.find(btn => {
            const rect = btn.getBoundingClientRect();
            const buttonText = (btn.textContent || btn.getAttribute('aria-label') || btn.getAttribute('title') || '').toLowerCase();
            const looksLikeSend = buttonText.includes('send') || buttonText.includes('submit') || btn.type === 'submit';
            const isVisible = rect.width > 0 && rect.height > 0;
            
            console.log(`[auto] 🧪 Testing send button: text="${buttonText}", looksLikeSend=${looksLikeSend}, visible=${isVisible}`);
            return isVisible && looksLikeSend;
          });
          if (sendButton) {
            console.log(`[auto] ✅ Found valid send button with selector: ${selector}`);
            break;
          }
        } catch (e) {
          console.log(`[auto] ❌ Error with send button selector ${selector}:`, e.message);
          continue; // Skip invalid selectors
        }
      }
      
      if (sendButton) {
        const buttonText = (sendButton.textContent || sendButton.getAttribute('aria-label') || sendButton.getAttribute('title') || '').trim();
        console.log(`[auto] 🎯 Clicking send button with text: "${buttonText}"`);
        sendButton.click();
        console.log('[auto] ✅ Successfully sent continuation prompt to Copilot Chat');
      } else {
        // Try Enter key as fallback
        console.log('[auto] 🔄 No send button found, trying Enter key as fallback...');
        const enterEvent = new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          bubbles: true,
          cancelable: true
        });
        input.dispatchEvent(enterEvent);
        
        console.log('[auto] ✅ Sent continuation prompt via Enter key');
      }
      
      return true;
    } else {
      console.log('[auto] ❌ No ready input field found for sending prompt');
      return false;
    }
  } catch (error) {
    console.error('[auto] ❌ Critical error in sendPrompt:', error);
    return false;
  }
}

/**
 * Find and click action buttons
 */
function findAndClickButton() {
  const now = Date.now();
  if (now - lastClick < BUTTON_COOLDOWN_MS) {
    if (debugMode) {
      console.debug(`[auto] Button cooldown active. Next click in ${Math.ceil((BUTTON_COOLDOWN_MS - (now - lastClick)) / 1000)}s`);
    }
    return false;
  }

  // Block any potential rogue click event listeners during our search
  const originalConsoleLog = console.log;
  const clickBlockStart = Date.now();
  
  // Temporarily intercept console.log to catch any phantom messages
  console.log = function(...args) {
    const message = args.join(' ');
    // Block simple "Clicked" messages that don't match our format
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
      // console.log(`[auto] 🔍 Searching for '${buttonConfig.name}' buttons...`);
      
      // First try direct selectors
      for (const selector of buttonConfig.selectors) {
        try {
          // console.log(`[auto] 🔍 Trying selector: ${selector}`);
          const buttons = Array.from(document.querySelectorAll(selector));
          
          // console.log(`[auto] 📊 Found ${buttons.length} elements with selector: ${selector}`);
          
          if (buttons.length > 0) {
            // Log details about each button found
            // buttons.forEach((btn, index) => {
            //   const rect = btn.getBoundingClientRect();
            //   const style = window.getComputedStyle(btn);
            //   const buttonText = (btn.textContent || btn.getAttribute('aria-label') || btn.getAttribute('title') || '').trim();
            //   console.log(`[auto] 📋 Button ${index + 1}: text="${buttonText}", visible=${rect.width > 0 && rect.height > 0}, enabled=${!btn.disabled}, rect=${rect.width}x${rect.height}`);
            // });

            // Find the first visible and enabled button that actually matches our criteria
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
                
                // Additional validation: check if button text/label actually matches what we're looking for
                const buttonText = (btn.textContent || btn.getAttribute('aria-label') || btn.getAttribute('title') || '').toLowerCase().trim();
                const nameMatch = buttonText.includes(buttonConfig.name.toLowerCase());
                
                // Check if we've already clicked this button recently
                const alreadyClicked = btn.getAttribute('data-auto-continue-clicked') === 'true';
                
                // console.log(`[auto] 🧪 Testing button: text="${buttonText}", visible=${isVisible}, enabled=${isEnabled}, nameMatch=${nameMatch}, alreadyClicked=${alreadyClicked}`);
                
                return isVisible && isEnabled && nameMatch && !alreadyClicked;
              } catch (e) {
                // console.log(`[auto] ❌ Error testing button:`, e);
                return false;
              }
            });

            if (button) {
              try {
                const buttonText = (button.textContent || button.getAttribute('aria-label') || button.getAttribute('title') || '').trim();
                // console.log(`[auto] ✅ VALID BUTTON FOUND! Text: "${buttonText}"`);
                
                // Double-check that button is still valid before clicking
                const rect = button.getBoundingClientRect();
                const isStillVisible = rect.width > 0 && rect.height > 0 && button.offsetParent !== null;
                const isStillEnabled = !button.disabled && button.getAttribute('aria-disabled') !== 'true';
                
                if (!isStillVisible || !isStillEnabled) {
                  // console.log(`[auto] ❌ Button became invalid before clicking: visible=${isStillVisible}, enabled=${isStillEnabled}`);
                  continue;
                }
                
                // Add a unique marker to distinguish our clicks
                button.setAttribute('data-auto-continue-clicked', 'true');
                
                // Scroll button into view if needed
                button.scrollIntoView({ block: 'center', inline: 'center' });
                
                // Create a custom event to identify our clicks
                const clickEvent = new MouseEvent('click', {
                  bubbles: true,
                  cancelable: true,
                  view: window
                });
                clickEvent.autoContinueSource = true;
                
                // Dispatch the event and verify it was successful
                const clickResult = button.dispatchEvent(clickEvent);
                
                // Only log success if the click event was actually dispatched
                if (clickResult) {
                  lastClick = now;
                  retryCount = 0; // Reset retry count on successful click
                  console.log(`[auto] 🎯 Successfully clicked '${buttonConfig.name}' button with text: "${buttonText}" [AUTO-CONTINUE-CLICK]`);
                  return true;
                } else {
                  console.log(`[auto] ❌ Click event was cancelled for '${buttonConfig.name}' button`);
                }
              } catch (error) {
                console.error(`[auto] ❌ Error clicking '${buttonConfig.name}' button:`, error);
              }
            } else {
              // console.log(`[auto] ❌ No valid '${buttonConfig.name}' button found with selector: ${selector}`);
            }
          } else {
            // console.log(`[auto] ❌ No elements found with selector: ${selector}`);
          }
        } catch (selectorError) {
          // console.log(`[auto] ❌ Selector error for ${selector}:`, selectorError.message);
          continue; // Skip invalid selectors
        }
      }
      
      // If direct selectors didn't work, try text-based matching
      // console.log(`[auto] 🔍 Trying text-based search for '${buttonConfig.name}'...`);
      try {
        const allButtons = Array.from(document.querySelectorAll('button, a[role="button"], .monaco-button, .action-label'));
        // console.log(`[auto] 📊 Found ${allButtons.length} total button-like elements`);
        
        const textMatchButtons = allButtons.filter(btn => {
          const text = (btn.textContent || btn.getAttribute('aria-label') || btn.getAttribute('title') || '').toLowerCase().trim();
          const matches = text.includes(buttonConfig.name.toLowerCase());
          // if (matches) {
          //   console.log(`[auto] 📋 Text match found: "${text}" contains "${buttonConfig.name.toLowerCase()}"`);
          // }
          return matches;
        });

        // console.log(`[auto] 📊 Found ${textMatchButtons.length} text-matching '${buttonConfig.name}' buttons`);

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
              
              // Check if we've already clicked this button recently
              const alreadyClicked = btn.getAttribute('data-auto-continue-clicked') === 'true';
              
              const buttonText = (btn.textContent || btn.getAttribute('aria-label') || btn.getAttribute('title') || '').trim();
              // console.log(`[auto] 🧪 Testing text-match button: "${buttonText}", visible=${isVisible}, enabled=${isEnabled}, alreadyClicked=${alreadyClicked}`);
              
              return isVisible && isEnabled && !alreadyClicked;
            } catch (e) {
              // console.log(`[auto] ❌ Error testing text-match button:`, e);
              return false;
            }
          });

          if (button) {
            try {
              const buttonText = (button.textContent || button.getAttribute('aria-label') || button.getAttribute('title') || '').trim();
              // console.log(`[auto] ✅ VALID TEXT-MATCH BUTTON FOUND! Text: "${buttonText}"`);
              
              // Double-check that button is still valid before clicking
              const rect = button.getBoundingClientRect();
              const isStillVisible = rect.width > 0 && rect.height > 0 && button.offsetParent !== null;
              const isStillEnabled = !button.disabled && button.getAttribute('aria-disabled') !== 'true';
              
              if (!isStillVisible || !isStillEnabled) {
                // console.log(`[auto] ❌ Text-match button became invalid before clicking: visible=${isStillVisible}, enabled=${isStillEnabled}`);
                continue;
              }
              
              // Add a unique marker to distinguish our clicks
              button.setAttribute('data-auto-continue-clicked', 'true');
              
              button.scrollIntoView({ block: 'center', inline: 'center' });
              
              // Create a custom event to identify our clicks
              const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
              });
              clickEvent.autoContinueSource = true;
              
              // Dispatch the event and verify it was successful
              const clickResult = button.dispatchEvent(clickEvent);
              
              // Only log success if the click event was actually dispatched
              if (clickResult) {
                lastClick = now;
                retryCount = 0;
                console.log(`[auto] 🎯 Successfully clicked '${buttonConfig.name}' button (text match) with text: "${buttonText}" [AUTO-CONTINUE-CLICK]`);
                return true;
              } else {
                console.log(`[auto] ❌ Click event was cancelled for text-matched '${buttonConfig.name}' button`);
              }
            } catch (error) {
              console.error(`[auto] ❌ Error clicking text-matched '${buttonConfig.name}' button:`, error);
            }
          } else {
            // console.log(`[auto] ❌ No valid text-matching '${buttonConfig.name}' buttons found`);
          }
        }
      } catch (textError) {
        // console.log(`[auto] ❌ Text matching error for ${buttonConfig.name}:`, textError);
      }
    }
    
    // console.log('[auto] 🚫 No clickable buttons found after exhaustive search');
    return false;
  } catch (error) {
    console.error('[auto] ❌ Critical error in findAndClickButton:', error);
    return false;
  } finally {
    // Always restore the original console.log
    console.log = originalConsoleLog;
    if (debugMode) {
      console.debug(`[auto] 🔒 Button search completed in ${Date.now() - clickBlockStart}ms, console protection restored`);
    }
  }
}

/**
 * Set up MutationObserver to watch for DOM changes
 */
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
      // Only trigger on relevant changes to avoid excessive checks
      const relevantChange = mutations.some(mutation => {
        // Check if the change is in chat-related elements
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
        if (debugMode) console.debug('[auto] Relevant DOM changes detected, triggering check...');
        // Debounce the check to avoid excessive calls
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
    
    // Track this observer globally for cleanup
    if (window.autoContinueObservers) {
      window.autoContinueObservers.push(observer);
    }
    
    if (debugMode) console.debug('[auto] MutationObserver started');
  } catch (error) {
    console.error('[auto] Error starting MutationObserver:', error);
  }
}

/**
 * Main function to check for actions and continue the conversation
 */
async function checkAndContinue() {
  if (isProcessing) {
    console.log('[auto] ⏳ Previous check still in progress, skipping this cycle');
    return;
  }
  
  isProcessing = true;
  const now = Date.now();
  const checkId = Math.random().toString(36).substr(2, 6);
  let actionTaken = false;
  let hasActiveTask = false; // Declare in function scope

  console.log(`[auto][${checkId}] 🔄 ===== STARTING AUTOMATION CHECK =====`);
  console.log(`[auto][${checkId}] ⏰ Current time: ${new Date().toISOString()}`);
  console.log(`[auto][${checkId}] 📊 Retry count: ${retryCount}/${MAX_RETRIES}`);
  console.log(`[auto][${checkId}] ⏲️  Time since last click: ${((now - lastClick) / 1000).toFixed(1)}s`);

  try {
    // First check if there's an active task
    console.log(`[auto][${checkId}] 🔍 Checking for active tasks...`);
    hasActiveTask = isTaskActive();
    console.log(`[auto][${checkId}] ${hasActiveTask ? '🟡' : '🟢'} Active task detected: ${hasActiveTask}`);
    
    if (hasActiveTask) {
      console.log(`[auto][${checkId}] ⏳ Active task in progress, waiting for completion...`);
    } else {
      console.log(`[auto][${checkId}] 🟢 No active task detected, proceeding with automation actions...`);
    }

    if (!hasActiveTask) {
      console.log(`[auto][${checkId}] 🔍 No active task detected, checking for buttons to click...`);

      // Try to click buttons first
      const buttonClicked = findAndClickButton();
      if (buttonClicked) {
        actionTaken = true;
        console.log(`[auto][${checkId}] ✅ Action taken: Button clicked successfully`);
      } else {
        // If no buttons available, try sending a prompt
        console.log(`[auto][${checkId}] 🔍 No buttons available, checking if we should send prompt...`);
        const inputElement = isInputReady();
        if (inputElement) {
          console.log(`[auto][${checkId}] 📝 Input field ready, attempting to send continuation prompt...`);
          const promptSent = sendPrompt();
          if (promptSent) {
            actionTaken = true;
            console.log(`[auto][${checkId}] ✅ Action taken: Prompt sent successfully`);        } else {
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
    console.error(`[auto][${checkId}] ❌ Critical error in checkAndContinue:`, error);
    retryCount++;
  } finally {
    isProcessing = false;
    console.log(`[auto][${checkId}] 🏁 ===== CHECK COMPLETE =====`);
    console.log(`[auto][${checkId}] 📊 Final state: actionTaken=${actionTaken}, retryCount=${retryCount}, hasActiveTask=${hasActiveTask}`);
  }
}

/**
 * Initialize the automation
 */
function init() {
  console.log('%c=== VS Code Copilot Auto-Continue v2.3 INITIALIZATION ===', 'font-weight: bold; font-size: 16px; color: #2196F3;');
  console.log('[auto] 🚀 Starting initialization process...');
  
  try {
    // Check for multiple instances to prevent conflicts
    if (window.autoContinueInstanceId && window.autoContinueInstanceId !== 'stopped') {
      console.warn('[auto] ⚠️  Detected potential multiple instances! Current instance ID:', window.autoContinueInstanceId);
      console.log('[auto] 🧹 Forcing cleanup of previous instance...');
      
      // Force cleanup of any lingering intervals/observers
      if (typeof window.autoContinueIntervals !== 'undefined') {
        window.autoContinueIntervals.forEach(id => {
          try {
            clearInterval(id);
            console.log('[auto] 🧹 Cleared lingering interval:', id);
          } catch (e) {}
        });
      }
      if (typeof window.autoContinueObservers !== 'undefined') {
        window.autoContinueObservers.forEach(obs => {
          try {
            obs.disconnect();
            console.log('[auto] 🧹 Disconnected lingering observer');
          } catch (e) {}
        });
      }
    }
    
    // Set a unique instance ID and initialize tracking arrays
    window.autoContinueInstanceId = 'instance_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    window.autoContinueIntervals = [];
    window.autoContinueObservers = [];
    console.log('[auto] 🆔 New instance ID:', window.autoContinueInstanceId);
    
    // Clean up any existing automation (silently)
    if (window.autoContinue && window.autoContinue.stop) {
      console.log('[auto] 🧹 Cleaning up any existing automation...');
      // Temporarily store the original stop function
      const originalStop = window.autoContinue.stop;
      // Create a silent version that doesn't log success messages
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
          
          // Reset state
          lastClick = 0;
          isProcessing = false;
          retryCount = 0;
          
          return true;
        } catch (error) {
          console.error('[auto] ❌ Error during cleanup:', error);
          return false;
        }
      };
      
      // Call the silent cleanup
      window.autoContinue.stop();
      
      // Restore the original stop function
      window.autoContinue.stop = originalStop;
    }
    
    console.log('[auto] ⏰ Setting up main interval timer...');
    // Set up the main interval
    intervalId = setInterval(() => {
      checkAndContinue().catch(console.error);
    }, CHECK_INTERVAL);
    
    // Track this interval globally for cleanup
    if (window.autoContinueIntervals) {
      window.autoContinueIntervals.push(intervalId);
    }
    
    console.log(`[auto] ✅ Main interval set to ${CHECK_INTERVAL/1000}s`);
    
    // Set up periodic cleanup of click markers (every 30 seconds)
    const cleanupInterval = setInterval(() => {
      try {
        const clickedButtons = document.querySelectorAll('[data-auto-continue-clicked="true"]');
        if (clickedButtons.length > 0) {
          clickedButtons.forEach(btn => btn.removeAttribute('data-auto-continue-clicked'));
          console.log(`[auto] 🧹 Periodic cleanup: cleared ${clickedButtons.length} click markers`);
        }
      } catch (e) {
        console.log('[auto] ❌ Error in periodic cleanup:', e);
      }
    }, 30000); // 30 seconds
    
    // Store cleanup interval ID for later cleanup and track globally
    window.autoCleanupInterval = cleanupInterval;
    if (window.autoContinueIntervals) {
      window.autoContinueIntervals.push(cleanupInterval);
    }

    console.log('[auto] 👁️  Setting up DOM change observer...');
    // Set up MutationObserver
    setupMutationObserver();

    console.log('[auto] ⏳ Scheduling initial check in 2 seconds...');
    // Initial check after a short delay
    setTimeout(() => {
      console.log('[auto] 🎬 Running initial automation check...');
      checkAndContinue().catch(console.error);
    }, 2000);

    console.log('%c=== AUTOMATION STARTED SUCCESSFULLY! ===', 'font-weight: bold; font-size: 14px; color: #4CAF50;');
    console.log('%c🚀 VS Code Copilot Auto-Continue is now running!', 'color: #4CAF50; font-weight: bold;');
    console.log('📋 Available commands:');
    console.log('  • autoContinue.stop()      - Stop the automation');
    console.log('  • autoContinue.debug()     - Show debug information');
    console.log('  • autoContinue.toggle()    - Toggle debug mode');
    console.log('  • autoContinue.restart()   - Restart the automation');
    console.log('  • autoContinue.forceAction() - Force immediate action check');
    console.log('⚙️  Current settings:');
    console.log(`  • Button cooldown: ${BUTTON_COOLDOWN_MS/1000}s`);
    console.log(`  • Check interval: ${CHECK_INTERVAL/1000}s`);
    console.log('🔧 To enable debug mode: autoContinue.toggle()');
    console.log('🛑 To stop: autoContinue.stop()');
    console.log('%c[auto] 📊 Initialization complete - watching for Copilot activity...', 'color: #2196F3; font-weight: bold;');
    
    return true;
  } catch (error) {
    console.error('[auto] ❌ Critical error initializing automation:', error);
    return false;
  }
}

// Initialize the global autoContinue object with enhanced features
const autoContinue = {
  start: init,
  stop: function() {
    let wasRunning = intervalId !== null || observer !== null;
    
    if (wasRunning) {
      console.log('[auto] 🛑 Stopping automation...');
    }
    
    try {
      let stoppedSomething = false;
      
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        console.log('[auto] ✅ Main interval cleared');
        stoppedSomething = true;
      }
      if (observer) {
        observer.disconnect();
        observer = null;
        console.log('[auto] ✅ DOM observer disconnected');
        stoppedSomething = true;
      }
      if (window.autoCheckTimeout) {
        clearTimeout(window.autoCheckTimeout);
        console.log('[auto] ✅ Pending timeouts cleared');
        stoppedSomething = true;
      }
      if (window.autoCleanupInterval) {
        clearInterval(window.autoCleanupInterval);
        console.log('[auto] ✅ Cleanup interval cleared');
        stoppedSomething = true;
      }
      
      // Clean up all tracked intervals and observers
      if (window.autoContinueIntervals) {
        window.autoContinueIntervals.forEach(id => {
          try {
            clearInterval(id);
          } catch (e) {}
        });
        window.autoContinueIntervals = [];
        console.log('[auto] ✅ All tracked intervals cleared');
      }
      
      if (window.autoContinueObservers) {
        window.autoContinueObservers.forEach(obs => {
          try {
            obs.disconnect();
          } catch (e) {}
        });
        window.autoContinueObservers = [];
        console.log('[auto] ✅ All tracked observers disconnected');
      }
      
      // Reset state
      lastClick = Date.now();
      isProcessing = false;
      retryCount = 0;
      
      // Mark instance as stopped
      window.autoContinueInstanceId = 'stopped';
      
      // Clear any existing click markers
      try {
        const clickedButtons = document.querySelectorAll('[data-auto-continue-clicked="true"]');
        clickedButtons.forEach(btn => btn.removeAttribute('data-auto-continue-clicked'));
        if (clickedButtons.length > 0) {
          console.log(`[auto] 🧹 Cleared ${clickedButtons.length} click markers`);
        }
      } catch (e) {
        console.log('[auto] ❌ Error clearing click markers:', e);
      }
      
      // Only show success message if we actually stopped something
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
  setButtonCooldown: function(seconds) {
    BUTTON_COOLDOWN_MS = seconds * 1000;
    console.log(`[auto] ⏱️  Button cooldown set to ${seconds} seconds`);
  },
  forceAction: function() {
    console.log('[auto] 🔧 Forcing action check...');
    checkAndContinue().catch(console.error);
  },
  version: '2.3.0'
};

// Assign to window and start
window.autoContinue = autoContinue;

// Auto-stop any existing instance before starting new one
console.log('[auto] 🔍 Checking for existing automation instances...');
if (typeof window.autoContinue !== 'undefined' && window.autoContinue && typeof window.autoContinue.stop === 'function') {
  console.log('[auto] ⚠️  Found existing automation instance, stopping it first...');
  try {
    window.autoContinue.stop();
    console.log('[auto] ✅ Previous instance stopped successfully');
  } catch (error) {
    console.warn('[auto] ⚠️  Error stopping previous instance:', error);
  }
  // Wait a moment for cleanup to complete
  setTimeout(() => {
    console.log('[auto] 🚀 Starting new automation instance...');
    init();
  }, 500);
} else {
  console.log('[auto] ✅ No existing instance found, starting fresh...');
  init();
}
