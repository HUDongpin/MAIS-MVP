import assert from "node:assert/strict";
import test from "node:test";
import type { ThreeDFamilyId, ThreeDStateSummary } from "../threeDSceneTypes";
import { threeDFamilyIds } from "../threeDSceneMath";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";
import type { MathSceneSpec } from "./mathSceneTypes";
import {
  buildMathSceneTeachingQualityEvidence,
  buildMathSceneTeachingQualityMatrix,
  MATH_SCENE_TEACHING_QUALITY_SOURCE_CONTRACT,
  mathSceneTeachingQualityDataAttributes
} from "./mathSceneTeachingQuality";

function stateForFamily(familyId: ThreeDFamilyId): ThreeDStateSummary {
  return {
    comparison: 5,
    depthValue: 1.4,
    familyId,
    mode: 1,
    primaryValue: 6,
    secondaryValue: 5,
    stateSummary: `family=${familyId};template=function-graph;value=6.000;comparison=5.000;depth=1.400`,
    templateId: "function-graph",
    value: 6
  };
}

test("every registered MAIS Manim scene exposes A18/A06 teaching-quality evidence", () => {
  const scenes = threeDFamilyIds.map((familyId) => {
    const spec = buildMathSceneSpecForThreeDFamily({
      accent: "#22d3ee",
      state: stateForFamily(familyId)
    });

    assert.ok(spec, `${familyId} should build a Manim scene spec`);
    return spec;
  });

  const matrix = buildMathSceneTeachingQualityMatrix(scenes);
  const missingEvidence = matrix.flatMap((evidence) =>
    evidence.missingTeachingEvidence.map((item) => `${evidence.familyId}:${item}`)
  );

  assert.equal(matrix.length, threeDFamilyIds.length);
  assert.deepEqual(missingEvidence, []);
  assert.ok(matrix.every((evidence) => evidence.status === "ready-for-a18-review"));
  assert.ok(matrix.every((evidence) => evidence.sourceContract === MATH_SCENE_TEACHING_QUALITY_SOURCE_CONTRACT));
  assert.deepEqual(
    matrix[0],
    buildMathSceneTeachingQualityEvidence(scenes[0])
  );
});

test("function graph teaching-quality summary stays stable for review evidence", () => {
  const spec = buildMathSceneSpecForThreeDFamily({
    accent: "#22d3ee",
    state: stateForFamily("three-function-graph")
  });

  assert.ok(spec);
  const evidence = buildMathSceneTeachingQualityEvidence(spec);
  const attributes = mathSceneTeachingQualityDataAttributes(evidence);

  assert.equal(evidence.status, "ready-for-a18-review");
  assert.equal(evidence.controlParameterCount, 3);
  assert.equal(evidence.derivedParameterCount, 3);
  assert.equal(evidence.focusedBeatCount, 6);
  assert.equal(
    evidence.summary,
    "teachingQuality:mais-manim-function-graph:ready=true:objects=4:conceptObjects=3:tokens=2:bindings=2:beats=6:focused=6:camera=2:controls=3"
  );
  assert.equal(attributes["data-viz-manim-teaching-quality-ready"], "true");
  assert.equal(attributes["data-viz-manim-teaching-quality-missing"], "none");
  assert.equal(attributes["data-viz-manim-teaching-quality-summary"], evidence.summary);
});

test("teaching-quality precheck flags scenes that are not ready for A18 review", () => {
  const underspecifiedScene: MathSceneSpec = {
    bindings: [],
    cameraShots: [],
    coordinateSpace: {
      mathRange: { x: [-1, 1], y: [-1, 1], z: [-1, 1] },
      worldRange: { x: [-1, 1], y: [-1, 1], z: [-1, 1] }
    },
    diagnostics: {
      expectedBindingCount: 1,
      expectedObjectCount: 1,
      expectedTokenCount: 1
    },
    familyId: "three-function-graph",
    formulas: [],
    objects: [],
    sceneId: "underspecified-scene",
    timeline: [{ duration: 1, type: "wait" }]
  };

  const evidence = buildMathSceneTeachingQualityEvidence(underspecifiedScene);

  assert.equal(evidence.status, "needs-a18-followup");
  assert.deepEqual(evidence.missingTeachingEvidence, [
    "runtime-export-approval",
    "visible-math-objects",
    "formula-tokens",
    "semantic-formula-bindings",
    "focused-timeline-beats",
    "camera-shots",
    "controlled-parameters",
    "diagnostic-counts"
  ]);
});
