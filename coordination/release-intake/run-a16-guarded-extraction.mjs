#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  A16_GUARDED_EXTRACTION_EXECUTION_PLAN_PATHS,
  buildA16GuardedExtractionExecutionPlan,
  stableA16GuardedExtractionExecutionPlanProjection
} from "./generate-a16-guarded-extraction-execution-plan.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

const expectedCommands = [
  "git add --pathspec-from-file=coordination/release-intake/latest-A25-effective-owner-a16-research-and-learning-science.pathspec",
  "git commit -m \"Add A16 research evidence package\""
];

export const A16_GUARDED_EXTRACTION_EXECUTOR_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  plan: "coordination/release-intake/latest-A25-a16-guarded-extraction-execution-plan.json",
  planGate: "coordination/release-intake/latest-A25-a16-guarded-extraction-execution-plan-current-gate.json",
  ownerInput: "coordination/release-intake/latest-A25-a16-execution-instruction-owner-input.json",
  ownerInputGate: "coordination/release-intake/latest-A25-a16-execution-instruction-owner-input-current-gate.json",
  preExecutionReport: "coordination/release-intake/latest-A25-a16-pre-execution-validation-report.json",
  pathspec: "coordination/release-intake/latest-A25-effective-owner-a16-research-and-learning-science.pathspec",
  latestDryRunJson: "coordination/release-intake/latest-A25-a16-guarded-extraction-executor-dry-run.json",
  latestDryRunMarkdown: "coordination/release-intake/latest-A25-a16-guarded-extraction-executor-dry-run.md",
  datedDryRunJson: `coordination/release-intake/${date}-A25-a16-guarded-extraction-executor-dry-run.json`,
  datedDryRunMarkdown: `coordination/release-intake/${date}-A25-a16-guarded-extraction-executor-dry-run.md`,
  latestApplyJson: "coordination/release-intake/latest-A25-a16-guarded-extraction-executor-apply.json",
  latestApplyMarkdown: "coordination/release-intake/latest-A25-a16-guarded-extraction-executor-apply.md"
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

function readLines(relativePath) {
  return fs.readFileSync(absolute(relativePath), "utf8").split(/\r?\n/).filter(Boolean);
}

function write(relativePath, content) {
  fs.writeFileSync(absolute(relativePath), content);
}

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function sameStringArray(left, right) {
  return JSON.stringify([...(left ?? [])].sort()) === JSON.stringify([...(right ?? [])].sort());
}

function gitNameRows(args) {
  const output = git(args);
  if (!output) return [];
  return output.split("\n").filter(Boolean);
}

function gitStatusRows(paths) {
  const output = git(["status", "--short", "--", ...paths]);
  if (!output) return [];
  return output.split("\n").filter(Boolean).map((line) => ({
    rawStatus: line.slice(0, 2),
    status: line.slice(0, 2).trim() || line.slice(0, 2),
    path: line.slice(3)
  }));
}

function commandSequenceMatches(commands) {
  return expectedCommands.length === commands.length && expectedCommands.every((command, index) => commands[index] === command);
}

function ownerInstructionRows(ownerInput) {
  return Array.isArray(ownerInput.instructions) ? ownerInput.instructions : [];
}

