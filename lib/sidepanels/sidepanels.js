/*
 *  Sidepanels
 * 
 */

import Template7 from 'template7';
import { Dom7 } from 'framework7/bundle';
import { logEvent } from '../analytics/analytics';

import './sidepanels.scss';

const $$ = Dom7;

const settingsContent = Template7.compile(`
<div id="language-choices" class="list list-block">
  <ul>

    <li class="panel-close settings-header">
    <a href="/pages/J2-About_us" class="item-link item-content panel-close">
      <div class="item-media">
        <i class="icon material-icons">people</i>
      </div>
      <div class="item-inner">
        <div class="item-title">{{settings.about.title}}</div>
      </div>
    </a>
    </li>

    {{#if settings.privacy}}
    <li class="panel-close settings-header">
      <a href="/pages/privacy" class="item-link item-content panel-close">
        <div class="item-media">
          <i class="icon material-icons">info</i>
        </div>
        <div class="item-inner">
          <div class="item-title">{{settings.privacy.title}}</div>
        </div>
      </a>
    </li>
    {{/if}}

    <li class="panel-close settings-header">
      <a href="/pages/J4-help" class="item-link item-content panel-close">
        <div class="item-media">
          <i class="icon material-icons">help_outline</i>
        </div>
        <div class="item-inner">
          <div class="item-title">{{settings.help.title}}</div>
        </div>
      </a>
    </li>

    {{#if settings.settings}}
    <li class="panel-close settings-header">
      <a href="/pages/J5-settings" class="item-link item-content panel-close">
        <div class="item-media">
          <i class="icon material-icons">settings_applications</i>
        </div>
        <div class="item-inner">
          <div class="item-title">{{settings.settings.title}}</div>
        </div>
      </a>
    </li>
    {{/if}}

    <li class="panel-close">
      <a href="#" data-subject="{{settings.sharing.subject}}" data-url="{{settings.sharing.url}}" data-ga-event="appsharing" class="socialsharing item-link item-content settings-header panel-close">
        <div class="item-media">
          <i class="sharing-icon"></i>
        </div>
        <div class="item-inner">
          <div class="item-title">{{settings.sharing.title}}</div>
        </div>
      </a>
    </li>

    <li id="settings-language-header" class="item-content settings-header">
    <div class="item-media">
      <i class="icon material-icons">language</i>
    </div>
    <div class="item-inner">
      <div class="item-title">{{settings.languages.title}}</div>
    </div>
  </li>
  {{#each items}}
  <li class="panel-close">
    <a href="#" data-lang="{{language_code}}" class="language-switch item-link item-content panel-close {{classes}}">
      <div class="item-inner">
        <div class="item-title">{{language}}</div>
      </div>
    </a>
  </li>
  {{/each}}
  </ul>
</div>
`);


const sidelinksContent = Template7.compile(`
<div class="sidelinks list list-block">
  <ul>
    {{#each items}}
    <li class="panel-close">
      <a href="{{link}}" class="item-link item-content panel-close">
        {{#if media}}
        <div class="item-media">
          <img class="icon panel-icon" src="{{media}}" alt=""></img>
        </div>
        {{/if}}
        <div class="item-inner">
          <div class="item-title">{{title}}</div>
        </div>
      </a>
    </li>
    {{/each}}
  </ul>
</div>
`);

const pageIcons = {
  '/': 'img/home-button_pink.png'
};

function handlePanelKeydown(e, app) {
  const $panel = $$(this);
  
  if (e.keyCode === 27) { // Escape
    app.panel.close();
    e.preventDefault();
    return;
  }

  if (e.keyCode === 9) { // Tab
    const focusableElements = $panel.find('a.item-link');
    if (focusableElements.length === 0) {
        e.preventDefault();
        return;
    }

    const firstTabStop = focusableElements[0];
    const lastTabStop = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstTabStop) {
        e.preventDefault();
        lastTabStop.focus();
      }
    } else {
      if (document.activeElement === lastTabStop) {
        e.preventDefault();
        firstTabStop.focus();
      }
    }
  }
}

function updateSidePanels(app, appConfig, resources) {
  // Get a link to the current page, but for a different locale
  function getCurrentPageLinkForLocale(language_code) {
    var currentRoute = app.views.main.router.currentRoute;
    const path = currentRoute.path.replace(/^\/locales\/[^/]*/, ''); // trim any absolute locale path

    var link = `/locales/${language_code}${path}`;

    return link;
  }

  function updateSettings() {
    const settings$ = $$('#settings');
    let context = {};
    context.settings = resources.get('settings');
    context.items = resources.getLanguages().map(item => {
      const link = getCurrentPageLinkForLocale(item.language_code);

      return {
        link: link,
        classes: (appConfig.locale() === item.language_code) ? 'current-locale' : '',
        language: item.language,
        language_code: item.language_code
      }
    });

    settings$.html(settingsContent(context));
  }

  function updateSideLinks() {
    const sidelinks$ = $$('#sidelinks');

    let context = {};
    context.items = resources.get('sidelinks').map(item => ({
      media: pageIcons[item.link],
      link: item.link,
      title: item.title
    }));

    sidelinks$.html(sidelinksContent(context));
  }

  updateSettings();
  updateSideLinks();
}

function initializeSidePanels(app, _appConfig, _resources) {
  // Initialize aria-hidden state
  $$('.panel').attr('aria-hidden', 'true');

  app.on('panelOpened', function (panel) {
    logEvent('menu', {
      side: panel.side
    });

    const $panel = panel.$el;
    $panel.attr('aria-hidden', 'false');
    
    // Focus first element
    const focusable = $panel.find('a.item-link');
    if (focusable.length > 0) {
        focusable[0].focus();
    }
    
    // Attach keydown handler
    $panel.on('keydown', function(e) {
        handlePanelKeydown.call(this, e, app);
    });
  });

  app.on('panelClosed', function (panel) {
    /*
    logEvent('sidepanelclosed', {
      side: panel.side
    });
    */
    const $panel = panel.$el;
    
    // Return focus to main view if it's still in the panel
    if ($panel[0].contains(document.activeElement)) {
        // Try to find the toggle button
        const side = panel.side || 'left';
        let $toggle = $$(`.panel-open[data-panel="${side}"]`);
        
        if ($toggle.length === 0) {
            $toggle = $$('.panel-open');
        }
        
        // Filter for visible ones
        let visibleToggle = [];
        for (let i = 0; i < $toggle.length; i++) {
            const el = $toggle[i];
            if ($$(el).css('display') !== 'none' && $$(el).css('visibility') !== 'hidden') {
                visibleToggle.push(el);
            }
        }

        if (visibleToggle.length > 0) {
            visibleToggle[0].focus();
        } else {
            // Fallback to active page
            const $currentPage = $$('.view-main .page-current');
            if ($currentPage.length > 0) {
                $currentPage.find('.page-content').focus();
            } else {
                document.activeElement.blur();
            }
        }
    }

    $panel.attr('aria-hidden', 'true');
    $panel.off('keydown');
  });
}

export {
  updateSidePanels,
  initializeSidePanels
};