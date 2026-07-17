import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  VISUALIZATION_BROWSER_REGRESSION_EVIDENCE_CONTRACT,
  VISUALIZATION_BROWSER_REGRESSION_ROOT_ATTRIBUTE_A11_ACTION,
  type VisualizationBrowserRegressionEvidenceEntry,
  type VisualizationBrowserRegressionEvidenceMatrix
} from "../../visualizationBrowserRegressionEvidence";
import {
  VISUALIZATION_BROWSER_REGRESSION_RUN_FROM_BEAT_CHECKPOINT_INVALIDATION_DATA_ATTRIBUTES
} from "../../visualizationBrowserRegressionPackages";
import {
  VISUALIZATION_RELEASE_READINESS_EVIDENCE_CONTRACT,
  type VisualizationReleaseReadinessEvidence
} from "../../visualizationReleaseReadinessEvidence";
import { buildManimReviewPackageHandoffMatrix } from "./mathSceneReviewPackageHandoff";
import { buildManimReviewPackageMatrix, classifyManimReviewPackage } from "./mathSceneReviewPackages";
import {
  buildManimReviewPackageSliceMatrix,
  manimReviewPackageSliceDataAttributes
} from "./mathSceneReviewPackageSlices";
import { buildMathSceneV2ReleaseSliceManifest } from "./mathSceneV2ReleaseSliceManifest";
import {
  MATH_SCENE_TEACHING_FINAL_DECISION_LEDGER_SOURCE_CONTRACT,
  type MathSceneTeachingFinalDecisionLedger
} from "./mathSceneTeachingFinalDecisionLedger";
import {
  MATH_SCENE_TEACHING_RENDERED_REVIEW_ROUTE_SOURCE_CONTRACT,
  type MathSceneTeachingRenderedReviewRoutePacket
} from "./mathSceneTeachingRenderedReviewRoutes";
import {
  MATH_SCENE_TEACHING_REVIEW_DOSSIER_SOURCE_CONTRACT,
  type MathSceneTeachingReviewDossier
} from "./mathSceneTeachingReviewDossier";
import { buildMathSceneV2GoalGate } from "./mathSceneV2GoalGate";
import {
  buildMathSceneV2SourceArchitectureHandoff,
  MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT
} from "./mathSceneV2SourceArchitectureHandoff";
import {
  buildMathSceneV2CrossAgentHandoff,
  mathSceneV2CrossAgentHandoffDataAttributes,
  MATH_SCENE_V2_CROSS_AGENT_HANDOFF_SOURCE_CONTRACT
} from "./mathSceneV2CrossAgentHandoff";

const manimDir = "components/visualizations/three/manim";

function currentManimFileNames() {
  return fs
    .readdirSync(manimDir)
    .filter((fileName) => [".ts", ".tsx"].includes(path.extname(fileName)))
    .sort();
}

function reviewPackageFixture() {
  return buildManimReviewPackageMatrix(currentManimFileNames());
}

function reviewSliceFixture() {
  return buildManimReviewPackageSliceMatrix(reviewPackageFixture(), { maxFilesPerSlice: 24 });
}

function hkGradePackageEvidenceFixture(): VisualizationBrowserRegressionEvidenceEntry[] {
  return ["P1", "P2", "P3", "P4", "P5", "P6", "S1", "S2", "S3", "S4", "S5", "S6"].map((grade, index) => ({
    command: `VISUALIZATION_SWEEP_GRADES=${grade} VISUALIZATION_SWEEP_LABS=manim-${grade.toLowerCase()} npx playwright test tests/e2e/visualization-values.spec.ts`,
    commandEnv: {
      VISUALIZATION_SWEEP_GRADES: grade,
      VISUALIZATION_SWEEP_LABS: `manim-${grade.toLowerCase()}`,
      VISUALIZATION_SWEEP_TRACKS: "HK"
    },
    duration: `${index + 1}.0m`,
    grade,
    labIds: [`manim-${grade.toLowerCase()}`],
    packageId: `hk-demo-${grade}-part-1`,
    port: 3170 + index,
    runId: `manim-v2-a11-fixture-${grade.toLowerCase()}`,
    status: "passed"
  }));
}

