#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  authorizationGapShrinkMap: "coordination/release-intake/latest-A25-authorization-gap-shrink-map.json",
  canonicalAuthorizations: "coordination/release-intake/latest-A25-next-owner-authorizations.json",
  finalStateLedger: "coordination/release-intake/latest-A25-dirty-worktree-final-state-ledger.json",
  latestJson: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch.json",
  latestMarkdown: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch.md",
  datedJson: `coordination/release-intake/${date}-A25-next-owner-authorization-focus-batch.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-next-owner-authorization-focus-batch.md`
};

const HOLD_APPROVAL_IDS = new Set(["wave01-resync-01-tsconfig-json"]);
const OWNER_PACKAGE_BATCH_SIZE = 5;
const OWNER_PACKAGE_ROUND_ID = "remaining-owner-package-final-states";
const GENERATED_ARTIFACT_ROUND_ID = "a22-generated-artifact-residual-cleanup-authorizations";

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

function byApprovalId(rows) {
  return new Map((rows ?? []).filter((row) => row.approvalId).map((row) => [row.approvalId, row]));
}

function sourceCurrentnessFailures({ dirtyMap, shrinkMap, canonicalAuthorizations, finalStateLedger }) {
  const failures = [];
  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? 0;
  for (const [label, artifact] of [
    ["authorization gap shrink map", shrinkMap],
    ["canonical authorizations", canonicalAuthorizations],
    ["final-state ledger", finalStateLedger]
  ]) {
    if (artifact.dirtyMapStatusSignature !== expectedSignature) failures.push(`${label} dirty-map signature is stale`);
    if (artifact.expandedStatusEntries !== expectedEntries) failures.push(`${label} expanded dirty entry count is stale`);
  }
  if ((shrinkMap.sourceCurrentnessFailures ?? []).length > 0) {
    failures.push("authorization gap shrink map has source currentness failures");
  }
  if (canonicalAuthorizations.cleanupAuthorized === true) failures.push("canonical authorizations must not be cleanup-authorized");
  if (canonicalAuthorizations.executableNow === true) failures.push("canonical authorizations must not be executable");
  return failures;
}

function rowIsAuthorized(row) {
  return Boolean(row.authorized || row.approvedBy || row.approvedAt || row.selectedFinalState || row.cleanupAuthorized === true || row.executableNow === true);
}

function ownerPackageAuthorizationText(row, ledgerRow) {
  if (row.approvalKind !== "owner-package" || !ledgerRow?.selectedFinalState) return row.authorizationText ?? "";
  const evidence = [
    ...(ledgerRow.selectionEvidenceLinks ?? []),
    ...(ledgerRow.evidenceLinks ?? []),
    ...(row.evidenceReviewed ?? [])
  ].filter(Boolean);
  const uniqueEvidence = [...new Set(evidence)];
  return [
    `Authorize approvalId=${row.approvalId} for owner=${row.owner}`,
    `selectedFinalState=${ledgerRow.selectedFinalState}`,
    `evidenceReviewed=${uniqueEvidence.join(", ")}`,
    "approvedBy=<owner>",
    "approvedAt=<ISO-8601>",
    "notes=<scope and checks>"
  ].join("; ") + ".";
}

function compactRow(row, round, ledgerByApprovalId) {
  const ledgerRow = ledgerByApprovalId.get(row.approvalId) ?? null;
  const ledgerSelectedFinalState = ledgerRow?.selectedFinalState ?? "";
  const authorizationText = ownerPackageAuthorizationText(row, ledgerRow);
  return {
    approvalId: row.approvalId,
    approvalKind: row.approvalKind,
    owner: row.owner,
    subject: row.subject,
    path: row.path,
    branch: row.branch ?? "",
    worktreePath: row.worktreePath ?? "",
    selectedFinalState: row.selectedFinalState || ledgerSelectedFinalState,
    ledgerSelectedFinalState,
    ledgerDecisionStatus: ledgerRow?.decisionStatus ?? "",
    selectedAction: row.selectedAction ?? "",
    exactCommand: row.exactCommand ?? "",
    authorizationText,
    evidenceReviewed: row.evidenceReviewed ?? [],
    postApprovalChecks: row.postApprovalChecks ?? [],
    sourceRoundId: round.id,
    sourceRoundLabel: round.label,
    authorized: rowIsAuthorized(row),
    held: HOLD_APPROVAL_IDS.has(row.approvalId),
    cleanupAuthorized: row.cleanupAuthorized === true,
    executableNow: row.executableNow === true
  };
}

