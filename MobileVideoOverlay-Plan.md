# Mobile Video Overlay — Implementation Plan

## Background

The current three-zone layout (video / caption / controls) works well on desktop but the
VideoJS control bar rendered in the controls zone is too small for reliable touch use on
mobile. This plan describes a native-feeling full-screen overlay experience that provides
large, touch-friendly controls while preserving caption display below the video frame.

---

## Reference: Native Mobile Video UX

### iOS (AVPlayer inline + full-screen)
- Inline: play/pause tap on video, small scrubber below video, AirPlay/full-screen icons.
- Full-screen: video fills screen, semi-transparent control overlay appears on tap and
  auto-hides after ~3 s, prominent play/pause centred or at bottom, scrubber + time at
  bottom, **done/close button in the upper-left**, system safe-area awareness.
- Controls fade out smoothly; any tap re-shows them.
- Hardware back (or swipe-down on sheet) dismisses.

### Android (ExoPlayer / Media3)
- Material Design touch targets: minimum 48 dp for every interactive control.
- Progress bar height 4 dp track, 20 dp touch area; thumb grows on press.
- Similar auto-hide behaviour (3–5 s).
- System back button dismisses full-screen.
- Safe-area insets respected for notch/cutout devices.

### Key best-practice touch target sizes
| Element | Minimum touch target |
|---|---|
| Play/Pause button | 56 px (Material large FAB) |
| Skip ±10 s buttons | 48 px |
| Scrubber thumb | 44 px hit area |
| Close / Done button | 44 px |

---

## Goals

1. **Inline view** — on mobile, suppress the VideoJS control bar entirely; show a centred
   play button overlay so the user knows the video is interactive.
2. **Tapping play always enters full-screen** — on mobile, pressing play immediately
   expands to the full-screen overlay and starts playback. There is no inline playback
   state on mobile.
3. **Full-screen overlay** — immersive layout with large, touch-friendly controls.
4. **Caption below video** — the caption zone sits between the video and the control bar
   in full-screen, never overlaying the image.
5. **Auto-hide controls** — control bar and close button fade after 3 s of inactivity;
   any tap anywhere re-shows them.
6. **Close / dismiss** — close button upper-left (matching iOS "Done" convention) exits
   full-screen and pauses playback; returns to the inline view.
7. **Android back button** — hardware back dismisses full-screen.
8. **Safe-area aware** — padding respects `env(safe-area-inset-*)` for iPhone notch /
   home indicator and Android cutout bars.
9. **No VideoJS full-screen API** — VideoJS's `requestFullscreen` hands off to AVPlayer
   on iOS Cordova. We use CSS-based full-screen instead (toggle a class on the stack).
10. **Body scroll lock** — `document.body.style.overflow = 'hidden'` while full-screen
    to prevent page scroll bleed-through on iOS.

---

## Two-State Layout

### State 1 — Inline (mobile default)

```
┌──────────────────────────────────┐
│        .hm-video-zone            │  ← 16:9, natural width-constrained
│   ┌──────────┐                   │
│   │  ▶  tap  │  (play overlay)   │  ← centred, semi-transparent circle
│   └──────────┘                   │
├──────────────────────────────────┤
│        .hm-caption-zone          │  ← 2-line caption strip
├──────────────────────────────────┤
│   (controls zone hidden)         │  ← VideoJS bar hidden on mobile
└──────────────────────────────────┘
```

- `.hm-controls-zone` is hidden via a JS-set `.hm-mobile` class on the stack
  (set during `initMobileOverlay`, which only runs when `getDevice().desktop === false`).
- The `.hm-tap-overlay` is a full-size transparent element over the video zone showing
  a centred Material Icons `play_arrow` circle. It is always visible in inline state
  (regardless of paused/playing) because tapping always transitions to full-screen.

### State 2 — Full-Screen Overlay (`.hm-fullscreen` class on `.hm-video-stack`)

