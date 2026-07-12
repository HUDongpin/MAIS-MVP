import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  VISUALIZATION_BROWSER_REGRESSION_EVIDENCE_CONTRACT,
  VISUALIZATION_BROWSER_REGRESSION_ROOT_ATTRIBUTE_A11_ACTION,
  type VisualizationBrowserRegressionEvidenceMatrix
} from "../../visualizationBrowserRegressionEvidence";
import {
  VISUALIZATION_BROWSER_REGRESSION_RUN_FROM_BEAT_CHECKPOINT_INVALIDATION_DATA_ATTRIBUTES
} from "../../visualizationBrowserRegressionPackages";
import { buildVisualizationReleaseReadinessEvidence } from "../../visualizationReleaseReadinessEvidence";
import { buildManimReviewPackageMatrix, classifyManimReviewPackage } from "./mathSceneReviewPackages";
import {
  buildManimReviewPackageSliceMatrix,
  manimReviewPackageSliceDataAttributes,
  type ManimReviewPackageSliceMatrix
} from "./mathSceneReviewPackageSlices";
import { buildMathSceneTeachingReviewDossier } from "./mathSceneTeachingReviewDossier";
import { buildMathSceneTeachingSignoffMatrix } from "./mathSceneTeachingSignoffMatrix";
import {
  buildMathSceneV2GoalGate,
  mathSceneV2GoalGateDataAttributes,
  MATH_SCENE_V2_GOAL_GATE_SOURCE_CONTRACT
} from "./mathSceneV2GoalGate";

const manimDir = "components/visualizations/three/manim";

function currentManimFileNames() {
  return fs
    .readdirSync(manimDir)
    .filter((fileName) => [".ts", ".tsx"].includes(path.extname(fileName)))
    .sort();
}

