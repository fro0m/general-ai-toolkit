/**
 * VS Code Copilot Auto-Continue Script
 * 
 * This script automates interactions with VS Code's Copilot Chat by:
 * 1. Automatically clicking common action buttons (Continue, Try Again, Keep)
 * 2. Sending a continuation prompt when the chat is idle
 * 3. Managing cooldowns between actions to prevent rate limiting
 * 
 * ===========================================================================
 * 🚀 HOW TO START:
 * 1. Open VS Code's Developer Tools (Help > Toggle Developer Tools or Ctrl+Shift+I)
 * 2. Go to the Console tab
 * 3. Paste this entire script and press Enter to execute
 *
 * 🛑 HOW TO STOP:
 * To stop the automation, run these commands in the same Console tab:
 * 1. clearInterval(intervalId);
 * 2. observer.disconnect();
 * 3. console.log('[auto] Automation has been stopped');
 * 
 * Note: The script will automatically stop if you close the Developer Tools.
 * ===========================================================================
 * 
 * FEATURES:
 * - Automatically clicks "Continue", "Try Again", and "Keep" buttons
 * - Sends a continuation prompt when no actions are available
 * - Respects cooldown periods between actions
 * - Logs all actions to the console for monitoring
 * 
 * CONFIGURATION (modify at the top of the script):
 * - BUTTON_COOLDOWN_MS: Minimum time between button clicks (default: 2500ms)
 * - PROMPT_COOLDOWN_MS: Minimum time between sending prompts (default: 20 minutes)
 * - BUTTONS_TO_CLICK: List of buttons to automatically click with their selectors
 *
 * Based on: https://github.com/PawiX25/copilot-auto-continue
 */

