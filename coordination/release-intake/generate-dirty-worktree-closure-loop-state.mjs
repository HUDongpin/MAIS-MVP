#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  closureSequence: "coordination/release-intake/latest-A25-dirty-worktree-closure-execution-sequence.json",
  completionAudit: "coordination/release-intake/latest-A25-dirty-worktree-remediation-completion-audit.json",
  effectiveOwnerOverlay: "coordination/release-intake/latest-A25-effective-owner-overlay.json",
  authorizationExecutionPreview: "coordination/release-intake/latest-A25-next-owner-authorization-execution-preview.json",
  executionInstructionsGate: "coordination/release-intake/latest-A25-next-owner-execution-instructions-current-gate.json",
  ownerClosureInputReadiness: "coordination/release-intake/latest-A25-owner-closure-input-readiness.json",
  ownerInputActionPacket: "coordination/release-intake/latest-A25-owner-input-action-packet.json",
  ownerClosureWorkOrderBundle: "coordination/release-intake/latest-A25-owner-closure-work-order-bundle.json",
  focusBatchRecordingIntake: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch-recording-intake.json",
  a16ExecutionInstructionInputScaffold: "coordination/release-intake/latest-A25-a16-execution-instruction-input-scaffold.json",
  a16ExecutionInstructionOwnerInput: "coordination/release-intake/latest-A25-a16-execution-instruction-owner-input.json",
  a16ExecutionInstructionOwnerInputGate: "coordination/release-intake/latest-A25-a16-execution-instruction-owner-input-current-gate.json",
  a16PostExtractionVerificationReport: "coordination/release-intake/latest-A25-a16-post-extraction-verification-report.json",
  a22ReleaseSourceBlocker: "coordination/release-intake/latest-A22-release-source-clean-blocker-evidence.json",
  a25StrictLifecycleBlocker: "coordination/release-intake/latest-A25-strict-worktree-lifecycle-blocker-evidence.json",
  latestJson: "coordination/release-intake/latest-A25-dirty-worktree-closure-loop-state.json",
  latestMarkdown: "coordination/release-intake/latest-A25-dirty-worktree-closure-loop-state.md",
  datedJson: `coordination/release-intake/${date}-A25-dirty-worktree-closure-loop-state.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-dirty-worktree-closure-loop-state.md`
};

const loopOrder = ["slice", "extract", "validate", "merge", "cleanup"];

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
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function ensureCurrent(label, artifact, dirtyMap) {
  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? 0;
  const failures = [];
  const signature = artifact.dirtyMapStatusSignature ?? artifact.statusSignature ?? artifact.dirtyMap?.statusSignature ?? null;
  const entries = artifact.expandedStatusEntries ?? artifact.statusCounts?.expandedStatusEntries ?? artifact.dirtyMap?.expandedStatusEntries ?? null;
  if (signature !== expectedSignature) failures.push(`${label} dirty-map signature is stale`);
  if (entries !== expectedEntries) failures.push(`${label} expanded dirty entry count is stale`);
  return failures;
}

function requirementById(completionAudit) {
  return new Map((completionAudit.requirements ?? []).map((row) => [row.id, row]));
}

function requirementComplete(requirements, id) {
  return requirements.get(id)?.passed === true;
}

function check(label, passed, evidence, blocker = "") {
  return {
    label,
    passed: passed === true,
    evidence,
    blocker: passed === true ? "" : blocker
  };
}

function stepStatus(checks, options = {}) {
  const blockers = checks.filter((row) => !row.passed).map((row) => row.blocker || row.label);
  if (options.forceBlocked) return { status: "blocked", blockers };
  if (options.forceActive) return { status: "active", blockers };
  return {
    status: blockers.length === 0 ? "complete" : "incomplete",
    blockers
  };
}

