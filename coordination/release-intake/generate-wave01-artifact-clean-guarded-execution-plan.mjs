#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTION_PLAN_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  executionInstructions: "coordination/release-intake/latest-A25-next-owner-execution-instructions.json",
  executionInstructionsGate: "coordination/release-intake/latest-A25-next-owner-execution-instructions-current-gate.json",
  requestPacket: "coordination/release-intake/latest-A25-next-owner-execution-instruction-request-packet.json",
  requestPacketGate: "coordination/release-intake/latest-A25-next-owner-execution-instruction-request-packet-current-gate.json",
  preflight: "coordination/release-intake/latest-A25-wave01-artifact-clean-execution-preflight.json",
  preflightGate: "coordination/release-intake/latest-A25-wave01-artifact-clean-execution-preflight-current-gate.json",
  instructionCapsule: "coordination/release-intake/latest-A25-wave01-artifact-clean-execution-instruction-capsule.json",
  instructionCapsuleGate: "coordination/release-intake/latest-A25-wave01-artifact-clean-execution-instruction-capsule-current-gate.json",
  latestJson: "coordination/release-intake/latest-A25-wave01-artifact-clean-guarded-execution-plan.json",
  latestMarkdown: "coordination/release-intake/latest-A25-wave01-artifact-clean-guarded-execution-plan.md",
  datedJson: `coordination/release-intake/${date}-A25-wave01-artifact-clean-guarded-execution-plan.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-wave01-artifact-clean-guarded-execution-plan.md`
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

function runGit(cwd, args) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim()
  };
}

function parseDryRunRemovals(output) {
  if (!output) return [];
  return output.split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.replace(/^Would remove /, ""))
    .filter(Boolean);
}

function sameStringArray(left, right) {
  return JSON.stringify([...(left ?? [])].sort()) === JSON.stringify([...(right ?? [])].sort());
}

function sourceCurrentnessFailures({ dirtyMap, executionInstructions, executionInstructionsGate, requestPacket, requestPacketGate, preflight, preflightGate, instructionCapsule, instructionCapsuleGate }) {
  const failures = [];
  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  for (const [label, payload] of [
    ["execution instructions", executionInstructions],
    ["request packet", requestPacket],
    ["preflight", preflight],
    ["instruction capsule", instructionCapsule]
  ]) {
    if (payload.dirtyMapStatusSignature !== expectedSignature) failures.push(`${label} dirty-map signature is stale`);
    if (payload.expandedStatusEntries !== expectedEntries) failures.push(`${label} expanded dirty entry count is stale`);
  }
  for (const [label, gate] of [
    ["execution instructions gate", executionInstructionsGate],
    ["request packet gate", requestPacketGate],
    ["preflight gate", preflightGate],
    ["instruction capsule gate", instructionCapsuleGate]
  ]) {
    if (gate.dirtyMapStatusSignature !== expectedSignature) failures.push(`${label} dirty-map signature is stale`);
    if (gate.expandedStatusEntries !== expectedEntries) failures.push(`${label} expanded dirty entry count is stale`);
    if ((gate.failures ?? []).length !== 0) failures.push(`${label} has failures`);
  }
  return failures;
}

function instructionRowsForTarget({ executionInstructions, targetRows }) {
  const targetIds = new Set(targetRows.map((row) => row.approvalId));
  return (executionInstructions.instructions ?? []).filter((row) => targetIds.has(row.approvalId));
}