function browserEvidenceFixture(): VisualizationBrowserRegressionEvidenceMatrix {
  const requiredRunFromBeatCheckpointInvalidationDataAttributes = [
    ...VISUALIZATION_BROWSER_REGRESSION_RUN_FROM_BEAT_CHECKPOINT_INVALIDATION_DATA_ATTRIBUTES
  ];

  return {
    a11HandoffSummary: "P1-S6 HK demo-safe catalog packages pass when split by grade and explicit VISUALIZATION_SWEEP_LABS.",
    broadGateStatus: "red-needs-a11-a22-follow-up",
    hkGradePackageEvidence: [],
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

function goalGateFixture() {
  const browserEvidence = browserEvidenceFixture();
  const reviewPackages = buildManimReviewPackageMatrix(currentManimFileNames());
  const teachingSignoff = buildMathSceneTeachingSignoffMatrix();

  return buildMathSceneV2GoalGate({
    browserEvidence,
    releaseReadiness: buildVisualizationReleaseReadinessEvidence({
      browserEvidence,
      teachingSignoff
    }),
    reviewPackages,
    reviewSlices: buildManimReviewPackageSliceMatrix(reviewPackages, { maxFilesPerSlice: 24 }),
    teachingDossier: buildMathSceneTeachingReviewDossier()
  });
}

function staleReviewSlicesFixture(reviewSlices: ManimReviewPackageSliceMatrix): ManimReviewPackageSliceMatrix {
  return {
    ...reviewSlices,
    duplicateFileNames: ["mathSceneV2GoalGate.ts"],
    missingFileNames: ["mathSceneV2GoalGate.test.ts"],
    status: "blocked-pending-slice-fix"
  };
}

test("MAIS Manim v2 goal gate maps the four requested workstreams without marking the goal complete", () => {
  const gate = goalGateFixture();

  assert.equal(gate.sourceContract, MATH_SCENE_V2_GOAL_GATE_SOURCE_CONTRACT);
  assert.equal(gate.goalCompletionStatus, "not-complete");
  assert.equal(gate.canMarkThreadGoalComplete, false);
  assert.equal(gate.gateCount, 4);
  assert.deepEqual(gate.gates.map((row) => row.id), [
    "a06-review-package-split",
    "a11-browser-visual-interaction-regression",
    "a22-clean-release-gate",
    "a18-a06-teaching-quality-confirmation"
  ]);
  assert.deepEqual(gate.gates.map((row) => row.ownerAgentIds.join("+")), ["A06", "A06+A11", "A22", "A06+A18"]);
  assert.deepEqual(gate.gates.map((row) => row.status), [
    "passed",
    "partial-blocked",
    "blocked",
    "pending-final-signoff"
  ]);
});

test("MAIS Manim v2 goal gate preserves concrete evidence counts and blockers", () => {
  const fileNames = currentManimFileNames();
  const gate = goalGateFixture();
  const expectedReviewSliceCount = Number(gate.reviewSliceSummary.split("@")[0]);
  const reviewGate = gate.gates.find((row) => row.id === "a06-review-package-split");
  const browserGate = gate.gates.find((row) => row.id === "a11-browser-visual-interaction-regression");
  const releaseGate = gate.gates.find((row) => row.id === "a22-clean-release-gate");
  const teachingGate = gate.gates.find((row) => row.id === "a18-a06-teaching-quality-confirmation");

  assert.ok(reviewGate);
  assert.ok(browserGate);
  assert.ok(releaseGate);
  assert.ok(teachingGate);
  assert.equal(reviewGate.evidenceCounts.fileCount, fileNames.length);
  assert.equal(reviewGate.evidenceCounts.reviewPackageCount, 8);
  assert.equal(reviewGate.evidenceCounts.reviewSliceCount, expectedReviewSliceCount);
  assert.equal(reviewGate.evidenceCounts.maxFilesPerReviewSlice, 24);
  assert.equal(reviewGate.evidenceCounts.missingReviewSliceFileCount, 0);
  assert.equal(reviewGate.evidenceCounts.duplicateReviewSliceFileCount, 0);
  assert.equal(reviewGate.evidenceCounts.unclassifiedFileCount, 0);
  assert.equal(browserGate.evidenceCounts.hkGradeSplitPassed, 1);
  assert.equal(browserGate.evidenceCounts.broadGateRed, 1);
  assert.ok(browserGate.blockingItems.includes("a11-broad-visualization-value-suite-red"));
  assert.ok(releaseGate.blockingItems.includes("a22-release-preflight-disk-blocked"));
  assert.ok(releaseGate.blockingItems.includes("a22-dirty-root-release-blocked"));
  assert.equal(teachingGate.evidenceCounts.sceneCount, 12);
  assert.equal(teachingGate.evidenceCounts.pendingA18Count, 12);
  assert.equal(teachingGate.evidenceCounts.readyProofPointCount, 108);
  assert.ok(teachingGate.blockingItems.includes("a18-final-teaching-signoff-open"));
});

test("MAIS Manim v2 goal gate serializes stable data attributes for handoff", () => {
  const gate = goalGateFixture();
  const attributes = mathSceneV2GoalGateDataAttributes(gate);

  assert.equal(classifyManimReviewPackage("mathSceneV2GoalGate.ts"), "evidence");
  assert.equal(attributes["data-viz-manim-v2-goal-source-contract"], MATH_SCENE_V2_GOAL_GATE_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-v2-goal-status"], "not-complete");
  assert.equal(attributes["data-viz-manim-v2-goal-can-complete"], "false");
  assert.equal(attributes["data-viz-manim-v2-goal-gate-count"], "4");
  assert.match(attributes["data-viz-manim-v2-goal-summary"], /a06-review-package-split=passed/);
  assert.match(attributes["data-viz-manim-v2-goal-summary"], /a22-clean-release-gate=blocked/);
  assert.match(attributes["data-viz-manim-v2-goal-blockers"], /a18-final-teaching-signoff-open/);
  assert.match(
    attributes["data-viz-manim-v2-goal-owner-status-manifest"],
    /A11=a11-browser-visual-interaction-regression:partial-blocked/
  );
  assert.match(
    attributes["data-viz-manim-v2-goal-owner-status-manifest"],
    /A22=a22-clean-release-gate:blocked/
  );
  assert.match(
    attributes["data-viz-manim-v2-goal-owner-blocker-manifest"],
    /A11=a11-browser-visual-interaction-regression:a11-broad-visualization-value-suite-red/
  );
  assert.match(
    attributes["data-viz-manim-v2-goal-owner-blocker-manifest"],
    /A18=a18-a06-teaching-quality-confirmation:a18-final-teaching-signoff-open/
  );
});

test("MAIS Manim v2 goal gate exposes review-slice manifests for source-architecture review", () => {
  const reviewPackages = buildManimReviewPackageMatrix(currentManimFileNames());
  const reviewSlices = buildManimReviewPackageSliceMatrix(reviewPackages, { maxFilesPerSlice: 24 });
  const reviewSliceAttributes = manimReviewPackageSliceDataAttributes(reviewSlices);
  const browserEvidence = browserEvidenceFixture();
  const teachingSignoff = buildMathSceneTeachingSignoffMatrix();
  const gate = buildMathSceneV2GoalGate({
    browserEvidence,
    releaseReadiness: buildVisualizationReleaseReadinessEvidence({
      browserEvidence,
      teachingSignoff
    }),
    reviewPackages,
    reviewSlices,
    teachingDossier: buildMathSceneTeachingReviewDossier()
  });
  const attributes = mathSceneV2GoalGateDataAttributes(gate);

  assert.equal(gate.reviewSliceSummary, `${reviewSlices.sliceCount}@${reviewSlices.maxFilesPerSlice}`);
  assert.equal(
    gate.reviewSliceIds,
    reviewSliceAttributes["data-viz-manim-review-slice-ids"]
  );
  assert.equal(
    gate.reviewSliceFileManifest,
    reviewSliceAttributes["data-viz-manim-review-slice-file-manifest"]
  );
  assert.equal(
    gate.reviewSliceConsumerGateEvidenceIdManifest,
    reviewSliceAttributes["data-viz-manim-review-slice-consumer-gate-evidence-id-manifest"]
  );
  assert.equal(
    attributes["data-viz-manim-v2-goal-review-slices"],
    `${reviewSlices.sliceCount}@${reviewSlices.maxFilesPerSlice}`
  );
  assert.equal(
    attributes["data-viz-manim-v2-goal-review-slice-ids"],
    reviewSliceAttributes["data-viz-manim-review-slice-ids"]
  );
  assert.equal(
    attributes["data-viz-manim-v2-goal-review-slice-file-manifest"],
    reviewSliceAttributes["data-viz-manim-review-slice-file-manifest"]
  );
  assert.equal(
    attributes["data-viz-manim-v2-goal-review-slice-consumer-gate-evidence-id-manifest"],
    reviewSliceAttributes["data-viz-manim-review-slice-consumer-gate-evidence-id-manifest"]
  );
});

test("MAIS Manim v2 goal gate blocks source completion when review-slice provenance is stale", () => {
  const reviewPackages = buildManimReviewPackageMatrix(currentManimFileNames());
  const reviewSlices = buildManimReviewPackageSliceMatrix(reviewPackages, { maxFilesPerSlice: 24 });
  const browserEvidence = browserEvidenceFixture();
  const teachingSignoff = buildMathSceneTeachingSignoffMatrix();
  const gate = buildMathSceneV2GoalGate({
    browserEvidence,
    releaseReadiness: buildVisualizationReleaseReadinessEvidence({
      browserEvidence,
      teachingSignoff
    }),
    reviewPackages,
    reviewSlices: staleReviewSlicesFixture(reviewSlices),
    teachingDossier: buildMathSceneTeachingReviewDossier()
  });
  const reviewGate = gate.gates.find((row) => row.id === "a06-review-package-split");
  const attributes = mathSceneV2GoalGateDataAttributes(gate);

  assert.ok(reviewGate);
  assert.equal(reviewGate.status, "partial-blocked");
  assert.ok(reviewGate.blockingItems.includes("a06-review-slice-plan-not-ready"));
  assert.ok(reviewGate.blockingItems.includes("a06-review-slice-files-missing"));
  assert.ok(reviewGate.blockingItems.includes("a06-review-slice-files-duplicated"));
  assert.equal(reviewGate.evidenceCounts.missingReviewSliceFileCount, 1);
  assert.equal(reviewGate.evidenceCounts.duplicateReviewSliceFileCount, 1);
  assert.equal(attributes["data-viz-manim-v2-goal-status"], "not-complete");
  assert.match(attributes["data-viz-manim-v2-goal-blockers"], /a06-review-slice-plan-not-ready/);
});
