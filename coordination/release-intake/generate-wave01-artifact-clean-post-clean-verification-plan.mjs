#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const WAVE01_ARTIFACT_CLEAN_POST_CLEAN_VERIFICATION_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  guardedPlan: "coordination/release-intake/latest-A25-wave01-artifact-clean-guarded-execution-plan.json",
  guardedPlanGate: "coordination/release-intake/latest-A25-wave01-artifact-clean-guarded-execution-plan-current-gate.json",
  guardedExecutorDryRun: "coordination/release-intake/latest-A25-wave01-artifact-clean-guarded-executor-dry-run.json",
  guardedExecutorGate: "coordination/release-intake/latest-A25-wave01-artifact-clean-guarded-executor-current-gate.json",
  focusPacket: "coordination/release-intake/latest-A25-wave01-artifact-clean-owner-execution-focus-packet.json",
  focusPacketGate: "coordination/release-intake/latest-A25-wave01-artifact-clean-owner-execution-focus-packet-current-gate.json",
  latestJson: "coordination/release-intake/latest-A25-wave01-artifact-clean-post-clean-verification-plan.json",
  latestMarkdown: "coordination/release-intake/latest-A25-wave01-artifact-clean-post-clean-verification-plan.md",
  datedJson: `coordination/release-intake/${date}-A25-wave01-artifact-clean-post-clean-verification-plan.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-wave01-artifact-clean-post-clean-verification-plan.md`
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

function sourceCurrentnessFailures({ dirtyMap, guardedPlan, guardedPlanGate, guardedExecutorDryRun, guardedExecutorGate, focusPacket, focusPacketGate }) {
  const failures = [];
  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  for (const [label, payload] of [
    ["guarded plan", guardedPlan],
    ["guarded executor dry run", guardedExecutorDryRun],
    ["owner execution focus packet", focusPacket]
  ]) {
    if (payload.dirtyMapStatusSignature !== expectedSignature) failures.push(`${label} dirty-map signature is stale`);
    if (payload.expandedStatusEntries !== expectedEntries) failures.push(`${label} expanded dirty entry count is stale`);
  }
  for (const [label, gate] of [
    ["guarded plan gate", guardedPlanGate],
    ["guarded executor gate", guardedExecutorGate],
    ["owner execution focus packet gate", focusPacketGate]
  ]) {
    if (gate.dirtyMapStatusSignature !== expectedSignature) failures.push(`${label} dirty-map signature is stale`);
    if (gate.expandedStatusEntries !== expectedEntries) failures.push(`${label} expanded dirty entry count is stale`);
    if ((gate.failures ?? []).length !== 0) failures.push(`${label} has failures`);
  }
  return failures;
}

function exactTargetRows(targetRows) {
  return targetRows.every((row) =>
    /^wave01-resync-0[2-7]-/.test(row.approvalId ?? "") &&
    /^git clean -f -- coordination\/release-intake\/2026-06-30-A25-dirty-tree-map-20260630T\d{6}Z\.(json|md)$/.test(row.command ?? "") &&
    /^coordination\/release-intake\/2026-06-30-A25-dirty-tree-map-20260630T\d{6}Z\.(json|md)$/.test(row.packageFile ?? "")
  );
}

function lifecycleStatus({ sourceFailures, targetRows, targetDirtyRows, targetAlreadyCleanRows, guardedPlan, guardedExecutorDryRun, staged }) {
  if (sourceFailures.length > 0) return "not-ready-source-stale";
  if (staged.length > 0) return "not-ready-staged-input";
  if (targetRows.length !== 6) return "not-ready-target-count";
  if (
    targetAlreadyCleanRows === 6 &&
    targetDirtyRows === 0 &&
    guardedPlan.planStatus === "already-cleaned-and-verified" &&
    guardedExecutorDryRun.executorStatus === "already-cleaned-and-verified"
  ) {
    return "post-clean-verified";
  }
  if (
    targetDirtyRows === 6 &&
    targetAlreadyCleanRows === 0 &&
    ["blocked-missing-owner-execution-instruction", "ready-for-owner-approved-guarded-clean"].includes(guardedPlan.planStatus) &&
    ["dry-run-blocked-missing-owner-execution-instruction", "dry-run-ready-requires-explicit-apply"].includes(guardedExecutorDryRun.executorStatus)
  ) {
    return "waiting-for-clean-execution";
  }
  return "not-ready-target-state";
}

