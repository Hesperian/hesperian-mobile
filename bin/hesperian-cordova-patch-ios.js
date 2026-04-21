#!/usr/bin/env node

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const cordovaDir = path.resolve(process.argv[2] || "cordova");
const originalSha = "b6685498fc992ebd6c31afadb33fa6a4210629f33055833aafbffc2c9a19325f";
const patchedSha = "33e04d0843a69ea32d6e6baab86baf39a8c902e6e7c0aca334d4163dfe5f765b";
const relativeTargets = [
  "node_modules/cordova-ios/CordovaLib/Classes/Private/Plugins/CDVWebViewEngine/CDVURLSchemeHandler.m",
  "platforms/ios/packages/cordova-ios/CordovaLib/Classes/Private/Plugins/CDVWebViewEngine/CDVURLSchemeHandler.m",
];

const originalBlock = `    if ([plugin isEqual:[NSNull null]]) {
        // NSNull means we own this task, so we need to mark it as finished
        [urlSchemeTask didFinish];
    } else if ([plugin respondsToSelector:@selector(stopSchemeTask:)]) {`;

const patchedBlock = `    if ([plugin respondsToSelector:@selector(stopSchemeTask:)]) {`;

function sha256(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function patchTarget(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const currentSha = sha256(content);
  const relativePath = path.relative(cordovaDir, filePath);

  if (currentSha === patchedSha) {
    console.log(`cordova-ios patch already applied: ${relativePath}`);
    return;
  }

  if (currentSha !== originalSha) {
    throw new Error(
      `Unexpected CDVURLSchemeHandler.m sha for ${relativePath}: ${currentSha}`
    );
  }

  if (!content.includes(originalBlock)) {
    throw new Error(`Expected patch block not found in ${relativePath}`);
  }

  const patchedContent = content.replace(originalBlock, patchedBlock);
  const nextSha = sha256(patchedContent);

  if (nextSha !== patchedSha) {
    throw new Error(
      `Patched sha mismatch for ${relativePath}: expected ${patchedSha}, got ${nextSha}`
    );
  }

  fs.writeFileSync(filePath, patchedContent);
  console.log(`Applied cordova-ios patch: ${relativePath}`);
}

let foundTarget = false;

for (const relativeTarget of relativeTargets) {
  const filePath = path.join(cordovaDir, relativeTarget);
  if (!fs.existsSync(filePath)) continue;
  foundTarget = true;
  patchTarget(filePath);
}

if (!foundTarget) {
  console.log(`No iOS Cordova URL scheme handler found under ${cordovaDir}`);
}