function sourceCurrentnessFailures({ dirtyMap, plan, planGate, ownerInput, ownerInputGate, preExecution, currentPlan }) {
  const failures = [];
  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  const alreadyExtracted = plan.planStatus === "already-extracted-and-verified";
  const requiredCurrentSources = alreadyExtracted
    ? [["A16 guarded extraction execution plan", plan]]
    : [
        ["A16 guarded extraction execution plan", plan],
        ["A16 execution-instruction owner input", ownerInput],
        ["A16 pre-execution validation report", preExecution]
      ];
  for (const [label, payload] of requiredCurrentSources) {
    if (payload.dirtyMapStatusSignature !== expectedSignature) failures.push(`${label} dirty-map signature is stale`);
    if (payload.expandedStatusEntries !== expectedEntries) failures.push(`${label} expanded dirty entry count is stale`);
  }
  const requiredCurrentGates = alreadyExtracted
    ? [["A16 guarded plan gate", planGate]]
    : [
        ["A16 guarded plan gate", planGate],
        ["A16 owner-input gate", ownerInputGate]
      ];
  for (const [label, gate] of requiredCurrentGates) {
    if (gate.dirtyMapStatusSignature !== expectedSignature) failures.push(`${label} dirty-map signature is stale`);
    if (gate.expandedStatusEntries !== expectedEntries) failures.push(`${label} expanded dirty entry count is stale`);
    if ((gate.failures ?? []).length !== 0) failures.push(`${label} has failures`);
  }
  if (alreadyExtracted && (ownerInputGate.failures ?? []).length !== 0) failures.push("A16 owner-input gate has failures");
  if (!sameJson(
    stableA16GuardedExtractionExecutionPlanProjection(plan),
    stableA16GuardedExtractionExecutionPlanProjection(currentPlan)
  )) {
    failures.push("A16 guarded extraction execution plan is stale versus current build");
  }
  return failures;
}

function validateOwnerInstruction({ ownerInput, ownerInputGate, plan }) {
  const rows = ownerInstructionRows(ownerInput);
  const row = rows[0] ?? {};
  const failures = [];
  if ((ownerInputGate.validInstructionRows ?? 0) !== 1) failures.push("owner-input gate does not have exactly 1 valid instruction row");
  if (rows.length !== 1) failures.push("owner input must have exactly 1 instruction row");
  if (row.instructionId !== plan.expectedInstructionId) failures.push("instructionId does not match the guarded plan expectedInstructionId");
  if (row.approvalId !== plan.approvalId) failures.push("approvalId does not match the guarded plan approvalId");
  if (!commandSequenceMatches(row.commandSequence ?? [])) failures.push("instruction command sequence does not match the guarded exact command sequence");
  if (!sameStringArray(row.packageFiles ?? [], plan.packageFiles ?? [])) failures.push("instruction package files do not match the guarded plan package files");
  if (row.cleanupAuthorized !== false) failures.push("instruction cleanupAuthorized must be false");
  if (row.destructiveGitAuthorized !== false) failures.push("instruction destructiveGitAuthorized must be false");
  if (row.deployAuthorized !== false) failures.push("instruction deployAuthorized must be false");
  return {
    instructionRows: rows.length,
    validInstructionRows: ownerInputGate.validInstructionRows ?? 0,
    instructionId: row.instructionId ?? "",
    failures
  };
}

function executorStatus({ mode, sourceFailures, plan, instruction, stagedRows, packageStatusRows }) {
  if (sourceFailures.length > 0) return "not-ready-source-stale";
  if (plan.planStatus === "already-extracted-and-verified") return "already-extracted-and-verified";
  if (plan.planStatus === "ready-for-owner-approved-guarded-extraction" &&
    instruction.failures.length === 0 &&
    stagedRows.length === 0 &&
    packageStatusRows.length === 6) {
    return mode === "apply" ? "ready-to-apply" : "dry-run-ready-requires-explicit-apply";
  }
  return mode === "apply" ? "apply-blocked-missing-owner-execution-instruction" : "dry-run-blocked-missing-owner-execution-instruction";
}

