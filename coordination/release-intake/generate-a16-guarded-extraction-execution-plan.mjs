#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const A16_GUARDED_EXTRACTION_EXECUTION_PLAN_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  readiness: "coordination/release-intake/latest-A25-a16-extraction-execution-readiness.json",
  readinessGate: "coordination/release-intake/latest-A25-a16-extraction-execution-readiness-current-gate.json",
  acceptanceDocket: "coordination/release-intake/latest-A25-next-owner-execution-instruction-acceptance-docket.json",
  ownerInput: "coordination/release-intake/latest-A25-a16-execution-instruction-owner-input.json",
  ownerInputGate: "coordination/release-intake/latest-A25-a16-execution-instruction-owner-input-current-gate.json",
  preExecutionReport: "coordination/release-intake/latest-A25-a16-pre-execution-validation-report.json",
  closeoutDocket: "coordination/release-intake/latest-A25-a16-extraction-closeout-docket.json",
  pathspec: "coordination/release-intake/latest-A25-effective-owner-a16-research-and-learning-science.pathspec",
  latestJson: "coordination/release-intake/latest-A25-a16-guarded-extraction-execution-plan.json",
  latestMarkdown: "coordination/release-intake/latest-A25-a16-guarded-extraction-execution-plan.md",
  datedJson: `coordination/release-intake/${date}-A25-a16-guarded-extraction-execution-plan.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-a16-guarded-extraction-execution-plan.md`
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

function sourceCurrentnessFailures({ dirtyMap, readiness, readinessGate, acceptanceDocket, ownerInput, ownerInputGate, preExecution, closeout }) {
  const failures = [];
  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  const verified = readiness.readinessStatus === "post-extraction-verified" &&
    closeout.lifecycleStatus === "post-extraction-verified" &&
    closeout.postExtractionVerified === true;
  const requiredCurrentSources = verified
    ? [
        ["A16 extraction execution readiness", readiness],
        ["A16 extraction closeout docket", closeout]
      ]
    : [
        ["A16 extraction execution readiness", readiness],
        ["next-owner execution-instruction acceptance docket", acceptanceDocket],
        ["A16 execution-instruction owner input", ownerInput],
        ["A16 pre-execution validation report", preExecution],
        ["A16 extraction closeout docket", closeout]
      ];
  for (const [label, payload] of requiredCurrentSources) {
    if (payload.dirtyMapStatusSignature !== expectedSignature) failures.push(`${label} dirty-map signature is stale`);
    if (payload.expandedStatusEntries !== expectedEntries) failures.push(`${label} expanded dirty entry count is stale`);
  }
  const requiredCurrentGates = verified
    ? [["A16 extraction execution readiness gate", readinessGate]]
    : [
        ["A16 extraction execution readiness gate", readinessGate],
        ["A16 owner-input gate", ownerInputGate]
      ];
  for (const [label, gate] of requiredCurrentGates) {
    if (gate.dirtyMapStatusSignature !== expectedSignature) failures.push(`${label} dirty-map signature is stale`);
    if (gate.expandedStatusEntries !== expectedEntries) failures.push(`${label} expanded dirty entry count is stale`);
    if ((gate.failures ?? []).length !== 0) failures.push(`${label} has failures`);
  }
  if (verified && (ownerInputGate.failures ?? []).length !== 0) failures.push("A16 owner-input gate has failures");
  return failures;
}

function planStatus({ sourceFailures, readiness, ownerInputGate, packageStatusRows, stagedRows }) {
  if (sourceFailures.length > 0) return "not-ready-source-stale";
  if (readiness.readinessStatus === "post-extraction-verified") return "already-extracted-and-verified";
  if ((ownerInputGate.validInstructionRows ?? 0) === 1 && packageStatusRows.length === 6 && stagedRows.length === 0) {
    return "ready-for-owner-approved-guarded-extraction";
  }
  return "blocked-missing-owner-execution-instruction";
}

