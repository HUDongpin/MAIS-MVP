import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  buildMobjectUniformPayload,
  fixedInFrameUniformObjectIds,
  interpolateMobjectUniforms,
  MOBJECT_UNIFORM_SOURCE_CONTRACT,
  normalizeMobjectUniforms,
  serializeMobjectUniformPayload,
  summarizeMobjectUniforms,
  type MobjectUniformPayload
} from "./mathMobjectUniforms";
import type { MathObjectGraph } from "./mathSceneRuntimeState";
import type { MathObjectSpec } from "./mathSceneTypes";

test("normalizes Manim-style Mobject uniforms with finite opacity and clipping planes", () => {
  const uniforms = normalizeMobjectUniforms({
    clippingPlanes: [
      { constant: 2, normal: [0, 3, 4] },
      { constant: Number.NaN, normal: [0, 0, 0] },
      { constant: 1, normal: [Infinity, 0, 0] }
    ],
    fixedInFrame: true,
    opacity: 1.4,
    shadeIn3D: true
  });

  assert.equal(uniforms.fixedInFrame, true);
  assert.equal(uniforms.shadeIn3D, true);
  assert.equal(uniforms.opacity, 1);
  assert.deepEqual(uniforms.clippingPlanes, [{ constant: 2, normal: [0, 0.6, 0.8] }]);

  assert.deepEqual(normalizeMobjectUniforms({ opacity: -0.5 }).opacity, 0);
  assert.deepEqual(normalizeMobjectUniforms({ opacity: Number.NaN }).opacity, 1);
  assert.deepEqual(normalizeMobjectUniforms().clippingPlanes, []);
});

test("interpolates Manim-style Mobject uniforms as part of Mobject.interpolate", () => {
  const source = normalizeMobjectUniforms({
    clippingPlanes: [{ constant: 0, normal: [0, 1, 0] }],
    fixedInFrame: false,
    opacity: 0.2,
    shadeIn3D: false
  });
  const target = normalizeMobjectUniforms({
    clippingPlanes: [{ constant: 2, normal: [0, 0, 1] }],
    fixedInFrame: true,
    opacity: 1,
    shadeIn3D: true
  });
  const halfway = interpolateMobjectUniforms(source, target, 0.25);
  const final = interpolateMobjectUniforms(source, target, 1);

  assert.ok(halfway);
  assert.equal(halfway.opacity, 0.4);
  assert.equal(halfway.fixedInFrame, false);
  assert.equal(halfway.shadeIn3D, false);
  assert.equal(halfway.clippingPlanes.length, 1);
  assert.equal(halfway.clippingPlanes[0]?.constant, 0.5);
  assert.deepEqual(halfway.clippingPlanes[0]?.normal.map((value) => Number(value.toFixed(6))), [0, 0.948683, 0.316228]);
  assert.equal(final?.fixedInFrame, true);
  assert.equal(final?.shadeIn3D, true);
  assert.equal(interpolateMobjectUniforms(undefined, undefined, 0.5), undefined);
});

test("summarizes Mobject uniform coverage from a runtime object graph", () => {
  const graph: MathObjectGraph = {
    byId: {
      axes: {
        boundingBox: { kind: "empty" },
        childIds: [],
        conceptId: "axes",
        id: "axes",
        renderState: {
          kind: "axes",
          xAxisPoints: [[-1, 0, 0], [1, 0, 0]],
          yAxisPoints: [[0, -1, 0], [0, 1, 0]],
          zAxisPoints: [[0, 0, -1], [0, 0, 1]]
        },
        spec: { type: "axis3d", id: "axes", range: { x: [-1, 1], y: [-1, 1], z: [-1, 1] }, conceptId: "axes" },
        type: "axis3d",
        uniforms: normalizeMobjectUniforms({ fixedInFrame: true })
      },
      curve: {
        boundingBox: { kind: "finite", center: [0.5, 0.5, 0], min: [0, 0, 0], max: [1, 1, 0] },
        childIds: [],
        colorRole: "function",
        conceptId: "curve",
        id: "curve",
        renderState: { kind: "polyline", points: [[0, 0, 0], [1, 1, 0]] },
        spec: { type: "parametricCurve", id: "curve", samples: [[0, 0, 0], [1, 1, 0]], colorRole: "function", conceptId: "curve" },
        type: "parametricCurve",
        uniforms: normalizeMobjectUniforms({
          clippingPlanes: [{ constant: 0, normal: [0, 1, 0] }],
          opacity: 0.35,
          shadeIn3D: true
        })
      }
    },
    rootIds: ["axes", "curve"]
  };

  const summary = summarizeMobjectUniforms(graph);

  assert.equal(summary.objectCount, 2);
  assert.equal(summary.fixedInFrameCount, 1);
  assert.equal(summary.shadeIn3DCount, 1);
  assert.equal(summary.clippingPlaneCount, 1);
  assert.equal(summary.transparentCount, 1);
  assert.equal(summary.minOpacity, 0.35);
  assert.equal(summary.summary, "objects=2;fixed=1;shade3d=1;clipPlanes=1;transparent=1;minOpacity=0.350");
});

