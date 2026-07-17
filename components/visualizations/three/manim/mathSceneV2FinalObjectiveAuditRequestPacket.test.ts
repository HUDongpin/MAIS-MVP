import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { buildVisualizationBrowserRegressionEvidenceMatrix } from "../../visualizationBrowserRegressionEvidence";
import { buildVisualizationBrowserRegressionPlan } from "../../visualizationBrowserRegressionPackages";
import { buildVisualizationReleaseReadinessEvidence } from "../../visualizationReleaseReadinessEvidence";
import { buildManimReviewPackageHandoffMatrix } from "./mathSceneReviewPackageHandoff";
import { buildManimReviewPackageMatrix, classifyManimReviewPackage } from "./mathSceneReviewPackages";
import { buildManimReviewPackageSliceMatrix } from "./mathSceneReviewPackageSlices";
import { buildMathSceneTeachingFinalDecisionIntake } from "./mathSceneTeachingFinalDecisionIntake";
import { buildMathSceneTeachingFinalDecisionLedger } from "./mathSceneTeachingFinalDecisionLedger";
import { buildMathSceneTeachingFinalReviewPacket } from "./mathSceneTeachingFinalReviewPacket";
import { buildMathSceneTeachingInspectionTargetQueue } from "./mathSceneTeachingInspectionTargets";
import { buildMathSceneTeachingRenderedReviewRoutes } from "./mathSceneTeachingRenderedReviewRoutes";
import { buildMathSceneTeachingReviewDossier } from "./mathSceneTeachingReviewDossier";
import { buildMathSceneTeachingSignoffMatrix } from "./mathSceneTeachingSignoffMatrix";
import {
  browserRegressionLabs,
  renderedReviewLabs
} from "./mathSceneV2CatalogDecoupledFixtures";
import { buildMathSceneV2ClosureEvidencePackage } from "./mathSceneV2ClosureEvidencePackage";
import { buildMathSceneV2CompletionAcceptanceChecklist } from "./mathSceneV2CompletionAcceptanceChecklist";
import { buildMathSceneV2CompletionClosureQueue } from "./mathSceneV2CompletionClosureQueue";
import { buildMathSceneV2CompletionEvidenceIntake } from "./mathSceneV2CompletionEvidenceIntake";
import { buildMathSceneV2CompletionRerunPlan } from "./mathSceneV2CompletionRerunPlan";
import { buildMathSceneV2CompletionStatusSummary } from "./mathSceneV2CompletionStatusSummary";
import { buildMathSceneV2CrossAgentHandoff } from "./mathSceneV2CrossAgentHandoff";
import {
  buildMathSceneV2FinalObjectiveAuditRequestPacketFromOwnerGateRerunSubmissionBridge,
  buildMathSceneV2FinalObjectiveAuditRequestPacket,
  mathSceneV2FinalObjectiveAuditRequestPacketDataAttributes,
  MATH_SCENE_V2_FINAL_OBJECTIVE_AUDIT_REQUEST_PACKET_SOURCE_CONTRACT
} from "./mathSceneV2FinalObjectiveAuditRequestPacket";
import { buildMathSceneV2GoalGate } from "./mathSceneV2GoalGate";
import { buildMathSceneV2ObjectiveCompletionAudit } from "./mathSceneV2ObjectiveCompletionAudit";
import {
  buildMathSceneV2OwnerGateRerunCommandEvidenceIntake,
  type MathSceneV2OwnerGateRerunCommandEvidenceRecord
} from "./mathSceneV2OwnerGateRerunCommandEvidenceIntake";
import {
  buildMathSceneV2OwnerGateRerunCommandPacket,
  type MathSceneV2OwnerGateRerunCommandPacket
} from "./mathSceneV2OwnerGateRerunCommandPacket";
import type { MathSceneV2OwnerGateCurrentBlockerSnapshot } from "./mathSceneV2OwnerGateCurrentBlockerSnapshot";
import { buildMathSceneV2OwnerEvidenceRequestPacket } from "./mathSceneV2OwnerEvidenceRequestPacket";
import {
  buildMathSceneV2OwnerEvidenceSubmissionCompletionBridge,
  buildMathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordSubmissionBridge
} from "./mathSceneV2OwnerEvidenceSubmissionIntake";
import { buildMathSceneV2ReleaseSliceManifest } from "./mathSceneV2ReleaseSliceManifest";
import { MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT } from "./mathSceneV2SourceArchitectureHandoff";

const manimDir = "components/visualizations/three/manim";

function currentManimFileNames() {
  return fs
    .readdirSync(manimDir)
    .filter((fileName) => [".ts", ".tsx"].includes(path.extname(fileName)))
    .sort();
}

function acceptedRecordsForEveryRequiredEvidence(
  checklist: ReturnType<typeof buildMathSceneV2CompletionAcceptanceChecklist>
) {
  return checklist.actions.flatMap((action) =>
    action.verificationEvidenceIds.map((evidenceId) => ({
      actionId: action.actionId,
      evidenceId,
      ownerAgentIds: action.ownerAgentIds,
      status: "accepted" as const
    }))
  );
}

