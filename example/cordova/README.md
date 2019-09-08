https://cordova.apache.org/docs/en/latest/guide/platforms/android/index.html
https://cordova.apache.org/docs/en/latest/guide/platforms/ios/index.html


https://cordova.apache.org/docs/en/latest/config_ref



cordova-android Version	Supported Android API-Levels	Equivalent Android Version
8.X.X	19 - 28	4.4 - 9.0.0
7.X.X	19 - 27	4.4 - 8.1


https://cordova.apache.org/announcements/2019/03/22/cordova-cli-release-9.0.0.html




android-minSdkVersion - lowest we support =
android-targetSdkVersion - highest we have tested  = 
deployment-target - iOS "Deployment Target" = 


Desired support: "Requires iOS 9.0 or later. Compatible with iPhone, iPad, and iPod touch."
Requires Android 4.1 and up


/Users/mlitwin/Library/Android/sdk/build-tools/28.0.3/aapt


/Users/mlitwin/Library/Android/sdk/build-tools/28.0.3/aapt dump badging output/app-release.apk


 aapt dump badging platforms/android/app/build/outputs/apk/debug/app-debug.apk


 adb shell setprop debug.firebase.analytics.app org.hesperian.hello

  adb shell setprop debug.firebase.analytics.app org.hesperian.Family_Planning
