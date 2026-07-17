import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

type MathSceneWindowEventType = "close" | "focus" | "hide" | "resize" | "show";

type MathSceneWindowEventPlan = {
  callsWindowFocus: boolean;
  eventType: MathSceneWindowEventType;
  height: number;
  hasWindow: boolean;
  noOp: boolean;
  returnedEarly: boolean;
  sourceContract: typeof expectedWindowEventSourceContract;
  summary: string;
  width: number;
  windowEventVersion: "mais-manim-window-events/v1";
};

const expectedWindowEventSourceContract =
  "Scene.on_resize/on_show/on_hide/on_close pass hooks; Scene.focus returns without window or calls window.focus()" as const;

type MathSceneWindowEventsModule = {
  SCENE_WINDOW_EVENT_SOURCE_CONTRACT: typeof expectedWindowEventSourceContract;
  buildSceneWindowEventPlan: (input: {
    eventType: MathSceneWindowEventType;
    hasWindow?: boolean;
    height?: number;
    width?: number;
  }) => MathSceneWindowEventPlan;
  sceneWindowEventDataAttributes: (plan: MathSceneWindowEventPlan) => Record<string, string>;
  serializeSceneWindowEventPlan: (plan: MathSceneWindowEventPlan) => string;
};

const modulePath = "components/visualizations/three/manim/mathSceneWindowEvents.ts";

async function importWindowEventsModule() {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should provide a pure Scene window-event planner");
  return await import("./mathSceneWindowEvents") as MathSceneWindowEventsModule;
}

test("buildSceneWindowEventPlan records resize as a source-level no-op with sanitized dimensions", async () => {
  const { SCENE_WINDOW_EVENT_SOURCE_CONTRACT, buildSceneWindowEventPlan } = await importWindowEventsModule();
  const plan = buildSceneWindowEventPlan({
    eventType: "resize",
    height: Number.POSITIVE_INFINITY,
    width: 1280.9
  });

  assert.equal(plan.windowEventVersion, "mais-manim-window-events/v1");
  assert.equal(plan.eventType, "resize");
  assert.equal(plan.width, 1280);
  assert.equal(plan.height, 0);
  assert.equal(plan.noOp, true);
  assert.equal(plan.sourceContract, SCENE_WINDOW_EVENT_SOURCE_CONTRACT);
  assert.equal(plan.callsWindowFocus, false);
  assert.equal(plan.returnedEarly, false);
  assert.equal(plan.summary, "windowEvent:resize:noop=true:focus=false:window=true");
});

test("buildSceneWindowEventPlan records show, hide, and close as no-op event hooks", async () => {
  const { buildSceneWindowEventPlan } = await importWindowEventsModule();
  const showPlan = buildSceneWindowEventPlan({ eventType: "show" });
  const hidePlan = buildSceneWindowEventPlan({ eventType: "hide" });
  const closePlan = buildSceneWindowEventPlan({ eventType: "close" });

  assert.equal(showPlan.noOp, true);
  assert.equal(hidePlan.noOp, true);
  assert.equal(closePlan.noOp, true);
  assert.equal(showPlan.callsWindowFocus, false);
  assert.equal(hidePlan.callsWindowFocus, false);
  assert.equal(closePlan.callsWindowFocus, false);
});

test("buildSceneWindowEventPlan guards focus when no Manim window exists", async () => {
  const { buildSceneWindowEventPlan } = await importWindowEventsModule();
  const plan = buildSceneWindowEventPlan({
    eventType: "focus",
    hasWindow: false
  });

  assert.equal(plan.noOp, false);
  assert.equal(plan.hasWindow, false);
  assert.equal(plan.callsWindowFocus, false);
  assert.equal(plan.returnedEarly, true);
  assert.equal(plan.summary, "windowEvent:focus:noop=false:focus=false:window=false");
});

test("buildSceneWindowEventPlan calls window focus when focus has a window", async () => {
  const { buildSceneWindowEventPlan } = await importWindowEventsModule();
  const plan = buildSceneWindowEventPlan({
    eventType: "focus",
    hasWindow: true
  });

  assert.equal(plan.noOp, false);
  assert.equal(plan.hasWindow, true);
  assert.equal(plan.callsWindowFocus, true);
  assert.equal(plan.returnedEarly, false);
  assert.equal(plan.summary, "windowEvent:focus:noop=false:focus=true:window=true");
});

test("sceneWindowEventDataAttributes exposes stable browser QA evidence", async () => {
  const {
    SCENE_WINDOW_EVENT_SOURCE_CONTRACT,
    buildSceneWindowEventPlan,
    sceneWindowEventDataAttributes
  } = await importWindowEventsModule();
  const plan = buildSceneWindowEventPlan({
    eventType: "focus",
    hasWindow: false
  });

  assert.deepEqual(sceneWindowEventDataAttributes(plan), {
    "data-viz-manim-window-calls-focus": "false",
    "data-viz-manim-window-event-type": "focus",
    "data-viz-manim-window-has-window": "false",
    "data-viz-manim-window-height": "0",
    "data-viz-manim-window-no-op": "false",
    "data-viz-manim-window-returned-early": "true",
    "data-viz-manim-window-source-contract": SCENE_WINDOW_EVENT_SOURCE_CONTRACT,
    "data-viz-manim-window-summary": plan.summary,
    "data-viz-manim-window-width": "0"
  });
});

test("serializeSceneWindowEventPlan emits deterministic safe JSON for browser QA", async () => {
  const { buildSceneWindowEventPlan, serializeSceneWindowEventPlan } = await importWindowEventsModule();
  const resizePlan = buildSceneWindowEventPlan({
    eventType: "resize",
    hasWindow: true,
    height: 720.8,
    width: 1280.9
  });
  const focusPlan = buildSceneWindowEventPlan({
    eventType: "focus",
    hasWindow: false
  });

  const serialized = serializeSceneWindowEventPlan(resizePlan);
  const reparsed = JSON.parse(serialized) as MathSceneWindowEventPlan;

  assert.equal(
    serializeSceneWindowEventPlan(JSON.parse(JSON.stringify(resizePlan)) as MathSceneWindowEventPlan),
    serialized
  );
  assert.equal(reparsed.summary, resizePlan.summary);
  assert.equal(reparsed.width, 1280);
  assert.equal(reparsed.height, 720);
  assert.equal(JSON.parse(serializeSceneWindowEventPlan(focusPlan)).returnedEarly, true);
  assert.doesNotMatch(serialized, /undefined|NaN|Infinity|<\/script/i);
});

test("Scene window-event planner stays pure and documents the source contract", () => {
  assert.ok(fs.existsSync(modulePath), "mathSceneWindowEvents.ts should exist");
  const source = fs.readFileSync(modulePath, "utf8");

  assert.match(source, /on_resize/);
  assert.match(source, /on_show/);
  assert.match(source, /on_hide/);
  assert.match(source, /on_close/);
  assert.match(source, /focus/);
  assert.match(source, /window\.focus\(\)/);
  assert.match(source, /pass/);
  assert.match(source, /SCENE_WINDOW_EVENT_SOURCE_CONTRACT/);
  assert.match(source, /serializeSceneWindowEventPlan/);
  assert.match(source, /stableSerialize/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"|ThreeDLabCanvas/);
});
