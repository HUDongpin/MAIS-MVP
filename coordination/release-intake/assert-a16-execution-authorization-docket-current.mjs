#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  A16_EXECUTION_AUTHORIZATION_DOCKET_PATHS,
  buildA16ExecutionAuthorizationDocket,
  stableA16ExecutionAuthorizationDocketProjection
} from "./generate-a16-execution-authorization-docket.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-a16-execution-authorization-docket-current-gate.json");
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
    A16_EXECUTION_AUTHORIZATION_DOCKET_PATHS.latestJson,
    A16_EXECUTION_AUTHORIZATION_DOCKET_PATHS.latestMarkdown,
    A16_EXECUTION_AUTHORIZATION_DOCKET_PATHS.packageExtractionRequest,
    A16_EXECUTION_AUTHORIZATION_DOCKET_PATHS.dirtyMap
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const recorded = readJson(A16_EXECUTION_AUTHORIZATION_DOCKET_PATHS.latestJson);
  const current = buildA16ExecutionAuthorizationDocket();
  if (!sameJson(
    stableA16ExecutionAuthorizationDocketProjection(recorded),
    stableA16ExecutionAuthorizationDocketProjection(current)
  )) {
    failures.push("A16 execution authorization docket is stale");
  }

  const summary = recorded.summary ?? {};
  const boundary = recorded.boundary ?? {};
  const authorizationRows = recorded.authorizationRows ?? [];
  const row = authorizationRows[0] ?? {};
  const lifecycleRows = recorded.lifecycleHoldRows ?? [];
  const lifecycleRow = lifecycleRows[0] ?? {};
  const commands = row.exactCommandSequence ?? [];
  const packageFiles = row.packageFiles ?? [];
  const checks = recorded.acceptanceChecks ?? [];

  if (recorded.dirtyMapStatusSignature !== current.dirtyMapStatusSignature) failures.push("dirty-map signature is stale");
  if (recorded.expandedStatusEntries !== current.expandedStatusEntries) failures.push("expanded dirty entry count is stale");
  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures must be empty");
  if ((summary.sourceCurrentnessFailures ?? -1) !== 0) failures.push("summary.sourceCurrentnessFailures must be 0");
  if ((summary.authorizationRows ?? 0) !== 1) failures.push("authorizationRows must be 1");
  if ((summary.lifecycleHoldRows ?? 0) !== 1) failures.push("lifecycleHoldRows must be 1");
  if ((summary.packageFileRows ?? 0) !== 6) failures.push("packageFileRows must be 6");
  if ((summary.exactCommandRows ?? 0) !== 2) failures.push("exactCommandRows must be 2");
  if ((summary.copyableAuthorizationTexts ?? 0) !== 1) failures.push("copyableAuthorizationTexts must be 1");
  if ((summary.failedAcceptanceChecks ?? -1) !== 0) failures.push("failedAcceptanceChecks must be 0");
  if ((summary.passingAcceptanceChecks ?? 0) !== (summary.acceptanceChecks ?? -1)) failures.push("all acceptance checks must pass");
  if ((summary.cleanupAuthorizedRows ?? -1) !== 0) failures.push("cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? -1) !== 0) failures.push("executableRows must be 0");

  if (authorizationRows.length !== 1) failures.push("authorizationRows array must have one row");
  if (row.approvalId !== "a16-root-pathspec-commit-execution") failures.push("approvalId mismatch");
  if (row.status !== "ready-for-owner-execution-authorization") failures.push("authorization row status mismatch");
  if (row.proposedOnly !== true) failures.push("authorization row must be proposedOnly");
  if (row.targetCwd !== root) failures.push("authorization row targetCwd must be repo root");
  if (commands[0] !== "git add --pathspec-from-file=coordination/release-intake/latest-A25-effective-owner-a16-research-and-learning-science.pathspec") {
    failures.push("first exact command must be pathspec-only git add");
  }
  if (commands[1] !== "git commit -m \"Add A16 research evidence package\"") {
    failures.push("second exact command must be the A16 package commit");
  }
  if (!Array.isArray(packageFiles) || packageFiles.length !== 6) failures.push("packageFiles must contain 6 rows");
  for (const filePath of packageFiles) {
    if (!filePath.startsWith("coordination/research/")) failures.push(`package file outside coordination/research: ${filePath}`);
  }
  if (!Array.isArray(row.evidenceReviewed) || !row.evidenceReviewed.includes(A16_EXECUTION_AUTHORIZATION_DOCKET_PATHS.packageExtractionRequest)) {
    failures.push("evidenceReviewed must include the package extraction request");
  }
  if (typeof row.copyableAuthorizationText !== "string" || !row.copyableAuthorizationText.includes("Authorize separate execution")) {
    failures.push("copyable authorization text missing execution authorization phrase");
  }
  if (!row.copyableAuthorizationText?.includes("No cleanup")) failures.push("copyable authorization text must exclude cleanup");
  if (!row.copyableAuthorizationText?.includes("broad staging")) failures.push("copyable authorization text must exclude broad staging");
  if (row.cleanupAuthorized !== false) failures.push("authorization row cleanupAuthorized must be false");
  if (row.executableNow !== false) failures.push("authorization row executableNow must be false");

  if (lifecycleRows.length !== 1) failures.push("lifecycleHoldRows array must have one row");
  if (lifecycleRow.approvalId !== "codex-a16-research-evidence-closure") failures.push("lifecycle hold approvalId mismatch");
  if ((lifecycleRow.commandSequence ?? []).length !== 0) failures.push("lifecycle hold must not include commands");
  if (lifecycleRow.cleanupAuthorized !== false) failures.push("lifecycle cleanupAuthorized must be false");
  if (lifecycleRow.executableNow !== false) failures.push("lifecycle executableNow must be false");

  for (const check of checks) {
    if (check.status !== "pass") failures.push(`acceptance check failed: ${check.id}`);
  }

  if (boundary.evidenceOnly !== true) failures.push("boundary.evidenceOnly must be true");
  if (boundary.docketOnly !== true) failures.push("boundary.docketOnly must be true");
  if (boundary.proposedOnly !== true) failures.push("boundary.proposedOnly must be true");
  if (boundary.writesExecutionInstructions !== false) failures.push("boundary.writesExecutionInstructions must be false");
  if (boundary.recordsOwnerApproval !== false) failures.push("boundary.recordsOwnerApproval must be false");
  if (boundary.stagingAuthorized !== false) failures.push("boundary.stagingAuthorized must be false");
  if (boundary.commitAuthorized !== false) failures.push("boundary.commitAuthorized must be false");
  if (boundary.mergeAuthorized !== false) failures.push("boundary.mergeAuthorized must be false");
  if (boundary.cleanupAuthorized !== false) failures.push("boundary.cleanupAuthorized must be false");
  if (boundary.executableNow !== false) failures.push("boundary.executableNow must be false");
  if (boundary.destructiveGitAuthorized !== false) failures.push("boundary.destructiveGitAuthorized must be false");
  if (boundary.deployAuthorized !== false) failures.push("boundary.deployAuthorized must be false");
  if (boundary.requiresSeparateOwnerExecutionInstruction !== true) failures.push("boundary.requiresSeparateOwnerExecutionInstruction must be true");

  const markdown = readText(A16_EXECUTION_AUTHORIZATION_DOCKET_PATHS.latestMarkdown);
  for (const needle of [
    "A25 A16 Execution Authorization Docket",
    "does not record approval",
    "git add --pathspec-from-file=coordination/release-intake/latest-A25-effective-owner-a16-research-and-learning-science.pathspec",
    "git commit -m \"Add A16 research evidence package\"",
    "Authorize separate execution",
    "Staging authorized: false",
    "Commit authorized: false",
    "Cleanup authorized: false",
    "Executable now: false",
    "A separate owner instruction"
  ]) {
    if (!markdown.includes(needle)) failures.push(`markdown missing required text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    authorizationRows: summary.authorizationRows ?? 0,
    packageFileRows: summary.packageFileRows ?? 0,
    exactCommandRows: summary.exactCommandRows ?? 0,
    copyableAuthorizationTexts: summary.copyableAuthorizationTexts ?? 0,
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
    console.log("A25 A16 execution authorization docket gate");
    console.log(`Authorization rows: ${payload.authorizationRows ?? 0}`);
    console.log(`Exact command rows: ${payload.exactCommandRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 A16 execution authorization docket gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
