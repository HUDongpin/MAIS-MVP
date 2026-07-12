import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  SCENE_PLAYBACK_SOURCE_CONTRACT,
  buildScenePlaybackEventStream,
  buildScenePlaybackPlan,
  elapsedSecondsForPlaybackBeat,
  finalElapsedSecondsForPlaybackPlan,
  sampleScenePlaybackLifecycle,
  sampleScenePlaybackFrames,
  serializeScenePlaybackPlan,
  summarizeScenePlaybackEventStream
} from "./mathScenePlayback";
import type { AnimationStep } from "./mathSceneTypes";

const expectedScenePlaybackSourceContract =
  "Scene.play/wait playback: pre_play -> begin_animations -> progress_through_animations -> finish_animations -> post_play; wait still updates frames" as const;

const timeline: AnimationStep[] = [
  { type: "revealCurve", objectId: "curve", duration: 1, easing: "linear" },
  { type: "wait", duration: 0.5 },
  { type: "cameraTo", shotId: "detail", duration: 1 }
];

test("builds a Scene.play-style lifecycle plan for animation beats", () => {
  const plan = buildScenePlaybackPlan(timeline, { fps: 4 });

  assert.equal(SCENE_PLAYBACK_SOURCE_CONTRACT, expectedScenePlaybackSourceContract);
  assert.equal(plan.sourceContract, SCENE_PLAYBACK_SOURCE_CONTRACT);
  assert.equal(plan.totalDuration, 2.5);
  assert.equal(plan.plays.length, 3);
  assert.deepEqual(plan.plays[0].lifecycle, ["prePlay", "begin", "progress", "finish", "postPlay"]);
  assert.equal(plan.plays[1].updatesDuringWait, true);
  assert.equal(plan.plays[2].startSeconds, 1.5);
  assert.equal(plan.plays[2].endSeconds, 2.5);
  assert.equal(plan.frameInterval, 0.25);
});

test("attaches Manim get_time_progression metadata to every playback beat", () => {
  const nonDivisibleTimeline: AnimationStep[] = [
    { type: "revealCurve", objectId: "curve", duration: 1.1, easing: "linear" },
    { type: "wait", duration: 0.6 }
  ];
  const plan = buildScenePlaybackPlan(nonDivisibleTimeline, { fps: 4 });
  const skippedPlan = buildScenePlaybackPlan(nonDivisibleTimeline, { fps: 4, skipAnimations: true });

  assert.deepEqual(plan.plays[0].timeProgression.times, [0.25, 0.5, 0.75, 1, 1.25]);
  assert.equal(plan.plays[0].timeProgression.mode, "sampled");
  assert.equal(plan.plays[0].timeProgression.summary, "timeProgression:sampled:run=1.100:fps=4:frames=5:final=1.250:overshoot=true");

  assert.equal(plan.plays[1].timeProgression.description, "1 Waiting");
  assert.deepEqual(plan.plays[1].timeProgression.times, [0.25, 0.5, 0.75]);
  assert.equal(plan.plays[1].timeProgression.nIterations, 3);
  assert.equal(plan.plays[1].timeProgression.overrideSkipAnimations, false);
  assert.equal(plan.plays[1].timeProgression.overshootsRunTime, true);

  assert.deepEqual(skippedPlan.plays[0].timeProgression.times, [1.1]);
  assert.equal(skippedPlan.plays[0].timeProgression.mode, "skip-final");
  assert.equal(skippedPlan.plays[0].timeProgression.summary, "timeProgression:skip-final:run=1.100:fps=4:frames=1:final=1.100:overshoot=false");
});

