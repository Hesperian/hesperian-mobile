/**
 * search.js - Search UI for Hesperian Mobile
 *
 * Provides two search modes:
 *
 * 1. Global Search: A Framework7 searchbar + virtual list that searches across
 *    all pages and sections in the app. Results link to the matching page/section.
 *    The current page is excluded from results.
 *
 * 2. Local Search: A per-page search form that filters sections within the
 *    current page. Results scroll to the matching section.
 *
 * Pure search matching logic lives in search-logic.js (tested independently).
 * This module handles DOM integration with Framework7.
 *
 * The search index (keywords per page/section) is built at compile time by
 * build/preprocess.js, which scans HTML data-title/data-keywords attributes.
 */

import { Dom7 } from "framework7/bundle";
import Template7 from "template7";
import { scrollToSection } from "../navigation";
import { getApp } from "../app";
import { isActivationKey } from "../accessibility/accessibility";
import {
  parseQuery,
  testQuery,
  createLocalPageSearchItems,
  createPageItems,
  displayTitle,
} from "./search-logic";
import "./search.scss";

let $$ = Dom7;

function searchEvents(searchType) {
  return {
    enable: function () {
      $$("#app").addClass(`${searchType}-search-enabled`);
    },
    disable: function () {
      $$("#app").removeClass(`${searchType}-search-enabled`);
      // On mobile, the window scroll position might be messed up
      // as the keyboard comes up.
      window.scrollTo(0, 0);
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
    resources.get("common.search").prompt
  );
  // Close search overlay when tabbing away (keyboard accessibility)
  const $searchInput = $$("form.searchbar input[type=search]", $pageEl[0]);
  $searchInput.on("blur", function() {
    if (!$searchInput.val()) {
      searchbar.disable();
    }
  });

  // Keyboard accessibility for global searchbar clear button
  const $clearButton = $$("form.searchbar .input-clear-button", $pageEl[0]);
  $clearButton.on("keydown", function (e) {
    if (isActivationKey(e)) {
      e.preventDefault();
      searchbar.clear();
      $searchInput.focus();
    }
  });

  return searchbar;
}

function isCurrentPage(href) {
  const app = getApp();
  const router = app && app.views && app.views.main && app.views.main.router;
  const url = router && router.currentRoute && router.currentRoute.url;
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
            <div class="item-title">${displayTitle(item)}</div>
            </div>
        </a>
        </li>
        `;
    },
    searchAll: function (query, items) {
      const q = parseQuery(query);
      let indices = [];
      items.forEach((item, index) => {
        if (
          !isCurrentPage(item.path) &&
          testQuery(query, q, item.keywords, item.title, item.titleKeywords)
        ) {
          indices.push(index);
        }
      });
      return indices;
    },
  });

  return searchList;
}

const localSearchList = Template7.compile(`
<div class="list"><ul>
{{#each items}}
  <li class="search-link">
  <a href="" data-sectionid="{{sectionId}}">
      <div class="item-inner">
      <div class="item-title">{{title}}</div>
      </div>
  </a>
  </li>
  {{/each}}
</ul></div>
`);

// Regex to strip page name prefix from section titles for local search display.
// Matches text before ':' or '፤' (Ethiopic semicolon). Note the \\s for literal
// whitespace matching in the RegExp constructor.
const titlePrefixTrimmer = new RegExp(`^[^:፤]+[:፤]\\s*`);

function createLocalSearchList(app, $pageEl, resources) {
  const pages = resources.get("pages");
  const pageId = $pageEl.data("id");

  const thisPage = pages[pageId].sections.map((item) => {
    const newItem = { ...item };
    newItem.title = newItem.title.replace(titlePrefixTrimmer, "");
    return newItem;
  });

  const items = createLocalPageSearchItems(thisPage);

  if (items.length === 0) {
    return null;
  }

  const searchList = $$(".local-search-list", $pageEl[0]);

  searchList.html(
    localSearchList({
      items,
    })
  );
  searchList.data("items", items);

  // Use touchend for iOS, with click as fallback
  searchList.on("click touchend", ".search-link a", function (event) {
    // Prevent double-firing from both touch and click
    if (event.type === 'touchend') {
      event.preventDefault();
    }

    const $el = $$(this);
    const sectionId = $el.data("sectionid");

    scrollToSection($pageEl[0], sectionId);

    return false;
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
    <span class="search-disable-button" role="button" tabindex="0" data-aria-label="search.ariaLabels.clear"><i class="icon material-icons" aria-hidden="true">close</i></span>
  </div>
</form>
<div class="list no-hairlines links-list list-block local-search-list virtual-list"></div>
`);

function updateLocalSearchToQuery(searchList, query) {
  if (!searchList) return;
  const q = parseQuery(query);
  const items = searchList.data("items");

  const searchItems = searchList.find(".search-link");

  searchItems.each(function (_el, index) {
    const item = items[index];
    const passes = testQuery(
      query,
      q,
      item.keywords,
      item.title,
      item.titleKeywords
    );
    if (passes) {
      $$(this).addClass("search-passes");
    } else {
      $$(this).removeClass("search-passes");
    }
  });
}

function initalizeLocalPageSearch(app, appConfig, resources, $pageEl) {
  $$(".local-search", $pageEl[0]).each(function () {
    const context = {
      placeholder: $$(this).data("placeholder") || resources.get("common.search").prompt,
    };

    $$(this).html(localSearch(context));

    // Set aria-label manually since template is rendered after updateAiraLabels() runs
    $$(".search-disable-button", this).attr("aria-label", resources.get("common.search").ariaLabels.clear);

    const searchList = createLocalSearchList(app, $pageEl, resources);

    if (null === searchList) {
      $$(this).hide();
    }

    $$(".searchbar-local", $pageEl[0]).each(function () {
      function handleViewportScroll(event) {
        window.scrollTo(0, 0);
        return false;
      }

      $$(this).on("submit", (e) => {
        e.preventDefault();
        return false;
      });
      const isMobile = !!window.cordova;

      const $input = $$(".searchbar-local input", $pageEl[0]);
      const $clear = $$(".searchbar-local .search-disable-button", $pageEl[0]);

      if (isMobile) {
        $input.focusin(function () {
          if (window.visualViewport) {
            window.visualViewport.addEventListener(
              "scroll",
              handleViewportScroll
            );
          }
          $$("#app").addClass(`local-search-enabled`);
          const pageContent = $$(".page-content", $pageEl[0]);
          pageContent[0].scrollTop = 0;
        });
        $input.focusout(function () {
          $$("#app").removeClass(`local-search-enabled`);
          if (window.visualViewport) {
            window.visualViewport.removeEventListener(
              "scroll",
              handleViewportScroll
            );
          }
          window.scrollTo(0, 0);
          $input.val("");
          updateLocalSearchToQuery(searchList, "");
        });

        $input.on("input", function () {
          const query = $$(this).val();
          updateLocalSearchToQuery(searchList, query);
        });
      } else {
        $input.on("input", function () {
          const query = $$(this).val();
          if (query.length > 0) {
            $$("#app").addClass(`local-search-enabled`);
          } else {
            $$("#app").removeClass(`local-search-enabled`);
          }
          updateLocalSearchToQuery(searchList, query);
        });

        // Close search overlay when tabbing away (keyboard accessibility)
        $input.on("blur", function () {
          if (!$input.val()) {
            $$("#app").removeClass(`local-search-enabled`);
            updateLocalSearchToQuery(searchList, "");
          }
        });

        $clear.click(function () {
          $input.val("");
          updateLocalSearchToQuery(searchList, "");
          $$("#app").removeClass(`local-search-enabled`);
        });

        // Keyboard accessibility for close button (Enter/Space)
        $clear.on("keydown", function (e) {
          if (isActivationKey(e)) {
            e.preventDefault();
            $input.val("");
            updateLocalSearchToQuery(searchList, "");
            $$("#app").removeClass(`local-search-enabled`);
            $input.focus();
          }
        });
      }
    });
  });
}

function initializeSearch(app, appConfig, resources) {
  $$(document).on("page:init", function (e) {
    let searchbar = createGlobalSearchBar(app, e.detail.$pageEl, resources);
    let searchList = createSearchList(app, e.detail.$pageEl, resources);

    $$(document).on("page:afterout", e.detail.$pageEl, function (_e) {
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
