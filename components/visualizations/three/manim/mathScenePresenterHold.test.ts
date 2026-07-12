import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

type MathScenePresenterHoldMode = "ordinary-wait" | "presenter-hold";

type MathScenePresenterHoldPlan = {
  finalHoldOnWait: boolean;
  frameInterval: number;
  frameTimes: number[];
  holdDuration: number;
  holdFrameCount: number;
  ignorePresenterMode: boolean;
  initialHoldOnWait: boolean;
  mode: MathScenePresenterHoldMode;
  note: string;
  noteLogged: boolean;
  presenterMode: boolean;
  releaseAfterFrames: number;
  releaseEvent: "none" | "space-or-right-arrow";
  shouldUseTimelineWait: boolean;
  skipAnimations: boolean;
  sourceContract: string;
  summary: string;
  version: "mais-manim-presenter-hold/v1";
};

type MathScenePresenterHoldModule = {
  SCENE_PRESENTER_HOLD_SOURCE_CONTRACT: string;
  buildScenePresenterHoldPlan: (input: {
    fps?: number;
    holdOnWait?: boolean;
    ignorePresenterMode?: boolean;
    note?: string;
    presenterMode?: boolean;
    releaseAfterFrames?: number;
    skipAnimations?: boolean;
  }) => MathScenePresenterHoldPlan;
  scenePresenterHoldDataAttributes: (plan: MathScenePresenterHoldPlan) => Record<string, string>;
  serializeScenePresenterHoldPlan: (plan: MathScenePresenterHoldPlan) => string;
};

const modulePath = "components/visualizations/three/manim/mathScenePresenterHold.ts";
const expectedScenePresenterHoldSourceContract =
  "Scene.wait presenter mode: log note, hold_loop update_frame(1/fps) until space/right release, then restore hold_on_wait";

async function importPresenterHoldModule() {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should provide a pure presenter-mode hold-loop module");
  return (await import("./mathScenePresenterHold")) as MathScenePresenterHoldModule;
}

test("buildScenePresenterHoldPlan enters hold_loop for presenter waits until a release event", async () => {
  const { buildScenePresenterHoldPlan } = await importPresenterHoldModule();
  const plan = buildScenePresenterHoldPlan({
    fps: 4,
    holdOnWait: true,
    note: "pause for question",
    presenterMode: true,
    releaseAfterFrames: 3,
    skipAnimations: false
  });

  assert.equal(plan.version, "mais-manim-presenter-hold/v1");
  assert.equal(plan.sourceContract, expectedScenePresenterHoldSourceContract);
  assert.equal(plan.mode, "presenter-hold");
  assert.equal(plan.presenterMode, true);
  assert.equal(plan.skipAnimations, false);
  assert.equal(plan.ignorePresenterMode, false);
  assert.equal(plan.initialHoldOnWait, true);
  assert.equal(plan.finalHoldOnWait, true);
  assert.equal(plan.shouldUseTimelineWait, false);
  assert.equal(plan.releaseAfterFrames, 3);
  assert.equal(plan.releaseEvent, "space-or-right-arrow");
  assert.equal(plan.frameInterval, 0.25);
  assert.deepEqual(plan.frameTimes, [0.25, 0.5, 0.75]);
  assert.equal(plan.holdFrameCount, 3);
  assert.equal(plan.holdDuration, 0.75);
  assert.equal(plan.noteLogged, true);
  assert.equal(plan.note, "pause for question");
  assert.equal(
    plan.summary,
    "presenterHold:mode=presenter-hold:frames=3:duration=0.750:released=space-or-right-arrow:timelineWait=false:note=true"
  );
});

test("buildScenePresenterHoldPlan falls back to timeline wait when ignored, skipped, or not presenting", async () => {
  const { buildScenePresenterHoldPlan } = await importPresenterHoldModule();
  const ignored = buildScenePresenterHoldPlan({
    holdOnWait: true,
    ignorePresenterMode: true,
    presenterMode: true,
    releaseAfterFrames: 2
  });
  const skipped = buildScenePresenterHoldPlan({
    holdOnWait: true,
    presenterMode: true,
    releaseAfterFrames: 2,
    skipAnimations: true
  });
  const ordinary = buildScenePresenterHoldPlan({
    holdOnWait: true,
    presenterMode: false,
    releaseAfterFrames: 2
  });

  assert.equal(ignored.mode, "ordinary-wait");
  assert.equal(ignored.ignorePresenterMode, true);
  assert.equal(ignored.shouldUseTimelineWait, true);
  assert.equal(ignored.holdFrameCount, 0);
  assert.equal(ignored.noteLogged, false);

  assert.equal(skipped.mode, "ordinary-wait");
  assert.equal(skipped.skipAnimations, true);
  assert.equal(skipped.shouldUseTimelineWait, true);

  assert.equal(ordinary.mode, "ordinary-wait");
  assert.equal(ordinary.presenterMode, false);
  assert.equal(ordinary.summary, "presenterHold:mode=ordinary-wait:frames=0:duration=0.000:released=none:timelineWait=true:note=false");
});

