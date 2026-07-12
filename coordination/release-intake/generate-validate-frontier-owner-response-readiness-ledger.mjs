#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  VALIDATE_FRONTIER_POST_RESPONSE_EXECUTION_PLAN_PATHS,
  buildValidateFrontierPostResponseExecutionPlan,
  stableValidateFrontierPostResponseExecutionPlanProjection
} from "./generate-validate-frontier-post-response-execution-plan.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const VALIDATE_FRONTIER_OWNER_RESPONSE_READINESS_LEDGER_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  ownerResponsePacket: "coordination/release-intake/latest-A25-validate-frontier-owner-response-packet.json",
  ownerResponsePacketGate: "coordination/release-intake/latest-A25-validate-frontier-owner-response-packet-current-gate.json",
  postResponseExecutionPlan: VALIDATE_FRONTIER_POST_RESPONSE_EXECUTION_PLAN_PATHS.latestJson,
  postResponseExecutionPlanGate: "coordination/release-intake/latest-A25-validate-frontier-post-response-execution-plan-current-gate.json",
  ownerClosureInputReadiness: "coordination/release-intake/latest-A25-owner-closure-input-readiness.json",
  validateToMergeExitCriteria: "coordination/release-intake/latest-A25-validate-to-merge-exit-criteria.json",
  latestJson: "coordination/release-intake/latest-A25-validate-frontier-owner-response-readiness-ledger.json",
  latestMarkdown: "coordination/release-intake/latest-A25-validate-frontier-owner-response-readiness-ledger.md",
  datedJson: `coordination/release-intake/${date}-A25-validate-frontier-owner-response-readiness-ledger.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-validate-frontier-owner-response-readiness-ledger.md`
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
    const stamp = artifactStamp(key, VALIDATE_FRONTIER_OWNER_RESPONSE_READINESS_LEDGER_PATHS[key], payload);
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
  const currentPlan = buildValidateFrontierPostResponseExecutionPlan();
  if (!sameJson(
    stableValidateFrontierPostResponseExecutionPlanProjection(artifacts.postResponseExecutionPlan),
    stableValidateFrontierPostResponseExecutionPlanProjection(currentPlan)
  )) {
    failures.push("post-response execution plan is stale versus current sources");
  }
  return failures;
}

function responseBlock(packet, id) {
  return (packet.ownerResponseBlocks ?? []).find((block) => block.id === id) ?? {};
}

function recorderRow(plan, id) {
  return (plan.recorderRows ?? []).find((row) => row.id === id) ?? {};
}

function baseLedgerRow({ rowId, ownerResponseBlockId, owner, requestKind, targetFile, requiredTextKind, requiredText, blockingReason, nextRecorderId, readinessStatus = "waiting-for-owner-response" }) {
  return {
    rowId,
    ownerResponseBlockId,
    owner,
    requestKind,
    targetFile,
    requiredTextKind,
    requiredText,
    readinessStatus,
    blockingReason,
    nextRecorderId,
    readyToRecord: false,
    cleanupAuthorized: false,
    deployAuthorized: false,
    mergeAuthorized: false,
    destructiveGitAuthorized: false,
    physicalLifecycleCleanupAuthorized: false,
    executableNow: false
  };
}

