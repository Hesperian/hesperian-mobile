# Framework7 v3.6 → v8.3 Upgrade Guide

This document describes the completed upgrade of the hesperian-mobile library from Framework7 v3.6 to v8.3, including the migration from Webpack to Vite as the build tool.

## What Changed

### Framework7 Version
- **From**: Framework7 v3.6.x
- **To**: Framework7 v8.3.4

### Key Dependencies Updated
- `framework7`: `^3.6.X` → `^8.3.4`
- `framework7-icons`: `^3.0.1` → `^5.0.5`
- Added explicit dependencies (Framework7 v8 no longer bundles these):
  - `dom7`: `^4.0.6`
  - `template7`: `^1.4.2`
  - `moment`: `^2.29.4`
  - `messageformat`: `^2.0.5`

### Build System
- **Bundler**: Webpack 4 → Webpack 5 + Vite 6.4
- **Sass**: node-sass → sass (dart-sass) v1.93
- **Babel**: v7.7 → v7.25
- Added `core-js@3` for polyfills
- Primary build tool is now Vite; Webpack 5 maintained for compatibility

### Import Pattern Changes

**Before (v3.6):**
```javascript
import Framework7, { Dom7, Template7 } from "framework7/framework7.esm.bundle.js";
import "framework7-icons";
```

**After (v8.3):**
```javascript
import "framework7/css/bundle";
import "framework7-icons/css/framework7-icons.css";
import Framework7, { Dom7 } from "framework7/bundle";
import Template7 from "template7";
```

### App Initialization Changes

**Config property renamed:**
```javascript
// Before
const app = new Framework7({
  root: "#app",
  data: function() { return config; }
});

// After
const app = new Framework7({
  el: "#app",  // renamed from 'root'
  store: Framework7.createStore({ state: config })  // replaced 'data'
});
```

### Router API Changes

**Route resolution:**
```javascript
// Before (v3.6)
function resolver(routeTo, routeFrom, resolve, reject) {
  resolve({
    templateUrl: `./locales/${locale}/${pageId}.html`
  });
}

// After (v8.3)
async function resolver(context) {
  const { app, to, resolve, reject } = context;
  const html = await loadLocalizedContent(app, url);
  const template = Template7.compile(html);
  const content = template({});
  resolve({ content });
}
```

**Route signature:**
- Old: `async: function(routeTo, routeFrom, resolve, reject)`
- New: `async(context)` where context contains `{ app, to, from, resolve, reject }`

### Sass Module System

All Sass files migrated from `@import` to `@use`:

```scss
// Before
@import "theme.scss";
@import "./navbar.scss";

// After
@use "./theme.scss" as *;
@use "./navbar.scss";
```

**Exception**: Framework7 CSS still uses `@import` because the library doesn't support Sass modules:
```scss
@import "framework7/css/bundle";  // Required for F7
```

### CSS Cross-Browser Updates

Added standard properties alongside vendor-prefixed versions:
```scss
.item-text {
  line-clamp: inherit;           // Added
  -webkit-line-clamp: inherit;   // Existing
}
```

### Build Targets

The Makefile now uses Vite by default:

```makefile
# Before
webpack:
	$(WEBPACK) --mode=${WEBPACK_MODE}

watch:
	$(WEBPACK) --watch

# After
webpack:
	$(VITE) build --mode=${VITE_MODE}

watch:
	$(VITE) build --mode=development --watch
```

### Module Exports for Browser Code

Created ES module wrappers for browser-side utilities:

**New file**: `lib/util/search-normal-form.js`
```javascript
export function searchNormalForm(str) {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
```

**Usage updated** in `lib/search/search.js`:
```javascript
// Before
const util = require("../util/util");
util.searchNormalForm(q);

// After
import { searchNormalForm } from "../util/search-normal-form";
searchNormalForm(q);
```

**Note**: `lib/util/util.js` still exports CommonJS for build-time preprocessing in `webpack/webpack.preprocess.js`.

## Files Changed

### Core Framework Integration
- `lib/app.js` - Framework7 initialization, config schema, store setup
- `lib/routes.js` - Router resolution pattern, Template7 compilation
- `lib/appConfig.js` - Minor updates for store integration

### Component Updates
- `lib/search/search.js` - Import pattern, ES module usage
- `lib/filter/filter.js` - Import updates
- `lib/favorites/favorites.js` - Import updates
- `lib/checklist/checklist.js` - Import updates
- `lib/sidepanels/sidepanels.js` - Import updates
- `lib/calendar/calendar.js` - Import updates
- `lib/accordion/accordion.js` - Import updates
- `lib/intro/intro.js` - Import updates
- `lib/socialsharing/socialsharing.js` - Import updates
- `lib/audio-buttons/audio-buttons.js` - Import updates
- `lib/video/video.js` - Import updates
- `lib/analytics/analytics.js` - Import updates

