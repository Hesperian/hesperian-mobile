/**
 * Audio Engine Interface
 *
 * The audio engine provides a unified interface for text-to-speech (TTS) functionality.
 * It abstracts the underlying TTS implementation (e.g., Cordova TTS plugin or a debug engine).
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

function initAudioEngine(forceAudio) {
    if( window.TTS) {
        audioEngine = window.TTS;
    } else if( forceAudio ) {
        audioEngine = debugAudioEngine;
    }

    return audioEngine;
}

function getAudioEngine() {
    return audioEngine;
}

export { initAudioEngine, getAudioEngine };