import assert from "node:assert/strict";
import test from "node:test";
import {
  MATH_SCENE_V2_COMPLETION_ACCEPTANCE_CHECKLIST_SOURCE_CONTRACT,
  type MathSceneV2CompletionAcceptanceAction,
  type MathSceneV2CompletionAcceptanceChecklist
} from "./mathSceneV2CompletionAcceptanceChecklist";
import { buildMathSceneV2CompletionEvidenceIntake } from "./mathSceneV2CompletionEvidenceIntake";
import {
  MATH_SCENE_V2_COMPLETION_RERUN_PLAN_SOURCE_CONTRACT,
  type MathSceneV2CompletionRerunPlan
} from "./mathSceneV2CompletionRerunPlan";
import type { MathSceneV2GoalGateId } from "./mathSceneV2GoalGate";
import { buildMathSceneV2OwnerEvidenceRequestPacket } from "./mathSceneV2OwnerEvidenceRequestPacket";
import {
  buildMathSceneV2OwnerEvidenceSubmissionCompletionBridge,
  buildMathSceneV2OwnerEvidenceSubmissionIntake,
  buildMathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordSubmissionBridge,
  buildMathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordTemplatePlanAlignment,
  mathSceneV2OwnerEvidenceSubmissionCompletionBridgeDataAttributes,
  mathSceneV2OwnerEvidenceSubmissionIntakeDataAttributes,
  mathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordSubmissionBridgeDataAttributes,
  mathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordTemplatePlanAlignmentDataAttributes,
  MATH_SCENE_V2_OWNER_EVIDENCE_SUBMISSION_COMPLETION_BRIDGE_SOURCE_CONTRACT,
  MATH_SCENE_V2_OWNER_EVIDENCE_SUBMISSION_INTAKE_SOURCE_CONTRACT,
  MATH_SCENE_V2_OWNER_EVIDENCE_SUBMISSION_OWNER_GATE_RERUN_RECORD_SUBMISSION_BRIDGE_SOURCE_CONTRACT,
  MATH_SCENE_V2_OWNER_EVIDENCE_SUBMISSION_OWNER_GATE_RERUN_RECORD_TEMPLATE_PLAN_ALIGNMENT_SOURCE_CONTRACT
} from "./mathSceneV2OwnerEvidenceSubmissionIntake";
import { classifyManimReviewPackage } from "./mathSceneReviewPackages";

const a11RunFromBeatCheckpointInvalidationDataAttributeManifest =
  "data-viz-manim-run-from-beat-checkpoint-invalidated-keys,data-viz-manim-run-from-beat-checkpoint-invalidates-count,data-viz-manim-run-from-beat-checkpoint-invalidation-summary,data-viz-manim-run-from-beat-checkpoint-restore-action,data-viz-manim-run-from-beat-checkpoint-retained-keys-after-restore";
const a11RequiredRootDataAttributeCount = 5;
const reviewSliceConsumerGateEvidenceIdManifest =
  "manim-review-slice-01=A06-source-review:source-review-note:ready-for-slice-review";
const reviewSliceCount = 20;
const reviewSliceFileManifest = "manim-review-slice-01=mathSceneV2OwnerEvidenceSubmissionIntake.ts";
const reviewSliceIds = "manim-review-slice-01,manim-review-slice-02";
const reviewSliceSummary = "20@24";
const finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames = [
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-coverage-manifest",
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-ids",
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-owner-manifest",
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-status-manifest",
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-status"
] as const;
const finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageManifest =
  "a06-review-package-split=covered;a11-browser-visual-interaction-regression=pending-owner-evidence;a18-a06-teaching-quality-confirmation=pending-owner-evidence;a22-clean-release-gate=pending-owner-evidence";
const finalObjectiveSubmissionBridgeVerifiedClosureGateIds =
  "a06-review-package-split,a11-browser-visual-interaction-regression,a18-a06-teaching-quality-confirmation,a22-clean-release-gate";
const finalObjectiveSubmissionBridgeVerifiedClosureGateOwnerManifest =
  "a06-review-package-split=A06;a11-browser-visual-interaction-regression=A11+A06;a18-a06-teaching-quality-confirmation=A18+A06;a22-clean-release-gate=A22";
const finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest =
  "a06-review-package-split=accepted-source-evidence;a11-browser-visual-interaction-regression=missing-owner-evidence;a18-a06-teaching-quality-confirmation=pending-a18-final-decisions;a22-clean-release-gate=blocked-owner-action";
const finalObjectiveSubmissionBridgeVerifiedClosureStatus = "complete";

type AcceptanceActionFixture = {
  action: string;
  actionId: MathSceneV2CompletionAcceptanceAction["actionId"];
  ownerAgentIds: readonly string[];
  supportingAgentIds: readonly string[];
  workstreamId: MathSceneV2GoalGateId;
};

function acceptanceActionFixture({
  action,
  actionId,
  ownerAgentIds,
  supportingAgentIds,
  workstreamId
}: AcceptanceActionFixture): MathSceneV2CompletionAcceptanceAction {
  return {
    acceptanceCriteria: [
      `${actionId} must record owner evidence before closure.`,
      `${actionId} must preserve the ${workstreamId} gate evidence.`
    ],
    action,
    actionId,
    blockingItems: [`${actionId}-blocker`],
    ownerAgentIds,
    ownerEvidenceStatus: "pending-owner-evidence",
    prerequisiteEvidenceSourceIds: [`${actionId}-source`],
    supportingAgentIds,
    verificationEvidenceIds: [`${actionId}-evidence-a`, `${actionId}-evidence-b`],
    workstreamId
  };
}

