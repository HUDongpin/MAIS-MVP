import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

type MathSceneBeginAnimationSpec = {
  animationId: string;
  familyIds?: string[];
  mobjectWasUpdating?: boolean;
  objectId?: string;
  runTime: number;
  suspendMobjectUpdating?: boolean;
  timeSpan?: [number, number] | null;
};

type MathSceneBeginAnimationRow = {
  addedFamilyIds: string[];
  addedToScene: boolean;
  animationId: string;
  callsBegin: boolean;
  callsInterpolateZero: boolean;
  callsSuspendUpdating: boolean;
  familyIds: string[];
  familyTupleCount: number;
  mobjectWasUpdating: boolean;
  objectId: string;
  runTimeAfterBegin: number;
  runTimeBeforeBegin: number;
  setsAnimatingStatusTrue: boolean;
  startingMobjectId: string;
  timeSpanEnd: number | null;
};

type MathSceneBeginAnimationsPlan = {
  addedFamilyIds: string[];
  addedObjectCount: number;
  addedObjectIds: string[];
  animationCount: number;
  beginCallCount: number;
  beginLifecycleSummary: string;
  finalSceneFamilyIds: string[];
  initialSceneFamilyIds: string[];
  interpolateZeroCallCount: number;
  maxRunTime: number;
  rows: MathSceneBeginAnimationRow[];
  sceneAddCallCount: number;
  sceneFamilyCountAfter: number;
  sceneFamilyCountBefore: number;
  setAnimatingStatusCount: number;
  sourceContract: string;
  startStatePolicy: string;
  startingMobjectCopyCount: number;
  startingMobjectIds: string[];
  summary: string;
  suspendUpdatingCallCount: number;
  version: "mais-manim-begin-animations/v1";
};

type MathSceneBeginAnimationsModule = {
  SCENE_BEGIN_ANIMATIONS_SOURCE_CONTRACT: string;
  SCENE_BEGIN_ANIMATIONS_START_STATE_POLICY: string;
  buildSceneBeginAnimationsPlan: (input: {
    animations: MathSceneBeginAnimationSpec[];
    sceneFamilyIds?: string[];
  }) => MathSceneBeginAnimationsPlan;
  sceneBeginAnimationsDataAttributes: (plan: MathSceneBeginAnimationsPlan) => Record<string, string>;
  serializeSceneBeginAnimationsPlan: (plan: MathSceneBeginAnimationsPlan) => string;
};

const modulePath = "components/visualizations/three/manim/mathSceneBeginAnimations.ts";

async function importBeginAnimationsModule() {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should provide a pure Scene.begin_animations module");
  return (await import("./mathSceneBeginAnimations")) as MathSceneBeginAnimationsModule;
}

