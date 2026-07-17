import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildSceneInteractLoopPlan, type MathSceneInteractLoopPlan } from "./mathSceneInteractLoop";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";
import { buildMathSceneRunLifecyclePlan, type MathSceneRunLifecyclePlan } from "./mathSceneRunLifecycle";
import type { MathSceneSpec } from "./mathSceneTypes";

type MathSceneRunInteractBridgeStatus =
  | "interact-complete"
  | "interact-skipped"
  | "loop-active"
  | "quit-requested"
  | "returned-no-window"
  | "waiting-for-interact"
  | "window-closing";

type MathSceneRunInteractBridgePlan = {
  activePhase: MathSceneRunLifecyclePlan["activePhase"];
  callOrderSummary: string;
  callsInteract: boolean;
  interactEnabled: boolean;
  interactStatePolicy: string;
  interactTermination: MathSceneInteractLoopPlan["termination"];
  loopFrameCount: number;
  loopHasWindow: boolean;
  readyForTearDown: boolean;
  sceneId: string;
  sourceContract: string;
  status: MathSceneRunInteractBridgeStatus;
  summary: string;
  updateFrameCallCount: number;
  version: "mais-manim-scene-run-interact-bridge/v1";
};

type MathSceneRunInteractBridgeModule = {
  SCENE_RUN_INTERACT_BRIDGE_SOURCE_CONTRACT: string;
  buildSceneRunInteractBridgePlan: (input: {
    interactLoopPlan: MathSceneInteractLoopPlan;
    sceneRunLifecycle: MathSceneRunLifecyclePlan;
  }) => MathSceneRunInteractBridgePlan;
  sceneRunInteractBridgeDataAttributes: (plan: MathSceneRunInteractBridgePlan) => Record<string, string>;
  serializeSceneRunInteractBridgePlan: (plan: MathSceneRunInteractBridgePlan) => string;
};

const modulePath = "components/visualizations/three/manim/mathSceneRunInteractBridge.ts";
const expectedSourceContract =
  "Scene.run optional interact calls Scene.interact; no-window returns immediately, otherwise the interact loop gates tear_down";

