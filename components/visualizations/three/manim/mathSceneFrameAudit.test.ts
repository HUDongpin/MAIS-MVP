import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  SCENE_FRAME_AUDIT_SOURCE_CONTRACT,
  buildMathSceneFrameAudit,
  frameAuditDataAttributes,
  serializeMathSceneFrameAuditSummary,
  summarizeMathSceneFrameAudit
} from "./mathSceneFrameAudit";
import { MOBJECT_INTERPOLATE_DATA_SOURCE_SUMMARY } from "./mathAnimationRuntime";
import {
  TRANSFORM_PATH_NON_POINT_FIELD_POLICY,
  TRANSFORM_PATH_POINTLIKE_FIELD_POLICY
} from "./mathPathFunctions";
import { buildMathSceneRenderQualityPlan } from "./mathSceneRenderQuality";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";
import { TRANSFORM_FAMILY_ALIGNMENT_ZIP_POLICY } from "./mathTransformFamilyAlignment";
import { FORMULA_LAYER_SOURCE_CONTRACT } from "./mathFormulaLayer";
import { FORMULA_SVG_MORPH_RUNTIME_SOURCE_CONTRACT } from "./mathFormulaSvgMorphRuntime";
import { MOVE_ALONG_VECTOR_FIELD_SOURCE_CONTRACT } from "./mathMoveAlongVectorField";
import { SCENE_PLAYBACK_SOURCE_CONTRACT } from "./mathScenePlayback";
import {
  UPDATER_SUSPENSION_POLICY,
  UPDATER_SUSPENSION_SOURCE_CONTRACT
} from "./mathUpdaterSuspension";
import { CAMERA_FRAME_SOURCE_CONTRACT } from "./mathCameraFrame";
import { VALUE_TRACKER_SOURCE_CONTRACT } from "./mathValueTracker";
import type { MathSceneSpec } from "./mathSceneTypes";

const expectedFrameAuditSourceContract =
  "Scene.update_frame->FrameAudit sample frames|stepper/capture/formula viewport evidence";
const expectedFrameDirectorTraceSourceContract =
  "Scene.update_frame director trace|CameraFrame+FormulaLayer+SVGMorph synchronized keyframes";
const expectedFullSubAlphaNodeWindowSummary = [
  "function-curve:raw=0.000>lagged=0.000>eased=0.000;moving-probe:raw=0.000>lagged=0.000>eased=0.000;probe-trace:raw=0.000>lagged=0.000>eased=0.000:1",
  "function-curve:raw=0.167>lagged=0.203>eased=0.107;moving-probe:raw=0.167>lagged=0.093>eased=0.025;probe-trace:raw=0.167>lagged=0.000>eased=0.000:1",
  "function-curve:raw=0.333>lagged=0.407>eased=0.361;moving-probe:raw=0.333>lagged=0.297>eased=0.212;probe-trace:raw=0.333>lagged=0.187>eased=0.092;moving-probe:raw=0.133>lagged=0.133>eased=0.049;probe-trace:raw=0.133>lagged=0.133>eased=0.049:1",
  "function-curve:raw=0.500>lagged=0.610>eased=0.662;moving-probe:raw=0.500>lagged=0.500>eased=0.500;probe-trace:raw=0.500>lagged=0.390>eased=0.338;moving-probe:raw=0.300>lagged=0.300>eased=0.216;probe-trace:raw=0.300>lagged=0.300>eased=0.216:1",
  "function-curve:raw=0.667>lagged=0.813>eased=0.908;moving-probe:raw=0.667>lagged=0.703>eased=0.788;probe-trace:raw=0.667>lagged=0.593>eased=0.639;moving-probe:raw=0.467>lagged=0.467>eased=0.450;probe-trace:raw=0.467>lagged=0.467>eased=0.450:1",
  "function-curve:raw=0.833>lagged=1.000>eased=1.000;moving-probe:raw=0.833>lagged=0.907>eased=0.975;probe-trace:raw=0.833>lagged=0.797>eased=0.893;moving-probe:raw=0.633>lagged=0.633>eased=0.695;probe-trace:raw=0.633>lagged=0.633>eased=0.695:1",
  "function-curve:raw=1.000>lagged=1.000>eased=1.000;moving-probe:raw=1.000>lagged=1.000>eased=1.000;probe-trace:raw=1.000>lagged=1.000>eased=1.000;moving-probe:raw=0.800>lagged=0.800>eased=0.896;probe-trace:raw=0.800>lagged=0.800>eased=0.896:1",
  "function-curve:raw=1.000>lagged=1.000>eased=1.000;moving-probe:raw=1.000>lagged=1.000>eased=1.000;probe-trace:raw=1.000>lagged=1.000>eased=1.000;moving-probe:raw=0.967>lagged=0.967>eased=0.997;probe-trace:raw=0.967>lagged=0.967>eased=0.997:1",
  "function-curve:raw=1.000>lagged=1.000>eased=1.000;moving-probe:raw=1.000>lagged=1.000>eased=1.000;probe-trace:raw=1.000>lagged=1.000>eased=1.000;moving-probe:raw=1.000>lagged=1.000>eased=1.000;probe-trace:raw=1.000>lagged=1.000>eased=1.000:12"
].join(",");
const expectedShowFinalSubAlphaNodeWindowSummary =
  "function-curve:raw=1.000>lagged=1.000>eased=1.000;moving-probe:raw=1.000>lagged=1.000>eased=1.000;probe-trace:raw=1.000>lagged=1.000>eased=1.000;moving-probe:raw=1.000>lagged=1.000>eased=1.000;probe-trace:raw=1.000>lagged=1.000>eased=1.000:1";
const expectedFullActiveAnimationNodeProgressSummary = [
  "function-curve:raw=0.000/lag=0.000/eased=0.000/rate=smooth|moving-probe:raw=0.000/lag=0.000/eased=0.000/rate=smooth|probe-trace:raw=0.000/lag=0.000/eased=0.000/rate=smooth:1",
  "function-curve:raw=0.167/lag=0.203/eased=0.107/rate=smooth|moving-probe:raw=0.167/lag=0.093/eased=0.025/rate=smooth|probe-trace:raw=0.167/lag=0.000/eased=0.000/rate=smooth:1",
  "function-curve:raw=0.333/lag=0.407/eased=0.361/rate=smooth|moving-probe:raw=0.333/lag=0.297/eased=0.212/rate=smooth|probe-trace:raw=0.333/lag=0.187/eased=0.092/rate=smooth|moving-probe:raw=0.133/lag=0.133/eased=0.049/rate=smooth|probe-trace:raw=0.133/lag=0.133/eased=0.049/rate=smooth:1",
  "function-curve:raw=0.500/lag=0.610/eased=0.662/rate=smooth|moving-probe:raw=0.500/lag=0.500/eased=0.500/rate=smooth|probe-trace:raw=0.500/lag=0.390/eased=0.338/rate=smooth|moving-probe:raw=0.300/lag=0.300/eased=0.216/rate=smooth|probe-trace:raw=0.300/lag=0.300/eased=0.216/rate=smooth:1",
  "function-curve:raw=0.667/lag=0.813/eased=0.908/rate=smooth|moving-probe:raw=0.667/lag=0.703/eased=0.788/rate=smooth|probe-trace:raw=0.667/lag=0.593/eased=0.639/rate=smooth|moving-probe:raw=0.467/lag=0.467/eased=0.450/rate=smooth|probe-trace:raw=0.467/lag=0.467/eased=0.450/rate=smooth:1",
  "function-curve:raw=0.833/lag=1.000/eased=1.000/rate=smooth|moving-probe:raw=0.833/lag=0.907/eased=0.975/rate=smooth|probe-trace:raw=0.833/lag=0.797/eased=0.893/rate=smooth|moving-probe:raw=0.633/lag=0.633/eased=0.695/rate=smooth|probe-trace:raw=0.633/lag=0.633/eased=0.695/rate=smooth:1",
  "function-curve:raw=1.000/lag=1.000/eased=1.000/rate=smooth|moving-probe:raw=1.000/lag=1.000/eased=1.000/rate=smooth|probe-trace:raw=1.000/lag=1.000/eased=1.000/rate=smooth|moving-probe:raw=0.800/lag=0.800/eased=0.896/rate=smooth|probe-trace:raw=0.800/lag=0.800/eased=0.896/rate=smooth:1",
  "function-curve:raw=1.000/lag=1.000/eased=1.000/rate=smooth|moving-probe:raw=1.000/lag=1.000/eased=1.000/rate=smooth|probe-trace:raw=1.000/lag=1.000/eased=1.000/rate=smooth|moving-probe:raw=0.967/lag=0.967/eased=0.997/rate=smooth|probe-trace:raw=0.967/lag=0.967/eased=0.997/rate=smooth:1",
  "function-curve:raw=1.000/lag=1.000/eased=1.000/rate=smooth|moving-probe:raw=1.000/lag=1.000/eased=1.000/rate=smooth|probe-trace:raw=1.000/lag=1.000/eased=1.000/rate=smooth|moving-probe:raw=1.000/lag=1.000/eased=1.000/rate=smooth|probe-trace:raw=1.000/lag=1.000/eased=1.000/rate=smooth:12"
].join(",");
const expectedShowFinalActiveAnimationNodeProgressSummary =
  "function-curve:raw=1.000/lag=1.000/eased=1.000/rate=smooth|moving-probe:raw=1.000/lag=1.000/eased=1.000/rate=smooth|probe-trace:raw=1.000/lag=1.000/eased=1.000/rate=smooth|moving-probe:raw=1.000/lag=1.000/eased=1.000/rate=smooth|probe-trace:raw=1.000/lag=1.000/eased=1.000/rate=smooth:1";
const expectedFullFrameDeltaSummary = "0.000:1,0.040:1,0.200:54";
const expectedShowFinalFrameDeltaSummary = "0.000:1";
const expectedFullUpdaterExecutionOrderSummary =
  "children-first:probe-trace@2<moving-probe@1<function-curve@0:56";
const expectedShowFinalUpdaterExecutionOrderSummary =
  "children-first:probe-trace@2<moving-probe@1<function-curve@0:1";
const expectedFullUpdaterExecutionFamilyTraversalSummary =
  "familyTraversal:visited=4:withUpdaters=3:idle=1:order=children-first:ids=axes,probe-trace,moving-probe,function-curve:56";
const expectedShowFinalUpdaterExecutionFamilyTraversalSummary =
  "familyTraversal:visited=4:withUpdaters=3:idle=1:order=children-first:ids=axes,probe-trace,moving-probe,function-curve:1";
const expectedFullUpdaterExecutionActiveCallSequenceSummary =
  "function-curve:reveal(timeline):13,probe-trace:trace(timeline)>moving-probe:move(timeline)>function-curve:reveal(timeline)>function-curve:always-redraw(dependencies):36,none:7";
const expectedShowFinalUpdaterExecutionActiveCallSequenceSummary =
  "probe-trace:trace(timeline)>moving-probe:move(timeline)>function-curve:reveal(timeline)>function-curve:always-redraw(dependencies):1";
const expectedFullUpdaterExecutionSummary = [
  "updater-execution:phase=animation:rows=3:updaters=4:active=0:suspended=4:dt=0:timeline=3:dependency=1:7",
  "updater-execution:phase=animation:rows=3:updaters=4:active=1:suspended=3:dt=0:timeline=3:dependency=1:13",
  "updater-execution:phase=animation:rows=3:updaters=4:active=4:suspended=0:dt=0:timeline=3:dependency=1:18",
  "updater-execution:phase=open:rows=3:updaters=4:active=4:suspended=0:dt=0:timeline=3:dependency=1:18"
].join(",");
const expectedShowFinalUpdaterExecutionSummary =
  "updater-execution:phase=open:rows=3:updaters=4:active=4:suspended=0:dt=0:timeline=3:dependency=1:1";

function buildFunctionGraphSpec() {
  const spec = buildMathSceneSpecForThreeDFamily({
    accent: "#22d3ee",
    state: {
      comparison: 5,
      depthValue: 1.4,
      familyId: "three-function-graph",
      mode: 0,
      primaryValue: 6,
      secondaryValue: 5,
      stateSummary: "family=three-function-graph;template=function-graph;value=6.000;comparison=5.000;depth=1.400",
      templateId: "function-graph",
      value: 6
    }
  });

  if (!spec) throw new Error("expected function graph MAIS Manim spec");
  return spec;
}

