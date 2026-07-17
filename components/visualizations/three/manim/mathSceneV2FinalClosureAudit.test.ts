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
import {
  buildMathSceneV2FinalClosureAudit,
  mathSceneV2FinalClosureAuditDataAttributes,
  MATH_SCENE_V2_FINAL_CLOSURE_AUDIT_SOURCE_CONTRACT,
  type MathSceneV2FinalClosureAuditRecord
} from "./mathSceneV2FinalClosureAudit";
import {
  buildMathSceneV2OwnerGateRerunIntake,
  type MathSceneV2OwnerGateRerunRecord
} from "./mathSceneV2OwnerGateRerunIntake";
import { MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT } from "./mathSceneV2SourceArchitectureHandoff";
import { buildMathSceneV2CompletionStatusSummary } from "./mathSceneV2CompletionStatusSummary";
import { buildMathSceneV2CrossAgentHandoff } from "./mathSceneV2CrossAgentHandoff";
import { buildMathSceneV2GoalGate } from "./mathSceneV2GoalGate";
import {
  buildMathSceneV2ObjectiveCompletionAudit,
  type MathSceneV2ObjectiveCompletionAudit
} from "./mathSceneV2ObjectiveCompletionAudit";
import { buildMathSceneV2OwnerEvidenceRequestPacket } from "./mathSceneV2OwnerEvidenceRequestPacket";
import { buildMathSceneV2ReleaseSliceManifest } from "./mathSceneV2ReleaseSliceManifest";

const manimDir = "components/visualizations/three/manim";
const requirementProofEvidenceIds = [
  "a06-review-package-split:current-source:current-evidence-proves-requirement",
  "a11-browser-visual-interaction-regression:final-owner-proof:missing-owner-evidence",
  "a18-a06-teaching-quality-confirmation:final-owner-proof:pending-a18-final-decisions",
  "a22-clean-release-gate:final-owner-proof:owner-gate-blocked"
] as const;
const finalOwnerClosurePacketStatus = "pending-owner-closure-submissions";
const finalOwnerClosureSubmissionBridgeVerifiedClosureGateAttributeNames = [
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-coverage-manifest",
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-ids",
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-owner-manifest",
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-status-manifest",
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-status"
] as const;
const finalOwnerClosureSubmissionBridgeVerifiedClosureGateCoverageManifest =
  "owner-gate-rerun-submission-bridge=1/1;final-objective-audit-request=1/1;final-objective-audit-record=1/1;final-objective-proof-ledger=4/4;verified-closure=4/4;final-closure-audit=1/1";
const finalOwnerClosureSubmissionBridgeVerifiedClosureGateIds =
  "owner-gate-rerun-submission-bridge,final-objective-audit-request,final-objective-audit-record,final-objective-proof-ledger,verified-closure,final-closure-audit";
const finalOwnerClosureSubmissionBridgeVerifiedClosureGateOwnerManifest =
  "owner-gate-rerun-submission-bridge=A11+A18+A22;final-objective-audit-request=A06;final-objective-audit-record=A06+A11+A18+A22;final-objective-proof-ledger=A06+A11+A18+A22;verified-closure=A06+A11+A18+A22;final-closure-audit=A06+A11+A18+A22";
const finalOwnerClosureSubmissionBridgeVerifiedClosureGateStatusManifest =
  "owner-gate-rerun-submission-bridge=owner-gate-rerun-submissions-covered;final-objective-audit-request=pending-final-objective-audit-record;final-objective-audit-record=final-objective-audit-record-accepted;final-objective-proof-ledger=final-objective-proofs-covered;verified-closure=complete;final-closure-audit=complete";
const finalOwnerClosureOwnerGateA06SourceStatusManifest =
  "A11=not-applicable;A18=a06-source-confirmed-a18-pending;A22=not-applicable";
const a06SourceConfirmationSummary =
  "a06TeachingSourceConfirmationLedger:status=a06-source-confirmed-a18-pending:confirmed=60/60:pendingA18=60:function-graph-core=5/5-a06-confirmed";

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

