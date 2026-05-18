// Service Worker — handles tab screenshot capture

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  if (msg.action === 'captureElement') {
    const { rect, devicePixelRatio } = msg;
    const tabId     = sender.tab?.id;
    const windowId  = sender.tab?.windowId;

    if (!tabId || !windowId) {
      console.error('[Capture Pro] Missing sender tab info.');
      return;
    }

    // Capture the visible area of the tab as a PNG data URL
    chrome.tabs.captureVisibleTab(windowId, { format: 'png', quality: 100 }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        console.error('[Capture Pro]', chrome.runtime.lastError.message);
        chrome.tabs.sendMessage(tabId, {
          action: 'cropAndCopy',
          error: chrome.runtime.lastError.message
        });
        return;
      }

      // Forward the full screenshot + rect to the content script for cropping
      chrome.tabs.sendMessage(tabId, {
        action: 'cropAndCopy',
        dataUrl,
        rect,
        dpr: devicePixelRatio || 1
      });
    });

    return true; // keep message channel open for async callback
  }

});
