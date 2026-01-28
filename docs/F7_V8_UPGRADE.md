# Framework7 v3.6 → v8.3 Upgrade Guide

This guide provides instructions for upgrading a Hesperian mobile application from Framework7 v3.6 to v8.3, including migration from Webpack to Vite and comprehensive accessibility improvements.

## Directory Structure

This guide assumes the following directory layout:

```
Hesperian/
├── hesperian-mobile/           # Library - checkout feat/updatef7 branch
├── hesperian-mobile-APP/       # Read-only reference of current APP version
├── hesperian-mobile-APP-f7/    # Your app to upgrade (working directory)
└── hesperian-mobile-SA-f7/     # Working reference of upgraded SA app
```

**Reference implementations:**
- Current working APP: `http://localhost/Hesperian/hesperian-mobile-APP/dist/index.html?lang=en#/`
- Upgraded SA app: `../hesperian-mobile-SA-f7/` - consult for working examples of all changes

---

## What Changed

### Framework7 Version
- **From**: Framework7 v3.6.x → **To**: Framework7 v8.3.4

### Key Dependencies Updated
- `framework7`: `^3.6.X` → `^8.3.4`
- `framework7-icons`: `^3.0.1` → `^5.0.5`
- Added explicit dependencies (Framework7 v8 no longer bundles these):
  - `dom7`: `^4.0.6`
  - `template7`: `^1.4.2`
  - `moment`: `^2.29.4`
  - `messageformat`: `^2.0.5`

### Build System
- **Bundler**: Webpack 4 → Vite 6.4
- **Sass**: node-sass → sass (dart-sass) v1.93
- Added `core-js@3` for polyfills

### Filter Module Removed
The `lib/filter/` module has been removed. Remove any filter-related routes from your app.

---

## Migration Steps

### Step 1: Set Up Local hesperian-mobile Link

```bash
# Ensure hesperian-mobile is on the correct branch
cd ../hesperian-mobile
git checkout feat/updatef7
npm install
npm link

# Return to your app
cd ../hesperian-mobile-APP-f7

# Create the symlink manually (more reliable than npm link)
rm -rf node_modules/hesperian-mobile
ln -s ../../hesperian-mobile node_modules/hesperian-mobile
```

**Verify the link:**
```bash
ls -la node_modules/hesperian-mobile
# Should show: hesperian-mobile -> ../../hesperian-mobile
```

**Important**: Re-create this symlink after every `npm install`.

### Step 2: Update .node-version

Update `.node-version` to Node 18+:

```
v24.1.0
```

### Step 3: Update package.json

Update dependencies in `package.json`:

```json
{
  "dependencies": {
    "hesperian-mobile": "github:Hesperian/hesperian-mobile#feat/updatef7",
    "framework7": "^8.3.4",
    "framework7-icons": "^5.0.5",
    "dom7": "^4.0.6",
    "template7": "^1.4.2",
    "moment": "^2.29.4",
    "messageformat": "^2.0.5"
  },
  "devDependencies": {
    "vite": "^6.4.1",
    "sass": "^1.93.3",
    "@babel/core": "^7.25.2",
    "@babel/preset-env": "^7.25.4",
    "core-js": "^3.38.1"
  }
}
```

**If your app uses MessageFormat directly**, also add:
```json
"@messageformat/core": "^3.0.0"
```

Then:
```bash
npm install

# Re-create symlink after install
rm -rf node_modules/hesperian-mobile
ln -s ../../hesperian-mobile node_modules/hesperian-mobile
```

### Step 4: Create vite.config.js

Create `vite.config.js` in your app root:

```javascript
const hesperianVite = require("hesperian-mobile/vite");
const appConfig = require("./app-config.json");

module.exports = hesperianVite.createConfig({
  rootDir: __dirname,
  appConfig,
  // If you have additional static assets to copy:
  // additionalAssets: [
  //   { from: "customDir/assets", to: "customDir/assets" }
  // ]
});
```

