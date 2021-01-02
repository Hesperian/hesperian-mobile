/*
 *  favorites
 * 
 *  Handles text to speack
 */

import {
  Template7,
  Dom7
} from 'framework7/framework7.esm.bundle.js';
import './audio.scss';

const $$ = Dom7;

function setClass(element, classname, value) {
  if (value) {
    element.addClass(classname);
  } else {
    element.removeClass(classname);
  }
}

function initializeAudio(app, appConfig, resources) {
  $$(document).on('click', '.toggle-audio', function() {
    if ($$('#app').hasClass('audio-mode')) {
      $$('#app').removeClass('audio-mode');
    } else {
      $$('#app').addClass('audio-mode');
    }
  });
}

export {
  initializeAudio
}