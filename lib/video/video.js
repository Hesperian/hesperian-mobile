import { getDevice } from 'framework7/bundle';
import { createFocusTrapHandler } from '../accessibility/focus-trap';
import './video.scss';

// Attempt to load video.js once at module load time.
// Resolves to the videojs function if installed; null otherwise.
// CSS is fire-and-forget — no-op if video.js is not installed.
import('video.js/dist/video-js.css').catch(() => {});

const videojsReady = import('video.js')
  .then(m => {
    // Handle both ESM (m.default) and CJS (m itself) module formats.
    const vjs = m.default ?? m;
    return (typeof vjs === 'function' && typeof vjs.getPlayer === 'function') ? vjs : null;
  })
  .catch(() => null);

export function initializeVideo() {
  document.addEventListener('page:init', async function (e) {
    const videojs = await videojsReady;
    if (!videojs) return;              // video.js not installed — no-op
    initVideoInContainer(e.detail.pageEl, videojs);
  });

  // Also initialize any videos already in the DOM at call time.
  // The initial page's page:init may fire before this listener is registered
  // (app.views.create fires it earlier in configureApp).
  videojsReady.then(videojs => {
    if (!videojs) return;
    initVideoInContainer(document, videojs);
  });
}

// ── Progressive enhancement: ensure three-zone stack ─────────────────────────

// Ensure a .hm-video-player element is wrapped in a three-zone stack.
// - If already inside .hm-video-stack, returns the element unchanged (backward compat).
// - If a plain <video>, upgrades it to <video-js> to prevent native browser overlay.
// - Builds .hm-video-stack > .hm-video-zone + .hm-caption-zone + .hm-controls-zone.
// Returns the player element to pass to VideoJS.
function ensureStack(videoEl) {
  if (videoEl.closest('.hm-video-stack')) return videoEl;

  // Upgrade <video> → <video-js> to prevent native browser play button overlay
  let playerEl = videoEl;
  if (videoEl.tagName.toLowerCase() === 'video') {
    const vjsEl = document.createElement('video-js');
    for (const attr of videoEl.attributes) {
      vjsEl.setAttribute(attr.name, attr.value);
    }
    while (videoEl.firstChild) {
      vjsEl.appendChild(videoEl.firstChild);
    }
    videoEl.replaceWith(vjsEl);
    playerEl = vjsEl;
  }

  // Build three-zone stack and insert where playerEl currently sits
  const stack = document.createElement('div');
  stack.className = 'hm-video-stack';

  const videoZone = document.createElement('div');
  videoZone.className = 'hm-video-zone';

  const captionZone = document.createElement('div');
  captionZone.className = 'hm-caption-zone';
  const captionText = document.createElement('div');
  captionText.className = 'hm-caption-text';
  captionText.textContent = '\u00A0';
  // §G: live region so screen readers announce caption changes
  captionText.setAttribute('aria-live', 'polite');
  captionText.setAttribute('aria-atomic', 'true');
  captionZone.appendChild(captionText);

  const controlsZone = document.createElement('div');
  controlsZone.className = 'hm-controls-zone';

  stack.appendChild(videoZone);
  stack.appendChild(captionZone);
  stack.appendChild(controlsZone);

  playerEl.parentNode.insertBefore(stack, playerEl);
  videoZone.appendChild(playerEl);

  return playerEl;
}

// ── Shared CSS fullscreen helpers ────────────────────────────────────────────
// Move the stack to <body> so position:fixed covers the full viewport regardless
// of Framework7's CSS transform stacking context on page elements.
// Used by both mobile overlay and desktop fullscreen override.

function enterCssFullscreen(stack) {
  // §D: save focused element so we can restore it on exit
  stack._fsPreviousFocus = document.activeElement;

  stack._fsOriginalParent = stack.parentNode;
  stack._fsOriginalNextSibling = stack.nextSibling;
  // Clear the JS-set max-width so the fullscreen layout is unconstrained;
  // restore it on exit (avoids needing max-width: none !important in CSS).
  stack._fsSavedMaxWidth = stack.style.maxWidth;
  stack.style.maxWidth = '';
  document.body.appendChild(stack);
  stack.classList.add('hm-fullscreen');
  document.body.style.overflow = 'hidden';

  // §A: make all background content inert — #app contains all F7 content
  // (views, pages, navbars, panels). The stack is a body sibling after the
  // DOM move above, so setting #app.inert does not affect it.
  const appEl = document.getElementById('app');
  if (appEl) appEl.inert = true;

  // §B: announce the fullscreen context to screen readers
  stack.setAttribute('role', 'dialog');
  stack.setAttribute('aria-modal', 'true');
  stack.setAttribute('aria-label', 'Video player');

  // §C: trap Tab/Shift-Tab within the stack; Escape clicks the close button
  // (mobile). On desktop there is no close button — Escape is handled by the
  // initDesktopFullscreen document-level keydown handler instead.
  const trapHandler = createFocusTrapHandler(el => el.querySelector('.hm-close-btn'));
  stack.addEventListener('keydown', trapHandler);
  stack._fsTrapHandler = trapHandler;

  // §D: move focus into the stack (defer one frame so CSS display changes
  // on .hm-close-btn are applied before focus attempt)
  setTimeout(() => {
    const target =
      stack.querySelector('.hm-close-btn') ??
      stack.querySelector('button:not([disabled])');
    target?.focus();
  }, 0);
}

