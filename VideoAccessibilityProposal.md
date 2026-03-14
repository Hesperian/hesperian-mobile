# Video Accessibility Proposal

## Current Issues

### 1. Tab focus bleed-through in fullscreen (confirmed)

When the CSS fullscreen stack (`.hm-video-stack.hm-fullscreen`) is active, the
background page is still fully interactive. The stack uses `position: fixed;
z-index: 9999` to visually cover everything, but the background DOM — nav bars,
page links, accordion items, other controls — is still reachable via Tab. A
keyboard or screen-reader user tabbing through the "fullscreen" video will
silently cycle into hidden page content.

**Root cause:** Nothing in `enterCssFullscreen()` suppresses focus on background
elements. Native browser fullscreen (`Element.requestFullscreen`) implicitly
isolates focus; our CSS-only approach does not.

### 2. No focus trap on the fullscreen stack

There is no keydown handler trapping Tab within the fullscreen stack. The
existing `createFocusTrapHandler()` in `lib/accessibility/focus-trap.js` already
implements wrapping Tab / Shift-Tab and Escape-to-close — it just isn't wired up
here.

### 3. No ARIA dialog semantics

The fullscreen stack has no `role`, `aria-modal`, or `aria-label`. Screen readers
have no signal that a modal context has opened or that background content is
inert.

### 4. Focus not managed on enter / exit

- **Enter:** Focus stays on whatever element was last focused (often outside the
  stack, or on the tap overlay which has no `tabindex`). Screen readers receive
  no announcement that the fullscreen player has opened.
- **Exit:** Focus is not returned to the element that triggered fullscreen.
  Keyboard users are left with no focused element after closing.

### 5. Tap overlay is not keyboard-accessible

`.hm-tap-overlay` is a `div` with a click listener but no `tabindex` and no
keyboard handler. It is invisible to keyboard users. On desktop, the VideoJS
fullscreen button is the correct trigger; on mobile there is no keyboard, but the
overlay should still carry ARIA markup for screen readers that may announce it.

### 6. Caption zone not announced to screen readers

The custom `.hm-caption-text` element is updated by JS but has no `aria-live`
attribute. Screen readers ignore DOM text mutations unless the region is marked as
a live region. Captions are therefore completely silent for VoiceOver / TalkBack
users.

### 7. VideoJS controls zone (desktop inline — likely fine)

When the controls are moved into `.hm-controls-zone` via `appendChild`, VideoJS's
own keyboard handling (Space=play/pause, arrow keys=seek, etc.) travels with the
element because VideoJS attaches listeners to the `.video-js` element not to the
control bar. This should still work. Verify during testing.

---

## Proposed Changes

### A. Background `inert` on enter / exit fullscreen

`inert` propagates downward only (parent → all descendants, not overrideable by
children). Because `enterCssFullscreen` moves the stack to `document.body`, the
stack becomes a sibling of `#app` — so setting `#app.inert = true` has no effect
on the stack.

**Decision: inert `#app` only.**

All Framework7 content (views, pages, navbars, toolbars, panels) lives inside
`#app`. Setting it inert in one call catches everything. The stack is a body
sibling and is unaffected.

In `enterCssFullscreen(stack)`:
```js
document.getElementById('app').inert = true;
```

In `exitCssFullscreen(stack)`:
```js
document.getElementById('app').inert = false;
```

`inert` is universally supported (Chrome 102+, Safari 15.5+, Firefox 112+,
Android WebView 102+). It blocks Tab focus, pointer events, and hides the subtree
from the accessibility tree in one attribute.

*Edge case noted and accepted:* F7 sheets or popups appended directly to `body`
(outside `#app`) would not be caught. This is unlikely in practice and would only
arise as a content-authoring error (triggering a video while a sheet is open).
Re-evaluate if testing reveals an issue.

### B. ARIA dialog role on the fullscreen stack

In `enterCssFullscreen(stack)`:
```js
stack.setAttribute('role', 'dialog');
stack.setAttribute('aria-modal', 'true');
stack.setAttribute('aria-label', 'Video player');
```

In `exitCssFullscreen(stack)`:
```js
stack.removeAttribute('role');
stack.removeAttribute('aria-modal');
stack.removeAttribute('aria-label');
```

Added only when fullscreen so inline stacks (desktop non-fullscreen) are not
wrapped in a dialog role unnecessarily.

### C. Focus trap using existing `createFocusTrapHandler` ✅ Unblocked

`lib/accessibility/focus-trap.js` has been rewritten (commit `248ff86`) to accept
plain DOM elements with no Dom7 dependency. The `getCloseButton` callback now
receives and returns a plain `HTMLElement`. `video.js` can import and use it
directly.

In `enterCssFullscreen(stack)` / `exitCssFullscreen(stack)`:
```js
// Enter
import { createFocusTrapHandler } from '../accessibility/focus-trap';
const trapHandler = createFocusTrapHandler(el => el.querySelector('.hm-close-btn'));
stack.addEventListener('keydown', trapHandler);
stack._fsTrapHandler = trapHandler;

// Exit
if (stack._fsTrapHandler) {
  stack.removeEventListener('keydown', stack._fsTrapHandler);
  stack._fsTrapHandler = null;
}
```

