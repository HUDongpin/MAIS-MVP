#!/usr/bin/env node
import { spawnSync, execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_PLAN_PATHS,
  buildA22GeneratedArtifactGuardedCleanupPlan,
  stableA22GeneratedArtifactGuardedCleanupPlanProjection
} from "./generate-a22-generated-artifact-guarded-cleanup-plan.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();
const cleanupScriptCommand = "node scripts/cleanup-generated-artifacts.mjs --apply --scope all";
const cleanupScriptArgs = ["scripts/cleanup-generated-artifacts.mjs", "--apply", "--scope", "all", "--json"];

export const A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_EXECUTOR_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  plan: A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_PLAN_PATHS.latestJson,
  latestDryRunJson: "coordination/release-intake/latest-A22-generated-artifact-guarded-cleanup-dry-run.json",
  latestDryRunMarkdown: "coordination/release-intake/latest-A22-generated-artifact-guarded-cleanup-dry-run.md",
  datedDryRunJson: `coordination/release-intake/${date}-A22-generated-artifact-guarded-cleanup-dry-run.json`,
  datedDryRunMarkdown: `coordination/release-intake/${date}-A22-generated-artifact-guarded-cleanup-dry-run.md`,
  latestApplyJson: "coordination/release-intake/latest-A22-generated-artifact-guarded-cleanup-apply.json",
  latestApplyMarkdown: "coordination/release-intake/latest-A22-generated-artifact-guarded-cleanup-apply.md",
  datedApplyJson: `coordination/release-intake/${date}-A22-generated-artifact-guarded-cleanup-apply.json`,
  datedApplyMarkdown: `coordination/release-intake/${date}-A22-generated-artifact-guarded-cleanup-apply.md`
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

function parseArgs(argv) {
  return {
    apply: argv.includes("--apply"),
    json: argv.includes("--json")
  };
}

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function executorStatus({ mode, sourceFailures, plan }) {
  if (sourceFailures.length > 0) return "not-ready-source-stale";
  if (plan.planStatus === "already-cleaned-and-verified") return "already-cleaned-and-verified";
  if (plan.planStatus === "pending-a22-generated-artifact-owner-decision") {
    return mode === "apply" ? "apply-blocked-pending-owner-decision" : "dry-run-pending-owner-decision";
  }
  if (plan.planStatus === "ready-for-owner-approved-generated-cleanup") {
    return mode === "apply" ? "ready-to-apply" : "dry-run-ready-requires-explicit-apply";
  }
  return mode === "apply" ? "apply-blocked-a22-guarded-cleanup" : "dry-run-blocked-a22-guarded-cleanup";
}

function isAllowedGeneratedCleanupCommand(command) {
  if (command === cleanupScriptCommand) return true;
  return /^git clean -fdX -- \.s11-parent-audit-next[0-9]+$/.test(command ?? "");
}

function buildChecks({ mode, sourceFailures, plan, status }) {
  const targetRows = plan.targetRows ?? [];
  const commandSequence = plan.commandSequence ?? [];
  const executableRows = plan.summary?.executableRows ?? 0;
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
      id: "plan-ready-or-clean",
      status: [
        "ready-for-owner-approved-generated-cleanup",
        "already-cleaned-and-verified",
        "pending-a22-generated-artifact-owner-decision"
      ].includes(plan.planStatus) ? "pass" : "fail",
      detail: `planStatus=${plan.planStatus}`
    },
    {
      id: "exact-command",
      status: (
        plan.planStatus === "already-cleaned-and-verified" &&
        commandSequence.length === 0 &&
        targetRows.length === 0
      ) || (
        commandSequence.length > 0 &&
        targetRows.every((row) => isAllowedGeneratedCleanupCommand(row.command))
      ) ? "pass" : "fail",
      detail: `commandSequenceRows=${commandSequence.length}`
    },
    {
      id: "executable-rows-before-apply-or-clean-after",
      status: (plan.planStatus === "ready-for-owner-approved-generated-cleanup" && executableRows > 0 && executableRows === targetRows.length) ||
        (plan.planStatus === "already-cleaned-and-verified" && plan.summary?.executableRows === 0) ||
        (plan.planStatus === "pending-a22-generated-artifact-owner-decision" && plan.summary?.executableRows === 0) ? "pass" : "fail",
      detail: `executableRows=${plan.summary?.executableRows ?? "n/a"}`
    },
    {
      id: "apply-requires-ready-status",
      status: mode === "dry-run" || status === "ready-to-apply" ? "pass" : "fail",
      detail: `mode=${mode}; status=${status}`
    },
    {
      id: "no-stage-commit-merge-deploy",
      status: "pass",
      detail: "executor only calls the guarded A22 generated-artifact cleanup command sequence in apply mode"
    }
  ];
}

