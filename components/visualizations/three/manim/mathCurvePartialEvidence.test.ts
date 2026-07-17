import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  VMOBJECT_PARTIAL_CURVE_SOURCE_CONTRACT,
  VMOBJECT_PARTIAL_CURVE_VISIBILITY_POLICY,
  curvePartialFrameDataAttributes
} from "./mathCurveObject";
import {
  buildActiveCurvePartialFrame,
  serializeCurvePartialFrame
} from "./mathCurvePartialEvidence";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";
import { buildMathSceneRuntimeState } from "./mathSceneRuntimeState";

const functionGraphSpec = buildMathSceneSpecForThreeDFamily({
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

test("builds active VMobject partial-curve evidence from runtime reveal state", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 1.2);
  const frame = buildActiveCurvePartialFrame(runtimeState);

  assert.ok(frame);
  if (!frame) throw new Error("expected active partial-curve frame");
  const attributes = curvePartialFrameDataAttributes(frame);
  const serialized = serializeCurvePartialFrame(frame);

  assert.equal(frame.sourceId, "function-curve");
  assert.equal(frame.curve.id, "function-curve");
  assert.equal(frame.sourceContract, VMOBJECT_PARTIAL_CURVE_SOURCE_CONTRACT);
  assert.equal(frame.visibilityPolicy, VMOBJECT_PARTIAL_CURVE_VISIBILITY_POLICY);
  assert.deepEqual(frame.normalizedRange, [0, 0.5]);
  assert.deepEqual(frame.requestedRange, [0, 0.5]);
  assert.equal(frame.reversed, false);
  assert.equal(attributes["data-viz-curve-partial-source-id"], "function-curve");
  assert.equal(attributes["data-viz-curve-partial-normalized-range"], "0.000..0.500");
  assert.equal(attributes["data-viz-curve-partial-requested-range"], "0.000..0.500");
  assert.equal(attributes["data-viz-curve-partial-reversed"], "false");
  assert.equal(attributes["data-viz-curve-partial-source-contract"], VMOBJECT_PARTIAL_CURVE_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-curve-partial-visibility-policy"], VMOBJECT_PARTIAL_CURVE_VISIBILITY_POLICY);
  assert.doesNotMatch(serialized, /<\/script|undefined|NaN|Infinity/i);
  assert.deepEqual(JSON.parse(serialized), frame);
});

test("active partial-curve bridge stays pure and renderer-independent", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathCurvePartialEvidence.ts", "utf8");
  const harnessSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");

  assert.match(source, /buildActiveCurvePartialFrame/);
  assert.match(source, /pointwiseBecomePartialCurveObject/);
  assert.match(source, /serializeCurvePartialFrame/);
  assert.match(harnessSource, /buildActiveCurvePartialFrame/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
});
