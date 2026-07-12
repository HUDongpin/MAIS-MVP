import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  MOBJECT_POINT_TRANSFORM_SOURCE_CONTRACT,
  applyPointsFunctionAboutPointToRenderState,
  buildMobjectPointTransformEvidence,
  mobjectPointTransformDataAttributes,
  rotateRuntimeRenderState,
  scaleRuntimeRenderState,
  shiftRuntimeRenderState
} from "./mathMobjectPointTransforms";
import { buildVMobjectStyle } from "./mathVMobjectStyle";
import type { MathObjectGraph, RuntimeRenderState } from "./mathSceneRuntimeState";

const curveStyle = buildVMobjectStyle({ strokeRole: "function", strokeWidth: 4 });

function roundPoint(point: [number, number, number]) {
  return point.map((value) => Number(value.toFixed(6)));
}

function sampleGraph(): MathObjectGraph {
  return {
    byId: {
      curve: {
        boundingBox: { center: [0.5, 0, 0], kind: "finite", max: [1, 0, 0], min: [0, 0, 0] },
        childIds: ["dot"],
        colorRole: "function",
        conceptId: "function-model",
        id: "curve",
        renderState: { kind: "polyline", points: [[0, 0, 0], [1, 0, 0]], style: curveStyle },
        spec: {
          colorRole: "function",
          conceptId: "function-model",
          id: "curve",
          samples: [[0, 0, 0], [1, 0, 0]],
          type: "parametricCurve"
        },
        type: "parametricCurve"
      },
      dot: {
        boundingBox: { center: [0.5, 0, 0], kind: "finite", max: [0.5, 0, 0], min: [0.5, 0, 0] },
        childIds: [],
        colorRole: "probe",
        conceptId: "probe-point",
        id: "dot",
        parentId: "curve",
        renderState: { kind: "point", position: [0.5, 0, 0] },
        spec: { colorRole: "probe", conceptId: "probe-point", id: "dot", pathObjectId: "curve", type: "movingPoint" },
        type: "movingPoint"
      },
      trace: {
        boundingBox: { kind: "empty" },
        childIds: [],
        colorRole: "trace",
        conceptId: "probe-trace",
        id: "trace",
        parentId: "curve",
        renderState: { kind: "polyline", points: [], style: buildVMobjectStyle({ strokeRole: "trace" }) },
        spec: { colorRole: "trace", durationSeconds: 1, id: "trace", sourceObjectId: "dot", type: "trace" },
        type: "trace"
      }
    },
    rootIds: ["curve"]
  };
}

test("applies Manim-style apply_points_function_about_point to render-state points", () => {
  const state: RuntimeRenderState = {
    kind: "polyline",
    points: [[1, 1, 0], [2, 1, 0]],
    style: curveStyle
  };
  const transformed = applyPointsFunctionAboutPointToRenderState(
    state,
    ([x, y, z]) => [x * 2, y * 3, z],
    { aboutPoint: [1, 1, 0] }
  );

  assert.equal(transformed.kind, "polyline");
  if (transformed.kind !== "polyline") throw new Error("expected polyline");
  assert.deepEqual(transformed.points, [[1, 1, 0], [3, 1, 0]]);
  assert.equal(transformed.style, curveStyle);
  assert.match(MOBJECT_POINT_TRANSFORM_SOURCE_CONTRACT, /apply_points_function_about_point/);
});

