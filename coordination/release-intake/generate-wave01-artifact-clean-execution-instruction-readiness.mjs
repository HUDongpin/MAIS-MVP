#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  executionInstructionsGate: "coordination/release-intake/latest-A25-next-owner-execution-instructions-current-gate.json",
  requestPacket: "coordination/release-intake/latest-A25-next-owner-execution-instruction-request-packet.json",
  requestPacketGate: "coordination/release-intake/latest-A25-next-owner-execution-instruction-request-packet-current-gate.json",
  acceptanceDocket: "coordination/release-intake/latest-A25-next-owner-execution-instruction-acceptance-docket.json",
  acceptanceDocketGate: "coordination/release-intake/latest-A25-next-owner-execution-instruction-acceptance-docket-current-gate.json",
  batchRequest: "coordination/release-intake/latest-A25-wave01-artifact-clean-batch-execution-instruction-request.json",
  batchRequestGate: "coordination/release-intake/latest-A25-wave01-artifact-clean-batch-execution-instruction-request-current-gate.json",
  batchIntake: "coordination/release-intake/latest-A25-wave01-artifact-clean-batch-execution-instruction-intake.json",
  batchIntakeGate: "coordination/release-intake/latest-A25-wave01-artifact-clean-batch-execution-instruction-intake-current-gate.json",
  recordingDryRun: "coordination/release-intake/latest-A25-wave01-artifact-clean-execution-instruction-recording-dry-run.json",
  recordingGate: "coordination/release-intake/latest-A25-wave01-artifact-clean-execution-instruction-recording-current-gate.json",
  guardedPlan: "coordination/release-intake/latest-A25-wave01-artifact-clean-guarded-execution-plan.json",
  guardedPlanGate: "coordination/release-intake/latest-A25-wave01-artifact-clean-guarded-execution-plan-current-gate.json",
  guardedExecutorDryRun: "coordination/release-intake/latest-A25-wave01-artifact-clean-guarded-executor-dry-run.json",
  guardedExecutorGate: "coordination/release-intake/latest-A25-wave01-artifact-clean-guarded-executor-current-gate.json",
  focusPacket: "coordination/release-intake/latest-A25-wave01-artifact-clean-owner-execution-focus-packet.json",
  focusPacketGate: "coordination/release-intake/latest-A25-wave01-artifact-clean-owner-execution-focus-packet-current-gate.json",
  postCleanPlan: "coordination/release-intake/latest-A25-wave01-artifact-clean-post-clean-verification-plan.json",
  postCleanPlanGate: "coordination/release-intake/latest-A25-wave01-artifact-clean-post-clean-verification-plan-current-gate.json",
  latestJson: "coordination/release-intake/latest-A25-wave01-artifact-clean-execution-instruction-readiness.json",
  latestMarkdown: "coordination/release-intake/latest-A25-wave01-artifact-clean-execution-instruction-readiness.md",
  datedJson: `coordination/release-intake/${date}-A25-wave01-artifact-clean-execution-instruction-readiness.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-wave01-artifact-clean-execution-instruction-readiness.md`
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

function stagedRows() {
  const output = git(["diff", "--cached", "--name-only"]);
  return output ? output.split("\n").filter(Boolean) : [];
}

function wave01Rows(rows) {
  return (rows ?? []).filter((row) => String(row.approvalId ?? "").startsWith("wave01-resync-0"));
}

function sourceCurrentnessFailures({ dirtyMap, payloads, gates }) {
  const failures = [];
  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  for (const [label, payload] of payloads) {
    if (payload.dirtyMapStatusSignature !== expectedSignature) failures.push(`${label} dirty-map signature is stale`);
    if (payload.expandedStatusEntries !== expectedEntries) failures.push(`${label} expanded dirty entry count is stale`);
  }
  for (const [label, gate] of gates) {
    if (gate.dirtyMapStatusSignature !== expectedSignature) failures.push(`${label} dirty-map signature is stale`);
    if (gate.expandedStatusEntries !== expectedEntries) failures.push(`${label} expanded dirty entry count is stale`);
    if ((gate.failures ?? []).length !== 0) failures.push(`${label} has failures`);
  }
  return failures;
}