function buildChecks({ sourceFailures, targetRows, targetDirtyRows, targetAlreadyCleanRows, guardedPlan, guardedExecutorDryRun, focusPacket, focusPacketGate, staged, status }) {
  const supportedFocusStatuses = [
    "waiting-for-owner-execution-instruction",
    "ready-for-execution-instruction-recording",
    "ready-for-guarded-execution",
    "post-clean-verified"
  ];
  return [
    {
      id: "source-current",
      status: sourceFailures.length === 0 ? "pass" : "fail",
      detail: `source currentness failures=${sourceFailures.length}`
    },
    {
      id: "focus-packet-current",
      status: (focusPacketGate.failures ?? []).length === 0 && supportedFocusStatuses.includes(focusPacket.focusStatus) ? "pass" : "fail",
      detail: `focusStatus=${focusPacket.focusStatus ?? "unknown"}; focusGateFailures=${(focusPacketGate.failures ?? []).length}`
    },
    {
      id: "six-target-rows",
      status: targetRows.length === 6 ? "pass" : "fail",
      detail: `targetRows=${targetRows.length}`
    },
    {
      id: "target-state-coherent",
      status: (targetDirtyRows === 6 && targetAlreadyCleanRows === 0) || (targetDirtyRows === 0 && targetAlreadyCleanRows === 6) ? "pass" : "fail",
      detail: `dirty=${targetDirtyRows}; alreadyClean=${targetAlreadyCleanRows}`
    },
    {
      id: "executor-state-supported",
      status: [
        "dry-run-blocked-missing-owner-execution-instruction",
        "dry-run-ready-requires-explicit-apply",
        "already-cleaned-and-verified"
      ].includes(guardedExecutorDryRun.executorStatus) &&
        [
          "blocked-missing-owner-execution-instruction",
          "ready-for-owner-approved-guarded-clean",
          "already-cleaned-and-verified"
        ].includes(guardedPlan.planStatus)
        ? "pass"
        : "fail",
      detail: `planStatus=${guardedPlan.planStatus ?? "unknown"}; executorStatus=${guardedExecutorDryRun.executorStatus ?? "unknown"}`
    },
    {
      id: "exact-wave01-artifact-targets",
      status: exactTargetRows(targetRows) ? "pass" : "fail",
      detail: "targets are the six owner-approved Wave01 A25 dirty-map artifact files"
    },
    {
      id: "no-tsconfig-or-deploy-target",
      status: targetRows.every((row) => row.packageFile !== "tsconfig.json" && !String(row.packageFile ?? "").includes(".vercel")) ? "pass" : "fail",
      detail: "held tsconfig restore and deploy remain excluded"
    },
    {
      id: "no-staged-input",
      status: staged.length === 0 ? "pass" : "fail",
      detail: `stagedRows=${staged.length}`
    },
    {
      id: "post-clean-verification-status-coherent",
      status: ["waiting-for-clean-execution", "post-clean-verified"].includes(status) ? "pass" : "fail",
      detail: `verificationStatus=${status}`
    },
    {
      id: "evidence-only-boundary",
      status: (guardedExecutorDryRun.summary?.cleanupAuthorizedRows ?? -1) === 0 &&
        (guardedExecutorDryRun.summary?.executableRows ?? -1) === 0 &&
        guardedExecutorDryRun.boundary?.deployAuthorized === false
        ? "pass"
        : "fail",
      detail: "post-clean verification does not authorize cleanup, execution, or deploy"
    }
  ];
}

