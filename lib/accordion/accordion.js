import { Dom7 } from "framework7/bundle";

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

  // Force open without animation
  itemEl$.siblings().removeClass("accordion-item-opened");
  itemEl$.addClass("accordion-item-opened");

}

function initializeAccordions(app) {
  $$(document).on("page:init", function (e) {
    var pageEl = e.detail.pageEl;

    $$(".accordion-item", pageEl).prepend(
      '<div class="accordion-item-top"></div>'
    );

    // Initialize accessibility state
    $$(".accordion-item", pageEl).each(function() {
      const $item = $$(this);
      const $trigger = $item.children(".item-link");
      const $content = $item.children(".accordion-item-content");
      
      // Set up trigger
      $trigger.attr("role", "button");
      $trigger.attr("aria-expanded", "false");
      
      // Set up content visibility
      $content.attr("aria-hidden", "true");
      $content.find("a, button, input, select, textarea, [tabindex]:not([tabindex='-1'])").attr("tabindex", "-1");
    });
  });

  app.on("accordionOpened", function (el) {
    scrollAccordionItemIntoView(el);
    
    const $el = $$(el);
    const $trigger = $el.children(".item-link");
    const $content = $el.children(".accordion-item-content");
    
    $trigger.attr("aria-expanded", "true");
    $content.attr("aria-hidden", "false");
    $content.find("a, button, input, select, textarea, [tabindex]").attr("tabindex", "0");
  });

  app.on("accordionClosed", function (el) {
    const $el = $$(el);
    const $trigger = $el.children(".item-link");
    const $content = $el.children(".accordion-item-content");
    
    $trigger.attr("aria-expanded", "false");
    $content.attr("aria-hidden", "true");
    $content.find("a, button, input, select, textarea, [tabindex]").attr("tabindex", "-1");
  });
}

export { initializeAccordions, activateAccordionItem };
