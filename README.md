# Capture Pro

A Chrome extension (Manifest V3) for capturing screenshots and recording your browser tab.

## Features

### Image Capture

| Mode | Description |
|------|-------------|
| **Selected Area** | Draw a rectangle over any part of the page and capture only that region |
| **Visible Viewport** | Instant snapshot of exactly what is currently visible in the browser window |
| **Full Page** | Scrolls through the entire page and stitches all strips into one tall PNG (capped at 15,000px) |

After every image capture a panel appears in the bottom-right corner with:
- A thumbnail preview of the capture
- **Copy** — writes the PNG to the clipboard
- **Download** — saves the file as `capture-<timestamp>.png`
- Auto-dismisses after 10 seconds or press Escape

### Video Recording

- Records the active tab using the browser's built-in screen-share API
- Saves as `.webm` (VP9 / VP8, 4 Mbps)
- An on-page stop bar lets you end the recording without reopening the popup

## Installation

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the `capture-pro` folder.
5. The extension icon will appear in your toolbar.

## Usage

1. Click the **Capture Pro** toolbar icon.
2. Choose a capture mode from the popup.
3. For **Selected Area**: drag to draw your selection, then release.
4. For **Visible Viewport** and **Full Page**: capture starts immediately.
5. Use the Copy or Download buttons in the panel that appears.

> The extension cannot run on browser system pages (`chrome://`, `edge://`, `about:`, etc.).

## File Structure

```
capture-pro/
├── manifest.json      # MV3 extension manifest
├── background.js      # Service worker — screenshot capture and full-page stitching
├── content.js         # Injected into pages — area selector, capture panel, recording UI
├── popup.html         # Extension popup layout and styles
├── popup.js           # Popup button logic
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