function buildChecks({ sourceFailures, readiness, readinessGate, acceptanceRow, ownerInput, ownerInputGate, preExecution, closeout, pathspecRows, packageStatusRows, stagedRows, packageStagedRows, exactCommands, status }) {
  const packageFiles = readiness.packageFiles ?? closeout.packageFiles ?? preExecution.packageFiles ?? [];
  return [
    {
      id: "source-current",
      status: sourceFailures.length === 0 ? "pass" : "fail",
      detail: `source currentness failures=${sourceFailures.length}`
    },
    {
      id: "readiness-gate-passing",
      status: (readinessGate.failures ?? []).length === 0 &&
        readiness.summary?.passingAcceptanceChecks === readiness.summary?.acceptanceChecks
        ? "pass"
        : "fail",
      detail: `readiness=${readiness.summary?.passingAcceptanceChecks ?? 0}/${readiness.summary?.acceptanceChecks ?? 0}`
    },
    {
      id: "owner-instruction-state-matches-plan-status",
      status: (
        status === "blocked-missing-owner-execution-instruction" &&
        (ownerInputGate.instructionRows ?? 0) === 0 &&
        (ownerInputGate.validInstructionRows ?? 0) === 0
      ) || (
        status === "ready-for-owner-approved-guarded-extraction" &&
        (ownerInputGate.instructionRows ?? 0) === 1 &&
        (ownerInputGate.validInstructionRows ?? 0) === 1
      ) || status === "already-extracted-and-verified"
        ? "pass"
        : "fail",
      detail: `status=${status}; owner rows=${ownerInputGate.instructionRows ?? 0}; valid rows=${ownerInputGate.validInstructionRows ?? 0}`
    },
    {
      id: "pathspec-matches-package",
      status: sameStringArray(pathspecRows, packageFiles) && pathspecRows.length === 6 ? "pass" : "fail",
      detail: `pathspec rows=${pathspecRows.length}; package files=${packageFiles.length}`
    },
    {
      id: "package-status-safe",
      status: (status === "already-extracted-and-verified" && packageStatusRows.length === 0) ||
        (status !== "already-extracted-and-verified" && packageStatusRows.length === 6 && packageStatusRows.every((row) => row.rawStatus === "??"))
        ? "pass"
        : "fail",
      detail: `package dirty rows=${packageStatusRows.length}`
    },
    {
      id: "no-staged-input",
      status: stagedRows.length === 0 && packageStagedRows.length === 0 ? "pass" : "fail",
      detail: `staged rows=${stagedRows.length}; package staged rows=${packageStagedRows.length}`
    },
    {
      id: "exact-command-sequence-only",
      status: exactCommands.length === 2 &&
        exactCommands[0] === "git add --pathspec-from-file=coordination/release-intake/latest-A25-effective-owner-a16-research-and-learning-science.pathspec" &&
        exactCommands[1] === "git commit -m \"Add A16 research evidence package\""
        ? "pass"
        : "fail",
      detail: `exact commands=${exactCommands.length}`
    },
    {
      id: "copyable-owner-text-present",
      status: typeof acceptanceRow.expectedExecutionText === "string" &&
        acceptanceRow.expectedExecutionText.includes("Authorize separate execution") &&
        acceptanceRow.expectedExecutionText.includes("No cleanup") &&
        acceptanceRow.expectedExecutionText.includes("broad staging")
        ? "pass"
        : "fail",
      detail: "acceptance docket carries the exact copyable owner execution text"
    },
    {
      id: "pre-and-post-checks-attached",
      status: (acceptanceRow.requiredPreExecutionChecks ?? []).length >= 5 &&
        (acceptanceRow.requiredPostExecutionChecks ?? []).length >= 3
        ? "pass"
        : "fail",
      detail: `pre=${(acceptanceRow.requiredPreExecutionChecks ?? []).length}; post=${(acceptanceRow.requiredPostExecutionChecks ?? []).length}`
    },
    {
      id: "no-execution-side-effects",
      status: ownerInput.cleanupAuthorized === false &&
        ownerInput.executableNow === false &&
        closeout.summary?.cleanupAuthorizedRows === 0 &&
        closeout.summary?.executableRows === 0
        ? "pass"
        : "fail",
      detail: "Plan generation does not stage, commit, cleanup, push, deploy, or mark executable rows."
    }
  ];
}

