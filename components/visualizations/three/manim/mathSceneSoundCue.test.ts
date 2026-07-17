import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

type MathSceneSoundCueStatus = "negative-time" | "scheduled" | "skip-animations";

type MathSceneSoundCueRow = {
  cueId: string;
  gain: number | null;
  gainToBackground: number | null;
  scheduledTime: number;
  soundFile: string;
  status: MathSceneSoundCueStatus;
  timeOffset: number;
};

const expectedSoundCueSourceContract =
  "Scene.add_sound|SceneFileWriter.add_sound|negative timestamp guard" as const;

type MathSceneSoundCuePlan = {
  audibleCueCount: number;
  cueCount: number;
  includesSound: boolean;
  issueCount: number;
  rows: MathSceneSoundCueRow[];
  scheduledCueIds: string;
  skippedCueCount: number;
  sourceContract: typeof expectedSoundCueSourceContract;
  summary: string;
};

type MathSceneSoundCueModule = {
  buildSceneSoundCuePlan: (input: {
    cues: Array<{
      gain?: number;
      gainToBackground?: number;
      id: string;
      sceneTime: number;
      soundFile: string;
      timeOffset?: number;
    }>;
    skipAnimations?: boolean;
  }) => MathSceneSoundCuePlan;
  sceneSoundCueDataAttributes: (plan: MathSceneSoundCuePlan) => Record<string, string>;
  serializeSceneSoundCuePlan: (plan: MathSceneSoundCuePlan) => string;
};

const modulePath = "components/visualizations/three/manim/mathSceneSoundCue.ts";

async function importSceneSoundCueModule() {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should provide a pure Scene.add_sound cue planner");
  return await import("./mathSceneSoundCue") as MathSceneSoundCueModule;
}

test("buildSceneSoundCuePlan schedules cue time as scene time plus offset", async () => {
  const { buildSceneSoundCuePlan } = await importSceneSoundCueModule();
  const plan = buildSceneSoundCuePlan({
    cues: [
      {
        gain: -3,
        gainToBackground: -8,
        id: "slope-chime",
        sceneTime: 2.25,
        soundFile: "soft-chime.wav",
        timeOffset: 0.5
      }
    ]
  });

  assert.equal(plan.cueCount, 1);
  assert.equal(plan.audibleCueCount, 1);
  assert.equal(plan.includesSound, true);
  assert.equal(plan.issueCount, 0);
  assert.equal(plan.scheduledCueIds, "slope-chime");
  assert.equal(plan.sourceContract, expectedSoundCueSourceContract);
  assert.deepEqual(plan.rows, [
    {
      cueId: "slope-chime",
      gain: -3,
      gainToBackground: -8,
      scheduledTime: 2.75,
      soundFile: "soft-chime.wav",
      status: "scheduled",
      timeOffset: 0.5
    }
  ]);
  assert.equal(plan.summary, "soundCues:total=1:audible=1:skipped=0:issues=0:ids=slope-chime");
});

test("buildSceneSoundCuePlan mirrors Scene.add_sound skip_animations guard", async () => {
  const { buildSceneSoundCuePlan } = await importSceneSoundCueModule();
  const plan = buildSceneSoundCuePlan({
    cues: [{ id: "skip-cue", sceneTime: 1, soundFile: "skip.wav" }],
    skipAnimations: true
  });

  assert.equal(plan.cueCount, 1);
  assert.equal(plan.audibleCueCount, 0);
  assert.equal(plan.includesSound, false);
  assert.equal(plan.skippedCueCount, 1);
  assert.equal(plan.rows[0].status, "skip-animations");
  assert.equal(plan.summary, "soundCues:total=1:audible=0:skipped=1:issues=0:ids=none");
});

test("buildSceneSoundCuePlan flags negative scheduled times like SceneFileWriter.add_audio_segment", async () => {
  const { buildSceneSoundCuePlan } = await importSceneSoundCueModule();
  const plan = buildSceneSoundCuePlan({
    cues: [{ id: "early-cue", sceneTime: 0.25, soundFile: "early.wav", timeOffset: -0.5 }]
  });

  assert.equal(plan.audibleCueCount, 0);
  assert.equal(plan.includesSound, false);
  assert.equal(plan.issueCount, 1);
  assert.equal(plan.rows[0].scheduledTime, -0.25);
  assert.equal(plan.rows[0].status, "negative-time");
  assert.equal(plan.summary, "soundCues:total=1:audible=0:skipped=0:issues=1:ids=none");
});