test("attaches Manim wait_until control metadata to stop-condition waits", () => {
  const waitUntilTimeline: AnimationStep[] = [
    { type: "wait", duration: 2, stopConditionId: "probe-near-target", stopConditionSatisfiedAt: 0.7 }
  ];
  const plan = buildScenePlaybackPlan(waitUntilTimeline, { fps: 4, skipAnimations: true });
  const waitControl = plan.plays[0].waitControl;

  assert.ok(waitControl, "stop-condition waits should expose Scene.wait_until control evidence");
  assert.equal(plan.plays[0].timeProgression.overrideSkipAnimations, true);
  assert.equal(plan.plays[0].timeProgression.nIterations, -1);
  assert.deepEqual(plan.plays[0].timeProgression.times, [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]);
  assert.deepEqual(waitControl.emittedTimes, [0.25, 0.5, 0.75]);
  assert.equal(waitControl.effectiveDuration, 0.75);
  assert.equal(
    waitControl.summary,
    "waitControl:wait-until:condition=probe-near-target:run=2.000:effective=0.750:frames=3:overrideSkip=true:satisfied=true"
  );
});

test("attaches presenter-mode hold_loop metadata to wait beats", () => {
  const presenterTimeline: AnimationStep[] = [
    {
      type: "wait",
      duration: 1,
      holdOnWait: true,
      note: "teacher pause",
      presenterMode: true,
      presenterReleaseAfterFrames: 2
    }
  ];
  const plan = buildScenePlaybackPlan(presenterTimeline, { fps: 4 });
  const waitControl = plan.plays[0].waitControl;

  assert.ok(waitControl, "presenter waits should still expose wait-control metadata");
  assert.equal(waitControl.mode, "presenter-hold");
  assert.deepEqual(waitControl.emittedTimes, [0.25, 0.5]);
  assert.equal(waitControl.presenterHold.mode, "presenter-hold");
  assert.equal(waitControl.presenterHold.noteLogged, true);
  assert.equal(
    waitControl.presenterHold.summary,
    "presenterHold:mode=presenter-hold:frames=2:duration=0.500:released=space-or-right-arrow:timelineWait=false:note=true"
  );
});

test("attaches Scene.update_skipping_status window metadata to playback plans", () => {
  const plan = buildScenePlaybackPlan(timeline, {
    endAtAnimationNumber: 2,
    fps: 4,
    skipAnimations: false,
    startAtAnimationNumber: 1
  });

  assert.ok(plan.skippingWindow, "playback plans should expose start/end animation number skipping evidence");
  assert.equal(plan.skippingWindow.constructorForcedSkip, true);
  assert.equal(plan.skippingWindow.plays[0].actionSummary, "continue_skip_before_start");
  assert.equal(plan.skippingWindow.plays[1].actionSummary, "start_window_stop_skipping");
  assert.equal(plan.skippingWindow.plays[2].actionSummary, "end_window_raise_end_scene");
  assert.equal(plan.skippingWindow.summary, "skippingWindow:start=1:end=2:plays=3:rendered=3:skipped=2:finalSkip=false:endScene=true");
});

test("attaches Scene.post_play preview_while_skipping metadata to playback plans", () => {
  const skippedPlan = buildScenePlaybackPlan(timeline, {
    fps: 4,
    hasWindow: true,
    previewWhileSkipping: true,
    skipAnimations: true
  });
  const ordinaryPlan = buildScenePlaybackPlan(timeline, {
    fps: 4,
    hasWindow: true,
    previewWhileSkipping: true,
    skipAnimations: false
  });

  assert.ok(skippedPlan.postPlayPreview, "playback plans should expose post_play preview metadata");
  assert.equal(skippedPlan.postPlayPreview.forcedPreviewCount, 3);
  assert.equal(skippedPlan.postPlayPreview.endedAnimationCount, 0);
  assert.equal(skippedPlan.postPlayPreview.rows[0].actionSummary, "force-preview-frame");
  assert.equal(
    skippedPlan.postPlayPreview.summary,
    "postPlayPreview:plays=3:forced=3:endAnimation=0:skip=true:preview=true:window=true"
  );

  assert.ok(ordinaryPlan.postPlayPreview);
  assert.equal(ordinaryPlan.postPlayPreview.forcedPreviewCount, 0);
  assert.equal(ordinaryPlan.postPlayPreview.endedAnimationCount, 3);
  assert.equal(ordinaryPlan.postPlayPreview.rows[0].actionSummary, "end-animation");
});