export function buildA16GuardedExtractionExecutionPlan() {
  const dirtyMap = readJson(A16_GUARDED_EXTRACTION_EXECUTION_PLAN_PATHS.dirtyMap);
  const readiness = readJson(A16_GUARDED_EXTRACTION_EXECUTION_PLAN_PATHS.readiness);
  const readinessGate = readJson(A16_GUARDED_EXTRACTION_EXECUTION_PLAN_PATHS.readinessGate);
  const acceptanceDocket = readJson(A16_GUARDED_EXTRACTION_EXECUTION_PLAN_PATHS.acceptanceDocket);
  const ownerInput = readJson(A16_GUARDED_EXTRACTION_EXECUTION_PLAN_PATHS.ownerInput);
  const ownerInputGate = readJson(A16_GUARDED_EXTRACTION_EXECUTION_PLAN_PATHS.ownerInputGate);
  const preExecution = readJson(A16_GUARDED_EXTRACTION_EXECUTION_PLAN_PATHS.preExecutionReport);
  const closeout = readJson(A16_GUARDED_EXTRACTION_EXECUTION_PLAN_PATHS.closeoutDocket);
  const ownerInstructionRow = (ownerInput.instructions ?? [])[0] ?? {};
  const a16AcceptanceRow = (acceptanceDocket.acceptanceRows ?? []).find((row) =>
    row.rowKind === "a16-authorized-extraction" ||
    row.sourceKind === "a16-authorized-extraction" ||
    (row.candidateId ?? "").includes("a16")
  ) ?? {};
  const pathspecRows = readLines(A16_GUARDED_EXTRACTION_EXECUTION_PLAN_PATHS.pathspec);
  const packageFiles = readiness.packageFiles ?? closeout.packageFiles ?? preExecution.packageFiles ?? [];
  const packageStatusRows = gitStatusRows(packageFiles);
  const stagedRows = gitNameRows(["diff", "--cached", "--name-only"]);
  const packageStagedRows = gitNameRows(["diff", "--cached", "--name-only", "--", ...packageFiles]);
  const exactCommands = ownerInstructionRow.exactCommandSequence ??
    ownerInstructionRow.commandSequence ??
    a16AcceptanceRow.exactCommandSequence ??
    [];
  const effectiveAcceptanceRow = {
    ...a16AcceptanceRow,
    expectedExecutionText: a16AcceptanceRow.expectedExecutionText ?? ownerInstructionRow.executionText ?? "",
    requiredPreExecutionChecks: a16AcceptanceRow.requiredPreExecutionChecks ?? ownerInstructionRow.requiredPreExecutionChecks ?? [],
    requiredPostExecutionChecks: a16AcceptanceRow.requiredPostExecutionChecks ?? ownerInstructionRow.requiredPostExecutionChecks ?? []
  };
  const sourceFailures = sourceCurrentnessFailures({
    dirtyMap,
    readiness,
    readinessGate,
    acceptanceDocket,
    ownerInput,
    ownerInputGate,
    preExecution,
    closeout
  });
  const status = planStatus({ sourceFailures, readiness, ownerInputGate, packageStatusRows, stagedRows });
  const checks = buildChecks({
    sourceFailures,
    readiness,
    readinessGate,
    acceptanceRow: effectiveAcceptanceRow,
    ownerInput,
    ownerInputGate,
    preExecution,
    closeout,
    pathspecRows,
    packageStatusRows,
    stagedRows,
    packageStagedRows,
    exactCommands,
    status
  });
  const failedChecks = checks.filter((row) => row.status !== "pass");

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    planKind: "a16-guarded-extraction-execution-plan",
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? null,
    sourceArtifacts: {
      readinessGeneratedAt: readiness.generatedAt,
      acceptanceDocketGeneratedAt: acceptanceDocket.generatedAt,
      ownerInputGeneratedAt: ownerInput.generatedAt,
      preExecutionReportGeneratedAt: preExecution.generatedAt,
      closeoutDocketGeneratedAt: closeout.generatedAt
    },
    sourceCurrentnessFailures: sourceFailures,
    planStatus: failedChecks.length === 0 ? status : "not-ready-check-failures",
    candidateId: readiness.candidateId ?? closeout.candidateId,
    approvalId: a16AcceptanceRow.approvalId ?? ownerInstructionRow.approvalId ?? "",
    targetInputFile: a16AcceptanceRow.targetInputFile ?? A16_GUARDED_EXTRACTION_EXECUTION_PLAN_PATHS.ownerInput,
    expectedInstructionId: a16AcceptanceRow.expectedInstructionId ?? ownerInstructionRow.instructionId ?? "",
    packageFiles,
    pathspecRows,
    packageStatusRows,
    stagedRows,
    packageStagedRows,
    guardedCommandSequence: exactCommands,
    preExecutionChecks: effectiveAcceptanceRow.requiredPreExecutionChecks,
    postExecutionChecks: effectiveAcceptanceRow.requiredPostExecutionChecks,
    copyableOwnerExecutionText: effectiveAcceptanceRow.expectedExecutionText,
    acceptanceChecks: checks,
    summary: {
      planStatus: failedChecks.length === 0 ? status : "not-ready-check-failures",
      packageFileRows: packageFiles.length,
      pathspecRows: pathspecRows.length,
      packageDirtyRows: packageStatusRows.length,
      stagedRows: stagedRows.length,
      packageStagedRows: packageStagedRows.length,
      ownerInstructionRows: ownerInputGate.instructionRows ?? 0,
      validOwnerInstructionRows: ownerInputGate.validInstructionRows ?? 0,
      guardedCommandRows: exactCommands.length,
      preExecutionCheckRows: (effectiveAcceptanceRow.requiredPreExecutionChecks ?? []).length,
      postExecutionCheckRows: (effectiveAcceptanceRow.requiredPostExecutionChecks ?? []).length,
      acceptanceChecks: checks.length,
      passingAcceptanceChecks: checks.length - failedChecks.length,
      failedAcceptanceChecks: failedChecks.length,
      sourceCurrentnessFailures: sourceFailures.length,
      canExecuteIfSeparateOwnerInstructionRecorded: status === "ready-for-owner-approved-guarded-extraction",
      cleanupAuthorizedRows: 0,
      executableRows: 0
    },
    boundary: {
      evidenceOnly: true,
      planOnly: true,
      recordsOwnerApproval: false,
      recordsExecutionInstruction: false,
      runsGitAdd: false,
      runsGitCommit: false,
      stageAuthorizedByThisPlan: false,
      commitAuthorizedByThisPlan: false,
      mergeAuthorized: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false,
      requiresSeparateOwnerExecutionInstruction: status === "blocked-missing-owner-execution-instruction"
    }
  };
}

export function stableA16GuardedExtractionExecutionPlanProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    planKind: payload.planKind,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: payload.sourceArtifacts,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    planStatus: payload.planStatus,
    candidateId: payload.candidateId,
    approvalId: payload.approvalId,
    targetInputFile: payload.targetInputFile,
    expectedInstructionId: payload.expectedInstructionId,
    packageFiles: payload.packageFiles,
    pathspecRows: payload.pathspecRows,
    packageStatusRows: payload.packageStatusRows,
    stagedRows: payload.stagedRows,
    packageStagedRows: payload.packageStagedRows,
    guardedCommandSequence: payload.guardedCommandSequence,
    preExecutionChecks: payload.preExecutionChecks,
    postExecutionChecks: payload.postExecutionChecks,
    copyableOwnerExecutionText: payload.copyableOwnerExecutionText,
    acceptanceChecks: payload.acceptanceChecks,
    summary: payload.summary,
    boundary: payload.boundary
  };
}

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function markdown(payload) {
  const commandRows = payload.guardedCommandSequence.map((command, index) => `${index + 1}. \`${command}\``).join("\n");
  const checkRows = payload.acceptanceChecks.map((row) => `| \`${cell(row.id)}\` | ${cell(row.status)} | ${cell(row.detail)} |`).join("\n");
  return `# A25 A16 Guarded Extraction Execution Plan

Generated: ${payload.generatedAt}

Plan status: \`${payload.planStatus}\`

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This file is a plan-only fail-closed artifact. It does not execute, authorize, stage, commit, cleanup, push, deploy, or change the worktree.

## Summary

- Package files: ${payload.summary.packageFileRows}
- Pathspec rows: ${payload.summary.pathspecRows}
- Package dirty rows: ${payload.summary.packageDirtyRows}
- Staged rows: ${payload.summary.stagedRows}
- Owner instruction rows: ${payload.summary.ownerInstructionRows}
- Valid owner instruction rows: ${payload.summary.validOwnerInstructionRows}
- Guarded command rows: ${payload.summary.guardedCommandRows}
- Can execute if separate owner instruction recorded: ${payload.summary.canExecuteIfSeparateOwnerInstructionRecorded}
- Acceptance checks: ${payload.summary.passingAcceptanceChecks}/${payload.summary.acceptanceChecks}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Guarded Command Sequence

${commandRows}

## Acceptance Checks

| Check | Status | Detail |
| --- | --- | --- |
${checkRows}

## Copyable Owner Execution Text

\`\`\`text
${payload.copyableOwnerExecutionText}
\`\`\`

## Boundary

- Records owner approval: ${payload.boundary.recordsOwnerApproval}.
- Records execution instruction: ${payload.boundary.recordsExecutionInstruction}.
- Runs git add: ${payload.boundary.runsGitAdd}.
- Runs git commit: ${payload.boundary.runsGitCommit}.
- Stage authorized by this plan: ${payload.boundary.stageAuthorizedByThisPlan}.
- Commit authorized by this plan: ${payload.boundary.commitAuthorizedByThisPlan}.
- Cleanup authorized: ${payload.boundary.cleanupAuthorized}.
- Executable now: ${payload.boundary.executableNow}.
- Deploy authorized: ${payload.boundary.deployAuthorized}.
- Requires separate owner execution instruction: ${payload.boundary.requiresSeparateOwnerExecutionInstruction}.
`;
}

