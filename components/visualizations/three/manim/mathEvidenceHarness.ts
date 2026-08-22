import { MOBJECT_FAMILY_SOURCE_CONTRACT, buildMobjectFamilyIndex, summarizeMobjectFamilies } from "./mathMobjectFamily";
import {
  MOBJECT_FAMILY_CACHE_SOURCE_CONTRACT,
  buildMobjectFamilyCachePlan,
  mobjectFamilyCacheDataAttributes,
  summarizeMobjectFamilyCachePlan,
  type MobjectFamilyCacheStatus
} from "./mathMobjectFamilyCache";
import {
  buildMobjectDataTable,
  MOBJECT_DATA_ARRAY_SOURCE_CONTRACT,
  mobjectDataTableDataAttributes,
  summarizeMobjectDataTable,
  type MobjectDataRow
} from "./mathMobjectDataArray";
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
  pointsForRuntimeRenderState,
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
  MOBJECT_POINT_CLOUD_SOURCE_CONTRACT,
  buildMobjectPointCloudTable,
  mobjectPointCloudDataAttributes,
  summarizeMobjectPointCloudTable,
  type MobjectPointCloudRow
} from "./mathMobjectPointCloud";
import {
  MOBJECT_POINT_GENERATION_SOURCE_CONTRACT,
  buildMobjectPointGenerationTable,
  mobjectPointGenerationDataAttributes,
  type MobjectPointGenerationRow
} from "./mathMobjectPointGeneration";
import {
  MOBJECT_POINT_TRANSFORM_SOURCE_CONTRACT,
  buildMobjectPointTransformEvidence,
  mobjectPointTransformDataAttributes,
  type MobjectPointTransformRow
} from "./mathMobjectPointTransforms";
import {
  MANIM_CONFIG_DIGEST_SOURCE_CONTRACT,
  buildManimConfigDigest,
  manimConfigDigestDataAttributes
} from "./mathConfigDigest";
import {
  MOBJECT_BOUNDING_BOX_SOURCE_CONTRACT,
  buildMobjectBoundingBoxTable,
  mobjectBoundingBoxDataAttributes,
  summarizeMobjectBoundingBoxTable,
  type MobjectBoundingBoxRow
} from "./mathMobjectBoundingBox";
import {
  MOBJECT_INVALIDATION_SOURCE_CONTRACT,
  buildMobjectInvalidationPlan,
  classifyMobjectInvalidationOwnership,
  invalidatedMobjectIds,
  summarizeMobjectInvalidation,
  summarizeMobjectInvalidationOwnership,
  summarizeMobjectInvalidationReasons
} from "./mathMobjectInvalidation";
import {
  buildMobjectDirtyStatePayload,
  mobjectDirtyStatePayloadDataAttributes,
  summarizeMobjectDirtyStatePayload,
  type MathMobjectDirtyStatePayloadRow
} from "./mathMobjectDirtyStatePayload";
import {
  buildMobjectCopyPlan,
  MOBJECT_COPY_SOURCE_CONTRACT,
  mobjectCopyPlanDataAttributes,
  summarizeMobjectCopyPlan
} from "./mathMobjectCopyPlan";
import {
  buildMobjectArrangeLayoutPlan,
  MOBJECT_LAYOUT_SOURCE_CONTRACT,
  mobjectLayoutDataAttributes,
  summarizeMobjectLayoutPlan,
  type MathMobjectLayoutPlan
} from "./mathMobjectLayout";
import {
  buildMobjectRenderOrderPlan,
  mobjectRenderOrderDataAttributes
} from "./mathMobjectRenderOrder";
import {
  buildMobjectStatePayload,
  MOBJECT_STATE_SOURCE_CONTRACT,
  mobjectStatePayloadDataAttributes,
  summarizeMobjectStatePayload,
  summarizeMobjectStateReadiness,
  type MathMobjectStatePayloadRow
} from "./mathMobjectState";
import {
  buildMobjectStateRestoreBridgePlan,
  MOBJECT_STATE_RESTORE_BRIDGE_SOURCE_CONTRACT,
  mobjectStateRestoreBridgeDataAttributes
} from "./mathMobjectStateRestoreBridge";
import {
  buildMobjectMoveToTargetBridgePlan,
  MOBJECT_MOVE_TO_TARGET_BRIDGE_SOURCE_CONTRACT,
  mobjectMoveToTargetBridgeDataAttributes
} from "./mathMobjectMoveToTargetBridge";
import {
  ANIMATION_BUILDER_SOURCE_CONTRACT,
  buildMathAnimateBuilderCatalog,
  mathAnimateBuilderCatalogDataAttributes
} from "./mathAnimationBuilder";
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
  buildCoordinateSystemEvidence,
  coordinateSystemEvidenceDataAttributes
} from "./mathCoordinateSystem3D";
import {
  buildCoordinateSpaceEvidence,
  coordinateSpaceEvidenceDataAttributes
} from "./mathCoordinateSpace";
import { summarizeMobjectUniforms } from "./mathMobjectUniforms";
import {
  buildVMobjectBezierPathsFromObjectGraph,
  summarizeVMobjectBezierPaths,
  VMOBJECT_BEZIER_PATH_SOURCE_CONTRACT,
  vmobjectBezierPathDataAttributes
} from "./mathVMobjectBezierPath";
import {
  buildVMobjectPathConstructionEvidence,
  buildVMobjectPathConstructionPlansFromObjectGraph,
  VMOBJECT_PATH_BUILDER_SOURCE_CONTRACT,
  vmobjectPathConstructionDataAttributes,
  type VMobjectPathConstructionPlan
} from "./mathVMobjectPathBuilder";
import {
  buildVMobjectSmoothPathEvidence,
  buildVMobjectSmoothPathPlansFromObjectGraph,
  VMOBJECT_SMOOTH_PATH_SOURCE_CONTRACT,
  vmobjectSmoothPathDataAttributes,
  type VMobjectSmoothPathPlan
} from "./mathVMobjectSmoothPath";
import {
  buildSurfaceObjectEvidenceForScene,
  SURFACE_OBJECT_SOURCE_CONTRACT,
  surfaceObjectEvidenceDataAttributes
} from "./mathSurfaceObject";
import {
  buildMoveAlongVectorFieldEvidence,
  evaluateMoveAlongVectorFieldUpdater,
  MOVE_ALONG_VECTOR_FIELD_SOURCE_CONTRACT,
  moveAlongVectorFieldEvidenceDataAttributes
} from "./mathMoveAlongVectorField";
import {
  buildTracingTailEvidenceForScene,
  TRACING_TAIL_SOURCE_CONTRACT,
  tracingTailEvidenceDataAttributes
} from "./mathTracingTail";
import {
  VMOBJECT_PARTIAL_CURVE_SOURCE_CONTRACT,
  VMOBJECT_PARTIAL_CURVE_VISIBILITY_POLICY
} from "./mathCurveObject";
import { buildActiveCurvePartialFrame } from "./mathCurvePartialEvidence";
import {
  axisTickPlanDataAttributes,
  buildAxisTickPlan,
  summarizeAxisLabelAnchors,
  summarizeAxisTickPlan,
  summarizeAxisTickSpacing
} from "./mathAxisTicks";
import {
  buildOdeTrajectoryEvidenceForScene,
  odeTrajectoryDataAttributes,
  ODE_TRAJECTORY_SOURCE_CONTRACT,
} from "./mathOdeTrajectory";
import {
  odeTrajectoryObjectBridgeDataAttributes,
  ODE_TRAJECTORY_OBJECT_BRIDGE_SOURCE_CONTRACT
} from "./mathOdeTrajectoryObjects";
import {
  buildVectorFieldEvidenceForScene,
  vectorFieldDataAttributes,
  VECTOR_FIELD_SOURCE_CONTRACT
} from "./mathVectorFieldObjects";
import {
  buildStreamLineEvidenceForScene,
  STREAM_LINE_FRAME_PLAN_SOURCE_CONTRACT,
  STREAM_LINE_SOURCE_CONTRACT,
  streamLineDataAttributes,
} from "./mathStreamLineObjects";
import {
  summarizeVMobjectStyleEvidence,
  vmobjectStyleEvidenceDataAttributes
} from "./mathVMobjectStyleEvidence";
import {
  FORMULA_BINDING_ANCHOR_SOURCE_CONTRACT,
  summarizeFormulaBindingAnchors
} from "./mathFormulaBindingAnchors";
import {
  FORMULA_BINDING_SOURCE_CONTRACT,
  summarizeFormulaBindings,
  validateFormulaBindings
} from "./mathFormulaBindings";
import {
  buildProjectedLabelAnchorsFromRuntimeState,
  PROJECTED_LABEL_SOURCE_CONTRACT,
  projectedLabelAnchorDataAttributes,
  summarizeProjectedLabelAnchors,
  type ProjectionViewport
} from "./mathProjectedLabels";
import {
  buildFormulaOverlayCollisionDiagnostics,
  FORMULA_OVERLAY_COLLISION_SOURCE_CONTRACT,
  formulaOverlayCollisionDataAttributes
} from "./mathFormulaCollision";
import {
  buildMathTexCacheManifest,
  TEX_CACHE_MANIFEST_SOURCE_CONTRACT,
  texCacheManifestDataAttributes,
  type MathTexCacheEntry
} from "./mathTexCacheManifest";
import {
  buildMathTexCompilePipeline,
  TEX_COMPILE_PIPELINE_SOURCE_CONTRACT,
  texCompilePipelineDataAttributes,
  type MathTexCompilePipelineRow
} from "./mathTexCompilePipeline";
import {
  buildTexColorMap,
  texColorMapDataAttributes,
  type TexColorMapEntry
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
  buildFormulaSvgMorphEvidence,
  formulaSvgMorphEvidenceDataAttributes,
  type FormulaSvgMorphEvidence,
  type FormulaSvgMorphEvidenceInput
} from "./mathFormulaSvgMorphEvidence";
import {
  FORMULA_LAYER_SOURCE_CONTRACT,
  buildActiveProjectedLabelTextByObjectId,
  buildFormulaLayerState,
  emptyFormulaLayerProjectedLabelTextSummary,
  formulaLayerProjectedLabelTextDataAttributes,
  summarizeActiveProjectedLabelText
} from "./mathFormulaLayer";
import {
  TRANSFORM_PATH_NON_POINT_FIELD_POLICY,
  TRANSFORM_PATH_POINTLIKE_FIELD_POLICY,
  TRANSFORM_PATH_FUNCTION_SOURCE_CONTRACT,
  buildTransformPathFunctionCatalog,
  transformPathFunctionCatalogDataAttributes,
  type TransformPathFunctionCatalogEntry,
  type TransformPathFunctionCatalogPlanInput
} from "./mathPathFunctions";
import {
  RATE_FUNCTION_ALPHA_POLICY,
  RATE_FUNCTION_SOURCE_CONTRACT,
  buildRateFunctionCatalog,
  rateFunctionCatalogDataAttributes,
  type MathRateFunctionCatalogEntry
} from "./mathRateFunctions";
import {
  LAG_RATIO_SOURCE_CONTRACT,
  LAG_RATIO_SUB_ALPHA_POLICY,
  buildLagRatioCatalog,
  lagRatioCatalogDataAttributes,
  type MathLagRatioCatalogEntry
} from "./mathLagRatios";
import {
  SUB_ALPHA_SOURCE_CONTRACT,
  SUB_ALPHA_WINDOW_POLICY,
  buildSubAlphaSchedule,
  subAlphaScheduleDataAttributes
} from "./mathSubAlphaSchedule";
import {
  buildParameterPanelCatalog,
  parameterPanelDataAttributes,
  summarizeParameterPanelCatalog
} from "./mathParameterPanel";
import {
  UPDATER_SUSPENSION_POLICY,
  UPDATER_SUSPENSION_SOURCE_CONTRACT,
  buildUpdaterSuspensionPlan
} from "./mathUpdaterSuspension";
import { buildMathSceneAnimatePlans, summarizeSceneAnimationPlans } from "./mathSceneAnimationPlans";
import {
  animationCompositionFrameEvidenceDataAttributes,
  buildAnimationCompositionFrameEvidence,
  buildSceneAnimationCompositionPlans
} from "./mathAnimationComposition";
import {
  ANIMATION_LIFECYCLE_BEGIN_SOURCE_POLICY,
  ANIMATION_LIFECYCLE_SOURCE_CONTRACT,
  animationLifecycleDataAttributes,
  buildMathAnimationLifecyclePlan,
  summarizeMathAnimationLifecyclePlan
} from "./mathAnimationLifecycle";
import {
  MOBJECT_INTERPOLATE_DATA_SOURCE_SUMMARY,
  MOBJECT_INTERPOLATE_RENDER_POLICY,
  animationRuntimeEvidenceDataAttributes,
  buildMathAnimationRuntimeBoundingBoxEvidence,
  buildMathAnimationRuntimeEvidence,
  buildMathAnimationRuntimeInterpolateFieldEvidence,
  buildMathAnimationRuntimeFrame,
  buildMathAnimationRuntimeUniformEvidence,
  summarizeMathAnimationRuntimeFrame,
  transformInterpolateFieldEvidenceDataAttributes
} from "./mathAnimationRuntime";
import {
  SCENE_PLAY_COMPILATION_PREPARE_POLICY,
  SCENE_PLAY_COMPILATION_SOURCE_CONTRACT,
  buildScenePlayCompilationPlan,
  scenePlayCompilationDataAttributes,
  type MathScenePlayCompilationRow
} from "./mathScenePlayCompilation";
import {
  SCENE_BEGIN_ANIMATIONS_SOURCE_CONTRACT,
  SCENE_BEGIN_ANIMATIONS_START_STATE_POLICY,
  buildSceneBeginAnimationsPlan,
  sceneBeginAnimationsDataAttributes,
  type MathSceneBeginAnimationRow
} from "./mathSceneBeginAnimations";
import {
  SCENE_FINISH_ANIMATIONS_CLEANUP_POLICY,
  SCENE_FINISH_ANIMATIONS_RESUME_POLICY,
  SCENE_FINISH_ANIMATIONS_SOURCE_CONTRACT,
  buildSceneFinishAnimationsPlan,
  sceneFinishAnimationsDataAttributes,
  type MathSceneFinishAnimationRow
} from "./mathSceneFinishAnimations";
import {
  SCENE_PRE_PLAY_SKIP_GATE_POLICY,
  SCENE_PRE_PLAY_SOURCE_CONTRACT,
  buildScenePrePlayControlPlan,
  scenePrePlayControlDataAttributes,
  type MathScenePrePlayRow
} from "./mathScenePrePlayControl";
import {
  SCENE_POST_PLAY_PREVIEW_POLICY,
  SCENE_POST_PLAY_SOURCE_CONTRACT,
  buildScenePostPlayPreviewPlan,
  scenePostPlayPreviewDataAttributes,
  type MathScenePostPlayPreviewRow
} from "./mathScenePostPlayPreview";
import {
  buildSceneRenderBatches,
  sceneRenderBatchDataAttributes,
  type MathSceneRenderBatch
} from "./mathSceneRenderBatches";
import {
  restructureSceneMobjects,
  SCENE_MEMBERSHIP_SOURCE_CONTRACT,
  SCENE_RESTRUCTURE_SOURCE_CONTRACT,
  sceneMembershipDataAttributes,
  sceneRestructureDataAttributes,
  type MathSceneRenderGroup
} from "./mathSceneGraph";
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
import {
  buildMathSceneSelectorCatalog,
  mathSceneSelectorDataAttributes,
  summarizeMathSceneSelectorCatalog,
  type MathSceneSelectorSummary
} from "./mathSceneSelectorCatalog";
import {
  SCENE_SKIPPING_WINDOW_GATE_POLICY,
  SCENE_SKIPPING_WINDOW_SOURCE_CONTRACT,
  buildSceneSkippingWindowPlan,
  sceneSkippingWindowDataAttributes,
  type MathSceneSkippingWindowInput
} from "./mathSceneSkippingWindow";
import {
  SCENE_RUN_FROM_BEAT_CHECKPOINT_POLICY,
  SCENE_RUN_FROM_BEAT_REPLAY_POLICY,
  SCENE_RUN_FROM_BEAT_SOURCE_CONTRACT,
  buildSceneRunFromBeatPlan,
  sceneRunFromBeatDataAttributes,
  type MathSceneRunFromBeatPlanInput
} from "./mathSceneRunFromBeat";
import {
  SCENE_SKIP_CONTROL_SOURCE_CONTRACT,
  SCENE_SKIP_CONTROL_STATE_POLICY,
  buildSceneSkipControlPlan,
  sceneSkipControlDataAttributes,
  type MathSceneSkipControlInput,
  type MathSceneSkipControlTransition
} from "./mathSceneSkipControl";
import {
  SCENE_PROGRESS_CONTROL_SOURCE_CONTRACT,
  SCENE_PROGRESS_CONTROL_STATE_POLICY,
  buildSceneProgressControlPlan,
  sceneProgressControlDataAttributes,
  type MathSceneProgressControlInput,
  type MathSceneProgressControlTransition
} from "./mathSceneProgressControl";
import {
  SCENE_CHECKPOINT_PASTE_REPLAY_POLICY,
  SCENE_CHECKPOINT_PASTE_SOURCE_CONTRACT,
  buildMathCheckpointPastePlan,
  type BuildMathCheckpointPastePlanInput,
  type MathCheckpointPasteRestoreAction,
  type MathCheckpointPasteRestoreMode
} from "./mathCheckpointPastePlan";
import {
  buildSceneCheckpointStoreManifest,
  SCENE_CHECKPOINT_STORE_SOURCE_CONTRACT,
  sceneCheckpointStoreDataAttributes
} from "./mathSceneCheckpoint";
import {
  SCENE_POST_CELL_COMMENT_LABEL_POLICY,
  SCENE_POST_CELL_REDRAW_POLICY,
  SCENE_POST_CELL_REDRAW_SOURCE_CONTRACT,
  buildScenePostCellRedrawPlan,
  scenePostCellRedrawDataAttributes,
  type MathScenePostCellRedrawInput
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
  sceneReloadPlanDataAttributes,
  type MathSceneReloadPlanInput
} from "./mathSceneReloadPlan";
import {
  TRANSFORM_BEGIN_SOURCE_POLICY,
  buildMathTransformBeginPlan,
  summarizeMathTransformBeginPlan,
  transformBeginPlanDataAttributes
} from "./mathTransformBeginPlan";
import {
  TRANSFORM_FAMILY_ALIGNMENT_POINT_COUNT_POLICY,
  TRANSFORM_FAMILY_ALIGNMENT_SOURCE_CONTRACT,
  TRANSFORM_FAMILY_ALIGNMENT_ZIP_POLICY,
  buildTransformFamilyAlignment,
  transformFamilyAlignmentDataAttributes,
  type TransformFamilyAlignmentEntry,
  type TransformFamilyAlignmentPlan
} from "./mathTransformFamilyAlignment";
import {
  buildTransformPointAlignmentBridgePlan,
  TRANSFORM_POINT_ALIGNMENT_BRIDGE_SOURCE_CONTRACT,
  transformPointAlignmentBridgeDataAttributes,
  type TransformPointAlignmentBridgeRow
} from "./mathTransformPointAlignmentBridge";
import {
  TRANSFORM_DATA_LOCK_SOURCE_CONTRACT,
  buildRuntimeTransformDataLockPlan,
  summarizeTransformDataLockEvidence,
  transformDataLockEvidenceDataAttributes,
  type TransformDataLockEvidence
} from "./mathTransformDataLock";
import {
  buildCameraFramePayload,
  cameraFramePayloadDataAttributes,
  summarizeCameraFramePayload,
  type CameraFramePayloadRow
} from "./mathCameraFramePayload";
import {
  CAMERA_FRAME_POINT_ROUNDTRIP_SOURCE_CONTRACT,
  CAMERA_FRAME_SOURCE_CONTRACT,
  restoreCameraFrame,
  rotateCameraFrameAroundTarget,
  scaleCameraFrame,
  shiftCameraFrame
} from "./mathCameraFrame";
import {
  CAMERA_SHOT_AUTHORING_SOURCE_CONTRACT,
  buildCameraShotCatalog,
  cameraShotCatalogDataAttributes,
  summarizeCameraShotCatalog
} from "./mathCameraShotAuthoring";
import {
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
  summarizeShowCreationEvidence,
  type ShowCreationEvidenceFrame
} from "./mathShowCreationEvidence";
import {
  DRAW_BORDER_THEN_FILL_PHASE_POLICY,
  DRAW_BORDER_THEN_FILL_SOURCE_CONTRACT,
  buildDrawBorderThenFillEvidence,
  drawBorderThenFillEvidenceDataAttributes,
  summarizeDrawBorderThenFillEvidence,
  type DrawBorderThenFillEvidenceFrame
} from "./mathDrawBorderThenFillEvidence";
import {
  FADE_GROW_PHASE_POLICY,
  FADE_GROW_SOURCE_CONTRACT,
  buildFadeGrowEvidence,
  fadeGrowEvidenceDataAttributes,
  summarizeFadeGrowEvidence,
  type FadeGrowEvidenceFrame
} from "./mathFadeGrowEvidence";
import {
  INDICATION_PRIMITIVE_SOURCE_CONTRACT,
  INDICATION_PRIMITIVE_STATE_POLICY,
  buildSceneIndicationPrimitivePlan,
  indicationPrimitivePlanDataAttributes,
  summarizeSceneIndicationPrimitivePlan
} from "./mathIndicationPrimitives";
import {
  RUNTIME_INDICATION_OVERLAY_FOCUS_TARGET_POLICY,
  RUNTIME_INDICATION_OVERLAY_SOURCE_CONTRACT,
  RUNTIME_INDICATION_OVERLAY_STATE_POLICY,
  buildRuntimeIndicationOverlayFrames,
  runtimeIndicationOverlayDataAttributes,
  summarizeRuntimeIndicationOverlayFrames
} from "./mathRuntimeIndicationOverlay";
import {
  buildScenePlaybackPlan,
  buildScenePlaybackEventStream,
  SCENE_PLAYBACK_SOURCE_CONTRACT,
  sampleScenePlaybackLifecycle,
  summarizeScenePlaybackEventStream
} from "./mathScenePlayback";
import {
  buildMathSceneCapturePlan,
  capturePlanDataAttributes,
  SCENE_CAPTURE_SOURCE_CONTRACT,
  type MathSceneCaptureFramebufferStatus,
  type MathSceneCaptureKind,
  type MathSceneCaptureStatus,
  type MathSceneCaptureTarget
} from "./mathSceneCapture";
import {
  buildMathSceneRenderQualityPlan,
  MANIM_RENDER_QUALITY_SOURCE_CONTRACT,
  renderQualityDataAttributes,
  type MathSceneRenderQualityInput,
  type MathSceneRendererMode,
  type MathSceneRenderQualityPreset
} from "./mathSceneRenderQuality";
import {
  buildApprovedSceneSpecExport,
  SCENE_EXPORT_SOURCE_CONTRACT,
  sceneSpecExportDataAttributes
} from "./mathSceneExport";
import {
  buildMathSceneFileWriterPlan,
  SCENE_FILE_WRITER_SOURCE_CONTRACT,
  sceneFileWriterDataAttributes
} from "./mathSceneFileWriterPlan";
import {
  buildSceneFileWriterSegmentPlan,
  SCENE_FILE_WRITER_SEGMENT_SOURCE_CONTRACT,
  sceneFileWriterSegmentDataAttributes,
  type MathSceneFileWriterSegmentRow,
  type MathSceneFileWriterSegmentPlanInput
} from "./mathSceneFileWriterSegments";
import {
  buildScenePlaybackFileWriterBridgePlan,
  SCENE_PLAYBACK_FILE_WRITER_BRIDGE_SOURCE_CONTRACT,
  scenePlaybackFileWriterBridgeDataAttributes
} from "./mathScenePlaybackFileWriterBridge";
import {
  buildSceneFileWriterCombinePlan,
  SCENE_FILE_WRITER_COMBINE_SOURCE_CONTRACT,
  sceneFileWriterCombineDataAttributes,
  type MathSceneFileWriterCombineAction
} from "./mathSceneFileWriterCombinePlan";
import {
  buildCheckpointPasteFileWriterBridgePlan,
  checkpointPasteFileWriterBridgeDataAttributes,
  checkpointPasteFileWriterSegmentInput,
  SCENE_CHECKPOINT_PASTE_FILE_WRITER_BRIDGE_SOURCE_CONTRACT
} from "./mathCheckpointPasteFileWriterBridge";
import {
  buildSceneRunFileWriterFinishBridgePlan,
  SCENE_RUN_FILE_WRITER_FINISH_BRIDGE_SOURCE_CONTRACT,
  sceneRunFileWriterFinishBridgeDataAttributes,
  type MathSceneRunFileWriterFinishStatus
} from "./mathSceneRunFileWriterFinishBridge";
import {
  buildMathSceneRunLifecyclePlan,
  SCENE_RUN_LIFECYCLE_SOURCE_CONTRACT,
  type MathSceneRunLifecyclePlan,
  type MathSceneRunPhase
} from "./mathSceneRunLifecycle";
import {
  SCENE_INITIALIZATION_SOURCE_CONTRACT,
  buildMathSceneInitializationEvidence,
  mathSceneInitializationDataAttributes
} from "./mathSceneInitialization";
import {
  SCENE_HISTORY_BRANCH_POLICY,
  SCENE_HISTORY_SOURCE_CONTRACT,
  sceneHistoryDataAttributes,
  type MathSceneHistorySummary
} from "./mathSceneHistory";
import { randomSeedDataAttributes, randomSeedForScene } from "./mathSceneRandom";
import {
  buildMathSceneStateSnapshot,
  SCENE_STATE_SNAPSHOT_SOURCE_CONTRACT,
  sceneStateSnapshotDataAttributes
} from "./mathSceneStateSnapshot";
import {
  buildMathSceneSmokeHookManifest,
  SCENE_SMOKE_HOOK_SOURCE_CONTRACT,
  sceneSmokeHookDataAttributes
} from "./mathSceneSmokeHook";
import {
  SCENE_UPDATE_POLICY_SOURCE_CONTRACT,
  sceneUpdatePolicyDataAttributes,
  type MathSceneUpdatePolicyReason
} from "./mathSceneUpdatePolicy";
import {
  buildMathValueTrackerPayload,
  summarizeMathValueTrackerPayload,
  VALUE_TRACKER_SOURCE_CONTRACT,
  valueTrackerPayloadDataAttributes,
  type MathValueTrackerPayloadRow
} from "./mathValueTrackerPayload";
import { CAMERA_FRAME_UPDATER_SOURCE_CONTRACT } from "./mathCameraFrameUpdater";
import {
  buildMathUpdaterExecutionPlan,
  summarizeMathUpdaterExecutionPlan,
  updaterExecutionPlanDataAttributes,
  type MathUpdaterExecutionRow
} from "./mathUpdaterExecutionPlan";
import {
  buildMathUpdaterSignaturePlan,
  summarizeMathUpdaterSignaturePlan,
  updaterSignatureDataAttributes,
  type MathUpdaterSignatureEntry
} from "./mathUpdaterSignature";
import {
  buildSceneTimeProgression,
  SCENE_TIME_PROGRESSION_SAMPLING_POLICY,
  SCENE_TIME_PROGRESSION_SOURCE_CONTRACT,
  sceneTimeProgressionDataAttributes,
  type MathSceneTimeProgressionMode,
  type MathSceneTimeProgressionPlan
} from "./mathSceneTimeProgression";
import {
  buildSceneUpdateFramePlan,
  SCENE_UPDATE_FRAME_FRAME_POLICY,
  SCENE_UPDATE_FRAME_SOURCE_CONTRACT,
  sceneUpdateFrameDataAttributes,
  type MathSceneUpdateFrameAction,
  type MathSceneUpdateFrameInput
} from "./mathSceneUpdateFrame";
import {
  buildSceneInteractLoopPlan,
  SCENE_INTERACT_LOOP_SOURCE_CONTRACT,
  SCENE_INTERACT_LOOP_STATE_POLICY,
  sceneInteractLoopDataAttributes,
  type MathSceneInteractLoopFrame,
  type MathSceneInteractLoopInput,
  type MathSceneInteractLoopTermination
} from "./mathSceneInteractLoop";
import {
  buildSceneRunInteractBridgePlan,
  SCENE_RUN_INTERACT_BRIDGE_SOURCE_CONTRACT,
  sceneRunInteractBridgeDataAttributes,
  type MathSceneRunInteractBridgeStatus
} from "./mathSceneRunInteractBridge";
import {
  buildSceneEmitFramePlan,
  SCENE_EMIT_FRAME_SOURCE_CONTRACT,
  SCENE_EMIT_FRAME_WRITE_POLICY,
  sceneEmitFrameDataAttributes,
  type MathSceneEmitFrameInput,
  type MathSceneEmitFrameStatus
} from "./mathSceneEmitFrame";
import {
  buildSceneProgressThroughAnimationsPlan,
  PROGRESS_THROUGH_ANIMATIONS_FRAME_POLICY,
  PROGRESS_THROUGH_ANIMATIONS_SOURCE_CONTRACT,
  PROGRESS_THROUGH_ANIMATIONS_UPDATE_MOBJECTS_POLICY,
  sceneProgressThroughAnimationsDataAttributes,
  type MathSceneProgressFrame
} from "./mathSceneProgressThroughAnimations";
import {
  SCENE_WAIT_CONTROL_FRAME_POLICY,
  SCENE_WAIT_CONTROL_SOURCE_CONTRACT,
  SCENE_WAIT_CONTROL_UPDATER_POLICY,
  sceneWaitControlDataAttributes,
  type MathSceneWaitControlMode
} from "./mathSceneWaitControl";
import {
  buildSceneWaitFrameStepperBridge,
  SCENE_WAIT_FRAME_STEPPER_BRIDGE_SOURCE_CONTRACT,
  sceneWaitFrameStepperBridgeDataAttributes
} from "./mathSceneWaitFrameStepperBridge";
import {
  SCENE_PRESENTER_HOLD_SOURCE_CONTRACT,
  type MathScenePresenterHoldMode,
  type MathScenePresenterHoldPlan
} from "./mathScenePresenterHold";
import {
  buildSceneSoundCuePlan,
  SCENE_SOUND_CUE_SOURCE_CONTRACT,
  sceneSoundCueDataAttributes,
  type MathSceneSoundCueRow
} from "./mathSceneSoundCue";
import {
  buildSceneFloorPlanePlan,
  SCENE_FLOOR_PLANE_SOURCE_CONTRACT,
  sceneFloorPlaneDataAttributes,
  type MathSceneFloorPlaneInput
} from "./mathSceneFloorPlane";
import {
  buildScenePointerControlPlan,
  SCENE_POINTER_CONTROL_SOURCE_CONTRACT,
  scenePointerControlDataAttributes,
  type MathScenePointerControlInput,
  type MathScenePointerEventType,
  type MathScenePointerFrameAction
} from "./mathScenePointerControls";
import {
  pointToSceneMobject,
  SCENE_PICKING_SOURCE_CONTRACT,
  scenePickDataAttributes,
  type MathScenePickInput
} from "./mathScenePicking";
import {
  buildSceneKeyControlPlan,
  SCENE_KEY_CONTROL_SOURCE_CONTRACT,
  sceneKeyControlDataAttributes,
  type MathSceneKeyControlAction,
  type MathSceneKeyControlEventType,
  type MathSceneKeyControlInput
} from "./mathSceneKeyControls";
import {
  buildSceneWindowEventPlan,
  SCENE_WINDOW_EVENT_SOURCE_CONTRACT,
  sceneWindowEventDataAttributes,
  type MathSceneWindowEventInput,
  type MathSceneWindowEventType
} from "./mathSceneWindowEvents";
import type { MathObjectGraph, MathSceneRuntimeState, RuntimeRenderState } from "./mathSceneRuntimeState";
import type { MathSceneSpec, Vec3 } from "./mathSceneTypes";
import type { ThreeDStateSummary } from "../threeDSceneTypes";

export type MathSceneEvidenceSnapshot = {
  activeConceptId: string;
  activeStep: string;
  bindingIssues: string[];
  cameraAmbientRotationDegrees: number;
  cameraCanonicalShot: string;
  cameraShot: string;
  cameraUpdaterActiveCount: number;
  cameraUpdaterActiveIds: string;
  cameraUpdaterActiveSeconds: number;
  cameraUpdaterActiveWindowSummary: string;
  cameraUpdaterCount: number;
  cameraUpdaterSourceContract: typeof CAMERA_FRAME_UPDATER_SOURCE_CONTRACT;
  cameraUpdaterTimeMode: "delta" | "elapsed";
  curvePartialLength: number;
  curvePartialNormalizedRange: string;
  curvePartialRequestedRange: string;
  curvePartialReversed: boolean;
  curvePartialSampleCount: number;
  curvePartialSourceContract: typeof VMOBJECT_PARTIAL_CURVE_SOURCE_CONTRACT;
  curvePartialSourceId: string;
  curvePartialSummary: string;
  curvePartialVisibilityPolicy: typeof VMOBJECT_PARTIAL_CURVE_VISIBILITY_POLICY;
  manimCameraFrameActiveShot: string;
  manimCameraFrameCanonicalShot: string;
  manimCameraFrameCount: number;
  manimCameraFrameCurrentId: string;
  manimCameraFrameEulerSummary: string;
  manimCameraFrameFiniteMatrixCount: number;
  manimCameraFrameFixedOverlayCount: number;
  manimCameraFrameFov: number;
  manimCameraFrameGamma: number;
  manimCameraFrameInverseViewMatrixDeterminant: number;
  manimCameraFrameInverseViewMatrixSummary: string;
  manimCameraFrameMatrixDeterminantMaxError: number;
  manimCameraFrameMatrixDeterminantReady: boolean;
  manimCameraFrameMatrixDeterminantSummary: string;
  manimCameraFrameMatrixCount: number;
  manimCameraFrameOperationCount: number;
  manimCameraFrameOperationIds: string;
  manimCameraFrameOperationSummary: string;
  manimCameraFrameOrientationOrthonormalMaxError: number;
  manimCameraFrameOrientationOrthonormalReady: boolean;
  manimCameraFramePhi: number;
  manimCameraFramePointRoundTripMaxError: number;
  manimCameraFramePointRoundTripReady: boolean;
  manimCameraFramePointRoundTripSourceContract: typeof CAMERA_FRAME_POINT_ROUNDTRIP_SOURCE_CONTRACT;
  manimCameraFramePointRoundTripSummary: string;
  manimCameraFramePosition: string;
  manimCameraFrameProgress: number;
  manimCameraFrameResetShot: string;
  manimCameraFrameRestorableCount: number;
  manimCameraFrameRestoredId: string;
  manimCameraFrameRows: CameraFramePayloadRow[];
  manimCameraFrameRotatedTheta: number;
  manimCameraFrameScaledFovy: number;
  manimCameraFrameShiftedCenter: string;
  manimCameraFrameSignature: string;
  manimCameraFrameSourceContract: typeof CAMERA_FRAME_SOURCE_CONTRACT;
  manimCameraFrameSummary: string;
  manimCameraFrameTarget: string;
  manimCameraFrameTargetCameraPoint: string;
  manimCameraFrameTheta: number;
  manimCameraFrameOriginCameraPoint: string;
  manimCameraFrameUniformCenter: string;
  manimCameraFrameUniformCount: number;
  manimCameraFrameUniformFovy: number;
  manimCameraFrameUniformOrientationQuaternion: string;
  manimCameraFrameUniformQuaternionMaxError: number;
  manimCameraFrameUniformQuaternionReady: boolean;
  manimCameraFrameUniformShape: string;
  manimCameraFrameUniformSummary: string;
  manimCameraFrameViewInverseMaxError: number;
  manimCameraFrameViewInverseReady: boolean;
  manimCameraFrameViewMatrixDeterminant: number;
  manimCameraFrameViewMatrixSummary: string;
  manimCameraShotCatalogCanonicalId: string;
  manimCameraShotCatalogCount: number;
  manimCameraShotCatalogIds: string;
  manimCameraShotCatalogMissingCount: number;
  manimCameraShotCatalogMissingIds: string;
  manimCameraShotCatalogSelectedId: string;
  manimCameraShotCatalogSourceContract: typeof CAMERA_SHOT_AUTHORING_SOURCE_CONTRACT;
  manimCameraShotCatalogSummary: string;
  manimCameraShotCatalogTimelineIds: string;
  manimCameraDirectorActiveShotId: string;
  manimCameraDirectorActiveUpdaterCount: number;
  manimCameraDirectorActiveUpdaterIds: string;
  manimCameraDirectorAmbientRotationDegrees: number;
  manimCameraDirectorCanonicalShotId: string;
  manimCameraDirectorProgress: number;
  manimCameraDirectorResetShotId: string;
  manimCameraDirectorShotFov: number;
  manimCameraDirectorShotPosition: string;
  manimCameraDirectorShotTarget: string;
  manimCameraDirectorSourceContract: string;
  manimCameraDirectorSummary: string;
  manimCameraDirectorTimelineShotId: string;
  manimCameraDirectorTransitionSummary: string;
  manimCameraDirectorUpdaterCount: number;
  manimCreationDrawBorderThenFillCount: number;
  manimCreationFadeCount: number;
  manimCreationGrowFromCenterCount: number;
  manimCreationPrimitiveCount: number;
  manimCreationShowCount: number;
  manimCreationSummary: string;
  manimShowCreationDrawRanges: string;
  manimShowCreationFrameCount: number;
  manimShowCreationFrames: ShowCreationEvidenceFrame[];
  manimShowCreationObjectIds: string;
  manimShowCreationOpacitySchedule: string;
  manimShowCreationPartialPolicy: typeof SHOW_CREATION_PARTIAL_POLICY;
  manimShowCreationPhaseSequence: string;
  manimShowCreationPrimitiveCount: number;
  manimShowCreationProgressRange: string;
  manimShowCreationSourceContract: typeof SHOW_CREATION_SOURCE_CONTRACT;
  manimShowCreationSummary: string;
  manimDrawBorderFillBorderFrameCount: number;
  manimDrawBorderFillDrawRanges: string;
  manimDrawBorderFillFillFrameCount: number;
  manimDrawBorderFillFillOpacitySchedule: string;
  manimDrawBorderFillFrameCount: number;
  manimDrawBorderFillFrames: DrawBorderThenFillEvidenceFrame[];
  manimDrawBorderFillObjectIds: string;
  manimDrawBorderFillPhasePolicy: typeof DRAW_BORDER_THEN_FILL_PHASE_POLICY;
  manimDrawBorderFillPhaseSequence: string;
  manimDrawBorderFillPrimitiveCount: number;
  manimDrawBorderFillSourceContract: typeof DRAW_BORDER_THEN_FILL_SOURCE_CONTRACT;
  manimDrawBorderFillStrokeOpacitySchedule: string;
  manimDrawBorderFillSummary: string;
  manimFadeGrowFadeFrameCount: number;
  manimFadeGrowFrameCount: number;
  manimFadeGrowFrames: FadeGrowEvidenceFrame[];
  manimFadeGrowGrowFrameCount: number;
  manimFadeGrowKindSequence: string;
  manimFadeGrowObjectIds: string;
  manimFadeGrowOpacitySchedule: string;
  manimFadeGrowPhasePolicy: typeof FADE_GROW_PHASE_POLICY;
  manimFadeGrowPhaseSequence: string;
  manimFadeGrowPrimitiveCount: number;
  manimFadeGrowScaleSchedule: string;
  manimFadeGrowSourceContract: typeof FADE_GROW_SOURCE_CONTRACT;
  manimFadeGrowSummary: string;
  manimIndicationCircumscribeCount: number;
  manimIndicationConceptIds: string;
  manimIndicationCount: number;
  manimIndicationFlashCount: number;
  manimIndicationHighlightBeatCount: number;
  manimIndicationMissingTargetCount: number;
  manimIndicationPulseCount: number;
  manimIndicationSourceContract: typeof INDICATION_PRIMITIVE_SOURCE_CONTRACT;
  manimIndicationStatePolicy: typeof INDICATION_PRIMITIVE_STATE_POLICY;
  manimIndicationSummary: string;
  manimIndicationTargetObjectCount: number;
  manimIndicationTargetObjectIds: string;
  manimIndicationRuntimeOverlayActiveConceptId: string;
  manimIndicationRuntimeOverlayCount: number;
  manimIndicationRuntimeOverlayFocusTargetCount: number;
  manimIndicationRuntimeOverlayFocusTargetIds: string;
  manimIndicationRuntimeOverlayFocusTargetPolicy: typeof RUNTIME_INDICATION_OVERLAY_FOCUS_TARGET_POLICY;
  manimIndicationRuntimeOverlayFocusTargetPrimaryId: string;
  manimIndicationRuntimeOverlayFocusTargetSummary: string;
  manimIndicationRuntimeOverlayLineCount: number;
  manimIndicationRuntimeOverlayObjectCount: number;
  manimIndicationRuntimeOverlayObjectIds: string;
  manimIndicationRuntimeOverlayPointCount: number;
  manimIndicationRuntimeOverlaySourceContract: typeof RUNTIME_INDICATION_OVERLAY_SOURCE_CONTRACT;
  manimIndicationRuntimeOverlayStatePolicy: typeof RUNTIME_INDICATION_OVERLAY_STATE_POLICY;
  manimIndicationRuntimeOverlaySummary: string;
  manimAxisFiniteTickCount: number;
  manimAxisLabelAnchorCount: number;
  manimAxisLabelAnchorFiniteCount: number;
  manimAxisLabelAnchorSummary: string;
  manimAxisLabelCount: number;
  manimAxisMajorTickCount: number;
  manimAxisObjectCount: number;
  manimAxisSpacingMaxDelta: number;
  manimAxisSpacingSummary: string;
  manimAxisSummary: string;
  manimAxisTickCount: number;
  manimCoordinateAxisCount: number;
  manimCoordinateC2pFiniteCount: number;
  manimCoordinateMathRange: string;
  manimCoordinateOriginWorldPoint: string;
  manimCoordinateP2cRoundTripError: number;
  manimCoordinateSampleCount: number;
  manimCoordinateScale: string;
  manimCoordinateSummary: string;
  manimCoordinateSystemReady: boolean;
  manimCoordinateWorldRange: string;
  manimCoordinateSpaceArcLength: number;
  manimCoordinateSpaceC2pSummary: string;
  manimCoordinateSpaceCurveSampleCount: number;
  manimCoordinateSpaceEndpoints: string;
  manimCoordinateSpaceFiniteSampleCount: number;
  manimCoordinateSpaceMathRange: string;
  manimCoordinateSpaceP2cSummary: string;
  manimCoordinateSpaceResampledCount: number;
  manimCoordinateSpaceRoundTripError: number;
  manimCoordinateSpaceSampleCount: number;
  manimCoordinateSpaceScale: string;
  manimCoordinateSpaceSourceContract: string;
  manimCoordinateSpaceSummary: string;
  manimCoordinateSpaceVectorDelta: string;
  manimCoordinateSpaceWorldRange: string;
  manimSurfaceBounds: string;
  manimSurfaceCellCount: number;
  manimSurfaceFiniteNormalCount: number;
  manimSurfaceFiniteSampleCount: number;
  manimSurfaceGridSummary: string;
  manimSurfaceNormalCount: number;
  manimSurfaceObjectCount: number;
  manimSurfaceObjectIds: string;
  manimSurfaceRangeSummary: string;
  manimSurfaceSampleCount: number;
  manimSurfaceSourceContract: typeof SURFACE_OBJECT_SOURCE_CONTRACT;
  manimSurfaceSummary: string;
  manimSurfaceTopologySummary: string;
  manimSurfaceTriangleCount: number;
  manimSurfaceWireframeColumnCount: number;
  manimSurfaceWireframeRowCount: number;
  manimMoveAlongVectorFieldBlockedCount: number;
  manimMoveAlongVectorFieldCoordinateModes: string;
  manimMoveAlongVectorFieldCount: number;
  manimMoveAlongVectorFieldDeltaSummary: string;
  manimMoveAlongVectorFieldDisplacementMagnitudeRange: string;
  manimMoveAlongVectorFieldFiniteDisplacementCount: number;
  manimMoveAlongVectorFieldFiniteVectorCount: number;
  manimMoveAlongVectorFieldMovedCount: number;
  manimMoveAlongVectorFieldObjectIds: string;
  manimMoveAlongVectorFieldSpeedSummary: string;
  manimMoveAlongVectorFieldSourceContract: typeof MOVE_ALONG_VECTOR_FIELD_SOURCE_CONTRACT;
  manimMoveAlongVectorFieldStatusSummary: string;
  manimMoveAlongVectorFieldSummary: string;
  manimMoveAlongVectorFieldUpdaterIds: string;
  manimMoveAlongVectorFieldVectorMagnitudeRange: string;
  manimTracingTailAgeRange: string;
  manimTracingTailBufferCapacity: number;
  manimTracingTailBufferPolicySummary: string;
  manimTracingTailCount: number;
  manimTracingTailDurationSummary: string;
  manimTracingTailFillRatioSummary: string;
  manimTracingTailFiniteSampleCount: number;
  manimTracingTailFreshPointSummary: string;
  manimTracingTailGradientDirectionSummary: string;
  manimTracingTailGradientMonotonic: boolean;
  manimTracingTailGradientSummary: string;
  manimTracingTailIds: string;
  manimTracingTailOpacityRange: string;
  manimTracingTailSampleCadenceSummary: string;
  manimTracingTailSampleCount: number;
  manimTracingTailSampleTimeOrderSummary: string;
  manimTracingTailSourceContract: typeof TRACING_TAIL_SOURCE_CONTRACT;
  manimTracingTailSourceIds: string;
  manimTracingTailStalePointSummary: string;
  manimTracingTailStrokeWidthRange: string;
  manimTracingTailSummary: string;
  manimTracingTailTimestampRange: string;
  manimTracingTailTracedPointSourceSummary: string;
  familyId: MathSceneSpec["familyId"];
  formulaBindingAnchorCount: number;
  formulaBindingMissingAnchorCount: number;
  formulaBindingMissingAnchorTokenIds: string;
  formulaBindingAnchorSourceContract: typeof FORMULA_BINDING_ANCHOR_SOURCE_CONTRACT;
  formulaTokenCount: number;
  formulaTokenIds: string;
  manimProjectedLabelConceptIds: string;
  manimProjectedLabelCount: number;
  manimProjectedLabelHiddenCount: number;
  manimProjectedLabelHiddenObjectIds: string;
  manimProjectedLabelObjectCount: number;
  manimProjectedLabelObjectIds: string;
  manimProjectedLabelSourceContract: typeof PROJECTED_LABEL_SOURCE_CONTRACT;
  manimProjectedLabelSummary: string;
  manimProjectedLabelTextObjectCount: number;
  manimProjectedLabelTextObjectIds: string;
  manimProjectedLabelTextPolicy: string;
  manimProjectedLabelTextSource: string;
  manimProjectedLabelTextSourceContract: typeof FORMULA_LAYER_SOURCE_CONTRACT;
  manimProjectedLabelTextSummary: string;
  manimProjectedLabelTextTokenSummary: string;
  manimProjectedLabelVisibleCount: number;
  manimFormulaCollisionCount: number;
  manimFormulaCollisionLabelIds: string;
  manimFormulaCollisionSourceContract: typeof FORMULA_OVERLAY_COLLISION_SOURCE_CONTRACT;
  manimFormulaLayerSourceContract: typeof FORMULA_LAYER_SOURCE_CONTRACT;
  manimFormulaMobileViewport: boolean;
  manimFormulaSafeAreaStatus: string;
  manimFormulaSafeAreaSummary: string;
  manimTexColorMapBoundTokenCount: number;
  manimTexColorMapBindingSourceCount: number;
  manimTexColorMapEntries: TexColorMapEntry[];
  manimTexColorMapEntryCount: number;
  manimTexColorMapReferenceSourceCount: number;
  manimTexColorMapRoleCount: number;
  manimTexColorMapRoles: string;
  manimTexColorMapSceneId: string;
  manimTexColorMapSourceContract: string;
  manimTexColorMapSourceSummary: string;
  manimTexColorMapSummary: string;
  manimTexColorMapTexIsolatedTokenCount: number;
  manimTexColorMapTexIsolationSelectorCount: number;
  manimTexColorMapTexIsolationSourceCount: number;
  manimTexColorMapTokenCount: number;
  manimTexColorMapTokenIds: string;
  manimTexColorMapUnmatchedSelectors: string;
  manimTexColorMapUnmatchedTokenCount: number;
  manimTexColorizedColoredCharacterCount: number;
  manimTexColorizedColoredTokenCount: number;
  manimTexColorizedColoredTokenIds: string;
  manimTexColorizedCoverageRatio: number;
  manimTexColorizedCoverageSummary: string;
  manimTexColorizedFormulaId: string;
  manimTexColorizedIntervalOrderSummary: string;
  manimTexColorizedIntervalSummary: string;
  manimTexColorizedRoleSummary: string;
  manimTexColorizedSourceContract: typeof TEX_COLORIZED_FORMULA_SOURCE_CONTRACT;
  manimTexColorizedSourceCharacterCount: number;
  manimTexColorizedSummary: string;
  manimTexColorizedTokenCount: number;
  manimTexColorizedUncoloredTokenCount: number;
  manimTexColorizedUncoloredTokenIds: string;
  manimTexCacheCacheEntryCount: number;
  manimTexCacheCacheHitEligibleCount: number;
  manimTexCacheCacheKeys: string[];
  manimTexCacheCacheVersion: "mais-manim-tex-cache/v1";
  manimTexCacheEntries: MathTexCacheEntry[];
  manimTexCacheFormulaCount: number;
  manimTexCacheIsolationEntryCount: number;
  manimTexCacheReady: boolean;
  manimTexCacheSceneId: string;
  manimTexCacheSignature: string;
  manimTexCacheSourceContract: typeof TEX_CACHE_MANIFEST_SOURCE_CONTRACT;
  manimTexCacheStaleEntryCount: number;
  manimTexCacheSummary: string;
  manimTexCacheSvgMorphPlanCount: number;
  manimTexCacheTokenCount: number;
  manimTexCompileCacheHitEligibleCount: number;
  manimTexCompileCacheKeyCount: number;
  manimTexCompileCommandCount: number;
  manimTexCompileDocumentCount: number;
  manimTexCompileDocumentSourceLengthRange: string;
  manimTexCompileDocumentTemplateCount: number;
  manimTexCompileDvisvgmCount: number;
  manimTexCompileEngineIds: string[];
  manimTexCompileFormulaCount: number;
  manimTexCompileIntermediateExtensions: string[];
  manimTexCompileRows: MathTexCompilePipelineRow[];
  manimTexCompileSceneId: string;
  manimTexCompileSignature: string;
  manimTexCompileSourceContract: typeof TEX_COMPILE_PIPELINE_SOURCE_CONTRACT;
  manimTexCompileSourceSummary: string;
  manimTexCompileStepSequence: string;
  manimTexCompileSummary: string;
  manimTexCompileSvgOutputCount: number;
  manimTexIsolationCacheKeyCount: number;
  manimTexIsolationFormulaCount: number;
  manimTexIsolationIsolatedTokenCount: number;
  manimTexIsolationOccurrenceSummary: string;
  manimTexIsolationSceneId: string;
  manimTexIsolationSelectorCount: number;
  manimTexIsolationSelectorSummary: string;
  manimTexIsolationSourceContract: string;
  manimTexIsolationSummary: string;
  manimTexIsolationTokenCount: number;
  manimTexIsolationUnmatchedSelectorCount: number;
  manimTexIsolationUnmatchedSelectors: string;
  manimSvgMorphCacheKeyCount: number;
  manimSvgMorphCommandCount: number;
  manimSvgMorphCompatibleCount: number;
  manimSvgMorphCount: number;
  manimSvgMorphFramePathPreview: string;
  manimSvgMorphIds: string;
  manimSvgMorphIssueCount: number;
  manimSvgMorphIssueSummary: string;
  manimSvgMorphProgress: number;
  manimSvgMorphSourceContract: FormulaSvgMorphEvidence["sourceContract"];
  manimSvgMorphSummary: string;
  manimActiveAnimationNodeCount: number;
  manimActiveAnimationNodeProgressSummary: string;
  manimActiveAnimationObjectId: string;
  manimActiveAnimationPlanId: string;
  manimActiveAnimationPlanIds: string;
  manimActiveAnimationProgress: number;
  manimActiveAnimationTargetObjectId: string;
  manimAnimationRuntimeActive: boolean;
  manimAnimationRuntimeActivePlanCount: number;
  manimAnimationRuntimeActivePlanIds: string;
  manimAnimationRuntimeEasedProgressRange: string;
  manimAnimationRuntimeFiniteBoundingBoxCount: number;
  manimAnimationRuntimeLaggedProgressRange: string;
  manimAnimationRuntimeMobjectInterpolatePolicy: typeof MOBJECT_INTERPOLATE_RENDER_POLICY;
  manimAnimationRuntimeNodeCount: number;
  manimAnimationRuntimeObjectId: string;
  manimAnimationRuntimeObjectIds: string;
  manimAnimationRuntimeProgress: number;
  manimAnimationRuntimeRateFunctionIds: string;
  manimAnimationRuntimeRawProgressRange: string;
  manimAnimationRuntimeRenderKindSummary: string;
  manimAnimationRuntimeSourceContract: string;
  manimAnimationRuntimeSummary: string;
  manimAnimationRuntimeTargetObjectId: string;
  manimTransformInterpolateBoundingBoxCount: number;
  manimTransformInterpolateBoundingBoxObjectIds: string;
  manimTransformInterpolateBoundingBoxSummary: string;
  manimTransformInterpolateEmptyBoundingBoxCount: number;
  manimTransformInterpolateFieldArcPathNodeCount: number;
  manimTransformInterpolateFieldBoundingBoxNodeCount: number;
  manimTransformInterpolateFieldNodeCount: number;
  manimTransformInterpolateFieldNonPointCount: number;
  manimTransformInterpolateFieldNonPointPolicy: typeof TRANSFORM_PATH_NON_POINT_FIELD_POLICY;
  manimTransformInterpolateFieldObjectIds: string;
  manimTransformInterpolateFieldPathSummary: string;
  manimTransformInterpolateFieldPointlikeCount: number;
  manimTransformInterpolateFieldPointlikePolicy: typeof TRANSFORM_PATH_POINTLIKE_FIELD_POLICY;
  manimTransformInterpolateFieldPointlikeSummary: string;
  manimTransformInterpolateFieldSourceSummary: typeof MOBJECT_INTERPOLATE_DATA_SOURCE_SUMMARY;
  manimTransformInterpolateFieldStraightPathNodeCount: number;
  manimTransformInterpolateFieldStyleNodeCount: number;
  manimTransformInterpolateFieldSummary: string;
  manimTransformInterpolateFieldUniformNodeCount: number;
  manimTransformInterpolateFiniteBoundingBoxCount: number;
  manimTransformInterpolateUniformClippingPlaneCount: number;
  manimTransformInterpolateUniformCount: number;
  manimTransformInterpolateUniformObjectIds: string;
  manimTransformInterpolateUniformOpacityRange: string;
  manimTransformInterpolateUniformOpacitySampleCount: number;
  manimTransformInterpolateUniformSourceSummary: string;
  manimTransformInterpolateUniformSummary: string;
  manimTransformFamilyAlignmentEnteringCount: number;
  manimTransformFamilyAlignmentEntries: TransformFamilyAlignmentEntry[];
  manimTransformFamilyAlignmentEntryCount: number;
  manimTransformFamilyAlignmentExitingCount: number;
  manimTransformFamilyAlignmentFamilyPairSequence: string;
  manimTransformFamilyAlignmentFamilyZipCompleteCount: number;
  manimTransformFamilyAlignmentFamilyZipIncompleteCount: number;
  manimTransformFamilyAlignmentFamilyZipPolicy: typeof TRANSFORM_FAMILY_ALIGNMENT_ZIP_POLICY;
  manimTransformFamilyAlignmentFamilyZipSequence: string;
  manimTransformFamilyAlignmentFamilyZipTupleCount: number;
  manimTransformFamilyAlignmentMatchedCount: number;
  manimTransformFamilyAlignmentMaxDepth: number;
  manimTransformFamilyAlignmentPointCountPolicy: string;
  manimTransformFamilyAlignmentSourceContract: string;
  manimTransformFamilyAlignmentSourceRootId: string;
  manimTransformFamilyAlignmentSummary: string;
  manimTransformFamilyAlignmentTargetRootId: string;
  manimTransformFamilyAlignmentTypeMismatchCount: number;
  manimTransformPointAlignmentCompatibleCount: number;
  manimTransformPointAlignmentMatchedCount: number;
  manimTransformPointAlignmentPolicySummary: string;
  manimTransformPointAlignmentResampledCount: number;
  manimTransformPointAlignmentRows: TransformPointAlignmentBridgeRow[];
  manimTransformPointAlignmentRowSummary: string;
  manimTransformPointAlignmentSourceContract: typeof TRANSFORM_POINT_ALIGNMENT_BRIDGE_SOURCE_CONTRACT;
  manimTransformPointAlignmentSourceRootId: string;
  manimTransformPointAlignmentSummary: string;
  manimTransformPointAlignmentTargetRootId: string;
  manimTransformPointAlignmentTotalPointCount: number;
  manimTransformPointAlignmentVmobjectAlignedCurveCount: number;
  manimTransformPointAlignmentVmobjectSourceContract: string;
  manimTransformPointAlignmentVmobjectSourceInsertNCurvesCount: number;
  manimTransformPointAlignmentVmobjectTargetInsertNCurvesCount: number;
  manimTransformDataLockAlignmentSummary: string;
  manimTransformDataLockKindSummary: string;
  manimTransformDataLockLockedPointCount: number;
  manimTransformDataLockMovingPointCount: number;
  manimTransformDataLockObjectIds: string;
  manimTransformDataLockPlanCount: number;
  manimTransformDataLockSourceContract: string;
  manimTransformDataLockSummary: string;
  manimTransformDataLockTargetObjectIds: string;
  manimTransformDataLockTotalPointCount: number;
  manimAnimateBuilderChangedFieldCount: number;
  manimAnimateBuilderChangedNodeCount: number;
  manimAnimateBuilderChangedNodeIds: string;
  manimAnimateBuilderFirstPlanId: string;
  manimAnimateBuilderLaggedCount: number;
  manimAnimateBuilderObjectIds: string;
  manimAnimateBuilderOperationCount: number;
  manimAnimateBuilderOperationTypes: string;
  manimAnimateBuilderPathCount: number;
  manimAnimateBuilderPlanCount: number;
  manimAnimateBuilderSourceContract: typeof ANIMATION_BUILDER_SOURCE_CONTRACT;
  manimAnimateBuilderSummary: string;
  manimAnimateBuilderTargetIds: string;
  manimAnimateBuilderTotalDuration: number;
  manimAlwaysUpdaterAlwaysMethodCount: number;
  manimAlwaysUpdaterAlwaysRedrawCount: number;
  manimAlwaysUpdaterCount: number;
  manimAlwaysUpdaterDependencyTrackerCount: number;
  manimAlwaysUpdaterDependencyTrackerIds: string;
  manimAlwaysUpdaterFactoryCount: number;
  manimAlwaysUpdaterMissingTrackerCount: number;
  manimAlwaysUpdaterMissingTrackerIds: string;
  manimAlwaysUpdaterObjectIds: string;
  manimAlwaysUpdaterOperationTypes: string;
  manimAlwaysUpdaterSourceContract: typeof ALWAYS_UPDATER_AUTHORING_SOURCE_CONTRACT;
  manimAlwaysUpdaterSummary: string;
  manimAlwaysUpdaterUpdaterIds: string;
  manimAlwaysMethodBoundingBoxSummary: string;
  manimAlwaysMethodBuffSummary: string;
  manimAlwaysMethodCount: number;
  manimAlwaysMethodDirectionSummary: string;
  manimAlwaysMethodDynamicBuffCount: number;
  manimAlwaysMethodMaxPlacementError: number;
  manimAlwaysMethodMissingObjectCount: number;
  manimAlwaysMethodMissingTargetCount: number;
  manimAlwaysMethodObjectIds: string;
  manimAlwaysMethodOperationTypes: string;
  manimAlwaysMethodPlacedCount: number;
  manimAlwaysMethodPlacementSummary: string;
  manimAlwaysMethodSourceContract: string;
  manimAlwaysMethodSummary: string;
  manimAlwaysMethodTargetObjectIds: string;
  manimAlwaysMethodUpdaterIds: string;
  manimSubAlphaActivePlanCount: number;
  manimSubAlphaCompleteNodeCount: number;
  manimSubAlphaDelayedNodeCount: number;
  manimSubAlphaEasedMax: number;
  manimSubAlphaEasedMin: number;
  manimSubAlphaEasedRange: string;
  manimSubAlphaFamilyZipCoveredNodeCount: number;
  manimSubAlphaFamilyZipMissingNodeCount: number;
  manimSubAlphaFamilyZipPolicy: typeof TRANSFORM_FAMILY_ALIGNMENT_ZIP_POLICY;
  manimSubAlphaFamilyZipSequence: string;
  manimSubAlphaFamilyZipTupleCount: number;
  manimSubAlphaFamilyZipUncoveredObjectIds: string;
  manimSubAlphaLaggedMax: number;
  manimSubAlphaLaggedMin: number;
  manimSubAlphaLaggedRange: string;
  manimSubAlphaLeadingNodeCount: number;
  manimSubAlphaNodeCount: number;
  manimSubAlphaNodeWindowSummary: string;
  manimSubAlphaObjectIds: string;
  manimSubAlphaPartialNodeCount: number;
  manimSubAlphaRateFunctionIds: string;
  manimSubAlphaRawMax: number;
  manimSubAlphaRawMin: number;
  manimSubAlphaRawRange: string;
  manimSubAlphaSourceContract: typeof SUB_ALPHA_SOURCE_CONTRACT;
  manimSubAlphaStaggeredNodeCount: number;
  manimSubAlphaSummary: string;
  manimSubAlphaWindowPolicy: typeof SUB_ALPHA_WINDOW_POLICY;
  manimSubAlphaZeroNodeCount: number;
  manimAnimationCompositionCount: number;
  manimAnimationCompositionDuration: number;
  manimAnimationCompositionActiveId: string;
  manimAnimationCompositionActiveType: string;
  manimAnimationCompositionActiveWindowCount: number;
  manimAnimationCompositionActiveWindowIds: string;
  manimAnimationCompositionCompletedWindowCount: number;
  manimAnimationCompositionCompletedWindowIds: string;
  manimAnimationCompositionFrameElapsedSeconds: number;
  manimAnimationCompositionFrameProgress: number;
  manimAnimationCompositionFrameSummary: string;
  manimAnimationCompositionIssueCount: number;
  manimAnimationCompositionModes: string;
  manimAnimationCompositionPendingWindowCount: number;
  manimAnimationCompositionPendingWindowIds: string;
  manimAnimationCompositionSourceContract: string;
  manimAnimationCompositionTimingPolicy: string;
  manimAnimationCompositionWindowSummary: string;
  manimAnimationCompositionWindowCount: number;
  manimAnimationLifecycleAnimatingStatus: string;
  manimAnimationLifecycleBeginNodeCount: number;
  manimAnimationLifecycleBeginSourcePolicy: typeof ANIMATION_LIFECYCLE_BEGIN_SOURCE_POLICY;
  manimAnimationLifecycleCopiedNodeCount: number;
  manimAnimationLifecycleFamilyTupleCount: number;
  manimAnimationLifecycleFinalAlpha: number;
  manimAnimationLifecycleFinalInterpolateCount: number;
  manimAnimationLifecycleFinishAnimatingStatus: string;
  manimAnimationLifecycleFinishColorRoleCount: number;
  manimAnimationLifecycleFinishNodeCount: number;
  manimAnimationLifecycleInitialAlpha: number;
  manimAnimationLifecycleInitialInterpolateCount: number;
  manimAnimationLifecycleObjectId: string;
  manimAnimationLifecyclePersistentNodeCount: number;
  manimAnimationLifecyclePlanId: string;
  manimAnimationLifecycleSignature: string;
  manimAnimationLifecycleSourceContract: typeof ANIMATION_LIFECYCLE_SOURCE_CONTRACT;
  manimAnimationLifecycleSummary: string;
  manimAnimationLifecycleSuspendedUpdaterCount: number;
  manimAnimationLifecycleTargetId: string;
  manimAnimationLifecycleTimingFrameCount: number;
  manimAnimationLifecycleTimingLagRatio: number;
  manimAnimationLifecycleTimingRateFunction: string;
  manimAnimationLifecycleTimingRunTime: number;
  manimAnimationObjectCount: number;
  manimAnimationOperationCount: number;
  manimAnimationPlanCount: number;
  manimTransformBeginAlignedEntryCount: number;
  manimTransformBeginAlignedPointPairCount: number;
  manimTransformBeginDataLockCount: number;
  manimTransformBeginDataLockAlignmentSummary: string;
  manimTransformBeginDataLockKindSummary: string;
  manimTransformBeginDataLockSummary: string;
  manimTransformBeginEnteringCount: number;
  manimTransformBeginExitingCount: number;
  manimTransformBeginFamilyPairIds: string;
  manimTransformBeginFamilyPairSummary: string;
  manimTransformBeginLockedObjectIds: string;
  manimTransformBeginLockedPointCount: number;
  manimTransformBeginMatchedCount: number;
  manimTransformBeginMaxDepth: number;
  manimTransformBeginMovingObjectIds: string;
  manimTransformBeginMovingPointCount: number;
  manimTransformBeginObjectId: string;
  manimTransformBeginPlanId: string;
  manimTransformBeginSignature: string;
  manimTransformBeginSourceFamilyIds: string;
  manimTransformBeginSourcePolicy: typeof TRANSFORM_BEGIN_SOURCE_POLICY;
  manimTransformBeginSummary: string;
  manimTransformBeginTargetCreated: boolean;
  manimTransformBeginTargetFamilyIds: string;
  manimTransformBeginTargetId: string;
  manimTransformBeginTotalPointCount: number;
  manimTransformBeginTypeMismatchCount: number;
  manimTransformPathArcAngleRange: string;
  manimTransformPathArcAxisSummary: string;
  manimTransformPathArcMidpointDeviationRange: string;
  manimTransformPathArcCount: number;
  manimTransformPathAuthoredCount: number;
  manimTransformPathDegenerateArcCount: number;
  manimTransformPathEntries: TransformPathFunctionCatalogEntry[];
  manimTransformPathMidpointDeviationSummary: string;
  manimTransformPathNonPointFieldPolicy: typeof TRANSFORM_PATH_NON_POINT_FIELD_POLICY;
  manimTransformPathObjectIds: string;
  manimTransformPathPointlikeFieldPolicy: typeof TRANSFORM_PATH_POINTLIKE_FIELD_POLICY;
  manimTransformPathPlanCount: number;
  manimTransformPathSampleAlpha: number;
  manimTransformPathSampledCount: number;
  manimTransformPathSampledMidpoints: string;
  manimTransformPathSourceContract: typeof TRANSFORM_PATH_FUNCTION_SOURCE_CONTRACT;
  manimTransformPathStraightCount: number;
  manimTransformPathSummaries: string;
  manimTransformPathSummary: string;
  manimRateFunctionAlphaPolicy: typeof RATE_FUNCTION_ALPHA_POLICY;
  manimRateFunctionEntries: MathRateFunctionCatalogEntry[];
  manimRateFunctionIds: string;
  manimRateFunctionLinearCount: number;
  manimRateFunctionLinearDuration: number;
  manimRateFunctionSmoothCount: number;
  manimRateFunctionSmoothDuration: number;
  manimRateFunctionSourceContract: typeof RATE_FUNCTION_SOURCE_CONTRACT;
  manimRateFunctionStepCount: number;
  manimRateFunctionStepTypes: string;
  manimRateFunctionSummary: string;
  manimLagRatioAnimationPlanCount: number;
  manimLagRatioAuthoredCount: number;
  manimLagRatioCompositionCount: number;
  manimLagRatioCompositionIds: string;
  manimLagRatioEntries: MathLagRatioCatalogEntry[];
  manimLagRatioMax: number;
  manimLagRatioNonZeroCount: number;
  manimLagRatioObjectIds: string;
  manimLagRatioSourceContract: typeof LAG_RATIO_SOURCE_CONTRACT;
  manimLagRatioSubAlphaPolicy: typeof LAG_RATIO_SUB_ALPHA_POLICY;
  manimLagRatioSummary: string;
  manimLagRatioZeroCount: number;
  manimUpdaterExecutionActiveCallSequence: string;
  manimUpdaterExecutionActiveCount: number;
  manimUpdaterExecutionActiveUpdaterIds: string[];
  manimUpdaterExecutionDependencyCount: number;
  manimUpdaterExecutionDtAwareCount: number;
  manimUpdaterExecutionFamilyPaths: string;
  manimUpdaterExecutionFamilyTraversalObjectIds: string;
  manimUpdaterExecutionFamilyTraversalSummary: string;
  manimUpdaterExecutionIdleObjectIds: string;
  manimUpdaterExecutionMaxDepth: number;
  manimUpdaterExecutionObjectIds: string;
  manimUpdaterExecutionOrderSummary: string;
  manimUpdaterExecutionPhase: string;
  manimUpdaterExecutionRecursiveOrder: "children-first";
  manimUpdaterExecutionRows: MathUpdaterExecutionRow[];
  manimUpdaterExecutionRowCount: number;
  manimUpdaterExecutionSignature: string;
  manimUpdaterExecutionSourceContract: string;
  manimUpdaterExecutionSummary: string;
  manimUpdaterExecutionSuspendedCount: number;
  manimUpdaterExecutionSuspendedUpdaterIds: string[];
  manimUpdaterExecutionTimelineCount: number;
  manimUpdaterExecutionUpdaterCount: number;
  manimUpdaterSignatureCount: number;
  manimUpdaterSignatureCallSignatures: string;
  manimUpdaterSignatureDependencyCount: number;
  manimUpdaterSignatureDependencyIds: string;
  manimUpdaterSignatureDtAwareCount: number;
  manimUpdaterSignatureDtAwareIds: string;
  manimUpdaterSignatureEntries: MathUpdaterSignatureEntry[];
  manimUpdaterSignatureReceivesDeltaSecondsIds: string;
  manimUpdaterSignatureReceivesTimelineProgressIds: string;
  manimUpdaterSignatureSignature: string;
  manimUpdaterSignatureSourceSummary: string;
  manimUpdaterSignatureSummary: string;
  manimUpdaterSignatureTimelineCount: number;
  manimUpdaterSignatureTimelineIds: string;
  manimUpdateFrameAction: MathSceneUpdateFrameAction;
  manimUpdateFrameCallsCameraCapture: boolean;
  manimUpdateFrameCallsIncrementTime: boolean;
  manimUpdateFrameCallsUpdateMobjects: boolean;
  manimUpdateFrameCallsWindowDispatchEvents: boolean;
  manimUpdateFrameDtSeconds: number;
  manimUpdateFrameForceDraw: boolean;
  manimUpdateFrameFramePolicy: typeof SCENE_UPDATE_FRAME_FRAME_POLICY;
  manimUpdateFrameRenderGroupCount: number;
  manimUpdateFrameRenderGroupIds: string;
  manimUpdateFrameSceneTime: number;
  manimUpdateFrameSkipAnimations: boolean;
  manimUpdateFrameSleepSeconds: number;
  manimUpdateFrameSourceContract: typeof SCENE_UPDATE_FRAME_SOURCE_CONTRACT;
  manimUpdateFrameSummary: string;
  manimUpdateFrameUpdateMobjectsDtSeconds: number;
  manimInteractLoopDtSeconds: number;
  manimInteractLoopFinalSceneTimeSeconds: number;
  manimInteractLoopFinalSkipAnimations: boolean;
  manimInteractLoopFrameCount: number;
  manimInteractLoopFrames: MathSceneInteractLoopFrame[];
  manimInteractLoopHasWindow: boolean;
  manimInteractLoopInitialSkipAnimations: boolean;
  manimInteractLoopLogsInteractionTips: boolean;
  manimInteractLoopMaxFrames: number;
  manimInteractLoopSetsSkipAnimationsFalse: boolean;
  manimInteractLoopSourceContract: typeof SCENE_INTERACT_LOOP_SOURCE_CONTRACT;
  manimInteractLoopStatePolicy: typeof SCENE_INTERACT_LOOP_STATE_POLICY;
  manimInteractLoopSummary: string;
  manimInteractLoopTermination: MathSceneInteractLoopTermination;
  manimInteractLoopUpdateFrameActions: string;
  manimInteractLoopUpdateFrameCallCount: number;
  manimSceneRunInteractActivePhase: MathSceneRunLifecyclePlan["activePhase"];
  manimSceneRunInteractCallOrderSummary: string;
  manimSceneRunInteractCallsInteract: boolean;
  manimSceneRunInteractBridgeEnabled: boolean;
  manimSceneRunInteractLoopFrameCount: number;
  manimSceneRunInteractLoopHasWindow: boolean;
  manimSceneRunInteractReadyForTearDown: boolean;
  manimSceneRunInteractSceneId: string;
  manimSceneRunInteractSourceContract: typeof SCENE_RUN_INTERACT_BRIDGE_SOURCE_CONTRACT;
  manimSceneRunInteractStatePolicy: typeof SCENE_INTERACT_LOOP_STATE_POLICY;
  manimSceneRunInteractStatus: MathSceneRunInteractBridgeStatus;
  manimSceneRunInteractSummary: string;
  manimSceneRunInteractTermination: MathSceneInteractLoopTermination;
  manimSceneRunInteractUpdateFrameCallCount: number;
  manimEmitFrameCameraId: string;
  manimEmitFrameCallsFileWriter: boolean;
  manimEmitFrameCalled: boolean;
  manimEmitFrameFrameIndex: number;
  manimEmitFrameProgressDisplayActive: boolean;
  manimEmitFrameReadsRawFbo: boolean;
  manimEmitFrameSkipAnimations: boolean;
  manimEmitFrameSourceContract: typeof SCENE_EMIT_FRAME_SOURCE_CONTRACT;
  manimEmitFrameStatus: MathSceneEmitFrameStatus;
  manimEmitFrameSummary: string;
  manimEmitFrameUpdatesProgressDisplay: boolean;
  manimEmitFrameWritePolicy: typeof SCENE_EMIT_FRAME_WRITE_POLICY;
  manimEmitFrameWritesMovieFrame: boolean;
  manimEmitFrameWriteToMovie: boolean;
  manimProgressThroughAnimationCount: number;
  manimProgressThroughEmitFrameCount: number;
  manimProgressThroughEmitFrameStatuses: string;
  manimProgressThroughFinalAlphaSummary: string;
  manimProgressThroughFinalTime: number;
  manimProgressThroughFps: number;
  manimProgressThroughFrameInterval: number;
  manimProgressThroughFramePolicy: typeof PROGRESS_THROUGH_ANIMATIONS_FRAME_POLICY;
  manimProgressThroughFrameOperationSequence: string;
  manimProgressThroughFrameOrderSummary: string;
  manimProgressThroughFrameCount: number;
  manimProgressThroughFrames: MathSceneProgressFrame[];
  manimProgressThroughInterpolateCount: number;
  manimProgressThroughRawAlphaOvershootAnimationIds: string;
  manimProgressThroughRawAlphaOvershootCount: number;
  manimProgressThroughRawAlphaSequenceSummary: string;
  manimProgressThroughRunTime: number;
  manimProgressThroughSkipAnimations: boolean;
  manimProgressThroughSourceContract: typeof PROGRESS_THROUGH_ANIMATIONS_SOURCE_CONTRACT;
  manimProgressThroughSummary: string;
  manimProgressThroughTimeProgression: MathSceneTimeProgressionPlan;
  manimProgressThroughTimeProgressionSummary: string;
  manimProgressThroughUpdateFrameActionSummary: string;
  manimProgressThroughUpdateFrameCount: number;
  manimProgressThroughUpdateMobjectExclusionPolicy: typeof PROGRESS_THROUGH_ANIMATIONS_UPDATE_MOBJECTS_POLICY;
  manimProgressThroughUpdateMobjectObjectDtSummary: string;
  manimProgressThroughUpdateMobjectObjectCount: number;
  manimProgressThroughUpdateMobjectTargetSummary: string;
  manimProgressThroughUpdateMobjectsCount: number;
  manimProgressThroughUpdateMobjectsDtSummary: string;
  manimProgressThroughWrittenFrameCount: number;
  manimPlayCompilationAnimationCount: number;
  manimPlayCompilationBuilderCount: number;
  manimPlayCompilationCallOrder: string;
  manimPlayCompilationCallOrderReady: boolean;
  manimPlayCompilationErrorMessageSummary: string;
  manimPlayCompilationInvalidCount: number;
  manimPlayCompilationPipeline: string;
  manimPlayCompilationPreparePolicy: string;
  manimPlayCompilationPreparedIds: string;
  manimPlayCompilationProtoCount: number;
  manimPlayCompilationRows: MathScenePlayCompilationRow[];
  manimPlayCompilationRunTime: number;
  manimPlayCompilationSourceContract: string;
  manimPlayCompilationSummary: string;
  manimPlayCompilationUpdateRateCount: number;
  manimPlayCompilationWarningMessage: string;
  manimPlayCompilationWarningEmpty: boolean;
  manimBeginAnimationsAddedCount: number;
  manimBeginAnimationsAddedFamilyIds: string[];
  manimBeginAnimationsAddedIds: string;
  manimBeginAnimationsBeginCount: number;
  manimBeginAnimationsCount: number;
  manimBeginAnimationsLifecycleSummary: string;
  manimBeginAnimationsFinalSceneFamilyIds: string[];
  manimBeginAnimationsFamilyCountAfter: number;
  manimBeginAnimationsFamilyCountBefore: number;
  manimBeginAnimationsInitialSceneFamilyIds: string[];
  manimBeginAnimationsInterpolateZeroCount: number;
  manimBeginAnimationsRows: MathSceneBeginAnimationRow[];
  manimBeginAnimationsRunTime: number;
  manimBeginAnimationsSceneAddCount: number;
  manimBeginAnimationsSetAnimatingStatusCount: number;
  manimBeginAnimationsSourceContract: string;
  manimBeginAnimationsStartStatePolicy: string;
  manimBeginAnimationsStartingCopyCount: number;
  manimBeginAnimationsStartingCopyIds: string;
  manimBeginAnimationsSummary: string;
  manimBeginAnimationsSuspendCount: number;
  manimFinishAnimationsCleanupCount: number;
  manimFinishAnimationsCleanupPolicy: string;
  manimFinishAnimationsCount: number;
  manimFinishAnimationsFinalAlphaSummary: string;
  manimFinishAnimationsFinishCount: number;
  manimFinishAnimationsLifecycleSummary: string;
  manimFinishAnimationsRemovedCount: number;
  manimFinishAnimationsRemovedIds: string;
  manimFinishAnimationsResumeCount?: number;
  manimFinishAnimationsResumeDtSummary?: string;
  manimFinishAnimationsResumeIds?: string;
  manimFinishAnimationsResumePolicy?: string;
  manimFinishAnimationsRows: MathSceneFinishAnimationRow[];
  manimFinishAnimationsRunTime: number;
  manimFinishAnimationsSceneUpdateDt: number;
  manimFinishAnimationsSetAnimatingStatusFalseCount: number;
  manimFinishAnimationsSkipAnimations: boolean;
  manimFinishAnimationsSourceContract: string;
  manimFinishAnimationsSummary: string;
  manimPrePlayBeginAnimationCount: number;
  manimPrePlayConstructorForcedSkip: boolean;
  manimPrePlayEndScenePlay: string;
  manimPrePlayFinalSkipAnimations: boolean;
  manimPrePlayHasWindow: boolean;
  manimPrePlayPresenterHoldCount: number;
  manimPrePlayProcessedPlayCount: number;
  manimPrePlayRows: MathScenePrePlayRow[];
  manimPrePlaySkipGatePolicy: string;
  manimPrePlaySourceContract: string;
  manimPrePlayStartGateCount: number;
  manimPrePlayStopSkippingClockResetCount: number;
  manimPrePlaySummary: string;
  manimPrePlayTruncated: boolean;
  manimPrePlayWindowClockResetCount: number;
  manimPostPlayPreviewEndedAnimationCount: number;
  manimPostPlayPreviewForcedCount: number;
  manimPostPlayPreviewHasWindow: boolean;
  manimPostPlayPreviewNumPlaysReady: boolean;
  manimPostPlayPreviewNumPlaysSequence: string;
  manimPostPlayPreviewPlayCount: number;
  manimPostPlayPreviewPolicy: string;
  manimPostPlayPreviewPreviewWhileSkipping: boolean;
  manimPostPlayPreviewRows: MathScenePostPlayPreviewRow[];
  manimPostPlayPreviewSkipAnimations: boolean;
  manimPostPlayPreviewSourceContract: string;
  manimPostPlayPreviewSummary: string;
  manimPostCellRedrawAction: string;
  manimPostCellRedrawCheckpointKey: string;
  manimPostCellRedrawCommentCount: number;
  manimPostCellRedrawCommentLabelPolicy: typeof SCENE_POST_CELL_COMMENT_LABEL_POLICY;
  manimPostCellRedrawDtSeconds: number;
  manimPostCellRedrawForceDraw: boolean;
  manimPostCellRedrawHasWindow: boolean;
  manimPostCellRedrawLineCount: number;
  manimPostCellRedrawOperationCount: number;
  manimPostCellRedrawPolicy: string;
  manimPostCellRedrawReady: boolean;
  manimPostCellRedrawSkipAnimations: boolean;
  manimPostCellRedrawSourceContract: string;
  manimPostCellRedrawSourceLabel: string;
  manimPostCellRedrawSummary: string;
  manimShortcutCheckpointCount: number;
  manimShortcutCount: number;
  manimShortcutHistoryCount: number;
  manimShortcutIds: string;
  manimShortcutPlaybackCount: number;
  manimShortcutRedrawCount: number;
  manimShortcutReloadReady: boolean;
  manimShortcutSceneGraphCount: number;
  manimShortcutSourceContract: string;
  manimShortcutStateCount: number;
  manimShortcutAuthoringPolicy: string;
  manimShortcutSummary: string;
  manimReloadCheckpointCount: number;
  manimReloadClearsSnippet: boolean;
  manimReloadFrameAfter: number;
  manimReloadHistoryLabel: string;
  manimReloadReady: boolean;
  manimReloadResetPolicy: string;
  manimReloadResetsElapsed: boolean;
  manimReloadResetsFrame: boolean;
  manimReloadSceneId: string;
  manimReloadSelectedFamilyId: string;
  manimReloadSelectedSceneId: string;
  manimReloadSourceContract: string;
  manimReloadSummary: string;
  manimSkippingWindowConstructorForcedSkip: boolean;
  manimSkippingWindowEndAt: string;
  manimSkippingWindowEndScenePlay: string;
  manimSkippingWindowFinalSkipAnimations: boolean;
  manimSkippingWindowGatePolicy: string;
  manimSkippingWindowPlayCount: number;
  manimSkippingWindowRenderedPlayCount: number;
  manimSkippingWindowSkippedPlayCount: number;
  manimSkippingWindowSourceContract: string;
  manimSkippingWindowStartAt: string;
  manimSkippingWindowSummary: string;
  manimSkippingWindowTruncated: boolean;
  manimRunFromBeatCheckpointCount: number;
  manimRunFromBeatCheckpointInvalidatesCount: number;
  manimRunFromBeatCheckpointInvalidatedKeys: string;
  manimRunFromBeatCheckpointInvalidationSummary: string;
  manimRunFromBeatCheckpointKeys: string;
  manimRunFromBeatCheckpointPolicy: typeof SCENE_RUN_FROM_BEAT_CHECKPOINT_POLICY;
  manimRunFromBeatCheckpointRetainedKeysAfterRestore: string;
  manimRunFromBeatCheckpointRestoreAction: string;
  manimRunFromBeatCheckpointRestoreKey: string;
  manimRunFromBeatCheckpointRestoreMode: string;
  manimRunFromBeatCheckpointRestoreReady: boolean;
  manimRunFromBeatCheckpointSummary: string;
  manimRunFromBeatCompositionId: string;
  manimRunFromBeatCompositionReplayPolicy: string;
  manimRunFromBeatCompositionReplayReady: boolean;
  manimRunFromBeatCompositionReplaySummary: string;
  manimRunFromBeatCompositionType: string;
  manimRunFromBeatCompositionWindowCount: number;
  manimRunFromBeatCompositionWindowIds: string;
  manimRunFromBeatCompositionWindowSummary: string;
  manimRunFromBeatElapsedBefore: number;
  manimRunFromBeatFinalElapsed: number;
  manimRunFromBeatNormalizedIndex: number;
  manimRunFromBeatPreparedCount: number;
  manimRunFromBeatPreparedIndices: string;
  manimRunFromBeatReady: boolean;
  manimRunFromBeatReplayCount: number;
  manimRunFromBeatReplayIndices: string;
  manimRunFromBeatReplayPolicy: typeof SCENE_RUN_FROM_BEAT_REPLAY_POLICY;
  manimRunFromBeatRequestedIndex: number;
  manimRunFromBeatSkippedBeforeCount: number;
  manimRunFromBeatSourceContract: typeof SCENE_RUN_FROM_BEAT_SOURCE_CONTRACT;
  manimRunFromBeatSummary: string;
  manimRunFromBeatTotalPlayCount: number;
  manimSkipControlActionSummary: string;
  manimSkipControlFinalOriginalStatus: boolean;
  manimSkipControlFinalSkipAnimations: boolean;
  manimSkipControlFinalTempPreviousStatus: boolean;
  manimSkipControlHasOriginalStatus: boolean;
  manimSkipControlSkippedTransitionCount: number;
  manimSkipControlSourceContract: typeof SCENE_SKIP_CONTROL_SOURCE_CONTRACT;
  manimSkipControlStatePolicy: typeof SCENE_SKIP_CONTROL_STATE_POLICY;
  manimSkipControlStoppedTransitionCount: number;
  manimSkipControlSummary: string;
  manimSkipControlTransitionCount: number;
  manimSkipControlTransitions: MathSceneSkipControlTransition[];
  manimPlaybackActivePlayIndex: number;
  manimPlaybackActiveEventSummary: string;
  manimPlaybackCompletedPlayCount: number;
  manimPlaybackEventCount: number;
  manimPlaybackLifecyclePhase: string;
  manimPlaybackLifecycleSummary: string;
  manimPlaybackPendingPlayCount: number;
  manimPlaybackSourceContract: typeof SCENE_PLAYBACK_SOURCE_CONTRACT;
  manimPlaybackUpdatesDuringActivePlay: boolean;
  manimRandomSeed: number;
  manimRandomSeedAlgorithm: string;
  manimRandomSeedSignature: string;
  manimSceneInitCameraFrameReady: boolean;
  manimSceneInitCameraReady: boolean;
  manimSceneInitFileWriterReady: boolean;
  manimSceneInitNumPlays: number;
  manimSceneInitRandomSeedSignature: string;
  manimSceneInitReady: boolean;
  manimSceneInitRedoCount: number;
  manimSceneInitRenderGroupCount: number;
  manimSceneInitRenderGroupIds: string;
  manimSceneInitSourceContract: typeof SCENE_INITIALIZATION_SOURCE_CONTRACT;
  manimSceneInitSourceSummary: string;
  manimSceneInitSummary: string;
  manimSceneInitTimeSeconds: number;
  manimSceneInitTopLevelMobjectCount: number;
  manimSceneInitUndoCount: number;
  manimCaptureByteCount: number;
  manimCaptureCameraShot: string;
  manimCaptureElapsedSeconds: number;
  manimCaptureFramebufferId: string;
  manimCaptureFramebufferStatus: MathSceneCaptureFramebufferStatus;
  manimCaptureFps: number;
  manimCaptureFrameCount: number;
  manimCaptureHeight: number;
  manimCaptureKind: MathSceneCaptureKind;
  manimCaptureQualityPreset: MathSceneRenderQualityPreset;
  manimCaptureRendererMode: MathSceneRendererMode;
  manimCaptureRequestCount: number;
  manimCaptureDevicePixelRatio: number;
  manimCaptureSamplesPerPixel: number;
  manimCaptureTransparentBackground: boolean;
  manimCaptureBackgroundColor: string;
  manimCaptureBackgroundAlpha: number;
  manimCaptureRenderGroupCount: number;
  manimCaptureRenderGroupIds: string;
  manimCaptureRenderGroupSummary: string;
  manimCaptureRenderPassSummary: string;
  manimCaptureSceneSignature: string;
  manimCaptureSourceContract: typeof SCENE_CAPTURE_SOURCE_CONTRACT;
  manimCaptureStatus: MathSceneCaptureStatus;
  manimCaptureSummary: string;
  manimCaptureTarget: MathSceneCaptureTarget;
  manimCaptureWidth: number;
  manimRenderQualityAlpha: number;
  manimRenderQualityAntialias: boolean;
  manimRenderQualityBackground: string;
  manimRenderQualityCaptureFps: number;
  manimRenderQualityCaptureHeight: number;
  manimRenderQualityCaptureWidth: number;
  manimRenderQualityDevicePixelRatio: number;
  manimRenderQualityHeight: number;
  manimRenderQualityPixelCount: number;
  manimRenderQualityPreset: MathSceneRenderQualityPreset;
  manimRenderQualityRendererMode: MathSceneRendererMode;
  manimRenderQualitySamplesPerPixel: number;
  manimRenderQualitySourceContract: typeof MANIM_RENDER_QUALITY_SOURCE_CONTRACT;
  manimRenderQualitySummary: string;
  manimRenderQualityTransparent: boolean;
  manimRenderQualityWidth: number;
  manimFileWriterArtifactCount: number;
  manimFileWriterArtifactFileSummary: string;
  manimFileWriterArtifactKindSummary: string;
  manimFileWriterArtifactMimeSummary: string;
  manimFileWriterByteCount: number;
  manimFileWriterCaptureBackgroundAlpha: number;
  manimFileWriterCaptureBackgroundColor: string;
  manimFileWriterCaptureDevicePixelRatio: number;
  manimFileWriterCaptureFps: number;
  manimFileWriterCaptureHeight: number;
  manimFileWriterCaptureKind: MathSceneCaptureKind;
  manimFileWriterCaptureQualityPreset: MathSceneRenderQualityPreset;
  manimFileWriterCaptureRendererMode: MathSceneRendererMode;
  manimFileWriterCaptureSamplesPerPixel: number;
  manimFileWriterCaptureStatus: MathSceneCaptureStatus;
  manimFileWriterCaptureTransparentBackground: boolean;
  manimFileWriterCaptureWidth: number;
  manimFileWriterFrameCount: number;
  manimFileWriterJsonArtifactCount: number;
  manimFileWriterMediaArtifactCount: number;
  manimFileWriterOutputSlug: string;
  manimFileWriterReady: boolean;
  manimFileWriterSceneId: string;
  manimFileWriterSignature: string;
  manimFileWriterSourceContract: typeof SCENE_FILE_WRITER_SOURCE_CONTRACT;
  manimFileWriterSummary: string;
  manimFileWriterSegmentActionSummary: string;
  manimFileWriterSegmentCloseCount: number;
  manimFileWriterSegmentCount: number;
  manimFileWriterSegmentRows: MathSceneFileWriterSegmentRow[];
  manimFileWriterSegmentFinalFileSummary: string;
  manimFileWriterSegmentInsertIndex: string;
  manimFileWriterSegmentInsertPath: string;
  manimFileWriterSegmentOpenCount: number;
  manimFileWriterSegmentPartialIndex: number;
  manimFileWriterSegmentPartialIndexPadded: string;
  manimFileWriterSegmentPartialPath: string;
  manimFileWriterSegmentPartialPathReady: boolean;
  manimFileWriterSegmentSkippedCount: number;
  manimFileWriterSegmentSourceContract: typeof SCENE_FILE_WRITER_SEGMENT_SOURCE_CONTRACT;
  manimFileWriterSegmentSubdivideOutput: boolean;
  manimFileWriterSegmentSummary: string;
  manimFileWriterSegmentTempFileCount: number;
  manimFileWriterSegmentTempRecord: boolean;
  manimFileWriterSegmentWriteToMovie: boolean;
  manimPlaybackFileWriterBridgeMismatchCount: number;
  manimPlaybackFileWriterBridgePartialIndexSequence: string;
  manimPlaybackFileWriterBridgePartialPathSummary: string;
  manimPlaybackFileWriterBridgeReady: boolean;
  manimPlaybackFileWriterBridgeRowCount: number;
  manimPlaybackFileWriterBridgeSourceContract: typeof SCENE_PLAYBACK_FILE_WRITER_BRIDGE_SOURCE_CONTRACT;
  manimPlaybackFileWriterBridgeSummary: string;
  manimFileWriterCombineAction: MathSceneFileWriterCombineAction;
  manimFileWriterCombineConcatManifestPath: string;
  manimFileWriterCombineDuplicatePartialCount: number;
  manimFileWriterCombineFinalPath: string;
  manimFileWriterCombineMismatchCount: number;
  manimFileWriterCombineOrdered: boolean;
  manimFileWriterCombinePartialCount: number;
  manimFileWriterCombinePartialIndexSequence: string;
  manimFileWriterCombinePartialPathSummary: string;
  manimFileWriterCombineReady: boolean;
  manimFileWriterCombineSourceContract: typeof SCENE_FILE_WRITER_COMBINE_SOURCE_CONTRACT;
  manimFileWriterCombineSummary: string;
  manimCheckpointFileWriterBridgeCloseInsertPipe: boolean;
  manimCheckpointFileWriterBridgeInsertIndex: string;
  manimCheckpointFileWriterBridgeInsertPath: string;
  manimCheckpointFileWriterBridgeKey: string;
  manimCheckpointFileWriterBridgeOpenInsertPipe: boolean;
  manimCheckpointFileWriterBridgeReady: boolean;
  manimCheckpointFileWriterBridgeRecord: boolean;
  manimCheckpointFileWriterBridgeSceneId: string;
  manimCheckpointFileWriterBridgeSegmentActionSummary: string;
  manimCheckpointFileWriterBridgeSegmentCount: number;
  manimCheckpointFileWriterBridgeSourceContract: typeof SCENE_CHECKPOINT_PASTE_FILE_WRITER_BRIDGE_SOURCE_CONTRACT;
  manimCheckpointFileWriterBridgeSummary: string;
  manimCheckpointFileWriterBridgeTempRecord: boolean;
  manimSceneRunFileWriterFinishCallOrder: string;
  manimSceneRunFileWriterFinishCombineAction: MathSceneFileWriterCombineAction;
  manimSceneRunFileWriterFinishConcatManifestPath: string;
  manimSceneRunFileWriterFinishFinalPath: string;
  manimSceneRunFileWriterFinishPartialCount: number;
  manimSceneRunFileWriterFinishReady: boolean;
  manimSceneRunFileWriterFinishRequired: boolean;
  manimSceneRunFileWriterFinishSceneId: string;
  manimSceneRunFileWriterFinishSourceContract: typeof SCENE_RUN_FILE_WRITER_FINISH_BRIDGE_SOURCE_CONTRACT;
  manimSceneRunFileWriterFinishStatus: MathSceneRunFileWriterFinishStatus;
  manimSceneRunFileWriterFinishSummary: string;
  manimSceneRunFileWriterFinishTearDownActions: string;
  manimSceneRunFileWriterFinishTearDownReady: boolean;
  manimSceneRunActivePhase: MathSceneRunPhase;
  manimSceneRunActivePhaseIndex: number;
  manimSceneRunConstructActionSummary: string;
  manimSceneRunConstructBindingCount: number;
  manimSceneRunConstructComplete: boolean;
  manimSceneRunConstructFormulaCount: number;
  manimSceneRunConstructObjectCount: number;
  manimSceneRunElapsedSeconds: number;
  manimSceneRunInteractEnabled: boolean;
  manimSceneRunNumPlays: number;
  manimSceneRunPhaseCount: number;
  manimSceneRunPhaseStatusSummary: string;
  manimSceneRunPlayDurationSeconds: number;
  manimSceneRunReady: boolean;
  manimSceneRunCallOrderSummary: string;
  manimSceneRunSceneId: string;
  manimSceneRunSceneSignature: string;
  manimSceneRunSetupActionSummary: string;
  manimSceneRunSetupComplete: boolean;
  manimSceneRunSignature: string;
  manimSceneRunSourceContract: typeof SCENE_RUN_LIFECYCLE_SOURCE_CONTRACT;
  manimSceneRunSkippedPhaseCount: number;
  manimSceneRunSkippedPhaseIds: string;
  manimSceneRunSummary: string;
  manimSceneRunTearDownActionSummary: string;
  manimSceneRunTearDownReady: boolean;
  manimSceneRunTotalDuration: number;
  manimSceneSelectorApprovedCount: number;
  manimSceneSelectorCount: number;
  manimSceneSelectorFamilyIds: string;
  manimSceneSelectorSceneIds: string;
  manimSceneSelectorSelectedFamilyId: string;
  manimSceneSelectorSelectedSceneId: string;
  manimSceneSelectorSummary: string;
  manimSceneExportBeatCount: number;
  manimSceneExportFormulaTokenCount: number;
  manimSceneExportObjectCount: number;
  manimSceneExportReady: boolean;
  manimSceneExportSemanticBindingCount: number;
  manimSceneExportSourceContract: typeof SCENE_EXPORT_SOURCE_CONTRACT;
  manimSceneExportSignature: string;
  manimSmokeHookAttributeCount: number;
  manimSmokeHookConvertedSelectorCount: number;
  manimSmokeHookJsonPayloadCount: number;
  manimSmokeHookJsonPayloadSelectors: string[];
  manimSmokeHookReady: boolean;
  manimSmokeHookSceneId: string;
  manimSmokeHookSelectorConversionSummary: string;
  manimSmokeHookSelectorCount: number;
  manimSmokeHookSignature: string;
  manimSmokeHookSourceContract: typeof SCENE_SMOKE_HOOK_SOURCE_CONTRACT;
  manimSmokeHookSummary: string;
  manimCheckpointPasteInvalidatesCount: number;
  manimCheckpointPasteKey: string;
  manimCheckpointPasteLineCount: number;
  manimCheckpointPasteOperationCount: number;
  manimCheckpointPasteElapsedSeconds: number;
  manimCheckpointPasteProgressBar: boolean;
  manimCheckpointPasteInvalidatedKeys: string;
  manimCheckpointPasteRetainedKeysAfterRestore: string;
  manimCheckpointPasteRestoreAction: MathCheckpointPasteRestoreAction;
  manimCheckpointPasteProgressControlActionSummary: string;
  manimCheckpointPasteProgressControlFinalProgress: boolean;
  manimCheckpointPasteProgressControlInitialProgress: boolean;
  manimCheckpointPasteProgressControlPreviousProgress: boolean;
  manimCheckpointPasteProgressControlRequested: boolean;
  manimCheckpointPasteProgressControlRestoredPrevious: boolean;
  manimCheckpointPasteProgressControlSummary: string;
  manimCheckpointPasteProgressControlTransitionCount: number;
  manimCheckpointPasteReady: boolean;
  manimCheckpointPasteRecord: boolean;
  manimCheckpointPasteReplayPolicy: typeof SCENE_CHECKPOINT_PASTE_REPLAY_POLICY;
  manimCheckpointPasteRestoreMode: MathCheckpointPasteRestoreMode;
  manimCheckpointPasteRestoresExisting: boolean;
  manimCheckpointPasteSceneId: string;
  manimCheckpointPasteSkip: boolean;
  manimCheckpointPasteSourceContract: typeof SCENE_CHECKPOINT_PASTE_SOURCE_CONTRACT;
  manimCheckpointPasteSourceLabel: string;
  manimCheckpointPasteSkipControlActionSummary: string;
  manimCheckpointPasteSkipControlFinalOriginalStatus: boolean;
  manimCheckpointPasteSkipControlFinalSkip: boolean;
  manimCheckpointPasteSkipControlFinalTempPrevious: boolean;
  manimCheckpointPasteSkipControlHasOriginalStatus: boolean;
  manimCheckpointPasteSkipControlSkippedTransitionCount: number;
  manimCheckpointPasteSkipControlStoppedTransitionCount: number;
  manimCheckpointPasteSkipControlSummary: string;
  manimCheckpointPasteSkipControlTransitionCount: number;
  manimCheckpointPasteSummary: string;
  manimCheckpointStoreCanRestore: boolean;
  manimCheckpointStoreCount: number;
  manimCheckpointStoreInvalidatedCount: number;
  manimCheckpointStoreInvalidatedKeys: string;
  manimCheckpointStoreInvalidateLater: boolean;
  manimCheckpointStoreKeys: string;
  manimCheckpointStoreLatestKey: string;
  manimCheckpointStoreLatestStateSignature: string;
  manimCheckpointStoreNextOrder: number;
  manimCheckpointStoreRequestedKey: string;
  manimCheckpointStoreRetainedKeysAfterRestore: string;
  manimCheckpointStoreRestoreAction: string;
  manimCheckpointStoreRestoredOrder: string;
  manimCheckpointStoreRestoredStateSignature: string;
  manimCheckpointStoreSourceContract: typeof SCENE_CHECKPOINT_STORE_SOURCE_CONTRACT;
  manimCheckpointStoreStateSignatureSummary: string;
  manimCheckpointStoreSummary: string;
  manimProgressControlActionSummary: string;
  manimProgressControlFinalProgress: boolean;
  manimProgressControlInitialProgress: boolean;
  manimProgressControlPreviousProgress: boolean;
  manimProgressControlRequested: boolean;
  manimProgressControlRestoredPrevious: boolean;
  manimProgressControlSourceContract: typeof SCENE_PROGRESS_CONTROL_SOURCE_CONTRACT;
  manimProgressControlStatePolicy: typeof SCENE_PROGRESS_CONTROL_STATE_POLICY;
  manimProgressControlSummary: string;
  manimProgressControlTransitionCount: number;
  manimProgressControlTransitions: MathSceneProgressControlTransition[];
  manimRenderBatchCount: number;
  manimRenderBatchIds: string;
  manimRenderBatchObjectCount: number;
  manimRenderBatchRows: MathSceneRenderBatch[];
  manimRenderBatchSkippedCount: number;
  manimRenderBatchSkippedIds: string;
  manimRenderBatchSourceContract: string;
  manimRenderBatchSummary: string;
  manimSceneHistoryCanRedo: boolean;
  manimSceneHistoryCanUndo: boolean;
  manimSceneHistoryBranchInvalidatedRedoCount: number;
  manimSceneHistoryBranchInvalidatedRedoLabels: string;
  manimSceneHistoryBranchPolicy: string;
  manimSceneHistoryCurrentLabel: string;
  manimSceneHistoryDroppedUndoCount: number;
  manimSceneHistoryMaxUndoEntries: number;
  manimSceneHistoryRedoCount: number;
  manimSceneHistoryRevision: number;
  manimSceneHistorySourceContract: typeof SCENE_HISTORY_SOURCE_CONTRACT;
  manimSceneHistoryUndoCount: number;
  manimStateSnapshotActiveStep: string;
  manimStateSnapshotAuthoringMode: string;
  manimStateSnapshotCameraMode: string;
  manimStateSnapshotCameraShot: string;
  manimStateSnapshotCheckpointCount: number;
  manimStateSnapshotElapsedSeconds: number;
  manimStateSnapshotFrameIndex: number;
  manimStateSnapshotHistoryDroppedUndoCount: number;
  manimStateSnapshotHistoryMaxUndoEntries: number;
  manimStateSnapshotHistoryRevision: number;
  manimStateSnapshotFamilyRootIds: string;
  manimStateSnapshotObjectIds: string;
  manimStateSnapshotObjectIdentitySummary: string;
  manimStateSnapshotRootIds: string;
  manimStateSnapshotPlaybackState: string;
  manimStateSnapshotReady: boolean;
  manimStateSnapshotSceneId: string;
  manimStateSnapshotSelectedParameterId: string;
  manimStateSnapshotSignature: string;
  manimStateSnapshotSourceContract: typeof SCENE_STATE_SNAPSHOT_SOURCE_CONTRACT;
  manimStateSnapshotSummary: string;
  manimFloorPlane: string;
  manimFloorPlaneError: string;
  manimFloorPlaneEulerAxes: string;
  manimFloorPlaneRaisesError: boolean;
  manimFloorPlaneSourceContract: typeof SCENE_FLOOR_PLANE_SOURCE_CONTRACT;
  manimFloorPlaneSummary: string;
  manimFloorPlaneValid: boolean;
  manimKeyControlAction: MathSceneKeyControlAction;
  manimKeyControlCanRedo: boolean;
  manimKeyControlCanUndo: boolean;
  manimKeyControlDispatchesEvent: boolean;
  manimKeyControlEventType: MathSceneKeyControlEventType;
  manimKeyControlFinalHoldOnWait: boolean;
  manimKeyControlFinalQuitInteraction: boolean;
  manimKeyControlKey: string;
  manimKeyControlPlaysCameraResetAnimation: boolean;
  manimKeyControlPreventsPropagation: boolean;
  manimKeyControlRedoRequested: boolean;
  manimKeyControlReleaseEvent: string;
  manimKeyControlResetKey: string;
  manimKeyControlSourceContract: typeof SCENE_KEY_CONTROL_SOURCE_CONTRACT;
  manimKeyControlSummary: string;
  manimKeyControlUndoRequested: boolean;
  manimPickBuff: number;
  manimPickConceptId: string;
  manimPickDistanceToCenter: number;
  manimPickGroup: string;
  manimPickHit: boolean;
  manimPickObjectId: string;
  manimPickRenderIndex: number;
  manimPickSearchOrderIndex: number;
  manimPickSourceContract: typeof SCENE_PICKING_SOURCE_CONTRACT;
  manimPickSummary: string;
  manimPointerControlButton: number | null;
  manimPointerControlButtons: number | null;
  manimPointerControlDeltaPoint: [number, number, number];
  manimPointerControlDispatchesEvent: boolean;
  manimPointerControlEventType: MathScenePointerEventType;
  manimPointerControlFrameAction: MathScenePointerFrameAction;
  manimPointerControlFrameShift: [number, number, number];
  manimPointerControlModifiers: number | null;
  manimPointerControlMouseDragPointUpdated: boolean;
  manimPointerControlMousePointUpdated: boolean;
  manimPointerControlOffset: [number, number, number];
  manimPointerControlPhiDelta: number;
  manimPointerControlPoint: [number, number, number];
  manimPointerControlPropagationStopped: boolean;
  manimPointerControlScaleAboutPoint: [number, number, number];
  manimPointerControlScaleFactor: number;
  manimPointerControlScrollRelativeOffset: number;
  manimPointerControlSourceContract: typeof SCENE_POINTER_CONTROL_SOURCE_CONTRACT;
  manimPointerControlSummary: string;
  manimPointerControlThetaDelta: number;
  manimPointerControlWindowOk: boolean;
  manimTimelineActiveConceptId: string;
  manimTimelineActiveStepIndex: number;
  manimTimelineActiveStepType: string;
  manimTimelineCameraStepCount: number;
  manimTimelineCompletedStepCount: number;
  manimTimelineElapsedSeconds: number;
  manimTimelineFocusTargetCount: number;
  manimTimelineFocusTargetIds: string;
  manimTimelineFocusTargetPolicy: string;
  manimTimelineFocusTargetPrimaryId: string;
  manimTimelineFocusTargetSummary: string;
  manimTimelinePendingStepCount: number;
  manimTimelineProgress: number;
  manimTimelineReducedMotion: boolean;
  manimTimelineSkipAnimations: boolean;
  manimTimelineSourceContract: string;
  manimTimelineStepCount: number;
  manimTimelineStepTypeSummary: string;
  manimTimelineSummary: string;
  manimTimelineTotalDuration: number;
  manimTimelineWaitStepCount: number;
  manimTimeProgressionDescription: string;
  manimTimeProgressionFinalTime: number;
  manimTimeProgressionFps: number;
  manimTimeProgressionFrameCount: number;
  manimTimeProgressionFrameInterval: number;
  manimTimeProgressionMode: MathSceneTimeProgressionMode;
  manimTimeProgressionNIterations: number;
  manimTimeProgressionOverrideSkip: boolean;
  manimTimeProgressionOvershoot: boolean;
  manimTimeProgressionRunTime: number;
  manimTimeProgressionSamplingPolicy: typeof SCENE_TIME_PROGRESSION_SAMPLING_POLICY;
  manimTimeProgressionSkipAnimations: boolean;
  manimTimeProgressionSourceContract: typeof SCENE_TIME_PROGRESSION_SOURCE_CONTRACT;
  manimTimeProgressionSummary: string;
  manimTimeProgressionTimes: number[];
  manimWaitControlDescription: string;
  manimWaitControlCalledEmitFrameCount: number;
  manimWaitControlCalledUpdateFrameCount: number;
  manimWaitControlEffectiveDuration: number;
  manimWaitControlEmittedFrameCount: number;
  manimWaitControlEmittedTimes: number[];
  manimWaitControlFps: number;
  manimWaitControlFramePolicy: typeof SCENE_WAIT_CONTROL_FRAME_POLICY;
  manimWaitControlFrameInterval: number;
  manimWaitControlFrameOperationSummary: string;
  manimWaitControlIncrementsSceneTime: string;
  manimWaitControlMaxTime: number;
  manimWaitControlMode: MathSceneWaitControlMode;
  manimWaitControlNIterations: number;
  manimWaitControlOverrideSkip: boolean;
  manimWaitControlRunTime: number;
  manimWaitControlSkipAnimations: boolean;
  manimWaitControlSourceContract: typeof SCENE_WAIT_CONTROL_SOURCE_CONTRACT;
  manimWaitControlStopConditionId: string;
  manimWaitControlStopConditionSatisfied: boolean;
  manimWaitControlSummary: string;
  manimWaitControlUpdateMobjectDts: string;
  manimWaitControlUpdateMobjectFrameCount: number;
  manimWaitControlUpdaterFinalValue: number;
  manimWaitControlUpdaterValueSummary: string;
  manimWaitControlUpdaterValues: number[];
  manimWaitControlUpdateMobjectTotalDt: number;
  manimWaitControlUpdatesMobjectsDuringPresenterHold: boolean;
  manimWaitControlUpdatesMobjectsDuringWait: boolean;
  manimWaitControlUpdatesMobjectsWhileSkipping: boolean;
  manimWaitControlUpdatesMobjects: string;
  manimWaitControlUpdaterPolicy: typeof SCENE_WAIT_CONTROL_UPDATER_POLICY;
  manimWaitFrameStepperActiveSteps: string;
  manimWaitFrameStepperCameraShots: string;
  manimWaitFrameStepperFrameStepCount: number;
  manimWaitFrameStepperMismatchCount: number;
  manimWaitFrameStepperSceneIds: string;
  manimWaitFrameStepperSourceContract: typeof SCENE_WAIT_FRAME_STEPPER_BRIDGE_SOURCE_CONTRACT;
  manimWaitFrameStepperSummary: string;
  manimWaitFrameStepperUpdateFrameActions: string;
  manimWaitFrameStepperUpdaterActiveCounts: string;
  manimWaitFrameStepperUpdaterSuspendedCounts: string;
  manimWaitFrameStepperUpdaterValueAfterFrames: string;
  manimWaitFrameStepperWaitFrameCount: number;
  manimWaitFrameStepperWaitUpdatesMobjects: string;
  manimWaitFrameStepperWaitTimes: string;
  manimWaitFrameStepperWriteFrameFlags: string;
  manimPresenterHoldDuration: number;
  manimPresenterHoldFinalHoldOnWait: boolean;
  manimPresenterHoldFrameCount: number;
  manimPresenterHoldIgnore: boolean;
  manimPresenterHoldMode: MathScenePresenterHoldMode;
  manimPresenterHoldNoteLogged: boolean;
  manimPresenterHoldPresenterMode: boolean;
  manimPresenterHoldReleaseEvent: MathScenePresenterHoldPlan["releaseEvent"];
  manimPresenterHoldShouldUseTimelineWait: boolean;
  manimPresenterHoldSkipAnimations: boolean;
  manimPresenterHoldSourceContract: typeof SCENE_PRESENTER_HOLD_SOURCE_CONTRACT;
  manimPresenterHoldSummary: string;
  manimWindowCallsFocus: boolean;
  manimWindowEventType: MathSceneWindowEventType;
  manimWindowHasWindow: boolean;
  manimWindowHeight: number;
  manimWindowNoOp: boolean;
  manimWindowReturnedEarly: boolean;
  manimWindowSourceContract: typeof SCENE_WINDOW_EVENT_SOURCE_CONTRACT;
  manimWindowSummary: string;
  manimWindowWidth: number;
  manimAlwaysUpdateMobjects: boolean;
  manimForceDraw: boolean;
  manimHasUpdaters: boolean;
  manimShouldCaptureFrame: boolean;
  manimShouldUpdateMobjects: boolean;
  manimSkipAnimations: boolean;
  manimUpdatePolicyReason: MathSceneUpdatePolicyReason;
  manimUpdatePolicySourceContract: typeof SCENE_UPDATE_POLICY_SOURCE_CONTRACT;
  manimUpdatePolicySummary: string;
  manimUpdatePolicyUpdaterCount: number;
  manimTransformStepCount: number;
  manimValueTrackerControlCount: number;
  manimValueTrackerCount: number;
  manimValueTrackerHiddenMobjectIds: string;
  manimValueTrackerIds: string;
  manimValueTrackerNormalizedValueSummary: string;
  manimValueTrackerObjectCount: number;
  manimValueTrackerParameterCount: number;
  manimValueTrackerProgressCount: number;
  manimValueTrackerRangeSummary: string;
  manimValueTrackerRows: MathValueTrackerPayloadRow[];
  manimValueTrackerSignature: string;
  manimValueTrackerSourceContract: typeof VALUE_TRACKER_SOURCE_CONTRACT;
  manimValueTrackerSourceSummary: string;
  manimValueTrackerSummary: string;
  manimValueTrackerTimelineCount: number;
  manimValueTrackerUniformKeySummary: string;
  manimValueTrackerUniformPairCount: number;
  manimValueTrackerUniformValueSummary: string;
  manimValueTrackerValueCount: number;
  mathObjectCount: number;
  mobjectFamilyCacheDataDirtyCount: number;
  mobjectFamilyCacheFamilyDirtyCount: number;
  mobjectFamilyCacheRecomputedCount: number;
  mobjectFamilyCacheRecomputedIds: string;
  mobjectFamilyCacheReusable: boolean;
  mobjectFamilyCacheReusedCount: number;
  mobjectFamilyCacheReusedIds: string;
  mobjectFamilyCacheSourceContract: typeof MOBJECT_FAMILY_CACHE_SOURCE_CONTRACT;
  mobjectFamilyCacheStatus: string;
  mobjectFamilyCacheSummary: string;
  mobjectFamilyCycleCount: number;
  mobjectFamilyMaxDepth: number;
  mobjectFamilyMemberCount: number;
  mobjectFamilyOrphanCount: number;
  mobjectFamilyRootCount: number;
  mobjectFamilySourceContract: typeof MOBJECT_FAMILY_SOURCE_CONTRACT;
  mobjectAnimationOwnedInvalidationCount: number;
  mobjectBoundingBoxCount: number;
  mobjectBoundingBoxEmptyCount: number;
  mobjectBoundingBoxFiniteCount: number;
  mobjectBoundingBoxObjectIds: string;
  mobjectBoundingBoxRows: MobjectBoundingBoxRow[];
  mobjectBoundingBoxSignature: string;
  mobjectBoundingBoxSourceContract: typeof MOBJECT_BOUNDING_BOX_SOURCE_CONTRACT;
  mobjectBoundingBoxStaleCount: number;
  mobjectBoundingBoxSummary: string;
  mobjectCopyChildLinkCount: number;
  mobjectCopyCloneIsolationPreserved: boolean;
  mobjectCopyCloneIsolationSummary: string;
  mobjectCopyFamilyCount: number;
  mobjectCopyIdMap: Record<string, string>;
  mobjectCopyParentLinkCount: number;
  mobjectCopyPointCount: number;
  mobjectCopyRenderDataCount: number;
  mobjectCopyRootId: string;
  mobjectCopySharedReferenceCount: number;
  mobjectCopySignature: string;
  mobjectCopySourceContract: typeof MOBJECT_COPY_SOURCE_CONTRACT;
  mobjectCopySourceId: string;
  mobjectCopySummary: string;
  mobjectLayoutBuff: number;
  mobjectLayoutCenteringDelta: string;
  mobjectLayoutDirection: string;
  mobjectLayoutFrameAnchor: string;
  mobjectLayoutFrameBounds: string;
  mobjectLayoutFrameTarget: string;
  mobjectLayoutGroupCenter: string;
  mobjectLayoutGroupSize: string;
  mobjectLayoutKind: MathMobjectLayoutPlan["layoutKind"];
  mobjectLayoutMissingCount: number;
  mobjectLayoutMissingIds: string;
  mobjectLayoutObjectCount: number;
  mobjectLayoutObjectIds: string;
  mobjectLayoutSignature: string;
  mobjectLayoutSourceContract: typeof MOBJECT_LAYOUT_SOURCE_CONTRACT;
  mobjectLayoutSummary: string;
  mobjectLayoutTargetCenters: string;
  mobjectRenderOrderAllIds: string;
  mobjectRenderOrderFixedCount: number;
  mobjectRenderOrderFixedIds: string;
  mobjectRenderOrderForegroundCount: number;
  mobjectRenderOrderForegroundIds: string;
  mobjectRenderOrderRenderedCount: number;
  mobjectRenderOrderSceneIds: string;
  mobjectRenderOrderSignature: string;
  mobjectRenderOrderSummary: string;
  mobjectRenderOrderTopLevelCount: number;
  mobjectRenderOrderTopLevelIds: string;
  mobjectDataArrayFinitePointCount: number;
  mobjectDataArrayObjectIds: string;
  mobjectDataArrayPointCount: number;
  mobjectDataArrayRgbaCount: number;
  mobjectDataArrayRoleCount: number;
  mobjectDataArrayRowCount: number;
  mobjectDataArrayRows: MobjectDataRow[];
  mobjectDataArraySemanticRoles: string;
  mobjectDataArraySignature: string;
  mobjectDataArraySourceContract: typeof MOBJECT_DATA_ARRAY_SOURCE_CONTRACT;
  mobjectDataArraySummary: string;
  mobjectDataChangedCount: number;
  mobjectDirtyStateAnimationOwnedCount: number;
  mobjectDirtyStateBoundingBoxStaleCount: number;
  mobjectDirtyStateCacheStatus: MobjectFamilyCacheStatus;
  mobjectDirtyStateDataChangedCount: number;
  mobjectDirtyStateFamilyCacheReusable: boolean;
  mobjectDirtyStateFamilyChangedCount: number;
  mobjectDirtyStateInvalidatedCount: number;
  mobjectDirtyStateInvalidatedIds: string;
  mobjectDirtyStateMetadataChangedCount: number;
  mobjectDirtyStateRecomputedFamilyCount: number;
  mobjectDirtyStateRecomputedFamilyIds: string[];
  mobjectDirtyStateReusedFamilyCount: number;
  mobjectDirtyStateReusedFamilyIds: string[];
  mobjectDirtyStateRows: MathMobjectDirtyStatePayloadRow[];
  mobjectDirtyStateSignature: string;
  mobjectDirtyStateSourceContract: typeof MOBJECT_INVALIDATION_SOURCE_CONTRACT;
  mobjectDirtyStateSummary: string;
  mobjectDirtyStateTotalObjectCount: number;
  mobjectDirtyStateUnchangedCount: number;
  mobjectDirtyStateUniformsChangedCount: number;
  mobjectDirtyStateUnknownCount: number;
  mobjectDirtyStateUpdaterActiveCount: number;
  mobjectFamilyChangedCount: number;
  mobjectPointGenerationFinitePointCount: number;
  mobjectPointGenerationGeneratedObjectCount: number;
  mobjectPointGenerationGeneratorKindSummary: string;
  mobjectPointGenerationNonFinitePointCount: number;
  mobjectPointGenerationObjectCount: number;
  mobjectPointGenerationPointCount: number;
  mobjectPointGenerationRows: MobjectPointGenerationRow[];
  mobjectPointGenerationSignature: string;
  mobjectPointGenerationSourceContract: typeof MOBJECT_POINT_GENERATION_SOURCE_CONTRACT;
  mobjectPointGenerationSummary: string;
  mobjectPointGenerationZeroPointObjectCount: number;
  mobjectPointGenerationZeroPointObjectIds: string;
  mobjectPointTransformChangedPointCount: number;
  mobjectPointTransformFiniteTransformedPointCount: number;
  mobjectPointTransformMaxDisplacement: number;
  mobjectPointTransformObjectCount: number;
  mobjectPointTransformOperationCount: number;
  mobjectPointTransformOperationIds: string;
  mobjectPointTransformRowCount: number;
  mobjectPointTransformRows: MobjectPointTransformRow[];
  mobjectPointTransformSignature: string;
  mobjectPointTransformSourceContract: typeof MOBJECT_POINT_TRANSFORM_SOURCE_CONTRACT;
  mobjectPointTransformSourcePointCount: number;
  mobjectPointTransformSummary: string;
  mobjectPointTransformTransformableObjectCount: number;
  mobjectPointTransformTransformedPointCount: number;
  mobjectPointCloudEmptyFamilyCount: number;
  mobjectPointCloudFamilyCount: number;
  mobjectPointCloudFamilyIds: string;
  mobjectPointCloudFamilyWithPointsCount: number;
  mobjectPointCloudObjectWithPointsCount: number;
  mobjectPointCloudPointCount: number;
  mobjectPointCloudRows: MobjectPointCloudRow[];
  mobjectPointCloudSignature: string;
  mobjectPointCloudSourceContract: typeof MOBJECT_POINT_CLOUD_SOURCE_CONTRACT;
  mobjectPointCloudSummary: string;
  manimConfigDigestClassSummary: string;
  manimConfigDigestClippingPlaneCount: number;
  manimConfigDigestDefaultedValueCount: number;
  manimConfigDigestExplicitOverrideCount: number;
  manimConfigDigestFixedInFrameCount: number;
  manimConfigDigestObjectCount: number;
  manimConfigDigestOpacityRange: string;
  manimConfigDigestRowSummary: string;
  manimConfigDigestShadeIn3DCount: number;
  manimConfigDigestSignature: string;
  manimConfigDigestSourceContract: typeof MANIM_CONFIG_DIGEST_SOURCE_CONTRACT;
  manimConfigDigestSummary: string;
  manimConfigDigestVmobjectCount: number;
  manimConfigDigestZIndexRange: string;
  mobjectMaxDepth: number;
  mobjectInvalidatedIds: string;
  mobjectInvalidationOwnershipSummary: string;
  mobjectInvalidationReasons: string;
  mobjectInvalidationSummary: string;
  mobjectMetadataChangedCount: number;
  mobjectStatePayloadBecomeAppliedCount: number;
  mobjectStatePayloadBecomeNodeCount: number;
  mobjectStatePayloadBecomePointCount: number;
  mobjectStatePayloadBecomeReadyCount: number;
  mobjectStatePayloadBecomeRenderDataCount: number;
  mobjectStatePayloadFamilyRootCount: number;
  mobjectStatePayloadNodeCount: number;
  mobjectStatePayloadRestorableCount: number;
  mobjectStatePayloadRestoreMismatchCount: number;
  mobjectStatePayloadRestoreNodeCount: number;
  mobjectStatePayloadRestorePointCount: number;
  mobjectStatePayloadRestoreReadyCount: number;
  mobjectStatePayloadRestoreRenderDataCount: number;
  mobjectStatePayloadRestoreSourceSummary: string;
  mobjectStatePayloadRestoreUniformNodeCount: number;
  mobjectStatePayloadRows: MathMobjectStatePayloadRow[];
  mobjectStatePayloadSignature: string;
  mobjectStatePayloadSourceContract: typeof MOBJECT_STATE_SOURCE_CONTRACT;
  mobjectStatePayloadSnapshotCount: number;
  mobjectStatePayloadSummary: string;
  mobjectStatePayloadTargetableCount: number;
  mobjectStatePayloadTargetCount: number;
  mobjectStatePayloadTargetIds: string;
  mobjectStatePayloadTargetNodeCount: number;
  mobjectStatePayloadTargetPointCount: number;
  mobjectStatePayloadTargetRenderDataCount: number;
  mobjectStateRestoreBridgeAfterFamilyIds: string;
  mobjectStateRestoreBridgeAfterObjectIds: string;
  mobjectStateRestoreBridgeBeforeFamilyIds: string;
  mobjectStateRestoreBridgeBeforeObjectIds: string;
  mobjectStateRestoreBridgeCurrentSignature: string;
  mobjectStateRestoreBridgeFamilyPreserved: boolean;
  mobjectStateRestoreBridgeIdentityPreserved: boolean;
  mobjectStateRestoreBridgeObjectId: string;
  mobjectStateRestoreBridgeRestored: boolean;
  mobjectStateRestoreBridgeRestoredSignature: string;
  mobjectStateRestoreBridgeRestoreMismatchCount: number;
  mobjectStateRestoreBridgeSavedFamilyIds: string;
  mobjectStateRestoreBridgeSavedNodeCount: number;
  mobjectStateRestoreBridgeSavedPointCount: number;
  mobjectStateRestoreBridgeSavedSignature: string;
  mobjectStateRestoreBridgeSourceContract: typeof MOBJECT_STATE_RESTORE_BRIDGE_SOURCE_CONTRACT;
  mobjectStateRestoreBridgeSummary: string;
  mobjectMoveToTargetAfterFamilyIds: string;
  mobjectMoveToTargetAfterSignature: string;
  mobjectMoveToTargetAppliedNodeCount: number;
  mobjectMoveToTargetBecomeApplied: boolean;
  mobjectMoveToTargetFamilyPreserved: boolean;
  mobjectMoveToTargetIdentityPreserved: boolean;
  mobjectMoveToTargetObjectId: string;
  mobjectMoveToTargetRenderStateChanged: boolean;
  mobjectMoveToTargetSourceContract: typeof MOBJECT_MOVE_TO_TARGET_BRIDGE_SOURCE_CONTRACT;
  mobjectMoveToTargetSourceFamilyIds: string;
  mobjectMoveToTargetSourceNodeCount: number;
  mobjectMoveToTargetSourceSignature: string;
  mobjectMoveToTargetSummary: string;
  mobjectMoveToTargetTargetFamilyIds: string;
  mobjectMoveToTargetTargetGenerated: boolean;
  mobjectMoveToTargetTargetId: string;
  mobjectMoveToTargetTargetNodeCount: number;
  mobjectMoveToTargetTargetPointCount: number;
  mobjectMoveToTargetTargetSignature: string;
  mobjectUniformsChangedCount: number;
  mobjectOrphanCount: number;
  mobjectStateSnapshotCount: number;
  mobjectTargetableCount: number;
  mobjectAnchorEmptyBoundingBoxCount: number;
  mobjectAnchorFinitePointCount: number;
  mobjectAnchorNameCount: number;
  mobjectAnchorNames: string;
  mobjectAnchorObjectCount: number;
  mobjectAnchorObjectIds: string;
  mobjectAnchorPointCount: number;
  mobjectAnchorSourceContract: string;
  mobjectAnchorSummary: string;
  mobjectClippingPlaneCount: number;
  mobjectFixedInFrameUniformCount: number;
  mobjectMaterialClippingPlaneCount: number;
  mobjectMaterialDepthWriteEnabledCount: number;
  mobjectMaterialObjectCount: number;
  mobjectMaterialObjectIds: string;
  mobjectMaterialOpacityRange: string;
  mobjectMaterialShadeIn3DCount: number;
  mobjectMaterialSourceContract: string;
  mobjectMaterialSummary: string;
  mobjectMaterialTransparentCount: number;
  mobjectShadeIn3DCount: number;
  mobjectTransparentCount: number;
  mobjectUniformCount: number;
  mobjectUniformSummary: string;
  mobjectUnknownInvalidationCount: number;
  mobjectUpdaterActiveInvalidationCount: number;
  objectCount: number;
  odeTrajectoryBoundsSummary: string;
  odeTrajectoryCount: number;
  odeTrajectoryFiniteSampleCount: number;
  odeTrajectoryInitialStateSummary: string;
  odeTrajectoryMethodIds: string;
  odeTrajectoryObjectSourceContract: typeof ODE_TRAJECTORY_OBJECT_BRIDGE_SOURCE_CONTRACT;
  odeTrajectorySampleCount: number;
  odeTrajectorySourceContract: typeof ODE_TRAJECTORY_SOURCE_CONTRACT;
  odeTrajectorySolverContract: string;
  odeTrajectoryStepCountSummary: string;
  odeTrajectoryStepSizeSummary: string;
  odeTrajectoryStoppedCount: number;
  odeTrajectoryStoppedReasonSummary: string;
  odeTrajectorySummary: string;
  odeTrajectorySystemSummary: string;
  odeTrajectoryTailSampleCount: number;
  odeTrajectoryTimeRangeSummary: string;
  manimParameterPanelControlCount: number;
  manimParameterPanelCount: number;
  manimParameterPanelDerivedCount: number;
  manimParameterPanelIds: string;
  manimParameterPanelSelectedId: string;
  manimParameterPanelSummary: string;
  manimParameterPanelTimelineCount: number;
  parameterTrackerCount: number;
  parameterTrackerIds: string;
  parameterTrackerSummary: string;
  parameterTrackerValues: string;
  reducedMotion: boolean;
  sceneFixedInFrameCount: number;
  sceneFixedInFrameIds: string;
  sceneForegroundCount: number;
  sceneForegroundIds: string;
  sceneId: string;
  sceneMembershipActiveIntroducerCount: number;
  sceneMembershipActiveIntroducerIds: string;
  sceneMembershipActiveRemoverCount: number;
  sceneMembershipActiveRemoverIds: string;
  sceneMembershipEventSummary: string;
  sceneMembershipExcludedCount: number;
  sceneMembershipExcludedIds: string;
  sceneMembershipPendingIntroducerCount: number;
  sceneMembershipPendingIntroducerIds: string;
  sceneMembershipRemovedCount: number;
  sceneMembershipRemovedIds: string;
  sceneMembershipSourceContract: typeof SCENE_MEMBERSHIP_SOURCE_CONTRACT;
  sceneMembershipSourceSummary: string;
  sceneRestructureDetachedRootCount: number;
  sceneRestructureDetachedRootIds: string;
  sceneRestructureParentCount: number;
  sceneRestructureParentIds: string;
  sceneRestructureRemovedCount: number;
  sceneRestructureRemovedIds: string;
  sceneRestructureRequestedCount: number;
  sceneRestructureRequestedIds: string;
  sceneRestructureSourceContract: typeof SCENE_RESTRUCTURE_SOURCE_CONTRACT;
  sceneRestructureSummary: string;
  sceneClearMobjectAfterFixedInFrameIds: string;
  sceneClearMobjectAfterForegroundIds: string;
  sceneClearMobjectAfterRenderGroupIds: string;
  sceneClearMobjectAfterSceneIds: string;
  sceneClearMobjectBeforeFixedInFrameIds: string;
  sceneClearMobjectBeforeForegroundIds: string;
  sceneClearMobjectBeforeRenderGroupIds: string;
  sceneClearMobjectBeforeSceneIds: string;
  sceneClearMobjectCleared: boolean;
  sceneClearMobjectClearedObjectCount: number;
  sceneClearMobjectClearedObjectIds: string;
  sceneClearMobjectObjectCatalogCount: number;
  sceneClearMobjectSourceContract: typeof SCENE_CLEAR_MOBJECT_BRIDGE_SOURCE_CONTRACT;
  sceneClearMobjectSummary: string;
  sceneRemoveAllExceptMobjectAfterFixedInFrameIds: string;
  sceneRemoveAllExceptMobjectAfterForegroundIds: string;
  sceneRemoveAllExceptMobjectAfterRenderGroupIds: string;
  sceneRemoveAllExceptMobjectAfterSceneIds: string;
  sceneRemoveAllExceptMobjectBeforeFixedInFrameIds: string;
  sceneRemoveAllExceptMobjectBeforeForegroundIds: string;
  sceneRemoveAllExceptMobjectBeforeRenderGroupIds: string;
  sceneRemoveAllExceptMobjectBeforeSceneIds: string;
  sceneRemoveAllExceptMobjectChanged: boolean;
  sceneRemoveAllExceptMobjectKeptCount: number;
  sceneRemoveAllExceptMobjectKeptIds: string;
  sceneRemoveAllExceptMobjectObjectCatalogCount: number;
  sceneRemoveAllExceptMobjectRemovedCount: number;
  sceneRemoveAllExceptMobjectRemovedIds: string;
  sceneRemoveAllExceptMobjectRequestedKeepIds: string;
  sceneRemoveAllExceptMobjectSourceContract: typeof SCENE_REMOVE_ALL_EXCEPT_MOBJECT_BRIDGE_SOURCE_CONTRACT;
  sceneRemoveAllExceptMobjectSummary: string;
  sceneBringToFrontMobjectAfterFixedInFrameIds: string;
  sceneBringToFrontMobjectAfterForegroundIds: string;
  sceneBringToFrontMobjectAfterRenderGroupIds: string;
  sceneBringToFrontMobjectAfterSceneIds: string;
  sceneBringToFrontMobjectBeforeFixedInFrameIds: string;
  sceneBringToFrontMobjectBeforeForegroundIds: string;
  sceneBringToFrontMobjectBeforeRenderGroupIds: string;
  sceneBringToFrontMobjectBeforeSceneIds: string;
  sceneBringToFrontMobjectGroup: MathSceneRenderGroup;
  sceneBringToFrontMobjectMoved: boolean;
  sceneBringToFrontMobjectNextIndex: number;
  sceneBringToFrontMobjectObjectId: string;
  sceneBringToFrontMobjectPreviousIndex: number;
  sceneBringToFrontMobjectSourceContract: typeof SCENE_BRING_TO_FRONT_MOBJECT_BRIDGE_SOURCE_CONTRACT;
  sceneBringToFrontMobjectSummary: string;
  sceneSendToBackMobjectAfterFixedInFrameIds: string;
  sceneSendToBackMobjectAfterForegroundIds: string;
  sceneSendToBackMobjectAfterRenderGroupIds: string;
  sceneSendToBackMobjectAfterSceneIds: string;
  sceneSendToBackMobjectBeforeFixedInFrameIds: string;
  sceneSendToBackMobjectBeforeForegroundIds: string;
  sceneSendToBackMobjectBeforeRenderGroupIds: string;
  sceneSendToBackMobjectBeforeSceneIds: string;
  sceneSendToBackMobjectGroup: MathSceneRenderGroup;
  sceneSendToBackMobjectMoved: boolean;
  sceneSendToBackMobjectNextIndex: number;
  sceneSendToBackMobjectObjectId: string;
  sceneSendToBackMobjectPreviousIndex: number;
  sceneSendToBackMobjectSourceContract: typeof SCENE_SEND_TO_BACK_MOBJECT_BRIDGE_SOURCE_CONTRACT;
  sceneSendToBackMobjectSummary: string;
  sceneAddMobjectAfterFixedInFrameIds: string;
  sceneAddMobjectAfterForegroundIds: string;
  sceneAddMobjectAfterRenderGroupIds: string;
  sceneAddMobjectAfterSceneIds: string;
  sceneAddMobjectBeforeFixedInFrameIds: string;
  sceneAddMobjectBeforeForegroundIds: string;
  sceneAddMobjectBeforeRenderGroupIds: string;
  sceneAddMobjectBeforeSceneIds: string;
  sceneAddMobjectAdded: boolean;
  sceneAddMobjectGroup: MathSceneRenderGroup;
  sceneAddMobjectObjectId: string;
  sceneAddMobjectRestoredFamilyCount: number;
  sceneAddMobjectRestoredFamilyIds: string;
  sceneAddMobjectSourceContract: typeof SCENE_ADD_MOBJECT_BRIDGE_SOURCE_CONTRACT;
  sceneAddMobjectSummary: string;
  sceneReplaceMobjectAfterRenderGroupIds: string;
  sceneReplaceMobjectBeforeRenderGroupIds: string;
  sceneReplaceMobjectGroup: MathSceneRenderGroup;
  sceneReplaceMobjectObjectId: string;
  sceneReplaceMobjectRemovedFamilyIds: string;
  sceneReplaceMobjectReplaced: boolean;
  sceneReplaceMobjectReplacementCount: number;
  sceneReplaceMobjectReplacementIds: string;
  sceneReplaceMobjectRequestedReplacementIds: string;
  sceneReplaceMobjectRestoredReplacementFamilyIds: string;
  sceneReplaceMobjectSourceContract: typeof SCENE_REPLACE_MOBJECT_BRIDGE_SOURCE_CONTRACT;
  sceneReplaceMobjectSummary: string;
  sceneRemoveMobjectAfterFixedInFrameIds: string;
  sceneRemoveMobjectAfterForegroundIds: string;
  sceneRemoveMobjectAfterRenderGroupIds: string;
  sceneRemoveMobjectAfterSceneIds: string;
  sceneRemoveMobjectBeforeFixedInFrameIds: string;
  sceneRemoveMobjectBeforeForegroundIds: string;
  sceneRemoveMobjectBeforeRenderGroupIds: string;
  sceneRemoveMobjectBeforeSceneIds: string;
  sceneRemoveMobjectDescendantRemovedIds: string;
  sceneRemoveMobjectObjectId: string;
  sceneRemoveMobjectRemoved: boolean;
  sceneRemoveMobjectRemovedFamilyCount: number;
  sceneRemoveMobjectRemovedFamilyIds: string;
  sceneRemoveMobjectSourceContract: typeof SCENE_REMOVE_MOBJECT_BRIDGE_SOURCE_CONTRACT;
  sceneRemoveMobjectSummary: string;
  sceneRenderableCount: number;
  sceneRenderableIds: string;
  sceneRenderGroupCount: number;
  sceneRenderGroupIds: string;
  sceneRenderGroupOverlapCount: number;
  sceneRenderGroupOverlapIds: string;
  sceneTopLevelMobjectCount: number;
  semanticBindingCount: number;
  semanticBindingConceptIds: string;
  semanticBindingSourceContract: typeof FORMULA_BINDING_SOURCE_CONTRACT;
  soundCueAudibleCount: number;
  soundCueCount: number;
  soundCueIncludesSound: boolean;
  soundCueIssueCount: number;
  soundCueRows: MathSceneSoundCueRow[];
  soundCueScheduledIds: string;
  soundCueSkippedCount: number;
  soundCueSourceContract: typeof SCENE_SOUND_CUE_SOURCE_CONTRACT;
  soundCueSummary: string;
  streamLineAnimatedWindowCount: number;
  streamLineCompletedLineCount: number;
  streamLineCount: number;
  streamLineCoordinateModeSummary: string;
  streamLineCycleSecondsSummary: string;
  streamLineFrameFiniteVisibleLengthCount: number;
  streamLineFramePhaseOrder: string;
  streamLineFramePlanSegmentCount: number;
  streamLineFramePlanSourceContract: typeof STREAM_LINE_FRAME_PLAN_SOURCE_CONTRACT;
  streamLineFramePlanVisibleLineCount: number;
  streamLineFrameVisibleLengthRange: string;
  streamLineFrameVisibleLengthSummary: string;
  streamLineFrameWindowRangeSummary: string;
  streamLineIntegrationStepSummary: string;
  streamLineObjectCount: number;
  streamLinePhaseOffsetRange: string;
  streamLinePointCount: number;
  streamLineRevealWindowSummary: string;
  streamLineSeedGridSummary: string;
  streamLineSourceContract: typeof STREAM_LINE_SOURCE_CONTRACT;
  streamLineSetCount: number;
  streamLineStoppedLineCount: number;
  streamLineSummary: string;
  streamLineSystemSummary: string;
  streamLineVisiblePointCount: number;
  streamLineVisibleProgressSummary: string;
  streamLineWrappedWindowCount: number;
  trackerCount: number;
  updaterActiveCount: number;
  updaterCount: number;
  updaterSuspensionPolicy: typeof UPDATER_SUSPENSION_POLICY;
  updaterSuspensionSourceContract: typeof UPDATER_SUSPENSION_SOURCE_CONTRACT;
  updaterSuspendedCount: number;
  vectorFieldArrowCount: number;
  vectorFieldArrowLengthRange: string;
  vectorFieldColorBandSummary: string;
  vectorFieldCoordinateModeSummary: string;
  vectorFieldFiniteArrowLengthCount: number;
  vectorFieldCount: number;
  vectorFieldFiniteVectorCount: number;
  vectorFieldHighBandCount: number;
  vectorFieldLengthEncodingMonotonic: boolean;
  vectorFieldLengthEncodingSummary: string;
  vectorFieldLowBandCount: number;
  vectorFieldMaxMagnitude: number;
  vectorFieldMidBandCount: number;
  vectorFieldSampleCount: number;
  vectorFieldSampleGridSummary: string;
  vectorFieldSourceContract: typeof VECTOR_FIELD_SOURCE_CONTRACT;
  vectorFieldSummary: string;
  vectorFieldSystemSummary: string;
  vectorFieldZeroBandCount: number;
  vectorFieldZeroVectorCount: number;
  runtimeRenderStateFinitePointCount: number;
  runtimeRenderStateKindSummary: string;
  runtimeRenderStateObjectCount: number;
  runtimeRenderStateObjectIds: string;
  runtimeRenderStatePointCount: number;
  runtimeRenderStateSourceContract: string;
  runtimeRenderStateStyledObjectCount: number;
  runtimeRenderStateSummary: string;
  runtimeRenderStateWireframeCurveCount: number;
  runtimeRenderStateZeroPointObjectCount: number;
  vmobjectBezierAnchorCount: number;
  vmobjectBezierCubicSegmentCount: number;
  vmobjectBezierHandleCount: number;
  vmobjectBezierPathCount: number;
  vmobjectBezierSamplePointCount: number;
  vmobjectBezierSegmentCount: number;
  vmobjectBezierSourceContract: typeof VMOBJECT_BEZIER_PATH_SOURCE_CONTRACT;
  vmobjectBezierSummary: string;
  vmobjectPathBuilderAddCubicBezierCurveToCount: number;
  vmobjectPathBuilderAddLineToCount: number;
  vmobjectPathBuilderAnchorPointCount: number;
  vmobjectPathBuilderClosePathCount: number;
  vmobjectPathBuilderClosedPathCount: number;
  vmobjectPathBuilderCommandCount: number;
  vmobjectPathBuilderCubicSegmentCount: number;
  vmobjectPathBuilderHandlePointCount: number;
  vmobjectPathBuilderLineSegmentCount: number;
  vmobjectPathBuilderOperationSummary: string;
  vmobjectPathBuilderPathCount: number;
  vmobjectPathBuilderPathIds: string;
  vmobjectPathBuilderPlans: VMobjectPathConstructionPlan[];
  vmobjectPathBuilderSegmentCount: number;
  vmobjectPathBuilderSetPointsAsCornersCount: number;
  vmobjectPathBuilderSignature: string;
  vmobjectPathBuilderSourceContract: typeof VMOBJECT_PATH_BUILDER_SOURCE_CONTRACT;
  vmobjectPathBuilderStartNewPathCount: number;
  vmobjectPathBuilderSummary: string;
  vmobjectSmoothPathAnchorPointCount: number;
  vmobjectSmoothPathChangeAnchorModeCount: number;
  vmobjectSmoothPathCommandCount: number;
  vmobjectSmoothPathContinuityPassCount: number;
  vmobjectSmoothPathCount: number;
  vmobjectSmoothPathCubicSegmentCount: number;
  vmobjectSmoothPathHandlePointCount: number;
  vmobjectSmoothPathIds: string;
  vmobjectSmoothPathInsertNCurvesCount: number;
  vmobjectSmoothPathMakeSmoothCount: number;
  vmobjectSmoothPathMaxHandleLength: number;
  vmobjectSmoothPathOperationSummary: string;
  vmobjectSmoothPathPlans: VMobjectSmoothPathPlan[];
  vmobjectSmoothPathSetPointsSmoothlyCount: number;
  vmobjectSmoothPathSignature: string;
  vmobjectSmoothPathSmoothingModeSummary: string;
  vmobjectSmoothPathSourceContract: typeof VMOBJECT_SMOOTH_PATH_SOURCE_CONTRACT;
  vmobjectSmoothPathSummary: string;
  vmobjectBaseNormalObjectIds: string;
  vmobjectFillCount: number;
  vmobjectMaxAntiAliasWidth: number;
  vmobjectMaxJointAngleDegrees: number;
  vmobjectMaxStrokeWidth: number;
  vmobjectMinStrokeOpacity: number;
  vmobjectRenderLineColorRoles: string;
  vmobjectRenderLineObjectCount: number;
  vmobjectRenderLineObjectIds: string;
  vmobjectRenderLineOpacityRange: string;
  vmobjectRenderLineSourceContract: string;
  vmobjectRenderLineStrokeWidthRange: string;
  vmobjectRenderLineSummary: string;
  vmobjectRenderLineTransparentCount: number;
  vmobjectRenderFillColorRoles: string;
  vmobjectRenderFillMeshObjectCount: number;
  vmobjectRenderFillMeshObjectIds: string;
  vmobjectRenderFillObjectCount: number;
  vmobjectRenderFillObjectIds: string;
  vmobjectRenderFillOpacityRange: string;
  vmobjectRenderFillSourceContract: string;
  vmobjectRenderFillSummary: string;
  vmobjectRenderFillTransparentCount: number;
  vmobjectRenderFillTriangleCount: number;
  vmobjectRenderFillVertexCount: number;
  vmobjectStrokeZoomScreenSpaceCount: number;
  vmobjectStrokeZoomWorldSpaceCount: number;
  vmobjectStyleCount: number;
  vmobjectStyleObjectIds: string;
  vmobjectStyleSummary: string;
  vmobjectTransparentStrokeCount: number;
};

export type MathScenePickEvidenceInput = Omit<MathScenePickInput, "boundingBoxes" | "renderGroups">;

export type MathSceneInteractionEvidenceInput = {
  floorPlane?: MathSceneFloorPlaneInput;
  keyControl?: MathSceneKeyControlInput;
  pick?: MathScenePickEvidenceInput;
  pointerControl?: MathScenePointerControlInput;
  windowEvent?: MathSceneWindowEventInput;
};

export type MathSceneInteractLoopEvidenceInput = MathSceneInteractLoopInput;

export type MathSceneGraphEvidenceInput = {
  addMobject?: {
    group?: MathSceneRenderGroup;
    objectId: string;
  };
  clearMobjects?: boolean;
  removeAllExceptMobjects?: {
    objectIdsToKeep: string[];
  };
  bringToFrontMobject?: {
    group?: MathSceneRenderGroup;
    objectId: string;
  };
  sendToBackMobject?: {
    group?: MathSceneRenderGroup;
    objectId: string;
  };
  removeMobject?: {
    objectId: string;
  };
  replaceMobject?: {
    group?: MathSceneRenderGroup;
    objectId: string;
    replacementIds: string[];
  };
  restructureObjectIds?: string[];
};

export type MathSceneStateSnapshotEvidenceInput = {
  authoringMode?: string;
  cameraMode?: string;
  checkpointKeys?: string[];
  frameIndex?: number;
  historySummary?: MathSceneHistorySummary;
  playbackState?: string;
  selectedFamilyId?: string;
  selectedParameterId?: string;
  selectedSceneId?: string;
};

export type MathSceneSelectorEvidenceInput = {
  accent: string;
  selectedFamilyId?: string;
  state: ThreeDStateSummary;
};

export type MathSceneCaptureEvidenceInput = {
  byteCount?: number;
  fps?: number;
  height?: number;
  kind?: MathSceneCaptureKind;
  requestCount?: number;
  status?: MathSceneCaptureStatus;
  width?: number;
};

export type MathSceneRenderQualityEvidenceInput = MathSceneRenderQualityInput;

export type MathSceneFileWriterSegmentEvidenceInput = Pick<
  MathSceneFileWriterSegmentPlanInput,
  "existingInsertIndexes" | "movieFileExtension" | "requestTempRecord" | "subdivideOutput" | "writeToMovie"
>;

export type MathSceneSkippingWindowEvidenceInput = Pick<
  MathSceneSkippingWindowInput,
  "endAtAnimationNumber" | "startAtAnimationNumber"
>;

export type MathSceneSkipControlEvidenceInput = {
  actions: readonly MathSceneSkipControlInput["actions"][number][];
  initialOriginalSkippingStatus?: MathSceneSkipControlInput["initialOriginalSkippingStatus"];
};

export type MathCheckpointPasteEvidenceInput = Omit<
  BuildMathCheckpointPastePlanInput,
  "elapsedSeconds" | "sceneId"
> & {
  elapsedSeconds?: number;
};

export type MathSceneCheckpointStoreEvidenceInput = {
  checkpointKeys?: string[];
  invalidateLater?: boolean;
  restoreKey?: string | null;
};

export type MathScenePostCellRedrawEvidenceInput = MathScenePostCellRedrawInput;

export type MathSceneReloadEvidenceInput = MathSceneReloadPlanInput;

export type MathSceneProgressControlEvidenceInput = MathSceneProgressControlInput;

export type MathParameterPanelEvidenceInput = {
  selectedParameterId?: string;
};

export type MathSceneEvidenceInput = {
  captureEvidence?: MathSceneCaptureEvidenceInput;
  checkpointPasteEvidence?: MathCheckpointPasteEvidenceInput;
  checkpointStoreEvidence?: MathSceneCheckpointStoreEvidenceInput;
  emitFrameEvidence?: MathSceneEmitFrameInput;
  fileWriterSegmentEvidence?: MathSceneFileWriterSegmentEvidenceInput;
  formulaLayerViewport?: ProjectionViewport;
  interactLoopEvidence?: MathSceneInteractLoopEvidenceInput;
  interactionEvidence?: MathSceneInteractionEvidenceInput;
  parameterPanelEvidence?: MathParameterPanelEvidenceInput;
  postCellRedrawEvidence?: MathScenePostCellRedrawEvidenceInput;
  previousRuntimeState?: MathSceneRuntimeState;
  progressControlEvidence?: MathSceneProgressControlEvidenceInput;
  reducedMotion: boolean;
  renderQualityEvidence?: MathSceneRenderQualityEvidenceInput;
  reloadEvidence?: MathSceneReloadEvidenceInput;
  runFromBeatEvidence?: Pick<MathSceneRunFromBeatPlanInput, "checkpointKeys" | "checkpointRestoreKey" | "requestedBeatIndex">;
  runtimeState: MathSceneRuntimeState;
  scene: MathSceneSpec;
  sceneGraphEvidence?: MathSceneGraphEvidenceInput;
  sceneSelectorEvidence?: MathSceneSelectorEvidenceInput;
  skipControlEvidence?: MathSceneSkipControlEvidenceInput;
  skippingWindowEvidence?: MathSceneSkippingWindowEvidenceInput;
  stateSnapshotEvidence?: MathSceneStateSnapshotEvidenceInput;
  svgMorphEvidence?: FormulaSvgMorphEvidenceInput;
  suppressWaitFrameStepperBridgeEvidence?: boolean;
  updateFrameEvidence?: MathSceneUpdateFrameInput;
};

function parameterTrackers(runtimeState: MathSceneRuntimeState) {
  return Object.values(runtimeState.trackers.byId).filter((tracker) => tracker.source === "parameter");
}

function parameterTrackerSummary(runtimeState: MathSceneRuntimeState) {
  const summary = parameterTrackers(runtimeState)
    .map((tracker) => `${tracker.id.replace("parameter:", "")}=${tracker.value.toFixed(3)}`)
    .join(";");

  return summary || "none";
}

function sortedParameterTrackers(parameterEntries: ReturnType<typeof parameterTrackers>) {
  return [...parameterEntries].sort((first, second) =>
    first.id.replace("parameter:", "").localeCompare(second.id.replace("parameter:", ""))
  );
}

function parameterTrackerIdList(parameterEntries: ReturnType<typeof parameterTrackers>) {
  return sortedParameterTrackers(parameterEntries).map((tracker) => tracker.id.replace("parameter:", "")).join(",") || "none";
}

function parameterTrackerValueList(parameterEntries: ReturnType<typeof parameterTrackers>) {
  return sortedParameterTrackers(parameterEntries).map((tracker) => tracker.value.toFixed(3)).join(",") || "none";
}

function rangeSummary(range: [number, number]) {
  return `${range[0].toFixed(3)}..${range[1].toFixed(3)}`;
}

function finiteVec3ForEvidence(point: Vec3) {
  return point.every(Number.isFinite);
}

function averageVec3ForEvidence(points: Vec3[]): Vec3 | null {
  const finitePoints = points.filter(finiteVec3ForEvidence);
  if (finitePoints.length === 0) return null;

  const total = finitePoints.reduce<Vec3>(
    (sum, point) => [sum[0] + point[0], sum[1] + point[1], sum[2] + point[2]],
    [0, 0, 0]
  );

  return [total[0] / finitePoints.length, total[1] / finitePoints.length, total[2] / finitePoints.length];
}

function renderStateAnchorForEvidence(renderState: RuntimeRenderState): Vec3 | null {
  if (renderState.kind === "point") return renderState.position;
  if (renderState.kind === "vector") {
    return [
      (renderState.from[0] + renderState.to[0]) / 2,
      (renderState.from[1] + renderState.to[1]) / 2,
      (renderState.from[2] + renderState.to[2]) / 2
    ];
  }
  if (renderState.kind === "polyline") return averageVec3ForEvidence(renderState.points);
  if (renderState.kind === "surface") return averageVec3ForEvidence(renderState.points);

  return null;
}

function transformPathSamplePointForEvidence(renderState: RuntimeRenderState | undefined): Vec3 | undefined {
  if (!renderState) return undefined;
  return renderStateAnchorForEvidence(renderState) ?? pointsForRuntimeRenderState(renderState).find(finiteVec3ForEvidence);
}

function transformPathCatalogPlansForEvidence(
  animationPlans: ReturnType<typeof buildMathSceneAnimatePlans>,
  runtimeState: MathSceneRuntimeState
): TransformPathFunctionCatalogPlanInput[] {
  return animationPlans.map((plan) => {
    const sourceNode = runtimeState.objectGraph.byId[plan.objectId];
    const targetNode = plan.target.nodes[plan.objectId] ?? plan.target.nodes[plan.target.rootId];

    return {
      id: plan.id,
      objectId: plan.objectId,
      path: plan.step.path,
      sampleFrom: transformPathSamplePointForEvidence(sourceNode?.renderState),
      sampleTo: transformPathSamplePointForEvidence(targetNode?.renderState),
      targetObjectId: plan.targetObjectId
    };
  });
}

function vectorFieldAnchorObjectForEvidence(
  runtimeState: MathSceneRuntimeState,
  previousRuntimeState: MathSceneRuntimeState | undefined,
  objectId: string
) {
  if (previousRuntimeState?.sceneId === runtimeState.sceneId) {
    return previousRuntimeState.objectGraph.byId[objectId] ?? runtimeState.objectGraph.byId[objectId];
  }

  return runtimeState.objectGraph.byId[objectId];
}

function moveAlongVectorFieldEvidenceForRuntimeState(
  runtimeState: MathSceneRuntimeState,
  previousRuntimeState: MathSceneRuntimeState | undefined,
  deltaSeconds: number
) {
  return buildMoveAlongVectorFieldEvidence(
    (runtimeState.sourceScene.vectorFieldUpdaters ?? []).map((updater) => {
      const object = vectorFieldAnchorObjectForEvidence(runtimeState, previousRuntimeState, updater.objectId);

      return evaluateMoveAlongVectorFieldUpdater({
        deltaSeconds,
        elapsedSeconds: runtimeState.timeline.elapsedSeconds,
        scene: runtimeState.sourceScene,
        updater,
        worldAnchor: object ? renderStateAnchorForEvidence(object.renderState) : null
      });
    })
  );
}

function defaultSceneHistorySummary(): MathSceneHistorySummary {
  return {
    branchInvalidatedRedoCount: 0,
    branchInvalidatedRedoLabels: "none",
    branchPolicy: SCENE_HISTORY_BRANCH_POLICY,
    canRedo: false,
    canUndo: false,
    currentLabel: "initial",
    droppedUndoCount: 0,
    maxUndoEntries: 50,
    redoCount: 0,
    revision: 0,
    sourceContract: SCENE_HISTORY_SOURCE_CONTRACT,
    undoCount: 0
  };
}

function firstParameterId(parameterEntries: ReturnType<typeof parameterTrackers>) {
  return parameterEntries[0]?.id.replace("parameter:", "") ?? "none";
}

function conceptIdForObjectId(runtimeState: MathSceneRuntimeState, objectId: string | undefined) {
  if (!objectId) return undefined;
  return runtimeState.objectGraph.byId[objectId]?.conceptId ?? objectId;
}

function activeConceptIdForEvidence(runtimeState: MathSceneRuntimeState) {
  const step = runtimeState.timeline.activeStep;
  if (!step) return runtimeState.timeline.activeConceptId;

  if (step.type === "highlight") return step.conceptId;
  if (step.type === "moveAlongPath") return conceptIdForObjectId(runtimeState, step.objectId) ?? runtimeState.timeline.activeConceptId;
  if (
    step.type === "revealCurve" ||
    step.type === "revealSurface" ||
    step.type === "fadeInObject" ||
    step.type === "fadeOutObject" ||
    step.type === "growFromCenter" ||
    step.type === "transformObject"
  ) {
    return conceptIdForObjectId(runtimeState, step.objectId) ?? runtimeState.timeline.activeConceptId;
  }

  return runtimeState.timeline.activeConceptId;
}

function uniqueSortedStrings(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function summarizeEvidenceIds(ids: string[]) {
  return ids.join(",") || "none";
}

function parseEvidenceIds(summary: string) {
  return summary === "none" ? [] : summary.split(",").filter(Boolean);
}

function emptyTexColorizedFormula() {
  return {
    coloredCharacterCount: 0,
    coloredTokenCount: 0,
    coloredTokenIds: [],
    coverageRatio: 0,
    coverageSummary: "coverage:colored=0:source=0:ratio=0.000:order=none",
    formulaId: "none",
    intervalOrderSummary: "none",
    intervalSummary: "none",
    latex: "",
    originalLatex: "",
    roleSummary: "none",
    sourceContract: TEX_COLORIZED_FORMULA_SOURCE_CONTRACT,
    sourceCharacterCount: 0,
    summary: "tex-colorized-formula:none:tokens=0:colored=0:uncolored=0:roles=none",
    tokenCount: 0,
    uncoloredTokenCount: 0,
    uncoloredTokenIds: []
  };
}

function clampEvidenceIndex(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function runFromBeatCompositionWindowSummary(
  windows: ReturnType<typeof buildSceneAnimationCompositionPlans>[number]["windows"]
) {
  return windows.map((window) =>
    `${window.animationPlanId}@${window.startSeconds.toFixed(3)}..${window.endSeconds.toFixed(3)}:0.000`
  ).join("|") || "none";
}

function runFromBeatCompositionReplayForBeat(
  scene: MathSceneSpec,
  compositionPlans: ReturnType<typeof buildSceneAnimationCompositionPlans>,
  requestedBeatIndex: number
) {
  if (scene.timeline.length === 0) return undefined;

  const normalizedBeatIndex = clampEvidenceIndex(Math.round(requestedBeatIndex), 0, scene.timeline.length - 1);
  const step = scene.timeline[normalizedBeatIndex];
  if (step?.type !== "animationComposition") return undefined;

  const plan = compositionPlans.find((entry) => entry.id === step.compositionId);
  if (!plan) return undefined;

  return {
    compositionId: plan.id,
    compositionType: plan.type,
    windowIds: plan.windows.map((window) => window.animationPlanId),
    windowSummary: runFromBeatCompositionWindowSummary(plan.windows)
  };
}

function renderGroupIdsForUpdateFrame(runtimeState: MathSceneRuntimeState) {
  return runtimeState.sceneGraph.summary.renderGroupIds === "none"
    ? []
    : runtimeState.sceneGraph.summary.renderGroupIds.split(",");
}

function formatCameraFrameNumber(value: number) {
  return value.toFixed(3);
}

function roundCameraFrameNumber(value: number, places = 6) {
  const scaleFactor = 10 ** places;
  return Math.round(value * scaleFactor) / scaleFactor;
}

function formatCameraFrameVec3(value: [number, number, number]) {
  return value.map(formatCameraFrameNumber).join(",");
}

function formatCameraFrameNumberArray(value: number[]) {
  return value.map(formatCameraFrameNumber).join(",");
}

function mobjectFamilyIdsForEvidence(familyIndex: ReturnType<typeof buildMobjectFamilyIndex>, objectIds: string[]) {
  return uniqueSortedStrings(objectIds.flatMap((objectId) => familyIndex.byId[objectId]?.familyIds ?? [objectId]));
}

function activeUpdaterObjectIdsForEvidence(runtimeState: MathSceneRuntimeState, activeUpdaterIds: string[]) {
  const activeUpdaterSet = new Set(activeUpdaterIds);
  return uniqueSortedStrings(
    runtimeState.updaters.entries.filter((entry) => activeUpdaterSet.has(entry.id)).map((entry) => entry.objectId)
  );
}

function mobjectFamilyHasUpdaterForEvidence(
  familyIndex: ReturnType<typeof buildMobjectFamilyIndex>,
  runtimeState: MathSceneRuntimeState,
  objectId: string
) {
  const familyIds = new Set(familyIndex.byId[objectId]?.familyIds ?? [objectId]);
  return runtimeState.updaters.entries.some((entry) => familyIds.has(entry.objectId));
}

function transformInterpolateBoundingBoxEvidence(frame: ReturnType<typeof buildMathAnimationRuntimeFrame>) {
  const evidence = buildMathAnimationRuntimeBoundingBoxEvidence(frame);

  return {
    manimTransformInterpolateBoundingBoxCount: evidence.nodeCount,
    manimTransformInterpolateBoundingBoxObjectIds: evidence.objectIds,
    manimTransformInterpolateBoundingBoxSummary: evidence.summary,
    manimTransformInterpolateEmptyBoundingBoxCount: evidence.emptyBoundingBoxCount,
    manimTransformInterpolateFiniteBoundingBoxCount: evidence.finiteBoundingBoxCount
  };
}

function transformInterpolateUniformEvidence(frame: ReturnType<typeof buildMathAnimationRuntimeFrame>) {
  const evidence = buildMathAnimationRuntimeUniformEvidence(frame);

  return {
    manimTransformInterpolateUniformClippingPlaneCount: evidence.clippingPlaneCount,
    manimTransformInterpolateUniformCount: evidence.uniformNodeCount,
    manimTransformInterpolateUniformObjectIds: evidence.objectIds,
    manimTransformInterpolateUniformOpacityRange: evidence.opacityRange,
    manimTransformInterpolateUniformOpacitySampleCount: evidence.opacitySampleCount,
    manimTransformInterpolateUniformSourceSummary: evidence.sourceSummary,
    manimTransformInterpolateUniformSummary: evidence.summary
  };
}

function transformInterpolateFieldEvidence(frame: ReturnType<typeof buildMathAnimationRuntimeFrame>) {
  const evidence = buildMathAnimationRuntimeInterpolateFieldEvidence(frame);

  return {
    manimTransformInterpolateFieldArcPathNodeCount: evidence.arcPathNodeCount,
    manimTransformInterpolateFieldBoundingBoxNodeCount: evidence.boundingBoxNodeCount,
    manimTransformInterpolateFieldNodeCount: evidence.nodeCount,
    manimTransformInterpolateFieldNonPointCount: evidence.nonPointFieldCount,
    manimTransformInterpolateFieldNonPointPolicy: evidence.nonPointFieldPolicy,
    manimTransformInterpolateFieldObjectIds: evidence.objectIds,
    manimTransformInterpolateFieldPathSummary: evidence.pathSummary,
    manimTransformInterpolateFieldPointlikeCount: evidence.pointlikeFieldCount,
    manimTransformInterpolateFieldPointlikePolicy: evidence.pointlikeFieldPolicy,
    manimTransformInterpolateFieldPointlikeSummary: evidence.pointlikeFieldSummary,
    manimTransformInterpolateFieldSourceSummary: evidence.sourceSummary,
    manimTransformInterpolateFieldStraightPathNodeCount: evidence.straightPathNodeCount,
    manimTransformInterpolateFieldStyleNodeCount: evidence.styleNodeCount,
    manimTransformInterpolateFieldSummary: evidence.summary,
    manimTransformInterpolateFieldUniformNodeCount: evidence.uniformNodeCount
  };
}

function emptyTransformFamilyAlignmentPlan(): TransformFamilyAlignmentPlan {
  return {
    entries: [],
    sourceRootId: "none",
    targetRootId: "none"
  };
}

function emptyTransformDataLockEvidence(): TransformDataLockEvidence {
  return summarizeTransformDataLockEvidence([]);
}

function targetGraphForAnimatePlan(
  sourceGraph: MathObjectGraph,
  plan: ReturnType<typeof buildMathSceneAnimatePlans>[number]
): MathObjectGraph {
  const byId = { ...sourceGraph.byId };

  for (const [objectId, targetNode] of Object.entries(plan.target.nodes)) {
    const sourceNode = sourceGraph.byId[objectId];
    if (!sourceNode) continue;

    byId[objectId] = {
      ...sourceNode,
      boundingBox: targetNode.boundingBox,
      childIds: targetNode.childIds,
      colorRole: targetNode.colorRole,
      conceptId: targetNode.conceptId,
      parentId: targetNode.parentId,
      renderState: targetNode.renderState,
      type: targetNode.type,
      uniforms: targetNode.uniforms
    };
  }

  return {
    byId,
    rootIds: sourceGraph.rootIds
  };
}

function transformFamilyAlignmentEvidence(
  runtimeState: MathSceneRuntimeState,
  activePlans: ReturnType<typeof buildMathSceneAnimatePlans>
) {
  const currentPlan = activePlans.at(-1);

  if (!currentPlan) return emptyTransformFamilyAlignmentPlan();

  return buildTransformFamilyAlignment(
    runtimeState.objectGraph,
    currentPlan.objectId,
    targetGraphForAnimatePlan(runtimeState.objectGraph, currentPlan),
    currentPlan.objectId
  );
}

function transformDataLockEvidence(
  runtimeState: MathSceneRuntimeState,
  activePlans: ReturnType<typeof buildMathSceneAnimatePlans>
) {
  const plans = activePlans.flatMap((plan) =>
    plan.target.familyIds.flatMap((objectId) => {
      const source = runtimeState.objectGraph.byId[objectId];
      const target = plan.target.nodes[objectId];
      if (!source || !target) return [];

      return buildRuntimeTransformDataLockPlan({
        objectId,
        sourceRenderState: source.renderState,
        targetObjectId: `${objectId}:target`,
        targetRenderState: target.renderState
      });
    })
  );

  return summarizeTransformDataLockEvidence(plans);
}

function activeAnimationEvidence(scene: MathSceneSpec, runtimeState: MathSceneRuntimeState) {
  const animationPlans = buildMathSceneAnimatePlans(scene, runtimeState);
  const frame = buildMathAnimationRuntimeFrame(runtimeState, animationPlans);
  const summary = summarizeMathAnimationRuntimeFrame(frame);
  const animationRuntimeEvidence = buildMathAnimationRuntimeEvidence(frame);
  const boundingBoxEvidence = transformInterpolateBoundingBoxEvidence(frame);
  const fieldEvidence = transformInterpolateFieldEvidence(frame);
  const uniformEvidence = transformInterpolateUniformEvidence(frame);
  const runtimeEvidenceFields = {
    manimAnimationRuntimeActive: animationRuntimeEvidence.active,
    manimAnimationRuntimeActivePlanCount: animationRuntimeEvidence.activePlanCount,
    manimAnimationRuntimeActivePlanIds: animationRuntimeEvidence.activePlanIds,
    manimAnimationRuntimeEasedProgressRange: animationRuntimeEvidence.easedProgressRange,
    manimAnimationRuntimeFiniteBoundingBoxCount: animationRuntimeEvidence.finiteBoundingBoxCount,
    manimAnimationRuntimeLaggedProgressRange: animationRuntimeEvidence.laggedProgressRange,
    manimAnimationRuntimeMobjectInterpolatePolicy: animationRuntimeEvidence.mobjectInterpolateRenderPolicy,
    manimAnimationRuntimeNodeCount: animationRuntimeEvidence.nodeCount,
    manimAnimationRuntimeObjectId: animationRuntimeEvidence.objectId,
    manimAnimationRuntimeObjectIds: animationRuntimeEvidence.objectIds,
    manimAnimationRuntimeProgress: animationRuntimeEvidence.progress,
    manimAnimationRuntimeRateFunctionIds: animationRuntimeEvidence.rateFunctionIds,
    manimAnimationRuntimeRawProgressRange: animationRuntimeEvidence.rawProgressRange,
    manimAnimationRuntimeRenderKindSummary: animationRuntimeEvidence.renderKindSummary,
    manimAnimationRuntimeSourceContract: animationRuntimeEvidence.sourceContract,
    manimAnimationRuntimeSummary: animationRuntimeEvidence.summary,
    manimAnimationRuntimeTargetObjectId: animationRuntimeEvidence.targetObjectId
  };
  const activePlans = animationPlans.filter((plan) => frame.activePlanIds.includes(plan.id));
  const familyAlignment = summary.active ? transformFamilyAlignmentEvidence(runtimeState, activePlans) : emptyTransformFamilyAlignmentPlan();
  const familyAlignmentAttributes = transformFamilyAlignmentDataAttributes(familyAlignment);
  const pointAlignment = buildTransformPointAlignmentBridgePlan(familyAlignment);
  const pointAlignmentAttributes = transformPointAlignmentBridgeDataAttributes(pointAlignment);
  const pointAlignmentSourceContract =
    (pointAlignmentAttributes[
      "data-viz-manim-transform-point-alignment-source-contract"
    ] as typeof TRANSFORM_POINT_ALIGNMENT_BRIDGE_SOURCE_CONTRACT | undefined) ?? pointAlignment.sourceContract;
  const pointAlignmentFields = {
    manimTransformPointAlignmentCompatibleCount: Number(pointAlignmentAttributes["data-viz-manim-transform-point-alignment-compatible-count"]),
    manimTransformPointAlignmentMatchedCount: Number(pointAlignmentAttributes["data-viz-manim-transform-point-alignment-matched-count"]),
    manimTransformPointAlignmentPolicySummary:
      pointAlignmentAttributes["data-viz-manim-transform-point-alignment-policy-summary"] ?? "none",
    manimTransformPointAlignmentResampledCount: Number(pointAlignmentAttributes["data-viz-manim-transform-point-alignment-resampled-count"]),
    manimTransformPointAlignmentRows: pointAlignment.rows,
    manimTransformPointAlignmentRowSummary:
      pointAlignmentAttributes["data-viz-manim-transform-point-alignment-row-summary"] ?? "none",
    manimTransformPointAlignmentSourceContract: pointAlignmentSourceContract,
    manimTransformPointAlignmentSourceRootId: pointAlignmentAttributes["data-viz-manim-transform-point-alignment-source-root-id"] ?? "none",
    manimTransformPointAlignmentSummary: pointAlignmentAttributes["data-viz-manim-transform-point-alignment-summary"] ?? pointAlignment.summary,
    manimTransformPointAlignmentTargetRootId: pointAlignmentAttributes["data-viz-manim-transform-point-alignment-target-root-id"] ?? "none",
    manimTransformPointAlignmentTotalPointCount: Number(pointAlignmentAttributes["data-viz-manim-transform-point-alignment-total-point-count"]),
    manimTransformPointAlignmentVmobjectAlignedCurveCount:
      Number(pointAlignmentAttributes["data-viz-manim-transform-point-alignment-vmobject-aligned-curve-count"]),
    manimTransformPointAlignmentVmobjectSourceContract:
      pointAlignmentAttributes["data-viz-manim-transform-point-alignment-vmobject-source-contract"] ?? "none",
    manimTransformPointAlignmentVmobjectSourceInsertNCurvesCount:
      Number(pointAlignmentAttributes["data-viz-manim-transform-point-alignment-vmobject-source-insert-n-curves-count"]),
    manimTransformPointAlignmentVmobjectTargetInsertNCurvesCount:
      Number(pointAlignmentAttributes["data-viz-manim-transform-point-alignment-vmobject-target-insert-n-curves-count"])
  };
  const dataLockEvidence = summary.active ? transformDataLockEvidence(runtimeState, activePlans) : emptyTransformDataLockEvidence();
  const planSpec = scene.animationPlans?.find(
    (plan) => plan.objectId === summary.objectId && plan.targetObjectId === summary.targetObjectId
  );

  if (!summary.active) {
    return {
      manimActiveAnimationNodeCount: 0,
      manimActiveAnimationNodeProgressSummary: "none",
      manimActiveAnimationObjectId: "none",
      manimActiveAnimationPlanId: "none",
      manimActiveAnimationPlanIds: "none",
      manimActiveAnimationProgress: 1,
      manimActiveAnimationTargetObjectId: "none",
      ...runtimeEvidenceFields,
      ...boundingBoxEvidence,
      ...fieldEvidence,
      ...uniformEvidence,
      manimTransformFamilyAlignmentEnteringCount: Number(familyAlignmentAttributes["data-viz-manim-transform-family-alignment-entering-count"]),
      manimTransformFamilyAlignmentEntries: familyAlignment.entries,
      manimTransformFamilyAlignmentEntryCount: Number(familyAlignmentAttributes["data-viz-manim-transform-family-alignment-entry-count"]),
      manimTransformFamilyAlignmentExitingCount: Number(familyAlignmentAttributes["data-viz-manim-transform-family-alignment-exiting-count"]),
      manimTransformFamilyAlignmentFamilyPairSequence:
        familyAlignmentAttributes["data-viz-manim-transform-family-alignment-family-pair-sequence"] ?? "none",
      manimTransformFamilyAlignmentFamilyZipCompleteCount:
        Number(familyAlignmentAttributes["data-viz-manim-transform-family-alignment-family-zip-complete-count"]),
      manimTransformFamilyAlignmentFamilyZipIncompleteCount:
        Number(familyAlignmentAttributes["data-viz-manim-transform-family-alignment-family-zip-incomplete-count"]),
      manimTransformFamilyAlignmentFamilyZipPolicy:
        familyAlignmentAttributes["data-viz-manim-transform-family-alignment-family-zip-policy"] as typeof TRANSFORM_FAMILY_ALIGNMENT_ZIP_POLICY,
      manimTransformFamilyAlignmentFamilyZipSequence:
        familyAlignmentAttributes["data-viz-manim-transform-family-alignment-family-zip-sequence"] ?? "none",
      manimTransformFamilyAlignmentFamilyZipTupleCount:
        Number(familyAlignmentAttributes["data-viz-manim-transform-family-alignment-family-zip-tuple-count"]),
      manimTransformFamilyAlignmentMatchedCount: Number(familyAlignmentAttributes["data-viz-manim-transform-family-alignment-matched-count"]),
      manimTransformFamilyAlignmentMaxDepth: Number(familyAlignmentAttributes["data-viz-manim-transform-family-alignment-max-depth"]),
      manimTransformFamilyAlignmentPointCountPolicy:
        familyAlignmentAttributes["data-viz-manim-transform-family-alignment-point-count-policy"] ??
        TRANSFORM_FAMILY_ALIGNMENT_POINT_COUNT_POLICY,
      manimTransformFamilyAlignmentSourceContract:
        familyAlignmentAttributes["data-viz-manim-transform-family-alignment-source-contract"] ??
        TRANSFORM_FAMILY_ALIGNMENT_SOURCE_CONTRACT,
      manimTransformFamilyAlignmentSourceRootId: familyAlignmentAttributes["data-viz-manim-transform-family-alignment-source-root-id"],
      manimTransformFamilyAlignmentSummary: familyAlignmentAttributes["data-viz-manim-transform-family-alignment-summary"],
      manimTransformFamilyAlignmentTargetRootId: familyAlignmentAttributes["data-viz-manim-transform-family-alignment-target-root-id"],
      manimTransformFamilyAlignmentTypeMismatchCount: Number(familyAlignmentAttributes["data-viz-manim-transform-family-alignment-type-mismatch-count"]),
      ...pointAlignmentFields,
      manimTransformDataLockAlignmentSummary: dataLockEvidence.alignmentSummary,
      manimTransformDataLockKindSummary: dataLockEvidence.kindSummary,
      manimTransformDataLockLockedPointCount: dataLockEvidence.lockedPointCount,
      manimTransformDataLockMovingPointCount: dataLockEvidence.movingPointCount,
      manimTransformDataLockObjectIds: dataLockEvidence.objectIds,
      manimTransformDataLockPlanCount: dataLockEvidence.planCount,
      manimTransformDataLockSourceContract: dataLockEvidence.sourceContract,
      manimTransformDataLockSummary: dataLockEvidence.summary,
      manimTransformDataLockTargetObjectIds: dataLockEvidence.targetObjectIds,
      manimTransformDataLockTotalPointCount: dataLockEvidence.totalPointCount
    };
  }

  return {
    manimActiveAnimationNodeCount: summary.animatedNodeCount,
    manimActiveAnimationNodeProgressSummary: summary.nodeProgressSummary,
    manimActiveAnimationObjectId: summary.objectId ?? "none",
    manimActiveAnimationPlanId: planSpec?.id ?? "unmatched",
    manimActiveAnimationPlanIds: summary.activePlanIds.join(",") || "none",
    manimActiveAnimationProgress: summary.progress,
    manimActiveAnimationTargetObjectId: summary.targetObjectId ?? "none",
    ...runtimeEvidenceFields,
    ...boundingBoxEvidence,
    ...fieldEvidence,
    ...uniformEvidence,
    manimTransformFamilyAlignmentEnteringCount: Number(familyAlignmentAttributes["data-viz-manim-transform-family-alignment-entering-count"]),
    manimTransformFamilyAlignmentEntries: familyAlignment.entries,
    manimTransformFamilyAlignmentEntryCount: Number(familyAlignmentAttributes["data-viz-manim-transform-family-alignment-entry-count"]),
    manimTransformFamilyAlignmentExitingCount: Number(familyAlignmentAttributes["data-viz-manim-transform-family-alignment-exiting-count"]),
    manimTransformFamilyAlignmentFamilyPairSequence:
      familyAlignmentAttributes["data-viz-manim-transform-family-alignment-family-pair-sequence"] ?? "none",
    manimTransformFamilyAlignmentFamilyZipCompleteCount:
      Number(familyAlignmentAttributes["data-viz-manim-transform-family-alignment-family-zip-complete-count"]),
    manimTransformFamilyAlignmentFamilyZipIncompleteCount:
      Number(familyAlignmentAttributes["data-viz-manim-transform-family-alignment-family-zip-incomplete-count"]),
    manimTransformFamilyAlignmentFamilyZipPolicy:
      familyAlignmentAttributes["data-viz-manim-transform-family-alignment-family-zip-policy"] as typeof TRANSFORM_FAMILY_ALIGNMENT_ZIP_POLICY,
    manimTransformFamilyAlignmentFamilyZipSequence:
      familyAlignmentAttributes["data-viz-manim-transform-family-alignment-family-zip-sequence"] ?? "none",
    manimTransformFamilyAlignmentFamilyZipTupleCount:
      Number(familyAlignmentAttributes["data-viz-manim-transform-family-alignment-family-zip-tuple-count"]),
    manimTransformFamilyAlignmentMatchedCount: Number(familyAlignmentAttributes["data-viz-manim-transform-family-alignment-matched-count"]),
    manimTransformFamilyAlignmentMaxDepth: Number(familyAlignmentAttributes["data-viz-manim-transform-family-alignment-max-depth"]),
    manimTransformFamilyAlignmentPointCountPolicy:
      familyAlignmentAttributes["data-viz-manim-transform-family-alignment-point-count-policy"] ??
      TRANSFORM_FAMILY_ALIGNMENT_POINT_COUNT_POLICY,
    manimTransformFamilyAlignmentSourceContract:
      familyAlignmentAttributes["data-viz-manim-transform-family-alignment-source-contract"] ??
      TRANSFORM_FAMILY_ALIGNMENT_SOURCE_CONTRACT,
    manimTransformFamilyAlignmentSourceRootId: familyAlignmentAttributes["data-viz-manim-transform-family-alignment-source-root-id"],
    manimTransformFamilyAlignmentSummary: familyAlignmentAttributes["data-viz-manim-transform-family-alignment-summary"],
    manimTransformFamilyAlignmentTargetRootId: familyAlignmentAttributes["data-viz-manim-transform-family-alignment-target-root-id"],
    manimTransformFamilyAlignmentTypeMismatchCount: Number(familyAlignmentAttributes["data-viz-manim-transform-family-alignment-type-mismatch-count"]),
    ...pointAlignmentFields,
    manimTransformDataLockAlignmentSummary: dataLockEvidence.alignmentSummary,
    manimTransformDataLockKindSummary: dataLockEvidence.kindSummary,
    manimTransformDataLockLockedPointCount: dataLockEvidence.lockedPointCount,
    manimTransformDataLockMovingPointCount: dataLockEvidence.movingPointCount,
    manimTransformDataLockObjectIds: dataLockEvidence.objectIds,
    manimTransformDataLockPlanCount: dataLockEvidence.planCount,
    manimTransformDataLockSourceContract: dataLockEvidence.sourceContract,
    manimTransformDataLockSummary: dataLockEvidence.summary,
    manimTransformDataLockTargetObjectIds: dataLockEvidence.targetObjectIds,
    manimTransformDataLockTotalPointCount: dataLockEvidence.totalPointCount
  };
}

export function buildMathSceneEvidenceSnapshot({
  captureEvidence,
  checkpointPasteEvidence,
  checkpointStoreEvidence,
  emitFrameEvidence,
  fileWriterSegmentEvidence,
  formulaLayerViewport = { height: 450, width: 800 },
  interactLoopEvidence,
  interactionEvidence,
  parameterPanelEvidence,
  postCellRedrawEvidence,
  previousRuntimeState,
  progressControlEvidence,
  reducedMotion,
  renderQualityEvidence,
  reloadEvidence,
  runFromBeatEvidence,
  runtimeState,
  scene,
  sceneGraphEvidence,
  sceneSelectorEvidence,
  skipControlEvidence,
  skippingWindowEvidence,
  stateSnapshotEvidence,
  svgMorphEvidence,
  suppressWaitFrameStepperBridgeEvidence,
  updateFrameEvidence
}: MathSceneEvidenceInput): MathSceneEvidenceSnapshot {
  const bindingAnchorSummary = summarizeFormulaBindingAnchors(scene);
  const bindingSummary = summarizeFormulaBindings(scene);
  const activeEvidenceConceptId = activeConceptIdForEvidence(runtimeState);
  const timelineFocusTargetIdList = timelineFocusTargetIds(runtimeState.timeline.activeStep);
  const formulaLayerActiveIds = uniqueSortedStrings([
    activeEvidenceConceptId,
    runtimeState.timeline.activeConceptId,
    ...timelineFocusTargetIdList
  ].filter((id) => id !== "" && id !== "none"));
  const formulaLayer = buildFormulaLayerState(scene, {
    activeConceptId: activeEvidenceConceptId,
    activeConceptIds: formulaLayerActiveIds
  });
  const formulaLayerProjectedLabelTextSummary = summarizeActiveProjectedLabelText(formulaLayer);
  const projectedLabelTextByObjectId = buildActiveProjectedLabelTextByObjectId(formulaLayer);
  const projectedLabelAnchors = buildProjectedLabelAnchorsFromRuntimeState(runtimeState, formulaLayerViewport, {
    anchorForObject: (node) => formulaLayer.activeObjectAnchorNames[node.id] ?? "center",
    objectIds: formulaLayer.activeObjectIds,
    textForObject: (node) => projectedLabelTextByObjectId[node.id] ?? node.id
  });
  const projectedLabelSummary = summarizeProjectedLabelAnchors(projectedLabelAnchors);
  const formulaCollisionDiagnostics = buildFormulaOverlayCollisionDiagnostics({
    formulaId: scene.formulas[0]?.id ?? "none",
    projectedLabels: projectedLabelAnchors,
    tokenCount: bindingSummary.tokenCount,
    viewport: formulaLayerViewport
  });
  const texColorMap = buildTexColorMap(scene);
  const texColorizedFormula = formulaLayer.formulas[0]
    ? buildTexColorizedFormula(formulaLayer.formulas[0])
    : emptyTexColorizedFormula();
  const texCacheManifest = buildMathTexCacheManifest(scene);
  const texCompilePipeline = buildMathTexCompilePipeline(scene);
  const texIsolationEvidence = buildTexIsolationEvidence(scene);
  const formulaSvgMorphEvidence = buildFormulaSvgMorphEvidence(scene, {
    morphs: svgMorphEvidence?.morphs ?? [],
    progress: svgMorphEvidence?.progress ?? runtimeState.timeline.easedLocalProgress
  });
  const familyIndex = buildMobjectFamilyIndex(runtimeState.objectGraph);
  const previousFamilyIndex = previousRuntimeState ? buildMobjectFamilyIndex(previousRuntimeState.objectGraph) : undefined;
  const familyCachePlan = buildMobjectFamilyCachePlan({
    nextGraph: runtimeState.objectGraph,
    previousGraph: previousRuntimeState?.objectGraph,
    previousIndex: previousFamilyIndex
  });
  const familySummary = summarizeMobjectFamilies(familyIndex);
  const mobjectBoundingBoxTable = buildMobjectBoundingBoxTable(runtimeState.objectGraph);
  const mobjectDataTable = buildMobjectDataTable(runtimeState.objectGraph);
  const mobjectPointGenerationTable = buildMobjectPointGenerationTable(runtimeState.objectGraph);
  const mobjectPointTransformEvidence = buildMobjectPointTransformEvidence(runtimeState.objectGraph);
  const mobjectPointCloudTable = buildMobjectPointCloudTable(runtimeState.objectGraph);
  const manimConfigDigest = buildManimConfigDigest(scene);
  const mobjectCopyPlan = buildMobjectCopyPlan(runtimeState.objectGraph);
  const mobjectLayoutPlan = buildMobjectArrangeLayoutPlan(runtimeState.objectGraph, runtimeState.sceneGraph.topLevelIds, {
    buff: 0.25,
    center: true,
    direction: [1, 0, 0]
  });
  const mobjectLayoutAttributes = mobjectLayoutDataAttributes(mobjectLayoutPlan);
  const mobjectRenderOrderPlan = buildMobjectRenderOrderPlan(runtimeState.sceneGraph, familyIndex);
  const mobjectRenderOrderAttributes = mobjectRenderOrderDataAttributes(mobjectRenderOrderPlan);
  const mobjectStatePayload = buildMobjectStatePayload(runtimeState.objectGraph);
  const mobjectStateRestoreBridgePlan = buildMobjectStateRestoreBridgePlan({
    graph: runtimeState.objectGraph
  });
  const mobjectMoveToTargetBridgePlan = buildMobjectMoveToTargetBridgePlan({
    graph: runtimeState.objectGraph
  });
  const mobjectDirtyStatePayload = buildMobjectDirtyStatePayload({
    previousRuntimeState,
    runtimeState,
    scene
  });
  const sceneRenderBatchPlan = buildSceneRenderBatches({
    objectGraph: runtimeState.objectGraph,
    renderGroups: runtimeState.sceneGraph.renderGroups
  });
  const stateSummary = summarizeMobjectStateReadiness(runtimeState.objectGraph);
  const mobjectAnchorEvidence = buildMobjectAnchorEvidence(runtimeState.objectGraph);
  const uniformSummary = summarizeMobjectUniforms(runtimeState.objectGraph);
  const materialUniformEvidence = buildMobjectMaterialUniformEvidence(runtimeState.objectGraph);
  const vmobjectLineRenderEvidence = buildVMobjectLineRenderEvidence(runtimeState.objectGraph);
  const vmobjectSurfaceFillRenderEvidence = buildVMobjectSurfaceFillRenderEvidence(runtimeState.objectGraph);
  const runtimeRenderStateEvidence = buildRuntimeRenderStateEvidence(runtimeState.objectGraph);
  const timelineEvidence = buildTimelineEvidence({
    reducedMotion,
    skipAnimations: runtimeState.updatePolicy.skipAnimations,
    timeline: scene.timeline,
    timelineState: runtimeState.timeline
  });
  const vmobjectBezierSummary = summarizeVMobjectBezierPaths(buildVMobjectBezierPathsFromObjectGraph(runtimeState.objectGraph));
  const vmobjectPathBuilderPlans = buildVMobjectPathConstructionPlansFromObjectGraph(runtimeState.objectGraph);
  const vmobjectPathBuilderEvidence = buildVMobjectPathConstructionEvidence(vmobjectPathBuilderPlans);
  const vmobjectSmoothPathPlans = buildVMobjectSmoothPathPlansFromObjectGraph(runtimeState.objectGraph);
  const vmobjectSmoothPathEvidence = buildVMobjectSmoothPathEvidence(vmobjectSmoothPathPlans);
  const vmobjectStyleSummary = summarizeVMobjectStyleEvidence(runtimeState.objectGraph);
  const odeTrajectorySummary = buildOdeTrajectoryEvidenceForScene(scene);
  const vectorFieldSummary = buildVectorFieldEvidenceForScene(scene);
  const soundCuePlan = buildSceneSoundCuePlan({
    cues: scene.soundCues ?? [],
    skipAnimations: runtimeState.updatePolicy.skipAnimations
  });
  const streamLineSummary = buildStreamLineEvidenceForScene(scene, {
    elapsedSeconds: runtimeState.timeline.elapsedSeconds
  });
  const invalidationPlan = buildMobjectInvalidationPlan(
    previousRuntimeState?.objectGraph ?? runtimeState.objectGraph,
    runtimeState.objectGraph
  );
  const updaterSuspension = buildUpdaterSuspensionPlan({
    familyIndex,
    scene,
    timeline: runtimeState.timeline,
    updaters: runtimeState.updaters
  });
  const invalidationOwnership = classifyMobjectInvalidationOwnership(invalidationPlan, {
    activeUpdaterObjectIds: activeUpdaterObjectIdsForEvidence(runtimeState, updaterSuspension.activeUpdaterIds),
    animationOwnedObjectIds: mobjectFamilyIdsForEvidence(familyIndex, updaterSuspension.animatedObjectIds)
  });
  const animationPlanSummary = summarizeSceneAnimationPlans(scene);
  const compositionPlans = buildSceneAnimationCompositionPlans(scene);
  const activeCompositionId = runtimeState.timeline.activeStep?.type === "animationComposition"
    ? runtimeState.timeline.activeStep.compositionId
    : undefined;
  const activeCompositionPlan = compositionPlans.find((plan) => plan.id === activeCompositionId);
  const animationCompositionFrameEvidence = buildAnimationCompositionFrameEvidence({
    activeCompositionId,
    elapsedSeconds: runtimeState.timeline.localProgress * (activeCompositionPlan?.durationSeconds ?? 0),
    plans: compositionPlans
  });
  const activeAnimation = activeAnimationEvidence(scene, runtimeState);
  const animationPlans = buildMathSceneAnimatePlans(scene, runtimeState);
  const animateBuilderCatalog = buildMathAnimateBuilderCatalog(animationPlans);
  const alwaysUpdaterCatalog = buildAlwaysUpdaterAuthoringCatalog({
    alwaysMethodUpdaters: scene.alwaysMethodUpdaters,
    alwaysRedraw: scene.alwaysRedraw,
    trackers: runtimeState.trackers
  });
  const alwaysMethodEvidence = buildAlwaysMethodUpdaterEvidence(scene, runtimeState);
  const subAlphaFamilyAlignment: TransformFamilyAlignmentPlan = {
    entries: activeAnimation.manimTransformFamilyAlignmentEntries,
    sourceRootId: activeAnimation.manimTransformFamilyAlignmentSourceRootId,
    targetRootId: activeAnimation.manimTransformFamilyAlignmentTargetRootId
  };
  const subAlphaSchedule = buildSubAlphaSchedule({
    familyAlignment: subAlphaFamilyAlignment,
    frame: buildMathAnimationRuntimeFrame(runtimeState, animationPlans),
    sceneId: scene.sceneId
  });
  const animationCompositionStep = scene.timeline.find((step) => step.type === "animationComposition");
  const animationComposition = animationCompositionStep
    ? scene.animationCompositions?.find((composition) => composition.id === animationCompositionStep.compositionId)
    : undefined;
  const playCompilationPlan = buildScenePlayCompilationPlan({
    lagRatio: animationComposition?.lagRatio ?? null,
    protoAnimations: animationPlans.map((plan) => ({
      animationId: plan.id,
      kind: "builder",
      lagRatio: plan.step.lagRatio,
      objectId: plan.objectId,
      runTime: plan.step.duration,
      timeSpan: [0, plan.step.duration]
    })),
    runTime: animationCompositionStep?.duration ?? null
  });
  const beginAnimationsPlan = buildSceneBeginAnimationsPlan({
    animations: animationPlans.map((plan) => ({
      animationId: plan.id,
      familyIds: [plan.objectId],
      objectId: plan.objectId,
      runTime: plan.step.duration,
      suspendMobjectUpdating: true,
      timeSpan: [0, plan.step.duration]
    })),
    sceneFamilyIds: Object.keys(runtimeState.objectGraph.byId)
  });
  const finishAnimationsPlan = buildSceneFinishAnimationsPlan({
    animations: animationPlans.map((plan) => ({
      animationId: plan.id,
      mobjectWasUpdating: mobjectFamilyHasUpdaterForEvidence(familyIndex, runtimeState, plan.objectId),
      objectId: plan.objectId,
      runTime: plan.step.duration,
      suspendMobjectUpdating: true
    })),
    skipAnimations: runtimeState.updatePolicy.skipAnimations
  });
  const animationLifecycle = animationPlans[0]
    ? buildMathAnimationLifecyclePlan(scene, runtimeState, animationPlans[0])
    : null;
  const transformBegin = animationPlans[0]
    ? buildMathTransformBeginPlan(scene, runtimeState, animationPlans[0])
    : null;
  const transformPathCatalog = buildTransformPathFunctionCatalog({
    plans: transformPathCatalogPlansForEvidence(animationPlans, runtimeState),
    sceneId: scene.sceneId
  });
  const rateFunctionCatalog = buildRateFunctionCatalog({
    sceneId: scene.sceneId,
    timeline: scene.timeline
  });
  const lagRatioCatalog = buildLagRatioCatalog({
    animationCompositions: scene.animationCompositions,
    animationPlans: scene.animationPlans,
    sceneId: scene.sceneId
  });
  const updaterSignature = buildMathUpdaterSignaturePlan(runtimeState.updaters);
  const updaterExecution = buildMathUpdaterExecutionPlan(runtimeState);
  const playbackLifecycle = sampleScenePlaybackLifecycle(scene.timeline, runtimeState.timeline.elapsedSeconds);
  const playbackPlan = buildScenePlaybackPlan(scene.timeline, {
    fps: 4,
    skipAnimations: runtimeState.updatePolicy.skipAnimations
  });
  const prePlayControlPlan = buildScenePrePlayControlPlan({
    hasWindow: true,
    initialSkipAnimations: runtimeState.updatePolicy.skipAnimations,
    playCount: scene.timeline.length,
    playStartSeconds: playbackPlan.plays.map((play) => play.startSeconds)
  });
  const postPlayPreviewPlan = buildScenePostPlayPreviewPlan({
    hasWindow: true,
    playCount: scene.timeline.length,
    previewWhileSkipping: true,
    skipAnimations: runtimeState.updatePolicy.skipAnimations
  });
  const skippingWindowPlan = buildSceneSkippingWindowPlan({
    endAtAnimationNumber: skippingWindowEvidence?.endAtAnimationNumber,
    initialSkipAnimations: runtimeState.updatePolicy.skipAnimations,
    playCount: scene.timeline.length,
    playDurations: scene.timeline.map((step) => step.duration),
    startAtAnimationNumber: skippingWindowEvidence?.startAtAnimationNumber
  });
  const runFromBeatRequestedIndex = runFromBeatEvidence?.requestedBeatIndex ?? playbackLifecycle.activePlayIndex;
  const runFromBeatPlan = buildSceneRunFromBeatPlan({
    checkpointKeys: runFromBeatEvidence?.checkpointKeys,
    checkpointRestoreKey: runFromBeatEvidence?.checkpointRestoreKey,
    compositionReplay: runFromBeatCompositionReplayForBeat(
      scene,
      compositionPlans,
      runFromBeatRequestedIndex
    ),
    playEndSeconds: playbackPlan.plays.map((play) => play.endSeconds),
    playStartSeconds: playbackPlan.plays.map((play) => play.startSeconds),
    requestedBeatIndex: runFromBeatRequestedIndex
  });
  const skipControlPlan = buildSceneSkipControlPlan({
    actions: [...(skipControlEvidence?.actions ?? [])],
    initialOriginalSkippingStatus: skipControlEvidence?.initialOriginalSkippingStatus,
    initialSkipAnimations: runtimeState.updatePolicy.skipAnimations
  });
  const activePlaybackPlan = playbackPlan.plays.find((play) => play.playIndex === playbackLifecycle.activePlayIndex);
  const activeTimeProgression = activePlaybackPlan?.timeProgression ?? buildSceneTimeProgression({ fps: 4, runTime: 0 });
  const activeWaitControl = activePlaybackPlan?.waitControl;
  const activeWaitFrameStepperBridge = activeWaitControl && !suppressWaitFrameStepperBridgeEvidence
    ? buildSceneWaitFrameStepperBridge({ fps: 4, scene, waitControl: activeWaitControl })
    : undefined;
  const playbackEvents = buildScenePlaybackEventStream(scene.timeline, { fps: 4 });
  const activePlaybackEvents = playbackEvents.filter((event) => event.playIndex === playbackLifecycle.activePlayIndex);
  const updateFramePlan = buildSceneUpdateFramePlan({
    dtSeconds: updateFrameEvidence?.dtSeconds ?? 0.25,
    forceDraw: updateFrameEvidence?.forceDraw ?? runtimeState.updatePolicy.forceDraw,
    hasUndrawnWindowEvent: updateFrameEvidence?.hasUndrawnWindowEvent,
    hasWindow: updateFrameEvidence?.hasWindow,
    realAnimationElapsedSeconds: updateFrameEvidence?.realAnimationElapsedSeconds,
    renderGroupIds: updateFrameEvidence?.renderGroupIds ?? renderGroupIdsForUpdateFrame(runtimeState),
    sceneTimeSeconds: updateFrameEvidence?.sceneTimeSeconds ?? runtimeState.timeline.elapsedSeconds,
    skipAnimations: updateFrameEvidence?.skipAnimations ?? runtimeState.updatePolicy.skipAnimations,
    virtualAnimationStartSeconds: updateFrameEvidence?.virtualAnimationStartSeconds,
    windowClosing: updateFrameEvidence?.windowClosing
  });
  const moveAlongVectorFieldEvidence = moveAlongVectorFieldEvidenceForRuntimeState(
    runtimeState,
    previousRuntimeState,
    updateFramePlan.updateMobjectsDtSeconds
  );
  const emitFramePlan = buildSceneEmitFramePlan({
    called: emitFrameEvidence?.called,
    cameraId: emitFrameEvidence?.cameraId ?? runtimeState.cameraDirector.activeShotId,
    frameIndex: emitFrameEvidence?.frameIndex ?? Math.round(runtimeState.timeline.elapsedSeconds * 60),
    progressDisplayActive: emitFrameEvidence?.progressDisplayActive ?? true,
    skipAnimations: emitFrameEvidence?.skipAnimations ?? runtimeState.updatePolicy.skipAnimations,
    writeToMovie: emitFrameEvidence?.writeToMovie ?? true
  });
  const progressThroughAnimationsPlan = buildSceneProgressThroughAnimationsPlan({
    animations: animationPlans.map((plan) => ({
      animationId: plan.id,
      objectId: plan.objectId,
      runTime: plan.step.duration,
      targetCopyObjectId: `${plan.targetObjectId}:target-copy`,
      targetObjectId: plan.targetObjectId
    })),
    fps: 4,
    skipAnimations: runtimeState.updatePolicy.skipAnimations
  });
  const randomSeed = randomSeedForScene(scene);
  const cameraFramePayload = buildCameraFramePayload({
    cameraDirector: runtimeState.cameraDirector,
    sceneId: runtimeState.sceneId
  });
  const shiftedCameraFrame = shiftCameraFrame(runtimeState.cameraDirector.frame, [0.25, 0.1, -0.15]);
  const scaledCameraFrame = scaleCameraFrame(runtimeState.cameraDirector.frame, 0.75);
  const rotatedCameraFrame = rotateCameraFrameAroundTarget(runtimeState.cameraDirector.frame, 30);
  const restoredCameraFrame = restoreCameraFrame(runtimeState.cameraDirector.frame, runtimeState.cameraDirector.resetFrame);
  const cameraFrameOperationIds = "shift,scale,rotate,restore";
  const cameraFrameOperationSummary = [
    `operations=${cameraFrameOperationIds}`,
    `shiftCenter=${formatCameraFrameVec3(shiftedCameraFrame.uniforms.center)}`,
    `scaleFovy=${formatCameraFrameNumber(scaledCameraFrame.uniforms.fovy)}`,
    `rotateTheta=${formatCameraFrameNumber(rotatedCameraFrame.eulerAngles.theta)}`,
    `restoreId=${restoredCameraFrame.id}`
  ].join(":");
  const cameraShotCatalogSummary = summarizeCameraShotCatalog(
    buildCameraShotCatalog(scene),
    runtimeState.cameraDirector.activeShotId
  );
  const cameraDirectorEvidence = buildCameraDirectorEvidence(scene, runtimeState.timeline.elapsedSeconds);
  const creationPrimitivePlan = buildSceneCreationPrimitivePlan(scene);
  const creationPrimitiveSummary = summarizeSceneCreationPrimitivePlan(creationPrimitivePlan);
  const showCreationEvidence = buildShowCreationEvidence(creationPrimitivePlan);
  const drawBorderThenFillEvidence = buildDrawBorderThenFillEvidence(creationPrimitivePlan);
  const fadeGrowEvidence = buildFadeGrowEvidence(creationPrimitivePlan);
  const indicationPrimitiveSummary = summarizeSceneIndicationPrimitivePlan(
    buildSceneIndicationPrimitivePlan(scene)
  );
  const runtimeIndicationOverlaySummary = summarizeRuntimeIndicationOverlayFrames(
    buildRuntimeIndicationOverlayFrames(runtimeState, { focusTargetIds: timelineFocusTargetIdList }),
    activeEvidenceConceptId,
    { focusTargetIds: timelineFocusTargetIdList }
  );
  const axisTickPlan = buildAxisTickPlan(scene);
  const coordinateSystemEvidence = buildCoordinateSystemEvidence(scene.coordinateSpace);
  const coordinateSpaceCurve = scene.objects.find((object) => object.type === "parametricCurve");
  const coordinateSpaceEvidence = buildCoordinateSpaceEvidence(scene.coordinateSpace, {
    curveWorldSamples: coordinateSpaceCurve?.samples
  });
  const surfaceObjectEvidence = buildSurfaceObjectEvidenceForScene(scene);
  const tracingTailEvidence = buildTracingTailEvidenceForScene(runtimeState.sourceScene, runtimeState);
  const sceneExport = buildApprovedSceneSpecExport(scene);
  const sceneRunLifecycle = buildMathSceneRunLifecyclePlan({
    elapsedSeconds: runtimeState.timeline.elapsedSeconds,
    scene,
    sceneSignature: randomSeed.signature
  });
  const sceneSelectorSummary: MathSceneSelectorSummary = sceneSelectorEvidence
    ? summarizeMathSceneSelectorCatalog(
        buildMathSceneSelectorCatalog({
          accent: sceneSelectorEvidence.accent,
          state: sceneSelectorEvidence.state
        }),
        sceneSelectorEvidence.selectedFamilyId ?? scene.familyId
      )
    : {
        activeFamilyId: scene.familyId,
        activeSceneId: scene.sceneId,
        approvedSceneCount: 0,
        familyIds: "none",
        sceneCount: 0,
        sceneIds: "none",
        summary: [
          "scenes=0",
          "approved=0",
          `selected=${scene.sceneId}`,
          `family=${scene.familyId}`,
          "families=none",
          "sceneIds=none"
        ].join(";")
      };
  const interactLoopPlan = buildSceneInteractLoopPlan(interactLoopEvidence ?? {
    fps: 4,
    hasWindow: false,
    initialSceneTimeSeconds: runtimeState.timeline.elapsedSeconds,
    initialSkipAnimations: runtimeState.updatePolicy.skipAnimations,
    maxFrames: 0,
    renderGroupIds: renderGroupIdsForUpdateFrame(runtimeState)
  });
  const sceneRunInteractBridgePlan = buildSceneRunInteractBridgePlan({
    interactLoopPlan,
    sceneRunLifecycle
  });
  const floorPlanePlan = buildSceneFloorPlanePlan(interactionEvidence?.floorPlane);
  const keyControlPlan = buildSceneKeyControlPlan(interactionEvidence?.keyControl ?? {
    eventType: "key-release",
    key: "none"
  });
  const pickResult = interactionEvidence?.pick
    ? pointToSceneMobject({
      ...interactionEvidence.pick,
      boundingBoxes: mobjectBoundingBoxTable,
      renderGroups: runtimeState.sceneGraph.renderGroups
    })
    : null;
  const pointerControlPlan = buildScenePointerControlPlan(interactionEvidence?.pointerControl ?? {
    eventType: "mouse-motion",
    hasWindow: true,
    point: [0, 0, 0]
  });
  const windowEventPlan = buildSceneWindowEventPlan(interactionEvidence?.windowEvent ?? {
    eventType: "resize",
    height: 0,
    width: 0
  });
  const parameterEntries = parameterTrackers(runtimeState);
  const parameterPanelSummary = summarizeParameterPanelCatalog(
    buildParameterPanelCatalog(scene),
    parameterPanelEvidence?.selectedParameterId ?? stateSnapshotEvidence?.selectedParameterId ?? firstParameterId(parameterEntries)
  );
  const valueTrackerPayload = buildMathValueTrackerPayload(runtimeState.trackers);
  const sceneHistorySummary = stateSnapshotEvidence?.historySummary ?? defaultSceneHistorySummary();
  const sceneInitialization = buildMathSceneInitializationEvidence({
    history: sceneHistorySummary,
    runtimeState,
    scene
  });
  const mobjectFamilyIndex = buildMobjectFamilyIndex(runtimeState.objectGraph);
  const sceneStateSnapshot = buildMathSceneStateSnapshot({
    activeStep: runtimeState.timeline.activeStep?.type ?? "none",
    authoringMode: stateSnapshotEvidence?.authoringMode ?? "playback",
    cameraMode: stateSnapshotEvidence?.cameraMode ?? "guided",
    cameraShotId: runtimeState.cameraDirector.activeShotId,
    checkpointKeys: stateSnapshotEvidence?.checkpointKeys,
    elapsedSeconds: runtimeState.timeline.elapsedSeconds,
    frameIndex: stateSnapshotEvidence?.frameIndex ?? Math.round(runtimeState.timeline.elapsedSeconds * 60),
    historySummary: sceneHistorySummary,
    objectGraphIdentity: {
      familyRootIds: mobjectFamilyIndex.topLevelIds,
      objectIds: Object.keys(runtimeState.objectGraph.byId),
      rootIds: runtimeState.objectGraph.rootIds
    },
    playbackState: stateSnapshotEvidence?.playbackState ?? (runtimeState.timeline.activeStep ? "playing" : "paused"),
    scene,
    sceneSignature: sceneExport.signature,
    selectedFamilyId: stateSnapshotEvidence?.selectedFamilyId ?? scene.familyId,
    selectedParameterId: stateSnapshotEvidence?.selectedParameterId ?? firstParameterId(parameterEntries),
    selectedSceneId: stateSnapshotEvidence?.selectedSceneId ?? scene.sceneId
  });
  const smokeHookManifest = buildMathSceneSmokeHookManifest({
    scene,
    sceneExport,
    stateSnapshot: sceneStateSnapshot
  });
  const progressControlPlan = buildSceneProgressControlPlan(progressControlEvidence ?? {
    initialShowAnimationProgress: false,
    requested: false
  });
  const checkpointPastePlan = checkpointPasteEvidence
    ? buildMathCheckpointPastePlan({
        ...checkpointPasteEvidence,
        elapsedSeconds: checkpointPasteEvidence.elapsedSeconds ?? runtimeState.timeline.elapsedSeconds,
        sceneId: scene.sceneId
      })
    : null;
  const checkpointStoreKeys = checkpointStoreEvidence?.checkpointKeys ?? sceneStateSnapshot.checkpointKeys;
  const checkpointStoreManifest = buildSceneCheckpointStoreManifest({
    checkpoints: checkpointStoreKeys.map((key, order) => ({
      key,
      order,
      state: {
        activeStep: sceneStateSnapshot.activeStep,
        cameraShotId: sceneStateSnapshot.cameraShotId,
        checkpointKey: key,
        elapsedSeconds: sceneStateSnapshot.elapsedSeconds,
        frameIndex: sceneStateSnapshot.frameIndex,
        objectIdentitySummary: sceneStateSnapshot.objectIdentitySummary,
        order,
        playbackState: sceneStateSnapshot.playbackState,
        sceneId: sceneStateSnapshot.sceneId,
        sceneSignature: sceneStateSnapshot.sceneSignature,
        snapshotSignature: sceneStateSnapshot.signature
      }
    }))
  }, {
    invalidateLater: checkpointStoreEvidence?.invalidateLater ?? checkpointPastePlan?.restoresExistingCheckpoint ?? false,
    restoreKey: checkpointStoreEvidence?.restoreKey ?? checkpointPastePlan?.checkpointKey ?? sceneStateSnapshot.latestCheckpointKey
  });
  const postCellRedrawPlan = buildScenePostCellRedrawPlan({
    cellSucceeded: postCellRedrawEvidence?.cellSucceeded,
    checkpointKey: postCellRedrawEvidence?.checkpointKey ?? checkpointPastePlan?.checkpointKey,
    hasWindow: postCellRedrawEvidence?.hasWindow ?? Boolean(checkpointPastePlan),
    skipAnimations: postCellRedrawEvidence?.skipAnimations ?? runtimeState.updatePolicy.skipAnimations,
    snippet: postCellRedrawEvidence?.snippet ?? checkpointPasteEvidence?.snippet
  });
  const shortcutCatalog = buildSceneShortcutCatalog();
  const reloadPlan = buildSceneReloadPlan({
    checkpointCount: reloadEvidence?.checkpointCount ?? sceneStateSnapshot.checkpointCount,
    elapsedSeconds: reloadEvidence?.elapsedSeconds ?? sceneStateSnapshot.elapsedSeconds,
    frameIndex: reloadEvidence?.frameIndex ?? sceneStateSnapshot.frameIndex,
    sceneId: reloadEvidence?.sceneId ?? scene.sceneId,
    selectedFamilyId: reloadEvidence?.selectedFamilyId ?? sceneStateSnapshot.selectedFamilyId,
    selectedSceneId: reloadEvidence?.selectedSceneId ?? sceneStateSnapshot.selectedSceneId,
    snippet: reloadEvidence?.snippet ?? postCellRedrawEvidence?.snippet ?? checkpointPasteEvidence?.snippet
  });
  const renderQualityPlan = buildMathSceneRenderQualityPlan({
    ...renderQualityEvidence,
    viewportHeight: renderQualityEvidence?.viewportHeight ?? formulaLayerViewport.height,
    viewportWidth: renderQualityEvidence?.viewportWidth ?? formulaLayerViewport.width
  });
  const captureUsesQualityDimensions = renderQualityPlan.rendererMode === "capture";
  const capturePlan = buildMathSceneCapturePlan({
    byteCount: captureEvidence?.byteCount,
    cameraShotId: runtimeState.cameraDirector.activeShotId,
    elapsedSeconds: runtimeState.timeline.elapsedSeconds,
    fps: captureEvidence?.fps,
    height: captureEvidence?.height ?? (captureUsesQualityDimensions ? undefined : formulaLayerViewport.height),
    kind: captureEvidence?.kind ?? "screenshot",
    requestCount: captureEvidence?.requestCount,
    renderQuality: renderQualityPlan,
    renderGroups: runtimeState.sceneGraph.renderGroups,
    scene,
    sceneSignature: sceneExport.signature,
    status: captureEvidence?.status ?? "planned",
    width: captureEvidence?.width ?? (captureUsesQualityDimensions ? undefined : formulaLayerViewport.width)
  });
  const fileWriterPlan = buildMathSceneFileWriterPlan({
    capturePlan,
    scene,
    sceneExport,
    smokeHook: smokeHookManifest,
    stateSnapshot: sceneStateSnapshot
  });
  const fileWriterSegmentPlan = buildSceneFileWriterSegmentPlan(checkpointPasteFileWriterSegmentInput({
    checkpointPastePlan,
    existingInsertIndexes: fileWriterSegmentEvidence?.existingInsertIndexes,
    movieFileExtension: fileWriterSegmentEvidence?.movieFileExtension,
    numPlays: playbackLifecycle.activePlayIndex,
    outputSlug: fileWriterPlan.outputSlug,
    requestTempRecord: fileWriterSegmentEvidence?.requestTempRecord,
    sceneId: scene.sceneId,
    subdivideOutput: fileWriterSegmentEvidence?.subdivideOutput ?? true,
    writeToMovie: fileWriterSegmentEvidence?.writeToMovie ?? fileWriterPlan.ready
  }));
  const checkpointFileWriterBridgePlan = buildCheckpointPasteFileWriterBridgePlan({
    checkpointPastePlan,
    segmentPlan: fileWriterSegmentPlan
  });
  const playbackFileWriterBridgePlan = buildScenePlaybackFileWriterBridgePlan({
    movieFileExtension: fileWriterSegmentEvidence?.movieFileExtension,
    outputSlug: fileWriterPlan.outputSlug,
    playbackPlan,
    sceneId: scene.sceneId,
    subdivideOutput: fileWriterSegmentEvidence?.subdivideOutput ?? true,
    writeToMovie: fileWriterSegmentEvidence?.writeToMovie ?? fileWriterPlan.ready
  });
  const fileWriterCombinePlan = buildSceneFileWriterCombinePlan({
    fileWriterReady: fileWriterPlan.ready,
    movieFileExtension: fileWriterSegmentEvidence?.movieFileExtension,
    outputSlug: fileWriterPlan.outputSlug,
    playbackBridge: playbackFileWriterBridgePlan,
    sceneId: scene.sceneId,
    subdivideOutput: fileWriterSegmentEvidence?.subdivideOutput ?? true,
    writeToMovie: fileWriterSegmentEvidence?.writeToMovie ?? fileWriterPlan.ready
  });
  const sceneRunFileWriterFinishBridgePlan = buildSceneRunFileWriterFinishBridgePlan({
    fileWriterCombinePlan,
    sceneRunLifecycle
  });
  const curvePartialFrame = buildActiveCurvePartialFrame(runtimeState);
  const membership = runtimeState.sceneGraph.membership;
  const sceneRestructure = restructureSceneMobjects(runtimeState.sceneGraph, sceneGraphEvidence?.restructureObjectIds ?? []);
  const sceneClearMobject = buildSceneClearMobjectBridgePlan({
    enabled: sceneGraphEvidence?.clearMobjects ?? false,
    familyIndex: mobjectFamilyIndex,
    store: runtimeState.sceneGraph
  });
  const sceneRemoveAllExceptMobject = buildSceneRemoveAllExceptMobjectBridgePlan({
    enabled: Boolean(sceneGraphEvidence?.removeAllExceptMobjects),
    familyIndex: mobjectFamilyIndex,
    objectIdsToKeep: sceneGraphEvidence?.removeAllExceptMobjects?.objectIdsToKeep ?? [],
    store: runtimeState.sceneGraph
  });
  const sceneBringToFrontMobject = buildSceneBringToFrontMobjectBridgePlan({
    enabled: Boolean(sceneGraphEvidence?.bringToFrontMobject),
    familyIndex: mobjectFamilyIndex,
    objectId: sceneGraphEvidence?.bringToFrontMobject?.objectId ?? "none",
    ...(sceneGraphEvidence?.bringToFrontMobject?.group ? { group: sceneGraphEvidence.bringToFrontMobject.group } : {}),
    store: runtimeState.sceneGraph
  });
  const sceneSendToBackMobject = buildSceneSendToBackMobjectBridgePlan({
    enabled: Boolean(sceneGraphEvidence?.sendToBackMobject),
    familyIndex: mobjectFamilyIndex,
    objectId: sceneGraphEvidence?.sendToBackMobject?.objectId ?? "none",
    ...(sceneGraphEvidence?.sendToBackMobject?.group ? { group: sceneGraphEvidence.sendToBackMobject.group } : {}),
    store: runtimeState.sceneGraph
  });
  const sceneAddMobject = buildSceneAddMobjectBridgePlan({
    familyIndex: mobjectFamilyIndex,
    objectId: sceneGraphEvidence?.addMobject?.objectId ?? "none",
    ...(sceneGraphEvidence?.addMobject?.group ? { group: sceneGraphEvidence.addMobject.group } : {}),
    store: runtimeState.sceneGraph
  });
  const sceneReplaceMobject = buildSceneReplaceMobjectBridgePlan({
    familyIndex: mobjectFamilyIndex,
    objectId: sceneGraphEvidence?.replaceMobject?.objectId ?? "none",
    replacementIds: sceneGraphEvidence?.replaceMobject?.replacementIds ?? [],
    ...(sceneGraphEvidence?.replaceMobject?.group ? { group: sceneGraphEvidence.replaceMobject.group } : {}),
    store: runtimeState.sceneGraph
  });
  const sceneRemoveMobject = buildSceneRemoveMobjectBridgePlan({
    familyIndex: mobjectFamilyIndex,
    objectId: sceneGraphEvidence?.removeMobject?.objectId ?? "none",
    store: runtimeState.sceneGraph
  });

  return {
    activeConceptId: activeEvidenceConceptId,
    activeStep: runtimeState.timeline.activeStep?.type ?? "none",
    bindingIssues: validateFormulaBindings(scene),
    cameraAmbientRotationDegrees: runtimeState.cameraDirector.cameraAmbientRotationDegrees,
    cameraCanonicalShot: runtimeState.cameraDirector.canonicalShotId,
    cameraShot: runtimeState.cameraDirector.activeShotId,
    cameraUpdaterActiveCount: runtimeState.cameraDirector.cameraUpdaterActiveCount,
    cameraUpdaterActiveIds: runtimeState.cameraDirector.cameraUpdaterActiveIds.join(",") || "none",
    cameraUpdaterActiveSeconds: runtimeState.cameraDirector.cameraUpdaterActiveSeconds,
    cameraUpdaterActiveWindowSummary: runtimeState.cameraDirector.cameraUpdaterActiveWindowSummary,
    cameraUpdaterCount: runtimeState.cameraDirector.cameraUpdaterCount,
    cameraUpdaterSourceContract: CAMERA_FRAME_UPDATER_SOURCE_CONTRACT,
    cameraUpdaterTimeMode: runtimeState.cameraDirector.cameraUpdaterTimeMode,
    curvePartialLength: curvePartialFrame?.visibleLength ?? 0,
    curvePartialNormalizedRange: curvePartialFrame ? rangeSummary(curvePartialFrame.normalizedRange) : "none",
    curvePartialRequestedRange: curvePartialFrame ? rangeSummary(curvePartialFrame.requestedRange) : "none",
    curvePartialReversed: curvePartialFrame?.reversed ?? false,
    curvePartialSampleCount: curvePartialFrame?.visibleSampleCount ?? 0,
    curvePartialSourceContract: curvePartialFrame?.sourceContract ?? VMOBJECT_PARTIAL_CURVE_SOURCE_CONTRACT,
    curvePartialSourceId: curvePartialFrame?.sourceId ?? "none",
    curvePartialSummary: curvePartialFrame?.summary ?? "none",
    curvePartialVisibilityPolicy: curvePartialFrame?.visibilityPolicy ?? VMOBJECT_PARTIAL_CURVE_VISIBILITY_POLICY,
    manimCameraFrameActiveShot: cameraFramePayload.activeShotId,
    manimCameraFrameCanonicalShot: cameraFramePayload.canonicalShotId,
    manimCameraFrameCount: cameraFramePayload.frameCount,
    manimCameraFrameCurrentId: cameraFramePayload.currentFrameId,
    manimCameraFrameEulerSummary: `theta=${formatCameraFrameNumber(cameraFramePayload.currentEulerAngles.theta)};phi=${formatCameraFrameNumber(cameraFramePayload.currentEulerAngles.phi)};gamma=${formatCameraFrameNumber(cameraFramePayload.currentEulerAngles.gamma)}`,
    manimCameraFrameFiniteMatrixCount: cameraFramePayload.finiteMatrixEntryCount,
    manimCameraFrameFixedOverlayCount: cameraFramePayload.fixedInFrameOverlayCount,
    manimCameraFrameFov: cameraFramePayload.currentFov,
    manimCameraFrameGamma: cameraFramePayload.currentEulerAngles.gamma,
    manimCameraFrameInverseViewMatrixDeterminant: cameraFramePayload.currentInverseViewMatrixDeterminant,
    manimCameraFrameInverseViewMatrixSummary: cameraFramePayload.currentInverseViewMatrixSummary,
    manimCameraFrameMatrixDeterminantMaxError: cameraFramePayload.matrixDeterminantMaxError,
    manimCameraFrameMatrixDeterminantReady: cameraFramePayload.matrixDeterminantReady,
    manimCameraFrameMatrixDeterminantSummary: cameraFramePayload.matrixDeterminantSummary,
    manimCameraFrameMatrixCount: cameraFramePayload.matrixEntryCount,
    manimCameraFrameOperationCount: 4,
    manimCameraFrameOperationIds: cameraFrameOperationIds,
    manimCameraFrameOperationSummary: cameraFrameOperationSummary,
    manimCameraFrameOrientationOrthonormalMaxError: cameraFramePayload.orientationOrthonormalMaxError,
    manimCameraFrameOrientationOrthonormalReady: cameraFramePayload.orientationOrthonormalReady,
    manimCameraFramePhi: cameraFramePayload.currentEulerAngles.phi,
    manimCameraFramePointRoundTripMaxError: cameraFramePayload.pointRoundTripMaxError,
    manimCameraFramePointRoundTripReady: cameraFramePayload.pointRoundTripReady,
    manimCameraFramePointRoundTripSourceContract: cameraFramePayload.pointRoundTripSourceContract,
    manimCameraFramePointRoundTripSummary: cameraFramePayload.pointRoundTripSummary,
    manimCameraFramePosition: formatCameraFrameVec3(cameraFramePayload.currentPosition),
    manimCameraFrameProgress: cameraFramePayload.currentProgress,
    manimCameraFrameResetShot: cameraFramePayload.resetShotId,
    manimCameraFrameRestorableCount: cameraFramePayload.restorableFrameCount,
    manimCameraFrameRestoredId: restoredCameraFrame.id,
    manimCameraFrameRows: cameraFramePayload.rows,
    manimCameraFrameRotatedTheta: roundCameraFrameNumber(rotatedCameraFrame.eulerAngles.theta),
    manimCameraFrameScaledFovy: scaledCameraFrame.uniforms.fovy,
    manimCameraFrameShiftedCenter: formatCameraFrameVec3(shiftedCameraFrame.uniforms.center),
    manimCameraFrameSignature: cameraFramePayload.signature,
    manimCameraFrameSourceContract: cameraFramePayload.sourceContract,
    manimCameraFrameSummary: summarizeCameraFramePayload(cameraFramePayload),
    manimCameraFrameTarget: formatCameraFrameVec3(cameraFramePayload.currentTarget),
    manimCameraFrameTargetCameraPoint: formatCameraFrameVec3(cameraFramePayload.currentTargetCameraPoint),
    manimCameraFrameTheta: cameraFramePayload.currentEulerAngles.theta,
    manimCameraFrameOriginCameraPoint: formatCameraFrameVec3(cameraFramePayload.currentCameraOriginPoint),
    manimCameraFrameUniformCenter: formatCameraFrameVec3(cameraFramePayload.currentUniforms.center),
    manimCameraFrameUniformCount: cameraFramePayload.uniformCount,
    manimCameraFrameUniformFovy: cameraFramePayload.currentUniforms.fovy,
    manimCameraFrameUniformOrientationQuaternion: formatCameraFrameNumberArray(cameraFramePayload.currentUniforms.orientationQuaternion),
    manimCameraFrameUniformQuaternionMaxError: cameraFramePayload.uniformQuaternionMaxError,
    manimCameraFrameUniformQuaternionReady: cameraFramePayload.uniformQuaternionReady,
    manimCameraFrameUniformShape: formatCameraFrameNumberArray(cameraFramePayload.currentUniforms.shape),
    manimCameraFrameUniformSummary: cameraFramePayload.uniformSummary,
    manimCameraFrameViewInverseMaxError: cameraFramePayload.viewInverseMaxError,
    manimCameraFrameViewInverseReady: cameraFramePayload.viewInverseReady,
    manimCameraFrameViewMatrixDeterminant: cameraFramePayload.currentViewMatrixDeterminant,
    manimCameraFrameViewMatrixSummary: cameraFramePayload.currentViewMatrixSummary,
    manimCameraShotCatalogCanonicalId: cameraShotCatalogSummary.canonicalShotId,
    manimCameraShotCatalogCount: cameraShotCatalogSummary.shotCount,
    manimCameraShotCatalogIds: cameraShotCatalogSummary.shotIds,
    manimCameraShotCatalogMissingCount: cameraShotCatalogSummary.missingTimelineShotCount,
    manimCameraShotCatalogMissingIds: cameraShotCatalogSummary.missingTimelineShotIds,
    manimCameraShotCatalogSelectedId: cameraShotCatalogSummary.activeShotId,
    manimCameraShotCatalogSourceContract: cameraShotCatalogSummary.sourceContract,
    manimCameraShotCatalogSummary: cameraShotCatalogSummary.summary,
    manimCameraShotCatalogTimelineIds: cameraShotCatalogSummary.timelineShotIds,
    manimCameraDirectorActiveShotId: cameraDirectorEvidence.activeShotId,
    manimCameraDirectorActiveUpdaterCount: cameraDirectorEvidence.activeUpdaterCount,
    manimCameraDirectorActiveUpdaterIds: cameraDirectorEvidence.activeUpdaterIds,
    manimCameraDirectorAmbientRotationDegrees: cameraDirectorEvidence.ambientRotationDegrees,
    manimCameraDirectorCanonicalShotId: cameraDirectorEvidence.canonicalShotId,
    manimCameraDirectorProgress: cameraDirectorEvidence.progress,
    manimCameraDirectorResetShotId: cameraDirectorEvidence.resetShotId,
    manimCameraDirectorShotFov: cameraDirectorEvidence.shotFov,
    manimCameraDirectorShotPosition: cameraDirectorEvidence.shotPosition,
    manimCameraDirectorShotTarget: cameraDirectorEvidence.shotTarget,
    manimCameraDirectorSourceContract: cameraDirectorEvidence.sourceContract,
    manimCameraDirectorSummary: cameraDirectorEvidence.summary,
    manimCameraDirectorTimelineShotId: cameraDirectorEvidence.timelineShotId,
    manimCameraDirectorTransitionSummary: cameraDirectorEvidence.transitionSummary,
    manimCameraDirectorUpdaterCount: cameraDirectorEvidence.updaterCount,
    manimCreationDrawBorderThenFillCount: creationPrimitiveSummary.drawBorderThenFillCount,
    manimCreationFadeCount: creationPrimitiveSummary.fadeCount,
    manimCreationGrowFromCenterCount: creationPrimitiveSummary.growFromCenterCount,
    manimCreationPrimitiveCount: creationPrimitiveSummary.primitiveCount,
    manimCreationShowCount: creationPrimitiveSummary.showCreationCount,
    manimCreationSummary: creationPrimitiveSummary.summary,
    manimShowCreationDrawRanges: showCreationEvidence.drawRangeSummary,
    manimShowCreationFrameCount: showCreationEvidence.frameCount,
    manimShowCreationFrames: showCreationEvidence.frames,
    manimShowCreationObjectIds: showCreationEvidence.objectIds,
    manimShowCreationOpacitySchedule: showCreationEvidence.opacitySchedule,
    manimShowCreationPartialPolicy: showCreationEvidence.partialPolicy,
    manimShowCreationPhaseSequence: showCreationEvidence.phaseSequence,
    manimShowCreationPrimitiveCount: showCreationEvidence.primitiveCount,
    manimShowCreationProgressRange: showCreationEvidence.progressRange,
    manimShowCreationSourceContract: showCreationEvidence.sourceContract,
    manimShowCreationSummary: summarizeShowCreationEvidence(showCreationEvidence),
    manimDrawBorderFillBorderFrameCount: drawBorderThenFillEvidence.borderFrameCount,
    manimDrawBorderFillDrawRanges: drawBorderThenFillEvidence.drawRangeSummary,
    manimDrawBorderFillFillFrameCount: drawBorderThenFillEvidence.fillFrameCount,
    manimDrawBorderFillFillOpacitySchedule: drawBorderThenFillEvidence.fillOpacitySchedule,
    manimDrawBorderFillFrameCount: drawBorderThenFillEvidence.frameCount,
    manimDrawBorderFillFrames: drawBorderThenFillEvidence.frames,
    manimDrawBorderFillObjectIds: drawBorderThenFillEvidence.objectIds,
    manimDrawBorderFillPhasePolicy: drawBorderThenFillEvidence.phasePolicy,
    manimDrawBorderFillPhaseSequence: drawBorderThenFillEvidence.phaseSequence,
    manimDrawBorderFillPrimitiveCount: drawBorderThenFillEvidence.primitiveCount,
    manimDrawBorderFillSourceContract: drawBorderThenFillEvidence.sourceContract,
    manimDrawBorderFillStrokeOpacitySchedule: drawBorderThenFillEvidence.strokeOpacitySchedule,
    manimDrawBorderFillSummary: summarizeDrawBorderThenFillEvidence(drawBorderThenFillEvidence),
    manimFadeGrowFadeFrameCount: fadeGrowEvidence.fadeFrameCount,
    manimFadeGrowFrameCount: fadeGrowEvidence.frameCount,
    manimFadeGrowFrames: fadeGrowEvidence.frames,
    manimFadeGrowGrowFrameCount: fadeGrowEvidence.growFrameCount,
    manimFadeGrowKindSequence: fadeGrowEvidence.kindSequence,
    manimFadeGrowObjectIds: fadeGrowEvidence.objectIds,
    manimFadeGrowOpacitySchedule: fadeGrowEvidence.opacitySchedule,
    manimFadeGrowPhasePolicy: fadeGrowEvidence.phasePolicy,
    manimFadeGrowPhaseSequence: fadeGrowEvidence.phaseSequence,
    manimFadeGrowPrimitiveCount: fadeGrowEvidence.primitiveCount,
    manimFadeGrowScaleSchedule: fadeGrowEvidence.scaleSchedule,
    manimFadeGrowSourceContract: fadeGrowEvidence.sourceContract,
    manimFadeGrowSummary: summarizeFadeGrowEvidence(fadeGrowEvidence),
    manimIndicationCircumscribeCount: indicationPrimitiveSummary.circumscribeCount,
    manimIndicationConceptIds: indicationPrimitiveSummary.conceptIds,
    manimIndicationCount: indicationPrimitiveSummary.indicationCount,
    manimIndicationFlashCount: indicationPrimitiveSummary.flashCount,
    manimIndicationHighlightBeatCount: indicationPrimitiveSummary.highlightBeatCount,
    manimIndicationMissingTargetCount: indicationPrimitiveSummary.missingTargetCount,
    manimIndicationPulseCount: indicationPrimitiveSummary.pulseCount,
    manimIndicationSourceContract: indicationPrimitiveSummary.sourceContract,
    manimIndicationStatePolicy: indicationPrimitiveSummary.statePolicy,
    manimIndicationSummary: indicationPrimitiveSummary.summary,
    manimIndicationTargetObjectCount: indicationPrimitiveSummary.targetObjectCount,
    manimIndicationTargetObjectIds: indicationPrimitiveSummary.targetObjectIds,
    manimIndicationRuntimeOverlayActiveConceptId: runtimeIndicationOverlaySummary.activeConceptId,
    manimIndicationRuntimeOverlayCount: runtimeIndicationOverlaySummary.frameCount,
    manimIndicationRuntimeOverlayFocusTargetCount: runtimeIndicationOverlaySummary.focusTargetCount,
    manimIndicationRuntimeOverlayFocusTargetIds: runtimeIndicationOverlaySummary.focusTargetIds,
    manimIndicationRuntimeOverlayFocusTargetPolicy: runtimeIndicationOverlaySummary.focusTargetPolicy,
    manimIndicationRuntimeOverlayFocusTargetPrimaryId: runtimeIndicationOverlaySummary.focusTargetPrimaryId,
    manimIndicationRuntimeOverlayFocusTargetSummary: runtimeIndicationOverlaySummary.focusTargetSummary,
    manimIndicationRuntimeOverlayLineCount: runtimeIndicationOverlaySummary.lineFrameCount,
    manimIndicationRuntimeOverlayObjectCount: runtimeIndicationOverlaySummary.objectCount,
    manimIndicationRuntimeOverlayObjectIds: runtimeIndicationOverlaySummary.objectIds,
    manimIndicationRuntimeOverlayPointCount: runtimeIndicationOverlaySummary.pointFrameCount,
    manimIndicationRuntimeOverlaySourceContract: runtimeIndicationOverlaySummary.sourceContract,
    manimIndicationRuntimeOverlayStatePolicy: runtimeIndicationOverlaySummary.statePolicy,
    manimIndicationRuntimeOverlaySummary: runtimeIndicationOverlaySummary.summary,
    manimAxisFiniteTickCount: axisTickPlan.finiteTickCount,
    manimAxisLabelAnchorCount: axisTickPlan.labelAnchorCount,
    manimAxisLabelAnchorFiniteCount: axisTickPlan.finiteLabelAnchorCount,
    manimAxisLabelAnchorSummary: summarizeAxisLabelAnchors(axisTickPlan),
    manimAxisLabelCount: axisTickPlan.labelCount,
    manimAxisMajorTickCount: axisTickPlan.majorTickCount,
    manimAxisObjectCount: axisTickPlan.axisObjectCount,
    manimAxisSpacingMaxDelta: axisTickPlan.spacingMaxDelta,
    manimAxisSpacingSummary: summarizeAxisTickSpacing(axisTickPlan),
    manimAxisSummary: summarizeAxisTickPlan(axisTickPlan),
    manimAxisTickCount: axisTickPlan.tickCount,
    manimCoordinateAxisCount: coordinateSystemEvidence.axisCount,
    manimCoordinateC2pFiniteCount: coordinateSystemEvidence.finiteSampleCount,
    manimCoordinateMathRange: coordinateSystemEvidence.mathRangeSummary,
    manimCoordinateOriginWorldPoint: coordinateSystemEvidence.originWorldPoint,
    manimCoordinateP2cRoundTripError: coordinateSystemEvidence.maxRoundTripError,
    manimCoordinateSampleCount: coordinateSystemEvidence.sampleCount,
    manimCoordinateScale: coordinateSystemEvidence.scaleSummary,
    manimCoordinateSummary: coordinateSystemEvidence.summary,
    manimCoordinateSystemReady: coordinateSystemEvidence.systemReady,
    manimCoordinateWorldRange: coordinateSystemEvidence.worldRangeSummary,
    manimCoordinateSpaceArcLength: coordinateSpaceEvidence.arcLength,
    manimCoordinateSpaceC2pSummary: coordinateSpaceEvidence.c2pSummary,
    manimCoordinateSpaceCurveSampleCount: coordinateSpaceEvidence.curveSampleCount,
    manimCoordinateSpaceEndpoints: coordinateSpaceEvidence.endpointSummary,
    manimCoordinateSpaceFiniteSampleCount: coordinateSpaceEvidence.finiteSampleCount,
    manimCoordinateSpaceMathRange: coordinateSpaceEvidence.mathRangeSummary,
    manimCoordinateSpaceP2cSummary: coordinateSpaceEvidence.p2cSummary,
    manimCoordinateSpaceResampledCount: coordinateSpaceEvidence.resampledSampleCount,
    manimCoordinateSpaceRoundTripError: coordinateSpaceEvidence.maxRoundTripError,
    manimCoordinateSpaceSampleCount: coordinateSpaceEvidence.sampleCount,
    manimCoordinateSpaceScale: coordinateSpaceEvidence.scaleSummary,
    manimCoordinateSpaceSourceContract: coordinateSpaceEvidence.sourceContract,
    manimCoordinateSpaceSummary: coordinateSpaceEvidence.summary,
    manimCoordinateSpaceVectorDelta: coordinateSpaceEvidence.vectorDeltaSummary,
    manimCoordinateSpaceWorldRange: coordinateSpaceEvidence.worldRangeSummary,
    manimSurfaceBounds: surfaceObjectEvidence.boundsSummary,
    manimSurfaceCellCount: surfaceObjectEvidence.cellCount,
    manimSurfaceFiniteNormalCount: surfaceObjectEvidence.finiteNormalCount,
    manimSurfaceFiniteSampleCount: surfaceObjectEvidence.finiteSampleCount,
    manimSurfaceGridSummary: surfaceObjectEvidence.gridSummary,
    manimSurfaceNormalCount: surfaceObjectEvidence.normalCount,
    manimSurfaceObjectCount: surfaceObjectEvidence.objectCount,
    manimSurfaceObjectIds: surfaceObjectEvidence.objectIds,
    manimSurfaceRangeSummary: surfaceObjectEvidence.rangeSummary,
    manimSurfaceSampleCount: surfaceObjectEvidence.sampleCount,
    manimSurfaceSourceContract: surfaceObjectEvidence.sourceContract,
    manimSurfaceSummary: surfaceObjectEvidence.summary,
    manimSurfaceTopologySummary: surfaceObjectEvidence.topologySummary,
    manimSurfaceTriangleCount: surfaceObjectEvidence.triangleCount,
    manimSurfaceWireframeColumnCount: surfaceObjectEvidence.wireframeColumnCount,
    manimSurfaceWireframeRowCount: surfaceObjectEvidence.wireframeRowCount,
    manimMoveAlongVectorFieldBlockedCount: moveAlongVectorFieldEvidence.blockedCount,
    manimMoveAlongVectorFieldCoordinateModes: moveAlongVectorFieldEvidence.coordinateModes,
    manimMoveAlongVectorFieldCount: moveAlongVectorFieldEvidence.updaterCount,
    manimMoveAlongVectorFieldDeltaSummary: moveAlongVectorFieldEvidence.deltaSecondsSummary,
    manimMoveAlongVectorFieldDisplacementMagnitudeRange: moveAlongVectorFieldEvidence.displacementMagnitudeRange,
    manimMoveAlongVectorFieldFiniteDisplacementCount: moveAlongVectorFieldEvidence.finiteDisplacementCount,
    manimMoveAlongVectorFieldFiniteVectorCount: moveAlongVectorFieldEvidence.finiteVectorCount,
    manimMoveAlongVectorFieldMovedCount: moveAlongVectorFieldEvidence.movedCount,
    manimMoveAlongVectorFieldObjectIds: moveAlongVectorFieldEvidence.objectIds,
    manimMoveAlongVectorFieldSpeedSummary: moveAlongVectorFieldEvidence.speedScaleSummary,
    manimMoveAlongVectorFieldSourceContract: moveAlongVectorFieldEvidence.sourceContract,
    manimMoveAlongVectorFieldStatusSummary: moveAlongVectorFieldEvidence.statusSummary,
    manimMoveAlongVectorFieldSummary: moveAlongVectorFieldEvidence.summary,
    manimMoveAlongVectorFieldUpdaterIds: moveAlongVectorFieldEvidence.updaterIds,
    manimMoveAlongVectorFieldVectorMagnitudeRange: moveAlongVectorFieldEvidence.vectorMagnitudeRange,
    manimTracingTailAgeRange: tracingTailEvidence.ageRange,
    manimTracingTailBufferCapacity: tracingTailEvidence.bufferCapacity,
    manimTracingTailBufferPolicySummary: tracingTailEvidence.bufferPolicySummary,
    manimTracingTailCount: tracingTailEvidence.tailCount,
    manimTracingTailDurationSummary: tracingTailEvidence.durationSummary,
    manimTracingTailFillRatioSummary: tracingTailEvidence.fillRatioSummary,
    manimTracingTailFiniteSampleCount: tracingTailEvidence.finiteSampleCount,
    manimTracingTailFreshPointSummary: tracingTailEvidence.freshPointSummary,
    manimTracingTailGradientDirectionSummary: tracingTailEvidence.gradientDirectionSummary,
    manimTracingTailGradientMonotonic: tracingTailEvidence.gradientMonotonic,
    manimTracingTailGradientSummary: tracingTailEvidence.gradientSummary,
    manimTracingTailIds: tracingTailEvidence.tailIds,
    manimTracingTailOpacityRange: tracingTailEvidence.opacityRange,
    manimTracingTailSampleCadenceSummary: tracingTailEvidence.sampleCadenceSummary,
    manimTracingTailSampleCount: tracingTailEvidence.sampleCount,
    manimTracingTailSampleTimeOrderSummary: tracingTailEvidence.sampleTimeOrderSummary,
    manimTracingTailSourceContract: tracingTailEvidence.sourceContract,
    manimTracingTailSourceIds: tracingTailEvidence.sourceObjectIds,
    manimTracingTailStalePointSummary: tracingTailEvidence.stalePointSummary,
    manimTracingTailStrokeWidthRange: tracingTailEvidence.strokeWidthRange,
    manimTracingTailSummary: tracingTailEvidence.summary,
    manimTracingTailTimestampRange: tracingTailEvidence.timestampRange,
    manimTracingTailTracedPointSourceSummary: tracingTailEvidence.tracedPointSourceSummary,
    familyId: scene.familyId,
    formulaBindingAnchorCount: bindingAnchorSummary.anchoredBindingCount,
    formulaBindingMissingAnchorCount: bindingAnchorSummary.missingAnchorCount,
    formulaBindingMissingAnchorTokenIds: bindingAnchorSummary.missingAnchorTokenIds,
    formulaBindingAnchorSourceContract: bindingAnchorSummary.sourceContract,
    formulaTokenCount: bindingSummary.tokenCount,
    formulaTokenIds: bindingSummary.tokenIds,
    manimProjectedLabelConceptIds: projectedLabelSummary.conceptIds,
    manimProjectedLabelCount: projectedLabelSummary.labelCount,
    manimProjectedLabelHiddenCount: projectedLabelSummary.hiddenCount,
    manimProjectedLabelHiddenObjectIds: projectedLabelSummary.hiddenObjectIds,
    manimProjectedLabelObjectCount: projectedLabelSummary.objectCount,
    manimProjectedLabelObjectIds: projectedLabelSummary.objectIds,
    manimProjectedLabelSourceContract: projectedLabelSummary.sourceContract,
    manimProjectedLabelSummary: projectedLabelSummary.summary,
    manimProjectedLabelTextObjectCount: formulaLayerProjectedLabelTextSummary.objectCount,
    manimProjectedLabelTextObjectIds: formulaLayerProjectedLabelTextSummary.objectIds,
    manimProjectedLabelTextPolicy: formulaLayerProjectedLabelTextSummary.policy,
    manimProjectedLabelTextSource: formulaLayerProjectedLabelTextSummary.source,
    manimProjectedLabelTextSourceContract: formulaLayerProjectedLabelTextSummary.sourceContract,
    manimProjectedLabelTextSummary: formulaLayerProjectedLabelTextSummary.summary,
    manimProjectedLabelTextTokenSummary: formulaLayerProjectedLabelTextSummary.textSummary,
    manimProjectedLabelVisibleCount: projectedLabelSummary.visibleCount,
    manimFormulaCollisionCount: formulaCollisionDiagnostics.collisionCount,
    manimFormulaCollisionLabelIds: formulaCollisionDiagnostics.collisionLabelIds,
    manimFormulaCollisionSourceContract: formulaCollisionDiagnostics.sourceContract,
    manimFormulaLayerSourceContract: FORMULA_LAYER_SOURCE_CONTRACT,
    manimFormulaMobileViewport: formulaCollisionDiagnostics.mobileViewport,
    manimFormulaSafeAreaStatus: formulaCollisionDiagnostics.safeAreaStatus,
    manimFormulaSafeAreaSummary: formulaCollisionDiagnostics.summary,
    manimTexColorMapBoundTokenCount: texColorMap.boundTokenCount,
    manimTexColorMapBindingSourceCount: texColorMap.colorSourceCounts.binding,
    manimTexColorMapEntries: texColorMap.entries,
    manimTexColorMapEntryCount: texColorMap.entryCount,
    manimTexColorMapReferenceSourceCount: texColorMap.colorSourceCounts.reference,
    manimTexColorMapRoleCount: texColorMap.colorRoles.length,
    manimTexColorMapRoles: texColorMap.colorRoles.join(",") || "none",
    manimTexColorMapSceneId: texColorMap.sceneId,
    manimTexColorMapSourceContract: texColorMap.sourceContract,
    manimTexColorMapSourceSummary: texColorMap.colorSourceSummary,
    manimTexColorMapSummary: texColorMap.summary,
    manimTexColorMapTexIsolatedTokenCount: texColorMap.texIsolatedTokenCount,
    manimTexColorMapTexIsolationSelectorCount: texColorMap.texIsolationSelectorCount,
    manimTexColorMapTexIsolationSourceCount: texColorMap.colorSourceCounts["tex-isolation"],
    manimTexColorMapTokenCount: texColorMap.tokenCount,
    manimTexColorMapTokenIds: texColorMap.entries.map((entry) => entry.tokenId).join(",") || "none",
    manimTexColorMapUnmatchedSelectors: texColorMap.unmatchedSelectors.join(",") || "none",
    manimTexColorMapUnmatchedTokenCount: texColorMap.unmatchedTokenCount,
    manimTexColorizedColoredCharacterCount: texColorizedFormula.coloredCharacterCount,
    manimTexColorizedColoredTokenCount: texColorizedFormula.coloredTokenCount,
    manimTexColorizedColoredTokenIds: texColorizedFormula.coloredTokenIds.join(",") || "none",
    manimTexColorizedCoverageRatio: texColorizedFormula.coverageRatio,
    manimTexColorizedCoverageSummary: texColorizedFormula.coverageSummary,
    manimTexColorizedFormulaId: texColorizedFormula.formulaId,
    manimTexColorizedIntervalOrderSummary: texColorizedFormula.intervalOrderSummary,
    manimTexColorizedIntervalSummary: texColorizedFormula.intervalSummary,
    manimTexColorizedRoleSummary: texColorizedFormula.roleSummary,
    manimTexColorizedSourceContract: texColorizedFormula.sourceContract,
    manimTexColorizedSourceCharacterCount: texColorizedFormula.sourceCharacterCount,
    manimTexColorizedSummary: texColorizedFormula.summary,
    manimTexColorizedTokenCount: texColorizedFormula.tokenCount,
    manimTexColorizedUncoloredTokenCount: texColorizedFormula.uncoloredTokenCount,
    manimTexColorizedUncoloredTokenIds: texColorizedFormula.uncoloredTokenIds.join(",") || "none",
    manimTexCacheCacheEntryCount: texCacheManifest.cacheEntryCount,
    manimTexCacheCacheHitEligibleCount: texCacheManifest.cacheHitEligibleCount,
    manimTexCacheCacheKeys: texCacheManifest.cacheKeys,
    manimTexCacheCacheVersion: texCacheManifest.cacheVersion,
    manimTexCacheEntries: texCacheManifest.entries,
    manimTexCacheFormulaCount: texCacheManifest.formulaCount,
    manimTexCacheIsolationEntryCount: texCacheManifest.isolationEntryCount,
    manimTexCacheReady: texCacheManifest.ready,
    manimTexCacheSceneId: texCacheManifest.sceneId,
    manimTexCacheSignature: texCacheManifest.signature,
    manimTexCacheSourceContract: texCacheManifest.sourceContract,
    manimTexCacheStaleEntryCount: texCacheManifest.staleEntryCount,
    manimTexCacheSummary: texCacheManifest.summary,
    manimTexCacheSvgMorphPlanCount: texCacheManifest.svgMorphPlanCount,
    manimTexCacheTokenCount: texCacheManifest.tokenCount,
    manimTexCompileCacheHitEligibleCount: texCompilePipeline.cacheHitEligibleCount,
    manimTexCompileCacheKeyCount: texCompilePipeline.cacheKeyCount,
    manimTexCompileCommandCount: texCompilePipeline.commandCount,
    manimTexCompileDocumentCount: texCompilePipeline.documentCount,
    manimTexCompileDocumentSourceLengthRange: texCompilePipeline.documentSourceLengthRange,
    manimTexCompileDocumentTemplateCount: texCompilePipeline.documentTemplateCount,
    manimTexCompileDvisvgmCount: texCompilePipeline.dvisvgmCount,
    manimTexCompileEngineIds: texCompilePipeline.engineIds,
    manimTexCompileFormulaCount: texCompilePipeline.formulaCount,
    manimTexCompileIntermediateExtensions: texCompilePipeline.intermediateExtensions,
    manimTexCompileRows: texCompilePipeline.rows,
    manimTexCompileSceneId: texCompilePipeline.sceneId,
    manimTexCompileSignature: texCompilePipeline.signature,
    manimTexCompileSourceContract: texCompilePipeline.sourceContract,
    manimTexCompileSourceSummary: texCompilePipeline.sourceSummary,
    manimTexCompileStepSequence: texCompilePipeline.stepSequence,
    manimTexCompileSummary: texCompilePipeline.summary,
    manimTexCompileSvgOutputCount: texCompilePipeline.svgOutputCount,
    manimTexIsolationCacheKeyCount: texIsolationEvidence.cacheKeyCount,
    manimTexIsolationFormulaCount: texIsolationEvidence.formulaCount,
    manimTexIsolationIsolatedTokenCount: texIsolationEvidence.isolatedTokenCount,
    manimTexIsolationOccurrenceSummary: texIsolationEvidence.occurrenceSummary,
    manimTexIsolationSceneId: texIsolationEvidence.sceneId,
    manimTexIsolationSelectorCount: texIsolationEvidence.selectorCount,
    manimTexIsolationSelectorSummary: texIsolationEvidence.selectorSummary,
    manimTexIsolationSourceContract: texIsolationEvidence.sourceContract,
    manimTexIsolationSummary: texIsolationEvidence.summary,
    manimTexIsolationTokenCount: texIsolationEvidence.tokenCount,
    manimTexIsolationUnmatchedSelectorCount: texIsolationEvidence.unmatchedSelectorCount,
    manimTexIsolationUnmatchedSelectors: texIsolationEvidence.unmatchedSelectors,
    manimSvgMorphCacheKeyCount: formulaSvgMorphEvidence.cacheKeyCount,
    manimSvgMorphCommandCount: formulaSvgMorphEvidence.commandCount,
    manimSvgMorphCompatibleCount: formulaSvgMorphEvidence.compatibleMorphCount,
    manimSvgMorphCount: formulaSvgMorphEvidence.morphCount,
    manimSvgMorphFramePathPreview: formulaSvgMorphEvidence.framePathPreview,
    manimSvgMorphIds: formulaSvgMorphEvidence.morphIds,
    manimSvgMorphIssueCount: formulaSvgMorphEvidence.issueCount,
    manimSvgMorphIssueSummary: formulaSvgMorphEvidence.issueSummary,
    manimSvgMorphProgress: formulaSvgMorphEvidence.progress,
    manimSvgMorphSourceContract: formulaSvgMorphEvidence.sourceContract,
    manimSvgMorphSummary: formulaSvgMorphEvidence.summary,
    manimActiveAnimationNodeCount: activeAnimation.manimActiveAnimationNodeCount,
    manimActiveAnimationNodeProgressSummary: activeAnimation.manimActiveAnimationNodeProgressSummary,
    manimActiveAnimationObjectId: activeAnimation.manimActiveAnimationObjectId,
    manimActiveAnimationPlanId: activeAnimation.manimActiveAnimationPlanId,
    manimActiveAnimationPlanIds: activeAnimation.manimActiveAnimationPlanIds,
    manimActiveAnimationProgress: activeAnimation.manimActiveAnimationProgress,
    manimActiveAnimationTargetObjectId: activeAnimation.manimActiveAnimationTargetObjectId,
    manimAnimationRuntimeActive: activeAnimation.manimAnimationRuntimeActive,
    manimAnimationRuntimeActivePlanCount: activeAnimation.manimAnimationRuntimeActivePlanCount,
    manimAnimationRuntimeActivePlanIds: activeAnimation.manimAnimationRuntimeActivePlanIds,
    manimAnimationRuntimeEasedProgressRange: activeAnimation.manimAnimationRuntimeEasedProgressRange,
    manimAnimationRuntimeFiniteBoundingBoxCount: activeAnimation.manimAnimationRuntimeFiniteBoundingBoxCount,
    manimAnimationRuntimeLaggedProgressRange: activeAnimation.manimAnimationRuntimeLaggedProgressRange,
    manimAnimationRuntimeNodeCount: activeAnimation.manimAnimationRuntimeNodeCount,
    manimAnimationRuntimeObjectId: activeAnimation.manimAnimationRuntimeObjectId,
    manimAnimationRuntimeObjectIds: activeAnimation.manimAnimationRuntimeObjectIds,
    manimAnimationRuntimeProgress: activeAnimation.manimAnimationRuntimeProgress,
    manimAnimationRuntimeRateFunctionIds: activeAnimation.manimAnimationRuntimeRateFunctionIds,
    manimAnimationRuntimeRawProgressRange: activeAnimation.manimAnimationRuntimeRawProgressRange,
    manimAnimationRuntimeRenderKindSummary: activeAnimation.manimAnimationRuntimeRenderKindSummary,
    manimAnimationRuntimeSourceContract: activeAnimation.manimAnimationRuntimeSourceContract,
    manimAnimationRuntimeMobjectInterpolatePolicy: activeAnimation.manimAnimationRuntimeMobjectInterpolatePolicy,
    manimAnimationRuntimeSummary: activeAnimation.manimAnimationRuntimeSummary,
    manimAnimationRuntimeTargetObjectId: activeAnimation.manimAnimationRuntimeTargetObjectId,
    manimTransformInterpolateBoundingBoxCount: activeAnimation.manimTransformInterpolateBoundingBoxCount,
    manimTransformInterpolateBoundingBoxObjectIds: activeAnimation.manimTransformInterpolateBoundingBoxObjectIds,
    manimTransformInterpolateBoundingBoxSummary: activeAnimation.manimTransformInterpolateBoundingBoxSummary,
    manimTransformInterpolateEmptyBoundingBoxCount: activeAnimation.manimTransformInterpolateEmptyBoundingBoxCount,
    manimTransformInterpolateFieldArcPathNodeCount: activeAnimation.manimTransformInterpolateFieldArcPathNodeCount,
    manimTransformInterpolateFieldBoundingBoxNodeCount: activeAnimation.manimTransformInterpolateFieldBoundingBoxNodeCount,
    manimTransformInterpolateFieldNodeCount: activeAnimation.manimTransformInterpolateFieldNodeCount,
    manimTransformInterpolateFieldNonPointCount: activeAnimation.manimTransformInterpolateFieldNonPointCount,
    manimTransformInterpolateFieldNonPointPolicy: activeAnimation.manimTransformInterpolateFieldNonPointPolicy,
    manimTransformInterpolateFieldObjectIds: activeAnimation.manimTransformInterpolateFieldObjectIds,
    manimTransformInterpolateFieldPathSummary: activeAnimation.manimTransformInterpolateFieldPathSummary,
    manimTransformInterpolateFieldPointlikeCount: activeAnimation.manimTransformInterpolateFieldPointlikeCount,
    manimTransformInterpolateFieldPointlikePolicy: activeAnimation.manimTransformInterpolateFieldPointlikePolicy,
    manimTransformInterpolateFieldPointlikeSummary: activeAnimation.manimTransformInterpolateFieldPointlikeSummary,
    manimTransformInterpolateFieldSourceSummary: activeAnimation.manimTransformInterpolateFieldSourceSummary,
    manimTransformInterpolateFieldStraightPathNodeCount: activeAnimation.manimTransformInterpolateFieldStraightPathNodeCount,
    manimTransformInterpolateFieldStyleNodeCount: activeAnimation.manimTransformInterpolateFieldStyleNodeCount,
    manimTransformInterpolateFieldSummary: activeAnimation.manimTransformInterpolateFieldSummary,
    manimTransformInterpolateFieldUniformNodeCount: activeAnimation.manimTransformInterpolateFieldUniformNodeCount,
    manimTransformInterpolateFiniteBoundingBoxCount: activeAnimation.manimTransformInterpolateFiniteBoundingBoxCount,
    manimTransformInterpolateUniformClippingPlaneCount: activeAnimation.manimTransformInterpolateUniformClippingPlaneCount,
    manimTransformInterpolateUniformCount: activeAnimation.manimTransformInterpolateUniformCount,
    manimTransformInterpolateUniformObjectIds: activeAnimation.manimTransformInterpolateUniformObjectIds,
    manimTransformInterpolateUniformOpacityRange: activeAnimation.manimTransformInterpolateUniformOpacityRange,
    manimTransformInterpolateUniformOpacitySampleCount: activeAnimation.manimTransformInterpolateUniformOpacitySampleCount,
    manimTransformInterpolateUniformSourceSummary: activeAnimation.manimTransformInterpolateUniformSourceSummary,
    manimTransformInterpolateUniformSummary: activeAnimation.manimTransformInterpolateUniformSummary,
    manimTransformFamilyAlignmentEnteringCount: activeAnimation.manimTransformFamilyAlignmentEnteringCount,
    manimTransformFamilyAlignmentEntries: activeAnimation.manimTransformFamilyAlignmentEntries,
    manimTransformFamilyAlignmentEntryCount: activeAnimation.manimTransformFamilyAlignmentEntryCount,
    manimTransformFamilyAlignmentExitingCount: activeAnimation.manimTransformFamilyAlignmentExitingCount,
    manimTransformFamilyAlignmentFamilyPairSequence: activeAnimation.manimTransformFamilyAlignmentFamilyPairSequence,
    manimTransformFamilyAlignmentFamilyZipCompleteCount: activeAnimation.manimTransformFamilyAlignmentFamilyZipCompleteCount,
    manimTransformFamilyAlignmentFamilyZipIncompleteCount: activeAnimation.manimTransformFamilyAlignmentFamilyZipIncompleteCount,
    manimTransformFamilyAlignmentFamilyZipPolicy: activeAnimation.manimTransformFamilyAlignmentFamilyZipPolicy,
    manimTransformFamilyAlignmentFamilyZipSequence: activeAnimation.manimTransformFamilyAlignmentFamilyZipSequence,
    manimTransformFamilyAlignmentFamilyZipTupleCount: activeAnimation.manimTransformFamilyAlignmentFamilyZipTupleCount,
    manimTransformFamilyAlignmentMatchedCount: activeAnimation.manimTransformFamilyAlignmentMatchedCount,
    manimTransformFamilyAlignmentMaxDepth: activeAnimation.manimTransformFamilyAlignmentMaxDepth,
    manimTransformFamilyAlignmentPointCountPolicy: activeAnimation.manimTransformFamilyAlignmentPointCountPolicy,
    manimTransformFamilyAlignmentSourceContract: activeAnimation.manimTransformFamilyAlignmentSourceContract,
    manimTransformFamilyAlignmentSourceRootId: activeAnimation.manimTransformFamilyAlignmentSourceRootId,
    manimTransformFamilyAlignmentSummary: activeAnimation.manimTransformFamilyAlignmentSummary,
    manimTransformFamilyAlignmentTargetRootId: activeAnimation.manimTransformFamilyAlignmentTargetRootId,
    manimTransformFamilyAlignmentTypeMismatchCount: activeAnimation.manimTransformFamilyAlignmentTypeMismatchCount,
    manimTransformPointAlignmentCompatibleCount: activeAnimation.manimTransformPointAlignmentCompatibleCount,
    manimTransformPointAlignmentMatchedCount: activeAnimation.manimTransformPointAlignmentMatchedCount,
    manimTransformPointAlignmentPolicySummary: activeAnimation.manimTransformPointAlignmentPolicySummary,
    manimTransformPointAlignmentResampledCount: activeAnimation.manimTransformPointAlignmentResampledCount,
    manimTransformPointAlignmentRows: activeAnimation.manimTransformPointAlignmentRows,
    manimTransformPointAlignmentRowSummary: activeAnimation.manimTransformPointAlignmentRowSummary,
    manimTransformPointAlignmentSourceContract: activeAnimation.manimTransformPointAlignmentSourceContract,
    manimTransformPointAlignmentSourceRootId: activeAnimation.manimTransformPointAlignmentSourceRootId,
    manimTransformPointAlignmentSummary: activeAnimation.manimTransformPointAlignmentSummary,
    manimTransformPointAlignmentTargetRootId: activeAnimation.manimTransformPointAlignmentTargetRootId,
    manimTransformPointAlignmentTotalPointCount: activeAnimation.manimTransformPointAlignmentTotalPointCount,
    manimTransformPointAlignmentVmobjectAlignedCurveCount:
      activeAnimation.manimTransformPointAlignmentVmobjectAlignedCurveCount,
    manimTransformPointAlignmentVmobjectSourceContract:
      activeAnimation.manimTransformPointAlignmentVmobjectSourceContract,
    manimTransformPointAlignmentVmobjectSourceInsertNCurvesCount:
      activeAnimation.manimTransformPointAlignmentVmobjectSourceInsertNCurvesCount,
    manimTransformPointAlignmentVmobjectTargetInsertNCurvesCount:
      activeAnimation.manimTransformPointAlignmentVmobjectTargetInsertNCurvesCount,
    manimTransformDataLockAlignmentSummary: activeAnimation.manimTransformDataLockAlignmentSummary,
    manimTransformDataLockKindSummary: activeAnimation.manimTransformDataLockKindSummary,
    manimTransformDataLockLockedPointCount: activeAnimation.manimTransformDataLockLockedPointCount,
    manimTransformDataLockMovingPointCount: activeAnimation.manimTransformDataLockMovingPointCount,
    manimTransformDataLockObjectIds: activeAnimation.manimTransformDataLockObjectIds,
    manimTransformDataLockPlanCount: activeAnimation.manimTransformDataLockPlanCount,
    manimTransformDataLockSourceContract: activeAnimation.manimTransformDataLockSourceContract,
    manimTransformDataLockSummary: activeAnimation.manimTransformDataLockSummary,
    manimTransformDataLockTargetObjectIds: activeAnimation.manimTransformDataLockTargetObjectIds,
    manimTransformDataLockTotalPointCount: activeAnimation.manimTransformDataLockTotalPointCount,
    manimAnimateBuilderChangedFieldCount: animateBuilderCatalog.changedFieldCount,
    manimAnimateBuilderChangedNodeCount: animateBuilderCatalog.changedNodeCount,
    manimAnimateBuilderChangedNodeIds: animateBuilderCatalog.changedNodeIds.join(",") || "none",
    manimAnimateBuilderFirstPlanId: animateBuilderCatalog.firstPlanId,
    manimAnimateBuilderLaggedCount: animateBuilderCatalog.laggedPlanCount,
    manimAnimateBuilderObjectIds: animateBuilderCatalog.objectIds.join(",") || "none",
    manimAnimateBuilderOperationCount: animateBuilderCatalog.operationCount,
    manimAnimateBuilderOperationTypes: animateBuilderCatalog.operationTypes.join(",") || "none",
    manimAnimateBuilderPathCount: animateBuilderCatalog.pathPlanCount,
    manimAnimateBuilderPlanCount: animateBuilderCatalog.planCount,
    manimAnimateBuilderSourceContract: animateBuilderCatalog.sourceContract,
    manimAnimateBuilderSummary: animateBuilderCatalog.summary,
    manimAnimateBuilderTargetIds: animateBuilderCatalog.targetObjectIds.join(",") || "none",
    manimAnimateBuilderTotalDuration: animateBuilderCatalog.totalDuration,
    manimAlwaysUpdaterAlwaysMethodCount: alwaysUpdaterCatalog.alwaysMethodCount,
    manimAlwaysUpdaterAlwaysRedrawCount: alwaysUpdaterCatalog.alwaysRedrawCount,
    manimAlwaysUpdaterCount: alwaysUpdaterCatalog.totalUpdaterCount,
    manimAlwaysUpdaterDependencyTrackerCount: alwaysUpdaterCatalog.dependencyTrackerIds.length,
    manimAlwaysUpdaterDependencyTrackerIds: alwaysUpdaterCatalog.dependencyTrackerIds.join(",") || "none",
    manimAlwaysUpdaterFactoryCount: alwaysUpdaterCatalog.factoryCount,
    manimAlwaysUpdaterMissingTrackerCount: alwaysUpdaterCatalog.missingTrackerIds.length,
    manimAlwaysUpdaterMissingTrackerIds: alwaysUpdaterCatalog.missingTrackerIds.join(",") || "none",
    manimAlwaysUpdaterObjectIds: alwaysUpdaterCatalog.objectIds.join(",") || "none",
    manimAlwaysUpdaterOperationTypes: alwaysUpdaterCatalog.operationTypes.join(",") || "none",
    manimAlwaysUpdaterSourceContract: alwaysUpdaterCatalog.sourceContract,
    manimAlwaysUpdaterSummary: alwaysUpdaterCatalog.summary,
    manimAlwaysUpdaterUpdaterIds: alwaysUpdaterCatalog.updaterIds.join(",") || "none",
    manimAlwaysMethodBoundingBoxSummary: alwaysMethodEvidence.boundingBoxSummary,
    manimAlwaysMethodBuffSummary: alwaysMethodEvidence.buffSummary,
    manimAlwaysMethodCount: alwaysMethodEvidence.updaterCount,
    manimAlwaysMethodDirectionSummary: alwaysMethodEvidence.directionSummary,
    manimAlwaysMethodDynamicBuffCount: alwaysMethodEvidence.dynamicBuffCount,
    manimAlwaysMethodMaxPlacementError: alwaysMethodEvidence.maxPlacementError,
    manimAlwaysMethodMissingObjectCount: alwaysMethodEvidence.missingObjectCount,
    manimAlwaysMethodMissingTargetCount: alwaysMethodEvidence.missingTargetCount,
    manimAlwaysMethodObjectIds: alwaysMethodEvidence.objectIds,
    manimAlwaysMethodOperationTypes: alwaysMethodEvidence.operationTypes,
    manimAlwaysMethodPlacedCount: alwaysMethodEvidence.placedCount,
    manimAlwaysMethodPlacementSummary: alwaysMethodEvidence.placementSummary,
    manimAlwaysMethodSourceContract: alwaysMethodEvidence.sourceContract,
    manimAlwaysMethodSummary: alwaysMethodEvidence.summary,
    manimAlwaysMethodTargetObjectIds: alwaysMethodEvidence.targetObjectIds,
    manimAlwaysMethodUpdaterIds: alwaysMethodEvidence.updaterIds,
    manimSubAlphaActivePlanCount: subAlphaSchedule.activePlanCount,
    manimSubAlphaCompleteNodeCount: subAlphaSchedule.completeNodeCount,
    manimSubAlphaDelayedNodeCount: subAlphaSchedule.delayedNodeCount,
    manimSubAlphaEasedMax: subAlphaSchedule.easedMax,
    manimSubAlphaEasedMin: subAlphaSchedule.easedMin,
    manimSubAlphaEasedRange: subAlphaSchedule.easedRange,
    manimSubAlphaFamilyZipCoveredNodeCount: subAlphaSchedule.familyZipCoveredNodeCount,
    manimSubAlphaFamilyZipMissingNodeCount: subAlphaSchedule.familyZipMissingNodeCount,
    manimSubAlphaFamilyZipPolicy: subAlphaSchedule.familyZipPolicy,
    manimSubAlphaFamilyZipSequence: subAlphaSchedule.familyZipSequence,
    manimSubAlphaFamilyZipTupleCount: subAlphaSchedule.familyZipTupleCount,
    manimSubAlphaFamilyZipUncoveredObjectIds: subAlphaSchedule.familyZipUncoveredObjectIds,
    manimSubAlphaLaggedMax: subAlphaSchedule.laggedMax,
    manimSubAlphaLaggedMin: subAlphaSchedule.laggedMin,
    manimSubAlphaLaggedRange: subAlphaSchedule.laggedRange,
    manimSubAlphaLeadingNodeCount: subAlphaSchedule.leadingNodeCount,
    manimSubAlphaNodeCount: subAlphaSchedule.nodeFrameCount,
    manimSubAlphaNodeWindowSummary: subAlphaSchedule.nodeWindowSummary,
    manimSubAlphaObjectIds: subAlphaSchedule.objectIds,
    manimSubAlphaPartialNodeCount: subAlphaSchedule.partialNodeCount,
    manimSubAlphaRateFunctionIds: subAlphaSchedule.rateFunctionIds,
    manimSubAlphaRawMax: subAlphaSchedule.rawMax,
    manimSubAlphaRawMin: subAlphaSchedule.rawMin,
    manimSubAlphaRawRange: subAlphaSchedule.rawRange,
    manimSubAlphaSourceContract: subAlphaSchedule.sourceContract,
    manimSubAlphaStaggeredNodeCount: subAlphaSchedule.staggeredNodeCount,
    manimSubAlphaSummary: subAlphaSchedule.summary,
    manimSubAlphaWindowPolicy: subAlphaSchedule.windowPolicy,
    manimSubAlphaZeroNodeCount: subAlphaSchedule.zeroNodeCount,
    manimAnimationCompositionCount: animationPlanSummary.compositionCount,
    manimAnimationCompositionDuration: animationPlanSummary.compositionDurationSeconds,
    manimAnimationCompositionActiveId: animationCompositionFrameEvidence.activeCompositionId,
    manimAnimationCompositionActiveType: animationCompositionFrameEvidence.activeCompositionType,
    manimAnimationCompositionActiveWindowCount: animationCompositionFrameEvidence.activeWindowCount,
    manimAnimationCompositionActiveWindowIds: animationCompositionFrameEvidence.activeWindowIds,
    manimAnimationCompositionCompletedWindowCount: animationCompositionFrameEvidence.completedWindowCount,
    manimAnimationCompositionCompletedWindowIds: animationCompositionFrameEvidence.completedWindowIds,
    manimAnimationCompositionFrameElapsedSeconds: animationCompositionFrameEvidence.elapsedSeconds,
    manimAnimationCompositionFrameProgress: animationCompositionFrameEvidence.progress,
    manimAnimationCompositionFrameSummary: animationCompositionFrameEvidence.summary,
    manimAnimationCompositionIssueCount: animationPlanSummary.compositionIssueCount,
    manimAnimationCompositionModes: animationPlanSummary.compositionModes.join(",") || "none",
    manimAnimationCompositionPendingWindowCount: animationCompositionFrameEvidence.pendingWindowCount,
    manimAnimationCompositionPendingWindowIds: animationCompositionFrameEvidence.pendingWindowIds,
    manimAnimationCompositionSourceContract: animationCompositionFrameEvidence.sourceContract,
    manimAnimationCompositionTimingPolicy: animationCompositionFrameEvidence.timingPolicy,
    manimAnimationCompositionWindowSummary: animationCompositionFrameEvidence.windowSummary,
    manimAnimationCompositionWindowCount: animationPlanSummary.compositionWindowCount,
    manimAnimationLifecycleAnimatingStatus: animationLifecycle?.begin.animatingStatus ?? "none",
    manimAnimationLifecycleBeginNodeCount: animationLifecycle?.begin.snapshotNodeCount ?? 0,
    manimAnimationLifecycleBeginSourcePolicy:
      animationLifecycle?.begin.sourcePolicy ?? ANIMATION_LIFECYCLE_BEGIN_SOURCE_POLICY,
    manimAnimationLifecycleCopiedNodeCount: animationLifecycle?.begin.copiedNodeCount ?? 0,
    manimAnimationLifecycleFamilyTupleCount: animationLifecycle?.familyTupleCount ?? 0,
    manimAnimationLifecycleFinalAlpha: animationLifecycle?.finish.finalInterpolationAlpha ?? 0,
    manimAnimationLifecycleFinalInterpolateCount: animationLifecycle?.finish.finalInterpolationCallCount ?? 0,
    manimAnimationLifecycleFinishAnimatingStatus: animationLifecycle?.finish.animatingStatus ?? "none",
    manimAnimationLifecycleFinishColorRoleCount: animationLifecycle?.finish.colorRoleCount ?? 0,
    manimAnimationLifecycleFinishNodeCount: animationLifecycle?.finish.targetNodeCount ?? 0,
    manimAnimationLifecycleInitialAlpha: animationLifecycle?.begin.initialInterpolationAlpha ?? 0,
    manimAnimationLifecycleInitialInterpolateCount: animationLifecycle?.begin.initialInterpolationCallCount ?? 0,
    manimAnimationLifecycleObjectId: animationLifecycle?.objectId ?? "none",
    manimAnimationLifecyclePersistentNodeCount: animationLifecycle?.finish.persistentNodeCount ?? 0,
    manimAnimationLifecyclePlanId: animationLifecycle?.animationPlanId ?? "none",
    manimAnimationLifecycleSignature: animationLifecycle?.signature ?? "none",
    manimAnimationLifecycleSourceContract: animationLifecycle?.sourceContract ?? ANIMATION_LIFECYCLE_SOURCE_CONTRACT,
    manimAnimationLifecycleSummary: animationLifecycle
      ? summarizeMathAnimationLifecyclePlan(animationLifecycle)
      : "animation-lifecycle:plan=none:object=none:target=none:familyTuples=0:begin=0:finish=0:suspended=0:timing=0.000:linear:lag=0.000:frames=0",
    manimAnimationLifecycleSuspendedUpdaterCount: animationLifecycle?.begin.suspendedUpdaterCount ?? 0,
    manimAnimationLifecycleTargetId: animationLifecycle?.targetObjectId ?? "none",
    manimAnimationLifecycleTimingFrameCount: animationLifecycle?.timing.frameCountAt60Fps ?? 0,
    manimAnimationLifecycleTimingLagRatio: animationLifecycle?.timing.lagRatio ?? 0,
    manimAnimationLifecycleTimingRateFunction: animationLifecycle?.timing.rateFunction ?? "linear",
    manimAnimationLifecycleTimingRunTime: animationLifecycle?.timing.runTimeSeconds ?? 0,
    manimAnimationObjectCount: animationPlanSummary.animatedObjectIds.length,
    manimAnimationOperationCount: animationPlanSummary.operationCount,
    manimAnimationPlanCount: animationPlanSummary.planCount,
    manimTransformBeginAlignedEntryCount: transformBegin?.alignment.entryCount ?? 0,
    manimTransformBeginAlignedPointPairCount: transformBegin?.alignment.alignedPointPairCount ?? 0,
    manimTransformBeginDataLockCount: transformBegin?.dataLocks.entryCount ?? 0,
    manimTransformBeginDataLockAlignmentSummary: transformBegin?.dataLocks.alignmentSummary ?? "none",
    manimTransformBeginDataLockKindSummary: transformBegin?.dataLocks.kindSummary ?? "none",
    manimTransformBeginDataLockSummary: transformBegin?.dataLocks.lockSummary ?? "none",
    manimTransformBeginEnteringCount: transformBegin?.alignment.enteringCount ?? 0,
    manimTransformBeginExitingCount: transformBegin?.alignment.exitingCount ?? 0,
    manimTransformBeginFamilyPairIds: transformBegin?.alignment.familyPairIds.join(",") || "none",
    manimTransformBeginFamilyPairSummary: transformBegin?.alignment.familyPairSummary ?? "none",
    manimTransformBeginLockedObjectIds: transformBegin?.dataLocks.lockedObjectIds.join(",") || "none",
    manimTransformBeginLockedPointCount: transformBegin?.dataLocks.lockedPointCount ?? 0,
    manimTransformBeginMatchedCount: transformBegin?.alignment.matchedCount ?? 0,
    manimTransformBeginMaxDepth: transformBegin?.alignment.maxDepth ?? 0,
    manimTransformBeginMovingObjectIds: transformBegin?.dataLocks.movingObjectIds.join(",") || "none",
    manimTransformBeginMovingPointCount: transformBegin?.dataLocks.movingPointCount ?? 0,
    manimTransformBeginObjectId: transformBegin?.objectId ?? "none",
    manimTransformBeginPlanId: transformBegin?.animationPlanId ?? "none",
    manimTransformBeginSignature: transformBegin?.signature ?? "none",
    manimTransformBeginSourceFamilyIds: transformBegin?.sourceFamilyIds.join(",") || "none",
    manimTransformBeginSourcePolicy: transformBegin?.sourcePolicy ?? TRANSFORM_BEGIN_SOURCE_POLICY,
    manimTransformBeginSummary: transformBegin
      ? summarizeMathTransformBeginPlan(transformBegin)
      : "transform-begin:plan=none:object=none:target=none:aligned=0:matched=0:pairs=0:pointPairs=0:locked=0:moving=0",
    manimTransformBeginTargetCreated: transformBegin?.targetCreated ?? false,
    manimTransformBeginTargetFamilyIds: transformBegin?.targetFamilyIds.join(",") || "none",
    manimTransformBeginTargetId: transformBegin?.targetObjectId ?? "none",
    manimTransformBeginTotalPointCount: transformBegin?.dataLocks.totalPointCount ?? 0,
    manimTransformBeginTypeMismatchCount: transformBegin?.alignment.typeMismatchCount ?? 0,
    manimTransformPathArcAngleRange: transformPathCatalog.arcAngleRange,
    manimTransformPathArcAxisSummary: transformPathCatalog.arcAxisSummary,
    manimTransformPathArcMidpointDeviationRange: transformPathCatalog.arcMidpointDeviationRange,
    manimTransformPathArcCount: transformPathCatalog.arcPathCount,
    manimTransformPathAuthoredCount: transformPathCatalog.authoredPathCount,
    manimTransformPathDegenerateArcCount: transformPathCatalog.degenerateArcCount,
    manimTransformPathEntries: transformPathCatalog.entries,
    manimTransformPathMidpointDeviationSummary: transformPathCatalog.midpointDeviationSummary,
    manimTransformPathNonPointFieldPolicy: transformPathCatalog.nonPointFieldPolicy,
    manimTransformPathObjectIds: transformPathCatalog.objectIds,
    manimTransformPathPointlikeFieldPolicy: transformPathCatalog.pointlikeFieldPolicy,
    manimTransformPathPlanCount: transformPathCatalog.animationPlanCount,
    manimTransformPathSampleAlpha: transformPathCatalog.sampleAlpha,
    manimTransformPathSampledCount: transformPathCatalog.sampledPathCount,
    manimTransformPathSampledMidpoints: transformPathCatalog.sampledMidpointSummary,
    manimTransformPathSourceContract: transformPathCatalog.sourceContract,
    manimTransformPathStraightCount: transformPathCatalog.straightPathCount,
    manimTransformPathSummaries: transformPathCatalog.pathSummaries,
    manimTransformPathSummary: transformPathCatalog.summary,
    manimRateFunctionAlphaPolicy: rateFunctionCatalog.alphaPolicy,
    manimRateFunctionEntries: rateFunctionCatalog.entries,
    manimRateFunctionIds: rateFunctionCatalog.rateFunctionIds,
    manimRateFunctionLinearCount: rateFunctionCatalog.linearStepCount,
    manimRateFunctionLinearDuration: rateFunctionCatalog.linearDuration,
    manimRateFunctionSmoothCount: rateFunctionCatalog.smoothStepCount,
    manimRateFunctionSmoothDuration: rateFunctionCatalog.smoothDuration,
    manimRateFunctionSourceContract: rateFunctionCatalog.sourceContract,
    manimRateFunctionStepCount: rateFunctionCatalog.stepCount,
    manimRateFunctionStepTypes: rateFunctionCatalog.stepTypes,
    manimRateFunctionSummary: rateFunctionCatalog.summary,
    manimLagRatioAnimationPlanCount: lagRatioCatalog.animationPlanCount,
    manimLagRatioAuthoredCount: lagRatioCatalog.authoredLagRatioCount,
    manimLagRatioCompositionCount: lagRatioCatalog.compositionCount,
    manimLagRatioCompositionIds: lagRatioCatalog.compositionIds,
    manimLagRatioEntries: lagRatioCatalog.entries,
    manimLagRatioMax: lagRatioCatalog.maxLagRatio,
    manimLagRatioNonZeroCount: lagRatioCatalog.nonZeroLagRatioCount,
    manimLagRatioObjectIds: lagRatioCatalog.objectIds,
    manimLagRatioSourceContract: lagRatioCatalog.sourceContract,
    manimLagRatioSubAlphaPolicy: lagRatioCatalog.subAlphaPolicy,
    manimLagRatioSummary: lagRatioCatalog.summary,
    manimLagRatioZeroCount: lagRatioCatalog.zeroLagRatioCount,
    manimUpdaterExecutionActiveCallSequence: updaterExecution.activeCallSequence.join(">") || "none",
    manimUpdaterExecutionActiveCount: updaterExecution.activeUpdaterCount,
    manimUpdaterExecutionActiveUpdaterIds: updaterExecution.activeUpdaterIds,
    manimUpdaterExecutionDependencyCount: updaterExecution.dependencyUpdaterCount,
    manimUpdaterExecutionDtAwareCount: updaterExecution.dtAwareUpdaterCount,
    manimUpdaterExecutionFamilyPaths: updaterExecution.familyPaths.join("|") || "none",
    manimUpdaterExecutionFamilyTraversalObjectIds: updaterExecution.familyTraversalObjectIds.join(",") || "none",
    manimUpdaterExecutionFamilyTraversalSummary: updaterExecution.familyTraversalSummary,
    manimUpdaterExecutionIdleObjectIds: updaterExecution.idleTraversalObjectIds.join(",") || "none",
    manimUpdaterExecutionMaxDepth: updaterExecution.maxDepth,
    manimUpdaterExecutionObjectIds: updaterExecution.traversalObjectIds.join(",") || "none",
    manimUpdaterExecutionOrderSummary: updaterExecution.orderSummary,
    manimUpdaterExecutionPhase: updaterExecution.phase,
    manimUpdaterExecutionRecursiveOrder: updaterExecution.recursiveOrder,
    manimUpdaterExecutionRows: updaterExecution.rows,
    manimUpdaterExecutionRowCount: updaterExecution.rowCount,
    manimUpdaterExecutionSignature: updaterExecution.signature,
    manimUpdaterExecutionSourceContract: updaterExecution.sourceContract,
    manimUpdaterExecutionSummary: summarizeMathUpdaterExecutionPlan(updaterExecution),
    manimUpdaterExecutionSuspendedCount: updaterExecution.suspendedUpdaterCount,
    manimUpdaterExecutionSuspendedUpdaterIds: updaterExecution.suspendedUpdaterIds,
    manimUpdaterExecutionTimelineCount: updaterExecution.timelineUpdaterCount,
    manimUpdaterExecutionUpdaterCount: updaterExecution.totalUpdaterCount,
    manimUpdaterSignatureCount: updaterSignature.totalUpdaterCount,
    manimUpdaterSignatureCallSignatures: updaterSignature.callSignatures.join("|") || "none",
    manimUpdaterSignatureDependencyCount: updaterSignature.dependencyUpdaterIds.length,
    manimUpdaterSignatureDependencyIds: updaterSignature.dependencyUpdaterIds.join(",") || "none",
    manimUpdaterSignatureDtAwareCount: updaterSignature.dtAwareUpdaterIds.length,
    manimUpdaterSignatureDtAwareIds: updaterSignature.dtAwareUpdaterIds.join(",") || "none",
    manimUpdaterSignatureEntries: updaterSignature.entries,
    manimUpdaterSignatureReceivesDeltaSecondsIds: updaterSignature.receivesDeltaSecondsIds.join(",") || "none",
    manimUpdaterSignatureReceivesTimelineProgressIds: updaterSignature.receivesTimelineProgressIds.join(",") || "none",
    manimUpdaterSignatureSignature: updaterSignature.signature,
    manimUpdaterSignatureSourceSummary: updaterSignature.sourceSummary,
    manimUpdaterSignatureSummary: summarizeMathUpdaterSignaturePlan(updaterSignature),
    manimUpdaterSignatureTimelineCount: updaterSignature.timelineUpdaterIds.length,
    manimUpdaterSignatureTimelineIds: updaterSignature.timelineUpdaterIds.join(",") || "none",
    manimUpdateFrameAction: updateFramePlan.action,
    manimUpdateFrameCallsCameraCapture: updateFramePlan.callsCameraCapture,
    manimUpdateFrameCallsIncrementTime: updateFramePlan.callsIncrementTime,
    manimUpdateFrameCallsUpdateMobjects: updateFramePlan.callsUpdateMobjects,
    manimUpdateFrameCallsWindowDispatchEvents: updateFramePlan.callsWindowDispatchEvents,
    manimUpdateFrameDtSeconds: updateFramePlan.dtSeconds,
    manimUpdateFrameForceDraw: updateFramePlan.forceDraw,
    manimUpdateFrameFramePolicy: updateFramePlan.framePolicy,
    manimUpdateFrameRenderGroupCount: updateFramePlan.renderGroupCount,
    manimUpdateFrameRenderGroupIds: updateFramePlan.capturedRenderGroupIds.join(",") || "none",
    manimUpdateFrameSceneTime: updateFramePlan.nextSceneTimeSeconds,
    manimUpdateFrameSkipAnimations: updateFramePlan.skipAnimations,
    manimUpdateFrameSleepSeconds: updateFramePlan.windowSleepSeconds,
    manimUpdateFrameSourceContract: updateFramePlan.sourceContract,
    manimUpdateFrameSummary: updateFramePlan.summary,
    manimUpdateFrameUpdateMobjectsDtSeconds: updateFramePlan.updateMobjectsDtSeconds,
    manimEmitFrameCameraId: emitFramePlan.cameraId,
    manimEmitFrameCallsFileWriter: emitFramePlan.callsFileWriterWriteFrame,
    manimEmitFrameCalled: emitFramePlan.callsSceneEmitFrame,
    manimEmitFrameFrameIndex: emitFramePlan.frameIndex,
    manimEmitFrameProgressDisplayActive: emitFramePlan.progressDisplayActive,
    manimEmitFrameReadsRawFbo: emitFramePlan.readsCameraRawFboData,
    manimEmitFrameSkipAnimations: emitFramePlan.skipAnimations,
    manimEmitFrameSourceContract: emitFramePlan.sourceContract,
    manimEmitFrameStatus: emitFramePlan.status,
    manimEmitFrameSummary: emitFramePlan.summary,
    manimEmitFrameUpdatesProgressDisplay: emitFramePlan.updatesProgressDisplay,
    manimEmitFrameWritePolicy: emitFramePlan.writePolicy,
    manimEmitFrameWritesMovieFrame: emitFramePlan.writesMovieFrame,
    manimEmitFrameWriteToMovie: emitFramePlan.writeToMovie,
    manimProgressThroughAnimationCount: progressThroughAnimationsPlan.animationCount,
    manimProgressThroughEmitFrameCount: progressThroughAnimationsPlan.emitFrameCallCount,
    manimProgressThroughEmitFrameStatuses: progressThroughAnimationsPlan.frames.map((frame) => frame.emitFrame.status).join(",") || "none",
    manimProgressThroughFinalAlphaSummary: progressThroughAnimationsPlan.finalAlphaSummary,
    manimProgressThroughFinalTime: progressThroughAnimationsPlan.finalTime,
    manimProgressThroughFps: progressThroughAnimationsPlan.fps,
    manimProgressThroughFrameInterval: progressThroughAnimationsPlan.frameInterval,
    manimProgressThroughFramePolicy: progressThroughAnimationsPlan.framePolicy,
    manimProgressThroughFrameOperationSequence: progressThroughAnimationsPlan.frameOperationSequenceSummary,
    manimProgressThroughFrameOrderSummary: progressThroughAnimationsPlan.frameOrderSummary,
    manimProgressThroughFrameCount: progressThroughAnimationsPlan.frameCount,
    manimProgressThroughFrames: progressThroughAnimationsPlan.frames,
    manimProgressThroughInterpolateCount: progressThroughAnimationsPlan.interpolateCallCount,
    manimProgressThroughRawAlphaOvershootAnimationIds: progressThroughAnimationsPlan.rawAlphaOvershootAnimationIds,
    manimProgressThroughRawAlphaOvershootCount: progressThroughAnimationsPlan.rawAlphaOvershootCount,
    manimProgressThroughRawAlphaSequenceSummary: progressThroughAnimationsPlan.rawAlphaSequenceSummary,
    manimProgressThroughRunTime: progressThroughAnimationsPlan.runTime,
    manimProgressThroughSkipAnimations: progressThroughAnimationsPlan.skipAnimations,
    manimProgressThroughSourceContract: progressThroughAnimationsPlan.sourceContract,
    manimProgressThroughSummary: progressThroughAnimationsPlan.summary,
    manimProgressThroughTimeProgression: progressThroughAnimationsPlan.timeProgression,
    manimProgressThroughTimeProgressionSummary: progressThroughAnimationsPlan.timeProgressionSummary,
    manimProgressThroughUpdateFrameActionSummary: progressThroughAnimationsPlan.updateFrameActionSummary,
    manimProgressThroughUpdateFrameCount: progressThroughAnimationsPlan.updateFrameCallCount,
    manimProgressThroughUpdateMobjectExclusionPolicy: progressThroughAnimationsPlan.updateMobjectExclusionPolicy,
    manimProgressThroughUpdateMobjectObjectDtSummary: progressThroughAnimationsPlan.updateMobjectObjectDtSummary,
    manimProgressThroughUpdateMobjectObjectCount: progressThroughAnimationsPlan.updateMobjectObjectCallCount,
    manimProgressThroughUpdateMobjectTargetSummary: progressThroughAnimationsPlan.updateMobjectTargetSummary,
    manimProgressThroughUpdateMobjectsCount: progressThroughAnimationsPlan.updateMobjectsCallCount,
    manimProgressThroughUpdateMobjectsDtSummary: progressThroughAnimationsPlan.updateMobjectsDtSummary,
    manimProgressThroughWrittenFrameCount: progressThroughAnimationsPlan.writtenFrameCount,
    manimPlayCompilationAnimationCount: playCompilationPlan.animationCount,
    manimPlayCompilationBuilderCount: playCompilationPlan.rows.filter((row) => row.kind === "builder" && row.valid).length,
    manimPlayCompilationCallOrder: playCompilationPlan.callOrderSummary,
    manimPlayCompilationCallOrderReady: playCompilationPlan.callOrderReady,
    manimPlayCompilationErrorMessageSummary: playCompilationPlan.errorMessageSummary,
    manimPlayCompilationInvalidCount: playCompilationPlan.invalidCount,
    manimPlayCompilationPipeline: scenePlayCompilationDataAttributes(playCompilationPlan)["data-viz-manim-play-compilation-pipeline"],
    manimPlayCompilationPreparePolicy: playCompilationPlan.preparePolicy,
    manimPlayCompilationPreparedIds: playCompilationPlan.preparedAnimationIds.join(",") || "none",
    manimPlayCompilationProtoCount: playCompilationPlan.protoAnimationCount,
    manimPlayCompilationRows: playCompilationPlan.rows,
    manimPlayCompilationRunTime: playCompilationPlan.maxRunTime,
    manimPlayCompilationSourceContract: playCompilationPlan.sourceContract,
    manimPlayCompilationSummary: playCompilationPlan.summary,
    manimPlayCompilationUpdateRateCount: playCompilationPlan.updateRateInfoCallCount,
    manimPlayCompilationWarningMessage: playCompilationPlan.warningMessage ?? "none",
    manimPlayCompilationWarningEmpty: playCompilationPlan.warningNoAnimations,
    manimBeginAnimationsAddedCount: beginAnimationsPlan.addedObjectCount,
    manimBeginAnimationsAddedFamilyIds: beginAnimationsPlan.addedFamilyIds,
    manimBeginAnimationsAddedIds: beginAnimationsPlan.addedObjectIds.join(",") || "none",
    manimBeginAnimationsBeginCount: beginAnimationsPlan.beginCallCount,
    manimBeginAnimationsCount: beginAnimationsPlan.animationCount,
    manimBeginAnimationsLifecycleSummary: beginAnimationsPlan.beginLifecycleSummary,
    manimBeginAnimationsFinalSceneFamilyIds: beginAnimationsPlan.finalSceneFamilyIds,
    manimBeginAnimationsFamilyCountAfter: beginAnimationsPlan.sceneFamilyCountAfter,
    manimBeginAnimationsFamilyCountBefore: beginAnimationsPlan.sceneFamilyCountBefore,
    manimBeginAnimationsInitialSceneFamilyIds: beginAnimationsPlan.initialSceneFamilyIds,
    manimBeginAnimationsInterpolateZeroCount: beginAnimationsPlan.interpolateZeroCallCount,
    manimBeginAnimationsRows: beginAnimationsPlan.rows,
    manimBeginAnimationsRunTime: beginAnimationsPlan.maxRunTime,
    manimBeginAnimationsSceneAddCount: beginAnimationsPlan.sceneAddCallCount,
    manimBeginAnimationsSetAnimatingStatusCount: beginAnimationsPlan.setAnimatingStatusCount,
    manimBeginAnimationsSourceContract: beginAnimationsPlan.sourceContract,
    manimBeginAnimationsStartStatePolicy: beginAnimationsPlan.startStatePolicy,
    manimBeginAnimationsStartingCopyCount: beginAnimationsPlan.startingMobjectCopyCount,
    manimBeginAnimationsStartingCopyIds: beginAnimationsPlan.startingMobjectIds.join(",") || "none",
    manimBeginAnimationsSummary: beginAnimationsPlan.summary,
    manimBeginAnimationsSuspendCount: beginAnimationsPlan.suspendUpdatingCallCount,
    manimFinishAnimationsCleanupCount: finishAnimationsPlan.cleanUpCallCount,
    manimFinishAnimationsCleanupPolicy: finishAnimationsPlan.cleanupPolicy,
    manimFinishAnimationsCount: finishAnimationsPlan.animationCount,
    manimFinishAnimationsFinalAlphaSummary: finishAnimationsPlan.finalAlphaSummary,
    manimFinishAnimationsFinishCount: finishAnimationsPlan.finishCallCount,
    manimFinishAnimationsLifecycleSummary: finishAnimationsPlan.finishLifecycleSummary,
    manimFinishAnimationsRemovedCount: finishAnimationsPlan.removedObjectCount,
    manimFinishAnimationsRemovedIds: finishAnimationsPlan.removedObjectIds.join(",") || "none",
    manimFinishAnimationsResumeCount: finishAnimationsPlan.resumeUpdatingCallCount,
    manimFinishAnimationsResumeDtSummary: finishAnimationsPlan.resumeUpdaterDtSummary,
    manimFinishAnimationsResumeIds: finishAnimationsPlan.resumeObjectIds.join(",") || "none",
    manimFinishAnimationsResumePolicy: finishAnimationsPlan.resumePolicy,
    manimFinishAnimationsRows: finishAnimationsPlan.rows,
    manimFinishAnimationsRunTime: finishAnimationsPlan.runTime,
    manimFinishAnimationsSceneUpdateDt: finishAnimationsPlan.sceneUpdateMobjectsDt,
    manimFinishAnimationsSetAnimatingStatusFalseCount: finishAnimationsPlan.setAnimatingStatusFalseCount,
    manimFinishAnimationsSkipAnimations: finishAnimationsPlan.skipAnimations,
    manimFinishAnimationsSourceContract: finishAnimationsPlan.sourceContract,
    manimFinishAnimationsSummary: finishAnimationsPlan.summary,
    manimPrePlayBeginAnimationCount: prePlayControlPlan.beginAnimationCount,
    manimPrePlayConstructorForcedSkip: prePlayControlPlan.constructorForcedSkip,
    manimPrePlayEndScenePlay: prePlayControlPlan.endScenePlayIndex === null ? "none" : String(prePlayControlPlan.endScenePlayIndex),
    manimPrePlayFinalSkipAnimations: prePlayControlPlan.finalSkipAnimations,
    manimPrePlayHasWindow: prePlayControlPlan.hasWindow,
    manimPrePlayPresenterHoldCount: prePlayControlPlan.presenterHoldCount,
    manimPrePlayProcessedPlayCount: prePlayControlPlan.processedPlayCount,
    manimPrePlayRows: prePlayControlPlan.rows,
    manimPrePlaySkipGatePolicy: prePlayControlPlan.skipGatePolicy,
    manimPrePlaySourceContract: prePlayControlPlan.sourceContract,
    manimPrePlayStartGateCount: prePlayControlPlan.startGateCount,
    manimPrePlayStopSkippingClockResetCount: prePlayControlPlan.stopSkippingClockResetCount,
    manimPrePlaySummary: prePlayControlPlan.summary,
    manimPrePlayTruncated: prePlayControlPlan.truncatedByEndScene,
    manimPrePlayWindowClockResetCount: prePlayControlPlan.windowClockResetCount,
    manimPostPlayPreviewEndedAnimationCount: postPlayPreviewPlan.endedAnimationCount,
    manimPostPlayPreviewForcedCount: postPlayPreviewPlan.forcedPreviewCount,
    manimPostPlayPreviewHasWindow: postPlayPreviewPlan.hasWindow,
    manimPostPlayPreviewNumPlaysReady: postPlayPreviewPlan.numPlaysReady,
    manimPostPlayPreviewNumPlaysSequence: postPlayPreviewPlan.numPlaysSequence,
    manimPostPlayPreviewPlayCount: postPlayPreviewPlan.playCount,
    manimPostPlayPreviewPolicy: postPlayPreviewPlan.previewPolicy,
    manimPostPlayPreviewPreviewWhileSkipping: postPlayPreviewPlan.previewWhileSkipping,
    manimPostPlayPreviewRows: postPlayPreviewPlan.rows,
    manimPostPlayPreviewSkipAnimations: postPlayPreviewPlan.skipAnimations,
    manimPostPlayPreviewSourceContract: postPlayPreviewPlan.sourceContract,
    manimPostPlayPreviewSummary: postPlayPreviewPlan.summary,
    manimPostCellRedrawAction: postCellRedrawPlan.updateFrameAction,
    manimPostCellRedrawCheckpointKey: postCellRedrawPlan.checkpointKey,
    manimPostCellRedrawCommentCount: postCellRedrawPlan.commentLineCount,
    manimPostCellRedrawCommentLabelPolicy: postCellRedrawPlan.commentLabelPolicy,
    manimPostCellRedrawDtSeconds: postCellRedrawPlan.dtSeconds,
    manimPostCellRedrawForceDraw: postCellRedrawPlan.forceDraw,
    manimPostCellRedrawHasWindow: postCellRedrawPlan.hasWindow,
    manimPostCellRedrawLineCount: postCellRedrawPlan.lineCount,
    manimPostCellRedrawOperationCount: postCellRedrawPlan.operationLineCount,
    manimPostCellRedrawPolicy: postCellRedrawPlan.redrawPolicy,
    manimPostCellRedrawReady: postCellRedrawPlan.ready,
    manimPostCellRedrawSkipAnimations: postCellRedrawPlan.skipAnimations,
    manimPostCellRedrawSourceContract: postCellRedrawPlan.sourceContract,
    manimPostCellRedrawSourceLabel: postCellRedrawPlan.sourceLabel,
    manimPostCellRedrawSummary: postCellRedrawPlan.summary,
    manimShortcutCheckpointCount: shortcutCatalog.checkpointShortcutCount,
    manimShortcutCount: shortcutCatalog.totalShortcutCount,
    manimShortcutHistoryCount: shortcutCatalog.historyShortcutCount,
    manimShortcutIds: shortcutCatalog.ids.join(",") || "none",
    manimShortcutPlaybackCount: shortcutCatalog.playbackShortcutCount,
    manimShortcutRedrawCount: shortcutCatalog.redrawAfterCellCount,
    manimShortcutReloadReady: shortcutCatalog.reloadReady,
    manimShortcutSceneGraphCount: shortcutCatalog.sceneGraphShortcutCount,
    manimShortcutSourceContract: shortcutCatalog.sourceContract,
    manimShortcutStateCount: shortcutCatalog.stateShortcutCount,
    manimShortcutAuthoringPolicy: shortcutCatalog.shortcutAuthoringPolicy,
    manimShortcutSummary: shortcutCatalog.summary,
    manimReloadCheckpointCount: reloadPlan.checkpointCount,
    manimReloadClearsSnippet: reloadPlan.clearsSnippet,
    manimReloadFrameAfter: reloadPlan.frameIndexAfter,
    manimReloadHistoryLabel: reloadPlan.historyLabel,
    manimReloadReady: reloadPlan.ready,
    manimReloadResetPolicy: reloadPlan.resetPolicy,
    manimReloadResetsElapsed: reloadPlan.resetsElapsed,
    manimReloadResetsFrame: reloadPlan.resetsFrame,
    manimReloadSceneId: reloadPlan.sceneId,
    manimReloadSelectedFamilyId: reloadPlan.selectedFamilyId,
    manimReloadSelectedSceneId: reloadPlan.selectedSceneId,
    manimReloadSourceContract: reloadPlan.sourceContract,
    manimReloadSummary: reloadPlan.summary,
    manimSkippingWindowConstructorForcedSkip: skippingWindowPlan.constructorForcedSkip,
    manimSkippingWindowEndAt: skippingWindowPlan.endAtAnimationNumber === null ? "none" : String(skippingWindowPlan.endAtAnimationNumber),
    manimSkippingWindowEndScenePlay: skippingWindowPlan.endScenePlayIndex === null ? "none" : String(skippingWindowPlan.endScenePlayIndex),
    manimSkippingWindowFinalSkipAnimations: skippingWindowPlan.finalSkipAnimations,
    manimSkippingWindowGatePolicy: skippingWindowPlan.gatePolicy,
    manimSkippingWindowPlayCount: skippingWindowPlan.playCount,
    manimSkippingWindowRenderedPlayCount: skippingWindowPlan.renderedPlayCount,
    manimSkippingWindowSkippedPlayCount: skippingWindowPlan.skippedPlayCount,
    manimSkippingWindowSourceContract: skippingWindowPlan.sourceContract,
    manimSkippingWindowStartAt: skippingWindowPlan.startAtAnimationNumber === null ? "none" : String(skippingWindowPlan.startAtAnimationNumber),
    manimSkippingWindowSummary: skippingWindowPlan.summary,
    manimSkippingWindowTruncated: skippingWindowPlan.truncatedByEndScene,
    manimRunFromBeatCheckpointCount: runFromBeatPlan.checkpointKeyCount,
    manimRunFromBeatCheckpointInvalidatesCount: runFromBeatPlan.invalidatesLaterCheckpointCount,
    manimRunFromBeatCheckpointInvalidatedKeys: runFromBeatPlan.invalidatedCheckpointKeys.join("|") || "none",
    manimRunFromBeatCheckpointInvalidationSummary: runFromBeatPlan.checkpointInvalidationSummary,
    manimRunFromBeatCheckpointKeys: runFromBeatPlan.checkpointKeys.join("|") || "none",
    manimRunFromBeatCheckpointPolicy: runFromBeatPlan.checkpointPolicy,
    manimRunFromBeatCheckpointRetainedKeysAfterRestore: runFromBeatPlan.retainedCheckpointKeysAfterRestore.join("|") || "none",
    manimRunFromBeatCheckpointRestoreAction: runFromBeatPlan.checkpointRestoreAction,
    manimRunFromBeatCheckpointRestoreKey: runFromBeatPlan.checkpointRestoreKey,
    manimRunFromBeatCheckpointRestoreMode: runFromBeatPlan.checkpointRestoreMode,
    manimRunFromBeatCheckpointRestoreReady: runFromBeatPlan.checkpointRestoreReady,
    manimRunFromBeatCheckpointSummary: runFromBeatPlan.checkpointSummary,
    manimRunFromBeatCompositionId: runFromBeatPlan.compositionId,
    manimRunFromBeatCompositionReplayPolicy: runFromBeatPlan.compositionReplayPolicy,
    manimRunFromBeatCompositionReplayReady: runFromBeatPlan.compositionReplayReady,
    manimRunFromBeatCompositionReplaySummary: runFromBeatPlan.compositionReplaySummary,
    manimRunFromBeatCompositionType: runFromBeatPlan.compositionType,
    manimRunFromBeatCompositionWindowCount: runFromBeatPlan.compositionWindowCount,
    manimRunFromBeatCompositionWindowIds: runFromBeatPlan.compositionWindowIds.join("|") || "none",
    manimRunFromBeatCompositionWindowSummary: runFromBeatPlan.compositionWindowSummary,
    manimRunFromBeatElapsedBefore: runFromBeatPlan.elapsedBeforeReplay,
    manimRunFromBeatFinalElapsed: runFromBeatPlan.finalElapsedSeconds,
    manimRunFromBeatNormalizedIndex: runFromBeatPlan.normalizedBeatIndex,
    manimRunFromBeatPreparedCount: runFromBeatPlan.preparedBeatIndices.length,
    manimRunFromBeatPreparedIndices: runFromBeatPlan.preparedBeatIndices.join(",") || "none",
    manimRunFromBeatReady: runFromBeatPlan.ready,
    manimRunFromBeatReplayCount: runFromBeatPlan.replayPlayCount,
    manimRunFromBeatReplayIndices: runFromBeatPlan.replayBeatIndices.join(",") || "none",
    manimRunFromBeatReplayPolicy: runFromBeatPlan.replayPolicy,
    manimRunFromBeatRequestedIndex: runFromBeatPlan.requestedBeatIndex,
    manimRunFromBeatSkippedBeforeCount: runFromBeatPlan.skippedBeforeCount,
    manimRunFromBeatSourceContract: runFromBeatPlan.sourceContract,
    manimRunFromBeatSummary: runFromBeatPlan.summary,
    manimRunFromBeatTotalPlayCount: runFromBeatPlan.totalPlayCount,
    manimSkipControlActionSummary: skipControlPlan.transitions.map((transition) => transition.action).join(",") || "none",
    manimSkipControlFinalOriginalStatus: skipControlPlan.finalOriginalSkippingStatus,
    manimSkipControlFinalSkipAnimations: skipControlPlan.finalSkipAnimations,
    manimSkipControlFinalTempPreviousStatus: skipControlPlan.finalTempSkipPreviousStatus,
    manimSkipControlHasOriginalStatus: skipControlPlan.finalHasOriginalSkippingStatus,
    manimSkipControlSkippedTransitionCount: skipControlPlan.skippedTransitionCount,
    manimSkipControlSourceContract: skipControlPlan.sourceContract,
    manimSkipControlStatePolicy: skipControlPlan.statePolicy,
    manimSkipControlStoppedTransitionCount: skipControlPlan.stoppedTransitionCount,
    manimSkipControlSummary: skipControlPlan.summary,
    manimSkipControlTransitionCount: skipControlPlan.transitionCount,
    manimSkipControlTransitions: skipControlPlan.transitions,
    manimPlaybackActivePlayIndex: playbackLifecycle.activePlayIndex,
    manimPlaybackActiveEventSummary: summarizeScenePlaybackEventStream(activePlaybackEvents),
    manimPlaybackCompletedPlayCount: playbackLifecycle.completedPlayCount,
    manimPlaybackEventCount: playbackEvents.length,
    manimPlaybackLifecyclePhase: playbackLifecycle.lifecyclePhase,
    manimPlaybackLifecycleSummary: playbackLifecycle.lifecycleSummary,
    manimPlaybackPendingPlayCount: playbackLifecycle.pendingPlayCount,
    manimPlaybackSourceContract: playbackPlan.sourceContract,
    manimPlaybackUpdatesDuringActivePlay: playbackLifecycle.updatesDuringActivePlay,
    manimRandomSeed: randomSeed.seed,
    manimRandomSeedAlgorithm: randomSeed.algorithm,
    manimRandomSeedSignature: randomSeed.signature,
    manimSceneInitCameraFrameReady: sceneInitialization.cameraFrameReady,
    manimSceneInitCameraReady: sceneInitialization.cameraReady,
    manimSceneInitFileWriterReady: sceneInitialization.fileWriterReady,
    manimSceneInitNumPlays: sceneInitialization.numPlays,
    manimSceneInitRandomSeedSignature: sceneInitialization.randomSeedSignature,
    manimSceneInitReady: sceneInitialization.ready,
    manimSceneInitRedoCount: sceneInitialization.redoStackCount,
    manimSceneInitRenderGroupCount: sceneInitialization.renderGroupCount,
    manimSceneInitRenderGroupIds: sceneInitialization.renderGroupIds,
    manimSceneInitSourceContract: sceneInitialization.sourceContract,
    manimSceneInitSourceSummary: sceneInitialization.sourceSummary,
    manimSceneInitSummary: sceneInitialization.summary,
    manimSceneInitTimeSeconds: sceneInitialization.sceneTimeSeconds,
    manimSceneInitTopLevelMobjectCount: sceneInitialization.topLevelMobjectCount,
    manimSceneInitUndoCount: sceneInitialization.undoStackCount,
    manimCaptureByteCount: capturePlan.byteCount,
    manimCaptureCameraShot: capturePlan.cameraShotId,
    manimCaptureElapsedSeconds: capturePlan.elapsedSeconds,
    manimCaptureFramebufferId: capturePlan.framebufferId,
    manimCaptureFramebufferStatus: capturePlan.framebufferStatus,
    manimCaptureFps: capturePlan.fps,
    manimCaptureFrameCount: capturePlan.frameCount,
    manimCaptureHeight: capturePlan.height,
    manimCaptureKind: capturePlan.kind,
    manimCaptureQualityPreset: capturePlan.renderQualityPreset,
    manimCaptureRendererMode: capturePlan.renderQualityRendererMode,
    manimCaptureRequestCount: capturePlan.requestCount,
    manimCaptureDevicePixelRatio: capturePlan.renderQualityDevicePixelRatio,
    manimCaptureSamplesPerPixel: capturePlan.renderQualitySamplesPerPixel,
    manimCaptureTransparentBackground: capturePlan.renderQualityTransparentBackground,
    manimCaptureBackgroundColor: capturePlan.renderQualityBackgroundColor,
    manimCaptureBackgroundAlpha: capturePlan.renderQualityBackgroundAlpha,
    manimCaptureRenderGroupCount: capturePlan.renderGroupCount,
    manimCaptureRenderGroupIds: capturePlan.renderGroupIds,
    manimCaptureRenderGroupSummary: capturePlan.renderGroupSummary,
    manimCaptureRenderPassSummary: capturePlan.renderPassSummary,
    manimCaptureSceneSignature: capturePlan.sceneSignature,
    manimCaptureSourceContract: capturePlan.sourceContract,
    manimCaptureStatus: capturePlan.status,
    manimCaptureSummary: capturePlan.summary,
    manimCaptureTarget: capturePlan.captureTarget,
    manimCaptureWidth: capturePlan.width,
    manimRenderQualityAlpha: renderQualityPlan.backgroundAlpha,
    manimRenderQualityAntialias: renderQualityPlan.antialias,
    manimRenderQualityBackground: renderQualityPlan.backgroundColor,
    manimRenderQualityCaptureFps: renderQualityPlan.captureFps,
    manimRenderQualityCaptureHeight: renderQualityPlan.captureHeight,
    manimRenderQualityCaptureWidth: renderQualityPlan.captureWidth,
    manimRenderQualityDevicePixelRatio: renderQualityPlan.devicePixelRatio,
    manimRenderQualityHeight: renderQualityPlan.height,
    manimRenderQualityPixelCount: renderQualityPlan.pixelCount,
    manimRenderQualityPreset: renderQualityPlan.preset,
    manimRenderQualityRendererMode: renderQualityPlan.rendererMode,
    manimRenderQualitySamplesPerPixel: renderQualityPlan.samplesPerPixel,
    manimRenderQualitySourceContract: renderQualityPlan.sourceContract,
    manimRenderQualitySummary: renderQualityPlan.summary,
    manimRenderQualityTransparent: renderQualityPlan.transparentBackground,
    manimRenderQualityWidth: renderQualityPlan.width,
    manimFileWriterArtifactCount: fileWriterPlan.artifactCount,
    manimFileWriterArtifactFileSummary: fileWriterPlan.artifactFileSummary,
    manimFileWriterArtifactKindSummary: fileWriterPlan.artifactKindSummary,
    manimFileWriterArtifactMimeSummary: fileWriterPlan.artifactMimeSummary,
    manimFileWriterByteCount: fileWriterPlan.byteCount,
    manimFileWriterCaptureBackgroundAlpha: fileWriterPlan.captureBackgroundAlpha,
    manimFileWriterCaptureBackgroundColor: fileWriterPlan.captureBackgroundColor,
    manimFileWriterCaptureDevicePixelRatio: fileWriterPlan.captureDevicePixelRatio,
    manimFileWriterCaptureFps: fileWriterPlan.captureFps,
    manimFileWriterCaptureHeight: fileWriterPlan.captureHeight,
    manimFileWriterCaptureKind: fileWriterPlan.captureKind,
    manimFileWriterCaptureQualityPreset: fileWriterPlan.captureQualityPreset,
    manimFileWriterCaptureRendererMode: fileWriterPlan.captureRendererMode,
    manimFileWriterCaptureSamplesPerPixel: fileWriterPlan.captureSamplesPerPixel,
    manimFileWriterCaptureStatus: fileWriterPlan.captureStatus,
    manimFileWriterCaptureTransparentBackground: fileWriterPlan.captureTransparentBackground,
    manimFileWriterCaptureWidth: fileWriterPlan.captureWidth,
    manimFileWriterFrameCount: fileWriterPlan.frameCount,
    manimFileWriterJsonArtifactCount: fileWriterPlan.jsonArtifactCount,
    manimFileWriterMediaArtifactCount: fileWriterPlan.mediaArtifactCount,
    manimFileWriterOutputSlug: fileWriterPlan.outputSlug,
    manimFileWriterReady: fileWriterPlan.ready,
    manimFileWriterSceneId: fileWriterPlan.sceneId,
    manimFileWriterSignature: fileWriterPlan.signature,
    manimFileWriterSourceContract: fileWriterPlan.sourceContract,
    manimFileWriterSummary: fileWriterPlan.summary,
    manimFileWriterSegmentActionSummary: fileWriterSegmentPlan.actionSummary,
    manimFileWriterSegmentCloseCount: fileWriterSegmentPlan.closePipeCount,
    manimFileWriterSegmentCount: fileWriterSegmentPlan.segmentCount,
    manimFileWriterSegmentRows: fileWriterSegmentPlan.rows,
    manimFileWriterSegmentFinalFileSummary: fileWriterSegmentPlan.finalFileSummary,
    manimFileWriterSegmentInsertIndex: fileWriterSegmentPlan.insertIndex === null ? "none" : String(fileWriterSegmentPlan.insertIndex),
    manimFileWriterSegmentInsertPath: fileWriterSegmentPlan.insertFilePath,
    manimFileWriterSegmentOpenCount: fileWriterSegmentPlan.openPipeCount,
    manimFileWriterSegmentPartialIndex: fileWriterSegmentPlan.partialMovieIndex,
    manimFileWriterSegmentPartialIndexPadded: fileWriterSegmentPlan.partialMovieIndexPadded,
    manimFileWriterSegmentPartialPath: fileWriterSegmentPlan.partialMoviePath,
    manimFileWriterSegmentPartialPathReady: fileWriterSegmentPlan.partialPathReady,
    manimFileWriterSegmentSkippedCount: fileWriterSegmentPlan.skippedCount,
    manimFileWriterSegmentSourceContract: fileWriterSegmentPlan.sourceContract,
    manimFileWriterSegmentSubdivideOutput: fileWriterSegmentPlan.subdivideOutput,
    manimFileWriterSegmentSummary: fileWriterSegmentPlan.summary,
    manimFileWriterSegmentTempFileCount: fileWriterSegmentPlan.tempFileCount,
    manimFileWriterSegmentTempRecord: fileWriterSegmentPlan.tempRecordRequested,
    manimFileWriterSegmentWriteToMovie: fileWriterSegmentPlan.writeToMovie,
    manimPlaybackFileWriterBridgeMismatchCount: playbackFileWriterBridgePlan.mismatchCount,
    manimPlaybackFileWriterBridgePartialIndexSequence: playbackFileWriterBridgePlan.partialIndexSequence,
    manimPlaybackFileWriterBridgePartialPathSummary: playbackFileWriterBridgePlan.partialPathSummary,
    manimPlaybackFileWriterBridgeReady: playbackFileWriterBridgePlan.ready,
    manimPlaybackFileWriterBridgeRowCount: playbackFileWriterBridgePlan.rowCount,
    manimPlaybackFileWriterBridgeSourceContract: playbackFileWriterBridgePlan.sourceContract,
    manimPlaybackFileWriterBridgeSummary: playbackFileWriterBridgePlan.summary,
    manimFileWriterCombineAction: fileWriterCombinePlan.action,
    manimFileWriterCombineConcatManifestPath: fileWriterCombinePlan.concatManifestPath,
    manimFileWriterCombineDuplicatePartialCount: fileWriterCombinePlan.duplicatePartialCount,
    manimFileWriterCombineFinalPath: fileWriterCombinePlan.finalMoviePath,
    manimFileWriterCombineMismatchCount: fileWriterCombinePlan.mismatchCount,
    manimFileWriterCombineOrdered: fileWriterCombinePlan.ordered,
    manimFileWriterCombinePartialCount: fileWriterCombinePlan.partialMovieCount,
    manimFileWriterCombinePartialIndexSequence: fileWriterCombinePlan.partialIndexSequence,
    manimFileWriterCombinePartialPathSummary: fileWriterCombinePlan.partialPathSummary,
    manimFileWriterCombineReady: fileWriterCombinePlan.ready,
    manimFileWriterCombineSourceContract: fileWriterCombinePlan.sourceContract,
    manimFileWriterCombineSummary: fileWriterCombinePlan.summary,
    manimCheckpointFileWriterBridgeCloseInsertPipe: checkpointFileWriterBridgePlan.closeInsertPipe,
    manimCheckpointFileWriterBridgeInsertIndex: checkpointFileWriterBridgePlan.insertIndex === null ? "none" : String(checkpointFileWriterBridgePlan.insertIndex),
    manimCheckpointFileWriterBridgeInsertPath: checkpointFileWriterBridgePlan.insertFilePath,
    manimCheckpointFileWriterBridgeKey: checkpointFileWriterBridgePlan.checkpointKey,
    manimCheckpointFileWriterBridgeOpenInsertPipe: checkpointFileWriterBridgePlan.openInsertPipe,
    manimCheckpointFileWriterBridgeReady: checkpointFileWriterBridgePlan.ready,
    manimCheckpointFileWriterBridgeRecord: checkpointFileWriterBridgePlan.checkpointRecordRequested,
    manimCheckpointFileWriterBridgeSceneId: checkpointFileWriterBridgePlan.sceneId,
    manimCheckpointFileWriterBridgeSegmentActionSummary: checkpointFileWriterBridgePlan.segmentActionSummary,
    manimCheckpointFileWriterBridgeSegmentCount: checkpointFileWriterBridgePlan.segmentCount,
    manimCheckpointFileWriterBridgeSourceContract: checkpointFileWriterBridgePlan.sourceContract,
    manimCheckpointFileWriterBridgeSummary: checkpointFileWriterBridgePlan.summary,
    manimCheckpointFileWriterBridgeTempRecord: checkpointFileWriterBridgePlan.fileWriterTempRecordRequested,
    manimSceneRunFileWriterFinishCallOrder: sceneRunFileWriterFinishBridgePlan.finishCallOrderSummary,
    manimSceneRunFileWriterFinishCombineAction: sceneRunFileWriterFinishBridgePlan.combineAction,
    manimSceneRunFileWriterFinishConcatManifestPath: sceneRunFileWriterFinishBridgePlan.concatManifestPath,
    manimSceneRunFileWriterFinishFinalPath: sceneRunFileWriterFinishBridgePlan.finalMoviePath,
    manimSceneRunFileWriterFinishPartialCount: sceneRunFileWriterFinishBridgePlan.partialMovieCount,
    manimSceneRunFileWriterFinishReady: sceneRunFileWriterFinishBridgePlan.finishReady,
    manimSceneRunFileWriterFinishRequired: sceneRunFileWriterFinishBridgePlan.finishRequired,
    manimSceneRunFileWriterFinishSceneId: sceneRunFileWriterFinishBridgePlan.sceneId,
    manimSceneRunFileWriterFinishSourceContract: sceneRunFileWriterFinishBridgePlan.sourceContract,
    manimSceneRunFileWriterFinishStatus: sceneRunFileWriterFinishBridgePlan.finishStatus,
    manimSceneRunFileWriterFinishSummary: sceneRunFileWriterFinishBridgePlan.summary,
    manimSceneRunFileWriterFinishTearDownActions: sceneRunFileWriterFinishBridgePlan.tearDownActionSummary,
    manimSceneRunFileWriterFinishTearDownReady: sceneRunFileWriterFinishBridgePlan.tearDownReady,
    manimSceneRunActivePhase: sceneRunLifecycle.activePhase,
    manimSceneRunActivePhaseIndex: sceneRunLifecycle.activePhaseIndex,
    manimSceneRunConstructActionSummary: sceneRunLifecycle.constructActionSummary,
    manimSceneRunConstructBindingCount: sceneRunLifecycle.constructBindingCount,
    manimSceneRunConstructComplete: sceneRunLifecycle.constructComplete,
    manimSceneRunConstructFormulaCount: sceneRunLifecycle.constructFormulaCount,
    manimSceneRunConstructObjectCount: sceneRunLifecycle.constructObjectCount,
    manimSceneRunElapsedSeconds: sceneRunLifecycle.elapsedSeconds,
    manimSceneRunInteractEnabled: sceneRunLifecycle.interactEnabled,
    manimSceneRunNumPlays: sceneRunLifecycle.numPlays,
    manimSceneRunPhaseCount: sceneRunLifecycle.phaseCount,
    manimSceneRunPhaseStatusSummary: sceneRunLifecycle.phaseStatusSummary,
    manimSceneRunPlayDurationSeconds: sceneRunLifecycle.playDurationSeconds,
    manimSceneRunReady: sceneRunLifecycle.ready,
    manimSceneRunCallOrderSummary: sceneRunLifecycle.runCallOrderSummary,
    manimSceneRunSceneId: sceneRunLifecycle.sceneId,
    manimSceneRunSceneSignature: sceneRunLifecycle.sceneSignature,
    manimSceneRunSetupActionSummary: sceneRunLifecycle.setupActionSummary,
    manimSceneRunSetupComplete: sceneRunLifecycle.setupComplete,
    manimSceneRunSignature: sceneRunLifecycle.signature,
    manimSceneRunSourceContract: sceneRunLifecycle.sourceContract,
    manimSceneRunSkippedPhaseCount: sceneRunLifecycle.skippedPhaseCount,
    manimSceneRunSkippedPhaseIds: sceneRunLifecycle.skippedPhaseIds,
    manimSceneRunSummary: sceneRunLifecycle.summary,
    manimSceneRunTearDownActionSummary: sceneRunLifecycle.tearDownActionSummary,
    manimSceneRunTearDownReady: sceneRunLifecycle.tearDownReady,
    manimSceneRunTotalDuration: sceneRunLifecycle.totalDuration,
    manimSceneSelectorApprovedCount: sceneSelectorSummary.approvedSceneCount,
    manimSceneSelectorCount: sceneSelectorSummary.sceneCount,
    manimSceneSelectorFamilyIds: sceneSelectorSummary.familyIds,
    manimSceneSelectorSceneIds: sceneSelectorSummary.sceneIds,
    manimSceneSelectorSelectedFamilyId: sceneSelectorSummary.activeFamilyId,
    manimSceneSelectorSelectedSceneId: sceneSelectorSummary.activeSceneId,
    manimSceneSelectorSummary: sceneSelectorSummary.summary,
    manimInteractLoopDtSeconds: interactLoopPlan.dtSeconds,
    manimInteractLoopFinalSceneTimeSeconds: interactLoopPlan.finalSceneTimeSeconds,
    manimInteractLoopFinalSkipAnimations: interactLoopPlan.finalSkipAnimations,
    manimInteractLoopFrameCount: interactLoopPlan.frameCount,
    manimInteractLoopFrames: interactLoopPlan.frames,
    manimInteractLoopHasWindow: interactLoopPlan.hasWindow,
    manimInteractLoopInitialSkipAnimations: interactLoopPlan.initialSkipAnimations,
    manimInteractLoopLogsInteractionTips: interactLoopPlan.logsInteractionTips,
    manimInteractLoopMaxFrames: interactLoopPlan.maxFrames,
    manimInteractLoopSetsSkipAnimationsFalse: interactLoopPlan.setsSkipAnimationsFalse,
    manimInteractLoopSourceContract: interactLoopPlan.sourceContract,
    manimInteractLoopStatePolicy: interactLoopPlan.statePolicy,
    manimInteractLoopSummary: interactLoopPlan.summary,
    manimInteractLoopTermination: interactLoopPlan.termination,
    manimInteractLoopUpdateFrameActions: interactLoopPlan.frames.map((frame) => frame.updateFrame.action).join(",") || "none",
    manimInteractLoopUpdateFrameCallCount: interactLoopPlan.updateFrameCallCount,
    manimSceneRunInteractActivePhase: sceneRunInteractBridgePlan.activePhase,
    manimSceneRunInteractCallOrderSummary: sceneRunInteractBridgePlan.callOrderSummary,
    manimSceneRunInteractCallsInteract: sceneRunInteractBridgePlan.callsInteract,
    manimSceneRunInteractBridgeEnabled: sceneRunInteractBridgePlan.interactEnabled,
    manimSceneRunInteractLoopFrameCount: sceneRunInteractBridgePlan.loopFrameCount,
    manimSceneRunInteractLoopHasWindow: sceneRunInteractBridgePlan.loopHasWindow,
    manimSceneRunInteractReadyForTearDown: sceneRunInteractBridgePlan.readyForTearDown,
    manimSceneRunInteractSceneId: sceneRunInteractBridgePlan.sceneId,
    manimSceneRunInteractSourceContract: sceneRunInteractBridgePlan.sourceContract,
    manimSceneRunInteractStatePolicy: sceneRunInteractBridgePlan.interactStatePolicy,
    manimSceneRunInteractStatus: sceneRunInteractBridgePlan.status,
    manimSceneRunInteractSummary: sceneRunInteractBridgePlan.summary,
    manimSceneRunInteractTermination: sceneRunInteractBridgePlan.interactTermination,
    manimSceneRunInteractUpdateFrameCallCount: sceneRunInteractBridgePlan.updateFrameCallCount,
    manimSceneExportBeatCount: sceneExport.timelineStepCount,
    manimSceneExportFormulaTokenCount: sceneExport.formulaTokenCount,
    manimSceneExportObjectCount: sceneExport.objectCount,
    manimSceneExportReady: sceneExport.approvedForRuntime,
    manimSceneExportSemanticBindingCount: sceneExport.semanticBindingCount,
    manimSceneExportSourceContract: sceneExport.sourceContract,
    manimSceneExportSignature: sceneExport.signature,
    manimSmokeHookAttributeCount: smokeHookManifest.attributeCount,
    manimSmokeHookConvertedSelectorCount: smokeHookManifest.convertedSelectorCount,
    manimSmokeHookJsonPayloadCount: smokeHookManifest.jsonPayloadSelectors.length,
    manimSmokeHookJsonPayloadSelectors: smokeHookManifest.jsonPayloadSelectors,
    manimSmokeHookReady: true,
    manimSmokeHookSceneId: smokeHookManifest.sceneId,
    manimSmokeHookSelectorConversionSummary: smokeHookManifest.selectorConversionSummary,
    manimSmokeHookSelectorCount: smokeHookManifest.selectorCount,
    manimSmokeHookSignature: smokeHookManifest.signature,
    manimSmokeHookSourceContract: smokeHookManifest.sourceContract,
    manimSmokeHookSummary: smokeHookManifest.summary,
    manimCheckpointPasteInvalidatesCount: checkpointPastePlan?.invalidatesLaterCheckpointCount ?? 0,
    manimCheckpointPasteInvalidatedKeys: checkpointPastePlan?.invalidatedCheckpointKeys.join(",") || "none",
    manimCheckpointPasteKey: checkpointPastePlan?.checkpointKey ?? "none",
    manimCheckpointPasteLineCount: checkpointPastePlan?.lineCount ?? 0,
    manimCheckpointPasteOperationCount: checkpointPastePlan?.operationLineCount ?? 0,
    manimCheckpointPasteElapsedSeconds: checkpointPastePlan?.elapsedSeconds ?? 0,
    manimCheckpointPasteProgressBar: checkpointPastePlan?.progressBar ?? false,
    manimCheckpointPasteProgressControlActionSummary: checkpointPastePlan?.progressControlPlan.actionSummary ?? "none",
    manimCheckpointPasteProgressControlFinalProgress: checkpointPastePlan?.progressControlPlan.finalShowAnimationProgress ?? false,
    manimCheckpointPasteProgressControlInitialProgress: checkpointPastePlan?.progressControlPlan.initialShowAnimationProgress ?? false,
    manimCheckpointPasteProgressControlPreviousProgress: checkpointPastePlan?.progressControlPlan.previousShowAnimationProgress ?? false,
    manimCheckpointPasteProgressControlRequested: checkpointPastePlan?.progressControlPlan.requested ?? false,
    manimCheckpointPasteProgressControlRestoredPrevious: checkpointPastePlan?.progressControlPlan.restoredPreviousStatus ?? false,
    manimCheckpointPasteProgressControlSummary: checkpointPastePlan?.progressControlPlan.summary ?? "none",
    manimCheckpointPasteProgressControlTransitionCount: checkpointPastePlan?.progressControlPlan.transitionCount ?? 0,
    manimCheckpointPasteReady: checkpointPastePlan !== null,
    manimCheckpointPasteRecord: checkpointPastePlan?.record ?? false,
    manimCheckpointPasteRetainedKeysAfterRestore: checkpointPastePlan?.retainedCheckpointKeysAfterRestore.join(",") || "none",
    manimCheckpointPasteRestoreAction: checkpointPastePlan?.checkpointRestoreAction ?? "save-new-checkpoint",
    manimCheckpointPasteReplayPolicy: checkpointPastePlan?.replayPolicy ?? SCENE_CHECKPOINT_PASTE_REPLAY_POLICY,
    manimCheckpointPasteRestoreMode: checkpointPastePlan?.restoreMode ?? "save-new",
    manimCheckpointPasteRestoresExisting: checkpointPastePlan?.restoresExistingCheckpoint ?? false,
    manimCheckpointPasteSceneId: checkpointPastePlan?.sceneId ?? scene.sceneId,
    manimCheckpointPasteSkip: checkpointPastePlan?.skip ?? false,
    manimCheckpointPasteSourceContract: checkpointPastePlan?.sourceContract ?? SCENE_CHECKPOINT_PASTE_SOURCE_CONTRACT,
    manimCheckpointPasteSourceLabel: checkpointPastePlan?.sourceLabel ?? "none",
    manimCheckpointPasteSkipControlActionSummary: checkpointPastePlan
      ? checkpointPastePlan.skipControlPlan.transitions.map((transition) => transition.action).join(",") || "none"
      : "none",
    manimCheckpointPasteSkipControlFinalOriginalStatus: checkpointPastePlan?.skipControlPlan.finalOriginalSkippingStatus ?? false,
    manimCheckpointPasteSkipControlFinalSkip: checkpointPastePlan?.skipControlPlan.finalSkipAnimations ?? false,
    manimCheckpointPasteSkipControlFinalTempPrevious: checkpointPastePlan?.skipControlPlan.finalTempSkipPreviousStatus ?? false,
    manimCheckpointPasteSkipControlHasOriginalStatus: checkpointPastePlan?.skipControlPlan.finalHasOriginalSkippingStatus ?? false,
    manimCheckpointPasteSkipControlSkippedTransitionCount: checkpointPastePlan?.skipControlPlan.skippedTransitionCount ?? 0,
    manimCheckpointPasteSkipControlStoppedTransitionCount: checkpointPastePlan?.skipControlPlan.stoppedTransitionCount ?? 0,
    manimCheckpointPasteSkipControlSummary: checkpointPastePlan?.skipControlPlan.summary ?? "none",
    manimCheckpointPasteSkipControlTransitionCount: checkpointPastePlan?.skipControlPlan.transitionCount ?? 0,
    manimCheckpointPasteSummary: checkpointPastePlan?.summary ?? "none",
    manimCheckpointStoreCanRestore: checkpointStoreManifest.canRestore,
    manimCheckpointStoreCount: checkpointStoreManifest.checkpointCount,
    manimCheckpointStoreInvalidatedCount: checkpointStoreManifest.invalidatedCount,
    manimCheckpointStoreInvalidatedKeys: checkpointStoreManifest.invalidatedKeys.join(",") || "none",
    manimCheckpointStoreInvalidateLater: checkpointStoreManifest.invalidateLater,
    manimCheckpointStoreKeys: checkpointStoreManifest.keys.join(",") || "none",
    manimCheckpointStoreLatestKey: checkpointStoreManifest.latestKey,
    manimCheckpointStoreLatestStateSignature: checkpointStoreManifest.latestStateSignature,
    manimCheckpointStoreNextOrder: checkpointStoreManifest.nextOrder,
    manimCheckpointStoreRequestedKey: checkpointStoreManifest.requestedKey,
    manimCheckpointStoreRetainedKeysAfterRestore: checkpointStoreManifest.retainedKeysAfterRestore.join(",") || "none",
    manimCheckpointStoreRestoreAction: checkpointStoreManifest.restoreAction,
    manimCheckpointStoreRestoredOrder: checkpointStoreManifest.restoredOrder === null ? "none" : String(checkpointStoreManifest.restoredOrder),
    manimCheckpointStoreRestoredStateSignature: checkpointStoreManifest.restoredStateSignature,
    manimCheckpointStoreSourceContract: checkpointStoreManifest.sourceContract,
    manimCheckpointStoreStateSignatureSummary: checkpointStoreManifest.stateSignatureSummary,
    manimCheckpointStoreSummary: checkpointStoreManifest.summary,
    manimProgressControlActionSummary: progressControlPlan.actionSummary,
    manimProgressControlFinalProgress: progressControlPlan.finalShowAnimationProgress,
    manimProgressControlInitialProgress: progressControlPlan.initialShowAnimationProgress,
    manimProgressControlPreviousProgress: progressControlPlan.previousShowAnimationProgress,
    manimProgressControlRequested: progressControlPlan.requested,
    manimProgressControlRestoredPrevious: progressControlPlan.restoredPreviousStatus,
    manimProgressControlSourceContract: progressControlPlan.sourceContract,
    manimProgressControlStatePolicy: progressControlPlan.statePolicy,
    manimProgressControlSummary: progressControlPlan.summary,
    manimProgressControlTransitionCount: progressControlPlan.transitionCount,
    manimProgressControlTransitions: progressControlPlan.transitions,
    manimRenderBatchCount: sceneRenderBatchPlan.batchCount,
    manimRenderBatchIds: sceneRenderBatchPlan.batches.map((batch) => batch.batchId).join(",") || "none",
    manimRenderBatchObjectCount: sceneRenderBatchPlan.objectCount,
    manimRenderBatchRows: sceneRenderBatchPlan.batches,
    manimRenderBatchSkippedCount: sceneRenderBatchPlan.skippedObjectIds.length,
    manimRenderBatchSkippedIds: sceneRenderBatchPlan.skippedObjectIds.join(",") || "none",
    manimRenderBatchSourceContract: sceneRenderBatchPlan.sourceContract,
    manimRenderBatchSummary: sceneRenderBatchPlan.summary,
    manimSceneHistoryCanRedo: sceneHistorySummary.canRedo,
    manimSceneHistoryCanUndo: sceneHistorySummary.canUndo,
    manimSceneHistoryBranchInvalidatedRedoCount: sceneHistorySummary.branchInvalidatedRedoCount ?? 0,
    manimSceneHistoryBranchInvalidatedRedoLabels: sceneHistorySummary.branchInvalidatedRedoLabels ?? "none",
    manimSceneHistoryBranchPolicy: sceneHistorySummary.branchPolicy ?? SCENE_HISTORY_BRANCH_POLICY,
    manimSceneHistoryCurrentLabel: sceneHistorySummary.currentLabel,
    manimSceneHistoryDroppedUndoCount: sceneHistorySummary.droppedUndoCount,
    manimSceneHistoryMaxUndoEntries: sceneHistorySummary.maxUndoEntries,
    manimSceneHistoryRedoCount: sceneHistorySummary.redoCount,
    manimSceneHistoryRevision: sceneHistorySummary.revision,
    manimSceneHistorySourceContract: sceneHistorySummary.sourceContract ?? SCENE_HISTORY_SOURCE_CONTRACT,
    manimSceneHistoryUndoCount: sceneHistorySummary.undoCount,
    manimStateSnapshotActiveStep: sceneStateSnapshot.activeStep,
    manimStateSnapshotAuthoringMode: sceneStateSnapshot.authoringMode,
    manimStateSnapshotCameraMode: sceneStateSnapshot.cameraMode,
    manimStateSnapshotCameraShot: sceneStateSnapshot.cameraShotId,
    manimStateSnapshotCheckpointCount: sceneStateSnapshot.checkpointCount,
    manimStateSnapshotElapsedSeconds: sceneStateSnapshot.elapsedSeconds,
    manimStateSnapshotFrameIndex: sceneStateSnapshot.frameIndex,
    manimStateSnapshotHistoryDroppedUndoCount: sceneStateSnapshot.historyDroppedUndoCount,
    manimStateSnapshotHistoryMaxUndoEntries: sceneStateSnapshot.historyMaxUndoEntries,
    manimStateSnapshotHistoryRevision: sceneStateSnapshot.historyRevision,
    manimStateSnapshotFamilyRootIds: sceneStateSnapshot.objectFamilyRootIds.join(",") || "none",
    manimStateSnapshotObjectIds: sceneStateSnapshot.objectIds.join(",") || "none",
    manimStateSnapshotObjectIdentitySummary: sceneStateSnapshot.objectIdentitySummary,
    manimStateSnapshotRootIds: sceneStateSnapshot.objectRootIds.join(",") || "none",
    manimStateSnapshotPlaybackState: sceneStateSnapshot.playbackState,
    manimStateSnapshotReady: true,
    manimStateSnapshotSceneId: sceneStateSnapshot.sceneId,
    manimStateSnapshotSelectedParameterId: sceneStateSnapshot.selectedParameterId,
    manimStateSnapshotSignature: sceneStateSnapshot.signature,
    manimStateSnapshotSourceContract: sceneStateSnapshot.sourceContract,
    manimStateSnapshotSummary: sceneStateSnapshot.summary,
    manimFloorPlane: floorPlanePlan.plane,
    manimFloorPlaneError: floorPlanePlan.errorMessage ?? "none",
    manimFloorPlaneEulerAxes: floorPlanePlan.eulerAxes ?? "none",
    manimFloorPlaneRaisesError: floorPlanePlan.raisesError,
    manimFloorPlaneSourceContract: floorPlanePlan.sourceContract,
    manimFloorPlaneSummary: floorPlanePlan.summary,
    manimFloorPlaneValid: floorPlanePlan.valid,
    manimKeyControlAction: keyControlPlan.action,
    manimKeyControlCanRedo: keyControlPlan.canRedo,
    manimKeyControlCanUndo: keyControlPlan.canUndo,
    manimKeyControlDispatchesEvent: keyControlPlan.dispatchesEvent,
    manimKeyControlEventType: keyControlPlan.eventType,
    manimKeyControlFinalHoldOnWait: keyControlPlan.finalHoldOnWait,
    manimKeyControlFinalQuitInteraction: keyControlPlan.finalQuitInteraction,
    manimKeyControlKey: keyControlPlan.normalizedKey,
    manimKeyControlPlaysCameraResetAnimation: keyControlPlan.playsCameraResetAnimation,
    manimKeyControlPreventsPropagation: keyControlPlan.preventsPropagation,
    manimKeyControlRedoRequested: keyControlPlan.redoRequested,
    manimKeyControlReleaseEvent: keyControlPlan.releaseEvent,
    manimKeyControlResetKey: keyControlPlan.resetKey,
    manimKeyControlSourceContract: keyControlPlan.sourceContract,
    manimKeyControlSummary: keyControlPlan.summary,
    manimKeyControlUndoRequested: keyControlPlan.undoRequested,
    manimPickBuff: pickResult?.buff ?? 0,
    manimPickConceptId: pickResult?.conceptId ?? "none",
    manimPickDistanceToCenter: pickResult?.distanceToCenter ?? 0,
    manimPickGroup: pickResult?.group ?? "none",
    manimPickHit: pickResult !== null,
    manimPickObjectId: pickResult?.objectId ?? "none",
    manimPickRenderIndex: pickResult?.renderIndex ?? -1,
    manimPickSearchOrderIndex: pickResult?.searchOrderIndex ?? -1,
    manimPickSourceContract: pickResult?.sourceContract ?? SCENE_PICKING_SOURCE_CONTRACT,
    manimPickSummary: pickResult?.summary ?? "pick:miss",
    manimPointerControlButton: pointerControlPlan.button,
    manimPointerControlButtons: pointerControlPlan.buttons,
    manimPointerControlDeltaPoint: pointerControlPlan.deltaPoint,
    manimPointerControlDispatchesEvent: pointerControlPlan.dispatchesEvent,
    manimPointerControlEventType: pointerControlPlan.eventType,
    manimPointerControlFrameAction: pointerControlPlan.frameAction,
    manimPointerControlFrameShift: pointerControlPlan.frameShift,
    manimPointerControlModifiers: pointerControlPlan.modifiers,
    manimPointerControlMouseDragPointUpdated: pointerControlPlan.mouseDragPointUpdated,
    manimPointerControlMousePointUpdated: pointerControlPlan.mousePointUpdated,
    manimPointerControlOffset: pointerControlPlan.offset,
    manimPointerControlPhiDelta: pointerControlPlan.phiDelta,
    manimPointerControlPoint: pointerControlPlan.point,
    manimPointerControlPropagationStopped: pointerControlPlan.propagationStopped,
    manimPointerControlScaleAboutPoint: pointerControlPlan.scaleAboutPoint,
    manimPointerControlScaleFactor: pointerControlPlan.scaleFactor,
    manimPointerControlScrollRelativeOffset: pointerControlPlan.scrollRelativeOffset,
    manimPointerControlSourceContract: pointerControlPlan.sourceContract,
    manimPointerControlSummary: pointerControlPlan.summary,
    manimPointerControlThetaDelta: pointerControlPlan.thetaDelta,
    manimPointerControlWindowOk: pointerControlPlan.windowAssertionSatisfied,
    manimTimeProgressionDescription: activeTimeProgression.description,
    manimTimeProgressionFinalTime: activeTimeProgression.finalTime,
    manimTimeProgressionFps: activeTimeProgression.fps,
    manimTimeProgressionFrameCount: activeTimeProgression.times.length,
    manimTimeProgressionFrameInterval: activeTimeProgression.frameInterval,
    manimTimeProgressionMode: activeTimeProgression.mode,
    manimTimeProgressionNIterations: activeTimeProgression.nIterations,
    manimTimeProgressionOverrideSkip: activeTimeProgression.overrideSkipAnimations,
    manimTimeProgressionOvershoot: activeTimeProgression.overshootsRunTime,
    manimTimeProgressionRunTime: activeTimeProgression.runTime,
    manimTimeProgressionSamplingPolicy: activeTimeProgression.samplingPolicy,
    manimTimeProgressionSkipAnimations: activeTimeProgression.skipAnimations,
    manimTimeProgressionSourceContract: activeTimeProgression.sourceContract,
    manimTimeProgressionSummary: activeTimeProgression.summary,
    manimTimeProgressionTimes: activeTimeProgression.times,
    manimWaitControlDescription: activeWaitControl?.description ?? "none",
    manimWaitControlCalledEmitFrameCount: activeWaitControl?.calledEmitFrameCount ?? 0,
    manimWaitControlCalledUpdateFrameCount: activeWaitControl?.calledUpdateFrameCount ?? 0,
    manimWaitControlEffectiveDuration: activeWaitControl?.effectiveDuration ?? 0,
    manimWaitControlEmittedFrameCount: activeWaitControl?.emittedFrameCount ?? 0,
    manimWaitControlEmittedTimes: activeWaitControl?.emittedTimes ?? [],
    manimWaitControlFps: activeWaitControl?.fps ?? 0,
    manimWaitControlFramePolicy: activeWaitControl?.framePolicy ?? SCENE_WAIT_CONTROL_FRAME_POLICY,
    manimWaitControlFrameInterval: activeWaitControl?.frameInterval ?? 0,
    manimWaitControlFrameOperationSummary: activeWaitControl?.frameOperationSummary ?? "none",
    manimWaitControlIncrementsSceneTime:
      activeWaitControl?.frames.map((frame) => String(frame.incrementsSceneTime)).join(",") || "none",
    manimWaitControlMaxTime: activeWaitControl?.maxTime ?? 0,
    manimWaitControlMode: activeWaitControl?.mode ?? "fixed-duration",
    manimWaitControlNIterations: activeWaitControl?.nIterations ?? 0,
    manimWaitControlOverrideSkip: activeWaitControl?.overrideSkipAnimations ?? false,
    manimWaitControlRunTime: activeWaitControl?.runTime ?? 0,
    manimWaitControlSkipAnimations: activeWaitControl?.skipAnimations ?? false,
    manimWaitControlSourceContract: activeWaitControl?.sourceContract ?? SCENE_WAIT_CONTROL_SOURCE_CONTRACT,
    manimWaitControlStopConditionId: activeWaitControl?.stopConditionId ?? "none",
    manimWaitControlStopConditionSatisfied: activeWaitControl?.stopConditionSatisfied ?? false,
    manimWaitControlSummary: activeWaitControl?.summary ?? "none",
    manimWaitControlUpdateMobjectDts:
      activeWaitControl?.frames.map((frame) => frame.updateMobjectsDtSeconds.toFixed(3)).join(",") || "none",
    manimWaitControlUpdateMobjectFrameCount: activeWaitControl?.updateMobjectFrameCount ?? 0,
    manimWaitControlUpdaterFinalValue: activeWaitControl?.updaterFinalValue ?? 0,
    manimWaitControlUpdaterValueSummary:
      activeWaitControl?.updaterValueSummary ??
      "waitUpdater:mode=fixed-duration:frames=0:final=0.000:values=none",
    manimWaitControlUpdaterValues: activeWaitControl?.updaterValues ?? [],
    manimWaitControlUpdateMobjectTotalDt: activeWaitControl?.updateMobjectTotalDtSeconds ?? 0,
    manimWaitControlUpdatesMobjectsDuringPresenterHold: activeWaitControl?.updatesMobjectsDuringPresenterHold ?? false,
    manimWaitControlUpdatesMobjectsDuringWait: activeWaitControl?.updatesMobjectsDuringWait ?? false,
    manimWaitControlUpdatesMobjectsWhileSkipping: activeWaitControl?.updatesMobjectsWhileSkipping ?? false,
    manimWaitControlUpdatesMobjects:
      activeWaitControl?.frames.map((frame) => String(frame.updatesMobjects)).join(",") || "none",
    manimWaitControlUpdaterPolicy: activeWaitControl?.updaterPolicy ?? SCENE_WAIT_CONTROL_UPDATER_POLICY,
    manimWaitFrameStepperActiveSteps:
      activeWaitFrameStepperBridge?.rows.map((row) => row.activeStep).join(",") || "none",
    manimWaitFrameStepperCameraShots:
      activeWaitFrameStepperBridge?.rows.map((row) => row.cameraShot).join(",") || "none",
    manimWaitFrameStepperFrameStepCount: activeWaitFrameStepperBridge?.frameStepCount ?? 0,
    manimWaitFrameStepperMismatchCount: activeWaitFrameStepperBridge?.mismatchCount ?? 0,
    manimWaitFrameStepperSceneIds:
      activeWaitFrameStepperBridge
        ? [...new Set(activeWaitFrameStepperBridge.rows.map((row) => row.sceneId))].join(",") || "none"
        : "none",
    manimWaitFrameStepperSourceContract:
      activeWaitFrameStepperBridge?.sourceContract ?? SCENE_WAIT_FRAME_STEPPER_BRIDGE_SOURCE_CONTRACT,
    manimWaitFrameStepperSummary: activeWaitFrameStepperBridge?.summary ?? "none",
    manimWaitFrameStepperUpdateFrameActions:
      activeWaitFrameStepperBridge?.rows.map((row) => row.frameStepUpdateFrameAction).join(",") || "none",
    manimWaitFrameStepperUpdaterActiveCounts:
      activeWaitFrameStepperBridge?.rows.map((row) => String(row.updaterActiveCount)).join(",") || "none",
    manimWaitFrameStepperUpdaterSuspendedCounts:
      activeWaitFrameStepperBridge?.rows.map((row) => String(row.updaterSuspendedCount)).join(",") || "none",
    manimWaitFrameStepperUpdaterValueAfterFrames:
      activeWaitFrameStepperBridge?.rows.map((row) => row.waitUpdaterValueAfterFrame.toFixed(3)).join(",") || "none",
    manimWaitFrameStepperWaitFrameCount: activeWaitFrameStepperBridge?.waitFrameCount ?? 0,
    manimWaitFrameStepperWaitUpdatesMobjects:
      activeWaitFrameStepperBridge?.rows.map((row) => String(row.waitUpdatesMobjects)).join(",") || "none",
    manimWaitFrameStepperWaitTimes:
      activeWaitFrameStepperBridge?.rows.map((row) => row.waitTSeconds.toFixed(3)).join(",") || "none",
    manimWaitFrameStepperWriteFrameFlags:
      activeWaitFrameStepperBridge?.rows.map((row) => String(row.frameStepWritesFrame)).join(",") || "none",
    manimPresenterHoldDuration: activeWaitControl?.presenterHold.holdDuration ?? 0,
    manimPresenterHoldFinalHoldOnWait: activeWaitControl?.presenterHold.finalHoldOnWait ?? false,
    manimPresenterHoldFrameCount: activeWaitControl?.presenterHold.holdFrameCount ?? 0,
    manimPresenterHoldIgnore: activeWaitControl?.presenterHold.ignorePresenterMode ?? false,
    manimPresenterHoldMode: activeWaitControl?.presenterHold.mode ?? "ordinary-wait",
    manimPresenterHoldNoteLogged: activeWaitControl?.presenterHold.noteLogged ?? false,
    manimPresenterHoldPresenterMode: activeWaitControl?.presenterHold.presenterMode ?? false,
    manimPresenterHoldReleaseEvent: activeWaitControl?.presenterHold.releaseEvent ?? "none",
    manimPresenterHoldShouldUseTimelineWait: activeWaitControl?.presenterHold.shouldUseTimelineWait ?? true,
    manimPresenterHoldSkipAnimations: activeWaitControl?.presenterHold.skipAnimations ?? false,
    manimPresenterHoldSourceContract:
      activeWaitControl?.presenterHold.sourceContract ?? SCENE_PRESENTER_HOLD_SOURCE_CONTRACT,
    manimPresenterHoldSummary: activeWaitControl?.presenterHold.summary ?? "none",
    manimWindowCallsFocus: windowEventPlan.callsWindowFocus,
    manimWindowEventType: windowEventPlan.eventType,
    manimWindowHasWindow: windowEventPlan.hasWindow,
    manimWindowHeight: windowEventPlan.height,
    manimWindowNoOp: windowEventPlan.noOp,
    manimWindowReturnedEarly: windowEventPlan.returnedEarly,
    manimWindowSourceContract: windowEventPlan.sourceContract,
    manimWindowSummary: windowEventPlan.summary,
    manimWindowWidth: windowEventPlan.width,
    manimAlwaysUpdateMobjects: runtimeState.updatePolicy.alwaysUpdateMobjects,
    manimForceDraw: runtimeState.updatePolicy.forceDraw,
    manimHasUpdaters: runtimeState.updatePolicy.hasUpdaters,
    manimShouldCaptureFrame: runtimeState.updatePolicy.shouldCaptureFrame,
    manimShouldUpdateMobjects: runtimeState.updatePolicy.shouldUpdateMobjects,
    manimSkipAnimations: runtimeState.updatePolicy.skipAnimations,
    manimUpdatePolicyReason: runtimeState.updatePolicy.reason,
    manimUpdatePolicySourceContract: runtimeState.updatePolicy.sourceContract,
    manimUpdatePolicySummary: runtimeState.updatePolicy.summary,
    manimUpdatePolicyUpdaterCount: runtimeState.updatePolicy.updaterCount,
    manimTransformStepCount: animationPlanSummary.transformStepCount,
    manimValueTrackerControlCount: valueTrackerPayload.controlTrackerCount,
    manimValueTrackerCount: valueTrackerPayload.totalTrackerCount,
    manimValueTrackerHiddenMobjectIds: valueTrackerPayload.hiddenMobjectIds.join(",") || "none",
    manimValueTrackerIds: valueTrackerPayload.trackerIds.join(",") || "none",
    manimValueTrackerNormalizedValueSummary: valueTrackerPayload.normalizedValueSummary,
    manimValueTrackerObjectCount: valueTrackerPayload.objectTrackerCount,
    manimValueTrackerParameterCount: valueTrackerPayload.parameterTrackerCount,
    manimValueTrackerProgressCount: valueTrackerPayload.progressTrackerCount,
    manimValueTrackerRangeSummary: valueTrackerPayload.rangeSummary,
    manimValueTrackerRows: valueTrackerPayload.rows,
    manimValueTrackerSignature: valueTrackerPayload.signature,
    manimValueTrackerSourceContract: valueTrackerPayload.sourceContract,
    manimValueTrackerSourceSummary: valueTrackerPayload.sourceSummary,
    manimValueTrackerSummary: summarizeMathValueTrackerPayload(valueTrackerPayload),
    manimValueTrackerTimelineCount: valueTrackerPayload.timelineTrackerCount,
    manimValueTrackerUniformKeySummary: valueTrackerPayload.uniformKeySummary,
    manimValueTrackerUniformPairCount: valueTrackerPayload.uniformPairCount,
    manimValueTrackerUniformValueSummary: valueTrackerPayload.uniformValueSummary,
    manimValueTrackerValueCount: valueTrackerPayload.valueTrackerCount,
    mathObjectCount: runtimeState.diagnostics.mathObjectCount,
    mobjectFamilyCacheDataDirtyCount: familyCachePlan.dataDirtyCount,
    mobjectFamilyCacheFamilyDirtyCount: familyCachePlan.familyDirtyCount,
    mobjectFamilyCacheRecomputedCount: familyCachePlan.recomputedFamilyCount,
    mobjectFamilyCacheRecomputedIds: familyCachePlan.recomputedFamilyIds.join(",") || "none",
    mobjectFamilyCacheReusable: familyCachePlan.familyCacheReusable,
    mobjectFamilyCacheReusedCount: familyCachePlan.reusedFamilyCount,
    mobjectFamilyCacheReusedIds: familyCachePlan.reusedFamilyIds.join(",") || "none",
    mobjectFamilyCacheSourceContract: familyCachePlan.sourceContract,
    mobjectFamilyCacheStatus: familyCachePlan.cacheStatus,
    mobjectFamilyCacheSummary: summarizeMobjectFamilyCachePlan(familyCachePlan),
    mobjectAnimationOwnedInvalidationCount: invalidationOwnership.animationOwnedInvalidationCount,
    mobjectFamilyCycleCount: familySummary.cycleCount,
    mobjectFamilyMaxDepth: familySummary.maxDepth,
    mobjectFamilyMemberCount: familySummary.familyMemberCount,
    mobjectFamilyOrphanCount: familySummary.orphanCount,
    mobjectFamilyRootCount: familySummary.rootCount,
    mobjectFamilySourceContract: familyIndex.sourceContract,
    mobjectBoundingBoxCount: mobjectBoundingBoxTable.rowCount,
    mobjectBoundingBoxEmptyCount: mobjectBoundingBoxTable.emptyCount,
    mobjectBoundingBoxFiniteCount: mobjectBoundingBoxTable.finiteCount,
    mobjectBoundingBoxObjectIds: mobjectBoundingBoxTable.objectIds,
    mobjectBoundingBoxRows: mobjectBoundingBoxTable.rows,
    mobjectBoundingBoxSignature: mobjectBoundingBoxTable.signature,
    mobjectBoundingBoxSourceContract: mobjectBoundingBoxTable.sourceContract,
    mobjectBoundingBoxStaleCount: invalidationPlan.boundingBoxStaleCount,
    mobjectBoundingBoxSummary: summarizeMobjectBoundingBoxTable(mobjectBoundingBoxTable),
    mobjectCopyChildLinkCount: mobjectCopyPlan.childLinkCount,
    mobjectCopyCloneIsolationPreserved: mobjectCopyPlan.cloneIsolationPreserved,
    mobjectCopyCloneIsolationSummary: mobjectCopyPlan.cloneIsolationSummary,
    mobjectCopyFamilyCount: mobjectCopyPlan.copiedFamilyCount,
    mobjectCopyIdMap: mobjectCopyPlan.idMap,
    mobjectCopyParentLinkCount: mobjectCopyPlan.parentLinkCount,
    mobjectCopyPointCount: mobjectCopyPlan.pointCount,
    mobjectCopyRenderDataCount: mobjectCopyPlan.renderDataNodeCount,
    mobjectCopyRootId: mobjectCopyPlan.copyRootId,
    mobjectCopySharedReferenceCount: mobjectCopyPlan.sharedReferenceCount,
    mobjectCopySignature: mobjectCopyPlan.signature,
    mobjectCopySourceContract: mobjectCopyPlan.sourceContract,
    mobjectCopySourceId: mobjectCopyPlan.sourceObjectId,
    mobjectCopySummary: summarizeMobjectCopyPlan(mobjectCopyPlan),
    mobjectLayoutBuff: mobjectLayoutPlan.buff,
    mobjectLayoutCenteringDelta: mobjectLayoutAttributes["data-viz-mobject-layout-centering-delta"],
    mobjectLayoutDirection: mobjectLayoutAttributes["data-viz-mobject-layout-direction"],
    mobjectLayoutFrameAnchor: mobjectLayoutAttributes["data-viz-mobject-layout-frame-anchor"] ?? "none",
    mobjectLayoutFrameBounds: mobjectLayoutAttributes["data-viz-mobject-layout-frame-bounds"] ?? "0.000,0.000,0.000..0.000,0.000,0.000",
    mobjectLayoutFrameTarget: mobjectLayoutAttributes["data-viz-mobject-layout-frame-target"] ?? "0.000,0.000,0.000",
    mobjectLayoutGroupCenter: mobjectLayoutAttributes["data-viz-mobject-layout-group-center"],
    mobjectLayoutGroupSize: mobjectLayoutAttributes["data-viz-mobject-layout-group-size"],
    mobjectLayoutKind: mobjectLayoutPlan.layoutKind,
    mobjectLayoutMissingCount: mobjectLayoutPlan.missingObjectCount,
    mobjectLayoutMissingIds: mobjectLayoutAttributes["data-viz-mobject-layout-missing-ids"],
    mobjectLayoutObjectCount: mobjectLayoutPlan.objectCount,
    mobjectLayoutObjectIds: mobjectLayoutAttributes["data-viz-mobject-layout-object-ids"],
    mobjectLayoutSignature: mobjectLayoutPlan.signature,
    mobjectLayoutSourceContract: mobjectLayoutPlan.sourceContract,
    mobjectLayoutSummary: summarizeMobjectLayoutPlan(mobjectLayoutPlan),
    mobjectLayoutTargetCenters: mobjectLayoutAttributes["data-viz-mobject-layout-target-centers"],
    mobjectRenderOrderAllIds: mobjectRenderOrderAttributes["data-viz-mobject-render-order-all-ids"],
    mobjectRenderOrderFixedCount: mobjectRenderOrderPlan.fixedInFrameObjectCount,
    mobjectRenderOrderFixedIds: mobjectRenderOrderAttributes["data-viz-mobject-render-order-fixed-ids"],
    mobjectRenderOrderForegroundCount: mobjectRenderOrderPlan.foregroundObjectCount,
    mobjectRenderOrderForegroundIds: mobjectRenderOrderAttributes["data-viz-mobject-render-order-foreground-ids"],
    mobjectRenderOrderRenderedCount: mobjectRenderOrderPlan.renderedObjectCount,
    mobjectRenderOrderSceneIds: mobjectRenderOrderAttributes["data-viz-mobject-render-order-scene-ids"],
    mobjectRenderOrderSignature: mobjectRenderOrderPlan.signature,
    mobjectRenderOrderSummary: mobjectRenderOrderPlan.summary,
    mobjectRenderOrderTopLevelCount: mobjectRenderOrderPlan.topLevelObjectCount,
    mobjectRenderOrderTopLevelIds: mobjectRenderOrderAttributes["data-viz-mobject-render-order-top-level-ids"],
    mobjectDataArrayFinitePointCount: mobjectDataTable.finitePointCount,
    mobjectDataArrayObjectIds: mobjectDataTable.objectIds,
    mobjectDataArrayPointCount: mobjectDataTable.pointCount,
    mobjectDataArrayRgbaCount: mobjectDataTable.rgbaCount,
    mobjectDataArrayRoleCount: mobjectDataTable.semanticRoleCount,
    mobjectDataArrayRowCount: mobjectDataTable.rowCount,
    mobjectDataArrayRows: mobjectDataTable.rows,
    mobjectDataArraySemanticRoles: mobjectDataTable.semanticRoles.join(",") || "none",
    mobjectDataArraySignature: mobjectDataTable.signature,
    mobjectDataArraySourceContract: mobjectDataTable.sourceContract,
    mobjectDataArraySummary: summarizeMobjectDataTable(mobjectDataTable),
    mobjectDataChangedCount: invalidationPlan.dataChangedCount,
    mobjectDirtyStateAnimationOwnedCount: mobjectDirtyStatePayload.animationOwnedInvalidationCount,
    mobjectDirtyStateBoundingBoxStaleCount: mobjectDirtyStatePayload.boundingBoxStaleCount,
    mobjectDirtyStateCacheStatus: mobjectDirtyStatePayload.cacheStatus,
    mobjectDirtyStateDataChangedCount: mobjectDirtyStatePayload.dataChangedCount,
    mobjectDirtyStateFamilyCacheReusable: mobjectDirtyStatePayload.familyCacheReusable,
    mobjectDirtyStateFamilyChangedCount: mobjectDirtyStatePayload.familyChangedCount,
    mobjectDirtyStateInvalidatedCount: mobjectDirtyStatePayload.invalidatedCount,
    mobjectDirtyStateInvalidatedIds: mobjectDirtyStatePayload.invalidatedIds.join(",") || "none",
    mobjectDirtyStateMetadataChangedCount: mobjectDirtyStatePayload.metadataChangedCount,
    mobjectDirtyStateRecomputedFamilyCount: mobjectDirtyStatePayload.recomputedFamilyCount,
    mobjectDirtyStateRecomputedFamilyIds: mobjectDirtyStatePayload.recomputedFamilyIds,
    mobjectDirtyStateReusedFamilyCount: mobjectDirtyStatePayload.reusedFamilyCount,
    mobjectDirtyStateReusedFamilyIds: mobjectDirtyStatePayload.reusedFamilyIds,
    mobjectDirtyStateRows: mobjectDirtyStatePayload.rows,
    mobjectDirtyStateSignature: mobjectDirtyStatePayload.signature,
    mobjectDirtyStateSourceContract: mobjectDirtyStatePayload.sourceContract,
    mobjectDirtyStateSummary: summarizeMobjectDirtyStatePayload(mobjectDirtyStatePayload),
    mobjectDirtyStateTotalObjectCount: mobjectDirtyStatePayload.totalObjectCount,
    mobjectDirtyStateUnchangedCount: mobjectDirtyStatePayload.unchangedCount,
    mobjectDirtyStateUniformsChangedCount: mobjectDirtyStatePayload.uniformsChangedCount,
    mobjectDirtyStateUnknownCount: mobjectDirtyStatePayload.unknownInvalidationCount,
    mobjectDirtyStateUpdaterActiveCount: mobjectDirtyStatePayload.updaterActiveInvalidationCount,
    mobjectFamilyChangedCount: invalidationPlan.familyChangedCount,
    mobjectPointGenerationFinitePointCount: mobjectPointGenerationTable.finitePointCount,
    mobjectPointGenerationGeneratedObjectCount: mobjectPointGenerationTable.generatedObjectCount,
    mobjectPointGenerationGeneratorKindSummary: mobjectPointGenerationTable.generatorKindSummary,
    mobjectPointGenerationNonFinitePointCount: mobjectPointGenerationTable.nonFinitePointCount,
    mobjectPointGenerationObjectCount: mobjectPointGenerationTable.objectCount,
    mobjectPointGenerationPointCount: mobjectPointGenerationTable.pointCount,
    mobjectPointGenerationRows: mobjectPointGenerationTable.rows,
    mobjectPointGenerationSignature: mobjectPointGenerationTable.signature,
    mobjectPointGenerationSourceContract: mobjectPointGenerationTable.sourceContract,
    mobjectPointGenerationSummary: mobjectPointGenerationTable.summary,
    mobjectPointGenerationZeroPointObjectCount: mobjectPointGenerationTable.zeroPointObjectCount,
    mobjectPointGenerationZeroPointObjectIds: mobjectPointGenerationTable.zeroPointObjectIds,
    mobjectPointTransformChangedPointCount: mobjectPointTransformEvidence.changedPointCount,
    mobjectPointTransformFiniteTransformedPointCount: mobjectPointTransformEvidence.finiteTransformedPointCount,
    mobjectPointTransformMaxDisplacement: mobjectPointTransformEvidence.maxDisplacement,
    mobjectPointTransformObjectCount: mobjectPointTransformEvidence.objectCount,
    mobjectPointTransformOperationCount: mobjectPointTransformEvidence.operationCount,
    mobjectPointTransformOperationIds: mobjectPointTransformEvidence.operationIds,
    mobjectPointTransformRowCount: mobjectPointTransformEvidence.rowCount,
    mobjectPointTransformRows: mobjectPointTransformEvidence.rows,
    mobjectPointTransformSignature: mobjectPointTransformEvidence.signature,
    mobjectPointTransformSourceContract: mobjectPointTransformEvidence.sourceContract,
    mobjectPointTransformSourcePointCount: mobjectPointTransformEvidence.sourcePointCount,
    mobjectPointTransformSummary: mobjectPointTransformEvidence.summary,
    mobjectPointTransformTransformableObjectCount: mobjectPointTransformEvidence.transformableObjectCount,
    mobjectPointTransformTransformedPointCount: mobjectPointTransformEvidence.transformedPointCount,
    mobjectPointCloudEmptyFamilyCount: mobjectPointCloudTable.emptyFamilyCount,
    mobjectPointCloudFamilyCount: mobjectPointCloudTable.familyCount,
    mobjectPointCloudFamilyIds: mobjectPointCloudTable.familyIds,
    mobjectPointCloudFamilyWithPointsCount: mobjectPointCloudTable.familyWithPointsCount,
    mobjectPointCloudObjectWithPointsCount: mobjectPointCloudTable.objectWithPointsCount,
    mobjectPointCloudPointCount: mobjectPointCloudTable.pointCount,
    mobjectPointCloudRows: mobjectPointCloudTable.rows,
    mobjectPointCloudSignature: mobjectPointCloudTable.signature,
    mobjectPointCloudSourceContract: mobjectPointCloudTable.sourceContract,
    mobjectPointCloudSummary: summarizeMobjectPointCloudTable(mobjectPointCloudTable),
    manimConfigDigestClassSummary: manimConfigDigest.classSummary,
    manimConfigDigestClippingPlaneCount: manimConfigDigest.clippingPlaneCount,
    manimConfigDigestDefaultedValueCount: manimConfigDigest.defaultedValueCount,
    manimConfigDigestExplicitOverrideCount: manimConfigDigest.explicitOverrideCount,
    manimConfigDigestFixedInFrameCount: manimConfigDigest.fixedInFrameCount,
    manimConfigDigestObjectCount: manimConfigDigest.objectCount,
    manimConfigDigestOpacityRange: manimConfigDigest.opacityRange,
    manimConfigDigestRowSummary: manimConfigDigest.rowSummary,
    manimConfigDigestShadeIn3DCount: manimConfigDigest.shadeIn3DCount,
    manimConfigDigestSignature: manimConfigDigest.signature,
    manimConfigDigestSourceContract: manimConfigDigest.sourceContract,
    manimConfigDigestSummary: manimConfigDigest.summary,
    manimConfigDigestVmobjectCount: manimConfigDigest.vmobjectCount,
    manimConfigDigestZIndexRange: manimConfigDigest.zIndexRange,
    mobjectInvalidatedIds: invalidatedMobjectIds(invalidationPlan).join(",") || "none",
    mobjectInvalidationOwnershipSummary: summarizeMobjectInvalidationOwnership(invalidationOwnership),
    mobjectInvalidationReasons: summarizeMobjectInvalidationReasons(invalidationPlan),
    mobjectInvalidationSummary: summarizeMobjectInvalidation(invalidationPlan),
    mobjectMaxDepth: familySummary.maxDepth,
    mobjectMetadataChangedCount: invalidationPlan.metadataChangedCount,
    mobjectStatePayloadBecomeAppliedCount: mobjectStatePayload.becomeAppliedCount,
    mobjectStatePayloadBecomeNodeCount: mobjectStatePayload.becomeNodeCount,
    mobjectStatePayloadBecomePointCount: mobjectStatePayload.becomePointCount,
    mobjectStatePayloadBecomeReadyCount: mobjectStatePayload.becomeReadyCount,
    mobjectStatePayloadBecomeRenderDataCount: mobjectStatePayload.becomeRenderDataNodeCount,
    mobjectStatePayloadFamilyRootCount: mobjectStatePayload.stateFamilyRootCount,
    mobjectStatePayloadNodeCount: mobjectStatePayload.stateSnapshotNodeCount,
    mobjectStatePayloadRestorableCount: mobjectStatePayload.restorableObjectCount,
    mobjectStatePayloadRestoreMismatchCount: mobjectStatePayload.restoreMismatchCount,
    mobjectStatePayloadRestoreNodeCount: mobjectStatePayload.restoreNodeCount,
    mobjectStatePayloadRestorePointCount: mobjectStatePayload.restorePointCount,
    mobjectStatePayloadRestoreReadyCount: mobjectStatePayload.restoreReadyCount,
    mobjectStatePayloadRestoreRenderDataCount: mobjectStatePayload.restoreRenderDataNodeCount,
    mobjectStatePayloadRestoreSourceSummary: mobjectStatePayload.restoreSourceSummary,
    mobjectStatePayloadRestoreUniformNodeCount: mobjectStatePayload.restoreUniformNodeCount,
    mobjectStatePayloadRows: mobjectStatePayload.rows,
    mobjectStatePayloadSignature: mobjectStatePayload.signature,
    mobjectStatePayloadSourceContract: mobjectStatePayload.sourceContract,
    mobjectStatePayloadSnapshotCount: mobjectStatePayload.snapshotCount,
    mobjectStatePayloadSummary: summarizeMobjectStatePayload(mobjectStatePayload),
    mobjectStatePayloadTargetableCount: mobjectStatePayload.targetableObjectCount,
    mobjectStatePayloadTargetCount: mobjectStatePayload.targetCount,
    mobjectStatePayloadTargetIds: mobjectStatePayload.targetIds.join(",") || "none",
    mobjectStatePayloadTargetNodeCount: mobjectStatePayload.targetNodeCount,
    mobjectStatePayloadTargetPointCount: mobjectStatePayload.targetPointCount,
    mobjectStatePayloadTargetRenderDataCount: mobjectStatePayload.targetRenderDataNodeCount,
    mobjectStateRestoreBridgeAfterFamilyIds: summarizeEvidenceIds(mobjectStateRestoreBridgePlan.afterFamilyIds),
    mobjectStateRestoreBridgeAfterObjectIds: summarizeEvidenceIds(mobjectStateRestoreBridgePlan.afterObjectIds),
    mobjectStateRestoreBridgeBeforeFamilyIds: summarizeEvidenceIds(mobjectStateRestoreBridgePlan.beforeFamilyIds),
    mobjectStateRestoreBridgeBeforeObjectIds: summarizeEvidenceIds(mobjectStateRestoreBridgePlan.beforeObjectIds),
    mobjectStateRestoreBridgeCurrentSignature: mobjectStateRestoreBridgePlan.currentSignature,
    mobjectStateRestoreBridgeFamilyPreserved: mobjectStateRestoreBridgePlan.familyPreserved,
    mobjectStateRestoreBridgeIdentityPreserved: mobjectStateRestoreBridgePlan.identityPreserved,
    mobjectStateRestoreBridgeObjectId: mobjectStateRestoreBridgePlan.objectId,
    mobjectStateRestoreBridgeRestored: mobjectStateRestoreBridgePlan.restored,
    mobjectStateRestoreBridgeRestoredSignature: mobjectStateRestoreBridgePlan.restoredSignature,
    mobjectStateRestoreBridgeRestoreMismatchCount: mobjectStateRestoreBridgePlan.restoreMismatchCount,
    mobjectStateRestoreBridgeSavedFamilyIds: summarizeEvidenceIds(mobjectStateRestoreBridgePlan.savedFamilyIds),
    mobjectStateRestoreBridgeSavedNodeCount: mobjectStateRestoreBridgePlan.savedNodeCount,
    mobjectStateRestoreBridgeSavedPointCount: mobjectStateRestoreBridgePlan.savedPointCount,
    mobjectStateRestoreBridgeSavedSignature: mobjectStateRestoreBridgePlan.savedSignature,
    mobjectStateRestoreBridgeSourceContract: mobjectStateRestoreBridgePlan.sourceContract,
    mobjectStateRestoreBridgeSummary: mobjectStateRestoreBridgePlan.summary,
    mobjectMoveToTargetAfterFamilyIds: summarizeEvidenceIds(mobjectMoveToTargetBridgePlan.afterFamilyIds),
    mobjectMoveToTargetAfterSignature: mobjectMoveToTargetBridgePlan.afterSignature,
    mobjectMoveToTargetAppliedNodeCount: mobjectMoveToTargetBridgePlan.appliedNodeCount,
    mobjectMoveToTargetBecomeApplied: mobjectMoveToTargetBridgePlan.becomeApplied,
    mobjectMoveToTargetFamilyPreserved: mobjectMoveToTargetBridgePlan.familyPreserved,
    mobjectMoveToTargetIdentityPreserved: mobjectMoveToTargetBridgePlan.identityPreserved,
    mobjectMoveToTargetObjectId: mobjectMoveToTargetBridgePlan.objectId,
    mobjectMoveToTargetRenderStateChanged: mobjectMoveToTargetBridgePlan.renderStateChanged,
    mobjectMoveToTargetSourceContract: mobjectMoveToTargetBridgePlan.sourceContract,
    mobjectMoveToTargetSourceFamilyIds: summarizeEvidenceIds(mobjectMoveToTargetBridgePlan.sourceFamilyIds),
    mobjectMoveToTargetSourceNodeCount: mobjectMoveToTargetBridgePlan.sourceNodeCount,
    mobjectMoveToTargetSourceSignature: mobjectMoveToTargetBridgePlan.sourceSignature,
    mobjectMoveToTargetSummary: mobjectMoveToTargetBridgePlan.summary,
    mobjectMoveToTargetTargetFamilyIds: summarizeEvidenceIds(mobjectMoveToTargetBridgePlan.targetFamilyIds),
    mobjectMoveToTargetTargetGenerated: mobjectMoveToTargetBridgePlan.targetGenerated,
    mobjectMoveToTargetTargetId: mobjectMoveToTargetBridgePlan.targetId,
    mobjectMoveToTargetTargetNodeCount: mobjectMoveToTargetBridgePlan.targetNodeCount,
    mobjectMoveToTargetTargetPointCount: mobjectMoveToTargetBridgePlan.targetPointCount,
    mobjectMoveToTargetTargetSignature: mobjectMoveToTargetBridgePlan.targetSignature,
    mobjectUniformsChangedCount: invalidationPlan.uniformsChangedCount,
    mobjectOrphanCount: familySummary.orphanCount,
    mobjectStateSnapshotCount: stateSummary.stateSnapshotNodeCount,
    mobjectTargetableCount: stateSummary.targetableObjectCount,
    mobjectAnchorEmptyBoundingBoxCount: mobjectAnchorEvidence.emptyBoundingBoxCount,
    mobjectAnchorFinitePointCount: mobjectAnchorEvidence.finiteAnchorPointCount,
    mobjectAnchorNameCount: mobjectAnchorEvidence.anchorNameCount,
    mobjectAnchorNames: mobjectAnchorEvidence.anchorNames,
    mobjectAnchorObjectCount: mobjectAnchorEvidence.objectCount,
    mobjectAnchorObjectIds: mobjectAnchorEvidence.objectIds,
    mobjectAnchorPointCount: mobjectAnchorEvidence.anchorPointCount,
    mobjectAnchorSourceContract: mobjectAnchorEvidence.sourceContract,
    mobjectAnchorSummary: mobjectAnchorEvidence.summary,
    mobjectClippingPlaneCount: uniformSummary.clippingPlaneCount,
    mobjectFixedInFrameUniformCount: uniformSummary.fixedInFrameCount,
    mobjectMaterialClippingPlaneCount: materialUniformEvidence.clippingPlaneCount,
    mobjectMaterialDepthWriteEnabledCount: materialUniformEvidence.depthWriteEnabledCount,
    mobjectMaterialObjectCount: materialUniformEvidence.objectCount,
    mobjectMaterialObjectIds: materialUniformEvidence.objectIds,
    mobjectMaterialOpacityRange: materialUniformEvidence.opacityRange,
    mobjectMaterialShadeIn3DCount: materialUniformEvidence.shadeIn3DCount,
    mobjectMaterialSourceContract: materialUniformEvidence.sourceContract,
    mobjectMaterialSummary: materialUniformEvidence.summary,
    mobjectMaterialTransparentCount: materialUniformEvidence.transparentCount,
    runtimeRenderStateFinitePointCount: runtimeRenderStateEvidence.finitePointCount,
    runtimeRenderStateKindSummary: runtimeRenderStateEvidence.kindSummary,
    runtimeRenderStateObjectCount: runtimeRenderStateEvidence.objectCount,
    runtimeRenderStateObjectIds: runtimeRenderStateEvidence.objectIds,
    runtimeRenderStatePointCount: runtimeRenderStateEvidence.pointCount,
    runtimeRenderStateSourceContract: runtimeRenderStateEvidence.sourceContract,
    runtimeRenderStateStyledObjectCount: runtimeRenderStateEvidence.styledObjectCount,
    runtimeRenderStateSummary: runtimeRenderStateEvidence.summary,
    runtimeRenderStateWireframeCurveCount: runtimeRenderStateEvidence.wireframeCurveCount,
    runtimeRenderStateZeroPointObjectCount: runtimeRenderStateEvidence.zeroPointObjectCount,
    manimTimelineActiveConceptId: timelineEvidence.activeConceptId,
    manimTimelineActiveStepIndex: timelineEvidence.activeStepIndex,
    manimTimelineActiveStepType: timelineEvidence.activeStepType,
    manimTimelineCameraStepCount: timelineEvidence.cameraStepCount,
    manimTimelineCompletedStepCount: timelineEvidence.completedStepCount,
    manimTimelineElapsedSeconds: timelineEvidence.elapsedSeconds,
    manimTimelineFocusTargetCount: timelineEvidence.focusTargetCount,
    manimTimelineFocusTargetIds: timelineEvidence.focusTargetIds,
    manimTimelineFocusTargetPolicy: timelineEvidence.focusTargetPolicy,
    manimTimelineFocusTargetPrimaryId: timelineEvidence.focusTargetPrimaryId,
    manimTimelineFocusTargetSummary: timelineEvidence.focusTargetSummary,
    manimTimelinePendingStepCount: timelineEvidence.pendingStepCount,
    manimTimelineProgress: timelineEvidence.progress,
    manimTimelineReducedMotion: timelineEvidence.reducedMotion,
    manimTimelineSkipAnimations: timelineEvidence.skipAnimations,
    manimTimelineSourceContract: timelineEvidence.sourceContract,
    manimTimelineStepCount: timelineEvidence.stepCount,
    manimTimelineStepTypeSummary: timelineEvidence.stepTypeSummary,
    manimTimelineSummary: timelineEvidence.summary,
    manimTimelineTotalDuration: timelineEvidence.totalDuration,
    manimTimelineWaitStepCount: timelineEvidence.waitStepCount,
    vmobjectRenderLineColorRoles: vmobjectLineRenderEvidence.colorRoles,
    vmobjectRenderLineObjectCount: vmobjectLineRenderEvidence.objectCount,
    vmobjectRenderLineObjectIds: vmobjectLineRenderEvidence.objectIds,
    vmobjectRenderLineOpacityRange: vmobjectLineRenderEvidence.opacityRange,
    vmobjectRenderLineSourceContract: vmobjectLineRenderEvidence.sourceContract,
    vmobjectRenderLineStrokeWidthRange: vmobjectLineRenderEvidence.strokeWidthRange,
    vmobjectRenderLineSummary: vmobjectLineRenderEvidence.summary,
    vmobjectRenderLineTransparentCount: vmobjectLineRenderEvidence.transparentCount,
    vmobjectRenderFillColorRoles: vmobjectSurfaceFillRenderEvidence.colorRoles,
    vmobjectRenderFillMeshObjectCount: vmobjectSurfaceFillRenderEvidence.meshObjectCount,
    vmobjectRenderFillMeshObjectIds: vmobjectSurfaceFillRenderEvidence.meshObjectIds,
    vmobjectRenderFillObjectCount: vmobjectSurfaceFillRenderEvidence.objectCount,
    vmobjectRenderFillObjectIds: vmobjectSurfaceFillRenderEvidence.objectIds,
    vmobjectRenderFillOpacityRange: vmobjectSurfaceFillRenderEvidence.opacityRange,
    vmobjectRenderFillSourceContract: vmobjectSurfaceFillRenderEvidence.sourceContract,
    vmobjectRenderFillSummary: vmobjectSurfaceFillRenderEvidence.summary,
    vmobjectRenderFillTransparentCount: vmobjectSurfaceFillRenderEvidence.transparentCount,
    vmobjectRenderFillTriangleCount: vmobjectSurfaceFillRenderEvidence.triangleCount,
    vmobjectRenderFillVertexCount: vmobjectSurfaceFillRenderEvidence.vertexCount,
    mobjectShadeIn3DCount: uniformSummary.shadeIn3DCount,
    mobjectTransparentCount: uniformSummary.transparentCount,
    mobjectUniformCount: uniformSummary.objectCount,
    mobjectUniformSummary: uniformSummary.summary,
    mobjectUnknownInvalidationCount: invalidationOwnership.unknownInvalidationCount,
    mobjectUpdaterActiveInvalidationCount: invalidationOwnership.updaterActiveInvalidationCount,
    objectCount: bindingSummary.objectCount,
    odeTrajectoryBoundsSummary: odeTrajectorySummary.boundsSummary,
    odeTrajectoryCount: odeTrajectorySummary.trajectoryCount,
    odeTrajectoryFiniteSampleCount: odeTrajectorySummary.finiteSampleCount,
    odeTrajectoryInitialStateSummary: odeTrajectorySummary.initialStateSummary,
    odeTrajectoryMethodIds: odeTrajectorySummary.methodIds,
    odeTrajectoryObjectSourceContract: ODE_TRAJECTORY_OBJECT_BRIDGE_SOURCE_CONTRACT,
    odeTrajectorySampleCount: odeTrajectorySummary.sampleCount,
    odeTrajectorySourceContract: odeTrajectorySummary.sourceContract,
    odeTrajectorySolverContract: odeTrajectorySummary.solverContract,
    odeTrajectoryStepCountSummary: odeTrajectorySummary.stepCountSummary,
    odeTrajectoryStepSizeSummary: odeTrajectorySummary.stepSizeSummary,
    odeTrajectoryStoppedCount: odeTrajectorySummary.stoppedCount,
    odeTrajectoryStoppedReasonSummary: odeTrajectorySummary.stoppedReasonSummary,
    odeTrajectorySummary: odeTrajectorySummary.summary,
    odeTrajectorySystemSummary: odeTrajectorySummary.systemSummary,
    odeTrajectoryTailSampleCount: odeTrajectorySummary.tailSampleCount,
    odeTrajectoryTimeRangeSummary: odeTrajectorySummary.timeRangeSummary,
    manimParameterPanelControlCount: parameterPanelSummary.controlCount,
    manimParameterPanelCount: parameterPanelSummary.parameterCount,
    manimParameterPanelDerivedCount: parameterPanelSummary.derivedCount,
    manimParameterPanelIds: parameterPanelSummary.parameterIds,
    manimParameterPanelSelectedId: parameterPanelSummary.activeParameterId,
    manimParameterPanelSummary: parameterPanelSummary.summary,
    manimParameterPanelTimelineCount: parameterPanelSummary.timelineCount,
    parameterTrackerCount: parameterEntries.length,
    parameterTrackerIds: parameterTrackerIdList(parameterEntries),
    parameterTrackerSummary: parameterTrackerSummary(runtimeState),
    parameterTrackerValues: parameterTrackerValueList(parameterEntries),
    reducedMotion,
    sceneFixedInFrameCount: runtimeState.sceneGraph.summary.fixedInFrameCount,
    sceneFixedInFrameIds: runtimeState.sceneGraph.summary.fixedInFrameIds,
    sceneForegroundCount: runtimeState.sceneGraph.summary.foregroundCount,
    sceneForegroundIds: runtimeState.sceneGraph.summary.foregroundIds,
    sceneId: scene.sceneId,
    sceneMembershipActiveIntroducerCount: membership.activeIntroducerIds.length,
    sceneMembershipActiveIntroducerIds: summarizeEvidenceIds(membership.activeIntroducerIds),
    sceneMembershipActiveRemoverCount: membership.activeRemoverIds.length,
    sceneMembershipActiveRemoverIds: summarizeEvidenceIds(membership.activeRemoverIds),
    sceneMembershipEventSummary: membership.eventSummary,
    sceneMembershipExcludedCount: membership.excludedObjectIds.length,
    sceneMembershipExcludedIds: summarizeEvidenceIds(membership.excludedObjectIds),
    sceneMembershipPendingIntroducerCount: membership.pendingIntroducerIds.length,
    sceneMembershipPendingIntroducerIds: summarizeEvidenceIds(membership.pendingIntroducerIds),
    sceneMembershipRemovedCount: membership.removedObjectIds.length,
    sceneMembershipRemovedIds: summarizeEvidenceIds(membership.removedObjectIds),
    sceneMembershipSourceContract: membership.sourceContract,
    sceneMembershipSourceSummary: membership.sourceSummary,
    sceneRestructureDetachedRootCount: sceneRestructure.plan.detachedRootIds.length,
    sceneRestructureDetachedRootIds: summarizeEvidenceIds(sceneRestructure.plan.detachedRootIds),
    sceneRestructureParentCount: sceneRestructure.plan.restructuredParentIds.length,
    sceneRestructureParentIds: summarizeEvidenceIds(sceneRestructure.plan.restructuredParentIds),
    sceneRestructureRemovedCount: sceneRestructure.plan.removedObjectIds.length,
    sceneRestructureRemovedIds: summarizeEvidenceIds(sceneRestructure.plan.removedObjectIds),
    sceneRestructureRequestedCount: sceneRestructure.plan.requestedObjectIds.length,
    sceneRestructureRequestedIds: summarizeEvidenceIds(sceneRestructure.plan.requestedObjectIds),
    sceneRestructureSourceContract: sceneRestructure.plan.sourceContract,
    sceneRestructureSummary: sceneRestructure.plan.summary,
    sceneClearMobjectAfterFixedInFrameIds: summarizeEvidenceIds(sceneClearMobject.afterFixedInFrameIds),
    sceneClearMobjectAfterForegroundIds: summarizeEvidenceIds(sceneClearMobject.afterForegroundIds),
    sceneClearMobjectAfterRenderGroupIds: summarizeEvidenceIds(sceneClearMobject.afterRenderGroupIds),
    sceneClearMobjectAfterSceneIds: summarizeEvidenceIds(sceneClearMobject.afterSceneIds),
    sceneClearMobjectBeforeFixedInFrameIds: summarizeEvidenceIds(sceneClearMobject.beforeFixedInFrameIds),
    sceneClearMobjectBeforeForegroundIds: summarizeEvidenceIds(sceneClearMobject.beforeForegroundIds),
    sceneClearMobjectBeforeRenderGroupIds: summarizeEvidenceIds(sceneClearMobject.beforeRenderGroupIds),
    sceneClearMobjectBeforeSceneIds: summarizeEvidenceIds(sceneClearMobject.beforeSceneIds),
    sceneClearMobjectCleared: sceneClearMobject.cleared,
    sceneClearMobjectClearedObjectCount: sceneClearMobject.clearedObjectCount,
    sceneClearMobjectClearedObjectIds: summarizeEvidenceIds(sceneClearMobject.clearedObjectIds),
    sceneClearMobjectObjectCatalogCount: sceneClearMobject.objectCatalogCount,
    sceneClearMobjectSourceContract: sceneClearMobject.sourceContract,
    sceneClearMobjectSummary: sceneClearMobject.summary,
    sceneRemoveAllExceptMobjectAfterFixedInFrameIds: summarizeEvidenceIds(sceneRemoveAllExceptMobject.afterFixedInFrameIds),
    sceneRemoveAllExceptMobjectAfterForegroundIds: summarizeEvidenceIds(sceneRemoveAllExceptMobject.afterForegroundIds),
    sceneRemoveAllExceptMobjectAfterRenderGroupIds: summarizeEvidenceIds(sceneRemoveAllExceptMobject.afterRenderGroupIds),
    sceneRemoveAllExceptMobjectAfterSceneIds: summarizeEvidenceIds(sceneRemoveAllExceptMobject.afterSceneIds),
    sceneRemoveAllExceptMobjectBeforeFixedInFrameIds: summarizeEvidenceIds(sceneRemoveAllExceptMobject.beforeFixedInFrameIds),
    sceneRemoveAllExceptMobjectBeforeForegroundIds: summarizeEvidenceIds(sceneRemoveAllExceptMobject.beforeForegroundIds),
    sceneRemoveAllExceptMobjectBeforeRenderGroupIds: summarizeEvidenceIds(sceneRemoveAllExceptMobject.beforeRenderGroupIds),
    sceneRemoveAllExceptMobjectBeforeSceneIds: summarizeEvidenceIds(sceneRemoveAllExceptMobject.beforeSceneIds),
    sceneRemoveAllExceptMobjectChanged: sceneRemoveAllExceptMobject.changed,
    sceneRemoveAllExceptMobjectKeptCount: sceneRemoveAllExceptMobject.keptObjectCount,
    sceneRemoveAllExceptMobjectKeptIds: summarizeEvidenceIds(sceneRemoveAllExceptMobject.keptObjectIds),
    sceneRemoveAllExceptMobjectObjectCatalogCount: sceneRemoveAllExceptMobject.objectCatalogCount,
    sceneRemoveAllExceptMobjectRemovedCount: sceneRemoveAllExceptMobject.removedObjectCount,
    sceneRemoveAllExceptMobjectRemovedIds: summarizeEvidenceIds(sceneRemoveAllExceptMobject.removedObjectIds),
    sceneRemoveAllExceptMobjectRequestedKeepIds: summarizeEvidenceIds(sceneRemoveAllExceptMobject.requestedKeepIds),
    sceneRemoveAllExceptMobjectSourceContract: sceneRemoveAllExceptMobject.sourceContract,
    sceneRemoveAllExceptMobjectSummary: sceneRemoveAllExceptMobject.summary,
    sceneBringToFrontMobjectAfterFixedInFrameIds: summarizeEvidenceIds(sceneBringToFrontMobject.afterFixedInFrameIds),
    sceneBringToFrontMobjectAfterForegroundIds: summarizeEvidenceIds(sceneBringToFrontMobject.afterForegroundIds),
    sceneBringToFrontMobjectAfterRenderGroupIds: summarizeEvidenceIds(sceneBringToFrontMobject.afterRenderGroupIds),
    sceneBringToFrontMobjectAfterSceneIds: summarizeEvidenceIds(sceneBringToFrontMobject.afterSceneIds),
    sceneBringToFrontMobjectBeforeFixedInFrameIds: summarizeEvidenceIds(sceneBringToFrontMobject.beforeFixedInFrameIds),
    sceneBringToFrontMobjectBeforeForegroundIds: summarizeEvidenceIds(sceneBringToFrontMobject.beforeForegroundIds),
    sceneBringToFrontMobjectBeforeRenderGroupIds: summarizeEvidenceIds(sceneBringToFrontMobject.beforeRenderGroupIds),
    sceneBringToFrontMobjectBeforeSceneIds: summarizeEvidenceIds(sceneBringToFrontMobject.beforeSceneIds),
    sceneBringToFrontMobjectGroup: sceneBringToFrontMobject.group,
    sceneBringToFrontMobjectMoved: sceneBringToFrontMobject.moved,
    sceneBringToFrontMobjectNextIndex: sceneBringToFrontMobject.nextIndex,
    sceneBringToFrontMobjectObjectId: sceneBringToFrontMobject.objectId,
    sceneBringToFrontMobjectPreviousIndex: sceneBringToFrontMobject.previousIndex,
    sceneBringToFrontMobjectSourceContract: sceneBringToFrontMobject.sourceContract,
    sceneBringToFrontMobjectSummary: sceneBringToFrontMobject.summary,
    sceneSendToBackMobjectAfterFixedInFrameIds: summarizeEvidenceIds(sceneSendToBackMobject.afterFixedInFrameIds),
    sceneSendToBackMobjectAfterForegroundIds: summarizeEvidenceIds(sceneSendToBackMobject.afterForegroundIds),
    sceneSendToBackMobjectAfterRenderGroupIds: summarizeEvidenceIds(sceneSendToBackMobject.afterRenderGroupIds),
    sceneSendToBackMobjectAfterSceneIds: summarizeEvidenceIds(sceneSendToBackMobject.afterSceneIds),
    sceneSendToBackMobjectBeforeFixedInFrameIds: summarizeEvidenceIds(sceneSendToBackMobject.beforeFixedInFrameIds),
    sceneSendToBackMobjectBeforeForegroundIds: summarizeEvidenceIds(sceneSendToBackMobject.beforeForegroundIds),
    sceneSendToBackMobjectBeforeRenderGroupIds: summarizeEvidenceIds(sceneSendToBackMobject.beforeRenderGroupIds),
    sceneSendToBackMobjectBeforeSceneIds: summarizeEvidenceIds(sceneSendToBackMobject.beforeSceneIds),
    sceneSendToBackMobjectGroup: sceneSendToBackMobject.group,
    sceneSendToBackMobjectMoved: sceneSendToBackMobject.moved,
    sceneSendToBackMobjectNextIndex: sceneSendToBackMobject.nextIndex,
    sceneSendToBackMobjectObjectId: sceneSendToBackMobject.objectId,
    sceneSendToBackMobjectPreviousIndex: sceneSendToBackMobject.previousIndex,
    sceneSendToBackMobjectSourceContract: sceneSendToBackMobject.sourceContract,
    sceneSendToBackMobjectSummary: sceneSendToBackMobject.summary,
    sceneAddMobjectAfterFixedInFrameIds: summarizeEvidenceIds(sceneAddMobject.afterFixedInFrameIds),
    sceneAddMobjectAfterForegroundIds: summarizeEvidenceIds(sceneAddMobject.afterForegroundIds),
    sceneAddMobjectAfterRenderGroupIds: summarizeEvidenceIds(sceneAddMobject.afterRenderGroupIds),
    sceneAddMobjectAfterSceneIds: summarizeEvidenceIds(sceneAddMobject.afterSceneIds),
    sceneAddMobjectBeforeFixedInFrameIds: summarizeEvidenceIds(sceneAddMobject.beforeFixedInFrameIds),
    sceneAddMobjectBeforeForegroundIds: summarizeEvidenceIds(sceneAddMobject.beforeForegroundIds),
    sceneAddMobjectBeforeRenderGroupIds: summarizeEvidenceIds(sceneAddMobject.beforeRenderGroupIds),
    sceneAddMobjectBeforeSceneIds: summarizeEvidenceIds(sceneAddMobject.beforeSceneIds),
    sceneAddMobjectAdded: sceneAddMobject.added,
    sceneAddMobjectGroup: sceneAddMobject.group,
    sceneAddMobjectObjectId: sceneAddMobject.objectId,
    sceneAddMobjectRestoredFamilyCount: sceneAddMobject.restoredFamilyCount,
    sceneAddMobjectRestoredFamilyIds: summarizeEvidenceIds(sceneAddMobject.restoredFamilyIds),
    sceneAddMobjectSourceContract: sceneAddMobject.sourceContract,
    sceneAddMobjectSummary: sceneAddMobject.summary,
    sceneReplaceMobjectAfterRenderGroupIds: summarizeEvidenceIds(sceneReplaceMobject.afterRenderGroupIds),
    sceneReplaceMobjectBeforeRenderGroupIds: summarizeEvidenceIds(sceneReplaceMobject.beforeRenderGroupIds),
    sceneReplaceMobjectGroup: sceneReplaceMobject.group,
    sceneReplaceMobjectObjectId: sceneReplaceMobject.objectId,
    sceneReplaceMobjectRemovedFamilyIds: summarizeEvidenceIds(sceneReplaceMobject.removedFamilyIds),
    sceneReplaceMobjectReplaced: sceneReplaceMobject.replaced,
    sceneReplaceMobjectReplacementCount: sceneReplaceMobject.replacementCount,
    sceneReplaceMobjectReplacementIds: summarizeEvidenceIds(sceneReplaceMobject.replacementIds),
    sceneReplaceMobjectRequestedReplacementIds: summarizeEvidenceIds(sceneReplaceMobject.requestedReplacementIds),
    sceneReplaceMobjectRestoredReplacementFamilyIds: summarizeEvidenceIds(sceneReplaceMobject.restoredReplacementFamilyIds),
    sceneReplaceMobjectSourceContract: sceneReplaceMobject.sourceContract,
    sceneReplaceMobjectSummary: sceneReplaceMobject.summary,
    sceneRemoveMobjectAfterFixedInFrameIds: summarizeEvidenceIds(sceneRemoveMobject.afterFixedInFrameIds),
    sceneRemoveMobjectAfterForegroundIds: summarizeEvidenceIds(sceneRemoveMobject.afterForegroundIds),
    sceneRemoveMobjectAfterRenderGroupIds: summarizeEvidenceIds(sceneRemoveMobject.afterRenderGroupIds),
    sceneRemoveMobjectAfterSceneIds: summarizeEvidenceIds(sceneRemoveMobject.afterSceneIds),
    sceneRemoveMobjectBeforeFixedInFrameIds: summarizeEvidenceIds(sceneRemoveMobject.beforeFixedInFrameIds),
    sceneRemoveMobjectBeforeForegroundIds: summarizeEvidenceIds(sceneRemoveMobject.beforeForegroundIds),
    sceneRemoveMobjectBeforeRenderGroupIds: summarizeEvidenceIds(sceneRemoveMobject.beforeRenderGroupIds),
    sceneRemoveMobjectBeforeSceneIds: summarizeEvidenceIds(sceneRemoveMobject.beforeSceneIds),
    sceneRemoveMobjectDescendantRemovedIds: summarizeEvidenceIds(sceneRemoveMobject.descendantRemovedIds),
    sceneRemoveMobjectObjectId: sceneRemoveMobject.objectId,
    sceneRemoveMobjectRemoved: sceneRemoveMobject.removed,
    sceneRemoveMobjectRemovedFamilyCount: sceneRemoveMobject.removedFamilyCount,
    sceneRemoveMobjectRemovedFamilyIds: summarizeEvidenceIds(sceneRemoveMobject.removedFamilyIds),
    sceneRemoveMobjectSourceContract: sceneRemoveMobject.sourceContract,
    sceneRemoveMobjectSummary: sceneRemoveMobject.summary,
    sceneRenderableCount: runtimeState.sceneGraph.summary.sceneRenderableCount,
    sceneRenderableIds: runtimeState.sceneGraph.summary.sceneRenderableIds,
    sceneRenderGroupCount: runtimeState.sceneGraph.summary.renderGroupCount,
    sceneRenderGroupIds: runtimeState.sceneGraph.summary.renderGroupIds,
    sceneRenderGroupOverlapCount: runtimeState.sceneGraph.summary.renderGroupOverlapCount,
    sceneRenderGroupOverlapIds: runtimeState.sceneGraph.summary.renderGroupOverlapIds,
    sceneTopLevelMobjectCount: runtimeState.sceneGraph.summary.topLevelCount,
    semanticBindingCount: bindingSummary.bindingCount,
    semanticBindingConceptIds: bindingSummary.conceptIds,
    semanticBindingSourceContract: bindingSummary.sourceContract,
    soundCueAudibleCount: soundCuePlan.audibleCueCount,
    soundCueCount: soundCuePlan.cueCount,
    soundCueIncludesSound: soundCuePlan.includesSound,
    soundCueIssueCount: soundCuePlan.issueCount,
    soundCueRows: soundCuePlan.rows,
    soundCueScheduledIds: soundCuePlan.scheduledCueIds,
    soundCueSkippedCount: soundCuePlan.skippedCueCount,
    soundCueSourceContract: soundCuePlan.sourceContract,
    soundCueSummary: soundCuePlan.summary,
    streamLineAnimatedWindowCount: streamLineSummary.animatedWindowCount,
    streamLineCompletedLineCount: streamLineSummary.completedLineCount,
    streamLineCount: streamLineSummary.lineCount,
    streamLineCoordinateModeSummary: streamLineSummary.coordinateModeSummary,
    streamLineCycleSecondsSummary: streamLineSummary.cycleSecondsSummary,
    streamLineFrameFiniteVisibleLengthCount: streamLineSummary.frameFiniteVisibleLengthCount,
    streamLineFramePhaseOrder: streamLineSummary.framePhaseOrder,
    streamLineFramePlanSegmentCount: streamLineSummary.framePlanSegmentCount,
    streamLineFramePlanSourceContract: streamLineSummary.framePlanSourceContract,
    streamLineFramePlanVisibleLineCount: streamLineSummary.framePlanVisibleLineCount,
    streamLineFrameVisibleLengthRange: streamLineSummary.frameVisibleLengthRange,
    streamLineFrameVisibleLengthSummary: streamLineSummary.frameVisibleLengthSummary,
    streamLineFrameWindowRangeSummary: streamLineSummary.frameWindowRangeSummary,
    streamLineIntegrationStepSummary: streamLineSummary.integrationStepSummary,
    streamLineObjectCount: streamLineSummary.objectCount,
    streamLinePhaseOffsetRange: streamLineSummary.phaseOffsetRange,
    streamLinePointCount: streamLineSummary.totalPointCount,
    streamLineRevealWindowSummary: streamLineSummary.revealWindowSummary,
    streamLineSeedGridSummary: streamLineSummary.seedGridSummary,
    streamLineSourceContract: streamLineSummary.sourceContract,
    streamLineSetCount: streamLineSummary.streamLineSetCount,
    streamLineStoppedLineCount: streamLineSummary.stoppedLineCount,
    streamLineSummary: streamLineSummary.summary,
    streamLineSystemSummary: streamLineSummary.systemSummary,
    streamLineVisiblePointCount: streamLineSummary.visiblePointCount,
    streamLineVisibleProgressSummary: streamLineSummary.visibleProgressSummary,
    streamLineWrappedWindowCount: streamLineSummary.wrappedWindowCount,
    trackerCount: runtimeState.diagnostics.trackerCount,
    updaterActiveCount: updaterSuspension.activeUpdaterIds.length,
    updaterCount: runtimeState.diagnostics.updaterCount,
    updaterSuspensionPolicy: updaterSuspension.suspensionPolicy,
    updaterSuspensionSourceContract: updaterSuspension.sourceContract,
    updaterSuspendedCount: updaterSuspension.suspendedUpdaterIds.length,
    vectorFieldArrowCount: vectorFieldSummary.arrowCount,
    vectorFieldArrowLengthRange: vectorFieldSummary.arrowLengthRange,
    vectorFieldColorBandSummary: vectorFieldSummary.colorBandSummary,
    vectorFieldCoordinateModeSummary: vectorFieldSummary.coordinateModeSummary,
    vectorFieldFiniteArrowLengthCount: vectorFieldSummary.finiteArrowLengthCount,
    vectorFieldCount: vectorFieldSummary.vectorFieldCount,
    vectorFieldFiniteVectorCount: vectorFieldSummary.finiteVectorCount,
    vectorFieldHighBandCount: vectorFieldSummary.highBandCount,
    vectorFieldLengthEncodingMonotonic: vectorFieldSummary.lengthEncodingMonotonic,
    vectorFieldLengthEncodingSummary: vectorFieldSummary.lengthEncodingSummary,
    vectorFieldLowBandCount: vectorFieldSummary.lowBandCount,
    vectorFieldMaxMagnitude: vectorFieldSummary.maxMagnitude,
    vectorFieldMidBandCount: vectorFieldSummary.midBandCount,
    vectorFieldSampleCount: vectorFieldSummary.sampleCount,
    vectorFieldSampleGridSummary: vectorFieldSummary.sampleGridSummary,
    vectorFieldSourceContract: vectorFieldSummary.sourceContract,
    vectorFieldSummary: vectorFieldSummary.summary,
    vectorFieldSystemSummary: vectorFieldSummary.systemSummary,
    vectorFieldZeroBandCount: vectorFieldSummary.zeroBandCount,
    vectorFieldZeroVectorCount: vectorFieldSummary.zeroVectorCount,
    vmobjectBezierAnchorCount: vmobjectBezierSummary.anchorPointCount,
    vmobjectBezierCubicSegmentCount: vmobjectBezierSummary.cubicSegmentCount,
    vmobjectBezierHandleCount: vmobjectBezierSummary.handlePointCount,
    vmobjectBezierPathCount: vmobjectBezierSummary.pathCount,
    vmobjectBezierSamplePointCount: vmobjectBezierSummary.samplePointCount,
    vmobjectBezierSegmentCount: vmobjectBezierSummary.segmentCount,
    vmobjectBezierSourceContract: vmobjectBezierSummary.sourceContract,
    vmobjectBezierSummary: vmobjectBezierSummary.summary,
    vmobjectPathBuilderAddCubicBezierCurveToCount: vmobjectPathBuilderEvidence.addCubicBezierCurveToCount,
    vmobjectPathBuilderAddLineToCount: vmobjectPathBuilderEvidence.addLineToCount,
    vmobjectPathBuilderAnchorPointCount: vmobjectPathBuilderEvidence.anchorPointCount,
    vmobjectPathBuilderClosePathCount: vmobjectPathBuilderEvidence.closePathCount,
    vmobjectPathBuilderClosedPathCount: vmobjectPathBuilderEvidence.closedPathCount,
    vmobjectPathBuilderCommandCount: vmobjectPathBuilderEvidence.commandCount,
    vmobjectPathBuilderCubicSegmentCount: vmobjectPathBuilderEvidence.cubicSegmentCount,
    vmobjectPathBuilderHandlePointCount: vmobjectPathBuilderEvidence.handlePointCount,
    vmobjectPathBuilderLineSegmentCount: vmobjectPathBuilderEvidence.lineSegmentCount,
    vmobjectPathBuilderOperationSummary: vmobjectPathBuilderEvidence.operationSummary,
    vmobjectPathBuilderPathCount: vmobjectPathBuilderEvidence.pathCount,
    vmobjectPathBuilderPathIds: vmobjectPathBuilderEvidence.pathIds,
    vmobjectPathBuilderPlans: vmobjectPathBuilderEvidence.plans,
    vmobjectPathBuilderSegmentCount: vmobjectPathBuilderEvidence.segmentCount,
    vmobjectPathBuilderSetPointsAsCornersCount: vmobjectPathBuilderEvidence.setPointsAsCornersCount,
    vmobjectPathBuilderSignature: vmobjectPathBuilderEvidence.signature,
    vmobjectPathBuilderSourceContract: vmobjectPathBuilderEvidence.sourceContract,
    vmobjectPathBuilderStartNewPathCount: vmobjectPathBuilderEvidence.startNewPathCount,
    vmobjectPathBuilderSummary: vmobjectPathBuilderEvidence.summary,
    vmobjectSmoothPathAnchorPointCount: vmobjectSmoothPathEvidence.anchorPointCount,
    vmobjectSmoothPathChangeAnchorModeCount: vmobjectSmoothPathEvidence.changeAnchorModeCount,
    vmobjectSmoothPathCommandCount: vmobjectSmoothPathEvidence.commandCount,
    vmobjectSmoothPathContinuityPassCount: vmobjectSmoothPathEvidence.continuityPassCount,
    vmobjectSmoothPathCount: vmobjectSmoothPathEvidence.pathCount,
    vmobjectSmoothPathCubicSegmentCount: vmobjectSmoothPathEvidence.cubicSegmentCount,
    vmobjectSmoothPathHandlePointCount: vmobjectSmoothPathEvidence.handlePointCount,
    vmobjectSmoothPathIds: vmobjectSmoothPathEvidence.pathIds,
    vmobjectSmoothPathInsertNCurvesCount: vmobjectSmoothPathEvidence.insertNCurvesCount,
    vmobjectSmoothPathMakeSmoothCount: vmobjectSmoothPathEvidence.makeSmoothCount,
    vmobjectSmoothPathMaxHandleLength: vmobjectSmoothPathEvidence.maxHandleLength,
    vmobjectSmoothPathOperationSummary: vmobjectSmoothPathEvidence.operationSummary,
    vmobjectSmoothPathPlans: vmobjectSmoothPathEvidence.plans,
    vmobjectSmoothPathSetPointsSmoothlyCount: vmobjectSmoothPathEvidence.setPointsSmoothlyCount,
    vmobjectSmoothPathSignature: vmobjectSmoothPathEvidence.signature,
    vmobjectSmoothPathSmoothingModeSummary: vmobjectSmoothPathEvidence.smoothingModeSummary,
    vmobjectSmoothPathSourceContract: vmobjectSmoothPathEvidence.sourceContract,
    vmobjectSmoothPathSummary: vmobjectSmoothPathEvidence.summary,
    vmobjectBaseNormalObjectIds: vmobjectStyleSummary.baseNormalObjectIds,
    vmobjectFillCount: vmobjectStyleSummary.fillCount,
    vmobjectMaxAntiAliasWidth: vmobjectStyleSummary.maxAntiAliasWidth,
    vmobjectMaxJointAngleDegrees: vmobjectStyleSummary.maxJointAngleDegrees,
    vmobjectMaxStrokeWidth: vmobjectStyleSummary.maxStrokeWidth,
    vmobjectMinStrokeOpacity: vmobjectStyleSummary.minStrokeOpacity,
    vmobjectStrokeZoomScreenSpaceCount: vmobjectStyleSummary.strokeZoomScreenSpaceCount,
    vmobjectStrokeZoomWorldSpaceCount: vmobjectStyleSummary.strokeZoomWorldSpaceCount,
    vmobjectStyleCount: vmobjectStyleSummary.styleCount,
    vmobjectStyleObjectIds: vmobjectStyleSummary.styleObjectIds,
    vmobjectStyleSummary: vmobjectStyleSummary.styleSummary,
    vmobjectTransparentStrokeCount: vmobjectStyleSummary.transparentStrokeCount
  };
}

export function evidenceDataAttributes(snapshot: MathSceneEvidenceSnapshot): Record<string, string> {
  const randomSeedAttributes = randomSeedDataAttributes({
    algorithm: "mulberry32",
    seed: snapshot.manimRandomSeed,
    signature: snapshot.manimRandomSeedSignature,
    source: "scene"
  });
  const sceneInitializationAttributes = mathSceneInitializationDataAttributes({
    cameraFrameId: "snapshot",
    cameraFrameReady: snapshot.manimSceneInitCameraFrameReady,
    cameraId: "snapshot",
    cameraReady: snapshot.manimSceneInitCameraReady,
    fileWriterReady: snapshot.manimSceneInitFileWriterReady,
    numPlays: snapshot.manimSceneInitNumPlays,
    randomSeedSignature: snapshot.manimSceneInitRandomSeedSignature,
    ready: snapshot.manimSceneInitReady,
    redoStackCount: snapshot.manimSceneInitRedoCount,
    renderGroupCount: snapshot.manimSceneInitRenderGroupCount,
    renderGroupIds: snapshot.manimSceneInitRenderGroupIds,
    sceneId: snapshot.sceneId,
    sceneTimeSeconds: snapshot.manimSceneInitTimeSeconds,
    sourceContract: snapshot.manimSceneInitSourceContract,
    sourceSummary: snapshot.manimSceneInitSourceSummary,
    summary: snapshot.manimSceneInitSummary,
    topLevelMobjectCount: snapshot.manimSceneInitTopLevelMobjectCount,
    undoStackCount: snapshot.manimSceneInitUndoCount
  });
  const vmobjectBezierAttributes = vmobjectBezierPathDataAttributes({
    anchorPointCount: snapshot.vmobjectBezierAnchorCount,
    closedPathCount: 0,
    cubicSegmentCount: snapshot.vmobjectBezierCubicSegmentCount,
    handlePointCount: snapshot.vmobjectBezierHandleCount,
    pathCount: snapshot.vmobjectBezierPathCount,
    pathIds: "snapshot",
    samplePointCount: snapshot.vmobjectBezierSamplePointCount,
    segmentCount: snapshot.vmobjectBezierSegmentCount,
    sourceContract: snapshot.vmobjectBezierSourceContract ?? VMOBJECT_BEZIER_PATH_SOURCE_CONTRACT,
    summary: snapshot.vmobjectBezierSummary
  });
  const vmobjectPathBuilderAttributes = vmobjectPathConstructionDataAttributes({
    addCubicBezierCurveToCount: snapshot.vmobjectPathBuilderAddCubicBezierCurveToCount,
    addLineToCount: snapshot.vmobjectPathBuilderAddLineToCount,
    anchorPointCount: snapshot.vmobjectPathBuilderAnchorPointCount,
    closePathCount: snapshot.vmobjectPathBuilderClosePathCount,
    closedPathCount: snapshot.vmobjectPathBuilderClosedPathCount,
    commandCount: snapshot.vmobjectPathBuilderCommandCount,
    cubicSegmentCount: snapshot.vmobjectPathBuilderCubicSegmentCount,
    handlePointCount: snapshot.vmobjectPathBuilderHandlePointCount,
    lineSegmentCount: snapshot.vmobjectPathBuilderLineSegmentCount,
    operationSummary: snapshot.vmobjectPathBuilderOperationSummary,
    pathCount: snapshot.vmobjectPathBuilderPathCount,
    pathIds: snapshot.vmobjectPathBuilderPathIds,
    plans: snapshot.vmobjectPathBuilderPlans,
    segmentCount: snapshot.vmobjectPathBuilderSegmentCount,
    setPointsAsCornersCount: snapshot.vmobjectPathBuilderSetPointsAsCornersCount,
    signature: snapshot.vmobjectPathBuilderSignature,
    sourceContract: snapshot.vmobjectPathBuilderSourceContract,
    startNewPathCount: snapshot.vmobjectPathBuilderStartNewPathCount,
    summary: snapshot.vmobjectPathBuilderSummary
  });
  const vmobjectSmoothPathAttributes = vmobjectSmoothPathDataAttributes({
    anchorPointCount: snapshot.vmobjectSmoothPathAnchorPointCount,
    changeAnchorModeCount: snapshot.vmobjectSmoothPathChangeAnchorModeCount,
    commandCount: snapshot.vmobjectSmoothPathCommandCount,
    continuityPassCount: snapshot.vmobjectSmoothPathContinuityPassCount,
    cubicSegmentCount: snapshot.vmobjectSmoothPathCubicSegmentCount,
    handlePointCount: snapshot.vmobjectSmoothPathHandlePointCount,
    insertNCurvesCount: snapshot.vmobjectSmoothPathInsertNCurvesCount,
    makeSmoothCount: snapshot.vmobjectSmoothPathMakeSmoothCount,
    maxHandleLength: snapshot.vmobjectSmoothPathMaxHandleLength,
    operationSummary: snapshot.vmobjectSmoothPathOperationSummary,
    pathCount: snapshot.vmobjectSmoothPathCount,
    pathIds: snapshot.vmobjectSmoothPathIds,
    plans: snapshot.vmobjectSmoothPathPlans,
    setPointsSmoothlyCount: snapshot.vmobjectSmoothPathSetPointsSmoothlyCount,
    signature: snapshot.vmobjectSmoothPathSignature,
    smoothingModeSummary: snapshot.vmobjectSmoothPathSmoothingModeSummary,
    sourceContract: snapshot.vmobjectSmoothPathSourceContract,
    summary: snapshot.vmobjectSmoothPathSummary
  });
  const vmobjectStyleAttributes = vmobjectStyleEvidenceDataAttributes({
    baseNormalObjectIds: snapshot.vmobjectBaseNormalObjectIds,
    fillCount: snapshot.vmobjectFillCount,
    maxAntiAliasWidth: snapshot.vmobjectMaxAntiAliasWidth,
    maxJointAngleDegrees: snapshot.vmobjectMaxJointAngleDegrees,
    maxStrokeWidth: snapshot.vmobjectMaxStrokeWidth,
    minStrokeOpacity: snapshot.vmobjectMinStrokeOpacity,
    strokeZoomScreenSpaceCount: snapshot.vmobjectStrokeZoomScreenSpaceCount,
    strokeZoomWorldSpaceCount: snapshot.vmobjectStrokeZoomWorldSpaceCount,
    styleCount: snapshot.vmobjectStyleCount,
    styleObjectIds: snapshot.vmobjectStyleObjectIds,
    styleSummary: snapshot.vmobjectStyleSummary,
    transparentStrokeCount: snapshot.vmobjectTransparentStrokeCount
  });
  const odeTrajectoryAttributes = odeTrajectoryDataAttributes({
    boundsSummary: snapshot.odeTrajectoryBoundsSummary,
    finiteSampleCount: snapshot.odeTrajectoryFiniteSampleCount,
    initialStateSummary: snapshot.odeTrajectoryInitialStateSummary,
    methodIds: snapshot.odeTrajectoryMethodIds,
    sampleCount: snapshot.odeTrajectorySampleCount,
    sourceContract: snapshot.odeTrajectorySourceContract ?? ODE_TRAJECTORY_SOURCE_CONTRACT,
    solverContract: snapshot.odeTrajectorySolverContract,
    stepCountSummary: snapshot.odeTrajectoryStepCountSummary,
    stepSizeSummary: snapshot.odeTrajectoryStepSizeSummary,
    stoppedCount: snapshot.odeTrajectoryStoppedCount,
    stoppedReasonSummary: snapshot.odeTrajectoryStoppedReasonSummary,
    summary: snapshot.odeTrajectorySummary,
    systemSummary: snapshot.odeTrajectorySystemSummary,
    tailSampleCount: snapshot.odeTrajectoryTailSampleCount,
    timeRangeSummary: snapshot.odeTrajectoryTimeRangeSummary,
    trajectoryCount: snapshot.odeTrajectoryCount,
    trajectoryIds: "snapshot"
  });
  const odeTrajectoryObjectBridgeAttributes = odeTrajectoryObjectBridgeDataAttributes(
    snapshot.odeTrajectoryObjectSourceContract ?? ODE_TRAJECTORY_OBJECT_BRIDGE_SOURCE_CONTRACT
  );
  const vectorFieldAttributes = vectorFieldDataAttributes({
    arrowCount: snapshot.vectorFieldArrowCount,
    arrowLengthRange: snapshot.vectorFieldArrowLengthRange,
    colorBandSummary: snapshot.vectorFieldColorBandSummary,
    coordinateModeSummary: snapshot.vectorFieldCoordinateModeSummary,
    finiteArrowLengthCount: snapshot.vectorFieldFiniteArrowLengthCount,
    finiteVectorCount: snapshot.vectorFieldFiniteVectorCount,
    highBandCount: snapshot.vectorFieldHighBandCount,
    lengthEncodingMonotonic: snapshot.vectorFieldLengthEncodingMonotonic,
    lengthEncodingSummary: snapshot.vectorFieldLengthEncodingSummary,
    lowBandCount: snapshot.vectorFieldLowBandCount,
    maxMagnitude: snapshot.vectorFieldMaxMagnitude,
    midBandCount: snapshot.vectorFieldMidBandCount,
    sampleCount: snapshot.vectorFieldSampleCount,
    sampleGridSummary: snapshot.vectorFieldSampleGridSummary,
    sourceContract: snapshot.vectorFieldSourceContract ?? VECTOR_FIELD_SOURCE_CONTRACT,
    summary: snapshot.vectorFieldSummary,
    systemSummary: snapshot.vectorFieldSystemSummary,
    vectorFieldCount: snapshot.vectorFieldCount,
    vectorFieldIds: "snapshot",
    zeroBandCount: snapshot.vectorFieldZeroBandCount,
    zeroVectorCount: snapshot.vectorFieldZeroVectorCount
  });
  const streamLineAttributes = streamLineDataAttributes({
    animatedWindowCount: snapshot.streamLineAnimatedWindowCount,
    completedLineCount: snapshot.streamLineCompletedLineCount,
    coordinateModeSummary: snapshot.streamLineCoordinateModeSummary,
    cycleSecondsSummary: snapshot.streamLineCycleSecondsSummary,
    frameFiniteVisibleLengthCount: snapshot.streamLineFrameFiniteVisibleLengthCount,
    framePhaseOrder: snapshot.streamLineFramePhaseOrder,
    framePlanSegmentCount: snapshot.streamLineFramePlanSegmentCount,
    framePlanSourceContract: snapshot.streamLineFramePlanSourceContract ?? STREAM_LINE_FRAME_PLAN_SOURCE_CONTRACT,
    framePlanVisibleLineCount: snapshot.streamLineFramePlanVisibleLineCount,
    frameVisibleLengthRange: snapshot.streamLineFrameVisibleLengthRange,
    frameVisibleLengthSummary: snapshot.streamLineFrameVisibleLengthSummary,
    frameWindowRangeSummary: snapshot.streamLineFrameWindowRangeSummary,
    integrationStepSummary: snapshot.streamLineIntegrationStepSummary,
    lineCount: snapshot.streamLineCount,
    objectCount: snapshot.streamLineObjectCount,
    phaseOffsetRange: snapshot.streamLinePhaseOffsetRange,
    revealWindowSummary: snapshot.streamLineRevealWindowSummary,
    seedGridSummary: snapshot.streamLineSeedGridSummary,
    sourceContract: snapshot.streamLineSourceContract ?? STREAM_LINE_SOURCE_CONTRACT,
    stoppedLineCount: snapshot.streamLineStoppedLineCount,
    streamLineIds: "snapshot",
    streamLineSetCount: snapshot.streamLineSetCount,
    summary: snapshot.streamLineSummary,
    systemSummary: snapshot.streamLineSystemSummary,
    totalPointCount: snapshot.streamLinePointCount,
    visibleProgressSummary: snapshot.streamLineVisibleProgressSummary,
    visiblePointCount: snapshot.streamLineVisiblePointCount,
    wrappedWindowCount: snapshot.streamLineWrappedWindowCount
  });
  const mobjectDataArrayAttributes = mobjectDataTableDataAttributes({
    finitePointCount: snapshot.mobjectDataArrayFinitePointCount,
    objectIds: snapshot.mobjectDataArrayObjectIds,
    pointCount: snapshot.mobjectDataArrayPointCount,
    rgbaCount: snapshot.mobjectDataArrayRgbaCount,
    rowCount: snapshot.mobjectDataArrayRowCount,
    rows: snapshot.mobjectDataArrayRows,
    semanticRoleCount: snapshot.mobjectDataArrayRoleCount,
    semanticRoles: snapshot.mobjectDataArraySemanticRoles === "none" ? [] : snapshot.mobjectDataArraySemanticRoles.split(","),
    signature: snapshot.mobjectDataArraySignature,
    sourceContract: snapshot.mobjectDataArraySourceContract
  });
  const mobjectPointGenerationAttributes = mobjectPointGenerationDataAttributes({
    finitePointCount: snapshot.mobjectPointGenerationFinitePointCount,
    generatedObjectCount: snapshot.mobjectPointGenerationGeneratedObjectCount,
    generatorKindSummary: snapshot.mobjectPointGenerationGeneratorKindSummary,
    nonFinitePointCount: snapshot.mobjectPointGenerationNonFinitePointCount,
    objectCount: snapshot.mobjectPointGenerationObjectCount,
    pointCount: snapshot.mobjectPointGenerationPointCount,
    rows: snapshot.mobjectPointGenerationRows,
    signature: snapshot.mobjectPointGenerationSignature,
    sourceContract: snapshot.mobjectPointGenerationSourceContract,
    summary: snapshot.mobjectPointGenerationSummary,
    zeroPointObjectCount: snapshot.mobjectPointGenerationZeroPointObjectCount,
    zeroPointObjectIds: snapshot.mobjectPointGenerationZeroPointObjectIds
  });
  const mobjectPointTransformAttributes = mobjectPointTransformDataAttributes({
    changedPointCount: snapshot.mobjectPointTransformChangedPointCount,
    finiteTransformedPointCount: snapshot.mobjectPointTransformFiniteTransformedPointCount,
    maxDisplacement: snapshot.mobjectPointTransformMaxDisplacement,
    objectCount: snapshot.mobjectPointTransformObjectCount,
    operationCount: snapshot.mobjectPointTransformOperationCount,
    operationIds: snapshot.mobjectPointTransformOperationIds,
    rowCount: snapshot.mobjectPointTransformRowCount,
    rows: snapshot.mobjectPointTransformRows,
    signature: snapshot.mobjectPointTransformSignature,
    sourceContract: snapshot.mobjectPointTransformSourceContract,
    sourcePointCount: snapshot.mobjectPointTransformSourcePointCount,
    summary: snapshot.mobjectPointTransformSummary,
    transformableObjectCount: snapshot.mobjectPointTransformTransformableObjectCount,
    transformedPointCount: snapshot.mobjectPointTransformTransformedPointCount
  });
  const mobjectPointCloudAttributes = mobjectPointCloudDataAttributes({
    emptyFamilyCount: snapshot.mobjectPointCloudEmptyFamilyCount,
    familyCount: snapshot.mobjectPointCloudFamilyCount,
    familyIds: snapshot.mobjectPointCloudFamilyIds,
    familyWithPointsCount: snapshot.mobjectPointCloudFamilyWithPointsCount,
    objectWithPointsCount: snapshot.mobjectPointCloudObjectWithPointsCount,
    pointCount: snapshot.mobjectPointCloudPointCount,
    rows: snapshot.mobjectPointCloudRows,
    signature: snapshot.mobjectPointCloudSignature,
    sourceContract: snapshot.mobjectPointCloudSourceContract
  });
  const manimConfigDigestAttributes = manimConfigDigestDataAttributes({
    classSummary: snapshot.manimConfigDigestClassSummary,
    clippingPlaneCount: snapshot.manimConfigDigestClippingPlaneCount,
    defaultedValueCount: snapshot.manimConfigDigestDefaultedValueCount,
    explicitOverrideCount: snapshot.manimConfigDigestExplicitOverrideCount,
    familyId: snapshot.familyId,
    fixedInFrameCount: snapshot.manimConfigDigestFixedInFrameCount,
    objectCount: snapshot.manimConfigDigestObjectCount,
    opacityRange: snapshot.manimConfigDigestOpacityRange,
    rowSummary: snapshot.manimConfigDigestRowSummary,
    rows: [],
    sceneId: snapshot.sceneId,
    shadeIn3DCount: snapshot.manimConfigDigestShadeIn3DCount,
    signature: snapshot.manimConfigDigestSignature,
    sourceContract: snapshot.manimConfigDigestSourceContract,
    summary: snapshot.manimConfigDigestSummary,
    version: "mais-manim-config-digest/v1",
    vmobjectCount: snapshot.manimConfigDigestVmobjectCount,
    zIndexRange: snapshot.manimConfigDigestZIndexRange
  });
  const mobjectBoundingBoxAttributes = mobjectBoundingBoxDataAttributes({
    emptyCount: snapshot.mobjectBoundingBoxEmptyCount,
    finiteCount: snapshot.mobjectBoundingBoxFiniteCount,
    objectIds: snapshot.mobjectBoundingBoxObjectIds,
    rowCount: snapshot.mobjectBoundingBoxCount,
    rows: snapshot.mobjectBoundingBoxRows,
    signature: snapshot.mobjectBoundingBoxSignature,
    sourceContract: snapshot.mobjectBoundingBoxSourceContract
  });
  const mobjectStatePayloadAttributes = mobjectStatePayloadDataAttributes({
    becomeAppliedCount: snapshot.mobjectStatePayloadBecomeAppliedCount,
    becomeNodeCount: snapshot.mobjectStatePayloadBecomeNodeCount,
    becomePointCount: snapshot.mobjectStatePayloadBecomePointCount,
    becomeReadyCount: snapshot.mobjectStatePayloadBecomeReadyCount,
    becomeRenderDataNodeCount: snapshot.mobjectStatePayloadBecomeRenderDataCount,
    restorableObjectCount: snapshot.mobjectStatePayloadRestorableCount,
    restoreMismatchCount: snapshot.mobjectStatePayloadRestoreMismatchCount,
    restoreNodeCount: snapshot.mobjectStatePayloadRestoreNodeCount,
    restorePointCount: snapshot.mobjectStatePayloadRestorePointCount,
    restoreReadyCount: snapshot.mobjectStatePayloadRestoreReadyCount,
    restoreRenderDataNodeCount: snapshot.mobjectStatePayloadRestoreRenderDataCount,
    restoreSourceSummary: snapshot.mobjectStatePayloadRestoreSourceSummary,
    restoreUniformNodeCount: snapshot.mobjectStatePayloadRestoreUniformNodeCount,
    rows: snapshot.mobjectStatePayloadRows,
    signature: snapshot.mobjectStatePayloadSignature,
    sourceContract: snapshot.mobjectStatePayloadSourceContract ?? MOBJECT_STATE_SOURCE_CONTRACT,
    snapshotCount: snapshot.mobjectStatePayloadSnapshotCount,
    stateFamilyRootCount: snapshot.mobjectStatePayloadFamilyRootCount,
    stateSnapshotNodeCount: snapshot.mobjectStatePayloadNodeCount,
    targetableObjectCount: snapshot.mobjectStatePayloadTargetableCount,
    targetCount: snapshot.mobjectStatePayloadTargetCount,
    targetIds: snapshot.mobjectStatePayloadTargetIds === "none" ? [] : snapshot.mobjectStatePayloadTargetIds.split(","),
    targetNodeCount: snapshot.mobjectStatePayloadTargetNodeCount,
    targetPointCount: snapshot.mobjectStatePayloadTargetPointCount,
    targetRenderDataNodeCount: snapshot.mobjectStatePayloadTargetRenderDataCount
  });
  const mobjectStateRestoreBridgeAttributes = mobjectStateRestoreBridgeDataAttributes({
    afterFamilyIds: parseEvidenceIds(snapshot.mobjectStateRestoreBridgeAfterFamilyIds),
    afterObjectIds: parseEvidenceIds(snapshot.mobjectStateRestoreBridgeAfterObjectIds),
    beforeFamilyIds: parseEvidenceIds(snapshot.mobjectStateRestoreBridgeBeforeFamilyIds),
    beforeObjectIds: parseEvidenceIds(snapshot.mobjectStateRestoreBridgeBeforeObjectIds),
    currentSignature: snapshot.mobjectStateRestoreBridgeCurrentSignature,
    familyPreserved: snapshot.mobjectStateRestoreBridgeFamilyPreserved,
    identityPreserved: snapshot.mobjectStateRestoreBridgeIdentityPreserved,
    objectId: snapshot.mobjectStateRestoreBridgeObjectId,
    restored: snapshot.mobjectStateRestoreBridgeRestored,
    restoredSignature: snapshot.mobjectStateRestoreBridgeRestoredSignature,
    restoreMismatchCount: snapshot.mobjectStateRestoreBridgeRestoreMismatchCount,
    savedFamilyIds: parseEvidenceIds(snapshot.mobjectStateRestoreBridgeSavedFamilyIds),
    savedNodeCount: snapshot.mobjectStateRestoreBridgeSavedNodeCount,
    savedPointCount: snapshot.mobjectStateRestoreBridgeSavedPointCount,
    savedSignature: snapshot.mobjectStateRestoreBridgeSavedSignature,
    sourceContract:
      snapshot.mobjectStateRestoreBridgeSourceContract ?? MOBJECT_STATE_RESTORE_BRIDGE_SOURCE_CONTRACT,
    summary: snapshot.mobjectStateRestoreBridgeSummary,
    version: "mais-manim-mobject-state-restore-bridge/v1"
  });
  const mobjectMoveToTargetBridgeAttributes = mobjectMoveToTargetBridgeDataAttributes({
    afterFamilyIds: parseEvidenceIds(snapshot.mobjectMoveToTargetAfterFamilyIds),
    afterSignature: snapshot.mobjectMoveToTargetAfterSignature,
    appliedNodeCount: snapshot.mobjectMoveToTargetAppliedNodeCount,
    becomeApplied: snapshot.mobjectMoveToTargetBecomeApplied,
    familyPreserved: snapshot.mobjectMoveToTargetFamilyPreserved,
    identityPreserved: snapshot.mobjectMoveToTargetIdentityPreserved,
    objectId: snapshot.mobjectMoveToTargetObjectId,
    renderStateChanged: snapshot.mobjectMoveToTargetRenderStateChanged,
    sourceContract: snapshot.mobjectMoveToTargetSourceContract ?? MOBJECT_MOVE_TO_TARGET_BRIDGE_SOURCE_CONTRACT,
    sourceFamilyIds: parseEvidenceIds(snapshot.mobjectMoveToTargetSourceFamilyIds),
    sourceNodeCount: snapshot.mobjectMoveToTargetSourceNodeCount,
    sourceSignature: snapshot.mobjectMoveToTargetSourceSignature,
    summary: snapshot.mobjectMoveToTargetSummary,
    targetFamilyIds: parseEvidenceIds(snapshot.mobjectMoveToTargetTargetFamilyIds),
    targetGenerated: snapshot.mobjectMoveToTargetTargetGenerated,
    targetId: snapshot.mobjectMoveToTargetTargetId,
    targetNodeCount: snapshot.mobjectMoveToTargetTargetNodeCount,
    targetPointCount: snapshot.mobjectMoveToTargetTargetPointCount,
    targetSignature: snapshot.mobjectMoveToTargetTargetSignature,
    version: "mais-manim-mobject-move-to-target-bridge/v1"
  });
  const mobjectAnchorAttributes = mobjectAnchorEvidenceDataAttributes({
    anchorNameCount: snapshot.mobjectAnchorNameCount,
    anchorNames: snapshot.mobjectAnchorNames,
    anchorPointCount: snapshot.mobjectAnchorPointCount,
    emptyBoundingBoxCount: snapshot.mobjectAnchorEmptyBoundingBoxCount,
    finiteAnchorPointCount: snapshot.mobjectAnchorFinitePointCount,
    objectCount: snapshot.mobjectAnchorObjectCount,
    objectIds: snapshot.mobjectAnchorObjectIds,
    sourceContract: snapshot.mobjectAnchorSourceContract,
    summary: snapshot.mobjectAnchorSummary
  } as Parameters<typeof mobjectAnchorEvidenceDataAttributes>[0]);
  const mobjectMaterialUniformAttributes = mobjectMaterialUniformEvidenceDataAttributes({
    clippingPlaneCount: snapshot.mobjectMaterialClippingPlaneCount,
    depthWriteEnabledCount: snapshot.mobjectMaterialDepthWriteEnabledCount,
    objectCount: snapshot.mobjectMaterialObjectCount,
    objectIds: snapshot.mobjectMaterialObjectIds,
    opacityRange: snapshot.mobjectMaterialOpacityRange,
    shadeIn3DCount: snapshot.mobjectMaterialShadeIn3DCount,
    sourceContract: snapshot.mobjectMaterialSourceContract,
    summary: snapshot.mobjectMaterialSummary,
    transparentCount: snapshot.mobjectMaterialTransparentCount
  } as Parameters<typeof mobjectMaterialUniformEvidenceDataAttributes>[0]);
  const vmobjectLineRenderAttributes = vmobjectLineRenderEvidenceDataAttributes({
    colorRoles: snapshot.vmobjectRenderLineColorRoles,
    objectCount: snapshot.vmobjectRenderLineObjectCount,
    objectIds: snapshot.vmobjectRenderLineObjectIds,
    opacityRange: snapshot.vmobjectRenderLineOpacityRange,
    sourceContract: snapshot.vmobjectRenderLineSourceContract,
    strokeWidthRange: snapshot.vmobjectRenderLineStrokeWidthRange,
    summary: snapshot.vmobjectRenderLineSummary,
    transparentCount: snapshot.vmobjectRenderLineTransparentCount
  } as Parameters<typeof vmobjectLineRenderEvidenceDataAttributes>[0]);
  const vmobjectSurfaceFillRenderAttributes = vmobjectSurfaceFillRenderEvidenceDataAttributes({
    colorRoles: snapshot.vmobjectRenderFillColorRoles,
    meshObjectCount: snapshot.vmobjectRenderFillMeshObjectCount,
    meshObjectIds: snapshot.vmobjectRenderFillMeshObjectIds,
    objectCount: snapshot.vmobjectRenderFillObjectCount,
    objectIds: snapshot.vmobjectRenderFillObjectIds,
    opacityRange: snapshot.vmobjectRenderFillOpacityRange,
    sourceContract: snapshot.vmobjectRenderFillSourceContract,
    summary: snapshot.vmobjectRenderFillSummary,
    transparentCount: snapshot.vmobjectRenderFillTransparentCount,
    triangleCount: snapshot.vmobjectRenderFillTriangleCount,
    vertexCount: snapshot.vmobjectRenderFillVertexCount
  } as Parameters<typeof vmobjectSurfaceFillRenderEvidenceDataAttributes>[0]);
  const runtimeRenderStateAttributes = runtimeRenderStateEvidenceDataAttributes({
    finitePointCount: snapshot.runtimeRenderStateFinitePointCount,
    kindSummary: snapshot.runtimeRenderStateKindSummary,
    objectCount: snapshot.runtimeRenderStateObjectCount,
    objectIds: snapshot.runtimeRenderStateObjectIds,
    pointCount: snapshot.runtimeRenderStatePointCount,
    sourceContract: snapshot.runtimeRenderStateSourceContract,
    styledObjectCount: snapshot.runtimeRenderStateStyledObjectCount,
    summary: snapshot.runtimeRenderStateSummary,
    wireframeCurveCount: snapshot.runtimeRenderStateWireframeCurveCount,
    zeroPointObjectCount: snapshot.runtimeRenderStateZeroPointObjectCount
  } as Parameters<typeof runtimeRenderStateEvidenceDataAttributes>[0]);
  const timelineAttributes = timelineEvidenceDataAttributes({
    activeConceptId: snapshot.manimTimelineActiveConceptId,
    activeStepIndex: snapshot.manimTimelineActiveStepIndex,
    activeStepType: snapshot.manimTimelineActiveStepType as Parameters<typeof timelineEvidenceDataAttributes>[0]["activeStepType"],
    cameraStepCount: snapshot.manimTimelineCameraStepCount,
    completedStepCount: snapshot.manimTimelineCompletedStepCount,
    elapsedSeconds: snapshot.manimTimelineElapsedSeconds,
    focusTargetCount: snapshot.manimTimelineFocusTargetCount,
    focusTargetIds: snapshot.manimTimelineFocusTargetIds,
    focusTargetPolicy: snapshot.manimTimelineFocusTargetPolicy as Parameters<typeof timelineEvidenceDataAttributes>[0]["focusTargetPolicy"],
    focusTargetPrimaryId: snapshot.manimTimelineFocusTargetPrimaryId,
    focusTargetSummary: snapshot.manimTimelineFocusTargetSummary,
    pendingStepCount: snapshot.manimTimelinePendingStepCount,
    progress: snapshot.manimTimelineProgress,
    reducedMotion: snapshot.manimTimelineReducedMotion,
    skipAnimations: snapshot.manimTimelineSkipAnimations,
    sourceContract: snapshot.manimTimelineSourceContract as Parameters<typeof timelineEvidenceDataAttributes>[0]["sourceContract"],
    stepCount: snapshot.manimTimelineStepCount,
    stepTypeSummary: snapshot.manimTimelineStepTypeSummary,
    summary: snapshot.manimTimelineSummary,
    totalDuration: snapshot.manimTimelineTotalDuration,
    waitStepCount: snapshot.manimTimelineWaitStepCount
  });
  const mobjectDirtyStatePayloadAttributes = mobjectDirtyStatePayloadDataAttributes({
    animationOwnedInvalidationCount: snapshot.mobjectDirtyStateAnimationOwnedCount,
    boundingBoxStaleCount: snapshot.mobjectDirtyStateBoundingBoxStaleCount,
    cacheStatus: snapshot.mobjectDirtyStateCacheStatus,
    dataChangedCount: snapshot.mobjectDirtyStateDataChangedCount,
    familyCacheReusable: snapshot.mobjectDirtyStateFamilyCacheReusable,
    familyChangedCount: snapshot.mobjectDirtyStateFamilyChangedCount,
    invalidatedCount: snapshot.mobjectDirtyStateInvalidatedCount,
    invalidatedIds: snapshot.mobjectDirtyStateInvalidatedIds === "none" ? [] : snapshot.mobjectDirtyStateInvalidatedIds.split(","),
    metadataChangedCount: snapshot.mobjectDirtyStateMetadataChangedCount,
    recomputedFamilyCount: snapshot.mobjectDirtyStateRecomputedFamilyCount,
    recomputedFamilyIds: snapshot.mobjectDirtyStateRecomputedFamilyIds,
    reusedFamilyCount: snapshot.mobjectDirtyStateReusedFamilyCount,
    reusedFamilyIds: snapshot.mobjectDirtyStateReusedFamilyIds,
    rows: snapshot.mobjectDirtyStateRows,
    signature: snapshot.mobjectDirtyStateSignature,
    sourceContract: snapshot.mobjectDirtyStateSourceContract,
    totalObjectCount: snapshot.mobjectDirtyStateTotalObjectCount,
    unchangedCount: snapshot.mobjectDirtyStateUnchangedCount,
    unknownInvalidationCount: snapshot.mobjectDirtyStateUnknownCount,
    uniformsChangedCount: snapshot.mobjectDirtyStateUniformsChangedCount,
    updaterActiveInvalidationCount: snapshot.mobjectDirtyStateUpdaterActiveCount
  });
  const mobjectCopyPlanAttributes = mobjectCopyPlanDataAttributes({
    childLinkCount: snapshot.mobjectCopyChildLinkCount,
    cloneIsolationPreserved: snapshot.mobjectCopyCloneIsolationPreserved,
    cloneIsolationSummary: snapshot.mobjectCopyCloneIsolationSummary,
    copiedFamilyCount: snapshot.mobjectCopyFamilyCount,
    copiedNodeIds: [],
    copyRootId: snapshot.mobjectCopyRootId,
    idMap: snapshot.mobjectCopyIdMap,
    nodes: {},
    parentLinkCount: snapshot.mobjectCopyParentLinkCount,
    pointCount: snapshot.mobjectCopyPointCount,
    renderDataNodeCount: snapshot.mobjectCopyRenderDataCount,
    sharedReferenceCount: snapshot.mobjectCopySharedReferenceCount,
    signature: snapshot.mobjectCopySignature,
    sourceContract: snapshot.mobjectCopySourceContract ?? MOBJECT_COPY_SOURCE_CONTRACT,
    sourceFamilyIds: [],
    sourceObjectId: snapshot.mobjectCopySourceId
  });
  const mobjectLayoutAttributes = {
    "data-viz-mobject-layout-buff": snapshot.mobjectLayoutBuff.toFixed(3),
    "data-viz-mobject-layout-centering-delta": snapshot.mobjectLayoutCenteringDelta,
    "data-viz-mobject-layout-direction": snapshot.mobjectLayoutDirection,
    "data-viz-mobject-layout-frame-anchor": snapshot.mobjectLayoutFrameAnchor,
    "data-viz-mobject-layout-frame-bounds": snapshot.mobjectLayoutFrameBounds,
    "data-viz-mobject-layout-frame-target": snapshot.mobjectLayoutFrameTarget,
    "data-viz-mobject-layout-group-center": snapshot.mobjectLayoutGroupCenter,
    "data-viz-mobject-layout-group-size": snapshot.mobjectLayoutGroupSize,
    "data-viz-mobject-layout-kind": snapshot.mobjectLayoutKind,
    "data-viz-mobject-layout-missing-count": String(snapshot.mobjectLayoutMissingCount),
    "data-viz-mobject-layout-missing-ids": snapshot.mobjectLayoutMissingIds,
    "data-viz-mobject-layout-object-count": String(snapshot.mobjectLayoutObjectCount),
    "data-viz-mobject-layout-object-ids": snapshot.mobjectLayoutObjectIds,
    "data-viz-mobject-layout-signature": snapshot.mobjectLayoutSignature,
    "data-viz-mobject-layout-source-contract": snapshot.mobjectLayoutSourceContract ?? MOBJECT_LAYOUT_SOURCE_CONTRACT,
    "data-viz-mobject-layout-summary": snapshot.mobjectLayoutSummary,
    "data-viz-mobject-layout-target-centers": snapshot.mobjectLayoutTargetCenters
  };
  const mobjectRenderOrderAttributes = {
    "data-viz-mobject-render-order-all-ids": snapshot.mobjectRenderOrderAllIds,
    "data-viz-mobject-render-order-fixed-count": String(snapshot.mobjectRenderOrderFixedCount),
    "data-viz-mobject-render-order-fixed-ids": snapshot.mobjectRenderOrderFixedIds,
    "data-viz-mobject-render-order-foreground-count": String(snapshot.mobjectRenderOrderForegroundCount),
    "data-viz-mobject-render-order-foreground-ids": snapshot.mobjectRenderOrderForegroundIds,
    "data-viz-mobject-render-order-rendered-count": String(snapshot.mobjectRenderOrderRenderedCount),
    "data-viz-mobject-render-order-scene-ids": snapshot.mobjectRenderOrderSceneIds,
    "data-viz-mobject-render-order-signature": snapshot.mobjectRenderOrderSignature,
    "data-viz-mobject-render-order-summary": snapshot.mobjectRenderOrderSummary,
    "data-viz-mobject-render-order-top-level-count": String(snapshot.mobjectRenderOrderTopLevelCount),
    "data-viz-mobject-render-order-top-level-ids": snapshot.mobjectRenderOrderTopLevelIds
  };
  const floorPlaneAttributes = sceneFloorPlaneDataAttributes({
    errorMessage: snapshot.manimFloorPlaneError === "none" ? null : snapshot.manimFloorPlaneError,
    eulerAxes: snapshot.manimFloorPlaneEulerAxes === "none" ? null : snapshot.manimFloorPlaneEulerAxes as "zxz" | "zxy",
    floorPlaneVersion: "mais-manim-floor-plane/v1",
    plane: snapshot.manimFloorPlane,
    raisesError: snapshot.manimFloorPlaneRaisesError,
    sourceContract: snapshot.manimFloorPlaneSourceContract,
    summary: snapshot.manimFloorPlaneSummary,
    valid: snapshot.manimFloorPlaneValid
  });
  const keyControlAttributes = sceneKeyControlDataAttributes({
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
    sourceContract: snapshot.manimKeyControlSourceContract ?? SCENE_KEY_CONTROL_SOURCE_CONTRACT,
    summary: snapshot.manimKeyControlSummary,
    undoRequested: snapshot.manimKeyControlUndoRequested
  });
  const cameraFrameAttributes = cameraFramePayloadDataAttributes({
    activeShotId: snapshot.manimCameraFrameActiveShot,
    canonicalShotId: snapshot.manimCameraFrameCanonicalShot,
    currentEulerAngles: {
      gamma: snapshot.manimCameraFrameGamma,
      phi: snapshot.manimCameraFramePhi,
      theta: snapshot.manimCameraFrameTheta
    },
    currentFov: snapshot.manimCameraFrameFov,
    currentFrameId: snapshot.manimCameraFrameCurrentId,
    currentCameraOriginPoint: snapshot.manimCameraFrameOriginCameraPoint.split(",").map(Number) as [number, number, number],
    currentInverseViewMatrixDeterminant: snapshot.manimCameraFrameInverseViewMatrixDeterminant,
    currentInverseViewMatrixSummary: snapshot.manimCameraFrameInverseViewMatrixSummary,
    currentPosition: snapshot.manimCameraFramePosition.split(",").map(Number) as [number, number, number],
    currentProgress: snapshot.manimCameraFrameProgress,
    currentTarget: snapshot.manimCameraFrameTarget.split(",").map(Number) as [number, number, number],
    currentTargetCameraPoint: snapshot.manimCameraFrameTargetCameraPoint.split(",").map(Number) as [number, number, number],
    currentUniforms: {
      center: snapshot.manimCameraFrameUniformCenter.split(",").map(Number) as [number, number, number],
      fovy: snapshot.manimCameraFrameUniformFovy,
      orientationQuaternion: snapshot.manimCameraFrameUniformOrientationQuaternion.split(",").map(Number) as [number, number, number, number],
      shape: snapshot.manimCameraFrameUniformShape.split(",").map(Number) as [number, number]
    },
    currentViewMatrixDeterminant: snapshot.manimCameraFrameViewMatrixDeterminant,
    currentViewMatrixSummary: snapshot.manimCameraFrameViewMatrixSummary,
    finiteMatrixEntryCount: snapshot.manimCameraFrameFiniteMatrixCount,
    fixedInFrameOverlayCount: snapshot.manimCameraFrameFixedOverlayCount,
    frameCount: snapshot.manimCameraFrameCount,
    matrixDeterminantMaxError: snapshot.manimCameraFrameMatrixDeterminantMaxError,
    matrixDeterminantReady: snapshot.manimCameraFrameMatrixDeterminantReady,
    matrixDeterminantSummary: snapshot.manimCameraFrameMatrixDeterminantSummary,
    matrixEntryCount: snapshot.manimCameraFrameMatrixCount,
    orientationOrthonormalMaxError: snapshot.manimCameraFrameOrientationOrthonormalMaxError,
    orientationOrthonormalReady: snapshot.manimCameraFrameOrientationOrthonormalReady,
    pointRoundTripMaxError: snapshot.manimCameraFramePointRoundTripMaxError,
    pointRoundTripReady: snapshot.manimCameraFramePointRoundTripReady,
    pointRoundTripSourceContract: snapshot.manimCameraFramePointRoundTripSourceContract,
    pointRoundTripSummary: snapshot.manimCameraFramePointRoundTripSummary,
    resetShotId: snapshot.manimCameraFrameResetShot,
    restorableFrameCount: snapshot.manimCameraFrameRestorableCount,
    rows: snapshot.manimCameraFrameRows,
    sceneId: snapshot.sceneId,
    signature: snapshot.manimCameraFrameSignature,
    sourceContract: snapshot.manimCameraFrameSourceContract,
    uniformCount: snapshot.manimCameraFrameUniformCount,
    uniformQuaternionMaxError: snapshot.manimCameraFrameUniformQuaternionMaxError,
    uniformQuaternionReady: snapshot.manimCameraFrameUniformQuaternionReady,
    uniformSummary: snapshot.manimCameraFrameUniformSummary,
    viewInverseMaxError: snapshot.manimCameraFrameViewInverseMaxError,
    viewInverseReady: snapshot.manimCameraFrameViewInverseReady
  });
  const cameraShotCatalogAttributes = cameraShotCatalogDataAttributes({
    activeShotId: snapshot.manimCameraShotCatalogSelectedId,
    canonicalShotId: snapshot.manimCameraShotCatalogCanonicalId,
    missingTimelineShotCount: snapshot.manimCameraShotCatalogMissingCount,
    missingTimelineShotIds: snapshot.manimCameraShotCatalogMissingIds,
    shotCount: snapshot.manimCameraShotCatalogCount,
    shotIds: snapshot.manimCameraShotCatalogIds,
    sourceContract: snapshot.manimCameraShotCatalogSourceContract,
    summary: snapshot.manimCameraShotCatalogSummary,
    timelineShotIds: snapshot.manimCameraShotCatalogTimelineIds
  });
  const cameraDirectorAttributes = cameraDirectorEvidenceDataAttributes({
    activeShotId: snapshot.manimCameraDirectorActiveShotId,
    activeUpdaterCount: snapshot.manimCameraDirectorActiveUpdaterCount,
    activeUpdaterIds: snapshot.manimCameraDirectorActiveUpdaterIds,
    ambientRotationDegrees: snapshot.manimCameraDirectorAmbientRotationDegrees,
    canonicalShotId: snapshot.manimCameraDirectorCanonicalShotId,
    progress: snapshot.manimCameraDirectorProgress,
    resetShotId: snapshot.manimCameraDirectorResetShotId,
    shotFov: snapshot.manimCameraDirectorShotFov,
    shotPosition: snapshot.manimCameraDirectorShotPosition,
    shotTarget: snapshot.manimCameraDirectorShotTarget,
    sourceContract: snapshot.manimCameraDirectorSourceContract as Parameters<typeof cameraDirectorEvidenceDataAttributes>[0]["sourceContract"],
    summary: snapshot.manimCameraDirectorSummary,
    timelineShotId: snapshot.manimCameraDirectorTimelineShotId,
    transitionSummary: snapshot.manimCameraDirectorTransitionSummary,
    updaterCount: snapshot.manimCameraDirectorUpdaterCount
  });
  const creationPrimitiveAttributes = creationPrimitivePlanDataAttributes({
    drawBorderThenFillCount: snapshot.manimCreationDrawBorderThenFillCount,
    fadeCount: snapshot.manimCreationFadeCount,
    growFromCenterCount: snapshot.manimCreationGrowFromCenterCount,
    primitiveCount: snapshot.manimCreationPrimitiveCount,
    sceneId: snapshot.sceneId,
    showCreationCount: snapshot.manimCreationShowCount,
    summary: snapshot.manimCreationSummary
  });
  const showCreationAttributes = showCreationEvidenceDataAttributes({
    drawRangeSummary: snapshot.manimShowCreationDrawRanges,
    frameCount: snapshot.manimShowCreationFrameCount,
    frames: snapshot.manimShowCreationFrames,
    objectIds: snapshot.manimShowCreationObjectIds,
    opacitySchedule: snapshot.manimShowCreationOpacitySchedule,
    partialPolicy: snapshot.manimShowCreationPartialPolicy ?? SHOW_CREATION_PARTIAL_POLICY,
    phaseSequence: snapshot.manimShowCreationPhaseSequence,
    primitiveCount: snapshot.manimShowCreationPrimitiveCount,
    progressRange: snapshot.manimShowCreationProgressRange,
    sourceContract: snapshot.manimShowCreationSourceContract ?? SHOW_CREATION_SOURCE_CONTRACT,
    summary: snapshot.manimShowCreationSummary
  });
  const drawBorderThenFillAttributes = drawBorderThenFillEvidenceDataAttributes({
    borderFrameCount: snapshot.manimDrawBorderFillBorderFrameCount,
    drawRangeSummary: snapshot.manimDrawBorderFillDrawRanges,
    fillFrameCount: snapshot.manimDrawBorderFillFillFrameCount,
    fillOpacitySchedule: snapshot.manimDrawBorderFillFillOpacitySchedule,
    frameCount: snapshot.manimDrawBorderFillFrameCount,
    frames: snapshot.manimDrawBorderFillFrames,
    objectIds: snapshot.manimDrawBorderFillObjectIds,
    phasePolicy: snapshot.manimDrawBorderFillPhasePolicy ?? DRAW_BORDER_THEN_FILL_PHASE_POLICY,
    phaseSequence: snapshot.manimDrawBorderFillPhaseSequence,
    primitiveCount: snapshot.manimDrawBorderFillPrimitiveCount,
    sourceContract: snapshot.manimDrawBorderFillSourceContract ?? DRAW_BORDER_THEN_FILL_SOURCE_CONTRACT,
    strokeOpacitySchedule: snapshot.manimDrawBorderFillStrokeOpacitySchedule,
    summary: snapshot.manimDrawBorderFillSummary
  });
  const fadeGrowAttributes = fadeGrowEvidenceDataAttributes({
    fadeFrameCount: snapshot.manimFadeGrowFadeFrameCount,
    frameCount: snapshot.manimFadeGrowFrameCount,
    frames: snapshot.manimFadeGrowFrames,
    growFrameCount: snapshot.manimFadeGrowGrowFrameCount,
    kindSequence: snapshot.manimFadeGrowKindSequence,
    objectIds: snapshot.manimFadeGrowObjectIds,
    opacitySchedule: snapshot.manimFadeGrowOpacitySchedule,
    phasePolicy: snapshot.manimFadeGrowPhasePolicy ?? FADE_GROW_PHASE_POLICY,
    phaseSequence: snapshot.manimFadeGrowPhaseSequence,
    primitiveCount: snapshot.manimFadeGrowPrimitiveCount,
    scaleSchedule: snapshot.manimFadeGrowScaleSchedule,
    sourceContract: snapshot.manimFadeGrowSourceContract ?? FADE_GROW_SOURCE_CONTRACT,
    summary: snapshot.manimFadeGrowSummary
  });
  const indicationPrimitiveAttributes = indicationPrimitivePlanDataAttributes({
    circumscribeCount: snapshot.manimIndicationCircumscribeCount,
    conceptIds: snapshot.manimIndicationConceptIds,
    flashCount: snapshot.manimIndicationFlashCount,
    highlightBeatCount: snapshot.manimIndicationHighlightBeatCount,
    indicationCount: snapshot.manimIndicationCount,
    missingTargetCount: snapshot.manimIndicationMissingTargetCount,
    pulseCount: snapshot.manimIndicationPulseCount,
    sceneId: snapshot.sceneId,
    sourceContract: snapshot.manimIndicationSourceContract ?? INDICATION_PRIMITIVE_SOURCE_CONTRACT,
    statePolicy: snapshot.manimIndicationStatePolicy ?? INDICATION_PRIMITIVE_STATE_POLICY,
    summary: snapshot.manimIndicationSummary,
    targetObjectCount: snapshot.manimIndicationTargetObjectCount,
    targetObjectIds: snapshot.manimIndicationTargetObjectIds
  });
  const runtimeIndicationOverlayAttributes = runtimeIndicationOverlayDataAttributes({
    activeConceptId: snapshot.manimIndicationRuntimeOverlayActiveConceptId,
    focusTargetCount: snapshot.manimIndicationRuntimeOverlayFocusTargetCount,
    focusTargetIds: snapshot.manimIndicationRuntimeOverlayFocusTargetIds,
    focusTargetPolicy: snapshot.manimIndicationRuntimeOverlayFocusTargetPolicy ?? RUNTIME_INDICATION_OVERLAY_FOCUS_TARGET_POLICY,
    focusTargetPrimaryId: snapshot.manimIndicationRuntimeOverlayFocusTargetPrimaryId,
    focusTargetSummary: snapshot.manimIndicationRuntimeOverlayFocusTargetSummary,
    frameCount: snapshot.manimIndicationRuntimeOverlayCount,
    lineFrameCount: snapshot.manimIndicationRuntimeOverlayLineCount,
    objectCount: snapshot.manimIndicationRuntimeOverlayObjectCount,
    objectIds: snapshot.manimIndicationRuntimeOverlayObjectIds,
    pointFrameCount: snapshot.manimIndicationRuntimeOverlayPointCount,
    sourceContract: snapshot.manimIndicationRuntimeOverlaySourceContract ?? RUNTIME_INDICATION_OVERLAY_SOURCE_CONTRACT,
    statePolicy: snapshot.manimIndicationRuntimeOverlayStatePolicy ?? RUNTIME_INDICATION_OVERLAY_STATE_POLICY,
    summary: snapshot.manimIndicationRuntimeOverlaySummary
  });
  const axisTickAttributes = axisTickPlanDataAttributes({
    axisSpacingByAxis: {},
    axisObjectCount: snapshot.manimAxisObjectCount,
    finiteTickCount: snapshot.manimAxisFiniteTickCount,
    finiteLabelAnchorCount: snapshot.manimAxisLabelAnchorFiniteCount,
    labelAnchorCount: snapshot.manimAxisLabelAnchorCount,
    labelAnchorSummary: snapshot.manimAxisLabelAnchorSummary,
    labelAnchors: [],
    labelCount: snapshot.manimAxisLabelCount,
    majorTickCount: snapshot.manimAxisMajorTickCount,
    sceneId: snapshot.sceneId,
    spacingMaxDelta: snapshot.manimAxisSpacingMaxDelta,
    spacingSummary: snapshot.manimAxisSpacingSummary,
    tickCount: snapshot.manimAxisTickCount,
    ticks: []
  });
  const coordinateSystemAttributes = coordinateSystemEvidenceDataAttributes({
    axisCount: snapshot.manimCoordinateAxisCount,
    finiteSampleCount: snapshot.manimCoordinateC2pFiniteCount,
    mathRangeSummary: snapshot.manimCoordinateMathRange,
    maxRoundTripError: snapshot.manimCoordinateP2cRoundTripError,
    originWorldPoint: snapshot.manimCoordinateOriginWorldPoint,
    sampleCount: snapshot.manimCoordinateSampleCount,
    scaleSummary: snapshot.manimCoordinateScale,
    summary: snapshot.manimCoordinateSummary,
    systemReady: snapshot.manimCoordinateSystemReady,
    version: "mais-manim-coordinate-system/v1",
    worldRangeSummary: snapshot.manimCoordinateWorldRange
  });
  const coordinateSpaceAttributes = coordinateSpaceEvidenceDataAttributes({
    arcLength: snapshot.manimCoordinateSpaceArcLength,
    c2pSummary: snapshot.manimCoordinateSpaceC2pSummary,
    curveSampleCount: snapshot.manimCoordinateSpaceCurveSampleCount,
    endpointSummary: snapshot.manimCoordinateSpaceEndpoints,
    finiteSampleCount: snapshot.manimCoordinateSpaceFiniteSampleCount,
    mathRangeSummary: snapshot.manimCoordinateSpaceMathRange,
    maxRoundTripError: snapshot.manimCoordinateSpaceRoundTripError,
    p2cSummary: snapshot.manimCoordinateSpaceP2cSummary,
    resampledSampleCount: snapshot.manimCoordinateSpaceResampledCount,
    sampleCount: snapshot.manimCoordinateSpaceSampleCount,
    scaleSummary: snapshot.manimCoordinateSpaceScale,
    sourceContract: snapshot.manimCoordinateSpaceSourceContract as Parameters<typeof coordinateSpaceEvidenceDataAttributes>[0]["sourceContract"],
    summary: snapshot.manimCoordinateSpaceSummary,
    vectorDeltaSummary: snapshot.manimCoordinateSpaceVectorDelta,
    worldRangeSummary: snapshot.manimCoordinateSpaceWorldRange
  });
  const surfaceObjectAttributes = surfaceObjectEvidenceDataAttributes({
    boundsSummary: snapshot.manimSurfaceBounds,
    cellCount: snapshot.manimSurfaceCellCount,
    finiteNormalCount: snapshot.manimSurfaceFiniteNormalCount,
    finiteSampleCount: snapshot.manimSurfaceFiniteSampleCount,
    gridSummary: snapshot.manimSurfaceGridSummary,
    normalCount: snapshot.manimSurfaceNormalCount,
    objectCount: snapshot.manimSurfaceObjectCount,
    objectIds: snapshot.manimSurfaceObjectIds,
    rangeSummary: snapshot.manimSurfaceRangeSummary,
    sampleCount: snapshot.manimSurfaceSampleCount,
    sourceContract: snapshot.manimSurfaceSourceContract ?? SURFACE_OBJECT_SOURCE_CONTRACT,
    summary: snapshot.manimSurfaceSummary,
    topologySummary: snapshot.manimSurfaceTopologySummary,
    triangleCount: snapshot.manimSurfaceTriangleCount,
    version: "mais-manim-surface-object/v1",
    wireframeColumnCount: snapshot.manimSurfaceWireframeColumnCount,
    wireframeRowCount: snapshot.manimSurfaceWireframeRowCount
  });
  const moveAlongVectorFieldAttributes = moveAlongVectorFieldEvidenceDataAttributes({
    blockedCount: snapshot.manimMoveAlongVectorFieldBlockedCount,
    coordinateModes: snapshot.manimMoveAlongVectorFieldCoordinateModes,
    deltaSecondsSummary: snapshot.manimMoveAlongVectorFieldDeltaSummary,
    displacementMagnitudeRange: snapshot.manimMoveAlongVectorFieldDisplacementMagnitudeRange,
    finiteDisplacementCount: snapshot.manimMoveAlongVectorFieldFiniteDisplacementCount,
    finiteVectorCount: snapshot.manimMoveAlongVectorFieldFiniteVectorCount,
    movedCount: snapshot.manimMoveAlongVectorFieldMovedCount,
    objectIds: snapshot.manimMoveAlongVectorFieldObjectIds,
    speedScaleSummary: snapshot.manimMoveAlongVectorFieldSpeedSummary,
    sourceContract: snapshot.manimMoveAlongVectorFieldSourceContract ?? MOVE_ALONG_VECTOR_FIELD_SOURCE_CONTRACT,
    statusSummary: snapshot.manimMoveAlongVectorFieldStatusSummary,
    summary: snapshot.manimMoveAlongVectorFieldSummary,
    updaterCount: snapshot.manimMoveAlongVectorFieldCount,
    updaterIds: snapshot.manimMoveAlongVectorFieldUpdaterIds,
    vectorMagnitudeRange: snapshot.manimMoveAlongVectorFieldVectorMagnitudeRange,
    version: "mais-manim-move-along-vector-field/v1"
  });
  const tracingTailAttributes = tracingTailEvidenceDataAttributes({
    ageRange: snapshot.manimTracingTailAgeRange,
    bufferCapacity: snapshot.manimTracingTailBufferCapacity,
    bufferPolicySummary: snapshot.manimTracingTailBufferPolicySummary,
    durationSummary: snapshot.manimTracingTailDurationSummary,
    fillRatioSummary: snapshot.manimTracingTailFillRatioSummary,
    finiteSampleCount: snapshot.manimTracingTailFiniteSampleCount,
    freshPointSummary: snapshot.manimTracingTailFreshPointSummary,
    gradientDirectionSummary: snapshot.manimTracingTailGradientDirectionSummary,
    gradientMonotonic: snapshot.manimTracingTailGradientMonotonic,
    gradientSummary: snapshot.manimTracingTailGradientSummary,
    opacityRange: snapshot.manimTracingTailOpacityRange,
    sampleCadenceSummary: snapshot.manimTracingTailSampleCadenceSummary,
    sampleCount: snapshot.manimTracingTailSampleCount,
    sampleTimeOrderSummary: snapshot.manimTracingTailSampleTimeOrderSummary,
    sourceContract: snapshot.manimTracingTailSourceContract ?? TRACING_TAIL_SOURCE_CONTRACT,
    sourceObjectIds: snapshot.manimTracingTailSourceIds,
    stalePointSummary: snapshot.manimTracingTailStalePointSummary,
    strokeWidthRange: snapshot.manimTracingTailStrokeWidthRange,
    summary: snapshot.manimTracingTailSummary,
    tailCount: snapshot.manimTracingTailCount,
    tailIds: snapshot.manimTracingTailIds,
    timestampRange: snapshot.manimTracingTailTimestampRange,
    tracedPointSourceSummary: snapshot.manimTracingTailTracedPointSourceSummary,
    version: "mais-manim-tracing-tail/v1"
  });
  const projectedLabelAttributes = projectedLabelAnchorDataAttributes({
    conceptIds: snapshot.manimProjectedLabelConceptIds,
    hiddenCount: snapshot.manimProjectedLabelHiddenCount,
    hiddenObjectIds: snapshot.manimProjectedLabelHiddenObjectIds,
    labelCount: snapshot.manimProjectedLabelCount,
    objectCount: snapshot.manimProjectedLabelObjectCount,
    objectIds: snapshot.manimProjectedLabelObjectIds,
    sourceContract: snapshot.manimProjectedLabelSourceContract,
    summary: snapshot.manimProjectedLabelSummary,
    visibleCount: snapshot.manimProjectedLabelVisibleCount
  });
  const projectedLabelTextAttributes = formulaLayerProjectedLabelTextDataAttributes({
    objectCount: snapshot.manimProjectedLabelTextObjectCount,
    objectIds: snapshot.manimProjectedLabelTextObjectIds,
    policy: snapshot.manimProjectedLabelTextPolicy as ReturnType<typeof emptyFormulaLayerProjectedLabelTextSummary>["policy"],
    source: snapshot.manimProjectedLabelTextSource as "formula-token",
    sourceContract: snapshot.manimProjectedLabelTextSourceContract,
    summary: snapshot.manimProjectedLabelTextSummary,
    textSummary: snapshot.manimProjectedLabelTextTokenSummary
  });
  const formulaCollisionAttributes = formulaOverlayCollisionDataAttributes({
    collisionCount: snapshot.manimFormulaCollisionCount,
    collisionLabelIds: snapshot.manimFormulaCollisionLabelIds,
    edgeInsetPx: 12,
    formulaBox: { height: 0, width: 0, x: 0, y: 0 },
    formulaId: "evidence",
    mobileViewport: snapshot.manimFormulaMobileViewport,
    overflowEdges: "none",
    placement: "top-left",
    safeAreaStatus: snapshot.manimFormulaSafeAreaStatus as Parameters<typeof formulaOverlayCollisionDataAttributes>[0]["safeAreaStatus"],
    sourceContract: snapshot.manimFormulaCollisionSourceContract,
    summary: snapshot.manimFormulaSafeAreaSummary,
    viewportHeight: 450,
    viewportWidth: 800
  });
  const animationLifecycleAttributes = animationLifecycleDataAttributes({
    animationPlanId: snapshot.manimAnimationLifecyclePlanId,
    begin: {
      animatingStatus: snapshot.manimAnimationLifecycleAnimatingStatus === "started" ? "started" : "none",
      copiedNodeCount: snapshot.manimAnimationLifecycleCopiedNodeCount,
      copyRootId: snapshot.manimAnimationLifecycleObjectId === "none" ? "none" : `${snapshot.manimAnimationLifecycleObjectId}:animation-begin-copy`,
      initialInterpolationAlpha: 0,
      initialInterpolationCallCount: snapshot.manimAnimationLifecycleInitialInterpolateCount === 1 ? 1 : 0,
      snapshotNodeCount: snapshot.manimAnimationLifecycleBeginNodeCount,
      sourcePolicy: snapshot.manimAnimationLifecycleBeginSourcePolicy,
      startsAtProgress: 0,
      suspendedUpdaterCount: snapshot.manimAnimationLifecycleSuspendedUpdaterCount,
      suspendedUpdaterIds: [],
      updaterSuspensionPhase: snapshot.manimAnimationLifecycleSuspendedUpdaterCount > 0 ? "animation" : "open"
    },
    familyTupleCount: snapshot.manimAnimationLifecycleFamilyTupleCount,
    finish: {
      animatingStatus: snapshot.manimAnimationLifecycleFinishAnimatingStatus === "finished" ? "finished" : "none",
      colorRoleCount: snapshot.manimAnimationLifecycleFinishColorRoleCount,
      finalInterpolationAlpha: 1,
      finalInterpolationCallCount: snapshot.manimAnimationLifecycleFinalInterpolateCount === 1 ? 1 : 0,
      finishesAtProgress: 1,
      persistentNodeCount: snapshot.manimAnimationLifecyclePersistentNodeCount,
      persistentObjectIds: [],
      renderDataNodeCount: 0,
      targetNodeCount: snapshot.manimAnimationLifecycleFinishNodeCount
    },
    objectId: snapshot.manimAnimationLifecycleObjectId,
    signature: snapshot.manimAnimationLifecycleSignature,
    sourceContract: snapshot.manimAnimationLifecycleSourceContract,
    sourceFamilyIds: [],
    targetFamilyIds: [],
    targetObjectId: snapshot.manimAnimationLifecycleTargetId,
    timing: {
      frameCountAt60Fps: snapshot.manimAnimationLifecycleTimingFrameCount,
      lagRatio: snapshot.manimAnimationLifecycleTimingLagRatio,
      rateFunction: snapshot.manimAnimationLifecycleTimingRateFunction,
      runTimeSeconds: snapshot.manimAnimationLifecycleTimingRunTime,
      sampleAlphas: [0, 0.5, 1]
    }
  } as Parameters<typeof animationLifecycleDataAttributes>[0]);
  const animateBuilderAttributes = mathAnimateBuilderCatalogDataAttributes({
    changedFieldCount: snapshot.manimAnimateBuilderChangedFieldCount,
    changedNodeCount: snapshot.manimAnimateBuilderChangedNodeCount,
    changedNodeIds: parseEvidenceIds(snapshot.manimAnimateBuilderChangedNodeIds),
    firstPlanId: snapshot.manimAnimateBuilderFirstPlanId,
    laggedPlanCount: snapshot.manimAnimateBuilderLaggedCount,
    objectIds: parseEvidenceIds(snapshot.manimAnimateBuilderObjectIds),
    operationCount: snapshot.manimAnimateBuilderOperationCount,
    operationTypes: parseEvidenceIds(snapshot.manimAnimateBuilderOperationTypes),
    pathPlanCount: snapshot.manimAnimateBuilderPathCount,
    planCount: snapshot.manimAnimateBuilderPlanCount,
    sourceContract: snapshot.manimAnimateBuilderSourceContract,
    summary: snapshot.manimAnimateBuilderSummary,
    targetObjectIds: parseEvidenceIds(snapshot.manimAnimateBuilderTargetIds),
    totalDuration: snapshot.manimAnimateBuilderTotalDuration,
    version: "mais-manim-animate-builder/v1"
  });
  const alwaysUpdaterAttributes = alwaysUpdaterAuthoringDataAttributes({
    alwaysMethodCount: snapshot.manimAlwaysUpdaterAlwaysMethodCount,
    alwaysRedrawCount: snapshot.manimAlwaysUpdaterAlwaysRedrawCount,
    dependencyTrackerIds: parseEvidenceIds(snapshot.manimAlwaysUpdaterDependencyTrackerIds),
    factoryCount: snapshot.manimAlwaysUpdaterFactoryCount,
    missingTrackerIds: parseEvidenceIds(snapshot.manimAlwaysUpdaterMissingTrackerIds),
    objectIds: parseEvidenceIds(snapshot.manimAlwaysUpdaterObjectIds),
    operationTypes: parseEvidenceIds(snapshot.manimAlwaysUpdaterOperationTypes),
    sourceContract: snapshot.manimAlwaysUpdaterSourceContract ?? ALWAYS_UPDATER_AUTHORING_SOURCE_CONTRACT,
    summary: snapshot.manimAlwaysUpdaterSummary,
    totalUpdaterCount: snapshot.manimAlwaysUpdaterCount,
    updaterIds: parseEvidenceIds(snapshot.manimAlwaysUpdaterUpdaterIds),
    version: "mais-manim-always-updater/v1"
  });
  const alwaysMethodAttributes = alwaysMethodUpdaterEvidenceDataAttributes({
    boundingBoxSummary: snapshot.manimAlwaysMethodBoundingBoxSummary,
    buffSummary: snapshot.manimAlwaysMethodBuffSummary,
    directionSummary: snapshot.manimAlwaysMethodDirectionSummary,
    dynamicBuffCount: snapshot.manimAlwaysMethodDynamicBuffCount,
    maxPlacementError: snapshot.manimAlwaysMethodMaxPlacementError,
    missingObjectCount: snapshot.manimAlwaysMethodMissingObjectCount,
    missingTargetCount: snapshot.manimAlwaysMethodMissingTargetCount,
    objectIds: snapshot.manimAlwaysMethodObjectIds,
    operationTypes: snapshot.manimAlwaysMethodOperationTypes,
    placedCount: snapshot.manimAlwaysMethodPlacedCount,
    placementSummary: snapshot.manimAlwaysMethodPlacementSummary,
    sourceContract: snapshot.manimAlwaysMethodSourceContract as Parameters<typeof alwaysMethodUpdaterEvidenceDataAttributes>[0]["sourceContract"],
    summary: snapshot.manimAlwaysMethodSummary,
    targetObjectIds: snapshot.manimAlwaysMethodTargetObjectIds,
    updaterCount: snapshot.manimAlwaysMethodCount,
    updaterIds: snapshot.manimAlwaysMethodUpdaterIds
  });
  const transformBeginAttributes = transformBeginPlanDataAttributes({
    alignment: {
      alignedPointPairCount: snapshot.manimTransformBeginAlignedPointPairCount,
      enteringCount: snapshot.manimTransformBeginEnteringCount,
      entryCount: snapshot.manimTransformBeginAlignedEntryCount,
      exitingCount: snapshot.manimTransformBeginExitingCount,
      familyPairIds: parseEvidenceIds(snapshot.manimTransformBeginFamilyPairIds),
      familyPairSummary: snapshot.manimTransformBeginFamilyPairSummary,
      matchedCount: snapshot.manimTransformBeginMatchedCount,
      maxDepth: snapshot.manimTransformBeginMaxDepth,
      typeMismatchCount: snapshot.manimTransformBeginTypeMismatchCount
    },
    animationPlanId: snapshot.manimTransformBeginPlanId,
    dataLocks: {
      alignmentSummary: snapshot.manimTransformBeginDataLockAlignmentSummary,
      entryCount: snapshot.manimTransformBeginDataLockCount,
      kindSummary: snapshot.manimTransformBeginDataLockKindSummary,
      lockedObjectIds: parseEvidenceIds(snapshot.manimTransformBeginLockedObjectIds),
      lockedPointCount: snapshot.manimTransformBeginLockedPointCount,
      lockSummary: snapshot.manimTransformBeginDataLockSummary,
      movingObjectIds: parseEvidenceIds(snapshot.manimTransformBeginMovingObjectIds),
      movingPointCount: snapshot.manimTransformBeginMovingPointCount,
      totalPointCount: snapshot.manimTransformBeginTotalPointCount
    },
    objectId: snapshot.manimTransformBeginObjectId,
    signature: snapshot.manimTransformBeginSignature,
    sourceFamilyIds: parseEvidenceIds(snapshot.manimTransformBeginSourceFamilyIds),
    sourcePolicy: snapshot.manimTransformBeginSourcePolicy,
    targetCreated: snapshot.manimTransformBeginTargetCreated,
    targetFamilyIds: parseEvidenceIds(snapshot.manimTransformBeginTargetFamilyIds),
    targetObjectId: snapshot.manimTransformBeginTargetId
  } as Parameters<typeof transformBeginPlanDataAttributes>[0]);
  const transformPathAttributes = transformPathFunctionCatalogDataAttributes({
    animationPlanCount: snapshot.manimTransformPathPlanCount,
    arcAngleRange: snapshot.manimTransformPathArcAngleRange,
    arcAxisSummary: snapshot.manimTransformPathArcAxisSummary,
    arcMidpointDeviationRange: snapshot.manimTransformPathArcMidpointDeviationRange,
    arcPathCount: snapshot.manimTransformPathArcCount,
    authoredPathCount: snapshot.manimTransformPathAuthoredCount,
    degenerateArcCount: snapshot.manimTransformPathDegenerateArcCount,
    entries: snapshot.manimTransformPathEntries,
    midpointDeviationSummary: snapshot.manimTransformPathMidpointDeviationSummary,
    nonPointFieldPolicy: snapshot.manimTransformPathNonPointFieldPolicy ?? TRANSFORM_PATH_NON_POINT_FIELD_POLICY,
    objectIds: snapshot.manimTransformPathObjectIds,
    pathSummaries: snapshot.manimTransformPathSummaries,
    pointlikeFieldPolicy: snapshot.manimTransformPathPointlikeFieldPolicy ?? TRANSFORM_PATH_POINTLIKE_FIELD_POLICY,
    sampleAlpha: snapshot.manimTransformPathSampleAlpha,
    sampledMidpointSummary: snapshot.manimTransformPathSampledMidpoints,
    sampledPathCount: snapshot.manimTransformPathSampledCount,
    sceneId: snapshot.sceneId,
    sourceContract: snapshot.manimTransformPathSourceContract ?? TRANSFORM_PATH_FUNCTION_SOURCE_CONTRACT,
    straightPathCount: snapshot.manimTransformPathStraightCount,
    summary: snapshot.manimTransformPathSummary
  });
  const rateFunctionAttributes = rateFunctionCatalogDataAttributes({
    alphaPolicy: snapshot.manimRateFunctionAlphaPolicy ?? RATE_FUNCTION_ALPHA_POLICY,
    entries: snapshot.manimRateFunctionEntries,
    linearDuration: snapshot.manimRateFunctionLinearDuration,
    linearStepCount: snapshot.manimRateFunctionLinearCount,
    rateFunctionIds: snapshot.manimRateFunctionIds,
    sceneId: snapshot.sceneId,
    smoothDuration: snapshot.manimRateFunctionSmoothDuration,
    smoothStepCount: snapshot.manimRateFunctionSmoothCount,
    sourceContract: snapshot.manimRateFunctionSourceContract ?? RATE_FUNCTION_SOURCE_CONTRACT,
    stepCount: snapshot.manimRateFunctionStepCount,
    stepTypes: snapshot.manimRateFunctionStepTypes,
    summary: snapshot.manimRateFunctionSummary
  });
  const lagRatioAttributes = lagRatioCatalogDataAttributes({
    animationPlanCount: snapshot.manimLagRatioAnimationPlanCount,
    authoredLagRatioCount: snapshot.manimLagRatioAuthoredCount,
    compositionCount: snapshot.manimLagRatioCompositionCount,
    compositionIds: snapshot.manimLagRatioCompositionIds,
    entries: snapshot.manimLagRatioEntries,
    maxLagRatio: snapshot.manimLagRatioMax,
    nonZeroLagRatioCount: snapshot.manimLagRatioNonZeroCount,
    objectIds: snapshot.manimLagRatioObjectIds,
    sceneId: snapshot.sceneId,
    sourceContract: snapshot.manimLagRatioSourceContract ?? LAG_RATIO_SOURCE_CONTRACT,
    subAlphaPolicy: snapshot.manimLagRatioSubAlphaPolicy ?? LAG_RATIO_SUB_ALPHA_POLICY,
    summary: snapshot.manimLagRatioSummary,
    zeroLagRatioCount: snapshot.manimLagRatioZeroCount
  });
  const subAlphaAttributes = subAlphaScheduleDataAttributes({
    activePlanCount: snapshot.manimSubAlphaActivePlanCount,
    completeNodeCount: snapshot.manimSubAlphaCompleteNodeCount,
    delayedNodeCount: snapshot.manimSubAlphaDelayedNodeCount,
    easedMax: snapshot.manimSubAlphaEasedMax,
    easedMin: snapshot.manimSubAlphaEasedMin,
    easedRange: snapshot.manimSubAlphaEasedRange,
    familyZipCoveredNodeCount: snapshot.manimSubAlphaFamilyZipCoveredNodeCount,
    familyZipMissingNodeCount: snapshot.manimSubAlphaFamilyZipMissingNodeCount,
    familyZipPolicy: snapshot.manimSubAlphaFamilyZipPolicy ?? TRANSFORM_FAMILY_ALIGNMENT_ZIP_POLICY,
    familyZipSequence: snapshot.manimSubAlphaFamilyZipSequence,
    familyZipTupleCount: snapshot.manimSubAlphaFamilyZipTupleCount,
    familyZipUncoveredObjectIds: snapshot.manimSubAlphaFamilyZipUncoveredObjectIds,
    laggedMax: snapshot.manimSubAlphaLaggedMax,
    laggedMin: snapshot.manimSubAlphaLaggedMin,
    laggedRange: snapshot.manimSubAlphaLaggedRange,
    leadingNodeCount: snapshot.manimSubAlphaLeadingNodeCount,
    nodeFrameCount: snapshot.manimSubAlphaNodeCount,
    nodeWindowSummary: snapshot.manimSubAlphaNodeWindowSummary,
    objectIds: snapshot.manimSubAlphaObjectIds,
    partialNodeCount: snapshot.manimSubAlphaPartialNodeCount,
    rateFunctionIds: snapshot.manimSubAlphaRateFunctionIds,
    rawMax: snapshot.manimSubAlphaRawMax,
    rawMin: snapshot.manimSubAlphaRawMin,
    rawRange: snapshot.manimSubAlphaRawRange,
    sceneId: snapshot.sceneId,
    sourceContract: snapshot.manimSubAlphaSourceContract ?? SUB_ALPHA_SOURCE_CONTRACT,
    staggeredNodeCount: snapshot.manimSubAlphaStaggeredNodeCount,
    summary: snapshot.manimSubAlphaSummary,
    windowPolicy: snapshot.manimSubAlphaWindowPolicy ?? SUB_ALPHA_WINDOW_POLICY,
    zeroNodeCount: snapshot.manimSubAlphaZeroNodeCount
  });
  const animationRuntimeAttributes = animationRuntimeEvidenceDataAttributes({
    active: snapshot.manimAnimationRuntimeActive,
    activePlanCount: snapshot.manimAnimationRuntimeActivePlanCount,
    activePlanIds: snapshot.manimAnimationRuntimeActivePlanIds,
    easedProgressRange: snapshot.manimAnimationRuntimeEasedProgressRange,
    finiteBoundingBoxCount: snapshot.manimAnimationRuntimeFiniteBoundingBoxCount,
    laggedProgressRange: snapshot.manimAnimationRuntimeLaggedProgressRange,
    mobjectInterpolateRenderPolicy: snapshot.manimAnimationRuntimeMobjectInterpolatePolicy,
    nodeCount: snapshot.manimAnimationRuntimeNodeCount,
    objectId: snapshot.manimAnimationRuntimeObjectId,
    objectIds: snapshot.manimAnimationRuntimeObjectIds,
    progress: snapshot.manimAnimationRuntimeProgress,
    rateFunctionIds: snapshot.manimAnimationRuntimeRateFunctionIds,
    rawProgressRange: snapshot.manimAnimationRuntimeRawProgressRange,
    renderKindSummary: snapshot.manimAnimationRuntimeRenderKindSummary,
    sourceContract: snapshot.manimAnimationRuntimeSourceContract as Parameters<typeof animationRuntimeEvidenceDataAttributes>[0]["sourceContract"],
    summary: snapshot.manimAnimationRuntimeSummary,
    targetObjectId: snapshot.manimAnimationRuntimeTargetObjectId
  });
  const transformFieldAttributes = transformInterpolateFieldEvidenceDataAttributes({
    arcPathNodeCount: snapshot.manimTransformInterpolateFieldArcPathNodeCount,
    boundingBoxNodeCount: snapshot.manimTransformInterpolateFieldBoundingBoxNodeCount,
    nodeCount: snapshot.manimTransformInterpolateFieldNodeCount,
    nonPointFieldCount: snapshot.manimTransformInterpolateFieldNonPointCount,
    nonPointFieldPolicy: snapshot.manimTransformInterpolateFieldNonPointPolicy as Parameters<typeof transformInterpolateFieldEvidenceDataAttributes>[0]["nonPointFieldPolicy"],
    objectIds: snapshot.manimTransformInterpolateFieldObjectIds,
    pathSummary: snapshot.manimTransformInterpolateFieldPathSummary,
    pointlikeFieldCount: snapshot.manimTransformInterpolateFieldPointlikeCount,
    pointlikeFieldPolicy: snapshot.manimTransformInterpolateFieldPointlikePolicy as Parameters<typeof transformInterpolateFieldEvidenceDataAttributes>[0]["pointlikeFieldPolicy"],
    pointlikeFieldSummary: snapshot.manimTransformInterpolateFieldPointlikeSummary,
    sourceSummary: snapshot.manimTransformInterpolateFieldSourceSummary as Parameters<typeof transformInterpolateFieldEvidenceDataAttributes>[0]["sourceSummary"],
    straightPathNodeCount: snapshot.manimTransformInterpolateFieldStraightPathNodeCount,
    styleNodeCount: snapshot.manimTransformInterpolateFieldStyleNodeCount,
    summary: snapshot.manimTransformInterpolateFieldSummary,
    uniformNodeCount: snapshot.manimTransformInterpolateFieldUniformNodeCount
  });
  const updaterExecutionAttributes = updaterExecutionPlanDataAttributes({
    activeCallSequence:
      snapshot.manimUpdaterExecutionActiveCallSequence === "none"
        ? []
        : snapshot.manimUpdaterExecutionActiveCallSequence.split(">"),
    activeUpdaterCount: snapshot.manimUpdaterExecutionActiveCount,
    activeUpdaterIds: snapshot.manimUpdaterExecutionActiveUpdaterIds,
    dependencyUpdaterCount: snapshot.manimUpdaterExecutionDependencyCount,
    dtAwareUpdaterCount: snapshot.manimUpdaterExecutionDtAwareCount,
    familyPaths: snapshot.manimUpdaterExecutionFamilyPaths === "none" ? [] : snapshot.manimUpdaterExecutionFamilyPaths.split("|"),
    familyTraversalObjectIds:
      snapshot.manimUpdaterExecutionFamilyTraversalObjectIds === "none"
        ? []
        : snapshot.manimUpdaterExecutionFamilyTraversalObjectIds.split(","),
    familyTraversalSummary: snapshot.manimUpdaterExecutionFamilyTraversalSummary,
    idleTraversalObjectIds: snapshot.manimUpdaterExecutionIdleObjectIds === "none" ? [] : snapshot.manimUpdaterExecutionIdleObjectIds.split(","),
    maxDepth: snapshot.manimUpdaterExecutionMaxDepth,
    orderSummary: snapshot.manimUpdaterExecutionOrderSummary,
    phase: snapshot.manimUpdaterExecutionPhase as Parameters<typeof updaterExecutionPlanDataAttributes>[0]["phase"],
    recursiveOrder: snapshot.manimUpdaterExecutionRecursiveOrder,
    rows: snapshot.manimUpdaterExecutionRows,
    rowCount: snapshot.manimUpdaterExecutionRowCount,
    signature: snapshot.manimUpdaterExecutionSignature,
    sourceContract: snapshot.manimUpdaterExecutionSourceContract as Parameters<typeof updaterExecutionPlanDataAttributes>[0]["sourceContract"],
    suspendedUpdaterCount: snapshot.manimUpdaterExecutionSuspendedCount,
    suspendedUpdaterIds: snapshot.manimUpdaterExecutionSuspendedUpdaterIds,
    timelineUpdaterCount: snapshot.manimUpdaterExecutionTimelineCount,
    totalUpdaterCount: snapshot.manimUpdaterExecutionUpdaterCount,
    traversalObjectIds: snapshot.manimUpdaterExecutionObjectIds === "none" ? [] : snapshot.manimUpdaterExecutionObjectIds.split(",")
  } as Parameters<typeof updaterExecutionPlanDataAttributes>[0]);
  const updaterSignatureAttributes = updaterSignatureDataAttributes({
    callSignatures: snapshot.manimUpdaterSignatureCallSignatures === "none" ? [] : snapshot.manimUpdaterSignatureCallSignatures.split("|"),
    dependencyUpdaterIds: snapshot.manimUpdaterSignatureDependencyIds === "none" ? [] : snapshot.manimUpdaterSignatureDependencyIds.split(","),
    dtAwareUpdaterIds: snapshot.manimUpdaterSignatureDtAwareIds === "none" ? [] : snapshot.manimUpdaterSignatureDtAwareIds.split(","),
    entries: snapshot.manimUpdaterSignatureEntries,
    receivesDeltaSecondsIds:
      snapshot.manimUpdaterSignatureReceivesDeltaSecondsIds === "none"
        ? []
        : snapshot.manimUpdaterSignatureReceivesDeltaSecondsIds.split(","),
    receivesTimelineProgressIds:
      snapshot.manimUpdaterSignatureReceivesTimelineProgressIds === "none"
        ? []
        : snapshot.manimUpdaterSignatureReceivesTimelineProgressIds.split(","),
    signature: snapshot.manimUpdaterSignatureSignature,
    sourceSummary: snapshot.manimUpdaterSignatureSourceSummary,
    timelineUpdaterIds: snapshot.manimUpdaterSignatureTimelineIds === "none" ? [] : snapshot.manimUpdaterSignatureTimelineIds.split(","),
    totalUpdaterCount: snapshot.manimUpdaterSignatureCount
  } as Parameters<typeof updaterSignatureDataAttributes>[0]);
  const soundCueAttributes = sceneSoundCueDataAttributes({
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
  const windowEventAttributes = sceneWindowEventDataAttributes({
    callsWindowFocus: snapshot.manimWindowCallsFocus,
    eventType: snapshot.manimWindowEventType,
    hasWindow: snapshot.manimWindowHasWindow,
    height: snapshot.manimWindowHeight,
    noOp: snapshot.manimWindowNoOp,
    returnedEarly: snapshot.manimWindowReturnedEarly,
    sourceContract: snapshot.manimWindowSourceContract,
    summary: snapshot.manimWindowSummary,
    width: snapshot.manimWindowWidth,
    windowEventVersion: "mais-manim-window-events/v1"
  });
  const updatePolicyAttributes = sceneUpdatePolicyDataAttributes({
    alwaysUpdateMobjects: snapshot.manimAlwaysUpdateMobjects,
    forceDraw: snapshot.manimForceDraw,
    hasUpdaters: snapshot.manimHasUpdaters,
    reason: snapshot.manimUpdatePolicyReason,
    shouldCaptureFrame: snapshot.manimShouldCaptureFrame,
    shouldUpdateMobjects: snapshot.manimShouldUpdateMobjects,
    skipAnimations: snapshot.manimSkipAnimations,
    sourceContract: snapshot.manimUpdatePolicySourceContract,
    summary: snapshot.manimUpdatePolicySummary,
    updaterCount: snapshot.manimUpdatePolicyUpdaterCount
  });
  const valueTrackerAttributes = valueTrackerPayloadDataAttributes({
    controlTrackerCount: snapshot.manimValueTrackerControlCount,
    hiddenMobjectIds: snapshot.manimValueTrackerHiddenMobjectIds === "none" ? [] : snapshot.manimValueTrackerHiddenMobjectIds.split(","),
    normalizedValueSummary: snapshot.manimValueTrackerNormalizedValueSummary,
    objectTrackerCount: snapshot.manimValueTrackerObjectCount,
    parameterTrackerCount: snapshot.manimValueTrackerParameterCount,
    progressTrackerCount: snapshot.manimValueTrackerProgressCount,
    rangeSummary: snapshot.manimValueTrackerRangeSummary,
    rows: snapshot.manimValueTrackerRows,
    signature: snapshot.manimValueTrackerSignature,
    sourceContract: snapshot.manimValueTrackerSourceContract,
    sourceSummary: snapshot.manimValueTrackerSourceSummary,
    timelineTrackerCount: snapshot.manimValueTrackerTimelineCount,
    totalTrackerCount: snapshot.manimValueTrackerCount,
    trackerIds: snapshot.manimValueTrackerIds === "none" ? [] : snapshot.manimValueTrackerIds.split(","),
    uniformKeySummary: snapshot.manimValueTrackerUniformKeySummary,
    uniformPairCount: snapshot.manimValueTrackerUniformPairCount,
    uniformValueSummary: snapshot.manimValueTrackerUniformValueSummary,
    valueTrackerCount: snapshot.manimValueTrackerValueCount
  });
  const mobjectFamilyCacheAttributes = mobjectFamilyCacheDataAttributes({
    cacheStatus: snapshot.mobjectFamilyCacheStatus as MobjectFamilyCacheStatus,
    dataDirtyCount: snapshot.mobjectFamilyCacheDataDirtyCount,
    familyCacheReusable: snapshot.mobjectFamilyCacheReusable,
    familyDirtyCount: snapshot.mobjectFamilyCacheFamilyDirtyCount,
    recomputedFamilyCount: snapshot.mobjectFamilyCacheRecomputedCount,
    recomputedFamilyIds:
      snapshot.mobjectFamilyCacheRecomputedIds === "none" ? [] : snapshot.mobjectFamilyCacheRecomputedIds.split(","),
    reusedFamilyCount: snapshot.mobjectFamilyCacheReusedCount,
    reusedFamilyIds: snapshot.mobjectFamilyCacheReusedIds === "none" ? [] : snapshot.mobjectFamilyCacheReusedIds.split(","),
    sourceContract: snapshot.mobjectFamilyCacheSourceContract
  });
  const timeProgressionAttributes = sceneTimeProgressionDataAttributes({
    description: snapshot.manimTimeProgressionDescription,
    finalTime: snapshot.manimTimeProgressionFinalTime,
    fps: snapshot.manimTimeProgressionFps,
    frameInterval: snapshot.manimTimeProgressionFrameInterval,
    mode: snapshot.manimTimeProgressionMode,
    nIterations: snapshot.manimTimeProgressionNIterations,
    overrideSkipAnimations: snapshot.manimTimeProgressionOverrideSkip,
    overshootsRunTime: snapshot.manimTimeProgressionOvershoot,
    runTime: snapshot.manimTimeProgressionRunTime,
    samplingPolicy: snapshot.manimTimeProgressionSamplingPolicy,
    skipAnimations: snapshot.manimTimeProgressionSkipAnimations,
    sourceContract: snapshot.manimTimeProgressionSourceContract,
    summary: snapshot.manimTimeProgressionSummary,
    times: snapshot.manimTimeProgressionTimes
  });
  const waitControlAttributes = sceneWaitControlDataAttributes({
    calledEmitFrameCount: snapshot.manimWaitControlCalledEmitFrameCount,
    calledUpdateFrameCount: snapshot.manimWaitControlCalledUpdateFrameCount,
    description: snapshot.manimWaitControlDescription,
    effectiveDuration: snapshot.manimWaitControlEffectiveDuration,
    emittedFrameCount: snapshot.manimWaitControlEmittedFrameCount,
    emittedTimes: snapshot.manimWaitControlEmittedTimes,
    fps: snapshot.manimWaitControlFps,
    framePolicy: snapshot.manimWaitControlFramePolicy,
    frameInterval: snapshot.manimWaitControlFrameInterval,
    frameOperationSummary: snapshot.manimWaitControlFrameOperationSummary,
    maxTime: snapshot.manimWaitControlMaxTime,
    mode: snapshot.manimWaitControlMode,
    nIterations: snapshot.manimWaitControlNIterations,
    overrideSkipAnimations: snapshot.manimWaitControlOverrideSkip,
    runTime: snapshot.manimWaitControlRunTime,
    skipAnimations: snapshot.manimWaitControlSkipAnimations,
    sourceContract: snapshot.manimWaitControlSourceContract ?? SCENE_WAIT_CONTROL_SOURCE_CONTRACT,
    stopConditionId: snapshot.manimWaitControlStopConditionId,
    stopConditionSatisfied: snapshot.manimWaitControlStopConditionSatisfied,
    summary: snapshot.manimWaitControlSummary,
    updateMobjectFrameCount: snapshot.manimWaitControlUpdateMobjectFrameCount,
    updaterFinalValue: snapshot.manimWaitControlUpdaterFinalValue,
    updaterValueSummary: snapshot.manimWaitControlUpdaterValueSummary,
    updaterValues: snapshot.manimWaitControlUpdaterValues,
    updateMobjectTotalDtSeconds: snapshot.manimWaitControlUpdateMobjectTotalDt,
    updatesMobjectsDuringPresenterHold: snapshot.manimWaitControlUpdatesMobjectsDuringPresenterHold,
    updatesMobjectsDuringWait: snapshot.manimWaitControlUpdatesMobjectsDuringWait,
    updatesMobjectsWhileSkipping: snapshot.manimWaitControlUpdatesMobjectsWhileSkipping,
    updaterPolicy: snapshot.manimWaitControlUpdaterPolicy ?? SCENE_WAIT_CONTROL_UPDATER_POLICY,
    presenterHold: {
      finalHoldOnWait: snapshot.manimPresenterHoldFinalHoldOnWait,
      frameInterval: 0,
      frameTimes: [],
      holdDuration: snapshot.manimPresenterHoldDuration,
      holdFrameCount: snapshot.manimPresenterHoldFrameCount,
      ignorePresenterMode: snapshot.manimPresenterHoldIgnore,
      initialHoldOnWait: snapshot.manimPresenterHoldFinalHoldOnWait,
      mode: snapshot.manimPresenterHoldMode,
      note: "",
      noteLogged: snapshot.manimPresenterHoldNoteLogged,
      presenterMode: snapshot.manimPresenterHoldPresenterMode,
      releaseAfterFrames: snapshot.manimPresenterHoldFrameCount,
      releaseEvent: snapshot.manimPresenterHoldReleaseEvent,
      shouldUseTimelineWait: snapshot.manimPresenterHoldShouldUseTimelineWait,
      skipAnimations: snapshot.manimPresenterHoldSkipAnimations,
      sourceContract: snapshot.manimPresenterHoldSourceContract ?? SCENE_PRESENTER_HOLD_SOURCE_CONTRACT,
      summary: snapshot.manimPresenterHoldSummary,
      version: "mais-manim-presenter-hold/v1"
    }
  });
  const waitFrameStepperBridgeAttributes = sceneWaitFrameStepperBridgeDataAttributes({
    frameStepCount: snapshot.manimWaitFrameStepperFrameStepCount,
    mismatchCount: snapshot.manimWaitFrameStepperMismatchCount,
    rows: snapshot.manimWaitFrameStepperWaitTimes === "none"
      ? []
      : snapshot.manimWaitFrameStepperWaitTimes.split(",").map((waitTime, index) => ({
          activeStep: snapshot.manimWaitFrameStepperActiveSteps.split(",")[index] ?? "none",
          cameraShot: snapshot.manimWaitFrameStepperCameraShots.split(",")[index] ?? "none",
          deltaMatchesWait: true,
          frameStepUpdateFrameAction: snapshot.manimWaitFrameStepperUpdateFrameActions.split(",")[index] ?? "none",
          frameIndex: index,
          frameStepDeltaSeconds: 0,
          frameStepElapsedSeconds: Number(waitTime),
          frameStepWritesFrame: (snapshot.manimWaitFrameStepperWriteFrameFlags.split(",")[index] ?? "false") === "true",
          sceneId: snapshot.manimWaitFrameStepperSceneIds.split(",")[0] ?? "none",
          timeMatchesWait: true,
          updaterActiveCount: Number(snapshot.manimWaitFrameStepperUpdaterActiveCounts.split(",")[index] ?? 0),
          updaterSuspendedCount: Number(snapshot.manimWaitFrameStepperUpdaterSuspendedCounts.split(",")[index] ?? 0),
          waitDtSeconds: 0,
          waitUpdaterValueAfterFrame: Number(snapshot.manimWaitFrameStepperUpdaterValueAfterFrames.split(",")[index] ?? 0),
          waitUpdatesMobjects: (snapshot.manimWaitFrameStepperWaitUpdatesMobjects.split(",")[index] ?? "false") === "true",
          waitTSeconds: Number(waitTime)
        })),
    sourceContract: snapshot.manimWaitFrameStepperSourceContract ?? SCENE_WAIT_FRAME_STEPPER_BRIDGE_SOURCE_CONTRACT,
    summary: snapshot.manimWaitFrameStepperSummary,
    waitFrameCount: snapshot.manimWaitFrameStepperWaitFrameCount
  });
  const updateFrameAttributes = sceneUpdateFrameDataAttributes({
    action: snapshot.manimUpdateFrameAction,
    callsCameraCapture: snapshot.manimUpdateFrameCallsCameraCapture,
    callsEndScene: snapshot.manimUpdateFrameAction === "end-scene",
    callsIncrementTime: snapshot.manimUpdateFrameCallsIncrementTime,
    callsUpdateMobjects: snapshot.manimUpdateFrameCallsUpdateMobjects,
    callsWindowDispatchEvents: snapshot.manimUpdateFrameCallsWindowDispatchEvents,
    capturedRenderGroupIds: snapshot.manimUpdateFrameRenderGroupIds === "none"
      ? []
      : snapshot.manimUpdateFrameRenderGroupIds.split(","),
    dtSeconds: snapshot.manimUpdateFrameDtSeconds,
    forceDraw: snapshot.manimUpdateFrameForceDraw,
    framePolicy: snapshot.manimUpdateFrameFramePolicy ?? SCENE_UPDATE_FRAME_FRAME_POLICY,
    hasUndrawnWindowEvent: true,
    hasWindow: snapshot.manimUpdateFrameAction === "dispatch-events" || snapshot.manimUpdateFrameSleepSeconds > 0,
    nextSceneTimeSeconds: snapshot.manimUpdateFrameSceneTime,
    previousSceneTimeSeconds: Math.max(0, snapshot.manimUpdateFrameSceneTime - snapshot.manimUpdateFrameDtSeconds),
    renderGroupCount: snapshot.manimUpdateFrameRenderGroupCount,
    skipAnimations: snapshot.manimUpdateFrameSkipAnimations,
    sourceContract: snapshot.manimUpdateFrameSourceContract ?? SCENE_UPDATE_FRAME_SOURCE_CONTRACT,
    summary: snapshot.manimUpdateFrameSummary,
    updateFrameVersion: "mais-manim-update-frame/v1",
    updateMobjectsDtSeconds: snapshot.manimUpdateFrameUpdateMobjectsDtSeconds,
    windowClosing: snapshot.manimUpdateFrameAction === "end-scene",
    windowSleepSeconds: snapshot.manimUpdateFrameSleepSeconds
  } as Parameters<typeof sceneUpdateFrameDataAttributes>[0]);
  const emitFrameAttributes = sceneEmitFrameDataAttributes({
    cameraId: snapshot.manimEmitFrameCameraId,
    callsFileWriterWriteFrame: snapshot.manimEmitFrameCallsFileWriter,
    callsSceneEmitFrame: snapshot.manimEmitFrameCalled,
    emitFrameVersion: "mais-manim-emit-frame/v1",
    frameIndex: snapshot.manimEmitFrameFrameIndex,
    progressDisplayActive: snapshot.manimEmitFrameProgressDisplayActive,
    readsCameraRawFboData: snapshot.manimEmitFrameReadsRawFbo,
    skipAnimations: snapshot.manimEmitFrameSkipAnimations,
    sourceContract: snapshot.manimEmitFrameSourceContract,
    status: snapshot.manimEmitFrameStatus,
    summary: snapshot.manimEmitFrameSummary,
    updatesProgressDisplay: snapshot.manimEmitFrameUpdatesProgressDisplay,
    writePolicy: snapshot.manimEmitFrameWritePolicy,
    writesMovieFrame: snapshot.manimEmitFrameWritesMovieFrame,
    writeToMovie: snapshot.manimEmitFrameWriteToMovie
  } as Parameters<typeof sceneEmitFrameDataAttributes>[0]);
  const progressThroughAttributes = sceneProgressThroughAnimationsDataAttributes({
    animationCount: snapshot.manimProgressThroughAnimationCount,
    emitFrameCallCount: snapshot.manimProgressThroughEmitFrameCount,
    finalAlphaSummary: snapshot.manimProgressThroughFinalAlphaSummary,
    finalTime: snapshot.manimProgressThroughFinalTime,
    fps: snapshot.manimProgressThroughFps,
    frameInterval: snapshot.manimProgressThroughFrameInterval,
    framePolicy: snapshot.manimProgressThroughFramePolicy,
    frameOperationSequenceSummary: snapshot.manimProgressThroughFrameOperationSequence,
    frameOrderSummary: snapshot.manimProgressThroughFrameOrderSummary,
    frameCount: snapshot.manimProgressThroughFrameCount,
    frames: snapshot.manimProgressThroughFrames,
    interpolateCallCount: snapshot.manimProgressThroughInterpolateCount,
    rawAlphaOvershootAnimationIds: snapshot.manimProgressThroughRawAlphaOvershootAnimationIds,
    rawAlphaOvershootCount: snapshot.manimProgressThroughRawAlphaOvershootCount,
    rawAlphaSequenceSummary: snapshot.manimProgressThroughRawAlphaSequenceSummary,
    runTime: snapshot.manimProgressThroughRunTime,
    skipAnimations: snapshot.manimProgressThroughSkipAnimations,
    sourceContract: snapshot.manimProgressThroughSourceContract,
    summary: snapshot.manimProgressThroughSummary,
    timeProgression: snapshot.manimProgressThroughTimeProgression,
    timeProgressionSummary: snapshot.manimProgressThroughTimeProgressionSummary,
    updateFrameActionSummary: snapshot.manimProgressThroughUpdateFrameActionSummary,
    updateFrameCallCount: snapshot.manimProgressThroughUpdateFrameCount,
    updateMobjectExclusionPolicy: snapshot.manimProgressThroughUpdateMobjectExclusionPolicy,
    updateMobjectObjectDtSummary: snapshot.manimProgressThroughUpdateMobjectObjectDtSummary,
    updateMobjectObjectCallCount: snapshot.manimProgressThroughUpdateMobjectObjectCount,
    updateMobjectTargetSummary: snapshot.manimProgressThroughUpdateMobjectTargetSummary,
    updateMobjectsCallCount: snapshot.manimProgressThroughUpdateMobjectsCount,
    updateMobjectsDtSummary: snapshot.manimProgressThroughUpdateMobjectsDtSummary,
    version: "mais-manim-progress-through-animations/v1",
    writtenFrameCount: snapshot.manimProgressThroughWrittenFrameCount
  } as Parameters<typeof sceneProgressThroughAnimationsDataAttributes>[0]);
  const playCompilationAttributes = scenePlayCompilationDataAttributes({
    animationCount: snapshot.manimPlayCompilationAnimationCount,
    callOrder: snapshot.manimPlayCompilationCallOrder === "none" ? [] : snapshot.manimPlayCompilationCallOrder.split(">"),
    callOrderReady: snapshot.manimPlayCompilationCallOrderReady,
    callOrderSummary: snapshot.manimPlayCompilationCallOrder,
    errorMessageSummary: snapshot.manimPlayCompilationErrorMessageSummary,
    invalidCount: snapshot.manimPlayCompilationInvalidCount,
    maxRunTime: snapshot.manimPlayCompilationRunTime,
    pipelineEnabled: snapshot.manimPlayCompilationPipeline !== "none",
    preparePolicy: snapshot.manimPlayCompilationPreparePolicy ?? SCENE_PLAY_COMPILATION_PREPARE_POLICY,
    preparedAnimationIds: snapshot.manimPlayCompilationPreparedIds === "none"
      ? []
      : snapshot.manimPlayCompilationPreparedIds.split(","),
    protoAnimationCount: snapshot.manimPlayCompilationProtoCount,
    rows: snapshot.manimPlayCompilationRows,
    sourceContract: snapshot.manimPlayCompilationSourceContract ?? SCENE_PLAY_COMPILATION_SOURCE_CONTRACT,
    summary: snapshot.manimPlayCompilationSummary,
    updateRateInfoCallCount: snapshot.manimPlayCompilationUpdateRateCount,
    version: "mais-manim-play-compilation/v1",
    warningMessage: snapshot.manimPlayCompilationWarningMessage === "none" ? null : snapshot.manimPlayCompilationWarningMessage,
    warningNoAnimations: snapshot.manimPlayCompilationWarningEmpty
  } as Parameters<typeof scenePlayCompilationDataAttributes>[0]);
  const beginAnimationsAttributes = sceneBeginAnimationsDataAttributes({
    addedFamilyIds: snapshot.manimBeginAnimationsAddedFamilyIds,
    addedObjectCount: snapshot.manimBeginAnimationsAddedCount,
    addedObjectIds: snapshot.manimBeginAnimationsAddedIds === "none" ? [] : snapshot.manimBeginAnimationsAddedIds.split(","),
    animationCount: snapshot.manimBeginAnimationsCount,
    beginCallCount: snapshot.manimBeginAnimationsBeginCount,
    beginLifecycleSummary: snapshot.manimBeginAnimationsLifecycleSummary,
    finalSceneFamilyIds: snapshot.manimBeginAnimationsFinalSceneFamilyIds,
    initialSceneFamilyIds: snapshot.manimBeginAnimationsInitialSceneFamilyIds,
    interpolateZeroCallCount: snapshot.manimBeginAnimationsInterpolateZeroCount,
    maxRunTime: snapshot.manimBeginAnimationsRunTime,
    rows: snapshot.manimBeginAnimationsRows,
    sceneAddCallCount: snapshot.manimBeginAnimationsSceneAddCount,
    sceneFamilyCountAfter: snapshot.manimBeginAnimationsFamilyCountAfter,
    sceneFamilyCountBefore: snapshot.manimBeginAnimationsFamilyCountBefore,
    setAnimatingStatusCount: snapshot.manimBeginAnimationsSetAnimatingStatusCount,
    sourceContract: snapshot.manimBeginAnimationsSourceContract ?? SCENE_BEGIN_ANIMATIONS_SOURCE_CONTRACT,
    startStatePolicy: snapshot.manimBeginAnimationsStartStatePolicy ?? SCENE_BEGIN_ANIMATIONS_START_STATE_POLICY,
    startingMobjectCopyCount: snapshot.manimBeginAnimationsStartingCopyCount,
    startingMobjectIds:
      snapshot.manimBeginAnimationsStartingCopyIds === "none"
        ? []
        : snapshot.manimBeginAnimationsStartingCopyIds.split(","),
    summary: snapshot.manimBeginAnimationsSummary,
    suspendUpdatingCallCount: snapshot.manimBeginAnimationsSuspendCount,
    version: "mais-manim-begin-animations/v1"
  } as Parameters<typeof sceneBeginAnimationsDataAttributes>[0]);
  const finishAnimationsAttributes = sceneFinishAnimationsDataAttributes({
    animationCount: snapshot.manimFinishAnimationsCount,
    callsSceneUpdateMobjects: true,
    cleanUpCallCount: snapshot.manimFinishAnimationsCleanupCount,
    cleanupPolicy: snapshot.manimFinishAnimationsCleanupPolicy ?? SCENE_FINISH_ANIMATIONS_CLEANUP_POLICY,
    finalAlphaSummary: snapshot.manimFinishAnimationsFinalAlphaSummary,
    finishCallCount: snapshot.manimFinishAnimationsFinishCount,
    finishLifecycleSummary: snapshot.manimFinishAnimationsLifecycleSummary,
    removedObjectCount: snapshot.manimFinishAnimationsRemovedCount,
    removedObjectIds: snapshot.manimFinishAnimationsRemovedIds === "none" ? [] : snapshot.manimFinishAnimationsRemovedIds.split(","),
    resumeObjectIds: !snapshot.manimFinishAnimationsResumeIds || snapshot.manimFinishAnimationsResumeIds === "none"
      ? []
      : snapshot.manimFinishAnimationsResumeIds.split(","),
    resumePolicy: snapshot.manimFinishAnimationsResumePolicy ?? SCENE_FINISH_ANIMATIONS_RESUME_POLICY,
    resumeUpdaterDtSummary: snapshot.manimFinishAnimationsResumeDtSummary ?? "none",
    resumeUpdatingCallCount: snapshot.manimFinishAnimationsResumeCount ?? 0,
    rows: snapshot.manimFinishAnimationsRows,
    runTime: snapshot.manimFinishAnimationsRunTime,
    sceneUpdateMobjectsDt: snapshot.manimFinishAnimationsSceneUpdateDt,
    setAnimatingStatusFalseCount: snapshot.manimFinishAnimationsSetAnimatingStatusFalseCount,
    skipAnimations: snapshot.manimFinishAnimationsSkipAnimations,
    sourceContract: snapshot.manimFinishAnimationsSourceContract ?? SCENE_FINISH_ANIMATIONS_SOURCE_CONTRACT,
    summary: snapshot.manimFinishAnimationsSummary,
    version: "mais-manim-finish-animations/v1"
  } as Parameters<typeof sceneFinishAnimationsDataAttributes>[0]);
  const prePlayControlAttributes = scenePrePlayControlDataAttributes({
    beginAnimationCount: snapshot.manimPrePlayBeginAnimationCount,
    constructorForcedSkip: snapshot.manimPrePlayConstructorForcedSkip,
    endScenePlayIndex: snapshot.manimPrePlayEndScenePlay === "none" ? null : Number(snapshot.manimPrePlayEndScenePlay),
    finalSkipAnimations: snapshot.manimPrePlayFinalSkipAnimations,
    hasWindow: snapshot.manimPrePlayHasWindow,
    playCount: snapshot.manimPrePlayProcessedPlayCount,
    presenterHoldCount: snapshot.manimPrePlayPresenterHoldCount,
    processedPlayCount: snapshot.manimPrePlayProcessedPlayCount,
    rows: snapshot.manimPrePlayRows,
    skipGatePolicy: snapshot.manimPrePlaySkipGatePolicy ?? SCENE_PRE_PLAY_SKIP_GATE_POLICY,
    sourceContract: snapshot.manimPrePlaySourceContract ?? SCENE_PRE_PLAY_SOURCE_CONTRACT,
    startGateCount: snapshot.manimPrePlayStartGateCount,
    stopSkippingClockResetCount: snapshot.manimPrePlayStopSkippingClockResetCount,
    summary: snapshot.manimPrePlaySummary,
    truncatedByEndScene: snapshot.manimPrePlayTruncated,
    version: "mais-manim-pre-play-control/v1",
    windowClockResetCount: snapshot.manimPrePlayWindowClockResetCount
  } as Parameters<typeof scenePrePlayControlDataAttributes>[0]);
  const postPlayPreviewAttributes = scenePostPlayPreviewDataAttributes({
    endedAnimationCount: snapshot.manimPostPlayPreviewEndedAnimationCount,
    forcedPreviewCount: snapshot.manimPostPlayPreviewForcedCount,
    hasWindow: snapshot.manimPostPlayPreviewHasWindow,
    numPlaysReady: snapshot.manimPostPlayPreviewNumPlaysReady,
    numPlaysSequence: snapshot.manimPostPlayPreviewNumPlaysSequence,
    playCount: snapshot.manimPostPlayPreviewPlayCount,
    previewPolicy: snapshot.manimPostPlayPreviewPolicy ?? SCENE_POST_PLAY_PREVIEW_POLICY,
    previewWhileSkipping: snapshot.manimPostPlayPreviewPreviewWhileSkipping,
    rows: snapshot.manimPostPlayPreviewRows,
    skipAnimations: snapshot.manimPostPlayPreviewSkipAnimations,
    sourceContract: snapshot.manimPostPlayPreviewSourceContract ?? SCENE_POST_PLAY_SOURCE_CONTRACT,
    summary: snapshot.manimPostPlayPreviewSummary,
    version: "mais-manim-post-play-preview/v1"
  } as Parameters<typeof scenePostPlayPreviewDataAttributes>[0]);
  const postCellRedrawAttributes = scenePostCellRedrawDataAttributes({
    callsUpdateFrame: snapshot.manimPostCellRedrawReady,
    cellSucceeded: true,
    checkpointKey: snapshot.manimPostCellRedrawCheckpointKey,
    commentLabelPolicy: snapshot.manimPostCellRedrawCommentLabelPolicy ?? SCENE_POST_CELL_COMMENT_LABEL_POLICY,
    commentLineCount: snapshot.manimPostCellRedrawCommentCount,
    dtSeconds: snapshot.manimPostCellRedrawDtSeconds,
    forceDraw: snapshot.manimPostCellRedrawForceDraw,
    hasWindow: snapshot.manimPostCellRedrawHasWindow,
    lineCount: snapshot.manimPostCellRedrawLineCount,
    operationLineCount: snapshot.manimPostCellRedrawOperationCount,
    redrawPolicy: snapshot.manimPostCellRedrawPolicy ?? SCENE_POST_CELL_REDRAW_POLICY,
    ready: snapshot.manimPostCellRedrawReady,
    skipAnimations: snapshot.manimPostCellRedrawSkipAnimations,
    sourceLabel: snapshot.manimPostCellRedrawSourceLabel ?? "none",
    sourceContract: snapshot.manimPostCellRedrawSourceContract ?? SCENE_POST_CELL_REDRAW_SOURCE_CONTRACT,
    summary: snapshot.manimPostCellRedrawSummary,
    updateFrameAction: snapshot.manimPostCellRedrawAction as Parameters<typeof scenePostCellRedrawDataAttributes>[0]["updateFrameAction"],
    version: "mais-manim-post-cell-redraw/v1"
  } as Parameters<typeof scenePostCellRedrawDataAttributes>[0]);
  const shortcutCatalogAttributes = sceneShortcutCatalogDataAttributes({
    checkpointShortcutCount: snapshot.manimShortcutCheckpointCount,
    historyShortcutCount: snapshot.manimShortcutHistoryCount,
    ids: snapshot.manimShortcutIds === "none"
      ? []
      : snapshot.manimShortcutIds.split(",") as Parameters<typeof sceneShortcutCatalogDataAttributes>[0]["ids"],
    playbackShortcutCount: snapshot.manimShortcutPlaybackCount,
    redrawAfterCellCount: snapshot.manimShortcutRedrawCount,
    reloadReady: snapshot.manimShortcutReloadReady,
    sceneGraphShortcutCount: snapshot.manimShortcutSceneGraphCount,
    sourceContract: snapshot.manimShortcutSourceContract ?? SCENE_SHORTCUT_CATALOG_SOURCE_CONTRACT,
    stateShortcutCount: snapshot.manimShortcutStateCount,
    shortcutAuthoringPolicy: snapshot.manimShortcutAuthoringPolicy ?? SCENE_SHORTCUT_AUTHORING_POLICY,
    summary: snapshot.manimShortcutSummary,
    totalShortcutCount: snapshot.manimShortcutCount,
    version: "mais-manim-shortcut-catalog/v1"
  });
  const reloadPlanAttributes = sceneReloadPlanDataAttributes({
    checkpointCount: snapshot.manimReloadCheckpointCount,
    clearsSnippet: snapshot.manimReloadClearsSnippet,
    frameIndexAfter: snapshot.manimReloadFrameAfter,
    historyLabel: snapshot.manimReloadHistoryLabel,
    ready: snapshot.manimReloadReady,
    resetPolicy: snapshot.manimReloadResetPolicy ?? SCENE_RELOAD_RESET_POLICY,
    resetsElapsed: snapshot.manimReloadResetsElapsed,
    resetsFrame: snapshot.manimReloadResetsFrame,
    sceneId: snapshot.manimReloadSceneId,
    selectedFamilyId: snapshot.manimReloadSelectedFamilyId,
    selectedSceneId: snapshot.manimReloadSelectedSceneId,
    sourceContract: snapshot.manimReloadSourceContract ?? SCENE_RELOAD_SOURCE_CONTRACT,
    summary: snapshot.manimReloadSummary,
    version: "mais-manim-reload-plan/v1"
  });
  const skippingWindowAttributes = sceneSkippingWindowDataAttributes({
    constructorForcedSkip: snapshot.manimSkippingWindowConstructorForcedSkip,
    endAtAnimationNumber: snapshot.manimSkippingWindowEndAt === "none" ? null : Number(snapshot.manimSkippingWindowEndAt),
    endScenePlayIndex: snapshot.manimSkippingWindowEndScenePlay === "none" ? null : Number(snapshot.manimSkippingWindowEndScenePlay),
    finalSkipAnimations: snapshot.manimSkippingWindowFinalSkipAnimations,
    gatePolicy: snapshot.manimSkippingWindowGatePolicy ?? SCENE_SKIPPING_WINDOW_GATE_POLICY,
    initialSkipAnimations: false,
    originalSkippingStatus: false,
    playCount: snapshot.manimSkippingWindowPlayCount,
    plays: [],
    renderedPlayCount: snapshot.manimSkippingWindowRenderedPlayCount,
    skippedPlayCount: snapshot.manimSkippingWindowSkippedPlayCount,
    sourceContract: snapshot.manimSkippingWindowSourceContract ?? SCENE_SKIPPING_WINDOW_SOURCE_CONTRACT,
    startAtAnimationNumber: snapshot.manimSkippingWindowStartAt === "none" ? null : Number(snapshot.manimSkippingWindowStartAt),
    summary: snapshot.manimSkippingWindowSummary,
    truncatedByEndScene: snapshot.manimSkippingWindowTruncated,
    version: "mais-manim-skipping-window/v1"
  } as Parameters<typeof sceneSkippingWindowDataAttributes>[0]);
  const runFromBeatAttributes = sceneRunFromBeatDataAttributes({
    checkpointInvalidationSummary: snapshot.manimRunFromBeatCheckpointInvalidationSummary,
    checkpointKeyCount: snapshot.manimRunFromBeatCheckpointCount,
    checkpointKeys: snapshot.manimRunFromBeatCheckpointKeys === "none"
      ? []
      : snapshot.manimRunFromBeatCheckpointKeys.split("|").filter(Boolean),
    checkpointPolicy: snapshot.manimRunFromBeatCheckpointPolicy,
    checkpointRestoreAction: snapshot.manimRunFromBeatCheckpointRestoreAction as Parameters<typeof sceneRunFromBeatDataAttributes>[0]["checkpointRestoreAction"],
    checkpointRestoreKey: snapshot.manimRunFromBeatCheckpointRestoreKey,
    checkpointRestoreMode: snapshot.manimRunFromBeatCheckpointRestoreMode as Parameters<typeof sceneRunFromBeatDataAttributes>[0]["checkpointRestoreMode"],
    checkpointRestoreReady: snapshot.manimRunFromBeatCheckpointRestoreReady,
    checkpointSummary: snapshot.manimRunFromBeatCheckpointSummary,
    compositionId: snapshot.manimRunFromBeatCompositionId,
    compositionReplayPolicy: snapshot.manimRunFromBeatCompositionReplayPolicy as Parameters<typeof sceneRunFromBeatDataAttributes>[0]["compositionReplayPolicy"],
    compositionReplayReady: snapshot.manimRunFromBeatCompositionReplayReady,
    compositionReplaySummary: snapshot.manimRunFromBeatCompositionReplaySummary,
    compositionType: snapshot.manimRunFromBeatCompositionType as Parameters<typeof sceneRunFromBeatDataAttributes>[0]["compositionType"],
    compositionWindowCount: snapshot.manimRunFromBeatCompositionWindowCount,
    compositionWindowIds: snapshot.manimRunFromBeatCompositionWindowIds === "none"
      ? []
      : snapshot.manimRunFromBeatCompositionWindowIds.split("|").filter(Boolean),
    compositionWindowSummary: snapshot.manimRunFromBeatCompositionWindowSummary,
    elapsedBeforeReplay: snapshot.manimRunFromBeatElapsedBefore,
    finalElapsedSeconds: snapshot.manimRunFromBeatFinalElapsed,
    invalidatedCheckpointKeys: snapshot.manimRunFromBeatCheckpointInvalidatedKeys === "none"
      ? []
      : snapshot.manimRunFromBeatCheckpointInvalidatedKeys.split("|").filter(Boolean),
    invalidatesLaterCheckpointCount: snapshot.manimRunFromBeatCheckpointInvalidatesCount,
    normalizedBeatIndex: snapshot.manimRunFromBeatNormalizedIndex,
    preparedBeatIndices: parseEvidenceIds(snapshot.manimRunFromBeatPreparedIndices).map(Number),
    ready: snapshot.manimRunFromBeatReady,
    replayBeatIndices: parseEvidenceIds(snapshot.manimRunFromBeatReplayIndices).map(Number),
    replayPlayCount: snapshot.manimRunFromBeatReplayCount,
    replayPolicy: snapshot.manimRunFromBeatReplayPolicy ?? SCENE_RUN_FROM_BEAT_REPLAY_POLICY,
    requestedBeatIndex: snapshot.manimRunFromBeatRequestedIndex,
    retainedCheckpointKeysAfterRestore: snapshot.manimRunFromBeatCheckpointRetainedKeysAfterRestore === "none"
      ? []
      : snapshot.manimRunFromBeatCheckpointRetainedKeysAfterRestore.split("|").filter(Boolean),
    skippedBeforeCount: snapshot.manimRunFromBeatSkippedBeforeCount,
    sourceContract: snapshot.manimRunFromBeatSourceContract ?? SCENE_RUN_FROM_BEAT_SOURCE_CONTRACT,
    summary: snapshot.manimRunFromBeatSummary,
    totalPlayCount: snapshot.manimRunFromBeatTotalPlayCount,
    version: "mais-manim-run-from-beat/v1"
  });
  const skipControlAttributes = sceneSkipControlDataAttributes({
    finalHasOriginalSkippingStatus: snapshot.manimSkipControlHasOriginalStatus,
    finalOriginalSkippingStatus: snapshot.manimSkipControlFinalOriginalStatus,
    finalSkipAnimations: snapshot.manimSkipControlFinalSkipAnimations,
    finalTempSkipPreviousStatus: snapshot.manimSkipControlFinalTempPreviousStatus,
    skippedTransitionCount: snapshot.manimSkipControlSkippedTransitionCount,
    sourceContract: snapshot.manimSkipControlSourceContract ?? SCENE_SKIP_CONTROL_SOURCE_CONTRACT,
    statePolicy: snapshot.manimSkipControlStatePolicy ?? SCENE_SKIP_CONTROL_STATE_POLICY,
    stoppedTransitionCount: snapshot.manimSkipControlStoppedTransitionCount,
    summary: snapshot.manimSkipControlSummary,
    transitionCount: snapshot.manimSkipControlTransitionCount,
    transitions: snapshot.manimSkipControlTransitions
  });
  const stateSnapshotAttributes = sceneStateSnapshotDataAttributes({
    activeStep: snapshot.manimStateSnapshotActiveStep,
    cameraShotId: snapshot.manimStateSnapshotCameraShot,
    checkpointCount: snapshot.manimStateSnapshotCheckpointCount,
    elapsedSeconds: snapshot.manimStateSnapshotElapsedSeconds,
    frameIndex: snapshot.manimStateSnapshotFrameIndex,
    historyDroppedUndoCount: snapshot.manimStateSnapshotHistoryDroppedUndoCount,
    historyMaxUndoEntries: snapshot.manimStateSnapshotHistoryMaxUndoEntries,
    historyRevision: snapshot.manimStateSnapshotHistoryRevision,
    objectFamilyRootIds: snapshot.manimStateSnapshotFamilyRootIds.split(",").filter((id) => id && id !== "none"),
    objectIds: snapshot.manimStateSnapshotObjectIds.split(",").filter((id) => id && id !== "none"),
    objectIdentitySummary: snapshot.manimStateSnapshotObjectIdentitySummary,
    objectRootIds: snapshot.manimStateSnapshotRootIds.split(",").filter((id) => id && id !== "none"),
    sceneId: snapshot.manimStateSnapshotSceneId,
    signature: snapshot.manimStateSnapshotSignature,
    sourceContract: snapshot.manimStateSnapshotSourceContract ?? SCENE_STATE_SNAPSHOT_SOURCE_CONTRACT,
    summary: snapshot.manimStateSnapshotSummary
  } as Parameters<typeof sceneStateSnapshotDataAttributes>[0]);
  const sceneExportAttributes = sceneSpecExportDataAttributes({
    approvedForRuntime: snapshot.manimSceneExportReady,
    formulaTokenCount: snapshot.manimSceneExportFormulaTokenCount,
    objectCount: snapshot.manimSceneExportObjectCount,
    semanticBindingCount: snapshot.manimSceneExportSemanticBindingCount,
    sourceContract: snapshot.manimSceneExportSourceContract ?? SCENE_EXPORT_SOURCE_CONTRACT,
    signature: snapshot.manimSceneExportSignature,
    timelineStepCount: snapshot.manimSceneExportBeatCount
  } as Parameters<typeof sceneSpecExportDataAttributes>[0]);
  const smokeHookAttributes = sceneSmokeHookDataAttributes({
    attributeCount: snapshot.manimSmokeHookAttributeCount,
    convertedSelectorCount: snapshot.manimSmokeHookConvertedSelectorCount,
    jsonPayloadSelectors: snapshot.manimSmokeHookJsonPayloadSelectors,
    sceneId: snapshot.manimSmokeHookSceneId,
    selectorConversionSummary: snapshot.manimSmokeHookSelectorConversionSummary,
    selectorCount: snapshot.manimSmokeHookSelectorCount,
    signature: snapshot.manimSmokeHookSignature,
    sourceContract: snapshot.manimSmokeHookSourceContract ?? SCENE_SMOKE_HOOK_SOURCE_CONTRACT,
    summary: snapshot.manimSmokeHookSummary
  } as Parameters<typeof sceneSmokeHookDataAttributes>[0]);
  const sceneHistoryAttributes = sceneHistoryDataAttributes({
    branchInvalidatedRedoCount: snapshot.manimSceneHistoryBranchInvalidatedRedoCount,
    branchInvalidatedRedoLabels: snapshot.manimSceneHistoryBranchInvalidatedRedoLabels,
    branchPolicy: snapshot.manimSceneHistoryBranchPolicy ?? SCENE_HISTORY_BRANCH_POLICY,
    canRedo: snapshot.manimSceneHistoryCanRedo,
    canUndo: snapshot.manimSceneHistoryCanUndo,
    currentLabel: snapshot.manimSceneHistoryCurrentLabel,
    droppedUndoCount: snapshot.manimSceneHistoryDroppedUndoCount,
    maxUndoEntries: snapshot.manimSceneHistoryMaxUndoEntries,
    redoCount: snapshot.manimSceneHistoryRedoCount,
    revision: snapshot.manimSceneHistoryRevision,
    sourceContract: snapshot.manimSceneHistorySourceContract ?? SCENE_HISTORY_SOURCE_CONTRACT,
    undoCount: snapshot.manimSceneHistoryUndoCount
  });
  const sceneSelectorAttributes = mathSceneSelectorDataAttributes({
    activeFamilyId: snapshot.manimSceneSelectorSelectedFamilyId,
    activeSceneId: snapshot.manimSceneSelectorSelectedSceneId,
    approvedSceneCount: snapshot.manimSceneSelectorApprovedCount,
    familyIds: snapshot.manimSceneSelectorFamilyIds,
    sceneCount: snapshot.manimSceneSelectorCount,
    sceneIds: snapshot.manimSceneSelectorSceneIds,
    summary: snapshot.manimSceneSelectorSummary
  });
  const sceneRenderBatchAttributes = sceneRenderBatchDataAttributes({
    batchCount: snapshot.manimRenderBatchCount,
    batches: snapshot.manimRenderBatchRows,
    objectCount: snapshot.manimRenderBatchObjectCount,
    skippedObjectIds: snapshot.manimRenderBatchSkippedIds === "none" ? [] : snapshot.manimRenderBatchSkippedIds.split(","),
    sourceContract: snapshot.manimRenderBatchSourceContract,
    summary: snapshot.manimRenderBatchSummary
  } as Parameters<typeof sceneRenderBatchDataAttributes>[0]);
  const interactLoopAttributes = sceneInteractLoopDataAttributes({
    dtSeconds: snapshot.manimInteractLoopDtSeconds,
    finalSceneTimeSeconds: snapshot.manimInteractLoopFinalSceneTimeSeconds,
    finalSkipAnimations: snapshot.manimInteractLoopFinalSkipAnimations,
    frameCount: snapshot.manimInteractLoopFrameCount,
    frames: snapshot.manimInteractLoopFrames,
    hasWindow: snapshot.manimInteractLoopHasWindow,
    initialSkipAnimations: snapshot.manimInteractLoopInitialSkipAnimations,
    interactVersion: "mais-manim-interact-loop/v1",
    logsInteractionTips: snapshot.manimInteractLoopLogsInteractionTips,
    maxFrames: snapshot.manimInteractLoopMaxFrames,
    setsSkipAnimationsFalse: snapshot.manimInteractLoopSetsSkipAnimationsFalse,
    sourceContract: snapshot.manimInteractLoopSourceContract ?? SCENE_INTERACT_LOOP_SOURCE_CONTRACT,
    statePolicy: snapshot.manimInteractLoopStatePolicy ?? SCENE_INTERACT_LOOP_STATE_POLICY,
    summary: snapshot.manimInteractLoopSummary,
    termination: snapshot.manimInteractLoopTermination,
    updateFrameCallCount: snapshot.manimInteractLoopUpdateFrameCallCount
  } as Parameters<typeof sceneInteractLoopDataAttributes>[0]);
  const sceneRunInteractBridgeAttributes = sceneRunInteractBridgeDataAttributes({
    activePhase: snapshot.manimSceneRunInteractActivePhase,
    callOrderSummary: snapshot.manimSceneRunInteractCallOrderSummary,
    callsInteract: snapshot.manimSceneRunInteractCallsInteract,
    interactEnabled: snapshot.manimSceneRunInteractBridgeEnabled,
    interactStatePolicy: snapshot.manimSceneRunInteractStatePolicy ?? SCENE_INTERACT_LOOP_STATE_POLICY,
    interactTermination: snapshot.manimSceneRunInteractTermination,
    loopFrameCount: snapshot.manimSceneRunInteractLoopFrameCount,
    loopHasWindow: snapshot.manimSceneRunInteractLoopHasWindow,
    readyForTearDown: snapshot.manimSceneRunInteractReadyForTearDown,
    sceneId: snapshot.manimSceneRunInteractSceneId,
    sourceContract: snapshot.manimSceneRunInteractSourceContract ?? SCENE_RUN_INTERACT_BRIDGE_SOURCE_CONTRACT,
    status: snapshot.manimSceneRunInteractStatus,
    summary: snapshot.manimSceneRunInteractSummary,
    updateFrameCallCount: snapshot.manimSceneRunInteractUpdateFrameCallCount,
    version: "mais-manim-scene-run-interact-bridge/v1"
  } as Parameters<typeof sceneRunInteractBridgeDataAttributes>[0]);
  const progressControlAttributes = sceneProgressControlDataAttributes({
    actionSummary: snapshot.manimProgressControlActionSummary,
    finalShowAnimationProgress: snapshot.manimProgressControlFinalProgress,
    initialShowAnimationProgress: snapshot.manimProgressControlInitialProgress,
    previousShowAnimationProgress: snapshot.manimProgressControlPreviousProgress,
    requested: snapshot.manimProgressControlRequested,
    restoredPreviousStatus: snapshot.manimProgressControlRestoredPrevious,
    sourceContract: snapshot.manimProgressControlSourceContract ?? SCENE_PROGRESS_CONTROL_SOURCE_CONTRACT,
    statePolicy: snapshot.manimProgressControlStatePolicy ?? SCENE_PROGRESS_CONTROL_STATE_POLICY,
    summary: snapshot.manimProgressControlSummary,
    transitionCount: snapshot.manimProgressControlTransitionCount,
    transitions: snapshot.manimProgressControlTransitions
  });
  const checkpointPasteAttributes: Record<string, string> = snapshot.manimCheckpointPasteReady
    ? {
        "data-viz-manim-checkpoint-paste-key": snapshot.manimCheckpointPasteKey,
        "data-viz-manim-checkpoint-paste-line-count": String(snapshot.manimCheckpointPasteLineCount),
        "data-viz-manim-checkpoint-paste-operation-count": String(snapshot.manimCheckpointPasteOperationCount),
        "data-viz-manim-checkpoint-paste-invalidates-count": String(snapshot.manimCheckpointPasteInvalidatesCount),
        "data-viz-manim-checkpoint-paste-invalidated-keys": snapshot.manimCheckpointPasteInvalidatedKeys,
        "data-viz-manim-checkpoint-paste-retained-keys-after-restore": snapshot.manimCheckpointPasteRetainedKeysAfterRestore,
        "data-viz-manim-checkpoint-paste-restore-action": snapshot.manimCheckpointPasteRestoreAction,
        "data-viz-manim-checkpoint-paste-elapsed-seconds": snapshot.manimCheckpointPasteElapsedSeconds.toFixed(3),
        "data-viz-manim-checkpoint-paste-progress-bar": String(snapshot.manimCheckpointPasteProgressBar),
        "data-viz-manim-checkpoint-paste-record": String(snapshot.manimCheckpointPasteRecord),
        "data-viz-manim-checkpoint-paste-replay-policy": snapshot.manimCheckpointPasteReplayPolicy,
        "data-viz-manim-checkpoint-paste-restores-existing": String(snapshot.manimCheckpointPasteRestoresExisting),
        "data-viz-manim-checkpoint-paste-restore-mode": snapshot.manimCheckpointPasteRestoreMode,
        "data-viz-manim-checkpoint-paste-skip": String(snapshot.manimCheckpointPasteSkip),
        "data-viz-manim-checkpoint-paste-source-contract": snapshot.manimCheckpointPasteSourceContract,
        "data-viz-manim-checkpoint-paste-source-label": snapshot.manimCheckpointPasteSourceLabel,
        "data-viz-manim-checkpoint-paste-summary": snapshot.manimCheckpointPasteSummary,
        "data-viz-manim-progress-control-action-summary": snapshot.manimCheckpointPasteProgressControlActionSummary,
        "data-viz-manim-progress-control-final-progress": String(snapshot.manimCheckpointPasteProgressControlFinalProgress),
        "data-viz-manim-progress-control-initial-progress": String(snapshot.manimCheckpointPasteProgressControlInitialProgress),
        "data-viz-manim-progress-control-previous-progress": String(snapshot.manimCheckpointPasteProgressControlPreviousProgress),
        "data-viz-manim-progress-control-requested": String(snapshot.manimCheckpointPasteProgressControlRequested),
        "data-viz-manim-progress-control-restored-previous": String(snapshot.manimCheckpointPasteProgressControlRestoredPrevious),
        "data-viz-manim-progress-control-summary": snapshot.manimCheckpointPasteProgressControlSummary,
        "data-viz-manim-progress-control-transition-count": String(snapshot.manimCheckpointPasteProgressControlTransitionCount),
        "data-viz-manim-skip-control-action-summary": snapshot.manimCheckpointPasteSkipControlActionSummary,
        "data-viz-manim-skip-control-final-original-status": String(snapshot.manimCheckpointPasteSkipControlFinalOriginalStatus),
        "data-viz-manim-skip-control-final-skip": String(snapshot.manimCheckpointPasteSkipControlFinalSkip),
        "data-viz-manim-skip-control-final-temp-previous": String(snapshot.manimCheckpointPasteSkipControlFinalTempPrevious),
        "data-viz-manim-skip-control-has-original-status": String(snapshot.manimCheckpointPasteSkipControlHasOriginalStatus),
        "data-viz-manim-skip-control-skipped-transition-count": String(snapshot.manimCheckpointPasteSkipControlSkippedTransitionCount),
        "data-viz-manim-skip-control-stopped-transition-count": String(snapshot.manimCheckpointPasteSkipControlStoppedTransitionCount),
        "data-viz-manim-skip-control-summary": snapshot.manimCheckpointPasteSkipControlSummary,
        "data-viz-manim-skip-control-transition-count": String(snapshot.manimCheckpointPasteSkipControlTransitionCount)
      }
    : {};
  const checkpointStoreAttributes = sceneCheckpointStoreDataAttributes({
    canRestore: snapshot.manimCheckpointStoreCanRestore,
    checkpointCount: snapshot.manimCheckpointStoreCount,
    invalidatedCount: snapshot.manimCheckpointStoreInvalidatedCount,
    invalidatedKeys: snapshot.manimCheckpointStoreInvalidatedKeys === "none" ? [] : snapshot.manimCheckpointStoreInvalidatedKeys.split(","),
    invalidateLater: snapshot.manimCheckpointStoreInvalidateLater,
    keys: snapshot.manimCheckpointStoreKeys === "none" ? [] : snapshot.manimCheckpointStoreKeys.split(","),
    latestKey: snapshot.manimCheckpointStoreLatestKey,
    latestStateSignature: snapshot.manimCheckpointStoreLatestStateSignature,
    nextOrder: snapshot.manimCheckpointStoreNextOrder,
    requestedKey: snapshot.manimCheckpointStoreRequestedKey,
    retainedKeysAfterRestore: snapshot.manimCheckpointStoreRetainedKeysAfterRestore === "none"
      ? []
      : snapshot.manimCheckpointStoreRetainedKeysAfterRestore.split(","),
    restoreAction: snapshot.manimCheckpointStoreRestoreAction as Parameters<typeof sceneCheckpointStoreDataAttributes>[0]["restoreAction"],
    restoredOrder: snapshot.manimCheckpointStoreRestoredOrder === "none" ? null : Number(snapshot.manimCheckpointStoreRestoredOrder),
    restoredStateSignature: snapshot.manimCheckpointStoreRestoredStateSignature,
    sourceContract: snapshot.manimCheckpointStoreSourceContract ?? SCENE_CHECKPOINT_STORE_SOURCE_CONTRACT,
    stateSignatureSummary: snapshot.manimCheckpointStoreStateSignatureSummary,
    summary: snapshot.manimCheckpointStoreSummary,
    version: "mais-manim-checkpoint-store/v1"
  });
  const captureAttributes = capturePlanDataAttributes({
    byteCount: snapshot.manimCaptureByteCount,
    cameraShotId: snapshot.manimCaptureCameraShot,
    captureTarget: snapshot.manimCaptureTarget,
    elapsedSeconds: snapshot.manimCaptureElapsedSeconds,
    framebufferId: snapshot.manimCaptureFramebufferId,
    framebufferStatus: snapshot.manimCaptureFramebufferStatus,
    fps: snapshot.manimCaptureFps,
    frameCount: snapshot.manimCaptureFrameCount,
    height: snapshot.manimCaptureHeight,
    kind: snapshot.manimCaptureKind,
    renderQualityBackgroundAlpha: snapshot.manimCaptureBackgroundAlpha,
    renderQualityBackgroundColor: snapshot.manimCaptureBackgroundColor,
    renderQualityDevicePixelRatio: snapshot.manimCaptureDevicePixelRatio,
    renderQualityPreset: snapshot.manimCaptureQualityPreset,
    renderQualityRendererMode: snapshot.manimCaptureRendererMode,
    renderQualitySamplesPerPixel: snapshot.manimCaptureSamplesPerPixel,
    renderQualityTransparentBackground: snapshot.manimCaptureTransparentBackground,
    renderGroupCount: snapshot.manimCaptureRenderGroupCount,
    renderGroupIds: snapshot.manimCaptureRenderGroupIds,
    renderGroupSummary: snapshot.manimCaptureRenderGroupSummary,
    renderPassSummary: snapshot.manimCaptureRenderPassSummary,
    requestCount: snapshot.manimCaptureRequestCount,
    sceneSignature: snapshot.manimCaptureSceneSignature,
    sourceContract: snapshot.manimCaptureSourceContract ?? SCENE_CAPTURE_SOURCE_CONTRACT,
    status: snapshot.manimCaptureStatus,
    width: snapshot.manimCaptureWidth
  } as Parameters<typeof capturePlanDataAttributes>[0]);
  const renderQualityAttributes = renderQualityDataAttributes({
    antialias: snapshot.manimRenderQualityAntialias,
    aspectRatio: snapshot.manimRenderQualityHeight === 0 ? 0 : Number((snapshot.manimRenderQualityWidth / snapshot.manimRenderQualityHeight).toFixed(6)),
    backgroundAlpha: snapshot.manimRenderQualityAlpha,
    backgroundColor: snapshot.manimRenderQualityBackground,
    captureFps: snapshot.manimRenderQualityCaptureFps,
    captureHeight: snapshot.manimRenderQualityCaptureHeight,
    captureWidth: snapshot.manimRenderQualityCaptureWidth,
    devicePixelRatio: snapshot.manimRenderQualityDevicePixelRatio,
    frameRate: snapshot.manimRenderQualityRendererMode === "capture" ? snapshot.manimRenderQualityCaptureFps : Math.min(60, snapshot.manimRenderQualityCaptureFps),
    height: snapshot.manimRenderQualityHeight,
    pixelCount: snapshot.manimRenderQualityPixelCount,
    preset: snapshot.manimRenderQualityPreset,
    qualityVersion: "mais-manim-render-quality/v1",
    rendererMode: snapshot.manimRenderQualityRendererMode,
    samplesPerPixel: snapshot.manimRenderQualitySamplesPerPixel,
    sourceContract: snapshot.manimRenderQualitySourceContract ?? MANIM_RENDER_QUALITY_SOURCE_CONTRACT,
    summary: snapshot.manimRenderQualitySummary,
    transparentBackground: snapshot.manimRenderQualityTransparent,
    width: snapshot.manimRenderQualityWidth
  });
  const fileWriterAttributes = sceneFileWriterDataAttributes({
    artifactCount: snapshot.manimFileWriterArtifactCount,
    artifactFileSummary: snapshot.manimFileWriterArtifactFileSummary,
    artifactKindSummary: snapshot.manimFileWriterArtifactKindSummary,
    artifactMimeSummary: snapshot.manimFileWriterArtifactMimeSummary,
    byteCount: snapshot.manimFileWriterByteCount,
    captureBackgroundAlpha: snapshot.manimFileWriterCaptureBackgroundAlpha,
    captureBackgroundColor: snapshot.manimFileWriterCaptureBackgroundColor,
    captureDevicePixelRatio: snapshot.manimFileWriterCaptureDevicePixelRatio,
    captureFps: snapshot.manimFileWriterCaptureFps,
    captureHeight: snapshot.manimFileWriterCaptureHeight,
    captureKind: snapshot.manimFileWriterCaptureKind,
    captureQualityPreset: snapshot.manimFileWriterCaptureQualityPreset,
    captureRendererMode: snapshot.manimFileWriterCaptureRendererMode,
    captureSamplesPerPixel: snapshot.manimFileWriterCaptureSamplesPerPixel,
    captureStatus: snapshot.manimFileWriterCaptureStatus,
    captureTransparentBackground: snapshot.manimFileWriterCaptureTransparentBackground,
    captureWidth: snapshot.manimFileWriterCaptureWidth,
    frameCount: snapshot.manimFileWriterFrameCount,
    jsonArtifactCount: snapshot.manimFileWriterJsonArtifactCount,
    mediaArtifactCount: snapshot.manimFileWriterMediaArtifactCount,
    outputSlug: snapshot.manimFileWriterOutputSlug,
    ready: snapshot.manimFileWriterReady,
    sceneId: snapshot.manimFileWriterSceneId,
    signature: snapshot.manimFileWriterSignature,
    sourceContract: snapshot.manimFileWriterSourceContract ?? SCENE_FILE_WRITER_SOURCE_CONTRACT,
    summary: snapshot.manimFileWriterSummary
  } as Parameters<typeof sceneFileWriterDataAttributes>[0]);
  const fileWriterSegmentAttributes = sceneFileWriterSegmentDataAttributes({
    actionSummary: snapshot.manimFileWriterSegmentActionSummary,
    closePipeCount: snapshot.manimFileWriterSegmentCloseCount,
    finalFileSummary: snapshot.manimFileWriterSegmentFinalFileSummary,
    insertFilePath: snapshot.manimFileWriterSegmentInsertPath,
    insertIndex: snapshot.manimFileWriterSegmentInsertIndex === "none" ? null : Number(snapshot.manimFileWriterSegmentInsertIndex),
    openPipeCount: snapshot.manimFileWriterSegmentOpenCount,
    partialMovieIndex: snapshot.manimFileWriterSegmentPartialIndex,
    partialMovieIndexPadded: snapshot.manimFileWriterSegmentPartialIndexPadded,
    partialMoviePath: snapshot.manimFileWriterSegmentPartialPath,
    partialPathReady: snapshot.manimFileWriterSegmentPartialPathReady,
    rows: snapshot.manimFileWriterSegmentRows,
    segmentCount: snapshot.manimFileWriterSegmentCount,
    skippedCount: snapshot.manimFileWriterSegmentSkippedCount,
    sourceContract: snapshot.manimFileWriterSegmentSourceContract ?? SCENE_FILE_WRITER_SEGMENT_SOURCE_CONTRACT,
    subdivideOutput: snapshot.manimFileWriterSegmentSubdivideOutput,
    summary: snapshot.manimFileWriterSegmentSummary,
    tempFileCount: snapshot.manimFileWriterSegmentTempFileCount,
    tempRecordRequested: snapshot.manimFileWriterSegmentTempRecord,
    writeToMovie: snapshot.manimFileWriterSegmentWriteToMovie
  } as Parameters<typeof sceneFileWriterSegmentDataAttributes>[0]);
  const playbackFileWriterBridgeAttributes = scenePlaybackFileWriterBridgeDataAttributes({
    mismatchCount: snapshot.manimPlaybackFileWriterBridgeMismatchCount,
    partialIndexSequence: snapshot.manimPlaybackFileWriterBridgePartialIndexSequence,
    partialPathSummary: snapshot.manimPlaybackFileWriterBridgePartialPathSummary,
    ready: snapshot.manimPlaybackFileWriterBridgeReady,
    rowCount: snapshot.manimPlaybackFileWriterBridgeRowCount,
    rows: [],
    sourceContract: snapshot.manimPlaybackFileWriterBridgeSourceContract ?? SCENE_PLAYBACK_FILE_WRITER_BRIDGE_SOURCE_CONTRACT,
    summary: snapshot.manimPlaybackFileWriterBridgeSummary,
    version: "mais-manim-playback-file-writer-bridge/v1"
  } as Parameters<typeof scenePlaybackFileWriterBridgeDataAttributes>[0]);
  const fileWriterCombineAttributes = sceneFileWriterCombineDataAttributes({
    action: snapshot.manimFileWriterCombineAction,
    concatManifestPath: snapshot.manimFileWriterCombineConcatManifestPath,
    duplicatePartialCount: snapshot.manimFileWriterCombineDuplicatePartialCount,
    finalMoviePath: snapshot.manimFileWriterCombineFinalPath,
    mismatchCount: snapshot.manimFileWriterCombineMismatchCount,
    ordered: snapshot.manimFileWriterCombineOrdered,
    partialIndexSequence: snapshot.manimFileWriterCombinePartialIndexSequence,
    partialMovieCount: snapshot.manimFileWriterCombinePartialCount,
    partialPathSummary: snapshot.manimFileWriterCombinePartialPathSummary,
    ready: snapshot.manimFileWriterCombineReady,
    sourceContract: snapshot.manimFileWriterCombineSourceContract ?? SCENE_FILE_WRITER_COMBINE_SOURCE_CONTRACT,
    summary: snapshot.manimFileWriterCombineSummary,
    version: "mais-manim-file-writer-combine/v1"
  } as Parameters<typeof sceneFileWriterCombineDataAttributes>[0]);
  const checkpointFileWriterBridgeAttributes = checkpointPasteFileWriterBridgeDataAttributes({
    checkpointKey: snapshot.manimCheckpointFileWriterBridgeKey,
    checkpointRecordRequested: snapshot.manimCheckpointFileWriterBridgeRecord,
    closeInsertPipe: snapshot.manimCheckpointFileWriterBridgeCloseInsertPipe,
    fileWriterTempRecordRequested: snapshot.manimCheckpointFileWriterBridgeTempRecord,
    insertFilePath: snapshot.manimCheckpointFileWriterBridgeInsertPath,
    insertIndex: snapshot.manimCheckpointFileWriterBridgeInsertIndex === "none" ? null : Number(snapshot.manimCheckpointFileWriterBridgeInsertIndex),
    openInsertPipe: snapshot.manimCheckpointFileWriterBridgeOpenInsertPipe,
    ready: snapshot.manimCheckpointFileWriterBridgeReady,
    sceneId: snapshot.manimCheckpointFileWriterBridgeSceneId,
    segmentActionSummary: snapshot.manimCheckpointFileWriterBridgeSegmentActionSummary,
    segmentCount: snapshot.manimCheckpointFileWriterBridgeSegmentCount,
    sourceContract: snapshot.manimCheckpointFileWriterBridgeSourceContract ?? SCENE_CHECKPOINT_PASTE_FILE_WRITER_BRIDGE_SOURCE_CONTRACT,
    summary: snapshot.manimCheckpointFileWriterBridgeSummary,
    version: "mais-manim-checkpoint-paste-file-writer-bridge/v1"
  } as Parameters<typeof checkpointPasteFileWriterBridgeDataAttributes>[0]);
  const sceneRunFileWriterFinishBridgeAttributes = sceneRunFileWriterFinishBridgeDataAttributes({
    combineAction: snapshot.manimSceneRunFileWriterFinishCombineAction,
    concatManifestPath: snapshot.manimSceneRunFileWriterFinishConcatManifestPath,
    finalMoviePath: snapshot.manimSceneRunFileWriterFinishFinalPath,
    finishCallOrderSummary: snapshot.manimSceneRunFileWriterFinishCallOrder,
    finishReady: snapshot.manimSceneRunFileWriterFinishReady,
    finishRequired: snapshot.manimSceneRunFileWriterFinishRequired,
    finishStatus: snapshot.manimSceneRunFileWriterFinishStatus,
    partialMovieCount: snapshot.manimSceneRunFileWriterFinishPartialCount,
    sceneId: snapshot.manimSceneRunFileWriterFinishSceneId,
    sourceContract: snapshot.manimSceneRunFileWriterFinishSourceContract ?? SCENE_RUN_FILE_WRITER_FINISH_BRIDGE_SOURCE_CONTRACT,
    summary: snapshot.manimSceneRunFileWriterFinishSummary,
    tearDownActionSummary: snapshot.manimSceneRunFileWriterFinishTearDownActions,
    tearDownReady: snapshot.manimSceneRunFileWriterFinishTearDownReady,
    version: "mais-manim-scene-run-file-writer-finish-bridge/v1"
  } as Parameters<typeof sceneRunFileWriterFinishBridgeDataAttributes>[0]);
  const texColorMapAttributes = texColorMapDataAttributes({
    boundTokenCount: snapshot.manimTexColorMapBoundTokenCount,
    colorRoles: snapshot.manimTexColorMapRoles === "none" ? [] : snapshot.manimTexColorMapRoles.split(","),
    colorSourceCounts: {
      binding: snapshot.manimTexColorMapBindingSourceCount,
      reference: snapshot.manimTexColorMapReferenceSourceCount,
      "tex-isolation": snapshot.manimTexColorMapTexIsolationSourceCount
    },
    colorSourceSummary: snapshot.manimTexColorMapSourceSummary,
    entries: snapshot.manimTexColorMapEntries,
    entryCount: snapshot.manimTexColorMapEntryCount,
    familyId: snapshot.familyId,
    sceneId: snapshot.manimTexColorMapSceneId,
    sourceContract: snapshot.manimTexColorMapSourceContract,
    summary: snapshot.manimTexColorMapSummary,
    texIsolatedTokenCount: snapshot.manimTexColorMapTexIsolatedTokenCount,
    texIsolationSelectorCount: snapshot.manimTexColorMapTexIsolationSelectorCount,
    tokenCount: snapshot.manimTexColorMapTokenCount,
    unmatchedSelectors: snapshot.manimTexColorMapUnmatchedSelectors === "none" ? [] : snapshot.manimTexColorMapUnmatchedSelectors.split(","),
    unmatchedTokenCount: snapshot.manimTexColorMapUnmatchedTokenCount
  } as Parameters<typeof texColorMapDataAttributes>[0]);
  const texColorizedFormulaAttributes = texColorizedFormulaDataAttributes({
    coloredCharacterCount: snapshot.manimTexColorizedColoredCharacterCount,
    coloredTokenCount: snapshot.manimTexColorizedColoredTokenCount,
    coloredTokenIds: parseEvidenceIds(snapshot.manimTexColorizedColoredTokenIds),
    coverageRatio: snapshot.manimTexColorizedCoverageRatio,
    coverageSummary: snapshot.manimTexColorizedCoverageSummary,
    formulaId: snapshot.manimTexColorizedFormulaId,
    intervalOrderSummary: snapshot.manimTexColorizedIntervalOrderSummary,
    intervalSummary: snapshot.manimTexColorizedIntervalSummary,
    latex: "",
    originalLatex: "",
    roleSummary: snapshot.manimTexColorizedRoleSummary,
    sourceContract: snapshot.manimTexColorizedSourceContract,
    sourceCharacterCount: snapshot.manimTexColorizedSourceCharacterCount,
    summary: snapshot.manimTexColorizedSummary,
    tokenCount: snapshot.manimTexColorizedTokenCount,
    uncoloredTokenCount: snapshot.manimTexColorizedUncoloredTokenCount,
    uncoloredTokenIds: parseEvidenceIds(snapshot.manimTexColorizedUncoloredTokenIds)
  } as Parameters<typeof texColorizedFormulaDataAttributes>[0]);
  const texIsolationAttributes = texIsolationEvidenceDataAttributes({
    cacheKeyCount: snapshot.manimTexIsolationCacheKeyCount,
    formulaCount: snapshot.manimTexIsolationFormulaCount,
    isolatedTokenCount: snapshot.manimTexIsolationIsolatedTokenCount,
    occurrenceSummary: snapshot.manimTexIsolationOccurrenceSummary,
    sceneId: snapshot.manimTexIsolationSceneId,
    selectorCount: snapshot.manimTexIsolationSelectorCount,
    selectorSummary: snapshot.manimTexIsolationSelectorSummary,
    sourceContract: snapshot.manimTexIsolationSourceContract,
    summary: snapshot.manimTexIsolationSummary,
    tokenCount: snapshot.manimTexIsolationTokenCount,
    unmatchedSelectorCount: snapshot.manimTexIsolationUnmatchedSelectorCount,
    unmatchedSelectors: snapshot.manimTexIsolationUnmatchedSelectors
  } as Parameters<typeof texIsolationEvidenceDataAttributes>[0]);
  const texCompileAttributes = texCompilePipelineDataAttributes({
    cacheHitEligibleCount: snapshot.manimTexCompileCacheHitEligibleCount,
    cacheKeyCount: snapshot.manimTexCompileCacheKeyCount,
    commandCount: snapshot.manimTexCompileCommandCount,
    documentCount: snapshot.manimTexCompileDocumentCount,
    documentSourceLengthRange: snapshot.manimTexCompileDocumentSourceLengthRange,
    documentTemplateCount: snapshot.manimTexCompileDocumentTemplateCount,
    dvisvgmCount: snapshot.manimTexCompileDvisvgmCount,
    engineIds: snapshot.manimTexCompileEngineIds,
    formulaCount: snapshot.manimTexCompileFormulaCount,
    intermediateExtensions: snapshot.manimTexCompileIntermediateExtensions,
    rows: snapshot.manimTexCompileRows,
    sceneId: snapshot.manimTexCompileSceneId,
    signature: snapshot.manimTexCompileSignature,
    sourceContract: snapshot.manimTexCompileSourceContract ?? TEX_COMPILE_PIPELINE_SOURCE_CONTRACT,
    sourceSummary: snapshot.manimTexCompileSourceSummary,
    stepSequence: snapshot.manimTexCompileStepSequence,
    summary: snapshot.manimTexCompileSummary,
    svgOutputCount: snapshot.manimTexCompileSvgOutputCount
  });
  const texCacheAttributes = texCacheManifestDataAttributes({
    cacheEntryCount: snapshot.manimTexCacheCacheEntryCount,
    cacheHitEligibleCount: snapshot.manimTexCacheCacheHitEligibleCount,
    cacheKeys: snapshot.manimTexCacheCacheKeys,
    cacheVersion: snapshot.manimTexCacheCacheVersion,
    entries: snapshot.manimTexCacheEntries,
    familyId: snapshot.familyId as Parameters<typeof texCacheManifestDataAttributes>[0]["familyId"],
    formulaCount: snapshot.manimTexCacheFormulaCount,
    isolationEntryCount: snapshot.manimTexCacheIsolationEntryCount,
    ready: snapshot.manimTexCacheReady,
    sceneId: snapshot.manimTexCacheSceneId,
    signature: snapshot.manimTexCacheSignature,
    sourceContract: snapshot.manimTexCacheSourceContract ?? TEX_CACHE_MANIFEST_SOURCE_CONTRACT,
    staleEntryCount: snapshot.manimTexCacheStaleEntryCount,
    summary: snapshot.manimTexCacheSummary,
    svgMorphPlanCount: snapshot.manimTexCacheSvgMorphPlanCount,
    tokenCount: snapshot.manimTexCacheTokenCount
  });
  const formulaSvgMorphAttributes = formulaSvgMorphEvidenceDataAttributes({
    cacheKeyCount: snapshot.manimSvgMorphCacheKeyCount,
    commandCount: snapshot.manimSvgMorphCommandCount,
    compatibleMorphCount: snapshot.manimSvgMorphCompatibleCount,
    framePathPreview: snapshot.manimSvgMorphFramePathPreview,
    issueCount: snapshot.manimSvgMorphIssueCount,
    issueSummary: snapshot.manimSvgMorphIssueSummary,
    morphCount: snapshot.manimSvgMorphCount,
    morphIds: snapshot.manimSvgMorphIds,
    progress: snapshot.manimSvgMorphProgress,
    sceneId: snapshot.sceneId,
    sourceContract: snapshot.manimSvgMorphSourceContract,
    summary: snapshot.manimSvgMorphSummary
  });
  const transformFamilyAlignmentAttributes = transformFamilyAlignmentDataAttributes({
    entries: snapshot.manimTransformFamilyAlignmentEntries,
    sourceRootId: snapshot.manimTransformFamilyAlignmentSourceRootId,
    targetRootId: snapshot.manimTransformFamilyAlignmentTargetRootId
  });
  const transformPointAlignmentAttributes = transformPointAlignmentBridgeDataAttributes({
    compatibleEntryCount: snapshot.manimTransformPointAlignmentCompatibleCount,
    matchedEntryCount: snapshot.manimTransformPointAlignmentMatchedCount,
    resampledEntryCount: snapshot.manimTransformPointAlignmentResampledCount,
    rows: snapshot.manimTransformPointAlignmentRows,
    sourceContract:
      snapshot.manimTransformPointAlignmentSourceContract ?? TRANSFORM_POINT_ALIGNMENT_BRIDGE_SOURCE_CONTRACT,
    sourceRootId: snapshot.manimTransformPointAlignmentSourceRootId,
    summary: snapshot.manimTransformPointAlignmentSummary,
    targetRootId: snapshot.manimTransformPointAlignmentTargetRootId,
    totalAlignedPointCount: snapshot.manimTransformPointAlignmentTotalPointCount,
    version: "mais-manim-transform-point-alignment-bridge/v1"
  });
  const transformDataLockAttributes = transformDataLockEvidenceDataAttributes({
    alignmentSummary: snapshot.manimTransformDataLockAlignmentSummary,
    kindSummary: snapshot.manimTransformDataLockKindSummary,
    lockedPointCount: snapshot.manimTransformDataLockLockedPointCount,
    movingPointCount: snapshot.manimTransformDataLockMovingPointCount,
    objectIds: snapshot.manimTransformDataLockObjectIds,
    planCount: snapshot.manimTransformDataLockPlanCount,
    sourceContract: TRANSFORM_DATA_LOCK_SOURCE_CONTRACT,
    summary: snapshot.manimTransformDataLockSummary,
    targetObjectIds: snapshot.manimTransformDataLockTargetObjectIds,
    totalPointCount: snapshot.manimTransformDataLockTotalPointCount
  });
  const parameterPanelAttributes = parameterPanelDataAttributes({
    activeParameterId: snapshot.manimParameterPanelSelectedId,
    controlCount: snapshot.manimParameterPanelControlCount,
    derivedCount: snapshot.manimParameterPanelDerivedCount,
    parameterCount: snapshot.manimParameterPanelCount,
    parameterIds: snapshot.manimParameterPanelIds,
    summary: snapshot.manimParameterPanelSummary,
    timelineCount: snapshot.manimParameterPanelTimelineCount
  });
  const animationCompositionFrameAttributes = animationCompositionFrameEvidenceDataAttributes({
    activeCompositionId: snapshot.manimAnimationCompositionActiveId,
    activeCompositionType:
      snapshot.manimAnimationCompositionActiveType as Parameters<typeof animationCompositionFrameEvidenceDataAttributes>[0]["activeCompositionType"],
    activeWindowCount: snapshot.manimAnimationCompositionActiveWindowCount,
    activeWindowIds: snapshot.manimAnimationCompositionActiveWindowIds,
    completedWindowCount: snapshot.manimAnimationCompositionCompletedWindowCount,
    completedWindowIds: snapshot.manimAnimationCompositionCompletedWindowIds,
    compositionCount: snapshot.manimAnimationCompositionCount,
    elapsedSeconds: snapshot.manimAnimationCompositionFrameElapsedSeconds,
    pendingWindowCount: snapshot.manimAnimationCompositionPendingWindowCount,
    pendingWindowIds: snapshot.manimAnimationCompositionPendingWindowIds,
    progress: snapshot.manimAnimationCompositionFrameProgress,
    sourceContract:
      snapshot.manimAnimationCompositionSourceContract as Parameters<typeof animationCompositionFrameEvidenceDataAttributes>[0]["sourceContract"],
    summary: snapshot.manimAnimationCompositionFrameSummary,
    timingPolicy:
      snapshot.manimAnimationCompositionTimingPolicy as Parameters<typeof animationCompositionFrameEvidenceDataAttributes>[0]["timingPolicy"],
    windowSummary: snapshot.manimAnimationCompositionWindowSummary
  });
  const sceneRestructureAttributes = sceneRestructureDataAttributes({
    detachedRootIds: parseEvidenceIds(snapshot.sceneRestructureDetachedRootIds),
    removedObjectIds: parseEvidenceIds(snapshot.sceneRestructureRemovedIds),
    requestedObjectIds: parseEvidenceIds(snapshot.sceneRestructureRequestedIds),
    restructuredParentIds: parseEvidenceIds(snapshot.sceneRestructureParentIds),
    sourceContract: snapshot.sceneRestructureSourceContract ?? SCENE_RESTRUCTURE_SOURCE_CONTRACT,
    summary: snapshot.sceneRestructureSummary
  });
  const sceneClearMobjectAttributes = sceneClearMobjectBridgeDataAttributes({
    afterFixedInFrameIds: parseEvidenceIds(snapshot.sceneClearMobjectAfterFixedInFrameIds),
    afterForegroundIds: parseEvidenceIds(snapshot.sceneClearMobjectAfterForegroundIds),
    afterRenderGroupIds: parseEvidenceIds(snapshot.sceneClearMobjectAfterRenderGroupIds),
    afterSceneIds: parseEvidenceIds(snapshot.sceneClearMobjectAfterSceneIds),
    beforeFixedInFrameIds: parseEvidenceIds(snapshot.sceneClearMobjectBeforeFixedInFrameIds),
    beforeForegroundIds: parseEvidenceIds(snapshot.sceneClearMobjectBeforeForegroundIds),
    beforeRenderGroupIds: parseEvidenceIds(snapshot.sceneClearMobjectBeforeRenderGroupIds),
    beforeSceneIds: parseEvidenceIds(snapshot.sceneClearMobjectBeforeSceneIds),
    cleared: snapshot.sceneClearMobjectCleared,
    clearedObjectCount: snapshot.sceneClearMobjectClearedObjectCount,
    clearedObjectIds: parseEvidenceIds(snapshot.sceneClearMobjectClearedObjectIds),
    objectCatalogCount: snapshot.sceneClearMobjectObjectCatalogCount,
    sourceContract: snapshot.sceneClearMobjectSourceContract ?? SCENE_CLEAR_MOBJECT_BRIDGE_SOURCE_CONTRACT,
    summary: snapshot.sceneClearMobjectSummary,
    version: "mais-manim-scene-clear-mobject-bridge/v1"
  });
  const sceneRemoveAllExceptMobjectAttributes = sceneRemoveAllExceptMobjectBridgeDataAttributes({
    afterFixedInFrameIds: parseEvidenceIds(snapshot.sceneRemoveAllExceptMobjectAfterFixedInFrameIds),
    afterForegroundIds: parseEvidenceIds(snapshot.sceneRemoveAllExceptMobjectAfterForegroundIds),
    afterRenderGroupIds: parseEvidenceIds(snapshot.sceneRemoveAllExceptMobjectAfterRenderGroupIds),
    afterSceneIds: parseEvidenceIds(snapshot.sceneRemoveAllExceptMobjectAfterSceneIds),
    beforeFixedInFrameIds: parseEvidenceIds(snapshot.sceneRemoveAllExceptMobjectBeforeFixedInFrameIds),
    beforeForegroundIds: parseEvidenceIds(snapshot.sceneRemoveAllExceptMobjectBeforeForegroundIds),
    beforeRenderGroupIds: parseEvidenceIds(snapshot.sceneRemoveAllExceptMobjectBeforeRenderGroupIds),
    beforeSceneIds: parseEvidenceIds(snapshot.sceneRemoveAllExceptMobjectBeforeSceneIds),
    changed: snapshot.sceneRemoveAllExceptMobjectChanged,
    keptObjectCount: snapshot.sceneRemoveAllExceptMobjectKeptCount,
    keptObjectIds: parseEvidenceIds(snapshot.sceneRemoveAllExceptMobjectKeptIds),
    objectCatalogCount: snapshot.sceneRemoveAllExceptMobjectObjectCatalogCount,
    removedObjectCount: snapshot.sceneRemoveAllExceptMobjectRemovedCount,
    removedObjectIds: parseEvidenceIds(snapshot.sceneRemoveAllExceptMobjectRemovedIds),
    requestedKeepIds: parseEvidenceIds(snapshot.sceneRemoveAllExceptMobjectRequestedKeepIds),
    sourceContract:
      snapshot.sceneRemoveAllExceptMobjectSourceContract ?? SCENE_REMOVE_ALL_EXCEPT_MOBJECT_BRIDGE_SOURCE_CONTRACT,
    summary: snapshot.sceneRemoveAllExceptMobjectSummary,
    version: "mais-manim-scene-remove-all-except-mobject-bridge/v1"
  });
  const sceneBringToFrontMobjectAttributes = sceneBringToFrontMobjectBridgeDataAttributes({
    afterFixedInFrameIds: parseEvidenceIds(snapshot.sceneBringToFrontMobjectAfterFixedInFrameIds),
    afterForegroundIds: parseEvidenceIds(snapshot.sceneBringToFrontMobjectAfterForegroundIds),
    afterRenderGroupIds: parseEvidenceIds(snapshot.sceneBringToFrontMobjectAfterRenderGroupIds),
    afterSceneIds: parseEvidenceIds(snapshot.sceneBringToFrontMobjectAfterSceneIds),
    beforeFixedInFrameIds: parseEvidenceIds(snapshot.sceneBringToFrontMobjectBeforeFixedInFrameIds),
    beforeForegroundIds: parseEvidenceIds(snapshot.sceneBringToFrontMobjectBeforeForegroundIds),
    beforeRenderGroupIds: parseEvidenceIds(snapshot.sceneBringToFrontMobjectBeforeRenderGroupIds),
    beforeSceneIds: parseEvidenceIds(snapshot.sceneBringToFrontMobjectBeforeSceneIds),
    group: snapshot.sceneBringToFrontMobjectGroup,
    moved: snapshot.sceneBringToFrontMobjectMoved,
    nextIndex: snapshot.sceneBringToFrontMobjectNextIndex,
    objectId: snapshot.sceneBringToFrontMobjectObjectId,
    previousIndex: snapshot.sceneBringToFrontMobjectPreviousIndex,
    sourceContract:
      snapshot.sceneBringToFrontMobjectSourceContract ?? SCENE_BRING_TO_FRONT_MOBJECT_BRIDGE_SOURCE_CONTRACT,
    summary: snapshot.sceneBringToFrontMobjectSummary,
    version: "mais-manim-scene-bring-to-front-mobject-bridge/v1"
  });
  const sceneSendToBackMobjectAttributes = sceneSendToBackMobjectBridgeDataAttributes({
    afterFixedInFrameIds: parseEvidenceIds(snapshot.sceneSendToBackMobjectAfterFixedInFrameIds),
    afterForegroundIds: parseEvidenceIds(snapshot.sceneSendToBackMobjectAfterForegroundIds),
    afterRenderGroupIds: parseEvidenceIds(snapshot.sceneSendToBackMobjectAfterRenderGroupIds),
    afterSceneIds: parseEvidenceIds(snapshot.sceneSendToBackMobjectAfterSceneIds),
    beforeFixedInFrameIds: parseEvidenceIds(snapshot.sceneSendToBackMobjectBeforeFixedInFrameIds),
    beforeForegroundIds: parseEvidenceIds(snapshot.sceneSendToBackMobjectBeforeForegroundIds),
    beforeRenderGroupIds: parseEvidenceIds(snapshot.sceneSendToBackMobjectBeforeRenderGroupIds),
    beforeSceneIds: parseEvidenceIds(snapshot.sceneSendToBackMobjectBeforeSceneIds),
    group: snapshot.sceneSendToBackMobjectGroup,
    moved: snapshot.sceneSendToBackMobjectMoved,
    nextIndex: snapshot.sceneSendToBackMobjectNextIndex,
    objectId: snapshot.sceneSendToBackMobjectObjectId,
    previousIndex: snapshot.sceneSendToBackMobjectPreviousIndex,
    sourceContract: snapshot.sceneSendToBackMobjectSourceContract ?? SCENE_SEND_TO_BACK_MOBJECT_BRIDGE_SOURCE_CONTRACT,
    summary: snapshot.sceneSendToBackMobjectSummary,
    version: "mais-manim-scene-send-to-back-mobject-bridge/v1"
  });
  const sceneAddMobjectAttributes = sceneAddMobjectBridgeDataAttributes({
    afterFixedInFrameIds: parseEvidenceIds(snapshot.sceneAddMobjectAfterFixedInFrameIds),
    afterForegroundIds: parseEvidenceIds(snapshot.sceneAddMobjectAfterForegroundIds),
    afterRenderGroupIds: parseEvidenceIds(snapshot.sceneAddMobjectAfterRenderGroupIds),
    afterSceneIds: parseEvidenceIds(snapshot.sceneAddMobjectAfterSceneIds),
    beforeFixedInFrameIds: parseEvidenceIds(snapshot.sceneAddMobjectBeforeFixedInFrameIds),
    beforeForegroundIds: parseEvidenceIds(snapshot.sceneAddMobjectBeforeForegroundIds),
    beforeRenderGroupIds: parseEvidenceIds(snapshot.sceneAddMobjectBeforeRenderGroupIds),
    beforeSceneIds: parseEvidenceIds(snapshot.sceneAddMobjectBeforeSceneIds),
    added: snapshot.sceneAddMobjectAdded,
    group: snapshot.sceneAddMobjectGroup,
    objectId: snapshot.sceneAddMobjectObjectId,
    restoredFamilyCount: snapshot.sceneAddMobjectRestoredFamilyCount,
    restoredFamilyIds: parseEvidenceIds(snapshot.sceneAddMobjectRestoredFamilyIds),
    sourceContract: snapshot.sceneAddMobjectSourceContract ?? SCENE_ADD_MOBJECT_BRIDGE_SOURCE_CONTRACT,
    summary: snapshot.sceneAddMobjectSummary,
    version: "mais-manim-scene-add-mobject-bridge/v1"
  });
  const sceneReplaceMobjectAttributes = sceneReplaceMobjectBridgeDataAttributes({
    afterRenderGroupIds: parseEvidenceIds(snapshot.sceneReplaceMobjectAfterRenderGroupIds),
    beforeRenderGroupIds: parseEvidenceIds(snapshot.sceneReplaceMobjectBeforeRenderGroupIds),
    group: snapshot.sceneReplaceMobjectGroup,
    objectId: snapshot.sceneReplaceMobjectObjectId,
    removedFamilyIds: parseEvidenceIds(snapshot.sceneReplaceMobjectRemovedFamilyIds),
    replaced: snapshot.sceneReplaceMobjectReplaced,
    replacementCount: snapshot.sceneReplaceMobjectReplacementCount,
    replacementIds: parseEvidenceIds(snapshot.sceneReplaceMobjectReplacementIds),
    requestedReplacementIds: parseEvidenceIds(snapshot.sceneReplaceMobjectRequestedReplacementIds),
    restoredReplacementFamilyIds: parseEvidenceIds(snapshot.sceneReplaceMobjectRestoredReplacementFamilyIds),
    sourceContract: snapshot.sceneReplaceMobjectSourceContract ?? SCENE_REPLACE_MOBJECT_BRIDGE_SOURCE_CONTRACT,
    summary: snapshot.sceneReplaceMobjectSummary,
    version: "mais-manim-scene-replace-mobject-bridge/v1"
  });
  const sceneRemoveMobjectAttributes = sceneRemoveMobjectBridgeDataAttributes({
    afterFixedInFrameIds: parseEvidenceIds(snapshot.sceneRemoveMobjectAfterFixedInFrameIds),
    afterForegroundIds: parseEvidenceIds(snapshot.sceneRemoveMobjectAfterForegroundIds),
    afterRenderGroupIds: parseEvidenceIds(snapshot.sceneRemoveMobjectAfterRenderGroupIds),
    afterSceneIds: parseEvidenceIds(snapshot.sceneRemoveMobjectAfterSceneIds),
    beforeFixedInFrameIds: parseEvidenceIds(snapshot.sceneRemoveMobjectBeforeFixedInFrameIds),
    beforeForegroundIds: parseEvidenceIds(snapshot.sceneRemoveMobjectBeforeForegroundIds),
    beforeRenderGroupIds: parseEvidenceIds(snapshot.sceneRemoveMobjectBeforeRenderGroupIds),
    beforeSceneIds: parseEvidenceIds(snapshot.sceneRemoveMobjectBeforeSceneIds),
    descendantRemovedIds: parseEvidenceIds(snapshot.sceneRemoveMobjectDescendantRemovedIds),
    objectId: snapshot.sceneRemoveMobjectObjectId,
    removed: snapshot.sceneRemoveMobjectRemoved,
    removedFamilyCount: snapshot.sceneRemoveMobjectRemovedFamilyCount,
    removedFamilyIds: parseEvidenceIds(snapshot.sceneRemoveMobjectRemovedFamilyIds),
    sourceContract: snapshot.sceneRemoveMobjectSourceContract ?? SCENE_REMOVE_MOBJECT_BRIDGE_SOURCE_CONTRACT,
    summary: snapshot.sceneRemoveMobjectSummary,
    version: "mais-manim-scene-remove-mobject-bridge/v1"
  });
  const pointerControlAttributes = scenePointerControlDataAttributes({
    button: snapshot.manimPointerControlButton,
    buttons: snapshot.manimPointerControlButtons,
    deltaPoint: snapshot.manimPointerControlDeltaPoint,
    dispatchesEvent: snapshot.manimPointerControlDispatchesEvent,
    eventType: snapshot.manimPointerControlEventType,
    frameAction: snapshot.manimPointerControlFrameAction,
    frameShift: snapshot.manimPointerControlFrameShift,
    modifiers: snapshot.manimPointerControlModifiers,
    mouseDragPointUpdated: snapshot.manimPointerControlMouseDragPointUpdated,
    mousePointUpdated: snapshot.manimPointerControlMousePointUpdated,
    offset: snapshot.manimPointerControlOffset,
    phiDelta: snapshot.manimPointerControlPhiDelta,
    pointerControlVersion: "mais-manim-pointer-controls/v1",
    point: snapshot.manimPointerControlPoint,
    propagationStopped: snapshot.manimPointerControlPropagationStopped,
    scaleAboutPoint: snapshot.manimPointerControlScaleAboutPoint,
    scaleFactor: snapshot.manimPointerControlScaleFactor,
    scrollRelativeOffset: snapshot.manimPointerControlScrollRelativeOffset,
    sourceContract: snapshot.manimPointerControlSourceContract ?? SCENE_POINTER_CONTROL_SOURCE_CONTRACT,
    summary: snapshot.manimPointerControlSummary,
    thetaDelta: snapshot.manimPointerControlThetaDelta,
    windowAssertionSatisfied: snapshot.manimPointerControlWindowOk
  });
  const pickAttributes = scenePickDataAttributes(snapshot.manimPickHit
    ? {
        buff: snapshot.manimPickBuff,
        conceptId: snapshot.manimPickConceptId,
        distanceToCenter: snapshot.manimPickDistanceToCenter,
        group: snapshot.manimPickGroup as "scene" | "foreground" | "fixedInFrame",
        objectId: snapshot.manimPickObjectId,
        renderIndex: snapshot.manimPickRenderIndex,
        searchOrderIndex: snapshot.manimPickSearchOrderIndex,
        sourceContract: snapshot.manimPickSourceContract ?? SCENE_PICKING_SOURCE_CONTRACT,
        summary: snapshot.manimPickSummary
      }
    : null
  );

  return {
    "data-viz-active-step": snapshot.activeStep,
    "data-viz-concept-id": snapshot.activeConceptId,
    "data-viz-manim-camera-ambient-rotation-degrees": snapshot.cameraAmbientRotationDegrees.toFixed(3),
    "data-viz-manim-camera-updater-active-count": String(snapshot.cameraUpdaterActiveCount),
    "data-viz-manim-camera-updater-active-ids": snapshot.cameraUpdaterActiveIds,
    "data-viz-manim-camera-updater-active-seconds": snapshot.cameraUpdaterActiveSeconds.toFixed(3),
    "data-viz-manim-camera-updater-active-window-summary": snapshot.cameraUpdaterActiveWindowSummary,
    "data-viz-manim-camera-updater-count": String(snapshot.cameraUpdaterCount),
    "data-viz-manim-camera-updater-source-contract": snapshot.cameraUpdaterSourceContract,
    "data-viz-manim-camera-updater-time-mode": snapshot.cameraUpdaterTimeMode,
    "data-viz-camera-canonical-shot": snapshot.cameraCanonicalShot,
    "data-viz-camera-shot": snapshot.cameraShot,
    ...cameraFrameAttributes,
    "data-viz-manim-camera-frame-operation-count": String(snapshot.manimCameraFrameOperationCount),
    "data-viz-manim-camera-frame-operation-ids": snapshot.manimCameraFrameOperationIds,
    "data-viz-manim-camera-frame-operation-summary": snapshot.manimCameraFrameOperationSummary,
    "data-viz-manim-camera-frame-restored-id": snapshot.manimCameraFrameRestoredId,
    "data-viz-manim-camera-frame-rotated-theta": snapshot.manimCameraFrameRotatedTheta.toFixed(3),
    "data-viz-manim-camera-frame-scaled-fovy": snapshot.manimCameraFrameScaledFovy.toFixed(3),
    "data-viz-manim-camera-frame-shifted-center": snapshot.manimCameraFrameShiftedCenter,
    ...cameraShotCatalogAttributes,
    "data-viz-manim-camera-director-active-shot": cameraDirectorAttributes["data-viz-manim-camera-director-active-shot"],
    "data-viz-manim-camera-director-canonical-shot": cameraDirectorAttributes["data-viz-manim-camera-director-canonical-shot"],
    "data-viz-manim-camera-director-reset-shot": cameraDirectorAttributes["data-viz-manim-camera-director-reset-shot"],
    "data-viz-manim-camera-director-timeline-shot": cameraDirectorAttributes["data-viz-manim-camera-director-timeline-shot"],
    "data-viz-manim-camera-director-progress": cameraDirectorAttributes["data-viz-manim-camera-director-progress"],
    "data-viz-manim-camera-director-transition-summary": cameraDirectorAttributes["data-viz-manim-camera-director-transition-summary"],
    "data-viz-manim-camera-director-updater-count": cameraDirectorAttributes["data-viz-manim-camera-director-updater-count"],
    "data-viz-manim-camera-director-active-updater-count": cameraDirectorAttributes["data-viz-manim-camera-director-active-updater-count"],
    "data-viz-manim-camera-director-active-updater-ids": cameraDirectorAttributes["data-viz-manim-camera-director-active-updater-ids"],
    "data-viz-manim-camera-director-ambient-rotation-degrees": cameraDirectorAttributes["data-viz-manim-camera-director-ambient-rotation-degrees"],
    "data-viz-manim-camera-director-shot-position": cameraDirectorAttributes["data-viz-manim-camera-director-shot-position"],
    "data-viz-manim-camera-director-shot-target": cameraDirectorAttributes["data-viz-manim-camera-director-shot-target"],
    "data-viz-manim-camera-director-shot-fov": cameraDirectorAttributes["data-viz-manim-camera-director-shot-fov"],
    "data-viz-manim-camera-director-source-contract": cameraDirectorAttributes["data-viz-manim-camera-director-source-contract"],
    "data-viz-manim-camera-director-summary": cameraDirectorAttributes["data-viz-manim-camera-director-summary"],
    ...creationPrimitiveAttributes,
    ...showCreationAttributes,
    ...drawBorderThenFillAttributes,
    ...fadeGrowAttributes,
    ...indicationPrimitiveAttributes,
    ...runtimeIndicationOverlayAttributes,
    ...axisTickAttributes,
    ...coordinateSystemAttributes,
    "data-viz-manim-coordinate-space-source-contract": coordinateSpaceAttributes["data-viz-manim-coordinate-space-source-contract"],
    "data-viz-manim-coordinate-space-math-range": coordinateSpaceAttributes["data-viz-manim-coordinate-space-math-range"],
    "data-viz-manim-coordinate-space-world-range": coordinateSpaceAttributes["data-viz-manim-coordinate-space-world-range"],
    "data-viz-manim-coordinate-space-scale": coordinateSpaceAttributes["data-viz-manim-coordinate-space-scale"],
    "data-viz-manim-coordinate-space-c2p-summary": coordinateSpaceAttributes["data-viz-manim-coordinate-space-c2p-summary"],
    "data-viz-manim-coordinate-space-p2c-summary": coordinateSpaceAttributes["data-viz-manim-coordinate-space-p2c-summary"],
    "data-viz-manim-coordinate-space-vector-delta": coordinateSpaceAttributes["data-viz-manim-coordinate-space-vector-delta"],
    "data-viz-manim-coordinate-space-sample-count": coordinateSpaceAttributes["data-viz-manim-coordinate-space-sample-count"],
    "data-viz-manim-coordinate-space-finite-sample-count": coordinateSpaceAttributes["data-viz-manim-coordinate-space-finite-sample-count"],
    "data-viz-manim-coordinate-space-roundtrip-error": coordinateSpaceAttributes["data-viz-manim-coordinate-space-roundtrip-error"],
    "data-viz-manim-coordinate-space-curve-sample-count": coordinateSpaceAttributes["data-viz-manim-coordinate-space-curve-sample-count"],
    "data-viz-manim-coordinate-space-arc-length": coordinateSpaceAttributes["data-viz-manim-coordinate-space-arc-length"],
    "data-viz-manim-coordinate-space-resampled-count": coordinateSpaceAttributes["data-viz-manim-coordinate-space-resampled-count"],
    "data-viz-manim-coordinate-space-endpoints": coordinateSpaceAttributes["data-viz-manim-coordinate-space-endpoints"],
    "data-viz-manim-coordinate-space-summary": coordinateSpaceAttributes["data-viz-manim-coordinate-space-summary"],
    ...surfaceObjectAttributes,
    ...moveAlongVectorFieldAttributes,
    ...tracingTailAttributes,
    "data-viz-formula-binding-anchor-count": String(snapshot.formulaBindingAnchorCount),
    "data-viz-formula-binding-missing-anchor-count": String(snapshot.formulaBindingMissingAnchorCount),
    "data-viz-formula-binding-missing-anchor-token-ids": snapshot.formulaBindingMissingAnchorTokenIds,
    "data-viz-formula-binding-anchor-source-contract": snapshot.formulaBindingAnchorSourceContract,
    "data-viz-formula-token-count": String(snapshot.formulaTokenCount),
    "data-viz-formula-token-ids": snapshot.formulaTokenIds,
    "data-viz-manim-formula-layer-source-contract": snapshot.manimFormulaLayerSourceContract,
    ...projectedLabelAttributes,
    ...projectedLabelTextAttributes,
    ...formulaCollisionAttributes,
    ...texCacheAttributes,
    ...texCompileAttributes,
    ...texColorMapAttributes,
    ...texColorizedFormulaAttributes,
    ...texIsolationAttributes,
    ...formulaSvgMorphAttributes,
    "data-viz-manim-active-animation-node-count": String(snapshot.manimActiveAnimationNodeCount),
    "data-viz-manim-active-animation-node-progress-summary": snapshot.manimActiveAnimationNodeProgressSummary,
    "data-viz-manim-active-animation-object-id": snapshot.manimActiveAnimationObjectId,
    "data-viz-manim-active-animation-plan-id": snapshot.manimActiveAnimationPlanId,
    "data-viz-manim-active-animation-plan-ids": snapshot.manimActiveAnimationPlanIds,
    "data-viz-manim-active-animation-progress": snapshot.manimActiveAnimationProgress.toFixed(3),
    "data-viz-manim-active-animation-target-id": snapshot.manimActiveAnimationTargetObjectId,
    "data-viz-manim-animation-runtime-source-contract":
      animationRuntimeAttributes["data-viz-manim-animation-runtime-source-contract"],
    "data-viz-manim-animation-runtime-mobject-interpolate-policy":
      animationRuntimeAttributes["data-viz-manim-animation-runtime-mobject-interpolate-policy"],
    "data-viz-manim-animation-runtime-active": animationRuntimeAttributes["data-viz-manim-animation-runtime-active"],
    "data-viz-manim-animation-runtime-active-plan-count":
      animationRuntimeAttributes["data-viz-manim-animation-runtime-active-plan-count"],
    "data-viz-manim-animation-runtime-active-plan-ids":
      animationRuntimeAttributes["data-viz-manim-animation-runtime-active-plan-ids"],
    "data-viz-manim-animation-runtime-node-count": animationRuntimeAttributes["data-viz-manim-animation-runtime-node-count"],
    "data-viz-manim-animation-runtime-object-id": animationRuntimeAttributes["data-viz-manim-animation-runtime-object-id"],
    "data-viz-manim-animation-runtime-object-ids": animationRuntimeAttributes["data-viz-manim-animation-runtime-object-ids"],
    "data-viz-manim-animation-runtime-target-object-id":
      animationRuntimeAttributes["data-viz-manim-animation-runtime-target-object-id"],
    "data-viz-manim-animation-runtime-progress": animationRuntimeAttributes["data-viz-manim-animation-runtime-progress"],
    "data-viz-manim-animation-runtime-raw-progress-range":
      animationRuntimeAttributes["data-viz-manim-animation-runtime-raw-progress-range"],
    "data-viz-manim-animation-runtime-lagged-progress-range":
      animationRuntimeAttributes["data-viz-manim-animation-runtime-lagged-progress-range"],
    "data-viz-manim-animation-runtime-eased-progress-range":
      animationRuntimeAttributes["data-viz-manim-animation-runtime-eased-progress-range"],
    "data-viz-manim-animation-runtime-rate-functions":
      animationRuntimeAttributes["data-viz-manim-animation-runtime-rate-functions"],
    "data-viz-manim-animation-runtime-render-kind-summary":
      animationRuntimeAttributes["data-viz-manim-animation-runtime-render-kind-summary"],
    "data-viz-manim-animation-runtime-finite-bounding-box-count":
      animationRuntimeAttributes["data-viz-manim-animation-runtime-finite-bounding-box-count"],
    "data-viz-manim-animation-runtime-summary": animationRuntimeAttributes["data-viz-manim-animation-runtime-summary"],
    "data-viz-manim-transform-interpolate-bounding-box-count": String(snapshot.manimTransformInterpolateBoundingBoxCount),
    "data-viz-manim-transform-interpolate-bounding-box-empty-count": String(snapshot.manimTransformInterpolateEmptyBoundingBoxCount),
    "data-viz-manim-transform-interpolate-bounding-box-finite-count": String(snapshot.manimTransformInterpolateFiniteBoundingBoxCount),
    "data-viz-manim-transform-interpolate-bounding-box-object-ids": snapshot.manimTransformInterpolateBoundingBoxObjectIds,
    "data-viz-manim-transform-interpolate-bounding-box-summary": snapshot.manimTransformInterpolateBoundingBoxSummary,
    "data-viz-manim-transform-interpolate-uniform-clipping-plane-count": String(snapshot.manimTransformInterpolateUniformClippingPlaneCount),
    "data-viz-manim-transform-interpolate-uniform-count": String(snapshot.manimTransformInterpolateUniformCount),
    "data-viz-manim-transform-interpolate-uniform-object-ids": snapshot.manimTransformInterpolateUniformObjectIds,
    "data-viz-manim-transform-interpolate-uniform-opacity-range": snapshot.manimTransformInterpolateUniformOpacityRange,
    "data-viz-manim-transform-interpolate-uniform-opacity-sample-count": String(snapshot.manimTransformInterpolateUniformOpacitySampleCount),
    "data-viz-manim-transform-interpolate-uniform-source-summary": snapshot.manimTransformInterpolateUniformSourceSummary,
    "data-viz-manim-transform-interpolate-uniform-summary": snapshot.manimTransformInterpolateUniformSummary,
    "data-viz-manim-transform-interpolate-field-arc-path-node-count":
      transformFieldAttributes["data-viz-manim-transform-interpolate-field-arc-path-node-count"],
    "data-viz-manim-transform-interpolate-field-bounding-box-node-count":
      transformFieldAttributes["data-viz-manim-transform-interpolate-field-bounding-box-node-count"],
    "data-viz-manim-transform-interpolate-field-node-count":
      transformFieldAttributes["data-viz-manim-transform-interpolate-field-node-count"],
    "data-viz-manim-transform-interpolate-field-non-point-count":
      transformFieldAttributes["data-viz-manim-transform-interpolate-field-non-point-count"],
    "data-viz-manim-transform-interpolate-field-non-point-policy":
      transformFieldAttributes["data-viz-manim-transform-interpolate-field-non-point-policy"],
    "data-viz-manim-transform-interpolate-field-object-ids":
      transformFieldAttributes["data-viz-manim-transform-interpolate-field-object-ids"],
    "data-viz-manim-transform-interpolate-field-path-summary":
      transformFieldAttributes["data-viz-manim-transform-interpolate-field-path-summary"],
    "data-viz-manim-transform-interpolate-field-pointlike-count":
      transformFieldAttributes["data-viz-manim-transform-interpolate-field-pointlike-count"],
    "data-viz-manim-transform-interpolate-field-pointlike-policy":
      transformFieldAttributes["data-viz-manim-transform-interpolate-field-pointlike-policy"],
    "data-viz-manim-transform-interpolate-field-pointlike-summary":
      transformFieldAttributes["data-viz-manim-transform-interpolate-field-pointlike-summary"],
    "data-viz-manim-transform-interpolate-field-source-summary":
      transformFieldAttributes["data-viz-manim-transform-interpolate-field-source-summary"],
    "data-viz-manim-transform-interpolate-field-straight-path-node-count":
      transformFieldAttributes["data-viz-manim-transform-interpolate-field-straight-path-node-count"],
    "data-viz-manim-transform-interpolate-field-style-node-count":
      transformFieldAttributes["data-viz-manim-transform-interpolate-field-style-node-count"],
    "data-viz-manim-transform-interpolate-field-summary":
      transformFieldAttributes["data-viz-manim-transform-interpolate-field-summary"],
    "data-viz-manim-transform-interpolate-field-uniform-node-count":
      transformFieldAttributes["data-viz-manim-transform-interpolate-field-uniform-node-count"],
    ...transformFamilyAlignmentAttributes,
    "data-viz-manim-transform-family-alignment-entering-count": String(snapshot.manimTransformFamilyAlignmentEnteringCount),
    "data-viz-manim-transform-family-alignment-entry-count": String(snapshot.manimTransformFamilyAlignmentEntryCount),
    "data-viz-manim-transform-family-alignment-exiting-count": String(snapshot.manimTransformFamilyAlignmentExitingCount),
    "data-viz-manim-transform-family-alignment-family-pair-sequence": snapshot.manimTransformFamilyAlignmentFamilyPairSequence,
    "data-viz-manim-transform-family-alignment-family-zip-complete-count":
      String(snapshot.manimTransformFamilyAlignmentFamilyZipCompleteCount),
    "data-viz-manim-transform-family-alignment-family-zip-incomplete-count":
      String(snapshot.manimTransformFamilyAlignmentFamilyZipIncompleteCount),
    "data-viz-manim-transform-family-alignment-family-zip-policy": snapshot.manimTransformFamilyAlignmentFamilyZipPolicy,
    "data-viz-manim-transform-family-alignment-family-zip-sequence": snapshot.manimTransformFamilyAlignmentFamilyZipSequence,
    "data-viz-manim-transform-family-alignment-family-zip-tuple-count":
      String(snapshot.manimTransformFamilyAlignmentFamilyZipTupleCount),
    "data-viz-manim-transform-family-alignment-matched-count": String(snapshot.manimTransformFamilyAlignmentMatchedCount),
    "data-viz-manim-transform-family-alignment-max-depth": String(snapshot.manimTransformFamilyAlignmentMaxDepth),
    "data-viz-manim-transform-family-alignment-point-count-policy": snapshot.manimTransformFamilyAlignmentPointCountPolicy,
    "data-viz-manim-transform-family-alignment-source-contract": snapshot.manimTransformFamilyAlignmentSourceContract,
    "data-viz-manim-transform-family-alignment-summary": snapshot.manimTransformFamilyAlignmentSummary,
    "data-viz-manim-transform-family-alignment-type-mismatch-count": String(snapshot.manimTransformFamilyAlignmentTypeMismatchCount),
    ...transformPointAlignmentAttributes,
    ...transformDataLockAttributes,
    "data-viz-manim-transform-data-lock-alignment-summary": snapshot.manimTransformDataLockAlignmentSummary,
    "data-viz-manim-transform-data-lock-kind-summary": snapshot.manimTransformDataLockKindSummary,
    "data-viz-manim-transform-data-lock-locked-point-count": String(snapshot.manimTransformDataLockLockedPointCount),
    "data-viz-manim-transform-data-lock-moving-point-count": String(snapshot.manimTransformDataLockMovingPointCount),
    "data-viz-manim-transform-data-lock-object-ids": snapshot.manimTransformDataLockObjectIds,
    "data-viz-manim-transform-data-lock-plan-count": String(snapshot.manimTransformDataLockPlanCount),
    "data-viz-manim-transform-data-lock-source-contract": snapshot.manimTransformDataLockSourceContract,
    "data-viz-manim-transform-data-lock-summary": snapshot.manimTransformDataLockSummary,
    "data-viz-manim-transform-data-lock-target-object-ids": snapshot.manimTransformDataLockTargetObjectIds,
    "data-viz-manim-transform-data-lock-total-point-count": String(snapshot.manimTransformDataLockTotalPointCount),
    ...animateBuilderAttributes,
    ...alwaysUpdaterAttributes,
    ...alwaysMethodAttributes,
    ...subAlphaAttributes,
    "data-viz-manim-animation-composition-count": String(snapshot.manimAnimationCompositionCount),
    "data-viz-manim-animation-composition-duration": snapshot.manimAnimationCompositionDuration.toFixed(3),
    "data-viz-manim-animation-composition-issue-count": String(snapshot.manimAnimationCompositionIssueCount),
    "data-viz-manim-animation-composition-modes": snapshot.manimAnimationCompositionModes,
    "data-viz-manim-animation-composition-window-count": String(snapshot.manimAnimationCompositionWindowCount),
    "data-viz-manim-animation-composition-active-id":
      animationCompositionFrameAttributes["data-viz-manim-animation-composition-active-id"],
    "data-viz-manim-animation-composition-active-type":
      animationCompositionFrameAttributes["data-viz-manim-animation-composition-active-type"],
    "data-viz-manim-animation-composition-active-window-count":
      animationCompositionFrameAttributes["data-viz-manim-animation-composition-active-window-count"],
    "data-viz-manim-animation-composition-active-window-ids":
      animationCompositionFrameAttributes["data-viz-manim-animation-composition-active-window-ids"],
    "data-viz-manim-animation-composition-completed-window-count":
      animationCompositionFrameAttributes["data-viz-manim-animation-composition-completed-window-count"],
    "data-viz-manim-animation-composition-completed-window-ids":
      animationCompositionFrameAttributes["data-viz-manim-animation-composition-completed-window-ids"],
    "data-viz-manim-animation-composition-frame-elapsed-seconds":
      animationCompositionFrameAttributes["data-viz-manim-animation-composition-frame-elapsed-seconds"],
    "data-viz-manim-animation-composition-frame-progress":
      animationCompositionFrameAttributes["data-viz-manim-animation-composition-frame-progress"],
    "data-viz-manim-animation-composition-frame-summary":
      animationCompositionFrameAttributes["data-viz-manim-animation-composition-frame-summary"],
    "data-viz-manim-animation-composition-pending-window-count":
      animationCompositionFrameAttributes["data-viz-manim-animation-composition-pending-window-count"],
    "data-viz-manim-animation-composition-pending-window-ids":
      animationCompositionFrameAttributes["data-viz-manim-animation-composition-pending-window-ids"],
    "data-viz-manim-animation-composition-source-contract":
      animationCompositionFrameAttributes["data-viz-manim-animation-composition-source-contract"],
    "data-viz-manim-animation-composition-timing-policy":
      animationCompositionFrameAttributes["data-viz-manim-animation-composition-timing-policy"],
    "data-viz-manim-animation-composition-window-summary":
      animationCompositionFrameAttributes["data-viz-manim-animation-composition-window-summary"],
    ...animationLifecycleAttributes,
    ...transformBeginAttributes,
    "data-viz-manim-transform-begin-data-lock-alignment-summary": snapshot.manimTransformBeginDataLockAlignmentSummary,
    ...transformPathAttributes,
    ...rateFunctionAttributes,
    ...lagRatioAttributes,
    ...updaterSignatureAttributes,
    ...updaterExecutionAttributes,
    "data-viz-manim-animation-object-count": String(snapshot.manimAnimationObjectCount),
    "data-viz-manim-animation-operation-count": String(snapshot.manimAnimationOperationCount),
    "data-viz-manim-animation-plan-count": String(snapshot.manimAnimationPlanCount),
    "data-viz-manim-playback-active-play-index": String(snapshot.manimPlaybackActivePlayIndex),
    "data-viz-manim-playback-active-event-summary": snapshot.manimPlaybackActiveEventSummary,
    "data-viz-manim-playback-completed-play-count": String(snapshot.manimPlaybackCompletedPlayCount),
    "data-viz-manim-playback-event-count": String(snapshot.manimPlaybackEventCount),
    "data-viz-manim-playback-lifecycle-phase": snapshot.manimPlaybackLifecyclePhase,
    "data-viz-manim-playback-lifecycle-summary": snapshot.manimPlaybackLifecycleSummary,
    "data-viz-manim-playback-pending-play-count": String(snapshot.manimPlaybackPendingPlayCount),
    "data-viz-manim-playback-source-contract": snapshot.manimPlaybackSourceContract,
    "data-viz-manim-playback-updates-during-active-play": snapshot.manimPlaybackUpdatesDuringActivePlay ? "true" : "false",
    "data-viz-curve-partial-length": snapshot.curvePartialLength.toFixed(3),
    "data-viz-curve-partial-normalized-range": snapshot.curvePartialNormalizedRange,
    "data-viz-curve-partial-requested-range": snapshot.curvePartialRequestedRange,
    "data-viz-curve-partial-reversed": snapshot.curvePartialReversed ? "true" : "false",
    "data-viz-curve-partial-sample-count": String(snapshot.curvePartialSampleCount),
    "data-viz-curve-partial-source-contract": snapshot.curvePartialSourceContract ?? VMOBJECT_PARTIAL_CURVE_SOURCE_CONTRACT,
    "data-viz-curve-partial-source-id": snapshot.curvePartialSourceId,
    "data-viz-curve-partial-summary": snapshot.curvePartialSummary,
    "data-viz-curve-partial-visibility-policy": snapshot.curvePartialVisibilityPolicy ?? VMOBJECT_PARTIAL_CURVE_VISIBILITY_POLICY,
    ...randomSeedAttributes,
    ...sceneInitializationAttributes,
    ...renderQualityAttributes,
    ...captureAttributes,
    ...fileWriterAttributes,
    ...fileWriterSegmentAttributes,
    ...playbackFileWriterBridgeAttributes,
    ...fileWriterCombineAttributes,
    ...checkpointFileWriterBridgeAttributes,
    ...sceneRunFileWriterFinishBridgeAttributes,
    "data-viz-manim-scene-run-active-phase": snapshot.manimSceneRunActivePhase,
    "data-viz-manim-scene-run-active-phase-index": String(snapshot.manimSceneRunActivePhaseIndex),
    "data-viz-manim-scene-run-construct-actions": snapshot.manimSceneRunConstructActionSummary,
    "data-viz-manim-scene-run-construct-binding-count": String(snapshot.manimSceneRunConstructBindingCount),
    "data-viz-manim-scene-run-construct-complete": snapshot.manimSceneRunConstructComplete ? "true" : "false",
    "data-viz-manim-scene-run-construct-formula-count": String(snapshot.manimSceneRunConstructFormulaCount),
    "data-viz-manim-scene-run-construct-object-count": String(snapshot.manimSceneRunConstructObjectCount),
    "data-viz-manim-scene-run-elapsed-seconds": snapshot.manimSceneRunElapsedSeconds.toFixed(3),
    "data-viz-manim-scene-run-interactive": snapshot.manimSceneRunInteractEnabled ? "true" : "false",
    "data-viz-manim-scene-run-num-plays": String(snapshot.manimSceneRunNumPlays),
    "data-viz-manim-scene-run-phase-count": String(snapshot.manimSceneRunPhaseCount),
    "data-viz-manim-scene-run-phase-status-summary": snapshot.manimSceneRunPhaseStatusSummary,
    "data-viz-manim-scene-run-play-duration": snapshot.manimSceneRunPlayDurationSeconds.toFixed(3),
    "data-viz-manim-scene-run-ready": snapshot.manimSceneRunReady ? "true" : "false",
    "data-viz-manim-scene-run-source-contract": snapshot.manimSceneRunSourceContract,
    "data-viz-manim-scene-run-call-order": snapshot.manimSceneRunCallOrderSummary,
    "data-viz-manim-scene-run-scene-id": snapshot.manimSceneRunSceneId,
    "data-viz-manim-scene-run-scene-signature": snapshot.manimSceneRunSceneSignature,
    "data-viz-manim-scene-run-setup-actions": snapshot.manimSceneRunSetupActionSummary,
    "data-viz-manim-scene-run-setup-complete": snapshot.manimSceneRunSetupComplete ? "true" : "false",
    "data-viz-manim-scene-run-signature": snapshot.manimSceneRunSignature,
    "data-viz-manim-scene-run-skipped-phase-count": String(snapshot.manimSceneRunSkippedPhaseCount),
    "data-viz-manim-scene-run-skipped-phase-ids": snapshot.manimSceneRunSkippedPhaseIds,
    "data-viz-manim-scene-run-summary": snapshot.manimSceneRunSummary,
    "data-viz-manim-scene-run-teardown-actions": snapshot.manimSceneRunTearDownActionSummary,
    "data-viz-manim-scene-run-teardown-ready": snapshot.manimSceneRunTearDownReady ? "true" : "false",
    "data-viz-manim-scene-run-total-duration": snapshot.manimSceneRunTotalDuration.toFixed(3),
    ...sceneRunInteractBridgeAttributes,
    ...sceneSelectorAttributes,
    ...interactLoopAttributes,
    ...sceneExportAttributes,
    ...smokeHookAttributes,
    ...sceneHistoryAttributes,
    ...stateSnapshotAttributes,
    "data-viz-manim-checkpoint-paste-ready": snapshot.manimCheckpointPasteReady ? "true" : "false",
    ...floorPlaneAttributes,
    ...keyControlAttributes,
    ...pickAttributes,
    ...pointerControlAttributes,
    ...timeProgressionAttributes,
    ...waitControlAttributes,
    "data-viz-manim-wait-frame-stepper-active-steps":
      waitFrameStepperBridgeAttributes["data-viz-manim-wait-frame-stepper-active-steps"],
    "data-viz-manim-wait-frame-stepper-camera-shots":
      waitFrameStepperBridgeAttributes["data-viz-manim-wait-frame-stepper-camera-shots"],
    "data-viz-manim-wait-frame-stepper-frame-step-count":
      waitFrameStepperBridgeAttributes["data-viz-manim-wait-frame-stepper-frame-step-count"],
    "data-viz-manim-wait-frame-stepper-mismatch-count":
      waitFrameStepperBridgeAttributes["data-viz-manim-wait-frame-stepper-mismatch-count"],
    "data-viz-manim-wait-frame-stepper-scene-ids":
      waitFrameStepperBridgeAttributes["data-viz-manim-wait-frame-stepper-scene-ids"],
    "data-viz-manim-wait-frame-stepper-source-contract":
      waitFrameStepperBridgeAttributes["data-viz-manim-wait-frame-stepper-source-contract"],
    "data-viz-manim-wait-frame-stepper-summary":
      waitFrameStepperBridgeAttributes["data-viz-manim-wait-frame-stepper-summary"],
    "data-viz-manim-wait-frame-stepper-update-frame-actions":
      waitFrameStepperBridgeAttributes["data-viz-manim-wait-frame-stepper-update-frame-actions"],
    "data-viz-manim-wait-frame-stepper-updater-active-counts":
      waitFrameStepperBridgeAttributes["data-viz-manim-wait-frame-stepper-updater-active-counts"],
    "data-viz-manim-wait-frame-stepper-updater-suspended-counts":
      waitFrameStepperBridgeAttributes["data-viz-manim-wait-frame-stepper-updater-suspended-counts"],
    "data-viz-manim-wait-frame-stepper-updater-value-after-frames":
      waitFrameStepperBridgeAttributes["data-viz-manim-wait-frame-stepper-updater-value-after-frames"],
    "data-viz-manim-wait-frame-stepper-wait-frame-count":
      waitFrameStepperBridgeAttributes["data-viz-manim-wait-frame-stepper-wait-frame-count"],
    "data-viz-manim-wait-frame-stepper-wait-updates-mobjects":
      waitFrameStepperBridgeAttributes["data-viz-manim-wait-frame-stepper-wait-updates-mobjects"],
    "data-viz-manim-wait-frame-stepper-wait-times":
      waitFrameStepperBridgeAttributes["data-viz-manim-wait-frame-stepper-wait-times"],
    "data-viz-manim-wait-frame-stepper-write-frame-flags":
      waitFrameStepperBridgeAttributes["data-viz-manim-wait-frame-stepper-write-frame-flags"],
    "data-viz-manim-wait-control-increments-scene-time": snapshot.manimWaitControlIncrementsSceneTime,
    "data-viz-manim-wait-control-update-mobject-dts": snapshot.manimWaitControlUpdateMobjectDts,
    "data-viz-manim-wait-control-updates-mobjects": snapshot.manimWaitControlUpdatesMobjects,
    ...updateFrameAttributes,
    ...emitFrameAttributes,
    ...progressThroughAttributes,
    ...playCompilationAttributes,
    ...beginAnimationsAttributes,
    ...finishAnimationsAttributes,
    ...prePlayControlAttributes,
    ...postPlayPreviewAttributes,
    ...postCellRedrawAttributes,
    ...shortcutCatalogAttributes,
    ...reloadPlanAttributes,
    ...skippingWindowAttributes,
    ...runFromBeatAttributes,
    ...progressControlAttributes,
    ...skipControlAttributes,
    ...checkpointPasteAttributes,
    ...checkpointStoreAttributes,
    ...updatePolicyAttributes,
    ...valueTrackerAttributes,
    ...windowEventAttributes,
    "data-viz-manim-transform-step-count": String(snapshot.manimTransformStepCount),
    "data-viz-math-object-count": String(snapshot.mathObjectCount),
    ...mobjectFamilyCacheAttributes,
    "data-viz-mobject-family-cycle-count": String(snapshot.mobjectFamilyCycleCount),
    "data-viz-mobject-family-max-depth": String(snapshot.mobjectFamilyMaxDepth),
    "data-viz-mobject-family-member-count": String(snapshot.mobjectFamilyMemberCount),
    "data-viz-mobject-family-orphan-count": String(snapshot.mobjectFamilyOrphanCount),
    "data-viz-mobject-family-root-count": String(snapshot.mobjectFamilyRootCount),
    "data-viz-mobject-family-source-contract": snapshot.mobjectFamilySourceContract,
    "data-viz-mobject-animation-owned-invalidation-count": String(snapshot.mobjectAnimationOwnedInvalidationCount),
    ...mobjectBoundingBoxAttributes,
    "data-viz-mobject-bounding-box-stale-count": String(snapshot.mobjectBoundingBoxStaleCount),
    ...mobjectCopyPlanAttributes,
    ...mobjectLayoutAttributes,
    ...mobjectRenderOrderAttributes,
    ...mobjectDataArrayAttributes,
    "data-viz-mobject-data-changed-count": String(snapshot.mobjectDataChangedCount),
    ...mobjectDirtyStatePayloadAttributes,
    "data-viz-mobject-family-changed-count": String(snapshot.mobjectFamilyChangedCount),
    ...mobjectPointGenerationAttributes,
    ...mobjectPointTransformAttributes,
    ...mobjectPointCloudAttributes,
    ...manimConfigDigestAttributes,
    "data-viz-mobject-invalidated-ids": snapshot.mobjectInvalidatedIds,
    "data-viz-mobject-invalidation-ownership-summary": snapshot.mobjectInvalidationOwnershipSummary,
    "data-viz-mobject-invalidation-reasons": snapshot.mobjectInvalidationReasons,
    "data-viz-mobject-invalidation-summary": snapshot.mobjectInvalidationSummary,
    "data-viz-mobject-max-depth": String(snapshot.mobjectMaxDepth),
    "data-viz-mobject-metadata-changed-count": String(snapshot.mobjectMetadataChangedCount),
    "data-viz-mobject-uniforms-changed-count": String(snapshot.mobjectUniformsChangedCount),
    "data-viz-mobject-orphan-count": String(snapshot.mobjectOrphanCount),
    ...mobjectStatePayloadAttributes,
    ...mobjectStateRestoreBridgeAttributes,
    ...mobjectMoveToTargetBridgeAttributes,
    "data-viz-mobject-targetable-count": String(snapshot.mobjectTargetableCount),
    "data-viz-mobject-clipping-plane-count": String(snapshot.mobjectClippingPlaneCount),
    "data-viz-mobject-fixed-in-frame-uniform-count": String(snapshot.mobjectFixedInFrameUniformCount),
    "data-viz-mobject-shade-in-3d-count": String(snapshot.mobjectShadeIn3DCount),
    "data-viz-mobject-transparent-count": String(snapshot.mobjectTransparentCount),
    "data-viz-mobject-uniform-count": String(snapshot.mobjectUniformCount),
    "data-viz-mobject-uniform-summary": snapshot.mobjectUniformSummary,
    "data-viz-mobject-anchor-empty-bounding-box-count": mobjectAnchorAttributes["data-viz-mobject-anchor-empty-bounding-box-count"],
    "data-viz-mobject-anchor-finite-point-count": mobjectAnchorAttributes["data-viz-mobject-anchor-finite-point-count"],
    "data-viz-mobject-anchor-name-count": mobjectAnchorAttributes["data-viz-mobject-anchor-name-count"],
    "data-viz-mobject-anchor-names": mobjectAnchorAttributes["data-viz-mobject-anchor-names"],
    "data-viz-mobject-anchor-object-count": mobjectAnchorAttributes["data-viz-mobject-anchor-object-count"],
    "data-viz-mobject-anchor-object-ids": mobjectAnchorAttributes["data-viz-mobject-anchor-object-ids"],
    "data-viz-mobject-anchor-point-count": mobjectAnchorAttributes["data-viz-mobject-anchor-point-count"],
    "data-viz-mobject-anchor-source-contract": mobjectAnchorAttributes["data-viz-mobject-anchor-source-contract"],
    "data-viz-mobject-anchor-summary": mobjectAnchorAttributes["data-viz-mobject-anchor-summary"],
    "data-viz-mobject-material-clipping-plane-count": mobjectMaterialUniformAttributes["data-viz-mobject-material-clipping-plane-count"],
    "data-viz-mobject-material-depth-write-enabled-count":
      mobjectMaterialUniformAttributes["data-viz-mobject-material-depth-write-enabled-count"],
    "data-viz-mobject-material-object-count": mobjectMaterialUniformAttributes["data-viz-mobject-material-object-count"],
    "data-viz-mobject-material-object-ids": mobjectMaterialUniformAttributes["data-viz-mobject-material-object-ids"],
    "data-viz-mobject-material-opacity-range": mobjectMaterialUniformAttributes["data-viz-mobject-material-opacity-range"],
    "data-viz-mobject-material-shade-in-3d-count": mobjectMaterialUniformAttributes["data-viz-mobject-material-shade-in-3d-count"],
    "data-viz-mobject-material-source-contract": mobjectMaterialUniformAttributes["data-viz-mobject-material-source-contract"],
    "data-viz-mobject-material-summary": mobjectMaterialUniformAttributes["data-viz-mobject-material-summary"],
    "data-viz-mobject-material-transparent-count": mobjectMaterialUniformAttributes["data-viz-mobject-material-transparent-count"],
    "data-viz-vmobject-render-line-color-roles": vmobjectLineRenderAttributes["data-viz-vmobject-render-line-color-roles"],
    "data-viz-vmobject-render-line-object-count": vmobjectLineRenderAttributes["data-viz-vmobject-render-line-object-count"],
    "data-viz-vmobject-render-line-object-ids": vmobjectLineRenderAttributes["data-viz-vmobject-render-line-object-ids"],
    "data-viz-vmobject-render-line-opacity-range": vmobjectLineRenderAttributes["data-viz-vmobject-render-line-opacity-range"],
    "data-viz-vmobject-render-line-source-contract": vmobjectLineRenderAttributes["data-viz-vmobject-render-line-source-contract"],
    "data-viz-vmobject-render-line-stroke-width-range":
      vmobjectLineRenderAttributes["data-viz-vmobject-render-line-stroke-width-range"],
    "data-viz-vmobject-render-line-summary": vmobjectLineRenderAttributes["data-viz-vmobject-render-line-summary"],
    "data-viz-vmobject-render-line-transparent-count":
      vmobjectLineRenderAttributes["data-viz-vmobject-render-line-transparent-count"],
    "data-viz-vmobject-render-fill-color-roles":
      vmobjectSurfaceFillRenderAttributes["data-viz-vmobject-render-fill-color-roles"],
    "data-viz-vmobject-render-fill-mesh-object-count":
      vmobjectSurfaceFillRenderAttributes["data-viz-vmobject-render-fill-mesh-object-count"],
    "data-viz-vmobject-render-fill-mesh-object-ids":
      vmobjectSurfaceFillRenderAttributes["data-viz-vmobject-render-fill-mesh-object-ids"],
    "data-viz-vmobject-render-fill-object-count":
      vmobjectSurfaceFillRenderAttributes["data-viz-vmobject-render-fill-object-count"],
    "data-viz-vmobject-render-fill-object-ids":
      vmobjectSurfaceFillRenderAttributes["data-viz-vmobject-render-fill-object-ids"],
    "data-viz-vmobject-render-fill-opacity-range":
      vmobjectSurfaceFillRenderAttributes["data-viz-vmobject-render-fill-opacity-range"],
    "data-viz-vmobject-render-fill-source-contract":
      vmobjectSurfaceFillRenderAttributes["data-viz-vmobject-render-fill-source-contract"],
    "data-viz-vmobject-render-fill-summary":
      vmobjectSurfaceFillRenderAttributes["data-viz-vmobject-render-fill-summary"],
    "data-viz-vmobject-render-fill-transparent-count":
      vmobjectSurfaceFillRenderAttributes["data-viz-vmobject-render-fill-transparent-count"],
    "data-viz-vmobject-render-fill-triangle-count":
      vmobjectSurfaceFillRenderAttributes["data-viz-vmobject-render-fill-triangle-count"],
    "data-viz-vmobject-render-fill-vertex-count":
      vmobjectSurfaceFillRenderAttributes["data-viz-vmobject-render-fill-vertex-count"],
    "data-viz-runtime-render-state-finite-point-count":
      runtimeRenderStateAttributes["data-viz-runtime-render-state-finite-point-count"],
    "data-viz-runtime-render-state-kind-summary": runtimeRenderStateAttributes["data-viz-runtime-render-state-kind-summary"],
    "data-viz-runtime-render-state-object-count": runtimeRenderStateAttributes["data-viz-runtime-render-state-object-count"],
    "data-viz-runtime-render-state-object-ids": runtimeRenderStateAttributes["data-viz-runtime-render-state-object-ids"],
    "data-viz-runtime-render-state-point-count": runtimeRenderStateAttributes["data-viz-runtime-render-state-point-count"],
    "data-viz-runtime-render-state-source-contract":
      runtimeRenderStateAttributes["data-viz-runtime-render-state-source-contract"],
    "data-viz-runtime-render-state-styled-object-count":
      runtimeRenderStateAttributes["data-viz-runtime-render-state-styled-object-count"],
    "data-viz-runtime-render-state-summary": runtimeRenderStateAttributes["data-viz-runtime-render-state-summary"],
    "data-viz-runtime-render-state-wireframe-curve-count":
      runtimeRenderStateAttributes["data-viz-runtime-render-state-wireframe-curve-count"],
    "data-viz-runtime-render-state-zero-point-object-count":
      runtimeRenderStateAttributes["data-viz-runtime-render-state-zero-point-object-count"],
    "data-viz-manim-timeline-active-concept-id": timelineAttributes["data-viz-manim-timeline-active-concept-id"],
    "data-viz-manim-timeline-active-step-index": timelineAttributes["data-viz-manim-timeline-active-step-index"],
    "data-viz-manim-timeline-active-step-type": timelineAttributes["data-viz-manim-timeline-active-step-type"],
    "data-viz-manim-timeline-camera-step-count": timelineAttributes["data-viz-manim-timeline-camera-step-count"],
    "data-viz-manim-timeline-completed-step-count": timelineAttributes["data-viz-manim-timeline-completed-step-count"],
    "data-viz-manim-timeline-elapsed-seconds": timelineAttributes["data-viz-manim-timeline-elapsed-seconds"],
    "data-viz-manim-timeline-focus-target-count": timelineAttributes["data-viz-manim-timeline-focus-target-count"],
    "data-viz-manim-timeline-focus-target-ids": timelineAttributes["data-viz-manim-timeline-focus-target-ids"],
    "data-viz-manim-timeline-focus-target-policy": timelineAttributes["data-viz-manim-timeline-focus-target-policy"],
    "data-viz-manim-timeline-focus-target-primary-id": timelineAttributes["data-viz-manim-timeline-focus-target-primary-id"],
    "data-viz-manim-timeline-focus-target-summary": timelineAttributes["data-viz-manim-timeline-focus-target-summary"],
    "data-viz-manim-timeline-pending-step-count": timelineAttributes["data-viz-manim-timeline-pending-step-count"],
    "data-viz-manim-timeline-progress": timelineAttributes["data-viz-manim-timeline-progress"],
    "data-viz-manim-timeline-reduced-motion": timelineAttributes["data-viz-manim-timeline-reduced-motion"],
    "data-viz-manim-timeline-skip-animations": timelineAttributes["data-viz-manim-timeline-skip-animations"],
    "data-viz-manim-timeline-source-contract": timelineAttributes["data-viz-manim-timeline-source-contract"],
    "data-viz-manim-timeline-step-count": timelineAttributes["data-viz-manim-timeline-step-count"],
    "data-viz-manim-timeline-step-type-summary": timelineAttributes["data-viz-manim-timeline-step-type-summary"],
    "data-viz-manim-timeline-summary": timelineAttributes["data-viz-manim-timeline-summary"],
    "data-viz-manim-timeline-total-duration": timelineAttributes["data-viz-manim-timeline-total-duration"],
    "data-viz-manim-timeline-wait-step-count": timelineAttributes["data-viz-manim-timeline-wait-step-count"],
    "data-viz-mobject-unknown-invalidation-count": String(snapshot.mobjectUnknownInvalidationCount),
    "data-viz-mobject-updater-active-invalidation-count": String(snapshot.mobjectUpdaterActiveInvalidationCount),
    "data-viz-object-count": String(snapshot.objectCount),
    "data-viz-manim-ode-bounds-summary": odeTrajectoryAttributes["data-viz-manim-ode-bounds-summary"],
    "data-viz-manim-ode-finite-sample-count": odeTrajectoryAttributes["data-viz-manim-ode-finite-sample-count"],
    "data-viz-manim-ode-initial-state-summary": odeTrajectoryAttributes["data-viz-manim-ode-initial-state-summary"],
    "data-viz-manim-ode-method-ids": odeTrajectoryAttributes["data-viz-manim-ode-method-ids"],
    "data-viz-manim-ode-object-source-contract":
      odeTrajectoryObjectBridgeAttributes["data-viz-manim-ode-object-source-contract"],
    "data-viz-manim-ode-sample-count": odeTrajectoryAttributes["data-viz-manim-ode-sample-count"],
    "data-viz-manim-ode-source-contract": odeTrajectoryAttributes["data-viz-manim-ode-source-contract"],
    "data-viz-manim-ode-solver-contract": odeTrajectoryAttributes["data-viz-manim-ode-solver-contract"],
    "data-viz-manim-ode-step-count-summary": odeTrajectoryAttributes["data-viz-manim-ode-step-count-summary"],
    "data-viz-manim-ode-step-size-summary": odeTrajectoryAttributes["data-viz-manim-ode-step-size-summary"],
    "data-viz-manim-ode-stopped-count": odeTrajectoryAttributes["data-viz-manim-ode-stopped-count"],
    "data-viz-manim-ode-stopped-reason-summary": odeTrajectoryAttributes["data-viz-manim-ode-stopped-reason-summary"],
    "data-viz-manim-ode-summary": odeTrajectoryAttributes["data-viz-manim-ode-summary"],
    "data-viz-manim-ode-system-summary": odeTrajectoryAttributes["data-viz-manim-ode-system-summary"],
    "data-viz-manim-ode-tail-sample-count": odeTrajectoryAttributes["data-viz-manim-ode-tail-sample-count"],
    "data-viz-manim-ode-time-range-summary": odeTrajectoryAttributes["data-viz-manim-ode-time-range-summary"],
    "data-viz-manim-ode-trajectory-count": odeTrajectoryAttributes["data-viz-manim-ode-trajectory-count"],
    "data-viz-manim-vector-field-arrow-count": vectorFieldAttributes["data-viz-manim-vector-field-arrow-count"],
    "data-viz-manim-vector-field-arrow-length-range": vectorFieldAttributes["data-viz-manim-vector-field-arrow-length-range"],
    "data-viz-manim-vector-field-color-band-summary": vectorFieldAttributes["data-viz-manim-vector-field-color-band-summary"],
    "data-viz-manim-vector-field-coordinate-mode-summary": vectorFieldAttributes["data-viz-manim-vector-field-coordinate-mode-summary"],
    "data-viz-manim-vector-field-count": vectorFieldAttributes["data-viz-manim-vector-field-count"],
    "data-viz-manim-vector-field-finite-arrow-length-count":
      vectorFieldAttributes["data-viz-manim-vector-field-finite-arrow-length-count"],
    "data-viz-manim-vector-field-finite-vector-count": vectorFieldAttributes["data-viz-manim-vector-field-finite-vector-count"],
    "data-viz-manim-vector-field-high-band-count": vectorFieldAttributes["data-viz-manim-vector-field-high-band-count"],
    "data-viz-manim-vector-field-length-encoding-monotonic":
      vectorFieldAttributes["data-viz-manim-vector-field-length-encoding-monotonic"],
    "data-viz-manim-vector-field-length-encoding-summary":
      vectorFieldAttributes["data-viz-manim-vector-field-length-encoding-summary"],
    "data-viz-manim-vector-field-low-band-count": vectorFieldAttributes["data-viz-manim-vector-field-low-band-count"],
    "data-viz-manim-vector-field-max-magnitude": vectorFieldAttributes["data-viz-manim-vector-field-max-magnitude"],
    "data-viz-manim-vector-field-mid-band-count": vectorFieldAttributes["data-viz-manim-vector-field-mid-band-count"],
    "data-viz-manim-vector-field-sample-count": vectorFieldAttributes["data-viz-manim-vector-field-sample-count"],
    "data-viz-manim-vector-field-sample-grid-summary": vectorFieldAttributes["data-viz-manim-vector-field-sample-grid-summary"],
    "data-viz-manim-vector-field-source-contract": vectorFieldAttributes["data-viz-manim-vector-field-source-contract"],
    "data-viz-manim-vector-field-summary": vectorFieldAttributes["data-viz-manim-vector-field-summary"],
    "data-viz-manim-vector-field-system-summary": vectorFieldAttributes["data-viz-manim-vector-field-system-summary"],
    "data-viz-manim-vector-field-zero-band-count": vectorFieldAttributes["data-viz-manim-vector-field-zero-band-count"],
    "data-viz-manim-vector-field-zero-vector-count": vectorFieldAttributes["data-viz-manim-vector-field-zero-vector-count"],
    "data-viz-manim-stream-line-animated-window-count": streamLineAttributes["data-viz-manim-stream-line-animated-window-count"],
    "data-viz-manim-stream-line-completed-line-count": streamLineAttributes["data-viz-manim-stream-line-completed-line-count"],
    "data-viz-manim-stream-line-count": streamLineAttributes["data-viz-manim-stream-line-count"],
    "data-viz-manim-stream-line-coordinate-mode-summary": streamLineAttributes["data-viz-manim-stream-line-coordinate-mode-summary"],
    "data-viz-manim-stream-line-cycle-seconds-summary": streamLineAttributes["data-viz-manim-stream-line-cycle-seconds-summary"],
    "data-viz-manim-stream-line-frame-phase-order": streamLineAttributes["data-viz-manim-stream-line-frame-phase-order"],
    "data-viz-manim-stream-line-frame-plan-segment-count": streamLineAttributes["data-viz-manim-stream-line-frame-plan-segment-count"],
    "data-viz-manim-stream-line-frame-plan-source-contract": streamLineAttributes["data-viz-manim-stream-line-frame-plan-source-contract"],
    "data-viz-manim-stream-line-frame-plan-visible-line-count":
      streamLineAttributes["data-viz-manim-stream-line-frame-plan-visible-line-count"],
    "data-viz-manim-stream-line-frame-finite-visible-length-count":
      streamLineAttributes["data-viz-manim-stream-line-frame-finite-visible-length-count"],
    "data-viz-manim-stream-line-frame-visible-length-range":
      streamLineAttributes["data-viz-manim-stream-line-frame-visible-length-range"],
    "data-viz-manim-stream-line-frame-visible-length-summary":
      streamLineAttributes["data-viz-manim-stream-line-frame-visible-length-summary"],
    "data-viz-manim-stream-line-frame-window-range-summary":
      streamLineAttributes["data-viz-manim-stream-line-frame-window-range-summary"],
    "data-viz-manim-stream-line-integration-step-summary": streamLineAttributes["data-viz-manim-stream-line-integration-step-summary"],
    "data-viz-manim-stream-line-object-count": streamLineAttributes["data-viz-manim-stream-line-object-count"],
    "data-viz-manim-stream-line-phase-offset-range": streamLineAttributes["data-viz-manim-stream-line-phase-offset-range"],
    "data-viz-manim-stream-line-point-count": streamLineAttributes["data-viz-manim-stream-line-point-count"],
    "data-viz-manim-stream-line-reveal-window-summary": streamLineAttributes["data-viz-manim-stream-line-reveal-window-summary"],
    "data-viz-manim-stream-line-seed-grid-summary": streamLineAttributes["data-viz-manim-stream-line-seed-grid-summary"],
    "data-viz-manim-stream-line-source-contract": streamLineAttributes["data-viz-manim-stream-line-source-contract"],
    "data-viz-manim-stream-line-set-count": streamLineAttributes["data-viz-manim-stream-line-set-count"],
    "data-viz-manim-stream-line-stopped-line-count": streamLineAttributes["data-viz-manim-stream-line-stopped-line-count"],
    "data-viz-manim-stream-line-summary": streamLineAttributes["data-viz-manim-stream-line-summary"],
    "data-viz-manim-stream-line-system-summary": streamLineAttributes["data-viz-manim-stream-line-system-summary"],
    "data-viz-manim-stream-line-visible-point-count": streamLineAttributes["data-viz-manim-stream-line-visible-point-count"],
    "data-viz-manim-stream-line-visible-progress-summary": streamLineAttributes["data-viz-manim-stream-line-visible-progress-summary"],
    "data-viz-manim-stream-line-wrapped-window-count": streamLineAttributes["data-viz-manim-stream-line-wrapped-window-count"],
    ...parameterPanelAttributes,
    "data-viz-parameter-tracker-count": String(snapshot.parameterTrackerCount),
    "data-viz-parameter-tracker-ids": snapshot.parameterTrackerIds,
    "data-viz-parameter-tracker-summary": snapshot.parameterTrackerSummary,
    "data-viz-parameter-tracker-values": snapshot.parameterTrackerValues,
    "data-viz-reduced-motion": snapshot.reducedMotion ? "true" : "false",
    "data-viz-scene-fixed-in-frame-count": String(snapshot.sceneFixedInFrameCount),
    "data-viz-scene-fixed-in-frame-ids": snapshot.sceneFixedInFrameIds,
    "data-viz-scene-foreground-count": String(snapshot.sceneForegroundCount),
    "data-viz-scene-foreground-ids": snapshot.sceneForegroundIds,
    "data-viz-scene-id": snapshot.sceneId,
    ...sceneMembershipDataAttributes({
      activeIntroducerIds: snapshot.sceneMembershipActiveIntroducerIds === "none" ? [] : snapshot.sceneMembershipActiveIntroducerIds.split(","),
      activeRemoverIds: snapshot.sceneMembershipActiveRemoverIds === "none" ? [] : snapshot.sceneMembershipActiveRemoverIds.split(","),
      eventSummary: snapshot.sceneMembershipEventSummary,
      excludedObjectIds: snapshot.sceneMembershipExcludedIds === "none" ? [] : snapshot.sceneMembershipExcludedIds.split(","),
      pendingIntroducerIds: snapshot.sceneMembershipPendingIntroducerIds === "none" ? [] : snapshot.sceneMembershipPendingIntroducerIds.split(","),
      removedObjectIds: snapshot.sceneMembershipRemovedIds === "none" ? [] : snapshot.sceneMembershipRemovedIds.split(","),
      sourceContract: snapshot.sceneMembershipSourceContract ?? SCENE_MEMBERSHIP_SOURCE_CONTRACT,
      sourceSummary: snapshot.sceneMembershipSourceSummary
    }),
    ...sceneRestructureAttributes,
    ...sceneClearMobjectAttributes,
    ...sceneRemoveAllExceptMobjectAttributes,
    ...sceneBringToFrontMobjectAttributes,
    ...sceneSendToBackMobjectAttributes,
    ...sceneAddMobjectAttributes,
    ...sceneReplaceMobjectAttributes,
    ...sceneRemoveMobjectAttributes,
    ...sceneRenderBatchAttributes,
    "data-viz-scene-render-group-count": String(snapshot.sceneRenderGroupCount),
    "data-viz-scene-render-group-ids": snapshot.sceneRenderGroupIds,
    "data-viz-scene-render-group-overlap-count": String(snapshot.sceneRenderGroupOverlapCount),
    "data-viz-scene-render-group-overlap-ids": snapshot.sceneRenderGroupOverlapIds,
    "data-viz-scene-renderable-count": String(snapshot.sceneRenderableCount),
    "data-viz-scene-renderable-ids": snapshot.sceneRenderableIds,
    "data-viz-scene-top-level-mobject-count": String(snapshot.sceneTopLevelMobjectCount),
    "data-viz-semantic-binding-count": String(snapshot.semanticBindingCount),
    "data-viz-semantic-binding-concept-ids": snapshot.semanticBindingConceptIds,
    "data-viz-semantic-binding-source-contract": snapshot.semanticBindingSourceContract,
    ...soundCueAttributes,
    "data-viz-tracker-count": String(snapshot.trackerCount),
    "data-viz-updater-active-count": String(snapshot.updaterActiveCount),
    "data-viz-updater-count": String(snapshot.updaterCount),
    "data-viz-updater-suspension-policy": snapshot.updaterSuspensionPolicy ?? UPDATER_SUSPENSION_POLICY,
    "data-viz-updater-suspension-source-contract":
      snapshot.updaterSuspensionSourceContract ?? UPDATER_SUSPENSION_SOURCE_CONTRACT,
    "data-viz-updater-suspended-count": String(snapshot.updaterSuspendedCount),
    "data-viz-vmobject-bezier-anchor-count": vmobjectBezierAttributes["data-viz-vmobject-bezier-anchor-count"],
    "data-viz-vmobject-bezier-cubic-segment-count": vmobjectBezierAttributes["data-viz-vmobject-bezier-cubic-segment-count"],
    "data-viz-vmobject-bezier-handle-count": vmobjectBezierAttributes["data-viz-vmobject-bezier-handle-count"],
    "data-viz-vmobject-bezier-path-count": vmobjectBezierAttributes["data-viz-vmobject-bezier-path-count"],
    "data-viz-vmobject-bezier-sample-count": vmobjectBezierAttributes["data-viz-vmobject-bezier-sample-count"],
    "data-viz-vmobject-bezier-segment-count": vmobjectBezierAttributes["data-viz-vmobject-bezier-segment-count"],
    "data-viz-vmobject-bezier-source-contract": vmobjectBezierAttributes["data-viz-vmobject-bezier-source-contract"],
    "data-viz-vmobject-bezier-summary": vmobjectBezierAttributes["data-viz-vmobject-bezier-summary"],
    ...vmobjectPathBuilderAttributes,
    ...vmobjectSmoothPathAttributes,
    ...vmobjectStyleAttributes
  } as const;
}

export function serializeMathSceneEvidenceSnapshot(snapshot: MathSceneEvidenceSnapshot) {
  return JSON.stringify(sortEvidenceSnapshotValue(snapshot), null, 2);
}

function sortEvidenceSnapshotValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortEvidenceSnapshotValue);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, sortEvidenceSnapshotValue(entry)])
  );
}
