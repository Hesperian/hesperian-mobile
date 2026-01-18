import Shepherd from "shepherd.js";
import * as focusTrap from "focus-trap";
import { Dom7 } from "framework7/bundle";
import Template7 from "template7";
import { appConfig, resources } from "hesperian-mobile";
import { getApp } from "../app";

import "shepherd.js/dist/css/shepherd.css";
import { offset } from "@floating-ui/dom";
import "./intro.scss";

const $ = Dom7;

const checkbox = Template7.compile(`
<div class="dontaskcontainer">
<label class="checkbox">
  <input type="checkbox" id="dontaskagain" {{checked}}>
  <i class="icon-checkbox"></i>
</label>
<div>{{dontshowagain}}</div>
</div>
`);

function res(key) {
  const r = resources.get("intro");
  return r[key];
}

function langSupportsTour(optLang) {
  return !!resources.get("intro", optLang);
}

/**
 * IntroState manages all tour-related state in a single object.
 *
 * State priority for showing tour:
 * 1. URL override (urlOverride) takes precedence - true forces tour, false suppresses
 * 2. Session flag (disabledThisSession) - set after tour completes/cancels
 * 3. Persistent setting (disableIntro in appConfig) - "don't show again" checkbox
 */
const IntroState = {
  /**
   * URL parameter override: null (not set), true (force tour), false (suppress tour)
   * Set from ?tour=true|false URL parameter
   */
  urlOverride: null,

  /**
   * Session-level flag: set true after tour completes or is cancelled
   * Prevents tour from showing again in the same session
   */
  disabledThisSession: false,

  /**
   * Check persistent "don't show again" setting from appConfig
   * @returns {boolean} true if user checked "don't show again"
   */
  isPersistentlyDisabled() {
    return appConfig.get("disableIntro") === true;
  },

  /**
   * Set persistent "don't show again" setting in appConfig
   * @param {boolean} value - true to disable, false to enable
   */
  setPersistentlyDisabled(value) {
    appConfig.set("disableIntro", value);
  },

  /**
   * Determine if tour should be shown based on all state
   * @returns {boolean} true if tour should start
   */
  shouldShowTour() {
    // URL override takes precedence
    if (this.urlOverride === true) return true;
    if (this.urlOverride === false) return false;

    // Otherwise check session and persistent settings
    return !this.disabledThisSession && !this.isPersistentlyDisabled();
  },

  /**
   * Determine if language dialog should be shown
   * @returns {boolean} true if dialog should appear
   */
  shouldShowLanguageDialog() {
    if (this.urlOverride === false) return false;
    if (this.urlOverride === true) return true;
    return !appConfig.get("languageHasBeenChosen");
  },

  /**
   * Reset all suppression flags for "Take tour" link
   * Clears session flag, persistent setting, and language chosen flag
   */
  reset() {
    this.disabledThisSession = false;
    this.setPersistentlyDisabled(false);
    appConfig.set("languageHasBeenChosen", false);
  }
};

function setExposedTour(app, tour) {
  if (app) {
    app.introTour = tour;
  }
  if (typeof window !== "undefined") {
    window.__hesperianIntroTour = tour;
  }
}

function clearExposedTour(app, tour) {
  if (app && app.introTour === tour) {
    delete app.introTour;
  }
  if (typeof window !== "undefined" && window.__hesperianIntroTour === tour) {
    delete window.__hesperianIntroTour;
  }
}


const languages = Template7.compile(`
<div class="languageslist list simple-list">
  <ul>
    {{#each localizations}}
      <li class="language-switch {{#if this.disable}}current{{/if}}" data-lang="{{this.language_code}}">
        <button type="button"
          class="language-btn"
          aria-current="{{#if this.disable}}true{{else}}false{{/if}}"
          aria-label="{{this.language}}"
          {{#if this.disable}}disabled{{/if}}>
          {{this.language}}
        </button>
      </li>
    {{/each}}
  </ul>
  <div class="dialog-buttons">
    <button type="button" class="language-dialog-button button">
      <span>{{nextText}}</span><i class="icon f7-icons">arrow_right</i>
    </button>
  </div>
</div>
`);

const langNextButton = Template7.compile(`
<span>{{text}}</span><i class="icon f7-icons">arrow_right</i>
`);

/**
 * Show language chooser dialog if needed
 * @param {Object} appData - Application data containing localizations
 * @param {Object} appConfig - Application config for storing language choice
 * @returns {Promise} Resolves when dialog closes or is skipped
 */

function chooseLanguage(appData, appConfig) {
  const languageChooser = new Promise((resolve, reject) => {
    if (!IntroState.shouldShowLanguageDialog()) {
      resolve();
      return;
    }

    const locale = appConfig.locale();
    const localizations = appData.localizations.map((l) => ({
      language_code: l.language_code,
      language: l.language,
      disable: l.language_code === locale,
      supported: langSupportsTour(l.language_code),
    }));
    const context = {
      localizations: localizations,
      nextText: resources.get("settings.languages.next"),
    };
    const content = languages(context);
    const app = getApp();
    let trap = null;
    const dialog = app && app.dialog.create({
      cssClass: "hm-choose-language",
      title: resources.get("settings.languages.title"),
      content,
      on: {
        opened: function () {
          // Trap focus inside dialog
          const dialogEl = dialog.$el && dialog.$el[0];
          if (dialogEl) {
            trap = focusTrap.createFocusTrap(dialogEl, {
              escapeDeactivates: false,
              clickOutsideDeactivates: false,
              fallbackFocus: dialogEl,
              allowOutsideClick: false,
              initialFocus: dialogEl.querySelector('.language-dialog-button') || dialogEl
            });
            trap.activate();
          }
        },
        closed: function () {
          if (trap) {
            trap.deactivate();
            trap = null;
          }
          appConfig.set("languageHasBeenChosen", true);
          resolve();
        },
      },
    });
    dialog.$el.on("click", ".language-btn", function () {
      dialog.close();
    });
    dialog.$el.on("click", ".language-dialog-button", function () {
      dialog.close();
    });
    dialog.open();
  });
  return languageChooser;
}

