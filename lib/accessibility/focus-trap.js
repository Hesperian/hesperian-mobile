/*
 * Focus trap utilities for modal dialogs and popups.
 * Provides keyboard navigation support including Tab wrapping and Escape key handling.
 */

import { Dom7 } from "framework7/bundle";

const $$ = Dom7;

const focusableElementsString =
  'a[href], area[href], input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), button:not([disabled]), iframe, object, embed, ' +
  '[tabindex="0"], [contenteditable], label.item-radio';

/**
 * Get all visible and enabled focusable elements within a container.
 * @param {Dom7} $container - The container element to search within
 * @returns {HTMLElement[]} Array of focusable elements
 */
function getVisibleFocusableElements($container) {
  const allFocusable = $container.find(focusableElementsString);
  const focusableElements = [];

  for (let i = 0; i < allFocusable.length; i++) {
    const el = allFocusable[i];
    const $el = $$(el);
    // Check visibility
    if (
      $el.css("display") !== "none" &&
      $el.css("visibility") !== "hidden" &&
      $el.parents(".visually-hidden").length === 0
    ) {
      // Check disabled state more thoroughly
      if (
        !$el.prop("disabled") &&
        !$el.hasClass("disabled") &&
        !$el.parents(".disabled").length
      ) {
        focusableElements.push(el);
      }
    }
  }
  return focusableElements;
}

/**
 * Create a focus trap keydown handler for a popup/dialog.
 * Handles Escape key to close and Tab key wrapping.
 * @param {Function} [getCloseButton] - Optional function to get close button element
 * @returns {Function} Keydown event handler
 */
function createFocusTrapHandler(getCloseButton) {
  return function handleFocusTrap(e) {
    const $popup = $$(this);

    if (isEscapeKey(e)) {
      e.preventDefault();
      const $closeBtn = getCloseButton
        ? getCloseButton($popup)
        : $popup.find(".popup-close");
      if ($closeBtn.length > 0) {
        $closeBtn.click();
      }
      return;
    }

    const focusableElements = getVisibleFocusableElements($popup);

    if (focusableElements.length === 0) return;

    const firstTabStop = focusableElements[0];
    const lastTabStop = focusableElements[focusableElements.length - 1];

    let currentIndex = -1;
    for (let i = 0; i < focusableElements.length; i++) {
      if (focusableElements[i] === document.activeElement) {
        currentIndex = i;
        break;
      }
    }

    if (e.keyCode === KEYS.TAB) {
      if (e.shiftKey) {
        // Shift + Tab
        if (currentIndex === 0 || currentIndex === -1) {
          e.preventDefault();
          lastTabStop.focus();
        }
      } else {
        // Tab
        if (currentIndex === focusableElements.length - 1) {
          e.preventDefault();
          firstTabStop.focus();
        } else if (
          currentIndex === -1 &&
          document.activeElement !== $popup[0]
        ) {
          e.preventDefault();
          firstTabStop.focus();
        }
      }
    }
  };
}

export {
  getVisibleFocusableElements,
  createFocusTrapHandler,
};
