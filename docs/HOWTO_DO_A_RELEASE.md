# Release Process

These are some raw notes on how to actually push out a build.

## Configuration

* CORDOVA_SIGNING_PASSPHRASE
* 


## Build

* Bump the version ```app-config.json```
* commit
* ```export CORDOVA_SIGNING_PASSPHRASE=```
* ```make build```
* push

## iTunes Connect

Upload build to iTunes Connect:

/Applications/Transporter

* XCode -> Open Developer Tool -> Application Loader
* https://itunesconnect.apple.com -> Activity, build should appear status "Processing"


## Test Flight

* https://itunesconnect.apple.com
* My Apps -> ${app} -> Test Flight
* If Missing Compliance, click on (!) -> No -> Start Internal Testing
* Hesperian
  * Add a build
  * Select a build to test
  * uncheck "sign in required"
  * Add text
  * submit for review

## Android Play

* Sign in to gmail as Google Play user
* In another tab, go to https://play.google.com/apps/publish/

* choose app
* Release management
* App releases
* manage alpha
* create release
* Upload apk
* Add release notes
* Save
* Review
* Start Rollout to alpha