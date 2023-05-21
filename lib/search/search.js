/*
 *  search
 *
 * Handles searchbar search ui.
 */

import { Dom7, Template7 } from "framework7/framework7.esm.bundle.js";
import {scrollToSection} from "../navigation";
const util = require("../util/util");
import "./search.scss";

let $$ = Dom7;

function searchEvents(searchType) {
  return {
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
  };
}

function createGlobalSearchBar(app, $pageEl, resources) {
  let searchbar = app.searchbar.create({
    el: $$("form.searchbar", $pageEl[0])[0],
    inputEl: $$("form.searchbar input", $pageEl[0])[0],
    disableButton: false,
    backdrop: true,
    searchContainer: $$(".global-search", $pageEl[0])[0],
    on: searchEvents("global"),
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
    disableButton: true,
    backdrop: false,
    searchContainer: $$(".local-search-list", $pageEl[0])[0],
    on: searchEvents("local"),
  });

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
function testQuerywords(querywords, keywords) {
  for (let q = 0; q < querywords.length; q++) {
    if (!testOneQueryword(querywords[q], keywords)) {
      return false;
    }
  }
  return querywords.length > 0;
}

function testQuery(query, q, keywords, title) {
  if (title) {
    const querylc = query.toLowerCase();
    const titlelc = title.toLowerCase();
    if (titlelc.indexOf(querylc) !== -1) {
      return true;
    }
  }
  return testQuerywords(q, keywords);
}

function createSearchItem(itemSource) {
  return {
    title: itemSource.title,
    path: itemSource.route,
    sectionId: itemSource.sectionId,
    keywords: itemSource.keywords || [],
  };
}

function createLocalPageSearchItems(sections) {
  const ret = [];

  sections.forEach((section) => {
    ret.push(createSearchItem(section));
  });

  return ret;
}

function createPageItems(pages) {
  const ret = [];

  for (let k in pages) {
    const p = pages[k];
    if (p.title) {
      ret.push(createSearchItem(p));

      if (p.sections) {
        p.sections.forEach((section) => {
          ret.push(createSearchItem(section));
        });
      }
    }
  }

  return ret;
}

function isCurrentPage(href) {
  const router = window.app.views.main.router;
  const url = router.currentRoute && router.currentRoute.url;
  return url === href;
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
      if (isCurrentPage(item.path)) {
        return false;
      }
      const q = parseQuery(query);
      return testQuery(query, q, item.keywords);
    },
    searchAll: function (query, items) {
      const q = parseQuery(query);
      let indices = [];
      items.forEach((item, index) => {
        if (!isCurrentPage(item.path) && testQuery(query, q, item.keywords)) {
          indices.push(index);
        }
      });
      return indices;
    },
  });

  return searchList;
}

function createLocalSearchList(app, $pageEl, resources) {
  const pages = resources.get("pages");
  const pageId = $pageEl.data("id");

  // Page titles in search are generally prefixed with a {{pageName}}: , which
  // doesn't make sense to include with intra-page search
  // Also there is an amharic version of a semicolon - https://en.wiktionary.org/wiki/%E1%8D%A4
  const trimmer = new RegExp(`^[^:፤]+[:፤]\s*`);

  const thisPage = pages[pageId].sections.map((item) => {
    const newItem = { ...item };

    newItem.title = newItem.title.replace(trimmer, "");

    return newItem;
  });

  const items = createLocalPageSearchItems(thisPage);

  if (items.length === 0) {
    return null;
  }

  const searchList = app.virtualList.create({
    el: $$(".local-search-list", $pageEl[0])[0],
    items,
    renderItem: function (item) {
      return `
        <li class="search-link">
        <a href="" data-sectionid="${item.sectionId}">
            <div class="item-inner">
            <div class="item-title">${item.title}</div>
            </div>
        </a>
        </li>
        `;
    },
    searchByItem: function (query, item, index) {
      const q = parseQuery(query);
      return testQuery(query, q, item.keywords, item.title);
    },
    searchAll: function (query, items) {
      const q = parseQuery(query);
      let indices = [];
      items.forEach((item, index) => {
        if (testQuery(query, q, item.keywords, item.title)) {
          indices.push(index);
        }
      });
      return indices;
    },
  });

  return searchList;
}

const localSearch = Template7.compile(`
<form class="searchbar searchbar-local">
  <div class="searchbar-inner">
    <div class="searchbar-input-wrap">
      <input type="search" placeholder="{{placeholder}}">
      <i class="searchbar-icon"></i>
    </div>
    <span class="search-disable-button"><i class="icon material-icons">close</i></span>
  </div>
</form>
<div class="list no-hairlines links-list list-block local-search-list virtual-list"></div>
`);

function initalizeLocalPageSearch(app, appConfig, resources, $pageEl) {
  $$(".local-search", $pageEl[0]).each(function () {
    const context = {
      placeholder: $$(this).data("placeholder") || resources.get("search"),
    };

    $$(this).html(localSearch(context));

    const searchbar = createLocalSearchBar(app, $pageEl, resources);
    const searchList = createLocalSearchList(app, $pageEl, resources);
    if (null === searchList) {
      $$(this).hide();
    }

    $$(".searchbar-local input", $pageEl[0]).each(function() {
      $$(this).blur(function() {
        searchbar.disable();
      });
    });

    searchList.$el.on("click", ".local-search .search-link a", function (event) {
      const $el = $$(this);
      const sectionId = $el.data("sectionid");

      searchbar.clear();
      searchbar.disable();
      $$(".searchbar-local input", $pageEl[0]).each(function() {
        $$(this).blur();
      });

      scrollToSection($pageEl[0], sectionId);

      return false;
    });
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
