#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  TOP_CLEAN_CANDIDATE_ROOT_PARITY_GUARDED_EXTRACTION_PATHS,
  buildA22RootParityGuardedExtractionState,
  stableA22RootParityGuardedExtractionProjection
} from "./run-a22-top-clean-candidate-root-parity-guarded-extraction.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();
const targetWorktreePrefix = "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/";

export const A22_ROOT_PARITY_CANDIDATE_MUTATION_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  guardedExtraction: TOP_CLEAN_CANDIDATE_ROOT_PARITY_GUARDED_EXTRACTION_PATHS.latestDryRunJson,
  guardedExtractionGate: "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-guarded-extraction-current-gate.json",
  ownerInput: "coordination/release-intake/latest-A22-root-parity-candidate-mutation-owner-input.json",
  latestDryRunJson: "coordination/release-intake/latest-A22-root-parity-candidate-mutation-dry-run.json",
  latestDryRunMarkdown: "coordination/release-intake/latest-A22-root-parity-candidate-mutation-dry-run.md",
  datedDryRunJson: `coordination/release-intake/${date}-A22-root-parity-candidate-mutation-dry-run.json`,
  datedDryRunMarkdown: `coordination/release-intake/${date}-A22-root-parity-candidate-mutation-dry-run.md`,
  latestApplyJson: "coordination/release-intake/latest-A22-root-parity-candidate-mutation-apply.json",
  latestApplyMarkdown: "coordination/release-intake/latest-A22-root-parity-candidate-mutation-apply.md"
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

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validIsoDate(value) {
  return nonEmptyString(value) && !Number.isNaN(Date.parse(value));
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

function candidateGitStatusRows(targetWorktree) {
  if (!targetWorktree || !fs.existsSync(targetWorktree)) return [];
  const output = git(["status", "--short"], targetWorktree);
  return output ? output.split("\n").filter(Boolean) : [];
}

function emptyOwnerInput(guardedExtraction) {
  return {
    inputKind: "a22-root-parity-candidate-mutation-owner-input",
    sourceGuardedExtractionGeneratedAt: guardedExtraction.generatedAt ?? null,
    sourceGuardedExtraction: A22_ROOT_PARITY_CANDIDATE_MUTATION_PATHS.guardedExtraction,
    targetWorktree: guardedExtraction.targetWorktree ?? "",
    applyToUnitIds: guardedExtraction.expectedUnitIds ?? [],
    ownerExecutionText: "",
    approvedBy: "",
    approvedAt: "",
    notes: "",
    candidateMutationAuthorized: false,
    cleanupAuthorized: false,
    executableNow: false,
    deployAuthorized: false,
    mergeAuthorized: false,
    stageAuthorized: false,
    destructiveGitAuthorized: false,
    physicalLifecycleCleanupAuthorized: false,
    boundary: {
      ownerInputOnly: true,
      candidateMutationOnly: false,
      recordsExtractionInstruction: false,
      modifiesCandidate: false,
      copiesRootFiles: false,
      runsTypeCheck: false,
      runsBuild: false,
      runsRegression: false,
      cleanupAuthorized: false,
      executableNow: false,
      deployAuthorized: false,
      mergeAuthorized: false,
      stageAuthorized: false,
      destructiveGitAuthorized: false,
      physicalLifecycleCleanupAuthorized: false
    }
  };
}

function readOwnerInput(guardedExtraction) {
  if (!exists(A22_ROOT_PARITY_CANDIDATE_MUTATION_PATHS.ownerInput)) return emptyOwnerInput(guardedExtraction);
  return readJson(A22_ROOT_PARITY_CANDIDATE_MUTATION_PATHS.ownerInput);
}

function ownerInputBlank(ownerInput) {
  return !nonEmptyString(ownerInput.ownerExecutionText) &&
    !nonEmptyString(ownerInput.approvedBy) &&
    !nonEmptyString(ownerInput.approvedAt) &&
    !nonEmptyString(ownerInput.notes) &&
    ownerInput.candidateMutationAuthorized !== true;
}

function mutationRows(guardedExtraction) {
  const recordedByUnit = new Map((guardedExtraction.recordedInstructionRows ?? []).map((row) => [row.unitId, row]));
  return (guardedExtraction.extractionUnits ?? []).map((unit) => {
    const instruction = recordedByUnit.get(unit.unitId);
    return {
      unitId: unit.unitId,
      selectedAction: instruction?.selectedAction ?? "",
      rootSourcePath: unit.rootSourcePath,
      rootSourceSha256: unit.expectedRootSha256,
      candidateTargetPath: unit.candidateTargetPath,
      targetWorktree: guardedExtraction.targetWorktree,
      rootSourceExists: unit.rootSourceExists === true,
      rootShaMatchesPlan: unit.rootShaMatchesPlan === true,
      candidateTargetExists: unit.candidateTargetExists === true,
      candidateTargetMatchesRoot: unit.candidateTargetMatchesRoot === true,
      instructionRecorded: unit.instructionRecorded === true,
      cleanupAuthorized: false,
      executableNow: false,
      deployAuthorized: false,
      mergeAuthorized: false,
      stageAuthorized: false,
      destructiveGitAuthorized: false,
      physicalLifecycleCleanupAuthorized: false
    };
  });
}

function ownerExecutionLine(row) {
  return [
    `Authorize A22 candidate mutation for unitId=${row.unitId}`,
    `targetWorktree=${row.targetWorktree}`,
    `rootSource=${row.rootSourcePath}`,
    `rootSourceSha256=${row.rootSourceSha256}`,
    `candidateTarget=${row.candidateTargetPath}`,
    `selectedAction=${row.selectedAction}`,
    "candidateMutationAuthorized=true",
    "No cleanup",
    "No deploy",
    "No merge",
    "No broad staging",
    "No destructive git",
    "No physical lifecycle cleanup"
  ].join("; ") + ".";
}

function ownerMutationTextCoversRows(ownerInput, rows) {
  const text = ownerInput.ownerExecutionText ?? "";
  return rows.length === 4 && rows.every((row) =>
    text.includes(`unitId=${row.unitId}`) &&
    text.includes(`targetWorktree=${row.targetWorktree}`) &&
    text.includes(`rootSource=${row.rootSourcePath}`) &&
    text.includes(`rootSourceSha256=${row.rootSourceSha256}`) &&
    text.includes(`candidateTarget=${row.candidateTargetPath}`) &&
    text.includes(`selectedAction=${row.selectedAction}`) &&
    text.includes("candidateMutationAuthorized=true")
  );
}

function ownerMutationTextKeepsBoundaries(ownerInput) {
  const text = String(ownerInput.ownerExecutionText ?? "");
  return [
    "No cleanup",
    "No deploy",
    "No merge",
    "No broad staging",
    "No destructive git",
    "No physical lifecycle cleanup"
  ].every((needle) => text.includes(needle));
}

function ownerInputSafe(ownerInput) {
  return ownerInput.candidateMutationAuthorized === true &&
    ownerInput.cleanupAuthorized === false &&
    ownerInput.executableNow === false &&
    ownerInput.deployAuthorized === false &&
    ownerInput.mergeAuthorized === false &&
    ownerInput.stageAuthorized === false &&
    ownerInput.destructiveGitAuthorized === false &&
    ownerInput.physicalLifecycleCleanupAuthorized === false &&
    ownerInput.boundary?.recordsExtractionInstruction === false &&
    ownerInput.boundary?.runsTypeCheck === false &&
    ownerInput.boundary?.runsBuild === false &&
    ownerInput.boundary?.runsRegression === false;
}

function targetAbsolute(row) {
  return path.join(row.targetWorktree, row.candidateTargetPath);
}

function rootAbsolute(row) {
  return path.join(root, row.rootSourcePath);
}

function copyRows(rows) {
  for (const row of rows) {
    const source = rootAbsolute(row);
    const target = targetAbsolute(row);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
}

function extractedAndVerified(rows) {
  return rows.length === 4 &&
    rows.every((row) =>
      row.rootSourceExists &&
      row.rootShaMatchesPlan &&
      row.candidateTargetExists &&
      row.candidateTargetMatchesRoot &&
      row.instructionRecorded
    );
}

function sourceCurrentnessFailures({ dirtyMap, guardedExtraction, guardedExtractionGate, currentGuardedExtraction }) {
  const failures = [];
  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  if (guardedExtraction.dirtyMapStatusSignature !== expectedSignature) failures.push("guarded extraction dirty-map signature is stale");
  if (guardedExtraction.expandedStatusEntries !== expectedEntries) failures.push("guarded extraction expanded dirty entry count is stale");
  if (guardedExtractionGate.dirtyMapStatusSignature !== expectedSignature) failures.push("guarded extraction gate dirty-map signature is stale");
  if (guardedExtractionGate.expandedStatusEntries !== expectedEntries) failures.push("guarded extraction gate expanded dirty entry count is stale");
  if ((guardedExtractionGate.failures ?? []).length !== 0) failures.push("guarded extraction gate has failures");
  if (!sameJson(
    stableA22RootParityGuardedExtractionProjection(guardedExtraction),
    stableA22RootParityGuardedExtractionProjection(currentGuardedExtraction)
  )) {
    failures.push("guarded extraction dry-run is stale versus current sources");
  }
  return failures;
}

function executorStatus({ mode, sourceFailures, guardedExtraction, rows, ownerInput, candidateStatusRows }) {
  const recordedRows = rows.filter((row) => row.instructionRecorded);
  const allTargetsVerified = extractedAndVerified(rows);
  const allRootSourcesReady = rows.length === 4 && rows.every((row) => row.rootSourceExists && row.rootShaMatchesPlan);
  const allTargetsMissingOrVerified = rows.every((row) => row.candidateTargetExists === false || row.candidateTargetMatchesRoot);
  const ownerReady = !ownerInputBlank(ownerInput) &&
    ownerInputSafe(ownerInput) &&
    ownerMutationTextCoversRows(ownerInput, rows) &&
    ownerMutationTextKeepsBoundaries(ownerInput) &&
    validIsoDate(ownerInput.approvedAt) &&
    nonEmptyString(ownerInput.approvedBy) &&
    nonEmptyString(ownerInput.notes);

  if (!String(guardedExtraction.targetWorktree ?? "").startsWith(targetWorktreePrefix)) return "not-ready-invalid-target-worktree";
  if (rows.length !== 4) return "not-ready-unexpected-unit-count";
  if (recordedRows.length === 0) return mode === "apply-candidate-mutation"
    ? "apply-blocked-missing-recorded-instructions"
    : "dry-run-blocked-missing-recorded-instructions";
  if (recordedRows.length > 0 && recordedRows.length < 4) return "not-ready-partial-recorded-instructions";
  if (allTargetsVerified) return "already-extracted-and-verified";
  if (sourceFailures.length > 0) return "not-ready-source-stale";
  if (!allRootSourcesReady) return "not-ready-root-source-fingerprint";
  if (!allTargetsMissingOrVerified) return "not-ready-candidate-target-conflict";
  if (candidateStatusRows.length !== 0) return "not-ready-candidate-worktree-dirty";
  if (!ownerReady) return mode === "apply-candidate-mutation"
    ? "apply-blocked-owner-candidate-mutation-input"
    : "dry-run-blocked-owner-candidate-mutation-input";
  return mode === "apply-candidate-mutation" ? "ready-to-apply-candidate-mutation" : "dry-run-ready-requires-explicit-apply";
}

function buildChecks({ mode, sourceFailures, guardedExtraction, rows, ownerInput, candidateStatusRows, status }) {
  const recordedRows = rows.filter((row) => row.instructionRecorded);
  const allTargetsVerified = rows.length === 4 && rows.every((row) => row.candidateTargetMatchesRoot);
  const ownerInputIsBlank = ownerInputBlank(ownerInput);
  const ownerReady = !ownerInputIsBlank &&
    ownerInputSafe(ownerInput) &&
    ownerMutationTextCoversRows(ownerInput, rows) &&
    ownerMutationTextKeepsBoundaries(ownerInput) &&
    validIsoDate(ownerInput.approvedAt) &&
    nonEmptyString(ownerInput.approvedBy) &&
    nonEmptyString(ownerInput.notes);

  return [
    {
      id: "mode-is-explicit",
      status: mode === "dry-run" || mode === "apply-candidate-mutation" ? "pass" : "fail",
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
      status: String(guardedExtraction.targetWorktree ?? "").startsWith(targetWorktreePrefix) ? "pass" : "fail",
      detail: `targetWorktree=${guardedExtraction.targetWorktree ?? ""}`
    },
    {
      id: "four-mutation-units",
      status: rows.length === 4 ? "pass" : "fail",
      detail: `mutationUnits=${rows.length}`
    },
    {
      id: "recorded-instruction-state-coherent",
      status: (
        recordedRows.length === 0 && status.includes("missing-recorded-instructions")
      ) || (
        recordedRows.length === 4 && !status.includes("missing-recorded-instructions")
      )
        ? "pass"
        : "fail",
      detail: `recordedRows=${recordedRows.length}; status=${status}`
    },
    {
      id: "root-source-fingerprints-ready-or-waiting",
      status: recordedRows.length === 0 || rows.every((row) => row.rootSourceExists && row.rootShaMatchesPlan) ? "pass" : "fail",
      detail: `rootShaMatched=${rows.filter((row) => row.rootShaMatchesPlan).length}/${rows.length}`
    },
    {
      id: "candidate-targets-safe",
      status: allTargetsVerified || rows.every((row) => row.candidateTargetExists === false || row.candidateTargetMatchesRoot) ? "pass" : "fail",
      detail: `missing=${rows.filter((row) => row.candidateTargetExists === false).length}; verified=${rows.filter((row) => row.candidateTargetMatchesRoot).length}`
    },
    {
      id: "candidate-git-status-clean",
      status: allTargetsVerified || candidateStatusRows.length === 0 ? "pass" : "fail",
      detail: `candidateGitStatusRows=${candidateStatusRows.length}; allTargetsVerified=${allTargetsVerified}`
    },
    {
      id: "owner-candidate-mutation-input-state",
      status: ownerInputIsBlank || ownerReady ? "pass" : "fail",
      detail: `ownerInputBlank=${ownerInputIsBlank}; ownerReady=${ownerReady}`
    },
    {
      id: "apply-requires-ready-status",
      status: mode === "dry-run" || status === "ready-to-apply-candidate-mutation" || status === "already-extracted-and-verified" ? "pass" : "fail",
      detail: `mode=${mode}; status=${status}`
    },
    {
      id: "no-cleanup-merge-deploy-boundary",
      status: ownerInputIsBlank || (
        ownerInput.cleanupAuthorized === false &&
        ownerInput.executableNow === false &&
        ownerInput.deployAuthorized === false &&
        ownerInput.mergeAuthorized === false &&
        ownerInput.stageAuthorized === false &&
        ownerInput.destructiveGitAuthorized === false &&
        ownerInput.physicalLifecycleCleanupAuthorized === false
      ) ? "pass" : "fail",
      detail: "candidate mutation input must not authorize cleanup, merge, deploy, broad staging, destructive git, or physical lifecycle cleanup"
    }
  ];
}

function ownerInputTemplate(rows, guardedExtraction) {
  return {
    ...emptyOwnerInput(guardedExtraction),
    ownerExecutionText: rows.map(ownerExecutionLine).join("\n"),
    approvedBy: "<owner>",
    approvedAt: "<ISO-8601>",
    notes: "<scope and checks>",
    candidateMutationAuthorized: true,
    boundary: {
      ownerInputOnly: true,
      candidateMutationOnly: true,
      recordsExtractionInstruction: false,
      modifiesCandidate: true,
      copiesRootFiles: true,
      runsTypeCheck: false,
      runsBuild: false,
      runsRegression: false,
      cleanupAuthorized: false,
      executableNow: false,
      deployAuthorized: false,
      mergeAuthorized: false,
      stageAuthorized: false,
      destructiveGitAuthorized: false,
      physicalLifecycleCleanupAuthorized: false
    }
  };
}

export function buildA22RootParityCandidateMutationState({ mode = "dry-run", mutationsPerformed = false } = {}) {
  const dirtyMap = readJson(A22_ROOT_PARITY_CANDIDATE_MUTATION_PATHS.dirtyMap);
  const guardedExtraction = readJson(A22_ROOT_PARITY_CANDIDATE_MUTATION_PATHS.guardedExtraction);
  const guardedExtractionGate = readJson(A22_ROOT_PARITY_CANDIDATE_MUTATION_PATHS.guardedExtractionGate);
  const currentGuardedExtraction = buildA22RootParityGuardedExtractionState({ mode: "dry-run" });
  const rawSourceFailures = sourceCurrentnessFailures({
    dirtyMap,
    guardedExtraction,
    guardedExtractionGate,
    currentGuardedExtraction
  });
  const rows = mutationRows(guardedExtraction);
  const sourceFailures = extractedAndVerified(rows) ? [] : rawSourceFailures;
  const ownerInput = readOwnerInput(guardedExtraction);
  const candidateStatusRows = candidateGitStatusRows(guardedExtraction.targetWorktree ?? "");
  const status = executorStatus({
    mode,
    sourceFailures,
    guardedExtraction,
    rows,
    ownerInput,
    candidateStatusRows
  });
  const checks = buildChecks({
    mode,
    sourceFailures,
    guardedExtraction,
    rows,
    ownerInput,
    candidateStatusRows,
    status
  });
  const failedChecks = checks.filter((row) => row.status !== "pass");
  const executorStatusValue = failedChecks.length === 0 ? status : "not-ready-check-failures";
  const applyPermitted = mode === "apply-candidate-mutation" && executorStatusValue === "ready-to-apply-candidate-mutation";
  const targetFingerprints = rows.map((row) => ({
    unitId: row.unitId,
    before: fileFingerprint(targetAbsolute(row)),
    root: fileFingerprint(rootAbsolute(row))
  }));

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    executorKind: "a22-root-parity-candidate-mutation",
    mode,
    executorStatus: executorStatusValue,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? null,
    sourceArtifacts: {
      guardedExtractionGeneratedAt: guardedExtraction.generatedAt,
      guardedExtractionGateFailureCount: (guardedExtractionGate.failures ?? []).length,
      ownerInputFileExists: exists(A22_ROOT_PARITY_CANDIDATE_MUTATION_PATHS.ownerInput)
    },
    sourceCurrentnessFailures: sourceFailures,
    ownerInputFile: A22_ROOT_PARITY_CANDIDATE_MUTATION_PATHS.ownerInput,
    targetWorktree: guardedExtraction.targetWorktree ?? "",
    targetWorktreePrefix,
    mutationRows: rows,
    ownerInputBlank: ownerInputBlank(ownerInput),
    ownerInputProjection: {
      candidateMutationAuthorized: ownerInput.candidateMutationAuthorized === true,
      ownerExecutionTextProvided: nonEmptyString(ownerInput.ownerExecutionText),
      ownerExecutionTextCoversRows: ownerMutationTextCoversRows(ownerInput, rows),
      ownerExecutionTextKeepsBoundaries: ownerMutationTextKeepsBoundaries(ownerInput),
      approvedByProvided: nonEmptyString(ownerInput.approvedBy),
      approvedAt: ownerInput.approvedAt ?? "",
      approvedAtValid: validIsoDate(ownerInput.approvedAt),
      notesProvided: nonEmptyString(ownerInput.notes),
      cleanupAuthorized: ownerInput.cleanupAuthorized === true,
      executableNow: ownerInput.executableNow === true,
      deployAuthorized: ownerInput.deployAuthorized === true,
      mergeAuthorized: ownerInput.mergeAuthorized === true,
      stageAuthorized: ownerInput.stageAuthorized === true,
      destructiveGitAuthorized: ownerInput.destructiveGitAuthorized === true,
      physicalLifecycleCleanupAuthorized: ownerInput.physicalLifecycleCleanupAuthorized === true
    },
    ownerInputTemplateDoNotApply: ownerInputTemplate(rows, guardedExtraction),
    candidateGitStatusRows: candidateStatusRows,
    targetFingerprints,
    preflightChecks: checks,
    summary: {
      mode,
      executorStatus: executorStatusValue,
      expectedRows: rows.length,
      recordedInstructionRows: rows.filter((row) => row.instructionRecorded).length,
      rootSourcesAvailable: rows.filter((row) => row.rootSourceExists).length,
      rootSourcesShaMatched: rows.filter((row) => row.rootShaMatchesPlan).length,
      candidateTargetsMissing: rows.filter((row) => row.candidateTargetExists === false).length,
      candidateTargetsVerified: rows.filter((row) => row.candidateTargetMatchesRoot).length,
      candidateGitStatusRows: candidateStatusRows.length,
      preflightChecks: checks.length,
      passingPreflightChecks: checks.length - failedChecks.length,
      failedPreflightChecks: failedChecks.length,
      sourceCurrentnessFailures: sourceFailures.length,
      applyRequested: mode === "apply-candidate-mutation",
      applyPermitted,
      mutationsPerformed,
      rootCopyRows: mutationsPerformed ? rows.length : 0,
      candidateMutationRows: mutationsPerformed ? rows.length : 0,
      cleanupAuthorizedRows: 0,
      executableRows: 0
    },
    boundary: {
      evidenceOnly: mode === "dry-run",
      dryRunOnly: mode === "dry-run",
      applyModeRequested: mode === "apply-candidate-mutation",
      recordsOwnerApproval: false,
      recordsExtractionInstruction: false,
      modifiesCandidate: mutationsPerformed,
      copiesRootFiles: mutationsPerformed,
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
      requiresRecordedExtractionInstructions: rows.filter((row) => row.instructionRecorded).length !== rows.length,
      requiresSeparateOwnerCandidateMutationInput: executorStatusValue !== "already-extracted-and-verified",
      requiresExplicitApplyCandidateMutationFlag: true
    }
  };
}

export function stableA22RootParityCandidateMutationProjection(payload) {
  const template = payload.ownerInputTemplateDoNotApply ?? {};
  return {
    repoRoot: payload.repoRoot,
    executorKind: payload.executorKind,
    mode: payload.mode,
    executorStatus: payload.executorStatus,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: payload.sourceArtifacts,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    ownerInputFile: payload.ownerInputFile,
    targetWorktree: payload.targetWorktree,
    targetWorktreePrefix: payload.targetWorktreePrefix,
    mutationRows: payload.mutationRows,
    ownerInputBlank: payload.ownerInputBlank,
    ownerInputProjection: payload.ownerInputProjection,
    ownerInputTemplateDoNotApply: {
      ...template,
      sourceGuardedExtractionGeneratedAt: "<stable-projection>"
    },
    candidateGitStatusRows: payload.candidateGitStatusRows,
    targetFingerprints: payload.targetFingerprints,
    preflightChecks: payload.preflightChecks,
    summary: payload.summary,
    boundary: payload.boundary
  };
}

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function markdown(payload) {
  const rows = payload.mutationRows.map((row) =>
    `| \`${cell(row.unitId)}\` | ${cell(row.selectedAction || "none")} | \`${cell(row.rootSourcePath)}\` | ${row.rootShaMatchesPlan ? "yes" : "no"} | \`${cell(row.candidateTargetPath)}\` | ${row.instructionRecorded ? "yes" : "no"} | ${row.candidateTargetExists ? "yes" : "no"} |`
  ).join("\n") || "| none | none | none | no | none | no | no |";
  const checks = payload.preflightChecks.map((row) =>
    `| \`${cell(row.id)}\` | ${cell(row.status)} | ${cell(row.detail)} |`
  ).join("\n");
  return `# A22 Root-Parity Candidate Mutation ${payload.mode === "dry-run" ? "Dry Run" : "Apply Report"}

Generated: ${payload.generatedAt}

Mode: \`${payload.mode}\`

Executor status: \`${payload.executorStatus}\`

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This executor is fail-closed. Dry-run mode writes evidence only. Apply-candidate-mutation mode may copy only the four recorded A22 root-parity source files into the contained top-candidate worktree, and only after recorded extraction instructions plus a separate owner candidate-mutation input are present. It never stages, commits, merges, deploys, cleans, deletes, resets, prunes, edits root source files, or runs type-check/build/regression.

## Summary

- Expected rows: ${payload.summary.expectedRows}
- Recorded instruction rows: ${payload.summary.recordedInstructionRows}
- Root sources SHA matched: ${payload.summary.rootSourcesShaMatched}/${payload.summary.expectedRows}
- Candidate targets missing: ${payload.summary.candidateTargetsMissing}/${payload.summary.expectedRows}
- Candidate targets verified: ${payload.summary.candidateTargetsVerified}/${payload.summary.expectedRows}
- Candidate git status rows: ${payload.summary.candidateGitStatusRows}
- Owner input blank: ${payload.ownerInputBlank}
- Owner mutation input file: \`${payload.ownerInputFile}\`
- Preflight checks: ${payload.summary.passingPreflightChecks}/${payload.summary.preflightChecks}
- Apply requested: ${payload.summary.applyRequested}
- Apply permitted: ${payload.summary.applyPermitted}
- Mutations performed: ${payload.summary.mutationsPerformed}
- Root copy rows: ${payload.summary.rootCopyRows}
- Candidate mutation rows: ${payload.summary.candidateMutationRows}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Candidate Mutation Rows

| Unit ID | Selected action | Root source | Root SHA matches | Candidate target | Instruction recorded | Target exists |
| --- | --- | --- | --- | --- | --- | --- |
${rows}

## Preflight Checks

| Check | Status | Detail |
| --- | --- | --- |
${checks}

## Boundary

- Evidence only: ${payload.boundary.evidenceOnly}
- Modifies candidate: ${payload.boundary.modifiesCandidate}
- Copies root files: ${payload.boundary.copiesRootFiles}
- Writes root source files: false
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
- Requires recorded extraction instructions: ${payload.boundary.requiresRecordedExtractionInstructions}
- Requires separate owner candidate mutation input: true
- Requires explicit apply-candidate-mutation flag: true
`;
}

function persist(payload) {
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  if (payload.mode === "apply-candidate-mutation") {
    write(A22_ROOT_PARITY_CANDIDATE_MUTATION_PATHS.latestApplyJson, json);
    write(A22_ROOT_PARITY_CANDIDATE_MUTATION_PATHS.latestApplyMarkdown, md);
  } else {
    write(A22_ROOT_PARITY_CANDIDATE_MUTATION_PATHS.latestDryRunJson, json);
    write(A22_ROOT_PARITY_CANDIDATE_MUTATION_PATHS.datedDryRunJson, json);
    write(A22_ROOT_PARITY_CANDIDATE_MUTATION_PATHS.latestDryRunMarkdown, md);
    write(A22_ROOT_PARITY_CANDIDATE_MUTATION_PATHS.datedDryRunMarkdown, md);
  }
}

function main() {
  const apply = process.argv.includes("--apply-candidate-mutation");
  const mode = apply ? "apply-candidate-mutation" : "dry-run";
  let payload = buildA22RootParityCandidateMutationState({ mode });
  if (apply) {
    if (payload.summary.applyPermitted !== true) {
      persist(payload);
      console.log(JSON.stringify({
        mode,
        executorStatus: payload.executorStatus,
        applyPermitted: payload.summary.applyPermitted,
        mutationsPerformed: payload.summary.mutationsPerformed,
        rootCopyRows: payload.summary.rootCopyRows,
        candidateMutationRows: payload.summary.candidateMutationRows,
        cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
        executableRows: payload.summary.executableRows
      }, null, 2));
      process.exit(1);
    }
    copyRows(payload.mutationRows);
    payload = buildA22RootParityCandidateMutationState({
      mode,
      mutationsPerformed: true
    });
  }
  persist(payload);
  console.log(JSON.stringify({
    mode,
    executorStatus: payload.executorStatus,
    expectedRows: payload.summary.expectedRows,
    recordedInstructionRows: payload.summary.recordedInstructionRows,
    applyPermitted: payload.summary.applyPermitted,
    mutationsPerformed: payload.summary.mutationsPerformed,
    rootCopyRows: payload.summary.rootCopyRows,
    candidateMutationRows: payload.summary.candidateMutationRows,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
