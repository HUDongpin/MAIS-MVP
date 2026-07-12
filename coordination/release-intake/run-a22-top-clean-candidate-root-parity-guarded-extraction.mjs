#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_PLAN_PATHS,
  buildTopCleanCandidateRootParityExtractionPlan,
  stableTopCleanCandidateRootParityExtractionPlanProjection
} from "./generate-a22-top-clean-candidate-root-parity-extraction-plan.mjs";
import {
  TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_RECORDING_PATHS,
  buildA22RootParityExtractionInstructionRecordingState,
  stableA22RootParityExtractionInstructionRecordingProjection
} from "./run-a22-top-clean-candidate-root-parity-extraction-instruction-recording.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();
const targetWorktreePrefix = "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/";

export const TOP_CLEAN_CANDIDATE_ROOT_PARITY_GUARDED_EXTRACTION_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  extractionPlan: TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_PLAN_PATHS.latestJson,
  extractionPlanGate: "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-extraction-plan-current-gate.json",
  extractionInstructionRecording: TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_RECORDING_PATHS.latestDryRunJson,
  extractionInstructionRecordingGate: "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-extraction-instruction-recording-current-gate.json",
  extractionInstructions: TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_RECORDING_PATHS.extractionInstructions,
  latestDryRunJson: "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-guarded-extraction-dry-run.json",
  latestDryRunMarkdown: "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-guarded-extraction-dry-run.md",
  datedDryRunJson: `coordination/release-intake/${date}-A22-top-clean-candidate-root-parity-guarded-extraction-dry-run.json`,
  datedDryRunMarkdown: `coordination/release-intake/${date}-A22-top-clean-candidate-root-parity-guarded-extraction-dry-run.md`,
  latestApplyJson: "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-guarded-extraction-apply.json",
  latestApplyMarkdown: "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-guarded-extraction-apply.md"
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

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function fileFingerprint(absolutePath) {
  if (!fs.existsSync(absolutePath)) {
    return {
      exists: false,
      bytes: 0,
      sha256: ""
    };
  }
  const buffer = fs.readFileSync(absolutePath);
  return {
    exists: true,
    bytes: buffer.length,
    sha256: sha256(buffer)
  };
}

function readExtractionInstructions({ dirtyMap, plan }) {
  if (!exists(TOP_CLEAN_CANDIDATE_ROOT_PARITY_GUARDED_EXTRACTION_PATHS.extractionInstructions)) {
    return {
      generatedAt: null,
      repoRoot: root,
      instructionKind: "a22-root-parity-extraction-instructions",
      dirtyMapStatusSignature: dirtyMap.statusSignature,
      expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? null,
      topCandidate: plan.topCandidate ?? {},
      targetWorktree: plan.topCandidate?.path ?? "",
      instructions: [],
      summary: {
        instructionRows: 0,
        recordsExtractionInstructionRows: 0,
        modifiesCandidateRows: 0,
        cleanupAuthorizedRows: 0,
        executableRows: 0
      },
      boundary: {
        evidenceOnly: true,
        recordsExtractionInstruction: false,
        modifiesCandidate: false,
        copiesRootFiles: false,
        cleanupAuthorized: false,
        executableNow: false,
        destructiveGitAuthorized: false,
        deployAuthorized: false,
        physicalLifecycleCleanupAuthorized: false
      }
    };
  }
  return readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_GUARDED_EXTRACTION_PATHS.extractionInstructions);
}

function expectedUnitIds(plan) {
  return (plan.extractionUnits ?? []).map((unit) => unit.unitId);
}

function targetInstructionRows(instructions, unitIds) {
  const ids = new Set(unitIds ?? []);
  return (instructions.instructions ?? []).filter((row) => ids.has(row.unitId));
}

