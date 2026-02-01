import { getApp, initApp } from './lib/app';
import { appConfig } from './lib/appConfig';
import { resources } from './lib/resources';
import { logEvent } from './lib/analytics/analytics';
import {
  KEYS,
  isActivationKey,
  isEscapeKey,
  createSmartSelectAccessibilityHandlers,
  getVisibleFocusableElements,
  createFocusTrapHandler,
  injectAriaIntoElement,
} from './lib/accessibility/accessibility';

export {
  getApp,
  initApp,
  appConfig,
  resources,
  logEvent,
  KEYS,
  isActivationKey,
  isEscapeKey,
  createSmartSelectAccessibilityHandlers,
  getVisibleFocusableElements,
  createFocusTrapHandler,
  injectAriaIntoElement,
};