### Sass Files (all converted @import → @use)
- `lib/css/app.scss`
- `lib/css/buttons.scss`
- `lib/css/buttons-common.scss`
- `lib/css/navbar.scss`
- `lib/css/navigation.scss`
- `lib/css/captions.scss`
- `lib/css/util.scss`
- `lib/accordion/accordion.scss`
- `lib/audio-buttons/audio.scss`
- `lib/calendar/calendar.scss`
- `lib/checklist/checklist.scss`
- `lib/favorites/favorites.scss`
- `lib/filter/filter.scss`
- `lib/intro/intro.scss`
- `lib/search/search.scss`
- `lib/sidepanels/sidepanels.scss`
- `lib/socialsharing/socialsharing.scss`

### Build Configuration
- `package.json` - Dependencies updated
- `util/hesperian-makefile` - Vite integration
- `webpack/index.js` - Webpack 5 updates (compatibility)
- `vite/index.js` - **New**: Vite config factory
- `example/vite.config.js` - **New**: Example app Vite config
- `example/package.json` - Local development dependency
- `lib/util/search-normal-form.js` - **New**: ES module wrapper

## Building and Testing

### Local Development Setup

1. **Install dependencies**:
   ```bash
   npm install
   cd example && npm install
   ```

2. **Build the example app**:
   ```bash
   cd example
   make webpack  # Uses Vite despite target name
   ```

3. **Watch mode for development**:
   ```bash
   cd example
   make watch    # Vite watch with hot reload
   ```

4. **Test the build**:
   ```bash
   cd example/dist
   python3 -m http.server 8080
   # Open http://localhost:8080
   ```

### Cordova Builds

The Cordova build process remains the same:
```bash
cd example
make build    # Full Cordova release build in ./output
```

---

## Migrating Apps That Use This Library

This section provides complete instructions for updating downstream apps that depend on `hesperian-mobile` to work with the Framework7 v8.3 upgrade.

### Prerequisites

- Node.js 18+ (Framework7 v8 requirement)
- Modern browser targets (Safari/Chrome evergreen, Android 4.4+, iOS 9+)

### Step 1: Update Dependencies

Update your app's `package.json`:

```json
{
  "dependencies": {
    "hesperian-mobile": "^4.0.0",
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

Then run:
```bash
npm install
```

### Step 2: Create Vite Configuration

Create `vite.config.js` in your app root:

```javascript
const hesperianVite = require("hesperian-mobile/vite");
const appConfig = require("./app-config.json");

module.exports = hesperianVite.createConfig({
  rootDir: __dirname,
  appConfig,
  // Optional: additional static assets to copy
  additionalAssets: [
    // { from: "custom-assets", to: "." }
  ]
});
```

### Step 3: Update App Initialization Code

If your app has custom initialization code in `www/js/app.js`:

**Before:**
```javascript
import Framework7, { Dom7, Template7 } from "framework7/framework7.esm.bundle.js";
import "framework7-icons";

const app = createApp({
  configVersion: "1.0.0",
  f7: {
    root: "#app",
    data: function() {
      return { appData, localeData };
    }
  }
});
```

**After:**
```javascript
import "framework7/css/bundle";
import "framework7-icons/css/framework7-icons.css";
import Framework7, { Dom7 } from "framework7/bundle";
import Template7 from "template7";

const store = Framework7.createStore({
  state: {
    appData: appData,
    localeData: localeData
  }
});

const app = createApp({
  configVersion: "1.0.0",
  appData: appData,
  localeData: localeData,
  f7: {
    el: "#app",  // renamed from 'root'
    store: store
  }
});
```

### Step 4: Update Custom Routes

If your app defines custom routes via `appRoutes` callback:

**Before:**
```javascript
function appRoutes(appConfig) {
  return [{
    path: '/custom',
    async: function(routeTo, routeFrom, resolve, reject) {
      const locale = appConfig.locale();
      resolve({
        templateUrl: `./locales/${locale}/custom.html`
      });
    }
  }];
}
```

**After:**
```javascript
import Template7 from "template7";

async function loadLocalizedContent(app, url) {
  const result = await fetch(url);
  if (!result.ok) {
    throw new Error(`Failed to fetch ${url}: ${result.status}`);
  }
  return result.text();
}

