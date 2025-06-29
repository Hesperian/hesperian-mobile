import "framework7-icons";
import "material-icons/iconfont/material-icons.css";
import "./css/app.scss";

import Framework7, {
  Dom7,
  Template7,
} from "framework7/framework7.esm.bundle.js";
// v5 import 'framework7/css/framework7.bundle.css';
import "./calendar/calendar";
import "./checklist/checklist";
import "./intro/intro";
import "./filter/filter";
import { initializeAccordions } from "./accordion/accordion";
import { initializeFavorites } from "./favorites/favorites";
import { initializeSocialSharing } from "./socialsharing/socialsharing";
import { initializeIntro } from "./intro/intro";
import { initializeSearch } from "./search/search";
import { initializeVideo } from "./video/video";
import { initializeFilters } from "./filter/filter";
import { getTemplates } from "./appTemplates";
import {
  initializeSidePanels,
  updateSidePanels,
} from "./sidepanels/sidepanels";
import { scrollToSection } from "./navigation";
import { createRoutes } from "./routes";
import { resources } from "./resources";
import { appConfig } from "./appConfig";
import { logEvent, setCurrentScreen } from "./analytics/analytics";
import { initAudioButtons } from "./audio-buttons/audio-buttons"; // last to allow page inits before audio.

const statusBarBackgroundColor = "#000000";
const statusBarForgroundColor = "white";

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

function formatDate(locale, days, months) {
  const currentDate = new Date();

  const futureDate = new Date(currentDate);
  futureDate.setDate(currentDate.getDate() + days);
  futureDate.setMonth(futureDate.getMonth() + months);

  const formattedDate = futureDate.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return formattedDate;
}

