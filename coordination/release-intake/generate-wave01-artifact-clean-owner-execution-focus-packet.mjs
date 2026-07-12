#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();
const expectedCwd = "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance";

export const WAVE01_ARTIFACT_CLEAN_OWNER_EXECUTION_FOCUS_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  batchRequest: "coordination/release-intake/latest-A25-wave01-artifact-clean-batch-execution-instruction-request.json",
  batchRequestGate: "coordination/release-intake/latest-A25-wave01-artifact-clean-batch-execution-instruction-request-current-gate.json",
  intake: "coordination/release-intake/latest-A25-wave01-artifact-clean-batch-execution-instruction-intake.json",
  intakeGate: "coordination/release-intake/latest-A25-wave01-artifact-clean-batch-execution-instruction-intake-current-gate.json",
  ownerInput: "coordination/release-intake/latest-A25-wave01-artifact-clean-batch-execution-instruction-owner-input.json",
  recordingDryRun: "coordination/release-intake/latest-A25-wave01-artifact-clean-execution-instruction-recording-dry-run.json",
  recordingGate: "coordination/release-intake/latest-A25-wave01-artifact-clean-execution-instruction-recording-current-gate.json",
  guardedPlan: "coordination/release-intake/latest-A25-wave01-artifact-clean-guarded-execution-plan.json",
  guardedPlanGate: "coordination/release-intake/latest-A25-wave01-artifact-clean-guarded-execution-plan-current-gate.json",
  guardedExecutorDryRun: "coordination/release-intake/latest-A25-wave01-artifact-clean-guarded-executor-dry-run.json",
  guardedExecutorGate: "coordination/release-intake/latest-A25-wave01-artifact-clean-guarded-executor-current-gate.json",
  instructionCapsule: "coordination/release-intake/latest-A25-wave01-artifact-clean-execution-instruction-capsule.json",
  latestJson: "coordination/release-intake/latest-A25-wave01-artifact-clean-owner-execution-focus-packet.json",
  latestMarkdown: "coordination/release-intake/latest-A25-wave01-artifact-clean-owner-execution-focus-packet.md",
  datedJson: `coordination/release-intake/${date}-A25-wave01-artifact-clean-owner-execution-focus-packet.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-wave01-artifact-clean-owner-execution-focus-packet.md`
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

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function blankOwnerInput(ownerInput) {
  return !nonEmptyString(ownerInput.ownerExecutionText) &&
    !nonEmptyString(ownerInput.approvedBy) &&
    !nonEmptyString(ownerInput.approvedAt) &&
    !nonEmptyString(ownerInput.notes);
}

function sameStringArray(left, right) {
  return JSON.stringify([...(left ?? [])].sort()) === JSON.stringify([...(right ?? [])].sort());
}

function commandFor(row) {
  return row.command ?? row.exactCommandSequence?.[0] ?? "";
}

function collectTargetRows(batchRequest, guardedExecutor) {
  const byApprovalId = new Map((guardedExecutor.targetRows ?? []).map((row) => [row.approvalId, row]));
  return (batchRequest.approvalIds ?? []).map((approvalId, index) => {
    const executorRow = byApprovalId.get(approvalId) ?? {};
    return {
      order: index + 1,
      approvalId,
      packageFile: batchRequest.packageFiles?.[index] ?? executorRow.packageFile ?? "",
      command: batchRequest.exactCommandSequence?.[index] ?? commandFor(executorRow),
      cwd: executorRow.cwd ?? expectedCwd,
      statusShort: executorRow.statusShort ?? "",
      dryRunOutput: executorRow.dryRunOutput ?? "",
      targetStillDirty: executorRow.targetStillDirty === true,
      targetAlreadyClean: executorRow.targetAlreadyClean === true,
      cleanupAuthorized: executorRow.cleanupAuthorized === true,
      executableNow: executorRow.executableNow === true
    };
  });
}

