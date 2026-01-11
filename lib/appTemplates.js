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
<div class="toolbar toolbar-bottom-md app-toolbar">
  <div class="toolbar-inner">
  {{#each buttons}}
    {{this}}
  {{/each}}
  </div>
</div>
<div class="toolbar toolbar-bottom-md app-toolbar toolbar-audio" style="display: none;">
  <div class="toolbar-inner">
    <a class="button hm-audio-button-previous audio-button"><i class="material-icons md-only">${previousIcon}</i></a>
    <a class="button md-only hm-audio-button-start audio-button"><i class="material-icons">${playIcon}</i></a>
    <a class="button md-only hm-audio-button-pause audio-button"><i class="material-icons">${pauseIcon}</i></a>
    <a class="button md-only hm-audio-button-stop audio-button"><i class="material-icons">stop</i></a>
    <a class="button md-only hm-audio-button-next audio-button"><i class="material-icons">${nextIcon}</i></a>
    <a class="button md-only hm-audio-button-close audio-button"><i class="material-icons">close</i></a>
    <a class="button md-only hm-audio-button-rate audio-button"><i class="material-icons">${avTimerIcon}</i></a>
  </div>
</div>
`);

function getTemplates(config) {
  const bt = config.theme && config.theme.bottomToolbar;
  let bottomToolbar = "";
  let footerToolbar = "";

  if (bt) {
    const context = {
      buttons: [
        `<a class="button" href="/"><i class="icon material-icons">home</i></a>`,
        `<a class="button" href="/pages/J4-help"><i class="icon material-icons">help</i></a>`,
      ],
    };
    if (typeof bt === "string") {
      context.buttons.push(bt);
    }
    context.buttons.push(
      `<a class="button toolbar-audio-button-play" href="#"><i class="icon material-icons">${audioIcon}</i></a>`,
      `<a class="button open-favorites" href="#"><i class="icon material-icons">stars</i></a>`
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
        <a href="#" class="link icon-only panel-open top-left-menu" data-panel="left">
          <i class="icon material-icons">menu</i>
        </a>
      </div>
      <div class="title"><a href="https://hesperian.org/" class="inline-link external"><img src="img/HHG-logo-small-circle.png" class="center hesperian-logo-image" style="height:45px;" /></a></div>
      <div class="right">
        <a href="#" class="link icon-only panel-open top-right-menu" data-panel="right">
          <i class="icon f7-icons app-gear">gear_fill</i>
        </a>
      </div>

      <div class="subnavbar secondary-navbar">
        <a href="#" class="navicon back link navbar-f7-icons back-button">
          <i class="f7-icons color-custom" aria-hidden="true">chevron_left</i>
        </a>
        <div class="subnavbar-inner">
          <form class="searchbar">
            <div class="searchbar-inner">
              <div class="searchbar-input-wrap">
                <input type="search" placeholder="Search">
                <i class="searchbar-icon"></i>
                <span class="input-clear-button"></span>
              </div>
              <span class="searchbar-disable-button searchbar-disable">Cancel</span>
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
  <div class="content-block page-header">
    <div class="header-title">{{page.title}}</div>
    <div class="checkbox-favorites">
      <input type="checkbox" value="0" id="{{state "pageInitId"}}"/>
      <label class="star-holder" for="{{state "pageInitId"}}">
      <span class="sr-only" data-aria-content="favorites.checkboxLabel">Page Bookmark</span>
        <img class="favorite-icon checked" src="./img/star-checked.svg" alt="" />
        <img class="favorite-icon unchecked" src="./img/star-unchecked.svg" alt="" />
      </label>
    </div>
  </div>
  `,
    },
    favorite_star: {
      type: "template-partial",
      source: `
  <div class="checkbox-favorites">
    <input type="checkbox" value="0" id="{{state "pageInitId"}}" aria-label="page bookmark"/>
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