function createApp(config) {
  const $$ = Dom7;
  const isWebsite = !window.cordova;

  appConfig.init(config.configVersion);

  let defaultF7Config = {
    root: "#app", // App root element
    theme: "md",
    statusbar: {
      iosBackgroundColor: statusBarBackgroundColor,
      androidBackgroundColor: statusBarBackgroundColor,
      iosTextColor: statusBarForgroundColor,
      androidTextColor: statusBarForgroundColor,
    },
    panel: {
      swipe: "both",
      swipeOnlyClose: true,
      swipeNoFollow: false,
    },
    routes: createRoutes(appConfig, config.appRoutes),
    data: function () {
      return config;
    },
  };

  if (isWebsite) {
    defaultF7Config.view = {
      pushState: true,
      pushStateSeparator: "#",
      pushStateOnLoad: true,
    };
  }

  function setLangUrl(lang) {
    const url = new URL(window.location.href);
    url.searchParams.set("lang", lang);
    window.history.replaceState(null, document.title, url.href);
  }

  const conf = Object.assign(defaultF7Config, config.f7);

  const app = new Framework7(conf);

  // framework7 v3 is before iPhone 12 and 13
  // so kludge to support safe areas in css
  function useSafeAreaForiPhoneX() {
    if (!app.device.ios) return false;

    // https://www.ios-resolution.com/
    const screenTests = {
      "390x844": true,
      "393x852": true,
      "430x932": true,
      "428x926": true,
      "402x874": true,
      "440x956": true,
    };

    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;

    return screenTests[`${screenWidth}x${screenHeight}`];
  }

  if (useSafeAreaForiPhoneX()) {
    app.device.iphoneX = true;
    $$("html").addClass("device-iphone-x");
  }

  // fix - status bar overlay doesn't reappear after orientation change and back
  // seems to involve zoom - zoom test fails when back on portrait
  if (app.device.iphoneX) {
    let device = app.device;
    device.needsStatusbarOverlay = function needsStatusbarOverlay() {
      // was: if ((device.webView || (device.android && device.cordova)) && (window.innerWidth * window.innerHeight === window.screen.width * window.screen.height)) {
      if (device.webView || (device.android && device.cordova)) {
        if (
          device.iphoneX &&
          (window.orientation === 90 || window.orientation === -90)
        ) {
          return false;
        }
        return true;
      }
      return false;
    };
  }

  let initialLang;

  if (isWebsite) {
    // Pass any default language from the query when we initialize the locales.
    // This won't happen in the app - only in a demo-site HTML build.
    const queryParams = app.utils.parseUrlQuery(window.location.href);
    initialLang = queryParams.lang;

    if (window.location.href.match(/index\.html$/)) {
      window.location.href = window.location.href + "#/";
    }
  }
  let locales = [];
  const localizations = config.appData.localizations;
  localizations.forEach((locale) => {
    const code = locale.language_code;
    let loc = {
      ...locale,
    };
    loc.resources = config.localeData[code];
    locales.push(loc);
  });
  resources.setLocales(locales, initialLang);
  if (isWebsite) {
    setLangUrl(appConfig.locale());
  }

  // Init/Create main view
  const mainView = app.views.create(".view-main", {
    url: "/",
    allowDuplicateUrls: false,
  });

  document.addEventListener(
    "deviceready",
    function () {
      document.addEventListener(
        "backbutton",
        function () {
          mainView.router.back();
        },
        true
      );
    },
    false
  );

  $$(document).on("click", ".language-switch", function (e) {
    const lang = $$(this).data("lang");
    appConfig.locale(lang);
    appConfig.set("languageHasBeenChosen", true);
    if (isWebsite) {
      setLangUrl(appConfig.locale());
    }
    mainView.router.clearPreviousPages();
    // v5 mainView.router.clearPreviousHistory();
    mainView.router.refreshPage();
  });

  const buildConfig = {
    version: __VERSION__,
  };

  Template7.registerHelper("build", function (k) {
    return buildConfig[k];
  });

  // .external links open in browser
  $$(document).on("click", ".external:not(.self)", function (e) {
    var href = $$(this).attr("href");

    e.preventDefault();
    e.stopPropagation();

    logEvent("external", {
      href: href,
    });

    if (window.cordova && window.cordova.InAppBrowser) {
      window.cordova.InAppBrowser.open(href, "_system");
    } else {
      window.open(href, "_system");
      //window.open(href);
    }

    return false;
  });

  // App config
  Template7.registerHelper("debug", function (k) {
    switch (k) {
      case "currentLocale":
        return appConfig.locale();
    }
    return `${k}?`;
  });

  let templates = {};

  let pageInitId = 0; // counter of page inits for unique id purposes

  Template7.registerHelper("state", function (k) {
    switch (k) {
      case "pageInitId":
        return `pageInitId=${pageInitId}`;
    }
    return `${k}?`;
  });

  $$("script.template").each(function () {
    var template = $$(this);
    var name = template.data("template-name");
    var html = template.html();

    templates[name] = {
      compiledTemplate: Template7.compile(html),
    };
  });

  $$(".template-partial").each(function () {
    var $el = $$(this);
    var tName = $el.data("template");
    var tSource = $el.html();
    Template7.registerPartial(tName, tSource);
  });

  const appTemplates = getTemplates(config);
  for (const k in appTemplates) {
    const templateSpec = appTemplates[k];
    if (templateSpec.type === "template-partial") {
      Template7.registerPartial(k, templateSpec.source);
    } else {
      templates[k] = {
        compiledTemplate: Template7.compile(templateSpec.source),
      };
    }
  }

  function getContext(contextPath, pageId) {
    const context = contextPath ? resources.get(contextPath) : {};

    let ret = Object.assign({}, context);

    if (pageId) {
      ret.page = resources.get("pages")[pageId];
    }

    return ret;
  }

  $$(document).on("page:init", ".page", function (e) {
    const page = e.detail;
    const pageId = page.$el.data("id");
    const instances = $$(".template", page.el);

    instances.each(function () {
      var e = $$(this);
      var t = e.data("template-name");
      var contextPath = e.data("template-context");
      var context = getContext(contextPath, pageId);
      if (context) {
        const compiledTemplate = templates[t].compiledTemplate;
        e.html(compiledTemplate(context));
      }
    });

    $$("#app").removeClass("global-search-in global-search-enabled");
    $$("#app").removeClass("global-search-enabled");

    pageInitId++;
  });

  $$(document).on("page:beforin", ".page", function (e) {
    $$("#app").removeClass("global-search-in global-search-enabled");
    $$("#app").removeClass("global-search-enabled");
  });

  $$(document).on("page:beforein", function (e) {
    const page = e.detail;
    const pageId = (page.route.params && page.route.params.pageId) || "Home";
    const sectionId = page.route.params && page.route.params.sectionId;

    // Fill in date fields
    $$(".format-date", page.el).each(function () {
      const e = $$(this);

      const days = parseInt(e.data("days-from-now", 10)) || 0;
      const months = parseInt(e.data("months-from-now"), 10) || 0;
      const date = formatDate(appConfig.locale(), days, months);

      this.textContent = date;
    });


    const locale = appConfig.locale();
    setCurrentScreen(`${locale}-${pageId}`);
    logEvent("page", {
      locale: locale,
      pageId: pageId,
      sectionId: sectionId,
    });
  });

  $$(document).on("page:afterin", function (e) {
    const page = e.detail;
    const $container = $$(page.container);
    const sectionId = page.route.params && page.route.params.sectionId;

    scrollToSection(page.el, sectionId);

    // Voiceover can find elements on the non-visible pages
    // so we hide them to aria.
    $$(".page-on-center").attr("aria-hidden", false);
    $$(".page-on-left,.page-on-right").attr("aria-hidden", true);

    // default accessibility target
    var focus = $container.find(".page-header");
    if (focus.length) {
      setVoiceOverFocus(focus[0]);
    }
  });

  /*
   *  Page initialization for various page types.
   */
  $$(document).on("page:init", function (e) {
    updateSidePanels(app, appConfig, resources);

    e.detail.$pageEl.on("click", "a.self", function (e) {
      const target$ = $$(e.target);
      const page$ = target$.closest(".page");
      const sectionId = target$.attr("href");

      e.preventDefault();
      e.stopPropagation();

      scrollToSection(page$[0], sectionId);

      return false;
    });
  });

  const initSpec = {
    app,
    appConfig,
    resources,
    appData: config.appData,
  };

  initializeSearch(app, appConfig, resources);
  initializeFavorites(app, appConfig, resources);
  initializeAccordions(app);
  initializeSocialSharing(app, appConfig, resources);
  initializeSidePanels(app, appConfig, resources);
  initializeIntro(app, appConfig, resources, config.appData);
  initializeVideo(initSpec);
  initAudioButtons(initSpec);
  initializeFilters(initSpec);

  //checkOverlay();

  /*
  function locale(language_code) {
    const router = window.app.views.main.router;
    if( !language_code) {
      return appConfig.locale();
    }

    appConfig.locale(language_code);
    router.refreshPage();
  }
  */

  app.api = {
    locale: appConfig.locale,
    pageStructureChanged: function () {
      if (app.views) {
        const currentPage = app.views.main.router.currentPageEl;
        app.emit("pageStructureChanged", currentPage);
      }
    }
  };

  app.root[0].dispatchEvent(
    new CustomEvent("appInit", { bubbles: true, detail: app })
  );

  return app;
}

export { createApp };