function sourceCurrentnessFailures({ dirtyMap, plan, planGate, recording, recordingGate, currentPlan, currentRecording }) {
  const failures = [];
  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  for (const [label, payload] of [
    ["A22 root-parity extraction plan", plan],
    ["A22 instruction recording dry-run", recording]
  ]) {
    if (payload.dirtyMapStatusSignature !== expectedSignature) failures.push(`${label} dirty-map signature is stale`);
    if (payload.expandedStatusEntries !== expectedEntries) failures.push(`${label} expanded dirty entry count is stale`);
  }
  for (const [label, gate] of [
    ["A22 root-parity extraction plan gate", planGate],
    ["A22 instruction recording gate", recordingGate]
  ]) {
    if (gate.dirtyMapStatusSignature !== expectedSignature) failures.push(`${label} dirty-map signature is stale`);
    if (gate.expandedStatusEntries !== expectedEntries) failures.push(`${label} expanded dirty entry count is stale`);
    if ((gate.failures ?? []).length !== 0) failures.push(`${label} has failures`);
  }
  if (!sameJson(
    stableTopCleanCandidateRootParityExtractionPlanProjection(plan),
    stableTopCleanCandidateRootParityExtractionPlanProjection(currentPlan)
  )) {
    failures.push("A22 root-parity extraction plan is stale versus current build");
  }
  if (!sameJson(
    stableA22RootParityExtractionInstructionRecordingProjection(recording),
    stableA22RootParityExtractionInstructionRecordingProjection(currentRecording)
  )) {
    failures.push("A22 root-parity extraction instruction recording dry-run is stale versus current build");
  }
  return failures;
}

function inspectExtractionUnits({ plan, instructionRows }) {
  const instructionByUnit = new Map((instructionRows ?? []).map((row) => [row.unitId, row]));
  return (plan.extractionUnits ?? []).map((unit) => {
    const rootAbsolute = path.join(root, unit.rootSource?.path ?? "");
    const targetAbsolute = path.join(plan.topCandidate?.path ?? "", unit.candidateTargetPath ?? "");
    const rootFingerprint = fileFingerprint(rootAbsolute);
    const targetFingerprint = fileFingerprint(targetAbsolute);
    const instruction = instructionByUnit.get(unit.unitId) ?? null;
    return {
      unitId: unit.unitId,
      rootSourcePath: unit.rootSource?.path ?? "",
      candidateTargetPath: unit.candidateTargetPath ?? "",
      expectedRootSha256: unit.rootSource?.sha256 ?? "",
      rootSourceExists: rootFingerprint.exists,
      rootShaMatchesPlan: rootFingerprint.exists && rootFingerprint.sha256 === (unit.rootSource?.sha256 ?? ""),
      candidateTargetExists: targetFingerprint.exists,
      candidateTargetSha256: targetFingerprint.sha256,
      candidateTargetMatchesRoot: targetFingerprint.exists && targetFingerprint.sha256 === rootFingerprint.sha256,
      instructionRecorded: Boolean(instruction),
      selectedAction: instruction?.selectedAction ?? "",
      cleanupAuthorized: instruction?.cleanupAuthorized === true,
      executableNow: instruction?.executableNow === true,
      deployAuthorized: instruction?.deployAuthorized === true,
      mergeAuthorized: instruction?.mergeAuthorized === true,
      stageAuthorized: instruction?.stageAuthorized === true,
      destructiveGitAuthorized: instruction?.destructiveGitAuthorized === true,
      physicalLifecycleCleanupAuthorized: instruction?.physicalLifecycleCleanupAuthorized === true
    };
  });
}

function safeInstructionRows(rows) {
  return (rows ?? []).every((row) =>
    row.cleanupAuthorized === false &&
    row.executableNow === false &&
    row.deployAuthorized === false &&
    row.mergeAuthorized === false &&
    row.stageAuthorized === false &&
    row.destructiveGitAuthorized === false &&
    row.physicalLifecycleCleanupAuthorized === false
  );
}

function candidateGitStatusRows(targetWorktree) {
  if (!targetWorktree || !fs.existsSync(targetWorktree)) return [];
  const output = git(["status", "--short"], targetWorktree);
  return output ? output.split("\n").filter(Boolean) : [];
}

function extractedAndVerified(extractionUnits, expectedRows) {
  return extractionUnits.length === expectedRows &&
    extractionUnits.every((unit) =>
      unit.rootSourceExists &&
      unit.rootShaMatchesPlan &&
      unit.candidateTargetExists &&
      unit.candidateTargetMatchesRoot &&
      unit.instructionRecorded
    );
}