function exitCssFullscreen(stack) {
  stack.classList.remove('hm-fullscreen');
  stack.style.maxWidth = stack._fsSavedMaxWidth ?? '';
  stack._fsSavedMaxWidth = null;
  document.body.style.overflow = '';

  // §A: restore background interactivity
  const appEl = document.getElementById('app');
  if (appEl) appEl.inert = false;

  // §B: remove dialog semantics
  stack.removeAttribute('role');
  stack.removeAttribute('aria-modal');
  stack.removeAttribute('aria-label');

  // §C: remove focus trap
  if (stack._fsTrapHandler) {
    stack.removeEventListener('keydown', stack._fsTrapHandler);
    stack._fsTrapHandler = null;
  }

  // Guard: original parent may have been removed from DOM (e.g. page navigation)
  if (stack._fsOriginalParent?.isConnected) {
    stack._fsOriginalParent.insertBefore(stack, stack._fsOriginalNextSibling);
  }
  stack._fsOriginalParent = null;
  stack._fsOriginalNextSibling = null;

  // §D: return focus to whatever triggered fullscreen (defer so DOM move
  // completes and the element is back in its original position first)
  const prev = stack._fsPreviousFocus;
  stack._fsPreviousFocus = null;
  setTimeout(() => prev?.focus(), 0);
}

// ── Mobile overlay helpers ────────────────────────────────────────────────────

function isMobile() {
  return !getDevice().desktop;
}

