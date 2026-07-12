#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_PACKET_PATHS,
  buildA22RootParityOwnerActionPacket,
  stableA22RootParityOwnerActionPacketProjection
} from "./generate-a22-top-clean-candidate-root-parity-owner-action-packet.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A22-top-clean-candidate-root-parity-owner-action-packet-current-gate.json");
const json = process.argv.includes("--json");

const allowedFocusStatuses = [
  "waiting-for-owner-action",
  "ready-for-extraction-instruction-recording",
  "ready-for-guarded-extraction",
  "post-extraction-verified",
  "not-ready-check-failures"
];

function git(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function recommendedActionForUnit(unitId) {
  return unitId === "a06-visualization-back-to-top-import-parity" ? "reexport" : "same-path-copy";
}

function main() {
  const failures = [];
  for (const requiredPath of [
    TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_PACKET_PATHS.dirtyMap,
    TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_PACKET_PATHS.instructionRequest,
    TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_PACKET_PATHS.instructionRequestGate,
    TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_PACKET_PATHS.instructionIntake,
    TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_PACKET_PATHS.instructionIntakeGate,
    TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_PACKET_PATHS.ownerInput,
    TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_PACKET_PATHS.instructionRecordingDryRun,
    TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_PACKET_PATHS.instructionRecordingGate,
    TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_PACKET_PATHS.guardedExtractionDryRun,
    TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_PACKET_PATHS.guardedExtractionGate,
    TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_PACKET_PATHS.latestJson,
    TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_PACKET_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const dirtyMap = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_PACKET_PATHS.dirtyMap);
  const recorded = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_PACKET_PATHS.latestJson);
  const current = buildA22RootParityOwnerActionPacket();
  if (!sameJson(
    stableA22RootParityOwnerActionPacketProjection(recorded),
    stableA22RootParityOwnerActionPacketProjection(current)
  )) {
    failures.push("A22 root-parity owner action packet is stale");
  }

  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  const summary = recorded.summary ?? {};
  const boundary = recorded.boundary ?? {};
  const rows = recorded.ownerActionRows ?? [];
  const patchPreview = recorded.ownerInputPatchPreviewDoNotApply ?? {};
  const patchRows = patchPreview.selectedActions ?? [];
  const checks = recorded.checks ?? [];

  if (recorded.dirtyMapStatusSignature !== expectedSignature) failures.push("packet dirty-map signature is stale");
  if (recorded.expandedStatusEntries !== expectedEntries) failures.push("packet expanded dirty entry count is stale");
  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures must be empty");
  if (recorded.focusKind !== "a22-root-parity-owner-action-packet") failures.push("focusKind is invalid");
  if (!allowedFocusStatuses.includes(recorded.focusStatus)) failures.push(`focusStatus is unsupported: ${recorded.focusStatus ?? "missing"}`);
  if ((summary.focusRows ?? -1) !== 4) failures.push("summary.focusRows must be 4");
  if ((summary.recommendedActionRows ?? -1) !== 4) failures.push("summary.recommendedActionRows must be 4");
  if ((summary.checks ?? -1) !== checks.length) failures.push("summary.checks must match checks length");
  if ((summary.failedChecks ?? -1) !== checks.filter((row) => row.status === "fail").length) failures.push("summary.failedChecks must match failed checks");
  if ((summary.passingChecks ?? -1) !== checks.filter((row) => row.status === "pass").length) failures.push("summary.passingChecks must match passing checks");
  if ((summary.recordedInstructionRows ?? -1) !== 0) failures.push("summary.recordedInstructionRows must be 0 before owner recording");
  if ((summary.rootCopyRows ?? -1) !== 0) failures.push("summary.rootCopyRows must be 0");
  if ((summary.candidateMutationRows ?? -1) !== 0) failures.push("summary.candidateMutationRows must be 0");
  if ((summary.cleanupAuthorizedRows ?? -1) !== 0) failures.push("summary.cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? -1) !== 0) failures.push("summary.executableRows must be 0");

  if (rows.length !== 4) failures.push("ownerActionRows must contain 4 rows");
  for (const row of rows) {
    const expectedAction = recommendedActionForUnit(row.unitId);
    if (row.recommendedSelectedAction !== expectedAction) {
      failures.push(`${row.unitId ?? "unknown"}: recommendedSelectedAction must be ${expectedAction}`);
    }
    if (!(row.allowedActions ?? []).includes(row.recommendedSelectedAction)) {
      failures.push(`${row.unitId ?? "unknown"}: recommended action must be allowed`);
    }
    if (row.cleanupAuthorized !== false) failures.push(`${row.unitId ?? "unknown"}: cleanupAuthorized must be false`);
    if (row.executableNow !== false) failures.push(`${row.unitId ?? "unknown"}: executableNow must be false`);
    if (row.deployAuthorized !== false) failures.push(`${row.unitId ?? "unknown"}: deployAuthorized must be false`);
    if (row.mergeAuthorized !== false) failures.push(`${row.unitId ?? "unknown"}: mergeAuthorized must be false`);
    if (row.stageAuthorized !== false) failures.push(`${row.unitId ?? "unknown"}: stageAuthorized must be false`);
    if (row.destructiveGitAuthorized !== false) failures.push(`${row.unitId ?? "unknown"}: destructiveGitAuthorized must be false`);
    if (row.physicalLifecycleCleanupAuthorized !== false) failures.push(`${row.unitId ?? "unknown"}: physicalLifecycleCleanupAuthorized must be false`);
    for (const needle of [
      `unitId=${row.unitId}`,
      `selectedAction=${row.recommendedSelectedAction}`,
      `targetWorktree=${row.topCandidate?.path ?? ""}`,
      `rootSource=${row.rootSource?.path ?? ""}`,
      `candidateTarget=${row.candidateTargetPath}`,
      "No cleanup",
      "No deploy",
      "No merge",
      "No broad staging",
      "No destructive git",
      "No physical lifecycle cleanup"
    ]) {
      if (!row.copyableOwnerExecutionText?.includes(needle)) {
        failures.push(`${row.unitId ?? "unknown"}: copyable text missing ${needle}`);
      }
      if (!recorded.ownerExecutionTextRequired?.includes(needle)) {
        failures.push(`ownerExecutionTextRequired missing ${needle}`);
      }
    }
  }

  if (patchPreview.doNotApply !== true) failures.push("patch preview must say doNotApply true");
  if (patchRows.length !== 4) failures.push("patch preview selectedActions must contain 4 rows");
  for (const patchRow of patchRows) {
    const expectedAction = recommendedActionForUnit(patchRow.unitId);
    if (patchRow.selectedAction !== expectedAction) {
      failures.push(`${patchRow.unitId ?? "unknown"}: patch preview selectedAction must be ${expectedAction}`);
    }
    if (!(patchRow.allowedActions ?? []).includes(patchRow.selectedAction)) {
      failures.push(`${patchRow.unitId ?? "unknown"}: patch preview selectedAction must be allowed`);
    }
  }

  for (const field of ["ownerExecutionText", "selectedActions", "approvedBy", "approvedAt", "notes"]) {
    if (!(recorded.requiredOwnerReplyFields ?? []).includes(field)) {
      failures.push(`requiredOwnerReplyFields missing ${field}`);
    }
  }
  if (!nonEmptyString(patchPreview.ownerExecutionText)) failures.push("patch preview ownerExecutionText must be non-empty");
  if (patchPreview.approvedBy !== "<owner>") failures.push("patch preview approvedBy must remain placeholder");
  if (patchPreview.approvedAt !== "<ISO-8601>") failures.push("patch preview approvedAt must remain placeholder");

  for (const requiredCheck of [
    "source-current",
    "source-gates-passing",
    "instruction-request-ready",
    "owner-action-rows-complete",
    "owner-input-shape-current",
    "owner-input-patch-preview-only",
    "instruction-intake-lifecycle-safe",
    "instruction-recording-lifecycle-safe",
    "guarded-extraction-lifecycle-safe",
    "no-executable-boundary"
  ]) {
    if (!checks.some((row) => row.id === requiredCheck)) failures.push(`missing check: ${requiredCheck}`);
  }
  if (checks.some((row) => row.status === "fail")) failures.push("owner action packet checks must not fail");

  for (const [key, expected] of [
    ["evidenceOnly", true],
    ["focusPacketOnly", true],
    ["recordsOwnerInput", false],
    ["recordsOwnerApproval", false],
    ["recordsExtractionInstruction", false],
    ["modifiesCandidate", false],
    ["copiesRootFiles", false],
    ["writesRootSourceFiles", false],
    ["runsTypeCheck", false],
    ["runsBuild", false],
    ["runsRegression", false],
    ["stageAuthorized", false],
    ["commitAuthorized", false],
    ["mergeAuthorized", false],
    ["cleanupAuthorized", false],
    ["executableNow", false],
    ["destructiveGitAuthorized", false],
    ["deployAuthorized", false],
    ["physicalLifecycleCleanupAuthorized", false],
    ["requiresOwnerReply", true],
    ["requiresSeparateRecordingStep", true],
    ["requiresSeparateCandidateMutationInstruction", true]
  ]) {
    if (boundary[key] !== expected) failures.push(`boundary.${key} must be ${expected}`);
  }

  const patchBoundary = patchPreview.boundary ?? {};
  if (patchBoundary.recordsOwnerInput !== false) failures.push("patch boundary must not record owner input");
  if (patchBoundary.recordsExtractionInstruction !== false) failures.push("patch boundary must not record extraction instruction");
  if (patchBoundary.modifiesCandidate !== false) failures.push("patch boundary must not modify candidate");
  if (patchBoundary.copiesRootFiles !== false) failures.push("patch boundary must not copy root files");

  const markdown = readText(TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_PACKET_PATHS.latestMarkdown);
  for (const needle of [
    "A22 Root-Parity Owner Action Packet",
    "evidence-only",
    "Owner Action Rows",
    "Owner Execution Text Required",
    "Owner Input Patch Preview Do Not Apply",
    "Records owner input: false",
    "Records extraction instruction: false",
    "Modifies candidate: false",
    "Copies root files: false",
    "Deploy authorized: false",
    "Physical lifecycle cleanup authorized: false"
  ]) {
    if (!markdown.includes(needle)) failures.push(`owner action packet markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("owner action packet markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    focusStatus: recorded.focusStatus,
    focusRows: summary.focusRows ?? 0,
    ownerInputBlank: summary.ownerInputBlank === true,
    recordedInstructionRows: summary.recordedInstructionRows ?? 0,
    rootCopyRows: summary.rootCopyRows ?? 0,
    candidateMutationRows: summary.candidateMutationRows ?? 0,
    cleanupAuthorizedRows: summary.cleanupAuthorizedRows ?? 0,
    executableRows: summary.executableRows ?? 0,
    failures
  });
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A22 root-parity owner action packet gate");
    console.log(`Focus status: ${payload.focusStatus ?? "unknown"}`);
    console.log(`Focus rows: ${payload.focusRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }

  if (payload.failures.length > 0) {
    console.error("A22 root-parity owner action packet gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
