/**
 * VS Code Copilot Auto-Continue Script
 * 
 * This script automates interactions with VS Code's Copilot Chat by:
 * 1. Automatically clicking common action buttons (Continue, Try Again, Keep)
 * 2. Sending a continuation prompt when the chat is idle
 * 3. Managing cooldowns between actions to prevent rate limiting
 * 
 * Usage Instructions:
 * 1. Open VS Code's Developer Tools (Help > Toggle Developer Tools)
 * 2. Go to the Console tab
 * 3. Paste this script and press Enter to execute
 * 
 * Features:
 * - Automatically clicks "Continue", "Try Again", and "Keep" buttons
 * - Sends a continuation prompt when no actions are available
 * - Respects cooldown periods between actions
 * - Logs all actions to the console for monitoring
 * 
 * Configuration:
 * - BUTTON_COOLDOWN_MS: Minimum time between button clicks (default: 2500ms)
 * - PROMPT_COOLDOWN_MS: Minimum time between sending prompts (default: 20 minutes)
 * - BUTTONS_TO_CLICK: List of buttons to automatically click with their selectors
 *
 * Based on: https://github.com/PawiX25/copilot-auto-continue
 * 
 * To stop the script, run in console:
 * clearInterval(intervalId);
 * observer.disconnect();
 * 
 */

(function(){
  const BUTTON_COOLDOWN_MS = 2500;
  const PROMPT_COOLDOWN_MS = 20 * 60 * 1000; // 20 minutes
  let lastClick = 0;
  let lastPromptTime = 0;

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
    } else {
      console.debug('[auto] No active task indicators found');
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
    const now = Date.now();
    if (now - lastPromptTime < PROMPT_COOLDOWN_MS) {
      console.log(`[auto] Prompt cooldown active. Next prompt available in ${Math.ceil((PROMPT_COOLDOWN_MS - (now - lastPromptTime)) / 1000 / 60)} minutes`);
      return;
    }

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
        lastPromptTime = now;
        console.log('[auto] Sent continuation prompt to Copilot Chat');
      }
    }
  }

  function checkAndContinue() {
    const now = Date.now();
    console.debug(`[auto] Checking for actions... (${new Date().toISOString()})`);
    
    // Check for buttons to click first
    let foundButton = false;
    if (now - lastClick >= BUTTON_COOLDOWN_MS) {
      console.debug('[auto] Checking for buttons to click...');
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
    
    // Check if we should send a prompt
    if (!foundButton) {
      console.debug('[auto] No buttons to click, checking if we should send prompt...');
      const taskActive = isTaskActive();
      const inputReady = isInputReady();
      
      console.debug(`[auto] Task active: ${taskActive}, Input ready: ${inputReady}`);
      
      if (!taskActive && inputReady) {
        console.log('[auto] Conditions met, attempting to send prompt...');
        sendPrompt();
      } else {
        if (taskActive) console.debug('[auto] Not sending prompt: Task is active');
        if (!inputReady) console.debug('[auto] Not sending prompt: Input not ready');
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