function formatTime(seconds) {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function materialIcon(name) {
  const el = document.createElement('span');
  el.className = 'material-icons';
  el.textContent = name;
  return el;
}

// Build all mobile overlay DOM elements and insert them into the stack.
// Returns refs to the interactive elements for event wiring.
function buildOverlayDOM(stack) {
  const videoZone = stack.querySelector('.hm-video-zone');
  const captionZone = stack.querySelector('.hm-caption-zone');

  // Tap-to-fullscreen overlay covering the video zone
  // §F: keyboard-accessible so Bluetooth keyboard / screen reader users can activate
  const tapOverlay = document.createElement('div');
  tapOverlay.className = 'hm-tap-overlay';
  tapOverlay.setAttribute('tabindex', '0');
  tapOverlay.setAttribute('role', 'button');
  tapOverlay.setAttribute('aria-label', 'Play video fullscreen');
  const tapIcon = document.createElement('div');
  tapIcon.className = 'hm-tap-icon';
  tapIcon.appendChild(materialIcon('play_arrow'));
  tapOverlay.appendChild(tapIcon);
  videoZone.appendChild(tapOverlay);

  // Close button — absolute-positioned top-left of the fixed stack
  const closeBtn = document.createElement('button');
  closeBtn.className = 'hm-close-btn';
  closeBtn.setAttribute('aria-label', 'Close video');
  closeBtn.appendChild(materialIcon('close'));
  stack.appendChild(closeBtn);

  // Overlay controls bar — inserted after caption zone
  const overlayControls = document.createElement('div');
  overlayControls.className = 'hm-overlay-controls';

  // Scrubber
  const scrubber = document.createElement('div');
  scrubber.className = 'hm-scrubber';
  const scrubberTrack = document.createElement('div');
  scrubberTrack.className = 'hm-scrubber__track';
  const scrubberFill = document.createElement('div');
  scrubberFill.className = 'hm-scrubber__fill';
  const scrubberThumb = document.createElement('div');
  scrubberThumb.className = 'hm-scrubber__thumb';
  scrubberTrack.appendChild(scrubberFill);
  scrubberTrack.appendChild(scrubberThumb);
  scrubber.appendChild(scrubberTrack);

  // Control row: [replay_10]  [play/pause]  [forward_10]  [time]
  const ctrlRow = document.createElement('div');
  ctrlRow.className = 'hm-ctrl-row';

  const replayBtn = document.createElement('button');
  replayBtn.className = 'hm-ctrl-btn';
  replayBtn.setAttribute('aria-label', 'Replay 10 seconds');
  replayBtn.appendChild(materialIcon('replay_10'));

  const playBtn = document.createElement('button');
  playBtn.className = 'hm-ctrl-btn hm-ctrl-play';
  playBtn.setAttribute('aria-label', 'Play / Pause');
  playBtn.appendChild(materialIcon('play_arrow'));

  const forwardBtn = document.createElement('button');
  forwardBtn.className = 'hm-ctrl-btn';
  forwardBtn.setAttribute('aria-label', 'Forward 10 seconds');
  forwardBtn.appendChild(materialIcon('forward_10'));

  const timeEl = document.createElement('span');
  timeEl.className = 'hm-ctrl-time';
  timeEl.textContent = '0:00 / 0:00';

  ctrlRow.appendChild(replayBtn);
  ctrlRow.appendChild(playBtn);
  ctrlRow.appendChild(forwardBtn);
  ctrlRow.appendChild(timeEl);

  // Speed row: [0.5×] [0.75×] [1×] [1.5×] [2×]
  const SPEEDS = [0.5, 0.75, 1, 1.5, 2];
  const speedRow = document.createElement('div');
  speedRow.className = 'hm-speed-row';
  const speedBtns = SPEEDS.map((rate, i) => {
    const btn = document.createElement('button');
    btn.className = 'hm-speed-btn';
    btn.setAttribute('aria-label', `${rate}× speed`);
    btn.textContent = rate + '×';
    btn.dataset.rate = rate;
    if (rate === 1) btn.classList.add('hm-speed-btn--active');
    speedRow.appendChild(btn);
    return btn;
  });

  overlayControls.appendChild(scrubber);
  overlayControls.appendChild(ctrlRow);
  overlayControls.appendChild(speedRow);
  captionZone.insertAdjacentElement('afterend', overlayControls);

  return {
    tapOverlay, tapIcon, closeBtn, overlayControls,
    scrubber, scrubberTrack, scrubberFill, scrubberThumb,
    playBtn, replayBtn, forwardBtn, timeEl, speedBtns,
  };
}

// Module-level: tracks which stack's scrubber is currently being dragged.
// A single document-level touchmove/touchend pair handles scrubbing for all
// players; this reference ensures only the active player responds.
let activeScrubStack = null;

// Wire up all mobile overlay behaviour for a player.
// Only runs on non-desktop devices. Adds .hm-mobile to the stack to suppress
// the VideoJS controls zone.
function initMobileOverlay(player, stack) {
  if (!isMobile()) return;

  stack.classList.add('hm-mobile');

  const refs = buildOverlayDOM(stack);
  let autoHideTimer = null;

  // ── Player state → UI sync ──────────────────────────────────────────────

  function setPlayIcon(name) {
    const iconEl = refs.playBtn.querySelector('.material-icons');
    if (iconEl) iconEl.textContent = name;
    // Show the tap overlay circle only when paused so it doesn't obscure playing video
    refs.tapIcon.style.display = (name === 'play_arrow') ? '' : 'none';
  }

  function updateProgress() {
    const duration = player.duration();
    const current = player.currentTime();
    if (!isFinite(duration) || duration <= 0) return;
    const pct = current / duration;
    refs.scrubberFill.style.width = (pct * 100) + '%';
    refs.scrubberThumb.style.left = (pct * 100) + '%';
    refs.timeEl.textContent = formatTime(current) + ' / ' + formatTime(duration);
  }

  player.on('play',         () => setPlayIcon('pause'));
  player.on('pause',        () => setPlayIcon('play_arrow'));
  player.on('ended',        () => setPlayIcon('play_arrow'));
  player.on('timeupdate',   updateProgress);
  player.on('durationchange', updateProgress);
  player.on('loadedmetadata', updateProgress);

  // ── Auto-hide controls (overlay controls only; close btn always visible) ─

  function showControls() {
    refs.overlayControls.classList.remove('hm-controls-hidden');
    // Don't restart the timer while a scrub drag is in progress
    if (activeScrubStack !== stack) resetAutoHideTimer();
  }

  function hideControls() {
    refs.overlayControls.classList.add('hm-controls-hidden');
  }

  function resetAutoHideTimer() {
    clearTimeout(autoHideTimer);
    autoHideTimer = setTimeout(hideControls, 3000);
  }

  // ── Fullscreen enter / exit ─────────────────────────────────────────────

  function enterFullscreen() {
    enterCssFullscreen(stack);
    // Android Cordova's WebViewAssetLoader strips the Range header from
    // intercepted requests (SystemWebViewClient passes only request.getUrl(),
    // not the full WebResourceRequest — unfixed as of cordova-android 15.0.0).
    // The WebView gets a full response instead of a 206 Partial Content on
    // seek/replay and aborts with a decode error.
    // Resetting the src before each play forces a fresh sequential request,
    // avoiding the range-request path entirely.
    const currentSrc = player.currentSrc();
    if (currentSrc) {
      player.src(currentSrc);
    }
    player.play();
    showControls();
  }

  function exitFullscreen() {
    exitCssFullscreen(stack);
    player.pause();
    clearTimeout(autoHideTimer);
    autoHideTimer = null;
  }

  // ── User interactions ───────────────────────────────────────────────────

  // Tap overlay: enter fullscreen on click or keyboard activation (§F)
  refs.tapOverlay.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!stack.classList.contains('hm-fullscreen')) {
      enterFullscreen();
    }
  });
  refs.tapOverlay.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !stack.classList.contains('hm-fullscreen')) {
      e.preventDefault();
      enterFullscreen();
    }
  });

  // DRY helper: stop propagation, run action, re-show controls.
  function addCtrlHandler(btn, fn) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      fn();
      showControls();
    });
  }

  addCtrlHandler(refs.playBtn,    () => player.paused() ? player.play() : player.pause());
  addCtrlHandler(refs.replayBtn,  () => player.currentTime(Math.max(0, player.currentTime() - 10)));
  addCtrlHandler(refs.forwardBtn, () => player.currentTime(Math.min(player.duration(), player.currentTime() + 10)));

  // Speed buttons
  function setSpeed(rate) {
    player.playbackRate(rate);
    refs.speedBtns.forEach(btn => {
      btn.classList.toggle('hm-speed-btn--active', parseFloat(btn.dataset.rate) === rate);
    });
  }
  refs.speedBtns.forEach(btn => addCtrlHandler(btn, () => setSpeed(parseFloat(btn.dataset.rate))));

  // Close button (exits fullscreen, no showControls)
  refs.closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    exitFullscreen();
  });

  // Android hardware back button (Cordova) — named for dispose cleanup
  const onBackButton = (e) => {
    if (stack.classList.contains('hm-fullscreen')) {
      e.preventDefault();
      exitFullscreen();
    }
  };
  document.addEventListener('backbutton', onBackButton);

  // Any touch on the stack while full-screen re-shows controls
  stack.addEventListener('touchstart', () => {
    if (stack.classList.contains('hm-fullscreen')) {
      showControls();
    }
  }, { passive: true });

  // ── Scrubber: tap-to-seek and drag-to-seek ──────────────────────────────

  function seekToTouch(touch) {
    const rect = refs.scrubberTrack.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
    const duration = player.duration();
    if (isFinite(duration) && duration > 0) {
      player.currentTime(pct * duration);
    }
  }

  refs.scrubber.addEventListener('touchstart', (e) => {
    activeScrubStack = stack;
    clearTimeout(autoHideTimer);    // pause auto-hide during scrub
    seekToTouch(e.touches[0]);
  }, { passive: true });

  // Named handlers so they can be removed on dispose and to guard against
  // multiple players each registering their own document-level listeners.
  const onScrubMove = (e) => {
    if (activeScrubStack !== stack) return;
    e.preventDefault();             // prevent page scroll during scrub
    seekToTouch(e.touches[0]);
  };

  const onScrubEnd = (e) => {
    if (activeScrubStack !== stack) return;
    activeScrubStack = null;
    if (e.changedTouches.length) seekToTouch(e.changedTouches[0]);
    resetAutoHideTimer();
  };

  document.addEventListener('touchmove', onScrubMove, { passive: false });
  document.addEventListener('touchend', onScrubEnd, { passive: true });

  // Clean up document-level listeners when the player is destroyed
  player.on('dispose', () => {
    document.removeEventListener('backbutton', onBackButton);
    document.removeEventListener('touchmove', onScrubMove);
    document.removeEventListener('touchend', onScrubEnd);
    clearTimeout(autoHideTimer);
    if (activeScrubStack === stack) activeScrubStack = null;
  });
}

