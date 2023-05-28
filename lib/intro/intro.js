import Shepherd from "shepherd.js";
import { Dom7, Template7 } from "framework7/framework7.esm.bundle.js";
import { appConfig, resources } from "hesperian-mobile";

import "shepherd.js/dist/css/shepherd.css";
import {offset} from '@floating-ui/dom';
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

function isIntroDisabled() {
  if (!langSupportsTour()) {
    return true;
  }
  const disableIntroSaved = introDisabledConfig();
  const disableIntro = disableIntroThisLaunch || disableIntroSaved;

  return disableIntro;
}

const languages = Template7.compile(`
<p>{{text}}</p>
<div>{{title}}:</div>
<div class="languagescontainer">
{{#each localizations}}
{{#if this.supported}}
    <button class="choose-language language-switch" {{#if this.disable}}disabled{{/if}} data-lang="{{this.language_code}}">
        {{this.language}}
    </button>
{{else}}
  <button class="choose-language language-switch exit-tour" {{#if this.disable}}disabled{{/if}} data-lang="{{this.language_code}}">
  {{this.language}}
  </button>
{{/if}}
{{/each}}
</div>
`);

function isTourNeeded() {
  return !window.isWebsite; // && !appConfig.get("languageHasBeenChosen");
}

function getStepHTML(spec, index, appData, resources) {
  let text = res("steps")[spec.id];
  if (index === 0 && isTourNeeded()) {
    const locale = appConfig.locale();
    const localizations = appData.localizations.map((l) => ({
      language_code: l.language_code,
      language: l.language,
      disable: l.language_code === locale,
      supported: langSupportsTour(l.language_code),
    }));
    const context = {
      text: text,
      title: resources.get("settings.languages.title"),
      localizations: localizations,
    };
    text = languages(context);
  }

  return text;
}

function initializeIntro(app, appConfig, resources, appData) {
  const introConfig = appData.intro;

  if (!introConfig) {
    return;
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
        middleware: [offset({ mainAxis: 8})]
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

  $(document).on("click", "button.exit-tour", function (e) {
    tour.cancel();
  });

  initEvents();

  stepsSpecs.forEach((spec, index) => {
    let buttons = [buttonCancel];
    if (index > 0) {
      buttons.push(buttonPrev);
    }
    buttons.push(buttonNext);

    let step = {
      id: spec.id,
      text() {
        return getStepHTML(spec, index, appData, resources);
      },
      buttons,
      showOn() {
        // If the element isn't in the page (e.g. audio button not supported) skip the step.
        return !spec.element || $(spec.element).length > 0;
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

  app.$(document).on("page:afterin", '.page[data-page="index"]', function (_e) {
    if (isIntroDisabled()) {
      return;
    }

    tour.start();
  });
}

function initEvents() {
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
      });
    }
  });
}

export { initializeIntro };