function roundById(shrinkMap, roundId) {
  return (shrinkMap.rounds ?? []).find((round) => round.id === roundId) ?? null;
}

function pendingRows(round, ledgerByApprovalId = new Map()) {
  return (round?.rows ?? [])
    .map((row) => compactRow(row, round, ledgerByApprovalId))
    .filter((row) => !row.authorized);
}

function buildRoundSummary(round, ledgerByApprovalId) {
  const rows = pendingRows(round, ledgerByApprovalId);
  return {
    id: round?.id ?? "",
    label: round?.label ?? "",
    pendingRows: rows.length,
    heldRows: rows.filter((row) => row.held).length,
    selectableRows: rows.filter((row) => !row.held).length,
    cleanupAuthorizedRows: rows.filter((row) => row.cleanupAuthorized).length,
    executableRows: rows.filter((row) => row.executableNow).length,
    sampleApprovalIds: rows.slice(0, 8).map((row) => row.approvalId)
  };
}

export function buildNextOwnerAuthorizationFocusBatch() {
  const dirtyMap = readJson(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_PATHS.dirtyMap);
  const shrinkMap = readJson(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_PATHS.authorizationGapShrinkMap);
  const canonicalAuthorizations = readJson(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_PATHS.canonicalAuthorizations);
  const finalStateLedger = readJson(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_PATHS.finalStateLedger);
  const sourceFailures = sourceCurrentnessFailures({ dirtyMap, shrinkMap, canonicalAuthorizations, finalStateLedger });
  const ledgerByApprovalId = byApprovalId(finalStateLedger.entries ?? []);

  const wave01Round = roundById(shrinkMap, "wave01-package-resync-authorizations");
  const ownerPackageRound = roundById(shrinkMap, OWNER_PACKAGE_ROUND_ID);
  const physicalRound = roundById(shrinkMap, "remaining-physical-lifecycle-final-states");
  const generatedRound = roundById(shrinkMap, GENERATED_ARTIFACT_ROUND_ID);

  const heldRows = pendingRows(wave01Round, ledgerByApprovalId).filter((row) => row.held);
  const selectableOwnerPackageRows = pendingRows(ownerPackageRound, ledgerByApprovalId).filter((row) => !row.held);
  const selectableGeneratedArtifactRows = pendingRows(generatedRound, ledgerByApprovalId).filter((row) => !row.held);
  const preferGeneratedArtifactCleanup = false;
  const selectedRoundId = preferGeneratedArtifactCleanup ? GENERATED_ARTIFACT_ROUND_ID : OWNER_PACKAGE_ROUND_ID;
  const selectedBatchId = preferGeneratedArtifactCleanup
    ? "a22-generated-artifact-residual-cleanup-batch-01"
    : "next-owner-package-final-state-batch-01";
  const selectedBatchSize = preferGeneratedArtifactCleanup ? selectableGeneratedArtifactRows.length : OWNER_PACKAGE_BATCH_SIZE;
  const nextBatchRows = preferGeneratedArtifactCleanup
    ? selectableGeneratedArtifactRows
    : selectableOwnerPackageRows.slice(0, OWNER_PACKAGE_BATCH_SIZE);
  const deferredOwnerPackageRows = preferGeneratedArtifactCleanup
    ? selectableOwnerPackageRows
    : selectableOwnerPackageRows.slice(OWNER_PACKAGE_BATCH_SIZE);
  const deferredGeneratedArtifactRows = preferGeneratedArtifactCleanup
    ? []
    : selectableGeneratedArtifactRows;
  const deferredRows = [...deferredOwnerPackageRows, ...deferredGeneratedArtifactRows];

  const roundSummaries = [wave01Round, ownerPackageRound, physicalRound, generatedRound]
    .filter(Boolean)
    .map((round) => buildRoundSummary(round, ledgerByApprovalId));
  const cleanupAuthorizedRows = nextBatchRows.filter((row) => row.cleanupAuthorized).length;
  const executableRows = nextBatchRows.filter((row) => row.executableNow).length;

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? 0,
    sourceArtifacts: {
      authorizationGapShrinkMapGeneratedAt: shrinkMap.generatedAt,
      canonicalAuthorizationsGeneratedAt: canonicalAuthorizations.generatedAt,
      finalStateLedgerGeneratedAt: finalStateLedger.generatedAt
    },
    sourceCurrentnessFailures: sourceFailures,
    batchPolicy: {
      batchId: selectedBatchId,
      batchSize: selectedBatchSize,
      selectedRoundId,
      reason: preferGeneratedArtifactCleanup
        ? "A22 generated-artifact residual cleanup rows are ready for owner decision and directly unblock the cleanup leg before broader owner-package final states."
        : "Owner-package final-state rows are the next reviewable non-executable layer after Wave01 artifact-clean authorization and A16 post-extraction verification.",
      heldApprovalIds: Array.from(HOLD_APPROVAL_IDS),
      excludedRoundIds: preferGeneratedArtifactCleanup
        ? [
            OWNER_PACKAGE_ROUND_ID,
            "remaining-physical-lifecycle-final-states"
          ]
        : [
            "remaining-physical-lifecycle-final-states",
            GENERATED_ARTIFACT_ROUND_ID
          ],
      selectedForCleanupAuthorization: preferGeneratedArtifactCleanup
    },
    heldRows,
    nextBatchRows,
    deferredRows: deferredRows.map((row) => ({
      approvalId: row.approvalId,
      approvalKind: row.approvalKind,
      owner: row.owner,
      subject: row.subject,
      path: row.path,
      sourceRoundId: row.sourceRoundId
    })),
    roundSummaries,
    validationAfterOwnerInput: shrinkMap.safePostInputValidationCommands ?? [],
    deferredAggregateValidationCommands: shrinkMap.deferredAggregateValidationCommands ?? [],
    summary: {
      pendingCanonicalAuthorizationRows: count(shrinkMap.summary?.pendingCanonicalAuthorizationRows),
      authorizedCanonicalRows: count(shrinkMap.summary?.authorizedCanonicalRows),
      heldRows: heldRows.length,
      nextBatchRows: nextBatchRows.length,
      nextBatchOwnerRows: Array.from(new Set(nextBatchRows.map((row) => row.owner))).length,
      nextBatchCleanupRows: nextBatchRows.filter((row) => row.approvalKind === "a22-generated-artifact-residual-cleanup").length,
      deferredOwnerPackageRows: deferredOwnerPackageRows.length,
      physicalLifecycleRowsDeferred: count(physicalRound?.pendingRows),
      generatedArtifactRowsDeferred: deferredGeneratedArtifactRows.length,
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

export function stableNextOwnerAuthorizationFocusBatchProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    batchPolicy: payload.batchPolicy,
    heldRows: payload.heldRows,
    nextBatchRows: payload.nextBatchRows,
    deferredRows: payload.deferredRows,
    roundSummaries: payload.roundSummaries,
    validationAfterOwnerInput: payload.validationAfterOwnerInput,
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
  const batchRows = payload.nextBatchRows.map((row, index) => (
    `| ${index + 1} | \`${cell(row.approvalId)}\` | ${cell(row.owner)} | \`${cell(row.path)}\` | ${cell(row.ledgerSelectedFinalState || row.selectedFinalState || "none")} | ${cell(row.selectedAction)} | ${row.exactCommand ? `\`${cell(row.exactCommand)}\`` : "none"} |`
  )).join("\n");
  const roundRows = payload.roundSummaries.map((row) => (
    `| \`${cell(row.id)}\` | ${cell(row.label)} | ${row.pendingRows} | ${row.heldRows} | ${row.selectableRows} | ${row.executableRows} |`
  )).join("\n");
  const authorizationRows = payload.nextBatchRows.map((row, index) => `### ${index + 1}. ${row.approvalId}

\`\`\`text
${row.authorizationText}
\`\`\`

Evidence to review:
${bullet(row.evidenceReviewed.map((item) => `\`${item}\``))}

