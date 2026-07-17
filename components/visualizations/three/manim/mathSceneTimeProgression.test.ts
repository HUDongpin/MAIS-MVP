import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  SCENE_TIME_PROGRESSION_SAMPLING_POLICY,
  SCENE_TIME_PROGRESSION_SOURCE_CONTRACT
} from "./mathSceneTimeProgression";

type MathSceneTimeProgressionMode = "sampled" | "skip-final";

type MathSceneTimeProgressionPlan = {
  description: string;
  finalTime: number;
  fps: number;
  frameInterval: number;
  mode: MathSceneTimeProgressionMode;
  nIterations: number;
  overrideSkipAnimations: boolean;
  overshootsRunTime: boolean;
  runTime: number;
  samplingPolicy: typeof SCENE_TIME_PROGRESSION_SAMPLING_POLICY;
  skipAnimations: boolean;
  sourceContract: typeof SCENE_TIME_PROGRESSION_SOURCE_CONTRACT;
  summary: string;
  times: number[];
};

type MathSceneTimeProgressionModule = {
  buildSceneTimeProgression: (input: {
    description?: string;
    fps?: number;
    nIterations?: number;
    overrideSkipAnimations?: boolean;
    runTime: number;
    skipAnimations?: boolean;
  }) => MathSceneTimeProgressionPlan;
  sceneTimeProgressionDataAttributes: (plan: MathSceneTimeProgressionPlan) => Record<string, string>;
  serializeSceneTimeProgression: (plan: MathSceneTimeProgressionPlan) => string;
};

const modulePath = "components/visualizations/three/manim/mathSceneTimeProgression.ts";

async function importSceneTimeProgressionModule() {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should provide a pure Scene.get_time_progression module");
  return await import("./mathSceneTimeProgression") as MathSceneTimeProgressionModule;
}

test("buildSceneTimeProgression samples Manim frame times from 1/fps through run_time", async () => {
  const { buildSceneTimeProgression } = await importSceneTimeProgressionModule();
  const plan = buildSceneTimeProgression({ description: "0 revealCurve", fps: 4, runTime: 1 });

  assert.deepEqual(plan.times, [0.25, 0.5, 0.75, 1]);
  assert.equal(plan.frameInterval, 0.25);
  assert.equal(plan.finalTime, 1);
  assert.equal(plan.fps, 4);
  assert.equal(plan.mode, "sampled");
  assert.equal(plan.nIterations, 4);
  assert.equal(plan.overshootsRunTime, false);
  assert.equal(plan.samplingPolicy, SCENE_TIME_PROGRESSION_SAMPLING_POLICY);
  assert.equal(plan.sourceContract, SCENE_TIME_PROGRESSION_SOURCE_CONTRACT);
  assert.equal(plan.summary, "timeProgression:sampled:run=1.000:fps=4:frames=4:final=1.000:overshoot=false");
});

test("buildSceneTimeProgression preserves Manim np.arange overshoot for non-divisible run times", async () => {
  const { buildSceneTimeProgression } = await importSceneTimeProgressionModule();
  const plan = buildSceneTimeProgression({ fps: 4, runTime: 1.1 });

  assert.deepEqual(plan.times, [0.25, 0.5, 0.75, 1, 1.25]);
  assert.equal(plan.finalTime, 1.25);
  assert.equal(plan.nIterations, 5);
  assert.equal(plan.overshootsRunTime, true);
  assert.equal(plan.summary, "timeProgression:sampled:run=1.100:fps=4:frames=5:final=1.250:overshoot=true");
});

