#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { REQUIRED_OWNER_CONFIRMATION_TEXT_ZH } from "./generate-validation-hold-release-confirmation-scaffold.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const VALIDATE_FRONTIER_OWNER_RESPONSE_PACKET_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  validateFrontierCapsule: "coordination/release-intake/latest-A25-validate-frontier-owner-input-request-capsule.json",
  validateFrontierPostInputRunway: "coordination/release-intake/latest-A25-validate-frontier-post-input-runway.json",
  validateToMergeExitCriteria: "coordination/release-intake/latest-A25-validate-to-merge-exit-criteria.json",
  canonicalPreview: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch-canonical-preview.json",
  a22SelectedActionCanonicalPreview: "coordination/release-intake/latest-A22-root-parity-selected-action-canonical-preview.json",
  a22OwnerInputLandingRunway: "coordination/release-intake/latest-A22-root-parity-owner-input-landing-runway.json",
  validationHoldScaffold: "coordination/release-intake/latest-A25-validation-hold-release-confirmation-scaffold.json",
  validationHoldRecordingDryRun: "coordination/release-intake/latest-A25-validation-hold-release-confirmation-recording-dry-run.json",
  latestJson: "coordination/release-intake/latest-A25-validate-frontier-owner-response-packet.json",
  latestMarkdown: "coordination/release-intake/latest-A25-validate-frontier-owner-response-packet.md",
  datedJson: `coordination/release-intake/${date}-A25-validate-frontier-owner-response-packet.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-validate-frontier-owner-response-packet.md`
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

