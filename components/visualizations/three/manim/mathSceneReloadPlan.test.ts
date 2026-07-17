import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

type MathSceneReloadPlan = {
  checkpointCount: number;
  clearsSnippet: boolean;
  frameIndexAfter: number;
  historyLabel: string;
  ready: boolean;
  resetPolicy: string;
  resetsElapsed: boolean;
  resetsFrame: boolean;
  sceneId: string;
  selectedFamilyId: string;
  selectedSceneId: string;
  sourceContract: string;
  summary: string;
  version: "mais-manim-reload-plan/v1";
};

type MathSceneReloadPlanModule = {
  SCENE_RELOAD_RESET_POLICY: string;
  SCENE_RELOAD_SOURCE_CONTRACT: string;
  buildSceneReloadPlan: (input?: {
    checkpointCount?: number;
    elapsedSeconds?: number;
    frameIndex?: number;
    sceneId?: string | null;
    selectedFamilyId?: string | null;
    selectedSceneId?: string | null;
    snippet?: string | null;
  }) => MathSceneReloadPlan;
  sceneReloadPlanDataAttributes: (plan: MathSceneReloadPlan) => Record<string, string>;
  serializeSceneReloadPlan: (plan: MathSceneReloadPlan) => string;
};

const modulePath = "components/visualizations/three/manim/mathSceneReloadPlan.ts";

async function importReloadPlanModule() {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should provide a pure InteractiveScene reload planner");
  return (await import("./mathSceneReloadPlan")) as MathSceneReloadPlanModule;
}

test("buildSceneReloadPlan models InteractiveSceneEmbed reload as a fresh authoring scene", async () => {
  const {
    SCENE_RELOAD_RESET_POLICY,
    SCENE_RELOAD_SOURCE_CONTRACT,
    buildSceneReloadPlan
  } = await importReloadPlanModule();
  const plan = buildSceneReloadPlan({
    checkpointCount: 3,
    elapsedSeconds: 2.5,
    frameIndex: 150,
    sceneId: "mais-manim-function-graph",
    selectedFamilyId: "three-function-graph",
    selectedSceneId: "mais-manim-function-graph",
    snippet: "play(reveal_curve)"
  });

  assert.equal(plan.version, "mais-manim-reload-plan/v1");
  assert.equal(plan.sourceContract, SCENE_RELOAD_SOURCE_CONTRACT);
  assert.equal(plan.resetPolicy, SCENE_RELOAD_RESET_POLICY);
  assert.match(plan.sourceContract, /InteractiveSceneEmbed/);
  assert.match(plan.sourceContract, /reload/);
  assert.match(plan.resetPolicy, /preserve-selected-scene/);
  assert.match(plan.resetPolicy, /clear-snippet/);
  assert.equal(plan.ready, true);
  assert.equal(plan.sceneId, "mais-manim-function-graph");
  assert.equal(plan.selectedFamilyId, "three-function-graph");
  assert.equal(plan.selectedSceneId, "mais-manim-function-graph");
  assert.equal(plan.resetsElapsed, true);
  assert.equal(plan.resetsFrame, true);
  assert.equal(plan.frameIndexAfter, 0);
  assert.equal(plan.clearsSnippet, true);
  assert.equal(plan.checkpointCount, 3);
  assert.equal(plan.historyLabel, "reload");
  assert.equal(
    plan.summary,
    "reload:scene=mais-manim-function-graph:family=three-function-graph:selected=mais-manim-function-graph:ready=true:elapsed=true:frame=true:snippet=true:checkpoints=3"
  );
});

test("buildSceneReloadPlan is idle without a selected scene and clamps counts", async () => {
  const { buildSceneReloadPlan } = await importReloadPlanModule();
  const plan = buildSceneReloadPlan({
    checkpointCount: -2,
    elapsedSeconds: 0,
    frameIndex: -1,
    sceneId: "",
    selectedFamilyId: null,
    selectedSceneId: "",
    snippet: "   "
  });

  assert.equal(plan.ready, false);
  assert.equal(plan.sceneId, "none");
  assert.equal(plan.selectedFamilyId, "none");
  assert.equal(plan.selectedSceneId, "none");
  assert.equal(plan.resetsElapsed, false);
  assert.equal(plan.resetsFrame, false);
  assert.equal(plan.clearsSnippet, false);
  assert.equal(plan.checkpointCount, 0);
  assert.equal(plan.summary, "reload:scene=none:family=none:selected=none:ready=false:elapsed=false:frame=false:snippet=false:checkpoints=0");
});

test("sceneReloadPlanDataAttributes exposes stable browser QA evidence", async () => {
  const {
    SCENE_RELOAD_RESET_POLICY,
    SCENE_RELOAD_SOURCE_CONTRACT,
    buildSceneReloadPlan,
    sceneReloadPlanDataAttributes
  } = await importReloadPlanModule();
  const plan = buildSceneReloadPlan({
    checkpointCount: 2,
    elapsedSeconds: 1.25,
    frameIndex: 60,
    sceneId: "mais-manim-function-graph",
    selectedFamilyId: "three-function-graph",
    selectedSceneId: "mais-manim-function-graph",
    snippet: "wait(0.25)"
  });

  assert.deepEqual(sceneReloadPlanDataAttributes(plan), {
    "data-viz-manim-reload-checkpoint-count": "2",
    "data-viz-manim-reload-clears-snippet": "true",
    "data-viz-manim-reload-frame-after": "0",
    "data-viz-manim-reload-history-label": "reload",
    "data-viz-manim-reload-ready": "true",
    "data-viz-manim-reload-reset-policy": SCENE_RELOAD_RESET_POLICY,
    "data-viz-manim-reload-resets-elapsed": "true",
    "data-viz-manim-reload-resets-frame": "true",
    "data-viz-manim-reload-scene-id": "mais-manim-function-graph",
    "data-viz-manim-reload-selected-family-id": "three-function-graph",
    "data-viz-manim-reload-selected-scene-id": "mais-manim-function-graph",
    "data-viz-manim-reload-source-contract": SCENE_RELOAD_SOURCE_CONTRACT,
    "data-viz-manim-reload-summary": plan.summary
  });
});

test("serializes reload plans as escaped deterministic browser JSON", async () => {
  const {
    buildSceneReloadPlan,
    serializeSceneReloadPlan
  } = await importReloadPlanModule();
  const plan = buildSceneReloadPlan({
    checkpointCount: 1,
    elapsedSeconds: 1,
    frameIndex: 60,
    sceneId: "<mais-manim-function-graph>",
    selectedFamilyId: "three-function-graph",
    selectedSceneId: "<mais-manim-function-graph>",
    snippet: "reload()"
  });
  const serialized = serializeSceneReloadPlan(plan);

  assert.doesNotMatch(serialized, /<mais/);
  assert.match(serialized, /\\u003cmais-manim-function-graph>/);
  assert.deepEqual(JSON.parse(serialized), plan);
});

test("reload planner stays pure and documents the InteractiveSceneEmbed lifecycle contract", () => {
  assert.ok(fs.existsSync(modulePath), "mathSceneReloadPlan.ts should exist");
  const source = fs.readFileSync(modulePath, "utf8");

  assert.match(source, /SCENE_RELOAD_SOURCE_CONTRACT/);
  assert.match(source, /SCENE_RELOAD_RESET_POLICY/);

  for (const marker of [
    "InteractiveSceneEmbed",
    "reload",
    "selected scene",
    "elapsed",
    "frameIndex",
    "snippet",
    "checkpoint"
  ]) {
    assert.match(source, new RegExp(marker));
  }
});