function executorStatus({ mode, sourceFailures, targetWorktreeValid, expectedRows, instructionRows, extractionUnits }) {
  if (!targetWorktreeValid) return "not-ready-invalid-target-worktree";
  if (expectedRows !== 4) return "not-ready-unexpected-unit-count";
  if (instructionRows.length === 0) {
    return mode === "apply-extraction" ? "apply-blocked-missing-recorded-instructions" : "dry-run-blocked-missing-recorded-instructions";
  }
  if (instructionRows.length > 0 && instructionRows.length < expectedRows) return "not-ready-partial-recorded-instructions";
  if (extractedAndVerified(extractionUnits, expectedRows)) {
    return "already-extracted-and-verified";
  }
  if (sourceFailures.length > 0) return "not-ready-source-stale";
  return mode === "apply-extraction" ? "apply-blocked-executor-is-evidence-only" : "dry-run-ready-requires-explicit-apply";
}

function buildChecks({ mode, sourceFailures, plan, recording, extractionInstructions, expectedRows, instructionRows, extractionUnits, targetWorktreeValid, candidateStatusRows, status }) {
  const allRootSourcesMatch = extractionUnits.length === expectedRows &&
    extractionUnits.every((unit) => unit.rootSourceExists && unit.rootShaMatchesPlan);
  const allTargetsMissing = extractionUnits.length === expectedRows &&
    extractionUnits.every((unit) => unit.candidateTargetExists === false);
  const allTargetsVerified = extractionUnits.length === expectedRows &&
    extractionUnits.every((unit) => unit.candidateTargetMatchesRoot);
  return [
    {
      id: "mode-is-explicit",
      status: mode === "dry-run" || mode === "apply-extraction" ? "pass" : "fail",
      detail: `mode=${mode}`
    },
    {
      id: "source-current",
      status: sourceFailures.length === 0 || allTargetsVerified ? "pass" : "fail",
      detail: allTargetsVerified
        ? `sourceCurrentnessFailures=${sourceFailures.length}; post-extraction target hashes verified`
        : `sourceCurrentnessFailures=${sourceFailures.length}`
    },
    {
      id: "target-worktree-contained",
      status: targetWorktreeValid ? "pass" : "fail",
      detail: `targetWorktree=${plan.topCandidate?.path ?? ""}`
    },
    {
      id: "four-extraction-units",
      status: expectedRows === 4 && (plan.extractionUnits ?? []).length === 4 ? "pass" : "fail",
      detail: `expectedRows=${expectedRows}; extractionUnits=${(plan.extractionUnits ?? []).length}`
    },
    {
      id: "instruction-recording-source-safe",
      status: [
        "dry-run-blocked-owner-input",
        "dry-run-ready-requires-explicit-apply",
        "already-recorded"
      ].includes(recording.recorderStatus) ? "pass" : "fail",
      detail: `recorderStatus=${recording.recorderStatus ?? "unknown"}`
    },
    {
      id: "recorded-instructions-state-coherent",
      status: (
        status.includes("missing-recorded-instructions") && instructionRows.length === 0
      ) || (
        status === "dry-run-ready-requires-explicit-apply" && instructionRows.length === expectedRows
      ) || (
        status === "apply-blocked-executor-is-evidence-only" && instructionRows.length === expectedRows
      ) || (
        status === "already-extracted-and-verified" && instructionRows.length === expectedRows
      ) || (
        status === "not-ready-partial-recorded-instructions" && instructionRows.length > 0 && instructionRows.length < expectedRows
      )
        ? "pass"
        : "fail",
      detail: `recordedInstructionRows=${instructionRows.length}; expectedRows=${expectedRows}`
    },
    {
      id: "recorded-instructions-safe-boundary",
      status: safeInstructionRows(instructionRows) ? "pass" : "fail",
      detail: "recorded rows must not authorize cleanup, execution, deploy, merge, staging, destructive git, or physical lifecycle cleanup"
    },
    {
      id: "root-sources-fingerprint-match",
      status: allRootSourcesMatch ? "pass" : "fail",
      detail: `matchingRootSources=${extractionUnits.filter((unit) => unit.rootShaMatchesPlan).length}/${expectedRows}`
    },
    {
      id: "candidate-targets-preflight",
      status: status === "already-extracted-and-verified" ? (allTargetsVerified ? "pass" : "fail") : (allTargetsMissing ? "pass" : "fail"),
      detail: status === "already-extracted-and-verified"
        ? `verifiedTargets=${extractionUnits.filter((unit) => unit.candidateTargetMatchesRoot).length}/${expectedRows}`
        : `missingTargets=${extractionUnits.filter((unit) => unit.candidateTargetExists === false).length}/${expectedRows}`
    },
    {
      id: "candidate-git-status-clean",
      status: allTargetsVerified || candidateStatusRows.length === 0 ? "pass" : "fail",
      detail: `candidateGitStatusRows=${candidateStatusRows.length}; allTargetsVerified=${allTargetsVerified}`
    },
    {
      id: "no-candidate-mutation-in-this-executor",
      status: "pass",
      detail: "this executor writes evidence only and never copies root files into the candidate"
    },
    {
      id: "extraction-instruction-file-shape",
      status: (extractionInstructions.instructions ?? []).length >= instructionRows.length ? "pass" : "fail",
      detail: `instructionFileRows=${(extractionInstructions.instructions ?? []).length}; targetRows=${instructionRows.length}`
    }
  ];
}