test("attaches Scene.pre_play control metadata to playback plans", () => {
  const plan = buildScenePlaybackPlan(timeline, {
    endAtAnimationNumber: 2,
    fps: 4,
    hasWindow: true,
    holdOnWait: true,
    presenterMode: true,
    presenterReleaseAfterFrames: 2,
    skipAnimations: false,
    startAtAnimationNumber: 1
  });
  const prePlayControl = (plan as {
    prePlayControl?: {
      beginAnimationCount: number;
      presenterHoldCount: number;
      rows: Array<{ actionSummary: string; sceneTimeSeconds: number }>;
      summary: string;
      truncatedByEndScene: boolean;
      windowClockResetCount: number;
    };
  }).prePlayControl;

  assert.ok(prePlayControl, "playback plans should expose Scene.pre_play control evidence");
  assert.equal(prePlayControl.presenterHoldCount, 1);
  assert.equal(prePlayControl.beginAnimationCount, 1);
  assert.equal(prePlayControl.windowClockResetCount, 2);
  assert.equal(prePlayControl.truncatedByEndScene, true);
  assert.deepEqual(prePlayControl.rows.map((row) => row.actionSummary), [
    "presenter-hold+skip-before-start+reset-window-clock",
    "start-gate-stop-skipping+begin-animation+reset-window-clock",
    "end-scene"
  ]);
  assert.deepEqual(prePlayControl.rows.map((row) => row.sceneTimeSeconds), [0, 1, 1.5]);
  assert.equal(
    prePlayControl.summary,
    "prePlay:plays=3:begin=1:hold=1:startGate=1:endScene=1:windowClock=2"
  );
});

test("attaches Scene.play compilation metadata to non-wait playback beats", () => {
  const compileTimeline: AnimationStep[] = [
    { type: "transformObject", objectId: "curve", targetObjectId: "curve-target", duration: 1.25, lagRatio: 0.4 },
    { type: "wait", duration: 0.25 }
  ];
  const plan = buildScenePlaybackPlan(compileTimeline, { fps: 4 });

  assert.ok(plan.plays[0].playCompilation, "animation beats should expose Scene.play compilation evidence");
  assert.equal(plan.plays[0].playCompilation.rows[0].callsBuilderBuild, true);
  assert.equal(plan.plays[0].playCompilation.rows[0].runTimeAfter, 1.25);
  assert.equal(plan.plays[0].playCompilation.rows[0].rateFunctionAfter, "smooth");
  assert.equal(plan.plays[0].playCompilation.rows[0].lagRatioAfter, 0.4);
  assert.deepEqual(plan.plays[0].playCompilation.callOrder, [
    "prepare_animation",
    "update_rate_info",
    "pre_play",
    "begin_animations",
    "progress_through_animations",
    "finish_animations",
    "post_play"
  ]);
  assert.equal(
    plan.plays[0].playCompilation.summary,
    "playCompilation:proto=1:prepared=1:updateRate=1:run=1.250:pipeline=pre_play>begin_animations>progress_through_animations>finish_animations>post_play"
  );

  assert.equal(plan.plays[1].playCompilation, undefined);
});