```
┌─────────────────────────────────────┐  position: fixed; inset: 0; z-index: 9999
│ [close]                             │  ← safe-area-inset-top; auto-hides
│                                     │
│         .hm-video-zone              │  ← flex: 1, fills vertical space
│   ┌─────────────────────────────┐   │
│   │       (video frame)         │   │
│   └─────────────────────────────┘   │
│                                     │
├─────────────────────────────────────┤
│         .hm-caption-zone            │  ← 2-line strip, always visible
├─────────────────────────────────────┤
│         .hm-overlay-controls        │  ← auto-hides with close btn
│  ────────────●──────────────────    │  ← scrubber (tap or drag to seek)
│  [replay_10]  [▶/‖]  [forward_10]  0:12 / 1:34  │
└─────────────────────────────────────┘  ← safe-area-inset-bottom
```

**Auto-hide:** `.hm-overlay-controls` and `.hm-close-btn` both gain class
`.hm-controls-hidden` (opacity 0, pointer-events none) after 3 s of no touch activity.
Any `touchstart` anywhere on the stack clears the class and resets the timer.

**Caption zone** always remains visible — it is not part of the auto-hide group.

---

## Control Bar Detail

```
Row 1 (scrubber):
  [──────────────●─────────────────]   full width, 44px touch area

Row 2 (buttons + time):
  [replay_10]   [play_arrow / pause]   [forward_10]   [0:12 / 1:34]
     48px             56px                 48px          right-aligned text
```

All icons are Material Icons already bundled by Framework7:
`play_arrow`, `pause`, `replay_10`, `forward_10`, `close`.

---

## Components

### CSS (`lib/video/video.scss`)

```scss
// ── Mobile flag (set by JS on initMobileOverlay) ────────────────────────────
.hm-video-stack.hm-mobile {
  .hm-controls-zone { display: none; }
}

// ── Tap-to-fullscreen overlay ───────────────────────────────────────────────
.hm-tap-overlay {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; z-index: 1;

  .hm-tap-icon {
    width: 64px; height: 64px;
    background: rgba(0,0,0,0.5); border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-size: 36px;  // Material Icon size
  }
}

// ── Full-screen stack ────────────────────────────────────────────────────────
.hm-video-stack.hm-fullscreen {
  position: fixed; inset: 0; z-index: 9999;
  background: #000;
  padding:
    env(safe-area-inset-top, 0px)
    env(safe-area-inset-right, 0px)
    env(safe-area-inset-bottom, 0px)
    env(safe-area-inset-left, 0px);

  .hm-video-zone {
    flex: 1;
    aspect-ratio: unset;  // override 16:9 — fill available space
  }
}

// ── Close button ─────────────────────────────────────────────────────────────
.hm-close-btn {
  display: none;
  position: absolute; top: 0; left: 0; z-index: 2;
  min-width: 44px; min-height: 44px; padding: 8px 12px;
  background: transparent; border: none;
  color: #fff; font-size: 24px;  // Material Icon size
  align-items: center; cursor: pointer;
  transition: opacity 0.3s;
  &.hm-controls-hidden { opacity: 0; pointer-events: none; }
}
.hm-video-stack.hm-fullscreen .hm-close-btn { display: flex; }

// ── Overlay controls bar ─────────────────────────────────────────────────────
.hm-overlay-controls {
  display: none;
  background: rgba(0,0,0,0.6);
  padding: 0 16px 10px;
  transition: opacity 0.3s;
  &.hm-controls-hidden { opacity: 0; pointer-events: none; }
}
.hm-video-stack.hm-fullscreen .hm-overlay-controls { display: block; }

// ── Scrubber ─────────────────────────────────────────────────────────────────
.hm-scrubber {
  position: relative;
  width: 100%;
  // Visual bar sits in the middle; padding expands touch area to 44px
  padding: 20px 0;
  cursor: pointer;

  &__track {
    height: 4px; background: rgba(255,255,255,0.3); border-radius: 2px;
    position: relative;
  }
  &__fill {
    height: 4px; background: #fff; border-radius: 2px;
    position: absolute; top: 0; left: 0;
  }
  &__thumb {
    position: absolute; top: 50%; transform: translate(-50%, -50%);
    width: 14px; height: 14px; background: #fff; border-radius: 50%;
  }
}

// ── Control row ───────────────────────────────────────────────────────────────
.hm-ctrl-row {
  display: flex; align-items: center; gap: 8px;
}
.hm-ctrl-btn {
  min-width: 48px; min-height: 48px; flex-shrink: 0;
  background: transparent; border: none; color: #fff;
  font-size: 28px;  // Material Icon display size
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  &.hm-ctrl-play { min-width: 56px; min-height: 56px; font-size: 36px; }
}
.hm-ctrl-time {
  margin-left: auto; color: rgba(255,255,255,0.85); font-size: 0.85rem;
  white-space: nowrap;
}
```