(function(){
  const BUTTON_COOLDOWN_MS = 2500;
  const PROMPT_COOLDOWN_MS = 0; // No cooldown between prompts
  let lastClick = 0;

  const BUTTONS_TO_CLICK = [
    {
      selector: 'a.monaco-button[role="button"], button.monaco-button',
      text: /continue/i,
      name: 'Continue'
    },
    {
      selector: 'a.monaco-button[role="button"], button.monaco-button',
      text: /try again/i,
      name: 'Try Again'
    },
    {
      selector: 'a.action-label[role="button"]',
      text: /^keep$/i,
      name: 'Keep'
    }
  ];

  function isTaskActive() {
    // Check if there are any active task indicators in the chat
    const activeTaskIndicators = [
      { selector: 'div[class*="typing"]', name: 'typing indicator' },
      { selector: 'div[class*="progress"]', name: 'progress indicator' },
      { selector: 'div[class*="loading"]', name: 'loading indicator' },
      { selector: 'button[aria-label*="Stop"]', name: 'stop button (aria-label)' },
      { selector: 'button[title*="Stop"]', name: 'stop button (title)' },
      { selector: 'div[class*="response"][class*="streaming"], div[class*="response"][class*="generating"]', name: 'streaming/generating response' },
      { selector: 'div[class*="markdown"][class*="typing"]', name: 'markdown typing indicator' }
    ];
    
    // Debug: Log all found elements
    const debugInfo = [];
    let isActive = false;
    
    for (const { selector, name } of activeTaskIndicators) {
      const elements = Array.from(document.querySelectorAll(selector));
      if (elements.length > 0) {
        debugInfo.push(`Found ${elements.length} ${name} elements`);
        isActive = true;
      }
    }
    
    // Additional debug: Check for any visible loading indicators
    const loadingElements = Array.from(document.querySelectorAll('div[class*="loading"], div[class*="spinner"], div[class*="progress"]'));
    const visibleLoading = loadingElements.some(el => 
      el.offsetParent !== null && 
      window.getComputedStyle(el).display !== 'none' &&
      window.getComputedStyle(el).visibility !== 'hidden'
    );
    
    if (visibleLoading) {
      debugInfo.push('Found visible loading indicator');
      isActive = true;
    }
    
    if (debugInfo.length > 0) {
      console.debug('[auto] Task active - Detected:', debugInfo.join(', '));
    } else if (!isActive) {
      console.log('[auto] No active task detected - System is idle');
      // Add a timestamp for better tracking
      console.debug(`[auto] Last activity check: ${new Date().toISOString()}`);
    }
    
    return isActive;
  }

  function isInputReady() {
    const inputSelectors = [
      'div[role="textbox"][contenteditable="true"]',
      'textarea[placeholder*="Ask"]',
      'textarea[placeholder*="Message"]'
    ];
    
    for (const selector of inputSelectors) {
      const input = document.querySelector(selector);
      if (input) {
        const isDisabled = input.getAttribute('aria-disabled') === 'true' || 
                         input.disabled || 
                         input.getAttribute('disabled') !== null ||
                         window.getComputedStyle(input).display === 'none' ||
                         window.getComputedStyle(input).visibility === 'hidden';
        
        console.debug(`[auto] Input ready check: ${selector} - ${!isDisabled ? 'READY' : 'NOT READY'}`);
        
        if (!isDisabled) {
          return true;
        }
      }
    }
    
    console.debug('[auto] No enabled input field found');
    return false;
  }

  function sendPrompt() {
    const prompt = "Continue executing the current task if it exists or do tasks on the dartboard iteratively until no uncompleted tasks left. Use build_run_rules, general, product_requirements_design instructions.md files.";
    const input = document.querySelector('div[role="textbox"][contenteditable="true"]');
    
    if (input && isInputReady()) {
      // Set the prompt text
      input.textContent = prompt;
      
      // Create and dispatch input event
      const event = new InputEvent('input', {
        bubbles: true,
        cancelable: true,
      });
      input.dispatchEvent(event);
      
      // Find and click the send button
      const sendButton = document.querySelector('button[title*="Send"]:not([disabled]), button[aria-label*="Send"]:not([disabled])');
      if (sendButton) {
        sendButton.click();
        console.log('[auto] Sent continuation prompt to Copilot Chat');
      }
    }
  }

  function checkAndContinue() {
    const now = Date.now();
    console.debug(`[auto] Checking for actions... (${new Date().toISOString()})`);
    
    // First check if there's an active task
    const hasActiveTask = isTaskActive();
    console.debug(`[auto] Active task detected: ${hasActiveTask}`);
    
    // Check for buttons to click if cooldown has passed
    let foundButton = false;
    if (!hasActiveTask && now - lastClick >= BUTTON_COOLDOWN_MS) {
      console.debug('[auto] No active task, checking for buttons...');
      for (const button of BUTTONS_TO_CLICK) {
        const buttons = Array.from(document.querySelectorAll(button.selector))
          .filter(el => button.text.test(el.textContent?.trim()));
          
        console.debug(`[auto] Found ${buttons.length} potential '${button.name}' buttons`);
        
        const btn = buttons.find(btn => {
          const style = window.getComputedStyle(btn);
          const isVisible = btn.offsetParent !== null && 
                          style.display !== 'none' && 
                          style.visibility !== 'hidden' &&
                          style.opacity !== '0';
          console.debug(`[auto] Button '${button.name}' visibility: ${isVisible ? 'VISIBLE' : 'HIDDEN'}`);
          return isVisible;
        });

        if (btn) {
          console.log(`[auto] Clicking '${button.name}' button`);
          btn.click();
          lastClick = now;
          foundButton = true;
          console.log(`[auto] Clicked ${button.name}`);
          return; // Exit after clicking one button
        }
      }
    } else if (now - lastClick < BUTTON_COOLDOWN_MS) {
      console.debug(`[auto] Button cooldown active. Next check in ${Math.ceil((BUTTON_COOLDOWN_MS - (now - lastClick)) / 1000)}s`);
    }
    
    // If no buttons were clicked and no active task, send a prompt
    if (!hasActiveTask && !foundButton) {
      console.debug('[auto] No active task and no buttons to click, checking if we should send prompt...');
      if (isInputReady()) {
        console.log('[auto] No active task, sending continuation prompt...');
        sendPrompt();
      } else {
        console.debug('[auto] Input not ready for sending prompt');
      }
    }
  }

  // Set up the main interval for checking
  const intervalId = setInterval(checkAndContinue, 1000);
  
  // Set up mutation observer to watch for DOM changes
  const observer = new MutationObserver(checkAndContinue);
  observer.observe(document.body, { 
    childList: true, 
    subtree: true,
    attributes: true,
    characterData: true
  });

  console.log('[auto] VS Code Copilot Chat automation script is running');
  console.log(`[auto] Will automatically send prompt every ${PROMPT_COOLDOWN_MS / 1000 / 60} minutes when idle`);
})();