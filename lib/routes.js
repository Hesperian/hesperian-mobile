/*
 *  routes
 *  usage: routes.createRoutes()
 */

import   Template7 from 'template7'

function pageRoutes(appConfig) {
  function resolver(context) {
    const locale = appConfig.locale();
    const pagePathElement = context.to.params.pageId;
    const url = `./locales/${locale}/${pagePathElement}.html`;
    context.app.request.get(url).then((page) => {
      const pager = Template7.compile(page.data);
      const content = pager({});
      context.resolve({
        content
      });
    });
  }

  const pageIdElement = ':pageId';

  const pageRoutes = [{
      path: `/pages/${pageIdElement}`,
      async: resolver
    },
    {
      path: `/pages/${pageIdElement}/:sectionId`,
      async: resolver
    }
  ];

  return pageRoutes;
}

function createRoutes(appConfig, appRoutes) {
  const appPageRoutes = appRoutes ? appRoutes(appConfig) : [];
  var routes = [{
      path: '/',
      async: function(context) {
        var locale = appConfig.locale();
        const url = `./locales/${locale}/index.html`;
        context.app.request.get(url).then((page) => {
          const pager = Template7.compile(page.data);
          const content = pager({})
          context.resolve({
            content
          });
        })
      }
    },
    {
      name: 'calculator',
      path: '/pages/calculator/:numDays',
      async: function(context) {
        var locale = appConfig.locale();
        const url = `./locales/${locale}/calculator.html`;
        context.app.request.get(url).then((page) => {
          const pager = Template7.compile(page.data);
          const content = pager({});
          context.resolve({
            content
          });
        })
      }
    },
    ...appPageRoutes,
    ...pageRoutes(appConfig)
  ];

  return routes;
}

export { createRoutes };