### JavaScript (`lib/video/video.js`)

New functions added to the module:

**`isMobile()`**
```
return !getDevice().desktop
```

**`buildOverlayDOM(stack)`**
- Creates and inserts all overlay elements into the existing stack DOM.
- Returns refs: `{ tapOverlay, closeBtn, overlayControls, scrubberTrack, scrubberFill,
  scrubberThumb, playBtn, timeEl }`.
- `.hm-tap-overlay` appended to `.hm-video-zone`.
- `.hm-close-btn` appended to stack (absolute-positioned, sits above video zone).
- `.hm-overlay-controls` (scrubber row + button row) inserted after `.hm-caption-zone`.
- Icon markup: `<span class="material-icons">icon_name</span>`.

**`initMobileOverlay(player, stack)`**
```
if (!isMobile()) return

stack.classList.add('hm-mobile')           // hide VideoJS controls zone

const refs = buildOverlayDOM(stack)

// Player state → UI sync
player.on('play',  () => refs.playBtn.icon = 'pause')
player.on('pause', () => refs.playBtn.icon = 'play_arrow')
player.on('timeupdate', () => {
  pct = player.currentTime() / player.duration()
  refs.scrubberFill.style.width = pct * 100 + '%'
  refs.scrubberThumb.style.left = pct * 100 + '%'
  refs.timeEl.textContent = formatTime(player.currentTime()) + ' / ' + formatTime(player.duration())
})
player.on('ended', () => refs.playBtn.icon = 'play_arrow')

// Tap overlay → always enter fullscreen + play
refs.tapOverlay.addEventListener('click', () => enterFullscreen())

// Close button
refs.closeBtn.addEventListener('click', () => exitFullscreen())

// Android back button (Cordova)
document.addEventListener('backbutton', () => {
  if (stack.classList.contains('hm-fullscreen')) {
    exitFullscreen(); e.preventDefault()
  }
})

// Auto-hide: any touch on the stack resets the 3s timer
stack.addEventListener('touchstart', () => showControls(), { passive: true })

// Scrubber: touchstart sets seeking flag (suppresses auto-hide during drag)
// touchmove / touchend compute seek % from touch.clientX vs bar rect
refs.scrubberTrack.addEventListener('touchstart', onScrubStart)
document.addEventListener('touchmove', onScrubMove, { passive: false })
document.addEventListener('touchend', onScrubEnd)

function enterFullscreen() {
  stack.classList.add('hm-fullscreen')
  document.body.style.overflow = 'hidden'
  player.play()
  showControls()   // start auto-hide timer
}

function exitFullscreen() {
  stack.classList.remove('hm-fullscreen')
  document.body.style.overflow = ''
  player.pause()
  clearAutoHideTimer()
  showControls()   // ensure controls visible in inline state (tap overlay)
}

function showControls() {
  refs.closeBtn.classList.remove('hm-controls-hidden')
  refs.overlayControls.classList.remove('hm-controls-hidden')
  resetAutoHideTimer()
}
function resetAutoHideTimer() {
  clearTimeout(autoHideTimer)
  autoHideTimer = setTimeout(() => hideControls(), 3000)
}
function hideControls() {
  refs.closeBtn.classList.add('hm-controls-hidden')
  refs.overlayControls.classList.add('hm-controls-hidden')
}
```

**`formatTime(seconds)`** — formats `mm:ss` for the time display.

### `player.ready()` update

After the existing caption-tracking block, add:
```js
initMobileOverlay(player, stack);
```