function requestFixture() {
  const browserPlan = buildVisualizationBrowserRegressionPlan(browserRegressionLabs as never, { maxLabsPerPackage: 8 });
  const browserEvidence = buildVisualizationBrowserRegressionEvidenceMatrix(browserPlan);
  const teachingSignoff = buildMathSceneTeachingSignoffMatrix();
  const releaseReadiness = buildVisualizationReleaseReadinessEvidence({
    browserEvidence,
    teachingSignoff
  });
  const reviewPackages = buildManimReviewPackageMatrix(currentManimFileNames());
  const reviewSlices = buildManimReviewPackageSliceMatrix(reviewPackages, { maxFilesPerSlice: 24 });
  const teachingDossier = buildMathSceneTeachingReviewDossier();
  const teachingRenderedRoutes = buildMathSceneTeachingRenderedReviewRoutes(
    buildMathSceneTeachingInspectionTargetQueue(),
    renderedReviewLabs
  );
  const teachingFinalDecisionLedger = buildMathSceneTeachingFinalDecisionLedger(
    buildMathSceneTeachingFinalReviewPacket({
      dossier: teachingDossier,
      renderedRoutes: teachingRenderedRoutes
    })
  );
  const goalGate = buildMathSceneV2GoalGate({
    browserEvidence,
    releaseReadiness,
    reviewPackages,
    reviewSlices,
    teachingDossier
  });
  const releaseSliceManifest = buildMathSceneV2ReleaseSliceManifest({
    releaseReadiness,
    reviewPackages
  });
  const crossAgentHandoff = buildMathSceneV2CrossAgentHandoff({
    browserEvidence,
    goalGate,
    releaseReadiness,
    releaseSliceManifest,
    reviewHandoff: buildManimReviewPackageHandoffMatrix(reviewPackages),
    reviewSlices,
    teachingDossier,
    teachingFinalDecisionLedger,
    teachingRenderedRoutes
  });
  const acceptanceChecklist = buildMathSceneV2CompletionAcceptanceChecklist(
    buildMathSceneV2CompletionClosureQueue(crossAgentHandoff)
  );
  const evidenceIntake = buildMathSceneV2CompletionEvidenceIntake(
    acceptanceChecklist,
    acceptedRecordsForEveryRequiredEvidence(acceptanceChecklist)
  );
  const completionStatus = buildMathSceneV2CompletionStatusSummary({
    acceptanceChecklist,
    evidenceIntake,
    goalGate,
    releaseSliceManifest,
    reviewPackages,
    reviewSlices
  });
  const objectiveAudit = buildMathSceneV2ObjectiveCompletionAudit({
    completionStatus,
    crossAgentHandoff,
    evidenceIntake,
    teachingFinalDecisionIntake: buildMathSceneTeachingFinalDecisionIntake(teachingFinalDecisionLedger, [])
  });
  const ownerEvidenceRequestPacket = buildMathSceneV2OwnerEvidenceRequestPacket({
    acceptanceChecklist,
    evidenceIntake,
    reviewSlices
  });
  const rerunPlan = buildMathSceneV2CompletionRerunPlan(
    buildMathSceneV2ClosureEvidencePackage({
      objectiveAudit,
      ownerEvidenceRequestPacket
    })
  );
  const commandPacket = buildMathSceneV2OwnerGateRerunCommandPacket({
    browserPlan,
    releaseRunId: "manim-v2-final-objective-audit-request-test",
    rerunPlan,
    teachingRenderedRoutes
  });

  return {
    acceptanceChecklist,
    commandPacket,
    ownerEvidenceRequestPacket,
    rerunPlan,
    objectiveAudit,
    reviewSlices
  };
}

function acceptedCommandRecords(
  commandPacket: MathSceneV2OwnerGateRerunCommandPacket
): MathSceneV2OwnerGateRerunCommandEvidenceRecord[] {
  return commandPacket.ownerPackets.flatMap((ownerPacket) =>
    ownerPacket.rows.map((row) => ({
      evidenceId: `accepted-${row.ownerAgentId}-${row.evidenceId}`,
      ownerAgentId: row.ownerAgentId,
      rowEvidenceId: row.evidenceId,
      status: "accepted" as const
    }))
  );
}

function ownerSubmittedRecordsFromPacket(
  packet: ReturnType<typeof buildMathSceneV2OwnerEvidenceRequestPacket>
) {
  return packet.submissionRecordTemplates.map((template) => ({
    actionId: template.actionId,
    evidenceId: template.evidenceId,
    ownerAgentIds: template.ownerAgentIds,
    status: template.status,
    submitterAgentId: template.submitterAgentId
  }));
}

function acceptedOwnerGateRerunRecordsFromPlan(rerunPlan: ReturnType<typeof buildMathSceneV2CompletionRerunPlan>) {
  return rerunPlan.steps
    .filter((step) => step.kind === "owner-gate-rerun")
    .map((step) => ({
      evidenceId: `accepted-${step.ownerAgentIds[0]}-gate-rerun`,
      ownerAgentId: step.ownerAgentIds[0],
      rerunTarget: step.rerunTarget,
      status: "accepted" as const,
      stepId: step.stepId
    }));
}

