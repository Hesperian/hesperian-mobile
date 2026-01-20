#!/usr/bin/env node
/**
 * Automated Accessibility Testing Script
 * 
 * Uses axe-core to test pages in the Framework7 app.
 * 
 * Usage:
 *   npm run test:a11y                          # Test all pages in English locale
 *   node scripts/test-accessibility.js         # Same as above
 *   node scripts/test-accessibility.js --locale=all              # Test all locales
 *   node scripts/test-accessibility.js --locale=es               # Test Spanish only
 *   node scripts/test-accessibility.js --pages=calculator,FAQ    # Test specific pages
 *   node scripts/test-accessibility.js --pages=calculator        # Test single page
 *   node scripts/test-accessibility.js --locale=en --pages=A01-how_to_use
 */

const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');

const appRoot = process.cwd();
const requireFromApp = createRequire(path.join(appRoot, 'package.json'));

const { chromium, devices } = requireFromApp('playwright');
const AxeBuilder = requireFromApp('@axe-core/playwright').default;

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
    baseUrl: 'http://localhost:8080',
    locale: 'en', // Default to English only
    pages: null, // null means all pages, otherwise array of page IDs
    distDir: path.join(appRoot, 'dist'),
    outputDir: path.join(appRoot, 'build', 'reports', 'accessibility'),
    headless: true,
};

args.forEach(arg => {
    const match = arg.match(/--(\w+)=(.+)/);
    if (match) {
        const [, key, value] = match;
        if (key === 'baseUrl') options.baseUrl = value;
        if (key === 'locale') options.locale = value;
        if (key === 'pages') options.pages = value.split(',').map(p => p.trim());
        if (key === 'headless') options.headless = value !== 'false';
    }
});

function buildLaunchUrl(baseUrl, locale) {
    if (!baseUrl) {
        let url = 'http://localhost:8080?tour=false';
        if (locale) {
            url += `&lang=${locale}`;
        }
        return url;
    }

    try {
        const parsed = new URL(baseUrl);
        parsed.searchParams.set('tour', 'false');
        if (locale) {
            parsed.searchParams.set('lang', locale);
        }
        return parsed.toString();
    } catch (_err) {
        // Fallback for non-URL strings
        const separator = baseUrl.includes('?') ? '&' : '?';
        let url = `${baseUrl}${separator}tour=false`;
        if (locale) {
            url += `&lang=${locale}`;
        }
        return url;
    }
}

options.launchUrl = buildLaunchUrl(options.baseUrl, options.locale);

console.log('🔧 Configuration:');
console.log(`  Locale: ${options.locale === 'all' ? 'All locales' : options.locale}`);
console.log(`  Pages: ${options.pages ? options.pages.join(', ') : 'All pages'}`);
console.log(`  Base URL: ${options.baseUrl}`);
console.log('');

// Browser-side event tracking monitor injected before the app boots.
const {
    script: AppEventMonitorScript,
    getEventCount: getMonitorEventCount,
    waitForEvent: waitForMonitorEvent,
} = require('./app-event-monitor');

/**
 * Extract pageResources by scanning www directory
 * This is the most reliable approach since the minified build is hard to parse
 */
function extractPageResources() {
    const wwwDir = path.join(appRoot, 'www', 'locales');

    if (!fs.existsSync(wwwDir)) {
        console.error(`Error: www/locales directory not found at ${wwwDir}`);
        console.error('Please ensure the source files exist.');
        process.exit(1);
    }

    const pageResources = {};
    const locales = fs.readdirSync(wwwDir).filter(f => {
        const stat = fs.statSync(path.join(wwwDir, f));
        return stat.isDirectory() && !f.startsWith('.');
    });

    locales.forEach(locale => {
        pageResources[locale] = buildPageResourcesForLocale(locale);
    });

    if (Object.keys(pageResources).length === 0) {
        console.error('Error: No locales found in www/locales directory');
        process.exit(1);
    }

    return pageResources;
}

/**
 * Build page resources by scanning the www directory
 * This reconstructs what webpack.preprocess.js does
 */
