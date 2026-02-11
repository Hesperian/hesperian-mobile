# CLAUDE.md

## Overview

This is **hesperian-mobile**, the shared library for Hesperian mobile health applications. It provides core functionality consumed by multiple app repos (SA, FamilyPlanning, SafeBirth) via npm/git dependency.

This is a **library**, not a standalone app. It has no `dist/` or `make bundle` — consuming apps import from it.

## Repository Structure

```
index.js              — Public API exports
lib/                  — Core modules
  app.js              — App initialization (initApp, getApp)
  appConfig.js        — App configuration management
  navigation.js       — Framework7 page navigation
  resources.js        — i18n resource loading
  routes.js           — Route definitions
  bootstrap.js        — App bootstrap sequence
  accessibility/      — Accessibility utilities (KEYS, focus trap, ARIA injection)
  accordion/          — Collapsible accordion component
  audio-buttons/      — Text-to-speech system (audio-buttons.js, audio.js, audio-engine.js)
  calendar/           — Calendar/date picker (WAI-ARIA grid pattern)
  checklist/          — Checklist component
  css/                — Shared SCSS styles and CSS variables
  favorites/          — Favorites/bookmarking with custom checkbox a11y
  intro/              — App introduction/tour (uses shepherd.js)
  search/             — Search system (search-logic.js + search.js)
  sidepanels/         — Side panel navigation
  video/              — Video component
build/                — Build-time tooling
  preprocess.js       — HTML preprocessing, search index extraction
  preprocess.test.js  — Tests for preprocessing
vite/                 — Vite build config factory for consuming apps
  index.js            — Vite config factory, imports build/preprocess.js
bin/                  — CLI tools for consuming apps
cordova/              — Cordova plugin configs and hooks
```

## Development

### Testing
```bash
npm test              # Run tests once (vitest)
npm run test:watch    # Watch mode
```

Tests live alongside source: `lib/**/*.test.js` and `build/**/*.test.js`.

### Code Style
```bash
npm run format        # Prettier (single quotes)
```

### Working with Consuming Apps

Consuming apps reference this library via git tag in their `package.json`. For local development:
```bash
# In consuming app directory:
make link             # npm links to local ../hesperian-mobile
```

## Key Technical Details

### Framework7 v8
The app framework. Components use F7 page lifecycle events (`page:init`, `page:beforeremove`, etc.) and F7 DOM utilities via `dom7`.

### Public API (index.js)
Exports: `getApp`, `initApp`, `appConfig`, `resources`, `logEvent`, `KEYS`, `isActivationKey`, `isEscapeKey`, `createSmartSelectAccessibilityHandlers`, `getVisibleFocusableElements`, `createFocusTrapHandler`, `injectAriaIntoElement`.

Consuming apps also import submodules directly (e.g., `hesperian-mobile/lib/accessibility/accessibility`).

### Search System
- Pure logic in `lib/search/search-logic.js` (no DOM deps, unit tested)
- DOM/F7 integration in `lib/search/search.js`
- Two modes: Global (cross-page virtual list) and Local (within-page section filter)
- Keywords extracted at build time by `build/preprocess.js` from `data-title`, `data-keywords`, `data-section` HTML attributes
- `data-search-title`: optional shorter display title (doesn't affect matching)
- Matching: each query word must prefix-match at least one keyword (AND across words)

### Audio/TTS System
- `lib/audio-buttons/audio-buttons.js` — UI component, play/pause controls
- `lib/audio-buttons/audio.js` — Speech state management (`nowPlaying`, `speakingID`)
- `lib/audio-buttons/audio-engine.js` — TTS engine interface
- Uses `cordova-plugin-tts-advanced` (separate repo) on native platforms

### Build System (Vite)
- `vite/index.js` exports a config factory used by consuming apps
- `build/preprocess.js` scans HTML at build time, extracts search index JSON
- No webpack — fully migrated to Vite

### Accessibility
- `lib/accessibility/accessibility-util.js` — KEYS constants, `isActivationKey`, `isEscapeKey`
- `lib/accessibility/accessibility.js` — ARIA injection, VoiceOver focus workarounds
- `lib/accessibility/focus-trap.js` — Focus trap and focusable element utilities
- `lib/accessibility/smart-select-a11y.js` — Framework7 smart-select accessibility
- Focus indicators use WCAG C40 two-color contrast: `--hm-focus-color` / `--hm-focus-color-secondary`
- Custom checkboxes use visually-hidden inputs (never `display: none`) with `input:focus-visible + label` styling

### SCSS
- Styles in `lib/css/` use CSS custom properties (`--hm-*` prefix)
- Components have co-located `.scss` files (e.g., `lib/favorites/favorites.scss`)

## Testing with Chrome MCP

When testing via a consuming app:
```
http://localhost/{path-to-app}/dist/index.html?lang={code}#/{route}
```
- Query params (`?lang=en`) come BEFORE the hash
- Hash route (`#/`) is REQUIRED for app initialization
- Mobile viewport: `resize_page width=375 height=667`
- After code changes: `make bundle` in the app, then reload with `ignoreCache: true`
