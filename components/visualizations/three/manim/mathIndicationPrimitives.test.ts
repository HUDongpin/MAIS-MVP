import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import * as indicationPrimitives from "./mathIndicationPrimitives";
import {
  buildCircumscribeFrame,
  buildFlashFrame,
  buildHighlightPulseFrame,
  buildIndicationTargetFromNode,
  summarizeIndicationFrame
} from "./mathIndicationPrimitives";
import type { RuntimeMathObjectNode } from "./mathSceneRuntimeState";
import type { MathObjectSpec, Vec3 } from "./mathSceneTypes";

const curveSpec: MathObjectSpec = {
  colorRole: "function",
  conceptId: "linear-rule",
  id: "line",
  samples: [
    [0, 1, 0],
    [2, 3, 0]
  ],
  type: "parametricCurve"
};

const node: RuntimeMathObjectNode = {
  boundingBox: { center: [1, 2, 0], kind: "finite", max: [2, 3, 0], min: [0, 1, 0] },
  childIds: [],
  colorRole: "function",
  conceptId: "linear-rule",
  id: "line",
  renderState: { kind: "polyline", points: curveSpec.samples },
  spec: curveSpec,
  type: "parametricCurve"
};

function roundedPoints(points: Vec3[]) {
  return points.map((point) => point.map((value) => Number(value.toFixed(3))) as Vec3);
}

test("builds an indication target from runtime Mobject bounds", () => {
  const target = buildIndicationTargetFromNode(node);

  assert.equal(target.id, "line");
  assert.equal(target.conceptId, "linear-rule");
  assert.equal(target.colorRole, "function");
  assert.deepEqual(target.center, [1, 2, 0]);
  assert.deepEqual(target.min, [0, 1, 0]);
  assert.deepEqual(target.max, [2, 3, 0]);
});

test("builds deterministic Flash rays around a Mobject center", () => {
  const target = buildIndicationTargetFromNode(node);
  const frame = buildFlashFrame(target, {
    innerRadius: 1,
    outerRadius: 2,
    progress: 0.5,
    rayCount: 4
  });

  assert.equal(frame.type, "flash");
  assert.equal(frame.targetId, "line");
  assert.equal(frame.opacity, 1);
  assert.equal(frame.rays.length, 4);
  assert.deepEqual(roundedPoints(frame.rays.map((ray) => ray.from)), [
    [2, 2, 0],
    [1, 3, 0],
    [0, 2, 0],
    [1, 1, 0]
  ]);
  assert.deepEqual(roundedPoints(frame.rays.map((ray) => ray.to)), [
    [3, 2, 0],
    [1, 4, 0],
    [-1, 2, 0],
    [1, 0, 0]
  ]);
  assert.equal(summarizeIndicationFrame(frame), "flash:line:rays=4:opacity=1.000");
});

test("builds a Circumscribe outline frame from Mobject bounds", () => {
  const target = buildIndicationTargetFromNode(node);
  const frame = buildCircumscribeFrame(target, {
    padding: 0.25,
    progress: 0.5
  });

  assert.equal(frame.type, "circumscribe");
  assert.deepEqual(frame.drawRange, [0, 0.5]);
  assert.equal(frame.opacity, 1);
  assert.deepEqual(roundedPoints(frame.outline), [
    [-0.25, 0.75, 0],
    [2.25, 0.75, 0],
    [2.25, 3.25, 0],
    [-0.25, 3.25, 0],
    [-0.25, 0.75, 0]
  ]);
  assert.equal(summarizeIndicationFrame(frame), "circumscribe:line:points=5:draw=0.500");
});

test("builds a pulse frame for semantic highlight beats", () => {
  const target = buildIndicationTargetFromNode(node);
  const frame = buildHighlightPulseFrame(target, {
    maxScale: 1.2,
    progress: 0.5
  });

  assert.equal(frame.type, "pulse");
  assert.equal(frame.scale, 1.2);
  assert.equal(frame.opacity, 1);
  assert.deepEqual(frame.center, [1, 2, 0]);
  assert.equal(summarizeIndicationFrame(frame), "pulse:line:scale=1.200:opacity=1.000");
});

