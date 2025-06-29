// To see the logs and check if the script is working,
// open the Developer Tools in VS Code.
// You can do this by going to Help > Toggle Developer Tools,
// and then opening the Console tab.
// The script will print a message for all its actions.

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
      'div[class*="typing"]',
      'div[class*="progress"]',
      'div[class*="loading"]',
      'button[aria-label*="Stop"]',
      'button[title*="Stop"]'
    ];
    
    return activeTaskIndicators.some(selector => 
      document.querySelector(selector) !== null
    );
  }

  function isInputReady() {
    const input = document.querySelector('div[role="textbox"][contenteditable="true"]');
    return input && !input.getAttribute('aria-disabled');
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
    
    // Check for buttons to click first
    let foundButton = false;
    if (now - lastClick >= BUTTON_COOLDOWN_MS) {
      for (const button of BUTTONS_TO_CLICK) {
        const btn = Array.from(document.querySelectorAll(button.selector))
          .find(el => button.text.test(el.textContent?.trim()));

        if (btn) {
          btn.click();
          lastClick = now;
          console.log(`[auto] Clicked ${button.name}`);
          foundButton = true;
          break; // Click only one button per cooldown period
        }
      }
    }
    
    // Only send prompt if no buttons were found to click, no active task, and input is ready
    if (!foundButton && !isTaskActive() && isInputReady()) {
      sendPrompt();
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

  // To stop the script, run this in the console:
  // clearInterval(intervalId);
  // observer.disconnect();
})();