Delete `webpack.config.js` if present.

### Step 5: Update www/js/app.js

**Import changes:**
```javascript
// Before
import Framework7, { Dom7, Template7 } from "framework7/framework7.esm.bundle.js";
import "framework7-icons";
import { appConfig, createApp } from "hesperian-mobile";

// After
import "core-js/stable";
import "framework7/css/bundle";
import "framework7-icons/css/framework7-icons.css";
import "../css/styles.scss";

import { Dom7 } from "framework7/bundle";
import Template7 from "template7";
import { appConfig, initApp, getApp } from "hesperian-mobile";
```

**App initialization:**
```javascript
// Before
window.app = createApp({
  f7: {
    root: "#app",
    // ...
  }
});

// After
initApp({
  appData: appData,
  localeData: localeData,
  f7: {
    el: "#app",  // renamed from 'root'
  }
});

// To get app instance later:
const app = getApp();
```

**See**: `../hesperian-mobile-SA-f7/www/js/app.js` for complete example.

### Step 6: Update All JavaScript Files with Framework7 Imports

**Search for all files** importing from the old path:
```bash
grep -r "framework7.esm.bundle" www/
grep -r "from 'framework7'" www/
```

Update each file:
```javascript
// Before
import { Template7, Dom7 } from "framework7/framework7.esm.bundle.js";
// or
import { Template7, Dom7 } from "framework7";

// After
import { Dom7 } from "framework7/bundle";
import Template7 from "template7";
```

### Step 7: Replace window.app with getApp()

**Search for all uses:**
```bash
grep -r "window\.app" www/
```

Update each file:
1. Add `getApp` to imports: `import { ..., getApp } from "hesperian-mobile";`
2. Replace `window.app` with `getApp()`

**Note**: If the code uses `app.t7.registerHelper`, change to:
```javascript
// Before
app.t7.registerHelper('myHelper', function() { ... });

// After
Template7.registerHelper('myHelper', function() { ... });
```

### Step 8: Update Custom Routes

If your app defines custom routes:

```javascript
// Before
{
  path: '/custom',
  async: function(routeTo, routeFrom, resolve, reject) {
    resolve({ templateUrl: `./locales/${locale}/custom.html` });
  }
}

// After
import Template7 from "template7";

async function loadLocalizedContent(app, url) {
  const result = await fetch(url);
  if (!result.ok) throw new Error(`Failed to fetch ${url}: ${result.status}`);
  return result.text();
}

async function resolveWithTemplate({ app, resolve, reject, url, logLabel }) {
  try {
    const html = await loadLocalizedContent(app, url);
    const template = Template7.compile(html);
    resolve({ content: template({}) });
  } catch (error) {
    console.error(`resolve:${logLabel} error`, { url, error });
    if (reject) reject(error);
  }
}

{
  path: '/custom',
  async(context) {
    const { app, resolve, reject } = context;
    const url = `./locales/${appConfig.locale()}/custom.html`;
    return resolveWithTemplate({ app, resolve, reject, url, logLabel: 'custom' });
  }
}
```

**Remove any filter routes** like `/pages/somepage/filter/:filter`.

### Step 9: Update Sass Files

**www/css/theme.scss:**
```scss
// Before
@import "hesperian-mobile/lib/css/theme.scss";

// After
@forward "hesperian-mobile/lib/css/theme.scss";
```

**www/css/styles.scss:**
```scss
// Before
@import "../../../node_modules/framework7/css/framework7.css";
@import "theme.scss";

// After
@use "./theme.scss" as *;
```

**All other Sass files** (including those in subdirectories like `js/settings/`, `methodChooser/css/`, etc.) - convert `@import` to `@use`:
```scss
// Before
@import "../../css/theme.scss";

// After
@use "../../css/theme.scss" as *;
```

### Step 10: Update Makefile

