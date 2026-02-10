import { describe, it, expect } from "vitest";
import {
  parseQuery,
  testOneQueryword,
  testQuerywords,
  testQuery,
  createSearchItem,
  createLocalPageSearchItems,
  createPageItems,
} from "./search-logic.js";

// ─── parseQuery ──────────────────────────────────────────────────────────

describe("parseQuery", () => {
  it("splits and normalizes a simple query", () => {
    expect(parseQuery("Hello World")).toEqual(["hello", "world"]);
  });

  it("removes diacritics", () => {
    expect(parseQuery("café")).toEqual(["cafe"]);
  });

  it("splits on non-word characters", () => {
    expect(parseQuery("one/two-three")).toEqual(["one", "two", "three"]);
  });

  it("filters out empty tokens", () => {
    expect(parseQuery("  ")).toEqual([]);
    expect(parseQuery("")).toEqual([]);
  });

  it("handles punctuation-heavy input", () => {
    expect(parseQuery("a.b,c!d")).toEqual(["a", "b", "c", "d"]);
  });
});

// ─── testOneQueryword ────────────────────────────────────────────────────

describe("testOneQueryword", () => {
  it("matches exact keyword", () => {
    expect(testOneQueryword("hello", ["hello", "world"])).toBe(true);
  });

  it("matches keyword prefix", () => {
    expect(testOneQueryword("hel", ["hello", "world"])).toBe(true);
  });

  it("fails when no keyword starts with query word", () => {
    expect(testOneQueryword("xyz", ["hello", "world"])).toBe(false);
  });

  it("fails on empty keywords list", () => {
    expect(testOneQueryword("hello", [])).toBe(false);
  });
});

// ─── testQuerywords ──────────────────────────────────────────────────────

describe("testQuerywords", () => {
  it("returns true when all query words match", () => {
    expect(testQuerywords(["hel", "wor"], ["hello", "world"])).toBe(true);
  });

  it("returns false when any query word fails", () => {
    expect(testQuerywords(["hel", "xyz"], ["hello", "world"])).toBe(false);
  });

  it("returns false for empty query words", () => {
    expect(testQuerywords([], ["hello"])).toBe(false);
  });

  it("single query word can match any of multiple keywords", () => {
    expect(testQuerywords(["safe"], ["birth", "safe", "pregnancy"])).toBe(true);
  });
});

// ─── testQuery ───────────────────────────────────────────────────────────

describe("testQuery", () => {
  it("returns false for empty parsed query", () => {
    expect(testQuery("", [], ["keyword"])).toBe(false);
  });

  it("matches by keyword prefix", () => {
    expect(testQuery("preg", ["preg"], ["pregnancy", "birth"])).toBe(true);
  });

  it("fails when keyword does not prefix-match", () => {
    expect(testQuery("xyz", ["xyz"], ["pregnancy", "birth"])).toBe(false);
  });

  it("matches by title substring (case-insensitive)", () => {
    expect(
      testQuery("Freq", ["freq"], ["unrelated"], "Frequently Asked Questions")
    ).toBe(true);
  });

  it("matches by titleKeywords when title substring fails", () => {
    expect(
      testQuery(
        "freq ask",
        ["freq", "ask"],
        ["unrelated"],
        "FAQ Page",
        ["frequently", "asked", "questions"]
      )
    ).toBe(true);
  });

  it("falls back to keywords when title and titleKeywords fail", () => {
    expect(
      testQuery(
        "birth",
        ["birth"],
        ["birth", "pregnancy"],
        "FAQ Page",
        ["faq", "page"]
      )
    ).toBe(true);
  });

  it("title substring match is case-insensitive", () => {
    expect(
      testQuery("SAFE BIRTH", ["safe", "birth"], [], "Safe Birth Companion")
    ).toBe(true);
  });

  it("handles undefined title and titleKeywords gracefully", () => {
    expect(
      testQuery("preg", ["preg"], ["pregnancy"], undefined, undefined)
    ).toBe(true);
  });
});

// ─── createSearchItem ────────────────────────────────────────────────────

describe("createSearchItem", () => {
  it("maps source fields to search item fields", () => {
    const source = {
      title: "Test Page",
      titleKeywords: ["test", "page"],
      route: "/pages/test",
      sectionId: "sec1",
      keywords: ["foo", "bar"],
    };
    expect(createSearchItem(source)).toEqual({
      title: "Test Page",
      titleKeywords: ["test", "page"],
      path: "/pages/test",
      sectionId: "sec1",
      keywords: ["foo", "bar"],
    });
  });

  it("defaults keywords to empty array when missing", () => {
    const source = { title: "No Keywords", route: "/pages/nk" };
    expect(createSearchItem(source).keywords).toEqual([]);
  });
});