function commandSet(rows) {
  return new Set((rows ?? []).flatMap((row) => row.exactCommandSequence ?? [row.command]).filter(Boolean));
}

function exactCommandAlignment({ requestRows, targetRows, batchRequest, executionGate }) {
  const requestCommands = commandSet(requestRows);
  const targetCommands = new Set(targetRows.map((row) => row.command).filter(Boolean));
  const batchCommands = new Set(batchRequest.exactCommandSequence ?? []);
  const recordedInstructionsReady = (executionGate.validInstructionRows ?? 0) === 6;
  const postCleanVerified = targetRows.length === 6 && targetRows.every((row) => row.targetAlreadyClean);
  if (targetCommands.size !== 6 || batchCommands.size !== 6) return false;
  if (requestCommands.size !== 6 && !(requestCommands.size === 0 && (recordedInstructionsReady || postCleanVerified))) return false;
  for (const command of targetCommands) {
    if (requestCommands.size > 0 && !requestCommands.has(command)) return false;
    if (!batchCommands.has(command)) return false;
  }
  return true;
}

function lifecycleStatus({ sourceFailures, staged, requestRows, acceptanceRows, intake, recording, executor, postClean, executionGate, targetDirtyRows, targetAlreadyCleanRows }) {
  if (sourceFailures.length > 0) return "not-ready-source-stale";
  if (staged.length > 0) return "not-ready-staged-input";
  if (
    postClean.verificationStatus === "post-clean-verified" &&
    targetDirtyRows === 0 &&
    targetAlreadyCleanRows === 6
  ) {
    return "post-clean-verified";
  }
  if (
    executor.executorStatus === "dry-run-ready-requires-explicit-apply" &&
    (recording.recorderStatus === "already-recorded" || (executionGate.validInstructionRows ?? 0) === 6) &&
    targetDirtyRows === 6
  ) {
    return "ready-for-guarded-clean-apply";
  }
  if (
    intake.intakeStatus === "ready-to-record-instruction-rows" &&
    recording.recorderStatus === "dry-run-ready-requires-explicit-apply" &&
    requestRows.length === 6 &&
    acceptanceRows.length === 6 &&
    targetDirtyRows === 6
  ) {
    return "ready-for-execution-instruction-recording";
  }
  if (
    requestRows.length === 6 &&
    acceptanceRows.length === 6 &&
    intake.intakeStatus === "waiting-for-owner-input" &&
    recording.recorderStatus === "dry-run-blocked-owner-input" &&
    executor.executorStatus === "dry-run-blocked-missing-owner-execution-instruction" &&
    postClean.verificationStatus === "waiting-for-clean-execution" &&
    targetDirtyRows === 6 &&
    targetAlreadyCleanRows === 0
  ) {
    return "waiting-for-owner-execution-instruction";
  }
  return "not-ready-lifecycle-mismatch";
}

