#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  A22_ROOT_PARITY_CANDIDATE_MUTATION_PATHS,
  buildA22RootParityCandidateMutationState,
  stableA22RootParityCandidateMutationProjection
} from "./run-a22-root-parity-candidate-mutation.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A22-root-parity-candidate-mutation-current-gate.json");
const json = process.argv.includes("--json");

const expectedRows = [
  {
    unitId: "a06-visualization-back-to-top-import-parity",
    selectedAction: "reexport",
    rootSourcePath: "components/visualizations/VisualizationLabBackToTopButton.tsx",
    candidateTargetPath: "app/visualization-lab/VisualizationLabBackToTopButton.tsx"
  },
  {
    unitId: "a20-math-virus-blaster-data-parity",
    selectedAction: "same-path-copy",
    rootSourcePath: "data/mathVirusBlaster.ts",
    candidateTargetPath: "data/mathVirusBlaster.ts"
  },
  {
    unitId: "a20-mighty-tank-battle-data-parity",
    selectedAction: "same-path-copy",
    rootSourcePath: "data/mightyTankBattle.ts",
    candidateTargetPath: "data/mightyTankBattle.ts"
  },
  {
    unitId: "a05-california-high-school-lesson-illustration-data-parity",
    selectedAction: "same-path-copy",
    rootSourcePath: "data/usCaliforniaHighSchoolLessonIllustrations.ts",
    candidateTargetPath: "data/usCaliforniaHighSchoolLessonIllustrations.ts"
  }
];