function buildAnimatedTrackerAuditSpec(): MathSceneSpec {
  return {
    bindings: [],
    cameraShots: [{ id: "overview", fov: 48, position: [0, 0, 8], target: [0, 0, 0] }],
    coordinateSpace: {
      mathRange: { x: [0, 1], y: [0, 1], z: [0, 1] },
      worldRange: { x: [0, 1], y: [0, 1], z: [0, 1] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [
      {
        colorRole: "function",
        conceptId: "phase",
        id: "phase-curve",
        samples: [[0, 0, 0], [1, 1, 0]],
        type: "parametricCurve"
      }
    ],
    sceneId: "frame-audit-value-tracker-scene",
    timeline: [
      { duration: 2, easing: "linear", targetValue: 1, trackerId: "phase-tracker", type: "animateTracker" },
      { duration: 1, type: "wait" }
    ],
    valueTrackers: [
      {
        conceptId: "phase",
        id: "phase-tracker",
        label: "Phase tracker",
        max: 1,
        min: 0,
        value: 0
      }
    ]
  };
}

function buildDtVectorFieldAuditSpec(): MathSceneSpec {
  return {
    bindings: [],
    cameraShots: [{ id: "overview", fov: 48, position: [3, 3, 3], target: [0, 0, 0] }],
    coordinateSpace: {
      mathRange: { x: [-4, 4], y: [-4, 4], z: [-1, 1] },
      worldRange: { x: [-4, 4], y: [-4, 4], z: [-1, 1] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 2, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [
      {
        colorRole: "function",
        conceptId: "seed-position",
        id: "seed-path",
        samples: [
          [1, 0, 0],
          [1, 0, 0]
        ],
        type: "parametricCurve"
      },
      {
        colorRole: "probe",
        conceptId: "flow-probe",
        id: "flow-probe",
        pathObjectId: "seed-path",
        type: "movingPoint"
      }
    ],
    sceneId: "dt-vector-field-frame-audit-test",
    timeline: [{ duration: 1, type: "wait" }],
    vectorFieldUpdaters: [
      {
        coordinateMode: "world",
        id: "flow-probe-dt-updater",
        objectId: "flow-probe",
        speedScale: 1,
        system: { matrix: [[1, 0], [0, 0]], type: "linear2d" },
        type: "moveAlongVectorField"
      }
    ]
  };
}

test("samples authored transform frames through the same runtime evidence path as playback", () => {
  const scene = buildFunctionGraphSpec();
  const audit = buildMathSceneFrameAudit(scene, { fps: 5 });
  const activeFrames = audit.frames.filter((frame) => frame.activeAnimationPlanId === "function-curve-attention-lift");
  const composedFrames = audit.frames.filter((frame) => frame.activeStep === "animationComposition");
  const overlapFrame = composedFrames.find((frame) =>
    frame.activeAnimationPlanIds === "function-curve-attention-lift,function-probe-attention-pulse"
  );
  const completedFrame = audit.frames.find((frame) => frame.elapsedSeconds >= 8.64 && frame.activeAnimationPlanId === "function-probe-attention-pulse");

  assert.equal(audit.sceneId, "mais-manim-function-graph");
  assert.equal(audit.sourceContract, SCENE_FRAME_AUDIT_SOURCE_CONTRACT);
  assert.equal(audit.sourceContract, expectedFrameAuditSourceContract);
  assert.equal(audit.fps, 5);
  assert.equal(audit.frameInterval, 0.2);
  assert.equal(audit.samplingMode, "full-playback");
  assert.equal(audit.skipAnimations, false);
  assert.equal(audit.authoredAnimationPlanCount, 2);
  assert.ok(audit.activeAnimationFrameCount >= activeFrames.length);
  assert.equal(audit.transformFrameCount, composedFrames.length);
  assert.ok(activeFrames.length >= 2);
  assert.ok(overlapFrame, "audit should include an overlap frame with both laggedStart child plans active");
  assert.equal(overlapFrame?.activeAnimationObjectId, "moving-probe");
  assert.equal(overlapFrame?.deltaSeconds, 0.2);
  assert.equal(overlapFrame?.activeAnimationTargetObjectId, "moving-probe:attention-target");
  assert.equal(overlapFrame?.activeAnimationNodeCount, 5);
  assert.equal(overlapFrame?.subAlphaFamilyZipCoveredNodeCount, 4);
  assert.equal(overlapFrame?.subAlphaFamilyZipMissingNodeCount, 1);
  assert.equal(overlapFrame?.subAlphaFamilyZipTupleCount, 2);
  assert.equal(overlapFrame?.subAlphaFamilyZipUncoveredObjectIds, "function-curve");
  assert.equal(overlapFrame?.transformInterpolateFieldNodeCount, 5);
  assert.equal(overlapFrame?.transformInterpolateFieldPointlikeCount, 74);
  assert.equal(overlapFrame?.transformInterpolateFieldNonPointCount, 13);
  assert.equal(overlapFrame?.transformInterpolateFieldStyleNodeCount, 3);
  assert.equal(overlapFrame?.transformInterpolateFieldUniformNodeCount, 5);
  assert.equal(overlapFrame?.transformInterpolateFieldBoundingBoxNodeCount, 5);
  assert.equal(overlapFrame?.transformInterpolateFieldArcPathNodeCount, 0);
  assert.equal(overlapFrame?.transformInterpolateFieldStraightPathNodeCount, 5);
  assert.equal(overlapFrame?.transformInterpolateFieldObjectIds, "function-curve,moving-probe,probe-trace");
  assert.equal(overlapFrame?.transformInterpolateFieldPathSummary, "straight:5");
  assert.equal(overlapFrame?.transformInterpolateFieldPointlikeSummary, "point=2/2;polyline=3/72");
  assert.equal(completedFrame?.activeAnimationProgress, 1);
});

test("chains previous runtime state for dt-aware updater motion in sampled FrameAudit frames", () => {
  const scene = buildDtVectorFieldAuditSpec();
  const audit = buildMathSceneFrameAudit(scene, { fps: 2 });
  const summary = summarizeMathSceneFrameAudit(audit) as ReturnType<typeof summarizeMathSceneFrameAudit> & {
    mobjectPointFrameCount: number;
    mobjectPointIds: string[];
    mobjectPointPositionRangeSummary: string;
    moveAlongVectorFieldDeltaSummary: string;
    moveAlongVectorFieldDisplacementMagnitudeRangeSummary: string;
    moveAlongVectorFieldFrameCount: number;
    moveAlongVectorFieldMovedFrameCount: number;
    moveAlongVectorFieldObjectIds: string[];
    moveAlongVectorFieldSourceContract: string;
    moveAlongVectorFieldStatusSummary: string;
    moveAlongVectorFieldSummary: string;
  };
  const attributes = frameAuditDataAttributes(summary);

  assert.deepEqual(audit.frames.map((frame) => frame.deltaSeconds), [0, 0.5, 0.5]);
  assert.equal(summary.mobjectPointFrameCount, 3);
  assert.deepEqual(summary.mobjectPointIds, ["flow-probe"]);
  assert.equal(
    summary.mobjectPointPositionRangeSummary,
    "flow-probe:x=1.000..2.250;y=0.000..0.000;z=0.000..0.000"
  );
  assert.equal(summary.moveAlongVectorFieldFrameCount, 3);
  assert.equal(summary.moveAlongVectorFieldMovedFrameCount, 3);
  assert.deepEqual(summary.moveAlongVectorFieldObjectIds, ["flow-probe"]);
  assert.equal(
    summary.moveAlongVectorFieldDeltaSummary,
    "flow-probe-dt-updater=0.000s:1,flow-probe-dt-updater=0.500s:2"
  );
  assert.equal(
    summary.moveAlongVectorFieldDisplacementMagnitudeRangeSummary,
    "0.000..0.000:1,0.500..0.500:1,0.750..0.750:1"
  );
  assert.equal(
    summary.moveAlongVectorFieldStatusSummary,
    "moved=1;missing-anchor=0;non-finite-vector=0;out-of-bounds=0:3"
  );
  assert.match(summary.moveAlongVectorFieldSummary, /vector=1\.500\.\.1\.500:displacement=0\.750\.\.0\.750:1/);
  assert.equal(summary.moveAlongVectorFieldSourceContract, MOVE_ALONG_VECTOR_FIELD_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-frame-audit-mobject-point-frame-count"], "3");
  assert.equal(attributes["data-viz-manim-frame-audit-mobject-point-ids"], "flow-probe");
  assert.equal(
    attributes["data-viz-manim-frame-audit-mobject-point-position-range-summary"],
    "flow-probe:x=1.000..2.250;y=0.000..0.000;z=0.000..0.000"
  );
  assert.equal(attributes["data-viz-manim-frame-audit-move-along-vector-field-frame-count"], "3");
  assert.equal(attributes["data-viz-manim-frame-audit-move-along-vector-field-moved-frame-count"], "3");
  assert.equal(attributes["data-viz-manim-frame-audit-move-along-vector-field-object-ids"], "flow-probe");
  assert.equal(
    attributes["data-viz-manim-frame-audit-move-along-vector-field-delta-summary"],
    "flow-probe-dt-updater=0.000s:1,flow-probe-dt-updater=0.500s:2"
  );
  assert.equal(
    attributes["data-viz-manim-frame-audit-move-along-vector-field-displacement-magnitude-range-summary"],
    "0.000..0.000:1,0.500..0.500:1,0.750..0.750:1"
  );
  assert.equal(
    attributes["data-viz-manim-frame-audit-move-along-vector-field-status-summary"],
    "moved=1;missing-anchor=0;non-finite-vector=0;out-of-bounds=0:3"
  );
});

test("audits ValueTracker hidden mobject ranges across sampled update frames", () => {
  const scene = buildAnimatedTrackerAuditSpec();
  const audit = buildMathSceneFrameAudit(scene, { fps: 2 });
  const summary = summarizeMathSceneFrameAudit(audit) as ReturnType<typeof summarizeMathSceneFrameAudit> & {
    trackerAnimateFrameCount: number;
    trackerHiddenMobjectIds: string[];
    trackerIds: string[];
    trackerNormalizedRangeSummary: string;
    trackerSourceContract: string;
    trackerSourceSummary: string;
    trackerSummary: string;
    trackerUniformValueRangeSummary: string;
  };
  const attributes = frameAuditDataAttributes(summary);

  assert.equal(summary.trackerSourceContract, VALUE_TRACKER_SOURCE_CONTRACT);
  assert.deepEqual(summary.trackerIds, ["phase-curve:progress", "phase-tracker", "timeline", "timeline:progress"]);
  assert.deepEqual(summary.trackerHiddenMobjectIds, [
    "tracker:phase-curve:progress",
    "tracker:phase-tracker",
    "tracker:timeline",
    "tracker:timeline:progress"
  ]);
  assert.equal(summary.trackerAnimateFrameCount, 5);
  assert.equal(summary.trackerSourceSummary, "object=1,parameter=0,timeline=2,value=1");
  assert.equal(
    summary.trackerUniformValueRangeSummary,
    "tracker:phase-curve:progress:value=1.000..1.000|tracker:phase-tracker:value=0.000..1.000|tracker:timeline:value=0.000..3.000|tracker:timeline:progress:value=0.000..1.000"
  );
  assert.equal(
    summary.trackerNormalizedRangeSummary,
    "tracker:phase-curve:progress:normalized=1.000..1.000|tracker:phase-tracker:normalized=0.000..1.000|tracker:timeline:normalized=0.000..1.000|tracker:timeline:progress:normalized=0.000..1.000"
  );
  assert.equal(
    summary.trackerSummary,
    "frameValueTrackers:frame-audit-value-tracker-scene:frames=7:trackers=4:hidden=4:animateFrames=5:sources=object=1,parameter=0,timeline=2,value=1:ranges=tracker:phase-curve:progress:value=1.000..1.000|tracker:phase-tracker:value=0.000..1.000|tracker:timeline:value=0.000..3.000|tracker:timeline:progress:value=0.000..1.000"
  );
  assert.equal(attributes["data-viz-manim-frame-audit-value-tracker-source-contract"], VALUE_TRACKER_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-frame-audit-value-tracker-animate-frame-count"], "5");
  assert.equal(attributes["data-viz-manim-frame-audit-value-tracker-hidden-mobject-ids"], "tracker:phase-curve:progress,tracker:phase-tracker,tracker:timeline,tracker:timeline:progress");
  assert.equal(attributes["data-viz-manim-frame-audit-value-tracker-ids"], "phase-curve:progress,phase-tracker,timeline,timeline:progress");
  assert.equal(attributes["data-viz-manim-frame-audit-value-tracker-summary"], summary.trackerSummary);
});

test("audits CameraFrame mobject interpolation across sampled update frames", () => {
  const scene = buildFunctionGraphSpec();
  const audit = buildMathSceneFrameAudit(scene, { fps: 5 });
  const summary = summarizeMathSceneFrameAudit(audit) as ReturnType<typeof summarizeMathSceneFrameAudit> & {
    cameraFrameActiveShotIds: string[];
    cameraFrameCameraToFrameCount: number;
    cameraFrameCurrentFrameIds: string[];
    cameraFrameFiniteMatrixEntryFrameCount: number;
    cameraFrameFixedOverlayFrameCount: number;
    cameraFrameFovRange: string;
    cameraFrameFrameCount: number;
    cameraFrameGammaRange: string;
    cameraFramePhiRange: string;
    cameraFramePositionRangeSummary: string;
    cameraFrameProgressRange: string;
    cameraFrameSourceContract: string;
    cameraFrameSummary: string;
    cameraFrameTargetRangeSummary: string;
    cameraFrameThetaRange: string;
    cameraFrameUniformCenterRangeSummary: string;
    cameraFrameUniformSummary: string;
    cameraFrameViewInverseMaxError: number;
    cameraFrameViewInverseReadyFrameCount: number;
  };
  const attributes = frameAuditDataAttributes(summary);

  assert.equal(summary.cameraFrameSourceContract, CAMERA_FRAME_SOURCE_CONTRACT);
  assert.equal(summary.cameraFrameFrameCount, audit.frames.length);
  assert.equal(summary.cameraFrameCameraToFrameCount, 7);
  assert.deepEqual(summary.cameraFrameActiveShotIds, ["curve-detail", "overview"]);
  assert.deepEqual(summary.cameraFrameCurrentFrameIds, ["overview", "overview->curve-detail"]);
  assert.equal(summary.cameraFrameProgressRange, "0.036..1.000");
  assert.equal(summary.cameraFrameFovRange, "44.010..48.000");
  assert.equal(summary.cameraFrameThetaRange, "0.638..0.692");
  assert.equal(summary.cameraFramePhiRange, "0.343..0.362");
  assert.equal(summary.cameraFrameGammaRange, "0.000..0.000");
  assert.equal(summary.cameraFrameUniformCenterRangeSummary, "x=0.000..0.200;y=0.780..0.950;z=0.000..0.000");
  assert.equal(summary.cameraFramePositionRangeSummary, "x=2.203..3.400;y=2.152..2.800;z=2.703..4.100");
  assert.equal(summary.cameraFrameTargetRangeSummary, "x=0.000..0.200;y=0.780..0.950;z=0.000..0.000");
  assert.equal(summary.cameraFrameFiniteMatrixEntryFrameCount, 5376);
  assert.equal(summary.cameraFrameFixedOverlayFrameCount, 168);
  assert.equal(summary.cameraFrameViewInverseMaxError, 0);
  assert.equal(summary.cameraFrameViewInverseReadyFrameCount, audit.frames.length);
  assert.equal(summary.cameraFrameUniformSummary, "uniforms=center,fovy,orientationQuaternion,shape:56");
  assert.equal(
    summary.cameraFrameSummary,
    "frameCameraFrame:mais-manim-function-graph:frames=56:cameraToFrames=7:active=curve-detail,overview:ids=overview,overview->curve-detail:progress=0.036..1.000:fov=44.010..48.000:theta=0.638..0.692:phi=0.343..0.362:fixed=168:finiteMatrices=5376:viewInverseReady=56"
  );
  assert.equal(attributes["data-viz-manim-frame-audit-camera-frame-source-contract"], CAMERA_FRAME_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-frame-audit-camera-frame-camera-to-frame-count"], "7");
  assert.equal(attributes["data-viz-manim-frame-audit-camera-frame-progress-range"], "0.036..1.000");
  assert.equal(attributes["data-viz-manim-frame-audit-camera-frame-summary"], summary.cameraFrameSummary);
});

test("audits fixed-in-frame FormulaLayer stability during CameraFrame motion", () => {
  const scene = buildFunctionGraphSpec();
  const audit = buildMathSceneFrameAudit(scene, { fps: 5 });
  const summary = summarizeMathSceneFrameAudit(audit) as ReturnType<typeof summarizeMathSceneFrameAudit> & {
    formulaLayerActiveObjectIds: string[];
    formulaLayerActiveObjectSummary: string;
    formulaLayerActiveTokenCountRange: string;
    formulaLayerBoundTokenCountRange: string;
    formulaLayerCameraToFrameCount: number;
    formulaLayerCameraToScreenFixedFrameCount: number;
    formulaLayerFrameCount: number;
    formulaLayerScreenFixedFrameCount: number;
    formulaLayerSourceContract: string;
    formulaLayerSummary: string;
    formulaLayerTokenCountRange: string;
  };
  const attributes = frameAuditDataAttributes(summary);

  assert.equal(summary.formulaLayerSourceContract, FORMULA_LAYER_SOURCE_CONTRACT);
  assert.equal(summary.formulaLayerFrameCount, audit.frames.length);
  assert.equal(summary.formulaLayerScreenFixedFrameCount, audit.frames.length);
  assert.equal(summary.formulaLayerCameraToFrameCount, 7);
  assert.equal(summary.formulaLayerCameraToScreenFixedFrameCount, 7);
  assert.equal(summary.formulaLayerTokenCountRange, "2.000..2.000");
  assert.equal(summary.formulaLayerBoundTokenCountRange, "2.000..2.000");
  assert.equal(summary.formulaLayerActiveTokenCountRange, "0.000..1.000");
  assert.deepEqual(summary.formulaLayerActiveObjectIds, ["function-curve"]);
  assert.equal(summary.formulaLayerActiveObjectSummary, "function-curve:37");
  assert.equal(
    summary.formulaLayerSummary,
    "frameFormulaLayer:mais-manim-function-graph:frames=56:screenFixed=56:cameraTo=7:cameraFixed=7:tokens=2.000..2.000:bound=2.000..2.000:activeTokens=0.000..1.000:activeObjects=function-curve:37"
  );
  assert.equal(attributes["data-viz-manim-frame-audit-formula-layer-source-contract"], FORMULA_LAYER_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-frame-audit-formula-layer-screen-fixed-frame-count"], String(audit.frames.length));
  assert.equal(attributes["data-viz-manim-frame-audit-formula-layer-camera-to-screen-fixed-frame-count"], "7");
  assert.equal(attributes["data-viz-manim-frame-audit-formula-layer-summary"], summary.formulaLayerSummary);
});

test("audits Formula SVG morph runtime frames across sampled playback", () => {
  const scene = buildFunctionGraphSpec();
  const audit = buildMathSceneFrameAudit(scene, { fps: 5 });
  const summary = summarizeMathSceneFrameAudit(audit) as ReturnType<typeof summarizeMathSceneFrameAudit> & {
    formulaSvgMorphRuntimeCompatiblePathFrameCount: number;
    formulaSvgMorphRuntimeFormulaIds: string[];
    formulaSvgMorphRuntimeFrameIds: string[];
    formulaSvgMorphRuntimeFramePathPreview: string;
    formulaSvgMorphRuntimeIssueCount: number;
    formulaSvgMorphRuntimePathFrameCount: number;
    formulaSvgMorphRuntimeProgressRange: string;
    formulaSvgMorphRuntimeSampledFrameCount: number;
    formulaSvgMorphRuntimeSourceContract: string;
    formulaSvgMorphRuntimeSummary: string;
  };
  const attributes = frameAuditDataAttributes(summary);

  assert.equal(summary.formulaSvgMorphRuntimeSourceContract, FORMULA_SVG_MORPH_RUNTIME_SOURCE_CONTRACT);
  assert.equal(summary.formulaSvgMorphRuntimeSampledFrameCount, audit.frames.length);
  assert.equal(summary.formulaSvgMorphRuntimePathFrameCount, audit.frames.length);
  assert.equal(summary.formulaSvgMorphRuntimeCompatiblePathFrameCount, audit.frames.length);
  assert.equal(summary.formulaSvgMorphRuntimeIssueCount, 0);
  assert.deepEqual(summary.formulaSvgMorphRuntimeFormulaIds, ["function-formula"]);
  assert.deepEqual(summary.formulaSvgMorphRuntimeFrameIds, ["function-token-to-point-token"]);
  assert.equal(summary.formulaSvgMorphRuntimeProgressRange, "0.000..1.000");
  assert.equal(summary.formulaSvgMorphRuntimeFramePathPreview, "M 0 0 C 3.333333 0 6.666667 0 10 0 C 10 3.333333 10 6.666667 10 10 C 6.666667 6.666667 3.333333 3.333333 0 0 Z");
  assert.equal(
    summary.formulaSvgMorphRuntimeSummary,
    "frameSvgMorphRuntime:mais-manim-function-graph:sampleFrames=56:pathFrames=56:compatible=56:issues=0:progress=0.000..1.000:ids=function-token-to-point-token"
  );
  assert.equal(
    attributes["data-viz-manim-frame-audit-svg-morph-runtime-source-contract"],
    FORMULA_SVG_MORPH_RUNTIME_SOURCE_CONTRACT
  );
  assert.equal(attributes["data-viz-manim-frame-audit-svg-morph-runtime-sampled-frame-count"], String(audit.frames.length));
  assert.equal(attributes["data-viz-manim-frame-audit-svg-morph-runtime-path-frame-count"], String(audit.frames.length));
  assert.equal(attributes["data-viz-manim-frame-audit-svg-morph-runtime-compatible-path-frame-count"], String(audit.frames.length));
  assert.equal(attributes["data-viz-manim-frame-audit-svg-morph-runtime-progress-range"], "0.000..1.000");
  assert.equal(attributes["data-viz-manim-frame-audit-svg-morph-runtime-frame-ids"], "function-token-to-point-token");
  assert.equal(attributes["data-viz-manim-frame-audit-svg-morph-runtime-frame-path-preview"], "M 0 0 C 3.333333 0 6.666667 0 10 0 C 10 3.333333 10 6.666667 10 10 C 6.666667 6.666667 3.333333 3.333333 0 0 Z");
  assert.equal(attributes["data-viz-manim-frame-audit-svg-morph-runtime-summary"], summary.formulaSvgMorphRuntimeSummary);
});

test("builds a compact director trace tying camera, FormulaLayer, and SVG morph keyframes", () => {
  const scene = buildFunctionGraphSpec();
  const audit = buildMathSceneFrameAudit(scene, { fps: 5 });
  const summary = summarizeMathSceneFrameAudit(audit) as ReturnType<typeof summarizeMathSceneFrameAudit> & {
    directorTraceCameraToKeyFrameCount: number;
    directorTraceFormulaFixedKeyFrameCount: number;
    directorTraceKeyFrameCount: number;
    directorTraceSourceContract: string;
    directorTraceSummary: string;
    directorTraceSvgMorphProgressRange: string;
    directorTraceTimeline: string;
  };
  const attributes = frameAuditDataAttributes(summary);

  assert.equal(summary.directorTraceSourceContract, expectedFrameDirectorTraceSourceContract);
  assert.equal(summary.directorTraceKeyFrameCount, 7);
  assert.equal(summary.directorTraceCameraToKeyFrameCount, 1);
  assert.equal(summary.directorTraceFormulaFixedKeyFrameCount, 7);
  assert.equal(summary.directorTraceSvgMorphProgressRange, "0.000..1.000");
  assert.equal(
    summary.directorTraceTimeline,
    [
      "0.000:revealCurve:shot=overview:frame=overview:fixed=1:tokens=1/2:morph=0.000",
      "2.600:moveAlongPath:shot=overview:frame=overview:fixed=1:tokens=1/2:morph=0.056",
      "6.200:sweepParameter:shot=overview:frame=overview:fixed=1:tokens=1/2:morph=0.074",
      "7.400:animationComposition:shot=overview:frame=overview:fixed=1:tokens=0/2:morph=0.053",
      "8.800:cameraTo:shot=curve-detail:frame=overview->curve-detail:fixed=1:tokens=0/2:morph=0.036",
      "10.200:wait:shot=overview:frame=overview:fixed=1:tokens=0/2:morph=0.200",
      "10.840:wait:shot=overview:frame=overview:fixed=1:tokens=0/2:morph=1.000"
    ].join("|")
  );
  assert.equal(
    summary.directorTraceSummary,
    "frameDirectorTrace:mais-manim-function-graph:keyframes=7:cameraTo=1:fixed=7:morph=0.000..1.000"
  );
  assert.equal(
    attributes["data-viz-manim-frame-audit-director-trace-source-contract"],
    expectedFrameDirectorTraceSourceContract
  );
  assert.equal(attributes["data-viz-manim-frame-audit-director-trace-key-frame-count"], "7");
  assert.equal(attributes["data-viz-manim-frame-audit-director-trace-camera-to-key-frame-count"], "1");
  assert.equal(attributes["data-viz-manim-frame-audit-director-trace-formula-fixed-key-frame-count"], "7");
  assert.equal(attributes["data-viz-manim-frame-audit-director-trace-svg-morph-progress-range"], "0.000..1.000");
  assert.equal(attributes["data-viz-manim-frame-audit-director-trace-timeline"], summary.directorTraceTimeline);
  assert.equal(attributes["data-viz-manim-frame-audit-director-trace-summary"], summary.directorTraceSummary);
});

test("builds a compact Scene.play lifecycle trace for sampled frame QA", () => {
  const scene = buildFunctionGraphSpec();
  const audit = buildMathSceneFrameAudit(scene, { fps: 5 });
  const summary = summarizeMathSceneFrameAudit(audit) as ReturnType<typeof summarizeMathSceneFrameAudit> & {
    playLifecycleTraceAnimationPlanSummary: string;
    playLifecycleTraceKeyFrameCount: number;
    playLifecycleTracePhaseSummary: string;
    playLifecycleTraceSourceContract: string;
    playLifecycleTraceSummary: string;
    playLifecycleTraceTimeline: string;
  };
  const attributes = frameAuditDataAttributes(summary);

  assert.equal(summary.playLifecycleTraceSourceContract, SCENE_PLAYBACK_SOURCE_CONTRACT);
  assert.equal(summary.playLifecycleTraceKeyFrameCount, 9);
  assert.equal(summary.playLifecycleTracePhaseSummary, "begin:1,progress:51,finish:4");
  assert.equal(
    summary.playLifecycleTraceAnimationPlanSummary,
    "function-curve-attention-lift:20,function-probe-attention-pulse:18"
  );
  assert.equal(
    summary.playLifecycleTraceTimeline,
    [
      "0.000:begin:revealCurve:plans=none:primary=none:progress=1.000:updaters=1/3",
      "0.200:progress:revealCurve:plans=none:primary=none:progress=1.000:updaters=1/3",
      "2.400:finish:revealCurve:plans=none:primary=none:progress=1.000:updaters=1/3",
      "2.600:progress:moveAlongPath:plans=none:primary=none:progress=1.000:updaters=4/0",
      "6.000:finish:moveAlongPath:plans=none:primary=none:progress=1.000:updaters=4/0",
      "6.200:progress:sweepParameter:plans=none:primary=none:progress=1.000:updaters=4/0",
      "7.200:finish:sweepParameter:plans=function-curve-attention-lift:primary=function-curve-attention-lift:progress=0.000:updaters=4/0",
      "7.400:progress:animationComposition:plans=function-curve-attention-lift:primary=function-curve-attention-lift:progress=0.074:updaters=0/4",
      "10.840:finish:wait:plans=function-curve-attention-lift,function-probe-attention-pulse:primary=function-probe-attention-pulse:progress=1.000:updaters=4/0"
    ].join("|")
  );
  assert.equal(
    summary.playLifecycleTraceSummary,
    "framePlayLifecycleTrace:mais-manim-function-graph:keyframes=9:phases=begin:1,progress:51,finish:4:plans=function-curve-attention-lift:20,function-probe-attention-pulse:18"
  );
  assert.equal(
    attributes["data-viz-manim-frame-audit-play-lifecycle-trace-source-contract"],
    SCENE_PLAYBACK_SOURCE_CONTRACT
  );
  assert.equal(attributes["data-viz-manim-frame-audit-play-lifecycle-trace-key-frame-count"], "9");
  assert.equal(attributes["data-viz-manim-frame-audit-play-lifecycle-trace-phase-summary"], "begin:1,progress:51,finish:4");
  assert.equal(
    attributes["data-viz-manim-frame-audit-play-lifecycle-trace-animation-plan-summary"],
    "function-curve-attention-lift:20,function-probe-attention-pulse:18"
  );
  assert.equal(attributes["data-viz-manim-frame-audit-play-lifecycle-trace-timeline"], summary.playLifecycleTraceTimeline);
  assert.equal(attributes["data-viz-manim-frame-audit-play-lifecycle-trace-summary"], summary.playLifecycleTraceSummary);
});

test("summarizes full Scene.play event stream boundaries for pre and post play QA", () => {
  const scene = buildFunctionGraphSpec();
  const audit = buildMathSceneFrameAudit(scene, { fps: 5 });
  const summary = summarizeMathSceneFrameAudit(audit) as ReturnType<typeof summarizeMathSceneFrameAudit> & {
    playLifecycleEventCount: number;
    playLifecycleEventFirstKey: string;
    playLifecycleEventLastKey: string;
    playLifecycleEventPhaseSummary: string;
    playLifecycleEventSourceContract: string;
    playLifecycleEventSummary: string;
  };
  const attributes = frameAuditDataAttributes(summary);

  assert.equal(summary.playLifecycleEventSourceContract, SCENE_PLAYBACK_SOURCE_CONTRACT);
  assert.equal(summary.playLifecycleEventCount, 75);
  assert.equal(summary.playLifecycleEventPhaseSummary, "prePlay:6,begin:6,progress:51,finish:6,postPlay:6");
  assert.equal(summary.playLifecycleEventFirstKey, "0:prePlay@0.000");
  assert.equal(summary.playLifecycleEventLastKey, "5:postPlay@10.840");
  assert.equal(
    summary.playLifecycleEventSummary,
    "playLifecycleEvents:mais-manim-function-graph:events=75:phases=prePlay:6,begin:6,progress:51,finish:6,postPlay:6:first=0:prePlay@0.000:last=5:postPlay@10.840"
  );
  assert.equal(
    attributes["data-viz-manim-frame-audit-play-lifecycle-event-source-contract"],
    SCENE_PLAYBACK_SOURCE_CONTRACT
  );
  assert.equal(attributes["data-viz-manim-frame-audit-play-lifecycle-event-count"], "75");
  assert.equal(
    attributes["data-viz-manim-frame-audit-play-lifecycle-event-phase-summary"],
    "prePlay:6,begin:6,progress:51,finish:6,postPlay:6"
  );
  assert.equal(attributes["data-viz-manim-frame-audit-play-lifecycle-event-first-key"], "0:prePlay@0.000");
  assert.equal(attributes["data-viz-manim-frame-audit-play-lifecycle-event-last-key"], "5:postPlay@10.840");
  assert.equal(attributes["data-viz-manim-frame-audit-play-lifecycle-event-summary"], summary.playLifecycleEventSummary);
});

test("summarizes frame audit coverage for S11/S22 promotion evidence", () => {
  const scene = buildFunctionGraphSpec();
  const audit = buildMathSceneFrameAudit(scene, { fps: 5 });
  const summary = summarizeMathSceneFrameAudit(audit);

  assert.deepEqual(summary, {
    activeAnimationPlanIds: ["function-curve-attention-lift", "function-probe-attention-pulse"],
    activeAnimationFrameCount: audit.activeAnimationFrameCount,
    activeAnimationNodeProgressSummary: expectedFullActiveAnimationNodeProgressSummary,
    animationPlanFrameSummary: "function-curve-attention-lift:20,function-probe-attention-pulse:18",
    authoredAnimationPlanCount: 2,
    cameraFrameActiveShotIds: ["curve-detail", "overview"],
    cameraFrameCameraToFrameCount: 7,
    cameraFrameCurrentFrameIds: ["overview", "overview->curve-detail"],
    cameraFrameFiniteMatrixEntryFrameCount: 5376,
    cameraFrameFixedOverlayFrameCount: 168,
    cameraFrameFovRange: "44.010..48.000",
    cameraFrameFrameCount: audit.frames.length,
    cameraFrameGammaRange: "0.000..0.000",
    cameraFramePhiRange: "0.343..0.362",
    cameraFramePositionRangeSummary: "x=2.203..3.400;y=2.152..2.800;z=2.703..4.100",
    cameraFrameProgressRange: "0.036..1.000",
    cameraFrameSourceContract: CAMERA_FRAME_SOURCE_CONTRACT,
    cameraFrameSummary:
      "frameCameraFrame:mais-manim-function-graph:frames=56:cameraToFrames=7:active=curve-detail,overview:ids=overview,overview->curve-detail:progress=0.036..1.000:fov=44.010..48.000:theta=0.638..0.692:phi=0.343..0.362:fixed=168:finiteMatrices=5376:viewInverseReady=56",
    cameraFrameTargetRangeSummary: "x=0.000..0.200;y=0.780..0.950;z=0.000..0.000",
    cameraFrameThetaRange: "0.638..0.692",
    cameraFrameUniformCenterRangeSummary: "x=0.000..0.200;y=0.780..0.950;z=0.000..0.000",
    cameraFrameUniformSummary: "uniforms=center,fovy,orientationQuaternion,shape:56",
    cameraFrameViewInverseMaxError: 0,
    cameraFrameViewInverseReadyFrameCount: audit.frames.length,
    cameraShotSummary: "overview:49,curve-detail:7",
    captureHeight: 450,
    captureWidth: 800,
    directorTraceCameraToKeyFrameCount: 1,
    directorTraceFormulaFixedKeyFrameCount: 7,
    directorTraceKeyFrameCount: 7,
    directorTraceSourceContract: expectedFrameDirectorTraceSourceContract,
    directorTraceSummary: "frameDirectorTrace:mais-manim-function-graph:keyframes=7:cameraTo=1:fixed=7:morph=0.000..1.000",
    directorTraceSvgMorphProgressRange: "0.000..1.000",
    directorTraceTimeline:
      "0.000:revealCurve:shot=overview:frame=overview:fixed=1:tokens=1/2:morph=0.000|2.600:moveAlongPath:shot=overview:frame=overview:fixed=1:tokens=1/2:morph=0.056|6.200:sweepParameter:shot=overview:frame=overview:fixed=1:tokens=1/2:morph=0.074|7.400:animationComposition:shot=overview:frame=overview:fixed=1:tokens=0/2:morph=0.053|8.800:cameraTo:shot=curve-detail:frame=overview->curve-detail:fixed=1:tokens=0/2:morph=0.036|10.200:wait:shot=overview:frame=overview:fixed=1:tokens=0/2:morph=0.200|10.840:wait:shot=overview:frame=overview:fixed=1:tokens=0/2:morph=1.000",
    frameDeltaSummary: expectedFullFrameDeltaSummary,
    fps: 5,
    frameInterval: 0.2,
    frameCount: audit.frames.length,
    formulaMobileFrameCount: 0,
    formulaLayerActiveObjectIds: ["function-curve"],
    formulaLayerActiveObjectSummary: "function-curve:37",
    formulaLayerActiveTokenCountRange: "0.000..1.000",
    formulaLayerBoundTokenCountRange: "2.000..2.000",
    formulaLayerCameraToFrameCount: 7,
    formulaLayerCameraToScreenFixedFrameCount: 7,
    formulaLayerFrameCount: audit.frames.length,
    formulaLayerScreenFixedFrameCount: audit.frames.length,
    formulaLayerSourceContract: FORMULA_LAYER_SOURCE_CONTRACT,
    formulaLayerSummary:
      "frameFormulaLayer:mais-manim-function-graph:frames=56:screenFixed=56:cameraTo=7:cameraFixed=7:tokens=2.000..2.000:bound=2.000..2.000:activeTokens=0.000..1.000:activeObjects=function-curve:37",
    formulaLayerTokenCountRange: "2.000..2.000",
    formulaSvgMorphRuntimeCompatiblePathFrameCount: audit.frames.length,
    formulaSvgMorphRuntimeFormulaIds: ["function-formula"],
    formulaSvgMorphRuntimeFrameIds: ["function-token-to-point-token"],
    formulaSvgMorphRuntimeFramePathPreview: "M 0 0 C 3.333333 0 6.666667 0 10 0 C 10 3.333333 10 6.666667 10 10 C 6.666667 6.666667 3.333333 3.333333 0 0 Z",
    formulaSvgMorphRuntimeIssueCount: 0,
    formulaSvgMorphRuntimePathFrameCount: audit.frames.length,
    formulaSvgMorphRuntimeProgressRange: "0.000..1.000",
    formulaSvgMorphRuntimeSampledFrameCount: audit.frames.length,
    formulaSvgMorphRuntimeSourceContract: FORMULA_SVG_MORPH_RUNTIME_SOURCE_CONTRACT,
    formulaSvgMorphRuntimeSummary:
      "frameSvgMorphRuntime:mais-manim-function-graph:sampleFrames=56:pathFrames=56:compatible=56:issues=0:progress=0.000..1.000:ids=function-token-to-point-token",
    maxActiveAnimationProgress: 1,
    maxUpdaterActiveCount: 4,
    maxUpdaterSuspendedCount: 4,
    minActiveAnimationProgress: 0,
    mobjectPointFrameCount: audit.frames.length,
    mobjectPointIds: ["moving-probe"],
    mobjectPointPositionRangeSummary:
      "moving-probe:x=-2.128..2.350;y=0.000..1.982;z=-0.042..0.050",
    moveAlongVectorFieldDeltaSummary: "none",
    moveAlongVectorFieldDisplacementMagnitudeRangeSummary: "none",
    moveAlongVectorFieldFrameCount: 0,
    moveAlongVectorFieldMovedFrameCount: 0,
    moveAlongVectorFieldObjectIds: [],
    moveAlongVectorFieldSourceContract: MOVE_ALONG_VECTOR_FIELD_SOURCE_CONTRACT,
    moveAlongVectorFieldStatusSummary: "none",
    moveAlongVectorFieldSummary: "none",
    playLifecycleEventCount: 75,
    playLifecycleEventFirstKey: "0:prePlay@0.000",
    playLifecycleEventLastKey: "5:postPlay@10.840",
    playLifecycleEventPhaseSummary: "prePlay:6,begin:6,progress:51,finish:6,postPlay:6",
    playLifecycleEventSourceContract: SCENE_PLAYBACK_SOURCE_CONTRACT,
    playLifecycleEventSummary:
      "playLifecycleEvents:mais-manim-function-graph:events=75:phases=prePlay:6,begin:6,progress:51,finish:6,postPlay:6:first=0:prePlay@0.000:last=5:postPlay@10.840",
    playLifecycleTraceAnimationPlanSummary: "function-curve-attention-lift:20,function-probe-attention-pulse:18",
    playLifecycleTraceKeyFrameCount: 9,
    playLifecycleTracePhaseSummary: "begin:1,progress:51,finish:4",
    playLifecycleTraceSourceContract: SCENE_PLAYBACK_SOURCE_CONTRACT,
    playLifecycleTraceSummary:
      "framePlayLifecycleTrace:mais-manim-function-graph:keyframes=9:phases=begin:1,progress:51,finish:4:plans=function-curve-attention-lift:20,function-probe-attention-pulse:18",
    playLifecycleTraceTimeline:
      "0.000:begin:revealCurve:plans=none:primary=none:progress=1.000:updaters=1/3|0.200:progress:revealCurve:plans=none:primary=none:progress=1.000:updaters=1/3|2.400:finish:revealCurve:plans=none:primary=none:progress=1.000:updaters=1/3|2.600:progress:moveAlongPath:plans=none:primary=none:progress=1.000:updaters=4/0|6.000:finish:moveAlongPath:plans=none:primary=none:progress=1.000:updaters=4/0|6.200:progress:sweepParameter:plans=none:primary=none:progress=1.000:updaters=4/0|7.200:finish:sweepParameter:plans=function-curve-attention-lift:primary=function-curve-attention-lift:progress=0.000:updaters=4/0|7.400:progress:animationComposition:plans=function-curve-attention-lift:primary=function-curve-attention-lift:progress=0.074:updaters=0/4|10.840:finish:wait:plans=function-curve-attention-lift,function-probe-attention-pulse:primary=function-probe-attention-pulse:progress=1.000:updaters=4/0",
    playbackPhaseSummary: "begin:1,progress:51,finish:4",
    primaryAnimationPlanFrameSummary: "function-curve-attention-lift:2,function-probe-attention-pulse:18",
    primaryAnimationPlanProgressSummary: "function-curve-attention-lift:0.000-0.074,function-probe-attention-pulse:0.049-1.000",
    qualityPreset: "interactive",
    rendererMode: "interactive",
    expectedRenderGroupIds: ["axes", "function-curve", "moving-probe", "probe-trace"],
    renderGroupCoverageReady: true,
    renderGroupMissingFrameCount: 0,
    renderGroupOverlapSummary: "none:56",
    renderGroupSummary: "axes:56,function-curve:56,moving-probe:56,probe-trace:56",
    sampledCameraShotIds: ["overview", "curve-detail"],
    sampledPlaybackPhaseIds: ["begin", "progress", "finish"],
    sampledRenderGroupIds: ["axes", "function-curve", "moving-probe", "probe-trace"],
    samplingMode: "full-playback",
    sampledStepIds: ["revealCurve", "moveAlongPath", "sweepParameter", "animationComposition", "cameraTo", "wait"],
    sceneId: "mais-manim-function-graph",
    skipAnimations: false,
    sourceContract: SCENE_FRAME_AUDIT_SOURCE_CONTRACT,
    stepSummary: "revealCurve:13,moveAlongPath:18,sweepParameter:6,animationComposition:7,cameraTo:7,wait:5",
    transformInterpolateFieldArcPathNodeFrameCount: 0,
    transformInterpolateFieldBoundingBoxNodeFrameCount: 96,
    transformInterpolateFieldFrameCount: 20,
    transformInterpolateFieldNodeFrameCount: 96,
    transformInterpolateFieldNonPointFrameCount: 250,
    transformInterpolateFieldNonPointPolicy: TRANSFORM_PATH_NON_POINT_FIELD_POLICY,
    transformInterpolateFieldObjectIds: ["function-curve", "moving-probe", "probe-trace"],
    transformInterpolateFieldPathSummary: "straight:3:2,straight:5:18",
    transformInterpolateFieldPointlikeFrameCount: 1950,
    transformInterpolateFieldPointlikePolicy: TRANSFORM_PATH_POINTLIKE_FIELD_POLICY,
    transformInterpolateFieldPointlikeSummary:
      "point=1/1;polyline=2/100:1,point=1/1;polyline=2/72:1,point=2/2;polyline=3/100:1,point=2/2;polyline=3/102:1,point=2/2;polyline=3/104:1,point=2/2;polyline=3/106:1,point=2/2;polyline=3/108:1,point=2/2;polyline=3/110:1,point=2/2;polyline=3/112:1,point=2/2;polyline=3/114:1,point=2/2;polyline=3/116:1,point=2/2;polyline=3/118:1,point=2/2;polyline=3/120:1,point=2/2;polyline=3/72:6,point=2/2;polyline=3/98:1",
    transformInterpolateFieldSourceSummary: MOBJECT_INTERPOLATE_DATA_SOURCE_SUMMARY,
    transformInterpolateFieldStraightPathNodeFrameCount: 96,
    transformInterpolateFieldStyleNodeFrameCount: 58,
    transformInterpolateFieldSummary:
      "frameTransformInterpolateFields:mais-manim-function-graph:frames=20:nodes=96:pointlike=1950:nonPoint=250:style=58:uniforms=96:bounds=96:paths=straight:3:2,straight:5:18:kinds=point=1/1;polyline=2/100:1,point=1/1;polyline=2/72:1,point=2/2;polyline=3/100:1,point=2/2;polyline=3/102:1,point=2/2;polyline=3/104:1,point=2/2;polyline=3/106:1,point=2/2;polyline=3/108:1,point=2/2;polyline=3/110:1,point=2/2;polyline=3/112:1,point=2/2;polyline=3/114:1,point=2/2;polyline=3/116:1,point=2/2;polyline=3/118:1,point=2/2;polyline=3/120:1,point=2/2;polyline=3/72:6,point=2/2;polyline=3/98:1:objects=function-curve,moving-probe,probe-trace",
    transformInterpolateFieldUniformNodeFrameCount: 96,
    trackerAnimateFrameCount: 0,
    trackerCount: 10,
    trackerFrameCount: audit.frames.length,
    trackerHiddenMobjectCount: 10,
    trackerHiddenMobjectIds: [
      "tracker:function-curve:progress",
      "tracker:moving-probe:progress",
      "tracker:parameter:comparison",
      "tracker:parameter:depth",
      "tracker:parameter:mode",
      "tracker:parameter:primary",
      "tracker:parameter:secondary",
      "tracker:parameter:value",
      "tracker:timeline",
      "tracker:timeline:progress"
    ],
    trackerIds: [
      "function-curve:progress",
      "moving-probe:progress",
      "parameter:comparison",
      "parameter:depth",
      "parameter:mode",
      "parameter:primary",
      "parameter:secondary",
      "parameter:value",
      "timeline",
      "timeline:progress"
    ],
    trackerNormalizedRangeSummary:
      "tracker:function-curve:progress:normalized=0.000..1.000|tracker:moving-probe:progress:normalized=0.000..1.000|tracker:parameter:comparison:normalized=0.417..0.417|tracker:parameter:depth:normalized=0.350..0.350|tracker:parameter:mode:normalized=0.000..0.000|tracker:parameter:primary:normalized=0.500..0.500|tracker:parameter:secondary:normalized=0.417..0.417|tracker:parameter:value:normalized=0.417..0.500|tracker:timeline:normalized=0.000..1.000|tracker:timeline:progress:normalized=0.000..1.000",
    trackerSourceContract: VALUE_TRACKER_SOURCE_CONTRACT,
    trackerSourceSummary: "object=2,parameter=6,timeline=2,value=0",
    trackerSummary:
      "frameValueTrackers:mais-manim-function-graph:frames=56:trackers=10:hidden=10:animateFrames=0:sources=object=2,parameter=6,timeline=2,value=0:ranges=tracker:function-curve:progress:value=0.000..1.000|tracker:moving-probe:progress:value=0.000..1.000|tracker:parameter:comparison:value=5.000..5.000|tracker:parameter:depth:value=1.400..1.400|tracker:parameter:mode:value=0.000..0.000|tracker:parameter:primary:value=6.000..6.000|tracker:parameter:secondary:value=5.000..5.000|tracker:parameter:value:value=5.000..6.000|tracker:timeline:value=0.000..10.840|tracker:timeline:progress:value=0.000..1.000",
    trackerUniformValueRangeSummary:
      "tracker:function-curve:progress:value=0.000..1.000|tracker:moving-probe:progress:value=0.000..1.000|tracker:parameter:comparison:value=5.000..5.000|tracker:parameter:depth:value=1.400..1.400|tracker:parameter:mode:value=0.000..0.000|tracker:parameter:primary:value=6.000..6.000|tracker:parameter:secondary:value=5.000..5.000|tracker:parameter:value:value=5.000..6.000|tracker:timeline:value=0.000..10.840|tracker:timeline:progress:value=0.000..1.000",
    updaterExecutionActiveCallSequenceSummary: expectedFullUpdaterExecutionActiveCallSequenceSummary,
    updaterExecutionFamilyTraversalSummary: expectedFullUpdaterExecutionFamilyTraversalSummary,
    updaterExecutionOrderSummary: expectedFullUpdaterExecutionOrderSummary,
    updaterExecutionSummary: expectedFullUpdaterExecutionSummary,
    updaterSuspensionOwnedObjectIds: ["function-curve", "moving-probe"],
    updaterSuspensionOwnedObjectSummary: "function-curve:13,function-curve,moving-probe:7,moving-probe:18",
    updaterSuspensionCountSummary: "0/4:7,1/3:13,4/0:36",
    updaterSuspensionPhaseSummary: "animation:38,open:18",
    updaterSuspensionPolicy: UPDATER_SUSPENSION_POLICY,
    updaterSuspensionReasonSummary:
      "suspended-by-animationComposition:function-attention-lagged-start,suspended-by-animationComposition:function-attention-lagged-start,suspended-by-animationComposition:function-attention-lagged-start,suspended-by-animationComposition:function-attention-lagged-start:7,suspended-by-revealCurve,suspended-by-revealCurve,suspended-by-revealCurve:13",
    updaterSuspensionSourceContract: UPDATER_SUSPENSION_SOURCE_CONTRACT,
    updaterSuspensionSuspendedFrameCount: 20,
    updaterSuspensionSuspendedObjectIds: ["function-curve", "moving-probe", "probe-trace"],
    updaterSuspensionSuspendedObjectSummary:
      "function-curve,moving-probe,probe-trace:20",
    updaterSuspensionSuspendedUpdaterFrameCount: 67,
    updaterSuspensionSuspendedUpdaterIds: ["function-curve:always-redraw", "function-curve:reveal", "moving-probe:move", "probe-trace:trace"],
    updaterSuspensionSuspendedUpdaterSummary:
      "function-curve:always-redraw,function-curve:reveal,moving-probe:move,probe-trace:trace:7,function-curve:always-redraw,moving-probe:move,probe-trace:trace:13",
    updaterSuspensionSummary:
      "frameUpdaterSuspension:mais-manim-function-graph:frames=56:suspendedFrames=20:suspendedUpdaterFrames=67:phases=animation:38,open:18:counts=0/4:7,1/3:13,4/0:36:animated=function-curve,moving-probe:suspended=function-curve:always-redraw,function-curve:reveal,moving-probe:move,probe-trace:trace",
    subAlphaCompleteNodeFrameCount: 67,
    subAlphaDelayedNodeFrameCount: 7,
    subAlphaEasedRange: "0.000..1.000",
    subAlphaFamilyZipCoveredNodeFrameCount: 78,
    subAlphaFamilyZipMaxTupleCount: 3,
    subAlphaFamilyZipMissingNodeFrameCount: 18,
    subAlphaFamilyZipPolicy: TRANSFORM_FAMILY_ALIGNMENT_ZIP_POLICY,
    subAlphaFamilyZipSequenceSummary:
      "function-curve|function-curve|function-curve;moving-probe|moving-probe|moving-probe;probe-trace|probe-trace|probe-trace:2,moving-probe|moving-probe|moving-probe;probe-trace|probe-trace|probe-trace:18",
    subAlphaFamilyZipUncoveredObjectIds: ["function-curve"],
    subAlphaFrameCount: 20,
    subAlphaLaggedRange: "0.000..1.000",
    subAlphaLeadingNodeFrameCount: 7,
    subAlphaNodeFrameCount: 96,
    subAlphaNodeWindowSummary: expectedFullSubAlphaNodeWindowSummary,
    subAlphaObjectIds: ["function-curve", "moving-probe", "probe-trace"],
    subAlphaPartialNodeFrameCount: 25,
    subAlphaRateFunctionIds: ["smooth"],
    subAlphaRawRange: "0.000..1.000",
    subAlphaStaggeredNodeFrameCount: 14,
    subAlphaSummary:
      "frameSubAlpha:mais-manim-function-graph:frames=20:nodes=96:raw=0.000..1.000:lag=0.000..1.000:eased=0.000..1.000:staggered=14:lead=7:delay=7:zero=4:partial=25:complete=67:rates=smooth:objects=function-curve,moving-probe,probe-trace",
    subAlphaZeroNodeFrameCount: 4,
    transformFrameCount: audit.transformFrameCount,
    updaterSummary: "1/3:13,4/0:36,0/4:7"
  });
  assert.deepEqual(frameAuditDataAttributes(summary), {
    "data-viz-manim-frame-audit-active-frame-count": String(audit.activeAnimationFrameCount),
    "data-viz-manim-frame-audit-active-animation-node-progress-summary":
      expectedFullActiveAnimationNodeProgressSummary,
    "data-viz-manim-frame-audit-active-plan-ids": "function-curve-attention-lift,function-probe-attention-pulse",
    "data-viz-manim-frame-audit-animation-plan-frame-summary": "function-curve-attention-lift:20,function-probe-attention-pulse:18",
    "data-viz-manim-frame-audit-authored-plan-count": "2",
    "data-viz-manim-frame-audit-camera-shot-summary": "overview:49,curve-detail:7",
    "data-viz-manim-frame-audit-capture-height": "450",
    "data-viz-manim-frame-audit-capture-width": "800",
    "data-viz-manim-frame-audit-director-trace-camera-to-key-frame-count": "1",
    "data-viz-manim-frame-audit-director-trace-formula-fixed-key-frame-count": "7",
    "data-viz-manim-frame-audit-director-trace-key-frame-count": "7",
    "data-viz-manim-frame-audit-director-trace-source-contract": expectedFrameDirectorTraceSourceContract,
    "data-viz-manim-frame-audit-director-trace-summary":
      "frameDirectorTrace:mais-manim-function-graph:keyframes=7:cameraTo=1:fixed=7:morph=0.000..1.000",
    "data-viz-manim-frame-audit-director-trace-svg-morph-progress-range": "0.000..1.000",
    "data-viz-manim-frame-audit-director-trace-timeline":
      "0.000:revealCurve:shot=overview:frame=overview:fixed=1:tokens=1/2:morph=0.000|2.600:moveAlongPath:shot=overview:frame=overview:fixed=1:tokens=1/2:morph=0.056|6.200:sweepParameter:shot=overview:frame=overview:fixed=1:tokens=1/2:morph=0.074|7.400:animationComposition:shot=overview:frame=overview:fixed=1:tokens=0/2:morph=0.053|8.800:cameraTo:shot=curve-detail:frame=overview->curve-detail:fixed=1:tokens=0/2:morph=0.036|10.200:wait:shot=overview:frame=overview:fixed=1:tokens=0/2:morph=0.200|10.840:wait:shot=overview:frame=overview:fixed=1:tokens=0/2:morph=1.000",
    "data-viz-manim-frame-audit-delta-summary": expectedFullFrameDeltaSummary,
    "data-viz-manim-frame-audit-fps": "5",
    "data-viz-manim-frame-audit-frame-interval": "0.200",
    "data-viz-manim-frame-audit-frame-count": String(audit.frames.length),
    "data-viz-manim-frame-audit-formula-mobile-frame-count": "0",
    "data-viz-manim-frame-audit-formula-layer-active-object-ids": "function-curve",
    "data-viz-manim-frame-audit-formula-layer-active-object-summary": "function-curve:37",
    "data-viz-manim-frame-audit-formula-layer-active-token-count-range": "0.000..1.000",
    "data-viz-manim-frame-audit-formula-layer-bound-token-count-range": "2.000..2.000",
    "data-viz-manim-frame-audit-formula-layer-camera-to-frame-count": "7",
    "data-viz-manim-frame-audit-formula-layer-camera-to-screen-fixed-frame-count": "7",
    "data-viz-manim-frame-audit-formula-layer-frame-count": String(audit.frames.length),
    "data-viz-manim-frame-audit-formula-layer-screen-fixed-frame-count": String(audit.frames.length),
    "data-viz-manim-frame-audit-formula-layer-source-contract": FORMULA_LAYER_SOURCE_CONTRACT,
    "data-viz-manim-frame-audit-formula-layer-summary":
      "frameFormulaLayer:mais-manim-function-graph:frames=56:screenFixed=56:cameraTo=7:cameraFixed=7:tokens=2.000..2.000:bound=2.000..2.000:activeTokens=0.000..1.000:activeObjects=function-curve:37",
    "data-viz-manim-frame-audit-formula-layer-token-count-range": "2.000..2.000",
    "data-viz-manim-frame-audit-svg-morph-runtime-compatible-path-frame-count": String(audit.frames.length),
    "data-viz-manim-frame-audit-svg-morph-runtime-formula-ids": "function-formula",
    "data-viz-manim-frame-audit-svg-morph-runtime-frame-ids": "function-token-to-point-token",
    "data-viz-manim-frame-audit-svg-morph-runtime-frame-path-preview": "M 0 0 C 3.333333 0 6.666667 0 10 0 C 10 3.333333 10 6.666667 10 10 C 6.666667 6.666667 3.333333 3.333333 0 0 Z",
    "data-viz-manim-frame-audit-svg-morph-runtime-issue-count": "0",
    "data-viz-manim-frame-audit-svg-morph-runtime-path-frame-count": String(audit.frames.length),
    "data-viz-manim-frame-audit-svg-morph-runtime-progress-range": "0.000..1.000",
    "data-viz-manim-frame-audit-svg-morph-runtime-sampled-frame-count": String(audit.frames.length),
    "data-viz-manim-frame-audit-svg-morph-runtime-source-contract": FORMULA_SVG_MORPH_RUNTIME_SOURCE_CONTRACT,
    "data-viz-manim-frame-audit-svg-morph-runtime-summary":
      "frameSvgMorphRuntime:mais-manim-function-graph:sampleFrames=56:pathFrames=56:compatible=56:issues=0:progress=0.000..1.000:ids=function-token-to-point-token",
    "data-viz-manim-frame-audit-max-progress": "1.000",
    "data-viz-manim-frame-audit-max-updater-active-count": "4",
    "data-viz-manim-frame-audit-max-updater-suspended-count": "4",
    "data-viz-manim-frame-audit-min-progress": "0.000",
    "data-viz-manim-frame-audit-mobject-point-frame-count": String(audit.frames.length),
    "data-viz-manim-frame-audit-mobject-point-ids": "moving-probe",
    "data-viz-manim-frame-audit-mobject-point-position-range-summary":
      "moving-probe:x=-2.128..2.350;y=0.000..1.982;z=-0.042..0.050",
    "data-viz-manim-frame-audit-move-along-vector-field-delta-summary": "none",
    "data-viz-manim-frame-audit-move-along-vector-field-displacement-magnitude-range-summary":
      "none",
    "data-viz-manim-frame-audit-move-along-vector-field-frame-count": "0",
    "data-viz-manim-frame-audit-move-along-vector-field-moved-frame-count": "0",
    "data-viz-manim-frame-audit-move-along-vector-field-object-ids": "none",
    "data-viz-manim-frame-audit-move-along-vector-field-source-contract":
      MOVE_ALONG_VECTOR_FIELD_SOURCE_CONTRACT,
    "data-viz-manim-frame-audit-move-along-vector-field-status-summary": "none",
    "data-viz-manim-frame-audit-move-along-vector-field-summary": "none",
    "data-viz-manim-frame-audit-play-lifecycle-event-count": "75",
    "data-viz-manim-frame-audit-play-lifecycle-event-first-key": "0:prePlay@0.000",
    "data-viz-manim-frame-audit-play-lifecycle-event-last-key": "5:postPlay@10.840",
    "data-viz-manim-frame-audit-play-lifecycle-event-phase-summary":
      "prePlay:6,begin:6,progress:51,finish:6,postPlay:6",
    "data-viz-manim-frame-audit-play-lifecycle-event-source-contract": SCENE_PLAYBACK_SOURCE_CONTRACT,
    "data-viz-manim-frame-audit-play-lifecycle-event-summary":
      "playLifecycleEvents:mais-manim-function-graph:events=75:phases=prePlay:6,begin:6,progress:51,finish:6,postPlay:6:first=0:prePlay@0.000:last=5:postPlay@10.840",
    "data-viz-manim-frame-audit-play-lifecycle-trace-animation-plan-summary":
      "function-curve-attention-lift:20,function-probe-attention-pulse:18",
    "data-viz-manim-frame-audit-play-lifecycle-trace-key-frame-count": "9",
    "data-viz-manim-frame-audit-play-lifecycle-trace-phase-summary": "begin:1,progress:51,finish:4",
    "data-viz-manim-frame-audit-play-lifecycle-trace-source-contract": SCENE_PLAYBACK_SOURCE_CONTRACT,
    "data-viz-manim-frame-audit-play-lifecycle-trace-summary":
      "framePlayLifecycleTrace:mais-manim-function-graph:keyframes=9:phases=begin:1,progress:51,finish:4:plans=function-curve-attention-lift:20,function-probe-attention-pulse:18",
    "data-viz-manim-frame-audit-play-lifecycle-trace-timeline":
      "0.000:begin:revealCurve:plans=none:primary=none:progress=1.000:updaters=1/3|0.200:progress:revealCurve:plans=none:primary=none:progress=1.000:updaters=1/3|2.400:finish:revealCurve:plans=none:primary=none:progress=1.000:updaters=1/3|2.600:progress:moveAlongPath:plans=none:primary=none:progress=1.000:updaters=4/0|6.000:finish:moveAlongPath:plans=none:primary=none:progress=1.000:updaters=4/0|6.200:progress:sweepParameter:plans=none:primary=none:progress=1.000:updaters=4/0|7.200:finish:sweepParameter:plans=function-curve-attention-lift:primary=function-curve-attention-lift:progress=0.000:updaters=4/0|7.400:progress:animationComposition:plans=function-curve-attention-lift:primary=function-curve-attention-lift:progress=0.074:updaters=0/4|10.840:finish:wait:plans=function-curve-attention-lift,function-probe-attention-pulse:primary=function-probe-attention-pulse:progress=1.000:updaters=4/0",
    "data-viz-manim-frame-audit-playback-phase-summary": "begin:1,progress:51,finish:4",
    "data-viz-manim-frame-audit-primary-animation-plan-frame-summary": "function-curve-attention-lift:2,function-probe-attention-pulse:18",
    "data-viz-manim-frame-audit-primary-animation-plan-progress-summary": "function-curve-attention-lift:0.000-0.074,function-probe-attention-pulse:0.049-1.000",
    "data-viz-manim-frame-audit-quality-preset": "interactive",
    "data-viz-manim-frame-audit-renderer-mode": "interactive",
    "data-viz-manim-frame-audit-expected-render-group-ids": "axes,function-curve,moving-probe,probe-trace",
    "data-viz-manim-frame-audit-render-group-coverage-ready": "true",
    "data-viz-manim-frame-audit-render-group-missing-frame-count": "0",
    "data-viz-manim-frame-audit-render-group-overlap-summary": "none:56",
    "data-viz-manim-frame-audit-render-group-summary": "axes:56,function-curve:56,moving-probe:56,probe-trace:56",
    "data-viz-manim-frame-audit-sampled-camera-shot-ids": "overview,curve-detail",
    "data-viz-manim-frame-audit-sampled-playback-phase-ids": "begin,progress,finish",
    "data-viz-manim-frame-audit-sampled-render-group-ids": "axes,function-curve,moving-probe,probe-trace",
    "data-viz-manim-frame-audit-sampling-mode": "full-playback",
    "data-viz-manim-frame-audit-sampled-step-ids": "revealCurve,moveAlongPath,sweepParameter,animationComposition,cameraTo,wait",
    "data-viz-manim-frame-audit-camera-frame-active-shot-ids": "curve-detail,overview",
    "data-viz-manim-frame-audit-camera-frame-camera-to-frame-count": "7",
    "data-viz-manim-frame-audit-camera-frame-current-frame-ids": "overview,overview->curve-detail",
    "data-viz-manim-frame-audit-camera-frame-finite-matrix-entry-frame-count": "5376",
    "data-viz-manim-frame-audit-camera-frame-fixed-overlay-frame-count": "168",
    "data-viz-manim-frame-audit-camera-frame-fov-range": "44.010..48.000",
    "data-viz-manim-frame-audit-camera-frame-frame-count": String(audit.frames.length),
    "data-viz-manim-frame-audit-camera-frame-gamma-range": "0.000..0.000",
    "data-viz-manim-frame-audit-camera-frame-phi-range": "0.343..0.362",
    "data-viz-manim-frame-audit-camera-frame-position-range-summary": "x=2.203..3.400;y=2.152..2.800;z=2.703..4.100",
    "data-viz-manim-frame-audit-camera-frame-progress-range": "0.036..1.000",
    "data-viz-manim-frame-audit-camera-frame-source-contract": CAMERA_FRAME_SOURCE_CONTRACT,
    "data-viz-manim-frame-audit-camera-frame-summary":
      "frameCameraFrame:mais-manim-function-graph:frames=56:cameraToFrames=7:active=curve-detail,overview:ids=overview,overview->curve-detail:progress=0.036..1.000:fov=44.010..48.000:theta=0.638..0.692:phi=0.343..0.362:fixed=168:finiteMatrices=5376:viewInverseReady=56",
    "data-viz-manim-frame-audit-camera-frame-target-range-summary": "x=0.000..0.200;y=0.780..0.950;z=0.000..0.000",
    "data-viz-manim-frame-audit-camera-frame-theta-range": "0.638..0.692",
    "data-viz-manim-frame-audit-camera-frame-uniform-center-range-summary": "x=0.000..0.200;y=0.780..0.950;z=0.000..0.000",
    "data-viz-manim-frame-audit-camera-frame-uniform-summary": "uniforms=center,fovy,orientationQuaternion,shape:56",
    "data-viz-manim-frame-audit-camera-frame-view-inverse-max-error": "0.000000",
    "data-viz-manim-frame-audit-camera-frame-view-inverse-ready-frame-count": String(audit.frames.length),
    "data-viz-manim-frame-audit-scene-id": "mais-manim-function-graph",
    "data-viz-manim-frame-audit-skip-animations": "false",
    "data-viz-manim-frame-audit-source-contract": SCENE_FRAME_AUDIT_SOURCE_CONTRACT,
    "data-viz-manim-frame-audit-step-summary": "revealCurve:13,moveAlongPath:18,sweepParameter:6,animationComposition:7,cameraTo:7,wait:5",
    "data-viz-manim-frame-audit-transform-interpolate-field-arc-path-node-frame-count": "0",
    "data-viz-manim-frame-audit-transform-interpolate-field-bounding-box-node-frame-count": "96",
    "data-viz-manim-frame-audit-transform-interpolate-field-frame-count": "20",
    "data-viz-manim-frame-audit-transform-interpolate-field-node-frame-count": "96",
    "data-viz-manim-frame-audit-transform-interpolate-field-non-point-frame-count": "250",
    "data-viz-manim-frame-audit-transform-interpolate-field-non-point-policy": TRANSFORM_PATH_NON_POINT_FIELD_POLICY,
    "data-viz-manim-frame-audit-transform-interpolate-field-object-ids": "function-curve,moving-probe,probe-trace",
    "data-viz-manim-frame-audit-transform-interpolate-field-path-summary": "straight:3:2,straight:5:18",
    "data-viz-manim-frame-audit-transform-interpolate-field-pointlike-frame-count": "1950",
    "data-viz-manim-frame-audit-transform-interpolate-field-pointlike-policy": TRANSFORM_PATH_POINTLIKE_FIELD_POLICY,
    "data-viz-manim-frame-audit-transform-interpolate-field-pointlike-summary":
      "point=1/1;polyline=2/100:1,point=1/1;polyline=2/72:1,point=2/2;polyline=3/100:1,point=2/2;polyline=3/102:1,point=2/2;polyline=3/104:1,point=2/2;polyline=3/106:1,point=2/2;polyline=3/108:1,point=2/2;polyline=3/110:1,point=2/2;polyline=3/112:1,point=2/2;polyline=3/114:1,point=2/2;polyline=3/116:1,point=2/2;polyline=3/118:1,point=2/2;polyline=3/120:1,point=2/2;polyline=3/72:6,point=2/2;polyline=3/98:1",
    "data-viz-manim-frame-audit-transform-interpolate-field-source-summary": MOBJECT_INTERPOLATE_DATA_SOURCE_SUMMARY,
    "data-viz-manim-frame-audit-transform-interpolate-field-straight-path-node-frame-count": "96",
    "data-viz-manim-frame-audit-transform-interpolate-field-style-node-frame-count": "58",
    "data-viz-manim-frame-audit-transform-interpolate-field-summary":
      "frameTransformInterpolateFields:mais-manim-function-graph:frames=20:nodes=96:pointlike=1950:nonPoint=250:style=58:uniforms=96:bounds=96:paths=straight:3:2,straight:5:18:kinds=point=1/1;polyline=2/100:1,point=1/1;polyline=2/72:1,point=2/2;polyline=3/100:1,point=2/2;polyline=3/102:1,point=2/2;polyline=3/104:1,point=2/2;polyline=3/106:1,point=2/2;polyline=3/108:1,point=2/2;polyline=3/110:1,point=2/2;polyline=3/112:1,point=2/2;polyline=3/114:1,point=2/2;polyline=3/116:1,point=2/2;polyline=3/118:1,point=2/2;polyline=3/120:1,point=2/2;polyline=3/72:6,point=2/2;polyline=3/98:1:objects=function-curve,moving-probe,probe-trace",
    "data-viz-manim-frame-audit-transform-interpolate-field-uniform-node-frame-count": "96",
    "data-viz-manim-frame-audit-value-tracker-animate-frame-count": "0",
    "data-viz-manim-frame-audit-value-tracker-count": "10",
    "data-viz-manim-frame-audit-value-tracker-frame-count": String(audit.frames.length),
    "data-viz-manim-frame-audit-value-tracker-hidden-mobject-count": "10",
    "data-viz-manim-frame-audit-value-tracker-hidden-mobject-ids":
      "tracker:function-curve:progress,tracker:moving-probe:progress,tracker:parameter:comparison,tracker:parameter:depth,tracker:parameter:mode,tracker:parameter:primary,tracker:parameter:secondary,tracker:parameter:value,tracker:timeline,tracker:timeline:progress",
    "data-viz-manim-frame-audit-value-tracker-ids":
      "function-curve:progress,moving-probe:progress,parameter:comparison,parameter:depth,parameter:mode,parameter:primary,parameter:secondary,parameter:value,timeline,timeline:progress",
    "data-viz-manim-frame-audit-value-tracker-normalized-range-summary":
      "tracker:function-curve:progress:normalized=0.000..1.000|tracker:moving-probe:progress:normalized=0.000..1.000|tracker:parameter:comparison:normalized=0.417..0.417|tracker:parameter:depth:normalized=0.350..0.350|tracker:parameter:mode:normalized=0.000..0.000|tracker:parameter:primary:normalized=0.500..0.500|tracker:parameter:secondary:normalized=0.417..0.417|tracker:parameter:value:normalized=0.417..0.500|tracker:timeline:normalized=0.000..1.000|tracker:timeline:progress:normalized=0.000..1.000",
    "data-viz-manim-frame-audit-value-tracker-source-contract": VALUE_TRACKER_SOURCE_CONTRACT,
    "data-viz-manim-frame-audit-value-tracker-source-summary": "object=2,parameter=6,timeline=2,value=0",
    "data-viz-manim-frame-audit-value-tracker-summary":
      "frameValueTrackers:mais-manim-function-graph:frames=56:trackers=10:hidden=10:animateFrames=0:sources=object=2,parameter=6,timeline=2,value=0:ranges=tracker:function-curve:progress:value=0.000..1.000|tracker:moving-probe:progress:value=0.000..1.000|tracker:parameter:comparison:value=5.000..5.000|tracker:parameter:depth:value=1.400..1.400|tracker:parameter:mode:value=0.000..0.000|tracker:parameter:primary:value=6.000..6.000|tracker:parameter:secondary:value=5.000..5.000|tracker:parameter:value:value=5.000..6.000|tracker:timeline:value=0.000..10.840|tracker:timeline:progress:value=0.000..1.000",
    "data-viz-manim-frame-audit-value-tracker-uniform-value-range-summary":
      "tracker:function-curve:progress:value=0.000..1.000|tracker:moving-probe:progress:value=0.000..1.000|tracker:parameter:comparison:value=5.000..5.000|tracker:parameter:depth:value=1.400..1.400|tracker:parameter:mode:value=0.000..0.000|tracker:parameter:primary:value=6.000..6.000|tracker:parameter:secondary:value=5.000..5.000|tracker:parameter:value:value=5.000..6.000|tracker:timeline:value=0.000..10.840|tracker:timeline:progress:value=0.000..1.000",
    "data-viz-manim-frame-audit-updater-suspension-owned-object-ids": "function-curve,moving-probe",
    "data-viz-manim-frame-audit-updater-suspension-owned-object-summary": "function-curve:13,function-curve,moving-probe:7,moving-probe:18",
    "data-viz-manim-frame-audit-updater-suspension-count-summary": "0/4:7,1/3:13,4/0:36",
    "data-viz-manim-frame-audit-updater-suspension-phase-summary": "animation:38,open:18",
    "data-viz-manim-frame-audit-updater-suspension-policy": UPDATER_SUSPENSION_POLICY,
    "data-viz-manim-frame-audit-updater-suspension-reason-summary":
      "suspended-by-animationComposition:function-attention-lagged-start,suspended-by-animationComposition:function-attention-lagged-start,suspended-by-animationComposition:function-attention-lagged-start,suspended-by-animationComposition:function-attention-lagged-start:7,suspended-by-revealCurve,suspended-by-revealCurve,suspended-by-revealCurve:13",
    "data-viz-manim-frame-audit-updater-suspension-source-contract": UPDATER_SUSPENSION_SOURCE_CONTRACT,
    "data-viz-manim-frame-audit-updater-suspension-suspended-frame-count": "20",
    "data-viz-manim-frame-audit-updater-suspension-suspended-object-ids": "function-curve,moving-probe,probe-trace",
    "data-viz-manim-frame-audit-updater-suspension-suspended-object-summary":
      "function-curve,moving-probe,probe-trace:20",
    "data-viz-manim-frame-audit-updater-suspension-suspended-updater-frame-count": "67",
    "data-viz-manim-frame-audit-updater-suspension-suspended-updater-ids": "function-curve:always-redraw,function-curve:reveal,moving-probe:move,probe-trace:trace",
    "data-viz-manim-frame-audit-updater-suspension-suspended-updater-summary":
      "function-curve:always-redraw,function-curve:reveal,moving-probe:move,probe-trace:trace:7,function-curve:always-redraw,moving-probe:move,probe-trace:trace:13",
    "data-viz-manim-frame-audit-updater-suspension-summary":
      "frameUpdaterSuspension:mais-manim-function-graph:frames=56:suspendedFrames=20:suspendedUpdaterFrames=67:phases=animation:38,open:18:counts=0/4:7,1/3:13,4/0:36:animated=function-curve,moving-probe:suspended=function-curve:always-redraw,function-curve:reveal,moving-probe:move,probe-trace:trace",
    "data-viz-manim-frame-audit-sub-alpha-complete-node-frame-count": "67",
    "data-viz-manim-frame-audit-sub-alpha-delayed-node-frame-count": "7",
    "data-viz-manim-frame-audit-sub-alpha-eased-range": "0.000..1.000",
    "data-viz-manim-frame-audit-sub-alpha-family-zip-covered-node-frame-count": "78",
    "data-viz-manim-frame-audit-sub-alpha-family-zip-max-tuple-count": "3",
    "data-viz-manim-frame-audit-sub-alpha-family-zip-missing-node-frame-count": "18",
    "data-viz-manim-frame-audit-sub-alpha-family-zip-policy": TRANSFORM_FAMILY_ALIGNMENT_ZIP_POLICY,
    "data-viz-manim-frame-audit-sub-alpha-family-zip-sequence-summary":
      "function-curve|function-curve|function-curve;moving-probe|moving-probe|moving-probe;probe-trace|probe-trace|probe-trace:2,moving-probe|moving-probe|moving-probe;probe-trace|probe-trace|probe-trace:18",
    "data-viz-manim-frame-audit-sub-alpha-family-zip-uncovered-object-ids": "function-curve",
    "data-viz-manim-frame-audit-sub-alpha-frame-count": "20",
    "data-viz-manim-frame-audit-sub-alpha-lagged-range": "0.000..1.000",
    "data-viz-manim-frame-audit-sub-alpha-leading-node-frame-count": "7",
    "data-viz-manim-frame-audit-sub-alpha-node-frame-count": "96",
    "data-viz-manim-frame-audit-sub-alpha-node-window-summary": expectedFullSubAlphaNodeWindowSummary,
    "data-viz-manim-frame-audit-sub-alpha-object-ids": "function-curve,moving-probe,probe-trace",
    "data-viz-manim-frame-audit-sub-alpha-partial-node-frame-count": "25",
    "data-viz-manim-frame-audit-sub-alpha-rate-function-ids": "smooth",
    "data-viz-manim-frame-audit-sub-alpha-raw-range": "0.000..1.000",
    "data-viz-manim-frame-audit-sub-alpha-staggered-node-frame-count": "14",
    "data-viz-manim-frame-audit-sub-alpha-summary":
      "frameSubAlpha:mais-manim-function-graph:frames=20:nodes=96:raw=0.000..1.000:lag=0.000..1.000:eased=0.000..1.000:staggered=14:lead=7:delay=7:zero=4:partial=25:complete=67:rates=smooth:objects=function-curve,moving-probe,probe-trace",
    "data-viz-manim-frame-audit-sub-alpha-zero-node-frame-count": "4",
    "data-viz-manim-frame-audit-transform-frame-count": String(audit.transformFrameCount),
    "data-viz-manim-frame-audit-updater-summary": "1/3:13,4/0:36,0/4:7",
    "data-viz-manim-frame-audit-updater-execution-active-call-sequence-summary":
      expectedFullUpdaterExecutionActiveCallSequenceSummary,
    "data-viz-manim-frame-audit-updater-execution-family-traversal-summary":
      expectedFullUpdaterExecutionFamilyTraversalSummary,
    "data-viz-manim-frame-audit-updater-execution-order-summary":
      expectedFullUpdaterExecutionOrderSummary,
    "data-viz-manim-frame-audit-updater-execution-summary":
      expectedFullUpdaterExecutionSummary
  });

  const serialized = serializeMathSceneFrameAuditSummary(summary);
  assert.equal(
    serializeMathSceneFrameAuditSummary(JSON.parse(JSON.stringify(summary)) as typeof summary),
    serialized
  );
  assert.doesNotMatch(serialized, /undefined|NaN|Infinity|<\/script/i);
  assert.doesNotMatch(serialized, /"frames"/);
  assert.match(serialized, /"frameCount"/);
  assert.match(serialized, /"animationPlanFrameSummary"/);
  assert.match(serialized, /"activeAnimationNodeProgressSummary"/);
  assert.match(serialized, /"primaryAnimationPlanFrameSummary"/);
  assert.match(serialized, /"primaryAnimationPlanProgressSummary"/);
  assert.match(serialized, /"sampledCameraShotIds"/);
  assert.match(serialized, /"cameraShotSummary"/);
  assert.match(serialized, /"sampledRenderGroupIds"/);
  assert.match(serialized, /"renderGroupSummary"/);
  assert.match(serialized, /"renderGroupOverlapSummary"/);
  assert.match(serialized, /"sampledPlaybackPhaseIds"/);
  assert.match(serialized, /"playbackPhaseSummary"/);
  assert.match(serialized, /"updaterSummary"/);
  assert.match(serialized, /"mobjectPointPositionRangeSummary"/);
  assert.match(serialized, /"moveAlongVectorFieldSourceContract"/);
  assert.match(serialized, /"moveAlongVectorFieldDeltaSummary"/);
  assert.match(serialized, /"moveAlongVectorFieldSummary"/);
  assert.match(serialized, /"sampledStepIds"/);
  assert.match(serialized, /"stepSummary"/);
  assert.match(serialized, /"subAlphaNodeFrameCount"/);
  assert.match(serialized, /"subAlphaNodeWindowSummary"/);
  assert.match(serialized, /"subAlphaFamilyZipCoveredNodeFrameCount"/);
  assert.match(serialized, /"subAlphaFamilyZipSequenceSummary"/);
  assert.match(serialized, /"transformInterpolateFieldNodeFrameCount"/);
  assert.match(serialized, /"transformInterpolateFieldPointlikeSummary"/);
  assert.match(serialized, /"updaterSuspensionPhaseSummary"/);
  assert.match(serialized, /"updaterSuspensionReasonSummary"/);
  assert.match(serialized, /"trackerSummary"/);
  assert.match(serialized, /"trackerUniformValueRangeSummary"/);
  assert.match(serialized, /"cameraFrameSummary"/);
  assert.match(serialized, /"cameraFrameUniformCenterRangeSummary"/);
  assert.match(serialized, /"directorTraceTimeline"/);
  assert.match(serialized, /"directorTraceSummary"/);
  assert.match(serialized, /"formulaLayerSummary"/);
  assert.match(serialized, /"formulaLayerScreenFixedFrameCount"/);
  assert.match(serialized, /"formulaSvgMorphRuntimeSummary"/);
  assert.match(serialized, /"formulaSvgMorphRuntimeProgressRange"/);
  assert.match(serialized, /"subAlphaSummary"/);
  assert.match(serialized, /"frameDeltaSummary"/);
  assert.match(serialized, /"updaterExecutionActiveCallSequenceSummary"/);
  assert.match(serialized, /"updaterExecutionFamilyTraversalSummary"/);
  assert.match(serialized, /"updaterExecutionOrderSummary"/);
  assert.match(serialized, /"updaterExecutionSummary"/);
});

test("audits sampled frames with the measured FormulaLayer viewport", () => {
  const scene = buildFunctionGraphSpec();
  const measuredViewport = { height: 320, width: 360 };
  const audit = buildMathSceneFrameAudit(scene, {
    formulaLayerViewport: measuredViewport,
    fps: 5
  });
  const summary = summarizeMathSceneFrameAudit(audit);
  const attributes = frameAuditDataAttributes(summary);

  assert.ok(audit.frames.length > 0);
  assert.ok(audit.frames.every((frame) => frame.formulaMobileViewport === true));
  assert.ok(audit.frames.every((frame) => frame.captureHeight === measuredViewport.height));
  assert.ok(audit.frames.every((frame) => frame.captureWidth === measuredViewport.width));
  assert.equal(summary.formulaMobileFrameCount, audit.frames.length);
  assert.equal(summary.captureHeight, measuredViewport.height);
  assert.equal(summary.captureWidth, measuredViewport.width);
  assert.equal(attributes["data-viz-manim-frame-audit-formula-mobile-frame-count"], String(audit.frames.length));
  assert.equal(attributes["data-viz-manim-frame-audit-capture-height"], String(measuredViewport.height));
  assert.equal(attributes["data-viz-manim-frame-audit-capture-width"], String(measuredViewport.width));
});

test("uses render quality capture fps and dimensions for export-aligned audits", () => {
  const scene = buildFunctionGraphSpec();
  const renderQuality = buildMathSceneRenderQualityPlan({
    preset: "production",
    rendererMode: "capture"
  });
  const audit = buildMathSceneFrameAudit(scene, { renderQuality });
  const summary = summarizeMathSceneFrameAudit(audit);
  const attributes = frameAuditDataAttributes(summary);

  assert.equal(audit.fps, 60);
  assert.equal(audit.frameInterval, 0.017);
  assert.ok(audit.frames.length > 600, "production frame audit should sample the full guided timeline at 60fps");
  assert.ok(audit.frames.every((frame) => frame.captureWidth === 1920));
  assert.ok(audit.frames.every((frame) => frame.captureHeight === 1080));
  assert.equal(summary.captureWidth, 1920);
  assert.equal(summary.captureHeight, 1080);
  assert.equal(summary.fps, 60);
  assert.equal(summary.frameInterval, 0.017);
  assert.equal(summary.qualityPreset, "production");
  assert.equal(summary.rendererMode, "capture");
  assert.equal(attributes["data-viz-manim-frame-audit-capture-width"], "1920");
  assert.equal(attributes["data-viz-manim-frame-audit-capture-height"], "1080");
  assert.equal(attributes["data-viz-manim-frame-audit-fps"], "60");
  assert.equal(attributes["data-viz-manim-frame-audit-frame-interval"], "0.017");
  assert.equal(attributes["data-viz-manim-frame-audit-quality-preset"], "production");
  assert.equal(attributes["data-viz-manim-frame-audit-renderer-mode"], "capture");
});

test("supports skip animation audits without losing final scene evidence", () => {
  const scene = buildFunctionGraphSpec();
  const audit = buildMathSceneFrameAudit(scene, { skipAnimations: true });
  const summary = summarizeMathSceneFrameAudit(audit);
  const attributes = frameAuditDataAttributes(summary);

  assert.equal(audit.samplingMode, "show-final");
  assert.equal(audit.skipAnimations, true);
  assert.equal(audit.frames.length, 1);
  assert.equal(audit.frames[0].elapsedSeconds, 10.84);
  assert.equal(audit.frames[0].activeStep, "wait");
  assert.equal(audit.frames[0].activeAnimationPlanId, "function-probe-attention-pulse");
  assert.equal(audit.frames[0].activeAnimationPlanIds, "function-curve-attention-lift,function-probe-attention-pulse");
  assert.equal(audit.frames[0].activeAnimationProgress, 1);
  assert.equal(summary.samplingMode, "show-final");
  assert.equal(summary.skipAnimations, true);
  assert.equal(summary.frameDeltaSummary, expectedShowFinalFrameDeltaSummary);
  assert.equal(summary.animationPlanFrameSummary, "function-curve-attention-lift:1,function-probe-attention-pulse:1");
  assert.equal(summary.activeAnimationNodeProgressSummary, expectedShowFinalActiveAnimationNodeProgressSummary);
  assert.equal(summary.primaryAnimationPlanFrameSummary, "function-probe-attention-pulse:1");
  assert.equal(summary.primaryAnimationPlanProgressSummary, "function-probe-attention-pulse:1.000-1.000");
  assert.deepEqual(summary.sampledCameraShotIds, ["overview"]);
  assert.equal(summary.cameraShotSummary, "overview:1");
  assert.deepEqual(summary.expectedRenderGroupIds, ["axes", "function-curve", "moving-probe", "probe-trace"]);
  assert.deepEqual(summary.sampledRenderGroupIds, ["axes", "function-curve", "moving-probe", "probe-trace"]);
  assert.equal(summary.renderGroupCoverageReady, true);
  assert.equal(summary.renderGroupMissingFrameCount, 0);
  assert.equal(summary.renderGroupSummary, "axes:1,function-curve:1,moving-probe:1,probe-trace:1");
  assert.equal(summary.renderGroupOverlapSummary, "none:1");
  assert.deepEqual(summary.sampledPlaybackPhaseIds, ["finish"]);
  assert.equal(summary.playbackPhaseSummary, "finish:1");
  assert.equal(summary.updaterSummary, "4/0:1");
  assert.equal(summary.updaterExecutionActiveCallSequenceSummary, expectedShowFinalUpdaterExecutionActiveCallSequenceSummary);
  assert.equal(summary.updaterExecutionFamilyTraversalSummary, expectedShowFinalUpdaterExecutionFamilyTraversalSummary);
  assert.equal(summary.updaterExecutionOrderSummary, expectedShowFinalUpdaterExecutionOrderSummary);
  assert.equal(summary.updaterExecutionSummary, expectedShowFinalUpdaterExecutionSummary);
  assert.equal(summary.maxUpdaterActiveCount, 4);
  assert.equal(summary.maxUpdaterSuspendedCount, 0);
  assert.deepEqual(summary.sampledStepIds, ["wait"]);
  assert.equal(summary.stepSummary, "wait:1");
  assert.equal(summary.subAlphaFrameCount, 1);
  assert.equal(summary.subAlphaNodeFrameCount, 5);
  assert.equal(summary.subAlphaRawRange, "1.000..1.000");
  assert.equal(summary.subAlphaLaggedRange, "1.000..1.000");
  assert.equal(summary.subAlphaEasedRange, "1.000..1.000");
  assert.equal(summary.subAlphaNodeWindowSummary, expectedShowFinalSubAlphaNodeWindowSummary);
  assert.equal(summary.subAlphaFamilyZipCoveredNodeFrameCount, 4);
  assert.equal(summary.subAlphaFamilyZipMissingNodeFrameCount, 1);
  assert.equal(summary.subAlphaFamilyZipMaxTupleCount, 2);
  assert.equal(summary.subAlphaFamilyZipPolicy, TRANSFORM_FAMILY_ALIGNMENT_ZIP_POLICY);
  assert.equal(
    summary.subAlphaFamilyZipSequenceSummary,
    "moving-probe|moving-probe|moving-probe;probe-trace|probe-trace|probe-trace:1"
  );
  assert.deepEqual(summary.subAlphaFamilyZipUncoveredObjectIds, ["function-curve"]);
  assert.equal(summary.transformInterpolateFieldFrameCount, 1);
  assert.equal(summary.transformInterpolateFieldNodeFrameCount, 5);
  assert.equal(summary.transformInterpolateFieldPointlikeFrameCount, 100);
  assert.equal(summary.transformInterpolateFieldNonPointFrameCount, 13);
  assert.equal(summary.transformInterpolateFieldStyleNodeFrameCount, 3);
  assert.equal(summary.transformInterpolateFieldUniformNodeFrameCount, 5);
  assert.equal(summary.transformInterpolateFieldBoundingBoxNodeFrameCount, 5);
  assert.equal(summary.transformInterpolateFieldArcPathNodeFrameCount, 0);
  assert.equal(summary.transformInterpolateFieldStraightPathNodeFrameCount, 5);
  assert.deepEqual(summary.transformInterpolateFieldObjectIds, ["function-curve", "moving-probe", "probe-trace"]);
  assert.equal(summary.transformInterpolateFieldPathSummary, "straight:5:1");
  assert.equal(summary.transformInterpolateFieldPointlikeSummary, "point=2/2;polyline=3/98:1");
  assert.equal(
    summary.transformInterpolateFieldSummary,
    "frameTransformInterpolateFields:mais-manim-function-graph:frames=1:nodes=5:pointlike=100:nonPoint=13:style=3:uniforms=5:bounds=5:paths=straight:5:1:kinds=point=2/2;polyline=3/98:1:objects=function-curve,moving-probe,probe-trace"
  );
  assert.equal(summary.updaterSuspensionPhaseSummary, "open:1");
  assert.equal(summary.updaterSuspensionCountSummary, "4/0:1");
  assert.equal(summary.updaterSuspensionSuspendedFrameCount, 0);
  assert.equal(summary.updaterSuspensionSuspendedUpdaterFrameCount, 0);
  assert.deepEqual(summary.updaterSuspensionOwnedObjectIds, []);
  assert.deepEqual(summary.updaterSuspensionSuspendedUpdaterIds, []);
  assert.equal(
    summary.updaterSuspensionSummary,
    "frameUpdaterSuspension:mais-manim-function-graph:frames=1:suspendedFrames=0:suspendedUpdaterFrames=0:phases=open:1:counts=4/0:1:animated=none:suspended=none"
  );
  assert.deepEqual(summary.subAlphaObjectIds, ["function-curve", "moving-probe", "probe-trace"]);
  assert.deepEqual(summary.subAlphaRateFunctionIds, ["smooth"]);
  assert.equal(
    summary.subAlphaSummary,
    "frameSubAlpha:mais-manim-function-graph:frames=1:nodes=5:raw=1.000..1.000:lag=1.000..1.000:eased=1.000..1.000:staggered=0:lead=0:delay=0:zero=0:partial=0:complete=5:rates=smooth:objects=function-curve,moving-probe,probe-trace"
  );
  assert.equal(attributes["data-viz-manim-frame-audit-camera-shot-summary"], "overview:1");
  assert.equal(attributes["data-viz-manim-frame-audit-delta-summary"], expectedShowFinalFrameDeltaSummary);
  assert.equal(
    attributes["data-viz-manim-frame-audit-active-animation-node-progress-summary"],
    expectedShowFinalActiveAnimationNodeProgressSummary
  );
  assert.equal(attributes["data-viz-manim-frame-audit-animation-plan-frame-summary"], "function-curve-attention-lift:1,function-probe-attention-pulse:1");
  assert.equal(attributes["data-viz-manim-frame-audit-primary-animation-plan-frame-summary"], "function-probe-attention-pulse:1");
  assert.equal(attributes["data-viz-manim-frame-audit-primary-animation-plan-progress-summary"], "function-probe-attention-pulse:1.000-1.000");
  assert.equal(attributes["data-viz-manim-frame-audit-sampled-camera-shot-ids"], "overview");
  assert.equal(attributes["data-viz-manim-frame-audit-expected-render-group-ids"], "axes,function-curve,moving-probe,probe-trace");
  assert.equal(attributes["data-viz-manim-frame-audit-render-group-coverage-ready"], "true");
  assert.equal(attributes["data-viz-manim-frame-audit-render-group-missing-frame-count"], "0");
  assert.equal(attributes["data-viz-manim-frame-audit-render-group-summary"], "axes:1,function-curve:1,moving-probe:1,probe-trace:1");
  assert.equal(attributes["data-viz-manim-frame-audit-render-group-overlap-summary"], "none:1");
  assert.equal(attributes["data-viz-manim-frame-audit-sampled-render-group-ids"], "axes,function-curve,moving-probe,probe-trace");
  assert.equal(attributes["data-viz-manim-frame-audit-sampled-playback-phase-ids"], "finish");
  assert.equal(attributes["data-viz-manim-frame-audit-playback-phase-summary"], "finish:1");
  assert.equal(attributes["data-viz-manim-frame-audit-updater-summary"], "4/0:1");
  assert.equal(
    attributes["data-viz-manim-frame-audit-updater-execution-order-summary"],
    expectedShowFinalUpdaterExecutionOrderSummary
  );
  assert.equal(attributes["data-viz-manim-frame-audit-max-updater-active-count"], "4");
  assert.equal(attributes["data-viz-manim-frame-audit-max-updater-suspended-count"], "0");
  assert.equal(attributes["data-viz-manim-frame-audit-sampling-mode"], "show-final");
  assert.equal(attributes["data-viz-manim-frame-audit-skip-animations"], "true");
  assert.equal(attributes["data-viz-manim-frame-audit-sampled-step-ids"], "wait");
  assert.equal(attributes["data-viz-manim-frame-audit-step-summary"], "wait:1");
  assert.equal(attributes["data-viz-manim-frame-audit-sub-alpha-frame-count"], "1");
  assert.equal(attributes["data-viz-manim-frame-audit-sub-alpha-node-frame-count"], "5");
  assert.equal(attributes["data-viz-manim-frame-audit-sub-alpha-raw-range"], "1.000..1.000");
  assert.equal(attributes["data-viz-manim-frame-audit-sub-alpha-lagged-range"], "1.000..1.000");
  assert.equal(attributes["data-viz-manim-frame-audit-sub-alpha-eased-range"], "1.000..1.000");
  assert.equal(
    attributes["data-viz-manim-frame-audit-sub-alpha-node-window-summary"],
    expectedShowFinalSubAlphaNodeWindowSummary
  );
  assert.equal(attributes["data-viz-manim-frame-audit-sub-alpha-family-zip-covered-node-frame-count"], "4");
  assert.equal(attributes["data-viz-manim-frame-audit-sub-alpha-family-zip-missing-node-frame-count"], "1");
  assert.equal(attributes["data-viz-manim-frame-audit-sub-alpha-family-zip-max-tuple-count"], "2");
  assert.equal(attributes["data-viz-manim-frame-audit-sub-alpha-family-zip-policy"], TRANSFORM_FAMILY_ALIGNMENT_ZIP_POLICY);
  assert.equal(
    attributes["data-viz-manim-frame-audit-sub-alpha-family-zip-sequence-summary"],
    "moving-probe|moving-probe|moving-probe;probe-trace|probe-trace|probe-trace:1"
  );
  assert.equal(attributes["data-viz-manim-frame-audit-sub-alpha-family-zip-uncovered-object-ids"], "function-curve");
  assert.equal(attributes["data-viz-manim-frame-audit-transform-interpolate-field-frame-count"], "1");
  assert.equal(attributes["data-viz-manim-frame-audit-transform-interpolate-field-node-frame-count"], "5");
  assert.equal(attributes["data-viz-manim-frame-audit-transform-interpolate-field-pointlike-frame-count"], "100");
  assert.equal(attributes["data-viz-manim-frame-audit-transform-interpolate-field-non-point-frame-count"], "13");
  assert.equal(attributes["data-viz-manim-frame-audit-transform-interpolate-field-style-node-frame-count"], "3");
  assert.equal(attributes["data-viz-manim-frame-audit-transform-interpolate-field-uniform-node-frame-count"], "5");
  assert.equal(attributes["data-viz-manim-frame-audit-transform-interpolate-field-bounding-box-node-frame-count"], "5");
  assert.equal(attributes["data-viz-manim-frame-audit-transform-interpolate-field-arc-path-node-frame-count"], "0");
  assert.equal(attributes["data-viz-manim-frame-audit-transform-interpolate-field-straight-path-node-frame-count"], "5");
  assert.equal(attributes["data-viz-manim-frame-audit-transform-interpolate-field-object-ids"], "function-curve,moving-probe,probe-trace");
  assert.equal(attributes["data-viz-manim-frame-audit-transform-interpolate-field-path-summary"], "straight:5:1");
  assert.equal(attributes["data-viz-manim-frame-audit-transform-interpolate-field-pointlike-summary"], "point=2/2;polyline=3/98:1");
  assert.equal(
    attributes["data-viz-manim-frame-audit-transform-interpolate-field-summary"],
    "frameTransformInterpolateFields:mais-manim-function-graph:frames=1:nodes=5:pointlike=100:nonPoint=13:style=3:uniforms=5:bounds=5:paths=straight:5:1:kinds=point=2/2;polyline=3/98:1:objects=function-curve,moving-probe,probe-trace"
  );
  assert.equal(attributes["data-viz-manim-frame-audit-updater-suspension-phase-summary"], "open:1");
  assert.equal(attributes["data-viz-manim-frame-audit-updater-suspension-count-summary"], "4/0:1");
  assert.equal(attributes["data-viz-manim-frame-audit-updater-suspension-suspended-frame-count"], "0");
  assert.equal(attributes["data-viz-manim-frame-audit-updater-suspension-suspended-updater-frame-count"], "0");
  assert.equal(attributes["data-viz-manim-frame-audit-updater-suspension-owned-object-ids"], "none");
  assert.equal(attributes["data-viz-manim-frame-audit-updater-suspension-suspended-updater-ids"], "none");
  assert.equal(
    attributes["data-viz-manim-frame-audit-updater-suspension-summary"],
    "frameUpdaterSuspension:mais-manim-function-graph:frames=1:suspendedFrames=0:suspendedUpdaterFrames=0:phases=open:1:counts=4/0:1:animated=none:suspended=none"
  );
  assert.equal(attributes["data-viz-manim-frame-audit-sub-alpha-object-ids"], "function-curve,moving-probe,probe-trace");
  assert.equal(attributes["data-viz-manim-frame-audit-sub-alpha-rate-function-ids"], "smooth");
  assert.equal(
    attributes["data-viz-manim-frame-audit-sub-alpha-summary"],
    "frameSubAlpha:mais-manim-function-graph:frames=1:nodes=5:raw=1.000..1.000:lag=1.000..1.000:eased=1.000..1.000:staggered=0:lead=0:delay=0:zero=0:partial=0:complete=5:rates=smooth:objects=function-curve,moving-probe,probe-trace"
  );
});

test("MathSceneFrameAudit stays pure and delegates runtime frame composition to the stepper", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathSceneFrameAudit.ts", "utf8");

  assert.match(source, /sampleScenePlaybackFrames/);
  assert.match(source, /stepMathSceneFrame/);
  assert.match(source, /SCENE_FRAME_AUDIT_SOURCE_CONTRACT/);
  assert.match(source, /subAlphaFamilyZipCoveredNodeCount/);
  assert.match(source, /transformInterpolateFieldNodeCount/);
  assert.match(source, /transformInterpolateFieldPointlikeFrameCount/);
  assert.match(source, /TRANSFORM_FAMILY_ALIGNMENT_ZIP_POLICY/);
  assert.match(source, /TRANSFORM_PATH_POINTLIKE_FIELD_POLICY/);
  assert.match(source, /buildUpdaterSuspensionPlan/);
  assert.match(source, /UPDATER_SUSPENSION_POLICY/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
});
