#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();
const expectedCwd = "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance";

export const WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_REQUEST_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  executionInstructionRequestPacket: "coordination/release-intake/latest-A25-next-owner-execution-instruction-request-packet.json",
  executionInstructionRequestPacketGate: "coordination/release-intake/latest-A25-next-owner-execution-instruction-request-packet-current-gate.json",
  guardedExecutionPlan: "coordination/release-intake/latest-A25-wave01-artifact-clean-guarded-execution-plan.json",
  guardedExecutionPlanGate: "coordination/release-intake/latest-A25-wave01-artifact-clean-guarded-execution-plan-current-gate.json",
  executionInstructions: "coordination/release-intake/latest-A25-next-owner-execution-instructions.json",
  latestJson: "coordination/release-intake/latest-A25-wave01-artifact-clean-batch-execution-instruction-request.json",
  latestMarkdown: "coordination/release-intake/latest-A25-wave01-artifact-clean-batch-execution-instruction-request.md",
  datedJson: `coordination/release-intake/${date}-A25-wave01-artifact-clean-batch-execution-instruction-request.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-wave01-artifact-clean-batch-execution-instruction-request.md`
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
  return Array.from(new Set((values ?? []).filter(Boolean)));
}

function commandFor(row) {
  return row.exactCommandSequence?.[0] ?? row.instructionTemplateDoNotExecute?.command ?? "";
}

function packageFileFor(row) {
  return row.packageFiles?.[0] ?? row.instructionTemplateDoNotExecute?.packageFiles?.[0] ?? "";
}

function isWave01ArtifactCleanRequest(row) {
  const command = commandFor(row);
  const packageFile = packageFileFor(row);
  return row.status === "waiting-for-owner-execution-instruction" &&
    /^wave01-resync-0[2-7]-/.test(row.approvalId ?? "") &&
    row.owner === "A25 git hygiene and release intake" &&
    row.cwd === expectedCwd &&
    row.cleanupAuthorized === false &&
    row.executableNow === false &&
    row.packageFiles?.length === 1 &&
    row.exactCommandSequence?.length === 1 &&
    command === `git clean -f -- ${packageFile}` &&
    /^coordination\/release-intake\/2026-06-30-A25-dirty-tree-map-20260630T\d{6}Z\.(json|md)$/.test(packageFile);
}

function isWave01ArtifactCleanTarget(row) {
  const command = commandFor(row);
  const packageFile = packageFileFor(row);
  return /^wave01-resync-0[2-7]-/.test(row.approvalId ?? "") &&
    (row.cwd ?? expectedCwd) === expectedCwd &&
    row.cleanupAuthorized === false &&
    row.executableNow === false &&
    command === `git clean -f -- ${packageFile}` &&
    /^coordination\/release-intake\/2026-06-30-A25-dirty-tree-map-20260630T\d{6}Z\.(json|md)$/.test(packageFile);
}

function postCleanTargetRows(guardedPlan) {
  if (guardedPlan.planStatus !== "already-cleaned-and-verified") return [];
  return (guardedPlan.targetRows ?? [])
    .filter((row) => row.targetAlreadyClean === true && row.targetStillDirty !== true)
    .map((row) => ({
      approvalId: row.approvalId,
      owner: "A25 git hygiene and release intake",
      cwd: row.cwd,
      command: row.command,
      exactCommandSequence: [row.command],
      packageFiles: [row.packageFile],
      cleanupAuthorized: false,
      executableNow: false
    }));
}

function batchExecutionText(rows) {
  const approvalParts = rows.map((row) => `approvalId=${row.approvalId}`);
  const commandParts = rows.map((row) => `command=${commandFor(row)}`);
  return [
    "Authorize separate Wave01 A25 artifact-clean batch execution;",
    ...approvalParts.map((part) => `${part};`),
    `cwd=${expectedCwd};`,
    ...commandParts.map((part) => `${part};`),
    "No cleanup beyond the exact listed command sequence;",
    "no broad staging, commit, merge, push, reset, branch deletion, worktree removal, deploy, or unrelated file operation is authorized;",
    "approvedBy=<owner>;",
    "approvedAt=<ISO-8601>;",
    "notes=<scope, evidence reviewed, accepted risk>"
  ].join(" ");
}

