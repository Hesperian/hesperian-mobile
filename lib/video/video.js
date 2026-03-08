import { Dom7, getDevice } from 'framework7/bundle';
import './video.scss';

const $$ = Dom7;

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
  $$(document).on('page:init', async function (e) {
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
  const tapOverlay = document.createElement('div');
  tapOverlay.className = 'hm-tap-overlay';
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

  overlayControls.appendChild(scrubber);
  overlayControls.appendChild(ctrlRow);
  captionZone.insertAdjacentElement('afterend', overlayControls);

  return {
    tapOverlay, closeBtn, overlayControls,
    scrubber, scrubberTrack, scrubberFill, scrubberThumb,
    playBtn, replayBtn, forwardBtn, timeEl,
  };
}

// Wire up all mobile overlay behaviour for a player.
// Only runs on non-desktop devices. Adds .hm-mobile to the stack to suppress
// the VideoJS controls zone.
function initMobileOverlay(player, stack) {
  if (!isMobile()) return;

  stack.classList.add('hm-mobile');

  const refs = buildOverlayDOM(stack);
  let autoHideTimer = null;
  let isSeeking = false;

  // ── Player state → UI sync ──────────────────────────────────────────────

  function setPlayIcon(name) {
    const iconEl = refs.playBtn.querySelector('.material-icons');
    if (iconEl) iconEl.textContent = name;
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
    if (!isSeeking) resetAutoHideTimer();
  }

  function hideControls() {
    refs.overlayControls.classList.add('hm-controls-hidden');
  }

  function resetAutoHideTimer() {
    clearTimeout(autoHideTimer);
    autoHideTimer = setTimeout(hideControls, 3000);
  }

  // ── Fullscreen enter / exit ─────────────────────────────────────────────
  // The stack is moved to document.body on enter so that position:fixed
  // covers the full viewport. Framework7 pages use CSS transform for
  // slide animations, which would otherwise make position:fixed relative
  // to the page element rather than the viewport.

  let fsOriginalParent = null;
  let fsOriginalNextSibling = null;

  function enterFullscreen() {
    // Detach from page and attach to body before adding the fixed class
    fsOriginalParent = stack.parentNode;
    fsOriginalNextSibling = stack.nextSibling;
    document.body.appendChild(stack);

    stack.classList.add('hm-fullscreen');
    document.body.style.overflow = 'hidden';
    player.play();
    showControls();
  }

  function exitFullscreen() {
    stack.classList.remove('hm-fullscreen');
    document.body.style.overflow = '';
    player.pause();
    clearTimeout(autoHideTimer);
    autoHideTimer = null;

    // Restore stack to its original position in the page
    if (fsOriginalParent) {
      fsOriginalParent.insertBefore(stack, fsOriginalNextSibling);
      fsOriginalParent = null;
      fsOriginalNextSibling = null;
    }
  }

  // ── User interactions ───────────────────────────────────────────────────

  // Tap overlay: only act when not already in full-screen (enter full-screen + play)
  refs.tapOverlay.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!stack.classList.contains('hm-fullscreen')) {
      enterFullscreen();
    }
  });

  // Play / pause
  refs.playBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (player.paused()) {
      player.play();
    } else {
      player.pause();
    }
    showControls();
  });

  // Skip buttons
  refs.replayBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    player.currentTime(Math.max(0, player.currentTime() - 10));
    showControls();
  });

  refs.forwardBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    player.currentTime(Math.min(player.duration(), player.currentTime() + 10));
    showControls();
  });

  // Close button
  refs.closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    exitFullscreen();
  });

  // Android hardware back button (Cordova)
  document.addEventListener('backbutton', (e) => {
    if (stack.classList.contains('hm-fullscreen')) {
      e.preventDefault();
      exitFullscreen();
    }
  });

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
    isSeeking = true;
    clearTimeout(autoHideTimer);    // pause auto-hide during scrub
    seekToTouch(e.touches[0]);
  }, { passive: true });

  const onScrubMove = (e) => {
    if (!isSeeking) return;
    e.preventDefault();             // prevent page scroll during scrub
    seekToTouch(e.touches[0]);
  };

  const onScrubEnd = (e) => {
    if (!isSeeking) return;
    isSeeking = false;
    if (e.changedTouches.length) seekToTouch(e.changedTouches[0]);
    resetAutoHideTimer();
  };

  document.addEventListener('touchmove', onScrubMove, { passive: false });
  document.addEventListener('touchend', onScrubEnd, { passive: true });
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
    const controlsEl = stack?.querySelector('.hm-controls-zone');

    const player = videojs(playerEl, {
      controls: true,
      preload: 'metadata',
      fill: true,
      inactivityTimeout: 0,
      nativeControlsForTouch: false,
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
      },
    });

    player.on('loadedmetadata', function () {
      const w = player.videoWidth();
      if (w > 0 && stack) stack.style.maxWidth = w + 'px';
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

        const updateCaption = () => {
          if (!captionEl) return;
          const cues = track.activeCues;
          captionEl.textContent = (cues && cues.length > 0) ? cues[0].text : '\u00A0';
        };

        track.addEventListener('cuechange', updateCaption);
        updateCaption();
      }

      initMobileOverlay(player, stack);
    });
  });
}
