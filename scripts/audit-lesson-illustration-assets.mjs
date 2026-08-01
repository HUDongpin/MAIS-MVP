#!/usr/bin/env node
// Lesson-illustration asset integrity gate.
//
// Every illustration manifest under data/ names public asset paths. Nothing
// checked that those files exist, so `852fe6dd39` could delete the low-quality
// mainland-hjb-high/-junior PNGs while leaving the metadata live: production
// then served 104 lesson illustrations that 404'd, from 2026-06-20 until this
// gate landed. Committed manifests and committed assets must not drift again.
//
// The repo's established way to retire a manifest without deleting the authored
// metadata is the withdrawal pattern: rename the array to `<name>Drafts`, add a
// `<name>Withdrawal` record, and export an empty live array. Drafts are allowed
// to reference assets that do not exist — that is the whole point of a draft —
// so this gate exempts a `*Drafts` export only when the module also exports the
// matching `*Withdrawal` record, and only when the live array really is empty.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(repoRoot, "data");
const publicDir = path.join(repoRoot, "public");
const ASSET_PREFIX = /^\/(lesson-illustrations|question-illustrations|forum-assets)\//;

function collectAssetPaths(node, found = new Set()) {
  if (typeof node === "string") {
    if (ASSET_PREFIX.test(node)) found.add(node);
    return found;
  }
  if (Array.isArray(node)) {
    for (const item of node) collectAssetPaths(item, found);
    return found;
  }
  if (node && typeof node === "object") {
    for (const value of Object.values(node)) collectAssetPaths(value, found);
  }
  return found;
}

const manifests = fs
  .readdirSync(dataDir)
  .filter((name) => name.endsWith("LessonIllustrations.ts"))
  .sort();

if (manifests.length === 0) {
  console.error("audit:lesson-illustrations: no data/*LessonIllustrations.ts manifests found");
  process.exit(1);
}

const failures = [];
let checkedExports = 0;
let checkedAssets = 0;
let withdrawnExports = 0;

for (const manifest of manifests) {
  const moduleUrl = pathToFileURL(path.join(dataDir, manifest)).href;
  const module = await import(moduleUrl);
  const exportNames = new Set(Object.keys(module));

  for (const [exportName, value] of Object.entries(module)) {
    if (typeof value === "function") continue;

    // A withdrawn draft is exempt, but only if the module carries the full
    // withdrawal contract: the `*Withdrawal` record and an empty live array.
    if (exportName.endsWith("Drafts")) {
      const base = exportName.slice(0, -"Drafts".length);
      const withdrawalName = `${base}Withdrawal`;
      const liveName = `${base}s`;

      if (!exportNames.has(withdrawalName)) {
        failures.push(
          `${manifest}: ${exportName} references draft assets but the module does not export ${withdrawalName}. ` +
            `Add the withdrawal record, or promote the assets and rename the export.`
        );
        continue;
      }
      if (exportNames.has(liveName) && Array.isArray(module[liveName]) && module[liveName].length > 0) {
        failures.push(
          `${manifest}: ${withdrawalName} declares the surface withdrawn but ${liveName} still has ` +
            `${module[liveName].length} live entries.`
        );
        continue;
      }
      withdrawnExports++;
      continue;
    }

    const assets = collectAssetPaths(value);
    if (assets.size === 0) continue;
    checkedExports++;

    for (const assetPath of [...assets].sort()) {
      checkedAssets++;
      if (!fs.existsSync(path.join(publicDir, assetPath.slice(1)))) {
        failures.push(`${manifest}: ${exportName} references missing asset public${assetPath}`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error(`audit:lesson-illustrations FAILED — ${failures.length} issue(s):\n`);
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error(
    "\nEvery asset named by a live illustration export must exist in the repo. " +
      "Commit the assets, or withdraw the surface (see mainlandPepPrimaryLessonIllustrations.ts)."
  );
  process.exit(1);
}

console.log(
  `audit:lesson-illustrations PASS — ${checkedAssets} asset(s) across ${checkedExports} live export(s) ` +
    `in ${manifests.length} manifest(s); ${withdrawnExports} withdrawn draft export(s) skipped.`
);
