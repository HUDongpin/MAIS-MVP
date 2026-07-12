#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS,
  buildDirtyWorktreeClosureLoopState,
  stableDirtyWorktreeClosureLoopStateProjection
} from "./generate-dirty-worktree-closure-loop-state.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-dirty-worktree-closure-loop-state-current-gate.json");
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
    DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.latestJson,
    DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }

  if (failures.length > 0) return finish({ failures, activeStep: "missing", steps: 0 });

  const recorded = readJson(DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.latestJson);
  const current = buildDirtyWorktreeClosureLoopState();
  if (!sameJson(
    stableDirtyWorktreeClosureLoopStateProjection(recorded),
    stableDirtyWorktreeClosureLoopStateProjection(current)
  )) {
    failures.push("A25 dirty-worktree closure loop state is stale");
  }

  const expectedOrder = ["slice", "extract", "validate", "merge", "cleanup"];
  if (!sameJson(recorded.loopOrder, expectedOrder)) failures.push("loopOrder must be slice, extract, validate, merge, cleanup");
  const steps = recorded.steps ?? [];
  const summary = recorded.summary ?? {};
  if (!sameJson(steps.map((step) => step.id), expectedOrder)) failures.push("steps must follow loopOrder");
  if (recorded.activeStep !== "validate" && summary.pendingCanonicalAuthorizationRows > 0) {
    failures.push("activeStep must remain validate while canonical authorization rows are pending");
  }
  if ((summary.sourceCurrentnessFailures ?? 0) !== 0) failures.push("source currentness failures must be 0");
  if ((summary.preAuthorizationAttentionRows ?? 0) !== 0) failures.push("preAuthorizationAttentionRows must be 0");
  if ((summary.preAuthorizationReadyRows ?? 0) < 1) failures.push("preAuthorizationReadyRows must be present");
  const focusBatchRecordingIntakeStatus = summary.focusBatchRecordingIntakeStatus ?? "";
  const focusBatchRows = summary.focusBatchRows ?? 0;
  if (!["waiting-for-owner-authorization", "ready-for-post-input-validation", "no-focus-batch"].includes(focusBatchRecordingIntakeStatus)) {
    failures.push("focusBatchRecordingIntakeStatus must be recognized");
  }
  if (focusBatchRecordingIntakeStatus === "no-focus-batch") {
    if (focusBatchRows !== 0) failures.push("no-focus-batch must expose zero focusBatchRows");
  } else if (focusBatchRows <= 0) {
    failures.push("focusBatchRows must expose at least one row");
  }
  if ((summary.focusBatchAcceptedRows ?? 0) + (summary.focusBatchPendingRows ?? 0) !== (summary.focusBatchRows ?? 0)) {
    failures.push("focusBatchAcceptedRows plus focusBatchPendingRows must match focusBatchRows");
  }
  if ((summary.focusBatchOwnerInputVisibleRows ?? 0) !== (summary.focusBatchRows ?? 0)) {
    failures.push("focusBatchOwnerInputVisibleRows must match focusBatchRows");
  }
  if ((summary.cleanupAuthorizedRows ?? 0) !== 0) failures.push("cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? 0) !== 0) failures.push("executableRows must be 0");

  const authorizationStarterRows =
    summary.authorizationStarterRows ??
    ((summary.validAuthorizationRows ?? 0) + (summary.pendingCanonicalAuthorizationRows ?? 0));
  if ((summary.validAuthorizationRows ?? 0) + (summary.pendingCanonicalAuthorizationRows ?? 0) !== authorizationStarterRows) {
    failures.push("validAuthorizationRows plus pendingCanonicalAuthorizationRows must match authorizationStarterRows");
  }
  if ((summary.validExecutionInstructionRows ?? 0) + (summary.pendingReadyExecutionInstructionRows ?? 0) !== (summary.readyExecutionInstructionRows ?? 0)) {
    failures.push("validExecutionInstructionRows plus pendingReadyExecutionInstructionRows must match readyExecutionInstructionRows");
  }
  const a16PostExtractionVerified =
    summary.a16PostExtractionLifecycleStatus === "post-extraction-verified" &&
    summary.a16PostExtractionVerified === true;
  if ((summary.a16ReadyForOwnerExecutionInstructionRows ?? 0) > (summary.a16ReadyForSeparateInstructionRows ?? 0)) {
    failures.push("a16ReadyForOwnerExecutionInstructionRows must not exceed a16ReadyForSeparateInstructionRows");
  }
  if (!a16PostExtractionVerified && (summary.a16ValidExecutionInstructionRows ?? 0) > (summary.a16ReadyForSeparateInstructionRows ?? 0)) {
    failures.push("a16ValidExecutionInstructionRows must not exceed a16ReadyForSeparateInstructionRows");
  }
  const a16FrontierRows = summary.a16ExecutionInstructionFrontierRows ??
    Math.max(summary.a16ReadyForOwnerExecutionInstructionRows ?? 0, summary.a16ValidExecutionInstructionRows ?? 0);
  if ((summary.a16ValidExecutionInstructionRows ?? 0) + (summary.a16PendingOwnerExecutionInstructionRows ?? 0) !== a16FrontierRows) {
    failures.push("A16 valid execution instruction rows plus pending owner rows must match A16 execution-instruction frontier rows");
  }
  if ((summary.readyExecutionInstructionRows ?? 0) + a16FrontierRows !== (summary.effectiveReadyExecutionInstructionRows ?? 0)) {
    failures.push("effectiveReadyExecutionInstructionRows must include generic ready rows plus A16 execution-instruction frontier rows");
  }
  if ((summary.validExecutionInstructionRows ?? 0) + (summary.a16ValidExecutionInstructionRows ?? 0) !== (summary.effectiveValidExecutionInstructionRows ?? 0)) {
    failures.push("effectiveValidExecutionInstructionRows must include generic valid rows plus A16 valid rows");
  }
  if ((summary.effectiveValidExecutionInstructionRows ?? 0) + (summary.effectivePendingReadyExecutionInstructionRows ?? 0) !== (summary.effectiveReadyExecutionInstructionRows ?? 0)) {
    failures.push("effective valid rows plus effective pending rows must match effective ready rows");
  }
  if (!["pending-owner-execution-instruction", "pending-extraction-execution", "post-extraction-verified"].includes(summary.a16PostExtractionLifecycleStatus ?? "")) {
    failures.push("A16 post-extraction lifecycle status must be recognized");
  }
  if ((summary.a16PostExtractionFailedChecks ?? 0) !== 0) failures.push("A16 post-extraction failed checks must be 0");
  if (!a16PostExtractionVerified && (summary.a16ReadyForSeparateInstructionRows ?? 0) < 1) failures.push("A16 ready separate-instruction row must be represented");
  if (a16PostExtractionVerified && (summary.a16ValidExecutionInstructionRows ?? 0) < 1) failures.push("A16 post-extraction verified state must retain a valid execution instruction row");
  if (a16FrontierRows < 1) failures.push("A16 execution-instruction frontier row must be represented");
  if (((summary.effectivePendingReadyExecutionInstructionRows ?? 0) + (summary.effectiveValidExecutionInstructionRows ?? 0)) < 1) {
    failures.push("effective pending or valid owner execution instruction row must be represented");
  }

  const slice = steps.find((step) => step.id === "slice");
  const extract = steps.find((step) => step.id === "extract");
  const validate = steps.find((step) => step.id === "validate");
  const merge = steps.find((step) => step.id === "merge");
  const cleanup = steps.find((step) => step.id === "cleanup");
  if (slice?.status !== "complete") failures.push("slice step must be complete");
  if (extract?.status !== "complete") failures.push("extract step must be complete");
  if (validate?.status !== "active") failures.push("validate step must be active");
  if (merge?.status !== "blocked") failures.push("merge step must be blocked");
  if (cleanup?.status !== "blocked") failures.push("cleanup step must be blocked");
  for (const step of steps) {
    if (!Array.isArray(step.checks) || step.checks.length === 0) failures.push(`${step.id ?? "unknown"}: checks must not be empty`);
    if (!step.chineseLabel) failures.push(`${step.id ?? "unknown"}: missing chineseLabel`);
  }

  const boundary = recorded.boundary ?? {};
  if (boundary.evidenceOnly !== true) failures.push("boundary.evidenceOnly must be true");
  if (boundary.cleanupAuthorized !== false) failures.push("boundary.cleanupAuthorized must be false");
  if (boundary.executableNow !== false) failures.push("boundary.executableNow must be false");
  if (boundary.destructiveGitAuthorized !== false) failures.push("boundary.destructiveGitAuthorized must be false");
  if (boundary.deployAuthorized !== false) failures.push("boundary.deployAuthorized must be false");
  if (boundary.mergeAuthorized !== false) failures.push("boundary.mergeAuthorized must be false");
  if (boundary.physicalCleanupAuthorized !== false) failures.push("boundary.physicalCleanupAuthorized must be false");

  const markdown = readText(DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.latestMarkdown);
  for (const needle of [
    "切片 -> 提取 -> 验证 -> 合并 -> 清理",
    "Active step",
    "Focus batch owner-authorization intake",
    "A16 ready owner execution-input rows",
    "Every row remains non-executable",
    "does not authorize staging"
  ]) {
    if (!markdown.includes(needle)) failures.push(`loop-state markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("loop-state markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    activeStep: recorded.activeStep,
    steps: steps.length,
    completedSteps: recorded.summary?.completedSteps ?? 0,
    blockedSteps: recorded.summary?.blockedSteps ?? 0,
    pendingCanonicalAuthorizationRows: recorded.summary?.pendingCanonicalAuthorizationRows ?? 0,
    focusBatchRecordingIntakeStatus: recorded.summary?.focusBatchRecordingIntakeStatus ?? null,
    focusBatchAcceptedRows: recorded.summary?.focusBatchAcceptedRows ?? 0,
    focusBatchPendingRows: recorded.summary?.focusBatchPendingRows ?? 0,
    focusBatchOwnerInputVisibleRows: recorded.summary?.focusBatchOwnerInputVisibleRows ?? 0,
    preAuthorizationReadyRows: recorded.summary?.preAuthorizationReadyRows ?? 0,
    a16ReadyForOwnerExecutionInstructionRows: recorded.summary?.a16ReadyForOwnerExecutionInstructionRows ?? 0,
    a16ValidExecutionInstructionRows: recorded.summary?.a16ValidExecutionInstructionRows ?? 0,
    a16PostExtractionLifecycleStatus: recorded.summary?.a16PostExtractionLifecycleStatus ?? null,
    effectivePendingReadyExecutionInstructionRows: recorded.summary?.effectivePendingReadyExecutionInstructionRows ?? 0,
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
    console.log("A25 dirty-worktree closure loop-state gate");
    console.log(`Active step: ${payload.activeStep ?? "unknown"}`);
    console.log(`Steps: ${payload.steps ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 dirty-worktree closure loop-state gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
