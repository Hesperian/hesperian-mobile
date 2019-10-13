# Notes for a creating a new app

* `APP` = applicaiton name. `[AZaz_]+`

## App Code Configuration

app-config.json

* id = org.hesperian.${APP}
* If needed, android-packageName = id, replacing '-' with '_'

## Apple Developer Site Configuration
On Apple site, create new app id
org.hesperian.${APP}
hesperianit apple user
https://developer.apple.com/ -> Idendifiers -> App Ids
developer account->App Store Connect->Click on My App->click on plus sign (+)->New App->And fill up the whole info and Choose Your Bundle Id for the app you are uploading now.
* Bundle ID: org.hesperian.${APP}
* SKU: ${uc(APP)}000

## Testflight Configuration


## Google Play

Create Application
* Product details
  * Graphic Assets
    * 3 ScreenShots
      * Main Page
      * Signs of Pregnancy
      * Frequently Asked Questions
    * Hi-res icon 512 x 512 32-bit PNG (with alpha)
    * Feature Graphic 1024 w x 500 h JPG or 24-bit PNG (no alpha)
  * Categorization
    * Application Type: Applications
    * Category: Medical
    * Content Rating
      it@hesperian.org
      REFERENCE, NEWS, OR EDUCATIONAL
  * Pricing and Distribution
  

