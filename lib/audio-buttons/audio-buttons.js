/*
 * Support audio tts feature.
 *
 * Important CSS classes
 *   hm-audio-only - only audio, not visible
 *   hm-no-audio - suppress audio
 *   hm-audio-pause-after - after block, pause audio
 *   <span data-audio="spoken">visibile<span>
 *
 */

import { Dom7 } from "framework7/framework7.esm.bundle.js";
import { logEvent } from "../analytics/analytics";
import { speak, stop, ttsIsPlaying } from "./audio";

import "./audio.scss";

const $$ = Dom7;

let audioToolbarLastShown = false;

function getCurrentTTS(app) {
  if (!app) return null;

  const $pageEl = $$(app.views.main.router.currentPageEl);

  return $pageEl.data("hmTTS");
}

function isVisibleElement(e) {
  return !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
}

function getAudioBlocks($pageEl) {
  const blocks = $pageEl.find(".hm-audio-block").filter(function () {
    return isVisibleElement(this);
  });

  let ret = [];

  blocks.forEach((block) => {
    const accordion = $$(block).closest(".accordion-item");
    if (accordion && $$(accordion).find(".hm-audio-block").eq(0).is(block)) {
      ret.push($$(accordion).find(".item-link")[0]);
    }
    ret.push(block);
  });
  return ret;
}

$$(document).on("appReady", function (e) {
  const app = e.detail;
  app.on("speechStopped", function (notification) {
    const pageTTS = getCurrentTTS(app);
    const pauseWhenDone = notification.context.pauseWhenDone;

    if (pageTTS) {
      if (pauseWhenDone) {
        // Move to next block, but don't start playing.
        pageTTS.removeActiveBlockStyles();
        if (pageTTS.currentBlockIndex < pageTTS.audioBlocks.length) {
          pageTTS.currentBlockIndex++;
        }
        pageTTS.audioToolbar.removeClass("hm-audio-playing");
      } else {
        pageTTS.playNextBlock();
      }
    }
  });

  /*
  app.on('sheetOpen', function(_notification) {
    const pageTTS = getCurrentTTS(app);

    if (pageTTS) {
      pageTTS.stopBlock(true);
    }
  });
*/

  app.on("pageStructureChanged", function (page) {
    const pageTTS = getCurrentTTS(app);

    if (pageTTS) {
      pageTTS.stopBlock(true);
      pageTTS.resetPage(page);
    }
  });

  // Pause when the cordova app goes into the background
  document.addEventListener(
    "pause",
    function () {
      const pageTTS = getCurrentTTS(window.app);
      if (pageTTS) {
        pageTTS.pauseBlock();
      }
    },
    false
  );
});

var hmTTSRate;

function hmTTS() {
  this.tts = window.TTS;
  this.lastTapTime = 0;
  this.lastTapElement;
  this.enabled = false;
}

hmTTS.prototype.currentBlock = function () {
  if (this.currentBlockIndex < 0) {
    return this.$pageEl.find(".page-header")[0];
  }
  return this.audioBlocks[this.currentBlockIndex];
};

hmTTS.prototype.logEvent = function (type, data) {
  if (!data) {
    data = {};
  }
  data.type = type;
  data.locale = this.initSpec.appConfig.locale();

  logEvent("audio", data);
};

function audioEnabledLocale(initSpec) {
  const code = initSpec.appConfig.locale();
  const lang = initSpec.appData.localizations.find(
    (l) => code === l.language_code
  );
  return lang && lang.enable_audio;
}

hmTTS.prototype.resetPage = function (pageEl) {
  this.pageEl = pageEl;
  this.$pageEl = $$(pageEl);
  this.toolbar = this.$pageEl.find(".toolbar.toolbar-bottom-md.app-toolbar");
  this.audioBlocks = getAudioBlocks(this.$pageEl);
  this.pageTitle = this.$pageEl.data("title");
  this.firstIndex = this.pageTitle ? -1 : 0;
  this.currentBlockIndex = this.firstIndex;

  this.lastTapTime = 0;
  this.lastTapElement = undefined;

  this.$pageEl.data("hmTTS", this);
  this.enabled =
    audioEnabledLocale(this.initSpec) && this.tts && this.audioBlocks.length;

  if (this.enabled) {
    this.toolbar.addClass("hm-audio-enabled");
  } else {
    this.toolbar.removeClass("hm-audio-enabled");
  }
};

