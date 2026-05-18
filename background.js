// Service Worker — handles tab screenshot capture

let _isRecording = false;

function isRestrictedUrl(url) {
  if (!url) return true;
  return ['chrome://', 'chrome-extension://', 'edge://', 'about:'].some(p => url.startsWith(p));
}

chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || isRestrictedUrl(tab.url)) return;

  const actionMap = {
    'capture-area':     { action: 'startAreaSelector' },
    'capture-viewport': { action: 'startViewportCapture' },
    'capture-fullpage': { action: 'printPage' },
  };

  if (actionMap[command]) {
    chrome.tabs.sendMessage(tab.id, actionMap[command]).catch(() => {
      chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] })
        .then(() => chrome.tabs.sendMessage(tab.id, actionMap[command]));
    });
    return;
  }

  if (command === 'toggle-recording') {
    const msgAction = _isRecording ? 'stopRecording' : 'startRecording';
    chrome.tabs.sendMessage(tab.id, { action: msgAction }).catch(() => {
      if (!_isRecording) {
        chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] })
          .then(() => chrome.tabs.sendMessage(tab.id, { action: 'startRecording' }));
      }
    });
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'recordingStateChanged') {
    _isRecording = msg.recording;
    return;
  }

  // ── Selected-area capture ────────────────────────────────────────────────
  if (msg.action === 'captureElement') {
    const { rect, devicePixelRatio, format } = msg;
    const tabId    = sender.tab?.id;
    const windowId = sender.tab?.windowId;

    if (!tabId || !windowId) { console.error('[Capture Pro] Missing sender tab info.'); return; }

    chrome.tabs.captureVisibleTab(windowId, { format: 'png', quality: 100 }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        chrome.tabs.sendMessage(tabId, { action: 'cropAndCopy', error: chrome.runtime.lastError.message });
        return;
      }
      chrome.tabs.sendMessage(tabId, { action: 'cropAndCopy', dataUrl, rect, dpr: devicePixelRatio || 1, format });
    });

    return true;
  }

  // ── Visible-viewport capture ─────────────────────────────────────────────
  if (msg.action === 'captureViewport') {
    const { format } = msg;
    const tabId    = sender.tab?.id;
    const windowId = sender.tab?.windowId;

    if (!tabId || !windowId) { console.error('[Capture Pro] Missing sender tab info.'); return; }

    chrome.tabs.captureVisibleTab(windowId, { format: 'png', quality: 100 }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        chrome.tabs.sendMessage(tabId, { action: 'showCapturePanel', error: chrome.runtime.lastError.message });
        return;
      }
      chrome.tabs.sendMessage(tabId, { action: 'showCapturePanel', dataUrl, format });
    });

    return true;
  }

  // ── Full-page (scroll-and-stitch) capture ────────────────────────────────
  if (msg.action === 'captureFullPage') {
    const { totalHeight, viewportHeight, devicePixelRatio, format } = msg;
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
          }).then(() => setTimeout(captureNext, 500));
        } else {
          // All strips collected — stitch in content script
          chrome.tabs.sendMessage(tabId, {
            action: 'stitchAndShow',
            strips,
            totalHeight: clampedH,
            viewportHeight,
            dpr,
            format
          });
        }
      });
    }

    captureNext();
    return true;
  }

});
