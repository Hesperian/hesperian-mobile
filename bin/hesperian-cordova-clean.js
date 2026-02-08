#!/usr/bin/env node
/*
    Remove all generated/cached Cordova state for a fresh build.

    Usage: hesperian-cordova-clean [app-root-dir] [--dry-run] [--full]

    Options:
      --dry-run   Show what would be removed without deleting anything
      --full      Also remove cordova/package-lock.json
*/
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const full = args.includes("--full");
const appRoot = path.resolve(args.find((a) => !a.startsWith("--")) || process.cwd());
const cordovaDir = path.join(appRoot, "cordova");

if (!fs.existsSync(cordovaDir)) {
  console.error(`Error: cordova directory not found at ${cordovaDir}`);
  process.exit(1);
}

// Read app name for DerivedData matching
let appName = null;
try {
  const appConfig = JSON.parse(fs.readFileSync(path.join(appRoot, "app-config.json"), "utf-8"));
  appName = appConfig.name;
} catch {
  // app-config.json may not exist, skip DerivedData cleanup
}

const targets = [
  path.join(cordovaDir, "platforms"),
  path.join(cordovaDir, "plugins"),
  path.join(cordovaDir, "node_modules"),
  path.join(cordovaDir, "www"),
  path.join(cordovaDir, "config.xml"),
  path.join(cordovaDir, "resources-tmp"),
];

if (full) {
  targets.push(path.join(cordovaDir, "package-lock.json"));
}

// Xcode DerivedData entries matching the app
const derivedDataDir = path.join(
  process.env.HOME,
  "Library/Developer/Xcode/DerivedData"
);

if (appName && fs.existsSync(derivedDataDir)) {
  try {
    const entries = fs.readdirSync(derivedDataDir);
    // Xcode names DerivedData folders like "AppName-<hash>"
    // Normalize: remove spaces/special chars for matching
    const normalized = appName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    for (const entry of entries) {
      const entryNorm = entry.split("-")[0].replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      if (entryNorm === normalized) {
        targets.push(path.join(derivedDataDir, entry));
      }
    }
  } catch {
    // skip if we can't read DerivedData
  }
}

const label = dryRun ? "Would remove" : "Removing";
let removedCount = 0;

for (const target of targets) {
  if (fs.existsSync(target)) {
    console.log(`  ${label}: ${path.relative(appRoot, target) || target}`);
    if (!dryRun) {
      fs.rmSync(target, { recursive: true, force: true });
    }
    removedCount++;
  }
}

if (removedCount === 0) {
  console.log("Nothing to clean.");
} else if (dryRun) {
  console.log(`\nDry run: ${removedCount} items would be removed. Run without --dry-run to delete.`);
} else {
  console.log(`\nRemoved ${removedCount} items. Cordova state is clean.`);
}
