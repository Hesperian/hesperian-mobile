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
  console.log(filter, JSON.stringify(filterMap));
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