hmTTS.prototype.attachToPage = function (page, initSpec) {
  var self = this;
  this.initSpec = initSpec;
  this.resetPage(page.el);

  if (!this.enabled) {
    return;
  }

  $$(".hm-audio-block", self.pageEl).prepend(
    '<div class="hm-audio-block-item-top"></div>'
  );

  $$(".hm-audio-block", self.pageEl).on("click", function (e) {
    var timeElapsed = new Date().getTime() - self.lastTapTime;
    if (timeElapsed < 300) {
      var blockIndex = self.audioBlocks.indexOf(this);
      self.showPopOver(blockIndex, this);
    }
    self.lastTapTime = new Date().getTime();
  });

  this.setupToolbars();

  $$(document).on("page:beforein", self.$pageEl, function (_e) {
    self.showAudioToolbar(audioToolbarLastShown, false);
  });

  $$(document).on("page:beforeout", self.$pageEl, function (_e) {
    if (self.isEnabled() && window.TTS) {
      self.stopBlock();
    }
  });

  // When switching languages, we don't get a page:beforeout. We do get some notice that our page is going away from the DOM.
  $$(document).on("page:beforeremove", self.$pageEl, function (_e) {
    if (self.isEnabled() && window.TTS) {
      self.stopBlock();
    }
  });

  return this;
};

hmTTS.prototype.isEnabled = function () {
  return this.enabled;
};

// $element.find(), but include root element
function findIncludingRoot($root, selector) {
  let $found = $root.find(selector);

  // https://developer.mozilla.org/en-US/docs/Web/API/Element/matches goes back to Andriod 4.4
  $root.each(function () {
    if (this.matches(selector)) {
      $found.add($$(this));
    }
  });

  return $found;
}

hmTTS.prototype.convertBlockToText = function (block) {
  const clone = block.cloneNode(true);
  const $blockEl = $$(clone);

  $blockEl.find(".hm-no-audio").remove();

  $blockEl.find("[data-audio]").each(function () {
    const audioText = $$(this).data("audio");
    $$(this).text(audioText);
  });

  // Input elements hide their content in the value attribute
  findIncludingRoot($blockEl, "input").each(function () {
    if ($$(this).attr("type") !== "checkbox") {
      const inputText = $$(this).val();
      const span = $$("<span></span>").text(inputText);
      $$(this).append(span);
    }
  });

  const linkPreText = `<span>${this.initSpec.resources.get(
    "audio.strings.clickhere"
  )} </span>`;
  findIncludingRoot(
    $blockEl,
    ".button-link, .external, .inline-link, :not(.accordion-item) .item-link"
  ).each(function (_i, link) {
    $$(link).prepend(linkPreText);
  });

  $blockEl.find("li").each(function (_i, li) {
    $$(li).append("HM-SPEECH-PAUSE");
  });

  findIncludingRoot($blockEl, ".socialsharing").each(function (
    _i,
    socialsharing
  ) {
    const subject = $$(socialsharing).data("subject");
    if (subject) {
      $$(socialsharing).append("HM-SPEECH-PAUSE" + subject);
    }
  });

  let textContent = clone.textContent;

  const substitutions = this.initSpec.resources.get("audio.substitutions");

  if (substitutions) {
    const regexString = Object.keys(substitutions)
      .map((v) => `\\b${v}\\b`)
      .join("|");

    const re = new RegExp(regexString, "gi");

    textContent = textContent.replace(re, function (match) {
      return substitutions[match];
    });
  }

  return textContent.replace(/HM-SPEECH-PAUSE/g, "\n\n");
};

hmTTS.prototype.showAudioToolbar = function (show, animate) {
  animate = undefined === animate ? true : !!animate;

  audioToolbarLastShown = show;

  if (show) {
    app.toolbar.hide(this.toolbar, animate);
    app.toolbar.show(this.audioToolbar, animate);
  } else {
    app.toolbar.hide(this.audioToolbar, animate);
    this.stopBlock();
    app.toolbar.show(this.toolbar, animate);
  }
};

