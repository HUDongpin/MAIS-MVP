#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  RELEASE_SOURCE_BLOCKER_PATHS,
  buildReleaseSourceBlockerEvidence,
  stableReleaseSourceBlockerProjection
} from "./generate-a22-release-source-clean-blocker-evidence.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A22-release-source-clean-blocker-evidence-current-gate.json");
const json = process.argv.includes("--json");

function git(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function main() {
  const failures = [];
  for (const requiredPath of [RELEASE_SOURCE_BLOCKER_PATHS.latestJson, RELEASE_SOURCE_BLOCKER_PATHS.latestMarkdown]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) {
    return finish({ failures, releaseSourceClean: false, rootStatusEntries: 0, dirtyMapExpandedEntries: 0 });
  }

  const recorded = readJson(RELEASE_SOURCE_BLOCKER_PATHS.latestJson);
  const current = buildReleaseSourceBlockerEvidence();
  if (!sameJson(stableReleaseSourceBlockerProjection(recorded), stableReleaseSourceBlockerProjection(current))) {
    failures.push("A22 release-source clean blocker evidence is stale relative to git status, dirty-map, or release-source clean gate");
  }

  const summary = recorded.summary ?? {};
  const boundary = recorded.boundary ?? {};
  if ((summary.cleanupAuthorizedRows ?? 0) !== 0) failures.push("release-source blocker evidence must not authorize cleanup");
  if ((summary.executableRows ?? 0) !== 0) failures.push("release-source blocker evidence must not have executable rows");
  if ((summary.contentCapturedRows ?? 0) !== 0) failures.push("release-source blocker evidence must not capture file contents");
  if (boundary.evidenceOnly !== true) failures.push("boundary.evidenceOnly must be true");
  if (boundary.cleanupAuthorized !== false) failures.push("boundary.cleanupAuthorized must be false");
  if (boundary.executableNow !== false) failures.push("boundary.executableNow must be false");
  if (boundary.contentCaptured !== false) failures.push("boundary.contentCaptured must be false");
  if (boundary.destructiveGitAuthorized !== false) failures.push("boundary.destructiveGitAuthorized must be false");
  if (boundary.deployAuthorized !== false) failures.push("boundary.deployAuthorized must be false");

  const markdown = readText(RELEASE_SOURCE_BLOCKER_PATHS.latestMarkdown);
  for (const needle of [
    "does not authorize staging",
    "does not copy file contents",
    "Every row remains non-executable"
  ]) {
    if (!markdown.includes(needle)) failures.push(`release-source blocker markdown missing boundary text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("release-source blocker markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    releaseSourceClean: summary.releaseSourceClean,
    rootStatusEntries: summary.rootStatusEntries,
    dirtyMapExpandedEntries: summary.dirtyMapExpandedEntries,
    cleanupAuthorizedRows: summary.cleanupAuthorizedRows,
    executableRows: summary.executableRows,
    failures
  });
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A22 release-source clean blocker evidence gate");
    console.log(`Release source clean: ${payload.releaseSourceClean ? "yes" : "no"}`);
    console.log(`Root status entries: ${payload.rootStatusEntries ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }

  if (payload.failures.length > 0) {
    console.error("A22 release-source clean blocker evidence gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