function sourceCurrent({ dirtyMap, artifacts }) {
  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  return artifacts.every((artifact) =>
    artifact.dirtyMapStatusSignature === expectedSignature &&
    artifact.expandedStatusEntries === expectedEntries
  );
}

function sourceGateFailures(gates) {
  return gates.reduce((count, gate) => count + (gate.failures ?? []).length, 0);
}

function boundaryFalse(payload, keys) {
  const boundary = payload.boundary ?? {};
  return keys.every((key) => boundary[key] === false);
}

function isWaitingForOwnerInput({ intake, ownerInput, ownerInputBlank, approvalIds }) {
  return intake.intakeStatus === "waiting-for-owner-input" &&
    intake.ownerInputBlank === true &&
    ownerInputBlank &&
    sameStringArray(ownerInput.applyToApprovalIds, approvalIds);
}

function isReadyToRecordInstructions({ intake, ownerInput, ownerInputBlank, approvalIds }) {
  const projection = intake.ownerInputProjection ?? {};
  return intake.intakeStatus === "ready-to-record-instruction-rows" &&
    ownerInputBlank === false &&
    sameStringArray(ownerInput.applyToApprovalIds, approvalIds) &&
    projection.ownerExecutionTextProvided === true &&
    projection.approvedByProvided === true &&
    projection.approvedAtValid === true &&
    (intake.proposedInstructionRowsDoNotRecord ?? []).length === 6;
}

function isRecordingBlocked(recordingDryRun) {
  return recordingDryRun.recorderStatus === "dry-run-blocked-owner-input" &&
    (recordingDryRun.applyPermitted ?? recordingDryRun.summary?.applyPermitted) === false &&
    (recordingDryRun.mutationsPerformed ?? recordingDryRun.summary?.mutationsPerformed) === false &&
    (recordingDryRun.summary?.recordsExecutionInstructionRows ?? -1) === 0 &&
    (recordingDryRun.summary?.existingInstructionRows ?? -1) === 0;
}

function isRecordingReady(recordingDryRun) {
  return recordingDryRun.recorderStatus === "dry-run-ready-requires-explicit-apply" &&
    (recordingDryRun.applyPermitted ?? recordingDryRun.summary?.applyPermitted) === false &&
    (recordingDryRun.mutationsPerformed ?? recordingDryRun.summary?.mutationsPerformed) === false &&
    (recordingDryRun.summary?.recordsExecutionInstructionRows ?? -1) === 0 &&
    (recordingDryRun.summary?.proposedInstructionRows ?? -1) === 6;
}

function isAlreadyRecorded(recordingDryRun) {
  return recordingDryRun.recorderStatus === "already-recorded" &&
    (recordingDryRun.applyPermitted ?? recordingDryRun.summary?.applyPermitted) === false &&
    (recordingDryRun.mutationsPerformed ?? recordingDryRun.summary?.mutationsPerformed) === false &&
    (recordingDryRun.summary?.existingInstructionRows ?? 0) >= 6;
}

function isRecordingPostClean(recordingDryRun) {
  return recordingDryRun.recorderStatus === "post-clean-verified" &&
    (recordingDryRun.applyPermitted ?? recordingDryRun.summary?.applyPermitted) === false &&
    (recordingDryRun.mutationsPerformed ?? recordingDryRun.summary?.mutationsPerformed) === false &&
    (recordingDryRun.summary?.proposedInstructionRows ?? -1) === 0 &&
    (recordingDryRun.summary?.existingInstructionRows ?? -1) === 0;
}

function isExecutorBlocked(guardedExecutorDryRun) {
  return guardedExecutorDryRun.executorStatus === "dry-run-blocked-missing-owner-execution-instruction" &&
    (guardedExecutorDryRun.applyPermitted ?? guardedExecutorDryRun.summary?.applyPermitted) === false &&
    (guardedExecutorDryRun.mutationsPerformed ?? guardedExecutorDryRun.summary?.mutationsPerformed) === false &&
    (guardedExecutorDryRun.summary?.targetDirtyRows ?? -1) === 6;
}

