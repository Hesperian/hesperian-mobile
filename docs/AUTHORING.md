# Authoring

## Deep Linking

Set `data-section=${sectionId}`, and then link to it with `/pages/${pageId}/${sectionId}`: `<a href="/pages/${pageId}/${sectionId}">...</a>`
For links in the sampe page, use `<a class="external self" href="${sectionId}">...</a>`

## Special CSS

TBD

## Special Pages

* `privacy.html` - privacy page that appears in the right-hand sidebar

## Search

Search links to pages and sections with the data-keywords attribute. Attributes that influence the search:
* `data-keywords="one two three"` - space and/or comma separated keywords for search
* `data-title="page title"` will also be used as a (single) keyword, unless `data-no-title-keywords="true"` is present.