hmTTS.prototype.setupToolbars = function () {
  var self = this;

  //use unicode codepoints for icons for Android 4.4 and earlier.
  //TODO: this should not be necessary as all other icons work without it.
  const playIcon = "&#xe039;";
  const pauseIcon = "&#xe036;";
  const nextIcon = "&#xe044;";
  const previousIcon = "&#xe045;";
  const audioIcon = "&#xe050;";
  //const avTimerIcon = "&#xe01b";
  const avTimerIcon = "&#xe5d4"; //more-vert

  const audioToolbarTemplate = `
    <div class="toolbar toolbar-bottom-md app-toolbar toolbar-audio">
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
    `;

  const toolbar = self.toolbar;
  toolbar[0].insertAdjacentHTML("afterend", audioToolbarTemplate);

  var audioToolbar = this.$pageEl.find(".toolbar.toolbar-audio");
  self.audioToolbar = audioToolbar;
  this.showAudioToolbar(audioToolbarLastShown, false);

  toolbar.on("click", ".toolbar-audio-button-play", function (e) {
    self.showAudioToolbar(true);
  });

  audioToolbar.on("click", ".hm-audio-button-start", function (e) {
    self.playBlock();
    self.logEvent("start");
  });

  audioToolbar.on("click", ".hm-audio-button-pause", function (e) {
    self.pauseBlock();
    self.logEvent("pause");
  });

  audioToolbar.on("click", ".hm-audio-button-stop", function (e) {
    self.stopBlock();
    self.currentBlockIndex = self.firstIndex;
    self.logEvent("stop");
  });

  audioToolbar.on("click", ".hm-audio-button-next", function (e) {
    self.stopBlock();

    self.currentBlockIndex = Math.min(
      self.currentBlockIndex,
      self.audioBlocks.length
    );
    self.currentBlockIndex = Math.max(self.currentBlockIndex, self.firstIndex);

    if (self.currentBlockIndex < self.audioBlocks.length) {
      self.currentBlockIndex++;
    }

    self.playBlock();
    self.logEvent("next");
  });

  audioToolbar.on("click", ".hm-audio-button-previous", function (e) {
    self.stopBlock();

    // clamp
    self.currentBlockIndex = Math.min(
      self.currentBlockIndex,
      self.audioBlocks.length - 1
    );
    self.currentBlockIndex = Math.max(self.currentBlockIndex, self.firstIndex);

    // decrement
    if (self.currentBlockIndex > 0) {
      self.currentBlockIndex--;
    }

    if (self.currentBlockIndex === 0) {
      self.currentBlockIndex = self.firstIndex;
    }

    self.playBlock();
    self.logEvent("previous");
  });

  audioToolbar.on("click", ".hm-audio-button-close", function (e) {
    self.showAudioToolbar(false);
    self.logEvent("close");
  });

  audioToolbar.on("click", ".hm-audio-button-rate", function (e) {
    self.showConfigSheet();
    self.logEvent("rate");
  });
};

