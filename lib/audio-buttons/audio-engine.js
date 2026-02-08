/**
 * Audio Engine Interface
 *
 * The audio engine provides a unified interface for text-to-speech (TTS) functionality.
 * It abstracts the underlying TTS implementation (e.g., Cordova TTS plugin, Web Speech API,
 * or a debug engine).
 *
 * The audio engine must implement the following contract:
 *
 * @typedef {Object} AudioEngine
 * @property {function(Context): Promise<void>} speak - Initiates speech synthesis for the given context.
 *   Resolves when speech is finished or cancelled.
 * @property {function(): Promise<void>} stop - Stops any ongoing speech synthesis. Resolves when speech is stopped.
 *
 * @typedef {Object} Context
 * @property {string} text - The text to be spoken.
 * @property {string} [locale] - The locale/language code for the speech (e.g., 'en-US').
 * @property {number} [rate] - The speech rate as a fraction of the default (e.g., 1.0 for normal speed).
 * @property {string} [voice] - The name or identifier of the voice to use.
 *
 * @function initAudioEngine
 * @param {boolean} forceAudio - If true, initializes the debug audio engine if no real TTS is available.
 * @returns {AudioEngine} The initialized audio engine instance.
 *
 * @function getAudioEngine
 * @returns {AudioEngine|null} The current audio engine instance, or null if not initialized.
 */

let audioEngine = null;

const debugAudioEngine = {
      speak: function (context) {
        console.log("TTS SPEAK:", context && context.text ? context.text : context);
        return new Promise((resolve) => setTimeout(resolve, 200));
      },
      stop: function () {
        return Promise.resolve();
      }
};

/**
 * Creates an audio engine backed by the Web Speech API (SpeechSynthesis).
 * Used when the Cordova TTS plugin is not available but the browser supports
 * window.speechSynthesis and SpeechSynthesisUtterance.
 */
function createWebSpeechEngine() {
  const synth = window.speechSynthesis;
  let keepAliveTimer = null;
  let cachedVoices = [];

  // Voices load asynchronously in most browsers. Firefox in particular may
  // return voices without default flags until the voiceschanged event fires.
  function loadVoices() {
    cachedVoices = synth.getVoices();
  }

  // Load immediately in case voices are already available (Chrome).
  loadVoices();
  // Listen for async voice loading (Firefox, Safari).
  // Safari requires property assignment rather than addEventListener.
  synth.onvoiceschanged = loadVoices;

  // Chrome/Chromium silently cuts off utterances after ~15 seconds.
  // A periodic pause/resume resets the timer. This workaround must NOT
  // run on Firefox, where pause() silently kills speech without firing events.
  var isChromium = /Chrome\//.test(navigator.userAgent);

  function startKeepAlive() {
    stopKeepAlive();
    if (!isChromium) return;
    keepAliveTimer = setInterval(function () {
      if (synth.speaking && !synth.paused) {
        synth.pause();
        synth.resume();
      }
    }, 14000);
  }

  function stopKeepAlive() {
    if (keepAliveTimer !== null) {
      clearInterval(keepAliveTimer);
      keepAliveTimer = null;
    }
  }

  // Score a voice for quality. Higher is better.
  // Firefox on macOS exposes novelty voices (Albert, Bells, Boing, etc.)
  // alongside real ones, with none marked as default until voiceschanged fires.
  function scoreVoice(voice) {
    if (voice.default) return 4;
    // Voices with parenthetical qualifiers like "Samantha (Enhanced)" or
    // "Eddy (English (UK))" are modern, high-quality system voices.
    if (/\(/.test(voice.name)) return 3;
    if (voice.localService) return 1;
    return 0;
  }

  function findVoice(locale) {
    if (!locale) locale = navigator.language;
    if (!locale) return null;

    var voices = cachedVoices.length ? cachedVoices : synth.getVoices();
    if (!voices.length) return null;

    var langPrefix = locale.split('-')[0].toLowerCase();
    // When the app locale has no region (e.g. "en"), use navigator.language
    // (e.g. "en-US") as a tiebreaker to prefer the user's regional variant.
    var preferredLang = (locale.indexOf('-') === -1) ? navigator.language : locale;

    var candidates = voices.filter(function (v) {
      if (v.lang === locale) return true;
      return v.lang.split('-')[0].toLowerCase() === langPrefix;
    });

    if (!candidates.length) return null;

    candidates.sort(function (a, b) {
      var scoreDiff = scoreVoice(b) - scoreVoice(a);
      if (scoreDiff !== 0) return scoreDiff;
      var aMatch = (a.lang === preferredLang) ? 1 : 0;
      var bMatch = (b.lang === preferredLang) ? 1 : 0;
      return bMatch - aMatch;
    });
    return candidates[0];
  }

  return {
    speak: function (context) {
      return new Promise(function (resolve, reject) {
        // Cancel any previous utterance. Also works around a Chrome bug where
        // the API can freeze if speak() is called without a preceding cancel().
        synth.cancel();

        var utterance = new SpeechSynthesisUtterance(context.text);

        if (context.locale) {
          utterance.lang = context.locale;
        }

        // Always attempt voice selection, falling back to navigator.language.
        // This avoids Firefox picking a novelty voice when no default is set.
        var voice = findVoice(context.locale);
        if (voice) {
          utterance.voice = voice;
        }

        if (context.rate) {
          utterance.rate = context.rate;
        }

        if (context.volume !== undefined) {
          utterance.volume = context.volume;
        }

        utterance.onend = function () {
          stopKeepAlive();
          resolve();
        };

        utterance.onerror = function (event) {
          stopKeepAlive();
          // 'canceled' and 'interrupted' are expected when stop() is called.
          if (event.error === 'canceled' || event.error === 'interrupted') {
            resolve();
          } else {
            reject(event.error);
          }
        };

        startKeepAlive();
        synth.speak(utterance);
      });
    },

    stop: function () {
      stopKeepAlive();
      synth.cancel();
      return Promise.resolve();
    }
  };
}

function initAudioEngine(forceAudio) {
    if (window.TTS) {
        audioEngine = window.TTS;
    } else if (window.speechSynthesis && window.SpeechSynthesisUtterance) {
        audioEngine = createWebSpeechEngine();
    } else if (forceAudio) {
        audioEngine = debugAudioEngine;
    }

    return audioEngine;
}

function getAudioEngine() {
    return audioEngine;
}

export { initAudioEngine, getAudioEngine };