// ── Desktop fullscreen: redirect VideoJS API to CSS fullscreen ───────────────
// Native Element.requestFullscreen() only puts the .video-js element fullscreen,
// leaving the caption zone and controls zone (stack siblings) invisible.
// We override the VideoJS fullscreen methods so the whole stack goes fullscreen.

function initDesktopFullscreen(player, stack) {
  if (isMobile()) return;

  player.requestFullscreen = () => {
    enterCssFullscreen(stack);
    player.addClass('vjs-fullscreen');
    player.trigger('fullscreenchange');
    return Promise.resolve();
  };

  player.exitFullscreen = () => {
    exitCssFullscreen(stack);
    player.removeClass('vjs-fullscreen');
    player.trigger('fullscreenchange');
    return Promise.resolve();
  };

  // VideoJS queries this to update the fullscreen button icon
  player.isFullscreen = () => stack.classList.contains('hm-fullscreen');

  // ESC key exits. (The focus trap in enterCssFullscreen also intercepts Escape
  // but finds no .hm-close-btn on desktop, so this handler is authoritative.)
  const onKeyDown = (e) => {
    if (e.key === 'Escape' && stack.classList.contains('hm-fullscreen')) {
      player.exitFullscreen();
    }
  };
  document.addEventListener('keydown', onKeyDown);
  player.on('dispose', () => document.removeEventListener('keydown', onKeyDown));
}

