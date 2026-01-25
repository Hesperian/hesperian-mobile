/*
 *  favorites
 * 
 *  Handles favorites list
 */

import Template7 from 'template7';
import { Dom7 } from 'framework7/bundle';
import { getApp } from '../app';
import { isActivationKey } from '../accessibility/accessibility';
import './favorites.scss';

import Sortable from 'sortablejs';


const $$ = Dom7;

function setClass(element, classname, value) {
  if (value) {
    element.addClass(classname);
  } else {
    element.removeClass(classname);
  }
}



const favoritSheetContent = `
<div class="sheet-modal favorites-sheet favorites-parent">
  <div class="toolbar">
    <div class="toolbar-inner">
      <div class="left"></div>
      <div class="title"></div>
      <div class="right">
        <a class="link sheet-close" role="button" tabindex="0" aria-label="Close favorites"><i class="icon material-icons">close</i></a>
      </div>
    </div>
  </div>
  <div class="sheet-modal-inner">
    <div class="block">
      <div class="intro-message block-strong hide-on-favorites"></div>
      <div class="list-block favorites-list linktiles"><ul></ul></div>
    </div>
  </div>
</div>
`;



function initializeFavorites(app, appConfig, resources) {

  let favoritesSheet;

  const tileList = Template7.compile(`
  {{#each items}}
  <li class="tile elevation-5" data-pageId="{{pageId}}">
    <a class="link tile-link no-ripple" href="{{url}}">
      {{#if imgsrc}}<img src="{{imgsrc}}" alt="">{{/if}}
      <span>{{title}}</span>
    </a>
    <span class="close-tile star-holder" data-url="{{url}}" role="button" tabindex="0" aria-label="{{../checkboxLabel}}: {{title}}">
      <img class="favorite-icon checked" src="./img/star-checked.svg" alt=""/>
      <img class="favorite-icon unchecked" src="./img/star-unchecked.svg" alt=""/>
    </span>
  </li>
  {{/each}}
`);

  let favoritesItems = appConfig.favorites();


  function updateFavoritesList(contextEl) {

    const pages = resources.get('pages');
    const favorites = resources.get('favorites');
    const $parentDomEl = $$(contextEl).closest('.favorites-parent');
    const parentDomEl = $parentDomEl[0];
    const $listEl = $$('.favorites-list > ul', parentDomEl);

    const context = {
      items: favoritesItems.filter(fav => pages[fav.pageId]),
      checkboxLabel: favorites?.checkboxLabel || 'Bookmark'
    }

    context.items.forEach((fav) => {
      const page = pages[fav.pageId];
      fav.imgsrc = page.imgsrc;
      fav.url = page.route;
      fav.title = page.title;
    });

    $listEl.html(tileList(context));
    const empty = (context.items.length === 0);
    setClass($parentDomEl, 'favorites-empty', empty);
    setClass($parentDomEl, 'favorites-nonempty', !empty);

    if (favorites) {
      const $intro = $$('.intro-message', parentDomEl);
      $intro.html(favorites.intro);
    }

  }

  function addFavorite(pageId) {
    const pages = resources.get('pages');
    const page = pages[pageId];

    if (page && !isFavorite(pageId)) {
      favoritesItems.push({
        pageId: pageId
      });
      appConfig.favorites(favoritesItems);
    }
  }

  function removeFavorite(pageId) {

    for (let i = favoritesItems.length - 1; i >= 0; i--) {
      if (favoritesItems[i].pageId === pageId) {
        favoritesItems.splice(i, 1);
      }
    }

    appConfig.favorites(favoritesItems);
  }

  function isFavorite(pageId) {
    for (let i = 0; i < favoritesItems.length; i++) {
      if (favoritesItems[i].pageId === pageId) return true;
    }
    return false;
  }

  $$(document).on('change', '.page-current .checkbox-favorites input', (e) => {
    const checked = $$(e.target).prop('checked');
    const page$ = $$(e.target).parents('.page');
    const pageId = page$.data('id');

    if (checked) {
      addFavorite(pageId);
    } else {
      removeFavorite(pageId);
    }
  });

  function updatePageChecked($page) {
    const pageId = $page.data('id');
    const $checkbox = $$(".checkbox-favorites", $page.el);
    const favorite = isFavorite(pageId);

    $checkbox.prop('aria-checked', favorite ? 'true' : 'false');
    $checkbox.children('input').prop('checked', favorite);
  }

  $$(document).on('page:beforein', function (e) {
    const page = e.detail;
    updatePageChecked(page.$el);
  });


  $$(document).on('click', '.favorites-parent .close-tile', function () {
    const $listItem = $$(this).parents('.favorites-list > ul > li');
    const pageId = $listItem.data('pageId');
    const $parent = $$(this).closest('.favorites-parent');

    $listItem.animate({
      'opacity': 0.0
    }, {
      complete: function (elements) {
        removeFavorite(pageId);
        updateFavoritesList($parent[0]);
      }
    });
  });

  // Keyboard support for close-tile buttons (Enter and Space)
  $$(document).on('keydown', '.favorites-parent .close-tile, .favorites-sheet .sheet-close', function (e) {
    if (isActivationKey(e)) {
      e.preventDefault();
      $$(this).trigger('click');
    }
  });

  favoritesSheet = app.sheet.create({
    content: favoritSheetContent,
    // Events
    on: {
      open: function (sheet) {
        const favorites = resources.get('favorites');
        $$('.toolbar-inner .title', favoritesSheet.el).html(favorites.title);
        updateFavoritesList(favoritesSheet.el);
      },
      closed: function (sheet) {
        const page = getApp().views.main.router.currentPageEl;
        $$('a.open-favorites', page).focus();
      },
      opened: function (sheet) { },
    }
  });

  $$(document).on('click', '.open-favorites', function () {
    favoritesSheet.open();
  });

  function initSortable(parentEl) {
    const $favs = $$('.favorites-list > ul', parentEl);
    Sortable.create($favs[0], {
      fallbackTolerance: 4,
      onUpdate: function (_evt) {
        let newFavorites = [];
        $$('li', $favs[0]).each(function () {
          const pageId = $$(this).data('pageId');
          newFavorites.push({
            'pageId': pageId
          });
        });
        favoritesItems = newFavorites;
        appConfig.favorites(favoritesItems);
      }
    });
  }

  initSortable(favoritesSheet.el);

  $$(document).on('page:init', '.page.favorites-parent', (e) => {
    const page = e.detail;
    initSortable(page.el);
  });

  $$(document).on('page:beforein', '.page.favorites-parent', (e) => {
    const page = e.detail;
    updateFavoritesList(page.el);
  });


  $$(document).on('click', '.favorites-sheet .link', function () {
    const router = getApp().views.main.router;
    updatePageChecked($$(router.currentPageEl));

    favoritesSheet.close();
  });
}

export {
  initializeFavorites
}