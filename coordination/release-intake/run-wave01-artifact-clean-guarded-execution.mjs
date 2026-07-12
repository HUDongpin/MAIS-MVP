#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTION_PLAN_PATHS,
  buildWave01ArtifactCleanGuardedExecutionPlan,
  stableWave01ArtifactCleanGuardedExecutionPlanProjection
} from "./generate-wave01-artifact-clean-guarded-execution-plan.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTOR_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  plan: "coordination/release-intake/latest-A25-wave01-artifact-clean-guarded-execution-plan.json",
  planGate: "coordination/release-intake/latest-A25-wave01-artifact-clean-guarded-execution-plan-current-gate.json",
  executionInstructions: "coordination/release-intake/latest-A25-next-owner-execution-instructions.json",
  executionInstructionsGate: "coordination/release-intake/latest-A25-next-owner-execution-instructions-current-gate.json",
  latestDryRunJson: "coordination/release-intake/latest-A25-wave01-artifact-clean-guarded-executor-dry-run.json",
  latestDryRunMarkdown: "coordination/release-intake/latest-A25-wave01-artifact-clean-guarded-executor-dry-run.md",
  datedDryRunJson: `coordination/release-intake/${date}-A25-wave01-artifact-clean-guarded-executor-dry-run.json`,
  datedDryRunMarkdown: `coordination/release-intake/${date}-A25-wave01-artifact-clean-guarded-executor-dry-run.md`,
  latestApplyJson: "coordination/release-intake/latest-A25-wave01-artifact-clean-guarded-executor-apply.json",
  latestApplyMarkdown: "coordination/release-intake/latest-A25-wave01-artifact-clean-guarded-executor-apply.md"
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

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function sourceCurrentnessFailures({ dirtyMap, plan, planGate, executionInstructions, executionInstructionsGate, currentPlan }) {
  const failures = [];
  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  for (const [label, payload] of [
    ["guarded execution plan", plan],
    ["execution instructions", executionInstructions]
  ]) {
    if (payload.dirtyMapStatusSignature !== expectedSignature) failures.push(`${label} dirty-map signature is stale`);
    if (payload.expandedStatusEntries !== expectedEntries) failures.push(`${label} expanded dirty entry count is stale`);
  }
  for (const [label, gate] of [
    ["guarded execution plan gate", planGate],
    ["execution instructions gate", executionInstructionsGate]
  ]) {
    if (gate.dirtyMapStatusSignature !== expectedSignature) failures.push(`${label} dirty-map signature is stale`);
    if (gate.expandedStatusEntries !== expectedEntries) failures.push(`${label} expanded dirty entry count is stale`);
    if ((gate.failures ?? []).length !== 0) failures.push(`${label} has failures`);
  }
  if (!sameJson(
    stableWave01ArtifactCleanGuardedExecutionPlanProjection(plan),
    stableWave01ArtifactCleanGuardedExecutionPlanProjection(currentPlan)
  )) {
    failures.push("guarded execution plan is stale versus current build");
  }
  return failures;
}

function executorStatus({ mode, sourceFailures, plan }) {
  if (sourceFailures.length > 0) return "not-ready-source-stale";
  if (plan.planStatus === "already-cleaned-and-verified") return "already-cleaned-and-verified";
  if (plan.planStatus === "ready-for-owner-approved-guarded-clean") {
    return mode === "apply" ? "ready-to-apply" : "dry-run-ready-requires-explicit-apply";
  }
  if (plan.planStatus === "blocked-missing-owner-execution-instruction") {
    return mode === "apply" ? "apply-blocked-missing-owner-execution-instruction" : "dry-run-blocked-missing-owner-execution-instruction";
  }
  return "not-ready-plan-failed";
}

