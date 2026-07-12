#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_ACCEPTANCE_DOCKET_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  focusBatch: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch.json",
  canonicalAuthorizations: "coordination/release-intake/latest-A25-next-owner-authorizations.json",
  latestJson: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch-acceptance-docket.json",
  latestMarkdown: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch-acceptance-docket.md",
  datedJson: `coordination/release-intake/${date}-A25-next-owner-authorization-focus-batch-acceptance-docket.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-next-owner-authorization-focus-batch-acceptance-docket.md`
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

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content);
}

function count(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function sourceCurrentnessFailures({ dirtyMap, focusBatch, canonicalAuthorizations }) {
  const failures = [];
  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? 0;
  for (const [label, artifact] of [
    ["next owner authorization focus batch", focusBatch],
    ["canonical authorizations", canonicalAuthorizations]
  ]) {
    if (artifact.dirtyMapStatusSignature !== expectedSignature) failures.push(`${label} dirty-map signature is stale`);
    if (artifact.expandedStatusEntries !== expectedEntries) failures.push(`${label} expanded dirty entry count is stale`);
  }
  if ((focusBatch.sourceCurrentnessFailures ?? []).length > 0) {
    failures.push("next owner authorization focus batch has source currentness failures");
  }
  if (canonicalAuthorizations.cleanupAuthorized === true) failures.push("canonical authorizations must not be cleanup-authorized");
  if (canonicalAuthorizations.executableNow === true) failures.push("canonical authorizations must not be executable");
  return failures;
}

function byApprovalId(rows) {
  return new Map((rows ?? []).filter((row) => row.approvalId).map((row) => [row.approvalId, row]));
}

function acceptedByOwner(row, batchRow) {
  const expectedApprovalId = batchRow.approvalId;
  const generatedCleanup = batchRow.approvalKind === "a22-generated-artifact-residual-cleanup";
  const finalStateOrActionAccepted = generatedCleanup
    ? row?.selectedAction === batchRow.selectedAction
    : Boolean(row?.selectedFinalState);
  const commandAccepted = generatedCleanup
    ? row?.exactCommand === batchRow.exactCommand && row?.authorizationText?.includes(batchRow.exactCommand)
    : true;
  return Boolean(
    row &&
    row.approvalId === expectedApprovalId &&
    row.approvedBy &&
    row.approvedAt &&
    finalStateOrActionAccepted &&
    commandAccepted &&
    row.authorizationText?.includes(`approvalId=${expectedApprovalId}`) &&
    row.cleanupAuthorized !== true &&
    row.executableNow !== true
  );
}

function acceptanceRow(batchRow, canonicalRow) {
  const accepted = acceptedByOwner(canonicalRow, batchRow);
  return {
    approvalId: batchRow.approvalId,
    approvalKind: batchRow.approvalKind,
    owner: batchRow.owner,
    path: batchRow.path,
    sourceRoundId: batchRow.sourceRoundId,
    selectedAction: batchRow.selectedAction,
    exactCommand: batchRow.exactCommand,
    requiredAuthorizationText: batchRow.authorizationText,
    canonicalRowPresent: Boolean(canonicalRow),
    canonicalSelectedFinalState: canonicalRow?.selectedFinalState ?? "",
    canonicalSelectedAction: canonicalRow?.selectedAction ?? "",
    canonicalExactCommand: canonicalRow?.exactCommand ?? "",
    canonicalApprovedBy: canonicalRow?.approvedBy ?? "",
    canonicalApprovedAt: canonicalRow?.approvedAt ?? "",
    canonicalEvidenceReviewedRows: (canonicalRow?.evidenceReviewed ?? []).length,
    canonicalAuthorizationTextPresent: Boolean(canonicalRow?.authorizationText),
    accepted,
    pendingReason: accepted
      ? ""
      : canonicalRow
        ? "canonical row exists but owner approval fields are incomplete for this batch"
        : "canonical row is missing",
    cleanupAuthorized: canonicalRow?.cleanupAuthorized === true || batchRow.cleanupAuthorized === true,
    executableNow: canonicalRow?.executableNow === true || batchRow.executableNow === true
  };
}

export function buildNextOwnerAuthorizationFocusBatchAcceptanceDocket() {
  const dirtyMap = readJson(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_ACCEPTANCE_DOCKET_PATHS.dirtyMap);
  const focusBatch = readJson(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_ACCEPTANCE_DOCKET_PATHS.focusBatch);
  const canonicalAuthorizations = readJson(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_ACCEPTANCE_DOCKET_PATHS.canonicalAuthorizations);
  const sourceFailures = sourceCurrentnessFailures({ dirtyMap, focusBatch, canonicalAuthorizations });
  const canonicalByApprovalId = byApprovalId(canonicalAuthorizations.authorizations ?? []);
  const rows = (focusBatch.nextBatchRows ?? []).map((row) => acceptanceRow(row, canonicalByApprovalId.get(row.approvalId)));
  const acceptedRows = rows.filter((row) => row.accepted);
  const pendingRows = rows.filter((row) => !row.accepted);
  const cleanupAuthorizedRows = rows.filter((row) => row.cleanupAuthorized).length;
  const executableRows = rows.filter((row) => row.executableNow).length;
  const status = rows.length === 0
    ? "no-focus-batch"
    : pendingRows.length === 0
      ? "batch-authorized-non-executable"
      : "waiting-for-owner-authorization";

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? 0,
    sourceArtifacts: {
      focusBatchGeneratedAt: focusBatch.generatedAt,
      canonicalAuthorizationsGeneratedAt: canonicalAuthorizations.generatedAt
    },
    sourceCurrentnessFailures: sourceFailures,
    batchId: focusBatch.batchPolicy?.batchId ?? "",
    batchStatus: status,
    focusBatchPolicy: focusBatch.batchPolicy,
    acceptanceRows: rows,
    heldRows: focusBatch.heldRows ?? [],
    heldPolicyApprovalIds: focusBatch.batchPolicy?.heldApprovalIds ?? [],
    nextValidationCommands: focusBatch.validationAfterOwnerInput ?? [],
    deferredAggregateValidationCommands: focusBatch.deferredAggregateValidationCommands ?? [],
    summary: {
      focusBatchRows: rows.length,
      acceptedRows: acceptedRows.length,
      pendingRows: pendingRows.length,
      heldRows: (focusBatch.heldRows ?? []).length,
      pendingCanonicalAuthorizationRows: count(focusBatch.summary?.pendingCanonicalAuthorizationRows),
      cleanupAuthorizedRows,
      executableRows,
      sourceCurrentnessFailures: sourceFailures.length
    },
    boundary: {
      evidenceOnly: true,
      createsAuthorizationFile: false,
      recordsOwnerApproval: false,
      recordsExecutionInstruction: false,
      mergeAuthorized: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false
    }
  };
}

