import {
    KEYS,
    isActivationKey,
    isEscapeKey,
    createFocusTrapHandler,
    getVisibleFocusableElements,
} from "./focus-trap";
import { createSmartSelectAccessibilityHandlers } from "./smart-select-a11y";

// https://silvantroxler.ch/2016/setting-voiceover-focus-with-javascript/
function setVoiceOverFocus(element) {
    var focusInterval = 10; // ms, time between function calls
    var focusTotalRepetitions = 10; // number of repetitions

    element.setAttribute("tabindex", "0");
    element.blur();

    var focusRepetitions = 0;
    var interval = window.setInterval(function () {
        element.focus();
        focusRepetitions++;
        if (focusRepetitions >= focusTotalRepetitions) {
            window.clearInterval(interval);
        }
    }, focusInterval);
}

export {
    KEYS,
    isActivationKey,
    isEscapeKey,
    setVoiceOverFocus,
    createFocusTrapHandler,
    createSmartSelectAccessibilityHandlers,
    getVisibleFocusableElements,
};
