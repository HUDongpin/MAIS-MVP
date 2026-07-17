import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTimelineEvidence,
  buildTimelineState,
  serializeTimelineEvidence,
  timelineEvidenceDataAttributes,
  timelineFocusTargetIds,
  timelineObjectProgress
} from "./mathTimeline";
import type { AnimationStep } from "./mathSceneTypes";

const timeline: AnimationStep[] = [
  { type: "revealCurve", objectId: "curve", duration: 2, easing: "linear" },
  { type: "moveAlongPath", objectId: "point", pathObjectId: "curve", duration: 3 },
  { type: "highlight", conceptId: "formula", duration: 1 },
  { type: "cameraTo", shotId: "detail", duration: 2 },
  { type: "wait", duration: 1 }
];

test("computes active Manim-style timeline step and local progress", () => {
  const state = buildTimelineState(timeline, 3.5);

  assert.equal(state.activeStepIndex, 1);
  assert.equal(state.activeStep?.type, "moveAlongPath");
  assert.equal(state.elapsedSeconds, 3.5);
  assert.equal(state.totalDuration, 9);
  assert.equal(state.progress, 3.5 / 9);
  assert.equal(state.localProgress, 0.5);
  assert.equal(state.activeConceptId, "curve");
  assert.deepEqual(timelineFocusTargetIds(state.activeStep), ["point", "curve"]);
});

test("summarizes Manim Scene.play timeline evidence for browser QA", () => {
  const state = buildTimelineState(timeline, 5.5);
  const evidence = buildTimelineEvidence({
    reducedMotion: false,
    skipAnimations: false,
    timeline,
    timelineState: state
  });
  const attributes = timelineEvidenceDataAttributes(evidence);

  assert.equal(evidence.stepCount, 5);
  assert.equal(evidence.totalDuration, 9);
  assert.equal(evidence.elapsedSeconds, 5.5);
  assert.equal(evidence.activeStepIndex, 2);
  assert.equal(evidence.activeStepType, "highlight");
  assert.equal(evidence.activeConceptId, "formula");
  assert.equal(evidence.completedStepCount, 2);
  assert.equal(evidence.focusTargetCount, 1);
  assert.equal(evidence.focusTargetIds, "formula");
  assert.equal(
    evidence.focusTargetPolicy,
    "Scene.play active beat exposes every semantic focus target for FormulaLayer and MathObject coordination"
  );
  assert.equal(evidence.focusTargetPrimaryId, "formula");
  assert.equal(evidence.focusTargetSummary, "timelineFocus:active=highlight:targets=1:ids=formula");
  assert.equal(evidence.pendingStepCount, 2);
  assert.equal(evidence.waitStepCount, 1);
  assert.equal(evidence.cameraStepCount, 1);
  assert.equal(evidence.reducedMotion, false);
  assert.equal(evidence.skipAnimations, false);
  assert.equal(evidence.stepTypeSummary, "revealCurve=1;moveAlongPath=1;highlight=1;cameraTo=1;wait=1");
  assert.equal(evidence.sourceContract, "Scene.play/wait->buildTimelineState|timeline beats");
  assert.equal(
    evidence.summary,
    "timeline:steps=5:duration=9.000:elapsed=5.500:active=highlight#2:completed=2:pending=2:wait=1:camera=1:reduced=false:skip=false"
  );

  assert.equal(attributes["data-viz-manim-timeline-step-count"], "5");
  assert.equal(attributes["data-viz-manim-timeline-total-duration"], "9.000");
  assert.equal(attributes["data-viz-manim-timeline-elapsed-seconds"], "5.500");
  assert.equal(attributes["data-viz-manim-timeline-focus-target-count"], "1");
  assert.equal(attributes["data-viz-manim-timeline-focus-target-ids"], "formula");
  assert.equal(
    attributes["data-viz-manim-timeline-focus-target-policy"],
    "Scene.play active beat exposes every semantic focus target for FormulaLayer and MathObject coordination"
  );
  assert.equal(attributes["data-viz-manim-timeline-focus-target-primary-id"], "formula");
  assert.equal(attributes["data-viz-manim-timeline-focus-target-summary"], "timelineFocus:active=highlight:targets=1:ids=formula");
  assert.equal(attributes["data-viz-manim-timeline-active-step-type"], "highlight");
  assert.equal(attributes["data-viz-manim-timeline-active-step-index"], "2");
  assert.equal(attributes["data-viz-manim-timeline-active-concept-id"], "formula");
  assert.equal(attributes["data-viz-manim-timeline-progress"], (5.5 / 9).toFixed(3));
  assert.equal(attributes["data-viz-manim-timeline-completed-step-count"], "2");
  assert.equal(attributes["data-viz-manim-timeline-pending-step-count"], "2");
  assert.equal(attributes["data-viz-manim-timeline-wait-step-count"], "1");
  assert.equal(attributes["data-viz-manim-timeline-camera-step-count"], "1");
  assert.equal(attributes["data-viz-manim-timeline-reduced-motion"], "false");
  assert.equal(attributes["data-viz-manim-timeline-skip-animations"], "false");
  assert.equal(attributes["data-viz-manim-timeline-step-type-summary"], evidence.stepTypeSummary);
  assert.equal(attributes["data-viz-manim-timeline-source-contract"], evidence.sourceContract);
  assert.equal(attributes["data-viz-manim-timeline-summary"], evidence.summary);

  const json = serializeTimelineEvidence(evidence);
  assert.doesNotMatch(json, /</);
  assert.deepEqual(JSON.parse(json), {
    activeConceptId: "formula",
    activeStepIndex: 2,
    activeStepType: "highlight",
    cameraStepCount: 1,
    completedStepCount: 2,
    elapsedSeconds: 5.5,
    focusTargetCount: 1,
    focusTargetIds: "formula",
    focusTargetPolicy: "Scene.play active beat exposes every semantic focus target for FormulaLayer and MathObject coordination",
    focusTargetPrimaryId: "formula",
    focusTargetSummary: "timelineFocus:active=highlight:targets=1:ids=formula",
    pendingStepCount: 2,
    progress: 5.5 / 9,
    reducedMotion: false,
    skipAnimations: false,
    sourceContract: "Scene.play/wait->buildTimelineState|timeline beats",
    stepCount: 5,
    stepTypeSummary: "revealCurve=1;moveAlongPath=1;highlight=1;cameraTo=1;wait=1",
    summary: "timeline:steps=5:duration=9.000:elapsed=5.500:active=highlight#2:completed=2:pending=2:wait=1:camera=1:reduced=false:skip=false",
    totalDuration: 9,
    waitStepCount: 1
  });
});