The handler wraps Tab/Shift-Tab within visible focusable elements and routes
Escape to the close button click. Auto-hidden controls (opacity:0,
pointer-events:none) are not yet excluded from the Tab cycle — see §E below.

### D. Focus management on enter / exit

**Enter fullscreen:**
```js
// After adding stack to body, move focus to close button (always visible)
stack.querySelector('.hm-close-btn')?.focus();
```

**Exit fullscreen:** Save and restore the trigger element.

In `enterCssFullscreen(stack)`:
```js
stack._fsPreviousFocus = document.activeElement;
```

In `exitCssFullscreen(stack)`:
```js
const prev = stack._fsPreviousFocus;
stack._fsPreviousFocus = null;
// Defer so the stack finishes moving back in the DOM first
setTimeout(() => prev?.focus(), 0);
```

### E. Auto-hide controls: adjust CSS to use `visibility` not `opacity` ⏸ Deferred

The focus trap's visibility check looks at `display` and `visibility` but not
`opacity`. Hidden overlay controls (`hm-controls-hidden`) use `opacity: 0;
pointer-events: none` — they remain technically focusable by Tab while hidden.

The fix would be to add `visibility: hidden` to `.hm-controls-hidden`:
```scss
opacity: 0;
pointer-events: none;
visibility: hidden;  // excludes from focus cycle and accessibility tree
```

`visibility: hidden` removes elements from the accessibility tree and from
`getVisibleFocusableElements()`, while CSS opacity/transition still produces a
visual fade (since `visibility` transitions discretely at the end of the fade,
which is acceptable).

**Decision:** Deferred pending user feedback on whether the transition behaviour
is acceptable in practice. In the interim, Tab will cycle through hidden controls
while the overlay is auto-hidden — a minor issue since Escape and the close button
remain reachable.

### F. Tap overlay keyboard accessibility

On desktop the VideoJS fullscreen button already provides keyboard entry to
fullscreen, so the tap overlay is only relevant on mobile. However, for
completeness and to avoid a keyboard dead zone:

```js
tapOverlay.setAttribute('tabindex', '0');
tapOverlay.setAttribute('role', 'button');
tapOverlay.setAttribute('aria-label', 'Play video fullscreen');
tapOverlay.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    if (!stack.classList.contains('hm-fullscreen')) enterFullscreen();
  }
});
```

On mobile (where tap overlay is the primary entry point), this also allows
external keyboards (Bluetooth) to trigger fullscreen.

### G. Caption live region

Add `aria-live="polite"` and `aria-atomic="true"` to `.hm-caption-text` so
screen readers announce caption updates:

In `ensureStack()` when building the caption zone:
```js
captionText.setAttribute('aria-live', 'polite');
captionText.setAttribute('aria-atomic', 'true');
```

`polite` (not `assertive`) so announcements don't interrupt other speech.
`atomic="true"` so the whole caption line is read, not just the changed portion.

---

## Files Affected

| File | Changes |
|------|---------|
| `lib/accessibility/focus-trap.js` | ✅ Done — rewritten to plain DOM (commit `248ff86`) |
| `lib/video/video.js` | `enterCssFullscreen` / `exitCssFullscreen`: inert (§A), ARIA (§B), focus trap (§C), focus save/restore (§D). `ensureStack`: aria-live on caption (§G). `buildOverlayDOM` / `initMobileOverlay`: tabindex+role+keydown on tap overlay (§F). |
| `lib/video/video.scss` | ⏸ Deferred — add `visibility: hidden` to `.hm-controls-hidden` (§E). |

Import to add in `video.js`: `import { createFocusTrapHandler } from '../accessibility/focus-trap';`

---

## Non-Goals / Out of Scope

- **Android mobile Tab key:** Physical keyboards connected to Android are rare
  for this app's audience. The `inert` changes still help TalkBack users even
  without Tab key presence.
- **iOS VoiceOver swipe navigation:** VoiceOver swipe in fullscreen will be
  trapped by `inert` on the background. No additional changes needed.
- **VideoJS internal keyboard map** (Space, arrows, M, F keys): VideoJS handles
  these already. The focus trap passes through non-Tab/non-Escape keys, so VJS
  keyboard shortcuts continue to work once focus is inside the player element.
- **Caption styling / design changes:** Out of scope; this proposal is
  accessibility-only.

---

## Open Questions for Review

1. **`inert` selector completeness:** ✅ **Resolved.** Use `#app` only (see §A).
   All F7 content lives inside `#app`; the stack is a body sibling after the DOM
   move and is unaffected. Simpler and less error-prone than targeting individual
   F7 element types or iterating body children.

2. **`createFocusTrapHandler` adaptation:** ✅ **Resolved.** `focus-trap.js`
   rewritten (commit `248ff86`) to accept plain DOM elements. No Dom7 dependency.
   `video.js` can import `createFocusTrapHandler` directly.

3. **`visibility: hidden` on auto-hide controls:** ⏸ **Deferred.** Decision
   pending feedback on transition behaviour. See §E above.
