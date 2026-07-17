import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

type MathSceneFinishAnimationSpec = {
  animationId: string;
  finalAlphaValue?: number;
  mobjectWasUpdating?: boolean;
  objectId?: string;
  remover?: boolean;
  runTime: number;
  suspendMobjectUpdating?: boolean;
};

type MathSceneFinishAnimationRow = {
  animationId: string;
  callsCleanUpFromScene: boolean;
  callsFinish: boolean;
  finalAlphaValue: number;
  mobjectWasUpdating: boolean;
  objectId: string;
  removedObjectId: string | null;
  remover: boolean;
  callsResumeUpdating: boolean;
  resumeUpdaterDt: number | null;
  setAnimatingStatusFalse: boolean;
  suspendMobjectUpdating: boolean;
};

type MathSceneFinishAnimationsPlan = {
  animationCount: number;
  callsSceneUpdateMobjects: boolean;
  cleanUpCallCount: number;
  cleanupPolicy: string;
  finalAlphaSummary: string;
  finishCallCount: number;
  finishLifecycleSummary: string;
  removedObjectCount: number;
  removedObjectIds: string[];
  resumeObjectIds: string[];
  resumePolicy: string;
  resumeUpdaterDtSummary: string;
  resumeUpdatingCallCount: number;
  rows: MathSceneFinishAnimationRow[];
  runTime: number;
  sceneUpdateMobjectsDt: number;
  setAnimatingStatusFalseCount: number;
  skipAnimations: boolean;
  sourceContract: string;
  summary: string;
  version: "mais-manim-finish-animations/v1";
};

type MathSceneFinishAnimationsModule = {
  SCENE_FINISH_ANIMATIONS_CLEANUP_POLICY: string;
  SCENE_FINISH_ANIMATIONS_RESUME_POLICY: string;
  SCENE_FINISH_ANIMATIONS_SOURCE_CONTRACT: string;
  buildSceneFinishAnimationsPlan: (input: {
    animations: MathSceneFinishAnimationSpec[];
    skipAnimations?: boolean;
  }) => MathSceneFinishAnimationsPlan;
  sceneFinishAnimationsDataAttributes: (plan: MathSceneFinishAnimationsPlan) => Record<string, string>;
  serializeSceneFinishAnimationsPlan: (plan: MathSceneFinishAnimationsPlan) => string;
};

const modulePath = "components/visualizations/three/manim/mathSceneFinishAnimations.ts";

async function importFinishAnimationsModule() {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should provide a pure Scene.finish_animations module");
  return (await import("./mathSceneFinishAnimations")) as MathSceneFinishAnimationsModule;
}

test("buildSceneFinishAnimationsPlan mirrors finish and remover cleanup ordering", async () => {
  const {
    SCENE_FINISH_ANIMATIONS_CLEANUP_POLICY,
    SCENE_FINISH_ANIMATIONS_SOURCE_CONTRACT,
    buildSceneFinishAnimationsPlan
  } = await importFinishAnimationsModule();
  const plan = buildSceneFinishAnimationsPlan({
    animations: [
      { animationId: "curve-reveal", objectId: "curve", runTime: 1 },
      { animationId: "fade-old", finalAlphaValue: 0, objectId: "old-curve", remover: true, runTime: 0.5 }
    ],
    skipAnimations: false
  });

  assert.equal(plan.version, "mais-manim-finish-animations/v1");
  assert.equal(plan.sourceContract, SCENE_FINISH_ANIMATIONS_SOURCE_CONTRACT);
  assert.equal(plan.cleanupPolicy, SCENE_FINISH_ANIMATIONS_CLEANUP_POLICY);
  assert.match(plan.sourceContract, /Scene\.finish_animations/);
  assert.match(plan.sourceContract, /Animation\.finish/);
  assert.match(plan.cleanupPolicy, /final-alpha/);
  assert.match(plan.cleanupPolicy, /remover-cleanup/);
  assert.equal(plan.animationCount, 2);
  assert.equal(plan.finishCallCount, 2);
  assert.equal(plan.cleanUpCallCount, 2);
  assert.equal(plan.setAnimatingStatusFalseCount, 2);
  assert.equal(plan.finalAlphaSummary, "curve=1.000,old-curve=0.000");
  assert.equal(
    plan.finishLifecycleSummary,
    [
      "curve-reveal=interpolate_final_alpha(1.000)>set_animating_status_false>clean_up_from_scene",
      "fade-old=interpolate_final_alpha(0.000)>set_animating_status_false>clean_up_from_scene>remove_mobject",
      "scene=update_mobjects(dt=0.000)"
    ].join(";")
  );
  assert.equal(plan.runTime, 1);
  assert.equal(plan.sceneUpdateMobjectsDt, 0);
  assert.equal(plan.callsSceneUpdateMobjects, true);
  assert.deepEqual(plan.removedObjectIds, ["old-curve"]);
  assert.equal(plan.removedObjectCount, 1);
  assert.deepEqual(plan.rows.map((row) => row.finalAlphaValue), [1, 0]);
  assert.ok(plan.rows.every((row) => row.callsFinish));
  assert.ok(plan.rows.every((row) => row.callsCleanUpFromScene));
  assert.ok(plan.rows.every((row) => row.setAnimatingStatusFalse));
  assert.equal(
    plan.summary,
    "finishAnimations:animations=2:finish=2:cleanup=2:removed=old-curve:updateDt=0.000:skip=false"
  );
});

