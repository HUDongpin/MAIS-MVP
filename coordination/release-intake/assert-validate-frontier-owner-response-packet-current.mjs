#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  VALIDATE_FRONTIER_OWNER_RESPONSE_PACKET_PATHS,
  buildValidateFrontierOwnerResponsePacket,
  stableValidateFrontierOwnerResponsePacketProjection
} from "./generate-validate-frontier-owner-response-packet.mjs";
import { REQUIRED_OWNER_CONFIRMATION_TEXT_ZH } from "./generate-validation-hold-release-confirmation-scaffold.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-validate-frontier-owner-response-packet-current-gate.json");
const json = process.argv.includes("--json");

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

function blockById(blocks, id) {
  return (blocks ?? []).find((block) => block.id === id) ?? null;
}

function allFalse(block, fields) {
  return fields.every((field) => block?.[field] === false);
}

function main() {
  const failures = [];
  for (const requiredPath of [
    VALIDATE_FRONTIER_OWNER_RESPONSE_PACKET_PATHS.dirtyMap,
    VALIDATE_FRONTIER_OWNER_RESPONSE_PACKET_PATHS.validateFrontierCapsule,
    VALIDATE_FRONTIER_OWNER_RESPONSE_PACKET_PATHS.validateFrontierPostInputRunway,
    VALIDATE_FRONTIER_OWNER_RESPONSE_PACKET_PATHS.validateToMergeExitCriteria,
    VALIDATE_FRONTIER_OWNER_RESPONSE_PACKET_PATHS.canonicalPreview,
    VALIDATE_FRONTIER_OWNER_RESPONSE_PACKET_PATHS.a22SelectedActionCanonicalPreview,
    VALIDATE_FRONTIER_OWNER_RESPONSE_PACKET_PATHS.a22OwnerInputLandingRunway,
    VALIDATE_FRONTIER_OWNER_RESPONSE_PACKET_PATHS.validationHoldScaffold,
    VALIDATE_FRONTIER_OWNER_RESPONSE_PACKET_PATHS.validationHoldRecordingDryRun,
    VALIDATE_FRONTIER_OWNER_RESPONSE_PACKET_PATHS.latestJson,
    VALIDATE_FRONTIER_OWNER_RESPONSE_PACKET_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const dirtyMap = readJson(VALIDATE_FRONTIER_OWNER_RESPONSE_PACKET_PATHS.dirtyMap);
  const recorded = readJson(VALIDATE_FRONTIER_OWNER_RESPONSE_PACKET_PATHS.latestJson);
  const current = buildValidateFrontierOwnerResponsePacket();
  const markdown = readText(VALIDATE_FRONTIER_OWNER_RESPONSE_PACKET_PATHS.latestMarkdown);
  if (!sameJson(
    stableValidateFrontierOwnerResponsePacketProjection(recorded),
    stableValidateFrontierOwnerResponsePacketProjection(current)
  )) {
    failures.push("A25/A22 validate-frontier owner response packet is stale");
  }

  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  const summary = recorded.summary ?? {};
  const boundary = recorded.boundary ?? {};
  const blocks = recorded.ownerResponseBlocks ?? [];
  const a25Block = blockById(blocks, "a25-owner-package-canonical-authorization-focus-batch");
  const a22Block = blockById(blocks, "a22-root-parity-selected-actions");
  const holdBlock = blockById(blocks, "validation-hold-release-confirmation");
  const checks = recorded.checks ?? [];
  const a25FocusConsumed = a25Block?.status === "no-pending-focus-rows" && a25Block?.pendingRows === 0;
  const a25FocusWaiting = a25Block?.status === "ready-for-owner-review" && a25Block?.pendingRows > 0;
  const a22SelectedActionsRecorded = a22Block?.previewStatus === "owner-approved-waiting-candidate-mutation" &&
    a22Block?.pendingRows === 0 &&
    a22Block?.acceptedRows === 4 &&
    a22Block?.ownerInputBlank === false;
  const a22SelectedActionsPostExtractionVerified = a22Block?.previewStatus === "owner-approved-post-extraction-verified-check-remediation" &&
    a22Block?.pendingRows === 0 &&
    a22Block?.acceptedRows === 4 &&
    a22Block?.ownerInputBlank === false &&
    a22Block?.candidateTargetsMissing === 0 &&
    a22Block?.candidateTargetsVerified === 4;
  const a22SelectedActionsWaiting = a22Block?.previewStatus === "ready-for-owner-review" &&
    a22Block?.pendingRows === 4 &&
    a22Block?.acceptedRows === 0 &&
    a22Block?.ownerInputBlank === true;
  const ownerResponseConsumed = summary.frontierOwnerRows === 0 &&
    summary.a25FocusRows === 0 &&
    a25FocusConsumed &&
    (a22SelectedActionsRecorded || a22SelectedActionsPostExtractionVerified);
  const expectedPacketStatus = ownerResponseConsumed
    ? a22SelectedActionsPostExtractionVerified
      ? "owner-response-consumed-waiting-a22-typecheck-build-remediation"
      : "owner-response-consumed-waiting-candidate-mutation-input"
    : "waiting-for-owner-response";
  const holdConfirmationMissing = holdBlock?.status === "waiting-for-owner-compose-deletion-confirmation" &&
    holdBlock?.recorderStatus === "dry-run-blocked-owner-confirmation-input" &&
    holdBlock?.ownerConfirmationInputPresent === false &&
    holdBlock?.ownerConfirmationAccepted === false;
  const holdConfirmationRecorded = holdBlock?.status === "owner-confirmation-recorded-awaiting-separate-release-gate" &&
    ["dry-run-ready-requires-explicit-apply", "already-recorded"].includes(holdBlock?.recorderStatus) &&
    holdBlock?.ownerConfirmationInputPresent === true &&
    holdBlock?.ownerConfirmationAccepted === true &&
    holdBlock?.validationHoldReleased === false;

  if (recorded.packetKind !== "a25-a22-validate-frontier-owner-response-packet") failures.push("packetKind is invalid");
  if (recorded.packetStatus !== expectedPacketStatus) failures.push("packetStatus must match current owner-response phase");
  if (recorded.dirtyMapStatusSignature !== expectedSignature) failures.push("packet dirty-map signature is stale");
  if (recorded.expandedStatusEntries !== expectedEntries) failures.push("packet expanded dirty entry count is stale");
  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures must be empty");

  if (summary.responseBlocks !== 3) failures.push("summary.responseBlocks must be 3");
  if (summary.frontierOwnerRows !== current.summary?.frontierOwnerRows) failures.push("summary.frontierOwnerRows must match current sources");
  if (summary.a25FocusRows !== current.summary?.a25FocusRows) failures.push("summary.a25FocusRows must match current sources");
  if (summary.a22SelectedActionRows !== 4) failures.push("summary.a22SelectedActionRows must be 4");
  if (summary.validationHoldConfirmationRows !== 1) failures.push("summary.validationHoldConfirmationRows must be 1");
  if (summary.currentPendingCanonicalAuthorizationRows !== current.summary?.currentPendingCanonicalAuthorizationRows) failures.push("summary.currentPendingCanonicalAuthorizationRows must match current sources");
  if (summary.projectedPendingCanonicalAuthorizationRows !== current.summary?.projectedPendingCanonicalAuthorizationRows) failures.push("summary.projectedPendingCanonicalAuthorizationRows must match current sources");
  if (summary.validateExitReady !== false) failures.push("summary.validateExitReady must be false");
  if (summary.readyForMerge !== false) failures.push("summary.readyForMerge must be false");
  if (summary.releaseSourceEligibleNow !== false) failures.push("summary.releaseSourceEligibleNow must be false");
  if (summary.cleanupAuthorizedRows !== 0) failures.push("summary.cleanupAuthorizedRows must be 0");
  if (summary.executableRows !== 0) failures.push("summary.executableRows must be 0");
  if (summary.failedChecks !== 0) failures.push("summary.failedChecks must be 0");
  if (summary.passingChecks !== checks.length) failures.push("summary.passingChecks must match checks");

  if (!a25Block) failures.push("missing A25 owner-package response block");
  if (a25Block && !a25FocusConsumed && !a25FocusWaiting) failures.push("A25 block must be ready-for-owner-review with pending rows or no-pending-focus-rows with 0 rows");
  if (a25Block && a25Block.acceptedRows !== 0) failures.push("A25 block acceptedRows must be 0");
  if (a25FocusWaiting && a25Block && (a25Block.approvalIds ?? []).length !== a25Block.pendingRows) {
    failures.push("A25 block approvalIds must match current focus batch length");
  }
  if (a25FocusWaiting && a25Block && !String(a25Block.copyableOwnerReplyTextZh ?? "").includes("selectedFinalState=reviewed commit")) {
    failures.push("A25 block must include reviewed commit owner reply text");
  }
  if (a25FocusWaiting && a25Block && !String(a25Block.copyableOwnerReplyTextZh ?? "").includes("不授权 cleanup")) {
    failures.push("A25 block must keep no-cleanup boundary");
  }

  if (!a22Block) failures.push("missing A22 root-parity response block");
  if (a22Block && !["ready-for-owner-input-landing-review", "owner-input-recorded-post-runway"].includes(a22Block.status)) {
    failures.push("A22 block status is invalid");
  }
  if (a22Block && !a22SelectedActionsWaiting && !a22SelectedActionsRecorded && !a22SelectedActionsPostExtractionVerified) failures.push("A22 block must be waiting for selectedAction owner input, recorded waiting candidate mutation, or post-extraction verified");
  if (a22Block && a22Block.topCandidateBranch !== "codex/A22-us-region-alignment") failures.push("A22 block topCandidateBranch must match current top candidate");
  if (a22Block && (a22Block.approvalIds ?? []).length !== 4) failures.push("A22 block must include 4 approvalIds");
  if (a22Block && (a22SelectedActionsWaiting ? a22Block.pendingRows !== 4 : a22Block.pendingRows !== 0)) failures.push(a22SelectedActionsWaiting ? "A22 block pendingRows must be 4" : "A22 block pendingRows must be 0 after selectedAction owner input is recorded");
  if (a22Block && (a22SelectedActionsWaiting ? a22Block.acceptedRows !== 0 : a22Block.acceptedRows !== 4)) failures.push(a22SelectedActionsWaiting ? "A22 block acceptedRows must be 0" : "A22 block acceptedRows must be 4 after selectedAction owner input is recorded");
  if (a22Block && a22Block.patchRows !== 4) failures.push("A22 block patchRows must be 4");
  if (a22Block && (a22SelectedActionsWaiting ? a22Block.ownerInputBlank !== true : a22Block.ownerInputBlank !== false)) failures.push(a22SelectedActionsWaiting ? "A22 block ownerInputBlank must be true" : "A22 block ownerInputBlank must be false after selectedAction owner input is recorded");
  if (a22Block && a22SelectedActionsPostExtractionVerified) {
    if (a22Block.candidateTargetsMissing !== 0) failures.push("A22 block candidateTargetsMissing must be 0 after post-extraction verification");
    if (a22Block.candidateTargetsVerified !== 4) failures.push("A22 block candidateTargetsVerified must be 4 after post-extraction verification");
  } else if (a22Block && a22Block.candidateTargetsMissing !== 4) {
    failures.push("A22 block candidateTargetsMissing must be 4 before extraction");
  }
  if (a22Block && (a22Block.exactOwnerExecutionTextLines ?? []).length !== 4) {
    failures.push("A22 block must include 4 exact owner execution text lines");
  }
  if (a22Block && !String(a22Block.copyableOwnerReplyTextZh ?? "").includes("不授权 destructive git")) {
    failures.push("A22 block must keep no destructive-git boundary");
  }
  if (a22Block && !String(a22Block.exactOwnerExecutionTextLines?.[0] ?? "").includes("selectedAction=reexport")) {
    failures.push("A22 block first exact owner execution text must preserve selectedAction=reexport");
  }

  if (!holdBlock) failures.push("missing validation hold response block");
  if (holdBlock && !holdConfirmationMissing && !holdConfirmationRecorded) {
    failures.push("hold block must either wait for confirmation or record confirmation while keeping release gated");
  }
  if (holdBlock && holdBlock.requiredConfirmationTextZh !== REQUIRED_OWNER_CONFIRMATION_TEXT_ZH) {
    failures.push("hold block required confirmation text must match the canonical text");
  }
  if (holdBlock && holdBlock.ownerConfirmationTemplate?.scope !== "validation-hold-release-review-only") {
    failures.push("hold block ownerConfirmationTemplate scope must be validation-hold-release-review-only");
  }
  if (holdBlock && holdBlock.validationHoldReleased !== false) failures.push("hold block validationHoldReleased must be false");

  for (const block of [a25Block, a22Block, holdBlock].filter(Boolean)) {
    if (!allFalse(block, [
      "cleanupAuthorized",
      "deployAuthorized",
      "mergeAuthorized",
      "destructiveGitAuthorized",
      "physicalLifecycleCleanupAuthorized",
      "executableNow"
    ])) {
      failures.push(`${block.id} must keep all execution/cleanup/deploy/merge/destructive flags false`);
    }
  }
  if (boundary.evidenceOnly !== true) failures.push("boundary.evidenceOnly must be true");
  for (const [key, expected] of [
    ["recordsOwnerInputRows", 0],
    ["recordsAuthorizationRows", 0],
    ["recordsExtractionInstructionRows", 0],
    ["modifiesCandidateRows", 0],
    ["rootCopyRows", 0],
    ["validationHoldReleased", false],
    ["cleanupAuthorized", false],
    ["deployAuthorized", false],
    ["mergeAuthorized", false],
    ["broadStagingAuthorized", false],
    ["destructiveGitAuthorized", false],
    ["physicalLifecycleCleanupAuthorized", false],
    ["executableNow", false]
  ]) {
    if (boundary[key] !== expected) failures.push(`boundary.${key} must be ${expected}`);
  }

  for (const requiredCheck of [
    "sources-current",
    "a25-response-ready",
    "a22-response-ready",
    "validation-hold-confirmation-ready",
    "frontier-state-still-blocked",
    "non-executable-boundary"
  ]) {
    const row = checks.find((check) => check.id === requiredCheck);
    if (!row) failures.push(`missing check: ${requiredCheck}`);
    if (row && row.status !== "pass") failures.push(`check must pass: ${requiredCheck}`);
  }
  for (const requiredCommand of [
    "npm run release:dirty-map -- --assert-current --max-age-minutes 60",
    "node coordination/release-intake/run-next-owner-authorization-focus-batch-canonical-recording.mjs",
    "node coordination/release-intake/run-a22-root-parity-owner-input-recording.mjs",
    "node coordination/release-intake/run-validation-hold-release-confirmation-recording.mjs",
    "node coordination/release-intake/assert-validate-frontier-owner-input-request-capsule-current.mjs",
    "node coordination/release-intake/assert-validate-to-merge-exit-criteria-current.mjs",
    "node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs"
  ]) {
    if (!(recorded.safePostOwnerResponseValidationCommands ?? []).includes(requiredCommand)) {
      failures.push(`missing safe post-owner-response validation command: ${requiredCommand}`);
    }
  }

  if (!markdown.includes("# A25/A22 Validate Frontier Owner Response Packet")) failures.push("markdown missing title");
  if (a25FocusWaiting && (!markdown.includes(`我授权当前 ${a25Block.pendingRows} 条 owner-package canonical authorization preview`) || !markdown.includes("不授权 cleanup"))) {
    failures.push("markdown missing A25 copyable owner reply text");
  }
  if (!markdown.includes("我授权当前 4 条 A22 root-parity selectedAction canonical preview")) failures.push("markdown missing A22 copyable owner reply text");
  if (!markdown.includes(REQUIRED_OWNER_CONFIRMATION_TEXT_ZH)) failures.push("markdown missing validation hold confirmation text");
  if (!markdown.includes("This packet is evidence-only")) failures.push("markdown missing evidence-only boundary");
  if (markdown.includes("undefined")) failures.push("markdown contains undefined");

  return finish({
    failures,
    packetStatus: recorded.packetStatus,
    responseBlocks: summary.responseBlocks ?? 0,
    frontierOwnerRows: summary.frontierOwnerRows ?? 0,
    cleanupAuthorizedRows: summary.cleanupAuthorizedRows ?? 0,
    executableRows: summary.executableRows ?? 0
  });
}

function finish(payload) {
  const output = {
    checkedAt: new Date().toISOString(),
    ...payload,
    passed: payload.failures.length === 0
  };
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log("A25/A22 validate-frontier owner response packet gate");
    console.log(`Packet status: ${payload.packetStatus ?? "missing"}`);
    console.log(`Response blocks: ${payload.responseBlocks ?? 0}`);
    console.log(`Frontier owner rows: ${payload.frontierOwnerRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    if (!json) {
      console.error("A25/A22 validate-frontier owner response packet gate failed.");
      for (const failure of payload.failures) console.error(`- ${failure}`);
    }
    process.exit(1);
  }
}

main();
