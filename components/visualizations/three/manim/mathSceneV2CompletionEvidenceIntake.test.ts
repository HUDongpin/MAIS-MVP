import assert from "node:assert/strict";
import test from "node:test";
import {
  MATH_SCENE_V2_COMPLETION_ACCEPTANCE_CHECKLIST_SOURCE_CONTRACT,
  type MathSceneV2CompletionAcceptanceAction,
  type MathSceneV2CompletionAcceptanceChecklist
} from "./mathSceneV2CompletionAcceptanceChecklist";
import {
  buildMathSceneV2CompletionEvidenceIntake,
  mathSceneV2CompletionEvidenceIntakeDataAttributes,
  MATH_SCENE_V2_COMPLETION_EVIDENCE_INTAKE_SOURCE_CONTRACT
} from "./mathSceneV2CompletionEvidenceIntake";
import type { MathSceneV2GoalGateId } from "./mathSceneV2GoalGate";
import { classifyManimReviewPackage } from "./mathSceneReviewPackages";

const reviewSliceConsumerGateEvidenceIdManifest =
  "manim-review-slice-01=A06-source-review:source-review-note:ready-for-slice-review";
const reviewSliceCount = 20;
const reviewSliceFileManifest = "manim-review-slice-01=mathSceneV2CompletionEvidenceIntake.ts";
const reviewSliceIds = "manim-review-slice-01";
const reviewSliceSummary = "20@24";
const a11RequiredRootDataAttributeCount = 5;
const a11RunFromBeatCheckpointInvalidationDataAttributeManifest =
  "data-viz-family-id,data-viz-concept-id,data-viz-scene-id,data-viz-beat-id,data-viz-checkpoint-id";

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
    blockingItems: [`${actionId}:blocker`],
    ownerAgentIds,
    ownerEvidenceStatus: "pending-owner-evidence",
    prerequisiteEvidenceSourceIds: [`${actionId}:source`],
    supportingAgentIds,
    verificationEvidenceIds: [`${actionId}:evidence-a`, `${actionId}:evidence-b`],
    workstreamId
  };
}