test("buildSceneFinishAnimationsPlan catches skipped updater time up to max run_time", async () => {
  const { buildSceneFinishAnimationsPlan } = await importFinishAnimationsModule();
  const plan = buildSceneFinishAnimationsPlan({
    animations: [
      { animationId: "short", objectId: "short-object", runTime: 0.75 },
      { animationId: "long", objectId: "long-object", runTime: 1.25 }
    ],
    skipAnimations: true
  });

  assert.equal(plan.skipAnimations, true);
  assert.equal(plan.runTime, 1.25);
  assert.equal(plan.sceneUpdateMobjectsDt, 1.25);
  assert.equal(plan.removedObjectCount, 0);
  assert.equal(
    plan.summary,
    "finishAnimations:animations=2:finish=2:cleanup=2:removed=none:updateDt=1.250:skip=true"
  );
});

test("buildSceneFinishAnimationsPlan mirrors Animation.finish resume_updating when begin suspended a live mobject", async () => {
  const {
    SCENE_FINISH_ANIMATIONS_RESUME_POLICY,
    SCENE_FINISH_ANIMATIONS_SOURCE_CONTRACT,
    buildSceneFinishAnimationsPlan
  } = await importFinishAnimationsModule();
  const plan = buildSceneFinishAnimationsPlan({
    animations: [
      {
        animationId: "live-curve-transform",
        mobjectWasUpdating: true,
        objectId: "live-curve",
        runTime: 1.5,
        suspendMobjectUpdating: true
      },
      {
        animationId: "already-suspended-transform",
        mobjectWasUpdating: false,
        objectId: "already-suspended",
        runTime: 0.75,
        suspendMobjectUpdating: true
      },
      {
        animationId: "ordinary-fade",
        mobjectWasUpdating: true,
        objectId: "ordinary-label",
        runTime: 0.5,
        suspendMobjectUpdating: false
      }
    ]
  });

  assert.match(SCENE_FINISH_ANIMATIONS_SOURCE_CONTRACT, /resume_updating/);
  assert.equal(
    SCENE_FINISH_ANIMATIONS_RESUME_POLICY,
    "resume-updating-only-if-animation-suspended-and-mobject-was-updating-with-dt-zero-updater-call"
  );
  assert.equal(plan.resumePolicy, SCENE_FINISH_ANIMATIONS_RESUME_POLICY);
  assert.equal(plan.resumeUpdatingCallCount, 1);
  assert.deepEqual(plan.resumeObjectIds, ["live-curve"]);
  assert.equal(plan.resumeUpdaterDtSummary, "live-curve=0.000");
  assert.match(plan.finishLifecycleSummary, /live-curve-transform=.*resume_updating\(dt=0\.000\)>clean_up_from_scene/);
  assert.equal(plan.rows[0].callsResumeUpdating, true);
  assert.equal(plan.rows[0].resumeUpdaterDt, 0);
  assert.equal(plan.rows[0].mobjectWasUpdating, true);
  assert.equal(plan.rows[0].suspendMobjectUpdating, true);
  assert.equal(plan.rows[1].callsResumeUpdating, false);
  assert.equal(plan.rows[1].resumeUpdaterDt, null);
  assert.equal(plan.rows[1].mobjectWasUpdating, false);
  assert.equal(plan.rows[1].suspendMobjectUpdating, true);
  assert.equal(plan.rows[2].callsResumeUpdating, false);
  assert.equal(plan.rows[2].resumeUpdaterDt, null);
  assert.equal(plan.rows[2].mobjectWasUpdating, true);
  assert.equal(plan.rows[2].suspendMobjectUpdating, false);
  assert.equal(
    plan.summary,
    "finishAnimations:animations=3:finish=3:cleanup=3:removed=none:updateDt=0.000:skip=false:resume=live-curve"
  );
});