test("derives shift, scale, and rotate point transforms from the same point-function contract", () => {
  const point: RuntimeRenderState = { kind: "point", position: [2, 1, 0] };
  const shifted = shiftRuntimeRenderState(point, [0.25, -0.5, 1]);
  const scaled = scaleRuntimeRenderState(point, 2, { aboutPoint: [1, 1, 0] });
  const rotated = rotateRuntimeRenderState(point, Math.PI / 2, { aboutPoint: [1, 1, 0], axis: "z" });

  assert.equal(shifted.kind, "point");
  assert.equal(scaled.kind, "point");
  assert.equal(rotated.kind, "point");
  if (shifted.kind !== "point" || scaled.kind !== "point" || rotated.kind !== "point") {
    throw new Error("expected point states");
  }
  assert.deepEqual(roundPoint(shifted.position), [2.25, 0.5, 1]);
  assert.deepEqual(roundPoint(scaled.position), [3, 1, 0]);
  assert.deepEqual(roundPoint(rotated.position), [1, 2, 0]);
  assert.match(MOBJECT_POINT_TRANSFORM_SOURCE_CONTRACT, /Mobject\.shift/);
  assert.match(MOBJECT_POINT_TRANSFORM_SOURCE_CONTRACT, /Mobject\.scale/);
  assert.match(MOBJECT_POINT_TRANSFORM_SOURCE_CONTRACT, /Mobject\.rotate/);
});

test("builds deterministic browser evidence for Mobject point transforms", () => {
  const evidence = buildMobjectPointTransformEvidence(sampleGraph(), {
    operations: [
      { id: "shift-test", type: "shift", vector: [1, 2, 0] },
      { aboutPoint: [0, 0, 0], factor: 2, id: "scale-origin", type: "scale" },
      { aboutPoint: [0, 0, 0], angleRadians: Math.PI / 2, axis: "z", id: "rotate-z", type: "rotate" }
    ]
  });
  const attributes = mobjectPointTransformDataAttributes(evidence);

  assert.equal(evidence.objectCount, 3);
  assert.equal(evidence.transformableObjectCount, 2);
  assert.equal(evidence.operationCount, 3);
  assert.equal(evidence.rowCount, 6);
  assert.equal(evidence.sourcePointCount, 3);
  assert.equal(evidence.transformedPointCount, 9);
  assert.equal(evidence.finiteTransformedPointCount, 9);
  assert.equal(evidence.operationIds, "shift-test,scale-origin,rotate-z");
  assert.equal(evidence.sourceContract, MOBJECT_POINT_TRANSFORM_SOURCE_CONTRACT);
  assert.match(evidence.signature, /^mobject-point-transform-[0-9a-f]{8}$/);
  assert.equal(
    evidence.summary,
    "mobject-point-transform:objects=3:transformable=2:ops=3:rows=6:sourcePoints=3:transformed=9:finite=9:ids=shift-test,scale-origin,rotate-z"
  );
  assert.deepEqual(
    evidence.rows.map((row) => `${row.objectId}:${row.operationId}:${row.pointCount}:${row.changedPointCount}`),
    [
      "curve:shift-test:2:2",
      "curve:scale-origin:2:1",
      "curve:rotate-z:2:1",
      "dot:shift-test:1:1",
      "dot:scale-origin:1:1",
      "dot:rotate-z:1:1"
    ]
  );
  assert.equal(attributes["data-viz-mobject-point-transform-operation-count"], "3");
  assert.equal(attributes["data-viz-mobject-point-transform-row-count"], "6");
  assert.equal(attributes["data-viz-mobject-point-transform-source-point-count"], "3");
  assert.equal(attributes["data-viz-mobject-point-transform-transformed-point-count"], "9");
  assert.equal(attributes["data-viz-mobject-point-transform-finite-transformed-point-count"], "9");
  assert.equal(attributes["data-viz-mobject-point-transform-operation-ids"], "shift-test,scale-origin,rotate-z");
  assert.equal(attributes["data-viz-mobject-point-transform-source-contract"], MOBJECT_POINT_TRANSFORM_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-mobject-point-transform-summary"], evidence.summary);
});

test("Mobject point-transform source stays pure and feeds the evidence harness", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathMobjectPointTransforms.ts", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");

  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.match(source, /applyPointsFunctionAboutPointToRenderState/);
  assert.match(source, /shiftRuntimeRenderState/);
  assert.match(source, /scaleRuntimeRenderState/);
  assert.match(source, /rotateRuntimeRenderState/);
  assert.match(source, /mobjectPointTransformDataAttributes/);
  assert.match(evidenceSource, /buildMobjectPointTransformEvidence/);
  assert.match(evidenceSource, /mobjectPointTransformDataAttributes/);
});