function buildChecks({ mode, sourceFailures, plan, planGate, instruction, pathspecRows, packageStatusRows, stagedRows, packageStagedRows, commands, status }) {
  const packageFiles = plan.packageFiles ?? [];
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
      detail: `guarded plan=${plan.summary?.passingAcceptanceChecks ?? 0}/${plan.summary?.acceptanceChecks ?? 0}`
    },
    {
      id: "owner-instruction-state-coherent",
      status: (status.includes("blocked") && instruction.instructionRows === 0 && instruction.validInstructionRows === 0) ||
        (status === "dry-run-ready-requires-explicit-apply" && instruction.instructionRows === 1 && instruction.validInstructionRows === 1) ||
        (status === "ready-to-apply" && instruction.instructionRows === 1 && instruction.validInstructionRows === 1) ||
        status === "already-extracted-and-verified"
        ? "pass"
        : "fail",
      detail: `instruction rows=${instruction.instructionRows}; valid=${instruction.validInstructionRows}; instruction failures=${instruction.failures.length}`
    },
    {
      id: "pathspec-matches-package",
      status: sameStringArray(pathspecRows, packageFiles) && pathspecRows.length === 6 ? "pass" : "fail",
      detail: `pathspec rows=${pathspecRows.length}; package files=${packageFiles.length}`
    },
    {
      id: "package-status-before-apply",
      status: (status === "already-extracted-and-verified" && packageStatusRows.length === 0) ||
        (status !== "already-extracted-and-verified" && packageStatusRows.length === 6 && packageStatusRows.every((row) => row.rawStatus === "??"))
        ? "pass"
        : "fail",
      detail: `package dirty rows=${packageStatusRows.length}`
    },
    {
      id: "no-staged-before-apply",
      status: stagedRows.length === 0 && packageStagedRows.length === 0 ? "pass" : "fail",
      detail: `staged rows=${stagedRows.length}; package staged rows=${packageStagedRows.length}`
    },
    {
      id: "exact-command-sequence-only",
      status: commandSequenceMatches(commands) ? "pass" : "fail",
      detail: `command rows=${commands.length}`
    },
    {
      id: "dry-run-has-no-side-effects",
      status: mode === "dry-run" ? "pass" : "pass",
      detail: mode === "dry-run" ? "dry-run writes only evidence files" : "apply mode must pass all preflight checks before mutation"
    }
  ];
}

export function buildA16GuardedExtractionExecutorState({ mode = "dry-run", mutationsPerformed = false, commandLog = [] } = {}) {
  const dirtyMap = readJson(A16_GUARDED_EXTRACTION_EXECUTOR_PATHS.dirtyMap);
  const plan = readJson(A16_GUARDED_EXTRACTION_EXECUTOR_PATHS.plan);
  const planGate = readJson(A16_GUARDED_EXTRACTION_EXECUTOR_PATHS.planGate);
  const ownerInput = readJson(A16_GUARDED_EXTRACTION_EXECUTOR_PATHS.ownerInput);
  const ownerInputGate = readJson(A16_GUARDED_EXTRACTION_EXECUTOR_PATHS.ownerInputGate);
  const preExecution = readJson(A16_GUARDED_EXTRACTION_EXECUTOR_PATHS.preExecutionReport);
  const currentPlan = buildA16GuardedExtractionExecutionPlan();
  const pathspecRows = readLines(A16_GUARDED_EXTRACTION_EXECUTOR_PATHS.pathspec);
  const packageFiles = plan.packageFiles ?? [];
  const packageStatusRows = gitStatusRows(packageFiles);
  const stagedRows = gitNameRows(["diff", "--cached", "--name-only"]);
  const packageStagedRows = gitNameRows(["diff", "--cached", "--name-only", "--", ...packageFiles]);
  const commands = plan.guardedCommandSequence ?? [];
  const sourceFailures = sourceCurrentnessFailures({ dirtyMap, plan, planGate, ownerInput, ownerInputGate, preExecution, currentPlan });
  const instruction = validateOwnerInstruction({ ownerInput, ownerInputGate, plan });
  const status = executorStatus({ mode, sourceFailures, plan, instruction, stagedRows, packageStatusRows });
  const checks = buildChecks({
    mode,
    sourceFailures,
    plan,
    planGate,
    instruction,
    pathspecRows,
    packageStatusRows,
    stagedRows,
    packageStagedRows,
    commands,
    status
  });
  const failedChecks = checks.filter((row) => row.status !== "pass");
  const applyPermitted = status === "ready-to-apply" && failedChecks.length === 0;

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    executorKind: "a16-guarded-extraction-executor",
    mode,
    executorStatus: failedChecks.length === 0 ? status : "not-ready-check-failures",
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? null,
    sourceArtifacts: {
      planGeneratedAt: plan.generatedAt,
      planGateFailureCount: (planGate.failures ?? []).length,
      ownerInputGeneratedAt: ownerInput.generatedAt,
      ownerInputGateFailureCount: (ownerInputGate.failures ?? []).length,
      preExecutionGeneratedAt: preExecution.generatedAt
    },
    sourceCurrentnessFailures: sourceFailures,
    planStatus: plan.planStatus,
    candidateId: plan.candidateId,
    approvalId: plan.approvalId,
    expectedInstructionId: plan.expectedInstructionId,
    instructionValidationFailures: instruction.failures,
    packageFiles,
    pathspecRows,
    packageStatusRows,
    stagedRows,
    packageStagedRows,
    guardedCommandSequence: commands,
    commandLog,
    preflightChecks: checks,
    summary: {
      mode,
      executorStatus: failedChecks.length === 0 ? status : "not-ready-check-failures",
      packageFileRows: packageFiles.length,
      pathspecRows: pathspecRows.length,
      packageDirtyRows: packageStatusRows.length,
      stagedRows: stagedRows.length,
      packageStagedRows: packageStagedRows.length,
      ownerInstructionRows: instruction.instructionRows,
      validOwnerInstructionRows: instruction.validInstructionRows,
      instructionValidationFailures: instruction.failures.length,
      guardedCommandRows: commands.length,
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
      broadStagingAuthorized: false,
      stageAuthorizedByExecutor: applyPermitted,
      commitAuthorizedByExecutor: applyPermitted,
      mergeAuthorized: false,
      cleanupAuthorized: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false,
      requiresExplicitApplyFlag: true,
      requiresSeparateOwnerExecutionInstruction: instruction.validInstructionRows !== 1
    }
  };
}

