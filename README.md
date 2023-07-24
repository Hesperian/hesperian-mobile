# Hesperian Application Library

A javascript library for Hesperian's mobile applications.

Hesperian Mobile applications are html/javascript applications packaged as mobile applications via [Cordova](https://cordova.apache.org/). See the [Hesperian Mobile Example Application](https://github.com/hesperianit/hesperian-mobile-example) for a sample.

## Features

### Google Analytics

#### Custom Events

Cusom attributes must be configured in Firebase Analytics "Custom Definitions"

Common attributes for all events:
* `locale` - current language
* `pageId` - current page id

Events:
* `external` - external event
 * `href` - what was opened
* `socialsharing` or custom event name via `data-ga-event` parameter
 * `file` - file name of shared file
 * `url` - shared url
 * `completed` - success or failure
 * `app` - which app was used to share
* `menu` - sidepanel menu opened
 * `side` - `left` or `right` side

## Authoring

See [AUTHORING.md](docs/AUTHORING.md).

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
* iOS 11.0 and greater

# Install

To build locally, you need OS X

## Development Environment

https://github.com/nvm-sh/nvm
node 14

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

## Library Release

* Bump version number, e.g. `npm version patch`
* `git push --follow-tags`
* `.github/workflows/release.yaml` action will take it from there

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


# Local Development

## Mobile App Build

### Environment

You must have a `cordova/private` directory with private files for the build:
* `GoogleService-Info.plist`
* `google-services.json`
* `android.keystore`

And also key to unlock keystore:
`export CORDOVA_SIGNING_PASSPHRASE="xxxxxxxx"`

### Running

To emulate android
* make sure emulator is running to pick up correct device: `Android Studio -> Tools -> AVD's`
* `make emulate-android`

OS X Mac Sillicon:
`arch -xarm64 open -a XCode`

### Pushing lib code

rsync -avu --delete --exclude=node_modules --exclude=.git ./ ../hesperian-mobile-XXX/node_modules/hesperian-mobile

rsync -avu --delete --exclude=node_modules --exclude=.git ./ example/node_modules/hesperian-mobile