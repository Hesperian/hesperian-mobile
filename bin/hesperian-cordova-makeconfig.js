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
    xmlns:cdv="http://cordova.apache.org/ns/1.0">
    <name>{{name}}</name>
    <description>
        {{description}}
    </description>
    <author email="{{{author.email}}}" href="{{{author.href}}}">
        {{author.name}}
    </author>
    <content src="index.html" />

    <plugin name="cordova-plugin-inappbrowser" spec="4.0.0" />
    <plugin name="cordova-plugin-statusbar" source="npm" spec="2.4.3" />
    <!-- Social Sharing plugin support -->
    <plugin name="cordova-plugin-x-socialsharing" source="npm" spec="6.0.4" />
    <plugin name="cordova-plugin-androidx" source="npm" spec="2.0.0" />
    <plugin name="cordova-plugin-androidx-adapter" source="npm" spec="1.1.1" />

    <plugin name="cordova-plugin-firebase-analytics" spec="6.1.0" />
    <plugin name="cordova-plugin-firebase-dynamiclinks" spec="7.0.2">
        <variable name="APP_DOMAIN_NAME" value="{{dynamicLinksConfig.appDomainName}}" />
    </plugin>
    <platform name="android">
        <resource-file src="private/google-services.json" target="app/google-services.json" />
            <config-file parent="/manifest/application" target="app/src/main/AndroidManifest.xml" xmlns:android="http://schemas.android.com/apk/res/android">
                <meta-data android:name="google_analytics_adid_collection_enabled" android:exported="false" android:value="false" />
            </config-file>
    </platform>

    <platform name="ios">
        <resource-file src="private/GoogleService-Info.plist" />
        <preference name="scheme" value="app" />
        <preference name="hostname" value="localhost" />
        <!-- not needs as of cordova-ios 6.0.0
        <plugin name="cordova-plugin-wkwebview-engine" spec="1.2.1" />
        <preference name="WKWebViewOnly" value="true" />

        <feature name="CDVWKWebViewEngine">
            <param name="ios-package" value="CDVWKWebViewEngine" />
        </feature>
        <preference name="CordovaWebViewEngine" value="CDVWKWebViewEngine" />
        -->
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
    <preference name="android-minSdkVersion" value="21" />  <!-- Android 5.0 -->
    <preference name="android-targetSdkVersion" value="34"/>  <!-- Android 14.0 -->
    <preference name="deployment-target" value="11.0"/>  <!-- iOS 11.0 -->

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