Post-approval checks:
${bullet(row.postApprovalChecks.map((item) => `\`${item}\``))}
`).join("\n");

  return `# A25 Next Owner Authorization Focus Batch

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This packet is evidence-only. It selects the next small owner-review batch from pending canonical authorization rows, but it does not write owner approval, create authorization, record execution instruction, authorize merge, authorize cleanup, make commands executable, stage, commit, clean, reset, remove worktrees, delete files, push, or deploy.

## Summary

- Pending canonical authorization rows: ${payload.summary.pendingCanonicalAuthorizationRows}
- Authorized canonical rows: ${payload.summary.authorizedCanonicalRows}
- Held rows: ${payload.summary.heldRows}
- Next batch rows: ${payload.summary.nextBatchRows}
- Next batch cleanup rows: ${payload.summary.nextBatchCleanupRows}
- Deferred owner-package rows: ${payload.summary.deferredOwnerPackageRows}
- Physical lifecycle rows deferred: ${payload.summary.physicalLifecycleRowsDeferred}
- Generated artifact rows deferred: ${payload.summary.generatedArtifactRowsDeferred}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}
- Source currentness failures: ${payload.summary.sourceCurrentnessFailures}

## Batch Policy

- Batch ID: \`${payload.batchPolicy.batchId}\`
- Selected round: \`${payload.batchPolicy.selectedRoundId}\`
- Reason: ${payload.batchPolicy.reason}
- Held approval IDs:
${bullet(payload.batchPolicy.heldApprovalIds.map((id) => `\`${id}\``))}
- Excluded rounds:
${bullet(payload.batchPolicy.excludedRoundIds.map((id) => `\`${id}\``))}

