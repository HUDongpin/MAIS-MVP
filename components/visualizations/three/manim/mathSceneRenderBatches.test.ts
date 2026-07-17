import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import type { MathObjectGraph } from "./mathSceneRuntimeState";
import type { MathSceneRenderGroups } from "./mathSceneGraph";
import { buildVMobjectStyle } from "./mathVMobjectStyle";

type MathSceneRenderBatch = {
  batchId: string;
  groupClass: "axes" | "point" | "vectorized";
  materialKey: string;
  objectIds: string[];
  renderStateKind: string;
  zIndex: number;
};

type MathSceneRenderBatchPlan = {
  batchCount: number;
  batches: MathSceneRenderBatch[];
  objectCount: number;
  skippedObjectIds: string[];
  sourceContract: string;
  summary: string;
};

type MathSceneRenderBatchesModule = {
  buildSceneRenderBatches: (input: {
    objectGraph: MathObjectGraph;
    renderGroups: MathSceneRenderGroups;
  }) => MathSceneRenderBatchPlan;
  sceneRenderBatchDataAttributes: (plan: MathSceneRenderBatchPlan) => Record<string, string>;
  serializeSceneRenderBatchPlan: (plan: MathSceneRenderBatchPlan) => string;
};

const modulePath = "components/visualizations/three/manim/mathSceneRenderBatches.ts";
const functionStyle = buildVMobjectStyle({ strokeRole: "function", strokeWidth: 4 });
const tangentStyle = buildVMobjectStyle({ strokeRole: "tangent", strokeWidth: 4 });

const objectGraph: MathObjectGraph = {
  byId: {
    "curve-a": {
      boundingBox: { kind: "finite", center: [0.5, 0, 0], max: [1, 0, 0], min: [0, 0, 0] },
      childIds: [],
      colorRole: "function",
      conceptId: "function-a",
      id: "curve-a",
      renderState: { kind: "polyline", points: [[0, 0, 0], [1, 0, 0]], style: functionStyle },
      spec: { type: "parametricCurve", id: "curve-a", samples: [[0, 0, 0], [1, 0, 0]], colorRole: "function", conceptId: "function-a" },
      type: "parametricCurve"
    },
    "curve-b": {
      boundingBox: { kind: "finite", center: [1.5, 0, 0], max: [2, 0, 0], min: [1, 0, 0] },
      childIds: [],
      colorRole: "function",
      conceptId: "function-b",
      id: "curve-b",
      renderState: { kind: "polyline", points: [[1, 0, 0], [2, 0, 0]], style: functionStyle },
      spec: { type: "parametricCurve", id: "curve-b", samples: [[1, 0, 0], [2, 0, 0]], colorRole: "function", conceptId: "function-b" },
      type: "parametricCurve"
    },
    "curve-c": {
      boundingBox: { kind: "finite", center: [2.5, 0, 0], max: [3, 0, 0], min: [2, 0, 0] },
      childIds: [],
      colorRole: "function",
      conceptId: "function-c",
      id: "curve-c",
      renderState: { kind: "polyline", points: [[2, 0, 0], [3, 0, 0]], style: functionStyle },
      spec: { type: "parametricCurve", id: "curve-c", samples: [[2, 0, 0], [3, 0, 0]], colorRole: "function", conceptId: "function-c" },
      type: "parametricCurve"
    },
    "empty-guide": {
      boundingBox: { kind: "empty" },
      childIds: [],
      conceptId: "empty-guide",
      id: "empty-guide",
      renderState: { kind: "empty" },
      spec: { type: "axis3d", id: "empty-guide", range: { x: [0, 1], y: [0, 1], z: [0, 1] }, conceptId: "empty-guide" },
      type: "axis3d"
    },
    probe: {
      boundingBox: { kind: "finite", center: [1, 0, 0], max: [1, 0, 0], min: [1, 0, 0] },
      childIds: [],
      colorRole: "probe",
      conceptId: "current-point",
      id: "probe",
      renderState: { kind: "point", position: [1, 0, 0] },
      spec: { type: "movingPoint", id: "probe", pathObjectId: "curve-a", colorRole: "probe", conceptId: "current-point" },
      type: "movingPoint"
    },
    tangent: {
      boundingBox: { kind: "finite", center: [2, 0, 0], max: [2.5, 0, 0], min: [1.5, 0, 0] },
      childIds: [],
      colorRole: "tangent",
      conceptId: "tangent-line",
      id: "tangent",
      renderState: { kind: "polyline", points: [[1.5, 0, 0], [2.5, 0, 0]], style: tangentStyle },
      spec: { type: "parametricCurve", id: "tangent", samples: [[1.5, 0, 0], [2.5, 0, 0]], colorRole: "tangent", conceptId: "tangent-line" },
      type: "parametricCurve"
    },
    "z-curve": {
      boundingBox: { kind: "finite", center: [3.5, 0, 0], max: [4, 0, 0], min: [3, 0, 0] },
      childIds: [],
      colorRole: "function",
      conceptId: "function-z",
      id: "z-curve",
      renderState: { kind: "polyline", points: [[3, 0, 0], [4, 0, 0]], style: functionStyle },
      spec: { type: "parametricCurve", id: "z-curve", samples: [[3, 0, 0], [4, 0, 0]], colorRole: "function", conceptId: "function-z", zIndex: 2 },
      type: "parametricCurve"
    }
  },
  rootIds: ["curve-a", "curve-b", "probe", "curve-c", "tangent", "z-curve", "empty-guide"]
};

