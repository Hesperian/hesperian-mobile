Various scripting snippets for manipulating images. Yeah, I know, it sounded like something grander.


## Making photos smaller

```mogrify -resize 800x800\> -sampling-factor 4:2:0 -strip -quality 85 -interlace JPEG -colorspace RGB *.jpg```

## Creating App Icons

See [makeicons.js](../util/makeicons.js) to create most ios icons from a source png

Still to do for that
* create ios splashes
* create android icons and splashes