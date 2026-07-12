#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFERRED_AGGREGATE_VALIDATION_COMMANDS,
  OWNER_ACTIVE_WORKTREE_HOLD,
  SAFE_POST_INPUT_VALIDATION_COMMANDS
} from "./validation-hold.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const OWNER_CLOSURE_INPUT_READINESS_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  nextOwnerAuthorizationsGate: "coordination/release-intake/latest-A25-next-owner-authorizations-current-gate.json",
  nextOwnerAuthorizationExecutionPreviewGate: "coordination/release-intake/latest-A25-next-owner-authorization-execution-preview-current-gate.json",
  wave01PackageResyncAuthorizationsGate: "coordination/release-intake/latest-A25-wave01-package-resync-owner-authorizations-current-gate.json",
  ownerPackageBlockerReportRecordsGate: "coordination/release-intake/latest-A25-owner-package-blocker-report-records-current-gate.json",
  ownerClosureQueue: "coordination/release-intake/latest-A25-owner-closure-action-queue.json",
  nextOwnerDecisionFocus: "coordination/release-intake/latest-A25-next-owner-decision-focus-packet.json",
  latestJson: "coordination/release-intake/latest-A25-owner-closure-input-readiness.json",
  latestMarkdown: "coordination/release-intake/latest-A25-owner-closure-input-readiness.md",
  datedJson: `coordination/release-intake/${date}-A25-owner-closure-input-readiness.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-owner-closure-input-readiness.md`
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