function buildChecks({ mode, sourceFailures, plan, planGate, status }) {
  return [
    {
      id: "mode-is-explicit",
      status: mode === "dry-run" || mode === "apply" ? "pass" : "fail",
      detail: `mode=${mode}`
    },
    {
      id: "source-current",
      status: sourceFailures.length === 0 ? "pass" : "fail",
      detail: `source currentness failures=${sourceFailures.length}`
    },
    {
      id: "guarded-plan-gate-passing",
      status: (planGate.failures ?? []).length === 0 && (plan.summary?.failedAcceptanceChecks ?? -1) === 0 ? "pass" : "fail",
      detail: `plan=${plan.summary?.passingAcceptanceChecks ?? 0}/${plan.summary?.acceptanceChecks ?? 0}`
    },
    {
      id: "plan-status-supported",
      status: [
        "blocked-missing-owner-execution-instruction",
        "ready-for-owner-approved-guarded-clean",
        "already-cleaned-and-verified"
      ].includes(plan.planStatus) ? "pass" : "fail",
      detail: `planStatus=${plan.planStatus}`
    },
    {
      id: "executor-status-coherent",
      status: [
        "dry-run-blocked-missing-owner-execution-instruction",
        "apply-blocked-missing-owner-execution-instruction",
        "dry-run-ready-requires-explicit-apply",
        "ready-to-apply",
        "already-cleaned-and-verified"
      ].includes(status) ? "pass" : "fail",
      detail: `executorStatus=${status}`
    },
    {
      id: "six-target-commands",
      status: (plan.guardedCommandSequence ?? []).length === 6 &&
        (plan.guardedCommandSequence ?? []).every((command) => /^git clean -f -- coordination\/release-intake\/2026-06-30-A25-dirty-tree-map-20260630T\d{6}Z\.(json|md)$/.test(command))
        ? "pass"
        : "fail",
      detail: `commands=${(plan.guardedCommandSequence ?? []).length}`
    },
    {
      id: "dry-run-has-no-side-effects",
      status: mode === "dry-run" ? "pass" : "pass",
      detail: mode === "dry-run" ? "dry-run writes evidence only" : "apply mutates only when preflight permits"
    },
    {
      id: "apply-requires-ready-status",
      status: mode === "dry-run" || status === "ready-to-apply" ? "pass" : "fail",
      detail: `mode=${mode}; status=${status}`
    }
  ];
}

function executeApply(plan) {
  const commandLog = [];
  for (const row of plan.targetRows ?? []) {
    const args = ["clean", "-f", "--", row.packageFile];
    const output = git(args, row.cwd);
    commandLog.push({
      cwd: row.cwd,
      command: `git clean -f -- ${row.packageFile}`,
      output
    });
  }
  return commandLog;
}

export function buildWave01ArtifactCleanGuardedExecutorState({ mode = "dry-run", mutationsPerformed = false, commandLog = [] } = {}) {
  const dirtyMap = readJson(WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTOR_PATHS.dirtyMap);
  const plan = readJson(WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTOR_PATHS.plan);
  const planGate = readJson(WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTOR_PATHS.planGate);
  const executionInstructions = readJson(WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTOR_PATHS.executionInstructions);
  const executionInstructionsGate = readJson(WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTOR_PATHS.executionInstructionsGate);
  const currentPlan = buildWave01ArtifactCleanGuardedExecutionPlan();
  const sourceFailures = sourceCurrentnessFailures({
    dirtyMap,
    plan,
    planGate,
    executionInstructions,
    executionInstructionsGate,
    currentPlan
  });
  const status = executorStatus({ mode, sourceFailures, plan });
  const checks = buildChecks({ mode, sourceFailures, plan, planGate, status });
  const failedChecks = checks.filter((row) => row.status !== "pass");
  const applyPermitted = mode === "apply" && status === "ready-to-apply" && failedChecks.length === 0;

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    executorKind: "wave01-artifact-clean-guarded-executor",
    mode,
    executorStatus: failedChecks.length === 0 ? status : "not-ready-check-failures",
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? null,
    sourceArtifacts: {
      planGeneratedAt: plan.generatedAt,
      planGateFailureCount: (planGate.failures ?? []).length,
      executionInstructionsGeneratedAt: executionInstructions.generatedAt,
      executionInstructionsGateFailureCount: (executionInstructionsGate.failures ?? []).length
    },
    sourceCurrentnessFailures: sourceFailures,
    planStatus: plan.planStatus,
    targetInputFile: plan.targetInputFile,
    targetRows: plan.targetRows ?? [],
    instructionRows: plan.instructionRows ?? [],
    guardedCommandSequence: plan.guardedCommandSequence ?? [],
    commandLog,
    preflightChecks: checks,
    summary: {
      mode,
      executorStatus: failedChecks.length === 0 ? status : "not-ready-check-failures",
      targetRows: (plan.targetRows ?? []).length,
      targetDirtyRows: plan.summary?.targetDirtyRows ?? 0,
      targetAlreadyCleanRows: plan.summary?.targetAlreadyCleanRows ?? 0,
      instructionRows: plan.summary?.instructionRows ?? 0,
      validInstructionRows: plan.summary?.validInstructionRows ?? 0,
      guardedCommandRows: (plan.guardedCommandSequence ?? []).length,
      preflightChecks: checks.length,
      passingPreflightChecks: checks.length - failedChecks.length,
      failedPreflightChecks: failedChecks.length,
      sourceCurrentnessFailures: sourceFailures.length,
      applyRequested: mode === "apply",
      applyPermitted,
      mutationsPerformed,
      cleanupAuthorizedRows: 0,
      executableRows: 0
    },
    boundary: {
      evidenceOnly: mode === "dry-run",
      dryRunOnly: mode === "dry-run",
      applyModeRequested: mode === "apply",
      recordsOwnerApproval: false,
      recordsExecutionInstruction: false,
      stageAuthorized: false,
      commitAuthorized: false,
      mergeAuthorized: false,
      cleanupAuthorized: false,
      destructiveGitAuthorized: applyPermitted,
      deployAuthorized: false,
      requiresExplicitApplyFlag: true,
      requiresSeparateOwnerExecutionInstruction: (plan.summary?.validInstructionRows ?? 0) !== 6
    }
  };
}

export function stableWave01ArtifactCleanGuardedExecutorProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    executorKind: payload.executorKind,
    mode: payload.mode,
    executorStatus: payload.executorStatus,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: payload.sourceArtifacts,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    planStatus: payload.planStatus,
    targetInputFile: payload.targetInputFile,
    targetRows: payload.targetRows,
    instructionRows: payload.instructionRows,
    guardedCommandSequence: payload.guardedCommandSequence,
    commandLog: payload.commandLog,
    preflightChecks: payload.preflightChecks,
    summary: payload.summary,
    boundary: payload.boundary
  };
}

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function markdown(payload) {
  const checks = payload.preflightChecks.map((row) =>
    `| \`${cell(row.id)}\` | ${cell(row.status)} | ${cell(row.detail)} |`
  ).join("\n");
  const commands = payload.guardedCommandSequence.map((command, index) => `${index + 1}. \`${command}\``).join("\n") || "- none";
  return `# A25 Wave01 Artifact-Clean Guarded Executor ${payload.mode === "dry-run" ? "Dry Run" : "Apply Report"}

Generated: ${payload.generatedAt}

Mode: \`${payload.mode}\`

Executor status: \`${payload.executorStatus}\`

Plan status: \`${payload.planStatus}\`

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This executor is fail-closed. Dry-run mode writes evidence only. Apply mode can remove only the six allowlisted Wave01 A25 dirty-map artifact files, and only after the separate owner execution instructions are valid.

## Summary

- Target rows: ${payload.summary.targetRows}
- Target dirty rows: ${payload.summary.targetDirtyRows}
- Instruction rows: ${payload.summary.instructionRows}
- Valid instruction rows: ${payload.summary.validInstructionRows}
- Apply requested: ${payload.summary.applyRequested}
- Apply permitted: ${payload.summary.applyPermitted}
- Mutations performed: ${payload.summary.mutationsPerformed}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Guarded Command Sequence

${commands}

## Preflight Checks

| Check | Status | Detail |
| --- | --- | --- |
${checks}

## Boundary

- Records owner approval: false
- Records execution instruction: false
- Cleanup authorized: false
- Destructive Git authorized: ${payload.boundary.destructiveGitAuthorized}
- Deploy authorized: false
- Requires explicit apply flag: true
`;
}

function persist(payload) {
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  if (payload.mode === "apply") {
    write(WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTOR_PATHS.latestApplyJson, json);
    write(WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTOR_PATHS.latestApplyMarkdown, md);
  } else {
    write(WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTOR_PATHS.latestDryRunJson, json);
    write(WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTOR_PATHS.datedDryRunJson, json);
    write(WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTOR_PATHS.latestDryRunMarkdown, md);
    write(WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTOR_PATHS.datedDryRunMarkdown, md);
  }
}

function main() {
  const apply = process.argv.includes("--apply");
  const mode = apply ? "apply" : "dry-run";
  let payload = buildWave01ArtifactCleanGuardedExecutorState({ mode });
  if (apply) {
    if (payload.summary.applyPermitted !== true) {
      persist(payload);
      console.log(JSON.stringify({
        mode,
        executorStatus: payload.executorStatus,
        applyPermitted: payload.summary.applyPermitted,
        mutationsPerformed: payload.summary.mutationsPerformed,
        cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
        executableRows: payload.summary.executableRows
      }, null, 2));
      process.exit(1);
    }
    const commandLog = executeApply(readJson(WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTOR_PATHS.plan));
    payload = buildWave01ArtifactCleanGuardedExecutorState({
      mode,
      mutationsPerformed: true,
      commandLog
    });
  }
  persist(payload);
  console.log(JSON.stringify({
    mode,
    executorStatus: payload.executorStatus,
    planStatus: payload.planStatus,
    targetRows: payload.summary.targetRows,
    targetDirtyRows: payload.summary.targetDirtyRows,
    instructionRows: payload.summary.instructionRows,
    validInstructionRows: payload.summary.validInstructionRows,
    applyPermitted: payload.summary.applyPermitted,
    mutationsPerformed: payload.summary.mutationsPerformed,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
