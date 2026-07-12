#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  A16_EXTRACTION_CLOSEOUT_DOCKET_PATHS,
  buildA16ExtractionCloseoutDocket,
  stableA16ExtractionCloseoutDocketProjection
} from "./generate-a16-extraction-closeout-docket.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-a16-extraction-closeout-docket-current-gate.json");
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
    A16_EXTRACTION_CLOSEOUT_DOCKET_PATHS.dirtyMap,
    A16_EXTRACTION_CLOSEOUT_DOCKET_PATHS.preExecutionReport,
    A16_EXTRACTION_CLOSEOUT_DOCKET_PATHS.postExtractionReport,
    A16_EXTRACTION_CLOSEOUT_DOCKET_PATHS.executionInstructionAcceptanceDocket,
    A16_EXTRACTION_CLOSEOUT_DOCKET_PATHS.latestJson,
    A16_EXTRACTION_CLOSEOUT_DOCKET_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const dirtyMap = readJson(A16_EXTRACTION_CLOSEOUT_DOCKET_PATHS.dirtyMap);
  const preExecution = readJson(A16_EXTRACTION_CLOSEOUT_DOCKET_PATHS.preExecutionReport);
  const postExtraction = readJson(A16_EXTRACTION_CLOSEOUT_DOCKET_PATHS.postExtractionReport);
  const acceptanceDocket = readJson(A16_EXTRACTION_CLOSEOUT_DOCKET_PATHS.executionInstructionAcceptanceDocket);
  const recorded = readJson(A16_EXTRACTION_CLOSEOUT_DOCKET_PATHS.latestJson);
  const current = buildA16ExtractionCloseoutDocket();

  if (!sameJson(
    stableA16ExtractionCloseoutDocketProjection(recorded),
    stableA16ExtractionCloseoutDocketProjection(current)
  )) {
    failures.push("A16 extraction closeout docket is stale");
  }

  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  if (recorded.dirtyMapStatusSignature !== expectedSignature) failures.push("closeout docket dirty-map signature is stale");
  if (recorded.expandedStatusEntries !== expectedEntries) failures.push("closeout docket expanded dirty entry count is stale");
  if (recorded.sourceArtifacts?.preExecutionValidationReportGeneratedAt !== preExecution.generatedAt) {
    failures.push("closeout docket source pre-execution report timestamp is stale");
  }
  if (recorded.sourceArtifacts?.postExtractionVerificationReportGeneratedAt !== postExtraction.generatedAt) {
    failures.push("closeout docket source post-extraction report timestamp is stale");
  }
  if (recorded.sourceArtifacts?.executionInstructionAcceptanceDocketGeneratedAt !== acceptanceDocket.generatedAt) {
    failures.push("closeout docket source acceptance docket timestamp is stale");
  }
  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("closeout docket has source currentness failures");

  const summary = recorded.summary ?? {};
  if (!["pending-owner-execution-instruction", "pending-extraction-execution", "post-extraction-verified"].includes(recorded.lifecycleStatus)) {
    failures.push(`unexpected lifecycleStatus: ${recorded.lifecycleStatus}`);
  }
  if ((summary.packageFileRows ?? 0) !== 6) failures.push("packageFileRows must be 6");
  if ((summary.expectedPackageDirtyRowsAfterExtraction ?? -1) !== 0) failures.push("expectedPackageDirtyRowsAfterExtraction must be 0");
  if (recorded.lifecycleStatus === "pending-owner-execution-instruction" || recorded.lifecycleStatus === "pending-extraction-execution") {
    if ((summary.currentPackageDirtyRows ?? -1) !== 6) failures.push("pending closeout must still have 6 current package dirty rows");
    if ((summary.expectedPackageDirtyRowReduction ?? -1) !== 6) failures.push("pending closeout must expect a 6-row package dirty reduction");
  }
  if (recorded.lifecycleStatus === "post-extraction-verified") {
    if ((summary.currentPackageDirtyRows ?? -1) !== 0) failures.push("verified closeout must have 0 package dirty rows");
    if (recorded.postExtractionVerified !== true) failures.push("verified closeout must mark postExtractionVerified true");
  }
  if ((summary.failedAcceptanceChecks ?? -1) !== 0) failures.push("failedAcceptanceChecks must be 0");
  if ((summary.passingAcceptanceChecks ?? 0) !== (summary.acceptanceChecks ?? -1)) failures.push("all closeout acceptance checks must pass");
  if ((summary.cleanupAuthorizedRows ?? -1) !== 0) failures.push("cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? -1) !== 0) failures.push("executableRows must be 0");

  if (!Array.isArray(recorded.packageStatusProfile) || recorded.packageStatusProfile.length !== 6) {
    failures.push("packageStatusProfile must contain 6 rows");
  }
  for (const row of recorded.packageStatusProfile ?? []) {
    if (!row.path?.startsWith("coordination/research/")) failures.push(`${row.path ?? "missing path"}: package path must stay under coordination/research/`);
    if ((recorded.lifecycleStatus === "pending-owner-execution-instruction" || recorded.lifecycleStatus === "pending-extraction-execution") && row.currentStatus !== "??") {
      failures.push(`${row.path}: pending package status must be ??`);
    }
    if (row.expectedVerifiedStatus !== "clean-or-committed") {
      failures.push(`${row.path}: expected verified status must be clean-or-committed`);
    }
  }

  const commands = recorded.requiredPostExecutionCommands ?? [];
  for (const needle of [
    "assert-no-staged-changes.mjs --json",
    "release:dirty-map",
    "generate-a16-post-extraction-verification-report.mjs",
    "assert-a16-post-extraction-verification-report-current.mjs --json",
    "assert-dirty-worktree-remediation-current.mjs"
  ]) {
    if (!commands.some((command) => command.includes(needle))) failures.push(`missing required post-execution command containing: ${needle}`);
  }

  for (const check of recorded.acceptanceChecks ?? []) {
    if (check.status !== "pass") failures.push(`closeout acceptance check failed: ${check.id}`);
  }

  const boundary = recorded.boundary ?? {};
  if (boundary.evidenceOnly !== true) failures.push("boundary.evidenceOnly must be true");
  if (boundary.closeoutDocketOnly !== true) failures.push("boundary.closeoutDocketOnly must be true");
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

  const markdown = readText(A16_EXTRACTION_CLOSEOUT_DOCKET_PATHS.latestMarkdown);
  for (const needle of [
    "A25 A16 Extraction Closeout Docket",
    "verification-only",
    "Expected package dirty rows after extraction",
    "Required Post-Execution Commands",
    "Stage authorized: false",
    "Commit authorized: false",
    "Cleanup authorized: false",
    "Deploy authorized: false"
  ]) {
    if (!markdown.includes(needle)) failures.push(`closeout markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("closeout markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    lifecycleStatus: recorded.lifecycleStatus,
    packageFileRows: summary.packageFileRows ?? 0,
    currentPackageDirtyRows: summary.currentPackageDirtyRows ?? 0,
    expectedPackageDirtyRowsAfterExtraction: summary.expectedPackageDirtyRowsAfterExtraction ?? null,
    expectedPackageDirtyRowReduction: summary.expectedPackageDirtyRowReduction ?? null,
    postExtractionVerified: summary.postExtractionVerified ?? false,
    passingAcceptanceChecks: summary.passingAcceptanceChecks ?? 0,
    acceptanceChecks: summary.acceptanceChecks ?? 0,
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
    console.log("A25 A16 extraction closeout docket gate");
    console.log(`Lifecycle status: ${payload.lifecycleStatus ?? "unknown"}`);
    console.log(`Package dirty rows: ${payload.currentPackageDirtyRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 A16 extraction closeout docket gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