test("falls back to a finite origin target for empty Mobject bounds", () => {
  const target = buildIndicationTargetFromNode({
    ...node,
    boundingBox: { kind: "empty" },
    id: "empty-line"
  });
  const frame = buildFlashFrame(target, { progress: 0.5, rayCount: 1 });

  assert.deepEqual(target.center, [0, 0, 0]);
  assert.deepEqual(target.min, [0, 0, 0]);
  assert.deepEqual(target.max, [0, 0, 0]);
  assert.equal(frame.rays.length, 1);
});

test("builds a scene-level indication primitive plan from highlight beats", () => {
  assert.equal(typeof indicationPrimitives.buildSceneIndicationPrimitivePlan, "function");
  assert.equal(typeof indicationPrimitives.serializeSceneIndicationPrimitivePlan, "function");
  assert.equal(typeof indicationPrimitives.summarizeSceneIndicationPrimitivePlan, "function");
  assert.equal(typeof indicationPrimitives.indicationPrimitivePlanDataAttributes, "function");

  const scene = {
    bindings: [],
    cameraShots: [{ id: "overview", position: [2, 2, 2], target: [0, 0, 0] }],
    coordinateSpace: {
      mathRange: { x: [-1, 1], y: [-1, 1], z: [-1, 1] },
      worldRange: { x: [-1, 1], y: [-1, 1], z: [-1, 1] }
    },
    diagnostics: {
      expectedBindingCount: 0,
      expectedObjectCount: 2,
      expectedTokenCount: 0
    },
    familyId: "three-function-graph",
    formulas: [],
    objects: [
      curveSpec,
      {
        colorRole: "probe",
        conceptId: "probe-point",
        id: "probe",
        pathObjectId: "line",
        type: "movingPoint"
      }
    ],
    sceneId: "mais-manim-indication-fixture",
    timeline: [
      { type: "highlight", conceptId: "linear-rule", duration: 0.8 },
      { type: "highlight", conceptId: "missing-concept", duration: 0.6 },
      { type: "wait", duration: 0.2 }
    ]
  } as const;
  const plan = indicationPrimitives.buildSceneIndicationPrimitivePlan(scene);
  const summary = indicationPrimitives.summarizeSceneIndicationPrimitivePlan(plan);
  const attributes = indicationPrimitives.indicationPrimitivePlanDataAttributes(summary);

  assert.equal(plan.sceneId, "mais-manim-indication-fixture");
  assert.equal(
    indicationPrimitives.INDICATION_PRIMITIVE_SOURCE_CONTRACT,
    "Indication animations add transient attention geometry without changing target math objects"
  );
  assert.equal(indicationPrimitives.INDICATION_PRIMITIVE_STATE_POLICY, "attention-overlays-preserve-target-state");
  assert.deepEqual(
    plan.indications.map((indication) => `${indication.kind}:${indication.conceptId}:${indication.targetObjectIds.join("+") || "none"}:${indication.timelineStepIndex}`),
    ["pulse:linear-rule:line:0", "pulse:missing-concept:none:1"]
  );
  assert.equal(summary.indicationCount, 2);
  assert.equal(summary.highlightBeatCount, 2);
  assert.equal(summary.targetObjectCount, 1);
  assert.equal(summary.missingTargetCount, 1);
  assert.equal(summary.pulseCount, 2);
  assert.equal(summary.sourceContract, indicationPrimitives.INDICATION_PRIMITIVE_SOURCE_CONTRACT);
  assert.equal(summary.statePolicy, indicationPrimitives.INDICATION_PRIMITIVE_STATE_POLICY);
  assert.equal(summary.circumscribeCount, 0);
  assert.equal(summary.flashCount, 0);
  assert.equal(summary.conceptIds, "linear-rule,missing-concept");
  assert.equal(summary.targetObjectIds, "line");
  assert.equal(
    summary.summary,
    "indication:mais-manim-indication-fixture:beats=2:targets=1:pulse=2:circumscribe=0:flash=0:missing=1"
  );
  assert.deepEqual(attributes, {
    "data-viz-manim-indication-circumscribe-count": "0",
    "data-viz-manim-indication-concept-ids": "linear-rule,missing-concept",
    "data-viz-manim-indication-count": "2",
    "data-viz-manim-indication-flash-count": "0",
    "data-viz-manim-indication-highlight-beat-count": "2",
    "data-viz-manim-indication-missing-target-count": "1",
    "data-viz-manim-indication-pulse-count": "2",
    "data-viz-manim-indication-source-contract": indicationPrimitives.INDICATION_PRIMITIVE_SOURCE_CONTRACT,
    "data-viz-manim-indication-state-policy": indicationPrimitives.INDICATION_PRIMITIVE_STATE_POLICY,
    "data-viz-manim-indication-summary": "indication:mais-manim-indication-fixture:beats=2:targets=1:pulse=2:circumscribe=0:flash=0:missing=1",
    "data-viz-manim-indication-target-object-count": "1",
    "data-viz-manim-indication-target-object-ids": "line"
  });
});

