import Shepherd from "shepherd.js";
import { Dom7, Template7 } from "framework7/framework7.esm.bundle.js";
import { appConfig, resources } from "hesperian-mobile";

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

let disableIntroThisLaunch = false;

function introDisabledConfig(value) {
  const ret = appConfig.get("disableIntro");

  if (undefined !== value) {
    appConfig.set("disableIntro", value);
  }

  return ret;
}

function isIntroNeeded() {
  const disableIntroSaved = introDisabledConfig();
  const disableIntro = disableIntroThisLaunch || disableIntroSaved;

  return !disableIntro;
}

const languages = Template7.compile(`
<div class="languageslist list simple-list">
<ul>
{{#each localizations}}
  <li class="language-switch {{#if this.disable}}current{{/if}}"  data-lang="{{this.language_code}}">
      {{this.language}}
  </li>
{{/each}}
</ul>
</div>
`);

const langNextButton = Template7.compile(`
<span>{{text}}</span><i class="icon f7-icons">arrow_right</i>
`);

function chooseLanguage(appData, appConfig) {
  const languageChooser = new Promise((resolve, reject) => {
    if (appConfig.get("languageHasBeenChosen")) {
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
    };
    const content = languages(context);
    const dialog = window.app.dialog.create({
      cssClass: "hm-choose-language",
      title: resources.get("settings.languages.title"),
      content,
      buttons: [
        {
          text: langNextButton({
            text: resources.get("settings.languages.next"),
          }),
          close: true,
        },
      ],
      on: {
        closed: function () {
          appConfig.set("languageHasBeenChosen", true);
          resolve();
        },
      },
    });
    dialog.$el.on("click", ".language-switch", function () {
      dialog.close();
    });
    dialog.open();
  });
  return languageChooser;
}

function getStepHTML(spec, index, appData, resources) {
  const text = res("steps")[spec.id];
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
      when: {
        show() {
          const currentStepElement = tour.currentStep.el;
          if ($(currentStepElement).data("shepherd-step-id") === "tour-intro") {
            const footer = currentStepElement.querySelector(".shepherd-footer");
            const checkboxHTML = checkbox({
              dontshowagain: res("dontshowagain"),
              checked: introDisabledConfig() ? "checked" : "",
            });
            $(checkboxHTML).insertAfter($(footer));
          }
        },
      },
    },
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

  ["complete", "cancel"].forEach((event) =>
    Shepherd.on(event, () => {
      preparePanels();
      $(".page-current .page-content").scrollTo(0, 0);
      disableIntroThisLaunch = true;
    })
  );

  return tour;
}

function initializeIntro(app, appConfig, resources, appData) {
  const tour = createTour(app, appData);
  function prepareIntro() {
    app
      .$(document)
      .once("page:afterin", '.page[data-page="index"]', function (_e) {
        chooseLanguage(appData, appConfig).then(() => {
          if (tour && isIntroNeeded()) {
            setTimeout(() => {
              tour.start();
            }, 0);
          }
        });
      });
  }

  $(document).on("change", "input#dontaskagain", function (e) {
    const checked = $(e.target).prop("checked");
    introDisabledConfig(checked);
  });

  $(document).on("page:init", ".page", function (e) {
    const page = e.detail;

    if (langSupportsTour()) {
      $(".taketourlink", page.el).on("click", function () {
        disableIntroThisLaunch = false;
        introDisabledConfig(false);
        appConfig.set("languageHasBeenChosen", false);
        prepareIntro();
      });
    }
  });

  prepareIntro();
}

export { initializeIntro };
