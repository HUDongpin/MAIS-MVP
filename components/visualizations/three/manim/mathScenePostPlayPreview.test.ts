import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

type MathScenePostPlayPreviewRow = {
  actionSummary: string;
  forceDraw: boolean;
  hasWindow: boolean;
  numPlaysAfter: number;
  numPlaysBefore: number;
  playIndex: number;
  previewDtSeconds: number;
  previewWhileSkipping: boolean;
  shouldEndAnimation: boolean;
  shouldForcePreviewFrame: boolean;
  skipAnimations: boolean;
};

type MathScenePostPlayPreviewPlan = {
  endedAnimationCount: number;
  forcedPreviewCount: number;
  hasWindow: boolean;
  numPlaysReady: boolean;
  numPlaysSequence: string;
  playCount: number;
  previewPolicy: string;
  previewWhileSkipping: boolean;
  rows: MathScenePostPlayPreviewRow[];
  skipAnimations: boolean;
  sourceContract: string;
  summary: string;
  version: "mais-manim-post-play-preview/v1";
};

type MathScenePostPlayPreviewModule = {
  SCENE_POST_PLAY_PREVIEW_POLICY: string;
  SCENE_POST_PLAY_SOURCE_CONTRACT: string;
  buildScenePostPlayPreviewPlan: (input: {
    hasWindow?: boolean;
    playCount: number;
    previewWhileSkipping?: boolean;
    skipAnimations?: boolean;
    startNumPlays?: number;
  }) => MathScenePostPlayPreviewPlan;
  scenePostPlayPreviewDataAttributes: (plan: MathScenePostPlayPreviewPlan) => Record<string, string>;
  serializeScenePostPlayPreviewPlan: (plan: MathScenePostPlayPreviewPlan) => string;
};

const modulePath = "components/visualizations/three/manim/mathScenePostPlayPreview.ts";

async function importPostPlayPreviewModule() {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should provide a pure Scene.post_play preview module");
  return (await import("./mathScenePostPlayPreview")) as MathScenePostPlayPreviewModule;
}

test("buildScenePostPlayPreviewPlan mirrors preview_while_skipping force-draw behavior", async () => {
  const {
    SCENE_POST_PLAY_PREVIEW_POLICY,
    SCENE_POST_PLAY_SOURCE_CONTRACT,
    buildScenePostPlayPreviewPlan
  } = await importPostPlayPreviewModule();
  const plan = buildScenePostPlayPreviewPlan({
    hasWindow: true,
    playCount: 3,
    previewWhileSkipping: true,
    skipAnimations: true,
    startNumPlays: 4
  });

  assert.equal(plan.version, "mais-manim-post-play-preview/v1");
  assert.equal(plan.sourceContract, SCENE_POST_PLAY_SOURCE_CONTRACT);
  assert.equal(plan.previewPolicy, SCENE_POST_PLAY_PREVIEW_POLICY);
  assert.match(plan.sourceContract, /Scene\.post_play/);
  assert.match(plan.sourceContract, /end_animation/);
  assert.match(plan.sourceContract, /update_frame/);
  assert.match(plan.previewPolicy, /preview-while-skipping/);
  assert.match(plan.previewPolicy, /force-draw/);
  assert.equal(plan.hasWindow, true);
  assert.equal(plan.previewWhileSkipping, true);
  assert.equal(plan.skipAnimations, true);
  assert.equal(plan.playCount, 3);
  assert.equal(plan.forcedPreviewCount, 3);
  assert.equal(plan.endedAnimationCount, 0);
  assert.equal(plan.numPlaysReady, true);
  assert.equal(plan.numPlaysSequence, "4->5|5->6|6->7");
  assert.deepEqual(plan.rows.map((row) => row.actionSummary), [
    "force-preview-frame",
    "force-preview-frame",
    "force-preview-frame"
  ]);
  assert.deepEqual(plan.rows.map((row) => row.numPlaysAfter), [5, 6, 7]);
  assert.ok(plan.rows.every((row) => row.forceDraw));
  assert.ok(plan.rows.every((row) => row.previewDtSeconds === 0));
  assert.ok(plan.rows.every((row) => row.shouldForcePreviewFrame));
  assert.ok(plan.rows.every((row) => !row.shouldEndAnimation));
  assert.equal(
    plan.summary,
    "postPlayPreview:plays=3:forced=3:endAnimation=0:skip=true:preview=true:window=true"
  );
});

test("buildScenePostPlayPreviewPlan ends movie segments for non-skipped animations", async () => {
  const { buildScenePostPlayPreviewPlan } = await importPostPlayPreviewModule();
  const plan = buildScenePostPlayPreviewPlan({
    hasWindow: true,
    playCount: 2,
    previewWhileSkipping: true,
    skipAnimations: false
  });

  assert.equal(plan.forcedPreviewCount, 0);
  assert.equal(plan.endedAnimationCount, 2);
  assert.equal(plan.numPlaysReady, true);
  assert.equal(plan.numPlaysSequence, "0->1|1->2");
  assert.deepEqual(plan.rows.map((row) => row.actionSummary), ["end-animation", "end-animation"]);
  assert.ok(plan.rows.every((row) => row.shouldEndAnimation));
  assert.ok(plan.rows.every((row) => !row.shouldForcePreviewFrame));
});