function acceptanceChecklistFixture(): MathSceneV2CompletionAcceptanceChecklist {
  const actions = [
    acceptanceActionFixture({
      action: "adopt HK split regression package",
      actionId: "a11-browser-visual-interaction-regression:adopt-hk-grade-split-packages",
      ownerAgentIds: ["A06", "A11"],
      supportingAgentIds: ["A22"],
      workstreamId: "a11-browser-visual-interaction-regression"
    }),
    acceptanceActionFixture({
      action: "keep non-HK tracks out of HK demo sweep",
      actionId: "a11-browser-visual-interaction-regression:keep-non-hk-tracks-out-of-hk-demo-sweep",
      ownerAgentIds: ["A06", "A11"],
      supportingAgentIds: ["A22"],
      workstreamId: "a11-browser-visual-interaction-regression"
    }),
    acceptanceActionFixture({
      action: "update premium projection expected list",
      actionId: "a11-browser-visual-interaction-regression:update-projection-views-expected-list",
      ownerAgentIds: ["A06", "A11"],
      supportingAgentIds: ["A22"],
      workstreamId: "a11-browser-visual-interaction-regression"
    }),
    acceptanceActionFixture({
      action: "complete A18 final criterion decisions",
      actionId: "a18-a06-teaching-quality-confirmation:complete-a18-final-criterion-decisions",
      ownerAgentIds: ["A18", "A06"],
      supportingAgentIds: [],
      workstreamId: "a18-a06-teaching-quality-confirmation"
    }),
    acceptanceActionFixture({
      action: "complete A18 final scene signoff",
      actionId: "a18-a06-teaching-quality-confirmation:complete-a18-final-scene-signoff",
      ownerAgentIds: ["A18", "A06"],
      supportingAgentIds: [],
      workstreamId: "a18-a06-teaching-quality-confirmation"
    }),
    acceptanceActionFixture({
      action: "inspect rendered scene targets",
      actionId: "a18-a06-teaching-quality-confirmation:inspect-rendered-scene-targets",
      ownerAgentIds: ["A18", "A06"],
      supportingAgentIds: [],
      workstreamId: "a18-a06-teaching-quality-confirmation"
    }),
    acceptanceActionFixture({
      action: "open rendered review routes",
      actionId: "a18-a06-teaching-quality-confirmation:open-rendered-review-routes",
      ownerAgentIds: ["A18", "A06"],
      supportingAgentIds: [],
      workstreamId: "a18-a06-teaching-quality-confirmation"
    }),
    acceptanceActionFixture({
      action: "record approve or revision decision",
      actionId: "a18-a06-teaching-quality-confirmation:record-approve-or-revision-decision",
      ownerAgentIds: ["A18", "A06"],
      supportingAgentIds: [],
      workstreamId: "a18-a06-teaching-quality-confirmation"
    }),
    acceptanceActionFixture({
      action: "investigate isolated Next chunk serving",
      actionId: "a22-clean-release-gate:investigate-isolated-next-chunk-serving-after-broad-timeout",
      ownerAgentIds: ["A22"],
      supportingAgentIds: ["A06", "A11"],
      workstreamId: "a22-clean-release-gate"
    }),
    acceptanceActionFixture({
      action: "release from clean worktree or reviewed staging slice",
      actionId: "a22-clean-release-gate:release-from-clean-worktree-or-reviewed-pruned-staging-slice",
      ownerAgentIds: ["A22"],
      supportingAgentIds: ["A06", "A11"],
      workstreamId: "a22-clean-release-gate"
    }),
    acceptanceActionFixture({
      action: "run generated artifact cleanup after evidence preservation",
      actionId: "a22-clean-release-gate:run-a22-generated-artifact-cleanup-after-preserving-evidence",
      ownerAgentIds: ["A22"],
      supportingAgentIds: ["A06", "A11"],
      workstreamId: "a22-clean-release-gate"
    })
  ];

  return {
    acceptedOwnerEvidenceCount: 0,
    a11RequiredRootDataAttributeCount,
    a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    actionCount: actions.length,
    actions,
    canMarkThreadGoalComplete: false,
    ownerActionEvidenceCountManifest: "fixture-owner-action-evidence-counts",
    ownerAcceptanceCriteriaManifest: "fixture-owner-acceptance-criteria",
    ownerEvidenceRequirementManifest: "fixture-owner-evidence-requirements",
    pendingOwnerEvidenceCount: actions.length,
    reviewSliceConsumerGateEvidenceIdManifest,
    reviewSliceCount,
    reviewSliceFileManifest,
    reviewSliceIds,
    reviewSliceSummary,
    sourceArchitectureBlockerReasonManifest: "none",
    sourceArchitectureBlockerReasons: [],
    sourceContract: MATH_SCENE_V2_COMPLETION_ACCEPTANCE_CHECKLIST_SOURCE_CONTRACT,
    status: "pending-owner-evidence",
    summary: "mathSceneV2CompletionAcceptanceChecklist:status=pending-owner-evidence:actions=11:reviewSlices=20@24",
    workstreamCount: 3,
    workstreams: [
      {
        actionCount: 3,
        pendingOwnerEvidenceCount: 3,
        workstreamId: "a11-browser-visual-interaction-regression"
      },
      {
        actionCount: 5,
        pendingOwnerEvidenceCount: 5,
        workstreamId: "a18-a06-teaching-quality-confirmation"
      },
      {
        actionCount: 3,
        pendingOwnerEvidenceCount: 3,
        workstreamId: "a22-clean-release-gate"
      }
    ]
  };
}

function ownerEvidenceRequestPacketFixture() {
  const checklist = acceptanceChecklistFixture();
  const evidenceIntake = buildMathSceneV2CompletionEvidenceIntake(checklist, []);

  return buildMathSceneV2OwnerEvidenceRequestPacket({
    acceptanceChecklist: checklist,
    evidenceIntake
  });
}

function recordsFromPacketTemplates() {
  return ownerEvidenceRequestPacketFixture().submissionRecordTemplates.map((template) => ({
    actionId: template.actionId,
    evidenceId: template.evidenceId,
    ownerAgentIds: template.ownerAgentIds,
    status: template.status,
    submitterAgentId: template.submitterAgentId
  }));
}

function coveredOwnerEvidenceRerunPlanFixture(): MathSceneV2CompletionRerunPlan {
  return {
    canMarkThreadGoalComplete: false,
    duplicateEvidenceIds: [],
    finalAuditStepCount: 1,
    finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames: [
      ...finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames
    ],
    finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureGateIds,
    finalObjectiveSubmissionBridgeVerifiedClosureGateOwnerManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureStatus,
    invalidEvidenceRecordCount: 0,
    invalidOwnerAgentIds: [],
    missingEvidenceCount: 0,
    ownerActionEvidenceCountManifest: "fixture-owner-action-evidence-counts",
    ownerAcceptanceCriteriaManifest: "fixture-owner-acceptance-criteria",
    ownerEvidenceRequirementManifest: "fixture-owner-evidence-requirements",
    reviewSliceConsumerGateEvidenceIdManifest:
      "manim-review-slice-01=A06-source-review:source-review-note:ready-for-slice-review",
    reviewSliceCount: 20,
    reviewSliceFileManifest: "manim-review-slice-01=mathSceneV2OwnerEvidenceSubmissionIntake.ts",
    reviewSliceIds: "manim-review-slice-01,manim-review-slice-02",
    reviewSliceSummary: "20@24",
    sourceArchitectureBulkCourseGenerationAllowed: false,
    sourceArchitectureFutureInvocationScope: "not-attached",
    sourceArchitectureHandoffStatus: "not-attached",
    sourceArchitectureOpenOwnerGateIds: [],
    sourceArchitectureRequiredOwnerGateIds: [],
    sourceArchitectureSourceContract: "not-attached",
    sourceArchitectureSummary: "not-attached",
    ownerEvidenceStepCount: 0,
    ownerGateRerunStepCount: 3,
    remainingOwnerAgentIds: ["A11", "A18", "A22"],
    sourceContract: MATH_SCENE_V2_COMPLETION_RERUN_PLAN_SOURCE_CONTRACT,
    status: "owner-gate-reruns-required",
    stepCount: 4,
    steps: [
      {
        actionRequestCount: 0,
        blockingItems: ["a11-broad-visualization-value-suite-red"],
        kind: "owner-gate-rerun",
        missingEvidenceCount: 0,
        ownerAgentIds: ["A11"],
        prerequisiteStepIds: [],
        requiredActions: [
          "adopt-hk-grade-split-packages",
          "keep-non-hk-tracks-out-of-hk-demo-sweep",
          "update-projection-views-expected-list"
        ],
        requirementIds: ["a11-browser-visual-interaction-regression"],
        rerunTarget: "a11-browser-visual-interaction-regression",
        status: "ready-for-owner-gate-rerun",
        stepId: "01-owner-gate-A11",
        stepIndex: 1,
        summary:
          "01-owner-gate-A11:owner=A11:target=a11-browser-visual-interaction-regression:status=ready-for-owner-gate-rerun",
        supportingAgentIds: ["A06", "A22"]
      },
      {
        actionRequestCount: 0,
        blockingItems: ["a18-final-teaching-signoff-open"],
        kind: "owner-gate-rerun",
        missingEvidenceCount: 0,
        ownerAgentIds: ["A18"],
        prerequisiteStepIds: [],
        requiredActions: [
          "complete-a18-final-criterion-decisions",
          "complete-a18-final-scene-signoff",
          "inspect-rendered-scene-targets",
          "open-rendered-review-routes",
          "record-approve-or-revision-decision"
        ],
        requirementIds: ["a18-a06-teaching-quality-confirmation"],
        rerunTarget: "a18-a06-teaching-quality-confirmation",
        status: "ready-for-owner-gate-rerun",
        stepId: "02-owner-gate-A18",
        stepIndex: 2,
        summary:
          "02-owner-gate-A18:owner=A18:target=a18-a06-teaching-quality-confirmation:status=ready-for-owner-gate-rerun",
        supportingAgentIds: ["A06"]
      },
      {
        actionRequestCount: 0,
        blockingItems: ["a22-dirty-root-release-blocked", "a22-release-preflight-disk-blocked"],
        kind: "owner-gate-rerun",
        missingEvidenceCount: 0,
        ownerAgentIds: ["A22"],
        prerequisiteStepIds: [],
        requiredActions: [
          "investigate-isolated-next-chunk-serving-after-broad-timeout",
          "release-from-clean-worktree-or-reviewed-pruned-staging-slice",
          "run-a22-generated-artifact-cleanup-after-preserving-evidence"
        ],
        requirementIds: ["a22-clean-release-gate"],
        rerunTarget: "a22-clean-release-gate",
        status: "ready-for-owner-gate-rerun",
        stepId: "03-owner-gate-A22",
        stepIndex: 3,
        summary:
          "03-owner-gate-A22:owner=A22:target=a22-clean-release-gate:status=ready-for-owner-gate-rerun",
        supportingAgentIds: ["A06", "A11"]
      },
      {
        actionRequestCount: 0,
        blockingItems: [
          "a11-broad-visualization-value-suite-red",
          "a18-final-teaching-signoff-open",
          "a22-dirty-root-release-blocked",
          "a22-release-preflight-disk-blocked"
        ],
        kind: "final-objective-audit",
        missingEvidenceCount: 0,
        ownerAgentIds: ["A11", "A18", "A22"],
        prerequisiteStepIds: [
          "01-owner-gate-A11",
          "02-owner-gate-A18",
          "03-owner-gate-A22"
        ],
        requiredActions: [
          "adopt-hk-grade-split-packages",
          "complete-a18-final-criterion-decisions",
          "release-from-clean-worktree-or-reviewed-pruned-staging-slice"
        ],
        requirementIds: [
          "a11-browser-visual-interaction-regression",
          "a18-a06-teaching-quality-confirmation",
          "a22-clean-release-gate"
        ],
        rerunTarget: "mathSceneV2ObjectiveCompletionAudit",
        status: "blocked-by-owner-gate-reruns",
        stepId: "04-final-objective-audit",
        stepIndex: 4,
        summary:
          "04-final-objective-audit:status=blocked-by-owner-gate-reruns:owners=A11,A18,A22:proven=1/4",
        supportingAgentIds: ["A06", "A11", "A22"]
      }
    ],
    summary:
      "mathSceneV2CompletionRerunPlan:status=owner-gate-reruns-required:steps=4:owners=A11,A18,A22:missingEvidence=0:invalidEvidence=0:duplicateEvidence=none"
  };
}

