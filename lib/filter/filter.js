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
import Template7 from "template7";
import { Dom7 } from "framework7/bundle";
import { getApp } from "../app";

import "./filter.scss";

const noSelectionMarker = "no-selection";

const $$ = Dom7;

// transition from different langs of same page id should preserve filter
let curFilter = {
  pageId: null,
  filter: noSelectionMarker,
};

function getFilterArrayForElement($el) {
  const filter = $el.data("filter");
  return filter ? filter.split(" ") : [];
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

  const app = getApp();
  if (app && app.api) {
    app.api.pageStructureChanged();
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
    $el.find('.filter-button').each(function () {
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

function updateFilter($el, filter) {
  $el.find("[data-filter]").forEach(function () {
    const $el = $$(this);
    const filterMap = getElementFilterMap($el);
    if (!filter || filterMap[filter]) {
      $el.removeClass("fade-out");
    } else {
      $el.addClass("fade-out");
    }
  });;
}

const filterSelect = Template7.compile(`
<div class="list filter-list no-hairlines no-hairlines-between">
  <ul>
    <li>
      <a class="item-link smart-select filter-menu"">
        <select name="methods">
          <option value="" selected>{{all}}</option>
        {{#each categories}}
          <option value="{{id}}">{{name}}</option>
        {{/each}}
        </select>
        <span class="filter-menu-content"><img src="img/filter-icon.png" class="filter-menu-icon"><span class="filter-menu-text">{{filter}}</span></span>
      </a>
    </li>
  </ul>
</div>
`);

function attachToFilterSelect($el, opts) {
  $el.find(".filter-menu").forEach(function () {
    const el = this;
    const app = getApp();
    const select = app && app.smartSelect.create({
      el: el,
      closeOnSelect: true,
      openIn: "popup"
    });
    const target = opts.target;
    const defaultText = opts.context.filter;
    const $menuText = $$(el).find(".filter-menu-text");

    select.selectEl.addEventListener("change", (event) => {
      const filter = event.target.value;
      const text = event.target.options[event.target.selectedIndex].textContent;
      $menuText.text(filter ? text : defaultText);
      $el.find(target).forEach(function () {
        updateFilter($$(this), filter);
      });
    });
  });
}

function initializeFilters(initSpec) {
  $$(document).on("page:init", ".page", function (e, page) {
    page.$el.find(".filter-select").forEach(function () {
      const resourceKey = this.dataset.resources;
      const target = this.dataset.target;
      const context = initSpec.resources.get(resourceKey);
      if (!context) {
        return;
      }
      this.innerHTML = filterSelect(context);
      attachToFilterSelect(page.$el, { context, target });
    });
  });
}

export { initializeFilters };
