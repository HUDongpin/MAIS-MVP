#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const VALIDATE_TO_MERGE_HANDOFF_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  closureLoopState: "coordination/release-intake/latest-A25-dirty-worktree-closure-loop-state.json",
  completionAudit: "coordination/release-intake/latest-A25-dirty-worktree-remediation-completion-audit.json",
  ownerClosureInputReadiness: "coordination/release-intake/latest-A25-owner-closure-input-readiness.json",
  ownerInputActionPacket: "coordination/release-intake/latest-A25-owner-input-action-packet.json",
  ownerClosureWorkOrderBundle: "coordination/release-intake/latest-A25-owner-closure-work-order-bundle.json",
  focusBatchRecordingIntake: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch-recording-intake.json",
  authorizationExecutionPreview: "coordination/release-intake/latest-A25-next-owner-authorization-execution-preview.json",
  executionInstructionsGate: "coordination/release-intake/latest-A25-next-owner-execution-instructions-current-gate.json",
  a16PostExtractionVerificationReport: "coordination/release-intake/latest-A25-a16-post-extraction-verification-report.json",
  a22ReleaseSourceBlocker: "coordination/release-intake/latest-A22-release-source-clean-blocker-evidence.json",
  a25StrictLifecycleBlocker: "coordination/release-intake/latest-A25-strict-worktree-lifecycle-blocker-evidence.json",
  noDirtyRootDeployEvidence: "coordination/release-intake/latest-A25-no-dirty-root-deploy-evidence.json",
  latestJson: "coordination/release-intake/latest-A25-validate-to-merge-handoff.json",
  latestMarkdown: "coordination/release-intake/latest-A25-validate-to-merge-handoff.md",
  datedJson: `coordination/release-intake/${date}-A25-validate-to-merge-handoff.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-validate-to-merge-handoff.md`
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

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content);
}

