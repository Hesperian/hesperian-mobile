#!/usr/bin/env node
/*
    Create cordova config.xml file from app configuration.

    Run from the top level of the cordova folder.
    Pass in the path to the appConfig.json file.
*/
const fs = require("fs");
const handlebars = require("handlebars");
const contextFile = process.argv[2];
const contextData = fs.readFileSync(contextFile, "utf-8");
const context = JSON.parse(contextData);
const configData = `<?xml version='1.0' encoding='utf-8'?>
<widget id="{{{id}}}"
        version="{{{version}}}"
        {{#if android-packageName}}android-packageName="{{{android-packageName}}}"{{/if}}
        {{#if ios-CFBundleIdentifier}}ios-CFBundleIdentifier="{{{ios-CFBundleIdentifier}}}"{{/if}}
        xmlns="http://www.w3.org/ns/widgets"
        xmlns:android="http://schemas.android.com/apk/res/android"
        xmlns:tools="http://schemas.android.com/tools"
    xmlns:cdv="http://cordova.apache.org/ns/1.0">
    <name>{{name}}</name>
    <description>
        {{description}}
    </description>
    <author email="{{{author.email}}}" href="{{{author.href}}}">
        {{author.name}}
    </author>
    <content src="index.html" />

    <plugin name="cordova-plugin-inappbrowser" spec="6.0.0" />
    <plugin name="cordova-plugin-statusbar" source="npm" spec="4.0.0" />
    <!-- Social Sharing plugin support -->
    <plugin name="cordova-plugin-x-socialsharing" source="npm" spec="6.0.4" />
    <plugin name="cordova-plugin-androidx" source="npm" spec="3.0.0" />
    <plugin name="cordova-plugin-androidx-adapter" source="npm" spec="1.1.3" />

    <plugin name="cordova-plugin-firebase-analytics" spec="8.0.0" />
    <platform name="android">
        <resource-file src="private/google-services.json" target="app/google-services.json" />
        <edit-config file="AndroidManifest.xml" target="/manifest" mode="merge">
            <manifest xmlns:tools="http://schemas.android.com/tools" />
        </edit-config>
        <config-file target="AndroidManifest.xml" parent="/manifest">
            <uses-permission android:name="com.google.android.gms.permission.AD_ID" tools:node="remove"/>
        </config-file>

    </platform>

    <platform name="ios">
        <resource-file src="private/GoogleService-Info.plist" />
        <preference name="scheme" value="app" />
        <preference name="hostname" value="localhost" />
        <preference name="DisallowOverscroll" value="true"/>
    </platform>
    <plugin name="cordova-plugin-tts-advanced" spec="git+https://github.com/Hesperian/cordova-plugin-tts-advanced.git/#hesperian" />

    <access origin="*" />
    <allow-intent href="http://*/*" />
    <allow-intent href="https://*/*" />
    <allow-intent href="tel:*" />
    <allow-intent href="sms:*" />
    <allow-intent href="mailto:*" />
    <allow-intent href="geo:*" />
    <platform name="android">
        <allow-intent href="market:*" />
    </platform>
    <platform name="ios">
        <allow-intent href="itms:*" />
        <allow-intent href="itms-apps:*" />
    </platform>

    <preference name="DisallowOverscroll" value="true" />
    <preference name="EnableViewportScale" value="true" />

    <!-- Platform Version Support -->
    <preference name="android-minSdkVersion" value="24" />  <!-- Android 7.0 Nougat (API 24) - Minimum supported version - Released August 2016 - https://developer.android.com/tools/releases/platforms -->
    <preference name="android-targetSdkVersion" value="35"/>  <!-- Android 15 (API 35) - Target SDK version - Released October 2024 - https://developer.android.com/tools/releases/platforms -->
    <preference name="deployment-target" value="15.6"/>  <!-- iOS 15.6 - Minimum supported version (IPHONEOS_DEPLOYMENT_TARGET) - https://cordova.apache.org/docs/en/latest/config_ref/index.html#preference -->

    <!-- iOS App icons -->
    <icon src="resources/icons/ios/AppIcon-20.png" platform="ios" width="20" height="20" />
    <icon src="resources/icons/ios/AppIcon-29.png" platform="ios" width="29" height="29" />  <!-- iPhone Spotlight and Settings Icon -->
    <icon src="resources/icons/ios/AppIcon-40.png" platform="ios" width="40" height="40" /> <!-- Spotlight Icon -->
    <icon src="resources/icons/ios/AppIcon-50.png" platform="ios" width="50" height="50" /> <!-- iPad Spotlight and Settings Icon -->
    <icon src="resources/icons/ios/AppIcon-57.png" platform="ios" width="57" height="57" />  <!-- iOS 6.1 --> <!-- iPhone / iPod Touch -->
    <icon src="resources/icons/ios/AppIcon-58.png" platform="ios" width="58" height="58" />  <!-- iPhone Spotlight and Settings Icon --> <!-- 2x -->
    <icon src="resources/icons/ios/AppIcon-60.png" platform="ios" width="60" height="60" />   <!-- iOS 7.0+ --> <!-- iPhone / iPod Touch  -->
    <icon src="resources/icons/ios/AppIcon-72.png" platform="ios" width="72" height="72" /> <!-- iPad -->
    <icon src="resources/icons/ios/AppIcon-76.png" platform="ios" width="76" height="76" />  <!-- iPad -->
    <icon src="resources/icons/ios/AppIcon-80.png" platform="ios" width="80" height="80" /> <!-- Spotlight Icon --> <!-- 2x -->
    <icon src="resources/icons/ios/AppIcon-87.png" platform="ios" width="87" height="87" /> <!-- iPhone Spotlight and Settings Icon --> <!-- 3x -->
    <icon src="resources/icons/ios/AppIcon-100.png" platform="ios" width="100" height="100" /> <!-- iPad Spotlight and Settings Icon --> <!-- 2x -->
    <icon src="resources/icons/ios/AppIcon-114.png" platform="ios" width="114" height="114" /> <!-- iOS 6.1 --> <!-- iPhone / iPod Touch --> <!-- 2x -->
    <icon src="resources/icons/ios/AppIcon-120.png" platform="ios" width="120" height="120" />  <!-- iOS 7.0+ --> <!-- iPhone / iPod Touch  --> <!-- 2x --> 
    <icon src="resources/icons/ios/AppIcon-144.png" platform="ios" width="144" height="144" /> <!-- iPad --> <!-- 2x -->
    <icon src="resources/icons/ios/AppIcon-152.png" platform="ios" width="152" height="152" />  <!-- iPad --> <!-- 2x --> 
    <icon src="resources/icons/ios/AppIcon-167.png" platform="ios" width="167" height="167" /> <!-- iPad Pro -->
    <icon src="resources/icons/ios/AppIcon-180.png" platform="ios" width="180" height="180" />  <!-- iOS 8.0+ --> <!-- iPhone 6 Plus  --> <!-- 3x -->
    <icon src="resources/icons/ios/AppIcon-1024-RBG.png" platform="ios" width="1024" height="1024" />  <!-- iTunes Marketing Image --> <!-- RGB -->

    <!-- iOS splash screen a.k.a. launch image -->

    <!-- iPhone and iPod touch -->
    <splash src="resources/splash/ios/Default.png" platform="ios" width="320" height="480" />
    <splash src="resources/splash/ios/Default@2x.png" platform="ios" width="640" height="960" />
    <!-- iPhone 5 / iPod Touch (5th Generation) -->
    <splash src="resources/splash/ios/Default-568h@2x.png" platform="ios" width="640" height="1136" />
    <!-- iPhone 6 -->
    <splash src="resources/splash/ios/Default-667h@2x.png" platform="ios" width="750" height="1334" />
    <splash src="resources/splash/ios/Default-Portrait-736h@3x.png" platform="ios" width="1242" height="2208" />
    <splash src="resources/splash/ios/Default-Landscape-736h@3x.png" platform="ios" width="2208" height="1242" />
    <!-- iPad -->
    <splash src="resources/splash/ios/Default-Portrait.png" platform="ios" width="768" height="1024" />
    <splash src="resources/splash/ios/Default-Landscape.png" platform="ios" width="1024" height="768" />
    <!-- Retina iPad -->
    <splash src="resources/splash/ios/Default-Portrait@2x.png" platform="ios" width="1536" height="2048" />
    <splash src="resources/splash/ios/Default-Landscape@2x.png" platform="ios" width="2048" height="1536" />

    <splash src="resources/splash/ios/LaunchImage-1125x2436.png" platform="ios" width="1125" height="2436" />
    <splash src="resources/splash/ios/LaunchImage-2436x1125.png" platform="ios" width="2436" height="1125" />


    <!-- Android Properties -->

    <!-- Android App icons -->
    <icon src="resources/icons/android/ldpi.png" platform="android" density="ldpi" />
    <icon src="resources/icons/android/mdpi.png" platform="android" density="mdpi" />
    <icon src="resources/icons/android/hdpi.png" platform="android" density="hdpi" />
    <icon src="resources/icons/android/xhdpi.png" platform="android" density="xhdpi" />
    <icon src="resources/icons/android/xxhdpi.png" platform="android" density="xxhdpi" />
    <icon src="resources/icons/android/xxxhdpi.png" platform="android" density="xxxhdpi" />

    <!-- Android Splash Screen -->
    <preference name="AndroidWindowSplashScreenAnimatedIcon" value="resources/splash/android/splash.png" />

    <!-- Localization -->
    <!-- iOS -->
    <platform name="ios">
        <config-file parent="ITSAppUsesNonExemptEncryption" target="*-Info.plist">
            <false />
        </config-file>
        <config-file platform="ios" target="*-Info.plist" parent="CFBundleLocalizations">
            <array>
            {{#each localizations}}
                <string>{{language_code}}</string>
            {{/each}}
            </array>
        </config-file>
        {{#each localizations}}
        <resource-file src="resources-tmp/locales/ios/{{language_code}}.lproj/InfoPlist.strings" />
        {{/each}}
    </platform>

    <platform name="android">
          <preference name="GradlePluginGoogleServicesEnabled" value="true" />
          <preference name="GradlePluginGoogleServicesVersion" value="4.4.0" />
          <resource-file src="resources-tmp/locales/android/values/themes.xml" target="res/values/themes.xml" />

        {{#each localizations}}
        <resource-file src="resources-tmp/locales/android/values-{{language_code}}/strings.xml" target="res/values-{{language_code}}/strings.xml" />
        {{/each}}
    </platform>
</widget>
`;

