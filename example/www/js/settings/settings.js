/*
 *  adventure
 * 
 *    
 */

import {
  Dom7
} from 'framework7/bundle';
import Template7 from 'template7';
import './settings.scss';
import {
  resources
} from '../resources';
import {
  appConfig
} from '../appConfig';


let $$ = Dom7;



function initSettings() {

  $$(document).on('page:reinit', '.page[data-id="J5-settings"]', function(e) {
    const page = e.detail;
  });

  $$(document).on('page:init', '.page[data-id="J5-settings"]', function(e) {
    const page = e.detail;


  });
}

export {
  initSettings,
};