function buildAcceptanceChecks({ dirtyMap, requestPacket, requestPacketGate, guardedPlan, guardedPlanGate, rows, text, batchStatus }) {
  const uniqueCwds = unique(rows.map((row) => row.cwd));
  const commands = rows.map(commandFor);
  const packageFiles = rows.map(packageFileFor);
  const allWave01ArtifactClean = batchStatus === "post-clean-verified"
    ? rows.every(isWave01ArtifactCleanTarget)
    : rows.every(isWave01ArtifactCleanRequest);
  const requestBoundary = requestPacket.boundary ?? {};
  const guardedBoundary = guardedPlan.boundary ?? {};
  return [
    {
      id: "source-current",
      status: requestPacket.dirtyMapStatusSignature === dirtyMap.statusSignature &&
        guardedPlan.dirtyMapStatusSignature === dirtyMap.statusSignature &&
        requestPacket.expandedStatusEntries === (dirtyMap.statusCounts?.expandedStatusEntries ?? null) &&
        guardedPlan.expandedStatusEntries === (dirtyMap.statusCounts?.expandedStatusEntries ?? null)
        ? "pass"
        : "fail",
      detail: `expanded=${dirtyMap.statusCounts?.expandedStatusEntries ?? "unknown"}`
    },
    {
      id: "source-gates-passing",
      status: (requestPacketGate.failures ?? []).length === 0 && (guardedPlanGate.failures ?? []).length === 0 ? "pass" : "fail",
      detail: `requestGateFailures=${(requestPacketGate.failures ?? []).length}; guardedPlanGateFailures=${(guardedPlanGate.failures ?? []).length}`
    },
    {
      id: "six-wave01-artifact-clean-requests",
      status: rows.length === 6 && allWave01ArtifactClean ? "pass" : "fail",
      detail: `rows=${rows.length}; allWave01ArtifactClean=${allWave01ArtifactClean}`
    },
    {
      id: "single-a25-closure-governance-cwd",
      status: uniqueCwds.length === 1 && uniqueCwds[0] === expectedCwd ? "pass" : "fail",
      detail: `cwdRows=${uniqueCwds.length}`
    },
    {
      id: "exact-git-clean-commands",
      status: commands.length === 6 && commands.every((command, index) => command === `git clean -f -- ${packageFiles[index]}`) ? "pass" : "fail",
      detail: `commands=${commands.length}`
    },
    {
      id: "tsconfig-hold-preserved",
      status: rows.every((row) => !(row.approvalId ?? "").includes("tsconfig")) && !text.includes("tsconfig") ? "pass" : "fail",
      detail: "batch request excludes wave01-resync-01-tsconfig-json"
    },
    {
      id: "batch-text-complete",
      status: rows.every((row) => text.includes(`approvalId=${row.approvalId}`) && text.includes(`command=${commandFor(row)}`)) &&
        text.includes(`cwd=${expectedCwd}`) &&
        text.includes("No cleanup") &&
        text.includes("broad staging") &&
        text.includes("deploy")
        ? "pass"
        : "fail",
      detail: "batch text includes each approvalId, exact command, cwd, no-cleanup, no-broad-staging, and no-deploy terms"
    },
    {
      id: "non-executable-boundary",
      status: requestBoundary.recordsExecutionInstruction === false &&
        requestBoundary.cleanupAuthorized === false &&
        requestBoundary.executableNow === false &&
        guardedBoundary.cleanupAuthorized === false &&
        guardedBoundary.executableNow === false
        ? "pass"
        : "fail",
      detail: "source packets remain request-only and non-executable"
    }
  ];
}