const configTemplate = handlebars.compile(configData);
fs.writeFileSync("config.xml", configTemplate(context));

// Write out locale specific string files for cordova builds for ios and android
// Sets the app title under the icon
const localizations = context.localizations;

const androidStringsData = `<?xml version='1.0' encoding='utf-8'?>
<resources>
  <string name="app_name">{{app_name}}</string>
</resources>
`;
const androidStringsTemplate = handlebars.compile(androidStringsData);

const iOSStringsData = `CFBundleDisplayName = "{{app_name}}";
CFBundleName = "{{app_name}}";
`;
const iOSStringsTemplate = handlebars.compile(iOSStringsData);

localizations.forEach((locale) => {
  const androidDir = `resources-tmp/locales/android/values-${locale.language_code}`;
  fs.mkdirSync(androidDir, { recursive: true });
  fs.writeFileSync(`${androidDir}/strings.xml`, androidStringsTemplate(locale));
  if (locale.language_code === "en") {
    // default language
    fs.mkdirSync(`resources-tmp/locales/android/values`, { recursive: true });
    fs.writeFileSync(
      `resources-tmp/locales/android/values/strings.xml`,
      androidStringsTemplate(locale)
    );
  }

  const iOSDir = `resources-tmp/locales/ios/${locale.language_code}.lproj`;
  fs.mkdirSync(iOSDir, { recursive: true });
  fs.writeFileSync(`${iOSDir}/InfoPlist.strings`, iOSStringsTemplate(locale));
});