function acceptanceChecklistFixture(): MathSceneV2CompletionAcceptanceChecklist {
  const actions = [
    acceptanceActionFixture({
      action: "adopt-hk-grade-split-packages",
      actionId: "a11-browser-visual-interaction-regression:adopt-hk-grade-split-packages",
      ownerAgentIds: ["A11"],
      supportingAgentIds: ["A06", "A22"],
      workstreamId: "a11-browser-visual-interaction-regression"
    }),
    acceptanceActionFixture({
      action: "keep-non-hk-tracks-out-of-hk-demo-sweep",
      actionId: "a11-browser-visual-interaction-regression:keep-non-hk-tracks-out-of-hk-demo-sweep",
      ownerAgentIds: ["A11"],
      supportingAgentIds: ["A06", "A22"],
      workstreamId: "a11-browser-visual-interaction-regression"
    }),
    acceptanceActionFixture({
      action: "update-projection-views-expected-list",
      actionId: "a11-browser-visual-interaction-regression:update-projection-views-expected-list",
      ownerAgentIds: ["A11"],
      supportingAgentIds: ["A06", "A22"],
      workstreamId: "a11-browser-visual-interaction-regression"
    }),
    acceptanceActionFixture({
      action: "investigate-isolated-next-chunk-serving-after-broad-timeout",
      actionId: "a22-clean-release-gate:investigate-isolated-next-chunk-serving-after-broad-timeout",
      ownerAgentIds: ["A22"],
      supportingAgentIds: ["A06", "A11"],
      workstreamId: "a22-clean-release-gate"
    }),
    acceptanceActionFixture({
      action: "release-from-clean-worktree-or-reviewed-pruned-staging-slice",
      actionId: "a22-clean-release-gate:release-from-clean-worktree-or-reviewed-pruned-staging-slice",
      ownerAgentIds: ["A22"],
      supportingAgentIds: ["A06", "A11"],
      workstreamId: "a22-clean-release-gate"
    }),
    acceptanceActionFixture({
      action: "run-a22-generated-artifact-cleanup-after-preserving-evidence",
      actionId: "a22-clean-release-gate:run-a22-generated-artifact-cleanup-after-preserving-evidence",
      ownerAgentIds: ["A22"],
      supportingAgentIds: ["A06", "A11"],
      workstreamId: "a22-clean-release-gate"
    }),
    acceptanceActionFixture({
      action: "open-rendered-review-routes",
      actionId: "a18-a06-teaching-quality-confirmation:open-rendered-review-routes",
      ownerAgentIds: ["A18", "A06"],
      supportingAgentIds: [],
      workstreamId: "a18-a06-teaching-quality-confirmation"
    }),
    acceptanceActionFixture({
      action: "inspect-rendered-scene-targets",
      actionId: "a18-a06-teaching-quality-confirmation:inspect-rendered-scene-targets",
      ownerAgentIds: ["A18", "A06"],
      supportingAgentIds: [],
      workstreamId: "a18-a06-teaching-quality-confirmation"
    }),
    acceptanceActionFixture({
      action: "complete-a18-final-criterion-decisions",
      actionId: "a18-a06-teaching-quality-confirmation:complete-a18-final-criterion-decisions",
      ownerAgentIds: ["A18", "A06"],
      supportingAgentIds: [],
      workstreamId: "a18-a06-teaching-quality-confirmation"
    }),
    acceptanceActionFixture({
      action: "complete-a18-final-scene-signoff",
      actionId: "a18-a06-teaching-quality-confirmation:complete-a18-final-scene-signoff",
      ownerAgentIds: ["A18", "A06"],
      supportingAgentIds: [],
      workstreamId: "a18-a06-teaching-quality-confirmation"
    }),
    acceptanceActionFixture({
      action: "record-approve-or-revision-decision",
      actionId: "a18-a06-teaching-quality-confirmation:record-approve-or-revision-decision",
      ownerAgentIds: ["A18", "A06"],
      supportingAgentIds: [],
      workstreamId: "a18-a06-teaching-quality-confirmation"
    })
  ];
  const ownerAcceptanceCriteriaManifest = actions
    .map((action) => `${action.actionId}=criteria:${action.acceptanceCriteria.join("+") || "none"}`)
    .join("|") || "none";
  const ownerEvidenceRequirementManifest = actions
    .map(
      (action) =>
        `${action.actionId}=owners:${action.ownerAgentIds.join("+") || "none"};verification:${action.verificationEvidenceIds.join("+") || "none"};prerequisites:${action.prerequisiteEvidenceSourceIds.join("+") || "none"}`
    )
    .join("|") || "none";

  return {
    acceptedOwnerEvidenceCount: 0,
    a11RequiredRootDataAttributeCount,
    a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    actionCount: actions.length,
    actions,
    canMarkThreadGoalComplete: false,
    ownerActionEvidenceCountManifest: "fixture-owner-action-evidence-counts",
    ownerAcceptanceCriteriaManifest,
    ownerEvidenceRequirementManifest,
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
        actionCount: 3,
        pendingOwnerEvidenceCount: 3,
        workstreamId: "a22-clean-release-gate"
      },
      {
        actionCount: 5,
        pendingOwnerEvidenceCount: 5,
        workstreamId: "a18-a06-teaching-quality-confirmation"
      }
    ]
  };
}

function acceptedRecordsForEveryRequiredEvidence() {
  return acceptanceChecklistFixture().actions.flatMap((action) =>
    action.verificationEvidenceIds.map((evidenceId) => ({
      actionId: action.actionId,
      evidenceId,
      ownerAgentIds: action.ownerAgentIds,
      status: "accepted" as const
    }))
  );
}