test("buildSceneTimeProgression mirrors skip_animations unless explicitly overridden", async () => {
  const { buildSceneTimeProgression } = await importSceneTimeProgressionModule();
  const skipped = buildSceneTimeProgression({ fps: 4, runTime: 1.1, skipAnimations: true });
  const stopConditionWait = buildSceneTimeProgression({
    description: "3 Waiting",
    fps: 4,
    nIterations: -1,
    overrideSkipAnimations: true,
    runTime: 1.1,
    skipAnimations: true
  });

  assert.deepEqual(skipped.times, [1.1]);
  assert.equal(skipped.mode, "skip-final");
  assert.equal(skipped.finalTime, 1.1);
  assert.equal(skipped.nIterations, 1);
  assert.equal(skipped.summary, "timeProgression:skip-final:run=1.100:fps=4:frames=1:final=1.100:overshoot=false");

  assert.equal(stopConditionWait.mode, "sampled");
  assert.deepEqual(stopConditionWait.times, [0.25, 0.5, 0.75, 1, 1.25]);
  assert.equal(stopConditionWait.nIterations, -1);
  assert.equal(stopConditionWait.overrideSkipAnimations, true);
  assert.equal(stopConditionWait.description, "3 Waiting");
});

test("sceneTimeProgressionDataAttributes exposes stable browser QA evidence", async () => {
  const { buildSceneTimeProgression, sceneTimeProgressionDataAttributes } = await importSceneTimeProgressionModule();
  const plan = buildSceneTimeProgression({
    description: "5 Waiting",
    fps: 5,
    nIterations: -1,
    overrideSkipAnimations: true,
    runTime: 0.6,
    skipAnimations: true
  });

  assert.deepEqual(sceneTimeProgressionDataAttributes(plan), {
    "data-viz-manim-time-progression-description": "5 Waiting",
    "data-viz-manim-time-progression-final-time": "0.600",
    "data-viz-manim-time-progression-fps": "5",
    "data-viz-manim-time-progression-frame-count": "3",
    "data-viz-manim-time-progression-frame-interval": "0.200",
    "data-viz-manim-time-progression-mode": "sampled",
    "data-viz-manim-time-progression-n-iterations": "-1",
    "data-viz-manim-time-progression-override-skip": "true",
    "data-viz-manim-time-progression-overshoot": "false",
    "data-viz-manim-time-progression-run-time": "0.600",
    "data-viz-manim-time-progression-sampling-policy": SCENE_TIME_PROGRESSION_SAMPLING_POLICY,
    "data-viz-manim-time-progression-skip-animations": "true",
    "data-viz-manim-time-progression-source-contract": plan.sourceContract,
    "data-viz-manim-time-progression-summary": "timeProgression:sampled:run=0.600:fps=5:frames=3:final=0.600:overshoot=false",
    "data-viz-manim-time-progression-times-summary": "times:0.200,0.400,0.600"
  });
});

test("serializeSceneTimeProgression emits escaped deterministic browser JSON", async () => {
  const { buildSceneTimeProgression, serializeSceneTimeProgression } = await importSceneTimeProgressionModule();
  const plan = buildSceneTimeProgression({
    description: "<time-progression></script>",
    fps: 4,
    runTime: 0.5,
    skipAnimations: false
  });
  const serialized = serializeSceneTimeProgression(plan);

  assert.equal(
    serializeSceneTimeProgression(JSON.parse(JSON.stringify(plan)) as MathSceneTimeProgressionPlan),
    serialized
  );
  assert.doesNotMatch(serialized, /<time-progression>/);
  assert.doesNotMatch(serialized, /<\/script/i);
  assert.match(serialized, /\\u003ctime-progression>/);
  assert.deepEqual(JSON.parse(serialized), plan);
});

test("Scene time progression stays pure and documents the get_time_progression source contract", () => {
  assert.ok(fs.existsSync(modulePath), "mathSceneTimeProgression.ts should exist");
  const source = fs.readFileSync(modulePath, "utf8");

  assert.match(source, /get_time_progression/);
  assert.match(source, /skip_animations/);
  assert.match(source, /override_skip_animations/);
  assert.match(source, /SCENE_TIME_PROGRESSION_SAMPLING_POLICY/);
  assert.match(source, /SCENE_TIME_PROGRESSION_SOURCE_CONTRACT/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"|ThreeDLabCanvas/);
});