test("records reduced-motion and skip-animation timeline evidence deterministically", () => {
  const state = buildTimelineState(timeline, 0.25, { reducedMotion: true });
  const evidence = buildTimelineEvidence({
    reducedMotion: true,
    skipAnimations: true,
    timeline,
    timelineState: state
  });

  assert.equal(evidence.elapsedSeconds, 9);
  assert.equal(evidence.activeStepIndex, 4);
  assert.equal(evidence.activeStepType, "wait");
  assert.equal(evidence.completedStepCount, 5);
  assert.equal(evidence.pendingStepCount, 0);
  assert.equal(evidence.reducedMotion, true);
  assert.equal(evidence.skipAnimations, true);
  assert.equal(
    evidence.summary,
    "timeline:steps=5:duration=9.000:elapsed=9.000:active=wait#4:completed=5:pending=0:wait=1:camera=1:reduced=true:skip=true"
  );
});

test("clamps timeline state at boundaries", () => {
  assert.equal(buildTimelineState(timeline, -10).activeStepIndex, 0);
  assert.equal(buildTimelineState(timeline, 100).activeStepIndex, 4);
  assert.equal(buildTimelineState(timeline, 100).progress, 1);
});

test("reduced motion collapses non-wait steps to final state", () => {
  const state = buildTimelineState(timeline, 0.25, { reducedMotion: true });

  assert.equal(state.activeStepIndex, 4);
  assert.equal(state.activeStep?.type, "wait");
  assert.equal(state.progress, 1);
  assert.equal(state.localProgress, 1);
});

test("object progress stays cumulative after an object's animation step completes", () => {
  assert.equal(timelineObjectProgress(timeline, 1, "curve"), 0.5);
  assert.equal(timelineObjectProgress(timeline, 1, "point"), 0);
  assert.equal(timelineObjectProgress(timeline, 3.5, "curve"), 1);
  assert.equal(timelineObjectProgress(timeline, 3.5, "point"), 0.5);
  assert.equal(timelineObjectProgress(timeline, 3.5, "unanimated-object"), 1);
  assert.equal(timelineObjectProgress(timeline, 0.2, "point", { reducedMotion: true }), 1);
});