function count(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function dirtyMapEntryCount(dirtyMap) {
  return dirtyMap.statusCounts?.expandedStatusEntries ?? (dirtyMap.entries ?? []).length;
}

function dirtyMapSignature(payload) {
  return payload.statusSignature ??
    payload.dirtyMapStatusSignature ??
    payload.dirtyMap?.statusSignature ??
    payload.baseline?.dirtyMapStatusSignature ??
    null;
}

function expandedEntries(payload) {
  return payload.expandedStatusEntries ??
    payload.statusCounts?.expandedStatusEntries ??
    payload.dirtyMap?.expandedStatusEntries ??
    payload.dirtyMapExpandedEntries ??
    payload.summary?.dirtyMapExpandedEntries ??
    payload.baseline?.expandedStatusEntries ??
    null;
}

function artifactStamp(key, relativePath, payload) {
  return {
    key,
    path: relativePath,
    generatedAt: payload.generatedAt ?? payload.checkedAt ?? null,
    dirtyMapStatusSignature: dirtyMapSignature(payload),
    expandedStatusEntries: expandedEntries(payload)
  };
}

function sourceCurrentnessFailures({ dirtyMap, artifacts }) {
  const expectedSignature = dirtyMap.statusSignature ?? null;
  const expectedEntries = dirtyMapEntryCount(dirtyMap);
  return Object.entries(artifacts)
    .filter(([key]) => key !== "dirtyMap")
    .map(([key, payload]) => artifactStamp(key, VALIDATE_FRONTIER_OWNER_RESPONSE_PACKET_PATHS[key], payload))
    .filter((stamp) => stamp.dirtyMapStatusSignature || stamp.expandedStatusEntries !== null)
    .filter((stamp) => {
      const signatureOk = !stamp.dirtyMapStatusSignature || stamp.dirtyMapStatusSignature === expectedSignature;
      const entriesOk = stamp.expandedStatusEntries === null || stamp.expandedStatusEntries === expectedEntries;
      return !signatureOk || !entriesOk;
    })
    .map((stamp) => `${stamp.key} is stale relative to latest dirty map`);
}

function stableSourceArtifacts(sourceArtifacts) {
  return Object.fromEntries(Object.entries(sourceArtifacts ?? {}).map(([key, stamp]) => [key, {
    key: stamp.key,
    path: stamp.path,
    dirtyMapStatusSignature: stamp.dirtyMapStatusSignature,
    expandedStatusEntries: stamp.expandedStatusEntries
  }]));
}

function pickA25Block({ canonicalPreview, validateFrontierCapsule }) {
  const request = canonicalPreview.batchAuthorizationRequest ?? {};
  const capsuleGroup = (validateFrontierCapsule.ownerInputGroups ?? [])
    .find((group) => group.id === "owner-package-canonical-authorization-focus-batch") ?? {};
  const approvalIds = request.approvalIds ?? capsuleGroup.approvalIds ?? [];
  return {
    id: "a25-owner-package-canonical-authorization-focus-batch",
    owner: "A25 git hygiene and release intake",
    requestKind: "owner-package-canonical-authorization",
    targetFile: canonicalPreview.canonicalTarget ?? capsuleGroup.targetFile ?? "coordination/release-intake/latest-A25-next-owner-authorizations.json",
    status: canonicalPreview.previewStatus ?? capsuleGroup.status ?? "unknown",
    approvalIds,
    pendingRows: count(canonicalPreview.batchAuthorizationRequest?.pendingRows ?? canonicalPreview.summary?.pendingRows ?? capsuleGroup.pendingRows),
    acceptedRows: count(canonicalPreview.summary?.acceptedRows ?? capsuleGroup.acceptedRows),
    selectedFinalState: "reviewed commit",
    copyableOwnerReplyTextZh: request.copyableOwnerReplyTextZh ?? capsuleGroup.copyableOwnerReplyTextZh ?? "",
    copyableOwnerReplyText: request.copyableApprovalText ?? capsuleGroup.copyableApprovalText ?? "",
    safePostInputValidationCommands: capsuleGroup.nextSafeValidationCommands ?? [
      "node coordination/release-intake/run-next-owner-authorization-focus-batch-canonical-recording.mjs",
      "node coordination/release-intake/assert-next-owner-authorization-focus-batch-canonical-recording-current.mjs",
      "node coordination/release-intake/generate-owner-closure-input-readiness.mjs",
      "node coordination/release-intake/assert-owner-closure-input-readiness-current.mjs",
      "node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs"
    ],
    cleanupAuthorized: false,
    deployAuthorized: false,
    mergeAuthorized: false,
    destructiveGitAuthorized: false,
    physicalLifecycleCleanupAuthorized: false,
    executableNow: false
  };
}

function pickA22Block({ a22SelectedActionCanonicalPreview, a22OwnerInputLandingRunway, validateFrontierCapsule }) {
  const request = a22SelectedActionCanonicalPreview.batchAuthorizationRequest ?? {};
  const capsuleGroup = (validateFrontierCapsule.ownerInputGroups ?? [])
    .find((group) => group.id === "a22-root-parity-selected-actions") ?? {};
  const topCandidate = a22SelectedActionCanonicalPreview.topCandidate ?? a22OwnerInputLandingRunway.topCandidate ?? {};
  const summary = a22OwnerInputLandingRunway.summary ?? {};
  return {
    id: "a22-root-parity-selected-actions",
    owner: "A22 production reliability and release engineering with A06/A20/A05 owner review",
    requestKind: "a22-root-parity-selected-action-owner-input",
    targetFile: a22OwnerInputLandingRunway.ownerInputFile ?? capsuleGroup.targetFile ?? "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-extraction-instruction-owner-input.json",
    status: a22OwnerInputLandingRunway.runwayStatus ?? capsuleGroup.runwayStatus ?? "unknown",
    previewStatus: a22SelectedActionCanonicalPreview.previewStatus ?? "unknown",
    topCandidateBranch: topCandidate.branch ?? "",
    targetWorktree: topCandidate.path ?? "",
    approvalIds: request.approvalIds ?? capsuleGroup.approvalIds ?? [],
    selectedActions: request.selectedActions ?? capsuleGroup.selectedActions ?? {},
    pendingRows: count(a22SelectedActionCanonicalPreview.summary?.pendingRows ?? capsuleGroup.pendingRows),
    acceptedRows: count(a22SelectedActionCanonicalPreview.summary?.acceptedRows ?? capsuleGroup.acceptedRows),
    patchRows: count(summary.patchRows ?? capsuleGroup.landingPatchRows),
    ownerInputBlank: summary.ownerInputBlank === true || capsuleGroup.ownerInputBlank === true,
    candidateTargetsMissing: count(summary.candidateTargetsMissing ?? capsuleGroup.candidateTargetsMissing),
    candidateTargetsVerified: count(summary.candidateTargetsVerified ?? capsuleGroup.candidateTargetsVerified),
    postOwnerInputValidationCommands: a22OwnerInputLandingRunway.postOwnerInputValidationCommands ?? capsuleGroup.nextSafeValidationCommands ?? [],
    copyableOwnerReplyTextZh: request.copyableOwnerReplyTextZh ?? capsuleGroup.copyableOwnerReplyTextZh ?? "",
    copyableOwnerReplyText: request.copyableOwnerReplyText ?? capsuleGroup.copyableOwnerReplyText ?? "",
    exactOwnerExecutionTextLines: request.exactOwnerExecutionTextLines ?? capsuleGroup.exactOwnerExecutionTextLines ?? [],
    recommendedSelectedActions: (a22SelectedActionCanonicalPreview.previewRows ?? capsuleGroup.recommendedSelectedActions ?? []).map((row) => ({
      unitId: row.unitId,
      selectedAction: row.selectedAction,
      rootSource: row.rootSource,
      rootSourceSha256: row.rootSourceSha256,
      candidateTarget: row.candidateTarget
    })),
    cleanupAuthorized: false,
    deployAuthorized: false,
    mergeAuthorized: false,
    broadStagingAuthorized: false,
    destructiveGitAuthorized: false,
    physicalLifecycleCleanupAuthorized: false,
    executableNow: false
  };
}

function pickValidationHoldBlock({ validationHoldScaffold, validationHoldRecordingDryRun }) {
  const validationHold = validationHoldScaffold.validationHold ?? {};
  const ownerConfirmation = validationHoldScaffold.ownerConfirmation ?? {};
  const template = ownerConfirmation.template ?? validationHoldScaffold.ownerConfirmationTemplate ?? {};
  return {
    id: "validation-hold-release-confirmation",
    owner: "A25 git hygiene and release intake with A10/A22/A08/A12/A06 hold context",
    requestKind: "validation-hold-release-review-confirmation",
    targetFile: "coordination/release-intake/latest-A25-validation-hold-release-owner-confirmation.json",
    status: validationHoldScaffold.scaffoldStatus ?? "unknown",
    recorderStatus: validationHoldRecordingDryRun.recorderStatus ?? "unknown",
    ownerConfirmationInputPresent: ownerConfirmation.inputFilePresent === true || validationHoldScaffold.summary?.ownerConfirmationInputPresent === true,
    ownerConfirmationAccepted: ownerConfirmation.confirmationAccepted === true || validationHoldScaffold.summary?.ownerConfirmationAccepted === true,
    activeWorktreePath: validationHold.activeWorktreePath ?? template.activeWorktreePath ?? "",
    requiredConfirmationTextZh: REQUIRED_OWNER_CONFIRMATION_TEXT_ZH,
    ownerConfirmationTemplate: {
      ownerConfirmed: true,
      confirmationText: REQUIRED_OWNER_CONFIRMATION_TEXT_ZH,
      activeWorktreePath: validationHold.activeWorktreePath ?? template.activeWorktreePath ?? "",
      scope: "validation-hold-release-review-only",
      confirmedBy: "<owner>",
      confirmedAt: "<ISO-8601>",
      mergeAuthorized: false,
      cleanupAuthorized: false,
      deployAuthorized: false,
      destructiveGitAuthorized: false,
      physicalLifecycleCleanupAuthorized: false,
      notes: "This confirms only that the compose worktree deletion hold may be reviewed for release. It does not authorize merge, cleanup, deploy, or destructive Git operations."
    },
    safePostInputValidationCommands: [
      "node coordination/release-intake/generate-validation-hold-release-confirmation-scaffold.mjs",
      "node coordination/release-intake/assert-validation-hold-release-confirmation-scaffold-current.mjs",
      "node coordination/release-intake/run-validation-hold-release-confirmation-recording.mjs",
      "node coordination/release-intake/assert-validation-hold-release-confirmation-recording-current.mjs"
    ],
    validationHoldReleased: false,
    cleanupAuthorized: false,
    deployAuthorized: false,
    mergeAuthorized: false,
    destructiveGitAuthorized: false,
    physicalLifecycleCleanupAuthorized: false,
    executableNow: false
  };
}

function buildChecks({ sourceFailures, a25Block, a22Block, holdBlock, validateFrontierPostInputRunway, validateToMergeExitCriteria }) {
  const frontier = validateFrontierPostInputRunway.frontier ?? {};
  const holdConfirmationMissing = holdBlock.status === "waiting-for-owner-compose-deletion-confirmation" &&
    holdBlock.recorderStatus === "dry-run-blocked-owner-confirmation-input" &&
    holdBlock.ownerConfirmationInputPresent === false &&
    holdBlock.ownerConfirmationAccepted === false;
  const holdConfirmationRecorded = holdBlock.status === "owner-confirmation-recorded-awaiting-separate-release-gate" &&
    ["dry-run-ready-requires-explicit-apply", "already-recorded"].includes(holdBlock.recorderStatus) &&
    holdBlock.ownerConfirmationInputPresent === true &&
    holdBlock.ownerConfirmationAccepted === true &&
    holdBlock.validationHoldReleased === false;
  const checks = [
    {
      id: "sources-current",
      status: sourceFailures.length === 0 ? "pass" : "fail",
      detail: sourceFailures.length === 0 ? "All owner response packet sources match the current dirty map." : sourceFailures.join("; ")
    },
    {
      id: "a25-response-ready",
      status: (
        a25Block.status === "ready-for-owner-review" &&
        a25Block.pendingRows > 0 &&
        a25Block.acceptedRows === 0 &&
        a25Block.approvalIds.length === a25Block.pendingRows &&
        a25Block.copyableOwnerReplyTextZh.includes("不授权 cleanup")
      ) || (
        a25Block.status === "no-pending-focus-rows" &&
        a25Block.pendingRows === 0 &&
        a25Block.acceptedRows === 0 &&
        a25Block.approvalIds.length === 0
      ) ? "pass" : "fail",
      detail: "A25 focus-batch response text either covers the current owner-package rows or confirms no focus rows remain; it remains non-executable."
    },
    {
      id: "a22-response-ready",
      status: (
        a22Block.previewStatus === "ready-for-owner-review" &&
        a22Block.patchRows === 4 &&
        a22Block.pendingRows === 4 &&
        a22Block.acceptedRows === 0 &&
        a22Block.exactOwnerExecutionTextLines.length === 4 &&
        a22Block.ownerInputBlank === true &&
        a22Block.candidateTargetsMissing === 4
      ) || (
        a22Block.previewStatus === "owner-approved-waiting-candidate-mutation" &&
        a22Block.patchRows === 4 &&
        a22Block.pendingRows === 0 &&
        a22Block.acceptedRows === 4 &&
        a22Block.exactOwnerExecutionTextLines.length === 4 &&
        a22Block.ownerInputBlank === false &&
        a22Block.candidateTargetsMissing === 4
      ) || (
        a22Block.previewStatus === "owner-approved-post-extraction-verified-check-remediation" &&
        a22Block.patchRows === 4 &&
        a22Block.pendingRows === 0 &&
        a22Block.acceptedRows === 4 &&
        a22Block.exactOwnerExecutionTextLines.length === 4 &&
        a22Block.ownerInputBlank === false &&
        a22Block.candidateTargetsMissing === 0 &&
        a22Block.candidateTargetsVerified === 4
      ) ? "pass" : "fail",
      detail: "A22 root-parity selectedAction response text covers exactly 4 rows and is either waiting for selectedAction input, waiting for candidate-mutation input, or post-extraction verified pending type-check/build remediation."
    },
    {
      id: "validation-hold-confirmation-ready",
      status: (holdConfirmationMissing || holdConfirmationRecorded) &&
        holdBlock.requiredConfirmationTextZh === REQUIRED_OWNER_CONFIRMATION_TEXT_ZH ? "pass" : "fail",
      detail: "Validation hold confirmation is either still missing or recorded for separate release-gate review; the hold is not released here."
    },
    {
      id: "frontier-state-still-blocked",
      status: frontier.ownerFrontierRows === frontier.a25FocusRows &&
        frontier.a25FocusRows >= 0 &&
        frontier.a22SelectedActionRows === 4 &&
        validateToMergeExitCriteria.validateExitReady === false &&
        validateToMergeExitCriteria.readyForMerge === false ? "pass" : "fail",
      detail: "Owner response packet does not change validate-to-merge readiness."
    },
    {
      id: "non-executable-boundary",
      status: [
        a25Block,
        a22Block,
        holdBlock
      ].every((block) => (
        block.cleanupAuthorized === false &&
        block.deployAuthorized === false &&
        block.mergeAuthorized === false &&
        block.destructiveGitAuthorized === false &&
        block.physicalLifecycleCleanupAuthorized === false &&
        block.executableNow === false
      )) ? "pass" : "fail",
      detail: "No owner response block authorizes cleanup, deploy, merge, destructive Git, physical cleanup, or immediate execution."
    }
  ];
  return checks;
}

function combinedValidationCommands({ a25Block, a22Block, holdBlock }) {
  return Array.from(new Set([
    "npm run release:dirty-map -- --assert-current --max-age-minutes 60",
    ...a25Block.safePostInputValidationCommands,
    "node coordination/release-intake/run-a22-root-parity-owner-input-recording.mjs",
    "node coordination/release-intake/assert-a22-root-parity-owner-input-recording-current.mjs",
    ...a22Block.postOwnerInputValidationCommands,
    ...holdBlock.safePostInputValidationCommands,
    "node coordination/release-intake/assert-validate-frontier-owner-input-request-capsule-current.mjs",
    "node coordination/release-intake/assert-validate-frontier-post-input-runway-current.mjs",
    "node coordination/release-intake/assert-validate-to-merge-exit-criteria-current.mjs",
    "node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs"
  ]));
}

export function buildValidateFrontierOwnerResponsePacket() {
  const artifacts = {
    dirtyMap: readJson(VALIDATE_FRONTIER_OWNER_RESPONSE_PACKET_PATHS.dirtyMap),
    validateFrontierCapsule: readJson(VALIDATE_FRONTIER_OWNER_RESPONSE_PACKET_PATHS.validateFrontierCapsule),
    validateFrontierPostInputRunway: readJson(VALIDATE_FRONTIER_OWNER_RESPONSE_PACKET_PATHS.validateFrontierPostInputRunway),
    validateToMergeExitCriteria: readJson(VALIDATE_FRONTIER_OWNER_RESPONSE_PACKET_PATHS.validateToMergeExitCriteria),
    canonicalPreview: readJson(VALIDATE_FRONTIER_OWNER_RESPONSE_PACKET_PATHS.canonicalPreview),
    a22SelectedActionCanonicalPreview: readJson(VALIDATE_FRONTIER_OWNER_RESPONSE_PACKET_PATHS.a22SelectedActionCanonicalPreview),
    a22OwnerInputLandingRunway: readJson(VALIDATE_FRONTIER_OWNER_RESPONSE_PACKET_PATHS.a22OwnerInputLandingRunway),
    validationHoldScaffold: readJson(VALIDATE_FRONTIER_OWNER_RESPONSE_PACKET_PATHS.validationHoldScaffold),
    validationHoldRecordingDryRun: readJson(VALIDATE_FRONTIER_OWNER_RESPONSE_PACKET_PATHS.validationHoldRecordingDryRun)
  };
  const sourceFailures = sourceCurrentnessFailures({ dirtyMap: artifacts.dirtyMap, artifacts });
  const a25Block = pickA25Block(artifacts);
  const a22Block = pickA22Block(artifacts);
  const holdBlock = pickValidationHoldBlock(artifacts);
  const checks = buildChecks({
    sourceFailures,
    a25Block,
    a22Block,
    holdBlock,
    validateFrontierPostInputRunway: artifacts.validateFrontierPostInputRunway,
    validateToMergeExitCriteria: artifacts.validateToMergeExitCriteria
  });
  const failedChecks = checks.filter((check) => check.status !== "pass").length;
  const frontier = artifacts.validateFrontierPostInputRunway.frontier ?? {};
  const payload = {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    packetKind: "a25-a22-validate-frontier-owner-response-packet",
    packetStatus: failedChecks === 0
      ? (frontier.ownerFrontierRows === 0
        ? a22Block.previewStatus === "owner-approved-post-extraction-verified-check-remediation"
          ? "owner-response-consumed-waiting-a22-typecheck-build-remediation"
          : "owner-response-consumed-waiting-candidate-mutation-input"
        : "waiting-for-owner-response")
      : "blocked-source-review-required",
    dirtyMapStatusSignature: artifacts.dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMapEntryCount(artifacts.dirtyMap),
    sourceArtifacts: Object.fromEntries(Object.entries(artifacts).map(([key, payload]) => [
      key,
      artifactStamp(key, VALIDATE_FRONTIER_OWNER_RESPONSE_PACKET_PATHS[key], payload)
    ])),
    sourceCurrentnessFailures: sourceFailures,
    summary: {
      responseBlocks: 3,
      frontierOwnerRows: frontier.ownerFrontierRows ?? 0,
      a25FocusRows: frontier.a25FocusRows ?? 0,
      a22SelectedActionRows: frontier.a22SelectedActionRows ?? 0,
      validationHoldConfirmationRows: 1,
      currentPendingCanonicalAuthorizationRows: frontier.currentPendingCanonicalAuthorizationRows ?? 0,
      projectedPendingCanonicalAuthorizationRows: frontier.projectedPendingCanonicalAuthorizationRows ?? 0,
      currentValidAuthorizationRows: frontier.currentValidAuthorizationRows ?? 0,
      projectedValidAuthorizationRows: frontier.projectedValidAuthorizationRows ?? 0,
      validateExitReady: artifacts.validateToMergeExitCriteria.validateExitReady === true,
      readyForMerge: artifacts.validateToMergeExitCriteria.readyForMerge === true,
      releaseSourceEligibleNow: false,
      cleanupAuthorizedRows: 0,
      executableRows: 0,
      failedChecks,
      passingChecks: checks.length - failedChecks,
      totalChecks: checks.length
    },
    ownerResponseBlocks: [a25Block, a22Block, holdBlock],
    safePostOwnerResponseValidationCommands: combinedValidationCommands({ a25Block, a22Block, holdBlock }),
    boundary: {
      evidenceOnly: true,
      recordsOwnerInputRows: 0,
      recordsAuthorizationRows: 0,
      recordsExtractionInstructionRows: 0,
      modifiesCandidateRows: 0,
      rootCopyRows: 0,
      validationHoldReleased: false,
      cleanupAuthorized: false,
      deployAuthorized: false,
      mergeAuthorized: false,
      broadStagingAuthorized: false,
      destructiveGitAuthorized: false,
      physicalLifecycleCleanupAuthorized: false,
      executableNow: false
    },
    checks
  };
  return payload;
}

export function stableValidateFrontierOwnerResponsePacketProjection(payload) {
  return {
    packetKind: payload.packetKind,
    packetStatus: payload.packetStatus,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: stableSourceArtifacts(payload.sourceArtifacts),
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures ?? [],
    summary: payload.summary,
    ownerResponseBlocks: payload.ownerResponseBlocks,
    safePostOwnerResponseValidationCommands: payload.safePostOwnerResponseValidationCommands,
    boundary: payload.boundary,
    checks: payload.checks
  };
}

function renderMarkdown(payload) {
  const a25Block = payload.ownerResponseBlocks.find((block) => block.id === "a25-owner-package-canonical-authorization-focus-batch");
  const a22Block = payload.ownerResponseBlocks.find((block) => block.id === "a22-root-parity-selected-actions");
  const holdBlock = payload.ownerResponseBlocks.find((block) => block.id === "validation-hold-release-confirmation");
  const checks = payload.checks.map((check) => `- ${check.status === "pass" ? "[pass]" : "[fail]"} ${check.id}: ${check.detail}`).join("\n");
  const a22Lines = (a22Block?.exactOwnerExecutionTextLines ?? []).map((line, index) => `${index + 1}. ${line}`).join("\n");
  const commands = payload.safePostOwnerResponseValidationCommands.map((command) => `- \`${command}\``).join("\n");

  return `# A25/A22 Validate Frontier Owner Response Packet

- Generated at: ${payload.generatedAt}
- Packet status: ${payload.packetStatus}
- Expanded dirty entries: ${payload.expandedStatusEntries}
- Frontier owner rows: ${payload.summary.frontierOwnerRows}
- A25 focus rows: ${payload.summary.a25FocusRows}
- A22 selectedAction rows: ${payload.summary.a22SelectedActionRows}
- Validation hold confirmation rows: ${payload.summary.validationHoldConfirmationRows}
- Current pending canonical authorization rows: ${payload.summary.currentPendingCanonicalAuthorizationRows}
- Projected pending canonical authorization rows after current frontier: ${payload.summary.projectedPendingCanonicalAuthorizationRows}
- Validate exit ready: ${payload.summary.validateExitReady ? "yes" : "no"}
- Ready for merge: ${payload.summary.readyForMerge ? "yes" : "no"}
- Cleanup authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Boundary

This packet is evidence-only. It does not record owner input, record authorization rows, record extraction instructions, copy root files, mutate the A22 candidate, release the validation hold, stage, commit, merge, deploy, clean, delete, reset, prune, or authorize physical lifecycle cleanup.

## A25 Owner-Package Response

Target file: \`${a25Block?.targetFile ?? ""}\`

${a25Block?.copyableOwnerReplyTextZh ?? ""}

## A22 Root-Parity Response

Target file: \`${a22Block?.targetFile ?? ""}\`

${a22Block?.copyableOwnerReplyTextZh ?? ""}

Exact owner execution text lines:

${a22Lines}

## Validation Hold Confirmation

Target file: \`${holdBlock?.targetFile ?? ""}\`

Required confirmation text:

${holdBlock?.requiredConfirmationTextZh ?? ""}

Owner confirmation template:

\`\`\`json
${JSON.stringify(holdBlock?.ownerConfirmationTemplate ?? {}, null, 2)}
\`\`\`

## Checks

${checks}

## Post-Owner-Response Validation Commands

${commands}
`;
}

export function writeValidateFrontierOwnerResponsePacket() {
  const payload = buildValidateFrontierOwnerResponsePacket();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const markdown = renderMarkdown(payload);
  for (const target of [
    VALIDATE_FRONTIER_OWNER_RESPONSE_PACKET_PATHS.latestJson,
    VALIDATE_FRONTIER_OWNER_RESPONSE_PACKET_PATHS.datedJson
  ]) {
    write(target, json);
  }
  for (const target of [
    VALIDATE_FRONTIER_OWNER_RESPONSE_PACKET_PATHS.latestMarkdown,
    VALIDATE_FRONTIER_OWNER_RESPONSE_PACKET_PATHS.datedMarkdown
  ]) {
    write(target, markdown);
  }
  return payload;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const payload = writeValidateFrontierOwnerResponsePacket();
  console.log(JSON.stringify({
    latestJson: VALIDATE_FRONTIER_OWNER_RESPONSE_PACKET_PATHS.latestJson,
    latestMarkdown: VALIDATE_FRONTIER_OWNER_RESPONSE_PACKET_PATHS.latestMarkdown,
    packetStatus: payload.packetStatus,
    frontierOwnerRows: payload.summary.frontierOwnerRows,
    responseBlocks: payload.summary.responseBlocks,
    validationHoldConfirmationRows: payload.summary.validationHoldConfirmationRows,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}