function isExecutorReady(guardedExecutorDryRun) {
  return guardedExecutorDryRun.executorStatus === "dry-run-ready-requires-explicit-apply" &&
    (guardedExecutorDryRun.applyPermitted ?? guardedExecutorDryRun.summary?.applyPermitted) === false &&
    (guardedExecutorDryRun.mutationsPerformed ?? guardedExecutorDryRun.summary?.mutationsPerformed) === false &&
    (guardedExecutorDryRun.summary?.targetDirtyRows ?? -1) === 6 &&
    (guardedExecutorDryRun.summary?.validInstructionRows ?? -1) === 6;
}

function isExecutorPostClean(guardedExecutorDryRun) {
  return guardedExecutorDryRun.executorStatus === "already-cleaned-and-verified" &&
    (guardedExecutorDryRun.applyPermitted ?? guardedExecutorDryRun.summary?.applyPermitted) === false &&
    (guardedExecutorDryRun.mutationsPerformed ?? guardedExecutorDryRun.summary?.mutationsPerformed) === false &&
    (guardedExecutorDryRun.summary?.targetAlreadyCleanRows ?? -1) === 6;
}

function deriveFocusStatus({ failedChecks, intake, recordingDryRun, guardedExecutorDryRun }) {
  if (failedChecks.length > 0) return "not-ready-check-failures";
  if (isExecutorPostClean(guardedExecutorDryRun)) return "post-clean-verified";
  if (isExecutorReady(guardedExecutorDryRun)) return "ready-for-guarded-execution";
  if (
    intake.intakeStatus === "ready-to-record-instruction-rows" ||
    isRecordingReady(recordingDryRun) ||
    isAlreadyRecorded(recordingDryRun)
  ) {
    return "ready-for-execution-instruction-recording";
  }
  return "waiting-for-owner-execution-instruction";
}

