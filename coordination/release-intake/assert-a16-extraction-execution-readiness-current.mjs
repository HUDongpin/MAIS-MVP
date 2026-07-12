#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  A16_EXTRACTION_EXECUTION_READINESS_PATHS,
  buildA16ExtractionExecutionReadiness,
  stableA16ExtractionExecutionReadinessProjection
} from "./generate-a16-extraction-execution-readiness.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-a16-extraction-execution-readiness-current-gate.json");
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
    A16_EXTRACTION_EXECUTION_READINESS_PATHS.dirtyMap,
    A16_EXTRACTION_EXECUTION_READINESS_PATHS.requestPacket,
    A16_EXTRACTION_EXECUTION_READINESS_PATHS.acceptanceDocket,
    A16_EXTRACTION_EXECUTION_READINESS_PATHS.ownerInput,
    A16_EXTRACTION_EXECUTION_READINESS_PATHS.ownerInputGate,
    A16_EXTRACTION_EXECUTION_READINESS_PATHS.preExecutionReport,
    A16_EXTRACTION_EXECUTION_READINESS_PATHS.postExtractionReport,
    A16_EXTRACTION_EXECUTION_READINESS_PATHS.closeoutDocket,
    A16_EXTRACTION_EXECUTION_READINESS_PATHS.pathspec,
    A16_EXTRACTION_EXECUTION_READINESS_PATHS.latestJson,
    A16_EXTRACTION_EXECUTION_READINESS_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const dirtyMap = readJson(A16_EXTRACTION_EXECUTION_READINESS_PATHS.dirtyMap);
  const recorded = readJson(A16_EXTRACTION_EXECUTION_READINESS_PATHS.latestJson);
  const current = buildA16ExtractionExecutionReadiness();
  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;

  if (!sameJson(
    stableA16ExtractionExecutionReadinessProjection(recorded),
    stableA16ExtractionExecutionReadinessProjection(current)
  )) {
    failures.push("A16 extraction execution readiness evidence is stale");
  }

  if (recorded.dirtyMapStatusSignature !== expectedSignature) failures.push("readiness dirty-map signature is stale");
  if (recorded.expandedStatusEntries !== expectedEntries) failures.push("readiness expanded dirty entry count is stale");
  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("readiness has source currentness failures");

  const summary = recorded.summary ?? {};
  if (![
    "waiting-for-owner-execution-instruction",
    "owner-execution-instruction-recorded-pre-extraction",
    "post-extraction-verified"
  ].includes(recorded.readinessStatus)) {
    failures.push(`unexpected readinessStatus: ${recorded.readinessStatus}`);
  }
  if ((summary.packageFileRows ?? 0) !== 6) failures.push("packageFileRows must be 6");
  if ((summary.pathspecRows ?? 0) !== 6) failures.push("pathspecRows must be 6");
  if ((summary.stagedRows ?? -1) !== 0) failures.push("stagedRows must be 0");
  if ((summary.packageStagedRows ?? -1) !== 0) failures.push("packageStagedRows must be 0");
  if ((summary.exactCommandRows ?? 0) !== 2) failures.push("exactCommandRows must be 2");
  if ((summary.failedAcceptanceChecks ?? -1) !== 0) failures.push("failedAcceptanceChecks must be 0");
  if ((summary.passingAcceptanceChecks ?? 0) !== (summary.acceptanceChecks ?? -1)) failures.push("all readiness acceptance checks must pass");
  if ((summary.cleanupAuthorizedRows ?? -1) !== 0) failures.push("cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? -1) !== 0) failures.push("executableRows must be 0");

  if (recorded.readinessStatus === "waiting-for-owner-execution-instruction") {
    if ((summary.ownerInstructionRows ?? -1) !== 0) failures.push("waiting state must have 0 owner instruction rows");
    if ((summary.validOwnerInstructionRows ?? -1) !== 0) failures.push("waiting state must have 0 valid owner instruction rows");
    if ((summary.packageDirtyRows ?? -1) !== 6) failures.push("waiting state must still have 6 package dirty rows");
  }
  if (recorded.readinessStatus === "owner-execution-instruction-recorded-pre-extraction") {
    if ((summary.ownerInstructionRows ?? -1) !== 1) failures.push("recorded-pre-extraction state must have 1 owner instruction row");
    if ((summary.validOwnerInstructionRows ?? -1) !== 1) failures.push("recorded-pre-extraction state must have 1 valid owner instruction row");
    if ((summary.packageDirtyRows ?? -1) !== 6) failures.push("recorded-pre-extraction state must still have 6 package dirty rows");
  }
  if (recorded.readinessStatus === "post-extraction-verified") {
    if ((summary.packageDirtyRows ?? -1) !== 0) failures.push("post-extraction-verified state must have 0 package dirty rows");
  }

  const commands = recorded.exactCommandSequence ?? [];
  if (commands[0] !== "git add --pathspec-from-file=coordination/release-intake/latest-A25-effective-owner-a16-research-and-learning-science.pathspec") {
    failures.push("first exact command must be the A16 pathspec git add");
  }
  if (commands[1] !== "git commit -m \"Add A16 research evidence package\"") {
    failures.push("second exact command must be the A16 research evidence commit");
  }
  for (const filePath of recorded.packageFiles ?? []) {
    if (!filePath.startsWith("coordination/research/")) failures.push(`${filePath}: package file must stay under coordination/research/`);
  }
  for (const check of recorded.acceptanceChecks ?? []) {
    if (check.status !== "pass") failures.push(`readiness acceptance check failed: ${check.id}`);
  }

  const boundary = recorded.boundary ?? {};
  if (boundary.evidenceOnly !== true) failures.push("boundary.evidenceOnly must be true");
  if (boundary.readinessOnly !== true) failures.push("boundary.readinessOnly must be true");
  if (boundary.recordsOwnerApproval !== false) failures.push("boundary.recordsOwnerApproval must be false");
  if (boundary.recordsExecutionInstruction !== false) failures.push("boundary.recordsExecutionInstruction must be false");
  if (boundary.runsGitAdd !== false) failures.push("boundary.runsGitAdd must be false");
  if (boundary.runsGitCommit !== false) failures.push("boundary.runsGitCommit must be false");
  if (boundary.stageAuthorized !== false) failures.push("boundary.stageAuthorized must be false");
  if (boundary.commitAuthorized !== false) failures.push("boundary.commitAuthorized must be false");
  if (boundary.cleanupAuthorized !== false) failures.push("boundary.cleanupAuthorized must be false");
  if (boundary.executableNow !== false) failures.push("boundary.executableNow must be false");
  if (boundary.destructiveGitAuthorized !== false) failures.push("boundary.destructiveGitAuthorized must be false");
  if (boundary.deployAuthorized !== false) failures.push("boundary.deployAuthorized must be false");

  const markdown = readText(A16_EXTRACTION_EXECUTION_READINESS_PATHS.latestMarkdown);
  for (const needle of [
    "A25 A16 Extraction Execution Readiness",
    "fail-closed",
    "Exact Command Sequence",
    "Copyable Owner Execution Text",
    "Runs git add: false",
    "Runs git commit: false",
    "Deploy authorized: false"
  ]) {
    if (!markdown.includes(needle)) failures.push(`readiness markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("readiness markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    readinessStatus: recorded.readinessStatus,
    packageFileRows: summary.packageFileRows ?? 0,
    pathspecRows: summary.pathspecRows ?? 0,
    packageDirtyRows: summary.packageDirtyRows ?? 0,
    stagedRows: summary.stagedRows ?? 0,
    ownerInstructionRows: summary.ownerInstructionRows ?? 0,
    validOwnerInstructionRows: summary.validOwnerInstructionRows ?? 0,
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
    console.log("A25 A16 extraction execution readiness gate");
    console.log(`Readiness status: ${payload.readinessStatus ?? "unknown"}`);
    console.log(`Package dirty rows: ${payload.packageDirtyRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 A16 extraction execution readiness gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
