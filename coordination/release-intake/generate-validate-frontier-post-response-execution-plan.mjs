#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  VALIDATE_FRONTIER_OWNER_RESPONSE_PACKET_PATHS,
  buildValidateFrontierOwnerResponsePacket,
  stableValidateFrontierOwnerResponsePacketProjection
} from "./generate-validate-frontier-owner-response-packet.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const VALIDATE_FRONTIER_POST_RESPONSE_EXECUTION_PLAN_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  ownerResponsePacket: VALIDATE_FRONTIER_OWNER_RESPONSE_PACKET_PATHS.latestJson,
  ownerResponsePacketGate: "coordination/release-intake/latest-A25-validate-frontier-owner-response-packet-current-gate.json",
  a25CanonicalRecordingDryRun: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch-canonical-recording-dry-run.json",
  a25CanonicalRecordingGate: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch-canonical-recording-current-gate.json",
  a22RootParityOwnerInputDryRun: "coordination/release-intake/latest-A22-root-parity-owner-input-recording-dry-run.json",
  a22RootParityOwnerInputGate: "coordination/release-intake/latest-A22-root-parity-owner-input-recording-current-gate.json",
  validationHoldRecordingDryRun: "coordination/release-intake/latest-A25-validation-hold-release-confirmation-recording-dry-run.json",
  validationHoldRecordingGate: "coordination/release-intake/latest-A25-validation-hold-release-confirmation-recording-current-gate.json",
  validateToMergeExitCriteria: "coordination/release-intake/latest-A25-validate-to-merge-exit-criteria.json",
  cleanSourceValidationQueue: "coordination/release-intake/latest-A22-clean-source-validation-queue.json",
  latestJson: "coordination/release-intake/latest-A25-validate-frontier-post-response-execution-plan.json",
  latestMarkdown: "coordination/release-intake/latest-A25-validate-frontier-post-response-execution-plan.md",
  datedJson: `coordination/release-intake/${date}-A25-validate-frontier-post-response-execution-plan.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-validate-frontier-post-response-execution-plan.md`
};

