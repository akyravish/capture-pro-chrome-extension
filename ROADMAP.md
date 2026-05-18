# Capture Pro — Feature Roadmap

Five planned improvements, ordered by implementation sequence (each builds on the previous).

---

## 1. Elapsed Timer on Stop Bar

**What:** A live `00:00` counter in the recording stop bar that increments every second while recording is active.

**Why:** Users have no way to know how long they've been recording without checking externally.

**Files:** `content.js` only

**Implementation:**
- Start a `setInterval` (1 s) when `_mediaRecorder.start()` is called
- Track elapsed seconds in a variable
- Format as `MM:SS` and inject into the stop bar DOM
- Clear the interval in `_removeStopBar()`

**Acceptance criteria:**
- Timer starts at `00:00` when recording begins
- Increments every second visibly in the stop bar
- Resets to zero if a new recording is started
- Cleared cleanly when recording stops or is cancelled

---

## 2. Delay Capture

**What:** Optional countdown (1 s / 3 s / 5 s) before any image capture fires, shown as a full-screen overlay with a number counting down.

**Why:** Allows capturing hover states, dropdown menus, tooltips, and other UI that disappears when the user interacts with the extension popup.

**Files:** `popup.html`, `popup.js`, `content.js`

**Implementation:**
- Add a small delay selector to the Capture tab (pill buttons: **0s**, **1s**, **3s**, **5s** — default 0s)
- Pass `delay` value alongside the capture action in `sendToContent`
- In `content.js`, if `delay > 0`, show a fixed overlay with a large countdown number (`3… 2… 1…`) using `setTimeout` chaining before firing the capture action
- Overlay is dismissible with Escape (cancels the pending capture)

**Acceptance criteria:**
- Delay of 0 fires immediately (existing behaviour preserved)
- Countdown is visible and centred on screen
- Escape during countdown cancels the capture and removes the overlay
- After countdown reaches 0, the normal capture flow (area selector or snapshot) begins

---

## 3. Keyboard Shortcuts

**What:** Global keyboard shortcuts that trigger captures without opening the popup.

| Shortcut | Action |
|----------|--------|
| `Alt+Shift+S` | Area selector |
| `Alt+Shift+V` | Visible viewport capture |
| `Alt+Shift+F` | Full page capture |
| `Alt+Shift+R` | Start / stop recording |

**Why:** Power users should not have to open the popup for every capture.

**Files:** `manifest.json`, `background.js`

**Implementation:**
- Declare commands in `manifest.json` under the `"commands"` key with the suggested shortcuts
- Listen for `chrome.commands.onCommand` in `background.js`
- Query the active tab and forward the matching action message to the content script
- For `toggle-recording`: send `startRecording` if not recording, or message the content script to stop if `_mediaRecorder` is active (requires a `stopRecording` message handler in `content.js`)

**Acceptance criteria:**
- All four shortcuts work on any normal page without opening the popup
- Shortcuts do nothing on restricted pages (`chrome://`, `about:`, etc.)
- `Alt+Shift+R` toggles — first press starts, second press stops
- Users can rebind shortcuts via `chrome://extensions/shortcuts`

---

## 4. Pause / Resume Recording

**What:** A **Pause** button in the on-page stop bar that suspends the recording; pressing it again resumes. The timer freezes while paused.

**Why:** `MediaRecorder` supports `.pause()` / `.resume()` natively — exposing this lets users skip unwanted sections without stopping and restarting.

**Files:** `content.js` only

**Implementation:**
- Add a **⏸ Pause** button to the stop bar HTML alongside the existing **■ Stop** button
- On click: call `_mediaRecorder.pause()`, update button label to **▶ Resume**, freeze the elapsed timer
- On resume click: call `_mediaRecorder.resume()`, restore button label, resume the timer interval
- Visual indicator: stop bar pulseanimation pauses (CSS `animation-play-state: paused`) while recording is paused

**Acceptance criteria:**
- Pause button appears in the stop bar during recording
- Clicking Pause freezes the timer and stops data chunks from accumulating
- Clicking Resume continues from where it left off — final file is seamless
- Pause/Resume state is reflected clearly in the button label and dot animation

---

## 5. Format Picker (PNG / JPEG / WebP)

**What:** Three format buttons in the Capture tab that set the output format for all image captures.

**Why:** PNG is lossless but large. JPEG is smaller for photos. WebP gives the best compression with good quality. Users should be able to choose based on their use case.

**Files:** `popup.html`, `popup.js`, `content.js`

**Implementation:**
- Add a format button row to the Capture tab: **PNG** (default, active), **JPEG**, **WebP**
- Store selected format in `state.format` in `popup.js`
- Pass `format` alongside the capture action in `sendToContent`
- In `content.js`, thread `format` through all capture paths:
  - `_cropToBlob`: pass `image/jpeg` or `image/webp` to `canvas.toBlob()`
  - `_handleViewportCapture`: same
  - `_stitchStrips`: same
- For JPEG, use quality `0.92`; for WebP, use quality `0.90`
- Update the download filename extension to match (`.jpg`, `.webp`, `.png`)

**Acceptance criteria:**
- Selecting JPEG produces a `.jpg` file noticeably smaller than PNG for the same capture
- Selecting WebP produces a `.webp` file
- Clipboard copy always uses `image/png` as a fallback (clipboard API does not support JPEG/WebP in all browsers) — if format is not PNG, the panel Download button is the primary action
- Selected format persists for the session (switching tabs and back keeps the choice)

---

## Implementation Order

```
1. Elapsed timer      — content.js only, no UI changes, lowest risk
2. Format picker      — touches all capture paths, good to do before adding more capture flows
3. Delay capture      — new UI in popup + new overlay in content.js
4. Pause / Resume     — extends stop bar, depends on timer being stable
5. Keyboard shortcuts — manifest + background changes, test last to avoid permission issues
```
