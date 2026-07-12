#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const LEDGER_TO_CANONICAL_AUTHORIZATION_BRIDGE_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  finalStateLedger: "coordination/release-intake/latest-A25-dirty-worktree-final-state-ledger.json",
  canonicalAuthorizations: "coordination/release-intake/latest-A25-next-owner-authorizations.json",
  latestJson: "coordination/release-intake/latest-A25-ledger-to-canonical-authorization-bridge.json",
  latestMarkdown: "coordination/release-intake/latest-A25-ledger-to-canonical-authorization-bridge.md",
  datedJson: `coordination/release-intake/${date}-A25-ledger-to-canonical-authorization-bridge.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-ledger-to-canonical-authorization-bridge.md`
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

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), "utf8"));
}

function write(relativePath, content) {
  fs.writeFileSync(absolute(relativePath), content);
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function isLedgerApproved(row) {
  return Boolean(row?.approvalId && row?.selectedFinalState && String(row?.decisionStatus ?? "").startsWith("approved-"));
}

function canonicalSubject(row) {
  if (row.approvalKind === "owner-package") return `owner=${row.owner}`;
  if (row.approvalKind === "physical-lifecycle") return `branch=${row.branch}`;
  return `subject=${row.subject || row.path || row.branch || row.approvalId}`;
}

function buildCanonicalAuthorizationText({ draft, ledger, evidenceReviewed }) {
  const notes = [
    "Ledger-approved final-state bridge only.",
    ledger.notes,
    "No cleanup, deploy, push, reset, clean, remove worktrees, delete branches, merge, commit, or physical lifecycle command is authorized by this bridge artifact alone."
  ].filter(Boolean).join(" ");
  return [
    `Authorize approvalId=${draft.approvalId} for ${canonicalSubject(draft)}`,
    `selectedFinalState=${ledger.selectedFinalState}`,
    `evidenceReviewed=${evidenceReviewed.join(", ")}`,
    `approvedBy=${ledger.approvedBy || "Owner approval via Codex goal"}`,
    `approvedAt=${ledger.approvedAt}`,
    `notes=${notes}`
  ].join("; ") + ".";
}

function sourceCurrentnessFailures({ dirtyMap, ledger, canonical }) {
  const failures = [];
  const signature = dirtyMap.statusSignature;
  const entries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  for (const [label, payload] of [
    ["final-state ledger", ledger],
    ["canonical authorizations", canonical]
  ]) {
    if (payload.dirtyMapStatusSignature !== signature) failures.push(`${label} dirty-map signature is stale`);
    if (payload.expandedStatusEntries !== entries) failures.push(`${label} expanded dirty entry count is stale`);
  }
  return failures;
}

export function buildLedgerToCanonicalAuthorizationBridge() {
  const dirtyMap = readJson(LEDGER_TO_CANONICAL_AUTHORIZATION_BRIDGE_PATHS.dirtyMap);
  const ledger = readJson(LEDGER_TO_CANONICAL_AUTHORIZATION_BRIDGE_PATHS.finalStateLedger);
  const canonical = readJson(LEDGER_TO_CANONICAL_AUTHORIZATION_BRIDGE_PATHS.canonicalAuthorizations);
  const failures = sourceCurrentnessFailures({ dirtyMap, ledger, canonical });

  const acceptedById = new Map((canonical.authorizations ?? []).map((row) => [row.approvalId, row]));
  const draftById = new Map((canonical.draftAuthorizationsDoNotAuthorize ?? []).map((row) => [row.approvalId, row]));
  const ledgerApprovedRows = (ledger.entries ?? []).filter(isLedgerApproved);

  const bridgeRows = [];
  const acceptedLedgerRows = [];
  const missingCanonicalDraftRows = [];
  for (const ledgerRow of ledgerApprovedRows) {
    const accepted = acceptedById.get(ledgerRow.approvalId);
    if (accepted) {
      acceptedLedgerRows.push({
        approvalId: ledgerRow.approvalId,
        owner: ledgerRow.owner,
        sourceKind: ledgerRow.sourceKind,
        selectedFinalState: accepted.selectedFinalState || ledgerRow.selectedFinalState,
        canonicalRowPresent: true,
        cleanupAuthorized: false,
        executableNow: false
      });
      continue;
    }
    const draft = draftById.get(ledgerRow.approvalId);
    if (!draft) {
      missingCanonicalDraftRows.push({
        approvalId: ledgerRow.approvalId,
        owner: ledgerRow.owner,
        sourceKind: ledgerRow.sourceKind,
        selectedFinalState: ledgerRow.selectedFinalState
      });
      continue;
    }
    const evidenceReviewed = unique([
      LEDGER_TO_CANONICAL_AUTHORIZATION_BRIDGE_PATHS.finalStateLedger,
      LEDGER_TO_CANONICAL_AUTHORIZATION_BRIDGE_PATHS.canonicalAuthorizations,
      ...(draft.evidenceReviewed ?? []),
      ...(ledgerRow.selectionEvidenceLinks ?? []),
      ...(ledgerRow.evidenceLinks ?? [])
    ]);
    bridgeRows.push({
      approvalId: ledgerRow.approvalId,
      approvalKind: draft.approvalKind,
      sourceKind: ledgerRow.sourceKind,
      owner: draft.owner || ledgerRow.owner,
      selectedFinalState: ledgerRow.selectedFinalState,
      ledgerDecisionStatus: ledgerRow.decisionStatus,
      ledgerApprovedBy: ledgerRow.approvedBy,
      ledgerApprovedAt: ledgerRow.approvedAt,
      canonicalDraftRowPresent: true,
      canonicalRowPresent: false,
      evidenceReviewed,
      canonicalAuthorizationText: buildCanonicalAuthorizationText({ draft, ledger: ledgerRow, evidenceReviewed }),
      sourcePathspec: draft.pathspec || "",
      sourceWorkOrder: draft.workOrder || "",
      branch: draft.branch || ledgerRow.branch || "",
      path: draft.path || ledgerRow.path || "",
      cleanupAuthorized: false,
      executableNow: false
    });
  }

  const ledgerIds = new Set(ledgerApprovedRows.map((row) => row.approvalId));
  const nonLedgerDraftRows = (canonical.draftAuthorizationsDoNotAuthorize ?? [])
    .filter((row) => !ledgerIds.has(row.approvalId))
    .map((row) => ({
      approvalId: row.approvalId,
      approvalKind: row.approvalKind,
      owner: row.owner,
      reason: row.approvalId === "wave01-resync-01-tsconfig-json"
        ? "held Wave01 tsconfig-json row; owner previously kept this on hold"
        : "draft row is not represented in the final-state ledger",
      cleanupAuthorized: false,
      executableNow: false
    }));

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    bridgeKind: "ledger-to-canonical-authorization-bridge",
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? null,
    sourceArtifacts: {
      finalStateLedgerGeneratedAt: ledger.generatedAt,
      canonicalAuthorizationsGeneratedAt: canonical.generatedAt
    },
    sourceCurrentnessFailures: failures,
    summary: {
      ledgerEntries: ledger.entries?.length ?? 0,
      ledgerApprovedRows: ledgerApprovedRows.length,
      canonicalAuthorizationRows: canonical.authorizations?.length ?? 0,
      canonicalDraftRows: canonical.draftAuthorizationsDoNotAuthorize?.length ?? 0,
      ledgerBackedCanonicalRows: acceptedLedgerRows.length,
      ledgerBackedPendingCanonicalRows: bridgeRows.length,
      missingCanonicalDraftRows: missingCanonicalDraftRows.length,
      nonLedgerDraftRows: nonLedgerDraftRows.length,
      sourceCurrentnessFailures: failures.length,
      cleanupAuthorizedRows: 0,
      executableRows: 0
    },
    bridgeRows,
    acceptedLedgerRows,
    missingCanonicalDraftRows,
    nonLedgerDraftRows,
    boundary: {
      evidenceOnly: true,
      recordsAuthorization: false,
      recordsExecutionInstruction: false,
      recordsOwnerApproval: false,
      mergeAuthorized: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false,
      dirtyRootDeployAuthorized: false,
      physicalCleanupAuthorized: false
    }
  };
}