function currentBlockerSnapshotFixture(): MathSceneV2OwnerGateCurrentBlockerSnapshot {
  return {
    blockerManifest:
      "A11:missing-owner-report-artifact:submit-owner-report-artifact;A11:open-owner-action:a11-browser-visual-interaction-regression:update-projection-views-expected-list;A18:missing-owner-report-artifact:submit-owner-report-artifact;A22:missing-owner-report-artifact:submit-owner-report-artifact",
    blockers: [],
    canMarkThreadGoalComplete: false,
    checkedAtHkt: "2026-07-03 22:10 HKT",
    missingReportArtifactCount: 3,
    openA11ActionIds: ["a11-browser-visual-interaction-regression:update-projection-views-expected-list"],
    openOwnerActionCount: 1,
    openOwnerActionManifest: "A11=a11-browser-visual-interaction-regression:update-projection-views-expected-list",
    readyForFinalObjectiveAuditInput: false,
    remainingOwnerAgentIds: ["A11", "A18", "A22"],
    resolvedA06FindingCount: 1,
    sourceContract:
      "MAIS Manim v2 owner gate current blocker snapshot: combines canonical owner report gaps, intake status, and current A06-observed browser follow-ups without accepting owner gates",
    status: "blocked-missing-owner-report-artifacts",
    summary:
      "mathSceneV2OwnerGateCurrentBlockerSnapshot:status=blocked-missing-owner-report-artifacts:missingReports=3:openOwnerActions=1:openA11Actions=a11-browser-visual-interaction-regression:update-projection-views-expected-list:readyForFinalObjectiveAuditInput=false"
  };
}

function ownerGateRerunSubmissionBridgeFixture({
  useStaleReviewSlices = false,
  useStalePlan = false,
  withSubmittedOwnerGateRerunRecords = true
}: {
  useStaleReviewSlices?: boolean;
  useStalePlan?: boolean;
  withSubmittedOwnerGateRerunRecords?: boolean;
} = {}) {
  const {
    acceptanceChecklist,
    reviewSlices,
    rerunPlan
  } = requestFixture();
  const ownerEvidenceRequestPacket = buildMathSceneV2OwnerEvidenceRequestPacket({
    acceptanceChecklist,
    evidenceIntake: buildMathSceneV2CompletionEvidenceIntake(acceptanceChecklist, []),
    reviewSlices
  });
  const staleRerunPlan = {
    ...rerunPlan,
    steps: rerunPlan.steps.map((step) =>
      step.stepId === "02-owner-gate-A18"
        ? { ...step, rerunTarget: "a22-clean-release-gate" as const }
        : step
    )
  };
  const staleReviewSliceRerunPlan = {
    ...rerunPlan,
    reviewSliceConsumerGateEvidenceIdManifest: "stale-review-slice=stale-gate:stale-evidence",
    reviewSliceCount: 19,
    reviewSliceFileManifest: "stale-review-slice=stale.ts",
    reviewSliceIds: "stale-review-slice",
    reviewSliceSummary: "19@24"
  };
  const selectedRerunPlan = useStalePlan
    ? staleRerunPlan
    : useStaleReviewSlices
    ? staleReviewSliceRerunPlan
    : rerunPlan;
  const submissionBridge = buildMathSceneV2OwnerEvidenceSubmissionCompletionBridge({
    acceptanceChecklist,
    ownerEvidenceRequestPacket,
    submittedRecords: ownerSubmittedRecordsFromPacket(ownerEvidenceRequestPacket)
  });

  return buildMathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordSubmissionBridge({
    rerunPlan: selectedRerunPlan,
    submissionBridge,
    submittedOwnerGateRerunRecords: withSubmittedOwnerGateRerunRecords
      ? acceptedOwnerGateRerunRecordsFromPlan(rerunPlan)
      : []
  });
}

