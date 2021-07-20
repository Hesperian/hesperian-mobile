# Release Process

These are some raw notes on how to actually push out a build.

## Configuration

* `export CORDOVA_SIGNING_PASSPHRASE=<password>`
JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk1.8.0_291.jdk/Contents/Home

## Build

* Bump the version ```app-config.json```
* commit
* ```make build```
* push
* .apk and .ipa will be in ./output

## iTunes Connect

Upload build to iTunes Connect:

* /Applications/Transporter to upload the app
* https://itunesconnect.apple.com -> Activity, build should appear status "Processing"

* Appstore connect to the app
* Each language:
  * Release notes
  * Screenshots if needed
  * Save
* Scroll down to select no ad thing, and save
* Release



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