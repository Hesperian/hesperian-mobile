/*  analytics
 * 
 */

import { appConfig } from '../appConfig';


// In the mobile app, analytics comes from cordova plugin
const analytics = window.cordova && window.cordova.plugins && window.cordova.plugins.firebase && window.cordova.plugins.firebase.analytics;


// On the web, analytics comes from direct inclusion via <script> in index.html
// But since it loads async, we need to be ready to act before it is.
let firebaseStack = [];

function firebaseClearActions() {
  const firebase = window.firebase;
  if (!firebase) { // firebase hasn't loaded yet
    return;
  }

  while (firebaseStack.length > 0) {
    item = firebaseStack.shift()
    firebase[item.action](firebase.analytics, item.name, item.options);
  }
}

function firebaseAction(action, name, options) {
  if (!window.app.data.firebaseConfig) { // No firebase for this app
    return;
  }

  firebaseStack.push({
    action: action,
    name: name,
    options: options
  });
  firebaseClearActions();
}



function logEvent(event, data) {
  if (analytics) {
    analytics.logEvent(event, data)
  } else {
    firebaseAction('logEvent', event, data)
  }
}

function setCurrentScreen(screen) {
  if (analytics) {
    analytics.setCurrentScreen(screen)
  } else {
    firebaseAction('setCurrentScreen', screen)

  }
}

export {
  logEvent,
  setCurrentScreen
};