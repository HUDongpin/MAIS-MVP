#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_RECORDING_INTAKE_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  acceptanceDocket: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch-acceptance-docket.json",
  ownerInputScaffold: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch-owner-input-scaffold.json",
  ownerInputScaffoldGate: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch-owner-input-scaffold-current-gate.json",
  canonicalAuthorizations: "coordination/release-intake/latest-A25-next-owner-authorizations.json",
  canonicalAuthorizationsGate: "coordination/release-intake/latest-A25-next-owner-authorizations-current-gate.json",
  latestJson: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch-recording-intake.json",
  latestMarkdown: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch-recording-intake.md",
  datedJson: `coordination/release-intake/${date}-A25-next-owner-authorization-focus-batch-recording-intake.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-next-owner-authorization-focus-batch-recording-intake.md`
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

function sameArray(left, right) {
  return JSON.stringify(left ?? []) === JSON.stringify(right ?? []);
}

function sourceCurrentnessFailures({
  dirtyMap,
  acceptanceDocket,
  ownerInputScaffold,
  ownerInputScaffoldGate,
  canonicalAuthorizations,
  canonicalAuthorizationsGate
}) {
  const failures = [];
  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? 0;
  for (const [label, artifact] of [
    ["focus batch acceptance docket", acceptanceDocket],
    ["focus batch owner-input scaffold", ownerInputScaffold],
    ["canonical authorizations", canonicalAuthorizations],
    ["owner-input scaffold gate", ownerInputScaffoldGate],
    ["canonical authorizations gate", canonicalAuthorizationsGate]
  ]) {
    if (artifact.dirtyMapStatusSignature !== expectedSignature) failures.push(`${label} dirty-map signature is stale`);
    if (artifact.expandedStatusEntries !== expectedEntries) failures.push(`${label} expanded dirty entry count is stale`);
  }
  if ((acceptanceDocket.sourceCurrentnessFailures ?? []).length > 0) {
    failures.push("focus batch acceptance docket has source currentness failures");
  }
  if ((ownerInputScaffold.sourceCurrentnessFailures ?? []).length > 0) {
    failures.push("focus batch owner-input scaffold has source currentness failures");
  }
  if ((ownerInputScaffoldGate.failures ?? []).length > 0) {
    failures.push("focus batch owner-input scaffold gate has failures");
  }
  if ((canonicalAuthorizationsGate.failures ?? []).length > 0) {
    failures.push("canonical authorizations gate has failures");
  }
  if (canonicalAuthorizations.cleanupAuthorized === true) failures.push("canonical authorizations must not be cleanup-authorized");
  if (canonicalAuthorizations.executableNow === true) failures.push("canonical authorizations must not be executable");
  return failures;
}

function rowStatus(row) {
  if (row.cleanupAuthorized === true || row.executableNow === true) return "unsafe";
  if (row.accepted === true && row.canonicalRowPresent === true) return "accepted";
  if (row.accepted === false && row.canonicalDraftRowPresent === true) return "waiting-for-owner-authorization";
  return "missing-owner-input-row";
}

function intakeStatus({ sourceFailures, rows, summary }) {
  if (sourceFailures.length > 0) return "not-ready-source-stale";
  if (rows.length === 0) return "no-focus-batch";
  if (summary.cleanupAuthorizedRows > 0 || summary.executableRows > 0) return "not-ready-unsafe-authorization";
  if (summary.ownerInputVisibleRows !== rows.length) return "not-ready-missing-owner-input-visibility";
  if (summary.acceptedRows === rows.length) return "ready-for-post-input-validation";
  return "waiting-for-owner-authorization";
}

function buildChecks({ sourceFailures, rows, summary, status }) {
  return [
    {
      id: "source-current",
      status: sourceFailures.length === 0 ? "pass" : "fail",
      detail: `source currentness failures=${sourceFailures.length}`
    },
    {
      id: "focus-rows-present",
      status: rows.length > 0 || status === "no-focus-batch" ? "pass" : "fail",
      detail: `focusBatchRows=${rows.length}`
    },
    {
      id: "owner-input-visible",
      status: summary.ownerInputVisibleRows === rows.length ? "pass" : "fail",
      detail: `ownerInputVisibleRows=${summary.ownerInputVisibleRows}/${rows.length}`
    },
    {
      id: "accepted-plus-pending",
      status: summary.acceptedRows + summary.pendingRows === rows.length ? "pass" : "fail",
      detail: `accepted=${summary.acceptedRows}; pending=${summary.pendingRows}; rows=${rows.length}`
    },
    {
      id: "pending-rows-have-drafts",
      status: rows.every((row) => row.accepted || row.canonicalDraftRowPresent) ? "pass" : "fail",
      detail: "pending rows must remain visible as canonical draft rows"
    },
    {
      id: "accepted-rows-have-canonical-records",
      status: rows.every((row) => !row.accepted || row.canonicalRowPresent) ? "pass" : "fail",
      detail: "accepted rows must have canonical authorization rows"
    },
    {
      id: "safe-non-executable",
      status: summary.cleanupAuthorizedRows === 0 && summary.executableRows === 0 ? "pass" : "fail",
      detail: `cleanupAuthorizedRows=${summary.cleanupAuthorizedRows}; executableRows=${summary.executableRows}`
    },
    {
      id: "intake-status-coherent",
      status: [
        "waiting-for-owner-authorization",
        "ready-for-post-input-validation",
        "not-ready-source-stale",
        "no-focus-batch",
        "not-ready-unsafe-authorization",
        "not-ready-missing-owner-input-visibility"
      ].includes(status) ? "pass" : "fail",
      detail: `intakeStatus=${status}`
    }
  ];
}

