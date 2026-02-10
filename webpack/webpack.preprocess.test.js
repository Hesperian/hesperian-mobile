import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { processPage, keywordsStringToArray } = require("./webpack.preprocess");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tmpDir = path.join(__dirname, "__test_fixtures__");

function writeTmpPage(filename, html) {
  fs.writeFileSync(path.join(tmpDir, filename), html, "utf8");
}

beforeAll(() => {
  fs.mkdirSync(tmpDir, { recursive: true });
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ─── keywordsStringToArray ───────────────────────────────────────────────

describe("keywordsStringToArray", () => {
  it("splits comma-separated keywords into individual words", () => {
    expect(keywordsStringToArray("safe, birth")).toEqual(["birth", "safe"]);
  });

  it("normalizes and deduplicates", () => {
    expect(keywordsStringToArray("Safe, safe, SAFE")).toEqual(["safe"]);
  });

  it("splits multi-word keywords into separate words", () => {
    expect(keywordsStringToArray("frequently asked")).toEqual([
      "asked",
      "frequently",
    ]);
  });

  it("removes diacritics", () => {
    expect(keywordsStringToArray("café")).toEqual(["cafe"]);
  });

  it("returns empty array for empty input", () => {
    expect(keywordsStringToArray("")).toEqual([]);
    expect(keywordsStringToArray(null)).toEqual([]);
    expect(keywordsStringToArray(undefined)).toEqual([]);
  });
});

// ─── processPage ─────────────────────────────────────────────────────────

describe("processPage", () => {
  it("extracts title and keywords from page", () => {
    writeTmpPage(
      "basic.html",
      `<div class="page" data-title="My Page" data-keywords="alpha, beta"></div>`
    );
    const result = processPage(path.join(tmpDir, "basic.html"), "basic");
    expect(result.title).toBe("My Page");
    expect(result.route).toBe("/pages/basic");
    expect(result.keywords).toContain("alpha");
    expect(result.keywords).toContain("beta");
    // title words are also included as keywords by default
    expect(result.keywords).toContain("my");
    expect(result.keywords).toContain("page");
  });

  it("excludes title from keywords when data-no-title-keywords is set", () => {
    writeTmpPage(
      "no-title-kw.html",
      `<div class="page" data-title="My Page" data-keywords="alpha" data-no-title-keywords="true"></div>`
    );
    const result = processPage(
      path.join(tmpDir, "no-title-kw.html"),
      "no-title-kw"
    );
    expect(result.title).toBe("My Page");
    expect(result.keywords).toContain("alpha");
    expect(result.keywords).not.toContain("my");
    expect(result.keywords).not.toContain("page");
  });

  it("extracts sections with data-section", () => {
    writeTmpPage(
      "sections.html",
      `<div class="page" data-title="Parent">
        <div data-section="sec1" data-title="Section One" data-keywords="foo, bar"></div>
        <div data-section="sec2" data-title="Section Two" data-keywords="baz"></div>
      </div>`
    );
    const result = processPage(path.join(tmpDir, "sections.html"), "sections");
    expect(result.sections).toHaveLength(2);
    expect(result.sections[0].sectionId).toBe("sec1");
    expect(result.sections[0].title).toBe("Section One");
    expect(result.sections[0].route).toBe("/pages/sections/sec1");
    expect(result.sections[0].keywords).toContain("foo");
    expect(result.sections[0].keywords).toContain("bar");
    expect(result.sections[1].sectionId).toBe("sec2");
  });

  it("extracts data-search-title as searchTitle", () => {
    writeTmpPage(
      "search-title.html",
      `<div class="page" data-title="Very Long Page Title for Display" data-search-title="Short Title" data-keywords="test"></div>`
    );
    const result = processPage(
      path.join(tmpDir, "search-title.html"),
      "search-title"
    );
    expect(result.title).toBe("Very Long Page Title for Display");
    expect(result.searchTitle).toBe("Short Title");
    // Keywords should still be based on the full title
    expect(result.keywords).toContain("very");
    expect(result.keywords).toContain("long");
  });

  it("omits searchTitle when data-search-title is not set", () => {
    writeTmpPage(
      "no-search-title.html",
      `<div class="page" data-title="Normal Page" data-keywords="test"></div>`
    );
    const result = processPage(
      path.join(tmpDir, "no-search-title.html"),
      "no-search-title"
    );
    expect(result.title).toBe("Normal Page");
    expect(result.searchTitle).toBeUndefined();
  });

  it("falls back to .header-title-value text when data-title is absent", () => {
    writeTmpPage(
      "header-title.html",
      `<div class="page"><span class="header-title-value">Fallback Title</span></div>`
    );
    const result = processPage(
      path.join(tmpDir, "header-title.html"),
      "header-title"
    );
    expect(result.title).toBe("Fallback Title");
  });
});
