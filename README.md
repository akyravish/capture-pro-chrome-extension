# Capture Pro

A Chrome extension (Manifest V3) for capturing screenshots and recording your browser tab.

## Features

### Image Capture

| Mode | Description |
|------|-------------|
| **Selected Area** | Draw a rectangle over any part of the page and capture only that region |
| **Visible Viewport** | Instant snapshot of exactly what is currently visible in the browser window |
| **Full Page** | Scrolls through the entire page and stitches all strips into one tall image (capped at 15,000px) |

After every image capture a panel appears in the bottom-right corner with:
- A thumbnail preview of the capture
- **Copy** — writes the image as PNG to the clipboard
- **Download** — saves the file with the correct extension for the chosen format
- Auto-dismisses after 10 seconds or press Escape

#### Format Picker

Choose the output format before capturing using the pill buttons in the Capture tab:

| Format | Extension | Notes |
|--------|-----------|-------|
| **PNG** (default) | `.png` | Lossless |
| **JPEG** | `.jpg` | Smaller file size; quality 0.92 |
| **WebP** | `.webp` | Best compression; quality 0.90 |

> Clipboard copy always uses PNG regardless of the selected format, as the Clipboard API does not support JPEG/WebP in all browsers.

#### Delay Capture

Select a countdown (None / 1s / 3s / 5s) before the capture fires. Useful for capturing hover states, tooltips, or dropdown menus that disappear when you interact with the popup. A full-screen overlay shows the countdown; press Escape to cancel.

### Video Recording

- Records the active tab using the browser's built-in screen-share API
- Three quality presets: **480p** (2 Mbps), **720p** (4 Mbps, default), **1080p** (8 Mbps)
- Optional tab audio capture (toggle in the Record tab)
- Saves as `.webm` (VP9 / VP8)

#### Stop Bar

While recording, an on-page bar appears in the top-right corner with:
- A live **elapsed timer** (`MM:SS`) showing how long the recording has been running
- **⏸ Pause / ▶ Resume** — suspends and resumes the recording; the timer freezes while paused and the dot animation stops
- **■ Stop** — ends the recording and saves the file

### Keyboard Shortcuts

Trigger captures without opening the popup. Shortcuts can be rebound at `chrome://extensions/shortcuts`.

| Shortcut | Action |
|----------|--------|
| `Alt+Shift+S` | Area selector |
| `Alt+Shift+V` | Visible viewport capture |
| `Alt+Shift+F` | Full page capture |
| `Alt+Shift+R` | Start / stop recording (toggle) |

> Shortcuts do nothing on restricted pages (`chrome://`, `edge://`, `about:`, etc.).

## Installation

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the `capture-pro` folder.
5. The extension icon will appear in your toolbar.

## Usage

1. Click the **Capture Pro** toolbar icon.
2. **Capture tab:** choose a format and delay, then click a capture mode card.
3. **Record tab:** configure audio and quality, then click **Start Recording**.
4. For **Selected Area**: drag to draw your selection, then release.
5. Use the Copy or Download buttons in the panel that appears after capture.

> The extension cannot run on browser system pages (`chrome://`, `edge://`, `about:`, etc.).

## File Structure

```
capture-pro/
├── manifest.json      # MV3 extension manifest (includes keyboard command declarations)
├── background.js      # Service worker — screenshot capture, full-page stitching, keyboard command routing
├── content.js         # Injected into pages — area selector, capture panel, recording UI, countdown overlay
├── popup.html         # Extension popup layout and styles
├── popup.js           # Popup button logic and state (format, delay, resolution, tab sound)
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Permissions

| Permission | Reason |
|------------|--------|
| `activeTab` | Access the current tab to inject the content script |
| `tabs` | Read tab URL to block restricted pages; capture visible tab screenshot |
| `scripting` | Inject `content.js` on demand and execute scroll commands for full-page capture |
| `host_permissions: <all_urls>` | Allow the content script to run on any page |