test("buildSceneBeginAnimationsPlan mirrors begin and scene.add ordering", async () => {
  const {
    SCENE_BEGIN_ANIMATIONS_SOURCE_CONTRACT,
    SCENE_BEGIN_ANIMATIONS_START_STATE_POLICY,
    buildSceneBeginAnimationsPlan
  } = await importBeginAnimationsModule();
  const plan = buildSceneBeginAnimationsPlan({
    animations: [
      { animationId: "curve-reveal", familyIds: ["curve", "probe"], objectId: "curve", runTime: 1 },
      {
        animationId: "label-fade-in",
        familyIds: ["new-label", "new-label-child"],
        mobjectWasUpdating: true,
        objectId: "new-label",
        runTime: 0.5,
        suspendMobjectUpdating: true,
        timeSpan: [0.25, 2]
      }
    ],
    sceneFamilyIds: ["curve", "probe"]
  });

  assert.equal(plan.version, "mais-manim-begin-animations/v1");
  assert.equal(plan.sourceContract, SCENE_BEGIN_ANIMATIONS_SOURCE_CONTRACT);
  assert.equal(plan.startStatePolicy, SCENE_BEGIN_ANIMATIONS_START_STATE_POLICY);
  assert.match(plan.sourceContract, /Scene\.begin_animations/);
  assert.match(plan.sourceContract, /Animation\.begin/);
  assert.match(plan.startStatePolicy, /starting-mobject/);
  assert.match(plan.startStatePolicy, /interpolate-zero/);
  assert.equal(plan.animationCount, 2);
  assert.equal(plan.beginCallCount, 2);
  assert.deepEqual(plan.startingMobjectIds, ["curve:starting-mobject", "new-label:starting-mobject"]);
  assert.equal(
    plan.beginLifecycleSummary,
    [
      "curve-reveal=set_animating_status>create_starting_mobject>interpolate_zero",
      "label-fade-in=set_animating_status>create_starting_mobject>suspend_updating>interpolate_zero>scene_add"
    ].join(";")
  );
  assert.equal(plan.setAnimatingStatusCount, 2);
  assert.equal(plan.startingMobjectCopyCount, 2);
  assert.equal(plan.interpolateZeroCallCount, 2);
  assert.equal(plan.suspendUpdatingCallCount, 1);
  assert.equal(plan.sceneAddCallCount, 1);
  assert.equal(plan.addedObjectCount, 1);
  assert.deepEqual(plan.addedObjectIds, ["new-label"]);
  assert.deepEqual(plan.addedFamilyIds, ["new-label", "new-label-child"]);
  assert.deepEqual(plan.initialSceneFamilyIds, ["curve", "probe"]);
  assert.deepEqual(plan.finalSceneFamilyIds, ["curve", "probe", "new-label", "new-label-child"]);
  assert.equal(plan.sceneFamilyCountBefore, 2);
  assert.equal(plan.sceneFamilyCountAfter, 4);
  assert.equal(plan.maxRunTime, 2);
  assert.deepEqual(plan.rows.map((row) => row.runTimeAfterBegin), [1, 2]);
  assert.deepEqual(plan.rows.map((row) => row.timeSpanEnd), [null, 2]);
  assert.equal(plan.rows[1].callsSuspendUpdating, true);
  assert.equal(plan.rows[1].mobjectWasUpdating, true);
  assert.equal(plan.rows[1].familyTupleCount, 2);
  assert.ok(plan.rows.every((row) => row.callsBegin));
  assert.ok(plan.rows.every((row) => row.setsAnimatingStatusTrue));
  assert.ok(plan.rows.every((row) => row.callsInterpolateZero));
  assert.equal(
    plan.summary,
    "beginAnimations:animations=2:begin=2:added=new-label:suspend=1:run=2.000:families=4"
  );
});

test("buildSceneBeginAnimationsPlan does not scene.add existing family members", async () => {
  const { buildSceneBeginAnimationsPlan } = await importBeginAnimationsModule();
  const plan = buildSceneBeginAnimationsPlan({
    animations: [
      {
        animationId: "child-shift",
        familyIds: ["child"],
        mobjectWasUpdating: false,
        objectId: "child",
        runTime: 2,
        suspendMobjectUpdating: true,
        timeSpan: [0.1, 1]
      }
    ],
    sceneFamilyIds: ["parent", "child"]
  });

  assert.equal(plan.sceneAddCallCount, 0);
  assert.deepEqual(plan.addedObjectIds, []);
  assert.deepEqual(plan.addedFamilyIds, []);
  assert.deepEqual(plan.finalSceneFamilyIds, ["parent", "child"]);
  assert.equal(plan.maxRunTime, 2);
  assert.equal(plan.rows[0].runTimeAfterBegin, 2);
  assert.equal(plan.rows[0].callsSuspendUpdating, true);
  assert.equal(plan.rows[0].mobjectWasUpdating, false);
  assert.equal(
    plan.summary,
    "beginAnimations:animations=1:begin=1:added=none:suspend=1:run=2.000:families=2"
  );
});