## Round Status

| Round ID | Label | Pending | Held | Selectable | Executable |
| --- | --- | ---: | ---: | ---: | ---: |
${roundRows}

## Next Batch Rows

| # | Approval ID | Owner | Path | Final state | Selected action | Exact command |
| ---: | --- | --- | --- | --- | --- | --- |
${batchRows}

## Authorization Text To Review

These snippets are review text for the canonical owner authorization file. They are not execution instructions.

${authorizationRows}

## Validation After Owner Input

${bullet(payload.validationAfterOwnerInput.map((item) => `\`${item}\``))}

## Deferred Aggregate Validation Commands

${bullet(payload.deferredAggregateValidationCommands.map((item) => `\`${item}\``))}

## Boundary

Every selected row remains non-executable. This packet only selects authorization text for owner review; deployment, staging, commit, merge, worktree removal, and physical cleanup execution remain outside this batch.
`;
}

function main() {
  const payload = buildNextOwnerAuthorizationFocusBatch();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_PATHS.latestJson, json);
  write(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_PATHS.datedJson, json);
  write(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_PATHS.latestMarkdown, md);
  write(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_PATHS.datedMarkdown, md);

  console.log(JSON.stringify({
    latestJson: NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_PATHS.latestJson,
    latestMarkdown: NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_PATHS.latestMarkdown,
    pendingCanonicalAuthorizationRows: payload.summary.pendingCanonicalAuthorizationRows,
    heldRows: payload.summary.heldRows,
    nextBatchRows: payload.summary.nextBatchRows,
    selectedRoundId: payload.batchPolicy.selectedRoundId,
    nextBatchCleanupRows: payload.summary.nextBatchCleanupRows,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
