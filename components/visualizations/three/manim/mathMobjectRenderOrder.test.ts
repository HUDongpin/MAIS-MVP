import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildMobjectFamilyIndex } from "./mathMobjectFamily";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";
import { buildMathSceneRuntimeState } from "./mathSceneRuntimeState";

const modulePath = "components/visualizations/three/manim/mathMobjectRenderOrder.ts";

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

test("builds a deterministic Manim render-order plan from scene groups and family traversal", async () => {
  assert.ok(functionGraphSpec);
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should expose a pure Mobject render-order module");
  const {
    buildMobjectRenderOrderPlan,
    summarizeMobjectRenderOrderPlan
  } = await import("./mathMobjectRenderOrder");

  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const familyIndex = buildMobjectFamilyIndex(runtimeState.objectGraph);
  const plan = buildMobjectRenderOrderPlan(runtimeState.sceneGraph, familyIndex);

  assert.equal(plan.planVersion, "mais-manim-render-order/v1");
  assert.deepEqual(plan.topLevelObjectIds, ["axes", "function-curve"]);
  assert.deepEqual(plan.sceneObjectIds, ["axes", "function-curve", "moving-probe", "probe-trace"]);
  assert.deepEqual(plan.foregroundObjectIds, []);
  assert.deepEqual(plan.fixedInFrameObjectIds, []);
  assert.deepEqual(plan.allObjectIds, ["axes", "function-curve", "moving-probe", "probe-trace"]);
  assert.equal(plan.renderedObjectCount, 4);
  assert.equal(plan.topLevelObjectCount, 2);
  assert.equal(plan.foregroundObjectCount, 0);
  assert.equal(plan.fixedInFrameObjectCount, 0);
  assert.equal(plan.renderOrderSummary, "scene=axes>function-curve>moving-probe>probe-trace;foreground=none;fixed=none");
  assert.equal(plan.summary, "render-order:top=2:rendered=4:foreground=0:fixed=0");
  assert.equal(summarizeMobjectRenderOrderPlan(plan), plan.summary);
  assert.match(plan.signature, /^mobject-render-order-[0-9a-f]{8}$/);
  assert.deepEqual(
    plan.rows.map((row) => ({
      familyDepth: row.familyDepth,
      group: row.group,
      objectId: row.objectId,
      renderIndex: row.renderIndex,
      topLevelAncestorId: row.topLevelAncestorId
    })),
    [
      { familyDepth: 0, group: "scene", objectId: "axes", renderIndex: 0, topLevelAncestorId: "axes" },
      { familyDepth: 0, group: "scene", objectId: "function-curve", renderIndex: 1, topLevelAncestorId: "function-curve" },
      { familyDepth: 1, group: "scene", objectId: "moving-probe", renderIndex: 2, topLevelAncestorId: "function-curve" },
      { familyDepth: 2, group: "scene", objectId: "probe-trace", renderIndex: 3, topLevelAncestorId: "function-curve" }
    ]
  );
});

test("render-order plan exposes foreground and fixed-in-frame overlay ordering", async () => {
  assert.ok(functionGraphSpec);
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should expose a pure Mobject render-order module");
  const { buildMobjectRenderOrderPlan } = await import("./mathMobjectRenderOrder");

  const runtimeState = buildMathSceneRuntimeState({
    ...functionGraphSpec,
    renderGroups: {
      fixedInFrameObjectIds: ["axes"],
      foregroundObjectIds: ["function-curve"]
    }
  }, 0);
  const familyIndex = buildMobjectFamilyIndex(runtimeState.objectGraph);
  const plan = buildMobjectRenderOrderPlan(runtimeState.sceneGraph, familyIndex);

  assert.deepEqual(plan.sceneObjectIds, []);
  assert.deepEqual(plan.foregroundObjectIds, ["function-curve", "moving-probe", "probe-trace"]);
  assert.deepEqual(plan.fixedInFrameObjectIds, ["axes"]);
  assert.deepEqual(plan.allObjectIds, ["function-curve", "moving-probe", "probe-trace", "axes"]);
  assert.equal(plan.renderOrderSummary, "scene=none;foreground=function-curve>moving-probe>probe-trace;fixed=axes");
  assert.deepEqual(plan.rows.map((row) => row.group), ["foreground", "foreground", "foreground", "fixedInFrame"]);
});

test("render-order data attributes and JSON are deterministic for browser QA", async () => {
  assert.ok(functionGraphSpec);
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should expose a pure Mobject render-order module");
  const {
    buildMobjectRenderOrderPlan,
    mobjectRenderOrderDataAttributes,
    serializeMobjectRenderOrderPlan
  } = await import("./mathMobjectRenderOrder");

  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const familyIndex = buildMobjectFamilyIndex(runtimeState.objectGraph);
  const plan = buildMobjectRenderOrderPlan(runtimeState.sceneGraph, familyIndex);
  const attributes = mobjectRenderOrderDataAttributes(plan);
  const json = serializeMobjectRenderOrderPlan(plan);

  assert.deepEqual(attributes, {
    "data-viz-mobject-render-order-all-ids": "axes,function-curve,moving-probe,probe-trace",
    "data-viz-mobject-render-order-fixed-count": "0",
    "data-viz-mobject-render-order-fixed-ids": "none",
    "data-viz-mobject-render-order-foreground-count": "0",
    "data-viz-mobject-render-order-foreground-ids": "none",
    "data-viz-mobject-render-order-rendered-count": "4",
    "data-viz-mobject-render-order-scene-ids": "axes,function-curve,moving-probe,probe-trace",
    "data-viz-mobject-render-order-signature": plan.signature,
    "data-viz-mobject-render-order-summary": plan.summary,
    "data-viz-mobject-render-order-top-level-count": "2",
    "data-viz-mobject-render-order-top-level-ids": "axes,function-curve"
  });
  assert.doesNotMatch(json, /undefined|NaN|Infinity|<\/script/i);
  assert.deepEqual(JSON.parse(json), plan);
});

test("render-order module stays pure TypeScript without React, R3F, or Three.js imports", () => {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should expose a pure Mobject render-order module");
  const source = fs.readFileSync(modulePath, "utf8");

  assert.match(source, /buildMobjectRenderOrderPlan/);
  assert.match(source, /mobjectRenderOrderDataAttributes/);
  assert.match(source, /serializeMobjectRenderOrderPlan/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"|MathSceneRuntime|ThreeDLabCanvas/);
});
