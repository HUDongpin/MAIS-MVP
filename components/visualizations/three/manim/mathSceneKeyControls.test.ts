import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

type MathSceneKeyControlAction =
  | "camera-reset"
  | "dispatch-only"
  | "hold-release"
  | "quit-interaction"
  | "redo"
  | "undo"
  | "unhandled";

type MathSceneKeyControlPlan = {
  action: MathSceneKeyControlAction;
  canRedo: boolean;
  canUndo: boolean;
  dispatchesEvent: boolean;
  eventType: "key-press" | "key-release";
  finalHoldOnWait: boolean;
  finalQuitInteraction: boolean;
  key: string;
  keyControlVersion: "mais-manim-key-controls/v1";
  normalizedKey: string;
  playsCameraResetAnimation: boolean;
  preventsPropagation: boolean;
  redoRequested: boolean;
  releaseEvent: "none" | "space-or-right-arrow";
  resetKey: string;
  sourceContract: typeof expectedSceneKeyControlSourceContract;
  summary: string;
  undoRequested: boolean;
};

const expectedSceneKeyControlSourceContract =
  "Scene.on_key_press/on_key_release: dispatch EVENT_DISPATCHER, reset camera.frame, undo/redo, quit_interaction, and release hold_on_wait" as const;

type MathSceneKeyControlsModule = {
  SCENE_KEY_CONTROL_SOURCE_CONTRACT: typeof expectedSceneKeyControlSourceContract;
  buildSceneKeyControlPlan: (input: {
    canRedo?: boolean;
    canUndo?: boolean;
    commandOrCtrl?: boolean;
    eventType?: "key-press" | "key-release";
    holdOnWait?: boolean;
    key: string;
    quitInteraction?: boolean;
    quitKey?: string;
    resetKey?: string;
    shift?: boolean;
  }) => MathSceneKeyControlPlan;
  sceneKeyControlDataAttributes: (plan: MathSceneKeyControlPlan) => Record<string, string>;
  serializeSceneKeyControlPlan: (plan: MathSceneKeyControlPlan) => string;
};

const modulePath = "components/visualizations/three/manim/mathSceneKeyControls.ts";

async function importKeyControlsModule() {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should provide a pure Scene key-control planner");
  return await import("./mathSceneKeyControls") as MathSceneKeyControlsModule;
}

test("buildSceneKeyControlPlan maps the reset key to a camera-frame reset animation", async () => {
  const { buildSceneKeyControlPlan } = await importKeyControlsModule();
  const plan = buildSceneKeyControlPlan({
    key: "r",
    resetKey: "r"
  });

  assert.equal(plan.keyControlVersion, "mais-manim-key-controls/v1");
  assert.equal(plan.sourceContract, expectedSceneKeyControlSourceContract);
  assert.equal(plan.eventType, "key-press");
  assert.equal(plan.normalizedKey, "r");
  assert.equal(plan.action, "camera-reset");
  assert.equal(plan.playsCameraResetAnimation, true);
  assert.equal(plan.dispatchesEvent, true);
  assert.equal(plan.finalQuitInteraction, false);
  assert.equal(plan.summary, "keyControl:key-press:r:action=camera-reset:quit=false:hold=true");
});

test("buildSceneKeyControlPlan maps undo and redo shortcuts through scene history availability", async () => {
  const { buildSceneKeyControlPlan } = await importKeyControlsModule();
  const undoPlan = buildSceneKeyControlPlan({
    canUndo: true,
    commandOrCtrl: true,
    key: "z"
  });
  const redoPlan = buildSceneKeyControlPlan({
    canRedo: true,
    canUndo: true,
    commandOrCtrl: true,
    key: "Z",
    shift: true
  });
  const unavailableUndoPlan = buildSceneKeyControlPlan({
    canUndo: false,
    commandOrCtrl: true,
    key: "z"
  });

  assert.equal(undoPlan.action, "undo");
  assert.equal(undoPlan.undoRequested, true);
  assert.equal(undoPlan.redoRequested, false);
  assert.equal(redoPlan.action, "redo");
  assert.equal(redoPlan.undoRequested, false);
  assert.equal(redoPlan.redoRequested, true);
  assert.equal(unavailableUndoPlan.action, "unhandled");
});

