/*
 *  search
 *
 * Handles searchbar search ui.
 */

import { Dom7, Template7 } from "framework7/framework7.esm.bundle.js";
const util = require("../util/util");
import "./search.scss";

let $$ = Dom7;

function searchEvents(searchType) {
  return  {
    enable: function () {
      $$("#app").addClass(`${searchType}-search-enabled`);
    },
    disable: function () {
      $$("#app").removeClass(`${searchType}-search-enabled`);
    },
    search: function (searchbar, query, previousQuery) {
      if (query) {
        $$("#app").addClass(`${searchType}-search-in`);
      } else {
        $$("#app").removeClass(`${searchType}-search-in`);
      }
    },
  }
}

function createGlobalSearchBar(app, $pageEl, resources) {
  let searchbar = app.searchbar.create({
    el: $$("form.searchbar", $pageEl[0])[0],
    inputEl: $$("form.searchbar input", $pageEl[0])[0],
    disableButton: false,
    backdrop: true,
    searchContainer: $$(".global-search", $pageEl[0])[0],
    on: searchEvents('global')
  });

  $$("form.searchbar input[type=search]", $pageEl[0]).attr(
    "placeholder",
    resources.get("search")
  );

  return searchbar;
}

function createLocalSearchBar(app, $pageEl, resources) {
  let searchbar = app.searchbar.create({
    el: $$(".local-search form.searchbar", $pageEl[0])[0],
    hideOnSearchEl: ".searchbar-hide-on-local-search",
    disableButton: false,
    backdrop: false,
    searchContainer: $$(".local-search-list", $pageEl[0])[0],
    on: searchEvents('local')
  });

  $$(".local-search form.searchbar input[type=search]", $pageEl[0]).attr(
    "placeholder",
    resources.get("search")
  );

  return searchbar;
}

function parseQuery(query) {
  const queryWords = query.split(/[^\w]+/);

  return queryWords.map((q) => util.searchNormalForm(q));
}

function testOneQueryword(queryword, keywords) {
  for (let k = 0; k < keywords.length; k++) {
    if (keywords[k].startsWith(queryword)) {
      return true;
    }
  }

  return false;
}

// Each queryword must match at least one keyword
function testQuery(querywords, keywords) {
  for (let q = 0; q < querywords.length; q++) {
    if (!testOneQueryword(querywords[q], keywords)) {
      return false;
    }
  }
  return querywords.length > 0;
}

function createLocalPageSearchItems(sections) {
  const ret = [];

  sections.forEach((section) => {
    ret.push({
      title: section.title,
      path: section.route,
      keywords: section.keywords || [],
    });
  });

  return ret;
}

function createPageItems(pages) {
  let ret = [];

  for (let k in pages) {
    const p = pages[k];
    if (p.title) {
      let r = {};
      r.title = p.title;
      r.path = p.route;
      r.keywords = p.keywords || [];
      ret.push(r);

      if (p.sections) {
        p.sections.forEach((section) => {
          ret.push({
            title: section.title,
            path: section.route,
            keywords: section.keywords || [],
          });
        });
      }
    }
  }

  return ret;
}

function testLocalQuery(query, q, keywords, title) {
  const querylc = query.toLowerCase();
  const titlelc = title.toLowerCase();
  if (titlelc.indexOf(querylc) !== -1) {
    return true;
  }
  return testQuery(q, keywords);
}

function createSearchList(app, $pageEl, resources) {
  const pages = resources.get("pages");

  let searchList = app.virtualList.create({
    el: $$(".global-search", $pageEl[0])[0],
    items: createPageItems(pages),
    renderItem: function (item) {
      return `
        <li class="search-link">
        <a href="${item.path}">
            <div class="item-inner">
            <div class="item-title">${item.title}</div>
            </div>
        </a>
        </li>
        `;
    },
    searchByItem: function (query, item, index) {
      const q = parseQuery(query);
      return testQuery(q, item.keywords);
    },
    searchAll: function (query, items) {
      const q = parseQuery(query);
      let indices = [];
      items.forEach((item, index) => {
        if (testQuery(q, item.keywords)) {
          indices.push(index);
        }
      });
      return indices;
    },
  });

  // When search is up, if you find the current page and navigate to it
  // the f7 link handler ignores - which is confusing to the user.
  // We reload the page instead.
  searchList.$el.on("click", ".search-link a.external", function (event) {
    const $el = $$(this);
    const href = $el.attr("href");
    const router = window.app.views.main.router;
    const url = router.currentRoute && router.currentRoute.url;

    event.preventDefault();
    event.stopPropagation();

    if (url !== href) {
      router.navigate(href);
    } else {
      router.refreshPage();
    }

    return false;
  });

  return searchList;
}

function createLocalSearchList(app, $pageEl, resources) {
  const pages = resources.get("pages");
  const pageId = $pageEl.data("id");
  const trimmer = new RegExp(`^[^:፤]+[:፤]\s*`);

  const thisPage = pages[pageId].sections.map((item) => {
    const newItem = { ...item };

    newItem.title = newItem.title.replace(trimmer, "");

    return newItem;
  });

  return app.virtualList.create({
    el: $$(".local-search-list", $pageEl[0])[0],
    items: createLocalPageSearchItems(thisPage),
    renderItem: function (item) {
      return `
        <li class="search-link">
        <a href="${item.path}">
            <div class="item-inner">
            <div class="item-title">${item.title}</div>
            </div>
        </a>
        </li>
        `;
    },
    searchByItem: function (query, item, index) {
      const q = parseQuery(query);
      return testLocalQuery(query, q, item.keywords, item.title);
    },
    searchAll: function (query, items) {
      const q = parseQuery(query);
      let indices = [];
      items.forEach((item, index) => {
        if (testLocalQuery(query, q, item.keywords, item.title)) {
          indices.push(index);
        }
      });
      return indices;
    },
  });
}

const localSearch = Template7.compile(`
<form class="searchbar searchbar-local">
  <div class="searchbar-inner">
    <div class="searchbar-input-wrap">
      <input type="search" placeholder="Search">
      <i class="searchbar-icon"></i>
      <span class="input-clear-button"></span>
    </div>
    <span class="searchbar-disable-button searchbar-disable">Cancel</span>
  </div>
</form>
<div class="list no-hairlines links-list list-block local-search-list virtual-list"></div>
`);

function initalizeLocalPageSearch(app, appConfig, resources, $pageEl) {
  $$(".local-search", $pageEl[0]).each(function () {
    $$(this).html(localSearch({}));

    const searchbar = createLocalSearchBar(app, $pageEl, resources);
    const searchList = createLocalSearchList(app, $pageEl, resources);
  });
}

function initializeSearch(app, appConfig, resources) {
  $$(document).on("page:init", function (e) {
    let searchbar = createGlobalSearchBar(app, e.detail.$pageEl, resources);
    let searchList = createSearchList(app, e.detail.$pageEl, resources);

    $$(document).on("page:afterout", e.detail.$pageEl, function (_e) {
      // searchbar.clear();
      searchbar.disable();
    });

    $$(document).on("page:beforeremove", e.detail.$pageEl, function (_e) {
      searchbar.destroy();
      searchbar = null;
      // hitting an intermittent exception thrown here where somehow the $el is gone already.
      if (searchList.$el.length) {
        searchList.destroy();
      }
      searchList = null;
    });

    initalizeLocalPageSearch(app, appConfig, resources, e.detail.$pageEl);
  });
}

export { initializeSearch };