function validateInstruction(row, target) {
  const failures = [];
  if (!target) {
    failures.push("missing target row");
    return failures;
  }
  if (row.approvalId !== target.approvalId) failures.push("approvalId mismatch");
  if (row.cwd !== target.cwd) failures.push("cwd mismatch");
  if (row.command !== target.command) failures.push("command mismatch");
  if (!sameStringArray(row.packageFiles ?? [], [target.packageFile])) failures.push("packageFiles mismatch");
  if (typeof row.approvedBy !== "string" || row.approvedBy.trim().length === 0) failures.push("approvedBy is required");
  if (typeof row.approvedAt !== "string" || Number.isNaN(Date.parse(row.approvedAt))) failures.push("approvedAt must be ISO-compatible");
  if (typeof row.executionText !== "string" || !row.executionText.includes(`approvalId=${target.approvalId}`)) failures.push("executionText missing approvalId");
  if (typeof row.executionText !== "string" || !row.executionText.includes(`command=${target.command}`)) failures.push("executionText missing command");
  if (typeof row.executionText !== "string" || !row.executionText.includes(`cwd=${target.cwd}`)) failures.push("executionText missing cwd");
  if (!Array.isArray(row.evidenceReviewed) || !row.evidenceReviewed.includes(WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTION_PLAN_PATHS.instructionCapsule)) {
    failures.push("evidenceReviewed must include the Wave01 instruction capsule");
  }
  if (row.cleanupAuthorized === true) failures.push("cleanupAuthorized must not be true");
  if (row.executableNow === true) failures.push("executableNow must not be true");
  if (row.destructiveGitAuthorized === true) failures.push("destructiveGitAuthorized must not be true");
  if (row.deployAuthorized === true) failures.push("deployAuthorized must not be true");
  return failures;
}

function buildTargetRows({ instructionCapsule }) {
  return (instructionCapsule.instructionRows ?? []).map((row) => {
    const status = runGit(row.cwd, ["status", "--short", "--", row.packageFile]);
    const dryRun = runGit(row.cwd, ["clean", "-n", "--", row.packageFile]);
    const removals = parseDryRunRemovals(dryRun.stdout);
    return {
      approvalId: row.approvalId,
      owner: row.owner,
      cwd: row.cwd,
      packageFile: row.packageFile,
      command: row.command,
      expectedStatusShort: `?? ${row.packageFile}`,
      statusShort: status.stdout,
      dryRunCommand: `git clean -n -- ${row.packageFile}`,
      dryRunOutput: dryRun.stdout,
      dryRunRemovals: removals,
      targetStillDirty: status.stdout === `?? ${row.packageFile}` && removals.length === 1 && removals[0] === row.packageFile,
      targetAlreadyClean: status.stdout === "" && removals.length === 0,
      cleanupAuthorized: false,
      executableNow: false
    };
  });
}

function planStatus({ sourceFailures, targetRows, instructionRows, instructionFailures }) {
  if (sourceFailures.length > 0) return "not-ready-source-stale";
  if (targetRows.length === 6 && targetRows.every((row) => row.targetAlreadyClean)) return "already-cleaned-and-verified";
  if (targetRows.length === 6 &&
    targetRows.every((row) => row.targetStillDirty) &&
    instructionRows.length === 6 &&
    instructionFailures.length === 0) {
    return "ready-for-owner-approved-guarded-clean";
  }
  return "blocked-missing-owner-execution-instruction";
}

function buildChecks({ sourceFailures, targetRows, instructionRows, instructionFailures, status, stagedRows }) {
  return [
    {
      id: "source-current",
      status: sourceFailures.length === 0 ? "pass" : "fail",
      detail: `source currentness failures=${sourceFailures.length}`
    },
    {
      id: "six-target-rows",
      status: targetRows.length === 6 ? "pass" : "fail",
      detail: `targetRows=${targetRows.length}`
    },
    {
      id: "target-status-coherent",
      status: targetRows.length === 6 && (
        targetRows.every((row) => row.targetStillDirty) ||
        targetRows.every((row) => row.targetAlreadyClean)
      ) ? "pass" : "fail",
      detail: `dirty=${targetRows.filter((row) => row.targetStillDirty).length}; alreadyClean=${targetRows.filter((row) => row.targetAlreadyClean).length}`
    },
    {
      id: "instruction-state-coherent",
      status: (status === "blocked-missing-owner-execution-instruction" && instructionRows.length === 0) ||
        (status === "ready-for-owner-approved-guarded-clean" && instructionRows.length === 6 && instructionFailures.length === 0) ||
        status === "already-cleaned-and-verified"
        ? "pass"
        : "fail",
      detail: `instructionRows=${instructionRows.length}; instructionFailures=${instructionFailures.length}; status=${status}`
    },
    {
      id: "exact-command-allowlist",
      status: targetRows.every((row) => /^git clean -f -- coordination\/release-intake\/2026-06-30-A25-dirty-tree-map-20260630T\d{6}Z\.(json|md)$/.test(row.command)) ? "pass" : "fail",
      detail: "all commands are single-file Wave01 A25 artifact clean commands"
    },
    {
      id: "no-tsconfig-or-deploy-target",
      status: targetRows.every((row) => row.packageFile !== "tsconfig.json" && !row.packageFile.includes(".vercel")) ? "pass" : "fail",
      detail: "tsconfig restore and deploy artifacts are excluded"
    },
    {
      id: "no-staged-root-input",
      status: stagedRows.length === 0 ? "pass" : "fail",
      detail: `stagedRows=${stagedRows.length}`
    },
    {
      id: "non-executable-plan",
      status: targetRows.every((row) => row.cleanupAuthorized === false && row.executableNow === false) ? "pass" : "fail",
      detail: "plan generation does not mark rows executable"
    }
  ];
}

