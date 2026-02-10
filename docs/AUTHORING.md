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

### Instruction Lists

Instruction cards share a common structure so the accordion styles in `www/css/styles.scss` can lay out the content consistently. Use the pattern below when authoring new instruction blocks (for example, on G pages that describe pill regimens):

```html
<div class="instructions-heading">Instructions</div>
<ol class="step-card-steps">
    <li class="step-card-step">
        <div class="card step-card">
            <div class="step-card-image-wrapper">
                <img class="step-card-image" src="..." alt="...">
            </div>
            <div class="card-header">
                <span class="step-card-title">Step 1</span>
            </div>
            <div class="card-content card-content-padding">
                <div class="step-card-body">
                    <div class="step-card-text">
                        <p>Step description text.</p>
                    </div>
                    <div class="step-card-important">
                        <p><strong>Important:</strong></p>
                        <ul class="step-card-list">
                            <li>Supporting detail or warning.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </li>
</ol>
```

Key points:

- Wrap the entire sequence in `<ol class="step-card-steps">` so the outer list controls spacing and numbering.
- Each step lives in `<li class="step-card-step">` and wraps a `.card.step-card` element.
- Optional media or illustrations live inside `.step-card-image-wrapper` with an `.step-card-image` `<img>`.
- Use `.step-card-important` for Important/Note callouts; place bullet lists inside `.step-card-list`, and numbered sub-steps inside `.step-card-list.step-list`.
- Keep headings in `.instructions-heading` directly before the ordered list so the styling applies.


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

At build time (`webpack.preprocess.js`), HTML pages are scanned and a search index is built from `data-title`, `data-keywords`, and `data-section` attributes. Keywords are normalized to lowercase with diacritics removed (e.g. "café" becomes "cafe"), then split into individual words. At runtime, each query word must prefix-match at least one keyword for a result to appear (AND logic across query words, OR logic across keywords within a word).

Attributes that influence the search index:
* `data-keywords="keyword1, keyword2, multi word keyword"` - Comma-separated keywords. Each keyword is further split into individual words, so `"multi word keyword"` produces three separate searchable words: `multi`, `word`, `keyword`.
* `data-title="page title"` - Used as the display text for search results. The title words are also added as keywords unless `data-no-title-keywords="true"` is present on the `.page` element.

### Global Search

Global search is built from the top-level `.page` element of each HTML page:

```html
<div data-page="content" class="page" data-id="FAQ" data-title="FAQs"
     data-keywords="common, dangerous, restriction, risk, safe, statistics, frequently, asked, questions">
```

* `data-title`: Display text for the search result link, and also used as keywords (unless `data-no-title-keywords` is set)
* `data-keywords`: Comma-separated keywords for matching

Sections within a page can also appear in global search results by adding `data-section`, `data-title`, and `data-keywords` attributes:

```html
<div data-section="my-section" data-title="Section Title" data-keywords="relevant, terms">
```

The current page is excluded from its own global search results.

### Local Search

Local search provides within-page search across sections. Add a search form to any page:

```html
<div class="local-search" data-placeholder="Search for a FAQ"></div>
```

* `data-placeholder` is optional; defaults to the localized search prompt.
* Local search matches against section `data-title` (as a substring match) and `data-keywords` (prefix-match per word, same as global).
* Section titles in local results have the page name prefix (before `:` or `፤`) stripped for brevity.

Use `class="searchbar-hide-on-local-search"` on elements you want hidden while local search is active.

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