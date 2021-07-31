import 'framework7-icons';
import 'material-icons/iconfont/material-icons.css';
import './css/app.scss';

import Framework7, { Dom7, Template7 } from 'framework7/framework7.esm.bundle.js';
// v5 import 'framework7/css/framework7.bundle.css';
import { initializeAccordions } from './accordion/accordion';
import { initializeFavorites } from './favorites/favorites';
import { initializeSocialSharing } from './socialsharing/socialsharing';
import { createSearchList, createSearchBar } from './search/search';
import { getTemplates } from './appTemplates';
import { updateSidePanels } from './sidepanels/sidepanels';
import { createRoutes } from './routes';
import { resources } from './resources';
import { appConfig } from './appConfig';

const statusBarBackgroundColor = '#000000';
const statusBarForgroundColor = 'white';


// https://silvantroxler.ch/2016/setting-voiceover-focus-with-javascript/
function setVoiceOverFocus(element) {
  var focusInterval = 10; // ms, time between function calls
  var focusTotalRepetitions = 10; // number of repetitions

  element.setAttribute('tabindex', '0');
  element.blur();

  var focusRepetitions = 0;
  var interval = window.setInterval(function() {
    element.focus();
    focusRepetitions++;
    if (focusRepetitions >= focusTotalRepetitions) {
      window.clearInterval(interval);
    }
  }, focusInterval);
}