hmTTS.prototype.showConfigSheet = function () {
  function getActiveClass(rate) {
    if (rate === hmTTSRate) {
      return "hm-audio-rate-current button-fill color-gray";
    } else {
      return "";
    }
  }
  const audioStrings = this.initSpec.resources.get("audio.strings");

  var configSheetHTML = `<div class="sheet-modal hm-audio-config-sheet">
    <div class="toolbar">
      <div class="toolbar-inner">
        <div class="title left">${audioStrings["rateofspeech"]}</div>
        <div class="right"><a class="link sheet-close"><i class="material-icons">close</i></a></div>
      </div>
    </div>
    <div class="sheet-modal-inner">
      <div class="page-content">
        <div class="list hm-audio-rate-list">
          <ul>
            <li><a href="#" class="button hm-audio-rateoption-button ${getActiveClass(
              "0.25"
            )}" data-hm-audio-rate="0.25">0.25x <span class="hm-rateoption-caption">(${
    audioStrings["slowspeedcaption"]
  })</span></a></li>
            <li><a href="#" class="button hm-audio-rateoption-button ${getActiveClass(
              "0.5"
            )}"  data-hm-audio-rate="0.5">0.5x</a></li>
            <li><a href="#" class="button hm-audio-rateoption-button hm-audio-rateoption-button ${getActiveClass(
              "0.75"
            )}" data-hm-audio-rate="0.75">0.75x</a></li>
            <li><a href="#" class="button hm-audio-rateoption-button ${getActiveClass(
              "1.0"
            )}"  data-hm-audio-rate="1.0">1x</a></li>
            <li><a href="#" class="button hm-audio-rateoption-button ${getActiveClass(
              "1.25"
            )}" data-hm-audio-rate="1.25">1.25x</a></li>
            <li><a href="#" class="button hm-audio-rateoption-button ${getActiveClass(
              "1.5"
            )}"  data-hm-audio-rate="1.5">1.5x</a></li>
            <li><a href="#" class="button hm-audio-rateoption-button ${getActiveClass(
              "1.75"
            )}" data-hm-audio-rate="1.75">1.75x <span class="hm-rateoption-caption">(${
    audioStrings["fastspeedcaption"]
  })</span></a></li>
          </ul>
        </div>
      </div>
    </div>
  </div>`;

  let appConfig = this.initSpec.appConfig;

  let configSheet = app.sheet.create({
    content: configSheetHTML /*,
    scrollToEl : '.hm-audio-rate-current'*/,
    on: {
      open: function (sheet) {
        $$(".hm-audio-rateoption-button", sheet.$el[0]).on(
          "click",
          function (e) {
            const pageTTS = getCurrentTTS(app);
            var ttsWasPlaying = false;
            if (pageTTS && ttsIsPlaying()) {
              ttsWasPlaying = true;
              pageTTS.stopBlock();
            }
            hmTTSRate = this.dataset["hmAudioRate"];
            appConfig.set("hmTTSRate", hmTTSRate);
            sheet.$el
              .find(".hm-audio-rate-current")
              .removeClass("hm-audio-rate-current")
              .removeClass("button-fill")
              .removeClass("color-gray");
            $$(this).addClass("hm-audio-rate-current button-fill color-gray");
            if (ttsWasPlaying) {
              pageTTS.playBlock();
            }
            //app.sheet.close('.hm-audio-config-sheet');
          }
        );
      },
    },
  });
  configSheet.open();
};

hmTTS.prototype.showPopOver = function (blockIndex, targetEl) {
  var self = this;
  const playIcon = "&#xe039;";
  var popover = app.popover.create({
    targetEl: targetEl,
    content: `<div class="popover hm-audio-popover">
      <div class="popover-inner popover-close">
        <span class="hm-audio-popover-close"><i class="material-icons">close</i></span>
        <div class="block">
        <a><span class="popover-play-link"><i class="material-icons">${playIcon}</i><span class="popover-play-caption">${this.initSpec.resources.get(
      "audio.strings.playfromhere"
    )}</span></span></a>
        </div>
      </div>
      </div>`,
    // Events
    on: {
      open: function (popover) {
        popover.$el.find(".popover-play-link").on("click", function (e) {
          self.stopBlock();
          self.currentBlockIndex = blockIndex;
          self.playBlock();
          app.toolbar.hide(self.toolbar);
          app.toolbar.show(self.audioToolbar);
          self.logEvent("playfromhere");
        });
      },
    },
  });

  var f7popoverResize = popover.resize;
  popover.resize = function () {
    f7popoverResize.apply(this, arguments);
    var $el = popover.$el;
    var top = parseInt($el.css("top"));
    if (top > window.innerHeight - 48) {
      var newTop = top - 50;
      $el.css("top", `${newTop}px`);
    }
  };

  popover.open();
};

hmTTS.prototype.removeActiveBlockStyles = function () {
  $$(this.currentBlock()).removeClass("hm-active-block");
};

hmTTS.prototype.setActiveBlockStyles = function () {
  $$(this.currentBlock()).addClass("hm-active-block");
};

