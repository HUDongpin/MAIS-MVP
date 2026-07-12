#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  A16_GUARDED_EXTRACTION_EXECUTION_PLAN_PATHS,
  buildA16GuardedExtractionExecutionPlan,
  stableA16GuardedExtractionExecutionPlanProjection
} from "./generate-a16-guarded-extraction-execution-plan.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-a16-guarded-extraction-execution-plan-current-gate.json");
const json = process.argv.includes("--json");

const expectedCommands = [
  "git add --pathspec-from-file=coordination/release-intake/latest-A25-effective-owner-a16-research-and-learning-science.pathspec",
  "git commit -m \"Add A16 research evidence package\""
];

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
    A16_GUARDED_EXTRACTION_EXECUTION_PLAN_PATHS.dirtyMap,
    A16_GUARDED_EXTRACTION_EXECUTION_PLAN_PATHS.readiness,
    A16_GUARDED_EXTRACTION_EXECUTION_PLAN_PATHS.readinessGate,
    A16_GUARDED_EXTRACTION_EXECUTION_PLAN_PATHS.acceptanceDocket,
    A16_GUARDED_EXTRACTION_EXECUTION_PLAN_PATHS.ownerInput,
    A16_GUARDED_EXTRACTION_EXECUTION_PLAN_PATHS.ownerInputGate,
    A16_GUARDED_EXTRACTION_EXECUTION_PLAN_PATHS.preExecutionReport,
    A16_GUARDED_EXTRACTION_EXECUTION_PLAN_PATHS.closeoutDocket,
    A16_GUARDED_EXTRACTION_EXECUTION_PLAN_PATHS.pathspec,
    A16_GUARDED_EXTRACTION_EXECUTION_PLAN_PATHS.latestJson,
    A16_GUARDED_EXTRACTION_EXECUTION_PLAN_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const dirtyMap = readJson(A16_GUARDED_EXTRACTION_EXECUTION_PLAN_PATHS.dirtyMap);
  const recorded = readJson(A16_GUARDED_EXTRACTION_EXECUTION_PLAN_PATHS.latestJson);
  const current = buildA16GuardedExtractionExecutionPlan();
  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;

  if (!sameJson(
    stableA16GuardedExtractionExecutionPlanProjection(recorded),
    stableA16GuardedExtractionExecutionPlanProjection(current)
  )) {
    failures.push("A16 guarded extraction execution plan is stale");
  }

  if (recorded.dirtyMapStatusSignature !== expectedSignature) failures.push("plan dirty-map signature is stale");
  if (recorded.expandedStatusEntries !== expectedEntries) failures.push("plan expanded dirty entry count is stale");
  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("plan has source currentness failures");
  if (![
    "blocked-missing-owner-execution-instruction",
    "ready-for-owner-approved-guarded-extraction",
    "already-extracted-and-verified"
  ].includes(recorded.planStatus)) {
    failures.push(`unexpected planStatus: ${recorded.planStatus}`);
  }

  const summary = recorded.summary ?? {};
  if ((summary.packageFileRows ?? 0) !== 6) failures.push("packageFileRows must be 6");
  if ((summary.pathspecRows ?? 0) !== 6) failures.push("pathspecRows must be 6");
  if ((summary.stagedRows ?? -1) !== 0) failures.push("stagedRows must be 0");
  if ((summary.packageStagedRows ?? -1) !== 0) failures.push("packageStagedRows must be 0");
  if ((summary.guardedCommandRows ?? 0) !== 2) failures.push("guardedCommandRows must be 2");
  if ((summary.failedAcceptanceChecks ?? -1) !== 0) failures.push("failedAcceptanceChecks must be 0");
  if ((summary.passingAcceptanceChecks ?? 0) !== (summary.acceptanceChecks ?? -1)) failures.push("all guarded-plan acceptance checks must pass");
  if ((summary.cleanupAuthorizedRows ?? -1) !== 0) failures.push("cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? -1) !== 0) failures.push("executableRows must be 0");

  if (recorded.planStatus === "blocked-missing-owner-execution-instruction") {
    if ((summary.ownerInstructionRows ?? -1) !== 0) failures.push("blocked state must have 0 owner instruction rows");
    if ((summary.validOwnerInstructionRows ?? -1) !== 0) failures.push("blocked state must have 0 valid owner instruction rows");
    if ((summary.packageDirtyRows ?? -1) !== 6) failures.push("blocked state must still have 6 package dirty rows");
    if (summary.canExecuteIfSeparateOwnerInstructionRecorded !== false) failures.push("blocked state must not be executable even conditionally");
  }
  if (recorded.planStatus === "ready-for-owner-approved-guarded-extraction") {
    if ((summary.ownerInstructionRows ?? -1) !== 1) failures.push("ready state must have 1 owner instruction row");
    if ((summary.validOwnerInstructionRows ?? -1) !== 1) failures.push("ready state must have 1 valid owner instruction row");
    if ((summary.packageDirtyRows ?? -1) !== 6) failures.push("ready state must still have 6 package dirty rows before extraction");
    if (summary.canExecuteIfSeparateOwnerInstructionRecorded !== true) failures.push("ready state must mark conditional execution possible");
  }
  if (recorded.planStatus === "already-extracted-and-verified") {
    if ((summary.packageDirtyRows ?? -1) !== 0) failures.push("verified state must have 0 package dirty rows");
    if (summary.canExecuteIfSeparateOwnerInstructionRecorded !== false) failures.push("verified state must not be executable");
  }

  const commands = recorded.guardedCommandSequence ?? [];
  if (commands.length !== expectedCommands.length) failures.push("guarded command sequence must contain exactly 2 commands");
  for (const [index, expectedCommand] of expectedCommands.entries()) {
    if (commands[index] !== expectedCommand) failures.push(`guarded command ${index + 1} does not match expected exact command`);
  }
  for (const filePath of recorded.packageFiles ?? []) {
    if (!filePath.startsWith("coordination/research/")) failures.push(`${filePath}: package file must stay under coordination/research/`);
  }
  for (const check of recorded.acceptanceChecks ?? []) {
    if (check.status !== "pass") failures.push(`guarded-plan acceptance check failed: ${check.id}`);
  }

  const ownerText = recorded.copyableOwnerExecutionText ?? "";
  for (const needle of [
    "Authorize separate execution",
    "a16-research-and-learning-science",
    "codex-a16-research-evidence-closure",
    "git add --pathspec-from-file=coordination/release-intake/latest-A25-effective-owner-a16-research-and-learning-science.pathspec",
    "git commit -m 'Add A16 research evidence package'",
    "No cleanup",
    "broad staging"
  ]) {
    if (!ownerText.includes(needle)) failures.push(`copyable owner execution text missing: ${needle}`);
  }

  const boundary = recorded.boundary ?? {};
  if (boundary.evidenceOnly !== true) failures.push("boundary.evidenceOnly must be true");
  if (boundary.planOnly !== true) failures.push("boundary.planOnly must be true");
  if (boundary.recordsOwnerApproval !== false) failures.push("boundary.recordsOwnerApproval must be false");
  if (boundary.recordsExecutionInstruction !== false) failures.push("boundary.recordsExecutionInstruction must be false");
  if (boundary.runsGitAdd !== false) failures.push("boundary.runsGitAdd must be false");
  if (boundary.runsGitCommit !== false) failures.push("boundary.runsGitCommit must be false");
  if (boundary.stageAuthorizedByThisPlan !== false) failures.push("boundary.stageAuthorizedByThisPlan must be false");
  if (boundary.commitAuthorizedByThisPlan !== false) failures.push("boundary.commitAuthorizedByThisPlan must be false");
  if (boundary.mergeAuthorized !== false) failures.push("boundary.mergeAuthorized must be false");
  if (boundary.cleanupAuthorized !== false) failures.push("boundary.cleanupAuthorized must be false");
  if (boundary.executableNow !== false) failures.push("boundary.executableNow must be false");
  if (boundary.destructiveGitAuthorized !== false) failures.push("boundary.destructiveGitAuthorized must be false");
  if (boundary.deployAuthorized !== false) failures.push("boundary.deployAuthorized must be false");

  const markdown = readText(A16_GUARDED_EXTRACTION_EXECUTION_PLAN_PATHS.latestMarkdown);
  for (const needle of [
    "A25 A16 Guarded Extraction Execution Plan",
    "plan-only fail-closed",
    "Guarded Command Sequence",
    "Copyable Owner Execution Text",
    "Records execution instruction: false",
    "Runs git add: false",
    "Runs git commit: false",
    "Deploy authorized: false"
  ]) {
    if (!markdown.includes(needle)) failures.push(`guarded-plan markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("guarded-plan markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    planStatus: recorded.planStatus,
    packageFileRows: summary.packageFileRows ?? 0,
    pathspecRows: summary.pathspecRows ?? 0,
    packageDirtyRows: summary.packageDirtyRows ?? 0,
    stagedRows: summary.stagedRows ?? 0,
    ownerInstructionRows: summary.ownerInstructionRows ?? 0,
    validOwnerInstructionRows: summary.validOwnerInstructionRows ?? 0,
    guardedCommandRows: summary.guardedCommandRows ?? 0,
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
    console.log("A25 A16 guarded extraction execution plan gate");
    console.log(`Plan status: ${payload.planStatus ?? "unknown"}`);
    console.log(`Package dirty rows: ${payload.packageDirtyRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 A16 guarded extraction execution plan gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