function assertCurrentGate(label, gate, dirtyMap) {
  const failures = [];
  if (gate.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push(`${label} dirty-map signature is stale`);
  if (gate.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) failures.push(`${label} expanded dirty entry count is stale`);
  if (Array.isArray(gate.failures) && gate.failures.length > 0) failures.push(`${label} has ${gate.failures.length} gate failures`);
  return failures;
}

function inputBlock(id, label, gate, sourceFile, pendingKey, validKey, totalKey, presentKey) {
  const pendingRows = Number(gate[pendingKey] ?? 0);
  const validRows = Number(gate[validKey] ?? 0);
  const totalRows = Number(gate[totalKey] ?? 0);
  const filePresent = gate[presentKey] === true;
  return {
    id,
    label,
    sourceFile,
    filePresent,
    totalRows,
    validRows,
    pendingRows,
    cleanupAuthorizedRows: Number(gate.cleanupAuthorizedRows ?? 0),
    executableRows: Number(gate.executableRows ?? 0),
    ready: pendingRows === 0 && validRows === totalRows && totalRows > 0,
    status: pendingRows === 0 && validRows === totalRows && totalRows > 0 ? "ready" : "waiting-for-owner-input",
    note: filePresent
      ? "Owner input file is present but must remain non-executable until a separate execution instruction exists."
      : "Owner input file is absent."
  };
}

export function buildOwnerClosureInputReadiness() {
  const dirtyMap = readJson(OWNER_CLOSURE_INPUT_READINESS_PATHS.dirtyMap);
  const nextOwnerAuthorizationsGate = readJson(OWNER_CLOSURE_INPUT_READINESS_PATHS.nextOwnerAuthorizationsGate);
  const executionPreviewGate = readJson(OWNER_CLOSURE_INPUT_READINESS_PATHS.nextOwnerAuthorizationExecutionPreviewGate);
  const wave01Gate = readJson(OWNER_CLOSURE_INPUT_READINESS_PATHS.wave01PackageResyncAuthorizationsGate);
  const blockerRecordsGate = readJson(OWNER_CLOSURE_INPUT_READINESS_PATHS.ownerPackageBlockerReportRecordsGate);
  const ownerClosureQueue = readJson(OWNER_CLOSURE_INPUT_READINESS_PATHS.ownerClosureQueue);
  const nextOwnerDecisionFocus = readJson(OWNER_CLOSURE_INPUT_READINESS_PATHS.nextOwnerDecisionFocus);

  const inputGateFailures = [
    ...assertCurrentGate("next owner authorizations gate", nextOwnerAuthorizationsGate, dirtyMap),
    ...assertCurrentGate("next owner authorization execution preview gate", executionPreviewGate, dirtyMap),
    ...assertCurrentGate("Wave 01 package resync authorizations gate", wave01Gate, dirtyMap),
    ...assertCurrentGate("owner package blocker report records gate", blockerRecordsGate, dirtyMap),
    ...assertCurrentGate("owner closure action queue", ownerClosureQueue, dirtyMap),
    ...assertCurrentGate("next owner decision focus packet", nextOwnerDecisionFocus, dirtyMap)
  ];

  const inputBlocks = [
    inputBlock(
      "canonical-next-owner-authorizations",
      "Canonical next-owner authorizations",
      nextOwnerAuthorizationsGate,
      nextOwnerAuthorizationsGate.authorizationFile,
      "pendingRows",
      "authorizedRows",
      "starterRows",
      "authorizationFilePresent"
    ),
    inputBlock(
      "next-owner-authorization-execution-preview",
      "Next-owner authorization execution preview",
      executionPreviewGate,
      OWNER_CLOSURE_INPUT_READINESS_PATHS.nextOwnerAuthorizationExecutionPreviewGate,
      "starterRows",
      "validAuthorizationRows",
      "starterRows",
      "authorizationFilePresent"
    ),
    inputBlock(
      "wave01-package-resync-authorizations",
      "Wave 01 package-resync owner authorizations",
      wave01Gate,
      wave01Gate.authorizationFile,
      "pendingRows",
      "authorizedRows",
      "templateRows",
      "authorizationFilePresent"
    ),
    inputBlock(
      "owner-package-blocker-report-records",
      "Owner package blocker report records",
      blockerRecordsGate,
      blockerRecordsGate.recordsFile,
      "pendingRecords",
      "validRecords",
      "templateRows",
      "recordsFilePresent"
    )
  ];

  const canonicalAuthorizationBlock = inputBlocks.find((row) => row.id === "canonical-next-owner-authorizations");
  const blockerReportBlock = inputBlocks.find((row) => row.id === "owner-package-blocker-report-records");
  const ownerInputsReady =
    inputGateFailures.length === 0 &&
    canonicalAuthorizationBlock?.pendingRows === 0 &&
    blockerReportBlock?.pendingRows === 0 &&
    executionPreviewGate.commandPreviewRows > 0 &&
    executionPreviewGate.executableRows === 0;

  const summary = {
    ownerInputsReady,
    inputBlocks: inputBlocks.length,
    pendingCanonicalAuthorizationRows: canonicalAuthorizationBlock?.pendingRows ?? 0,
    pendingWave01AuthorizationRows: inputBlocks.find((row) => row.id === "wave01-package-resync-authorizations")?.pendingRows ?? 0,
    pendingOwnerBlockerReportRecords: blockerReportBlock?.pendingRows ?? 0,
    validAuthorizationRows: canonicalAuthorizationBlock?.validRows ?? 0,
    commandPreviewRows: Number(executionPreviewGate.commandPreviewRows ?? 0),
    ownerClosurePendingItems: Number(ownerClosureQueue.summary?.pendingItems ?? 0),
    nextOwnerDecisionRows: Number(nextOwnerDecisionFocus.summary?.totalDecisionRows ?? 0),
    cleanupAuthorizedRows: inputBlocks.reduce((sum, row) => sum + row.cleanupAuthorizedRows, 0),
    executableRows: inputBlocks.reduce((sum, row) => sum + row.executableRows, 0)
  };

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    sourceArtifacts: {
      nextOwnerAuthorizationsGateCheckedAt: nextOwnerAuthorizationsGate.checkedAt,
      nextOwnerAuthorizationExecutionPreviewGateCheckedAt: executionPreviewGate.checkedAt,
      wave01PackageResyncAuthorizationsGateCheckedAt: wave01Gate.checkedAt,
      ownerPackageBlockerReportRecordsGateCheckedAt: blockerRecordsGate.checkedAt,
      ownerClosureQueueGeneratedAt: ownerClosureQueue.generatedAt,
      nextOwnerDecisionFocusGeneratedAt: nextOwnerDecisionFocus.generatedAt
    },
    inputGateFailures,
    inputBlocks,
    validationHold: OWNER_ACTIVE_WORKTREE_HOLD,
    nextValidationCommands: SAFE_POST_INPUT_VALIDATION_COMMANDS,
    deferredValidationCommands: DEFERRED_AGGREGATE_VALIDATION_COMMANDS,
    summary,
    boundary: {
      evidenceOnly: true,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false
    }
  };
}

export function stableOwnerClosureInputReadinessProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    inputGateFailures: payload.inputGateFailures,
    inputBlocks: payload.inputBlocks,
    validationHold: payload.validationHold,
    nextValidationCommands: payload.nextValidationCommands,
    deferredValidationCommands: payload.deferredValidationCommands,
    summary: payload.summary,
    boundary: payload.boundary
  };
}

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function markdown(payload) {
  const rows = payload.inputBlocks.map((row) => (
    `| ${cell(row.label)} | \`${cell(row.sourceFile)}\` | ${row.filePresent ? "yes" : "no"} | ${row.totalRows} | ${row.validRows} | ${row.pendingRows} | ${row.executableRows} |`
  )).join("\n");
  const safeCommandRows = payload.nextValidationCommands.map((command) => `- \`${command}\``).join("\n");
  const deferredCommandRows = payload.deferredValidationCommands.map((command) => `- \`${command}\``).join("\n");

  return `# A25 Owner Closure Input Readiness

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This artifact is owner-input readiness evidence only. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, cleanup apply, or any other physical cleanup.

## Summary

- Owner inputs ready: ${payload.summary.ownerInputsReady ? "yes" : "no"}
- Pending canonical authorization rows: ${payload.summary.pendingCanonicalAuthorizationRows}
- Pending Wave 01 authorization rows: ${payload.summary.pendingWave01AuthorizationRows}
- Pending owner blocker report records: ${payload.summary.pendingOwnerBlockerReportRecords}
- Valid authorization rows: ${payload.summary.validAuthorizationRows}
- Command preview rows: ${payload.summary.commandPreviewRows}
- Owner closure pending items: ${payload.summary.ownerClosurePendingItems}
- Next owner decision rows: ${payload.summary.nextOwnerDecisionRows}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Input Blocks

| Input | Source file | File present | Total rows | Valid rows | Pending rows | Executable rows |
| --- | --- | --- | ---: | ---: | ---: | ---: |
${rows}

## Input Gate Failures

${payload.inputGateFailures.length ? payload.inputGateFailures.map((item) => `- ${item}`).join("\n") : "- none"}

## Validation Hold

Status: ${payload.validationHold.status}

Active owner worktree: \`${payload.validationHold.activeWorktreePath}\`

Reason: ${payload.validationHold.reason}

Resume condition: ${payload.validationHold.resumeCondition}

Safe post-input validation commands:

${safeCommandRows}

Deferred aggregate validation commands:

${deferredCommandRows}
`;
}

function main() {
  const payload = buildOwnerClosureInputReadiness();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(OWNER_CLOSURE_INPUT_READINESS_PATHS.latestJson, json);
  write(OWNER_CLOSURE_INPUT_READINESS_PATHS.datedJson, json);
  write(OWNER_CLOSURE_INPUT_READINESS_PATHS.latestMarkdown, md);
  write(OWNER_CLOSURE_INPUT_READINESS_PATHS.datedMarkdown, md);

  console.log(JSON.stringify({
    latestJson: OWNER_CLOSURE_INPUT_READINESS_PATHS.latestJson,
    latestMarkdown: OWNER_CLOSURE_INPUT_READINESS_PATHS.latestMarkdown,
    ownerInputsReady: payload.summary.ownerInputsReady,
    pendingCanonicalAuthorizationRows: payload.summary.pendingCanonicalAuthorizationRows,
    pendingOwnerBlockerReportRecords: payload.summary.pendingOwnerBlockerReportRecords,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
