#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_CANONICAL_PREVIEW_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  recordingIntake: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch-recording-intake.json",
  recordingIntakeGate: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch-recording-intake-current-gate.json",
  ownerInputScaffold: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch-owner-input-scaffold.json",
  canonicalAuthorizations: "coordination/release-intake/latest-A25-next-owner-authorizations.json",
  finalStateLedger: "coordination/release-intake/latest-A25-dirty-worktree-final-state-ledger.json",
  ledgerBridge: "coordination/release-intake/latest-A25-ledger-to-canonical-authorization-bridge.json",
  latestJson: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch-canonical-preview.json",
  latestMarkdown: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch-canonical-preview.md",
  datedJson: `coordination/release-intake/${date}-A25-next-owner-authorization-focus-batch-canonical-preview.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-next-owner-authorization-focus-batch-canonical-preview.md`
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

function byApprovalId(rows) {
  return new Map((rows ?? []).filter((row) => row.approvalId).map((row) => [row.approvalId, row]));
}

function unique(values) {
  return [...new Set((values ?? []).filter(Boolean))];
}

function sourceCurrentnessFailures({
  dirtyMap,
  recordingIntake,
  recordingIntakeGate,
  ownerInputScaffold,
  canonicalAuthorizations,
  finalStateLedger,
  ledgerBridge
}) {
  const failures = [];
  const signature = dirtyMap.statusSignature;
  const entries = dirtyMap.statusCounts?.expandedStatusEntries ?? 0;
  for (const [label, artifact] of [
    ["focus batch recording intake", recordingIntake],
    ["focus batch recording intake gate", recordingIntakeGate],
    ["focus batch owner-input scaffold", ownerInputScaffold],
    ["canonical authorizations", canonicalAuthorizations],
    ["final-state ledger", finalStateLedger],
    ["ledger-to-canonical bridge", ledgerBridge]
  ]) {
    if (artifact.dirtyMapStatusSignature !== signature) failures.push(`${label} dirty-map signature is stale`);
    if (artifact.expandedStatusEntries !== entries) failures.push(`${label} expanded dirty entry count is stale`);
  }
  if ((recordingIntake.sourceCurrentnessFailures ?? []).length > 0) {
    failures.push("focus batch recording intake has source currentness failures");
  }
  if ((recordingIntakeGate.failures ?? []).length > 0) {
    failures.push("focus batch recording intake gate has failures");
  }
  if ((ownerInputScaffold.sourceCurrentnessFailures ?? []).length > 0) {
    failures.push("focus batch owner-input scaffold has source currentness failures");
  }
  if ((ledgerBridge.sourceCurrentnessFailures ?? []).length > 0) {
    failures.push("ledger-to-canonical bridge has source currentness failures");
  }
  if (canonicalAuthorizations.cleanupAuthorized === true) failures.push("canonical authorizations must not be cleanup-authorized");
  if (canonicalAuthorizations.executableNow === true) failures.push("canonical authorizations must not be executable");
  return failures;
}

function ownerApprovalNotes({ row, ledgerRow }) {
  return [
    "Owner-package final-state recording preview only.",
    `Ledger decision status: ${ledgerRow?.decisionStatus ?? "missing"}.`,
    `Current focus-row status: ${row.rowStatus}.`,
    "No cleanup, deploy, push, reset, clean, remove worktrees, delete branches, merge, commit, or physical lifecycle command is authorized by this preview artifact alone."
  ].join(" ");
}

function authorizationText({ row, ledgerRow, evidenceReviewed }) {
  return [
    `Authorize approvalId=${row.approvalId} for owner=${row.owner}`,
    `selectedFinalState=${ledgerRow.selectedFinalState}`,
    `evidenceReviewed=${evidenceReviewed.join(", ")}`,
    "approvedBy=<owner>",
    "approvedAt=<ISO-8601>",
    `notes=${ownerApprovalNotes({ row, ledgerRow })}`
  ].join("; ") + ".";
}

