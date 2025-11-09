/*
 *  socialsharing
 *
 *  Handles social sharing plugin
 *  https://github.com/EddyVerbruggen/SocialSharing-PhoneGap-Plugin
 *
 */

import Template7 from "template7";
import { Dom7 } from "framework7/bundle";
import "./socialsharing.scss";
let $$ = Dom7;

function initializeSocialSharing(app, appConfig, resources) {
  const sharingContent = Template7.compile(`
    {{#if file}}<img src="{{file}}" alt="{{alt}}" />{{/if}}
    <div class="prompt"><span class="prompt-text">{{prompt}}</span><i class="sharing-icon"></i></div>
  `);

  $$(document).on("page:init", function (e) {
    const pageEl = e.detail.pageEl;
    const defaultPrompt = resources.get("socialsharing.sharethis");

    $$(".socialsharing", pageEl).each(function () {
      const $el = $$(this);
      const file = $$(this).data("file");
      const alt = $$(this).data("alt");
      const prompt = $$(this).data("prompt");
      $el.html(
        sharingContent({
          file: prompt ? null : file,
          alt: alt,
          prompt: prompt || defaultPrompt,
        })
      );
    });
  });

  $$(document).on("click", ".socialsharing", function (e_) {
    const socialsharing = window.plugins && window.plugins.socialsharing;
    const analytics =
      window.cordova &&
      window.cordova.plugins &&
      window.cordova.plugins.firebase &&
      window.cordova.plugins.firebase.analytics;

    const file = $$(this).data("file");
    const subject = $$(this).data("subject");
    const event = $$(this).data("ga-event") || "socialsharing";
    const url = $$(this).data("url");

    const onSuccess = function (result) {
      $$("#app").removeClass("social-sharing-open");
      analytics.logEvent(event, {
        file: file,
        url: url,
        completed: result.completed,
        app: result.app,
      });
    };

    const onError = function (msg_) {
      $$("#app").removeClass("social-sharing-open");
    };

    let options = {
      message: prompt, // not supported on some apps (Facebook, Instagram)
      subject: subject, // e.g. for email
    };

    if (file) {
      options.files = ["www/" + file];
    }

    if (url) {
      options.url = url;
    }

    if (socialsharing) {
      $$("#app").addClass("social-sharing-open");
      socialsharing.shareWithOptions(options, onSuccess, onError);
    }
  });
}

export { initializeSocialSharing };