export function stableA16GuardedExtractionExecutorProjection(payload) {
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
    candidateId: payload.candidateId,
    approvalId: payload.approvalId,
    expectedInstructionId: payload.expectedInstructionId,
    instructionValidationFailures: payload.instructionValidationFailures,
    packageFiles: payload.packageFiles,
    pathspecRows: payload.pathspecRows,
    packageStatusRows: payload.packageStatusRows,
    stagedRows: payload.stagedRows,
    packageStagedRows: payload.packageStagedRows,
    guardedCommandSequence: payload.guardedCommandSequence,
    preflightChecks: payload.preflightChecks,
    summary: payload.summary,
    boundary: payload.boundary
  };
}

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function markdown(payload) {
  const commandRows = payload.guardedCommandSequence.map((command, index) => `${index + 1}. \`${command}\``).join("\n");
  const checkRows = payload.preflightChecks.map((row) => `| \`${cell(row.id)}\` | ${cell(row.status)} | ${cell(row.detail)} |`).join("\n");
  return `# A25 A16 Guarded Extraction Executor ${payload.mode === "dry-run" ? "Dry Run" : "Apply Report"}

Generated: ${payload.generatedAt}

Mode: \`${payload.mode}\`

Executor status: \`${payload.executorStatus}\`

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This artifact is fail-closed. Dry-run mode writes evidence only. Apply mode is allowed only when a separate owner execution instruction is valid and the exact A16 pathspec preflight passes.

## Summary

- Plan status: ${payload.planStatus}
- Package files: ${payload.summary.packageFileRows}
- Pathspec rows: ${payload.summary.pathspecRows}
- Package dirty rows: ${payload.summary.packageDirtyRows}
- Staged rows: ${payload.summary.stagedRows}
- Owner instruction rows: ${payload.summary.ownerInstructionRows}
- Valid owner instruction rows: ${payload.summary.validOwnerInstructionRows}
- Instruction validation failures: ${payload.summary.instructionValidationFailures}
- Apply requested: ${payload.summary.applyRequested}
- Apply permitted: ${payload.summary.applyPermitted}
- Mutations performed: ${payload.summary.mutationsPerformed}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Guarded Command Sequence

${commandRows}

## Preflight Checks

| Check | Status | Detail |
| --- | --- | --- |
${checkRows}

## Boundary

- Evidence only: ${payload.boundary.evidenceOnly}.
- Dry run only: ${payload.boundary.dryRunOnly}.
- Apply mode requested: ${payload.boundary.applyModeRequested}.
- Records owner approval: ${payload.boundary.recordsOwnerApproval}.
- Records execution instruction: ${payload.boundary.recordsExecutionInstruction}.
- Broad staging authorized: ${payload.boundary.broadStagingAuthorized}.
- Stage authorized by executor: ${payload.boundary.stageAuthorizedByExecutor}.
- Commit authorized by executor: ${payload.boundary.commitAuthorizedByExecutor}.
- Cleanup authorized: ${payload.boundary.cleanupAuthorized}.
- Deploy authorized: ${payload.boundary.deployAuthorized}.
- Requires explicit apply flag: ${payload.boundary.requiresExplicitApplyFlag}.
- Requires separate owner execution instruction: ${payload.boundary.requiresSeparateOwnerExecutionInstruction}.
`;
}

