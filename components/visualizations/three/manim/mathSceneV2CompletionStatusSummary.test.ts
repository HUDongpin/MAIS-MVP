import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  VISUALIZATION_BROWSER_REGRESSION_ROOT_ATTRIBUTE_A11_ACTION
} from "../../visualizationBrowserRegressionEvidence";
import {
  VISUALIZATION_BROWSER_REGRESSION_RUN_FROM_BEAT_CHECKPOINT_INVALIDATION_DATA_ATTRIBUTES
} from "../../visualizationBrowserRegressionPackages";
import {
  VISUALIZATION_RELEASE_READINESS_EVIDENCE_CONTRACT,
  type VisualizationReleaseReadinessEvidence
} from "../../visualizationReleaseReadinessEvidence";
import { buildManimReviewPackageMatrix, classifyManimReviewPackage } from "./mathSceneReviewPackages";
import { buildManimReviewPackageSliceMatrix } from "./mathSceneReviewPackageSlices";
import {
  MATH_SCENE_V2_COMPLETION_ACCEPTANCE_CHECKLIST_SOURCE_CONTRACT,
  type MathSceneV2CompletionAcceptanceAction,
  type MathSceneV2CompletionAcceptanceChecklist
} from "./mathSceneV2CompletionAcceptanceChecklist";
import { buildMathSceneV2CompletionEvidenceIntake } from "./mathSceneV2CompletionEvidenceIntake";
import {
  buildMathSceneV2CompletionStatusSummary,
  mathSceneV2CompletionStatusSummaryDataAttributes,
  MATH_SCENE_V2_COMPLETION_STATUS_SUMMARY_SOURCE_CONTRACT
} from "./mathSceneV2CompletionStatusSummary";
import {
  MATH_SCENE_V2_GOAL_GATE_SOURCE_CONTRACT,
  type MathSceneV2GoalGate,
  type MathSceneV2GoalGateId
} from "./mathSceneV2GoalGate";
import { buildMathSceneV2ReleaseSliceManifest } from "./mathSceneV2ReleaseSliceManifest";

const manimDir = "components/visualizations/three/manim";
const a11RequiredRootDataAttributeCount =
  VISUALIZATION_BROWSER_REGRESSION_RUN_FROM_BEAT_CHECKPOINT_INVALIDATION_DATA_ATTRIBUTES.length;
const a11RunFromBeatCheckpointInvalidationDataAttributeManifest =
  VISUALIZATION_BROWSER_REGRESSION_RUN_FROM_BEAT_CHECKPOINT_INVALIDATION_DATA_ATTRIBUTES.join(",");
const reviewSliceConsumerGateEvidenceIdManifest =
  "manim-review-slice-01=A06-source-review:source-review-note:ready-for-slice-review";
const reviewSliceCount = 20;
const reviewSliceFileManifest = "manim-review-slice-01=mathSceneV2CompletionStatusSummary.ts";
const reviewSliceIds = "manim-review-slice-01";
const reviewSliceSummary = "20@24";

function currentManimFileNames() {
  return fs
    .readdirSync(manimDir)
    .filter((fileName) => [".ts", ".tsx"].includes(path.extname(fileName)))
    .sort();
}

