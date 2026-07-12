#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  VALIDATE_FRONTIER_POST_RESPONSE_EXECUTION_PLAN_PATHS,
  buildValidateFrontierPostResponseExecutionPlan,
  stableValidateFrontierPostResponseExecutionPlanProjection
} from "./generate-validate-frontier-post-response-execution-plan.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-validate-frontier-post-response-execution-plan-current-gate.json");
const json = process.argv.includes("--json");

function git(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function absolute(relativePath) {
  return path.join(root, relativePath);
}

function exists(relativePath) {
  return fs.existsSync(absolute(relativePath));
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), "utf8"));
}

function readText(relativePath) {
  return fs.readFileSync(absolute(relativePath), "utf8");
}

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function allZeroOrFalse(row, fields) {
  return fields.every((field) => row?.[field] === false || row?.[field] === 0);
}

function recorderFailClosed(row, statuses) {
  return statuses.includes(row.dryRunStatus) &&
    statuses.includes(row.currentGateStatus) &&
    row.applyPermitted === false &&
    row.mutationsPerformed === false &&
    row.applyCommandTemplate?.commandKind === "template-not-executable" &&
    row.applyCommandTemplate?.executableNow === false;
}

function main() {
  const failures = [];
  for (const requiredPath of [
    VALIDATE_FRONTIER_POST_RESPONSE_EXECUTION_PLAN_PATHS.dirtyMap,
    VALIDATE_FRONTIER_POST_RESPONSE_EXECUTION_PLAN_PATHS.ownerResponsePacket,
    VALIDATE_FRONTIER_POST_RESPONSE_EXECUTION_PLAN_PATHS.ownerResponsePacketGate,
    VALIDATE_FRONTIER_POST_RESPONSE_EXECUTION_PLAN_PATHS.a25CanonicalRecordingDryRun,
    VALIDATE_FRONTIER_POST_RESPONSE_EXECUTION_PLAN_PATHS.a25CanonicalRecordingGate,
    VALIDATE_FRONTIER_POST_RESPONSE_EXECUTION_PLAN_PATHS.a22RootParityOwnerInputDryRun,
    VALIDATE_FRONTIER_POST_RESPONSE_EXECUTION_PLAN_PATHS.a22RootParityOwnerInputGate,
    VALIDATE_FRONTIER_POST_RESPONSE_EXECUTION_PLAN_PATHS.validationHoldRecordingDryRun,
    VALIDATE_FRONTIER_POST_RESPONSE_EXECUTION_PLAN_PATHS.validationHoldRecordingGate,
    VALIDATE_FRONTIER_POST_RESPONSE_EXECUTION_PLAN_PATHS.validateToMergeExitCriteria,
    VALIDATE_FRONTIER_POST_RESPONSE_EXECUTION_PLAN_PATHS.cleanSourceValidationQueue,
    VALIDATE_FRONTIER_POST_RESPONSE_EXECUTION_PLAN_PATHS.latestJson,
    VALIDATE_FRONTIER_POST_RESPONSE_EXECUTION_PLAN_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const dirtyMap = readJson(VALIDATE_FRONTIER_POST_RESPONSE_EXECUTION_PLAN_PATHS.dirtyMap);
  const ownerResponsePacket = readJson(VALIDATE_FRONTIER_POST_RESPONSE_EXECUTION_PLAN_PATHS.ownerResponsePacket);
  const recorded = readJson(VALIDATE_FRONTIER_POST_RESPONSE_EXECUTION_PLAN_PATHS.latestJson);
  const current = buildValidateFrontierPostResponseExecutionPlan();
  const markdown = readText(VALIDATE_FRONTIER_POST_RESPONSE_EXECUTION_PLAN_PATHS.latestMarkdown);
  const expectedSignature = dirtyMap.statusSignature ?? null;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  const summary = recorded.summary ?? {};
  const recorderRows = recorded.recorderRows ?? [];
  const sequenceRows = recorded.postResponseSequenceRows ?? [];
  const checks = recorded.checks ?? [];
  const boundary = recorded.boundary ?? {};
  const ownerResponseConsumed = summary.frontierOwnerRows === 0 &&
    [
      "waiting-for-a22-candidate-mutation-owner-input",
      "waiting-for-a22-typecheck-build-remediation"
    ].includes(recorded.planStatus);
  const expectedPlanStatus = ownerResponseConsumed
    ? [
      "waiting-top-candidate-typecheck-build-remediation",
      "fallback-candidate-green-await-clean-source-selection-review"
    ].includes(recorded.summary?.cleanSourceQueueStatus)
      ? "waiting-for-a22-typecheck-build-remediation"
      : "waiting-for-a22-candidate-mutation-owner-input"
    : "waiting-for-owner-response";
  const expectedFrontierRows = ownerResponsePacket.summary?.frontierOwnerRows ?? 0;
  const expectedCleanSourceQueueStatuses = ownerResponseConsumed
    ? [
      "waiting-top-candidate-candidate-mutation-owner-input",
      "waiting-top-candidate-typecheck-build-remediation",
      "fallback-candidate-green-await-clean-source-selection-review"
    ]
    : [
      "waiting-top-candidate-root-parity-owner-input",
      "waiting-top-candidate-candidate-mutation-owner-input",
      "waiting-top-candidate-typecheck-build-remediation",
      "fallback-candidate-green-await-clean-source-selection-review"
    ];

  if (!sameJson(
    stableValidateFrontierPostResponseExecutionPlanProjection(recorded),
    stableValidateFrontierPostResponseExecutionPlanProjection(current)
  )) {
    failures.push("A25/A22 validate-frontier post-response execution plan is stale");
  }

  if (recorded.planKind !== "a25-a22-validate-frontier-post-response-execution-plan") failures.push("planKind is invalid");
  if (recorded.planStatus !== expectedPlanStatus) failures.push("planStatus must match current post-response phase");
  if (recorded.dirtyMapStatusSignature !== expectedSignature) failures.push("plan dirty-map signature is stale");
  if (recorded.expandedStatusEntries !== expectedEntries) failures.push("plan expanded dirty entry count is stale");
  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures must be empty");

  if (summary.ownerResponseBlocks !== 3) failures.push("summary.ownerResponseBlocks must be 3");
  if (summary.frontierOwnerRows !== expectedFrontierRows) failures.push("summary.frontierOwnerRows must match current post-response phase");
  if (summary.recorderRows !== 3) failures.push("summary.recorderRows must be 3");
  if (summary.dryRunBlockedRows !== 3) failures.push("summary.dryRunBlockedRows must be 3 fail-closed recorder rows");
  if (summary.postResponseSequenceRows !== 8) failures.push("summary.postResponseSequenceRows must be 8");
  if (summary.validateExitReady !== false) failures.push("summary.validateExitReady must be false");
  if (summary.readyForMerge !== false) failures.push("summary.readyForMerge must be false");
  if (!expectedCleanSourceQueueStatuses.includes(summary.cleanSourceQueueStatus)) {
    failures.push("summary.cleanSourceQueueStatus must match current top-candidate blocker");
  }
  if (summary.cleanupAuthorizedRows !== 0) failures.push("summary.cleanupAuthorizedRows must be 0");
  if (summary.executableRows !== 0) failures.push("summary.executableRows must be 0");
  if (summary.failedChecks !== 0) failures.push("summary.failedChecks must be 0");
  if (summary.passingChecks !== checks.length) failures.push("summary.passingChecks must match checks length");

  const expectedRecorderStatuses = new Map(ownerResponseConsumed ? [
    ["record-a25-owner-package-authorizations", ["no-pending-focus-rows"]],
    ["record-a22-root-parity-owner-input", ["already-recorded"]],
    ["record-validation-hold-confirmation", ["dry-run-ready-requires-explicit-apply", "already-recorded"]]
  ] : [
    ["record-a25-owner-package-authorizations", ["dry-run-blocked-owner-approval-placeholders"]],
    ["record-a22-root-parity-owner-input", ["dry-run-blocked-owner-approval-text", "already-recorded"]],
    ["record-validation-hold-confirmation", ["dry-run-blocked-owner-confirmation-input", "dry-run-ready-requires-explicit-apply", "already-recorded"]]
  ]);
  for (const [id, statuses] of expectedRecorderStatuses) {
    const row = recorderRows.find((candidate) => candidate.id === id);
    if (!row) {
      failures.push(`missing recorder row: ${id}`);
      continue;
    }
    if (!recorderFailClosed(row, statuses)) {
      failures.push(`${id} must be fail-closed with one of ${statuses.join(", ")}`);
    }
  }

  if (sequenceRows.length !== 8) failures.push("postResponseSequenceRows length must be 8");
  const order = sequenceRows.map((row) => row.order).join(",");
  if (order !== "1,2,3,4,5,6,7,8") failures.push("postResponseSequenceRows must be ordered 1..8");
  for (const phase of ["preflight-currentness", "record-owner-response", "extract-after-recording", "validate-after-extraction", "merge-gate"]) {
    if (!sequenceRows.some((row) => row.phase === phase)) failures.push(`missing sequence phase: ${phase}`);
  }
  if (!sequenceRows.every((row) => row.executableNow === false && String(row.whyNotExecutable ?? "").length > 0)) {
    failures.push("every sequence row must be non-executable and explain why");
  }
  for (const requiredCommandFragment of [
    "run-next-owner-authorization-focus-batch-canonical-recording.mjs --apply-recording",
    "run-a22-root-parity-owner-input-recording.mjs --apply-owner-input",
    "run-validation-hold-release-confirmation-recording.mjs --apply-recording",
    "run-a22-top-clean-candidate-root-parity-extraction-instruction-recording.mjs --apply-recording",
    "run-a22-top-clean-candidate-root-parity-guarded-extraction.mjs --apply-extraction",
    "assert-validate-to-merge-exit-criteria-current.mjs"
  ]) {
    if (!sequenceRows.some((row) => String(row.command ?? "").includes(requiredCommandFragment))) {
      failures.push(`missing sequence command fragment: ${requiredCommandFragment}`);
    }
  }

  if (!allZeroOrFalse(boundary, [
    "recordsOwnerInputRows",
    "recordsAuthorizationRows",
    "recordsExtractionInstructionRows",
    "modifiesCandidateRows",
    "rootCopyRows",
    "validationHoldReleased",
    "stageAuthorized",
    "commitAuthorized",
    "cleanupAuthorized",
    "deployAuthorized",
    "mergeAuthorized",
    "broadStagingAuthorized",
    "destructiveGitAuthorized",
    "physicalLifecycleCleanupAuthorized",
    "executableNow"
  ])) {
    failures.push("boundary must keep every mutation/cleanup/deploy/merge/destructive flag false or zero");
  }
  if (boundary.evidenceOnly !== true) failures.push("boundary.evidenceOnly must be true");

  for (const requiredCheck of [
    "sources-current",
    "owner-response-still-waiting",
    "recorders-fail-closed-until-owner-response",
    "post-response-sequence-has-seven-step-coverage",
    "validate-to-merge-still-blocked",
    "non-executable-boundary"
  ]) {
    const row = checks.find((check) => check.id === requiredCheck);
    if (!row) failures.push(`missing check: ${requiredCheck}`);
    if (row && row.status !== "pass") failures.push(`check must pass: ${requiredCheck}`);
  }

  if (!markdown.includes("# A25/A22 Validate Frontier Post-Response Execution Plan")) failures.push("markdown missing title");
  if (!markdown.includes("This plan is evidence-only")) failures.push("markdown missing evidence-only boundary");
  for (const statuses of expectedRecorderStatuses.values()) {
    const status = statuses.find((candidate) => markdown.includes(candidate)) ?? statuses[0];
    if (!markdown.includes(status)) failures.push(`markdown missing recorder status: ${status}`);
  }
  if (markdown.includes("undefined")) failures.push("markdown contains undefined");

  return finish({
    failures,
    planStatus: recorded.planStatus,
    frontierOwnerRows: summary.frontierOwnerRows ?? 0,
    recorderRows: summary.recorderRows ?? 0,
    dryRunBlockedRows: summary.dryRunBlockedRows ?? 0,
    cleanupAuthorizedRows: summary.cleanupAuthorizedRows ?? 0,
    executableRows: summary.executableRows ?? 0
  });
}

function finish(payload) {
  const output = {
    checkedAt: new Date().toISOString(),
    ...payload,
    passed: payload.failures.length === 0
  };
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log("A25/A22 validate-frontier post-response execution plan gate");
    console.log(`Plan status: ${payload.planStatus ?? "missing"}`);
    console.log(`Frontier owner rows: ${payload.frontierOwnerRows ?? 0}`);
    console.log(`Recorder rows: ${payload.recorderRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    if (!json) {
      console.error("A25/A22 validate-frontier post-response execution plan gate failed.");
      for (const failure of payload.failures) console.error(`- ${failure}`);
    }
    process.exit(1);
  }
}

main();