function count(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function ensureCurrent(label, artifact, dirtyMap) {
  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? 0;
  const signature = artifact.dirtyMapStatusSignature ?? artifact.statusSignature ?? artifact.dirtyMap?.statusSignature ?? null;
  const entries = artifact.expandedStatusEntries ?? artifact.statusCounts?.expandedStatusEntries ?? artifact.dirtyMap?.expandedStatusEntries ?? null;
  const failures = [];
  if (signature !== expectedSignature) failures.push(`${label} dirty-map signature is stale`);
  if (entries !== expectedEntries) failures.push(`${label} expanded dirty entry count is stale`);
  return failures;
}

function check(id, label, passed, blocker, evidence) {
  return {
    id,
    label,
    passed: passed === true,
    blocker: passed === true ? "" : blocker,
    evidence
  };
}

function handoffStatus({ sourceFailures, mergeChecks }) {
  if (sourceFailures.length > 0) return "not-ready-source-stale";
  if (mergeChecks.every((row) => row.passed)) return "ready-for-clean-release-merge";
  return "blocked-before-merge";
}

function nextActions(summary) {
  const actions = [];
  if (summary.focusBatchPendingRows > 0) {
    actions.push(`Record the ${summary.focusBatchPendingRows} focus-batch authorization row(s) as canonical owner authorizations, or leave them pending.`);
  }
  if (summary.pendingCanonicalAuthorizationRows > 0) {
    actions.push(`Shrink the remaining ${summary.pendingCanonicalAuthorizationRows} pending canonical authorization row(s) through owner-reviewed focus batches.`);
  }
  if (summary.effectivePendingReadyExecutionInstructionRows > 0) {
    actions.push(`Record separate owner execution instructions for ${summary.effectivePendingReadyExecutionInstructionRows} ready owner execution-input row(s).`);
  }
  if (summary.validationHoldStatus === "waiting-for-owner-compose-deletion-confirmation") {
    actions.push("Wait for owner confirmation that the active compose-worktree exact deletion is complete before aggregate refreshes that depend on it.");
  }
  if (!summary.releaseSourceClean) {
    actions.push("Keep A22 merge/release work on a clean worktree, clean clone, reviewed clean slice, or pruned staging directory; do not use dirty root.");
  }
  if (!summary.strictLifecycleClean) {
    actions.push("Keep physical worktree/branch/root cleanup blocked until after merge verification and exact owner cleanup instructions.");
  }
  return actions;
}

export function buildValidateToMergeHandoff() {
  const dirtyMap = readJson(VALIDATE_TO_MERGE_HANDOFF_PATHS.dirtyMap);
  const closureLoopState = readJson(VALIDATE_TO_MERGE_HANDOFF_PATHS.closureLoopState);
  const completionAudit = readJson(VALIDATE_TO_MERGE_HANDOFF_PATHS.completionAudit);
  const ownerClosureInputReadiness = readJson(VALIDATE_TO_MERGE_HANDOFF_PATHS.ownerClosureInputReadiness);
  const ownerInputActionPacket = readJson(VALIDATE_TO_MERGE_HANDOFF_PATHS.ownerInputActionPacket);
  const ownerClosureWorkOrderBundle = readJson(VALIDATE_TO_MERGE_HANDOFF_PATHS.ownerClosureWorkOrderBundle);
  const focusBatchRecordingIntake = readJson(VALIDATE_TO_MERGE_HANDOFF_PATHS.focusBatchRecordingIntake);
  const authorizationExecutionPreview = readJson(VALIDATE_TO_MERGE_HANDOFF_PATHS.authorizationExecutionPreview);
  const executionInstructionsGate = readJson(VALIDATE_TO_MERGE_HANDOFF_PATHS.executionInstructionsGate);
  const a16PostExtractionVerificationReport = readJson(VALIDATE_TO_MERGE_HANDOFF_PATHS.a16PostExtractionVerificationReport);
  const a22ReleaseSourceBlocker = readJson(VALIDATE_TO_MERGE_HANDOFF_PATHS.a22ReleaseSourceBlocker);
  const a25StrictLifecycleBlocker = readJson(VALIDATE_TO_MERGE_HANDOFF_PATHS.a25StrictLifecycleBlocker);
  const noDirtyRootDeployEvidence = readJson(VALIDATE_TO_MERGE_HANDOFF_PATHS.noDirtyRootDeployEvidence);

  const sourceCurrentnessFailures = [
    ...ensureCurrent("closure loop state", closureLoopState, dirtyMap),
    ...ensureCurrent("completion audit", completionAudit, dirtyMap),
    ...ensureCurrent("owner closure input readiness", ownerClosureInputReadiness, dirtyMap),
    ...ensureCurrent("owner input action packet", ownerInputActionPacket, dirtyMap),
    ...ensureCurrent("owner closure work-order bundle", ownerClosureWorkOrderBundle, dirtyMap),
    ...ensureCurrent("focus batch recording intake", focusBatchRecordingIntake, dirtyMap),
    ...ensureCurrent("authorization execution preview", authorizationExecutionPreview, dirtyMap),
    ...ensureCurrent("execution instructions gate", executionInstructionsGate, dirtyMap),
    ...ensureCurrent("A16 post-extraction verification report", a16PostExtractionVerificationReport, dirtyMap),
    ...ensureCurrent("A22 release-source blocker", a22ReleaseSourceBlocker, dirtyMap),
    ...ensureCurrent("A25 strict lifecycle blocker", a25StrictLifecycleBlocker, dirtyMap),
    ...ensureCurrent("no dirty-root deploy evidence", noDirtyRootDeployEvidence, dirtyMap)
  ];

  const loopSummary = closureLoopState.summary ?? {};
  const inputSummary = ownerClosureInputReadiness.summary ?? {};
  const actionSummary = ownerInputActionPacket.summary ?? {};
  const workOrderSummary = ownerClosureWorkOrderBundle.summary ?? {};
  const focusSummary = focusBatchRecordingIntake.summary ?? {};
  const previewSummary = authorizationExecutionPreview.summary ?? {};
  const instructionSummary = executionInstructionsGate.summary ?? executionInstructionsGate ?? {};
  const a16Summary = a16PostExtractionVerificationReport.summary ?? {};
  const releaseSummary = a22ReleaseSourceBlocker.summary ?? {};
  const lifecycleSummary = a25StrictLifecycleBlocker.summary ?? {};
  const pendingCanonicalAuthorizationRows = count(loopSummary.pendingCanonicalAuthorizationRows);
  const focusBatchRecordingIntakeStatus = focusBatchRecordingIntake.intakeStatus ?? "missing";
  const focusBatchPendingRows = count(focusSummary.pendingRows);
  const focusBatchAcceptedRows = count(focusSummary.acceptedRows);
  const focusBatchRows = count(focusSummary.focusBatchRows);
  const focusBatchRecorded =
    focusBatchRows === 0
      ? focusBatchPendingRows === 0 && focusBatchAcceptedRows === 0 && focusBatchRecordingIntakeStatus === "no-focus-batch"
      : focusBatchPendingRows === 0 && focusBatchAcceptedRows === focusBatchRows && focusBatchRecordingIntakeStatus === "ready-for-post-input-validation";
  const effectivePendingReadyExecutionInstructionRows = count(loopSummary.effectivePendingReadyExecutionInstructionRows);
  const effectiveReadyExecutionInstructionRows = count(loopSummary.effectiveReadyExecutionInstructionRows);
  const effectiveValidExecutionInstructionRows = count(loopSummary.effectiveValidExecutionInstructionRows);
  const validationHoldStatus = ownerInputActionPacket.validationHold?.status ?? "missing";
  const releaseSourceClean = releaseSummary.releaseSourceClean === true;
  const strictLifecycleClean = lifecycleSummary.strictLifecycleClean === true;
  const cleanupAuthorizedRows =
    count(loopSummary.cleanupAuthorizedRows) +
    count(actionSummary.cleanupAuthorizedRows) +
    count(workOrderSummary.cleanupAuthorizedRows) +
    count(releaseSummary.cleanupAuthorizedRows) +
    count(lifecycleSummary.cleanupAuthorizedRows);
  const executableRows =
    count(loopSummary.executableRows) +
    count(actionSummary.executableRows) +
    count(workOrderSummary.executableRows) +
    count(releaseSummary.executableRows) +
    count(lifecycleSummary.executableRows);

  const summary = {
    activeStep: closureLoopState.activeStep ?? "missing",
    completedSteps: count(loopSummary.completedSteps),
    blockedSteps: count(loopSummary.blockedSteps),
    ownerInputsReady: inputSummary.ownerInputsReady === true,
    pendingCanonicalAuthorizationRows,
    validAuthorizationRows: count(loopSummary.validAuthorizationRows),
    focusBatchRecordingIntakeStatus,
    focusBatchRows,
    focusBatchAcceptedRows,
    focusBatchPendingRows,
    focusBatchOwnerInputVisibleRows: count(focusSummary.ownerInputVisibleRows),
    preAuthorizationReadyRows: count(previewSummary.preAuthorizationReadyRows),
    preAuthorizationAttentionRows: count(previewSummary.preAuthorizationAttentionRows),
    authorizationStarterRows: count(previewSummary.starterRows),
    exactCommandRows: count(previewSummary.exactCommandRows),
    exactCommandTargetReadyRows: count(previewSummary.exactCommandTargetReadyRows),
    readyExecutionInstructionRows: count(loopSummary.readyExecutionInstructionRows),
    validExecutionInstructionRows: count(loopSummary.validExecutionInstructionRows),
    effectiveReadyExecutionInstructionRows,
    effectiveValidExecutionInstructionRows,
    effectivePendingReadyExecutionInstructionRows,
    executionInstructionRowsInFile: count(instructionSummary.instructionRowsInFile),
    invalidExecutionInstructionRows: count(instructionSummary.invalidInstructionRows),
    a16PostExtractionLifecycleStatus: a16PostExtractionVerificationReport.lifecycleStatus ?? "missing",
    a16PostExtractionVerified: a16Summary.postExtractionVerified === true,
    a16PostExtractionFailedChecks: count(a16Summary.failedChecks),
    validationHoldStatus,
    releaseSourceClean,
    releaseSourceBlocked: releaseSummary.releaseSourceBlocked === true,
    strictLifecycleClean,
    strictLifecycleBlocked: lifecycleSummary.strictLifecycleBlocked === true,
    noDirtyRootDeployPassed: noDirtyRootDeployEvidence.passed === true,
    ownerClosurePendingItems: count(inputSummary.ownerClosurePendingItems),
    workOrderPendingItems: count(workOrderSummary.pendingItems),
    cleanupAuthorizedRows,
    executableRows,
    sourceCurrentnessFailures: sourceCurrentnessFailures.length
  };

  const mergeChecks = [
    check("sources-current", "All handoff sources match the current dirty map", sourceCurrentnessFailures.length === 0, `${sourceCurrentnessFailures.length} source currentness failure(s)`, Object.values(VALIDATE_TO_MERGE_HANDOFF_PATHS).filter((value) => value.includes("latest-"))),
    check("closure-loop-validate", "Closure loop is still at validate until owner inputs are complete", summary.activeStep === "validate", `closure loop active step is ${summary.activeStep}`, [VALIDATE_TO_MERGE_HANDOFF_PATHS.closureLoopState]),
    check("preauthorization-clean", "Authorization pre-checks have no attention rows", summary.preAuthorizationReadyRows === summary.authorizationStarterRows && summary.preAuthorizationAttentionRows === 0, "authorization pre-check attention rows remain", [VALIDATE_TO_MERGE_HANDOFF_PATHS.authorizationExecutionPreview]),
    check("focus-batch-recorded", "Current focus batch is recorded as canonical owner authorizations", focusBatchRecorded, focusBatchRows === 0 ? `focus batch status is ${focusBatchRecordingIntakeStatus}` : `${focusBatchPendingRows} focus-batch row(s) still pending`, [VALIDATE_TO_MERGE_HANDOFF_PATHS.focusBatchRecordingIntake]),
    check("canonical-authorizations-complete", "All canonical owner authorization rows are recorded", pendingCanonicalAuthorizationRows === 0, `${pendingCanonicalAuthorizationRows} canonical authorization row(s) still pending`, [VALIDATE_TO_MERGE_HANDOFF_PATHS.ownerClosureInputReadiness, VALIDATE_TO_MERGE_HANDOFF_PATHS.authorizationExecutionPreview]),
    check("owner-inputs-ready", "Owner input readiness gate is green", summary.ownerInputsReady, "owner inputs are not ready", [VALIDATE_TO_MERGE_HANDOFF_PATHS.ownerClosureInputReadiness]),
    check("execution-instructions-complete", "Ready owner execution inputs have valid separate execution instructions", effectiveReadyExecutionInstructionRows > 0 && effectivePendingReadyExecutionInstructionRows === 0 && effectiveValidExecutionInstructionRows === effectiveReadyExecutionInstructionRows, `${effectivePendingReadyExecutionInstructionRows} ready owner execution input row(s) still need execution instructions`, [VALIDATE_TO_MERGE_HANDOFF_PATHS.executionInstructionsGate]),
    check("validation-hold-released", "Owner-active compose-worktree validation hold is released", validationHoldStatus !== "waiting-for-owner-compose-deletion-confirmation", "validation hold is waiting for owner compose deletion confirmation", [VALIDATE_TO_MERGE_HANDOFF_PATHS.ownerInputActionPacket]),
    check("release-source-clean", "A22 release-source blocker is clear before merge", releaseSourceClean, "A22 release source is not clean", [VALIDATE_TO_MERGE_HANDOFF_PATHS.a22ReleaseSourceBlocker]),
    check("no-dirty-root-deploy", "No dirty-root deploy evidence is present", summary.noDirtyRootDeployPassed, "dirty-root deploy evidence gate failed", [VALIDATE_TO_MERGE_HANDOFF_PATHS.noDirtyRootDeployEvidence]),
    check("non-executable-boundary", "Handoff remains non-executable", cleanupAuthorizedRows === 0 && executableRows === 0, `cleanupAuthorizedRows=${cleanupAuthorizedRows}; executableRows=${executableRows}`, [VALIDATE_TO_MERGE_HANDOFF_PATHS.closureLoopState, VALIDATE_TO_MERGE_HANDOFF_PATHS.ownerInputActionPacket]),
    check("strict-lifecycle-not-yet-clean", "Strict lifecycle cleanup remains blocked until after merge verification", !strictLifecycleClean && lifecycleSummary.strictLifecycleBlocked === true, "strict lifecycle is unexpectedly clean or unblocked", [VALIDATE_TO_MERGE_HANDOFF_PATHS.a25StrictLifecycleBlocker])
  ];
  const status = handoffStatus({ sourceFailures: sourceCurrentnessFailures, mergeChecks });

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? 0,
    sourceArtifacts: {
      closureLoopStateGeneratedAt: closureLoopState.generatedAt,
      completionAuditGeneratedAt: completionAudit.generatedAt,
      ownerClosureInputReadinessGeneratedAt: ownerClosureInputReadiness.generatedAt,
      ownerInputActionPacketGeneratedAt: ownerInputActionPacket.generatedAt,
      ownerClosureWorkOrderBundleGeneratedAt: ownerClosureWorkOrderBundle.generatedAt,
      focusBatchRecordingIntakeGeneratedAt: focusBatchRecordingIntake.generatedAt,
      authorizationExecutionPreviewGeneratedAt: authorizationExecutionPreview.generatedAt,
      executionInstructionsGateCheckedAt: executionInstructionsGate.checkedAt,
      a16PostExtractionVerificationReportGeneratedAt: a16PostExtractionVerificationReport.generatedAt,
      a22ReleaseSourceBlockerGeneratedAt: a22ReleaseSourceBlocker.generatedAt,
      a25StrictLifecycleBlockerGeneratedAt: a25StrictLifecycleBlocker.generatedAt,
      noDirtyRootDeployEvidenceGeneratedAt: noDirtyRootDeployEvidence.generatedAt
    },
    handoffStatus: status,
    readyForMerge: status === "ready-for-clean-release-merge",
    summary,
    mergeChecks,
    nextActions: nextActions(summary),
    sourceCurrentnessFailures,
    boundary: {
      evidenceOnly: true,
      mergeAuthorized: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false,
      dirtyRootDeployAuthorized: false,
      physicalCleanupAuthorized: false
    }
  };
}