function createApp(config) {
  const $$ = Dom7;
  const isWebsite = !window.cordova;

  appConfig.init(config.configVersion);

  let defaultF7Config = {
    root: '#app', // App root element
    theme: 'md',
    statusbar: {
      'iosBackgroundColor': statusBarBackgroundColor,
      'androidBackgroundColor': statusBarBackgroundColor,
      'iosTextColor': statusBarForgroundColor,
      'androidTextColor': statusBarForgroundColor
    },
    panel: {
      swipe: 'both',
      swipeOnlyClose: true,
      swipeNoFollow: false
    },
    routes: createRoutes(appConfig, config.appRoutes)
  };

  if( isWebsite) {
    defaultF7Config.view = {
      pushState: true,
      pushStateSeparator: '#',
      pushStateOnLoad: true    
    }
  }

  const conf = Object.assign(defaultF7Config, config.f7);

  const app = new Framework7(conf);
  let initialLang;

  if( isWebsite) {
    // Pass any default language from the query when we initialize the locales.
    // This won't happen in the app - only in a demo-site HTML build.
    const queryParams = app.utils.parseUrlQuery(window.location.href);
    initialLang = queryParams.lang;

    if( window.location.href.match(/index\.html$/)) {
      window.location.href = window.location.href + '#/'
    }
  }
  let locales = [];
  const localizations = config.appData.localizations;
  localizations.forEach(locale => {
    const code = locale.language_code;
    let loc = {
      ...locale
    };
    loc.resources = config.localeData[code];
    locales.push(loc);
  });
  resources.setLocales(locales, initialLang);

  // Init/Create main view
  const mainView = app.views.create('.view-main', {
    url: '/',
    allowDuplicateUrls: false
  });


  document.addEventListener("deviceready", function() {
    document.addEventListener(
      'backbutton',
      function() {
        mainView.router.back();
      },
      true
    );
  }, false);

  $$(document).on('click', 'a.language-switch', function(e) {
    const lang = $$(this).data('lang');
    appConfig.locale(lang);
    mainView.router.clearPreviousPages();
    // v5 mainView.router.clearPreviousHistory();
    mainView.router.refreshPage();
  });

  const buildConfig = {
    version: __VERSION__
  };

  Template7.registerHelper('build', function(k) {
    return buildConfig[k];
  });


  // .external links open in browser
  $$(document).on('click', '.external', function(e) {
    var href = $$(this).attr('href');

    e.preventDefault();
    e.stopPropagation();

    const analytics = window.cordova && window.cordova.plugins && window.cordova.plugins.firebase && window.cordova.plugins.firebase.analytics;

    if (analytics) {
      const currentRoute = app.views.current.router.currentRoute;
      const pageId = currentRoute.params && currentRoute.params.pageId;
      analytics.logEvent("external", {
        locale: appConfig.locale(),
        pageId: pageId,
        href: href
      });
    }

    if (window.cordova && window.cordova.InAppBrowser) {
      window.cordova.InAppBrowser.open(href, '_system');
    } else {
      window.open(href, '_system');
      //window.open(href);
    }
  
    return false;
  });


  // App config
  Template7.registerHelper('debug', function(k) {
    switch (k) {
      case 'currentLocale':
        return appConfig.locale();
    }
    return `${k}?`;
  });


  let templates = {};

  let pageInitId = 0; // counter of page inits for unique id purposes

  Template7.registerHelper('state', function(k) {
    switch (k) {
      case 'pageInitId':
        return `pageInitId=${pageInitId}`;
    }
    return `${k}?`;
  });



  $$('script.template').each(function() {
    var template = $$(this);
    var name = template.data('template-name');
    var html = template.html();

    templates[name] = {
      compiledTemplate: Template7.compile(html)
    };
  });


  $$('.template-partial').each(function() {
    var $el = $$(this);
    var tName = $el.data('template');
    var tSource = $el.html();
    Template7.registerPartial(tName, tSource);
  });

  const appTemplates = getTemplates(config);
  for (const k in appTemplates) {
    const templateSpec = appTemplates[k];
    if (templateSpec.type === 'template-partial') {
      Template7.registerPartial(k, templateSpec.source);
    } else {
      templates[k] = {
        compiledTemplate: Template7.compile(templateSpec.source)
      };
    }
  }

  function getContext(contextPath, pageId) {
    const context = contextPath ? resources.get(contextPath) : {};

    let ret = Object.assign({}, context);

    if (pageId) {
      ret.page = resources.get('pages')[pageId];
    }

    return ret;
  }

  $$(document).on('page:init', '.page', function(e) {
    const page = e.detail;
    const pageId = page.$el.data('id');
    const instances = $$('.template', page.el);

    instances.each(function() {
      var e = $$(this);
      var t = e.data('template-name');
      var contextPath = e.data('template-context');
      var context = getContext(contextPath, pageId);
      if (context) {
        const compiledTemplate = templates[t].compiledTemplate;
        e.html(compiledTemplate(context));
      }

    });
    $$('#app').removeClass('global-search-in global-search-enabled');
    $$('#app').removeClass('global-search-enabled');

    pageInitId++;
  });

  $$(document).on('page:beforin', '.page', function(e) {
    $$('#app').removeClass('global-search-in global-search-enabled');
    $$('#app').removeClass('global-search-enabled');
  });


  $$(document).on('page:beforein', function(e) {
    const page = e.detail;
    const pageId = (page.route.params && page.route.params.pageId) || "Home";
    const sectionId = page.route.params && page.route.params.sectionId;

    const analytics = window.cordova && window.cordova.plugins && window.cordova.plugins.firebase && window.cordova.plugins.firebase.analytics;

    if (analytics) {
      const locale =  appConfig.locale();
      analytics.setCurrentScreen(`${locale}-${pageId}`);
      analytics.logEvent("page", {
        locale: locale,
        pageId: pageId,
        sectionId: sectionId
      });
    }
  });


  $$(document).on('page:afterin', function(e) {
    const page = e.detail;
    const $container = $$(page.container);
    const sectionId = page.route.params && page.route.params.sectionId;


    if (sectionId) {
      const sectionEl$ = $$(`[data-section="${sectionId}"]`, page.el);
      if (sectionEl$.length) {
        if (sectionEl$.hasClass('accordion-item')) {
          app.accordion.open(sectionEl$)
        }
        sectionEl$[0].scrollIntoView();
      }
    }

    // Voiceover can find elements on the non-visible pages
    // so we hide them to aria.
    $$('.page-on-center').attr('aria-hidden', false);
    $$('.page-on-left,.page-on-right').attr('aria-hidden', true);

    // default accessibility target
    var focus = $container.find('.page-header');
    if (focus.length) {
      setVoiceOverFocus(focus[0]);
    }
  });

  /*
   *  Page initialization for various page types.
   */
  $$(document).on('page:init', function(e) {
    updateSidePanels(app, appConfig, resources);

    let searchbar = createSearchBar(app, e.detail.$pageEl, resources);
    let searchList = createSearchList(app, e.detail.$pageEl, resources);

    $$(document).on('page:afterout', e.detail.$pageEl, function(_e) {
      // searchbar.clear();
      searchbar.disable();
    });

    $$(document).on('page:beforeremove', e.detail.$pageEl, function(_e) {
      searchbar.destroy();
      searchbar = null;
      // hitting an intermittent exception thrown here where somehow the $el is gone already.
      if (searchList.$el.length) {
        searchList.destroy();
      }
      searchList = null;
    });

  });

  initializeFavorites(app, appConfig, resources);
  initializeAccordions(app);
  initializeSocialSharing(app, appConfig, resources);

  //checkOverlay();

  return app;
}

export {
  createApp
};