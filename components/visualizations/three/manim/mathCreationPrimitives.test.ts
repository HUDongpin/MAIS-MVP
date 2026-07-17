import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import type { MathSceneSpec } from "./mathSceneTypes";
import { buildVMobjectStyle } from "./mathVMobjectStyle";
import {
  buildCreationPrimitiveFrame,
  buildSceneCreationPrimitivePlan,
  creationPrimitivePlanDataAttributes,
  summarizeCreationPrimitiveFrame,
  summarizeSceneCreationPrimitivePlan
} from "./mathCreationPrimitives";

const fixtureScene: MathSceneSpec = {
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
    {
      colorRole: "function",
      conceptId: "curve",
      id: "curve",
      samples: [[0, 0, 0], [1, 1, 0], [2, 1, 0]],
      style: { strokeRole: "function", strokeWidth: 4 },
      type: "parametricCurve"
    },
    {
      colorRole: "area",
      conceptId: "surface",
      id: "surface",
      samples: [
        [[0, 0, 0], [1, 0, 0]],
        [[0, 1, 0], [1, 1, 0]]
      ],
      style: { fillOpacity: 0.45, fillRole: "area", strokeRole: "function", strokeWidth: 3 },
      type: "parametricSurface",
      uRange: [0, 1],
      vRange: [0, 1]
    }
  ],
  sceneId: "mais-manim-creation-fixture",
  timeline: [
    { type: "revealCurve", objectId: "curve", duration: 1.5, easing: "smooth" },
    { type: "revealSurface", objectId: "surface", duration: 2, easing: "smooth" },
    { type: "wait", duration: 0.5 }
  ]
};

test("builds Manim-style ShowCreation, Fade, Grow, and DrawBorderThenFill frames", () => {
  const style = buildVMobjectStyle({
    fillOpacity: 0.4,
    fillRole: "area",
    strokeOpacity: 1,
    strokeRole: "function",
    strokeWidth: 6
  });

  const show = buildCreationPrimitiveFrame({
    kind: "showCreation",
    objectId: "curve",
    progress: 0.4,
    style
  });
  const drawFill = buildCreationPrimitiveFrame({
    kind: "drawBorderThenFill",
    objectId: "area",
    progress: 0.75,
    style
  });
  const fadeOut = buildCreationPrimitiveFrame({
    kind: "fadeOut",
    objectId: "old-label",
    progress: 0.25,
    style
  });
  const grow = buildCreationPrimitiveFrame({
    kind: "growFromCenter",
    objectId: "point",
    progress: 1.4,
    style
  });

  assert.deepEqual(show.drawRange, [0, 0.4]);
  assert.equal(show.opacity, 1);
  assert.equal(show.scale, 1);
  assert.equal(show.phase, "stroke");
  assert.equal(show.style.fillOpacity, 0);

  assert.deepEqual(drawFill.drawRange, [0, 1]);
  assert.equal(drawFill.phase, "fill");
  assert.equal(Number(drawFill.style.fillOpacity.toFixed(3)), 0.2);

  assert.equal(fadeOut.opacity, 0.75);
  assert.deepEqual(fadeOut.drawRange, [0, 1]);

  assert.equal(grow.opacity, 1);
  assert.equal(grow.scale, 1);
  assert.equal(summarizeCreationPrimitiveFrame(show), "showCreation:curve:phase=stroke:draw=0.400:opacity=1.000:scale=1.000");
});

test("builds a scene-level creation primitive plan from reveal timeline beats", () => {
  const plan = buildSceneCreationPrimitivePlan(fixtureScene);
  const summary = summarizeSceneCreationPrimitivePlan(plan);
  const attributes = creationPrimitivePlanDataAttributes(summary);

  assert.equal(plan.sceneId, "mais-manim-creation-fixture");
  assert.deepEqual(
    plan.primitives.map((primitive) => `${primitive.kind}:${primitive.objectId}:${primitive.timelineStepIndex}`),
    ["showCreation:curve:0", "drawBorderThenFill:surface:1"]
  );
  assert.equal(summary.primitiveCount, 2);
  assert.equal(summary.showCreationCount, 1);
  assert.equal(summary.drawBorderThenFillCount, 1);
  assert.equal(summary.fadeCount, 0);
  assert.equal(summary.growFromCenterCount, 0);
  assert.equal(summary.summary, "creation:mais-manim-creation-fixture:primitives=2:show=1:borderFill=1:fade=0:grow=0");
  assert.deepEqual(attributes, {
    "data-viz-manim-creation-draw-border-count": "1",
    "data-viz-manim-creation-fade-count": "0",
    "data-viz-manim-creation-grow-count": "0",
    "data-viz-manim-creation-primitive-count": "2",
    "data-viz-manim-creation-show-count": "1",
    "data-viz-manim-creation-summary": "creation:mais-manim-creation-fixture:primitives=2:show=1:borderFill=1:fade=0:grow=0"
  });
});

test("builds Manim-style FadeIn, FadeOut, and GrowFromCenter plans from authored timeline beats", () => {
  const scene: MathSceneSpec = {
    ...fixtureScene,
    timeline: [
      { type: "fadeInObject", objectId: "curve", duration: 0.8, easing: "smooth" },
      { type: "growFromCenter", objectId: "surface", duration: 1.1, easing: "smooth" },
      { type: "fadeOutObject", objectId: "curve", duration: 0.7, easing: "linear" }
    ]
  };
  const plan = buildSceneCreationPrimitivePlan(scene);
  const summary = summarizeSceneCreationPrimitivePlan(plan);

  assert.deepEqual(
    plan.primitives.map((primitive) => `${primitive.kind}:${primitive.objectId}:${primitive.duration}:${primitive.timelineStepIndex}`),
    ["fadeIn:curve:0.8:0", "growFromCenter:surface:1.1:1", "fadeOut:curve:0.7:2"]
  );
  assert.equal(summary.primitiveCount, 3);
  assert.equal(summary.showCreationCount, 0);
  assert.equal(summary.drawBorderThenFillCount, 0);
  assert.equal(summary.fadeCount, 2);
  assert.equal(summary.growFromCenterCount, 1);
  assert.equal(summary.summary, "creation:mais-manim-creation-fixture:primitives=3:show=0:borderFill=0:fade=2:grow=1");
});

test("creation primitives stay pure and Canvas exposes their QA evidence", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathCreationPrimitives.ts", "utf8");
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");

  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.match(source, /buildDrawBorderThenFillFrame/);
  assert.match(canvasSource, /buildSceneCreationPrimitivePlan/);
  assert.match(canvasSource, /creationPrimitivePlanDataAttributes/);
  assert.match(canvasSource, /data-viz-manim-creation-primitive-count/);
});