function git(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
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

function readText(relativePath) {
  return fs.readFileSync(absolute(relativePath), "utf8");
}

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function fail(failures, condition, message) {
  if (!condition) failures.push(message);
}

function checkById(checks, id) {
  return (checks ?? []).find((row) => row.id === id);
}

function main() {
  const failures = [];
  for (const requiredPath of [
    A22_ROOT_PARITY_CANDIDATE_MUTATION_PATHS.latestDryRunJson,
    A22_ROOT_PARITY_CANDIDATE_MUTATION_PATHS.latestDryRunMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const recorded = readJson(A22_ROOT_PARITY_CANDIDATE_MUTATION_PATHS.latestDryRunJson);
  const current = buildA22RootParityCandidateMutationState();
  const markdown = readText(A22_ROOT_PARITY_CANDIDATE_MUTATION_PATHS.latestDryRunMarkdown);
  const executorStatus = recorded.executorStatus;
  const blockedForOwnerInput = executorStatus === "dry-run-blocked-owner-candidate-mutation-input";
  const readyForApply = executorStatus === "dry-run-ready-requires-explicit-apply";
  const alreadyExtracted = executorStatus === "already-extracted-and-verified";
  const supportedStatus = blockedForOwnerInput || readyForApply || alreadyExtracted;

  fail(
    failures,
    sameJson(
      stableA22RootParityCandidateMutationProjection(recorded),
      stableA22RootParityCandidateMutationProjection(current)
    ),
    "A22 root-parity candidate mutation dry-run is stale"
  );
  fail(failures, recorded.executorKind === "a22-root-parity-candidate-mutation", "executorKind is invalid");
  fail(failures, recorded.mode === "dry-run", "mode must be dry-run");
  fail(
    failures,
    supportedStatus,
    "executorStatus must be a supported candidate-mutation state"
  );
  fail(failures, (recorded.sourceCurrentnessFailures ?? []).length === 0, "sourceCurrentnessFailures must be empty");
  fail(failures, recorded.targetWorktree === "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment", "targetWorktree is invalid");
  fail(failures, recorded.ownerInputFile === "coordination/release-intake/latest-A22-root-parity-candidate-mutation-owner-input.json", "ownerInputFile is invalid");
  fail(
    failures,
    recorded.ownerInputBlank === blockedForOwnerInput,
    "owner input blank state must match candidate mutation authorization state"
  );

  const summary = recorded.summary ?? {};
  fail(failures, summary.expectedRows === 4, "summary.expectedRows must be 4");
  fail(failures, summary.recordedInstructionRows === 4, "summary.recordedInstructionRows must be 4 after extraction-instruction recording");
  fail(failures, summary.rootSourcesAvailable === 4, "summary.rootSourcesAvailable must be 4");
  fail(failures, summary.rootSourcesShaMatched === 4, "summary.rootSourcesShaMatched must be 4");
  fail(
    failures,
    alreadyExtracted ? summary.candidateTargetsMissing === 0 : summary.candidateTargetsMissing === 4,
    "summary.candidateTargetsMissing must match extraction state"
  );
  fail(
    failures,
    alreadyExtracted ? summary.candidateTargetsVerified === 4 : summary.candidateTargetsVerified === 0,
    "summary.candidateTargetsVerified must match extraction state"
  );
  fail(
    failures,
    alreadyExtracted ? Number.isInteger(summary.candidateGitStatusRows) && summary.candidateGitStatusRows >= 0 : summary.candidateGitStatusRows === 0,
    "candidate git status rows must be clean before extraction and bounded after extraction"
  );
  fail(failures, summary.applyRequested === false, "applyRequested must be false");
  fail(failures, summary.applyPermitted === false, "applyPermitted must be false");
  fail(failures, summary.mutationsPerformed === false, "mutationsPerformed must be false");
  fail(failures, summary.rootCopyRows === 0, "rootCopyRows must be 0");
  fail(failures, summary.candidateMutationRows === 0, "candidateMutationRows must be 0");
  fail(failures, summary.cleanupAuthorizedRows === 0, "cleanupAuthorizedRows must be 0");
  fail(failures, summary.executableRows === 0, "executableRows must be 0");
  fail(failures, summary.failedPreflightChecks === 0, "failedPreflightChecks must be 0");

  fail(failures, (recorded.mutationRows ?? []).length === 4, "mutationRows must be 4");
  for (const expected of expectedRows) {
    const row = (recorded.mutationRows ?? []).find((candidate) => candidate.unitId === expected.unitId);
    fail(failures, Boolean(row), `missing mutation row: ${expected.unitId}`);
    if (!row) continue;
    fail(failures, row.selectedAction === expected.selectedAction, `${expected.unitId}: selectedAction mismatch`);
    fail(failures, row.rootSourcePath === expected.rootSourcePath, `${expected.unitId}: rootSourcePath mismatch`);
    fail(failures, row.candidateTargetPath === expected.candidateTargetPath, `${expected.unitId}: candidateTargetPath mismatch`);
    fail(failures, row.rootSourceExists === true, `${expected.unitId}: root source must exist`);
    fail(failures, row.rootShaMatchesPlan === true, `${expected.unitId}: root SHA must match plan`);
    fail(
      failures,
      alreadyExtracted ? row.candidateTargetExists === true : row.candidateTargetExists === false,
      `${expected.unitId}: candidate target existence must match extraction state`
    );
    fail(
      failures,
      alreadyExtracted ? row.candidateTargetMatchesRoot === true : row.candidateTargetMatchesRoot === false,
      `${expected.unitId}: candidate target root parity must match extraction state`
    );
    fail(failures, row.instructionRecorded === true, `${expected.unitId}: instruction should be recorded before candidate mutation authorization`);
  }

  const projection = recorded.ownerInputProjection ?? {};
  fail(failures, projection.candidateMutationAuthorized === !blockedForOwnerInput, "ownerInputProjection.candidateMutationAuthorized must match authorization state");
  fail(failures, projection.ownerExecutionTextProvided === !blockedForOwnerInput, "owner execution text state must match authorization state");
  fail(failures, projection.ownerExecutionTextCoversRows === !blockedForOwnerInput, "owner execution text coverage must match authorization state");
  fail(failures, projection.approvedByProvided === !blockedForOwnerInput, "approvedBy state must match authorization state");
  fail(failures, projection.approvedAtValid === !blockedForOwnerInput, "approvedAt validity must match authorization state");
  fail(failures, projection.notesProvided === !blockedForOwnerInput, "notes state must match authorization state");

  const template = recorded.ownerInputTemplateDoNotApply ?? {};
  fail(failures, template.candidateMutationAuthorized === true, "template should show candidateMutationAuthorized true for future owner input");
  fail(failures, template.cleanupAuthorized === false, "template cleanupAuthorized must be false");
  fail(failures, template.executableNow === false, "template executableNow must be false");
  fail(failures, template.deployAuthorized === false, "template deployAuthorized must be false");
  fail(failures, template.mergeAuthorized === false, "template mergeAuthorized must be false");
  fail(failures, template.stageAuthorized === false, "template stageAuthorized must be false");
  fail(failures, template.destructiveGitAuthorized === false, "template destructiveGitAuthorized must be false");
  fail(failures, template.physicalLifecycleCleanupAuthorized === false, "template physicalLifecycleCleanupAuthorized must be false");
  fail(failures, String(template.ownerExecutionText ?? "").split("\n").filter(Boolean).length === 4, "template ownerExecutionText must contain 4 lines");

  for (const checkId of [
    "mode-is-explicit",
    "source-current",
    "target-worktree-contained",
    "four-mutation-units",
    "recorded-instruction-state-coherent",
    "root-source-fingerprints-ready-or-waiting",
    "candidate-targets-safe",
    "candidate-git-status-clean",
    "owner-candidate-mutation-input-state",
    "apply-requires-ready-status",
    "no-cleanup-merge-deploy-boundary"
  ]) {
    fail(failures, checkById(recorded.preflightChecks, checkId)?.status === "pass", `check must pass: ${checkId}`);
  }

  const boundary = recorded.boundary ?? {};
  for (const [key, expected] of Object.entries({
    evidenceOnly: true,
    dryRunOnly: true,
    applyModeRequested: false,
    recordsOwnerApproval: false,
    recordsExtractionInstruction: false,
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
    requiresRecordedExtractionInstructions: false,
    requiresSeparateOwnerCandidateMutationInput: !alreadyExtracted,
    requiresExplicitApplyCandidateMutationFlag: true
  })) {
    fail(failures, boundary[key] === expected, `boundary.${key} must be ${expected}`);
  }

  const requiredMarkdown = [
    `Executor status: \`${executorStatus}\``,
    "Apply permitted: false",
    "Root copy rows: 0",
    "Candidate mutation rows: 0",
    "Requires recorded extraction instructions: false",
    "Requires explicit apply-candidate-mutation flag: true"
  ];
  for (const text of requiredMarkdown) {
    fail(failures, markdown.includes(text), `markdown missing text: ${text}`);
  }

  finish({ failures, recorded });
}

function finish({ failures, recorded = null }) {
  const payload = {
    generatedAt: new Date().toISOString(),
    gateKind: "a22-root-parity-candidate-mutation-current",
    dirtyMapStatusSignature: recorded?.dirtyMapStatusSignature ?? null,
    expandedStatusEntries: recorded?.expandedStatusEntries ?? null,
    executorStatus: recorded?.executorStatus ?? "missing",
    expectedRows: recorded?.summary?.expectedRows ?? 0,
    recordedInstructionRows: recorded?.summary?.recordedInstructionRows ?? 0,
    rootCopyRows: recorded?.summary?.rootCopyRows ?? 0,
    candidateMutationRows: recorded?.summary?.candidateMutationRows ?? 0,
    cleanupAuthorizedRows: recorded?.summary?.cleanupAuthorizedRows ?? 0,
    executableRows: recorded?.summary?.executableRows ?? 0,
    failures
  };
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A22 root-parity candidate mutation gate");
    console.log(`Executor status: ${payload.executorStatus}`);
    console.log(`Recorded instruction rows: ${payload.recordedInstructionRows}/${payload.expectedRows}`);
    console.log(`Candidate mutation rows: ${payload.candidateMutationRows}`);
    console.log(`Failures: ${failures.length}`);
  }
  if (failures.length > 0) {
    if (!json) {
      console.error("A22 root-parity candidate mutation gate failed.");
      for (const failure of failures) console.error(`- ${failure}`);
    }
    process.exit(1);
  }
}

main();