test("attaches Scene.begin_animations metadata to non-wait playback beats", () => {
  const beginTimeline: AnimationStep[] = [
    { type: "fadeInObject", objectId: "new-label", duration: 0.5, easing: "linear" },
    { type: "wait", duration: 0.25 },
    { type: "transformObject", objectId: "curve", targetObjectId: "curve-target", duration: 1 }
  ];
  const plan = buildScenePlaybackPlan(beginTimeline, { fps: 4 });

  assert.ok(plan.plays[0].beginAnimations, "animation beats should expose begin_animations evidence");
  assert.equal(plan.plays[0].beginAnimations.addedObjectIds.join(","), "new-label");
  assert.equal(plan.plays[0].beginAnimations.rows[0].callsInterpolateZero, true);
  assert.equal(
    plan.plays[0].beginAnimations.summary,
    "beginAnimations:animations=1:begin=1:added=new-label:suspend=0:run=0.500:families=1"
  );

  assert.equal(plan.plays[1].beginAnimations, undefined);
  assert.ok(plan.plays[2].beginAnimations);
  assert.deepEqual(plan.plays[2].beginAnimations.addedObjectIds, []);
  assert.equal(plan.plays[2].beginAnimations.maxRunTime, 1);
});

test("attaches Scene.progress_through_animations metadata to non-wait playback beats", () => {
  const plan = buildScenePlaybackPlan(timeline, { fps: 4, skipAnimations: false });

  assert.ok(plan.plays[0].progressThroughAnimations, "animation beats should expose progress_through_animations evidence");
  assert.equal(plan.plays[0].progressThroughAnimations.frameCount, 4);
  assert.deepEqual(plan.plays[0].progressThroughAnimations.frames.map((frame) => frame.tSeconds), [0.25, 0.5, 0.75, 1]);
  assert.deepEqual(plan.plays[0].progressThroughAnimations.frames.map((frame) => frame.animationFrames[0].rawAlpha), [0.25, 0.5, 0.75, 1]);
  assert.equal(plan.plays[0].progressThroughAnimations.summary, "progressThroughAnimations:animations=1:frames=4:run=1.000:updates=4:interpolates=4:writes=4:skip=false");

  assert.equal(plan.plays[1].progressThroughAnimations, undefined);
  assert.ok(plan.plays[1].waitControl, "wait beats continue to expose Scene.wait control instead");

  assert.ok(plan.plays[2].progressThroughAnimations);
  assert.equal(plan.plays[2].progressThroughAnimations.timeProgressionSummary, "timeProgression:sampled:run=1.000:fps=4:frames=4:final=1.000:overshoot=false");
});

test("attaches Scene.finish_animations metadata to non-wait playback beats", () => {
  const finishTimeline: AnimationStep[] = [
    { type: "fadeOutObject", objectId: "old-curve", duration: 0.5, easing: "linear" },
    { type: "wait", duration: 0.25 },
    { type: "revealCurve", objectId: "new-curve", duration: 1, easing: "linear" }
  ];
  const plan = buildScenePlaybackPlan(finishTimeline, { fps: 4, skipAnimations: true });

  assert.ok(plan.plays[0].finishAnimations, "animation beats should expose finish_animations evidence");
  assert.equal(plan.plays[0].finishAnimations.removedObjectIds.join(","), "old-curve");
  assert.equal(plan.plays[0].finishAnimations.sceneUpdateMobjectsDt, 0.5);
  assert.equal(
    plan.plays[0].finishAnimations.summary,
    "finishAnimations:animations=1:finish=1:cleanup=1:removed=old-curve:updateDt=0.500:skip=true"
  );

  assert.equal(plan.plays[1].finishAnimations, undefined);
  assert.ok(plan.plays[2].finishAnimations);
  assert.deepEqual(plan.plays[2].finishAnimations.removedObjectIds, []);
  assert.equal(plan.plays[2].finishAnimations.sceneUpdateMobjectsDt, 1);
});

test("samples deterministic playback frames and updates during wait beats", () => {
  const frames = sampleScenePlaybackFrames(timeline, { fps: 4 });
  const waitFrames = frames.filter((frame) => frame.activeStep?.type === "wait");

  assert.equal(frames[0].elapsedSeconds, 0);
  assert.equal(frames.at(-1)?.elapsedSeconds, 2.5);
  assert.ok(waitFrames.length >= 2);
  assert.ok(waitFrames.every((frame) => frame.shouldRunUpdaters));
  assert.ok(frames.every((frame) => frame.dtSeconds <= 0.25));
});

