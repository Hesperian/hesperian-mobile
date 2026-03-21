import { Dom7 } from "framework7/bundle";
import Template7 from "template7";
import { KEYS, isActivationKey, isEscapeKey } from "./accessibility-util";
import { createFocusTrapHandler, getVisibleFocusableElements } from "./focus-trap";
import { createSmartSelectAccessibilityHandlers } from "./smart-select-a11y";
import { resources } from "../resources";

const $$ = Dom7;

// Move programmatic focus to an element without triggering scroll.
// tabindex="-1" makes it focusable without entering the natural tab order.
// preventScroll avoids the scroll-to-element side-effect that repeated focus()
// calls caused on Android WebView (each call visibly jittered the viewport).
function setPageFocus(element) {
    element.setAttribute("tabindex", "-1");
    element.focus({ preventScroll: true });
}

// Announce a page navigation to screen readers via a persistent aria-live region.
// The clear + setTimeout pattern is required: screen readers do not re-announce
// the same string, so we must clear first, then set in a new task.
function announceNavigation(pageTitle) {
    const announcer = document.getElementById("hm-route-announcer");
    if (!announcer || !pageTitle) return;
    announcer.textContent = "";
    setTimeout(() => {
        announcer.textContent = pageTitle;
    }, 100);
}

/**
 * Update aria-labels from data attributes with i18n support.
 * Supports templated labels via data-aria-label-params attribute.
 *
 * Usage:
 *   <button data-aria-label="common.swiper.ariaLabels.goToSlide"
 *           data-aria-label-params="slideNumber=2&total=9">
 *
 * With resource: { goToSlide: "Go to step {{slideNumber}} of {{total}}" }
 * Result: aria-label="Go to step 2 of 9"
 *
 * @param {HTMLElement} pageEl - The container element to search within
 */
function updateAiraLabels(pageEl) {
    $$('[data-aria-label]', pageEl).each(function () {
        const $el = $$(this);
        let labelTemplate = resources.get($el.data("aria-label"));

        // Check for template parameters
        const paramsStr = $el.data("aria-label-params");
        if (paramsStr && labelTemplate) {
            // Parse URI-encoded key=value pairs (e.g., "slideNumber=2&total=9")
            const params = {};
            paramsStr.split('&').forEach(pair => {
                const [key, value] = pair.split('=').map(decodeURIComponent);
                params[key] = value;
            });
            // Use Template7 to compile and render
            const compiled = Template7.compile(labelTemplate);
            labelTemplate = compiled(params);
        }

        const ariaAttribute = this.nodeName === 'IMG' ? "alt" : "aria-label";
        $el.attr(ariaAttribute, labelTemplate);
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
    setPageFocus,
    announceNavigation,
    createFocusTrapHandler,
    createSmartSelectAccessibilityHandlers,
    getVisibleFocusableElements,
    injectAriaIntoElement,
};
