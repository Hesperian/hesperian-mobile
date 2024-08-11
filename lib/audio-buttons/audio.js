/*
 * Low level interface and wrapper around tts
 */

const MODE_STARTING = 0;
const MODE_PLAYING = 1;

let nowPlaying = null; // Current speach. Starts mode MODE_STARTING; -> MODE_PLAYING on tts speak()
let speekingID = 0; // We will track a unique id for each speak() for (at least) debugging purposes.

/*
  Adjust rate for iOS. We do this in js code while testing, but really this should live
  in the CDZTTS.m of the cordova-plugin-tts-advanced plugin
  
  rate for AVSpeechUtterance, based on empirical measurements, means:
  0.0 = AVSpeechUtteranceMinimumSpeechRate is 50% of default
  0.5 = AVSpeechUtteranceDefaultSpeechRate is 100% of default
  1.0 = AVSpeechUtteranceMaximumSpeechRate is about 800% of default
  
  Let x = be the rate input into AVSpeechUtterance
  Let y = be the desired rate as a fraction of the default (e.g. 0.5, 1.0, 1.5)
  
  then we can model the curve by
  y = (1/2) 2^(pow(2 * x, 2))
  
  Inverting, our conversion is
  
  x = (1/2) sqrt((log2(2y))

  */
function normalizeRate(rate) {
  if (window.app && window.app.device.ios) {
    rate = (Math.sqrt(Math.log2(2 * rate))) / 2;

    // clamp and handle NaNs
    if( !(rate > 0)) {
      rate = 0;
    }
    if( rate > 1) {
      rate = 1;
    }

    if(!rate) {
      rate = 0.00000001; // fool plugin to not use default - it tests for "!rate"
    }
  }

  return rate;

}

// Main entrypoint for triggering an actual utterance
// If there's a nowPlaying ready to go, do it.
function checkSpeechQueue() {
  if (!nowPlaying) return;

  if (nowPlaying.mode === MODE_STARTING) {
    nowPlaying.mode = MODE_PLAYING;
    window.TTS.speak(nowPlaying.context).finally(
      function() {
        doSpeechCommandCompleted();
      },
      function() {
        doSpeechCommandCompleted();
      },
    );
  }
}

var stamp;


// When a speak() is done, clear nowPlaying and event out that this happened.
function doSpeechCommandCompleted() {
  if (!nowPlaying) return;

  const eventContext = {
    speekingID: nowPlaying.speekingID,
    context: nowPlaying.context
  };

  nowPlaying = null;

  window.app.emit('speechStopped', eventContext);
}


// Worker for starting a speak()
// Enques the context, and delays a tick to checkSpeechQueue()
function doSpeechStarted(context) {
  nowPlaying = {
    speekingID: speekingID,
    context: context,
    mode: MODE_STARTING
  };
  setTimeout(checkSpeechQueue, 0);
  window.app.emit('speechStarted', {
    speekingID: speekingID
  });
 stamp =  Date.now();

}

// Worker for stopping a speak()
// Clears nowPlaying but does not event. Any eventing will happen because of the stopping of the speak().
function doSpeechCancelled() {
  // Stop the speak. 
  // Note: While the cordova interace to the plugin accepts a promise, in fact it's never
  // resolved or rejected. The plugin seems to assume immediate effect.
  if(!window.TTS) return;
  
  window.TTS.stop().then(
    function() {
    },
    function() {
    }
  );

  nowPlaying = null;
}

function speak(context) {
  speekingID++;
  if( context.rate) {
    context.rate = normalizeRate(context.rate);
  }
  doSpeechStarted(context);
  return speekingID;
}

function stop() {
  doSpeechCancelled();
}

function ttsIsPlaying() {
  return nowPlaying !== null;
}

export {
  speak,
  stop,
  ttsIsPlaying
};