export function buildWave01ArtifactCleanBatchExecutionInstructionRequest() {
  const dirtyMap = readJson(WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_REQUEST_PATHS.dirtyMap);
  const requestPacket = readJson(WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_REQUEST_PATHS.executionInstructionRequestPacket);
  const requestPacketGate = readJson(WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_REQUEST_PATHS.executionInstructionRequestPacketGate);
  const guardedPlan = readJson(WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_REQUEST_PATHS.guardedExecutionPlan);
  const guardedPlanGate = readJson(WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_REQUEST_PATHS.guardedExecutionPlanGate);
  const executionInstructions = readJson(WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_REQUEST_PATHS.executionInstructions);
  const requestRows = (requestPacket.requests ?? []).filter((row) => /^wave01-resync-0[2-7]-/.test(row.approvalId ?? ""));
  const postCleanRows = requestRows.length === 0 ? postCleanTargetRows(guardedPlan) : [];
  const rows = postCleanRows.length === 6 ? postCleanRows : requestRows;
  const batchStatusCandidate = postCleanRows.length === 6
    ? "post-clean-verified"
    : "waiting-for-owner-batch-execution-instruction";
  const text = batchExecutionText(rows);
  const checks = buildAcceptanceChecks({
    dirtyMap,
    requestPacket,
    requestPacketGate,
    guardedPlan,
    guardedPlanGate,
    rows,
    text,
    batchStatus: batchStatusCandidate
  });
  const failedChecks = checks.filter((row) => row.status !== "pass");
  const commands = rows.map(commandFor);
  const packageFiles = rows.map(packageFileFor);
  const instructionTemplatesDoNotExecute = batchStatusCandidate === "post-clean-verified" ? [] : rows.map((row) => ({
    ...row.instructionTemplateDoNotExecute,
    batchExecutionTextCandidate: text,
    approvedBy: "",
    approvedAt: "",
    notes: "",
    executionText: "",
    cleanupAuthorized: false,
    executableNow: false
  }));

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    requestKind: "wave01-artifact-clean-batch-execution-instruction-request",
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? null,
    sourceArtifacts: {
      executionInstructionRequestPacketGeneratedAt: requestPacket.generatedAt,
      executionInstructionRequestPacketGatePath: WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_REQUEST_PATHS.executionInstructionRequestPacketGate,
      executionInstructionRequestPacketGateFailureCount: (requestPacketGate.failures ?? []).length,
      guardedExecutionPlanGeneratedAt: guardedPlan.generatedAt,
      guardedExecutionPlanGatePath: WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_REQUEST_PATHS.guardedExecutionPlanGate,
      guardedExecutionPlanGateFailureCount: (guardedPlanGate.failures ?? []).length,
      executionInstructionsGeneratedAt: executionInstructions.generatedAt
    },
    targetInputFile: WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_REQUEST_PATHS.executionInstructions,
    batchStatus: failedChecks.length === 0 ? batchStatusCandidate : "not-ready-check-failures",
    batchCopyableOwnerExecutionText: text,
    approvalIds: rows.map((row) => row.approvalId),
    exactCommandSequence: commands,
    packageFiles,
    instructionTemplatesDoNotExecute,
    acceptanceChecks: checks,
    summary: {
      requestRows: rows.length,
      activeRequestRows: requestRows.length,
      postCleanTargetRows: postCleanRows.length,
      commandRows: commands.length,
      packageFileRows: packageFiles.length,
      instructionRowsInFile: requestPacket.summary?.instructionRowsInFile ?? 0,
      validInstructionRows: requestPacket.summary?.validInstructionRows ?? 0,
      pendingReadyInstructionRows: requestRows.length,
      globalPendingReadyInstructionRows: requestPacket.summary?.effectivePendingReadyInstructionRows ?? 0,
      acceptanceChecks: checks.length,
      passingAcceptanceChecks: checks.length - failedChecks.length,
      failedAcceptanceChecks: failedChecks.length,
      cleanupAuthorizedRows: 0,
      executableRows: 0
    },
    boundary: {
      evidenceOnly: true,
      requestOnly: true,
      recordsExecutionInstruction: false,
      stageAuthorized: false,
      commitAuthorized: false,
      mergeAuthorized: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false,
      requiresSeparateOwnerExecutionInstruction: rows.length > 0
    }
  };
}