test("buildScenePresenterHoldPlan treats an already released hold_on_wait as a zero-frame presenter wait", async () => {
  const { buildScenePresenterHoldPlan } = await importPresenterHoldModule();
  const plan = buildScenePresenterHoldPlan({
    fps: 30,
    holdOnWait: false,
    presenterMode: true,
    releaseAfterFrames: 10
  });

  assert.equal(plan.mode, "presenter-hold");
  assert.equal(plan.initialHoldOnWait, false);
  assert.equal(plan.finalHoldOnWait, true);
  assert.equal(plan.releaseEvent, "space-or-right-arrow");
  assert.equal(plan.holdFrameCount, 0);
  assert.deepEqual(plan.frameTimes, []);
});

test("scenePresenterHoldDataAttributes exposes stable browser QA evidence", async () => {
  const {
    SCENE_PRESENTER_HOLD_SOURCE_CONTRACT,
    buildScenePresenterHoldPlan,
    scenePresenterHoldDataAttributes
  } = await importPresenterHoldModule();
  const plan = buildScenePresenterHoldPlan({
    fps: 5,
    holdOnWait: true,
    note: "teacher pause",
    presenterMode: true,
    releaseAfterFrames: 2
  });

  assert.equal(SCENE_PRESENTER_HOLD_SOURCE_CONTRACT, expectedScenePresenterHoldSourceContract);
  assert.deepEqual(scenePresenterHoldDataAttributes(plan), {
    "data-viz-manim-presenter-hold-duration": "0.400",
    "data-viz-manim-presenter-hold-final-hold-on-wait": "true",
    "data-viz-manim-presenter-hold-frame-count": "2",
    "data-viz-manim-presenter-hold-ignore": "false",
    "data-viz-manim-presenter-hold-mode": "presenter-hold",
    "data-viz-manim-presenter-hold-note-logged": "true",
    "data-viz-manim-presenter-hold-presenter-mode": "true",
    "data-viz-manim-presenter-hold-release-event": "space-or-right-arrow",
    "data-viz-manim-presenter-hold-should-use-timeline-wait": "false",
    "data-viz-manim-presenter-hold-skip-animations": "false",
    "data-viz-manim-presenter-hold-source-contract": expectedScenePresenterHoldSourceContract,
    "data-viz-manim-presenter-hold-summary": plan.summary
  });
});

test("serializeScenePresenterHoldPlan emits deterministic script-safe hold-loop JSON", async () => {
  const { buildScenePresenterHoldPlan, serializeScenePresenterHoldPlan } = await importPresenterHoldModule();
  const plan = buildScenePresenterHoldPlan({
    fps: 5,
    holdOnWait: true,
    note: "<teacher-pause>",
    presenterMode: true,
    releaseAfterFrames: 2
  });
  const serialized = serializeScenePresenterHoldPlan(plan);
  const parsed = JSON.parse(serialized) as MathScenePresenterHoldPlan;

  assert.equal(serializeScenePresenterHoldPlan(JSON.parse(JSON.stringify(plan)) as MathScenePresenterHoldPlan), serialized);
  assert.equal(parsed.version, "mais-manim-presenter-hold/v1");
  assert.equal(parsed.note, "<teacher-pause>");
  assert.deepEqual(parsed.frameTimes, [0.2, 0.4]);
  assert.equal(parsed.releaseEvent, "space-or-right-arrow");
  assert.doesNotMatch(serialized, /<teacher-pause>|<\/script|undefined|NaN|Infinity/i);
  assert.match(serialized, /\\u003cteacher-pause>/);
});

test("Scene presenter hold stays pure and documents the wait/hold_loop source contract", () => {
  assert.ok(fs.existsSync(modulePath), "mathScenePresenterHold.ts should exist");
  const source = fs.readFileSync(modulePath, "utf8");

  assert.match(source, /presenter_mode/);
  assert.match(source, /hold_loop/);
  assert.match(source, /hold_on_wait/);
  assert.match(source, /ignore_presenter_mode/);
  assert.match(source, /Space or right arrow/);
  assert.match(source, /serializeScenePresenterHoldPlan/);
  assert.match(source, /stableSerialize/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"|\bdocument\b|setTimeout|requestAnimationFrame/);
  assert.doesNotMatch(source, /\bwindow(?:\.|\[|\s|;|,|\))/);
});