function readySubmissionBridge() {
  return buildMathSceneV2OwnerEvidenceSubmissionCompletionBridge({
    acceptanceChecklist: acceptanceChecklistFixture(),
    ownerEvidenceRequestPacket: ownerEvidenceRequestPacketFixture(),
    submittedRecords: recordsFromPacketTemplates()
  });
}

function acceptedOwnerGateRerunRecordsFromPlan() {
  return coveredOwnerEvidenceRerunPlanFixture()
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

test("MAIS Manim v2 owner evidence submission intake keeps empty submissions pending", () => {
  const packet = ownerEvidenceRequestPacketFixture();
  const intake = buildMathSceneV2OwnerEvidenceSubmissionIntake(packet, []);

  assert.equal(intake.sourceContract, MATH_SCENE_V2_OWNER_EVIDENCE_SUBMISSION_INTAKE_SOURCE_CONTRACT);
  assert.equal(intake.status, "pending-owner-submissions");
  assert.equal(intake.templateCount, 22);
  assert.equal(intake.submittedRecordCount, 0);
  assert.equal(intake.acceptedSubmittedRecordCount, 0);
  assert.equal(intake.missingTemplateCount, 22);
  assert.equal(intake.invalidSubmittedRecordCount, 0);
  assert.equal(intake.readyForCompletionEvidenceIntake, false);
  assert.equal(intake.acceptedSubmittedRecordManifest, "none");
  assert.equal(intake.invalidSubmittedRecordManifest, "none");
  assert.equal(intake.missingTemplateManifest.split(";").length, 22);
  assert.equal(
    intake.missingTemplateManifest.split(";")[0],
    "A11:a11-browser-visual-interaction-regression:adopt-hk-grade-split-packages:a11-browser-visual-interaction-regression:adopt-hk-grade-split-packages-evidence-a:workstream=a11-browser-visual-interaction-regression|owners=A06+A11|status=accepted"
  );
  assert.deepEqual(intake.completionEvidenceRecords, []);
});

test("MAIS Manim v2 owner evidence submission intake covers templates with submitted owner records", () => {
  const packet = ownerEvidenceRequestPacketFixture();
  const submittedRecords = recordsFromPacketTemplates();
  const intake = buildMathSceneV2OwnerEvidenceSubmissionIntake(packet, submittedRecords);
  const attributes = mathSceneV2OwnerEvidenceSubmissionIntakeDataAttributes(intake);

  assert.equal(classifyManimReviewPackage("mathSceneV2OwnerEvidenceSubmissionIntake.ts"), "evidence");
  assert.equal(intake.status, "owner-submissions-covered");
  assert.equal(intake.templateCount, 22);
  assert.equal(intake.submittedRecordCount, 22);
  assert.equal(intake.acceptedSubmittedRecordCount, 22);
  assert.equal(intake.missingTemplateCount, 0);
  assert.equal(intake.invalidSubmittedRecordCount, 0);
  assert.equal(intake.readyForCompletionEvidenceIntake, true);
  assert.deepEqual(intake.completionEvidenceRecords[0], {
    actionId: "a11-browser-visual-interaction-regression:adopt-hk-grade-split-packages",
    evidenceId: "a11-browser-visual-interaction-regression:adopt-hk-grade-split-packages-evidence-a",
    ownerAgentIds: ["A06", "A11"],
    status: "accepted"
  });
  assert.equal(attributes["data-viz-manim-v2-owner-evidence-submission-intake-template-count"], "22");
  assert.equal(attributes["data-viz-manim-v2-owner-evidence-submission-intake-status"], "owner-submissions-covered");
  assert.equal(attributes["data-viz-manim-v2-owner-evidence-submission-intake-ready"], "true");
  assert.equal(
    intake.acceptedSubmittedRecordManifest.split(";")[0],
    "A11:a11-browser-visual-interaction-regression:adopt-hk-grade-split-packages:a11-browser-visual-interaction-regression:adopt-hk-grade-split-packages-evidence-a:owners=A06+A11|status=accepted"
  );
  assert.equal(intake.acceptedSubmittedRecordManifest.split(";").length, 22);
  assert.equal(intake.missingTemplateManifest, "none");
  assert.equal(intake.invalidSubmittedRecordManifest, "none");
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-intake-accepted-submitted-record-manifest"],
    intake.acceptedSubmittedRecordManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-intake-missing-template-manifest"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-intake-invalid-submitted-record-manifest"],
    "none"
  );
});