function buildChecks({
  dirtyMap,
  batchRequest,
  batchRequestGate,
  intake,
  intakeGate,
  ownerInput,
  recordingDryRun,
  recordingGate,
  guardedPlan,
  guardedPlanGate,
  guardedExecutorDryRun,
  guardedExecutorGate,
  targetRows
}) {
  const approvalIds = batchRequest.approvalIds ?? [];
  const commands = batchRequest.exactCommandSequence ?? [];
  const packageFiles = batchRequest.packageFiles ?? [];
  const ownerInputBlank = blankOwnerInput(ownerInput);
  const allCommandsExact = targetRows.every((row) => row.command === `git clean -f -- ${row.packageFile}`);
  const allA25Cwd = targetRows.every((row) => row.cwd === expectedCwd);
  const allWave01ArtifactTargets = targetRows.every((row) =>
    /^wave01-resync-0[2-7]-/.test(row.approvalId ?? "") &&
    /^coordination\/release-intake\/2026-06-30-A25-dirty-tree-map-20260630T\d{6}Z\.(json|md)$/.test(row.packageFile ?? "")
  );
  const text = batchRequest.batchCopyableOwnerExecutionText ?? "";
  const ownerInputLifecycleReady = isWaitingForOwnerInput({ intake, ownerInput, ownerInputBlank, approvalIds }) ||
    isReadyToRecordInstructions({ intake, ownerInput, ownerInputBlank, approvalIds }) ||
    isAlreadyRecorded(recordingDryRun) ||
    (intake.intakeStatus === "post-clean-verified" && isRecordingPostClean(recordingDryRun));
  const recordingLifecycleSafe = isRecordingBlocked(recordingDryRun) ||
    isRecordingReady(recordingDryRun) ||
    isAlreadyRecorded(recordingDryRun) ||
    isRecordingPostClean(recordingDryRun);
  const executorLifecycleSafe = isExecutorBlocked(guardedExecutorDryRun) ||
    isExecutorReady(guardedExecutorDryRun) ||
    isExecutorPostClean(guardedExecutorDryRun);

  return [
    {
      id: "source-current",
      status: sourceCurrent({
        dirtyMap,
        artifacts: [batchRequest, intake, recordingDryRun, guardedPlan, guardedExecutorDryRun]
      }) ? "pass" : "fail",
      detail: `expanded=${dirtyMap.statusCounts?.expandedStatusEntries ?? "unknown"}`
    },
    {
      id: "source-gates-passing",
      status: sourceGateFailures([
        batchRequestGate,
        intakeGate,
        recordingGate,
        guardedPlanGate,
        guardedExecutorGate
      ]) === 0 ? "pass" : "fail",
      detail: `failures=${sourceGateFailures([batchRequestGate, intakeGate, recordingGate, guardedPlanGate, guardedExecutorGate])}`
    },
    {
      id: "six-target-rows",
      status: targetRows.length === 6 && approvalIds.length === 6 && commands.length === 6 && packageFiles.length === 6 ? "pass" : "fail",
      detail: `targets=${targetRows.length}; approvals=${approvalIds.length}; commands=${commands.length}; packageFiles=${packageFiles.length}`
    },
    {
      id: "exact-a25-artifact-clean-commands",
      status: allCommandsExact && allA25Cwd && allWave01ArtifactTargets ? "pass" : "fail",
      detail: `allCommandsExact=${allCommandsExact}; allA25Cwd=${allA25Cwd}; allWave01ArtifactTargets=${allWave01ArtifactTargets}`
    },
    {
      id: "tsconfig-and-deploy-held",
      status: !approvalIds.some((approvalId) => approvalId.includes("tsconfig")) &&
        !commands.some((command) => command.includes("tsconfig")) &&
        !text.includes("tsconfig") &&
        ownerInput.deployAuthorized === false
        ? "pass"
        : "fail",
      detail: "wave01-resync-01-tsconfig-json remains held and deploy remains unauthorized"
    },
    {
      id: "owner-input-lifecycle-state",
      status: ownerInputLifecycleReady ? "pass" : "fail",
      detail: `intakeStatus=${intake.intakeStatus ?? "unknown"}; ownerInputBlank=${ownerInputBlank}; recorderStatus=${recordingDryRun.recorderStatus ?? "unknown"}`
    },
    {
      id: "recorder-lifecycle-safe",
      status: recordingLifecycleSafe ? "pass" : "fail",
      detail: `recorderStatus=${recordingDryRun.recorderStatus ?? "unknown"}; proposedRows=${recordingDryRun.summary?.proposedInstructionRows ?? 0}; existingRows=${recordingDryRun.summary?.existingInstructionRows ?? 0}`
    },
    {
      id: "guarded-executor-lifecycle-safe",
      status: executorLifecycleSafe ? "pass" : "fail",
      detail: `executorStatus=${guardedExecutorDryRun.executorStatus ?? "unknown"}; targetDirtyRows=${guardedExecutorDryRun.summary?.targetDirtyRows ?? "unknown"}; targetAlreadyCleanRows=${guardedExecutorDryRun.summary?.targetAlreadyCleanRows ?? "unknown"}`
    },
    {
      id: "copyable-text-complete",
      status: approvalIds.every((approvalId) => text.includes(`approvalId=${approvalId}`)) &&
        commands.every((command) => text.includes(`command=${command}`)) &&
        text.includes(`cwd=${expectedCwd}`) &&
        text.includes("No cleanup") &&
        text.includes("broad staging") &&
        text.includes("deploy")
        ? "pass"
        : "fail",
      detail: "batch text includes all approvalIds, commands, cwd, no-cleanup, no-broad-staging, and no-deploy terms"
    },
    {
      id: "non-executable-boundaries",
      status: boundaryFalse(batchRequest, ["recordsExecutionInstruction", "stageAuthorized", "commitAuthorized", "mergeAuthorized", "cleanupAuthorized", "executableNow", "destructiveGitAuthorized", "deployAuthorized"]) &&
        boundaryFalse(intake, ["recordsExecutionInstruction", "stageAuthorized", "commitAuthorized", "mergeAuthorized", "cleanupAuthorized", "executableNow", "destructiveGitAuthorized", "deployAuthorized"]) &&
        boundaryFalse(recordingDryRun, ["recordsExecutionInstruction", "stageAuthorized", "commitAuthorized", "mergeAuthorized", "cleanupAuthorized", "executableNow", "destructiveGitAuthorized", "deployAuthorized"]) &&
        boundaryFalse(guardedPlan, ["recordsExecutionInstruction", "stageAuthorized", "commitAuthorized", "mergeAuthorized", "cleanupAuthorized", "executableNow", "destructiveGitAuthorized", "deployAuthorized"]) &&
        boundaryFalse(guardedExecutorDryRun, ["recordsOwnerApproval", "recordsExecutionInstruction", "stageAuthorized", "commitAuthorized", "mergeAuthorized", "cleanupAuthorized", "destructiveGitAuthorized", "deployAuthorized"])
        ? "pass"
        : "fail",
      detail: "request, intake, recorder, plan, and executor remain non-executable"
    }
  ];
}

