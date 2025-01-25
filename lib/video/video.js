/*
 *  socialsharing
 *
 *  Handles social sharing plugin
 *  https://github.com/EddyVerbruggen/SocialSharing-PhoneGap-Plugin
 *
 */

import { Dom7 } from "framework7/framework7.esm.bundle.js";
import "./video.scss";
let $$ = Dom7;

function initializeVideo(initSpec) {

  $$(document).on("page:init", function (e) {
    const pageEl = e.detail.pageEl;
    $$(".hm-video-container video", pageEl).each(function () {
        if(this.textTracks.length > 0) {
            this.textTracks[0].mode = 'showing';
        }
    });
  });
}

export { initializeVideo };
