// To see the logs and check if the script is working,
// open the Developer Tools in VS Code.
// You can do this by going to Help > Toggle Developer Tools,
// and then opening the Console tab.
// The script will print a message every time it clicks a button.

(function(){
  const COOLDOWN_MS = 2500;
  let lastClick = 0;

  function clickIfFound() {
    const now = Date.now();
    if (now - lastClick < COOLDOWN_MS) return;

    // Continue
    const continueBtn = Array.from(
      document.querySelectorAll('a.monaco-button[role="button"], button.monaco-button')
    ).find(el => /continue/i.test(el.textContent?.trim()));
    if (continueBtn) {
      continueBtn.click();
      lastClick = now;
      console.log('[auto] Clicked Continue');
    }

    // Keep
    const keepBtn = Array.from(
      document.querySelectorAll('a.action-label[role="button"]')
    ).find(el => /^keep$/i.test(el.textContent?.trim()));
    if (keepBtn) {
      keepBtn.click();
      lastClick = now;
      console.log('[auto] Clicked Keep');
    }
  }

  const intervalId = setInterval(clickIfFound, 1000);
  const observer   = new MutationObserver(clickIfFound);
  observer.observe(document.body, { childList: true, subtree: true });

  // To stop, run this in the console:
  // clearInterval(intervalId);
  // observer.disconnect();
})();