export function buildWave01ArtifactCleanPostCleanVerificationPlan() {
  const dirtyMap = readJson(WAVE01_ARTIFACT_CLEAN_POST_CLEAN_VERIFICATION_PATHS.dirtyMap);
  const guardedPlan = readJson(WAVE01_ARTIFACT_CLEAN_POST_CLEAN_VERIFICATION_PATHS.guardedPlan);
  const guardedPlanGate = readJson(WAVE01_ARTIFACT_CLEAN_POST_CLEAN_VERIFICATION_PATHS.guardedPlanGate);
  const guardedExecutorDryRun = readJson(WAVE01_ARTIFACT_CLEAN_POST_CLEAN_VERIFICATION_PATHS.guardedExecutorDryRun);
  const guardedExecutorGate = readJson(WAVE01_ARTIFACT_CLEAN_POST_CLEAN_VERIFICATION_PATHS.guardedExecutorGate);
  const focusPacket = readJson(WAVE01_ARTIFACT_CLEAN_POST_CLEAN_VERIFICATION_PATHS.focusPacket);
  const focusPacketGate = readJson(WAVE01_ARTIFACT_CLEAN_POST_CLEAN_VERIFICATION_PATHS.focusPacketGate);
  const targetRows = guardedExecutorDryRun.targetRows ?? [];
  const targetDirtyRows = targetRows.filter((row) => row.targetStillDirty).length;
  const targetAlreadyCleanRows = targetRows.filter((row) => row.targetAlreadyClean).length;
  const staged = stagedRows();
  const sourceFailures = sourceCurrentnessFailures({
    dirtyMap,
    guardedPlan,
    guardedPlanGate,
    guardedExecutorDryRun,
    guardedExecutorGate,
    focusPacket,
    focusPacketGate
  });
  const status = lifecycleStatus({
    sourceFailures,
    targetRows,
    targetDirtyRows,
    targetAlreadyCleanRows,
    guardedPlan,
    guardedExecutorDryRun,
    staged
  });
  const checks = buildChecks({
    sourceFailures,
    targetRows,
    targetDirtyRows,
    targetAlreadyCleanRows,
    guardedPlan,
    guardedExecutorDryRun,
    focusPacket,
    focusPacketGate,
    staged,
    status
  });
  const failedChecks = checks.filter((row) => row.status !== "pass");

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    planKind: "wave01-artifact-clean-post-clean-verification-plan",
    verificationStatus: failedChecks.length === 0 ? status : "not-ready-check-failures",
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? null,
    sourceArtifacts: {
      guardedPlanGeneratedAt: guardedPlan.generatedAt,
      guardedExecutorDryRunGeneratedAt: guardedExecutorDryRun.generatedAt,
      focusPacketGeneratedAt: focusPacket.generatedAt
    },
    sourceCurrentnessFailures: sourceFailures,
    targetRows,
    stagedRows: staged,
    verificationCommands: [
      "node coordination/release-intake/run-wave01-artifact-clean-guarded-execution.mjs",
      "node coordination/release-intake/assert-wave01-artifact-clean-guarded-executor-current.mjs",
      "node coordination/release-intake/generate-wave01-artifact-clean-owner-execution-focus-packet.mjs",
      "node coordination/release-intake/assert-wave01-artifact-clean-owner-execution-focus-packet-current.mjs",
      "node coordination/release-intake/generate-wave01-artifact-clean-post-clean-verification-plan.mjs",
      "node coordination/release-intake/assert-wave01-artifact-clean-post-clean-verification-plan-current.mjs",
      "node coordination/release-intake/assert-no-staged-changes.mjs",
      "node coordination/release-intake/refresh-dirty-worktree-remediation-evidence.mjs --reason \"A25 Wave01 post-clean verification\"",
      "node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs --json"
    ],
    checks,
    summary: {
      verificationStatus: failedChecks.length === 0 ? status : "not-ready-check-failures",
      focusStatus: focusPacket.focusStatus ?? "",
      planStatus: guardedPlan.planStatus ?? "",
      executorStatus: guardedExecutorDryRun.executorStatus ?? "",
      targetRows: targetRows.length,
      targetDirtyRows,
      targetAlreadyCleanRows,
      stagedRows: staged.length,
      postCleanVerified: failedChecks.length === 0 && status === "post-clean-verified",
      checks: checks.length,
      passingChecks: checks.length - failedChecks.length,
      failedChecks: failedChecks.length,
      cleanupAuthorizedRows: 0,
      executableRows: 0,
      deployAuthorized: false
    },
    boundary: {
      evidenceOnly: true,
      verificationPlanOnly: true,
      recordsOwnerInput: false,
      recordsExecutionInstruction: false,
      stageAuthorized: false,
      commitAuthorized: false,
      mergeAuthorized: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false,
      requiresSeparateGuardedExecutor: status !== "post-clean-verified"
    }
  };
}

