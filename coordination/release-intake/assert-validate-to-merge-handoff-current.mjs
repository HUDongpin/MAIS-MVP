#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  VALIDATE_TO_MERGE_HANDOFF_PATHS,
  buildValidateToMergeHandoff,
  stableValidateToMergeHandoffProjection
} from "./generate-validate-to-merge-handoff.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-validate-to-merge-handoff-current-gate.json");
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

function checkById(payload) {
  return Object.fromEntries((payload.mergeChecks ?? []).map((row) => [row.id, row]));
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) console.log(JSON.stringify(payload, null, 2));
  if ((payload.failures ?? []).length > 0) {
    if (!json) {
      console.error(payload.failures.join("\n"));
    }
    process.exit(1);
  }
  if (!json) {
    console.log(`A25 validate-to-merge handoff current gate passed: ${outputPath}`);
  }
}

function main() {
  const failures = [];
  for (const requiredPath of [
    VALIDATE_TO_MERGE_HANDOFF_PATHS.latestJson,
    VALIDATE_TO_MERGE_HANDOFF_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }

  if (failures.length > 0) {
    return finish({
      checkedAt: new Date().toISOString(),
      root,
      handoffStatus: "missing",
      readyForMerge: false,
      failures
    });
  }

  const recorded = readJson(VALIDATE_TO_MERGE_HANDOFF_PATHS.latestJson);
  const current = buildValidateToMergeHandoff();
  if (!sameJson(stableValidateToMergeHandoffProjection(recorded), stableValidateToMergeHandoffProjection(current))) {
    failures.push("A25 validate-to-merge handoff is stale relative to upstream validation/merge evidence");
  }

  if (!["blocked-before-merge", "ready-for-clean-release-merge", "not-ready-source-stale"].includes(recorded.handoffStatus ?? "")) {
    failures.push(`handoffStatus is not recognized: ${recorded.handoffStatus}`);
  }
  if (recorded.readyForMerge !== (recorded.handoffStatus === "ready-for-clean-release-merge")) {
    failures.push("readyForMerge must match handoffStatus");
  }

  const summary = recorded.summary ?? {};
  if ((summary.sourceCurrentnessFailures ?? 0) !== 0) failures.push("summary.sourceCurrentnessFailures must be 0");
  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures must be empty");
  if ((summary.pendingCanonicalAuthorizationRows ?? 0) > 0 && recorded.readyForMerge === true) {
    failures.push("readyForMerge must be false while canonical authorization rows are pending");
  }
  if ((summary.focusBatchAcceptedRows ?? 0) + (summary.focusBatchPendingRows ?? 0) !== (summary.focusBatchRows ?? 0)) {
    failures.push("focus batch accepted plus pending rows must match focus batch rows");
  }
  if ((summary.effectiveValidExecutionInstructionRows ?? 0) + (summary.effectivePendingReadyExecutionInstructionRows ?? 0) !== (summary.effectiveReadyExecutionInstructionRows ?? 0)) {
    failures.push("effective valid plus pending execution instruction rows must match effective ready rows");
  }
  if (!["waiting-for-owner-compose-deletion-confirmation", "released", "missing"].includes(summary.validationHoldStatus ?? "")) {
    failures.push(`validationHoldStatus is not recognized: ${summary.validationHoldStatus}`);
  }
  if (summary.releaseSourceBlocked === true && summary.releaseSourceClean !== false) {
    failures.push("releaseSourceClean must be false when releaseSourceBlocked is true");
  }
  if ((summary.cleanupAuthorizedRows ?? 0) !== 0) failures.push("cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? 0) !== 0) failures.push("executableRows must be 0");
  if (summary.noDirtyRootDeployPassed !== true) failures.push("noDirtyRootDeployPassed must be true");

  const boundary = recorded.boundary ?? {};
  if (boundary.evidenceOnly !== true) failures.push("boundary.evidenceOnly must be true");
  if (boundary.mergeAuthorized !== false) failures.push("boundary.mergeAuthorized must be false");
  if (boundary.cleanupAuthorized !== false) failures.push("boundary.cleanupAuthorized must be false");
  if (boundary.executableNow !== false) failures.push("boundary.executableNow must be false");
  if (boundary.destructiveGitAuthorized !== false) failures.push("boundary.destructiveGitAuthorized must be false");
  if (boundary.deployAuthorized !== false) failures.push("boundary.deployAuthorized must be false");
  if (boundary.dirtyRootDeployAuthorized !== false) failures.push("boundary.dirtyRootDeployAuthorized must be false");
  if (boundary.physicalCleanupAuthorized !== false) failures.push("boundary.physicalCleanupAuthorized must be false");

  const checks = checkById(recorded);
  const requiredChecks = [
    "sources-current",
    "closure-loop-validate",
    "preauthorization-clean",
    "focus-batch-recorded",
    "canonical-authorizations-complete",
    "owner-inputs-ready",
    "execution-instructions-complete",
    "validation-hold-released",
    "release-source-clean",
    "no-dirty-root-deploy",
    "non-executable-boundary",
    "strict-lifecycle-not-yet-clean"
  ];
  for (const id of requiredChecks) {
    if (!checks[id]) failures.push(`missing merge readiness check: ${id}`);
  }
  if ((recorded.mergeChecks ?? []).length !== requiredChecks.length) {
    failures.push(`mergeChecks length must be ${requiredChecks.length}`);
  }
  if (recorded.readyForMerge === false && !(recorded.mergeChecks ?? []).some((row) => row.passed === false)) {
    failures.push("blocked handoff must expose at least one failed merge readiness check");
  }
  if (checks["sources-current"]?.passed !== true) failures.push("sources-current check must pass");
  if (checks["no-dirty-root-deploy"]?.passed !== true) failures.push("no-dirty-root-deploy check must pass");
  if (checks["non-executable-boundary"]?.passed !== true) failures.push("non-executable-boundary check must pass");
  if (checks["strict-lifecycle-not-yet-clean"]?.passed !== true) failures.push("strict-lifecycle-not-yet-clean check must pass before cleanup");
  if ((summary.pendingCanonicalAuthorizationRows ?? 0) > 0 && checks["canonical-authorizations-complete"]?.passed !== false) {
    failures.push("canonical-authorizations-complete must fail while canonical authorization rows are pending");
  }
  if ((summary.focusBatchPendingRows ?? 0) > 0 && checks["focus-batch-recorded"]?.passed !== false) {
    failures.push("focus-batch-recorded must fail while focus-batch rows are pending");
  }
  if ((summary.focusBatchRows ?? 0) === 0 && (summary.focusBatchPendingRows ?? 0) === 0 && summary.focusBatchRecordingIntakeStatus === "no-focus-batch" && checks["focus-batch-recorded"]?.passed !== true) {
    failures.push("focus-batch-recorded must pass when the current focus batch status is no-focus-batch");
  }
  if ((summary.effectivePendingReadyExecutionInstructionRows ?? 0) > 0 && checks["execution-instructions-complete"]?.passed !== false) {
    failures.push("execution-instructions-complete must fail while ready execution inputs lack valid execution instructions");
  }
  if (summary.validationHoldStatus === "waiting-for-owner-compose-deletion-confirmation" && checks["validation-hold-released"]?.passed !== false) {
    failures.push("validation-hold-released must fail while owner compose deletion confirmation is pending");
  }
  if (summary.releaseSourceClean === false && checks["release-source-clean"]?.passed !== false) {
    failures.push("release-source-clean must fail while the release source is not clean");
  }

  if (recorded.handoffStatus === "blocked-before-merge" && (recorded.nextActions ?? []).length < 1) {
    failures.push("blocked handoff must include next owner actions");
  }

  const markdown = readText(VALIDATE_TO_MERGE_HANDOFF_PATHS.latestMarkdown);
  for (const needle of [
    "Validate-To-Merge Handoff",
    "Handoff status",
    "Merge Readiness Checks",
    "Next Owner Actions",
    "does not authorize staging",
    "Merge remains blocked"
  ]) {
    if (!markdown.includes(needle)) failures.push(`validate-to-merge markdown missing boundary text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("validate-to-merge markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    handoffStatus: recorded.handoffStatus ?? null,
    readyForMerge: recorded.readyForMerge === true,
    pendingCanonicalAuthorizationRows: summary.pendingCanonicalAuthorizationRows ?? 0,
    focusBatchPendingRows: summary.focusBatchPendingRows ?? 0,
    effectivePendingReadyExecutionInstructionRows: summary.effectivePendingReadyExecutionInstructionRows ?? 0,
    validationHoldStatus: summary.validationHoldStatus ?? null,
    releaseSourceClean: summary.releaseSourceClean === true,
    strictLifecycleClean: summary.strictLifecycleClean === true,
    cleanupAuthorizedRows: summary.cleanupAuthorizedRows ?? 0,
    executableRows: summary.executableRows ?? 0,
    failures
  });
}

main();