test("MAIS Manim v2 final objective audit request packet asks for final 4-of-4 evidence after owner gates are covered", () => {
  const { commandPacket, objectiveAudit } = requestFixture();
  const commandEvidenceIntake = buildMathSceneV2OwnerGateRerunCommandEvidenceIntake(
    commandPacket,
    acceptedCommandRecords(commandPacket)
  );
  const packet = buildMathSceneV2FinalObjectiveAuditRequestPacket({
    commandEvidenceIntake,
    objectiveAudit
  });

  assert.equal(packet.sourceContract, MATH_SCENE_V2_FINAL_OBJECTIVE_AUDIT_REQUEST_PACKET_SOURCE_CONTRACT);
  assert.equal(packet.status, "pending-final-objective-audit-record");
  assert.equal(packet.readyForFinalObjectiveAuditRecord, true);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(packet.currentProvenRequirementCount, 1);
  assert.equal(packet.requiredProvenRequirementCount, 4);
  assert.equal(packet.pendingRequirementCount, 3);
  assert.deepEqual(packet.remainingOwnerAgentIds, ["A11", "A18", "A22"]);
  assert.deepEqual(packet.ownerGateRerunEvidenceIds, [
    "accepted-A11-command-evidence-covered",
    "accepted-A18-command-evidence-covered",
    "accepted-A22-command-evidence-covered"
  ]);
  assert.equal(
    (packet as { ownerActionEvidenceCountManifest?: string }).ownerActionEvidenceCountManifest,
    commandEvidenceIntake.ownerActionEvidenceCountManifest
  );
  assert.equal(
    (packet as { ownerAcceptanceCriteriaManifest?: string }).ownerAcceptanceCriteriaManifest,
    commandEvidenceIntake.ownerAcceptanceCriteriaManifest
  );
  assert.equal(
    (packet as { ownerEvidenceRequirementManifest?: string }).ownerEvidenceRequirementManifest,
    commandEvidenceIntake.ownerEvidenceRequirementManifest
  );
  assert.deepEqual(packet.requiredFinalAuditFields, [
    "evidenceId",
    "target",
    "status",
    "provenRequirementCount",
    "requirementCount",
    "ownerGateRerunEvidenceIds",
    "requirementProofEvidenceIds"
  ]);
  assert.equal(packet.finalAuditRecordTemplate.target, "mathSceneV2ObjectiveCompletionAudit");
  assert.equal(packet.finalAuditRecordTemplate.requiredStatus, "accepted");
  assert.equal(packet.finalAuditRecordTemplate.provenRequirementCount, 4);
  assert.equal(packet.finalAuditRecordTemplate.requirementCount, 4);
  assert.equal(packet.finalAuditRecordTemplate.requirementProofEvidenceIds.length, 4);
  assert.ok(packet.finalAuditRecordTemplate.requirementProofEvidenceIds.includes(
    "a18-a06-teaching-quality-confirmation:final-owner-proof:pending-a18-final-decisions"
  ));
  assert.equal(packet.requirementRows.length, 4);
  assert.equal(packet.requirementRows.filter((row) => row.status === "current-source-proven").length, 1);
  assert.equal(packet.requirementRows.filter((row) => row.status === "pending-final-audit-proof").length, 3);
});

test("MAIS Manim v2 final objective audit request packet carries current blocker snapshot before final audit", () => {
  const { commandPacket, objectiveAudit } = requestFixture();
  const commandEvidenceIntake = buildMathSceneV2OwnerGateRerunCommandEvidenceIntake(
    commandPacket,
    acceptedCommandRecords(commandPacket)
  );
  const currentBlockerSnapshot = currentBlockerSnapshotFixture();
  const packet = buildMathSceneV2FinalObjectiveAuditRequestPacket({
    commandEvidenceIntake,
    currentBlockerSnapshot,
    objectiveAudit
  });
  const attributes = mathSceneV2FinalObjectiveAuditRequestPacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-current-owner-gate-blockers");
  assert.equal(packet.readyForFinalObjectiveAuditRecord, false);
  assert.equal(packet.currentBlockerSnapshotStatus, "blocked-missing-owner-report-artifacts");
  assert.equal(packet.currentBlockerReadyForFinalObjectiveAuditInput, false);
  assert.equal(packet.currentBlockerMissingReportArtifactCount, 3);
  assert.equal(packet.currentBlockerOpenOwnerActionCount, 1);
  assert.deepEqual(packet.currentBlockerRemainingOwnerAgentIds, ["A11", "A18", "A22"]);
  assert.deepEqual(packet.currentBlockerOpenA11ActionIds, [
    "a11-browser-visual-interaction-regression:update-projection-views-expected-list"
  ]);
  assert.equal(
    packet.currentBlockerManifest,
    currentBlockerSnapshot.blockerManifest
  );
  assert.match(packet.summary, /currentBlockers=blocked-missing-owner-report-artifacts/);
  assert.equal(attributes["data-viz-manim-v2-final-objective-audit-request-current-blocker-status"], "blocked-missing-owner-report-artifacts");
  assert.equal(attributes["data-viz-manim-v2-final-objective-audit-request-current-blocker-ready"], "false");
  assert.equal(attributes["data-viz-manim-v2-final-objective-audit-request-current-blocker-missing-report-count"], "3");
  assert.equal(attributes["data-viz-manim-v2-final-objective-audit-request-current-blocker-open-action-count"], "1");
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-request-current-blocker-open-a11-actions"],
    "a11-browser-visual-interaction-regression:update-projection-views-expected-list"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-request-current-blocker-remaining-owners"],
    "A11,A18,A22"
  );
});