export function buildWave01ArtifactCleanOwnerExecutionFocusPacket() {
  const dirtyMap = readJson(WAVE01_ARTIFACT_CLEAN_OWNER_EXECUTION_FOCUS_PATHS.dirtyMap);
  const batchRequest = readJson(WAVE01_ARTIFACT_CLEAN_OWNER_EXECUTION_FOCUS_PATHS.batchRequest);
  const batchRequestGate = readJson(WAVE01_ARTIFACT_CLEAN_OWNER_EXECUTION_FOCUS_PATHS.batchRequestGate);
  const intake = readJson(WAVE01_ARTIFACT_CLEAN_OWNER_EXECUTION_FOCUS_PATHS.intake);
  const intakeGate = readJson(WAVE01_ARTIFACT_CLEAN_OWNER_EXECUTION_FOCUS_PATHS.intakeGate);
  const ownerInput = readJson(WAVE01_ARTIFACT_CLEAN_OWNER_EXECUTION_FOCUS_PATHS.ownerInput);
  const recordingDryRun = readJson(WAVE01_ARTIFACT_CLEAN_OWNER_EXECUTION_FOCUS_PATHS.recordingDryRun);
  const recordingGate = readJson(WAVE01_ARTIFACT_CLEAN_OWNER_EXECUTION_FOCUS_PATHS.recordingGate);
  const guardedPlan = readJson(WAVE01_ARTIFACT_CLEAN_OWNER_EXECUTION_FOCUS_PATHS.guardedPlan);
  const guardedPlanGate = readJson(WAVE01_ARTIFACT_CLEAN_OWNER_EXECUTION_FOCUS_PATHS.guardedPlanGate);
  const guardedExecutorDryRun = readJson(WAVE01_ARTIFACT_CLEAN_OWNER_EXECUTION_FOCUS_PATHS.guardedExecutorDryRun);
  const guardedExecutorGate = readJson(WAVE01_ARTIFACT_CLEAN_OWNER_EXECUTION_FOCUS_PATHS.guardedExecutorGate);
  const instructionCapsule = readJson(WAVE01_ARTIFACT_CLEAN_OWNER_EXECUTION_FOCUS_PATHS.instructionCapsule);
  const targetRows = collectTargetRows(batchRequest, guardedExecutorDryRun);
  const checks = buildChecks({
    dirtyMap,
    batchRequest,
    batchRequestGate,
    intake,
    intakeGate,
    ownerInput,
    recordingDryRun,
    recordingGate,
    guardedPlan,
    guardedPlanGate,
    guardedExecutorDryRun,
    guardedExecutorGate,
    targetRows
  });
  const failedChecks = checks.filter((row) => row.status !== "pass");
  const focusStatus = deriveFocusStatus({ failedChecks, intake, recordingDryRun, guardedExecutorDryRun });

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    focusKind: "wave01-artifact-clean-owner-execution-focus-packet",
    focusStatus,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? null,
    sourceArtifacts: {
      batchRequestGeneratedAt: batchRequest.generatedAt,
      intakeGeneratedAt: intake.generatedAt,
      ownerInputGeneratedAt: ownerInput.generatedAt ?? null,
      recordingDryRunGeneratedAt: recordingDryRun.generatedAt,
      guardedPlanGeneratedAt: guardedPlan.generatedAt,
      guardedExecutorDryRunGeneratedAt: guardedExecutorDryRun.generatedAt,
      instructionCapsuleGeneratedAt: instructionCapsule.generatedAt
    },
    ownerInputFile: WAVE01_ARTIFACT_CLEAN_OWNER_EXECUTION_FOCUS_PATHS.ownerInput,
    ownerExecutionTextRequired: batchRequest.batchCopyableOwnerExecutionText ?? "",
    heldApprovalIds: ["wave01-resync-01-tsconfig-json"],
    targetRows,
    verificationChain: [
      WAVE01_ARTIFACT_CLEAN_OWNER_EXECUTION_FOCUS_PATHS.batchRequest,
      WAVE01_ARTIFACT_CLEAN_OWNER_EXECUTION_FOCUS_PATHS.batchRequestGate,
      WAVE01_ARTIFACT_CLEAN_OWNER_EXECUTION_FOCUS_PATHS.intake,
      WAVE01_ARTIFACT_CLEAN_OWNER_EXECUTION_FOCUS_PATHS.intakeGate,
      WAVE01_ARTIFACT_CLEAN_OWNER_EXECUTION_FOCUS_PATHS.recordingDryRun,
      WAVE01_ARTIFACT_CLEAN_OWNER_EXECUTION_FOCUS_PATHS.recordingGate,
      WAVE01_ARTIFACT_CLEAN_OWNER_EXECUTION_FOCUS_PATHS.guardedPlan,
      WAVE01_ARTIFACT_CLEAN_OWNER_EXECUTION_FOCUS_PATHS.guardedPlanGate,
      WAVE01_ARTIFACT_CLEAN_OWNER_EXECUTION_FOCUS_PATHS.guardedExecutorDryRun,
      WAVE01_ARTIFACT_CLEAN_OWNER_EXECUTION_FOCUS_PATHS.guardedExecutorGate
    ],
    checks,
    summary: {
      requestRows: batchRequest.summary?.requestRows ?? 0,
      exactCommandRows: batchRequest.summary?.commandRows ?? 0,
      intakeStatus: intake.intakeStatus ?? "",
      ownerInputBlank: blankOwnerInput(ownerInput),
      recorderStatus: recordingDryRun.recorderStatus ?? "",
      executorStatus: guardedExecutorDryRun.executorStatus ?? "",
      targetRows: targetRows.length,
      targetDirtyRows: guardedExecutorDryRun.summary?.targetDirtyRows ?? 0,
      targetAlreadyCleanRows: guardedExecutorDryRun.summary?.targetAlreadyCleanRows ?? 0,
      recordsExecutionInstructionRows: recordingDryRun.summary?.recordsExecutionInstructionRows ?? 0,
      cleanupAuthorizedRows: 0,
      executableRows: 0,
      deployAuthorized: false,
      checks: checks.length,
      passingChecks: checks.length - failedChecks.length,
      failedChecks: failedChecks.length
    },
    boundary: {
      evidenceOnly: true,
      focusPacketOnly: true,
      recordsOwnerInput: false,
      recordsExecutionInstruction: false,
      stageAuthorized: false,
      commitAuthorized: false,
      mergeAuthorized: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false,
      requiresSeparateOwnerExecutionInstruction: focusStatus === "waiting-for-owner-execution-instruction",
      requiresSeparateRecordingApply: focusStatus === "waiting-for-owner-execution-instruction" || focusStatus === "ready-for-execution-instruction-recording",
      requiresSeparateGuardedExecutor: focusStatus !== "post-clean-verified"
    }
  };
}