function browserEvidenceFixture(): VisualizationBrowserRegressionEvidenceMatrix {
  const requiredRunFromBeatCheckpointInvalidationDataAttributes = [
    ...VISUALIZATION_BROWSER_REGRESSION_RUN_FROM_BEAT_CHECKPOINT_INVALIDATION_DATA_ATTRIBUTES
  ];

  return {
    a11HandoffSummary: "P1-S6 HK demo-safe catalog packages pass when split by grade and explicit VISUALIZATION_SWEEP_LABS.",
    broadGateStatus: "red-needs-a11-a22-follow-up",
    hkGradePackageEvidence: hkGradePackageEvidenceFixture(),
    hkGradeSplitStatus: "passed",
    missingHkPackageIds: [],
    remainingA11Actions: [
      "adopt-hk-grade-split-packages",
      "update-projection-views-expected-list",
      VISUALIZATION_BROWSER_REGRESSION_ROOT_ATTRIBUTE_A11_ACTION,
      "keep-non-hk-tracks-out-of-hk-demo-sweep"
    ],
    remainingA22Actions: [
      "investigate-isolated-next-chunk-serving-after-broad-timeout",
      "release-from-clean-worktree-or-reviewed-pruned-staging-slice"
    ],
    requiredRootDataAttributes: [...requiredRunFromBeatCheckpointInvalidationDataAttributes].sort(),
    requiredRunFromBeatCheckpointInvalidationDataAttributes,
    sourceContract: VISUALIZATION_BROWSER_REGRESSION_EVIDENCE_CONTRACT
  };
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
    a22PrunedStagingBuildStatus: "passed",
    a22ReleasePreflightStatus: "blocked-disk-space",
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
    summary: "visualizationReleaseReadiness:status=not-release-ready:a11Split=passed:a11Broad=red-needs-a11-a22-follow-up:a18=a18-final-signoff-required:a22Preflight=blocked-disk-space:a22Pruned=passed:a22Root=blocked-dirty-root"
  };
}

function teachingDossierFixture(): MathSceneTeachingReviewDossier {
  return {
    caseCount: 12,
    caseIds: Array.from({ length: 12 }, (_, index) => `manim-review-case-${index + 1}`),
    pendingA18Count: 12,
    proofPointCount: 108,
    readyProofPointCount: 108,
    readySceneCount: 12,
    rows: [],
    sceneCount: 12,
    sourceContract: MATH_SCENE_TEACHING_REVIEW_DOSSIER_SOURCE_CONTRACT,
    status: "a18-final-review-dossier-ready",
    summary: "a18TeachingReviewDossier:cases=12:readyScenes=12:pending=12:proofPoints=108/108"
  } as MathSceneTeachingReviewDossier;
}

function teachingRenderedRoutesFixture(): MathSceneTeachingRenderedReviewRoutePacket {
  return {
    missingCaseIds: [],
    missingRouteCount: 0,
    pendingA18Count: 12,
    routableTargetCount: 12,
    rows: [],
    sourceContract: MATH_SCENE_TEACHING_RENDERED_REVIEW_ROUTE_SOURCE_CONTRACT,
    status: "ready-for-a18-browser-review",
    summary: "a18RenderedReviewRoutes:status=ready-for-a18-browser-review:routable=12/12",
    targetCount: 12
  };
}

function teachingFinalDecisionLedgerFixture(): MathSceneTeachingFinalDecisionLedger {
  return {
    approvedDecisionCount: 0,
    blockedCaseCount: 0,
    blockedDecisionCount: 0,
    canMarkA18GateComplete: false,
    caseCount: 12,
    criterionCount: 5,
    decisionCount: 60,
    pendingDecisionCount: 60,
    readyCaseCount: 12,
    requiredCriteria: [
      "curriculum-fit",
      "mathematical-accuracy",
      "cognitive-load",
      "language-and-labels",
      "interaction-timing"
    ],
    revisionDecisionCount: 0,
    rows: [],
    sourceContract: MATH_SCENE_TEACHING_FINAL_DECISION_LEDGER_SOURCE_CONTRACT,
    status: "pending-a18-final-decisions",
    summary: "a18TeachingFinalDecisionLedger:status=pending-a18-final-decisions:decisions=60/60-pending"
  };
}