### `ensureStack` — no changes needed

The three-zone DOM structure is unchanged. `initMobileOverlay` layers additional elements
on top of it after VideoJS is ready.

---

## Full User Interaction Flow

```
Page load
  └─ initVideoInContainer → ensureStack → videojs(playerEl) → player.ready()
       └─ initMobileOverlay(player, stack)
            └─ stack.classList.add('hm-mobile')  ← hides VideoJS controls
            └─ tap overlay + close btn + overlay controls built, handlers wired

User sees inline video
  └─ .hm-tap-overlay shows play_arrow circle
  └─ caption zone shows &nbsp; (empty)

User taps play
  └─ tapOverlay click → enterFullscreen()
       └─ stack.classList.add('hm-fullscreen')  ← CSS: fixed overlay
       └─ document.body.style.overflow = 'hidden'
       └─ player.play()
       └─ showControls() → 3s auto-hide timer starts

User watches video (full-screen, controls visible)
  └─ 3s passes → controls + close btn fade out
  └─ captions remain visible in caption zone

User taps screen (full-screen, controls hidden)
  └─ touchstart → showControls() → controls fade back in, timer resets

User taps scrubber track or drags thumb
  └─ seeking flag set → auto-hide paused during drag
  └─ player.currentTime(computed) on each touchmove
  └─ flag cleared on touchend → auto-hide resumes

User taps skip +/- 10s
  └─ player.currentTime(player.currentTime() ± 10)

User taps close (or Android back)
  └─ exitFullscreen()
       └─ stack.classList.remove('hm-fullscreen')  ← returns to inline
       └─ document.body.style.overflow = ''
       └─ player.pause()
       └─ tap overlay visible again in inline view
```

---

## Implementation Steps

1. **CSS** (`lib/video/video.scss`)
   - `.hm-video-stack.hm-mobile` — hide `.hm-controls-zone`.
   - `.hm-tap-overlay` and `.hm-tap-icon` — centred play circle over video zone.
   - `.hm-video-stack.hm-fullscreen` — `position: fixed; inset: 0`, safe-area padding,
     `.hm-video-zone { flex: 1; aspect-ratio: unset }`.
   - `.hm-close-btn` — absolute top-left, hidden until `.hm-fullscreen`, auto-hide class.
   - `.hm-overlay-controls`, `.hm-scrubber`, `.hm-ctrl-row`, `.hm-ctrl-btn`,
     `.hm-ctrl-time` — controls bar styles.
   - `.hm-controls-hidden` — `opacity: 0; pointer-events: none`.

2. **JS** (`lib/video/video.js`)
   - `isMobile()` helper.
   - `formatTime(s)` — `mm:ss` formatter.
   - `buildOverlayDOM(stack)` — DOM construction, returns element refs.
   - `initMobileOverlay(player, stack)` — event wiring, auto-hide, enter/exit fullscreen.
   - Call `initMobileOverlay(player, stack)` at the end of `player.ready()`.

3. **Testing checklist**
   - [ ] iOS Cordova: tap play → full-screen opens, video plays inline (no AVPlayer modal).
   - [ ] iOS Cordova: close button → full-screen exits, returns to inline, playback pauses.
   - [ ] iOS Cordova: captions appear in caption zone only (not overlaid on video).
   - [ ] iOS Cordova: auto-hide fires after 3 s; tap restores controls.
   - [ ] iOS Cordova: safe-area — controls not behind notch or home indicator.
   - [ ] Android Cordova: same as iOS + hardware back button exits full-screen.
   - [ ] iOS Safari (web, not Cordova): full-screen works, no AVPlayer modal.
   - [ ] Desktop browser: `.hm-mobile` class not added; VideoJS controls zone shown normally.
   - [ ] Scrubber: tap-to-seek and drag-to-seek both work; dragging does not trigger close.
   - [ ] Skip buttons: ±10 s seek works at boundaries (clamps to 0 / duration).
   - [ ] Landscape orientation: video fills width, caption + controls below.
   - [ ] Portrait orientation: video letterboxed, caption + controls below.
   - [ ] Body scroll locked during full-screen; restored on close.