export function stableWave01ArtifactCleanPostCleanVerificationProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    planKind: payload.planKind,
    verificationStatus: payload.verificationStatus,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: payload.sourceArtifacts,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    targetRows: payload.targetRows,
    stagedRows: payload.stagedRows,
    verificationCommands: payload.verificationCommands,
    checks: payload.checks,
    summary: payload.summary,
    boundary: payload.boundary
  };
}

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function markdown(payload) {
  const rows = payload.targetRows.map((row) => (
    `| \`${cell(row.approvalId)}\` | \`${cell(row.packageFile)}\` | ${row.targetStillDirty ? "yes" : "no"} | ${row.targetAlreadyClean ? "yes" : "no"} |`
  )).join("\n") || "| none | n/a | no | no |";
  const checks = payload.checks.map((row) => (
    `| \`${cell(row.id)}\` | ${cell(row.status)} | ${cell(row.detail)} |`
  )).join("\n");
  const commands = payload.verificationCommands.map((command) => `- \`${command}\``).join("\n");

  return `# A25 Wave01 Artifact-Clean Post-Clean Verification Plan

Generated: ${payload.generatedAt}

Verification status: \`${payload.verificationStatus}\`

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This Post-Clean Verification plan is evidence-only. It does not execute cleanup; it only verifies whether the six owner-approved Wave01 A25 artifact-clean targets are still waiting for guarded cleanup or already cleaned and verified.

## Summary

- Focus status: ${payload.summary.focusStatus}
- Guarded plan status: ${payload.summary.planStatus}
- Guarded executor status: ${payload.summary.executorStatus}
- Target rows: ${payload.summary.targetRows}
- Target dirty rows: ${payload.summary.targetDirtyRows}
- Target already-clean rows: ${payload.summary.targetAlreadyCleanRows}
- Staged rows: ${payload.summary.stagedRows}
- Post-clean verified: ${payload.summary.postCleanVerified}
- Checks: ${payload.summary.passingChecks}/${payload.summary.checks}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}
- Deploy authorized: ${payload.summary.deployAuthorized}

## Target Rows

| Approval ID | Package file | Still dirty | Already clean |
| --- | --- | --- | --- |
${rows}

## Verification Commands

${commands}

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
  const payload = buildWave01ArtifactCleanPostCleanVerificationPlan();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(WAVE01_ARTIFACT_CLEAN_POST_CLEAN_VERIFICATION_PATHS.latestJson, json);
  write(WAVE01_ARTIFACT_CLEAN_POST_CLEAN_VERIFICATION_PATHS.datedJson, json);
  write(WAVE01_ARTIFACT_CLEAN_POST_CLEAN_VERIFICATION_PATHS.latestMarkdown, md);
  write(WAVE01_ARTIFACT_CLEAN_POST_CLEAN_VERIFICATION_PATHS.datedMarkdown, md);
  console.log(JSON.stringify({
    latestJson: WAVE01_ARTIFACT_CLEAN_POST_CLEAN_VERIFICATION_PATHS.latestJson,
    latestMarkdown: WAVE01_ARTIFACT_CLEAN_POST_CLEAN_VERIFICATION_PATHS.latestMarkdown,
    verificationStatus: payload.verificationStatus,
    focusStatus: payload.summary.focusStatus,
    targetRows: payload.summary.targetRows,
    targetDirtyRows: payload.summary.targetDirtyRows,
    targetAlreadyCleanRows: payload.summary.targetAlreadyCleanRows,
    postCleanVerified: payload.summary.postCleanVerified,
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
