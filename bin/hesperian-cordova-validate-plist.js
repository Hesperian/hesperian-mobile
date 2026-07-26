#!/usr/bin/env node
/*
    Validate iOS Info.plist values after cordova prepare.
    Fails if known-bad placeholder strings or incorrect values are found.

    Usage: hesperian-cordova-validate-plist <path-to-Info.plist>
*/
const { execSync } = require("child_process");
const fs = require("fs");

const plistPath = process.argv[2];

if (!plistPath) {
  console.error("Usage: hesperian-cordova-validate-plist <path-to-Info.plist>");
  process.exit(1);
}

if (!fs.existsSync(plistPath)) {
  console.log(`validate-plist: ${plistPath} not found, skipping`);
  process.exit(0);
}

let plist;
try {
  const json = execSync(`plutil -convert json -o - "${plistPath}"`).toString();
  plist = JSON.parse(json);
} catch (e) {
  console.error(`validate-plist: failed to parse ${plistPath}: ${e.message}`);
  process.exit(1);
}

// Known Apple-rejected placeholder strings that the socialsharing plugin ships as defaults.
const KNOWN_PLACEHOLDERS = [
  "This app requires photo library access to function properly.",
];

const checks = [
  {
    key: "NSPhotoLibraryAddUsageDescription",
    test: (v) =>
      v !== undefined &&
      v.trim().length > 20 &&
      !KNOWN_PLACEHOLDERS.includes(v),
    message: `must not be a placeholder string (update PHOTO_ADD_DESC in hesperian-cordova-makeconfig.js)`,
  },
  {
    key: "NSPhotoLibraryUsageDescription",
    test: (v) =>
      v !== undefined &&
      v.trim().length > 20 &&
      !KNOWN_PLACEHOLDERS.includes(v),
    message: `must not be a placeholder string (update PHOTO_USAGE_DESC in hesperian-cordova-makeconfig.js)`,
  },
  {
    key: "ITSAppUsesNonExemptEncryption",
    test: (v) => v === false,
    message: `must be false`,
  },
];

let passed = 0;
let failed = 0;

console.log(`Validating ${plistPath}`);
for (const { key, test, message } of checks) {
  const value = plist[key];
  if (test(value)) {
    console.log(`  ✅ ${key}: ${JSON.stringify(value)}`);
    passed++;
  } else {
    console.error(`  ❌ ${key}: ${message}`);
    console.error(`       actual: ${JSON.stringify(value)}`);
    failed++;
  }
}

if (failed > 0) {
  console.error(
    `\nPlist validation FAILED: ${failed} check(s) failed, ${passed} passed.`
  );
  console.error(`Fix values in hesperian-cordova-makeconfig.js and re-run: make config`);
  process.exit(1);
} else {
  console.log(`Plist validation passed (${passed} checks).`);
}