hmTTS.prototype.bestLocaleForLanguage = function (baseLocale) {
  const browserLocale = window.navigator.language;

  const firstComponentMatch = /^[^-]*/.exec(browserLocale);
  const firstComponent = firstComponentMatch && firstComponentMatch[0];
  if (
    firstComponent &&
    firstComponent.toLowerCase() === baseLocale.toLowerCase()
  ) {
    // In fact, plugin can do better than browserLocale, e.g. on iOS return es-MX when set in prefs,
    // rather than webviews more generic es-XL
    return null;
  }

  return baseLocale;
};

hmTTS.prototype.speak = function (context) {
  const self = this;
  self.audioToolbar.addClass("hm-audio-playing");

  if (!context.locale) {
    const updatedLocale = self.bestLocaleForLanguage(
      this.initSpec.appConfig.locale()
    );
    if (updatedLocale) {
      context.locale = updatedLocale; // iOS plugin crashes if locale null
    }
  }

  context.rate = parseFloat(hmTTSRate);

  speak(context);
};

hmTTS.prototype.pauseBlock = function () {
  if (this.audioToolbar) {
    this.audioToolbar.removeClass("hm-audio-playing");
  }
  stop();
};

hmTTS.prototype.stopBlock = function () {
  this.removeActiveBlockStyles();
  this.pauseBlock();
};

hmTTS.prototype.focusOnBlock = function (block) {
  if (!block) {
    return;
  }

  var accordion = $$(block).closest(".accordion-item");
  var accordionToOpen = false;

  if (accordion.length) {
    if (!$$(accordion).hasClass("accordion-item-opened")) {
      accordionToOpen = true;
    }
  }

  function scrollToBlock() {
    const $scrollTopSentinel = $$(block).children(".hm-audio-block-item-top");
    if ($scrollTopSentinel.length) {
      const scrollTopSentinel = $scrollTopSentinel[0];
      const rect = scrollTopSentinel.getBoundingClientRect();

      var scrollOptions = true;
      var isSmoothScrollSupported =
        "scrollBehavior" in document.documentElement.style;

      if (isSmoothScrollSupported) {
        scrollOptions = {
          behavior: "smooth",
          block: "start",
          inline: "nearest",
        };
      }
      // TODO : does F7 provide access to the page-navigaton-height as it does for css?
      if (rect.top < 104) {
        if (!accordionToOpen) {
          scrollTopSentinel.scrollIntoView(scrollOptions);
        }
        //self.page.$el.find("div.page-content")[0].scrollTop -=104;
        // account for top nav and bottom toolbar
      } else if (rect.top > window.innerHeight - 208) {
        scrollTopSentinel.scrollIntoView(scrollOptions);
      }
    }
  }

  if (accordionToOpen) {
    $$(accordion).once("accordion:opened", function () {
      setTimeout(scrollToBlock, 0);
    });
    app.accordion.open(accordion);
  } else {
    scrollToBlock();
  }
  this.setActiveBlockStyles();
};

hmTTS.prototype.getCurrentText = function () {
  const audioStrings = this.initSpec.resources.get("audio.strings");
  let textContent = "";
  if (this.currentBlockIndex >= this.audioBlocks.length) {
    textContent = audioStrings["pageend"];
  } else if (this.currentBlockIndex < 0) {
    textContent = this.pageTitle;
  } else {
    textContent = this.convertBlockToText(this.currentBlock());
  }

  return textContent;
};

hmTTS.prototype.playNextBlock = function () {
  const self = this;
  self.removeActiveBlockStyles();

  if (self.currentBlockIndex < self.audioBlocks.length) {
    self.currentBlockIndex++;
    self.playBlock();
  } else {
    self.audioToolbar.removeClass("hm-audio-playing");
  }
};

hmTTS.prototype.playBlock = function () {
  const currentBlock = this.currentBlock();
  const pauseWhenDone = $$(currentBlock).hasClass("hm-audio-pause-after");
  let textContent = this.getCurrentText();
  this.focusOnBlock(currentBlock);

  this.speak({
    text: textContent,
    pauseWhenDone: pauseWhenDone,
  });
};

function initAudioButtons(initSpec) {
  hmTTSRate = initSpec.appConfig.get("hmTTSRate") || "1.0";
  $$(document).on("page:init", function (e, page) {
    new hmTTS().attachToPage(page, initSpec);
  });
}

export { initAudioButtons };
