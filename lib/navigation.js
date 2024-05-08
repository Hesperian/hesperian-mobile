/*
 *  navigation
 *  utilities for page navigation
 */
import { Dom7 } from "framework7/framework7.esm.bundle.js";
import { activateAccordionItem } from "./accordion/accordion";

const $$ = Dom7;

function scrollToSection(pageEl, sectionId) {
  if (sectionId) {
    let sectionEl$ = $$(`[data-section="${sectionId}"]`, pageEl);

    if (sectionEl$.length) {
      sectionEl$[0].scrollIntoView();

      activateAccordionItem(sectionEl$);
    }
  }
}

export { scrollToSection };
