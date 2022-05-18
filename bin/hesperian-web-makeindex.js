#!/usr/bin/env node
/*
    Create the index.html file

    Run from the top level of the cordova folder.
    Pass in the path to the appConfig.json file.
    usage:
    hesperian-web-makeindex mode(web|app) appConfig.json(path) template-dir
*/
const fs = require("fs");
const handlebars = require('handlebars');

const mode = process.argv[2];
const contextFile = process.argv[3];
const templateDir = process.argv[4];
function getFile(path) {
    let text = '';
 
    if (path && fs.existsSync(path)) {
        text =  fs.readFileSync(path, "utf-8");
    }

    return text;
}

const appContextData = getFile(contextFile);
const appContext = JSON.parse(appContextData);
const appSpecifLibs = getFile(`${templateDir}/app-libs.html`);
const webAppHeader = getFile(`${templateDir}/app-header.html`);

let modeSpecific = '';
let appHeader = '';

if (mode === "web") {

    const firebaseConfig = JSON.stringify(appContext.firebaseConfig)
    modeSpecific = `
<script type="module">
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.8.1/firebase-app.js";
import { getAnalytics, logEvent, setCurrentScreen } from "https://www.gstatic.com/firebasejs/9.8.1/firebase-analytics.js";

const app = initializeApp(${firebaseConfig});
window.firebase = {
    analytics: getAnalytics(app),
    logEvent: logEvent,
    setCurrentScreen: setCurrentScreen
}

</script>
`;   
    appHeader = webAppHeader;
} else {
    modeSpecific = `<script type="text/javascript" charset="utf-8" src="cordova.js"></script>`;
}

let context = {
    webmode: mode === 'web',
    appContext: appContext,
    appSpecific: appSpecifLibs,
    appHeader: appHeader,
    modeSpecific: modeSpecific
}

const appHtml = `
<div id="app">
    <div class="statusbar"></div>

    <div class="panel panel-left panel-reveal theme-light">
    <div class="view">
        <div class="page">
        <div id="sidelinks" class="page-content"></div>
        </div>
    </div>
    </div>

    <div class="panel panel-right panel-reveal theme-light">
    <div class="view">
        <div class="page">
        <div id="settings" class="page-content"></div>
        </div>
    </div>
    </div>

    <div class="views">
    <div id="view-main" class="view view-main">
        <div class="searchbar-backdrop"></div>
    </div>
    </div>
</div>
`;

const index = `
<!DOCTYPE html>
<html>

<head>
  <meta http-equiv="Content-Security-Policy" content="default-src * 'self' 'unsafe-inline' 'unsafe-eval' data: gap: content: www.google-analytics.com *.hesperian.org">
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=2, minimum-scale=1, user-scalable=yes, minimal-ui, viewport-fit=cover">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="theme-color" content="#2196f3">
  <meta name="format-detection" content="telephone=no">
  <meta name="msapplication-tap-highlight" content="no">
  <title>{{{appContext.description}}}</title>
  <link href="main.css" rel="stylesheet"></head>
{{#if webmode}}
<style>
body {
    display: flex;
    flex-direction: column;
}
#app-header {
    display: flex;
    flex-direction: column;
    align-self: center;
    text-align: center;
}
#app-header strong {
    font-size: 125%;
}
#app.framework7-root {
    border: 3px solid black;
    border-radius: 10px;
    max-width: 768px;
    align-self: center;
}
</style>
{{/if}}
</head>

<body>
  {{{appHeader}}}
  ${appHtml}

  <script type="text/javascript" charset="utf-8" src="lib/bootstrap.js"></script>
  {{{appSpecific}}}
  {{{modeSpecific}}}
  <script type="text/javascript" src="main.js"></script>
</body>

</html>
`;

const indexTemplate = handlebars.compile(index);
const output = indexTemplate(context);


fs.writeFileSync(1, output);
