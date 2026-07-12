#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  VALIDATE_FRONTIER_OWNER_RESPONSE_READINESS_LEDGER_PATHS,
  buildValidateFrontierOwnerResponseReadinessLedger,
  stableValidateFrontierOwnerResponseReadinessLedgerProjection
} from "./generate-validate-frontier-owner-response-readiness-ledger.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-validate-frontier-owner-response-readiness-ledger-current-gate.json");
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

function responseBlock(packet, id) {
  return (packet.ownerResponseBlocks ?? []).find((block) => block.id === id) ?? {};
}

function main() {
  const failures = [];
  for (const requiredPath of [
    VALIDATE_FRONTIER_OWNER_RESPONSE_READINESS_LEDGER_PATHS.dirtyMap,
    VALIDATE_FRONTIER_OWNER_RESPONSE_READINESS_LEDGER_PATHS.ownerResponsePacket,
    VALIDATE_FRONTIER_OWNER_RESPONSE_READINESS_LEDGER_PATHS.ownerResponsePacketGate,
    VALIDATE_FRONTIER_OWNER_RESPONSE_READINESS_LEDGER_PATHS.postResponseExecutionPlan,
    VALIDATE_FRONTIER_OWNER_RESPONSE_READINESS_LEDGER_PATHS.postResponseExecutionPlanGate,
    VALIDATE_FRONTIER_OWNER_RESPONSE_READINESS_LEDGER_PATHS.ownerClosureInputReadiness,
    VALIDATE_FRONTIER_OWNER_RESPONSE_READINESS_LEDGER_PATHS.validateToMergeExitCriteria,
    VALIDATE_FRONTIER_OWNER_RESPONSE_READINESS_LEDGER_PATHS.latestJson,
    VALIDATE_FRONTIER_OWNER_RESPONSE_READINESS_LEDGER_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const dirtyMap = readJson(VALIDATE_FRONTIER_OWNER_RESPONSE_READINESS_LEDGER_PATHS.dirtyMap);
  const ownerResponsePacket = readJson(VALIDATE_FRONTIER_OWNER_RESPONSE_READINESS_LEDGER_PATHS.ownerResponsePacket);
  const recorded = readJson(VALIDATE_FRONTIER_OWNER_RESPONSE_READINESS_LEDGER_PATHS.latestJson);
  const current = buildValidateFrontierOwnerResponseReadinessLedger();
  const markdown = readText(VALIDATE_FRONTIER_OWNER_RESPONSE_READINESS_LEDGER_PATHS.latestMarkdown);
  const expectedSignature = dirtyMap.statusSignature ?? null;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  const summary = recorded.summary ?? {};
  const rows = recorded.ledgerRows ?? [];
  const checks = recorded.checks ?? [];
  const boundary = recorded.boundary ?? {};
  const ownerResponseConsumed = [
    "waiting-for-a22-candidate-mutation-owner-input",
    "waiting-for-a22-typecheck-build-remediation"
  ].includes(recorded.ledgerStatus);
  const ownerResponseConsumedForTypecheck = recorded.ledgerStatus === "waiting-for-a22-typecheck-build-remediation";
  const expectedLedgerStatus = ownerResponseConsumed
    ? ownerResponseConsumedForTypecheck
      ? "waiting-for-a22-typecheck-build-remediation"
      : "waiting-for-a22-candidate-mutation-owner-input"
    : "waiting-for-owner-response";
  const a25Block = responseBlock(ownerResponsePacket, "a25-owner-package-canonical-authorization-focus-batch");
  const expectedA25RowIds = ownerResponseConsumed ? [] : (a25Block.approvalIds ?? []).map((approvalId) => `a25:${approvalId}`);
  const expectedA25Rows = expectedA25RowIds.length;
  const expectedRows = expectedA25Rows + 4 + 1;
  const expectedPendingCanonicalRows = current.summary?.currentPendingCanonicalAuthorizationRows ?? summary.currentPendingCanonicalAuthorizationRows;
  const expectedProjectedPendingCanonicalRows = current.summary?.projectedPendingCanonicalAuthorizationRows ?? summary.projectedPendingCanonicalAuthorizationRows;

  if (!sameJson(
    stableValidateFrontierOwnerResponseReadinessLedgerProjection(recorded),
    stableValidateFrontierOwnerResponseReadinessLedgerProjection(current)
  )) {
    failures.push("A25/A22 validate-frontier owner response readiness ledger is stale");
  }

  if (recorded.ledgerKind !== "a25-a22-validate-frontier-owner-response-readiness-ledger") failures.push("ledgerKind is invalid");
  if (recorded.ledgerStatus !== expectedLedgerStatus) failures.push("ledgerStatus must match current owner-response phase");
  if (recorded.dirtyMapStatusSignature !== expectedSignature) failures.push("ledger dirty-map signature is stale");
  if (recorded.expandedStatusEntries !== expectedEntries) failures.push("ledger expanded dirty entry count is stale");
  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures must be empty");

  if (summary.ownerResponseBlocks !== 3) failures.push("summary.ownerResponseBlocks must be 3");
  if (summary.ownerResponseRows !== expectedRows) failures.push("summary.ownerResponseRows must match current owner-response phase");
  if (summary.a25AuthorizationRows !== expectedA25Rows) failures.push("summary.a25AuthorizationRows must match current owner-response phase");
  if (summary.a22SelectedActionRows !== 4) failures.push("summary.a22SelectedActionRows must be 4");
  if (summary.validationHoldConfirmationRows !== 1) failures.push("summary.validationHoldConfirmationRows must be 1");
  if (summary.readyToRecordRows !== 0) failures.push("summary.readyToRecordRows must be 0");
  if (summary.blockedRows !== expectedRows) failures.push("summary.blockedRows must match current owner-response phase");
  if (summary.currentPendingCanonicalAuthorizationRows !== expectedPendingCanonicalRows) failures.push("summary.currentPendingCanonicalAuthorizationRows must match current sources");
  if (summary.projectedPendingCanonicalAuthorizationRows !== expectedProjectedPendingCanonicalRows) failures.push("summary.projectedPendingCanonicalAuthorizationRows must match current sources");
  if (summary.ownerInputsReady !== false) failures.push("summary.ownerInputsReady must be false");
  if (summary.validateExitReady !== false) failures.push("summary.validateExitReady must be false");
  if (summary.readyForMerge !== false) failures.push("summary.readyForMerge must be false");
  if (summary.cleanupAuthorizedRows !== 0) failures.push("summary.cleanupAuthorizedRows must be 0");
  if (summary.executableRows !== 0) failures.push("summary.executableRows must be 0");
  if (summary.failedChecks !== 0) failures.push("summary.failedChecks must be 0");
  if (summary.passingChecks !== checks.length) failures.push("summary.passingChecks must match checks length");

  if (rows.length !== expectedRows) failures.push("ledgerRows length must match current owner-response phase");
  const rowIds = rows.map((row) => row.rowId);
  const expectedRowIds = [
    ...expectedA25RowIds,
    "a22:a06-visualization-back-to-top-import-parity",
    "a22:a20-math-virus-blaster-data-parity",
    "a22:a20-mighty-tank-battle-data-parity",
    "a22:a05-california-high-school-lesson-illustration-data-parity",
    "hold:validation-hold-release-confirmation"
  ];
  for (const expectedRowId of expectedRowIds) {
    if (!rowIds.includes(expectedRowId)) failures.push(`missing ledger row: ${expectedRowId}`);
  }
  for (const row of rows) {
    const expectedReadinessStatus = row.rowId.startsWith("a22:") && ownerResponseConsumed
      ? ownerResponseConsumedForTypecheck
        ? "owner-input-recorded-waiting-typecheck-build-remediation"
        : "owner-input-recorded-waiting-candidate-mutation-input"
      : row.rowId.startsWith("hold:") && ownerResponseConsumed
        ? "owner-confirmation-recorded-release-gated"
        : "waiting-for-owner-response";
    if (row.readinessStatus !== expectedReadinessStatus) failures.push(`${row.rowId} readinessStatus must match current owner-response phase`);
    if (row.readyToRecord !== false) failures.push(`${row.rowId} readyToRecord must be false`);
    if (!String(row.targetFile ?? "").startsWith("coordination/release-intake/")) failures.push(`${row.rowId} targetFile must stay inside release-intake`);
    if (!String(row.requiredText ?? "").trim()) failures.push(`${row.rowId} requiredText must be present`);
    if (!String(row.nextRecorderId ?? "").trim()) failures.push(`${row.rowId} nextRecorderId must be present`);
    for (const field of [
      "cleanupAuthorized",
      "deployAuthorized",
      "mergeAuthorized",
      "destructiveGitAuthorized",
      "physicalLifecycleCleanupAuthorized",
      "executableNow"
    ]) {
      if (row[field] !== false) failures.push(`${row.rowId}.${field} must be false`);
    }
  }
  const expectedBlockers = ownerResponseConsumed ? [
    ["a22:", ["already-recorded"]],
    ["hold:", ["dry-run-ready-requires-explicit-apply", "already-recorded"]]
  ] : [
    ["a25:", ["dry-run-blocked-owner-approval-placeholders"]],
    ["a22:", ["dry-run-blocked-owner-approval-text", "already-recorded"]],
    ["hold:", ["dry-run-blocked-owner-confirmation-input", "dry-run-ready-requires-explicit-apply", "already-recorded"]]
  ];
  for (const [prefix, blockers] of expectedBlockers) {
    for (const row of rows.filter((candidate) => candidate.rowId.startsWith(prefix))) {
      if (!blockers.includes(row.blockingReason)) failures.push(`${row.rowId} blockingReason must be one of ${blockers.join(", ")}`);
    }
  }
  const a22Rows = rows.filter((row) => row.rowId.startsWith("a22:"));
  if (a22Rows.length === 4 && !a22Rows.some((row) => row.selectedAction === "reexport")) {
    failures.push("A22 rows must include the reexport selectedAction");
  }
  if (a22Rows.length === 4 && a22Rows.filter((row) => row.selectedAction === "same-path-copy").length !== 3) {
    failures.push("A22 rows must include three same-path-copy selectedActions");
  }
  const holdRow = rows.find((row) => row.rowId === "hold:validation-hold-release-confirmation");
  if (holdRow && holdRow.ownerConfirmationInputPresent !== true && !["dry-run-blocked-owner-confirmation-input"].includes(holdRow.blockingReason)) {
    failures.push("hold ownerConfirmationInputPresent must be true unless still blocked on missing confirmation input");
  }
  if (holdRow && holdRow.validationHoldReleased !== false) failures.push("hold validationHoldReleased must be false");

  if (boundary.evidenceOnly !== true) failures.push("boundary.evidenceOnly must be true");
  if (!allZeroOrFalse(boundary, [
    "recordsOwnerInputRows",
    "recordsAuthorizationRows",
    "recordsExtractionInstructionRows",
    "modifiesCandidateRows",
    "rootCopyRows",
    "validationHoldReleased",
    "cleanupAuthorized",
    "deployAuthorized",
    "mergeAuthorized",
    "broadStagingAuthorized",
    "destructiveGitAuthorized",
    "physicalLifecycleCleanupAuthorized",
    "executableNow"
  ])) {
    failures.push("boundary must keep all mutation/cleanup/deploy/merge/destructive flags false or zero");
  }

  for (const requiredCheck of [
    "sources-current",
    "ledger-row-counts-current-frontier",
    "post-response-plan-fail-closed",
    "owner-inputs-not-ready-yet",
    "validate-to-merge-still-blocked",
    "ledger-rows-non-executable"
  ]) {
    const row = checks.find((check) => check.id === requiredCheck);
    if (!row) failures.push(`missing check: ${requiredCheck}`);
    if (row && row.status !== "pass") failures.push(`check must pass: ${requiredCheck}`);
  }

  if (!markdown.includes("# A25/A22 Validate Frontier Owner Response Readiness Ledger")) failures.push("markdown missing title");
  if (!markdown.includes("This ledger is evidence-only")) failures.push("markdown missing evidence-only boundary");
  if (!ownerResponseConsumed && expectedA25RowIds.some((rowId) => !markdown.includes(rowId))) failures.push("markdown missing A25 row");
  if (!markdown.includes("a22:a06-visualization-back-to-top-import-parity")) failures.push("markdown missing A22 row");
  if (!markdown.includes("hold:validation-hold-release-confirmation")) failures.push("markdown missing hold row");
  if (markdown.includes("undefined")) failures.push("markdown contains undefined");

  return finish({
    failures,
    ledgerStatus: recorded.ledgerStatus,
    ownerResponseRows: summary.ownerResponseRows ?? 0,
    readyToRecordRows: summary.readyToRecordRows ?? 0,
    blockedRows: summary.blockedRows ?? 0,
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
    console.log("A25/A22 validate-frontier owner response readiness ledger gate");
    console.log(`Ledger status: ${payload.ledgerStatus ?? "missing"}`);
    console.log(`Owner response rows: ${payload.ownerResponseRows ?? 0}`);
    console.log(`Blocked rows: ${payload.blockedRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    if (!json) {
      console.error("A25/A22 validate-frontier owner response readiness ledger gate failed.");
      for (const failure of payload.failures) console.error(`- ${failure}`);
    }
    process.exit(1);
  }
}

main();
