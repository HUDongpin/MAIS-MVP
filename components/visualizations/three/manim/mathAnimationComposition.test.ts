import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  animationCompositionFrameEvidenceDataAttributes,
  buildAnimationCompositionPlan,
  buildAnimationCompositionFrameEvidence,
  buildSceneAnimationCompositionPlans,
  sampleAnimationCompositionFrame,
  serializeAnimationCompositionFrameEvidence,
  summarizeAnimationCompositionPlans
} from "./mathAnimationComposition";
import type { MathSceneAnimatePlanSpec, MathSceneAnimationCompositionSpec, MathSceneSpec } from "./mathSceneTypes";

const animationPlans: MathSceneAnimatePlanSpec[] = [
  {
    duration: 2,
    id: "curve-lift",
    objectId: "curve",
    operations: [{ type: "shift", vector: [0, 1, 0] }],
    targetObjectId: "curve:target"
  },
  {
    duration: 1,
    id: "point-pulse",
    objectId: "point",
    operations: [{ type: "scale", factor: 1.2 }],
    targetObjectId: "point:target"
  },
  {
    duration: 1,
    id: "formula-flash",
    objectId: "formula-anchor",
    operations: [{ type: "setColorRole", colorRole: "attention" }],
    targetObjectId: "formula-anchor:target"
  }
];

function composition(type: MathSceneAnimationCompositionSpec["type"]): MathSceneAnimationCompositionSpec {
  return {
    animationPlanIds: ["curve-lift", "point-pulse", "formula-flash"],
    id: `${type}-composition`,
    lagRatio: type === "laggedStart" ? 0.25 : undefined,
    type
  };
}

test("builds parallel AnimationGroup windows with shared start time", () => {
  const plan = buildAnimationCompositionPlan(composition("animationGroup"), animationPlans);

  assert.equal(plan.id, "animationGroup-composition");
  assert.equal(plan.type, "animationGroup");
  assert.equal(plan.timingPolicy, "parallel-shared-start");
  assert.equal(plan.durationSeconds, 2);
  assert.deepEqual(
    plan.windows.map((window) => [window.animationPlanId, window.startSeconds, window.endSeconds, window.durationSeconds]),
    [
      ["curve-lift", 0, 2, 2],
      ["point-pulse", 0, 1, 1],
      ["formula-flash", 0, 1, 1]
    ]
  );
  assert.deepEqual(plan.issues, []);
});

test("honors authored AnimationGroup lag_ratio with recursive child timing", () => {
  const plan = buildAnimationCompositionPlan(
    {
      ...composition("animationGroup"),
      lagRatio: 0.25
    },
    animationPlans
  );

  assert.equal(plan.type, "animationGroup");
  assert.equal(plan.timingPolicy, "recursive-lag-ratio-child-duration");
  assert.equal(plan.durationSeconds, 2);
  assert.deepEqual(
    plan.windows.map((window) => [window.animationPlanId, window.startSeconds, window.endSeconds]),
    [
      ["curve-lift", 0, 2],
      ["point-pulse", 0.5, 1.5],
      ["formula-flash", 0.75, 1.75]
    ]
  );
});

test("builds Succession windows by chaining child animation durations", () => {
  const plan = buildAnimationCompositionPlan(composition("succession"), animationPlans);

  assert.equal(plan.durationSeconds, 4);
  assert.equal(plan.timingPolicy, "succession-chained-child-duration");
  assert.deepEqual(
    plan.windows.map((window) => [window.animationPlanId, window.startSeconds, window.endSeconds]),
    [
      ["curve-lift", 0, 2],
      ["point-pulse", 2, 3],
      ["formula-flash", 3, 4]
    ]
  );
});