function closureFixture() {
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
  const closureQueue = buildMathSceneV2CompletionClosureQueue(crossAgentHandoff);
  const acceptanceChecklist = buildMathSceneV2CompletionAcceptanceChecklist(closureQueue);
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
  const teachingFinalDecisionIntake = buildMathSceneTeachingFinalDecisionIntake(
    teachingFinalDecisionLedger,
    []
  );
  const objectiveAudit = buildMathSceneV2ObjectiveCompletionAudit({
    completionStatus,
    crossAgentHandoff,
    evidenceIntake,
    teachingFinalDecisionIntake
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

  return {
    objectiveAudit,
    rerunPlan
  };
}

function acceptedGateRerunRecords(): MathSceneV2OwnerGateRerunRecord[] {
  return closureFixture()
    .rerunPlan
    .steps
    .filter((step) => step.kind === "owner-gate-rerun")
    .map((step) => ({
      evidenceId: `accepted-${step.ownerAgentIds[0]}-gate-rerun`,
      ownerAgentId: step.ownerAgentIds[0],
      rerunTarget: step.rerunTarget,
      status: "accepted" as const,
      stepId: step.stepId
    }));
}

function acceptedFinalAuditRecord(
  objectiveAudit: MathSceneV2ObjectiveCompletionAudit
): MathSceneV2FinalClosureAuditRecord {
  return {
    evidenceId: "accepted-final-objective-audit-4-of-4",
    ownerGateRerunEvidenceIds: acceptedGateRerunRecords().map((record) => record.evidenceId),
    provenRequirementCount: objectiveAudit.requirementCount,
    requirementProofEvidenceIds: [...requirementProofEvidenceIds],
    requirementCount: objectiveAudit.requirementCount,
    status: "accepted",
    target: "mathSceneV2ObjectiveCompletionAudit"
  };
}

test("MAIS Manim v2 final closure audit waits while owner gate reruns are pending", () => {
  const { objectiveAudit, rerunPlan } = closureFixture();
  const ownerGateRerunIntake = buildMathSceneV2OwnerGateRerunIntake(rerunPlan, []);
  const audit = buildMathSceneV2FinalClosureAudit({
    finalAuditRecord: undefined,
    objectiveAudit,
    ownerGateRerunIntake
  });

  assert.equal(audit.sourceContract, MATH_SCENE_V2_FINAL_CLOSURE_AUDIT_SOURCE_CONTRACT);
  assert.equal(audit.status, "pending-owner-gate-reruns");
  assert.equal(audit.finalAuditRecordStatus, "missing-final-objective-audit");
  assert.equal(audit.acceptedOwnerGateRerunCount, 0);
  assert.equal(audit.pendingOwnerGateRerunCount, 3);
  assert.equal(audit.blockedOwnerGateRerunCount, 0);
  assert.equal(audit.readyForFinalObjectiveAudit, false);
  assert.equal(audit.canMarkThreadGoalComplete, false);
  assert.equal(
    (audit as { ownerAcceptanceCriteriaManifest?: string }).ownerAcceptanceCriteriaManifest,
    objectiveAudit.ownerAcceptanceCriteriaManifest
  );
  assert.equal(
    (audit as { ownerEvidenceRequirementManifest?: string }).ownerEvidenceRequirementManifest,
    objectiveAudit.ownerEvidenceRequirementManifest
  );
  assert.equal(
    (audit as { a11RequiredRootDataAttributeCount?: number }).a11RequiredRootDataAttributeCount,
    5
  );
  assert.equal(
    (audit as { a11RunFromBeatCheckpointInvalidationDataAttributeManifest?: string })
      .a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    (objectiveAudit as { a11RunFromBeatCheckpointInvalidationDataAttributeManifest?: string })
      .a11RunFromBeatCheckpointInvalidationDataAttributeManifest
  );
  assert.ok(audit.summary.includes(`ownerAcceptanceCriteria=${objectiveAudit.ownerAcceptanceCriteriaManifest}`));
  assert.ok(audit.summary.includes(`ownerEvidenceRequirements=${objectiveAudit.ownerEvidenceRequirementManifest}`));
  assert.ok(audit.summary.includes("a11RootAttributes=5"));
  assert.deepEqual(audit.remainingOwnerAgentIds, ["A11", "A18", "A22"]);
});

test("MAIS Manim v2 final closure audit serializes objective final owner-closure verified manifests", () => {
  const { objectiveAudit, rerunPlan } = closureFixture();
  const objectiveAuditWithFinalOwnerClosure = {
    ...objectiveAudit,
    finalOwnerClosureCanComplete: false,
    finalOwnerClosurePacketStatus,
    finalOwnerClosureSubmissionBridgeVerifiedClosureGateAttributeNames:
      [...finalOwnerClosureSubmissionBridgeVerifiedClosureGateAttributeNames],
    finalOwnerClosureSubmissionBridgeVerifiedClosureGateCoverageManifest,
    finalOwnerClosureSubmissionBridgeVerifiedClosureGateIds,
    finalOwnerClosureSubmissionBridgeVerifiedClosureGateOwnerManifest,
    finalOwnerClosureSubmissionBridgeVerifiedClosureGateStatusManifest,
    finalOwnerClosureOwnerGateA06SourceStatusManifest,
    finalOwnerClosureSubmissionBridgeVerifiedClosureStatus: "complete"
  } satisfies MathSceneV2ObjectiveCompletionAudit;
  const ownerGateRerunIntake = buildMathSceneV2OwnerGateRerunIntake(rerunPlan, []);
  const audit = buildMathSceneV2FinalClosureAudit({
    finalAuditRecord: undefined,
    objectiveAudit: objectiveAuditWithFinalOwnerClosure,
    ownerGateRerunIntake
  });
  const attributes = mathSceneV2FinalClosureAuditDataAttributes(audit) as Record<string, string>;

  assert.equal(
    (audit as { finalOwnerClosurePacketStatus?: string }).finalOwnerClosurePacketStatus,
    finalOwnerClosurePacketStatus
  );
  assert.equal((audit as { finalOwnerClosureCanComplete?: boolean }).finalOwnerClosureCanComplete, false);
  assert.deepEqual(
    (audit as { finalOwnerClosureSubmissionBridgeVerifiedClosureGateAttributeNames?: string[] })
      .finalOwnerClosureSubmissionBridgeVerifiedClosureGateAttributeNames,
    [...finalOwnerClosureSubmissionBridgeVerifiedClosureGateAttributeNames]
  );
  assert.equal(
    (audit as { finalOwnerClosureSubmissionBridgeVerifiedClosureGateIds?: string })
      .finalOwnerClosureSubmissionBridgeVerifiedClosureGateIds,
    finalOwnerClosureSubmissionBridgeVerifiedClosureGateIds
  );
  assert.equal(
    (audit as { finalOwnerClosureSubmissionBridgeVerifiedClosureStatus?: string })
      .finalOwnerClosureSubmissionBridgeVerifiedClosureStatus,
    "complete"
  );
  assert.equal(
    (audit as { finalOwnerClosureOwnerGateA06SourceStatusManifest?: string })
      .finalOwnerClosureOwnerGateA06SourceStatusManifest,
    finalOwnerClosureOwnerGateA06SourceStatusManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-closure-audit-final-owner-closure-status"],
    finalOwnerClosurePacketStatus
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-closure-audit-final-owner-closure-can-complete"],
    "false"
  );
  assert.equal(
    attributes[
      "data-viz-manim-v2-final-closure-audit-final-owner-closure-submission-bridge-verified-closure-gate-attribute-names"
    ],
    finalOwnerClosureSubmissionBridgeVerifiedClosureGateAttributeNames.join(",")
  );
  assert.equal(
    attributes[
      "data-viz-manim-v2-final-closure-audit-final-owner-closure-submission-bridge-verified-closure-gate-coverage-manifest"
    ],
    finalOwnerClosureSubmissionBridgeVerifiedClosureGateCoverageManifest
  );
  assert.equal(
    attributes[
      "data-viz-manim-v2-final-closure-audit-final-owner-closure-submission-bridge-verified-closure-gate-owner-manifest"
    ],
    finalOwnerClosureSubmissionBridgeVerifiedClosureGateOwnerManifest
  );
  assert.equal(
    attributes[
      "data-viz-manim-v2-final-closure-audit-final-owner-closure-submission-bridge-verified-closure-gate-status-manifest"
    ],
    finalOwnerClosureSubmissionBridgeVerifiedClosureGateStatusManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-closure-audit-final-owner-closure-submission-bridge-verified-closure-status"],
    "complete"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-closure-audit-final-owner-closure-owner-gate-a06-source-status-manifest"],
    finalOwnerClosureOwnerGateA06SourceStatusManifest
  );
  assert.match(audit.summary, /finalOwnerClosure=pending-owner-closure-submissions/);
  assert.match(
    audit.summary,
    /finalOwnerClosureOwnerGateA06SourceStatuses=A11=not-applicable;A18=a06-source-confirmed-a18-pending;A22=not-applicable/
  );
  assert.match(audit.summary, /submissionBridgeVerifiedClosure=complete/);
  assert.equal(audit.canMarkThreadGoalComplete, false);
});

test("MAIS Manim v2 final closure audit carries A06 source confirmations from objective audit", () => {
  const { objectiveAudit, rerunPlan } = closureFixture();
  const mismatchReasons = [
    "a06-confirmation-count=55/60",
    "missing-source-decision-keys=function-graph-core::interaction-timing"
  ];
  const objectiveAuditWithA06Source = {
    ...objectiveAudit,
    a06SourceBlockedConfirmationCount: 0,
    a06SourceConfirmedDecisionCount: 55,
    a06SourceConfirmationMismatchReasons: mismatchReasons,
    a06SourceConfirmationStatus: "a06-source-confirmed-a18-pending",
    a06SourceConfirmationSummary,
    a06SourcePendingA18DecisionCount: 60
  } satisfies MathSceneV2ObjectiveCompletionAudit;
  const ownerGateRerunIntake = buildMathSceneV2OwnerGateRerunIntake(rerunPlan, []);
  const audit = buildMathSceneV2FinalClosureAudit({
    finalAuditRecord: undefined,
    objectiveAudit: objectiveAuditWithA06Source,
    ownerGateRerunIntake
  });
  const attributes = mathSceneV2FinalClosureAuditDataAttributes(audit) as Record<string, string>;

  assert.equal(
    (audit as { a06SourceConfirmationStatus?: string }).a06SourceConfirmationStatus,
    "a06-source-confirmed-a18-pending"
  );
  assert.equal((audit as { a06SourceConfirmedDecisionCount?: number }).a06SourceConfirmedDecisionCount, 55);
  assert.equal((audit as { a06SourceBlockedConfirmationCount?: number }).a06SourceBlockedConfirmationCount, 0);
  assert.deepEqual(
    (audit as { a06SourceConfirmationMismatchReasons?: string[] }).a06SourceConfirmationMismatchReasons,
    mismatchReasons
  );
  assert.equal((audit as { a06SourcePendingA18DecisionCount?: number }).a06SourcePendingA18DecisionCount, 60);
  assert.equal(
    attributes["data-viz-manim-v2-final-closure-audit-a06-source-confirmation-status"],
    "a06-source-confirmed-a18-pending"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-closure-audit-a06-source-confirmed-count"],
    "55"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-closure-audit-a06-source-blocked-count"],
    "0"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-closure-audit-a06-source-mismatch-reasons"],
    mismatchReasons.join("|")
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-closure-audit-a06-source-pending-a18-count"],
    "60"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-closure-audit-a06-source-confirmation-summary"],
    a06SourceConfirmationSummary
  );
  assert.match(audit.summary, /a06Source=a06-source-confirmed-a18-pending/);
  assert.match(audit.summary, /a06SourceConfirmed=55/);
  assert.match(audit.summary, /a06SourceMismatch=a06-confirmation-count=55\/60\|missing-source-decision-keys=function-graph-core::interaction-timing/);
  assert.match(audit.summary, /a06SourcePendingA18=60/);
  assert.equal(audit.canMarkThreadGoalComplete, false);
});

test("MAIS Manim v2 final closure audit carries source-architecture handoff constraints from owner gate rerun intake", () => {
  const { objectiveAudit, rerunPlan } = closureFixture();
  const sourceArchitectureSummary =
    "mathSceneV2SourceArchitectureHandoff:status=source-architecture-ready-owner-gates-open:bulkCourseGeneration=false:futureInvocationScope=one-topic-one-concept-cluster-or-one-review-slice";
  const ownerGateRerunIntake = buildMathSceneV2OwnerGateRerunIntake(
    {
      ...rerunPlan,
      sourceArchitectureBulkCourseGenerationAllowed: false,
      sourceArchitectureFutureInvocationScope: "one-topic-one-concept-cluster-or-one-review-slice",
      sourceArchitectureHandoffStatus: "source-architecture-ready-owner-gates-open",
      sourceArchitectureOpenOwnerGateIds: ["A11", "A18", "A22"],
      sourceArchitectureRequiredOwnerGateIds: ["A11", "A18", "A22"],
      sourceArchitectureSourceContract: MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT,
      sourceArchitectureSummary
    },
    []
  );
  const audit = buildMathSceneV2FinalClosureAudit({
    finalAuditRecord: undefined,
    objectiveAudit,
    ownerGateRerunIntake
  });
  const attributes = mathSceneV2FinalClosureAuditDataAttributes(audit) as Record<string, string>;

  assert.equal(
    (audit as { sourceArchitectureHandoffStatus?: string }).sourceArchitectureHandoffStatus,
    "source-architecture-ready-owner-gates-open"
  );
  assert.equal(
    (audit as { sourceArchitectureBulkCourseGenerationAllowed?: boolean }).sourceArchitectureBulkCourseGenerationAllowed,
    false
  );
  assert.equal(
    (audit as { sourceArchitectureFutureInvocationScope?: string }).sourceArchitectureFutureInvocationScope,
    "one-topic-one-concept-cluster-or-one-review-slice"
  );
  assert.deepEqual(
    (audit as { sourceArchitectureOpenOwnerGateIds?: string[] }).sourceArchitectureOpenOwnerGateIds,
    ["A11", "A18", "A22"]
  );
  assert.deepEqual(
    (audit as { sourceArchitectureRequiredOwnerGateIds?: string[] }).sourceArchitectureRequiredOwnerGateIds,
    ["A11", "A18", "A22"]
  );
  assert.equal(
    (audit as { sourceArchitectureSourceContract?: string }).sourceArchitectureSourceContract,
    MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-closure-audit-source-architecture-status"],
    "source-architecture-ready-owner-gates-open"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-closure-audit-source-architecture-bulk-course-generation"],
    "false"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-closure-audit-source-architecture-future-invocation-scope"],
    "one-topic-one-concept-cluster-or-one-review-slice"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-closure-audit-source-architecture-open-owner-gates"],
    "A11,A18,A22"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-closure-audit-source-architecture-required-owner-gates"],
    "A11,A18,A22"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-closure-audit-source-architecture-source-contract"],
    MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-closure-audit-source-architecture-summary"],
    sourceArchitectureSummary
  );
  assert.match(audit.summary, /sourceArchitecture=source-architecture-ready-owner-gates-open/);
  assert.match(audit.summary, /sourceArchitectureScope=one-topic-one-concept-cluster-or-one-review-slice/);
  assert.equal(audit.canMarkThreadGoalComplete, false);
});

test("MAIS Manim v2 final closure audit waits for final objective audit after owner gates pass", () => {
  const { objectiveAudit, rerunPlan } = closureFixture();
  const ownerGateRerunIntake = buildMathSceneV2OwnerGateRerunIntake(rerunPlan, acceptedGateRerunRecords());
  const audit = buildMathSceneV2FinalClosureAudit({
    finalAuditRecord: undefined,
    objectiveAudit,
    ownerGateRerunIntake
  });

  assert.equal(ownerGateRerunIntake.readyForFinalAudit, true);
  assert.equal(audit.status, "ready-for-final-objective-audit");
  assert.equal(audit.finalAuditRecordStatus, "missing-final-objective-audit");
  assert.equal(audit.acceptedOwnerGateRerunCount, 3);
  assert.equal(audit.pendingOwnerGateRerunCount, 0);
  assert.equal(audit.readyForFinalObjectiveAudit, true);
  assert.equal(audit.finalAuditEvidenceId, undefined);
  assert.equal(audit.canMarkThreadGoalComplete, false);
});

test("MAIS Manim v2 final closure audit completes only with accepted final objective evidence", () => {
  const { objectiveAudit, rerunPlan } = closureFixture();
  const ownerGateRerunIntake = buildMathSceneV2OwnerGateRerunIntake(rerunPlan, acceptedGateRerunRecords());
  const audit = buildMathSceneV2FinalClosureAudit({
    finalAuditRecord: acceptedFinalAuditRecord(objectiveAudit),
    objectiveAudit,
    ownerGateRerunIntake
  });

  assert.equal(audit.status, "complete");
  assert.equal(audit.finalAuditRecordStatus, "accepted-final-objective-audit");
  assert.equal(audit.finalAuditEvidenceId, "accepted-final-objective-audit-4-of-4");
  assert.equal(audit.provenRequirementCount, 4);
  assert.equal(audit.requirementCount, 4);
  assert.deepEqual(audit.remainingOwnerAgentIds, []);
  assert.equal(audit.canMarkThreadGoalComplete, true);
});

test("MAIS Manim v2 final closure audit blocks stale objective review-slice provenance before completion", () => {
  const { objectiveAudit, rerunPlan } = closureFixture();
  const ownerGateRerunIntake = buildMathSceneV2OwnerGateRerunIntake(rerunPlan, acceptedGateRerunRecords());
  const staleObjectiveAudit = {
    ...objectiveAudit,
    reviewSliceConsumerGateEvidenceIdManifest: "manim-review-slice-01=stale-A06-consumer-gate",
    reviewSliceCount: ownerGateRerunIntake.reviewSliceCount - 1,
    reviewSliceFileManifest: "manim-review-slice-01=stale-source.ts",
    reviewSliceIds: "manim-review-slice-01",
    reviewSliceSummary: `${ownerGateRerunIntake.reviewSliceCount - 1}@24`
  };
  const audit = buildMathSceneV2FinalClosureAudit({
    finalAuditRecord: acceptedFinalAuditRecord(staleObjectiveAudit),
    objectiveAudit: staleObjectiveAudit,
    ownerGateRerunIntake
  });
  const attributes = mathSceneV2FinalClosureAuditDataAttributes(audit);
  const expectedMismatchReasons = [
    "reviewSliceConsumerGateEvidenceIdManifest",
    "reviewSliceCount",
    "reviewSliceFileManifest",
    "reviewSliceIds",
    "reviewSliceSummary"
  ];

  assert.equal(audit.finalAuditRecordStatus, "accepted-final-objective-audit");
  assert.equal(audit.status, "blocked-review-slice-provenance-mismatch");
  assert.deepEqual(audit.reviewSliceMismatchReasons, expectedMismatchReasons);
  assert.equal(audit.finalAuditEvidenceId, undefined);
  assert.equal(audit.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-closure-audit-review-slice-mismatch-reasons"],
    expectedMismatchReasons.join(",")
  );
  assert.match(
    attributes["data-viz-manim-v2-final-closure-audit-summary"],
    /reviewSliceMismatches=reviewSliceConsumerGateEvidenceIdManifest,reviewSliceCount,reviewSliceFileManifest,reviewSliceIds,reviewSliceSummary/
  );
});

test("MAIS Manim v2 final closure audit rejects non-canonical final audit evidence ids", () => {
  const { objectiveAudit, rerunPlan } = closureFixture();
  const ownerGateRerunIntake = buildMathSceneV2OwnerGateRerunIntake(rerunPlan, acceptedGateRerunRecords());
  const audit = buildMathSceneV2FinalClosureAudit({
    finalAuditRecord: {
      ...acceptedFinalAuditRecord(objectiveAudit),
      evidenceId: " accepted-final-objective-audit-4-of-4 "
    },
    objectiveAudit,
    ownerGateRerunIntake
  });
  const attributes = mathSceneV2FinalClosureAuditDataAttributes(audit);

  assert.equal(audit.status, "blocked-final-objective-audit");
  assert.equal(audit.finalAuditRecordStatus, "invalid-final-objective-audit");
  assert.equal(audit.finalAuditEvidenceId, undefined);
  assert.equal(audit.invalidFinalAuditRecordCount, 1);
  assert.equal(audit.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-closure-audit-final-record-status"],
    "invalid-final-objective-audit"
  );
  assert.match(
    attributes["data-viz-manim-v2-final-closure-audit-summary"],
    /finalAudit=invalid-final-objective-audit/
  );
});

test("MAIS Manim v2 final closure audit rejects status-mismatched final audit evidence ids", () => {
  const { objectiveAudit, rerunPlan } = closureFixture();
  const ownerGateRerunIntake = buildMathSceneV2OwnerGateRerunIntake(rerunPlan, acceptedGateRerunRecords());
  const audit = buildMathSceneV2FinalClosureAudit({
    finalAuditRecord: {
      ...acceptedFinalAuditRecord(objectiveAudit),
      evidenceId: "owner-approved-final-audit-4-of-4"
    },
    objectiveAudit,
    ownerGateRerunIntake
  });
  const attributes = mathSceneV2FinalClosureAuditDataAttributes(audit);

  assert.equal(audit.status, "blocked-final-objective-audit");
  assert.equal(audit.finalAuditRecordStatus, "invalid-final-objective-audit");
  assert.equal(audit.finalAuditEvidenceId, undefined);
  assert.equal(audit.invalidFinalAuditRecordCount, 1);
  assert.equal(audit.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-closure-audit-final-record-status"],
    "invalid-final-objective-audit"
  );
  assert.match(
    attributes["data-viz-manim-v2-final-closure-audit-summary"],
    /finalAudit=invalid-final-objective-audit/
  );
});

test("MAIS Manim v2 final closure audit rejects final audit evidence ids with empty proof suffixes", () => {
  const { objectiveAudit, rerunPlan } = closureFixture();
  const ownerGateRerunIntake = buildMathSceneV2OwnerGateRerunIntake(rerunPlan, acceptedGateRerunRecords());
  const audit = buildMathSceneV2FinalClosureAudit({
    finalAuditRecord: {
      ...acceptedFinalAuditRecord(objectiveAudit),
      evidenceId: "accepted-final-objective-audit-"
    },
    objectiveAudit,
    ownerGateRerunIntake
  });
  const attributes = mathSceneV2FinalClosureAuditDataAttributes(audit);

  assert.equal(audit.status, "blocked-final-objective-audit");
  assert.equal(audit.finalAuditRecordStatus, "invalid-final-objective-audit");
  assert.equal(audit.finalAuditEvidenceId, undefined);
  assert.equal(audit.invalidFinalAuditRecordCount, 1);
  assert.equal(audit.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-closure-audit-final-record-status"],
    "invalid-final-objective-audit"
  );
  assert.match(
    attributes["data-viz-manim-v2-final-closure-audit-summary"],
    /finalAudit=invalid-final-objective-audit/
  );
});

test("MAIS Manim v2 final closure audit rejects accepted final audit evidence ids with mismatched proof suffixes", () => {
  const { objectiveAudit, rerunPlan } = closureFixture();
  const ownerGateRerunIntake = buildMathSceneV2OwnerGateRerunIntake(rerunPlan, acceptedGateRerunRecords());
  const audit = buildMathSceneV2FinalClosureAudit({
    finalAuditRecord: {
      ...acceptedFinalAuditRecord(objectiveAudit),
      evidenceId: "accepted-final-objective-audit-3-of-4"
    },
    objectiveAudit,
    ownerGateRerunIntake
  });
  const attributes = mathSceneV2FinalClosureAuditDataAttributes(audit);

  assert.equal(audit.status, "blocked-final-objective-audit");
  assert.equal(audit.finalAuditRecordStatus, "invalid-final-objective-audit");
  assert.equal(audit.finalAuditEvidenceId, undefined);
  assert.equal(audit.invalidFinalAuditRecordCount, 1);
  assert.equal(audit.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-closure-audit-final-record-status"],
    "invalid-final-objective-audit"
  );
  assert.match(
    attributes["data-viz-manim-v2-final-closure-audit-summary"],
    /finalAudit=invalid-final-objective-audit/
  );
});

test("MAIS Manim v2 final closure audit rejects accepted final audit evidence ids with dangling proof suffix separators", () => {
  const { objectiveAudit, rerunPlan } = closureFixture();
  const ownerGateRerunIntake = buildMathSceneV2OwnerGateRerunIntake(rerunPlan, acceptedGateRerunRecords());
  const audit = buildMathSceneV2FinalClosureAudit({
    finalAuditRecord: {
      ...acceptedFinalAuditRecord(objectiveAudit),
      evidenceId: "accepted-final-objective-audit-4-of-4-"
    },
    objectiveAudit,
    ownerGateRerunIntake
  });
  const attributes = mathSceneV2FinalClosureAuditDataAttributes(audit);

  assert.equal(audit.status, "blocked-final-objective-audit");
  assert.equal(audit.finalAuditRecordStatus, "invalid-final-objective-audit");
  assert.equal(audit.finalAuditEvidenceId, undefined);
  assert.equal(audit.invalidFinalAuditRecordCount, 1);
  assert.equal(audit.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-closure-audit-final-record-status"],
    "invalid-final-objective-audit"
  );
  assert.match(
    attributes["data-viz-manim-v2-final-closure-audit-summary"],
    /finalAudit=invalid-final-objective-audit/
  );
});

test("MAIS Manim v2 final closure audit rejects blocked final audit records that claim all requirements proven", () => {
  const { objectiveAudit, rerunPlan } = closureFixture();
  const ownerGateRerunIntake = buildMathSceneV2OwnerGateRerunIntake(rerunPlan, acceptedGateRerunRecords());
  const audit = buildMathSceneV2FinalClosureAudit({
    finalAuditRecord: {
      ...acceptedFinalAuditRecord(objectiveAudit),
      evidenceId: "blocked-final-objective-audit-contradictory-4-of-4",
      status: "blocked"
    },
    objectiveAudit,
    ownerGateRerunIntake
  });
  const attributes = mathSceneV2FinalClosureAuditDataAttributes(audit);

  assert.equal(audit.status, "blocked-final-objective-audit");
  assert.equal(audit.finalAuditRecordStatus, "invalid-final-objective-audit");
  assert.equal(audit.finalAuditEvidenceId, undefined);
  assert.equal(audit.invalidFinalAuditRecordCount, 1);
  assert.equal(audit.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-closure-audit-final-record-status"],
    "invalid-final-objective-audit"
  );
  assert.match(
    attributes["data-viz-manim-v2-final-closure-audit-summary"],
    /finalAudit=invalid-final-objective-audit/
  );
});

test("MAIS Manim v2 final closure audit rejects blocked final audit evidence ids that mimic completed proof suffixes", () => {
  const { objectiveAudit, rerunPlan } = closureFixture();
  const ownerGateRerunIntake = buildMathSceneV2OwnerGateRerunIntake(rerunPlan, acceptedGateRerunRecords());
  const audit = buildMathSceneV2FinalClosureAudit({
    finalAuditRecord: {
      ...acceptedFinalAuditRecord(objectiveAudit),
      evidenceId: "blocked-final-objective-audit-4-of-4",
      provenRequirementCount: objectiveAudit.requirementCount - 1,
      status: "blocked"
    },
    objectiveAudit,
    ownerGateRerunIntake
  });
  const attributes = mathSceneV2FinalClosureAuditDataAttributes(audit);

  assert.equal(audit.status, "blocked-final-objective-audit");
  assert.equal(audit.finalAuditRecordStatus, "invalid-final-objective-audit");
  assert.equal(audit.finalAuditEvidenceId, undefined);
  assert.equal(audit.invalidFinalAuditRecordCount, 1);
  assert.equal(audit.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-closure-audit-final-record-status"],
    "invalid-final-objective-audit"
  );
  assert.match(
    attributes["data-viz-manim-v2-final-closure-audit-summary"],
    /finalAudit=invalid-final-objective-audit/
  );
});

test("MAIS Manim v2 final closure audit rejects non-canonical requirement proof evidence ids", () => {
  const { objectiveAudit, rerunPlan } = closureFixture();
  const ownerGateRerunIntake = buildMathSceneV2OwnerGateRerunIntake(rerunPlan, acceptedGateRerunRecords());
  const audit = buildMathSceneV2FinalClosureAudit({
    finalAuditRecord: {
      ...acceptedFinalAuditRecord(objectiveAudit),
      requirementProofEvidenceIds: [
        ` ${requirementProofEvidenceIds[0]} `,
        ...requirementProofEvidenceIds.slice(1)
      ]
    },
    objectiveAudit,
    ownerGateRerunIntake
  });
  const attributes = mathSceneV2FinalClosureAuditDataAttributes(audit);

  assert.equal(audit.status, "blocked-final-objective-audit");
  assert.equal(audit.finalAuditRecordStatus, "invalid-final-objective-audit");
  assert.equal(audit.finalAuditEvidenceId, undefined);
  assert.equal(audit.invalidFinalAuditRecordCount, 1);
  assert.equal(audit.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-closure-audit-final-record-status"],
    "invalid-final-objective-audit"
  );
  assert.match(
    attributes["data-viz-manim-v2-final-closure-audit-summary"],
    /finalAudit=invalid-final-objective-audit/
  );
});

test("MAIS Manim v2 final closure audit rejects unknown requirement proof evidence ids", () => {
  const { objectiveAudit, rerunPlan } = closureFixture();
  const ownerGateRerunIntake = buildMathSceneV2OwnerGateRerunIntake(rerunPlan, acceptedGateRerunRecords());
  const audit = buildMathSceneV2FinalClosureAudit({
    finalAuditRecord: {
      ...acceptedFinalAuditRecord(objectiveAudit),
      requirementProofEvidenceIds: [
        "unknown-final-objective-proof",
        ...requirementProofEvidenceIds.slice(1)
      ]
    },
    objectiveAudit,
    ownerGateRerunIntake
  });
  const attributes = mathSceneV2FinalClosureAuditDataAttributes(audit);

  assert.equal(audit.status, "blocked-final-objective-audit");
  assert.equal(audit.finalAuditRecordStatus, "invalid-final-objective-audit");
  assert.equal(audit.finalAuditEvidenceId, undefined);
  assert.equal(audit.invalidFinalAuditRecordCount, 1);
  assert.equal(audit.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-closure-audit-final-record-status"],
    "invalid-final-objective-audit"
  );
  assert.match(
    attributes["data-viz-manim-v2-final-closure-audit-summary"],
    /finalAudit=invalid-final-objective-audit/
  );
});

test("MAIS Manim v2 final closure audit rejects unsupported final audit statuses", () => {
  const { objectiveAudit, rerunPlan } = closureFixture();
  const ownerGateRerunIntake = buildMathSceneV2OwnerGateRerunIntake(rerunPlan, acceptedGateRerunRecords());
  const audit = buildMathSceneV2FinalClosureAudit({
    finalAuditRecord: {
      ...acceptedFinalAuditRecord(objectiveAudit),
      status: "passed" as MathSceneV2FinalClosureAuditRecord["status"]
    },
    objectiveAudit,
    ownerGateRerunIntake
  });
  const attributes = mathSceneV2FinalClosureAuditDataAttributes(audit);

  assert.equal(audit.status, "blocked-final-objective-audit");
  assert.equal(audit.finalAuditRecordStatus, "invalid-final-objective-audit");
  assert.equal(audit.finalAuditEvidenceId, undefined);
  assert.equal(audit.invalidFinalAuditRecordCount, 1);
  assert.equal(audit.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-closure-audit-final-record-status"],
    "invalid-final-objective-audit"
  );
  assert.match(
    attributes["data-viz-manim-v2-final-closure-audit-summary"],
    /finalAudit=invalid-final-objective-audit/
  );
});

test("MAIS Manim v2 final closure audit blocks when an owner gate rerun is blocked", () => {
  const { objectiveAudit, rerunPlan } = closureFixture();
  const blockedRecords = acceptedGateRerunRecords().map((record) =>
    record.ownerAgentId === "A22"
      ? { ...record, evidenceId: "blocked-A22-clean-release-rerun", status: "blocked" as const }
      : record
  );
  const ownerGateRerunIntake = buildMathSceneV2OwnerGateRerunIntake(rerunPlan, blockedRecords);
  const audit = buildMathSceneV2FinalClosureAudit({
    finalAuditRecord: acceptedFinalAuditRecord(objectiveAudit),
    objectiveAudit,
    ownerGateRerunIntake
  });

  assert.equal(audit.status, "blocked-owner-gate-rerun");
  assert.equal(audit.finalAuditRecordStatus, "not-ready-for-final-objective-audit");
  assert.equal(audit.blockedOwnerGateRerunCount, 1);
  assert.equal(audit.readyForFinalObjectiveAudit, false);
  assert.equal(audit.canMarkThreadGoalComplete, false);
});

test("MAIS Manim v2 final closure audit serializes stable handoff attributes", () => {
  const { objectiveAudit, rerunPlan } = closureFixture();
  const ownerGateRerunIntake = buildMathSceneV2OwnerGateRerunIntake(rerunPlan, []);
  const audit = buildMathSceneV2FinalClosureAudit({
    finalAuditRecord: undefined,
    objectiveAudit,
    ownerGateRerunIntake
  });
  const attributes = mathSceneV2FinalClosureAuditDataAttributes(audit);

  assert.equal(classifyManimReviewPackage("mathSceneV2FinalClosureAudit.ts"), "evidence");
  assert.equal(
    attributes["data-viz-manim-v2-final-closure-audit-source-contract"],
    MATH_SCENE_V2_FINAL_CLOSURE_AUDIT_SOURCE_CONTRACT
  );
  assert.equal(attributes["data-viz-manim-v2-final-closure-audit-status"], "pending-owner-gate-reruns");
  assert.equal(attributes["data-viz-manim-v2-final-closure-audit-proven"], "1/4");
  assert.equal(attributes["data-viz-manim-v2-final-closure-audit-owner-gates"], "0/3");
  assert.equal(attributes["data-viz-manim-v2-final-closure-audit-ready"], "false");
  assert.equal(attributes["data-viz-manim-v2-final-closure-audit-can-complete"], "false");
  assert.equal(
    attributes["data-viz-manim-v2-final-closure-audit-owner-acceptance-criteria-manifest"],
    objectiveAudit.ownerAcceptanceCriteriaManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-closure-audit-owner-evidence-requirement-manifest"],
    objectiveAudit.ownerEvidenceRequirementManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-closure-audit-a11-required-root-attribute-count"],
    "5"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-closure-audit-a11-run-from-beat-checkpoint-invalidation-attributes"],
    (objectiveAudit as { a11RunFromBeatCheckpointInvalidationDataAttributeManifest?: string })
      .a11RunFromBeatCheckpointInvalidationDataAttributeManifest
  );
  assert.equal((audit as { reviewSliceCount?: number }).reviewSliceCount, ownerGateRerunIntake.reviewSliceCount);
  assert.equal((audit as { reviewSliceIds?: string }).reviewSliceIds, ownerGateRerunIntake.reviewSliceIds);
  assert.equal(
    (audit as { reviewSliceFileManifest?: string }).reviewSliceFileManifest,
    ownerGateRerunIntake.reviewSliceFileManifest
  );
  assert.equal(
    (audit as { reviewSliceConsumerGateEvidenceIdManifest?: string }).reviewSliceConsumerGateEvidenceIdManifest,
    ownerGateRerunIntake.reviewSliceConsumerGateEvidenceIdManifest
  );
  assert.equal((audit as { reviewSliceSummary?: string }).reviewSliceSummary, ownerGateRerunIntake.reviewSliceSummary);
  assert.match(audit.summary, new RegExp(`reviewSlices=${ownerGateRerunIntake.reviewSliceSummary}`));
  assert.equal(
    attributes["data-viz-manim-v2-final-closure-audit-review-slice-count"],
    String(ownerGateRerunIntake.reviewSliceCount)
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-closure-audit-review-slice-ids"],
    ownerGateRerunIntake.reviewSliceIds
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-closure-audit-review-slice-file-manifest"],
    ownerGateRerunIntake.reviewSliceFileManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-closure-audit-review-slice-consumer-gate-evidence-id-manifest"],
    ownerGateRerunIntake.reviewSliceConsumerGateEvidenceIdManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-closure-audit-review-slices"],
    ownerGateRerunIntake.reviewSliceSummary
  );
});
