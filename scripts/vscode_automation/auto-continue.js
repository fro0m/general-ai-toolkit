// To see the logs and check if the script is working,
// open the Developer Tools in VS Code.
// You can do this by going to Help > Toggle Developer Tools,
// and then opening the Console tab.
// The script will print a message every time it clicks a button.

(function(){
  const COOLDOWN_MS = 2500;
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

  function clickIfFound() {
    const now = Date.now();
    if (now - lastClick < COOLDOWN_MS) return;

    for (const button of BUTTONS_TO_CLICK) {
      const btn = Array.from(document.querySelectorAll(button.selector))
        .find(el => button.text.test(el.textContent?.trim()));

      if (btn) {
        btn.click();
        lastClick = now;
        console.log(`[auto] Clicked ${button.name}`);
        return; // Click only one button per cooldown period
      }
    }
  }

  const intervalId = setInterval(clickIfFound, 1000);
  const observer   = new MutationObserver(clickIfFound);
  observer.observe(document.body, { childList: true, subtree: true });

  // To stop, run this in the console:
  // clearInterval(intervalId);
  // observer.disconnect();
})();