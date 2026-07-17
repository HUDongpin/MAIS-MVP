import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { buildManimReviewPackageHandoffMatrix } from "./mathSceneReviewPackageHandoff";
import { buildManimReviewPackageMatrix, classifyManimReviewPackage } from "./mathSceneReviewPackages";
import { buildManimReviewPackageSliceMatrix } from "./mathSceneReviewPackageSlices";
import {
  buildMathSceneV2GoalGate,
  mathSceneV2GoalGateDataAttributes
} from "./mathSceneV2GoalGate";
import {
  buildMathSceneV2SourceArchitectureHandoff,
  mathSceneV2SourceArchitectureHandoffDataAttributes,
  MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT
} from "./mathSceneV2SourceArchitectureHandoff";
import { buildMathSceneTeachingReviewDossier } from "./mathSceneTeachingReviewDossier";

const manimDir = "components/visualizations/three/manim";

function currentManimFileNames() {
  return fs
    .readdirSync(manimDir)
    .filter((fileName) => [".ts", ".tsx"].includes(path.extname(fileName)))
    .sort();
}

function handoffFixture() {
  const reviewPackages = buildManimReviewPackageMatrix(currentManimFileNames());
  const reviewSlices = buildManimReviewPackageSliceMatrix(reviewPackages, { maxFilesPerSlice: 24 });
  const reviewHandoff = buildManimReviewPackageHandoffMatrix(reviewPackages);
  const teachingDossier = buildMathSceneTeachingReviewDossier();
  const goalGate = buildMathSceneV2GoalGate({
    browserEvidence: {
      broadGateStatus: "pending-a11-browser-regression",
      hkGradePackageEvidence: [],
      hkGradeSplitStatus: "pending",
      missingHkPackageIds: ["hk-demo-S4-part-1"]
    },
    releaseReadiness: {
      a22PrunedStagingBuildStatus: "pending",
      a22ReleasePreflightStatus: "pending",
      a22RootDeployStatus: "blocked-dirty-root",
      blockers: ["a22-clean-worktree-build-required"],
      productionDeployAllowed: false,
      releaseGateStatus: "blocked"
    },
    reviewPackages,
    reviewSlices,
    teachingDossier
  });

  return buildMathSceneV2SourceArchitectureHandoff({
    goalGate,
    reviewHandoff,
    reviewSlices
  });
}

test("MAIS Manim v2 source-architecture handoff keeps the reusable skill boundary bounded", () => {
  const handoff = handoffFixture();

  assert.equal(handoff.sourceContract, MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT);
  assert.equal(handoff.bulkCourseGenerationAllowed, false);
  assert.equal(handoff.futureInvocationScope, "one-topic-one-concept-cluster-or-one-review-slice");
  assert.equal(handoff.status, "source-architecture-ready-owner-gates-open");
  assert.equal(handoff.canMarkThreadGoalComplete, false);
  assert.deepEqual(handoff.requiredOwnerGateIds, [
    "a11-browser-visual-interaction-regression",
    "a18-a06-teaching-quality-confirmation",
    "a22-clean-release-gate"
  ]);
  assert.deepEqual(handoff.acceptanceCriteria, [
    "bounded-source-architecture-slice",
    "no-bulk-course-generation",
    "review-packages-ready",
    "owner-gates-requested-not-accepted",
    "future-invocations-require-fresh-a18-a11-a22-gates"
  ]);
  assert.ok(handoff.reviewSliceCount > 0);
  assert.ok(handoff.largestReviewSliceFileCount <= handoff.maxFilesPerReviewSlice);
  assert.match(handoff.summary, /bulkCourseGeneration=false/);
  assert.match(handoff.summary, /ownerGatesOpen=a11-browser-visual-interaction-regression/);
});

test("MAIS Manim v2 source-architecture handoff serializes stable evidence attributes", () => {
  const handoff = handoffFixture();
  const attributes = mathSceneV2SourceArchitectureHandoffDataAttributes(handoff);
  const goalAttributes = mathSceneV2GoalGateDataAttributes(handoff.goalGate);

  assert.equal(classifyManimReviewPackage("mathSceneV2SourceArchitectureHandoff.ts"), "evidence");
  assert.equal(
    attributes["data-viz-manim-v2-source-architecture-handoff-source-contract"],
    MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT
  );
  assert.equal(attributes["data-viz-manim-v2-source-architecture-handoff-bulk-course-generation"], "false");
  assert.equal(
    attributes["data-viz-manim-v2-source-architecture-handoff-future-invocation-scope"],
    "one-topic-one-concept-cluster-or-one-review-slice"
  );
  assert.equal(
    attributes["data-viz-manim-v2-source-architecture-handoff-goal-owner-status-manifest"],
    goalAttributes["data-viz-manim-v2-goal-owner-status-manifest"]
  );
  assert.equal(
    attributes["data-viz-manim-v2-source-architecture-handoff-review-slice-summary"],
    handoff.reviewSliceSummary
  );
  assert.match(
    attributes["data-viz-manim-v2-source-architecture-handoff-acceptance-criteria"],
    /no-bulk-course-generation/
  );
  assert.match(
    attributes["data-viz-manim-v2-source-architecture-handoff-required-owner-gates"],
    /a18-a06-teaching-quality-confirmation/
  );
  assert.match(
    attributes["data-viz-manim-v2-source-architecture-handoff-summary"],
    /source-architecture-ready-owner-gates-open/
  );
});