function releaseReadinessFixture(): VisualizationReleaseReadinessEvidence {
  const a11RunFromBeatCheckpointInvalidationDataAttributes = [
    ...VISUALIZATION_BROWSER_REGRESSION_RUN_FROM_BEAT_CHECKPOINT_INVALIDATION_DATA_ATTRIBUTES
  ];

  return {
    a11BroadGateStatus: "red-needs-a11-a22-follow-up",
    a11RequiredRootDataAttributes: [...a11RunFromBeatCheckpointInvalidationDataAttributes].sort(),
    a11RunFromBeatCheckpointInvalidationDataAttributes,
    a11SplitRegressionStatus: "passed",
    a18TeachingGateStatus: "a18-final-signoff-required",
    a22ReleasePreflightStatus: "blocked-disk-space",
    a22PrunedStagingBuildStatus: "passed",
    a22RootDeployStatus: "blocked-dirty-root",
    blockers: [
      "a11-broad-visualization-value-suite-red",
      "a18-final-teaching-signoff-open",
      "a22-release-preflight-disk-blocked",
      "a22-dirty-root-release-blocked"
    ],
    productionDeployAllowed: false,
    releaseGateStatus: "not-release-ready",
    releasePath: "clean-worktree-or-reviewed-pruned-staging-slice",
    requiredFollowUpActions: [
      "adopt-hk-grade-split-packages",
      "update-projection-views-expected-list",
      VISUALIZATION_BROWSER_REGRESSION_ROOT_ATTRIBUTE_A11_ACTION,
      "keep-non-hk-tracks-out-of-hk-demo-sweep",
      "investigate-isolated-next-chunk-serving-after-broad-timeout",
      "release-from-clean-worktree-or-reviewed-pruned-staging-slice",
      "complete-a18-final-scene-signoff",
      "run-a22-generated-artifact-cleanup-after-preserving-evidence"
    ],
    sourceContract: VISUALIZATION_RELEASE_READINESS_EVIDENCE_CONTRACT,
    splitPackageStatusCounts: {
      "not-run": 0,
      passed: 12
    },
    summary:
      "visualizationReleaseReadiness:status=not-release-ready:a11Split=passed:a11Broad=red-needs-a11-a22-follow-up:a18=a18-final-signoff-required:a22Preflight=blocked-disk-space:a22Pruned=passed:a22Root=blocked-dirty-root"
  };
}

function goalGateFixture(fileCount: number): MathSceneV2GoalGate {
  const gates: MathSceneV2GoalGate["gates"] = [
    {
      blockingItems: [],
      evidenceCounts: {
        fileCount,
        reviewPackageCount: 8,
        unclassifiedFileCount: 0
      },
      evidenceSummary: `packages=8;files=${fileCount};unclassified=0`,
      id: "a06-review-package-split",
      ownerAgentIds: ["A06"],
      status: "passed"
    },
    {
      blockingItems: ["a11-broad-visualization-value-suite-red"],
      evidenceCounts: {
        broadGateRed: 1,
        hkGradePackageCount: 12,
        hkGradeSplitPassed: 1,
        missingHkPackageCount: 0
      },
      evidenceSummary: "hkSplit=passed;broad=red-needs-a11-a22-follow-up;missing=0",
      id: "a11-browser-visual-interaction-regression",
      ownerAgentIds: ["A06", "A11"],
      status: "partial-blocked"
    },
    {
      blockingItems: ["a22-release-preflight-disk-blocked", "a22-dirty-root-release-blocked"],
      evidenceCounts: {
        blockerCount: 4,
        prunedStagingPassed: 1,
        productionDeployAllowed: 0
      },
      evidenceSummary:
        "status=not-release-ready;preflight=blocked-disk-space;root=blocked-dirty-root;pruned=passed",
      id: "a22-clean-release-gate",
      ownerAgentIds: ["A22"],
      status: "blocked"
    },
    {
      blockingItems: ["a18-final-teaching-signoff-open"],
      evidenceCounts: {
        pendingA18Count: 12,
        readyProofPointCount: 108,
        sceneCount: 12
      },
      evidenceSummary: "status=a18-final-signoff-required;scenes=12;pendingA18=12;proofPoints=108/108",
      id: "a18-a06-teaching-quality-confirmation",
      ownerAgentIds: ["A06", "A18"],
      status: "pending-final-signoff"
    }
  ];

  return {
    canMarkThreadGoalComplete: false,
    gateCount: gates.length,
    gates,
    goalCompletionStatus: "not-complete",
    reviewSliceConsumerGateEvidenceIdManifest: "scene-slice-01=A06-source-review:scene-slice-01-a06-source-review-note",
    reviewSliceFileManifest: "scene-slice-01=mathSceneRegistry.ts",
    reviewSliceIds: "scene-slice-01",
    reviewSliceSummary: "20@24",
    sourceContract: MATH_SCENE_V2_GOAL_GATE_SOURCE_CONTRACT,
    summary:
      "mathSceneV2GoalGate:status=not-complete:a06-review-package-split=passed;a11-browser-visual-interaction-regression=partial-blocked;a22-clean-release-gate=blocked;a18-a06-teaching-quality-confirmation=pending-final-signoff"
  };
}

