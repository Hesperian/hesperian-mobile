 cordova/build.json   
    
        "release": {
            "codeSignIdentity": "iPhone Distribution",
            "developmentTeam": "72WY4Q4382",
            "packageType": "app-store",
            "provisioningProfile": "41c247c3-5924-4548-b27a-28d04235fc60",
            "buildFlag": [
                "EMBEDDED_CONTENT_CONTAINS_SWIFT = YES",
                "ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES=NO",
                "LD_RUNPATH_SEARCH_PATHS = \"@executable_path/Frameworks\""
            ]
        }


https://developer.apple.com/
account
sign in as it@hesperian.org (need permissions to create)
Certs / idents/ profiles
profiles
+
Distribution/app store
Specific App ID
Family Planning App Store 1
Download

Not 100% Sure how to "register" the .mobile provision. I think I tried:
Double Click for Xcode
XCode / prefs / account / download manual

Open the .mobileprovision as binary to get id
find id in `ls ~/Library/MobileDevice/Provisioning\ Profiles`
update `build.json`

