/*
 * Focus trap utilities for modal dialogs and popups.
 * Provides keyboard navigation support including Tab wrapping and Escape key handling.
 * All functions accept plain DOM elements — no Dom7 dependency.
 */

const focusableElementsSelector =
  'a[href], area[href], input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), button:not([disabled]), iframe, object, embed, ' +
  '[tabindex="0"], [contenteditable], label.item-radio';

/**
 * Get all visible and enabled focusable elements within a container.
 * @param {HTMLElement} container - The container element to search within
 * @returns {HTMLElement[]} Array of focusable elements
 */
function getVisibleFocusableElements(container) {
  const focusableElements = [];

  for (const el of container.querySelectorAll(focusableElementsSelector)) {
    const style = getComputedStyle(el);
    if (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      !el.closest('.visually-hidden') &&
      !el.disabled &&
      !el.classList.contains('disabled') &&
      !el.closest('.disabled')
    ) {
      focusableElements.push(el);
    }
  }

  return focusableElements;
}

/**
 * Create a focus trap keydown handler for a popup/dialog.
 * Handles Escape key to close and Tab key wrapping within the container.
 *
 * Attach the returned handler to the container element:
 *   container.addEventListener('keydown', createFocusTrapHandler(...))
 *
 * @param {Function} [getCloseButton] - Optional. Receives the container element
 *   (HTMLElement) and returns the close button element (HTMLElement) or null.
 *   Defaults to container.querySelector('.popup-close').
 * @returns {Function} Keydown event handler
 */
function createFocusTrapHandler(getCloseButton) {
  return function handleFocusTrap(e) {
    const container = e.currentTarget;

    if (e.key === 'Escape') {
      e.preventDefault();
      const closeBtn = getCloseButton
        ? getCloseButton(container)
        : container.querySelector('.popup-close');
      closeBtn?.click();
      return;
    }

    if (e.key !== 'Tab') return;

    const focusableElements = getVisibleFocusableElements(container);
    if (focusableElements.length === 0) return;

    const first = focusableElements[0];
    const last  = focusableElements[focusableElements.length - 1];
    const currentIndex = focusableElements.indexOf(document.activeElement);

    if (e.shiftKey) {
      // Shift+Tab: wrap from first → last
      if (currentIndex <= 0) {
        e.preventDefault();
        last.focus();
      }
    } else {
      // Tab: wrap from last → first; also pull focus in if it escaped the container
      if (currentIndex === focusableElements.length - 1) {
        e.preventDefault();
        first.focus();
      } else if (currentIndex === -1 && document.activeElement !== container) {
        e.preventDefault();
        first.focus();
      }
    }
  };
}

export {
  getVisibleFocusableElements,
  createFocusTrapHandler,
};