function buildChecks({ sourceFailures, status, staged, requestRows, acceptanceRows, targetRows, batchRequest, intake, recording, executor, focus, postClean, executionGate }) {
  const targetDirtyRows = targetRows.filter((row) => row.targetStillDirty).length;
  const targetAlreadyCleanRows = targetRows.filter((row) => row.targetAlreadyClean).length;
  const recordedInstructionsReady = (executionGate.validInstructionRows ?? 0) === 6;
  const postCleanVerified = status === "post-clean-verified" && targetDirtyRows === 0 && targetAlreadyCleanRows === 6;
  const requestRowsReady = requestRows.length === 6 || (requestRows.length === 0 && (recordedInstructionsReady || postCleanVerified));
  const acceptanceRowsReady = acceptanceRows.length === 6 || (acceptanceRows.length === 0 && postCleanVerified);
  const exactTargets = targetRows.every((row) =>
    /^wave01-resync-0[2-7]-/.test(row.approvalId ?? "") &&
    /^coordination\/release-intake\/2026-06-30-A25-dirty-tree-map-20260630T\d{6}Z\.(json|md)$/.test(row.packageFile ?? "") &&
    row.command === `git clean -f -- ${row.packageFile}`
  );
  const copyableText = batchRequest.batchCopyableOwnerExecutionText ?? "";

  return [
    {
      id: "source-current",
      status: sourceFailures.length === 0 ? "pass" : "fail",
      detail: `source currentness failures=${sourceFailures.length}`
    },
    {
      id: "six-wave01-request-and-target-rows",
      status: requestRowsReady && acceptanceRowsReady && targetRows.length === 6 ? "pass" : "fail",
      detail: `requests=${requestRows.length}; acceptance=${acceptanceRows.length}; targets=${targetRows.length}`
    },
    {
      id: "exact-command-alignment",
      status: exactCommandAlignment({ requestRows, targetRows, batchRequest, executionGate }) ? "pass" : "fail",
      detail: "request packet, batch request, and post-clean target rows name the same six exact commands"
    },
    {
      id: "target-state-coherent",
      status: (targetDirtyRows === 6 && targetAlreadyCleanRows === 0) || (targetDirtyRows === 0 && targetAlreadyCleanRows === 6) ? "pass" : "fail",
      detail: `targetDirtyRows=${targetDirtyRows}; targetAlreadyCleanRows=${targetAlreadyCleanRows}`
    },
    {
      id: "copyable-batch-text-complete",
      status: requestRows.every((row) => copyableText.includes(`approvalId=${row.approvalId}`)) &&
        targetRows.every((row) => copyableText.includes(`command=${row.command}`)) &&
        copyableText.includes("No cleanup") &&
        copyableText.includes("broad staging") &&
        copyableText.includes("deploy")
        ? "pass"
        : "fail",
      detail: "batch execution text includes all approval ids, exact commands, and exclusion terms"
    },
    {
      id: "lifecycle-status-supported",
      status: [
        "waiting-for-owner-execution-instruction",
        "ready-for-execution-instruction-recording",
        "ready-for-guarded-clean-apply",
        "post-clean-verified"
      ].includes(status) ? "pass" : "fail",
      detail: `readinessStatus=${status}; focusStatus=${focus.focusStatus}; postCleanStatus=${postClean.verificationStatus}`
    },
    {
      id: "instruction-file-state-coherent",
      status: (status === "waiting-for-owner-execution-instruction" && (executionGate.validInstructionRows ?? -1) === 0) ||
        (status === "ready-for-execution-instruction-recording" && (executionGate.validInstructionRows ?? -1) === 0) ||
        (status === "ready-for-guarded-clean-apply" && (executionGate.validInstructionRows ?? 0) === 6) ||
        status === "post-clean-verified"
        ? "pass"
        : "fail",
      detail: `instructionRowsInFile=${executionGate.instructionRowsInFile ?? 0}; validInstructionRows=${executionGate.validInstructionRows ?? 0}`
    },
    {
      id: "component-status-coherent",
      status: [
        "waiting-for-owner-input",
        "ready-to-record-instruction-rows",
        "already-recorded",
        "post-clean-verified"
      ].includes(intake.intakeStatus) &&
        [
          "dry-run-blocked-owner-input",
          "dry-run-ready-requires-explicit-apply",
          "already-recorded",
          "post-clean-verified"
        ].includes(recording.recorderStatus) &&
        [
          "dry-run-blocked-missing-owner-execution-instruction",
          "dry-run-ready-requires-explicit-apply",
          "already-cleaned-and-verified"
        ].includes(executor.executorStatus)
        ? "pass"
        : "fail",
      detail: `intake=${intake.intakeStatus}; recorder=${recording.recorderStatus}; executor=${executor.executorStatus}`
    },
    {
      id: "no-tsconfig-or-deploy-target",
      status: exactTargets &&
        targetRows.every((row) => row.packageFile !== "tsconfig.json" && !String(row.packageFile ?? "").includes(".vercel"))
        ? "pass"
        : "fail",
      detail: "held tsconfig restore and deploy artifacts are excluded"
    },
    {
      id: "no-staged-input",
      status: staged.length === 0 ? "pass" : "fail",
      detail: `stagedRows=${staged.length}`
    },
    {
      id: "non-executable-boundary",
      status: requestRows.every((row) => row.cleanupAuthorized === false && row.executableNow === false) &&
        targetRows.every((row) => row.cleanupAuthorized === false && row.executableNow === false) &&
        (executionGate.cleanupAuthorizedRows ?? 0) === 0 &&
        (executionGate.executableRows ?? 0) === 0
        ? "pass"
        : "fail",
      detail: "readiness bridge does not authorize cleanup, execution, deploy, staging, or commit"
    }
  ];
}

