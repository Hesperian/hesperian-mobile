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

import { Dom7 } from "framework7/bundle";
import { logEvent } from "../analytics/analytics";
import { speak, stop, ttsIsPlaying } from "./audio";
import { getApp } from "../app";
import { setVoiceOverFocus, isActivationKey, KEYS } from "../accessibility/accessibility";
import { createFocusTrapHandler } from "../accessibility/focus-trap";

import "./audio.scss";

const $$ = Dom7;

let audioToolbarLastShown = false;

function getCurrentTTS(app) {
  if (!app) return null;

  const $pageEl = $$(app.views.main.router.currentPageEl);

  return $pageEl.data("hmTTS");
}

function isVisibleElement(el) {
  if (el.checkVisibility) {
    return el.checkVisibility();
  }
  const styles = window.getComputedStyle(el);
  return (
    styles.display !== "none" &&
    styles.visibility !== "hidden" &&
    styles.opacity !== "0" &&
    !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length)
  );
}

function getAudioBlocks($pageEl) {
  const allBlocks = $pageEl.find(".hm-audio-block");
  const blocks = [];
  
  allBlocks.each(function() {
    if (isVisibleElement(this)) {
      blocks.push(this);
    }
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
  ).each(function (link, _i) {
    $$(link).prepend(linkPreText);
  });

  $blockEl.find("li").each(function (li, _i) {
    $$(li).append("HM-SPEECH-PAUSE");
  });

  findIncludingRoot($blockEl, ".socialsharing").each(function (
    socialsharing,
    _i
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
  const app = getApp();
  const self = this;

  audioToolbarLastShown = show;

  // Update aria-expanded on the main audio button
  this.toolbar.find(".toolbar-audio-button-play").attr("aria-expanded", show ? "true" : "false");

  if (show) {
    app.toolbar.hide(this.toolbar, animate);
    this.audioToolbar.show();
    app.toolbar.show(this.audioToolbar, animate);

    // Focus the play button after toolbar is visible
    setTimeout(function() {
      const playBtn = self.audioToolbar.find(".hm-audio-button-start")[0];
      if (playBtn) {
        setVoiceOverFocus(playBtn);
      }
    }, 100);
  } else {
    app.toolbar.hide(this.audioToolbar, animate);
    this.audioToolbar.hide();
    this.stopBlock();
    app.toolbar.show(this.toolbar, animate);

    // Return focus to the main audio button
    const mainAudioBtn = this.toolbar.find(".toolbar-audio-button-play")[0];
    if (mainAudioBtn) {
      mainAudioBtn.focus();
    }
  }
};

hmTTS.prototype.setupToolbars = function () {
  var self = this;

  const toolbar = self.toolbar;
  
  // Audio toolbar is now part of the template, just find it
  var audioToolbar = this.$pageEl.find(".toolbar.toolbar-audio");
  self.audioToolbar = audioToolbar;
  this.showAudioToolbar(audioToolbarLastShown, false);

  toolbar.on("click", ".toolbar-audio-button-play", function (e) {
    self.showAudioToolbar(true);
  });

  // Keyboard support for main audio button
  toolbar.on("keydown", ".toolbar-audio-button-play", function (e) {
    if (isActivationKey(e)) {
      e.preventDefault();
      self.showAudioToolbar(true);
    }
  });

  // Keyboard support for all audio control buttons
  audioToolbar.on("keydown", ".audio-button", function (e) {
    if (isActivationKey(e)) {
      e.preventDefault();
      $$(this).click();
    }
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
  const self = this;
  function getActiveClass(rate) {
    if (rate === hmTTSRate) {
      return "hm-audio-rate-current button-fill color-gray";
    } else {
      return "";
    }
  }
  function getAriaChecked(rate) {
    return rate === hmTTSRate ? "true" : "false";
  }
  const audioStrings = this.initSpec.resources.get("audio.strings");
  const closeLabel = this.initSpec.resources.get("audio.ariaLabels.close") || "Close";

  var configSheetHTML = `<div class="sheet-modal hm-audio-config-sheet" role="dialog" aria-labelledby="hm-audio-rate-title" aria-modal="true">
    <div class="toolbar">
      <div class="toolbar-inner">
        <div class="title left" id="hm-audio-rate-title">${audioStrings["rateofspeech"]}</div>
        <div class="right"><a class="link sheet-close" role="button" tabindex="0" aria-label="${closeLabel}"><i class="material-icons" aria-hidden="true">close</i></a></div>
      </div>
    </div>
    <div class="sheet-modal-inner">
      <div class="page-content">
        <div class="list hm-audio-rate-list" role="radiogroup" aria-labelledby="hm-audio-rate-title">
          <ul>
            <li><a href="#" class="button hm-audio-rateoption-button ${getActiveClass(
              "0.25"
            )}" role="radio" aria-checked="${getAriaChecked("0.25")}" tabindex="0" data-hm-audio-rate="0.25">0.25x <span class="hm-rateoption-caption">(${
    audioStrings["slowspeedcaption"]
  })</span></a></li>
            <li><a href="#" class="button hm-audio-rateoption-button ${getActiveClass(
              "0.5"
            )}" role="radio" aria-checked="${getAriaChecked("0.5")}" tabindex="0" data-hm-audio-rate="0.5">0.5x</a></li>
            <li><a href="#" class="button hm-audio-rateoption-button ${getActiveClass(
              "0.75"
            )}" role="radio" aria-checked="${getAriaChecked("0.75")}" tabindex="0" data-hm-audio-rate="0.75">0.75x</a></li>
            <li><a href="#" class="button hm-audio-rateoption-button ${getActiveClass(
              "1.0"
            )}" role="radio" aria-checked="${getAriaChecked("1.0")}" tabindex="0" data-hm-audio-rate="1.0">1x</a></li>
            <li><a href="#" class="button hm-audio-rateoption-button ${getActiveClass(
              "1.25"
            )}" role="radio" aria-checked="${getAriaChecked("1.25")}" tabindex="0" data-hm-audio-rate="1.25">1.25x</a></li>
            <li><a href="#" class="button hm-audio-rateoption-button ${getActiveClass(
              "1.5"
            )}" role="radio" aria-checked="${getAriaChecked("1.5")}" tabindex="0" data-hm-audio-rate="1.5">1.5x</a></li>
            <li><a href="#" class="button hm-audio-rateoption-button ${getActiveClass(
              "1.75"
            )}" role="radio" aria-checked="${getAriaChecked("1.75")}" tabindex="0" data-hm-audio-rate="1.75">1.75x <span class="hm-rateoption-caption">(${
    audioStrings["fastspeedcaption"]
  })</span></a></li>
          </ul>
        </div>
      </div>
    </div>
  </div>`;

  let appConfig = this.initSpec.appConfig;
  const app = getApp();

  let configSheet = app.sheet.create({
    content: configSheetHTML /*,
    scrollToEl : '.hm-audio-rate-current'*/,
    on: {
      open: function (sheet) {
        const $el = sheet.$el;

        // Click handler for rate options
        $$(".hm-audio-rateoption-button", $el[0]).on(
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

            // Update visual state
            $el.find(".hm-audio-rate-current")
              .removeClass("hm-audio-rate-current")
              .removeClass("button-fill")
              .removeClass("color-gray");
            $$(this).addClass("hm-audio-rate-current button-fill color-gray");

            // Update aria-checked state
            $el.find(".hm-audio-rateoption-button").attr("aria-checked", "false");
            $$(this).attr("aria-checked", "true");

            if (ttsWasPlaying) {
              pageTTS.playBlock();
            }
          }
        );

        // Keyboard activation for rate options
        $el.find(".hm-audio-rateoption-button").on("keydown", function (e) {
          if (isActivationKey(e)) {
            e.preventDefault();
            $$(this).click();
          }
        });

        // Arrow key navigation within rate list
        $el.on("keydown", ".hm-audio-rateoption-button", function (e) {
          const $buttons = $el.find(".hm-audio-rateoption-button");
          const currentIndex = $buttons.indexOf(this);

          if (e.keyCode === KEYS.ARROW_UP) {
            e.preventDefault();
            const prevIndex = currentIndex > 0 ? currentIndex - 1 : $buttons.length - 1;
            $buttons[prevIndex].focus();
          } else if (e.keyCode === KEYS.ARROW_DOWN) {
            e.preventDefault();
            const nextIndex = currentIndex < $buttons.length - 1 ? currentIndex + 1 : 0;
            $buttons[nextIndex].focus();
          }
        });

        // Keyboard activation for close button
        $el.find(".sheet-close").on("keydown", function (e) {
          if (isActivationKey(e)) {
            e.preventDefault();
            configSheet.close();
          }
        });

        // Focus trap with Escape to close
        $el.on("keydown", createFocusTrapHandler(function($popup) {
          return $popup.find(".sheet-close");
        }));
      },
      opened: function (sheet) {
        // Focus the currently selected rate option
        const $selected = sheet.$el.find('[aria-checked="true"]');
        if ($selected.length) {
          $selected[0].focus();
        } else {
          const $firstOption = sheet.$el.find(".hm-audio-rateoption-button").eq(0);
          if ($firstOption.length) {
            $firstOption[0].focus();
          }
        }
      },
      closed: function (sheet) {
        // Return focus to the rate button
        const rateBtn = self.audioToolbar.find(".hm-audio-button-rate")[0];
        if (rateBtn) {
          rateBtn.focus();
        }
      },
    },
  });
  configSheet.open();
};

hmTTS.prototype.showPopOver = function (blockIndex, targetEl) {
  var self = this;
  const app = getApp();
  const playIcon = "&#xe039;";
  const closeLabel = this.initSpec.resources.get("audio.ariaLabels.close") || "Close";
  const dialogLabel = this.initSpec.resources.get("audio.ariaLabels.playFromHereDialog") || "Play from here";

  var popover = app.popover.create({
    targetEl: targetEl,
    content: `<div class="popover hm-audio-popover" role="dialog" aria-modal="true" aria-label="${dialogLabel}">
      <div class="popover-inner popover-close">
        <span class="hm-audio-popover-close" role="button" tabindex="0" aria-label="${closeLabel}"><i class="material-icons" aria-hidden="true">close</i></span>
        <div class="block">
        <a role="button" tabindex="0" class="popover-play-link-wrapper"><span class="popover-play-link"><i class="material-icons" aria-hidden="true">${playIcon}</i><span class="popover-play-caption">${this.initSpec.resources.get(
      "audio.strings.playfromhere"
    )}</span></span></a>
        </div>
      </div>
      </div>`,
    // Events
    on: {
      open: function (popover) {
        const $el = popover.$el;

        // Click handler for play link
        $el.find(".popover-play-link-wrapper").on("click", function (e) {
          self.stopBlock();
          self.currentBlockIndex = blockIndex;
          self.playBlock();
          self.showAudioToolbar(true);
          self.logEvent("playfromhere");
          popover.close();
        });

        // Keyboard activation for play link
        $el.find(".popover-play-link-wrapper").on("keydown", function (e) {
          if (isActivationKey(e)) {
            e.preventDefault();
            $$(this).click();
          }
        });

        // Click and keyboard activation for close button
        $el.find(".hm-audio-popover-close").on("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          popover.close();
        }).on("keydown", function (e) {
          if (isActivationKey(e)) {
            e.preventDefault();
            popover.close();
          }
        });

        // Focus trap with Escape to close
        $el.on("keydown", createFocusTrapHandler(function($popup) {
          return $popup.find(".hm-audio-popover-close");
        }));
      },
      opened: function (popover) {
        // Focus the play link when popover opens
        const playLink = popover.$el.find(".popover-play-link-wrapper")[0];
        if (playLink) {
          playLink.focus();
        }
      },
      closed: function (popover) {
        // Return focus to targetEl or audio toolbar
        if (targetEl && targetEl.focus) {
          targetEl.focus();
        }
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
    // Update aria-pressed state
    this.updatePlayPauseState(false);
    this.announceStatus("audio.ariaLabels.statusPaused");
  }
  stop();
};

hmTTS.prototype.stopBlock = function () {
  this.removeActiveBlockStyles();
  if (this.audioToolbar) {
    // Reset aria-pressed state on both buttons
    this.audioToolbar.find(".hm-audio-button-start").attr("aria-pressed", "false");
    this.audioToolbar.find(".hm-audio-button-pause").attr("aria-pressed", "false");
    this.announceStatus("audio.ariaLabels.statusStopped");
  }
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
    const app = getApp();
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

hmTTS.prototype.announceStatus = function (statusKey) {
  const statusMessage = this.initSpec.resources.get(statusKey);
  if (statusMessage) {
    this.audioToolbar.find(".hm-audio-status").text(statusMessage);
  }
};

hmTTS.prototype.updatePlayPauseState = function (isPlaying) {
  this.audioToolbar.find(".hm-audio-button-start").attr("aria-pressed", isPlaying ? "true" : "false");
  this.audioToolbar.find(".hm-audio-button-pause").attr("aria-pressed", isPlaying ? "false" : "true");
};

hmTTS.prototype.playBlock = function () {
  const currentBlock = this.currentBlock();
  const pauseWhenDone = $$(currentBlock).hasClass("hm-audio-pause-after");
  let textContent = this.getCurrentText();
  this.focusOnBlock(currentBlock);

  // Update aria-pressed state
  this.updatePlayPauseState(true);
  this.announceStatus("audio.ariaLabels.statusPlaying");

  this.speak({
    text: textContent,
    pauseWhenDone: pauseWhenDone,
  });
};

function initAudioButtons(initSpec, forceAudo) {
  // If the app requested forced audio for desktop testing, install a minimal mock TTS
  // so audio features can be tested without Cordova plugin. The mock simply logs text.
  if (forceAudo && !window.TTS) {
    window.TTS = {
      speak: function (context) {
        console.log("TTS SPEAK:", context && context.text ? context.text : context);
        return new Promise((resolve) => setTimeout(resolve, 200));
      },
      stop: function () {
        console.log("TTS STOP");
        return Promise.resolve();
      },
    };
    console.log('Hesperian: Mock TTS installed (forceAudo)');
  }

  hmTTSRate = initSpec.appConfig.get("hmTTSRate") || "1.0";
  $$(document).on("page:beforein", function (e, page) {
    new hmTTS().attachToPage(page, initSpec);
  });

  const app = initSpec.app;
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
      const app = getApp();
      const pageTTS = getCurrentTTS(app);
      if (pageTTS) {
        pageTTS.pauseBlock();
      }
    },
    false
  );
}

export { initAudioButtons };
