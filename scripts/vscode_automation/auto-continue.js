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
                // Check if element is excluded (static indicator)
                const isExcluded = excludedStaticIndicators.some(excludeSelector => {
                  return el.matches(excludeSelector) || el.closest(excludeSelector);
                });

                if (isExcluded) {
                  console.log(`[auto] 🚫 Excluded static indicator: ${el.className}`);
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
                    console.log(`[auto] 🎯 Active element found:`, elementInfo);
                    return true;
                  } else {
                    console.log(`[auto] 🟠 Element found but not active: ${el.className}`);
                  }
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
        console.log(`[auto] 📝 Found ${textBasedBusyElements.length} elements with active busy text content`);
        for (const el of textBasedBusyElements.slice(0, 3)) { // Check first 3
          const rect = el.getBoundingClientRect();
          const isVisible = rect.width > 0 && rect.height > 0 && el.offsetParent !== null;
          if (isVisible) {
            console.log(`[auto] 📝 Active busy text element: "${el.textContent.trim().substring(0, 50)}"`);
            console.log('%c[auto] 🟡 === ACTIVE TASK DETECTED (TEXT-BASED) ===', 'font-weight: bold; background: #fff3cd; color: #856404;');
            return true;
          }
        }
      }
    } catch (textError) {
      console.log('[auto] ❌ Error in text-based detection:', textError.message);
    }

    // Final check: Look for actual spinning/loading animations
    try {
      const spinningElements = Array.from(document.querySelectorAll('.codicon-loading, .codicon-sync-spin, [class*="spin"], [class*="rotate"]')).filter(el => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        const isVisible = rect.width > 0 && rect.height > 0 && el.offsetParent !== null;
        const isAnimated = style.animationName !== 'none' || style.animationDuration !== '0s';

        if (isVisible && isAnimated) {
          console.log(`[auto] 🌀 Found animated loading element: ${el.className}`);
          return true;
        }
        return false;
      });

      if (spinningElements.length > 0) {
        console.log('%c[auto] 🟡 === ACTIVE TASK DETECTED (ANIMATION-BASED) ===', 'font-weight: bold; background: #fff3cd; color: #856404;');
        return true;
      }
    } catch (animationError) {
      console.log('[auto] ❌ Error in animation-based detection:', animationError.message);
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
    console.log('[auto] 🔍 Checking for input field...');

    const inputSelectors = [
      // VS Code Copilot Chat specific selectors (based on source analysis)
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

      // Broader search for any contenteditable or textarea in chat areas
      '.chat-container [contenteditable="true"]',
      '.copilot-chat [contenteditable="true"]',
      '.interactive-session [contenteditable="true"]',
      '.interactive-input-part [contenteditable="true"]',
      '.chat-input-container [contenteditable="true"]',
      '.chat-container textarea',
      '.copilot-chat textarea'
    ];

    for (const selector of inputSelectors) {
      try {
        const inputs = Array.from(document.querySelectorAll(selector));
        console.log(`[auto] 📋 Found ${inputs.length} elements for selector: ${selector}`);

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
            console.log('[auto] ✅ Found ready input field:', inputInfo);
            return input;
          } else {
            const rejectReason = !isVisible ? 'not visible' :
                               isExplicitlyDisabled ? 'explicitly disabled' :
                               (!inChatContext && !hasInputContext) ? 'not in chat context' : 'unknown';
            console.log(`[auto] 🟠 Input rejected (${rejectReason}):`, {
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
        console.log(`[auto] ❌ Selector error for ${selector}:`, selectorError.message);
        continue;
      }
    }

    // Enhanced fallback: search more broadly for any focusable element in chat areas
    try {
      console.log('[auto] 🔍 Enhanced fallback: searching for any chat input elements...');

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
          console.log('[auto] ✅ Using enhanced fallback input:', {
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
        console.log(`[auto] 📋 Found ${chatFocusable.length} focusable elements in chat areas`);
        const bestMatch = chatFocusable[0]; // Take the first one
        console.log('[auto] ✅ Using final fallback input:', {
          tag: bestMatch.tagName,
          contentEditable: bestMatch.contentEditable,
          role: bestMatch.getAttribute('role')
        });
        return bestMatch;
      }
    } catch (fallbackError) {
      console.log('[auto] ❌ Error in fallback search:', fallbackError.message);
    }

    console.log('[auto] ❌ No input field found');
    return null;
  } catch (error) {
    console.error('[auto] ❌ Error in isInputReady:', error);
    return null;
  }
}

async function sendPrompt() {
  try {
    const prompt = "Continue executing the current task if it exists or do tasks on the dartboard iteratively until no uncompleted tasks left. Use build_run_rules, general, product_requirements_design instructions.md files.";
    const input = isInputReady();

    if (input) {
      const previouslyFocusedElement = document.activeElement;
      console.log('[auto] 🧠 Storing previously focused element:', previouslyFocusedElement);

      console.log('[auto] 📝 Input field found, setting prompt text...');
      input.focus();
      
      // Clear the input field first
      document.execCommand('selectAll', false, null);
      document.execCommand('delete', false, null);

      // Simulate typing character by character
      for (let i = 0; i < prompt.length; i++) {
        const char = prompt[i];
        const charCode = char.charCodeAt(0);

        // Simulate keydown, keypress, and keyup events
        input.dispatchEvent(new KeyboardEvent('keydown', { key: char, charCode: charCode, keyCode: charCode, which: charCode, bubbles: true, cancelable: true }));
        input.dispatchEvent(new KeyboardEvent('keypress', { key: char, charCode: charCode, keyCode: charCode, which: charCode, bubbles: true, cancelable: true }));
        
        // Insert the character
        document.execCommand('insertText', false, char);

        input.dispatchEvent(new KeyboardEvent('keyup', { key: char, charCode: charCode, keyCode: charCode, which: charCode, bubbles: true, cancelable: true }));
        
        // Small delay between characters to mimic human typing
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      console.log('[auto] ✅ Prompt text typed into the input field.');

      // Press Enter to send the prompt
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
      console.log('[auto] ✅ "Enter" key pressed to send prompt.');

      // Restore focus to the previously active element
      if (previouslyFocusedElement && typeof previouslyFocusedElement.focus === 'function') {
        console.log('[auto] ↩️ Restoring focus to previous element...');
        previouslyFocusedElement.focus();
      }
      return true;
    } else {
      console.log('[auto] ❌ No input field available for sending prompt');
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
          const promptSent = await sendPrompt();
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