export function buildWave01ArtifactCleanExecutionInstructionReadiness() {
  const dirtyMap = readJson(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.dirtyMap);
  const executionGate = readJson(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.executionInstructionsGate);
  const requestPacket = readJson(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.requestPacket);
  const requestPacketGate = readJson(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.requestPacketGate);
  const acceptanceDocket = readJson(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.acceptanceDocket);
  const acceptanceDocketGate = readJson(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.acceptanceDocketGate);
  const batchRequest = readJson(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.batchRequest);
  const batchRequestGate = readJson(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.batchRequestGate);
  const batchIntake = readJson(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.batchIntake);
  const batchIntakeGate = readJson(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.batchIntakeGate);
  const recordingDryRun = readJson(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.recordingDryRun);
  const recordingGate = readJson(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.recordingGate);
  const guardedPlan = readJson(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.guardedPlan);
  const guardedPlanGate = readJson(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.guardedPlanGate);
  const guardedExecutorDryRun = readJson(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.guardedExecutorDryRun);
  const guardedExecutorGate = readJson(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.guardedExecutorGate);
  const focusPacket = readJson(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.focusPacket);
  const focusPacketGate = readJson(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.focusPacketGate);
  const postCleanPlan = readJson(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.postCleanPlan);
  const postCleanPlanGate = readJson(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.postCleanPlanGate);
  const requestRows = wave01Rows(requestPacket.requests);
  const acceptanceRows = wave01Rows(acceptanceDocket.acceptanceRows);
  const targetRows = postCleanPlan.targetRows ?? [];
  const staged = stagedRows();
  const sourceFailures = sourceCurrentnessFailures({
    dirtyMap,
    payloads: [
      ["execution instruction request packet", requestPacket],
      ["execution instruction acceptance docket", acceptanceDocket],
      ["Wave01 batch request", batchRequest],
      ["Wave01 batch intake", batchIntake],
      ["Wave01 execution-instruction recording dry run", recordingDryRun],
      ["Wave01 guarded plan", guardedPlan],
      ["Wave01 guarded executor dry run", guardedExecutorDryRun],
      ["Wave01 owner execution focus packet", focusPacket],
      ["Wave01 post-clean verification plan", postCleanPlan]
    ],
    gates: [
      ["execution instructions gate", executionGate],
      ["execution instruction request packet gate", requestPacketGate],
      ["execution instruction acceptance docket gate", acceptanceDocketGate],
      ["Wave01 batch request gate", batchRequestGate],
      ["Wave01 batch intake gate", batchIntakeGate],
      ["Wave01 recording gate", recordingGate],
      ["Wave01 guarded plan gate", guardedPlanGate],
      ["Wave01 guarded executor gate", guardedExecutorGate],
      ["Wave01 owner focus gate", focusPacketGate],
      ["Wave01 post-clean verification gate", postCleanPlanGate]
    ]
  });
  const targetDirtyRows = targetRows.filter((row) => row.targetStillDirty).length;
  const targetAlreadyCleanRows = targetRows.filter((row) => row.targetAlreadyClean).length;
  const status = lifecycleStatus({
    sourceFailures,
    staged,
    requestRows,
    acceptanceRows,
    intake: batchIntake,
    recording: recordingDryRun,
    executor: guardedExecutorDryRun,
    postClean: postCleanPlan,
    executionGate,
    targetDirtyRows,
    targetAlreadyCleanRows
  });
  const checks = buildChecks({
    sourceFailures,
    status,
    staged,
    requestRows,
    acceptanceRows,
    targetRows,
    batchRequest,
    intake: batchIntake,
    recording: recordingDryRun,
    executor: guardedExecutorDryRun,
    focus: focusPacket,
    postClean: postCleanPlan,
    executionGate
  });
  const failedChecks = checks.filter((row) => row.status !== "pass");

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    readinessKind: "wave01-artifact-clean-execution-instruction-readiness",
    readinessStatus: failedChecks.length === 0 ? status : "not-ready-check-failures",
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? null,
    sourceArtifacts: {
      requestPacketGeneratedAt: requestPacket.generatedAt,
      acceptanceDocketGeneratedAt: acceptanceDocket.generatedAt,
      batchRequestGeneratedAt: batchRequest.generatedAt,
      batchIntakeGeneratedAt: batchIntake.generatedAt,
      recordingDryRunGeneratedAt: recordingDryRun.generatedAt,
      guardedPlanGeneratedAt: guardedPlan.generatedAt,
      guardedExecutorDryRunGeneratedAt: guardedExecutorDryRun.generatedAt,
      focusPacketGeneratedAt: focusPacket.generatedAt,
      postCleanPlanGeneratedAt: postCleanPlan.generatedAt
    },
    sourceCurrentnessFailures: sourceFailures,
    targetInputFile: WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.batchIntake,
    ownerExecutionTextRequired: batchRequest.batchCopyableOwnerExecutionText ?? focusPacket.ownerExecutionTextRequired ?? "",
    requestRows,
    acceptanceRows,
    targetRows,
    stagedRows: staged,
    checks,
    summary: {
      readinessStatus: failedChecks.length === 0 ? status : "not-ready-check-failures",
      requestRows: requestRows.length,
      acceptanceRows: acceptanceRows.length,
      targetRows: targetRows.length,
      targetDirtyRows,
      targetAlreadyCleanRows,
      instructionRowsInFile: executionGate.instructionRowsInFile ?? 0,
      validInstructionRows: executionGate.validInstructionRows ?? 0,
      intakeStatus: batchIntake.intakeStatus ?? "",
      recorderStatus: recordingDryRun.recorderStatus ?? "",
      planStatus: guardedPlan.planStatus ?? "",
      executorStatus: guardedExecutorDryRun.executorStatus ?? "",
      focusStatus: focusPacket.focusStatus ?? "",
      postCleanVerificationStatus: postCleanPlan.verificationStatus ?? "",
      stagedRows: staged.length,
      checks: checks.length,
      passingChecks: checks.length - failedChecks.length,
      failedChecks: failedChecks.length,
      cleanupAuthorizedRows: 0,
      executableRows: 0,
      deployAuthorized: false
    },
    boundary: {
      evidenceOnly: true,
      readinessBridgeOnly: true,
      recordsOwnerInput: false,
      recordsExecutionInstruction: false,
      stageAuthorized: false,
      commitAuthorized: false,
      mergeAuthorized: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false,
      requiresSeparateOwnerExecutionInstruction: status === "waiting-for-owner-execution-instruction",
      requiresSeparateRecordingApply: status === "waiting-for-owner-execution-instruction" || status === "ready-for-execution-instruction-recording",
      requiresSeparateGuardedExecutorApply: status !== "post-clean-verified"
    }
  };
}