test("MAIS Manim v2 completion evidence intake keeps missing owner evidence pending", () => {
  const intake = buildMathSceneV2CompletionEvidenceIntake(acceptanceChecklistFixture(), []);
  const expectedMissingActionManifest = [
    "a11-browser-visual-interaction-regression:adopt-hk-grade-split-packages=missing:a11-browser-visual-interaction-regression:adopt-hk-grade-split-packages:evidence-a+a11-browser-visual-interaction-regression:adopt-hk-grade-split-packages:evidence-b",
    "a11-browser-visual-interaction-regression:keep-non-hk-tracks-out-of-hk-demo-sweep=missing:a11-browser-visual-interaction-regression:keep-non-hk-tracks-out-of-hk-demo-sweep:evidence-a+a11-browser-visual-interaction-regression:keep-non-hk-tracks-out-of-hk-demo-sweep:evidence-b",
    "a11-browser-visual-interaction-regression:update-projection-views-expected-list=missing:a11-browser-visual-interaction-regression:update-projection-views-expected-list:evidence-a+a11-browser-visual-interaction-regression:update-projection-views-expected-list:evidence-b",
    "a22-clean-release-gate:investigate-isolated-next-chunk-serving-after-broad-timeout=missing:a22-clean-release-gate:investigate-isolated-next-chunk-serving-after-broad-timeout:evidence-a+a22-clean-release-gate:investigate-isolated-next-chunk-serving-after-broad-timeout:evidence-b",
    "a22-clean-release-gate:release-from-clean-worktree-or-reviewed-pruned-staging-slice=missing:a22-clean-release-gate:release-from-clean-worktree-or-reviewed-pruned-staging-slice:evidence-a+a22-clean-release-gate:release-from-clean-worktree-or-reviewed-pruned-staging-slice:evidence-b",
    "a22-clean-release-gate:run-a22-generated-artifact-cleanup-after-preserving-evidence=missing:a22-clean-release-gate:run-a22-generated-artifact-cleanup-after-preserving-evidence:evidence-a+a22-clean-release-gate:run-a22-generated-artifact-cleanup-after-preserving-evidence:evidence-b",
    "a18-a06-teaching-quality-confirmation:open-rendered-review-routes=missing:a18-a06-teaching-quality-confirmation:open-rendered-review-routes:evidence-a+a18-a06-teaching-quality-confirmation:open-rendered-review-routes:evidence-b",
    "a18-a06-teaching-quality-confirmation:inspect-rendered-scene-targets=missing:a18-a06-teaching-quality-confirmation:inspect-rendered-scene-targets:evidence-a+a18-a06-teaching-quality-confirmation:inspect-rendered-scene-targets:evidence-b",
    "a18-a06-teaching-quality-confirmation:complete-a18-final-criterion-decisions=missing:a18-a06-teaching-quality-confirmation:complete-a18-final-criterion-decisions:evidence-a+a18-a06-teaching-quality-confirmation:complete-a18-final-criterion-decisions:evidence-b",
    "a18-a06-teaching-quality-confirmation:complete-a18-final-scene-signoff=missing:a18-a06-teaching-quality-confirmation:complete-a18-final-scene-signoff:evidence-a+a18-a06-teaching-quality-confirmation:complete-a18-final-scene-signoff:evidence-b",
    "a18-a06-teaching-quality-confirmation:record-approve-or-revision-decision=missing:a18-a06-teaching-quality-confirmation:record-approve-or-revision-decision:evidence-a+a18-a06-teaching-quality-confirmation:record-approve-or-revision-decision:evidence-b"
  ].join("|");

  assert.equal(intake.sourceContract, MATH_SCENE_V2_COMPLETION_EVIDENCE_INTAKE_SOURCE_CONTRACT);
  assert.equal(intake.status, "pending-owner-evidence");
  assert.equal(intake.actionCount, 11);
  assert.equal(intake.acceptedActionCount, 0);
  assert.equal(intake.pendingActionCount, 11);
  assert.equal(intake.requiredEvidenceCount, 22);
  assert.equal(intake.acceptedEvidenceCount, 0);
  assert.equal(intake.missingEvidenceCount, 22);
  assert.equal(intake.invalidEvidenceRecordCount, 0);
  assert.equal(intake.readyForGoalGateRerun, false);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    (intake as { missingEvidenceOwnerGroupSummary?: string }).missingEvidenceOwnerGroupSummary,
    "A11=6;A22=6;A18+A06=10"
  );
  assert.equal(
    (intake as { missingEvidenceActionManifest?: string }).missingEvidenceActionManifest,
    expectedMissingActionManifest
  );
  assert.deepEqual((intake as { missingEvidenceOwnerGroups?: unknown }).missingEvidenceOwnerGroups, [
    {
      acceptedEvidenceCount: 0,
      missingEvidenceCount: 6,
      ownerAgentIds: ["A11"],
      pendingActionCount: 3,
      requiredEvidenceCount: 6
    },
    {
      acceptedEvidenceCount: 0,
      missingEvidenceCount: 6,
      ownerAgentIds: ["A22"],
      pendingActionCount: 3,
      requiredEvidenceCount: 6
    },
    {
      acceptedEvidenceCount: 0,
      missingEvidenceCount: 10,
      ownerAgentIds: ["A18", "A06"],
      pendingActionCount: 5,
      requiredEvidenceCount: 10
    }
  ]);
  assert.ok(intake.actions.every((action) => action.status === "pending-owner-evidence"));
});