function buildPreviewRow({ row, draftRow, ledgerRow, bridgeRow }) {
  const evidenceReviewed = unique([
    ...(draftRow?.evidenceReviewed ?? []),
    ...(draftRow?.evidence ?? []),
    ...(ledgerRow?.selectionEvidenceLinks ?? []),
    ...(ledgerRow?.evidenceLinks ?? []),
    ...(bridgeRow?.evidenceReviewed ?? []),
    NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_CANONICAL_PREVIEW_PATHS.recordingIntake,
    NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_CANONICAL_PREVIEW_PATHS.ownerInputScaffold,
    NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_CANONICAL_PREVIEW_PATHS.finalStateLedger,
    NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_CANONICAL_PREVIEW_PATHS.ledgerBridge
  ]);
  const text = authorizationText({ row, ledgerRow, evidenceReviewed });
  const previewAuthorizationRow = {
    ...draftRow,
    selectedFinalState: ledgerRow.selectedFinalState,
    approvedBy: "<owner>",
    approvedAt: "<ISO-8601>",
    evidenceReviewed,
    notes: ownerApprovalNotes({ row, ledgerRow }),
    authorizationText: text,
    cleanupAuthorized: false,
    executableNow: false
  };
  delete previewAuthorizationRow.currentBlocker;
  return {
    approvalId: row.approvalId,
    approvalKind: row.approvalKind,
    owner: row.owner,
    sourceRoundId: row.sourceRoundId,
    rowStatus: row.rowStatus,
    canonicalDraftRowPresent: row.canonicalDraftRowPresent === true,
    canonicalRowPresent: row.canonicalRowPresent === true,
    ledgerSelectedFinalState: ledgerRow.selectedFinalState,
    ledgerDecisionStatus: ledgerRow.decisionStatus,
    previewAuthorizationRow,
    canonicalAppendInstruction: `After explicit owner approval, copy this previewAuthorizationRow into authorizations[] in ${NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_CANONICAL_PREVIEW_PATHS.canonicalAuthorizations} and remove or leave the matching draft row according to the canonical recorder's documented behavior.`,
    requiredOwnerFieldsStillPlaceholders: ["approvedBy", "approvedAt"],
    cleanupAuthorized: false,
    executableNow: false
  };
}

function buildChecks({ sourceFailures, pendingRows, previewRows, unsafeRows, missingDraftRows, missingLedgerRows }) {
  return [
    {
      id: "source-current",
      status: sourceFailures.length === 0 ? "pass" : "fail",
      detail: `sourceCurrentnessFailures=${sourceFailures.length}`
    },
    {
      id: "pending-rows-previewed",
      status: previewRows.length === pendingRows.length ? "pass" : "fail",
      detail: `previewRows=${previewRows.length}; pendingRows=${pendingRows.length}`
    },
    {
      id: "draft-rows-present",
      status: missingDraftRows.length === 0 ? "pass" : "fail",
      detail: `missingDraftRows=${missingDraftRows.length}`
    },
    {
      id: "ledger-rows-present",
      status: missingLedgerRows.length === 0 ? "pass" : "fail",
      detail: `missingLedgerRows=${missingLedgerRows.length}`
    },
    {
      id: "safe-non-executable",
      status: unsafeRows.length === 0 ? "pass" : "fail",
      detail: `unsafeRows=${unsafeRows.length}`
    },
    {
      id: "owner-placeholders-remain",
      status: previewRows.every((row) => row.previewAuthorizationRow.approvedBy === "<owner>" && row.previewAuthorizationRow.approvedAt === "<ISO-8601>") ? "pass" : "fail",
      detail: "preview rows must not claim owner approval"
    },
    {
      id: "reviewed-commit-final-state",
      status: previewRows.every((row) => row.ledgerSelectedFinalState === "reviewed commit") ? "pass" : "fail",
      detail: "current owner-package focus rows must preserve ledger selectedFinalState=reviewed commit"
    }
  ];
}