test("MAIS Manim v2 final objective audit request packet can use real owner gate rerun submissions", () => {
  const { objectiveAudit, rerunPlan } = requestFixture();
  const ownerGateRerunSubmissionBridge = ownerGateRerunSubmissionBridgeFixture();
  ownerGateRerunSubmissionBridge.ownerGateRerunIntake.sourceArchitectureBulkCourseGenerationAllowed = false;
  ownerGateRerunSubmissionBridge.ownerGateRerunIntake.sourceArchitectureFutureInvocationScope =
    "one-topic-one-concept-cluster-or-one-review-slice";
  ownerGateRerunSubmissionBridge.ownerGateRerunIntake.sourceArchitectureHandoffStatus =
    "source-architecture-ready-owner-gates-open";
  ownerGateRerunSubmissionBridge.ownerGateRerunIntake.sourceArchitectureOpenOwnerGateIds = [
    "a11-browser-visual-interaction-regression",
    "a18-a06-teaching-quality-confirmation",
    "a22-clean-release-gate"
  ];
  ownerGateRerunSubmissionBridge.ownerGateRerunIntake.sourceArchitectureRequiredOwnerGateIds = [
    "a11-browser-visual-interaction-regression",
    "a18-a06-teaching-quality-confirmation",
    "a22-clean-release-gate"
  ];
  ownerGateRerunSubmissionBridge.ownerGateRerunIntake.sourceArchitectureSourceContract =
    MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT;
  ownerGateRerunSubmissionBridge.ownerGateRerunIntake.sourceArchitectureSummary =
    "mathSceneV2SourceArchitectureHandoff:status=source-architecture-ready-owner-gates-open:bulkCourseGenerationAllowed=false";
  const packet = buildMathSceneV2FinalObjectiveAuditRequestPacketFromOwnerGateRerunSubmissionBridge({
    objectiveAudit,
    ownerGateRerunSubmissionBridge
  });
  const attributes = mathSceneV2FinalObjectiveAuditRequestPacketDataAttributes(packet);

  assert.equal(ownerGateRerunSubmissionBridge.status, "owner-gate-rerun-submissions-covered");
  assert.equal(packet.status, "pending-final-objective-audit-record");
  assert.equal(packet.readyForFinalObjectiveAuditRecord, true);
  assert.equal(packet.ownerGateRerunSource, "owner-gate-rerun-submission-bridge");
  assert.equal(packet.ownerGateRerunSourceStatus, "owner-gate-rerun-submissions-covered");
  assert.equal(
    packet.ownerGateRerunAcceptedSubmittedRecordManifest,
    ownerGateRerunSubmissionBridge.acceptedSubmittedRecordManifest
  );
  assert.equal(packet.ownerGateRerunMissingTemplateManifest, ownerGateRerunSubmissionBridge.missingTemplateManifest);
  assert.equal(
    packet.ownerGateRerunInvalidSubmittedRecordManifest,
    ownerGateRerunSubmissionBridge.invalidSubmittedRecordManifest
  );
  assert.equal(
    (packet as { ownerActionEvidenceCountManifest?: string }).ownerActionEvidenceCountManifest,
    rerunPlan.ownerActionEvidenceCountManifest
  );
  assert.equal(
    (packet as { ownerAcceptanceCriteriaManifest?: string }).ownerAcceptanceCriteriaManifest,
    rerunPlan.ownerAcceptanceCriteriaManifest
  );
  assert.equal(
    (packet as { ownerEvidenceRequirementManifest?: string }).ownerEvidenceRequirementManifest,
    rerunPlan.ownerEvidenceRequirementManifest
  );
  assert.equal(
    (packet as { reviewSliceCount?: number }).reviewSliceCount,
    ownerGateRerunSubmissionBridge.ownerGateRerunIntake.reviewSliceCount
  );
  assert.equal(
    (packet as { reviewSliceIds?: string }).reviewSliceIds,
    ownerGateRerunSubmissionBridge.ownerGateRerunIntake.reviewSliceIds
  );
  assert.equal(
    (packet as { reviewSliceFileManifest?: string }).reviewSliceFileManifest,
    ownerGateRerunSubmissionBridge.ownerGateRerunIntake.reviewSliceFileManifest
  );
  assert.equal(
    (packet as { reviewSliceConsumerGateEvidenceIdManifest?: string }).reviewSliceConsumerGateEvidenceIdManifest,
    ownerGateRerunSubmissionBridge.ownerGateRerunIntake.reviewSliceConsumerGateEvidenceIdManifest
  );
  assert.equal(
    (packet as { a11RequiredRootDataAttributeCount?: number }).a11RequiredRootDataAttributeCount,
    ownerGateRerunSubmissionBridge.a11RequiredRootDataAttributeCount
  );
  assert.equal(
    (packet as { a11RunFromBeatCheckpointInvalidationDataAttributeManifest?: string })
      .a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    ownerGateRerunSubmissionBridge.a11RunFromBeatCheckpointInvalidationDataAttributeManifest
  );
  assert.equal(
    (packet as { sourceArchitectureHandoffStatus?: string }).sourceArchitectureHandoffStatus,
    ownerGateRerunSubmissionBridge.ownerGateRerunIntake.sourceArchitectureHandoffStatus
  );
  assert.equal(
    (packet as { sourceArchitectureBulkCourseGenerationAllowed?: boolean }).sourceArchitectureBulkCourseGenerationAllowed,
    ownerGateRerunSubmissionBridge.ownerGateRerunIntake.sourceArchitectureBulkCourseGenerationAllowed
  );
  assert.equal(
    (packet as { sourceArchitectureFutureInvocationScope?: string }).sourceArchitectureFutureInvocationScope,
    ownerGateRerunSubmissionBridge.ownerGateRerunIntake.sourceArchitectureFutureInvocationScope
  );
  assert.equal(
    (packet as { sourceArchitectureSourceContract?: string }).sourceArchitectureSourceContract,
    ownerGateRerunSubmissionBridge.ownerGateRerunIntake.sourceArchitectureSourceContract
  );
  assert.deepEqual(
    (packet as { sourceArchitectureOpenOwnerGateIds?: string[] }).sourceArchitectureOpenOwnerGateIds,
    ownerGateRerunSubmissionBridge.ownerGateRerunIntake.sourceArchitectureOpenOwnerGateIds
  );
  assert.deepEqual(packet.ownerGateRerunEvidenceIds, [
    "accepted-A11-gate-rerun",
    "accepted-A18-gate-rerun",
    "accepted-A22-gate-rerun"
  ]);
  assert.deepEqual(packet.finalAuditRecordTemplate.ownerGateRerunEvidenceIds, packet.ownerGateRerunEvidenceIds);
  assert.equal(attributes["data-viz-manim-v2-final-objective-audit-request-owner-gate-source"], "owner-gate-rerun-submission-bridge");
  assert.equal(attributes["data-viz-manim-v2-final-objective-audit-request-owner-gate-source-status"], "owner-gate-rerun-submissions-covered");
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-request-owner-gate-accepted-submitted-record-manifest"],
    ownerGateRerunSubmissionBridge.acceptedSubmittedRecordManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-request-owner-gate-missing-template-manifest"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-request-owner-gate-invalid-submitted-record-manifest"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-request-owner-action-evidence-count-manifest"],
    rerunPlan.ownerActionEvidenceCountManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-request-owner-acceptance-criteria-manifest"],
    rerunPlan.ownerAcceptanceCriteriaManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-request-owner-evidence-requirement-manifest"],
    rerunPlan.ownerEvidenceRequirementManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-request-review-slice-count"],
    String(ownerGateRerunSubmissionBridge.ownerGateRerunIntake.reviewSliceCount)
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-request-review-slice-ids"],
    ownerGateRerunSubmissionBridge.ownerGateRerunIntake.reviewSliceIds
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-request-review-slice-file-manifest"],
    ownerGateRerunSubmissionBridge.ownerGateRerunIntake.reviewSliceFileManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-request-review-slice-consumer-gate-evidence-id-manifest"],
    ownerGateRerunSubmissionBridge.ownerGateRerunIntake.reviewSliceConsumerGateEvidenceIdManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-request-a11-required-root-attribute-count"],
    String(ownerGateRerunSubmissionBridge.a11RequiredRootDataAttributeCount)
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-request-a11-run-from-beat-checkpoint-invalidation-attributes"],
    ownerGateRerunSubmissionBridge.a11RunFromBeatCheckpointInvalidationDataAttributeManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-request-source-architecture-status"],
    ownerGateRerunSubmissionBridge.ownerGateRerunIntake.sourceArchitectureHandoffStatus
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-request-source-architecture-bulk-course-generation"],
    String(ownerGateRerunSubmissionBridge.ownerGateRerunIntake.sourceArchitectureBulkCourseGenerationAllowed)
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-request-source-architecture-future-invocation-scope"],
    ownerGateRerunSubmissionBridge.ownerGateRerunIntake.sourceArchitectureFutureInvocationScope
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-request-source-architecture-open-owner-gates"],
    ownerGateRerunSubmissionBridge.ownerGateRerunIntake.sourceArchitectureOpenOwnerGateIds.join(",") || "none"
  );
  assert.match(packet.summary, /a11RootAttributes=5/);
  assert.match(packet.summary, new RegExp(`reviewSlices=${ownerGateRerunSubmissionBridge.reviewSliceSummary}`));
  assert.match(packet.summary, /sourceArchitecture=/);
});

