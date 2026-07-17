import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  buildMobjectPointGenerationTable,
  mobjectPointGenerationDataAttributes,
  MOBJECT_POINT_GENERATION_SOURCE_CONTRACT,
  summarizeMobjectPointGenerationTable
} from "./mathMobjectPointGeneration";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";
import { buildMathSceneRuntimeState, type MathObjectGraph } from "./mathSceneRuntimeState";

const functionGraphScene = buildMathSceneSpecForThreeDFamily({
  accent: "#22d3ee",
  state: {
    comparison: 5,
    depthValue: 1.4,
    familyId: "three-function-graph",
    mode: 0,
    primaryValue: 6,
    secondaryValue: 5,
    stateSummary: "family=three-function-graph;template=function-graph;value=6.000;comparison=5.000;depth=1.400",
    templateId: "function-graph",
    value: 6
  }
});

function functionGraphObjectGraph() {
  assert.ok(functionGraphScene);
  return buildMathSceneRuntimeState(functionGraphScene, 0).objectGraph;
}

test("summarizes Manim Mobject.generate_points/init_points evidence from runtime render states", () => {
  const table = buildMobjectPointGenerationTable(functionGraphObjectGraph());

  assert.equal(table.sourceContract, MOBJECT_POINT_GENERATION_SOURCE_CONTRACT);
  assert.match(MOBJECT_POINT_GENERATION_SOURCE_CONTRACT, /generate_points/);
  assert.match(MOBJECT_POINT_GENERATION_SOURCE_CONTRACT, /init_points/);
  assert.match(MOBJECT_POINT_GENERATION_SOURCE_CONTRACT, /pointsForRuntimeRenderState/);
  assert.equal(table.objectCount, 4);
  assert.equal(table.generatedObjectCount, 3);
  assert.equal(table.zeroPointObjectCount, 1);
  assert.equal(table.pointCount, 79);
  assert.equal(table.finitePointCount, 79);
  assert.equal(table.nonFinitePointCount, 0);
  assert.equal(table.generatorKindSummary, "axis3d=1;movingPoint=1;parametricCurve=1;trace=1");
  assert.equal(table.zeroPointObjectIds, "probe-trace");
  assert.deepEqual(
    table.rows.map((row) => `${row.objectId}:${row.generator}:${row.pointCount}`),
    ["axes:axis3d-axis-endpoints:6", "function-curve:parametricCurve-samples:72", "moving-probe:movingPoint-initial-position:1", "probe-trace:trace-initial-empty-path:0"]
  );
  assert.match(table.signature, /^mobject-point-generation-[0-9a-f]{8}$/);
  assert.equal(
    summarizeMobjectPointGenerationTable(table),
    "mobject-point-generation:objects=4:generated=3:points=79:finite=79:nonFinite=0:zero=probe-trace"
  );
});

test("keeps non-finite point diagnostics visible before renderer sanitization", () => {
  const objectGraph: MathObjectGraph = {
    byId: {
      curve: {
        boundingBox: { kind: "empty" },
        childIds: [],
        colorRole: "curve",
        conceptId: "curve",
        id: "curve",
        renderState: {
          kind: "polyline",
          points: [
            [0, 0, 0],
            [Number.NaN, 1, 0],
            [2, Number.POSITIVE_INFINITY, 0]
          ]
        },
        spec: {
          colorRole: "curve",
          conceptId: "curve",
          id: "curve",
          samples: [],
          type: "parametricCurve"
        },
        type: "parametricCurve"
      }
    },
    rootIds: ["curve"]
  };
  const table = buildMobjectPointGenerationTable(objectGraph);

  assert.equal(table.objectCount, 1);
  assert.equal(table.pointCount, 3);
  assert.equal(table.finitePointCount, 1);
  assert.equal(table.nonFinitePointCount, 2);
  assert.equal(table.rows[0].finitePointCount, 1);
  assert.equal(table.rows[0].nonFinitePointCount, 2);
  assert.equal(table.summary, "mobject-point-generation:objects=1:generated=1:points=3:finite=1:nonFinite=2:zero=none");
});

test("emits browser data attributes for point-generation QA", () => {
  const table = buildMobjectPointGenerationTable(functionGraphObjectGraph());
  const attributes = mobjectPointGenerationDataAttributes(table);

  assert.deepEqual(attributes, {
    "data-viz-mobject-point-generation-finite-point-count": "79",
    "data-viz-mobject-point-generation-generated-object-count": "3",
    "data-viz-mobject-point-generation-generator-kind-summary": "axis3d=1;movingPoint=1;parametricCurve=1;trace=1",
    "data-viz-mobject-point-generation-non-finite-point-count": "0",
    "data-viz-mobject-point-generation-object-count": "4",
    "data-viz-mobject-point-generation-point-count": "79",
    "data-viz-mobject-point-generation-signature": table.signature,
    "data-viz-mobject-point-generation-source-contract": MOBJECT_POINT_GENERATION_SOURCE_CONTRACT,
    "data-viz-mobject-point-generation-summary": table.summary,
    "data-viz-mobject-point-generation-zero-point-object-count": "1",
    "data-viz-mobject-point-generation-zero-point-object-ids": "probe-trace"
  });
});

test("Mobject point-generation evidence stays pure and renderer-independent", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathMobjectPointGeneration.ts", "utf8");

  assert.match(source, /pointsForRuntimeRenderState/);
  assert.match(source, /MOBJECT_POINT_GENERATION_SOURCE_CONTRACT/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
});
