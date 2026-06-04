/*
 * search-normal-form.js
 * Utility helpers exposed as ES modules for browser bundles.
 *
 * NOTE: searchNormalForm has a sibling CommonJS copy at lib/util/util.js
 * used by the Node-side build step. Keep the two implementations in sync.
 *
 * See the comment in lib/util/util.js for the rationale behind each step.
 */

export function searchNormalForm(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ًͯ-ٰٟ]/g, "")
    .replace(/ـ/g, "")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");
}
