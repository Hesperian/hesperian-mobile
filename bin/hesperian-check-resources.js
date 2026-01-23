#!/usr/bin/env node
/*
    Check resource translations against the base English locale.

    Reports which resource keys are missing in each localization.
*/

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const appConfig = JSON.parse(fs.readFileSync('app-config.json', 'utf8'));
const localizationDirs = appConfig.localizations.map((v) => v.language_code);

/**
 * Parse a resources.js file and extract the resources object.
 * Handles ES module syntax by converting to CommonJS.
 */
function parseResourcesFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Convert ES module export to CommonJS
    const convertedContent = content
        .replace(/export\s*\{\s*resources\s*\}\s*;?/, 'module.exports = resources;')
        .replace(/export\s+default\s+resources\s*;?/, 'module.exports = resources;');

    // Create a sandbox to execute the code
    const sandbox = { module: { exports: {} } };
    vm.createContext(sandbox);

    try {
        vm.runInContext(convertedContent, sandbox);
        return sandbox.module.exports;
    } catch (e) {
        console.error(`Error parsing ${filePath}: ${e.message}`);
        return null;
    }
}

/**
 * Get all keys from an object recursively, returning them as dot-notation paths.
 */
function getAllKeys(obj, prefix = '') {
    let keys = [];

    for (const key of Object.keys(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        const value = obj[key];

        if (value && typeof value === 'object' && !Array.isArray(value)) {
            keys.push(fullKey);
            keys = keys.concat(getAllKeys(value, fullKey));
        } else {
            keys.push(fullKey);
        }
    }

    return keys;
}

/**
 * Get value at a dot-notation path.
 */
function getValueAtPath(obj, pathStr) {
    const parts = pathStr.split('.');
    let current = obj;

    for (const part of parts) {
        if (current === undefined || current === null) {
            return undefined;
        }
        current = current[part];
    }

    return current;
}

/**
 * Check if a key exists in an object (using dot notation).
 */
function hasKey(obj, pathStr) {
    return getValueAtPath(obj, pathStr) !== undefined;
}

/**
 * Compare two resource objects and find missing keys.
 */
function findMissingKeys(baseResources, targetResources) {
    const baseKeys = getAllKeys(baseResources);
    const missing = [];

    for (const key of baseKeys) {
        if (!hasKey(targetResources, key)) {
            missing.push(key);
        }
    }

    return missing;
}

/**
 * Find extra keys in target that don't exist in base.
 */
function findExtraKeys(baseResources, targetResources) {
    const baseKeys = new Set(getAllKeys(baseResources));
    const targetKeys = getAllKeys(targetResources);
    const extra = [];

    for (const key of targetKeys) {
        if (!baseKeys.has(key)) {
            extra.push(key);
        }
    }

    return extra;
}

// Parse command line args
const args = process.argv.slice(2);
const showValues = args.includes('--values') || args.includes('-v');
const showExtra = args.includes('--extra') || args.includes('-e');
const jsonOutput = args.includes('--json') || args.includes('-j');
const helpRequested = args.includes('--help') || args.includes('-h');

if (helpRequested) {
    console.log(`
Usage: hesperian-check-resources [options]

Options:
  -v, --values    Show the English values for missing keys
  -e, --extra     Also report extra keys in localizations not in English
  -j, --json      Output as JSON
  -h, --help      Show this help message

Checks all localized resources.js files against the English base.
Reports which keys are missing in each localization.
`);
    process.exit(0);
}

// Load English resources as base
const enResourcesPath = 'www/locales/en/resources/resources.js';
if (!fs.existsSync(enResourcesPath)) {
    console.error(`Error: English resources file not found at ${enResourcesPath}`);
    process.exit(1);
}

const enResources = parseResourcesFile(enResourcesPath);
if (!enResources) {
    console.error('Error: Failed to parse English resources');
    process.exit(1);
}

const results = {};
let totalMissing = 0;
let totalExtra = 0;

// Check each localization
for (const locale of localizationDirs) {
    if (locale === 'en') continue;

    const resourcesPath = `www/locales/${locale}/resources/resources.js`;

    if (!fs.existsSync(resourcesPath)) {
        results[locale] = { error: 'File not found' };
        continue;
    }

    const resources = parseResourcesFile(resourcesPath);
    if (!resources) {
        results[locale] = { error: 'Failed to parse' };
        continue;
    }

    const missing = findMissingKeys(enResources, resources);
    const extra = showExtra ? findExtraKeys(enResources, resources) : [];

    results[locale] = {
        missing,
        extra,
        missingCount: missing.length,
        extraCount: extra.length
    };

    totalMissing += missing.length;
    totalExtra += extra.length;
}

// Output results
if (jsonOutput) {
    const output = {
        summary: {
            totalLocales: localizationDirs.length - 1,
            totalMissingKeys: totalMissing,
            totalExtraKeys: showExtra ? totalExtra : undefined
        },
        locales: {}
    };

    for (const locale of Object.keys(results)) {
        const result = results[locale];
        output.locales[locale] = result;

        if (showValues && result.missing) {
            output.locales[locale].missingValues = {};
            for (const key of result.missing) {
                output.locales[locale].missingValues[key] = getValueAtPath(enResources, key);
            }
        }
    }

    console.log(JSON.stringify(output, null, 2));
} else {
    console.log('Resource Translation Check');
    console.log('==========================');
    console.log(`Base locale: en`);
    console.log(`Checking ${localizationDirs.length - 1} localizations\n`);

    for (const locale of Object.keys(results).sort()) {
        const result = results[locale];
        const localeInfo = appConfig.localizations.find(l => l.language_code === locale);
        const localeName = localeInfo ? localeInfo.language : locale;

        console.log(`\n${localeName} (${locale})`);
        console.log('-'.repeat(40));

        if (result.error) {
            console.log(`  Error: ${result.error}`);
            continue;
        }

        if (result.missing.length === 0) {
            console.log('  ✓ All keys present');
        } else {
            console.log(`  Missing ${result.missing.length} key(s):`);
            for (const key of result.missing) {
                if (showValues) {
                    const value = getValueAtPath(enResources, key);
                    const displayValue = typeof value === 'string'
                        ? value.substring(0, 50) + (value.length > 50 ? '...' : '')
                        : JSON.stringify(value).substring(0, 50);
                    console.log(`    - ${key}`);
                    console.log(`      "${displayValue}"`);
                } else {
                    console.log(`    - ${key}`);
                }
            }
        }

        if (showExtra && result.extra.length > 0) {
            console.log(`  Extra ${result.extra.length} key(s) (not in English):`);
            for (const key of result.extra) {
                console.log(`    + ${key}`);
            }
        }
    }

    console.log('\n' + '='.repeat(40));
    console.log('Summary');
    console.log('='.repeat(40));
    console.log(`Total missing keys: ${totalMissing}`);
    if (showExtra) {
        console.log(`Total extra keys: ${totalExtra}`);
    }
}