test("MAIS Manim v2 owner evidence submission intake carries request-packet review-slice provenance", () => {
  const packet = ownerEvidenceRequestPacketFixture();
  const intake = buildMathSceneV2OwnerEvidenceSubmissionIntake(packet, recordsFromPacketTemplates());
  const attributes = mathSceneV2OwnerEvidenceSubmissionIntakeDataAttributes(intake);

  assert.equal((intake as { reviewSliceCount?: number }).reviewSliceCount, packet.reviewSliceCount);
  assert.equal((intake as { reviewSliceIds?: string }).reviewSliceIds, packet.reviewSliceIds);
  assert.equal(
    (intake as { reviewSliceFileManifest?: string }).reviewSliceFileManifest,
    packet.reviewSliceFileManifest
  );
  assert.equal(
    (intake as { reviewSliceConsumerGateEvidenceIdManifest?: string }).reviewSliceConsumerGateEvidenceIdManifest,
    packet.reviewSliceConsumerGateEvidenceIdManifest
  );
  assert.equal((intake as { reviewSliceSummary?: string }).reviewSliceSummary, packet.reviewSliceSummary);
  assert.match(intake.summary, /reviewSlices=20@24/);
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-intake-review-slice-count"],
    String(reviewSliceCount)
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-intake-review-slice-ids"],
    reviewSliceIds
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-intake-review-slice-file-manifest"],
    reviewSliceFileManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-intake-review-slice-consumer-gate-evidence-id-manifest"],
    reviewSliceConsumerGateEvidenceIdManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-intake-review-slices"],
    reviewSliceSummary
  );
});

test("MAIS Manim v2 owner evidence submission intake carries request-packet source-architecture blocker reasons", () => {
  const checklist = acceptanceChecklistFixture();
  checklist.sourceArchitectureBlockerReasonManifest = "duplicateReviewSliceFiles,unclassifiedManimFiles";
  checklist.sourceArchitectureBlockerReasons = ["duplicateReviewSliceFiles", "unclassifiedManimFiles"];
  const evidenceIntake = buildMathSceneV2CompletionEvidenceIntake(checklist, []);
  const packet = buildMathSceneV2OwnerEvidenceRequestPacket({
    acceptanceChecklist: checklist,
    evidenceIntake
  });
  const submittedRecords = packet.submissionRecordTemplates.map((template) => ({
    actionId: template.actionId,
    evidenceId: template.evidenceId,
    ownerAgentIds: template.ownerAgentIds,
    status: template.status,
    submitterAgentId: template.submitterAgentId
  }));
  const intake = buildMathSceneV2OwnerEvidenceSubmissionIntake(packet, submittedRecords);
  const attributes = mathSceneV2OwnerEvidenceSubmissionIntakeDataAttributes(intake);

  assert.deepEqual(
    (intake as { sourceArchitectureBlockerReasons?: unknown }).sourceArchitectureBlockerReasons,
    packet.sourceArchitectureBlockerReasons
  );
  assert.equal(
    (intake as { sourceArchitectureBlockerReasonManifest?: string }).sourceArchitectureBlockerReasonManifest,
    packet.sourceArchitectureBlockerReasonManifest
  );
  assert.match(intake.summary, /sourceBlockers=duplicateReviewSliceFiles,unclassifiedManimFiles/);
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-intake-source-architecture-blocker-reasons"],
    "duplicateReviewSliceFiles,unclassifiedManimFiles"
  );
});

test("MAIS Manim v2 owner evidence submission intake blocks mismatched submitters", () => {
  const packet = ownerEvidenceRequestPacketFixture();
  const submittedRecords = recordsFromPacketTemplates();
  const invalidRecord = {
    ...submittedRecords[0],
    submitterAgentId: "A18"
  };
  const intake = buildMathSceneV2OwnerEvidenceSubmissionIntake(packet, [
    invalidRecord,
    ...submittedRecords.slice(1)
  ]);

  assert.equal(intake.status, "blocked-invalid-owner-submissions");
  assert.equal(intake.templateCount, 22);
  assert.equal(intake.submittedRecordCount, 22);
  assert.equal(intake.acceptedSubmittedRecordCount, 21);
  assert.equal(intake.missingTemplateCount, 1);
  assert.equal(intake.invalidSubmittedRecordCount, 1);
  assert.equal(intake.readyForCompletionEvidenceIntake, false);
  assert.deepEqual(intake.invalidSubmittedRecords, [invalidRecord]);
  assert.deepEqual(intake.missingTemplateEvidenceIds, [
    "a11-browser-visual-interaction-regression:adopt-hk-grade-split-packages-evidence-a"
  ]);
  assert.equal(
    intake.invalidSubmittedRecordManifest,
    "A18:a11-browser-visual-interaction-regression:adopt-hk-grade-split-packages:a11-browser-visual-interaction-regression:adopt-hk-grade-split-packages-evidence-a:owners=A06+A11|status=accepted"
  );
  assert.equal(
    intake.missingTemplateManifest,
    "A11:a11-browser-visual-interaction-regression:adopt-hk-grade-split-packages:a11-browser-visual-interaction-regression:adopt-hk-grade-split-packages-evidence-a:workstream=a11-browser-visual-interaction-regression|owners=A06+A11|status=accepted"
  );
});

