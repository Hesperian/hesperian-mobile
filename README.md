# Hesperian Application Library

A javascript library for Hesperian's mobile applications.

Hesperian Mobile applications are html/javascript applications pagacked as mobile applications via [Cordova](https://cordova.apache.org/). See the [Hesperian Mobile Example Application](https://github.com/hesperianit/hesperian-mobile-example) for a sample.


## Technical Stack

### Javascript Application

* [Framework7](https://framework7.io/) - [v3](https://v3.framework7.io/)
* [Webpack](https://webpack.js.org/)
  * [Babel 7](https://babeljs.io/)
    * [preset-env](https://babeljs.io/docs/en/babel-preset-env)
      * [browserlist](https://github.com/browserslist/browserslist)
      * `.bablerc`
    * [Sass](https://sass-lang.com/)


### Mobile Native Application

 * [Cordova](https://cordova.apache.org/)
   * [cordova-plugin-firebase-analytics](https://github.com/chemerisuk/cordova-plugin-firebase-analytics)
   * [cordova-plugin-inappbrowser](https://cordova.apache.org/docs/en/latest/reference/cordova-plugin-inappbrowser/)
   * [cordova-plugin-statusbar](https://github.com/apache/cordova-plugin-statusbar)

## Mobile Device Support

* Android 4.4 (SDK 19) and greater
* iOS 9.0 and greater

# Install

## Cordova

https://cordova.apache.org/docs/en/latest/guide/cli/index.html

* npm install -g cordova
* sudo gem install cocoapods
* pod setup
* brew update
* brew upgrade node
* brew install gradle
* brew install rvm

export PATH=/Users/$USER/Library/Android/sdk/tools:$PATH
export PATH=/Users/$USER/Library/Android/sdk/tools/bin:$PATH
export PATH=/Users/$USER/Library/Android/sdk/platform-tools:$PATH

## Addition Information

* [HOWTO_CREATE_NEW_APP.md](docs/HOWTO_CREATE_NEW_APP.md)
* [HOWTO_DO_A_RELEASE.md](docs/HOWTO_DO_A_RELEASE.md)
* [HOWTO_UPDATE_IOS_SIGNING_KEY.md](docs/HOWTO_UPDATE_IOS_SIGNING_KEY.md)


# TODO

* Fully automate Cordova multi-language device resources
* Framework7 v4 (needs css custom properties support)
* Default / overrideable theme.scss
* android-packageName - automate setting this if needed (replacing '-' with '_' from id)