test("builds and serializes raw Mobject uniform payloads for browser QA", () => {
  const graph: MathObjectGraph = {
    byId: {
      "label<script>": {
        boundingBox: { kind: "empty" },
        childIds: [],
        conceptId: "label",
        id: "label<script>",
        renderState: { kind: "empty" },
        spec: { type: "vector", id: "label<script>", from: [0, 0, 0], to: [1, 0, 0], colorRole: "reference", conceptId: "label" },
        type: "vector",
        uniforms: normalizeMobjectUniforms({ fixedInFrame: true, opacity: 0.5 })
      }
    },
    rootIds: ["label<script>"]
  };

  const payload = buildMobjectUniformPayload(graph);
  const json = serializeMobjectUniformPayload(payload);
  const parsed = JSON.parse(json) as MobjectUniformPayload;

  assert.equal(payload.sourceContract, MOBJECT_UNIFORM_SOURCE_CONTRACT);
  assert.equal(payload.objectCount, 1);
  assert.equal(payload.fixedInFrameCount, 1);
  assert.equal(payload.transparentCount, 1);
  assert.equal(payload.summary, "objects=1;fixed=1;shade3d=0;clipPlanes=0;transparent=1;minOpacity=0.500");
  assert.doesNotMatch(json, /</);
  assert.deepEqual(parsed, payload);
  assert.equal(serializeMobjectUniformPayload(JSON.parse(JSON.stringify(payload)) as typeof payload), json);
});

test("finds fixed-in-frame object ids from authoring specs", () => {
  const objects: MathObjectSpec[] = [
    { type: "axis3d", id: "axes", range: { x: [-1, 1], y: [-1, 1], z: [-1, 1] }, conceptId: "axes", uniforms: { fixedInFrame: true } },
    { type: "parametricCurve", id: "curve", samples: [[0, 0, 0], [1, 1, 0]], colorRole: "function", conceptId: "curve" },
    {
      type: "vector",
      id: "direction",
      from: [0, 0, 0],
      to: [1, 0, 0],
      colorRole: "probe",
      conceptId: "direction",
      uniforms: { fixedInFrame: true, opacity: 0.8 }
    }
  ];

  assert.deepEqual(fixedInFrameUniformObjectIds(objects), ["axes", "direction"]);
});

test("Mobject uniforms stay pure and are consumed by runtime and evidence layers", () => {
  const uniformsSource = fs.readFileSync("components/visualizations/three/manim/mathMobjectUniforms.ts", "utf8");
  const runtimeSource = fs.readFileSync("components/visualizations/three/manim/mathSceneRuntimeState.ts", "utf8");
  const runtimeGraphSource = fs.readFileSync("components/visualizations/three/manim/mathSceneRuntimeGraph.ts", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");

  assert.doesNotMatch(uniformsSource, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.match(uniformsSource, /MOBJECT_UNIFORM_SOURCE_CONTRACT/);
  assert.match(uniformsSource, /buildMobjectUniformPayload/);
  assert.match(uniformsSource, /serializeMobjectUniformPayload/);
  assert.match(uniformsSource, /stableSerialize/);
  assert.match(runtimeSource, /normalizeMobjectUniforms/);
  assert.match(runtimeSource, /buildMathSceneRuntimeGraphFrame/);
  assert.match(runtimeGraphSource, /fixedInFrameUniformObjectIds/);
  assert.match(evidenceSource, /summarizeMobjectUniforms/);
});