function buildBatchAuthorizationRequest(previewRows) {
  const approvalIds = previewRows.map((row) => row.approvalId);
  const selectedFinalStates = unique(previewRows.map((row) => row.ledgerSelectedFinalState));
  const everyRowReviewedCommit = previewRows.length > 0 &&
    selectedFinalStates.length === 1 &&
    selectedFinalStates[0] === "reviewed commit";
  const copyableApprovalText = previewRows.length === 0
    ? ""
    : [
        `Owner authorization: approve the current owner-package canonical authorization preview batch (${previewRows.length} rows)`,
        `approvalIds=${approvalIds.join(",")}`,
        everyRowReviewedCommit ? "selectedFinalState=reviewed commit for every row" : `selectedFinalStates=${selectedFinalStates.join(",")}`,
        "approvedBy=<owner>",
        "approvedAt=<ISO-8601>",
        "do not authorize cleanup",
        "do not authorize deploy",
        "do not authorize merge",
        "do not authorize destructive Git",
        "do not authorize physical lifecycle cleanup"
      ].join("; ") + ".";
  const copyableOwnerReplyTextZh = previewRows.length === 0
    ? ""
    : `我授权当前 ${previewRows.length} 条 owner-package canonical authorization preview：approvalIds=${approvalIds.join(",")}；selectedFinalState=reviewed commit；不授权 cleanup；不授权 deploy；不授权 merge；不授权 destructive git；不授权 physical lifecycle cleanup。`;
  return {
    requestId: "focus-batch-owner-package-canonical-authorization",
    pendingRows: previewRows.length,
    approvalIds,
    selectedFinalStates,
    everyRowReviewedCommit,
    targetFile: NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_CANONICAL_PREVIEW_PATHS.canonicalAuthorizations,
    copyableApprovalText,
    copyableOwnerReplyTextZh,
    boundary: {
      recordsAuthorizationOnlyAfterExplicitOwnerReply: true,
      cleanupAuthorized: false,
      deployAuthorized: false,
      mergeAuthorized: false,
      destructiveGitAuthorized: false,
      physicalCleanupAuthorized: false,
      executableNow: false
    }
  };
}