function git(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function hktDateStamp() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
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

function write(relativePath, content) {
  fs.writeFileSync(absolute(relativePath), content);
}

function count(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function dirtyMapEntryCount(dirtyMap) {
  return dirtyMap.statusCounts?.expandedStatusEntries ?? (dirtyMap.entries ?? []).length;
}

function artifactStamp(key, relativePath, payload) {
  return {
    key,
    path: relativePath,
    generatedAt: payload.generatedAt ?? payload.checkedAt ?? null,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature ?? payload.statusSignature ?? null,
    expandedStatusEntries: payload.expandedStatusEntries ?? payload.statusCounts?.expandedStatusEntries ?? null,
    failures: payload.failures ?? []
  };
}

function sourceCurrentnessFailures({ dirtyMap, artifacts }) {
  const failures = [];
  const expectedSignature = dirtyMap.statusSignature ?? null;
  const expectedEntries = dirtyMapEntryCount(dirtyMap);
  for (const [key, payload] of Object.entries(artifacts)) {
    if (key === "dirtyMap") continue;
    const stamp = artifactStamp(key, VALIDATE_FRONTIER_POST_RESPONSE_EXECUTION_PLAN_PATHS[key], payload);
    if (stamp.dirtyMapStatusSignature && stamp.dirtyMapStatusSignature !== expectedSignature) {
      failures.push(`${key} dirty-map signature is stale`);
    }
    if (stamp.expandedStatusEntries !== null && stamp.expandedStatusEntries !== expectedEntries) {
      failures.push(`${key} expanded dirty entry count is stale`);
    }
    if (stamp.failures.length > 0) {
      failures.push(`${key} current gate has failures: ${stamp.failures.length}`);
    }
  }
  const currentPacket = buildValidateFrontierOwnerResponsePacket();
  if (!sameJson(
    stableValidateFrontierOwnerResponsePacketProjection(artifacts.ownerResponsePacket),
    stableValidateFrontierOwnerResponsePacketProjection(currentPacket)
  )) {
    failures.push("owner response packet is stale versus current sources");
  }
  return failures;
}

function ownerResponseBlock(packet, id) {
  return (packet.ownerResponseBlocks ?? []).find((block) => block.id === id) ?? {};
}

function templateCommand(command, requiredOwnerBlock) {
  return {
    command,
    commandKind: "template-not-executable",
    requiredOwnerBlock,
    executableNow: false,
    cleanupAuthorized: false,
    deployAuthorized: false,
    mergeAuthorized: false,
    destructiveGitAuthorized: false,
    physicalLifecycleCleanupAuthorized: false
  };
}

function buildRecorderRows({ artifacts, packet }) {
  const a25Block = ownerResponseBlock(packet, "a25-owner-package-canonical-authorization-focus-batch");
  const a22Block = ownerResponseBlock(packet, "a22-root-parity-selected-actions");
  const holdBlock = ownerResponseBlock(packet, "validation-hold-release-confirmation");
  const ownerResponseConsumed = [
    "owner-response-consumed-waiting-candidate-mutation-input",
    "owner-response-consumed-waiting-a22-typecheck-build-remediation"
  ].includes(packet.packetStatus);
  const expectedValidationHoldStatus = ownerResponseConsumed && [
    "dry-run-ready-requires-explicit-apply",
    "already-recorded"
  ].includes(artifacts.validationHoldRecordingDryRun.recorderStatus)
    ? artifacts.validationHoldRecordingDryRun.recorderStatus
    : ownerResponseConsumed
      ? "dry-run-ready-requires-explicit-apply"
      : "dry-run-blocked-owner-confirmation-input";
  return [
    {
      id: "record-a25-owner-package-authorizations",
      owner: "A25 git hygiene and release intake",
      ownerResponseBlockId: a25Block.id,
      dryRunStatus: artifacts.a25CanonicalRecordingDryRun.recorderStatus,
      currentGateStatus: artifacts.a25CanonicalRecordingGate.recorderStatus,
      expectedBlockedStatus: ownerResponseConsumed ? "no-pending-focus-rows" : "dry-run-blocked-owner-approval-placeholders",
      rowCount: count(artifacts.a25CanonicalRecordingDryRun.summary?.approvalRows),
      recordsAuthorizationRows: count(artifacts.a25CanonicalRecordingDryRun.summary?.recordsAuthorizationRows),
      applyPermitted: artifacts.a25CanonicalRecordingDryRun.summary?.applyPermitted === true,
      mutationsPerformed: artifacts.a25CanonicalRecordingDryRun.summary?.mutationsPerformed === true,
      applyCommandTemplate: templateCommand(
        "node coordination/release-intake/run-next-owner-authorization-focus-batch-canonical-recording.mjs --apply-recording --approved-by \"<owner>\" --approved-at \"<ISO-8601>\" --owner-approval-text \"<A25 owner-package response>\"",
        "a25-owner-package-canonical-authorization-focus-batch"
      )
    },
    {
      id: "record-a22-root-parity-owner-input",
      owner: "A22 production reliability and release engineering",
      ownerResponseBlockId: a22Block.id,
      dryRunStatus: artifacts.a22RootParityOwnerInputDryRun.recorderStatus,
      currentGateStatus: artifacts.a22RootParityOwnerInputGate.recorderStatus,
      expectedBlockedStatus: ownerResponseConsumed ? "already-recorded" : "dry-run-blocked-owner-approval-text",
      rowCount: count(artifacts.a22RootParityOwnerInputDryRun.summary?.patchRows),
      recordsOwnerInputRows: count(artifacts.a22RootParityOwnerInputDryRun.summary?.recordsOwnerInputRows),
      recordsExtractionInstructionRows: count(artifacts.a22RootParityOwnerInputDryRun.summary?.recordsExtractionInstructionRows),
      modifiesCandidateRows: count(artifacts.a22RootParityOwnerInputDryRun.summary?.modifiesCandidateRows),
      rootCopyRows: count(artifacts.a22RootParityOwnerInputDryRun.summary?.rootCopyRows),
      applyPermitted: artifacts.a22RootParityOwnerInputDryRun.summary?.applyPermitted === true,
      mutationsPerformed: artifacts.a22RootParityOwnerInputDryRun.summary?.mutationsPerformed === true,
      applyCommandTemplate: templateCommand(
        "node coordination/release-intake/run-a22-root-parity-owner-input-recording.mjs --apply-owner-input --approved-by \"<owner>\" --approved-at \"<ISO-8601>\" --owner-approval-text \"<A22 root-parity response>\"",
        "a22-root-parity-selected-actions"
      )
    },
    {
      id: "record-validation-hold-confirmation",
      owner: "A25 git hygiene and release intake",
      ownerResponseBlockId: holdBlock.id,
      dryRunStatus: artifacts.validationHoldRecordingDryRun.recorderStatus,
      currentGateStatus: artifacts.validationHoldRecordingGate.recorderStatus,
      expectedBlockedStatus: expectedValidationHoldStatus,
      rowCount: 1,
      recordsOwnerConfirmationRows: count(artifacts.validationHoldRecordingDryRun.summary?.recordsOwnerConfirmationRows),
      validationHoldReleased: artifacts.validationHoldRecordingDryRun.summary?.validationHoldReleased === true,
      applyPermitted: artifacts.validationHoldRecordingDryRun.summary?.applyPermitted === true,
      mutationsPerformed: artifacts.validationHoldRecordingDryRun.summary?.mutationsPerformed === true,
      applyCommandTemplate: templateCommand(
        "node coordination/release-intake/run-validation-hold-release-confirmation-recording.mjs --apply-recording",
        "validation-hold-release-confirmation"
      )
    }
  ];
}

function recorderFailClosed(row) {
  return [
    row.expectedBlockedStatus,
    "dry-run-blocked-owner-approval-placeholders",
    "dry-run-blocked-owner-approval-text",
    "dry-run-blocked-owner-confirmation-input",
    "dry-run-ready-requires-explicit-apply",
    "already-recorded",
    "no-pending-focus-rows"
  ].includes(row.dryRunStatus) &&
    [
      row.expectedBlockedStatus,
      "dry-run-blocked-owner-approval-placeholders",
      "dry-run-blocked-owner-approval-text",
      "dry-run-blocked-owner-confirmation-input",
      "dry-run-ready-requires-explicit-apply",
      "already-recorded",
      "no-pending-focus-rows"
    ].includes(row.currentGateStatus) &&
    row.applyPermitted === false &&
    row.mutationsPerformed === false &&
    row.applyCommandTemplate?.executableNow === false;
}

function allRecordersBlocked(rows) {
  return rows.every((row) =>
    recorderFailClosed(row)
  );
}

function buildSequenceRows() {
  return [
    {
      order: 1,
      phase: "preflight-currentness",
      command: "npm run release:dirty-map -- --assert-current --max-age-minutes 60",
      executableNow: false,
      whyNotExecutable: "validation-only command already covered by refresh/current gates"
    },
    {
      order: 2,
      phase: "record-owner-response",
      command: "node coordination/release-intake/run-next-owner-authorization-focus-batch-canonical-recording.mjs --apply-recording ...",
      executableNow: false,
      whyNotExecutable: "requires exact A25 owner-package approval text, owner identity, and ISO timestamp"
    },
    {
      order: 3,
      phase: "record-owner-response",
      command: "node coordination/release-intake/run-a22-root-parity-owner-input-recording.mjs --apply-owner-input ...",
      executableNow: false,
      whyNotExecutable: "requires exact A22 root-parity owner approval text, owner identity, and ISO timestamp"
    },
    {
      order: 4,
      phase: "record-owner-response",
      command: "node coordination/release-intake/run-validation-hold-release-confirmation-recording.mjs --apply-recording",
      executableNow: false,
      whyNotExecutable: "requires exact validation-hold owner confirmation input file"
    },
    {
      order: 5,
      phase: "extract-after-recording",
      command: "node coordination/release-intake/run-a22-top-clean-candidate-root-parity-extraction-instruction-recording.mjs --apply-recording",
      executableNow: false,
      whyNotExecutable: "requires recorded A22 owner input and a green recording dry-run"
    },
    {
      order: 6,
      phase: "extract-after-recording",
      command: "node coordination/release-intake/run-a22-top-clean-candidate-root-parity-guarded-extraction.mjs --apply-extraction",
      executableNow: false,
      whyNotExecutable: "requires recorded extraction instructions and explicit guarded extraction apply"
    },
    {
      order: 7,
      phase: "validate-after-extraction",
      command: "node coordination/release-intake/assert-a22-clean-source-validation-queue-current.mjs",
      executableNow: false,
      whyNotExecutable: "validation command after controlled extraction, not a current mutation"
    },
    {
      order: 8,
      phase: "merge-gate",
      command: "node coordination/release-intake/assert-validate-to-merge-exit-criteria-current.mjs",
      executableNow: false,
      whyNotExecutable: "merge remains blocked until clean source gates are green and owner merge authorization exists"
    }
  ];
}

function buildChecks({ sourceFailures, packet, recorderRows, sequenceRows, artifacts }) {
  const packetSummary = packet.summary ?? {};
  const ownerResponseWaiting = packet.packetStatus === "waiting-for-owner-response" &&
    packetSummary.frontierOwnerRows > 0;
  const ownerResponseConsumed = [
    "owner-response-consumed-waiting-candidate-mutation-input",
    "owner-response-consumed-waiting-a22-typecheck-build-remediation"
  ].includes(packet.packetStatus) &&
    packetSummary.frontierOwnerRows === 0;
  return [
    {
      id: "sources-current",
      status: sourceFailures.length === 0 ? "pass" : "fail",
      detail: `sourceCurrentnessFailures=${sourceFailures.length}`
    },
    {
      id: "owner-response-still-waiting",
      status: (ownerResponseWaiting || ownerResponseConsumed) &&
        packetSummary.cleanupAuthorizedRows === 0 &&
        packetSummary.executableRows === 0 ? "pass" : "fail",
      detail: `packetStatus=${packet.packetStatus}; frontierOwnerRows=${packetSummary.frontierOwnerRows ?? 0}`
    },
    {
      id: "recorders-fail-closed-until-owner-response",
      status: allRecordersBlocked(recorderRows) ? "pass" : "fail",
      detail: recorderRows.map((row) => `${row.id}=${row.dryRunStatus}`).join("; ")
    },
    {
      id: "post-response-sequence-has-seven-step-coverage",
      status: sequenceRows.length === 8 &&
        ["record-owner-response", "extract-after-recording", "validate-after-extraction", "merge-gate"].every((phase) =>
          sequenceRows.some((row) => row.phase === phase)
        ) ? "pass" : "fail",
      detail: `sequenceRows=${sequenceRows.length}`
    },
    {
      id: "validate-to-merge-still-blocked",
      status: artifacts.validateToMergeExitCriteria.validateExitReady === false &&
        artifacts.validateToMergeExitCriteria.readyForMerge === false &&
        [
          "waiting-top-candidate-root-parity-owner-input",
          "waiting-top-candidate-candidate-mutation-owner-input",
          "waiting-top-candidate-typecheck-build-remediation",
          "fallback-candidate-green-await-clean-source-selection-review"
        ].includes(artifacts.cleanSourceValidationQueue.queueStatus) ? "pass" : "fail",
      detail: `validateExitReady=${artifacts.validateToMergeExitCriteria.validateExitReady}; cleanSourceQueue=${artifacts.cleanSourceValidationQueue.queueStatus ?? "unknown"}`
    },
    {
      id: "non-executable-boundary",
      status: recorderRows.every((row) => row.applyCommandTemplate.executableNow === false) &&
        sequenceRows.every((row) => row.executableNow === false) ? "pass" : "fail",
      detail: "all apply commands remain templates and all sequence rows are non-executable in the current state"
    }
  ];
}

export function buildValidateFrontierPostResponseExecutionPlan() {
  const artifacts = {
    dirtyMap: readJson(VALIDATE_FRONTIER_POST_RESPONSE_EXECUTION_PLAN_PATHS.dirtyMap),
    ownerResponsePacket: readJson(VALIDATE_FRONTIER_POST_RESPONSE_EXECUTION_PLAN_PATHS.ownerResponsePacket),
    ownerResponsePacketGate: readJson(VALIDATE_FRONTIER_POST_RESPONSE_EXECUTION_PLAN_PATHS.ownerResponsePacketGate),
    a25CanonicalRecordingDryRun: readJson(VALIDATE_FRONTIER_POST_RESPONSE_EXECUTION_PLAN_PATHS.a25CanonicalRecordingDryRun),
    a25CanonicalRecordingGate: readJson(VALIDATE_FRONTIER_POST_RESPONSE_EXECUTION_PLAN_PATHS.a25CanonicalRecordingGate),
    a22RootParityOwnerInputDryRun: readJson(VALIDATE_FRONTIER_POST_RESPONSE_EXECUTION_PLAN_PATHS.a22RootParityOwnerInputDryRun),
    a22RootParityOwnerInputGate: readJson(VALIDATE_FRONTIER_POST_RESPONSE_EXECUTION_PLAN_PATHS.a22RootParityOwnerInputGate),
    validationHoldRecordingDryRun: readJson(VALIDATE_FRONTIER_POST_RESPONSE_EXECUTION_PLAN_PATHS.validationHoldRecordingDryRun),
    validationHoldRecordingGate: readJson(VALIDATE_FRONTIER_POST_RESPONSE_EXECUTION_PLAN_PATHS.validationHoldRecordingGate),
    validateToMergeExitCriteria: readJson(VALIDATE_FRONTIER_POST_RESPONSE_EXECUTION_PLAN_PATHS.validateToMergeExitCriteria),
    cleanSourceValidationQueue: readJson(VALIDATE_FRONTIER_POST_RESPONSE_EXECUTION_PLAN_PATHS.cleanSourceValidationQueue)
  };
  const sourceFailures = sourceCurrentnessFailures({ dirtyMap: artifacts.dirtyMap, artifacts });
  const recorderRows = buildRecorderRows({ artifacts, packet: artifacts.ownerResponsePacket });
  const sequenceRows = buildSequenceRows();
  const checks = buildChecks({
    sourceFailures,
    packet: artifacts.ownerResponsePacket,
    recorderRows,
    sequenceRows,
    artifacts
  });
  const failedChecks = checks.filter((check) => check.status !== "pass").length;
  const packetSummary = artifacts.ownerResponsePacket.summary ?? {};
  const payload = {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    planKind: "a25-a22-validate-frontier-post-response-execution-plan",
    planStatus: failedChecks === 0
      ? (artifacts.ownerResponsePacket.packetStatus === "owner-response-consumed-waiting-candidate-mutation-input"
        ? "waiting-for-a22-candidate-mutation-owner-input"
        : artifacts.ownerResponsePacket.packetStatus === "owner-response-consumed-waiting-a22-typecheck-build-remediation"
          ? "waiting-for-a22-typecheck-build-remediation"
        : "waiting-for-owner-response")
      : "blocked-source-review-required",
    dirtyMapStatusSignature: artifacts.dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMapEntryCount(artifacts.dirtyMap),
    sourceArtifacts: Object.fromEntries(Object.entries(artifacts).map(([key, payload]) => [
      key,
      artifactStamp(key, VALIDATE_FRONTIER_POST_RESPONSE_EXECUTION_PLAN_PATHS[key], payload)
    ])),
    sourceCurrentnessFailures: sourceFailures,
    summary: {
      ownerResponseBlocks: packetSummary.responseBlocks ?? 0,
      frontierOwnerRows: packetSummary.frontierOwnerRows ?? 0,
      recorderRows: recorderRows.length,
      dryRunBlockedRows: recorderRows.filter(recorderFailClosed).length,
      postResponseSequenceRows: sequenceRows.length,
      validateExitReady: artifacts.validateToMergeExitCriteria.validateExitReady === true,
      readyForMerge: artifacts.validateToMergeExitCriteria.readyForMerge === true,
      cleanSourceQueueStatus: artifacts.cleanSourceValidationQueue.queueStatus ?? "unknown",
      cleanupAuthorizedRows: 0,
      executableRows: 0,
      failedChecks,
      passingChecks: checks.length - failedChecks,
      totalChecks: checks.length
    },
    ownerResponseTargets: {
      a25CanonicalAuthorizations: ownerResponseBlock(artifacts.ownerResponsePacket, "a25-owner-package-canonical-authorization-focus-batch").targetFile ?? "",
      a22RootParityOwnerInput: ownerResponseBlock(artifacts.ownerResponsePacket, "a22-root-parity-selected-actions").targetFile ?? "",
      validationHoldConfirmation: ownerResponseBlock(artifacts.ownerResponsePacket, "validation-hold-release-confirmation").targetFile ?? ""
    },
    recorderRows,
    postResponseSequenceRows: sequenceRows,
    boundary: {
      evidenceOnly: true,
      recordsOwnerInputRows: 0,
      recordsAuthorizationRows: 0,
      recordsExtractionInstructionRows: 0,
      modifiesCandidateRows: 0,
      rootCopyRows: 0,
      validationHoldReleased: false,
      stageAuthorized: false,
      commitAuthorized: false,
      cleanupAuthorized: false,
      deployAuthorized: false,
      mergeAuthorized: false,
      broadStagingAuthorized: false,
      destructiveGitAuthorized: false,
      physicalLifecycleCleanupAuthorized: false,
      executableNow: false
    },
    checks
  };
  return payload;
}

export function stableValidateFrontierPostResponseExecutionPlanProjection(payload) {
  return {
    planKind: payload.planKind,
    planStatus: payload.planStatus,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: Object.fromEntries(Object.entries(payload.sourceArtifacts ?? {}).map(([key, stamp]) => [key, {
      key: stamp.key,
      path: stamp.path,
      dirtyMapStatusSignature: stamp.dirtyMapStatusSignature,
      expandedStatusEntries: stamp.expandedStatusEntries,
      failures: stamp.failures ?? []
    }])),
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures ?? [],
    summary: payload.summary,
    ownerResponseTargets: payload.ownerResponseTargets,
    recorderRows: payload.recorderRows,
    postResponseSequenceRows: payload.postResponseSequenceRows,
    boundary: payload.boundary,
    checks: payload.checks
  };
}

function renderMarkdown(payload) {
  const recorderRows = payload.recorderRows.map((row) =>
    `- ${row.id}: ${row.dryRunStatus}; rows=${row.rowCount}; executableNow=false`
  ).join("\n");
  const sequenceRows = payload.postResponseSequenceRows.map((row) =>
    `${row.order}. ${row.phase}: \`${row.command}\` (${row.whyNotExecutable})`
  ).join("\n");
  const checks = payload.checks.map((check) =>
    `- ${check.status === "pass" ? "[pass]" : "[fail]"} ${check.id}: ${check.detail}`
  ).join("\n");

  return `# A25/A22 Validate Frontier Post-Response Execution Plan

- Generated at: ${payload.generatedAt}
- Plan status: ${payload.planStatus}
- Expanded dirty entries: ${payload.expandedStatusEntries}
- Frontier owner rows: ${payload.summary.frontierOwnerRows}
- Recorder rows: ${payload.summary.recorderRows}
- Dry-run blocked rows: ${payload.summary.dryRunBlockedRows}
- Post-response sequence rows: ${payload.summary.postResponseSequenceRows}
- Validate exit ready: ${payload.summary.validateExitReady ? "yes" : "no"}
- Ready for merge: ${payload.summary.readyForMerge ? "yes" : "no"}
- Clean source queue status: ${payload.summary.cleanSourceQueueStatus}
- Cleanup authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Boundary

This plan is evidence-only. It does not record owner input, record authorizations, record extraction instructions, mutate the A22 candidate, copy root files, release the validation hold, stage, commit, merge, deploy, clean, delete, reset, prune, or authorize physical lifecycle cleanup.

## Owner Response Targets

- A25 canonical authorizations: \`${payload.ownerResponseTargets.a25CanonicalAuthorizations}\`
- A22 root-parity owner input: \`${payload.ownerResponseTargets.a22RootParityOwnerInput}\`
- Validation hold confirmation: \`${payload.ownerResponseTargets.validationHoldConfirmation}\`

## Current Recorder State

${recorderRows}

## Ordered Post-Response Sequence

${sequenceRows}

## Checks

${checks}
`;
}

export function writeValidateFrontierPostResponseExecutionPlan() {
  const payload = buildValidateFrontierPostResponseExecutionPlan();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const markdown = renderMarkdown(payload);
  for (const target of [
    VALIDATE_FRONTIER_POST_RESPONSE_EXECUTION_PLAN_PATHS.latestJson,
    VALIDATE_FRONTIER_POST_RESPONSE_EXECUTION_PLAN_PATHS.datedJson
  ]) {
    write(target, json);
  }
  for (const target of [
    VALIDATE_FRONTIER_POST_RESPONSE_EXECUTION_PLAN_PATHS.latestMarkdown,
    VALIDATE_FRONTIER_POST_RESPONSE_EXECUTION_PLAN_PATHS.datedMarkdown
  ]) {
    write(target, markdown);
  }
  return payload;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const requiredPath of Object.values(VALIDATE_FRONTIER_POST_RESPONSE_EXECUTION_PLAN_PATHS).filter((value) =>
    typeof value === "string" && !value.includes("post-response-execution-plan")
  )) {
    if (!exists(requiredPath)) {
      console.error(`Missing required source artifact: ${requiredPath}`);
      process.exit(1);
    }
  }
  const payload = writeValidateFrontierPostResponseExecutionPlan();
  console.log(JSON.stringify({
    latestJson: VALIDATE_FRONTIER_POST_RESPONSE_EXECUTION_PLAN_PATHS.latestJson,
    latestMarkdown: VALIDATE_FRONTIER_POST_RESPONSE_EXECUTION_PLAN_PATHS.latestMarkdown,
    planStatus: payload.planStatus,
    frontierOwnerRows: payload.summary.frontierOwnerRows,
    recorderRows: payload.summary.recorderRows,
    dryRunBlockedRows: payload.summary.dryRunBlockedRows,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}