function appRoutes(appConfig) {
  return [{
    path: '/custom',
    async(context) {
      const { app, to, resolve, reject } = context;
      const locale = appConfig.locale();
      const url = `./locales/${locale}/custom.html`;
      
      try {
        const html = await loadLocalizedContent(app, url);
        const template = Template7.compile(html);
        const content = template({});
        resolve({ content });
      } catch (error) {
        console.error('Route error', { url, error });
        reject(error);
      }
    }
  }];
}
```

### Step 5: Update Sass Files

Convert all `@import` statements to `@use`:

**Before:**
```scss
@import "theme.scss";
@import "../lib/css/buttons.scss";

.my-component {
  color: $primary-color;  // From theme.scss
}
```

**After:**
```scss
@use "./theme.scss" as *;
@use "../lib/css/buttons.scss";

.my-component {
  color: $primary-color;  // From theme.scss
}
```

**Important exceptions:**
- Framework7 CSS must still use `@import "framework7/css/bundle";`
- Use `as *` when you need variables/mixins from the imported module
- Use plain `@use` for side-effect imports (just include the CSS)

### Step 6: Update Build Scripts

Update your `Makefile` or build scripts:

**Before:**
```makefile
webpack:
	../node_modules/.bin/webpack --mode=production
```

**After:**
```makefile
NODE_BIN := $(CURDIR)/node_modules/.bin
VITE := $(NODE_BIN)/vite

webpack:
	rm -rf dist
	$(VITE) build --mode=production
	${MAKE_WEBINDEX} app ./app-config.json www-templates > dist/index.html

watch:
	$(VITE) build --mode=development --watch
```

### Step 7: Fix CommonJS Requires in Browser Code

If you have any `require()` calls in browser-side JavaScript:

**Before:**
```javascript
const util = require("../util/util");
util.someFunction();
```

**After:**
```javascript
import { someFunction } from "../util/util";
someFunction();
```

If the module doesn't export ES modules, create a wrapper:

**util/my-util.js** (ES module wrapper):
```javascript
export function myFunction(str) {
  // implementation
}
```

### Step 8: Update CSS Class Names (if applicable)

Framework7 v8 may have deprecated some class names. Check your custom CSS/HTML for:

- `.list-block` → `.list` (check Framework7 docs for current names)
- `.content-block` → `.block`
- Other deprecated selectors

### Step 9: Test Your App

1. **Build the app**:
   ```bash
   make webpack  # Now uses Vite
   ```

2. **Check for build errors**:
   - Missing imports
   - Sass compilation errors
   - Asset loading issues

3. **Test in browser**:
   ```bash
   cd dist
   python3 -m http.server 8080
   ```
   
   Open http://localhost:8080 and check:
   - Navigation works
   - Search works
   - Language switching works
   - Audio/video players work
   - All pages load correctly
   - Check browser console for errors

4. **Test Cordova build** (if applicable):
   ```bash
   make build
   ```
   
   Test on actual devices or emulators.

### Common Migration Issues

#### Issue: "Cannot find module 'framework7'"
**Solution**: Run `npm install` to ensure Framework7 v8.3.4 is installed.

#### Issue: "Template7 is not defined"
**Solution**: Add explicit import:
```javascript
import Template7 from "template7";
```

#### Issue: Sass compilation error about @import
**Solution**: Convert to `@use` (except for Framework7 CSS imports).

#### Issue: CSS not loading or fonts missing
**Solution**: Check that Vite config includes `base: "./"` for relative paths. The hesperian-mobile Vite config already handles this.

#### Issue: Router not navigating
**Solution**: Update route resolvers to use new async signature with context parameter.

#### Issue: "app.data is not a function"
**Solution**: Migrate to Framework7.createStore pattern (see Step 3).

### Getting Help

If you encounter issues not covered here:

1. Check the [Framework7 v8 documentation](https://framework7.io/)
2. Review the example app in `example/` directory of hesperian-mobile
3. Compare your code against the working example
4. Check browser console for specific error messages

### Migration Checklist

Use this checklist to track your migration progress:

- [ ] Updated package.json dependencies
- [ ] Created vite.config.js
- [ ] Updated app initialization (root → el, data → store)
- [ ] Converted custom routes to new async signature
- [ ] Migrated Sass @import to @use
- [ ] Updated build scripts to use Vite
- [ ] Replaced require() with import in browser code
- [ ] Updated deprecated CSS class names
- [ ] Build succeeds without errors
- [ ] App loads in browser
- [ ] Navigation works
- [ ] Search works
- [ ] Language switching works
- [ ] Audio/video works
- [ ] Cordova build succeeds (if applicable)
- [ ] Tested on target devices

---

## Reference: Framework7 Documentation

For the Framework7 library documentation, see:
- https://framework7.io/
- https://framework7.io/release-notes/