function handoffFixture() {
  const browserEvidence = browserEvidenceFixture();
  const releaseReadiness = releaseReadinessFixture();
  const reviewPackages = reviewPackageFixture();
  const reviewSlices = buildManimReviewPackageSliceMatrix(reviewPackages, { maxFilesPerSlice: 24 });
  const teachingDossier = teachingDossierFixture();
  const reviewHandoff = buildManimReviewPackageHandoffMatrix(reviewPackages);
  const goalGate = buildMathSceneV2GoalGate({
    browserEvidence,
    releaseReadiness,
    reviewPackages,
    reviewSlices,
    teachingDossier
  });
  const sourceArchitectureHandoff = buildMathSceneV2SourceArchitectureHandoff({
    goalGate,
    reviewHandoff,
    reviewSlices
  });

  return buildMathSceneV2CrossAgentHandoff({
    browserEvidence,
    goalGate,
    releaseReadiness,
    releaseSliceManifest: buildMathSceneV2ReleaseSliceManifest({
      releaseReadiness,
      reviewPackages,
      reviewSlices,
      sourceArchitectureHandoff
    }),
    reviewHandoff,
    reviewSlices,
    teachingDossier,
    teachingFinalDecisionLedger: teachingFinalDecisionLedgerFixture(),
    teachingRenderedRoutes: teachingRenderedRoutesFixture()
  });
}

function blockedSourceArchitectureHandoffFixture() {
  const browserEvidence = browserEvidenceFixture();
  const releaseReadiness = releaseReadinessFixture();
  const reviewPackages = reviewPackageFixture();
  const reviewSlices = reviewSliceFixture();
  const blockedReviewSlices = {
    ...reviewSlices,
    duplicateFileNames: ["mathSceneV2CrossAgentHandoff.ts"],
    largestSliceFileCount: reviewSlices.maxFilesPerSlice + 1,
    missingFileNames: ["mathSceneV2CrossAgentHandoff.missing.ts"],
    status: "blocked-pending-slice-fix" as const
  };
  const releaseSliceManifest = buildMathSceneV2ReleaseSliceManifest({
    releaseReadiness,
    reviewPackages
  });
  const teachingDossier = teachingDossierFixture();

  return buildMathSceneV2CrossAgentHandoff({
    browserEvidence,
    goalGate: buildMathSceneV2GoalGate({
      browserEvidence,
      releaseReadiness,
      reviewPackages,
      reviewSlices: blockedReviewSlices,
      teachingDossier
    }),
    releaseReadiness,
    releaseSliceManifest: {
      ...releaseSliceManifest,
      forbiddenIncludeCount: 1,
      forbiddenIncludePaths: ["tests/e2e/visualization-values.spec.ts"]
    },
    reviewHandoff: buildManimReviewPackageHandoffMatrix(reviewPackages),
    reviewSlices: blockedReviewSlices,
    teachingDossier,
    teachingFinalDecisionLedger: teachingFinalDecisionLedgerFixture(),
    teachingRenderedRoutes: teachingRenderedRoutesFixture()
  });
}

test("MAIS Manim v2 cross-agent handoff maps every objective workstream without closing the goal", () => {
  const handoff = handoffFixture();

  assert.equal(handoff.sourceContract, MATH_SCENE_V2_CROSS_AGENT_HANDOFF_SOURCE_CONTRACT);
  assert.equal(handoff.status, "needs-owner-action");
  assert.equal(handoff.goalCompletionStatus, "not-complete");
  assert.equal(handoff.canMarkThreadGoalComplete, false);
  assert.equal(handoff.workstreamCount, 4);
  assert.equal(handoff.readyWorkstreamCount, 1);
  assert.equal(handoff.openWorkstreamCount, 3);
  assert.deepEqual(handoff.rows.map((row) => row.id), [
    "a06-review-package-split",
    "a11-browser-visual-interaction-regression",
    "a22-clean-release-gate",
    "a18-a06-teaching-quality-confirmation"
  ]);
  assert.deepEqual(handoff.rows.map((row) => row.status), [
    "ready-for-downstream-review",
    "owner-action-required",
    "release-blocked",
    "final-signoff-required"
  ]);
});