export function stableWave01ArtifactCleanBatchExecutionInstructionRequestProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    requestKind: payload.requestKind,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: payload.sourceArtifacts,
    targetInputFile: payload.targetInputFile,
    batchStatus: payload.batchStatus,
    batchCopyableOwnerExecutionText: payload.batchCopyableOwnerExecutionText,
    approvalIds: payload.approvalIds,
    exactCommandSequence: payload.exactCommandSequence,
    packageFiles: payload.packageFiles,
    instructionTemplatesDoNotExecute: payload.instructionTemplatesDoNotExecute,
    acceptanceChecks: payload.acceptanceChecks,
    summary: payload.summary,
    boundary: payload.boundary
  };
}

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function fenced(value) {
  return `\`\`\`text\n${value ?? ""}\n\`\`\``;
}

function markdown(payload) {
  const commandRows = payload.exactCommandSequence.map((command, index) => (
    `| ${index + 1} | \`${cell(payload.approvalIds[index])}\` | \`${cell(command)}\` | \`${cell(payload.packageFiles[index])}\` |`
  )).join("\n") || "| 0 | none | none | none |";
  const checks = payload.acceptanceChecks.map((row) => (
    `| \`${cell(row.id)}\` | ${cell(row.status)} | ${cell(row.detail)} |`
  )).join("\n");

  return `# A25 Wave01 Artifact-Clean Batch Execution Instruction Request

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This capsule is request-only. It does not record an execution instruction and does not authorize staging, committing, merging, cleanup, worktree removal, branch deletion, reset, clean, push, deploy, or Vercel release.

## Summary

- Batch status: ${payload.batchStatus}
- Request rows: ${payload.summary.requestRows}
- Command rows: ${payload.summary.commandRows}
- Pending ready instruction rows: ${payload.summary.pendingReadyInstructionRows}
- Instruction rows in file: ${payload.summary.instructionRowsInFile}
- Valid instruction rows: ${payload.summary.validInstructionRows}
- Acceptance checks: ${payload.summary.passingAcceptanceChecks}/${payload.summary.acceptanceChecks}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Batch Copyable Owner Execution Text

${fenced(payload.batchCopyableOwnerExecutionText)}

## Exact Command Sequence

| # | Approval ID | Command | Package file |
| ---: | --- | --- | --- |
${commandRows}

## How This Is Used After Owner Approval

- The batch text can be copied into each of the six matching instruction rows as \`executionText\`.
- Each instruction row must still preserve its own \`approvalId\`, \`command\`, \`cwd\`, blank-free owner fields, and \`cleanupAuthorized=false\` / \`executableNow=false\` until the validated executor consumes it.
- This batch request excludes \`wave01-resync-01-tsconfig-json\`, which remains on hold.

## Acceptance Checks

| Check | Status | Detail |
| --- | --- | --- |
${checks}

## Boundary

- Records execution instruction: false.
- Stage authorized: false.
- Commit authorized: false.
- Merge authorized: false.
- Cleanup authorized: false.
- Executable now: false.
- Destructive Git authorized: false.
- Deploy authorized: false.
`;
}

function main() {
  const payload = buildWave01ArtifactCleanBatchExecutionInstructionRequest();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_REQUEST_PATHS.latestJson, json);
  write(WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_REQUEST_PATHS.datedJson, json);
  write(WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_REQUEST_PATHS.latestMarkdown, md);
  write(WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_REQUEST_PATHS.datedMarkdown, md);
  console.log(JSON.stringify({
    latestJson: WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_REQUEST_PATHS.latestJson,
    latestMarkdown: WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_REQUEST_PATHS.latestMarkdown,
    batchStatus: payload.batchStatus,
    requestRows: payload.summary.requestRows,
    commandRows: payload.summary.commandRows,
    passingAcceptanceChecks: payload.summary.passingAcceptanceChecks,
    acceptanceChecks: payload.summary.acceptanceChecks,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
