/*
  appTemplates

  HTML Template7 Templates

*/

const bottomToolbarTemplate = `
<div class="toolbar toolbar-bottom-md app-toolbar">
  <div class="toolbar-inner">
    <a class="button toggle-audio bottom-toolbar-standard bottom-toolbar-audio" href="#"><i class="icon material-icons">hearing</i></a>
    <a class="button bottom-toolbar-standard" href="/"><i class="icon material-icons">home</i></a>
    <a class="button bottom-toolbar-standard" href="/pages/FAQ/"><i class="icon material-icons">help</i></a>
    <a class="button open-favorites bottom-toolbar-standard" href="#"><i class="icon material-icons">stars</i></a>
    <i class="bottom-toolbar-audio material-icons md-only hm-audio-button-previous audio-button">skip_previous</i>	  
    <i class="bottom-toolbar-audio material-icons md-only hm-audio-button-start audio-button">play_circle_outline</i>
    <i class="bottom-toolbar-audio material-icons md-only hm-audio-button-pause audio-button">pause_circle_outline</i>
    <i class="bottom-toolbar-audio material-icons md-only hm-audio-button-stop audio-button">stop</i>
    <i class="bottom-toolbar-audio material-icons md-only hm-audio-button-next audio-button">skip_next</i>
  </div>
</div>
`;

function getTemplates(config) {
  const bottomToolbar = (config.theme && config.theme.bottomToolbar) ? bottomToolbarTemplate : '';
  const appTemplates = {
    "header": {
      "type": "template-partial",
      "source": `
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
  ${bottomToolbar}
  `
    },
    "page-header": {
      "type": "template",
      "source": `
  <div class="content-block page-header">
    <div class="header-title">{{page.title}}</div>
    <div class="checkbox-favorites" aria-role="checkbox" tabindex="0" aria-label="page bookmark">
      <input type="checkbox" value="0" id="{{state "pageInitId"}}"/>
      <label class="star-holder" for="{{state "pageInitId"}}">
        <img class="favorite-icon checked" src="./img/star-checked.svg"/>
        <img class="favorite-icon unchecked" src="./img/star-unchecked.svg"/>
      </label>
    </div>
  </div>
  `
    },
    "favorite_star": {
      "type": "template-partial",
      "source": `
  <div class="checkbox-favorites">
    <input type="checkbox" value="0" id="{{state "pageInitId"}}" aria-label="page bookmark"/>
    <label for="{{state "pageInitId"}}"><i class="icon material-icons favorite-icon unchecked">star_border</i><i class="icon material-icons favorite-icon checked">star</i></label>
   </div>
  `
    },
    "searchbar": {
      "type": "template-partial",
      "source": `
  <div class="searchbar-found global-search-results">
    <div class="list no-hairlines links-list list-block global-search virtual-list">
    </div>
  </div>
  `
    }
  }

  return appTemplates;
}




export {
  getTemplates
};