test("MAIS Manim v2 final objective audit request packet carries owner-gate rerun bridge source-architecture blocker reasons", () => {
  const { objectiveAudit } = requestFixture();
  const ownerGateRerunSubmissionBridge = ownerGateRerunSubmissionBridgeFixture();
  ownerGateRerunSubmissionBridge.sourceArchitectureBlockerReasonManifest =
    "duplicateReviewSliceFiles,unclassifiedManimFiles";
  ownerGateRerunSubmissionBridge.sourceArchitectureBlockerReasons = [
    "duplicateReviewSliceFiles",
    "unclassifiedManimFiles"
  ];
  const packet = buildMathSceneV2FinalObjectiveAuditRequestPacketFromOwnerGateRerunSubmissionBridge({
    objectiveAudit,
    ownerGateRerunSubmissionBridge
  });
  const attributes = mathSceneV2FinalObjectiveAuditRequestPacketDataAttributes(packet);

  assert.deepEqual(
    (packet as { sourceArchitectureBlockerReasons?: unknown }).sourceArchitectureBlockerReasons,
    ownerGateRerunSubmissionBridge.sourceArchitectureBlockerReasons
  );
  assert.equal(
    (packet as { sourceArchitectureBlockerReasonManifest?: string }).sourceArchitectureBlockerReasonManifest,
    ownerGateRerunSubmissionBridge.sourceArchitectureBlockerReasonManifest
  );
  assert.match(packet.summary, /sourceBlockers=duplicateReviewSliceFiles,unclassifiedManimFiles/);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-request-source-architecture-blocker-reasons"],
    "duplicateReviewSliceFiles,unclassifiedManimFiles"
  );
});

