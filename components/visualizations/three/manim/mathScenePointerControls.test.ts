import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import type { Vec3 } from "./mathSceneTypes";

type MathScenePointerFrameAction = "drag-pan" | "none" | "pan-2d" | "pan-3d" | "scroll-scale";
type MathScenePointerEventType =
  | "mouse-drag"
  | "mouse-motion"
  | "mouse-press"
  | "mouse-release"
  | "mouse-scroll";

type MathScenePointerControlPlan = {
  button: number | null;
  buttons: number | null;
  deltaPoint: Vec3;
  dispatchesEvent: boolean;
  eventType: MathScenePointerEventType;
  frameAction: MathScenePointerFrameAction;
  frameShift: Vec3;
  modifiers: number | null;
  mouseDragPointUpdated: boolean;
  mousePointUpdated: boolean;
  offset: Vec3;
  phiDelta: number;
  pointerControlVersion: "mais-manim-pointer-controls/v1";
  point: Vec3;
  propagationStopped: boolean;
  scaleAboutPoint: Vec3;
  scaleFactor: number;
  scrollRelativeOffset: number;
  sourceContract: string;
  summary: string;
  thetaDelta: number;
  windowAssertionSatisfied: boolean;
};

type MathScenePointerControlsModule = {
  SCENE_POINTER_CONTROL_SOURCE_CONTRACT: string;
  buildScenePointerControlPlan: (input: {
    button?: number;
    buttons?: number;
    deltaPoint?: Vec3;
    dispatcherResult?: boolean | null;
    dragToPan?: boolean;
    eventType: MathScenePointerEventType;
    fixedFrameDeltaPoint?: Vec3;
    hasWindow?: boolean;
    isPan3dKeyPressed?: boolean;
    isPanKeyPressed?: boolean;
    modifiers?: number;
    offset?: Vec3;
    panSensitivity?: number;
    pixelHeight?: number;
    point: Vec3;
    scrollSensitivity?: number;
    yPixelOffset?: number;
  }) => MathScenePointerControlPlan;
  scenePointerControlDataAttributes: (plan: MathScenePointerControlPlan) => Record<string, string>;
  serializeScenePointerControlPlan: (plan: MathScenePointerControlPlan) => string;
};

const modulePath = "components/visualizations/three/manim/mathScenePointerControls.ts";
const expectedScenePointerControlSourceContract =
  "Scene.on_mouse_*: update mouse points, dispatch EVENT_DISPATCHER, then pan/scale camera frame unless propagation stops";

async function importPointerControlsModule() {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should provide a pure Scene pointer-control planner");
  return await import("./mathScenePointerControls") as MathScenePointerControlsModule;
}

test("buildScenePointerControlPlan maps mouse motion with the 3D pan key to camera theta/phi deltas", async () => {
  const { buildScenePointerControlPlan } = await importPointerControlsModule();
  const plan = buildScenePointerControlPlan({
    deltaPoint: [0.2, -0.1, 0],
    eventType: "mouse-motion",
    fixedFrameDeltaPoint: [0.5, -0.25, 0],
    hasWindow: true,
    isPan3dKeyPressed: true,
    panSensitivity: 2,
    point: [1, 2, 0]
  });

  assert.equal(plan.pointerControlVersion, "mais-manim-pointer-controls/v1");
  assert.equal(plan.sourceContract, expectedScenePointerControlSourceContract);
  assert.equal(plan.eventType, "mouse-motion");
  assert.equal(plan.mousePointUpdated, true);
  assert.equal(plan.mouseDragPointUpdated, false);
  assert.equal(plan.dispatchesEvent, true);
  assert.equal(plan.propagationStopped, false);
  assert.equal(plan.frameAction, "pan-3d");
  assert.equal(plan.thetaDelta, -1);
  assert.equal(plan.phiDelta, -0.5);
  assert.deepEqual(plan.frameShift, [0, 0, 0]);
  assert.equal(plan.summary, "pointer:mouse-motion:action=pan-3d:stopped=false:window=true");
});