// Write out themes.xml for android
const themesData = `
<?xml version="1.0" encoding="utf-8"?>
<!--
 Licensed to the Apache Software Foundation (ASF) under one
 or more contributor license agreements.  See the NOTICE file
 distributed with this work for additional information
 regarding copyright ownership.  The ASF licenses this file
 to you under the Apache License, Version 2.0 (the
 "License"); you may not use this file except in compliance
 with the License.  You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing,
 software distributed under the License is distributed on an
 "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 KIND, either express or implied.  See the License for the
 specific language governing permissions and limitations
 under the License.
-->
<resources xmlns:tools="http://schemas.android.com/tools">
    <style name="Theme.App.SplashScreen" parent="Theme.SplashScreen.IconBackground">
      <!-- Optional: Set the splash screen background. (Default: #FFFFFF) -->
      <item name="windowSplashScreenBackground">@color/cdv_splashscreen_background</item>

      <!-- Required: Add either a drawable or an animated drawable -->
      <item name="windowSplashScreenAnimatedIcon">@drawable/ic_cdv_splashscreen</item>

      <!-- Required: For animated icons -->
      <item name="windowSplashScreenAnimationDuration">200</item>

      <!-- Required: Set the theme of the Activity that directly follows your splash screen. -->
      <item name="postSplashScreenTheme">@style/Theme.AppCompat.NoActionBar</item>

      <!-- Disable Edge-to-Edge for SDK 35 -->
      <item name="android:windowOptOutEdgeToEdgeEnforcement" tools:targetApi="35">true</item>
    </style>
</resources>
`;

fs.writeFileSync(
      `resources-tmp/locales/android/values/themes.xml`,
      themesData
);

const colorsData = `
<?xml version='1.0' encoding='utf-8'?>
<resources xmlns:tools="http://schemas.android.com/tools">
    <color name="cdv_splashscreen_background">#FFFFFF</color>
</resources>
`;
fs.writeFileSync(
      `resources-tmp/locales/android/values/colors.xml`,
      colorsData
);