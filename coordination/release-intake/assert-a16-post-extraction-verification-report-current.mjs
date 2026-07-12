#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  A16_POST_EXTRACTION_VERIFICATION_REPORT_PATHS,
  buildA16PostExtractionVerificationReport,
  stableA16PostExtractionVerificationReportProjection
} from "./generate-a16-post-extraction-verification-report.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-a16-post-extraction-verification-report-current-gate.json");
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
    A16_POST_EXTRACTION_VERIFICATION_REPORT_PATHS.latestJson,
    A16_POST_EXTRACTION_VERIFICATION_REPORT_PATHS.latestMarkdown,
    A16_POST_EXTRACTION_VERIFICATION_REPORT_PATHS.dirtyMap,
    A16_POST_EXTRACTION_VERIFICATION_REPORT_PATHS.preExecutionValidationReport,
    A16_POST_EXTRACTION_VERIFICATION_REPORT_PATHS.executionInstructionOwnerInputGate
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const recorded = readJson(A16_POST_EXTRACTION_VERIFICATION_REPORT_PATHS.latestJson);
  const current = buildA16PostExtractionVerificationReport();
  if (!sameJson(
    stableA16PostExtractionVerificationReportProjection(recorded),
    stableA16PostExtractionVerificationReportProjection(current)
  )) {
    failures.push("A16 post-extraction verification report is stale");
  }

  const summary = recorded.summary ?? {};
  const boundary = recorded.boundary ?? {};
  const allowedStatuses = new Set([
    "pending-owner-execution-instruction",
    "pending-extraction-execution",
    "post-extraction-verified"
  ]);
  if (!allowedStatuses.has(recorded.lifecycleStatus)) failures.push(`unexpected lifecycleStatus: ${recorded.lifecycleStatus}`);
  if ((summary.packageFileRows ?? 0) !== 6) failures.push("packageFileRows must be 6");
  if ((summary.packageFingerprintRows ?? 0) !== 6) failures.push("packageFingerprintRows must be 6");
  if (typeof recorded.packageFingerprintSha256 !== "string" || recorded.packageFingerprintSha256.length !== 64) {
    failures.push("packageFingerprintSha256 must be a sha256 hex string");
  }
  if ((summary.stagedPackageRows ?? -1) !== 0) failures.push("stagedPackageRows must be 0");
  if ((summary.failedChecks ?? -1) !== 0) failures.push("failedChecks must be 0");
  if ((summary.passingChecks ?? 0) !== (summary.checks ?? -1)) failures.push("all checks must pass");
  if ((summary.cleanupAuthorizedRows ?? -1) !== 0) failures.push("cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? -1) !== 0) failures.push("executableRows must be 0");
  if (recorded.cleanupAuthorized !== false) failures.push("cleanupAuthorized must be false");
  if (recorded.executableNow !== false) failures.push("executableNow must be false");
  if (!Array.isArray(recorded.expectedPackageFingerprints) || recorded.expectedPackageFingerprints.length !== 6) {
    failures.push("expectedPackageFingerprints must contain 6 rows");
  }
  for (const row of recorded.expectedPackageFingerprints ?? []) {
    if (!row.path?.startsWith("coordination/research/")) failures.push(`${row.path ?? "missing path"}: fingerprint path must stay under coordination/research/`);
    if (!Number.isInteger(row.bytes) || row.bytes <= 0) failures.push(`${row.path ?? "missing path"}: fingerprint bytes must be positive`);
    if (!Number.isInteger(row.lineCount) || row.lineCount <= 0) failures.push(`${row.path ?? "missing path"}: fingerprint lineCount must be positive`);
    if (typeof row.sha256 !== "string" || row.sha256.length !== 64) failures.push(`${row.path ?? "missing path"}: fingerprint sha256 must be a sha256 hex string`);
  }
  for (const check of recorded.checks ?? []) {
    if (check.status !== "pass" || check.passed !== true) failures.push(`check failed: ${check.id}`);
  }

  if (boundary.evidenceOnly !== true) failures.push("boundary.evidenceOnly must be true");
  if (boundary.postExtractionVerificationOnly !== true) failures.push("boundary.postExtractionVerificationOnly must be true");
  if (boundary.recordsOwnerApproval !== false) failures.push("boundary.recordsOwnerApproval must be false");
  if (boundary.recordsExecutionInstruction !== false) failures.push("boundary.recordsExecutionInstruction must be false");
  if (boundary.stageAuthorized !== false) failures.push("boundary.stageAuthorized must be false");
  if (boundary.commitAuthorized !== false) failures.push("boundary.commitAuthorized must be false");
  if (boundary.mergeAuthorized !== false) failures.push("boundary.mergeAuthorized must be false");
  if (boundary.cleanupAuthorized !== false) failures.push("boundary.cleanupAuthorized must be false");
  if (boundary.executableNow !== false) failures.push("boundary.executableNow must be false");
  if (boundary.destructiveGitAuthorized !== false) failures.push("boundary.destructiveGitAuthorized must be false");
  if (boundary.deployAuthorized !== false) failures.push("boundary.deployAuthorized must be false");
  if (boundary.requiresSeparateOwnerExecutionInstruction !== true) failures.push("boundary.requiresSeparateOwnerExecutionInstruction must be true");

  const markdown = readText(A16_POST_EXTRACTION_VERIFICATION_REPORT_PATHS.latestMarkdown);
  for (const needle of [
    "A25 A16 Post-Extraction Verification Report",
    "verification only",
    "Package Fingerprints",
    "Stage authorized: false",
    "Commit authorized: false",
    "Cleanup authorized: false",
    "Deploy authorized: false"
  ]) {
    if (!markdown.includes(needle)) failures.push(`markdown missing required text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    lifecycleStatus: recorded.lifecycleStatus,
    packageFileRows: summary.packageFileRows ?? 0,
    packageFingerprintRows: summary.packageFingerprintRows ?? 0,
    packageStatusRows: summary.packageStatusRows ?? 0,
    stagedPackageRows: summary.stagedPackageRows ?? 0,
    postExtractionVerified: summary.postExtractionVerified ?? false,
    passingChecks: summary.passingChecks ?? 0,
    checks: summary.checks ?? 0,
    cleanupAuthorizedRows: summary.cleanupAuthorizedRows ?? 0,
    executableRows: summary.executableRows ?? 0,
    failures
  });
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 A16 post-extraction verification report gate");
    console.log(`Lifecycle status: ${payload.lifecycleStatus ?? "unknown"}`);
    console.log(`Checks: ${payload.passingChecks ?? 0}/${payload.checks ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 A16 post-extraction verification report gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