export function stableNextOwnerAuthorizationFocusBatchAcceptanceDocketProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    batchId: payload.batchId,
    batchStatus: payload.batchStatus,
    focusBatchPolicy: payload.focusBatchPolicy,
    acceptanceRows: payload.acceptanceRows,
    heldRows: payload.heldRows,
    heldPolicyApprovalIds: payload.heldPolicyApprovalIds,
    nextValidationCommands: payload.nextValidationCommands,
    deferredAggregateValidationCommands: payload.deferredAggregateValidationCommands,
    summary: payload.summary,
    boundary: payload.boundary
  };
}

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function bullet(items) {
  const rows = (items ?? []).filter(Boolean);
  return rows.length > 0 ? rows.map((item) => `- ${item}`).join("\n") : "- none";
}

function markdown(payload) {
  const rows = payload.acceptanceRows.map((row, index) => (
    `| ${index + 1} | \`${cell(row.approvalId)}\` | ${cell(row.owner)} | ${row.canonicalRowPresent ? "yes" : "no"} | ${row.accepted ? "yes" : "no"} | ${cell(row.pendingReason)} |`
  )).join("\n");

  return `# A25 Next Owner Authorization Focus Batch Acceptance Docket

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This docket is evidence-only. It checks whether the current owner authorization focus batch has been recorded in the canonical owner authorization input. It does not write owner approval, record execution instruction, authorize merge, authorize cleanup, stage, commit, clean, reset, remove worktrees, delete files, push, or deploy.

## Summary

- Batch ID: \`${payload.batchId}\`
- Batch status: \`${payload.batchStatus}\`
- Focus batch rows: ${payload.summary.focusBatchRows}
- Accepted rows: ${payload.summary.acceptedRows}
- Pending rows: ${payload.summary.pendingRows}
- Held rows: ${payload.summary.heldRows}
- Held policy rows: ${payload.heldPolicyApprovalIds.length}
- Pending canonical authorization rows: ${payload.summary.pendingCanonicalAuthorizationRows}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}
- Source currentness failures: ${payload.summary.sourceCurrentnessFailures}

## Acceptance Rows

| # | Approval ID | Owner | Canonical row | Accepted | Pending reason |
| ---: | --- | --- | --- | --- | --- |
${rows}

## Held Rows

${bullet(payload.heldRows.map((row) => `\`${row.approvalId}\` - ${row.path}`))}

## Held Policy Approval IDs

${bullet(payload.heldPolicyApprovalIds.map((approvalId) => `\`${approvalId}\``))}

## Next Validation Commands

${bullet(payload.nextValidationCommands.map((command) => `\`${command}\``))}

## Deferred Aggregate Validation Commands

${bullet(payload.deferredAggregateValidationCommands.map((command) => `\`${command}\``))}

## Boundary

Even when every row is accepted, this docket remains non-executable. Cleanup and merge still require separate validated execution instructions and owner-approved Git operations.
`;
}

function main() {
  const payload = buildNextOwnerAuthorizationFocusBatchAcceptanceDocket();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_ACCEPTANCE_DOCKET_PATHS.latestJson, json);
  write(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_ACCEPTANCE_DOCKET_PATHS.datedJson, json);
  write(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_ACCEPTANCE_DOCKET_PATHS.latestMarkdown, md);
  write(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_ACCEPTANCE_DOCKET_PATHS.datedMarkdown, md);

  console.log(JSON.stringify({
    latestJson: NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_ACCEPTANCE_DOCKET_PATHS.latestJson,
    latestMarkdown: NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_ACCEPTANCE_DOCKET_PATHS.latestMarkdown,
    batchStatus: payload.batchStatus,
    focusBatchRows: payload.summary.focusBatchRows,
    acceptedRows: payload.summary.acceptedRows,
    pendingRows: payload.summary.pendingRows,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
