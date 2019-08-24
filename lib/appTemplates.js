/*
  appTemplates

  HTML Template7 Templates

*/



const appTemplates = {
  "header": {
    "type": "template-partial",
    "source": `
  <div class="navbar">
  <div class="navbar-inner navbar-top">
    <div class="left">
      <a href="#" class="link icon-only panel-open" data-panel="left">
        <i class="icon material-icons">menu</i>
      </a>
    </div>
    <div class="title"><img src="img/HHG-logo-small-circle.png" class="center" /></div>
    <div class="right">
      <a href="#" class="link icon-only panel-open" data-panel="right">
        <i class="icon f7-icons">gear_fill</i>
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
<div class="toolbar toolbar-bottom-md app-toolbar">
  <div class="toolbar-inner">
    <a class="button" href="/"><i class="icon material-icons">home</i></a>
    <a class="button" href="/pages/FAQ/"><i class="icon material-icons">help</i></a>
    <a class="button open-favorites" href="#"><i class="icon material-icons">stars</i></a>
  </div>
</div>
`
  },
  "page-header": {
    "type": "template",
    "source": `
<div class="content-block page-header">
  <div class="header-title">{{page.title}}</div>
  <div class="checkbox-favorites">
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
  <input type="checkbox" value="0" id="{{state "pageInitId"}}"/>
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

export {
  appTemplates
};