function buildLedgerRows({ packet, plan }) {
  const a25 = responseBlock(packet, "a25-owner-package-canonical-authorization-focus-batch");
  const a22 = responseBlock(packet, "a22-root-parity-selected-actions");
  const hold = responseBlock(packet, "validation-hold-release-confirmation");
  const a25Recorder = recorderRow(plan, "record-a25-owner-package-authorizations");
  const a22Recorder = recorderRow(plan, "record-a22-root-parity-owner-input");
  const holdRecorder = recorderRow(plan, "record-validation-hold-confirmation");
  const ownerResponseConsumed = [
    "owner-response-consumed-waiting-candidate-mutation-input",
    "owner-response-consumed-waiting-a22-typecheck-build-remediation"
  ].includes(packet.packetStatus);
  const ownerResponseConsumedForTypecheck = packet.packetStatus === "owner-response-consumed-waiting-a22-typecheck-build-remediation";

  const a25Rows = (a25.approvalIds ?? []).map((approvalId) => baseLedgerRow({
    rowId: `a25:${approvalId}`,
    ownerResponseBlockId: a25.id,
    owner: a25.owner,
    requestKind: a25.requestKind,
    targetFile: a25.targetFile,
    requiredTextKind: "owner-package-authorization",
    requiredText: a25.copyableOwnerReplyTextZh,
    blockingReason: a25Recorder.dryRunStatus ?? "waiting-for-owner-response",
    nextRecorderId: a25Recorder.id ?? ""
  }));

  const a22Rows = (a22.approvalIds ?? []).map((approvalId) => {
    const selectedAction = a22.selectedActions?.[approvalId] ?? "";
    const exactLine = (a22.exactOwnerExecutionTextLines ?? []).find((line) => line.includes(`unitId=${approvalId}`)) ?? "";
    return baseLedgerRow({
      rowId: `a22:${approvalId}`,
      ownerResponseBlockId: a22.id,
      owner: a22.owner,
      requestKind: a22.requestKind,
      targetFile: a22.targetFile,
      requiredTextKind: "root-parity-selected-action",
      requiredText: exactLine || a22.copyableOwnerReplyTextZh,
      blockingReason: a22Recorder.dryRunStatus ?? "waiting-for-owner-response",
      nextRecorderId: a22Recorder.id ?? "",
      readinessStatus: ownerResponseConsumedForTypecheck
        ? "owner-input-recorded-waiting-typecheck-build-remediation"
        : ownerResponseConsumed
          ? "owner-input-recorded-waiting-candidate-mutation-input"
          : "waiting-for-owner-response"
    });
  }).map((row) => ({
    ...row,
    selectedAction: a22.selectedActions?.[row.rowId.replace(/^a22:/, "")] ?? "",
    topCandidateBranch: a22.topCandidateBranch ?? "",
    targetWorktree: a22.targetWorktree ?? ""
  }));

  const holdRows = [
    baseLedgerRow({
      rowId: "hold:validation-hold-release-confirmation",
      ownerResponseBlockId: hold.id,
      owner: hold.owner,
      requestKind: hold.requestKind,
      targetFile: hold.targetFile,
      requiredTextKind: "validation-hold-confirmation",
      requiredText: hold.requiredConfirmationTextZh,
      blockingReason: holdRecorder.dryRunStatus ?? "waiting-for-owner-response",
      nextRecorderId: holdRecorder.id ?? "",
      readinessStatus: ownerResponseConsumed ? "owner-confirmation-recorded-release-gated" : "waiting-for-owner-response"
    })
  ].map((row) => ({
    ...row,
    activeWorktreePath: hold.activeWorktreePath ?? "",
    ownerConfirmationInputPresent: hold.ownerConfirmationInputPresent === true,
    validationHoldReleased: hold.validationHoldReleased === true
  }));

  return [...a25Rows, ...a22Rows, ...holdRows];
}

function buildChecks({ sourceFailures, packet, plan, ownerClosureInputReadiness, validateToMergeExitCriteria, ledgerRows }) {
  const summary = packet.summary ?? {};
  const planSummary = plan.summary ?? {};
  const ownerResponseConsumed = [
    "owner-response-consumed-waiting-candidate-mutation-input",
    "owner-response-consumed-waiting-a22-typecheck-build-remediation"
  ].includes(packet.packetStatus);
  const expectedA25Rows = ownerResponseConsumed ? 0 : (packet.ownerResponseBlocks ?? [])
    .find((block) => block.id === "a25-owner-package-canonical-authorization-focus-batch")
    ?.approvalIds?.length ?? 0;
  const expectedLedgerRows = expectedA25Rows + 4 + 1;
  const expectedPlanStatuses = ownerResponseConsumed
    ? ["waiting-for-a22-candidate-mutation-owner-input", "waiting-for-a22-typecheck-build-remediation"]
    : ["waiting-for-owner-response"];
  return [
    {
      id: "sources-current",
      status: sourceFailures.length === 0 ? "pass" : "fail",
      detail: `sourceCurrentnessFailures=${sourceFailures.length}`
    },
    {
      id: "ledger-row-counts-current-frontier",
      status: ledgerRows.length === expectedLedgerRows &&
        ledgerRows.filter((row) => row.rowId.startsWith("a25:")).length === expectedA25Rows &&
        ledgerRows.filter((row) => row.rowId.startsWith("a22:")).length === 4 &&
        ledgerRows.filter((row) => row.rowId.startsWith("hold:")).length === 1 ? "pass" : "fail",
      detail: `ledgerRows=${ledgerRows.length}; packetFrontierRows=${summary.frontierOwnerRows ?? 0}; holdRows=${summary.validationHoldConfirmationRows ?? 0}`
    },
    {
      id: "post-response-plan-fail-closed",
      status: expectedPlanStatuses.includes(plan.planStatus) &&
        planSummary.recorderRows === 3 &&
        planSummary.dryRunBlockedRows === 3 &&
        planSummary.executableRows === 0 ? "pass" : "fail",
      detail: `planStatus=${plan.planStatus}; dryRunBlockedRows=${planSummary.dryRunBlockedRows ?? 0}`
    },
    {
      id: "owner-inputs-not-ready-yet",
      status: ownerClosureInputReadiness.summary?.ownerInputsReady === false &&
        ownerClosureInputReadiness.summary?.pendingCanonicalAuthorizationRows === summary.currentPendingCanonicalAuthorizationRows ? "pass" : "fail",
      detail: `ownerInputsReady=${ownerClosureInputReadiness.summary?.ownerInputsReady}; pendingCanonicalAuthorizationRows=${ownerClosureInputReadiness.summary?.pendingCanonicalAuthorizationRows ?? "unknown"}`
    },
    {
      id: "validate-to-merge-still-blocked",
      status: validateToMergeExitCriteria.validateExitReady === false &&
        validateToMergeExitCriteria.readyForMerge === false &&
        validateToMergeExitCriteria.summary?.cleanSourceBlockers === 1 &&
        validateToMergeExitCriteria.summary?.validationHoldBlockers === 1 ? "pass" : "fail",
      detail: `validateExitReady=${validateToMergeExitCriteria.validateExitReady}; readyForMerge=${validateToMergeExitCriteria.readyForMerge}`
    },
    {
      id: "ledger-rows-non-executable",
      status: ledgerRows.every((row) =>
        row.readyToRecord === false &&
        row.cleanupAuthorized === false &&
        row.deployAuthorized === false &&
        row.mergeAuthorized === false &&
        row.destructiveGitAuthorized === false &&
        row.physicalLifecycleCleanupAuthorized === false &&
        row.executableNow === false
      ) ? "pass" : "fail",
      detail: "owner response ledger rows remain blocked until exact owner response is recorded"
    }
  ];
}