test("samples active Scene.play lifecycle phase evidence at frame boundaries", () => {
  const begin = sampleScenePlaybackLifecycle(timeline, 0, { fps: 4 });
  const progress = sampleScenePlaybackLifecycle(timeline, 0.5, { fps: 4 });
  const waitProgress = sampleScenePlaybackLifecycle(timeline, 1.25, { fps: 4 });
  const final = sampleScenePlaybackLifecycle(timeline, 2.5, { fps: 4 });

  assert.equal(begin.activePlayIndex, 0);
  assert.equal(begin.lifecyclePhase, "begin");
  assert.equal(begin.localProgress, 0);
  assert.equal(begin.completedPlayCount, 0);
  assert.equal(begin.pendingPlayCount, 2);
  assert.equal(begin.lifecycleSummary, "play=0;phase=begin;alpha=0.000;completed=0;pending=2;updates=false");

  assert.equal(progress.activePlayIndex, 0);
  assert.equal(progress.lifecyclePhase, "progress");
  assert.equal(progress.localProgress, 0.5);

  assert.equal(waitProgress.activePlayIndex, 1);
  assert.equal(waitProgress.lifecyclePhase, "progress");
  assert.equal(waitProgress.completedPlayCount, 1);
  assert.equal(waitProgress.pendingPlayCount, 1);
  assert.equal(waitProgress.updatesDuringActivePlay, true);
  assert.equal(waitProgress.lifecycleSummary, "play=1;phase=progress;alpha=0.500;completed=1;pending=1;updates=true");

  assert.equal(final.activePlayIndex, 2);
  assert.equal(final.lifecyclePhase, "finish");
  assert.equal(final.localProgress, 1);
  assert.equal(final.completedPlayCount, 3);
  assert.equal(final.pendingPlayCount, 0);
});

test("skip mode emits the final deterministic frame while preserving lifecycle metadata", () => {
  const frames = sampleScenePlaybackFrames(timeline, { fps: 4, skipAnimations: true });

  assert.equal(frames.length, 1);
  assert.equal(frames[0].elapsedSeconds, 2.5);
  assert.equal(frames[0].lifecyclePhase, "finish");
  assert.equal(frames[0].activePlayIndex, 2);
  assert.equal(frames[0].timeline.progress, 1);
  assert.equal(frames[0].shouldRunUpdaters, true);
});

test("resolves run-from-beat and show-final authoring times from the playback plan", () => {
  const plan = buildScenePlaybackPlan(timeline, { fps: 4 });

  assert.equal(elapsedSecondsForPlaybackBeat(plan, 0), 0);
  assert.equal(elapsedSecondsForPlaybackBeat(plan, 2), 1.5);
  assert.equal(elapsedSecondsForPlaybackBeat(plan, 99), 0);
  assert.equal(finalElapsedSecondsForPlaybackPlan(plan), 2.5);
});

test("builds an explicit Scene.play lifecycle event stream for authoring and QA evidence", () => {
  const events = buildScenePlaybackEventStream(timeline, { fps: 4 });
  const firstPlayEvents = events.filter((event) => event.playIndex === 0);
  const waitEvents = events.filter((event) => event.stepType === "wait");
  const firstCameraProgress = events.find((event) => event.stepType === "cameraTo" && event.phase === "progress");

  assert.deepEqual(firstPlayEvents.map((event) => event.phase), [
    "prePlay",
    "begin",
    "progress",
    "progress",
    "progress",
    "finish",
    "postPlay"
  ]);
  assert.deepEqual(firstPlayEvents.map((event) => event.elapsedSeconds), [0, 0, 0.25, 0.5, 0.75, 1, 1]);
  assert.deepEqual(firstPlayEvents.map((event) => event.alpha), [0, 0, 0.25, 0.5, 0.75, 1, 1]);

  assert.deepEqual(waitEvents.map((event) => event.phase), [
    "prePlay",
    "begin",
    "progress",
    "finish",
    "postPlay"
  ]);
  assert.ok(waitEvents.every((event) => event.shouldRunUpdaters));
  assert.ok(waitEvents.every((event) => event.updatesDuringWait));

  assert.ok(firstCameraProgress, "cameraTo should emit a progress event for smooth Scene.play interpolation");
  assert.equal(firstCameraProgress.rawAlpha, 0.25);
  assert.equal(firstCameraProgress.easedAlpha, 0.15625);
  assert.equal(firstCameraProgress.alpha, 0.15625);
  assert.equal(firstCameraProgress.rateFunction, "smooth");
});