test("MAIS Manim v2 owner evidence submission bridge feeds covered records into completion evidence intake", () => {
  const checklist = acceptanceChecklistFixture();
  const packet = ownerEvidenceRequestPacketFixture();
  const bridge = buildMathSceneV2OwnerEvidenceSubmissionCompletionBridge({
    acceptanceChecklist: checklist,
    ownerEvidenceRequestPacket: packet,
    submittedRecords: recordsFromPacketTemplates()
  });
  const attributes = mathSceneV2OwnerEvidenceSubmissionCompletionBridgeDataAttributes(bridge);

  assert.equal(bridge.sourceContract, MATH_SCENE_V2_OWNER_EVIDENCE_SUBMISSION_COMPLETION_BRIDGE_SOURCE_CONTRACT);
  assert.equal(bridge.status, "owner-evidence-covered");
  assert.equal(bridge.readyForOwnerGateRerun, true);
  assert.equal(bridge.submissionIntake.status, "owner-submissions-covered");
  assert.equal(bridge.completionEvidenceIntake.status, "owner-evidence-covered");
  assert.equal(bridge.completionEvidenceIntake.readyForGoalGateRerun, true);
  assert.equal(bridge.completionEvidenceIntake.canMarkThreadGoalComplete, false);
  assert.equal(bridge.completionEvidenceIntake.acceptedEvidenceCount, 22);
  assert.equal(bridge.ownerGateRerunRequestRowCount, 3);
  assert.equal(bridge.readyOwnerGateRerunRequestCount, 3);
  assert.equal(bridge.blockedOwnerGateRerunRequestCount, 0);
  assert.equal(bridge.ownerGateRerunRecordTemplateCount, 3);
  assert.deepEqual(bridge.ownerGateRerunRequestOwnerIds, ["A11", "A18", "A22"]);
  assert.deepEqual(bridge.ownerGateRerunRequestRows.map((row) => row.ownerAgentId), ["A11", "A18", "A22"]);
  assert.deepEqual(bridge.ownerGateRerunRequestRows.map((row) => row.requiredEvidenceCount), [6, 10, 6]);
  assert.equal(
    (bridge as { a11RequiredRootDataAttributeCount?: number }).a11RequiredRootDataAttributeCount,
    packet.a11RequiredRootDataAttributeCount
  );
  assert.equal(
    (bridge as { a11RunFromBeatCheckpointInvalidationDataAttributeManifest?: string })
      .a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    packet.a11RunFromBeatCheckpointInvalidationDataAttributeManifest
  );
  assert.equal((bridge as { reviewSliceCount?: number }).reviewSliceCount, packet.reviewSliceCount);
  assert.equal((bridge as { reviewSliceIds?: string }).reviewSliceIds, packet.reviewSliceIds);
  assert.equal(
    (bridge as { reviewSliceFileManifest?: string }).reviewSliceFileManifest,
    packet.reviewSliceFileManifest
  );
  assert.equal(
    (bridge as { reviewSliceConsumerGateEvidenceIdManifest?: string }).reviewSliceConsumerGateEvidenceIdManifest,
    packet.reviewSliceConsumerGateEvidenceIdManifest
  );
  assert.equal((bridge as { reviewSliceSummary?: string }).reviewSliceSummary, packet.reviewSliceSummary);
  assert.deepEqual(
    bridge.ownerGateRerunRequestRows.map((row) => row.rerunTargetIds),
    [
      ["a11-browser-visual-interaction-regression"],
      ["a18-a06-teaching-quality-confirmation"],
      ["a22-clean-release-gate"]
    ]
  );
  assert.ok(
    bridge.ownerGateRerunRequestRows.every((row) => row.status === "ready-for-owner-gate-rerun")
  );
  assert.deepEqual(bridge.ownerGateRerunRecordTemplates, [
    {
      evidenceId: "accepted-A11-gate-rerun",
      ownerAgentId: "A11",
      rerunTarget: "a11-browser-visual-interaction-regression",
      status: "accepted",
      stepId: "01-owner-gate-A11"
    },
    {
      evidenceId: "accepted-A18-gate-rerun",
      ownerAgentId: "A18",
      rerunTarget: "a18-a06-teaching-quality-confirmation",
      status: "accepted",
      stepId: "02-owner-gate-A18"
    },
    {
      evidenceId: "accepted-A22-gate-rerun",
      ownerAgentId: "A22",
      rerunTarget: "a22-clean-release-gate",
      status: "accepted",
      stepId: "03-owner-gate-A22"
    }
  ]);
  assert.equal(attributes["data-viz-manim-v2-owner-evidence-submission-completion-bridge-status"], "owner-evidence-covered");
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-completion-bridge-a11-required-root-attribute-count"],
    String(packet.a11RequiredRootDataAttributeCount)
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-completion-bridge-a11-run-from-beat-checkpoint-invalidation-attributes"],
    packet.a11RunFromBeatCheckpointInvalidationDataAttributeManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-completion-bridge-review-slice-count"],
    String(reviewSliceCount)
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-completion-bridge-review-slice-ids"],
    reviewSliceIds
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-completion-bridge-review-slice-file-manifest"],
    reviewSliceFileManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-completion-bridge-review-slice-consumer-gate-evidence-id-manifest"],
    reviewSliceConsumerGateEvidenceIdManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-completion-bridge-review-slices"],
    reviewSliceSummary
  );
  assert.equal(attributes["data-viz-manim-v2-owner-evidence-submission-completion-bridge-owner-gate-rerun-request-count"], "3");
  assert.equal(attributes["data-viz-manim-v2-owner-evidence-submission-completion-bridge-owner-gate-rerun-ready-count"], "3");
  assert.equal(attributes["data-viz-manim-v2-owner-evidence-submission-completion-bridge-owner-gate-rerun-blocked-count"], "0");
  assert.equal(attributes["data-viz-manim-v2-owner-evidence-submission-completion-bridge-owner-gate-rerun-record-template-count"], "3");
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-completion-bridge-owner-gate-rerun-record-template-manifest"],
    "A11:01-owner-gate-A11:accepted-A11-gate-rerun:a11-browser-visual-interaction-regression:accepted;A18:02-owner-gate-A18:accepted-A18-gate-rerun:a18-a06-teaching-quality-confirmation:accepted;A22:03-owner-gate-A22:accepted-A22-gate-rerun:a22-clean-release-gate:accepted"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-completion-bridge-owner-gate-rerun-request-manifest"],
    "A11:ready-for-owner-gate-rerun:target=a11-browser-visual-interaction-regression|evidence=6/6;A18:ready-for-owner-gate-rerun:target=a18-a06-teaching-quality-confirmation|evidence=10/10;A22:ready-for-owner-gate-rerun:target=a22-clean-release-gate|evidence=6/6"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-completion-bridge-accepted-submitted-record-manifest"],
    bridge.submissionIntake.acceptedSubmittedRecordManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-completion-bridge-missing-template-manifest"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-completion-bridge-invalid-submitted-record-manifest"],
    "none"
  );
  assert.equal(attributes["data-viz-manim-v2-owner-evidence-submission-completion-bridge-ready-for-owner-gate-rerun"], "true");
  assert.equal(attributes["data-viz-manim-v2-owner-evidence-submission-completion-bridge-can-complete"], "false");
  assert.match(bridge.summary, /reviewSlices=20@24/);
  assert.match(bridge.summary, /a11RootAttributes=5/);
});

test("MAIS Manim v2 owner evidence submission bridge carries submission-intake source-architecture blocker reasons", () => {
  const checklist = acceptanceChecklistFixture();
  checklist.sourceArchitectureBlockerReasonManifest = "duplicateReviewSliceFiles,unclassifiedManimFiles";
  checklist.sourceArchitectureBlockerReasons = ["duplicateReviewSliceFiles", "unclassifiedManimFiles"];
  const evidenceIntake = buildMathSceneV2CompletionEvidenceIntake(checklist, []);
  const packet = buildMathSceneV2OwnerEvidenceRequestPacket({
    acceptanceChecklist: checklist,
    evidenceIntake
  });
  const submittedRecords = packet.submissionRecordTemplates.map((template) => ({
    actionId: template.actionId,
    evidenceId: template.evidenceId,
    ownerAgentIds: template.ownerAgentIds,
    status: template.status,
    submitterAgentId: template.submitterAgentId
  }));
  const bridge = buildMathSceneV2OwnerEvidenceSubmissionCompletionBridge({
    acceptanceChecklist: checklist,
    ownerEvidenceRequestPacket: packet,
    submittedRecords
  });
  const attributes = mathSceneV2OwnerEvidenceSubmissionCompletionBridgeDataAttributes(bridge);

  assert.deepEqual(
    (bridge as { sourceArchitectureBlockerReasons?: unknown }).sourceArchitectureBlockerReasons,
    bridge.submissionIntake.sourceArchitectureBlockerReasons
  );
  assert.equal(
    (bridge as { sourceArchitectureBlockerReasonManifest?: string }).sourceArchitectureBlockerReasonManifest,
    bridge.submissionIntake.sourceArchitectureBlockerReasonManifest
  );
  assert.match(bridge.summary, /sourceBlockers=duplicateReviewSliceFiles,unclassifiedManimFiles/);
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-completion-bridge-source-architecture-blocker-reasons"],
    "duplicateReviewSliceFiles,unclassifiedManimFiles"
  );
});

test("MAIS Manim v2 owner evidence submission bridge stays pending for partial submissions", () => {
  const bridge = buildMathSceneV2OwnerEvidenceSubmissionCompletionBridge({
    acceptanceChecklist: acceptanceChecklistFixture(),
    ownerEvidenceRequestPacket: ownerEvidenceRequestPacketFixture(),
    submittedRecords: recordsFromPacketTemplates().slice(1)
  });

  assert.equal(bridge.status, "pending-owner-submissions");
  assert.equal(bridge.readyForOwnerGateRerun, false);
  assert.equal(bridge.submissionIntake.missingTemplateCount, 1);
  assert.equal(bridge.completionEvidenceIntake.status, "pending-owner-evidence");
  assert.equal(bridge.completionEvidenceIntake.missingEvidenceCount, 1);
  assert.equal(bridge.ownerGateRerunRequestRowCount, 3);
  assert.equal(bridge.readyOwnerGateRerunRequestCount, 2);
  assert.equal(bridge.blockedOwnerGateRerunRequestCount, 1);
  assert.equal(bridge.ownerGateRerunRecordTemplateCount, 0);
  assert.deepEqual(bridge.ownerGateRerunRecordTemplates, []);
  assert.deepEqual(
    bridge.ownerGateRerunRequestRows.map((row) => `${row.ownerAgentId}:${row.status}:${row.acceptedEvidenceCount}/${row.requiredEvidenceCount}`),
    [
      "A11:pending-owner-submissions:5/6",
      "A18:ready-for-owner-gate-rerun:10/10",
      "A22:ready-for-owner-gate-rerun:6/6"
    ]
  );
  assert.equal(
    mathSceneV2OwnerEvidenceSubmissionCompletionBridgeDataAttributes(bridge)[
      "data-viz-manim-v2-owner-evidence-submission-completion-bridge-missing-template-manifest"
    ],
    "A11:a11-browser-visual-interaction-regression:adopt-hk-grade-split-packages:a11-browser-visual-interaction-regression:adopt-hk-grade-split-packages-evidence-a:workstream=a11-browser-visual-interaction-regression|owners=A06+A11|status=accepted"
  );
});

