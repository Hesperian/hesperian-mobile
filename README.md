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


#### Cordova Issues

UIWebView is depricated in iOS. Ongoing plans to fix in cordova.

* https://github.com/apache/cordova-discuss/pull/110
* https://github.com/apache/cordova-ios/issues/661


* https://github.com/chemerisuk/cordova-support-google-services/pull/26/files merged in latest, we use it.

## Mobile Device Support

* Android 4.4 (SDK 19) and greater
* iOS 11.0 and greater

# Install

## Development Environment
### XCode

### Android Studio
AVD

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
* Default / overrideable theme.scss
* android-packageName - automate setting this if needed (replacing '-' with '_' from id)
* Fully script language support (create cordova language resources for app name)

# To Watch

## Update Framework7 Library

[Framework7 v5](https://blog.framework7.io/framework7-v5-679176716faa). We are on v3, and v4 and v5 require css custom properties support, which is not native for our targets, so we would need a polyfill.

### Advantages

Potential Advantages:
* Calendar now has intl support - should support local settings for date names, though it will still be gregorian.

### Disadvantages

This would I think mean Mobile device support:
* Android 5.0 (SDK 21) and greater
* iOS 9.2 and greater

##

# hesperian-mobile build

Currently manual:

* Update the version in [package.json](package.json). Use semantic versioning `x.y.z`
* Create a new [release](https://github.com/hesperianit/hesperian-mobile/releases) tag `vx.y.z`

Consumers should specify package dependency by git tag:

`"hesperian-mobile": "git://github.com/hesperianit/hesperian-mobile.git#vx.y.x"`