test("buildScenePostPlayPreviewPlan stays idle when skipped previews lack a window or preview flag", async () => {
  const { buildScenePostPlayPreviewPlan } = await importPostPlayPreviewModule();
  const noWindow = buildScenePostPlayPreviewPlan({
    hasWindow: false,
    playCount: 2,
    previewWhileSkipping: true,
    skipAnimations: true
  });
  const noPreview = buildScenePostPlayPreviewPlan({
    hasWindow: true,
    playCount: 2,
    previewWhileSkipping: false,
    skipAnimations: true
  });

  assert.equal(noWindow.forcedPreviewCount, 0);
  assert.deepEqual(noWindow.rows.map((row) => row.actionSummary), ["none", "none"]);
  assert.equal(noWindow.summary, "postPlayPreview:plays=2:forced=0:endAnimation=0:skip=true:preview=true:window=false");

  assert.equal(noPreview.forcedPreviewCount, 0);
  assert.deepEqual(noPreview.rows.map((row) => row.actionSummary), ["none", "none"]);
  assert.equal(noPreview.summary, "postPlayPreview:plays=2:forced=0:endAnimation=0:skip=true:preview=false:window=true");
});

test("scenePostPlayPreviewDataAttributes exposes stable browser QA evidence", async () => {
  const {
    SCENE_POST_PLAY_PREVIEW_POLICY,
    SCENE_POST_PLAY_SOURCE_CONTRACT,
    buildScenePostPlayPreviewPlan,
    scenePostPlayPreviewDataAttributes
  } = await importPostPlayPreviewModule();
  const plan = buildScenePostPlayPreviewPlan({
    hasWindow: true,
    playCount: 2,
    previewWhileSkipping: true,
    skipAnimations: true,
    startNumPlays: 1
  });

  assert.deepEqual(scenePostPlayPreviewDataAttributes(plan), {
    "data-viz-manim-post-play-preview-end-animation-count": "0",
    "data-viz-manim-post-play-preview-forced-count": "2",
    "data-viz-manim-post-play-preview-has-window": "true",
    "data-viz-manim-post-play-preview-num-plays-ready": "true",
    "data-viz-manim-post-play-preview-num-plays-sequence": "1->2|2->3",
    "data-viz-manim-post-play-preview-play-count": "2",
    "data-viz-manim-post-play-preview-policy": SCENE_POST_PLAY_PREVIEW_POLICY,
    "data-viz-manim-post-play-preview-preview": "true",
    "data-viz-manim-post-play-preview-skip": "true",
    "data-viz-manim-post-play-preview-source-contract": SCENE_POST_PLAY_SOURCE_CONTRACT,
    "data-viz-manim-post-play-preview-summary": plan.summary
  });
});

test("serializeScenePostPlayPreviewPlan emits escaped deterministic browser JSON", async () => {
  const {
    buildScenePostPlayPreviewPlan,
    serializeScenePostPlayPreviewPlan
  } = await importPostPlayPreviewModule();
  const plan = buildScenePostPlayPreviewPlan({
    hasWindow: true,
    playCount: 2,
    previewWhileSkipping: true,
    skipAnimations: true
  });
  const unsafePlan = {
    ...plan,
    summary: `${plan.summary}:<post-play-preview>`
  };

  const serialized = serializeScenePostPlayPreviewPlan(unsafePlan);

  assert.equal(
    serializeScenePostPlayPreviewPlan(JSON.parse(JSON.stringify(unsafePlan)) as MathScenePostPlayPreviewPlan),
    serialized
  );
  assert.doesNotMatch(serialized, /<post-play-preview>|<\/script/i);
  assert.match(serialized, /\\u003cpost-play-preview>/);
  assert.deepEqual(JSON.parse(serialized), unsafePlan);
});

test("Scene post-play preview stays pure and documents the post_play source contract", () => {
  assert.ok(fs.existsSync(modulePath), "mathScenePostPlayPreview.ts should exist");
  const source = fs.readFileSync(modulePath, "utf8");

  assert.match(source, /post_play/);
  assert.match(source, /SCENE_POST_PLAY_SOURCE_CONTRACT/);
  assert.match(source, /SCENE_POST_PLAY_PREVIEW_POLICY/);
  assert.match(source, /preview_while_skipping/);
  assert.match(source, /skip_animations/);
  assert.match(source, /force_draw/);
  assert.match(source, /num_plays/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"|\bdocument\b|setTimeout|requestAnimationFrame/);
  assert.doesNotMatch(source, /\bwindow(?:\.|\[)/);
});
