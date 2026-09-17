#!/usr/bin/env node
/*
    Check external http(s) links found in app content for broken/unreachable URLs.

    Scans www/ and www-templates/ for .html files and collects external link
    URLs from href/src attributes, then requests each unique URL and reports
    failures. Only HTML is scanned - JS files can contain http(s):// strings
    in comments or vendored library code that aren't live content links.
*/

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const CONTENT_DIRS = ['www', 'www-templates'];
const CONCURRENCY = 10;
const TIMEOUT_MS = 15000;
const RETRY_DELAY_MS = 500;

// Some sites (e.g. plannedparenthood.org) run WAFs that 403 bare/bot-like
// requests but pass a realistic browser User-Agent + Accept headers.
const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9'
};

const args = process.argv.slice(2);
const jsonOutput = args.includes('--json') || args.includes('-j');
const helpRequested = args.includes('--help') || args.includes('-h');
const verbose = args.includes('--verbose') || args.includes('-v');

if (helpRequested) {
    console.log(`
Usage: hesperian-check-links [options]

Checks all external (http/https) links referenced in ${CONTENT_DIRS.join('/, ')}/ HTML files.

Options:
  -j, --json      Output as JSON
  -v, --verbose   Print each URL as it is checked
  -h, --help      Show this help message
`);
    process.exit(0);
}

function walk(dir, exts, results = []) {
    if (!fs.existsSync(dir)) {
        return results;
    }
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith('.')) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walk(full, exts, results);
        } else if (exts.includes(path.extname(entry.name))) {
            results.push(full);
        }
    }
    return results;
}

function isExternalHttpUrl(url) {
    return /^https?:\/\//i.test(url);
}

function extractFromHtml(filePath, urlMap) {
    const contents = fs.readFileSync(filePath, 'utf8');
    const $ = cheerio.load(contents);

    $('[href]').each((i, el) => {
        addUrl($(el).attr('href'), filePath, urlMap);
    });
    $('[src]').each((i, el) => {
        addUrl($(el).attr('src'), filePath, urlMap);
    });
}

function addUrl(rawUrl, filePath, urlMap) {
    if (!rawUrl) return;
    const url = rawUrl.trim().replace(/[),.;]+$/, '');
    if (!isExternalHttpUrl(url)) return;

    if (!urlMap.has(url)) {
        urlMap.set(url, new Set());
    }
    urlMap.get(url).add(filePath);
}

function collectUrls() {
    const urlMap = new Map();

    CONTENT_DIRS.forEach((dir) => {
        walk(dir, ['.html']).forEach((f) => extractFromHtml(f, urlMap));
    });

    return urlMap;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function attempt(url, method, headers, signal) {
    const response = await fetch(url, { method, redirect: 'follow', signal, headers });
    if (response.body) {
        response.body.cancel().catch(() => {});
    }
    return response;
}

async function checkUrl(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        // Some WAFs reject bare HEAD/bot-like requests (need a browser UA+headers
        // to pass), while others (e.g. facebook.com) flag a *partial* browser
        // impersonation as more suspicious than an honest bot UA. Try, in order:
        // HEAD with browser headers, GET with browser headers, GET with a plain
        // bot UA - and keep whichever attempt first succeeds.
        let response = await attempt(url, 'HEAD', BROWSER_HEADERS, controller.signal);

        // Small backoff before each retry - avoids tripping rate limits on
        // small hosts that our own HEAD/GET/GET escalation would otherwise
        // hit in quick succession.
        if (!response.ok) {
            await sleep(RETRY_DELAY_MS);
            response = await attempt(url, 'GET', BROWSER_HEADERS, controller.signal);
        }

        if (!response.ok) {
            await sleep(RETRY_DELAY_MS);
            response = await attempt(url, 'GET', { 'User-Agent': 'hesperian-check-links' }, controller.signal);
        }

        return {
            ok: response.ok,
            status: response.status,
            redirected: response.redirected,
            finalUrl: response.redirected ? response.url : undefined
        };
    } catch (e) {
        return { ok: false, status: null, error: e.name === 'AbortError' ? 'timeout' : e.message };
    } finally {
        clearTimeout(timeout);
    }
}

async function runPool(items, worker, concurrency) {
    const results = new Array(items.length);
    let next = 0;

    async function runNext() {
        while (next < items.length) {
            const i = next++;
            results[i] = await worker(items[i], i);
        }
    }

    const workers = Array.from({ length: Math.min(concurrency, items.length) }, runNext);
    await Promise.all(workers);
    return results;
}

async function main() {
    const urlMap = collectUrls();
    const urls = Array.from(urlMap.keys()).sort();

    if (urls.length === 0) {
        console.log('No external links found.');
        process.exit(0);
    }

    if (!jsonOutput) {
        console.log(`Checking ${urls.length} external link(s)...\n`);
    }

    const checks = await runPool(urls, async (url) => {
        const result = await checkUrl(url);
        if (verbose && !jsonOutput) {
            const status = result.ok ? `OK ${result.status}` : `FAIL ${result.status || result.error}`;
            console.log(`  ${status}  ${url}`);
        }
        return { url, ...result };
    }, CONCURRENCY);

    const broken = checks.filter((c) => !c.ok);

    if (jsonOutput) {
        const output = {
            totalChecked: urls.length,
            totalBroken: broken.length,
            broken: broken.map((b) => ({
                url: b.url,
                status: b.status,
                error: b.error,
                redirectedTo: b.redirected ? b.finalUrl : undefined,
                files: Array.from(urlMap.get(b.url)).sort()
            }))
        };
        console.log(JSON.stringify(output, null, 2));
    } else {
        if (broken.length === 0) {
            console.log(`\nAll ${urls.length} external link(s) OK.`);
        } else {
            console.log(`\nBroken links (${broken.length} of ${urls.length}):`);
            console.log('='.repeat(40));
            broken.forEach((b) => {
                console.log(`\n${b.url}`);
                const reason = b.status ? `HTTP ${b.status}` : b.error;
                if (b.redirected) {
                    // The link itself still works and redirects; the problem is
                    // the page it now points to, not the link being dead.
                    console.log(`  Redirect -> ${b.finalUrl} (${reason})`);
                } else {
                    console.log(`  ${reason}`);
                }
                Array.from(urlMap.get(b.url)).sort().forEach((f) => console.log(`  referenced in: ${f}`));
            });
        }
    }

    process.exit(broken.length > 0 ? 1 : 0);
}

main();
