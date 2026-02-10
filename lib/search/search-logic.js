/**
 * search-logic.js - Pure search matching logic (no DOM dependencies)
 *
 * This module contains the core search algorithm used by both global and local
 * search. It is separated from search.js so it can be unit tested without
 * requiring Framework7 or browser APIs.
 *
 * Search matching:
 * - The query string is normalized (lowercased, diacritics removed) and split
 *   into individual words.
 * - Each query word must prefix-match at least one keyword for a result to
 *   match (AND across query words, OR across keywords per word).
 * - For items with a title, a raw substring match is also checked.
 *
 * The search index (keywords per page/section) is built at compile time by
 * build/preprocess.js, which scans HTML data-title/data-keywords attributes.
 */

import { searchNormalForm } from "../util/search-normal-form";

/**
 * Parse a query string into normalized search words.
 * Splits on non-word characters and normalizes each word (lowercase, no diacritics).
 * Empty tokens are filtered out.
 */
export function parseQuery(query) {
  const normalized = searchNormalForm(query);

  return normalized
    .split(/[^\w]+/)
    .filter((qw) => qw !== "");
}

/**
 * Test whether a single query word prefix-matches any keyword.
 */
export function testOneQueryword(queryword, keywords) {
  for (let k = 0; k < keywords.length; k++) {
    if (keywords[k].startsWith(queryword)) {
      return true;
    }
  }

  return false;
}

/**
 * Test whether ALL query words match (each must prefix-match at least one keyword).
 * Returns false if querywords is empty.
 */
export function testQuerywords(querywords, keywords) {
  for (let q = 0; q < querywords.length; q++) {
    if (!testOneQueryword(querywords[q], keywords)) {
      return false;
    }
  }
  return querywords.length > 0;
}

/**
 * Test whether a search query matches an item.
 *
 * Matching is attempted in order:
 * 1. Raw substring match of the full query against the title (case-insensitive).
 * 2. Keyword prefix-match against titleKeywords.
 * 3. Keyword prefix-match against general keywords.
 *
 * @param {string} query - The raw query string (for substring title matching).
 * @param {string[]} q - The parsed/normalized query words.
 * @param {string[]} keywords - Normalized keywords for the item.
 * @param {string} [title] - The item's display title (for substring matching).
 * @param {string[]} [titleKeywords] - Normalized title words (for prefix matching).
 * @returns {boolean}
 */
export function testQuery(query, q, keywords, title, titleKeywords) {
  if (q.length === 0) {
    return false;
  }
  if (title) {
    const querylc = query.toLowerCase();
    const titlelc = title.toLowerCase();
    if (titlelc.indexOf(querylc) !== -1) {
      return true;
    }
  }
  if (titleKeywords && testQuerywords(q, titleKeywords)) {
    return true;
  }
  return testQuerywords(q, keywords);
}

/**
 * Create a search item from a page or section source object.
 * If the source has a searchTitle, it is used as the display title
 * in search results while the original title is still used for matching.
 */
export function createSearchItem(itemSource) {
  const item = {
    title: itemSource.title,
    titleKeywords: itemSource.titleKeywords,
    path: itemSource.route,
    sectionId: itemSource.sectionId,
    keywords: itemSource.keywords || [],
  };
  if (itemSource.searchTitle) {
    item.searchTitle = itemSource.searchTitle;
  }
  return item;
}

/**
 * Return the display title for a search result item.
 * Prefers searchTitle (shorter override) over title.
 */
export function displayTitle(item) {
  return item.searchTitle || item.title;
}

/**
 * Create search items for local (within-page) search from section data.
 */
export function createLocalPageSearchItems(sections) {
  return sections.map((section) => createSearchItem(section));
}

/**
 * Create search items for global search from all pages data.
 * Includes both page-level and section-level items.
 * Only pages with a title are included.
 */
export function createPageItems(pages) {
  const ret = [];

  for (let k in pages) {
    const p = pages[k];
    if (p.title) {
      ret.push(createSearchItem(p));

      if (p.sections) {
        p.sections.forEach((section) => {
          ret.push(createSearchItem(section));
        });
      }
    }
  }

  return ret;
}
