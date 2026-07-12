#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_ACCEPTANCE_DOCKET_PATHS,
  buildNextOwnerAuthorizationFocusBatchAcceptanceDocket,
  stableNextOwnerAuthorizationFocusBatchAcceptanceDocketProjection
} from "./generate-next-owner-authorization-focus-batch-acceptance-docket.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-next-owner-authorization-focus-batch-acceptance-docket-current-gate.json");
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

function isAllowedGeneratedCleanupCommand(row) {
  if (row.exactCommand === "node scripts/cleanup-generated-artifacts.mjs --apply --scope all") return true;
  return /^git clean -fdX -- \.s11-parent-audit-next[0-9]+$/.test(row.exactCommand ?? "");
}

function main() {
  const failures = [];
  for (const requiredPath of [
    NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_ACCEPTANCE_DOCKET_PATHS.latestJson,
    NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_ACCEPTANCE_DOCKET_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const recorded = readJson(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_ACCEPTANCE_DOCKET_PATHS.latestJson);
  const focusBatch = readJson(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_ACCEPTANCE_DOCKET_PATHS.focusBatch);
  const current = buildNextOwnerAuthorizationFocusBatchAcceptanceDocket();
  if (!sameJson(stableNextOwnerAuthorizationFocusBatchAcceptanceDocketProjection(recorded), stableNextOwnerAuthorizationFocusBatchAcceptanceDocketProjection(current))) {
    failures.push("A25 next-owner authorization focus batch acceptance docket is stale");
  }

  const summary = recorded.summary ?? {};
  const boundary = recorded.boundary ?? {};
  const rows = recorded.acceptanceRows ?? [];
  const selectedRoundId = focusBatch.batchPolicy?.selectedRoundId ?? "";
  const generatedArtifactFocus = selectedRoundId === "a22-generated-artifact-residual-cleanup-authorizations";
  const ownerPackageFocus = selectedRoundId === "remaining-owner-package-final-states";
  const expectedBatchRows = (focusBatch.nextBatchRows ?? []).length;
  const heldPolicyApprovalIds = focusBatch.batchPolicy?.heldApprovalIds ?? [];

  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures list must be empty");
  if ((summary.sourceCurrentnessFailures ?? 0) !== 0) failures.push("summary.sourceCurrentnessFailures must be 0");
  if ((summary.focusBatchRows ?? 0) !== (focusBatch.nextBatchRows ?? []).length) failures.push("focusBatchRows must match focus batch nextBatchRows");
  if ((summary.focusBatchRows ?? 0) !== rows.length) failures.push("focusBatchRows must match acceptanceRows length");
  if (!generatedArtifactFocus && !ownerPackageFocus) failures.push(`unsupported selectedRoundId: ${selectedRoundId}`);
  if (rows.length !== expectedBatchRows) failures.push(`acceptance docket must track ${expectedBatchRows} rows for ${selectedRoundId}`);
  if ((summary.acceptedRows ?? 0) + (summary.pendingRows ?? 0) !== rows.length) {
    failures.push("acceptedRows + pendingRows must equal acceptanceRows length");
  }
  if ((summary.heldRows ?? 0) !== (recorded.heldRows ?? []).length) failures.push("heldRows summary must match heldRows length");
  if ((summary.heldRows ?? 0) !== (focusBatch.heldRows ?? []).length) failures.push("heldRows must match focus batch dynamic held rows");
  if (!sameJson(recorded.heldPolicyApprovalIds, heldPolicyApprovalIds)) {
    failures.push("heldPolicyApprovalIds must match focus batch held policy IDs");
  }
  if (!sameJson(heldPolicyApprovalIds, ["wave01-resync-01-tsconfig-json"])) {
    failures.push("held policy must preserve only wave01-resync-01-tsconfig-json");
  }
  if ((summary.cleanupAuthorizedRows ?? 0) !== 0) failures.push("cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? 0) !== 0) failures.push("executableRows must be 0");
  if (!["waiting-for-owner-authorization", "batch-authorized-non-executable", "no-focus-batch"].includes(recorded.batchStatus)) {
    failures.push("batchStatus must be a recognized non-executable state");
  }
  if (summary.pendingRows > 0 && recorded.batchStatus !== "waiting-for-owner-authorization") {
    failures.push("batchStatus must wait while rows are pending");
  }
  if (summary.pendingRows === 0 && rows.length > 0 && recorded.batchStatus !== "batch-authorized-non-executable") {
    failures.push("batchStatus must become batch-authorized-non-executable when all rows are accepted");
  }
  if (rows.length === 0 && recorded.batchStatus !== "no-focus-batch") {
    failures.push("zero-row focus batch must use no-focus-batch status");
  }

  for (const [key, expected] of [
    ["evidenceOnly", true],
    ["createsAuthorizationFile", false],
    ["recordsOwnerApproval", false],
    ["recordsExecutionInstruction", false],
    ["mergeAuthorized", false],
    ["cleanupAuthorized", false],
    ["executableNow", false],
    ["destructiveGitAuthorized", false],
    ["deployAuthorized", false]
  ]) {
    if (boundary[key] !== expected) failures.push(`boundary.${key} must be ${expected}`);
  }

  for (const row of rows) {
    if (row.sourceRoundId !== selectedRoundId) failures.push(`${row.approvalId}: sourceRoundId must be ${selectedRoundId}`);
    if (ownerPackageFocus && row.approvalKind !== "owner-package") failures.push(`${row.approvalId}: approvalKind must be owner-package`);
    if (generatedArtifactFocus && row.approvalKind !== "a22-generated-artifact-residual-cleanup") {
      failures.push(`${row.approvalId}: approvalKind must be a22-generated-artifact-residual-cleanup`);
    }
    if (row.cleanupAuthorized === true) failures.push(`${row.approvalId}: cleanupAuthorized must be false`);
    if (row.executableNow === true) failures.push(`${row.approvalId}: executableNow must be false`);
    if (!row.requiredAuthorizationText?.includes(`approvalId=${row.approvalId}`)) {
      failures.push(`${row.approvalId}: requiredAuthorizationText must name the approval ID`);
    }
    if (ownerPackageFocus && row.accepted && (!row.canonicalApprovedBy || !row.canonicalApprovedAt || !row.canonicalSelectedFinalState)) {
      failures.push(`${row.approvalId}: accepted rows must include owner approval fields`);
    }
    if (generatedArtifactFocus && row.accepted && (!row.canonicalApprovedBy || !row.canonicalApprovedAt || row.canonicalSelectedAction !== row.selectedAction || row.canonicalExactCommand !== row.exactCommand)) {
      failures.push(`${row.approvalId}: accepted generated cleanup rows must include owner approval fields, selected action, and exact command`);
    }
    if (generatedArtifactFocus && !isAllowedGeneratedCleanupCommand(row)) {
      failures.push(`${row.approvalId}: generated cleanup row must carry an allowed A22 generated-artifact cleanup command`);
    }
  }

  const markdown = readText(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_ACCEPTANCE_DOCKET_PATHS.latestMarkdown);
  for (const needle of [
    "A25 Next Owner Authorization Focus Batch Acceptance Docket",
    "This docket is evidence-only",
    "Acceptance Rows",
    "Batch status",
    recorded.batchStatus,
    "Even when every row is accepted",
    "Held Policy Approval IDs",
    "wave01-resync-01-tsconfig-json"
  ]) {
    if (!markdown.includes(needle)) failures.push(`acceptance docket markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("acceptance docket markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    selectedRoundId,
    batchStatus: recorded.batchStatus,
    focusBatchRows: summary.focusBatchRows ?? 0,
    acceptedRows: summary.acceptedRows ?? 0,
    pendingRows: summary.pendingRows ?? 0,
    heldRows: summary.heldRows ?? 0,
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
    console.log("A25 next-owner authorization focus batch acceptance docket gate");
    console.log(`Batch status: ${payload.batchStatus ?? "unknown"}`);
    console.log(`Accepted rows: ${payload.acceptedRows ?? 0}/${payload.focusBatchRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }

  if (payload.failures.length > 0) {
    console.error("A25 next-owner authorization focus batch acceptance docket gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
