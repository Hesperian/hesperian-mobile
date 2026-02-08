#!/usr/bin/env node
/*
    Check that the development environment has the required tools
    for Cordova builds.

    Reads expected versions from cordova/versions.json.
    Exit 0 if all required checks pass, exit 1 otherwise.
*/
const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const versionsPath = path.resolve(__dirname, "../cordova/versions.json");
const versions = JSON.parse(fs.readFileSync(versionsPath, "utf-8"));

const results = [];
let hasFailure = false;

function run(cmd) {
  try {
    return execSync(cmd, { encoding: "utf-8", timeout: 15000 }).trim();
  } catch {
    return null;
  }
}

function check(name, { required = true, test, fix }) {
  const result = test();
  const status = result.pass ? "PASS" : required ? "FAIL" : "WARN";
  if (!result.pass && required) hasFailure = true;
  results.push({ name, status, detail: result.detail, fix: result.pass ? null : fix });
}

// --- Checks ---

check("Node.js >= 22", {
  test() {
    const major = parseInt(process.versions.node.split(".")[0], 10);
    return {
      pass: major >= 22,
      detail: `v${process.versions.node}`,
    };
  },
  fix: "Install Node.js 22+ via fnm: fnm install v22 && fnm use v22",
});

check(`Java JDK ${versions.android.java}`, {
  test() {
    const out = run("java -version 2>&1");
    if (!out) return { pass: false, detail: "java not found" };
    const match = out.match(/version "(\d+)/);
    const major = match ? parseInt(match[1], 10) : 0;
    return {
      pass: major === parseInt(versions.android.java, 10),
      detail: out.split("\n")[0],
    };
  },
  fix: `Install JDK ${versions.android.java}: brew install openjdk@${versions.android.java}`,
});

check("JAVA_HOME", {
  test() {
    const val = process.env.JAVA_HOME;
    return {
      pass: !!val && fs.existsSync(val),
      detail: val || "not set",
    };
  },
  fix: `Set JAVA_HOME to your JDK ${versions.android.java} installation path`,
});

check("ANDROID_HOME / Android SDK", {
  test() {
    const val = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
    if (!val) return { pass: false, detail: "not set" };
    const exists = fs.existsSync(val);
    return {
      pass: exists,
      detail: exists ? val : `${val} (path does not exist)`,
    };
  },
  fix: "Set ANDROID_HOME to your Android SDK path (e.g. ~/Library/Android/sdk)",
});

check("Xcode", {
  test() {
    const out = run("xcodebuild -version 2>&1");
    if (!out || out.includes("error")) return { pass: false, detail: out || "not found" };
    return { pass: true, detail: out.split("\n")[0] };
  },
  fix: "Install Xcode from the Mac App Store and run: sudo xcode-select --switch /Applications/Xcode.app",
});

check("Xcode Command Line Tools", {
  test() {
    const out = run("xcode-select -p 2>&1");
    return {
      pass: !!out && !out.includes("error"),
      detail: out || "not found",
    };
  },
  fix: "Install with: xcode-select --install",
});

check(`CocoaPods >= ${versions.ios.cocoapods}`, {
  test() {
    const out = run("pod --version 2>&1");
    if (!out) return { pass: false, detail: "not found" };
    return { pass: true, detail: `v${out}` };
  },
  fix: "Install CocoaPods: sudo gem install cocoapods",
});

check("1Password CLI (op)", {
  required: false,
  test() {
    const out = run("op --version 2>&1");
    if (!out || out.includes("not found")) return { pass: false, detail: "not found" };
    return { pass: true, detail: `v${out}` };
  },
  fix: "Install 1Password CLI: brew install 1password-cli (required for release builds, injects CORDOVA_SIGNING_PASSPHRASE)",
});

check("bundletool", {
  required: false,
  test() {
    const out = run("bundletool version 2>&1");
    return {
      pass: !!out && !out.includes("not found"),
      detail: out || "not found",
    };
  },
  fix: "Install bundletool: brew install bundletool (optional, for APK extraction)",
});

// --- Output ---

const statusColors = { PASS: "\x1b[32m", FAIL: "\x1b[31m", WARN: "\x1b[33m" };
const reset = "\x1b[0m";

console.log("\nCordova Build Environment Check");
console.log("=".repeat(50));

for (const r of results) {
  const color = statusColors[r.status] || "";
  console.log(`  ${color}[${r.status}]${reset} ${r.name}: ${r.detail}`);
  if (r.fix) {
    console.log(`         -> ${r.fix}`);
  }
}

console.log("=".repeat(50));

if (hasFailure) {
  console.log("\x1b[31mSome required checks failed. Fix the issues above before building.\x1b[0m\n");
  process.exit(1);
} else {
  console.log("\x1b[32mAll required checks passed.\x1b[0m\n");
  process.exit(0);
}