// ── Main VideoJS initialisation ───────────────────────────────────────────────

function initVideoInContainer(container, videojs) {
  const device = getDevice();
  // Disable fullscreen on mobile/Cordova — WebView is already fullscreen and
  // iOS hands off to AVPlayer (losing custom controls) when triggered.
  const disableFullscreen = !device.desktop;

  const players = container.querySelectorAll('.hm-video-player');
  if (!players.length) return;

  players.forEach((videoEl) => {
    const playerEl = ensureStack(videoEl);
    if (videojs.getPlayer(playerEl)) return;

    const stack = playerEl.closest('.hm-video-stack');
    const captionEl = stack?.querySelector('.hm-caption-text');
    const captionZone = stack?.querySelector('.hm-caption-zone');
    const controlsEl = stack?.querySelector('.hm-controls-zone');

    const player = videojs(playerEl, {
      controls: true,
      preload: 'metadata',
      fill: true,
      inactivityTimeout: 0,
      nativeControlsForTouch: false,
      playbackRates: [0.5, 0.75, 1, 1.5, 2],
      // playsinline prevents iOS Safari from hijacking playback into AVPlayer
      playsinline: true,
      html5: {
        // Disable native text tracks so track.mode = 'hidden' reliably
        // suppresses Safari's built-in caption overlay.
        nativeTextTracks: false,
      },
      controlBar: {
        pictureInPictureToggle: false,
        fullscreenToggle: !disableFullscreen,
        // CC button hidden: captions always display in our custom caption zone.
        // Remove this line to restore the button — modechange wiring below
        // already routes it to show/hide the caption zone correctly.
        subsCapsButton: false,
      },
    });

    player.on('loadedmetadata', function () {
      const w = player.videoWidth();
      if (w > 0 && stack) stack.style.maxWidth = w + 'px';
      // Seek to a tiny offset so iOS/Safari decodes and displays the first frame
      // as a still image rather than showing a blank/black poster.
      player.currentTime(0.001);
    });

    player.ready(function () {
      // Set playsinline directly on the internal <video> tech element.
      // VideoJS's playsinline option alone is unreliable on iOS/Cordova.
      const techEl = player.el().querySelector('video');
      if (techEl) {
        techEl.setAttribute('playsinline', '');
        techEl.setAttribute('webkit-playsinline', '');
      }

      if (controlsEl) {
        controlsEl.classList.add('video-js', 'vjs-default-skin');
        controlsEl.appendChild(player.controlBar.el());
      }

      const tracks = player.textTracks();
      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        if (track.kind !== 'captions' && track.kind !== 'subtitles') continue;

        track.mode = 'hidden';

        // Route CC toggle to our caption zone rather than the VideoJS overlay.
        // A guard prevents the mode reset from re-triggering the listener.
        let settingMode = false;
        track.addEventListener('modechange', () => {
          if (settingMode || track.mode === 'hidden') return;
          const show = track.mode === 'showing';
          settingMode = true;
          track.mode = 'hidden';   // keep VJS overlay suppressed
          settingMode = false;
          captionZone?.classList.toggle('hm-captions-off', !show);
        });

        const updateCaption = () => {
          if (!captionEl) return;
          const cues = track.activeCues;
          captionEl.textContent = (cues && cues.length > 0) ? cues[0].text : '\u00A0';
        };

        track.addEventListener('cuechange', updateCaption);
        updateCaption();
      }

      initDesktopFullscreen(player, stack);
      initMobileOverlay(player, stack);
    });
  });
}
