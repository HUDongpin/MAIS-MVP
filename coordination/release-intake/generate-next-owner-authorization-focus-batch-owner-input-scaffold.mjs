#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_OWNER_INPUT_SCAFFOLD_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  acceptanceDocket: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch-acceptance-docket.json",
  canonicalAuthorizations: "coordination/release-intake/latest-A25-next-owner-authorizations.json",
  finalStateLedger: "coordination/release-intake/latest-A25-dirty-worktree-final-state-ledger.json",
  latestJson: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch-owner-input-scaffold.json",
  latestMarkdown: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch-owner-input-scaffold.md",
  datedJson: `coordination/release-intake/${date}-A25-next-owner-authorization-focus-batch-owner-input-scaffold.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-next-owner-authorization-focus-batch-owner-input-scaffold.md`
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
  return new Map((rows ?? []).filter((row) => row.approvalId).map((row, index) => [row.approvalId, { row, index }]));
}

function sourceCurrentnessFailures({ dirtyMap, acceptanceDocket, canonicalAuthorizations, finalStateLedger }) {
  const failures = [];
  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? 0;
  for (const [label, artifact] of [
    ["focus batch acceptance docket", acceptanceDocket],
    ["canonical authorizations", canonicalAuthorizations],
    ["final-state ledger", finalStateLedger]
  ]) {
    if (artifact.dirtyMapStatusSignature !== expectedSignature) failures.push(`${label} dirty-map signature is stale`);
    if (artifact.expandedStatusEntries !== expectedEntries) failures.push(`${label} expanded dirty entry count is stale`);
  }
  if ((acceptanceDocket.sourceCurrentnessFailures ?? []).length > 0) {
    failures.push("focus batch acceptance docket has source currentness failures");
  }
  if (canonicalAuthorizations.cleanupAuthorized === true) failures.push("canonical authorizations must not be cleanup-authorized");
  if (canonicalAuthorizations.executableNow === true) failures.push("canonical authorizations must not be executable");
  return failures;
}

