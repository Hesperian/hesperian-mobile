const hesperianVite = require("hesperian-mobile/vite");
const appConfig = require("./app-config.json");

module.exports = hesperianVite.createConfig({
  rootDir: __dirname,
  appConfig,
});