/**
 * Get the HTML content for a tour step
 * For the intro step, includes the "don't show again" checkbox
 */
function getStepHTML(spec, index, appData, resources) {
  const text = res("steps")[spec.id];

  // Include checkbox in intro step content so it's in the initial DOM
  // and included in Shepherd's focus management
  if (spec.id === "tour-intro") {
    const checkboxHTML = checkbox({
      dontshowagain: res("dontshowagain"),
      checked: IntroState.isPersistentlyDisabled() ? "checked" : "",
    });
    return text + checkboxHTML;
  }

  return text;
}

function createTour(app, appData) {
  const introConfig = appData.intro;

  if (!introConfig) {
    return null;
  }
  const stepsSpecs = introConfig.steps;
  const tour = new Shepherd.Tour({
    useModalOverlay: true,
    defaultStepOptions: {
      classes: "hm-tour",
      scrollTo: true,
      cancelIcon: {
        enabled: true,
      },
      floatingUIOptions: {
        middleware: [offset({ mainAxis: 15 })],
      },
    },
  });

  setExposedTour(app, tour);

  function preparePanels(menu) {
    ["left", "right"].forEach((side) => {
      const open = menu === side;
      const panel = app.panel.get(side);

      if (open && !panel.opened) {
        app.panel.open(menu);
      }

      if (!open && panel.opened) {
        app.panel.close(menu);
      }
    });
  }

  /**
   * Handle tour completion or cancellation
   * Consolidates all cleanup logic in one place
   */
  const handleTourEnd = () => {
    preparePanels();
    $(".page-current .page-content").scrollTo(0, 0);
    IntroState.disabledThisSession = true;
    clearExposedTour(app, tour);
  };

  tour.on("start", () => {
    setExposedTour(app, tour);
  });

  ["complete", "cancel"].forEach((eventName) => {
    tour.on(eventName, handleTourEnd);
  });

  tour.on("destroy", () => {
    clearExposedTour(app, tour);
  });

  const buttonCancel = {
    text() {
      return res("cancel");
    },
    action() {
      return tour.cancel();
    },
    secondary: true,
  };

  const buttonPrev = {
    text() {
      return res("back");
    },
    action() {
      return tour.back();
    },
  };

  const buttonNext = {
    text() {
      return res("next");
    },
    action() {
      return tour.next();
    },
  };

  function prepareStep(spec) {
    preparePanels(spec.menu);
  }

  stepsSpecs.forEach((spec, index) => {
    const buttons = [buttonCancel];
    if (index > 0) {
      buttons.push(buttonPrev);
    }

    if (index < stepsSpecs.length - 1) {
      buttons.push(buttonNext);
    } else {
      buttons.reverse();
    }

    let step = {
      id: spec.id,
      scrollTo: false,
      text() {
        return getStepHTML(spec, index, appData, resources);
      },
      buttons,
      showOn() {
        // If the element isn't in the page (e.g. audio button not supported) skip the step.
        function elementIsVisible($el) {
          if ($el.length === 0) {
            return false;
          }
          return $el.css("display") !== "none";
        }
        return (!spec.element || elementIsVisible($(spec.element)))
          && getStepHTML(spec, index, appData, resources);
      },
      beforeShowPromise: function () {
        prepareStep(spec);
      },
    };
    if (spec.element) {
      step.attachTo = {
        element: spec.element,
        on: "bottom",
      };
    }
    tour.addStep(step);
  });

  return tour;
}

/**
 * Initialize the intro tour system
 * @param {Object} app - Framework7 app instance
 * @param {Object} appConfig - Application configuration
 * @param {Object} resources - Localization resources
 * @param {Object} appData - Application data with tour configuration
 * @param {Object} options - Options object
 * @param {boolean|null} options.tourOverride - URL parameter override (true/false/null)
 */
function initializeIntro(app, appConfig, resources, appData, options = {}) {
  IntroState.urlOverride =
    typeof options.tourOverride === "boolean" ? options.tourOverride : null;

  const tour = createTour(app, appData);

  function prepareIntro() {
    app
      .$(document)
      .once("page:afterin", '.page[data-page="index"]', function (_e) {
        chooseLanguage(appData, appConfig).then(() => {
          if (tour && IntroState.shouldShowTour()) {
            setTimeout(() => {
              tour.start();
            }, 0);
          }
        });
      });
  }

  $(document).on("change", "input#dontaskagain", function (e) {
    const checked = $(e.target).prop("checked");
    IntroState.setPersistentlyDisabled(checked);
  });

  $(document).on("page:init", ".page", function (e) {
    const page = e.detail;

    if (langSupportsTour()) {
      $(".taketourlink", page.el).on("click", function () {
        IntroState.reset();
        prepareIntro();
      });
    }
  });

  prepareIntro();
}

export { initializeIntro };
