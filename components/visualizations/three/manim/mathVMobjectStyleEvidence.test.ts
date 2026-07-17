import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";
import { buildMathSceneRuntimeState } from "./mathSceneRuntimeState";
import {
  summarizeVMobjectStyleEvidence,
  vmobjectStyleEvidenceDataAttributes
} from "./mathVMobjectStyleEvidence";

const modulePath = "components/visualizations/three/manim/mathVMobjectStyleEvidence.ts";

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

test("summarizes VMobject source-level render style metadata for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const evidence = summarizeVMobjectStyleEvidence(runtimeState.objectGraph);

  assert.equal(evidence.styleCount, 2);
  assert.equal(evidence.styleObjectIds, "function-curve,probe-trace");
  assert.equal(evidence.maxAntiAliasWidth, 1);
  assert.equal(evidence.maxJointAngleDegrees, 0);
  assert.equal(evidence.baseNormalObjectIds, "function-curve,probe-trace");
  assert.equal(evidence.strokeZoomScreenSpaceCount, 2);
  assert.equal(evidence.strokeZoomWorldSpaceCount, 0);
  assert.equal(
    evidence.styleSummary,
    "objects=2;strokeRoles=function,trace;fillRoles=reference;transparentStroke=1;filled=0;maxStrokeWidth=5.00;minStrokeOpacity=0.55;maxAntiAliasWidth=1.00;maxJointAngle=0.00;baseNormals=function-curve,probe-trace;strokeZoom=screen-space:2,world-space:0"
  );
});

test("maps VMobject source-level render style metadata to stable data attributes", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const evidence = summarizeVMobjectStyleEvidence(runtimeState.objectGraph);
  const attributes = vmobjectStyleEvidenceDataAttributes(evidence);

  assert.equal(attributes["data-viz-vmobject-max-anti-alias-width"], "1.00");
  assert.equal(attributes["data-viz-vmobject-max-joint-angle"], "0.00");
  assert.equal(attributes["data-viz-vmobject-base-normal-object-ids"], "function-curve,probe-trace");
  assert.equal(attributes["data-viz-vmobject-stroke-zoom-screen-space-count"], "2");
  assert.equal(attributes["data-viz-vmobject-stroke-zoom-world-space-count"], "0");
  assert.equal(attributes["data-viz-vmobject-style-summary"], evidence.styleSummary);
});

test("VMobject style evidence stays pure and names Manim source render fields", () => {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should provide a pure VMobject style evidence module");
  const source = fs.readFileSync(modulePath, "utf8");

  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.match(source, /antiAliasWidth/);
  assert.match(source, /jointAngleDegrees/);
  assert.match(source, /baseNormal/);
  assert.match(source, /strokeZoomBehavior/);
  assert.match(source, /vmobjectStyleEvidenceDataAttributes/);
});
