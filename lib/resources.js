/*
 *  localizeable resources
 * 
 * usage: resources.get('this.that.finally')
 */

import { appConfig } from './appConfig';
let resources_data = {};

function bestBrowserLocale() {
  const lang = window.navigator.language;

  if (!lang) return 'en';
  const langtags = lang.toLocaleLowerCase().split('-');
  // check most specific to least specific
  for (let i = langtags.length; i > 0; i--) {
    const langtag = langtags.slice(0, i).join('-');
    if (resources_data[langtag]) return langtag;
  }

  return 'en';
}

const pageResources = __PREPROCESS__;

let languages = [];

const resources = {
  get: function (path, optLocale) {

    const locale = optLocale || appConfig.locale();
    const pathElements = (path || "").split('.');

    let context = resources_data[locale];
    for (let i = 0; i < pathElements.length; i++) {
      const pathComponent = pathElements[i];
      if (!context) {
        break;
      }
      context = context[pathComponent];
    }

    return context;
  },
  getLanguages: function () {
    return languages;
  },
  setLocales: function (languagesData, optInitialLang) {

    if (optInitialLang) {
      appConfig.locale(optInitialLang);
    }

    languagesData.forEach(l => {
      languages.push({
        language: l.language,
        language_code: l.language_code
      });
      resources_data[l.language_code] = l.resources;
    });

    // Reset locale to default if needed.
    const locale = appConfig.locale();
    if (!locale || !resources_data[locale]) {
      appConfig.locale(bestBrowserLocale());
    }

    // Extract resources compiled out from page contents
    for (let k in pageResources) {
      resources_data[k].pages = pageResources[k];
    }
  }
};

export {
  resources
};