/*
  Filter pages.

  Filter pages have class `filter-page`, and routes in the app specific section to map filter
   button links to filter parameters
:
      {
      name: "pageID",
      path: "/pages/pagename/filter/:filter",
      async: function (routeTo, routeFrom, resolve, reject) {
        var locale = appConfig.locale();
        resolve({
          templateUrl: `./locales/${locale}/pagename.html`,
        });
      },
    },

    Clicking on a filter button link takes you to a new page, same template, with content filtered
    to the given filter.

    Used for pages which are very close to each other in content.
*/
import { Template7, Dom7 } from "framework7/framework7.esm.bundle.js";

import "./filter.scss";

const noSelectionMarker = "no-selection";

const $$ = Dom7;

// transition from different langs of same page id should preserve filter
let curFilter = {
  pageId: null,
  filter: noSelectionMarker,
};

function getFilterArrayForElement($el) {
  return $el.data("filter").split(" ");
}

function getElementFilterMap($el) {
  let filter = {};
  getFilterArrayForElement($el).forEach((f) => {
    filter[f] = true;
  });

  // default to show on no filter.
  if (!$el.hasClass("filter-content")) {
    filter[noSelectionMarker] = true;
  }
  return filter;
}

function showHideForFilter($el, filter) {
  const filterMap = getElementFilterMap($el);
  if (filterMap[filter]) {
    $el.show();
  } else {
    $el.hide();
  }
}

function updatePageFilter($el, filter) {
  curFilter.filter = filter;
  if (filter !== noSelectionMarker) {
    $el.addClass("filter-active");
  } else {
    $el.removeClass("filter-active");
  }

  $el.find(".filter-content").each(function () {
    showHideForFilter($$(this), filter);
  });

  if (window.app && window.app.views) {
    const currentPage = window.app.views.main.router.currentPageEl;
    window.app.emit("pageStructureChanged", currentPage);
  }
}

$$(document).on("page:init", ".page.filter-page", function (e, page) {
  const filter = page.route.params.filter;
  updatePageFilter(page.$el, filter || "no-selection");
});

// Legacy / old-style filters still in use. These have only one page, and the filter
// buttons when clicked filter the content, and expose a close button to go back to original state.
// legacy filter pages need class `legacy-filter-page`
$$(document).on("page:init", ".page.legacy-filter-page", function (e, page) {
  const closeHTML = '<i class="icon material-icons">close</i>';
  function legacyUpdatePageFilter($el, filter) {
    updatePageFilter($el, filter);
    $el.find('.filter-button').each(function() {
      showHideForFilter($$(this), filter);
    });
  }
  // If it's a language switch, the page id will be the same as last
  // so we want to keep the filter. Otherwise no filter.
  const pageId = page.$el.data("id");
  if (pageId !== curFilter.pageId) {
    curFilter.filter = noSelectionMarker;
  }
  curFilter.pageId = pageId;

  legacyUpdatePageFilter(page.$el, curFilter.filter);

  page.$el.find(".filter-button").forEach(function () {
    $$(this).append(closeHTML);
  });

  page.$el.find(".filter-button").on("click", function () {
    const $fb = $$(this);
    let filter = $fb.data("filter");
    // second click is a toggle off
    if (filter === curFilter.filter) {
      filter = noSelectionMarker;
    }
    legacyUpdatePageFilter(page.$el, filter);
  });
});
