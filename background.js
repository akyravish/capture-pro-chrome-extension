// Service Worker — handles tab screenshot capture

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  // ── Selected-area capture ────────────────────────────────────────────────
  if (msg.action === 'captureElement') {
    const { rect, devicePixelRatio } = msg;
    const tabId    = sender.tab?.id;
    const windowId = sender.tab?.windowId;

    if (!tabId || !windowId) { console.error('[Capture Pro] Missing sender tab info.'); return; }

    chrome.tabs.captureVisibleTab(windowId, { format: 'png', quality: 100 }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        chrome.tabs.sendMessage(tabId, { action: 'cropAndCopy', error: chrome.runtime.lastError.message });
        return;
      }
      chrome.tabs.sendMessage(tabId, { action: 'cropAndCopy', dataUrl, rect, dpr: devicePixelRatio || 1 });
    });

    return true;
  }

  // ── Visible-viewport capture ─────────────────────────────────────────────
  if (msg.action === 'captureViewport') {
    const tabId    = sender.tab?.id;
    const windowId = sender.tab?.windowId;

    if (!tabId || !windowId) { console.error('[Capture Pro] Missing sender tab info.'); return; }

    chrome.tabs.captureVisibleTab(windowId, { format: 'png', quality: 100 }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        chrome.tabs.sendMessage(tabId, { action: 'showCapturePanel', error: chrome.runtime.lastError.message });
        return;
      }
      chrome.tabs.sendMessage(tabId, { action: 'showCapturePanel', dataUrl });
    });

    return true;
  }

  // ── Full-page (scroll-and-stitch) capture ────────────────────────────────
  if (msg.action === 'captureFullPage') {
    const { totalHeight, viewportHeight, devicePixelRatio } = msg;
    const tabId    = sender.tab?.id;
    const windowId = sender.tab?.windowId;

    if (!tabId || !windowId) { console.error('[Capture Pro] Missing sender tab info.'); return; }

    const dpr        = devicePixelRatio || 1;
    const MAX_HEIGHT = 15000; // px cap to prevent runaway stitching
    const clampedH   = Math.min(totalHeight, MAX_HEIGHT);
    const strips     = [];
    let   scrollY    = 0;

    function captureNext() {
      chrome.tabs.captureVisibleTab(windowId, { format: 'png', quality: 100 }, (dataUrl) => {
        if (chrome.runtime.lastError) {
          chrome.tabs.sendMessage(tabId, { action: 'showCapturePanel', error: chrome.runtime.lastError.message });
          return;
        }

        strips.push({ dataUrl, scrollY });
        scrollY += viewportHeight;

        if (scrollY < clampedH) {
          // Scroll to next position and wait for paint
          chrome.scripting.executeScript({
            target: { tabId },
            func: (y) => window.scrollTo(0, y),
            args: [scrollY]
          }).then(() => setTimeout(captureNext, 150));
        } else {
          // All strips collected — stitch in content script
          chrome.tabs.sendMessage(tabId, {
            action: 'stitchAndShow',
            strips,
            totalHeight: clampedH,
            viewportHeight,
            dpr
          });
        }
      });
    }

    captureNext();
    return true;
  }

});
