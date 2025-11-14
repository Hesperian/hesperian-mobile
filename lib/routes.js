/*
 *  routes
 *  usage: routes.createRoutes()
 */

import Template7 from 'template7';

async function loadLocalizedContent(app, url) {
  const appRequest = app?.request;
  if (appRequest && typeof appRequest.get === 'function') {
    const response = await appRequest.get(url);
    return response.data;
  }

  const result = await fetch(url);
  if (!result.ok) {
    throw new Error(`Failed to fetch ${url}: ${result.status}`);
  }
  return result.text();
}

async function resolveWithTemplate({ app, resolve, reject, url, logLabel }) {
  try {
    const html = await loadLocalizedContent(app, url);
    const template = Template7.compile(html);
    const content = template({});
    resolve({ content });
  } catch (error) {
    console.error(`resolve:${logLabel} error`, { url, error });
    if (reject) {
      reject(error);
    }
  }
}

function pageRoutes(appConfig) {
  async function resolver(context) {
    const { app, to, resolve, reject } = context;
    const locale = appConfig.locale();
    const pagePathElement = to.params.pageId;
    const url = `./locales/${locale}/${pagePathElement}.html`;
    return resolveWithTemplate({ app, resolve, reject, url, logLabel: 'page' });
  }

  const pageIdElement = ':pageId';

  return [{
      path: `/pages/${pageIdElement}`,
      async: resolver
    },
    {
      path: `/pages/${pageIdElement}/:sectionId`,
      async: resolver
    }
  ];
}

function createRoutes(appConfig, appRoutes) {
  const appPageRoutes = appRoutes ? appRoutes(appConfig) : [];
  const routes = [{
      path: '/',
      async(context) {
        const { app, to, resolve, reject } = context;
        const locale = appConfig.locale();
        const url = `./locales/${locale}/index.html`;
        return resolveWithTemplate({ app, resolve, reject, url, logLabel: 'root' });
      }
    },
    {
      name: 'calculator',
      path: '/pages/calculator/:numDays',
      async(context) {
        const { app, to, resolve, reject } = context;
        const locale = appConfig.locale();
        const url = `./locales/${locale}/calculator.html`;
        return resolveWithTemplate({ app, resolve, reject, url, logLabel: 'calculator' });
      }
    },
    ...appPageRoutes,
    ...pageRoutes(appConfig)
  ];

  return routes;
}

export { createRoutes };