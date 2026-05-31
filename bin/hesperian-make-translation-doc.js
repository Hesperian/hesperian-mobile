#!/usr/bin/env node
/*
    Generate a Word document for translators from the English locale HTML files.

    Run from an app directory (e.g. hesperian-mobile-SafeBirth/).
    Reads:  app-config.json
            www/locales/en/*.html
            www/img/
    Writes: en_{NAME}-v{VERSION}.docx in the current directory.
*/

'use strict';

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const Jimp = require('jimp');
const { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel } = require('docx');

// ── Constants ────────────────────────────────────────────────────────────────

// Image sizing constrains the LONGER dimension so tall and wide images both
// render as similar thumbnails — matches the visual feel of the hand-crafted
// document, where images appear at ~0.5–1″.
const CONTENT_IMG_PX = 96;    // 1 inch at 96 DPI — page content images
const ACCORDION_ICON_PX = 64; // ~0.67 inch — accordion menu icons

// Embedded image data is downscaled to this longer-dim before being placed in
// the docx. 2× display size gives some retina/zoom headroom while keeping the
// file small (vs the source PNGs at 500–2000px, which bloated the doc ~7×).
const EMBED_MAX_PX = 192;

// Hex color matching Word's default Hyperlink character style. Used to flag
// button-array caption text as a navigation link for translators.
const HYPERLINK_COLOR = '0563C1';

// Matches /pages/B03-eating_well or /pages/B03-eating_well/nausea
const PAGE_ID_RE = /^\/pages\/([A-Z]\d+)(?:-[^/]+)?(?:\/(.+))?$/;

// Tags treated as block-level in the walker
const BLOCK_TAGS = new Set(['p', 'div', 'ul', 'ol', 'img', 'table', 'h1', 'h2', 'h3', 'h4', 'h5', 'blockquote', 'section', 'article', 'figure', 'figcaption']);

// ── App config ───────────────────────────────────────────────────────────────

const appConfig = JSON.parse(fs.readFileSync('app-config.json', 'utf8'));

// ── Link annotation ──────────────────────────────────────────────────────────