test("buildScenePointerControlPlan handles 2D pan motion and dispatcher cancellation before frame movement", async () => {
  const { buildScenePointerControlPlan } = await importPointerControlsModule();
  const panPlan = buildScenePointerControlPlan({
    deltaPoint: [0.2, -0.1, 0],
    eventType: "mouse-motion",
    hasWindow: true,
    isPanKeyPressed: true,
    point: [1, 2, 0]
  });
  const canceledPlan = buildScenePointerControlPlan({
    deltaPoint: [0.2, -0.1, 0],
    dispatcherResult: false,
    eventType: "mouse-motion",
    hasWindow: true,
    isPanKeyPressed: true,
    point: [1, 2, 0]
  });

  assert.equal(panPlan.frameAction, "pan-2d");
  assert.deepEqual(panPlan.frameShift, [-0.2, 0.1, 0]);
  assert.equal(canceledPlan.propagationStopped, true);
  assert.equal(canceledPlan.frameAction, "none");
  assert.deepEqual(canceledPlan.frameShift, [0, 0, 0]);
});

test("buildScenePointerControlPlan applies drag-to-pan before dispatch cancellation", async () => {
  const { buildScenePointerControlPlan } = await importPointerControlsModule();
  const plan = buildScenePointerControlPlan({
    buttons: 1,
    deltaPoint: [0.4, 0.3, 0],
    dispatcherResult: false,
    dragToPan: true,
    eventType: "mouse-drag",
    modifiers: 2,
    point: [2, 1, 0]
  });

  assert.equal(plan.mousePointUpdated, false);
  assert.equal(plan.mouseDragPointUpdated, true);
  assert.equal(plan.propagationStopped, true);
  assert.equal(plan.frameAction, "drag-pan");
  assert.deepEqual(plan.frameShift, [-0.4, -0.3, 0]);
  assert.equal(plan.buttons, 1);
});

test("buildScenePointerControlPlan maps press and release to dispatch-only pointer evidence", async () => {
  const { buildScenePointerControlPlan } = await importPointerControlsModule();
  const pressPlan = buildScenePointerControlPlan({
    button: 0,
    eventType: "mouse-press",
    modifiers: 1,
    point: [0, 0, 0]
  });
  const releasePlan = buildScenePointerControlPlan({
    button: 0,
    dispatcherResult: false,
    eventType: "mouse-release",
    point: [0, 0, 0]
  });

  assert.equal(pressPlan.mouseDragPointUpdated, true);
  assert.equal(pressPlan.frameAction, "none");
  assert.equal(releasePlan.mouseDragPointUpdated, false);
  assert.equal(releasePlan.propagationStopped, true);
  assert.equal(releasePlan.frameAction, "none");
});

test("buildScenePointerControlPlan maps scroll events to camera-frame scale about the pointer", async () => {
  const { buildScenePointerControlPlan } = await importPointerControlsModule();
  const scrollPlan = buildScenePointerControlPlan({
    eventType: "mouse-scroll",
    offset: [0, 3, 0],
    pixelHeight: 800,
    point: [1, 1, 0],
    scrollSensitivity: 0.3,
    yPixelOffset: 80
  });
  const canceledPlan = buildScenePointerControlPlan({
    dispatcherResult: false,
    eventType: "mouse-scroll",
    pixelHeight: 800,
    point: [1, 1, 0],
    scrollSensitivity: 0.3,
    yPixelOffset: 80
  });

  assert.equal(scrollPlan.frameAction, "scroll-scale");
  assert.equal(scrollPlan.scrollRelativeOffset, 0.1);
  assert.equal(scrollPlan.scaleFactor, 0.97);
  assert.deepEqual(scrollPlan.scaleAboutPoint, [1, 1, 0]);
  assert.equal(canceledPlan.frameAction, "none");
  assert.equal(canceledPlan.scaleFactor, 1);
});

