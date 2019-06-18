/*
 *  routes
 *  usage: routes.createRoutes()
 */


function pageRoutes(appConfig) {
  function resolver(routeTo, routeFrom, resolve, reject) {
    const locale = appConfig.locale();
    var pagePathElement = routeTo.params.pageId;
    resolve({
      templateUrl: `./locales/${locale}/${pagePathElement}.html`
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
      async: function(routeTo, routeFrom, resolve, reject) {
        var locale = appConfig.locale();
        resolve({
          templateUrl: `./locales/${locale}/index.html`
        });
      }
    },
    ...appPageRoutes,
    ...pageRoutes(appConfig)
  ];

  return routes;
}

export { createRoutes };