export function buildWave01ArtifactCleanGuardedExecutionPlan() {
  const dirtyMap = readJson(WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTION_PLAN_PATHS.dirtyMap);
  const executionInstructions = readJson(WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTION_PLAN_PATHS.executionInstructions);
  const executionInstructionsGate = readJson(WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTION_PLAN_PATHS.executionInstructionsGate);
  const requestPacket = readJson(WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTION_PLAN_PATHS.requestPacket);
  const requestPacketGate = readJson(WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTION_PLAN_PATHS.requestPacketGate);
  const preflight = readJson(WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTION_PLAN_PATHS.preflight);
  const preflightGate = readJson(WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTION_PLAN_PATHS.preflightGate);
  const instructionCapsule = readJson(WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTION_PLAN_PATHS.instructionCapsule);
  const instructionCapsuleGate = readJson(WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTION_PLAN_PATHS.instructionCapsuleGate);
  const sourceFailures = sourceCurrentnessFailures({
    dirtyMap,
    executionInstructions,
    executionInstructionsGate,
    requestPacket,
    requestPacketGate,
    preflight,
    preflightGate,
    instructionCapsule,
    instructionCapsuleGate
  });
  const targetRows = buildTargetRows({ instructionCapsule });
  const instructionRows = instructionRowsForTarget({ executionInstructions, targetRows });
  const targetById = new Map(targetRows.map((row) => [row.approvalId, row]));
  const instructionFailures = instructionRows.flatMap((row) =>
    validateInstruction(row, targetById.get(row.approvalId)).map((failure) => `${row.approvalId}: ${failure}`)
  );
  const stagedRowsOutput = git(["diff", "--cached", "--name-only"]);
  const stagedRows = stagedRowsOutput ? stagedRowsOutput.split("\n").filter(Boolean) : [];
  const status = planStatus({ sourceFailures, targetRows, instructionRows, instructionFailures });
  const checks = buildChecks({ sourceFailures, targetRows, instructionRows, instructionFailures, status, stagedRows });
  const failedChecks = checks.filter((row) => row.status !== "pass");

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    planKind: "wave01-artifact-clean-guarded-execution-plan",
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? null,
    sourceArtifacts: {
      executionInstructionsGeneratedAt: executionInstructions.generatedAt,
      requestPacketGeneratedAt: requestPacket.generatedAt,
      preflightGeneratedAt: preflight.generatedAt,
      instructionCapsuleGeneratedAt: instructionCapsule.generatedAt
    },
    sourceCurrentnessFailures: sourceFailures,
    planStatus: failedChecks.length === 0 ? status : "not-ready-check-failures",
    targetInputFile: WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTION_PLAN_PATHS.executionInstructions,
    targetRows,
    instructionRows,
    instructionValidationFailures: instructionFailures,
    stagedRows,
    guardedCommandSequence: targetRows.map((row) => row.command),
    acceptanceChecks: checks,
    summary: {
      planStatus: failedChecks.length === 0 ? status : "not-ready-check-failures",
      targetRows: targetRows.length,
      targetDirtyRows: targetRows.filter((row) => row.targetStillDirty).length,
      targetAlreadyCleanRows: targetRows.filter((row) => row.targetAlreadyClean).length,
      instructionRows: instructionRows.length,
      validInstructionRows: instructionRows.length - instructionFailures.length,
      instructionValidationFailures: instructionFailures.length,
      guardedCommandRows: targetRows.length,
      stagedRows: stagedRows.length,
      acceptanceChecks: checks.length,
      passingAcceptanceChecks: checks.length - failedChecks.length,
      failedAcceptanceChecks: failedChecks.length,
      sourceCurrentnessFailures: sourceFailures.length,
      canExecuteIfSeparateOwnerInstructionRecorded: status === "ready-for-owner-approved-guarded-clean",
      cleanupAuthorizedRows: 0,
      executableRows: 0
    },
    boundary: {
      evidenceOnly: true,
      planOnly: true,
      recordsOwnerApproval: false,
      recordsExecutionInstruction: false,
      stageAuthorized: false,
      commitAuthorized: false,
      mergeAuthorized: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false,
      requiresSeparateOwnerExecutionInstruction: instructionRows.length !== 6 || instructionFailures.length > 0,
      requiresExplicitApplyFlag: true
    }
  };
}