export function stableWave01ArtifactCleanOwnerExecutionFocusProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    focusKind: payload.focusKind,
    focusStatus: payload.focusStatus,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: payload.sourceArtifacts,
    ownerInputFile: payload.ownerInputFile,
    ownerExecutionTextRequired: payload.ownerExecutionTextRequired,
    heldApprovalIds: payload.heldApprovalIds,
    targetRows: payload.targetRows,
    verificationChain: payload.verificationChain,
    checks: payload.checks,
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
  const rows = payload.targetRows.map((row) => (
    `| ${row.order} | \`${cell(row.approvalId)}\` | \`${cell(row.command)}\` | \`${cell(row.packageFile)}\` | ${row.targetStillDirty ? "yes" : "no"} |`
  )).join("\n") || "| 0 | none | none | none | no |";
  const checks = payload.checks.map((row) => (
    `| \`${cell(row.id)}\` | ${cell(row.status)} | ${cell(row.detail)} |`
  )).join("\n");
  const chain = payload.verificationChain.map((item) => `- \`${item}\``).join("\n");

  return `# A25 Wave01 Artifact-Clean Owner Execution Focus Packet

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This packet is evidence-only. It does not record owner input, does not record execution instructions, does not stage, commit, merge, clean, reset, delete, push, remove worktrees, remove branches, or deploy.

## Summary

- Focus status: ${payload.focusStatus}
- Intake status: ${payload.summary.intakeStatus}
- Recorder status: ${payload.summary.recorderStatus}
- Executor status: ${payload.summary.executorStatus}
- Request rows: ${payload.summary.requestRows}
- Exact command rows: ${payload.summary.exactCommandRows}
- Target dirty rows: ${payload.summary.targetDirtyRows}
- Records execution instruction rows: ${payload.summary.recordsExecutionInstructionRows}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}
- Deploy authorized: ${payload.summary.deployAuthorized}
- Checks: ${payload.summary.passingChecks}/${payload.summary.checks}

## Owner Execution Text Required

Copy this text only when the owner explicitly instructs A25 to record the six Wave01 artifact-clean execution-instruction rows. Copying it into the owner-input file still does not execute cleanup by itself.

${fenced(payload.ownerExecutionTextRequired)}

Owner input file: \`${payload.ownerInputFile}\`

Held approval IDs:

${payload.heldApprovalIds.map((id) => `- \`${id}\``).join("\n")}