function buildFunctionGraphSpec(): MathSceneSpec {
  const spec = buildMathSceneSpecForThreeDFamily({
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

  if (!spec) throw new Error("expected function graph MAIS Manim spec");
  return spec;
}

function sceneRun(scene: MathSceneSpec, options: { elapsedSeconds?: number; interactEnabled?: boolean; tearDownRequested?: boolean } = {}) {
  return buildMathSceneRunLifecyclePlan({
    elapsedSeconds: options.elapsedSeconds ?? 999,
    interactEnabled: options.interactEnabled ?? true,
    scene,
    sceneSignature: "fnv1a-scene",
    tearDownRequested: options.tearDownRequested ?? false
  });
}

async function importBridgeModule() {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should provide a pure Scene.run/Scene.interact bridge module");
  return (await import("./mathSceneRunInteractBridge")) as MathSceneRunInteractBridgeModule;
}

test("Scene.run/interact bridge returns immediately when Scene.interact has no window", async () => {
  const {
    SCENE_RUN_INTERACT_BRIDGE_SOURCE_CONTRACT,
    buildSceneRunInteractBridgePlan
  } = await importBridgeModule();
  const scene = buildFunctionGraphSpec();
  const interactLoopPlan = buildSceneInteractLoopPlan({
    hasWindow: false,
    initialSceneTimeSeconds: 10.84,
    initialSkipAnimations: true,
    maxFrames: 4
  });
  const plan = buildSceneRunInteractBridgePlan({
    interactLoopPlan,
    sceneRunLifecycle: sceneRun(scene)
  });

  assert.equal(SCENE_RUN_INTERACT_BRIDGE_SOURCE_CONTRACT, expectedSourceContract);
  assert.equal(plan.sourceContract, SCENE_RUN_INTERACT_BRIDGE_SOURCE_CONTRACT);
  assert.equal(plan.version, "mais-manim-scene-run-interact-bridge/v1");
  assert.equal(plan.sceneId, scene.sceneId);
  assert.equal(plan.activePhase, "interact");
  assert.equal(plan.interactEnabled, true);
  assert.equal(plan.callsInteract, true);
  assert.equal(plan.loopHasWindow, false);
  assert.equal(plan.loopFrameCount, 0);
  assert.equal(plan.updateFrameCallCount, 0);
  assert.equal(plan.interactTermination, "no-window");
  assert.equal(plan.status, "returned-no-window");
  assert.equal(plan.readyForTearDown, true);
  assert.equal(plan.callOrderSummary, "setup>construct>play>interact(no-window)>tear_down-ready");
  assert.equal(
    plan.summary,
    "scene-run-interact:mais-manim-function-graph:phase=interact:termination=no-window:status=returned-no-window:teardown=true"
  );
});

test("Scene.run/interact bridge keeps tear_down gated while the window loop is still active", async () => {
  const { buildSceneRunInteractBridgePlan } = await importBridgeModule();
  const scene = buildFunctionGraphSpec();
  const interactLoopPlan = buildSceneInteractLoopPlan({
    fps: 4,
    hasWindow: true,
    initialSceneTimeSeconds: 10.84,
    initialSkipAnimations: true,
    maxFrames: 3,
    renderGroupIds: ["axes", "function-curve"]
  });
  const plan = buildSceneRunInteractBridgePlan({
    interactLoopPlan,
    sceneRunLifecycle: sceneRun(scene)
  });

  assert.equal(plan.activePhase, "interact");
  assert.equal(plan.callsInteract, true);
  assert.equal(plan.loopHasWindow, true);
  assert.equal(plan.loopFrameCount, 3);
  assert.equal(plan.updateFrameCallCount, 3);
  assert.equal(plan.interactTermination, "max-frames");
  assert.equal(plan.status, "loop-active");
  assert.equal(plan.readyForTearDown, false);
  assert.equal(plan.callOrderSummary, "setup>construct>play>interact(loop-active)");
});

test("Scene.run/interact bridge marks quit and window-close terminations ready for tear_down", async () => {
  const { buildSceneRunInteractBridgePlan } = await importBridgeModule();
  const scene = buildFunctionGraphSpec();
  const quit = buildSceneRunInteractBridgePlan({
    interactLoopPlan: buildSceneInteractLoopPlan({ hasWindow: true, maxFrames: 4, quitInteractionAtFrame: 1 }),
    sceneRunLifecycle: sceneRun(scene)
  });
  const closed = buildSceneRunInteractBridgePlan({
    interactLoopPlan: buildSceneInteractLoopPlan({ hasWindow: true, maxFrames: 4, windowClosesAtFrame: 2 }),
    sceneRunLifecycle: sceneRun(scene)
  });

  assert.equal(quit.status, "quit-requested");
  assert.equal(quit.readyForTearDown, true);
  assert.equal(quit.callOrderSummary, "setup>construct>play>interact(quit-interaction)>tear_down-ready");
  assert.equal(closed.status, "window-closing");
  assert.equal(closed.readyForTearDown, true);
  assert.equal(closed.callOrderSummary, "setup>construct>play>interact(window-closing)>tear_down-ready");
});

test("Scene.run/interact bridge reports skipped and already-complete interact phases", async () => {
  const { buildSceneRunInteractBridgePlan } = await importBridgeModule();
  const scene = buildFunctionGraphSpec();
  const interactLoopPlan = buildSceneInteractLoopPlan({ hasWindow: false });
  const skipped = buildSceneRunInteractBridgePlan({
    interactLoopPlan,
    sceneRunLifecycle: sceneRun(scene, { interactEnabled: false })
  });
  const complete = buildSceneRunInteractBridgePlan({
    interactLoopPlan,
    sceneRunLifecycle: sceneRun(scene, { tearDownRequested: true })
  });

  assert.equal(skipped.status, "interact-skipped");
  assert.equal(skipped.callsInteract, false);
  assert.equal(skipped.readyForTearDown, true);
  assert.equal(skipped.callOrderSummary, "setup>construct>play>interact-skipped>tear_down-ready");
  assert.equal(complete.status, "interact-complete");
  assert.equal(complete.callsInteract, false);
  assert.equal(complete.readyForTearDown, true);
  assert.equal(complete.callOrderSummary, "setup>construct>play>interact>tear_down>interact-complete");
});

test("Scene.run/interact bridge exposes stable browser QA data and safe JSON", async () => {
  const {
    SCENE_RUN_INTERACT_BRIDGE_SOURCE_CONTRACT,
    buildSceneRunInteractBridgePlan,
    sceneRunInteractBridgeDataAttributes,
    serializeSceneRunInteractBridgePlan
  } = await importBridgeModule();
  const scene = buildFunctionGraphSpec();
  const plan = buildSceneRunInteractBridgePlan({
    interactLoopPlan: buildSceneInteractLoopPlan({ hasWindow: false }),
    sceneRunLifecycle: sceneRun(scene)
  });

  assert.deepEqual(sceneRunInteractBridgeDataAttributes(plan), {
    "data-viz-manim-scene-run-interact-active-phase": "interact",
    "data-viz-manim-scene-run-interact-call-order": "setup>construct>play>interact(no-window)>tear_down-ready",
    "data-viz-manim-scene-run-interact-calls-interact": "true",
    "data-viz-manim-scene-run-interact-enabled": "true",
    "data-viz-manim-scene-run-interact-loop-frame-count": "0",
    "data-viz-manim-scene-run-interact-loop-has-window": "false",
    "data-viz-manim-scene-run-interact-ready-for-teardown": "true",
    "data-viz-manim-scene-run-interact-scene-id": scene.sceneId,
    "data-viz-manim-scene-run-interact-source-contract": SCENE_RUN_INTERACT_BRIDGE_SOURCE_CONTRACT,
    "data-viz-manim-scene-run-interact-state-policy": plan.interactStatePolicy,
    "data-viz-manim-scene-run-interact-status": "returned-no-window",
    "data-viz-manim-scene-run-interact-summary": plan.summary,
    "data-viz-manim-scene-run-interact-termination": "no-window",
    "data-viz-manim-scene-run-interact-update-frame-count": "0"
  });

  const serialized = serializeSceneRunInteractBridgePlan({
    ...plan,
    sceneId: "scene-</script>"
  });

  assert.ok(!serialized.includes("</script>"));
  assert.ok(serialized.includes("\\u003c/script>"));
});
