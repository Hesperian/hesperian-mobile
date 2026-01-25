import "framework7/css/bundle";
import "framework7-icons/css/framework7-icons.css";
import "material-icons/iconfont/material-icons.css";
import "./css/app.scss";

import Framework7, { Dom7 } from "framework7/bundle";
import Template7 from "template7";
import "./calendar/calendar";
import "./checklist/checklist";
import "./intro/intro";
import { initializeAccordions } from "./accordion/accordion";
import { initializeFavorites } from "./favorites/favorites";
import { initializeSocialSharing } from "./socialsharing/socialsharing";
import { initializeIntro } from "./intro/intro";
import { initializeSearch } from "./search/search";
import { initializeVideo } from "./video/video";
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
import { setVoiceOverFocus } from "./accessibility/accessibility";

const statusBarBackgroundColor = "#000000";
const statusBarForgroundColor = "white";

const $$ = Dom7;

function updateAiraLabels() {
    $$('[data-aria-label]').each(function () {
      const labelKey = resources.get($$(this).data("aria-label"));
      $$(this).attr("aria-label", labelKey);
    });
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

function queryParamToTruthy(param) {
  if (typeof param === "undefined") return null;
  const str = String(param).trim().toLowerCase();
  return str === "true" || str === "1" || str === "yes";
}

function configureApp(app, config, $$, isWebsite, setLangUrl) {
  let initialLang;

  const queryParams = app.utils.parseUrlQuery(window.location.href);

  const forceAudio = queryParamToTruthy(queryParams.audio);
  const introTourOverride = queryParamToTruthy(queryParams.tour);

  if (isWebsite) {
    // Pass any default language from the query when we initialize the locales.
    // This won't happen in the app - only in a demo-site HTML build.
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

  // Wrapper for setting locale that also updates URL for website builds
  function setLocale(locale) {
    appConfig.locale(locale);
    document.documentElement.lang = locale;
    if (isWebsite) {
      setLangUrl(locale);
    }

    updateAiraLabels()
  }

  setLocale(appConfig.locale());

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
    setLocale(lang);
    appConfig.set("languageHasBeenChosen", true);
    mainView.router.clearPreviousHistory();
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

    $$('[data-aria-content]', page.el).each(function () {
      const content = resources.get($$(this).data("aria-content"));
      $$(this).text(content);
    });

    // Set aria-label for bookmark checkboxes with page title
    $$('[data-bookmark-for]', page.el).each(function () {
      const bookmarkLabel = resources.get('bookmarkAriaLabel');
      const pageTitle = $$(this).data('bookmark-for') || '';
      $$(this).attr('aria-label', `${bookmarkLabel} ${pageTitle}`);
    });

    $$('.page-content', page.el).each(function () {
      $$(this).attr('tabindex', '0');
    })

    updateAiraLabels()

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

  // Handle inert property for accessibility
  // When a page is about to be hidden, make it inert so focusable elements are not accessible
  $$(document).on("page:beforeout", function (e) {
    const page = e.detail;
    if (page.el) {
      page.el.inert = true;
    }
  });

  // When a page is about to be shown, remove inert property
  $$(document).on("page:beforein", function (e) {
    const page = e.detail;
    if (page.el) {
      page.el.inert = false;
    }
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
  initializeIntro(app, appConfig, resources, config.appData, {
    tourOverride: introTourOverride,
  });
  initializeVideo(initSpec);
  initAudioButtons(initSpec, forceAudio);

  app.api = {
    locale: appConfig.locale,
    pageStructureChanged: function () {
      updateAiraLabels();
      if (app.views) {
        const currentPage = app.views.main.router.currentPageEl;
        app.emit("pageStructureChanged", currentPage);
      }
    }
  };

  const appEl = app.$el || app.root;
  if (appEl && appEl[0]) {
    appEl[0].dispatchEvent(
      new CustomEvent("appInit", { bubbles: true, detail: app })
    );
  }

  return app;
}

function createApp(config) {
  const isWebsite = !window.cordova;

  appConfig.init(config.configVersion);

  let defaultF7Config = {
    el: "#app", // App root element
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
  };

  if (isWebsite) {
    defaultF7Config.view = {
      browserHistory: true,
      browserHistorySeparator: "#",
      browserHistoryOnLoad: true,
    };
  }

  function setLangUrl(lang) {
    const url = new URL(window.location.href);
    url.searchParams.set("lang", lang);
    window.history.replaceState(null, document.title, url.href);
  }

  const store = Framework7.createStore({
    state: {
      appData: config.appData,
      localeData: config.localeData,
    },
  });

  const conf = Object.assign({}, defaultF7Config, config.f7);
  conf.store = (config.f7 && config.f7.store) || store;

  if (!conf.on) {
    conf.on = {};
  }
  
  /*
  // Global popup handlers for accessibility
  conf.on.popupOpen = function(popup) {
    const $popup = $$(popup.$el);
    
    // Set ARIA attributes for accessibility
    $popup.attr("aria-modal", "true");
    if (!$popup.attr("role")) {
      $popup.attr("role", "dialog");
    }
    
    // Use inert instead of aria-hidden to prevent focus issues
    // Delay to allow popup animation to complete and focus to move
    setTimeout(() => {
      $$(".page-content").each(function() {
        // Don't set inert on elements inside the popup itself
        if (!$$(this).closest(".popup").length) {
            this.inert = true;
        }
      });
      
      $$(".panel").each(function() {
          this.inert = true;
      });
    }, 100);
  };
  
  conf.on.popupClose = function(popup) {
    // Restore inert/aria-hidden on background content
    $$(".page-content").each(function() {
      if (this.inert !== undefined) {
        this.inert = false;
      } else {
        $$(this).attr("aria-hidden", "false");
      }
    });
    
    $$(".panel").each(function() {
      if (this.inert !== undefined) {
        this.inert = false;
      } else {
        $$(this).attr("aria-hidden", "false");
      }
    });
  };
  */
  conf.on.init = function () {
    const app = this;
    configureApp(app, config, $$, isWebsite, setLangUrl);
  }

  const app = new Framework7(conf);


  return app;
}

let appInstance = null;

function getApp() {
  return appInstance;
}

function initApp(config) {
  if (appInstance) {
    console.warn('App already initialized');
    return appInstance;
  }
  appInstance = createApp(config);
  return appInstance;
}

export { getApp, initApp };
