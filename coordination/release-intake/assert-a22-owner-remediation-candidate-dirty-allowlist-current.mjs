#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  A22_OWNER_REMEDIATION_CANDIDATE_DIRTY_ALLOWLIST_PATHS,
  buildA22OwnerRemediationCandidateDirtyAllowlist,
  stableA22OwnerRemediationCandidateDirtyAllowlistProjection
} from "./generate-a22-owner-remediation-candidate-dirty-allowlist.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A22-owner-remediation-candidate-dirty-allowlist-current-gate.json");
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
    A22_OWNER_REMEDIATION_CANDIDATE_DIRTY_ALLOWLIST_PATHS.latestJson,
    A22_OWNER_REMEDIATION_CANDIDATE_DIRTY_ALLOWLIST_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const recorded = readJson(A22_OWNER_REMEDIATION_CANDIDATE_DIRTY_ALLOWLIST_PATHS.latestJson);
  const current = buildA22OwnerRemediationCandidateDirtyAllowlist();
  if (!sameJson(
    stableA22OwnerRemediationCandidateDirtyAllowlistProjection(recorded),
    stableA22OwnerRemediationCandidateDirtyAllowlistProjection(current)
  )) {
    failures.push("A22 owner-remediation candidate dirty allowlist is stale");
  }

  const summary = recorded.summary ?? {};
  const boundary = recorded.boundary ?? {};
  const rows = recorded.allowlistRows ?? [];
  const a20Row = rows.find((item) => item.unitId === "a20-math-match-quest-data-parity");
  const packageJsonRow = rows.find((item) => item.unitId === "a10-a22-package-json-dependency-parity");
  const packageLockRow = rows.find((item) => item.unitId === "a10-a22-package-lock-dependency-parity");
  const expectedUnitIds = [
    "a20-math-match-quest-data-parity",
    "a10-a22-package-json-dependency-parity",
    "a10-a22-package-lock-dependency-parity"
  ];
  const expectedStatusRows = [
    "?? data/gameBasedLearning.ts",
    " M package.json",
    " M package-lock.json"
  ];

  if (recorded.artifactKind !== "a22-owner-remediation-candidate-dirty-allowlist") failures.push("artifactKind is invalid");
  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures must be empty");
  if (!String(recorded.targetWorktree ?? "").startsWith("/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/")) {
    failures.push("targetWorktree must be inside the MAIS-MVP superpowers worktree root");
  }
  if (rows.length !== 3) failures.push("allowlistRows must contain the A20 data row plus two A10/A22 package parity rows");
  if (!a20Row) failures.push("missing A20 Math Match Quest owner-remediation row");
  if (!packageJsonRow) failures.push("missing A10/A22 package.json dependency parity row");
  if (!packageLockRow) failures.push("missing A10/A22 package-lock dependency parity row");
  if (a20Row) {
    if (a20Row.ownerId !== "A20") failures.push("A20 row ownerId must be A20");
    if (a20Row.verificationKind !== "same-path-copy") failures.push("A20 row verificationKind must be same-path-copy");
    if (a20Row.selectedAction !== "same-path-copy") failures.push("A20 row selectedAction must be same-path-copy");
    if (a20Row.rootSourcePath !== "data/gameBasedLearning.ts") failures.push("A20 row rootSourcePath must be data/gameBasedLearning.ts");
    if (a20Row.candidateTargetPath !== "data/gameBasedLearning.ts") failures.push("A20 row candidateTargetPath must be data/gameBasedLearning.ts");
    if (a20Row.statusRow !== "?? data/gameBasedLearning.ts") failures.push("A20 row statusRow must match candidate git status");
    if (a20Row.verificationStatus !== "verified") failures.push("A20 row must be verified");
    if (a20Row.ownerScopeAllowed !== true) failures.push("A20 row ownerScopeAllowed must be true");
    if (a20Row.statusRowPresent !== true) failures.push("A20 row statusRowPresent must be true");
    if (a20Row.rootSource?.exists !== true) failures.push("A20 row root source must exist");
    if (a20Row.candidateTarget?.exists !== true) failures.push("A20 row candidate target must exist");
    if (!/^[a-f0-9]{64}$/.test(a20Row.rootSource?.sha256 ?? "")) failures.push("A20 row root source sha256 is invalid");
    if (a20Row.candidateTarget?.sha256 !== a20Row.rootSource?.sha256) failures.push("A20 row candidate target sha256 must match root");
    if (a20Row.candidateTargetMatchesRoot !== true) failures.push("A20 row candidateTargetMatchesRoot must be true");
  }
  for (const [label, row, expected] of [
    ["package.json", packageJsonRow, {
      verificationKind: "package-json-dependency-contract",
      candidateTargetPath: "package.json",
      statusRow: " M package.json"
    }],
    ["package-lock", packageLockRow, {
      verificationKind: "package-lock-dependency-contract",
      candidateTargetPath: "package-lock.json",
      statusRow: " M package-lock.json"
    }]
  ]) {
    if (!row) continue;
    if (row.ownerId !== "A10") failures.push(`${label} row ownerId must be A10`);
    if (row.selectedAction !== "package-dependency-parity") failures.push(`${label} row selectedAction must be package-dependency-parity`);
    if (row.verificationKind !== expected.verificationKind) failures.push(`${label} row verificationKind is stale`);
    if (row.rootSourcePath !== expected.candidateTargetPath) failures.push(`${label} row rootSourcePath is stale`);
    if (row.candidateTargetPath !== expected.candidateTargetPath) failures.push(`${label} row candidateTargetPath is stale`);
    if (row.statusRow !== expected.statusRow) failures.push(`${label} row statusRow must match candidate git status`);
    if (row.verificationStatus !== "verified") failures.push(`${label} row must be verified`);
    if (row.ownerScopeAllowed !== true) failures.push(`${label} row ownerScopeAllowed must be true`);
    if (row.statusRowPresent !== true) failures.push(`${label} row statusRowPresent must be true`);
    if (row.rootSource?.exists !== true) failures.push(`${label} row root source must exist`);
    if (row.candidateTarget?.exists !== true) failures.push(`${label} row candidate target must exist`);
    if (row.candidateTargetMatchesRoot !== true) failures.push(`${label} row dependency contract must match root`);
    if (row.packageContract?.passed !== true) failures.push(`${label} row packageContract must pass`);
    if (!(row.packageContract?.checks ?? []).every((check) => check.passed === true)) {
      failures.push(`${label} row packageContract checks must all pass`);
    }
  }

  if (summary.allowlistRows !== 3) failures.push("summary.allowlistRows must be 3");
  if (summary.verifiedRows !== 3) failures.push("summary.verifiedRows must be 3");
  if (summary.blockedRows !== 0) failures.push("summary.blockedRows must be 0");
  if (summary.allowedDirtyStatusRows !== 3) failures.push("summary.allowedDirtyStatusRows must be 3");
  if (summary.readyForPromotionAllowlist !== true) failures.push("summary.readyForPromotionAllowlist must be true");
  if (summary.cleanupAuthorizedRows !== 0) failures.push("summary.cleanupAuthorizedRows must be 0");
  if (summary.executableRows !== 0) failures.push("summary.executableRows must be 0");
  for (const statusRow of expectedStatusRows) {
    if (!(recorded.allowedDirtyStatusRows ?? []).includes(statusRow)) {
      failures.push(`allowedDirtyStatusRows must include ${statusRow}`);
    }
  }
  for (const unitId of expectedUnitIds) {
    if (!(recorded.authorizedOwnerRemediationUnitIds ?? []).includes(unitId)) {
      failures.push(`authorizedOwnerRemediationUnitIds must include ${unitId}`);
    }
  }

  for (const [key, expected] of [
    ["evidenceOnly", true],
    ["createsClone", false],
    ["createsWorktree", false],
    ["selectsReleaseSource", false],
    ["recordsOwnerApproval", false],
    ["recordsExecutionInstruction", false],
    ["stagesFiles", false],
    ["commits", false],
    ["merges", false],
    ["pushes", false],
    ["deploys", false],
    ["cleanupAuthorized", false],
    ["executableNow", false],
    ["destructiveGitAuthorized", false],
    ["physicalLifecycleCleanupAuthorized", false]
  ]) {
    if (boundary[key] !== expected) failures.push(`boundary.${key} must be ${expected}`);
  }

  const markdown = readText(A22_OWNER_REMEDIATION_CANDIDATE_DIRTY_ALLOWLIST_PATHS.latestMarkdown);
  for (const needle of [
    "A22 Owner-Remediation Candidate Dirty Allowlist",
    "a20-math-match-quest-data-parity",
    "a10-a22-package-json-dependency-parity",
    "a10-a22-package-lock-dependency-parity",
    "data/gameBasedLearning.ts",
    "package-dependency",
    "does not authorize staging"
  ]) {
    if (!markdown.includes(needle)) failures.push(`allowlist markdown missing text: ${needle}`);
  }

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    targetWorktree: recorded.targetWorktree,
    allowlistRows: rows.length,
    failures
  });
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) console.log(JSON.stringify(payload, null, 2));
  if ((payload.failures ?? []).length > 0) {
    if (!json) {
      console.error("A22 owner-remediation candidate dirty allowlist current gate failed:");
      for (const failure of payload.failures) console.error(`- ${failure}`);
    }
    process.exit(1);
  }
  if (!json) console.log("A22 owner-remediation candidate dirty allowlist current gate passed");
}

main();
