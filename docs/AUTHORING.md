# Authoring

## Deep Linking

Set `data-section=${sectionId}`, and then link to it with `/pages/${pageId}/${sectionId}`: `<a href="/pages/${pageId}/${sectionId}">...</a>`
For links in the same page, use `<a class="external self" href="${sectionId}">...</a>`

## Date Support

Add an element with class `format-date` to have it format a date in the current page locale. Supported specifications

* Attribute `data-days-from-now` to set the date a relative number of days from now.
* Attribute `data-months-from-now` to set the date a relative number of months from now.

Multiple attributes are allowed and are added.

```
<span class="format-date" data-months-from-now="1"></span>
```

## Special CSS

### button-array

And responsive array of buttons - links with image and caption. Structure:

* `div.button-array` - Top level. Add `.uniform-spacing` to attempt to regularize image sizes to be roughly equivalent.
* `div.button-row` - `Each row
* `div.caption-container` - Content container with:
    * `a` - the link
        * `img` - The image
        * `div.caption` - The caption

```html
<div class="button-array">
    <div class="button-row">
        <a class="caption-container hm-audio-block" href="/pages/PAGENAME">
            <img src="img/IMAGE.png" />
            <div class="caption">CAPTION TEXT</div>
        </a>
    </div>
</div>
```


## Special Pages

* `privacy.html` - privacy page that appears in the right-hand sidebar

## Filter Pages

Filter pages have class `filter-page`, and routes in the app specific section to map filter
button links to filter parameters

Clicking on a filter button link takes you to a new page, same template, with content filtered
to the given filter.

Used for pages which are very close to each other in content.

HTML for content displayed in new page:
```html
     <h2 class="filter-content hm-audio-block" data-filter="filter-name">Title for filter page</h2>

      <div class="filter-content" data-filter="filter-name" data-section="filter/filter-name" data-title="search title" data-keywords="search keywords">
        ... content for filter page
     </div>
```

* `filter-name` - replace with the name for your filter. Lowercase letters and a dash '-'
* `data-section` - optional. Set if you want to link to this section, including via search. For search name must be `filter/filter-name`
* `data-title` and `data-keywords` as in search

## Search

Search links to pages and sections with the data-keywords attribute. Attributes that influence the search:
* `data-keywords="one two three"` - space and/or comma separated keywords for search
* `data-title="page title"` will also be used as a (single) keyword, unless `data-no-title-keywords="true"` is present.

### Global Search

Global search is keyed off of the top level div of the pages

`<div data-page="content" class="page" data-id="FAQ" data-title="FAQs" data-keywords="common, dangerous, restriction, risk, safe, statistics, frequently, asked, questions">

* `data-title`: Text of search link to the page
* `data-keywords`: Page keywords

Internal page links (`data-section="{{section id}}"`) can also have search title and keywords.

### Local Search

You can instantiate a search form for a given page:

`<div class="local-search" data-placeholder="Search for a FAQ"></div>`

Use `class="searchbar-hide-on-local-search"` to hide content you don't want to show while search is active.

### Video

Create your video html according to this pattern:

```html
<div class="hm-video-container content-block">
    <video controls>
        <source src="img/video/test.mp4" type="video/mp4">
        <track src="locales/en/img/video/test.vtt" kind="captions" srclang="en" label="English" default>
    </video>
</div>
```

* The containing `<div>` must have class `hm-video-container` to get the right sizing and behavior
* For the [video element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video)
    * Your video `src` path should be to the video directory under the `img` director. Use an `mp4` format for the file.
    * For your (optional) [caption track](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/track)
        * Use a `.vtt` file from the `img/video` subdirectory of the appropriate `locales` directory
        * `kind="captions"`
        * set `srclang` and `label` as appropriate for the locale