export function buildA22RootParityGuardedExtractionState({ mode = "dry-run", mutationsPerformed = false } = {}) {
  const dirtyMap = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_GUARDED_EXTRACTION_PATHS.dirtyMap);
  const plan = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_GUARDED_EXTRACTION_PATHS.extractionPlan);
  const planGate = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_GUARDED_EXTRACTION_PATHS.extractionPlanGate);
  const recording = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_GUARDED_EXTRACTION_PATHS.extractionInstructionRecording);
  const recordingGate = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_GUARDED_EXTRACTION_PATHS.extractionInstructionRecordingGate);
  const currentPlan = buildTopCleanCandidateRootParityExtractionPlan();
  const currentRecording = buildA22RootParityExtractionInstructionRecordingState({ mode: "dry-run" });
  const extractionInstructions = readExtractionInstructions({ dirtyMap, plan });
  const unitIds = expectedUnitIds(plan);
  const instructionRows = targetInstructionRows(extractionInstructions, unitIds);
  const extractionUnits = inspectExtractionUnits({ plan, instructionRows });
  const targetWorktree = plan.topCandidate?.path ?? "";
  const targetWorktreeValid = targetWorktree.startsWith(targetWorktreePrefix) && fs.existsSync(targetWorktree);
  const candidateStatusRows = candidateGitStatusRows(targetWorktree);
  const rawSourceFailures = sourceCurrentnessFailures({
    dirtyMap,
    plan,
    planGate,
    recording,
    recordingGate,
    currentPlan,
    currentRecording
  });
  const sourceFailures = extractedAndVerified(extractionUnits, unitIds.length)
    ? []
    : rawSourceFailures;
  const status = executorStatus({
    mode,
    sourceFailures,
    targetWorktreeValid,
    expectedRows: unitIds.length,
    instructionRows,
    extractionUnits
  });
  const checks = buildChecks({
    mode,
    sourceFailures,
    plan,
    recording,
    extractionInstructions,
    expectedRows: unitIds.length,
    instructionRows,
    extractionUnits,
    targetWorktreeValid,
    candidateStatusRows,
    status
  });
  const failedChecks = checks.filter((row) => row.status !== "pass");
  const executorStatusValue = failedChecks.length === 0 ? status : "not-ready-check-failures";

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    executorKind: "a22-root-parity-guarded-extraction",
    mode,
    executorStatus: executorStatusValue,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? null,
    sourceArtifacts: {
      extractionPlanGeneratedAt: plan.generatedAt,
      extractionPlanGateFailureCount: (planGate.failures ?? []).length,
      instructionRecordingGeneratedAt: recording.generatedAt,
      instructionRecordingGateFailureCount: (recordingGate.failures ?? []).length,
      extractionInstructionFileExists: exists(TOP_CLEAN_CANDIDATE_ROOT_PARITY_GUARDED_EXTRACTION_PATHS.extractionInstructions),
      extractionInstructionFileGeneratedAt: extractionInstructions.generatedAt ?? null
    },
    sourceCurrentnessFailures: sourceFailures,
    topCandidate: plan.topCandidate ?? {},
    targetWorktree,
    targetWorktreePrefix,
    extractionInstructionFile: TOP_CLEAN_CANDIDATE_ROOT_PARITY_GUARDED_EXTRACTION_PATHS.extractionInstructions,
    expectedUnitIds: unitIds,
    recordedInstructionRows: instructionRows,
    extractionUnits,
    candidateGitStatusRows: candidateStatusRows,
    preflightChecks: checks,
    summary: {
      mode,
      executorStatus: executorStatusValue,
      expectedRows: unitIds.length,
      recordedInstructionRows: instructionRows.length,
      extractionUnitRows: extractionUnits.length,
      rootSourcesAvailable: extractionUnits.filter((unit) => unit.rootSourceExists).length,
      rootSourcesShaMatched: extractionUnits.filter((unit) => unit.rootShaMatchesPlan).length,
      candidateTargetsMissing: extractionUnits.filter((unit) => unit.candidateTargetExists === false).length,
      candidateTargetsVerified: extractionUnits.filter((unit) => unit.candidateTargetMatchesRoot).length,
      candidateGitStatusRows: candidateStatusRows.length,
      preflightChecks: checks.length,
      passingPreflightChecks: checks.length - failedChecks.length,
      failedPreflightChecks: failedChecks.length,
      sourceCurrentnessFailures: sourceFailures.length,
      applyRequested: mode === "apply-extraction",
      applyPermitted: false,
      mutationsPerformed,
      rootCopyRows: 0,
      candidateMutationRows: 0,
      cleanupAuthorizedRows: 0,
      executableRows: 0
    },
    boundary: {
      evidenceOnly: true,
      dryRunOnly: mode === "dry-run",
      applyModeRequested: mode === "apply-extraction",
      readsRecordedInstructionsOnly: true,
      recordsOwnerApproval: false,
      recordsExecutionInstruction: false,
      modifiesCandidate: false,
      copiesRootFiles: false,
      writesRootSourceFiles: false,
      runsTypeCheck: false,
      runsBuild: false,
      runsRegression: false,
      stageAuthorized: false,
      commitAuthorized: false,
      mergeAuthorized: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false,
      physicalLifecycleCleanupAuthorized: false,
      requiresRecordedExtractionInstructions: instructionRows.length !== unitIds.length,
      requiresSeparateOwnerCandidateMutationInstruction: executorStatusValue !== "already-extracted-and-verified"
    }
  };
}

export function stableA22RootParityGuardedExtractionProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    executorKind: payload.executorKind,
    mode: payload.mode,
    executorStatus: payload.executorStatus,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: payload.sourceArtifacts,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    topCandidate: payload.topCandidate,
    targetWorktree: payload.targetWorktree,
    targetWorktreePrefix: payload.targetWorktreePrefix,
    extractionInstructionFile: payload.extractionInstructionFile,
    expectedUnitIds: payload.expectedUnitIds,
    recordedInstructionRows: payload.recordedInstructionRows,
    extractionUnits: payload.extractionUnits,
    candidateGitStatusRows: payload.candidateGitStatusRows,
    preflightChecks: payload.preflightChecks,
    summary: payload.summary,
    boundary: payload.boundary
  };
}

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function markdown(payload) {
  const units = payload.extractionUnits.map((unit) =>
    `| \`${cell(unit.unitId)}\` | \`${cell(unit.rootSourcePath)}\` | ${unit.rootShaMatchesPlan ? "yes" : "no"} | \`${cell(unit.candidateTargetPath)}\` | ${unit.candidateTargetExists ? "yes" : "no"} | ${unit.instructionRecorded ? "yes" : "no"} |`
  ).join("\n") || "| none | none | no | none | no | no |";
  const checks = payload.preflightChecks.map((row) =>
    `| \`${cell(row.id)}\` | ${cell(row.status)} | ${cell(row.detail)} |`
  ).join("\n");
  return `# A22 Root-Parity Guarded Extraction Dry Run

Generated: ${payload.generatedAt}

Mode: \`${payload.mode}\`

Executor status: \`${payload.executorStatus}\`

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This executor is fail-closed evidence only. It validates whether recorded A22 root-parity extraction instructions are present and current, but it does not copy root files, mutate the A22 candidate, run type-check/build/regression, stage, commit, merge, deploy, clean, delete, reset, prune, record owner approval, or record execution instructions.

## Summary

- Expected rows: ${payload.summary.expectedRows}
- Recorded instruction rows: ${payload.summary.recordedInstructionRows}
- Candidate git status rows: ${payload.summary.candidateGitStatusRows}
- Root sources SHA matched: ${payload.summary.rootSourcesShaMatched}/${payload.summary.expectedRows}
- Candidate targets missing: ${payload.summary.candidateTargetsMissing}/${payload.summary.expectedRows}
- Candidate targets verified: ${payload.summary.candidateTargetsVerified}/${payload.summary.expectedRows}
- Preflight checks: ${payload.summary.passingPreflightChecks}/${payload.summary.preflightChecks}
- Apply requested: ${payload.summary.applyRequested}
- Apply permitted: ${payload.summary.applyPermitted}
- Mutations performed: ${payload.summary.mutationsPerformed}
- Root copy rows: ${payload.summary.rootCopyRows}
- Candidate mutation rows: ${payload.summary.candidateMutationRows}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Extraction Units

| Unit ID | Root source | Root SHA matches | Candidate target | Target exists | Instruction recorded |
| --- | --- | --- | --- | --- | --- |
${units}

## Preflight Checks

| Check | Status | Detail |
| --- | --- | --- |
${checks}

## Boundary

- Evidence only: true
- Records owner approval: false
- Records execution instruction: false
- Modifies candidate: false
- Copies root files: false
- Runs type-check: false
- Runs build: false
- Runs regression: false
- Stage authorized: false
- Commit authorized: false
- Merge authorized: false
- Cleanup authorized: false
- Executable now: false
- Destructive Git authorized: false
- Deploy authorized: false
- Physical lifecycle cleanup authorized: false
- Requires separate owner candidate mutation instruction: ${payload.boundary.requiresSeparateOwnerCandidateMutationInstruction}
`;
}

