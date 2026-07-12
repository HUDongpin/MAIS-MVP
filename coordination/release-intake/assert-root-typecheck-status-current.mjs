#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  ROOT_TYPECHECK_STATUS_PATHS,
  buildRootTypecheckStatus,
  stableRootTypecheckStatusProjection
} from "./generate-root-typecheck-status.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-root-typecheck-status-current-gate.json");
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
  for (const requiredPath of [ROOT_TYPECHECK_STATUS_PATHS.latestJson, ROOT_TYPECHECK_STATUS_PATHS.latestMarkdown]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }

  if (failures.length > 0) {
    return finish({ failures, rootTypeCheckPassed: false, packageWorktreeTypeCheckErrorLines: 0 });
  }

  const recorded = readJson(ROOT_TYPECHECK_STATUS_PATHS.latestJson);
  const current = buildRootTypecheckStatus();

  if (!sameJson(stableRootTypecheckStatusProjection(recorded), stableRootTypecheckStatusProjection(current))) {
    failures.push("A25 root type-check status is stale relative to current root/package type-check evidence");
  }

  const boundary = recorded.boundary ?? {};
  if (boundary.evidenceOnly !== true) failures.push("boundary.evidenceOnly must be true");
  if (boundary.cleanupAuthorized !== false) failures.push("boundary.cleanupAuthorized must be false");
  if (boundary.executableNow !== false) failures.push("boundary.executableNow must be false");
  if (boundary.deployAuthorized !== false) failures.push("boundary.deployAuthorized must be false");
  if (boundary.dirtyRootDeployAuthorized !== false) failures.push("boundary.dirtyRootDeployAuthorized must be false");
  if ((recorded.summary?.cleanupAuthorizedRows ?? 0) !== 0) failures.push("summary.cleanupAuthorizedRows must be 0");
  if ((recorded.summary?.executableRows ?? 0) !== 0) failures.push("summary.executableRows must be 0");
  if ((recorded.summary?.sourceCurrentnessFailures ?? 0) !== 0) failures.push("sourceCurrentnessFailures must be 0");
  if (recorded.rootTypeCheck?.command !== "npm run type-check -- --pretty false") failures.push("root type-check command must be explicit");
  if (recorded.rootTypeCheck?.layer !== "dirty-root-current-install") failures.push("root type-check layer must be dirty-root-current-install");
  if (!["root-green-package-worktree-red", "root-green", "root-red"].includes(recorded.layerComparison?.status ?? "")) {
    failures.push("layerComparison.status must be recognized");
  }

  const markdown = readText(ROOT_TYPECHECK_STATUS_PATHS.latestMarkdown);
  for (const needle of [
    "A25 Root Type-Check Status",
    "current dirty-root TypeScript gate",
    "owner-package/worktree type-check frontiers",
    "A green root type-check does not make the dirty root a deploy source",
    "does not authorize staging"
  ]) {
    if (!markdown.includes(needle)) failures.push(`root type-check markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("root type-check markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    rootTypeCheckPassed: recorded.summary?.rootTypeCheckPassed === true,
    rootTypeCheckErrorLines: recorded.summary?.rootTypeCheckErrorLines ?? 0,
    packageWorktreeTypeCheckErrorLines: recorded.summary?.packageWorktreeTypeCheckErrorLines ?? 0,
    layerComparisonStatus: recorded.layerComparison?.status ?? null,
    cleanupAuthorizedRows: recorded.summary?.cleanupAuthorizedRows ?? 0,
    executableRows: recorded.summary?.executableRows ?? 0,
    failures
  });
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 root type-check status gate");
    console.log(`Root type-check passed: ${payload.rootTypeCheckPassed ? "yes" : "no"}`);
    console.log(`Package/worktree type-check error lines: ${payload.packageWorktreeTypeCheckErrorLines ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }

  if (payload.failures.length > 0) {
    console.error("A25 root type-check status gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