function buildPageResourcesForLocale(locale) {
    const wwwLocaleDir = path.join(appRoot, 'www', 'locales', locale);
    const pages = {};

    if (!fs.existsSync(wwwLocaleDir)) {
        return pages;
    }

    const files = fs.readdirSync(wwwLocaleDir);

    files.forEach(file => {
        const match = file.match(/^(.*)\.html$/);
        if (match) {
            const pageId = match[1];
            pages[pageId] = {
                route: `/pages/${pageId}`,
                title: pageId.replace(/[_-]/g, ' ').replace(/^([A-Z])(\d+)/, '$1$2: '),
                // We can add more by parsing the HTML if needed
            };
        }
    });

    return pages;
}

/**
 * Get list of all pages to test
 */
function getPageUrls(pageResources) {
    const urls = [];

    for (const locale in pageResources) {
        // Skip if testing specific locale (and locale is not 'all')
        if (options.locale !== 'all' && locale !== options.locale) {
            continue;
        }

        const pages = pageResources[locale];
        for (const pageId in pages) {
            // Skip if testing specific pages and this page is not in the list
            if (options.pages && !options.pages.includes(pageId)) {
                continue;
            }

            const page = pages[pageId];
            if (page.route) {
                urls.push({
                    locale,
                    pageId,
                    route: page.route,
                    title: page.title || pageId,
                });

                // Add section routes if they exist
                if (page.sections && Array.isArray(page.sections)) {
                    page.sections.forEach(section => {
                        if (section.route) {
                            urls.push({
                                locale,
                                pageId,
                                sectionId: section.sectionId,
                                route: section.route,
                                title: `${page.title || pageId} - ${section.title || section.sectionId}`,
                            });
                        }
                    });
                }
            }
        }
    }

    return urls;
}

function sanitizeForFilename(value) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        || 'page';
    }

async function waitForEvent(page, eventName, contextLabel, timeout = 30000, baselineCount = null, targetCount = null) {
    return waitForMonitorEvent(page, eventName, {
        contextLabel,
        timeout,
        baselineCount,
        targetCount,
    });
}

async function waitForAppInit(page, contextLabel, timeout = 30000, baselineCount = null) {
    await waitForEvent(page, 'appInit', contextLabel, timeout, baselineCount, 1);
}