test("builds LaggedStart windows using deterministic lag-ratio offsets", () => {
  const plan = buildAnimationCompositionPlan(composition("laggedStart"), animationPlans);

  assert.equal(plan.durationSeconds, 2);
  assert.equal(plan.timingPolicy, "recursive-lag-ratio-child-duration");
  assert.deepEqual(
    plan.windows.map((window) => [window.animationPlanId, window.startSeconds, window.endSeconds]),
    [
      ["curve-lift", 0, 2],
      ["point-pulse", 0.5, 1.5],
      ["formula-flash", 0.75, 1.75]
    ]
  );

  const frame = sampleAnimationCompositionFrame(plan, 1);
  assert.equal(frame.elapsedSeconds, 1);
  assert.deepEqual(
    frame.activeWindows.map((window) => [window.animationPlanId, window.localProgress]),
    [
      ["curve-lift", 0.5],
      ["point-pulse", 0.5],
      ["formula-flash", 0.25]
    ]
  );
  assert.deepEqual(frame.pendingAnimationPlanIds, []);
  assert.deepEqual(frame.completedAnimationPlanIds, []);
});

test("summarizes active AnimationComposition frame windows for browser QA", () => {
  const plan = buildAnimationCompositionPlan(composition("laggedStart"), animationPlans);
  const evidence = buildAnimationCompositionFrameEvidence({
    activeCompositionId: "laggedStart-composition",
    elapsedSeconds: 1,
    plans: [plan]
  });
  const attributes = animationCompositionFrameEvidenceDataAttributes(evidence);

  assert.equal(evidence.compositionCount, 1);
  assert.equal(evidence.activeCompositionId, "laggedStart-composition");
  assert.equal(evidence.activeCompositionType, "laggedStart");
  assert.equal(evidence.activeWindowCount, 3);
  assert.equal(evidence.activeWindowIds, "curve-lift,point-pulse,formula-flash");
  assert.equal(evidence.completedWindowCount, 0);
  assert.equal(evidence.completedWindowIds, "none");
  assert.equal(evidence.pendingWindowCount, 0);
  assert.equal(evidence.pendingWindowIds, "none");
  assert.equal(evidence.elapsedSeconds, 1);
  assert.equal(evidence.progress, 0.5);
  assert.equal(evidence.timingPolicy, "recursive-lag-ratio-child-duration");
  assert.equal(
    evidence.windowSummary,
    "curve-lift@0.000..2.000:0.500|point-pulse@0.500..1.500:0.500|formula-flash@0.750..1.750:0.250"
  );
  assert.equal(evidence.sourceContract, "Scene.play(*animations)->AnimationGroup/LaggedStart/Succession windows");
  assert.equal(
    evidence.summary,
    "animation-composition-frame:active=laggedStart-composition:mode=laggedStart:elapsed=1.000:progress=0.500:activeWindows=3:completed=0:pending=0"
  );

  assert.equal(attributes["data-viz-manim-animation-composition-active-id"], "laggedStart-composition");
  assert.equal(attributes["data-viz-manim-animation-composition-active-type"], "laggedStart");
  assert.equal(attributes["data-viz-manim-animation-composition-active-window-count"], "3");
  assert.equal(attributes["data-viz-manim-animation-composition-active-window-ids"], "curve-lift,point-pulse,formula-flash");
  assert.equal(attributes["data-viz-manim-animation-composition-completed-window-count"], "0");
  assert.equal(attributes["data-viz-manim-animation-composition-completed-window-ids"], "none");
  assert.equal(attributes["data-viz-manim-animation-composition-pending-window-count"], "0");
  assert.equal(attributes["data-viz-manim-animation-composition-pending-window-ids"], "none");
  assert.equal(attributes["data-viz-manim-animation-composition-frame-elapsed-seconds"], "1.000");
  assert.equal(attributes["data-viz-manim-animation-composition-frame-progress"], "0.500");
  assert.equal(attributes["data-viz-manim-animation-composition-timing-policy"], "recursive-lag-ratio-child-duration");
  assert.equal(attributes["data-viz-manim-animation-composition-window-summary"], evidence.windowSummary);
  assert.equal(attributes["data-viz-manim-animation-composition-source-contract"], evidence.sourceContract);
  assert.equal(attributes["data-viz-manim-animation-composition-frame-summary"], evidence.summary);

  const json = serializeAnimationCompositionFrameEvidence(evidence);
  assert.doesNotMatch(json, /</);
  assert.deepEqual(JSON.parse(json), {
    activeCompositionId: "laggedStart-composition",
    activeCompositionType: "laggedStart",
    activeWindowCount: 3,
    activeWindowIds: "curve-lift,point-pulse,formula-flash",
    completedWindowCount: 0,
    completedWindowIds: "none",
    compositionCount: 1,
    elapsedSeconds: 1,
    pendingWindowCount: 0,
    pendingWindowIds: "none",
    progress: 0.5,
    sourceContract: "Scene.play(*animations)->AnimationGroup/LaggedStart/Succession windows",
    summary: "animation-composition-frame:active=laggedStart-composition:mode=laggedStart:elapsed=1.000:progress=0.500:activeWindows=3:completed=0:pending=0",
    timingPolicy: "recursive-lag-ratio-child-duration",
    windowSummary: "curve-lift@0.000..2.000:0.500|point-pulse@0.500..1.500:0.500|formula-flash@0.750..1.750:0.250"
  });
});