export function writeA16GuardedExtractionExecutorDryRun() {
  const payload = buildA16GuardedExtractionExecutorState({ mode: "dry-run" });
  write(A16_GUARDED_EXTRACTION_EXECUTOR_PATHS.latestDryRunJson, `${JSON.stringify(payload, null, 2)}\n`);
  write(A16_GUARDED_EXTRACTION_EXECUTOR_PATHS.latestDryRunMarkdown, markdown(payload));
  write(A16_GUARDED_EXTRACTION_EXECUTOR_PATHS.datedDryRunJson, `${JSON.stringify(payload, null, 2)}\n`);
  write(A16_GUARDED_EXTRACTION_EXECUTOR_PATHS.datedDryRunMarkdown, markdown(payload));
  return payload;
}

function assertApplyPreflight(payload) {
  if (payload.summary.applyPermitted !== true) {
    throw new Error(`A16 guarded extraction apply blocked: ${payload.executorStatus}`);
  }
}

function runApply() {
  const before = buildA16GuardedExtractionExecutorState({ mode: "apply" });
  assertApplyPreflight(before);
  const commandLog = [];
  execFileSync("git", ["add", `--pathspec-from-file=${A16_GUARDED_EXTRACTION_EXECUTOR_PATHS.pathspec}`], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  });
  commandLog.push({ command: expectedCommands[0], status: "ran" });

  const stagedAfterAdd = gitNameRows(["diff", "--cached", "--name-only"]);
  if (!sameStringArray(stagedAfterAdd, before.packageFiles)) {
    throw new Error("A16 guarded extraction apply blocked after git add: staged files do not match the A16 package");
  }

  execFileSync("git", ["commit", "-m", "Add A16 research evidence package"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  });
  commandLog.push({ command: expectedCommands[1], status: "ran" });

  const after = buildA16GuardedExtractionExecutorState({
    mode: "apply",
    mutationsPerformed: true,
    commandLog
  });
  write(A16_GUARDED_EXTRACTION_EXECUTOR_PATHS.latestApplyJson, `${JSON.stringify(after, null, 2)}\n`);
  write(A16_GUARDED_EXTRACTION_EXECUTOR_PATHS.latestApplyMarkdown, markdown(after));
  return after;
}

function main() {
  const apply = process.argv.includes("--apply");
  const payload = apply ? runApply() : writeA16GuardedExtractionExecutorDryRun();
  console.log(JSON.stringify({
    mode: payload.mode,
    executorStatus: payload.executorStatus,
    packageFileRows: payload.summary.packageFileRows,
    packageDirtyRows: payload.summary.packageDirtyRows,
    stagedRows: payload.summary.stagedRows,
    ownerInstructionRows: payload.summary.ownerInstructionRows,
    validOwnerInstructionRows: payload.summary.validOwnerInstructionRows,
    applyRequested: payload.summary.applyRequested,
    applyPermitted: payload.summary.applyPermitted,
    mutationsPerformed: payload.summary.mutationsPerformed,
    passingPreflightChecks: payload.summary.passingPreflightChecks,
    preflightChecks: payload.summary.preflightChecks,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