function persist(payload) {
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  if (payload.mode === "apply-extraction") {
    write(TOP_CLEAN_CANDIDATE_ROOT_PARITY_GUARDED_EXTRACTION_PATHS.latestApplyJson, json);
    write(TOP_CLEAN_CANDIDATE_ROOT_PARITY_GUARDED_EXTRACTION_PATHS.latestApplyMarkdown, md);
  } else {
    write(TOP_CLEAN_CANDIDATE_ROOT_PARITY_GUARDED_EXTRACTION_PATHS.latestDryRunJson, json);
    write(TOP_CLEAN_CANDIDATE_ROOT_PARITY_GUARDED_EXTRACTION_PATHS.datedDryRunJson, json);
    write(TOP_CLEAN_CANDIDATE_ROOT_PARITY_GUARDED_EXTRACTION_PATHS.latestDryRunMarkdown, md);
    write(TOP_CLEAN_CANDIDATE_ROOT_PARITY_GUARDED_EXTRACTION_PATHS.datedDryRunMarkdown, md);
  }
}

function main() {
  const apply = process.argv.includes("--apply-extraction");
  const mode = apply ? "apply-extraction" : "dry-run";
  const payload = buildA22RootParityGuardedExtractionState({ mode });
  persist(payload);
  console.log(JSON.stringify({
    mode,
    executorStatus: payload.executorStatus,
    expectedRows: payload.summary.expectedRows,
    recordedInstructionRows: payload.summary.recordedInstructionRows,
    candidateGitStatusRows: payload.summary.candidateGitStatusRows,
    applyPermitted: payload.summary.applyPermitted,
    mutationsPerformed: payload.summary.mutationsPerformed,
    rootCopyRows: payload.summary.rootCopyRows,
    candidateMutationRows: payload.summary.candidateMutationRows,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
  if (apply) process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
