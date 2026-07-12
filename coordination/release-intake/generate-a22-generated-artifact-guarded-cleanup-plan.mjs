#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();
const exactCommand = "node scripts/cleanup-generated-artifacts.mjs --apply --scope all";

export const A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_PLAN_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  residualEvidence: "coordination/release-intake/latest-A22-generated-artifact-residual-evidence.json",
  residualEvidenceGate: "coordination/release-intake/latest-A22-generated-artifact-residual-evidence-current-gate.json",
  authorizationPacket: "coordination/release-intake/latest-A22-generated-artifact-residual-authorization-packet.json",
  authorizationPacketGate: "coordination/release-intake/latest-A22-generated-artifact-residual-authorization-packet-current-gate.json",
  residualAcceptanceDocket: "coordination/release-intake/latest-A22-generated-artifact-residual-acceptance-docket.json",
  residualAcceptanceDocketGate: "coordination/release-intake/latest-A22-generated-artifact-residual-acceptance-docket-current-gate.json",
  ownerAuthorizations: "coordination/release-intake/latest-A25-next-owner-authorizations.json",
  ownerAuthorizationsGate: "coordination/release-intake/latest-A25-next-owner-authorizations-current-gate.json",
  executionInstructions: "coordination/release-intake/latest-A25-next-owner-execution-instructions.json",
  executionInstructionsGate: "coordination/release-intake/latest-A25-next-owner-execution-instructions-current-gate.json",
  executionInstructionAcceptanceDocket: "coordination/release-intake/latest-A25-next-owner-execution-instruction-acceptance-docket.json",
  executionInstructionAcceptanceDocketGate: "coordination/release-intake/latest-A25-next-owner-execution-instruction-acceptance-docket-current-gate.json",
  latestJson: "coordination/release-intake/latest-A22-generated-artifact-guarded-cleanup-plan.json",
  latestMarkdown: "coordination/release-intake/latest-A22-generated-artifact-guarded-cleanup-plan.md",
  datedJson: `coordination/release-intake/${date}-A22-generated-artifact-guarded-cleanup-plan.json`,
  datedMarkdown: `coordination/release-intake/${date}-A22-generated-artifact-guarded-cleanup-plan.md`
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

function exists(relativePath) {
  return fs.existsSync(absolute(relativePath));
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), "utf8"));
}

function write(relativePath, content) {
  fs.writeFileSync(absolute(relativePath), content);
}

