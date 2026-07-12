#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  STRICT_WORKTREE_LIFECYCLE_BLOCKER_PATHS,
  buildStrictWorktreeLifecycleBlockerEvidence,
  stableStrictWorktreeLifecycleBlockerProjection
} from "./generate-a25-strict-worktree-lifecycle-blocker-evidence.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-strict-worktree-lifecycle-blocker-evidence-current-gate.json");
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
  for (const requiredPath of [
    STRICT_WORKTREE_LIFECYCLE_BLOCKER_PATHS.latestJson,
    STRICT_WORKTREE_LIFECYCLE_BLOCKER_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) {
    return finish({ failures, strictLifecycleClean: false, dirtyOpenDecisions: 0, cleanDivergedOpenDecisions: 0 });
  }

  const recorded = readJson(STRICT_WORKTREE_LIFECYCLE_BLOCKER_PATHS.latestJson);
  const current = buildStrictWorktreeLifecycleBlockerEvidence();
  if (!sameJson(stableStrictWorktreeLifecycleBlockerProjection(recorded), stableStrictWorktreeLifecycleBlockerProjection(current))) {
    failures.push("A25 strict worktree lifecycle blocker evidence is stale relative to worktree lifecycle gate, dirty-map, or physical closure queue");
  }

  const summary = recorded.summary ?? {};
  const boundary = recorded.boundary ?? {};
  const rows = recorded.rows ?? [];
  if ((summary.cleanupAuthorizedRows ?? 0) !== 0) failures.push("strict lifecycle blocker evidence must not authorize cleanup");
  if ((summary.executableRows ?? 0) !== 0) failures.push("strict lifecycle blocker evidence must not have executable rows");
  if ((summary.worktreeRemovalAuthorizedRows ?? 0) !== 0) failures.push("strict lifecycle blocker evidence must not authorize worktree removal");
  if ((summary.branchDeletionAuthorizedRows ?? 0) !== 0) failures.push("strict lifecycle blocker evidence must not authorize branch deletion");
  if ((summary.contentCapturedRows ?? 0) !== 0) failures.push("strict lifecycle blocker evidence must not capture file contents");
  if ((summary.openDecisionRows ?? rows.length) !== rows.length) failures.push("open decision row summary is stale");

  for (const row of rows) {
    if (row.evidenceOnly !== true) failures.push(`${row.branch}: evidenceOnly must be true`);
    if (row.cleanupAuthorized !== false) failures.push(`${row.branch}: cleanupAuthorized must be false`);
    if (row.executableNow !== false) failures.push(`${row.branch}: executableNow must be false`);
    if (row.worktreeRemovalAuthorized !== false) failures.push(`${row.branch}: worktreeRemovalAuthorized must be false`);
    if (row.branchDeletionAuthorized !== false) failures.push(`${row.branch}: branchDeletionAuthorized must be false`);
    if (row.contentCaptured !== false) failures.push(`${row.branch}: contentCaptured must be false`);
  }

  if (boundary.evidenceOnly !== true) failures.push("boundary.evidenceOnly must be true");
  if (boundary.cleanupAuthorized !== false) failures.push("boundary.cleanupAuthorized must be false");
  if (boundary.executableNow !== false) failures.push("boundary.executableNow must be false");
  if (boundary.worktreeRemovalAuthorized !== false) failures.push("boundary.worktreeRemovalAuthorized must be false");
  if (boundary.branchDeletionAuthorized !== false) failures.push("boundary.branchDeletionAuthorized must be false");
  if (boundary.contentCaptured !== false) failures.push("boundary.contentCaptured must be false");
  if (boundary.destructiveGitAuthorized !== false) failures.push("boundary.destructiveGitAuthorized must be false");
  if (boundary.deployAuthorized !== false) failures.push("boundary.deployAuthorized must be false");

  const markdown = readText(STRICT_WORKTREE_LIFECYCLE_BLOCKER_PATHS.latestMarkdown);
  for (const needle of [
    "does not authorize staging",
    "does not copy file contents",
    "Every row remains non-executable"
  ]) {
    if (!markdown.includes(needle)) failures.push(`strict lifecycle blocker markdown missing boundary text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("strict lifecycle blocker markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    strictLifecycleClean: summary.strictLifecycleClean,
    worktreeCount: summary.worktreeCount,
    dirtyOpenDecisions: summary.dirtyOpenDecisions,
    cleanDivergedOpenDecisions: summary.cleanDivergedOpenDecisions,
    openDecisionRows: summary.openDecisionRows,
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
    console.log("A25 strict worktree lifecycle blocker evidence gate");
    console.log(`Strict lifecycle clean: ${payload.strictLifecycleClean ? "yes" : "no"}`);
    console.log(`Open decision rows: ${payload.openDecisionRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }

  if (payload.failures.length > 0) {
    console.error("A25 strict worktree lifecycle blocker evidence gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
