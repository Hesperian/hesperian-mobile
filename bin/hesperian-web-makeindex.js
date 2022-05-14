#!/usr/bin/env node
/*
    Create cordova config.xml file from app configuration.

    Run from the top level of the cordova folder.
    Pass in the path to the appConfig.json file.
*/
const fs = require("fs");
const contextFile = process.argv[2];
const indexFile = process.argv[3];
const indexFileData = fs.readFileSync(indexFile, "utf-8");
const contextData = fs.readFileSync(contextFile, "utf-8");
const context = JSON.parse(contextData);
const firebaseConfig = JSON.stringify(context.firebaseConfig)

const firebaseEnable = `
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

const output = indexFileData
.replace(/<!-- Cordova Start -->(?:.|[\r\n])*<!-- Cordova End -->/m, '')
.replace(/<!-- Web Start -->(?:.|[\r\n])*<!-- Web End -->/m, firebaseEnable);


fs.writeFileSync(indexFile, output);
