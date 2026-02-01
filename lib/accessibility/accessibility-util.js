/*
 * Low-level accessibility utilities
 */

/**
 * Key code constants for keyboard event handling.
 * Use these instead of magic numbers for clarity and maintainability.
 */
const KEYS = {
  ENTER: 13,
  SPACE: 32,
  ESCAPE: 27,
  TAB: 9,
  ARROW_UP: 38,
  ARROW_DOWN: 40,
  ARROW_LEFT: 37,
  ARROW_RIGHT: 39,
};

/**
 * Check if the event is the Escape key.
 * @param {KeyboardEvent} e - The keyboard event
 * @returns {boolean}
 */
function isEscapeKey(e) {
  return e.key === 'Escape'
}

const roleToKey = {
    "button": {Enter: true, " ": true, Spacebar: true}
}

/**
 * Check if the event is an activation key (Enter or Space).
 * Per ARIA: buttons should activate on both Enter and Space.
 * @param {KeyboardEvent} e - The keyboard event
 * @param {string} role - The ARIA role of the element
 * @returns {boolean}
 */
function isActivationKey(e, role) {
  const effectiveRole = roleToKey[role] ? roleToKey[role] : "button";
  return roleToKey[effectiveRole][e.key];
}


export { isActivationKey, isEscapeKey, KEYS }