export function stableWave01ArtifactCleanExecutionInstructionReadinessProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    readinessKind: payload.readinessKind,
    readinessStatus: payload.readinessStatus,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    targetInputFile: payload.targetInputFile,
    ownerExecutionTextRequired: payload.ownerExecutionTextRequired,
    requestRows: payload.requestRows,
    acceptanceRows: payload.acceptanceRows,
    targetRows: payload.targetRows,
    stagedRows: payload.stagedRows,
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
    `| \`${cell(row.approvalId)}\` | \`${cell(row.command)}\` | \`${cell(row.packageFile)}\` | ${row.targetStillDirty ? "yes" : "no"} | ${row.targetAlreadyClean ? "yes" : "no"} |`
  )).join("\n") || "| none | n/a | n/a | no | no |";
  const checks = payload.checks.map((row) => (
    `| \`${cell(row.id)}\` | ${cell(row.status)} | ${cell(row.detail)} |`
  )).join("\n");

  return `# A25 Wave01 Artifact-Clean Execution Instruction Readiness

Generated: ${payload.generatedAt}

Readiness status: \`${payload.readinessStatus}\`

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This readiness bridge is evidence-only. It connects the request packet, acceptance docket, Wave01 owner-input intake, guarded executor dry run, focus packet, and post-clean verification plan. It does not record owner input, record execution instructions, stage, commit, merge, clean, remove files, remove worktrees, delete branches, push, or deploy.

## Summary

- Request rows: ${payload.summary.requestRows}
- Acceptance rows: ${payload.summary.acceptanceRows}
- Target rows: ${payload.summary.targetRows}
- Target dirty rows: ${payload.summary.targetDirtyRows}
- Target already-clean rows: ${payload.summary.targetAlreadyCleanRows}
- Instruction rows in file: ${payload.summary.instructionRowsInFile}
- Valid instruction rows: ${payload.summary.validInstructionRows}
- Intake status: ${payload.summary.intakeStatus}
- Recorder status: ${payload.summary.recorderStatus}
- Guarded plan status: ${payload.summary.planStatus}
- Guarded executor status: ${payload.summary.executorStatus}
- Focus status: ${payload.summary.focusStatus}
- Post-clean verification status: ${payload.summary.postCleanVerificationStatus}
- Staged rows: ${payload.summary.stagedRows}
- Checks: ${payload.summary.passingChecks}/${payload.summary.checks}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}
- Deploy authorized: ${payload.summary.deployAuthorized}

## Owner Execution Text Required

${fenced(payload.ownerExecutionTextRequired)}

## Exact Target Rows

| Approval ID | Command | Package file | Still dirty | Already clean |
| --- | --- | --- | --- | --- |
${rows}

## Checks

| Check | Status | Detail |
| --- | --- | --- |
${checks}

## Boundary

- Records owner input: false
- Records execution instruction: false
- Stage authorized: false
- Commit authorized: false
- Merge authorized: false
- Cleanup authorized: false
- Executable now: false
- Destructive Git authorized: false
- Deploy authorized: false
`;
}

function main() {
  const payload = buildWave01ArtifactCleanExecutionInstructionReadiness();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.latestJson, json);
  write(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.datedJson, json);
  write(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.latestMarkdown, md);
  write(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.datedMarkdown, md);
  console.log(JSON.stringify({
    latestJson: WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.latestJson,
    latestMarkdown: WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.latestMarkdown,
    readinessStatus: payload.readinessStatus,
    requestRows: payload.summary.requestRows,
    acceptanceRows: payload.summary.acceptanceRows,
    targetDirtyRows: payload.summary.targetDirtyRows,
    validInstructionRows: payload.summary.validInstructionRows,
    postCleanVerificationStatus: payload.summary.postCleanVerificationStatus,
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