export function buildValidateFrontierOwnerResponseReadinessLedger() {
  const artifacts = {
    dirtyMap: readJson(VALIDATE_FRONTIER_OWNER_RESPONSE_READINESS_LEDGER_PATHS.dirtyMap),
    ownerResponsePacket: readJson(VALIDATE_FRONTIER_OWNER_RESPONSE_READINESS_LEDGER_PATHS.ownerResponsePacket),
    ownerResponsePacketGate: readJson(VALIDATE_FRONTIER_OWNER_RESPONSE_READINESS_LEDGER_PATHS.ownerResponsePacketGate),
    postResponseExecutionPlan: readJson(VALIDATE_FRONTIER_OWNER_RESPONSE_READINESS_LEDGER_PATHS.postResponseExecutionPlan),
    postResponseExecutionPlanGate: readJson(VALIDATE_FRONTIER_OWNER_RESPONSE_READINESS_LEDGER_PATHS.postResponseExecutionPlanGate),
    ownerClosureInputReadiness: readJson(VALIDATE_FRONTIER_OWNER_RESPONSE_READINESS_LEDGER_PATHS.ownerClosureInputReadiness),
    validateToMergeExitCriteria: readJson(VALIDATE_FRONTIER_OWNER_RESPONSE_READINESS_LEDGER_PATHS.validateToMergeExitCriteria)
  };
  const sourceFailures = sourceCurrentnessFailures({ dirtyMap: artifacts.dirtyMap, artifacts });
  const ledgerRows = buildLedgerRows({
    packet: artifacts.ownerResponsePacket,
    plan: artifacts.postResponseExecutionPlan
  });
  const checks = buildChecks({
    sourceFailures,
    packet: artifacts.ownerResponsePacket,
    plan: artifacts.postResponseExecutionPlan,
    ownerClosureInputReadiness: artifacts.ownerClosureInputReadiness,
    validateToMergeExitCriteria: artifacts.validateToMergeExitCriteria,
    ledgerRows
  });
  const failedChecks = checks.filter((check) => check.status !== "pass").length;
  const payload = {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    ledgerKind: "a25-a22-validate-frontier-owner-response-readiness-ledger",
    ledgerStatus: failedChecks === 0
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
      artifactStamp(key, VALIDATE_FRONTIER_OWNER_RESPONSE_READINESS_LEDGER_PATHS[key], payload)
    ])),
    sourceCurrentnessFailures: sourceFailures,
    summary: {
      ownerResponseBlocks: artifacts.ownerResponsePacket.summary?.responseBlocks ?? 0,
      ownerResponseRows: ledgerRows.length,
      a25AuthorizationRows: ledgerRows.filter((row) => row.rowId.startsWith("a25:")).length,
      a22SelectedActionRows: ledgerRows.filter((row) => row.rowId.startsWith("a22:")).length,
      validationHoldConfirmationRows: ledgerRows.filter((row) => row.rowId.startsWith("hold:")).length,
      readyToRecordRows: ledgerRows.filter((row) => row.readyToRecord === true).length,
      blockedRows: ledgerRows.filter((row) => row.readyToRecord !== true).length,
      currentPendingCanonicalAuthorizationRows: artifacts.ownerResponsePacket.summary?.currentPendingCanonicalAuthorizationRows ?? 0,
      projectedPendingCanonicalAuthorizationRows: artifacts.ownerResponsePacket.summary?.projectedPendingCanonicalAuthorizationRows ?? 0,
      ownerInputsReady: artifacts.ownerClosureInputReadiness.summary?.ownerInputsReady === true,
      validateExitReady: artifacts.validateToMergeExitCriteria.validateExitReady === true,
      readyForMerge: artifacts.validateToMergeExitCriteria.readyForMerge === true,
      cleanupAuthorizedRows: 0,
      executableRows: 0,
      failedChecks,
      passingChecks: checks.length - failedChecks,
      totalChecks: checks.length
    },
    ledgerRows,
    boundary: {
      evidenceOnly: true,
      recordsOwnerInputRows: 0,
      recordsAuthorizationRows: 0,
      recordsExtractionInstructionRows: 0,
      modifiesCandidateRows: 0,
      rootCopyRows: 0,
      validationHoldReleased: false,
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

export function stableValidateFrontierOwnerResponseReadinessLedgerProjection(payload) {
  return {
    ledgerKind: payload.ledgerKind,
    ledgerStatus: payload.ledgerStatus,
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
    ledgerRows: payload.ledgerRows,
    boundary: payload.boundary,
    checks: payload.checks
  };
}

function renderMarkdown(payload) {
  const rows = payload.ledgerRows.map((row) =>
    `- ${row.rowId}: ${row.requestKind}; target=\`${row.targetFile}\`; status=${row.readinessStatus}; blocker=${row.blockingReason}`
  ).join("\n");
  const checks = payload.checks.map((check) =>
    `- ${check.status === "pass" ? "[pass]" : "[fail]"} ${check.id}: ${check.detail}`
  ).join("\n");

  return `# A25/A22 Validate Frontier Owner Response Readiness Ledger

- Generated at: ${payload.generatedAt}
- Ledger status: ${payload.ledgerStatus}
- Expanded dirty entries: ${payload.expandedStatusEntries}
- Owner response rows: ${payload.summary.ownerResponseRows}
- A25 authorization rows: ${payload.summary.a25AuthorizationRows}
- A22 selectedAction rows: ${payload.summary.a22SelectedActionRows}
- Validation hold confirmation rows: ${payload.summary.validationHoldConfirmationRows}
- Ready to record rows: ${payload.summary.readyToRecordRows}
- Blocked rows: ${payload.summary.blockedRows}
- Projected pending canonical authorization rows: ${payload.summary.projectedPendingCanonicalAuthorizationRows}
- Validate exit ready: ${payload.summary.validateExitReady ? "yes" : "no"}
- Ready for merge: ${payload.summary.readyForMerge ? "yes" : "no"}
- Cleanup authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Boundary

This ledger is evidence-only. It does not record owner input, record authorizations, record extraction instructions, mutate the A22 candidate, copy root files, release the validation hold, stage, commit, merge, deploy, clean, delete, reset, prune, or authorize physical lifecycle cleanup.

## Ledger Rows

${rows}

## Checks

${checks}
`;
}

export function writeValidateFrontierOwnerResponseReadinessLedger() {
  const payload = buildValidateFrontierOwnerResponseReadinessLedger();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const markdown = renderMarkdown(payload);
  for (const target of [
    VALIDATE_FRONTIER_OWNER_RESPONSE_READINESS_LEDGER_PATHS.latestJson,
    VALIDATE_FRONTIER_OWNER_RESPONSE_READINESS_LEDGER_PATHS.datedJson
  ]) {
    write(target, json);
  }
  for (const target of [
    VALIDATE_FRONTIER_OWNER_RESPONSE_READINESS_LEDGER_PATHS.latestMarkdown,
    VALIDATE_FRONTIER_OWNER_RESPONSE_READINESS_LEDGER_PATHS.datedMarkdown
  ]) {
    write(target, markdown);
  }
  return payload;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const requiredPath of Object.values(VALIDATE_FRONTIER_OWNER_RESPONSE_READINESS_LEDGER_PATHS).filter((value) =>
    typeof value === "string" && !value.includes("owner-response-readiness-ledger")
  )) {
    if (!exists(requiredPath)) {
      console.error(`Missing required source artifact: ${requiredPath}`);
      process.exit(1);
    }
  }
  const payload = writeValidateFrontierOwnerResponseReadinessLedger();
  console.log(JSON.stringify({
    latestJson: VALIDATE_FRONTIER_OWNER_RESPONSE_READINESS_LEDGER_PATHS.latestJson,
    latestMarkdown: VALIDATE_FRONTIER_OWNER_RESPONSE_READINESS_LEDGER_PATHS.latestMarkdown,
    ledgerStatus: payload.ledgerStatus,
    ownerResponseRows: payload.summary.ownerResponseRows,
    readyToRecordRows: payload.summary.readyToRecordRows,
    blockedRows: payload.summary.blockedRows,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}
