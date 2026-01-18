import { getApp, initApp } from './lib/app';
import { appConfig } from './lib/appConfig';
import { resources } from './lib/resources';
import { logEvent } from './lib/analytics/analytics';
import {
  createSmartSelectAccessibilityHandlers,
  getVisibleFocusableElements,
  createFocusTrapHandler,
} from './lib/accessibility/smart-select-a11y';

export {
  getApp,
  initApp,
  appConfig,
  resources,
  logEvent,
  createSmartSelectAccessibilityHandlers,
  getVisibleFocusableElements,
  createFocusTrapHandler,
};