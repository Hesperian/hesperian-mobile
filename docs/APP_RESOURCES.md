# Resources

Needed resources for the application build

## icons

Icons used in building the application. 

### android
https://developer.android.com/google-play/resources/icon-design-specifications
https://android-developers.googleblog.com/2019/03/introducing-new-google-play-app-and.html

* hdpi.png:    PNG image data, 72 x 72, 8-bit/color RGBA, non-interlaced
* ldpi.png:    PNG image data, 36 x 36, 8-bit/color RGBA, non-interlaced
* mdpi.png:    PNG image data, 48 x 48, 8-bit/color RGBA, non-interlaced
* xhdpi.png:   PNG image data, 96 x 96, 8-bit/color RGBA, non-interlaced
* xxhdpi.png:  PNG image data, 144 x 144, 8-bit/color RGBA, non-interlaced
* xxxhdpi.png: PNG image data, 192 x 192, 8-bit/color RGBA, non-interlaced

### ios

Source Art:

* AppIcon 1024x1024

https://developer.apple.com/design/human-interface-guidelines/ios/icons-and-images/launch-screen/
16

* LaunchImage-Portrait-3:2 640x960
* LaunchImage-Portrait-16:9
* LaunchImage-Landscape-9:16
* LaunchImage-Portrait-4:3
* LaunchImage-Landscape-3:4
* LaunchImage-Portrait-19.5:9
* LaunchImage-Landscape-9:19.5

https://developer.apple.com/design/human-interface-guidelines/ios/icons-and-images/app-icon/

Note that `icon-1024.png` has no alpha chanel. This icon is used in the app store in certain places, but the app store takes it from the application build.

* icon-1024.png:  PNG image data, 1024 x 1024, 8-bit/color RGB, non-interlaced
* icon-120.png:   PNG image data, 120 x 120, 8-bit/color RGBA, non-interlaced
* icon-152.png:   PNG image data, 152 x 152, 8-bit/color RGBA, non-interlaced
* icon-40.png:    PNG image data, 40 x 40, 8-bit/color RGBA, non-interlaced
* icon-72.png:    PNG image data, 72 x 72, 8-bit/color RGBA, non-interlaced
* icon-76.png:    PNG image data, 76 x 76, 8-bit/color RGBA, non-interlaced
* icon.png:       PNG image data, 57 x 57, 8-bit/color RGBA, non-interlaced
* icon_at_2x.png: PNG image data, 114 x 114, 8-bit/color RGBA, non-interlaced

## splash

### android

* hdpi.png:  PNG image data, 480 x 800, 8-bit/color RGB, non-interlaced
* ldpi.png:  PNG image data, 200 x 320, 8-bit/color RGBA, non-interlaced
* mdpi.png:  PNG image data, 320 x 480, 8-bit/color RGB, non-interlaced
* xhdpi.png: PNG image data, 720 x 1280, 8-bit/color RGB, non-interlaced

### ios

* Default-568h@2x.png:           PNG image data, 640 x 1136, 8-bit/color RGB, non-interlaced
* Default-667h@2x.png:           PNG image data, 750 x 1334, 8-bit/color RGB, non-interlaced
* Default-Landscape-736h@3x.png: PNG image data, 2208 x 1242, 8-bit/color RGB, non-interlaced
* Default-Landscape.png:         PNG image data, 1024 x 768, 8-bit/color RGB, non-interlaced
* Default-Landscape@2x.png:      PNG image data, 2048 x 1536, 8-bit/color RGB, non-interlaced
* Default-Portrait-736h@3x.png:  PNG image data, 1242 x 2208, 8-bit/color RGB, non-interlaced
* Default-Portrait.png:          PNG image data, 768 x 1024, 8-bit/color RGB, non-interlaced
* Default-Portrait@2x.png:       PNG image data, 1536 x 2048, 8-bit/color RGB, non-interlaced
* Default.png:                   PNG image data, 320 x 480, 8-bit/color RGB, non-interlaced
* Default@2x.png:                PNG image data, 640 x 960, 8-bit/color RGB, non-interlaced


# How to Create

Various scripts

## Making photos smaller

* ```mogrify -resize 800x800\> -sampling-factor 4:2:0 -strip -quality 85 -interlace JPEG -colorspace RGB *.jpg```
* ```find www -name "*.png" -exec mogrify -resize 800x800\> -strip {} \;```


## Creating App Icons

See [makeicons.js](../util/makeicons.js) to create most ios icons from a source png

Still to do for that
* create ios splashes
* create android icons and splashes

# Source Art

https://cordova.apache.org/docs/en/latest/reference/cordova-plugin-splashscreen/
https://cordova.apache.org/docs/en/latest/config_ref/images.html