function runCleanupScriptStep(step) {
  const result = spawnSync(process.execPath, cleanupScriptArgs, {
    cwd: step.cwd || root,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  });
  let payload = null;
  let parseError = "";
  try {
    payload = result.stdout ? JSON.parse(result.stdout) : null;
  } catch (error) {
    parseError = error.message;
  }
  return {
    command: cleanupScriptCommand,
    cwd: step.cwd || root,
    status: result.status ?? 1,
    stdout: result.stdout,
    stderr: result.stderr,
    parseError,
    payload
  };
}

function runGitCleanStep(step) {
  const match = /^git clean -fdX -- (\.s11-parent-audit-next[0-9]+)$/.exec(step.command ?? "");
  if (!match) {
    return {
      command: step.command,
      cwd: step.cwd || root,
      status: "blocked",
      stdout: "",
      stderr: "",
      parseError: "",
      payload: null,
      reason: "unsupported exact git clean command"
    };
  }
  const result = spawnSync("git", ["clean", "-fdX", "--", match[1]], {
    cwd: step.cwd || root,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  });
  return {
    command: step.command,
    cwd: step.cwd || root,
    status: result.status ?? 1,
    stdout: result.stdout,
    stderr: result.stderr,
    parseError: "",
    payload: null
  };
}

function runCommandStep(step) {
  if (step.command === cleanupScriptCommand) return runCleanupScriptStep(step);
  return runGitCleanStep(step);
}

function runApply(plan) {
  const commandSequence = plan.commandSequence ?? [];
  if (commandSequence.length === 0) {
    return {
      commandLog: [{ command: "none", cwd: root, status: "blocked", reason: "empty command sequence" }],
      mutationsPerformed: false
    };
  }
  const commandLog = [];
  for (const step of commandSequence) {
    const result = runCommandStep(step);
    commandLog.push(result);
    if (result.status !== 0) break;
  }
  return {
    commandLog,
    mutationsPerformed: commandLog.length === commandSequence.length && commandLog.every((row) => row.status === 0)
  };
}

export function buildA22GeneratedArtifactGuardedCleanupExecutorState({ mode = "dry-run", commandLog = [], mutationsPerformed = false } = {}) {
  const dirtyMap = readJson(A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_EXECUTOR_PATHS.dirtyMap);
  const plan = readJson(A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_EXECUTOR_PATHS.plan);
  const currentPlan = buildA22GeneratedArtifactGuardedCleanupPlan();
  const sourceFailures = [];
  if (!sameJson(
    stableA22GeneratedArtifactGuardedCleanupPlanProjection(plan),
    stableA22GeneratedArtifactGuardedCleanupPlanProjection(currentPlan)
  )) {
    sourceFailures.push("A22 guarded cleanup plan is stale versus current build");
  }
  if (plan.dirtyMapStatusSignature !== dirtyMap.statusSignature) sourceFailures.push("plan dirty-map signature is stale");
  if (plan.expandedStatusEntries !== (dirtyMap.statusCounts?.expandedStatusEntries ?? null)) sourceFailures.push("plan expanded dirty entry count is stale");
  const status = executorStatus({ mode, sourceFailures, plan });
  const checks = buildChecks({ mode, sourceFailures, plan, status });
  const failedChecks = checks.filter((row) => row.status !== "pass");
  const applyPermitted = mode === "apply" && status === "ready-to-apply" && failedChecks.length === 0;
  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    executorKind: "a22-generated-artifact-guarded-cleanup-executor",
    mode,
    executorStatus: failedChecks.length === 0 ? status : "not-ready-check-failures",
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? null,
    sourceArtifacts: {
      planGeneratedAt: plan.generatedAt
    },
    sourceCurrentnessFailures: sourceFailures,
    planStatus: plan.planStatus,
    exactCommand: plan.exactCommand,
    commandSequence: plan.commandSequence ?? [],
    commandCwd: plan.commandCwd,
    targetRows: plan.targetRows ?? [],
    commandLog,
    preflightChecks: checks,
    summary: {
      mode,
      executorStatus: failedChecks.length === 0 ? status : "not-ready-check-failures",
      planStatus: plan.planStatus,
      targetRows: plan.summary?.targetRows ?? 0,
      cleanupAuthorizedRows: plan.summary?.cleanupAuthorizedRows ?? 0,
      executableRows: plan.summary?.executableRows ?? 0,
      preflightChecks: checks.length,
      passingPreflightChecks: checks.length - failedChecks.length,
      failedPreflightChecks: failedChecks.length,
      sourceCurrentnessFailures: sourceFailures.length,
      applyRequested: mode === "apply",
      applyPermitted,
      mutationsPerformed
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
      cleanupAuthorized: (plan.summary?.cleanupAuthorizedRows ?? 0) === (plan.summary?.targetRows ?? 0) && (plan.summary?.targetRows ?? 0) > 0,
      executableNow: (plan.summary?.executableRows ?? 0) === (plan.summary?.targetRows ?? 0) && (plan.summary?.targetRows ?? 0) > 0,
      destructiveGitAuthorized: applyPermitted && (plan.commandSequence ?? []).some((row) => String(row.command ?? "").startsWith("git clean -fdX -- ")),
      fileDeletionAuthorized: applyPermitted,
      deployAuthorized: false,
      requiresExplicitApplyFlag: true,
      allowedCommand: plan.exactCommand,
      allowedCommandSequence: plan.commandSequence ?? []
    }
  };
}