function checklistAction({
  action,
  blockingItems = [],
  ownerAgentIds,
  supportingAgentIds,
  verificationEvidenceIds,
  workstreamId
}: {
  action: string;
  blockingItems?: string[];
  ownerAgentIds: readonly string[];
  supportingAgentIds: readonly string[];
  verificationEvidenceIds: string[];
  workstreamId: MathSceneV2GoalGateId;
}): MathSceneV2CompletionAcceptanceAction {
  return {
    acceptanceCriteria: [`${action} owner evidence is required before Manim v2 closure.`],
    action,
    actionId: `${workstreamId}:${action}`,
    blockingItems,
    ownerAgentIds,
    ownerEvidenceStatus: "pending-owner-evidence",
    prerequisiteEvidenceSourceIds: ["mathSceneV2CompletionStatusSummaryFixture"],
    supportingAgentIds,
    verificationEvidenceIds,
    workstreamId
  };
}

function acceptanceChecklistFixture(): MathSceneV2CompletionAcceptanceChecklist {
  const actions = [
    checklistAction({
      action: "adopt-hk-grade-split-packages",
      blockingItems: ["a11-broad-visualization-value-suite-red"],
      ownerAgentIds: ["A11"],
      supportingAgentIds: ["A06", "A22"],
      verificationEvidenceIds: ["visualizationBrowserRegressionEvidence", "a11-hk-grade-split-package-rerun"],
      workstreamId: "a11-browser-visual-interaction-regression"
    }),
    checklistAction({
      action: "update-projection-views-expected-list",
      blockingItems: ["a11-broad-visualization-value-suite-red"],
      ownerAgentIds: ["A11"],
      supportingAgentIds: ["A06", "A22"],
      verificationEvidenceIds: ["a11-projection-views-contract-update", "a11-premium-route-rerun"],
      workstreamId: "a11-browser-visual-interaction-regression"
    }),
    checklistAction({
      action: "keep-non-hk-tracks-out-of-hk-demo-sweep",
      blockingItems: ["a11-broad-visualization-value-suite-red"],
      ownerAgentIds: ["A11"],
      supportingAgentIds: ["A06", "A22"],
      verificationEvidenceIds: ["a11-hk-demo-sweep-scope-evidence", "visualizationBrowserRegressionPackages"],
      workstreamId: "a11-browser-visual-interaction-regression"
    }),
    checklistAction({
      action: "investigate-isolated-next-chunk-serving-after-broad-timeout",
      blockingItems: ["a22-release-preflight-disk-blocked"],
      ownerAgentIds: ["A22"],
      supportingAgentIds: ["A06", "A11"],
      verificationEvidenceIds: ["a22-isolated-next-chunk-serving-report", "a11-broad-suite-rerun-evidence"],
      workstreamId: "a22-clean-release-gate"
    }),
    checklistAction({
      action: "release-from-clean-worktree-or-reviewed-pruned-staging-slice",
      blockingItems: ["a22-dirty-root-release-blocked"],
      ownerAgentIds: ["A22"],
      supportingAgentIds: ["A06", "A11"],
      verificationEvidenceIds: [
        "mathSceneV2ReleaseSliceManifest",
        "a22-clean-worktree-or-pruned-staging-build-report"
      ],
      workstreamId: "a22-clean-release-gate"
    }),
    checklistAction({
      action: "run-a22-generated-artifact-cleanup-after-preserving-evidence",
      blockingItems: ["a22-release-preflight-disk-blocked"],
      ownerAgentIds: ["A22"],
      supportingAgentIds: ["A06", "A11"],
      verificationEvidenceIds: ["a22-generated-artifact-cleanup-report", "a22-release-preflight-rerun"],
      workstreamId: "a22-clean-release-gate"
    }),
    checklistAction({
      action: "open-rendered-review-routes",
      blockingItems: ["a18-final-teaching-signoff-open"],
      ownerAgentIds: ["A18", "A06"],
      supportingAgentIds: ["A06"],
      verificationEvidenceIds: ["mathSceneTeachingRenderedReviewRoutes", "a18-rendered-route-inspection-notes"],
      workstreamId: "a18-a06-teaching-quality-confirmation"
    }),
    checklistAction({
      action: "inspect-rendered-scene-targets",
      blockingItems: ["a18-final-teaching-signoff-open"],
      ownerAgentIds: ["A18", "A06"],
      supportingAgentIds: ["A06"],
      verificationEvidenceIds: ["mathSceneTeachingInspectionTargets", "a18-rendered-scene-target-review"],
      workstreamId: "a18-a06-teaching-quality-confirmation"
    }),
    checklistAction({
      action: "complete-a18-final-criterion-decisions",
      blockingItems: ["a18-final-teaching-signoff-open"],
      ownerAgentIds: ["A18", "A06"],
      supportingAgentIds: ["A06"],
      verificationEvidenceIds: ["mathSceneTeachingFinalDecisionLedger", "a18-final-criterion-decision-record"],
      workstreamId: "a18-a06-teaching-quality-confirmation"
    }),
    checklistAction({
      action: "complete-a18-final-scene-signoff",
      blockingItems: ["a18-final-teaching-signoff-open"],
      ownerAgentIds: ["A18", "A06"],
      supportingAgentIds: ["A06"],
      verificationEvidenceIds: ["mathSceneTeachingSignoffMatrix", "a18-final-scene-signoff-record"],
      workstreamId: "a18-a06-teaching-quality-confirmation"
    }),
    checklistAction({
      action: "record-approve-or-revision-decision",
      blockingItems: ["a18-final-teaching-signoff-open"],
      ownerAgentIds: ["A18", "A06"],
      supportingAgentIds: ["A06"],
      verificationEvidenceIds: ["mathSceneTeachingFinalReviewPacket", "a18-final-approve-or-revision-decisions"],
      workstreamId: "a18-a06-teaching-quality-confirmation"
    })
  ];

  return {
    acceptedOwnerEvidenceCount: 0,
    a11RequiredRootDataAttributeCount,
    a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    actionCount: actions.length,
    actions,
    canMarkThreadGoalComplete: false,
    ownerAcceptanceCriteriaManifest: "fixture-owner-acceptance-criteria",
    ownerActionEvidenceCountManifest: "fixture-owner-action-evidence-counts",
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
    summary:
      "mathSceneV2CompletionAcceptanceChecklist:status=pending-owner-evidence:actions=11:pendingOwnerEvidence=11",
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

function completionSummaryFixture() {
  const reviewPackages = buildManimReviewPackageMatrix(currentManimFileNames());
  const reviewSlices = buildManimReviewPackageSliceMatrix(reviewPackages, { maxFilesPerSlice: 24 });
  const releaseReadiness = releaseReadinessFixture();
  const goalGate = goalGateFixture(reviewSlices.fileCount);
  const releaseSliceManifest = buildMathSceneV2ReleaseSliceManifest({
    releaseReadiness,
    reviewPackages
  });
  const acceptanceChecklist = acceptanceChecklistFixture();
  const evidenceIntake = buildMathSceneV2CompletionEvidenceIntake(acceptanceChecklist, []);

  return buildMathSceneV2CompletionStatusSummary({
    acceptanceChecklist,
    evidenceIntake,
    goalGate,
    releaseSliceManifest,
    reviewPackages,
    reviewSlices
  });
}

test("MAIS Manim v2 completion status summary reports source architecture ready but goal incomplete", () => {
  const summary = completionSummaryFixture();
  const reviewPackages = buildManimReviewPackageMatrix(currentManimFileNames());
  const reviewSlices = buildManimReviewPackageSliceMatrix(reviewPackages, { maxFilesPerSlice: 24 });

  assert.equal(summary.sourceContract, MATH_SCENE_V2_COMPLETION_STATUS_SUMMARY_SOURCE_CONTRACT);
  assert.equal(summary.status, "source-architecture-ready-goal-blocked");
  assert.equal(summary.sourceArchitectureStatus, "ready-for-review");
  assert.equal(summary.goalCompletionStatus, "not-complete");
  assert.equal(summary.fileCount, currentManimFileNames().length);
  assert.equal(summary.sliceCount, reviewSlices.sliceCount);
  assert.equal(summary.largestSliceFileCount, 24);
  assert.equal(summary.unclassifiedFileCount, 0);
  assert.equal(summary.forbiddenReleaseIncludeCount, 0);
  assert.equal(summary.pendingOwnerEvidenceCount, 22);
  assert.equal(summary.acceptedOwnerEvidenceCount, 0);
  assert.equal(summary.missingOwnerEvidenceSummary, "A11=6;A22=6;A18+A06=10");
  assert.equal(summary.readyForGoalGateRerun, false);
  assert.equal(summary.canMarkThreadGoalComplete, false);
  assert.deepEqual(summary.remainingOwnerAgentIds, ["A11", "A18", "A22"]);
});

test("MAIS Manim v2 completion status summary exposes source-architecture blocker reasons", () => {
  const reviewPackages = buildManimReviewPackageMatrix(currentManimFileNames());
  const reviewSlices = buildManimReviewPackageSliceMatrix(reviewPackages, { maxFilesPerSlice: 24 });
  const releaseReadiness = releaseReadinessFixture();
  const goalGate = goalGateFixture(reviewSlices.fileCount);
  const acceptanceChecklist = acceptanceChecklistFixture();
  const evidenceIntake = buildMathSceneV2CompletionEvidenceIntake(acceptanceChecklist, []);
  const summary = buildMathSceneV2CompletionStatusSummary({
    acceptanceChecklist,
    evidenceIntake,
    goalGate,
    releaseSliceManifest: {
      ...buildMathSceneV2ReleaseSliceManifest({
        releaseReadiness,
        reviewPackages
      }),
      forbiddenIncludeCount: 1
    },
    reviewPackages,
    reviewSlices: {
      ...reviewSlices,
      duplicateFileNames: ["mathSceneV2CompletionStatusSummary.ts"],
      largestSliceFileCount: reviewSlices.maxFilesPerSlice + 1,
      missingFileNames: ["mathSceneV2CompletionStatusSummary.test.ts"],
      status: "blocked-pending-slice-fix"
    }
  });
  const attributes = mathSceneV2CompletionStatusSummaryDataAttributes(summary);
  const expectedReasons = [
    "reviewSliceStatus",
    "missingReviewSliceFiles",
    "duplicateReviewSliceFiles",
    "reviewSliceFileCountOverLimit",
    "forbiddenReleaseIncludes"
  ];

  assert.equal(summary.status, "source-architecture-blocked");
  assert.deepEqual(
    (summary as { sourceArchitectureBlockerReasons?: string[] }).sourceArchitectureBlockerReasons,
    expectedReasons
  );
  assert.equal(
    attributes["data-viz-manim-v2-completion-source-architecture-blocker-reasons"],
    expectedReasons.join(",")
  );
  assert.match(
    attributes["data-viz-manim-v2-completion-summary"],
    /sourceBlockers=reviewSliceStatus,missingReviewSliceFiles,duplicateReviewSliceFiles,reviewSliceFileCountOverLimit,forbiddenReleaseIncludes/
  );
});

test("MAIS Manim v2 completion status summary exposes owner gate blocker manifests", () => {
  const summary = completionSummaryFixture();

  assert.equal(
    summary.blockedGateManifest,
    [
      "a11-browser-visual-interaction-regression=status:partial-blocked|owners:A06+A11|blockers:a11-broad-visualization-value-suite-red",
      "a22-clean-release-gate=status:blocked|owners:A22|blockers:a22-release-preflight-disk-blocked+a22-dirty-root-release-blocked",
      "a18-a06-teaching-quality-confirmation=status:pending-final-signoff|owners:A06+A18|blockers:a18-final-teaching-signoff-open"
    ].join(";")
  );
  assert.equal(
    summary.ownerEvidenceStatusManifest,
    [
      "A11=accepted:0|missing:6|pendingActions:3|required:6",
      "A22=accepted:0|missing:6|pendingActions:3|required:6",
      "A18+A06=accepted:0|missing:10|pendingActions:5|required:10"
    ].join(";")
  );
  assert.equal(
    (summary as { ownerAcceptanceCriteriaManifest?: string }).ownerAcceptanceCriteriaManifest,
    "fixture-owner-acceptance-criteria"
  );
  assert.equal(
    (summary as { ownerEvidenceRequirementManifest?: string }).ownerEvidenceRequirementManifest,
    "fixture-owner-evidence-requirements"
  );
});

test("MAIS Manim v2 completion status summary serializes reviewable status attributes", () => {
  const summary = completionSummaryFixture();
  const attributes = mathSceneV2CompletionStatusSummaryDataAttributes(summary);

  assert.equal(classifyManimReviewPackage("mathSceneV2CompletionStatusSummary.ts"), "evidence");
  assert.equal(attributes["data-viz-manim-v2-completion-status-source-contract"], MATH_SCENE_V2_COMPLETION_STATUS_SUMMARY_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-v2-completion-status"], "source-architecture-ready-goal-blocked");
  assert.equal(attributes["data-viz-manim-v2-completion-source-architecture"], "ready-for-review");
  assert.equal(attributes["data-viz-manim-v2-completion-file-count"], String(currentManimFileNames().length));
  assert.equal(attributes["data-viz-manim-v2-completion-slice-count"], String(summary.sliceCount));
  assert.equal(attributes["data-viz-manim-v2-completion-accepted-evidence-count"], "0");
  assert.equal(attributes["data-viz-manim-v2-completion-pending-evidence-count"], "22");
  assert.equal(
    attributes["data-viz-manim-v2-completion-missing-owner-evidence"],
    "A11=6;A22=6;A18+A06=10"
  );
  assert.equal(
    attributes["data-viz-manim-v2-completion-blocked-gates"],
    "a11-browser-visual-interaction-regression,a22-clean-release-gate,a18-a06-teaching-quality-confirmation"
  );
  assert.equal(
    attributes["data-viz-manim-v2-completion-blocked-gate-manifest"],
    summary.blockedGateManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-completion-owner-evidence-status-manifest"],
    summary.ownerEvidenceStatusManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-completion-owner-acceptance-criteria-manifest"],
    "fixture-owner-acceptance-criteria"
  );
  assert.equal(
    attributes["data-viz-manim-v2-completion-owner-evidence-requirement-manifest"],
    "fixture-owner-evidence-requirements"
  );
  assert.equal(attributes["data-viz-manim-v2-completion-ready-for-rerun"], "false");
  assert.equal(attributes["data-viz-manim-v2-completion-can-complete"], "false");
});