test("buildSceneKeyControlPlan maps quit and presenter-hold release keys", async () => {
  const { buildSceneKeyControlPlan } = await importKeyControlsModule();
  const quitPlan = buildSceneKeyControlPlan({
    commandOrCtrl: true,
    key: "q",
    quitInteraction: false
  });
  const spaceReleasePlan = buildSceneKeyControlPlan({
    holdOnWait: true,
    key: " "
  });
  const rightReleasePlan = buildSceneKeyControlPlan({
    holdOnWait: true,
    key: "Right"
  });

  assert.equal(quitPlan.action, "quit-interaction");
  assert.equal(quitPlan.finalQuitInteraction, true);
  assert.equal(spaceReleasePlan.action, "hold-release");
  assert.equal(spaceReleasePlan.finalHoldOnWait, false);
  assert.equal(spaceReleasePlan.releaseEvent, "space-or-right-arrow");
  assert.equal(rightReleasePlan.action, "hold-release");
  assert.equal(rightReleasePlan.finalHoldOnWait, false);
});

test("buildSceneKeyControlPlan treats key releases as dispatch-only event evidence", async () => {
  const { buildSceneKeyControlPlan } = await importKeyControlsModule();
  const plan = buildSceneKeyControlPlan({
    eventType: "key-release",
    key: "r"
  });

  assert.equal(plan.action, "dispatch-only");
  assert.equal(plan.dispatchesEvent, true);
  assert.equal(plan.playsCameraResetAnimation, false);
  assert.equal(plan.preventsPropagation, false);
});

test("sceneKeyControlDataAttributes exposes stable browser QA evidence", async () => {
  const {
    SCENE_KEY_CONTROL_SOURCE_CONTRACT,
    buildSceneKeyControlPlan,
    sceneKeyControlDataAttributes
  } = await importKeyControlsModule();
  const plan = buildSceneKeyControlPlan({
    commandOrCtrl: true,
    key: "q",
    quitInteraction: false
  });

  assert.equal(SCENE_KEY_CONTROL_SOURCE_CONTRACT, expectedSceneKeyControlSourceContract);
  assert.deepEqual(sceneKeyControlDataAttributes(plan), {
    "data-viz-manim-key-action": "quit-interaction",
    "data-viz-manim-key-can-redo": "false",
    "data-viz-manim-key-can-undo": "false",
    "data-viz-manim-key-dispatches-event": "true",
    "data-viz-manim-key-event-type": "key-press",
    "data-viz-manim-key-final-hold-on-wait": "true",
    "data-viz-manim-key-final-quit-interaction": "true",
    "data-viz-manim-key-key": "q",
    "data-viz-manim-key-plays-camera-reset": "false",
    "data-viz-manim-key-prevents-propagation": "false",
    "data-viz-manim-key-redo-requested": "false",
    "data-viz-manim-key-release-event": "none",
    "data-viz-manim-key-reset-key": "r",
    "data-viz-manim-key-source-contract": expectedSceneKeyControlSourceContract,
    "data-viz-manim-key-summary": plan.summary,
    "data-viz-manim-key-undo-requested": "false"
  });
});

test("serializeSceneKeyControlPlan emits deterministic safe JSON for browser QA", async () => {
  const { buildSceneKeyControlPlan, serializeSceneKeyControlPlan } = await importKeyControlsModule();
  const resetPlan = buildSceneKeyControlPlan({
    canRedo: true,
    canUndo: true,
    key: "r",
    resetKey: "r"
  });
  const quitPlan = buildSceneKeyControlPlan({
    commandOrCtrl: true,
    key: "q",
    quitInteraction: false
  });

  const serialized = serializeSceneKeyControlPlan(resetPlan);
  const reparsed = JSON.parse(serialized) as MathSceneKeyControlPlan;

  assert.equal(
    serializeSceneKeyControlPlan(JSON.parse(JSON.stringify(resetPlan)) as MathSceneKeyControlPlan),
    serialized
  );
  assert.equal(reparsed.summary, resetPlan.summary);
  assert.equal(reparsed.action, "camera-reset");
  assert.equal(reparsed.playsCameraResetAnimation, true);
  assert.equal(JSON.parse(serializeSceneKeyControlPlan(quitPlan)).finalQuitInteraction, true);
  assert.doesNotMatch(serialized, /undefined|NaN|Infinity|<\/script/i);
});

test("Scene key controls stay pure and document the source contract", () => {
  assert.ok(fs.existsSync(modulePath), "mathSceneKeyControls.ts should exist");
  const source = fs.readFileSync(modulePath, "utf8");

  assert.match(source, /on_key_press/);
  assert.match(source, /on_key_release/);
  assert.match(source, /EVENT_DISPATCHER/);
  assert.match(source, /to_default_state/);
  assert.match(source, /undo\(\)/);
  assert.match(source, /redo\(\)/);
  assert.match(source, /quit_interaction = True/);
  assert.match(source, /hold_on_wait = False/);
  assert.match(source, /SCENE_KEY_CONTROL_SOURCE_CONTRACT/);
  assert.match(source, /serializeSceneKeyControlPlan/);
  assert.match(source, /stableSerialize/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"|ThreeDLabCanvas/);
});