const renderGroups: MathSceneRenderGroups = {
  all: ["curve-a", "curve-b", "probe", "curve-c", "tangent", "z-curve", "empty-guide", "missing-object"],
  fixedInFrame: [],
  foreground: [],
  scene: ["curve-a", "curve-b", "probe", "curve-c", "tangent", "z-curve", "empty-guide", "missing-object"]
};

async function importSceneRenderBatchesModule() {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should provide a pure assemble_render_groups batching module");
  return await import("./mathSceneRenderBatches") as MathSceneRenderBatchesModule;
}

test("buildSceneRenderBatches clusters adjacent mobjects by render kind, material signature, and z_index", async () => {
  const { buildSceneRenderBatches } = await importSceneRenderBatchesModule();
  const plan = buildSceneRenderBatches({ objectGraph, renderGroups });

  assert.equal(plan.batchCount, 5);
  assert.equal(plan.objectCount, 6);
  assert.deepEqual(plan.skippedObjectIds, ["empty-guide", "missing-object"]);
  assert.deepEqual(plan.batches.map((batch) => batch.objectIds), [
    ["curve-a", "curve-b"],
    ["probe"],
    ["curve-c"],
    ["tangent"],
    ["z-curve"]
  ]);
  assert.deepEqual(plan.batches.map((batch) => batch.groupClass), [
    "vectorized",
    "point",
    "vectorized",
    "vectorized",
    "vectorized"
  ]);
  assert.deepEqual(plan.batches.map((batch) => batch.zIndex), [0, 0, 0, 0, 2]);
  assert.equal(plan.batches[0].materialKey, plan.batches[2].materialKey);
  assert.notEqual(plan.batches[0].materialKey, plan.batches[3].materialKey);
  assert.equal(plan.sourceContract, "Scene.assemble_render_groups|render_groups replacement|adjacent batch clustering");
  assert.match(plan.summary, /^renderBatches:batches=5:objects=6:skipped=2:keys=/);
});

test("buildSceneRenderBatches preserves adjacency instead of merging separated compatible mobjects", async () => {
  const { buildSceneRenderBatches } = await importSceneRenderBatchesModule();
  const plan = buildSceneRenderBatches({
    objectGraph,
    renderGroups: {
      ...renderGroups,
      all: ["curve-a", "probe", "curve-b", "curve-c"]
    }
  });

  assert.deepEqual(plan.batches.map((batch) => batch.objectIds), [
    ["curve-a"],
    ["probe"],
    ["curve-b", "curve-c"]
  ]);
});

test("sceneRenderBatchDataAttributes exposes stable QA evidence for browser promotion", async () => {
  const { buildSceneRenderBatches, sceneRenderBatchDataAttributes } = await importSceneRenderBatchesModule();
  const plan = buildSceneRenderBatches({ objectGraph, renderGroups });

  assert.deepEqual(sceneRenderBatchDataAttributes(plan), {
    "data-viz-manim-render-batch-count": "5",
    "data-viz-manim-render-batch-object-count": "6",
    "data-viz-manim-render-batch-ids": plan.batches.map((batch) => batch.batchId).join(","),
    "data-viz-manim-render-batch-skipped-count": "2",
    "data-viz-manim-render-batch-skipped-ids": "empty-guide,missing-object",
    "data-viz-manim-render-batch-source-contract": plan.sourceContract,
    "data-viz-manim-render-batch-summary": plan.summary
  });
});

test("serializeSceneRenderBatchPlan emits stable script-safe JSON", async () => {
  const { buildSceneRenderBatches, serializeSceneRenderBatchPlan } = await importSceneRenderBatchesModule();
  const plan = buildSceneRenderBatches({ objectGraph, renderGroups });
  const json = serializeSceneRenderBatchPlan(plan);
  const parsed = JSON.parse(json) as MathSceneRenderBatchPlan;

  assert.doesNotMatch(json, /</);
  assert.equal(parsed.batchCount, 5);
  assert.equal(parsed.objectCount, 6);
  assert.deepEqual(parsed.skippedObjectIds, ["empty-guide", "missing-object"]);
  assert.deepEqual(parsed.batches.map((batch) => batch.objectIds), [
    ["curve-a", "curve-b"],
    ["probe"],
    ["curve-c"],
    ["tangent"],
    ["z-curve"]
  ]);
  assert.equal(parsed.sourceContract, "Scene.assemble_render_groups|render_groups replacement|adjacent batch clustering");
  assert.match(parsed.summary, /^renderBatches:batches=5:objects=6:skipped=2:keys=/);
});

test("Scene render batching stays pure and documents the assemble_render_groups source contract", () => {
  assert.ok(fs.existsSync(modulePath), "mathSceneRenderBatches.ts should exist");
  const source = fs.readFileSync(modulePath, "utf8");

  assert.match(source, /buildSceneRenderBatches/);
  assert.match(source, /sceneRenderBatchDataAttributes/);
  assert.match(source, /serializeSceneRenderBatchPlan/);
  assert.match(source, /stableSerialize/);
  assert.match(source, /assemble_render_groups/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"|ThreeDLabCanvas/);
});
