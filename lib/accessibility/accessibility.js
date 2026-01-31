import { Dom7 } from "framework7/bundle";
import { KEYS, isActivationKey, isEscapeKey } from "./accessibility-util";
import { createFocusTrapHandler, getVisibleFocusableElements } from "./focus-trap";
import { createSmartSelectAccessibilityHandlers } from "./smart-select-a11y";
import { resources } from "../resources";

const $$ = Dom7;

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

function updateAiraLabels(pageEl) {
    $$('[data-aria-label]', pageEl).each(function () {
        const labelKey = resources.get($$(this).data("aria-label"));
        const ariaAttribute = this.nodeName === 'IMG' ? "alt" : "aria-label";
        $$(this).attr(ariaAttribute, labelKey);
    });
    $$('[data-aria-content]', pageEl).each(function () {
        const val = resources.get($$(this).data("aria-content"));
        $$(this).text(val);
    });
}

function injectAriaIntoElement(pageEl) {
    updateAiraLabels(pageEl);

    $$(".aria-keyboard-accessible:not(.aria-keyboard-accessible-added)", pageEl).each(function () {
        $$(this).attr("tabindex", "0");
        $$(this).on("keydown", function (e) {
            if (isActivationKey(e)) {
                e.preventDefault();
                $$(this).click();
            }
        });
        $$(this).addClass("aria-keyboard-accessible-added");
    });
}

export {
    KEYS,
    isActivationKey,
    isEscapeKey,
    setVoiceOverFocus,
    createFocusTrapHandler,
    createSmartSelectAccessibilityHandlers,
    getVisibleFocusableElements,
    injectAriaIntoElement,
};
