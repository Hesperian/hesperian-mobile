/*
 * search-normal-form.js
 * Utility helpers exposed as ES modules for browser bundles.
 */

export function searchNormalForm(str) {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
