import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  buildMathSceneEvidenceSnapshot,
  evidenceDataAttributes,
  serializeMathSceneEvidenceSnapshot
} from "./mathEvidenceHarness";
import {
  threeDCanvasRequiredDataAttributes,
  threeDCanvasRequiredSelectors
} from "../threeDCanvasSurfaceContract";
import {
  animationCompositionFrameEvidenceDataAttributes,
  buildAnimationCompositionFrameEvidence,
  buildSceneAnimationCompositionPlans,
} from "./mathAnimationComposition";
import { FORMULA_BINDING_ANCHOR_SOURCE_CONTRACT } from "./mathFormulaBindingAnchors";
import { VALUE_TRACKER_SOURCE_CONTRACT } from "./mathValueTracker";
import {
  ANIMATION_LIFECYCLE_BEGIN_SOURCE_POLICY,
  ANIMATION_LIFECYCLE_SOURCE_CONTRACT
} from "./mathAnimationLifecycle";
import {
  ANIMATION_BUILDER_SOURCE_CONTRACT,
  buildMathAnimateBuilderCatalog,
  mathAnimateBuilderCatalogDataAttributes
} from "./mathAnimationBuilder";
import { SCENE_CAPTURE_SOURCE_CONTRACT } from "./mathSceneCapture";
import { MANIM_RENDER_QUALITY_SOURCE_CONTRACT } from "./mathSceneRenderQuality";
import { SCENE_EXPORT_SOURCE_CONTRACT } from "./mathSceneExport";
import { SCENE_STATE_SNAPSHOT_SOURCE_CONTRACT } from "./mathSceneStateSnapshot";
import { SCENE_INITIALIZATION_SOURCE_CONTRACT } from "./mathSceneInitialization";
import {
  buildMathSceneRunLifecyclePlan,
  SCENE_RUN_LIFECYCLE_SOURCE_CONTRACT
} from "./mathSceneRunLifecycle";
import {
  buildScenePlaybackPlan,
  SCENE_PLAYBACK_SOURCE_CONTRACT
} from "./mathScenePlayback";
import {
  buildSceneRunFromBeatPlan,
  SCENE_RUN_FROM_BEAT_REPLAY_POLICY,
  SCENE_RUN_FROM_BEAT_SOURCE_CONTRACT,
  sceneRunFromBeatDataAttributes
} from "./mathSceneRunFromBeat";
import { CAMERA_FRAME_POINT_ROUNDTRIP_SOURCE_CONTRACT, CAMERA_FRAME_SOURCE_CONTRACT } from "./mathCameraFrame";
import { CAMERA_FRAME_UPDATER_SOURCE_CONTRACT } from "./mathCameraFrameUpdater";
import { MOBJECT_DATA_ARRAY_SOURCE_CONTRACT } from "./mathMobjectDataArray";
import { MOBJECT_INVALIDATION_SOURCE_CONTRACT } from "./mathMobjectInvalidation";
import { MOBJECT_POINT_CLOUD_SOURCE_CONTRACT } from "./mathMobjectPointCloud";
import { MOBJECT_POINT_GENERATION_SOURCE_CONTRACT } from "./mathMobjectPointGeneration";
import { MOBJECT_POINT_TRANSFORM_SOURCE_CONTRACT } from "./mathMobjectPointTransforms";
import {
  buildManimConfigDigest,
  manimConfigDigestDataAttributes,
  MANIM_CONFIG_DIGEST_SOURCE_CONTRACT
} from "./mathConfigDigest";
import { MOBJECT_BOUNDING_BOX_SOURCE_CONTRACT } from "./mathMobjectBoundingBox";
import { MOBJECT_STATE_RESTORE_BRIDGE_SOURCE_CONTRACT } from "./mathMobjectStateRestoreBridge";
import { MOBJECT_MOVE_TO_TARGET_BRIDGE_SOURCE_CONTRACT } from "./mathMobjectMoveToTargetBridge";
import {
  ALWAYS_UPDATER_AUTHORING_SOURCE_CONTRACT,
  alwaysUpdaterAuthoringDataAttributes,
  buildAlwaysUpdaterAuthoringCatalog
} from "./mathAlwaysRedraw";
import {
  alwaysMethodUpdaterEvidenceDataAttributes,
  buildAlwaysMethodUpdaterEvidence
} from "./mathAlwaysMethodUpdater";
import {
  buildSurfaceObjectEvidence,
  buildSurfaceObjectFromGrid,
  SURFACE_OBJECT_SOURCE_CONTRACT,
  surfaceObjectEvidenceDataAttributes
} from "./mathSurfaceObject";
import {
  buildTracingTailEvidence,
  buildTracingTailFromPoints,
  TRACING_TAIL_SOURCE_CONTRACT,
  tracingTailEvidenceDataAttributes
} from "./mathTracingTail";
import {
  buildMoveAlongVectorFieldEvidence,
  evaluateMoveAlongVectorFieldUpdater,
  MOVE_ALONG_VECTOR_FIELD_SOURCE_CONTRACT,
  moveAlongVectorFieldEvidenceDataAttributes
} from "./mathMoveAlongVectorField";
import {
  buildCoordinateSystemEvidence,
  coordinateSystemEvidenceDataAttributes
} from "./mathCoordinateSystem3D";
import {
  buildCoordinateSpaceEvidence,
  coordinateSpaceEvidenceDataAttributes
} from "./mathCoordinateSpace";
import {
  axisTickPlanDataAttributes,
  buildAxisTickPlan,
  summarizeAxisLabelAnchors,
  summarizeAxisTickPlan,
  summarizeAxisTickSpacing
} from "./mathAxisTicks";
import { buildMathSceneAnimatePlans } from "./mathSceneAnimationPlans";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";
import { buildMathSceneRuntimeState } from "./mathSceneRuntimeState";
import { SCENE_MEMBERSHIP_SOURCE_CONTRACT, SCENE_RESTRUCTURE_SOURCE_CONTRACT } from "./mathSceneGraph";
import {
  buildSceneAddMobjectBridgePlan,
  SCENE_ADD_MOBJECT_BRIDGE_SOURCE_CONTRACT,
  sceneAddMobjectBridgeDataAttributes
} from "./mathSceneAddMobjectBridge";
import {
  buildSceneClearMobjectBridgePlan,
  SCENE_CLEAR_MOBJECT_BRIDGE_SOURCE_CONTRACT,
  sceneClearMobjectBridgeDataAttributes
} from "./mathSceneClearMobjectBridge";
import {
  buildSceneBringToFrontMobjectBridgePlan,
  SCENE_BRING_TO_FRONT_MOBJECT_BRIDGE_SOURCE_CONTRACT,
  sceneBringToFrontMobjectBridgeDataAttributes
} from "./mathSceneBringToFrontMobjectBridge";
import {
  buildSceneSendToBackMobjectBridgePlan,
  SCENE_SEND_TO_BACK_MOBJECT_BRIDGE_SOURCE_CONTRACT,
  sceneSendToBackMobjectBridgeDataAttributes
} from "./mathSceneSendToBackMobjectBridge";
import {
  buildSceneRemoveAllExceptMobjectBridgePlan,
  SCENE_REMOVE_ALL_EXCEPT_MOBJECT_BRIDGE_SOURCE_CONTRACT,
  sceneRemoveAllExceptMobjectBridgeDataAttributes
} from "./mathSceneRemoveAllExceptMobjectBridge";
import {
  buildSceneReplaceMobjectBridgePlan,
  SCENE_REPLACE_MOBJECT_BRIDGE_SOURCE_CONTRACT,
  sceneReplaceMobjectBridgeDataAttributes
} from "./mathSceneReplaceMobjectBridge";
import {
  buildSceneRemoveMobjectBridgePlan,
  SCENE_REMOVE_MOBJECT_BRIDGE_SOURCE_CONTRACT,
  sceneRemoveMobjectBridgeDataAttributes
} from "./mathSceneRemoveMobjectBridge";
import { FORMULA_BINDING_SOURCE_CONTRACT } from "./mathFormulaBindings";
import {
  FORMULA_LAYER_PROJECTED_LABEL_TEXT_POLICY,
  FORMULA_LAYER_SOURCE_CONTRACT,
  buildActiveProjectedLabelTextByObjectId,
  buildFormulaLayerState,
  formulaLayerProjectedLabelTextDataAttributes,
  summarizeActiveProjectedLabelText
} from "./mathFormulaLayer";
import {
  SCENE_TIME_PROGRESSION_SAMPLING_POLICY,
  SCENE_TIME_PROGRESSION_SOURCE_CONTRACT
} from "./mathSceneTimeProgression";
import {
  buildSceneStreamLines,
  STREAM_LINE_FRAME_PLAN_SOURCE_CONTRACT,
  STREAM_LINE_SOURCE_CONTRACT,
  summarizeSceneStreamLines,
  streamLineDataAttributes
} from "./mathStreamLineObjects";
import { VECTOR_FIELD_SOURCE_CONTRACT } from "./mathVectorFieldObjects";
import {
  buildSceneOdeTrajectories,
  odeTrajectoryDataAttributes,
  ODE_TRAJECTORY_SOURCE_CONTRACT,
  summarizeOdeTrajectories
} from "./mathOdeTrajectory";
import { ODE_TRAJECTORY_OBJECT_BRIDGE_SOURCE_CONTRACT } from "./mathOdeTrajectoryObjects";
import { MOBJECT_FAMILY_SOURCE_CONTRACT, buildMobjectFamilyIndex } from "./mathMobjectFamily";
import { MOBJECT_FAMILY_CACHE_SOURCE_CONTRACT } from "./mathMobjectFamilyCache";
import type { MathSceneSpec, Vec3 } from "./mathSceneTypes";
import {
  TRANSFORM_BEGIN_SOURCE_POLICY,
  buildMathTransformBeginPlan,
  summarizeMathTransformBeginPlan,
  transformBeginPlanDataAttributes
} from "./mathTransformBeginPlan";
import {
  buildMathUpdaterExecutionPlan,
  summarizeMathUpdaterExecutionPlan,
  updaterExecutionPlanDataAttributes
} from "./mathUpdaterExecutionPlan";
import {
  buildMathUpdaterSignaturePlan,
  summarizeMathUpdaterSignaturePlan,
  updaterSignatureDataAttributes
} from "./mathUpdaterSignature";
import {
  UPDATER_SUSPENSION_POLICY,
  UPDATER_SUSPENSION_SOURCE_CONTRACT
} from "./mathUpdaterSuspension";
import { SCENE_UPDATE_POLICY_SOURCE_CONTRACT } from "./mathSceneUpdatePolicy";
import {
  buildSceneUpdateFramePlan,
  SCENE_UPDATE_FRAME_FRAME_POLICY,
  SCENE_UPDATE_FRAME_SOURCE_CONTRACT,
  sceneUpdateFrameDataAttributes
} from "./mathSceneUpdateFrame";
import {
  buildSceneEmitFramePlan,
  SCENE_EMIT_FRAME_SOURCE_CONTRACT,
  SCENE_EMIT_FRAME_WRITE_POLICY,
  sceneEmitFrameDataAttributes
} from "./mathSceneEmitFrame";
import {
  buildSceneProgressThroughAnimationsPlan,
  PROGRESS_THROUGH_ANIMATIONS_FRAME_POLICY,
  PROGRESS_THROUGH_ANIMATIONS_SOURCE_CONTRACT,
  PROGRESS_THROUGH_ANIMATIONS_UPDATE_MOBJECTS_POLICY,
  sceneProgressThroughAnimationsDataAttributes
} from "./mathSceneProgressThroughAnimations";
import {
  SCENE_PLAY_COMPILATION_PREPARE_POLICY,
  SCENE_PLAY_COMPILATION_SOURCE_CONTRACT,
  buildScenePlayCompilationPlan,
  scenePlayCompilationDataAttributes
} from "./mathScenePlayCompilation";
import {
  SCENE_BEGIN_ANIMATIONS_SOURCE_CONTRACT,
  SCENE_BEGIN_ANIMATIONS_START_STATE_POLICY,
  buildSceneBeginAnimationsPlan,
  sceneBeginAnimationsDataAttributes
} from "./mathSceneBeginAnimations";
import {
  SCENE_FINISH_ANIMATIONS_CLEANUP_POLICY,
  SCENE_FINISH_ANIMATIONS_RESUME_POLICY,
  SCENE_FINISH_ANIMATIONS_SOURCE_CONTRACT,
  buildSceneFinishAnimationsPlan,
  sceneFinishAnimationsDataAttributes
} from "./mathSceneFinishAnimations";
import {
  SCENE_PRE_PLAY_SKIP_GATE_POLICY,
  SCENE_PRE_PLAY_SOURCE_CONTRACT,
  buildScenePrePlayControlPlan,
  scenePrePlayControlDataAttributes
} from "./mathScenePrePlayControl";
import {
  SCENE_POST_PLAY_PREVIEW_POLICY,
  SCENE_POST_PLAY_SOURCE_CONTRACT,
  buildScenePostPlayPreviewPlan,
  scenePostPlayPreviewDataAttributes
} from "./mathScenePostPlayPreview";
import {
  SCENE_POST_CELL_COMMENT_LABEL_POLICY,
  SCENE_POST_CELL_REDRAW_POLICY,
  SCENE_POST_CELL_REDRAW_SOURCE_CONTRACT,
  buildScenePostCellRedrawPlan,
  scenePostCellRedrawDataAttributes
} from "./mathScenePostCellRedraw";
import {
  SCENE_SHORTCUT_AUTHORING_POLICY,
  SCENE_SHORTCUT_CATALOG_SOURCE_CONTRACT,
  buildSceneShortcutCatalog,
  sceneShortcutCatalogDataAttributes
} from "./mathSceneShortcutCatalog";
import {
  SCENE_RELOAD_RESET_POLICY,
  SCENE_RELOAD_SOURCE_CONTRACT,
  buildSceneReloadPlan,
  sceneReloadPlanDataAttributes
} from "./mathSceneReloadPlan";
import {
  SCENE_WAIT_CONTROL_FRAME_POLICY,
  SCENE_WAIT_CONTROL_SOURCE_CONTRACT,
  SCENE_WAIT_CONTROL_UPDATER_POLICY
} from "./mathSceneWaitControl";
import { SCENE_WAIT_FRAME_STEPPER_BRIDGE_SOURCE_CONTRACT } from "./mathSceneWaitFrameStepperBridge";
import {
  SCENE_SKIPPING_WINDOW_GATE_POLICY,
  SCENE_SKIPPING_WINDOW_SOURCE_CONTRACT,
  buildSceneSkippingWindowPlan,
  sceneSkippingWindowDataAttributes
} from "./mathSceneSkippingWindow";
import {
  SCENE_SKIP_CONTROL_SOURCE_CONTRACT,
  SCENE_SKIP_CONTROL_STATE_POLICY,
  buildSceneSkipControlPlan,
  sceneSkipControlDataAttributes
} from "./mathSceneSkipControl";
import {
  SCENE_PROGRESS_CONTROL_SOURCE_CONTRACT,
  SCENE_PROGRESS_CONTROL_STATE_POLICY,
  buildSceneProgressControlPlan,
  sceneProgressControlDataAttributes
} from "./mathSceneProgressControl";
import {
  buildSceneRenderBatches,
  sceneRenderBatchDataAttributes
} from "./mathSceneRenderBatches";
import {
  buildMathSceneSelectorCatalog,
  mathSceneSelectorDataAttributes,
  summarizeMathSceneSelectorCatalog
} from "./mathSceneSelectorCatalog";
import {
  buildTexColorMap,
  texColorMapDataAttributes
} from "./mathTexColorMap";
import {
  buildTexColorizedFormula,
  texColorizedFormulaDataAttributes,
  TEX_COLORIZED_FORMULA_SOURCE_CONTRACT
} from "./mathTexColorizedFormula";
import {
  buildTexIsolationEvidence,
  texIsolationEvidenceDataAttributes
} from "./mathTexIsolation";
import {
  buildMathTexCacheManifest,
  TEX_CACHE_MANIFEST_SOURCE_CONTRACT,
  texCacheManifestDataAttributes
} from "./mathTexCacheManifest";
import {
  buildMathTexCompilePipeline,
  TEX_COMPILE_PIPELINE_SOURCE_CONTRACT,
  texCompilePipelineDataAttributes
} from "./mathTexCompilePipeline";
import {
  buildMobjectMaterialUniformEvidence,
  mobjectMaterialUniformEvidenceDataAttributes
} from "./mathMobjectMaterialUniforms";
import {
  buildVMobjectLineRenderEvidence,
  buildVMobjectSurfaceFillRenderEvidence,
  vmobjectLineRenderEvidenceDataAttributes,
  vmobjectSurfaceFillRenderEvidenceDataAttributes
} from "./mathVMobjectRenderStyle";
import {
  buildRuntimeRenderStateEvidence,
  runtimeRenderStateEvidenceDataAttributes
} from "./mathRuntimeRenderState";
import {
  buildTimelineEvidence,
  timelineEvidenceDataAttributes,
  timelineFocusTargetIds
} from "./mathTimeline";
import {
  buildMobjectAnchorEvidence,
  mobjectAnchorEvidenceDataAttributes
} from "./mathMobjectAnchors";
import {
  buildParameterPanelCatalog,
  parameterPanelDataAttributes,
  summarizeParameterPanelCatalog
} from "./mathParameterPanel";
import {
  buildSceneInteractLoopPlan,
  SCENE_INTERACT_LOOP_SOURCE_CONTRACT,
  SCENE_INTERACT_LOOP_STATE_POLICY,
  sceneInteractLoopDataAttributes
} from "./mathSceneInteractLoop";
import {
  buildSceneRunInteractBridgePlan,
  SCENE_RUN_INTERACT_BRIDGE_SOURCE_CONTRACT,
  sceneRunInteractBridgeDataAttributes
} from "./mathSceneRunInteractBridge";
import {
  buildSceneFloorPlanePlan,
  SCENE_FLOOR_PLANE_SOURCE_CONTRACT,
  sceneFloorPlaneDataAttributes
} from "./mathSceneFloorPlane";
import {
  buildScenePointerControlPlan,
  scenePointerControlDataAttributes
} from "./mathScenePointerControls";
import { SCENE_PICKING_SOURCE_CONTRACT, scenePickDataAttributes } from "./mathScenePicking";
import { sceneKeyControlDataAttributes } from "./mathSceneKeyControls";
import {
  buildSceneWindowEventPlan,
  SCENE_WINDOW_EVENT_SOURCE_CONTRACT,
  sceneWindowEventDataAttributes
} from "./mathSceneWindowEvents";
import { sceneSoundCueDataAttributes } from "./mathSceneSoundCue";

const expectedSceneKeyControlSourceContract =
  "Scene.on_key_press/on_key_release: dispatch EVENT_DISPATCHER, reset camera.frame, undo/redo, quit_interaction, and release hold_on_wait";
const expectedScenePointerControlSourceContract =
  "Scene.on_mouse_*: update mouse points, dispatch EVENT_DISPATCHER, then pan/scale camera frame unless propagation stops";
const expectedScenePresenterHoldSourceContract =
  "Scene.wait presenter mode: log note, hold_loop update_frame(1/fps) until space/right release, then restore hold_on_wait";
const expectedSmokeHookSourceContract =
  "InteractiveSceneEmbed->EvidenceHarness|Playwright smoke hook selector manifest";
const expectedSceneHistorySourceContract =
  "Scene.save_state/restore: undo_stack redo_stack max_num_saved_states mobjects_match" as const;
import {
  buildScenePresenterHoldPlan,
  scenePresenterHoldDataAttributes
} from "./mathScenePresenterHold";
import {
  buildSceneFileWriterSegmentPlan,
  SCENE_FILE_WRITER_SEGMENT_SOURCE_CONTRACT,
  sceneFileWriterSegmentDataAttributes
} from "./mathSceneFileWriterSegments";
import {
  buildScenePlaybackFileWriterBridgePlan,
  SCENE_PLAYBACK_FILE_WRITER_BRIDGE_SOURCE_CONTRACT,
  scenePlaybackFileWriterBridgeDataAttributes
} from "./mathScenePlaybackFileWriterBridge";
import {
  buildSceneFileWriterCombinePlan,
  SCENE_FILE_WRITER_COMBINE_SOURCE_CONTRACT,
  sceneFileWriterCombineDataAttributes
} from "./mathSceneFileWriterCombinePlan";
import {
  buildCheckpointPasteFileWriterBridgePlan,
  checkpointPasteFileWriterBridgeDataAttributes,
  SCENE_CHECKPOINT_PASTE_FILE_WRITER_BRIDGE_SOURCE_CONTRACT
} from "./mathCheckpointPasteFileWriterBridge";
import {
  buildSceneRunFileWriterFinishBridgePlan,
  sceneRunFileWriterFinishBridgeDataAttributes,
  SCENE_RUN_FILE_WRITER_FINISH_BRIDGE_SOURCE_CONTRACT
} from "./mathSceneRunFileWriterFinishBridge";
import { SCENE_FILE_WRITER_SOURCE_CONTRACT } from "./mathSceneFileWriterPlan";
import { sceneHistoryDataAttributes } from "./mathSceneHistory";
import {
  buildMathCheckpointPastePlan,
  checkpointPastePlanDataAttributes,
  SCENE_CHECKPOINT_PASTE_REPLAY_POLICY,
  SCENE_CHECKPOINT_PASTE_SOURCE_CONTRACT
} from "./mathCheckpointPastePlan";
import {
  buildSceneCheckpointStoreManifest,
  SCENE_CHECKPOINT_STORE_SOURCE_CONTRACT,
  sceneCheckpointStoreDataAttributes
} from "./mathSceneCheckpoint";
import {
  CAMERA_SHOT_AUTHORING_SOURCE_CONTRACT,
  buildCameraShotCatalog,
  cameraShotCatalogDataAttributes,
  summarizeCameraShotCatalog
} from "./mathCameraShotAuthoring";
import {
  CAMERA_DIRECTOR_SOURCE_CONTRACT,
  buildCameraDirectorEvidence,
  cameraDirectorEvidenceDataAttributes
} from "./mathCameraDirector";
import {
  buildSceneCreationPrimitivePlan,
  creationPrimitivePlanDataAttributes,
  summarizeSceneCreationPrimitivePlan
} from "./mathCreationPrimitives";
import {
  SHOW_CREATION_PARTIAL_POLICY,
  SHOW_CREATION_SOURCE_CONTRACT,
  buildShowCreationEvidence,
  showCreationEvidenceDataAttributes,
  summarizeShowCreationEvidence
} from "./mathShowCreationEvidence";
import {
  DRAW_BORDER_THEN_FILL_PHASE_POLICY,
  DRAW_BORDER_THEN_FILL_SOURCE_CONTRACT,
  buildDrawBorderThenFillEvidence,
  drawBorderThenFillEvidenceDataAttributes,
  summarizeDrawBorderThenFillEvidence
} from "./mathDrawBorderThenFillEvidence";
import {
  FADE_GROW_PHASE_POLICY,
  FADE_GROW_SOURCE_CONTRACT,
  buildFadeGrowEvidence,
  fadeGrowEvidenceDataAttributes,
  summarizeFadeGrowEvidence
} from "./mathFadeGrowEvidence";
import {
  INDICATION_PRIMITIVE_SOURCE_CONTRACT,
  INDICATION_PRIMITIVE_STATE_POLICY,
  buildSceneIndicationPrimitivePlan,
  indicationPrimitivePlanDataAttributes,
  summarizeSceneIndicationPrimitivePlan
} from "./mathIndicationPrimitives";
import {
  RUNTIME_INDICATION_OVERLAY_SOURCE_CONTRACT,
  RUNTIME_INDICATION_OVERLAY_STATE_POLICY,
  buildRuntimeIndicationOverlayFrames,
  runtimeIndicationOverlayDataAttributes,
  summarizeRuntimeIndicationOverlayFrames
} from "./mathRuntimeIndicationOverlay";
import {
  buildProjectedLabelAnchorsFromRuntimeState,
  PROJECTED_LABEL_SOURCE_CONTRACT,
  projectedLabelAnchorDataAttributes,
  summarizeProjectedLabelAnchors
} from "./mathProjectedLabels";
import {
  buildFormulaOverlayCollisionDiagnostics,
  FORMULA_OVERLAY_COLLISION_SOURCE_CONTRACT,
  formulaOverlayCollisionDataAttributes
} from "./mathFormulaCollision";
import {
  TRANSFORM_PATH_NON_POINT_FIELD_POLICY,
  TRANSFORM_PATH_POINTLIKE_FIELD_POLICY,
  TRANSFORM_PATH_FUNCTION_SOURCE_CONTRACT,
  buildTransformPathFunctionCatalog,
  transformPathFunctionCatalogDataAttributes
} from "./mathPathFunctions";
import {
  TRANSFORM_FAMILY_ALIGNMENT_POINT_COUNT_POLICY,
  TRANSFORM_FAMILY_ALIGNMENT_ZIP_POLICY,
  TRANSFORM_FAMILY_ALIGNMENT_SOURCE_CONTRACT
} from "./mathTransformFamilyAlignment";
import { TRANSFORM_POINT_ALIGNMENT_BRIDGE_SOURCE_CONTRACT } from "./mathTransformPointAlignmentBridge";
import {
  RATE_FUNCTION_ALPHA_POLICY,
  RATE_FUNCTION_SOURCE_CONTRACT,
  buildRateFunctionCatalog,
  rateFunctionCatalogDataAttributes
} from "./mathRateFunctions";
import {
  LAG_RATIO_SOURCE_CONTRACT,
  LAG_RATIO_SUB_ALPHA_POLICY,
  buildLagRatioCatalog,
  lagRatioCatalogDataAttributes
} from "./mathLagRatios";
import {
  MOBJECT_INTERPOLATE_RENDER_POLICY,
  animationRuntimeEvidenceDataAttributes,
  buildMathAnimationRuntimeEvidence,
  buildMathAnimationRuntimeFrame
} from "./mathAnimationRuntime";
import { TRANSFORM_DATA_LOCK_SOURCE_CONTRACT } from "./mathTransformDataLock";
import {
  SUB_ALPHA_SOURCE_CONTRACT,
  SUB_ALPHA_WINDOW_POLICY,
  buildSubAlphaSchedule,
  subAlphaScheduleDataAttributes
} from "./mathSubAlphaSchedule";
import {
  VMOBJECT_PARTIAL_CURVE_SOURCE_CONTRACT,
  VMOBJECT_PARTIAL_CURVE_VISIBILITY_POLICY,
  buildCurveObject,
  curvePartialFrameDataAttributes,
  pointwiseBecomePartialCurveObject
} from "./mathCurveObject";
import { VMOBJECT_BEZIER_PATH_SOURCE_CONTRACT } from "./mathVMobjectBezierPath";
import { VMOBJECT_PATH_BUILDER_SOURCE_CONTRACT } from "./mathVMobjectPathBuilder";
import { VMOBJECT_SMOOTH_PATH_SOURCE_CONTRACT } from "./mathVMobjectSmoothPath";
import {
  buildMobjectCopyPlan,
  mobjectCopyPlanDataAttributes,
  summarizeMobjectCopyPlan
} from "./mathMobjectCopyPlan";
import {
  buildMobjectArrangeLayoutPlan,
  MOBJECT_LAYOUT_SOURCE_CONTRACT,
  mobjectLayoutDataAttributes,
  summarizeMobjectLayoutPlan
} from "./mathMobjectLayout";
import {
  buildMobjectRenderOrderPlan,
  mobjectRenderOrderDataAttributes
} from "./mathMobjectRenderOrder";
import { transformFamilyAlignmentDataAttributes } from "./mathTransformFamilyAlignment";
import { transformDataLockEvidenceDataAttributes } from "./mathTransformDataLock";

const functionGraphSpec = buildMathSceneSpecForThreeDFamily({
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

const expectedMidpointTargetCameraDepth = -Number(Math.hypot(2.7, 1.61, 3.4).toFixed(6));

function elapsedAtMidpointOfComposition(compositionId: string) {
  assert.ok(functionGraphSpec);
  let elapsed = 0;

  for (const step of functionGraphSpec.timeline) {
    if (step.type === "animationComposition" && step.compositionId === compositionId) return elapsed + step.duration / 2;
    elapsed += Math.max(0, step.duration);
  }

  throw new Error(`missing animationComposition step for ${compositionId}`);
}

function elapsedAtMidpointOfCameraMove() {
  assert.ok(functionGraphSpec);
  let elapsed = 0;

  for (const step of functionGraphSpec.timeline) {
    if (step.type === "cameraTo") return elapsed + step.duration / 2;
    elapsed += Math.max(0, step.duration);
  }

  throw new Error("missing cameraTo step");
}

function elapsedAtMidpointOfSweepParameter(conceptId: string) {
  assert.ok(functionGraphSpec);
  let elapsed = 0;

  for (const step of functionGraphSpec.timeline) {
    if (step.type === "sweepParameter" && step.conceptId === conceptId) return elapsed + step.duration / 2;
    elapsed += Math.max(0, step.duration);
  }

  throw new Error(`missing sweepParameter step for ${conceptId}`);
}

function playStartSecondsFor(scene: MathSceneSpec) {
  let elapsed = 0;

  return scene.timeline.map((step) => {
    const startSeconds = elapsed;
    elapsed += Math.max(0, step.duration);
    return Number(startSeconds.toFixed(6));
  });
}

function cloneRuntimeState<T>(runtimeState: T): T {
  return JSON.parse(JSON.stringify(runtimeState)) as T;
}

test("builds a serializable MAIS Manim evidence snapshot from semantic runtime state", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 3);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });

  assert.equal(snapshot.sceneId, "mais-manim-function-graph");
  assert.equal(snapshot.familyId, "three-function-graph");
  assert.equal(snapshot.activeStep, "moveAlongPath");
  assert.equal(snapshot.activeConceptId, "probe-point");
  assert.equal(snapshot.cameraShot, "overview");
  assert.equal(snapshot.cameraCanonicalShot, "overview");
  assert.equal(snapshot.objectCount, functionGraphSpec.objects.length);
  assert.equal(snapshot.mathObjectCount, functionGraphSpec.objects.length);
  assert.equal(snapshot.odeTrajectoryCount, 0);
  assert.equal(snapshot.odeTrajectoryInitialStateSummary, "none");
  assert.equal(snapshot.odeTrajectoryStepCountSummary, "none");
  assert.equal(snapshot.odeTrajectoryBoundsSummary, "none");
  assert.equal(snapshot.odeTrajectorySystemSummary, "none");
  assert.equal(snapshot.vectorFieldCount, 0);
  assert.equal(snapshot.vectorFieldSampleCount, 0);
  assert.equal(snapshot.vectorFieldFiniteVectorCount, 0);
  assert.equal(snapshot.vectorFieldZeroVectorCount, 0);
  assert.equal(snapshot.vectorFieldArrowCount, 0);
  assert.equal(snapshot.vectorFieldFiniteArrowLengthCount, 0);
  assert.equal(snapshot.vectorFieldArrowLengthRange, "none");
  assert.equal(snapshot.vectorFieldLengthEncodingMonotonic, true);
  assert.equal(snapshot.vectorFieldLengthEncodingSummary, "lengthEncoding:arrows=0;finite=0;range=none;monotonic=true");
  assert.equal(snapshot.vectorFieldMaxMagnitude, 0);
  assert.equal(snapshot.vectorFieldColorBandSummary, "high:0,mid:0,low:0,zero:0");
  assert.equal(snapshot.vectorFieldCoordinateModeSummary, "math=0;world=0");
  assert.equal(snapshot.vectorFieldSampleGridSummary, "none");
  assert.equal(snapshot.vectorFieldSummary, "vectorFields=0;samples=0;finite=0;zero=0;bands=high:0,mid:0,low:0,zero:0;arrows=0;max=0.000;ids=none");
  assert.equal(snapshot.vectorFieldSystemSummary, "none");
  assert.equal(snapshot.streamLineSetCount, 0);
  assert.equal(snapshot.streamLineCount, 0);
  assert.equal(snapshot.streamLineCompletedLineCount, 0);
  assert.equal(snapshot.streamLineStoppedLineCount, 0);
  assert.equal(snapshot.streamLinePointCount, 0);
  assert.equal(snapshot.streamLineVisiblePointCount, 0);
  assert.equal(snapshot.streamLineObjectCount, 0);
  assert.equal(snapshot.streamLineCoordinateModeSummary, "math=0;world=0");
  assert.equal(snapshot.streamLineIntegrationStepSummary, "none");
  assert.equal(snapshot.streamLineRevealWindowSummary, "none");
  assert.equal(snapshot.streamLineFrameFiniteVisibleLengthCount, 0);
  assert.equal(snapshot.streamLineFrameVisibleLengthRange, "none");
  assert.equal(snapshot.streamLineFrameVisibleLengthSummary, "none");
  assert.equal(snapshot.streamLineFrameWindowRangeSummary, "none");
  assert.equal(snapshot.streamLineSeedGridSummary, "none");
  assert.equal(snapshot.streamLineSummary, "streamLineSets=0;lines=0;completed=0;stopped=0;points=0;visible=0;objects=0;ids=none");
  assert.equal(snapshot.streamLineSystemSummary, "none");
  assert.equal(snapshot.formulaTokenCount, 2);
  assert.equal(snapshot.formulaTokenIds, "function-token,point-token");
  assert.equal(snapshot.semanticBindingCount, 2);
  assert.equal(snapshot.semanticBindingConceptIds, "function-rule,probe-point");
  assert.equal(snapshot.formulaBindingAnchorCount, 2);
  assert.equal(snapshot.formulaBindingMissingAnchorCount, 0);
  assert.equal(snapshot.formulaBindingMissingAnchorTokenIds, "none");
  assert.equal(snapshot.formulaBindingAnchorSourceContract, FORMULA_BINDING_ANCHOR_SOURCE_CONTRACT);
  assert.equal(snapshot.mobjectFamilyMemberCount, 4);
  assert.equal(snapshot.mobjectFamilyRootCount, 2);
  assert.equal(snapshot.mobjectFamilyCacheStatus, "cold-miss");
  assert.equal(snapshot.mobjectFamilyCacheReusable, false);
  assert.equal(snapshot.mobjectFamilyCacheSummary, "status=cold-miss;reusable=false;familyDirty=4;dataDirty=0;reused=0;recomputed=4");
  assert.equal(snapshot.mobjectMaxDepth, 2);
  assert.equal(snapshot.mobjectOrphanCount, 0);
  assert.equal(snapshot.mobjectStateSnapshotCount, 4);
  assert.equal(snapshot.mobjectTargetableCount, 3);
  assert.equal(snapshot.mobjectAnchorObjectCount, 4);
  assert.equal(snapshot.mobjectAnchorNameCount, 7);
  assert.equal(snapshot.mobjectAnchorPointCount, 28);
  assert.equal(snapshot.mobjectAnchorFinitePointCount, 28);
  assert.equal(snapshot.mobjectAnchorEmptyBoundingBoxCount, 1);
  assert.equal(snapshot.mobjectAnchorNames, "back,bottom,center,front,left,right,top");
  assert.equal(snapshot.mobjectAnchorObjectIds, "axes,function-curve,moving-probe,probe-trace");
  assert.match(snapshot.mobjectAnchorSourceContract, /get_critical_point/);
  assert.equal(
    snapshot.mobjectAnchorSummary,
    "mobject-anchors:objects=4:anchors=7:points=28:finite=28:empty=1:names=back,bottom,center,front,left,right,top:ids=axes,function-curve,moving-probe,probe-trace"
  );
  assert.equal(snapshot.mobjectUniformCount, 4);
  assert.equal(snapshot.mobjectFixedInFrameUniformCount, 0);
  assert.equal(snapshot.mobjectShadeIn3DCount, 0);
  assert.equal(snapshot.mobjectClippingPlaneCount, 0);
  assert.equal(snapshot.mobjectTransparentCount, 0);
  assert.equal(snapshot.mobjectUniformSummary, "objects=4;fixed=0;shade3d=0;clipPlanes=0;transparent=0;minOpacity=1.000");
  assert.equal(snapshot.mobjectMaterialObjectCount, 4);
  assert.equal(snapshot.mobjectMaterialTransparentCount, 0);
  assert.equal(snapshot.mobjectMaterialDepthWriteEnabledCount, 4);
  assert.equal(snapshot.mobjectMaterialShadeIn3DCount, 0);
  assert.equal(snapshot.mobjectMaterialClippingPlaneCount, 0);
  assert.equal(snapshot.mobjectMaterialOpacityRange, "1.000..1.000");
  assert.equal(snapshot.mobjectMaterialObjectIds, "axes,function-curve,moving-probe,probe-trace");
  assert.match(snapshot.mobjectMaterialSourceContract, /materialPropsForMobject/);
  assert.equal(
    snapshot.mobjectMaterialSummary,
    "material-uniforms:objects=4:transparent=0:depthWrite=4:shade3d=0:clipPlanes=0:opacityRange=1.000..1.000:ids=axes,function-curve,moving-probe,probe-trace"
  );
  assert.equal((snapshot as Record<string, unknown>).vmobjectStyleCount, 2);
  assert.equal((snapshot as Record<string, unknown>).vmobjectTransparentStrokeCount, 1);
  assert.equal((snapshot as Record<string, unknown>).vmobjectFillCount, 0);
  assert.equal((snapshot as Record<string, unknown>).vmobjectMaxStrokeWidth, 5);
  assert.equal((snapshot as Record<string, unknown>).vmobjectMaxAntiAliasWidth, 1);
  assert.equal((snapshot as Record<string, unknown>).vmobjectMaxJointAngleDegrees, 0);
  assert.equal((snapshot as Record<string, unknown>).vmobjectBaseNormalObjectIds, "function-curve,probe-trace");
  assert.equal((snapshot as Record<string, unknown>).vmobjectStrokeZoomScreenSpaceCount, 2);
  assert.equal((snapshot as Record<string, unknown>).vmobjectStrokeZoomWorldSpaceCount, 0);
  assert.equal((snapshot as Record<string, unknown>).vmobjectStyleObjectIds, "function-curve,probe-trace");
  assert.equal(
    (snapshot as Record<string, unknown>).vmobjectStyleSummary,
    "objects=2;strokeRoles=function,trace;fillRoles=reference;transparentStroke=1;filled=0;maxStrokeWidth=5.00;minStrokeOpacity=0.55;maxAntiAliasWidth=1.00;maxJointAngle=0.00;baseNormals=function-curve,probe-trace;strokeZoom=screen-space:2,world-space:0"
  );
  assert.equal(snapshot.mobjectDataChangedCount, 0);
  assert.equal(snapshot.mobjectBoundingBoxStaleCount, 0);
  assert.equal(snapshot.mobjectAnimationOwnedInvalidationCount, 0);
  assert.equal(snapshot.mobjectUpdaterActiveInvalidationCount, 0);
  assert.equal(snapshot.mobjectUnknownInvalidationCount, 0);
  assert.equal(snapshot.mobjectInvalidationOwnershipSummary, "none");
  assert.equal(snapshot.mobjectUniformsChangedCount, 0);
  assert.equal(snapshot.mobjectInvalidationSummary, "data=0;bbox=0;family=0;metadata=0;uniforms=0;unchanged=4");
  assert.equal(snapshot.sceneTopLevelMobjectCount, 2);
  assert.equal(snapshot.sceneRenderGroupCount, 4);
  assert.equal(snapshot.sceneRenderGroupIds, "axes,function-curve,moving-probe,probe-trace");
  assert.equal(snapshot.sceneRenderGroupOverlapCount, 0);
  assert.equal(snapshot.sceneRenderGroupOverlapIds, "none");
  assert.equal(snapshot.sceneRenderableCount, 4);
  assert.equal(snapshot.sceneRenderableIds, "axes,function-curve,moving-probe,probe-trace");
  assert.equal(snapshot.sceneForegroundCount, 0);
  assert.equal(snapshot.sceneForegroundIds, "none");
  assert.equal(snapshot.sceneFixedInFrameCount, 0);
  assert.equal(snapshot.sceneFixedInFrameIds, "none");
  assert.equal(snapshot.sceneMembershipActiveIntroducerCount, 0);
  assert.equal(snapshot.sceneMembershipActiveIntroducerIds, "none");
  assert.equal(snapshot.sceneMembershipActiveRemoverCount, 0);
  assert.equal(snapshot.sceneMembershipActiveRemoverIds, "none");
  assert.equal(snapshot.sceneMembershipExcludedCount, 0);
  assert.equal(snapshot.sceneMembershipExcludedIds, "none");
  assert.equal(snapshot.sceneMembershipPendingIntroducerCount, 0);
  assert.equal(snapshot.sceneMembershipPendingIntroducerIds, "none");
  assert.equal(snapshot.sceneMembershipRemovedCount, 0);
  assert.equal(snapshot.sceneMembershipRemovedIds, "none");
  assert.equal(snapshot.parameterTrackerCount, 6);
  assert.equal(snapshot.parameterTrackerIds, "comparison,depth,mode,primary,secondary,value");
  assert.equal(snapshot.parameterTrackerValues, "5.000,1.400,0.000,6.000,5.000,6.000");
  assert.match(snapshot.parameterTrackerSummary, /value=6\.000/);
  assert.equal(snapshot.manimAnimationPlanCount, 2);
  assert.equal(snapshot.manimAnimationOperationCount, 4);
  assert.equal(snapshot.manimAnimationObjectCount, 2);
  assert.equal(snapshot.manimAnimationCompositionCount, 1);
  assert.equal(snapshot.manimAnimationCompositionWindowCount, 2);
  assert.equal(snapshot.manimAnimationCompositionModes, "laggedStart");
  assert.equal(snapshot.manimAnimationCompositionDuration, 1.44);
  assert.equal(snapshot.manimAnimationCompositionIssueCount, 0);
  assert.equal(snapshot.manimTransformStepCount, 0);
  assert.equal(snapshot.manimRandomSeedAlgorithm, "mulberry32");
  assert.match(snapshot.manimRandomSeedSignature, /^rng-[0-9a-f]{8}$/);
  assert.equal(Number.isInteger(snapshot.manimRandomSeed), true);
  assert.equal(snapshot.manimPlaybackActivePlayIndex, 1);
  assert.equal(snapshot.manimPlaybackLifecyclePhase, "progress");
  assert.equal(snapshot.manimPlaybackCompletedPlayCount, 1);
  assert.equal(snapshot.manimPlaybackPendingPlayCount, 4);
  assert.equal(snapshot.manimPlaybackUpdatesDuringActivePlay, false);
  assert.equal(snapshot.manimPlaybackEventCount, 64);
  assert.equal(snapshot.manimPlaybackSourceContract, SCENE_PLAYBACK_SOURCE_CONTRACT);
  assert.match(snapshot.manimPlaybackLifecycleSummary, /play=1;phase=progress;alpha=0\.167;completed=1;pending=4;updates=false/);
  assert.match(snapshot.manimPlaybackActiveEventSummary, /1:prePlay@2\.400\/raw=0\.000\/eased=0\.000\/rate=linear/);
  assert.match(snapshot.manimPlaybackActiveEventSummary, /1:postPlay@6\.000\/raw=1\.000\/eased=1\.000\/rate=linear/);
  assert.equal(
    evidenceDataAttributes(snapshot)["data-viz-manim-playback-source-contract"],
    SCENE_PLAYBACK_SOURCE_CONTRACT
  );
  assert.equal(snapshot.manimTimeProgressionFrameCount, 15);
  assert.equal(snapshot.manimTimeProgressionFinalTime, 3.75);
  assert.equal(snapshot.manimTimeProgressionMode, "sampled");
  assert.equal(snapshot.manimTimeProgressionOvershoot, true);
  assert.equal(snapshot.manimTimeProgressionSummary, "timeProgression:sampled:run=3.600:fps=4:frames=15:final=3.750:overshoot=true");
  assert.equal(
    evidenceDataAttributes(snapshot)["data-viz-manim-time-progression-times-summary"],
    "times:0.250,0.500,0.750,1.000,1.250,1.500,1.750,2.000,2.250,2.500,2.750,3.000,3.250,3.500,3.750"
  );
  assert.equal(snapshot.manimActiveAnimationPlanId, "none");
  assert.equal(snapshot.manimActiveAnimationObjectId, "none");
  assert.equal(snapshot.manimActiveAnimationTargetObjectId, "none");
  assert.equal(snapshot.manimActiveAnimationNodeCount, 0);
  assert.equal(snapshot.manimActiveAnimationProgress, 1);
  assert.equal(snapshot.manimShouldUpdateMobjects, true);
  assert.equal(snapshot.manimShouldCaptureFrame, true);
  assert.equal(snapshot.manimUpdatePolicyReason, "has-updaters");
  assert.equal(snapshot.manimUpdatePolicySourceContract, SCENE_UPDATE_POLICY_SOURCE_CONTRACT);
  assert.equal(snapshot.manimUpdatePolicySummary, "updatePolicy:update=true:capture=true:reason=has-updaters:updaters=4");
  assert.equal(snapshot.updaterActiveCount, 4);
  assert.equal(snapshot.updaterSuspendedCount, 0);
  assert.deepEqual(snapshot.bindingIssues, []);
});

test("records scene VectorField evidence for dynamic-system browser QA", () => {
  const complexPlaneSpec = buildMathSceneSpecForThreeDFamily({
    accent: "#a78bfa",
    state: {
      comparison: 7,
      depthValue: 1.9,
      familyId: "three-complex-plane",
      mode: 1,
      primaryValue: 7.2,
      secondaryValue: 7.25,
      stateSummary: "family=three-complex-plane;template=complex-plane;value=7.200;comparison=7.250;depth=1.900",
      templateId: "complex-plane",
      value: 6
    }
  });
  assert.ok(complexPlaneSpec);
  const runtimeState = buildMathSceneRuntimeState(complexPlaneSpec, 5.2);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: runtimeState.sourceScene
  });
  const attributes = evidenceDataAttributes(snapshot);
  const expectedStreamLineSummary = summarizeSceneStreamLines(buildSceneStreamLines(runtimeState.sourceScene), {
    elapsedSeconds: runtimeState.timeline.elapsedSeconds
  });
  const expectedStreamLineAttributes = streamLineDataAttributes(expectedStreamLineSummary);
  const expectedOdeSummary = summarizeOdeTrajectories(buildSceneOdeTrajectories(runtimeState.sourceScene));
  const expectedOdeAttributes = odeTrajectoryDataAttributes(expectedOdeSummary);

  assert.equal(snapshot.odeTrajectoryCount, 1);
  assert.equal(snapshot.odeTrajectoryInitialStateSummary, "complex-rotation-flow=[-0.488,-1.096,0.200]");
  assert.equal(snapshot.odeTrajectoryStepCountSummary, "complex-rotation-flow=144");
  assert.equal(snapshot.odeTrajectoryBoundsSummary, "complex-rotation-flow=x=[-2.400,2.400],y=[-2.400,2.400],z=[-1.000,1.000]");
  assert.equal(snapshot.odeTrajectorySystemSummary, "complex-rotation-flow:linear2d[[0.000,-1.000],[1.000,0.000]]");
  assert.equal(snapshot.odeTrajectorySourceContract, ODE_TRAJECTORY_SOURCE_CONTRACT);
  assert.equal(snapshot.odeTrajectoryObjectSourceContract, ODE_TRAJECTORY_OBJECT_BRIDGE_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-ode-object-source-contract"], ODE_TRAJECTORY_OBJECT_BRIDGE_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-ode-source-contract"], ODE_TRAJECTORY_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-ode-initial-state-summary"], expectedOdeAttributes["data-viz-manim-ode-initial-state-summary"]);
  assert.equal(attributes["data-viz-manim-ode-step-count-summary"], expectedOdeAttributes["data-viz-manim-ode-step-count-summary"]);
  assert.equal(attributes["data-viz-manim-ode-bounds-summary"], expectedOdeAttributes["data-viz-manim-ode-bounds-summary"]);
  assert.equal(attributes["data-viz-manim-ode-system-summary"], expectedOdeAttributes["data-viz-manim-ode-system-summary"]);
  assert.equal(snapshot.vectorFieldCount, 1);
  assert.equal(snapshot.vectorFieldSampleCount, 9);
  assert.equal(snapshot.vectorFieldFiniteVectorCount, 9);
  assert.equal(snapshot.vectorFieldZeroVectorCount, 1);
  assert.equal(snapshot.vectorFieldHighBandCount, 8);
  assert.equal(snapshot.vectorFieldMidBandCount, 0);
  assert.equal(snapshot.vectorFieldLowBandCount, 0);
  assert.equal(snapshot.vectorFieldZeroBandCount, 1);
  assert.equal(snapshot.vectorFieldArrowCount, 9);
  assert.equal(snapshot.vectorFieldFiniteArrowLengthCount, 9);
  assert.equal(snapshot.vectorFieldArrowLengthRange, "0.000..0.240");
  assert.equal(snapshot.vectorFieldLengthEncodingMonotonic, true);
  assert.equal(snapshot.vectorFieldLengthEncodingSummary, "lengthEncoding:arrows=9;finite=9;range=0.000..0.240;monotonic=true");
  assert.equal(snapshot.vectorFieldMaxMagnitude.toFixed(3), "2.404");
  assert.equal(snapshot.vectorFieldColorBandSummary, "high:8,mid:0,low:0,zero:1");
  assert.equal(snapshot.vectorFieldCoordinateModeSummary, "math=1;world=0");
  assert.equal(snapshot.vectorFieldSampleGridSummary, "complex-rotation-field:3x3:x=[-1.700,1.700]:y=[-1.700,1.700]:z=0.200:mode=math");
  assert.equal(snapshot.vectorFieldSourceContract, VECTOR_FIELD_SOURCE_CONTRACT);
  assert.equal(snapshot.vectorFieldSummary, "vectorFields=1;samples=9;finite=9;zero=1;bands=high:8,mid:0,low:0,zero:1;arrows=9;max=2.404;ids=complex-rotation-field");
  assert.equal(snapshot.vectorFieldSystemSummary, "complex-rotation-field:linear2d[[0.000,-1.000],[1.000,0.000]]");
  assert.equal(attributes["data-viz-manim-vector-field-color-band-summary"], "high:8,mid:0,low:0,zero:1");
  assert.equal(attributes["data-viz-manim-vector-field-coordinate-mode-summary"], "math=1;world=0");
  assert.equal(attributes["data-viz-manim-vector-field-count"], "1");
  assert.equal(attributes["data-viz-manim-vector-field-sample-count"], "9");
  assert.equal(attributes["data-viz-manim-vector-field-source-contract"], VECTOR_FIELD_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-vector-field-finite-vector-count"], "9");
  assert.equal(attributes["data-viz-manim-vector-field-zero-vector-count"], "1");
  assert.equal(attributes["data-viz-manim-vector-field-high-band-count"], "8");
  assert.equal(attributes["data-viz-manim-vector-field-mid-band-count"], "0");
  assert.equal(attributes["data-viz-manim-vector-field-low-band-count"], "0");
  assert.equal(attributes["data-viz-manim-vector-field-zero-band-count"], "1");
  assert.equal(attributes["data-viz-manim-vector-field-arrow-count"], "9");
  assert.equal(attributes["data-viz-manim-vector-field-finite-arrow-length-count"], "9");
  assert.equal(attributes["data-viz-manim-vector-field-arrow-length-range"], "0.000..0.240");
  assert.equal(attributes["data-viz-manim-vector-field-length-encoding-monotonic"], "true");
  assert.equal(attributes["data-viz-manim-vector-field-length-encoding-summary"], snapshot.vectorFieldLengthEncodingSummary);
  assert.equal(attributes["data-viz-manim-vector-field-max-magnitude"], "2.404");
  assert.equal(attributes["data-viz-manim-vector-field-sample-grid-summary"], snapshot.vectorFieldSampleGridSummary);
  assert.equal(attributes["data-viz-manim-vector-field-summary"], snapshot.vectorFieldSummary);
  assert.equal(attributes["data-viz-manim-vector-field-system-summary"], snapshot.vectorFieldSystemSummary);
  assert.equal(snapshot.streamLineSetCount, 1);
  assert.equal(snapshot.streamLineCount, 4);
  assert.equal(snapshot.streamLineCompletedLineCount, 4);
  assert.equal(snapshot.streamLineStoppedLineCount, 0);
  assert.equal(snapshot.streamLinePointCount, 76);
  assert.equal(snapshot.streamLineAnimatedWindowCount, expectedStreamLineSummary.animatedWindowCount);
  assert.equal(snapshot.streamLineWrappedWindowCount, expectedStreamLineSummary.wrappedWindowCount);
  assert.equal(snapshot.streamLineFramePlanSegmentCount, expectedStreamLineSummary.framePlanSegmentCount);
  assert.equal(snapshot.streamLineFramePlanSourceContract, STREAM_LINE_FRAME_PLAN_SOURCE_CONTRACT);
  assert.equal(snapshot.streamLineFramePlanVisibleLineCount, expectedStreamLineSummary.framePlanVisibleLineCount);
  assert.equal(snapshot.streamLineFrameFiniteVisibleLengthCount, expectedStreamLineSummary.frameFiniteVisibleLengthCount);
  assert.equal(snapshot.streamLineFrameVisibleLengthRange, expectedStreamLineSummary.frameVisibleLengthRange);
  assert.equal(snapshot.streamLineFrameVisibleLengthSummary, expectedStreamLineSummary.frameVisibleLengthSummary);
  assert.equal(snapshot.streamLineFramePhaseOrder, expectedStreamLineSummary.framePhaseOrder);
  assert.equal(
    snapshot.streamLineFrameWindowRangeSummary,
    "complex-rotation-streamlines:line-0=0.513..0.733;complex-rotation-streamlines:line-1=0.693..0.913;complex-rotation-streamlines:line-2=0.873..1.000+0.000..0.093;complex-rotation-streamlines:line-3=0.053..0.273"
  );
  assert.equal(snapshot.streamLinePhaseOffsetRange, expectedStreamLineSummary.phaseOffsetRange);
  assert.equal(snapshot.streamLineCycleSecondsSummary, expectedStreamLineSummary.cycleSecondsSummary);
  assert.equal(snapshot.streamLineCoordinateModeSummary, "math=1;world=0");
  assert.equal(snapshot.streamLineIntegrationStepSummary, "complex-rotation-streamlines:dt=0.080:steps=18");
  assert.equal(snapshot.streamLineRevealWindowSummary, "complex-rotation-streamlines:cycle=3.000s:visible=0.220:phaseStep=0.180:wrap=true");
  assert.equal(snapshot.streamLineSeedGridSummary, "complex-rotation-streamlines:2x2:x=[-1.350,1.350]:y=[-1.350,1.350]:z=0.200:mode=math");
  assert.equal(snapshot.streamLineSystemSummary, "complex-rotation-streamlines:linear2d[[0.000,-1.000],[1.000,0.000]]");
  assert.equal(snapshot.streamLineVisibleProgressSummary, expectedStreamLineSummary.visibleProgressSummary);
  assert.equal(snapshot.streamLineSourceContract, STREAM_LINE_SOURCE_CONTRACT);
  assert.ok(snapshot.streamLineVisiblePointCount > 0);
  assert.ok(snapshot.streamLineVisiblePointCount < snapshot.streamLinePointCount);
  assert.equal(snapshot.streamLineObjectCount, 4);
  assert.match(snapshot.streamLineSummary, /^streamLineSets=1;lines=4;completed=4;stopped=0;points=76;visible=\d+;objects=4;ids=complex-rotation-streamlines$/);
  assert.equal(attributes["data-viz-manim-stream-line-set-count"], "1");
  assert.equal(attributes["data-viz-manim-stream-line-count"], "4");
  assert.equal(attributes["data-viz-manim-stream-line-completed-line-count"], "4");
  assert.equal(attributes["data-viz-manim-stream-line-stopped-line-count"], "0");
  assert.equal(attributes["data-viz-manim-stream-line-point-count"], "76");
  assert.equal(
    attributes["data-viz-manim-stream-line-animated-window-count"],
    expectedStreamLineAttributes["data-viz-manim-stream-line-animated-window-count"]
  );
  assert.equal(
    attributes["data-viz-manim-stream-line-wrapped-window-count"],
    expectedStreamLineAttributes["data-viz-manim-stream-line-wrapped-window-count"]
  );
  assert.equal(
    attributes["data-viz-manim-stream-line-frame-plan-segment-count"],
    expectedStreamLineAttributes["data-viz-manim-stream-line-frame-plan-segment-count"]
  );
  assert.equal(
    attributes["data-viz-manim-stream-line-frame-plan-source-contract"],
    STREAM_LINE_FRAME_PLAN_SOURCE_CONTRACT
  );
  assert.equal(
    attributes["data-viz-manim-stream-line-frame-plan-visible-line-count"],
    expectedStreamLineAttributes["data-viz-manim-stream-line-frame-plan-visible-line-count"]
  );
  assert.equal(
    attributes["data-viz-manim-stream-line-frame-finite-visible-length-count"],
    expectedStreamLineAttributes["data-viz-manim-stream-line-frame-finite-visible-length-count"]
  );
  assert.equal(
    attributes["data-viz-manim-stream-line-frame-visible-length-range"],
    expectedStreamLineAttributes["data-viz-manim-stream-line-frame-visible-length-range"]
  );
  assert.equal(
    attributes["data-viz-manim-stream-line-frame-visible-length-summary"],
    expectedStreamLineAttributes["data-viz-manim-stream-line-frame-visible-length-summary"]
  );
  assert.equal(
    attributes["data-viz-manim-stream-line-frame-phase-order"],
    expectedStreamLineAttributes["data-viz-manim-stream-line-frame-phase-order"]
  );
  assert.equal(
    attributes["data-viz-manim-stream-line-frame-window-range-summary"],
    snapshot.streamLineFrameWindowRangeSummary
  );
  assert.equal(
    attributes["data-viz-manim-stream-line-phase-offset-range"],
    expectedStreamLineAttributes["data-viz-manim-stream-line-phase-offset-range"]
  );
  assert.equal(
    attributes["data-viz-manim-stream-line-cycle-seconds-summary"],
    expectedStreamLineAttributes["data-viz-manim-stream-line-cycle-seconds-summary"]
  );
  assert.equal(attributes["data-viz-manim-stream-line-coordinate-mode-summary"], "math=1;world=0");
  assert.equal(attributes["data-viz-manim-stream-line-integration-step-summary"], snapshot.streamLineIntegrationStepSummary);
  assert.equal(attributes["data-viz-manim-stream-line-reveal-window-summary"], snapshot.streamLineRevealWindowSummary);
  assert.equal(attributes["data-viz-manim-stream-line-seed-grid-summary"], snapshot.streamLineSeedGridSummary);
  assert.equal(attributes["data-viz-manim-stream-line-source-contract"], STREAM_LINE_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-stream-line-system-summary"], snapshot.streamLineSystemSummary);
  assert.equal(
    attributes["data-viz-manim-stream-line-visible-progress-summary"],
    expectedStreamLineAttributes["data-viz-manim-stream-line-visible-progress-summary"]
  );
  assert.equal(attributes["data-viz-manim-stream-line-visible-point-count"], String(snapshot.streamLineVisiblePointCount));
  assert.equal(attributes["data-viz-manim-stream-line-object-count"], "4");
  assert.equal(attributes["data-viz-manim-stream-line-summary"], snapshot.streamLineSummary);
});

test("records move_along_vector_field updater displacement evidence for browser QA", () => {
  const flowScene: MathSceneSpec = {
    bindings: [],
    cameraShots: [{ id: "overview", position: [0, 0, 8], target: [0, 0, 0] }],
    coordinateSpace: {
      mathRange: { x: [-2, 2], y: [-2, 2], z: [-1, 1] },
      worldRange: { x: [-4, 4], y: [0, 4], z: [-1, 1] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [
      {
        colorRole: "trace",
        conceptId: "flow-vector",
        from: [0, 0, 0],
        id: "flow-vector",
        to: [0, 2, 0],
        type: "vector"
      }
    ],
    sceneId: "move-along-vector-field-evidence-scene",
    timeline: [{ duration: 1, type: "wait" }],
    vectorFieldUpdaters: [
      {
        coordinateMode: "world",
        id: "flow-vector-field",
        objectId: "flow-vector",
        speedScale: 2,
        system: { type: "constantVelocity", velocity: [1, 0, 0] },
        type: "moveAlongVectorField"
      }
    ]
  };
  const runtimeState = buildMathSceneRuntimeState(flowScene, 3);
  const expectedEvidence = buildMoveAlongVectorFieldEvidence([
    evaluateMoveAlongVectorFieldUpdater({
      deltaSeconds: 0.25,
      elapsedSeconds: runtimeState.timeline.elapsedSeconds,
      scene: runtimeState.sourceScene,
      updater: flowScene.vectorFieldUpdaters![0],
      worldAnchor: [0, 1, 0]
    })
  ]);
  const expectedAttributes = moveAlongVectorFieldEvidenceDataAttributes(expectedEvidence);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: flowScene,
    updateFrameEvidence: {
      dtSeconds: 0.25,
      renderGroupIds: ["flow-vector"],
      sceneTimeSeconds: runtimeState.timeline.elapsedSeconds
    }
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimMoveAlongVectorFieldCount, 1);
  assert.equal(snapshot.manimMoveAlongVectorFieldMovedCount, 1);
  assert.equal(snapshot.manimMoveAlongVectorFieldBlockedCount, 0);
  assert.equal(snapshot.manimMoveAlongVectorFieldFiniteVectorCount, 1);
  assert.equal(snapshot.manimMoveAlongVectorFieldFiniteDisplacementCount, 1);
  assert.equal(snapshot.manimMoveAlongVectorFieldUpdaterIds, "flow-vector-field");
  assert.equal(snapshot.manimMoveAlongVectorFieldObjectIds, "flow-vector");
  assert.equal(snapshot.manimMoveAlongVectorFieldCoordinateModes, "world");
  assert.equal(snapshot.manimMoveAlongVectorFieldDeltaSummary, "flow-vector-field=0.250s");
  assert.equal(snapshot.manimMoveAlongVectorFieldSpeedSummary, "flow-vector-field=2.000");
  assert.equal(snapshot.manimMoveAlongVectorFieldVectorMagnitudeRange, "1.000..1.000");
  assert.equal(snapshot.manimMoveAlongVectorFieldDisplacementMagnitudeRange, "0.500..0.500");
  assert.equal(snapshot.manimMoveAlongVectorFieldStatusSummary, "moved=1;missing-anchor=0;non-finite-vector=0;out-of-bounds=0");
  assert.equal(snapshot.manimMoveAlongVectorFieldSourceContract, MOVE_ALONG_VECTOR_FIELD_SOURCE_CONTRACT);
  assert.equal(snapshot.manimMoveAlongVectorFieldSummary, expectedEvidence.summary);
  assert.equal(attributes["data-viz-manim-move-along-vector-field-count"], expectedAttributes["data-viz-manim-move-along-vector-field-count"]);
  assert.equal(attributes["data-viz-manim-move-along-vector-field-moved-count"], expectedAttributes["data-viz-manim-move-along-vector-field-moved-count"]);
  assert.equal(attributes["data-viz-manim-move-along-vector-field-blocked-count"], expectedAttributes["data-viz-manim-move-along-vector-field-blocked-count"]);
  assert.equal(attributes["data-viz-manim-move-along-vector-field-finite-vector-count"], expectedAttributes["data-viz-manim-move-along-vector-field-finite-vector-count"]);
  assert.equal(attributes["data-viz-manim-move-along-vector-field-finite-displacement-count"], expectedAttributes["data-viz-manim-move-along-vector-field-finite-displacement-count"]);
  assert.equal(attributes["data-viz-manim-move-along-vector-field-ids"], expectedAttributes["data-viz-manim-move-along-vector-field-ids"]);
  assert.equal(attributes["data-viz-manim-move-along-vector-field-object-ids"], expectedAttributes["data-viz-manim-move-along-vector-field-object-ids"]);
  assert.equal(attributes["data-viz-manim-move-along-vector-field-coordinate-modes"], expectedAttributes["data-viz-manim-move-along-vector-field-coordinate-modes"]);
  assert.equal(attributes["data-viz-manim-move-along-vector-field-delta-summary"], expectedAttributes["data-viz-manim-move-along-vector-field-delta-summary"]);
  assert.equal(attributes["data-viz-manim-move-along-vector-field-speed-summary"], expectedAttributes["data-viz-manim-move-along-vector-field-speed-summary"]);
  assert.equal(attributes["data-viz-manim-move-along-vector-field-vector-magnitude-range"], expectedAttributes["data-viz-manim-move-along-vector-field-vector-magnitude-range"]);
  assert.equal(attributes["data-viz-manim-move-along-vector-field-displacement-magnitude-range"], expectedAttributes["data-viz-manim-move-along-vector-field-displacement-magnitude-range"]);
  assert.equal(attributes["data-viz-manim-move-along-vector-field-source-contract"], MOVE_ALONG_VECTOR_FIELD_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-move-along-vector-field-status-summary"], expectedAttributes["data-viz-manim-move-along-vector-field-status-summary"]);
  assert.equal(attributes["data-viz-manim-move-along-vector-field-summary"], expectedAttributes["data-viz-manim-move-along-vector-field-summary"]);
});

test("records VMobject pointwise_become_partial curve reveal evidence for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 1.2);
  const curveObject = runtimeState.objectGraph.byId["function-curve"];
  assert.ok(curveObject?.renderState.kind === "polyline");
  const expectedFrame = pointwiseBecomePartialCurveObject(
    buildCurveObject({
      colorRole: curveObject.colorRole ?? "function",
      conceptId: curveObject.conceptId,
      id: curveObject.id,
      samples: curveObject.renderState.points,
      style: curveObject.renderState.style
    }),
    0,
    runtimeState.trackers.byId["function-curve:progress"].value
  );
  const expectedAttributes = curvePartialFrameDataAttributes(expectedFrame);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.curvePartialSourceId, "function-curve");
  assert.equal(snapshot.curvePartialSampleCount, expectedFrame.visibleSampleCount);
  assert.equal(snapshot.curvePartialLength, expectedFrame.visibleLength);
  assert.equal(snapshot.curvePartialSourceContract, VMOBJECT_PARTIAL_CURVE_SOURCE_CONTRACT);
  assert.equal(snapshot.curvePartialVisibilityPolicy, VMOBJECT_PARTIAL_CURVE_VISIBILITY_POLICY);
  assert.equal(snapshot.curvePartialNormalizedRange, "0.000..0.500");
  assert.equal(snapshot.curvePartialRequestedRange, "0.000..0.500");
  assert.equal(snapshot.curvePartialReversed, false);
  assert.equal(snapshot.curvePartialSummary, expectedFrame.summary);
  assert.equal(attributes["data-viz-curve-partial-source-id"], expectedAttributes["data-viz-curve-partial-source-id"]);
  assert.equal(attributes["data-viz-curve-partial-sample-count"], expectedAttributes["data-viz-curve-partial-sample-count"]);
  assert.equal(attributes["data-viz-curve-partial-length"], expectedAttributes["data-viz-curve-partial-length"]);
  assert.equal(attributes["data-viz-curve-partial-normalized-range"], "0.000..0.500");
  assert.equal(attributes["data-viz-curve-partial-requested-range"], "0.000..0.500");
  assert.equal(attributes["data-viz-curve-partial-reversed"], "false");
  assert.equal(attributes["data-viz-curve-partial-source-contract"], VMOBJECT_PARTIAL_CURVE_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-curve-partial-summary"], expectedFrame.summary);
  assert.equal(attributes["data-viz-curve-partial-visibility-policy"], VMOBJECT_PARTIAL_CURVE_VISIBILITY_POLICY);
});

test("records active scene-authored animation frame evidence during transform beats", () => {
  assert.equal(typeof transformFamilyAlignmentDataAttributes, "function");
  assert.equal(typeof transformDataLockEvidenceDataAttributes, "function");
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, elapsedAtMidpointOfComposition("function-attention-lagged-start"));
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.activeStep, "animationComposition");
  assert.equal(snapshot.manimActiveAnimationPlanId, "function-probe-attention-pulse");
  assert.equal(snapshot.manimActiveAnimationPlanIds, "function-curve-attention-lift,function-probe-attention-pulse");
  assert.equal(snapshot.manimActiveAnimationObjectId, "moving-probe");
  assert.equal(snapshot.manimActiveAnimationTargetObjectId, "moving-probe:attention-target");
  assert.equal(snapshot.manimActiveAnimationNodeCount, 5);
  assert.ok(snapshot.manimActiveAnimationProgress > 0.35 && snapshot.manimActiveAnimationProgress < 0.45);
  assert.match(snapshot.manimActiveAnimationNodeProgressSummary, /raw=/);
  assert.match(snapshot.manimActiveAnimationNodeProgressSummary, /lag=/);
  assert.match(snapshot.manimActiveAnimationNodeProgressSummary, /eased=/);
  assert.match(snapshot.manimActiveAnimationNodeProgressSummary, /rate=smooth/);
  assert.equal(snapshot.manimTransformInterpolateBoundingBoxCount, 5);
  assert.equal(snapshot.manimTransformInterpolateFiniteBoundingBoxCount, 3);
  assert.equal(snapshot.manimTransformInterpolateEmptyBoundingBoxCount, 2);
  assert.equal(snapshot.manimTransformInterpolateBoundingBoxObjectIds, "function-curve,moving-probe,probe-trace");
  assert.equal(
    snapshot.manimTransformInterpolateBoundingBoxSummary,
    "transform-interpolate-bounds:nodes=5:finite=3:empty=2:ids=function-curve,moving-probe,probe-trace"
  );
  assert.equal(snapshot.manimTransformInterpolateUniformCount, 5);
  assert.equal(snapshot.manimTransformInterpolateUniformOpacitySampleCount, 5);
  assert.equal(snapshot.manimTransformInterpolateUniformClippingPlaneCount, 0);
  assert.equal(snapshot.manimTransformInterpolateUniformObjectIds, "function-curve,moving-probe,probe-trace");
  assert.equal(snapshot.manimTransformInterpolateUniformOpacityRange, "1.000..1.000");
  assert.equal(
    snapshot.manimTransformInterpolateUniformSummary,
    "transform-interpolate-uniforms:nodes=5:uniforms=5:opacitySamples=5:clipPlanes=0:opacityRange=1.000..1.000:ids=function-curve,moving-probe,probe-trace"
  );
  assert.match(snapshot.manimTransformInterpolateUniformSourceSummary, /Mobject\.interpolate/);
  assert.equal(snapshot.manimTransformInterpolateFieldNodeCount, 5);
  assert.equal(snapshot.manimTransformInterpolateFieldPointlikeCount, 74);
  assert.equal(snapshot.manimTransformInterpolateFieldNonPointCount, 13);
  assert.equal(snapshot.manimTransformInterpolateFieldStyleNodeCount, 3);
  assert.equal(snapshot.manimTransformInterpolateFieldUniformNodeCount, 5);
  assert.equal(snapshot.manimTransformInterpolateFieldBoundingBoxNodeCount, 5);
  assert.equal(snapshot.manimTransformInterpolateFieldArcPathNodeCount, 0);
  assert.equal(snapshot.manimTransformInterpolateFieldStraightPathNodeCount, 5);
  assert.equal(snapshot.manimTransformInterpolateFieldObjectIds, "function-curve,moving-probe,probe-trace");
  assert.equal(snapshot.manimTransformInterpolateFieldPathSummary, "straight:5");
  assert.equal(snapshot.manimTransformInterpolateFieldPointlikeSummary, "point=2/2;polyline=3/72");
  assert.equal(snapshot.manimTransformInterpolateFieldPointlikePolicy, TRANSFORM_PATH_POINTLIKE_FIELD_POLICY);
  assert.equal(snapshot.manimTransformInterpolateFieldNonPointPolicy, TRANSFORM_PATH_NON_POINT_FIELD_POLICY);
  assert.equal(
    snapshot.manimTransformInterpolateFieldSummary,
    "transform-interpolate-fields:nodes=5:pointlike=74:nonPoint=13:style=3:uniforms=5:bounds=5:paths=straight:5:kinds=point=2/2;polyline=3/72"
  );
  assert.match(snapshot.manimTransformInterpolateFieldSourceSummary, /Mobject\.interpolate/);
  assert.equal(snapshot.manimTransformFamilyAlignmentEntryCount, 2);
  assert.equal(snapshot.manimTransformFamilyAlignmentEntries.length, 2);
  assert.deepEqual(
    snapshot.manimTransformFamilyAlignmentEntries.map((entry) => `${entry.kind}:${entry.sourceId}->${entry.targetId}`),
    ["matched:moving-probe->moving-probe", "matched:probe-trace->probe-trace"]
  );
  assert.equal(snapshot.manimTransformFamilyAlignmentMatchedCount, 2);
  assert.equal(snapshot.manimTransformFamilyAlignmentEnteringCount, 0);
  assert.equal(snapshot.manimTransformFamilyAlignmentExitingCount, 0);
  assert.equal(snapshot.manimTransformFamilyAlignmentTypeMismatchCount, 0);
  assert.equal(snapshot.manimTransformFamilyAlignmentMaxDepth, 1);
  assert.equal(snapshot.manimTransformFamilyAlignmentFamilyPairSequence, "moving-probe->moving-probe|probe-trace->probe-trace");
  assert.equal(snapshot.manimTransformFamilyAlignmentFamilyZipCompleteCount, 2);
  assert.equal(snapshot.manimTransformFamilyAlignmentFamilyZipIncompleteCount, 0);
  assert.equal(snapshot.manimTransformFamilyAlignmentFamilyZipPolicy, TRANSFORM_FAMILY_ALIGNMENT_ZIP_POLICY);
  assert.equal(
    snapshot.manimTransformFamilyAlignmentFamilyZipSequence,
    "moving-probe|moving-probe|moving-probe;probe-trace|probe-trace|probe-trace"
  );
  assert.equal(snapshot.manimTransformFamilyAlignmentFamilyZipTupleCount, 2);
  assert.equal(snapshot.manimTransformFamilyAlignmentPointCountPolicy, TRANSFORM_FAMILY_ALIGNMENT_POINT_COUNT_POLICY);
  assert.equal(snapshot.manimTransformFamilyAlignmentSourceRootId, "moving-probe");
  assert.equal(snapshot.manimTransformFamilyAlignmentTargetRootId, "moving-probe");
  assert.equal(snapshot.manimTransformFamilyAlignmentSourceContract, TRANSFORM_FAMILY_ALIGNMENT_SOURCE_CONTRACT);
  assert.equal(
    snapshot.manimTransformFamilyAlignmentSummary,
    "transform-family-align:source=moving-probe:target=moving-probe:entries=2:matched=2:entering=0:exiting=0:typeMismatch=0:maxDepth=1"
  );
  assert.equal(snapshot.manimTransformPointAlignmentMatchedCount, 2);
  assert.equal(snapshot.manimTransformPointAlignmentCompatibleCount, 2);
  assert.equal(snapshot.manimTransformPointAlignmentResampledCount, 0);
  assert.equal(snapshot.manimTransformPointAlignmentTotalPointCount, 1);
  assert.equal(snapshot.manimTransformPointAlignmentPolicySummary, "direct-point-array=1;none=1");
  assert.equal(snapshot.manimTransformPointAlignmentVmobjectAlignedCurveCount, 0);
  assert.equal(snapshot.manimTransformPointAlignmentVmobjectSourceInsertNCurvesCount, 0);
  assert.equal(snapshot.manimTransformPointAlignmentVmobjectTargetInsertNCurvesCount, 0);
  assert.equal(snapshot.manimTransformPointAlignmentVmobjectSourceContract, "none");
  assert.deepEqual(
    snapshot.manimTransformPointAlignmentRows.map(
      (row) =>
        `${row.sourceId}->${row.targetId}:${row.sourceKind}->${row.targetKind}:${row.sourcePointCount}->${row.targetPointCount}=${row.alignedPointCount}`
    ),
    ["moving-probe->moving-probe:point->point:1->1=1", "probe-trace->probe-trace:polyline->polyline:0->0=0"]
  );
  assert.equal(
    snapshot.manimTransformPointAlignmentRowSummary,
    "moving-probe->moving-probe:point->point:1->1=1;probe-trace->probe-trace:polyline->polyline:0->0=0"
  );
  assert.equal(snapshot.manimTransformPointAlignmentSourceRootId, "moving-probe");
  assert.equal(snapshot.manimTransformPointAlignmentTargetRootId, "moving-probe");
  assert.equal(snapshot.manimTransformPointAlignmentSourceContract, TRANSFORM_POINT_ALIGNMENT_BRIDGE_SOURCE_CONTRACT);
  assert.equal(
    snapshot.manimTransformPointAlignmentSummary,
    "transform-point-align:source=moving-probe:target=moving-probe:matched=2:compatible=2:resampled=0:points=1"
  );
  assert.equal(snapshot.manimTransformDataLockPlanCount, 5);
  assert.equal(snapshot.manimTransformDataLockTotalPointCount, 74);
  assert.equal(snapshot.manimTransformDataLockLockedPointCount, 0);
  assert.equal(snapshot.manimTransformDataLockMovingPointCount, 74);
  assert.equal(snapshot.manimTransformDataLockObjectIds, "function-curve,moving-probe,probe-trace");
  assert.equal(snapshot.manimTransformDataLockTargetObjectIds, "function-curve:target,moving-probe:target,probe-trace:target");
  assert.equal(
    snapshot.manimTransformDataLockAlignmentSummary,
    "runtime-polyline-align:source=0:target=0:aligned=0:strategy=arc-length,runtime-polyline-align:source=72:target=72:aligned=72:strategy=arc-length"
  );
  assert.equal(snapshot.manimTransformDataLockKindSummary, "curve=3;point=2");
  assert.match(snapshot.manimTransformDataLockSourceContract, /lock_matching_data/);
  assert.equal(
    snapshot.manimTransformDataLockSummary,
    "transform-data-lock:plans=5:total=74:locked=0:moving=74:objects=function-curve,moving-probe,probe-trace:kinds=curve=3;point=2"
  );
  assert.equal(snapshot.updaterActiveCount, 0);
  assert.equal(snapshot.updaterSuspendedCount, 4);
  assert.equal(attributes["data-viz-manim-active-animation-plan-id"], "function-probe-attention-pulse");
  assert.equal(attributes["data-viz-manim-active-animation-plan-ids"], "function-curve-attention-lift,function-probe-attention-pulse");
  assert.equal(attributes["data-viz-manim-active-animation-object-id"], "moving-probe");
  assert.equal(attributes["data-viz-manim-active-animation-target-id"], "moving-probe:attention-target");
  assert.equal(attributes["data-viz-manim-active-animation-node-count"], "5");
  assert.equal(attributes["data-viz-manim-active-animation-node-progress-summary"], snapshot.manimActiveAnimationNodeProgressSummary);
  assert.equal(attributes["data-viz-manim-transform-interpolate-bounding-box-count"], "5");
  assert.equal(attributes["data-viz-manim-transform-interpolate-bounding-box-finite-count"], "3");
  assert.equal(attributes["data-viz-manim-transform-interpolate-bounding-box-empty-count"], "2");
  assert.equal(
    attributes["data-viz-manim-transform-interpolate-bounding-box-object-ids"],
    "function-curve,moving-probe,probe-trace"
  );
  assert.equal(
    attributes["data-viz-manim-transform-interpolate-bounding-box-summary"],
    "transform-interpolate-bounds:nodes=5:finite=3:empty=2:ids=function-curve,moving-probe,probe-trace"
  );
  assert.equal(attributes["data-viz-manim-transform-interpolate-uniform-count"], "5");
  assert.equal(attributes["data-viz-manim-transform-interpolate-uniform-opacity-sample-count"], "5");
  assert.equal(attributes["data-viz-manim-transform-interpolate-uniform-clipping-plane-count"], "0");
  assert.equal(
    attributes["data-viz-manim-transform-interpolate-uniform-object-ids"],
    "function-curve,moving-probe,probe-trace"
  );
  assert.equal(attributes["data-viz-manim-transform-interpolate-uniform-opacity-range"], "1.000..1.000");
  assert.equal(
    attributes["data-viz-manim-transform-interpolate-uniform-summary"],
    "transform-interpolate-uniforms:nodes=5:uniforms=5:opacitySamples=5:clipPlanes=0:opacityRange=1.000..1.000:ids=function-curve,moving-probe,probe-trace"
  );
  assert.match(attributes["data-viz-manim-transform-interpolate-uniform-source-summary"], /Mobject\.interpolate/);
  assert.equal(attributes["data-viz-manim-transform-interpolate-field-node-count"], "5");
  assert.equal(attributes["data-viz-manim-transform-interpolate-field-pointlike-count"], "74");
  assert.equal(attributes["data-viz-manim-transform-interpolate-field-non-point-count"], "13");
  assert.equal(attributes["data-viz-manim-transform-interpolate-field-style-node-count"], "3");
  assert.equal(attributes["data-viz-manim-transform-interpolate-field-uniform-node-count"], "5");
  assert.equal(attributes["data-viz-manim-transform-interpolate-field-bounding-box-node-count"], "5");
  assert.equal(attributes["data-viz-manim-transform-interpolate-field-arc-path-node-count"], "0");
  assert.equal(attributes["data-viz-manim-transform-interpolate-field-straight-path-node-count"], "5");
  assert.equal(attributes["data-viz-manim-transform-interpolate-field-object-ids"], "function-curve,moving-probe,probe-trace");
  assert.equal(attributes["data-viz-manim-transform-interpolate-field-path-summary"], "straight:5");
  assert.equal(attributes["data-viz-manim-transform-interpolate-field-pointlike-summary"], "point=2/2;polyline=3/72");
  assert.equal(attributes["data-viz-manim-transform-interpolate-field-pointlike-policy"], TRANSFORM_PATH_POINTLIKE_FIELD_POLICY);
  assert.equal(attributes["data-viz-manim-transform-interpolate-field-non-point-policy"], TRANSFORM_PATH_NON_POINT_FIELD_POLICY);
  assert.equal(
    attributes["data-viz-manim-transform-interpolate-field-summary"],
    "transform-interpolate-fields:nodes=5:pointlike=74:nonPoint=13:style=3:uniforms=5:bounds=5:paths=straight:5:kinds=point=2/2;polyline=3/72"
  );
  assert.match(attributes["data-viz-manim-transform-interpolate-field-source-summary"], /Mobject\.interpolate/);
  assert.equal(attributes["data-viz-manim-transform-family-alignment-entry-count"], "2");
  assert.equal(attributes["data-viz-manim-transform-family-alignment-matched-count"], "2");
  assert.equal(attributes["data-viz-manim-transform-family-alignment-entering-count"], "0");
  assert.equal(attributes["data-viz-manim-transform-family-alignment-exiting-count"], "0");
  assert.equal(attributes["data-viz-manim-transform-family-alignment-type-mismatch-count"], "0");
  assert.equal(attributes["data-viz-manim-transform-family-alignment-max-depth"], "1");
  assert.equal(
    attributes["data-viz-manim-transform-family-alignment-family-pair-sequence"],
    "moving-probe->moving-probe|probe-trace->probe-trace"
  );
  assert.equal(attributes["data-viz-manim-transform-family-alignment-family-zip-complete-count"], "2");
  assert.equal(attributes["data-viz-manim-transform-family-alignment-family-zip-incomplete-count"], "0");
  assert.equal(
    attributes["data-viz-manim-transform-family-alignment-family-zip-policy"],
    TRANSFORM_FAMILY_ALIGNMENT_ZIP_POLICY
  );
  assert.equal(
    attributes["data-viz-manim-transform-family-alignment-family-zip-sequence"],
    "moving-probe|moving-probe|moving-probe;probe-trace|probe-trace|probe-trace"
  );
  assert.equal(attributes["data-viz-manim-transform-family-alignment-family-zip-tuple-count"], "2");
  assert.equal(snapshot.manimTransformFamilyAlignmentPointCountPolicy, TRANSFORM_FAMILY_ALIGNMENT_POINT_COUNT_POLICY);
  assert.equal(
    attributes["data-viz-manim-transform-family-alignment-point-count-policy"],
    TRANSFORM_FAMILY_ALIGNMENT_POINT_COUNT_POLICY
  );
  assert.equal(attributes["data-viz-manim-transform-family-alignment-source-root-id"], "moving-probe");
  assert.equal(attributes["data-viz-manim-transform-family-alignment-target-root-id"], "moving-probe");
  assert.equal(snapshot.manimTransformFamilyAlignmentSourceContract, TRANSFORM_FAMILY_ALIGNMENT_SOURCE_CONTRACT);
  assert.equal(
    attributes["data-viz-manim-transform-family-alignment-source-contract"],
    TRANSFORM_FAMILY_ALIGNMENT_SOURCE_CONTRACT
  );
  assert.equal(attributes["data-viz-manim-transform-family-alignment-summary"], snapshot.manimTransformFamilyAlignmentSummary);
  assert.equal(attributes["data-viz-manim-transform-point-alignment-matched-count"], "2");
  assert.equal(attributes["data-viz-manim-transform-point-alignment-compatible-count"], "2");
  assert.equal(attributes["data-viz-manim-transform-point-alignment-resampled-count"], "0");
  assert.equal(attributes["data-viz-manim-transform-point-alignment-total-point-count"], "1");
  assert.equal(attributes["data-viz-manim-transform-point-alignment-policy-summary"], "direct-point-array=1;none=1");
  assert.equal(attributes["data-viz-manim-transform-point-alignment-vmobject-aligned-curve-count"], "0");
  assert.equal(attributes["data-viz-manim-transform-point-alignment-vmobject-source-insert-n-curves-count"], "0");
  assert.equal(attributes["data-viz-manim-transform-point-alignment-vmobject-target-insert-n-curves-count"], "0");
  assert.equal(attributes["data-viz-manim-transform-point-alignment-vmobject-source-contract"], "none");
  assert.equal(
    attributes["data-viz-manim-transform-point-alignment-row-summary"],
    snapshot.manimTransformPointAlignmentRowSummary
  );
  assert.equal(attributes["data-viz-manim-transform-point-alignment-source-root-id"], "moving-probe");
  assert.equal(attributes["data-viz-manim-transform-point-alignment-target-root-id"], "moving-probe");
  assert.equal(
    attributes["data-viz-manim-transform-point-alignment-source-contract"],
    TRANSFORM_POINT_ALIGNMENT_BRIDGE_SOURCE_CONTRACT
  );
  assert.equal(attributes["data-viz-manim-transform-point-alignment-summary"], snapshot.manimTransformPointAlignmentSummary);
  assert.equal(attributes["data-viz-manim-transform-data-lock-plan-count"], "5");
  assert.equal(attributes["data-viz-manim-transform-data-lock-total-point-count"], "74");
  assert.equal(attributes["data-viz-manim-transform-data-lock-locked-point-count"], "0");
  assert.equal(attributes["data-viz-manim-transform-data-lock-moving-point-count"], "74");
  assert.equal(attributes["data-viz-manim-transform-data-lock-object-ids"], "function-curve,moving-probe,probe-trace");
  assert.equal(attributes["data-viz-manim-transform-data-lock-target-object-ids"], "function-curve:target,moving-probe:target,probe-trace:target");
  assert.equal(
    attributes["data-viz-manim-transform-data-lock-alignment-summary"],
    snapshot.manimTransformDataLockAlignmentSummary
  );
  assert.equal(attributes["data-viz-manim-transform-data-lock-kind-summary"], "curve=3;point=2");
  assert.equal(snapshot.manimTransformDataLockSourceContract, TRANSFORM_DATA_LOCK_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-transform-data-lock-source-contract"], TRANSFORM_DATA_LOCK_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-transform-data-lock-summary"], snapshot.manimTransformDataLockSummary);
  assert.equal(attributes["data-viz-updater-active-count"], "0");
  assert.equal(attributes["data-viz-updater-suspended-count"], "4");
  assert.equal(snapshot.updaterSuspensionSourceContract, UPDATER_SUSPENSION_SOURCE_CONTRACT);
  assert.equal(snapshot.updaterSuspensionPolicy, UPDATER_SUSPENSION_POLICY);
  assert.equal(attributes["data-viz-updater-suspension-source-contract"], UPDATER_SUSPENSION_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-updater-suspension-policy"], UPDATER_SUSPENSION_POLICY);
});

test("records Manim interpolate_mobject sub-alpha schedule evidence for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, elapsedAtMidpointOfComposition("function-attention-lagged-start"));
  const animationFrame = buildMathAnimationRuntimeFrame(runtimeState, buildMathSceneAnimatePlans(functionGraphSpec, runtimeState));
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const expectedSchedule = buildSubAlphaSchedule({
    frame: animationFrame,
    familyAlignment: {
      entries: snapshot.manimTransformFamilyAlignmentEntries,
      sourceRootId: snapshot.manimTransformFamilyAlignmentSourceRootId,
      targetRootId: snapshot.manimTransformFamilyAlignmentTargetRootId
    },
    sceneId: functionGraphSpec.sceneId
  });
  const expectedRuntimeEvidence = buildMathAnimationRuntimeEvidence(animationFrame);
  const expectedAttributes = subAlphaScheduleDataAttributes(expectedSchedule);
  const expectedRuntimeAttributes = animationRuntimeEvidenceDataAttributes(expectedRuntimeEvidence);
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimSubAlphaActivePlanCount, 2);
  assert.equal(snapshot.manimSubAlphaNodeCount, 5);
  assert.equal(snapshot.manimSubAlphaStaggeredNodeCount, 3);
  assert.equal(snapshot.manimSubAlphaLeadingNodeCount, 2);
  assert.equal(snapshot.manimSubAlphaDelayedNodeCount, 1);
  assert.equal(snapshot.manimSubAlphaZeroNodeCount, 0);
  assert.equal(snapshot.manimSubAlphaPartialNodeCount, 5);
  assert.equal(snapshot.manimSubAlphaCompleteNodeCount, 0);
  assert.equal(snapshot.manimSubAlphaObjectIds, "function-curve,moving-probe,probe-trace");
  assert.equal(snapshot.manimSubAlphaRateFunctionIds, "smooth");
  assert.equal(snapshot.manimSubAlphaRawMin, expectedSchedule.rawMin);
  assert.equal(snapshot.manimSubAlphaRawMax, expectedSchedule.rawMax);
  assert.equal(snapshot.manimSubAlphaRawRange, expectedSchedule.rawRange);
  assert.equal(snapshot.manimSubAlphaSourceContract, SUB_ALPHA_SOURCE_CONTRACT);
  assert.equal(snapshot.manimSubAlphaLaggedMin, expectedSchedule.laggedMin);
  assert.equal(snapshot.manimSubAlphaLaggedMax, expectedSchedule.laggedMax);
  assert.equal(snapshot.manimSubAlphaLaggedRange, expectedSchedule.laggedRange);
  assert.equal(snapshot.manimSubAlphaEasedMin, expectedSchedule.easedMin);
  assert.equal(snapshot.manimSubAlphaEasedMax, expectedSchedule.easedMax);
  assert.equal(snapshot.manimSubAlphaEasedRange, expectedSchedule.easedRange);
  assert.equal(snapshot.manimSubAlphaNodeWindowSummary, expectedSchedule.nodeWindowSummary);
  assert.equal(snapshot.manimSubAlphaFamilyZipCoveredNodeCount, expectedSchedule.familyZipCoveredNodeCount);
  assert.equal(snapshot.manimSubAlphaFamilyZipMissingNodeCount, expectedSchedule.familyZipMissingNodeCount);
  assert.equal(snapshot.manimSubAlphaFamilyZipPolicy, TRANSFORM_FAMILY_ALIGNMENT_ZIP_POLICY);
  assert.equal(snapshot.manimSubAlphaFamilyZipSequence, expectedSchedule.familyZipSequence);
  assert.equal(snapshot.manimSubAlphaFamilyZipTupleCount, expectedSchedule.familyZipTupleCount);
  assert.equal(snapshot.manimSubAlphaFamilyZipUncoveredObjectIds, expectedSchedule.familyZipUncoveredObjectIds);
  assert.equal(snapshot.manimSubAlphaWindowPolicy, SUB_ALPHA_WINDOW_POLICY);
  assert.equal(snapshot.manimSubAlphaSummary, expectedSchedule.summary);
  assert.equal(snapshot.manimAnimationRuntimeActive, expectedRuntimeEvidence.active);
  assert.equal(snapshot.manimAnimationRuntimeActivePlanCount, expectedRuntimeEvidence.activePlanCount);
  assert.equal(snapshot.manimAnimationRuntimeActivePlanIds, expectedRuntimeEvidence.activePlanIds);
  assert.equal(snapshot.manimAnimationRuntimeNodeCount, expectedRuntimeEvidence.nodeCount);
  assert.equal(snapshot.manimAnimationRuntimeFiniteBoundingBoxCount, expectedRuntimeEvidence.finiteBoundingBoxCount);
  assert.equal(snapshot.manimAnimationRuntimeObjectIds, expectedRuntimeEvidence.objectIds);
  assert.equal(snapshot.manimAnimationRuntimeObjectId, expectedRuntimeEvidence.objectId);
  assert.equal(snapshot.manimAnimationRuntimeTargetObjectId, expectedRuntimeEvidence.targetObjectId);
  assert.equal(snapshot.manimAnimationRuntimeProgress, expectedRuntimeEvidence.progress);
  assert.equal(snapshot.manimAnimationRuntimeRawProgressRange, expectedRuntimeEvidence.rawProgressRange);
  assert.equal(snapshot.manimAnimationRuntimeLaggedProgressRange, expectedRuntimeEvidence.laggedProgressRange);
  assert.equal(snapshot.manimAnimationRuntimeEasedProgressRange, expectedRuntimeEvidence.easedProgressRange);
  assert.equal(snapshot.manimAnimationRuntimeRateFunctionIds, expectedRuntimeEvidence.rateFunctionIds);
  assert.equal(snapshot.manimAnimationRuntimeRenderKindSummary, expectedRuntimeEvidence.renderKindSummary);
  assert.equal(snapshot.manimAnimationRuntimeSourceContract, expectedRuntimeEvidence.sourceContract);
  assert.equal(snapshot.manimAnimationRuntimeMobjectInterpolatePolicy, MOBJECT_INTERPOLATE_RENDER_POLICY);
  assert.equal(snapshot.manimAnimationRuntimeSummary, expectedRuntimeEvidence.summary);
  assert.equal(attributes["data-viz-manim-sub-alpha-active-plan-count"], expectedAttributes["data-viz-manim-sub-alpha-active-plan-count"]);
  assert.equal(attributes["data-viz-manim-sub-alpha-node-count"], expectedAttributes["data-viz-manim-sub-alpha-node-count"]);
  assert.equal(
    attributes["data-viz-manim-sub-alpha-staggered-node-count"],
    expectedAttributes["data-viz-manim-sub-alpha-staggered-node-count"]
  );
  assert.equal(
    attributes["data-viz-manim-sub-alpha-leading-node-count"],
    expectedAttributes["data-viz-manim-sub-alpha-leading-node-count"]
  );
  assert.equal(
    attributes["data-viz-manim-sub-alpha-delayed-node-count"],
    expectedAttributes["data-viz-manim-sub-alpha-delayed-node-count"]
  );
  assert.equal(attributes["data-viz-manim-sub-alpha-raw-min"], expectedAttributes["data-viz-manim-sub-alpha-raw-min"]);
  assert.equal(attributes["data-viz-manim-sub-alpha-raw-max"], expectedAttributes["data-viz-manim-sub-alpha-raw-max"]);
  assert.equal(attributes["data-viz-manim-sub-alpha-raw-range"], expectedAttributes["data-viz-manim-sub-alpha-raw-range"]);
  assert.equal(attributes["data-viz-manim-sub-alpha-lagged-min"], expectedAttributes["data-viz-manim-sub-alpha-lagged-min"]);
  assert.equal(attributes["data-viz-manim-sub-alpha-lagged-max"], expectedAttributes["data-viz-manim-sub-alpha-lagged-max"]);
  assert.equal(attributes["data-viz-manim-sub-alpha-lagged-range"], expectedAttributes["data-viz-manim-sub-alpha-lagged-range"]);
  assert.equal(attributes["data-viz-manim-sub-alpha-eased-min"], expectedAttributes["data-viz-manim-sub-alpha-eased-min"]);
  assert.equal(attributes["data-viz-manim-sub-alpha-eased-max"], expectedAttributes["data-viz-manim-sub-alpha-eased-max"]);
  assert.equal(attributes["data-viz-manim-sub-alpha-eased-range"], expectedAttributes["data-viz-manim-sub-alpha-eased-range"]);
  assert.equal(
    attributes["data-viz-manim-sub-alpha-node-window-summary"],
    expectedAttributes["data-viz-manim-sub-alpha-node-window-summary"]
  );
  assert.equal(
    attributes["data-viz-manim-sub-alpha-family-zip-covered-node-count"],
    expectedAttributes["data-viz-manim-sub-alpha-family-zip-covered-node-count"]
  );
  assert.equal(
    attributes["data-viz-manim-sub-alpha-family-zip-missing-node-count"],
    expectedAttributes["data-viz-manim-sub-alpha-family-zip-missing-node-count"]
  );
  assert.equal(
    attributes["data-viz-manim-sub-alpha-family-zip-policy"],
    expectedAttributes["data-viz-manim-sub-alpha-family-zip-policy"]
  );
  assert.equal(
    attributes["data-viz-manim-sub-alpha-family-zip-sequence"],
    expectedAttributes["data-viz-manim-sub-alpha-family-zip-sequence"]
  );
  assert.equal(
    attributes["data-viz-manim-sub-alpha-family-zip-tuple-count"],
    expectedAttributes["data-viz-manim-sub-alpha-family-zip-tuple-count"]
  );
  assert.equal(
    attributes["data-viz-manim-sub-alpha-family-zip-uncovered-object-ids"],
    expectedAttributes["data-viz-manim-sub-alpha-family-zip-uncovered-object-ids"]
  );
  assert.equal(
    attributes["data-viz-manim-sub-alpha-source-contract"],
    expectedAttributes["data-viz-manim-sub-alpha-source-contract"]
  );
  assert.equal(
    attributes["data-viz-manim-sub-alpha-window-policy"],
    expectedAttributes["data-viz-manim-sub-alpha-window-policy"]
  );
  assert.equal(attributes["data-viz-manim-sub-alpha-summary"], expectedAttributes["data-viz-manim-sub-alpha-summary"]);
  assert.equal(
    attributes["data-viz-manim-animation-runtime-source-contract"],
    expectedRuntimeAttributes["data-viz-manim-animation-runtime-source-contract"]
  );
  assert.equal(
    attributes["data-viz-manim-animation-runtime-mobject-interpolate-policy"],
    MOBJECT_INTERPOLATE_RENDER_POLICY
  );
  assert.equal(
    attributes["data-viz-manim-animation-runtime-active"],
    expectedRuntimeAttributes["data-viz-manim-animation-runtime-active"]
  );
  assert.equal(
    attributes["data-viz-manim-animation-runtime-active-plan-count"],
    expectedRuntimeAttributes["data-viz-manim-animation-runtime-active-plan-count"]
  );
  assert.equal(
    attributes["data-viz-manim-animation-runtime-active-plan-ids"],
    expectedRuntimeAttributes["data-viz-manim-animation-runtime-active-plan-ids"]
  );
  assert.equal(
    attributes["data-viz-manim-animation-runtime-node-count"],
    expectedRuntimeAttributes["data-viz-manim-animation-runtime-node-count"]
  );
  assert.equal(
    attributes["data-viz-manim-animation-runtime-object-id"],
    expectedRuntimeAttributes["data-viz-manim-animation-runtime-object-id"]
  );
  assert.equal(
    attributes["data-viz-manim-animation-runtime-object-ids"],
    expectedRuntimeAttributes["data-viz-manim-animation-runtime-object-ids"]
  );
  assert.equal(
    attributes["data-viz-manim-animation-runtime-target-object-id"],
    expectedRuntimeAttributes["data-viz-manim-animation-runtime-target-object-id"]
  );
  assert.equal(
    attributes["data-viz-manim-animation-runtime-progress"],
    expectedRuntimeAttributes["data-viz-manim-animation-runtime-progress"]
  );
  assert.equal(
    attributes["data-viz-manim-animation-runtime-raw-progress-range"],
    expectedRuntimeAttributes["data-viz-manim-animation-runtime-raw-progress-range"]
  );
  assert.equal(
    attributes["data-viz-manim-animation-runtime-lagged-progress-range"],
    expectedRuntimeAttributes["data-viz-manim-animation-runtime-lagged-progress-range"]
  );
  assert.equal(
    attributes["data-viz-manim-animation-runtime-eased-progress-range"],
    expectedRuntimeAttributes["data-viz-manim-animation-runtime-eased-progress-range"]
  );
  assert.equal(
    attributes["data-viz-manim-animation-runtime-rate-functions"],
    expectedRuntimeAttributes["data-viz-manim-animation-runtime-rate-functions"]
  );
  assert.equal(
    attributes["data-viz-manim-animation-runtime-render-kind-summary"],
    expectedRuntimeAttributes["data-viz-manim-animation-runtime-render-kind-summary"]
  );
  assert.equal(
    attributes["data-viz-manim-animation-runtime-finite-bounding-box-count"],
    expectedRuntimeAttributes["data-viz-manim-animation-runtime-finite-bounding-box-count"]
  );
  assert.equal(
    attributes["data-viz-manim-animation-runtime-summary"],
    expectedRuntimeAttributes["data-viz-manim-animation-runtime-summary"]
  );
});

test("classifies previous-frame invalidation as animation-owned during Scene.play beats", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, elapsedAtMidpointOfComposition("function-attention-lagged-start"));
  const previousRuntimeState = cloneRuntimeState(runtimeState);
  previousRuntimeState.objectGraph.byId["moving-probe"].renderState = {
    kind: "point",
    position: [9, 9, 9]
  };

  const snapshot = buildMathSceneEvidenceSnapshot({
    previousRuntimeState,
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.activeStep, "animationComposition");
  assert.equal(snapshot.mobjectInvalidatedIds, "moving-probe");
  assert.equal(snapshot.mobjectAnimationOwnedInvalidationCount, 1);
  assert.equal(snapshot.mobjectUpdaterActiveInvalidationCount, 0);
  assert.equal(snapshot.mobjectUnknownInvalidationCount, 0);
  assert.equal(snapshot.mobjectUniformsChangedCount, 0);
  assert.equal(snapshot.mobjectInvalidationOwnershipSummary, "moving-probe:animation-owned");
  assert.equal(snapshot.mobjectFamilyCacheStatus, "cache-hit");
  assert.equal(snapshot.mobjectFamilyCacheReusable, true);
  assert.equal(snapshot.mobjectFamilyCacheSummary, "status=cache-hit;reusable=true;familyDirty=0;dataDirty=1;reused=4;recomputed=0");
  assert.equal(attributes["data-viz-mobject-animation-owned-invalidation-count"], "1");
  assert.equal(attributes["data-viz-mobject-updater-active-invalidation-count"], "0");
  assert.equal(attributes["data-viz-mobject-unknown-invalidation-count"], "0");
  assert.equal(attributes["data-viz-mobject-invalidation-ownership-summary"], "moving-probe:animation-owned");
});

test("records Manim Mobject dirty-state payload source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, elapsedAtMidpointOfComposition("function-attention-lagged-start"));
  const previousRuntimeState = cloneRuntimeState(runtimeState);
  previousRuntimeState.objectGraph.byId["moving-probe"].renderState = {
    kind: "point",
    position: [9, 9, 9]
  };

  const snapshot = buildMathSceneEvidenceSnapshot({
    previousRuntimeState,
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.mobjectDirtyStateCacheStatus, "cache-hit");
  assert.equal(snapshot.mobjectDirtyStateFamilyCacheReusable, true);
  assert.equal(snapshot.mobjectDirtyStateTotalObjectCount, 4);
  assert.equal(snapshot.mobjectDirtyStateInvalidatedCount, 1);
  assert.equal(snapshot.mobjectDirtyStateUnchangedCount, 3);
  assert.equal(snapshot.mobjectDirtyStateDataChangedCount, 1);
  assert.equal(snapshot.mobjectDirtyStateBoundingBoxStaleCount, 1);
  assert.equal(snapshot.mobjectDirtyStateFamilyChangedCount, 0);
  assert.equal(snapshot.mobjectDirtyStateSourceContract, MOBJECT_INVALIDATION_SOURCE_CONTRACT);
  assert.equal(snapshot.mobjectDirtyStateMetadataChangedCount, 0);
  assert.equal(snapshot.mobjectDirtyStateUniformsChangedCount, 0);
  assert.equal(snapshot.mobjectDirtyStateAnimationOwnedCount, 1);
  assert.equal(snapshot.mobjectDirtyStateUpdaterActiveCount, 0);
  assert.equal(snapshot.mobjectDirtyStateUnknownCount, 0);
  assert.equal(snapshot.mobjectDirtyStateReusedFamilyCount, 4);
  assert.equal(snapshot.mobjectDirtyStateRecomputedFamilyCount, 0);
  assert.equal(snapshot.mobjectDirtyStateInvalidatedIds, "moving-probe");
  assert.match(snapshot.mobjectDirtyStateSignature, /^mobject-dirty-[0-9a-f]{8}$/);
  assert.equal(
    snapshot.mobjectDirtyStateSummary,
    "mobject-dirty:status=cache-hit:invalidated=1:data=1:bbox=1:family=0:metadata=0:uniforms=0:animation=1:updater=0:unknown=0:reused=4:recomputed=0"
  );
  assert.equal(snapshot.mobjectDirtyStateRows.length, 4);
  assert.deepEqual(snapshot.mobjectDirtyStateReusedFamilyIds, ["axes", "function-curve", "moving-probe", "probe-trace"]);
  assert.deepEqual(snapshot.mobjectDirtyStateRecomputedFamilyIds, []);
  const dirtyProbeRow = snapshot.mobjectDirtyStateRows.find((row) => row.objectId === "moving-probe");
  assert.ok(dirtyProbeRow);
  assert.equal(dirtyProbeRow.invalidated, true);
  assert.equal(dirtyProbeRow.dataHasChanged, true);
  assert.equal(dirtyProbeRow.needsNewBoundingBox, true);
  assert.equal(dirtyProbeRow.ownership, "animation-owned");
  assert.deepEqual(dirtyProbeRow.reasons, ["render-state-changed", "bounding-box-changed"]);
  assert.equal(attributes["data-viz-mobject-dirty-animation-owned-count"], "1");
  assert.equal(attributes["data-viz-mobject-dirty-bounding-box-stale-count"], "1");
  assert.equal(attributes["data-viz-mobject-dirty-cache-status"], "cache-hit");
  assert.equal(attributes["data-viz-mobject-dirty-data-changed-count"], "1");
  assert.equal(attributes["data-viz-mobject-dirty-family-cache-reusable"], "true");
  assert.equal(attributes["data-viz-mobject-dirty-family-changed-count"], "0");
  assert.equal(attributes["data-viz-mobject-dirty-invalidated-count"], "1");
  assert.equal(attributes["data-viz-mobject-dirty-invalidated-ids"], "moving-probe");
  assert.equal(attributes["data-viz-mobject-dirty-metadata-changed-count"], "0");
  assert.equal(attributes["data-viz-mobject-dirty-recomputed-family-count"], "0");
  assert.equal(attributes["data-viz-mobject-dirty-reused-family-count"], "4");
  assert.equal(attributes["data-viz-mobject-dirty-signature"], snapshot.mobjectDirtyStateSignature);
  assert.equal(attributes["data-viz-mobject-dirty-source-contract"], MOBJECT_INVALIDATION_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-mobject-dirty-summary"], snapshot.mobjectDirtyStateSummary);
  assert.equal(attributes["data-viz-mobject-dirty-unknown-count"], "0");
  assert.equal(attributes["data-viz-mobject-dirty-uniforms-changed-count"], "0");
  assert.equal(attributes["data-viz-mobject-dirty-updater-active-count"], "0");
});

test("records Manim Mobject.copy family-plan evidence through the unified browser QA harness", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 3);
  const expectedPlan = buildMobjectCopyPlan(runtimeState.objectGraph);
  const expectedAttributes = mobjectCopyPlanDataAttributes(expectedPlan);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.mobjectCopySourceId, "axes");
  assert.equal(snapshot.mobjectCopyRootId, "axes:copy");
  assert.equal(snapshot.mobjectCopyFamilyCount, expectedPlan.copiedFamilyCount);
  assert.equal(snapshot.mobjectCopyCloneIsolationPreserved, expectedPlan.cloneIsolationPreserved);
  assert.equal(snapshot.mobjectCopyCloneIsolationSummary, expectedPlan.cloneIsolationSummary);
  assert.equal(snapshot.mobjectCopySharedReferenceCount, expectedPlan.sharedReferenceCount);
  assert.equal(snapshot.mobjectCopyRenderDataCount, expectedPlan.renderDataNodeCount);
  assert.equal(snapshot.mobjectCopyChildLinkCount, expectedPlan.childLinkCount);
  assert.equal(snapshot.mobjectCopyParentLinkCount, expectedPlan.parentLinkCount);
  assert.equal(snapshot.mobjectCopyPointCount, expectedPlan.pointCount);
  assert.equal(snapshot.mobjectCopySummary, summarizeMobjectCopyPlan(expectedPlan));
  assert.equal(snapshot.mobjectCopySignature, expectedPlan.signature);
  assert.equal(attributes["data-viz-mobject-copy-source-contract"], expectedAttributes["data-viz-mobject-copy-source-contract"]);
  assert.equal(attributes["data-viz-mobject-copy-source-id"], expectedAttributes["data-viz-mobject-copy-source-id"]);
  assert.equal(attributes["data-viz-mobject-copy-root-id"], expectedAttributes["data-viz-mobject-copy-root-id"]);
  assert.equal(attributes["data-viz-mobject-copy-family-count"], expectedAttributes["data-viz-mobject-copy-family-count"]);
  assert.equal(attributes["data-viz-mobject-copy-clone-isolated"], expectedAttributes["data-viz-mobject-copy-clone-isolated"]);
  assert.equal(
    attributes["data-viz-mobject-copy-clone-isolation-summary"],
    expectedAttributes["data-viz-mobject-copy-clone-isolation-summary"]
  );
  assert.equal(attributes["data-viz-mobject-copy-shared-reference-count"], expectedAttributes["data-viz-mobject-copy-shared-reference-count"]);
  assert.equal(attributes["data-viz-mobject-copy-id-map-summary"], "axes=>axes:copy");
  assert.equal(attributes["data-viz-mobject-copy-render-data-count"], expectedAttributes["data-viz-mobject-copy-render-data-count"]);
  assert.equal(attributes["data-viz-mobject-copy-child-link-count"], expectedAttributes["data-viz-mobject-copy-child-link-count"]);
  assert.equal(attributes["data-viz-mobject-copy-parent-link-count"], String(expectedPlan.parentLinkCount));
  assert.equal(attributes["data-viz-mobject-copy-point-count"], String(expectedPlan.pointCount));
  assert.equal(attributes["data-viz-mobject-copy-summary"], summarizeMobjectCopyPlan(expectedPlan));
  assert.equal(attributes["data-viz-mobject-copy-signature"], expectedPlan.signature);
});

test("records Manim Mobject.arrange layout evidence through the unified browser QA harness", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const expectedPlan = buildMobjectArrangeLayoutPlan(runtimeState.objectGraph, runtimeState.sceneGraph.topLevelIds, {
    buff: 0.25,
    center: true,
    direction: [1, 0, 0]
  });
  const expectedAttributes = mobjectLayoutDataAttributes(expectedPlan);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.mobjectLayoutKind, "arrange");
  assert.equal(snapshot.mobjectLayoutObjectCount, expectedPlan.objectCount);
  assert.equal(snapshot.mobjectLayoutMissingCount, 0);
  assert.equal(snapshot.mobjectLayoutObjectIds, expectedPlan.objectIds.join(","));
  assert.equal(snapshot.mobjectLayoutDirection, "1.000,0.000,0.000");
  assert.equal(snapshot.mobjectLayoutFrameAnchor, "none");
  assert.equal(snapshot.mobjectLayoutFrameBounds, "0.000,0.000,0.000..0.000,0.000,0.000");
  assert.equal(snapshot.mobjectLayoutFrameTarget, "0.000,0.000,0.000");
  assert.equal(snapshot.mobjectLayoutBuff, 0.25);
  assert.match(snapshot.mobjectLayoutSignature, /^mobject-layout-[0-9a-f]{8}$/);
  assert.equal(snapshot.mobjectLayoutSourceContract, MOBJECT_LAYOUT_SOURCE_CONTRACT);
  assert.equal(snapshot.mobjectLayoutSummary, summarizeMobjectLayoutPlan(expectedPlan));
  assert.equal(snapshot.mobjectLayoutTargetCenters, expectedAttributes["data-viz-mobject-layout-target-centers"]);
  assert.equal(attributes["data-viz-mobject-layout-kind"], expectedAttributes["data-viz-mobject-layout-kind"]);
  assert.equal(attributes["data-viz-mobject-layout-object-count"], expectedAttributes["data-viz-mobject-layout-object-count"]);
  assert.equal(attributes["data-viz-mobject-layout-object-ids"], expectedAttributes["data-viz-mobject-layout-object-ids"]);
  assert.equal(attributes["data-viz-mobject-layout-missing-count"], "0");
  assert.equal(attributes["data-viz-mobject-layout-direction"], "1.000,0.000,0.000");
  assert.equal(attributes["data-viz-mobject-layout-frame-anchor"], "none");
  assert.equal(attributes["data-viz-mobject-layout-frame-bounds"], "0.000,0.000,0.000..0.000,0.000,0.000");
  assert.equal(attributes["data-viz-mobject-layout-frame-target"], "0.000,0.000,0.000");
  assert.equal(attributes["data-viz-mobject-layout-buff"], "0.250");
  assert.equal(attributes["data-viz-mobject-layout-signature"], snapshot.mobjectLayoutSignature);
  assert.equal(attributes["data-viz-mobject-layout-source-contract"], MOBJECT_LAYOUT_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-mobject-layout-summary"], snapshot.mobjectLayoutSummary);
  assert.equal(attributes["data-viz-mobject-layout-target-centers"], snapshot.mobjectLayoutTargetCenters);
});

test("records Manim Mobject render-order evidence through the unified browser QA harness", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const expectedPlan = buildMobjectRenderOrderPlan(runtimeState.sceneGraph, buildMobjectFamilyIndex(runtimeState.objectGraph));
  const expectedAttributes = mobjectRenderOrderDataAttributes(expectedPlan);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.mobjectRenderOrderTopLevelCount, expectedPlan.topLevelObjectCount);
  assert.equal(snapshot.mobjectRenderOrderRenderedCount, expectedPlan.renderedObjectCount);
  assert.equal(snapshot.mobjectRenderOrderForegroundCount, 0);
  assert.equal(snapshot.mobjectRenderOrderFixedCount, 0);
  assert.equal(snapshot.mobjectRenderOrderTopLevelIds, expectedAttributes["data-viz-mobject-render-order-top-level-ids"]);
  assert.equal(snapshot.mobjectRenderOrderSceneIds, expectedAttributes["data-viz-mobject-render-order-scene-ids"]);
  assert.equal(snapshot.mobjectRenderOrderForegroundIds, "none");
  assert.equal(snapshot.mobjectRenderOrderFixedIds, "none");
  assert.equal(snapshot.mobjectRenderOrderAllIds, expectedAttributes["data-viz-mobject-render-order-all-ids"]);
  assert.match(snapshot.mobjectRenderOrderSignature, /^mobject-render-order-[0-9a-f]{8}$/);
  assert.equal(snapshot.mobjectRenderOrderSummary, "render-order:top=2:rendered=4:foreground=0:fixed=0");
  assert.equal(attributes["data-viz-mobject-render-order-all-ids"], expectedAttributes["data-viz-mobject-render-order-all-ids"]);
  assert.equal(attributes["data-viz-mobject-render-order-fixed-count"], "0");
  assert.equal(attributes["data-viz-mobject-render-order-fixed-ids"], "none");
  assert.equal(attributes["data-viz-mobject-render-order-foreground-count"], "0");
  assert.equal(attributes["data-viz-mobject-render-order-foreground-ids"], "none");
  assert.equal(attributes["data-viz-mobject-render-order-rendered-count"], "4");
  assert.equal(attributes["data-viz-mobject-render-order-scene-ids"], expectedAttributes["data-viz-mobject-render-order-scene-ids"]);
  assert.equal(attributes["data-viz-mobject-render-order-signature"], snapshot.mobjectRenderOrderSignature);
  assert.equal(attributes["data-viz-mobject-render-order-summary"], snapshot.mobjectRenderOrderSummary);
  assert.equal(attributes["data-viz-mobject-render-order-top-level-count"], "2");
  assert.equal(attributes["data-viz-mobject-render-order-top-level-ids"], "axes,function-curve");
});

test("records Manim ValueTracker payload source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 3);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimValueTrackerCount, 10);
  assert.equal(snapshot.manimValueTrackerTimelineCount, 2);
  assert.equal(snapshot.manimValueTrackerParameterCount, 6);
  assert.equal(snapshot.manimValueTrackerObjectCount, 2);
  assert.equal(snapshot.manimValueTrackerProgressCount, 3);
  assert.equal(snapshot.manimValueTrackerControlCount, 3);
  assert.equal(snapshot.manimValueTrackerValueCount, 0);
  assert.equal(snapshot.manimValueTrackerSourceContract, VALUE_TRACKER_SOURCE_CONTRACT);
  assert.match(snapshot.manimValueTrackerHiddenMobjectIds, /^tracker:function-curve:progress,tracker:moving-probe:progress,/);
  assert.match(snapshot.manimValueTrackerUniformValueSummary, /tracker:parameter:value:value=6\.000/);
  assert.match(snapshot.manimValueTrackerNormalizedValueSummary, /tracker:timeline:progress:normalized=/);
  assert.match(snapshot.manimValueTrackerRangeSummary, /tracker:parameter:value:range=0\.000\.\.12\.000/);
  assert.equal(
    snapshot.manimValueTrackerSourceSummary,
    "value-tracker-source:hiddenMobjects=10:uniforms=value,normalizedValue:sources=object=2,parameter=6,timeline=2,value=0"
  );
  assert.equal(
    snapshot.manimValueTrackerIds,
    "function-curve:progress,moving-probe:progress,parameter:comparison,parameter:depth,parameter:mode,parameter:primary,parameter:secondary,parameter:value,timeline,timeline:progress"
  );
  assert.match(snapshot.manimValueTrackerSignature, /^value-tracker-[0-9a-f]{8}$/);
  assert.equal(
    snapshot.manimValueTrackerSummary,
    "value-trackers:total=10:timeline=2:parameter=6:object=2:progress=3:control=3"
  );
  assert.equal(snapshot.manimValueTrackerUniformPairCount, 10);
  assert.match(snapshot.manimValueTrackerUniformKeySummary, /tracker:function-curve:progress:uniforms=value,normalizedValue/);
  assert.equal(snapshot.manimValueTrackerRows.length, 10);
  const parameterValueTrackerRow = snapshot.manimValueTrackerRows.find((row) => row.id === "parameter:value");
  assert.ok(parameterValueTrackerRow);
  assert.equal(parameterValueTrackerRow.hiddenMobjectId, "tracker:parameter:value");
  assert.equal(parameterValueTrackerRow.source, "parameter");
  assert.equal(parameterValueTrackerRow.value, 6);
  assert.equal(parameterValueTrackerRow.normalizedValue, 0.5);
  assert.deepEqual(parameterValueTrackerRow.uniforms, {
    normalizedValue: 0.5,
    value: 6
  });
  const timelineProgressTrackerRow = snapshot.manimValueTrackerRows.find((row) => row.id === "timeline:progress");
  assert.ok(timelineProgressTrackerRow);
  assert.equal(timelineProgressTrackerRow.source, "timeline");
  assert.equal(timelineProgressTrackerRow.role, "progress");
  assert.equal(attributes["data-viz-manim-value-tracker-count"], "10");
  assert.equal(attributes["data-viz-manim-value-tracker-timeline-count"], "2");
  assert.equal(attributes["data-viz-manim-value-tracker-parameter-count"], "6");
  assert.equal(attributes["data-viz-manim-value-tracker-object-count"], "2");
  assert.equal(attributes["data-viz-manim-value-tracker-progress-count"], "3");
  assert.equal(attributes["data-viz-manim-value-tracker-control-count"], "3");
  assert.equal(attributes["data-viz-manim-value-tracker-value-count"], "0");
  assert.equal(
    attributes["data-viz-manim-value-tracker-source-contract"],
    snapshot.manimValueTrackerSourceContract
  );
  assert.equal(attributes["data-viz-manim-value-tracker-hidden-mobject-ids"], snapshot.manimValueTrackerHiddenMobjectIds);
  assert.equal(attributes["data-viz-manim-value-tracker-uniform-key-summary"], snapshot.manimValueTrackerUniformKeySummary);
  assert.equal(attributes["data-viz-manim-value-tracker-uniform-pair-count"], "10");
  assert.equal(attributes["data-viz-manim-value-tracker-uniform-value-summary"], snapshot.manimValueTrackerUniformValueSummary);
  assert.equal(attributes["data-viz-manim-value-tracker-normalized-summary"], snapshot.manimValueTrackerNormalizedValueSummary);
  assert.equal(attributes["data-viz-manim-value-tracker-range-summary"], snapshot.manimValueTrackerRangeSummary);
  assert.equal(attributes["data-viz-manim-value-tracker-source-summary"], snapshot.manimValueTrackerSourceSummary);
  assert.equal(attributes["data-viz-manim-value-tracker-ids"], snapshot.manimValueTrackerIds);
  assert.equal(attributes["data-viz-manim-value-tracker-signature"], snapshot.manimValueTrackerSignature);
  assert.equal(attributes["data-viz-manim-value-tracker-summary"], snapshot.manimValueTrackerSummary);
});

test("records Manim CameraFrame payload source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, elapsedAtMidpointOfCameraMove());
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimCameraFrameActiveShot, "curve-detail");
  assert.equal(snapshot.manimCameraFrameCanonicalShot, "overview");
  assert.equal(snapshot.manimCameraFrameResetShot, "overview");
  assert.equal(snapshot.manimCameraFrameCount, 3);
  assert.equal(snapshot.manimCameraFrameCurrentId, "overview->curve-detail");
  assert.equal(snapshot.manimCameraFrameEulerSummary, "theta=0.671;phi=0.355;gamma=0.000");
  assert.equal(snapshot.manimCameraFrameFov, 46);
  assert.equal(snapshot.manimCameraFrameGamma, 0);
  assert.equal(snapshot.manimCameraFramePhi, 0.355106);
  assert.equal(snapshot.manimCameraFramePosition, "2.800,2.475,3.400");
  assert.equal(snapshot.manimCameraFrameTarget, "0.100,0.865,0.000");
  assert.equal(snapshot.manimCameraFramePointRoundTripSourceContract, CAMERA_FRAME_POINT_ROUNDTRIP_SOURCE_CONTRACT);
  assert.equal(snapshot.manimCameraFramePointRoundTripReady, true);
  assert.ok(snapshot.manimCameraFramePointRoundTripMaxError <= 1e-9);
  assert.equal(snapshot.manimCameraFrameTargetCameraPoint, `0.000,0.000,${expectedMidpointTargetCameraDepth.toFixed(3)}`);
  assert.equal(snapshot.manimCameraFrameOriginCameraPoint, "0.000,0.000,0.000");
  assert.equal(
    snapshot.manimCameraFramePointRoundTripSummary,
    `pointRoundTrip:target=0.000,0.000,${expectedMidpointTargetCameraDepth.toFixed(3)}:origin=0.000,0.000,0.000:maxError=0.000000:ready=true`
  );
  assert.equal(snapshot.manimCameraFrameTheta, 0.671144);
  assert.equal(snapshot.manimCameraFrameProgress, 0.5);
  assert.equal(snapshot.manimCameraFrameFixedOverlayCount, 3);
  assert.equal(snapshot.manimCameraFrameRestorableCount, 1);
  assert.equal(snapshot.manimCameraFrameMatrixCount, 96);
  assert.equal(snapshot.manimCameraFrameFiniteMatrixCount, 96);
  assert.equal(snapshot.manimCameraFrameViewInverseReady, true);
  assert.ok(snapshot.manimCameraFrameViewInverseMaxError <= 1e-9);
  assert.equal(snapshot.manimCameraFrameViewMatrixDeterminant, 1);
  assert.equal(snapshot.manimCameraFrameInverseViewMatrixDeterminant, 1);
  assert.equal(snapshot.manimCameraFrameMatrixDeterminantReady, true);
  assert.ok(snapshot.manimCameraFrameMatrixDeterminantMaxError <= 1e-9);
  assert.equal(
    snapshot.manimCameraFrameMatrixDeterminantSummary,
    "determinants:view=1.000000:inverse=1.000000:maxError=0.000000:ready=true"
  );
  assert.equal(
    snapshot.manimCameraFrameViewMatrixSummary,
    "0.783,-0.216,0.583,0.000,0.000,0.938,0.348,0.000,-0.622,-0.272,0.734,0.000,-0.078,-0.789,-4.990,1.000"
  );
  assert.equal(
    snapshot.manimCameraFrameInverseViewMatrixSummary,
    "0.783,0.000,-0.622,0.000,-0.216,0.938,-0.272,0.000,0.583,0.348,0.734,0.000,2.800,2.475,3.400,1.000"
  );
  assert.match(snapshot.manimCameraFrameSignature, /^camera-frame-[0-9a-f]{8}$/);
  assert.equal(
    snapshot.manimCameraFrameSummary,
    "camera-frame:scene=mais-manim-function-graph:active=curve-detail:canonical=overview:progress=0.500:fov=46.000:euler=0.671,0.355,0.000:fixed=3:matrices=96:finite=96"
  );
  assert.deepEqual(
    snapshot.manimCameraFrameRows.map((row) => row.kind),
    ["current", "canonical", "reset"]
  );
  const currentCameraFrameRow = snapshot.manimCameraFrameRows.find((row) => row.kind === "current");
  assert.ok(currentCameraFrameRow);
  assert.equal(currentCameraFrameRow.shotId, "curve-detail");
  assert.equal(currentCameraFrameRow.frameId, "overview->curve-detail");
  assert.equal(currentCameraFrameRow.viewMatrix.length, 16);
  assert.equal(currentCameraFrameRow.inverseViewMatrix.length, 16);
  assert.deepEqual(currentCameraFrameRow.uniforms.center, [0.1, 0.865, 0]);
  assert.equal(snapshot.manimCameraFrameUniformCenter, "0.100,0.865,0.000");
  assert.equal(snapshot.manimCameraFrameUniformCount, 4);
  assert.equal(snapshot.manimCameraFrameUniformFovy, 46);
  assert.equal(snapshot.manimCameraFrameUniformOrientationQuaternion, "-0.167,0.324,0.058,0.929");
  assert.equal(snapshot.manimCameraFrameUniformShape, "16.000,9.000");
  assert.equal(snapshot.manimCameraFrameUniformSummary, "uniforms=center,fovy,orientationQuaternion,shape");
  assert.equal(snapshot.manimCameraFrameOperationCount, 4);
  assert.equal(snapshot.manimCameraFrameOperationIds, "shift,scale,rotate,restore");
  assert.equal(
    snapshot.manimCameraFrameOperationSummary,
    "operations=shift,scale,rotate,restore:shiftCenter=0.350,0.965,-0.150:scaleFovy=34.500:rotateTheta=1.195:restoreId=overview"
  );
  assert.equal(snapshot.manimCameraFrameShiftedCenter, "0.350,0.965,-0.150");
  assert.equal(snapshot.manimCameraFrameScaledFovy, 34.5);
  assert.equal(snapshot.manimCameraFrameRotatedTheta, 1.194743);
  assert.equal(snapshot.manimCameraFrameRestoredId, "overview");
  assert.equal(attributes["data-viz-manim-camera-frame-active-shot"], "curve-detail");
  assert.equal(attributes["data-viz-manim-camera-frame-canonical-shot"], "overview");
  assert.equal(attributes["data-viz-manim-camera-frame-count"], "3");
  assert.equal(attributes["data-viz-manim-camera-frame-current-id"], "overview->curve-detail");
  assert.equal(attributes["data-viz-manim-camera-frame-euler-summary"], "theta=0.671;phi=0.355;gamma=0.000");
  assert.equal(attributes["data-viz-manim-camera-frame-finite-matrix-count"], "96");
  assert.equal(attributes["data-viz-manim-camera-frame-fixed-overlay-count"], "3");
  assert.equal(attributes["data-viz-manim-camera-frame-fov"], "46.000");
  assert.equal(attributes["data-viz-manim-camera-frame-gamma"], "0.000");
  assert.equal(
    attributes["data-viz-manim-camera-frame-inverse-view-matrix-summary"],
    "0.783,0.000,-0.622,0.000,-0.216,0.938,-0.272,0.000,0.583,0.348,0.734,0.000,2.800,2.475,3.400,1.000"
  );
  assert.equal(attributes["data-viz-manim-camera-frame-inverse-view-matrix-determinant"], "1.000000");
  assert.equal(attributes["data-viz-manim-camera-frame-matrix-determinant-max-error"], "0.000000");
  assert.equal(attributes["data-viz-manim-camera-frame-matrix-determinant-ready"], "true");
  assert.equal(
    attributes["data-viz-manim-camera-frame-matrix-determinant-summary"],
    "determinants:view=1.000000:inverse=1.000000:maxError=0.000000:ready=true"
  );
  assert.equal(attributes["data-viz-manim-camera-frame-matrix-count"], "96");
  assert.equal(attributes["data-viz-manim-camera-frame-phi"], "0.355");
  assert.equal(attributes["data-viz-manim-camera-frame-position"], "2.800,2.475,3.400");
  assert.equal(attributes["data-viz-manim-camera-frame-point-roundtrip-max-error"], "0.000000");
  assert.equal(attributes["data-viz-manim-camera-frame-point-roundtrip-ready"], "true");
  assert.equal(attributes["data-viz-manim-camera-frame-point-roundtrip-source-contract"], CAMERA_FRAME_POINT_ROUNDTRIP_SOURCE_CONTRACT);
  assert.equal(
    attributes["data-viz-manim-camera-frame-point-roundtrip-summary"],
    `pointRoundTrip:target=0.000,0.000,${expectedMidpointTargetCameraDepth.toFixed(3)}:origin=0.000,0.000,0.000:maxError=0.000000:ready=true`
  );
  assert.equal(attributes["data-viz-manim-camera-frame-progress"], "0.500");
  assert.equal(attributes["data-viz-manim-camera-frame-reset-shot"], "overview");
  assert.equal(attributes["data-viz-manim-camera-frame-restorable-count"], "1");
  assert.equal(attributes["data-viz-manim-camera-frame-signature"], snapshot.manimCameraFrameSignature);
  assert.equal(attributes["data-viz-manim-camera-frame-source-contract"], CAMERA_FRAME_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-camera-frame-summary"], snapshot.manimCameraFrameSummary);
  assert.equal(attributes["data-viz-manim-camera-frame-target"], "0.100,0.865,0.000");
  assert.equal(attributes["data-viz-manim-camera-frame-target-camera-point"], `0.000,0.000,${expectedMidpointTargetCameraDepth.toFixed(3)}`);
  assert.equal(attributes["data-viz-manim-camera-frame-theta"], "0.671");
  assert.equal(attributes["data-viz-manim-camera-frame-origin-camera-point"], "0.000,0.000,0.000");
  assert.equal(attributes["data-viz-manim-camera-frame-uniform-center"], "0.100,0.865,0.000");
  assert.equal(attributes["data-viz-manim-camera-frame-uniform-count"], "4");
  assert.equal(attributes["data-viz-manim-camera-frame-uniform-fovy"], "46.000");
  assert.equal(attributes["data-viz-manim-camera-frame-uniform-orientation-quaternion"], "-0.167,0.324,0.058,0.929");
  assert.equal(attributes["data-viz-manim-camera-frame-uniform-shape"], "16.000,9.000");
  assert.equal(attributes["data-viz-manim-camera-frame-uniform-summary"], "uniforms=center,fovy,orientationQuaternion,shape");
  assert.equal(attributes["data-viz-manim-camera-frame-view-inverse-max-error"], "0.000000");
  assert.equal(attributes["data-viz-manim-camera-frame-view-inverse-ready"], "true");
  assert.equal(attributes["data-viz-manim-camera-frame-view-matrix-determinant"], "1.000000");
  assert.equal(
    attributes["data-viz-manim-camera-frame-view-matrix-summary"],
    "0.783,-0.216,0.583,0.000,0.000,0.938,0.348,0.000,-0.622,-0.272,0.734,0.000,-0.078,-0.789,-4.990,1.000"
  );
  assert.equal(attributes["data-viz-manim-camera-frame-operation-count"], "4");
  assert.equal(attributes["data-viz-manim-camera-frame-operation-ids"], "shift,scale,rotate,restore");
  assert.equal(attributes["data-viz-manim-camera-frame-operation-summary"], snapshot.manimCameraFrameOperationSummary);
  assert.equal(attributes["data-viz-manim-camera-frame-shifted-center"], "0.350,0.965,-0.150");
  assert.equal(attributes["data-viz-manim-camera-frame-scaled-fovy"], "34.500");
  assert.equal(attributes["data-viz-manim-camera-frame-rotated-theta"], "1.195");
  assert.equal(attributes["data-viz-manim-camera-frame-restored-id"], "overview");
  assert.equal(snapshot.cameraUpdaterActiveSeconds, 0);
  assert.equal(snapshot.cameraUpdaterActiveWindowSummary, "none");
  assert.equal(snapshot.cameraUpdaterTimeMode, "elapsed");
  assert.equal(attributes["data-viz-manim-camera-updater-active-seconds"], "0.000");
  assert.equal(attributes["data-viz-manim-camera-updater-active-window-summary"], "none");
  assert.equal(attributes["data-viz-manim-camera-updater-source-contract"], CAMERA_FRAME_UPDATER_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-camera-updater-time-mode"], "elapsed");
});

test("records named CameraFrame shot catalog source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, elapsedAtMidpointOfCameraMove());
  const expectedSummary = summarizeCameraShotCatalog(
    buildCameraShotCatalog(functionGraphSpec),
    runtimeState.cameraDirector.activeShotId
  );
  const expectedAttributes = cameraShotCatalogDataAttributes(expectedSummary);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimCameraShotCatalogCount, expectedSummary.shotCount);
  assert.equal(snapshot.manimCameraShotCatalogCanonicalId, expectedSummary.canonicalShotId);
  assert.equal(snapshot.manimCameraShotCatalogIds, "overview,curve-detail");
  assert.equal(snapshot.manimCameraShotCatalogMissingCount, 0);
  assert.equal(snapshot.manimCameraShotCatalogMissingIds, "none");
  assert.equal(snapshot.manimCameraShotCatalogSelectedId, "curve-detail");
  assert.equal(snapshot.manimCameraShotCatalogTimelineIds, "curve-detail");
  assert.equal(snapshot.manimCameraShotCatalogSourceContract, CAMERA_SHOT_AUTHORING_SOURCE_CONTRACT);
  assert.equal(snapshot.manimCameraShotCatalogSummary, expectedSummary.summary);
  assert.equal(attributes["data-viz-manim-camera-shot-count"], expectedAttributes["data-viz-manim-camera-shot-count"]);
  assert.equal(attributes["data-viz-manim-camera-shot-ids"], expectedAttributes["data-viz-manim-camera-shot-ids"]);
  assert.equal(attributes["data-viz-manim-camera-shot-missing-count"], "0");
  assert.equal(attributes["data-viz-manim-camera-shot-missing-ids"], "none");
  assert.equal(attributes["data-viz-manim-camera-shot-selected"], "curve-detail");
  assert.equal(attributes["data-viz-manim-camera-shot-source-contract"], CAMERA_SHOT_AUTHORING_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-camera-shot-summary"], expectedAttributes["data-viz-manim-camera-shot-summary"]);
});

test("records CameraDirector source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, elapsedAtMidpointOfCameraMove());
  const expectedEvidence = buildCameraDirectorEvidence(functionGraphSpec, runtimeState.timeline.elapsedSeconds);
  const expectedAttributes = cameraDirectorEvidenceDataAttributes(expectedEvidence);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimCameraDirectorActiveShotId, "curve-detail");
  assert.equal(snapshot.manimCameraDirectorCanonicalShotId, "overview");
  assert.equal(snapshot.manimCameraDirectorResetShotId, "overview");
  assert.equal(snapshot.manimCameraDirectorTimelineShotId, "curve-detail");
  assert.equal(snapshot.manimCameraDirectorProgress, 0.5);
  assert.equal(snapshot.manimCameraDirectorUpdaterCount, 0);
  assert.equal(snapshot.manimCameraDirectorActiveUpdaterCount, 0);
  assert.equal(snapshot.manimCameraDirectorActiveUpdaterIds, "none");
  assert.equal(snapshot.manimCameraDirectorAmbientRotationDegrees, 0);
  assert.equal(snapshot.manimCameraDirectorShotPosition, "2.800,2.475,3.400");
  assert.equal(snapshot.manimCameraDirectorShotTarget, "0.100,0.865,0.000");
  assert.equal(snapshot.manimCameraDirectorShotFov, 46);
  assert.equal(snapshot.manimCameraDirectorSourceContract, CAMERA_DIRECTOR_SOURCE_CONTRACT);
  assert.equal(snapshot.manimCameraDirectorTransitionSummary, "camera-director-transition:overview->curve-detail@0.500");
  assert.equal(snapshot.manimCameraDirectorSummary, expectedEvidence.summary);
  assert.equal(attributes["data-viz-manim-camera-director-active-shot"], expectedAttributes["data-viz-manim-camera-director-active-shot"]);
  assert.equal(attributes["data-viz-manim-camera-director-canonical-shot"], "overview");
  assert.equal(attributes["data-viz-manim-camera-director-reset-shot"], "overview");
  assert.equal(attributes["data-viz-manim-camera-director-timeline-shot"], "curve-detail");
  assert.equal(attributes["data-viz-manim-camera-director-progress"], "0.500");
  assert.equal(attributes["data-viz-manim-camera-director-transition-summary"], expectedEvidence.transitionSummary);
  assert.equal(attributes["data-viz-manim-camera-director-updater-count"], "0");
  assert.equal(attributes["data-viz-manim-camera-director-active-updater-count"], "0");
  assert.equal(attributes["data-viz-manim-camera-director-active-updater-ids"], "none");
  assert.equal(attributes["data-viz-manim-camera-director-ambient-rotation-degrees"], "0.000");
  assert.equal(attributes["data-viz-manim-camera-director-shot-position"], "2.800,2.475,3.400");
  assert.equal(attributes["data-viz-manim-camera-director-shot-target"], "0.100,0.865,0.000");
  assert.equal(attributes["data-viz-manim-camera-director-shot-fov"], "46.000");
  assert.equal(attributes["data-viz-manim-camera-director-source-contract"], expectedEvidence.sourceContract);
  assert.equal(attributes["data-viz-manim-camera-director-summary"], expectedEvidence.summary);
});

test("records Manim creation primitive source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const expectedSummary = summarizeSceneCreationPrimitivePlan(
    buildSceneCreationPrimitivePlan(functionGraphSpec)
  );
  const expectedAttributes = creationPrimitivePlanDataAttributes(expectedSummary);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimCreationPrimitiveCount, expectedSummary.primitiveCount);
  assert.equal(snapshot.manimCreationShowCount, expectedSummary.showCreationCount);
  assert.equal(snapshot.manimCreationDrawBorderThenFillCount, expectedSummary.drawBorderThenFillCount);
  assert.equal(snapshot.manimCreationFadeCount, expectedSummary.fadeCount);
  assert.equal(snapshot.manimCreationGrowFromCenterCount, expectedSummary.growFromCenterCount);
  assert.equal(snapshot.manimCreationSummary, expectedSummary.summary);
  assert.equal(
    snapshot.manimCreationSummary,
    "creation:mais-manim-function-graph:primitives=1:show=1:borderFill=0:fade=0:grow=0"
  );
  assert.equal(attributes["data-viz-manim-creation-primitive-count"], expectedAttributes["data-viz-manim-creation-primitive-count"]);
  assert.equal(attributes["data-viz-manim-creation-show-count"], expectedAttributes["data-viz-manim-creation-show-count"]);
  assert.equal(
    attributes["data-viz-manim-creation-draw-border-count"],
    expectedAttributes["data-viz-manim-creation-draw-border-count"]
  );
  assert.equal(attributes["data-viz-manim-creation-fade-count"], expectedAttributes["data-viz-manim-creation-fade-count"]);
  assert.equal(attributes["data-viz-manim-creation-grow-count"], expectedAttributes["data-viz-manim-creation-grow-count"]);
  assert.equal(attributes["data-viz-manim-creation-summary"], expectedAttributes["data-viz-manim-creation-summary"]);
});

test("records ShowCreation partial-stroke source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const expectedEvidence = buildShowCreationEvidence(
    buildSceneCreationPrimitivePlan(functionGraphSpec),
    [0.25, 0.75]
  );
  const expectedAttributes = showCreationEvidenceDataAttributes(expectedEvidence);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimShowCreationPrimitiveCount, 1);
  assert.equal(snapshot.manimShowCreationFrameCount, 2);
  assert.deepEqual(snapshot.manimShowCreationFrames, expectedEvidence.frames);
  assert.equal(snapshot.manimShowCreationObjectIds, "function-curve");
  assert.equal(snapshot.manimShowCreationPartialPolicy, SHOW_CREATION_PARTIAL_POLICY);
  assert.equal(snapshot.manimShowCreationSourceContract, SHOW_CREATION_SOURCE_CONTRACT);
  assert.equal(snapshot.manimShowCreationPhaseSequence, expectedEvidence.phaseSequence);
  assert.equal(snapshot.manimShowCreationDrawRanges, expectedEvidence.drawRangeSummary);
  assert.equal(snapshot.manimShowCreationOpacitySchedule, expectedEvidence.opacitySchedule);
  assert.equal(snapshot.manimShowCreationProgressRange, expectedEvidence.progressRange);
  assert.equal(snapshot.manimShowCreationSummary, summarizeShowCreationEvidence(expectedEvidence));
  assert.equal(
    attributes["data-viz-manim-show-creation-primitive-count"],
    expectedAttributes["data-viz-manim-show-creation-primitive-count"]
  );
  assert.equal(
    attributes["data-viz-manim-show-creation-frame-count"],
    expectedAttributes["data-viz-manim-show-creation-frame-count"]
  );
  assert.equal(
    attributes["data-viz-manim-show-creation-object-ids"],
    expectedAttributes["data-viz-manim-show-creation-object-ids"]
  );
  assert.equal(
    attributes["data-viz-manim-show-creation-partial-policy"],
    expectedAttributes["data-viz-manim-show-creation-partial-policy"]
  );
  assert.equal(
    attributes["data-viz-manim-show-creation-phase-sequence"],
    expectedAttributes["data-viz-manim-show-creation-phase-sequence"]
  );
  assert.equal(
    attributes["data-viz-manim-show-creation-draw-ranges"],
    expectedAttributes["data-viz-manim-show-creation-draw-ranges"]
  );
  assert.equal(
    attributes["data-viz-manim-show-creation-opacity-schedule"],
    expectedAttributes["data-viz-manim-show-creation-opacity-schedule"]
  );
  assert.equal(
    attributes["data-viz-manim-show-creation-progress-range"],
    expectedAttributes["data-viz-manim-show-creation-progress-range"]
  );
  assert.equal(
    attributes["data-viz-manim-show-creation-source-contract"],
    expectedAttributes["data-viz-manim-show-creation-source-contract"]
  );
  assert.equal(
    attributes["data-viz-manim-show-creation-summary"],
    expectedAttributes["data-viz-manim-show-creation-summary"]
  );
});

test("records DrawBorderThenFill phase source contract for browser QA", () => {
  const scene: MathSceneSpec = {
    bindings: [],
    cameraShots: [],
    coordinateSpace: {
      mathRange: { x: [-2, 2], y: [-2, 2], z: [-2, 2] },
      worldRange: { x: [-2, 2], y: [-2, 2], z: [-2, 2] }
    },
    diagnostics: {
      expectedBindingCount: 0,
      expectedObjectCount: 1,
      expectedTokenCount: 0
    },
    familyId: "three-function-graph",
    formulas: [],
    objects: [
      {
        colorRole: "function",
        conceptId: "area-under-curve",
        id: "area-surface",
        samples: [
          [[0, 0, 0], [1, 0, 0]],
          [[0, 1, 0], [1, 1, 0]]
        ],
        style: {
          fillOpacity: 0.6,
          fillRole: "area",
          strokeOpacity: 0.8,
          strokeRole: "function",
          strokeWidth: 4
        },
        type: "parametricSurface",
        uRange: [0, 1],
        vRange: [0, 1]
      }
    ],
    sceneId: "draw-border-fill-fixture",
    timeline: [
      { type: "revealSurface", objectId: "area-surface", duration: 2, easing: "smooth" }
    ]
  };
  const runtimeState = buildMathSceneRuntimeState(scene, 0);
  const expectedEvidence = buildDrawBorderThenFillEvidence(
    buildSceneCreationPrimitivePlan(scene),
    [0.25, 0.75]
  );
  const expectedAttributes = drawBorderThenFillEvidenceDataAttributes(expectedEvidence);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimDrawBorderFillPrimitiveCount, 1);
  assert.equal(snapshot.manimDrawBorderFillFrameCount, 2);
  assert.deepEqual(snapshot.manimDrawBorderFillFrames, expectedEvidence.frames);
  assert.equal(snapshot.manimDrawBorderFillBorderFrameCount, 1);
  assert.equal(snapshot.manimDrawBorderFillFillFrameCount, 1);
  assert.equal(snapshot.manimDrawBorderFillPhasePolicy, DRAW_BORDER_THEN_FILL_PHASE_POLICY);
  assert.equal(snapshot.manimDrawBorderFillSourceContract, DRAW_BORDER_THEN_FILL_SOURCE_CONTRACT);
  assert.equal(snapshot.manimDrawBorderFillObjectIds, "area-surface");
  assert.equal(snapshot.manimDrawBorderFillPhaseSequence, expectedEvidence.phaseSequence);
  assert.equal(snapshot.manimDrawBorderFillDrawRanges, expectedEvidence.drawRangeSummary);
  assert.equal(snapshot.manimDrawBorderFillFillOpacitySchedule, expectedEvidence.fillOpacitySchedule);
  assert.equal(snapshot.manimDrawBorderFillStrokeOpacitySchedule, expectedEvidence.strokeOpacitySchedule);
  assert.equal(snapshot.manimDrawBorderFillSummary, summarizeDrawBorderThenFillEvidence(expectedEvidence));
  assert.equal(
    attributes["data-viz-manim-draw-border-fill-primitive-count"],
    expectedAttributes["data-viz-manim-draw-border-fill-primitive-count"]
  );
  assert.equal(
    attributes["data-viz-manim-draw-border-fill-frame-count"],
    expectedAttributes["data-viz-manim-draw-border-fill-frame-count"]
  );
  assert.equal(
    attributes["data-viz-manim-draw-border-fill-border-frame-count"],
    expectedAttributes["data-viz-manim-draw-border-fill-border-frame-count"]
  );
  assert.equal(
    attributes["data-viz-manim-draw-border-fill-fill-frame-count"],
    expectedAttributes["data-viz-manim-draw-border-fill-fill-frame-count"]
  );
  assert.equal(
    attributes["data-viz-manim-draw-border-fill-object-ids"],
    expectedAttributes["data-viz-manim-draw-border-fill-object-ids"]
  );
  assert.equal(
    attributes["data-viz-manim-draw-border-fill-phase-policy"],
    expectedAttributes["data-viz-manim-draw-border-fill-phase-policy"]
  );
  assert.equal(
    attributes["data-viz-manim-draw-border-fill-phase-sequence"],
    expectedAttributes["data-viz-manim-draw-border-fill-phase-sequence"]
  );
  assert.equal(
    attributes["data-viz-manim-draw-border-fill-draw-ranges"],
    expectedAttributes["data-viz-manim-draw-border-fill-draw-ranges"]
  );
  assert.equal(
    attributes["data-viz-manim-draw-border-fill-source-contract"],
    expectedAttributes["data-viz-manim-draw-border-fill-source-contract"]
  );
  assert.equal(
    attributes["data-viz-manim-draw-border-fill-fill-opacity-schedule"],
    expectedAttributes["data-viz-manim-draw-border-fill-fill-opacity-schedule"]
  );
  assert.equal(
    attributes["data-viz-manim-draw-border-fill-stroke-opacity-schedule"],
    expectedAttributes["data-viz-manim-draw-border-fill-stroke-opacity-schedule"]
  );
  assert.equal(
    attributes["data-viz-manim-draw-border-fill-summary"],
    expectedAttributes["data-viz-manim-draw-border-fill-summary"]
  );
});

test("records FadeIn, FadeOut, and GrowFromCenter phase source contract for browser QA", () => {
  const scene: MathSceneSpec = {
    bindings: [],
    cameraShots: [],
    coordinateSpace: {
      mathRange: { x: [-2, 2], y: [-2, 2], z: [-2, 2] },
      worldRange: { x: [-2, 2], y: [-2, 2], z: [-2, 2] }
    },
    diagnostics: {
      expectedBindingCount: 0,
      expectedObjectCount: 2,
      expectedTokenCount: 0
    },
    familyId: "three-function-graph",
    formulas: [],
    objects: [
      {
        colorRole: "function",
        conceptId: "curve",
        id: "curve",
        samples: [[0, 0, 0], [1, 1, 0]],
        style: { strokeRole: "function", strokeWidth: 4 },
        type: "parametricCurve"
      },
      {
        colorRole: "attention",
        conceptId: "surface",
        id: "surface",
        samples: [
          [[0, 0, 0], [1, 0, 0]],
          [[0, 1, 0], [1, 1, 0]]
        ],
        style: { fillOpacity: 0.5, fillRole: "area", strokeRole: "attention", strokeWidth: 3 },
        type: "parametricSurface",
        uRange: [0, 1],
        vRange: [0, 1]
      }
    ],
    sceneId: "fade-grow-fixture",
    timeline: [
      { type: "fadeInObject", objectId: "curve", duration: 0.8, easing: "smooth" },
      { type: "growFromCenter", objectId: "surface", duration: 1.1, easing: "smooth" },
      { type: "fadeOutObject", objectId: "curve", duration: 0.7, easing: "linear" }
    ]
  };
  const runtimeState = buildMathSceneRuntimeState(scene, 0);
  const expectedEvidence = buildFadeGrowEvidence(
    buildSceneCreationPrimitivePlan(scene),
    [0.25, 0.75]
  );
  const expectedAttributes = fadeGrowEvidenceDataAttributes(expectedEvidence);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimFadeGrowPrimitiveCount, 3);
  assert.equal(snapshot.manimFadeGrowFrameCount, 6);
  assert.deepEqual(snapshot.manimFadeGrowFrames, expectedEvidence.frames);
  assert.equal(snapshot.manimFadeGrowFadeFrameCount, 4);
  assert.equal(snapshot.manimFadeGrowGrowFrameCount, 2);
  assert.equal(snapshot.manimFadeGrowPhasePolicy, FADE_GROW_PHASE_POLICY);
  assert.equal(snapshot.manimFadeGrowSourceContract, FADE_GROW_SOURCE_CONTRACT);
  assert.equal(snapshot.manimFadeGrowObjectIds, "curve,surface");
  assert.equal(snapshot.manimFadeGrowKindSequence, expectedEvidence.kindSequence);
  assert.equal(snapshot.manimFadeGrowPhaseSequence, expectedEvidence.phaseSequence);
  assert.equal(snapshot.manimFadeGrowOpacitySchedule, expectedEvidence.opacitySchedule);
  assert.equal(snapshot.manimFadeGrowScaleSchedule, expectedEvidence.scaleSchedule);
  assert.equal(snapshot.manimFadeGrowSummary, summarizeFadeGrowEvidence(expectedEvidence));
  assert.equal(
    attributes["data-viz-manim-fade-grow-primitive-count"],
    expectedAttributes["data-viz-manim-fade-grow-primitive-count"]
  );
  assert.equal(
    attributes["data-viz-manim-fade-grow-frame-count"],
    expectedAttributes["data-viz-manim-fade-grow-frame-count"]
  );
  assert.equal(
    attributes["data-viz-manim-fade-grow-fade-frame-count"],
    expectedAttributes["data-viz-manim-fade-grow-fade-frame-count"]
  );
  assert.equal(
    attributes["data-viz-manim-fade-grow-grow-frame-count"],
    expectedAttributes["data-viz-manim-fade-grow-grow-frame-count"]
  );
  assert.equal(
    attributes["data-viz-manim-fade-grow-object-ids"],
    expectedAttributes["data-viz-manim-fade-grow-object-ids"]
  );
  assert.equal(
    attributes["data-viz-manim-fade-grow-kind-sequence"],
    expectedAttributes["data-viz-manim-fade-grow-kind-sequence"]
  );
  assert.equal(
    attributes["data-viz-manim-fade-grow-phase-sequence"],
    expectedAttributes["data-viz-manim-fade-grow-phase-sequence"]
  );
  assert.equal(
    attributes["data-viz-manim-fade-grow-opacity-schedule"],
    expectedAttributes["data-viz-manim-fade-grow-opacity-schedule"]
  );
  assert.equal(
    attributes["data-viz-manim-fade-grow-phase-policy"],
    expectedAttributes["data-viz-manim-fade-grow-phase-policy"]
  );
  assert.equal(
    attributes["data-viz-manim-fade-grow-scale-schedule"],
    expectedAttributes["data-viz-manim-fade-grow-scale-schedule"]
  );
  assert.equal(
    attributes["data-viz-manim-fade-grow-source-contract"],
    expectedAttributes["data-viz-manim-fade-grow-source-contract"]
  );
  assert.equal(
    attributes["data-viz-manim-fade-grow-summary"],
    expectedAttributes["data-viz-manim-fade-grow-summary"]
  );
});

test("records Manim indication primitive source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const expectedSummary = summarizeSceneIndicationPrimitivePlan(
    buildSceneIndicationPrimitivePlan(functionGraphSpec)
  );
  const expectedAttributes = indicationPrimitivePlanDataAttributes(expectedSummary);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimIndicationCount, expectedSummary.indicationCount);
  assert.equal(snapshot.manimIndicationHighlightBeatCount, expectedSummary.highlightBeatCount);
  assert.equal(snapshot.manimIndicationTargetObjectCount, expectedSummary.targetObjectCount);
  assert.equal(snapshot.manimIndicationMissingTargetCount, expectedSummary.missingTargetCount);
  assert.equal(snapshot.manimIndicationPulseCount, expectedSummary.pulseCount);
  assert.equal(snapshot.manimIndicationCircumscribeCount, expectedSummary.circumscribeCount);
  assert.equal(snapshot.manimIndicationFlashCount, expectedSummary.flashCount);
  assert.equal(snapshot.manimIndicationSourceContract, INDICATION_PRIMITIVE_SOURCE_CONTRACT);
  assert.equal(snapshot.manimIndicationStatePolicy, INDICATION_PRIMITIVE_STATE_POLICY);
  assert.equal(snapshot.manimIndicationConceptIds, "function-rule");
  assert.equal(snapshot.manimIndicationTargetObjectIds, "function-curve");
  assert.equal(
    snapshot.manimIndicationSummary,
    "indication:mais-manim-function-graph:beats=1:targets=1:pulse=1:circumscribe=0:flash=0:missing=0"
  );
  assert.equal(attributes["data-viz-manim-indication-count"], expectedAttributes["data-viz-manim-indication-count"]);
  assert.equal(
    attributes["data-viz-manim-indication-highlight-beat-count"],
    expectedAttributes["data-viz-manim-indication-highlight-beat-count"]
  );
  assert.equal(
    attributes["data-viz-manim-indication-target-object-count"],
    expectedAttributes["data-viz-manim-indication-target-object-count"]
  );
  assert.equal(
    attributes["data-viz-manim-indication-missing-target-count"],
    expectedAttributes["data-viz-manim-indication-missing-target-count"]
  );
  assert.equal(attributes["data-viz-manim-indication-pulse-count"], expectedAttributes["data-viz-manim-indication-pulse-count"]);
  assert.equal(
    attributes["data-viz-manim-indication-circumscribe-count"],
    expectedAttributes["data-viz-manim-indication-circumscribe-count"]
  );
  assert.equal(attributes["data-viz-manim-indication-flash-count"], expectedAttributes["data-viz-manim-indication-flash-count"]);
  assert.equal(
    attributes["data-viz-manim-indication-source-contract"],
    expectedAttributes["data-viz-manim-indication-source-contract"]
  );
  assert.equal(
    attributes["data-viz-manim-indication-state-policy"],
    expectedAttributes["data-viz-manim-indication-state-policy"]
  );
  assert.equal(
    attributes["data-viz-manim-indication-concept-ids"],
    expectedAttributes["data-viz-manim-indication-concept-ids"]
  );
  assert.equal(
    attributes["data-viz-manim-indication-target-object-ids"],
    expectedAttributes["data-viz-manim-indication-target-object-ids"]
  );
  assert.equal(attributes["data-viz-manim-indication-summary"], expectedAttributes["data-viz-manim-indication-summary"]);
});

test("records active runtime indication overlay evidence for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, elapsedAtMidpointOfSweepParameter("function-rule"));
  const focusTargetIds = timelineFocusTargetIds(runtimeState.timeline.activeStep);
  const expectedSummary = summarizeRuntimeIndicationOverlayFrames(
    buildRuntimeIndicationOverlayFrames(runtimeState, { focusTargetIds }),
    runtimeState.timeline.activeConceptId,
    { focusTargetIds }
  );
  const expectedAttributes = runtimeIndicationOverlayDataAttributes(expectedSummary);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(runtimeState.timeline.activeStep?.type, "sweepParameter");
  assert.equal(snapshot.manimIndicationRuntimeOverlayActiveConceptId, "function-rule");
  assert.equal(snapshot.manimIndicationRuntimeOverlayFocusTargetIds, "parameter:value,function-rule,function-token");
  assert.equal(snapshot.manimIndicationRuntimeOverlayCount, expectedSummary.frameCount);
  assert.equal(snapshot.manimIndicationRuntimeOverlayFocusTargetCount, expectedSummary.focusTargetCount);
  assert.equal(snapshot.manimIndicationRuntimeOverlayFocusTargetIds, expectedSummary.focusTargetIds);
  assert.equal(snapshot.manimIndicationRuntimeOverlayFocusTargetPolicy, expectedSummary.focusTargetPolicy);
  assert.equal(snapshot.manimIndicationRuntimeOverlayFocusTargetPrimaryId, expectedSummary.focusTargetPrimaryId);
  assert.equal(snapshot.manimIndicationRuntimeOverlayFocusTargetSummary, expectedSummary.focusTargetSummary);
  assert.equal(snapshot.manimIndicationRuntimeOverlayLineCount, expectedSummary.lineFrameCount);
  assert.equal(snapshot.manimIndicationRuntimeOverlayObjectCount, expectedSummary.objectCount);
  assert.equal(snapshot.manimIndicationRuntimeOverlayObjectIds, "function-curve");
  assert.equal(snapshot.manimIndicationRuntimeOverlayPointCount, expectedSummary.pointFrameCount);
  assert.equal(snapshot.manimIndicationRuntimeOverlaySourceContract, RUNTIME_INDICATION_OVERLAY_SOURCE_CONTRACT);
  assert.equal(snapshot.manimIndicationRuntimeOverlayStatePolicy, RUNTIME_INDICATION_OVERLAY_STATE_POLICY);
  assert.equal(snapshot.manimIndicationRuntimeOverlaySummary, expectedSummary.summary);
  assert.equal(
    attributes["data-viz-manim-indication-runtime-overlay-active-concept-id"],
    expectedAttributes["data-viz-manim-indication-runtime-overlay-active-concept-id"]
  );
  assert.equal(
    attributes["data-viz-manim-indication-runtime-overlay-count"],
    expectedAttributes["data-viz-manim-indication-runtime-overlay-count"]
  );
  assert.equal(
    attributes["data-viz-manim-indication-runtime-overlay-focus-target-count"],
    expectedAttributes["data-viz-manim-indication-runtime-overlay-focus-target-count"]
  );
  assert.equal(
    attributes["data-viz-manim-indication-runtime-overlay-focus-target-ids"],
    expectedAttributes["data-viz-manim-indication-runtime-overlay-focus-target-ids"]
  );
  assert.equal(
    attributes["data-viz-manim-indication-runtime-overlay-focus-target-policy"],
    expectedAttributes["data-viz-manim-indication-runtime-overlay-focus-target-policy"]
  );
  assert.equal(
    attributes["data-viz-manim-indication-runtime-overlay-focus-target-primary-id"],
    expectedAttributes["data-viz-manim-indication-runtime-overlay-focus-target-primary-id"]
  );
  assert.equal(
    attributes["data-viz-manim-indication-runtime-overlay-focus-target-summary"],
    expectedAttributes["data-viz-manim-indication-runtime-overlay-focus-target-summary"]
  );
  assert.equal(
    attributes["data-viz-manim-indication-runtime-overlay-line-count"],
    expectedAttributes["data-viz-manim-indication-runtime-overlay-line-count"]
  );
  assert.equal(
    attributes["data-viz-manim-indication-runtime-overlay-object-count"],
    expectedAttributes["data-viz-manim-indication-runtime-overlay-object-count"]
  );
  assert.equal(
    attributes["data-viz-manim-indication-runtime-overlay-object-ids"],
    expectedAttributes["data-viz-manim-indication-runtime-overlay-object-ids"]
  );
  assert.equal(
    attributes["data-viz-manim-indication-runtime-overlay-point-count"],
    expectedAttributes["data-viz-manim-indication-runtime-overlay-point-count"]
  );
  assert.equal(
    attributes["data-viz-manim-indication-runtime-overlay-source-contract"],
    expectedAttributes["data-viz-manim-indication-runtime-overlay-source-contract"]
  );
  assert.equal(
    attributes["data-viz-manim-indication-runtime-overlay-state-policy"],
    expectedAttributes["data-viz-manim-indication-runtime-overlay-state-policy"]
  );
  assert.equal(
    attributes["data-viz-manim-indication-runtime-overlay-summary"],
    expectedAttributes["data-viz-manim-indication-runtime-overlay-summary"]
  );
});

test("records Manim axis tick source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const expectedPlan = buildAxisTickPlan(functionGraphSpec);
  const expectedAttributes = axisTickPlanDataAttributes(expectedPlan);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimAxisObjectCount, expectedPlan.axisObjectCount);
  assert.equal(snapshot.manimAxisTickCount, expectedPlan.tickCount);
  assert.equal(snapshot.manimAxisLabelCount, expectedPlan.labelCount);
  assert.equal(snapshot.manimAxisLabelAnchorCount, expectedPlan.labelAnchorCount);
  assert.equal(snapshot.manimAxisLabelAnchorFiniteCount, expectedPlan.finiteLabelAnchorCount);
  assert.equal(snapshot.manimAxisLabelAnchorSummary, summarizeAxisLabelAnchors(expectedPlan));
  assert.equal(snapshot.manimAxisFiniteTickCount, expectedPlan.finiteTickCount);
  assert.equal(snapshot.manimAxisMajorTickCount, expectedPlan.majorTickCount);
  assert.equal(snapshot.manimAxisSpacingMaxDelta, expectedPlan.spacingMaxDelta);
  assert.equal(snapshot.manimAxisSummary, summarizeAxisTickPlan(expectedPlan));
  assert.equal(snapshot.manimAxisSpacingSummary, summarizeAxisTickSpacing(expectedPlan));
  assert.equal(
    snapshot.manimAxisSummary,
    "axes:mais-manim-function-graph:axisObjects=1:ticks=15:labels=15:finite=15"
  );
  assert.equal(
    snapshot.manimAxisLabelAnchorSummary,
    "axisLabelAnchors:mais-manim-function-graph:count=15:finite=15:offset=0.180:axes=x,y,z"
  );
  assert.equal(
    snapshot.manimAxisSpacingSummary,
    "axisSpacing:mais-manim-function-graph:x=1.175,y=0.520,z=0.175:maxDelta=0.000000:major=8"
  );
  assert.equal(attributes["data-viz-manim-axis-object-count"], expectedAttributes["data-viz-manim-axis-object-count"]);
  assert.equal(attributes["data-viz-manim-axis-tick-count"], expectedAttributes["data-viz-manim-axis-tick-count"]);
  assert.equal(attributes["data-viz-manim-axis-label-count"], expectedAttributes["data-viz-manim-axis-label-count"]);
  assert.equal(attributes["data-viz-manim-axis-label-anchor-count"], expectedAttributes["data-viz-manim-axis-label-anchor-count"]);
  assert.equal(
    attributes["data-viz-manim-axis-label-anchor-finite-count"],
    expectedAttributes["data-viz-manim-axis-label-anchor-finite-count"]
  );
  assert.equal(
    attributes["data-viz-manim-axis-label-anchor-summary"],
    expectedAttributes["data-viz-manim-axis-label-anchor-summary"]
  );
  assert.equal(
    attributes["data-viz-manim-axis-finite-tick-count"],
    expectedAttributes["data-viz-manim-axis-finite-tick-count"]
  );
  assert.equal(attributes["data-viz-manim-axis-major-tick-count"], expectedAttributes["data-viz-manim-axis-major-tick-count"]);
  assert.equal(attributes["data-viz-manim-axis-spacing-max-delta"], expectedAttributes["data-viz-manim-axis-spacing-max-delta"]);
  assert.equal(attributes["data-viz-manim-axis-spacing-summary"], expectedAttributes["data-viz-manim-axis-spacing-summary"]);
  assert.equal(attributes["data-viz-manim-axis-summary"], expectedAttributes["data-viz-manim-axis-summary"]);
});

test("records projected formula label anchors for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const formulaLayer = buildFormulaLayerState(functionGraphSpec, {
    activeConceptId: runtimeState.timeline.activeConceptId
  });
  const projectedLabelTextByObjectId = buildActiveProjectedLabelTextByObjectId(formulaLayer);
  const projectedLabelTextSummary = summarizeActiveProjectedLabelText(formulaLayer);
  const expectedProjectedLabelTextAttributes = formulaLayerProjectedLabelTextDataAttributes(projectedLabelTextSummary);
  const projectedAnchors = buildProjectedLabelAnchorsFromRuntimeState(runtimeState, { height: 450, width: 800 }, {
    anchorForObject: (node) => formulaLayer.activeObjectAnchorNames[node.id] ?? "center",
    objectIds: formulaLayer.activeObjectIds,
    textForObject: (node) => projectedLabelTextByObjectId[node.id] ?? node.id
  });
  const expectedSummary = summarizeProjectedLabelAnchors(
    projectedAnchors
  );
  const expectedAttributes = projectedLabelAnchorDataAttributes(expectedSummary);
  const expectedFormulaCollision = buildFormulaOverlayCollisionDiagnostics({
    formulaId: functionGraphSpec.formulas[0].id,
    projectedLabels: projectedAnchors,
    tokenCount: functionGraphSpec.formulas.reduce((sum, formula) => sum + formula.tokens.length, 0),
    viewport: { height: 450, width: 800 }
  });
  const expectedFormulaCollisionAttributes = formulaOverlayCollisionDataAttributes(expectedFormulaCollision);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimProjectedLabelCount, expectedSummary.labelCount);
  assert.equal(snapshot.manimProjectedLabelVisibleCount, expectedSummary.visibleCount);
  assert.equal(snapshot.manimProjectedLabelHiddenCount, expectedSummary.hiddenCount);
  assert.equal(snapshot.manimProjectedLabelObjectCount, expectedSummary.objectCount);
  assert.equal(snapshot.manimProjectedLabelObjectIds, "function-curve");
  assert.equal(snapshot.manimProjectedLabelConceptIds, "function-rule");
  assert.equal(snapshot.manimProjectedLabelHiddenObjectIds, "none");
  assert.equal(snapshot.manimProjectedLabelSourceContract, PROJECTED_LABEL_SOURCE_CONTRACT);
  assert.equal(snapshot.manimProjectedLabelTextObjectCount, 1);
  assert.equal(snapshot.manimProjectedLabelTextObjectIds, "function-curve");
  assert.equal(snapshot.manimProjectedLabelTextPolicy, FORMULA_LAYER_PROJECTED_LABEL_TEXT_POLICY);
  assert.equal(snapshot.manimProjectedLabelTextSource, "formula-token");
  assert.equal(snapshot.manimProjectedLabelTextSourceContract, FORMULA_LAYER_SOURCE_CONTRACT);
  assert.equal(snapshot.manimProjectedLabelTextSummary, "projectedLabelText=1:source=formula-token:objects=function-curve:labels=function-curve=f(x)");
  assert.equal(snapshot.manimProjectedLabelTextTokenSummary, "function-curve=f(x)");
  assert.equal(snapshot.manimFormulaCollisionCount, expectedFormulaCollision.collisionCount);
  assert.equal(snapshot.manimFormulaCollisionLabelIds, expectedFormulaCollision.collisionLabelIds);
  assert.equal(snapshot.manimFormulaCollisionSourceContract, FORMULA_OVERLAY_COLLISION_SOURCE_CONTRACT);
  assert.equal(snapshot.manimFormulaMobileViewport, expectedFormulaCollision.mobileViewport);
  assert.equal(snapshot.manimFormulaSafeAreaStatus, expectedFormulaCollision.safeAreaStatus);
  assert.equal(snapshot.manimFormulaSafeAreaSummary, expectedFormulaCollision.summary);
  assert.equal(snapshot.manimFormulaLayerSourceContract, FORMULA_LAYER_SOURCE_CONTRACT);
  assert.equal(
    snapshot.manimProjectedLabelSummary,
    "projectedLabels=1:visible=1:hidden=0:objects=function-curve:concepts=function-rule:hiddenObjects=none"
  );
  assert.equal(attributes["data-viz-manim-projected-label-count"], expectedAttributes["data-viz-manim-projected-label-count"]);
  assert.equal(
    attributes["data-viz-manim-projected-label-visible-count"],
    expectedAttributes["data-viz-manim-projected-label-visible-count"]
  );
  assert.equal(
    attributes["data-viz-manim-projected-label-hidden-count"],
    expectedAttributes["data-viz-manim-projected-label-hidden-count"]
  );
  assert.equal(
    attributes["data-viz-manim-projected-label-object-count"],
    expectedAttributes["data-viz-manim-projected-label-object-count"]
  );
  assert.equal(
    attributes["data-viz-manim-projected-label-object-ids"],
    expectedAttributes["data-viz-manim-projected-label-object-ids"]
  );
  assert.equal(
    attributes["data-viz-manim-projected-label-concept-ids"],
    expectedAttributes["data-viz-manim-projected-label-concept-ids"]
  );
  assert.equal(
    attributes["data-viz-manim-projected-label-hidden-object-ids"],
    expectedAttributes["data-viz-manim-projected-label-hidden-object-ids"]
  );
  assert.equal(
    attributes["data-viz-manim-projected-label-source-contract"],
    PROJECTED_LABEL_SOURCE_CONTRACT
  );
  assert.equal(
    attributes["data-viz-manim-projected-label-summary"],
    expectedAttributes["data-viz-manim-projected-label-summary"]
  );
  assert.equal(
    attributes["data-viz-manim-projected-label-text-object-count"],
    expectedProjectedLabelTextAttributes["data-viz-manim-projected-label-text-object-count"]
  );
  assert.equal(
    attributes["data-viz-manim-projected-label-text-object-ids"],
    expectedProjectedLabelTextAttributes["data-viz-manim-projected-label-text-object-ids"]
  );
  assert.equal(
    attributes["data-viz-manim-projected-label-text-policy"],
    FORMULA_LAYER_PROJECTED_LABEL_TEXT_POLICY
  );
  assert.equal(
    attributes["data-viz-manim-projected-label-text-source"],
    "formula-token"
  );
  assert.equal(
    attributes["data-viz-manim-projected-label-text-source-contract"],
    FORMULA_LAYER_SOURCE_CONTRACT
  );
  assert.equal(
    attributes["data-viz-manim-projected-label-text-summary"],
    expectedProjectedLabelTextAttributes["data-viz-manim-projected-label-text-summary"]
  );
  assert.equal(
    attributes["data-viz-manim-projected-label-text-token-summary"],
    "function-curve=f(x)"
  );
  assert.equal(
    attributes["data-viz-manim-formula-collision-count"],
    expectedFormulaCollisionAttributes["data-viz-manim-formula-collision-count"]
  );
  assert.equal(
    attributes["data-viz-manim-formula-collision-label-ids"],
    expectedFormulaCollisionAttributes["data-viz-manim-formula-collision-label-ids"]
  );
  assert.equal(
    attributes["data-viz-manim-formula-collision-source-contract"],
    FORMULA_OVERLAY_COLLISION_SOURCE_CONTRACT
  );
  assert.equal(
    attributes["data-viz-manim-formula-mobile-viewport"],
    expectedFormulaCollisionAttributes["data-viz-manim-formula-mobile-viewport"]
  );
  assert.equal(
    attributes["data-viz-manim-formula-safe-area-status"],
    expectedFormulaCollisionAttributes["data-viz-manim-formula-safe-area-status"]
  );
  assert.equal(
    attributes["data-viz-manim-formula-safe-area-summary"],
    expectedFormulaCollisionAttributes["data-viz-manim-formula-safe-area-summary"]
  );
  assert.equal(attributes["data-viz-manim-formula-layer-source-contract"], FORMULA_LAYER_SOURCE_CONTRACT);
});

test("uses timeline focus targets to bind moving-point beats to formula labels", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 3);
  const formulaLayer = buildFormulaLayerState(functionGraphSpec, {
    activeConceptId: "probe-point",
    activeConceptIds: ["probe-point", runtimeState.timeline.activeConceptId, ...timelineFocusTargetIds(runtimeState.timeline.activeStep)]
  });
  const projectedLabelTextByObjectId = buildActiveProjectedLabelTextByObjectId(formulaLayer);
  const projectedAnchors = buildProjectedLabelAnchorsFromRuntimeState(runtimeState, { height: 450, width: 800 }, {
    anchorForObject: (node) => formulaLayer.activeObjectAnchorNames[node.id] ?? "center",
    objectIds: formulaLayer.activeObjectIds,
    textForObject: (node) => projectedLabelTextByObjectId[node.id] ?? node.id
  });
  const expectedSummary = summarizeProjectedLabelAnchors(projectedAnchors);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);
  const expectedRuntimeOverlayFocusTargetIds = timelineFocusTargetIds(runtimeState.timeline.activeStep);
  const expectedRuntimeOverlaySummary = summarizeRuntimeIndicationOverlayFrames(
    buildRuntimeIndicationOverlayFrames(runtimeState, { focusTargetIds: expectedRuntimeOverlayFocusTargetIds }),
    snapshot.activeConceptId,
    { focusTargetIds: expectedRuntimeOverlayFocusTargetIds }
  );

  assert.equal(runtimeState.timeline.activeStep?.type, "moveAlongPath");
  assert.equal(runtimeState.timeline.activeConceptId, "function-curve");
  assert.deepEqual(timelineFocusTargetIds(runtimeState.timeline.activeStep), ["moving-probe", "function-curve"]);
  assert.deepEqual(projectedLabelTextByObjectId, {
    "function-curve": "f(x)",
    "moving-probe": "(x,f(x))"
  });
  assert.equal(snapshot.activeConceptId, "probe-point");
  assert.equal(snapshot.manimTimelineFocusTargetCount, 2);
  assert.equal(snapshot.manimTimelineFocusTargetIds, "moving-probe,function-curve");
  assert.equal(snapshot.manimTimelineFocusTargetPrimaryId, "moving-probe");
  assert.equal(snapshot.manimTimelineFocusTargetSummary, "timelineFocus:active=moveAlongPath:targets=2:ids=moving-probe,function-curve");
  assert.equal(snapshot.manimIndicationRuntimeOverlayActiveConceptId, "probe-point");
  assert.equal(snapshot.manimIndicationRuntimeOverlayFocusTargetCount, 2);
  assert.equal(snapshot.manimIndicationRuntimeOverlayFocusTargetIds, "moving-probe,function-curve");
  assert.equal(snapshot.manimIndicationRuntimeOverlayFocusTargetPrimaryId, "moving-probe");
  assert.equal(
    snapshot.manimIndicationRuntimeOverlayFocusTargetSummary,
    "runtimeIndicationOverlayFocus:active=probe-point:targets=2:ids=moving-probe,function-curve"
  );
  assert.equal(snapshot.manimIndicationRuntimeOverlayCount, expectedRuntimeOverlaySummary.frameCount);
  assert.equal(snapshot.manimIndicationRuntimeOverlayLineCount, 1);
  assert.equal(snapshot.manimIndicationRuntimeOverlayPointCount, 1);
  assert.equal(snapshot.manimIndicationRuntimeOverlayObjectIds, "function-curve,moving-probe");
  assert.equal(snapshot.manimProjectedLabelObjectCount, expectedSummary.objectCount);
  assert.equal(snapshot.manimProjectedLabelObjectIds, "function-curve,moving-probe");
  assert.equal(snapshot.manimProjectedLabelConceptIds, "function-rule,probe-point");
  assert.equal(snapshot.manimProjectedLabelTextObjectCount, 2);
  assert.equal(snapshot.manimProjectedLabelTextObjectIds, "function-curve,moving-probe");
  assert.equal(
    snapshot.manimProjectedLabelTextSummary,
    "projectedLabelText=2:source=formula-token:objects=function-curve,moving-probe:labels=function-curve=f(x)|moving-probe=(x,f(x))"
  );
  assert.equal(snapshot.manimProjectedLabelTextTokenSummary, "function-curve=f(x)|moving-probe=(x,f(x))");
  assert.equal(
    attributes["data-viz-manim-timeline-focus-target-summary"],
    "timelineFocus:active=moveAlongPath:targets=2:ids=moving-probe,function-curve"
  );
  assert.equal(
    attributes["data-viz-manim-indication-runtime-overlay-focus-target-summary"],
    "runtimeIndicationOverlayFocus:active=probe-point:targets=2:ids=moving-probe,function-curve"
  );
  assert.equal(
    attributes["data-viz-manim-indication-runtime-overlay-object-ids"],
    "function-curve,moving-probe"
  );
  assert.equal(
    attributes["data-viz-manim-projected-label-text-token-summary"],
    "function-curve=f(x)|moving-probe=(x,f(x))"
  );
});

test("accepts measured FormulaLayer viewport for projected label and collision evidence", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const measuredViewport = { height: 320, width: 360 };
  const projectedAnchors = buildProjectedLabelAnchorsFromRuntimeState(runtimeState, measuredViewport, {
    anchorForObject: (node) => functionGraphSpec.bindings.find((binding) => binding.objectId === node.id)?.anchorName ?? "center",
    objectIds: functionGraphSpec.bindings.map((binding) => binding.objectId),
    textForObject: (node) => functionGraphSpec.bindings.find((binding) => binding.objectId === node.id)?.tokenId ?? node.id
  });
  const expectedFormulaCollision = buildFormulaOverlayCollisionDiagnostics({
    formulaId: functionGraphSpec.formulas[0].id,
    projectedLabels: projectedAnchors,
    tokenCount: functionGraphSpec.formulas.reduce((sum, formula) => sum + formula.tokens.length, 0),
    viewport: measuredViewport
  });
  const snapshot = buildMathSceneEvidenceSnapshot({
    formulaLayerViewport: measuredViewport,
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimFormulaMobileViewport, true);
  assert.equal(snapshot.manimFormulaCollisionCount, expectedFormulaCollision.collisionCount);
  assert.equal(snapshot.manimFormulaCollisionLabelIds, expectedFormulaCollision.collisionLabelIds);
  assert.equal(snapshot.manimFormulaSafeAreaStatus, expectedFormulaCollision.safeAreaStatus);
  assert.equal(attributes["data-viz-manim-formula-mobile-viewport"], "true");
  assert.equal(
    attributes["data-viz-manim-formula-safe-area-summary"],
    formulaOverlayCollisionDataAttributes(expectedFormulaCollision)["data-viz-manim-formula-safe-area-summary"]
  );
});

test("records Manim Animation.begin/finish lifecycle source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, elapsedAtMidpointOfComposition("function-attention-lagged-start"));
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimAnimationLifecyclePlanId, "function-curve-attention-lift");
  assert.equal(snapshot.manimAnimationLifecycleSourceContract, ANIMATION_LIFECYCLE_SOURCE_CONTRACT);
  assert.equal(snapshot.manimAnimationLifecycleObjectId, "function-curve");
  assert.equal(snapshot.manimAnimationLifecycleTargetId, "function-curve:attention-target");
  assert.equal(snapshot.manimAnimationLifecycleAnimatingStatus, "started");
  assert.equal(snapshot.manimAnimationLifecycleBeginNodeCount, 3);
  assert.equal(snapshot.manimAnimationLifecycleBeginSourcePolicy, ANIMATION_LIFECYCLE_BEGIN_SOURCE_POLICY);
  assert.equal(snapshot.manimAnimationLifecycleCopiedNodeCount, 3);
  assert.equal(snapshot.manimAnimationLifecycleFamilyTupleCount, 3);
  assert.equal(snapshot.manimAnimationLifecycleFinalAlpha, 1);
  assert.equal(snapshot.manimAnimationLifecycleFinalInterpolateCount, 1);
  assert.equal(snapshot.manimAnimationLifecycleFinishAnimatingStatus, "finished");
  assert.equal(snapshot.manimAnimationLifecycleFinishColorRoleCount, 3);
  assert.equal(snapshot.manimAnimationLifecycleFinishNodeCount, 3);
  assert.equal(snapshot.manimAnimationLifecycleInitialAlpha, 0);
  assert.equal(snapshot.manimAnimationLifecycleInitialInterpolateCount, 1);
  assert.equal(snapshot.manimAnimationLifecyclePersistentNodeCount, 3);
  assert.equal(snapshot.manimAnimationLifecycleSuspendedUpdaterCount, 4);
  assert.equal(snapshot.manimAnimationLifecycleTimingFrameCount, 72);
  assert.equal(snapshot.manimAnimationLifecycleTimingLagRatio, 0.18);
  assert.equal(snapshot.manimAnimationLifecycleTimingRateFunction, "smooth");
  assert.equal(snapshot.manimAnimationLifecycleTimingRunTime, 1.2);
  assert.match(snapshot.manimAnimationLifecycleSignature, /^animation-lifecycle-[0-9a-f]{8}$/);
  assert.equal(
    snapshot.manimAnimationLifecycleSummary,
    "animation-lifecycle:plan=function-curve-attention-lift:object=function-curve:target=function-curve:attention-target:familyTuples=3:begin=3:finish=3:suspended=4:timing=1.200:smooth:lag=0.180:frames=72"
  );
  assert.equal(attributes["data-viz-manim-animation-lifecycle-animating-status"], "started");
  assert.equal(attributes["data-viz-manim-animation-lifecycle-begin-node-count"], "3");
  assert.equal(
    attributes["data-viz-manim-animation-lifecycle-begin-source-policy"],
    ANIMATION_LIFECYCLE_BEGIN_SOURCE_POLICY
  );
  assert.equal(attributes["data-viz-manim-animation-lifecycle-copied-node-count"], "3");
  assert.equal(attributes["data-viz-manim-animation-lifecycle-family-tuple-count"], "3");
  assert.equal(attributes["data-viz-manim-animation-lifecycle-final-alpha"], "1.000");
  assert.equal(attributes["data-viz-manim-animation-lifecycle-final-interpolate-count"], "1");
  assert.equal(attributes["data-viz-manim-animation-lifecycle-finish-animating-status"], "finished");
  assert.equal(attributes["data-viz-manim-animation-lifecycle-finish-color-role-count"], "3");
  assert.equal(attributes["data-viz-manim-animation-lifecycle-finish-node-count"], "3");
  assert.equal(attributes["data-viz-manim-animation-lifecycle-initial-alpha"], "0.000");
  assert.equal(attributes["data-viz-manim-animation-lifecycle-initial-interpolate-count"], "1");
  assert.equal(attributes["data-viz-manim-animation-lifecycle-object-id"], "function-curve");
  assert.equal(attributes["data-viz-manim-animation-lifecycle-persistent-node-count"], "3");
  assert.equal(attributes["data-viz-manim-animation-lifecycle-plan-id"], "function-curve-attention-lift");
  assert.equal(attributes["data-viz-manim-animation-lifecycle-signature"], snapshot.manimAnimationLifecycleSignature);
  assert.equal(attributes["data-viz-manim-animation-lifecycle-source-contract"], ANIMATION_LIFECYCLE_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-animation-lifecycle-summary"], snapshot.manimAnimationLifecycleSummary);
  assert.equal(attributes["data-viz-manim-animation-lifecycle-suspended-updater-count"], "4");
  assert.equal(attributes["data-viz-manim-animation-lifecycle-timing-frame-count"], "72");
  assert.equal(attributes["data-viz-manim-animation-lifecycle-timing-lag-ratio"], "0.180");
  assert.equal(attributes["data-viz-manim-animation-lifecycle-timing-rate-function"], "smooth");
  assert.equal(attributes["data-viz-manim-animation-lifecycle-timing-run-time"], "1.200");
  assert.equal(attributes["data-viz-manim-animation-lifecycle-target-id"], "function-curve:attention-target");
});

test("records Manim Transform.begin alignment and data-lock source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, elapsedAtMidpointOfComposition("function-attention-lagged-start"));
  const [animatePlan] = buildMathSceneAnimatePlans(functionGraphSpec, runtimeState);
  assert.ok(animatePlan);
  const transformBegin = buildMathTransformBeginPlan(functionGraphSpec, runtimeState, animatePlan);
  const expectedAttributes = transformBeginPlanDataAttributes(transformBegin);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimTransformBeginPlanId, "function-curve-attention-lift");
  assert.equal(snapshot.manimTransformBeginObjectId, "function-curve");
  assert.equal(snapshot.manimTransformBeginTargetId, "function-curve:attention-target");
  assert.equal(snapshot.manimTransformBeginSourcePolicy, TRANSFORM_BEGIN_SOURCE_POLICY);
  assert.equal(snapshot.manimTransformBeginAlignedEntryCount, transformBegin.alignment.entryCount);
  assert.equal(snapshot.manimTransformBeginAlignedPointPairCount, transformBegin.alignment.alignedPointPairCount);
  assert.equal(snapshot.manimTransformBeginDataLockCount, transformBegin.dataLocks.entryCount);
  assert.equal(snapshot.manimTransformBeginDataLockAlignmentSummary, transformBegin.dataLocks.alignmentSummary);
  assert.equal(snapshot.manimTransformBeginDataLockKindSummary, transformBegin.dataLocks.kindSummary);
  assert.equal(snapshot.manimTransformBeginDataLockSummary, transformBegin.dataLocks.lockSummary);
  assert.equal(snapshot.manimTransformBeginEnteringCount, transformBegin.alignment.enteringCount);
  assert.equal(snapshot.manimTransformBeginExitingCount, transformBegin.alignment.exitingCount);
  assert.equal(snapshot.manimTransformBeginFamilyPairIds, transformBegin.alignment.familyPairIds.join(",") || "none");
  assert.equal(snapshot.manimTransformBeginFamilyPairSummary, transformBegin.alignment.familyPairSummary);
  assert.equal(snapshot.manimTransformBeginLockedObjectIds, transformBegin.dataLocks.lockedObjectIds.join(",") || "none");
  assert.equal(snapshot.manimTransformBeginLockedPointCount, transformBegin.dataLocks.lockedPointCount);
  assert.equal(snapshot.manimTransformBeginMatchedCount, transformBegin.alignment.matchedCount);
  assert.equal(snapshot.manimTransformBeginMaxDepth, transformBegin.alignment.maxDepth);
  assert.equal(snapshot.manimTransformBeginMovingObjectIds, transformBegin.dataLocks.movingObjectIds.join(",") || "none");
  assert.equal(snapshot.manimTransformBeginMovingPointCount, transformBegin.dataLocks.movingPointCount);
  assert.equal(snapshot.manimTransformBeginTargetCreated, true);
  assert.equal(snapshot.manimTransformBeginTotalPointCount, transformBegin.dataLocks.totalPointCount);
  assert.equal(snapshot.manimTransformBeginTypeMismatchCount, transformBegin.alignment.typeMismatchCount);
  assert.match(snapshot.manimTransformBeginSignature, /^transform-begin-[0-9a-f]{8}$/);
  assert.equal(snapshot.manimTransformBeginSummary, summarizeMathTransformBeginPlan(transformBegin));
  assert.equal(attributes["data-viz-manim-transform-begin-aligned-entry-count"], expectedAttributes["data-viz-manim-transform-begin-aligned-entry-count"]);
  assert.equal(attributes["data-viz-manim-transform-begin-aligned-point-pair-count"], expectedAttributes["data-viz-manim-transform-begin-aligned-point-pair-count"]);
  assert.equal(attributes["data-viz-manim-transform-begin-data-lock-count"], expectedAttributes["data-viz-manim-transform-begin-data-lock-count"]);
  assert.equal(
    attributes["data-viz-manim-transform-begin-data-lock-alignment-summary"],
    expectedAttributes["data-viz-manim-transform-begin-data-lock-alignment-summary"]
  );
  assert.equal(attributes["data-viz-manim-transform-begin-data-lock-kind-summary"], expectedAttributes["data-viz-manim-transform-begin-data-lock-kind-summary"]);
  assert.equal(attributes["data-viz-manim-transform-begin-data-lock-summary"], expectedAttributes["data-viz-manim-transform-begin-data-lock-summary"]);
  assert.equal(attributes["data-viz-manim-transform-begin-entering-count"], expectedAttributes["data-viz-manim-transform-begin-entering-count"]);
  assert.equal(attributes["data-viz-manim-transform-begin-exiting-count"], expectedAttributes["data-viz-manim-transform-begin-exiting-count"]);
  assert.equal(attributes["data-viz-manim-transform-begin-family-pair-ids"], expectedAttributes["data-viz-manim-transform-begin-family-pair-ids"]);
  assert.equal(attributes["data-viz-manim-transform-begin-family-pair-summary"], expectedAttributes["data-viz-manim-transform-begin-family-pair-summary"]);
  assert.equal(attributes["data-viz-manim-transform-begin-locked-object-ids"], expectedAttributes["data-viz-manim-transform-begin-locked-object-ids"]);
  assert.equal(attributes["data-viz-manim-transform-begin-locked-point-count"], expectedAttributes["data-viz-manim-transform-begin-locked-point-count"]);
  assert.equal(attributes["data-viz-manim-transform-begin-matched-count"], expectedAttributes["data-viz-manim-transform-begin-matched-count"]);
  assert.equal(attributes["data-viz-manim-transform-begin-max-depth"], expectedAttributes["data-viz-manim-transform-begin-max-depth"]);
  assert.equal(attributes["data-viz-manim-transform-begin-moving-object-ids"], expectedAttributes["data-viz-manim-transform-begin-moving-object-ids"]);
  assert.equal(attributes["data-viz-manim-transform-begin-moving-point-count"], expectedAttributes["data-viz-manim-transform-begin-moving-point-count"]);
  assert.equal(attributes["data-viz-manim-transform-begin-object-id"], "function-curve");
  assert.equal(attributes["data-viz-manim-transform-begin-plan-id"], "function-curve-attention-lift");
  assert.equal(attributes["data-viz-manim-transform-begin-signature"], snapshot.manimTransformBeginSignature);
  assert.equal(attributes["data-viz-manim-transform-begin-source-family-ids"], expectedAttributes["data-viz-manim-transform-begin-source-family-ids"]);
  assert.equal(attributes["data-viz-manim-transform-begin-source-policy"], TRANSFORM_BEGIN_SOURCE_POLICY);
  assert.equal(attributes["data-viz-manim-transform-begin-summary"], snapshot.manimTransformBeginSummary);
  assert.equal(attributes["data-viz-manim-transform-begin-target-created"], "true");
  assert.equal(attributes["data-viz-manim-transform-begin-target-family-ids"], expectedAttributes["data-viz-manim-transform-begin-target-family-ids"]);
  assert.equal(attributes["data-viz-manim-transform-begin-target-id"], "function-curve:attention-target");
  assert.equal(attributes["data-viz-manim-transform-begin-total-point-count"], expectedAttributes["data-viz-manim-transform-begin-total-point-count"]);
  assert.equal(attributes["data-viz-manim-transform-begin-type-mismatch-count"], expectedAttributes["data-viz-manim-transform-begin-type-mismatch-count"]);
});

test("records transform path-function source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const sceneWithArcPath: MathSceneSpec = {
    ...functionGraphSpec,
    animationPlans: functionGraphSpec.animationPlans?.map((plan, index) => index === 0
      ? { ...plan, path: { type: "arc", angleRadians: Math.PI / 2, axis: [0, 0, 1] as Vec3 } }
      : plan)
  };
  const runtimeState = buildMathSceneRuntimeState(sceneWithArcPath, elapsedAtMidpointOfComposition("function-attention-lagged-start"));
  const expectedCatalog = buildTransformPathFunctionCatalog({
    plans: sceneWithArcPath.animationPlans,
    sceneId: sceneWithArcPath.sceneId
  });
  const expectedAttributes = transformPathFunctionCatalogDataAttributes(expectedCatalog);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: sceneWithArcPath
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimTransformPathPlanCount, expectedCatalog.animationPlanCount);
  assert.deepEqual(snapshot.manimTransformPathEntries, expectedCatalog.entries);
  assert.equal(snapshot.manimTransformPathAuthoredCount, expectedCatalog.authoredPathCount);
  assert.equal(snapshot.manimTransformPathArcCount, expectedCatalog.arcPathCount);
  assert.equal(snapshot.manimTransformPathArcAngleRange, "1.5708..1.5708rad");
  assert.equal(snapshot.manimTransformPathArcAxisSummary, "function-curve=0.000,0.000,1.000");
  assert.equal(snapshot.manimTransformPathSampleAlpha, 0.5);
  assert.equal(snapshot.manimTransformPathSampledCount, 2);
  assert.match(snapshot.manimTransformPathSampledMidpoints, /^function-curve=-?\d+\.\d{3},-?\d+\.\d{3},-?\d+\.\d{3};moving-probe=/);
  assert.match(snapshot.manimTransformPathMidpointDeviationSummary, /^function-curve=\d+\.\d{4};moving-probe=0\.0000$/);
  assert.match(snapshot.manimTransformPathArcMidpointDeviationRange, /^\d+\.\d{4}\.\.\d+\.\d{4}$/);
  assert.equal(snapshot.manimTransformPathDegenerateArcCount, 0);
  assert.equal(snapshot.manimTransformPathStraightCount, expectedCatalog.straightPathCount);
  assert.equal(snapshot.manimTransformPathObjectIds, "function-curve,moving-probe");
  assert.equal(snapshot.manimTransformPathPointlikeFieldPolicy, TRANSFORM_PATH_POINTLIKE_FIELD_POLICY);
  assert.equal(snapshot.manimTransformPathSummaries, "arc(1.5708rad,z+),straight");
  assert.equal(snapshot.manimTransformPathNonPointFieldPolicy, TRANSFORM_PATH_NON_POINT_FIELD_POLICY);
  assert.equal(snapshot.manimTransformPathSourceContract, TRANSFORM_PATH_FUNCTION_SOURCE_CONTRACT);
  assert.equal(
    snapshot.manimTransformPathSummary,
    "transformPaths:mais-manim-function-graph:plans=2:authored=1:arc=1:straight=1:objects=function-curve,moving-probe:paths=arc(1.5708rad,z+),straight"
  );
  assert.equal(attributes["data-viz-manim-transform-path-plan-count"], expectedAttributes["data-viz-manim-transform-path-plan-count"]);
  assert.equal(
    attributes["data-viz-manim-transform-path-authored-count"],
    expectedAttributes["data-viz-manim-transform-path-authored-count"]
  );
  assert.equal(attributes["data-viz-manim-transform-path-arc-count"], expectedAttributes["data-viz-manim-transform-path-arc-count"]);
  assert.equal(
    attributes["data-viz-manim-transform-path-arc-angle-range"],
    expectedAttributes["data-viz-manim-transform-path-arc-angle-range"]
  );
  assert.equal(
    attributes["data-viz-manim-transform-path-arc-axis-summary"],
    expectedAttributes["data-viz-manim-transform-path-arc-axis-summary"]
  );
  assert.equal(attributes["data-viz-manim-transform-path-sample-alpha"], "0.500");
  assert.equal(attributes["data-viz-manim-transform-path-sampled-count"], "2");
  assert.equal(attributes["data-viz-manim-transform-path-sampled-midpoints"], snapshot.manimTransformPathSampledMidpoints);
  assert.equal(
    attributes["data-viz-manim-transform-path-midpoint-deviation-summary"],
    snapshot.manimTransformPathMidpointDeviationSummary
  );
  assert.equal(
    attributes["data-viz-manim-transform-path-arc-midpoint-deviation-range"],
    snapshot.manimTransformPathArcMidpointDeviationRange
  );
  assert.equal(
    attributes["data-viz-manim-transform-path-degenerate-arc-count"],
    expectedAttributes["data-viz-manim-transform-path-degenerate-arc-count"]
  );
  assert.equal(
    attributes["data-viz-manim-transform-path-straight-count"],
    expectedAttributes["data-viz-manim-transform-path-straight-count"]
  );
  assert.equal(attributes["data-viz-manim-transform-path-object-ids"], expectedAttributes["data-viz-manim-transform-path-object-ids"]);
  assert.equal(
    attributes["data-viz-manim-transform-path-pointlike-field-policy"],
    expectedAttributes["data-viz-manim-transform-path-pointlike-field-policy"]
  );
  assert.equal(attributes["data-viz-manim-transform-path-summaries"], expectedAttributes["data-viz-manim-transform-path-summaries"]);
  assert.equal(
    attributes["data-viz-manim-transform-path-non-point-field-policy"],
    expectedAttributes["data-viz-manim-transform-path-non-point-field-policy"]
  );
  assert.equal(
    attributes["data-viz-manim-transform-path-source-contract"],
    expectedAttributes["data-viz-manim-transform-path-source-contract"]
  );
  assert.equal(attributes["data-viz-manim-transform-path-summary"], expectedAttributes["data-viz-manim-transform-path-summary"]);
});

test("records scene-level rate-function source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const expectedCatalog = buildRateFunctionCatalog({
    sceneId: functionGraphSpec.sceneId,
    timeline: functionGraphSpec.timeline
  });
  const expectedAttributes = rateFunctionCatalogDataAttributes(expectedCatalog);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimRateFunctionStepCount, expectedCatalog.stepCount);
  assert.deepEqual(snapshot.manimRateFunctionEntries, expectedCatalog.entries);
  assert.equal(snapshot.manimRateFunctionLinearCount, 2);
  assert.equal(snapshot.manimRateFunctionSmoothCount, 4);
  assert.equal(snapshot.manimRateFunctionLinearDuration, 4.4);
  assert.equal(snapshot.manimRateFunctionSmoothDuration, 6.44);
  assert.equal(snapshot.manimRateFunctionIds, "linear,smooth");
  assert.equal(snapshot.manimRateFunctionSourceContract, RATE_FUNCTION_SOURCE_CONTRACT);
  assert.equal(snapshot.manimRateFunctionAlphaPolicy, RATE_FUNCTION_ALPHA_POLICY);
  assert.equal(
    snapshot.manimRateFunctionStepTypes,
    "revealCurve,moveAlongPath,sweepParameter,animationComposition,cameraTo,wait"
  );
  assert.equal(
    snapshot.manimRateFunctionSummary,
    "rateFunctions:mais-manim-function-graph:steps=6:linear=2/4.400:smooth=4/6.440:ids=linear,smooth:types=revealCurve,moveAlongPath,sweepParameter,animationComposition,cameraTo,wait"
  );
  assert.equal(attributes["data-viz-manim-rate-function-step-count"], expectedAttributes["data-viz-manim-rate-function-step-count"]);
  assert.equal(attributes["data-viz-manim-rate-function-linear-count"], expectedAttributes["data-viz-manim-rate-function-linear-count"]);
  assert.equal(attributes["data-viz-manim-rate-function-smooth-count"], expectedAttributes["data-viz-manim-rate-function-smooth-count"]);
  assert.equal(
    attributes["data-viz-manim-rate-function-linear-duration"],
    expectedAttributes["data-viz-manim-rate-function-linear-duration"]
  );
  assert.equal(
    attributes["data-viz-manim-rate-function-smooth-duration"],
    expectedAttributes["data-viz-manim-rate-function-smooth-duration"]
  );
  assert.equal(attributes["data-viz-manim-rate-function-ids"], expectedAttributes["data-viz-manim-rate-function-ids"]);
  assert.equal(
    attributes["data-viz-manim-rate-function-step-types"],
    expectedAttributes["data-viz-manim-rate-function-step-types"]
  );
  assert.equal(
    attributes["data-viz-manim-rate-function-source-contract"],
    expectedAttributes["data-viz-manim-rate-function-source-contract"]
  );
  assert.equal(
    attributes["data-viz-manim-rate-function-alpha-policy"],
    expectedAttributes["data-viz-manim-rate-function-alpha-policy"]
  );
  assert.equal(attributes["data-viz-manim-rate-function-summary"], expectedAttributes["data-viz-manim-rate-function-summary"]);
});

test("records scene-level lag-ratio source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const expectedCatalog = buildLagRatioCatalog({
    animationCompositions: functionGraphSpec.animationCompositions,
    animationPlans: functionGraphSpec.animationPlans,
    sceneId: functionGraphSpec.sceneId
  });
  const expectedAttributes = lagRatioCatalogDataAttributes(expectedCatalog);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimLagRatioAnimationPlanCount, 2);
  assert.deepEqual(snapshot.manimLagRatioEntries, expectedCatalog.entries);
  assert.equal(snapshot.manimLagRatioCompositionCount, 1);
  assert.equal(snapshot.manimLagRatioAuthoredCount, 2);
  assert.equal(snapshot.manimLagRatioNonZeroCount, 2);
  assert.equal(snapshot.manimLagRatioZeroCount, 1);
  assert.equal(snapshot.manimLagRatioMax, 0.2);
  assert.equal(snapshot.manimLagRatioObjectIds, "function-curve,moving-probe");
  assert.equal(snapshot.manimLagRatioCompositionIds, "function-attention-lagged-start");
  assert.equal(snapshot.manimLagRatioSourceContract, LAG_RATIO_SOURCE_CONTRACT);
  assert.equal(snapshot.manimLagRatioSubAlphaPolicy, LAG_RATIO_SUB_ALPHA_POLICY);
  assert.equal(
    snapshot.manimLagRatioSummary,
    "lagRatios:mais-manim-function-graph:plans=2:compositions=1:authored=2:nonzero=2:zero=1:max=0.200:objects=function-curve,moving-probe:compositions=function-attention-lagged-start"
  );
  assert.equal(
    attributes["data-viz-manim-lag-ratio-animation-plan-count"],
    expectedAttributes["data-viz-manim-lag-ratio-animation-plan-count"]
  );
  assert.equal(
    attributes["data-viz-manim-lag-ratio-composition-count"],
    expectedAttributes["data-viz-manim-lag-ratio-composition-count"]
  );
  assert.equal(
    attributes["data-viz-manim-lag-ratio-authored-count"],
    expectedAttributes["data-viz-manim-lag-ratio-authored-count"]
  );
  assert.equal(
    attributes["data-viz-manim-lag-ratio-nonzero-count"],
    expectedAttributes["data-viz-manim-lag-ratio-nonzero-count"]
  );
  assert.equal(
    attributes["data-viz-manim-lag-ratio-zero-count"],
    expectedAttributes["data-viz-manim-lag-ratio-zero-count"]
  );
  assert.equal(attributes["data-viz-manim-lag-ratio-max"], expectedAttributes["data-viz-manim-lag-ratio-max"]);
  assert.equal(
    attributes["data-viz-manim-lag-ratio-object-ids"],
    expectedAttributes["data-viz-manim-lag-ratio-object-ids"]
  );
  assert.equal(
    attributes["data-viz-manim-lag-ratio-composition-ids"],
    expectedAttributes["data-viz-manim-lag-ratio-composition-ids"]
  );
  assert.equal(
    attributes["data-viz-manim-lag-ratio-source-contract"],
    expectedAttributes["data-viz-manim-lag-ratio-source-contract"]
  );
  assert.equal(
    attributes["data-viz-manim-lag-ratio-sub-alpha-policy"],
    expectedAttributes["data-viz-manim-lag-ratio-sub-alpha-policy"]
  );
  assert.equal(attributes["data-viz-manim-lag-ratio-summary"], expectedAttributes["data-viz-manim-lag-ratio-summary"]);
});

test("records Manim updater execution source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, elapsedAtMidpointOfComposition("function-attention-lagged-start"));
  const updaterExecution = buildMathUpdaterExecutionPlan(runtimeState);
  const expectedAttributes = updaterExecutionPlanDataAttributes(updaterExecution);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimUpdaterExecutionActiveCallSequence, updaterExecution.activeCallSequence.join(">") || "none");
  assert.equal(snapshot.manimUpdaterExecutionActiveCount, updaterExecution.activeUpdaterCount);
  assert.deepEqual(snapshot.manimUpdaterExecutionActiveUpdaterIds, updaterExecution.activeUpdaterIds);
  assert.equal(snapshot.manimUpdaterExecutionDependencyCount, updaterExecution.dependencyUpdaterCount);
  assert.equal(snapshot.manimUpdaterExecutionDtAwareCount, updaterExecution.dtAwareUpdaterCount);
  assert.equal(snapshot.manimUpdaterExecutionFamilyPaths, updaterExecution.familyPaths.join("|") || "none");
  assert.equal(snapshot.manimUpdaterExecutionFamilyTraversalObjectIds, updaterExecution.familyTraversalObjectIds.join(",") || "none");
  assert.equal(snapshot.manimUpdaterExecutionFamilyTraversalSummary, updaterExecution.familyTraversalSummary);
  assert.equal(snapshot.manimUpdaterExecutionIdleObjectIds, updaterExecution.idleTraversalObjectIds.join(",") || "none");
  assert.equal(snapshot.manimUpdaterExecutionMaxDepth, updaterExecution.maxDepth);
  assert.equal(snapshot.manimUpdaterExecutionObjectIds, updaterExecution.traversalObjectIds.join(",") || "none");
  assert.equal(snapshot.manimUpdaterExecutionOrderSummary, updaterExecution.orderSummary);
  assert.equal(snapshot.manimUpdaterExecutionPhase, updaterExecution.phase);
  assert.equal(snapshot.manimUpdaterExecutionRecursiveOrder, updaterExecution.recursiveOrder);
  assert.deepEqual(snapshot.manimUpdaterExecutionRows, updaterExecution.rows);
  assert.equal(snapshot.manimUpdaterExecutionRowCount, updaterExecution.rowCount);
  assert.match(snapshot.manimUpdaterExecutionSignature, /^updater-execution-[0-9a-f]{8}$/);
  assert.equal(snapshot.manimUpdaterExecutionSourceContract, expectedAttributes["data-viz-manim-updater-execution-source-contract"]);
  assert.equal(snapshot.manimUpdaterExecutionSummary, summarizeMathUpdaterExecutionPlan(updaterExecution));
  assert.equal(snapshot.manimUpdaterExecutionSuspendedCount, updaterExecution.suspendedUpdaterCount);
  assert.deepEqual(snapshot.manimUpdaterExecutionSuspendedUpdaterIds, updaterExecution.suspendedUpdaterIds);
  assert.equal(snapshot.manimUpdaterExecutionTimelineCount, updaterExecution.timelineUpdaterCount);
  assert.equal(snapshot.manimUpdaterExecutionUpdaterCount, updaterExecution.totalUpdaterCount);
  const functionCurveUpdaterRow = snapshot.manimUpdaterExecutionRows.find((row) => row.objectId === "function-curve");
  assert.ok(functionCurveUpdaterRow);
  assert.equal(functionCurveUpdaterRow.familyPath, "function-curve");
  assert.ok(functionCurveUpdaterRow.updaterIds.length > 0);
  assert.equal(
    attributes["data-viz-manim-updater-execution-active-call-sequence"],
    expectedAttributes["data-viz-manim-updater-execution-active-call-sequence"]
  );
  assert.equal(attributes["data-viz-manim-updater-execution-active-count"], expectedAttributes["data-viz-manim-updater-execution-active-count"]);
  assert.equal(attributes["data-viz-manim-updater-execution-dependency-count"], expectedAttributes["data-viz-manim-updater-execution-dependency-count"]);
  assert.equal(attributes["data-viz-manim-updater-execution-dt-aware-count"], expectedAttributes["data-viz-manim-updater-execution-dt-aware-count"]);
  assert.equal(attributes["data-viz-manim-updater-execution-family-paths"], expectedAttributes["data-viz-manim-updater-execution-family-paths"]);
  assert.equal(
    attributes["data-viz-manim-updater-execution-family-traversal-object-ids"],
    expectedAttributes["data-viz-manim-updater-execution-family-traversal-object-ids"]
  );
  assert.equal(
    attributes["data-viz-manim-updater-execution-family-traversal-summary"],
    expectedAttributes["data-viz-manim-updater-execution-family-traversal-summary"]
  );
  assert.equal(attributes["data-viz-manim-updater-execution-idle-object-ids"], expectedAttributes["data-viz-manim-updater-execution-idle-object-ids"]);
  assert.equal(attributes["data-viz-manim-updater-execution-max-depth"], expectedAttributes["data-viz-manim-updater-execution-max-depth"]);
  assert.equal(attributes["data-viz-manim-updater-execution-object-ids"], expectedAttributes["data-viz-manim-updater-execution-object-ids"]);
  assert.equal(attributes["data-viz-manim-updater-execution-order-summary"], expectedAttributes["data-viz-manim-updater-execution-order-summary"]);
  assert.equal(attributes["data-viz-manim-updater-execution-phase"], expectedAttributes["data-viz-manim-updater-execution-phase"]);
  assert.equal(attributes["data-viz-manim-updater-execution-recursive-order"], expectedAttributes["data-viz-manim-updater-execution-recursive-order"]);
  assert.equal(attributes["data-viz-manim-updater-execution-row-count"], expectedAttributes["data-viz-manim-updater-execution-row-count"]);
  assert.equal(attributes["data-viz-manim-updater-execution-signature"], snapshot.manimUpdaterExecutionSignature);
  assert.equal(
    attributes["data-viz-manim-updater-execution-source-contract"],
    expectedAttributes["data-viz-manim-updater-execution-source-contract"]
  );
  assert.equal(attributes["data-viz-manim-updater-execution-summary"], snapshot.manimUpdaterExecutionSummary);
  assert.equal(attributes["data-viz-manim-updater-execution-suspended-count"], expectedAttributes["data-viz-manim-updater-execution-suspended-count"]);
  assert.equal(attributes["data-viz-manim-updater-execution-timeline-count"], expectedAttributes["data-viz-manim-updater-execution-timeline-count"]);
  assert.equal(attributes["data-viz-manim-updater-execution-updater-count"], expectedAttributes["data-viz-manim-updater-execution-updater-count"]);
});

test("records Manim updater signature source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, elapsedAtMidpointOfComposition("function-attention-lagged-start"));
  const updaterSignature = buildMathUpdaterSignaturePlan(runtimeState.updaters);
  const expectedAttributes = updaterSignatureDataAttributes(updaterSignature);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimUpdaterSignatureCount, updaterSignature.totalUpdaterCount);
  assert.equal(snapshot.manimUpdaterSignatureCallSignatures, updaterSignature.callSignatures.join("|") || "none");
  assert.equal(snapshot.manimUpdaterSignatureDependencyCount, updaterSignature.dependencyUpdaterIds.length);
  assert.equal(snapshot.manimUpdaterSignatureDependencyIds, updaterSignature.dependencyUpdaterIds.join(",") || "none");
  assert.equal(snapshot.manimUpdaterSignatureDtAwareCount, updaterSignature.dtAwareUpdaterIds.length);
  assert.equal(snapshot.manimUpdaterSignatureDtAwareIds, updaterSignature.dtAwareUpdaterIds.join(",") || "none");
  assert.deepEqual(snapshot.manimUpdaterSignatureEntries, updaterSignature.entries);
  assert.equal(snapshot.manimUpdaterSignatureReceivesDeltaSecondsIds, updaterSignature.receivesDeltaSecondsIds.join(",") || "none");
  assert.equal(snapshot.manimUpdaterSignatureReceivesTimelineProgressIds, updaterSignature.receivesTimelineProgressIds.join(",") || "none");
  assert.match(snapshot.manimUpdaterSignatureSignature, /^updater-signature-[0-9a-f]{8}$/);
  assert.equal(snapshot.manimUpdaterSignatureSourceSummary, updaterSignature.sourceSummary);
  assert.equal(snapshot.manimUpdaterSignatureSummary, summarizeMathUpdaterSignaturePlan(updaterSignature));
  assert.equal(snapshot.manimUpdaterSignatureTimelineCount, updaterSignature.timelineUpdaterIds.length);
  assert.equal(snapshot.manimUpdaterSignatureTimelineIds, updaterSignature.timelineUpdaterIds.join(",") || "none");
  assert.equal(attributes["data-viz-manim-updater-signature-count"], expectedAttributes["data-viz-manim-updater-signature-count"]);
  assert.equal(attributes["data-viz-manim-updater-signature-call-signatures"], expectedAttributes["data-viz-manim-updater-signature-call-signatures"]);
  assert.equal(attributes["data-viz-manim-updater-signature-dependency-count"], expectedAttributes["data-viz-manim-updater-signature-dependency-count"]);
  assert.equal(attributes["data-viz-manim-updater-signature-dependency-ids"], expectedAttributes["data-viz-manim-updater-signature-dependency-ids"]);
  assert.equal(attributes["data-viz-manim-updater-signature-dt-aware-count"], expectedAttributes["data-viz-manim-updater-signature-dt-aware-count"]);
  assert.equal(attributes["data-viz-manim-updater-signature-dt-aware-ids"], expectedAttributes["data-viz-manim-updater-signature-dt-aware-ids"]);
  assert.equal(attributes["data-viz-manim-updater-signature-receives-dt-ids"], expectedAttributes["data-viz-manim-updater-signature-receives-dt-ids"]);
  assert.equal(attributes["data-viz-manim-updater-signature-receives-timeline-ids"], expectedAttributes["data-viz-manim-updater-signature-receives-timeline-ids"]);
  assert.equal(attributes["data-viz-manim-updater-signature-signature"], snapshot.manimUpdaterSignatureSignature);
  assert.equal(attributes["data-viz-manim-updater-signature-source-summary"], expectedAttributes["data-viz-manim-updater-signature-source-summary"]);
  assert.equal(attributes["data-viz-manim-updater-signature-summary"], snapshot.manimUpdaterSignatureSummary);
  assert.equal(attributes["data-viz-manim-updater-signature-timeline-count"], expectedAttributes["data-viz-manim-updater-signature-timeline-count"]);
  assert.equal(attributes["data-viz-manim-updater-signature-timeline-ids"], expectedAttributes["data-viz-manim-updater-signature-timeline-ids"]);
});

test("records Manim Scene.update_frame source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 3);
  const renderGroupIds = runtimeState.sceneGraph.summary.renderGroupIds === "none"
    ? []
    : runtimeState.sceneGraph.summary.renderGroupIds.split(",");
  const updateFramePlan = buildSceneUpdateFramePlan({
    dtSeconds: 0.25,
    forceDraw: runtimeState.updatePolicy.forceDraw,
    renderGroupIds,
    sceneTimeSeconds: runtimeState.timeline.elapsedSeconds,
    skipAnimations: runtimeState.updatePolicy.skipAnimations
  });
  const expectedAttributes = sceneUpdateFrameDataAttributes(updateFramePlan);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimUpdateFrameAction, updateFramePlan.action);
  assert.equal(snapshot.manimUpdateFrameCallsCameraCapture, updateFramePlan.callsCameraCapture);
  assert.equal(snapshot.manimUpdateFrameCallsIncrementTime, updateFramePlan.callsIncrementTime);
  assert.equal(snapshot.manimUpdateFrameCallsUpdateMobjects, updateFramePlan.callsUpdateMobjects);
  assert.equal(snapshot.manimUpdateFrameCallsWindowDispatchEvents, updateFramePlan.callsWindowDispatchEvents);
  assert.equal(snapshot.manimUpdateFrameDtSeconds, updateFramePlan.dtSeconds);
  assert.equal(snapshot.manimUpdateFrameForceDraw, updateFramePlan.forceDraw);
  assert.equal(snapshot.manimUpdateFrameFramePolicy, SCENE_UPDATE_FRAME_FRAME_POLICY);
  assert.equal(snapshot.manimUpdateFrameRenderGroupCount, updateFramePlan.renderGroupCount);
  assert.equal(snapshot.manimUpdateFrameRenderGroupIds, updateFramePlan.capturedRenderGroupIds.join(",") || "none");
  assert.equal(snapshot.manimUpdateFrameSceneTime, updateFramePlan.nextSceneTimeSeconds);
  assert.equal(snapshot.manimUpdateFrameSkipAnimations, updateFramePlan.skipAnimations);
  assert.equal(snapshot.manimUpdateFrameSleepSeconds, updateFramePlan.windowSleepSeconds);
  assert.equal(snapshot.manimUpdateFrameSourceContract, SCENE_UPDATE_FRAME_SOURCE_CONTRACT);
  assert.equal(snapshot.manimUpdateFrameSummary, updateFramePlan.summary);
  assert.equal(snapshot.manimUpdateFrameUpdateMobjectsDtSeconds, updateFramePlan.updateMobjectsDtSeconds);
  assert.equal(attributes["data-viz-manim-update-frame-action"], expectedAttributes["data-viz-manim-update-frame-action"]);
  assert.equal(attributes["data-viz-manim-update-frame-capture"], expectedAttributes["data-viz-manim-update-frame-capture"]);
  assert.equal(attributes["data-viz-manim-update-frame-dispatch-events"], expectedAttributes["data-viz-manim-update-frame-dispatch-events"]);
  assert.equal(attributes["data-viz-manim-update-frame-dt"], expectedAttributes["data-viz-manim-update-frame-dt"]);
  assert.equal(attributes["data-viz-manim-update-frame-force-draw"], expectedAttributes["data-viz-manim-update-frame-force-draw"]);
  assert.equal(attributes["data-viz-manim-update-frame-frame-policy"], expectedAttributes["data-viz-manim-update-frame-frame-policy"]);
  assert.equal(attributes["data-viz-manim-update-frame-increment-time"], expectedAttributes["data-viz-manim-update-frame-increment-time"]);
  assert.equal(attributes["data-viz-manim-update-frame-render-group-count"], expectedAttributes["data-viz-manim-update-frame-render-group-count"]);
  assert.equal(attributes["data-viz-manim-update-frame-render-group-ids"], expectedAttributes["data-viz-manim-update-frame-render-group-ids"]);
  assert.equal(attributes["data-viz-manim-update-frame-scene-time"], expectedAttributes["data-viz-manim-update-frame-scene-time"]);
  assert.equal(attributes["data-viz-manim-update-frame-skip"], expectedAttributes["data-viz-manim-update-frame-skip"]);
  assert.equal(attributes["data-viz-manim-update-frame-sleep"], expectedAttributes["data-viz-manim-update-frame-sleep"]);
  assert.equal(attributes["data-viz-manim-update-frame-source-contract"], expectedAttributes["data-viz-manim-update-frame-source-contract"]);
  assert.equal(attributes["data-viz-manim-update-frame-summary"], expectedAttributes["data-viz-manim-update-frame-summary"]);
  assert.equal(attributes["data-viz-manim-update-frame-update-mobjects"], expectedAttributes["data-viz-manim-update-frame-update-mobjects"]);
  assert.equal(attributes["data-viz-manim-update-frame-update-mobjects-dt"], expectedAttributes["data-viz-manim-update-frame-update-mobjects-dt"]);
});

test("records Manim Scene.emit_frame source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 3);
  const emitFramePlan = buildSceneEmitFramePlan({
    cameraId: runtimeState.cameraDirector.activeShotId,
    frameIndex: Math.round(runtimeState.timeline.elapsedSeconds * 60),
    progressDisplayActive: true,
    skipAnimations: runtimeState.updatePolicy.skipAnimations,
    writeToMovie: true
  });
  const expectedAttributes = sceneEmitFrameDataAttributes(emitFramePlan);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimEmitFrameCameraId, emitFramePlan.cameraId);
  assert.equal(snapshot.manimEmitFrameCallsFileWriter, emitFramePlan.callsFileWriterWriteFrame);
  assert.equal(snapshot.manimEmitFrameCalled, emitFramePlan.callsSceneEmitFrame);
  assert.equal(snapshot.manimEmitFrameFrameIndex, emitFramePlan.frameIndex);
  assert.equal(snapshot.manimEmitFrameProgressDisplayActive, emitFramePlan.progressDisplayActive);
  assert.equal(snapshot.manimEmitFrameReadsRawFbo, emitFramePlan.readsCameraRawFboData);
  assert.equal(snapshot.manimEmitFrameSkipAnimations, emitFramePlan.skipAnimations);
  assert.equal(snapshot.manimEmitFrameSourceContract, SCENE_EMIT_FRAME_SOURCE_CONTRACT);
  assert.equal(snapshot.manimEmitFrameStatus, emitFramePlan.status);
  assert.equal(snapshot.manimEmitFrameSummary, emitFramePlan.summary);
  assert.equal(snapshot.manimEmitFrameUpdatesProgressDisplay, emitFramePlan.updatesProgressDisplay);
  assert.equal(snapshot.manimEmitFrameWritePolicy, SCENE_EMIT_FRAME_WRITE_POLICY);
  assert.equal(snapshot.manimEmitFrameWritesMovieFrame, emitFramePlan.writesMovieFrame);
  assert.equal(snapshot.manimEmitFrameWriteToMovie, emitFramePlan.writeToMovie);
  assert.equal(attributes["data-viz-manim-emit-frame-camera-id"], expectedAttributes["data-viz-manim-emit-frame-camera-id"]);
  assert.equal(attributes["data-viz-manim-emit-frame-calls-file-writer"], expectedAttributes["data-viz-manim-emit-frame-calls-file-writer"]);
  assert.equal(attributes["data-viz-manim-emit-frame-called"], expectedAttributes["data-viz-manim-emit-frame-called"]);
  assert.equal(attributes["data-viz-manim-emit-frame-frame-index"], expectedAttributes["data-viz-manim-emit-frame-frame-index"]);
  assert.equal(attributes["data-viz-manim-emit-frame-progress-display"], expectedAttributes["data-viz-manim-emit-frame-progress-display"]);
  assert.equal(attributes["data-viz-manim-emit-frame-raw-fbo"], expectedAttributes["data-viz-manim-emit-frame-raw-fbo"]);
  assert.equal(attributes["data-viz-manim-emit-frame-skip"], expectedAttributes["data-viz-manim-emit-frame-skip"]);
  assert.equal(attributes["data-viz-manim-emit-frame-source-contract"], expectedAttributes["data-viz-manim-emit-frame-source-contract"]);
  assert.equal(attributes["data-viz-manim-emit-frame-status"], expectedAttributes["data-viz-manim-emit-frame-status"]);
  assert.equal(attributes["data-viz-manim-emit-frame-summary"], expectedAttributes["data-viz-manim-emit-frame-summary"]);
  assert.equal(attributes["data-viz-manim-emit-frame-updates-progress-display"], expectedAttributes["data-viz-manim-emit-frame-updates-progress-display"]);
  assert.equal(attributes["data-viz-manim-emit-frame-write-policy"], expectedAttributes["data-viz-manim-emit-frame-write-policy"]);
  assert.equal(attributes["data-viz-manim-emit-frame-write-movie"], expectedAttributes["data-viz-manim-emit-frame-write-movie"]);
  assert.equal(attributes["data-viz-manim-emit-frame-write-to-movie"], expectedAttributes["data-viz-manim-emit-frame-write-to-movie"]);
});

test("records Manim Scene.progress_through_animations source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, elapsedAtMidpointOfComposition("function-attention-lagged-start"));
  const animatePlans = buildMathSceneAnimatePlans(functionGraphSpec, runtimeState);
  const progressThroughPlan = buildSceneProgressThroughAnimationsPlan({
    animations: animatePlans.map((plan) => ({
      animationId: plan.id,
      objectId: plan.objectId,
      runTime: plan.step.duration,
      targetCopyObjectId: `${plan.targetObjectId}:target-copy`,
      targetObjectId: plan.targetObjectId
    })),
    fps: 4,
    skipAnimations: runtimeState.updatePolicy.skipAnimations
  });
  const expectedAttributes = sceneProgressThroughAnimationsDataAttributes(progressThroughPlan);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimProgressThroughAnimationCount, progressThroughPlan.animationCount);
  assert.equal(snapshot.manimProgressThroughEmitFrameCount, progressThroughPlan.emitFrameCallCount);
  assert.equal(
    snapshot.manimProgressThroughEmitFrameStatuses,
    progressThroughPlan.frames.map((frame) => frame.emitFrame.status).join(",") || "none"
  );
  assert.equal(snapshot.manimProgressThroughFinalAlphaSummary, progressThroughPlan.finalAlphaSummary);
  assert.equal(snapshot.manimProgressThroughFinalTime, progressThroughPlan.finalTime);
  assert.equal(snapshot.manimProgressThroughFps, progressThroughPlan.fps);
  assert.equal(snapshot.manimProgressThroughFrameInterval, progressThroughPlan.frameInterval);
  assert.equal(snapshot.manimProgressThroughFramePolicy, PROGRESS_THROUGH_ANIMATIONS_FRAME_POLICY);
  assert.equal(snapshot.manimProgressThroughFrameOperationSequence, progressThroughPlan.frameOperationSequenceSummary);
  assert.equal(snapshot.manimProgressThroughFrameOrderSummary, progressThroughPlan.frameOrderSummary);
  assert.equal(snapshot.manimProgressThroughFrameCount, progressThroughPlan.frameCount);
  assert.deepEqual(snapshot.manimProgressThroughFrames, progressThroughPlan.frames);
  assert.equal(snapshot.manimProgressThroughInterpolateCount, progressThroughPlan.interpolateCallCount);
  assert.equal(snapshot.manimProgressThroughRawAlphaOvershootAnimationIds, progressThroughPlan.rawAlphaOvershootAnimationIds);
  assert.equal(snapshot.manimProgressThroughRawAlphaOvershootCount, progressThroughPlan.rawAlphaOvershootCount);
  assert.equal(snapshot.manimProgressThroughRawAlphaSequenceSummary, progressThroughPlan.rawAlphaSequenceSummary);
  assert.equal(snapshot.manimProgressThroughRunTime, progressThroughPlan.runTime);
  assert.equal(snapshot.manimProgressThroughSkipAnimations, progressThroughPlan.skipAnimations);
  assert.equal(snapshot.manimProgressThroughSourceContract, PROGRESS_THROUGH_ANIMATIONS_SOURCE_CONTRACT);
  assert.equal(snapshot.manimProgressThroughSummary, progressThroughPlan.summary);
  assert.deepEqual(snapshot.manimProgressThroughTimeProgression, progressThroughPlan.timeProgression);
  assert.equal(snapshot.manimProgressThroughTimeProgressionSummary, progressThroughPlan.timeProgressionSummary);
  assert.equal(snapshot.manimProgressThroughUpdateFrameActionSummary, progressThroughPlan.updateFrameActionSummary);
  assert.equal(snapshot.manimProgressThroughUpdateFrameCount, progressThroughPlan.updateFrameCallCount);
  assert.equal(snapshot.manimProgressThroughUpdateMobjectExclusionPolicy, PROGRESS_THROUGH_ANIMATIONS_UPDATE_MOBJECTS_POLICY);
  assert.equal(snapshot.manimProgressThroughUpdateMobjectObjectDtSummary, progressThroughPlan.updateMobjectObjectDtSummary);
  assert.equal(snapshot.manimProgressThroughUpdateMobjectObjectCount, progressThroughPlan.updateMobjectObjectCallCount);
  assert.equal(snapshot.manimProgressThroughUpdateMobjectTargetSummary, progressThroughPlan.updateMobjectTargetSummary);
  assert.equal(snapshot.manimProgressThroughUpdateMobjectsCount, progressThroughPlan.updateMobjectsCallCount);
  assert.equal(snapshot.manimProgressThroughUpdateMobjectsDtSummary, progressThroughPlan.updateMobjectsDtSummary);
  assert.equal(snapshot.manimProgressThroughWrittenFrameCount, progressThroughPlan.writtenFrameCount);
  assert.equal(attributes["data-viz-manim-progress-through-animation-count"], expectedAttributes["data-viz-manim-progress-through-animation-count"]);
  assert.equal(attributes["data-viz-manim-progress-through-emit-frame-count"], expectedAttributes["data-viz-manim-progress-through-emit-frame-count"]);
  assert.equal(attributes["data-viz-manim-progress-through-emit-frame-statuses"], expectedAttributes["data-viz-manim-progress-through-emit-frame-statuses"]);
  assert.equal(attributes["data-viz-manim-progress-through-final-alpha-summary"], expectedAttributes["data-viz-manim-progress-through-final-alpha-summary"]);
  assert.equal(attributes["data-viz-manim-progress-through-final-time"], expectedAttributes["data-viz-manim-progress-through-final-time"]);
  assert.equal(attributes["data-viz-manim-progress-through-fps"], expectedAttributes["data-viz-manim-progress-through-fps"]);
  assert.equal(attributes["data-viz-manim-progress-through-frame-interval"], expectedAttributes["data-viz-manim-progress-through-frame-interval"]);
  assert.equal(attributes["data-viz-manim-progress-through-frame-policy"], expectedAttributes["data-viz-manim-progress-through-frame-policy"]);
  assert.equal(
    attributes["data-viz-manim-progress-through-frame-operation-sequence"],
    expectedAttributes["data-viz-manim-progress-through-frame-operation-sequence"]
  );
  assert.equal(attributes["data-viz-manim-progress-through-frame-order-summary"], expectedAttributes["data-viz-manim-progress-through-frame-order-summary"]);
  assert.equal(attributes["data-viz-manim-progress-through-frame-count"], expectedAttributes["data-viz-manim-progress-through-frame-count"]);
  assert.equal(attributes["data-viz-manim-progress-through-interpolate-count"], expectedAttributes["data-viz-manim-progress-through-interpolate-count"]);
  assert.equal(
    attributes["data-viz-manim-progress-through-raw-alpha-overshoot-animation-ids"],
    expectedAttributes["data-viz-manim-progress-through-raw-alpha-overshoot-animation-ids"]
  );
  assert.equal(
    attributes["data-viz-manim-progress-through-raw-alpha-overshoot-count"],
    expectedAttributes["data-viz-manim-progress-through-raw-alpha-overshoot-count"]
  );
  assert.equal(
    attributes["data-viz-manim-progress-through-raw-alpha-sequence-summary"],
    expectedAttributes["data-viz-manim-progress-through-raw-alpha-sequence-summary"]
  );
  assert.equal(attributes["data-viz-manim-progress-through-run-time"], expectedAttributes["data-viz-manim-progress-through-run-time"]);
  assert.equal(attributes["data-viz-manim-progress-through-skip"], expectedAttributes["data-viz-manim-progress-through-skip"]);
  assert.equal(
    attributes["data-viz-manim-progress-through-source-contract"],
    expectedAttributes["data-viz-manim-progress-through-source-contract"]
  );
  assert.equal(attributes["data-viz-manim-progress-through-summary"], expectedAttributes["data-viz-manim-progress-through-summary"]);
  assert.equal(
    attributes["data-viz-manim-progress-through-update-frame-action-summary"],
    expectedAttributes["data-viz-manim-progress-through-update-frame-action-summary"]
  );
  assert.equal(attributes["data-viz-manim-progress-through-update-frame-count"], expectedAttributes["data-viz-manim-progress-through-update-frame-count"]);
  assert.equal(
    attributes["data-viz-manim-progress-through-update-mobject-exclusion-policy"],
    expectedAttributes["data-viz-manim-progress-through-update-mobject-exclusion-policy"]
  );
  assert.equal(
    attributes["data-viz-manim-progress-through-update-mobject-object-dt-summary"],
    expectedAttributes["data-viz-manim-progress-through-update-mobject-object-dt-summary"]
  );
  assert.equal(
    attributes["data-viz-manim-progress-through-update-mobject-object-count"],
    expectedAttributes["data-viz-manim-progress-through-update-mobject-object-count"]
  );
  assert.equal(
    attributes["data-viz-manim-progress-through-update-mobject-target-summary"],
    expectedAttributes["data-viz-manim-progress-through-update-mobject-target-summary"]
  );
  assert.equal(attributes["data-viz-manim-progress-through-update-mobjects-count"], expectedAttributes["data-viz-manim-progress-through-update-mobjects-count"]);
  assert.equal(
    attributes["data-viz-manim-progress-through-update-mobjects-dt-summary"],
    expectedAttributes["data-viz-manim-progress-through-update-mobjects-dt-summary"]
  );
  assert.equal(attributes["data-viz-manim-progress-through-written-frame-count"], expectedAttributes["data-viz-manim-progress-through-written-frame-count"]);
});

test("records Manim Scene.play compilation source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, elapsedAtMidpointOfComposition("function-attention-lagged-start"));
  const animatePlans = buildMathSceneAnimatePlans(functionGraphSpec, runtimeState);
  const compositionStep = functionGraphSpec.timeline.find((step) => step.type === "animationComposition");
  const composition = functionGraphSpec.animationCompositions?.find((entry) => entry.id === compositionStep?.compositionId);
  assert.ok(compositionStep);
  assert.ok(composition);
  const playCompilationPlan = buildScenePlayCompilationPlan({
    lagRatio: composition.lagRatio,
    protoAnimations: animatePlans.map((plan) => ({
      animationId: plan.id,
      kind: "builder",
      lagRatio: plan.step.lagRatio,
      objectId: plan.objectId,
      runTime: plan.step.duration,
      timeSpan: [0, plan.step.duration]
    })),
    runTime: compositionStep.duration
  });
  const expectedAttributes = scenePlayCompilationDataAttributes(playCompilationPlan);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimPlayCompilationAnimationCount, playCompilationPlan.animationCount);
  assert.equal(snapshot.manimPlayCompilationBuilderCount, playCompilationPlan.rows.filter((row) => row.kind === "builder" && row.valid).length);
  assert.equal(
    (snapshot as { manimPlayCompilationCallOrder?: string }).manimPlayCompilationCallOrder,
    (playCompilationPlan as { callOrderSummary?: string }).callOrderSummary
  );
  assert.equal((snapshot as { manimPlayCompilationCallOrderReady?: boolean }).manimPlayCompilationCallOrderReady, true);
  assert.equal(snapshot.manimPlayCompilationErrorMessageSummary, playCompilationPlan.errorMessageSummary);
  assert.equal(snapshot.manimPlayCompilationInvalidCount, playCompilationPlan.invalidCount);
  assert.equal(snapshot.manimPlayCompilationPipeline, expectedAttributes["data-viz-manim-play-compilation-pipeline"]);
  assert.equal(snapshot.manimPlayCompilationPreparePolicy, SCENE_PLAY_COMPILATION_PREPARE_POLICY);
  assert.equal(snapshot.manimPlayCompilationPreparedIds, playCompilationPlan.preparedAnimationIds.join(",") || "none");
  assert.equal(snapshot.manimPlayCompilationProtoCount, playCompilationPlan.protoAnimationCount);
  assert.deepEqual(snapshot.manimPlayCompilationRows, playCompilationPlan.rows);
  assert.equal(snapshot.manimPlayCompilationRunTime, playCompilationPlan.maxRunTime);
  assert.equal(snapshot.manimPlayCompilationSourceContract, SCENE_PLAY_COMPILATION_SOURCE_CONTRACT);
  assert.equal(snapshot.manimPlayCompilationSummary, playCompilationPlan.summary);
  assert.equal(snapshot.manimPlayCompilationUpdateRateCount, playCompilationPlan.updateRateInfoCallCount);
  assert.equal(snapshot.manimPlayCompilationWarningMessage, playCompilationPlan.warningMessage ?? "none");
  assert.equal(snapshot.manimPlayCompilationWarningEmpty, playCompilationPlan.warningNoAnimations);
  assert.equal(attributes["data-viz-manim-play-compilation-animation-count"], expectedAttributes["data-viz-manim-play-compilation-animation-count"]);
  assert.equal(attributes["data-viz-manim-play-compilation-builder-count"], expectedAttributes["data-viz-manim-play-compilation-builder-count"]);
  assert.equal(attributes["data-viz-manim-play-compilation-call-order"], expectedAttributes["data-viz-manim-play-compilation-call-order"]);
  assert.equal(
    attributes["data-viz-manim-play-compilation-call-order-ready"],
    expectedAttributes["data-viz-manim-play-compilation-call-order-ready"]
  );
  assert.equal(attributes["data-viz-manim-play-compilation-error-summary"], expectedAttributes["data-viz-manim-play-compilation-error-summary"]);
  assert.equal(attributes["data-viz-manim-play-compilation-invalid-count"], expectedAttributes["data-viz-manim-play-compilation-invalid-count"]);
  assert.equal(attributes["data-viz-manim-play-compilation-pipeline"], expectedAttributes["data-viz-manim-play-compilation-pipeline"]);
  assert.equal(
    attributes["data-viz-manim-play-compilation-prepare-policy"],
    expectedAttributes["data-viz-manim-play-compilation-prepare-policy"]
  );
  assert.equal(attributes["data-viz-manim-play-compilation-prepared-ids"], expectedAttributes["data-viz-manim-play-compilation-prepared-ids"]);
  assert.equal(attributes["data-viz-manim-play-compilation-proto-count"], expectedAttributes["data-viz-manim-play-compilation-proto-count"]);
  assert.equal(attributes["data-viz-manim-play-compilation-run-time"], expectedAttributes["data-viz-manim-play-compilation-run-time"]);
  assert.equal(
    attributes["data-viz-manim-play-compilation-source-contract"],
    expectedAttributes["data-viz-manim-play-compilation-source-contract"]
  );
  assert.equal(attributes["data-viz-manim-play-compilation-summary"], expectedAttributes["data-viz-manim-play-compilation-summary"]);
  assert.equal(attributes["data-viz-manim-play-compilation-update-rate-count"], expectedAttributes["data-viz-manim-play-compilation-update-rate-count"]);
  assert.equal(attributes["data-viz-manim-play-compilation-warning-empty"], expectedAttributes["data-viz-manim-play-compilation-warning-empty"]);
  assert.equal(attributes["data-viz-manim-play-compilation-warning-message"], expectedAttributes["data-viz-manim-play-compilation-warning-message"]);
});

test("records Manim Scene.begin_animations source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, elapsedAtMidpointOfComposition("function-attention-lagged-start"));
  const animatePlans = buildMathSceneAnimatePlans(functionGraphSpec, runtimeState);
  const beginAnimationsPlan = buildSceneBeginAnimationsPlan({
    animations: animatePlans.map((plan) => ({
      animationId: plan.id,
      familyIds: [plan.objectId],
      objectId: plan.objectId,
      runTime: plan.step.duration,
      suspendMobjectUpdating: true,
      timeSpan: [0, plan.step.duration]
    })),
    sceneFamilyIds: Object.keys(runtimeState.objectGraph.byId)
  });
  const expectedAttributes = sceneBeginAnimationsDataAttributes(beginAnimationsPlan);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimBeginAnimationsAddedCount, beginAnimationsPlan.addedObjectCount);
  assert.equal(snapshot.manimBeginAnimationsAddedIds, beginAnimationsPlan.addedObjectIds.join(",") || "none");
  assert.equal(snapshot.manimBeginAnimationsBeginCount, beginAnimationsPlan.beginCallCount);
  assert.equal(snapshot.manimBeginAnimationsLifecycleSummary, beginAnimationsPlan.beginLifecycleSummary);
  assert.equal(snapshot.manimBeginAnimationsCount, beginAnimationsPlan.animationCount);
  assert.equal(snapshot.manimBeginAnimationsFamilyCountAfter, beginAnimationsPlan.sceneFamilyCountAfter);
  assert.equal(snapshot.manimBeginAnimationsFamilyCountBefore, beginAnimationsPlan.sceneFamilyCountBefore);
  assert.equal(snapshot.manimBeginAnimationsInterpolateZeroCount, beginAnimationsPlan.interpolateZeroCallCount);
  assert.equal(snapshot.manimBeginAnimationsRunTime, beginAnimationsPlan.maxRunTime);
  assert.equal(snapshot.manimBeginAnimationsSceneAddCount, beginAnimationsPlan.sceneAddCallCount);
  assert.equal(snapshot.manimBeginAnimationsSetAnimatingStatusCount, beginAnimationsPlan.setAnimatingStatusCount);
  assert.equal(snapshot.manimBeginAnimationsSourceContract, SCENE_BEGIN_ANIMATIONS_SOURCE_CONTRACT);
  assert.equal(snapshot.manimBeginAnimationsStartStatePolicy, SCENE_BEGIN_ANIMATIONS_START_STATE_POLICY);
  assert.equal(snapshot.manimBeginAnimationsStartingCopyCount, beginAnimationsPlan.startingMobjectCopyCount);
  assert.equal(snapshot.manimBeginAnimationsStartingCopyIds, beginAnimationsPlan.startingMobjectIds.join(",") || "none");
  assert.equal(snapshot.manimBeginAnimationsSummary, beginAnimationsPlan.summary);
  assert.equal(snapshot.manimBeginAnimationsSuspendCount, beginAnimationsPlan.suspendUpdatingCallCount);
  assert.deepEqual(snapshot.manimBeginAnimationsAddedFamilyIds, beginAnimationsPlan.addedFamilyIds);
  assert.deepEqual(snapshot.manimBeginAnimationsInitialSceneFamilyIds, beginAnimationsPlan.initialSceneFamilyIds);
  assert.deepEqual(snapshot.manimBeginAnimationsFinalSceneFamilyIds, beginAnimationsPlan.finalSceneFamilyIds);
  assert.deepEqual(snapshot.manimBeginAnimationsRows, beginAnimationsPlan.rows);
  assert.equal(attributes["data-viz-manim-begin-animations-added-count"], expectedAttributes["data-viz-manim-begin-animations-added-count"]);
  assert.equal(attributes["data-viz-manim-begin-animations-added-ids"], expectedAttributes["data-viz-manim-begin-animations-added-ids"]);
  assert.equal(attributes["data-viz-manim-begin-animations-begin-count"], expectedAttributes["data-viz-manim-begin-animations-begin-count"]);
  assert.equal(attributes["data-viz-manim-begin-animations-lifecycle-summary"], expectedAttributes["data-viz-manim-begin-animations-lifecycle-summary"]);
  assert.equal(attributes["data-viz-manim-begin-animations-count"], expectedAttributes["data-viz-manim-begin-animations-count"]);
  assert.equal(attributes["data-viz-manim-begin-animations-family-count-after"], expectedAttributes["data-viz-manim-begin-animations-family-count-after"]);
  assert.equal(attributes["data-viz-manim-begin-animations-family-count-before"], expectedAttributes["data-viz-manim-begin-animations-family-count-before"]);
  assert.equal(attributes["data-viz-manim-begin-animations-interpolate-zero-count"], expectedAttributes["data-viz-manim-begin-animations-interpolate-zero-count"]);
  assert.equal(attributes["data-viz-manim-begin-animations-run-time"], expectedAttributes["data-viz-manim-begin-animations-run-time"]);
  assert.equal(attributes["data-viz-manim-begin-animations-scene-add-count"], expectedAttributes["data-viz-manim-begin-animations-scene-add-count"]);
  assert.equal(
    attributes["data-viz-manim-begin-animations-set-animating-status-count"],
    expectedAttributes["data-viz-manim-begin-animations-set-animating-status-count"]
  );
  assert.equal(
    attributes["data-viz-manim-begin-animations-source-contract"],
    expectedAttributes["data-viz-manim-begin-animations-source-contract"]
  );
  assert.equal(
    attributes["data-viz-manim-begin-animations-start-state-policy"],
    expectedAttributes["data-viz-manim-begin-animations-start-state-policy"]
  );
  assert.equal(attributes["data-viz-manim-begin-animations-starting-copy-count"], expectedAttributes["data-viz-manim-begin-animations-starting-copy-count"]);
  assert.equal(attributes["data-viz-manim-begin-animations-starting-copy-ids"], expectedAttributes["data-viz-manim-begin-animations-starting-copy-ids"]);
  assert.equal(attributes["data-viz-manim-begin-animations-summary"], expectedAttributes["data-viz-manim-begin-animations-summary"]);
  assert.equal(attributes["data-viz-manim-begin-animations-suspend-count"], expectedAttributes["data-viz-manim-begin-animations-suspend-count"]);
});

test("records Manim Scene.finish_animations source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, elapsedAtMidpointOfComposition("function-attention-lagged-start"));
  const animatePlans = buildMathSceneAnimatePlans(functionGraphSpec, runtimeState);
  const finishAnimationsPlan = buildSceneFinishAnimationsPlan({
    animations: animatePlans.map((plan) => ({
      animationId: plan.id,
      mobjectWasUpdating: true,
      objectId: plan.objectId,
      runTime: plan.step.duration,
      suspendMobjectUpdating: true
    })),
    skipAnimations: runtimeState.updatePolicy.skipAnimations
  });
  const expectedAttributes = sceneFinishAnimationsDataAttributes(finishAnimationsPlan);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimFinishAnimationsCleanupCount, finishAnimationsPlan.cleanUpCallCount);
  assert.equal(snapshot.manimFinishAnimationsCleanupPolicy, SCENE_FINISH_ANIMATIONS_CLEANUP_POLICY);
  assert.equal(snapshot.manimFinishAnimationsCount, finishAnimationsPlan.animationCount);
  assert.equal(snapshot.manimFinishAnimationsFinalAlphaSummary, finishAnimationsPlan.finalAlphaSummary);
  assert.equal(snapshot.manimFinishAnimationsFinishCount, finishAnimationsPlan.finishCallCount);
  assert.equal(snapshot.manimFinishAnimationsLifecycleSummary, finishAnimationsPlan.finishLifecycleSummary);
  assert.equal(snapshot.manimFinishAnimationsRemovedCount, finishAnimationsPlan.removedObjectCount);
  assert.equal(snapshot.manimFinishAnimationsRemovedIds, finishAnimationsPlan.removedObjectIds.join(",") || "none");
  assert.equal(snapshot.manimFinishAnimationsResumeCount, finishAnimationsPlan.resumeUpdatingCallCount);
  assert.equal(snapshot.manimFinishAnimationsResumeDtSummary, finishAnimationsPlan.resumeUpdaterDtSummary);
  assert.equal(snapshot.manimFinishAnimationsResumeIds, finishAnimationsPlan.resumeObjectIds.join(",") || "none");
  assert.equal(snapshot.manimFinishAnimationsResumePolicy, SCENE_FINISH_ANIMATIONS_RESUME_POLICY);
  assert.equal(snapshot.manimFinishAnimationsRunTime, finishAnimationsPlan.runTime);
  assert.equal(snapshot.manimFinishAnimationsSceneUpdateDt, finishAnimationsPlan.sceneUpdateMobjectsDt);
  assert.equal(snapshot.manimFinishAnimationsSetAnimatingStatusFalseCount, finishAnimationsPlan.setAnimatingStatusFalseCount);
  assert.equal(snapshot.manimFinishAnimationsSkipAnimations, finishAnimationsPlan.skipAnimations);
  assert.equal(snapshot.manimFinishAnimationsSourceContract, SCENE_FINISH_ANIMATIONS_SOURCE_CONTRACT);
  assert.equal(snapshot.manimFinishAnimationsSummary, finishAnimationsPlan.summary);
  assert.deepEqual(snapshot.manimFinishAnimationsRows, finishAnimationsPlan.rows);
  assert.equal(attributes["data-viz-manim-finish-animations-cleanup-count"], expectedAttributes["data-viz-manim-finish-animations-cleanup-count"]);
  assert.equal(
    attributes["data-viz-manim-finish-animations-cleanup-policy"],
    expectedAttributes["data-viz-manim-finish-animations-cleanup-policy"]
  );
  assert.equal(attributes["data-viz-manim-finish-animations-count"], expectedAttributes["data-viz-manim-finish-animations-count"]);
  assert.equal(attributes["data-viz-manim-finish-animations-final-alpha-summary"], expectedAttributes["data-viz-manim-finish-animations-final-alpha-summary"]);
  assert.equal(attributes["data-viz-manim-finish-animations-finish-count"], expectedAttributes["data-viz-manim-finish-animations-finish-count"]);
  assert.equal(
    attributes["data-viz-manim-finish-animations-lifecycle-summary"],
    expectedAttributes["data-viz-manim-finish-animations-lifecycle-summary"]
  );
  assert.equal(attributes["data-viz-manim-finish-animations-removed-count"], expectedAttributes["data-viz-manim-finish-animations-removed-count"]);
  assert.equal(attributes["data-viz-manim-finish-animations-removed-ids"], expectedAttributes["data-viz-manim-finish-animations-removed-ids"]);
  assert.equal(attributes["data-viz-manim-finish-animations-resume-count"], expectedAttributes["data-viz-manim-finish-animations-resume-count"]);
  assert.equal(
    attributes["data-viz-manim-finish-animations-resume-dt-summary"],
    expectedAttributes["data-viz-manim-finish-animations-resume-dt-summary"]
  );
  assert.equal(attributes["data-viz-manim-finish-animations-resume-ids"], expectedAttributes["data-viz-manim-finish-animations-resume-ids"]);
  assert.equal(
    attributes["data-viz-manim-finish-animations-resume-policy"],
    expectedAttributes["data-viz-manim-finish-animations-resume-policy"]
  );
  assert.equal(attributes["data-viz-manim-finish-animations-run-time"], expectedAttributes["data-viz-manim-finish-animations-run-time"]);
  assert.equal(attributes["data-viz-manim-finish-animations-scene-update-dt"], expectedAttributes["data-viz-manim-finish-animations-scene-update-dt"]);
  assert.equal(
    attributes["data-viz-manim-finish-animations-set-animating-status-false-count"],
    expectedAttributes["data-viz-manim-finish-animations-set-animating-status-false-count"]
  );
  assert.equal(attributes["data-viz-manim-finish-animations-skip"], expectedAttributes["data-viz-manim-finish-animations-skip"]);
  assert.equal(
    attributes["data-viz-manim-finish-animations-source-contract"],
    expectedAttributes["data-viz-manim-finish-animations-source-contract"]
  );
  assert.equal(attributes["data-viz-manim-finish-animations-summary"], expectedAttributes["data-viz-manim-finish-animations-summary"]);
});

test("records Manim Scene.pre_play control source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, elapsedAtMidpointOfComposition("function-attention-lagged-start"));
  const prePlayControlPlan = buildScenePrePlayControlPlan({
    hasWindow: true,
    initialSkipAnimations: runtimeState.updatePolicy.skipAnimations,
    playCount: functionGraphSpec.timeline.length,
    playStartSeconds: playStartSecondsFor(functionGraphSpec)
  });
  const expectedAttributes = scenePrePlayControlDataAttributes(prePlayControlPlan);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimPrePlayBeginAnimationCount, prePlayControlPlan.beginAnimationCount);
  assert.equal(snapshot.manimPrePlayConstructorForcedSkip, prePlayControlPlan.constructorForcedSkip);
  assert.equal(snapshot.manimPrePlayEndScenePlay, prePlayControlPlan.endScenePlayIndex === null ? "none" : String(prePlayControlPlan.endScenePlayIndex));
  assert.equal(snapshot.manimPrePlayFinalSkipAnimations, prePlayControlPlan.finalSkipAnimations);
  assert.equal(snapshot.manimPrePlayHasWindow, prePlayControlPlan.hasWindow);
  assert.equal(snapshot.manimPrePlayPresenterHoldCount, prePlayControlPlan.presenterHoldCount);
  assert.equal(snapshot.manimPrePlayProcessedPlayCount, prePlayControlPlan.processedPlayCount);
  assert.equal(snapshot.manimPrePlaySkipGatePolicy, SCENE_PRE_PLAY_SKIP_GATE_POLICY);
  assert.equal(snapshot.manimPrePlaySourceContract, SCENE_PRE_PLAY_SOURCE_CONTRACT);
  assert.equal(snapshot.manimPrePlayStartGateCount, prePlayControlPlan.startGateCount);
  assert.equal(snapshot.manimPrePlaySummary, prePlayControlPlan.summary);
  assert.equal(snapshot.manimPrePlayTruncated, prePlayControlPlan.truncatedByEndScene);
  assert.equal(snapshot.manimPrePlayWindowClockResetCount, prePlayControlPlan.windowClockResetCount);
  assert.deepEqual(snapshot.manimPrePlayRows, prePlayControlPlan.rows);
  assert.equal(attributes["data-viz-manim-pre-play-begin-animation-count"], expectedAttributes["data-viz-manim-pre-play-begin-animation-count"]);
  assert.equal(attributes["data-viz-manim-pre-play-constructor-forced-skip"], expectedAttributes["data-viz-manim-pre-play-constructor-forced-skip"]);
  assert.equal(attributes["data-viz-manim-pre-play-end-scene-play"], expectedAttributes["data-viz-manim-pre-play-end-scene-play"]);
  assert.equal(attributes["data-viz-manim-pre-play-final-skip"], expectedAttributes["data-viz-manim-pre-play-final-skip"]);
  assert.equal(attributes["data-viz-manim-pre-play-has-window"], expectedAttributes["data-viz-manim-pre-play-has-window"]);
  assert.equal(attributes["data-viz-manim-pre-play-presenter-hold-count"], expectedAttributes["data-viz-manim-pre-play-presenter-hold-count"]);
  assert.equal(attributes["data-viz-manim-pre-play-processed-play-count"], expectedAttributes["data-viz-manim-pre-play-processed-play-count"]);
  assert.equal(
    attributes["data-viz-manim-pre-play-skip-gate-policy"],
    expectedAttributes["data-viz-manim-pre-play-skip-gate-policy"]
  );
  assert.equal(
    attributes["data-viz-manim-pre-play-source-contract"],
    expectedAttributes["data-viz-manim-pre-play-source-contract"]
  );
  assert.equal(attributes["data-viz-manim-pre-play-start-gate-count"], expectedAttributes["data-viz-manim-pre-play-start-gate-count"]);
  assert.equal(attributes["data-viz-manim-pre-play-summary"], expectedAttributes["data-viz-manim-pre-play-summary"]);
  assert.equal(attributes["data-viz-manim-pre-play-truncated"], expectedAttributes["data-viz-manim-pre-play-truncated"]);
  assert.equal(attributes["data-viz-manim-pre-play-window-clock-reset-count"], expectedAttributes["data-viz-manim-pre-play-window-clock-reset-count"]);
});

test("records Manim Scene.post_play preview source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, elapsedAtMidpointOfComposition("function-attention-lagged-start"));
  const postPlayPreviewPlan = buildScenePostPlayPreviewPlan({
    hasWindow: true,
    playCount: functionGraphSpec.timeline.length,
    previewWhileSkipping: true,
    skipAnimations: runtimeState.updatePolicy.skipAnimations
  });
  const expectedAttributes = scenePostPlayPreviewDataAttributes(postPlayPreviewPlan);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimPostPlayPreviewEndedAnimationCount, postPlayPreviewPlan.endedAnimationCount);
  assert.equal(snapshot.manimPostPlayPreviewForcedCount, postPlayPreviewPlan.forcedPreviewCount);
  assert.equal(snapshot.manimPostPlayPreviewHasWindow, postPlayPreviewPlan.hasWindow);
  assert.equal(snapshot.manimPostPlayPreviewPlayCount, postPlayPreviewPlan.playCount);
  assert.equal((snapshot as { manimPostPlayPreviewNumPlaysReady?: boolean }).manimPostPlayPreviewNumPlaysReady, true);
  assert.equal(
    (snapshot as { manimPostPlayPreviewNumPlaysSequence?: string }).manimPostPlayPreviewNumPlaysSequence,
    postPlayPreviewPlan.numPlaysSequence
  );
  assert.equal(snapshot.manimPostPlayPreviewPolicy, SCENE_POST_PLAY_PREVIEW_POLICY);
  assert.equal(snapshot.manimPostPlayPreviewPreviewWhileSkipping, postPlayPreviewPlan.previewWhileSkipping);
  assert.equal(snapshot.manimPostPlayPreviewSkipAnimations, postPlayPreviewPlan.skipAnimations);
  assert.equal(snapshot.manimPostPlayPreviewSourceContract, SCENE_POST_PLAY_SOURCE_CONTRACT);
  assert.equal(snapshot.manimPostPlayPreviewSummary, postPlayPreviewPlan.summary);
  assert.deepEqual(snapshot.manimPostPlayPreviewRows, postPlayPreviewPlan.rows);
  assert.equal(attributes["data-viz-manim-post-play-preview-end-animation-count"], expectedAttributes["data-viz-manim-post-play-preview-end-animation-count"]);
  assert.equal(attributes["data-viz-manim-post-play-preview-forced-count"], expectedAttributes["data-viz-manim-post-play-preview-forced-count"]);
  assert.equal(attributes["data-viz-manim-post-play-preview-has-window"], expectedAttributes["data-viz-manim-post-play-preview-has-window"]);
  assert.equal(attributes["data-viz-manim-post-play-preview-num-plays-ready"], expectedAttributes["data-viz-manim-post-play-preview-num-plays-ready"]);
  assert.equal(
    attributes["data-viz-manim-post-play-preview-num-plays-sequence"],
    expectedAttributes["data-viz-manim-post-play-preview-num-plays-sequence"]
  );
  assert.equal(attributes["data-viz-manim-post-play-preview-play-count"], expectedAttributes["data-viz-manim-post-play-preview-play-count"]);
  assert.equal(attributes["data-viz-manim-post-play-preview-policy"], expectedAttributes["data-viz-manim-post-play-preview-policy"]);
  assert.equal(attributes["data-viz-manim-post-play-preview-preview"], expectedAttributes["data-viz-manim-post-play-preview-preview"]);
  assert.equal(attributes["data-viz-manim-post-play-preview-skip"], expectedAttributes["data-viz-manim-post-play-preview-skip"]);
  assert.equal(
    attributes["data-viz-manim-post-play-preview-source-contract"],
    expectedAttributes["data-viz-manim-post-play-preview-source-contract"]
  );
  assert.equal(attributes["data-viz-manim-post-play-preview-summary"], expectedAttributes["data-viz-manim-post-play-preview-summary"]);
});

test("records InteractiveScene post-cell redraw source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, elapsedAtMidpointOfComposition("function-attention-lagged-start"));
  const checkpointPasteEvidence = {
    checkpointKeys: ["intro"],
    snippet: "# slope handoff\nplay(reveal_curve)\nwait(0.5)"
  };
  const postCellRedrawPlan = buildScenePostCellRedrawPlan({
    checkpointKey: "slope handoff",
    hasWindow: true,
    skipAnimations: runtimeState.updatePolicy.skipAnimations,
    snippet: checkpointPasteEvidence.snippet
  });
  const expectedAttributes = scenePostCellRedrawDataAttributes(postCellRedrawPlan);
  const snapshot = buildMathSceneEvidenceSnapshot({
    checkpointPasteEvidence,
    postCellRedrawEvidence: {
      hasWindow: true
    },
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimPostCellRedrawAction, postCellRedrawPlan.updateFrameAction);
  assert.equal(snapshot.manimPostCellRedrawCheckpointKey, postCellRedrawPlan.checkpointKey);
  assert.equal(snapshot.manimPostCellRedrawCommentCount, 1);
  assert.equal(snapshot.manimPostCellRedrawCommentLabelPolicy, SCENE_POST_CELL_COMMENT_LABEL_POLICY);
  assert.equal(snapshot.manimPostCellRedrawDtSeconds, postCellRedrawPlan.dtSeconds);
  assert.equal(snapshot.manimPostCellRedrawForceDraw, postCellRedrawPlan.forceDraw);
  assert.equal(snapshot.manimPostCellRedrawHasWindow, postCellRedrawPlan.hasWindow);
  assert.equal(snapshot.manimPostCellRedrawLineCount, postCellRedrawPlan.lineCount);
  assert.equal(snapshot.manimPostCellRedrawOperationCount, postCellRedrawPlan.operationLineCount);
  assert.equal(snapshot.manimPostCellRedrawPolicy, SCENE_POST_CELL_REDRAW_POLICY);
  assert.equal(snapshot.manimPostCellRedrawReady, postCellRedrawPlan.ready);
  assert.equal(snapshot.manimPostCellRedrawSkipAnimations, postCellRedrawPlan.skipAnimations);
  assert.equal(snapshot.manimPostCellRedrawSourceContract, SCENE_POST_CELL_REDRAW_SOURCE_CONTRACT);
  assert.equal(snapshot.manimPostCellRedrawSourceLabel, "# slope handoff");
  assert.equal(snapshot.manimPostCellRedrawSummary, postCellRedrawPlan.summary);
  assert.equal(attributes["data-viz-manim-post-cell-redraw-action"], expectedAttributes["data-viz-manim-post-cell-redraw-action"]);
  assert.equal(attributes["data-viz-manim-post-cell-redraw-checkpoint-key"], expectedAttributes["data-viz-manim-post-cell-redraw-checkpoint-key"]);
  assert.equal(attributes["data-viz-manim-post-cell-redraw-comment-count"], expectedAttributes["data-viz-manim-post-cell-redraw-comment-count"]);
  assert.equal(
    attributes["data-viz-manim-post-cell-redraw-comment-label-policy"],
    expectedAttributes["data-viz-manim-post-cell-redraw-comment-label-policy"]
  );
  assert.equal(attributes["data-viz-manim-post-cell-redraw-dt"], expectedAttributes["data-viz-manim-post-cell-redraw-dt"]);
  assert.equal(attributes["data-viz-manim-post-cell-redraw-force-draw"], expectedAttributes["data-viz-manim-post-cell-redraw-force-draw"]);
  assert.equal(attributes["data-viz-manim-post-cell-redraw-has-window"], expectedAttributes["data-viz-manim-post-cell-redraw-has-window"]);
  assert.equal(attributes["data-viz-manim-post-cell-redraw-line-count"], expectedAttributes["data-viz-manim-post-cell-redraw-line-count"]);
  assert.equal(
    attributes["data-viz-manim-post-cell-redraw-operation-count"],
    expectedAttributes["data-viz-manim-post-cell-redraw-operation-count"]
  );
  assert.equal(attributes["data-viz-manim-post-cell-redraw-policy"], expectedAttributes["data-viz-manim-post-cell-redraw-policy"]);
  assert.equal(attributes["data-viz-manim-post-cell-redraw-ready"], expectedAttributes["data-viz-manim-post-cell-redraw-ready"]);
  assert.equal(attributes["data-viz-manim-post-cell-redraw-skip"], expectedAttributes["data-viz-manim-post-cell-redraw-skip"]);
  assert.equal(
    attributes["data-viz-manim-post-cell-redraw-source-contract"],
    expectedAttributes["data-viz-manim-post-cell-redraw-source-contract"]
  );
  assert.equal(attributes["data-viz-manim-post-cell-redraw-source-label"], expectedAttributes["data-viz-manim-post-cell-redraw-source-label"]);
  assert.equal(attributes["data-viz-manim-post-cell-redraw-summary"], expectedAttributes["data-viz-manim-post-cell-redraw-summary"]);
});

test("records InteractiveScene shortcut catalog source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, elapsedAtMidpointOfComposition("function-attention-lagged-start"));
  const shortcutCatalog = buildSceneShortcutCatalog();
  const expectedAttributes = sceneShortcutCatalogDataAttributes(shortcutCatalog);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimShortcutCheckpointCount, shortcutCatalog.checkpointShortcutCount);
  assert.equal(snapshot.manimShortcutCount, shortcutCatalog.totalShortcutCount);
  assert.equal(snapshot.manimShortcutHistoryCount, shortcutCatalog.historyShortcutCount);
  assert.equal(snapshot.manimShortcutIds, shortcutCatalog.ids.join(","));
  assert.equal(snapshot.manimShortcutPlaybackCount, shortcutCatalog.playbackShortcutCount);
  assert.equal(snapshot.manimShortcutRedrawCount, shortcutCatalog.redrawAfterCellCount);
  assert.equal(snapshot.manimShortcutReloadReady, shortcutCatalog.reloadReady);
  assert.equal(snapshot.manimShortcutSceneGraphCount, shortcutCatalog.sceneGraphShortcutCount);
  assert.equal(snapshot.manimShortcutSourceContract, SCENE_SHORTCUT_CATALOG_SOURCE_CONTRACT);
  assert.equal(snapshot.manimShortcutStateCount, shortcutCatalog.stateShortcutCount);
  assert.equal(snapshot.manimShortcutAuthoringPolicy, SCENE_SHORTCUT_AUTHORING_POLICY);
  assert.equal(snapshot.manimShortcutSummary, shortcutCatalog.summary);
  assert.equal(attributes["data-viz-manim-shortcut-checkpoint-count"], expectedAttributes["data-viz-manim-shortcut-checkpoint-count"]);
  assert.equal(attributes["data-viz-manim-shortcut-count"], expectedAttributes["data-viz-manim-shortcut-count"]);
  assert.equal(attributes["data-viz-manim-shortcut-history-count"], expectedAttributes["data-viz-manim-shortcut-history-count"]);
  assert.equal(attributes["data-viz-manim-shortcut-ids"], expectedAttributes["data-viz-manim-shortcut-ids"]);
  assert.equal(attributes["data-viz-manim-shortcut-playback-count"], expectedAttributes["data-viz-manim-shortcut-playback-count"]);
  assert.equal(attributes["data-viz-manim-shortcut-redraw-count"], expectedAttributes["data-viz-manim-shortcut-redraw-count"]);
  assert.equal(attributes["data-viz-manim-shortcut-reload-ready"], expectedAttributes["data-viz-manim-shortcut-reload-ready"]);
  assert.equal(attributes["data-viz-manim-shortcut-scene-graph-count"], expectedAttributes["data-viz-manim-shortcut-scene-graph-count"]);
  assert.equal(attributes["data-viz-manim-shortcut-source-contract"], expectedAttributes["data-viz-manim-shortcut-source-contract"]);
  assert.equal(attributes["data-viz-manim-shortcut-state-count"], expectedAttributes["data-viz-manim-shortcut-state-count"]);
  assert.equal(attributes["data-viz-manim-shortcut-authoring-policy"], expectedAttributes["data-viz-manim-shortcut-authoring-policy"]);
  assert.equal(attributes["data-viz-manim-shortcut-summary"], expectedAttributes["data-viz-manim-shortcut-summary"]);
});

test("records InteractiveScene reload source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, elapsedAtMidpointOfComposition("function-attention-lagged-start"));
  const reloadEvidence = {
    checkpointCount: 2,
    elapsedSeconds: 2.25,
    frameIndex: 135,
    sceneId: functionGraphSpec.sceneId,
    selectedFamilyId: functionGraphSpec.familyId,
    selectedSceneId: functionGraphSpec.sceneId,
    snippet: "play(reveal_curve)"
  };
  const reloadPlan = buildSceneReloadPlan(reloadEvidence);
  const expectedAttributes = sceneReloadPlanDataAttributes(reloadPlan);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    reloadEvidence,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimReloadCheckpointCount, reloadPlan.checkpointCount);
  assert.equal(snapshot.manimReloadClearsSnippet, reloadPlan.clearsSnippet);
  assert.equal(snapshot.manimReloadFrameAfter, reloadPlan.frameIndexAfter);
  assert.equal(snapshot.manimReloadHistoryLabel, reloadPlan.historyLabel);
  assert.equal(snapshot.manimReloadReady, reloadPlan.ready);
  assert.equal(snapshot.manimReloadResetPolicy, SCENE_RELOAD_RESET_POLICY);
  assert.equal(snapshot.manimReloadResetsElapsed, reloadPlan.resetsElapsed);
  assert.equal(snapshot.manimReloadResetsFrame, reloadPlan.resetsFrame);
  assert.equal(snapshot.manimReloadSceneId, reloadPlan.sceneId);
  assert.equal(snapshot.manimReloadSelectedFamilyId, reloadPlan.selectedFamilyId);
  assert.equal(snapshot.manimReloadSelectedSceneId, reloadPlan.selectedSceneId);
  assert.equal(snapshot.manimReloadSourceContract, SCENE_RELOAD_SOURCE_CONTRACT);
  assert.equal(snapshot.manimReloadSummary, reloadPlan.summary);
  assert.equal(attributes["data-viz-manim-reload-checkpoint-count"], expectedAttributes["data-viz-manim-reload-checkpoint-count"]);
  assert.equal(attributes["data-viz-manim-reload-clears-snippet"], expectedAttributes["data-viz-manim-reload-clears-snippet"]);
  assert.equal(attributes["data-viz-manim-reload-frame-after"], expectedAttributes["data-viz-manim-reload-frame-after"]);
  assert.equal(attributes["data-viz-manim-reload-history-label"], expectedAttributes["data-viz-manim-reload-history-label"]);
  assert.equal(attributes["data-viz-manim-reload-ready"], expectedAttributes["data-viz-manim-reload-ready"]);
  assert.equal(attributes["data-viz-manim-reload-reset-policy"], expectedAttributes["data-viz-manim-reload-reset-policy"]);
  assert.equal(attributes["data-viz-manim-reload-resets-elapsed"], expectedAttributes["data-viz-manim-reload-resets-elapsed"]);
  assert.equal(attributes["data-viz-manim-reload-resets-frame"], expectedAttributes["data-viz-manim-reload-resets-frame"]);
  assert.equal(attributes["data-viz-manim-reload-scene-id"], expectedAttributes["data-viz-manim-reload-scene-id"]);
  assert.equal(attributes["data-viz-manim-reload-selected-family-id"], expectedAttributes["data-viz-manim-reload-selected-family-id"]);
  assert.equal(attributes["data-viz-manim-reload-selected-scene-id"], expectedAttributes["data-viz-manim-reload-selected-scene-id"]);
  assert.equal(attributes["data-viz-manim-reload-source-contract"], expectedAttributes["data-viz-manim-reload-source-contract"]);
  assert.equal(attributes["data-viz-manim-reload-summary"], expectedAttributes["data-viz-manim-reload-summary"]);
});

test("records Manim Scene skipping-window source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, elapsedAtMidpointOfComposition("function-attention-lagged-start"));
  const skippingWindowEvidence = {
    endAtAnimationNumber: functionGraphSpec.timeline.length - 1,
    startAtAnimationNumber: 1
  };
  const skippingWindowPlan = buildSceneSkippingWindowPlan({
    ...skippingWindowEvidence,
    initialSkipAnimations: runtimeState.updatePolicy.skipAnimations,
    playCount: functionGraphSpec.timeline.length,
    playDurations: functionGraphSpec.timeline.map((step) => step.duration)
  });
  const expectedAttributes = sceneSkippingWindowDataAttributes(skippingWindowPlan);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec,
    skippingWindowEvidence
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimSkippingWindowConstructorForcedSkip, skippingWindowPlan.constructorForcedSkip);
  assert.equal(snapshot.manimSkippingWindowEndAt, String(skippingWindowPlan.endAtAnimationNumber));
  assert.equal(snapshot.manimSkippingWindowEndScenePlay, String(skippingWindowPlan.endScenePlayIndex));
  assert.equal(snapshot.manimSkippingWindowFinalSkipAnimations, skippingWindowPlan.finalSkipAnimations);
  assert.equal(snapshot.manimSkippingWindowGatePolicy, SCENE_SKIPPING_WINDOW_GATE_POLICY);
  assert.equal(snapshot.manimSkippingWindowPlayCount, skippingWindowPlan.playCount);
  assert.equal(snapshot.manimSkippingWindowRenderedPlayCount, skippingWindowPlan.renderedPlayCount);
  assert.equal(snapshot.manimSkippingWindowSkippedPlayCount, skippingWindowPlan.skippedPlayCount);
  assert.equal(snapshot.manimSkippingWindowSourceContract, SCENE_SKIPPING_WINDOW_SOURCE_CONTRACT);
  assert.equal(snapshot.manimSkippingWindowStartAt, String(skippingWindowPlan.startAtAnimationNumber));
  assert.equal(snapshot.manimSkippingWindowSummary, skippingWindowPlan.summary);
  assert.equal(snapshot.manimSkippingWindowTruncated, skippingWindowPlan.truncatedByEndScene);
  assert.equal(attributes["data-viz-manim-skipping-window-constructor-forced-skip"], expectedAttributes["data-viz-manim-skipping-window-constructor-forced-skip"]);
  assert.equal(attributes["data-viz-manim-skipping-window-end-at"], expectedAttributes["data-viz-manim-skipping-window-end-at"]);
  assert.equal(attributes["data-viz-manim-skipping-window-end-scene-play"], expectedAttributes["data-viz-manim-skipping-window-end-scene-play"]);
  assert.equal(attributes["data-viz-manim-skipping-window-final-skip"], expectedAttributes["data-viz-manim-skipping-window-final-skip"]);
  assert.equal(attributes["data-viz-manim-skipping-window-gate-policy"], expectedAttributes["data-viz-manim-skipping-window-gate-policy"]);
  assert.equal(attributes["data-viz-manim-skipping-window-play-count"], expectedAttributes["data-viz-manim-skipping-window-play-count"]);
  assert.equal(attributes["data-viz-manim-skipping-window-rendered-play-count"], expectedAttributes["data-viz-manim-skipping-window-rendered-play-count"]);
  assert.equal(attributes["data-viz-manim-skipping-window-skipped-play-count"], expectedAttributes["data-viz-manim-skipping-window-skipped-play-count"]);
  assert.equal(attributes["data-viz-manim-skipping-window-source-contract"], expectedAttributes["data-viz-manim-skipping-window-source-contract"]);
  assert.equal(attributes["data-viz-manim-skipping-window-start-at"], expectedAttributes["data-viz-manim-skipping-window-start-at"]);
  assert.equal(attributes["data-viz-manim-skipping-window-summary"], expectedAttributes["data-viz-manim-skipping-window-summary"]);
  assert.equal(attributes["data-viz-manim-skipping-window-truncated"], expectedAttributes["data-viz-manim-skipping-window-truncated"]);
});

test("records Manim run-from-beat replay-window source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, elapsedAtMidpointOfComposition("function-attention-lagged-start"));
  const runFromBeatEvidence = {
    checkpointKeys: ["# intro", "# curve", "# camera"],
    checkpointRestoreKey: "# curve",
    requestedBeatIndex: 3
  };
  const playbackPlan = buildScenePlaybackPlan(functionGraphSpec.timeline, {
    fps: 4,
    skipAnimations: runtimeState.updatePolicy.skipAnimations
  });
  const compositionPlans = buildSceneAnimationCompositionPlans(functionGraphSpec);
  const selectedCompositionPlan = compositionPlans.find((plan) => plan.id === "function-attention-lagged-start");
  assert.ok(selectedCompositionPlan);
  const runFromBeatPlan = buildSceneRunFromBeatPlan({
    checkpointKeys: runFromBeatEvidence.checkpointKeys,
    checkpointRestoreKey: runFromBeatEvidence.checkpointRestoreKey,
    compositionReplay: {
      compositionId: selectedCompositionPlan.id,
      compositionType: selectedCompositionPlan.type,
      windowIds: selectedCompositionPlan.windows.map((window) => window.animationPlanId),
      windowSummary:
        "function-curve-attention-lift@0.000..1.200:0.000|function-probe-attention-pulse@0.240..1.440:0.000"
    },
    playEndSeconds: playbackPlan.plays.map((play) => play.endSeconds),
    playStartSeconds: playbackPlan.plays.map((play) => play.startSeconds),
    requestedBeatIndex: runFromBeatEvidence.requestedBeatIndex
  });
  const expectedAttributes = sceneRunFromBeatDataAttributes(runFromBeatPlan);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runFromBeatEvidence,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimRunFromBeatElapsedBefore, runFromBeatPlan.elapsedBeforeReplay);
  assert.equal(snapshot.manimRunFromBeatFinalElapsed, runFromBeatPlan.finalElapsedSeconds);
  assert.equal(snapshot.manimRunFromBeatCheckpointCount, runFromBeatPlan.checkpointKeyCount);
  assert.equal(snapshot.manimRunFromBeatCheckpointKeys, runFromBeatPlan.checkpointKeys.join("|") || "none");
  assert.equal(snapshot.manimRunFromBeatCheckpointPolicy, runFromBeatPlan.checkpointPolicy);
  assert.equal(snapshot.manimRunFromBeatCheckpointInvalidatesCount, runFromBeatPlan.invalidatesLaterCheckpointCount);
  assert.equal(snapshot.manimRunFromBeatCheckpointInvalidatedKeys, runFromBeatPlan.invalidatedCheckpointKeys.join("|") || "none");
  assert.equal(snapshot.manimRunFromBeatCheckpointInvalidationSummary, runFromBeatPlan.checkpointInvalidationSummary);
  assert.equal(snapshot.manimRunFromBeatCheckpointRetainedKeysAfterRestore, runFromBeatPlan.retainedCheckpointKeysAfterRestore.join("|") || "none");
  assert.equal(snapshot.manimRunFromBeatCheckpointRestoreAction, runFromBeatPlan.checkpointRestoreAction);
  assert.equal(snapshot.manimRunFromBeatCheckpointRestoreKey, runFromBeatPlan.checkpointRestoreKey);
  assert.equal(snapshot.manimRunFromBeatCheckpointRestoreMode, runFromBeatPlan.checkpointRestoreMode);
  assert.equal(snapshot.manimRunFromBeatCheckpointRestoreReady, runFromBeatPlan.checkpointRestoreReady);
  assert.equal(snapshot.manimRunFromBeatCheckpointSummary, runFromBeatPlan.checkpointSummary);
  assert.equal(snapshot.manimRunFromBeatCompositionId, runFromBeatPlan.compositionId);
  assert.equal(snapshot.manimRunFromBeatCompositionReplayPolicy, runFromBeatPlan.compositionReplayPolicy);
  assert.equal(snapshot.manimRunFromBeatCompositionReplayReady, runFromBeatPlan.compositionReplayReady);
  assert.equal(snapshot.manimRunFromBeatCompositionReplaySummary, runFromBeatPlan.compositionReplaySummary);
  assert.equal(snapshot.manimRunFromBeatCompositionType, runFromBeatPlan.compositionType);
  assert.equal(snapshot.manimRunFromBeatCompositionWindowCount, runFromBeatPlan.compositionWindowCount);
  assert.equal(snapshot.manimRunFromBeatCompositionWindowIds, runFromBeatPlan.compositionWindowIds.join("|") || "none");
  assert.equal(snapshot.manimRunFromBeatCompositionWindowSummary, runFromBeatPlan.compositionWindowSummary);
  assert.equal(snapshot.manimRunFromBeatNormalizedIndex, runFromBeatPlan.normalizedBeatIndex);
  assert.equal(snapshot.manimRunFromBeatPreparedCount, runFromBeatPlan.preparedBeatIndices.length);
  assert.equal(snapshot.manimRunFromBeatPreparedIndices, runFromBeatPlan.preparedBeatIndices.join(",") || "none");
  assert.equal(snapshot.manimRunFromBeatReady, true);
  assert.equal(snapshot.manimRunFromBeatReplayCount, runFromBeatPlan.replayPlayCount);
  assert.equal(snapshot.manimRunFromBeatReplayIndices, runFromBeatPlan.replayBeatIndices.join(",") || "none");
  assert.equal(snapshot.manimRunFromBeatReplayPolicy, SCENE_RUN_FROM_BEAT_REPLAY_POLICY);
  assert.equal(snapshot.manimRunFromBeatRequestedIndex, runFromBeatPlan.requestedBeatIndex);
  assert.equal(snapshot.manimRunFromBeatSkippedBeforeCount, runFromBeatPlan.skippedBeforeCount);
  assert.equal(snapshot.manimRunFromBeatSourceContract, SCENE_RUN_FROM_BEAT_SOURCE_CONTRACT);
  assert.equal(snapshot.manimRunFromBeatSummary, runFromBeatPlan.summary);
  assert.equal(snapshot.manimRunFromBeatTotalPlayCount, runFromBeatPlan.totalPlayCount);
  assert.equal(attributes["data-viz-manim-run-from-beat-checkpoint-count"], expectedAttributes["data-viz-manim-run-from-beat-checkpoint-count"]);
  assert.equal(attributes["data-viz-manim-run-from-beat-checkpoint-invalidates-count"], expectedAttributes["data-viz-manim-run-from-beat-checkpoint-invalidates-count"]);
  assert.equal(attributes["data-viz-manim-run-from-beat-checkpoint-invalidated-keys"], expectedAttributes["data-viz-manim-run-from-beat-checkpoint-invalidated-keys"]);
  assert.equal(attributes["data-viz-manim-run-from-beat-checkpoint-invalidation-summary"], expectedAttributes["data-viz-manim-run-from-beat-checkpoint-invalidation-summary"]);
  assert.equal(attributes["data-viz-manim-run-from-beat-checkpoint-keys"], expectedAttributes["data-viz-manim-run-from-beat-checkpoint-keys"]);
  assert.equal(attributes["data-viz-manim-run-from-beat-checkpoint-policy"], expectedAttributes["data-viz-manim-run-from-beat-checkpoint-policy"]);
  assert.equal(attributes["data-viz-manim-run-from-beat-checkpoint-retained-keys-after-restore"], expectedAttributes["data-viz-manim-run-from-beat-checkpoint-retained-keys-after-restore"]);
  assert.equal(attributes["data-viz-manim-run-from-beat-checkpoint-restore-action"], expectedAttributes["data-viz-manim-run-from-beat-checkpoint-restore-action"]);
  assert.equal(attributes["data-viz-manim-run-from-beat-checkpoint-restore-key"], expectedAttributes["data-viz-manim-run-from-beat-checkpoint-restore-key"]);
  assert.equal(attributes["data-viz-manim-run-from-beat-checkpoint-restore-mode"], expectedAttributes["data-viz-manim-run-from-beat-checkpoint-restore-mode"]);
  assert.equal(attributes["data-viz-manim-run-from-beat-checkpoint-restore-ready"], expectedAttributes["data-viz-manim-run-from-beat-checkpoint-restore-ready"]);
  assert.equal(attributes["data-viz-manim-run-from-beat-checkpoint-summary"], expectedAttributes["data-viz-manim-run-from-beat-checkpoint-summary"]);
  assert.equal(attributes["data-viz-manim-run-from-beat-composition-id"], expectedAttributes["data-viz-manim-run-from-beat-composition-id"]);
  assert.equal(attributes["data-viz-manim-run-from-beat-composition-replay-policy"], expectedAttributes["data-viz-manim-run-from-beat-composition-replay-policy"]);
  assert.equal(attributes["data-viz-manim-run-from-beat-composition-replay-ready"], expectedAttributes["data-viz-manim-run-from-beat-composition-replay-ready"]);
  assert.equal(attributes["data-viz-manim-run-from-beat-composition-replay-summary"], expectedAttributes["data-viz-manim-run-from-beat-composition-replay-summary"]);
  assert.equal(attributes["data-viz-manim-run-from-beat-composition-type"], expectedAttributes["data-viz-manim-run-from-beat-composition-type"]);
  assert.equal(attributes["data-viz-manim-run-from-beat-composition-window-count"], expectedAttributes["data-viz-manim-run-from-beat-composition-window-count"]);
  assert.equal(attributes["data-viz-manim-run-from-beat-composition-window-ids"], expectedAttributes["data-viz-manim-run-from-beat-composition-window-ids"]);
  assert.equal(attributes["data-viz-manim-run-from-beat-composition-window-summary"], expectedAttributes["data-viz-manim-run-from-beat-composition-window-summary"]);
  assert.equal(attributes["data-viz-manim-run-from-beat-elapsed-before"], expectedAttributes["data-viz-manim-run-from-beat-elapsed-before"]);
  assert.equal(attributes["data-viz-manim-run-from-beat-final-elapsed"], expectedAttributes["data-viz-manim-run-from-beat-final-elapsed"]);
  assert.equal(attributes["data-viz-manim-run-from-beat-normalized-index"], expectedAttributes["data-viz-manim-run-from-beat-normalized-index"]);
  assert.equal(attributes["data-viz-manim-run-from-beat-prepared-count"], expectedAttributes["data-viz-manim-run-from-beat-prepared-count"]);
  assert.equal(attributes["data-viz-manim-run-from-beat-prepared-indices"], expectedAttributes["data-viz-manim-run-from-beat-prepared-indices"]);
  assert.equal(attributes["data-viz-manim-run-from-beat-ready"], expectedAttributes["data-viz-manim-run-from-beat-ready"]);
  assert.equal(attributes["data-viz-manim-run-from-beat-replay-count"], expectedAttributes["data-viz-manim-run-from-beat-replay-count"]);
  assert.equal(attributes["data-viz-manim-run-from-beat-replay-indices"], expectedAttributes["data-viz-manim-run-from-beat-replay-indices"]);
  assert.equal(attributes["data-viz-manim-run-from-beat-replay-policy"], expectedAttributes["data-viz-manim-run-from-beat-replay-policy"]);
  assert.equal(attributes["data-viz-manim-run-from-beat-requested-index"], expectedAttributes["data-viz-manim-run-from-beat-requested-index"]);
  assert.equal(attributes["data-viz-manim-run-from-beat-source-contract"], expectedAttributes["data-viz-manim-run-from-beat-source-contract"]);
  assert.equal(attributes["data-viz-manim-run-from-beat-summary"], expectedAttributes["data-viz-manim-run-from-beat-summary"]);
  assert.equal(attributes["data-viz-manim-run-from-beat-total-play-count"], expectedAttributes["data-viz-manim-run-from-beat-total-play-count"]);
});

test("records Manim Scene skip-control source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, elapsedAtMidpointOfComposition("function-attention-lagged-start"));
  const skipControlEvidence = {
    actions: ["force_skipping", "stop_skipping", "revert_to_original_skipping_status"] as const
  };
  const skipControlPlan = buildSceneSkipControlPlan({
    actions: [...skipControlEvidence.actions],
    initialSkipAnimations: runtimeState.updatePolicy.skipAnimations
  });
  const expectedAttributes = sceneSkipControlDataAttributes(skipControlPlan);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec,
    skipControlEvidence
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimSkipControlActionSummary, skipControlPlan.transitions.map((transition) => transition.action).join(",") || "none");
  assert.equal(snapshot.manimSkipControlFinalOriginalStatus, skipControlPlan.finalOriginalSkippingStatus);
  assert.equal(snapshot.manimSkipControlFinalSkipAnimations, skipControlPlan.finalSkipAnimations);
  assert.equal(snapshot.manimSkipControlFinalTempPreviousStatus, skipControlPlan.finalTempSkipPreviousStatus);
  assert.equal(snapshot.manimSkipControlHasOriginalStatus, skipControlPlan.finalHasOriginalSkippingStatus);
  assert.equal(snapshot.manimSkipControlSkippedTransitionCount, skipControlPlan.skippedTransitionCount);
  assert.equal(snapshot.manimSkipControlSourceContract, SCENE_SKIP_CONTROL_SOURCE_CONTRACT);
  assert.equal(snapshot.manimSkipControlStatePolicy, SCENE_SKIP_CONTROL_STATE_POLICY);
  assert.equal(snapshot.manimSkipControlStoppedTransitionCount, skipControlPlan.stoppedTransitionCount);
  assert.equal(snapshot.manimSkipControlSummary, skipControlPlan.summary);
  assert.equal(snapshot.manimSkipControlTransitionCount, skipControlPlan.transitionCount);
  assert.deepEqual(snapshot.manimSkipControlTransitions, skipControlPlan.transitions);
  assert.equal(attributes["data-viz-manim-skip-control-action-summary"], expectedAttributes["data-viz-manim-skip-control-action-summary"]);
  assert.equal(attributes["data-viz-manim-skip-control-final-original-status"], expectedAttributes["data-viz-manim-skip-control-final-original-status"]);
  assert.equal(attributes["data-viz-manim-skip-control-final-skip"], expectedAttributes["data-viz-manim-skip-control-final-skip"]);
  assert.equal(attributes["data-viz-manim-skip-control-final-temp-previous"], expectedAttributes["data-viz-manim-skip-control-final-temp-previous"]);
  assert.equal(attributes["data-viz-manim-skip-control-has-original-status"], expectedAttributes["data-viz-manim-skip-control-has-original-status"]);
  assert.equal(attributes["data-viz-manim-skip-control-skipped-transition-count"], expectedAttributes["data-viz-manim-skip-control-skipped-transition-count"]);
  assert.equal(attributes["data-viz-manim-skip-control-source-contract"], expectedAttributes["data-viz-manim-skip-control-source-contract"]);
  assert.equal(attributes["data-viz-manim-skip-control-state-policy"], expectedAttributes["data-viz-manim-skip-control-state-policy"]);
  assert.equal(attributes["data-viz-manim-skip-control-stopped-transition-count"], expectedAttributes["data-viz-manim-skip-control-stopped-transition-count"]);
  assert.equal(attributes["data-viz-manim-skip-control-summary"], expectedAttributes["data-viz-manim-skip-control-summary"]);
  assert.equal(attributes["data-viz-manim-skip-control-transition-count"], expectedAttributes["data-viz-manim-skip-control-transition-count"]);
});

test("records Scene membership lifecycle evidence for browser QA", () => {
  const scene: MathSceneSpec = {
    sceneId: "membership-evidence-test",
    familyId: "three-function-graph",
    coordinateSpace: {
      mathRange: { x: [-2, 2], y: [-2, 2], z: [-2, 2] },
      worldRange: { x: [-2, 2], y: [-2, 2], z: [-2, 2] }
    },
    objects: [
      { type: "axis3d", id: "axes", range: { x: [-2, 2], y: [-2, 2], z: [-2, 2] } },
      { type: "vector", id: "late-vector", colorRole: "function", conceptId: "late-vector", from: [0, 0, 0], to: [1, 0, 0] },
      { type: "vector", id: "grow-label", colorRole: "attention", conceptId: "grow-label", from: [0, 0, 0], to: [0, 1, 0] },
      { type: "vector", id: "old-vector", colorRole: "probe", conceptId: "old-vector", from: [0, 0, 0], to: [0, 0, 1] }
    ],
    formulas: [],
    bindings: [],
    timeline: [
      { type: "wait", duration: 1 },
      { type: "fadeInObject", objectId: "late-vector", duration: 2, easing: "linear" },
      { type: "growFromCenter", objectId: "grow-label", duration: 1, easing: "smooth" },
      { type: "wait", duration: 1 },
      { type: "fadeOutObject", objectId: "old-vector", duration: 2, easing: "linear" }
    ],
    cameraShots: [{ id: "overview", target: [0, 0, 0], position: [3, 3, 3], fov: 48 }],
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 4, expectedTokenCount: 0 }
  };
  const beforeIntro = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState: buildMathSceneRuntimeState(scene, 0.5),
    scene
  });
  const duringFadeIn = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState: buildMathSceneRuntimeState(scene, 1.5),
    scene
  });
  const duringFadeOut = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState: buildMathSceneRuntimeState(scene, 5.5),
    scene
  });
  const afterFadeOut = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState: buildMathSceneRuntimeState(scene, 7),
    scene
  });
  const beforeAttributes = evidenceDataAttributes(beforeIntro);
  const afterAttributes = evidenceDataAttributes(afterFadeOut);

  assert.equal(beforeIntro.sceneMembershipPendingIntroducerIds, "late-vector,grow-label");
  assert.equal(beforeIntro.sceneMembershipExcludedIds, "late-vector,grow-label");
  assert.equal(duringFadeIn.sceneMembershipActiveIntroducerIds, "late-vector");
  assert.equal(duringFadeIn.sceneMembershipPendingIntroducerIds, "grow-label");
  assert.equal(duringFadeOut.sceneMembershipActiveRemoverIds, "old-vector");
  assert.equal(afterFadeOut.sceneMembershipRemovedIds, "old-vector");
  assert.equal(afterFadeOut.sceneMembershipExcludedIds, "old-vector");
  assert.equal(
    beforeIntro.sceneMembershipEventSummary,
    "introducer:late-vector@1.000-3.000|introducer:grow-label@3.000-4.000|remover:old-vector@5.000-7.000"
  );
  assert.equal(
    beforeIntro.sceneMembershipSourceSummary,
    "membership:events=3:introducers=late-vector,grow-label:removers=old-vector"
  );
  assert.equal(beforeIntro.sceneMembershipSourceContract, SCENE_MEMBERSHIP_SOURCE_CONTRACT);
  assert.equal(beforeAttributes["data-viz-scene-membership-pending-introducer-count"], "2");
  assert.equal(beforeAttributes["data-viz-scene-membership-pending-introducer-ids"], "late-vector,grow-label");
  assert.equal(
    beforeAttributes["data-viz-scene-membership-event-summary"],
    "introducer:late-vector@1.000-3.000|introducer:grow-label@3.000-4.000|remover:old-vector@5.000-7.000"
  );
  assert.equal(
    beforeAttributes["data-viz-scene-membership-source-summary"],
    "membership:events=3:introducers=late-vector,grow-label:removers=old-vector"
  );
  assert.equal(beforeAttributes["data-viz-scene-membership-source-contract"], SCENE_MEMBERSHIP_SOURCE_CONTRACT);
  assert.equal(beforeAttributes["data-viz-scene-membership-excluded-ids"], "late-vector,grow-label");
  assert.equal(afterAttributes["data-viz-scene-membership-removed-count"], "1");
  assert.equal(afterAttributes["data-viz-scene-membership-removed-ids"], "old-vector");
  assert.equal(afterAttributes["data-viz-scene-membership-excluded-count"], "1");
  assert.equal(afterAttributes["data-viz-scene-render-group-ids"], "axes,late-vector,grow-label");
});

test("records Scene.restructure_mobjects evidence for browser QA", () => {
  assert.ok(functionGraphSpec);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState: buildMathSceneRuntimeState(functionGraphSpec, 0),
    scene: functionGraphSpec,
    sceneGraphEvidence: {
      restructureObjectIds: ["moving-probe"]
    }
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.sceneRestructureRequestedIds, "moving-probe");
  assert.equal(snapshot.sceneRestructureParentIds, "function-curve");
  assert.equal(snapshot.sceneRestructureRemovedIds, "moving-probe,probe-trace");
  assert.equal(snapshot.sceneRestructureDetachedRootIds, "moving-probe");
  assert.equal(snapshot.sceneRestructureSourceContract, SCENE_RESTRUCTURE_SOURCE_CONTRACT);
  assert.equal(
    snapshot.sceneRestructureSummary,
    "restructure:requested=moving-probe:parents=function-curve:removed=moving-probe,probe-trace:detached=moving-probe"
  );
  assert.equal(attributes["data-viz-scene-restructure-requested-count"], "1");
  assert.equal(attributes["data-viz-scene-restructure-requested-ids"], "moving-probe");
  assert.equal(attributes["data-viz-scene-restructure-parent-count"], "1");
  assert.equal(attributes["data-viz-scene-restructure-parent-ids"], "function-curve");
  assert.equal(attributes["data-viz-scene-restructure-removed-count"], "2");
  assert.equal(attributes["data-viz-scene-restructure-removed-ids"], "moving-probe,probe-trace");
  assert.equal(attributes["data-viz-scene-restructure-detached-root-count"], "1");
  assert.equal(attributes["data-viz-scene-restructure-detached-root-ids"], "moving-probe");
  assert.equal(attributes["data-viz-scene-restructure-source-contract"], SCENE_RESTRUCTURE_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-scene-restructure-summary"], snapshot.sceneRestructureSummary);
});

test("records Scene.add mobject bridge evidence for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const expectedPlan = buildSceneAddMobjectBridgePlan({
    familyIndex: buildMobjectFamilyIndex(runtimeState.objectGraph),
    group: "foreground",
    objectId: "function-curve",
    store: runtimeState.sceneGraph
  });
  const expectedAttributes = sceneAddMobjectBridgeDataAttributes(expectedPlan);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec,
    sceneGraphEvidence: {
      addMobject: {
        group: "foreground",
        objectId: "function-curve"
      }
    }
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.sceneAddMobjectObjectId, "function-curve");
  assert.equal(snapshot.sceneAddMobjectGroup, "foreground");
  assert.equal(snapshot.sceneAddMobjectAdded, true);
  assert.equal(snapshot.sceneAddMobjectRestoredFamilyCount, 0);
  assert.equal(snapshot.sceneAddMobjectRestoredFamilyIds, "none");
  assert.equal(snapshot.sceneAddMobjectBeforeSceneIds, "axes,function-curve,moving-probe,probe-trace");
  assert.equal(snapshot.sceneAddMobjectAfterSceneIds, "axes");
  assert.equal(snapshot.sceneAddMobjectBeforeForegroundIds, "none");
  assert.equal(snapshot.sceneAddMobjectAfterForegroundIds, "function-curve,moving-probe,probe-trace");
  assert.equal(snapshot.sceneAddMobjectBeforeRenderGroupIds, "axes,function-curve,moving-probe,probe-trace");
  assert.equal(snapshot.sceneAddMobjectAfterRenderGroupIds, "axes,function-curve,moving-probe,probe-trace");
  assert.equal(snapshot.sceneAddMobjectSourceContract, SCENE_ADD_MOBJECT_BRIDGE_SOURCE_CONTRACT);
  assert.equal(
    snapshot.sceneAddMobjectSummary,
    "scene-add:function-curve:group=foreground:added=true:restored=none:render=axes,function-curve,moving-probe,probe-trace"
  );
  assert.deepEqual(
    Object.fromEntries(Object.entries(attributes).filter(([key]) => key.startsWith("data-viz-scene-add-mobject-"))),
    expectedAttributes
  );
});

test("records Scene.clear mobject bridge evidence for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const expectedPlan = buildSceneClearMobjectBridgePlan({
    enabled: true,
    familyIndex: buildMobjectFamilyIndex(runtimeState.objectGraph),
    store: runtimeState.sceneGraph
  });
  const expectedAttributes = sceneClearMobjectBridgeDataAttributes(expectedPlan);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec,
    sceneGraphEvidence: {
      clearMobjects: true
    }
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.sceneClearMobjectCleared, true);
  assert.equal(snapshot.sceneClearMobjectClearedObjectCount, 4);
  assert.equal(snapshot.sceneClearMobjectClearedObjectIds, "axes,function-curve,moving-probe,probe-trace");
  assert.equal(snapshot.sceneClearMobjectObjectCatalogCount, 4);
  assert.equal(snapshot.sceneClearMobjectBeforeSceneIds, "axes,function-curve,moving-probe,probe-trace");
  assert.equal(snapshot.sceneClearMobjectAfterSceneIds, "none");
  assert.equal(snapshot.sceneClearMobjectBeforeRenderGroupIds, "axes,function-curve,moving-probe,probe-trace");
  assert.equal(snapshot.sceneClearMobjectAfterRenderGroupIds, "none");
  assert.equal(snapshot.sceneClearMobjectSourceContract, SCENE_CLEAR_MOBJECT_BRIDGE_SOURCE_CONTRACT);
  assert.equal(
    snapshot.sceneClearMobjectSummary,
    "scene-clear:cleared=true:ids=axes,function-curve,moving-probe,probe-trace:render=none:catalog=4"
  );
  assert.deepEqual(
    Object.fromEntries(Object.entries(attributes).filter(([key]) => key.startsWith("data-viz-scene-clear-mobject-"))),
    expectedAttributes
  );
});

test("records Scene.remove_all_except mobject bridge evidence for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const expectedPlan = buildSceneRemoveAllExceptMobjectBridgePlan({
    enabled: true,
    familyIndex: buildMobjectFamilyIndex(runtimeState.objectGraph),
    objectIdsToKeep: ["moving-probe"],
    store: runtimeState.sceneGraph
  });
  const expectedAttributes = sceneRemoveAllExceptMobjectBridgeDataAttributes(expectedPlan);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec,
    sceneGraphEvidence: {
      removeAllExceptMobjects: {
        objectIdsToKeep: ["moving-probe"]
      }
    }
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.sceneRemoveAllExceptMobjectChanged, true);
  assert.equal(snapshot.sceneRemoveAllExceptMobjectRequestedKeepIds, "moving-probe");
  assert.equal(snapshot.sceneRemoveAllExceptMobjectKeptCount, 1);
  assert.equal(snapshot.sceneRemoveAllExceptMobjectKeptIds, "moving-probe");
  assert.equal(snapshot.sceneRemoveAllExceptMobjectRemovedCount, 2);
  assert.equal(snapshot.sceneRemoveAllExceptMobjectRemovedIds, "axes,function-curve");
  assert.equal(snapshot.sceneRemoveAllExceptMobjectObjectCatalogCount, 4);
  assert.equal(snapshot.sceneRemoveAllExceptMobjectBeforeSceneIds, "axes,function-curve,moving-probe,probe-trace");
  assert.equal(snapshot.sceneRemoveAllExceptMobjectAfterSceneIds, "moving-probe,probe-trace");
  assert.equal(snapshot.sceneRemoveAllExceptMobjectBeforeRenderGroupIds, "axes,function-curve,moving-probe,probe-trace");
  assert.equal(snapshot.sceneRemoveAllExceptMobjectAfterRenderGroupIds, "moving-probe,probe-trace");
  assert.equal(snapshot.sceneRemoveAllExceptMobjectSourceContract, SCENE_REMOVE_ALL_EXCEPT_MOBJECT_BRIDGE_SOURCE_CONTRACT);
  assert.equal(
    snapshot.sceneRemoveAllExceptMobjectSummary,
    "scene-remove-all-except:keep=moving-probe:changed=true:removed=axes,function-curve:render=moving-probe,probe-trace:catalog=4"
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(attributes).filter(([key]) => key.startsWith("data-viz-scene-remove-all-except-mobject-"))
    ),
    expectedAttributes
  );
});

test("records Scene.bring_to_front mobject bridge evidence for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const expectedPlan = buildSceneBringToFrontMobjectBridgePlan({
    familyIndex: buildMobjectFamilyIndex(runtimeState.objectGraph),
    objectId: "axes",
    store: runtimeState.sceneGraph
  });
  const expectedAttributes = sceneBringToFrontMobjectBridgeDataAttributes(expectedPlan);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec,
    sceneGraphEvidence: {
      bringToFrontMobject: {
        objectId: "axes"
      }
    }
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.sceneBringToFrontMobjectObjectId, "axes");
  assert.equal(snapshot.sceneBringToFrontMobjectGroup, "scene");
  assert.equal(snapshot.sceneBringToFrontMobjectMoved, true);
  assert.equal(snapshot.sceneBringToFrontMobjectPreviousIndex, 0);
  assert.equal(snapshot.sceneBringToFrontMobjectNextIndex, 1);
  assert.equal(snapshot.sceneBringToFrontMobjectBeforeSceneIds, "axes,function-curve,moving-probe,probe-trace");
  assert.equal(snapshot.sceneBringToFrontMobjectAfterSceneIds, "function-curve,moving-probe,probe-trace,axes");
  assert.equal(snapshot.sceneBringToFrontMobjectBeforeRenderGroupIds, "axes,function-curve,moving-probe,probe-trace");
  assert.equal(snapshot.sceneBringToFrontMobjectAfterRenderGroupIds, "function-curve,moving-probe,probe-trace,axes");
  assert.equal(snapshot.sceneBringToFrontMobjectSourceContract, SCENE_BRING_TO_FRONT_MOBJECT_BRIDGE_SOURCE_CONTRACT);
  assert.equal(
    snapshot.sceneBringToFrontMobjectSummary,
    "scene-bring-to-front:axes:group=scene:moved=true:index=0->1:render=function-curve,moving-probe,probe-trace,axes"
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(attributes).filter(([key]) => key.startsWith("data-viz-scene-bring-to-front-mobject-"))
    ),
    expectedAttributes
  );
});

test("records Scene.send_to_back mobject bridge evidence for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const expectedPlan = buildSceneSendToBackMobjectBridgePlan({
    familyIndex: buildMobjectFamilyIndex(runtimeState.objectGraph),
    objectId: "function-curve",
    store: runtimeState.sceneGraph
  });
  const expectedAttributes = sceneSendToBackMobjectBridgeDataAttributes(expectedPlan);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec,
    sceneGraphEvidence: {
      sendToBackMobject: {
        objectId: "function-curve"
      }
    }
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.sceneSendToBackMobjectObjectId, "function-curve");
  assert.equal(snapshot.sceneSendToBackMobjectGroup, "scene");
  assert.equal(snapshot.sceneSendToBackMobjectMoved, true);
  assert.equal(snapshot.sceneSendToBackMobjectPreviousIndex, 1);
  assert.equal(snapshot.sceneSendToBackMobjectNextIndex, 0);
  assert.equal(snapshot.sceneSendToBackMobjectBeforeSceneIds, "axes,function-curve,moving-probe,probe-trace");
  assert.equal(snapshot.sceneSendToBackMobjectAfterSceneIds, "function-curve,moving-probe,probe-trace,axes");
  assert.equal(snapshot.sceneSendToBackMobjectBeforeRenderGroupIds, "axes,function-curve,moving-probe,probe-trace");
  assert.equal(snapshot.sceneSendToBackMobjectAfterRenderGroupIds, "function-curve,moving-probe,probe-trace,axes");
  assert.equal(snapshot.sceneSendToBackMobjectSourceContract, SCENE_SEND_TO_BACK_MOBJECT_BRIDGE_SOURCE_CONTRACT);
  assert.equal(
    snapshot.sceneSendToBackMobjectSummary,
    "scene-send-to-back:function-curve:group=scene:moved=true:index=1->0:render=function-curve,moving-probe,probe-trace,axes"
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(attributes).filter(([key]) => key.startsWith("data-viz-scene-send-to-back-mobject-"))
    ),
    expectedAttributes
  );
});

test("records Scene.replace mobject bridge evidence for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const expectedPlan = buildSceneReplaceMobjectBridgePlan({
    familyIndex: buildMobjectFamilyIndex(runtimeState.objectGraph),
    objectId: "axes",
    replacementIds: ["function-curve"],
    store: runtimeState.sceneGraph
  });
  const expectedAttributes = sceneReplaceMobjectBridgeDataAttributes(expectedPlan);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec,
    sceneGraphEvidence: {
      replaceMobject: {
        objectId: "axes",
        replacementIds: ["function-curve"]
      }
    }
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.sceneReplaceMobjectObjectId, "axes");
  assert.equal(snapshot.sceneReplaceMobjectRequestedReplacementIds, "function-curve");
  assert.equal(snapshot.sceneReplaceMobjectReplacementIds, "function-curve");
  assert.equal(snapshot.sceneReplaceMobjectReplacementCount, 1);
  assert.equal(snapshot.sceneReplaceMobjectGroup, "scene");
  assert.equal(snapshot.sceneReplaceMobjectReplaced, true);
  assert.equal(snapshot.sceneReplaceMobjectBeforeRenderGroupIds, "axes,function-curve,moving-probe,probe-trace");
  assert.equal(snapshot.sceneReplaceMobjectAfterRenderGroupIds, "function-curve,moving-probe,probe-trace");
  assert.equal(snapshot.sceneReplaceMobjectRemovedFamilyIds, "axes");
  assert.equal(snapshot.sceneReplaceMobjectRestoredReplacementFamilyIds, "none");
  assert.equal(snapshot.sceneReplaceMobjectSourceContract, SCENE_REPLACE_MOBJECT_BRIDGE_SOURCE_CONTRACT);
  assert.equal(
    snapshot.sceneReplaceMobjectSummary,
    "scene-replace:axes->function-curve:group=scene:replaced=true:removed=axes:restored=none"
  );
  assert.deepEqual(
    Object.fromEntries(Object.entries(attributes).filter(([key]) => key.startsWith("data-viz-scene-replace-mobject-"))),
    expectedAttributes
  );
});

test("records Scene.remove mobject bridge evidence for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const expectedPlan = buildSceneRemoveMobjectBridgePlan({
    familyIndex: buildMobjectFamilyIndex(runtimeState.objectGraph),
    objectId: "function-curve",
    store: runtimeState.sceneGraph
  });
  const expectedAttributes = sceneRemoveMobjectBridgeDataAttributes(expectedPlan);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec,
    sceneGraphEvidence: {
      removeMobject: {
        objectId: "function-curve"
      }
    }
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.sceneRemoveMobjectObjectId, "function-curve");
  assert.equal(snapshot.sceneRemoveMobjectRemoved, true);
  assert.equal(snapshot.sceneRemoveMobjectRemovedFamilyCount, 3);
  assert.equal(snapshot.sceneRemoveMobjectRemovedFamilyIds, "function-curve,moving-probe,probe-trace");
  assert.equal(snapshot.sceneRemoveMobjectDescendantRemovedIds, "moving-probe,probe-trace");
  assert.equal(snapshot.sceneRemoveMobjectBeforeRenderGroupIds, "axes,function-curve,moving-probe,probe-trace");
  assert.equal(snapshot.sceneRemoveMobjectAfterRenderGroupIds, "axes");
  assert.equal(snapshot.sceneRemoveMobjectSourceContract, SCENE_REMOVE_MOBJECT_BRIDGE_SOURCE_CONTRACT);
  assert.equal(
    snapshot.sceneRemoveMobjectSummary,
    "scene-remove:function-curve:removed=true:family=function-curve,moving-probe,probe-trace:descendants=moving-probe,probe-trace:render=axes"
  );
  assert.deepEqual(
    Object.fromEntries(Object.entries(attributes).filter(([key]) => key.startsWith("data-viz-scene-remove-mobject-"))),
    expectedAttributes
  );
});

test("records Scene assemble_render_groups batch evidence for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 3);
  const expectedPlan = buildSceneRenderBatches({
    objectGraph: runtimeState.objectGraph,
    renderGroups: runtimeState.sceneGraph.renderGroups
  });
  const expectedAttributes = sceneRenderBatchDataAttributes(expectedPlan);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimRenderBatchCount, expectedPlan.batchCount);
  assert.equal(snapshot.manimRenderBatchObjectCount, expectedPlan.objectCount);
  assert.equal(snapshot.manimRenderBatchIds, expectedPlan.batches.map((batch) => batch.batchId).join(",") || "none");
  assert.equal(snapshot.manimRenderBatchSkippedCount, expectedPlan.skippedObjectIds.length);
  assert.equal(snapshot.manimRenderBatchSkippedIds, expectedPlan.skippedObjectIds.join(",") || "none");
  assert.deepEqual(snapshot.manimRenderBatchRows, expectedPlan.batches);
  assert.equal(snapshot.manimRenderBatchSourceContract, expectedPlan.sourceContract);
  assert.equal(snapshot.manimRenderBatchSummary, expectedPlan.summary);
  assert.ok(snapshot.manimRenderBatchCount > 0);
  assert.equal(attributes["data-viz-manim-render-batch-count"], expectedAttributes["data-viz-manim-render-batch-count"]);
  assert.equal(attributes["data-viz-manim-render-batch-object-count"], expectedAttributes["data-viz-manim-render-batch-object-count"]);
  assert.equal(attributes["data-viz-manim-render-batch-ids"], expectedAttributes["data-viz-manim-render-batch-ids"]);
  assert.equal(attributes["data-viz-manim-render-batch-skipped-count"], expectedAttributes["data-viz-manim-render-batch-skipped-count"]);
  assert.equal(attributes["data-viz-manim-render-batch-skipped-ids"], expectedAttributes["data-viz-manim-render-batch-skipped-ids"]);
  assert.equal(attributes["data-viz-manim-render-batch-source-contract"], expectedAttributes["data-viz-manim-render-batch-source-contract"]);
  assert.equal(attributes["data-viz-manim-render-batch-summary"], expectedAttributes["data-viz-manim-render-batch-summary"]);
});

test("records wait_until stop-condition evidence for browser QA", () => {
  const scene: MathSceneSpec = {
    sceneId: "wait-until-evidence-test",
    familyId: "three-function-graph",
    coordinateSpace: {
      mathRange: { x: [-2, 2], y: [-2, 2], z: [-2, 2] },
      worldRange: { x: [-2, 2], y: [-2, 2], z: [-2, 2] }
    },
    objects: [
      { type: "axis3d", id: "axes", range: { x: [-2, 2], y: [-2, 2], z: [-2, 2] } }
    ],
    formulas: [],
    bindings: [],
    timeline: [
      { type: "wait", duration: 2, stopConditionId: "probe-near-target", stopConditionSatisfiedAt: 0.7 }
    ],
    cameraShots: [{ id: "overview", target: [0, 0, 0], position: [3, 3, 3], fov: 48 }],
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 }
  };
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState: buildMathSceneRuntimeState(scene, 0.5, { skipAnimations: true }),
    scene
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(attributes["data-viz-manim-time-progression-override-skip"], "true");
  assert.equal(attributes["data-viz-manim-time-progression-n-iterations"], "-1");
  assert.equal(attributes["data-viz-manim-wait-control-mode"], "wait-until");
  assert.equal(attributes["data-viz-manim-wait-control-stop-condition-id"], "probe-near-target");
  assert.equal(attributes["data-viz-manim-wait-control-stop-condition-satisfied"], "true");
  assert.equal(snapshot.manimWaitControlFramePolicy, SCENE_WAIT_CONTROL_FRAME_POLICY);
  assert.equal(snapshot.manimWaitControlSourceContract, SCENE_WAIT_CONTROL_SOURCE_CONTRACT);
  assert.equal(snapshot.manimWaitControlUpdaterPolicy, SCENE_WAIT_CONTROL_UPDATER_POLICY);
  assert.equal(snapshot.manimWaitFrameStepperSourceContract, SCENE_WAIT_FRAME_STEPPER_BRIDGE_SOURCE_CONTRACT);
  assert.equal(snapshot.manimWaitFrameStepperWaitFrameCount, 3);
  assert.equal(snapshot.manimWaitFrameStepperFrameStepCount, 3);
  assert.equal(snapshot.manimWaitFrameStepperMismatchCount, 0);
  assert.equal(snapshot.manimWaitFrameStepperSceneIds, "wait-until-evidence-test");
  assert.equal(snapshot.manimWaitFrameStepperUpdateFrameActions, "skip-return,skip-return,skip-return");
  assert.equal(snapshot.manimWaitFrameStepperUpdaterValueAfterFrames, "0.250,0.500,0.750");
  assert.equal(snapshot.manimWaitFrameStepperWaitUpdatesMobjects, "true,true,true");
  assert.equal(snapshot.manimWaitFrameStepperWaitTimes, "0.250,0.500,0.750");
  assert.equal(snapshot.manimWaitFrameStepperWriteFrameFlags, "false,false,false");
  assert.equal(attributes["data-viz-manim-wait-control-frame-policy"], SCENE_WAIT_CONTROL_FRAME_POLICY);
  assert.equal(snapshot.manimWaitControlFps, 4);
  assert.equal(snapshot.manimWaitControlFrameInterval, 0.25);
  assert.equal(attributes["data-viz-manim-wait-control-fps"], "4");
  assert.equal(attributes["data-viz-manim-wait-control-frame-interval"], "0.250");
  assert.equal(attributes["data-viz-manim-wait-control-source-contract"], SCENE_WAIT_CONTROL_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-wait-control-updater-policy"], SCENE_WAIT_CONTROL_UPDATER_POLICY);
  assert.equal(attributes["data-viz-manim-wait-control-called-emit-frame-count"], "3");
  assert.equal(attributes["data-viz-manim-wait-control-called-update-frame-count"], "3");
  assert.equal(attributes["data-viz-manim-wait-control-effective-duration"], "0.750");
  assert.equal(attributes["data-viz-manim-wait-control-emitted-frame-count"], "3");
  assert.deepEqual(snapshot.manimWaitControlEmittedTimes, [0.25, 0.5, 0.75]);
  assert.equal(attributes["data-viz-manim-wait-control-emitted-time-range"], "0.250..0.750");
  assert.equal(attributes["data-viz-manim-wait-control-emitted-times"], "0.250,0.500,0.750");
  assert.equal(
    attributes["data-viz-manim-wait-control-frame-operation-summary"],
    "waitFrameOps:update_frame>emit_frame:frames=3:update=3:emit=3:write=0:mobjects=3"
  );
  assert.equal(attributes["data-viz-manim-wait-control-update-mobject-frame-count"], "3");
  assert.equal(attributes["data-viz-manim-wait-control-update-mobject-total-dt"], "0.750");
  assert.equal(attributes["data-viz-manim-wait-control-increments-scene-time"], "true,true,true");
  assert.equal(attributes["data-viz-manim-wait-control-update-mobject-dts"], "0.250,0.250,0.250");
  assert.equal(attributes["data-viz-manim-wait-control-updates-mobjects"], "true,true,true");
  assert.equal(snapshot.manimWaitControlUpdaterFinalValue, 0.75);
  assert.deepEqual(snapshot.manimWaitControlUpdaterValues, [0.25, 0.5, 0.75]);
  assert.equal(
    snapshot.manimWaitControlUpdaterValueSummary,
    "waitUpdater:mode=wait-until:frames=3:final=0.750:values=0.250,0.500,0.750"
  );
  assert.equal(attributes["data-viz-manim-wait-control-updater-final-value"], "0.750");
  assert.equal(attributes["data-viz-manim-wait-control-updater-values"], "0.250,0.500,0.750");
  assert.equal(
    attributes["data-viz-manim-wait-control-updater-value-summary"],
    "waitUpdater:mode=wait-until:frames=3:final=0.750:values=0.250,0.500,0.750"
  );
  assert.equal(attributes["data-viz-manim-wait-control-updates-mobjects-during-wait"], "true");
  assert.equal(attributes["data-viz-manim-wait-control-updates-mobjects-while-skipping"], "true");
  assert.equal(attributes["data-viz-manim-wait-control-updates-mobjects-during-presenter-hold"], "false");
  assert.equal(
    attributes["data-viz-manim-wait-frame-stepper-source-contract"],
    SCENE_WAIT_FRAME_STEPPER_BRIDGE_SOURCE_CONTRACT
  );
  assert.equal(attributes["data-viz-manim-wait-frame-stepper-wait-frame-count"], "3");
  assert.equal(attributes["data-viz-manim-wait-frame-stepper-frame-step-count"], "3");
  assert.equal(attributes["data-viz-manim-wait-frame-stepper-mismatch-count"], "0");
  assert.equal(attributes["data-viz-manim-wait-frame-stepper-scene-ids"], "wait-until-evidence-test");
  assert.equal(attributes["data-viz-manim-wait-frame-stepper-update-frame-actions"], "skip-return,skip-return,skip-return");
  assert.equal(attributes["data-viz-manim-wait-frame-stepper-updater-active-counts"], "0,0,0");
  assert.equal(attributes["data-viz-manim-wait-frame-stepper-updater-suspended-counts"], "0,0,0");
  assert.equal(attributes["data-viz-manim-wait-frame-stepper-updater-value-after-frames"], "0.250,0.500,0.750");
  assert.equal(attributes["data-viz-manim-wait-frame-stepper-wait-updates-mobjects"], "true,true,true");
  assert.equal(attributes["data-viz-manim-wait-frame-stepper-wait-times"], "0.250,0.500,0.750");
  assert.equal(attributes["data-viz-manim-wait-frame-stepper-write-frame-flags"], "false,false,false");
});

test("records Scene.wait presenter-mode hold_loop evidence for browser QA", () => {
  const scene: MathSceneSpec = {
    sceneId: "presenter-hold-evidence-test",
    familyId: "three-function-graph",
    coordinateSpace: {
      mathRange: { x: [-2, 2], y: [-2, 2], z: [-2, 2] },
      worldRange: { x: [-2, 2], y: [-2, 2], z: [-2, 2] }
    },
    objects: [
      { type: "axis3d", id: "axes", range: { x: [-2, 2], y: [-2, 2], z: [-2, 2] } }
    ],
    formulas: [],
    bindings: [],
    timeline: [
      {
        type: "wait",
        duration: 2,
        holdOnWait: true,
        note: "teacher pause",
        presenterMode: true,
        presenterReleaseAfterFrames: 3
      }
    ],
    cameraShots: [{ id: "overview", target: [0, 0, 0], position: [3, 3, 3], fov: 48 }],
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 }
  };
  const presenterHoldPlan = buildScenePresenterHoldPlan({
    fps: 4,
    holdOnWait: true,
    note: "teacher pause",
    presenterMode: true,
    releaseAfterFrames: 3,
    skipAnimations: false
  });
  const expectedAttributes = scenePresenterHoldDataAttributes(presenterHoldPlan);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState: buildMathSceneRuntimeState(scene, 0.25),
    scene
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimWaitControlMode, "presenter-hold");
  assert.equal(snapshot.manimWaitControlEmittedFrameCount, 3);
  assert.equal(snapshot.manimWaitControlCalledEmitFrameCount, 0);
  assert.equal(snapshot.manimWaitControlCalledUpdateFrameCount, 3);
  assert.equal(
    snapshot.manimWaitControlFrameOperationSummary,
    "waitFrameOps:update_frame>hold_loop:frames=3:update=3:emit=0:write=0:mobjects=3"
  );
  assert.equal(snapshot.manimWaitControlUpdateMobjectFrameCount, 3);
  assert.equal(snapshot.manimWaitControlUpdateMobjectTotalDt, 0.75);
  assert.equal(snapshot.manimWaitControlUpdaterFinalValue, 0.75);
  assert.deepEqual(snapshot.manimWaitControlUpdaterValues, [0.25, 0.5, 0.75]);
  assert.equal(
    snapshot.manimWaitControlUpdaterValueSummary,
    "waitUpdater:mode=presenter-hold:frames=3:final=0.750:values=0.250,0.500,0.750"
  );
  assert.equal(snapshot.manimWaitControlUpdatesMobjectsDuringWait, true);
  assert.equal(snapshot.manimWaitControlUpdatesMobjectsWhileSkipping, false);
  assert.equal(snapshot.manimWaitControlUpdatesMobjectsDuringPresenterHold, true);
  assert.equal(snapshot.manimPresenterHoldDuration, presenterHoldPlan.holdDuration);
  assert.equal(snapshot.manimPresenterHoldFinalHoldOnWait, presenterHoldPlan.finalHoldOnWait);
  assert.equal(snapshot.manimPresenterHoldFrameCount, presenterHoldPlan.holdFrameCount);
  assert.equal(snapshot.manimPresenterHoldIgnore, presenterHoldPlan.ignorePresenterMode);
  assert.equal(snapshot.manimPresenterHoldMode, presenterHoldPlan.mode);
  assert.equal(snapshot.manimPresenterHoldNoteLogged, presenterHoldPlan.noteLogged);
  assert.equal(snapshot.manimPresenterHoldPresenterMode, presenterHoldPlan.presenterMode);
  assert.equal(snapshot.manimPresenterHoldReleaseEvent, presenterHoldPlan.releaseEvent);
  assert.equal(snapshot.manimPresenterHoldShouldUseTimelineWait, presenterHoldPlan.shouldUseTimelineWait);
  assert.equal(snapshot.manimPresenterHoldSkipAnimations, presenterHoldPlan.skipAnimations);
  assert.equal(snapshot.manimPresenterHoldSourceContract, expectedScenePresenterHoldSourceContract);
  assert.equal(snapshot.manimPresenterHoldSummary, presenterHoldPlan.summary);
  assert.equal(attributes["data-viz-manim-presenter-hold-duration"], expectedAttributes["data-viz-manim-presenter-hold-duration"]);
  assert.equal(attributes["data-viz-manim-presenter-hold-final-hold-on-wait"], expectedAttributes["data-viz-manim-presenter-hold-final-hold-on-wait"]);
  assert.equal(attributes["data-viz-manim-presenter-hold-frame-count"], expectedAttributes["data-viz-manim-presenter-hold-frame-count"]);
  assert.equal(attributes["data-viz-manim-presenter-hold-ignore"], expectedAttributes["data-viz-manim-presenter-hold-ignore"]);
  assert.equal(attributes["data-viz-manim-presenter-hold-mode"], expectedAttributes["data-viz-manim-presenter-hold-mode"]);
  assert.equal(attributes["data-viz-manim-presenter-hold-note-logged"], expectedAttributes["data-viz-manim-presenter-hold-note-logged"]);
  assert.equal(attributes["data-viz-manim-presenter-hold-presenter-mode"], expectedAttributes["data-viz-manim-presenter-hold-presenter-mode"]);
  assert.equal(attributes["data-viz-manim-presenter-hold-release-event"], expectedAttributes["data-viz-manim-presenter-hold-release-event"]);
  assert.equal(attributes["data-viz-manim-presenter-hold-should-use-timeline-wait"], expectedAttributes["data-viz-manim-presenter-hold-should-use-timeline-wait"]);
  assert.equal(attributes["data-viz-manim-presenter-hold-skip-animations"], expectedAttributes["data-viz-manim-presenter-hold-skip-animations"]);
  assert.equal(attributes["data-viz-manim-presenter-hold-source-contract"], expectedScenePresenterHoldSourceContract);
  assert.equal(attributes["data-viz-manim-presenter-hold-summary"], expectedAttributes["data-viz-manim-presenter-hold-summary"]);
  assert.equal(attributes["data-viz-manim-wait-control-update-mobject-frame-count"], "3");
  assert.equal(attributes["data-viz-manim-wait-control-update-mobject-total-dt"], "0.750");
  assert.equal(attributes["data-viz-manim-wait-control-increments-scene-time"], "true,true,true");
  assert.equal(attributes["data-viz-manim-wait-control-update-mobject-dts"], "0.250,0.250,0.250");
  assert.equal(attributes["data-viz-manim-wait-control-updates-mobjects"], "true,true,true");
  assert.equal(attributes["data-viz-manim-wait-control-updater-final-value"], "0.750");
  assert.equal(attributes["data-viz-manim-wait-control-updater-values"], "0.250,0.500,0.750");
  assert.equal(
    attributes["data-viz-manim-wait-control-updater-value-summary"],
    "waitUpdater:mode=presenter-hold:frames=3:final=0.750:values=0.250,0.500,0.750"
  );
  assert.equal(attributes["data-viz-manim-wait-control-updates-mobjects-during-wait"], "true");
  assert.equal(attributes["data-viz-manim-wait-control-updates-mobjects-while-skipping"], "false");
  assert.equal(attributes["data-viz-manim-wait-control-updates-mobjects-during-presenter-hold"], "true");
});

test("records Scene.add_sound cue evidence for browser QA", () => {
  const scene = {
    sceneId: "sound-cue-evidence-test",
    familyId: "three-function-graph",
    coordinateSpace: {
      mathRange: { x: [-2, 2], y: [-2, 2], z: [-2, 2] },
      worldRange: { x: [-2, 2], y: [-2, 2], z: [-2, 2] }
    },
    objects: [
      { type: "axis3d", id: "axes", range: { x: [-2, 2], y: [-2, 2], z: [-2, 2] } }
    ],
    formulas: [],
    bindings: [],
    timeline: [{ type: "wait", duration: 1 }],
    cameraShots: [{ id: "overview", target: [0, 0, 0], position: [3, 3, 3], fov: 48 }],
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    soundCues: [
      { id: "intro-chime", sceneTime: 0.25, soundFile: "intro-chime.wav", timeOffset: 0.25 },
      { id: "too-early", sceneTime: 0.1, soundFile: "too-early.wav", timeOffset: -0.2 }
    ]
  } as MathSceneSpec & {
    soundCues: Array<{ id: string; sceneTime: number; soundFile: string; timeOffset?: number }>;
  };
  const runtimeState = buildMathSceneRuntimeState(scene, 0.5);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene
  });
  const attributes = evidenceDataAttributes(snapshot);
  const skippedSnapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState: buildMathSceneRuntimeState(scene, 0.5, { skipAnimations: true }),
    scene
  });
  const skippedAttributes = evidenceDataAttributes(skippedSnapshot);
  const expectedAttributes = sceneSoundCueDataAttributes({
    audibleCueCount: snapshot.soundCueAudibleCount,
    cueCount: snapshot.soundCueCount,
    includesSound: snapshot.soundCueIncludesSound,
    issueCount: snapshot.soundCueIssueCount,
    rows: snapshot.soundCueRows,
    scheduledCueIds: snapshot.soundCueScheduledIds,
    skippedCueCount: snapshot.soundCueSkippedCount,
    sourceContract: snapshot.soundCueSourceContract,
    summary: snapshot.soundCueSummary
  });
  const expectedSkippedAttributes = sceneSoundCueDataAttributes({
    audibleCueCount: skippedSnapshot.soundCueAudibleCount,
    cueCount: skippedSnapshot.soundCueCount,
    includesSound: skippedSnapshot.soundCueIncludesSound,
    issueCount: skippedSnapshot.soundCueIssueCount,
    rows: skippedSnapshot.soundCueRows,
    scheduledCueIds: skippedSnapshot.soundCueScheduledIds,
    skippedCueCount: skippedSnapshot.soundCueSkippedCount,
    sourceContract: skippedSnapshot.soundCueSourceContract,
    summary: skippedSnapshot.soundCueSummary
  });

  assert.equal(attributes["data-viz-manim-sound-cue-count"], "2");
  assert.equal(attributes["data-viz-manim-sound-cue-audible-count"], "1");
  assert.equal(attributes["data-viz-manim-sound-cue-issue-count"], "1");
  assert.equal(attributes["data-viz-manim-sound-cue-includes-sound"], "true");
  assert.equal(attributes["data-viz-manim-sound-cue-scheduled-ids"], "intro-chime");
  assert.deepEqual(snapshot.soundCueRows.map((row) => row.status), ["scheduled", "negative-time"]);
  assert.equal(attributes["data-viz-manim-sound-cue-status-summary"], "intro-chime:scheduled|too-early:negative-time");
  assert.equal(attributes["data-viz-manim-sound-cue-scheduled-time-summary"], "intro-chime:0.500|too-early:-0.100");
  assert.equal(attributes["data-viz-manim-sound-cue-time-offset-summary"], "intro-chime:0.250|too-early:-0.200");
  assert.equal(snapshot.soundCueSourceContract, "Scene.add_sound|SceneFileWriter.add_sound|negative timestamp guard");
  for (const [attribute, expected] of Object.entries(expectedAttributes)) {
    assert.equal(attributes[attribute], expected, `${attribute} should come from sceneSoundCueDataAttributes`);
  }
  assert.equal(skippedAttributes["data-viz-manim-sound-cue-audible-count"], "0");
  assert.equal(skippedAttributes["data-viz-manim-sound-cue-skipped-count"], "2");
  assert.equal(skippedAttributes["data-viz-manim-sound-cue-includes-sound"], "false");
  assert.equal(skippedAttributes["data-viz-manim-sound-cue-status-summary"], "intro-chime:skip-animations|too-early:skip-animations");
  for (const [attribute, expected] of Object.entries(expectedSkippedAttributes)) {
    assert.equal(skippedAttributes[attribute], expected, `${attribute} should come from sceneSoundCueDataAttributes`);
  }
});

test("records Scene key, pick, pointer, floor-plane, and window-event source contracts for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const curveObject = runtimeState.objectGraph.byId["function-curve"];
  const pickPoint: Vec3 = curveObject?.boundingBox.kind === "finite" ? curveObject.boundingBox.center : [0, 0, 0];
  const expectedFloorPlaneAttributes = sceneFloorPlaneDataAttributes(buildSceneFloorPlanePlan({ plane: "xz" }));
  const expectedPointerAttributes = scenePointerControlDataAttributes(buildScenePointerControlPlan({
    eventType: "mouse-scroll",
    pixelHeight: 800,
    point: [1, 1, 0],
    scrollSensitivity: 0.3,
    yPixelOffset: 80
  }));
  const expectedWindowAttributes = sceneWindowEventDataAttributes(buildSceneWindowEventPlan({
    eventType: "resize",
    height: 720,
    width: 1280
  }));
  const snapshot = buildMathSceneEvidenceSnapshot({
    interactionEvidence: {
      floorPlane: { plane: "xz" },
      keyControl: {
        canUndo: true,
        commandOrCtrl: true,
        key: "z"
      },
      pick: {
        buff: 0.05,
        point: pickPoint,
        searchSetIds: ["function-curve"]
      },
      pointerControl: {
        eventType: "mouse-scroll",
        pixelHeight: 800,
        point: [1, 1, 0],
        scrollSensitivity: 0.3,
        yPixelOffset: 80
      },
      windowEvent: {
        eventType: "resize",
        height: 720,
        width: 1280
      }
    },
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);
  const expectedPickAttributes = scenePickDataAttributes({
    buff: snapshot.manimPickBuff,
    conceptId: snapshot.manimPickConceptId,
    distanceToCenter: snapshot.manimPickDistanceToCenter,
    group: snapshot.manimPickGroup as "scene",
    objectId: snapshot.manimPickObjectId,
    renderIndex: snapshot.manimPickRenderIndex,
    searchOrderIndex: snapshot.manimPickSearchOrderIndex,
    sourceContract: snapshot.manimPickSourceContract,
    summary: snapshot.manimPickSummary
  });
  const expectedKeyAttributes = sceneKeyControlDataAttributes({
    action: snapshot.manimKeyControlAction,
    canRedo: snapshot.manimKeyControlCanRedo,
    canUndo: snapshot.manimKeyControlCanUndo,
    dispatchesEvent: snapshot.manimKeyControlDispatchesEvent,
    eventType: snapshot.manimKeyControlEventType,
    finalHoldOnWait: snapshot.manimKeyControlFinalHoldOnWait,
    finalQuitInteraction: snapshot.manimKeyControlFinalQuitInteraction,
    key: snapshot.manimKeyControlKey,
    keyControlVersion: "mais-manim-key-controls/v1",
    normalizedKey: snapshot.manimKeyControlKey,
    playsCameraResetAnimation: snapshot.manimKeyControlPlaysCameraResetAnimation,
    preventsPropagation: snapshot.manimKeyControlPreventsPropagation,
    redoRequested: snapshot.manimKeyControlRedoRequested,
    releaseEvent: snapshot.manimKeyControlReleaseEvent as "none" | "space-or-right-arrow",
    resetKey: snapshot.manimKeyControlResetKey,
    sourceContract: snapshot.manimKeyControlSourceContract,
    summary: snapshot.manimKeyControlSummary,
    undoRequested: snapshot.manimKeyControlUndoRequested
  });

  assert.equal(snapshot.manimPointerControlEventType, "mouse-scroll");
  assert.equal(snapshot.manimPointerControlButton, null);
  assert.equal(snapshot.manimPointerControlButtons, null);
  assert.deepEqual(snapshot.manimPointerControlDeltaPoint, [0, 0, 0]);
  assert.equal(snapshot.manimPointerControlFrameAction, "scroll-scale");
  assert.deepEqual(snapshot.manimPointerControlFrameShift, [0, 0, 0]);
  assert.equal(snapshot.manimPointerControlModifiers, null);
  assert.deepEqual(snapshot.manimPointerControlOffset, [0, 0, 0]);
  assert.equal(snapshot.manimPointerControlPhiDelta, 0);
  assert.deepEqual(snapshot.manimPointerControlPoint, [1, 1, 0]);
  assert.deepEqual(snapshot.manimPointerControlScaleAboutPoint, [1, 1, 0]);
  assert.equal(snapshot.manimPointerControlScaleFactor, 0.97);
  assert.equal(snapshot.manimPointerControlScrollRelativeOffset, 0.1);
  assert.equal(snapshot.manimPointerControlSourceContract, expectedScenePointerControlSourceContract);
  assert.equal(snapshot.manimPointerControlSummary, "pointer:mouse-scroll:action=scroll-scale:stopped=false:window=true");
  assert.equal(snapshot.manimPointerControlThetaDelta, 0);
  assert.equal(snapshot.manimFloorPlane, "xz");
  assert.equal(snapshot.manimFloorPlaneError, "none");
  assert.equal(snapshot.manimFloorPlaneEulerAxes, "zxy");
  assert.equal(snapshot.manimFloorPlaneSourceContract, SCENE_FLOOR_PLANE_SOURCE_CONTRACT);
  assert.equal(snapshot.manimFloorPlaneValid, true);
  assert.equal(snapshot.manimKeyControlAction, "undo");
  assert.equal(snapshot.manimKeyControlDispatchesEvent, true);
  assert.equal(snapshot.manimKeyControlEventType, "key-press");
  assert.equal(snapshot.manimKeyControlKey, "z");
  assert.equal(snapshot.manimKeyControlSourceContract, expectedSceneKeyControlSourceContract);
  assert.equal(snapshot.manimKeyControlUndoRequested, true);
  assert.equal(snapshot.manimKeyControlSummary, "keyControl:key-press:z:action=undo:quit=false:hold=true");
  assert.equal(snapshot.manimPickHit, true);
  assert.equal(snapshot.manimPickObjectId, "function-curve");
  assert.equal(snapshot.manimPickConceptId, "function-rule");
  assert.equal(snapshot.manimPickGroup, "scene");
  assert.ok(Math.abs(snapshot.manimPickDistanceToCenter - 0.45629657758759135) < 1e-12);
  assert.equal(snapshot.manimPickRenderIndex, 1);
  assert.equal(snapshot.manimPickSearchOrderIndex, 0);
  assert.equal(snapshot.manimPickSourceContract, SCENE_PICKING_SOURCE_CONTRACT);
  assert.equal(snapshot.manimPickSummary, "pick:hit:function-curve:group=scene:renderIndex=1:buff=0.05");
  assert.equal(snapshot.manimWindowEventType, "resize");
  assert.equal(snapshot.manimWindowCallsFocus, false);
  assert.equal(snapshot.manimWindowReturnedEarly, false);
  assert.equal(snapshot.manimWindowSourceContract, SCENE_WINDOW_EVENT_SOURCE_CONTRACT);
  assert.equal(snapshot.manimWindowWidth, 1280);
  assert.equal(snapshot.manimWindowHeight, 720);
  for (const [attribute, expected] of Object.entries(expectedPointerAttributes)) {
    assert.equal(attributes[attribute], expected, `${attribute} should come from scenePointerControlDataAttributes`);
  }
  assert.equal(attributes["data-viz-manim-floor-plane"], expectedFloorPlaneAttributes["data-viz-manim-floor-plane"]);
  assert.equal(attributes["data-viz-manim-floor-plane-error"], expectedFloorPlaneAttributes["data-viz-manim-floor-plane-error"]);
  assert.equal(attributes["data-viz-manim-floor-plane-euler-axes"], expectedFloorPlaneAttributes["data-viz-manim-floor-plane-euler-axes"]);
  assert.equal(attributes["data-viz-manim-floor-plane-raises-error"], expectedFloorPlaneAttributes["data-viz-manim-floor-plane-raises-error"]);
  assert.equal(
    attributes["data-viz-manim-floor-plane-source-contract"],
    expectedFloorPlaneAttributes["data-viz-manim-floor-plane-source-contract"]
  );
  assert.equal(attributes["data-viz-manim-floor-plane-summary"], expectedFloorPlaneAttributes["data-viz-manim-floor-plane-summary"]);
  assert.equal(attributes["data-viz-manim-floor-plane-valid"], expectedFloorPlaneAttributes["data-viz-manim-floor-plane-valid"]);
  for (const [attribute, expected] of Object.entries(expectedKeyAttributes)) {
    assert.equal(attributes[attribute], expected, `${attribute} should come from sceneKeyControlDataAttributes`);
  }
  assert.equal(attributes["data-viz-manim-pick-hit"], "true");
  assert.equal(attributes["data-viz-manim-pick-object-id"], expectedPickAttributes["data-viz-manim-pick-object-id"]);
  assert.equal(attributes["data-viz-manim-pick-concept-id"], expectedPickAttributes["data-viz-manim-pick-concept-id"]);
  assert.equal(
    attributes["data-viz-manim-pick-distance-to-center"],
    expectedPickAttributes["data-viz-manim-pick-distance-to-center"]
  );
  assert.equal(attributes["data-viz-manim-pick-group"], expectedPickAttributes["data-viz-manim-pick-group"]);
  assert.equal(attributes["data-viz-manim-pick-render-index"], expectedPickAttributes["data-viz-manim-pick-render-index"]);
  assert.equal(
    attributes["data-viz-manim-pick-search-order-index"],
    expectedPickAttributes["data-viz-manim-pick-search-order-index"]
  );
  assert.equal(attributes["data-viz-manim-pick-source-contract"], expectedPickAttributes["data-viz-manim-pick-source-contract"]);
  assert.equal(attributes["data-viz-manim-pick-summary"], expectedPickAttributes["data-viz-manim-pick-summary"]);
  assert.equal(attributes["data-viz-manim-window-event-type"], "resize");
  assert.equal(attributes["data-viz-manim-window-calls-focus"], "false");
  assert.equal(attributes["data-viz-manim-window-returned-early"], "false");
  assert.equal(
    attributes["data-viz-manim-window-source-contract"],
    expectedWindowAttributes["data-viz-manim-window-source-contract"]
  );
  assert.equal(attributes["data-viz-manim-window-width"], expectedWindowAttributes["data-viz-manim-window-width"]);
  assert.equal(attributes["data-viz-manim-window-height"], expectedWindowAttributes["data-viz-manim-window-height"]);
  assert.equal(attributes["data-viz-manim-window-summary"], snapshot.manimWindowSummary);
});

test("records Scene.run lifecycle source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 11.2);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimSceneRunActivePhase, "interact");
  assert.equal(snapshot.manimSceneRunActivePhaseIndex, 3);
  assert.equal(snapshot.manimSceneRunConstructComplete, true);
  assert.equal(snapshot.manimSceneRunElapsedSeconds, 10.84);
  assert.equal(snapshot.manimSceneRunInteractEnabled, true);
  assert.equal(snapshot.manimSceneRunNumPlays, functionGraphSpec.timeline.length);
  assert.equal(snapshot.manimSceneRunPhaseCount, 5);
  assert.equal(
    snapshot.manimSceneRunPhaseStatusSummary,
    "setup=complete,construct=complete,play=complete,interact=active,tearDown=pending"
  );
  assert.equal(snapshot.manimSceneRunPlayDurationSeconds, 10.84);
  assert.equal(snapshot.manimSceneRunReady, true);
  assert.equal(snapshot.manimSceneRunSceneId, "mais-manim-function-graph");
  assert.match(snapshot.manimSceneRunSceneSignature, /^rng-[0-9a-f]{8}$/);
  assert.equal(snapshot.manimSceneRunSetupComplete, true);
  assert.match(snapshot.manimSceneRunSignature, /^scene-run-[0-9a-f]{8}$/);
  assert.equal(snapshot.manimSceneRunSourceContract, SCENE_RUN_LIFECYCLE_SOURCE_CONTRACT);
  assert.equal(snapshot.manimSceneRunSkippedPhaseCount, 0);
  assert.equal(snapshot.manimSceneRunSkippedPhaseIds, "none");
  assert.equal(snapshot.manimSceneRunSummary, "mais-manim-function-graph:phase=interact:interactive=true:teardown=false");
  assert.equal(snapshot.manimSceneRunTearDownReady, false);
  assert.equal(snapshot.manimSceneRunTotalDuration, 10.84);
  assert.equal(attributes["data-viz-manim-scene-run-active-phase"], "interact");
  assert.equal(attributes["data-viz-manim-scene-run-elapsed-seconds"], "10.840");
  assert.equal(attributes["data-viz-manim-scene-run-interactive"], "true");
  assert.equal(attributes["data-viz-manim-scene-run-num-plays"], String(functionGraphSpec.timeline.length));
  assert.equal(attributes["data-viz-manim-scene-run-phase-count"], "5");
  assert.equal(
    attributes["data-viz-manim-scene-run-phase-status-summary"],
    "setup=complete,construct=complete,play=complete,interact=active,tearDown=pending"
  );
  assert.equal(attributes["data-viz-manim-scene-run-ready"], "true");
  assert.equal(attributes["data-viz-manim-scene-run-source-contract"], SCENE_RUN_LIFECYCLE_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-scene-run-call-order"], "setup>construct>play>interact");
  assert.equal(attributes["data-viz-manim-scene-run-scene-id"], "mais-manim-function-graph");
  assert.equal(attributes["data-viz-manim-scene-run-signature"], snapshot.manimSceneRunSignature);
  assert.equal(attributes["data-viz-manim-scene-run-skipped-phase-count"], "0");
  assert.equal(attributes["data-viz-manim-scene-run-skipped-phase-ids"], "none");
  assert.equal(attributes["data-viz-manim-scene-run-summary"], snapshot.manimSceneRunSummary);
  assert.equal(attributes["data-viz-manim-scene-run-teardown-actions"], "pending");
  assert.equal(attributes["data-viz-manim-scene-run-teardown-ready"], "false");
  assert.equal(attributes["data-viz-manim-scene-run-total-duration"], "10.840");

  assert.equal(snapshot.manimSceneRunInteractActivePhase, "interact");
  assert.equal(snapshot.manimSceneRunInteractCallsInteract, true);
  assert.equal(snapshot.manimSceneRunInteractBridgeEnabled, true);
  assert.equal(snapshot.manimSceneRunInteractLoopFrameCount, 0);
  assert.equal(snapshot.manimSceneRunInteractLoopHasWindow, false);
  assert.equal(snapshot.manimSceneRunInteractReadyForTearDown, true);
  assert.equal(snapshot.manimSceneRunInteractSceneId, "mais-manim-function-graph");
  assert.equal(snapshot.manimSceneRunInteractSourceContract, SCENE_RUN_INTERACT_BRIDGE_SOURCE_CONTRACT);
  assert.equal(snapshot.manimSceneRunInteractStatePolicy, SCENE_INTERACT_LOOP_STATE_POLICY);
  assert.equal(snapshot.manimSceneRunInteractStatus, "returned-no-window");
  assert.equal(
    snapshot.manimSceneRunInteractSummary,
    "scene-run-interact:mais-manim-function-graph:phase=interact:termination=no-window:status=returned-no-window:teardown=true"
  );
  assert.equal(snapshot.manimSceneRunInteractTermination, "no-window");
  assert.equal(snapshot.manimSceneRunInteractUpdateFrameCallCount, 0);
  assert.equal(attributes["data-viz-manim-scene-run-interact-active-phase"], "interact");
  assert.equal(attributes["data-viz-manim-scene-run-interact-calls-interact"], "true");
  assert.equal(attributes["data-viz-manim-scene-run-interact-enabled"], "true");
  assert.equal(attributes["data-viz-manim-scene-run-interact-loop-frame-count"], "0");
  assert.equal(attributes["data-viz-manim-scene-run-interact-loop-has-window"], "false");
  assert.equal(attributes["data-viz-manim-scene-run-interact-ready-for-teardown"], "true");
  assert.equal(attributes["data-viz-manim-scene-run-interact-scene-id"], "mais-manim-function-graph");
  assert.equal(attributes["data-viz-manim-scene-run-interact-source-contract"], SCENE_RUN_INTERACT_BRIDGE_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-scene-run-interact-state-policy"], SCENE_INTERACT_LOOP_STATE_POLICY);
  assert.equal(attributes["data-viz-manim-scene-run-interact-status"], "returned-no-window");
  assert.equal(attributes["data-viz-manim-scene-run-interact-summary"], snapshot.manimSceneRunInteractSummary);
  assert.equal(attributes["data-viz-manim-scene-run-interact-termination"], "no-window");
  assert.equal(attributes["data-viz-manim-scene-run-interact-update-frame-count"], "0");
});

test("records Scene.interact loop source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 11.2);
  const interactLoopEvidence = {
    fps: 4,
    hasWindow: true,
    initialSceneTimeSeconds: runtimeState.timeline.elapsedSeconds,
    initialSkipAnimations: true,
    maxFrames: 5,
    renderGroupIds: ["axes", "function-curve"],
    windowClosesAtFrame: 2
  };
  const expectedPlan = buildSceneInteractLoopPlan(interactLoopEvidence);
  const expectedAttributes = sceneInteractLoopDataAttributes(expectedPlan);
  const snapshot = buildMathSceneEvidenceSnapshot({
    interactLoopEvidence,
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);
  const expectedRunLifecycle = buildMathSceneRunLifecyclePlan({
    elapsedSeconds: runtimeState.timeline.elapsedSeconds,
    scene: functionGraphSpec,
    sceneSignature: snapshot.manimSceneRunSceneSignature
  });
  const expectedRunInteractBridge = buildSceneRunInteractBridgePlan({
    interactLoopPlan: expectedPlan,
    sceneRunLifecycle: expectedRunLifecycle
  });
  const expectedRunInteractAttributes = sceneRunInteractBridgeDataAttributes(expectedRunInteractBridge);

  assert.equal(snapshot.manimInteractLoopHasWindow, true);
  assert.equal(snapshot.manimInteractLoopLogsInteractionTips, true);
  assert.equal(snapshot.manimInteractLoopSetsSkipAnimationsFalse, true);
  assert.equal(snapshot.manimInteractLoopInitialSkipAnimations, true);
  assert.equal(snapshot.manimInteractLoopFinalSkipAnimations, false);
  assert.equal(snapshot.manimInteractLoopDtSeconds, 0.25);
  assert.equal(snapshot.manimInteractLoopFrameCount, 2);
  assert.deepEqual(snapshot.manimInteractLoopFrames, expectedPlan.frames);
  assert.equal(snapshot.manimInteractLoopMaxFrames, 5);
  assert.equal(snapshot.manimInteractLoopSourceContract, SCENE_INTERACT_LOOP_SOURCE_CONTRACT);
  assert.equal(snapshot.manimInteractLoopStatePolicy, SCENE_INTERACT_LOOP_STATE_POLICY);
  assert.equal(snapshot.manimInteractLoopTermination, "window-closing");
  assert.equal(snapshot.manimInteractLoopUpdateFrameCallCount, 2);
  assert.equal(snapshot.manimInteractLoopUpdateFrameActions, "capture,capture");
  assert.equal(snapshot.manimInteractLoopFinalSceneTimeSeconds, 11.34);
  assert.equal(snapshot.manimInteractLoopSummary, expectedPlan.summary);
  assert.equal(attributes["data-viz-manim-interact-dt"], expectedAttributes["data-viz-manim-interact-dt"]);
  assert.equal(attributes["data-viz-manim-interact-final-scene-time"], "11.340");
  assert.equal(attributes["data-viz-manim-interact-frame-count"], "2");
  assert.equal(attributes["data-viz-manim-interact-has-window"], "true");
  assert.equal(attributes["data-viz-manim-interact-logs-tips"], "true");
  assert.equal(attributes["data-viz-manim-interact-sets-skip-false"], "true");
  assert.equal(attributes["data-viz-manim-interact-source-contract"], expectedAttributes["data-viz-manim-interact-source-contract"]);
  assert.equal(attributes["data-viz-manim-interact-state-policy"], expectedAttributes["data-viz-manim-interact-state-policy"]);
  assert.equal(attributes["data-viz-manim-interact-summary"], expectedAttributes["data-viz-manim-interact-summary"]);
  assert.equal(attributes["data-viz-manim-interact-termination"], "window-closing");
  assert.equal(attributes["data-viz-manim-interact-update-frame-actions"], "capture,capture");
  assert.equal(attributes["data-viz-manim-interact-update-frame-count"], "2");
  assert.equal(snapshot.manimSceneRunInteractStatus, "window-closing");
  assert.equal(snapshot.manimSceneRunInteractReadyForTearDown, true);
  assert.equal(snapshot.manimSceneRunInteractLoopFrameCount, 2);
  assert.equal(snapshot.manimSceneRunInteractTermination, "window-closing");
  assert.equal(snapshot.manimSceneRunInteractCallOrderSummary, expectedRunInteractBridge.callOrderSummary);
  assert.deepEqual(
    Object.fromEntries(Object.entries(attributes).filter(([key]) => key.startsWith("data-viz-manim-scene-run-interact-"))),
    expectedRunInteractAttributes
  );
});

test("records authoring state snapshot source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec,
    stateSnapshotEvidence: {
      authoringMode: "run-from-beat",
      checkpointKeys: ["intro", "curve reveal"],
      frameIndex: 12,
      historySummary: {
        canRedo: false,
        canUndo: true,
        currentLabel: "curve reveal",
        droppedUndoCount: 2,
        maxUndoEntries: 20,
        redoCount: 0,
        revision: 2,
        undoCount: 1
      },
      playbackState: "checkpoint",
      selectedParameterId: "value"
    }
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimStateSnapshotActiveStep, "revealCurve");
  assert.equal(snapshot.manimStateSnapshotAuthoringMode, "run-from-beat");
  assert.equal(snapshot.manimStateSnapshotCameraMode, "guided");
  assert.equal(snapshot.manimStateSnapshotCameraShot, "overview");
  assert.equal(snapshot.manimStateSnapshotCheckpointCount, 2);
  assert.equal(snapshot.manimStateSnapshotElapsedSeconds, 0);
  assert.equal(snapshot.manimStateSnapshotFrameIndex, 12);
  assert.equal(snapshot.manimStateSnapshotHistoryDroppedUndoCount, 2);
  assert.equal(snapshot.manimStateSnapshotHistoryMaxUndoEntries, 20);
  assert.equal(snapshot.manimStateSnapshotHistoryRevision, 2);
  assert.equal(snapshot.manimStateSnapshotPlaybackState, "checkpoint");
  assert.equal(snapshot.manimStateSnapshotReady, true);
  assert.equal(snapshot.manimStateSnapshotSceneId, "mais-manim-function-graph");
  assert.equal(snapshot.manimStateSnapshotSelectedParameterId, "value");
  assert.equal(snapshot.manimStateSnapshotSourceContract, SCENE_STATE_SNAPSHOT_SOURCE_CONTRACT);
  assert.equal(snapshot.manimStateSnapshotObjectIds, "axes,function-curve,moving-probe,probe-trace");
  assert.equal(snapshot.manimStateSnapshotRootIds, "axes,function-curve");
  assert.equal(snapshot.manimStateSnapshotFamilyRootIds, "axes,function-curve");
  assert.equal(
    snapshot.manimStateSnapshotObjectIdentitySummary,
    "objects=axes,function-curve,moving-probe,probe-trace;roots=axes,function-curve;families=axes,function-curve"
  );
  assert.match(snapshot.manimStateSnapshotSignature, /^snapshot-[0-9a-f]{8}$/);
  assert.equal(
    snapshot.manimStateSnapshotSummary,
    "snapshot:mais-manim-function-graph:revealCurve:camera=overview:elapsed=0.000:checkpoints=2:history=2"
  );
  assert.equal(attributes["data-viz-manim-state-snapshot-active-step"], "revealCurve");
  assert.equal(attributes["data-viz-manim-state-snapshot-camera-shot"], "overview");
  assert.equal(attributes["data-viz-manim-state-snapshot-checkpoint-count"], "2");
  assert.equal(attributes["data-viz-manim-state-snapshot-elapsed-seconds"], "0.000");
  assert.equal(attributes["data-viz-manim-state-snapshot-frame-index"], "12");
  assert.equal(attributes["data-viz-manim-state-snapshot-history-dropped-undo-count"], "2");
  assert.equal(attributes["data-viz-manim-state-snapshot-history-max-undo-entries"], "20");
  assert.equal(attributes["data-viz-manim-state-snapshot-history-revision"], "2");
  assert.equal(attributes["data-viz-manim-state-snapshot-object-ids"], "axes,function-curve,moving-probe,probe-trace");
  assert.equal(attributes["data-viz-manim-state-snapshot-root-ids"], "axes,function-curve");
  assert.equal(attributes["data-viz-manim-state-snapshot-family-root-ids"], "axes,function-curve");
  assert.equal(
    attributes["data-viz-manim-state-snapshot-object-identity-summary"],
    "objects=axes,function-curve,moving-probe,probe-trace;roots=axes,function-curve;families=axes,function-curve"
  );
  assert.equal(attributes["data-viz-manim-state-snapshot-ready"], "true");
  assert.equal(attributes["data-viz-manim-state-snapshot-scene-id"], "mais-manim-function-graph");
  assert.equal(attributes["data-viz-manim-state-snapshot-signature"], snapshot.manimStateSnapshotSignature);
  assert.equal(attributes["data-viz-manim-state-snapshot-source-contract"], SCENE_STATE_SNAPSHOT_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-state-snapshot-summary"], snapshot.manimStateSnapshotSummary);
});

test("records scene-selector catalog source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const sceneSelectorEvidence = {
    accent: "#22d3ee",
    selectedFamilyId: "three-function-graph",
    state: {
      comparison: 5,
      depthValue: 1.4,
      familyId: "three-function-graph" as const,
      mode: 0,
      primaryValue: 6,
      secondaryValue: 5,
      stateSummary: "family=three-function-graph;template=function-graph;value=6.000;comparison=5.000;depth=1.400",
      templateId: "function-graph" as const,
      value: 6
    }
  };
  const catalog = buildMathSceneSelectorCatalog(sceneSelectorEvidence);
  const expectedSummary = summarizeMathSceneSelectorCatalog(catalog, sceneSelectorEvidence.selectedFamilyId);
  const expectedAttributes = mathSceneSelectorDataAttributes(expectedSummary);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec,
    sceneSelectorEvidence
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimSceneSelectorApprovedCount, expectedSummary.approvedSceneCount);
  assert.equal(snapshot.manimSceneSelectorCount, expectedSummary.sceneCount);
  assert.equal(snapshot.manimSceneSelectorFamilyIds, expectedSummary.familyIds);
  assert.equal(snapshot.manimSceneSelectorSceneIds, expectedSummary.sceneIds);
  assert.equal(snapshot.manimSceneSelectorSelectedFamilyId, "three-function-graph");
  assert.equal(snapshot.manimSceneSelectorSelectedSceneId, "mais-manim-function-graph");
  assert.equal(snapshot.manimSceneSelectorSummary, expectedSummary.summary);
  assert.ok(snapshot.manimSceneSelectorFamilyIds.includes("three-function-graph"));
  assert.ok(snapshot.manimSceneSelectorSceneIds.includes("mais-manim-function-graph"));
  assert.equal(attributes["data-viz-manim-scene-selector-approved-count"], expectedAttributes["data-viz-manim-scene-selector-approved-count"]);
  assert.equal(attributes["data-viz-manim-scene-selector-count"], expectedAttributes["data-viz-manim-scene-selector-count"]);
  assert.equal(attributes["data-viz-manim-scene-selector-family-ids"], expectedAttributes["data-viz-manim-scene-selector-family-ids"]);
  assert.equal(attributes["data-viz-manim-scene-selector-scene-ids"], expectedAttributes["data-viz-manim-scene-selector-scene-ids"]);
  assert.equal(attributes["data-viz-manim-scene-selector-selected-family-id"], "three-function-graph");
  assert.equal(attributes["data-viz-manim-scene-selector-selected-scene-id"], "mais-manim-function-graph");
  assert.equal(attributes["data-viz-manim-scene-selector-summary"], expectedAttributes["data-viz-manim-scene-selector-summary"]);
});

test("records TeX color-map source contract for formula-token browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const expectedColorMap = buildTexColorMap(functionGraphSpec);
  const expectedAttributes = texColorMapDataAttributes(expectedColorMap);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.deepEqual(snapshot.manimTexColorMapEntries, expectedColorMap.entries);
  assert.equal(snapshot.manimTexColorMapEntryCount, expectedColorMap.entryCount);
  assert.equal(snapshot.manimTexColorMapTokenCount, expectedColorMap.tokenCount);
  assert.equal(snapshot.manimTexColorMapBoundTokenCount, expectedColorMap.boundTokenCount);
  assert.equal(snapshot.manimTexColorMapSourceContract, "Tex.tex_to_color_map|Tex.t2c|Tex.isolate");
  assert.equal(snapshot.manimTexColorMapBindingSourceCount, expectedColorMap.colorSourceCounts.binding);
  assert.equal(snapshot.manimTexColorMapTexIsolationSourceCount, expectedColorMap.colorSourceCounts["tex-isolation"]);
  assert.equal(snapshot.manimTexColorMapReferenceSourceCount, expectedColorMap.colorSourceCounts.reference);
  assert.equal(snapshot.manimTexColorMapSourceSummary, expectedColorMap.colorSourceSummary);
  assert.equal(snapshot.manimTexColorMapTexIsolatedTokenCount, expectedColorMap.texIsolatedTokenCount);
  assert.equal(snapshot.manimTexColorMapTexIsolationSelectorCount, expectedColorMap.texIsolationSelectorCount);
  assert.equal(snapshot.manimTexColorMapUnmatchedTokenCount, expectedColorMap.unmatchedTokenCount);
  assert.equal(snapshot.manimTexColorMapRoleCount, expectedColorMap.colorRoles.length);
  assert.equal(snapshot.manimTexColorMapRoles, "function,probe");
  assert.equal(snapshot.manimTexColorMapTokenIds, "function-token,point-token");
  assert.equal(snapshot.manimTexColorMapSummary, expectedColorMap.summary);
  assert.equal(attributes["data-viz-manim-tex-color-map-scene-id"], expectedAttributes["data-viz-manim-tex-color-map-scene-id"]);
  assert.equal(attributes["data-viz-manim-tex-color-map-entry-count"], expectedAttributes["data-viz-manim-tex-color-map-entry-count"]);
  assert.equal(attributes["data-viz-manim-tex-color-map-token-count"], expectedAttributes["data-viz-manim-tex-color-map-token-count"]);
  assert.equal(
    attributes["data-viz-manim-tex-color-map-bound-token-count"],
    expectedAttributes["data-viz-manim-tex-color-map-bound-token-count"]
  );
  assert.equal(
    attributes["data-viz-manim-tex-color-map-source-contract"],
    expectedAttributes["data-viz-manim-tex-color-map-source-contract"]
  );
  assert.equal(
    attributes["data-viz-manim-tex-color-map-binding-source-count"],
    expectedAttributes["data-viz-manim-tex-color-map-binding-source-count"]
  );
  assert.equal(
    attributes["data-viz-manim-tex-color-map-tex-isolation-source-count"],
    expectedAttributes["data-viz-manim-tex-color-map-tex-isolation-source-count"]
  );
  assert.equal(
    attributes["data-viz-manim-tex-color-map-reference-source-count"],
    expectedAttributes["data-viz-manim-tex-color-map-reference-source-count"]
  );
  assert.equal(
    attributes["data-viz-manim-tex-color-map-source-summary"],
    expectedAttributes["data-viz-manim-tex-color-map-source-summary"]
  );
  assert.equal(
    attributes["data-viz-manim-tex-color-map-tex-isolated-token-count"],
    expectedAttributes["data-viz-manim-tex-color-map-tex-isolated-token-count"]
  );
  assert.equal(
    attributes["data-viz-manim-tex-color-map-tex-isolation-selector-count"],
    expectedAttributes["data-viz-manim-tex-color-map-tex-isolation-selector-count"]
  );
  assert.equal(
    attributes["data-viz-manim-tex-color-map-unmatched-token-count"],
    expectedAttributes["data-viz-manim-tex-color-map-unmatched-token-count"]
  );
  assert.equal(
    attributes["data-viz-manim-tex-color-map-unmatched-selector-count"],
    expectedAttributes["data-viz-manim-tex-color-map-unmatched-selector-count"]
  );
  assert.equal(
    attributes["data-viz-manim-tex-color-map-unmatched-selectors"],
    expectedAttributes["data-viz-manim-tex-color-map-unmatched-selectors"]
  );
  assert.equal(attributes["data-viz-manim-tex-color-map-role-count"], expectedAttributes["data-viz-manim-tex-color-map-role-count"]);
  assert.equal(attributes["data-viz-manim-tex-color-map-summary"], expectedAttributes["data-viz-manim-tex-color-map-summary"]);
});

test("records TeX colorized-formula source contract on the root evidence surface", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const formulaLayer = buildFormulaLayerState(functionGraphSpec);
  const expectedColorizedFormula = buildTexColorizedFormula(formulaLayer.formulas[0]);
  const expectedAttributes = texColorizedFormulaDataAttributes(expectedColorizedFormula);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimTexColorizedFormulaId, expectedColorizedFormula.formulaId);
  assert.equal(snapshot.manimTexColorizedSourceContract, TEX_COLORIZED_FORMULA_SOURCE_CONTRACT);
  assert.equal(snapshot.manimTexColorizedTokenCount, expectedColorizedFormula.tokenCount);
  assert.equal(snapshot.manimTexColorizedColoredTokenCount, expectedColorizedFormula.coloredTokenCount);
  assert.equal(snapshot.manimTexColorizedUncoloredTokenCount, expectedColorizedFormula.uncoloredTokenCount);
  assert.equal(snapshot.manimTexColorizedSourceCharacterCount, expectedColorizedFormula.sourceCharacterCount);
  assert.equal(snapshot.manimTexColorizedColoredCharacterCount, expectedColorizedFormula.coloredCharacterCount);
  assert.equal(snapshot.manimTexColorizedCoverageRatio, expectedColorizedFormula.coverageRatio);
  assert.equal(snapshot.manimTexColorizedCoverageSummary, expectedColorizedFormula.coverageSummary);
  assert.equal(snapshot.manimTexColorizedIntervalOrderSummary, expectedColorizedFormula.intervalOrderSummary);
  assert.equal(snapshot.manimTexColorizedColoredTokenIds, expectedColorizedFormula.coloredTokenIds.join(",") || "none");
  assert.equal(snapshot.manimTexColorizedUncoloredTokenIds, expectedColorizedFormula.uncoloredTokenIds.join(",") || "none");
  assert.equal(snapshot.manimTexColorizedRoleSummary, expectedColorizedFormula.roleSummary);
  assert.equal(snapshot.manimTexColorizedIntervalSummary, expectedColorizedFormula.intervalSummary);
  assert.equal(snapshot.manimTexColorizedSummary, expectedColorizedFormula.summary);
  assert.equal(
    attributes["data-viz-manim-tex-colorized-formula-id"],
    expectedAttributes["data-viz-manim-tex-colorized-formula-id"]
  );
  assert.equal(
    attributes["data-viz-manim-tex-colorized-source-contract"],
    expectedAttributes["data-viz-manim-tex-colorized-source-contract"]
  );
  assert.equal(
    attributes["data-viz-manim-tex-colorized-token-count"],
    expectedAttributes["data-viz-manim-tex-colorized-token-count"]
  );
  assert.equal(
    attributes["data-viz-manim-tex-colorized-colored-token-count"],
    expectedAttributes["data-viz-manim-tex-colorized-colored-token-count"]
  );
  assert.equal(
    attributes["data-viz-manim-tex-colorized-source-character-count"],
    expectedAttributes["data-viz-manim-tex-colorized-source-character-count"]
  );
  assert.equal(
    attributes["data-viz-manim-tex-colorized-colored-character-count"],
    expectedAttributes["data-viz-manim-tex-colorized-colored-character-count"]
  );
  assert.equal(
    attributes["data-viz-manim-tex-colorized-coverage-ratio"],
    expectedAttributes["data-viz-manim-tex-colorized-coverage-ratio"]
  );
  assert.equal(
    attributes["data-viz-manim-tex-colorized-coverage-summary"],
    expectedAttributes["data-viz-manim-tex-colorized-coverage-summary"]
  );
  assert.equal(
    attributes["data-viz-manim-tex-colorized-interval-order-summary"],
    expectedAttributes["data-viz-manim-tex-colorized-interval-order-summary"]
  );
  assert.equal(
    attributes["data-viz-manim-tex-colorized-colored-token-ids"],
    expectedAttributes["data-viz-manim-tex-colorized-colored-token-ids"]
  );
  assert.equal(
    attributes["data-viz-manim-tex-colorized-uncolored-token-count"],
    expectedAttributes["data-viz-manim-tex-colorized-uncolored-token-count"]
  );
  assert.equal(
    attributes["data-viz-manim-tex-colorized-uncolored-token-ids"],
    expectedAttributes["data-viz-manim-tex-colorized-uncolored-token-ids"]
  );
  assert.equal(
    attributes["data-viz-manim-tex-colorized-role-summary"],
    expectedAttributes["data-viz-manim-tex-colorized-role-summary"]
  );
  assert.equal(
    attributes["data-viz-manim-tex-colorized-interval-summary"],
    expectedAttributes["data-viz-manim-tex-colorized-interval-summary"]
  );
  assert.equal(
    attributes["data-viz-manim-tex-colorized-summary"],
    expectedAttributes["data-viz-manim-tex-colorized-summary"]
  );
});

test("records TeX isolation selector source contract for formula-token browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const expectedIsolation = buildTexIsolationEvidence(functionGraphSpec);
  const expectedAttributes = texIsolationEvidenceDataAttributes(expectedIsolation);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimTexIsolationSceneId, expectedIsolation.sceneId);
  assert.equal(snapshot.manimTexIsolationFormulaCount, expectedIsolation.formulaCount);
  assert.equal(snapshot.manimTexIsolationTokenCount, expectedIsolation.tokenCount);
  assert.equal(snapshot.manimTexIsolationIsolatedTokenCount, expectedIsolation.isolatedTokenCount);
  assert.equal(snapshot.manimTexIsolationSelectorCount, expectedIsolation.selectorCount);
  assert.equal(snapshot.manimTexIsolationSelectorSummary, expectedIsolation.selectorSummary);
  assert.equal(snapshot.manimTexIsolationUnmatchedSelectorCount, expectedIsolation.unmatchedSelectorCount);
  assert.equal(snapshot.manimTexIsolationUnmatchedSelectors, expectedIsolation.unmatchedSelectors);
  assert.equal(snapshot.manimTexIsolationCacheKeyCount, expectedIsolation.cacheKeyCount);
  assert.equal(snapshot.manimTexIsolationOccurrenceSummary, expectedIsolation.occurrenceSummary);
  assert.equal(snapshot.manimTexIsolationSourceContract, expectedIsolation.sourceContract);
  assert.equal(snapshot.manimTexIsolationSummary, expectedIsolation.summary);
  assert.equal(attributes["data-viz-manim-tex-isolation-scene-id"], expectedAttributes["data-viz-manim-tex-isolation-scene-id"]);
  assert.equal(attributes["data-viz-manim-tex-isolation-formula-count"], expectedAttributes["data-viz-manim-tex-isolation-formula-count"]);
  assert.equal(attributes["data-viz-manim-tex-isolation-token-count"], expectedAttributes["data-viz-manim-tex-isolation-token-count"]);
  assert.equal(
    attributes["data-viz-manim-tex-isolation-isolated-token-count"],
    expectedAttributes["data-viz-manim-tex-isolation-isolated-token-count"]
  );
  assert.equal(
    attributes["data-viz-manim-tex-isolation-selector-count"],
    expectedAttributes["data-viz-manim-tex-isolation-selector-count"]
  );
  assert.equal(
    attributes["data-viz-manim-tex-isolation-selector-summary"],
    expectedAttributes["data-viz-manim-tex-isolation-selector-summary"]
  );
  assert.equal(
    attributes["data-viz-manim-tex-isolation-unmatched-selector-count"],
    expectedAttributes["data-viz-manim-tex-isolation-unmatched-selector-count"]
  );
  assert.equal(
    attributes["data-viz-manim-tex-isolation-unmatched-selectors"],
    expectedAttributes["data-viz-manim-tex-isolation-unmatched-selectors"]
  );
  assert.equal(
    attributes["data-viz-manim-tex-isolation-cache-key-count"],
    expectedAttributes["data-viz-manim-tex-isolation-cache-key-count"]
  );
  assert.equal(
    attributes["data-viz-manim-tex-isolation-occurrence-summary"],
    expectedAttributes["data-viz-manim-tex-isolation-occurrence-summary"]
  );
  assert.equal(
    attributes["data-viz-manim-tex-isolation-source-contract"],
    expectedAttributes["data-viz-manim-tex-isolation-source-contract"]
  );
  assert.equal(attributes["data-viz-manim-tex-isolation-summary"], expectedAttributes["data-viz-manim-tex-isolation-summary"]);
});

test("records TeX compile pipeline source contract for latex_to_svg browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const expectedPipeline = buildMathTexCompilePipeline(functionGraphSpec);
  const expectedAttributes = texCompilePipelineDataAttributes(expectedPipeline);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimTexCompileSceneId, expectedPipeline.sceneId);
  assert.equal(snapshot.manimTexCompileFormulaCount, expectedPipeline.formulaCount);
  assert.equal(snapshot.manimTexCompileDocumentCount, expectedPipeline.documentCount);
  assert.equal(snapshot.manimTexCompileCommandCount, expectedPipeline.commandCount);
  assert.equal(snapshot.manimTexCompileCacheKeyCount, expectedPipeline.cacheKeyCount);
  assert.equal(snapshot.manimTexCompileDocumentSourceLengthRange, expectedPipeline.documentSourceLengthRange);
  assert.deepEqual(snapshot.manimTexCompileEngineIds, expectedPipeline.engineIds);
  assert.deepEqual(snapshot.manimTexCompileIntermediateExtensions, expectedPipeline.intermediateExtensions);
  assert.deepEqual(snapshot.manimTexCompileRows, expectedPipeline.rows);
  assert.equal(snapshot.manimTexCompileSummary, expectedPipeline.summary);
  assert.equal(snapshot.manimTexCompileSourceSummary, expectedPipeline.sourceSummary);
  assert.equal(snapshot.manimTexCompileStepSequence, expectedPipeline.stepSequence);
  assert.equal(snapshot.manimTexCompileSvgOutputCount, expectedPipeline.svgOutputCount);
  assert.match(snapshot.manimTexCompileSignature, /^tex-compile-[0-9a-f]{8}$/);
  assert.equal(snapshot.manimTexCompileSourceContract, expectedPipeline.sourceContract);
  assert.equal(snapshot.manimTexCompileSourceContract, TEX_COMPILE_PIPELINE_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-tex-compile-formula-count"], expectedAttributes["data-viz-manim-tex-compile-formula-count"]);
  assert.equal(attributes["data-viz-manim-tex-compile-document-count"], expectedAttributes["data-viz-manim-tex-compile-document-count"]);
  assert.equal(attributes["data-viz-manim-tex-compile-command-count"], expectedAttributes["data-viz-manim-tex-compile-command-count"]);
  assert.equal(attributes["data-viz-manim-tex-compile-cache-key-count"], expectedAttributes["data-viz-manim-tex-compile-cache-key-count"]);
  assert.equal(attributes["data-viz-manim-tex-compile-summary"], expectedAttributes["data-viz-manim-tex-compile-summary"]);
  assert.equal(attributes["data-viz-manim-tex-compile-source-summary"], expectedAttributes["data-viz-manim-tex-compile-source-summary"]);
  assert.equal(attributes["data-viz-manim-tex-compile-step-sequence"], expectedAttributes["data-viz-manim-tex-compile-step-sequence"]);
  assert.equal(
    attributes["data-viz-manim-tex-compile-source-contract"],
    expectedAttributes["data-viz-manim-tex-compile-source-contract"]
  );
});

test("records TeX cache manifest source contract for formula pipeline browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const expectedManifest = buildMathTexCacheManifest(functionGraphSpec);
  const expectedAttributes = texCacheManifestDataAttributes(expectedManifest);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimTexCacheSceneId, expectedManifest.sceneId);
  assert.equal(snapshot.manimTexCacheCacheEntryCount, expectedManifest.cacheEntryCount);
  assert.equal(snapshot.manimTexCacheCacheHitEligibleCount, expectedManifest.cacheHitEligibleCount);
  assert.deepEqual(snapshot.manimTexCacheCacheKeys, expectedManifest.cacheKeys);
  assert.equal(snapshot.manimTexCacheCacheVersion, expectedManifest.cacheVersion);
  assert.deepEqual(snapshot.manimTexCacheEntries, expectedManifest.entries);
  assert.equal(snapshot.manimTexCacheFormulaCount, expectedManifest.formulaCount);
  assert.equal(snapshot.manimTexCacheIsolationEntryCount, expectedManifest.isolationEntryCount);
  assert.equal(snapshot.manimTexCacheReady, expectedManifest.ready);
  assert.match(snapshot.manimTexCacheSignature, /^tex-cache-[0-9a-f]{8}$/);
  assert.equal(snapshot.manimTexCacheStaleEntryCount, expectedManifest.staleEntryCount);
  assert.equal(snapshot.manimTexCacheSummary, expectedManifest.summary);
  assert.equal(snapshot.manimTexCacheSvgMorphPlanCount, expectedManifest.svgMorphPlanCount);
  assert.equal(snapshot.manimTexCacheTokenCount, expectedManifest.tokenCount);
  assert.equal(snapshot.manimTexCacheSourceContract, expectedManifest.sourceContract);
  assert.equal(snapshot.manimTexCacheSourceContract, TEX_CACHE_MANIFEST_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-tex-cache-entry-count"], expectedAttributes["data-viz-manim-tex-cache-entry-count"]);
  assert.equal(attributes["data-viz-manim-tex-cache-formula-count"], expectedAttributes["data-viz-manim-tex-cache-formula-count"]);
  assert.equal(
    attributes["data-viz-manim-tex-cache-isolation-entry-count"],
    expectedAttributes["data-viz-manim-tex-cache-isolation-entry-count"]
  );
  assert.equal(attributes["data-viz-manim-tex-cache-ready"], expectedAttributes["data-viz-manim-tex-cache-ready"]);
  assert.equal(attributes["data-viz-manim-tex-cache-signature"], expectedAttributes["data-viz-manim-tex-cache-signature"]);
  assert.equal(attributes["data-viz-manim-tex-cache-summary"], expectedAttributes["data-viz-manim-tex-cache-summary"]);
  assert.equal(
    attributes["data-viz-manim-tex-cache-svg-morph-plan-count"],
    expectedAttributes["data-viz-manim-tex-cache-svg-morph-plan-count"]
  );
  assert.equal(attributes["data-viz-manim-tex-cache-token-count"], expectedAttributes["data-viz-manim-tex-cache-token-count"]);
  assert.equal(
    attributes["data-viz-manim-tex-cache-source-contract"],
    expectedAttributes["data-viz-manim-tex-cache-source-contract"]
  );
});

test("records Mobject critical-point anchor source contract for label and layout QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const expectedAnchors = buildMobjectAnchorEvidence(runtimeState.objectGraph);
  const expectedAttributes = mobjectAnchorEvidenceDataAttributes(expectedAnchors);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.mobjectAnchorObjectCount, expectedAnchors.objectCount);
  assert.equal(snapshot.mobjectAnchorNameCount, expectedAnchors.anchorNameCount);
  assert.equal(snapshot.mobjectAnchorPointCount, expectedAnchors.anchorPointCount);
  assert.equal(snapshot.mobjectAnchorFinitePointCount, expectedAnchors.finiteAnchorPointCount);
  assert.equal(snapshot.mobjectAnchorEmptyBoundingBoxCount, expectedAnchors.emptyBoundingBoxCount);
  assert.equal(snapshot.mobjectAnchorNames, expectedAnchors.anchorNames);
  assert.equal(snapshot.mobjectAnchorObjectIds, expectedAnchors.objectIds);
  assert.equal(snapshot.mobjectAnchorSourceContract, expectedAnchors.sourceContract);
  assert.equal(snapshot.mobjectAnchorSummary, expectedAnchors.summary);
  assert.equal(attributes["data-viz-mobject-anchor-object-count"], expectedAttributes["data-viz-mobject-anchor-object-count"]);
  assert.equal(attributes["data-viz-mobject-anchor-name-count"], expectedAttributes["data-viz-mobject-anchor-name-count"]);
  assert.equal(attributes["data-viz-mobject-anchor-point-count"], expectedAttributes["data-viz-mobject-anchor-point-count"]);
  assert.equal(
    attributes["data-viz-mobject-anchor-finite-point-count"],
    expectedAttributes["data-viz-mobject-anchor-finite-point-count"]
  );
  assert.equal(
    attributes["data-viz-mobject-anchor-empty-bounding-box-count"],
    expectedAttributes["data-viz-mobject-anchor-empty-bounding-box-count"]
  );
  assert.equal(attributes["data-viz-mobject-anchor-names"], expectedAttributes["data-viz-mobject-anchor-names"]);
  assert.equal(attributes["data-viz-mobject-anchor-object-ids"], expectedAttributes["data-viz-mobject-anchor-object-ids"]);
  assert.equal(
    attributes["data-viz-mobject-anchor-source-contract"],
    expectedAttributes["data-viz-mobject-anchor-source-contract"]
  );
  assert.equal(attributes["data-viz-mobject-anchor-summary"], expectedAttributes["data-viz-mobject-anchor-summary"]);
});

test("records Mobject material uniform source contract for renderer QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const expectedMaterial = buildMobjectMaterialUniformEvidence(runtimeState.objectGraph);
  const expectedAttributes = mobjectMaterialUniformEvidenceDataAttributes(expectedMaterial);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.mobjectMaterialObjectCount, expectedMaterial.objectCount);
  assert.equal(snapshot.mobjectMaterialTransparentCount, expectedMaterial.transparentCount);
  assert.equal(snapshot.mobjectMaterialDepthWriteEnabledCount, expectedMaterial.depthWriteEnabledCount);
  assert.equal(snapshot.mobjectMaterialShadeIn3DCount, expectedMaterial.shadeIn3DCount);
  assert.equal(snapshot.mobjectMaterialClippingPlaneCount, expectedMaterial.clippingPlaneCount);
  assert.equal(snapshot.mobjectMaterialOpacityRange, expectedMaterial.opacityRange);
  assert.equal(snapshot.mobjectMaterialObjectIds, expectedMaterial.objectIds);
  assert.equal(snapshot.mobjectMaterialSourceContract, expectedMaterial.sourceContract);
  assert.equal(snapshot.mobjectMaterialSummary, expectedMaterial.summary);
  assert.equal(attributes["data-viz-mobject-material-object-count"], expectedAttributes["data-viz-mobject-material-object-count"]);
  assert.equal(
    attributes["data-viz-mobject-material-transparent-count"],
    expectedAttributes["data-viz-mobject-material-transparent-count"]
  );
  assert.equal(
    attributes["data-viz-mobject-material-depth-write-enabled-count"],
    expectedAttributes["data-viz-mobject-material-depth-write-enabled-count"]
  );
  assert.equal(
    attributes["data-viz-mobject-material-shade-in-3d-count"],
    expectedAttributes["data-viz-mobject-material-shade-in-3d-count"]
  );
  assert.equal(
    attributes["data-viz-mobject-material-clipping-plane-count"],
    expectedAttributes["data-viz-mobject-material-clipping-plane-count"]
  );
  assert.equal(attributes["data-viz-mobject-material-opacity-range"], expectedAttributes["data-viz-mobject-material-opacity-range"]);
  assert.equal(attributes["data-viz-mobject-material-object-ids"], expectedAttributes["data-viz-mobject-material-object-ids"]);
  assert.equal(
    attributes["data-viz-mobject-material-source-contract"],
    expectedAttributes["data-viz-mobject-material-source-contract"]
  );
  assert.equal(attributes["data-viz-mobject-material-summary"], expectedAttributes["data-viz-mobject-material-summary"]);
});

test("records VMobject render line source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const expectedLineRender = buildVMobjectLineRenderEvidence(runtimeState.objectGraph);
  const expectedAttributes = vmobjectLineRenderEvidenceDataAttributes(expectedLineRender);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.vmobjectRenderLineObjectCount, expectedLineRender.objectCount);
  assert.equal(snapshot.vmobjectRenderLineTransparentCount, expectedLineRender.transparentCount);
  assert.equal(snapshot.vmobjectRenderLineOpacityRange, expectedLineRender.opacityRange);
  assert.equal(snapshot.vmobjectRenderLineStrokeWidthRange, expectedLineRender.strokeWidthRange);
  assert.equal(snapshot.vmobjectRenderLineColorRoles, expectedLineRender.colorRoles);
  assert.equal(snapshot.vmobjectRenderLineObjectIds, expectedLineRender.objectIds);
  assert.equal(snapshot.vmobjectRenderLineSourceContract, expectedLineRender.sourceContract);
  assert.equal(snapshot.vmobjectRenderLineSummary, expectedLineRender.summary);
  assert.equal(
    attributes["data-viz-vmobject-render-line-object-count"],
    expectedAttributes["data-viz-vmobject-render-line-object-count"]
  );
  assert.equal(
    attributes["data-viz-vmobject-render-line-transparent-count"],
    expectedAttributes["data-viz-vmobject-render-line-transparent-count"]
  );
  assert.equal(
    attributes["data-viz-vmobject-render-line-opacity-range"],
    expectedAttributes["data-viz-vmobject-render-line-opacity-range"]
  );
  assert.equal(
    attributes["data-viz-vmobject-render-line-stroke-width-range"],
    expectedAttributes["data-viz-vmobject-render-line-stroke-width-range"]
  );
  assert.equal(
    attributes["data-viz-vmobject-render-line-color-roles"],
    expectedAttributes["data-viz-vmobject-render-line-color-roles"]
  );
  assert.equal(
    attributes["data-viz-vmobject-render-line-object-ids"],
    expectedAttributes["data-viz-vmobject-render-line-object-ids"]
  );
  assert.equal(
    attributes["data-viz-vmobject-render-line-source-contract"],
    expectedAttributes["data-viz-vmobject-render-line-source-contract"]
  );
  assert.equal(
    attributes["data-viz-vmobject-render-line-summary"],
    expectedAttributes["data-viz-vmobject-render-line-summary"]
  );
});

test("records VMobject surface fill mesh source contract for browser QA", () => {
  const scene: MathSceneSpec = {
    sceneId: "surface-fill-evidence-test",
    familyId: "three-optimization-modeling",
    coordinateSpace: {
      mathRange: { x: [0, 1], y: [0, 1], z: [0, 1] },
      worldRange: { x: [0, 1], y: [0, 1], z: [0, 1] }
    },
    objects: [
      {
        type: "parametricSurface",
        id: "area-surface",
        conceptId: "area-model",
        colorRole: "surface",
        samples: [
          [[0, 0, 0], [0, 1, 0]],
          [[1, 0, 0], [1, 1, 0.5]]
        ],
        style: { fillOpacity: 0.4, fillRole: "area", strokeOpacity: 0.7, strokeWidth: 2 },
        uRange: [0, 1],
        vRange: [0, 1]
      }
    ],
    formulas: [],
    bindings: [],
    timeline: [{ type: "revealSurface", objectId: "area-surface", duration: 1, easing: "linear" }],
    cameraShots: [{ id: "overview", position: [2, 2, 2], target: [0, 0, 0] }],
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 }
  };
  const runtimeState = buildMathSceneRuntimeState(scene, 1);
  const expectedFillRender = buildVMobjectSurfaceFillRenderEvidence(runtimeState.objectGraph);
  const expectedAttributes = vmobjectSurfaceFillRenderEvidenceDataAttributes(expectedFillRender);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.vmobjectRenderFillObjectCount, expectedFillRender.objectCount);
  assert.equal(snapshot.vmobjectRenderFillMeshObjectCount, expectedFillRender.meshObjectCount);
  assert.equal(snapshot.vmobjectRenderFillTriangleCount, expectedFillRender.triangleCount);
  assert.equal(snapshot.vmobjectRenderFillVertexCount, expectedFillRender.vertexCount);
  assert.equal(snapshot.vmobjectRenderFillColorRoles, expectedFillRender.colorRoles);
  assert.equal(snapshot.vmobjectRenderFillOpacityRange, expectedFillRender.opacityRange);
  assert.equal(snapshot.vmobjectRenderFillSourceContract, expectedFillRender.sourceContract);
  assert.equal(snapshot.vmobjectRenderFillSummary, expectedFillRender.summary);
  assert.equal(
    attributes["data-viz-vmobject-render-fill-mesh-object-count"],
    expectedAttributes["data-viz-vmobject-render-fill-mesh-object-count"]
  );
  assert.equal(
    attributes["data-viz-vmobject-render-fill-triangle-count"],
    expectedAttributes["data-viz-vmobject-render-fill-triangle-count"]
  );
  assert.equal(
    attributes["data-viz-vmobject-render-fill-vertex-count"],
    expectedAttributes["data-viz-vmobject-render-fill-vertex-count"]
  );
  assert.equal(
    attributes["data-viz-vmobject-render-fill-source-contract"],
    expectedAttributes["data-viz-vmobject-render-fill-source-contract"]
  );
  assert.equal(attributes["data-viz-vmobject-render-fill-summary"], expectedAttributes["data-viz-vmobject-render-fill-summary"]);
});

test("records RuntimeRenderState source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const expectedRenderState = buildRuntimeRenderStateEvidence(runtimeState.objectGraph);
  const expectedAttributes = runtimeRenderStateEvidenceDataAttributes(expectedRenderState);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.runtimeRenderStateObjectCount, expectedRenderState.objectCount);
  assert.equal(snapshot.runtimeRenderStateKindSummary, expectedRenderState.kindSummary);
  assert.equal(snapshot.runtimeRenderStatePointCount, expectedRenderState.pointCount);
  assert.equal(snapshot.runtimeRenderStateFinitePointCount, expectedRenderState.finitePointCount);
  assert.equal(snapshot.runtimeRenderStateZeroPointObjectCount, expectedRenderState.zeroPointObjectCount);
  assert.equal(snapshot.runtimeRenderStateStyledObjectCount, expectedRenderState.styledObjectCount);
  assert.equal(snapshot.runtimeRenderStateWireframeCurveCount, expectedRenderState.wireframeCurveCount);
  assert.equal(snapshot.runtimeRenderStateObjectIds, expectedRenderState.objectIds);
  assert.equal(snapshot.runtimeRenderStateSourceContract, expectedRenderState.sourceContract);
  assert.equal(snapshot.runtimeRenderStateSummary, expectedRenderState.summary);
  assert.equal(
    attributes["data-viz-runtime-render-state-object-count"],
    expectedAttributes["data-viz-runtime-render-state-object-count"]
  );
  assert.equal(
    attributes["data-viz-runtime-render-state-kind-summary"],
    expectedAttributes["data-viz-runtime-render-state-kind-summary"]
  );
  assert.equal(
    attributes["data-viz-runtime-render-state-point-count"],
    expectedAttributes["data-viz-runtime-render-state-point-count"]
  );
  assert.equal(
    attributes["data-viz-runtime-render-state-finite-point-count"],
    expectedAttributes["data-viz-runtime-render-state-finite-point-count"]
  );
  assert.equal(
    attributes["data-viz-runtime-render-state-zero-point-object-count"],
    expectedAttributes["data-viz-runtime-render-state-zero-point-object-count"]
  );
  assert.equal(
    attributes["data-viz-runtime-render-state-styled-object-count"],
    expectedAttributes["data-viz-runtime-render-state-styled-object-count"]
  );
  assert.equal(
    attributes["data-viz-runtime-render-state-wireframe-curve-count"],
    expectedAttributes["data-viz-runtime-render-state-wireframe-curve-count"]
  );
  assert.equal(
    attributes["data-viz-runtime-render-state-object-ids"],
    expectedAttributes["data-viz-runtime-render-state-object-ids"]
  );
  assert.equal(
    attributes["data-viz-runtime-render-state-source-contract"],
    expectedAttributes["data-viz-runtime-render-state-source-contract"]
  );
  assert.equal(
    attributes["data-viz-runtime-render-state-summary"],
    expectedAttributes["data-viz-runtime-render-state-summary"]
  );
});

test("records Manim timeline source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 5.5);
  const expectedTimelineEvidence = buildTimelineEvidence({
    reducedMotion: false,
    skipAnimations: runtimeState.updatePolicy.skipAnimations,
    timeline: functionGraphSpec.timeline,
    timelineState: runtimeState.timeline
  });
  const expectedAttributes = timelineEvidenceDataAttributes(expectedTimelineEvidence);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimTimelineStepCount, expectedTimelineEvidence.stepCount);
  assert.equal(snapshot.manimTimelineTotalDuration, expectedTimelineEvidence.totalDuration);
  assert.equal(snapshot.manimTimelineElapsedSeconds, expectedTimelineEvidence.elapsedSeconds);
  assert.equal(snapshot.manimTimelineActiveStepType, expectedTimelineEvidence.activeStepType);
  assert.equal(snapshot.manimTimelineActiveStepIndex, expectedTimelineEvidence.activeStepIndex);
  assert.equal(snapshot.manimTimelineActiveConceptId, expectedTimelineEvidence.activeConceptId);
  assert.equal(snapshot.manimTimelineFocusTargetCount, expectedTimelineEvidence.focusTargetCount);
  assert.equal(snapshot.manimTimelineFocusTargetIds, expectedTimelineEvidence.focusTargetIds);
  assert.equal(snapshot.manimTimelineFocusTargetPolicy, expectedTimelineEvidence.focusTargetPolicy);
  assert.equal(snapshot.manimTimelineFocusTargetPrimaryId, expectedTimelineEvidence.focusTargetPrimaryId);
  assert.equal(snapshot.manimTimelineFocusTargetSummary, expectedTimelineEvidence.focusTargetSummary);
  assert.equal(snapshot.manimTimelineProgress, expectedTimelineEvidence.progress);
  assert.equal(snapshot.manimTimelineCompletedStepCount, expectedTimelineEvidence.completedStepCount);
  assert.equal(snapshot.manimTimelinePendingStepCount, expectedTimelineEvidence.pendingStepCount);
  assert.equal(snapshot.manimTimelineWaitStepCount, expectedTimelineEvidence.waitStepCount);
  assert.equal(snapshot.manimTimelineCameraStepCount, expectedTimelineEvidence.cameraStepCount);
  assert.equal(snapshot.manimTimelineReducedMotion, expectedTimelineEvidence.reducedMotion);
  assert.equal(snapshot.manimTimelineSkipAnimations, expectedTimelineEvidence.skipAnimations);
  assert.equal(snapshot.manimTimelineStepTypeSummary, expectedTimelineEvidence.stepTypeSummary);
  assert.equal(snapshot.manimTimelineSourceContract, expectedTimelineEvidence.sourceContract);
  assert.equal(snapshot.manimTimelineSummary, expectedTimelineEvidence.summary);
  assert.equal(attributes["data-viz-manim-timeline-step-count"], expectedAttributes["data-viz-manim-timeline-step-count"]);
  assert.equal(attributes["data-viz-manim-timeline-total-duration"], expectedAttributes["data-viz-manim-timeline-total-duration"]);
  assert.equal(attributes["data-viz-manim-timeline-elapsed-seconds"], expectedAttributes["data-viz-manim-timeline-elapsed-seconds"]);
  assert.equal(attributes["data-viz-manim-timeline-active-step-type"], expectedAttributes["data-viz-manim-timeline-active-step-type"]);
  assert.equal(attributes["data-viz-manim-timeline-active-step-index"], expectedAttributes["data-viz-manim-timeline-active-step-index"]);
  assert.equal(attributes["data-viz-manim-timeline-active-concept-id"], expectedAttributes["data-viz-manim-timeline-active-concept-id"]);
  assert.equal(attributes["data-viz-manim-timeline-focus-target-count"], expectedAttributes["data-viz-manim-timeline-focus-target-count"]);
  assert.equal(attributes["data-viz-manim-timeline-focus-target-ids"], expectedAttributes["data-viz-manim-timeline-focus-target-ids"]);
  assert.equal(attributes["data-viz-manim-timeline-focus-target-policy"], expectedAttributes["data-viz-manim-timeline-focus-target-policy"]);
  assert.equal(
    attributes["data-viz-manim-timeline-focus-target-primary-id"],
    expectedAttributes["data-viz-manim-timeline-focus-target-primary-id"]
  );
  assert.equal(
    attributes["data-viz-manim-timeline-focus-target-summary"],
    expectedAttributes["data-viz-manim-timeline-focus-target-summary"]
  );
  assert.equal(attributes["data-viz-manim-timeline-progress"], expectedAttributes["data-viz-manim-timeline-progress"]);
  assert.equal(
    attributes["data-viz-manim-timeline-completed-step-count"],
    expectedAttributes["data-viz-manim-timeline-completed-step-count"]
  );
  assert.equal(
    attributes["data-viz-manim-timeline-pending-step-count"],
    expectedAttributes["data-viz-manim-timeline-pending-step-count"]
  );
  assert.equal(attributes["data-viz-manim-timeline-wait-step-count"], expectedAttributes["data-viz-manim-timeline-wait-step-count"]);
  assert.equal(
    attributes["data-viz-manim-timeline-camera-step-count"],
    expectedAttributes["data-viz-manim-timeline-camera-step-count"]
  );
  assert.equal(attributes["data-viz-manim-timeline-reduced-motion"], expectedAttributes["data-viz-manim-timeline-reduced-motion"]);
  assert.equal(attributes["data-viz-manim-timeline-skip-animations"], expectedAttributes["data-viz-manim-timeline-skip-animations"]);
  assert.equal(
    attributes["data-viz-manim-timeline-step-type-summary"],
    expectedAttributes["data-viz-manim-timeline-step-type-summary"]
  );
  assert.equal(attributes["data-viz-manim-timeline-source-contract"], expectedAttributes["data-viz-manim-timeline-source-contract"]);
  assert.equal(attributes["data-viz-manim-timeline-summary"], expectedAttributes["data-viz-manim-timeline-summary"]);
});

test("records Formula SVG morph source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const svgPathMorphs = [{
    formulaId: functionGraphSpec.formulas[0].id,
    id: "function-token-to-point-token",
    sourcePath: "M 0 0 L 10 0 L 10 10 Z",
    sourceTokenId: "function-token",
    targetPath: "M 0 2 L 8 2 L 8 12 Z",
    targetTokenId: "point-token"
  }];
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec,
    svgMorphEvidence: {
      morphs: svgPathMorphs,
      progress: 0.5
    }
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimSvgMorphCount, 1);
  assert.equal(snapshot.manimSvgMorphCompatibleCount, 1);
  assert.equal(snapshot.manimSvgMorphIssueCount, 0);
  assert.equal(snapshot.manimSvgMorphCommandCount, 5);
  assert.equal(snapshot.manimSvgMorphCacheKeyCount, 1);
  assert.equal(snapshot.manimSvgMorphIds, "function-token-to-point-token");
  assert.equal(snapshot.manimSvgMorphProgress, 0.5);
  assert.equal(snapshot.manimSvgMorphFramePathPreview, "M 0 1 C 3 1 6 1 9 1 C 9 4.333333 9 7.666667 9 11 C 6 7.666667 3 4.333333 0 1 Z");
  assert.equal(snapshot.manimSvgMorphIssueSummary, "none");
  assert.equal(
    snapshot.manimSvgMorphSourceContract,
    "Tex/SVGMobject SVG path pipeline|SVGMobject path commands|interpolate SVG path morph"
  );
  assert.equal(
    snapshot.manimSvgMorphSummary,
    "svg-morph:mais-manim-function-graph:morphs=1:compatible=1:issues=0:commands=5:progress=0.500"
  );
  assert.equal(attributes["data-viz-manim-svg-morph-count"], "1");
  assert.equal(attributes["data-viz-manim-svg-morph-compatible-count"], "1");
  assert.equal(attributes["data-viz-manim-svg-morph-issue-count"], "0");
  assert.equal(attributes["data-viz-manim-svg-morph-command-count"], "5");
  assert.equal(attributes["data-viz-manim-svg-morph-cache-key-count"], "1");
  assert.equal(attributes["data-viz-manim-svg-morph-ids"], "function-token-to-point-token");
  assert.equal(attributes["data-viz-manim-svg-morph-progress"], "0.500");
  assert.equal(attributes["data-viz-manim-svg-morph-frame-path-preview"], "M 0 1 C 3 1 6 1 9 1 C 9 4.333333 9 7.666667 9 11 C 6 7.666667 3 4.333333 0 1 Z");
  assert.equal(attributes["data-viz-manim-svg-morph-issue-summary"], "none");
  assert.equal(
    attributes["data-viz-manim-svg-morph-source-contract"],
    snapshot.manimSvgMorphSourceContract
  );
  assert.equal(attributes["data-viz-manim-svg-morph-summary"], snapshot.manimSvgMorphSummary);
});

test("records parameter-panel authoring source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const expectedSummary = summarizeParameterPanelCatalog(
    buildParameterPanelCatalog(functionGraphSpec),
    "depth"
  );
  const expectedAttributes = parameterPanelDataAttributes(expectedSummary);
  const snapshot = buildMathSceneEvidenceSnapshot({
    parameterPanelEvidence: { selectedParameterId: "depth" },
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimParameterPanelCount, expectedSummary.parameterCount);
  assert.equal(snapshot.manimParameterPanelControlCount, expectedSummary.controlCount);
  assert.equal(snapshot.manimParameterPanelDerivedCount, expectedSummary.derivedCount);
  assert.equal(snapshot.manimParameterPanelTimelineCount, expectedSummary.timelineCount);
  assert.equal(snapshot.manimParameterPanelIds, "value,comparison,mode,depth,primary,secondary");
  assert.equal(snapshot.manimParameterPanelSelectedId, "depth");
  assert.equal(snapshot.manimParameterPanelSummary, expectedSummary.summary);
  assert.equal(attributes["data-viz-manim-parameter-panel-count"], expectedAttributes["data-viz-manim-parameter-panel-count"]);
  assert.equal(
    attributes["data-viz-manim-parameter-panel-control-count"],
    expectedAttributes["data-viz-manim-parameter-panel-control-count"]
  );
  assert.equal(
    attributes["data-viz-manim-parameter-panel-derived-count"],
    expectedAttributes["data-viz-manim-parameter-panel-derived-count"]
  );
  assert.equal(attributes["data-viz-manim-parameter-panel-ids"], expectedAttributes["data-viz-manim-parameter-panel-ids"]);
  assert.equal(attributes["data-viz-manim-parameter-panel-selected"], "depth");
  assert.equal(attributes["data-viz-manim-parameter-panel-summary"], expectedAttributes["data-viz-manim-parameter-panel-summary"]);
});

test("records Manim scene-history source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const historySummary = {
    branchInvalidatedRedoCount: 1,
    branchInvalidatedRedoLabels: "show final",
    branchPolicy: "new-history-push-after-undo-clears-redo-stack-and-records-invalidated-branch-labels",
    canRedo: true,
    canUndo: true,
    currentLabel: "curve reveal",
    droppedUndoCount: 1,
    maxUndoEntries: 2,
    redoCount: 1,
    revision: 4,
    sourceContract: expectedSceneHistorySourceContract,
    undoCount: 2
  };
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec,
    stateSnapshotEvidence: {
      historySummary
    }
  });
  const attributes = evidenceDataAttributes(snapshot);
  const expectedHistoryAttributes = sceneHistoryDataAttributes(historySummary);

  assert.equal(snapshot.manimSceneHistoryCanRedo, true);
  assert.equal(snapshot.manimSceneHistoryCanUndo, true);
  assert.equal(snapshot.manimSceneHistoryBranchInvalidatedRedoCount, 1);
  assert.equal(snapshot.manimSceneHistoryBranchInvalidatedRedoLabels, "show final");
  assert.equal(
    snapshot.manimSceneHistoryBranchPolicy,
    "new-history-push-after-undo-clears-redo-stack-and-records-invalidated-branch-labels"
  );
  assert.equal(snapshot.manimSceneHistoryCurrentLabel, "curve reveal");
  assert.equal(snapshot.manimSceneHistoryDroppedUndoCount, 1);
  assert.equal(snapshot.manimSceneHistoryMaxUndoEntries, 2);
  assert.equal(snapshot.manimSceneHistoryRedoCount, 1);
  assert.equal(snapshot.manimSceneHistoryRevision, 4);
  assert.equal(snapshot.manimSceneHistorySourceContract, expectedSceneHistorySourceContract);
  assert.equal(snapshot.manimSceneHistoryUndoCount, 2);
  assert.equal(attributes["data-viz-manim-history-can-redo"], expectedHistoryAttributes["data-viz-manim-history-can-redo"]);
  assert.equal(attributes["data-viz-manim-history-can-undo"], expectedHistoryAttributes["data-viz-manim-history-can-undo"]);
  assert.equal(
    attributes["data-viz-manim-history-branch-invalidated-redo-count"],
    expectedHistoryAttributes["data-viz-manim-history-branch-invalidated-redo-count"]
  );
  assert.equal(
    attributes["data-viz-manim-history-branch-invalidated-redo-labels"],
    expectedHistoryAttributes["data-viz-manim-history-branch-invalidated-redo-labels"]
  );
  assert.equal(attributes["data-viz-manim-history-branch-policy"], expectedHistoryAttributes["data-viz-manim-history-branch-policy"]);
  assert.equal(attributes["data-viz-manim-history-current-label"], expectedHistoryAttributes["data-viz-manim-history-current-label"]);
  assert.equal(attributes["data-viz-manim-history-dropped-undo-count"], expectedHistoryAttributes["data-viz-manim-history-dropped-undo-count"]);
  assert.equal(attributes["data-viz-manim-history-max-undo-entries"], expectedHistoryAttributes["data-viz-manim-history-max-undo-entries"]);
  assert.equal(attributes["data-viz-manim-history-redo-count"], expectedHistoryAttributes["data-viz-manim-history-redo-count"]);
  assert.equal(attributes["data-viz-manim-history-revision"], expectedHistoryAttributes["data-viz-manim-history-revision"]);
  assert.equal(attributes["data-viz-manim-history-source-contract"], expectedSceneHistorySourceContract);
  assert.equal(attributes["data-viz-manim-history-undo-count"], expectedHistoryAttributes["data-viz-manim-history-undo-count"]);
});

test("records Scene progress-control source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const progressControlEvidence = {
    initialShowAnimationProgress: false,
    requested: true
  };
  const expectedPlan = buildSceneProgressControlPlan(progressControlEvidence);
  const expectedAttributes = sceneProgressControlDataAttributes(expectedPlan);
  const snapshot = buildMathSceneEvidenceSnapshot({
    progressControlEvidence,
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimProgressControlActionSummary, "temp_progress_bar_enter,temp_progress_bar_exit");
  assert.equal(snapshot.manimProgressControlFinalProgress, false);
  assert.equal(snapshot.manimProgressControlInitialProgress, false);
  assert.equal(snapshot.manimProgressControlPreviousProgress, false);
  assert.equal(snapshot.manimProgressControlRequested, true);
  assert.equal(snapshot.manimProgressControlRestoredPrevious, true);
  assert.equal(snapshot.manimProgressControlSourceContract, SCENE_PROGRESS_CONTROL_SOURCE_CONTRACT);
  assert.equal(snapshot.manimProgressControlStatePolicy, SCENE_PROGRESS_CONTROL_STATE_POLICY);
  assert.equal(snapshot.manimProgressControlSummary, expectedPlan.summary);
  assert.equal(snapshot.manimProgressControlTransitionCount, 2);
  assert.deepEqual(snapshot.manimProgressControlTransitions, expectedPlan.transitions);
  assert.equal(attributes["data-viz-manim-progress-control-action-summary"], expectedAttributes["data-viz-manim-progress-control-action-summary"]);
  assert.equal(attributes["data-viz-manim-progress-control-final-progress"], expectedAttributes["data-viz-manim-progress-control-final-progress"]);
  assert.equal(attributes["data-viz-manim-progress-control-initial-progress"], expectedAttributes["data-viz-manim-progress-control-initial-progress"]);
  assert.equal(attributes["data-viz-manim-progress-control-previous-progress"], expectedAttributes["data-viz-manim-progress-control-previous-progress"]);
  assert.equal(attributes["data-viz-manim-progress-control-requested"], expectedAttributes["data-viz-manim-progress-control-requested"]);
  assert.equal(attributes["data-viz-manim-progress-control-restored-previous"], expectedAttributes["data-viz-manim-progress-control-restored-previous"]);
  assert.equal(attributes["data-viz-manim-progress-control-source-contract"], expectedAttributes["data-viz-manim-progress-control-source-contract"]);
  assert.equal(attributes["data-viz-manim-progress-control-state-policy"], expectedAttributes["data-viz-manim-progress-control-state-policy"]);
  assert.equal(attributes["data-viz-manim-progress-control-summary"], expectedAttributes["data-viz-manim-progress-control-summary"]);
  assert.equal(attributes["data-viz-manim-progress-control-transition-count"], expectedAttributes["data-viz-manim-progress-control-transition-count"]);
});

test("records checkpoint_paste authoring source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const checkpointPasteEvidence = {
    checkpointKeys: ["intro", "slope handoff", "zoom detail"],
    initialShowAnimationProgress: false,
    initialSkipAnimations: false,
    progressBar: true,
    record: true,
    skip: true,
    snippet: "# slope handoff\nself.play(Create(curve))"
  };
  const expectedPlan = buildMathCheckpointPastePlan({
    ...checkpointPasteEvidence,
    elapsedSeconds: runtimeState.timeline.elapsedSeconds,
    sceneId: functionGraphSpec.sceneId
  });
  const expectedAttributes: Record<string, string> = checkpointPastePlanDataAttributes(expectedPlan);
  const snapshot = buildMathSceneEvidenceSnapshot({
    checkpointPasteEvidence,
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimCheckpointPasteReady, true);
  assert.equal(snapshot.manimCheckpointPasteKey, "slope handoff");
  assert.equal(snapshot.manimCheckpointPasteLineCount, 2);
  assert.equal(snapshot.manimCheckpointPasteOperationCount, 1);
  assert.equal(snapshot.manimCheckpointPasteInvalidatesCount, 1);
  assert.equal(snapshot.manimCheckpointPasteInvalidatedKeys, "zoom detail");
  assert.equal(snapshot.manimCheckpointPasteRetainedKeysAfterRestore, "intro,slope handoff");
  assert.equal(snapshot.manimCheckpointPasteRestoreAction, "restore-and-invalidate-later");
  assert.equal(snapshot.manimCheckpointPasteElapsedSeconds, runtimeState.timeline.elapsedSeconds);
  assert.equal(snapshot.manimCheckpointPasteProgressBar, true);
  assert.equal(snapshot.manimCheckpointPasteRecord, true);
  assert.equal(snapshot.manimCheckpointPasteRestoreMode, "restore-existing");
  assert.equal(snapshot.manimCheckpointPasteRestoresExisting, true);
  assert.equal(snapshot.manimCheckpointPasteReplayPolicy, SCENE_CHECKPOINT_PASTE_REPLAY_POLICY);
  assert.equal(snapshot.manimCheckpointPasteSkip, true);
  assert.equal(snapshot.manimCheckpointPasteSourceContract, SCENE_CHECKPOINT_PASTE_SOURCE_CONTRACT);
  assert.equal(snapshot.manimCheckpointPasteSourceLabel, "# slope handoff");
  assert.equal(snapshot.manimCheckpointPasteProgressControlTransitionCount, 2);
  assert.equal(snapshot.manimCheckpointPasteProgressControlRestoredPrevious, true);
  assert.equal(snapshot.manimCheckpointPasteSkipControlTransitionCount, 2);
  assert.equal(snapshot.manimCheckpointPasteSkipControlStoppedTransitionCount, 1);
  assert.equal(snapshot.manimCheckpointPasteSummary, expectedPlan.summary);
  assert.equal(attributes["data-viz-manim-checkpoint-paste-key"], expectedAttributes["data-viz-manim-checkpoint-paste-key"]);
  assert.equal(attributes["data-viz-manim-checkpoint-paste-line-count"], expectedAttributes["data-viz-manim-checkpoint-paste-line-count"]);
  assert.equal(attributes["data-viz-manim-checkpoint-paste-operation-count"], expectedAttributes["data-viz-manim-checkpoint-paste-operation-count"]);
  assert.equal(attributes["data-viz-manim-checkpoint-paste-invalidates-count"], expectedAttributes["data-viz-manim-checkpoint-paste-invalidates-count"]);
  assert.equal(attributes["data-viz-manim-checkpoint-paste-invalidated-keys"], "zoom detail");
  assert.equal(attributes["data-viz-manim-checkpoint-paste-retained-keys-after-restore"], "intro,slope handoff");
  assert.equal(attributes["data-viz-manim-checkpoint-paste-restore-action"], "restore-and-invalidate-later");
  assert.equal(attributes["data-viz-manim-checkpoint-paste-elapsed-seconds"], expectedAttributes["data-viz-manim-checkpoint-paste-elapsed-seconds"]);
  assert.equal(attributes["data-viz-manim-checkpoint-paste-progress-bar"], expectedAttributes["data-viz-manim-checkpoint-paste-progress-bar"]);
  assert.equal(attributes["data-viz-manim-checkpoint-paste-record"], expectedAttributes["data-viz-manim-checkpoint-paste-record"]);
  assert.equal(attributes["data-viz-manim-checkpoint-paste-replay-policy"], expectedAttributes["data-viz-manim-checkpoint-paste-replay-policy"]);
  assert.equal(attributes["data-viz-manim-checkpoint-paste-restores-existing"], expectedAttributes["data-viz-manim-checkpoint-paste-restores-existing"]);
  assert.equal(attributes["data-viz-manim-checkpoint-paste-restore-mode"], expectedAttributes["data-viz-manim-checkpoint-paste-restore-mode"]);
  assert.equal(attributes["data-viz-manim-checkpoint-paste-skip"], expectedAttributes["data-viz-manim-checkpoint-paste-skip"]);
  assert.equal(attributes["data-viz-manim-checkpoint-paste-source-contract"], expectedAttributes["data-viz-manim-checkpoint-paste-source-contract"]);
  assert.equal(attributes["data-viz-manim-checkpoint-paste-source-label"], expectedAttributes["data-viz-manim-checkpoint-paste-source-label"]);
  assert.equal(attributes["data-viz-manim-checkpoint-paste-summary"], expectedAttributes["data-viz-manim-checkpoint-paste-summary"]);
  assert.equal(attributes["data-viz-manim-progress-control-action-summary"], expectedAttributes["data-viz-manim-progress-control-action-summary"]);
  assert.equal(attributes["data-viz-manim-progress-control-transition-count"], expectedAttributes["data-viz-manim-progress-control-transition-count"]);
  assert.equal(attributes["data-viz-manim-skip-control-action-summary"], expectedAttributes["data-viz-manim-skip-control-action-summary"]);
  assert.equal(attributes["data-viz-manim-skip-control-stopped-transition-count"], expectedAttributes["data-viz-manim-skip-control-stopped-transition-count"]);
});

test("records CheckpointManager store source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const checkpointStoreEvidence = {
    checkpointKeys: ["intro", "slope handoff", "zoom detail"],
    invalidateLater: true,
    restoreKey: "slope handoff"
  };
  const expectedManifest = buildSceneCheckpointStoreManifest({
    checkpoints: checkpointStoreEvidence.checkpointKeys.map((key, order) => ({
      key,
      order,
      state: { checkpointKey: key, order }
    }))
  }, {
    invalidateLater: checkpointStoreEvidence.invalidateLater,
    restoreKey: checkpointStoreEvidence.restoreKey
  });
  const expectedAttributes = sceneCheckpointStoreDataAttributes(expectedManifest);
  const snapshot = buildMathSceneEvidenceSnapshot({
    checkpointStoreEvidence,
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec,
    stateSnapshotEvidence: {
      checkpointKeys: checkpointStoreEvidence.checkpointKeys
    }
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimCheckpointStoreCanRestore, expectedManifest.canRestore);
  assert.equal(snapshot.manimCheckpointStoreCount, expectedManifest.checkpointCount);
  assert.equal(snapshot.manimCheckpointStoreInvalidatedCount, expectedManifest.invalidatedCount);
  assert.equal(snapshot.manimCheckpointStoreInvalidatedKeys, "zoom detail");
  assert.equal(snapshot.manimCheckpointStoreInvalidateLater, expectedManifest.invalidateLater);
  assert.equal(snapshot.manimCheckpointStoreKeys, "intro,slope handoff,zoom detail");
  assert.equal(snapshot.manimCheckpointStoreLatestKey, expectedManifest.latestKey);
  assert.match(snapshot.manimCheckpointStoreLatestStateSignature, /^checkpoint-state-[0-9a-f]{8}$/);
  assert.equal(snapshot.manimCheckpointStoreNextOrder, expectedManifest.nextOrder);
  assert.equal(snapshot.manimCheckpointStoreRequestedKey, expectedManifest.requestedKey);
  assert.equal(snapshot.manimCheckpointStoreRetainedKeysAfterRestore, "intro,slope handoff");
  assert.equal(snapshot.manimCheckpointStoreRestoreAction, "restore-and-invalidate-later");
  assert.equal(snapshot.manimCheckpointStoreRestoredOrder, "1");
  assert.match(snapshot.manimCheckpointStoreRestoredStateSignature, /^checkpoint-state-[0-9a-f]{8}$/);
  assert.notEqual(snapshot.manimCheckpointStoreLatestStateSignature, snapshot.manimCheckpointStoreRestoredStateSignature);
  assert.equal(snapshot.manimCheckpointStoreSourceContract, SCENE_CHECKPOINT_STORE_SOURCE_CONTRACT);
  assert.match(
    snapshot.manimCheckpointStoreStateSignatureSummary,
    /^intro=checkpoint-state-[0-9a-f]{8},slope handoff=checkpoint-state-[0-9a-f]{8},zoom detail=checkpoint-state-[0-9a-f]{8}$/
  );
  assert.equal(snapshot.manimCheckpointStoreSummary, expectedManifest.summary);
  assert.equal(attributes["data-viz-manim-checkpoint-store-can-restore"], expectedAttributes["data-viz-manim-checkpoint-store-can-restore"]);
  assert.equal(attributes["data-viz-manim-checkpoint-store-count"], expectedAttributes["data-viz-manim-checkpoint-store-count"]);
  assert.equal(attributes["data-viz-manim-checkpoint-store-invalidated-count"], expectedAttributes["data-viz-manim-checkpoint-store-invalidated-count"]);
  assert.equal(attributes["data-viz-manim-checkpoint-store-invalidated-keys"], expectedAttributes["data-viz-manim-checkpoint-store-invalidated-keys"]);
  assert.equal(attributes["data-viz-manim-checkpoint-store-invalidate-later"], expectedAttributes["data-viz-manim-checkpoint-store-invalidate-later"]);
  assert.equal(attributes["data-viz-manim-checkpoint-store-keys"], expectedAttributes["data-viz-manim-checkpoint-store-keys"]);
  assert.equal(attributes["data-viz-manim-checkpoint-store-latest-key"], expectedAttributes["data-viz-manim-checkpoint-store-latest-key"]);
  assert.equal(
    attributes["data-viz-manim-checkpoint-store-latest-state-signature"],
    snapshot.manimCheckpointStoreLatestStateSignature
  );
  assert.equal(attributes["data-viz-manim-checkpoint-store-next-order"], expectedAttributes["data-viz-manim-checkpoint-store-next-order"]);
  assert.equal(attributes["data-viz-manim-checkpoint-store-requested-key"], expectedAttributes["data-viz-manim-checkpoint-store-requested-key"]);
  assert.equal(
    attributes["data-viz-manim-checkpoint-store-retained-keys-after-restore"],
    expectedAttributes["data-viz-manim-checkpoint-store-retained-keys-after-restore"]
  );
  assert.equal(attributes["data-viz-manim-checkpoint-store-restore-action"], expectedAttributes["data-viz-manim-checkpoint-store-restore-action"]);
  assert.equal(attributes["data-viz-manim-checkpoint-store-restored-order"], expectedAttributes["data-viz-manim-checkpoint-store-restored-order"]);
  assert.equal(
    attributes["data-viz-manim-checkpoint-store-restored-state-signature"],
    snapshot.manimCheckpointStoreRestoredStateSignature
  );
  assert.equal(attributes["data-viz-manim-checkpoint-store-source-contract"], expectedAttributes["data-viz-manim-checkpoint-store-source-contract"]);
  assert.equal(
    attributes["data-viz-manim-checkpoint-store-state-signature-summary"],
    snapshot.manimCheckpointStoreStateSignatureSummary
  );
  assert.equal(attributes["data-viz-manim-checkpoint-store-summary"], expectedAttributes["data-viz-manim-checkpoint-store-summary"]);
});

test("records Mobject.animate builder source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const expectedCatalog = buildMathAnimateBuilderCatalog(buildMathSceneAnimatePlans(functionGraphSpec, runtimeState));
  const expectedAttributes = mathAnimateBuilderCatalogDataAttributes(expectedCatalog);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimAnimateBuilderPlanCount, expectedCatalog.planCount);
  assert.equal(snapshot.manimAnimateBuilderFirstPlanId, expectedCatalog.firstPlanId);
  assert.equal(snapshot.manimAnimateBuilderObjectIds, "function-curve,moving-probe");
  assert.equal(snapshot.manimAnimateBuilderTargetIds, "function-curve:attention-target,moving-probe:attention-target");
  assert.equal(snapshot.manimAnimateBuilderOperationCount, expectedCatalog.operationCount);
  assert.equal(snapshot.manimAnimateBuilderOperationTypes, "setColorRole,shift");
  assert.equal(snapshot.manimAnimateBuilderChangedFieldCount, expectedCatalog.changedFieldCount);
  assert.equal(snapshot.manimAnimateBuilderChangedNodeCount, expectedCatalog.changedNodeCount);
  assert.equal(snapshot.manimAnimateBuilderChangedNodeIds, "function-curve,moving-probe,probe-trace");
  assert.equal(snapshot.manimAnimateBuilderTotalDuration, expectedCatalog.totalDuration);
  assert.equal(snapshot.manimAnimateBuilderLaggedCount, expectedCatalog.laggedPlanCount);
  assert.equal(snapshot.manimAnimateBuilderPathCount, expectedCatalog.pathPlanCount);
  assert.equal(snapshot.manimAnimateBuilderSourceContract, ANIMATION_BUILDER_SOURCE_CONTRACT);
  assert.equal(snapshot.manimAnimateBuilderSummary, expectedCatalog.summary);
  assert.equal(attributes["data-viz-manim-animate-builder-plan-count"], expectedAttributes["data-viz-manim-animate-builder-plan-count"]);
  assert.equal(attributes["data-viz-manim-animate-builder-first-plan-id"], expectedAttributes["data-viz-manim-animate-builder-first-plan-id"]);
  assert.equal(attributes["data-viz-manim-animate-builder-object-ids"], expectedAttributes["data-viz-manim-animate-builder-object-ids"]);
  assert.equal(attributes["data-viz-manim-animate-builder-target-ids"], expectedAttributes["data-viz-manim-animate-builder-target-ids"]);
  assert.equal(attributes["data-viz-manim-animate-builder-operation-count"], expectedAttributes["data-viz-manim-animate-builder-operation-count"]);
  assert.equal(attributes["data-viz-manim-animate-builder-operation-types"], expectedAttributes["data-viz-manim-animate-builder-operation-types"]);
  assert.equal(attributes["data-viz-manim-animate-builder-changed-field-count"], expectedAttributes["data-viz-manim-animate-builder-changed-field-count"]);
  assert.equal(attributes["data-viz-manim-animate-builder-changed-node-count"], expectedAttributes["data-viz-manim-animate-builder-changed-node-count"]);
  assert.equal(attributes["data-viz-manim-animate-builder-changed-node-ids"], expectedAttributes["data-viz-manim-animate-builder-changed-node-ids"]);
  assert.equal(attributes["data-viz-manim-animate-builder-total-duration"], expectedAttributes["data-viz-manim-animate-builder-total-duration"]);
  assert.equal(attributes["data-viz-manim-animate-builder-lagged-count"], expectedAttributes["data-viz-manim-animate-builder-lagged-count"]);
  assert.equal(attributes["data-viz-manim-animate-builder-path-count"], expectedAttributes["data-viz-manim-animate-builder-path-count"]);
  assert.equal(attributes["data-viz-manim-animate-builder-source-contract"], ANIMATION_BUILDER_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-animate-builder-summary"], expectedAttributes["data-viz-manim-animate-builder-summary"]);
});

test("records always/f_always/always_redraw updater authoring source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const alwaysUpdaterScene: MathSceneSpec = {
    ...functionGraphSpec,
    alwaysMethodUpdaters: [
      {
        id: "probe:always-next-to",
        objectId: "moving-probe",
        operation: {
          buffExpression: { scale: 0.1, trackerId: "parameter:buff", type: "tracker" },
          direction: [0, 1, 0],
          targetObjectId: "function-curve",
          type: "nextTo"
        }
      }
    ],
    alwaysRedraw: [
      {
        dependencyTrackerIds: ["parameter:a", "parameter:missing"],
        factory: {
          colorRole: "function",
          conceptId: "function-rule",
          sampleCount: 8,
          tRange: [0, 1],
          type: "parametricCurve",
          x: { type: "t" },
          y: { scale: 1, trackerId: "parameter:a", type: "tracker" },
          z: { type: "constant", value: 0 }
        },
        id: "function-curve:always-redraw",
        objectId: "function-curve"
      }
    ],
    valueTrackers: [
      { conceptId: "function-rule", id: "parameter:a", label: "a", max: 4, min: 0, value: 2 },
      { conceptId: "probe-point", id: "parameter:buff", label: "buff", max: 1, min: 0, value: 0.4 }
    ]
  };
  const runtimeState = buildMathSceneRuntimeState(alwaysUpdaterScene, 0);
  const expectedCatalog = buildAlwaysUpdaterAuthoringCatalog({
    alwaysMethodUpdaters: alwaysUpdaterScene.alwaysMethodUpdaters,
    alwaysRedraw: alwaysUpdaterScene.alwaysRedraw,
    trackers: runtimeState.trackers
  });
  const expectedAlwaysMethodEvidence = buildAlwaysMethodUpdaterEvidence(alwaysUpdaterScene, runtimeState);
  const expectedAttributes = alwaysUpdaterAuthoringDataAttributes(expectedCatalog);
  const expectedAlwaysMethodAttributes = alwaysMethodUpdaterEvidenceDataAttributes(expectedAlwaysMethodEvidence);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: alwaysUpdaterScene
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimAlwaysUpdaterCount, expectedCatalog.totalUpdaterCount);
  assert.equal(snapshot.manimAlwaysUpdaterAlwaysMethodCount, expectedCatalog.alwaysMethodCount);
  assert.equal(snapshot.manimAlwaysUpdaterAlwaysRedrawCount, expectedCatalog.alwaysRedrawCount);
  assert.equal(snapshot.manimAlwaysUpdaterObjectIds, "function-curve,moving-probe");
  assert.equal(snapshot.manimAlwaysUpdaterUpdaterIds, "function-curve:always-redraw,probe:always-next-to");
  assert.equal(snapshot.manimAlwaysUpdaterDependencyTrackerCount, expectedCatalog.dependencyTrackerIds.length);
  assert.equal(snapshot.manimAlwaysUpdaterDependencyTrackerIds, "parameter:a,parameter:buff,parameter:missing");
  assert.equal(snapshot.manimAlwaysUpdaterMissingTrackerCount, 1);
  assert.equal(snapshot.manimAlwaysUpdaterMissingTrackerIds, "parameter:missing");
  assert.equal(snapshot.manimAlwaysUpdaterFactoryCount, 1);
  assert.equal(snapshot.manimAlwaysUpdaterOperationTypes, "nextTo");
  assert.equal(snapshot.manimAlwaysUpdaterSourceContract, ALWAYS_UPDATER_AUTHORING_SOURCE_CONTRACT);
  assert.equal(snapshot.manimAlwaysUpdaterSummary, expectedCatalog.summary);
  assert.equal(snapshot.manimAlwaysMethodCount, expectedAlwaysMethodEvidence.updaterCount);
  assert.equal(snapshot.manimAlwaysMethodPlacedCount, expectedAlwaysMethodEvidence.placedCount);
  assert.equal(snapshot.manimAlwaysMethodDynamicBuffCount, expectedAlwaysMethodEvidence.dynamicBuffCount);
  assert.equal(snapshot.manimAlwaysMethodUpdaterIds, "probe:always-next-to");
  assert.equal(snapshot.manimAlwaysMethodObjectIds, "moving-probe");
  assert.equal(snapshot.manimAlwaysMethodTargetObjectIds, "function-curve");
  assert.equal(snapshot.manimAlwaysMethodOperationTypes, "nextTo");
  assert.equal(snapshot.manimAlwaysMethodBuffSummary, expectedAlwaysMethodEvidence.buffSummary);
  assert.equal(snapshot.manimAlwaysMethodPlacementSummary, expectedAlwaysMethodEvidence.placementSummary);
  assert.equal(snapshot.manimAlwaysMethodSummary, expectedAlwaysMethodEvidence.summary);
  assert.equal(attributes["data-viz-manim-always-updater-count"], expectedAttributes["data-viz-manim-always-updater-count"]);
  assert.equal(attributes["data-viz-manim-always-updater-always-method-count"], expectedAttributes["data-viz-manim-always-updater-always-method-count"]);
  assert.equal(attributes["data-viz-manim-always-updater-always-redraw-count"], expectedAttributes["data-viz-manim-always-updater-always-redraw-count"]);
  assert.equal(attributes["data-viz-manim-always-updater-object-ids"], expectedAttributes["data-viz-manim-always-updater-object-ids"]);
  assert.equal(attributes["data-viz-manim-always-updater-updater-ids"], expectedAttributes["data-viz-manim-always-updater-updater-ids"]);
  assert.equal(attributes["data-viz-manim-always-updater-dependency-tracker-count"], expectedAttributes["data-viz-manim-always-updater-dependency-tracker-count"]);
  assert.equal(attributes["data-viz-manim-always-updater-dependency-tracker-ids"], expectedAttributes["data-viz-manim-always-updater-dependency-tracker-ids"]);
  assert.equal(attributes["data-viz-manim-always-updater-missing-tracker-count"], expectedAttributes["data-viz-manim-always-updater-missing-tracker-count"]);
  assert.equal(attributes["data-viz-manim-always-updater-factory-count"], expectedAttributes["data-viz-manim-always-updater-factory-count"]);
  assert.equal(attributes["data-viz-manim-always-updater-operation-types"], expectedAttributes["data-viz-manim-always-updater-operation-types"]);
  assert.equal(attributes["data-viz-manim-always-updater-source-contract"], ALWAYS_UPDATER_AUTHORING_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-always-updater-summary"], expectedAttributes["data-viz-manim-always-updater-summary"]);
  assert.equal(attributes["data-viz-manim-always-method-count"], expectedAlwaysMethodAttributes["data-viz-manim-always-method-count"]);
  assert.equal(attributes["data-viz-manim-always-method-placed-count"], expectedAlwaysMethodAttributes["data-viz-manim-always-method-placed-count"]);
  assert.equal(attributes["data-viz-manim-always-method-dynamic-buff-count"], expectedAlwaysMethodAttributes["data-viz-manim-always-method-dynamic-buff-count"]);
  assert.equal(attributes["data-viz-manim-always-method-updater-ids"], expectedAlwaysMethodAttributes["data-viz-manim-always-method-updater-ids"]);
  assert.equal(attributes["data-viz-manim-always-method-object-ids"], expectedAlwaysMethodAttributes["data-viz-manim-always-method-object-ids"]);
  assert.equal(attributes["data-viz-manim-always-method-target-object-ids"], expectedAlwaysMethodAttributes["data-viz-manim-always-method-target-object-ids"]);
  assert.equal(attributes["data-viz-manim-always-method-buff-summary"], expectedAlwaysMethodAttributes["data-viz-manim-always-method-buff-summary"]);
  assert.equal(attributes["data-viz-manim-always-method-placement-summary"], expectedAlwaysMethodAttributes["data-viz-manim-always-method-placement-summary"]);
  assert.equal(attributes["data-viz-manim-always-method-summary"], expectedAlwaysMethodAttributes["data-viz-manim-always-method-summary"]);
});

test("records CoordinateSystem c2p/p2c source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const expectedEvidence = buildCoordinateSystemEvidence(functionGraphSpec.coordinateSpace);
  const expectedAttributes = coordinateSystemEvidenceDataAttributes(expectedEvidence);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimCoordinateAxisCount, expectedEvidence.axisCount);
  assert.equal(snapshot.manimCoordinateSampleCount, expectedEvidence.sampleCount);
  assert.equal(snapshot.manimCoordinateC2pFiniteCount, expectedEvidence.finiteSampleCount);
  assert.equal(snapshot.manimCoordinateP2cRoundTripError, expectedEvidence.maxRoundTripError);
  assert.equal(snapshot.manimCoordinateMathRange, expectedEvidence.mathRangeSummary);
  assert.equal(snapshot.manimCoordinateWorldRange, expectedEvidence.worldRangeSummary);
  assert.equal(snapshot.manimCoordinateOriginWorldPoint, expectedEvidence.originWorldPoint);
  assert.equal(snapshot.manimCoordinateScale, expectedEvidence.scaleSummary);
  assert.equal(snapshot.manimCoordinateSystemReady, true);
  assert.equal(snapshot.manimCoordinateSummary, expectedEvidence.summary);
  assert.equal(attributes["data-viz-manim-coordinate-axis-count"], expectedAttributes["data-viz-manim-coordinate-axis-count"]);
  assert.equal(attributes["data-viz-manim-coordinate-sample-count"], expectedAttributes["data-viz-manim-coordinate-sample-count"]);
  assert.equal(attributes["data-viz-manim-coordinate-c2p-finite-count"], expectedAttributes["data-viz-manim-coordinate-c2p-finite-count"]);
  assert.equal(attributes["data-viz-manim-coordinate-p2c-roundtrip-error"], expectedAttributes["data-viz-manim-coordinate-p2c-roundtrip-error"]);
  assert.equal(attributes["data-viz-manim-coordinate-math-range"], expectedAttributes["data-viz-manim-coordinate-math-range"]);
  assert.equal(attributes["data-viz-manim-coordinate-world-range"], expectedAttributes["data-viz-manim-coordinate-world-range"]);
  assert.equal(attributes["data-viz-manim-coordinate-origin-world-point"], expectedAttributes["data-viz-manim-coordinate-origin-world-point"]);
  assert.equal(attributes["data-viz-manim-coordinate-scale"], expectedAttributes["data-viz-manim-coordinate-scale"]);
  assert.equal(attributes["data-viz-manim-coordinate-system-ready"], "true");
  assert.equal(attributes["data-viz-manim-coordinate-summary"], expectedAttributes["data-viz-manim-coordinate-summary"]);
});

test("records CoordinateSpace math-world mapping and arc-length source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const firstCurve = functionGraphSpec.objects.find((object) => object.type === "parametricCurve");
  assert.ok(firstCurve);
  const expectedEvidence = buildCoordinateSpaceEvidence(functionGraphSpec.coordinateSpace, {
    curveWorldSamples: firstCurve.samples
  });
  const expectedAttributes = coordinateSpaceEvidenceDataAttributes(expectedEvidence);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimCoordinateSpaceSourceContract, "CoordinateSystem.c2p/p2c|get_graph|arc-length sampling");
  assert.equal(snapshot.manimCoordinateSpaceMathRange, expectedEvidence.mathRangeSummary);
  assert.equal(snapshot.manimCoordinateSpaceWorldRange, expectedEvidence.worldRangeSummary);
  assert.equal(snapshot.manimCoordinateSpaceScale, expectedEvidence.scaleSummary);
  assert.equal(snapshot.manimCoordinateSpaceC2pSummary, expectedEvidence.c2pSummary);
  assert.equal(snapshot.manimCoordinateSpaceP2cSummary, expectedEvidence.p2cSummary);
  assert.equal(snapshot.manimCoordinateSpaceVectorDelta, expectedEvidence.vectorDeltaSummary);
  assert.equal(snapshot.manimCoordinateSpaceSampleCount, expectedEvidence.sampleCount);
  assert.equal(snapshot.manimCoordinateSpaceFiniteSampleCount, expectedEvidence.finiteSampleCount);
  assert.equal(snapshot.manimCoordinateSpaceRoundTripError, expectedEvidence.maxRoundTripError);
  assert.equal(snapshot.manimCoordinateSpaceCurveSampleCount, expectedEvidence.curveSampleCount);
  assert.equal(snapshot.manimCoordinateSpaceArcLength, expectedEvidence.arcLength);
  assert.equal(snapshot.manimCoordinateSpaceResampledCount, expectedEvidence.resampledSampleCount);
  assert.equal(snapshot.manimCoordinateSpaceEndpoints, expectedEvidence.endpointSummary);
  assert.equal(snapshot.manimCoordinateSpaceSummary, expectedEvidence.summary);
  assert.equal(attributes["data-viz-manim-coordinate-space-source-contract"], expectedAttributes["data-viz-manim-coordinate-space-source-contract"]);
  assert.equal(attributes["data-viz-manim-coordinate-space-math-range"], expectedAttributes["data-viz-manim-coordinate-space-math-range"]);
  assert.equal(attributes["data-viz-manim-coordinate-space-world-range"], expectedAttributes["data-viz-manim-coordinate-space-world-range"]);
  assert.equal(attributes["data-viz-manim-coordinate-space-scale"], expectedAttributes["data-viz-manim-coordinate-space-scale"]);
  assert.equal(attributes["data-viz-manim-coordinate-space-c2p-summary"], expectedAttributes["data-viz-manim-coordinate-space-c2p-summary"]);
  assert.equal(attributes["data-viz-manim-coordinate-space-p2c-summary"], expectedAttributes["data-viz-manim-coordinate-space-p2c-summary"]);
  assert.equal(attributes["data-viz-manim-coordinate-space-vector-delta"], expectedAttributes["data-viz-manim-coordinate-space-vector-delta"]);
  assert.equal(attributes["data-viz-manim-coordinate-space-sample-count"], expectedAttributes["data-viz-manim-coordinate-space-sample-count"]);
  assert.equal(attributes["data-viz-manim-coordinate-space-finite-sample-count"], expectedAttributes["data-viz-manim-coordinate-space-finite-sample-count"]);
  assert.equal(attributes["data-viz-manim-coordinate-space-roundtrip-error"], expectedAttributes["data-viz-manim-coordinate-space-roundtrip-error"]);
  assert.equal(attributes["data-viz-manim-coordinate-space-curve-sample-count"], expectedAttributes["data-viz-manim-coordinate-space-curve-sample-count"]);
  assert.equal(attributes["data-viz-manim-coordinate-space-arc-length"], expectedAttributes["data-viz-manim-coordinate-space-arc-length"]);
  assert.equal(attributes["data-viz-manim-coordinate-space-resampled-count"], expectedAttributes["data-viz-manim-coordinate-space-resampled-count"]);
  assert.equal(attributes["data-viz-manim-coordinate-space-endpoints"], expectedAttributes["data-viz-manim-coordinate-space-endpoints"]);
  assert.equal(attributes["data-viz-manim-coordinate-space-summary"], expectedAttributes["data-viz-manim-coordinate-space-summary"]);
});

test("records SurfaceObject sampling source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const surfaceScene: MathSceneSpec = {
    ...functionGraphSpec,
    objects: [
      ...functionGraphSpec.objects,
      {
        colorRole: "surface",
        conceptId: "sampled-height-field",
        id: "sampled-surface",
        samples: [
          [
            [0, 0, 0],
            [0, 1, 1],
            [0, 2, 2]
          ],
          [
            [1, 0, 1],
            [1, 1, 2],
            [1, 2, 3]
          ]
        ],
        type: "parametricSurface",
        uRange: [0, 1],
        vRange: [0, 2]
      }
    ]
  };
  const runtimeState = buildMathSceneRuntimeState(surfaceScene, 0);
  const expectedEvidence = buildSurfaceObjectEvidence([
    buildSurfaceObjectFromGrid({
      colorRole: "surface",
      conceptId: "sampled-height-field",
      id: "sampled-surface",
      samples: [
        [
          [0, 0, 0],
          [0, 1, 1],
          [0, 2, 2]
        ],
        [
          [1, 0, 1],
          [1, 1, 2],
          [1, 2, 3]
        ]
      ],
      uRange: [0, 1],
      vRange: [0, 2]
    })
  ]);
  const expectedAttributes = surfaceObjectEvidenceDataAttributes(expectedEvidence);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: surfaceScene
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimSurfaceObjectCount, expectedEvidence.objectCount);
  assert.equal(snapshot.manimSurfaceObjectIds, "sampled-surface");
  assert.equal(snapshot.manimSurfaceSampleCount, expectedEvidence.sampleCount);
  assert.equal(snapshot.manimSurfaceFiniteSampleCount, expectedEvidence.finiteSampleCount);
  assert.equal(snapshot.manimSurfaceNormalCount, expectedEvidence.normalCount);
  assert.equal(snapshot.manimSurfaceFiniteNormalCount, expectedEvidence.finiteNormalCount);
  assert.equal(snapshot.manimSurfaceCellCount, expectedEvidence.cellCount);
  assert.equal(snapshot.manimSurfaceTriangleCount, expectedEvidence.triangleCount);
  assert.equal(snapshot.manimSurfaceWireframeRowCount, expectedEvidence.wireframeRowCount);
  assert.equal(snapshot.manimSurfaceWireframeColumnCount, expectedEvidence.wireframeColumnCount);
  assert.equal(snapshot.manimSurfaceGridSummary, "sampled-surface=2x3");
  assert.equal(snapshot.manimSurfaceTopologySummary, "sampled-surface:cells=1x2:triangles=4");
  assert.equal(snapshot.manimSurfaceRangeSummary, "sampled-surface:u=0..1:v=0..2");
  assert.equal(snapshot.manimSurfaceBounds, "sampled-surface:min=0.000,0.000,0.000:max=1.000,2.000,3.000:center=0.500,1.000,1.500");
  assert.equal(snapshot.manimSurfaceSourceContract, SURFACE_OBJECT_SOURCE_CONTRACT);
  assert.equal(snapshot.manimSurfaceSummary, expectedEvidence.summary);
  assert.equal(attributes["data-viz-manim-surface-source-contract"], SURFACE_OBJECT_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-surface-object-count"], expectedAttributes["data-viz-manim-surface-object-count"]);
  assert.equal(attributes["data-viz-manim-surface-object-ids"], expectedAttributes["data-viz-manim-surface-object-ids"]);
  assert.equal(attributes["data-viz-manim-surface-sample-count"], expectedAttributes["data-viz-manim-surface-sample-count"]);
  assert.equal(attributes["data-viz-manim-surface-finite-sample-count"], expectedAttributes["data-viz-manim-surface-finite-sample-count"]);
  assert.equal(attributes["data-viz-manim-surface-normal-count"], expectedAttributes["data-viz-manim-surface-normal-count"]);
  assert.equal(attributes["data-viz-manim-surface-finite-normal-count"], expectedAttributes["data-viz-manim-surface-finite-normal-count"]);
  assert.equal(attributes["data-viz-manim-surface-cell-count"], expectedAttributes["data-viz-manim-surface-cell-count"]);
  assert.equal(attributes["data-viz-manim-surface-triangle-count"], expectedAttributes["data-viz-manim-surface-triangle-count"]);
  assert.equal(attributes["data-viz-manim-surface-wireframe-row-count"], expectedAttributes["data-viz-manim-surface-wireframe-row-count"]);
  assert.equal(attributes["data-viz-manim-surface-wireframe-column-count"], expectedAttributes["data-viz-manim-surface-wireframe-column-count"]);
  assert.equal(attributes["data-viz-manim-surface-grid-summary"], expectedAttributes["data-viz-manim-surface-grid-summary"]);
  assert.equal(attributes["data-viz-manim-surface-topology-summary"], expectedAttributes["data-viz-manim-surface-topology-summary"]);
  assert.equal(attributes["data-viz-manim-surface-range-summary"], expectedAttributes["data-viz-manim-surface-range-summary"]);
  assert.equal(attributes["data-viz-manim-surface-bounds"], expectedAttributes["data-viz-manim-surface-bounds"]);
  assert.equal(attributes["data-viz-manim-surface-summary"], expectedAttributes["data-viz-manim-surface-summary"]);
});

test("records TracedPath/TracingTail source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 3);
  const curveObject = runtimeState.objectGraph.byId["function-curve"];
  assert.ok(curveObject?.renderState.kind === "polyline");
  const movingProgress = runtimeState.trackers.byId["moving-probe:progress"]?.value ?? 1;
  const expectedTail = buildTracingTailFromPoints({
    durationSeconds: 1.4,
    id: "probe-trace",
    maxSampleCount: 32,
    nowSeconds: runtimeState.timeline.elapsedSeconds,
    points: pointwiseBecomePartialCurveObject(
      buildCurveObject({
        colorRole: curveObject.colorRole ?? "function",
        conceptId: curveObject.conceptId,
        id: curveObject.id,
        samples: curveObject.renderState.points,
        style: curveObject.renderState.style
      }),
      Math.max(0, movingProgress - 0.18),
      movingProgress
    ).curve.samples
  });
  const expectedEvidence = buildTracingTailEvidence([
    {
      descriptor: expectedTail,
      durationSeconds: 1.4,
      sourceObjectId: "moving-probe"
    }
  ]);
  const expectedAttributes = tracingTailEvidenceDataAttributes(expectedEvidence);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimTracingTailCount, expectedEvidence.tailCount);
  assert.equal(snapshot.manimTracingTailIds, "probe-trace");
  assert.equal(snapshot.manimTracingTailSourceIds, "moving-probe");
  assert.equal(snapshot.manimTracingTailSampleCount, expectedEvidence.sampleCount);
  assert.equal(snapshot.manimTracingTailFiniteSampleCount, expectedEvidence.finiteSampleCount);
  assert.equal(snapshot.manimTracingTailBufferCapacity, expectedEvidence.bufferCapacity);
  assert.equal(snapshot.manimTracingTailBufferPolicySummary, expectedEvidence.bufferPolicySummary);
  assert.equal(snapshot.manimTracingTailDurationSummary, "probe-trace=1.400s");
  assert.equal(snapshot.manimTracingTailFillRatioSummary, expectedEvidence.fillRatioSummary);
  assert.equal(snapshot.manimTracingTailGradientMonotonic, expectedEvidence.gradientMonotonic);
  assert.equal(snapshot.manimTracingTailGradientDirectionSummary, expectedEvidence.gradientDirectionSummary);
  assert.equal(snapshot.manimTracingTailGradientSummary, expectedEvidence.gradientSummary);
  assert.equal(snapshot.manimTracingTailStalePointSummary, expectedEvidence.stalePointSummary);
  assert.equal(snapshot.manimTracingTailFreshPointSummary, expectedEvidence.freshPointSummary);
  assert.equal(snapshot.manimTracingTailAgeRange, expectedEvidence.ageRange);
  assert.equal(snapshot.manimTracingTailTimestampRange, expectedEvidence.timestampRange);
  assert.equal(snapshot.manimTracingTailSampleCadenceSummary, expectedEvidence.sampleCadenceSummary);
  assert.equal(snapshot.manimTracingTailSampleTimeOrderSummary, expectedEvidence.sampleTimeOrderSummary);
  assert.equal(snapshot.manimTracingTailOpacityRange, expectedEvidence.opacityRange);
  assert.equal(snapshot.manimTracingTailStrokeWidthRange, expectedEvidence.strokeWidthRange);
  assert.equal(snapshot.manimTracingTailSummary, expectedEvidence.summary);
  assert.equal(snapshot.manimTracingTailTracedPointSourceSummary, expectedEvidence.tracedPointSourceSummary);
  assert.equal(snapshot.manimTracingTailSourceContract, TRACING_TAIL_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-tracing-tail-source-contract"], TRACING_TAIL_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-tracing-tail-count"], expectedAttributes["data-viz-manim-tracing-tail-count"]);
  assert.equal(attributes["data-viz-manim-tracing-tail-ids"], expectedAttributes["data-viz-manim-tracing-tail-ids"]);
  assert.equal(attributes["data-viz-manim-tracing-tail-source-ids"], expectedAttributes["data-viz-manim-tracing-tail-source-ids"]);
  assert.equal(attributes["data-viz-manim-tracing-tail-sample-count"], expectedAttributes["data-viz-manim-tracing-tail-sample-count"]);
  assert.equal(attributes["data-viz-manim-tracing-tail-finite-sample-count"], expectedAttributes["data-viz-manim-tracing-tail-finite-sample-count"]);
  assert.equal(attributes["data-viz-manim-tracing-tail-buffer-capacity"], expectedAttributes["data-viz-manim-tracing-tail-buffer-capacity"]);
  assert.equal(attributes["data-viz-manim-tracing-tail-buffer-policy-summary"], expectedAttributes["data-viz-manim-tracing-tail-buffer-policy-summary"]);
  assert.equal(attributes["data-viz-manim-tracing-tail-duration-summary"], expectedAttributes["data-viz-manim-tracing-tail-duration-summary"]);
  assert.equal(attributes["data-viz-manim-tracing-tail-fill-ratio-summary"], expectedAttributes["data-viz-manim-tracing-tail-fill-ratio-summary"]);
  assert.equal(attributes["data-viz-manim-tracing-tail-gradient-monotonic"], expectedAttributes["data-viz-manim-tracing-tail-gradient-monotonic"]);
  assert.equal(
    attributes["data-viz-manim-tracing-tail-gradient-direction-summary"],
    expectedAttributes["data-viz-manim-tracing-tail-gradient-direction-summary"]
  );
  assert.equal(attributes["data-viz-manim-tracing-tail-gradient-summary"], expectedAttributes["data-viz-manim-tracing-tail-gradient-summary"]);
  assert.equal(attributes["data-viz-manim-tracing-tail-stale-point-summary"], expectedAttributes["data-viz-manim-tracing-tail-stale-point-summary"]);
  assert.equal(attributes["data-viz-manim-tracing-tail-fresh-point-summary"], expectedAttributes["data-viz-manim-tracing-tail-fresh-point-summary"]);
  assert.equal(attributes["data-viz-manim-tracing-tail-age-range"], expectedAttributes["data-viz-manim-tracing-tail-age-range"]);
  assert.equal(attributes["data-viz-manim-tracing-tail-timestamp-range"], expectedAttributes["data-viz-manim-tracing-tail-timestamp-range"]);
  assert.equal(
    attributes["data-viz-manim-tracing-tail-sample-cadence-summary"],
    expectedAttributes["data-viz-manim-tracing-tail-sample-cadence-summary"]
  );
  assert.equal(
    attributes["data-viz-manim-tracing-tail-sample-time-order-summary"],
    expectedAttributes["data-viz-manim-tracing-tail-sample-time-order-summary"]
  );
  assert.equal(attributes["data-viz-manim-tracing-tail-opacity-range"], expectedAttributes["data-viz-manim-tracing-tail-opacity-range"]);
  assert.equal(attributes["data-viz-manim-tracing-tail-stroke-width-range"], expectedAttributes["data-viz-manim-tracing-tail-stroke-width-range"]);
  assert.equal(attributes["data-viz-manim-tracing-tail-summary"], expectedAttributes["data-viz-manim-tracing-tail-summary"]);
  assert.equal(attributes["data-viz-manim-tracing-tail-traced-point-source-summary"], expectedAttributes["data-viz-manim-tracing-tail-traced-point-source-summary"]);
});

test("records Playwright smoke-hook manifest source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec,
    stateSnapshotEvidence: {
      frameIndex: 7,
      selectedParameterId: "value"
    }
  });
  const attributes = evidenceDataAttributes(snapshot);
  const expectedJsonPayloadSelectors = threeDCanvasRequiredSelectors
    .filter((selector) => selector.endsWith("-json"))
    .map((selector) => `[${selector}]`);
  const expectedSelectorCount = threeDCanvasRequiredSelectors.length + 1;
  const expectedAttributeCount = threeDCanvasRequiredDataAttributes.length;
  const expectedJsonPayloadCount = expectedJsonPayloadSelectors.length;

  assert.equal(snapshot.manimSceneExportReady, true);
  assert.equal(snapshot.manimSceneExportObjectCount, functionGraphSpec.objects.length);
  assert.equal(snapshot.manimSceneExportBeatCount, functionGraphSpec.timeline.length);
  assert.equal(snapshot.manimSceneExportFormulaTokenCount, 2);
  assert.equal(snapshot.manimSceneExportSemanticBindingCount, 2);
  assert.equal(snapshot.manimSceneExportSourceContract, SCENE_EXPORT_SOURCE_CONTRACT);
  assert.match(snapshot.manimSceneExportSignature, /^fnv1a-[0-9a-f]{8}$/);
  assert.equal(snapshot.manimSmokeHookReady, true);
  assert.equal(snapshot.manimSmokeHookSceneId, "mais-manim-function-graph");
  assert.equal(snapshot.manimSmokeHookSelectorCount, expectedSelectorCount);
  assert.equal(snapshot.manimSmokeHookAttributeCount, expectedAttributeCount);
  assert.equal(snapshot.manimSmokeHookConvertedSelectorCount, 1);
  assert.equal(snapshot.manimSmokeHookSelectorConversionSummary, "converted=1:three-d-r3f-surface=>data-viz-name");
  assert.equal(snapshot.manimSmokeHookJsonPayloadCount, expectedJsonPayloadCount);
  assert.deepEqual(snapshot.manimSmokeHookJsonPayloadSelectors, expectedJsonPayloadSelectors);
  assert.match(snapshot.manimSmokeHookSignature, /^smoke-[0-9a-f]{8}$/);
  assert.equal(snapshot.manimSmokeHookSourceContract, expectedSmokeHookSourceContract);
  assert.equal(
    snapshot.manimSmokeHookSummary,
    `smoke:mais-manim-function-graph:selectors=${expectedSelectorCount}:attributes=${expectedAttributeCount}:payloads=${expectedJsonPayloadCount}`
  );
  assert.equal(snapshot.manimSceneInitSourceContract, SCENE_INITIALIZATION_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-scene-init-ready"], "true");
  assert.equal(attributes["data-viz-manim-scene-init-camera-ready"], "true");
  assert.equal(attributes["data-viz-manim-scene-init-camera-frame-ready"], "true");
  assert.equal(attributes["data-viz-manim-scene-init-file-writer-ready"], "true");
  assert.equal(attributes["data-viz-manim-scene-init-num-plays"], "0");
  assert.equal(attributes["data-viz-manim-scene-init-random-seed-signature"], snapshot.manimRandomSeedSignature);
  assert.equal(attributes["data-viz-manim-scene-init-source-contract"], SCENE_INITIALIZATION_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-scene-export-ready"], "true");
  assert.equal(attributes["data-viz-manim-scene-export-object-count"], String(functionGraphSpec.objects.length));
  assert.equal(attributes["data-viz-manim-scene-export-beat-count"], String(functionGraphSpec.timeline.length));
  assert.equal(attributes["data-viz-manim-scene-export-formula-token-count"], "2");
  assert.equal(attributes["data-viz-manim-scene-export-semantic-binding-count"], "2");
  assert.equal(attributes["data-viz-manim-scene-export-source-contract"], SCENE_EXPORT_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-scene-export-signature"], snapshot.manimSceneExportSignature);
  assert.equal(attributes["data-viz-manim-smoke-hook-ready"], "true");
  assert.equal(attributes["data-viz-manim-smoke-hook-scene-id"], "mais-manim-function-graph");
  assert.equal(attributes["data-viz-manim-smoke-hook-selector-count"], String(expectedSelectorCount));
  assert.equal(attributes["data-viz-manim-smoke-hook-attribute-count"], String(expectedAttributeCount));
  assert.equal(attributes["data-viz-manim-smoke-hook-converted-selector-count"], "1");
  assert.equal(attributes["data-viz-manim-smoke-hook-selector-conversion-summary"], snapshot.manimSmokeHookSelectorConversionSummary);
  assert.equal(attributes["data-viz-manim-smoke-hook-json-payload-count"], String(expectedJsonPayloadCount));
  assert.equal(attributes["data-viz-manim-smoke-hook-signature"], snapshot.manimSmokeHookSignature);
  assert.equal(attributes["data-viz-manim-smoke-hook-source-contract"], expectedSmokeHookSourceContract);
  assert.equal(attributes["data-viz-manim-smoke-hook-summary"], snapshot.manimSmokeHookSummary);
});

test("records VMobject Bezier path source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0.5);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.vmobjectBezierSourceContract, VMOBJECT_BEZIER_PATH_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-vmobject-bezier-source-contract"], VMOBJECT_BEZIER_PATH_SOURCE_CONTRACT);
  assert.match(VMOBJECT_BEZIER_PATH_SOURCE_CONTRACT, /VMobject/);
  assert.match(VMOBJECT_BEZIER_PATH_SOURCE_CONTRACT, /pointwise_become_partial/);
});

test("records VMobject path-builder construction source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.vmobjectPathBuilderPathCount, 1);
  assert.equal(snapshot.vmobjectPathBuilderCommandCount, 73);
  assert.equal(snapshot.vmobjectPathBuilderStartNewPathCount, 1);
  assert.equal(snapshot.vmobjectPathBuilderAddLineToCount, 71);
  assert.equal(snapshot.vmobjectPathBuilderAddCubicBezierCurveToCount, 0);
  assert.equal(snapshot.vmobjectPathBuilderClosePathCount, 0);
  assert.equal(snapshot.vmobjectPathBuilderSetPointsAsCornersCount, 1);
  assert.equal(snapshot.vmobjectPathBuilderLineSegmentCount, 71);
  assert.equal(snapshot.vmobjectPathBuilderCubicSegmentCount, 0);
  assert.equal(snapshot.vmobjectPathBuilderClosedPathCount, 0);
  assert.equal(snapshot.vmobjectPathBuilderAnchorPointCount, 72);
  assert.equal(snapshot.vmobjectPathBuilderHandlePointCount, 0);
  assert.equal(snapshot.vmobjectPathBuilderPathIds, "function-curve");
  assert.equal(snapshot.vmobjectPathBuilderSourceContract, VMOBJECT_PATH_BUILDER_SOURCE_CONTRACT);
  assert.match(snapshot.vmobjectPathBuilderSignature, /^vmobject-path-builder-[0-9a-f]{8}$/);
  assert.equal(
    snapshot.vmobjectPathBuilderSummary,
    "vmobject-path-builder:paths=1:commands=73:start=1:line=71:cubic=0:close=0:corners=1:segments=71:closed=0:ids=function-curve"
  );
  assert.equal(attributes["data-viz-vmobject-path-builder-path-count"], "1");
  assert.equal(attributes["data-viz-vmobject-path-builder-command-count"], "73");
  assert.equal(attributes["data-viz-vmobject-path-builder-start-new-path-count"], "1");
  assert.equal(attributes["data-viz-vmobject-path-builder-add-line-to-count"], "71");
  assert.equal(attributes["data-viz-vmobject-path-builder-add-cubic-bezier-count"], "0");
  assert.equal(attributes["data-viz-vmobject-path-builder-close-path-count"], "0");
  assert.equal(attributes["data-viz-vmobject-path-builder-set-points-as-corners-count"], "1");
  assert.equal(attributes["data-viz-vmobject-path-builder-line-segment-count"], "71");
  assert.equal(attributes["data-viz-vmobject-path-builder-cubic-segment-count"], "0");
  assert.equal(attributes["data-viz-vmobject-path-builder-closed-path-count"], "0");
  assert.equal(attributes["data-viz-vmobject-path-builder-anchor-point-count"], "72");
  assert.equal(attributes["data-viz-vmobject-path-builder-handle-point-count"], "0");
  assert.equal(attributes["data-viz-vmobject-path-builder-path-ids"], "function-curve");
  assert.equal(attributes["data-viz-vmobject-path-builder-source-contract"], VMOBJECT_PATH_BUILDER_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-vmobject-path-builder-summary"], snapshot.vmobjectPathBuilderSummary);
});

test("records VMobject smooth-path source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.vmobjectSmoothPathCount, 1);
  assert.equal(snapshot.vmobjectSmoothPathCommandCount, 3);
  assert.equal(snapshot.vmobjectSmoothPathSetPointsSmoothlyCount, 1);
  assert.equal(snapshot.vmobjectSmoothPathMakeSmoothCount, 1);
  assert.equal(snapshot.vmobjectSmoothPathChangeAnchorModeCount, 1);
  assert.equal(snapshot.vmobjectSmoothPathInsertNCurvesCount, 0);
  assert.equal(snapshot.vmobjectSmoothPathCubicSegmentCount, 71);
  assert.equal(snapshot.vmobjectSmoothPathAnchorPointCount, 72);
  assert.equal(snapshot.vmobjectSmoothPathHandlePointCount, 142);
  assert.equal(snapshot.vmobjectSmoothPathContinuityPassCount, 1);
  assert.equal(snapshot.vmobjectSmoothPathIds, "function-curve");
  assert.equal(snapshot.vmobjectSmoothPathSourceContract, VMOBJECT_SMOOTH_PATH_SOURCE_CONTRACT);
  assert.match(snapshot.vmobjectSmoothPathSignature, /^vmobject-smooth-path-[0-9a-f]{8}$/);
  assert.match(snapshot.vmobjectSmoothPathSummary, /^vmobject-smooth-path:paths=1:commands=3:cubic=71:anchors=72:handles=142:continuity=1:maxHandle=/);
  assert.equal(attributes["data-viz-vmobject-smooth-path-count"], "1");
  assert.equal(attributes["data-viz-vmobject-smooth-path-command-count"], "3");
  assert.equal(attributes["data-viz-vmobject-smooth-path-set-points-smoothly-count"], "1");
  assert.equal(attributes["data-viz-vmobject-smooth-path-make-smooth-count"], "1");
  assert.equal(attributes["data-viz-vmobject-smooth-path-change-anchor-mode-count"], "1");
  assert.equal(attributes["data-viz-vmobject-smooth-path-insert-n-curves-count"], "0");
  assert.equal(attributes["data-viz-vmobject-smooth-path-cubic-segment-count"], "71");
  assert.equal(attributes["data-viz-vmobject-smooth-path-anchor-point-count"], "72");
  assert.equal(attributes["data-viz-vmobject-smooth-path-handle-point-count"], "142");
  assert.equal(attributes["data-viz-vmobject-smooth-path-continuity-pass-count"], "1");
  assert.equal(attributes["data-viz-vmobject-smooth-path-ids"], "function-curve");
  assert.equal(attributes["data-viz-vmobject-smooth-path-source-contract"], VMOBJECT_SMOOTH_PATH_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-vmobject-smooth-path-summary"], snapshot.vmobjectSmoothPathSummary);
});

test("records capture and SceneFileWriter source contracts for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const measuredViewport = { height: 320, width: 360 };
  const snapshot = buildMathSceneEvidenceSnapshot({
    captureEvidence: {
      byteCount: 2048,
      kind: "screenshot",
      requestCount: 2,
      status: "captured"
    },
    formulaLayerViewport: measuredViewport,
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec,
    fileWriterSegmentEvidence: {
      existingInsertIndexes: [0],
      movieFileExtension: ".mp4",
      requestTempRecord: true,
      subdivideOutput: true,
      writeToMovie: true
    },
    stateSnapshotEvidence: {
      frameIndex: 7,
      selectedParameterId: "value"
    }
  });
  const attributes = evidenceDataAttributes(snapshot);
  const segmentPlan = buildSceneFileWriterSegmentPlan({
    existingInsertIndexes: [0],
    movieFileExtension: ".mp4",
    numPlays: snapshot.manimPlaybackActivePlayIndex,
    outputSlug: snapshot.manimFileWriterOutputSlug,
    requestTempRecord: true,
    sceneId: functionGraphSpec.sceneId,
    subdivideOutput: true,
    writeToMovie: true
  });
  const expectedSegmentAttributes = sceneFileWriterSegmentDataAttributes(segmentPlan);
  const bridgePlan = buildScenePlaybackFileWriterBridgePlan({
    movieFileExtension: ".mp4",
    outputSlug: snapshot.manimFileWriterOutputSlug,
    playbackPlan: buildScenePlaybackPlan(functionGraphSpec.timeline, { fps: 4 }),
    sceneId: functionGraphSpec.sceneId,
    subdivideOutput: true,
    writeToMovie: true
  });
  const expectedBridgeAttributes = scenePlaybackFileWriterBridgeDataAttributes(bridgePlan);
  const combinePlan = buildSceneFileWriterCombinePlan({
    fileWriterReady: snapshot.manimFileWriterReady,
    movieFileExtension: ".mp4",
    outputSlug: snapshot.manimFileWriterOutputSlug,
    playbackBridge: bridgePlan,
    sceneId: functionGraphSpec.sceneId,
    subdivideOutput: true,
    writeToMovie: true
  });
  const expectedCombineAttributes = sceneFileWriterCombineDataAttributes(combinePlan);

  assert.equal(snapshot.manimCaptureByteCount, 2048);
  assert.equal(snapshot.manimCaptureCameraShot, "overview");
  assert.equal(snapshot.manimCaptureElapsedSeconds, 0);
  assert.equal(snapshot.manimCaptureFps, 30);
  assert.equal(snapshot.manimCaptureFrameCount, 1);
  assert.equal(snapshot.manimCaptureHeight, measuredViewport.height);
  assert.equal(snapshot.manimCaptureKind, "screenshot");
  assert.equal(snapshot.manimCaptureQualityPreset, "interactive");
  assert.equal(snapshot.manimCaptureRendererMode, "interactive");
  assert.equal(snapshot.manimCaptureRequestCount, 2);
  assert.equal(snapshot.manimCaptureDevicePixelRatio, 1);
  assert.equal(snapshot.manimCaptureSamplesPerPixel, 2);
  assert.equal(snapshot.manimCaptureTransparentBackground, false);
  assert.equal(snapshot.manimCaptureBackgroundColor, "#020617");
  assert.equal(snapshot.manimCaptureBackgroundAlpha, 1);
  assert.match(snapshot.manimCaptureSceneSignature, /^fnv1a-[0-9a-f]{8}$/);
  assert.equal(snapshot.manimCaptureSourceContract, SCENE_CAPTURE_SOURCE_CONTRACT);
  assert.equal(snapshot.manimCaptureStatus, "captured");
  assert.equal((snapshot as { manimCaptureTarget?: string }).manimCaptureTarget, "canvas");
  assert.match((snapshot as { manimCaptureFramebufferId?: string }).manimCaptureFramebufferId ?? "", /^fb-mais-manim-function-graph-overview-\d+x\d+-canvas$/);
  assert.equal((snapshot as { manimCaptureFramebufferStatus?: string }).manimCaptureFramebufferStatus, "ready");
  assert.equal((snapshot as { manimCaptureRenderGroupCount?: number }).manimCaptureRenderGroupCount, 4);
  assert.equal((snapshot as { manimCaptureRenderGroupIds?: string }).manimCaptureRenderGroupIds, "axes,function-curve,moving-probe,probe-trace");
  assert.equal((snapshot as { manimCaptureRenderGroupSummary?: string }).manimCaptureRenderGroupSummary, "scene=4:foreground=0:fixedInFrame=0:all=4");
  assert.match(
    (snapshot as { manimCaptureRenderPassSummary?: string }).manimCaptureRenderPassSummary ?? "",
    /^capture-pass:target=canvas:framebuffer=fb-mais-manim-function-graph-overview-\d+x\d+-canvas:groups=scene\(4\)>foreground\(0\)>fixedInFrame\(0\):frames=1$/
  );
  assert.equal(snapshot.manimCaptureSummary, "screenshot:mais-manim-function-graph:overview:frames=1:status=captured");
  assert.equal(snapshot.manimCaptureWidth, measuredViewport.width);
  assert.equal(snapshot.manimFileWriterArtifactCount, 5);
  assert.match(snapshot.manimFileWriterArtifactFileSummary, /^mais-manim-function-graph-fnv1a-[0-9a-f]{8}\.manifest\.json\|/);
  assert.equal(snapshot.manimFileWriterArtifactKindSummary, "manifest|scene-spec|state-snapshot|smoke-hook|media");
  assert.equal(snapshot.manimFileWriterArtifactMimeSummary, "application/json=4|image/png=1");
  assert.equal(snapshot.manimFileWriterByteCount, 2048);
  assert.equal(snapshot.manimFileWriterCaptureBackgroundAlpha, 1);
  assert.equal(snapshot.manimFileWriterCaptureBackgroundColor, "#020617");
  assert.equal(snapshot.manimFileWriterCaptureDevicePixelRatio, 1);
  assert.equal(snapshot.manimFileWriterCaptureFps, 30);
  assert.equal(snapshot.manimFileWriterCaptureHeight, measuredViewport.height);
  assert.equal(snapshot.manimFileWriterCaptureKind, "screenshot");
  assert.equal(snapshot.manimFileWriterCaptureQualityPreset, "interactive");
  assert.equal(snapshot.manimFileWriterCaptureRendererMode, "interactive");
  assert.equal(snapshot.manimFileWriterCaptureSamplesPerPixel, 2);
  assert.equal(snapshot.manimFileWriterCaptureStatus, "captured");
  assert.equal(snapshot.manimFileWriterCaptureTransparentBackground, false);
  assert.equal(snapshot.manimFileWriterCaptureWidth, measuredViewport.width);
  assert.equal(snapshot.manimFileWriterFrameCount, 1);
  assert.equal(snapshot.manimFileWriterJsonArtifactCount, 4);
  assert.equal(snapshot.manimFileWriterMediaArtifactCount, 1);
  assert.match(snapshot.manimFileWriterOutputSlug, /^mais-manim-function-graph-fnv1a-[0-9a-f]{8}$/);
  assert.equal(snapshot.manimFileWriterReady, true);
  assert.equal(snapshot.manimFileWriterSceneId, "mais-manim-function-graph");
  assert.match(snapshot.manimFileWriterSignature, /^writer-[0-9a-f]{8}$/);
  assert.equal(snapshot.manimFileWriterSourceContract, SCENE_FILE_WRITER_SOURCE_CONTRACT);
  assert.equal(snapshot.manimFileWriterSummary, "file-writer:mais-manim-function-graph:artifacts=5:capture=screenshot:ready=true");
  assert.equal(snapshot.manimFileWriterSegmentActionSummary, segmentPlan.actionSummary);
  assert.equal(snapshot.manimFileWriterSegmentCloseCount, segmentPlan.closePipeCount);
  assert.equal(snapshot.manimFileWriterSegmentCount, segmentPlan.segmentCount);
  assert.deepEqual(snapshot.manimFileWriterSegmentRows, segmentPlan.rows);
  assert.equal(snapshot.manimFileWriterSegmentFinalFileSummary, segmentPlan.finalFileSummary);
  assert.equal(snapshot.manimFileWriterSegmentInsertIndex, String(segmentPlan.insertIndex));
  assert.equal(snapshot.manimFileWriterSegmentInsertPath, segmentPlan.insertFilePath);
  assert.equal(snapshot.manimFileWriterSegmentOpenCount, segmentPlan.openPipeCount);
  assert.equal(snapshot.manimFileWriterSegmentPartialPath, segmentPlan.partialMoviePath);
  assert.equal(snapshot.manimFileWriterSegmentSkippedCount, segmentPlan.skippedCount);
  assert.equal(snapshot.manimFileWriterSegmentSourceContract, SCENE_FILE_WRITER_SEGMENT_SOURCE_CONTRACT);
  assert.equal(snapshot.manimFileWriterSegmentSubdivideOutput, segmentPlan.subdivideOutput);
  assert.equal(snapshot.manimFileWriterSegmentSummary, segmentPlan.summary);
  assert.equal(snapshot.manimFileWriterSegmentTempFileCount, segmentPlan.tempFileCount);
  assert.equal(snapshot.manimFileWriterSegmentTempRecord, segmentPlan.tempRecordRequested);
  assert.equal(snapshot.manimFileWriterSegmentWriteToMovie, segmentPlan.writeToMovie);
  assert.equal(
    (snapshot as { manimPlaybackFileWriterBridgeReady?: boolean }).manimPlaybackFileWriterBridgeReady,
    bridgePlan.ready
  );
  assert.equal(
    (snapshot as { manimPlaybackFileWriterBridgeRowCount?: number }).manimPlaybackFileWriterBridgeRowCount,
    bridgePlan.rowCount
  );
  assert.equal(
    (snapshot as { manimPlaybackFileWriterBridgeMismatchCount?: number }).manimPlaybackFileWriterBridgeMismatchCount,
    bridgePlan.mismatchCount
  );
  assert.equal(
    (snapshot as { manimPlaybackFileWriterBridgePartialIndexSequence?: string }).manimPlaybackFileWriterBridgePartialIndexSequence,
    bridgePlan.partialIndexSequence
  );
  assert.equal(
    (snapshot as { manimPlaybackFileWriterBridgePartialPathSummary?: string }).manimPlaybackFileWriterBridgePartialPathSummary,
    bridgePlan.partialPathSummary
  );
  assert.equal(
    (snapshot as { manimPlaybackFileWriterBridgeSourceContract?: string }).manimPlaybackFileWriterBridgeSourceContract,
    SCENE_PLAYBACK_FILE_WRITER_BRIDGE_SOURCE_CONTRACT
  );
  assert.equal(
    (snapshot as { manimPlaybackFileWriterBridgeSummary?: string }).manimPlaybackFileWriterBridgeSummary,
    bridgePlan.summary
  );
  assert.equal(snapshot.manimFileWriterCombineAction, combinePlan.action);
  assert.equal(snapshot.manimFileWriterCombineConcatManifestPath, combinePlan.concatManifestPath);
  assert.equal(snapshot.manimFileWriterCombineDuplicatePartialCount, combinePlan.duplicatePartialCount);
  assert.equal(snapshot.manimFileWriterCombineFinalPath, combinePlan.finalMoviePath);
  assert.equal(snapshot.manimFileWriterCombineMismatchCount, combinePlan.mismatchCount);
  assert.equal(snapshot.manimFileWriterCombineOrdered, combinePlan.ordered);
  assert.equal(snapshot.manimFileWriterCombinePartialCount, combinePlan.partialMovieCount);
  assert.equal(snapshot.manimFileWriterCombinePartialIndexSequence, combinePlan.partialIndexSequence);
  assert.equal(snapshot.manimFileWriterCombinePartialPathSummary, combinePlan.partialPathSummary);
  assert.equal(snapshot.manimFileWriterCombineReady, combinePlan.ready);
  assert.equal(snapshot.manimFileWriterCombineSourceContract, SCENE_FILE_WRITER_COMBINE_SOURCE_CONTRACT);
  assert.equal(snapshot.manimFileWriterCombineSummary, combinePlan.summary);
  assert.equal(attributes["data-viz-manim-capture-byte-count"], "2048");
  assert.equal(attributes["data-viz-manim-capture-camera-shot"], "overview");
  assert.equal(attributes["data-viz-manim-capture-elapsed-seconds"], "0.000");
  assert.equal(attributes["data-viz-manim-capture-fps"], "30");
  assert.equal(attributes["data-viz-manim-capture-frame-count"], "1");
  assert.equal(attributes["data-viz-manim-capture-height"], String(measuredViewport.height));
  assert.equal(attributes["data-viz-manim-capture-kind"], "screenshot");
  assert.equal(attributes["data-viz-manim-capture-quality-preset"], "interactive");
  assert.equal(attributes["data-viz-manim-capture-renderer-mode"], "interactive");
  assert.equal(attributes["data-viz-manim-capture-request-count"], "2");
  assert.equal(attributes["data-viz-manim-capture-dpr"], "1.000");
  assert.equal(attributes["data-viz-manim-capture-samples"], "2");
  assert.equal(attributes["data-viz-manim-capture-transparent"], "false");
  assert.equal(attributes["data-viz-manim-capture-background"], "#020617");
  assert.equal(attributes["data-viz-manim-capture-alpha"], "1.000");
  assert.equal(attributes["data-viz-manim-capture-scene-signature"], snapshot.manimCaptureSceneSignature);
  assert.equal(attributes["data-viz-manim-capture-source-contract"], SCENE_CAPTURE_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-capture-status"], "captured");
  assert.equal(attributes["data-viz-manim-capture-target"], "canvas");
  assert.match(attributes["data-viz-manim-capture-framebuffer-id"], /^fb-mais-manim-function-graph-overview-\d+x\d+-canvas$/);
  assert.equal(attributes["data-viz-manim-capture-framebuffer-status"], "ready");
  assert.equal(attributes["data-viz-manim-capture-render-group-count"], "4");
  assert.equal(attributes["data-viz-manim-capture-render-group-ids"], "axes,function-curve,moving-probe,probe-trace");
  assert.equal(attributes["data-viz-manim-capture-render-group-summary"], "scene=4:foreground=0:fixedInFrame=0:all=4");
  assert.match(
    attributes["data-viz-manim-capture-render-pass-summary"],
    /^capture-pass:target=canvas:framebuffer=fb-mais-manim-function-graph-overview-\d+x\d+-canvas:groups=scene\(4\)>foreground\(0\)>fixedInFrame\(0\):frames=1$/
  );
  assert.equal(attributes["data-viz-manim-capture-width"], String(measuredViewport.width));
  assert.equal(attributes["data-viz-manim-file-writer-artifact-count"], "5");
  assert.equal(attributes["data-viz-manim-file-writer-artifact-file-summary"], snapshot.manimFileWriterArtifactFileSummary);
  assert.equal(attributes["data-viz-manim-file-writer-artifact-kind-summary"], "manifest|scene-spec|state-snapshot|smoke-hook|media");
  assert.equal(attributes["data-viz-manim-file-writer-artifact-mime-summary"], "application/json=4|image/png=1");
  assert.equal(attributes["data-viz-manim-file-writer-byte-count"], "2048");
  assert.equal(attributes["data-viz-manim-file-writer-capture-alpha"], "1.000");
  assert.equal(attributes["data-viz-manim-file-writer-capture-background"], "#020617");
  assert.equal(attributes["data-viz-manim-file-writer-capture-dpr"], "1.000");
  assert.equal(attributes["data-viz-manim-file-writer-capture-fps"], "30");
  assert.equal(attributes["data-viz-manim-file-writer-capture-height"], String(measuredViewport.height));
  assert.equal(attributes["data-viz-manim-file-writer-capture-kind"], "screenshot");
  assert.equal(attributes["data-viz-manim-file-writer-capture-quality-preset"], "interactive");
  assert.equal(attributes["data-viz-manim-file-writer-capture-renderer-mode"], "interactive");
  assert.equal(attributes["data-viz-manim-file-writer-capture-samples"], "2");
  assert.equal(attributes["data-viz-manim-file-writer-capture-status"], "captured");
  assert.equal(attributes["data-viz-manim-file-writer-capture-transparent"], "false");
  assert.equal(attributes["data-viz-manim-file-writer-capture-width"], String(measuredViewport.width));
  assert.equal(attributes["data-viz-manim-file-writer-frame-count"], "1");
  assert.equal(attributes["data-viz-manim-file-writer-json-artifact-count"], "4");
  assert.equal(attributes["data-viz-manim-file-writer-media-artifact-count"], "1");
  assert.equal(attributes["data-viz-manim-file-writer-output-slug"], snapshot.manimFileWriterOutputSlug);
  assert.equal(attributes["data-viz-manim-file-writer-ready"], "true");
  assert.equal(attributes["data-viz-manim-file-writer-scene-id"], "mais-manim-function-graph");
  assert.equal(attributes["data-viz-manim-file-writer-signature"], snapshot.manimFileWriterSignature);
  assert.equal(attributes["data-viz-manim-file-writer-source-contract"], SCENE_FILE_WRITER_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-file-writer-summary"], snapshot.manimFileWriterSummary);
  assert.equal(
    attributes["data-viz-manim-file-writer-segment-action-summary"],
    expectedSegmentAttributes["data-viz-manim-file-writer-segment-action-summary"]
  );
  assert.equal(attributes["data-viz-manim-file-writer-segment-close-count"], expectedSegmentAttributes["data-viz-manim-file-writer-segment-close-count"]);
  assert.equal(attributes["data-viz-manim-file-writer-segment-count"], expectedSegmentAttributes["data-viz-manim-file-writer-segment-count"]);
  assert.equal(
    attributes["data-viz-manim-file-writer-segment-final-file-summary"],
    expectedSegmentAttributes["data-viz-manim-file-writer-segment-final-file-summary"]
  );
  assert.equal(attributes["data-viz-manim-file-writer-segment-insert-index"], expectedSegmentAttributes["data-viz-manim-file-writer-segment-insert-index"]);
  assert.equal(attributes["data-viz-manim-file-writer-segment-insert-path"], expectedSegmentAttributes["data-viz-manim-file-writer-segment-insert-path"]);
  assert.equal(attributes["data-viz-manim-file-writer-segment-open-count"], expectedSegmentAttributes["data-viz-manim-file-writer-segment-open-count"]);
  assert.equal(attributes["data-viz-manim-file-writer-segment-partial-path"], expectedSegmentAttributes["data-viz-manim-file-writer-segment-partial-path"]);
  assert.equal(
    attributes["data-viz-manim-file-writer-segment-skipped-count"],
    expectedSegmentAttributes["data-viz-manim-file-writer-segment-skipped-count"]
  );
  assert.equal(
    attributes["data-viz-manim-file-writer-segment-source-contract"],
    SCENE_FILE_WRITER_SEGMENT_SOURCE_CONTRACT
  );
  assert.equal(attributes["data-viz-manim-file-writer-segment-subdivide-output"], expectedSegmentAttributes["data-viz-manim-file-writer-segment-subdivide-output"]);
  assert.equal(attributes["data-viz-manim-file-writer-segment-summary"], expectedSegmentAttributes["data-viz-manim-file-writer-segment-summary"]);
  assert.equal(
    attributes["data-viz-manim-file-writer-segment-temp-file-count"],
    expectedSegmentAttributes["data-viz-manim-file-writer-segment-temp-file-count"]
  );
  assert.equal(attributes["data-viz-manim-file-writer-segment-temp-record"], expectedSegmentAttributes["data-viz-manim-file-writer-segment-temp-record"]);
  assert.equal(attributes["data-viz-manim-file-writer-segment-write-to-movie"], expectedSegmentAttributes["data-viz-manim-file-writer-segment-write-to-movie"]);
  assert.equal(
    attributes["data-viz-manim-playback-file-writer-bridge-ready"],
    expectedBridgeAttributes["data-viz-manim-playback-file-writer-bridge-ready"]
  );
  assert.equal(
    attributes["data-viz-manim-playback-file-writer-bridge-row-count"],
    expectedBridgeAttributes["data-viz-manim-playback-file-writer-bridge-row-count"]
  );
  assert.equal(
    attributes["data-viz-manim-playback-file-writer-bridge-mismatch-count"],
    expectedBridgeAttributes["data-viz-manim-playback-file-writer-bridge-mismatch-count"]
  );
  assert.equal(
    attributes["data-viz-manim-playback-file-writer-bridge-partial-index-sequence"],
    expectedBridgeAttributes["data-viz-manim-playback-file-writer-bridge-partial-index-sequence"]
  );
  assert.equal(
    attributes["data-viz-manim-playback-file-writer-bridge-partial-path-summary"],
    expectedBridgeAttributes["data-viz-manim-playback-file-writer-bridge-partial-path-summary"]
  );
  assert.equal(
    attributes["data-viz-manim-playback-file-writer-bridge-source-contract"],
    SCENE_PLAYBACK_FILE_WRITER_BRIDGE_SOURCE_CONTRACT
  );
  assert.equal(
    attributes["data-viz-manim-playback-file-writer-bridge-summary"],
    expectedBridgeAttributes["data-viz-manim-playback-file-writer-bridge-summary"]
  );
  assert.equal(attributes["data-viz-manim-file-writer-combine-action"], expectedCombineAttributes["data-viz-manim-file-writer-combine-action"]);
  assert.equal(
    attributes["data-viz-manim-file-writer-combine-concat-manifest-path"],
    expectedCombineAttributes["data-viz-manim-file-writer-combine-concat-manifest-path"]
  );
  assert.equal(
    attributes["data-viz-manim-file-writer-combine-duplicate-partial-count"],
    expectedCombineAttributes["data-viz-manim-file-writer-combine-duplicate-partial-count"]
  );
  assert.equal(attributes["data-viz-manim-file-writer-combine-final-path"], expectedCombineAttributes["data-viz-manim-file-writer-combine-final-path"]);
  assert.equal(
    attributes["data-viz-manim-file-writer-combine-mismatch-count"],
    expectedCombineAttributes["data-viz-manim-file-writer-combine-mismatch-count"]
  );
  assert.equal(attributes["data-viz-manim-file-writer-combine-ordered"], expectedCombineAttributes["data-viz-manim-file-writer-combine-ordered"]);
  assert.equal(
    attributes["data-viz-manim-file-writer-combine-partial-count"],
    expectedCombineAttributes["data-viz-manim-file-writer-combine-partial-count"]
  );
  assert.equal(
    attributes["data-viz-manim-file-writer-combine-partial-index-sequence"],
    expectedCombineAttributes["data-viz-manim-file-writer-combine-partial-index-sequence"]
  );
  assert.equal(
    attributes["data-viz-manim-file-writer-combine-partial-path-summary"],
    expectedCombineAttributes["data-viz-manim-file-writer-combine-partial-path-summary"]
  );
  assert.equal(attributes["data-viz-manim-file-writer-combine-ready"], expectedCombineAttributes["data-viz-manim-file-writer-combine-ready"]);
  assert.equal(attributes["data-viz-manim-file-writer-combine-source-contract"], SCENE_FILE_WRITER_COMBINE_SOURCE_CONTRACT);
  assert.equal(
    attributes["data-viz-manim-file-writer-combine-summary"],
    expectedCombineAttributes["data-viz-manim-file-writer-combine-summary"]
  );
});

test("routes checkpoint_paste record evidence into SceneFileWriter temp_record diagnostics", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const checkpointSnippet = "# record slope replay\nself.play(dot.animate.shift(RIGHT))";
  const snapshot = buildMathSceneEvidenceSnapshot({
    checkpointPasteEvidence: {
      record: true,
      snippet: checkpointSnippet
    },
    fileWriterSegmentEvidence: {
      existingInsertIndexes: [0],
      movieFileExtension: ".mp4",
      subdivideOutput: true,
      writeToMovie: true
    },
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);
  const checkpointPlan = buildMathCheckpointPastePlan({
    elapsedSeconds: 0,
    record: true,
    sceneId: functionGraphSpec.sceneId,
    snippet: checkpointSnippet
  });
  const segmentPlan = buildSceneFileWriterSegmentPlan({
    existingInsertIndexes: [0],
    movieFileExtension: ".mp4",
    numPlays: snapshot.manimPlaybackActivePlayIndex,
    outputSlug: snapshot.manimFileWriterOutputSlug,
    requestTempRecord: true,
    sceneId: functionGraphSpec.sceneId,
    subdivideOutput: true,
    writeToMovie: true
  });
  const checkpointFileWriterBridgePlan = buildCheckpointPasteFileWriterBridgePlan({
    checkpointPastePlan: checkpointPlan,
    segmentPlan
  });
  const expectedBridgeAttributes = checkpointPasteFileWriterBridgeDataAttributes(checkpointFileWriterBridgePlan);

  assert.equal(snapshot.manimCheckpointPasteRecord, true);
  assert.equal(snapshot.manimFileWriterSegmentTempRecord, true);
  assert.equal(snapshot.manimFileWriterSegmentInsertIndex, "1");
  assert.equal(snapshot.manimFileWriterSegmentInsertPath, segmentPlan.insertFilePath);
  assert.equal(snapshot.manimCheckpointFileWriterBridgeKey, "record slope replay");
  assert.equal(snapshot.manimCheckpointFileWriterBridgeRecord, true);
  assert.equal(snapshot.manimCheckpointFileWriterBridgeTempRecord, true);
  assert.equal(snapshot.manimCheckpointFileWriterBridgeOpenInsertPipe, true);
  assert.equal(snapshot.manimCheckpointFileWriterBridgeCloseInsertPipe, true);
  assert.equal(snapshot.manimCheckpointFileWriterBridgeInsertIndex, "1");
  assert.equal(snapshot.manimCheckpointFileWriterBridgeInsertPath, segmentPlan.insertFilePath);
  assert.equal(snapshot.manimCheckpointFileWriterBridgeSegmentActionSummary, segmentPlan.actionSummary);
  assert.equal(snapshot.manimCheckpointFileWriterBridgeSegmentCount, 5);
  assert.equal(snapshot.manimCheckpointFileWriterBridgeReady, true);
  assert.equal(snapshot.manimCheckpointFileWriterBridgeSourceContract, SCENE_CHECKPOINT_PASTE_FILE_WRITER_BRIDGE_SOURCE_CONTRACT);
  assert.equal(snapshot.manimCheckpointFileWriterBridgeSummary, checkpointFileWriterBridgePlan.summary);
  assert.equal(
    attributes["data-viz-manim-checkpoint-file-writer-source-contract"],
    SCENE_CHECKPOINT_PASTE_FILE_WRITER_BRIDGE_SOURCE_CONTRACT
  );
  assert.equal(attributes["data-viz-manim-checkpoint-file-writer-record"], "true");
  assert.equal(attributes["data-viz-manim-checkpoint-file-writer-temp-record"], "true");
  assert.equal(attributes["data-viz-manim-checkpoint-file-writer-open-insert-pipe"], "true");
  assert.equal(attributes["data-viz-manim-checkpoint-file-writer-close-insert-pipe"], "true");
  assert.equal(attributes["data-viz-manim-checkpoint-file-writer-insert-index"], "1");
  assert.equal(attributes["data-viz-manim-checkpoint-file-writer-insert-path"], segmentPlan.insertFilePath);
  assert.equal(attributes["data-viz-manim-checkpoint-file-writer-ready"], "true");
  assert.equal(attributes["data-viz-manim-checkpoint-file-writer-summary"], checkpointFileWriterBridgePlan.summary);
  assert.deepEqual(
    Object.fromEntries(Object.entries(attributes).filter(([key]) => key.startsWith("data-viz-manim-checkpoint-file-writer-"))),
    expectedBridgeAttributes
  );
});

test("records Scene.run tear_down gate for SceneFileWriter.finish combine evidence", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);
  const playbackBridgePlan = buildScenePlaybackFileWriterBridgePlan({
    outputSlug: snapshot.manimFileWriterOutputSlug,
    playbackPlan: buildScenePlaybackPlan(functionGraphSpec.timeline),
    sceneId: functionGraphSpec.sceneId,
    subdivideOutput: true,
    writeToMovie: snapshot.manimFileWriterReady
  });
  const combinePlan = buildSceneFileWriterCombinePlan({
    fileWriterReady: snapshot.manimFileWriterReady,
    outputSlug: snapshot.manimFileWriterOutputSlug,
    playbackBridge: playbackBridgePlan,
    sceneId: functionGraphSpec.sceneId,
    subdivideOutput: true,
    writeToMovie: snapshot.manimFileWriterReady
  });
  const sceneRunLifecycle = buildMathSceneRunLifecyclePlan({
    elapsedSeconds: runtimeState.timeline.elapsedSeconds,
    scene: functionGraphSpec,
    sceneSignature: snapshot.manimSceneRunSceneSignature
  });
  const sceneRunFinishBridgePlan = buildSceneRunFileWriterFinishBridgePlan({
    fileWriterCombinePlan: combinePlan,
    sceneRunLifecycle
  });
  const expectedAttributes = sceneRunFileWriterFinishBridgeDataAttributes(sceneRunFinishBridgePlan);

  assert.equal(snapshot.manimFileWriterCombineReady, true);
  assert.equal(snapshot.manimSceneRunTearDownReady, false);
  assert.equal(snapshot.manimSceneRunFileWriterFinishCombineAction, "concat-partials");
  assert.equal(snapshot.manimSceneRunFileWriterFinishTearDownReady, false);
  assert.equal(snapshot.manimSceneRunFileWriterFinishRequired, false);
  assert.equal(snapshot.manimSceneRunFileWriterFinishReady, false);
  assert.equal(snapshot.manimSceneRunFileWriterFinishStatus, "waiting-for-tear-down");
  assert.equal(snapshot.manimSceneRunFileWriterFinishCallOrder, sceneRunFinishBridgePlan.finishCallOrderSummary);
  assert.equal(snapshot.manimSceneRunFileWriterFinishFinalPath, combinePlan.finalMoviePath);
  assert.equal(snapshot.manimSceneRunFileWriterFinishConcatManifestPath, combinePlan.concatManifestPath);
  assert.equal(snapshot.manimSceneRunFileWriterFinishPartialCount, combinePlan.partialMovieCount);
  assert.equal(snapshot.manimSceneRunFileWriterFinishSourceContract, SCENE_RUN_FILE_WRITER_FINISH_BRIDGE_SOURCE_CONTRACT);
  assert.equal(snapshot.manimSceneRunFileWriterFinishSummary, sceneRunFinishBridgePlan.summary);
  assert.equal(
    attributes["data-viz-manim-scene-run-file-writer-finish-source-contract"],
    SCENE_RUN_FILE_WRITER_FINISH_BRIDGE_SOURCE_CONTRACT
  );
  assert.equal(attributes["data-viz-manim-scene-run-file-writer-finish-status"], "waiting-for-tear-down");
  assert.equal(attributes["data-viz-manim-scene-run-file-writer-finish-ready"], "false");
  assert.equal(attributes["data-viz-manim-scene-run-file-writer-finish-required"], "false");
  assert.deepEqual(
    Object.fromEntries(Object.entries(attributes).filter(([key]) => key.startsWith("data-viz-manim-scene-run-file-writer-finish-"))),
    expectedAttributes
  );
});

test("records Manim render-quality source contract for browser QA and capture defaults", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const snapshot = buildMathSceneEvidenceSnapshot({
    captureEvidence: {
      kind: "video",
      requestCount: 1,
      status: "planned"
    },
    reducedMotion: false,
    renderQualityEvidence: {
      preset: "production",
      rendererMode: "capture"
    },
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.manimRenderQualityPreset, "production");
  assert.equal(snapshot.manimRenderQualityRendererMode, "capture");
  assert.equal(snapshot.manimRenderQualityWidth, 1920);
  assert.equal(snapshot.manimRenderQualityHeight, 1080);
  assert.equal(snapshot.manimRenderQualityCaptureFps, 60);
  assert.equal(snapshot.manimRenderQualityDevicePixelRatio, 2);
  assert.equal(snapshot.manimRenderQualitySamplesPerPixel, 4);
  assert.equal(snapshot.manimRenderQualitySourceContract, MANIM_RENDER_QUALITY_SOURCE_CONTRACT);
  assert.equal(
    snapshot.manimRenderQualitySummary,
    "render-quality:production:1920x1080@60fps:dpr=2.000:samples=4:mode=capture:transparent=false"
  );
  assert.equal(snapshot.manimCaptureWidth, 1920);
  assert.equal(snapshot.manimCaptureHeight, 1080);
  assert.equal(snapshot.manimCaptureFps, 60);
  assert.equal(snapshot.manimCaptureQualityPreset, "production");
  assert.equal(snapshot.manimCaptureRendererMode, "capture");
  assert.equal(snapshot.manimCaptureDevicePixelRatio, 2);
  assert.equal(snapshot.manimCaptureSamplesPerPixel, 4);
  assert.ok(snapshot.manimCaptureFrameCount > 600);
  assert.equal(snapshot.manimFileWriterCaptureWidth, 1920);
  assert.equal(snapshot.manimFileWriterCaptureHeight, 1080);
  assert.equal(snapshot.manimFileWriterCaptureFps, 60);
  assert.equal(snapshot.manimFileWriterCaptureQualityPreset, "production");
  assert.equal(snapshot.manimFileWriterCaptureRendererMode, "capture");
  assert.equal(snapshot.manimFileWriterCaptureDevicePixelRatio, 2);
  assert.equal(snapshot.manimFileWriterCaptureSamplesPerPixel, 4);
  assert.equal(attributes["data-viz-manim-render-quality-preset"], "production");
  assert.equal(attributes["data-viz-manim-render-quality-renderer-mode"], "capture");
  assert.equal(attributes["data-viz-manim-render-quality-size"], "1920x1080");
  assert.equal(attributes["data-viz-manim-render-quality-capture"], "1920x1080@60");
  assert.equal(attributes["data-viz-manim-render-quality-dpr"], "2.000");
  assert.equal(attributes["data-viz-manim-render-quality-samples"], "4");
  assert.equal(attributes["data-viz-manim-render-quality-source-contract"], MANIM_RENDER_QUALITY_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-capture-width"], "1920");
  assert.equal(attributes["data-viz-manim-capture-height"], "1080");
  assert.equal(attributes["data-viz-manim-capture-fps"], "60");
  assert.equal(attributes["data-viz-manim-capture-quality-preset"], "production");
  assert.equal(attributes["data-viz-manim-capture-renderer-mode"], "capture");
  assert.equal(attributes["data-viz-manim-capture-dpr"], "2.000");
  assert.equal(attributes["data-viz-manim-capture-samples"], "4");
  assert.equal(attributes["data-viz-manim-file-writer-capture-width"], "1920");
  assert.equal(attributes["data-viz-manim-file-writer-capture-height"], "1080");
  assert.equal(attributes["data-viz-manim-file-writer-capture-fps"], "60");
  assert.equal(attributes["data-viz-manim-file-writer-capture-quality-preset"], "production");
  assert.equal(attributes["data-viz-manim-file-writer-capture-renderer-mode"], "capture");
  assert.equal(attributes["data-viz-manim-file-writer-capture-dpr"], "2.000");
  assert.equal(attributes["data-viz-manim-file-writer-capture-samples"], "4");
});

test("records Manim Mobject data-array source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.mobjectDataArrayRowCount, 4);
  assert.equal(snapshot.mobjectDataArrayPointCount, 79);
  assert.equal(snapshot.mobjectDataArrayFinitePointCount, 79);
  assert.equal(snapshot.mobjectDataArrayRgbaCount, 79);
  assert.equal(snapshot.mobjectDataArrayRoleCount, 4);
  assert.equal(snapshot.mobjectDataArrayObjectIds, "axes,function-curve,moving-probe,probe-trace");
  assert.equal(snapshot.mobjectDataArraySemanticRoles, "function,probe,reference,trace");
  assert.match(snapshot.mobjectDataArraySignature, /^mobject-data-[0-9a-f]{8}$/);
  assert.equal(snapshot.mobjectDataArraySourceContract, MOBJECT_DATA_ARRAY_SOURCE_CONTRACT);
  assert.equal(
    snapshot.mobjectDataArraySummary,
    "mobject-data:rows=4:points=79:finite=79:rgba=79:roles=function,probe,reference,trace"
  );
  assert.deepEqual(
    snapshot.mobjectDataArrayRows.map((row) => row.objectId),
    ["axes", "function-curve", "moving-probe", "probe-trace"]
  );
  const curveDataRow = snapshot.mobjectDataArrayRows.find((row) => row.objectId === "function-curve");
  assert.ok(curveDataRow);
  assert.equal(curveDataRow.semanticRole, "function");
  assert.equal(curveDataRow.type, "parametricCurve");
  assert.equal(curveDataRow.pointCount, curveDataRow.points.length);
  assert.equal(curveDataRow.rgba.length, curveDataRow.pointCount);
  assert.equal(curveDataRow.finitePointCount, curveDataRow.pointCount);
  assert.equal(attributes["data-viz-mobject-data-array-row-count"], "4");
  assert.equal(attributes["data-viz-mobject-data-array-point-count"], "79");
  assert.equal(attributes["data-viz-mobject-data-array-finite-point-count"], "79");
  assert.equal(attributes["data-viz-mobject-data-array-rgba-count"], "79");
  assert.equal(attributes["data-viz-mobject-data-array-role-count"], "4");
  assert.equal(attributes["data-viz-mobject-data-array-object-ids"], "axes,function-curve,moving-probe,probe-trace");
  assert.equal(attributes["data-viz-mobject-data-array-signature"], snapshot.mobjectDataArraySignature);
  assert.equal(attributes["data-viz-mobject-data-array-source-contract"], MOBJECT_DATA_ARRAY_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-mobject-data-array-summary"], snapshot.mobjectDataArraySummary);
});

test("records Manim Mobject point-generation source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.mobjectPointGenerationObjectCount, 4);
  assert.equal(snapshot.mobjectPointGenerationGeneratedObjectCount, 3);
  assert.equal(snapshot.mobjectPointGenerationZeroPointObjectCount, 1);
  assert.equal(snapshot.mobjectPointGenerationPointCount, 79);
  assert.equal(snapshot.mobjectPointGenerationFinitePointCount, 79);
  assert.equal(snapshot.mobjectPointGenerationNonFinitePointCount, 0);
  assert.equal(snapshot.mobjectPointGenerationGeneratorKindSummary, "axis3d=1;movingPoint=1;parametricCurve=1;trace=1");
  assert.equal(snapshot.mobjectPointGenerationZeroPointObjectIds, "probe-trace");
  assert.match(snapshot.mobjectPointGenerationSignature, /^mobject-point-generation-[0-9a-f]{8}$/);
  assert.equal(snapshot.mobjectPointGenerationSourceContract, MOBJECT_POINT_GENERATION_SOURCE_CONTRACT);
  assert.equal(snapshot.mobjectPointGenerationSummary, "mobject-point-generation:objects=4:generated=3:points=79:finite=79:nonFinite=0:zero=probe-trace");
  assert.deepEqual(
    snapshot.mobjectPointGenerationRows.map((row) => `${row.objectId}:${row.generator}:${row.pointCount}`),
    ["axes:axis3d-axis-endpoints:6", "function-curve:parametricCurve-samples:72", "moving-probe:movingPoint-initial-position:1", "probe-trace:trace-initial-empty-path:0"]
  );
  assert.equal(attributes["data-viz-mobject-point-generation-object-count"], "4");
  assert.equal(attributes["data-viz-mobject-point-generation-generated-object-count"], "3");
  assert.equal(attributes["data-viz-mobject-point-generation-zero-point-object-count"], "1");
  assert.equal(attributes["data-viz-mobject-point-generation-point-count"], "79");
  assert.equal(attributes["data-viz-mobject-point-generation-finite-point-count"], "79");
  assert.equal(attributes["data-viz-mobject-point-generation-non-finite-point-count"], "0");
  assert.equal(attributes["data-viz-mobject-point-generation-generator-kind-summary"], "axis3d=1;movingPoint=1;parametricCurve=1;trace=1");
  assert.equal(attributes["data-viz-mobject-point-generation-zero-point-object-ids"], "probe-trace");
  assert.equal(attributes["data-viz-mobject-point-generation-signature"], snapshot.mobjectPointGenerationSignature);
  assert.equal(attributes["data-viz-mobject-point-generation-source-contract"], MOBJECT_POINT_GENERATION_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-mobject-point-generation-summary"], snapshot.mobjectPointGenerationSummary);
});

test("records Manim Mobject point-transform source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.mobjectPointTransformObjectCount, 4);
  assert.equal(snapshot.mobjectPointTransformTransformableObjectCount, 3);
  assert.equal(snapshot.mobjectPointTransformOperationCount, 3);
  assert.equal(snapshot.mobjectPointTransformRowCount, 9);
  assert.equal(snapshot.mobjectPointTransformSourcePointCount, 79);
  assert.equal(snapshot.mobjectPointTransformTransformedPointCount, 237);
  assert.equal(snapshot.mobjectPointTransformFiniteTransformedPointCount, 237);
  assert.equal(snapshot.mobjectPointTransformOperationIds, "shift-evidence,scale-about-center,rotate-about-center");
  assert.equal(snapshot.mobjectPointTransformSourceContract, MOBJECT_POINT_TRANSFORM_SOURCE_CONTRACT);
  assert.match(snapshot.mobjectPointTransformSignature, /^mobject-point-transform-[0-9a-f]{8}$/);
  assert.equal(
    snapshot.mobjectPointTransformSummary,
    "mobject-point-transform:objects=4:transformable=3:ops=3:rows=9:sourcePoints=79:transformed=237:finite=237:ids=shift-evidence,scale-about-center,rotate-about-center"
  );
  assert.equal(attributes["data-viz-mobject-point-transform-object-count"], "4");
  assert.equal(attributes["data-viz-mobject-point-transform-transformable-object-count"], "3");
  assert.equal(attributes["data-viz-mobject-point-transform-operation-count"], "3");
  assert.equal(attributes["data-viz-mobject-point-transform-row-count"], "9");
  assert.equal(attributes["data-viz-mobject-point-transform-source-point-count"], "79");
  assert.equal(attributes["data-viz-mobject-point-transform-transformed-point-count"], "237");
  assert.equal(attributes["data-viz-mobject-point-transform-finite-transformed-point-count"], "237");
  assert.equal(attributes["data-viz-mobject-point-transform-operation-ids"], snapshot.mobjectPointTransformOperationIds);
  assert.equal(attributes["data-viz-mobject-point-transform-signature"], snapshot.mobjectPointTransformSignature);
  assert.equal(attributes["data-viz-mobject-point-transform-source-contract"], MOBJECT_POINT_TRANSFORM_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-mobject-point-transform-summary"], snapshot.mobjectPointTransformSummary);
});

test("records Manim Mobject point-cloud source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.mobjectPointCloudFamilyCount, 2);
  assert.equal(snapshot.mobjectPointCloudFamilyWithPointsCount, 2);
  assert.equal(snapshot.mobjectPointCloudEmptyFamilyCount, 0);
  assert.equal(snapshot.mobjectPointCloudObjectWithPointsCount, 3);
  assert.equal(snapshot.mobjectPointCloudPointCount, 79);
  assert.equal(snapshot.mobjectPointCloudFamilyIds, "axes,function-curve");
  assert.match(snapshot.mobjectPointCloudSignature, /^mobject-points-[0-9a-f]{8}$/);
  assert.equal(snapshot.mobjectPointCloudSourceContract, MOBJECT_POINT_CLOUD_SOURCE_CONTRACT);
  assert.equal(
    snapshot.mobjectPointCloudSummary,
    "mobject-points:families=2:withPoints=2:objectsWithPoints=3:points=79:ids=axes,function-curve"
  );
  assert.deepEqual(
    snapshot.mobjectPointCloudRows.map((row) => row.rootId),
    ["axes", "function-curve"]
  );
  const functionFamilyPointCloud = snapshot.mobjectPointCloudRows.find((row) => row.rootId === "function-curve");
  assert.ok(functionFamilyPointCloud);
  assert.equal(functionFamilyPointCloud.pointCount, functionFamilyPointCloud.allPoints.length);
  assert.ok(functionFamilyPointCloud.memberIdsWithPoints.includes("function-curve"));
  assert.ok(functionFamilyPointCloud.memberIdsWithPoints.includes("moving-probe"));
  assert.equal(functionFamilyPointCloud.members.length, functionFamilyPointCloud.memberIdsWithPoints.length);
  const firstPointCloudMember = functionFamilyPointCloud.members[0];
  assert.ok(firstPointCloudMember);
  assert.equal(firstPointCloudMember.pointCount, firstPointCloudMember.points.length);
  assert.equal(attributes["data-viz-mobject-point-cloud-family-count"], "2");
  assert.equal(attributes["data-viz-mobject-point-cloud-family-with-points-count"], "2");
  assert.equal(attributes["data-viz-mobject-point-cloud-empty-family-count"], "0");
  assert.equal(attributes["data-viz-mobject-point-cloud-object-with-points-count"], "3");
  assert.equal(attributes["data-viz-mobject-point-cloud-point-count"], "79");
  assert.equal(attributes["data-viz-mobject-point-cloud-family-ids"], "axes,function-curve");
  assert.equal(attributes["data-viz-mobject-point-cloud-signature"], snapshot.mobjectPointCloudSignature);
  assert.equal(attributes["data-viz-mobject-point-cloud-source-contract"], MOBJECT_POINT_CLOUD_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-mobject-point-cloud-summary"], snapshot.mobjectPointCloudSummary);
});

test("records Manim digest_config source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);
  const expectedDigest = buildManimConfigDigest(functionGraphSpec);
  const expectedAttributes = manimConfigDigestDataAttributes(expectedDigest);

  assert.equal((snapshot as { manimConfigDigestObjectCount?: number }).manimConfigDigestObjectCount, expectedDigest.objectCount);
  assert.equal((snapshot as { manimConfigDigestVmobjectCount?: number }).manimConfigDigestVmobjectCount, expectedDigest.vmobjectCount);
  assert.equal(
    (snapshot as { manimConfigDigestExplicitOverrideCount?: number }).manimConfigDigestExplicitOverrideCount,
    expectedDigest.explicitOverrideCount
  );
  assert.equal(
    (snapshot as { manimConfigDigestDefaultedValueCount?: number }).manimConfigDigestDefaultedValueCount,
    expectedDigest.defaultedValueCount
  );
  assert.equal((snapshot as { manimConfigDigestClassSummary?: string }).manimConfigDigestClassSummary, expectedDigest.classSummary);
  assert.equal((snapshot as { manimConfigDigestRowSummary?: string }).manimConfigDigestRowSummary, expectedDigest.rowSummary);
  assert.equal((snapshot as { manimConfigDigestOpacityRange?: string }).manimConfigDigestOpacityRange, expectedDigest.opacityRange);
  assert.equal((snapshot as { manimConfigDigestZIndexRange?: string }).manimConfigDigestZIndexRange, expectedDigest.zIndexRange);
  assert.match((snapshot as { manimConfigDigestSignature?: string }).manimConfigDigestSignature ?? "", /^config-digest-[0-9a-f]{8}$/);
  assert.equal(
    (snapshot as { manimConfigDigestSourceContract?: string }).manimConfigDigestSourceContract,
    MANIM_CONFIG_DIGEST_SOURCE_CONTRACT
  );
  assert.equal((snapshot as { manimConfigDigestSummary?: string }).manimConfigDigestSummary, expectedDigest.summary);

  for (const [attribute, value] of Object.entries(expectedAttributes)) {
    assert.equal(attributes[attribute], value, `${attribute} should round-trip digest_config evidence`);
  }
});

test("records Manim Mobject bounding-box source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.mobjectBoundingBoxCount, 4);
  assert.equal(snapshot.mobjectBoundingBoxFiniteCount, 3);
  assert.equal(snapshot.mobjectBoundingBoxEmptyCount, 1);
  assert.equal(snapshot.mobjectBoundingBoxObjectIds, "axes,function-curve,moving-probe,probe-trace");
  assert.match(snapshot.mobjectBoundingBoxSignature, /^mobject-bounds-[0-9a-f]{8}$/);
  assert.equal(snapshot.mobjectBoundingBoxSourceContract, MOBJECT_BOUNDING_BOX_SOURCE_CONTRACT);
  assert.equal(
    snapshot.mobjectBoundingBoxSummary,
    "mobject-bounds:rows=4:finite=3:empty=1:ids=axes,function-curve,moving-probe,probe-trace"
  );
  assert.deepEqual(
    snapshot.mobjectBoundingBoxRows.map((row) => row.objectId),
    ["axes", "function-curve", "moving-probe", "probe-trace"]
  );
  const curveBoundsRow = snapshot.mobjectBoundingBoxRows.find((row) => row.objectId === "function-curve");
  assert.ok(curveBoundsRow);
  assert.equal(curveBoundsRow.kind, "finite");
  assert.equal(curveBoundsRow.finite, true);
  assert.ok(curveBoundsRow.size[0] > 0);
  assert.ok(curveBoundsRow.size[1] > 0);
  const traceBoundsRow = snapshot.mobjectBoundingBoxRows.find((row) => row.objectId === "probe-trace");
  assert.ok(traceBoundsRow);
  assert.equal(traceBoundsRow.kind, "empty");
  assert.equal(traceBoundsRow.finite, false);
  assert.equal(attributes["data-viz-mobject-bounding-box-count"], "4");
  assert.equal(attributes["data-viz-mobject-bounding-box-finite-count"], "3");
  assert.equal(attributes["data-viz-mobject-bounding-box-empty-count"], "1");
  assert.equal(attributes["data-viz-mobject-bounding-box-object-ids"], "axes,function-curve,moving-probe,probe-trace");
  assert.equal(attributes["data-viz-mobject-bounding-box-signature"], snapshot.mobjectBoundingBoxSignature);
  assert.equal(attributes["data-viz-mobject-bounding-box-source-contract"], MOBJECT_BOUNDING_BOX_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-mobject-bounding-box-summary"], snapshot.mobjectBoundingBoxSummary);
});

test("records Manim Mobject state-payload source contract for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.mobjectStatePayloadBecomeReadyCount, 2);
  assert.equal(snapshot.mobjectStatePayloadBecomeAppliedCount, 2);
  assert.equal(snapshot.mobjectStatePayloadBecomeNodeCount, snapshot.mobjectStatePayloadNodeCount);
  assert.ok(snapshot.mobjectStatePayloadBecomePointCount > snapshot.mobjectStatePayloadBecomeNodeCount);
  assert.equal(snapshot.mobjectStatePayloadBecomeRenderDataCount, snapshot.mobjectStatePayloadTargetableCount);
  assert.equal(snapshot.mobjectStatePayloadFamilyRootCount, 2);
  assert.equal(snapshot.mobjectStatePayloadNodeCount, 4);
  assert.equal(snapshot.mobjectStatePayloadRestorableCount, 4);
  assert.equal(snapshot.mobjectStatePayloadRestoreMismatchCount, 0);
  assert.equal(snapshot.mobjectStatePayloadRestoreNodeCount, snapshot.mobjectStatePayloadNodeCount);
  assert.equal(snapshot.mobjectStatePayloadRestorePointCount, snapshot.mobjectStatePayloadTargetPointCount);
  assert.equal(snapshot.mobjectStatePayloadRestoreReadyCount, snapshot.mobjectStatePayloadSnapshotCount);
  assert.equal(snapshot.mobjectStatePayloadRestoreRenderDataCount, snapshot.mobjectStatePayloadTargetRenderDataCount);
  assert.equal(snapshot.mobjectStatePayloadRestoreUniformNodeCount, snapshot.mobjectStatePayloadNodeCount);
  assert.equal(
    snapshot.mobjectStatePayloadRestoreSourceSummary,
    "restore:rows=2:ready=2:mismatch=0:nodes=4:points=79:uniforms=4"
  );
  assert.equal(snapshot.mobjectStatePayloadSnapshotCount, 2);
  assert.equal(snapshot.mobjectStatePayloadTargetableCount, 3);
  assert.equal(snapshot.mobjectStatePayloadTargetCount, 2);
  assert.equal(snapshot.mobjectStatePayloadTargetIds, "axes:target,function-curve:target");
  assert.equal(snapshot.mobjectStatePayloadTargetNodeCount, snapshot.mobjectStatePayloadNodeCount);
  assert.ok(snapshot.mobjectStatePayloadTargetPointCount > snapshot.mobjectStatePayloadTargetNodeCount);
  assert.equal(snapshot.mobjectStatePayloadTargetRenderDataCount, snapshot.mobjectStatePayloadTargetableCount);
  assert.match(snapshot.mobjectStatePayloadSignature, /^mobject-state-[0-9a-f]{8}$/);
  assert.equal(snapshot.mobjectStatePayloadSourceContract, "Mobject.save_state|restore|generate_target|become");
  assert.equal(
    snapshot.mobjectStatePayloadSummary,
    "mobject-state:snapshots=2:nodes=4:restorable=4:targetable=3:targets=2:become=2"
  );
  assert.deepEqual(
    snapshot.mobjectStatePayloadRows.map((row) => row.rootId),
    ["axes", "function-curve"]
  );
  const functionStateRow = snapshot.mobjectStatePayloadRows.find((row) => row.rootId === "function-curve");
  assert.ok(functionStateRow);
  assert.equal(functionStateRow.targetId, "function-curve:target");
  assert.equal(functionStateRow.targetKind, "target");
  assert.equal(functionStateRow.becomeReady, true);
  assert.equal(functionStateRow.restoreReady, true);
  assert.equal(functionStateRow.restoreMismatchCount, 0);
  assert.ok(functionStateRow.familyIds.includes("moving-probe"));
  assert.ok(functionStateRow.pointCount > functionStateRow.nodeCount);
  assert.equal(attributes["data-viz-mobject-state-become-ready-count"], "2");
  assert.equal(attributes["data-viz-mobject-state-become-applied-count"], "2");
  assert.equal(
    attributes["data-viz-mobject-state-become-node-count"],
    String(snapshot.mobjectStatePayloadBecomeNodeCount)
  );
  assert.equal(
    attributes["data-viz-mobject-state-become-point-count"],
    String(snapshot.mobjectStatePayloadBecomePointCount)
  );
  assert.equal(
    attributes["data-viz-mobject-state-become-render-data-count"],
    String(snapshot.mobjectStatePayloadBecomeRenderDataCount)
  );
  assert.equal(attributes["data-viz-mobject-state-source-contract"], snapshot.mobjectStatePayloadSourceContract);
  assert.equal(attributes["data-viz-mobject-state-family-root-count"], "2");
  assert.equal(attributes["data-viz-mobject-state-node-count"], "4");
  assert.equal(attributes["data-viz-mobject-state-restorable-count"], "4");
  assert.equal(attributes["data-viz-mobject-state-restore-mismatch-count"], "0");
  assert.equal(attributes["data-viz-mobject-state-restore-node-count"], String(snapshot.mobjectStatePayloadRestoreNodeCount));
  assert.equal(attributes["data-viz-mobject-state-restore-point-count"], String(snapshot.mobjectStatePayloadRestorePointCount));
  assert.equal(attributes["data-viz-mobject-state-restore-ready-count"], "2");
  assert.equal(
    attributes["data-viz-mobject-state-restore-render-data-count"],
    String(snapshot.mobjectStatePayloadRestoreRenderDataCount)
  );
  assert.equal(attributes["data-viz-mobject-state-restore-source-summary"], snapshot.mobjectStatePayloadRestoreSourceSummary);
  assert.equal(
    attributes["data-viz-mobject-state-restore-uniform-node-count"],
    String(snapshot.mobjectStatePayloadRestoreUniformNodeCount)
  );
  assert.equal(attributes["data-viz-mobject-state-snapshot-count"], "2");
  assert.equal(attributes["data-viz-mobject-state-targetable-count"], "3");
  assert.equal(attributes["data-viz-mobject-state-target-count"], "2");
  assert.equal(attributes["data-viz-mobject-state-target-ids"], "axes:target,function-curve:target");
  assert.equal(
    attributes["data-viz-mobject-state-target-node-count"],
    String(snapshot.mobjectStatePayloadTargetNodeCount)
  );
  assert.equal(
    attributes["data-viz-mobject-state-target-point-count"],
    String(snapshot.mobjectStatePayloadTargetPointCount)
  );
  assert.equal(
    attributes["data-viz-mobject-state-target-render-data-count"],
    String(snapshot.mobjectStatePayloadTargetRenderDataCount)
  );
  assert.equal(attributes["data-viz-mobject-state-signature"], snapshot.mobjectStatePayloadSignature);
  assert.equal(attributes["data-viz-mobject-state-summary"], snapshot.mobjectStatePayloadSummary);
  assert.equal(snapshot.mobjectStateRestoreBridgeObjectId, "function-curve");
  assert.equal(snapshot.mobjectStateRestoreBridgeSavedFamilyIds, "function-curve,moving-probe,probe-trace");
  assert.equal(snapshot.mobjectStateRestoreBridgeBeforeFamilyIds, snapshot.mobjectStateRestoreBridgeSavedFamilyIds);
  assert.equal(snapshot.mobjectStateRestoreBridgeAfterFamilyIds, snapshot.mobjectStateRestoreBridgeSavedFamilyIds);
  assert.equal(snapshot.mobjectStateRestoreBridgeSavedNodeCount, 3);
  assert.ok(snapshot.mobjectStateRestoreBridgeSavedPointCount > snapshot.mobjectStateRestoreBridgeSavedNodeCount);
  assert.equal(snapshot.mobjectStateRestoreBridgeRestored, true);
  assert.equal(snapshot.mobjectStateRestoreBridgeRestoreMismatchCount, 0);
  assert.equal(snapshot.mobjectStateRestoreBridgeIdentityPreserved, true);
  assert.equal(snapshot.mobjectStateRestoreBridgeFamilyPreserved, true);
  assert.match(snapshot.mobjectStateRestoreBridgeSavedSignature, /^mobject-state-restore-[0-9a-f]{8}$/);
  assert.match(snapshot.mobjectStateRestoreBridgeCurrentSignature, /^mobject-state-restore-[0-9a-f]{8}$/);
  assert.match(snapshot.mobjectStateRestoreBridgeRestoredSignature, /^mobject-state-restore-[0-9a-f]{8}$/);
  assert.equal(snapshot.mobjectStateRestoreBridgeSourceContract, MOBJECT_STATE_RESTORE_BRIDGE_SOURCE_CONTRACT);
  assert.equal(
    snapshot.mobjectStateRestoreBridgeSummary,
    `mobject-state-restore:function-curve:family=3:points=${snapshot.mobjectStateRestoreBridgeSavedPointCount}:restored=true:mismatch=0:identity=true`
  );
  assert.equal(attributes["data-viz-mobject-state-restore-bridge-object-id"], "function-curve");
  assert.equal(
    attributes["data-viz-mobject-state-restore-bridge-family-ids"],
    "function-curve,moving-probe,probe-trace"
  );
  assert.equal(attributes["data-viz-mobject-state-restore-bridge-restored"], "true");
  assert.equal(attributes["data-viz-mobject-state-restore-bridge-restore-mismatch-count"], "0");
  assert.equal(attributes["data-viz-mobject-state-restore-bridge-identity-preserved"], "true");
  assert.equal(attributes["data-viz-mobject-state-restore-bridge-family-preserved"], "true");
  assert.equal(
    attributes["data-viz-mobject-state-restore-bridge-source-contract"],
    MOBJECT_STATE_RESTORE_BRIDGE_SOURCE_CONTRACT
  );
  assert.equal(
    attributes["data-viz-mobject-state-restore-bridge-summary"],
    snapshot.mobjectStateRestoreBridgeSummary
  );
  assert.equal(snapshot.mobjectMoveToTargetObjectId, "function-curve");
  assert.equal(snapshot.mobjectMoveToTargetTargetId, "function-curve:target");
  assert.equal(snapshot.mobjectMoveToTargetSourceFamilyIds, "function-curve,moving-probe,probe-trace");
  assert.equal(snapshot.mobjectMoveToTargetTargetFamilyIds, snapshot.mobjectMoveToTargetSourceFamilyIds);
  assert.equal(snapshot.mobjectMoveToTargetAfterFamilyIds, snapshot.mobjectMoveToTargetSourceFamilyIds);
  assert.equal(snapshot.mobjectMoveToTargetSourceNodeCount, 3);
  assert.equal(snapshot.mobjectMoveToTargetTargetNodeCount, 3);
  assert.equal(snapshot.mobjectMoveToTargetAppliedNodeCount, 3);
  assert.ok(snapshot.mobjectMoveToTargetTargetPointCount > snapshot.mobjectMoveToTargetTargetNodeCount);
  assert.equal(snapshot.mobjectMoveToTargetTargetGenerated, true);
  assert.equal(snapshot.mobjectMoveToTargetBecomeApplied, true);
  assert.equal(snapshot.mobjectMoveToTargetIdentityPreserved, true);
  assert.equal(snapshot.mobjectMoveToTargetFamilyPreserved, true);
  assert.equal(snapshot.mobjectMoveToTargetRenderStateChanged, true);
  assert.match(snapshot.mobjectMoveToTargetSourceSignature, /^mobject-move-to-target-[0-9a-f]{8}$/);
  assert.match(snapshot.mobjectMoveToTargetTargetSignature, /^mobject-move-to-target-[0-9a-f]{8}$/);
  assert.match(snapshot.mobjectMoveToTargetAfterSignature, /^mobject-move-to-target-[0-9a-f]{8}$/);
  assert.notEqual(snapshot.mobjectMoveToTargetSourceSignature, snapshot.mobjectMoveToTargetTargetSignature);
  assert.equal(snapshot.mobjectMoveToTargetTargetSignature, snapshot.mobjectMoveToTargetAfterSignature);
  assert.equal(snapshot.mobjectMoveToTargetSourceContract, MOBJECT_MOVE_TO_TARGET_BRIDGE_SOURCE_CONTRACT);
  assert.equal(
    snapshot.mobjectMoveToTargetSummary,
    `mobject-move-to-target:function-curve:target=function-curve:target:nodes=3:points=${snapshot.mobjectMoveToTargetTargetPointCount}:changed=true:become=true:identity=true`
  );
  assert.equal(attributes["data-viz-mobject-move-to-target-object-id"], "function-curve");
  assert.equal(attributes["data-viz-mobject-move-to-target-target-id"], "function-curve:target");
  assert.equal(
    attributes["data-viz-mobject-move-to-target-source-family-ids"],
    "function-curve,moving-probe,probe-trace"
  );
  assert.equal(attributes["data-viz-mobject-move-to-target-target-node-count"], "3");
  assert.equal(attributes["data-viz-mobject-move-to-target-become-applied"], "true");
  assert.equal(attributes["data-viz-mobject-move-to-target-identity-preserved"], "true");
  assert.equal(attributes["data-viz-mobject-move-to-target-family-preserved"], "true");
  assert.equal(attributes["data-viz-mobject-move-to-target-render-state-changed"], "true");
  assert.equal(
    attributes["data-viz-mobject-move-to-target-source-contract"],
    MOBJECT_MOVE_TO_TARGET_BRIDGE_SOURCE_CONTRACT
  );
  assert.equal(attributes["data-viz-mobject-move-to-target-summary"], snapshot.mobjectMoveToTargetSummary);
});

test("converts evidence snapshots into S11/S22 stable data attributes", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const snapshot = buildMathSceneEvidenceSnapshot({ reducedMotion: true, runtimeState, scene: functionGraphSpec });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(attributes["data-viz-scene-id"], "mais-manim-function-graph");
  assert.equal(attributes["data-viz-concept-id"], snapshot.activeConceptId);
  assert.equal(attributes["data-viz-active-step"], "revealCurve");
  assert.equal(attributes["data-viz-reduced-motion"], "true");
  assert.equal(attributes["data-viz-mobject-family-cycle-count"], "0");
  assert.equal(attributes["data-viz-mobject-family-max-depth"], "2");
  assert.equal(attributes["data-viz-mobject-family-member-count"], "4");
  assert.equal(attributes["data-viz-mobject-family-orphan-count"], "0");
  assert.equal(attributes["data-viz-mobject-family-root-count"], "2");
  assert.equal(snapshot.mobjectFamilyCycleCount, 0);
  assert.equal(snapshot.mobjectFamilyMaxDepth, 2);
  assert.equal(snapshot.mobjectFamilyOrphanCount, 0);
  assert.equal(snapshot.mobjectFamilySourceContract, MOBJECT_FAMILY_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-mobject-family-source-contract"], MOBJECT_FAMILY_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-mobject-family-cache-status"], "cold-miss");
  assert.equal(attributes["data-viz-mobject-family-cache-reusable"], "false");
  assert.equal(attributes["data-viz-mobject-family-cache-summary"], "status=cold-miss;reusable=false;familyDirty=4;dataDirty=0;reused=0;recomputed=4");
  assert.equal(snapshot.mobjectFamilyCacheDataDirtyCount, 0);
  assert.equal(snapshot.mobjectFamilyCacheFamilyDirtyCount, 4);
  assert.equal(snapshot.mobjectFamilyCacheRecomputedCount, 4);
  assert.equal(snapshot.mobjectFamilyCacheRecomputedIds, "axes,function-curve,moving-probe,probe-trace");
  assert.equal(snapshot.mobjectFamilyCacheReusedCount, 0);
  assert.equal(snapshot.mobjectFamilyCacheReusedIds, "none");
  assert.equal(snapshot.mobjectFamilyCacheSourceContract, MOBJECT_FAMILY_CACHE_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-mobject-family-cache-data-dirty-count"], "0");
  assert.equal(attributes["data-viz-mobject-family-cache-family-dirty-count"], "4");
  assert.equal(attributes["data-viz-mobject-family-cache-recomputed-count"], "4");
  assert.equal(attributes["data-viz-mobject-family-cache-recomputed-ids"], "axes,function-curve,moving-probe,probe-trace");
  assert.equal(attributes["data-viz-mobject-family-cache-reused-count"], "0");
  assert.equal(attributes["data-viz-mobject-family-cache-reused-ids"], "none");
  assert.equal(attributes["data-viz-mobject-family-cache-source-contract"], MOBJECT_FAMILY_CACHE_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-mobject-max-depth"], "2");
  assert.equal(attributes["data-viz-mobject-orphan-count"], "0");
  assert.equal(attributes["data-viz-mobject-state-snapshot-count"], "2");
  assert.equal(attributes["data-viz-mobject-state-node-count"], "4");
  assert.equal(attributes["data-viz-mobject-state-target-count"], "2");
  assert.equal(attributes["data-viz-mobject-state-target-node-count"], "4");
  assert.ok(Number(attributes["data-viz-mobject-state-target-point-count"]) > 4);
  assert.equal(attributes["data-viz-mobject-state-target-render-data-count"], "3");
  assert.equal(attributes["data-viz-mobject-targetable-count"], "3");
  assert.equal(attributes["data-viz-mobject-anchor-object-count"], "4");
  assert.equal(attributes["data-viz-mobject-anchor-name-count"], "7");
  assert.equal(attributes["data-viz-mobject-anchor-point-count"], "28");
  assert.equal(attributes["data-viz-mobject-anchor-finite-point-count"], "28");
  assert.equal(attributes["data-viz-mobject-anchor-empty-bounding-box-count"], "1");
  assert.equal(attributes["data-viz-mobject-anchor-names"], "back,bottom,center,front,left,right,top");
  assert.equal(attributes["data-viz-mobject-anchor-object-ids"], "axes,function-curve,moving-probe,probe-trace");
  assert.match(attributes["data-viz-mobject-anchor-source-contract"], /get_critical_point/);
  assert.equal(
    attributes["data-viz-mobject-anchor-summary"],
    "mobject-anchors:objects=4:anchors=7:points=28:finite=28:empty=1:names=back,bottom,center,front,left,right,top:ids=axes,function-curve,moving-probe,probe-trace"
  );
  assert.equal(attributes["data-viz-mobject-uniform-count"], "4");
  assert.equal(attributes["data-viz-mobject-fixed-in-frame-uniform-count"], "0");
  assert.equal(attributes["data-viz-mobject-shade-in-3d-count"], "0");
  assert.equal(attributes["data-viz-mobject-clipping-plane-count"], "0");
  assert.equal(attributes["data-viz-mobject-transparent-count"], "0");
  assert.equal(attributes["data-viz-mobject-uniform-summary"], "objects=4;fixed=0;shade3d=0;clipPlanes=0;transparent=0;minOpacity=1.000");
  assert.equal(attributes["data-viz-mobject-material-object-count"], "4");
  assert.equal(attributes["data-viz-mobject-material-transparent-count"], "0");
  assert.equal(attributes["data-viz-mobject-material-depth-write-enabled-count"], "4");
  assert.equal(attributes["data-viz-mobject-material-shade-in-3d-count"], "0");
  assert.equal(attributes["data-viz-mobject-material-clipping-plane-count"], "0");
  assert.equal(attributes["data-viz-mobject-material-opacity-range"], "1.000..1.000");
  assert.equal(attributes["data-viz-mobject-material-object-ids"], "axes,function-curve,moving-probe,probe-trace");
  assert.match(attributes["data-viz-mobject-material-source-contract"], /materialPropsForMobject/);
  assert.equal(
    attributes["data-viz-mobject-material-summary"],
    "material-uniforms:objects=4:transparent=0:depthWrite=4:shade3d=0:clipPlanes=0:opacityRange=1.000..1.000:ids=axes,function-curve,moving-probe,probe-trace"
  );
  assert.equal(attributes["data-viz-vmobject-style-count"], "2");
  assert.equal(attributes["data-viz-vmobject-transparent-stroke-count"], "1");
  assert.equal(attributes["data-viz-vmobject-fill-count"], "0");
  assert.equal(attributes["data-viz-vmobject-max-stroke-width"], "5.00");
  assert.equal(attributes["data-viz-vmobject-max-anti-alias-width"], "1.00");
  assert.equal(attributes["data-viz-vmobject-max-joint-angle"], "0.00");
  assert.equal(attributes["data-viz-vmobject-base-normal-object-ids"], "function-curve,probe-trace");
  assert.equal(attributes["data-viz-vmobject-stroke-zoom-screen-space-count"], "2");
  assert.equal(attributes["data-viz-vmobject-stroke-zoom-world-space-count"], "0");
  assert.equal(attributes["data-viz-vmobject-style-object-ids"], "function-curve,probe-trace");
  assert.equal(
    attributes["data-viz-vmobject-style-summary"],
    "objects=2;strokeRoles=function,trace;fillRoles=reference;transparentStroke=1;filled=0;maxStrokeWidth=5.00;minStrokeOpacity=0.55;maxAntiAliasWidth=1.00;maxJointAngle=0.00;baseNormals=function-curve,probe-trace;strokeZoom=screen-space:2,world-space:0"
  );
  assert.equal(attributes["data-viz-mobject-data-changed-count"], "0");
  assert.equal(attributes["data-viz-mobject-bounding-box-stale-count"], "0");
  assert.equal(attributes["data-viz-mobject-uniforms-changed-count"], "0");
  assert.equal(attributes["data-viz-mobject-invalidation-summary"], "data=0;bbox=0;family=0;metadata=0;uniforms=0;unchanged=4");
  assert.equal(attributes["data-viz-mobject-invalidated-ids"], "none");
  assert.equal(attributes["data-viz-mobject-invalidation-reasons"], "none");
  assert.equal(attributes["data-viz-mobject-animation-owned-invalidation-count"], "0");
  assert.equal(attributes["data-viz-mobject-updater-active-invalidation-count"], "0");
  assert.equal(attributes["data-viz-mobject-unknown-invalidation-count"], "0");
  assert.equal(attributes["data-viz-mobject-invalidation-ownership-summary"], "none");
  assert.equal(attributes["data-viz-scene-top-level-mobject-count"], "2");
  assert.equal(attributes["data-viz-scene-render-group-count"], "4");
  assert.equal(attributes["data-viz-scene-render-group-ids"], "axes,function-curve,moving-probe,probe-trace");
  assert.equal(attributes["data-viz-scene-render-group-overlap-count"], "0");
  assert.equal(attributes["data-viz-scene-render-group-overlap-ids"], "none");
  assert.equal(attributes["data-viz-scene-renderable-count"], "4");
  assert.equal(attributes["data-viz-scene-renderable-ids"], "axes,function-curve,moving-probe,probe-trace");
  assert.equal(attributes["data-viz-scene-foreground-count"], "0");
  assert.equal(attributes["data-viz-scene-foreground-ids"], "none");
  assert.equal(attributes["data-viz-scene-fixed-in-frame-count"], "0");
  assert.equal(attributes["data-viz-scene-fixed-in-frame-ids"], "none");
  assert.equal(attributes["data-viz-scene-membership-active-introducer-count"], "0");
  assert.equal(attributes["data-viz-scene-membership-active-introducer-ids"], "none");
  assert.equal(attributes["data-viz-scene-membership-active-remover-count"], "0");
  assert.equal(attributes["data-viz-scene-membership-active-remover-ids"], "none");
  assert.equal(attributes["data-viz-scene-membership-excluded-count"], "0");
  assert.equal(attributes["data-viz-scene-membership-excluded-ids"], "none");
  assert.equal(attributes["data-viz-scene-membership-pending-introducer-count"], "0");
  assert.equal(attributes["data-viz-scene-membership-pending-introducer-ids"], "none");
  assert.equal(attributes["data-viz-scene-membership-removed-count"], "0");
  assert.equal(attributes["data-viz-scene-membership-removed-ids"], "none");
  assert.equal(attributes["data-viz-formula-binding-anchor-count"], "2");
  assert.equal(attributes["data-viz-formula-binding-missing-anchor-count"], "0");
  assert.equal(attributes["data-viz-formula-binding-missing-anchor-token-ids"], "none");
  assert.equal(attributes["data-viz-formula-binding-anchor-source-contract"], FORMULA_BINDING_ANCHOR_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-formula-token-ids"], snapshot.formulaTokenIds);
  assert.equal(attributes["data-viz-semantic-binding-concept-ids"], snapshot.semanticBindingConceptIds);
  assert.equal(snapshot.semanticBindingSourceContract, FORMULA_BINDING_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-semantic-binding-source-contract"], FORMULA_BINDING_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-parameter-tracker-count"], "6");
  assert.equal(attributes["data-viz-parameter-tracker-ids"], snapshot.parameterTrackerIds);
  assert.equal(attributes["data-viz-parameter-tracker-values"], snapshot.parameterTrackerValues);
  assert.match(attributes["data-viz-parameter-tracker-summary"], /comparison=5\.000/);
  assert.equal(attributes["data-viz-manim-animation-plan-count"], "2");
  assert.equal(attributes["data-viz-manim-animation-operation-count"], "4");
  assert.equal(attributes["data-viz-manim-animation-object-count"], "2");
  assert.equal(attributes["data-viz-manim-animation-composition-count"], "1");
  assert.equal(attributes["data-viz-manim-animation-composition-window-count"], "2");
  assert.equal(attributes["data-viz-manim-animation-composition-modes"], "laggedStart");
  assert.equal(attributes["data-viz-manim-animation-composition-duration"], "1.440");
  assert.equal(attributes["data-viz-manim-animation-composition-issue-count"], "0");
  assert.equal(attributes["data-viz-manim-transform-step-count"], "0");
  assert.equal(attributes["data-viz-manim-active-animation-plan-id"], "none");
  assert.equal(attributes["data-viz-manim-active-animation-plan-ids"], "none");
  assert.equal(attributes["data-viz-manim-active-animation-node-count"], "0");
  assert.equal(attributes["data-viz-manim-active-animation-node-progress-summary"], "none");
  assert.equal(attributes["data-viz-manim-active-animation-progress"], "1.000");
  assert.equal(attributes["data-viz-manim-transform-interpolate-bounding-box-count"], "0");
  assert.equal(attributes["data-viz-manim-transform-interpolate-bounding-box-finite-count"], "0");
  assert.equal(attributes["data-viz-manim-transform-interpolate-bounding-box-empty-count"], "0");
  assert.equal(attributes["data-viz-manim-transform-interpolate-bounding-box-object-ids"], "none");
  assert.equal(
    attributes["data-viz-manim-transform-interpolate-bounding-box-summary"],
    "transform-interpolate-bounds:nodes=0:finite=0:empty=0:ids=none"
  );
  assert.match(attributes["data-viz-manim-random-seed"], /^\d+$/);
  assert.equal(attributes["data-viz-manim-random-seed-algorithm"], "mulberry32");
  assert.match(attributes["data-viz-manim-random-seed-signature"], /^rng-[0-9a-f]{8}$/);
  assert.equal(attributes["data-viz-manim-playback-active-play-index"], "0");
  assert.equal(attributes["data-viz-manim-playback-lifecycle-phase"], "begin");
  assert.equal(attributes["data-viz-manim-playback-completed-play-count"], "0");
  assert.equal(attributes["data-viz-manim-playback-pending-play-count"], "5");
  assert.equal(attributes["data-viz-manim-playback-updates-during-active-play"], "false");
  assert.equal(attributes["data-viz-manim-playback-event-count"], "64");
  assert.match(attributes["data-viz-manim-playback-lifecycle-summary"], /play=0;phase=begin;alpha=0\.000/);
  assert.match(attributes["data-viz-manim-playback-active-event-summary"], /0:begin@0\.000\/raw=0\.000\/eased=0\.000\/rate=smooth/);
  assert.equal(attributes["data-viz-manim-time-progression-mode"], "sampled");
  assert.equal(attributes["data-viz-manim-time-progression-frame-count"], "10");
  assert.equal(attributes["data-viz-manim-time-progression-final-time"], "2.500");
  assert.equal(attributes["data-viz-manim-time-progression-overshoot"], "true");
  assert.equal(snapshot.manimTimeProgressionSamplingPolicy, SCENE_TIME_PROGRESSION_SAMPLING_POLICY);
  assert.equal(snapshot.manimTimeProgressionSourceContract, SCENE_TIME_PROGRESSION_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-time-progression-sampling-policy"], SCENE_TIME_PROGRESSION_SAMPLING_POLICY);
  assert.equal(attributes["data-viz-manim-time-progression-source-contract"], SCENE_TIME_PROGRESSION_SOURCE_CONTRACT);
  assert.equal(
    attributes["data-viz-manim-time-progression-times-summary"],
    "times:0.250,0.500,0.750,1.000,1.250,1.500,1.750,2.000,2.250,2.500"
  );
  assert.equal(
    attributes["data-viz-manim-time-progression-summary"],
    "timeProgression:sampled:run=2.400:fps=4:frames=10:final=2.500:overshoot=true"
  );
  assert.equal(attributes["data-viz-manim-should-update-mobjects"], "true");
  assert.equal(attributes["data-viz-manim-always-update-mobjects"], "false");
  assert.equal(attributes["data-viz-manim-should-capture-frame"], "true");
  assert.equal(attributes["data-viz-manim-update-policy-reason"], "has-updaters");
  assert.equal(attributes["data-viz-manim-update-policy-source-contract"], SCENE_UPDATE_POLICY_SOURCE_CONTRACT);
  assert.equal(
    attributes["data-viz-manim-update-policy-summary"],
    "updatePolicy:update=true:capture=true:reason=has-updaters:updaters=4"
  );
  assert.equal(attributes["data-viz-manim-skip-animations"], "false");
  assert.equal(attributes["data-viz-manim-force-draw"], "false");
  assert.equal(attributes["data-viz-manim-has-updaters"], "true");
  assert.equal(attributes["data-viz-manim-updater-count"], "4");
  assert.equal(attributes["data-viz-updater-active-count"], "1");
  assert.equal(attributes["data-viz-updater-suspended-count"], "3");
});

test("records active AnimationComposition frame windows for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(
    functionGraphSpec,
    elapsedAtMidpointOfComposition("function-attention-lagged-start")
  );
  const activeCompositionId = runtimeState.timeline.activeStep?.type === "animationComposition"
    ? runtimeState.timeline.activeStep.compositionId
    : undefined;
  const compositionPlans = buildSceneAnimationCompositionPlans(functionGraphSpec);
  const activePlan = compositionPlans.find((plan) => plan.id === activeCompositionId);
  const expectedEvidence = buildAnimationCompositionFrameEvidence({
    activeCompositionId,
    elapsedSeconds: runtimeState.timeline.localProgress * (activePlan?.durationSeconds ?? 0),
    plans: compositionPlans
  });
  const expectedAttributes = animationCompositionFrameEvidenceDataAttributes(expectedEvidence);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: functionGraphSpec,
    stateSnapshotEvidence: {
      frameIndex: 7,
      selectedParameterId: "value"
    }
  });
  const attributes = evidenceDataAttributes(snapshot);

  assert.equal(snapshot.activeStep, "animationComposition");
  assert.equal(snapshot.manimAnimationCompositionActiveId, "function-attention-lagged-start");
  assert.equal(snapshot.manimAnimationCompositionActiveType, "laggedStart");
  assert.equal(snapshot.manimAnimationCompositionActiveWindowCount, 2);
  assert.equal(snapshot.manimAnimationCompositionActiveWindowIds, "function-curve-attention-lift,function-probe-attention-pulse");
  assert.equal(snapshot.manimAnimationCompositionCompletedWindowCount, 0);
  assert.equal(snapshot.manimAnimationCompositionCompletedWindowIds, "none");
  assert.equal(snapshot.manimAnimationCompositionPendingWindowCount, 0);
  assert.equal(snapshot.manimAnimationCompositionPendingWindowIds, "none");
  assert.equal(snapshot.manimAnimationCompositionFrameElapsedSeconds, 0.72);
  assert.equal(snapshot.manimAnimationCompositionFrameProgress, 0.5);
  assert.equal(snapshot.manimAnimationCompositionTimingPolicy, "recursive-lag-ratio-child-duration");
  assert.equal(
    snapshot.manimAnimationCompositionWindowSummary,
    "function-curve-attention-lift@0.000..1.200:0.600|function-probe-attention-pulse@0.240..1.440:0.400"
  );
  assert.equal(
    snapshot.manimAnimationCompositionSourceContract,
    "Scene.play(*animations)->AnimationGroup/LaggedStart/Succession windows"
  );
  assert.equal(
    snapshot.manimAnimationCompositionFrameSummary,
    "animation-composition-frame:active=function-attention-lagged-start:mode=laggedStart:elapsed=0.720:progress=0.500:activeWindows=2:completed=0:pending=0"
  );

  assert.equal(
    attributes["data-viz-manim-animation-composition-active-id"],
    expectedAttributes["data-viz-manim-animation-composition-active-id"]
  );
  assert.equal(
    attributes["data-viz-manim-animation-composition-active-type"],
    expectedAttributes["data-viz-manim-animation-composition-active-type"]
  );
  assert.equal(
    attributes["data-viz-manim-animation-composition-active-window-count"],
    expectedAttributes["data-viz-manim-animation-composition-active-window-count"]
  );
  assert.equal(
    attributes["data-viz-manim-animation-composition-active-window-ids"],
    expectedAttributes["data-viz-manim-animation-composition-active-window-ids"]
  );
  assert.equal(
    attributes["data-viz-manim-animation-composition-completed-window-count"],
    expectedAttributes["data-viz-manim-animation-composition-completed-window-count"]
  );
  assert.equal(
    attributes["data-viz-manim-animation-composition-completed-window-ids"],
    expectedAttributes["data-viz-manim-animation-composition-completed-window-ids"]
  );
  assert.equal(
    attributes["data-viz-manim-animation-composition-pending-window-count"],
    expectedAttributes["data-viz-manim-animation-composition-pending-window-count"]
  );
  assert.equal(
    attributes["data-viz-manim-animation-composition-pending-window-ids"],
    expectedAttributes["data-viz-manim-animation-composition-pending-window-ids"]
  );
  assert.equal(
    attributes["data-viz-manim-animation-composition-frame-elapsed-seconds"],
    expectedAttributes["data-viz-manim-animation-composition-frame-elapsed-seconds"]
  );
  assert.equal(
    attributes["data-viz-manim-animation-composition-frame-progress"],
    expectedAttributes["data-viz-manim-animation-composition-frame-progress"]
  );
  assert.equal(
    attributes["data-viz-manim-animation-composition-timing-policy"],
    expectedAttributes["data-viz-manim-animation-composition-timing-policy"]
  );
  assert.equal(
    attributes["data-viz-manim-animation-composition-window-summary"],
    expectedAttributes["data-viz-manim-animation-composition-window-summary"]
  );
  assert.equal(
    attributes["data-viz-manim-animation-composition-source-contract"],
    expectedAttributes["data-viz-manim-animation-composition-source-contract"]
  );
  assert.equal(
    attributes["data-viz-manim-animation-composition-frame-summary"],
    expectedAttributes["data-viz-manim-animation-composition-frame-summary"]
  );
});

test("serializes evidence snapshots deterministically for scene-spec export", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const snapshot = buildMathSceneEvidenceSnapshot({ reducedMotion: false, runtimeState, scene: functionGraphSpec });
  const serialized = serializeMathSceneEvidenceSnapshot(snapshot);

  assert.match(serialized, /"sceneId": "mais-manim-function-graph"/);
  assert.match(serialized, /"sceneRenderGroupIds": "axes,function-curve,moving-probe,probe-trace"/);
  assert.match(serialized, /"mobjectFamilyCacheStatus": "cold-miss"/);
  assert.match(serialized, /"mobjectFamilyCacheSummary": "status=cold-miss;reusable=false;familyDirty=4;dataDirty=0;reused=0;recomputed=4"/);
  assert.match(serialized, /"mobjectUniformSummary": "objects=4;fixed=0;shade3d=0;clipPlanes=0;transparent=0;minOpacity=1\.000"/);
  assert.match(
    serialized,
    /"vmobjectStyleSummary": "objects=2;strokeRoles=function,trace;fillRoles=reference;transparentStroke=1;filled=0;maxStrokeWidth=5\.00;minStrokeOpacity=0\.55;maxAntiAliasWidth=1\.00;maxJointAngle=0\.00;baseNormals=function-curve,probe-trace;strokeZoom=screen-space:2,world-space:0"/
  );
  assert.match(serialized, /"sceneRenderGroupOverlapIds": "none"/);
  assert.match(serialized, /"sceneRenderableIds": "axes,function-curve,moving-probe,probe-trace"/);
  assert.match(serialized, /"sceneMembershipExcludedIds": "none"/);
  assert.match(serialized, /"sceneMembershipPendingIntroducerIds": "none"/);
  assert.match(serialized, /"mobjectDataArrayRows": \[/);
  assert.match(serialized, /"objectId": "function-curve"/);
  assert.match(serialized, /"semanticRole": "function"/);
  assert.match(serialized, /"mobjectBoundingBoxRows": \[/);
  assert.match(serialized, /"kind": "finite"/);
  assert.match(serialized, /"mobjectPointCloudRows": \[/);
  assert.match(serialized, /"memberIdsWithPoints": \[/);
  assert.match(serialized, /"mobjectStatePayloadRows": \[/);
  assert.match(serialized, /"targetId": "function-curve:target"/);
  assert.match(serialized, /"mobjectDirtyStateRows": \[/);
  assert.match(serialized, /"manimValueTrackerRows": \[/);
  assert.match(serialized, /"hiddenMobjectId": "tracker:parameter:value"/);
  assert.match(serialized, /"manimCameraFrameRows": \[/);
  assert.match(serialized, /"frameId": "overview"/);
  assert.match(serialized, /"manimUpdaterExecutionRows": \[/);
  assert.match(serialized, /"familyPath": "function-curve"/);
  assert.match(serialized, /"manimUpdaterSignatureEntries": \[/);
  assert.match(serialized, /"executionMode": "timeline-progress"/);
  assert.match(serialized, /"manimTransformPathEntries": \[/);
  assert.match(serialized, /"animationPlanId": "function-curve-attention-lift"/);
  assert.match(serialized, /"manimRateFunctionEntries": \[/);
  assert.match(serialized, /"rateFunction": "smooth"/);
  assert.match(serialized, /"manimLagRatioEntries": \[/);
  assert.match(serialized, /"sourceId": "function-attention-lagged-start"/);
  assert.match(serialized, /"manimBeginAnimationsRows": \[/);
  assert.match(serialized, /"startingMobjectId": "function-curve:starting-mobject"/);
  assert.match(serialized, /"manimFinishAnimationsRows": \[/);
  assert.match(serialized, /"manimPrePlayRows": \[/);
  assert.match(serialized, /"manimPostPlayPreviewRows": \[/);
  assert.match(serialized, /"manimTexColorMapEntries": \[/);
  assert.match(serialized, /"tokenId": "function-token"/);
  assert.match(serialized, /"manimTexCompileRows": \[/);
  assert.match(serialized, /"stepSequence": "standalone-document>latex>dvisvgm>svg-cache"/);
  assert.match(serialized, /"manimTexCacheEntries": \[/);
  assert.match(serialized, /"kind": "formula-svg"/);
  assert.match(serialized, /"manimFileWriterSegmentRows": \[/);
  assert.match(serialized, /"action": "begin_animation"/);
  assert.match(serialized, /"manimActiveAnimationPlanId": "none"/);
  assert.match(serialized, /"manimAnimationCompositionCount": 1/);
  assert.match(serialized, /"manimAnimationPlanCount": 2/);
  assert.match(serialized, /"manimPlaybackEventCount": 64/);
  assert.match(serialized, /"manimPlaybackSourceContract": "Scene\.play\/wait playback:/);
  assert.match(serialized, /"manimPlaybackActiveEventSummary": "0:prePlay@0\.000/);
  assert.match(serialized, /"manimPlaybackLifecyclePhase": "begin"/);
  assert.match(serialized, /"manimRandomSeedAlgorithm": "mulberry32"/);
  assert.match(serialized, /"parameterTrackerCount": 6/);
  assert.match(serialized, /"formulaBindingAnchorCount": 2/);
  assert.match(serialized, /"formulaBindingMissingAnchorCount": 0/);
  assert.match(serialized, /"formulaBindingMissingAnchorTokenIds": "none"/);
  assert.match(serialized, /"formulaBindingAnchorSourceContract": "FormulaBinding anchors: bound formula tokens use object-aware/);
  assert.match(serialized, /"semanticBindingSourceContract": "FormulaBinding: formula tokens and math objects share conceptId/);
  assert.doesNotMatch(serialized, /\[object Object\]/);
});

test("EvidenceHarness stays pure and ThreeDLabCanvas consumes it for runtime diagnostics", () => {
  const harnessSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const stepperSource = fs.readFileSync("components/visualizations/three/manim/mathSceneFrameStepper.ts", "utf8");

  assert.doesNotMatch(harnessSource, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.match(harnessSource, /mathMobjectFamilyCache/);
  assert.match(stepperSource, /buildMathSceneEvidenceSnapshot/);
  assert.match(canvasSource, /stepMathSceneFrame/);
  assert.match(canvasSource, /evidenceDataAttributes/);
  assert.match(canvasSource, /data-viz-concept-id=\{manimEvidenceAttributes\?\.\["data-viz-concept-id"\] \?\? runtimeDiagnostics\.activeConceptId\}/);
  assert.match(
    canvasSource,
    /data-viz-formula-binding-anchor-source-contract=\{\s*manimEvidenceAttributes\?\.\["data-viz-formula-binding-anchor-source-contract"\]\s*\?\?\s*FORMULA_BINDING_ANCHOR_SOURCE_CONTRACT\s*\}/
  );
  assert.match(canvasSource, /data-viz-formula-token-ids=\{manimEvidenceAttributes\?\.\["data-viz-formula-token-ids"\] \?\? runtimeDiagnostics\.formulaTokenIds\}/);
  assert.match(canvasSource, /data-viz-semantic-binding-concept-ids=\{manimEvidenceAttributes\?\.\["data-viz-semantic-binding-concept-ids"\] \?\? runtimeDiagnostics\.semanticBindingConceptIds\}/);
  assert.match(canvasSource, /data-viz-semantic-binding-source-contract=\{manimEvidenceAttributes\?\.\["data-viz-semantic-binding-source-contract"\] \?\? FORMULA_BINDING_SOURCE_CONTRACT\}/);
  assert.match(canvasSource, /data-viz-parameter-tracker-ids=\{manimEvidenceAttributes\?\.\["data-viz-parameter-tracker-ids"\] \?\? runtimeDiagnostics\.parameterTrackerIds\}/);
  assert.match(canvasSource, /data-viz-parameter-tracker-values=\{manimEvidenceAttributes\?\.\["data-viz-parameter-tracker-values"\] \?\? runtimeDiagnostics\.parameterTrackerValues\}/);
  assert.match(canvasSource, /data-viz-curve-partial-source-id=\{manimEvidenceAttributes\?\.\["data-viz-curve-partial-source-id"\] \?\? runtimeDiagnostics\.curvePartialSourceId\}/);
  assert.match(canvasSource, /data-viz-mobject-uniforms-changed-count=\{manimEvidenceAttributes\?\.\["data-viz-mobject-uniforms-changed-count"\] \?\? "0"\}/);
  assert.match(canvasSource, /data-viz-manim-floor-plane-error=\{manimEvidenceAttributes\?\.\["data-viz-manim-floor-plane-error"\] \?\? "none"\}/);
  assert.match(canvasSource, /data-viz-manim-pointer-control-version=\{/);
  assert.match(canvasSource, /data-viz-manim-pointer-delta-point=\{manimEvidenceAttributes\?\.\["data-viz-manim-pointer-delta-point"\] \?\? "0\.000,0\.000,0\.000"\}/);
  assert.match(canvasSource, /data-viz-manim-pointer-frame-shift=\{manimEvidenceAttributes\?\.\["data-viz-manim-pointer-frame-shift"\] \?\? "0\.000,0\.000,0\.000"\}/);
  assert.match(canvasSource, /data-viz-manim-pointer-point=\{manimEvidenceAttributes\?\.\["data-viz-manim-pointer-point"\] \?\? "0\.000,0\.000,0\.000"\}/);
  assert.match(canvasSource, /data-viz-manim-pointer-phi-delta=\{manimEvidenceAttributes\?\.\["data-viz-manim-pointer-phi-delta"\] \?\? "0\.000"\}/);
  assert.match(canvasSource, /data-viz-manim-pointer-scroll-relative-offset=\{manimEvidenceAttributes\?\.\["data-viz-manim-pointer-scroll-relative-offset"\] \?\? "0\.000"\}/);
  assert.match(canvasSource, /data-viz-manim-pointer-theta-delta=\{manimEvidenceAttributes\?\.\["data-viz-manim-pointer-theta-delta"\] \?\? "0\.000"\}/);
  assert.match(
    canvasSource,
    /data-viz-mobject-copy-source-id=\{\s*manimEvidenceAttributes\?\.\["data-viz-mobject-copy-source-id"\]\s*\?\?\s*manimMobjectCopyPlanAttributes\?\.\["data-viz-mobject-copy-source-id"\]\s*\?\?\s*"none"\s*\}/
  );
  assert.match(
    canvasSource,
    /data-viz-mobject-copy-source-contract=\{\s*manimEvidenceAttributes\?\.\["data-viz-mobject-copy-source-contract"\]\s*\?\?\s*manimMobjectCopyPlanAttributes\?\.\["data-viz-mobject-copy-source-contract"\]\s*\?\?\s*MOBJECT_COPY_SOURCE_CONTRACT\s*\}/
  );
  assert.match(harnessSource, /sceneFloorPlaneDataAttributes/);
  assert.match(harnessSource, /scenePointerControlDataAttributes/);
});

test("MathSceneRuntime keeps smoke-test data attributes on DOM overlays instead of R3F objects", () => {
  const runtimeSource = fs.readFileSync("components/visualizations/three/manim/MathSceneRuntime.tsx", "utf8");

  assert.doesNotMatch(runtimeSource, /data-viz-/);
  assert.match(runtimeSource, /<group>/);
});