function cleanupDryRun() {
  const result = spawnSync(process.execPath, ["scripts/cleanup-generated-artifacts.mjs", "--dry-run", "--json"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (result.status !== 0) {
    return {
      status: result.status ?? 1,
      stdout: result.stdout,
      stderr: result.stderr,
      parseError: "",
      payload: null
    };
  }
  try {
    return {
      status: 0,
      stdout: result.stdout,
      stderr: result.stderr,
      parseError: "",
      payload: JSON.parse(result.stdout)
    };
  } catch (error) {
    return {
      status: 1,
      stdout: result.stdout,
      stderr: result.stderr,
      parseError: error.message,
      payload: null
    };
  }
}

function noStagedRows() {
  const output = git(["diff", "--cached", "--name-only"]);
  return output ? output.split("\n").filter(Boolean) : [];
}

function sourceCurrentnessFailures(sources, expectedSignature, expectedEntries) {
  const failures = [];
  for (const [label, relativePath] of [
    ["residual evidence", A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_PLAN_PATHS.residualEvidence],
    ["authorization packet", A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_PLAN_PATHS.authorizationPacket],
    ["residual acceptance docket", A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_PLAN_PATHS.residualAcceptanceDocket],
    ["owner authorizations", A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_PLAN_PATHS.ownerAuthorizations],
    ["execution instructions", A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_PLAN_PATHS.executionInstructions],
    ["execution-instruction acceptance docket", A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_PLAN_PATHS.executionInstructionAcceptanceDocket]
  ]) {
    const payload = sources[relativePath];
    if (!payload) {
      failures.push(`missing source payload: ${label}`);
      continue;
    }
    if (payload.dirtyMapStatusSignature !== expectedSignature) failures.push(`${label} dirty-map signature is stale`);
    if (payload.expandedStatusEntries !== expectedEntries) failures.push(`${label} expanded dirty entry count is stale`);
  }
  for (const [label, relativePath] of [
    ["residual evidence gate", A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_PLAN_PATHS.residualEvidenceGate],
    ["authorization packet gate", A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_PLAN_PATHS.authorizationPacketGate],
    ["residual acceptance docket gate", A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_PLAN_PATHS.residualAcceptanceDocketGate],
    ["owner authorizations gate", A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_PLAN_PATHS.ownerAuthorizationsGate],
    ["execution instructions gate", A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_PLAN_PATHS.executionInstructionsGate],
    ["execution-instruction acceptance docket gate", A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_PLAN_PATHS.executionInstructionAcceptanceDocketGate]
  ]) {
    const gate = sources[relativePath];
    if (!gate) {
      failures.push(`missing currentness gate: ${label}`);
      continue;
    }
    if (gate.dirtyMapStatusSignature !== undefined && gate.dirtyMapStatusSignature !== expectedSignature) {
      failures.push(`${label} dirty-map signature is stale`);
    }
    if (gate.expandedStatusEntries !== undefined && gate.expandedStatusEntries !== expectedEntries) {
      failures.push(`${label} expanded dirty entry count is stale`);
    }
    if ((gate.failures ?? []).length !== 0) failures.push(`${label} has failures`);
  }
  return failures;
}

function rowsByApprovalId(rows) {
  return new Map((rows ?? []).map((row) => [row.approvalId, row]));
}

function isAllowedGeneratedCleanupCommand(command) {
  if (command === exactCommand) return true;
  return /^git clean -fdX -- \.s11-parent-audit-next[0-9]+$/.test(command ?? "");
}

function commandSequenceForTargetRows(targetRows) {
  const cleanupScriptRows = targetRows.filter((row) => row.command === exactCommand);
  const sequence = [];
  if (cleanupScriptRows.length > 0) {
    sequence.push({
      command: exactCommand,
      cwd: root,
      approvalIds: cleanupScriptRows.map((row) => row.approvalId),
      paths: cleanupScriptRows.map((row) => row.path)
    });
  }
  for (const row of targetRows.filter((targetRow) => targetRow.command !== exactCommand)) {
    sequence.push({
      command: row.command,
      cwd: root,
      approvalIds: [row.approvalId],
      paths: [row.path]
    });
  }
  return sequence;
}

function validateRows({ residualRows, ownerAuthorizationRows, instructionRows, dryRunTargets, approvalIds }) {
  const failures = [];
  const residualById = rowsByApprovalId(residualRows);
  const authorizationById = rowsByApprovalId(ownerAuthorizationRows);
  const instructionById = rowsByApprovalId(instructionRows);
  const dryRunPaths = new Set((dryRunTargets ?? []).map((row) => row.path));
  for (const approvalId of approvalIds) {
    const residual = residualById.get(approvalId);
    const authorization = authorizationById.get(approvalId);
    const instruction = instructionById.get(approvalId);
    if (!residual) failures.push(`${approvalId}: missing A22 residual authorization-packet row`);
    if (!authorization) failures.push(`${approvalId}: missing canonical owner authorization row`);
    if (!instruction) failures.push(`${approvalId}: missing owner execution-instruction row`);
    const expectedPath = residual?.path ?? authorization?.path ?? instruction?.path ?? "";
    const expectedCommand = residual?.exactCommand ?? authorization?.exactCommand ?? instruction?.command ?? "";
    if (residual && !isAllowedGeneratedCleanupCommand(residual.exactCommand)) failures.push(`${approvalId}: residual command is not an allowed A22 generated cleanup command`);
    if (authorization && authorization.path !== expectedPath) failures.push(`${approvalId}: authorization path mismatch`);
    if (instruction && instruction.path !== expectedPath) failures.push(`${approvalId}: instruction path mismatch`);
    if (authorization && authorization.exactCommand !== expectedCommand) failures.push(`${approvalId}: authorization command mismatch`);
    if (instruction && instruction.command !== expectedCommand) failures.push(`${approvalId}: instruction command mismatch`);
    if (instruction && instruction.cwd !== root) failures.push(`${approvalId}: instruction cwd mismatch`);
    if (instruction && (typeof instruction.executionText !== "string" || !instruction.executionText.includes(`approvalId=${approvalId}`))) {
      failures.push(`${approvalId}: executionText missing approvalId`);
    }
    if (instruction && !instruction.executionText.includes(`command=${expectedCommand}`)) failures.push(`${approvalId}: executionText missing exact command`);
    if (instruction && !instruction.executionText.includes(`cwd=${root}`)) failures.push(`${approvalId}: executionText missing cwd`);
    if (!dryRunPaths.has(expectedPath)) failures.push(`${approvalId}: cleanup dry-run does not include ${expectedPath}`);
  }
  return failures;
}

function buildTargetRows({ residualRows, ownerAuthorizationRows, instructionRows, executable, approvalIds }) {
  const authorizationById = rowsByApprovalId(ownerAuthorizationRows);
  const instructionById = rowsByApprovalId(instructionRows);
  return approvalIds
    .map((approvalId) => {
      const residual = residualRows.find((row) => row.approvalId === approvalId);
      const authorization = authorizationById.get(approvalId);
      const instruction = instructionById.get(approvalId);
      const targetPath = residual?.path ?? authorization?.path ?? instruction?.path ?? "";
      const command = residual?.exactCommand ?? authorization?.exactCommand ?? instruction?.command ?? exactCommand;
      return {
        approvalId,
        owner: "A22 production reliability and release engineering",
        path: targetPath,
        command,
        cwd: root,
        residualBytes: residual?.manifestBytes ?? residual?.dryRunBytes ?? 0,
        authorizationRecorded: Boolean(authorization),
        executionInstructionRecorded: Boolean(instruction),
        cleanupAuthorized: executable,
        executableNow: executable
      };
    })
    .filter((row) => row.path);
}

function buildChecks({ sourceFailures, dryRun, residualRows, ownerAuthorizationRows, instructionRows, rowFailures, stagedRows, planStatus, pendingOwnerDecision }) {
  const dryRunTargets = dryRun.payload?.targets ?? [];
  const dryRunPaths = dryRunTargets.map((row) => row.path).sort();
  const residualTargetRows = residualRows.length;
  const dryRunPathSet = new Set(dryRunPaths);
  return [
    {
      id: "source-current",
      status: sourceFailures.length === 0 ? "pass" : "fail",
      detail: `source currentness failures=${sourceFailures.length}`
    },
    {
      id: "cleanup-dry-run-green",
      status: dryRun.status === 0 && dryRun.payload?.dryRun === true && dryRun.payload?.apply === false ? "pass" : "fail",
      detail: `status=${dryRun.status}; parseError=${dryRun.parseError || "none"}`
    },
    {
      id: "residual-target-state-supported",
      status: residualTargetRows > 0 || residualTargetRows === 0 || pendingOwnerDecision ? "pass" : "fail",
      detail: `residualTargetRows=${residualTargetRows}`
    },
    {
      id: "canonical-authorizations-present",
      status: ownerAuthorizationRows.length === residualTargetRows || residualTargetRows === 0 || pendingOwnerDecision ? "pass" : "fail",
      detail: `canonicalA22Rows=${ownerAuthorizationRows.length}/${residualTargetRows}`
    },
    {
      id: "execution-instructions-present",
      status: instructionRows.length === residualTargetRows || residualTargetRows === 0 || pendingOwnerDecision ? "pass" : "fail",
      detail: `instructionRows=${instructionRows.length}/${residualTargetRows}`
    },
    {
      id: "exact-targets-and-command",
      status: rowFailures.length === 0 || residualTargetRows === 0 || pendingOwnerDecision ? "pass" : "fail",
      detail: pendingOwnerDecision
        ? "pending owner decision; executable bridge is intentionally disabled"
        : rowFailures.length === 0
          ? "rows match exact A22 cleanup command"
          : rowFailures.join("; ")
    },
    {
      id: "dry-run-targets-match",
      status: residualTargetRows === 0 || residualRows.every((row) => dryRunPathSet.has(row.path)) ? "pass" : "fail",
      detail: `dryRunTargets=${dryRunPaths.join(",") || "none"}`
    },
    {
      id: "no-skipped-targets",
      status: (dryRun.payload?.skippedTargets ?? []).length === 0 ? "pass" : "fail",
      detail: `skippedTargets=${(dryRun.payload?.skippedTargets ?? []).length}`
    },
    {
      id: "no-staged-root-input",
      status: stagedRows.length === 0 ? "pass" : "fail",
      detail: `stagedRows=${stagedRows.length}`
    },
    {
      id: "plan-status-supported",
      status: [
        "ready-for-owner-approved-generated-cleanup",
        "already-cleaned-and-verified",
        "pending-a22-generated-artifact-owner-decision",
        "blocked-a22-guarded-cleanup"
      ].includes(planStatus) ? "pass" : "fail",
      detail: `planStatus=${planStatus}`
    }
  ];
}

export function buildA22GeneratedArtifactGuardedCleanupPlan() {
  const required = Object.values(A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_PLAN_PATHS)
    .filter((value) => value.endsWith(".json") && !value.includes("guarded-cleanup-plan"));
  const missing = required.filter((relativePath) => !exists(relativePath));
  if (missing.length > 0) {
    return {
      generatedAt: new Date().toISOString(),
      repoRoot: root,
      planKind: "a22-generated-artifact-guarded-cleanup-plan",
      dirtyMapStatusSignature: null,
      expandedStatusEntries: null,
      planStatus: "blocked-a22-guarded-cleanup",
      missingSources: missing,
      sourceCurrentnessFailures: missing.map((relativePath) => `missing source: ${relativePath}`),
      targetRows: [],
      acceptanceChecks: [],
      summary: {
        planStatus: "blocked-a22-guarded-cleanup",
        targetRows: 0,
        cleanupAuthorizedRows: 0,
        executableRows: 0,
        failedAcceptanceChecks: missing.length
      },
      boundary: baseBoundary(false)
    };
  }

  const sources = Object.fromEntries(required.map((relativePath) => [relativePath, readJson(relativePath)]));
  const dirtyMap = readJson(A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_PLAN_PATHS.dirtyMap);
  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  const sourceFailures = sourceCurrentnessFailures(sources, expectedSignature, expectedEntries);
  const residualEvidence = sources[A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_PLAN_PATHS.residualEvidence];
  const authorizationPacket = sources[A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_PLAN_PATHS.authorizationPacket];
  const residualAcceptanceDocket = sources[A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_PLAN_PATHS.residualAcceptanceDocket];
  const ownerAuthorizations = sources[A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_PLAN_PATHS.ownerAuthorizations];
  const executionInstructions = sources[A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_PLAN_PATHS.executionInstructions];
  const dryRun = cleanupDryRun();
  const stagedRows = noStagedRows();
  const allResidualRows = authorizationPacket.rows ?? [];
  const residualTargets = residualEvidence.summary?.residualTargets ?? allResidualRows.length;
  const activeApprovalIds = allResidualRows.map((row) => row.approvalId);
  const residualRows = allResidualRows.filter((row) => activeApprovalIds.includes(row.approvalId));
  const ownerAuthorizationRows = (ownerAuthorizations.authorizations ?? []).filter((row) => activeApprovalIds.includes(row.approvalId));
  const instructionRows = (executionInstructions.instructions ?? []).filter((row) => activeApprovalIds.includes(row.approvalId));
  const rowFailures = residualTargets > 0 ? validateRows({
    residualRows,
    ownerAuthorizationRows,
    instructionRows,
    dryRunTargets: dryRun.payload?.targets ?? [],
    approvalIds: activeApprovalIds
  }) : [];
  const ready = sourceFailures.length === 0 &&
    residualTargets > 0 &&
    residualRows.length === residualTargets &&
    ownerAuthorizationRows.length === residualTargets &&
    instructionRows.length === residualTargets &&
    rowFailures.length === 0 &&
    dryRun.status === 0 &&
    stagedRows.length === 0 &&
    (dryRun.payload?.skippedTargets ?? []).length === 0;
  const alreadyClean = sourceFailures.length === 0 && residualTargets === 0;
  const pendingOwnerDecision = sourceFailures.length === 0 &&
    residualTargets > 0 &&
    !ready &&
    residualAcceptanceDocket.ownerDecisionDocket?.status === "ready-for-owner-decision" &&
    (residualAcceptanceDocket.summary?.failedAcceptanceChecks ?? 0) === 0;
  const planStatus = alreadyClean
    ? "already-cleaned-and-verified"
    : ready
      ? "ready-for-owner-approved-generated-cleanup"
      : pendingOwnerDecision
        ? "pending-a22-generated-artifact-owner-decision"
        : "blocked-a22-guarded-cleanup";
  const executable = planStatus === "ready-for-owner-approved-generated-cleanup";
  const targetRows = buildTargetRows({
    ownerAuthorizationRows,
    instructionRows,
    residualRows,
    executable,
    approvalIds: activeApprovalIds
  });
  const commandSequence = commandSequenceForTargetRows(targetRows);
  const checks = buildChecks({
    sourceFailures,
    dryRun,
    residualRows,
    ownerAuthorizationRows,
    instructionRows,
    rowFailures,
    stagedRows,
    planStatus,
    pendingOwnerDecision
  });
  const failedChecks = checks.filter((row) => row.status !== "pass");
  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    planKind: "a22-generated-artifact-guarded-cleanup-plan",
    dirtyMapStatusSignature: expectedSignature,
    expandedStatusEntries: expectedEntries,
    sourceArtifacts: {
      residualEvidenceGeneratedAt: residualEvidence.generatedAt,
      authorizationPacketGeneratedAt: authorizationPacket.generatedAt,
      ownerAuthorizationsGeneratedAt: ownerAuthorizations.generatedAt,
      executionInstructionsGeneratedAt: executionInstructions.generatedAt
    },
    sourceCurrentnessFailures: sourceFailures,
    rowValidationFailures: rowFailures,
    stagedRows,
    dryRun: {
      status: dryRun.status,
      scope: dryRun.payload?.scope ?? null,
      targetCount: dryRun.payload?.targetCount ?? null,
      totalBytes: dryRun.payload?.totalBytes ?? null,
      skippedTargets: dryRun.payload?.skippedTargets ?? [],
      targets: dryRun.payload?.targets ?? []
    },
    planStatus: failedChecks.length === 0 ? planStatus : "blocked-a22-guarded-cleanup",
    exactCommand,
    commandSequence,
    commandCwd: root,
    targetRows,
    acceptanceChecks: checks,
    summary: {
      planStatus: failedChecks.length === 0 ? planStatus : "blocked-a22-guarded-cleanup",
      residualTargets,
      targetRows: targetRows.length,
      ownerAuthorizationRows: ownerAuthorizationRows.length,
      executionInstructionRows: instructionRows.length,
      cleanupDryRunTargets: dryRun.payload?.targetCount ?? 0,
      cleanupDryRunBytes: dryRun.payload?.totalBytes ?? 0,
      stagedRows: stagedRows.length,
      acceptanceChecks: checks.length,
      passingAcceptanceChecks: checks.length - failedChecks.length,
      failedAcceptanceChecks: failedChecks.length,
      sourceCurrentnessFailures: sourceFailures.length,
      rowValidationFailures: rowFailures.length,
      commandSequenceRows: commandSequence.length,
      cleanupAuthorizedRows: executable ? targetRows.length : 0,
      executableRows: executable ? targetRows.length : 0
    },
    boundary: baseBoundary(executable)
  };
}

export function stableA22GeneratedArtifactGuardedCleanupPlanProjection(payload) {
  const stableDryRun = {
    ...payload.dryRun,
    totalBytes: undefined,
    targets: (payload.dryRun?.targets ?? []).map((row) => ({
      path: row.path,
      type: row.type
    }))
  };
  const stableSummary = {
    ...payload.summary,
    cleanupDryRunBytes: undefined
  };
  return {
    repoRoot: payload.repoRoot,
    planKind: payload.planKind,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: payload.sourceArtifacts,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    rowValidationFailures: payload.rowValidationFailures,
    stagedRows: payload.stagedRows,
    dryRun: stableDryRun,
    planStatus: payload.planStatus,
    exactCommand: payload.exactCommand,
    commandSequence: payload.commandSequence,
    commandCwd: payload.commandCwd,
    targetRows: payload.targetRows,
    acceptanceChecks: payload.acceptanceChecks,
    summary: stableSummary,
    boundary: payload.boundary
  };
}

function baseBoundary(executable) {
  return {
    evidenceOnly: true,
    planOnly: true,
    recordsOwnerApproval: false,
    recordsExecutionInstruction: false,
    stageAuthorized: false,
    commitAuthorized: false,
    mergeAuthorized: false,
    cleanupAuthorized: executable,
    executableNow: executable,
    destructiveGitAuthorized: false,
    fileDeletionAuthorized: executable,
    deployAuthorized: false,
    requiresExplicitApplyFlag: true,
    allowedCommand: exactCommand,
    allowedCommandSequence: "see targetRows and commandSequence"
  };
}

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function markdown(payload) {
  const rows = (payload.targetRows ?? []).map((row) => (
    `| \`${cell(row.approvalId)}\` | \`${cell(row.path)}\` | ${row.cleanupAuthorized ? "yes" : "no"} | ${row.executableNow ? "yes" : "no"} | \`${cell(row.command)}\` |`
  )).join("\n") || "| none | n/a | no | no | n/a |";
  const checks = (payload.acceptanceChecks ?? []).map((row) => (
    `| \`${cell(row.id)}\` | ${cell(row.status)} | ${cell(row.detail)} |`
  )).join("\n") || "| none | n/a | n/a |";
  return `# A22 Generated Artifact Guarded Cleanup Plan

Generated: ${payload.generatedAt}

Plan status: ${payload.planStatus}

This A22-owned plan is the narrow bridge from recorded owner authorization plus recorded execution instruction into a guarded cleanup executor. It does not stage, commit, merge, push, reset, remove worktrees, delete branches, deploy, or run any command by itself. If executable, the only allowed command is \`${exactCommand}\` from \`${root}\`.

## Summary

- Residual targets: ${payload.summary.residualTargets}
- Target rows: ${payload.summary.targetRows}
- Owner authorization rows: ${payload.summary.ownerAuthorizationRows}
- Execution instruction rows: ${payload.summary.executionInstructionRows}
- Cleanup dry-run targets: ${payload.summary.cleanupDryRunTargets}
- Cleanup dry-run bytes: ${payload.summary.cleanupDryRunBytes}
- Command sequence rows: ${payload.summary.commandSequenceRows}
- Acceptance checks: ${payload.summary.passingAcceptanceChecks}/${payload.summary.acceptanceChecks}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}
- Staged rows: ${payload.summary.stagedRows}
- Deploy authorized: false

## Target Rows

| Approval ID | Path | Cleanup authorized | Executable now | Command |
| --- | --- | --- | --- | --- |
${rows}

## Checks

| Check | Status | Detail |
| --- | --- | --- |
${checks}
`;
}

function main() {
  const payload = buildA22GeneratedArtifactGuardedCleanupPlan();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_PLAN_PATHS.latestJson, json);
  write(A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_PLAN_PATHS.datedJson, json);
  write(A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_PLAN_PATHS.latestMarkdown, md);
  write(A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_PLAN_PATHS.datedMarkdown, md);
  console.log(JSON.stringify({
    latestJson: A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_PLAN_PATHS.latestJson,
    latestMarkdown: A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_PLAN_PATHS.latestMarkdown,
    planStatus: payload.planStatus,
    residualTargets: payload.summary.residualTargets,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows,
    failedAcceptanceChecks: payload.summary.failedAcceptanceChecks
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