The `hesperian-makefile` include already provides Vite targets. Your Makefile should work if it includes:

```makefile
NODE_MODULES=./node_modules

include ${NODE_MODULES}/hesperian-mobile/util/hesperian-makefile
```

To build:
```bash
make bundle
```

---

## Accessibility: Required String Resources

Resources are split into two files per locale:

1. **`resources-common.js`** - Common UI strings used by the hesperian-mobile library (accessibility labels, audio controls, etc.)
2. **`resources.js`** - App-specific strings (sidelinks, settings, intro, etc.)

### Step 1: Copy resources-common.js from SA-f7

Copy the `resources-common.js` file for each locale from the SA-f7 reference implementation:

```bash
# For each locale your app supports, copy from SA-f7
cp ../hesperian-mobile-SA-f7/www/locales/en/resources/resources-common.js www/locales/en/resources/
cp ../hesperian-mobile-SA-f7/www/locales/es/resources/resources-common.js www/locales/es/resources/
cp ../hesperian-mobile-SA-f7/www/locales/fr/resources/resources-common.js www/locales/fr/resources/
# ... repeat for each locale
```

The `resources-common.js` files contain translated UI strings for:
- `landmarks` - Screen reader navigation labels
- `toolbar.ariaLabels` - Bottom toolbar button labels
- `logoAltText`, `upperLeftMenuAriaLabel`, `upperRightMenuAriaLabel`, `backButtonAriaLabel`, `bookmarkAriaLabel` - Header navigation labels
- `socialsharing` - Share image text
- `favorites` - Bookmarks popup title, checkbox label, and intro text
- `audio.strings` - Audio player UI text
- `audio.ariaLabels` - Audio control accessibility labels
- `search.ariaLabels` - Search input accessibility labels

### Step 2: Update resources.js

Update each locale's `resources.js` to import common resources and restructure app-specific content:

1. Add the import at the top of the file:
```javascript
import { commonResources } from "./resources-common";
```

2. Add `common: commonResources` as the first property in the resources object:
```javascript
const resources = {
  common: commonResources,

  // App-specific resources continue below...
```

