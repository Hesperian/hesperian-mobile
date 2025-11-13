/*  analytics
 * 
 */

import { appConfig } from '../appConfig';
import { getApp } from '../app';


// In the mobile app, analytics comes from cordova plugin
const analytics = window.cordova && window.cordova.plugins && window.cordova.plugins.firebase && window.cordova.plugins.firebase.analytics;


// On the web, analytics comes from direct inclusion via <script> in index.html
// But since it loads async, we need to be ready to act before it is.
let firebaseStack = [];

function getAppData() {
  const app = getApp();
  const store = app && app.store;
  return store && store.state ? store.state.appData : undefined;
}

function firebaseClearActions() {
  const firebase = window.firebase;
  if (!firebase) { // firebase hasn't loaded yet
    return;
  }

  while (firebaseStack.length > 0) {
    let item = firebaseStack.shift()
    firebase[item.action](firebase.analytics, item.name, item.options);
  }
}

function firebaseAction(action, name, options) {
  const appData = getAppData();
  if (!appData || !appData.firebaseConfig) { // No firebase for this app
    return;
  }

  firebaseStack.push({
    action: action,
    name: name,
    options: options
  });
  firebaseClearActions();
}


function addDefaultEventParameters(data) {
  if (!data.pageId) {
    const app = getApp();
    // Use views.main which is more reliable than views.current
    // Add defensive checks in case router isn't ready yet
    if (app && app.views && app.views.main && app.views.main.router) {
      const currentRoute = app.views.main.router.currentRoute;
      const pageId = currentRoute && currentRoute.params && currentRoute.params.pageId;
      data.pageId = pageId || 'Home';
    } else {
      data.pageId = 'Home';
    }
  }

  if (!data.locale) {
    data.locale = appConfig.locale();
  }
}

function logEvent(event, data) {
  if (!data) {
    data = {};
  }
  addDefaultEventParameters(data);

  if (analytics) {
    analytics.logEvent(event, data)
  } else {
    firebaseAction('logEvent', event, data)
  }
}

let previousScreen = '';

function setCurrentScreen(screen) {
  if (analytics) {
    analytics.setCurrentScreen(screen)
  } else {
    // Seems like you are not actually supposed to call setCurrentScreen - the analytics plugin
    // translates these to logEvent calls (event screen_view, paramater screen_name)
    // Evidently these get translated to have different parameters with firebase_ prefixes when actually sent 
    // a la https://support.google.com/analytics/answer/9234069 scree_view docs
    firebaseAction('logEvent', 'screen_view', {
      firebase_screen: screen,
      firebase_previous_screen: previousScreen
    });
  }
  previousScreen = screen;
}

export {
  logEvent,
  setCurrentScreen
};