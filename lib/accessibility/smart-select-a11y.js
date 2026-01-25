/*
 * Accessibility helpers for Framework7 Smart Select components.
 * Provides focus trapping, ARIA attributes, and keyboard navigation.
 */

import { Dom7 } from "framework7/bundle";
import {
  isActivationKey,
  getVisibleFocusableElements,
  createFocusTrapHandler,
} from "./focus-trap";

const $$ = Dom7;

const handleFocusTrap = createFocusTrapHandler();

/**
 * Create event handlers for Framework7 smart-select with full accessibility support.
 * Use these handlers in the smart-select `on` configuration.
 *
 * @example
 * const a11yHandlers = createSmartSelectAccessibilityHandlers();
 * app.smartSelect.create({
 *   el: element,
 *   openIn: "popup",
 *   on: a11yHandlers
 * });
 *
 * @returns {Object} Event handlers for open, opened, close, closed events
 */
function createSmartSelectAccessibilityHandlers() {
  return {
    open: function (smartSelect) {
      const $trigger = $$(smartSelect.el);
      $trigger.attr("aria-expanded", "true");

      const $popup = smartSelect.$containerEl;
      $popup.attr("role", "dialog");
      $popup.attr("aria-modal", "true");
      $popup.attr("tabindex", "-1");
      $popup.css("outline", "none");
      $popup.on("keydown", handleFocusTrap);
    },

    opened: function (smartSelect) {
      const $popup = smartSelect.$containerEl;

      // Ensure close button is focusable
      $popup.find(".popup-close").each(function () {
        const $el = $$(this);
        if (!$el.attr("href") && !$el.attr("tabindex")) {
          $el.attr("href", "#");
          $el.attr("role", "button");
        }
      });

      // Make radio items focusable since inputs are often hidden
      $popup.find("label.item-radio").each(function () {
        const $el = $$(this);
        // Only make it focusable if it's not disabled
        if (!$el.hasClass("disabled") && !$el.parents(".disabled").length) {
          $el.attr("tabindex", "0");
          $el.attr("role", "option");
          $el.on("keydown", function (e) {
            if (isActivationKey(e)) {
              e.preventDefault();
              $el.click();
            }
          });
        }
      });

      // Focus management: try to focus selected item or first focusable
      const focusableElements = getVisibleFocusableElements($popup);
      let $target = $popup.find("input[type='radio']:checked");

      // If input is hidden, try to find its label
      if (
        $target.length > 0 &&
        ($target.css("display") === "none" ||
          $target.css("visibility") === "hidden")
      ) {
        const $label = $target.parents("label.item-radio");
        if ($label.length > 0) {
          $target = $label;
        }
      }

      if (
        $target.length === 0 ||
        $target.css("display") === "none" ||
        $target.css("visibility") === "hidden"
      ) {
        if (focusableElements.length > 0) {
          $target = $$(focusableElements[0]);
        }
      }

      if ($target.length > 0) {
        $target[0].focus();
      }

      if (document.activeElement !== $target[0]) {
        $popup[0].focus();
      }
    },

    close: function (smartSelect) {
      const $trigger = $$(smartSelect.el);
      $trigger.attr("aria-expanded", "false");
      const $popup = smartSelect.$containerEl;
      $popup.off("keydown", handleFocusTrap);
    },

    closed: function (smartSelect) {
      // Restore focus to the trigger element
      const $trigger = $$(smartSelect.el);
      if ($trigger.length > 0) {
        $trigger[0].focus();
      }
    },
  };
}

export {
  createSmartSelectAccessibilityHandlers,
  getVisibleFocusableElements
};