test("MAIS Manim v2 owner evidence submission bridge blocks invalid submissions before owner gate rerun", () => {
  const submittedRecords = recordsFromPacketTemplates();
  const invalidRecord = {
    ...submittedRecords[0],
    submitterAgentId: "A18"
  };
  const bridge = buildMathSceneV2OwnerEvidenceSubmissionCompletionBridge({
    acceptanceChecklist: acceptanceChecklistFixture(),
    ownerEvidenceRequestPacket: ownerEvidenceRequestPacketFixture(),
    submittedRecords: [invalidRecord, ...submittedRecords.slice(1)]
  });

  assert.equal(bridge.status, "blocked-invalid-owner-submissions");
  assert.equal(bridge.readyForOwnerGateRerun, false);
  assert.equal(bridge.submissionIntake.invalidSubmittedRecordCount, 1);
  assert.equal(bridge.submissionIntake.missingTemplateCount, 1);
  assert.equal(bridge.completionEvidenceIntake.status, "pending-owner-evidence");
  assert.equal(bridge.completionEvidenceIntake.readyForGoalGateRerun, false);
  assert.equal(bridge.ownerGateRerunRequestRowCount, 3);
  assert.equal(bridge.readyOwnerGateRerunRequestCount, 0);
  assert.equal(bridge.blockedOwnerGateRerunRequestCount, 3);
  assert.equal(bridge.ownerGateRerunRecordTemplateCount, 0);
  assert.deepEqual(bridge.ownerGateRerunRecordTemplates, []);
  assert.ok(
    bridge.ownerGateRerunRequestRows.every((row) => row.status === "blocked-invalid-owner-submissions")
  );
  assert.equal(
    mathSceneV2OwnerEvidenceSubmissionCompletionBridgeDataAttributes(bridge)[
      "data-viz-manim-v2-owner-evidence-submission-completion-bridge-invalid-submitted-record-manifest"
    ],
    "A18:a11-browser-visual-interaction-regression:adopt-hk-grade-split-packages:a11-browser-visual-interaction-regression:adopt-hk-grade-split-packages-evidence-a:owners=A06+A11|status=accepted"
  );
});

test("MAIS Manim v2 owner evidence submission bridge aligns owner gate rerun record templates with the rerun plan", () => {
  const bridge = readySubmissionBridge();
  const alignment =
    buildMathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordTemplatePlanAlignment({
      bridge,
      rerunPlan: coveredOwnerEvidenceRerunPlanFixture()
    });
  const attributes =
    mathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordTemplatePlanAlignmentDataAttributes(alignment);

  assert.equal(
    alignment.sourceContract,
    MATH_SCENE_V2_OWNER_EVIDENCE_SUBMISSION_OWNER_GATE_RERUN_RECORD_TEMPLATE_PLAN_ALIGNMENT_SOURCE_CONTRACT
  );
  assert.equal(alignment.status, "aligned-owner-gate-rerun-record-templates");
  assert.equal(alignment.canSubmitOwnerGateRerunRecords, true);
  assert.equal(alignment.ownerGateRerunStepCount, 3);
  assert.equal(alignment.recordTemplateCount, 3);
  assert.equal(alignment.alignedRecordTemplateCount, 3);
  assert.equal(alignment.mismatchedRecordTemplateCount, 0);
  assert.deepEqual(alignment.mismatchedRecordTemplateRows, []);
  assert.deepEqual(alignment.alignedRecordTemplateStepIds, [
    "01-owner-gate-A11",
    "02-owner-gate-A18",
    "03-owner-gate-A22"
  ]);
  assert.deepEqual(alignment.recordTemplates, bridge.ownerGateRerunRecordTemplates);
  assert.equal(
    (alignment as { a11RequiredRootDataAttributeCount?: number }).a11RequiredRootDataAttributeCount,
    bridge.a11RequiredRootDataAttributeCount
  );
  assert.equal(
    (alignment as { a11RunFromBeatCheckpointInvalidationDataAttributeManifest?: string })
      .a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    bridge.a11RunFromBeatCheckpointInvalidationDataAttributeManifest
  );
  assert.equal((alignment as { reviewSliceCount?: number }).reviewSliceCount, bridge.reviewSliceCount);
  assert.equal((alignment as { reviewSliceIds?: string }).reviewSliceIds, bridge.reviewSliceIds);
  assert.equal(
    (alignment as { reviewSliceFileManifest?: string }).reviewSliceFileManifest,
    bridge.reviewSliceFileManifest
  );
  assert.equal(
    (alignment as { reviewSliceConsumerGateEvidenceIdManifest?: string }).reviewSliceConsumerGateEvidenceIdManifest,
    bridge.reviewSliceConsumerGateEvidenceIdManifest
  );
  assert.equal(
    (alignment as { reviewSliceSummary?: string }).reviewSliceSummary,
    bridge.reviewSliceSummary
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-template-plan-alignment-status"],
    "aligned-owner-gate-rerun-record-templates"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-template-plan-alignment-a11-required-root-attribute-count"],
    String(bridge.a11RequiredRootDataAttributeCount)
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-template-plan-alignment-a11-run-from-beat-checkpoint-invalidation-attributes"],
    bridge.a11RunFromBeatCheckpointInvalidationDataAttributeManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-template-plan-alignment-review-slice-count"],
    String(reviewSliceCount)
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-template-plan-alignment-review-slice-ids"],
    reviewSliceIds
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-template-plan-alignment-review-slice-file-manifest"],
    reviewSliceFileManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-template-plan-alignment-review-slice-consumer-gate-evidence-id-manifest"],
    reviewSliceConsumerGateEvidenceIdManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-template-plan-alignment-review-slices"],
    reviewSliceSummary
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-template-plan-alignment-manifest"],
    "A11:01-owner-gate-A11:accepted-A11-gate-rerun:aligned;A18:02-owner-gate-A18:accepted-A18-gate-rerun:aligned;A22:03-owner-gate-A22:accepted-A22-gate-rerun:aligned"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-template-plan-alignment-can-submit"],
    "true"
  );
  assert.match(alignment.summary, /a11RootAttributes=5/);
  assert.match(alignment.summary, /reviewSlices=20@24/);
});

test("MAIS Manim v2 owner evidence submission owner-gate template alignment carries completion-bridge source-architecture blocker reasons", () => {
  const checklist = acceptanceChecklistFixture();
  checklist.sourceArchitectureBlockerReasonManifest = "duplicateReviewSliceFiles,unclassifiedManimFiles";
  checklist.sourceArchitectureBlockerReasons = ["duplicateReviewSliceFiles", "unclassifiedManimFiles"];
  const evidenceIntake = buildMathSceneV2CompletionEvidenceIntake(checklist, []);
  const packet = buildMathSceneV2OwnerEvidenceRequestPacket({
    acceptanceChecklist: checklist,
    evidenceIntake
  });
  const submittedRecords = packet.submissionRecordTemplates.map((template) => ({
    actionId: template.actionId,
    evidenceId: template.evidenceId,
    ownerAgentIds: template.ownerAgentIds,
    status: template.status,
    submitterAgentId: template.submitterAgentId
  }));
  const bridge = buildMathSceneV2OwnerEvidenceSubmissionCompletionBridge({
    acceptanceChecklist: checklist,
    ownerEvidenceRequestPacket: packet,
    submittedRecords
  });
  const alignment =
    buildMathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordTemplatePlanAlignment({
      bridge,
      rerunPlan: coveredOwnerEvidenceRerunPlanFixture()
    });
  const attributes =
    mathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordTemplatePlanAlignmentDataAttributes(alignment);

  assert.deepEqual(
    (alignment as { sourceArchitectureBlockerReasons?: unknown }).sourceArchitectureBlockerReasons,
    bridge.sourceArchitectureBlockerReasons
  );
  assert.equal(
    (alignment as { sourceArchitectureBlockerReasonManifest?: string }).sourceArchitectureBlockerReasonManifest,
    bridge.sourceArchitectureBlockerReasonManifest
  );
  assert.match(alignment.summary, /sourceBlockers=duplicateReviewSliceFiles,unclassifiedManimFiles/);
  assert.equal(
    attributes[
      "data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-template-plan-alignment-source-architecture-blocker-reasons"
    ],
    "duplicateReviewSliceFiles,unclassifiedManimFiles"
  );
});