test("builds scene-level indication primitive plans from semantic parameter sweep beats", () => {
  const scene = {
    objects: [curveSpec],
    sceneId: "mais-manim-parameter-sweep-fixture",
    timeline: [
      {
        type: "sweepParameter",
        trackerId: "parameter:value",
        targetValue: 5,
        duration: 1,
        easing: "smooth",
        conceptId: "linear-rule",
        formulaTokenIds: ["function-token"] as string[]
      },
      { type: "wait", duration: 0.2 }
    ]
  } as const;
  const plan = indicationPrimitives.buildSceneIndicationPrimitivePlan(scene);
  const summary = indicationPrimitives.summarizeSceneIndicationPrimitivePlan(plan);

  assert.deepEqual(
    plan.indications.map((indication) => `${indication.kind}:${indication.conceptId}:${indication.targetObjectIds.join("+")}:${indication.timelineStepIndex}`),
    ["pulse:linear-rule:line:0"]
  );
  assert.equal(summary.indicationCount, 1);
  assert.equal(summary.highlightBeatCount, 1);
  assert.equal(summary.conceptIds, "linear-rule");
  assert.equal(summary.targetObjectIds, "line");
  assert.equal(
    summary.summary,
    "indication:mais-manim-parameter-sweep-fixture:beats=1:targets=1:pulse=1:circumscribe=0:flash=0:missing=0"
  );
});

test("serializes scene-level indication primitive plans as script-safe JSON", () => {
  const plan = indicationPrimitives.buildSceneIndicationPrimitivePlan({
    objects: [curveSpec],
    sceneId: "<mais-manim-indication-fixture",
    timeline: [
      { type: "highlight", conceptId: "linear-rule", duration: 0.8 },
      { type: "highlight", conceptId: "<missing-concept", duration: 0.6 }
    ]
  });
  const json = indicationPrimitives.serializeSceneIndicationPrimitivePlan(plan);
  const parsed = JSON.parse(json);

  assert.doesNotMatch(json, /</);
  assert.equal(parsed.sceneId, "<mais-manim-indication-fixture");
  assert.deepEqual(parsed.indications, [
    {
      colorRoles: ["function"],
      conceptId: "linear-rule",
      duration: 0.8,
      kind: "pulse",
      targetObjectIds: ["line"],
      timelineStepIndex: 0
    },
    {
      colorRoles: [],
      conceptId: "<missing-concept",
      duration: 0.6,
      kind: "pulse",
      targetObjectIds: [],
      timelineStepIndex: 1
    }
  ]);
});

test("Indication primitives stay pure and renderer-independent", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathIndicationPrimitives.ts", "utf8");
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");

  assert.match(source, /buildFlashFrame/);
  assert.match(source, /buildCircumscribeFrame/);
  assert.match(source, /buildHighlightPulseFrame/);
  assert.match(source, /INDICATION_PRIMITIVE_SOURCE_CONTRACT/);
  assert.match(source, /INDICATION_PRIMITIVE_STATE_POLICY/);
  assert.match(source, /buildSceneIndicationPrimitivePlan/);
  assert.match(source, /serializeSceneIndicationPrimitivePlan/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.match(canvasSource, /buildSceneIndicationPrimitivePlan/);
  assert.match(canvasSource, /serializeSceneIndicationPrimitivePlan/);
  assert.match(canvasSource, /indicationPrimitivePlanDataAttributes/);
  assert.match(canvasSource, /data-viz-manim-indication-count/);
});