function convertLink(href) {
    if (!href) return null;
    if (href.startsWith('http://') || href.startsWith('https://')) {
        return `[link to ${href}]`;
    }
    const m = href.match(PAGE_ID_RE);
    if (m) {
        return m[2] ? `[link to ${m[1]} > ${m[2]}]` : `[link to ${m[1]}]`;
    }
    // Non-ID routes like /pages/calculator
    const seg = href.replace(/^\/pages\//, '').split('/')[0];
    return seg ? `[link to ${seg}]` : null;
}

// ── Image cache (resized buffers) ────────────────────────────────────────────
//
// Source PNGs are 500–2000px wide. We embed them as ~96px thumbnails, so
// shipping full resolution bloats the docx ~7×. preloadImages() walks all HTML
// files once, finds every referenced <img src>, and runs jimp to downscale to
// EMBED_MAX_PX (longer-dim). The resized PNG buffer is cached and reused by
// every makeImageRun() call — synchronous lookup keeps the walker simple.

const imageCache = new Map(); // src (e.g. "img/pic_10.png") → { buffer, width, height }

async function preloadImages(pages) {
    const srcs = new Set();
    for (const page of pages) {
        const html = fs.readFileSync(page.path, 'utf8');
        const $ = cheerio.load(html);
        $('img[src]').each((_, el) => {
            const s = $(el).attr('src');
            if (s) srcs.add(s);
        });
    }

    let resized = 0, skipped = 0, failed = 0;
    await Promise.all([...srcs].map(async (src) => {
        const fullPath = path.join('www', src);
        if (!fs.existsSync(fullPath)) { skipped++; return; }
        try {
            const img = await Jimp.read(fullPath);
            const { width: w0, height: h0 } = img.bitmap;
            const longer = Math.max(w0, h0);
            if (longer > EMBED_MAX_PX) {
                img.scale(EMBED_MAX_PX / longer);
            }
            const buffer = await img.getBufferAsync(Jimp.MIME_PNG);
            imageCache.set(src, {
                buffer,
                width: img.bitmap.width,
                height: img.bitmap.height,
            });
            resized++;
        } catch (e) {
            process.stderr.write(`  [warn] failed to resize ${fullPath}: ${e.message}\n`);
            failed++;
        }
    }));
    console.log(`Preloaded ${resized} images (${skipped} missing, ${failed} failed)`);
}

// ── Image helpers ────────────────────────────────────────────────────────────

function makeImageRun(src, isIcon) {
    if (!src) return null;
    const cached = imageCache.get(src);
    if (!cached) {
        // Cache miss = image not preloaded (file missing or load failed).
        // preloadImages already warned to stderr; just return null here so the
        // caller emits its [IMAGE NOT FOUND: …] placeholder.
        return null;
    }
    const maxPx = isIcon ? ACCORDION_ICON_PX : CONTENT_IMG_PX;
    const longerDim = Math.max(cached.width, cached.height);
    const scale = Math.min(1, maxPx / longerDim);
    const width = Math.round(cached.width * scale);
    const height = Math.round(cached.height * scale);
    return new ImageRun({
        data: cached.buffer,
        transformation: { width, height },
        type: 'png', // jimp always outputs PNG via MIME_PNG
    });
}

// Returns a Paragraph containing the image, or a placeholder text paragraph.
function imgParagraph(src, isIcon) {
    const run = makeImageRun(src, isIcon);
    if (run) return new Paragraph({ children: [run] });
    return new Paragraph({ children: [new TextRun(`[IMAGE NOT FOUND: ${src || 'missing src'}]`)] });
}

// Emits an image paragraph plus (optionally) an alt-text paragraph.
function emitImg($el, $, out, isIcon) {
    const src = $el.attr('src') || '';
    if (!src) {
        process.stderr.write('  [warn] img element missing src\n');
        out.push(new Paragraph({ children: [new TextRun('[IMAGE MISSING SRC]')] }));
        return;
    }
    out.push(imgParagraph(src, isIcon));
    const alt = ($el.attr('alt') || '').trim();
    if (alt) {
        out.push(new Paragraph({ children: [new TextRun(`alt= "${alt}"`)] }));
    }
}

// ── Rich text parser (inline content → Item[]) ───────────────────────────────
//
// Items are an intermediate representation, deferred to TextRun creation so we
// can trim whitespace at paragraph boundaries (which docx TextRun won't allow
// after construction). Each item is one of:
//   { text: string, bold?: bool, italics?: bool }
//   { break: true }
//   { image: ImageRun }

function parseRichText($el, $) {
    const items = [];
    $el.contents().each((_, node) => {
        if (node.type === 'text') {
            const raw = node.data || '';
            if (raw.includes('{{')) return;
            const text = raw.replace(/\s+/g, ' ');
            if (text.trim()) items.push({ text });
        } else if (node.type === 'tag') {
            const $child = $(node);
            switch (node.name.toLowerCase()) {
                case 'strong': case 'b': {
                    const t = $child.text();
                    if (t.trim()) items.push({ text: t, bold: true });
                    break;
                }
                case 'em': case 'i': {
                    const t = $child.text();
                    if (t.trim()) items.push({ text: t, italics: true });
                    break;
                }
                case 'a': {
                    const href = $child.attr('href') || '';
                    const text = $child.text().trim();
                    if (!text) break;
                    const ann = convertLink(href);
                    items.push({ text: ann ? `${text} ${ann}` : text });
                    break;
                }
                case 'br':
                    items.push({ break: true });
                    break;
                case 'img': {
                    // Inline image — embed without alt text (alt is lost in inline context)
                    const run = makeImageRun($child.attr('src') || '', false);
                    if (run) items.push({ image: run });
                    break;
                }
                default:
                    items.push(...parseRichText($child, $));
            }
        }
    });
    return items;
}

// Trim leading/trailing whitespace from text items at the boundaries of a
// paragraph. Stops at the first non-text item (image, break) — those are kept
// as-is. Drops items that become empty after trimming.
function trimItems(items) {
    let out = items.slice();
    while (out.length > 0 && typeof out[0].text === 'string') {
        const t = out[0].text.replace(/^\s+/, '');
        if (t) { out[0] = { ...out[0], text: t }; break; }
        out.shift();
    }
    while (out.length > 0 && typeof out[out.length - 1].text === 'string') {
        const last = out[out.length - 1];
        const t = last.text.replace(/\s+$/, '');
        if (t) { out[out.length - 1] = { ...last, text: t }; break; }
        out.pop();
    }
    return out;
}

function itemsToRuns(items) {
    return items.map((item) => {
        if (item.image) return item.image;
        if (item.break) return new TextRun({ text: '', break: 1 });
        const opts = { text: item.text };
        if (item.bold) opts.bold = true;
        if (item.italics) opts.italics = true;
        return new TextRun(opts);
    });
}

// Builds a Paragraph from items, trimming edge whitespace. Returns null if the
// items list is empty after trimming (so callers can skip the push).
function paragraphFromItems(items, paraOpts = {}) {
    const trimmed = trimItems(items);
    if (trimmed.length === 0) return null;
    return new Paragraph({ children: itemsToRuns(trimmed), ...paraOpts });
}

// ── Accordion item emitter ────────────────────────────────────────────────────

function emitAccordionItem($li, $, out) {
    const iconSrc = $li.find('.item-media img').attr('src');
    if (iconSrc) out.push(imgParagraph(iconSrc, true));

    const itemTitle = $li.find('.item-title').first().text().trim();
    if (itemTitle) {
        out.push(new Paragraph({
            heading: HeadingLevel.HEADING_3,
            children: [new TextRun(`${itemTitle} [Accordion]`)],
        }));
    }

    const kw = ($li.attr('data-keywords') || '').trim();
    if (kw) {
        out.push(new Paragraph({ children: [new TextRun(`SEARCH TERMS: ${kw}`)] }));
    }

    const $content = $li.find('.accordion-item-content').first();
    if ($content.length) walk($, $content, out);
}

// ── List item emitter ─────────────────────────────────────────────────────────
// Handles <li> content that may mix text, inline elements, and nested block elements.

function emitListItem($li, $, out) {
    let firstBulletPending = true;
    let pendingItems = [];

    function flushItems() {
        const opts = firstBulletPending ? { bullet: { level: 0 } } : {};
        const para = paragraphFromItems(pendingItems, opts);
        if (para) { out.push(para); firstBulletPending = false; }
        pendingItems = [];
    }

    $li.contents().each((_, node) => {
        if (node.type === 'text') {
            const raw = node.data || '';
            if (raw.includes('{{')) return;
            const text = raw.replace(/\s+/g, ' '); // normalize, do NOT trim — preserves joining spaces
            if (text.trim()) pendingItems.push({ text });
        } else if (node.type === 'tag') {
            const tag = node.name.toLowerCase();
            const $child = $(node);

            if (BLOCK_TAGS.has(tag)) {
                flushItems();
                if (tag === 'img') {
                    emitImg($child, $, out, false);
                } else if (tag === 'p') {
                    // Image-only <p>: emit each img with alt text
                    if ($child.children('img').length > 0 && $child.text().trim() === '') {
                        $child.children('img').each((_, img) => emitImg($(img), $, out, false));
                    } else {
                        const para = paragraphFromItems(parseRichText($child, $));
                        if (para) out.push(para);
                    }
                } else {
                    walk($, $child, out);
                }
            } else {
                // Inline element
                pendingItems.push(...parseRichText($child, $));
            }
        }
    });

    flushItems();
}

// ── Main walker ───────────────────────────────────────────────────────────────

function walk($, $node, out) {
    let pendingItems = []; // buffer for "naked" inline content between block elements

    function flushInline() {
        const para = paragraphFromItems(pendingItems);
        if (para) out.push(para);
        pendingItems = [];
    }

    $node.contents().each((_, node) => {
        // Text node
        if (node.type === 'text') {
            const raw = node.data || '';
            if (raw.includes('{{')) { flushInline(); return; }
            const text = raw.replace(/\s+/g, ' '); // normalize, do NOT trim — preserves joining spaces
            if (text.trim()) pendingItems.push({ text });
            return;
        }
        if (node.type !== 'tag') return;

        const $el = $(node);
        const tag = node.name.toLowerCase();

        // Skip Handlebars injection points
        if ($el.attr('data-template-name')) { flushInline(); return; }

        const classes = (node.attribs.class || '').split(/\s+/);

        // Inline elements: collect into pending buffer
        if (!BLOCK_TAGS.has(tag)) {
            pendingItems.push(...parseRichText($el, $));
            return;
        }

        // Block element: flush any pending inline content first
        flushInline();

        // ── Specialised block handlers ──────────────────────────────────────

        // Button navigation array — emit each button as a single indented
        // paragraph: [thumbnail image] [hyperlink-styled caption] [link annotation].
        // Matches the visual treatment in the hand-crafted document.
        if (classes.includes('button-array')) {
            $el.find('a.caption-container').each((_, a) => {
                const $a = $(a);
                const imgSrc = $a.find('img').attr('src');
                const caption = $a.find('.caption').text().trim();
                const href = $a.attr('href') || '';
                const ann = convertLink(href);

                const children = [];
                const imgRun = imgSrc ? makeImageRun(imgSrc, false) : null;
                if (imgRun) children.push(imgRun);
                if (caption) {
                    children.push(new TextRun({
                        text: imgRun ? ` ${caption}` : caption,
                        color: HYPERLINK_COLOR,
                        underline: {},
                    }));
                }
                if (ann) {
                    children.push(new TextRun(` ${ann}`));
                }
                if (children.length > 0) {
                    out.push(new Paragraph({
                        children,
                        indent: { left: 720 }, // 0.5 inch (1440 twips per inch)
                    }));
                }
            });
            return;
        }

        // Accordion list wrapper (div.accordion-list)
        if (classes.includes('accordion-list')) {
            $el.find('> ul > li.accordion-item').each((_, li) => {
                emitAccordionItem($(li), $, out);
            });
            return;
        }

        // Paragraph
        if (tag === 'p') {
            // Image-only <p>: emit each img with alt text separately
            if ($el.children('img').length > 0 && $el.text().trim() === '') {
                $el.children('img').each((_, img) => emitImg($(img), $, out, false));
                return;
            }
            const para = paragraphFromItems(parseRichText($el, $));
            if (para) out.push(para);
            return;
        }

        // Unordered list — check for accordion items (can appear without outer .accordion-list)
        if (tag === 'ul') {
            if ($el.children('li.accordion-item').length > 0) {
                $el.children('li.accordion-item').each((_, li) => emitAccordionItem($(li), $, out));
            } else {
                $el.children('li').each((_, li) => emitListItem($(li), $, out));
            }
            return;
        }

        // Ordered list (treated identically to ul for translator purposes)
        if (tag === 'ol') {
            $el.children('li').each((_, li) => emitListItem($(li), $, out));
            return;
        }

        // Standalone image
        if (tag === 'img') {
            emitImg($el, $, out, false);
            return;
        }

        // Default: recurse into divs, sections, content-blocks, etc.
        walk($, $el, out);
    });

    flushInline();
}

// ── Page emitter ──────────────────────────────────────────────────────────────

// Derives a page heading like "B03. Eating well" or just "Pregnancy calculator"
// for non-ID pages. data-id values matching `^[A-Z]\d+` (e.g. "B03-eating_well")
// produce the "ID. Title" form; anything else (e.g. "calculator", "privacy",
// missing) falls back to title-only with a humanized filename fallback.
function pageHeadingText($root, pageMeta) {
    const dataId = $root.attr('data-id') || '';
    const dataTitle = $root.attr('data-title') || '';
    const idMatch = dataId.match(/^([A-Z]\d+)/);
    const title = dataTitle
        || pageMeta.filename
            .replace(/\.html$/, '')
            .replace(/^[A-Z]\d+-?/, '')
            .replace(/[_-]+/g, ' ')
            .replace(/^./, (c) => c.toUpperCase());
    return idMatch ? `${idMatch[1]}. ${title}` : title;
}

function emitPage(pageMeta, out) {
    const html = fs.readFileSync(pageMeta.path, 'utf8');
    const $ = cheerio.load(html);
    const $root = $('[data-page]').first();

    const keywords = ($root.attr('data-keywords') || '').trim();
    const heading = pageHeadingText($root, pageMeta);

    out.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun(heading)],
    }));

    if (keywords) {
        out.push(new Paragraph({ children: [new TextRun(`SEARCH TERMS: ${keywords}`)] }));
    }

    const $content = $root.find('.searchbar-hide-on-search').first();
    if ($content.length) walk($, $content, out);

    out.push(new Paragraph({ children: [new TextRun('')] })); // spacer between pages
}

