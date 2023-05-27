# Authoring

## Deep Linking

Set `data-section=${sectionId}`, and then link to it with `/pages/${pageId}/${sectionId}`: `<a href="/pages/${pageId}/${sectionId}">...</a>`
For links in the sampe page, use `<a class="external self" href="${sectionId}">...</a>`

## Special CSS

TBD

## Special Pages

* `privacy.html` - privacy page that appears in the right-hand sidebar

## Search

<<<<<<< HEAD
Search links to pages and sections with the data-keywords attribute. Attributes that influence the search:
* `data-keywords="one two three"` - space and/or comma separated keywords for search
* `data-title="page title"` will also be used as a (single) keyword, unless `data-no-title-keywords="true"` is present.
=======
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
>>>>>>> fr/pagesearch
