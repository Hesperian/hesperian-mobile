/*
 *  navigation
 *  utilities for page navigation
 */
import { Dom7 } from "framework7/bundle";
import { activateAccordionItem } from "./accordion/accordion";

const $$ = Dom7;

function scrollToSection(pageEl, sectionId) {
  if (sectionId) {
    let sectionEl$ = $$(`[data-section="${sectionId}"]`, pageEl);

    if (sectionEl$.length) {
      activateAccordionItem(sectionEl$);
      sectionEl$[0].scrollIntoView();
    }
  }
}

export { scrollToSection };
