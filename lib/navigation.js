/*
 *  navigation
 *  utilities for page navigation
 */
import { Dom7 } from 'framework7/framework7.esm.bundle.js';
import { ensureFilterVisibleFor } from "./filter/filter";

const $$ = Dom7;

function scrollToSection(pageEl, sectionId) {
  if (sectionId) {
    let sectionEl$ = $$(`[data-section="${sectionId}"]`, pageEl);
    if (!sectionEl$.length) {
      sectionEl$ = $$(`.filter-content[data-filter="${sectionId}"]`, pageEl);
    }

    if (sectionEl$.length) {
      ensureFilterVisibleFor(sectionEl$);
      if (sectionEl$.hasClass("accordion-item")) {
        app.accordion.open(sectionEl$);
      }
      sectionEl$[0].scrollIntoView();
    }
  }
}

export { scrollToSection };
