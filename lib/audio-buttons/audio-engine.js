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

  // Chrome silently cuts off utterances after ~15 seconds.
  // A periodic pause/resume resets the timer.
  function startKeepAlive() {
    stopKeepAlive();
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

  function findVoice(locale) {
    if (!locale) return null;
    const voices = synth.getVoices();
    if (!voices.length) return null;

    // Exact match first (e.g. "en-US")
    const exact = voices.find(function (v) { return v.lang === locale; });
    if (exact) return exact;

    // Prefix match (e.g. "en" matches "en-US")
    const prefix = locale.split('-')[0].toLowerCase();
    return voices.find(function (v) {
      return v.lang.split('-')[0].toLowerCase() === prefix;
    }) || null;
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
          var voice = findVoice(context.locale);
          if (voice) {
            utterance.voice = voice;
          }
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
          // 'canceled' and 'interrupted' are expected when stop() is called
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
    if( window.TTS) {
        audioEngine = window.TTS;
    } else if (window.speechSynthesis && window.SpeechSynthesisUtterance) {
        audioEngine = createWebSpeechEngine();
    } else if( forceAudio ) {
        audioEngine = debugAudioEngine;
    }

    return audioEngine;
}

function getAudioEngine() {
    return audioEngine;
}

export { initAudioEngine, getAudioEngine };
