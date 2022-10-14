# Account
https://developer.apple.com/
account
sign in as it@hesperian.org (need permissions to create)
Certs / idents/ profiles

# Creating or updating code signing cert

## Create a CSR certSigningRequest

https://support.apple.com/en-in/guide/keychain-access/kyca8916/mac
https://help.apple.com/developer-account/#/devbfa00fef7

Create self-signed certificates in Keychain Access on Mac

In the User Email Address field, enter the email address to identify with this certificate
In the Common Name field, enter your name
In the Request group, click the "Saved to disk" option

makes .cer

Certificate Name
The Hesperian Foundation
Certificate Type
iOS Distribution
Expiration Date
2022/05/31
Created By
Stuart McCalla (it@hesperian.org)


* it@hesperian.org
* The Hesperian Foundation 2
* <blank>

## Create a .cer
on the apple site create a Certificat, download install in keychain

## .p12
export from keychain
Select Personal Information Exchange (.p12) for File Format.
Save the certificate, giving it a strong password.

# Provisioning Profile
https://developer.apple.com/ -> account -> profiles


* Distribution/app store
* Specific App ID
* Family Planning App Store 1 (for example)
* Double Click for Xcode to register it (no feedback it just happens)

# App Configuration

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

Open the .mobileprovision as binary to get id
find id in `ls ~/Library/MobileDevice/Provisioning\ Profiles`
update `build.json` provisioningProfile
