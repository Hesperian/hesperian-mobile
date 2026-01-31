/*
  appTemplates

  HTML Template7 Templates

*/

import Template7 from "template7";

const audioIcon = "&#xe050;";
const playIcon = "&#xe039;";
const pauseIcon = "&#xe036;";
const nextIcon = "&#xe044;";
const previousIcon = "&#xe045;";
const avTimerIcon = "&#xe5d4"; //more-vert

const bottomToolbarTemplate = Template7.compile(`
<div class="toolbar toolbar-bottom-md app-toolbar" role="toolbar" data-aria-label="common.toolbar.ariaLabels.mainToolbar">
  <div class="toolbar-inner">
  {{#each buttons}}
    {{this}}
  {{/each}}
  </div>
</div>
<div class="toolbar toolbar-bottom-md app-toolbar toolbar-audio" style="display: none;" role="toolbar" data-aria-label="common.audio.ariaLabels.audioToolbar">
  <div class="toolbar-inner">
    <a class="button hm-audio-button-previous audio-button aria-keyboard-accessible" role="button" data-aria-label="common.audio.ariaLabels.previousBlock"><i class="material-icons md-only" aria-hidden="true">${previousIcon}</i></a>
    <a class="button md-only hm-audio-button-start audio-button aria-keyboard-accessible" role="button" data-aria-label="common.audio.ariaLabels.play"><i class="material-icons" aria-hidden="true">${playIcon}</i></a>
    <a class="button md-only hm-audio-button-pause audio-button aria-keyboard-accessible" role="button" data-aria-label="common.audio.ariaLabels.pause"><i class="material-icons" aria-hidden="true">${pauseIcon}</i></a>
    <a class="button md-only hm-audio-button-stop audio-button aria-keyboard-accessible" role="button" data-aria-label="common.audio.ariaLabels.stop"><i class="material-icons" aria-hidden="true">stop</i></a>
    <a class="button md-only hm-audio-button-next audio-button aria-keyboard-accessible" role="button" data-aria-label="common.audio.ariaLabels.nextBlock"><i class="material-icons" aria-hidden="true">${nextIcon}</i></a>
    <a class="button md-only hm-audio-button-close audio-button aria-keyboard-accessible" role="button" data-aria-label="common.audio.ariaLabels.closeControls"><i class="material-icons" aria-hidden="true">close</i></a>
    <a class="button md-only hm-audio-button-rate audio-button aria-keyboard-accessible" role="button" aria-haspopup="dialog" data-aria-label="common.audio.ariaLabels.speechRate"><i class="material-icons" aria-hidden="true">${avTimerIcon}</i></a>
  </div>
  <div class="hm-audio-status visually-hidden" role="status" aria-live="polite" aria-atomic="true"></div>
</div>
`);

function getTemplates(config) {
  const bt = config.theme && config.theme.bottomToolbar;
  let bottomToolbar = "";
  let footerToolbar = "";

  if (bt) {
    const context = {
      buttons: [
        `<a class="button" href="/" data-aria-label="common.toolbar.ariaLabels.home"><i class="icon material-icons" aria-hidden="true">home</i></a>`,
        `<a class="button" href="/pages/J4-help" data-aria-label="common.toolbar.ariaLabels.help"><i class="icon material-icons" aria-hidden="true">help</i></a>`,
      ],
    };
    if (typeof bt === "string") {
      context.buttons.push(bt);
    }
    context.buttons.push(
      `<a class="button toolbar-audio-button-play aria-keyboard-accessible" href="#" role="button" aria-expanded="false" data-aria-label="common.audio.ariaLabels.openAudioControls"><i class="icon material-icons" aria-hidden="true">${audioIcon}</i></a>`,
      `<a class="button open-favorites" href="#" data-aria-label="common.toolbar.ariaLabels.bookmarks"><i class="icon material-icons" aria-hidden="true">stars</i></a>`
    );
    bottomToolbar = bottomToolbarTemplate(context);
    footerToolbar = bottomToolbar; // Same content for footer partial
  }
  // config.theme && config.theme.bottomToolbar ? bottomToolbarTemplate : "";

  const appTemplates = {
    header: {
      type: "template-partial",
      source: `
    <div class="navbar">
    <div class="navbar-inner navbar-top">
      <div class="left">
        <a href="#" class="link icon-only panel-open top-left-menu" data-aria-label="common.upperLeftMenuAriaLabel" data-panel="left">
          <i class="icon material-icons" aria-hidden="true">menu</i>
        </a>
      </div>
      <div class="title"><a href="https://hesperian.org/" class="inline-link external"><img src="img/HHG-logo.png" class="center hesperian-logo-image" data-aria-label="common.logoAltText" style="height:45px;" />hesperian.org</a></div>
      <div class="right">
        <a href="#" class="link icon-only panel-open top-right-menu" data-aria-label="common.upperRightMenuAriaLabel" data-panel="right">
          <i class="icon f7-icons app-gear" aria-hidden="true">gear_fill</i>
        </a>
      </div>

      <div class="subnavbar secondary-navbar">
        <a href="#" class="navicon back link navbar-f7-icons back-button" data-aria-label="common.backButtonAriaLabel">
          <i class="f7-icons color-custom" aria-hidden="true">chevron_left</i>
        </a>
        <div class="subnavbar-inner">
          <form class="searchbar">
            <div class="searchbar-inner">
              <div class="searchbar-input-wrap">
                <input type="search" placeholder="Search">
                <i class="searchbar-icon" aria-hidden="true"></i>
                <span class="input-clear-button" role="button" tabindex="0" data-aria-label="common.search.ariaLabels.clear"></span>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
  `,
    },
    "page-header": {
      type: "template",
      source: `
  <span class="content-block page-header">
    <span class="header-title">{{page.title}}</span>
    <span class="checkbox-favorites">
      <input type="checkbox" value="0" id="{{state "pageInitId"}}" data-bookmark-for="{{page.title}}"/>
      <label class="star-holder" for="{{state "pageInitId"}}">
        <img class="favorite-icon checked" src="./img/star-checked.svg" alt="" />
        <img class="favorite-icon unchecked" src="./img/star-unchecked.svg" alt="" />
      </label>
    </span>
  </span>
  `,
    },
    favorite_star: {
      type: "template-partial",
      source: `
  <div class="checkbox-favorites">
    <input type="checkbox" value="0" id="{{state "pageInitId"}}" data-bookmark-for="{{page.title}}"/>
    <label for="{{state "pageInitId"}}"><i class="icon material-icons favorite-icon unchecked">star_border</i><i class="icon material-icons favorite-icon checked">star</i></label>
   </div>
  `,
    },
    searchbar: {
      type: "template-partial",
      source: `
  <div class="searchbar-found global-search-results">
    <div class="list no-hairlines links-list list-block global-search virtual-list">
    </div>
  </div>
  `,
    },
    footer: {
      type: "template-partial",
      source: footerToolbar,
    },
  };

  return appTemplates;
}

export { getTemplates };