test("MAIS Manim v2 completion evidence intake can cover all owner evidence without bypassing gates", () => {
  const intake = buildMathSceneV2CompletionEvidenceIntake(
    acceptanceChecklistFixture(),
    acceptedRecordsForEveryRequiredEvidence()
  );

  assert.equal(intake.status, "owner-evidence-covered");
  assert.equal(intake.actionCount, 11);
  assert.equal(intake.acceptedActionCount, 11);
  assert.equal(intake.pendingActionCount, 0);
  assert.equal(intake.requiredEvidenceCount, 22);
  assert.equal(intake.acceptedEvidenceCount, 22);
  assert.equal(intake.missingEvidenceCount, 0);
  assert.equal(intake.invalidEvidenceRecordCount, 0);
  assert.equal(intake.readyForGoalGateRerun, true);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    (intake as { missingEvidenceOwnerGroupSummary?: string }).missingEvidenceOwnerGroupSummary,
    "none"
  );
});

test("MAIS Manim v2 completion evidence intake blocks duplicate owner evidence IDs", () => {
  const records = acceptedRecordsForEveryRequiredEvidence();
  const duplicateRecord = records[0];
  const intake = buildMathSceneV2CompletionEvidenceIntake(acceptanceChecklistFixture(), [
    ...records,
    { ...duplicateRecord }
  ]);
  const attributes = mathSceneV2CompletionEvidenceIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-owner-evidence");
  assert.deepEqual(intake.duplicateEvidenceIds, [duplicateRecord.evidenceId]);
  assert.equal(intake.invalidEvidenceRecordCount, 2);
  assert.equal(intake.readyForGoalGateRerun, false);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-completion-evidence-intake-duplicate-evidence-ids"],
    duplicateRecord.evidenceId
  );
  assert.equal(attributes["data-viz-manim-v2-completion-evidence-intake-ready-for-rerun"], "false");
});

