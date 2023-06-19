/*
 *  navigation
 *  utilities for page navigation
 */
import { Dom7 } from "framework7/bundle";
import { ensureFilterVisibleFor } from "./filter/filter";
import { activateAccordionItem } from "./accordion/accordion";

const $$ = Dom7;

function scrollToSection(pageEl, sectionId) {
  if (sectionId) {
    let sectionEl$ = $$(`[data-section="${sectionId}"]`, pageEl);
    if (!sectionEl$.length) {
      sectionEl$ = $$(`.filter-content[data-filter="${sectionId}"]`, pageEl);
    }

    if (sectionEl$.length) {
      ensureFilterVisibleFor(sectionEl$);
      sectionEl$[0].scrollIntoView();

      activateAccordionItem(sectionEl$);
    }
  }
}

export { scrollToSection };