function recommendationText(row, ledgerRow, draftRow) {
  if (!ledgerRow?.selectedFinalState) return row.requiredAuthorizationText;
  const evidence = [
    ...(ledgerRow.selectionEvidenceLinks ?? []),
    ...(ledgerRow.evidenceLinks ?? []),
    ...(draftRow?.evidenceReviewed ?? [])
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

function ownerInputRow(row, canonical, draft, ledger) {
  const canonicalRow = canonical?.row ?? null;
  const draftRow = draft?.row ?? null;
  const ledgerRow = ledger?.row ?? null;
  const draftPresent = Boolean(draftRow);
  const canonicalPresent = Boolean(canonicalRow);
  const accepted = row.accepted === true || canonicalPresent;
  const generatedCleanup = row.approvalKind === "a22-generated-artifact-residual-cleanup";
  const recommendedAuthorizationText = generatedCleanup
    ? row.requiredAuthorizationText
    : recommendationText(row, ledgerRow, draftRow);
  return {
    approvalId: row.approvalId,
    approvalKind: row.approvalKind,
    owner: row.owner,
    path: row.path,
    sourceRoundId: row.sourceRoundId,
    selectedAction: row.selectedAction,
    selectedFinalState: canonicalRow?.selectedFinalState ?? draftRow?.selectedFinalState ?? "",
    ledgerSelectedFinalState: ledgerRow?.selectedFinalState ?? "",
    ledgerDecisionStatus: ledgerRow?.decisionStatus ?? "",
    exactCommand: row.exactCommand,
    canonicalTarget: NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_OWNER_INPUT_SCAFFOLD_PATHS.canonicalAuthorizations,
    canonicalRowPresent: canonicalPresent,
    canonicalDraftRowPresent: draftPresent,
    canonicalDraftIndex: draftPresent ? draft.index : -1,
    canonicalAuthorizationIndex: canonicalPresent ? canonical.index : -1,
    accepted,
    pendingReason: row.pendingReason ?? "",
    requiredAuthorizationText: row.requiredAuthorizationText,
    recommendedAuthorizationText,
    draftAuthorizationText: draftRow?.authorizationText ?? draftRow?.requiredAuthorizationText ?? "",
    requiredOwnerFields: generatedCleanup
      ? [
          "selectedAction",
          "exactCommand",
          "approvedBy",
          "approvedAt",
          "evidenceReviewed",
          "notes",
          "authorizationText"
        ]
      : [
          "selectedFinalState",
          "approvedBy",
          "approvedAt",
          "evidenceReviewed",
          "notes",
          "authorizationText"
        ],
    nextOwnerInputAction: accepted
      ? "No owner-input action needed for this focus row; canonical authorization row is already accepted."
      : draftPresent
        ? generatedCleanup
          ? "Review this draft row, preserve selectedAction and exactCommand, then copy/update it into the canonical authorizations array with owner approval fields."
          : "Review this draft row, choose selectedFinalState, then copy/update it into the canonical authorizations array with owner approval fields."
        : "Canonical draft row is missing; regenerate A25 owner input scaffolds before requesting owner approval.",
    cleanupAuthorized: row.cleanupAuthorized === true || canonicalRow?.cleanupAuthorized === true || draftRow?.cleanupAuthorized === true,
    executableNow: row.executableNow === true || canonicalRow?.executableNow === true || draftRow?.executableNow === true
  };
}

export function buildNextOwnerAuthorizationFocusBatchOwnerInputScaffold() {
  const dirtyMap = readJson(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_OWNER_INPUT_SCAFFOLD_PATHS.dirtyMap);
  const acceptanceDocket = readJson(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_OWNER_INPUT_SCAFFOLD_PATHS.acceptanceDocket);
  const canonicalAuthorizations = readJson(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_OWNER_INPUT_SCAFFOLD_PATHS.canonicalAuthorizations);
  const finalStateLedger = readJson(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_OWNER_INPUT_SCAFFOLD_PATHS.finalStateLedger);
  const sourceFailures = sourceCurrentnessFailures({ dirtyMap, acceptanceDocket, canonicalAuthorizations, finalStateLedger });
  const canonicalByApprovalId = byApprovalId(canonicalAuthorizations.authorizations ?? []);
  const draftByApprovalId = byApprovalId(canonicalAuthorizations.draftAuthorizationsDoNotAuthorize ?? []);
  const ledgerByApprovalId = byApprovalId(finalStateLedger.entries ?? []);
  const rows = (acceptanceDocket.acceptanceRows ?? []).map((row) => ownerInputRow(
    row,
    canonicalByApprovalId.get(row.approvalId),
    draftByApprovalId.get(row.approvalId),
    ledgerByApprovalId.get(row.approvalId)
  ));
  const acceptedRows = rows.filter((row) => row.accepted);
  const pendingRows = rows.filter((row) => !row.accepted);
  const draftVisibleRows = rows.filter((row) => row.canonicalDraftRowPresent).length;
  const canonicalVisibleRows = rows.filter((row) => row.canonicalRowPresent).length;
  const ownerInputVisibleRows = rows.filter((row) => row.canonicalDraftRowPresent || row.canonicalRowPresent).length;
  const cleanupAuthorizedRows = rows.filter((row) => row.cleanupAuthorized).length;
  const executableRows = rows.filter((row) => row.executableNow).length;

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? 0,
    sourceArtifacts: {
      acceptanceDocketGeneratedAt: acceptanceDocket.generatedAt,
      canonicalAuthorizationsGeneratedAt: canonicalAuthorizations.generatedAt,
      finalStateLedgerGeneratedAt: finalStateLedger.generatedAt
    },
    sourceCurrentnessFailures: sourceFailures,
    canonicalTarget: NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_OWNER_INPUT_SCAFFOLD_PATHS.canonicalAuthorizations,
    batchId: acceptanceDocket.batchId ?? "",
    batchStatus: acceptanceDocket.batchStatus ?? "missing",
    ownerInputRows: rows,
    heldRows: acceptanceDocket.heldRows ?? [],
    heldPolicyApprovalIds: acceptanceDocket.heldPolicyApprovalIds ?? acceptanceDocket.focusBatchPolicy?.heldApprovalIds ?? [],
    summary: {
      focusBatchRows: rows.length,
      acceptedRows: acceptedRows.length,
      pendingRows: pendingRows.length,
      heldRows: count(acceptanceDocket.summary?.heldRows, (acceptanceDocket.heldRows ?? []).length),
      canonicalDraftVisibleRows: draftVisibleRows,
      canonicalAuthorizationVisibleRows: canonicalVisibleRows,
      ownerInputVisibleRows,
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

export function stableNextOwnerAuthorizationFocusBatchOwnerInputScaffoldProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    canonicalTarget: payload.canonicalTarget,
    batchId: payload.batchId,
    batchStatus: payload.batchStatus,
    ownerInputRows: payload.ownerInputRows,
    heldRows: payload.heldRows,
    heldPolicyApprovalIds: payload.heldPolicyApprovalIds,
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
  const rows = payload.ownerInputRows.map((row, index) => (
    `| ${index + 1} | \`${cell(row.approvalId)}\` | ${cell(row.owner)} | ${row.canonicalDraftRowPresent ? "yes" : "no"} | ${row.canonicalRowPresent ? "yes" : "no"} | ${row.accepted ? "yes" : "no"} | ${cell(row.nextOwnerInputAction)} |`
  )).join("\n");
  const authorizationTexts = payload.ownerInputRows
    .filter((row) => !row.accepted)
    .map((row) => `- ${row.requiredAuthorizationText}`)
    .join("\n") || "- none";
  const recommendedAuthorizationTexts = payload.ownerInputRows
    .filter((row) => !row.accepted)
    .map((row) => `- ${row.recommendedAuthorizationText}`)
    .join("\n") || "- none";

  return `# A25 Next Owner Authorization Focus Batch Owner Input Scaffold

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

Canonical target: \`${payload.canonicalTarget}\`

This scaffold is evidence-only. It proves where the current owner authorization focus batch appears in the canonical owner-input file and how those pending draft rows can be promoted by the owner. It does not write owner approval, record execution instruction, authorize merge, authorize cleanup, stage, commit, clean, reset, remove worktrees, delete files, push, or deploy.

## Summary

- Batch ID: \`${payload.batchId}\`
- Batch status: \`${payload.batchStatus}\`
- Focus batch rows: ${payload.summary.focusBatchRows}
- Accepted rows: ${payload.summary.acceptedRows}
- Pending rows: ${payload.summary.pendingRows}
- Held rows: ${payload.summary.heldRows}
- Held policy rows: ${payload.heldPolicyApprovalIds.length}
- Canonical draft visible rows: ${payload.summary.canonicalDraftVisibleRows}
- Canonical authorization visible rows: ${payload.summary.canonicalAuthorizationVisibleRows}
- Owner-input visible rows: ${payload.summary.ownerInputVisibleRows}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}
- Source currentness failures: ${payload.summary.sourceCurrentnessFailures}

## Owner Input Rows

| # | Approval ID | Owner | Draft visible | Canonical accepted row | Accepted | Next owner-input action |
| ---: | --- | --- | --- | --- | --- | --- |
${rows}

## Exact Pending Authorization Texts

${authorizationTexts}

## Ledger-Backed Recommended Authorization Texts

${recommendedAuthorizationTexts}

## Held Rows

${bullet(payload.heldRows.map((row) => `\`${row.approvalId}\` - ${row.path}`))}

## Held Policy Approval IDs

${bullet(payload.heldPolicyApprovalIds.map((approvalId) => `\`${approvalId}\``))}

## Boundary

Draft rows are not approvals. A row becomes accepted only after the owner records the required owner fields shown for that approval kind in the canonical authorizations array. Cleanup and merge still require separate validated execution instructions and owner-approved Git operations.
`;
}

function main() {
  const payload = buildNextOwnerAuthorizationFocusBatchOwnerInputScaffold();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_OWNER_INPUT_SCAFFOLD_PATHS.latestJson, json);
  write(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_OWNER_INPUT_SCAFFOLD_PATHS.datedJson, json);
  write(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_OWNER_INPUT_SCAFFOLD_PATHS.latestMarkdown, md);
  write(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_OWNER_INPUT_SCAFFOLD_PATHS.datedMarkdown, md);

  console.log(JSON.stringify({
    latestJson: NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_OWNER_INPUT_SCAFFOLD_PATHS.latestJson,
    latestMarkdown: NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_OWNER_INPUT_SCAFFOLD_PATHS.latestMarkdown,
    batchStatus: payload.batchStatus,
    focusBatchRows: payload.summary.focusBatchRows,
    acceptedRows: payload.summary.acceptedRows,
    pendingRows: payload.summary.pendingRows,
    ownerInputVisibleRows: payload.summary.ownerInputVisibleRows,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
