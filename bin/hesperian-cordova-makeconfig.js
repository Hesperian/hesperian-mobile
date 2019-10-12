#!/usr/bin/env node
/*
    Create cordova config.xml file from app configuration.

    Run from the top level of the cordova folder.
    Pass in the path to the appConfig.json file.
*/
const fs = require("fs");
const handlebars = require('handlebars');
const contextFile = process.argv[2];
const contextData = fs.readFileSync(contextFile, "utf-8");
const context = JSON.parse(contextData);
const data = 
`
<?xml version='1.0' encoding='utf-8'?>
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

    <platform name="android">
        <plugin name="cordova-plugin-inappbrowser" spec="3.0.0" />
    </platform>
    <plugin name="cordova-plugin-statusbar" source="npm" spec="2.4.2" />

    <plugin name="cordova-plugin-firebase-analytics" spec="2.0.0" />
    <platform name="android">
        <resource-file src="private/google-services.json" target="app/google-services.json" />
            <config-file parent="/manifest/application" target="app/src/main/AndroidManifest.xml" xmlns:android="http://schemas.android.com/apk/res/android">
                <meta-data android:name="google_analytics_adid_collection_enabled" android:value="false" />
            </config-file>
    </platform>
    <platform name="ios">
        <resource-file src="private/GoogleService-Info.plist" />
    </platform>


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
    <preference name="android-minSdkVersion" value="19" />  <!-- Android 4.4 -->
    <preference name="android-targetSdkVersion" value="28"/>  <!-- Android 9.0 -->
    <preference name="deployment-target" value="9.0"/>  <!-- iOS 9.0 -->

    <!-- iOS App icons -->
    <icon src="resources/icons/ios/AppIcon-20.png" platform="ios" width="20" height="20" />
    <icon src="resources/icons/ios/AppIcon-29.png" platform="ios" width="29" height="29" />
    <icon src="resources/icons/ios/AppIcon-40.png" platform="ios" width="40" height="40" />
    <icon src="resources/icons/ios/AppIcon-50.png" platform="ios" width="50" height="50" />
    <icon src="resources/icons/ios/AppIcon-57.png" platform="ios" width="57" height="57" />
    <icon src="resources/icons/ios/AppIcon-58.png" platform="ios" width="58" height="58" />
    <icon src="resources/icons/ios/AppIcon-60.png" platform="ios" width="60" height="60" />
    <icon src="resources/icons/ios/AppIcon-72.png" platform="ios" width="72" height="72" />
    <icon src="resources/icons/ios/AppIcon-80.png" platform="ios" width="80" height="80" />
    <icon src="resources/icons/ios/AppIcon-87.png" platform="ios" width="87" height="87" />
    <icon src="resources/icons/ios/AppIcon-100.png" platform="ios" width="100" height="100" />
    <icon src="resources/icons/ios/AppIcon-114.png" platform="ios" width="114" height="114" />
    <icon src="resources/icons/ios/AppIcon-120.png" platform="ios" width="120" height="120" />
    <icon src="resources/icons/ios/AppIcon-144.png" platform="ios" width="144" height="144" />
    <icon src="resources/icons/ios/AppIcon-152.png" platform="ios" width="152" height="152" />
    <icon src="resources/icons/ios/AppIcon-167.png" platform="ios" width="167" height="167" />
    <icon src="resources/icons/ios/AppIcon-180.png" platform="ios" width="180" height="180" />
    <icon src="resources/icons/ios/AppIcon-1024-RBG.png" platform="ios" width="1024" height="1024" /> <!-- RGB -->

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
    <splash src="resources/splash/android/ldpi.png" platform="android" density="ldpi" />
    <splash src="resources/splash/android/mdpi.png" platform="android" density="mdpi" />
    <splash src="resources/splash/android/hdpi.png" platform="android" density="hdpi" />
    <splash src="resources/splash/android/xhdpi.png" platform="android" density="xhdpi" />

    <!-- Localization -->
    <!-- iOS -->
    <platform name="ios">
        <config-file platform="ios" target="*-Info.plist" parent="CFBundleLocalizations">
            <array>
            {{#each localizations}}
                <string>{{code}}</string>
            {{/each}}
            </array>
        </config-file>
        {{#each localizations}}
        <resource-file src="resources/locales/ios/{{code}}.lproj/InfoPlist.strings" />
        {{/each}}
    </platform>

    <platform name="android">
        {{#each localizations}}
        <resource-file src="resources/locales/android/values-{{code}}/strings.xml" target="res/values-{{code}}/strings.xml" />
        {{/each}}
    </platform>
</widget>
`;

const template = handlebars.compile(data);
const output = template(context);
fs.writeFileSync('config.xml', output);