export function stableA22GeneratedArtifactGuardedCleanupExecutorProjection(payload) {
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
    exactCommand: payload.exactCommand,
    commandSequence: payload.commandSequence,
    commandCwd: payload.commandCwd,
    targetRows: payload.targetRows,
    commandLog: payload.commandLog,
    preflightChecks: payload.preflightChecks,
    summary: payload.summary,
    boundary: payload.boundary
  };
}

function markdown(payload) {
  return `# A22 Generated Artifact Guarded Cleanup ${payload.mode === "apply" ? "Apply" : "Dry Run"}

Generated: ${payload.generatedAt}

Executor status: ${payload.executorStatus}

Plan status: ${payload.planStatus}

Exact command: \`${payload.exactCommand}\`

CWD: \`${payload.commandCwd}\`

Command sequence rows: ${payload.commandSequence?.length ?? 0}

## Summary

- Mode: ${payload.mode}
- Apply requested: ${payload.summary.applyRequested}
- Apply permitted: ${payload.summary.applyPermitted}
- Mutations performed: ${payload.summary.mutationsPerformed}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}
- Preflight checks: ${payload.summary.passingPreflightChecks}/${payload.summary.preflightChecks}
- Deploy authorized: false

This executor does not stage, commit, merge, push, reset, remove worktrees, delete branches, or deploy. Apply mode only calls the exact guarded command sequence above after the guarded plan is ready.
`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const mode = args.apply ? "apply" : "dry-run";
  let state = buildA22GeneratedArtifactGuardedCleanupExecutorState({ mode });
  let commandLog = [];
  let mutationsPerformed = false;

  if (args.apply) {
    const preApplyState = state;
    if (preApplyState.summary.applyPermitted !== true) {
      commandLog = [{ command: "see plan commandSequence", cwd: root, status: "blocked", reason: preApplyState.executorStatus }];
    } else {
      const applyResult = runApply(preApplyState);
      commandLog = applyResult.commandLog;
      mutationsPerformed = applyResult.mutationsPerformed;
    }
    state = {
      ...preApplyState,
      generatedAt: new Date().toISOString(),
      mode,
      executorStatus: mutationsPerformed ? "apply-complete" : preApplyState.executorStatus,
      commandLog,
      summary: {
        ...preApplyState.summary,
        mode,
        executorStatus: mutationsPerformed ? "apply-complete" : preApplyState.executorStatus,
        applyRequested: true,
        applyPermitted: preApplyState.summary.applyPermitted === true,
        mutationsPerformed
      },
      boundary: {
        ...preApplyState.boundary,
        evidenceOnly: false,
        dryRunOnly: false,
        applyModeRequested: true,
        fileDeletionAuthorized: preApplyState.summary.applyPermitted === true,
        deployAuthorized: false
      }
    };
  }

  const json = `${JSON.stringify(state, null, 2)}\n`;
  const md = markdown(state);
  const jsonTargets = args.apply
    ? [A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_EXECUTOR_PATHS.latestApplyJson, A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_EXECUTOR_PATHS.datedApplyJson]
    : [A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_EXECUTOR_PATHS.latestDryRunJson, A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_EXECUTOR_PATHS.datedDryRunJson];
  const mdTargets = args.apply
    ? [A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_EXECUTOR_PATHS.latestApplyMarkdown, A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_EXECUTOR_PATHS.datedApplyMarkdown]
    : [A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_EXECUTOR_PATHS.latestDryRunMarkdown, A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_EXECUTOR_PATHS.datedDryRunMarkdown];
  for (const target of jsonTargets) write(target, json);
  for (const target of mdTargets) write(target, md);

  const summary = {
    mode,
    executorStatus: state.executorStatus,
    applyPermitted: state.summary.applyPermitted,
    mutationsPerformed: state.summary.mutationsPerformed,
    cleanupAuthorizedRows: state.summary.cleanupAuthorizedRows,
    executableRows: state.summary.executableRows,
    failedPreflightChecks: state.summary.failedPreflightChecks
  };
  if (args.json) console.log(JSON.stringify(summary, null, 2));
  else {
    console.log("A22 generated-artifact guarded cleanup executor");
    console.log(`Mode: ${mode}`);
    console.log(`Executor status: ${state.executorStatus}`);
    console.log(`Executable rows: ${state.summary.executableRows}`);
    console.log(`Apply permitted: ${state.summary.applyPermitted ? "yes" : "no"}`);
    console.log(`Mutations performed: ${state.summary.mutationsPerformed ? "yes" : "no"}`);
  }
  if (args.apply && state.summary.applyPermitted !== true) process.exit(1);
  if (args.apply && state.summary.mutationsPerformed !== true) process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
