import assert from "node:assert/strict";
import test from "node:test";
import type { FeaturedLabDefinition } from "../../data/visualizationLabs";
import { buildVisualizationBrowserRegressionPlan } from "./visualizationBrowserRegressionPackages";
import {
  buildVisualizationBrowserRegressionEvidenceMatrix,
  VISUALIZATION_BROWSER_REGRESSION_EVIDENCE_CONTRACT
} from "./visualizationBrowserRegressionEvidence";

const baseLab = {
  analyticsSource: "visualization-lab",
  category: { en: "3D", zh: "3D", zhHans: "3D" },
  description: { en: "Fixture", zh: "Fixture", zhHans: "Fixture" },
  gradeLabel: { en: "P1", zh: "P1", zhHans: "P1" },
  moduleId: "configured-visualization-lab",
  primaryForTopic: true,
  publisher: "HK",
  qaProfile: "geometry-heavy",
  templateConfig: {
    accent: "#22d3ee",
    focus: { en: "Fixture", zh: "Fixture", zhHans: "Fixture" },
    formula: { en: "f(x)", zh: "f(x)", zhHans: "f(x)" },
    variant: "fixture"
  },
  templateId: "function-graph",
  title: { en: "Fixture", zh: "Fixture", zhHans: "Fixture" },
  topicId: "fixture-topic"
} as const;

function fixtureLab(labId: string, grade: string, curriculumTrack = "HK") {
  return {
    ...baseLab,
    curriculumTrack,
    grade,
    gradeLabel: { en: grade, zh: grade, zhHans: grade },
    labId,
    threeD: {
      coverageTier: "standard-3d",
      enabled: true,
      fallbackTemplateId: "function-graph",
      familyId: "three-function-graph"
    }
  } as unknown as FeaturedLabDefinition;
}

const browserEvidenceFixtureLabs = [
  fixtureLab("p1-place-value", "P1"),
  fixtureLab("p2-shapes", "P2"),
  fixtureLab("p3-fractions", "P3"),
  fixtureLab("p4-angles", "P4"),
  fixtureLab("p4-decimals", "P4"),
  fixtureLab("p4-large-numbers", "P4"),
  fixtureLab("p4-perimeter-area", "P4"),
  fixtureLab("p5-volume", "P5"),
  fixtureLab("p6-ratio", "P6"),
  fixtureLab("s1-algebra", "S1"),
  fixtureLab("s2-linear", "S2"),
  fixtureLab("s3-quadratics", "S3"),
  fixtureLab("s4-functions", "S4"),
  fixtureLab("s5-calculus", "S5"),
  fixtureLab("s6-statistics", "S6")
];

test("Visualization Lab browser evidence matrix records every HK grade-split package as green", () => {
  const plan = buildVisualizationBrowserRegressionPlan(browserEvidenceFixtureLabs, { maxLabsPerPackage: 8 });
  const matrix = buildVisualizationBrowserRegressionEvidenceMatrix(plan);

  assert.equal(matrix.sourceContract, VISUALIZATION_BROWSER_REGRESSION_EVIDENCE_CONTRACT);
  assert.equal(matrix.hkGradeSplitStatus, "passed");
  assert.deepEqual(matrix.missingHkPackageIds, []);
  assert.deepEqual(
    matrix.hkGradePackageEvidence.map((entry) => entry.grade),
    ["P1", "P2", "P3", "P4", "P5", "P6", "S1", "S2", "S3", "S4", "S5", "S6"]
  );
  assert.ok(matrix.hkGradePackageEvidence.every((entry) => entry.status === "passed"));
  assert.ok(matrix.hkGradePackageEvidence.every((entry) => entry.command.includes("VISUALIZATION_SWEEP_TRACKS=HK")));
  assert.ok(matrix.hkGradePackageEvidence.some((entry) => entry.runId === "manim-v2-a11-20260628ap"));
});

test("Visualization Lab browser evidence matrix records the latest P4 rerun after p4-angles became a 3D capsule", () => {
  const plan = buildVisualizationBrowserRegressionPlan(browserEvidenceFixtureLabs, { maxLabsPerPackage: 8 });
  const matrix = buildVisualizationBrowserRegressionEvidenceMatrix(plan);
  const p4Evidence = matrix.hkGradePackageEvidence.find((entry) => entry.packageId === "hk-demo-P4-part-1");

  assert.ok(p4Evidence);
  assert.deepEqual(p4Evidence.labIds, ["p4-angles", "p4-decimals", "p4-large-numbers", "p4-perimeter-area"]);
  assert.equal(p4Evidence.runId, "manim-v2-a11-20260628aq");
  assert.equal(p4Evidence.port, 3186);
  assert.equal(p4Evidence.duration, "2.1m");
  assert.match(p4Evidence.command, /PLAYWRIGHT_RUN_ID=manim-v2-a11-20260628aq/);
  assert.match(p4Evidence.command, /PLAYWRIGHT_PORT=3186/);
  assert.match(p4Evidence.command, /VISUALIZATION_SWEEP_LABS=p4-angles,p4-decimals,p4-large-numbers,p4-perimeter-area/);
});

test("Visualization Lab browser evidence matrix keeps the broad gate red until A11/A22 consume the split contract", () => {
  const plan = buildVisualizationBrowserRegressionPlan(browserEvidenceFixtureLabs, { maxLabsPerPackage: 8 });
  const matrix = buildVisualizationBrowserRegressionEvidenceMatrix(plan);

  assert.equal(matrix.broadGateStatus, "red-needs-a11-a22-follow-up");
  assert.match(matrix.a11HandoffSummary, /P1-S6/);
  assert.deepEqual(matrix.remainingA11Actions, [
    "adopt-hk-grade-split-packages",
    "update-projection-views-expected-list",
    "smoke-check-run-from-beat-checkpoint-invalidation-root-attributes",
    "keep-non-hk-tracks-out-of-hk-demo-sweep"
  ]);
  assert.deepEqual(matrix.remainingA22Actions, [
    "investigate-isolated-next-chunk-serving-after-broad-timeout",
    "release-from-clean-worktree-or-reviewed-pruned-staging-slice"
  ]);
});

test("Visualization Lab browser evidence matrix carries required A11 root smoke attributes from the plan", () => {
  const plan = buildVisualizationBrowserRegressionPlan(browserEvidenceFixtureLabs, { maxLabsPerPackage: 8 });
  const matrix = buildVisualizationBrowserRegressionEvidenceMatrix(plan);

  assert.deepEqual(matrix.requiredRootDataAttributes, plan.requiredRootDataAttributes);
  assert.deepEqual(
    matrix.requiredRunFromBeatCheckpointInvalidationDataAttributes,
    plan.requiredRunFromBeatCheckpointInvalidationDataAttributes
  );
  assert.ok(
    matrix.remainingA11Actions.includes("smoke-check-run-from-beat-checkpoint-invalidation-root-attributes")
  );
  assert.deepEqual(matrix.requiredRunFromBeatCheckpointInvalidationDataAttributes, [
    "data-viz-manim-run-from-beat-checkpoint-invalidates-count",
    "data-viz-manim-run-from-beat-checkpoint-invalidated-keys",
    "data-viz-manim-run-from-beat-checkpoint-invalidation-summary",
    "data-viz-manim-run-from-beat-checkpoint-retained-keys-after-restore",
    "data-viz-manim-run-from-beat-checkpoint-restore-action"
  ]);
});
