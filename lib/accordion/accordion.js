import {
  Dom7
} from 'framework7/bundle';

import "./accordion.scss";

const $$ = Dom7;

function scrollAccordionItemIntoView(el) {
  // if there is an accordion-item-top, then it's been position to allow
  // ennsuring the visibility of the top of the item - scroll it into view.
  const $scrollTopSentinel = $$(el).children(".accordion-item-top");
  if ($scrollTopSentinel.length) {
    const scrollTopSentinel = $scrollTopSentinel[0];
    const rect = scrollTopSentinel.getBoundingClientRect();
    if (rect.top < 0) {
      scrollTopSentinel.scrollIntoView();
    }
  }
}

function activateAccordionItem(itemEl$) {
  if (!itemEl$.hasClass("accordion-item")) {
    return;
  }
  if (itemEl$.hasClass("accordion-item-opened")) {
    scrollAccordionItemIntoView(itemEl$[0]);
  } else {
    app.accordion.open(itemEl$);
  }
}

function initializeAccordions(app) {
  $$(document).on("page:init", function (e) {
    var pageEl = e.detail.pageEl;

    $$(".accordion-item", pageEl).prepend(
      '<div class="accordion-item-top"></div>'
    );
  });

  app.on("accordionOpened", function (el) {
    scrollAccordionItemIntoView(el);
  });
}

export { initializeAccordions, activateAccordionItem };