3. Remove these keys from `resources.js` (they're now in `resources-common.js`):
   - `landmarks`
   - `toolbar`
   - `logoAltText`
   - `upperLeftMenuAriaLabel`
   - `upperRightMenuAriaLabel`
   - `backButtonAriaLabel`
   - `bookmarkAriaLabel`
   - `socialsharing`
   - `favorites`
   - `audio.strings`
   - `audio.ariaLabels`
   - `search.ariaLabels`

4. Keep these app-specific resources in `resources.js`:
   - `sidelinks` - App navigation menu
   - `settings` - App settings menu
   - `search.prompt` - Search placeholder text (just the prompt, not ariaLabels)
   - `audio.substitutions` - App-specific text-to-speech substitutions
   - `intro` - App-specific tour steps
   - Any app-specific resources (calculator, methods, etc.)

### Example resources.js Structure After Migration

```javascript
import { commonResources } from "./resources-common";

const resources = {
  common: commonResources,

  sidelinks: [
    { link: "/", title: "Home" },
    // ... app-specific menu items
  ],

  settings: {
    languages: { title: "Choose Language", next: "Next" },
    about: { title: "About us" },
    // ... app-specific settings
  },

  search: {
    prompt: "Search",  // Only the prompt - ariaLabels are in common
  },

  audio: {
    substitutions: {  // Only substitutions - strings and ariaLabels are in common
      mcg: "micrograms",
      mg: "milligrams",
    },
  },

  intro: {
    cancel: "Exit",
    next: "Next",
    back: "Back",
    dontshowagain: "Don't show again",
    steps: { /* app-specific tour steps */ },
  },

  // App-specific resources...
  calculator: { /* ... */ },  // SA only
  methods: { /* ... */ },      // FP only
};

export { resources };
```

### What Goes Where

| Resource | File | Notes |
|----------|------|-------|
| `landmarks` | resources-common.js | Screen reader navigation |
| `toolbar.ariaLabels` | resources-common.js | Bottom toolbar labels |
| `logoAltText` | resources-common.js | Logo alt text |
| `upperLeftMenuAriaLabel` | resources-common.js | Navigation labels |
| `upperRightMenuAriaLabel` | resources-common.js | Navigation labels |
| `backButtonAriaLabel` | resources-common.js | Navigation labels |
| `bookmarkAriaLabel` | resources-common.js | Bookmark labels |
| `socialsharing` | resources-common.js | Share image text |
| `favorites` | resources-common.js | Bookmarks popup |
| `audio.strings` | resources-common.js | Audio UI strings |
| `audio.ariaLabels` | resources-common.js | Audio control labels |
| `search.ariaLabels` | resources-common.js | Search input labels |
| `sidelinks` | resources.js | App menu items |
| `settings` | resources.js | App settings menu |
| `search.prompt` | resources.js | App search placeholder |
| `audio.substitutions` | resources.js | App-specific TTS substitutions |
| `intro` | resources.js | App tour steps |
| `calculator` | resources.js | SA only |
| `methods` | resources.js | FP only |

### Available Locales in SA-f7

The following locales have `resources-common.js` files available to copy:

| Locale | Language |
|--------|----------|
| en | English |
| es | Spanish |
| fr | French |
| sw | Swahili |
| am | Amharic |
| om | Oromo |
| rw | Kinyarwanda |
| lg | Luganda |
| pt | Portuguese |
| ig | Igbo |
| yo | Yoruba |

**For locales not in SA-f7**: Copy the English `resources-common.js` and translate the strings.

---

## Accessibility: Header Aria Labels

The header navbar elements (logo, left menu, right menu, back button) have their aria-labels set automatically by the `hesperian-mobile` library. No app-level code is required.

The library handles setting these attributes on `page:init`:
- Logo image alt text from `common.logoAltText` resource
- Left menu aria-label from `common.upperLeftMenuAriaLabel` resource
- Right menu aria-label from `common.upperRightMenuAriaLabel` resource
- Back button aria-label from `common.backButtonAriaLabel` resource

These are defined in `resources-common.js` for each locale.

---

## Accessibility: Techniques Reference

### Dynamic ARIA Labels

Use `data-aria-label` for labels that update with locale:

```html
<button data-aria-label="audio.ariaLabels.play">
  <i class="material-icons" aria-hidden="true">play_arrow</i>
</button>
```

### Bookmark Labels

Bookmark checkboxes use `data-bookmark-for`:

```html
<input type="checkbox" data-bookmark-for="{{page.title}}"/>
```

### Images

```html
<!-- Decorative -->
<img src="icon.png" alt="">

<!-- Informative -->
<img src="warning.png" alt="Warning">

<!-- Icons in buttons -->
<button aria-label="Play">
  <i class="material-icons" aria-hidden="true">play_arrow</i>
</button>
```

### Custom Keyboard Handlers

```javascript
import { isActivationKey } from "hesperian-mobile";

$button.attr("role", "button");
$button.attr("tabindex", "0");
$button.on("keydown", function(e) {
  if (isActivationKey(e)) {
    e.preventDefault();
    handleClick();
  }
});
```

### Focus Trap for Custom Modals

```javascript
import { createFocusTrapHandler } from "hesperian-mobile";

$popup.on("keydown", createFocusTrapHandler());
```

### Smart Select Accessibility

```javascript
import { createSmartSelectAccessibilityHandlers } from "hesperian-mobile";

app.smartSelect.create({
  el: element,
  openIn: "popup",
  on: createSmartSelectAccessibilityHandlers()
});
```

---

## Common Issues

| Issue | Solution |
|-------|----------|
| `Template7 is not defined` | Add `import Template7 from "template7";` |
| `createApp is not a function` | Use `initApp` instead of `createApp` |
| `window.app` is undefined | Use `getApp()` from hesperian-mobile |
| `app.t7.registerHelper` fails | Use `Template7.registerHelper()` directly |
| Sass error about `@import` | Convert to `@use "..." as *;` |
| Symlink overwritten after npm install | Re-create: `rm -rf node_modules/hesperian-mobile && ln -s ../../hesperian-mobile node_modules/hesperian-mobile` |
| Router not navigating | Update route async signature to use `context` parameter |
| Search shows "undefined" | Change `search: "string"` to `search: { prompt: "string", ariaLabels: {...} }` **in ALL locales** - check with `grep -r 'search: "' www/locales/` |
| Missing aria labels on logo/menus | Ensure `resources-common.js` exists for each locale with `landmarks`, `toolbar`, `logoAltText`, navigation labels. Import and add `common: commonResources` in `resources.js`. |
| Missing `@messageformat/core` | Add `"@messageformat/core": "^3.0.0"` to dependencies |
| `Cannot read properties of undefined (reading 'extend')` | Replace `window.app` with `getApp()` |

---

## Migration Checklist

### Setup
- [ ] `../hesperian-mobile` on `feat/updatef7` branch
- [ ] Ran `npm install` and `npm link` in hesperian-mobile
- [ ] Created symlink: `ln -s ../../hesperian-mobile node_modules/hesperian-mobile`

### Dependencies
- [ ] Updated `.node-version` to v18+
- [ ] Updated `package.json`
- [ ] Ran `npm install`
- [ ] Re-created hesperian-mobile symlink
- [ ] Created `vite.config.js`
- [ ] Deleted `webpack.config.js`

### Code
- [ ] Updated imports in `www/js/app.js`
- [ ] Changed `createApp` to `initApp`
- [ ] Updated `root` to `el` in config
- [ ] Updated ALL files with `framework7.esm.bundle` or `from 'framework7'` imports
- [ ] Replaced ALL `window.app` with `getApp()`
- [ ] Updated `app.t7.registerHelper` to `Template7.registerHelper`
- [ ] Converted custom routes to new async signature
- [ ] Removed filter routes (if any)

### Sass
- [ ] Updated `theme.scss` to use `@forward`
- [ ] Converted all `@import` to `@use "..." as *;`

### Build
- [ ] Build succeeds: `make bundle`

### Accessibility Resources (must be added to ALL locales)
- [ ] Created `resources-common.js` for each locale with common UI strings
- [ ] Updated `resources.js` to import and use `common: commonResources`
- [ ] Moved common resources to `resources-common.js`: landmarks, toolbar, logoAltText, navigation labels, favorites, audio.strings, audio.ariaLabels, search.ariaLabels, socialsharing
- [ ] Kept app-specific resources in `resources.js`: sidelinks, settings, intro, search.prompt, audio.substitutions
- [ ] Verified: `grep -r 'commonResources' www/locales/*/resources/resources.js` finds ALL locales

### Testing
- [ ] App loads in browser
- [ ] No JavaScript errors in console
- [ ] Navigation works
- [ ] Search placeholder shows correctly (not "undefined")
- [ ] Language switching works
- [ ] Audio works (if applicable)
- [ ] Keyboard navigation works
- [ ] Compare behavior with reference: `../hesperian-mobile-APP/`
- [ ] Compare with upgraded SA: `../hesperian-mobile-SA-f7/`

---

## GitHub Actions - testsite.yaml

Update `.github/workflows/testsite.yaml` to use the new Vite build system:

```yaml
name: Build test site

on: push

jobs:
  build:
    runs-on: ubuntu-latest
    env:
      BRANCH_NAME: ${{ github.head_ref || github.ref_name }}
      AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
      AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 22.3.0
      - run: npm ci
      - run: make bundle site
      - run: ./node_modules/.bin/deploy-aws-s3-cloudfront --non-interactive --source ./dist-web --bucket hesperian-test-site --destination www/${GITHUB_REPOSITORY}/${BRANCH_NAME} --distribution E1IR6U5GON3FEZ --invalidation-path "/*"
      - run: npx playwright install --with-deps
      - run: make test-a11y-all
      - run: ./node_modules/.bin/deploy-aws-s3-cloudfront --non-interactive --source ./build/reports/ --bucket hesperian-test-site --destination www/${GITHUB_REPOSITORY}/${BRANCH_NAME}/reports --distribution E1IR6U5GON3FEZ --invalidation-path "/www/${GITHUB_REPOSITORY}/${BRANCH_NAME}/reports"
```

**Key changes from old testsite.yaml:**
- `node-version`: `15.14.0` → `22.3.0`
- Removed Docker build steps (`make build` in docker container)
- Changed build command: `make docker-webpack docker-site` → `make bundle site`
- Added Playwright installation: `npx playwright install --with-deps`
- Added accessibility testing: `make test-a11y-all`
- Added reports deployment step

---

## Required Assets

### HHG Logo

Ensure `www/img/HHG-logo.png` exists. This logo is displayed in the app header. Copy from another working app (e.g., SA-f7) if missing.

### Footer Partial in HTML Templates

**Critical**: All HTML templates in `www/locales/*/` must include the `{{> footer}}` partial to render the bottom toolbar.

Add `{{> footer}}` before the closing `</div>` of the page element:

```html
<div data-page="..." class="page ...">
  {{> header}}
  <div class="page-content">
    <!-- page content -->
  </div>
{{> footer}}
</div>
```

The footer partial (defined in `hesperian-mobile/lib/appTemplates.js`) renders:
- Home button (links to `/`)
- Help button (links to `/pages/J4-help`)
- Audio controls button (expands to show playback controls)
- Bookmarks button (opens favorites popup)

**To add footer to all existing templates:**
```bash
cd www/locales
for locale in */; do
  for file in "$locale"*.html; do
    if [ -f "$file" ] && ! grep -q "> footer" "$file"; then
      awk '
      {lines[NR] = $0}
      END {
        for (i = NR; i >= 1; i--) {
          if (match(lines[i], /^<\/div>/)) {
            for (j = 1; j < i; j++) print lines[j]
            print "{{> footer}}"
            print lines[i]
            for (j = i+1; j <= NR; j++) print lines[j]
            break
          }
        }
      }' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
    fi
  done
done
```

---

## Accessibility Testing Dependencies

To enable `make test-a11y` and `make test-a11y-all`, add these devDependencies:

```json
"devDependencies": {
  "@axe-core/playwright": "^4.10.0",
  "cheerio": "^1.0.0",
  "handlebars": "^4.7.8",
  "jsdom": "^27.4.0",
  "playwright": "^1.49.0",
  "deploy-aws-s3-cloudfront": "^3.8.0"
}
```

After installing, run:
```bash
npx playwright install
```

Then test:
```bash
make test-a11y      # English locale only
make test-a11y-all  # All locales
```

Reports are generated in `build/reports/accessibility/`.

---

## Reference Files

When stuck, consult these working examples in `../hesperian-mobile-SA-f7/`:

| Your File | Reference |
|-----------|-----------|
| `www/js/app.js` | `../hesperian-mobile-SA-f7/www/js/app.js` |
| `www/css/styles.scss` | `../hesperian-mobile-SA-f7/www/css/styles.scss` |
| `www/css/theme.scss` | `../hesperian-mobile-SA-f7/www/css/theme.scss` |
| `vite.config.js` | `../hesperian-mobile-SA-f7/vite.config.js` |
| `package.json` | `../hesperian-mobile-SA-f7/package.json` |
| Locale resources | `../hesperian-mobile-SA-f7/www/locales/en/resources/resources.js` |

For Framework7 API documentation: https://framework7.io/