test("MAIS Manim v2 completion evidence intake reports invalid records and serializes attributes", () => {
  const checklist = acceptanceChecklistFixture();
  const intake = buildMathSceneV2CompletionEvidenceIntake(checklist, [
    {
      actionId: "a11-browser-visual-interaction-regression:unknown-action",
      evidenceId: "unknown-evidence",
      ownerAgentIds: ["A11"],
      status: "accepted"
    },
    {
      actionId: checklist.actions[0].actionId,
      evidenceId: "wrong-evidence-for-action",
      ownerAgentIds: checklist.actions[0].ownerAgentIds,
      status: "accepted"
    }
  ]);
  const attributes = mathSceneV2CompletionEvidenceIntakeDataAttributes(intake);

  assert.equal(classifyManimReviewPackage("mathSceneV2CompletionEvidenceIntake.ts"), "evidence");
  assert.equal(intake.invalidEvidenceRecordCount, 2);
  assert.equal(attributes["data-viz-manim-v2-completion-evidence-intake-source-contract"], MATH_SCENE_V2_COMPLETION_EVIDENCE_INTAKE_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-v2-completion-evidence-intake-status"], "blocked-invalid-owner-evidence");
  assert.equal(attributes["data-viz-manim-v2-completion-evidence-intake-action-count"], "11");
  assert.equal(attributes["data-viz-manim-v2-completion-evidence-intake-accepted-action-count"], "0");
  assert.equal(attributes["data-viz-manim-v2-completion-evidence-intake-missing-evidence-count"], "22");
  assert.equal(
    attributes["data-viz-manim-v2-completion-evidence-intake-missing-evidence-owner-groups"],
    "A11=6;A22=6;A18+A06=10"
  );
  assert.match(
    attributes["data-viz-manim-v2-completion-evidence-intake-missing-evidence-action-manifest"] ?? "",
    /adopt-hk-grade-split-packages=missing:a11-browser-visual-interaction-regression:adopt-hk-grade-split-packages:evidence-a\+a11-browser-visual-interaction-regression:adopt-hk-grade-split-packages:evidence-b/
  );
  assert.match(
    attributes["data-viz-manim-v2-completion-evidence-intake-missing-evidence-action-manifest"] ?? "",
    /complete-a18-final-criterion-decisions=missing:a18-a06-teaching-quality-confirmation:complete-a18-final-criterion-decisions:evidence-a\+a18-a06-teaching-quality-confirmation:complete-a18-final-criterion-decisions:evidence-b/
  );
  assert.equal(attributes["data-viz-manim-v2-completion-evidence-intake-invalid-record-count"], "2");
  assert.equal(attributes["data-viz-manim-v2-completion-evidence-intake-ready-for-rerun"], "false");
  assert.equal(attributes["data-viz-manim-v2-completion-evidence-intake-can-complete"], "false");
  assert.equal(attributes["data-viz-manim-v2-completion-evidence-intake-duplicate-evidence-ids"], "none");
});

test("MAIS Manim v2 completion evidence intake carries acceptance checklist source-architecture blocker reasons", () => {
  const checklist = acceptanceChecklistFixture();
  checklist.sourceArchitectureBlockerReasonManifest = "duplicateReviewSliceFiles,unclassifiedManimFiles";
  checklist.sourceArchitectureBlockerReasons = ["duplicateReviewSliceFiles", "unclassifiedManimFiles"];

  const intake = buildMathSceneV2CompletionEvidenceIntake(checklist, []);
  const attributes = mathSceneV2CompletionEvidenceIntakeDataAttributes(intake);

  assert.deepEqual(
    (intake as { sourceArchitectureBlockerReasons?: unknown }).sourceArchitectureBlockerReasons,
    ["duplicateReviewSliceFiles", "unclassifiedManimFiles"]
  );
  assert.equal(
    (intake as { sourceArchitectureBlockerReasonManifest?: string }).sourceArchitectureBlockerReasonManifest,
    "duplicateReviewSliceFiles,unclassifiedManimFiles"
  );
  assert.match((intake as { summary?: string }).summary ?? "", /sourceBlockers=duplicateReviewSliceFiles,unclassifiedManimFiles/);
  assert.equal(
    attributes["data-viz-manim-v2-completion-evidence-intake-source-architecture-blocker-reasons"],
    "duplicateReviewSliceFiles,unclassifiedManimFiles"
  );
});

test("MAIS Manim v2 completion evidence intake carries acceptance checklist review-slice provenance", () => {
  const checklist = acceptanceChecklistFixture();
  const intake = buildMathSceneV2CompletionEvidenceIntake(checklist, []);
  const attributes = mathSceneV2CompletionEvidenceIntakeDataAttributes(intake);

  assert.equal((intake as { reviewSliceCount?: number }).reviewSliceCount, checklist.reviewSliceCount);
  assert.equal((intake as { reviewSliceIds?: string }).reviewSliceIds, checklist.reviewSliceIds);
  assert.equal((intake as { reviewSliceFileManifest?: string }).reviewSliceFileManifest, checklist.reviewSliceFileManifest);
  assert.equal(
    (intake as { reviewSliceConsumerGateEvidenceIdManifest?: string }).reviewSliceConsumerGateEvidenceIdManifest,
    checklist.reviewSliceConsumerGateEvidenceIdManifest
  );
  assert.equal((intake as { reviewSliceSummary?: string }).reviewSliceSummary, checklist.reviewSliceSummary);
  assert.match((intake as { summary?: string }).summary ?? "", /reviewSlices=20@24/);

  assert.equal(attributes["data-viz-manim-v2-completion-evidence-intake-review-slice-count"], "20");
  assert.equal(attributes["data-viz-manim-v2-completion-evidence-intake-review-slice-ids"], reviewSliceIds);
  assert.equal(
    attributes["data-viz-manim-v2-completion-evidence-intake-review-slice-file-manifest"],
    reviewSliceFileManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-completion-evidence-intake-review-slice-consumer-gate-evidence-id-manifest"],
    reviewSliceConsumerGateEvidenceIdManifest
  );
  assert.equal(attributes["data-viz-manim-v2-completion-evidence-intake-review-slices"], reviewSliceSummary);
});