test("summarizes Scene.play lifecycle events into stable checkpoint evidence", () => {
  const events = buildScenePlaybackEventStream(timeline, { fps: 4 });

  assert.equal(
    summarizeScenePlaybackEventStream(events.slice(0, 7)),
    [
      "0:prePlay@0.000/raw=0.000/eased=0.000/rate=linear/dt=0.000/update=true",
      "0:begin@0.000/raw=0.000/eased=0.000/rate=linear/dt=0.000/update=true",
      "0:progress@0.250/raw=0.250/eased=0.250/rate=linear/dt=0.250/update=true",
      "0:progress@0.500/raw=0.500/eased=0.500/rate=linear/dt=0.250/update=true",
      "0:progress@0.750/raw=0.750/eased=0.750/rate=linear/dt=0.250/update=true",
      "0:finish@1.000/raw=1.000/eased=1.000/rate=linear/dt=0.250/update=true",
      "0:postPlay@1.000/raw=1.000/eased=1.000/rate=linear/dt=0.000/update=true"
    ].join("|")
  );
  assert.equal(
    summarizeScenePlaybackEventStream(events.filter((event) => event.stepType === "cameraTo").slice(0, 3)),
    [
      "2:prePlay@1.500/raw=0.000/eased=0.000/rate=smooth/dt=0.000/update=true",
      "2:begin@1.500/raw=0.000/eased=0.000/rate=smooth/dt=0.000/update=true",
      "2:progress@1.750/raw=0.250/eased=0.156/rate=smooth/dt=0.250/update=true"
    ].join("|")
  );
});

test("serializes Scene.play playback plans as deterministic script-safe browser QA JSON", () => {
  const plan = buildScenePlaybackPlan([
    { type: "revealCurve", objectId: "curve</script>", duration: 1, easing: "linear" },
    { type: "wait", duration: 0.5 }
  ], { fps: 4, skipAnimations: true });
  const json = serializeScenePlaybackPlan(plan);

  assert.equal(json, serializeScenePlaybackPlan(plan));
  assert.doesNotMatch(json, /<|<\/script>|undefined/i);
  assert.doesNotMatch(json, /(^|[:,\[])(NaN|Infinity|-Infinity)([,}\]]|$)/);

  const parsed = JSON.parse(json) as typeof plan;
  assert.equal(parsed.sourceContract, SCENE_PLAYBACK_SOURCE_CONTRACT);
  assert.equal(parsed.totalDuration, 1.5);
  assert.equal(parsed.plays.length, 2);
  assert.equal(parsed.plays[0].step.type, "revealCurve");
  assert.equal(parsed.plays[0].playCompilation?.rows[0].objectId, "curve</script>");
  assert.equal(parsed.plays[1].updatesDuringWait, true);
  assert.equal(parsed.plays[1].waitControl?.updatesMobjectsDuringWait, true);
});

test("ScenePlayback source stays pure and exports browser QA serialization", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathScenePlayback.ts", "utf8");

  assert.match(source, /SCENE_PLAYBACK_SOURCE_CONTRACT/);
  assert.match(source, /buildScenePlaybackPlan/);
  assert.match(source, /serializeScenePlaybackPlan/);
  assert.match(source, /pre_play -> begin_animations -> progress_through_animations -> finish_animations -> post_play/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"|ThreeDLabCanvas/);
});