test("MAIS Manim v2 final objective audit request packet keeps canonical bridge review-slice provenance when rerun-plan review slices are stale", () => {
  const { objectiveAudit } = requestFixture();
  const ownerGateRerunSubmissionBridge = ownerGateRerunSubmissionBridgeFixture({
    useStaleReviewSlices: true
  });
  const packet = buildMathSceneV2FinalObjectiveAuditRequestPacketFromOwnerGateRerunSubmissionBridge({
    objectiveAudit,
    ownerGateRerunSubmissionBridge
  });
  const attributes = mathSceneV2FinalObjectiveAuditRequestPacketDataAttributes(packet);

  assert.equal(ownerGateRerunSubmissionBridge.status, "owner-gate-rerun-submissions-covered");
  assert.equal(
    ownerGateRerunSubmissionBridge.ownerGateRerunIntake.reviewSliceSummary,
    "19@24"
  );
  assert.equal(
    (packet as { reviewSliceCount?: number }).reviewSliceCount,
    ownerGateRerunSubmissionBridge.reviewSliceCount
  );
  assert.equal(
    (packet as { reviewSliceIds?: string }).reviewSliceIds,
    ownerGateRerunSubmissionBridge.reviewSliceIds
  );
  assert.equal(
    (packet as { reviewSliceFileManifest?: string }).reviewSliceFileManifest,
    ownerGateRerunSubmissionBridge.reviewSliceFileManifest
  );
  assert.equal(
    (packet as { reviewSliceConsumerGateEvidenceIdManifest?: string }).reviewSliceConsumerGateEvidenceIdManifest,
    ownerGateRerunSubmissionBridge.reviewSliceConsumerGateEvidenceIdManifest
  );
  assert.equal(
    (packet as { reviewSliceSummary?: string }).reviewSliceSummary,
    ownerGateRerunSubmissionBridge.reviewSliceSummary
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-request-review-slice-count"],
    String(ownerGateRerunSubmissionBridge.reviewSliceCount)
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-request-review-slice-ids"],
    ownerGateRerunSubmissionBridge.reviewSliceIds
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-request-review-slice-file-manifest"],
    ownerGateRerunSubmissionBridge.reviewSliceFileManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-request-review-slice-consumer-gate-evidence-id-manifest"],
    ownerGateRerunSubmissionBridge.reviewSliceConsumerGateEvidenceIdManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-request-review-slices"],
    ownerGateRerunSubmissionBridge.reviewSliceSummary
  );
  assert.match(packet.summary, new RegExp(`reviewSlices=${ownerGateRerunSubmissionBridge.reviewSliceSummary}`));
});

test("MAIS Manim v2 final objective audit request packet blocks before real owner gate rerun submissions", () => {
  const { objectiveAudit } = requestFixture();
  const ownerGateRerunSubmissionBridge = ownerGateRerunSubmissionBridgeFixture({
    withSubmittedOwnerGateRerunRecords: false
  });
  const packet = buildMathSceneV2FinalObjectiveAuditRequestPacketFromOwnerGateRerunSubmissionBridge({
    objectiveAudit,
    ownerGateRerunSubmissionBridge
  });

  assert.equal(ownerGateRerunSubmissionBridge.status, "pending-owner-gate-rerun-submissions");
  assert.equal(packet.status, "blocked-owner-gate-reruns");
  assert.equal(packet.readyForFinalObjectiveAuditRecord, false);
  assert.deepEqual(packet.ownerGateRerunEvidenceIds, []);
  assert.equal(packet.ownerGateRerunSource, "owner-gate-rerun-submission-bridge");
  assert.equal(packet.ownerGateRerunSourceStatus, "pending-owner-gate-rerun-submissions");
});

test("MAIS Manim v2 final objective audit request packet blocks stale owner gate rerun submission bridges", () => {
  const { objectiveAudit } = requestFixture();
  const ownerGateRerunSubmissionBridge = ownerGateRerunSubmissionBridgeFixture({
    useStalePlan: true
  });
  const packet = buildMathSceneV2FinalObjectiveAuditRequestPacketFromOwnerGateRerunSubmissionBridge({
    objectiveAudit,
    ownerGateRerunSubmissionBridge
  });

  assert.equal(ownerGateRerunSubmissionBridge.status, "blocked-owner-gate-rerun-record-template-plan-alignment");
  assert.equal(packet.status, "blocked-owner-gate-reruns");
  assert.equal(packet.readyForFinalObjectiveAuditRecord, false);
  assert.deepEqual(packet.ownerGateRerunEvidenceIds, []);
  assert.equal(packet.ownerGateRerunSourceStatus, "blocked-owner-gate-rerun-record-template-plan-alignment");
});

test("MAIS Manim v2 final objective audit request packet blocks before owner gate reruns are covered", () => {
  const { commandPacket, objectiveAudit } = requestFixture();
  const commandEvidenceIntake = buildMathSceneV2OwnerGateRerunCommandEvidenceIntake(commandPacket, []);
  const packet = buildMathSceneV2FinalObjectiveAuditRequestPacket({
    commandEvidenceIntake,
    objectiveAudit
  });

  assert.equal(packet.status, "blocked-owner-gate-reruns");
  assert.equal(packet.readyForFinalObjectiveAuditRecord, false);
  assert.equal(packet.finalAuditRecordTemplate.target, "mathSceneV2ObjectiveCompletionAudit");
  assert.equal(packet.ownerGateRerunEvidenceIds.length, 0);
  assert.equal(packet.pendingRequirementCount, 3);
  assert.deepEqual(packet.remainingOwnerAgentIds, ["A11", "A18", "A22"]);
  assert.equal(packet.canMarkThreadGoalComplete, false);
});