export function stableLedgerToCanonicalAuthorizationBridgeProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    bridgeKind: payload.bridgeKind,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: payload.sourceArtifacts,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    summary: payload.summary,
    bridgeRows: payload.bridgeRows,
    acceptedLedgerRows: payload.acceptedLedgerRows,
    missingCanonicalDraftRows: payload.missingCanonicalDraftRows,
    nonLedgerDraftRows: payload.nonLedgerDraftRows,
    boundary: payload.boundary
  };
}

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function markdown(payload) {
  const bridgeRows = (payload.bridgeRows ?? []).map((row) => (
    `| \`${cell(row.approvalId)}\` | ${cell(row.approvalKind)} | ${cell(row.owner)} | ${cell(row.selectedFinalState)} | ${cell(row.ledgerDecisionStatus)} |`
  )).join("\n") || "| none | n/a | n/a | n/a | n/a |";
  const copyable = (payload.bridgeRows ?? []).map((row) => `### ${row.approvalId}

\`\`\`text
${row.canonicalAuthorizationText}
\`\`\`
`).join("\n") || "No ledger-backed pending canonical rows.";
  const nonLedgerRows = (payload.nonLedgerDraftRows ?? []).map((row) => (
    `| \`${cell(row.approvalId)}\` | ${cell(row.approvalKind)} | ${cell(row.owner)} | ${cell(row.reason)} |`
  )).join("\n") || "| none | n/a | n/a | n/a |";

  return `# A25 Ledger-To-Canonical Authorization Bridge

Generated: ${payload.generatedAt}

This A25-owned bridge compares the owner-approved final-state ledger with the canonical owner-authorization input file. It is evidence-only. It does not record authorization rows, run Git commands, authorize cleanup, authorize merge, or authorize deploy.

## Summary

- Ledger entries: ${payload.summary.ledgerEntries}
- Ledger-approved rows: ${payload.summary.ledgerApprovedRows}
- Canonical authorization rows already present: ${payload.summary.canonicalAuthorizationRows}
- Canonical draft rows: ${payload.summary.canonicalDraftRows}
- Ledger-backed canonical rows already present: ${payload.summary.ledgerBackedCanonicalRows}
- Ledger-backed rows still pending canonical recording: ${payload.summary.ledgerBackedPendingCanonicalRows}
- Missing canonical draft rows: ${payload.summary.missingCanonicalDraftRows}
- Non-ledger draft rows: ${payload.summary.nonLedgerDraftRows}
- Cleanup-authorized rows: 0
- Executable rows: 0
- Deploy authorized: false

## Ledger-Backed Pending Rows

| Approval ID | Kind | Owner | Ledger final state | Ledger status |
| --- | --- | --- | --- | --- |
${bridgeRows}

## Copyable Canonical Authorization Texts

${copyable}

## Non-Ledger Draft Rows

| Approval ID | Kind | Owner | Reason |
| --- | --- | --- | --- |
${nonLedgerRows}
`;
}

function main() {
  const payload = buildLedgerToCanonicalAuthorizationBridge();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(LEDGER_TO_CANONICAL_AUTHORIZATION_BRIDGE_PATHS.latestJson, json);
  write(LEDGER_TO_CANONICAL_AUTHORIZATION_BRIDGE_PATHS.datedJson, json);
  write(LEDGER_TO_CANONICAL_AUTHORIZATION_BRIDGE_PATHS.latestMarkdown, md);
  write(LEDGER_TO_CANONICAL_AUTHORIZATION_BRIDGE_PATHS.datedMarkdown, md);
  console.log(JSON.stringify({
    latestJson: LEDGER_TO_CANONICAL_AUTHORIZATION_BRIDGE_PATHS.latestJson,
    latestMarkdown: LEDGER_TO_CANONICAL_AUTHORIZATION_BRIDGE_PATHS.latestMarkdown,
    ledgerApprovedRows: payload.summary.ledgerApprovedRows,
    ledgerBackedPendingCanonicalRows: payload.summary.ledgerBackedPendingCanonicalRows,
    nonLedgerDraftRows: payload.summary.nonLedgerDraftRows,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
