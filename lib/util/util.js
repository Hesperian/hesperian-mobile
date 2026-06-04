/*
 *  util.js
 *  low-level utilities for use in the app, but also in compilation of the app
 *
 *  NOTE: searchNormalForm has a sibling ES-module copy at
 *  lib/util/search-normal-form.js. Keep the two implementations in sync.
 */

// Canonical normal form for search: lowercase, fold accents, fold common
// Arabic letter variants so searches match regardless of which form the user
// typed or the source document used.
//
// Steps:
//   1. Lowercase (no-op for Arabic).
//   2. NFD normalize to separate combining marks from base letters.
//      Crucially, this also decomposes Arabic precomposed letters:
//        أ (U+0623) → ا (U+0627) + U+0654 (combining hamza above)
//        آ (U+0622) → ا (U+0627) + U+0653 (combining maddah above)
//        إ (U+0625) → ا (U+0627) + U+0655 (combining hamza below)
//        ؤ (U+0624) → و + U+0654
//        ئ (U+0626) → ي + U+0654
//   3. Strip Latin combining marks (U+0300–U+036F) and Arabic combining marks
//      (tashkeel/harakat U+064B–U+065F, plus superscript alef U+0670).
//      Combined with step 2, this folds alef/waw/ya hamza/maddah variants to
//      their base form for free.
//   4. Strip tatweel (U+0640) — a decorative letter-joining character with no
//      semantic value.
//   5. Fold alef maqsura (ى U+0649) to ya (ي U+064A). Users frequently confuse
//      these.
//   6. Fold ta marbuta (ة U+0629) to ha (ه U+0647). Same reason.
function searchNormalForm(str) {
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ًͯ-ٰٟ]/g, '')
        .replace(/ـ/g, '')
        .replace(/ى/g, 'ي')
        .replace(/ة/g, 'ه');
}

module.exports.searchNormalForm = searchNormalForm;
