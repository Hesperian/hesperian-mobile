const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const getPageInfo = require('./webpack.preprocess');

function createConfig(spec) {
  const appConfig = spec.appConfig;
  const rootDir = spec.rootDir;

  let assets = [{
      from: 'img/**/*',
      to: '.'
    },
    {
      from: 'locales/**/*',
      to: '.'
    },
    {
      from: 'lib/**/*',
      to: '.',
      noErrorOnMissing: true
    },
    {
      from: '../node_modules/hesperian-mobile/lib/bootstrap.js',
      to: 'lib/bootstrap.js'
    }
  ];

  if (spec.addtionalAssets) {
    assets = assets.concat(spec.addtionalAssets);
  }


  const copyWebpackPlugin = new CopyWebpackPlugin(assets, {});
  const localizationDirs = appConfig.localizations.map(v => v.language_code);

  const config = {
    mode: 'development',
    context: path.resolve(rootDir, 'www'),
    resolve: {
      modules: [path.resolve(rootDir, 'node_modules')]
    },
    entry: './js/app.js',
    plugins: [
      new webpack.DefinePlugin({
        __VERSION__: JSON.stringify(appConfig.version),
        __PREPROCESS__: JSON.stringify(getPageInfo(localizationDirs))
      }),
      new MiniCssExtractPlugin(),
      copyWebpackPlugin
    ],
    module: {
      rules: [{
          test: /\.js$/,
          exclude: /core-js/, // https://github.com/zloirock/core-js/issues/514 workaround not loading on android 4.4
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env',
                  {
                    debug: false,
                    "useBuiltIns": "entry",
                    "corejs": {
                      "version": 3,
                      "proposals": true
                    },
                    "targets": {
                      "android": "4.4",
                      "ios": "9"
                    }
                  }
                ]
              ]
            }
          }
        },
        {
          test: /\.(s*)css$/,
          use: [
            MiniCssExtractPlugin.loader,
            'css-loader', {
              loader: "sass-loader",
              options: {
                sassOptions: {
                  includePaths: ['./www/css']
                }
              }
            }
          ]
        },
        {
          test: /\.(woff|woff2|eot|ttf)$/,
          type: 'asset/inline'
        }
      ]
    },
    output: {
      filename: 'main.js',
      path: path.resolve(rootDir, 'dist')
    }
  };

  return config;
}
module.exports = {
  createConfig: createConfig
};