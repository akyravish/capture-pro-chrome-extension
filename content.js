// Guard: only initialise once per page
if (!window.__captureProLoaded) {
  window.__captureProLoaded = true;

  /* ═══════════════════════════════════════════
     TOAST NOTIFICATION
  ═══════════════════════════════════════════ */
  function showToast(msg, type = 'info') {
    document.getElementById('__cp_toast')?.remove();

    const colors = {
      info:    { bg: '#1c1b2e', border: '#7c6af7', text: '#c4bcff' },
      success: { bg: '#0d2018', border: '#56d999', text: '#7fffc4' },
      error:   { bg: '#2a0e0e', border: '#f06060', text: '#ffaaaa' },
      rec:     { bg: '#2a0e0e', border: '#f06060', text: '#ff9999'  }
    };
    const c    = colors[type] || colors.info;
    const icon = { info: 'ℹ️', success: '✅', error: '❌', rec: '🔴' }[type];

    const toast = document.createElement('div');
    toast.id = '__cp_toast';
    toast.style.cssText = `
      position: fixed; bottom: 28px; left: 50%;
      transform: translateX(-50%) translateY(10px);
      background: ${c.bg}; border: 1px solid ${c.border}; color: ${c.text};
      padding: 10px 18px; border-radius: 10px;
      font-family: system-ui, sans-serif; font-size: 13px; font-weight: 500;
      z-index: 2147483647; box-shadow: 0 8px 24px rgba(0,0,0,0.5);
      display: flex; align-items: center; gap: 8px;
      opacity: 0; transition: opacity 0.2s, transform 0.2s;
      pointer-events: none; white-space: nowrap;
    `;
    toast.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
    document.documentElement.appendChild(toast);

    requestAnimationFrame(() => requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) translateY(0)';
    }));

    const ttl = type === 'rec' ? 999999 : 2800;
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(10px)';
      setTimeout(() => toast.remove(), 250);
    }, ttl);
  }

  /* ═══════════════════════════════════════════
     COPY / DOWNLOAD PANEL
  ═══════════════════════════════════════════ */
  let _panelDismissTimer = null;

  function showCapturePanel(blob) {
    document.getElementById('__cp_panel')?.remove();
    clearTimeout(_panelDismissTimer);

    const previewUrl = URL.createObjectURL(blob);

    const panel = document.createElement('div');
    panel.id = '__cp_panel';
    panel.innerHTML = `
      <style>
        #__cp_panel {
          position: fixed; bottom: 28px; right: 24px; z-index: 2147483647;
          background: #141418; border: 1px solid #242430; border-radius: 14px;
          padding: 14px; display: flex; align-items: center; gap: 14px;
          box-shadow: 0 12px 40px rgba(0,0,0,0.7);
          font-family: system-ui, sans-serif;
          animation: __cp_slideup 0.22s cubic-bezier(0.16,1,0.3,1);
        }
        @keyframes __cp_slideup {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        #__cp_preview {
          width: 80px; height: 54px; object-fit: cover;
          border-radius: 7px; border: 1px solid #242430; flex-shrink: 0;
        }
        .__cp_actions { display: flex; flex-direction: column; gap: 7px; }
        .__cp_btn {
          padding: 7px 14px; border-radius: 7px; border: 1px solid #242430;
          font-size: 12px; font-weight: 600; cursor: pointer;
          font-family: system-ui, sans-serif; transition: all 0.15s;
          display: flex; align-items: center; gap: 6px;
        }
        .__cp_btn-copy {
          background: rgba(124,106,247,0.15); color: #c4bcff;
          border-color: rgba(124,106,247,0.3);
        }
        .__cp_btn-copy:hover { background: rgba(124,106,247,0.28); }
        .__cp_btn-dl {
          background: rgba(86,217,153,0.1); color: #7fffc4;
          border-color: rgba(86,217,153,0.25);
        }
        .__cp_btn-dl:hover { background: rgba(86,217,153,0.22); }
        .__cp_close {
          position: absolute; top: 8px; right: 10px;
          background: none; border: none; color: #6b6b80;
          font-size: 16px; cursor: pointer; line-height: 1; padding: 2px;
        }
        .__cp_close:hover { color: #e8e8f0; }
      </style>
      <img id="__cp_preview" src="${previewUrl}" alt="capture preview" />
      <div class="__cp_actions">
        <button class="__cp_btn __cp_btn-copy" id="__cp_copy">📋 Copy</button>
        <button class="__cp_btn __cp_btn-dl"   id="__cp_dl">⬇️ Download</button>
      </div>
      <button class="__cp_close" id="__cp_close">×</button>
    `;

    document.documentElement.appendChild(panel);

    function dismiss() {
      panel.style.opacity = '0';
      panel.style.transform = 'translateY(8px)';
      panel.style.transition = 'opacity 0.18s, transform 0.18s';
      setTimeout(() => {
        panel.remove();
        URL.revokeObjectURL(previewUrl);
      }, 200);
      document.removeEventListener('keydown', _escHandler, true);
    }

    document.getElementById('__cp_copy').addEventListener('click', async () => {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        showToast('Copied to clipboard!', 'success');
      } catch {
        showToast('Clipboard blocked — use Download instead', 'error');
      }
      dismiss();
    });

    document.getElementById('__cp_dl').addEventListener('click', () => {
      _downloadBlob(blob, `capture-${Date.now()}.png`);
      showToast('Image downloaded!', 'success');
      dismiss();
    });

    document.getElementById('__cp_close').addEventListener('click', dismiss);

    function _escHandler(e) { if (e.key === 'Escape') dismiss(); }
    document.addEventListener('keydown', _escHandler, true);

    _panelDismissTimer = setTimeout(dismiss, 10000);
  }

  /* ═══════════════════════════════════════════
     AREA SELECTOR  (snipping-tool style)
  ═══════════════════════════════════════════ */
  let _canvas   = null;
  let _ctx      = null;
  let _startX   = 0, _startY   = 0;
  let _endX     = 0, _endY     = 0;
  let _dragging = false;

  const ACCENT       = '#7c6af7';
  const ACCENT_LIGHT = 'rgba(124,106,247,0.15)';
  const DIM          = 'rgba(5, 4, 18, 0.65)';

  function startAreaSelector() {
    if (_canvas) return;

    showToast('Drag to select an area — Esc to cancel', 'info');

    _canvas = document.createElement('canvas');
    _canvas.width  = window.innerWidth;
    _canvas.height = window.innerHeight;
    _canvas.style.cssText = `
      position: fixed; inset: 0;
      width: 100vw; height: 100vh;
      z-index: 2147483646;
      cursor: crosshair;
    `;
    _ctx = _canvas.getContext('2d');
    _drawDimOnly();

    document.documentElement.appendChild(_canvas);
    _canvas.addEventListener('mousedown', _onDown);
    document.addEventListener('keydown',  _onEscKey, true);
  }

  function _drawDimOnly() {
    _ctx.clearRect(0, 0, _canvas.width, _canvas.height);
    _ctx.fillStyle = DIM;
    _ctx.fillRect(0, 0, _canvas.width, _canvas.height);
  }

  function _drawFrame() {
    const x = Math.min(_startX, _endX);
    const y = Math.min(_startY, _endY);
    const w = Math.abs(_endX - _startX);
    const h = Math.abs(_endY - _startY);

    _ctx.clearRect(0, 0, _canvas.width, _canvas.height);

    _ctx.fillStyle = DIM;
    _ctx.fillRect(0, 0, _canvas.width, _canvas.height);

    _ctx.clearRect(x, y, w, h);

    _ctx.fillStyle = ACCENT_LIGHT;
    _ctx.fillRect(x, y, w, h);

    _ctx.save();
    _ctx.strokeStyle = ACCENT;
    _ctx.lineWidth   = 1.5;
    _ctx.strokeRect(x + 0.75, y + 0.75, w - 1.5, h - 1.5);
    _ctx.restore();

    const hs = 8;
    _ctx.fillStyle = ACCENT;
    [[x, y], [x+w, y], [x, y+h], [x+w, y+h]].forEach(([cx, cy]) => {
      _ctx.fillRect(cx - hs/2, cy - hs/2, hs, hs);
    });

    _ctx.fillStyle = 'rgba(124,106,247,0.7)';
    const ms = 5;
    [[x+w/2, y], [x+w/2, y+h], [x, y+h/2], [x+w, y+h/2]].forEach(([cx, cy]) => {
      _ctx.fillRect(cx - ms/2, cy - ms/2, ms, ms);
    });

    const label   = `${Math.round(w)} × ${Math.round(h)} px`;
    const fsize   = 11;
    const padding = 6;
    _ctx.font = `600 ${fsize}px "SF Mono", "Fira Code", monospace`;
    const tw  = _ctx.measureText(label).width;
    const lx  = x + w / 2 - tw / 2;
    const ly  = (y - fsize - padding * 2 - 2 > 4) ? y - padding - 2 : y + h + fsize + padding;

    _ctx.fillStyle = ACCENT;
    _ctx.beginPath();
    _ctx.roundRect(lx - padding, ly - fsize, tw + padding * 2, fsize + padding, 4);
    _ctx.fill();

    _ctx.fillStyle = '#fff';
    _ctx.fillText(label, lx, ly - 1);
  }

  function _onDown(e) {
    _dragging = true;
    _startX = e.clientX;
    _startY = e.clientY;
    _endX   = e.clientX;
    _endY   = e.clientY;
    _canvas.addEventListener('mousemove', _onMove);
    _canvas.addEventListener('mouseup',   _onUp);
  }

  function _onMove(e) {
    if (!_dragging) return;
    _endX = e.clientX;
    _endY = e.clientY;
    _drawFrame();
  }

  function _onUp(e) {
    _dragging = false;
    _endX = e.clientX;
    _endY = e.clientY;
    _canvas.removeEventListener('mousemove', _onMove);
    _canvas.removeEventListener('mouseup',   _onUp);

    const rect = {
      x:      Math.min(_startX, _endX),
      y:      Math.min(_startY, _endY),
      width:  Math.abs(_endX - _startX),
      height: Math.abs(_endY - _startY)
    };

    _cleanupSelector();

    if (rect.width < 5 || rect.height < 5) {
      showToast('Selection too small — try again', 'error');
      return;
    }

    showToast('Capturing area…', 'info');
    chrome.runtime.sendMessage({
      action: 'captureElement',
      rect,
      devicePixelRatio: window.devicePixelRatio || 1
    });
  }

  function _onEscKey(e) {
    if (e.key === 'Escape') {
      _cleanupSelector();
      showToast('Selection cancelled', 'info');
    }
  }

  function _cleanupSelector() {
    _canvas?.remove();
    _canvas = null;
    _ctx    = null;
    document.removeEventListener('keydown', _onEscKey, true);
  }

  /* ═══════════════════════════════════════════
     CROP (area capture) → panel
  ═══════════════════════════════════════════ */
  async function _cropToBlob({ dataUrl, rect, dpr }) {
    const img = new Image();
    img.src = dataUrl;
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });

    const canvas  = document.createElement('canvas');
    canvas.width  = Math.round(rect.width  * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext('2d');

    ctx.drawImage(
      img,
      Math.round(rect.x      * dpr), Math.round(rect.y      * dpr),
      Math.round(rect.width  * dpr), Math.round(rect.height * dpr),
      0, 0, canvas.width, canvas.height
    );

    return new Promise((res) => canvas.toBlob(res, 'image/png'));
  }

  /* ═══════════════════════════════════════════
     FULL-PAGE STITCH → panel
  ═══════════════════════════════════════════ */
  async function _stitchStrips({ strips, totalHeight, viewportHeight, dpr }) {
    // Load all strip images in parallel
    const images = await Promise.all(strips.map(({ dataUrl }) => {
      const img = new Image();
      img.src = dataUrl;
      return new Promise((res, rej) => { img.onload = () => res(img); img.onerror = rej; });
    }));

    const width  = Math.round(images[0].naturalWidth);
    const height = Math.round(totalHeight * dpr);

    const canvas = document.createElement('canvas');
    canvas.width  = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    strips.forEach(({ scrollY }, i) => {
      const img      = images[i];
      const isLast   = i === strips.length - 1;
      // For the last strip, only draw as many rows as remain
      const remaining = totalHeight - scrollY;
      const drawH     = Math.round(Math.min(remaining, viewportHeight) * dpr);
      const srcY      = isLast ? Math.round((viewportHeight - Math.min(remaining, viewportHeight)) * dpr) : 0;

      ctx.drawImage(img, 0, srcY, width, drawH, 0, Math.round(scrollY * dpr), width, drawH);
    });

    return new Promise((res) => canvas.toBlob(res, 'image/png'));
  }

  /* ═══════════════════════════════════════════
     VIEWPORT CAPTURE — dataUrl → blob → panel
  ═══════════════════════════════════════════ */
  async function _handleViewportCapture(dataUrl) {
    const img = new Image();
    img.src = dataUrl;
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });

    const canvas = document.createElement('canvas');
    canvas.width  = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext('2d').drawImage(img, 0, 0);

    canvas.toBlob((blob) => showCapturePanel(blob), 'image/png');
  }

  /* ═══════════════════════════════════════════
     VIDEO RECORDING
  ═══════════════════════════════════════════ */
  let _mediaRecorder = null;
  let _chunks        = [];
  let _stopBar       = null;

  async function startRecording() {
    if (_mediaRecorder?.state === 'recording') {
      showToast('Already recording!', 'info');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30, displaySurface: 'browser' },
        audio: { echoCancellation: true, noiseSuppression: true }
      });

      const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
        .find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';

      _mediaRecorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_000_000 });
      _chunks = [];

      _mediaRecorder.ondataavailable = e => { if (e.data?.size > 0) _chunks.push(e.data); };
      _mediaRecorder.onstop = () => {
        const blob = new Blob(_chunks, { type: 'video/webm' });
        _downloadBlob(blob, `recording-${Date.now()}.webm`);
        stream.getTracks().forEach(t => t.stop());
        _removeStopBar();
        showToast(`Recording saved (${(blob.size / 1_048_576).toFixed(1)} MB)`, 'success');
      };

      _mediaRecorder.start(1000);
      _showStopBar();
      showToast('Recording… click ■ Stop or the browser "Stop sharing" bar', 'rec');

      stream.getVideoTracks()[0].addEventListener('ended', () => {
        if (_mediaRecorder?.state !== 'inactive') _mediaRecorder.stop();
      });

    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
        showToast('Screen share cancelled', 'info');
      } else {
        showToast(`Recording failed: ${err.message}`, 'error');
      }
    }
  }

  function _showStopBar() {
    _stopBar?.remove();
    _stopBar = document.createElement('div');
    _stopBar.id = '__cp_stopbar';
    _stopBar.innerHTML = `
      <style>
        @keyframes __cp_pulse{0%,100%{opacity:1}50%{opacity:.4}}
        #__cp_stopbar{
          position:fixed;top:16px;right:16px;z-index:2147483647;
          background:#1a0808;border:1px solid #f06060;border-radius:12px;
          padding:10px 16px;display:flex;align-items:center;gap:10px;
          font-family:system-ui,sans-serif;font-size:13px;color:#ffaaaa;
          box-shadow:0 8px 32px rgba(240,96,96,0.3);user-select:none;
        }
        #__cp_recdot{width:9px;height:9px;background:#f06060;border-radius:50%;animation:__cp_pulse 1.4s infinite;}
        #__cp_stopbtn{
          background:#f06060;color:#fff;border:none;border-radius:6px;
          padding:4px 10px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;
        }
        #__cp_stopbtn:hover{background:#d94f4f;}
      </style>
      <div id="__cp_recdot"></div>
      <span>Recording…</span>
      <button id="__cp_stopbtn">■ Stop</button>
    `;
    document.documentElement.appendChild(_stopBar);
    document.getElementById('__cp_stopbtn').addEventListener('click', e => {
      e.stopPropagation();
      if (_mediaRecorder?.state !== 'inactive') _mediaRecorder.stop();
    });
  }

  function _removeStopBar() { _stopBar?.remove(); _stopBar = null; }

  /* ═══════════════════════════════════════════
     FULL-PAGE CAPTURE — trigger from popup
  ═══════════════════════════════════════════ */
  function startFullPageCapture() {
    const totalHeight   = document.documentElement.scrollHeight;
    const viewportHeight = window.innerHeight;
    const savedScrollY  = window.scrollY;

    showToast('Capturing full page…', 'info');

    // Scroll to top first, then let background drive the loop
    window.scrollTo(0, 0);
    setTimeout(() => {
      chrome.runtime.sendMessage({
        action: 'captureFullPage',
        totalHeight,
        viewportHeight,
        devicePixelRatio: window.devicePixelRatio || 1
      }, () => {
        // Restore scroll position after background sends stitchAndShow
        window.scrollTo(0, savedScrollY);
      });
    }, 100);
  }

  /* ═══════════════════════════════════════════
     UTILITIES
  ═══════════════════════════════════════════ */
  function _downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a   = Object.assign(document.createElement('a'), { href: url, download: filename });
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  /* ═══════════════════════════════════════════
     MESSAGE LISTENER
  ═══════════════════════════════════════════ */
  chrome.runtime.onMessage.addListener((msg) => {
    switch (msg.action) {
      case 'startAreaSelector':    startAreaSelector();    break;
      case 'startRecording':       startRecording();       break;
      case 'startFullPageCapture': startFullPageCapture(); break;

      case 'startViewportCapture':
        showToast('Capturing viewport…', 'info');
        chrome.runtime.sendMessage({ action: 'captureViewport', devicePixelRatio: window.devicePixelRatio || 1 });
        break;

      case 'cropAndCopy':
        if (msg.error) { showToast(`Capture failed: ${msg.error}`, 'error'); break; }
        _cropToBlob({ dataUrl: msg.dataUrl, rect: msg.rect, dpr: msg.dpr })
          .then(blob => showCapturePanel(blob));
        break;

      case 'showCapturePanel':
        if (msg.error) { showToast(`Capture failed: ${msg.error}`, 'error'); break; }
        _handleViewportCapture(msg.dataUrl);
        break;

      case 'stitchAndShow':
        _stitchStrips({
          strips:        msg.strips,
          totalHeight:   msg.totalHeight,
          viewportHeight: msg.viewportHeight,
          dpr:           msg.dpr
        }).then(blob => showCapturePanel(blob));
        break;
    }
  });

} // end guard
