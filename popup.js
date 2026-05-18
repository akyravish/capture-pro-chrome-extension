const statusEl = document.getElementById('status');
const statusText = document.getElementById('statusText');

function showStatus(msg, type = 'info') {
  statusEl.className = `status show ${type}`;
  statusText.textContent = msg;
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function sendToContent(action) {
  const tab = await getActiveTab();

  // Check if this is a restricted page (chrome://, etc.)
  if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
    showStatus('Cannot run on browser system pages.', 'error');
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, { action });
    window.close();
  } catch (err) {
    // Content script may not be injected yet (e.g., page loaded before extension)
    // Inject it manually then retry
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      await chrome.tabs.sendMessage(tab.id, { action });
      window.close();
    } catch (err2) {
      showStatus('Could not connect to page. Try reloading it.', 'error');
    }
  }
}

document.getElementById('btnPickElement').addEventListener('click', () => {
  showStatus('Opening area selector…', 'info');
  sendToContent('startAreaSelector');
});

document.getElementById('btnRecord').addEventListener('click', () => {
  showStatus('Starting screen capture…', 'info');
  sendToContent('startRecording');
});