## Exact Command Rows

| # | Approval ID | Command | Package file | Still dirty |
| ---: | --- | --- | --- | --- |
${rows}

## Verification Chain

${chain}

## Checks

| Check | Status | Detail |
| --- | --- | --- |
${checks}

## Boundary

- Records owner input: false.
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
  const payload = buildWave01ArtifactCleanOwnerExecutionFocusPacket();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  write(WAVE01_ARTIFACT_CLEAN_OWNER_EXECUTION_FOCUS_PATHS.latestJson, json);
  write(WAVE01_ARTIFACT_CLEAN_OWNER_EXECUTION_FOCUS_PATHS.datedJson, json);
  write(WAVE01_ARTIFACT_CLEAN_OWNER_EXECUTION_FOCUS_PATHS.latestMarkdown, markdown(payload));
  write(WAVE01_ARTIFACT_CLEAN_OWNER_EXECUTION_FOCUS_PATHS.datedMarkdown, markdown(payload));
  console.log(JSON.stringify({
    latestJson: WAVE01_ARTIFACT_CLEAN_OWNER_EXECUTION_FOCUS_PATHS.latestJson,
    latestMarkdown: WAVE01_ARTIFACT_CLEAN_OWNER_EXECUTION_FOCUS_PATHS.latestMarkdown,
    focusStatus: payload.focusStatus,
    requestRows: payload.summary.requestRows,
    exactCommandRows: payload.summary.exactCommandRows,
    targetDirtyRows: payload.summary.targetDirtyRows,
    recordsExecutionInstructionRows: payload.summary.recordsExecutionInstructionRows,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows,
    deployAuthorized: payload.summary.deployAuthorized,
    passingChecks: payload.summary.passingChecks,
    checks: payload.summary.checks
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