test("composition runTime rescales child windows like Manim Scene.play run_time", () => {
  const plan = buildAnimationCompositionPlan(
    {
      ...composition("succession"),
      runTime: 2
    },
    animationPlans
  );

  assert.equal(plan.durationSeconds, 2);
  assert.deepEqual(
    plan.windows.map((window) => [window.animationPlanId, window.startSeconds, window.endSeconds, window.durationSeconds]),
    [
      ["curve-lift", 0, 1, 1],
      ["point-pulse", 1, 1.5, 0.5],
      ["formula-flash", 1.5, 2, 0.5]
    ]
  );
});

test("composition rateFunction eases frame progress before child local progress", () => {
  const plan = buildAnimationCompositionPlan(
    {
      ...composition("animationGroup"),
      rateFunction: "smooth",
      runTime: 4
    },
    animationPlans
  );
  const frame = sampleAnimationCompositionFrame(plan, 1);

  assert.equal(frame.progress, 0.15625);
  assert.equal(frame.elapsedSeconds, 0.625);
  assert.deepEqual(
    frame.activeWindows.map((window) => [window.animationPlanId, window.localProgress]),
    [
      ["curve-lift", 0.15625],
      ["point-pulse", 0.3125],
      ["formula-flash", 0.3125]
    ]
  );
});

test("reports missing child animation plans without inventing windows", () => {
  const plan = buildAnimationCompositionPlan(
    { animationPlanIds: ["curve-lift", "missing-plan"], id: "broken-group", type: "animationGroup" },
    animationPlans
  );

  assert.deepEqual(plan.windows.map((window) => window.animationPlanId), ["curve-lift"]);
  assert.deepEqual(plan.issues, ["missing-animation-plan:missing-plan"]);
});

test("builds scene composition plans and summaries for QA evidence", () => {
  const scene: MathSceneSpec = {
    animationCompositions: [composition("laggedStart")],
    animationPlans,
    bindings: [],
    cameraShots: [],
    coordinateSpace: {
      mathRange: { x: [-1, 1], y: [-1, 1], z: [-1, 1] },
      worldRange: { x: [-1, 1], y: [-1, 1], z: [-1, 1] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 0, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [],
    sceneId: "composition-probe",
    timeline: []
  };
  const plans = buildSceneAnimationCompositionPlans(scene);
  const summary = summarizeAnimationCompositionPlans(plans);

  assert.equal(plans.length, 1);
  assert.deepEqual(summary, {
    compositionCount: 1,
    compositionDurationSeconds: 2,
    compositionModes: ["laggedStart"],
    issueCount: 0,
    windowCount: 3
  });
});

test("AnimationComposition stays pure and is consumed by scene animation evidence", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathAnimationComposition.ts", "utf8");
  const scenePlansSource = fs.readFileSync("components/visualizations/three/manim/mathSceneAnimationPlans.ts", "utf8");
  const typeSource = fs.readFileSync("components/visualizations/three/manim/mathSceneTypes.ts", "utf8");

  assert.match(typeSource, /animationCompositions\?: MathSceneAnimationCompositionSpec\[\]/);
  assert.match(scenePlansSource, /summarizeAnimationCompositionPlans/);
  assert.match(source, /serializeAnimationCompositionFrameEvidence/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
});
