#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_CANONICAL_PREVIEW_PATHS,
  buildNextOwnerAuthorizationFocusBatchCanonicalPreview,
  stableNextOwnerAuthorizationFocusBatchCanonicalPreviewProjection
} from "./generate-next-owner-authorization-focus-batch-canonical-preview.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-next-owner-authorization-focus-batch-canonical-preview-current-gate.json");
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
    NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_CANONICAL_PREVIEW_PATHS.latestJson,
    NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_CANONICAL_PREVIEW_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const recorded = readJson(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_CANONICAL_PREVIEW_PATHS.latestJson);
  const current = buildNextOwnerAuthorizationFocusBatchCanonicalPreview();
  if (!sameJson(
    stableNextOwnerAuthorizationFocusBatchCanonicalPreviewProjection(recorded),
    stableNextOwnerAuthorizationFocusBatchCanonicalPreviewProjection(current)
  )) {
    failures.push("A25 next-owner authorization focus batch canonical preview is stale");
  }

  const summary = recorded.summary ?? {};
  const rows = recorded.previewRows ?? [];
  const checks = recorded.checks ?? [];
  const boundary = recorded.boundary ?? {};
  const batchRequest = recorded.batchAuthorizationRequest ?? {};
  const allowedStatuses = ["ready-for-owner-review", "no-pending-focus-rows"];
  if (!allowedStatuses.includes(recorded.previewStatus)) {
    failures.push(`previewStatus must be an allowed evidence-only status; got ${recorded.previewStatus}`);
  }
  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures list must be empty");
  if ((summary.sourceCurrentnessFailures ?? 0) !== 0) failures.push("summary.sourceCurrentnessFailures must be 0");
  if ((summary.cleanupAuthorizedRows ?? 0) !== 0) failures.push("cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? 0) !== 0) failures.push("executableRows must be 0");
  if ((summary.previewRows ?? 0) !== rows.length) failures.push("previewRows summary must match previewRows length");
  if ((summary.pendingRows ?? 0) > 0 && (summary.previewRows ?? 0) !== (summary.pendingRows ?? 0)) {
    failures.push("every pending focus row must have a preview row");
  }
  if ((summary.missingDraftRows ?? 0) !== 0) failures.push("missingDraftRows must be 0");
  if ((summary.missingLedgerRows ?? 0) !== 0) failures.push("missingLedgerRows must be 0");
  if ((summary.unsafeRows ?? 0) !== 0) failures.push("unsafeRows must be 0");

  for (const [key, expected] of [
    ["evidenceOnly", true],
    ["createsAuthorizationFile", false],
    ["recordsOwnerApproval", false],
    ["promotesCanonicalRows", false],
    ["recordsExecutionInstruction", false],
    ["mergeAuthorized", false],
    ["cleanupAuthorized", false],
    ["executableNow", false],
    ["destructiveGitAuthorized", false],
    ["deployAuthorized", false]
  ]) {
    if (boundary[key] !== expected) failures.push(`boundary.${key} must be ${expected}`);
  }

  if ((summary.pendingRows ?? 0) > 0) {
    if (batchRequest.pendingRows !== rows.length) failures.push("batchAuthorizationRequest.pendingRows must match preview rows");
    if ((batchRequest.approvalIds ?? []).length !== rows.length) failures.push("batchAuthorizationRequest approvalIds must cover every preview row");
    if (batchRequest.targetFile !== NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_CANONICAL_PREVIEW_PATHS.canonicalAuthorizations) {
      failures.push("batchAuthorizationRequest target file must match canonical authorizations");
    }
    if (batchRequest.everyRowReviewedCommit !== true) failures.push("batchAuthorizationRequest must confirm every row is reviewed commit");
    for (const row of rows) {
      if (!(batchRequest.approvalIds ?? []).includes(row.approvalId)) {
        failures.push(`batchAuthorizationRequest missing approvalId ${row.approvalId}`);
      }
      if (!batchRequest.copyableApprovalText?.includes(row.approvalId)) {
        failures.push(`batchAuthorizationRequest copyable approval text must include ${row.approvalId}`);
      }
      if (!batchRequest.copyableOwnerReplyTextZh?.includes(row.approvalId)) {
        failures.push(`batchAuthorizationRequest Chinese owner reply text must include ${row.approvalId}`);
      }
    }
    for (const requiredText of [
      "selectedFinalState=reviewed commit for every row",
      "do not authorize cleanup",
      "do not authorize deploy",
      "do not authorize merge",
      "do not authorize destructive Git",
      "do not authorize physical lifecycle cleanup"
    ]) {
      if (!batchRequest.copyableApprovalText?.includes(requiredText)) {
        failures.push(`batchAuthorizationRequest copyable approval text missing: ${requiredText}`);
      }
    }
    for (const requiredText of [
      "selectedFinalState=reviewed commit",
      "不授权 cleanup",
      "不授权 deploy",
      "不授权 merge",
      "不授权 destructive git",
      "不授权 physical lifecycle cleanup"
    ]) {
      if (!batchRequest.copyableOwnerReplyTextZh?.includes(requiredText)) {
        failures.push(`batchAuthorizationRequest Chinese owner reply text missing: ${requiredText}`);
      }
    }
    const batchBoundary = batchRequest.boundary ?? {};
    for (const [key, expected] of [
      ["recordsAuthorizationOnlyAfterExplicitOwnerReply", true],
      ["cleanupAuthorized", false],
      ["deployAuthorized", false],
      ["mergeAuthorized", false],
      ["destructiveGitAuthorized", false],
      ["physicalCleanupAuthorized", false],
      ["executableNow", false]
    ]) {
      if (batchBoundary[key] !== expected) failures.push(`batchAuthorizationRequest.boundary.${key} must be ${expected}`);
    }
  }

  for (const row of rows) {
    const preview = row.previewAuthorizationRow ?? {};
    if (row.approvalKind !== "owner-package") failures.push(`${row.approvalId}: preview currently supports owner-package rows only`);
    if (row.canonicalRowPresent === true) failures.push(`${row.approvalId}: preview row must not already be canonical accepted`);
    if (row.canonicalDraftRowPresent !== true) failures.push(`${row.approvalId}: canonical draft row must be present`);
    if (row.ledgerSelectedFinalState !== "reviewed commit") failures.push(`${row.approvalId}: ledgerSelectedFinalState must be reviewed commit`);
    if (!String(row.ledgerDecisionStatus ?? "").startsWith("approved-")) failures.push(`${row.approvalId}: ledgerDecisionStatus must be approved`);
    if (preview.approvalId !== row.approvalId) failures.push(`${row.approvalId}: preview authorization row must preserve approvalId`);
    if (preview.selectedFinalState !== row.ledgerSelectedFinalState) failures.push(`${row.approvalId}: preview selectedFinalState must match ledger`);
    if (preview.approvedBy !== "<owner>") failures.push(`${row.approvalId}: preview approvedBy must remain placeholder`);
    if (preview.approvedAt !== "<ISO-8601>") failures.push(`${row.approvalId}: preview approvedAt must remain placeholder`);
    if (preview.cleanupAuthorized !== false) failures.push(`${row.approvalId}: preview cleanupAuthorized must be false`);
    if (preview.executableNow !== false) failures.push(`${row.approvalId}: preview executableNow must be false`);
    if (!preview.authorizationText?.includes(`approvalId=${row.approvalId}`)) failures.push(`${row.approvalId}: authorizationText must name approvalId`);
    if (!preview.authorizationText?.includes("approvedBy=<owner>")) failures.push(`${row.approvalId}: authorizationText must preserve owner placeholder`);
    if (!preview.authorizationText?.includes("approvedAt=<ISO-8601>")) failures.push(`${row.approvalId}: authorizationText must preserve approvedAt placeholder`);
    if ((preview.evidenceReviewed ?? []).length < 4) failures.push(`${row.approvalId}: preview evidenceReviewed must include source artifacts`);
    if ((row.requiredOwnerFieldsStillPlaceholders ?? []).join(",") !== "approvedBy,approvedAt") {
      failures.push(`${row.approvalId}: requiredOwnerFieldsStillPlaceholders must list approvedBy,approvedAt`);
    }
    if (row.cleanupAuthorized === true || row.executableNow === true) failures.push(`${row.approvalId}: preview row must be non-executable`);
  }

  for (const check of checks) {
    if (check.status !== "pass") failures.push(`check ${check.id} must pass`);
  }

  const markdown = readText(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_CANONICAL_PREVIEW_PATHS.latestMarkdown);
  for (const needle of [
    "A25 Next Owner Authorization Focus Batch Canonical Preview",
    "This preview is evidence-only",
    "Batch Authorization Text",
    "Copyable owner approval text",
    "Copyable owner reply text (Chinese)",
    "Canonical Row Preview JSON",
    "owner placeholders",
    "Merge and cleanup remain blocked"
  ]) {
    if (!markdown.includes(needle)) failures.push(`canonical preview markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("canonical preview markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    previewStatus: recorded.previewStatus,
    focusBatchRows: summary.focusBatchRows ?? 0,
    pendingRows: summary.pendingRows ?? 0,
    previewRows: summary.previewRows ?? 0,
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
    console.log("A25 next-owner authorization focus batch canonical preview gate");
    console.log(`Preview status: ${payload.previewStatus ?? "unknown"}`);
    console.log(`Preview rows: ${payload.previewRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 next-owner authorization focus batch canonical preview gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