test("sceneBeginAnimationsDataAttributes exposes stable browser QA evidence", async () => {
  const {
    SCENE_BEGIN_ANIMATIONS_SOURCE_CONTRACT,
    SCENE_BEGIN_ANIMATIONS_START_STATE_POLICY,
    buildSceneBeginAnimationsPlan,
    sceneBeginAnimationsDataAttributes
  } = await importBeginAnimationsModule();
  const plan = buildSceneBeginAnimationsPlan({
    animations: [{ animationId: "label-fade-in", objectId: "new-label", runTime: 0.5 }],
    sceneFamilyIds: []
  });

  assert.deepEqual(sceneBeginAnimationsDataAttributes(plan), {
    "data-viz-manim-begin-animations-added-count": "1",
    "data-viz-manim-begin-animations-added-ids": "new-label",
    "data-viz-manim-begin-animations-begin-count": "1",
    "data-viz-manim-begin-animations-lifecycle-summary":
      "label-fade-in=set_animating_status>create_starting_mobject>interpolate_zero>scene_add",
    "data-viz-manim-begin-animations-count": "1",
    "data-viz-manim-begin-animations-family-count-after": "1",
    "data-viz-manim-begin-animations-family-count-before": "0",
    "data-viz-manim-begin-animations-interpolate-zero-count": "1",
    "data-viz-manim-begin-animations-run-time": "0.500",
    "data-viz-manim-begin-animations-scene-add-count": "1",
    "data-viz-manim-begin-animations-set-animating-status-count": "1",
    "data-viz-manim-begin-animations-source-contract": SCENE_BEGIN_ANIMATIONS_SOURCE_CONTRACT,
    "data-viz-manim-begin-animations-start-state-policy": SCENE_BEGIN_ANIMATIONS_START_STATE_POLICY,
    "data-viz-manim-begin-animations-starting-copy-count": "1",
    "data-viz-manim-begin-animations-starting-copy-ids": "new-label:starting-mobject",
    "data-viz-manim-begin-animations-summary": plan.summary,
    "data-viz-manim-begin-animations-suspend-count": "0"
  });
});

test("serializeSceneBeginAnimationsPlan emits escaped deterministic browser JSON", async () => {
  const {
    buildSceneBeginAnimationsPlan,
    serializeSceneBeginAnimationsPlan
  } = await importBeginAnimationsModule();
  const plan = buildSceneBeginAnimationsPlan({
    animations: [{ animationId: "<begin-animation>", objectId: "curve", runTime: 1 }],
    sceneFamilyIds: []
  });

  const serialized = serializeSceneBeginAnimationsPlan(plan);

  assert.equal(
    serializeSceneBeginAnimationsPlan(JSON.parse(JSON.stringify(plan)) as MathSceneBeginAnimationsPlan),
    serialized
  );
  assert.doesNotMatch(serialized, /<begin-animation>|<\/script/i);
  assert.match(serialized, /\\u003cbegin-animation>/);
  assert.deepEqual(JSON.parse(serialized), plan);
});

test("Scene begin-animations stays pure and documents the source contract", () => {
  assert.ok(fs.existsSync(modulePath), "mathSceneBeginAnimations.ts should exist");
  const source = fs.readFileSync(modulePath, "utf8");

  assert.match(source, /begin_animations/);
  assert.match(source, /SCENE_BEGIN_ANIMATIONS_SOURCE_CONTRACT/);
  assert.match(source, /SCENE_BEGIN_ANIMATIONS_START_STATE_POLICY/);
  assert.match(source, /animation\.begin/);
  assert.match(source, /set_animating_status/);
  assert.match(source, /create_starting_mobject/);
  assert.match(source, /suspend_updating/);
  assert.match(source, /interpolate\(0\)/);
  assert.match(source, /get_family/);
  assert.match(source, /scene\.add/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"|\bdocument\b|setTimeout|requestAnimationFrame/);
  assert.doesNotMatch(source, /\bwindow(?:\.|\[)/);
});