test("MAIS Manim v2 owner evidence submission bridge keeps plan alignment pending without global template readiness", () => {
  const bridge = buildMathSceneV2OwnerEvidenceSubmissionCompletionBridge({
    acceptanceChecklist: acceptanceChecklistFixture(),
    ownerEvidenceRequestPacket: ownerEvidenceRequestPacketFixture(),
    submittedRecords: recordsFromPacketTemplates().slice(1)
  });
  const alignment =
    buildMathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordTemplatePlanAlignment({
      bridge,
      rerunPlan: coveredOwnerEvidenceRerunPlanFixture()
    });

  assert.equal(alignment.status, "pending-owner-gate-rerun-record-templates");
  assert.equal(alignment.canSubmitOwnerGateRerunRecords, false);
  assert.equal(alignment.ownerGateRerunStepCount, 3);
  assert.equal(alignment.recordTemplateCount, 0);
  assert.equal(alignment.alignedRecordTemplateCount, 0);
  assert.equal(alignment.mismatchedRecordTemplateCount, 0);
  assert.deepEqual(alignment.mismatchedRecordTemplateRows, []);
  assert.deepEqual(alignment.recordTemplates, []);
});

test("MAIS Manim v2 owner evidence submission bridge blocks rerun record templates that drift from the rerun plan", () => {
  const bridge = readySubmissionBridge();
  const rerunPlan = coveredOwnerEvidenceRerunPlanFixture();
  const staleRerunPlan: MathSceneV2CompletionRerunPlan = {
    ...rerunPlan,
    steps: rerunPlan.steps.map((step) =>
      step.stepId === "02-owner-gate-A18"
        ? { ...step, rerunTarget: "a22-clean-release-gate" }
        : step
    )
  };
  const alignment =
    buildMathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordTemplatePlanAlignment({
      bridge,
      rerunPlan: staleRerunPlan
    });
  const attributes =
    mathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordTemplatePlanAlignmentDataAttributes(alignment);

  assert.equal(alignment.status, "blocked-owner-gate-rerun-record-template-plan-mismatch");
  assert.equal(alignment.canSubmitOwnerGateRerunRecords, false);
  assert.equal(alignment.ownerGateRerunStepCount, 3);
  assert.equal(alignment.recordTemplateCount, 3);
  assert.equal(alignment.alignedRecordTemplateCount, 2);
  assert.equal(alignment.mismatchedRecordTemplateCount, 1);
  assert.deepEqual(alignment.mismatchedRecordTemplateRows, [
    "A18:02-owner-gate-A18:rerunTarget=a18-a06-teaching-quality-confirmation->a22-clean-release-gate"
  ]);
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-template-plan-alignment-mismatch-rows"],
    "A18:02-owner-gate-A18:rerunTarget=a18-a06-teaching-quality-confirmation->a22-clean-release-gate"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-template-plan-alignment-can-submit"],
    "false"
  );
});

test("MAIS Manim v2 owner evidence submission bridge keeps owner gate rerun submissions pending without real rerun records", () => {
  const submissionBridge = readySubmissionBridge();
  const rerunSubmissionBridge =
    buildMathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordSubmissionBridge({
      rerunPlan: coveredOwnerEvidenceRerunPlanFixture(),
      submissionBridge,
      submittedOwnerGateRerunRecords: []
    });
  const attributes =
    mathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordSubmissionBridgeDataAttributes(
      rerunSubmissionBridge
    );

  assert.equal(
    rerunSubmissionBridge.sourceContract,
    MATH_SCENE_V2_OWNER_EVIDENCE_SUBMISSION_OWNER_GATE_RERUN_RECORD_SUBMISSION_BRIDGE_SOURCE_CONTRACT
  );
  assert.equal(rerunSubmissionBridge.status, "pending-owner-gate-rerun-submissions");
  assert.equal(rerunSubmissionBridge.canRequestFinalObjectiveAudit, false);
  assert.equal(rerunSubmissionBridge.consumedOwnerGateRerunRecordCount, 0);
  assert.equal(rerunSubmissionBridge.submittedOwnerGateRerunRecordCount, 0);
  assert.equal(rerunSubmissionBridge.templateAlignment.status, "aligned-owner-gate-rerun-record-templates");
  assert.equal(rerunSubmissionBridge.ownerGateRerunIntake.status, "pending-owner-gate-reruns");
  assert.equal(rerunSubmissionBridge.ownerGateRerunIntake.acceptedGateCount, 0);
  assert.equal(rerunSubmissionBridge.ownerGateRerunIntake.pendingGateCount, 3);
  assert.equal(
    rerunSubmissionBridge.acceptedSubmittedRecordManifest,
    submissionBridge.submissionIntake.acceptedSubmittedRecordManifest
  );
  assert.equal(rerunSubmissionBridge.missingTemplateManifest, "none");
  assert.equal(rerunSubmissionBridge.invalidSubmittedRecordManifest, "none");
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-submission-bridge-status"],
    "pending-owner-gate-rerun-submissions"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-submission-bridge-accepted-submitted-record-manifest"],
    submissionBridge.submissionIntake.acceptedSubmittedRecordManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-submission-bridge-can-request-final-audit"],
    "false"
  );
});