test("MAIS Manim v2 final objective audit request packet exposes source-architecture blocker reasons", () => {
  const { commandPacket, objectiveAudit } = requestFixture();
  const commandEvidenceIntake = buildMathSceneV2OwnerGateRerunCommandEvidenceIntake(
    commandPacket,
    acceptedCommandRecords(commandPacket)
  );
  const sourceArchitectureBlockerReasons = ["reviewSliceStatus", "missingReviewSliceFiles"] as const;
  const packet = buildMathSceneV2FinalObjectiveAuditRequestPacket({
    commandEvidenceIntake,
    objectiveAudit: {
      ...objectiveAudit,
      sourceArchitectureBlockerReasonManifest: sourceArchitectureBlockerReasons.join(","),
      sourceArchitectureBlockerReasons: [...sourceArchitectureBlockerReasons]
    }
  });
  const attributes = mathSceneV2FinalObjectiveAuditRequestPacketDataAttributes(packet);

  assert.deepEqual(packet.sourceArchitectureBlockerReasons, [...sourceArchitectureBlockerReasons]);
  assert.equal(packet.sourceArchitectureBlockerReasonManifest, "reviewSliceStatus,missingReviewSliceFiles");
  assert.match(packet.summary, /sourceBlockers=reviewSliceStatus,missingReviewSliceFiles/);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-request-source-architecture-blocker-reasons"],
    "reviewSliceStatus,missingReviewSliceFiles"
  );
});

test("MAIS Manim v2 final objective audit request packet serializes stable handoff attributes", () => {
  const { commandPacket, objectiveAudit } = requestFixture();
  const commandEvidenceIntake = buildMathSceneV2OwnerGateRerunCommandEvidenceIntake(commandPacket, []);
  const packet = buildMathSceneV2FinalObjectiveAuditRequestPacket({
    commandEvidenceIntake,
    objectiveAudit
  });
  const attributes = mathSceneV2FinalObjectiveAuditRequestPacketDataAttributes(packet);

  assert.equal(classifyManimReviewPackage("mathSceneV2FinalObjectiveAuditRequestPacket.ts"), "evidence");
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-request-source-contract"],
    MATH_SCENE_V2_FINAL_OBJECTIVE_AUDIT_REQUEST_PACKET_SOURCE_CONTRACT
  );
  assert.equal(attributes["data-viz-manim-v2-final-objective-audit-request-status"], "blocked-owner-gate-reruns");
  assert.equal(attributes["data-viz-manim-v2-final-objective-audit-request-proven"], "1/4");
  assert.equal(attributes["data-viz-manim-v2-final-objective-audit-request-owner-gates"], "0");
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-request-owner-action-evidence-count-manifest"],
    commandEvidenceIntake.ownerActionEvidenceCountManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-request-owner-acceptance-criteria-manifest"],
    commandEvidenceIntake.ownerAcceptanceCriteriaManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-request-owner-evidence-requirement-manifest"],
    commandEvidenceIntake.ownerEvidenceRequirementManifest
  );
  assert.equal(attributes["data-viz-manim-v2-final-objective-audit-request-remaining-owners"], "A11,A18,A22");
  assert.equal(attributes["data-viz-manim-v2-final-objective-audit-request-ready"], "false");
  assert.equal(attributes["data-viz-manim-v2-final-objective-audit-request-can-complete"], "false");
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-request-record-template-manifest"],
    [
      "target:mathSceneV2ObjectiveCompletionAudit",
      "status:accepted",
      "proven:4",
      "requirements:4",
      "ownerGateEvidence:none",
      "proofs:a06-review-package-split:current-source:current-evidence-proves-requirement+a11-browser-visual-interaction-regression:final-owner-proof:missing-owner-evidence+a18-a06-teaching-quality-confirmation:final-owner-proof:pending-a18-final-decisions+a22-clean-release-gate:final-owner-proof:owner-gate-blocked"
    ].join("|")
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-request-requirement-proof-manifest"],
    [
      "a06-review-package-split=proof:a06-review-package-split:current-source:current-evidence-proves-requirement|status:current-source-proven|source:proven|owners:A06",
      "a11-browser-visual-interaction-regression=proof:a11-browser-visual-interaction-regression:final-owner-proof:missing-owner-evidence|status:pending-final-audit-proof|source:owner-action-required|owners:A11",
      "a22-clean-release-gate=proof:a22-clean-release-gate:final-owner-proof:owner-gate-blocked|status:pending-final-audit-proof|source:blocked-owner-action|owners:A22",
      "a18-a06-teaching-quality-confirmation=proof:a18-a06-teaching-quality-confirmation:final-owner-proof:pending-a18-final-decisions|status:pending-final-audit-proof|source:owner-action-required|owners:A18+A06"
    ].join(";")
  );
});