test("scenePointerControlDataAttributes exposes stable browser QA evidence", async () => {
  const {
    SCENE_POINTER_CONTROL_SOURCE_CONTRACT,
    buildScenePointerControlPlan,
    scenePointerControlDataAttributes
  } = await importPointerControlsModule();
  const plan = buildScenePointerControlPlan({
    deltaPoint: [0.2, -0.1, 0],
    eventType: "mouse-motion",
    hasWindow: true,
    isPanKeyPressed: true,
    point: [1, 2, 0]
  });

  assert.equal(SCENE_POINTER_CONTROL_SOURCE_CONTRACT, expectedScenePointerControlSourceContract);
  assert.deepEqual(scenePointerControlDataAttributes(plan), {
    "data-viz-manim-pointer-button": "none",
    "data-viz-manim-pointer-buttons": "none",
    "data-viz-manim-pointer-control-version": "mais-manim-pointer-controls/v1",
    "data-viz-manim-pointer-delta-point": "0.200,-0.100,0.000",
    "data-viz-manim-pointer-dispatches-event": "true",
    "data-viz-manim-pointer-event-type": "mouse-motion",
    "data-viz-manim-pointer-frame-action": "pan-2d",
    "data-viz-manim-pointer-frame-shift": "-0.200,0.100,0.000",
    "data-viz-manim-pointer-modifiers": "none",
    "data-viz-manim-pointer-mouse-drag-point-updated": "false",
    "data-viz-manim-pointer-mouse-point-updated": "true",
    "data-viz-manim-pointer-offset": "0.000,0.000,0.000",
    "data-viz-manim-pointer-phi-delta": "0.000",
    "data-viz-manim-pointer-point": "1.000,2.000,0.000",
    "data-viz-manim-pointer-propagation-stopped": "false",
    "data-viz-manim-pointer-scale-about-point": "0.000,0.000,0.000",
    "data-viz-manim-pointer-scale-factor": "1.000",
    "data-viz-manim-pointer-scroll-relative-offset": "0.000",
    "data-viz-manim-pointer-source-contract": expectedScenePointerControlSourceContract,
    "data-viz-manim-pointer-summary": plan.summary,
    "data-viz-manim-pointer-theta-delta": "0.000",
    "data-viz-manim-pointer-window-ok": "true"
  });
});

test("serializeScenePointerControlPlan emits stable script-safe JSON", async () => {
  const {
    buildScenePointerControlPlan,
    serializeScenePointerControlPlan
  } = await importPointerControlsModule();
  const plan = buildScenePointerControlPlan({
    eventType: "mouse-scroll",
    offset: [0, 3, 0],
    pixelHeight: 800,
    point: [1, 1, 0],
    scrollSensitivity: 0.3,
    yPixelOffset: 80
  });
  const json = serializeScenePointerControlPlan(plan);

  assert.doesNotMatch(json, /</);
  assert.deepEqual(JSON.parse(json), {
    button: null,
    buttons: null,
    deltaPoint: [0, 0, 0],
    dispatchesEvent: true,
    eventType: "mouse-scroll",
    frameAction: "scroll-scale",
    frameShift: [0, 0, 0],
    modifiers: null,
    mouseDragPointUpdated: false,
    mousePointUpdated: false,
    offset: [0, 3, 0],
    phiDelta: 0,
    point: [1, 1, 0],
    pointerControlVersion: "mais-manim-pointer-controls/v1",
    propagationStopped: false,
    scaleAboutPoint: [1, 1, 0],
    scaleFactor: 0.97,
    scrollRelativeOffset: 0.1,
    sourceContract: expectedScenePointerControlSourceContract,
    summary: "pointer:mouse-scroll:action=scroll-scale:stopped=false:window=true",
    thetaDelta: 0,
    windowAssertionSatisfied: true
  });
});

test("Scene pointer controls stay pure and document the source contract", () => {
  assert.ok(fs.existsSync(modulePath), "mathScenePointerControls.ts should exist");
  const source = fs.readFileSync(modulePath, "utf8");

  assert.match(source, /serializeScenePointerControlPlan/);
  assert.match(source, /stableSerialize/);
  assert.match(source, /on_mouse_motion/);
  assert.match(source, /on_mouse_drag/);
  assert.match(source, /on_mouse_press/);
  assert.match(source, /on_mouse_release/);
  assert.match(source, /on_mouse_scroll/);
  assert.match(source, /EVENT_DISPATCHER/);
  assert.match(source, /mouse_point\.move_to/);
  assert.match(source, /mouse_drag_point\.move_to/);
  assert.match(source, /increment_theta/);
  assert.match(source, /increment_phi/);
  assert.match(source, /frame\.scale/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"|ThreeDLabCanvas/);
});