test("MAIS Manim v2 cross-agent handoff carries concrete evidence counts and next actions", () => {
  const handoff = handoffFixture();
  const reviewSlices = reviewSliceFixture();
  const rowsById = Object.fromEntries(handoff.rows.map((row) => [row.id, row]));

  assert.equal(rowsById["a06-review-package-split"].evidenceCounts.fileCount, currentManimFileNames().length);
  assert.equal(rowsById["a06-review-package-split"].evidenceCounts.reviewPackageCount, 8);
  assert.equal(rowsById["a06-review-package-split"].evidenceCounts.reviewSliceCount, reviewSlices.sliceCount);
  assert.equal(rowsById["a06-review-package-split"].evidenceCounts.largestReviewSliceFileCount, 24);
  assert.equal(rowsById["a06-review-package-split"].evidenceCounts.missingReviewSliceFileCount, 0);
  assert.equal(rowsById["a06-review-package-split"].evidenceCounts.duplicateReviewSliceFileCount, 0);
  assert.equal(rowsById["a06-review-package-split"].evidenceCounts.readyPackageCount, 8);
  assert.deepEqual(rowsById["a06-review-package-split"].requiredActions, []);

  assert.equal(rowsById["a11-browser-visual-interaction-regression"].ownerAgentIds.join("+"), "A11");
  assert.equal(rowsById["a11-browser-visual-interaction-regression"].evidenceCounts.hkGradePackageCount, 12);
  assert.equal(rowsById["a11-browser-visual-interaction-regression"].evidenceCounts.hkGradePassedCount, 12);
  assert.equal(
    rowsById["a11-browser-visual-interaction-regression"].evidenceCounts.requiredRootDataAttributeCount,
    VISUALIZATION_BROWSER_REGRESSION_RUN_FROM_BEAT_CHECKPOINT_INVALIDATION_DATA_ATTRIBUTES.length
  );
  assert.equal(
    rowsById["a11-browser-visual-interaction-regression"].evidenceCounts.runFromBeatCheckpointInvalidationDataAttributeCount,
    VISUALIZATION_BROWSER_REGRESSION_RUN_FROM_BEAT_CHECKPOINT_INVALIDATION_DATA_ATTRIBUTES.length
  );
  assert.ok(rowsById["a11-browser-visual-interaction-regression"].requiredActions.includes("adopt-hk-grade-split-packages"));
  assert.ok(rowsById["a11-browser-visual-interaction-regression"].requiredActions.includes("update-projection-views-expected-list"));

  assert.equal(rowsById["a22-clean-release-gate"].ownerAgentIds.join("+"), "A22");
  assert.ok(rowsById["a22-clean-release-gate"].blockingItems.includes("a22-release-preflight-disk-blocked"));
  assert.ok(rowsById["a22-clean-release-gate"].blockingItems.includes("a22-dirty-root-release-blocked"));
  assert.equal(rowsById["a22-clean-release-gate"].evidenceCounts.releaseSliceFileCount, currentManimFileNames().length);
  assert.equal(rowsById["a22-clean-release-gate"].evidenceCounts.forbiddenReleaseSliceFileCount, 0);
  assert.equal(
    rowsById["a22-clean-release-gate"].evidenceCounts.a11ReleaseSliceRequiredRootDataAttributeCount,
    VISUALIZATION_BROWSER_REGRESSION_RUN_FROM_BEAT_CHECKPOINT_INVALIDATION_DATA_ATTRIBUTES.length
  );
  assert.ok(rowsById["a22-clean-release-gate"].requiredActions.includes("release-from-clean-worktree-or-reviewed-pruned-staging-slice"));

  assert.equal(rowsById["a18-a06-teaching-quality-confirmation"].ownerAgentIds.join("+"), "A18+A06");
  assert.equal(rowsById["a18-a06-teaching-quality-confirmation"].evidenceCounts.sceneCount, 12);
  assert.equal(rowsById["a18-a06-teaching-quality-confirmation"].evidenceCounts.renderedRouteCount, 12);
  assert.equal(rowsById["a18-a06-teaching-quality-confirmation"].evidenceCounts.missingRenderedRouteCount, 0);
  assert.equal(rowsById["a18-a06-teaching-quality-confirmation"].evidenceCounts.pendingA18Count, 12);
  assert.equal(rowsById["a18-a06-teaching-quality-confirmation"].evidenceCounts.finalDecisionCount, 60);
  assert.equal(rowsById["a18-a06-teaching-quality-confirmation"].evidenceCounts.pendingFinalDecisionCount, 60);
  assert.equal(rowsById["a18-a06-teaching-quality-confirmation"].evidenceCounts.canCompleteA18DecisionLedger, 0);
  assert.equal(rowsById["a18-a06-teaching-quality-confirmation"].evidenceCounts.readyProofPointCount, 108);
  assert.ok(rowsById["a18-a06-teaching-quality-confirmation"].requiredActions.includes("open-rendered-review-routes"));
  assert.ok(rowsById["a18-a06-teaching-quality-confirmation"].requiredActions.includes("inspect-rendered-scene-targets"));
  assert.ok(rowsById["a18-a06-teaching-quality-confirmation"].requiredActions.includes("complete-a18-final-criterion-decisions"));
});