test("transformObject steps expose object-level transform progress to the scene timeline", () => {
  const transformTimeline: AnimationStep[] = [
    { type: "transformObject", objectId: "curve", targetObjectId: "target-curve", duration: 4, lagRatio: 0.35 }
  ];
  const state = buildTimelineState(transformTimeline, 2);

  assert.equal(state.activeStepIndex, 0);
  assert.equal(state.activeStep?.type, "transformObject");
  assert.equal(state.activeConceptId, "curve");
  assert.equal(state.localProgress, 0.5);
  assert.equal(timelineObjectProgress(transformTimeline, 2, "curve"), 0.5);
  assert.equal(timelineObjectProgress(transformTimeline, 2, "target-curve"), 1);
});

test("revealSurface steps expose eased object progress for sampled surface creation", () => {
  const surfaceTimeline: AnimationStep[] = [
    { type: "revealSurface", objectId: "objective-surface", duration: 4, easing: "smooth" },
    { type: "highlight", conceptId: "objective-function", duration: 1 }
  ];
  const state = buildTimelineState(surfaceTimeline, 2);

  assert.equal(state.activeStepIndex, 0);
  assert.equal(state.activeStep?.type, "revealSurface");
  assert.equal(state.activeConceptId, "objective-surface");
  assert.equal(state.localProgress, 0.5);
  assert.equal(state.easedLocalProgress, 0.5);
  assert.equal(timelineObjectProgress(surfaceTimeline, 1, "objective-surface"), 0.15625);
  assert.equal(timelineObjectProgress(surfaceTimeline, 4.5, "objective-surface"), 1);
});

test("FadeIn, FadeOut, and GrowFromCenter beats expose Manim creation object progress", () => {
  const creationTimeline: AnimationStep[] = [
    { type: "fadeInObject", objectId: "label", duration: 2, easing: "smooth" },
    { type: "growFromCenter", objectId: "dot", duration: 2, easing: "linear" },
    { type: "fadeOutObject", objectId: "label", duration: 2, easing: "linear" }
  ];
  const fadeInState = buildTimelineState(creationTimeline, 1);
  const growState = buildTimelineState(creationTimeline, 3);
  const fadeOutState = buildTimelineState(creationTimeline, 5);

  assert.equal(fadeInState.activeStep?.type, "fadeInObject");
  assert.equal(fadeInState.activeConceptId, "label");
  assert.equal(fadeInState.easedLocalProgress, 0.5);
  assert.equal(growState.activeStep?.type, "growFromCenter");
  assert.equal(growState.activeConceptId, "dot");
  assert.equal(fadeOutState.activeStep?.type, "fadeOutObject");
  assert.equal(fadeOutState.activeConceptId, "label");

  assert.equal(timelineObjectProgress(creationTimeline, 1, "label"), 0.5);
  assert.equal(timelineObjectProgress(creationTimeline, 3, "dot"), 0.5);
  assert.equal(timelineObjectProgress(creationTimeline, 5, "label"), 0.5);
});

test("SweepParameter beats expose tracker, concept, and formula focus targets", () => {
  const sweepTimeline: AnimationStep[] = [
    {
      conceptId: "quadratic-width",
      duration: 4,
      easing: "smooth",
      formulaTokenIds: ["a-token"],
      fromValue: 2,
      targetValue: 8,
      trackerId: "parameter:a",
      type: "sweepParameter"
    },
    { type: "wait", duration: 1 }
  ];
  const state = buildTimelineState(sweepTimeline, 2);
  const evidence = buildTimelineEvidence({
    reducedMotion: false,
    skipAnimations: false,
    timeline: sweepTimeline,
    timelineState: state
  });

  assert.equal(state.activeStep?.type, "sweepParameter");
  assert.equal(state.activeConceptId, "quadratic-width");
  assert.deepEqual(timelineFocusTargetIds(state.activeStep), ["parameter:a", "quadratic-width", "a-token"]);
  assert.equal(evidence.stepTypeSummary, "sweepParameter=1;wait=1");
  assert.equal(evidence.focusTargetCount, 3);
  assert.equal(evidence.focusTargetIds, "parameter:a,quadratic-width,a-token");
  assert.equal(evidence.focusTargetPrimaryId, "parameter:a");
  assert.equal(evidence.focusTargetSummary, "timelineFocus:active=sweepParameter:targets=3:ids=parameter:a,quadratic-width,a-token");
});