test("sceneFinishAnimationsDataAttributes exposes stable browser QA evidence", async () => {
  const {
    SCENE_FINISH_ANIMATIONS_CLEANUP_POLICY,
    SCENE_FINISH_ANIMATIONS_RESUME_POLICY,
    SCENE_FINISH_ANIMATIONS_SOURCE_CONTRACT,
    buildSceneFinishAnimationsPlan,
    sceneFinishAnimationsDataAttributes
  } = await importFinishAnimationsModule();
  const plan = buildSceneFinishAnimationsPlan({
    animations: [
      {
        animationId: "fade-old",
        finalAlphaValue: 0,
        mobjectWasUpdating: true,
        objectId: "old-curve",
        remover: true,
        runTime: 0.5,
        suspendMobjectUpdating: true
      }
    ],
    skipAnimations: false
  });

  assert.deepEqual(sceneFinishAnimationsDataAttributes(plan), {
    "data-viz-manim-finish-animations-cleanup-count": "1",
    "data-viz-manim-finish-animations-cleanup-policy": SCENE_FINISH_ANIMATIONS_CLEANUP_POLICY,
    "data-viz-manim-finish-animations-count": "1",
    "data-viz-manim-finish-animations-final-alpha-summary": "old-curve=0.000",
    "data-viz-manim-finish-animations-finish-count": "1",
    "data-viz-manim-finish-animations-lifecycle-summary":
      "fade-old=interpolate_final_alpha(0.000)>set_animating_status_false>resume_updating(dt=0.000)>clean_up_from_scene>remove_mobject;scene=update_mobjects(dt=0.000)",
    "data-viz-manim-finish-animations-removed-count": "1",
    "data-viz-manim-finish-animations-removed-ids": "old-curve",
    "data-viz-manim-finish-animations-resume-count": "1",
    "data-viz-manim-finish-animations-resume-dt-summary": "old-curve=0.000",
    "data-viz-manim-finish-animations-resume-ids": "old-curve",
    "data-viz-manim-finish-animations-resume-policy": SCENE_FINISH_ANIMATIONS_RESUME_POLICY,
    "data-viz-manim-finish-animations-run-time": "0.500",
    "data-viz-manim-finish-animations-scene-update-dt": "0.000",
    "data-viz-manim-finish-animations-set-animating-status-false-count": "1",
    "data-viz-manim-finish-animations-skip": "false",
    "data-viz-manim-finish-animations-source-contract": SCENE_FINISH_ANIMATIONS_SOURCE_CONTRACT,
    "data-viz-manim-finish-animations-summary": plan.summary
  });
});

test("serializeSceneFinishAnimationsPlan emits escaped deterministic browser JSON", async () => {
  const {
    buildSceneFinishAnimationsPlan,
    serializeSceneFinishAnimationsPlan
  } = await importFinishAnimationsModule();
  const plan = buildSceneFinishAnimationsPlan({
    animations: [{ animationId: "<finish-animation>", objectId: "curve", remover: true, runTime: 1 }],
    skipAnimations: true
  });

  const serialized = serializeSceneFinishAnimationsPlan(plan);

  assert.equal(
    serializeSceneFinishAnimationsPlan(JSON.parse(JSON.stringify(plan)) as MathSceneFinishAnimationsPlan),
    serialized
  );
  assert.doesNotMatch(serialized, /<finish-animation>|<\/script/i);
  assert.match(serialized, /\\u003cfinish-animation>/);
  assert.deepEqual(JSON.parse(serialized), plan);
});

test("Scene finish-animations stays pure and documents the source contract", () => {
  assert.ok(fs.existsSync(modulePath), "mathSceneFinishAnimations.ts should exist");
  const source = fs.readFileSync(modulePath, "utf8");

  assert.match(source, /finish_animations/);
  assert.match(source, /SCENE_FINISH_ANIMATIONS_SOURCE_CONTRACT/);
  assert.match(source, /SCENE_FINISH_ANIMATIONS_CLEANUP_POLICY/);
  assert.match(source, /SCENE_FINISH_ANIMATIONS_RESUME_POLICY/);
  assert.match(source, /clean_up_from_scene/);
  assert.match(source, /resume_updating/);
  assert.match(source, /get_run_time/);
  assert.match(source, /skip_animations/);
  assert.match(source, /update_mobjects/);
  assert.match(source, /remover/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"|\bdocument\b|setTimeout|requestAnimationFrame/);
  assert.doesNotMatch(source, /\bwindow(?:\.|\[)/);
});