export function buildNextOwnerAuthorizationFocusBatchRecordingIntake() {
  const dirtyMap = readJson(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_RECORDING_INTAKE_PATHS.dirtyMap);
  const acceptanceDocket = readJson(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_RECORDING_INTAKE_PATHS.acceptanceDocket);
  const ownerInputScaffold = readJson(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_RECORDING_INTAKE_PATHS.ownerInputScaffold);
  const ownerInputScaffoldGate = readJson(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_RECORDING_INTAKE_PATHS.ownerInputScaffoldGate);
  const canonicalAuthorizations = readJson(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_RECORDING_INTAKE_PATHS.canonicalAuthorizations);
  const canonicalAuthorizationsGate = readJson(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_RECORDING_INTAKE_PATHS.canonicalAuthorizationsGate);
  const sourceFailures = sourceCurrentnessFailures({
    dirtyMap,
    acceptanceDocket,
    ownerInputScaffold,
    ownerInputScaffoldGate,
    canonicalAuthorizations,
    canonicalAuthorizationsGate
  });
  const rows = (ownerInputScaffold.ownerInputRows ?? []).map((row) => ({
    approvalId: row.approvalId,
    approvalKind: row.approvalKind,
    owner: row.owner,
    path: row.path,
    sourceRoundId: row.sourceRoundId,
    canonicalDraftRowPresent: row.canonicalDraftRowPresent === true,
    canonicalRowPresent: row.canonicalRowPresent === true,
    accepted: row.accepted === true,
    rowStatus: rowStatus(row),
    nextOwnerInputAction: row.nextOwnerInputAction,
    requiredAuthorizationText: row.requiredAuthorizationText,
    recommendedAuthorizationText: row.recommendedAuthorizationText,
    ledgerSelectedFinalState: row.ledgerSelectedFinalState,
    ledgerDecisionStatus: row.ledgerDecisionStatus,
    cleanupAuthorized: row.cleanupAuthorized === true,
    executableNow: row.executableNow === true
  }));
  const acceptedRows = rows.filter((row) => row.accepted);
  const pendingRows = rows.filter((row) => !row.accepted);
  const ownerInputVisibleRows = rows.filter((row) => row.canonicalDraftRowPresent || row.canonicalRowPresent).length;
  const cleanupAuthorizedRows = rows.filter((row) => row.cleanupAuthorized).length;
  const executableRows = rows.filter((row) => row.executableNow).length;
  const summary = {
    focusBatchRows: rows.length,
    acceptedRows: acceptedRows.length,
    pendingRows: pendingRows.length,
    heldRows: count(ownerInputScaffold.summary?.heldRows),
    canonicalDraftVisibleRows: count(ownerInputScaffold.summary?.canonicalDraftVisibleRows),
    canonicalAuthorizationVisibleRows: count(ownerInputScaffold.summary?.canonicalAuthorizationVisibleRows),
    ownerInputVisibleRows,
    canonicalAuthorizationsGateAuthorizedRows: count(canonicalAuthorizationsGate.authorizedRows),
    canonicalAuthorizationsGatePendingRows: count(canonicalAuthorizationsGate.pendingRows),
    postInputValidationCommands: (acceptanceDocket.nextValidationCommands ?? []).length,
    deferredAggregateValidationCommands: (acceptanceDocket.deferredAggregateValidationCommands ?? []).length,
    cleanupAuthorizedRows,
    executableRows,
    sourceCurrentnessFailures: sourceFailures.length
  };
  const status = intakeStatus({ sourceFailures, rows, summary });
  const checks = buildChecks({ sourceFailures, rows, summary, status });
  const failedChecks = checks.filter((row) => row.status !== "pass");

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? 0,
    sourceArtifacts: {
      acceptanceDocketGeneratedAt: acceptanceDocket.generatedAt,
      ownerInputScaffoldGeneratedAt: ownerInputScaffold.generatedAt,
      ownerInputScaffoldGateCheckedAt: ownerInputScaffoldGate.checkedAt,
      canonicalAuthorizationsGeneratedAt: canonicalAuthorizations.generatedAt,
      canonicalAuthorizationsGateCheckedAt: canonicalAuthorizationsGate.checkedAt
    },
    sourceCurrentnessFailures: sourceFailures,
    canonicalTarget: NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_RECORDING_INTAKE_PATHS.canonicalAuthorizations,
    batchId: ownerInputScaffold.batchId ?? acceptanceDocket.batchId ?? "",
    intakeStatus: failedChecks.length === 0 ? status : "not-ready-check-failures",
    focusBatchRows: rows,
    heldRows: ownerInputScaffold.heldRows ?? acceptanceDocket.heldRows ?? [],
    postInputValidationCommands: acceptanceDocket.nextValidationCommands ?? [],
    deferredAggregateValidationCommands: acceptanceDocket.deferredAggregateValidationCommands ?? [],
    checks,
    summary,
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

export function stableNextOwnerAuthorizationFocusBatchRecordingIntakeProjection(payload) {
  const sourceArtifacts = { ...(payload.sourceArtifacts ?? {}) };
  delete sourceArtifacts.ownerInputScaffoldGateCheckedAt;
  delete sourceArtifacts.canonicalAuthorizationsGateCheckedAt;
  return {
    repoRoot: payload.repoRoot,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    canonicalTarget: payload.canonicalTarget,
    batchId: payload.batchId,
    intakeStatus: payload.intakeStatus,
    focusBatchRows: payload.focusBatchRows,
    heldRows: payload.heldRows,
    postInputValidationCommands: payload.postInputValidationCommands,
    deferredAggregateValidationCommands: payload.deferredAggregateValidationCommands,
    checks: payload.checks,
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
  const rows = payload.focusBatchRows.map((row, index) => (
    `| ${index + 1} | \`${cell(row.approvalId)}\` | ${cell(row.owner)} | ${row.canonicalDraftRowPresent ? "yes" : "no"} | ${row.canonicalRowPresent ? "yes" : "no"} | ${row.accepted ? "yes" : "no"} | ${cell(row.rowStatus)} |`
  )).join("\n");
  const checkRows = payload.checks.map((row) => (
    `| ${cell(row.id)} | ${row.status} | ${cell(row.detail)} |`
  )).join("\n");

  return `# A25 Next Owner Authorization Focus Batch Recording Intake

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

Canonical target: \`${payload.canonicalTarget}\`

This intake is evidence-only. It checks whether the current owner authorization focus batch has been promoted from draft rows into canonical owner authorization rows. It does not write owner approval, record execution instruction, authorize merge, authorize cleanup, stage, commit, clean, reset, remove worktrees, delete files, push, or deploy.

## Summary

- Batch ID: \`${payload.batchId}\`
- Intake status: \`${payload.intakeStatus}\`
- Focus batch rows: ${payload.summary.focusBatchRows}
- Accepted rows: ${payload.summary.acceptedRows}
- Pending rows: ${payload.summary.pendingRows}
- Held rows: ${payload.summary.heldRows}
- Canonical draft visible rows: ${payload.summary.canonicalDraftVisibleRows}
- Canonical authorization visible rows: ${payload.summary.canonicalAuthorizationVisibleRows}
- Owner-input visible rows: ${payload.summary.ownerInputVisibleRows}
- Canonical gate authorized rows: ${payload.summary.canonicalAuthorizationsGateAuthorizedRows}
- Canonical gate pending rows: ${payload.summary.canonicalAuthorizationsGatePendingRows}
- Post-input validation commands: ${payload.summary.postInputValidationCommands}
- Deferred aggregate validation commands: ${payload.summary.deferredAggregateValidationCommands}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}
- Source currentness failures: ${payload.summary.sourceCurrentnessFailures}

## Focus Batch Rows

| # | Approval ID | Owner | Draft visible | Canonical accepted row | Accepted | Row status |
| ---: | --- | --- | --- | --- | --- | --- |
${rows}

## Checks

| Check | Status | Detail |
| --- | --- | --- |
${checkRows}

## Post-Input Validation Commands

${bullet(payload.postInputValidationCommands.map((command) => `\`${command}\``))}

## Deferred Aggregate Validation Commands

${bullet(payload.deferredAggregateValidationCommands.map((command) => `\`${command}\``))}

## Boundary

Draft rows are not approvals. Accepted focus rows only mean the canonical owner-authorization input is complete enough for post-input validation. Merge and cleanup still require clean-source validation, separate execution instructions, and owner-approved Git operations.
`;
}

function main() {
  const payload = buildNextOwnerAuthorizationFocusBatchRecordingIntake();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_RECORDING_INTAKE_PATHS.latestJson, json);
  write(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_RECORDING_INTAKE_PATHS.datedJson, json);
  write(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_RECORDING_INTAKE_PATHS.latestMarkdown, md);
  write(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_RECORDING_INTAKE_PATHS.datedMarkdown, md);

  console.log(JSON.stringify({
    latestJson: NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_RECORDING_INTAKE_PATHS.latestJson,
    latestMarkdown: NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_RECORDING_INTAKE_PATHS.latestMarkdown,
    intakeStatus: payload.intakeStatus,
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
