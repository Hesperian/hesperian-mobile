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

function initVideoInContainer(container, videojs) {
  const device = getDevice();
  // Disable fullscreen on mobile/Cordova — WebView is already fullscreen and
  // iOS hands off to AVPlayer (losing custom controls) when triggered.
  // Use !!window.cordova instead to suppress only inside the Cordova container.
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
    });
  });
}
