// ── State ────────────────────────────────────────────────────────────────────
const state = {
  tabSound:   true,
  resolution: '720',
  format:     'png',
  delay:      0
};

// ── Helpers ──────────────────────────────────────────────────────────────────
async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function isRestrictedUrl(url) {
  if (!url) return true;
  return ['chrome://', 'chrome-extension://', 'edge://', 'about:'].some(p => url.startsWith(p));
}

function showStatus(panelId, msg, type = 'info') {
  const el   = document.getElementById(panelId);
  const text = document.getElementById(panelId + 'Text');
  el.className = `status show ${type}`;
  text.textContent = msg;
}

async function sendToContent(action, extra = {}) {
  const tab = await getActiveTab();

  if (isRestrictedUrl(tab.url)) {
    showStatus('statusCapture', 'Cannot run on browser system pages.', 'error');
    return;
  }

  const msg = { action, ...extra };

  async function dispatch() {
    await chrome.tabs.sendMessage(tab.id, msg);
    window.close();
  }

  try {
    await dispatch();
  } catch {
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
      await dispatch();
    } catch {
      const statusId = action === 'startRecording' ? 'statusRecord' : 'statusCapture';
      showStatus(statusId, 'Could not connect to page. Try reloading it.', 'error');
    }
  }
}

// ── Tab switching ─────────────────────────────────────────────────────────────
document.getElementById('tabCapture').addEventListener('click', () => {
  document.getElementById('tabCapture').classList.add('active');
  document.getElementById('tabRecord').classList.remove('active');
  document.getElementById('panelCapture').classList.add('active');
  document.getElementById('panelRecord').classList.remove('active');
});

document.getElementById('tabRecord').addEventListener('click', () => {
  document.getElementById('tabRecord').classList.add('active');
  document.getElementById('tabCapture').classList.remove('active');
  document.getElementById('panelRecord').classList.add('active');
  document.getElementById('panelCapture').classList.remove('active');
});

// ── Source cards ──────────────────────────────────────────────────────────────
let selectedCard = null;

document.querySelectorAll('.source-card').forEach(card => {
  card.addEventListener('click', () => {
    if (selectedCard) selectedCard.classList.remove('selected');
    card.classList.add('selected');
    selectedCard = card;

    const action = card.dataset.action;
    const labels = {
      startAreaSelector:    'Opening area selector…',
      startViewportCapture: 'Capturing viewport…',
      startFullPageCapture: 'Starting full-page capture…'
    };

    showStatus('statusCapture', labels[action] || 'Starting…', 'info');
    sendToContent(action, { format: state.format, delay: state.delay });
  });
});

// ── Format buttons ────────────────────────────────────────────────────────────
document.querySelectorAll('[data-format]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-format]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.format = btn.dataset.format;
  });
});

// ── Delay buttons ─────────────────────────────────────────────────────────────
document.querySelectorAll('[data-delay]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-delay]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.delay = parseInt(btn.dataset.delay, 10);
  });
});

// ── Tab sound toggle ──────────────────────────────────────────────────────────
document.getElementById('toggleTabSound').addEventListener('change', (e) => {
  state.tabSound = e.target.checked;
});

// ── Quality buttons ───────────────────────────────────────────────────────────
const ctaResLabel = document.getElementById('ctaResLabel');

document.querySelectorAll('.quality-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.quality-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.resolution = btn.dataset.res;
    ctaResLabel.textContent = `(${btn.dataset.res}p)`;
  });
});

// ── Start recording ───────────────────────────────────────────────────────────
document.getElementById('btnStartRecord').addEventListener('click', async () => {
  const tab = await getActiveTab();

  if (isRestrictedUrl(tab.url)) {
    showStatus('statusRecord', 'Cannot record browser system pages.', 'error');
    return;
  }

  showStatus('statusRecord', 'Starting screen capture…', 'info');

  sendToContent('startRecording', {
    tabSound:   state.tabSound,
    resolution: state.resolution
  });
});