export function buildNextOwnerAuthorizationFocusBatchCanonicalPreview() {
  const dirtyMap = readJson(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_CANONICAL_PREVIEW_PATHS.dirtyMap);
  const recordingIntake = readJson(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_CANONICAL_PREVIEW_PATHS.recordingIntake);
  const recordingIntakeGate = readJson(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_CANONICAL_PREVIEW_PATHS.recordingIntakeGate);
  const ownerInputScaffold = readJson(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_CANONICAL_PREVIEW_PATHS.ownerInputScaffold);
  const canonicalAuthorizations = readJson(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_CANONICAL_PREVIEW_PATHS.canonicalAuthorizations);
  const finalStateLedger = readJson(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_CANONICAL_PREVIEW_PATHS.finalStateLedger);
  const ledgerBridge = readJson(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_CANONICAL_PREVIEW_PATHS.ledgerBridge);
  const sourceFailures = sourceCurrentnessFailures({
    dirtyMap,
    recordingIntake,
    recordingIntakeGate,
    ownerInputScaffold,
    canonicalAuthorizations,
    finalStateLedger,
    ledgerBridge
  });
  const drafts = byApprovalId(canonicalAuthorizations.draftAuthorizationsDoNotAuthorize ?? []);
  const ledgerRows = byApprovalId(finalStateLedger.entries ?? []);
  const bridgeRows = byApprovalId(ledgerBridge.bridgeRows ?? []);
  const pendingRows = (recordingIntake.focusBatchRows ?? []).filter((row) => !row.accepted);
  const unsafeRows = pendingRows.filter((row) => row.cleanupAuthorized === true || row.executableNow === true);
  const missingDraftRows = [];
  const missingLedgerRows = [];
  const previewRows = [];

  for (const row of pendingRows) {
    const draftRow = drafts.get(row.approvalId);
    const ledgerRow = ledgerRows.get(row.approvalId);
    const bridgeRow = bridgeRows.get(row.approvalId);
    if (!draftRow) {
      missingDraftRows.push(row.approvalId);
      continue;
    }
    if (!ledgerRow?.selectedFinalState || !String(ledgerRow.decisionStatus ?? "").startsWith("approved-")) {
      missingLedgerRows.push(row.approvalId);
      continue;
    }
    if (row.cleanupAuthorized === true || row.executableNow === true) continue;
    previewRows.push(buildPreviewRow({ row, draftRow, ledgerRow, bridgeRow }));
  }

  const checks = buildChecks({ sourceFailures, pendingRows, previewRows, unsafeRows, missingDraftRows, missingLedgerRows });
  const failedChecks = checks.filter((row) => row.status !== "pass");
  const batchAuthorizationRequest = buildBatchAuthorizationRequest(previewRows);
  const previewStatus = sourceFailures.length > 0
    ? "not-ready-source-stale"
    : pendingRows.length === 0
      ? "no-pending-focus-rows"
      : failedChecks.length > 0
        ? "not-ready-check-failures"
        : "ready-for-owner-review";

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? 0,
    sourceArtifacts: {
      recordingIntakeGeneratedAt: recordingIntake.generatedAt,
      recordingIntakeGateCheckedAt: recordingIntakeGate.checkedAt,
      ownerInputScaffoldGeneratedAt: ownerInputScaffold.generatedAt,
      canonicalAuthorizationsGeneratedAt: canonicalAuthorizations.generatedAt,
      finalStateLedgerGeneratedAt: finalStateLedger.generatedAt,
      ledgerBridgeGeneratedAt: ledgerBridge.generatedAt
    },
    sourceCurrentnessFailures: sourceFailures,
    canonicalTarget: NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_CANONICAL_PREVIEW_PATHS.canonicalAuthorizations,
    batchId: recordingIntake.batchId ?? ownerInputScaffold.batchId ?? "",
    previewStatus,
    batchAuthorizationRequest,
    previewRows,
    missingDraftRows,
    missingLedgerRows,
    unsafeRows: unsafeRows.map((row) => row.approvalId),
    checks,
    summary: {
      focusBatchRows: count(recordingIntake.summary?.focusBatchRows, (recordingIntake.focusBatchRows ?? []).length),
      acceptedRows: count(recordingIntake.summary?.acceptedRows),
      pendingRows: pendingRows.length,
      previewRows: previewRows.length,
      missingDraftRows: missingDraftRows.length,
      missingLedgerRows: missingLedgerRows.length,
      unsafeRows: unsafeRows.length,
      sourceCurrentnessFailures: sourceFailures.length,
      cleanupAuthorizedRows: 0,
      executableRows: 0
    },
    boundary: {
      evidenceOnly: true,
      createsAuthorizationFile: false,
      recordsOwnerApproval: false,
      promotesCanonicalRows: false,
      recordsExecutionInstruction: false,
      mergeAuthorized: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false
    }
  };
}

