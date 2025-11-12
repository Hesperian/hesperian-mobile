/*
 *  Hesperian Example Application
 *  Copyright Hesperian Health Guides 2017-2018
 *
 */

import "core-js/stable";

import '../css/styles.scss';

import {
  resources as enResources
} from '../locales/en/resources/resources';
import {
  resources as esResources
} from '../locales/es/resources/resources';
import {
  initApp
} from 'hesperian-mobile';
import appConfig from './../../app-config.json';


initApp({
  f7: {
    id: appConfig.id,
    name: appConfig.name
  },
  configVersion: '0.0.2',
  "theme": {
    "bottomToolbar": true
  },
  appData: appConfig,
  localeData: {
    en: enResources,
    es: esResources
  }
});