test("MAIS Manim v2 cross-agent handoff serializes stable data attributes", () => {
  const reviewSlices = reviewSliceFixture();
  const reviewSliceAttributes = manimReviewPackageSliceDataAttributes(reviewSlices);
  const handoff = handoffFixture();
  const attributes = mathSceneV2CrossAgentHandoffDataAttributes(handoff);

  assert.equal(classifyManimReviewPackage("mathSceneV2CrossAgentHandoff.ts"), "evidence");
  assert.equal(
    handoff.a11RequiredRootDataAttributeCount,
    VISUALIZATION_BROWSER_REGRESSION_RUN_FROM_BEAT_CHECKPOINT_INVALIDATION_DATA_ATTRIBUTES.length
  );
  assert.equal(
    handoff.a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    VISUALIZATION_BROWSER_REGRESSION_RUN_FROM_BEAT_CHECKPOINT_INVALIDATION_DATA_ATTRIBUTES.join(",")
  );
  assert.equal(
    attributes["data-viz-manim-v2-cross-agent-handoff-source-contract"],
    MATH_SCENE_V2_CROSS_AGENT_HANDOFF_SOURCE_CONTRACT
  );
  assert.equal(
    attributes["data-viz-manim-v2-cross-agent-handoff-a11-required-root-attribute-count"],
    String(VISUALIZATION_BROWSER_REGRESSION_RUN_FROM_BEAT_CHECKPOINT_INVALIDATION_DATA_ATTRIBUTES.length)
  );
  assert.equal(
    attributes["data-viz-manim-v2-cross-agent-handoff-a11-run-from-beat-checkpoint-invalidation-attributes"],
    VISUALIZATION_BROWSER_REGRESSION_RUN_FROM_BEAT_CHECKPOINT_INVALIDATION_DATA_ATTRIBUTES.join(",")
  );
  assert.equal(attributes["data-viz-manim-v2-cross-agent-handoff-status"], "needs-owner-action");
  assert.equal(attributes["data-viz-manim-v2-cross-agent-handoff-can-complete"], "false");
  assert.equal(attributes["data-viz-manim-v2-cross-agent-handoff-workstream-count"], "4");
  assert.equal(attributes["data-viz-manim-v2-cross-agent-handoff-open-count"], "3");
  assert.equal(
    attributes["data-viz-manim-v2-cross-agent-handoff-review-slices"],
    `${reviewSlices.sliceCount}@${reviewSlices.maxFilesPerSlice}`
  );
  assert.equal(
    attributes["data-viz-manim-v2-cross-agent-handoff-review-slice-ids"],
    reviewSlices.rows.map((slice) => slice.sliceId).join(",")
  );
  assert.equal(
    attributes["data-viz-manim-v2-cross-agent-handoff-review-slice-file-manifest"],
    reviewSlices.rows.map((slice) => `${slice.sliceId}=${slice.fileNames.join("|")}`).join(";")
  );
  assert.equal(
    attributes["data-viz-manim-v2-cross-agent-handoff-review-slice-consumer-gate-evidence-id-manifest"],
    reviewSliceAttributes["data-viz-manim-review-slice-consumer-gate-evidence-id-manifest"]
  );
  assert.equal(attributes["data-viz-manim-v2-cross-agent-handoff-release-slice"], `${currentManimFileNames().length}/0-forbidden`);
  assert.equal(attributes["data-viz-manim-v2-cross-agent-handoff-a18-routes"], "12/12");
  assert.equal(attributes["data-viz-manim-v2-cross-agent-handoff-a18-decisions"], "60/60-pending");
  assert.match(attributes["data-viz-manim-v2-cross-agent-handoff-summary"], /a06-review-package-split=ready-for-downstream-review/);
  assert.match(attributes["data-viz-manim-v2-cross-agent-handoff-blockers"], /a18-final-teaching-signoff-open/);
});

