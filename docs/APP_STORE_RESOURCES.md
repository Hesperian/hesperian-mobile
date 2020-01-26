## App Store Resources

Resources needed for the app stores

## Apple

* icon-512.png: PNG image data, 512 x 512, 8-bit/color RGBA, non-interlaced
* promo-1024x500px.png: PNG image data, 1024 x 500, 8-bit/color RGB, non-interlaced

### Screenshots

At least 3

* Home.png: PNG image data, 750 x 1334, 8-bit/color RGB, non-interlaced
* Page1.png: PNG image data, 750 x 1334, 8-bit/color RGB, non-interlaced
* Page2.png: PNG image data, 750 x 1334, 8-bit/color RGB, non-interlaced

#### How To Make

https://help.apple.com/app-store-connect/#/devd274dd925
cordova emulate ios --list

Apple-TV-1080p, tvOS 13.0
	Apple-TV-4K-4K, tvOS 13.0
	Apple-TV-4K-1080p, tvOS 13.0
	Apple-Watch-Series-4-40mm, watchOS 6.0
	Apple-Watch-Series-4-44mm, watchOS 6.0
	iPhone-5, 10.2
	iPhone-5, 10.2
	iPhone-5s, 10.2
	iPhone-6-Plus, 10.2
	iPhone-6, 10.2
	iPhone-6s, 10.2
	iPhone-6s-Plus, 10.2
	iPhone-SE, 10.2
	iPhone-7, 10.2
	iPhone-7-Plus, 10.2
	iPad-Air, 10.2
	iPad-Air-2, 10.2
	iPad-Pro--9-7-inch-, 10.2
	iPad-Pro, 10.2
	iPhone-8, 13.0
	iPhone-8-Plus, 13.0
	iPad-Pro--9-7-inch-, 13.0
	iPad-Pro--11-inch-, 13.0
	iPad-Pro--12-9-inch---3rd-generation-, 13.0
	iPad-Air--3rd-generation-, 13.0
	iPhone-11, 13.0
	iPhone-11-Pro, 13.0
	iPhone-11-Pro-Max, 13.0
	Apple-Watch-Series-5-40mm, watchOS 6.0
	Apple-Watch-Series-5-44mm, watchOS 6.0

iPhone 6.5"
`cordova emulate ios --target "iPhone-11-Pro-Max"`

iPad Pro (3rd Gen) 12.9"
`cordova emulate ios --target "iPad-Pro--12-9-inch---3rd-generation-"`

`xcrun simctl io booted screenshot screeshot.png`



## Google

iphone
tablet 7 inch

`adb shell screencap -p > myfile.jpg`