export function stableWave01ArtifactCleanGuardedExecutionPlanProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    planKind: payload.planKind,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: payload.sourceArtifacts,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    planStatus: payload.planStatus,
    targetInputFile: payload.targetInputFile,
    targetRows: payload.targetRows,
    instructionRows: payload.instructionRows,
    instructionValidationFailures: payload.instructionValidationFailures,
    stagedRows: payload.stagedRows,
    guardedCommandSequence: payload.guardedCommandSequence,
    acceptanceChecks: payload.acceptanceChecks,
    summary: payload.summary,
    boundary: payload.boundary
  };
}

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function markdown(payload) {
  const rows = payload.targetRows.map((row) =>
    `| \`${cell(row.approvalId)}\` | \`${cell(row.packageFile)}\` | \`${cell(row.statusShort || "clean")}\` | ${row.targetStillDirty ? "yes" : "no"} | ${row.targetAlreadyClean ? "yes" : "no"} |`
  ).join("\n") || "| none | n/a | n/a | no | no |";
  const checks = payload.acceptanceChecks.map((row) =>
    `| \`${cell(row.id)}\` | ${cell(row.status)} | ${cell(row.detail)} |`
  ).join("\n");

  return `# A25 Wave01 Artifact-Clean Guarded Execution Plan

Generated: ${payload.generatedAt}

Plan status: \`${payload.planStatus}\`

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This plan is fail-closed. It does not execute \`git clean -f\`; it only determines whether the six Wave01 A25 artifact-clean rows have a valid separate owner execution instruction and whether the exact target files are still the only dry-run removals.

## Summary

- Target rows: ${payload.summary.targetRows}
- Target dirty rows: ${payload.summary.targetDirtyRows}
- Target already-clean rows: ${payload.summary.targetAlreadyCleanRows}
- Instruction rows: ${payload.summary.instructionRows}
- Valid instruction rows: ${payload.summary.validInstructionRows}
- Acceptance checks: ${payload.summary.passingAcceptanceChecks}/${payload.summary.acceptanceChecks}
- Can execute if separate owner instruction recorded: ${payload.summary.canExecuteIfSeparateOwnerInstructionRecorded ? "true" : "false"}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Target Rows

| Approval ID | Package file | Status | Still dirty | Already clean |
| --- | --- | --- | --- | --- |
${rows}

## Checks

| Check | Status | Detail |
| --- | --- | --- |
${checks}

## Boundary

- Records owner approval: false
- Records execution instruction: false
- Cleanup authorized: false
- Executable now: false
- Destructive Git authorized: false
- Deploy authorized: false
- Requires explicit apply flag: true
`;
}

export function writeWave01ArtifactCleanGuardedExecutionPlan() {
  const payload = buildWave01ArtifactCleanGuardedExecutionPlan();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTION_PLAN_PATHS.latestJson, json);
  write(WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTION_PLAN_PATHS.datedJson, json);
  write(WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTION_PLAN_PATHS.latestMarkdown, md);
  write(WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTION_PLAN_PATHS.datedMarkdown, md);
  return payload;
}

function main() {
  const payload = writeWave01ArtifactCleanGuardedExecutionPlan();
  console.log(JSON.stringify({
    latestJson: WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTION_PLAN_PATHS.latestJson,
    latestMarkdown: WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTION_PLAN_PATHS.latestMarkdown,
    planStatus: payload.planStatus,
    targetRows: payload.summary.targetRows,
    targetDirtyRows: payload.summary.targetDirtyRows,
    instructionRows: payload.summary.instructionRows,
    validInstructionRows: payload.summary.validInstructionRows,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