test("MAIS Manim v2 owner evidence submission bridge accepts real owner gate rerun records through the existing intake", () => {
  const submissionBridge = readySubmissionBridge();
  const rerunPlan = coveredOwnerEvidenceRerunPlanFixture();
  const rerunSubmissionBridge =
    buildMathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordSubmissionBridge({
      rerunPlan,
      submissionBridge,
      submittedOwnerGateRerunRecords: acceptedOwnerGateRerunRecordsFromPlan()
    });
  const attributes =
    mathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordSubmissionBridgeDataAttributes(
      rerunSubmissionBridge
    );

  assert.equal(rerunSubmissionBridge.status, "owner-gate-rerun-submissions-covered");
  assert.equal(rerunSubmissionBridge.canRequestFinalObjectiveAudit, true);
  assert.equal(rerunSubmissionBridge.consumedOwnerGateRerunRecordCount, 3);
  assert.equal(rerunSubmissionBridge.submittedOwnerGateRerunRecordCount, 3);
  assert.equal(rerunSubmissionBridge.templateAlignment.canSubmitOwnerGateRerunRecords, true);
  assert.equal(rerunSubmissionBridge.ownerGateRerunIntake.status, "owner-gate-reruns-covered");
  assert.equal(rerunSubmissionBridge.ownerGateRerunIntake.readyForFinalAudit, true);
  assert.equal(rerunSubmissionBridge.ownerGateRerunIntake.canMarkThreadGoalComplete, false);
  assert.equal(
    (rerunSubmissionBridge as { ownerActionEvidenceCountManifest?: string }).ownerActionEvidenceCountManifest,
    rerunPlan.ownerActionEvidenceCountManifest
  );
  assert.equal(
    (rerunSubmissionBridge as { a11RequiredRootDataAttributeCount?: number })
      .a11RequiredRootDataAttributeCount,
    submissionBridge.a11RequiredRootDataAttributeCount
  );
  assert.equal(
    (rerunSubmissionBridge as { a11RunFromBeatCheckpointInvalidationDataAttributeManifest?: string })
      .a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    submissionBridge.a11RunFromBeatCheckpointInvalidationDataAttributeManifest
  );
  assert.equal(
    (rerunSubmissionBridge as { reviewSliceCount?: number }).reviewSliceCount,
    submissionBridge.reviewSliceCount
  );
  assert.equal(
    (rerunSubmissionBridge as { reviewSliceIds?: string }).reviewSliceIds,
    submissionBridge.reviewSliceIds
  );
  assert.equal(
    (rerunSubmissionBridge as { reviewSliceFileManifest?: string }).reviewSliceFileManifest,
    submissionBridge.reviewSliceFileManifest
  );
  assert.equal(
    (rerunSubmissionBridge as { reviewSliceConsumerGateEvidenceIdManifest?: string })
      .reviewSliceConsumerGateEvidenceIdManifest,
    submissionBridge.reviewSliceConsumerGateEvidenceIdManifest
  );
  assert.equal(
    (rerunSubmissionBridge as { reviewSliceSummary?: string }).reviewSliceSummary,
    submissionBridge.reviewSliceSummary
  );
  assert.equal(
    rerunSubmissionBridge.acceptedSubmittedRecordManifest,
    submissionBridge.submissionIntake.acceptedSubmittedRecordManifest
  );
  assert.equal(rerunSubmissionBridge.missingTemplateManifest, "none");
  assert.equal(rerunSubmissionBridge.invalidSubmittedRecordManifest, "none");
  assert.deepEqual(rerunSubmissionBridge.ownerGateRerunIntake.rows.map((row) => row.acceptedEvidenceId), [
    "accepted-A11-gate-rerun",
    "accepted-A18-gate-rerun",
    "accepted-A22-gate-rerun"
  ]);
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-submission-bridge-status"],
    "owner-gate-rerun-submissions-covered"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-submission-bridge-owner-gate-intake-status"],
    "owner-gate-reruns-covered"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-submission-bridge-missing-template-manifest"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-submission-bridge-invalid-submitted-record-manifest"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-submission-bridge-owner-action-evidence-count-manifest"],
    rerunPlan.ownerActionEvidenceCountManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-submission-bridge-a11-required-root-attribute-count"],
    String(submissionBridge.a11RequiredRootDataAttributeCount)
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-submission-bridge-a11-run-from-beat-checkpoint-invalidation-attributes"],
    submissionBridge.a11RunFromBeatCheckpointInvalidationDataAttributeManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-submission-bridge-review-slice-count"],
    String(reviewSliceCount)
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-submission-bridge-review-slice-ids"],
    reviewSliceIds
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-submission-bridge-review-slice-file-manifest"],
    reviewSliceFileManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-submission-bridge-review-slice-consumer-gate-evidence-id-manifest"],
    reviewSliceConsumerGateEvidenceIdManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-submission-bridge-review-slices"],
    reviewSliceSummary
  );
  assert.match(rerunSubmissionBridge.summary, /a11RootAttributes=5/);
  assert.match(rerunSubmissionBridge.summary, /reviewSlices=20@24/);
});

test("MAIS Manim v2 owner evidence submission owner-gate rerun submission bridge carries template-alignment source-architecture blocker reasons", () => {
  const checklist = acceptanceChecklistFixture();
  checklist.sourceArchitectureBlockerReasonManifest = "duplicateReviewSliceFiles,unclassifiedManimFiles";
  checklist.sourceArchitectureBlockerReasons = ["duplicateReviewSliceFiles", "unclassifiedManimFiles"];
  const evidenceIntake = buildMathSceneV2CompletionEvidenceIntake(checklist, []);
  const packet = buildMathSceneV2OwnerEvidenceRequestPacket({
    acceptanceChecklist: checklist,
    evidenceIntake
  });
  const submittedRecords = packet.submissionRecordTemplates.map((template) => ({
    actionId: template.actionId,
    evidenceId: template.evidenceId,
    ownerAgentIds: template.ownerAgentIds,
    status: template.status,
    submitterAgentId: template.submitterAgentId
  }));
  const submissionBridge = buildMathSceneV2OwnerEvidenceSubmissionCompletionBridge({
    acceptanceChecklist: checklist,
    ownerEvidenceRequestPacket: packet,
    submittedRecords
  });
  const rerunSubmissionBridge =
    buildMathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordSubmissionBridge({
      rerunPlan: coveredOwnerEvidenceRerunPlanFixture(),
      submissionBridge,
      submittedOwnerGateRerunRecords: acceptedOwnerGateRerunRecordsFromPlan()
    });
  const attributes =
    mathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordSubmissionBridgeDataAttributes(
      rerunSubmissionBridge
    );

  assert.deepEqual(
    (rerunSubmissionBridge as { sourceArchitectureBlockerReasons?: unknown }).sourceArchitectureBlockerReasons,
    rerunSubmissionBridge.templateAlignment.sourceArchitectureBlockerReasons
  );
  assert.equal(
    (rerunSubmissionBridge as { sourceArchitectureBlockerReasonManifest?: string })
      .sourceArchitectureBlockerReasonManifest,
    rerunSubmissionBridge.templateAlignment.sourceArchitectureBlockerReasonManifest
  );
  assert.match(rerunSubmissionBridge.summary, /sourceBlockers=duplicateReviewSliceFiles,unclassifiedManimFiles/);
  assert.equal(
    attributes[
      "data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-submission-bridge-source-architecture-blocker-reasons"
    ],
    "duplicateReviewSliceFiles,unclassifiedManimFiles"
  );
});

test("MAIS Manim v2 owner evidence submission bridge blocks owner gate rerun submissions when template plan alignment fails", () => {
  const rerunPlan = coveredOwnerEvidenceRerunPlanFixture();
  const staleRerunPlan: MathSceneV2CompletionRerunPlan = {
    ...rerunPlan,
    steps: rerunPlan.steps.map((step) =>
      step.stepId === "02-owner-gate-A18"
        ? { ...step, rerunTarget: "a22-clean-release-gate" }
        : step
    )
  };
  const rerunSubmissionBridge =
    buildMathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordSubmissionBridge({
      rerunPlan: staleRerunPlan,
      submissionBridge: readySubmissionBridge(),
      submittedOwnerGateRerunRecords: acceptedOwnerGateRerunRecordsFromPlan()
    });
  const attributes =
    mathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordSubmissionBridgeDataAttributes(
      rerunSubmissionBridge
    );

  assert.equal(
    rerunSubmissionBridge.status,
    "blocked-owner-gate-rerun-record-template-plan-alignment"
  );
  assert.equal(rerunSubmissionBridge.canRequestFinalObjectiveAudit, false);
  assert.equal(rerunSubmissionBridge.consumedOwnerGateRerunRecordCount, 0);
  assert.equal(rerunSubmissionBridge.submittedOwnerGateRerunRecordCount, 3);
  assert.equal(
    rerunSubmissionBridge.templateAlignment.status,
    "blocked-owner-gate-rerun-record-template-plan-mismatch"
  );
  assert.equal(rerunSubmissionBridge.ownerGateRerunIntake.status, "pending-owner-gate-reruns");
  assert.equal(rerunSubmissionBridge.ownerGateRerunIntake.acceptedGateCount, 0);
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-submission-bridge-consumed-count"],
    "0"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-submission-bridge-template-alignment-status"],
    "blocked-owner-gate-rerun-record-template-plan-mismatch"
  );
});