test("MAIS Manim v2 cross-agent handoff carries source-architecture blocker reasons", () => {
  const handoff = blockedSourceArchitectureHandoffFixture();
  const attributes = mathSceneV2CrossAgentHandoffDataAttributes(handoff);
  const blockerReasons = [
    "reviewSliceStatus",
    "missingReviewSliceFiles",
    "duplicateReviewSliceFiles",
    "reviewSliceFileCountOverLimit",
    "forbiddenReleaseIncludes"
  ];

  assert.deepEqual(
    (handoff as { sourceArchitectureBlockerReasons?: unknown }).sourceArchitectureBlockerReasons,
    blockerReasons
  );
  assert.equal(
    (handoff as { sourceArchitectureBlockerReasonManifest?: string }).sourceArchitectureBlockerReasonManifest,
    blockerReasons.join(",")
  );
  assert.match(
    handoff.summary,
    /sourceBlockers=reviewSliceStatus,missingReviewSliceFiles,duplicateReviewSliceFiles,reviewSliceFileCountOverLimit,forbiddenReleaseIncludes/
  );
  assert.equal(
    attributes["data-viz-manim-v2-cross-agent-handoff-source-architecture-blocker-reasons"],
    blockerReasons.join(",")
  );
});

test("MAIS Manim v2 cross-agent handoff carries source-architecture boundary from release slice", () => {
  const handoff = handoffFixture();
  const attributes = mathSceneV2CrossAgentHandoffDataAttributes(handoff);

  assert.equal(handoff.sourceArchitectureHandoffStatus, "source-architecture-ready-owner-gates-open");
  assert.equal(handoff.sourceArchitectureBulkCourseGenerationAllowed, false);
  assert.equal(
    handoff.sourceArchitectureFutureInvocationScope,
    "one-topic-one-concept-cluster-or-one-review-slice"
  );
  assert.equal(
    handoff.sourceArchitectureSourceContract,
    MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT
  );
  assert.deepEqual(handoff.sourceArchitectureOpenOwnerGateIds, [
    "a11-browser-visual-interaction-regression",
    "a18-a06-teaching-quality-confirmation",
    "a22-clean-release-gate"
  ]);
  assert.ok(handoff.sourceArchitectureAcceptanceCriteria.includes("no-bulk-course-generation"));
  assert.match(handoff.summary, /sourceArchitecture=source-architecture-ready-owner-gates-open/);
  assert.match(handoff.summary, /sourceArchitectureScope=one-topic-one-concept-cluster-or-one-review-slice/);
  assert.match(handoff.summary, /sourceArchitectureBulkCourseGeneration=false/);
  assert.equal(
    attributes["data-viz-manim-v2-cross-agent-handoff-source-architecture-status"],
    "source-architecture-ready-owner-gates-open"
  );
  assert.equal(
    attributes["data-viz-manim-v2-cross-agent-handoff-source-architecture-bulk-course-generation"],
    "false"
  );
  assert.equal(
    attributes["data-viz-manim-v2-cross-agent-handoff-source-architecture-future-invocation-scope"],
    "one-topic-one-concept-cluster-or-one-review-slice"
  );
  assert.equal(
    attributes["data-viz-manim-v2-cross-agent-handoff-source-architecture-open-owner-gates"],
    "a11-browser-visual-interaction-regression,a18-a06-teaching-quality-confirmation,a22-clean-release-gate"
  );
  assert.match(
    attributes["data-viz-manim-v2-cross-agent-handoff-source-architecture-acceptance-criteria"],
    /future-invocations-require-fresh-a18-a11-a22-gates/
  );
});
