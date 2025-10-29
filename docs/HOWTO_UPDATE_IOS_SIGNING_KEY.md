# Account

https://developer.apple.com/
account
sign in as it@hesperian.org (need permissions to create)
Certs / idents/ profiles

# Creating or updating code signing cert

## Create a CSR certSigningRequest

https://developer.apple.com/help/account/create-certificates/create-a-certificate-signing-request
```
Launch Keychain Access located in /Applications/Utilities.

Choose Keychain Access > Certificate Assistant > Request a Certificate from a Certificate Authority.

In the Certificate Assistant dialog, enter an email address in the User Email Address field.
`it@hesperian.org`

In the Common Name field, enter a name for the key 
`Hesperian App Signing Certificate"

Leave the CA Email Address field empty.

Choose “Saved to disk,” then click Continue.

## Create a .cer

on the apple site create a Certificate, download install in keychain

https://developer.apple.com/account/resources/certificates/add
iOS Distribution (App Store Connect and Ad Hoc)
no services

Download your certificate to your Mac, then double click the .cer file to install in Keychain Access. Make sure to save a backup copy of your private and public keys somewhere secure.


# Provisioning Profile

https://developer.apple.com/ -> account -> profiles

- Distribution / App Store Connect
- Specific App ID
- Family Planning App Store 1 (for example)
- Double Click for Xcode to register it (no feedback it just happens)

Enabled Capabilities: Associated Domains, In-App Purchase

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

60798ba1-4d61-403e-bad4-10e74d91ac90.mobileprovision