function loopStep({ id, label, chineseLabel, purpose, checks, forceActive = false, forceBlocked = false, nextGate }) {
  const status = stepStatus(checks, { forceActive, forceBlocked });
  return {
    id,
    label,
    chineseLabel,
    purpose,
    status: status.status,
    blockers: status.blockers,
    checks,
    nextGate
  };
}

function firstActiveStep(steps) {
  return steps.find((step) => step.status !== "complete")?.id ?? "complete";
}

export function buildDirtyWorktreeClosureLoopState() {
  const dirtyMap = readJson(DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.dirtyMap);
  const closureSequence = readJson(DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.closureSequence);
  const completionAudit = readJson(DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.completionAudit);
  const effectiveOwnerOverlay = readJson(DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.effectiveOwnerOverlay);
  const authorizationExecutionPreview = readJson(DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.authorizationExecutionPreview);
  const executionInstructionsGate = readJson(DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.executionInstructionsGate);
  const ownerClosureInputReadiness = readJson(DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.ownerClosureInputReadiness);
  const ownerInputActionPacket = readJson(DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.ownerInputActionPacket);
  const ownerClosureWorkOrderBundle = readJson(DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.ownerClosureWorkOrderBundle);
  const focusBatchRecordingIntake = readJson(DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.focusBatchRecordingIntake);
  const a16ExecutionInstructionInputScaffold = readJson(DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.a16ExecutionInstructionInputScaffold);
  const a16ExecutionInstructionOwnerInput = readJson(DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.a16ExecutionInstructionOwnerInput);
  const a16ExecutionInstructionOwnerInputGate = readJson(DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.a16ExecutionInstructionOwnerInputGate);
  const a16PostExtractionVerificationReport = readJson(DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.a16PostExtractionVerificationReport);
  const a22ReleaseSourceBlocker = readJson(DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.a22ReleaseSourceBlocker);
  const a25StrictLifecycleBlocker = readJson(DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.a25StrictLifecycleBlocker);

  const sourceCurrentnessFailures = [
    ...ensureCurrent("closure sequence", closureSequence, dirtyMap),
    ...ensureCurrent("completion audit", completionAudit, dirtyMap),
    ...ensureCurrent("effective owner overlay", effectiveOwnerOverlay, dirtyMap),
    ...ensureCurrent("authorization execution preview", authorizationExecutionPreview, dirtyMap),
    ...ensureCurrent("execution instructions gate", executionInstructionsGate, dirtyMap),
    ...ensureCurrent("owner closure input readiness", ownerClosureInputReadiness, dirtyMap),
    ...ensureCurrent("owner input action packet", ownerInputActionPacket, dirtyMap),
    ...ensureCurrent("owner closure work-order bundle", ownerClosureWorkOrderBundle, dirtyMap),
    ...ensureCurrent("focus batch recording intake", focusBatchRecordingIntake, dirtyMap),
    ...ensureCurrent("A16 execution-instruction input scaffold", a16ExecutionInstructionInputScaffold, dirtyMap),
    ...ensureCurrent("A16 execution-instruction owner input", a16ExecutionInstructionOwnerInput, dirtyMap),
    ...ensureCurrent("A16 execution-instruction owner-input gate", a16ExecutionInstructionOwnerInputGate, dirtyMap),
    ...ensureCurrent("A16 post-extraction verification report", a16PostExtractionVerificationReport, dirtyMap),
    ...ensureCurrent("A22 release-source blocker", a22ReleaseSourceBlocker, dirtyMap),
    ...ensureCurrent("A25 strict lifecycle blocker", a25StrictLifecycleBlocker, dirtyMap)
  ];

  const requirements = requirementById(completionAudit);
  const sequenceSummary = closureSequence.summary ?? {};
  const previewSummary = authorizationExecutionPreview.summary ?? {};
  const executionInstructionSummary = executionInstructionsGate.summary ?? executionInstructionsGate ?? {};
  const inputSummary = ownerClosureInputReadiness.summary ?? {};
  const actionSummary = ownerInputActionPacket.summary ?? {};
  const workOrderSummary = ownerClosureWorkOrderBundle.summary ?? {};
  const focusBatchRecordingSummary = focusBatchRecordingIntake.summary ?? {};
  const a16ScaffoldSummary = a16ExecutionInstructionInputScaffold.summary ?? {};
  const a16OwnerInputSummary = a16ExecutionInstructionOwnerInput.summary ?? {};
  const a16OwnerInputGateSummary = a16ExecutionInstructionOwnerInputGate.summary ?? a16ExecutionInstructionOwnerInputGate ?? {};
  const a16PostExtractionSummary = a16PostExtractionVerificationReport.summary ?? {};
  const releaseSummary = a22ReleaseSourceBlocker.summary ?? {};
  const lifecycleSummary = a25StrictLifecycleBlocker.summary ?? {};
  const dirtyEntries = count(dirtyMap.statusCounts?.expandedStatusEntries);
  const focusBatchRecordingIntakeStatus = focusBatchRecordingIntake.intakeStatus ?? "missing";
  const focusBatchRows = count(focusBatchRecordingSummary.focusBatchRows);
  const focusBatchAcceptedRows = count(focusBatchRecordingSummary.acceptedRows);
  const focusBatchPendingRows = count(focusBatchRecordingSummary.pendingRows);
  const focusBatchOwnerInputVisibleRows = count(focusBatchRecordingSummary.ownerInputVisibleRows);
  const focusBatchSourceCurrentnessFailures = count(focusBatchRecordingSummary.sourceCurrentnessFailures);
  const focusBatchRecordingIntakeCurrent = focusBatchRecordingIntakeStatus === "no-focus-batch"
    ? focusBatchRows === 0 && focusBatchAcceptedRows === 0 && focusBatchPendingRows === 0 && focusBatchOwnerInputVisibleRows === 0 && focusBatchSourceCurrentnessFailures === 0
    : focusBatchRows > 0 && focusBatchOwnerInputVisibleRows === focusBatchRows && focusBatchSourceCurrentnessFailures === 0 && [
      "waiting-for-owner-authorization",
      "ready-for-post-input-validation"
    ].includes(focusBatchRecordingIntakeStatus);
  const validAuthorizationRows = count(previewSummary.validAuthorizationRows);
  const readyExecutionInstructionRows = count(executionInstructionSummary.readyForSeparateInstructionRows);
  const validExecutionInstructionRows = count(executionInstructionSummary.validInstructionRows);
  const a16ReadyForSeparateInstructionRows = count(a16ScaffoldSummary.readyForSeparateInstructionRows);
  const a16ReadyForOwnerExecutionInstructionRows = count(a16OwnerInputSummary.readyForOwnerInputRows);
  const a16ValidExecutionInstructionRows = count(a16OwnerInputGateSummary.validInstructionRows);
  const a16ExecutionInstructionFrontierRows = Math.max(
    a16ReadyForOwnerExecutionInstructionRows,
    a16ValidExecutionInstructionRows
  );
  const a16PendingOwnerExecutionInstructionRows = Math.max(
    a16ExecutionInstructionFrontierRows - a16ValidExecutionInstructionRows,
    0
  );
  const a16PostExtractionLifecycleStatus = a16PostExtractionVerificationReport.lifecycleStatus ?? "missing";
  const a16PostExtractionVerified = a16PostExtractionSummary.postExtractionVerified === true;
  const a16ExecutionInputFrontierCurrent = (
    a16ReadyForSeparateInstructionRows === 1 && (
      (a16ReadyForOwnerExecutionInstructionRows === 1 && a16ValidExecutionInstructionRows === 0 && a16PostExtractionLifecycleStatus === "pending-owner-execution-instruction") ||
      (a16ValidExecutionInstructionRows === 1 && a16PostExtractionLifecycleStatus === "pending-extraction-execution")
    )
  ) || (
    a16ReadyForSeparateInstructionRows === 0 &&
    a16ValidExecutionInstructionRows === 1 &&
    a16PostExtractionLifecycleStatus === "post-extraction-verified" &&
    a16PostExtractionVerified
  );
  const effectiveReadyExecutionInstructionRows = readyExecutionInstructionRows + a16ExecutionInstructionFrontierRows;
  const effectiveValidExecutionInstructionRows = validExecutionInstructionRows + a16ValidExecutionInstructionRows;
  const effectivePendingReadyExecutionInstructionRows = Math.max(
    effectiveReadyExecutionInstructionRows - effectiveValidExecutionInstructionRows,
    0
  );
  const pendingCanonicalAuthorizationRows = count(inputSummary.pendingCanonicalAuthorizationRows);
  const cleanupAuthorizedRows =
    count(previewSummary.cleanupAuthorizedRows) +
    count(executionInstructionSummary.cleanupAuthorizedRows) +
    count(inputSummary.cleanupAuthorizedRows) +
    count(actionSummary.cleanupAuthorizedRows) +
    count(workOrderSummary.cleanupAuthorizedRows) +
    count(focusBatchRecordingSummary.cleanupAuthorizedRows);
  const executableRows =
    count(previewSummary.executableRows) +
    count(executionInstructionSummary.executableRows) +
    count(inputSummary.executableRows) +
    count(actionSummary.executableRows) +
    count(workOrderSummary.executableRows) +
    count(focusBatchRecordingSummary.executableRows);
  const ownerInputsReady = inputSummary.ownerInputsReady === true;
  const validationHoldStatus = ownerInputActionPacket.validationHold?.status ?? "missing";
  const expectedClosureSequenceApprovals =
    count(sequenceSummary.ownerPackageApprovals) + count(sequenceSummary.physicalLifecycleApprovals);

  const sliceChecks = [
    check("Owner pathspecs are current", requirementComplete(requirements, "owner-pathspecs-current"), ["coordination/release-intake/latest-A25-dirty-worktree-remediation-completion-audit.json"], "A25 owner pathspecs are not current"),
    check("Effective owner overlay is current", requirementComplete(requirements, "effective-owner-overlay-current"), ["coordination/release-intake/latest-A25-dirty-worktree-remediation-completion-audit.json"], "A25 effective owner overlay is not current"),
    check(
      "No unmapped runtime paths remain",
      count(effectiveOwnerOverlay.remainingUnmappedRuntimeEntries) === 0,
      [DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.effectiveOwnerOverlay, "coordination/release-intake/latest-A25-unmapped-runtime-owner-proposals.json"],
      "Runtime paths remain unmapped"
    ),
    check(
      "No unmapped manual paths remain",
      count(effectiveOwnerOverlay.remainingUnmappedManualEntries) === 0,
      [DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.effectiveOwnerOverlay, "coordination/release-intake/latest-A25-unmapped-manual-owner-proposals.json"],
      "Manual paths remain unmapped"
    ),
    check(
      "Closure sequence covers all approval rows",
      expectedClosureSequenceApprovals > 0 &&
        count(sequenceSummary.totalApprovals) === expectedClosureSequenceApprovals &&
        count(sequenceSummary.waves) === 6,
      [DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.closureSequence],
      "Closure sequence does not cover all expected approval rows"
    )
  ];

  const extractChecks = [
    check("Owner work-order bundle covers A01-A25", count(workOrderSummary.owners) === 25, [DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.ownerClosureWorkOrderBundle], "Owner work-order bundle does not cover 25 owners"),
    check("Owner closure pending items are materialized", count(workOrderSummary.pendingItems) === count(inputSummary.ownerClosurePendingItems), [DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.ownerClosureWorkOrderBundle, DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.ownerClosureInputReadiness], "Owner closure pending items are not aligned"),
    check("Owner blocker reports are closed for current starter", count(inputSummary.pendingOwnerBlockerReportRecords) === 0, [DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.ownerClosureInputReadiness], "Pending owner blocker report records remain"),
    check(
      "Authorization starter rows are extracted",
      count(previewSummary.starterRows) === validAuthorizationRows + pendingCanonicalAuthorizationRows,
      [DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.authorizationExecutionPreview, DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.ownerClosureInputReadiness],
      "Authorization starter rows do not match the current valid plus pending canonical authorization frontier"
    )
  ];

  const validateChecks = [
    check("All authorization rows pass pre-authorization checks", count(previewSummary.preAuthorizationReadyRows) === count(previewSummary.starterRows) && count(previewSummary.preAuthorizationAttentionRows) === 0, [DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.authorizationExecutionPreview], "Authorization pre-check attention rows remain"),
    check("Exact command targets are ready", count(previewSummary.exactCommandTargetReadyRows) === count(previewSummary.exactCommandRows), [DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.authorizationExecutionPreview], "Exact command targets are not all ready"),
    check("A25 aggregate currentness is represented", completionAudit.complete === false && count(completionAudit.summary?.completedRequirements) >= 9, [DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.completionAudit], "Completion audit is missing or stale"),
    check("Owner input files exist but are not yet ready", ownerInputsReady === false && pendingCanonicalAuthorizationRows > 0, [DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.ownerClosureInputReadiness, DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.ownerInputActionPacket], "Owner input frontier is not in the expected waiting state"),
    check("Focus batch owner-authorization recording intake is current", focusBatchRecordingIntakeCurrent, [DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.focusBatchRecordingIntake], "Focus batch owner-authorization recording intake is not current"),
    check("A16 execution-input slot is current and either pending or post-extraction verified", a16ExecutionInputFrontierCurrent && count(a16PostExtractionSummary.failedChecks) === 0, [
      DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.a16ExecutionInstructionInputScaffold,
      DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.a16ExecutionInstructionOwnerInput,
      DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.a16PostExtractionVerificationReport
    ], "A16 execution-input frontier is not in an expected pending or post-extraction verified state")
  ];

  const mergeChecks = [
    check(
      "Owner canonical authorization rows are recorded",
      validAuthorizationRows > 0 && pendingCanonicalAuthorizationRows === 0,
      [DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.authorizationExecutionPreview, DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.ownerClosureInputReadiness],
      `${pendingCanonicalAuthorizationRows} canonical authorization row(s) are still pending`
    ),
    check("Separate execution instructions are recorded for ready owner execution inputs", validAuthorizationRows === 0 || (effectiveReadyExecutionInstructionRows > 0 && effectiveValidExecutionInstructionRows === effectiveReadyExecutionInstructionRows), [
      DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.executionInstructionsGate,
      DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.a16ExecutionInstructionOwnerInput,
      DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.a16PostExtractionVerificationReport
    ], `${effectivePendingReadyExecutionInstructionRows} ready owner execution input row(s) still need separate execution instructions; A16 frontier=${a16ExecutionInstructionFrontierRows}, A16 valid=${a16ValidExecutionInstructionRows}, generic ready=${readyExecutionInstructionRows}`),
    check("Owner inputs ready", ownerInputsReady, [DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.ownerClosureInputReadiness], "Owner inputs are not ready"),
    check("Validation hold released", validationHoldStatus !== "waiting-for-owner-compose-deletion-confirmation", [DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.ownerInputActionPacket], "Validation hold is waiting for owner compose deletion confirmation")
  ];

  const cleanupChecks = [
    check("Root dirty entries are zero", dirtyEntries === 0, [DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.dirtyMap], `${dirtyEntries} expanded dirty entries remain`),
    check("Release source is clean", releaseSummary.releaseSourceClean === true, [DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.a22ReleaseSourceBlocker], "A22 release source is not clean"),
    check("Strict worktree lifecycle is clean", lifecycleSummary.strictLifecycleClean === true, [DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.a25StrictLifecycleBlocker], "A25 strict worktree lifecycle is not clean"),
    check("Cleanup rows are separately authorized", cleanupAuthorizedRows > 0 && executableRows > 0, [DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.authorizationExecutionPreview, DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.ownerInputActionPacket], "No cleanup/executable rows are authorized")
  ];

  const slice = loopStep({
    id: "slice",
    label: "Slice",
    chineseLabel: "切片",
    purpose: "Map root dirty inventory to owners, waves, and approval IDs.",
    checks: sliceChecks,
    nextGate: "Proceed only when all dirty entries have owner/pathspec coverage and sequenced approval IDs."
  });
  const extract = loopStep({
    id: "extract",
    label: "Extract",
    chineseLabel: "提取",
    purpose: "Materialize owner work orders, blocker reports, and authorization starters.",
    checks: extractChecks,
    nextGate: "Proceed only when owner work orders and blocker records are current."
  });
  const validate = loopStep({
    id: "validate",
    label: "Validate",
    chineseLabel: "验证",
    purpose: "Keep current gates green while waiting for explicit owner authorization.",
    checks: validateChecks,
    forceActive: true,
    nextGate: "Owner must record canonical authorization rows before merge or cleanup can start."
  });
  const merge = loopStep({
    id: "merge",
    label: "Merge",
    chineseLabel: "合并",
    purpose: "Merge reviewed owner packages into a clean release source, not the dirty root.",
    checks: mergeChecks,
    forceBlocked: true,
    nextGate: "Release-source merge cannot begin until owner inputs are ready and validation hold is released."
  });
  const cleanup = loopStep({
    id: "cleanup",
    label: "Cleanup",
    chineseLabel: "清理",
    purpose: "Remove only owner-authorized generated artifacts, root inventory, branches, and worktrees after merge verification.",
    checks: cleanupChecks,
    forceBlocked: true,
    nextGate: "Cleanup cannot begin until merge is verified and exact cleanup rows are separately authorized."
  });

  const steps = [slice, extract, validate, merge, cleanup];
  const activeStep = firstActiveStep(steps);
  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyEntries,
    sourceArtifacts: {
      closureSequenceGeneratedAt: closureSequence.generatedAt,
      completionAuditGeneratedAt: completionAudit.generatedAt,
      effectiveOwnerOverlayGeneratedAt: effectiveOwnerOverlay.generatedAt,
      authorizationExecutionPreviewGeneratedAt: authorizationExecutionPreview.generatedAt,
      executionInstructionsCheckedAt: executionInstructionsGate.checkedAt,
      ownerClosureInputReadinessGeneratedAt: ownerClosureInputReadiness.generatedAt,
      ownerInputActionPacketGeneratedAt: ownerInputActionPacket.generatedAt,
      ownerClosureWorkOrderBundleGeneratedAt: ownerClosureWorkOrderBundle.generatedAt,
      focusBatchRecordingIntakeGeneratedAt: focusBatchRecordingIntake.generatedAt,
      a16ExecutionInstructionInputScaffoldGeneratedAt: a16ExecutionInstructionInputScaffold.generatedAt,
      a16ExecutionInstructionOwnerInputGeneratedAt: a16ExecutionInstructionOwnerInput.generatedAt,
      a16ExecutionInstructionOwnerInputGateCheckedAt: a16ExecutionInstructionOwnerInputGate.checkedAt,
      a16PostExtractionVerificationReportGeneratedAt: a16PostExtractionVerificationReport.generatedAt
    },
    loopOrder,
    activeStep,
    steps,
    summary: {
      completedSteps: steps.filter((step) => step.status === "complete").length,
      activeSteps: steps.filter((step) => step.status === "active").length,
      blockedSteps: steps.filter((step) => step.status === "blocked").length,
      authorizationStarterRows: count(previewSummary.starterRows),
      pendingCanonicalAuthorizationRows,
      validAuthorizationRows,
      focusBatchRecordingIntakeStatus,
      focusBatchRows,
      focusBatchAcceptedRows,
      focusBatchPendingRows,
      focusBatchOwnerInputVisibleRows,
      readyExecutionInstructionRows,
      validExecutionInstructionRows,
      pendingReadyExecutionInstructionRows: Math.max(readyExecutionInstructionRows - validExecutionInstructionRows, 0),
      a16ReadyForSeparateInstructionRows,
      a16ReadyForOwnerExecutionInstructionRows,
      a16ValidExecutionInstructionRows,
      a16ExecutionInstructionFrontierRows,
      a16PendingOwnerExecutionInstructionRows,
      a16InstructionRows: count(a16OwnerInputGateSummary.instructionRows),
      a16DraftInstructionRows: count(a16OwnerInputSummary.draftInstructionRows),
      a16PackageFileRows: count(a16PostExtractionSummary.packageFileRows),
      a16PackageFingerprintRows: count(a16PostExtractionSummary.packageFingerprintRows),
      a16PostExtractionLifecycleStatus,
      a16PostExtractionVerified,
      a16PostExtractionFailedChecks: count(a16PostExtractionSummary.failedChecks),
      effectiveReadyExecutionInstructionRows,
      effectiveValidExecutionInstructionRows,
      effectivePendingReadyExecutionInstructionRows,
      preAuthorizationReadyRows: count(previewSummary.preAuthorizationReadyRows),
      preAuthorizationAttentionRows: count(previewSummary.preAuthorizationAttentionRows),
      exactCommandRows: count(previewSummary.exactCommandRows),
      exactCommandTargetReadyRows: count(previewSummary.exactCommandTargetReadyRows),
      ownerClosurePendingItems: count(inputSummary.ownerClosurePendingItems),
      cleanupAuthorizedRows,
      executableRows,
      releaseSourceClean: releaseSummary.releaseSourceClean === true,
      strictLifecycleClean: lifecycleSummary.strictLifecycleClean === true,
      validationHoldStatus,
      sourceCurrentnessFailures: sourceCurrentnessFailures.length
    },
    sourceCurrentnessFailures,
    boundary: {
      evidenceOnly: true,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false,
      mergeAuthorized: false,
      physicalCleanupAuthorized: false
    }
  };
}

