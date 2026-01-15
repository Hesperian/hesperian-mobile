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
    tourMode: false,
};

args.forEach(arg => {
    const match = arg.match(/--(\w+)=(.+)/);
    if (match) {
        const [, key, value] = match;
        if (key === 'baseUrl') options.baseUrl = value;
        if (key === 'locale') options.locale = value;
        if (key === 'pages') options.pages = value.split(',').map(p => p.trim());
        if (key === 'headless') options.headless = value !== 'false';
        if (key === 'tour') options.tourMode = value !== 'false';
    }
});

function ensureLaunchUrl(baseUrl, tourEnabled, locale) {
    const desiredValue = tourEnabled ? 'true' : 'false';

    if (!baseUrl) {
        let url = `http://localhost:8080?tour=${desiredValue}`;
        if (!tourEnabled && locale) {
            url += `&lang=${locale}`;
        }
        return url;
    }

    try {
        const parsed = new URL(baseUrl);
        parsed.searchParams.set('tour', desiredValue);
        // When tour is disabled, also set the lang param to skip language chooser
        if (!tourEnabled && locale) {
            parsed.searchParams.set('lang', locale);
        }
        return parsed.toString();
    } catch (_err) {
        // Fallback for non-URL strings
        if (baseUrl.includes('tour=')) {
            return baseUrl.replace(/tour=[^&#]*/g, `tour=${desiredValue}`);
        }
        const separator = baseUrl.includes('?') ? '&' : '?';
        return `${baseUrl}${separator}tour=${desiredValue}`;
    }
}

options.launchUrl = ensureLaunchUrl(options.baseUrl, options.tourMode, options.locale);

console.log('🔧 Configuration:');
console.log(`  Locale: ${options.locale === 'all' ? 'All locales' : options.locale}`);
console.log(`  Pages: ${options.pages ? options.pages.join(', ') : 'All pages'}`);
console.log(`  Base URL: ${options.baseUrl}`);
console.log(`  Tour mode: ${options.tourMode ? 'enabled' : 'disabled'}`);
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

async function analyzeCurrentState(page, title, identifier, options) {
    const screenshotBase = sanitizeForFilename(identifier || title || 'tour-step');
    const screenshotPath = path.join(options.screenshotDir, `${screenshotBase}.png`);
    const screenshotRelativePath = path.relative(options.outputDir, screenshotPath).replace(/\\/g, '/');
    let screenshotCaptured = false;

    try {
        await page.waitForTimeout(300);
        await page.screenshot({
            path: screenshotPath,
            fullPage: true,
        });
        screenshotCaptured = true;
    } catch (screenshotError) {
        console.log(`  ⚠️  Screenshot capture failed: ${screenshotError.message}`);
    }

    let axeResults;
    try {
        axeResults = await new AxeBuilder({ page }).analyze();
    } catch (error) {
        const errorResult = {
            locale: options.locale,
            pageId: identifier || title,
            route: 'tour',
            title,
            url: options.launchUrl,
            error: error.message,
            timestamp: new Date().toISOString(),
        };

        if (screenshotCaptured) {
            errorResult.screenshot = screenshotRelativePath;
        }

        return errorResult;
    }

    const result = {
        locale: options.locale,
        pageId: identifier || title,
        route: 'tour',
        title,
        url: options.launchUrl,
        violations: axeResults.violations,
        passes: axeResults.passes.length,
        incomplete: axeResults.incomplete,
        inapplicable: axeResults.inapplicable.length,
        timestamp: new Date().toISOString(),
    };

    if (screenshotCaptured) {
        result.screenshot = screenshotRelativePath;
    }

    return result;
}

async function advanceTourStep(page, previousStepId) {
    return page.evaluate(async ({ previousStepId }) => {
        const tour = window.__hesperianIntroTour;

        if (!tour) {
            return { status: 'missing' };
        }

        const currentId = tour.currentStep && tour.currentStep.id ? tour.currentStep.id : null;
        if (currentId && previousStepId && currentId !== previousStepId) {
            return { status: 'advanced', currentId };
        }

        return new Promise((resolve) => {
            let resolved = false;

            const finalize = (payload) => {
                if (resolved) {
                    return;
                }
                resolved = true;
                cleanup();
                resolve(payload);
            };

            const cleanup = () => {
                if (typeof tour.off === 'function') {
                    tour.off('show', onShow);
                    tour.off('complete', onComplete);
                    tour.off('cancel', onCancel);
                }
            };

            const onShow = () => {
                const activeId = tour.currentStep && tour.currentStep.id ? tour.currentStep.id : null;
                finalize({ status: 'advanced', currentId: activeId });
            };

            const onComplete = () => finalize({ status: 'finished' });
            const onCancel = () => finalize({ status: 'finished' });

            if (typeof tour.on === 'function') {
                tour.on('show', onShow);
                tour.on('complete', onComplete);
                tour.on('cancel', onCancel);
            }

            const attemptAdvance = () => {
                try {
                    const result = tour.next();
                    if (result && typeof result.then === 'function') {
                        result.catch((error) => {
                            finalize({
                                status: 'error',
                                message: error && error.message ? error.message : String(error),
                            });
                        });
                    }
                } catch (error) {
                    finalize({
                        status: 'error',
                        message: error && error.message ? error.message : String(error),
                    });
                    return;
                }

                setTimeout(() => {
                    if (resolved) {
                        return;
                    }

                    const nextId = tour.currentStep && tour.currentStep.id ? tour.currentStep.id : null;
                    if (nextId && nextId !== previousStepId) {
                        finalize({ status: 'advanced', currentId: nextId });
                        return;
                    }

                    if (typeof tour.isActive === 'function' && !tour.isActive()) {
                        finalize({ status: 'finished' });
                        return;
                    }

                    finalize({ status: 'stalled', currentId: nextId });
                }, 1500);
            };

            attemptAdvance();
        });
    }, { previousStepId });
}

async function runTourFlow(page, options) {
    const results = [];
    const seenSteps = new Set();

    const languageDialogSelector = '.hm-choose-language';
    const chooseLanguageVisible = await page.locator(languageDialogSelector).isVisible();
    if (chooseLanguageVisible) {
        console.log('  🗣️  Found choose language dialog');
        results.push(await analyzeCurrentState(page, 'Tour: Choose Language Dialog', 'tour-choose-language', options));

        const languageNextButton = page.locator(`${languageDialogSelector} .dialog-button`).first();
        if ((await languageNextButton.count()) === 0) {
            throw new Error('Choose language dialog next button not found');
        }
        await languageNextButton.click();
        await page.waitForSelector(languageDialogSelector, { state: 'detached', timeout: 5000 }).catch(() => {});
    }

    const maxSteps = 20;
    const stepSelector = '.shepherd-element[data-shepherd-step-id]:not([aria-hidden="true"])';
    const noStepSentinel = '__NO_VISIBLE_SHEPHERD_STEP__';
    for (let stepIndex = 1; stepIndex <= maxSteps; stepIndex++) {
        try {
            await page.waitForFunction((selector) => {
                return Boolean(document.querySelector(selector));
            }, stepSelector, {
                timeout: 20000,
            });
        } catch (_err) {
            console.log('  ✅ Tour finished (no more steps)');
            break;
        }

        let stepHandle = page.locator(stepSelector).first();

        let stepId = await stepHandle.evaluate((el) =>
            el.getAttribute('data-shepherd-step-id') || ''
        );
        let identifier = stepId ? `tour-step-${stepId}` : `tour-step-${stepIndex}`;
        let title = stepId ? `Tour Step ${stepIndex}: ${stepId}` : `Tour Step ${stepIndex}`;

        if (stepId && seenSteps.has(stepId)) {
            let nextId;
            try {
                nextId = await page.waitForFunction((selector, previousId, sentinel) => {
                    const el = document.querySelector(selector);
                    if (!el) {
                        return sentinel;
                    }
                    const currentId = el.getAttribute('data-shepherd-step-id') || '';
                    if (!currentId || currentId === previousId) {
                        return false;
                    }
                    return currentId;
                }, stepSelector, stepId, noStepSentinel, {
                    timeout: 5000,
                });
            } catch (_err) {
                nextId = null;
            }

            if (nextId === noStepSentinel) {
                console.log('  ✅ Tour finished (no more steps)');
                break;
            }

            if (!nextId || nextId === stepId || seenSteps.has(nextId)) {
                console.log(`  🔁 Encountered previously seen step ${stepId}, stopping to avoid loop`);
                break;
            }

            await page.waitForSelector(`${stepSelector}[data-shepherd-step-id="${nextId}"]`, {
                timeout: 5000,
            }).catch(() => {});

            const replacementHandle = page.locator(`${stepSelector}[data-shepherd-step-id="${nextId}"]`).first();
            if (await replacementHandle.count() > 0) {
                stepHandle = replacementHandle;
                stepId = nextId;
                identifier = `tour-step-${stepId}`;
                title = `Tour Step ${stepIndex}: ${stepId}`;
            }
        }

        if (stepId && seenSteps.has(stepId)) {
            console.log(`  🔁 Encountered previously seen step ${stepId}, stopping to avoid loop`);
            break;
        }
        if (stepId) {
            seenSteps.add(stepId);
        }

        results.push(await analyzeCurrentState(page, title, identifier, options));

        const advanceOutcome = await advanceTourStep(page, stepId);

        if (advanceOutcome?.status === 'advanced') {
            await page.waitForTimeout(200);
            continue;
        }

        if (advanceOutcome?.status === 'finished') {
            console.log('  ✅ Tour finished');
            break;
        }

        if (advanceOutcome?.status === 'missing') {
            console.log('  ⚠️  Tour instance not available on window, stopping progression');
            break;
        }

        if (advanceOutcome?.status === 'stalled') {
            console.log(`  ⚠️  Tour stalled on ${advanceOutcome.currentId || 'unknown'}, stopping progression`);
            break;
        }

        if (advanceOutcome?.status === 'error') {
            console.log(`  ⚠️  Error advancing tour: ${advanceOutcome.message || 'unknown error'}`);
            break;
        }

        console.log('  ⚠️  Unexpected tour advance state, stopping progression');
        break;
    }

    return results;
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
 * Generate HTML report
 */
function generateHtmlReport(results, outputPath) {
    const totalViolations = results.reduce((sum, r) => sum + (r.violations?.length || 0), 0);
    const totalPages = results.length;
    const pagesWithViolations = results.filter(r => r.violations?.length > 0).length;
    const pagesWithErrors = results.filter(r => r.error).length;

    const localeLabel = options.tourMode
        ? 'Tour sequence'
        : options.locale === 'all'
            ? 'All locales'
            : options.locale;
    const pagesLabel = options.tourMode
        ? 'Tour steps'
        : options.pages
            ? `${options.pages.length} selected page(s)`
            : 'All pages';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Accessibility Test Report</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; }
    .test-config { background: #e7f3ff; padding: 15px; border-radius: 4px; margin: 20px 0; font-size: 14px; }
    .test-config strong { color: #0066cc; }
    .summary { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
    .summary-item { background: white; padding: 15px; border-radius: 4px; border-left: 4px solid #0066cc; }
    .summary-item h3 { margin: 0 0 10px 0; font-size: 14px; color: #666; }
    .summary-item .value { font-size: 32px; font-weight: bold; color: #333; }
    .error { border-left-color: #dc3545; }
    .warning { border-left-color: #ffc107; }
    .success { border-left-color: #28a745; }
    .page-result { margin: 20px 0; padding: 20px; background: white; border: 1px solid #ddd; border-radius: 4px; overflow: hidden; }
    .page-result.has-violations { border-left: 4px solid #dc3545; }
    .page-result.has-error { border-left: 4px solid #ffc107; }
    .page-result.clean { border-left: 4px solid #28a745; }
    .page-title { margin: 0 0 10px 0; font-size: 18px; }
    .page-meta { color: #666; font-size: 14px; margin-bottom: 15px; }
    .violation { margin: 15px 0; padding: 15px; background: #fff3cd; border-left: 3px solid #ffc107; }
    .violation-critical { background: #f8d7da; border-left-color: #dc3545; }
    .violation-moderate { background: #fff3cd; border-left-color: #ffc107; }
    .violation-minor { background: #d1ecf1; border-left-color: #17a2b8; }
    .violation h4 { margin: 0 0 10px 0; color: #333; }
    .violation-impact { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 12px; font-weight: bold; }
    .impact-critical { background: #dc3545; color: white; }
    .impact-serious { background: #fd7e14; color: white; }
    .impact-moderate { background: #ffc107; color: #000; }
    .impact-minor { background: #17a2b8; color: white; }
    .violation-nodes { margin-top: 10px; font-family: monospace; font-size: 12px; }
    .violation-node { background: #f8f9fa; padding: 8px; margin: 5px 0; border-radius: 3px; }
        .page-screenshot { float: left; margin: 0 20px 20px 0; max-width: 320px; }
        .page-screenshot img { width: 100%; border: 1px solid #ddd; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
    pre { background: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>Accessibility Test Report</h1>
  
  <div class="test-config">
    <strong>Test Configuration:</strong><br>
    Locale: ${localeLabel} | Pages: ${pagesLabel} | Generated: ${new Date().toLocaleString()}
  </div>
  
  <div class="summary">
    <div class="summary-grid">
      <div class="summary-item">
        <h3>Total Pages Tested</h3>
        <div class="value">${totalPages}</div>
      </div>
      <div class="summary-item ${totalViolations > 0 ? 'error' : 'success'}">
        <h3>Total Violations</h3>
        <div class="value">${totalViolations}</div>
      </div>
      <div class="summary-item ${pagesWithViolations > 0 ? 'warning' : 'success'}">
        <h3>Pages with Violations</h3>
        <div class="value">${pagesWithViolations}</div>
      </div>
      <div class="summary-item ${pagesWithErrors > 0 ? 'error' : 'success'}">
        <h3>Pages with Errors</h3>
        <div class="value">${pagesWithErrors}</div>
      </div>
    </div>
  </div>

  ${results.map(result => {
        const hasViolations = result.violations?.length > 0;
        const hasError = !!result.error;
        const cssClass = hasError ? 'has-error' : hasViolations ? 'has-violations' : 'clean';

        return `
    <div class="page-result ${cssClass}">
      <h2 class="page-title">${result.title}</h2>
      <div class="page-meta">
        <strong>Locale:</strong> ${result.locale} |
        <strong>Route:</strong> ${result.route} |
        <strong>URL:</strong> <a href="${result.url}" target="_blank">${result.url}</a>
      </div>
      
      ${result.error ? `
        <div class="violation violation-critical">
          <h4>❌ Test Error</h4>
          <p>${result.error}</p>
        </div>
      ` : ''}
      
            ${result.screenshot ? `
                <div class="page-screenshot">
                    <strong>Screenshot:</strong><br>
                    <img src="${result.screenshot}" alt="Screenshot of ${result.title}">
                </div>
            ` : ''}
      
      ${!result.error && result.violations?.length === 0 ? `
        <p style="color: #28a745; font-weight: bold;">✅ No accessibility violations found!</p>
        <p><strong>Tests passed:</strong> ${result.passes}</p>
      ` : ''}
      
      ${result.violations?.map(violation => {
            const impactClass = `impact-${violation.impact}`;
            const violationClass = violation.impact === 'critical' || violation.impact === 'serious'
                ? 'violation-critical'
                : violation.impact === 'moderate'
                    ? 'violation-moderate'
                    : 'violation-minor';

            // Build nodes HTML with proper escaping
            let nodesHtml = '';
            violation.nodes.forEach(node => {
                const escapedHtml = node.html
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;');

                nodesHtml += `
              <div class="violation-node">
                <strong>Element:</strong><br>
                <code style="display: block; white-space: pre-wrap; word-break: break-all; margin: 8px 0; padding: 8px; background: #f5f5f5; border-radius: 4px;">${escapedHtml}</code>
                <strong>Impact:</strong> ${node.impact}<br>
                ${node.failureSummary ? `<strong>Issue:</strong> ${node.failureSummary}<br>` : ''}
              </div>
            `;
            });

            return `
        <div class="violation ${violationClass}">
          <h4>
            <span class="violation-impact ${impactClass}">${violation.impact.toUpperCase()}</span>
            ${violation.help}
          </h4>
          <p><strong>Description:</strong> ${violation.description}</p>
          <p><strong>WCAG Tags:</strong> ${violation.tags.join(', ')}</p>
          <p><strong>Affected elements:</strong> ${violation.nodes.length}</p>
          
          <div class="violation-nodes">
            ${nodesHtml}
          </div>
          
          <p><strong>Learn more:</strong> <a href="${violation.helpUrl}" target="_blank">${violation.helpUrl}</a></p>
        </div>
        `;
        }).join('') || ''}
    </div>
    `;
    }).join('')}
  
  <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px;">
    Generated on ${new Date().toLocaleString()} using axe-core
  </footer>
</body>
</html>`;

    fs.writeFileSync(outputPath, html);
    console.log(`\n📄 HTML report saved to: ${outputPath}`);
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

    let pageUrls = [];
    if (!options.tourMode) {
        console.log('📦 Extracting page data from build...');
        const pageResources = extractPageResources();
        pageUrls = getPageUrls(pageResources);
        console.log(`✅ Found ${pageUrls.length} pages to test\n`);

        if (pageUrls.length === 0) {
            console.error('No pages found to test!');
            process.exit(1);
        }
    } else {
        console.log('🚶 Tour testing mode enabled — skipping page enumeration\n');
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
    let results = [];
    if (options.tourMode) {
        console.log('🧭 Running tour sequence...');
        results = await runTourFlow(page, options);
    } else {
        results = [];
        let testCount = 0;

        for (let i = 0; i < pageUrls.length; i++) {
            const pageInfo = pageUrls[i];
            testCount++;
            const progress = `[${testCount}/${pageUrls.length}]`;
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
    }

    await browser.close();

    // Generate reports
    console.log('\n📊 Generating reports...');

    // JSON report
    const jsonPath = path.join(options.outputDir, 'accessibility-results.json');
    fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
    console.log(`📄 JSON report saved to: ${jsonPath}`);

    // HTML report
    const htmlPath = path.join(options.outputDir, 'accessibility-report.html');
    generateHtmlReport(results, htmlPath);

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
