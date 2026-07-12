#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  SEVEN_STEP_CLOSURE_BRIDGE_PATHS,
  buildSevenStepClosureBridge,
  stableSevenStepClosureBridgeProjection
} from "./generate-seven-step-closure-bridge.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-seven-step-closure-bridge-current-gate.json");
const json = process.argv.includes("--json");
const expectedPhaseOrder = ["slice", "extract", "validate", "merge", "cleanup"];

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

function sorted(value) {
  return [...(value ?? [])].sort();
}

function main() {
  const failures = [];
  for (const requiredPath of [
    SEVEN_STEP_CLOSURE_BRIDGE_PATHS.latestJson,
    SEVEN_STEP_CLOSURE_BRIDGE_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const recorded = readJson(SEVEN_STEP_CLOSURE_BRIDGE_PATHS.latestJson);
  const current = buildSevenStepClosureBridge();
  if (!sameJson(
    stableSevenStepClosureBridgeProjection(recorded),
    stableSevenStepClosureBridgeProjection(current)
  )) {
    failures.push("A25 seven-step closure bridge is stale relative to current closure-loop evidence");
  }

  const compactBundle = readJson(SEVEN_STEP_CLOSURE_BRIDGE_PATHS.compactRequestBundle);
  const exitCriteria = readJson(SEVEN_STEP_CLOSURE_BRIDGE_PATHS.validateToMergeExitCriteria);
  const expectedApprovalIds = compactBundle.batchAuthorizationRequest?.approvalIds ?? [];
  const phaseStatuses = Object.fromEntries((recorded.phases ?? []).map((phase) => [phase.id, phase.closureLoopStatus]));

  if (!sameJson(recorded.phaseOrder, expectedPhaseOrder)) failures.push("phaseOrder must be slice -> extract -> validate -> merge -> cleanup");
  if (!sameJson((recorded.phases ?? []).map((phase) => phase.id), expectedPhaseOrder)) failures.push("phases must follow the expected closure-loop order");
  if (recorded.activePhase !== "validate") failures.push("activePhase must currently be validate");
  if (phaseStatuses.slice !== "complete") failures.push("slice phase must be complete");
  if (phaseStatuses.extract !== "complete") failures.push("extract phase must be complete");
  if (phaseStatuses.validate !== "active") failures.push("validate phase must be active");
  if (phaseStatuses.merge !== "blocked") failures.push("merge phase must be blocked");
  if (phaseStatuses.cleanup !== "blocked") failures.push("cleanup phase must be blocked");

  if ((recorded.summary?.sourceCurrentnessFailures ?? 0) !== 0) failures.push("sourceCurrentnessFailures must be 0");
  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures list must be empty");
  if ((recorded.summary?.staleApplyGuardFailures ?? 0) !== 0) failures.push("stale apply guard failures must be 0");
  if ((recorded.duplicateAuthorizationGuard?.failures ?? []).length !== 0) failures.push("duplicateAuthorizationGuard.failures must be empty");
  if ((recorded.summary?.cleanupAuthorizedRows ?? 0) !== 0) failures.push("summary.cleanupAuthorizedRows must be 0");
  if ((recorded.summary?.executableRows ?? 0) !== 0) failures.push("summary.executableRows must be 0");
  if (recorded.summary?.validateExitReady !== (exitCriteria.validateExitReady === true)) failures.push("summary.validateExitReady must match exit criteria");
  if ((recorded.summary?.directFailedMergeChecks ?? -1) !== (exitCriteria.summary?.directFailedMergeChecks ?? 0)) {
    failures.push("summary.directFailedMergeChecks must match exit criteria");
  }
  if ((recorded.duplicateAuthorizationGuard?.cleanupAuthorizedRows ?? 0) !== 0) failures.push("duplicateAuthorizationGuard.cleanupAuthorizedRows must be 0");
  if ((recorded.duplicateAuthorizationGuard?.executableRows ?? 0) !== 0) failures.push("duplicateAuthorizationGuard.executableRows must be 0");
  if (recorded.duplicateAuthorizationGuard?.applyPermitted !== false) failures.push("duplicateAuthorizationGuard.applyPermitted must be false");
  if ((recorded.currentOwnerAuthorizationBatch?.pendingRows ?? 0) !== (compactBundle.batchAuthorizationRequest?.pendingRows ?? 0)) {
    failures.push("current owner authorization batch pending rows must match compact request bundle");
  }
  if (!sameJson(sorted(recorded.currentOwnerAuthorizationBatch?.approvalIds), sorted(expectedApprovalIds))) {
    failures.push("current owner authorization batch approval IDs must match compact request bundle");
  }
  if ((expectedApprovalIds.length ?? 0) > 0 && !recorded.currentOwnerAuthorizationBatch?.copyableOwnerReplyTextZh?.includes("不授权 cleanup")) {
    failures.push("current owner authorization batch must preserve the Chinese no-cleanup boundary text");
  }

  const boundary = recorded.boundary ?? {};
  for (const [key, expected] of [
    ["evidenceOnly", true],
    ["recordsAuthorizationOnlyAfterExplicitOwnerReply", true],
    ["mergeAuthorized", false],
    ["cleanupAuthorized", false],
    ["executableNow", false],
    ["deployAuthorized", false],
    ["dirtyRootDeployAuthorized", false],
    ["destructiveGitAuthorized", false],
    ["physicalCleanupAuthorized", false]
  ]) {
    if (boundary[key] !== expected) failures.push(`boundary.${key} must be ${expected}`);
  }

  const cleanupPhase = (recorded.phases ?? []).find((phase) => phase.id === "cleanup") ?? {};
  if ((cleanupPhase.currentCounts?.cleanupAuthorizedRows ?? 0) !== 0) failures.push("cleanup phase cleanupAuthorizedRows must be 0");
  if ((cleanupPhase.currentCounts?.executableRows ?? 0) !== 0) failures.push("cleanup phase executableRows must be 0");
  const mergePhase = (recorded.phases ?? []).find((phase) => phase.id === "merge") ?? {};
  if (mergePhase.currentCounts?.readyForMerge !== false) failures.push("merge phase readyForMerge must be false");
  if (mergePhase.currentCounts?.validateExitReady !== false) failures.push("merge phase validateExitReady must be false");
  if ((mergePhase.currentCounts?.directFailedMergeChecks ?? -1) !== (exitCriteria.summary?.directFailedMergeChecks ?? 0)) {
    failures.push("merge phase directFailedMergeChecks must match exit criteria");
  }
  if ((mergePhase.currentCounts?.deferredPhysicalLifecycleRows ?? -1) !== (exitCriteria.summary?.deferredPhysicalLifecycleRows ?? 0)) {
    failures.push("merge phase deferredPhysicalLifecycleRows must match exit criteria");
  }
  if ((mergePhase.currentCounts?.failedMergeChecks ?? 0) < 1) failures.push("merge phase must expose failed merge checks");

  const markdown = readText(SEVEN_STEP_CLOSURE_BRIDGE_PATHS.latestMarkdown);
  for (const needle of [
    "A25 Seven-Step Closure Bridge",
    "问题不是需要更多 worktrees",
    "Loop Phases",
    "Validate exit ready",
    "Current Owner Authorization Batch",
    "Duplicate Authorization Guard",
    "does not authorize staging"
  ]) {
    if (!markdown.includes(needle)) failures.push(`bridge markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("bridge markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    activePhase: recorded.activePhase,
    phaseOrder: recorded.phaseOrder,
    completedPhases: recorded.summary?.completedPhases ?? 0,
    blockedPhases: recorded.summary?.blockedPhases ?? 0,
    pendingCanonicalAuthorizationRows: recorded.summary?.pendingCanonicalAuthorizationRows ?? 0,
    focusBatchPendingRows: recorded.summary?.focusBatchPendingRows ?? 0,
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
    console.log("A25 seven-step closure bridge gate");
    console.log(`Active phase: ${payload.activePhase ?? "unknown"}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 seven-step closure bridge gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
