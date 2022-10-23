import {
  Template7,
  Dom7
} from 'framework7/framework7.esm.bundle.js';

import './filter.scss';


/*
    HTML Markup
    Button triggering filter:
        .filter-button
        data-filter="filter_id"
    Content under filter:
        .filter-content
        data-filter="space separated list of filter_id"
*/

const noSelectionMarker = 'no-selection';
const closeHTML = '<i class="icon material-icons">close</i>'

const $$ = Dom7;

// transition from different langs of same page id should preserve fiters
let curFilter = {
  pageId: null,
  filter: noSelectionMarker
}

function getFilterArrayForElement($el) {
  return $el.data('filter').split(' ');
}

function getElementFilterMap($el) {
  let filter = {};
  getFilterArrayForElement($el).forEach(f => {
    filter[f] = true;
  });

  // buttons etc appear when no filter selection
  if (!$el.hasClass('filter-content')) {
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
    $el.addClass('filter-active');
  } else {
    $el.removeClass('filter-active');
  }

  $el.find('.filter-content, .filter-button').each(function() {
    showHideForFilter($$(this), filter);
  });

  if( window.app && window.app.views) {
    const currentPage = window.app.views.main.router.currentPageEl;
    window.app.emit('pageStructureChanged', currentPage);
  }
}

$$(document).on('page:init', function(_e, page) {

  // If it's a language switch, the page id will be the same as last
  // so we want to keep the filter. Otherwise no filter.
  const pageId = page.$el.data('id');
  if (pageId !== curFilter.pageId) {
    curFilter.filter = noSelectionMarker;
  }
  curFilter.pageId = pageId;

  updatePageFilter(page.$el, curFilter.filter);

  page.$el.find('.filter-button').forEach(function() {
    $$(this).append(closeHTML);
  });

  page.$el.find('.filter-button').on('click', function() {
    const $fb = $$(this);
    let filter = $fb.data('filter');
    // second click is a toogle off
    if (filter === curFilter.filter) {
      filter = noSelectionMarker;
    }
    updatePageFilter(page.$el, filter)
  });
});

function ensureFilterVisibleFor($el) {
  const $filterParents = $el.hasClass('filter-content') ? $el : $el.parents('.filter-content');
  if($filterParents.length) {
    const $page = $filterParents.parents('.page');
    const filters = getFilterArrayForElement($filterParents);
    updatePageFilter($page, filters[0])
  }
}

export {
  ensureFilterVisibleFor
}