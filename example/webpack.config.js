const hesperianWebpack = require('hesperian-mobile/webpack');
const appConfig = require('./app-config.json');

const configSpec = {
  rootDir: __dirname,
  appConfig: appConfig
}

const webpackConfig = hesperianWebpack.createConfig(configSpec);
module.exports = webpackConfig;