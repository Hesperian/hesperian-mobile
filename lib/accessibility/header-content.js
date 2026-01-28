import { Dom7 } from "framework7/bundle";
import { resources } from "../resources";

const $$ = Dom7;

$$(document).on('page:init', function (e) {

  const logoImages = document.getElementsByClassName("hesperian-logo-image");
  Array.prototype.forEach.call(logoImages, function(logoImage) {
    if (logoImage !== null) {
      const logoAltText = resources.get("logoAltText");
      logoImage.alt = logoAltText;
    }
  });

  const upperLeftMenus = document.getElementsByClassName("top-left-menu");
  Array.prototype.forEach.call(upperLeftMenus, function(upperLeftMenu) {
    if (upperLeftMenu !== null) {
      const upperLeftMenuAriaLabel = resources.get("upperLeftMenuAriaLabel");
      upperLeftMenu.setAttribute("aria-label", upperLeftMenuAriaLabel);
    }
  });

  const upperRightMenus = document.getElementsByClassName("top-right-menu");
  Array.prototype.forEach.call(upperRightMenus, function(upperRightMenu) {
    if (upperRightMenu !== null) {
      const upperRightMenuAriaLabel = resources.get("upperRightMenuAriaLabel");
      upperRightMenu.setAttribute("aria-label", upperRightMenuAriaLabel);
    }
  });

  const backButtons = document.getElementsByClassName("back-button");
  Array.prototype.forEach.call(backButtons, function(backButton) {
    if (backButton !== null) {
      const backButtonAriaLabel = resources.get("backButtonAriaLabel");
      backButton.setAttribute("aria-label", backButtonAriaLabel);
    }
  });

});
