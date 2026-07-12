#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  A16_PRE_EXECUTION_VALIDATION_REPORT_PATHS,
  buildA16PreExecutionValidationReport,
  stableA16PreExecutionValidationReportProjection
} from "./generate-a16-pre-execution-validation-report.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-a16-pre-execution-validation-report-current-gate.json");
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
    A16_PRE_EXECUTION_VALIDATION_REPORT_PATHS.latestJson,
    A16_PRE_EXECUTION_VALIDATION_REPORT_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }

  if (failures.length > 0) return finish({ failures });

  const recorded = readJson(A16_PRE_EXECUTION_VALIDATION_REPORT_PATHS.latestJson);
  const current = buildA16PreExecutionValidationReport();
  if (!sameJson(
    stableA16PreExecutionValidationReportProjection(recorded),
    stableA16PreExecutionValidationReportProjection(current)
  )) {
    failures.push("A25 A16 pre-execution validation report is stale");
  }

  const boundary = recorded.boundary ?? {};
  if (boundary.evidenceOnly !== true) failures.push("boundary.evidenceOnly must be true");
  if (boundary.preExecutionValidationOnly !== true) failures.push("boundary.preExecutionValidationOnly must be true");
  if (boundary.recordsOwnerApproval !== false) failures.push("boundary.recordsOwnerApproval must be false");
  if (boundary.writesExecutionInstructions !== false) failures.push("boundary.writesExecutionInstructions must be false");
  if (boundary.stageAuthorized !== false) failures.push("boundary.stageAuthorized must be false");
  if (boundary.commitAuthorized !== false) failures.push("boundary.commitAuthorized must be false");
  if (boundary.mergeAuthorized !== false) failures.push("boundary.mergeAuthorized must be false");
  if (boundary.cleanupAuthorized !== false) failures.push("boundary.cleanupAuthorized must be false");
  if (boundary.executableNow !== false) failures.push("boundary.executableNow must be false");
  if (boundary.destructiveGitAuthorized !== false) failures.push("boundary.destructiveGitAuthorized must be false");
  if (boundary.deployAuthorized !== false) failures.push("boundary.deployAuthorized must be false");
  if (boundary.requiresSeparateOwnerExecutionInstruction !== true) failures.push("boundary.requiresSeparateOwnerExecutionInstruction must be true");
  if (recorded.cleanupAuthorized !== false) failures.push("report cleanupAuthorized must be false");
  if (recorded.executableNow !== false) failures.push("report executableNow must be false");
  if ((recorded.summary?.cleanupAuthorizedRows ?? 0) !== 0) failures.push("cleanupAuthorizedRows must be 0");
  if ((recorded.summary?.executableRows ?? 0) !== 0) failures.push("executableRows must be 0");
  if (recorded.summary?.preExecutionValidationReady !== true) failures.push("preExecutionValidationReady must be true");
  if ((recorded.summary?.passingChecks ?? 0) !== (recorded.summary?.totalChecks ?? -1)) failures.push("all checks must pass");
  if ((recorded.summary?.packageFileRows ?? 0) !== 6) failures.push("packageFileRows must be 6");
  if ((recorded.summary?.packageFingerprintRows ?? 0) !== 6) failures.push("packageFingerprintRows must be 6");
  if (typeof recorded.summary?.packageFingerprintSha256 !== "string" || recorded.summary.packageFingerprintSha256.length !== 64) {
    failures.push("packageFingerprintSha256 must be a sha256 hex string");
  }
  if ((recorded.summary?.pathspecRows ?? 0) !== 6) failures.push("pathspecRows must be 6");
  if ((recorded.summary?.exactCommandRows ?? 0) !== 2) failures.push("exactCommandRows must be 2");
  if (!Array.isArray(recorded.packageFingerprints) || recorded.packageFingerprints.length !== 6) {
    failures.push("packageFingerprints must contain 6 rows");
  }
  for (const row of recorded.packageFingerprints ?? []) {
    if (!row.path?.startsWith("coordination/research/")) failures.push(`${row.path ?? "missing path"}: fingerprint path must stay under coordination/research/`);
    if (!Number.isInteger(row.bytes) || row.bytes <= 0) failures.push(`${row.path ?? "missing path"}: fingerprint bytes must be positive`);
    if (!Number.isInteger(row.lineCount) || row.lineCount <= 0) failures.push(`${row.path ?? "missing path"}: fingerprint lineCount must be positive`);
    if (typeof row.sha256 !== "string" || row.sha256.length !== 64) failures.push(`${row.path ?? "missing path"}: fingerprint sha256 must be a sha256 hex string`);
  }
  if ((recorded.checks ?? []).some((row) => row.passed !== true || row.status !== "pass")) failures.push("all recorded checks must be pass");
  if ((recorded.notAuthorizedByThisReport ?? []).some((item) => ![
    "git add",
    "git commit",
    "git reset",
    "git restore",
    "git clean",
    "git push",
    "worktree removal",
    "branch deletion",
    "deploy",
    "cleanup apply"
  ].includes(item))) failures.push("unexpected not-authorized item");

  const markdown = readText(A16_PRE_EXECUTION_VALIDATION_REPORT_PATHS.latestMarkdown);
  for (const needle of [
    "pre-execution validation only",
    "does not authorize staging",
    "A separate owner execution instruction is still required",
    "Package Fingerprints",
    "Stage authorized: false",
    "Commit authorized: false",
    "Deploy authorized: false"
  ]) {
    if (!markdown.includes(needle)) failures.push(`markdown missing boundary text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    packageFileRows: recorded.summary?.packageFileRows ?? 0,
    exactCommandRows: recorded.summary?.exactCommandRows ?? 0,
    packageFingerprintRows: recorded.summary?.packageFingerprintRows ?? 0,
    packageFingerprintSha256: recorded.summary?.packageFingerprintSha256 ?? null,
    passingChecks: recorded.summary?.passingChecks ?? 0,
    totalChecks: recorded.summary?.totalChecks ?? 0,
    preExecutionValidationReady: recorded.summary?.preExecutionValidationReady ?? false,
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
    console.log("A25 A16 pre-execution validation report gate");
    console.log(`Pre-execution validation ready: ${payload.preExecutionValidationReady ? "yes" : "no"}`);
    console.log(`Checks: ${payload.passingChecks ?? 0}/${payload.totalChecks ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 A16 pre-execution validation report gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