export function stableValidateToMergeHandoffProjection(payload) {
  const sourceArtifacts = { ...(payload.sourceArtifacts ?? {}) };
  delete sourceArtifacts.executionInstructionsGateCheckedAt;
  return {
    repoRoot: payload.repoRoot,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts,
    handoffStatus: payload.handoffStatus,
    readyForMerge: payload.readyForMerge,
    summary: payload.summary,
    mergeChecks: payload.mergeChecks,
    nextActions: payload.nextActions,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    boundary: payload.boundary
  };
}

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function list(items) {
  const rows = (items ?? []).filter(Boolean);
  return rows.length > 0 ? rows.map((item) => `- ${item}`).join("\n") : "- none";
}

function markdown(payload) {
  const checkRows = payload.mergeChecks.map((row) => (
    `| ${cell(row.id)} | ${row.passed ? "yes" : "no"} | ${cell(row.blocker || "none")} |`
  )).join("\n");

  return `# A25 Validate-To-Merge Handoff

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This handoff is evidence-only. It does not authorize staging, committing, merging, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, cleanup apply, dirty-root deploy, or any other physical cleanup.

## Summary

- Handoff status: \`${payload.handoffStatus}\`
- Ready for merge: ${payload.readyForMerge ? "yes" : "no"}
- Closure-loop active step: ${payload.summary.activeStep}
- Completed loop steps: ${payload.summary.completedSteps}
- Blocked loop steps: ${payload.summary.blockedSteps}
- Owner inputs ready: ${payload.summary.ownerInputsReady ? "yes" : "no"}
- Pending canonical authorization rows: ${payload.summary.pendingCanonicalAuthorizationRows}
- Valid authorization rows: ${payload.summary.validAuthorizationRows}
- Focus batch recording intake: \`${payload.summary.focusBatchRecordingIntakeStatus}\`
- Focus batch accepted rows: ${payload.summary.focusBatchAcceptedRows}/${payload.summary.focusBatchRows}
- Focus batch pending rows: ${payload.summary.focusBatchPendingRows}
- Effective ready owner execution-input rows: ${payload.summary.effectiveReadyExecutionInstructionRows}
- Effective valid owner execution instruction rows: ${payload.summary.effectiveValidExecutionInstructionRows}
- Effective pending owner execution instruction rows: ${payload.summary.effectivePendingReadyExecutionInstructionRows}
- Validation hold: ${payload.summary.validationHoldStatus}
- A22 release source clean: ${payload.summary.releaseSourceClean ? "yes" : "no"}
- A25 strict lifecycle clean: ${payload.summary.strictLifecycleClean ? "yes" : "no"}
- No dirty-root deploy evidence passed: ${payload.summary.noDirtyRootDeployPassed ? "yes" : "no"}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}
- Source currentness failures: ${payload.summary.sourceCurrentnessFailures}

## Merge Readiness Checks

| Check | Passed | Blocker |
| --- | --- | --- |
${checkRows}

## Next Owner Actions

${list(payload.nextActions)}

## Boundary

Merge remains blocked until this handoff is ready and the owner gives a separate exact merge instruction. Cleanup remains blocked until merge is verified and exact cleanup rows are separately authorized.
`;
}

function main() {
  const payload = buildValidateToMergeHandoff();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(VALIDATE_TO_MERGE_HANDOFF_PATHS.latestJson, json);
  write(VALIDATE_TO_MERGE_HANDOFF_PATHS.datedJson, json);
  write(VALIDATE_TO_MERGE_HANDOFF_PATHS.latestMarkdown, md);
  write(VALIDATE_TO_MERGE_HANDOFF_PATHS.datedMarkdown, md);

  console.log(JSON.stringify({
    latestJson: VALIDATE_TO_MERGE_HANDOFF_PATHS.latestJson,
    latestMarkdown: VALIDATE_TO_MERGE_HANDOFF_PATHS.latestMarkdown,
    handoffStatus: payload.handoffStatus,
    readyForMerge: payload.readyForMerge,
    pendingCanonicalAuthorizationRows: payload.summary.pendingCanonicalAuthorizationRows,
    focusBatchPendingRows: payload.summary.focusBatchPendingRows,
    effectivePendingReadyExecutionInstructionRows: payload.summary.effectivePendingReadyExecutionInstructionRows,
    validationHoldStatus: payload.summary.validationHoldStatus,
    releaseSourceClean: payload.summary.releaseSourceClean,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