async function isRouteActive(page, route) {
    if (!route) {
        return false;
    }

    return page.evaluate((targetRoute) => {
        const normalize = (value) => {
            if (!value) return '';
            return value
                .replace(/^#/, '')
                .replace(/^\//, '')
                .replace(/\/$/, '');
        };

        const viewEl = document.querySelector('.view-main');
        const router = viewEl && viewEl.f7View && viewEl.f7View.router;
        if (!router || !router.currentRoute) {
            return false;
        }

        const normalizedTarget = normalize(targetRoute);
        if (!normalizedTarget) {
            return false;
        }

        const currentPath = normalize(router.currentRoute.path);
        const currentUrl = normalize(router.currentRoute.url);
        const currentRoutePath = normalize(router.currentRoute.route?.path);

        return (
            currentPath === normalizedTarget ||
            currentUrl === normalizedTarget ||
            currentRoutePath === normalizedTarget
        );
    }, route);
}

async function waitForMainView(page, timeout = 30000) {
    await page.waitForFunction(
        () => Boolean(document.querySelector('.view-main')?.f7View?.router),
        { timeout },
    ).catch((error) => {
        throw new Error(`Framework7 main view did not become ready: ${error.message}`);
    });
}

async function navigateToRoute(page, route) {
    if (!route || route === '/') {
        return;
    }

    const alreadyActive = await isRouteActive(page, route);
    if (alreadyActive) {
        return;
    }

    const baseline = await getMonitorEventCount(page, 'page:afterin');

    const navigationSucceeded = await page.evaluate((targetRoute) => {
        const viewEl = document.querySelector('.view-main');
        const view = viewEl && viewEl.f7View;
        if (!view || !view.router) {
            return false;
        }
        view.router.navigate(targetRoute);
        return true;
    }, route);

    if (!navigationSucceeded) {
        throw new Error('Framework7 main view not ready for navigation');
    }

    await waitForEvent(page, 'page:afterin', `router.navigate to ${route}`, 30000, baseline);
}

async function waitForInitialPage(page, options, timeout = 30000) {
    // Launch the app shell and wait for Framework7 to finish its initial routing.
    const appInitBaseline = await getMonitorEventCount(page, 'appInit');
    const initialPageBaseline = await getMonitorEventCount(page, 'page:afterin');

    await page.goto(options.launchUrl, {
        waitUntil: 'domcontentloaded',
        timeout,
    });

    await waitForAppInit(page, 'initial app load', timeout, appInitBaseline);
    await waitForEvent(page, 'page:afterin', 'initial page load', timeout, initialPageBaseline);
}

/**
 * Test a single page for accessibility
 */
async function testPage(page, pageInfo, options) {
    const screenshotParts = [
        pageInfo.locale,
        pageInfo.pageId || pageInfo.route,
        pageInfo.sectionId,
    ].filter(Boolean).map((part) => sanitizeForFilename(String(part)));
    const screenshotBase = screenshotParts.length > 0
        ? screenshotParts.join('__')
        : sanitizeForFilename(pageInfo.route || 'page');
    const screenshotPath = path.join(options.screenshotDir, `${screenshotBase}.png`);
    const screenshotRelativePath = path.relative(options.outputDir, screenshotPath).replace(/\\/g, '/');
    let screenshotCaptured = false;

    try {
        await waitForMainView(page);
        await navigateToRoute(page, pageInfo.route);

        // Wait for Framework7 page to be current
        // This ensures the page is fully initialized and rendered
        await page.waitForSelector('.page-current', {
            timeout: 15000,
            state: 'attached'
        });

        // Brief pause to allow any animations to settle
        await page.waitForTimeout(500);

        try {
            await page.screenshot({
                path: screenshotPath,
                fullPage: true,
            });
            screenshotCaptured = true;
        } catch (screenshotError) {
            console.log(`  ⚠️  Screenshot capture failed: ${screenshotError.message}`);
        }

        // Run axe accessibility tests
        const results = await new AxeBuilder({ page })
            .analyze();

        const successResult = {
            ...pageInfo,
            url: `${options.launchUrl}#${pageInfo.route}`,
            violations: results.violations,
            passes: results.passes.length,
            incomplete: results.incomplete,
            inapplicable: results.inapplicable.length,
            timestamp: new Date().toISOString(),
        };
        if (screenshotCaptured) {
            successResult.screenshot = screenshotRelativePath;
        }
        return successResult;
    } catch (error) {
        if (!screenshotCaptured) {
            try {
                await page.screenshot({
                    path: screenshotPath,
                    fullPage: true,
                });
                screenshotCaptured = true;
            } catch (screenshotError) {
                console.log(`  ⚠️  Screenshot capture failed after error: ${screenshotError.message}`);
            }
        }

        const errorResult = {
            ...pageInfo,
            url: `${options.launchUrl}#${pageInfo.route}`,
            error: error.message,
            timestamp: new Date().toISOString(),
        };
        if (screenshotCaptured) {
            errorResult.screenshot = screenshotRelativePath;
        }
        return errorResult;
    }
}

/**
 * Copy the static report viewer app to the output directory
 */
function copyReportViewer(outputDir) {
    const reportViewerDir = path.join(__dirname, 'report-viewer');

    // Copy index.html
    const htmlSrc = path.join(reportViewerDir, 'index.html');
    const htmlDest = path.join(outputDir, 'accessibility-report.html');
    fs.copyFileSync(htmlSrc, htmlDest);

    // Create css directory and copy styles
    const cssDir = path.join(outputDir, 'css');
    if (!fs.existsSync(cssDir)) {
        fs.mkdirSync(cssDir, { recursive: true });
    }
    const cssSrc = path.join(reportViewerDir, 'css', 'styles.css');
    const cssDest = path.join(cssDir, 'styles.css');
    fs.copyFileSync(cssSrc, cssDest);

    // Create js directory and copy app
    const jsDir = path.join(outputDir, 'js');
    if (!fs.existsSync(jsDir)) {
        fs.mkdirSync(jsDir, { recursive: true });
    }
    const jsSrc = path.join(reportViewerDir, 'js', 'app.js');
    const jsDest = path.join(jsDir, 'app.js');
    fs.copyFileSync(jsSrc, jsDest);

    console.log(`\n📄 HTML report viewer copied to: ${htmlDest}`);
}

/**
 * Main test execution
 */
async function runTests() {
    console.log('🔍 Accessibility Testing\n');
    console.log(`Base URL: ${options.baseUrl}`);
    console.log(`Locale filter: ${options.locale || 'all'}`);
    console.log(`Headless: ${options.headless}\n`);

    // Ensure output directory exists
    if (!fs.existsSync(options.outputDir)) {
        fs.mkdirSync(options.outputDir, { recursive: true });
    }

    const screenshotDir = path.join(options.outputDir, 'screenshots');
    options.screenshotDir = screenshotDir;
    if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
    }

    console.log('📦 Extracting page data from build...');
    const pageResources = extractPageResources();
    const pageUrls = getPageUrls(pageResources);
    console.log(`✅ Found ${pageUrls.length} pages to test\n`);

    if (pageUrls.length === 0) {
        console.error('No pages found to test!');
        process.exit(1);
    }

    // Launch browser
    console.log('🚀 Launching browser...');
    const browser = await chromium.launch({
        headless: options.headless,
    });
    const mobileDevice = devices['iPhone 12'];
    const context = await browser.newContext({
        ...(mobileDevice || {}),
        viewport: (mobileDevice && mobileDevice.viewport) || { width: 390, height: 844 },
    });
    const page = await context.newPage();

    page.on('console', (msg) => {
        // Surface browser console messages to the Node console for debugging
        // eslint-disable-next-line no-console
        console.log(`[browser:${msg.type()}] ${msg.text()}`);
    });

    page.on('requestfailed', (request) => {
        const failure = request.failure();
        const failureText = failure ? `${failure.errorText}` : 'unknown reason';
        console.log(`[browser:requestfailed] ${request.method()} ${request.url()} --> ${failureText}`);
    });

    await page.addInitScript(AppEventMonitorScript);

    // Ensure the app shell has finished its initial load before routing to specific pages.
    await waitForInitialPage(page, options);

    // Run tests
    const results = [];

    for (let i = 0; i < pageUrls.length; i++) {
        const pageInfo = pageUrls[i];
        const progress = `[${i + 1}/${pageUrls.length}]`;
        console.log(`${progress} Testing: ${pageInfo.title} (${pageInfo.locale})`);

        const result = await testPage(page, pageInfo, options);
        results.push(result);

        if (result.error) {
            console.log(`  ❌ Error: ${result.error}`);
        } else if (result.violations.length > 0) {
            console.log(`  ⚠️  ${result.violations.length} violation(s) found`);
        } else {
            console.log(`  ✅ No violations`);
        }
    }

    await browser.close();

    // Generate reports
    console.log('\n📊 Generating reports...');

    // JSON report
    const jsonPath = path.join(options.outputDir, 'accessibility-results.json');
    fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
    console.log(`📄 JSON report saved to: ${jsonPath}`);

    // Copy HTML report viewer
    copyReportViewer(options.outputDir);

    // Summary
    const totalViolations = results.reduce((sum, r) => sum + (r.violations?.length || 0), 0);
    const pagesWithViolations = results.filter(r => r.violations?.length > 0).length;
    const pagesWithErrors = results.filter(r => r.error).length;

    console.log('\n' + '='.repeat(60));
    console.log('📈 Test Summary');
    console.log('='.repeat(60));
    console.log(`Total pages tested: ${results.length}`);
    console.log(`Pages with violations: ${pagesWithViolations}`);
    console.log(`Total violations: ${totalViolations}`);
    console.log(`Pages with errors: ${pagesWithErrors}`);
    console.log('='.repeat(60));

    // Exit with error code if violations found
    if (totalViolations > 0 || pagesWithErrors > 0) {
        console.log('\n❌ Accessibility tests failed');
        process.exit(1);
    } else {
        console.log('\n✅ All accessibility tests passed!');
        process.exit(0);
    }
}

// Run tests
runTests().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
