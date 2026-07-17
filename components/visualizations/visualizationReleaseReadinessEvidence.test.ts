import assert from "node:assert/strict";
import test from "node:test";
import {
  VISUALIZATION_BROWSER_REGRESSION_EVIDENCE_CONTRACT,
  VISUALIZATION_BROWSER_REGRESSION_ROOT_ATTRIBUTE_A11_ACTION,
  type VisualizationBrowserRegressionEvidenceMatrix
} from "./visualizationBrowserRegressionEvidence";
import {
  VISUALIZATION_BROWSER_REGRESSION_RUN_FROM_BEAT_CHECKPOINT_INVALIDATION_DATA_ATTRIBUTES
} from "./visualizationBrowserRegressionPackages";
import { buildMathSceneTeachingSignoffMatrix } from "./three/manim/mathSceneTeachingSignoffMatrix";
import {
  buildVisualizationReleaseReadinessEvidence,
  visualizationReleaseReadinessDataAttributes,
  VISUALIZATION_RELEASE_READINESS_EVIDENCE_CONTRACT
} from "./visualizationReleaseReadinessEvidence";

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

test("Visualization release-readiness evidence keeps the Manim slice blocked until A11, A18, and A22 close their gates", () => {
  const evidence = buildVisualizationReleaseReadinessEvidence({
    browserEvidence: browserEvidenceFixture(),
    teachingSignoff: buildMathSceneTeachingSignoffMatrix()
  });

  assert.equal(evidence.sourceContract, VISUALIZATION_RELEASE_READINESS_EVIDENCE_CONTRACT);
  assert.equal(evidence.releaseGateStatus, "not-release-ready");
  assert.equal(evidence.a11SplitRegressionStatus, "passed");
  assert.equal(evidence.a11BroadGateStatus, "red-needs-a11-a22-follow-up");
  assert.equal(evidence.a18TeachingGateStatus, "a18-final-signoff-required");
  assert.equal(evidence.a22ReleasePreflightStatus, "blocked-disk-space");
  assert.equal(evidence.a22PrunedStagingBuildStatus, "passed");
  assert.equal(evidence.a22RootDeployStatus, "blocked-dirty-root");
  assert.equal(evidence.productionDeployAllowed, false);
  assert.deepEqual(evidence.blockers, [
    "a11-broad-visualization-value-suite-red",
    "a18-final-teaching-signoff-open",
    "a22-release-preflight-disk-blocked",
    "a22-dirty-root-release-blocked"
  ]);
});

test("Visualization release-readiness evidence exposes the exact A11/A22/A18 follow-up actions", () => {
  const evidence = buildVisualizationReleaseReadinessEvidence({
    browserEvidence: browserEvidenceFixture(),
    teachingSignoff: buildMathSceneTeachingSignoffMatrix()
  });

  assert.ok(evidence.requiredFollowUpActions.includes("adopt-hk-grade-split-packages"));
  assert.ok(evidence.requiredFollowUpActions.includes("update-projection-views-expected-list"));
  assert.ok(evidence.requiredFollowUpActions.includes(VISUALIZATION_BROWSER_REGRESSION_ROOT_ATTRIBUTE_A11_ACTION));
  assert.ok(evidence.requiredFollowUpActions.includes("investigate-isolated-next-chunk-serving-after-broad-timeout"));
  assert.ok(evidence.requiredFollowUpActions.includes("release-from-clean-worktree-or-reviewed-pruned-staging-slice"));
  assert.ok(evidence.requiredFollowUpActions.includes("complete-a18-final-scene-signoff"));
  assert.ok(evidence.requiredFollowUpActions.includes("run-a22-generated-artifact-cleanup-after-preserving-evidence"));
  assert.equal(evidence.releasePath, "clean-worktree-or-reviewed-pruned-staging-slice");
  assert.match(evidence.summary, /not-release-ready/);
});

test("Visualization release-readiness evidence serializes stable data attributes for A11/A22 handoff", () => {
  const evidence = buildVisualizationReleaseReadinessEvidence({
    browserEvidence: browserEvidenceFixture(),
    teachingSignoff: buildMathSceneTeachingSignoffMatrix()
  });
  const attributes = visualizationReleaseReadinessDataAttributes(evidence);
  const requiredRunFromBeatCheckpointInvalidationDataAttributes = [
    ...VISUALIZATION_BROWSER_REGRESSION_RUN_FROM_BEAT_CHECKPOINT_INVALIDATION_DATA_ATTRIBUTES
  ];

  assert.equal(attributes["data-viz-release-readiness-source-contract"], VISUALIZATION_RELEASE_READINESS_EVIDENCE_CONTRACT);
  assert.equal(attributes["data-viz-release-readiness-status"], "not-release-ready");
  assert.equal(attributes["data-viz-release-readiness-a11-split-status"], "passed");
  assert.deepEqual(evidence.a11RequiredRootDataAttributes, [...requiredRunFromBeatCheckpointInvalidationDataAttributes].sort());
  assert.deepEqual(
    evidence.a11RunFromBeatCheckpointInvalidationDataAttributes,
    requiredRunFromBeatCheckpointInvalidationDataAttributes
  );
  assert.equal(
    attributes["data-viz-release-readiness-a11-required-root-attribute-count"],
    String(requiredRunFromBeatCheckpointInvalidationDataAttributes.length)
  );
  assert.equal(
    attributes["data-viz-release-readiness-a11-run-from-beat-checkpoint-invalidation-attributes"],
    requiredRunFromBeatCheckpointInvalidationDataAttributes.join(",")
  );
  assert.equal(attributes["data-viz-release-readiness-a22-preflight"], "blocked-disk-space");
  assert.equal(attributes["data-viz-release-readiness-a22-pruned-staging"], "passed");
  assert.equal(attributes["data-viz-release-readiness-production-deploy-allowed"], "false");
  assert.match(attributes["data-viz-release-readiness-blockers"], /a18-final-teaching-signoff-open/);
});
