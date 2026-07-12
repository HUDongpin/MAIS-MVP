#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  A22_ROOT_PARITY_OWNER_INPUT_LANDING_RUNWAY_PATHS,
  buildA22RootParityOwnerInputLandingRunway,
  stableA22RootParityOwnerInputLandingRunwayProjection
} from "./generate-a22-root-parity-owner-input-landing-runway.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A22-root-parity-owner-input-landing-runway-current-gate.json");
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
    A22_ROOT_PARITY_OWNER_INPUT_LANDING_RUNWAY_PATHS.latestJson,
    A22_ROOT_PARITY_OWNER_INPUT_LANDING_RUNWAY_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const recorded = readJson(A22_ROOT_PARITY_OWNER_INPUT_LANDING_RUNWAY_PATHS.latestJson);
  const current = buildA22RootParityOwnerInputLandingRunway();
  const markdown = readText(A22_ROOT_PARITY_OWNER_INPUT_LANDING_RUNWAY_PATHS.latestMarkdown);

  fail(
    failures,
    sameJson(
      stableA22RootParityOwnerInputLandingRunwayProjection(recorded),
      stableA22RootParityOwnerInputLandingRunwayProjection(current)
    ),
    "A22 root-parity owner-input landing runway is stale"
  );
  fail(failures, recorded.runwayKind === "a22-root-parity-owner-input-landing-runway", "runwayKind is invalid");
  const ownerInputRecorded = recorded.summary?.ownerInputRecorded === true;
  fail(
    failures,
    ["ready-for-owner-input-landing-review", "owner-input-recorded-post-runway"].includes(recorded.runwayStatus),
    "runwayStatus must be ready-for-owner-input-landing-review or owner-input-recorded-post-runway"
  );
  fail(failures, (recorded.sourceCurrentnessFailures ?? []).length === 0, "sourceCurrentnessFailures must be empty");
  fail(failures, recorded.topCandidate?.branch === "codex/A22-us-region-alignment", "topCandidate branch is invalid");
  fail(
    failures,
    recorded.ownerInputFile === "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-extraction-instruction-owner-input.json",
    "ownerInputFile is invalid"
  );

  const patch = recorded.landingPatchPreviewDoNotApply ?? {};
  fail(failures, patch.doNotApply === true, "landing patch preview must be doNotApply");
  fail(failures, patch.inputKind === "a22-root-parity-extraction-instruction-owner-input", "landing patch inputKind is invalid");
  fail(failures, (patch.applyToUnitIds ?? []).length === 4, "landing patch applyToUnitIds must be 4");
  fail(failures, (patch.selectedActions ?? []).length === 4, "landing patch selectedActions must be 4");
  fail(failures, (patch.ownerExecutionTextLines ?? []).length === 4, "landing patch ownerExecutionTextLines must be 4");
  fail(failures, patch.ownerExecutionTextMatchesSelectedActionPreview === true, "owner execution text must match selectedAction preview exact lines");

  for (const expected of expectedRows) {
    const row = (patch.selectedActions ?? []).find((candidate) => candidate.unitId === expected.unitId);
    fail(failures, Boolean(row), `missing selectedAction row: ${expected.unitId}`);
    if (!row) continue;
    fail(failures, row.selectedAction === expected.selectedAction, `${expected.unitId}: selectedAction mismatch`);
    fail(failures, row.rootSource === expected.rootSource, `${expected.unitId}: rootSource mismatch`);
    fail(failures, row.candidateTarget === expected.candidateTarget, `${expected.unitId}: candidateTarget mismatch`);
    fail(failures, (row.allowedActions ?? []).includes(row.selectedAction), `${expected.unitId}: selectedAction must be allowed`);
    const exactLine = (patch.ownerExecutionTextLines ?? []).find((line) => line.includes(`unitId=${expected.unitId}`));
    fail(failures, Boolean(exactLine), `${expected.unitId}: missing exact owner execution text line`);
    if (exactLine) {
      fail(failures, exactLine.includes(`selectedAction=${expected.selectedAction}`), `${expected.unitId}: exact line missing selectedAction`);
      fail(failures, exactLine.includes(`rootSource=${expected.rootSource}`), `${expected.unitId}: exact line missing rootSource`);
      fail(failures, exactLine.includes(`candidateTarget=${expected.candidateTarget}`), `${expected.unitId}: exact line missing candidateTarget`);
      fail(failures, exactLine.includes("No cleanup"), `${expected.unitId}: exact line missing No cleanup`);
      fail(failures, exactLine.includes("No deploy"), `${expected.unitId}: exact line missing No deploy`);
      fail(failures, exactLine.includes("No merge"), `${expected.unitId}: exact line missing No merge`);
      fail(failures, exactLine.includes("No destructive git"), `${expected.unitId}: exact line missing No destructive git`);
      fail(failures, exactLine.includes("No physical lifecycle cleanup"), `${expected.unitId}: exact line missing No physical lifecycle cleanup`);
    }
  }

  const summary = recorded.summary ?? {};
  fail(failures, summary.previewRows === 4, "summary.previewRows must be 4");
  fail(failures, ownerInputRecorded ? summary.pendingRows === 0 : summary.pendingRows === 4, ownerInputRecorded ? "summary.pendingRows must be 0 after owner approval recording" : "summary.pendingRows must be 4 before owner approval recording");
  fail(failures, ownerInputRecorded ? summary.acceptedRows === 4 : summary.acceptedRows === 0, ownerInputRecorded ? "summary.acceptedRows must be 4 after owner approval recording" : "summary.acceptedRows must be 0 before owner approval recording");
  fail(failures, summary.patchRows === 4, "summary.patchRows must be 4");
  if (ownerInputRecorded) {
    fail(failures, summary.ownerInputBlank === false, "owner input must not be blank after owner approval recording");
  } else {
    fail(failures, summary.ownerInputBlank === true, "owner input must remain blank before owner approval recording");
  }
  fail(failures, summary.exactOwnerExecutionTextRows === 4, "exactOwnerExecutionTextRows must be 4");
  fail(failures, summary.postOwnerInputValidationCommands === 8, "postOwnerInputValidationCommands must be 8");
  if (ownerInputRecorded) {
    fail(
      failures,
      ["ready-to-record-extraction-instruction-rows", "already-recorded"].includes(summary.instructionIntakeStatus),
      "instructionIntakeStatus must reflect recorded owner input"
    );
    fail(
      failures,
      ["dry-run-ready-requires-explicit-apply", "already-recorded"].includes(summary.instructionRecordingStatus),
      "instructionRecordingStatus must reflect recorded owner input"
    );
    fail(
      failures,
      ["dry-run-blocked-missing-recorded-instructions", "dry-run-ready-requires-explicit-apply", "already-extracted-and-verified"].includes(summary.guardedExtractionStatus),
      "guardedExtractionStatus must remain non-mutating and coherent after owner input"
    );
  } else {
    fail(failures, summary.instructionIntakeStatus === "waiting-for-owner-input", "instructionIntakeStatus must wait for owner input");
    fail(failures, summary.instructionRecordingStatus === "dry-run-blocked-owner-input", "instructionRecordingStatus must be dry-run-blocked-owner-input");
    fail(failures, summary.guardedExtractionStatus === "dry-run-blocked-missing-recorded-instructions", "guardedExtractionStatus must block missing instructions");
  }
  const postExtractionVerified = summary.guardedExtractionStatus === "already-extracted-and-verified";
  if (postExtractionVerified) {
    fail(failures, summary.candidateTargetsMissing === 0, "candidateTargetsMissing must be 0 after post-extraction verification");
    fail(failures, summary.candidateTargetsVerified === 4, "candidateTargetsVerified must be 4 after post-extraction verification");
  } else {
    fail(failures, summary.candidateTargetsMissing === 4, "candidateTargetsMissing must be 4 before extraction");
  }
  fail(failures, summary.rootCopyRows === 0, "rootCopyRows must be 0");
  fail(failures, summary.candidateMutationRows === 0, "candidateMutationRows must be 0");
  fail(failures, summary.cleanupAuthorizedRows === 0, "cleanupAuthorizedRows must be 0");
  fail(failures, summary.executableRows === 0, "executableRows must be 0");
  fail(failures, summary.failedChecks === 0, "failedChecks must be 0");

  for (const command of [
    "node coordination/release-intake/generate-a22-top-clean-candidate-root-parity-extraction-instruction-intake.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-extraction-instruction-intake-current.mjs",
    "node coordination/release-intake/run-a22-top-clean-candidate-root-parity-extraction-instruction-recording.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-extraction-instruction-recording-current.mjs",
    "node coordination/release-intake/run-a22-top-clean-candidate-root-parity-guarded-extraction.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-guarded-extraction-current.mjs",
    "node coordination/release-intake/assert-a22-clean-source-validation-queue-current.mjs",
    "node coordination/release-intake/assert-validate-frontier-owner-input-request-capsule-current.mjs"
  ]) {
    fail(failures, (recorded.postOwnerInputValidationCommands ?? []).includes(command), `missing post-owner-input validation command: ${command}`);
  }

  for (const checkId of [
    "source-current",
    "dirty-map-current",
    "selected-action-preview-current",
    "owner-input-still-blank",
    "patch-preview-do-not-apply",
    "patch-rows-match-selected-action-preview",
    "exact-owner-execution-text-lines-match",
    "post-owner-input-chain-still-blocked",
    "candidate-targets-missing-before-extraction",
    "no-unauthorized-side-effects"
  ]) {
    fail(failures, checkById(recorded.checks, checkId)?.status === "pass", `check must pass: ${checkId}`);
  }

  const boundary = recorded.boundary ?? {};
  for (const [key, expected] of Object.entries({
    evidenceOnly: true,
    runwayOnly: true,
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
    requiresExplicitOwnerApprovalBeforeOwnerInputRecording: true,
    requiresSeparateRecordingApply: true,
    requiresSeparateGuardedExtractionApply: true
  })) {
    fail(failures, boundary[key] === expected, `boundary.${key} must be ${expected}`);
  }

  const expectedTargetText = postExtractionVerified
    ? "Candidate targets verified: 4/4"
    : "Candidate targets missing: 4/4";
  for (const text of [
    `Runway status: \`${recorded.runwayStatus}\``,
    "Owner input file: `coordination/release-intake/latest-A22-top-clean-candidate-root-parity-extraction-instruction-owner-input.json`",
    expectedTargetText,
    "Records owner input: false",
    "Applies owner input patch: false",
    "Requires explicit owner approval before owner-input recording: true"
  ]) {
    fail(failures, markdown.includes(text), `markdown missing text: ${text}`);
  }

  finish({
    failures,
    recorded
  });
}

function finish({ failures, recorded = null }) {
  const payload = {
    generatedAt: new Date().toISOString(),
    gateKind: "a22-root-parity-owner-input-landing-runway-current",
    dirtyMapStatusSignature: recorded?.dirtyMapStatusSignature ?? null,
    expandedStatusEntries: recorded?.expandedStatusEntries ?? null,
    runwayStatus: recorded?.runwayStatus ?? "missing",
    patchRows: recorded?.summary?.patchRows ?? 0,
    postOwnerInputValidationCommands: recorded?.summary?.postOwnerInputValidationCommands ?? 0,
    failures
  };
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A22 root-parity owner-input landing runway gate");
    console.log(`Runway status: ${payload.runwayStatus}`);
    console.log(`Patch rows: ${payload.patchRows}`);
    console.log(`Post-owner-input validation commands: ${payload.postOwnerInputValidationCommands}`);
    console.log(`Failures: ${failures.length}`);
  }
  if (failures.length > 0) {
    if (!json) {
      console.error("A22 root-parity owner-input landing runway gate failed.");
      for (const failure of failures) console.error(`- ${failure}`);
    }
    process.exit(1);
  }
}

main();