// ─── createLocalPageSearchItems ──────────────────────────────────────────

describe("createLocalPageSearchItems", () => {
  it("creates search items from sections array", () => {
    const sections = [
      { title: "Sec A", route: "/pages/p/a", sectionId: "a", keywords: ["x"] },
      { title: "Sec B", route: "/pages/p/b", sectionId: "b", keywords: ["y"] },
    ];
    const items = createLocalPageSearchItems(sections);
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe("Sec A");
    expect(items[1].sectionId).toBe("b");
  });
});

// ─── createPageItems ─────────────────────────────────────────────────────

describe("createPageItems", () => {
  it("creates items for pages with titles", () => {
    const pages = {
      faq: {
        title: "FAQ",
        route: "/pages/faq",
        keywords: ["faq"],
        sections: [
          {
            title: "FAQ: Question 1",
            route: "/pages/faq/q1",
            sectionId: "q1",
            keywords: ["question"],
          },
        ],
      },
    };
    const items = createPageItems(pages);
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe("FAQ");
    expect(items[1].title).toBe("FAQ: Question 1");
  });

  it("skips pages without titles", () => {
    const pages = {
      hidden: { route: "/pages/hidden", keywords: ["hidden"] },
    };
    expect(createPageItems(pages)).toHaveLength(0);
  });

  it("handles pages without sections", () => {
    const pages = {
      simple: { title: "Simple", route: "/pages/simple", keywords: ["simple"] },
    };
    const items = createPageItems(pages);
    expect(items).toHaveLength(1);
  });
});

// ─── Integration-style tests ─────────────────────────────────────────────

describe("search integration", () => {
  const pages = {
    birth: {
      title: "Safe Birth",
      titleKeywords: ["safe", "birth"],
      route: "/pages/birth",
      keywords: ["pregnancy", "delivery", "labor"],
      sections: [
        {
          title: "Safe Birth: Warning Signs",
          titleKeywords: ["safe", "birth", "warning", "signs"],
          route: "/pages/birth/warning",
          sectionId: "warning",
          keywords: ["danger", "emergency", "bleeding"],
        },
        {
          title: "Safe Birth: After Delivery",
          titleKeywords: ["safe", "birth", "after", "delivery"],
          route: "/pages/birth/after",
          sectionId: "after",
          keywords: ["postpartum", "breastfeeding", "newborn"],
        },
      ],
    },
  };

  it("finds page by keyword prefix", () => {
    const items = createPageItems(pages);
    const q = parseQuery("preg");
    const matches = items.filter((item) =>
      testQuery("preg", q, item.keywords, item.title, item.titleKeywords)
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].title).toBe("Safe Birth");
  });

  it("finds section by its own keywords", () => {
    const items = createPageItems(pages);
    const q = parseQuery("bleed");
    const matches = items.filter((item) =>
      testQuery("bleed", q, item.keywords, item.title, item.titleKeywords)
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].title).toBe("Safe Birth: Warning Signs");
  });

  it("multi-word query where words span titleKeywords and keywords does not match", () => {
    const items = createPageItems(pages);
    const q = parseQuery("warning bleeding");
    const matches = items.filter((item) =>
      testQuery(
        "warning bleeding",
        q,
        item.keywords,
        item.title,
        item.titleKeywords
      )
    );
    // "warning" is in titleKeywords, "bleeding" is in keywords — but testQuery
    // checks each keyword set independently, so no single set satisfies both words.
    expect(matches).toHaveLength(0);
  });

  it("multi-word query matches when all words are in the same keyword set", () => {
    const items = createPageItems(pages);
    const q = parseQuery("danger bleeding");
    const matches = items.filter((item) =>
      testQuery(
        "danger bleeding",
        q,
        item.keywords,
        item.title,
        item.titleKeywords
      )
    );
    // Both "danger" and "bleeding" are in the Warning Signs section keywords
    expect(matches).toHaveLength(1);
    expect(matches[0].title).toBe("Safe Birth: Warning Signs");
  });

  it("multi-word query fails if one word matches nowhere", () => {
    const items = createPageItems(pages);
    const q = parseQuery("warning xyz");
    const matches = items.filter((item) =>
      testQuery(
        "warning xyz",
        q,
        item.keywords,
        item.title,
        item.titleKeywords
      )
    );
    expect(matches).toHaveLength(0);
  });
});