export function writeA16GuardedExtractionExecutionPlan() {
  const payload = buildA16GuardedExtractionExecutionPlan();
  write(A16_GUARDED_EXTRACTION_EXECUTION_PLAN_PATHS.latestJson, `${JSON.stringify(payload, null, 2)}\n`);
  write(A16_GUARDED_EXTRACTION_EXECUTION_PLAN_PATHS.latestMarkdown, markdown(payload));
  write(A16_GUARDED_EXTRACTION_EXECUTION_PLAN_PATHS.datedJson, `${JSON.stringify(payload, null, 2)}\n`);
  write(A16_GUARDED_EXTRACTION_EXECUTION_PLAN_PATHS.datedMarkdown, markdown(payload));
  return payload;
}

function main() {
  const payload = writeA16GuardedExtractionExecutionPlan();
  console.log(JSON.stringify({
    latestJson: A16_GUARDED_EXTRACTION_EXECUTION_PLAN_PATHS.latestJson,
    latestMarkdown: A16_GUARDED_EXTRACTION_EXECUTION_PLAN_PATHS.latestMarkdown,
    planStatus: payload.planStatus,
    packageFileRows: payload.summary.packageFileRows,
    packageDirtyRows: payload.summary.packageDirtyRows,
    stagedRows: payload.summary.stagedRows,
    ownerInstructionRows: payload.summary.ownerInstructionRows,
    validOwnerInstructionRows: payload.summary.validOwnerInstructionRows,
    canExecuteIfSeparateOwnerInstructionRecorded: payload.summary.canExecuteIfSeparateOwnerInstructionRecorded,
    passingAcceptanceChecks: payload.summary.passingAcceptanceChecks,
    acceptanceChecks: payload.summary.acceptanceChecks,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