test("sceneSoundCueDataAttributes exposes stable browser QA evidence", async () => {
  const { buildSceneSoundCuePlan, sceneSoundCueDataAttributes } = await importSceneSoundCueModule();
  const plan = buildSceneSoundCuePlan({
    cues: [
      { id: "intro-cue", sceneTime: 0, soundFile: "intro.wav" },
      { id: "later-cue", sceneTime: 2, soundFile: "later.wav", timeOffset: 0.25 }
    ]
  });

  assert.deepEqual(sceneSoundCueDataAttributes(plan), {
    "data-viz-manim-sound-cue-audible-count": "2",
    "data-viz-manim-sound-cue-count": "2",
    "data-viz-manim-sound-cue-gain-summary": "intro-cue:gain=none:background=none|later-cue:gain=none:background=none",
    "data-viz-manim-sound-cue-includes-sound": "true",
    "data-viz-manim-sound-cue-issue-count": "0",
    "data-viz-manim-sound-cue-ids": "intro-cue,later-cue",
    "data-viz-manim-sound-cue-row-count": "2",
    "data-viz-manim-sound-cue-scheduled-ids": "intro-cue,later-cue",
    "data-viz-manim-sound-cue-scheduled-time-summary": "intro-cue:0.000|later-cue:2.250",
    "data-viz-manim-sound-cue-skipped-count": "0",
    "data-viz-manim-sound-cue-sound-file-count": "2",
    "data-viz-manim-sound-cue-source-contract": plan.sourceContract,
    "data-viz-manim-sound-cue-status-summary": "intro-cue:scheduled|later-cue:scheduled",
    "data-viz-manim-sound-cue-summary": "soundCues:total=2:audible=2:skipped=0:issues=0:ids=intro-cue,later-cue",
    "data-viz-manim-sound-cue-time-offset-summary": "intro-cue:0.000|later-cue:0.250"
  });
});

test("serializeSceneSoundCuePlan emits deterministic safe JSON for browser QA", async () => {
  const { buildSceneSoundCuePlan, serializeSceneSoundCuePlan } = await importSceneSoundCueModule();
  const plan = buildSceneSoundCuePlan({
    cues: [
      { id: "intro-cue", sceneTime: 0, soundFile: "intro.wav" },
      { id: "early-cue", sceneTime: 0.1, soundFile: "early.wav", timeOffset: -0.25 },
      { gain: -2, gainToBackground: -9, id: "later-cue", sceneTime: 2, soundFile: "later.wav", timeOffset: 0.25 }
    ]
  });

  const serialized = serializeSceneSoundCuePlan(plan);
  const reparsed = JSON.parse(serialized) as MathSceneSoundCuePlan;

  assert.equal(
    serializeSceneSoundCuePlan(JSON.parse(JSON.stringify(plan)) as MathSceneSoundCuePlan),
    serialized
  );
  assert.equal(reparsed.summary, plan.summary);
  assert.deepEqual(reparsed.rows.map((row) => row.status), ["scheduled", "negative-time", "scheduled"]);
  assert.equal(reparsed.rows[2]?.gainToBackground, -9);
  assert.doesNotMatch(serialized, /undefined|NaN|Infinity|<\/script/i);
});

test("Scene sound cue planner stays pure and documents the add_sound source contract", () => {
  assert.ok(fs.existsSync(modulePath), "mathSceneSoundCue.ts should exist");
  const source = fs.readFileSync(modulePath, "utf8");

  assert.match(source, /add_sound/);
  assert.match(source, /skip_animations/);
  assert.match(source, /gain_to_background/);
  assert.match(source, /Adding sound at timestamp < 0/);
  assert.match(source, /SCENE_SOUND_CUE_SOURCE_CONTRACT/);
  assert.match(source, /serializeSceneSoundCuePlan/);
  assert.match(source, /stableSerialize/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"|AudioSegment|ThreeDLabCanvas/);
});