// ── Entry point ───────────────────────────────────────────────────────────────

function loadPages() {
    const dir = path.join('www', 'locales', 'en');
    if (!fs.existsSync(dir)) {
        console.error(`Error: ${dir} not found. Run this script from an app directory.`);
        process.exit(1);
    }
    return fs.readdirSync(dir)
        .filter((f) => f.endsWith('.html'))
        .sort()
        .map((f) => ({
            filename: f,
            id: f.split('-')[0],
            path: path.join(dir, f),
        }));
}

async function main() {
    const pages = loadPages();
    console.log(`Generating translation document for: ${appConfig.description} v${appConfig.version}`);
    console.log(`Resizing images...`);
    await preloadImages(pages);
    console.log(`Processing ${pages.length} pages...`);

    const out = [
        new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun(appConfig.description)],
        }),
    ];

    for (const page of pages) {
        process.stdout.write(`  ${page.filename}...`);
        try {
            emitPage(page, out);
            process.stdout.write(' done\n');
        } catch (e) {
            process.stdout.write(` ERROR: ${e.message}\n`);
            console.error(e.stack);
        }
    }

    const doc = new Document({
        sections: [{ properties: {}, children: out }],
    });

    const outName = `en_${appConfig.name}-v${appConfig.version}.docx`;
    const buf = await Packer.toBuffer(doc);
    fs.writeFileSync(outName, buf);
    console.log(`\nWrote ${outName} (${out.length} content elements)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
