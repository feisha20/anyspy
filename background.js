chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: () => {
      const isActive = document.body.getAttribute('data-anyspy-active') === 'true';
      if (isActive) {
        document.body.removeAttribute('data-anyspy-active');
        document.dispatchEvent(new CustomEvent('ANYSPY_TOGGLE', { detail: false }));
      } else {
        document.body.setAttribute('data-anyspy-active', 'true');
        document.dispatchEvent(new CustomEvent('ANYSPY_TOGGLE', { detail: true }));
      }
    }
  });
});
