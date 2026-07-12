#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  A22_ROOT_PARITY_OWNER_INPUT_RECORDING_PATHS,
  buildA22RootParityOwnerInputRecordingState,
  stableA22RootParityOwnerInputRecordingProjection
} from "./run-a22-root-parity-owner-input-recording.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A22-root-parity-owner-input-recording-current-gate.json");
const json = process.argv.includes("--json");

const expectedRows = [
  {
    unitId: "a06-visualization-back-to-top-import-parity",
    selectedAction: "reexport",
    rootSource: "components/visualizations/VisualizationLabBackToTopButton.tsx",
    candidateTarget: "app/visualization-lab/VisualizationLabBackToTopButton.tsx"
  },
  {
    unitId: "a20-math-virus-blaster-data-parity",
    selectedAction: "same-path-copy",
    rootSource: "data/mathVirusBlaster.ts",
    candidateTarget: "data/mathVirusBlaster.ts"
  },
  {
    unitId: "a20-mighty-tank-battle-data-parity",
    selectedAction: "same-path-copy",
    rootSource: "data/mightyTankBattle.ts",
    candidateTarget: "data/mightyTankBattle.ts"
  },
  {
    unitId: "a05-california-high-school-lesson-illustration-data-parity",
    selectedAction: "same-path-copy",
    rootSource: "data/usCaliforniaHighSchoolLessonIllustrations.ts",
    candidateTarget: "data/usCaliforniaHighSchoolLessonIllustrations.ts"
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
    A22_ROOT_PARITY_OWNER_INPUT_RECORDING_PATHS.latestDryRunJson,
    A22_ROOT_PARITY_OWNER_INPUT_RECORDING_PATHS.latestDryRunMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const recorded = readJson(A22_ROOT_PARITY_OWNER_INPUT_RECORDING_PATHS.latestDryRunJson);
  const current = buildA22RootParityOwnerInputRecordingState();
  const markdown = readText(A22_ROOT_PARITY_OWNER_INPUT_RECORDING_PATHS.latestDryRunMarkdown);

  fail(
    failures,
    sameJson(
      stableA22RootParityOwnerInputRecordingProjection(recorded),
      stableA22RootParityOwnerInputRecordingProjection(current)
    ),
    "A22 root-parity owner-input recording dry-run is stale"
  );
  fail(failures, recorded.recorderKind === "a22-root-parity-owner-input-recording", "recorderKind is invalid");
  fail(failures, recorded.mode === "dry-run", "mode must be dry-run");
  const ownerInputAlreadyRecorded = recorded.recorderStatus === "already-recorded";
  fail(
    failures,
    ["dry-run-blocked-owner-approval-text", "already-recorded"].includes(recorded.recorderStatus),
    "recorderStatus must be dry-run-blocked-owner-approval-text or already-recorded"
  );
  fail(failures, (recorded.sourceCurrentnessFailures ?? []).length === 0, "sourceCurrentnessFailures must be empty");
  fail(failures, recorded.targetInputFile === "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-extraction-instruction-owner-input.json", "targetInputFile is invalid");
  fail(failures, recorded.topCandidate?.branch === "codex/A22-us-region-alignment", "topCandidate branch is invalid");
  if (ownerInputAlreadyRecorded) {
    fail(failures, recorded.existingOwnerInputBlank === false, "existing owner input must not be blank after owner approval");
    fail(failures, recorded.existingOwnerInputMatchesPatch === true, "existing owner input must match patch after owner approval");
  } else {
    fail(failures, recorded.existingOwnerInputBlank === true, "existing owner input must be blank before owner approval");
    fail(failures, recorded.existingOwnerInputMatchesPatch === false, "existing owner input should not match patch before owner approval");
  }

  const summary = recorded.summary ?? {};
  fail(failures, summary.patchRows === 4, "summary.patchRows must be 4");
  fail(failures, summary.ownerExecutionTextRows === 4, "summary.ownerExecutionTextRows must be 4");
  if (!ownerInputAlreadyRecorded) {
    fail(failures, summary.ownerApprovalFieldsPresent === false, "owner approval fields must not be present in default dry-run");
    fail(failures, summary.ownerApprovalTextCoversRows === false, "owner approval text must not cover rows in default dry-run");
    fail(failures, summary.ownerApprovalTextHasNegativeBoundaries === false, "owner approval text boundaries must be false in default dry-run");
  }
  fail(failures, summary.applyRequested === false, "applyRequested must be false");
  fail(failures, summary.applyPermitted === false, "applyPermitted must be false");
  fail(failures, summary.mutationsPerformed === false, "mutationsPerformed must be false");
  fail(failures, summary.recordsOwnerInputRows === 0, "recordsOwnerInputRows must be 0");
  fail(failures, summary.recordsExtractionInstructionRows === 0, "recordsExtractionInstructionRows must be 0");
  fail(failures, summary.modifiesCandidateRows === 0, "modifiesCandidateRows must be 0");
  fail(failures, summary.rootCopyRows === 0, "rootCopyRows must be 0");
  fail(failures, summary.cleanupAuthorizedRows === 0, "cleanupAuthorizedRows must be 0");
  fail(failures, summary.executableRows === 0, "executableRows must be 0");
  fail(failures, summary.failedRecordingChecks === 0, "failedRecordingChecks must be 0");

  const proposed = recorded.proposedOwnerInputDoNotApply ?? {};
  fail(failures, (proposed.selectedActions ?? []).length === 4, "proposed selectedActions must be 4");
  fail(failures, String(proposed.ownerExecutionText ?? "").split("\n").filter(Boolean).length === 4, "proposed ownerExecutionText must have 4 lines");
  fail(failures, proposed.approvedBy === "<owner>", "proposed approvedBy must remain placeholder");
  fail(failures, proposed.approvedAt === "<ISO-8601>", "proposed approvedAt must remain placeholder");
  fail(failures, proposed.cleanupAuthorized === false, "proposed cleanupAuthorized must be false");
  fail(failures, proposed.executableNow === false, "proposed executableNow must be false");
  fail(failures, proposed.deployAuthorized === false, "proposed deployAuthorized must be false");
  fail(failures, proposed.mergeAuthorized === false, "proposed mergeAuthorized must be false");
  fail(failures, proposed.stageAuthorized === false, "proposed stageAuthorized must be false");
  fail(failures, proposed.destructiveGitAuthorized === false, "proposed destructiveGitAuthorized must be false");
  fail(failures, proposed.physicalLifecycleCleanupAuthorized === false, "proposed physicalLifecycleCleanupAuthorized must be false");
  fail(failures, proposed.boundary?.recordsExtractionInstruction === false, "proposed boundary must not record extraction instruction");
  fail(failures, proposed.boundary?.modifiesCandidate === false, "proposed boundary must not modify candidate");
  fail(failures, proposed.boundary?.copiesRootFiles === false, "proposed boundary must not copy root files");

  for (const expected of expectedRows) {
    const row = (proposed.selectedActions ?? []).find((candidate) => candidate.unitId === expected.unitId);
    fail(failures, Boolean(row), `missing proposed selectedAction row: ${expected.unitId}`);
    if (!row) continue;
    fail(failures, row.selectedAction === expected.selectedAction, `${expected.unitId}: selectedAction mismatch`);
    fail(failures, row.rootSource === expected.rootSource, `${expected.unitId}: rootSource mismatch`);
    fail(failures, row.candidateTarget === expected.candidateTarget, `${expected.unitId}: candidateTarget mismatch`);
    fail(failures, String(proposed.ownerExecutionText ?? "").includes(`unitId=${expected.unitId}`), `${expected.unitId}: ownerExecutionText missing unitId`);
    fail(failures, String(proposed.ownerExecutionText ?? "").includes(`selectedAction=${expected.selectedAction}`), `${expected.unitId}: ownerExecutionText missing selectedAction`);
  }

  for (const checkId of [
    "mode-is-explicit",
    "source-current",
    "landing-runway-ready",
    "four-patch-rows",
    "owner-input-blank-or-already-recorded",
    "owner-approval-text-covers-rows",
    "owner-approval-text-keeps-negative-boundaries",
    "proposed-owner-input-safe-boundary",
    "recording-status-coherent",
    "apply-requires-ready-status"
  ]) {
    fail(failures, checkById(recorded.recordingChecks, checkId)?.status === "pass", `check must pass: ${checkId}`);
  }

  const boundary = recorded.boundary ?? {};
  for (const [key, expected] of Object.entries({
    evidenceOnly: true,
    dryRunOnly: true,
    recordsOwnerInput: false,
    appliesOwnerInputPatch: false,
    recordsExtractionInstruction: false,
    modifiesCandidate: false,
    copiesRootFiles: false,
    runsTypeCheck: false,
    runsBuild: false,
    runsRegression: false,
    selectsReleaseSource: false,
    stageAuthorized: false,
    commitAuthorized: false,
    mergeAuthorized: false,
    cleanupAuthorized: false,
    executableNow: false,
    destructiveGitAuthorized: false,
    deployAuthorized: false,
    physicalLifecycleCleanupAuthorized: false,
    requiresExplicitApplyOwnerInputFlag: true,
    requiresOwnerApprovalTextCoveringAllRows: true,
    requiresOwnerApprovalTextNegativeBoundaries: true,
    requiresSeparateExtractionInstructionRecording: true,
    requiresSeparateCandidateExtractionStep: true
  })) {
    fail(failures, boundary[key] === expected, `boundary.${key} must be ${expected}`);
  }

  for (const text of [
    `Recorder status: \`${recorded.recorderStatus}\``,
    "Apply permitted: false",
    "Records owner-input rows: 0",
    "Records owner input: false",
    "Applies owner input patch: false",
    "Requires explicit apply-owner-input flag: true"
  ]) {
    fail(failures, markdown.includes(text), `markdown missing text: ${text}`);
  }

  finish({ failures, recorded });
}

function finish({ failures, recorded = null }) {
  const payload = {
    generatedAt: new Date().toISOString(),
    gateKind: "a22-root-parity-owner-input-recording-current",
    dirtyMapStatusSignature: recorded?.dirtyMapStatusSignature ?? null,
    expandedStatusEntries: recorded?.expandedStatusEntries ?? null,
    recorderStatus: recorded?.recorderStatus ?? "missing",
    patchRows: recorded?.summary?.patchRows ?? 0,
    recordsOwnerInputRows: recorded?.summary?.recordsOwnerInputRows ?? 0,
    cleanupAuthorizedRows: recorded?.summary?.cleanupAuthorizedRows ?? 0,
    executableRows: recorded?.summary?.executableRows ?? 0,
    failures
  };
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A22 root-parity owner-input recording gate");
    console.log(`Recorder status: ${payload.recorderStatus}`);
    console.log(`Patch rows: ${payload.patchRows}`);
    console.log(`Records owner-input rows: ${payload.recordsOwnerInputRows}`);
    console.log(`Failures: ${failures.length}`);
  }
  if (failures.length > 0) {
    if (!json) {
      console.error("A22 root-parity owner-input recording gate failed.");
      for (const failure of failures) console.error(`- ${failure}`);
    }
    process.exit(1);
  }
}

main();