export function stableNextOwnerAuthorizationFocusBatchCanonicalPreviewProjection(payload) {
  const sourceArtifacts = { ...(payload.sourceArtifacts ?? {}) };
  delete sourceArtifacts.recordingIntakeGateCheckedAt;
  return {
    repoRoot: payload.repoRoot,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    canonicalTarget: payload.canonicalTarget,
    batchId: payload.batchId,
    previewStatus: payload.previewStatus,
    batchAuthorizationRequest: payload.batchAuthorizationRequest,
    previewRows: payload.previewRows,
    missingDraftRows: payload.missingDraftRows,
    missingLedgerRows: payload.missingLedgerRows,
    unsafeRows: payload.unsafeRows,
    checks: payload.checks,
    summary: payload.summary,
    boundary: payload.boundary
  };
}

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function markdown(payload) {
  const rows = payload.previewRows.map((row, index) => (
    `| ${index + 1} | \`${cell(row.approvalId)}\` | ${cell(row.owner)} | ${cell(row.ledgerSelectedFinalState)} | ${cell(row.ledgerDecisionStatus)} | ${cell(row.previewAuthorizationRow.approvedBy)} | ${cell(row.previewAuthorizationRow.approvedAt)} | ${row.cleanupAuthorized ? "yes" : "no"} | ${row.executableNow ? "yes" : "no"} |`
  )).join("\n") || "| - | - | - | - | - | - | - | - | - |";
  const checkRows = payload.checks.map((row) => (
    `| ${cell(row.id)} | ${row.status} | ${cell(row.detail)} |`
  )).join("\n");
  const jsonBlock = JSON.stringify(payload.previewRows.map((row) => row.previewAuthorizationRow), null, 2);
  const batchRequest = payload.batchAuthorizationRequest ?? {};

  return `# A25 Next Owner Authorization Focus Batch Canonical Preview

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

Canonical target: \`${payload.canonicalTarget}\`

This preview is evidence-only. It shows the exact canonical authorization rows that would be ready to record after explicit owner approval. It does not write owner approval, promote canonical rows, record execution instruction, authorize merge, authorize cleanup, stage, commit, clean, reset, remove worktrees, delete files, push, or deploy.

## Summary

- Batch ID: \`${payload.batchId}\`
- Preview status: \`${payload.previewStatus}\`
- Focus batch rows: ${payload.summary.focusBatchRows}
- Accepted rows: ${payload.summary.acceptedRows}
- Pending rows: ${payload.summary.pendingRows}
- Preview rows: ${payload.summary.previewRows}
- Missing draft rows: ${payload.summary.missingDraftRows}
- Missing ledger rows: ${payload.summary.missingLedgerRows}
- Unsafe rows: ${payload.summary.unsafeRows}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}
- Source currentness failures: ${payload.summary.sourceCurrentnessFailures}

## Batch Authorization Text

Copyable owner approval text:

\`\`\`text
${batchRequest.copyableApprovalText ?? ""}
\`\`\`

Copyable owner reply text (Chinese):

\`\`\`text
${batchRequest.copyableOwnerReplyTextZh ?? ""}
\`\`\`

## Preview Rows

| # | Approval ID | Owner | Selected final state | Ledger status | approvedBy | approvedAt | Cleanup authorized | Executable |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- |
${rows}

## Canonical Row Preview JSON

\`\`\`json
${jsonBlock}
\`\`\`

## Checks

| Check | Status | Detail |
| --- | --- | --- |
${checkRows}

## Boundary

These rows still contain owner placeholders. They become accepted only after the owner explicitly approves them and a recorder writes them into the canonical authorizations array. Merge and cleanup remain blocked until later clean-source, lifecycle, and execution-instruction gates pass.
`;
}

function main() {
  const payload = buildNextOwnerAuthorizationFocusBatchCanonicalPreview();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_CANONICAL_PREVIEW_PATHS.latestJson, json);
  write(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_CANONICAL_PREVIEW_PATHS.datedJson, json);
  write(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_CANONICAL_PREVIEW_PATHS.latestMarkdown, md);
  write(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_CANONICAL_PREVIEW_PATHS.datedMarkdown, md);

  console.log(JSON.stringify({
    latestJson: NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_CANONICAL_PREVIEW_PATHS.latestJson,
    latestMarkdown: NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_CANONICAL_PREVIEW_PATHS.latestMarkdown,
    previewStatus: payload.previewStatus,
    focusBatchRows: payload.summary.focusBatchRows,
    pendingRows: payload.summary.pendingRows,
    previewRows: payload.summary.previewRows,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