export function stableDirtyWorktreeClosureLoopStateProjection(payload) {
  const sourceArtifacts = { ...(payload.sourceArtifacts ?? {}) };
  delete sourceArtifacts.executionInstructionsCheckedAt;
  delete sourceArtifacts.a16ExecutionInstructionOwnerInputGateCheckedAt;
  return {
    repoRoot: payload.repoRoot,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts,
    loopOrder: payload.loopOrder,
    activeStep: payload.activeStep,
    steps: payload.steps,
    summary: payload.summary,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    boundary: payload.boundary
  };
}

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function markdown(payload) {
  const rows = payload.steps.map((step) => (
    `| ${step.chineseLabel} | ${step.id} | ${step.status} | ${step.checks.filter((row) => row.passed).length}/${step.checks.length} | ${cell(step.blockers.slice(0, 3).join("; ") || "none")} |`
  )).join("\n");
  const details = payload.steps.map((step) => {
    const checkRows = step.checks.map((row) => (
      `| ${cell(row.label)} | ${row.passed ? "yes" : "no"} | ${cell(row.blocker || "none")} |`
    )).join("\n");
    return `## ${step.chineseLabel} / ${step.label}

Purpose: ${step.purpose}

Status: ${step.status}

Next gate: ${step.nextGate}

| Check | Passed | Blocker |
| --- | --- | --- |
${checkRows}
`;
  }).join("\n");

  return `# A25 Dirty-Worktree Closure Loop State

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This artifact maps the MAIS-MVP dirty-worktree cleanup into the requested loop: 切片 -> 提取 -> 验证 -> 合并 -> 清理. It is evidence-only. It does not authorize staging, committing, merging, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, cleanup apply, or any other physical cleanup.

## Summary

- Active step: ${payload.activeStep}
- Completed steps: ${payload.summary.completedSteps}/${payload.steps.length}
- Blocked steps: ${payload.summary.blockedSteps}
- Authorization starter rows: ${payload.summary.authorizationStarterRows}
- Pending canonical authorization rows: ${payload.summary.pendingCanonicalAuthorizationRows}
- Valid authorization rows: ${payload.summary.validAuthorizationRows}
- Focus batch owner-authorization intake: ${payload.summary.focusBatchRecordingIntakeStatus}
- Focus batch accepted rows: ${payload.summary.focusBatchAcceptedRows}/${payload.summary.focusBatchRows}
- Focus batch pending rows: ${payload.summary.focusBatchPendingRows}
- Focus batch owner-input visible rows: ${payload.summary.focusBatchOwnerInputVisibleRows}
- Ready command rows needing separate execution instructions: ${payload.summary.readyExecutionInstructionRows}
- Valid owner execution instruction rows: ${payload.summary.validExecutionInstructionRows}
- Pending ready command rows without execution instructions: ${payload.summary.pendingReadyExecutionInstructionRows}
- A16 ready separate-instruction rows: ${payload.summary.a16ReadyForSeparateInstructionRows}
- A16 ready owner execution-input rows: ${payload.summary.a16ReadyForOwnerExecutionInstructionRows}
- A16 valid execution instruction rows: ${payload.summary.a16ValidExecutionInstructionRows}
- A16 pending owner execution instruction rows: ${payload.summary.a16PendingOwnerExecutionInstructionRows}
- A16 post-extraction lifecycle: ${payload.summary.a16PostExtractionLifecycleStatus}
- A16 post-extraction verified: ${payload.summary.a16PostExtractionVerified ? "yes" : "no"}
- Effective ready owner execution-input rows: ${payload.summary.effectiveReadyExecutionInstructionRows}
- Effective valid owner execution instruction rows: ${payload.summary.effectiveValidExecutionInstructionRows}
- Effective pending owner execution instruction rows: ${payload.summary.effectivePendingReadyExecutionInstructionRows}
- Pre-authorization ready rows: ${payload.summary.preAuthorizationReadyRows}
- Pre-authorization attention rows: ${payload.summary.preAuthorizationAttentionRows}
- Exact command targets ready: ${payload.summary.exactCommandTargetReadyRows}/${payload.summary.exactCommandRows}
- Owner closure pending items: ${payload.summary.ownerClosurePendingItems}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}
- Release source clean: ${payload.summary.releaseSourceClean ? "yes" : "no"}
- Strict lifecycle clean: ${payload.summary.strictLifecycleClean ? "yes" : "no"}
- Validation hold: ${payload.summary.validationHoldStatus}
- Source currentness failures: ${payload.summary.sourceCurrentnessFailures}

| Chinese step | Step ID | Status | Checks passed | Blockers |
| --- | --- | --- | ---: | --- |
${rows}

${details}

## Boundary

Every row remains non-executable. Merge and cleanup require separately recorded owner authorization, clean-source validation, and a separate owner instruction naming exact approval IDs and exact commands.
`;
}

function main() {
  const payload = buildDirtyWorktreeClosureLoopState();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.latestJson, json);
  write(DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.datedJson, json);
  write(DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.latestMarkdown, md);
  write(DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.datedMarkdown, md);
  console.log(JSON.stringify({
    latestJson: DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.latestJson,
    latestMarkdown: DIRTY_WORKTREE_CLOSURE_LOOP_STATE_PATHS.latestMarkdown,
    activeStep: payload.activeStep,
    completedSteps: payload.summary.completedSteps,
    blockedSteps: payload.summary.blockedSteps,
    pendingCanonicalAuthorizationRows: payload.summary.pendingCanonicalAuthorizationRows,
    preAuthorizationReadyRows: payload.summary.preAuthorizationReadyRows,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
