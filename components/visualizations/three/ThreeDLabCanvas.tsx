"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type KeyboardEvent, type MouseEvent, type MutableRefObject, type SetStateAction } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { MathText } from "@/components/math/MathText";
import { MathFormulaOverlay } from "./manim/MathFormulaOverlay";
import { ALWAYS_METHOD_UPDATER_SOURCE_CONTRACT, buildAlwaysMethodUpdaterEvidence, serializeAlwaysMethodUpdaterEvidence, type AlwaysMethodUpdaterEvidence } from "./manim/mathAlwaysMethodUpdater";
import { ALWAYS_UPDATER_AUTHORING_SOURCE_CONTRACT, buildAlwaysUpdaterAuthoringCatalog, serializeAlwaysUpdaterAuthoringCatalog, type AlwaysUpdaterAuthoringCatalog } from "./manim/mathAlwaysRedraw";
import { ANIMATION_COMPOSITION_FRAME_SOURCE_CONTRACT, buildSceneAnimationCompositionPlans, serializeAnimationCompositionFrameEvidence, type AnimationCompositionFrameEvidence } from "./manim/mathAnimationComposition";
import { ANIMATION_LIFECYCLE_BEGIN_SOURCE_POLICY, ANIMATION_LIFECYCLE_SOURCE_CONTRACT, animationLifecycleDataAttributes, buildMathAnimationLifecyclePlan, serializeMathAnimationLifecyclePlan } from "./manim/mathAnimationLifecycle";
import { ANIMATION_RUNTIME_SOURCE_CONTRACT, MOBJECT_INTERPOLATE_DATA_SOURCE_SUMMARY, MOBJECT_INTERPOLATE_RENDER_POLICY, serializeMathAnimationRuntimeBoundingBoxEvidence, serializeMathAnimationRuntimeEvidence, serializeMathAnimationRuntimeInterpolateFieldEvidence, serializeMathAnimationRuntimeUniformEvidence, type MathAnimationRuntimeBoundingBoxEvidence, type MathAnimationRuntimeEvidence, type MathAnimationRuntimeInterpolateFieldEvidence, type MathAnimationRuntimeUniformEvidence } from "./manim/mathAnimationRuntime";
import { axisTickPlanDataAttributes, buildAxisTickPlan, serializeAxisTickPlan } from "./manim/mathAxisTicks";
import { cameraFrameAdapterForThree } from "./manim/mathCameraFrameAdapter";
import { buildCameraFramePayload, cameraFramePayloadDataAttributes, serializeCameraFramePayload } from "./manim/mathCameraFramePayload";
import { CAMERA_FRAME_UPDATER_SOURCE_CONTRACT, buildCameraFrameUpdaterPayload, serializeCameraFrameUpdaterPayload } from "./manim/mathCameraFrameUpdater";
import { buildSceneCreationPrimitivePlan, creationPrimitivePlanDataAttributes, summarizeSceneCreationPrimitivePlan } from "./manim/mathCreationPrimitives";
import { COORDINATE_SPACE_SOURCE_CONTRACT, buildCoordinateSpaceEvidence, serializeCoordinateSpaceEvidence, type CoordinateSpaceEvidence } from "./manim/mathCoordinateSpace";
import { buildCoordinateSystemEvidence, serializeCoordinateSystemEvidence, type CoordinateSystemEvidence } from "./manim/mathCoordinateSystem3D";
import { VMOBJECT_PARTIAL_CURVE_SOURCE_CONTRACT, VMOBJECT_PARTIAL_CURVE_VISIBILITY_POLICY } from "./manim/mathCurveObject";
import { buildActiveCurvePartialFrame, serializeCurvePartialFrame } from "./manim/mathCurvePartialEvidence";
import { buildDrawBorderThenFillEvidence, DRAW_BORDER_THEN_FILL_PHASE_POLICY, DRAW_BORDER_THEN_FILL_SOURCE_CONTRACT, drawBorderThenFillEvidenceDataAttributes, serializeDrawBorderThenFillEvidence } from "./manim/mathDrawBorderThenFillEvidence";
import { buildFadeGrowEvidence, FADE_GROW_PHASE_POLICY, FADE_GROW_SOURCE_CONTRACT, fadeGrowEvidenceDataAttributes, serializeFadeGrowEvidence } from "./manim/mathFadeGrowEvidence";
import { evidenceDataAttributes } from "./manim/mathEvidenceHarness";
import { buildFormulaOverlayCollisionDiagnostics, FORMULA_OVERLAY_COLLISION_SOURCE_CONTRACT, formulaOverlayCollisionDataAttributes, serializeFormulaOverlayCollisionDiagnostics } from "./manim/mathFormulaCollision";
import { FORMULA_BINDING_ANCHOR_SOURCE_CONTRACT } from "./manim/mathFormulaBindingAnchors";
import { FORMULA_BINDING_SOURCE_CONTRACT } from "./manim/mathFormulaBindings";
import {
  FORMULA_LAYER_SOURCE_CONTRACT,
  buildActiveProjectedLabelTextByObjectId,
  buildFormulaLayerState,
  emptyFormulaLayerProjectedLabelTextSummary,
  formulaLayerProjectedLabelTextDataAttributes,
  summarizeActiveProjectedLabelText
} from "./manim/mathFormulaLayer";
import { buildSceneIndicationPrimitivePlan, INDICATION_PRIMITIVE_SOURCE_CONTRACT, INDICATION_PRIMITIVE_STATE_POLICY, indicationPrimitivePlanDataAttributes, serializeSceneIndicationPrimitivePlan, summarizeSceneIndicationPrimitivePlan } from "./manim/mathIndicationPrimitives";
import { buildRuntimeIndicationOverlayFrames, runtimeIndicationOverlayActiveConceptId, runtimeIndicationOverlayDataAttributes, serializeRuntimeIndicationOverlayPayload, summarizeRuntimeIndicationOverlayFrames } from "./manim/mathRuntimeIndicationOverlay";
import { buildShowCreationEvidence, SHOW_CREATION_PARTIAL_POLICY, SHOW_CREATION_SOURCE_CONTRACT, serializeShowCreationEvidence, showCreationEvidenceDataAttributes } from "./manim/mathShowCreationEvidence";
import { buildMobjectAnchorEvidence, MOBJECT_ANCHOR_SOURCE_CONTRACT, serializeMobjectAnchorEvidence } from "./manim/mathMobjectAnchors";
import { MOBJECT_BOUNDING_BOX_SOURCE_CONTRACT, buildMobjectBoundingBoxTable, mobjectBoundingBoxDataAttributes, serializeMobjectBoundingBoxTable } from "./manim/mathMobjectBoundingBox";
import { buildMobjectCopyPlan, MOBJECT_COPY_SOURCE_CONTRACT, mobjectCopyPlanDataAttributes, serializeMobjectCopyPlan } from "./manim/mathMobjectCopyPlan";
import { MOBJECT_FAMILY_SOURCE_CONTRACT, buildMobjectFamilyIndex, serializeMobjectFamilyIndex, summarizeMobjectFamilies } from "./manim/mathMobjectFamily";
import {
  MOBJECT_FAMILY_CACHE_SOURCE_CONTRACT,
  buildMobjectFamilyCachePlan,
  serializeMobjectFamilyCachePlan,
  summarizeMobjectFamilyCachePlan
} from "./manim/mathMobjectFamilyCache";
import { buildMobjectArrangeLayoutPlan, MOBJECT_LAYOUT_SOURCE_CONTRACT, mobjectLayoutDataAttributes, serializeMobjectLayoutPlan } from "./manim/mathMobjectLayout";
import { buildMobjectRenderOrderPlan, mobjectRenderOrderDataAttributes, serializeMobjectRenderOrderPlan } from "./manim/mathMobjectRenderOrder";
import { MOBJECT_DATA_ARRAY_SOURCE_CONTRACT, buildMobjectDataTable, mobjectDataTableDataAttributes, serializeMobjectDataTable } from "./manim/mathMobjectDataArray";
import { buildMobjectDirtyStatePayload, mobjectDirtyStatePayloadDataAttributes, serializeMobjectDirtyStatePayload } from "./manim/mathMobjectDirtyStatePayload";
import { MOBJECT_INVALIDATION_SOURCE_CONTRACT, buildMobjectInvalidationPlan, serializeMobjectInvalidationPlan, summarizeMobjectInvalidation } from "./manim/mathMobjectInvalidation";
import { buildMobjectMaterialUniformEvidence, MOBJECT_MATERIAL_UNIFORM_SOURCE_CONTRACT, serializeMobjectMaterialUniformEvidence } from "./manim/mathMobjectMaterialUniforms";
import { buildMobjectUniformPayload, MOBJECT_UNIFORM_SOURCE_CONTRACT, serializeMobjectUniformPayload } from "./manim/mathMobjectUniforms";
import { buildMoveAlongVectorFieldPayloadForRuntimeState, MOVE_ALONG_VECTOR_FIELD_SOURCE_CONTRACT, serializeMoveAlongVectorFieldPayload } from "./manim/mathMoveAlongVectorField";
import { MOBJECT_POINT_CLOUD_SOURCE_CONTRACT, buildMobjectPointCloudTable, mobjectPointCloudDataAttributes, serializeMobjectPointCloudTable } from "./manim/mathMobjectPointCloud";
import { MOBJECT_POINT_GENERATION_SOURCE_CONTRACT } from "./manim/mathMobjectPointGeneration";
import { MOBJECT_POINT_TRANSFORM_SOURCE_CONTRACT } from "./manim/mathMobjectPointTransforms";
import { MANIM_CONFIG_DIGEST_SOURCE_CONTRACT } from "./manim/mathConfigDigest";
import { buildMobjectStatePayload, MOBJECT_STATE_SOURCE_CONTRACT, mobjectStatePayloadDataAttributes, serializeMobjectStatePayload } from "./manim/mathMobjectState";
import { buildMobjectStateRestoreBridgePlan, MOBJECT_STATE_RESTORE_BRIDGE_SOURCE_CONTRACT, mobjectStateRestoreBridgeDataAttributes, serializeMobjectStateRestoreBridgePlan } from "./manim/mathMobjectStateRestoreBridge";
import { buildMobjectMoveToTargetBridgePlan, MOBJECT_MOVE_TO_TARGET_BRIDGE_SOURCE_CONTRACT, mobjectMoveToTargetBridgeDataAttributes, serializeMobjectMoveToTargetBridgePlan } from "./manim/mathMobjectMoveToTargetBridge";
import { RUNTIME_SCENE_GRAPH_REFRESH_SOURCE_CONTRACT, runtimeGraphFrameDataAttributes, serializeMathSceneRuntimeGraphFrame } from "./manim/mathSceneRuntimeGraph";
import { SCENE_MEMBERSHIP_SOURCE_CONTRACT, SCENE_RESTRUCTURE_SOURCE_CONTRACT, serializeSceneGraphSummary, serializeSceneMembershipState, serializeSceneRestructurePlan, type MathSceneGraphSummary, type MathSceneMembershipState, type MathSceneRestructurePlan } from "./manim/mathSceneGraph";
import { SCENE_ADD_MOBJECT_BRIDGE_SOURCE_CONTRACT, serializeSceneAddMobjectBridgePlan, type MathSceneAddMobjectBridgePlan } from "./manim/mathSceneAddMobjectBridge";
import { SCENE_CLEAR_MOBJECT_BRIDGE_SOURCE_CONTRACT, serializeSceneClearMobjectBridgePlan, type MathSceneClearMobjectBridgePlan } from "./manim/mathSceneClearMobjectBridge";
import { SCENE_BRING_TO_FRONT_MOBJECT_BRIDGE_SOURCE_CONTRACT, serializeSceneBringToFrontMobjectBridgePlan, type MathSceneBringToFrontMobjectBridgePlan } from "./manim/mathSceneBringToFrontMobjectBridge";
import { SCENE_SEND_TO_BACK_MOBJECT_BRIDGE_SOURCE_CONTRACT, serializeSceneSendToBackMobjectBridgePlan, type MathSceneSendToBackMobjectBridgePlan } from "./manim/mathSceneSendToBackMobjectBridge";
import { SCENE_REMOVE_ALL_EXCEPT_MOBJECT_BRIDGE_SOURCE_CONTRACT, serializeSceneRemoveAllExceptMobjectBridgePlan, type MathSceneRemoveAllExceptMobjectBridgePlan } from "./manim/mathSceneRemoveAllExceptMobjectBridge";
import { SCENE_REPLACE_MOBJECT_BRIDGE_SOURCE_CONTRACT, serializeSceneReplaceMobjectBridgePlan, type MathSceneReplaceMobjectBridgePlan } from "./manim/mathSceneReplaceMobjectBridge";
import { SCENE_REMOVE_MOBJECT_BRIDGE_SOURCE_CONTRACT, serializeSceneRemoveMobjectBridgePlan, type MathSceneRemoveMobjectBridgePlan } from "./manim/mathSceneRemoveMobjectBridge";
import { buildMathSceneCapturePlan, capturePlanDataAttributes, SCENE_CAPTURE_SOURCE_CONTRACT, serializeMathSceneCapturePlan, type MathSceneCaptureKind, type MathSceneCaptureStatus } from "./manim/mathSceneCapture";
import { buildMathSceneRenderQualityPlan, MANIM_RENDER_QUALITY_SOURCE_CONTRACT, renderQualityDataAttributes, serializeMathSceneRenderQualityPlan, type MathSceneRenderQualityPreset } from "./manim/mathSceneRenderQuality";
import { buildMathSceneRenderQualityBridgePlan, MANIM_RENDER_QUALITY_BRIDGE_SOURCE_CONTRACT, renderQualityBridgeDataAttributes, serializeMathSceneRenderQualityBridgePlan } from "./manim/mathSceneRenderQualityBridge";
import { buildMathCheckpointPastePlan, checkpointPastePlanDataAttributes, SCENE_CHECKPOINT_PASTE_REPLAY_POLICY, SCENE_CHECKPOINT_PASTE_SOURCE_CONTRACT, serializeMathCheckpointPastePlan } from "./manim/mathCheckpointPastePlan";
import { buildApprovedSceneSpecExport, SCENE_EXPORT_SOURCE_CONTRACT, sceneSpecExportDataAttributes } from "./manim/mathSceneExport";
import { buildMathSceneFileWriterPlan, SCENE_FILE_WRITER_SOURCE_CONTRACT, sceneFileWriterDataAttributes, serializeMathSceneFileWriterPlan } from "./manim/mathSceneFileWriterPlan";
import { buildSceneFileWriterSegmentPlan, SCENE_FILE_WRITER_SEGMENT_SOURCE_CONTRACT, sceneFileWriterSegmentDataAttributes, serializeSceneFileWriterSegmentPlan } from "./manim/mathSceneFileWriterSegments";
import { buildScenePlaybackFileWriterBridgePlan, SCENE_PLAYBACK_FILE_WRITER_BRIDGE_SOURCE_CONTRACT, scenePlaybackFileWriterBridgeDataAttributes, serializeScenePlaybackFileWriterBridgePlan } from "./manim/mathScenePlaybackFileWriterBridge";
import { buildSceneFileWriterCombinePlan, SCENE_FILE_WRITER_COMBINE_SOURCE_CONTRACT, sceneFileWriterCombineDataAttributes, serializeSceneFileWriterCombinePlan } from "./manim/mathSceneFileWriterCombinePlan";
import { buildCheckpointPasteFileWriterBridgePlan, checkpointPasteFileWriterBridgeDataAttributes, checkpointPasteFileWriterSegmentInput, SCENE_CHECKPOINT_PASTE_FILE_WRITER_BRIDGE_SOURCE_CONTRACT, serializeCheckpointPasteFileWriterBridgePlan } from "./manim/mathCheckpointPasteFileWriterBridge";
import { SCENE_FRAME_AUDIT_SOURCE_CONTRACT, SCENE_FRAME_DIRECTOR_TRACE_SOURCE_CONTRACT, buildMathSceneFrameAudit, frameAuditDataAttributes, serializeMathSceneFrameAuditSummary, summarizeMathSceneFrameAudit } from "./manim/mathSceneFrameAudit";
import { frameStepDataAttributes, SCENE_FRAME_STEPPER_SOURCE_CONTRACT, serializeMathSceneFrameStepCapture, stepMathSceneFrame, type MathSceneFrameStep } from "./manim/mathSceneFrameStepper";
import { SCENE_HISTORY_BRANCH_POLICY, SCENE_HISTORY_SOURCE_CONTRACT, buildSceneHistoryManifest, createSceneHistoryStore, pushSceneHistory, redoSceneHistory, sceneHistoryDataAttributes, serializeSceneHistoryManifest, summarizeSceneHistory, undoSceneHistory, type MathSceneHistoryStore } from "./manim/mathSceneHistory";
import { SCENE_INITIALIZATION_SOURCE_CONTRACT, serializeMathSceneInitializationEvidence, type MathSceneInitializationEvidence } from "./manim/mathSceneInitialization";
import { SCENE_RENDER_BATCH_SOURCE_CONTRACT, serializeSceneRenderBatchPlan, type MathSceneRenderBatchPlan } from "./manim/mathSceneRenderBatches";
import { SCENE_SMOKE_HOOK_SOURCE_CONTRACT, buildMathSceneSmokeHookManifest, sceneSmokeHookDataAttributes, serializeMathSceneSmokeHookManifest } from "./manim/mathSceneSmokeHook";
import { buildMathSceneStateSnapshot, SCENE_STATE_SNAPSHOT_SOURCE_CONTRACT, sceneStateSnapshotDataAttributes, serializeMathSceneStateSnapshot } from "./manim/mathSceneStateSnapshot";
import { CAMERA_SHOT_AUTHORING_SOURCE_CONTRACT, buildCameraShotCatalog, cameraShotCatalogDataAttributes, serializeCameraShotCatalog, summarizeCameraShotCatalog } from "./manim/mathCameraShotAuthoring";
import { CAMERA_DIRECTOR_SOURCE_CONTRACT, serializeCameraDirectorEvidence, type CameraDirectorEvidence } from "./manim/mathCameraDirector";
import { buildParameterPanelCatalog, parameterPanelDataAttributes, serializeParameterPanelCatalog, summarizeParameterPanelCatalog } from "./manim/mathParameterPanel";
import { buildMathSceneAnimatePlans } from "./manim/mathSceneAnimationPlans";
import {
  buildMathSceneSelectorCatalogEntry,
  mathSceneSelectorDataAttributes,
  summarizeMathSceneSelectorCatalog,
  type MathSceneSelectorCatalogEntry
} from "./manim/mathSceneSelectorCatalog";
import { maisManimFamilyIds } from "./manim/mathSceneRegistry";
import { buildMathSceneSpecForThreeDFamily } from "./manim/mathSceneRegistry";
import { SCENE_PLAY_COMPILATION_PREPARE_POLICY, SCENE_PLAY_COMPILATION_SOURCE_CONTRACT, buildScenePlayCompilationPlan, serializeScenePlayCompilationPlan } from "./manim/mathScenePlayCompilation";
import { SCENE_BEGIN_ANIMATIONS_SOURCE_CONTRACT, SCENE_BEGIN_ANIMATIONS_START_STATE_POLICY, buildSceneBeginAnimationsPlan, serializeSceneBeginAnimationsPlan } from "./manim/mathSceneBeginAnimations";
import { SCENE_FINISH_ANIMATIONS_CLEANUP_POLICY, SCENE_FINISH_ANIMATIONS_RESUME_POLICY, SCENE_FINISH_ANIMATIONS_SOURCE_CONTRACT, buildSceneFinishAnimationsPlan, serializeSceneFinishAnimationsPlan } from "./manim/mathSceneFinishAnimations";
import { SCENE_PRE_PLAY_SKIP_GATE_POLICY, SCENE_PRE_PLAY_SOURCE_CONTRACT, buildScenePrePlayControlPlan, serializeScenePrePlayControlPlan } from "./manim/mathScenePrePlayControl";
import { SCENE_POST_PLAY_PREVIEW_POLICY, SCENE_POST_PLAY_SOURCE_CONTRACT, buildScenePostPlayPreviewPlan, serializeScenePostPlayPreviewPlan } from "./manim/mathScenePostPlayPreview";
import { SCENE_POST_CELL_COMMENT_LABEL_POLICY, SCENE_POST_CELL_REDRAW_POLICY, SCENE_POST_CELL_REDRAW_SOURCE_CONTRACT, buildScenePostCellRedrawPlan, serializeScenePostCellRedrawPlan } from "./manim/mathScenePostCellRedraw";
import { SCENE_SHORTCUT_AUTHORING_POLICY, SCENE_SHORTCUT_CATALOG_SOURCE_CONTRACT, buildSceneShortcutCatalog, serializeSceneShortcutCatalog } from "./manim/mathSceneShortcutCatalog";
import { SCENE_RELOAD_RESET_POLICY, SCENE_RELOAD_SOURCE_CONTRACT, buildSceneReloadPlan, serializeSceneReloadPlan } from "./manim/mathSceneReloadPlan";
import { SCENE_RUN_FROM_BEAT_CHECKPOINT_POLICY, SCENE_RUN_FROM_BEAT_COMPOSITION_REPLAY_POLICY, SCENE_RUN_FROM_BEAT_REPLAY_POLICY, SCENE_RUN_FROM_BEAT_SOURCE_CONTRACT, buildSceneRunFromBeatPlan, sceneRunFromBeatDataAttributes, serializeSceneRunFromBeatPlan } from "./manim/mathSceneRunFromBeat";
import { SCENE_SKIPPING_WINDOW_GATE_POLICY, SCENE_SKIPPING_WINDOW_SOURCE_CONTRACT, buildSceneSkippingWindowPlan, serializeSceneSkippingWindowPlan } from "./manim/mathSceneSkippingWindow";
import { SCENE_SKIP_CONTROL_SOURCE_CONTRACT, SCENE_SKIP_CONTROL_STATE_POLICY, buildSceneSkipControlPlan, serializeSceneSkipControlPlan } from "./manim/mathSceneSkipControl";
import { SCENE_PROGRESS_CONTROL_SOURCE_CONTRACT, SCENE_PROGRESS_CONTROL_STATE_POLICY, buildSceneProgressControlPlan, serializeSceneProgressControlPlan } from "./manim/mathSceneProgressControl";
import { SCENE_INTERACT_LOOP_SOURCE_CONTRACT, SCENE_INTERACT_LOOP_STATE_POLICY, buildSceneInteractLoopPlan, serializeSceneInteractLoopPlan } from "./manim/mathSceneInteractLoop";
import { buildSceneRunInteractBridgePlan, SCENE_RUN_INTERACT_BRIDGE_SOURCE_CONTRACT, sceneRunInteractBridgeDataAttributes, serializeSceneRunInteractBridgePlan } from "./manim/mathSceneRunInteractBridge";
import { SCENE_FLOOR_PLANE_SOURCE_CONTRACT, buildSceneFloorPlanePlan, serializeSceneFloorPlanePlan } from "./manim/mathSceneFloorPlane";
import { SCENE_KEY_CONTROL_SOURCE_CONTRACT, buildSceneKeyControlPlan, serializeSceneKeyControlPlan } from "./manim/mathSceneKeyControls";
import { SCENE_PICKING_SOURCE_CONTRACT, serializeScenePickResult, type MathScenePickResult } from "./manim/mathScenePicking";
import { SCENE_POINTER_CONTROL_SOURCE_CONTRACT, buildScenePointerControlPlan, serializeScenePointerControlPlan } from "./manim/mathScenePointerControls";
import { SCENE_WINDOW_EVENT_SOURCE_CONTRACT, buildSceneWindowEventPlan, serializeSceneWindowEventPlan } from "./manim/mathSceneWindowEvents";
import { SCENE_UPDATE_POLICY_SOURCE_CONTRACT, serializeSceneUpdatePolicy } from "./manim/mathSceneUpdatePolicy";
import { SCENE_UPDATE_FRAME_FRAME_POLICY, SCENE_UPDATE_FRAME_SOURCE_CONTRACT, buildSceneUpdateFramePlan, serializeSceneUpdateFramePlan } from "./manim/mathSceneUpdateFrame";
import { SCENE_EMIT_FRAME_SOURCE_CONTRACT, SCENE_EMIT_FRAME_WRITE_POLICY, buildSceneEmitFramePlan, serializeSceneEmitFramePlan } from "./manim/mathSceneEmitFrame";
import { PROGRESS_THROUGH_ANIMATIONS_FRAME_POLICY, PROGRESS_THROUGH_ANIMATIONS_SOURCE_CONTRACT, PROGRESS_THROUGH_ANIMATIONS_UPDATE_MOBJECTS_POLICY, buildSceneProgressThroughAnimationsPlan, serializeSceneProgressThroughAnimationsPlan } from "./manim/mathSceneProgressThroughAnimations";
import { SCENE_TIME_PROGRESSION_SAMPLING_POLICY, SCENE_TIME_PROGRESSION_SOURCE_CONTRACT, buildSceneTimeProgression, serializeSceneTimeProgression } from "./manim/mathSceneTimeProgression";
import { SCENE_WAIT_CONTROL_FRAME_POLICY, SCENE_WAIT_CONTROL_SOURCE_CONTRACT, SCENE_WAIT_CONTROL_UPDATER_POLICY, buildSceneWaitControl, serializeSceneWaitControlPlan } from "./manim/mathSceneWaitControl";
import { SCENE_WAIT_FRAME_STEPPER_BRIDGE_SOURCE_CONTRACT } from "./manim/mathSceneWaitFrameStepperBridge";
import { SCENE_PRESENTER_HOLD_SOURCE_CONTRACT, serializeScenePresenterHoldPlan } from "./manim/mathScenePresenterHold";
import { buildScenePlaybackPlan, elapsedSecondsForPlaybackBeat, finalElapsedSecondsForPlaybackPlan, serializeScenePlaybackPlan, SCENE_PLAYBACK_SOURCE_CONTRACT, type PlaybackPlanStep } from "./manim/mathScenePlayback";
import { SCENE_RUN_LIFECYCLE_SOURCE_CONTRACT, buildMathSceneRunLifecyclePlan, sceneRunLifecycleDataAttributes, serializeMathSceneRunLifecyclePlan } from "./manim/mathSceneRunLifecycle";
import { buildSceneRunFileWriterFinishBridgePlan, SCENE_RUN_FILE_WRITER_FINISH_BRIDGE_SOURCE_CONTRACT, sceneRunFileWriterFinishBridgeDataAttributes, serializeSceneRunFileWriterFinishBridgePlan } from "./manim/mathSceneRunFileWriterFinishBridge";
import { SCENE_SOUND_CUE_SOURCE_CONTRACT, buildSceneSoundCuePlan, serializeSceneSoundCuePlan } from "./manim/mathSceneSoundCue";
import { SURFACE_OBJECT_SOURCE_CONTRACT, buildSurfaceObjectEvidence, buildSurfaceObjectsForScene, serializeSurfaceObjectPayload } from "./manim/mathSurfaceObject";
import { ODE_TRAJECTORY_SOURCE_CONTRACT, buildSceneOdeTrajectories, serializeOdeTrajectoryPayload, summarizeOdeTrajectories } from "./manim/mathOdeTrajectory";
import { ODE_TRAJECTORY_OBJECT_BRIDGE_SOURCE_CONTRACT, buildOdeTrajectoryObjectBridgeEvidence, buildOdeTrajectoryObjectSpecs, serializeOdeTrajectoryObjectBridgePayload } from "./manim/mathOdeTrajectoryObjects";
import {
  STREAM_LINE_FRAME_PLAN_SOURCE_CONTRACT,
  STREAM_LINE_SOURCE_CONTRACT,
  buildSceneStreamLines,
  serializeStreamLinePayload,
  summarizeSceneStreamLines
} from "./manim/mathStreamLineObjects";
import { TRACING_TAIL_SOURCE_CONTRACT, buildTracingTailEvidence, buildTracingTailEvidenceEntriesForScene, serializeTracingTailEvidencePayload } from "./manim/mathTracingTail";
import { TIMELINE_FOCUS_TARGET_POLICY, TIMELINE_SOURCE_CONTRACT, serializeTimelineEvidence, timelineFocusTargetIds, type MathTimelineEvidence } from "./manim/mathTimeline";
import { LAG_RATIO_SOURCE_CONTRACT, LAG_RATIO_SUB_ALPHA_POLICY, serializeLagRatioCatalog, type MathLagRatioCatalog } from "./manim/mathLagRatios";
import { RATE_FUNCTION_ALPHA_POLICY, RATE_FUNCTION_SOURCE_CONTRACT, serializeRateFunctionCatalog, type MathRateFunctionCatalog } from "./manim/mathRateFunctions";
import { SUB_ALPHA_SOURCE_CONTRACT, SUB_ALPHA_WINDOW_POLICY, serializeSubAlphaSchedule, type MathSubAlphaSchedule } from "./manim/mathSubAlphaSchedule";
import { buildMathTexCacheManifest, serializeMathTexCacheManifest, TEX_CACHE_MANIFEST_SOURCE_CONTRACT, texCacheManifestDataAttributes } from "./manim/mathTexCacheManifest";
import { buildMathTexCompilePipeline, serializeMathTexCompilePipeline, TEX_COMPILE_PIPELINE_SOURCE_CONTRACT, texCompilePipelineDataAttributes } from "./manim/mathTexCompilePipeline";
import { buildTexColorMap, serializeTexColorMap, TEX_COLOR_MAP_SOURCE_CONTRACT, texColorMapDataAttributes } from "./manim/mathTexColorMap";
import { TEX_COLORIZED_FORMULA_SOURCE_CONTRACT } from "./manim/mathTexColorizedFormula";
import { buildTexIsolationEvidence, serializeTexIsolationEvidence, TEX_ISOLATION_SOURCE_CONTRACT, texIsolationEvidenceDataAttributes } from "./manim/mathTexIsolation";
import { buildFormulaSvgMorphEvidence, formulaSvgMorphEvidenceDataAttributes } from "./manim/mathFormulaSvgMorphEvidence";
import { FORMULA_SVG_MORPH_RUNTIME_SOURCE_CONTRACT, buildFormulaSvgMorphRuntime, formulaSvgMorphRuntimeDataAttributes } from "./manim/mathFormulaSvgMorphRuntime";
import { SVG_PATH_MORPH_SOURCE_CONTRACT } from "./manim/mathSvgPathMorph";
import { ANIMATION_BUILDER_SOURCE_CONTRACT, buildMathAnimateBuilderCatalog, serializeMathAnimateBuilderCatalog, type MathAnimateBuilderCatalog } from "./manim/mathAnimationBuilder";
import { RUNTIME_RENDER_STATE_SOURCE_CONTRACT } from "./manim/mathRuntimeRenderState";
import { TRANSFORM_BEGIN_SOURCE_POLICY, buildMathTransformBeginPlan, serializeMathTransformBeginPlan, transformBeginPlanDataAttributes } from "./manim/mathTransformBeginPlan";
import { TRANSFORM_DATA_LOCK_SOURCE_CONTRACT, serializeTransformDataLockEvidence, type TransformDataLockEvidence } from "./manim/mathTransformDataLock";
import {
  TRANSFORM_FAMILY_ALIGNMENT_POINT_COUNT_POLICY,
  TRANSFORM_FAMILY_ALIGNMENT_SOURCE_CONTRACT,
  TRANSFORM_FAMILY_ALIGNMENT_ZIP_POLICY,
  serializeTransformFamilyAlignmentPlan,
  type TransformFamilyAlignmentPlan
} from "./manim/mathTransformFamilyAlignment";
import {
  buildTransformPointAlignmentBridgePlan,
  serializeTransformPointAlignmentBridgePlan,
  TRANSFORM_POINT_ALIGNMENT_BRIDGE_SOURCE_CONTRACT,
  transformPointAlignmentBridgeDataAttributes,
  type TransformPointAlignmentBridgePlan
} from "./manim/mathTransformPointAlignmentBridge";
import { TRANSFORM_MATCHING_SOURCE_CONTRACT, buildTransformMatchingPlan, serializeTransformMatchingPlan, transformMatchingDataAttributes } from "./manim/mathTransformMatching";
import { TRANSFORM_PATH_FUNCTION_SOURCE_CONTRACT, TRANSFORM_PATH_NON_POINT_FIELD_POLICY, TRANSFORM_PATH_POINTLIKE_FIELD_POLICY, serializeTransformPathFunctionCatalog, type TransformPathFunctionCatalog } from "./manim/mathPathFunctions";
import { buildMathUpdaterExecutionPlan, MOBJECT_UPDATE_SOURCE_CONTRACT, serializeMathUpdaterExecutionPlan, updaterExecutionPlanDataAttributes } from "./manim/mathUpdaterExecutionPlan";
import { buildMathUpdaterSignaturePlan, serializeMathUpdaterSignaturePlan, updaterSignatureDataAttributes } from "./manim/mathUpdaterSignature";
import { UPDATER_SUSPENSION_POLICY, UPDATER_SUSPENSION_SOURCE_CONTRACT, buildUpdaterSuspensionPlan, serializeUpdaterSuspensionPlan } from "./manim/mathUpdaterSuspension";
import { VALUE_TRACKER_SOURCE_CONTRACT, buildMathValueTrackerPayload, serializeMathValueTrackerPayload, valueTrackerPayloadDataAttributes } from "./manim/mathValueTrackerPayload";
import { VMOBJECT_BEZIER_PATH_SOURCE_CONTRACT } from "./manim/mathVMobjectBezierPath";
import { VMOBJECT_PATH_BUILDER_SOURCE_CONTRACT } from "./manim/mathVMobjectPathBuilder";
import { VMOBJECT_SMOOTH_PATH_SOURCE_CONTRACT } from "./manim/mathVMobjectSmoothPath";
import { VMOBJECT_LINE_RENDER_SOURCE_CONTRACT, VMOBJECT_SURFACE_FILL_RENDER_SOURCE_CONTRACT } from "./manim/mathVMobjectRenderStyle";
import { VECTOR_FIELD_SOURCE_CONTRACT, buildSceneVectorFields, serializeVectorFieldPayload, summarizeSceneVectorFields } from "./manim/mathVectorFieldObjects";
import { ThreeDLabSceneRegistry } from "./ThreeDLabSceneRegistry";
import { ThreeDSceneBoundaryProbe } from "./ThreeDSceneBoundaryProbe";
import { formatThreeDCanvasCameraState, threeDCanvasCameraContract } from "./threeDCanvasCameraContract";
import { formulaForThreeDScene } from "./threeDCanvasContract";
import { threeDCanvasLightingContract } from "./threeDCanvasLightingContract";
import { threeDCanvasRendererContract } from "./threeDCanvasRendererContract";
import { threeDCanvasWebGLContract } from "./threeDCanvasWebGLContract";
import { sceneVariantForThreeDFamily } from "./threeDSceneMath";
import { threeDSceneVariantMetadata } from "./threeDSceneVariantMetadata";
import type { ThreeDFamilyId, ThreeDLabCanvasProps } from "./threeDSceneTypes";
import { CAMERA_FRAME_POINT_ROUNDTRIP_SOURCE_CONTRACT, CAMERA_FRAME_SOURCE_CONTRACT } from "./manim/mathCameraFrame";
import type { CameraFrameState } from "./manim/mathCameraFrame";
import {
  buildSceneCheckpointStoreManifest,
  createCheckpointStore,
  listCheckpointKeys,
  restoreCheckpoint,
  SCENE_CHECKPOINT_STORE_SOURCE_CONTRACT,
  saveCheckpoint,
  sceneCheckpointStoreDataAttributes,
  serializeSceneCheckpointStoreManifest,
  type SceneCheckpointStore
} from "./manim/mathSceneCheckpoint";
import type { MathSceneSpec } from "./manim/mathSceneTypes";
import { PROJECTED_LABEL_SOURCE_CONTRACT, buildProjectedLabelAnchorsFromRuntimeState, serializeProjectedLabelAnchors, summarizeProjectedLabelAnchors, type ProjectionViewport } from "./manim/mathProjectedLabels";

type ManimAuthoringMode = "playback" | "run-from-beat" | "show-final";
type ManimCameraMode = "guided" | "explore";
type ManimPlaybackState = "playing" | "paused" | "scrubbing" | "checkpoint";

type ManimCheckpointState = {
  cameraMode: ManimCameraMode;
  elapsedSeconds: number;
  playbackState: ManimPlaybackState;
  sceneId: string;
};

function initialManimCheckpointState(sceneId: string): ManimCheckpointState {
  return {
    cameraMode: "guided",
    elapsedSeconds: 0,
    playbackState: "playing",
    sceneId
  };
}

const cameraTarget = new THREE.Vector3(
  threeDCanvasCameraContract.cameraTarget.x,
  threeDCanvasCameraContract.cameraTarget.y,
  threeDCanvasCameraContract.cameraTarget.z
);

function canUseWebGL() {
  if (typeof window === "undefined" || typeof document === "undefined") return false;

  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl2") || canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

function formatCameraState(camera: THREE.Camera) {
  const position = camera.position.clone().sub(cameraTarget);
  const spherical = new THREE.Spherical().setFromVector3(position);
  const azimuthDegrees = THREE.MathUtils.radToDeg(spherical.theta);
  const elevationDegrees = 90 - THREE.MathUtils.radToDeg(spherical.phi);
  return formatThreeDCanvasCameraState({
    azimuthDegrees,
    distance: spherical.radius,
    elevationDegrees
  });
}

function defaultCameraPosition() {
  const { defaultCamera } = threeDCanvasCameraContract;
  const spherical = new THREE.Spherical(
    defaultCamera.distance,
    THREE.MathUtils.degToRad(90 - defaultCamera.elevationDegrees),
    THREE.MathUtils.degToRad(defaultCamera.azimuthDegrees)
  );

  return new THREE.Vector3().setFromSpherical(spherical).add(cameraTarget);
}

type ProjectionCamera = THREE.Camera & {
  fov?: number;
  updateProjectionMatrix?: () => void;
};

function updateCameraProjection(camera: THREE.Camera, fov: number) {
  const projectionCamera = camera as ProjectionCamera;
  if (typeof projectionCamera.fov === "number") projectionCamera.fov = fov;
  projectionCamera.updateProjectionMatrix?.();
}

function CameraContract({
  manimCameraMode,
  manimCameraFrame,
  onUserExplore,
  onCameraState,
  resetSignal
}: {
  manimCameraMode?: ManimCameraMode | null;
  manimCameraFrame?: CameraFrameState | null;
  onUserExplore?: () => void;
  onCameraState: (value: string) => void;
  resetSignal: number;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  const resetCamera = useCallback(() => {
    camera.position.copy(defaultCameraPosition());
    camera.lookAt(cameraTarget);
    updateCameraProjection(camera, threeDCanvasCameraContract.defaultCamera.fov);
    controlsRef.current?.target.copy(cameraTarget);
    controlsRef.current?.update();
    onCameraState(formatCameraState(camera));
  }, [camera, onCameraState]);

  const applyManimCameraFrame = useCallback((manimCameraFrame: CameraFrameState) => {
    const adaptedFrame = cameraFrameAdapterForThree(manimCameraFrame);
    const adaptedTarget = new THREE.Vector3(adaptedFrame.target.x, adaptedFrame.target.y, adaptedFrame.target.z);

    camera.position.set(adaptedFrame.position.x, adaptedFrame.position.y, adaptedFrame.position.z);
    camera.lookAt(adaptedTarget);
    updateCameraProjection(camera, adaptedFrame.fov);
    controlsRef.current?.target.set(adaptedFrame.target.x, adaptedFrame.target.y, adaptedFrame.target.z);
    controlsRef.current?.update();
  }, [camera]);

  const reportOrbitCameraState = useCallback(() => {
    if (manimCameraMode === "guided" && manimCameraFrame) return;
    onCameraState(formatCameraState(camera));
  }, [camera, manimCameraFrame, manimCameraMode, onCameraState]);

  useEffect(() => {
    if (manimCameraFrame) {
      applyManimCameraFrame(manimCameraFrame);
      return;
    }

    if (manimCameraMode === "explore") return;

    resetCamera();
  }, [applyManimCameraFrame, manimCameraFrame, manimCameraMode, resetCamera, resetSignal]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping={threeDCanvasCameraContract.orbitBounds.enableDamping}
      enablePan={threeDCanvasCameraContract.orbitBounds.enablePan}
      makeDefault
      maxDistance={threeDCanvasCameraContract.orbitBounds.maxDistance}
      maxPolarAngle={THREE.MathUtils.degToRad(threeDCanvasCameraContract.orbitBounds.maxPolarAngleDegrees)}
      minDistance={threeDCanvasCameraContract.orbitBounds.minDistance}
      minPolarAngle={THREE.MathUtils.degToRad(threeDCanvasCameraContract.orbitBounds.minPolarAngleDegrees)}
      target={cameraTarget}
      onStart={onUserExplore}
      onChange={reportOrbitCameraState}
    />
  );
}

function ReadySignal({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    const frame = window.requestAnimationFrame(onReady);
    return () => window.cancelAnimationFrame(frame);
  }, [onReady]);

  return null;
}

function labelForManimBeat(play: PlaybackPlanStep) {
  const prefix = `Beat ${play.playIndex + 1}`;

  switch (play.step.type) {
    case "cameraTo":
      return `${prefix}: camera ${play.step.shotId}`;
    case "highlight":
      return `${prefix}: highlight ${play.step.conceptId}`;
    case "moveAlongPath":
      return `${prefix}: move ${play.step.objectId}`;
    case "revealCurve":
      return `${prefix}: reveal ${play.step.objectId}`;
    case "transformObject":
      return `${prefix}: transform ${play.step.objectId}`;
    case "revealSurface":
      return `${prefix}: surface ${play.step.objectId}`;
    case "wait":
      return `${prefix}: wait`;
    default:
      return prefix;
  }
}

function clampManimBeatIndex(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function manimCompositionWindowSummary(
  windows: ReturnType<typeof buildSceneAnimationCompositionPlans>[number]["windows"]
) {
  return windows.map((window) =>
    `${window.animationPlanId}@${window.startSeconds.toFixed(3)}..${window.endSeconds.toFixed(3)}:0.000`
  ).join("|") || "none";
}

function manimRunFromBeatCompositionReplay(
  scene: MathSceneSpec | null,
  requestedBeatIndex: number
) {
  if (!scene || scene.timeline.length === 0) return undefined;

  const normalizedBeatIndex = clampManimBeatIndex(requestedBeatIndex, 0, scene.timeline.length - 1);
  const step = scene.timeline[normalizedBeatIndex];
  if (step?.type !== "animationComposition") return undefined;

  const compositionPlan = buildSceneAnimationCompositionPlans(scene).find((plan) => plan.id === step.compositionId);
  if (!compositionPlan) return undefined;

  return {
    compositionId: compositionPlan.id,
    compositionType: compositionPlan.type,
    windowIds: compositionPlan.windows.map((window) => window.animationPlanId),
    windowSummary: manimCompositionWindowSummary(compositionPlan.windows)
  };
}

function ManimRuntimeClock({
  elapsedSeconds,
  formulaLayerViewport,
  frameIndex,
  playing,
  previousRuntimeStateRef,
  reducedMotion,
  scene,
  setElapsedSeconds,
  setFrameStep,
  setFrameIndex
}: {
  elapsedSeconds: number;
  formulaLayerViewport: ProjectionViewport;
  frameIndex: number;
  playing: boolean;
  previousRuntimeStateRef: MutableRefObject<MathSceneFrameStep["runtimeState"] | null>;
  reducedMotion: boolean;
  scene: MathSceneSpec;
  setElapsedSeconds: Dispatch<SetStateAction<number>>;
  setFrameStep: Dispatch<SetStateAction<MathSceneFrameStep | null>>;
  setFrameIndex: Dispatch<SetStateAction<number>>;
}) {
  useEffect(() => {
    setElapsedSeconds(0);
    setFrameStep(null);
    setFrameIndex(0);
    previousRuntimeStateRef.current = null;
  }, [previousRuntimeStateRef, scene.sceneId, setElapsedSeconds, setFrameIndex, setFrameStep]);

  useFrame((_, delta) => {
    if (!playing) return;

    const nextFrameIndex = frameIndex + 1;
    const frame = stepMathSceneFrame(scene, {
      deltaSeconds: delta,
      elapsedSeconds,
      formulaLayerViewport,
      frameIndex: nextFrameIndex,
      previousRuntimeState: previousRuntimeStateRef.current?.sceneId === scene.sceneId
        ? previousRuntimeStateRef.current
        : undefined,
      reducedMotion
    });
    const totalDuration = frame.runtimeState.timeline.totalDuration;
    const wrappedElapsedSeconds = reducedMotion || totalDuration === 0 ? frame.preciseElapsedSeconds : frame.preciseElapsedSeconds % totalDuration;
    const nextFrame = wrappedElapsedSeconds === frame.preciseElapsedSeconds
      ? frame
      : stepMathSceneFrame(scene, {
          deltaSeconds: 0,
          elapsedSeconds: wrappedElapsedSeconds,
          formulaLayerViewport,
          frameIndex: nextFrameIndex,
          reducedMotion
        });

    previousRuntimeStateRef.current = nextFrame.runtimeState;
    setFrameStep(nextFrame);
    setElapsedSeconds(nextFrame.preciseElapsedSeconds);
    setFrameIndex(nextFrameIndex);
  });

  return null;
}

function CanvasRenderQualityBridge({
  background,
  backgroundAlpha,
  onReady,
  transparentBackground
}: {
  background: THREE.Color;
  backgroundAlpha: number;
  onReady: () => void;
  transparentBackground: boolean;
}) {
  const { gl, scene } = useThree();

  useEffect(() => {
    scene.background = transparentBackground ? null : background;
    gl.setClearColor(background, backgroundAlpha);
    onReady();
  }, [background, backgroundAlpha, gl, onReady, scene, transparentBackground]);

  return null;
}

export function ThreeDLabCanvas({
  accent,
  coverageTier = "standard-3d",
  fallback,
  label,
  onCanvasReady,
  // Learner-safe by default. The authoring harness (27-family scene selector,
  // checkpoint paste/save/restore, render-quality/capture, undo/redo, timeline
  // scrubber) is Manim tooling, not curriculum: a learner who switches the
  // scene keeps the original topic's formula strip, so the lab silently stops
  // teaching its topic. Surfaces that genuinely author scenes opt in with
  // presentation="authoring"; every student-facing surface inherits this.
  presentation = "learner",
  premiumLaunch = false,
  regionalPriority,
  runtime = "primitive",
  state
}: ThreeDLabCanvasProps) {
  const showAuthoringControls = presentation === "authoring";
  const presentationResetPlaybackState: ManimPlaybackState = presentation === "learner" ? "paused" : "playing";
  const [canvasReady, setCanvasReady] = useState(false);
  const [cameraState, setCameraState] = useState(formatThreeDCanvasCameraState(threeDCanvasCameraContract.defaultCamera));
  const [manimAuthoringMode, setManimAuthoringMode] = useState<ManimAuthoringMode>("playback");
  const [manimCameraMode, setManimCameraMode] = useState<ManimCameraMode>("guided");
  const [manimCaptureByteCount, setManimCaptureByteCount] = useState(0);
  const [manimCaptureKind, setManimCaptureKind] = useState<MathSceneCaptureKind>("screenshot");
  const [manimCaptureRequestCount, setManimCaptureRequestCount] = useState(0);
  const [manimCaptureStatus, setManimCaptureStatus] = useState<MathSceneCaptureStatus>("planned");
  const [manimRenderQualityPreset, setManimRenderQualityPreset] = useState<MathSceneRenderQualityPreset>("interactive");
  const [manimRenderTransparentBackground, setManimRenderTransparentBackground] = useState(false);
  const [manimCheckpointStore, setManimCheckpointStore] = useState<SceneCheckpointStore<ManimCheckpointState>>(() => createCheckpointStore<ManimCheckpointState>());
  const [manimCheckpointPasteText, setManimCheckpointPasteText] = useState("");
  const [manimElapsedSeconds, setManimElapsedSeconds] = useState(0);
  const [manimFormulaOverlayViewport, setManimFormulaOverlayViewport] = useState<ProjectionViewport>({ width: 800, height: 450 });
  const [manimFormulaOverlayViewportSource, setManimFormulaOverlayViewportSource] = useState<"fallback" | "measured">("fallback");
  const [manimFrameIndex, setManimFrameIndex] = useState(0);
  const [steppedManimFrameStep, setSteppedManimFrameStep] = useState<MathSceneFrameStep | null>(null);
  const [manimHistoryStore, setManimHistoryStore] = useState<MathSceneHistoryStore<ManimCheckpointState>>(() =>
    createSceneHistoryStore(initialManimCheckpointState(`primitive-${state.familyId}`), { label: "initial" })
  );
  const [manimPlaybackState, setManimPlaybackState] = useState<ManimPlaybackState>("paused");
  const [manimRunFromBeatIndex, setManimRunFromBeatIndex] = useState(0);
  const [manimSelectedSceneFamilyId, setManimSelectedSceneFamilyId] = useState<ThreeDFamilyId>(state.familyId);
  const [manimSelectedParameterId, setManimSelectedParameterId] = useState("value");
  const [resetSignal, setResetSignal] = useState(0);
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);

  useEffect(() => {
    if (canvasReady) onCanvasReady?.();
  }, [canvasReady, onCanvasReady]);
  const hasCreatedCanvasRef = useRef(false);
  const previousManimRuntimeStateRef = useRef<MathSceneFrameStep["runtimeState"] | null>(null);
  const readyFrameRef = useRef<number | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const webglCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeSceneFamilyId = runtime === "mais-manim" ? manimSelectedSceneFamilyId : state.familyId;
  const sceneVariant = sceneVariantForThreeDFamily(activeSceneFamilyId);
  const sceneMetadata = threeDSceneVariantMetadata[sceneVariant];
  const formulaText = formulaForThreeDScene(state.familyId, state.templateId);
  const selectedManimSceneState = useMemo(
    () => (manimSelectedSceneFamilyId === state.familyId ? state : { ...state, familyId: manimSelectedSceneFamilyId }),
    [manimSelectedSceneFamilyId, state]
  );
  const manimScene = useMemo(
    () => (runtime === "mais-manim" ? buildMathSceneSpecForThreeDFamily({ accent, state: selectedManimSceneState }) : null),
    [accent, runtime, selectedManimSceneState]
  );
  // Building the full 27-family selector catalog synchronously blocked the
  // main thread for ~8-10 seconds per recompute (and `state` changes identity
  // on every parent render), which starved clicks, role queries, and
  // assistive-tech interactions on lab pages. Build it once per mount in
  // idle-scheduled per-family slices instead; the active scene stays fully
  // live through `manimScene` above.
  const [manimSceneSelectorCatalog, setManimSceneSelectorCatalog] = useState<MathSceneSelectorCatalogEntry[]>([]);
  const catalogStateRef = useRef(state);
  catalogStateRef.current = state;
  useEffect(() => {
    if (runtime !== "mais-manim") {
      setManimSceneSelectorCatalog([]);
      return;
    }

    let cancelled = false;
    const entries: MathSceneSelectorCatalogEntry[] = [];
    const familyQueue = [...maisManimFamilyIds];
    const scheduleSlice =
      typeof window !== "undefined" && "requestIdleCallback" in window
        ? (task: () => void) => window.requestIdleCallback(() => task(), { timeout: 500 })
        : (task: () => void) => window.setTimeout(task, 32);

    const buildNextFamily = () => {
      if (cancelled) return;
      const familyId = familyQueue.shift();
      if (!familyId) {
        setManimSceneSelectorCatalog(entries.slice());
        return;
      }
      const entry = buildMathSceneSelectorCatalogEntry({ accent, familyId, state: catalogStateRef.current });
      if (entry) entries.push(entry);
      scheduleSlice(buildNextFamily);
    };

    scheduleSlice(buildNextFamily);

    return () => {
      cancelled = true;
    };
  }, [accent, runtime]);
  const manimCameraShotCatalog = useMemo(() => (manimScene ? buildCameraShotCatalog(manimScene) : []), [manimScene]);
  const manimParameterPanelCatalog = useMemo(() => (manimScene ? buildParameterPanelCatalog(manimScene) : []), [manimScene]);
  const activeManimParameterId = useMemo(
    () =>
      manimParameterPanelCatalog.some((entry) => entry.id === manimSelectedParameterId)
        ? manimSelectedParameterId
        : manimParameterPanelCatalog[0]?.id ?? "none",
    [manimParameterPanelCatalog, manimSelectedParameterId]
  );
  const activeManimParameter = useMemo(
    () => manimParameterPanelCatalog.find((entry) => entry.id === activeManimParameterId) ?? null,
    [activeManimParameterId, manimParameterPanelCatalog]
  );
  const manimPlaybackPlan = useMemo(() => (manimScene ? buildScenePlaybackPlan(manimScene.timeline) : null), [manimScene]);
  const manimPlaybackPlanJson = useMemo(
    () => (manimPlaybackPlan ? serializeScenePlaybackPlan(manimPlaybackPlan) : ""),
    [manimPlaybackPlan]
  );
  const manimSceneExport = useMemo(() => (manimScene ? buildApprovedSceneSpecExport(manimScene) : null), [manimScene]);
  const manimCoordinateSystemEvidence = useMemo<CoordinateSystemEvidence | null>(
    () => (manimScene ? buildCoordinateSystemEvidence(manimScene.coordinateSpace) : null),
    [manimScene]
  );
  const manimCoordinateSystemJson = useMemo(
    () => (manimCoordinateSystemEvidence ? serializeCoordinateSystemEvidence(manimCoordinateSystemEvidence) : null),
    [manimCoordinateSystemEvidence]
  );
  const manimCoordinateSpaceEvidence = useMemo<CoordinateSpaceEvidence | null>(
    () => (manimScene ? buildCoordinateSpaceEvidence(manimScene.coordinateSpace) : null),
    [manimScene]
  );
  const manimCoordinateSpaceJson = useMemo(
    () => (manimCoordinateSpaceEvidence ? serializeCoordinateSpaceEvidence(manimCoordinateSpaceEvidence) : null),
    [manimCoordinateSpaceEvidence]
  );
  const manimSceneExportAttributes = useMemo(
    () => (manimSceneExport ? sceneSpecExportDataAttributes(manimSceneExport) : null),
    [manimSceneExport]
  );
  const manimSceneRunLifecycle = useMemo(
    () =>
      manimScene && manimSceneExport
        ? buildMathSceneRunLifecyclePlan({
            elapsedSeconds: manimElapsedSeconds,
            interactEnabled: true,
            scene: manimScene,
            sceneSignature: manimSceneExport.signature
          })
        : null,
    [manimElapsedSeconds, manimScene, manimSceneExport]
  );
  const manimSceneRunLifecycleAttributes = useMemo(
    () => (manimSceneRunLifecycle ? sceneRunLifecycleDataAttributes(manimSceneRunLifecycle) : null),
    [manimSceneRunLifecycle]
  );
  const manimSceneRunLifecycleJson = useMemo(
    () => (manimSceneRunLifecycle ? serializeMathSceneRunLifecyclePlan(manimSceneRunLifecycle) : ""),
    [manimSceneRunLifecycle]
  );
  const manimCreationPrimitivePlan = useMemo(
    () => (manimScene ? buildSceneCreationPrimitivePlan(manimScene) : null),
    [manimScene]
  );
  const manimCreationPrimitiveAttributes = useMemo(
    () =>
      manimCreationPrimitivePlan
        ? creationPrimitivePlanDataAttributes(summarizeSceneCreationPrimitivePlan(manimCreationPrimitivePlan))
        : null,
    [manimCreationPrimitivePlan]
  );
  const manimDrawBorderThenFillEvidence = useMemo(
    () => (manimCreationPrimitivePlan ? buildDrawBorderThenFillEvidence(manimCreationPrimitivePlan) : null),
    [manimCreationPrimitivePlan]
  );
  const manimDrawBorderThenFillAttributes = useMemo(
    () => (manimDrawBorderThenFillEvidence ? drawBorderThenFillEvidenceDataAttributes(manimDrawBorderThenFillEvidence) : null),
    [manimDrawBorderThenFillEvidence]
  );
  const manimDrawBorderThenFillJson = useMemo(
    () => (manimDrawBorderThenFillEvidence ? serializeDrawBorderThenFillEvidence(manimDrawBorderThenFillEvidence) : ""),
    [manimDrawBorderThenFillEvidence]
  );
  const manimShowCreationEvidence = useMemo(
    () => (manimCreationPrimitivePlan ? buildShowCreationEvidence(manimCreationPrimitivePlan) : null),
    [manimCreationPrimitivePlan]
  );
  const manimShowCreationAttributes = useMemo(
    () => (manimShowCreationEvidence ? showCreationEvidenceDataAttributes(manimShowCreationEvidence) : null),
    [manimShowCreationEvidence]
  );
  const manimShowCreationJson = useMemo(
    () => (manimShowCreationEvidence ? serializeShowCreationEvidence(manimShowCreationEvidence) : ""),
    [manimShowCreationEvidence]
  );
  const manimFadeGrowEvidence = useMemo(
    () => (manimCreationPrimitivePlan ? buildFadeGrowEvidence(manimCreationPrimitivePlan) : null),
    [manimCreationPrimitivePlan]
  );
  const manimFadeGrowAttributes = useMemo(
    () => (manimFadeGrowEvidence ? fadeGrowEvidenceDataAttributes(manimFadeGrowEvidence) : null),
    [manimFadeGrowEvidence]
  );
  const manimFadeGrowJson = useMemo(
    () => (manimFadeGrowEvidence ? serializeFadeGrowEvidence(manimFadeGrowEvidence) : ""),
    [manimFadeGrowEvidence]
  );
  const manimIndicationPrimitivePlan = useMemo(
    () => (manimScene ? buildSceneIndicationPrimitivePlan(manimScene) : null),
    [manimScene]
  );
  const manimIndicationPrimitiveAttributes = useMemo(
    () =>
      manimIndicationPrimitivePlan
        ? indicationPrimitivePlanDataAttributes(summarizeSceneIndicationPrimitivePlan(manimIndicationPrimitivePlan))
        : null,
    [manimIndicationPrimitivePlan]
  );
  const manimIndicationPrimitiveJson = useMemo(
    () => (manimIndicationPrimitivePlan ? serializeSceneIndicationPrimitivePlan(manimIndicationPrimitivePlan) : ""),
    [manimIndicationPrimitivePlan]
  );
  const manimAxisTickPlan = useMemo(
    () => (manimScene ? buildAxisTickPlan(manimScene) : null),
    [manimScene]
  );
  const manimAxisTickAttributes = useMemo(
    () => (manimAxisTickPlan ? axisTickPlanDataAttributes(manimAxisTickPlan) : null),
    [manimAxisTickPlan]
  );
  const manimAxisTickJson = useMemo(
    () => (manimAxisTickPlan ? serializeAxisTickPlan(manimAxisTickPlan) : ""),
    [manimAxisTickPlan]
  );
  const manimSurfaceObjects = useMemo(
    () => (manimScene ? buildSurfaceObjectsForScene(manimScene) : []),
    [manimScene]
  );
  const manimSurfaceObjectEvidence = useMemo(
    () => buildSurfaceObjectEvidence(manimSurfaceObjects),
    [manimSurfaceObjects]
  );
  const manimSurfaceObjectJson = useMemo(
    () => serializeSurfaceObjectPayload(manimSurfaceObjects),
    [manimSurfaceObjects]
  );
  const manimOdeTrajectories = useMemo(
    () => (manimScene ? buildSceneOdeTrajectories(manimScene) : []),
    [manimScene]
  );
  const manimOdeTrajectoryEvidence = useMemo(
    () => summarizeOdeTrajectories(manimOdeTrajectories),
    [manimOdeTrajectories]
  );
  const manimOdeTrajectoryJson = useMemo(
    () => serializeOdeTrajectoryPayload(manimOdeTrajectories),
    [manimOdeTrajectories]
  );
  const manimOdeTrajectoryObjects = useMemo(
    () => (manimScene ? buildOdeTrajectoryObjectSpecs(manimScene) : []),
    [manimScene]
  );
  const manimOdeTrajectoryObjectEvidence = useMemo(
    () => buildOdeTrajectoryObjectBridgeEvidence(manimOdeTrajectoryObjects),
    [manimOdeTrajectoryObjects]
  );
  const manimOdeTrajectoryObjectJson = useMemo(
    () => serializeOdeTrajectoryObjectBridgePayload(manimOdeTrajectoryObjects),
    [manimOdeTrajectoryObjects]
  );
  const manimVectorFields = useMemo(
    () => (manimScene ? buildSceneVectorFields(manimScene) : []),
    [manimScene]
  );
  const manimVectorFieldEvidence = useMemo(
    () => summarizeSceneVectorFields(manimVectorFields),
    [manimVectorFields]
  );
  const manimVectorFieldJson = useMemo(
    () => serializeVectorFieldPayload(manimVectorFields),
    [manimVectorFields]
  );
  const manimStreamLineSets = useMemo(
    () => (manimScene ? buildSceneStreamLines(manimScene) : []),
    [manimScene]
  );
  const manimStreamLineEvidence = useMemo(
    () => summarizeSceneStreamLines(manimStreamLineSets, { elapsedSeconds: manimElapsedSeconds }),
    [manimElapsedSeconds, manimStreamLineSets]
  );
  const manimStreamLineJson = useMemo(
    () => serializeStreamLinePayload(manimStreamLineSets, { elapsedSeconds: manimElapsedSeconds }),
    [manimElapsedSeconds, manimStreamLineSets]
  );
  const manimSkipAnimations = manimAuthoringMode === "show-final";
  const manimPrePlayControlPlan = useMemo(
    () =>
      manimScene && manimPlaybackPlan
        ? buildScenePrePlayControlPlan({
            hasWindow: canvasReady,
            initialSkipAnimations: manimSkipAnimations,
            playCount: manimPlaybackPlan.plays.length,
            playStartSeconds: manimPlaybackPlan.plays.map((play) => play.startSeconds)
          })
        : null,
    [canvasReady, manimPlaybackPlan, manimScene, manimSkipAnimations]
  );
  const manimPrePlayControlJson = useMemo(
    () => (manimPrePlayControlPlan ? serializeScenePrePlayControlPlan(manimPrePlayControlPlan) : null),
    [manimPrePlayControlPlan]
  );
  const manimSkippingWindowPlan = useMemo(
    () =>
      manimScene && manimPlaybackPlan
        ? buildSceneSkippingWindowPlan({
            initialSkipAnimations: manimSkipAnimations,
            playCount: manimPlaybackPlan.plays.length,
            playDurations: manimPlaybackPlan.plays.map((play) => Math.max(0, play.endSeconds - play.startSeconds)),
            startAtAnimationNumber: manimRunFromBeatIndex > 0 ? manimRunFromBeatIndex : null
          })
        : null,
    [manimPlaybackPlan, manimRunFromBeatIndex, manimScene, manimSkipAnimations]
  );
  const manimSkippingWindowJson = useMemo(
    () => (manimSkippingWindowPlan ? serializeSceneSkippingWindowPlan(manimSkippingWindowPlan) : null),
    [manimSkippingWindowPlan]
  );
  const manimSkipControlPlan = useMemo(
    () =>
      manimScene
        ? buildSceneSkipControlPlan({
            actions: manimSkipAnimations
              ? ["force_skipping", "revert_to_original_skipping_status"]
              : ["temp_skip_enter", "temp_skip_exit"],
            initialSkipAnimations: manimSkipAnimations
          })
        : null,
    [manimScene, manimSkipAnimations]
  );
  const manimSkipControlJson = useMemo(
    () => (manimSkipControlPlan ? serializeSceneSkipControlPlan(manimSkipControlPlan) : null),
    [manimSkipControlPlan]
  );
  const manimProgressControlPlan = useMemo(
    () =>
      manimScene
        ? buildSceneProgressControlPlan({
            initialShowAnimationProgress: false,
            requested: manimPlaybackState === "playing" || manimCaptureKind === "video"
          })
        : null,
    [manimCaptureKind, manimPlaybackState, manimScene]
  );
  const manimProgressControlJson = useMemo(
    () => (manimProgressControlPlan ? serializeSceneProgressControlPlan(manimProgressControlPlan) : null),
    [manimProgressControlPlan]
  );
  const manimPostPlayPreviewPlan = useMemo(
    () =>
      manimScene && manimPlaybackPlan
        ? buildScenePostPlayPreviewPlan({
            hasWindow: canvasReady,
            playCount: manimPlaybackPlan.plays.length,
            previewWhileSkipping: true,
            skipAnimations: manimSkipAnimations
          })
        : null,
    [canvasReady, manimPlaybackPlan, manimScene, manimSkipAnimations]
  );
  const manimPostPlayPreviewPlanJson = useMemo(
    () => (manimPostPlayPreviewPlan ? serializeScenePostPlayPreviewPlan(manimPostPlayPreviewPlan) : null),
    [manimPostPlayPreviewPlan]
  );
  const fallbackManimFrameStep = useMemo<MathSceneFrameStep | null>(
    () => {
      if (!manimScene) return null;

      const previousRuntimeState =
        previousManimRuntimeStateRef.current?.sceneId === manimScene.sceneId
          ? previousManimRuntimeStateRef.current
          : undefined;

      return stepMathSceneFrame(manimScene, {
        deltaSeconds: 0,
        elapsedSeconds: manimElapsedSeconds,
        formulaLayerViewport: manimFormulaOverlayViewport,
        frameIndex: manimFrameIndex,
        previousRuntimeState,
        reducedMotion: manimSkipAnimations
      });
    },
    [manimElapsedSeconds, manimFormulaOverlayViewport, manimFrameIndex, manimScene, manimSkipAnimations]
  );
  const manimFrameStep = steppedManimFrameStep !== null &&
    steppedManimFrameStep.runtimeState.sceneId === manimScene?.sceneId &&
    Math.abs(steppedManimFrameStep.preciseElapsedSeconds - manimElapsedSeconds) < 0.0005 &&
    steppedManimFrameStep.frameIndex === manimFrameIndex
      ? steppedManimFrameStep
      : fallbackManimFrameStep;
  const manimFrameStepAttributes = useMemo(
    () => (manimFrameStep ? frameStepDataAttributes(manimFrameStep) : null),
    [manimFrameStep]
  );
  const manimFrameStepJson = useMemo(
    () => (manimFrameStep ? serializeMathSceneFrameStepCapture(manimFrameStep) : null),
    [manimFrameStep]
  );
  const manimRuntimeState = manimFrameStep?.runtimeState ?? null;
  const manimMoveAlongVectorFieldPayload = useMemo(() => {
    if (!manimRuntimeState) return null;
    const previousRuntimeState =
      previousManimRuntimeStateRef.current?.sceneId === manimRuntimeState.sceneId
        ? previousManimRuntimeStateRef.current
        : undefined;

    return buildMoveAlongVectorFieldPayloadForRuntimeState(
      manimRuntimeState,
      previousRuntimeState,
      manimFrameStep?.deltaSeconds ?? 0
    );
  }, [manimFrameStep?.deltaSeconds, manimRuntimeState]);
  const manimMoveAlongVectorFieldJson = useMemo(
    () =>
      manimMoveAlongVectorFieldPayload
        ? serializeMoveAlongVectorFieldPayload(manimMoveAlongVectorFieldPayload)
        : "",
    [manimMoveAlongVectorFieldPayload]
  );
  const manimTracingTailEntries = useMemo(
    () => (manimScene && manimRuntimeState ? buildTracingTailEvidenceEntriesForScene(manimScene, manimRuntimeState) : []),
    [manimRuntimeState, manimScene]
  );
  const manimTracingTailEvidence = useMemo(
    () => buildTracingTailEvidence(manimTracingTailEntries),
    [manimTracingTailEntries]
  );
  const manimTracingTailJson = useMemo(
    () => serializeTracingTailEvidencePayload(manimTracingTailEntries),
    [manimTracingTailEntries]
  );
  const manimAlwaysUpdaterCatalog = useMemo<AlwaysUpdaterAuthoringCatalog | null>(
    () =>
      manimScene && manimRuntimeState
        ? buildAlwaysUpdaterAuthoringCatalog({
            alwaysMethodUpdaters: manimScene.alwaysMethodUpdaters,
            alwaysRedraw: manimScene.alwaysRedraw,
            trackers: manimRuntimeState.trackers
          })
        : null,
    [manimRuntimeState, manimScene]
  );
  const manimAlwaysUpdaterJson = useMemo(
    () => (manimAlwaysUpdaterCatalog ? serializeAlwaysUpdaterAuthoringCatalog(manimAlwaysUpdaterCatalog) : null),
    [manimAlwaysUpdaterCatalog]
  );
  const manimAlwaysMethodEvidence = useMemo<AlwaysMethodUpdaterEvidence | null>(
    () => (manimScene && manimRuntimeState ? buildAlwaysMethodUpdaterEvidence(manimScene, manimRuntimeState) : null),
    [manimRuntimeState, manimScene]
  );
  const manimAlwaysMethodJson = useMemo(
    () => (manimAlwaysMethodEvidence ? serializeAlwaysMethodUpdaterEvidence(manimAlwaysMethodEvidence) : null),
    [manimAlwaysMethodEvidence]
  );
  const manimUpdateFramePlan = useMemo(
    () => {
      if (!manimRuntimeState) return null;
      const renderGroupIds = manimRuntimeState.sceneGraph.summary.renderGroupIds === "none"
        ? []
        : manimRuntimeState.sceneGraph.summary.renderGroupIds.split(",");

      return buildSceneUpdateFramePlan({
        dtSeconds: 0.25,
        forceDraw: manimRuntimeState.updatePolicy.forceDraw,
        renderGroupIds,
        sceneTimeSeconds: manimRuntimeState.timeline.elapsedSeconds,
        skipAnimations: manimRuntimeState.updatePolicy.skipAnimations
      });
    },
    [manimRuntimeState]
  );
  const manimUpdateFrameJson = useMemo(
    () => (manimUpdateFramePlan ? serializeSceneUpdateFramePlan(manimUpdateFramePlan) : null),
    [manimUpdateFramePlan]
  );
  const manimSceneUpdatePolicyPayload = useMemo(
    () => manimRuntimeState?.updatePolicy ?? null,
    [manimRuntimeState]
  );
  const manimSceneUpdatePolicyJson = useMemo(
    () => (manimSceneUpdatePolicyPayload ? serializeSceneUpdatePolicy(manimSceneUpdatePolicyPayload) : ""),
    [manimSceneUpdatePolicyPayload]
  );
  const manimInteractLoopPlan = useMemo(
    () => {
      if (!manimRuntimeState) return null;
      const renderGroupIds = manimRuntimeState.sceneGraph.summary.renderGroupIds === "none"
        ? []
        : manimRuntimeState.sceneGraph.summary.renderGroupIds.split(",");

      return buildSceneInteractLoopPlan({
        fps: 4,
        hasWindow: canvasReady,
        initialSceneTimeSeconds: manimRuntimeState.timeline.elapsedSeconds,
        initialSkipAnimations: manimSkipAnimations,
        maxFrames: 2,
        renderGroupIds
      });
    },
    [canvasReady, manimRuntimeState, manimSkipAnimations]
  );
  const manimInteractLoopJson = useMemo(
    () => (manimInteractLoopPlan ? serializeSceneInteractLoopPlan(manimInteractLoopPlan) : null),
    [manimInteractLoopPlan]
  );
  const manimSceneRunInteractBridgePlan = useMemo(
    () =>
      manimSceneRunLifecycle && manimInteractLoopPlan
        ? buildSceneRunInteractBridgePlan({
            interactLoopPlan: manimInteractLoopPlan,
            sceneRunLifecycle: manimSceneRunLifecycle
          })
        : null,
    [manimInteractLoopPlan, manimSceneRunLifecycle]
  );
  const manimSceneRunInteractBridgeAttributes = useMemo(
    () => (manimSceneRunInteractBridgePlan ? sceneRunInteractBridgeDataAttributes(manimSceneRunInteractBridgePlan) : null),
    [manimSceneRunInteractBridgePlan]
  );
  const manimSceneRunInteractBridgeJson = useMemo(
    () => (manimSceneRunInteractBridgePlan ? serializeSceneRunInteractBridgePlan(manimSceneRunInteractBridgePlan) : ""),
    [manimSceneRunInteractBridgePlan]
  );
  const manimFloorPlanePlan = useMemo(
    () => (manimScene ? buildSceneFloorPlanePlan({ plane: "xz" }) : null),
    [manimScene]
  );
  const manimFloorPlaneJson = useMemo(
    () => (manimFloorPlanePlan ? serializeSceneFloorPlanePlan(manimFloorPlanePlan) : null),
    [manimFloorPlanePlan]
  );
  const manimKeyControlPlan = useMemo(
    () =>
      manimScene
        ? buildSceneKeyControlPlan({
            canRedo: manimHistoryStore.redoStack.length > 0,
            canUndo: manimHistoryStore.undoStack.length > 0,
            key: "r",
            resetKey: "r"
          })
        : null,
    [manimHistoryStore, manimScene]
  );
  const manimKeyControlJson = useMemo(
    () => (manimKeyControlPlan ? serializeSceneKeyControlPlan(manimKeyControlPlan) : null),
    [manimKeyControlPlan]
  );
  const manimPointerControlPlan = useMemo(
    () =>
      manimScene
        ? buildScenePointerControlPlan({
            deltaPoint: [0, 0, 0],
            eventType: "mouse-motion",
            hasWindow: canvasReady,
            point: [0, 0, 0]
          })
        : null,
    [canvasReady, manimScene]
  );
  const manimPointerControlJson = useMemo(
    () => (manimPointerControlPlan ? serializeScenePointerControlPlan(manimPointerControlPlan) : null),
    [manimPointerControlPlan]
  );
  const manimWindowEventPlan = useMemo(
    () =>
      manimScene
        ? buildSceneWindowEventPlan({
            eventType: "resize",
            hasWindow: canvasReady,
            height: manimFormulaOverlayViewport.height,
            width: manimFormulaOverlayViewport.width
          })
        : null,
    [canvasReady, manimFormulaOverlayViewport, manimScene]
  );
  const manimWindowEventJson = useMemo(
    () => (manimWindowEventPlan ? serializeSceneWindowEventPlan(manimWindowEventPlan) : null),
    [manimWindowEventPlan]
  );
  const manimEmitFramePlan = useMemo(
    () =>
      manimRuntimeState
        ? buildSceneEmitFramePlan({
            cameraId: manimRuntimeState.cameraDirector.activeShotId,
            frameIndex: Math.round(manimRuntimeState.timeline.elapsedSeconds * 60),
            progressDisplayActive: true,
            skipAnimations: manimRuntimeState.updatePolicy.skipAnimations,
            writeToMovie: true
          })
        : null,
    [manimRuntimeState]
  );
  const manimEmitFrameJson = useMemo(
    () => (manimEmitFramePlan ? serializeSceneEmitFramePlan(manimEmitFramePlan) : null),
    [manimEmitFramePlan]
  );
  const activeManimPlaybackStep = useMemo<PlaybackPlanStep | null>(
    () => {
      if (!manimPlaybackPlan) return null;
      const boundedElapsedSeconds = Math.min(
        manimPlaybackPlan.totalDuration,
        Math.max(0, manimElapsedSeconds)
      );

      return manimPlaybackPlan.plays.find((play) => boundedElapsedSeconds <= play.endSeconds) ??
        manimPlaybackPlan.plays.at(-1) ??
        null;
    },
    [manimElapsedSeconds, manimPlaybackPlan]
  );
  const manimWaitControlPlaybackStep = useMemo<PlaybackPlanStep | null>(
    () =>
      activeManimPlaybackStep?.waitControl
        ? activeManimPlaybackStep
        : manimPlaybackPlan?.plays.find((play) => play.waitControl) ?? null,
    [activeManimPlaybackStep, manimPlaybackPlan]
  );
  const manimWaitControlPlan = useMemo(
    () => {
      if (!manimWaitControlPlaybackStep || manimWaitControlPlaybackStep.step.type !== "wait") return null;
      const waitStep = manimWaitControlPlaybackStep.step;

      return buildSceneWaitControl({
        duration: waitStep.duration,
        holdOnWait: waitStep.holdOnWait,
        ignorePresenterMode: waitStep.ignorePresenterMode,
        maxTime: waitStep.maxTime,
        note: waitStep.note,
        playIndex: manimWaitControlPlaybackStep.playIndex,
        presenterMode: waitStep.presenterMode,
        presenterReleaseAfterFrames: waitStep.presenterReleaseAfterFrames,
        skipAnimations: manimSkipAnimations,
        stopConditionId: waitStep.stopConditionId,
        stopConditionSatisfiedAt: waitStep.stopConditionSatisfiedAt
      });
    },
    [manimSkipAnimations, manimWaitControlPlaybackStep]
  );
  const manimWaitControlJson = useMemo(
    () => (manimWaitControlPlan ? serializeSceneWaitControlPlan(manimWaitControlPlan) : null),
    [manimWaitControlPlan]
  );
  const manimPresenterHoldJson = useMemo(
    () => (manimWaitControlPlan ? serializeScenePresenterHoldPlan(manimWaitControlPlan.presenterHold) : null),
    [manimWaitControlPlan]
  );
  const manimTimelineFocusTargetIds = useMemo(
    () => (manimRuntimeState ? timelineFocusTargetIds(manimRuntimeState.timeline.activeStep) : []),
    [manimRuntimeState]
  );
  const manimRuntimeIndicationOverlayActiveConceptId = useMemo(
    () => (manimRuntimeState ? runtimeIndicationOverlayActiveConceptId(manimRuntimeState) : "none"),
    [manimRuntimeState]
  );
  const manimRuntimeIndicationOverlayFrames = useMemo(
    () =>
      manimRuntimeState
        ? buildRuntimeIndicationOverlayFrames(manimRuntimeState, { focusTargetIds: manimTimelineFocusTargetIds })
        : [],
    [manimRuntimeState, manimTimelineFocusTargetIds]
  );
  const manimRuntimeIndicationOverlaySummary = useMemo(
    () =>
      summarizeRuntimeIndicationOverlayFrames(
        manimRuntimeIndicationOverlayFrames,
        manimRuntimeIndicationOverlayActiveConceptId,
        { focusTargetIds: manimTimelineFocusTargetIds }
      ),
    [manimRuntimeIndicationOverlayActiveConceptId, manimRuntimeIndicationOverlayFrames, manimTimelineFocusTargetIds]
  );
  const manimRuntimeIndicationOverlayAttributes = useMemo(
    () => runtimeIndicationOverlayDataAttributes(manimRuntimeIndicationOverlaySummary),
    [manimRuntimeIndicationOverlaySummary]
  );
  const manimRuntimeIndicationOverlayJson = useMemo(
    () => serializeRuntimeIndicationOverlayPayload(manimRuntimeIndicationOverlayFrames, manimRuntimeIndicationOverlaySummary),
    [manimRuntimeIndicationOverlayFrames, manimRuntimeIndicationOverlaySummary]
  );
  const manimCameraFramePayload = useMemo(
    () =>
      manimRuntimeState
        ? buildCameraFramePayload({
            cameraDirector: manimRuntimeState.cameraDirector,
            sceneId: manimRuntimeState.sceneId
          })
        : null,
    [manimRuntimeState]
  );
  const manimCameraFrameAttributes = useMemo(
    () => (manimCameraFramePayload ? cameraFramePayloadDataAttributes(manimCameraFramePayload) : null),
    [manimCameraFramePayload]
  );
  const manimCameraFrameJson = useMemo(
    () => (manimCameraFramePayload ? serializeCameraFramePayload(manimCameraFramePayload) : ""),
    [manimCameraFramePayload]
  );
  const manimAnimationPlans = useMemo(
    () => (manimScene && manimRuntimeState ? buildMathSceneAnimatePlans(manimScene, manimRuntimeState) : []),
    [manimScene, manimRuntimeState]
  );
  const manimAnimateBuilderCatalog = useMemo<MathAnimateBuilderCatalog | null>(
    () => (manimScene ? buildMathAnimateBuilderCatalog(manimAnimationPlans) : null),
    [manimAnimationPlans, manimScene]
  );
  const manimAnimateBuilderJson = useMemo(
    () => (manimAnimateBuilderCatalog ? serializeMathAnimateBuilderCatalog(manimAnimateBuilderCatalog) : null),
    [manimAnimateBuilderCatalog]
  );
  const manimPlayCompilationPlan = useMemo(
    () => {
      if (!manimScene) return null;
      const animationCompositionStep = manimScene.timeline.find((step) => step.type === "animationComposition");
      const animationComposition = animationCompositionStep
        ? manimScene.animationCompositions?.find((composition) => composition.id === animationCompositionStep.compositionId)
        : undefined;

      return buildScenePlayCompilationPlan({
        lagRatio: animationComposition?.lagRatio ?? null,
        protoAnimations: manimAnimationPlans.map((plan) => ({
          animationId: plan.id,
          kind: "builder",
          lagRatio: plan.step.lagRatio,
          objectId: plan.objectId,
          runTime: plan.step.duration,
          timeSpan: [0, plan.step.duration]
        })),
        runTime: animationCompositionStep?.duration ?? null
      });
    },
    [manimAnimationPlans, manimScene]
  );
  const manimPlayCompilationJson = useMemo(
    () => (manimPlayCompilationPlan ? serializeScenePlayCompilationPlan(manimPlayCompilationPlan) : null),
    [manimPlayCompilationPlan]
  );
  const manimBeginAnimationsPlan = useMemo(
    () =>
      manimRuntimeState
        ? buildSceneBeginAnimationsPlan({
            animations: manimAnimationPlans.map((plan) => ({
              animationId: plan.id,
              familyIds: [plan.objectId],
              objectId: plan.objectId,
              runTime: plan.step.duration,
              suspendMobjectUpdating: true,
              timeSpan: [0, plan.step.duration]
            })),
            sceneFamilyIds: Object.keys(manimRuntimeState.objectGraph.byId)
          })
        : null,
    [manimAnimationPlans, manimRuntimeState]
  );
  const manimBeginAnimationsJson = useMemo(
    () => (manimBeginAnimationsPlan ? serializeSceneBeginAnimationsPlan(manimBeginAnimationsPlan) : null),
    [manimBeginAnimationsPlan]
  );
  const manimTimeProgressionPlan = useMemo(
    () => {
      if (!manimScene) return null;
      const runTime = manimAnimationPlans.reduce((maxRunTime, plan) => Math.max(maxRunTime, plan.step.duration), 0);

      return buildSceneTimeProgression({
        fps: 4,
        runTime,
        skipAnimations: manimSkipAnimations
      });
    },
    [manimAnimationPlans, manimScene, manimSkipAnimations]
  );
  const manimTimeProgressionJson = useMemo(
    () => (manimTimeProgressionPlan ? serializeSceneTimeProgression(manimTimeProgressionPlan) : null),
    [manimTimeProgressionPlan]
  );
  const manimProgressThroughAnimationsPlan = useMemo(
    () =>
      manimScene
        ? buildSceneProgressThroughAnimationsPlan({
            animations: manimAnimationPlans.map((plan) => ({
              animationId: plan.id,
              objectId: plan.objectId,
              runTime: plan.step.duration
            })),
            fps: 4,
            skipAnimations: manimSkipAnimations
          })
        : null,
    [manimAnimationPlans, manimScene, manimSkipAnimations]
  );
  const manimProgressThroughAnimationsJson = useMemo(
    () => (manimProgressThroughAnimationsPlan ? serializeSceneProgressThroughAnimationsPlan(manimProgressThroughAnimationsPlan) : null),
    [manimProgressThroughAnimationsPlan]
  );
  const manimFinishAnimationsPlan = useMemo(
    () =>
      manimScene
        ? buildSceneFinishAnimationsPlan({
            animations: manimAnimationPlans.map((plan) => ({
              animationId: plan.id,
              objectId: plan.objectId,
              runTime: plan.step.duration
            })),
            skipAnimations: manimSkipAnimations
          })
        : null,
    [manimAnimationPlans, manimScene, manimSkipAnimations]
  );
  const manimFinishAnimationsJson = useMemo(
    () => (manimFinishAnimationsPlan ? serializeSceneFinishAnimationsPlan(manimFinishAnimationsPlan) : null),
    [manimFinishAnimationsPlan]
  );
  const manimAnimationLifecyclePlan = useMemo(
    () =>
      manimScene && manimRuntimeState && manimAnimationPlans[0]
        ? buildMathAnimationLifecyclePlan(manimScene, manimRuntimeState, manimAnimationPlans[0])
        : null,
    [manimAnimationPlans, manimRuntimeState, manimScene]
  );
  const manimAnimationLifecycleAttributes = useMemo(
    () => (manimAnimationLifecyclePlan ? animationLifecycleDataAttributes(manimAnimationLifecyclePlan) : null),
    [manimAnimationLifecyclePlan]
  );
  const manimAnimationLifecycleJson = useMemo(
    () => (manimAnimationLifecyclePlan ? serializeMathAnimationLifecyclePlan(manimAnimationLifecyclePlan) : ""),
    [manimAnimationLifecyclePlan]
  );
  const manimTransformBeginPlan = useMemo(
    () =>
      manimScene && manimRuntimeState && manimAnimationPlans[0]
        ? buildMathTransformBeginPlan(manimScene, manimRuntimeState, manimAnimationPlans[0])
        : null,
    [manimAnimationPlans, manimRuntimeState, manimScene]
  );
  const manimTransformBeginAttributes = useMemo(
    () => (manimTransformBeginPlan ? transformBeginPlanDataAttributes(manimTransformBeginPlan) : null),
    [manimTransformBeginPlan]
  );
  const manimTransformBeginJson = useMemo(
    () => (manimTransformBeginPlan ? serializeMathTransformBeginPlan(manimTransformBeginPlan) : ""),
    [manimTransformBeginPlan]
  );
  const manimTransformMatchingPlan = useMemo(
    () => (manimScene ? buildTransformMatchingPlan(manimScene) : null),
    [manimScene]
  );
  const manimTransformMatchingAttributes = useMemo(
    () => (manimTransformMatchingPlan ? transformMatchingDataAttributes(manimTransformMatchingPlan) : null),
    [manimTransformMatchingPlan]
  );
  const manimTransformMatchingJson = useMemo(
    () => (manimTransformMatchingPlan ? serializeTransformMatchingPlan(manimTransformMatchingPlan) : ""),
    [manimTransformMatchingPlan]
  );
  const manimMobjectBoundingBoxTable = useMemo(
    () => (manimRuntimeState ? buildMobjectBoundingBoxTable(manimRuntimeState.objectGraph) : null),
    [manimRuntimeState]
  );
  const manimMobjectBoundingBoxAttributes = useMemo(
    () => (manimMobjectBoundingBoxTable ? mobjectBoundingBoxDataAttributes(manimMobjectBoundingBoxTable) : null),
    [manimMobjectBoundingBoxTable]
  );
  const manimMobjectBoundingBoxJson = useMemo(
    () => (manimMobjectBoundingBoxTable ? serializeMobjectBoundingBoxTable(manimMobjectBoundingBoxTable) : ""),
    [manimMobjectBoundingBoxTable]
  );
  const manimMobjectCopyPlan = useMemo(
    () => (manimRuntimeState ? buildMobjectCopyPlan(manimRuntimeState.objectGraph) : null),
    [manimRuntimeState]
  );
  const manimMobjectCopyPlanAttributes = useMemo(
    () => (manimMobjectCopyPlan ? mobjectCopyPlanDataAttributes(manimMobjectCopyPlan) : null),
    [manimMobjectCopyPlan]
  );
  const manimMobjectCopyPlanJson = useMemo(
    () => (manimMobjectCopyPlan ? serializeMobjectCopyPlan(manimMobjectCopyPlan) : ""),
    [manimMobjectCopyPlan]
  );
  const manimMobjectLayoutPlan = useMemo(
    () =>
      manimRuntimeState
        ? buildMobjectArrangeLayoutPlan(manimRuntimeState.objectGraph, manimRuntimeState.sceneGraph.topLevelIds, {
            buff: 0.25,
            center: true,
            direction: [1, 0, 0]
          })
        : null,
    [manimRuntimeState]
  );
  const manimMobjectLayoutAttributes = useMemo(
    () => (manimMobjectLayoutPlan ? mobjectLayoutDataAttributes(manimMobjectLayoutPlan) : null),
    [manimMobjectLayoutPlan]
  );
  const manimMobjectLayoutJson = useMemo(
    () => (manimMobjectLayoutPlan ? serializeMobjectLayoutPlan(manimMobjectLayoutPlan) : ""),
    [manimMobjectLayoutPlan]
  );
  const manimMobjectRenderOrderPlan = useMemo(
    () => (manimRuntimeState ? buildMobjectRenderOrderPlan(manimRuntimeState.sceneGraph, buildMobjectFamilyIndex(manimRuntimeState.objectGraph)) : null),
    [manimRuntimeState]
  );
  const manimMobjectRenderOrderAttributes = useMemo(
    () => (manimMobjectRenderOrderPlan ? mobjectRenderOrderDataAttributes(manimMobjectRenderOrderPlan) : null),
    [manimMobjectRenderOrderPlan]
  );
  const manimMobjectRenderOrderJson = useMemo(
    () => (manimMobjectRenderOrderPlan ? serializeMobjectRenderOrderPlan(manimMobjectRenderOrderPlan) : ""),
    [manimMobjectRenderOrderPlan]
  );
  const manimMobjectDataTable = useMemo(
    () => (manimRuntimeState ? buildMobjectDataTable(manimRuntimeState.objectGraph) : null),
    [manimRuntimeState]
  );
  const manimMobjectDataAttributes = useMemo(
    () => (manimMobjectDataTable ? mobjectDataTableDataAttributes(manimMobjectDataTable) : null),
    [manimMobjectDataTable]
  );
  const manimMobjectDataJson = useMemo(
    () => (manimMobjectDataTable ? serializeMobjectDataTable(manimMobjectDataTable) : ""),
    [manimMobjectDataTable]
  );
  const manimMobjectFamilyIndex = useMemo(
    () => (manimRuntimeState ? buildMobjectFamilyIndex(manimRuntimeState.objectGraph) : null),
    [manimRuntimeState]
  );
  const manimMobjectFamilySummary = useMemo(
    () => (manimMobjectFamilyIndex ? summarizeMobjectFamilies(manimMobjectFamilyIndex) : null),
    [manimMobjectFamilyIndex]
  );
  const manimMobjectFamilyJson = useMemo(
    () => (manimMobjectFamilyIndex ? serializeMobjectFamilyIndex(manimMobjectFamilyIndex) : ""),
    [manimMobjectFamilyIndex]
  );
  const manimRuntimeGraphFrame = useMemo(
    () =>
      manimRuntimeState
        ? {
            objectGraph: manimRuntimeState.objectGraph,
            sceneGraph: manimRuntimeState.sceneGraph,
            sourceContract: RUNTIME_SCENE_GRAPH_REFRESH_SOURCE_CONTRACT
          }
        : null,
    [manimRuntimeState]
  );
  const manimRuntimeGraphFrameAttributes = useMemo(
    () => (manimRuntimeGraphFrame ? runtimeGraphFrameDataAttributes(manimRuntimeGraphFrame) : null),
    [manimRuntimeGraphFrame]
  );
  const manimRuntimeGraphFrameJson = useMemo(
    () => (manimRuntimeGraphFrame ? serializeMathSceneRuntimeGraphFrame(manimRuntimeGraphFrame) : ""),
    [manimRuntimeGraphFrame]
  );
  const manimMobjectFamilyCachePlan = useMemo(() => {
    if (!manimRuntimeState) return null;
    const previousRuntimeState =
      previousManimRuntimeStateRef.current?.sceneId === manimRuntimeState.sceneId
        ? previousManimRuntimeStateRef.current
        : undefined;

    return buildMobjectFamilyCachePlan({
      nextGraph: manimRuntimeState.objectGraph,
      previousGraph: previousRuntimeState?.objectGraph,
      previousIndex: previousRuntimeState ? buildMobjectFamilyIndex(previousRuntimeState.objectGraph) : undefined
    });
  }, [manimRuntimeState]);
  const manimMobjectFamilyCacheJson = useMemo(
    () => (manimMobjectFamilyCachePlan ? serializeMobjectFamilyCachePlan(manimMobjectFamilyCachePlan) : ""),
    [manimMobjectFamilyCachePlan]
  );
  const manimMobjectUniformPayload = useMemo(
    () => (manimRuntimeState ? buildMobjectUniformPayload(manimRuntimeState.objectGraph) : null),
    [manimRuntimeState]
  );
  const manimMobjectUniformJson = useMemo(
    () => (manimMobjectUniformPayload ? serializeMobjectUniformPayload(manimMobjectUniformPayload) : ""),
    [manimMobjectUniformPayload]
  );
  const manimMobjectStatePayload = useMemo(
    () => (manimRuntimeState ? buildMobjectStatePayload(manimRuntimeState.objectGraph) : null),
    [manimRuntimeState]
  );
  const manimMobjectStateAttributes = useMemo(
    () => (manimMobjectStatePayload ? mobjectStatePayloadDataAttributes(manimMobjectStatePayload) : null),
    [manimMobjectStatePayload]
  );
  const manimMobjectStateJson = useMemo(
    () => (manimMobjectStatePayload ? serializeMobjectStatePayload(manimMobjectStatePayload) : ""),
    [manimMobjectStatePayload]
  );
  const manimMobjectStateRestoreBridgePlan = useMemo(
    () => (manimRuntimeState ? buildMobjectStateRestoreBridgePlan({ graph: manimRuntimeState.objectGraph }) : null),
    [manimRuntimeState]
  );
  const manimMobjectStateRestoreBridgeAttributes = useMemo(
    () =>
      manimMobjectStateRestoreBridgePlan
        ? mobjectStateRestoreBridgeDataAttributes(manimMobjectStateRestoreBridgePlan)
        : null,
    [manimMobjectStateRestoreBridgePlan]
  );
  const manimMobjectStateRestoreBridgeJson = useMemo(
    () =>
      manimMobjectStateRestoreBridgePlan
        ? serializeMobjectStateRestoreBridgePlan(manimMobjectStateRestoreBridgePlan)
        : "",
    [manimMobjectStateRestoreBridgePlan]
  );
  const manimMobjectMoveToTargetBridgePlan = useMemo(
    () => (manimRuntimeState ? buildMobjectMoveToTargetBridgePlan({ graph: manimRuntimeState.objectGraph }) : null),
    [manimRuntimeState]
  );
  const manimMobjectMoveToTargetBridgeAttributes = useMemo(
    () =>
      manimMobjectMoveToTargetBridgePlan
        ? mobjectMoveToTargetBridgeDataAttributes(manimMobjectMoveToTargetBridgePlan)
        : null,
    [manimMobjectMoveToTargetBridgePlan]
  );
  const manimMobjectMoveToTargetBridgeJson = useMemo(
    () =>
      manimMobjectMoveToTargetBridgePlan
        ? serializeMobjectMoveToTargetBridgePlan(manimMobjectMoveToTargetBridgePlan)
        : "",
    [manimMobjectMoveToTargetBridgePlan]
  );
  const manimMobjectAnchorEvidence = useMemo(
    () => (manimRuntimeState ? buildMobjectAnchorEvidence(manimRuntimeState.objectGraph) : null),
    [manimRuntimeState]
  );
  const manimMobjectAnchorJson = useMemo(
    () => (manimMobjectAnchorEvidence ? serializeMobjectAnchorEvidence(manimMobjectAnchorEvidence) : ""),
    [manimMobjectAnchorEvidence]
  );
  const manimMobjectMaterialUniformEvidence = useMemo(
    () => (manimRuntimeState ? buildMobjectMaterialUniformEvidence(manimRuntimeState.objectGraph) : null),
    [manimRuntimeState]
  );
  const manimMobjectMaterialUniformJson = useMemo(
    () =>
      manimMobjectMaterialUniformEvidence
        ? serializeMobjectMaterialUniformEvidence(manimMobjectMaterialUniformEvidence)
        : "",
    [manimMobjectMaterialUniformEvidence]
  );
  const manimMobjectInvalidationPlan = useMemo(() => {
    if (!manimRuntimeState) return null;
    const previousRuntimeState =
      previousManimRuntimeStateRef.current?.sceneId === manimRuntimeState.sceneId
        ? previousManimRuntimeStateRef.current
        : undefined;

    return buildMobjectInvalidationPlan(
      previousRuntimeState?.objectGraph ?? manimRuntimeState.objectGraph,
      manimRuntimeState.objectGraph
    );
  }, [manimRuntimeState]);
  const manimMobjectInvalidationJson = useMemo(
    () => (manimMobjectInvalidationPlan ? serializeMobjectInvalidationPlan(manimMobjectInvalidationPlan) : ""),
    [manimMobjectInvalidationPlan]
  );
  const manimMobjectDirtyStatePayload = useMemo(
    () =>
      manimScene && manimRuntimeState
        ? buildMobjectDirtyStatePayload({
            previousRuntimeState: previousManimRuntimeStateRef.current?.sceneId === manimRuntimeState.sceneId ? previousManimRuntimeStateRef.current : undefined,
            runtimeState: manimRuntimeState,
            scene: manimScene
          })
        : null,
    [manimRuntimeState, manimScene]
  );
  const manimMobjectDirtyStateAttributes = useMemo(
    () => (manimMobjectDirtyStatePayload ? mobjectDirtyStatePayloadDataAttributes(manimMobjectDirtyStatePayload) : null),
    [manimMobjectDirtyStatePayload]
  );
  const manimMobjectDirtyStateJson = useMemo(
    () => (manimMobjectDirtyStatePayload ? serializeMobjectDirtyStatePayload(manimMobjectDirtyStatePayload) : ""),
    [manimMobjectDirtyStatePayload]
  );
  const manimMobjectPointCloudTable = useMemo(
    () => (manimRuntimeState ? buildMobjectPointCloudTable(manimRuntimeState.objectGraph) : null),
    [manimRuntimeState]
  );
  const manimMobjectPointCloudAttributes = useMemo(
    () => (manimMobjectPointCloudTable ? mobjectPointCloudDataAttributes(manimMobjectPointCloudTable) : null),
    [manimMobjectPointCloudTable]
  );
  const manimMobjectPointCloudJson = useMemo(
    () => (manimMobjectPointCloudTable ? serializeMobjectPointCloudTable(manimMobjectPointCloudTable) : ""),
    [manimMobjectPointCloudTable]
  );
  const manimUpdaterSignaturePlan = useMemo(
    () => (manimRuntimeState ? buildMathUpdaterSignaturePlan(manimRuntimeState.updaters) : null),
    [manimRuntimeState]
  );
  const manimUpdaterSignatureAttributes = useMemo(
    () => (manimUpdaterSignaturePlan ? updaterSignatureDataAttributes(manimUpdaterSignaturePlan) : null),
    [manimUpdaterSignaturePlan]
  );
  const manimUpdaterSignatureJson = useMemo(
    () => (manimUpdaterSignaturePlan ? serializeMathUpdaterSignaturePlan(manimUpdaterSignaturePlan) : ""),
    [manimUpdaterSignaturePlan]
  );
  const manimUpdaterSuspensionPlan = useMemo(
    () =>
      manimRuntimeState && manimMobjectFamilyIndex
        ? buildUpdaterSuspensionPlan({
            familyIndex: manimMobjectFamilyIndex,
            scene: manimScene ?? undefined,
            timeline: manimRuntimeState.timeline,
            updaters: manimRuntimeState.updaters
          })
        : null,
    [manimMobjectFamilyIndex, manimRuntimeState, manimScene]
  );
  const manimUpdaterSuspensionJson = useMemo(
    () => (manimUpdaterSuspensionPlan ? serializeUpdaterSuspensionPlan(manimUpdaterSuspensionPlan) : ""),
    [manimUpdaterSuspensionPlan]
  );
  const manimUpdaterExecutionPlan = useMemo(
    () => (manimRuntimeState ? buildMathUpdaterExecutionPlan(manimRuntimeState) : null),
    [manimRuntimeState]
  );
  const manimUpdaterExecutionAttributes = useMemo(
    () => (manimUpdaterExecutionPlan ? updaterExecutionPlanDataAttributes(manimUpdaterExecutionPlan) : null),
    [manimUpdaterExecutionPlan]
  );
  const manimUpdaterExecutionJson = useMemo(
    () => (manimUpdaterExecutionPlan ? serializeMathUpdaterExecutionPlan(manimUpdaterExecutionPlan) : ""),
    [manimUpdaterExecutionPlan]
  );

  const manimValueTrackerPayload = useMemo(
    () => (manimRuntimeState ? buildMathValueTrackerPayload(manimRuntimeState.trackers) : null),
    [manimRuntimeState]
  );
  const manimValueTrackerAttributes = useMemo(
    () => (manimValueTrackerPayload ? valueTrackerPayloadDataAttributes(manimValueTrackerPayload) : null),
    [manimValueTrackerPayload]
  );
  const manimValueTrackerJson = useMemo(
    () => (manimValueTrackerPayload ? serializeMathValueTrackerPayload(manimValueTrackerPayload) : ""),
    [manimValueTrackerPayload]
  );
  const manimCurvePartialFrame = useMemo(
    () => (manimRuntimeState ? buildActiveCurvePartialFrame(manimRuntimeState) : null),
    [manimRuntimeState]
  );
  const manimCurvePartialJson = useMemo(
    () => (manimCurvePartialFrame ? serializeCurvePartialFrame(manimCurvePartialFrame) : null),
    [manimCurvePartialFrame]
  );
  const manimEvidence = manimFrameStep?.evidence ?? null;
  const manimEvidenceAttributes = useMemo(() => (manimEvidence ? evidenceDataAttributes(manimEvidence) : null), [manimEvidence]);
  const manimAnimationRuntimeEvidence = useMemo<MathAnimationRuntimeEvidence | null>(
    () =>
      manimEvidence
        ? {
            active: manimEvidence.manimAnimationRuntimeActive,
            activePlanCount: manimEvidence.manimAnimationRuntimeActivePlanCount,
            activePlanIds: manimEvidence.manimAnimationRuntimeActivePlanIds,
            easedProgressRange: manimEvidence.manimAnimationRuntimeEasedProgressRange,
            finiteBoundingBoxCount: manimEvidence.manimAnimationRuntimeFiniteBoundingBoxCount,
            laggedProgressRange: manimEvidence.manimAnimationRuntimeLaggedProgressRange,
            mobjectInterpolateRenderPolicy: MOBJECT_INTERPOLATE_RENDER_POLICY,
            nodeCount: manimEvidence.manimAnimationRuntimeNodeCount,
            objectId: manimEvidence.manimAnimationRuntimeObjectId,
            objectIds: manimEvidence.manimAnimationRuntimeObjectIds,
            progress: manimEvidence.manimAnimationRuntimeProgress,
            rateFunctionIds: manimEvidence.manimAnimationRuntimeRateFunctionIds,
            rawProgressRange: manimEvidence.manimAnimationRuntimeRawProgressRange,
            renderKindSummary: manimEvidence.manimAnimationRuntimeRenderKindSummary,
            sourceContract: ANIMATION_RUNTIME_SOURCE_CONTRACT,
            summary: manimEvidence.manimAnimationRuntimeSummary,
            targetObjectId: manimEvidence.manimAnimationRuntimeTargetObjectId
          }
        : null,
    [manimEvidence]
  );
  const manimAnimationRuntimeJson = useMemo(
    () => (manimAnimationRuntimeEvidence ? serializeMathAnimationRuntimeEvidence(manimAnimationRuntimeEvidence) : null),
    [manimAnimationRuntimeEvidence]
  );
  const manimTransformInterpolateBoundingBoxEvidence = useMemo<MathAnimationRuntimeBoundingBoxEvidence | null>(
    () =>
      manimEvidence
        ? {
            emptyBoundingBoxCount: manimEvidence.manimTransformInterpolateEmptyBoundingBoxCount,
            finiteBoundingBoxCount: manimEvidence.manimTransformInterpolateFiniteBoundingBoxCount,
            nodeCount: manimEvidence.manimTransformInterpolateBoundingBoxCount,
            objectIds: manimEvidence.manimTransformInterpolateBoundingBoxObjectIds,
            sourceSummary: MOBJECT_INTERPOLATE_DATA_SOURCE_SUMMARY,
            summary: manimEvidence.manimTransformInterpolateBoundingBoxSummary
          }
        : null,
    [manimEvidence]
  );
  const manimTransformInterpolateBoundingBoxJson = useMemo(
    () =>
      manimTransformInterpolateBoundingBoxEvidence
        ? serializeMathAnimationRuntimeBoundingBoxEvidence(manimTransformInterpolateBoundingBoxEvidence)
        : null,
    [manimTransformInterpolateBoundingBoxEvidence]
  );
  const manimTransformInterpolateUniformEvidence = useMemo<MathAnimationRuntimeUniformEvidence | null>(
    () =>
      manimEvidence
        ? {
            clippingPlaneCount: manimEvidence.manimTransformInterpolateUniformClippingPlaneCount,
            nodeCount: manimEvidence.manimAnimationRuntimeNodeCount,
            objectIds: manimEvidence.manimTransformInterpolateUniformObjectIds,
            opacityRange: manimEvidence.manimTransformInterpolateUniformOpacityRange,
            opacitySampleCount: manimEvidence.manimTransformInterpolateUniformOpacitySampleCount,
            sourceSummary: manimEvidence.manimTransformInterpolateUniformSourceSummary,
            summary: manimEvidence.manimTransformInterpolateUniformSummary,
            uniformNodeCount: manimEvidence.manimTransformInterpolateUniformCount
          }
        : null,
    [manimEvidence]
  );
  const manimTransformInterpolateUniformJson = useMemo(
    () =>
      manimTransformInterpolateUniformEvidence
        ? serializeMathAnimationRuntimeUniformEvidence(manimTransformInterpolateUniformEvidence)
        : null,
    [manimTransformInterpolateUniformEvidence]
  );
  const manimTransformInterpolateFieldEvidence = useMemo<MathAnimationRuntimeInterpolateFieldEvidence | null>(
    () =>
      manimEvidence
        ? {
            arcPathNodeCount: manimEvidence.manimTransformInterpolateFieldArcPathNodeCount,
            boundingBoxNodeCount: manimEvidence.manimTransformInterpolateFieldBoundingBoxNodeCount,
            nodeCount: manimEvidence.manimTransformInterpolateFieldNodeCount,
            nonPointFieldCount: manimEvidence.manimTransformInterpolateFieldNonPointCount,
            nonPointFieldPolicy: manimEvidence.manimTransformInterpolateFieldNonPointPolicy,
            objectIds: manimEvidence.manimTransformInterpolateFieldObjectIds,
            pathSummary: manimEvidence.manimTransformInterpolateFieldPathSummary,
            pointlikeFieldCount: manimEvidence.manimTransformInterpolateFieldPointlikeCount,
            pointlikeFieldPolicy: manimEvidence.manimTransformInterpolateFieldPointlikePolicy,
            pointlikeFieldSummary: manimEvidence.manimTransformInterpolateFieldPointlikeSummary,
            sourceSummary: manimEvidence.manimTransformInterpolateFieldSourceSummary,
            straightPathNodeCount: manimEvidence.manimTransformInterpolateFieldStraightPathNodeCount,
            styleNodeCount: manimEvidence.manimTransformInterpolateFieldStyleNodeCount,
            summary: manimEvidence.manimTransformInterpolateFieldSummary,
            uniformNodeCount: manimEvidence.manimTransformInterpolateFieldUniformNodeCount
          }
        : null,
    [manimEvidence]
  );
  const manimTransformInterpolateFieldJson = useMemo(
    () =>
      manimTransformInterpolateFieldEvidence
        ? serializeMathAnimationRuntimeInterpolateFieldEvidence(manimTransformInterpolateFieldEvidence)
        : null,
    [manimTransformInterpolateFieldEvidence]
  );
  const manimTimelineEvidence = useMemo<MathTimelineEvidence | null>(
    () =>
      manimEvidence
        ? {
            activeConceptId: manimEvidence.manimTimelineActiveConceptId,
            activeStepIndex: manimEvidence.manimTimelineActiveStepIndex,
            activeStepType: manimEvidence.manimTimelineActiveStepType as MathTimelineEvidence["activeStepType"],
            cameraStepCount: manimEvidence.manimTimelineCameraStepCount,
            completedStepCount: manimEvidence.manimTimelineCompletedStepCount,
            elapsedSeconds: manimEvidence.manimTimelineElapsedSeconds,
            focusTargetCount: manimEvidence.manimTimelineFocusTargetCount,
            focusTargetIds: manimEvidence.manimTimelineFocusTargetIds,
            focusTargetPolicy: TIMELINE_FOCUS_TARGET_POLICY,
            focusTargetPrimaryId: manimEvidence.manimTimelineFocusTargetPrimaryId,
            focusTargetSummary: manimEvidence.manimTimelineFocusTargetSummary,
            pendingStepCount: manimEvidence.manimTimelinePendingStepCount,
            progress: manimEvidence.manimTimelineProgress,
            reducedMotion: manimEvidence.manimTimelineReducedMotion,
            skipAnimations: manimEvidence.manimTimelineSkipAnimations,
            sourceContract: TIMELINE_SOURCE_CONTRACT,
            stepCount: manimEvidence.manimTimelineStepCount,
            stepTypeSummary: manimEvidence.manimTimelineStepTypeSummary,
            summary: manimEvidence.manimTimelineSummary,
            totalDuration: manimEvidence.manimTimelineTotalDuration,
            waitStepCount: manimEvidence.manimTimelineWaitStepCount
          }
        : null,
    [manimEvidence]
  );
  const manimTimelineJson = useMemo(
    () => (manimTimelineEvidence ? serializeTimelineEvidence(manimTimelineEvidence) : null),
    [manimTimelineEvidence]
  );
  const manimTransformPathFunctionCatalog = useMemo<TransformPathFunctionCatalog | null>(
    () =>
      manimEvidence
        ? {
            animationPlanCount: manimEvidence.manimTransformPathPlanCount,
            arcAngleRange: manimEvidence.manimTransformPathArcAngleRange,
            arcAxisSummary: manimEvidence.manimTransformPathArcAxisSummary,
            arcMidpointDeviationRange: manimEvidence.manimTransformPathArcMidpointDeviationRange,
            arcPathCount: manimEvidence.manimTransformPathArcCount,
            authoredPathCount: manimEvidence.manimTransformPathAuthoredCount,
            degenerateArcCount: manimEvidence.manimTransformPathDegenerateArcCount,
            entries: manimEvidence.manimTransformPathEntries,
            midpointDeviationSummary: manimEvidence.manimTransformPathMidpointDeviationSummary,
            nonPointFieldPolicy: TRANSFORM_PATH_NON_POINT_FIELD_POLICY,
            objectIds: manimEvidence.manimTransformPathObjectIds,
            pathSummaries: manimEvidence.manimTransformPathSummaries,
            pointlikeFieldPolicy: TRANSFORM_PATH_POINTLIKE_FIELD_POLICY,
            sampleAlpha: manimEvidence.manimTransformPathSampleAlpha,
            sampledMidpointSummary: manimEvidence.manimTransformPathSampledMidpoints,
            sampledPathCount: manimEvidence.manimTransformPathSampledCount,
            sceneId: manimEvidence.sceneId,
            sourceContract: TRANSFORM_PATH_FUNCTION_SOURCE_CONTRACT,
            straightPathCount: manimEvidence.manimTransformPathStraightCount,
            summary: manimEvidence.manimTransformPathSummary
          }
        : null,
    [manimEvidence]
  );
  const manimTransformPathJson = useMemo(
    () =>
      manimTransformPathFunctionCatalog
        ? serializeTransformPathFunctionCatalog(manimTransformPathFunctionCatalog)
        : null,
    [manimTransformPathFunctionCatalog]
  );
  const manimTransformFamilyAlignmentPlan = useMemo<TransformFamilyAlignmentPlan | null>(
    () =>
      manimEvidence
        ? {
            entries: manimEvidence.manimTransformFamilyAlignmentEntries,
            sourceRootId: manimEvidence.manimTransformFamilyAlignmentSourceRootId,
            targetRootId: manimEvidence.manimTransformFamilyAlignmentTargetRootId
          }
        : null,
    [manimEvidence]
  );
  const manimTransformFamilyAlignmentJson = useMemo(
    () =>
      manimTransformFamilyAlignmentPlan
        ? serializeTransformFamilyAlignmentPlan(manimTransformFamilyAlignmentPlan)
        : null,
    [manimTransformFamilyAlignmentPlan]
  );
  const manimTransformPointAlignmentPlan = useMemo<TransformPointAlignmentBridgePlan | null>(
    () =>
      manimTransformFamilyAlignmentPlan
        ? buildTransformPointAlignmentBridgePlan(manimTransformFamilyAlignmentPlan)
        : null,
    [manimTransformFamilyAlignmentPlan]
  );
  const manimTransformPointAlignmentAttributes = useMemo(
    () =>
      manimTransformPointAlignmentPlan
        ? transformPointAlignmentBridgeDataAttributes(manimTransformPointAlignmentPlan)
        : null,
    [manimTransformPointAlignmentPlan]
  );
  const manimTransformPointAlignmentJson = useMemo(
    () =>
      manimTransformPointAlignmentPlan
        ? serializeTransformPointAlignmentBridgePlan(manimTransformPointAlignmentPlan)
        : null,
    [manimTransformPointAlignmentPlan]
  );
  const manimTransformDataLockEvidence = useMemo<TransformDataLockEvidence | null>(
    () =>
      manimEvidence
        ? {
            alignmentSummary: manimEvidence.manimTransformDataLockAlignmentSummary,
            kindSummary: manimEvidence.manimTransformDataLockKindSummary,
            lockedPointCount: manimEvidence.manimTransformDataLockLockedPointCount,
            movingPointCount: manimEvidence.manimTransformDataLockMovingPointCount,
            objectIds: manimEvidence.manimTransformDataLockObjectIds,
            planCount: manimEvidence.manimTransformDataLockPlanCount,
            sourceContract: TRANSFORM_DATA_LOCK_SOURCE_CONTRACT,
            summary: manimEvidence.manimTransformDataLockSummary,
            targetObjectIds: manimEvidence.manimTransformDataLockTargetObjectIds,
            totalPointCount: manimEvidence.manimTransformDataLockTotalPointCount
          }
        : null,
    [manimEvidence]
  );
  const manimTransformDataLockJson = useMemo(
    () => (manimTransformDataLockEvidence ? serializeTransformDataLockEvidence(manimTransformDataLockEvidence) : null),
    [manimTransformDataLockEvidence]
  );
  const manimRateFunctionCatalog = useMemo<MathRateFunctionCatalog | null>(
    () =>
      manimEvidence
        ? {
            alphaPolicy: RATE_FUNCTION_ALPHA_POLICY,
            entries: manimEvidence.manimRateFunctionEntries,
            linearDuration: manimEvidence.manimRateFunctionLinearDuration,
            linearStepCount: manimEvidence.manimRateFunctionLinearCount,
            rateFunctionIds: manimEvidence.manimRateFunctionIds,
            sceneId: manimEvidence.sceneId,
            smoothDuration: manimEvidence.manimRateFunctionSmoothDuration,
            smoothStepCount: manimEvidence.manimRateFunctionSmoothCount,
            sourceContract: RATE_FUNCTION_SOURCE_CONTRACT,
            stepCount: manimEvidence.manimRateFunctionStepCount,
            stepTypes: manimEvidence.manimRateFunctionStepTypes,
            summary: manimEvidence.manimRateFunctionSummary
          }
        : null,
    [manimEvidence]
  );
  const manimRateFunctionJson = useMemo(
    () => (manimRateFunctionCatalog ? serializeRateFunctionCatalog(manimRateFunctionCatalog) : null),
    [manimRateFunctionCatalog]
  );
  const manimLagRatioCatalog = useMemo<MathLagRatioCatalog | null>(
    () =>
      manimEvidence
        ? {
            animationPlanCount: manimEvidence.manimLagRatioAnimationPlanCount,
            authoredLagRatioCount: manimEvidence.manimLagRatioAuthoredCount,
            compositionCount: manimEvidence.manimLagRatioCompositionCount,
            compositionIds: manimEvidence.manimLagRatioCompositionIds,
            entries: manimEvidence.manimLagRatioEntries,
            maxLagRatio: manimEvidence.manimLagRatioMax,
            nonZeroLagRatioCount: manimEvidence.manimLagRatioNonZeroCount,
            objectIds: manimEvidence.manimLagRatioObjectIds,
            sceneId: manimEvidence.sceneId,
            sourceContract: LAG_RATIO_SOURCE_CONTRACT,
            subAlphaPolicy: LAG_RATIO_SUB_ALPHA_POLICY,
            summary: manimEvidence.manimLagRatioSummary,
            zeroLagRatioCount: manimEvidence.manimLagRatioZeroCount
          }
        : null,
    [manimEvidence]
  );
  const manimLagRatioJson = useMemo(
    () => (manimLagRatioCatalog ? serializeLagRatioCatalog(manimLagRatioCatalog) : null),
    [manimLagRatioCatalog]
  );
  const manimSubAlphaSchedule = useMemo<MathSubAlphaSchedule | null>(
    () =>
      manimEvidence
        ? {
            activePlanCount: manimEvidence.manimSubAlphaActivePlanCount,
            completeNodeCount: manimEvidence.manimSubAlphaCompleteNodeCount,
            delayedNodeCount: manimEvidence.manimSubAlphaDelayedNodeCount,
            easedMax: manimEvidence.manimSubAlphaEasedMax,
            easedMin: manimEvidence.manimSubAlphaEasedMin,
            easedRange: manimEvidence.manimSubAlphaEasedRange,
            familyZipCoveredNodeCount: manimEvidence.manimSubAlphaFamilyZipCoveredNodeCount,
            familyZipMissingNodeCount: manimEvidence.manimSubAlphaFamilyZipMissingNodeCount,
            familyZipPolicy: manimEvidence.manimSubAlphaFamilyZipPolicy,
            familyZipSequence: manimEvidence.manimSubAlphaFamilyZipSequence,
            familyZipTupleCount: manimEvidence.manimSubAlphaFamilyZipTupleCount,
            familyZipUncoveredObjectIds: manimEvidence.manimSubAlphaFamilyZipUncoveredObjectIds,
            laggedMax: manimEvidence.manimSubAlphaLaggedMax,
            laggedMin: manimEvidence.manimSubAlphaLaggedMin,
            laggedRange: manimEvidence.manimSubAlphaLaggedRange,
            leadingNodeCount: manimEvidence.manimSubAlphaLeadingNodeCount,
            nodeFrameCount: manimEvidence.manimSubAlphaNodeCount,
            nodeWindowSummary: manimEvidence.manimSubAlphaNodeWindowSummary,
            objectIds: manimEvidence.manimSubAlphaObjectIds,
            partialNodeCount: manimEvidence.manimSubAlphaPartialNodeCount,
            rateFunctionIds: manimEvidence.manimSubAlphaRateFunctionIds,
            rawMax: manimEvidence.manimSubAlphaRawMax,
            rawMin: manimEvidence.manimSubAlphaRawMin,
            rawRange: manimEvidence.manimSubAlphaRawRange,
            sceneId: manimEvidence.sceneId,
            sourceContract: SUB_ALPHA_SOURCE_CONTRACT,
            staggeredNodeCount: manimEvidence.manimSubAlphaStaggeredNodeCount,
            summary: manimEvidence.manimSubAlphaSummary,
            windowPolicy: SUB_ALPHA_WINDOW_POLICY,
            zeroNodeCount: manimEvidence.manimSubAlphaZeroNodeCount
          }
        : null,
    [manimEvidence]
  );
  const manimSubAlphaJson = useMemo(
    () => (manimSubAlphaSchedule ? serializeSubAlphaSchedule(manimSubAlphaSchedule) : null),
    [manimSubAlphaSchedule]
  );
  const manimAnimationCompositionEvidence = useMemo<AnimationCompositionFrameEvidence | null>(
    () =>
      manimEvidence
        ? {
            activeCompositionId: manimEvidence.manimAnimationCompositionActiveId,
            activeCompositionType: manimEvidence.manimAnimationCompositionActiveType as AnimationCompositionFrameEvidence["activeCompositionType"],
            activeWindowCount: manimEvidence.manimAnimationCompositionActiveWindowCount,
            activeWindowIds: manimEvidence.manimAnimationCompositionActiveWindowIds,
            completedWindowCount: manimEvidence.manimAnimationCompositionCompletedWindowCount,
            completedWindowIds: manimEvidence.manimAnimationCompositionCompletedWindowIds,
            compositionCount: manimEvidence.manimAnimationCompositionCount,
            elapsedSeconds: manimEvidence.manimAnimationCompositionFrameElapsedSeconds,
            pendingWindowCount: manimEvidence.manimAnimationCompositionPendingWindowCount,
            pendingWindowIds: manimEvidence.manimAnimationCompositionPendingWindowIds,
            progress: manimEvidence.manimAnimationCompositionFrameProgress,
            sourceContract: ANIMATION_COMPOSITION_FRAME_SOURCE_CONTRACT,
            summary: manimEvidence.manimAnimationCompositionFrameSummary,
            timingPolicy: manimEvidence.manimAnimationCompositionTimingPolicy as AnimationCompositionFrameEvidence["timingPolicy"],
            windowSummary: manimEvidence.manimAnimationCompositionWindowSummary
          }
        : null,
    [manimEvidence]
  );
  const manimAnimationCompositionJson = useMemo(
    () => (manimAnimationCompositionEvidence ? serializeAnimationCompositionFrameEvidence(manimAnimationCompositionEvidence) : null),
    [manimAnimationCompositionEvidence]
  );
  const manimCameraDirectorEvidence = useMemo<CameraDirectorEvidence | null>(
    () =>
      manimEvidence
        ? {
            activeShotId: manimEvidence.manimCameraDirectorActiveShotId,
            activeUpdaterCount: manimEvidence.manimCameraDirectorActiveUpdaterCount,
            activeUpdaterIds: manimEvidence.manimCameraDirectorActiveUpdaterIds,
            ambientRotationDegrees: manimEvidence.manimCameraDirectorAmbientRotationDegrees,
            canonicalShotId: manimEvidence.manimCameraDirectorCanonicalShotId,
            progress: manimEvidence.manimCameraDirectorProgress,
            resetShotId: manimEvidence.manimCameraDirectorResetShotId,
            shotFov: manimEvidence.manimCameraDirectorShotFov,
            shotPosition: manimEvidence.manimCameraDirectorShotPosition,
            shotTarget: manimEvidence.manimCameraDirectorShotTarget,
            sourceContract: CAMERA_DIRECTOR_SOURCE_CONTRACT,
            summary: manimEvidence.manimCameraDirectorSummary,
            timelineShotId: manimEvidence.manimCameraDirectorTimelineShotId,
            transitionSummary: manimEvidence.manimCameraDirectorTransitionSummary,
            updaterCount: manimEvidence.manimCameraDirectorUpdaterCount
          }
        : null,
    [manimEvidence]
  );
  const manimCameraDirectorJson = useMemo(
    () => (manimCameraDirectorEvidence ? serializeCameraDirectorEvidence(manimCameraDirectorEvidence) : null),
    [manimCameraDirectorEvidence]
  );
  const manimCameraFrameUpdaterPayload = useMemo(
    () => (manimScene ? buildCameraFrameUpdaterPayload(manimScene, manimElapsedSeconds) : null),
    [manimElapsedSeconds, manimScene]
  );
  const manimCameraFrameUpdaterJson = useMemo(
    () => (manimCameraFrameUpdaterPayload ? serializeCameraFrameUpdaterPayload(manimCameraFrameUpdaterPayload) : ""),
    [manimCameraFrameUpdaterPayload]
  );
  const manimSceneInitializationEvidence = useMemo<MathSceneInitializationEvidence | null>(
    () =>
      manimEvidence
        ? {
            cameraFrameId: manimEvidence.cameraShot,
            cameraFrameReady: manimEvidence.manimSceneInitCameraFrameReady,
            cameraId: manimEvidence.cameraShot,
            cameraReady: manimEvidence.manimSceneInitCameraReady,
            fileWriterReady: manimEvidence.manimSceneInitFileWriterReady,
            numPlays: manimEvidence.manimSceneInitNumPlays,
            randomSeedSignature: manimEvidence.manimSceneInitRandomSeedSignature,
            ready: manimEvidence.manimSceneInitReady,
            redoStackCount: manimEvidence.manimSceneInitRedoCount,
            renderGroupCount: manimEvidence.manimSceneInitRenderGroupCount,
            renderGroupIds: manimEvidence.manimSceneInitRenderGroupIds,
            sceneId: manimEvidence.sceneId,
            sceneTimeSeconds: manimEvidence.manimSceneInitTimeSeconds,
            sourceContract: SCENE_INITIALIZATION_SOURCE_CONTRACT,
            sourceSummary: manimEvidence.manimSceneInitSourceSummary,
            summary: manimEvidence.manimSceneInitSummary,
            topLevelMobjectCount: manimEvidence.manimSceneInitTopLevelMobjectCount,
            undoStackCount: manimEvidence.manimSceneInitUndoCount
          }
        : null,
    [manimEvidence]
  );
  const manimSceneInitializationJson = useMemo(
    () => (manimSceneInitializationEvidence ? serializeMathSceneInitializationEvidence(manimSceneInitializationEvidence) : null),
    [manimSceneInitializationEvidence]
  );
  const manimSceneGraphSummary = useMemo<MathSceneGraphSummary | null>(
    () =>
      manimEvidence
        ? {
            fixedInFrameCount: manimEvidence.sceneFixedInFrameCount,
            fixedInFrameIds: manimEvidence.sceneFixedInFrameIds,
            foregroundCount: manimEvidence.sceneForegroundCount,
            foregroundIds: manimEvidence.sceneForegroundIds,
            renderGroupCount: manimEvidence.sceneRenderGroupCount,
            renderGroupIds: manimEvidence.sceneRenderGroupIds,
            renderGroupOverlapCount: manimEvidence.sceneRenderGroupOverlapCount,
            renderGroupOverlapIds: manimEvidence.sceneRenderGroupOverlapIds,
            sceneRenderableCount: manimEvidence.sceneRenderableCount,
            sceneRenderableIds: manimEvidence.sceneRenderableIds,
            topLevelCount: manimEvidence.sceneTopLevelMobjectCount
          }
        : null,
    [manimEvidence]
  );
  const manimSceneGraphJson = useMemo(
    () => (manimSceneGraphSummary ? serializeSceneGraphSummary(manimSceneGraphSummary) : null),
    [manimSceneGraphSummary]
  );
  const manimRenderBatchPlan = useMemo<MathSceneRenderBatchPlan | null>(
    () =>
      manimEvidence
        ? {
            batchCount: manimEvidence.manimRenderBatchCount,
            batches: manimEvidence.manimRenderBatchRows,
            objectCount: manimEvidence.manimRenderBatchObjectCount,
            skippedObjectIds: manimEvidence.manimRenderBatchSkippedIds === "none"
              ? []
              : manimEvidence.manimRenderBatchSkippedIds.split(","),
            sourceContract: SCENE_RENDER_BATCH_SOURCE_CONTRACT,
            summary: manimEvidence.manimRenderBatchSummary
          }
        : null,
    [manimEvidence]
  );
  const manimRenderBatchJson = useMemo(
    () => (manimRenderBatchPlan ? serializeSceneRenderBatchPlan(manimRenderBatchPlan) : null),
    [manimRenderBatchPlan]
  );
  const manimSceneMembershipState = useMemo<MathSceneMembershipState | null>(() => {
    if (!manimEvidence) return null;
    const parseIds = (value: string) => value === "none" ? [] : value.split(",").filter(Boolean);

    return {
      activeIntroducerIds: parseIds(manimEvidence.sceneMembershipActiveIntroducerIds),
      activeRemoverIds: parseIds(manimEvidence.sceneMembershipActiveRemoverIds),
      excludedObjectIds: parseIds(manimEvidence.sceneMembershipExcludedIds),
      eventSummary: manimEvidence.sceneMembershipEventSummary,
      pendingIntroducerIds: parseIds(manimEvidence.sceneMembershipPendingIntroducerIds),
      removedObjectIds: parseIds(manimEvidence.sceneMembershipRemovedIds),
      sourceContract: SCENE_MEMBERSHIP_SOURCE_CONTRACT,
      sourceSummary: manimEvidence.sceneMembershipSourceSummary
    };
  }, [manimEvidence]);
  const manimSceneMembershipJson = useMemo(
    () => (manimSceneMembershipState ? serializeSceneMembershipState(manimSceneMembershipState) : null),
    [manimSceneMembershipState]
  );
  const manimSceneRestructurePlan = useMemo<MathSceneRestructurePlan | null>(() => {
    if (!manimEvidence) return null;
    const parseIds = (value: string) => value === "none" ? [] : value.split(",").filter(Boolean);

    return {
      detachedRootIds: parseIds(manimEvidence.sceneRestructureDetachedRootIds),
      removedObjectIds: parseIds(manimEvidence.sceneRestructureRemovedIds),
      requestedObjectIds: parseIds(manimEvidence.sceneRestructureRequestedIds),
      restructuredParentIds: parseIds(manimEvidence.sceneRestructureParentIds),
      sourceContract: SCENE_RESTRUCTURE_SOURCE_CONTRACT,
      summary: manimEvidence.sceneRestructureSummary
    };
  }, [manimEvidence]);
  const manimSceneRestructureJson = useMemo(
    () => (manimSceneRestructurePlan ? serializeSceneRestructurePlan(manimSceneRestructurePlan) : null),
    [manimSceneRestructurePlan]
  );
  const manimSceneClearMobjectPlan = useMemo<MathSceneClearMobjectBridgePlan | null>(() => {
    if (!manimEvidence) return null;
    const parseIds = (value: string) => value === "none" ? [] : value.split(",").filter(Boolean);

    return {
      afterFixedInFrameIds: parseIds(manimEvidence.sceneClearMobjectAfterFixedInFrameIds),
      afterForegroundIds: parseIds(manimEvidence.sceneClearMobjectAfterForegroundIds),
      afterRenderGroupIds: parseIds(manimEvidence.sceneClearMobjectAfterRenderGroupIds),
      afterSceneIds: parseIds(manimEvidence.sceneClearMobjectAfterSceneIds),
      beforeFixedInFrameIds: parseIds(manimEvidence.sceneClearMobjectBeforeFixedInFrameIds),
      beforeForegroundIds: parseIds(manimEvidence.sceneClearMobjectBeforeForegroundIds),
      beforeRenderGroupIds: parseIds(manimEvidence.sceneClearMobjectBeforeRenderGroupIds),
      beforeSceneIds: parseIds(manimEvidence.sceneClearMobjectBeforeSceneIds),
      cleared: manimEvidence.sceneClearMobjectCleared,
      clearedObjectCount: manimEvidence.sceneClearMobjectClearedObjectCount,
      clearedObjectIds: parseIds(manimEvidence.sceneClearMobjectClearedObjectIds),
      objectCatalogCount: manimEvidence.sceneClearMobjectObjectCatalogCount,
      sourceContract: SCENE_CLEAR_MOBJECT_BRIDGE_SOURCE_CONTRACT,
      summary: manimEvidence.sceneClearMobjectSummary,
      version: "mais-manim-scene-clear-mobject-bridge/v1"
    };
  }, [manimEvidence]);
  const manimSceneClearMobjectJson = useMemo(
    () => (manimSceneClearMobjectPlan ? serializeSceneClearMobjectBridgePlan(manimSceneClearMobjectPlan) : null),
    [manimSceneClearMobjectPlan]
  );
  const manimSceneRemoveAllExceptMobjectPlan = useMemo<MathSceneRemoveAllExceptMobjectBridgePlan | null>(() => {
    if (!manimEvidence) return null;
    const parseIds = (value: string) => value === "none" ? [] : value.split(",").filter(Boolean);

    return {
      afterFixedInFrameIds: parseIds(manimEvidence.sceneRemoveAllExceptMobjectAfterFixedInFrameIds),
      afterForegroundIds: parseIds(manimEvidence.sceneRemoveAllExceptMobjectAfterForegroundIds),
      afterRenderGroupIds: parseIds(manimEvidence.sceneRemoveAllExceptMobjectAfterRenderGroupIds),
      afterSceneIds: parseIds(manimEvidence.sceneRemoveAllExceptMobjectAfterSceneIds),
      beforeFixedInFrameIds: parseIds(manimEvidence.sceneRemoveAllExceptMobjectBeforeFixedInFrameIds),
      beforeForegroundIds: parseIds(manimEvidence.sceneRemoveAllExceptMobjectBeforeForegroundIds),
      beforeRenderGroupIds: parseIds(manimEvidence.sceneRemoveAllExceptMobjectBeforeRenderGroupIds),
      beforeSceneIds: parseIds(manimEvidence.sceneRemoveAllExceptMobjectBeforeSceneIds),
      changed: manimEvidence.sceneRemoveAllExceptMobjectChanged,
      keptObjectCount: manimEvidence.sceneRemoveAllExceptMobjectKeptCount,
      keptObjectIds: parseIds(manimEvidence.sceneRemoveAllExceptMobjectKeptIds),
      objectCatalogCount: manimEvidence.sceneRemoveAllExceptMobjectObjectCatalogCount,
      removedObjectCount: manimEvidence.sceneRemoveAllExceptMobjectRemovedCount,
      removedObjectIds: parseIds(manimEvidence.sceneRemoveAllExceptMobjectRemovedIds),
      requestedKeepIds: parseIds(manimEvidence.sceneRemoveAllExceptMobjectRequestedKeepIds),
      sourceContract: SCENE_REMOVE_ALL_EXCEPT_MOBJECT_BRIDGE_SOURCE_CONTRACT,
      summary: manimEvidence.sceneRemoveAllExceptMobjectSummary,
      version: "mais-manim-scene-remove-all-except-mobject-bridge/v1"
    };
  }, [manimEvidence]);
  const manimSceneRemoveAllExceptMobjectJson = useMemo(
    () => (
      manimSceneRemoveAllExceptMobjectPlan
        ? serializeSceneRemoveAllExceptMobjectBridgePlan(manimSceneRemoveAllExceptMobjectPlan)
        : null
    ),
    [manimSceneRemoveAllExceptMobjectPlan]
  );
  const manimSceneBringToFrontMobjectPlan = useMemo<MathSceneBringToFrontMobjectBridgePlan | null>(() => {
    if (!manimEvidence) return null;
    const parseIds = (value: string) => value === "none" ? [] : value.split(",").filter(Boolean);

    return {
      afterFixedInFrameIds: parseIds(manimEvidence.sceneBringToFrontMobjectAfterFixedInFrameIds),
      afterForegroundIds: parseIds(manimEvidence.sceneBringToFrontMobjectAfterForegroundIds),
      afterRenderGroupIds: parseIds(manimEvidence.sceneBringToFrontMobjectAfterRenderGroupIds),
      afterSceneIds: parseIds(manimEvidence.sceneBringToFrontMobjectAfterSceneIds),
      beforeFixedInFrameIds: parseIds(manimEvidence.sceneBringToFrontMobjectBeforeFixedInFrameIds),
      beforeForegroundIds: parseIds(manimEvidence.sceneBringToFrontMobjectBeforeForegroundIds),
      beforeRenderGroupIds: parseIds(manimEvidence.sceneBringToFrontMobjectBeforeRenderGroupIds),
      beforeSceneIds: parseIds(manimEvidence.sceneBringToFrontMobjectBeforeSceneIds),
      group: manimEvidence.sceneBringToFrontMobjectGroup,
      moved: manimEvidence.sceneBringToFrontMobjectMoved,
      nextIndex: manimEvidence.sceneBringToFrontMobjectNextIndex,
      objectId: manimEvidence.sceneBringToFrontMobjectObjectId,
      previousIndex: manimEvidence.sceneBringToFrontMobjectPreviousIndex,
      sourceContract: SCENE_BRING_TO_FRONT_MOBJECT_BRIDGE_SOURCE_CONTRACT,
      summary: manimEvidence.sceneBringToFrontMobjectSummary,
      version: "mais-manim-scene-bring-to-front-mobject-bridge/v1"
    };
  }, [manimEvidence]);
  const manimSceneBringToFrontMobjectJson = useMemo(
    () => (
      manimSceneBringToFrontMobjectPlan
        ? serializeSceneBringToFrontMobjectBridgePlan(manimSceneBringToFrontMobjectPlan)
        : null
    ),
    [manimSceneBringToFrontMobjectPlan]
  );
  const manimSceneSendToBackMobjectPlan = useMemo<MathSceneSendToBackMobjectBridgePlan | null>(() => {
    if (!manimEvidence) return null;
    const parseIds = (value: string) => value === "none" ? [] : value.split(",").filter(Boolean);

    return {
      afterFixedInFrameIds: parseIds(manimEvidence.sceneSendToBackMobjectAfterFixedInFrameIds),
      afterForegroundIds: parseIds(manimEvidence.sceneSendToBackMobjectAfterForegroundIds),
      afterRenderGroupIds: parseIds(manimEvidence.sceneSendToBackMobjectAfterRenderGroupIds),
      afterSceneIds: parseIds(manimEvidence.sceneSendToBackMobjectAfterSceneIds),
      beforeFixedInFrameIds: parseIds(manimEvidence.sceneSendToBackMobjectBeforeFixedInFrameIds),
      beforeForegroundIds: parseIds(manimEvidence.sceneSendToBackMobjectBeforeForegroundIds),
      beforeRenderGroupIds: parseIds(manimEvidence.sceneSendToBackMobjectBeforeRenderGroupIds),
      beforeSceneIds: parseIds(manimEvidence.sceneSendToBackMobjectBeforeSceneIds),
      group: manimEvidence.sceneSendToBackMobjectGroup,
      moved: manimEvidence.sceneSendToBackMobjectMoved,
      nextIndex: manimEvidence.sceneSendToBackMobjectNextIndex,
      objectId: manimEvidence.sceneSendToBackMobjectObjectId,
      previousIndex: manimEvidence.sceneSendToBackMobjectPreviousIndex,
      sourceContract: SCENE_SEND_TO_BACK_MOBJECT_BRIDGE_SOURCE_CONTRACT,
      summary: manimEvidence.sceneSendToBackMobjectSummary,
      version: "mais-manim-scene-send-to-back-mobject-bridge/v1"
    };
  }, [manimEvidence]);
  const manimSceneSendToBackMobjectJson = useMemo(
    () => (
      manimSceneSendToBackMobjectPlan
        ? serializeSceneSendToBackMobjectBridgePlan(manimSceneSendToBackMobjectPlan)
        : null
    ),
    [manimSceneSendToBackMobjectPlan]
  );
  const manimSceneAddMobjectPlan = useMemo<MathSceneAddMobjectBridgePlan | null>(() => {
    if (!manimEvidence) return null;
    const parseIds = (value: string) => value === "none" ? [] : value.split(",").filter(Boolean);
    const group = manimEvidence.sceneAddMobjectGroup;

    return {
      afterFixedInFrameIds: parseIds(manimEvidence.sceneAddMobjectAfterFixedInFrameIds),
      afterForegroundIds: parseIds(manimEvidence.sceneAddMobjectAfterForegroundIds),
      afterRenderGroupIds: parseIds(manimEvidence.sceneAddMobjectAfterRenderGroupIds),
      afterSceneIds: parseIds(manimEvidence.sceneAddMobjectAfterSceneIds),
      beforeFixedInFrameIds: parseIds(manimEvidence.sceneAddMobjectBeforeFixedInFrameIds),
      beforeForegroundIds: parseIds(manimEvidence.sceneAddMobjectBeforeForegroundIds),
      beforeRenderGroupIds: parseIds(manimEvidence.sceneAddMobjectBeforeRenderGroupIds),
      beforeSceneIds: parseIds(manimEvidence.sceneAddMobjectBeforeSceneIds),
      added: manimEvidence.sceneAddMobjectAdded,
      group: group === "foreground" || group === "fixedInFrame" ? group : "scene",
      objectId: manimEvidence.sceneAddMobjectObjectId,
      restoredFamilyCount: manimEvidence.sceneAddMobjectRestoredFamilyCount,
      restoredFamilyIds: parseIds(manimEvidence.sceneAddMobjectRestoredFamilyIds),
      sourceContract: SCENE_ADD_MOBJECT_BRIDGE_SOURCE_CONTRACT,
      summary: manimEvidence.sceneAddMobjectSummary,
      version: "mais-manim-scene-add-mobject-bridge/v1"
    };
  }, [manimEvidence]);
  const manimSceneAddMobjectJson = useMemo(
    () => (manimSceneAddMobjectPlan ? serializeSceneAddMobjectBridgePlan(manimSceneAddMobjectPlan) : null),
    [manimSceneAddMobjectPlan]
  );
  const manimSceneReplaceMobjectPlan = useMemo<MathSceneReplaceMobjectBridgePlan | null>(() => {
    if (!manimEvidence) return null;
    const parseIds = (value: string) => value === "none" ? [] : value.split(",").filter(Boolean);
    const group = manimEvidence.sceneReplaceMobjectGroup;

    return {
      afterRenderGroupIds: parseIds(manimEvidence.sceneReplaceMobjectAfterRenderGroupIds),
      beforeRenderGroupIds: parseIds(manimEvidence.sceneReplaceMobjectBeforeRenderGroupIds),
      group: group === "foreground" || group === "fixedInFrame" ? group : "scene",
      objectId: manimEvidence.sceneReplaceMobjectObjectId,
      removedFamilyIds: parseIds(manimEvidence.sceneReplaceMobjectRemovedFamilyIds),
      replaced: manimEvidence.sceneReplaceMobjectReplaced,
      replacementCount: manimEvidence.sceneReplaceMobjectReplacementCount,
      replacementIds: parseIds(manimEvidence.sceneReplaceMobjectReplacementIds),
      requestedReplacementIds: parseIds(manimEvidence.sceneReplaceMobjectRequestedReplacementIds),
      restoredReplacementFamilyIds: parseIds(manimEvidence.sceneReplaceMobjectRestoredReplacementFamilyIds),
      sourceContract: SCENE_REPLACE_MOBJECT_BRIDGE_SOURCE_CONTRACT,
      summary: manimEvidence.sceneReplaceMobjectSummary,
      version: "mais-manim-scene-replace-mobject-bridge/v1"
    };
  }, [manimEvidence]);
  const manimSceneReplaceMobjectJson = useMemo(
    () => (manimSceneReplaceMobjectPlan ? serializeSceneReplaceMobjectBridgePlan(manimSceneReplaceMobjectPlan) : null),
    [manimSceneReplaceMobjectPlan]
  );
  const manimSceneRemoveMobjectPlan = useMemo<MathSceneRemoveMobjectBridgePlan | null>(() => {
    if (!manimEvidence) return null;
    const parseIds = (value: string) => value === "none" ? [] : value.split(",").filter(Boolean);

    return {
      afterFixedInFrameIds: parseIds(manimEvidence.sceneRemoveMobjectAfterFixedInFrameIds),
      afterForegroundIds: parseIds(manimEvidence.sceneRemoveMobjectAfterForegroundIds),
      afterRenderGroupIds: parseIds(manimEvidence.sceneRemoveMobjectAfterRenderGroupIds),
      afterSceneIds: parseIds(manimEvidence.sceneRemoveMobjectAfterSceneIds),
      beforeFixedInFrameIds: parseIds(manimEvidence.sceneRemoveMobjectBeforeFixedInFrameIds),
      beforeForegroundIds: parseIds(manimEvidence.sceneRemoveMobjectBeforeForegroundIds),
      beforeRenderGroupIds: parseIds(manimEvidence.sceneRemoveMobjectBeforeRenderGroupIds),
      beforeSceneIds: parseIds(manimEvidence.sceneRemoveMobjectBeforeSceneIds),
      descendantRemovedIds: parseIds(manimEvidence.sceneRemoveMobjectDescendantRemovedIds),
      objectId: manimEvidence.sceneRemoveMobjectObjectId,
      removed: manimEvidence.sceneRemoveMobjectRemoved,
      removedFamilyCount: manimEvidence.sceneRemoveMobjectRemovedFamilyCount,
      removedFamilyIds: parseIds(manimEvidence.sceneRemoveMobjectRemovedFamilyIds),
      sourceContract: SCENE_REMOVE_MOBJECT_BRIDGE_SOURCE_CONTRACT,
      summary: manimEvidence.sceneRemoveMobjectSummary,
      version: "mais-manim-scene-remove-mobject-bridge/v1"
    };
  }, [manimEvidence]);
  const manimSceneRemoveMobjectJson = useMemo(
    () => (manimSceneRemoveMobjectPlan ? serializeSceneRemoveMobjectBridgePlan(manimSceneRemoveMobjectPlan) : null),
    [manimSceneRemoveMobjectPlan]
  );
  const manimPickResult = useMemo<MathScenePickResult | null>(() => {
    if (!manimEvidence?.manimPickHit) return null;
    const group = manimEvidence.manimPickGroup;
    if (group !== "scene" && group !== "foreground" && group !== "fixedInFrame") return null;

    return {
      buff: manimEvidence.manimPickBuff,
      conceptId: manimEvidence.manimPickConceptId,
      distanceToCenter: manimEvidence.manimPickDistanceToCenter,
      group,
      objectId: manimEvidence.manimPickObjectId,
      renderIndex: manimEvidence.manimPickRenderIndex,
      searchOrderIndex: manimEvidence.manimPickSearchOrderIndex,
      sourceContract: manimEvidence.manimPickSourceContract,
      summary: manimEvidence.manimPickSummary
    };
  }, [manimEvidence]);
  const manimPickJson = useMemo(
    () => (manimScene ? serializeScenePickResult(manimPickResult) : null),
    [manimPickResult, manimScene]
  );
  const runtimeDiagnostics = manimEvidence ?? {
    activeStep: "none",
    activeConceptId: "none",
    cameraAmbientRotationDegrees: 0,
    cameraCanonicalShot: "default",
    cameraShot: "default",
    cameraUpdaterActiveCount: 0,
    cameraUpdaterActiveIds: "none",
    cameraUpdaterCount: 0,
    manimCameraDirectorActiveShotId: "default",
    manimCameraDirectorActiveUpdaterCount: 0,
    manimCameraDirectorActiveUpdaterIds: "none",
    manimCameraDirectorAmbientRotationDegrees: 0,
    manimCameraDirectorCanonicalShotId: "default",
    manimCameraDirectorProgress: 1,
    manimCameraDirectorResetShotId: "default",
    manimCameraDirectorShotFov: 48,
    manimCameraDirectorShotPosition: "none",
    manimCameraDirectorShotTarget: "none",
    manimCameraDirectorSourceContract: CAMERA_DIRECTOR_SOURCE_CONTRACT,
    manimCameraDirectorSummary:
      "camera-director:active=default:canonical=default:reset=default:timeline=none:progress=1.000:updaters=0:activeUpdaters=0:ambient=0.000",
    manimCameraDirectorTimelineShotId: "none",
    manimCameraDirectorTransitionSummary: "camera-director-transition:default->default@1.000",
    manimCameraDirectorUpdaterCount: 0,
    curvePartialLength: 0,
    curvePartialNormalizedRange: "none",
    curvePartialRequestedRange: "none",
    curvePartialReversed: false,
    curvePartialSampleCount: 0,
    curvePartialSourceContract: VMOBJECT_PARTIAL_CURVE_SOURCE_CONTRACT,
    curvePartialSourceId: "none",
    curvePartialSummary: "none",
    curvePartialVisibilityPolicy: VMOBJECT_PARTIAL_CURVE_VISIBILITY_POLICY,
    formulaBindingAnchorCount: 0,
    formulaBindingMissingAnchorCount: 0,
    formulaBindingMissingAnchorTokenIds: "none",
    formulaTokenCount: 0,
    formulaTokenIds: "none",
    manimProjectedLabelConceptIds: "none",
    manimProjectedLabelCount: 0,
    manimProjectedLabelHiddenCount: 0,
    manimProjectedLabelHiddenObjectIds: "none",
    manimProjectedLabelObjectCount: 0,
    manimProjectedLabelObjectIds: "none",
    manimProjectedLabelSourceContract: PROJECTED_LABEL_SOURCE_CONTRACT,
    manimProjectedLabelSummary: "projectedLabels=0:visible=0:hidden=0:objects=none:concepts=none:hiddenObjects=none",
    manimProjectedLabelVisibleCount: 0,
    manimActiveAnimationNodeCount: 0,
    manimActiveAnimationObjectId: "none",
    manimActiveAnimationPlanId: "none",
    manimActiveAnimationPlanIds: "none",
    manimActiveAnimationProgress: 1,
    manimActiveAnimationTargetObjectId: "none",
    manimTransformInterpolateBoundingBoxCount: 0,
    manimTransformInterpolateBoundingBoxObjectIds: "none",
    manimTransformInterpolateBoundingBoxSummary: "transform-interpolate-bounds:nodes=0:finite=0:empty=0:ids=none",
    manimTransformInterpolateEmptyBoundingBoxCount: 0,
    manimTransformInterpolateFiniteBoundingBoxCount: 0,
    manimTransformInterpolateUniformClippingPlaneCount: 0,
    manimTransformInterpolateUniformCount: 0,
    manimTransformInterpolateUniformObjectIds: "none",
    manimTransformInterpolateUniformOpacityRange: "none",
    manimTransformInterpolateUniformOpacitySampleCount: 0,
    manimTransformInterpolateUniformSourceSummary: "Mobject.interpolate:start-target-data+uniforms+bounding-boxes",
    manimTransformInterpolateUniformSummary:
      "transform-interpolate-uniforms:nodes=0:uniforms=0:opacitySamples=0:clipPlanes=0:opacityRange=none:ids=none",
    manimTransformFamilyAlignmentEnteringCount: 0,
    manimTransformFamilyAlignmentEntryCount: 0,
    manimTransformFamilyAlignmentExitingCount: 0,
    manimTransformFamilyAlignmentFamilyPairSequence: "none",
    manimTransformFamilyAlignmentFamilyZipCompleteCount: 0,
    manimTransformFamilyAlignmentFamilyZipIncompleteCount: 0,
    manimTransformFamilyAlignmentFamilyZipPolicy: TRANSFORM_FAMILY_ALIGNMENT_ZIP_POLICY,
    manimTransformFamilyAlignmentFamilyZipSequence: "none",
    manimTransformFamilyAlignmentFamilyZipTupleCount: 0,
    manimTransformFamilyAlignmentMatchedCount: 0,
    manimTransformFamilyAlignmentMaxDepth: 0,
    manimTransformFamilyAlignmentPointCountPolicy: TRANSFORM_FAMILY_ALIGNMENT_POINT_COUNT_POLICY,
    manimTransformFamilyAlignmentSourceContract: TRANSFORM_FAMILY_ALIGNMENT_SOURCE_CONTRACT,
    manimTransformFamilyAlignmentSourceRootId: "none",
    manimTransformFamilyAlignmentSummary:
      "transform-family-align:source=none:target=none:entries=0:matched=0:entering=0:exiting=0:typeMismatch=0:maxDepth=0",
    manimTransformFamilyAlignmentTargetRootId: "none",
    manimTransformFamilyAlignmentTypeMismatchCount: 0,
    manimTransformPointAlignmentCompatibleCount: 0,
    manimTransformPointAlignmentMatchedCount: 0,
    manimTransformPointAlignmentPolicySummary: "none",
    manimTransformPointAlignmentResampledCount: 0,
    manimTransformPointAlignmentRowSummary: "none",
    manimTransformPointAlignmentSourceContract: TRANSFORM_POINT_ALIGNMENT_BRIDGE_SOURCE_CONTRACT,
    manimTransformPointAlignmentSourceRootId: "none",
    manimTransformPointAlignmentSummary: "transform-point-align:source=none:target=none:matched=0:compatible=0:resampled=0:points=0",
    manimTransformPointAlignmentTargetRootId: "none",
    manimTransformPointAlignmentTotalPointCount: 0,
    manimTransformPointAlignmentVmobjectAlignedCurveCount: 0,
    manimTransformPointAlignmentVmobjectSourceContract: "none",
    manimTransformPointAlignmentVmobjectSourceInsertNCurvesCount: 0,
    manimTransformPointAlignmentVmobjectTargetInsertNCurvesCount: 0,
    manimTransformDataLockAlignmentSummary: "none",
    manimTransformDataLockKindSummary: "none",
    manimTransformDataLockLockedPointCount: 0,
    manimTransformDataLockMovingPointCount: 0,
    manimTransformDataLockObjectIds: "none",
    manimTransformDataLockPlanCount: 0,
    manimTransformDataLockSourceContract: TRANSFORM_DATA_LOCK_SOURCE_CONTRACT,
    manimTransformDataLockSummary: "transform-data-lock:plans=0:total=0:locked=0:moving=0:objects=none:kinds=none",
    manimTransformDataLockTargetObjectIds: "none",
    manimTransformDataLockTotalPointCount: 0,
    manimAnimationCompositionCount: 0,
    manimAnimationCompositionDuration: 0,
    manimAnimationCompositionIssueCount: 0,
    manimAnimationCompositionModes: "none",
    manimAnimationCompositionWindowCount: 0,
    manimAnimationObjectCount: 0,
    manimAnimationOperationCount: 0,
    manimAnimationPlanCount: 0,
    manimPlaybackActiveEventSummary: "none",
    manimPlaybackActivePlayIndex: -1,
    manimPlaybackCompletedPlayCount: 0,
    manimPlaybackEventCount: 0,
    manimPlaybackLifecyclePhase: "none",
    manimPlaybackLifecycleSummary: "none",
    manimPlaybackPendingPlayCount: 0,
    manimPlaybackUpdatesDuringActivePlay: false,
    manimRandomSeed: 0,
    manimRandomSeedAlgorithm: "none",
    manimRandomSeedSignature: "none",
    manimTransformStepCount: 0,
    manimTransformPathArcAngleRange: "none",
    manimTransformPathArcAxisSummary: "none",
    manimTransformPathArcMidpointDeviationRange: "none",
    manimTransformPathArcCount: 0,
    manimTransformPathAuthoredCount: 0,
    manimTransformPathDegenerateArcCount: 0,
    manimTransformPathMidpointDeviationSummary: "none",
    manimTransformPathNonPointFieldPolicy: TRANSFORM_PATH_NON_POINT_FIELD_POLICY,
    manimTransformPathObjectIds: "none",
    manimTransformPathPointlikeFieldPolicy: TRANSFORM_PATH_POINTLIKE_FIELD_POLICY,
    manimTransformPathPlanCount: 0,
    manimTransformPathSampleAlpha: 0.5,
    manimTransformPathSampledCount: 0,
    manimTransformPathSampledMidpoints: "none",
    manimTransformPathSourceContract: TRANSFORM_PATH_FUNCTION_SOURCE_CONTRACT,
    manimTransformPathStraightCount: 0,
    manimTransformPathSummaries: "none",
    manimTransformPathSummary: `transformPaths:${manimScene?.sceneId ?? `primitive-${state.familyId}`}:plans=0:authored=0:arc=0:straight=0:objects=none:paths=none`,
    manimRateFunctionAlphaPolicy: RATE_FUNCTION_ALPHA_POLICY,
    manimRateFunctionIds: "none",
    manimRateFunctionLinearCount: 0,
    manimRateFunctionLinearDuration: 0,
    manimRateFunctionSmoothCount: 0,
    manimRateFunctionSmoothDuration: 0,
    manimRateFunctionSourceContract: RATE_FUNCTION_SOURCE_CONTRACT,
    manimRateFunctionStepCount: 0,
    manimRateFunctionStepTypes: "none",
    manimRateFunctionSummary: `rateFunctions:${manimScene?.sceneId ?? `primitive-${state.familyId}`}:steps=0:linear=0/0.000:smooth=0/0.000:ids=none:types=none`,
    manimLagRatioAnimationPlanCount: 0,
    manimLagRatioAuthoredCount: 0,
    manimLagRatioCompositionCount: 0,
    manimLagRatioCompositionIds: "none",
    manimLagRatioMax: 0,
    manimLagRatioNonZeroCount: 0,
    manimLagRatioObjectIds: "none",
    manimLagRatioSourceContract: LAG_RATIO_SOURCE_CONTRACT,
    manimLagRatioSubAlphaPolicy: LAG_RATIO_SUB_ALPHA_POLICY,
    manimLagRatioSummary: `lagRatios:${manimScene?.sceneId ?? `primitive-${state.familyId}`}:plans=0:compositions=0:authored=0:nonzero=0:zero=0:max=0.000:objects=none:compositions=none`,
    manimLagRatioZeroCount: 0,
    manimSubAlphaActivePlanCount: 0,
    manimSubAlphaCompleteNodeCount: 0,
    manimSubAlphaDelayedNodeCount: 0,
    manimSubAlphaEasedMax: 0,
    manimSubAlphaEasedMin: 0,
    manimSubAlphaEasedRange: "0.000..0.000",
    manimSubAlphaFamilyZipCoveredNodeCount: 0,
    manimSubAlphaFamilyZipMissingNodeCount: 0,
    manimSubAlphaFamilyZipPolicy: TRANSFORM_FAMILY_ALIGNMENT_ZIP_POLICY,
    manimSubAlphaFamilyZipSequence: "none",
    manimSubAlphaFamilyZipTupleCount: 0,
    manimSubAlphaFamilyZipUncoveredObjectIds: "none",
    manimSubAlphaLaggedMax: 0,
    manimSubAlphaLaggedMin: 0,
    manimSubAlphaLaggedRange: "0.000..0.000",
    manimSubAlphaLeadingNodeCount: 0,
    manimSubAlphaNodeCount: 0,
    manimSubAlphaObjectIds: "none",
    manimSubAlphaPartialNodeCount: 0,
    manimSubAlphaRateFunctionIds: "none",
    manimSubAlphaRawMax: 0,
    manimSubAlphaRawMin: 0,
    manimSubAlphaRawRange: "0.000..0.000",
    manimSubAlphaSourceContract: SUB_ALPHA_SOURCE_CONTRACT,
    manimSubAlphaStaggeredNodeCount: 0,
    manimSubAlphaSummary: `subAlpha:${manimScene?.sceneId ?? `primitive-${state.familyId}`}:nodes=0:plans=0:raw=0.000..0.000:lag=0.000..0.000:eased=0.000..0.000:staggered=0:lead=0:delay=0:zero=0:partial=0:complete=0:rates=none:objects=none`,
    manimSubAlphaWindowPolicy: SUB_ALPHA_WINDOW_POLICY,
    manimSubAlphaZeroNodeCount: 0,
    mathObjectCount: 0,
    mobjectAnimationOwnedInvalidationCount: 0,
    mobjectBoundingBoxStaleCount: 0,
    mobjectDataChangedCount: 0,
    mobjectFamilyCacheReusable: false,
    mobjectFamilyCacheStatus: "none",
    mobjectFamilyCacheSummary: "none",
    mobjectFamilyMemberCount: 0,
    mobjectFamilyChangedCount: 0,
    mobjectFamilyRootCount: 0,
    mobjectFamilySourceContract: MOBJECT_FAMILY_SOURCE_CONTRACT,
    mobjectInvalidatedIds: "none",
    mobjectInvalidationOwnershipSummary: "none",
    mobjectInvalidationReasons: "none",
    mobjectInvalidationSummary: "data=0;bbox=0;family=0;metadata=0;unchanged=0",
    mobjectMaxDepth: 0,
    mobjectMetadataChangedCount: 0,
    mobjectOrphanCount: 0,
    mobjectStateSnapshotCount: 0,
    mobjectTargetableCount: 0,
    mobjectClippingPlaneCount: 0,
    mobjectFixedInFrameUniformCount: 0,
    mobjectShadeIn3DCount: 0,
    mobjectTransparentCount: 0,
    mobjectUniformCount: 0,
    mobjectUniformSummary: "objects=0;fixed=0;shade3d=0;clipPlanes=0;transparent=0;minOpacity=1.000",
    mobjectUnknownInvalidationCount: 0,
    mobjectUpdaterActiveInvalidationCount: 0,
    objectCount: 0,
    odeTrajectoryBoundsSummary: "none",
    odeTrajectoryCount: 0,
    odeTrajectoryFiniteSampleCount: 0,
    odeTrajectoryInitialStateSummary: "none",
    odeTrajectoryMethodIds: "none",
    odeTrajectorySampleCount: 0,
    odeTrajectorySolverContract: "none",
    odeTrajectoryStepCountSummary: "none",
    odeTrajectoryStepSizeSummary: "none",
    odeTrajectoryStoppedCount: 0,
    odeTrajectoryStoppedReasonSummary: "completed=0;non-finite-derivative=0;out-of-bounds=0",
    odeTrajectorySummary: "odeTrajectories=0;samples=0;finite=0;stopped=0;tails=0;ids=none",
    odeTrajectorySystemSummary: "none",
    odeTrajectoryTailSampleCount: 0,
    odeTrajectoryTimeRangeSummary: "none",
    parameterTrackerCount: 0,
    parameterTrackerIds: "none",
    parameterTrackerSummary: "none",
    parameterTrackerValues: "none",
    reducedMotion: false,
    sceneFixedInFrameCount: 0,
    sceneFixedInFrameIds: "none",
    sceneForegroundCount: 0,
    sceneForegroundIds: "none",
    sceneId: manimScene?.sceneId ?? `primitive-${state.familyId}`,
    sceneMembershipActiveIntroducerCount: 0,
    sceneMembershipActiveIntroducerIds: "none",
    sceneMembershipActiveRemoverCount: 0,
    sceneMembershipActiveRemoverIds: "none",
    sceneMembershipEventSummary: "none",
    sceneMembershipExcludedCount: 0,
    sceneMembershipExcludedIds: "none",
    sceneMembershipPendingIntroducerCount: 0,
    sceneMembershipPendingIntroducerIds: "none",
    sceneMembershipRemovedCount: 0,
    sceneMembershipRemovedIds: "none",
    sceneMembershipSourceContract: SCENE_MEMBERSHIP_SOURCE_CONTRACT,
    sceneMembershipSourceSummary: "membership:events=0:introducers=none:removers=none",
    sceneRestructureDetachedRootCount: 0,
    sceneRestructureDetachedRootIds: "none",
    sceneRestructureParentCount: 0,
    sceneRestructureParentIds: "none",
    sceneRestructureRemovedCount: 0,
    sceneRestructureRemovedIds: "none",
    sceneRestructureRequestedCount: 0,
    sceneRestructureRequestedIds: "none",
    sceneRestructureSourceContract: SCENE_RESTRUCTURE_SOURCE_CONTRACT,
    sceneRestructureSummary: "restructure:requested=none:parents=none:removed=none:detached=none",
    sceneClearMobjectAfterFixedInFrameIds: "none",
    sceneClearMobjectAfterForegroundIds: "none",
    sceneClearMobjectAfterRenderGroupIds: "none",
    sceneClearMobjectAfterSceneIds: "none",
    sceneClearMobjectBeforeFixedInFrameIds: "none",
    sceneClearMobjectBeforeForegroundIds: "none",
    sceneClearMobjectBeforeRenderGroupIds: "none",
    sceneClearMobjectBeforeSceneIds: "none",
    sceneClearMobjectCleared: false,
    sceneClearMobjectClearedObjectCount: 0,
    sceneClearMobjectClearedObjectIds: "none",
    sceneClearMobjectObjectCatalogCount: 0,
    sceneClearMobjectSourceContract: SCENE_CLEAR_MOBJECT_BRIDGE_SOURCE_CONTRACT,
    sceneClearMobjectSummary: "scene-clear:cleared=false:ids=none:render=none:catalog=0",
    sceneRemoveAllExceptMobjectAfterFixedInFrameIds: "none",
    sceneRemoveAllExceptMobjectAfterForegroundIds: "none",
    sceneRemoveAllExceptMobjectAfterRenderGroupIds: "none",
    sceneRemoveAllExceptMobjectAfterSceneIds: "none",
    sceneRemoveAllExceptMobjectBeforeFixedInFrameIds: "none",
    sceneRemoveAllExceptMobjectBeforeForegroundIds: "none",
    sceneRemoveAllExceptMobjectBeforeRenderGroupIds: "none",
    sceneRemoveAllExceptMobjectBeforeSceneIds: "none",
    sceneRemoveAllExceptMobjectChanged: false,
    sceneRemoveAllExceptMobjectKeptCount: 0,
    sceneRemoveAllExceptMobjectKeptIds: "none",
    sceneRemoveAllExceptMobjectObjectCatalogCount: 0,
    sceneRemoveAllExceptMobjectRemovedCount: 0,
    sceneRemoveAllExceptMobjectRemovedIds: "none",
    sceneRemoveAllExceptMobjectRequestedKeepIds: "none",
    sceneRemoveAllExceptMobjectSourceContract: SCENE_REMOVE_ALL_EXCEPT_MOBJECT_BRIDGE_SOURCE_CONTRACT,
    sceneRemoveAllExceptMobjectSummary: "scene-remove-all-except:keep=none:changed=false:removed=none:render=none:catalog=0",
    sceneBringToFrontMobjectAfterFixedInFrameIds: "none",
    sceneBringToFrontMobjectAfterForegroundIds: "none",
    sceneBringToFrontMobjectAfterRenderGroupIds: "none",
    sceneBringToFrontMobjectAfterSceneIds: "none",
    sceneBringToFrontMobjectBeforeFixedInFrameIds: "none",
    sceneBringToFrontMobjectBeforeForegroundIds: "none",
    sceneBringToFrontMobjectBeforeRenderGroupIds: "none",
    sceneBringToFrontMobjectBeforeSceneIds: "none",
    sceneBringToFrontMobjectGroup: "scene" as const,
    sceneBringToFrontMobjectMoved: false,
    sceneBringToFrontMobjectNextIndex: -1,
    sceneBringToFrontMobjectObjectId: "none",
    sceneBringToFrontMobjectPreviousIndex: -1,
    sceneBringToFrontMobjectSourceContract: SCENE_BRING_TO_FRONT_MOBJECT_BRIDGE_SOURCE_CONTRACT,
    sceneBringToFrontMobjectSummary: "scene-bring-to-front:none:group=scene:moved=false:index=-1->-1:render=none",
    sceneSendToBackMobjectAfterFixedInFrameIds: "none",
    sceneSendToBackMobjectAfterForegroundIds: "none",
    sceneSendToBackMobjectAfterRenderGroupIds: "none",
    sceneSendToBackMobjectAfterSceneIds: "none",
    sceneSendToBackMobjectBeforeFixedInFrameIds: "none",
    sceneSendToBackMobjectBeforeForegroundIds: "none",
    sceneSendToBackMobjectBeforeRenderGroupIds: "none",
    sceneSendToBackMobjectBeforeSceneIds: "none",
    sceneSendToBackMobjectGroup: "scene" as const,
    sceneSendToBackMobjectMoved: false,
    sceneSendToBackMobjectNextIndex: -1,
    sceneSendToBackMobjectObjectId: "none",
    sceneSendToBackMobjectPreviousIndex: -1,
    sceneSendToBackMobjectSourceContract: SCENE_SEND_TO_BACK_MOBJECT_BRIDGE_SOURCE_CONTRACT,
    sceneSendToBackMobjectSummary: "scene-send-to-back:none:group=scene:moved=false:index=-1->-1:render=none",
    sceneAddMobjectAfterFixedInFrameIds: "none",
    sceneAddMobjectAfterForegroundIds: "none",
    sceneAddMobjectAfterRenderGroupIds: "none",
    sceneAddMobjectAfterSceneIds: "none",
    sceneAddMobjectBeforeFixedInFrameIds: "none",
    sceneAddMobjectBeforeForegroundIds: "none",
    sceneAddMobjectBeforeRenderGroupIds: "none",
    sceneAddMobjectBeforeSceneIds: "none",
    sceneAddMobjectAdded: false,
    sceneAddMobjectGroup: "scene",
    sceneAddMobjectObjectId: "none",
    sceneAddMobjectRestoredFamilyCount: 0,
    sceneAddMobjectRestoredFamilyIds: "none",
    sceneAddMobjectSourceContract: SCENE_ADD_MOBJECT_BRIDGE_SOURCE_CONTRACT,
    sceneAddMobjectSummary: "scene-add:none:group=scene:added=false:restored=none:render=none",
    sceneReplaceMobjectAfterRenderGroupIds: "none",
    sceneReplaceMobjectBeforeRenderGroupIds: "none",
    sceneReplaceMobjectGroup: "scene",
    sceneReplaceMobjectObjectId: "none",
    sceneReplaceMobjectRemovedFamilyIds: "none",
    sceneReplaceMobjectReplaced: false,
    sceneReplaceMobjectReplacementCount: 0,
    sceneReplaceMobjectReplacementIds: "none",
    sceneReplaceMobjectRequestedReplacementIds: "none",
    sceneReplaceMobjectRestoredReplacementFamilyIds: "none",
    sceneReplaceMobjectSourceContract: SCENE_REPLACE_MOBJECT_BRIDGE_SOURCE_CONTRACT,
    sceneReplaceMobjectSummary: "scene-replace:none->none:group=scene:replaced=false:removed=none:restored=none",
    sceneRemoveMobjectAfterFixedInFrameIds: "none",
    sceneRemoveMobjectAfterForegroundIds: "none",
    sceneRemoveMobjectAfterRenderGroupIds: "none",
    sceneRemoveMobjectAfterSceneIds: "none",
    sceneRemoveMobjectBeforeFixedInFrameIds: "none",
    sceneRemoveMobjectBeforeForegroundIds: "none",
    sceneRemoveMobjectBeforeRenderGroupIds: "none",
    sceneRemoveMobjectBeforeSceneIds: "none",
    sceneRemoveMobjectDescendantRemovedIds: "none",
    sceneRemoveMobjectObjectId: "none",
    sceneRemoveMobjectRemoved: false,
    sceneRemoveMobjectRemovedFamilyCount: 0,
    sceneRemoveMobjectRemovedFamilyIds: "none",
    sceneRemoveMobjectSourceContract: SCENE_REMOVE_MOBJECT_BRIDGE_SOURCE_CONTRACT,
    sceneRemoveMobjectSummary: "scene-remove:none:removed=false:family=none:descendants=none:render=none",
    sceneRenderableCount: 0,
    sceneRenderableIds: "none",
    sceneRenderGroupCount: 0,
    sceneRenderGroupIds: "none",
    sceneRenderGroupOverlapCount: 0,
    sceneRenderGroupOverlapIds: "none",
    sceneTopLevelMobjectCount: 0,
    semanticBindingCount: 0,
    semanticBindingConceptIds: "none",
    streamLineAnimatedWindowCount: 0,
    streamLineCompletedLineCount: 0,
    streamLineCount: 0,
    streamLineCoordinateModeSummary: "math=0;world=0",
    streamLineCycleSecondsSummary: "none",
    streamLineFramePhaseOrder: "none",
    streamLineFrameFiniteVisibleLengthCount: 0,
    streamLineFramePlanSegmentCount: 0,
    streamLineFramePlanSourceContract: STREAM_LINE_FRAME_PLAN_SOURCE_CONTRACT,
    streamLineFramePlanVisibleLineCount: 0,
    streamLineFrameVisibleLengthRange: "none",
    streamLineFrameVisibleLengthSummary: "none",
    streamLineFrameWindowRangeSummary: "none",
    streamLineIntegrationStepSummary: "none",
    streamLineObjectCount: 0,
    streamLinePhaseOffsetRange: "none",
    streamLinePointCount: 0,
    streamLineRevealWindowSummary: "none",
    streamLineSeedGridSummary: "none",
    streamLineSetCount: 0,
    streamLineStoppedLineCount: 0,
    streamLineSummary: "streamLineSets=0;lines=0;completed=0;stopped=0;points=0;visible=0;objects=0;ids=none",
    streamLineSystemSummary: "none",
    streamLineVisiblePointCount: 0,
    streamLineVisibleProgressSummary: "none",
    streamLineWrappedWindowCount: 0,
    trackerCount: 0,
    updaterActiveCount: 0,
    updaterCount: 0,
    updaterSuspendedCount: 0,
    vectorFieldArrowCount: 0,
    vectorFieldArrowLengthRange: "none",
    vectorFieldColorBandSummary: "high:0,mid:0,low:0,zero:0",
    vectorFieldCoordinateModeSummary: "math=0;world=0",
    vectorFieldCount: 0,
    vectorFieldFiniteArrowLengthCount: 0,
    vectorFieldFiniteVectorCount: 0,
    vectorFieldHighBandCount: 0,
    vectorFieldLengthEncodingMonotonic: true,
    vectorFieldLengthEncodingSummary: "lengthEncoding:arrows=0;finite=0;range=none;monotonic=true",
    vectorFieldLowBandCount: 0,
    vectorFieldMaxMagnitude: 0,
    vectorFieldMidBandCount: 0,
    vectorFieldSampleCount: 0,
    vectorFieldSampleGridSummary: "none",
    vectorFieldSummary: "vectorFields=0;samples=0;finite=0;zero=0;bands=high:0,mid:0,low:0,zero:0;arrows=0;max=0.000;ids=none",
    vectorFieldSystemSummary: "none",
    vectorFieldZeroBandCount: 0,
    vectorFieldZeroVectorCount: 0,
    vmobjectBezierAnchorCount: 0,
    vmobjectBezierCubicSegmentCount: 0,
    vmobjectBezierHandleCount: 0,
    vmobjectBezierPathCount: 0,
    vmobjectBezierSamplePointCount: 0,
    vmobjectBezierSegmentCount: 0,
    vmobjectBezierSummary: "bezierPaths=0;segments=0;cubic=0;anchors=0;handles=0;closed=0;samples=0;ids=none",
    vmobjectBaseNormalObjectIds: "none",
    vmobjectFillCount: 0,
    vmobjectMaxAntiAliasWidth: 0,
    vmobjectMaxJointAngleDegrees: 0,
    vmobjectMaxStrokeWidth: 0,
    vmobjectMinStrokeOpacity: 1,
    vmobjectStrokeZoomScreenSpaceCount: 0,
    vmobjectStrokeZoomWorldSpaceCount: 0,
    vmobjectStyleCount: 0,
    vmobjectStyleObjectIds: "none",
    vmobjectStyleSummary:
      "objects=0;strokeRoles=none;fillRoles=none;transparentStroke=0;filled=0;maxStrokeWidth=0.00;minStrokeOpacity=1.00;maxAntiAliasWidth=0.00;maxJointAngle=0.00;baseNormals=none;strokeZoom=screen-space:0,world-space:0",
    vmobjectTransparentStrokeCount: 0
  };
  const manimCameraShotAttributes = useMemo(
    () => cameraShotCatalogDataAttributes(summarizeCameraShotCatalog(manimCameraShotCatalog, runtimeDiagnostics.cameraShot)),
    [manimCameraShotCatalog, runtimeDiagnostics.cameraShot]
  );
  const manimCameraShotJson = useMemo(
    () => serializeCameraShotCatalog(manimCameraShotCatalog, runtimeDiagnostics.cameraShot),
    [manimCameraShotCatalog, runtimeDiagnostics.cameraShot]
  );
  const manimFormulaLayerActiveIds = useMemo(
    () =>
      Array.from(
        new Set([
          runtimeDiagnostics.activeConceptId,
          manimRuntimeState?.timeline.activeConceptId ?? "",
          ...manimTimelineFocusTargetIds
        ].filter((id) => id !== "" && id !== "none"))
      ),
    [manimRuntimeState, manimTimelineFocusTargetIds, runtimeDiagnostics.activeConceptId]
  );
  const manimFormulaLayer = useMemo(
    () =>
      manimScene
        ? buildFormulaLayerState(manimScene, {
            activeConceptId: runtimeDiagnostics.activeConceptId,
            activeConceptIds: manimFormulaLayerActiveIds
          })
        : null,
    [manimFormulaLayerActiveIds, manimScene, runtimeDiagnostics.activeConceptId]
  );
  const manimProjectedLabelTextByObjectId = useMemo(
    () => (manimFormulaLayer ? buildActiveProjectedLabelTextByObjectId(manimFormulaLayer) : {}),
    [manimFormulaLayer]
  );
  const manimProjectedLabelTextAttributes = useMemo(
    () =>
      formulaLayerProjectedLabelTextDataAttributes(
        manimFormulaLayer
          ? summarizeActiveProjectedLabelText(manimFormulaLayer)
          : emptyFormulaLayerProjectedLabelTextSummary()
      ),
    [manimFormulaLayer]
  );
  const manimMeasuredProjectedLabels = useMemo(
    () =>
      manimFormulaLayer && manimRuntimeState
        ? buildProjectedLabelAnchorsFromRuntimeState(manimRuntimeState, manimFormulaOverlayViewport, {
            anchorForObject: (node) => manimFormulaLayer.activeObjectAnchorNames[node.id] ?? "center",
            includeHidden: false,
            objectIds: manimFormulaLayer.activeObjectIds,
            textForObject: (node) => manimProjectedLabelTextByObjectId[node.id] ?? node.conceptId
          })
        : [],
    [manimFormulaLayer, manimFormulaOverlayViewport, manimProjectedLabelTextByObjectId, manimRuntimeState]
  );
  const manimMeasuredProjectedLabelSummary = useMemo(
    () => summarizeProjectedLabelAnchors(manimMeasuredProjectedLabels),
    [manimMeasuredProjectedLabels]
  );
  const manimProjectedLabelJson = useMemo(
    () => serializeProjectedLabelAnchors(manimMeasuredProjectedLabels),
    [manimMeasuredProjectedLabels]
  );
  const manimFormulaCollisionDiagnostics = useMemo(
    () =>
      buildFormulaOverlayCollisionDiagnostics({
        formulaId: manimFormulaLayer?.formulas[0]?.id ?? "none",
        projectedLabels: manimMeasuredProjectedLabels,
        tokenCount: manimFormulaLayer?.formulas.reduce((sum, entry) => sum + entry.tokens.length, 0) ?? 0,
        viewport: manimFormulaOverlayViewport
      }),
    [manimFormulaLayer, manimFormulaOverlayViewport, manimMeasuredProjectedLabels]
  );
  const manimFormulaCollisionAttributes = useMemo(
    () => formulaOverlayCollisionDataAttributes(manimFormulaCollisionDiagnostics),
    [manimFormulaCollisionDiagnostics]
  );
  const manimFormulaCollisionJson = useMemo(
    () => serializeFormulaOverlayCollisionDiagnostics(manimFormulaCollisionDiagnostics),
    [manimFormulaCollisionDiagnostics]
  );
  const manimParameterPanelAttributes = useMemo(
    () => parameterPanelDataAttributes(summarizeParameterPanelCatalog(manimParameterPanelCatalog, activeManimParameterId)),
    [activeManimParameterId, manimParameterPanelCatalog]
  );
  const manimParameterPanelJson = useMemo(
    () => serializeParameterPanelCatalog(manimParameterPanelCatalog, activeManimParameterId),
    [activeManimParameterId, manimParameterPanelCatalog]
  );
  const manimSceneSelectorAttributes = useMemo(
    () => mathSceneSelectorDataAttributes(summarizeMathSceneSelectorCatalog(manimSceneSelectorCatalog, manimSelectedSceneFamilyId)),
    [manimSceneSelectorCatalog, manimSelectedSceneFamilyId]
  );
  const manimShortcutCatalog = useMemo(() => buildSceneShortcutCatalog(), []);
  const manimShortcutCatalogJson = useMemo(
    () => serializeSceneShortcutCatalog(manimShortcutCatalog),
    [manimShortcutCatalog]
  );
  const manimHistorySceneId = manimScene?.sceneId ?? `primitive-${state.familyId}`;
  const manimHistorySummary = useMemo(() => summarizeSceneHistory(manimHistoryStore), [manimHistoryStore]);
  const manimHistoryAttributes = useMemo(
    () => sceneHistoryDataAttributes(summarizeSceneHistory(manimHistoryStore)),
    [manimHistoryStore]
  );
  const manimHistoryManifest = useMemo(() => buildSceneHistoryManifest(manimHistoryStore), [manimHistoryStore]);
  const manimHistoryManifestJson = useMemo(
    () => serializeSceneHistoryManifest(manimHistoryManifest),
    [manimHistoryManifest]
  );
  const manimCheckpointKeys = useMemo(() => listCheckpointKeys(manimCheckpointStore), [manimCheckpointStore]);
  const manimCheckpointStoreManifest = useMemo(
    () => buildSceneCheckpointStoreManifest(manimCheckpointStore, {
      invalidateLater: false,
      restoreKey: manimCheckpointKeys.at(-1) ?? null
    }),
    [manimCheckpointKeys, manimCheckpointStore]
  );
  const manimCheckpointStoreAttributes = useMemo(
    () => sceneCheckpointStoreDataAttributes(manimCheckpointStoreManifest),
    [manimCheckpointStoreManifest]
  );
  const manimCheckpointStoreJson = useMemo(
    () => serializeSceneCheckpointStoreManifest(manimCheckpointStoreManifest),
    [manimCheckpointStoreManifest]
  );
  const manimStateSnapshot = useMemo(
    () =>
      manimScene && manimSceneExport
        ? buildMathSceneStateSnapshot({
            activeStep: runtimeDiagnostics.activeStep,
            authoringMode: manimAuthoringMode,
            cameraMode: manimCameraMode,
            cameraShotId: runtimeDiagnostics.cameraShot,
            checkpointKeys: manimCheckpointKeys,
            elapsedSeconds: manimElapsedSeconds,
            frameIndex: manimFrameIndex,
            historySummary: manimHistorySummary,
            objectGraphIdentity: manimRuntimeState
              ? {
                  familyRootIds: manimMobjectFamilyIndex?.topLevelIds ?? [],
                  objectIds: Object.keys(manimRuntimeState.objectGraph.byId),
                  rootIds: manimRuntimeState.objectGraph.rootIds
                }
              : undefined,
            playbackState: manimPlaybackState,
            scene: manimScene,
            sceneSignature: manimSceneExport.signature,
            selectedFamilyId: manimSelectedSceneFamilyId,
            selectedParameterId: activeManimParameterId,
            selectedSceneId: manimScene.sceneId
          })
        : null,
    [
      activeManimParameterId,
      manimAuthoringMode,
      manimCameraMode,
      manimCheckpointKeys,
      manimElapsedSeconds,
      manimFrameIndex,
      manimHistorySummary,
      manimMobjectFamilyIndex,
      manimPlaybackState,
      manimScene,
      manimSceneExport,
      manimSelectedSceneFamilyId,
      manimRuntimeState,
      runtimeDiagnostics.activeStep,
      runtimeDiagnostics.cameraShot
    ]
  );
  const manimStateSnapshotAttributes = useMemo(
    () => (manimStateSnapshot ? sceneStateSnapshotDataAttributes(manimStateSnapshot) : null),
    [manimStateSnapshot]
  );
  const manimStateSnapshotJson = useMemo(
    () => (manimStateSnapshot ? serializeMathSceneStateSnapshot(manimStateSnapshot) : ""),
    [manimStateSnapshot]
  );
  const manimSmokeHookManifest = useMemo(
    () =>
      manimScene && manimSceneExport && manimStateSnapshot
        ? buildMathSceneSmokeHookManifest({
            scene: manimScene,
            sceneExport: manimSceneExport,
            stateSnapshot: manimStateSnapshot
          })
        : null,
    [manimScene, manimSceneExport, manimStateSnapshot]
  );
  const manimSmokeHookAttributes = useMemo(
    () => (manimSmokeHookManifest ? sceneSmokeHookDataAttributes(manimSmokeHookManifest) : null),
    [manimSmokeHookManifest]
  );
  const manimSmokeHookJson = useMemo(
    () => (manimSmokeHookManifest ? serializeMathSceneSmokeHookManifest(manimSmokeHookManifest) : ""),
    [manimSmokeHookManifest]
  );
  const manimTexCacheManifest = useMemo(
    () => (manimScene ? buildMathTexCacheManifest(manimScene) : null),
    [manimScene]
  );
  const manimTexCacheAttributes = useMemo(
    () => (manimTexCacheManifest ? texCacheManifestDataAttributes(manimTexCacheManifest) : null),
    [manimTexCacheManifest]
  );
  const manimTexCacheJson = useMemo(
    () => (manimTexCacheManifest ? serializeMathTexCacheManifest(manimTexCacheManifest) : ""),
    [manimTexCacheManifest]
  );
  const manimTexCompilePipeline = useMemo(
    () => (manimScene ? buildMathTexCompilePipeline(manimScene) : null),
    [manimScene]
  );
  const manimTexCompileAttributes = useMemo(
    () => (manimTexCompilePipeline ? texCompilePipelineDataAttributes(manimTexCompilePipeline) : null),
    [manimTexCompilePipeline]
  );
  const manimTexCompileJson = useMemo(
    () => (manimTexCompilePipeline ? serializeMathTexCompilePipeline(manimTexCompilePipeline) : ""),
    [manimTexCompilePipeline]
  );
  const manimTexColorMap = useMemo(
    () => (manimScene ? buildTexColorMap(manimScene) : null),
    [manimScene]
  );
  const manimTexColorMapAttributes = useMemo(
    () => (manimTexColorMap ? texColorMapDataAttributes(manimTexColorMap) : null),
    [manimTexColorMap]
  );
  const manimTexColorMapJson = useMemo(
    () => (manimTexColorMap ? serializeTexColorMap(manimTexColorMap) : ""),
    [manimTexColorMap]
  );
  const manimTexIsolationEvidence = useMemo(
    () => (manimScene ? buildTexIsolationEvidence(manimScene) : null),
    [manimScene]
  );
  const manimTexIsolationAttributes = useMemo(
    () => (manimTexIsolationEvidence ? texIsolationEvidenceDataAttributes(manimTexIsolationEvidence) : null),
    [manimTexIsolationEvidence]
  );
  const manimTexIsolationJson = useMemo(
    () => (manimTexIsolationEvidence ? serializeTexIsolationEvidence(manimTexIsolationEvidence) : ""),
    [manimTexIsolationEvidence]
  );
  const manimFormulaSvgMorphEvidence = useMemo(
    () => (manimScene ? buildFormulaSvgMorphEvidence(manimScene, { progress: manimRuntimeState?.timeline.easedLocalProgress ?? 0 }) : null),
    [manimRuntimeState?.timeline.easedLocalProgress, manimScene]
  );
  const manimFormulaSvgMorphAttributes = useMemo(
    () => (manimFormulaSvgMorphEvidence ? formulaSvgMorphEvidenceDataAttributes(manimFormulaSvgMorphEvidence) : null),
    [manimFormulaSvgMorphEvidence]
  );
  const manimFormulaSvgMorphRuntimeAttributes = useMemo(
    () =>
      manimScene
        ? formulaSvgMorphRuntimeDataAttributes(
            buildFormulaSvgMorphRuntime(manimScene, {
              formulaId: manimScene.formulas[0]?.id ?? "none",
              progress: manimRuntimeState?.timeline.easedLocalProgress ?? 0
            })
          )
        : null,
    [manimRuntimeState?.timeline.easedLocalProgress, manimScene]
  );
  const manimCheckpointPastePlan = useMemo(
    () =>
      manimScene
        ? buildMathCheckpointPastePlan({
            checkpointKeys: manimCheckpointKeys,
            elapsedSeconds: manimElapsedSeconds,
            sceneId: manimScene.sceneId,
            snippet: manimCheckpointPasteText
          })
        : null,
    [manimCheckpointKeys, manimCheckpointPasteText, manimElapsedSeconds, manimScene]
  );
  const manimCheckpointPasteAttributes = useMemo(
    () => (manimCheckpointPastePlan ? checkpointPastePlanDataAttributes(manimCheckpointPastePlan) : null),
    [manimCheckpointPastePlan]
  );
  const manimCheckpointPastePlanJson = useMemo(
    () => (manimCheckpointPastePlan ? serializeMathCheckpointPastePlan(manimCheckpointPastePlan) : null),
    [manimCheckpointPastePlan]
  );
  const manimPostCellRedrawPlan = useMemo(
    () =>
      manimScene
        ? buildScenePostCellRedrawPlan({
            checkpointKey: manimCheckpointPastePlan?.checkpointKey,
            hasWindow: Boolean(manimCheckpointPastePlan),
            skipAnimations: manimSkipAnimations,
            snippet: manimCheckpointPasteText
          })
        : null,
    [manimCheckpointPastePlan?.checkpointKey, manimCheckpointPasteText, manimScene, manimSkipAnimations]
  );
  const manimPostCellRedrawPlanJson = useMemo(
    () => (manimPostCellRedrawPlan ? serializeScenePostCellRedrawPlan(manimPostCellRedrawPlan) : null),
    [manimPostCellRedrawPlan]
  );
  const manimReloadPlan = useMemo(
    () =>
      buildSceneReloadPlan({
        checkpointCount: manimCheckpointKeys.length,
        elapsedSeconds: manimElapsedSeconds,
        frameIndex: manimFrameIndex,
        sceneId: manimScene?.sceneId ?? null,
        selectedFamilyId: manimSelectedSceneFamilyId,
        selectedSceneId: manimScene?.sceneId ?? null,
        snippet: manimCheckpointPasteText
      }),
    [
      manimCheckpointKeys.length,
      manimCheckpointPasteText,
      manimElapsedSeconds,
      manimFrameIndex,
      manimScene?.sceneId,
      manimSelectedSceneFamilyId
    ]
  );
  const manimReloadPlanJson = useMemo(
    () => serializeSceneReloadPlan(manimReloadPlan),
    [manimReloadPlan]
  );
  const manimRunFromBeatPlan = useMemo(
    () =>
      manimPlaybackPlan
        ? buildSceneRunFromBeatPlan({
            checkpointKeys: manimCheckpointKeys,
            checkpointRestoreKey: manimCheckpointKeys.at(-1),
            compositionReplay: manimRunFromBeatCompositionReplay(manimScene, manimRunFromBeatIndex),
            playStartSeconds: manimPlaybackPlan.plays.map((play) => play.startSeconds),
            playEndSeconds: manimPlaybackPlan.plays.map((play) => play.endSeconds),
            requestedBeatIndex: manimRunFromBeatIndex
          })
        : buildSceneRunFromBeatPlan({
            checkpointKeys: manimCheckpointKeys,
            checkpointRestoreKey: manimCheckpointKeys.at(-1),
            compositionReplay: manimRunFromBeatCompositionReplay(manimScene, manimRunFromBeatIndex),
            requestedBeatIndex: manimRunFromBeatIndex
          }),
    [manimCheckpointKeys, manimPlaybackPlan, manimRunFromBeatIndex]
  );
  const manimRunFromBeatAttributes = useMemo(
    () => sceneRunFromBeatDataAttributes(manimRunFromBeatPlan),
    [manimRunFromBeatPlan]
  );
  const manimRunFromBeatJson = useMemo(
    () => serializeSceneRunFromBeatPlan(manimRunFromBeatPlan),
    [manimRunFromBeatPlan]
  );
  const manimTotalDuration = manimPlaybackPlan?.totalDuration ?? 0;
  const manimScrubProgress = manimTotalDuration > 0 ? Math.min(1, Math.max(0, manimElapsedSeconds / manimTotalDuration)) : 0;
  const manimRenderQualityPlan = useMemo(
    () =>
      buildMathSceneRenderQualityPlan({
        preset: manimRenderQualityPreset,
        rendererMode: manimCaptureKind === "video" ? "capture" : "interactive",
        transparentBackground: manimRenderTransparentBackground,
        viewportHeight: manimFormulaOverlayViewport.height,
        viewportWidth: manimFormulaOverlayViewport.width
      }),
    [
      manimCaptureKind,
      manimFormulaOverlayViewport.height,
      manimFormulaOverlayViewport.width,
      manimRenderQualityPreset,
      manimRenderTransparentBackground
    ]
  );
  const manimFrameAudit = useMemo(
    () =>
      manimScene
        ? buildMathSceneFrameAudit(manimScene, {
            fps: manimRenderQualityPlan.captureFps,
            formulaLayerViewport: manimFormulaOverlayViewport,
            renderQuality: manimRenderQualityPlan,
            skipAnimations: manimSkipAnimations
          })
        : null,
    [manimFormulaOverlayViewport, manimRenderQualityPlan, manimScene, manimSkipAnimations]
  );
  const manimFrameAuditSummary = useMemo(
    () => (manimFrameAudit ? summarizeMathSceneFrameAudit(manimFrameAudit) : null),
    [manimFrameAudit]
  );
  const manimFrameAuditAttributes = useMemo(
    () => (manimFrameAuditSummary ? frameAuditDataAttributes(manimFrameAuditSummary) : null),
    [manimFrameAuditSummary]
  );
  const manimFrameAuditJson = useMemo(
    () => (manimFrameAuditSummary ? serializeMathSceneFrameAuditSummary(manimFrameAuditSummary) : ""),
    [manimFrameAuditSummary]
  );
  const manimRenderQualityAttributes = useMemo(
    () => renderQualityDataAttributes(manimRenderQualityPlan),
    [manimRenderQualityPlan]
  );
  const manimRenderQualityBridgePlan = useMemo(
    () => buildMathSceneRenderQualityBridgePlan(manimRenderQualityPlan),
    [manimRenderQualityPlan]
  );
  const manimRenderQualityBridgeAttributes = useMemo(
    () => renderQualityBridgeDataAttributes(manimRenderQualityBridgePlan),
    [manimRenderQualityBridgePlan]
  );
  const manimRenderQualityBridgeJson = useMemo(
    () => serializeMathSceneRenderQualityBridgePlan(manimRenderQualityBridgePlan),
    [manimRenderQualityBridgePlan]
  );
  const manimRenderQualityPlanJson = useMemo(
    () => serializeMathSceneRenderQualityPlan(manimRenderQualityPlan),
    [manimRenderQualityPlan]
  );
  const canvasBackgroundColor = runtime === "mais-manim" ? manimRenderQualityBridgePlan.backgroundColor : threeDCanvasRendererContract.backgroundColor;
  const background = useMemo(() => new THREE.Color(canvasBackgroundColor), [canvasBackgroundColor]);
  const canvasBackgroundAlpha = runtime === "mais-manim" ? manimRenderQualityBridgePlan.backgroundAlpha : 1;
  const canvasTransparentBackground = runtime === "mais-manim" ? manimRenderQualityBridgePlan.transparentBackground : false;
  const canvasRendererGl = useMemo(() => ({
    ...threeDCanvasRendererContract.gl,
    alpha: runtime === "mais-manim" ? manimRenderQualityBridgePlan.alpha : false,
    antialias: runtime === "mais-manim" ? manimRenderQualityBridgePlan.antialias : threeDCanvasRendererContract.gl.antialias,
    preserveDrawingBuffer: runtime === "mais-manim" ? manimRenderQualityBridgePlan.preserveDrawingBuffer : threeDCanvasRendererContract.gl.preserveDrawingBuffer,
    powerPreference: runtime === "mais-manim" ? manimRenderQualityBridgePlan.powerPreference : "default"
  }), [manimRenderQualityBridgePlan, runtime]);
  const canvasDevicePixelRatio = runtime === "mais-manim" ? manimRenderQualityBridgePlan.devicePixelRatio : threeDCanvasRendererContract.devicePixelRatioRange;
  const manimCapturePlan = useMemo(
    () =>
      manimScene && manimSceneExport
        ? buildMathSceneCapturePlan({
            byteCount: manimCaptureByteCount,
            cameraShotId: runtimeDiagnostics.cameraShot,
            elapsedSeconds: manimElapsedSeconds,
            height: manimCaptureKind === "video" ? undefined : manimFormulaOverlayViewport.height,
            kind: manimCaptureKind,
            renderQuality: manimRenderQualityPlan,
            renderGroups: manimRuntimeState?.sceneGraph.renderGroups,
            requestCount: manimCaptureRequestCount,
            scene: manimScene,
            sceneSignature: manimSceneExport.signature,
            status: manimCaptureStatus,
            width: manimCaptureKind === "video" ? undefined : manimFormulaOverlayViewport.width
          })
        : null,
    [
      manimCaptureByteCount,
      manimCaptureKind,
      manimCaptureRequestCount,
      manimCaptureStatus,
      manimElapsedSeconds,
      manimFormulaOverlayViewport,
      manimRenderQualityPlan,
      manimRuntimeState,
      manimScene,
      manimSceneExport,
      runtimeDiagnostics.cameraShot
    ]
  );
  const manimCaptureAttributes = useMemo(
    () => (manimCapturePlan ? capturePlanDataAttributes(manimCapturePlan) : null),
    [manimCapturePlan]
  );
  const manimCapturePlanJson = useMemo(
    () => (manimCapturePlan ? serializeMathSceneCapturePlan(manimCapturePlan) : ""),
    [manimCapturePlan]
  );
  const manimFileWriterPlan = useMemo(
    () =>
      manimScene && manimSceneExport && manimStateSnapshot && manimSmokeHookManifest && manimCapturePlan
        ? buildMathSceneFileWriterPlan({
            capturePlan: manimCapturePlan,
            scene: manimScene,
            sceneExport: manimSceneExport,
            smokeHook: manimSmokeHookManifest,
            stateSnapshot: manimStateSnapshot
          })
        : null,
    [manimCapturePlan, manimScene, manimSceneExport, manimSmokeHookManifest, manimStateSnapshot]
  );
  const manimFileWriterAttributes = useMemo(
    () => (manimFileWriterPlan ? sceneFileWriterDataAttributes(manimFileWriterPlan) : null),
    [manimFileWriterPlan]
  );
  const manimFileWriterPlanJson = useMemo(
    () => (manimFileWriterPlan ? serializeMathSceneFileWriterPlan(manimFileWriterPlan) : ""),
    [manimFileWriterPlan]
  );
  const manimFileWriterSegmentPlan = useMemo(
    () =>
      manimFileWriterPlan && manimPlaybackPlan
        ? buildSceneFileWriterSegmentPlan(checkpointPasteFileWriterSegmentInput({
            checkpointPastePlan: manimCheckpointPastePlan,
            numPlays: manimPlaybackPlan.plays.length,
            outputSlug: manimFileWriterPlan.outputSlug,
            sceneId: manimFileWriterPlan.sceneId,
            subdivideOutput: true,
            writeToMovie: manimFileWriterPlan.ready
          }))
        : null,
    [manimCheckpointPastePlan, manimFileWriterPlan, manimPlaybackPlan]
  );
  const manimFileWriterSegmentAttributes = useMemo(
    () => (manimFileWriterSegmentPlan ? sceneFileWriterSegmentDataAttributes(manimFileWriterSegmentPlan) : null),
    [manimFileWriterSegmentPlan]
  );
  const manimFileWriterSegmentPlanJson = useMemo(
    () => (manimFileWriterSegmentPlan ? serializeSceneFileWriterSegmentPlan(manimFileWriterSegmentPlan) : ""),
    [manimFileWriterSegmentPlan]
  );
  const manimCheckpointFileWriterBridgePlan = useMemo(
    () =>
      manimFileWriterSegmentPlan
        ? buildCheckpointPasteFileWriterBridgePlan({
            checkpointPastePlan: manimCheckpointPastePlan,
            segmentPlan: manimFileWriterSegmentPlan
          })
        : null,
    [manimCheckpointPastePlan, manimFileWriterSegmentPlan]
  );
  const manimCheckpointFileWriterBridgeAttributes = useMemo(
    () =>
      manimCheckpointFileWriterBridgePlan
        ? checkpointPasteFileWriterBridgeDataAttributes(manimCheckpointFileWriterBridgePlan)
        : null,
    [manimCheckpointFileWriterBridgePlan]
  );
  const manimCheckpointFileWriterBridgePlanJson = useMemo(
    () =>
      manimCheckpointFileWriterBridgePlan
        ? serializeCheckpointPasteFileWriterBridgePlan(manimCheckpointFileWriterBridgePlan)
        : "",
    [manimCheckpointFileWriterBridgePlan]
  );
  const manimPlaybackFileWriterBridgePlan = useMemo(
    () =>
      manimFileWriterPlan && manimPlaybackPlan
        ? buildScenePlaybackFileWriterBridgePlan({
            outputSlug: manimFileWriterPlan.outputSlug,
            playbackPlan: manimPlaybackPlan,
            sceneId: manimFileWriterPlan.sceneId,
            subdivideOutput: true,
            writeToMovie: manimFileWriterPlan.ready
          })
        : null,
    [manimFileWriterPlan, manimPlaybackPlan]
  );
  const manimPlaybackFileWriterBridgeAttributes = useMemo(
    () =>
      manimPlaybackFileWriterBridgePlan
        ? scenePlaybackFileWriterBridgeDataAttributes(manimPlaybackFileWriterBridgePlan)
        : null,
    [manimPlaybackFileWriterBridgePlan]
  );
  const manimPlaybackFileWriterBridgePlanJson = useMemo(
    () =>
      manimPlaybackFileWriterBridgePlan
        ? serializeScenePlaybackFileWriterBridgePlan(manimPlaybackFileWriterBridgePlan)
        : "",
    [manimPlaybackFileWriterBridgePlan]
  );
  const manimFileWriterCombinePlan = useMemo(
    () =>
      manimFileWriterPlan && manimPlaybackFileWriterBridgePlan
        ? buildSceneFileWriterCombinePlan({
            fileWriterReady: manimFileWriterPlan.ready,
            outputSlug: manimFileWriterPlan.outputSlug,
            playbackBridge: manimPlaybackFileWriterBridgePlan,
            sceneId: manimFileWriterPlan.sceneId,
            subdivideOutput: true,
            writeToMovie: manimFileWriterPlan.ready
          })
        : null,
    [manimFileWriterPlan, manimPlaybackFileWriterBridgePlan]
  );
  const manimFileWriterCombineAttributes = useMemo(
    () => (manimFileWriterCombinePlan ? sceneFileWriterCombineDataAttributes(manimFileWriterCombinePlan) : null),
    [manimFileWriterCombinePlan]
  );
  const manimFileWriterCombinePlanJson = useMemo(
    () => (manimFileWriterCombinePlan ? serializeSceneFileWriterCombinePlan(manimFileWriterCombinePlan) : ""),
    [manimFileWriterCombinePlan]
  );
  const manimSceneRunFileWriterFinishBridgePlan = useMemo(
    () =>
      manimSceneRunLifecycle && manimFileWriterCombinePlan
        ? buildSceneRunFileWriterFinishBridgePlan({
            fileWriterCombinePlan: manimFileWriterCombinePlan,
            sceneRunLifecycle: manimSceneRunLifecycle
          })
        : null,
    [manimFileWriterCombinePlan, manimSceneRunLifecycle]
  );
  const manimSceneRunFileWriterFinishBridgeAttributes = useMemo(
    () =>
      manimSceneRunFileWriterFinishBridgePlan
        ? sceneRunFileWriterFinishBridgeDataAttributes(manimSceneRunFileWriterFinishBridgePlan)
        : null,
    [manimSceneRunFileWriterFinishBridgePlan]
  );
  const manimSceneRunFileWriterFinishBridgePlanJson = useMemo(
    () =>
      manimSceneRunFileWriterFinishBridgePlan
        ? serializeSceneRunFileWriterFinishBridgePlan(manimSceneRunFileWriterFinishBridgePlan)
        : "",
    [manimSceneRunFileWriterFinishBridgePlan]
  );
  const manimSoundCuePlan = useMemo(
    () =>
      manimScene
        ? buildSceneSoundCuePlan({
            cues: manimScene.soundCues ?? [],
            skipAnimations: manimRuntimeState?.updatePolicy.skipAnimations ?? manimSkipAnimations
          })
        : null,
    [manimRuntimeState, manimScene, manimSkipAnimations]
  );
  const manimSoundCueJson = useMemo(
    () => (manimSoundCuePlan ? serializeSceneSoundCuePlan(manimSoundCuePlan) : null),
    [manimSoundCuePlan]
  );
  const scheduleCanvasReady = useCallback(() => {
    if (readyFrameRef.current !== null) {
      window.cancelAnimationFrame(readyFrameRef.current);
    }

    readyFrameRef.current = window.requestAnimationFrame(() => {
      readyFrameRef.current = null;
      setCanvasReady(true);
    });
  }, []);

  const currentManimHistoryState = useCallback((overrides: Partial<ManimCheckpointState> = {}): ManimCheckpointState => ({
    cameraMode: overrides.cameraMode ?? manimCameraMode,
    elapsedSeconds: overrides.elapsedSeconds ?? manimElapsedSeconds,
    playbackState: overrides.playbackState ?? manimPlaybackState,
    sceneId: overrides.sceneId ?? manimHistorySceneId
  }), [manimCameraMode, manimElapsedSeconds, manimHistorySceneId, manimPlaybackState]);

  const applyManimHistoryState = useCallback((nextState: ManimCheckpointState) => {
    setManimAuthoringMode("playback");
    setManimCameraMode(nextState.cameraMode);
    setManimElapsedSeconds(nextState.elapsedSeconds);
    setManimPlaybackState(nextState.playbackState);
  }, []);

  const resetCameraAndTimeline = useCallback(() => {
    setManimAuthoringMode("playback");
    setManimCameraMode("guided");
    setManimCaptureByteCount(0);
    setManimCaptureKind("screenshot");
    setManimCaptureRequestCount(0);
    setManimCaptureStatus("planned");
    setManimRenderQualityPreset("interactive");
    setManimRenderTransparentBackground(false);
    setManimCheckpointPasteText("");
    setManimElapsedSeconds(0);
    setManimFrameIndex(0);
    setSteppedManimFrameStep(null);
    setManimPlaybackState(presentationResetPlaybackState);
    setManimRunFromBeatIndex(0);
    setManimSelectedSceneFamilyId(state.familyId);
    setManimSelectedParameterId("value");
    setManimHistoryStore(createSceneHistoryStore(initialManimCheckpointState(manimHistorySceneId), { label: "reset" }));
    setCameraState(formatThreeDCanvasCameraState(threeDCanvasCameraContract.defaultCamera));
    setResetSignal((current) => current + 1);
  }, [manimHistorySceneId, presentationResetPlaybackState, state.familyId]);

  const switchManimCameraMode = useCallback((mode: ManimCameraMode) => {
    setManimHistoryStore((currentStore) => pushSceneHistory(currentStore, currentManimHistoryState({ cameraMode: mode }), {
      label: `camera ${mode}`
    }));
    setManimCameraMode(mode);
  }, [currentManimHistoryState]);

  const enterExploreCameraMode = useCallback(() => {
    setManimHistoryStore((currentStore) => pushSceneHistory(currentStore, currentManimHistoryState({ cameraMode: "explore" }), {
      label: "camera explore"
    }));
    setManimCameraMode("explore");
  }, [currentManimHistoryState]);

  const jumpToManimCameraShot = useCallback((shotId: string) => {
    const shot = manimCameraShotCatalog.find((entry) => entry.shotId === shotId);
    if (!shot) return;

    setManimHistoryStore((currentStore) => pushSceneHistory(
      currentStore,
      currentManimHistoryState({
        cameraMode: "guided",
        elapsedSeconds: shot.elapsedSeconds,
        playbackState: "paused"
      }),
      { label: `camera ${shot.shotId}` }
    ));
    setManimAuthoringMode("playback");
    setManimCameraMode("guided");
    setManimElapsedSeconds(shot.elapsedSeconds);
    setManimFrameIndex((current) => current + 1);
    setManimPlaybackState("paused");
  }, [currentManimHistoryState, manimCameraShotCatalog]);

  const toggleManimPlayback = useCallback(() => {
    setManimAuthoringMode("playback");
    setManimPlaybackState((current) => (current === "playing" ? "paused" : "playing"));
  }, []);

  const scrubManimTimelineToProgress = useCallback((nextProgress: number) => {
    const nextElapsedSeconds = manimTotalDuration * Math.min(1, Math.max(0, nextProgress));

    setManimCameraMode("guided");
    setManimAuthoringMode("playback");
    setManimPlaybackState("scrubbing");
    setManimElapsedSeconds(nextElapsedSeconds);
  }, [manimTotalDuration]);

  const scrubManimTimelineFromPointer = useCallback((event: MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const nextProgress = bounds.width > 0 ? (event.clientX - bounds.left) / bounds.width : 0;

    scrubManimTimelineToProgress(nextProgress);
  }, [scrubManimTimelineToProgress]);

  const scrubManimTimelineFromKeyboard = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Home") {
      event.preventDefault();
      scrubManimTimelineToProgress(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      scrubManimTimelineToProgress(1);
      return;
    }

    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    scrubManimTimelineToProgress(manimScrubProgress + direction * 0.05);
  }, [manimScrubProgress, scrubManimTimelineToProgress]);

  const saveManimCheckpoint = useCallback(() => {
    if (!manimScene) return;

    const key = `# ${manimScene.sceneId}:${manimCheckpointKeys.length + 1}`;
    const nextState = currentManimHistoryState({
      playbackState: "checkpoint",
      sceneId: manimScene.sceneId
    });
    setManimCheckpointStore((currentStore) => saveCheckpoint(currentStore, key, {
      cameraMode: nextState.cameraMode,
      elapsedSeconds: nextState.elapsedSeconds,
      playbackState: nextState.playbackState,
      sceneId: nextState.sceneId
    }));
    setManimHistoryStore((currentStore) => pushSceneHistory(currentStore, nextState, { label: key }));
    setManimAuthoringMode("playback");
    setManimPlaybackState("checkpoint");
  }, [currentManimHistoryState, manimCheckpointKeys.length, manimScene]);

  const restoreLatestManimCheckpoint = useCallback(() => {
    const latestKey = listCheckpointKeys(manimCheckpointStore).at(-1);
    if (!latestKey) return;

    const restored = restoreCheckpoint(manimCheckpointStore, latestKey, { invalidateLater: false });
    if (!restored) return;

    setManimCheckpointStore(restored.store);
    setManimHistoryStore((currentStore) => pushSceneHistory(currentStore, restored.state, { label: `restore ${latestKey}` }));
    setManimAuthoringMode("playback");
    setManimCameraMode(restored.state.cameraMode);
    setManimElapsedSeconds(restored.state.elapsedSeconds);
    setManimPlaybackState("checkpoint");
  }, [manimCheckpointStore]);

  function applyManimCheckpointPastePlan() {
    if (!manimScene || !manimCheckpointPastePlan) return;

    if (manimCheckpointPastePlan.restoresExistingCheckpoint) {
      const restored = restoreCheckpoint(manimCheckpointStore, manimCheckpointPastePlan.checkpointKey, { invalidateLater: true });
      if (!restored) return;

      const restoredState = {
        ...restored.state,
        playbackState: "checkpoint" as const,
        sceneId: manimScene.sceneId
      };
      setManimCheckpointStore(restored.store);
      setManimHistoryStore((currentStore) => pushSceneHistory(currentStore, restoredState, {
        label: `paste restore ${manimCheckpointPastePlan.checkpointKey}`
      }));
      setManimAuthoringMode(manimCheckpointPastePlan.skip ? "show-final" : "playback");
      setManimCameraMode(restoredState.cameraMode);
      setManimElapsedSeconds(restoredState.elapsedSeconds);
      setManimFrameIndex((current) => current + 1);
      setManimPlaybackState("checkpoint");
      if (manimCheckpointPastePlan.record) {
        setManimCaptureKind("video");
        setManimCaptureRequestCount((current) => current + 1);
        setManimCaptureStatus("planned");
      }
      return;
    }

    const nextState = currentManimHistoryState({
      playbackState: "checkpoint",
      sceneId: manimScene.sceneId
    });
    setManimCheckpointStore((currentStore) => saveCheckpoint(currentStore, manimCheckpointPastePlan.checkpointKey, {
      cameraMode: nextState.cameraMode,
      elapsedSeconds: nextState.elapsedSeconds,
      playbackState: nextState.playbackState,
      sceneId: nextState.sceneId
    }));
    setManimHistoryStore((currentStore) => pushSceneHistory(currentStore, nextState, {
      label: `paste save ${manimCheckpointPastePlan.checkpointKey}`
    }));
    setManimAuthoringMode(manimCheckpointPastePlan.skip ? "show-final" : "playback");
    setManimPlaybackState("checkpoint");
    if (manimCheckpointPastePlan.record) {
      setManimCaptureKind("video");
      setManimCaptureRequestCount((current) => current + 1);
      setManimCaptureStatus("planned");
    }
  }

  const runManimFromBeat = useCallback((playIndex: number) => {
    const play = manimPlaybackPlan?.plays[playIndex];
    if (!manimPlaybackPlan || !play) return;

    const nextElapsedSeconds = elapsedSecondsForPlaybackBeat(manimPlaybackPlan, play.playIndex);
    const nextState = currentManimHistoryState({
      cameraMode: "guided",
      elapsedSeconds: nextElapsedSeconds,
      playbackState: "playing"
    });
    setManimAuthoringMode("run-from-beat");
    setManimCameraMode("guided");
    setManimElapsedSeconds(nextElapsedSeconds);
    setManimPlaybackState("playing");
    setManimRunFromBeatIndex(play.playIndex);
    setManimHistoryStore((currentStore) => pushSceneHistory(currentStore, nextState, { label: labelForManimBeat(play) }));
  }, [currentManimHistoryState, manimPlaybackPlan]);

  const showManimFinalFrame = useCallback(() => {
    if (!manimPlaybackPlan) return;

    const nextElapsedSeconds = finalElapsedSecondsForPlaybackPlan(manimPlaybackPlan);
    const nextState = currentManimHistoryState({
      cameraMode: "guided",
      elapsedSeconds: nextElapsedSeconds,
      playbackState: "paused"
    });
    setManimAuthoringMode("show-final");
    setManimCameraMode("guided");
    setManimElapsedSeconds(nextElapsedSeconds);
    setManimPlaybackState("paused");
    setManimHistoryStore((currentStore) => pushSceneHistory(currentStore, nextState, { label: "show final" }));
  }, [currentManimHistoryState, manimPlaybackPlan]);

  const undoManimHistory = useCallback(() => {
    const result = undoSceneHistory(manimHistoryStore);

    setManimHistoryStore(result.store);
    if (result.changed) applyManimHistoryState(result.state);
  }, [applyManimHistoryState, manimHistoryStore]);

  const redoManimHistory = useCallback(() => {
    const result = redoSceneHistory(manimHistoryStore);

    setManimHistoryStore(result.store);
    if (result.changed) applyManimHistoryState(result.state);
  }, [applyManimHistoryState, manimHistoryStore]);

  const captureManimScreenshot = useCallback(() => {
    if (!manimScene) return;

    const dataUrl = webglCanvasRef.current?.toDataURL("image/png");

    setManimCaptureKind("screenshot");
    setManimCaptureByteCount(dataUrl?.length ?? 0);
    setManimCaptureRequestCount((current) => current + 1);
    setManimCaptureStatus(dataUrl ? "captured" : "unavailable");
    setManimPlaybackState("paused");
  }, [manimScene]);

  const planManimVideoCapture = useCallback(() => {
    if (!manimScene) return;

    setManimCaptureKind("video");
    setManimCaptureByteCount(0);
    setManimCaptureRequestCount((current) => current + 1);
    setManimCaptureStatus("planned");
    setManimPlaybackState("paused");
  }, [manimScene]);

  useEffect(() => {
    setWebglSupported(canUseWebGL());
  }, []);

  useEffect(() => {
    if (!manimRuntimeState) return;

    previousManimRuntimeStateRef.current = manimRuntimeState;
  }, [manimRuntimeState]);

  useEffect(() => {
    setManimSelectedSceneFamilyId(state.familyId);
  }, [runtime, state.familyId]);

  useEffect(() => {
    setManimAuthoringMode("playback");
    setManimCameraMode("guided");
    setManimCaptureByteCount(0);
    setManimCaptureKind("screenshot");
    setManimCaptureRequestCount(0);
    setManimCaptureStatus("planned");
    setManimCheckpointStore(createCheckpointStore<ManimCheckpointState>());
    setManimCheckpointPasteText("");
    setManimElapsedSeconds(0);
    setManimFrameIndex(0);
    setSteppedManimFrameStep(null);
    setManimHistoryStore(createSceneHistoryStore(initialManimCheckpointState(manimHistorySceneId), { label: "initial" }));
    setManimPlaybackState(presentationResetPlaybackState);
    setManimRunFromBeatIndex(0);
    setManimSelectedParameterId("value");
    previousManimRuntimeStateRef.current = null;
  }, [manimHistorySceneId, presentationResetPlaybackState, runtime, state.familyId]);

  useEffect(() => {
    return () => {
      if (readyFrameRef.current !== null) window.cancelAnimationFrame(readyFrameRef.current);
    };
  }, []);

  useEffect(() => {
    setCanvasReady(false);
    if (hasCreatedCanvasRef.current) scheduleCanvasReady();
  }, [scheduleCanvasReady, state.stateSummary]);

  useEffect(() => {
    if (webglSupported !== true) return;

    const surface = surfaceRef.current;
    if (!surface) return;

    const updateManimFormulaOverlayViewport = () => {
      const rect = surface.getBoundingClientRect();
      const width = Math.max(1, Math.round(Number.isFinite(rect.width) ? rect.width : 800));
      const height = Math.max(1, Math.round(Number.isFinite(rect.height) ? rect.height : 450));

      setManimFormulaOverlayViewport((previous) => (previous.width === width && previous.height === height ? previous : { width, height }));
      setManimFormulaOverlayViewportSource("measured");
    };

    updateManimFormulaOverlayViewport();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateManimFormulaOverlayViewport);

      return () => window.removeEventListener("resize", updateManimFormulaOverlayViewport);
    }

    const observer = new ResizeObserver(updateManimFormulaOverlayViewport);
    observer.observe(surface);

    return () => observer.disconnect();
  }, [webglSupported]);

  if (webglSupported === null) {
    return (
      <div
        data-viz-three-webgl-status={threeDCanvasWebGLContract.detectingStatus}
        role="status"
        aria-label={`${label} 3D renderer loading`}
        className="relative aspect-[16/9] w-full overflow-hidden rounded-[28px] border border-slate-900/10 bg-slate-950 shadow-inner shadow-cyan-500/10 dark:border-white/10"
      >
        <span
          data-viz-mark
          data-viz-name="three-d-webgl-detecting"
          className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/35 bg-cyan-300/15 shadow-lg shadow-cyan-300/20"
        />
        <span className="sr-only">Loading 3D model</span>
      </div>
    );
  }

  if (webglSupported === false) {
    return (
      <div
        data-viz-three-fallback-reason={threeDCanvasWebGLContract.fallbackReason}
        data-viz-three-webgl-status={threeDCanvasWebGLContract.fallbackStatus}
      >
        {fallback}
      </div>
    );
  }

  return (
    <div
      data-viz-surface
      data-viz-canvas-ready={canvasReady ? "true" : "false"}
      data-viz-camera-state={cameraState}
      data-viz-coverage-tier={coverageTier}
      data-viz-depth-value={state.depthValue.toFixed(3)}
      data-viz-family-id={state.familyId}
      data-viz-mark-count={sceneMetadata.minPrimitiveCount}
      data-viz-premium-launch={premiumLaunch ? "true" : "false"}
      data-viz-primary-value={state.primaryValue.toFixed(3)}
      data-viz-regional-priority={regionalPriority ?? "standard"}
      data-viz-renderer={threeDCanvasRendererContract.renderer}
      data-viz-runtime={runtime}
      data-viz-manim-mobile-layout={manimScene ? "docked" : "primitive"}
      data-viz-manim-authoring-mode={manimScene ? manimAuthoringMode : "primitive"}
      data-viz-manim-camera-mode={manimScene ? manimCameraMode : "primitive"}
      data-viz-manim-formula-viewport-height={manimFormulaOverlayViewport.height.toFixed(0)}
      data-viz-manim-formula-viewport-source={manimFormulaOverlayViewportSource}
      data-viz-manim-formula-viewport-width={manimFormulaOverlayViewport.width.toFixed(0)}
      data-viz-manim-camera-frame-active-shot={manimCameraFrameAttributes?.["data-viz-manim-camera-frame-active-shot"] ?? "default"}
      data-viz-manim-camera-frame-canonical-shot={manimCameraFrameAttributes?.["data-viz-manim-camera-frame-canonical-shot"] ?? "default"}
      data-viz-manim-camera-frame-count={manimCameraFrameAttributes?.["data-viz-manim-camera-frame-count"] ?? "0"}
      data-viz-manim-camera-frame-current-id={manimCameraFrameAttributes?.["data-viz-manim-camera-frame-current-id"] ?? "none"}
      data-viz-manim-camera-frame-euler-summary={
        manimCameraFrameAttributes?.["data-viz-manim-camera-frame-euler-summary"] ?? "theta=0.000;phi=0.000;gamma=0.000"
      }
      data-viz-manim-camera-frame-finite-matrix-count={manimCameraFrameAttributes?.["data-viz-manim-camera-frame-finite-matrix-count"] ?? "0"}
      data-viz-manim-camera-frame-fixed-overlay-count={manimCameraFrameAttributes?.["data-viz-manim-camera-frame-fixed-overlay-count"] ?? "0"}
      data-viz-manim-camera-frame-fov={manimCameraFrameAttributes?.["data-viz-manim-camera-frame-fov"] ?? "0.000"}
      data-viz-manim-camera-frame-gamma={manimCameraFrameAttributes?.["data-viz-manim-camera-frame-gamma"] ?? "0.000"}
      data-viz-manim-camera-frame-inverse-view-matrix-summary={
        manimCameraFrameAttributes?.["data-viz-manim-camera-frame-inverse-view-matrix-summary"] ??
        "0.000,0.000,0.000,0.000,0.000,0.000,0.000,0.000,0.000,0.000,0.000,0.000,0.000,0.000,0.000,1.000"
      }
      data-viz-manim-camera-frame-matrix-count={manimCameraFrameAttributes?.["data-viz-manim-camera-frame-matrix-count"] ?? "0"}
      data-viz-manim-camera-frame-orientation-orthonormal-max-error={
        manimCameraFrameAttributes?.["data-viz-manim-camera-frame-orientation-orthonormal-max-error"] ?? "0.000000"
      }
      data-viz-manim-camera-frame-orientation-orthonormal-ready={
        manimCameraFrameAttributes?.["data-viz-manim-camera-frame-orientation-orthonormal-ready"] ?? "false"
      }
      data-viz-manim-camera-frame-phi={manimCameraFrameAttributes?.["data-viz-manim-camera-frame-phi"] ?? "0.000"}
      data-viz-manim-camera-frame-position={manimCameraFrameAttributes?.["data-viz-manim-camera-frame-position"] ?? "0.000,0.000,0.000"}
      data-viz-manim-camera-frame-point-roundtrip-max-error={
        manimCameraFrameAttributes?.["data-viz-manim-camera-frame-point-roundtrip-max-error"] ?? "0.000000"
      }
      data-viz-manim-camera-frame-point-roundtrip-ready={
        manimCameraFrameAttributes?.["data-viz-manim-camera-frame-point-roundtrip-ready"] ?? "false"
      }
      data-viz-manim-camera-frame-point-roundtrip-source-contract={
        manimCameraFrameAttributes?.["data-viz-manim-camera-frame-point-roundtrip-source-contract"] ?? CAMERA_FRAME_POINT_ROUNDTRIP_SOURCE_CONTRACT
      }
      data-viz-manim-camera-frame-point-roundtrip-summary={
        manimCameraFrameAttributes?.["data-viz-manim-camera-frame-point-roundtrip-summary"] ??
        "pointRoundTrip:target=0.000,0.000,0.000:origin=0.000,0.000,0.000:maxError=0.000000:ready=false"
      }
      data-viz-manim-camera-frame-progress={manimCameraFrameAttributes?.["data-viz-manim-camera-frame-progress"] ?? "0.000"}
      data-viz-manim-camera-frame-reset-shot={manimCameraFrameAttributes?.["data-viz-manim-camera-frame-reset-shot"] ?? "default"}
      data-viz-manim-camera-frame-restorable-count={manimCameraFrameAttributes?.["data-viz-manim-camera-frame-restorable-count"] ?? "0"}
      data-viz-manim-camera-frame-signature={manimCameraFrameAttributes?.["data-viz-manim-camera-frame-signature"] ?? "none"}
      data-viz-manim-camera-frame-source-contract={manimCameraFrameAttributes?.["data-viz-manim-camera-frame-source-contract"] ?? CAMERA_FRAME_SOURCE_CONTRACT}
      data-viz-manim-camera-frame-summary={
        manimCameraFrameAttributes?.["data-viz-manim-camera-frame-summary"] ??
        "camera-frame:scene=primitive:active=default:canonical=default:progress=0.000:fov=0.000:euler=0.000,0.000,0.000:fixed=0:matrices=0:finite=0"
      }
      data-viz-manim-camera-frame-target={manimCameraFrameAttributes?.["data-viz-manim-camera-frame-target"] ?? "0.000,0.000,0.000"}
      data-viz-manim-camera-frame-target-camera-point={
        manimCameraFrameAttributes?.["data-viz-manim-camera-frame-target-camera-point"] ?? "0.000,0.000,0.000"
      }
      data-viz-manim-camera-frame-theta={manimCameraFrameAttributes?.["data-viz-manim-camera-frame-theta"] ?? "0.000"}
      data-viz-manim-camera-frame-origin-camera-point={
        manimCameraFrameAttributes?.["data-viz-manim-camera-frame-origin-camera-point"] ?? "0.000,0.000,0.000"
      }
      data-viz-manim-camera-frame-uniform-center={
        manimCameraFrameAttributes?.["data-viz-manim-camera-frame-uniform-center"] ?? "0.000,0.000,0.000"
      }
      data-viz-manim-camera-frame-uniform-count={manimCameraFrameAttributes?.["data-viz-manim-camera-frame-uniform-count"] ?? "0"}
      data-viz-manim-camera-frame-uniform-fovy={manimCameraFrameAttributes?.["data-viz-manim-camera-frame-uniform-fovy"] ?? "0.000"}
      data-viz-manim-camera-frame-uniform-orientation-quaternion={
        manimCameraFrameAttributes?.["data-viz-manim-camera-frame-uniform-orientation-quaternion"] ?? "0.000,0.000,0.000,1.000"
      }
      data-viz-manim-camera-frame-uniform-quaternion-max-error={
        manimCameraFrameAttributes?.["data-viz-manim-camera-frame-uniform-quaternion-max-error"] ?? "0.000000"
      }
      data-viz-manim-camera-frame-uniform-quaternion-ready={
        manimCameraFrameAttributes?.["data-viz-manim-camera-frame-uniform-quaternion-ready"] ?? "false"
      }
      data-viz-manim-camera-frame-uniform-shape={manimCameraFrameAttributes?.["data-viz-manim-camera-frame-uniform-shape"] ?? "0.000,0.000"}
      data-viz-manim-camera-frame-uniform-summary={
        manimCameraFrameAttributes?.["data-viz-manim-camera-frame-uniform-summary"] ?? "uniforms=none"
      }
      data-viz-manim-camera-frame-view-inverse-max-error={
        manimCameraFrameAttributes?.["data-viz-manim-camera-frame-view-inverse-max-error"] ?? "0.000000"
      }
      data-viz-manim-camera-frame-view-inverse-ready={manimCameraFrameAttributes?.["data-viz-manim-camera-frame-view-inverse-ready"] ?? "false"}
      data-viz-manim-camera-frame-view-matrix-determinant={
        manimCameraFrameAttributes?.["data-viz-manim-camera-frame-view-matrix-determinant"] ?? "1.000000"
      }
      data-viz-manim-camera-frame-inverse-view-matrix-determinant={
        manimCameraFrameAttributes?.["data-viz-manim-camera-frame-inverse-view-matrix-determinant"] ?? "1.000000"
      }
      data-viz-manim-camera-frame-matrix-determinant-max-error={
        manimCameraFrameAttributes?.["data-viz-manim-camera-frame-matrix-determinant-max-error"] ?? "0.000000"
      }
      data-viz-manim-camera-frame-matrix-determinant-ready={
        manimCameraFrameAttributes?.["data-viz-manim-camera-frame-matrix-determinant-ready"] ?? "false"
      }
      data-viz-manim-camera-frame-matrix-determinant-summary={
        manimCameraFrameAttributes?.["data-viz-manim-camera-frame-matrix-determinant-summary"] ??
        "determinants:view=1.000000:inverse=1.000000:maxError=0.000000:ready=false"
      }
      data-viz-manim-camera-frame-view-matrix-summary={
        manimCameraFrameAttributes?.["data-viz-manim-camera-frame-view-matrix-summary"] ??
        "1.000,0.000,0.000,0.000,0.000,1.000,0.000,0.000,0.000,0.000,1.000,0.000,0.000,0.000,0.000,1.000"
      }
      data-viz-manim-camera-frame-operation-count={manimEvidenceAttributes?.["data-viz-manim-camera-frame-operation-count"] ?? "0"}
      data-viz-manim-camera-frame-operation-ids={manimEvidenceAttributes?.["data-viz-manim-camera-frame-operation-ids"] ?? "none"}
      data-viz-manim-camera-frame-operation-summary={manimEvidenceAttributes?.["data-viz-manim-camera-frame-operation-summary"] ?? "operations=none"}
      data-viz-manim-camera-frame-restored-id={manimEvidenceAttributes?.["data-viz-manim-camera-frame-restored-id"] ?? "none"}
      data-viz-manim-camera-frame-rotated-theta={manimEvidenceAttributes?.["data-viz-manim-camera-frame-rotated-theta"] ?? "0.000"}
      data-viz-manim-camera-frame-scaled-fovy={manimEvidenceAttributes?.["data-viz-manim-camera-frame-scaled-fovy"] ?? "0.000"}
      data-viz-manim-camera-frame-shifted-center={manimEvidenceAttributes?.["data-viz-manim-camera-frame-shifted-center"] ?? "0.000,0.000,0.000"}
      data-viz-manim-camera-shot-count={manimScene ? manimCameraShotAttributes["data-viz-manim-camera-shot-count"] : "0"}
      data-viz-manim-camera-shot-ids={manimScene ? manimCameraShotAttributes["data-viz-manim-camera-shot-ids"] : "none"}
      data-viz-manim-camera-shot-missing-count={manimScene ? manimCameraShotAttributes["data-viz-manim-camera-shot-missing-count"] : "0"}
      data-viz-manim-camera-shot-missing-ids={manimScene ? manimCameraShotAttributes["data-viz-manim-camera-shot-missing-ids"] : "none"}
      data-viz-manim-camera-shot-selected={manimScene ? manimCameraShotAttributes["data-viz-manim-camera-shot-selected"] : "none"}
      data-viz-manim-camera-shot-source-contract={manimScene ? manimCameraShotAttributes["data-viz-manim-camera-shot-source-contract"] : CAMERA_SHOT_AUTHORING_SOURCE_CONTRACT}
      data-viz-manim-camera-shot-summary={manimScene ? manimCameraShotAttributes["data-viz-manim-camera-shot-summary"] : "shots=0;canonical=none;active=none;timelineShots=none"}
      data-viz-manim-render-quality-alpha={
        manimRenderQualityAttributes["data-viz-manim-render-quality-alpha"] ??
        manimEvidenceAttributes?.["data-viz-manim-render-quality-alpha"] ??
        "1.000"
      }
      data-viz-manim-render-quality-antialias={
        manimRenderQualityAttributes["data-viz-manim-render-quality-antialias"] ??
        manimEvidenceAttributes?.["data-viz-manim-render-quality-antialias"] ??
        "true"
      }
      data-viz-manim-render-quality-background={
        manimRenderQualityAttributes["data-viz-manim-render-quality-background"] ??
        manimEvidenceAttributes?.["data-viz-manim-render-quality-background"] ??
        "#020617"
      }
      data-viz-manim-render-quality-capture={
        manimRenderQualityAttributes["data-viz-manim-render-quality-capture"] ??
        manimEvidenceAttributes?.["data-viz-manim-render-quality-capture"] ??
        "1280x720@30"
      }
      data-viz-manim-render-quality-dpr={
        manimRenderQualityAttributes["data-viz-manim-render-quality-dpr"] ??
        manimEvidenceAttributes?.["data-viz-manim-render-quality-dpr"] ??
        "1.000"
      }
      data-viz-manim-render-quality-pixel-count={
        manimRenderQualityAttributes["data-viz-manim-render-quality-pixel-count"] ??
        manimEvidenceAttributes?.["data-viz-manim-render-quality-pixel-count"] ??
        "0"
      }
      data-viz-manim-render-quality-preset={
        manimRenderQualityAttributes["data-viz-manim-render-quality-preset"] ??
        manimEvidenceAttributes?.["data-viz-manim-render-quality-preset"] ??
        "primitive"
      }
      data-viz-manim-render-quality-renderer-mode={
        manimRenderQualityAttributes["data-viz-manim-render-quality-renderer-mode"] ??
        manimEvidenceAttributes?.["data-viz-manim-render-quality-renderer-mode"] ??
        "interactive"
      }
      data-viz-manim-render-quality-samples={
        manimRenderQualityAttributes["data-viz-manim-render-quality-samples"] ??
        manimEvidenceAttributes?.["data-viz-manim-render-quality-samples"] ??
        "1"
      }
      data-viz-manim-render-quality-size={
        manimRenderQualityAttributes["data-viz-manim-render-quality-size"] ??
        manimEvidenceAttributes?.["data-viz-manim-render-quality-size"] ??
        "0x0"
      }
      data-viz-manim-render-quality-source-contract={
        manimRenderQualityAttributes["data-viz-manim-render-quality-source-contract"] ??
        manimEvidenceAttributes?.["data-viz-manim-render-quality-source-contract"] ??
        MANIM_RENDER_QUALITY_SOURCE_CONTRACT
      }
      data-viz-manim-render-quality-summary={
        manimRenderQualityAttributes["data-viz-manim-render-quality-summary"] ??
        manimEvidenceAttributes?.["data-viz-manim-render-quality-summary"] ??
        "render-quality:primitive"
      }
      data-viz-manim-render-quality-transparent={
        manimRenderQualityAttributes["data-viz-manim-render-quality-transparent"] ??
        manimEvidenceAttributes?.["data-viz-manim-render-quality-transparent"] ??
        "false"
      }
      data-viz-manim-renderer-bridge-alpha={manimRenderQualityBridgeAttributes["data-viz-manim-renderer-bridge-alpha"] ?? "false"}
      data-viz-manim-renderer-bridge-antialias={manimRenderQualityBridgeAttributes["data-viz-manim-renderer-bridge-antialias"] ?? "true"}
      data-viz-manim-renderer-bridge-background-alpha={
        manimRenderQualityBridgeAttributes["data-viz-manim-renderer-bridge-background-alpha"] ?? "1.000"
      }
      data-viz-manim-renderer-bridge-background-color={
        manimRenderQualityBridgeAttributes["data-viz-manim-renderer-bridge-background-color"] ?? "#020617"
      }
      data-viz-manim-renderer-bridge-dpr={manimRenderQualityBridgeAttributes["data-viz-manim-renderer-bridge-dpr"] ?? "1.000"}
      data-viz-manim-renderer-bridge-gl-summary={
        manimRenderQualityBridgeAttributes["data-viz-manim-renderer-bridge-gl-summary"] ??
        "gl:alpha=false:antialias=true:preserveDrawingBuffer=true:power=default:samples=1"
      }
      data-viz-manim-renderer-bridge-preserve-drawing-buffer={
        manimRenderQualityBridgeAttributes["data-viz-manim-renderer-bridge-preserve-drawing-buffer"] ?? "true"
      }
      data-viz-manim-renderer-bridge-power-preference={
        manimRenderQualityBridgeAttributes["data-viz-manim-renderer-bridge-power-preference"] ?? "default"
      }
      data-viz-manim-renderer-bridge-renderer-mode={
        manimRenderQualityBridgeAttributes["data-viz-manim-renderer-bridge-renderer-mode"] ?? "interactive"
      }
      data-viz-manim-renderer-bridge-samples={manimRenderQualityBridgeAttributes["data-viz-manim-renderer-bridge-samples"] ?? "1"}
      data-viz-manim-renderer-bridge-sampling-policy={
        manimRenderQualityBridgeAttributes["data-viz-manim-renderer-bridge-sampling-policy"] ?? "browser-msaa-antialias-hint"
      }
      data-viz-manim-renderer-bridge-source-contract={
        manimRenderQualityBridgeAttributes["data-viz-manim-renderer-bridge-source-contract"] ?? MANIM_RENDER_QUALITY_BRIDGE_SOURCE_CONTRACT
      }
      data-viz-manim-renderer-bridge-summary={
        manimRenderQualityBridgeAttributes["data-viz-manim-renderer-bridge-summary"] ??
        "render-quality-bridge:primitive:interactive:dpr=1.000:alpha=false:antialias=true:samples=1"
      }
      data-viz-manim-renderer-bridge-transparent={
        manimRenderQualityBridgeAttributes["data-viz-manim-renderer-bridge-transparent"] ?? "false"
      }
      data-viz-manim-capture-kind={manimCaptureAttributes?.["data-viz-manim-capture-kind"] ?? "primitive"}
      data-viz-manim-capture-status={manimCaptureAttributes?.["data-viz-manim-capture-status"] ?? "primitive"}
      data-viz-manim-capture-frame-count={manimCaptureAttributes?.["data-viz-manim-capture-frame-count"] ?? "0"}
      data-viz-manim-capture-height={manimCaptureAttributes?.["data-viz-manim-capture-height"] ?? "0"}
      data-viz-manim-capture-scene-signature={manimCaptureAttributes?.["data-viz-manim-capture-scene-signature"] ?? "none"}
      data-viz-manim-capture-elapsed-seconds={manimCaptureAttributes?.["data-viz-manim-capture-elapsed-seconds"] ?? "0.000"}
      data-viz-manim-capture-framebuffer-id={manimCaptureAttributes?.["data-viz-manim-capture-framebuffer-id"] ?? "none"}
      data-viz-manim-capture-framebuffer-status={manimCaptureAttributes?.["data-viz-manim-capture-framebuffer-status"] ?? "unavailable"}
      data-viz-manim-capture-fps={manimCaptureAttributes?.["data-viz-manim-capture-fps"] ?? "0"}
      data-viz-manim-capture-camera-shot={manimCaptureAttributes?.["data-viz-manim-capture-camera-shot"] ?? "default"}
      data-viz-manim-capture-byte-count={manimCaptureAttributes?.["data-viz-manim-capture-byte-count"] ?? "0"}
      data-viz-manim-capture-request-count={manimCaptureAttributes?.["data-viz-manim-capture-request-count"] ?? "0"}
      data-viz-manim-capture-quality-preset={manimCaptureAttributes?.["data-viz-manim-capture-quality-preset"] ?? "interactive"}
      data-viz-manim-capture-renderer-mode={manimCaptureAttributes?.["data-viz-manim-capture-renderer-mode"] ?? "interactive"}
      data-viz-manim-capture-render-group-count={manimCaptureAttributes?.["data-viz-manim-capture-render-group-count"] ?? "0"}
      data-viz-manim-capture-render-group-ids={manimCaptureAttributes?.["data-viz-manim-capture-render-group-ids"] ?? "none"}
      data-viz-manim-capture-render-group-summary={
        manimCaptureAttributes?.["data-viz-manim-capture-render-group-summary"] ?? "scene=0:foreground=0:fixedInFrame=0:all=0"
      }
      data-viz-manim-capture-render-pass-summary={
        manimCaptureAttributes?.["data-viz-manim-capture-render-pass-summary"] ??
        "capture-pass:target=canvas:framebuffer=none:groups=scene(0)>foreground(0)>fixedInFrame(0):frames=0"
      }
      data-viz-manim-capture-dpr={manimCaptureAttributes?.["data-viz-manim-capture-dpr"] ?? "1.000"}
      data-viz-manim-capture-samples={manimCaptureAttributes?.["data-viz-manim-capture-samples"] ?? "1"}
      data-viz-manim-capture-transparent={manimCaptureAttributes?.["data-viz-manim-capture-transparent"] ?? "false"}
      data-viz-manim-capture-background={manimCaptureAttributes?.["data-viz-manim-capture-background"] ?? "#020617"}
      data-viz-manim-capture-alpha={manimCaptureAttributes?.["data-viz-manim-capture-alpha"] ?? "1.000"}
      data-viz-manim-capture-source-contract={
        manimCaptureAttributes?.["data-viz-manim-capture-source-contract"] ??
        manimEvidenceAttributes?.["data-viz-manim-capture-source-contract"] ??
        SCENE_CAPTURE_SOURCE_CONTRACT
      }
      data-viz-manim-capture-target={manimCaptureAttributes?.["data-viz-manim-capture-target"] ?? "canvas"}
      data-viz-manim-capture-width={manimCaptureAttributes?.["data-viz-manim-capture-width"] ?? "0"}
      data-viz-manim-creation-primitive-count={manimCreationPrimitiveAttributes?.["data-viz-manim-creation-primitive-count"] ?? "0"}
      data-viz-manim-creation-show-count={manimCreationPrimitiveAttributes?.["data-viz-manim-creation-show-count"] ?? "0"}
      data-viz-manim-creation-draw-border-count={manimCreationPrimitiveAttributes?.["data-viz-manim-creation-draw-border-count"] ?? "0"}
      data-viz-manim-creation-fade-count={manimCreationPrimitiveAttributes?.["data-viz-manim-creation-fade-count"] ?? "0"}
      data-viz-manim-creation-grow-count={manimCreationPrimitiveAttributes?.["data-viz-manim-creation-grow-count"] ?? "0"}
      data-viz-manim-creation-summary={
        manimCreationPrimitiveAttributes?.["data-viz-manim-creation-summary"] ?? "creation:primitive:primitives=0:show=0:borderFill=0:fade=0:grow=0"
      }
      data-viz-manim-show-creation-draw-ranges={manimShowCreationAttributes?.["data-viz-manim-show-creation-draw-ranges"] ?? "none"}
      data-viz-manim-show-creation-frame-count={manimShowCreationAttributes?.["data-viz-manim-show-creation-frame-count"] ?? "0"}
      data-viz-manim-show-creation-object-ids={manimShowCreationAttributes?.["data-viz-manim-show-creation-object-ids"] ?? "none"}
      data-viz-manim-show-creation-opacity-schedule={manimShowCreationAttributes?.["data-viz-manim-show-creation-opacity-schedule"] ?? "none"}
      data-viz-manim-show-creation-partial-policy={
        manimShowCreationAttributes?.["data-viz-manim-show-creation-partial-policy"] ?? SHOW_CREATION_PARTIAL_POLICY
      }
      data-viz-manim-show-creation-phase-sequence={manimShowCreationAttributes?.["data-viz-manim-show-creation-phase-sequence"] ?? "none"}
      data-viz-manim-show-creation-primitive-count={manimShowCreationAttributes?.["data-viz-manim-show-creation-primitive-count"] ?? "0"}
      data-viz-manim-show-creation-progress-range={manimShowCreationAttributes?.["data-viz-manim-show-creation-progress-range"] ?? "none"}
      data-viz-manim-show-creation-source-contract={
        manimShowCreationAttributes?.["data-viz-manim-show-creation-source-contract"] ?? SHOW_CREATION_SOURCE_CONTRACT
      }
      data-viz-manim-show-creation-summary={
        manimShowCreationAttributes?.["data-viz-manim-show-creation-summary"] ??
        "showCreation:primitives=0:frames=0:progress=none:objects=none:ranges=none"
      }
      data-viz-manim-draw-border-fill-border-frame-count={
        manimDrawBorderThenFillAttributes?.["data-viz-manim-draw-border-fill-border-frame-count"] ?? "0"
      }
      data-viz-manim-draw-border-fill-draw-ranges={manimDrawBorderThenFillAttributes?.["data-viz-manim-draw-border-fill-draw-ranges"] ?? "none"}
      data-viz-manim-draw-border-fill-fill-frame-count={
        manimDrawBorderThenFillAttributes?.["data-viz-manim-draw-border-fill-fill-frame-count"] ?? "0"
      }
      data-viz-manim-draw-border-fill-fill-opacity-schedule={
        manimDrawBorderThenFillAttributes?.["data-viz-manim-draw-border-fill-fill-opacity-schedule"] ?? "none"
      }
      data-viz-manim-draw-border-fill-frame-count={manimDrawBorderThenFillAttributes?.["data-viz-manim-draw-border-fill-frame-count"] ?? "0"}
      data-viz-manim-draw-border-fill-object-ids={manimDrawBorderThenFillAttributes?.["data-viz-manim-draw-border-fill-object-ids"] ?? "none"}
      data-viz-manim-draw-border-fill-phase-policy={
        manimDrawBorderThenFillAttributes?.["data-viz-manim-draw-border-fill-phase-policy"] ?? DRAW_BORDER_THEN_FILL_PHASE_POLICY
      }
      data-viz-manim-draw-border-fill-phase-sequence={
        manimDrawBorderThenFillAttributes?.["data-viz-manim-draw-border-fill-phase-sequence"] ?? "none"
      }
      data-viz-manim-draw-border-fill-primitive-count={
        manimDrawBorderThenFillAttributes?.["data-viz-manim-draw-border-fill-primitive-count"] ?? "0"
      }
      data-viz-manim-draw-border-fill-source-contract={
        manimDrawBorderThenFillAttributes?.["data-viz-manim-draw-border-fill-source-contract"] ??
        DRAW_BORDER_THEN_FILL_SOURCE_CONTRACT
      }
      data-viz-manim-draw-border-fill-stroke-opacity-schedule={
        manimDrawBorderThenFillAttributes?.["data-viz-manim-draw-border-fill-stroke-opacity-schedule"] ?? "none"
      }
      data-viz-manim-draw-border-fill-summary={
        manimDrawBorderThenFillAttributes?.["data-viz-manim-draw-border-fill-summary"] ??
        "drawBorderThenFill:primitives=0:frames=0:border=0:fill=0:objects=none:phases=none"
      }
      data-viz-manim-fade-grow-fade-frame-count={manimFadeGrowAttributes?.["data-viz-manim-fade-grow-fade-frame-count"] ?? "0"}
      data-viz-manim-fade-grow-frame-count={manimFadeGrowAttributes?.["data-viz-manim-fade-grow-frame-count"] ?? "0"}
      data-viz-manim-fade-grow-grow-frame-count={manimFadeGrowAttributes?.["data-viz-manim-fade-grow-grow-frame-count"] ?? "0"}
      data-viz-manim-fade-grow-kind-sequence={manimFadeGrowAttributes?.["data-viz-manim-fade-grow-kind-sequence"] ?? "none"}
      data-viz-manim-fade-grow-object-ids={manimFadeGrowAttributes?.["data-viz-manim-fade-grow-object-ids"] ?? "none"}
      data-viz-manim-fade-grow-opacity-schedule={manimFadeGrowAttributes?.["data-viz-manim-fade-grow-opacity-schedule"] ?? "none"}
      data-viz-manim-fade-grow-phase-policy={
        manimFadeGrowAttributes?.["data-viz-manim-fade-grow-phase-policy"] ?? FADE_GROW_PHASE_POLICY
      }
      data-viz-manim-fade-grow-phase-sequence={manimFadeGrowAttributes?.["data-viz-manim-fade-grow-phase-sequence"] ?? "none"}
      data-viz-manim-fade-grow-primitive-count={manimFadeGrowAttributes?.["data-viz-manim-fade-grow-primitive-count"] ?? "0"}
      data-viz-manim-fade-grow-scale-schedule={manimFadeGrowAttributes?.["data-viz-manim-fade-grow-scale-schedule"] ?? "none"}
      data-viz-manim-fade-grow-source-contract={
        manimFadeGrowAttributes?.["data-viz-manim-fade-grow-source-contract"] ??
        FADE_GROW_SOURCE_CONTRACT
      }
      data-viz-manim-fade-grow-summary={
        manimFadeGrowAttributes?.["data-viz-manim-fade-grow-summary"] ??
        "fadeGrow:primitives=0:frames=0:fade=0:grow=0:objects=none:kinds=none"
      }
      data-viz-manim-indication-count={manimIndicationPrimitiveAttributes?.["data-viz-manim-indication-count"] ?? "0"}
      data-viz-manim-indication-highlight-beat-count={manimIndicationPrimitiveAttributes?.["data-viz-manim-indication-highlight-beat-count"] ?? "0"}
      data-viz-manim-indication-target-object-count={manimIndicationPrimitiveAttributes?.["data-viz-manim-indication-target-object-count"] ?? "0"}
      data-viz-manim-indication-missing-target-count={manimIndicationPrimitiveAttributes?.["data-viz-manim-indication-missing-target-count"] ?? "0"}
      data-viz-manim-indication-pulse-count={manimIndicationPrimitiveAttributes?.["data-viz-manim-indication-pulse-count"] ?? "0"}
      data-viz-manim-indication-circumscribe-count={manimIndicationPrimitiveAttributes?.["data-viz-manim-indication-circumscribe-count"] ?? "0"}
      data-viz-manim-indication-flash-count={manimIndicationPrimitiveAttributes?.["data-viz-manim-indication-flash-count"] ?? "0"}
      data-viz-manim-indication-concept-ids={manimIndicationPrimitiveAttributes?.["data-viz-manim-indication-concept-ids"] ?? "none"}
      data-viz-manim-indication-source-contract={
        manimIndicationPrimitiveAttributes?.["data-viz-manim-indication-source-contract"] ??
        INDICATION_PRIMITIVE_SOURCE_CONTRACT
      }
      data-viz-manim-indication-state-policy={
        manimIndicationPrimitiveAttributes?.["data-viz-manim-indication-state-policy"] ?? INDICATION_PRIMITIVE_STATE_POLICY
      }
      data-viz-manim-indication-target-object-ids={manimIndicationPrimitiveAttributes?.["data-viz-manim-indication-target-object-ids"] ?? "none"}
      data-viz-manim-indication-summary={
        manimIndicationPrimitiveAttributes?.["data-viz-manim-indication-summary"] ?? "indication:primitive:beats=0:targets=0:pulse=0:circumscribe=0:flash=0:missing=0"
      }
      data-viz-manim-indication-runtime-overlay-active-concept-id={
        manimRuntimeIndicationOverlayAttributes["data-viz-manim-indication-runtime-overlay-active-concept-id"]
      }
      data-viz-manim-indication-runtime-overlay-count={
        manimRuntimeIndicationOverlayAttributes["data-viz-manim-indication-runtime-overlay-count"]
      }
      data-viz-manim-indication-runtime-overlay-focus-target-count={
        manimRuntimeIndicationOverlayAttributes["data-viz-manim-indication-runtime-overlay-focus-target-count"]
      }
      data-viz-manim-indication-runtime-overlay-focus-target-ids={
        manimRuntimeIndicationOverlayAttributes["data-viz-manim-indication-runtime-overlay-focus-target-ids"]
      }
      data-viz-manim-indication-runtime-overlay-focus-target-policy={
        manimRuntimeIndicationOverlayAttributes["data-viz-manim-indication-runtime-overlay-focus-target-policy"]
      }
      data-viz-manim-indication-runtime-overlay-focus-target-primary-id={
        manimRuntimeIndicationOverlayAttributes["data-viz-manim-indication-runtime-overlay-focus-target-primary-id"]
      }
      data-viz-manim-indication-runtime-overlay-focus-target-summary={
        manimRuntimeIndicationOverlayAttributes["data-viz-manim-indication-runtime-overlay-focus-target-summary"]
      }
      data-viz-manim-indication-runtime-overlay-line-count={
        manimRuntimeIndicationOverlayAttributes["data-viz-manim-indication-runtime-overlay-line-count"]
      }
      data-viz-manim-indication-runtime-overlay-object-count={
        manimRuntimeIndicationOverlayAttributes["data-viz-manim-indication-runtime-overlay-object-count"]
      }
      data-viz-manim-indication-runtime-overlay-object-ids={
        manimRuntimeIndicationOverlayAttributes["data-viz-manim-indication-runtime-overlay-object-ids"]
      }
      data-viz-manim-indication-runtime-overlay-point-count={
        manimRuntimeIndicationOverlayAttributes["data-viz-manim-indication-runtime-overlay-point-count"]
      }
      data-viz-manim-indication-runtime-overlay-source-contract={
        manimRuntimeIndicationOverlayAttributes["data-viz-manim-indication-runtime-overlay-source-contract"]
      }
      data-viz-manim-indication-runtime-overlay-state-policy={
        manimRuntimeIndicationOverlayAttributes["data-viz-manim-indication-runtime-overlay-state-policy"]
      }
      data-viz-manim-indication-runtime-overlay-summary={
        manimRuntimeIndicationOverlayAttributes["data-viz-manim-indication-runtime-overlay-summary"]
      }
      data-viz-manim-file-writer-ready={manimFileWriterAttributes?.["data-viz-manim-file-writer-ready"] ?? "false"}
      data-viz-manim-file-writer-signature={manimFileWriterAttributes?.["data-viz-manim-file-writer-signature"] ?? "none"}
      data-viz-manim-file-writer-scene-id={manimFileWriterAttributes?.["data-viz-manim-file-writer-scene-id"] ?? "none"}
      data-viz-manim-file-writer-output-slug={manimFileWriterAttributes?.["data-viz-manim-file-writer-output-slug"] ?? "none"}
      data-viz-manim-file-writer-artifact-count={manimFileWriterAttributes?.["data-viz-manim-file-writer-artifact-count"] ?? "0"}
      data-viz-manim-file-writer-artifact-file-summary={manimFileWriterAttributes?.["data-viz-manim-file-writer-artifact-file-summary"] ?? "none"}
      data-viz-manim-file-writer-artifact-kind-summary={manimFileWriterAttributes?.["data-viz-manim-file-writer-artifact-kind-summary"] ?? "none"}
      data-viz-manim-file-writer-artifact-mime-summary={manimFileWriterAttributes?.["data-viz-manim-file-writer-artifact-mime-summary"] ?? "none"}
      data-viz-manim-file-writer-frame-count={manimFileWriterAttributes?.["data-viz-manim-file-writer-frame-count"] ?? "0"}
      data-viz-manim-file-writer-byte-count={manimFileWriterAttributes?.["data-viz-manim-file-writer-byte-count"] ?? "0"}
      data-viz-manim-file-writer-capture-alpha={manimFileWriterAttributes?.["data-viz-manim-file-writer-capture-alpha"] ?? "1.000"}
      data-viz-manim-file-writer-capture-background={manimFileWriterAttributes?.["data-viz-manim-file-writer-capture-background"] ?? "#020617"}
      data-viz-manim-file-writer-capture-dpr={manimFileWriterAttributes?.["data-viz-manim-file-writer-capture-dpr"] ?? "1.000"}
      data-viz-manim-file-writer-capture-fps={manimFileWriterAttributes?.["data-viz-manim-file-writer-capture-fps"] ?? "0"}
      data-viz-manim-file-writer-capture-height={manimFileWriterAttributes?.["data-viz-manim-file-writer-capture-height"] ?? "0"}
      data-viz-manim-file-writer-capture-kind={manimFileWriterAttributes?.["data-viz-manim-file-writer-capture-kind"] ?? "primitive"}
      data-viz-manim-file-writer-capture-quality-preset={manimFileWriterAttributes?.["data-viz-manim-file-writer-capture-quality-preset"] ?? "interactive"}
      data-viz-manim-file-writer-capture-renderer-mode={manimFileWriterAttributes?.["data-viz-manim-file-writer-capture-renderer-mode"] ?? "interactive"}
      data-viz-manim-file-writer-capture-samples={manimFileWriterAttributes?.["data-viz-manim-file-writer-capture-samples"] ?? "1"}
      data-viz-manim-file-writer-capture-status={manimFileWriterAttributes?.["data-viz-manim-file-writer-capture-status"] ?? "primitive"}
      data-viz-manim-file-writer-capture-transparent={manimFileWriterAttributes?.["data-viz-manim-file-writer-capture-transparent"] ?? "false"}
      data-viz-manim-file-writer-capture-width={manimFileWriterAttributes?.["data-viz-manim-file-writer-capture-width"] ?? "0"}
      data-viz-manim-file-writer-json-artifact-count={manimFileWriterAttributes?.["data-viz-manim-file-writer-json-artifact-count"] ?? "0"}
      data-viz-manim-file-writer-media-artifact-count={manimFileWriterAttributes?.["data-viz-manim-file-writer-media-artifact-count"] ?? "0"}
      data-viz-manim-file-writer-source-contract={
        manimFileWriterAttributes?.["data-viz-manim-file-writer-source-contract"] ??
        manimEvidenceAttributes?.["data-viz-manim-file-writer-source-contract"] ??
        SCENE_FILE_WRITER_SOURCE_CONTRACT
      }
      data-viz-manim-file-writer-summary={
        manimFileWriterAttributes?.["data-viz-manim-file-writer-summary"] ?? "file-writer:primitive:artifacts=0:capture=primitive:ready=false"
      }
      data-viz-manim-file-writer-segment-action-summary={manimFileWriterSegmentAttributes?.["data-viz-manim-file-writer-segment-action-summary"] ?? ""}
      data-viz-manim-file-writer-segment-close-count={manimFileWriterSegmentAttributes?.["data-viz-manim-file-writer-segment-close-count"] ?? "0"}
      data-viz-manim-file-writer-segment-count={manimFileWriterSegmentAttributes?.["data-viz-manim-file-writer-segment-count"] ?? "0"}
      data-viz-manim-file-writer-segment-final-file-summary={manimFileWriterSegmentAttributes?.["data-viz-manim-file-writer-segment-final-file-summary"] ?? "none"}
      data-viz-manim-file-writer-segment-insert-index={manimFileWriterSegmentAttributes?.["data-viz-manim-file-writer-segment-insert-index"] ?? "none"}
      data-viz-manim-file-writer-segment-insert-path={manimFileWriterSegmentAttributes?.["data-viz-manim-file-writer-segment-insert-path"] ?? ""}
      data-viz-manim-file-writer-segment-open-count={manimFileWriterSegmentAttributes?.["data-viz-manim-file-writer-segment-open-count"] ?? "0"}
      data-viz-manim-file-writer-segment-partial-index={manimFileWriterSegmentAttributes?.["data-viz-manim-file-writer-segment-partial-index"] ?? "0"}
      data-viz-manim-file-writer-segment-partial-index-padded={
        manimFileWriterSegmentAttributes?.["data-viz-manim-file-writer-segment-partial-index-padded"] ?? "00000"
      }
      data-viz-manim-file-writer-segment-partial-path={manimFileWriterSegmentAttributes?.["data-viz-manim-file-writer-segment-partial-path"] ?? ""}
      data-viz-manim-file-writer-segment-partial-path-ready={manimFileWriterSegmentAttributes?.["data-viz-manim-file-writer-segment-partial-path-ready"] ?? "false"}
      data-viz-manim-file-writer-segment-skipped-count={manimFileWriterSegmentAttributes?.["data-viz-manim-file-writer-segment-skipped-count"] ?? "0"}
      data-viz-manim-file-writer-segment-source-contract={
        manimFileWriterSegmentAttributes?.["data-viz-manim-file-writer-segment-source-contract"] ??
        manimEvidenceAttributes?.["data-viz-manim-file-writer-segment-source-contract"] ??
        SCENE_FILE_WRITER_SEGMENT_SOURCE_CONTRACT
      }
      data-viz-manim-file-writer-segment-subdivide-output={manimFileWriterSegmentAttributes?.["data-viz-manim-file-writer-segment-subdivide-output"] ?? "false"}
      data-viz-manim-file-writer-segment-summary={
        manimFileWriterSegmentAttributes?.["data-viz-manim-file-writer-segment-summary"] ??
        "file-writer-segments:primitive:open=0:close=0:partial=false:insert=none"
      }
      data-viz-manim-file-writer-segment-temp-file-count={manimFileWriterSegmentAttributes?.["data-viz-manim-file-writer-segment-temp-file-count"] ?? "0"}
      data-viz-manim-file-writer-segment-temp-record={manimFileWriterSegmentAttributes?.["data-viz-manim-file-writer-segment-temp-record"] ?? "false"}
      data-viz-manim-file-writer-segment-write-to-movie={manimFileWriterSegmentAttributes?.["data-viz-manim-file-writer-segment-write-to-movie"] ?? "false"}
      data-viz-manim-playback-file-writer-bridge-mismatch-count={
        manimPlaybackFileWriterBridgeAttributes?.["data-viz-manim-playback-file-writer-bridge-mismatch-count"] ?? "0"
      }
      data-viz-manim-playback-file-writer-bridge-partial-index-sequence={
        manimPlaybackFileWriterBridgeAttributes?.["data-viz-manim-playback-file-writer-bridge-partial-index-sequence"] ?? "none"
      }
      data-viz-manim-playback-file-writer-bridge-partial-path-summary={
        manimPlaybackFileWriterBridgeAttributes?.["data-viz-manim-playback-file-writer-bridge-partial-path-summary"] ?? "none"
      }
      data-viz-manim-playback-file-writer-bridge-ready={
        manimPlaybackFileWriterBridgeAttributes?.["data-viz-manim-playback-file-writer-bridge-ready"] ?? "false"
      }
      data-viz-manim-playback-file-writer-bridge-row-count={
        manimPlaybackFileWriterBridgeAttributes?.["data-viz-manim-playback-file-writer-bridge-row-count"] ?? "0"
      }
      data-viz-manim-playback-file-writer-bridge-source-contract={
        manimPlaybackFileWriterBridgeAttributes?.["data-viz-manim-playback-file-writer-bridge-source-contract"] ??
        SCENE_PLAYBACK_FILE_WRITER_BRIDGE_SOURCE_CONTRACT
      }
      data-viz-manim-playback-file-writer-bridge-summary={
        manimPlaybackFileWriterBridgeAttributes?.["data-viz-manim-playback-file-writer-bridge-summary"] ??
        "playback-file-writer-bridge:primitive:plays=0:mismatch=0:ready=false"
      }
      data-viz-manim-file-writer-combine-action={manimFileWriterCombineAttributes?.["data-viz-manim-file-writer-combine-action"] ?? "skip-movie"}
      data-viz-manim-file-writer-combine-concat-manifest-path={
        manimFileWriterCombineAttributes?.["data-viz-manim-file-writer-combine-concat-manifest-path"] ?? "none"
      }
      data-viz-manim-file-writer-combine-duplicate-partial-count={
        manimFileWriterCombineAttributes?.["data-viz-manim-file-writer-combine-duplicate-partial-count"] ?? "0"
      }
      data-viz-manim-file-writer-combine-final-path={manimFileWriterCombineAttributes?.["data-viz-manim-file-writer-combine-final-path"] ?? ""}
      data-viz-manim-file-writer-combine-mismatch-count={
        manimFileWriterCombineAttributes?.["data-viz-manim-file-writer-combine-mismatch-count"] ?? "0"
      }
      data-viz-manim-file-writer-combine-ordered={manimFileWriterCombineAttributes?.["data-viz-manim-file-writer-combine-ordered"] ?? "true"}
      data-viz-manim-file-writer-combine-partial-count={
        manimFileWriterCombineAttributes?.["data-viz-manim-file-writer-combine-partial-count"] ?? "0"
      }
      data-viz-manim-file-writer-combine-partial-index-sequence={
        manimFileWriterCombineAttributes?.["data-viz-manim-file-writer-combine-partial-index-sequence"] ?? "none"
      }
      data-viz-manim-file-writer-combine-partial-path-summary={
        manimFileWriterCombineAttributes?.["data-viz-manim-file-writer-combine-partial-path-summary"] ?? "none"
      }
      data-viz-manim-file-writer-combine-ready={manimFileWriterCombineAttributes?.["data-viz-manim-file-writer-combine-ready"] ?? "false"}
      data-viz-manim-file-writer-combine-source-contract={
        manimFileWriterCombineAttributes?.["data-viz-manim-file-writer-combine-source-contract"] ??
        manimEvidenceAttributes?.["data-viz-manim-file-writer-combine-source-contract"] ??
        SCENE_FILE_WRITER_COMBINE_SOURCE_CONTRACT
      }
      data-viz-manim-file-writer-combine-summary={
        manimFileWriterCombineAttributes?.["data-viz-manim-file-writer-combine-summary"] ??
        "file-writer-combine:primitive:action=skip-movie:partials=0:ready=false"
      }
      data-viz-manim-checkpoint-file-writer-close-insert-pipe={
        manimCheckpointFileWriterBridgeAttributes?.["data-viz-manim-checkpoint-file-writer-close-insert-pipe"] ?? "false"
      }
      data-viz-manim-checkpoint-file-writer-insert-index={
        manimCheckpointFileWriterBridgeAttributes?.["data-viz-manim-checkpoint-file-writer-insert-index"] ?? "none"
      }
      data-viz-manim-checkpoint-file-writer-insert-path={
        manimCheckpointFileWriterBridgeAttributes?.["data-viz-manim-checkpoint-file-writer-insert-path"] ?? ""
      }
      data-viz-manim-checkpoint-file-writer-key={
        manimCheckpointFileWriterBridgeAttributes?.["data-viz-manim-checkpoint-file-writer-key"] ?? "none"
      }
      data-viz-manim-checkpoint-file-writer-open-insert-pipe={
        manimCheckpointFileWriterBridgeAttributes?.["data-viz-manim-checkpoint-file-writer-open-insert-pipe"] ?? "false"
      }
      data-viz-manim-checkpoint-file-writer-ready={
        manimCheckpointFileWriterBridgeAttributes?.["data-viz-manim-checkpoint-file-writer-ready"] ?? "false"
      }
      data-viz-manim-checkpoint-file-writer-record={
        manimCheckpointFileWriterBridgeAttributes?.["data-viz-manim-checkpoint-file-writer-record"] ?? "false"
      }
      data-viz-manim-checkpoint-file-writer-scene-id={
        manimCheckpointFileWriterBridgeAttributes?.["data-viz-manim-checkpoint-file-writer-scene-id"] ?? "none"
      }
      data-viz-manim-checkpoint-file-writer-segment-action-summary={
        manimCheckpointFileWriterBridgeAttributes?.["data-viz-manim-checkpoint-file-writer-segment-action-summary"] ?? ""
      }
      data-viz-manim-checkpoint-file-writer-segment-count={
        manimCheckpointFileWriterBridgeAttributes?.["data-viz-manim-checkpoint-file-writer-segment-count"] ?? "0"
      }
      data-viz-manim-checkpoint-file-writer-source-contract={
        manimCheckpointFileWriterBridgeAttributes?.["data-viz-manim-checkpoint-file-writer-source-contract"] ??
        manimEvidenceAttributes?.["data-viz-manim-checkpoint-file-writer-source-contract"] ??
        SCENE_CHECKPOINT_PASTE_FILE_WRITER_BRIDGE_SOURCE_CONTRACT
      }
      data-viz-manim-checkpoint-file-writer-summary={
        manimCheckpointFileWriterBridgeAttributes?.["data-viz-manim-checkpoint-file-writer-summary"] ??
        "checkpoint-file-writer-bridge:primitive:key=none:record=false:tempRecord=false:insert=none:ready=false"
      }
      data-viz-manim-checkpoint-file-writer-temp-record={
        manimCheckpointFileWriterBridgeAttributes?.["data-viz-manim-checkpoint-file-writer-temp-record"] ?? "false"
      }
      data-viz-manim-update-frame-action={manimEvidenceAttributes?.["data-viz-manim-update-frame-action"] ?? "skip-return"}
      data-viz-manim-update-frame-capture={manimEvidenceAttributes?.["data-viz-manim-update-frame-capture"] ?? "false"}
      data-viz-manim-update-frame-dispatch-events={manimEvidenceAttributes?.["data-viz-manim-update-frame-dispatch-events"] ?? "false"}
      data-viz-manim-update-frame-dt={manimEvidenceAttributes?.["data-viz-manim-update-frame-dt"] ?? "0.000"}
      data-viz-manim-update-frame-force-draw={manimEvidenceAttributes?.["data-viz-manim-update-frame-force-draw"] ?? "false"}
      data-viz-manim-update-frame-frame-policy={
        manimEvidenceAttributes?.["data-viz-manim-update-frame-frame-policy"] ?? SCENE_UPDATE_FRAME_FRAME_POLICY
      }
      data-viz-manim-update-frame-increment-time={manimEvidenceAttributes?.["data-viz-manim-update-frame-increment-time"] ?? "false"}
      data-viz-manim-update-frame-render-group-count={manimEvidenceAttributes?.["data-viz-manim-update-frame-render-group-count"] ?? "0"}
      data-viz-manim-update-frame-render-group-ids={manimEvidenceAttributes?.["data-viz-manim-update-frame-render-group-ids"] ?? "none"}
      data-viz-manim-update-frame-scene-time={manimEvidenceAttributes?.["data-viz-manim-update-frame-scene-time"] ?? "0.000"}
      data-viz-manim-update-frame-skip={manimEvidenceAttributes?.["data-viz-manim-update-frame-skip"] ?? "true"}
      data-viz-manim-update-frame-sleep={manimEvidenceAttributes?.["data-viz-manim-update-frame-sleep"] ?? "0.000"}
      data-viz-manim-update-frame-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-update-frame-source-contract"] ?? SCENE_UPDATE_FRAME_SOURCE_CONTRACT
      }
      data-viz-manim-update-frame-summary={
        manimEvidenceAttributes?.["data-viz-manim-update-frame-summary"] ??
        "updateFrame:action=skip-return:dt=0.000:time=0.000:capture=false:dispatch=false:sleep=0.000"
      }
      data-viz-manim-update-frame-update-mobjects={manimEvidenceAttributes?.["data-viz-manim-update-frame-update-mobjects"] ?? "false"}
      data-viz-manim-update-frame-update-mobjects-dt={manimEvidenceAttributes?.["data-viz-manim-update-frame-update-mobjects-dt"] ?? "0.000"}
      data-viz-manim-always-update-mobjects={manimEvidenceAttributes?.["data-viz-manim-always-update-mobjects"] ?? "false"}
      data-viz-manim-force-draw={manimEvidenceAttributes?.["data-viz-manim-force-draw"] ?? "false"}
      data-viz-manim-has-updaters={manimEvidenceAttributes?.["data-viz-manim-has-updaters"] ?? "false"}
      data-viz-manim-should-capture-frame={manimEvidenceAttributes?.["data-viz-manim-should-capture-frame"] ?? "false"}
      data-viz-manim-should-update-mobjects={manimEvidenceAttributes?.["data-viz-manim-should-update-mobjects"] ?? "false"}
      data-viz-manim-update-policy-reason={manimEvidenceAttributes?.["data-viz-manim-update-policy-reason"] ?? "idle"}
      data-viz-manim-update-policy-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-update-policy-source-contract"] ?? SCENE_UPDATE_POLICY_SOURCE_CONTRACT
      }
      data-viz-manim-update-policy-summary={
        manimEvidenceAttributes?.["data-viz-manim-update-policy-summary"] ??
        "updatePolicy:update=false:capture=false:reason=idle:updaters=0"
      }
      data-viz-manim-updater-count={manimEvidenceAttributes?.["data-viz-manim-updater-count"] ?? "0"}
      data-viz-manim-time-progression-description={manimEvidenceAttributes?.["data-viz-manim-time-progression-description"] ?? ""}
      data-viz-manim-time-progression-final-time={manimEvidenceAttributes?.["data-viz-manim-time-progression-final-time"] ?? "0.000"}
      data-viz-manim-time-progression-fps={manimEvidenceAttributes?.["data-viz-manim-time-progression-fps"] ?? "0"}
      data-viz-manim-time-progression-frame-count={manimEvidenceAttributes?.["data-viz-manim-time-progression-frame-count"] ?? "0"}
      data-viz-manim-time-progression-frame-interval={manimEvidenceAttributes?.["data-viz-manim-time-progression-frame-interval"] ?? "0.000"}
      data-viz-manim-time-progression-mode={manimEvidenceAttributes?.["data-viz-manim-time-progression-mode"] ?? "sampled"}
      data-viz-manim-time-progression-n-iterations={manimEvidenceAttributes?.["data-viz-manim-time-progression-n-iterations"] ?? "0"}
      data-viz-manim-time-progression-override-skip={manimEvidenceAttributes?.["data-viz-manim-time-progression-override-skip"] ?? "false"}
      data-viz-manim-time-progression-overshoot={manimEvidenceAttributes?.["data-viz-manim-time-progression-overshoot"] ?? "false"}
      data-viz-manim-time-progression-run-time={manimEvidenceAttributes?.["data-viz-manim-time-progression-run-time"] ?? "0.000"}
      data-viz-manim-time-progression-sampling-policy={
        manimEvidenceAttributes?.["data-viz-manim-time-progression-sampling-policy"] ??
        SCENE_TIME_PROGRESSION_SAMPLING_POLICY
      }
      data-viz-manim-time-progression-skip-animations={
        manimEvidenceAttributes?.["data-viz-manim-time-progression-skip-animations"] ?? "true"
      }
      data-viz-manim-time-progression-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-time-progression-source-contract"] ??
        SCENE_TIME_PROGRESSION_SOURCE_CONTRACT
      }
      data-viz-manim-time-progression-summary={
        manimEvidenceAttributes?.["data-viz-manim-time-progression-summary"] ??
        "timeProgression:sampled:run=0.000:fps=0:frames=0:final=0.000:overshoot=false"
      }
      data-viz-manim-time-progression-times-summary={manimEvidenceAttributes?.["data-viz-manim-time-progression-times-summary"] ?? "times:none"}
      data-viz-manim-progress-through-animation-count={manimEvidenceAttributes?.["data-viz-manim-progress-through-animation-count"] ?? "0"}
      data-viz-manim-progress-through-emit-frame-count={manimEvidenceAttributes?.["data-viz-manim-progress-through-emit-frame-count"] ?? "0"}
      data-viz-manim-progress-through-emit-frame-statuses={manimEvidenceAttributes?.["data-viz-manim-progress-through-emit-frame-statuses"] ?? "none"}
      data-viz-manim-progress-through-final-alpha-summary={manimEvidenceAttributes?.["data-viz-manim-progress-through-final-alpha-summary"] ?? "none"}
      data-viz-manim-progress-through-final-time={manimEvidenceAttributes?.["data-viz-manim-progress-through-final-time"] ?? "0.000"}
      data-viz-manim-progress-through-fps={manimEvidenceAttributes?.["data-viz-manim-progress-through-fps"] ?? "60"}
      data-viz-manim-progress-through-frame-interval={manimEvidenceAttributes?.["data-viz-manim-progress-through-frame-interval"] ?? "0.017"}
      data-viz-manim-progress-through-frame-policy={
        manimEvidenceAttributes?.["data-viz-manim-progress-through-frame-policy"] ??
        PROGRESS_THROUGH_ANIMATIONS_FRAME_POLICY
      }
      data-viz-manim-progress-through-frame-operation-sequence={
        manimEvidenceAttributes?.["data-viz-manim-progress-through-frame-operation-sequence"] ?? "none"
      }
      data-viz-manim-progress-through-frame-order-summary={
        manimEvidenceAttributes?.["data-viz-manim-progress-through-frame-order-summary"] ??
        "frame-order:frames=0:animations=0:order=update_mobjects>interpolate>update_frame>emit_frame"
      }
      data-viz-manim-progress-through-frame-count={manimEvidenceAttributes?.["data-viz-manim-progress-through-frame-count"] ?? "0"}
      data-viz-manim-progress-through-interpolate-count={manimEvidenceAttributes?.["data-viz-manim-progress-through-interpolate-count"] ?? "0"}
      data-viz-manim-progress-through-raw-alpha-overshoot-animation-ids={
        manimEvidenceAttributes?.["data-viz-manim-progress-through-raw-alpha-overshoot-animation-ids"] ?? "none"
      }
      data-viz-manim-progress-through-raw-alpha-overshoot-count={
        manimEvidenceAttributes?.["data-viz-manim-progress-through-raw-alpha-overshoot-count"] ?? "0"
      }
      data-viz-manim-progress-through-raw-alpha-sequence-summary={
        manimEvidenceAttributes?.["data-viz-manim-progress-through-raw-alpha-sequence-summary"] ??
        "raw-alpha-sequence:frames=0:animations=0:none"
      }
      data-viz-manim-progress-through-run-time={manimEvidenceAttributes?.["data-viz-manim-progress-through-run-time"] ?? "0.000"}
      data-viz-manim-progress-through-skip={manimEvidenceAttributes?.["data-viz-manim-progress-through-skip"] ?? "true"}
      data-viz-manim-progress-through-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-progress-through-source-contract"] ??
        PROGRESS_THROUGH_ANIMATIONS_SOURCE_CONTRACT
      }
      data-viz-manim-progress-through-summary={
        manimEvidenceAttributes?.["data-viz-manim-progress-through-summary"] ??
        "progressThroughAnimations:animations=0:frames=0:run=0.000:updates=0:interpolates=0:writes=0:skip=true"
      }
      data-viz-manim-progress-through-update-frame-action-summary={
        manimEvidenceAttributes?.["data-viz-manim-progress-through-update-frame-action-summary"] ??
        "update-frame-actions:frames=0:capture=0:dispatch=0:skip=0:end=0:actions=none"
      }
      data-viz-manim-progress-through-update-frame-count={manimEvidenceAttributes?.["data-viz-manim-progress-through-update-frame-count"] ?? "0"}
      data-viz-manim-progress-through-update-mobject-exclusion-policy={
        manimEvidenceAttributes?.["data-viz-manim-progress-through-update-mobject-exclusion-policy"] ??
        PROGRESS_THROUGH_ANIMATIONS_UPDATE_MOBJECTS_POLICY
      }
      data-viz-manim-progress-through-update-mobject-object-dt-summary={
        manimEvidenceAttributes?.["data-viz-manim-progress-through-update-mobject-object-dt-summary"] ?? "none"
      }
      data-viz-manim-progress-through-update-mobject-object-count={
        manimEvidenceAttributes?.["data-viz-manim-progress-through-update-mobject-object-count"] ?? "0"
      }
      data-viz-manim-progress-through-update-mobject-target-summary={
        manimEvidenceAttributes?.["data-viz-manim-progress-through-update-mobject-target-summary"] ?? "none"
      }
      data-viz-manim-progress-through-update-mobjects-count={manimEvidenceAttributes?.["data-viz-manim-progress-through-update-mobjects-count"] ?? "0"}
      data-viz-manim-progress-through-update-mobjects-dt-summary={
        manimEvidenceAttributes?.["data-viz-manim-progress-through-update-mobjects-dt-summary"] ??
        "update-mobjects-dt:frames=0:animations=0:calls=0:dt=none:total=0.000"
      }
      data-viz-manim-progress-through-written-frame-count={manimEvidenceAttributes?.["data-viz-manim-progress-through-written-frame-count"] ?? "0"}
      data-viz-manim-emit-frame-camera-id={manimEvidenceAttributes?.["data-viz-manim-emit-frame-camera-id"] ?? "primitive-camera"}
      data-viz-manim-emit-frame-calls-file-writer={manimEvidenceAttributes?.["data-viz-manim-emit-frame-calls-file-writer"] ?? "false"}
      data-viz-manim-emit-frame-called={manimEvidenceAttributes?.["data-viz-manim-emit-frame-called"] ?? "false"}
      data-viz-manim-emit-frame-frame-index={manimEvidenceAttributes?.["data-viz-manim-emit-frame-frame-index"] ?? "0"}
      data-viz-manim-emit-frame-progress-display={manimEvidenceAttributes?.["data-viz-manim-emit-frame-progress-display"] ?? "false"}
      data-viz-manim-emit-frame-raw-fbo={manimEvidenceAttributes?.["data-viz-manim-emit-frame-raw-fbo"] ?? "false"}
      data-viz-manim-emit-frame-skip={manimEvidenceAttributes?.["data-viz-manim-emit-frame-skip"] ?? "false"}
      data-viz-manim-emit-frame-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-emit-frame-source-contract"] ??
        SCENE_EMIT_FRAME_SOURCE_CONTRACT
      }
      data-viz-manim-emit-frame-status={manimEvidenceAttributes?.["data-viz-manim-emit-frame-status"] ?? "not-called"}
      data-viz-manim-emit-frame-summary={
        manimEvidenceAttributes?.["data-viz-manim-emit-frame-summary"] ??
        "emitFrame:status=not-called:frame=0:skip=false:writeToMovie=false:write=false"
      }
      data-viz-manim-emit-frame-updates-progress-display={
        manimEvidenceAttributes?.["data-viz-manim-emit-frame-updates-progress-display"] ?? "false"
      }
      data-viz-manim-emit-frame-write-policy={
        manimEvidenceAttributes?.["data-viz-manim-emit-frame-write-policy"] ??
        SCENE_EMIT_FRAME_WRITE_POLICY
      }
      data-viz-manim-emit-frame-write-movie={manimEvidenceAttributes?.["data-viz-manim-emit-frame-write-movie"] ?? "false"}
      data-viz-manim-emit-frame-write-to-movie={manimEvidenceAttributes?.["data-viz-manim-emit-frame-write-to-movie"] ?? "false"}
      data-viz-manim-checkpoint-count={manimCheckpointKeys.length}
      data-viz-manim-checkpoint-store-can-restore={manimCheckpointStoreAttributes["data-viz-manim-checkpoint-store-can-restore"]}
      data-viz-manim-checkpoint-store-count={manimCheckpointStoreAttributes["data-viz-manim-checkpoint-store-count"]}
      data-viz-manim-checkpoint-store-invalidated-count={manimCheckpointStoreAttributes["data-viz-manim-checkpoint-store-invalidated-count"]}
      data-viz-manim-checkpoint-store-invalidated-keys={manimCheckpointStoreAttributes["data-viz-manim-checkpoint-store-invalidated-keys"]}
      data-viz-manim-checkpoint-store-invalidate-later={manimCheckpointStoreAttributes["data-viz-manim-checkpoint-store-invalidate-later"]}
      data-viz-manim-checkpoint-store-keys={manimCheckpointStoreAttributes["data-viz-manim-checkpoint-store-keys"]}
      data-viz-manim-checkpoint-store-latest-key={manimCheckpointStoreAttributes["data-viz-manim-checkpoint-store-latest-key"]}
      data-viz-manim-checkpoint-store-latest-state-signature={
        manimCheckpointStoreAttributes["data-viz-manim-checkpoint-store-latest-state-signature"]
      }
      data-viz-manim-checkpoint-store-next-order={manimCheckpointStoreAttributes["data-viz-manim-checkpoint-store-next-order"]}
      data-viz-manim-checkpoint-store-requested-key={manimCheckpointStoreAttributes["data-viz-manim-checkpoint-store-requested-key"]}
      data-viz-manim-checkpoint-store-retained-keys-after-restore={
        manimCheckpointStoreAttributes["data-viz-manim-checkpoint-store-retained-keys-after-restore"]
      }
      data-viz-manim-checkpoint-store-restore-action={manimCheckpointStoreAttributes["data-viz-manim-checkpoint-store-restore-action"]}
      data-viz-manim-checkpoint-store-restored-order={manimCheckpointStoreAttributes["data-viz-manim-checkpoint-store-restored-order"]}
      data-viz-manim-checkpoint-store-restored-state-signature={
        manimCheckpointStoreAttributes["data-viz-manim-checkpoint-store-restored-state-signature"]
      }
      data-viz-manim-checkpoint-store-source-contract={
        manimCheckpointStoreAttributes["data-viz-manim-checkpoint-store-source-contract"] ??
        SCENE_CHECKPOINT_STORE_SOURCE_CONTRACT
      }
      data-viz-manim-checkpoint-store-state-signature-summary={
        manimCheckpointStoreAttributes["data-viz-manim-checkpoint-store-state-signature-summary"]
      }
      data-viz-manim-checkpoint-store-summary={manimCheckpointStoreAttributes["data-viz-manim-checkpoint-store-summary"]}
      data-viz-manim-checkpoint-paste-key={manimCheckpointPasteAttributes?.["data-viz-manim-checkpoint-paste-key"] ?? "none"}
      data-viz-manim-checkpoint-paste-line-count={manimCheckpointPasteAttributes?.["data-viz-manim-checkpoint-paste-line-count"] ?? "0"}
      data-viz-manim-checkpoint-paste-operation-count={manimCheckpointPasteAttributes?.["data-viz-manim-checkpoint-paste-operation-count"] ?? "0"}
      data-viz-manim-checkpoint-paste-invalidates-count={manimCheckpointPasteAttributes?.["data-viz-manim-checkpoint-paste-invalidates-count"] ?? "0"}
      data-viz-manim-checkpoint-paste-invalidated-keys={manimCheckpointPasteAttributes?.["data-viz-manim-checkpoint-paste-invalidated-keys"] ?? "none"}
      data-viz-manim-checkpoint-paste-retained-keys-after-restore={
        manimCheckpointPasteAttributes?.["data-viz-manim-checkpoint-paste-retained-keys-after-restore"] ?? "none"
      }
      data-viz-manim-checkpoint-paste-restore-action={manimCheckpointPasteAttributes?.["data-viz-manim-checkpoint-paste-restore-action"] ?? "save-new-checkpoint"}
      data-viz-manim-checkpoint-paste-elapsed-seconds={manimCheckpointPasteAttributes?.["data-viz-manim-checkpoint-paste-elapsed-seconds"] ?? "0.000"}
      data-viz-manim-checkpoint-paste-progress-bar={manimCheckpointPasteAttributes?.["data-viz-manim-checkpoint-paste-progress-bar"] ?? "false"}
      data-viz-manim-checkpoint-paste-ready={manimEvidenceAttributes?.["data-viz-manim-checkpoint-paste-ready"] ?? "false"}
      data-viz-manim-checkpoint-paste-record={manimCheckpointPasteAttributes?.["data-viz-manim-checkpoint-paste-record"] ?? "false"}
      data-viz-manim-checkpoint-paste-replay-policy={manimCheckpointPasteAttributes?.["data-viz-manim-checkpoint-paste-replay-policy"] ?? SCENE_CHECKPOINT_PASTE_REPLAY_POLICY}
      data-viz-manim-checkpoint-paste-restores-existing={manimCheckpointPasteAttributes?.["data-viz-manim-checkpoint-paste-restores-existing"] ?? "false"}
      data-viz-manim-checkpoint-paste-restore-mode={manimCheckpointPasteAttributes?.["data-viz-manim-checkpoint-paste-restore-mode"] ?? "primitive"}
      data-viz-manim-checkpoint-paste-skip={manimCheckpointPasteAttributes?.["data-viz-manim-checkpoint-paste-skip"] ?? "false"}
      data-viz-manim-checkpoint-paste-source-contract={manimCheckpointPasteAttributes?.["data-viz-manim-checkpoint-paste-source-contract"] ?? SCENE_CHECKPOINT_PASTE_SOURCE_CONTRACT}
      data-viz-manim-checkpoint-paste-source-label={manimCheckpointPasteAttributes?.["data-viz-manim-checkpoint-paste-source-label"] ?? "none"}
      data-viz-manim-checkpoint-paste-summary={
        manimCheckpointPasteAttributes?.["data-viz-manim-checkpoint-paste-summary"] ?? "checkpointPaste:primitive:save-new:key=none:lines=0:operations=0:skip=false:record=false:invalidates=0"
      }
      data-viz-manim-elapsed-seconds={manimElapsedSeconds.toFixed(3)}
      data-viz-manim-frame-index={manimScene ? manimFrameIndex : 0}
      data-viz-manim-frame-stepper-active-step={manimFrameStepAttributes?.["data-viz-manim-frame-stepper-active-step"] ?? "none"}
      data-viz-manim-frame-stepper-camera-shot={manimFrameStepAttributes?.["data-viz-manim-frame-stepper-camera-shot"] ?? "default"}
      data-viz-manim-frame-stepper-delta-seconds={manimFrameStepAttributes?.["data-viz-manim-frame-stepper-delta-seconds"] ?? "0.000"}
      data-viz-manim-frame-stepper-elapsed-seconds={manimFrameStepAttributes?.["data-viz-manim-frame-stepper-elapsed-seconds"] ?? "0.000"}
      data-viz-manim-frame-stepper-frame-index={manimFrameStepAttributes?.["data-viz-manim-frame-stepper-frame-index"] ?? "0"}
      data-viz-manim-frame-stepper-playback-phase={manimFrameStepAttributes?.["data-viz-manim-frame-stepper-playback-phase"] ?? "idle"}
      data-viz-manim-frame-stepper-render-group-ids={manimFrameStepAttributes?.["data-viz-manim-frame-stepper-render-group-ids"] ?? "none"}
      data-viz-manim-frame-stepper-render-group-overlap-ids={
        manimFrameStepAttributes?.["data-viz-manim-frame-stepper-render-group-overlap-ids"] ?? "none"
      }
      data-viz-manim-frame-stepper-scene-id={manimFrameStepAttributes?.["data-viz-manim-frame-stepper-scene-id"] ?? "none"}
      data-viz-manim-frame-stepper-source-contract={
        manimFrameStepAttributes?.["data-viz-manim-frame-stepper-source-contract"] ?? SCENE_FRAME_STEPPER_SOURCE_CONTRACT
      }
      data-viz-manim-frame-stepper-summary={
        manimFrameStepAttributes?.["data-viz-manim-frame-stepper-summary"] ??
        "frame-step:primitive:frame=0:elapsed=0.000:dt=0.000:step=none:camera=default:phase=idle:updaters=0/0"
      }
      data-viz-manim-frame-stepper-updater-active-count={manimFrameStepAttributes?.["data-viz-manim-frame-stepper-updater-active-count"] ?? "0"}
      data-viz-manim-frame-stepper-updater-suspended-count={manimFrameStepAttributes?.["data-viz-manim-frame-stepper-updater-suspended-count"] ?? "0"}
      data-viz-manim-camera-ambient-rotation-degrees={manimEvidenceAttributes?.["data-viz-manim-camera-ambient-rotation-degrees"] ?? runtimeDiagnostics.cameraAmbientRotationDegrees.toFixed(3)}
      data-viz-manim-camera-updater-active-count={manimEvidenceAttributes?.["data-viz-manim-camera-updater-active-count"] ?? runtimeDiagnostics.cameraUpdaterActiveCount}
      data-viz-manim-camera-updater-active-ids={manimEvidenceAttributes?.["data-viz-manim-camera-updater-active-ids"] ?? runtimeDiagnostics.cameraUpdaterActiveIds}
      data-viz-manim-camera-updater-active-seconds={manimEvidenceAttributes?.["data-viz-manim-camera-updater-active-seconds"] ?? "0.000"}
      data-viz-manim-camera-updater-active-window-summary={manimEvidenceAttributes?.["data-viz-manim-camera-updater-active-window-summary"] ?? "none"}
      data-viz-manim-camera-updater-count={manimEvidenceAttributes?.["data-viz-manim-camera-updater-count"] ?? runtimeDiagnostics.cameraUpdaterCount}
      data-viz-manim-camera-updater-source-contract={manimEvidenceAttributes?.["data-viz-manim-camera-updater-source-contract"] ?? CAMERA_FRAME_UPDATER_SOURCE_CONTRACT}
      data-viz-manim-camera-updater-time-mode={manimEvidenceAttributes?.["data-viz-manim-camera-updater-time-mode"] ?? "elapsed"}
      data-viz-manim-camera-director-active-shot={
        manimEvidenceAttributes?.["data-viz-manim-camera-director-active-shot"] ?? runtimeDiagnostics.manimCameraDirectorActiveShotId
      }
      data-viz-manim-camera-director-canonical-shot={
        manimEvidenceAttributes?.["data-viz-manim-camera-director-canonical-shot"] ?? runtimeDiagnostics.manimCameraDirectorCanonicalShotId
      }
      data-viz-manim-camera-director-reset-shot={
        manimEvidenceAttributes?.["data-viz-manim-camera-director-reset-shot"] ?? runtimeDiagnostics.manimCameraDirectorResetShotId
      }
      data-viz-manim-camera-director-timeline-shot={
        manimEvidenceAttributes?.["data-viz-manim-camera-director-timeline-shot"] ?? runtimeDiagnostics.manimCameraDirectorTimelineShotId
      }
      data-viz-manim-camera-director-progress={
        manimEvidenceAttributes?.["data-viz-manim-camera-director-progress"] ?? runtimeDiagnostics.manimCameraDirectorProgress.toFixed(3)
      }
      data-viz-manim-camera-director-transition-summary={
        manimEvidenceAttributes?.["data-viz-manim-camera-director-transition-summary"] ?? runtimeDiagnostics.manimCameraDirectorTransitionSummary
      }
      data-viz-manim-camera-director-updater-count={
        manimEvidenceAttributes?.["data-viz-manim-camera-director-updater-count"] ?? runtimeDiagnostics.manimCameraDirectorUpdaterCount
      }
      data-viz-manim-camera-director-active-updater-count={
        manimEvidenceAttributes?.["data-viz-manim-camera-director-active-updater-count"] ?? runtimeDiagnostics.manimCameraDirectorActiveUpdaterCount
      }
      data-viz-manim-camera-director-active-updater-ids={
        manimEvidenceAttributes?.["data-viz-manim-camera-director-active-updater-ids"] ?? runtimeDiagnostics.manimCameraDirectorActiveUpdaterIds
      }
      data-viz-manim-camera-director-ambient-rotation-degrees={
        manimEvidenceAttributes?.["data-viz-manim-camera-director-ambient-rotation-degrees"] ??
        runtimeDiagnostics.manimCameraDirectorAmbientRotationDegrees.toFixed(3)
      }
      data-viz-manim-camera-director-shot-position={
        manimEvidenceAttributes?.["data-viz-manim-camera-director-shot-position"] ?? runtimeDiagnostics.manimCameraDirectorShotPosition
      }
      data-viz-manim-camera-director-shot-target={
        manimEvidenceAttributes?.["data-viz-manim-camera-director-shot-target"] ?? runtimeDiagnostics.manimCameraDirectorShotTarget
      }
      data-viz-manim-camera-director-shot-fov={
        manimEvidenceAttributes?.["data-viz-manim-camera-director-shot-fov"] ?? runtimeDiagnostics.manimCameraDirectorShotFov.toFixed(3)
      }
      data-viz-manim-camera-director-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-camera-director-source-contract"] ?? runtimeDiagnostics.manimCameraDirectorSourceContract
      }
      data-viz-manim-camera-director-summary={
        manimEvidenceAttributes?.["data-viz-manim-camera-director-summary"] ?? runtimeDiagnostics.manimCameraDirectorSummary
      }
      data-viz-curve-partial-length={manimEvidenceAttributes?.["data-viz-curve-partial-length"] ?? runtimeDiagnostics.curvePartialLength.toFixed(3)}
      data-viz-curve-partial-normalized-range={manimEvidenceAttributes?.["data-viz-curve-partial-normalized-range"] ?? runtimeDiagnostics.curvePartialNormalizedRange}
      data-viz-curve-partial-requested-range={manimEvidenceAttributes?.["data-viz-curve-partial-requested-range"] ?? runtimeDiagnostics.curvePartialRequestedRange}
      data-viz-curve-partial-reversed={manimEvidenceAttributes?.["data-viz-curve-partial-reversed"] ?? String(runtimeDiagnostics.curvePartialReversed)}
      data-viz-curve-partial-sample-count={manimEvidenceAttributes?.["data-viz-curve-partial-sample-count"] ?? runtimeDiagnostics.curvePartialSampleCount}
      data-viz-curve-partial-source-id={manimEvidenceAttributes?.["data-viz-curve-partial-source-id"] ?? runtimeDiagnostics.curvePartialSourceId}
      data-viz-curve-partial-source-contract={
        manimEvidenceAttributes?.["data-viz-curve-partial-source-contract"] ?? runtimeDiagnostics.curvePartialSourceContract
      }
      data-viz-curve-partial-summary={manimEvidenceAttributes?.["data-viz-curve-partial-summary"] ?? runtimeDiagnostics.curvePartialSummary}
      data-viz-curve-partial-visibility-policy={
        manimEvidenceAttributes?.["data-viz-curve-partial-visibility-policy"] ?? runtimeDiagnostics.curvePartialVisibilityPolicy
      }
      data-viz-manim-history-can-redo={manimScene ? manimHistoryAttributes["data-viz-manim-history-can-redo"] : "false"}
      data-viz-manim-history-can-undo={manimScene ? manimHistoryAttributes["data-viz-manim-history-can-undo"] : "false"}
      data-viz-manim-history-branch-invalidated-redo-count={
        manimScene ? manimHistoryAttributes["data-viz-manim-history-branch-invalidated-redo-count"] : "0"
      }
      data-viz-manim-history-branch-invalidated-redo-labels={
        manimScene ? manimHistoryAttributes["data-viz-manim-history-branch-invalidated-redo-labels"] : "none"
      }
      data-viz-manim-history-branch-policy={
        manimScene ? manimHistoryAttributes["data-viz-manim-history-branch-policy"] : SCENE_HISTORY_BRANCH_POLICY
      }
      data-viz-manim-history-current-label={manimScene ? manimHistoryAttributes["data-viz-manim-history-current-label"] : "primitive"}
      data-viz-manim-history-dropped-undo-count={manimScene ? manimHistoryAttributes["data-viz-manim-history-dropped-undo-count"] : "0"}
      data-viz-manim-history-max-undo-entries={manimScene ? manimHistoryAttributes["data-viz-manim-history-max-undo-entries"] : "50"}
      data-viz-manim-history-redo-count={manimScene ? manimHistoryAttributes["data-viz-manim-history-redo-count"] : "0"}
      data-viz-manim-history-revision={manimScene ? manimHistoryAttributes["data-viz-manim-history-revision"] : "0"}
      data-viz-manim-history-source-contract={manimScene ? manimHistoryAttributes["data-viz-manim-history-source-contract"] : SCENE_HISTORY_SOURCE_CONTRACT}
      data-viz-manim-history-undo-count={manimScene ? manimHistoryAttributes["data-viz-manim-history-undo-count"] : "0"}
      data-viz-manim-frame-audit-active-frame-count={manimFrameAuditAttributes?.["data-viz-manim-frame-audit-active-frame-count"] ?? "0"}
      data-viz-manim-frame-audit-active-animation-node-progress-summary={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-active-animation-node-progress-summary"] ?? "none"
      }
      data-viz-manim-frame-audit-active-plan-ids={manimFrameAuditAttributes?.["data-viz-manim-frame-audit-active-plan-ids"] ?? "none"}
      data-viz-manim-frame-audit-animation-plan-frame-summary={manimFrameAuditAttributes?.["data-viz-manim-frame-audit-animation-plan-frame-summary"] ?? "none"}
      data-viz-manim-frame-audit-authored-plan-count={manimFrameAuditAttributes?.["data-viz-manim-frame-audit-authored-plan-count"] ?? "0"}
      data-viz-manim-frame-audit-camera-shot-summary={manimFrameAuditAttributes?.["data-viz-manim-frame-audit-camera-shot-summary"] ?? "none"}
      data-viz-manim-frame-audit-capture-height={manimFrameAuditAttributes?.["data-viz-manim-frame-audit-capture-height"] ?? "0"}
      data-viz-manim-frame-audit-capture-width={manimFrameAuditAttributes?.["data-viz-manim-frame-audit-capture-width"] ?? "0"}
      data-viz-manim-frame-audit-director-trace-camera-to-key-frame-count={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-director-trace-camera-to-key-frame-count"] ?? "0"
      }
      data-viz-manim-frame-audit-director-trace-formula-fixed-key-frame-count={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-director-trace-formula-fixed-key-frame-count"] ?? "0"
      }
      data-viz-manim-frame-audit-director-trace-key-frame-count={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-director-trace-key-frame-count"] ?? "0"
      }
      data-viz-manim-frame-audit-director-trace-source-contract={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-director-trace-source-contract"] ??
        SCENE_FRAME_DIRECTOR_TRACE_SOURCE_CONTRACT
      }
      data-viz-manim-frame-audit-director-trace-summary={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-director-trace-summary"] ??
        "frameDirectorTrace:none:keyframes=0:cameraTo=0:fixed=0:morph=0.000..0.000"
      }
      data-viz-manim-frame-audit-director-trace-svg-morph-progress-range={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-director-trace-svg-morph-progress-range"] ?? "0.000..0.000"
      }
      data-viz-manim-frame-audit-director-trace-timeline={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-director-trace-timeline"] ?? "none"
      }
      data-viz-manim-frame-audit-delta-summary={manimFrameAuditAttributes?.["data-viz-manim-frame-audit-delta-summary"] ?? "none"}
      data-viz-manim-frame-audit-fps={manimFrameAuditAttributes?.["data-viz-manim-frame-audit-fps"] ?? "0"}
      data-viz-manim-frame-audit-frame-interval={manimFrameAuditAttributes?.["data-viz-manim-frame-audit-frame-interval"] ?? "0.000"}
      data-viz-manim-frame-audit-frame-count={manimFrameAuditAttributes?.["data-viz-manim-frame-audit-frame-count"] ?? "0"}
      data-viz-manim-frame-audit-formula-mobile-frame-count={manimFrameAuditAttributes?.["data-viz-manim-frame-audit-formula-mobile-frame-count"] ?? "0"}
      data-viz-manim-frame-audit-formula-layer-active-object-ids={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-formula-layer-active-object-ids"] ?? "none"
      }
      data-viz-manim-frame-audit-formula-layer-active-object-summary={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-formula-layer-active-object-summary"] ?? "none"
      }
      data-viz-manim-frame-audit-formula-layer-active-token-count-range={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-formula-layer-active-token-count-range"] ?? "0.000..0.000"
      }
      data-viz-manim-frame-audit-formula-layer-bound-token-count-range={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-formula-layer-bound-token-count-range"] ?? "0.000..0.000"
      }
      data-viz-manim-frame-audit-formula-layer-camera-to-frame-count={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-formula-layer-camera-to-frame-count"] ?? "0"
      }
      data-viz-manim-frame-audit-formula-layer-camera-to-screen-fixed-frame-count={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-formula-layer-camera-to-screen-fixed-frame-count"] ?? "0"
      }
      data-viz-manim-frame-audit-formula-layer-frame-count={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-formula-layer-frame-count"] ?? "0"
      }
      data-viz-manim-frame-audit-formula-layer-screen-fixed-frame-count={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-formula-layer-screen-fixed-frame-count"] ?? "0"
      }
      data-viz-manim-frame-audit-formula-layer-source-contract={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-formula-layer-source-contract"] ?? FORMULA_LAYER_SOURCE_CONTRACT
      }
      data-viz-manim-frame-audit-formula-layer-summary={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-formula-layer-summary"] ??
        "frameFormulaLayer:none:frames=0:screenFixed=0:cameraTo=0:cameraFixed=0:tokens=0.000..0.000:bound=0.000..0.000:activeTokens=0.000..0.000:activeObjects=none"
      }
      data-viz-manim-frame-audit-formula-layer-token-count-range={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-formula-layer-token-count-range"] ?? "0.000..0.000"
      }
      data-viz-manim-frame-audit-svg-morph-runtime-compatible-path-frame-count={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-svg-morph-runtime-compatible-path-frame-count"] ?? "0"
      }
      data-viz-manim-frame-audit-svg-morph-runtime-formula-ids={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-svg-morph-runtime-formula-ids"] ?? "none"
      }
      data-viz-manim-frame-audit-svg-morph-runtime-frame-ids={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-svg-morph-runtime-frame-ids"] ?? "none"
      }
      data-viz-manim-frame-audit-svg-morph-runtime-frame-path-preview={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-svg-morph-runtime-frame-path-preview"] ?? "none"
      }
      data-viz-manim-frame-audit-svg-morph-runtime-issue-count={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-svg-morph-runtime-issue-count"] ?? "0"
      }
      data-viz-manim-frame-audit-svg-morph-runtime-path-frame-count={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-svg-morph-runtime-path-frame-count"] ?? "0"
      }
      data-viz-manim-frame-audit-svg-morph-runtime-progress-range={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-svg-morph-runtime-progress-range"] ?? "0.000..0.000"
      }
      data-viz-manim-frame-audit-svg-morph-runtime-sampled-frame-count={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-svg-morph-runtime-sampled-frame-count"] ?? "0"
      }
      data-viz-manim-frame-audit-svg-morph-runtime-source-contract={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-svg-morph-runtime-source-contract"] ??
        FORMULA_SVG_MORPH_RUNTIME_SOURCE_CONTRACT
      }
      data-viz-manim-frame-audit-svg-morph-runtime-summary={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-svg-morph-runtime-summary"] ??
        "frameSvgMorphRuntime:none:sampleFrames=0:pathFrames=0:compatible=0:issues=0:progress=0.000..0.000:ids=none"
      }
      data-viz-manim-frame-audit-max-progress={manimFrameAuditAttributes?.["data-viz-manim-frame-audit-max-progress"] ?? "0.000"}
      data-viz-manim-frame-audit-max-updater-active-count={manimFrameAuditAttributes?.["data-viz-manim-frame-audit-max-updater-active-count"] ?? "0"}
      data-viz-manim-frame-audit-max-updater-suspended-count={manimFrameAuditAttributes?.["data-viz-manim-frame-audit-max-updater-suspended-count"] ?? "0"}
      data-viz-manim-frame-audit-min-progress={manimFrameAuditAttributes?.["data-viz-manim-frame-audit-min-progress"] ?? "0.000"}
      data-viz-manim-frame-audit-mobject-point-frame-count={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-mobject-point-frame-count"] ?? "0"
      }
      data-viz-manim-frame-audit-mobject-point-ids={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-mobject-point-ids"] ?? "none"
      }
      data-viz-manim-frame-audit-mobject-point-position-range-summary={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-mobject-point-position-range-summary"] ?? "none"
      }
      data-viz-manim-frame-audit-move-along-vector-field-frame-count={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-move-along-vector-field-frame-count"] ?? "0"
      }
      data-viz-manim-frame-audit-move-along-vector-field-moved-frame-count={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-move-along-vector-field-moved-frame-count"] ?? "0"
      }
      data-viz-manim-frame-audit-move-along-vector-field-object-ids={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-move-along-vector-field-object-ids"] ?? "none"
      }
      data-viz-manim-frame-audit-move-along-vector-field-delta-summary={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-move-along-vector-field-delta-summary"] ?? "none"
      }
      data-viz-manim-frame-audit-move-along-vector-field-displacement-magnitude-range-summary={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-move-along-vector-field-displacement-magnitude-range-summary"] ?? "none"
      }
      data-viz-manim-frame-audit-move-along-vector-field-status-summary={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-move-along-vector-field-status-summary"] ?? "none"
      }
      data-viz-manim-frame-audit-move-along-vector-field-summary={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-move-along-vector-field-summary"] ??
        "frameMoveAlongVectorField:none:frames=0:movedFrames=0:objects=none:delta=none:displacement=none:status=none"
      }
      data-viz-manim-frame-audit-move-along-vector-field-source-contract={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-move-along-vector-field-source-contract"] ??
        MOVE_ALONG_VECTOR_FIELD_SOURCE_CONTRACT
      }
      data-viz-manim-frame-audit-play-lifecycle-event-count={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-play-lifecycle-event-count"] ?? "0"
      }
      data-viz-manim-frame-audit-play-lifecycle-event-first-key={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-play-lifecycle-event-first-key"] ?? "none"
      }
      data-viz-manim-frame-audit-play-lifecycle-event-last-key={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-play-lifecycle-event-last-key"] ?? "none"
      }
      data-viz-manim-frame-audit-play-lifecycle-event-phase-summary={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-play-lifecycle-event-phase-summary"] ?? "none"
      }
      data-viz-manim-frame-audit-play-lifecycle-event-source-contract={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-play-lifecycle-event-source-contract"] ??
        SCENE_PLAYBACK_SOURCE_CONTRACT
      }
      data-viz-manim-frame-audit-play-lifecycle-event-summary={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-play-lifecycle-event-summary"] ??
        "playLifecycleEvents:none:events=0:phases=none:first=none:last=none"
      }
      data-viz-manim-frame-audit-play-lifecycle-trace-animation-plan-summary={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-play-lifecycle-trace-animation-plan-summary"] ?? "none"
      }
      data-viz-manim-frame-audit-play-lifecycle-trace-key-frame-count={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-play-lifecycle-trace-key-frame-count"] ?? "0"
      }
      data-viz-manim-frame-audit-play-lifecycle-trace-phase-summary={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-play-lifecycle-trace-phase-summary"] ?? "none"
      }
      data-viz-manim-frame-audit-play-lifecycle-trace-source-contract={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-play-lifecycle-trace-source-contract"] ??
        SCENE_PLAYBACK_SOURCE_CONTRACT
      }
      data-viz-manim-frame-audit-play-lifecycle-trace-summary={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-play-lifecycle-trace-summary"] ??
        "framePlayLifecycleTrace:none:keyframes=0:phases=none:plans=none"
      }
      data-viz-manim-frame-audit-play-lifecycle-trace-timeline={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-play-lifecycle-trace-timeline"] ?? "none"
      }
      data-viz-manim-frame-audit-playback-phase-summary={manimFrameAuditAttributes?.["data-viz-manim-frame-audit-playback-phase-summary"] ?? "none"}
      data-viz-manim-frame-audit-primary-animation-plan-frame-summary={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-primary-animation-plan-frame-summary"] ?? "none"
      }
      data-viz-manim-frame-audit-primary-animation-plan-progress-summary={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-primary-animation-plan-progress-summary"] ?? "none"
      }
      data-viz-manim-frame-audit-quality-preset={manimFrameAuditAttributes?.["data-viz-manim-frame-audit-quality-preset"] ?? "interactive"}
      data-viz-manim-frame-audit-renderer-mode={manimFrameAuditAttributes?.["data-viz-manim-frame-audit-renderer-mode"] ?? "interactive"}
      data-viz-manim-frame-audit-expected-render-group-ids={manimFrameAuditAttributes?.["data-viz-manim-frame-audit-expected-render-group-ids"] ?? "none"}
      data-viz-manim-frame-audit-render-group-coverage-ready={manimFrameAuditAttributes?.["data-viz-manim-frame-audit-render-group-coverage-ready"] ?? "false"}
      data-viz-manim-frame-audit-render-group-missing-frame-count={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-render-group-missing-frame-count"] ?? "0"
      }
      data-viz-manim-frame-audit-render-group-overlap-summary={manimFrameAuditAttributes?.["data-viz-manim-frame-audit-render-group-overlap-summary"] ?? "none"}
      data-viz-manim-frame-audit-render-group-summary={manimFrameAuditAttributes?.["data-viz-manim-frame-audit-render-group-summary"] ?? "none"}
      data-viz-manim-frame-audit-sampled-camera-shot-ids={manimFrameAuditAttributes?.["data-viz-manim-frame-audit-sampled-camera-shot-ids"] ?? "none"}
      data-viz-manim-frame-audit-sampled-playback-phase-ids={manimFrameAuditAttributes?.["data-viz-manim-frame-audit-sampled-playback-phase-ids"] ?? "none"}
      data-viz-manim-frame-audit-sampled-render-group-ids={manimFrameAuditAttributes?.["data-viz-manim-frame-audit-sampled-render-group-ids"] ?? "none"}
      data-viz-manim-frame-audit-sampling-mode={manimFrameAuditAttributes?.["data-viz-manim-frame-audit-sampling-mode"] ?? "full-playback"}
      data-viz-manim-frame-audit-sampled-step-ids={manimFrameAuditAttributes?.["data-viz-manim-frame-audit-sampled-step-ids"] ?? "none"}
      data-viz-manim-frame-audit-camera-frame-active-shot-ids={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-camera-frame-active-shot-ids"] ?? "none"
      }
      data-viz-manim-frame-audit-camera-frame-camera-to-frame-count={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-camera-frame-camera-to-frame-count"] ?? "0"
      }
      data-viz-manim-frame-audit-camera-frame-current-frame-ids={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-camera-frame-current-frame-ids"] ?? "none"
      }
      data-viz-manim-frame-audit-camera-frame-finite-matrix-entry-frame-count={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-camera-frame-finite-matrix-entry-frame-count"] ?? "0"
      }
      data-viz-manim-frame-audit-camera-frame-fixed-overlay-frame-count={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-camera-frame-fixed-overlay-frame-count"] ?? "0"
      }
      data-viz-manim-frame-audit-camera-frame-fov-range={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-camera-frame-fov-range"] ?? "0.000..0.000"
      }
      data-viz-manim-frame-audit-camera-frame-frame-count={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-camera-frame-frame-count"] ?? "0"
      }
      data-viz-manim-frame-audit-camera-frame-gamma-range={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-camera-frame-gamma-range"] ?? "0.000..0.000"
      }
      data-viz-manim-frame-audit-camera-frame-phi-range={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-camera-frame-phi-range"] ?? "0.000..0.000"
      }
      data-viz-manim-frame-audit-camera-frame-position-range-summary={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-camera-frame-position-range-summary"] ?? "x=0.000..0.000;y=0.000..0.000;z=0.000..0.000"
      }
      data-viz-manim-frame-audit-camera-frame-progress-range={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-camera-frame-progress-range"] ?? "0.000..0.000"
      }
      data-viz-manim-frame-audit-camera-frame-source-contract={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-camera-frame-source-contract"] ?? CAMERA_FRAME_SOURCE_CONTRACT
      }
      data-viz-manim-frame-audit-camera-frame-summary={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-camera-frame-summary"] ??
        "frameCameraFrame:none:frames=0:cameraToFrames=0:active=none:ids=none:progress=0.000..0.000:fov=0.000..0.000:theta=0.000..0.000:phi=0.000..0.000:fixed=0:finiteMatrices=0:viewInverseReady=0"
      }
      data-viz-manim-frame-audit-camera-frame-target-range-summary={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-camera-frame-target-range-summary"] ?? "x=0.000..0.000;y=0.000..0.000;z=0.000..0.000"
      }
      data-viz-manim-frame-audit-camera-frame-theta-range={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-camera-frame-theta-range"] ?? "0.000..0.000"
      }
      data-viz-manim-frame-audit-camera-frame-uniform-center-range-summary={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-camera-frame-uniform-center-range-summary"] ?? "x=0.000..0.000;y=0.000..0.000;z=0.000..0.000"
      }
      data-viz-manim-frame-audit-camera-frame-uniform-summary={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-camera-frame-uniform-summary"] ?? "uniforms=none"
      }
      data-viz-manim-frame-audit-camera-frame-view-inverse-max-error={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-camera-frame-view-inverse-max-error"] ?? "0.000000"
      }
      data-viz-manim-frame-audit-camera-frame-view-inverse-ready-frame-count={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-camera-frame-view-inverse-ready-frame-count"] ?? "0"
      }
      data-viz-manim-frame-audit-scene-id={manimFrameAuditAttributes?.["data-viz-manim-frame-audit-scene-id"] ?? runtimeDiagnostics.sceneId}
      data-viz-manim-frame-audit-skip-animations={manimFrameAuditAttributes?.["data-viz-manim-frame-audit-skip-animations"] ?? "false"}
      data-viz-manim-frame-audit-source-contract={manimFrameAuditAttributes?.["data-viz-manim-frame-audit-source-contract"] ?? SCENE_FRAME_AUDIT_SOURCE_CONTRACT}
      data-viz-manim-frame-audit-step-summary={manimFrameAuditAttributes?.["data-viz-manim-frame-audit-step-summary"] ?? "none"}
      data-viz-manim-frame-audit-transform-interpolate-field-arc-path-node-frame-count={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-transform-interpolate-field-arc-path-node-frame-count"] ?? "0"
      }
      data-viz-manim-frame-audit-transform-interpolate-field-bounding-box-node-frame-count={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-transform-interpolate-field-bounding-box-node-frame-count"] ?? "0"
      }
      data-viz-manim-frame-audit-transform-interpolate-field-frame-count={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-transform-interpolate-field-frame-count"] ?? "0"
      }
      data-viz-manim-frame-audit-transform-interpolate-field-node-frame-count={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-transform-interpolate-field-node-frame-count"] ?? "0"
      }
      data-viz-manim-frame-audit-transform-interpolate-field-non-point-frame-count={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-transform-interpolate-field-non-point-frame-count"] ?? "0"
      }
      data-viz-manim-frame-audit-transform-interpolate-field-non-point-policy={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-transform-interpolate-field-non-point-policy"] ??
        TRANSFORM_PATH_NON_POINT_FIELD_POLICY
      }
      data-viz-manim-frame-audit-transform-interpolate-field-object-ids={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-transform-interpolate-field-object-ids"] ?? "none"
      }
      data-viz-manim-frame-audit-transform-interpolate-field-path-summary={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-transform-interpolate-field-path-summary"] ?? "none"
      }
      data-viz-manim-frame-audit-transform-interpolate-field-pointlike-frame-count={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-transform-interpolate-field-pointlike-frame-count"] ?? "0"
      }
      data-viz-manim-frame-audit-transform-interpolate-field-pointlike-policy={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-transform-interpolate-field-pointlike-policy"] ??
        TRANSFORM_PATH_POINTLIKE_FIELD_POLICY
      }
      data-viz-manim-frame-audit-transform-interpolate-field-pointlike-summary={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-transform-interpolate-field-pointlike-summary"] ?? "none"
      }
      data-viz-manim-frame-audit-transform-interpolate-field-source-summary={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-transform-interpolate-field-source-summary"] ??
        MOBJECT_INTERPOLATE_DATA_SOURCE_SUMMARY
      }
      data-viz-manim-frame-audit-transform-interpolate-field-straight-path-node-frame-count={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-transform-interpolate-field-straight-path-node-frame-count"] ?? "0"
      }
      data-viz-manim-frame-audit-transform-interpolate-field-style-node-frame-count={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-transform-interpolate-field-style-node-frame-count"] ?? "0"
      }
      data-viz-manim-frame-audit-transform-interpolate-field-summary={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-transform-interpolate-field-summary"] ??
        "frameTransformInterpolateFields:none:frames=0:nodes=0:pointlike=0:nonPoint=0:style=0:uniforms=0:bounds=0:paths=none:kinds=none:objects=none"
      }
      data-viz-manim-frame-audit-transform-interpolate-field-uniform-node-frame-count={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-transform-interpolate-field-uniform-node-frame-count"] ?? "0"
      }
      data-viz-manim-frame-audit-value-tracker-animate-frame-count={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-value-tracker-animate-frame-count"] ?? "0"
      }
      data-viz-manim-frame-audit-value-tracker-count={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-value-tracker-count"] ?? "0"
      }
      data-viz-manim-frame-audit-value-tracker-frame-count={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-value-tracker-frame-count"] ?? "0"
      }
      data-viz-manim-frame-audit-value-tracker-hidden-mobject-count={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-value-tracker-hidden-mobject-count"] ?? "0"
      }
      data-viz-manim-frame-audit-value-tracker-hidden-mobject-ids={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-value-tracker-hidden-mobject-ids"] ?? "none"
      }
      data-viz-manim-frame-audit-value-tracker-ids={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-value-tracker-ids"] ?? "none"
      }
      data-viz-manim-frame-audit-value-tracker-normalized-range-summary={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-value-tracker-normalized-range-summary"] ?? "none"
      }
      data-viz-manim-frame-audit-value-tracker-source-contract={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-value-tracker-source-contract"] ?? VALUE_TRACKER_SOURCE_CONTRACT
      }
      data-viz-manim-frame-audit-value-tracker-source-summary={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-value-tracker-source-summary"] ?? "object=0,parameter=0,timeline=0,value=0"
      }
      data-viz-manim-frame-audit-value-tracker-summary={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-value-tracker-summary"] ??
        "frameValueTrackers:none:frames=0:trackers=0:hidden=0:animateFrames=0:sources=object=0,parameter=0,timeline=0,value=0:ranges=none"
      }
      data-viz-manim-frame-audit-value-tracker-uniform-value-range-summary={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-value-tracker-uniform-value-range-summary"] ?? "none"
      }
      data-viz-manim-frame-audit-sub-alpha-complete-node-frame-count={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-sub-alpha-complete-node-frame-count"] ?? "0"
      }
      data-viz-manim-frame-audit-sub-alpha-delayed-node-frame-count={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-sub-alpha-delayed-node-frame-count"] ?? "0"
      }
      data-viz-manim-frame-audit-sub-alpha-eased-range={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-sub-alpha-eased-range"] ?? "0.000..0.000"
      }
      data-viz-manim-frame-audit-sub-alpha-family-zip-covered-node-frame-count={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-sub-alpha-family-zip-covered-node-frame-count"] ?? "0"
      }
      data-viz-manim-frame-audit-sub-alpha-family-zip-max-tuple-count={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-sub-alpha-family-zip-max-tuple-count"] ?? "0"
      }
      data-viz-manim-frame-audit-sub-alpha-family-zip-missing-node-frame-count={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-sub-alpha-family-zip-missing-node-frame-count"] ?? "0"
      }
      data-viz-manim-frame-audit-sub-alpha-family-zip-policy={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-sub-alpha-family-zip-policy"] ??
        TRANSFORM_FAMILY_ALIGNMENT_ZIP_POLICY
      }
      data-viz-manim-frame-audit-sub-alpha-family-zip-sequence-summary={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-sub-alpha-family-zip-sequence-summary"] ?? "none"
      }
      data-viz-manim-frame-audit-sub-alpha-family-zip-uncovered-object-ids={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-sub-alpha-family-zip-uncovered-object-ids"] ?? "none"
      }
      data-viz-manim-frame-audit-sub-alpha-frame-count={manimFrameAuditAttributes?.["data-viz-manim-frame-audit-sub-alpha-frame-count"] ?? "0"}
      data-viz-manim-frame-audit-sub-alpha-lagged-range={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-sub-alpha-lagged-range"] ?? "0.000..0.000"
      }
      data-viz-manim-frame-audit-sub-alpha-leading-node-frame-count={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-sub-alpha-leading-node-frame-count"] ?? "0"
      }
      data-viz-manim-frame-audit-sub-alpha-node-frame-count={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-sub-alpha-node-frame-count"] ?? "0"
      }
      data-viz-manim-frame-audit-sub-alpha-node-window-summary={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-sub-alpha-node-window-summary"] ?? "none"
      }
      data-viz-manim-frame-audit-sub-alpha-object-ids={manimFrameAuditAttributes?.["data-viz-manim-frame-audit-sub-alpha-object-ids"] ?? "none"}
      data-viz-manim-frame-audit-sub-alpha-partial-node-frame-count={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-sub-alpha-partial-node-frame-count"] ?? "0"
      }
      data-viz-manim-frame-audit-sub-alpha-rate-function-ids={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-sub-alpha-rate-function-ids"] ?? "none"
      }
      data-viz-manim-frame-audit-sub-alpha-raw-range={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-sub-alpha-raw-range"] ?? "0.000..0.000"
      }
      data-viz-manim-frame-audit-sub-alpha-staggered-node-frame-count={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-sub-alpha-staggered-node-frame-count"] ?? "0"
      }
      data-viz-manim-frame-audit-sub-alpha-summary={manimFrameAuditAttributes?.["data-viz-manim-frame-audit-sub-alpha-summary"] ?? "none"}
      data-viz-manim-frame-audit-sub-alpha-zero-node-frame-count={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-sub-alpha-zero-node-frame-count"] ?? "0"
      }
      data-viz-manim-frame-audit-transform-frame-count={manimFrameAuditAttributes?.["data-viz-manim-frame-audit-transform-frame-count"] ?? "0"}
      data-viz-manim-frame-audit-updater-summary={manimFrameAuditAttributes?.["data-viz-manim-frame-audit-updater-summary"] ?? "none"}
      data-viz-manim-frame-audit-updater-execution-active-call-sequence-summary={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-updater-execution-active-call-sequence-summary"] ??
        "none"
      }
      data-viz-manim-frame-audit-updater-execution-family-traversal-summary={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-updater-execution-family-traversal-summary"] ??
        "familyTraversal:visited=0:withUpdaters=0:idle=0:order=children-first:ids=none"
      }
      data-viz-manim-frame-audit-updater-execution-order-summary={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-updater-execution-order-summary"] ?? "none"
      }
      data-viz-manim-frame-audit-updater-execution-summary={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-updater-execution-summary"] ?? "none"
      }
      data-viz-manim-frame-audit-updater-suspension-owned-object-ids={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-updater-suspension-owned-object-ids"] ?? "none"
      }
      data-viz-manim-frame-audit-updater-suspension-owned-object-summary={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-updater-suspension-owned-object-summary"] ?? "none"
      }
      data-viz-manim-frame-audit-updater-suspension-count-summary={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-updater-suspension-count-summary"] ?? "none"
      }
      data-viz-manim-frame-audit-updater-suspension-phase-summary={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-updater-suspension-phase-summary"] ?? "none"
      }
      data-viz-manim-frame-audit-updater-suspension-policy={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-updater-suspension-policy"] ?? UPDATER_SUSPENSION_POLICY
      }
      data-viz-manim-frame-audit-updater-suspension-reason-summary={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-updater-suspension-reason-summary"] ?? "none"
      }
      data-viz-manim-frame-audit-updater-suspension-source-contract={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-updater-suspension-source-contract"] ??
        UPDATER_SUSPENSION_SOURCE_CONTRACT
      }
      data-viz-manim-frame-audit-updater-suspension-suspended-frame-count={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-updater-suspension-suspended-frame-count"] ?? "0"
      }
      data-viz-manim-frame-audit-updater-suspension-suspended-object-ids={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-updater-suspension-suspended-object-ids"] ?? "none"
      }
      data-viz-manim-frame-audit-updater-suspension-suspended-object-summary={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-updater-suspension-suspended-object-summary"] ?? "none"
      }
      data-viz-manim-frame-audit-updater-suspension-suspended-updater-frame-count={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-updater-suspension-suspended-updater-frame-count"] ?? "0"
      }
      data-viz-manim-frame-audit-updater-suspension-suspended-updater-ids={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-updater-suspension-suspended-updater-ids"] ?? "none"
      }
      data-viz-manim-frame-audit-updater-suspension-suspended-updater-summary={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-updater-suspension-suspended-updater-summary"] ?? "none"
      }
      data-viz-manim-frame-audit-updater-suspension-summary={
        manimFrameAuditAttributes?.["data-viz-manim-frame-audit-updater-suspension-summary"] ??
        "frameUpdaterSuspension:none:frames=0:suspendedFrames=0:suspendedUpdaterFrames=0:phases=none:counts=none:animated=none:suspended=none"
      }
      data-viz-manim-active-animation-node-count={manimEvidenceAttributes?.["data-viz-manim-active-animation-node-count"] ?? runtimeDiagnostics.manimActiveAnimationNodeCount}
      data-viz-manim-active-animation-node-progress-summary={
        manimEvidenceAttributes?.["data-viz-manim-active-animation-node-progress-summary"] ?? "none"
      }
      data-viz-manim-active-animation-object-id={manimEvidenceAttributes?.["data-viz-manim-active-animation-object-id"] ?? runtimeDiagnostics.manimActiveAnimationObjectId}
      data-viz-manim-active-animation-plan-id={manimEvidenceAttributes?.["data-viz-manim-active-animation-plan-id"] ?? runtimeDiagnostics.manimActiveAnimationPlanId}
      data-viz-manim-active-animation-plan-ids={manimEvidenceAttributes?.["data-viz-manim-active-animation-plan-ids"] ?? runtimeDiagnostics.manimActiveAnimationPlanIds}
      data-viz-manim-active-animation-progress={manimEvidenceAttributes?.["data-viz-manim-active-animation-progress"] ?? runtimeDiagnostics.manimActiveAnimationProgress.toFixed(3)}
      data-viz-manim-active-animation-target-id={manimEvidenceAttributes?.["data-viz-manim-active-animation-target-id"] ?? runtimeDiagnostics.manimActiveAnimationTargetObjectId}
      data-viz-manim-animation-runtime-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-animation-runtime-source-contract"] ??
        ANIMATION_RUNTIME_SOURCE_CONTRACT
      }
      data-viz-manim-animation-runtime-mobject-interpolate-policy={
        manimEvidenceAttributes?.["data-viz-manim-animation-runtime-mobject-interpolate-policy"] ??
        MOBJECT_INTERPOLATE_RENDER_POLICY
      }
      data-viz-manim-animation-runtime-active={
        manimEvidenceAttributes?.["data-viz-manim-animation-runtime-active"] ?? "false"
      }
      data-viz-manim-animation-runtime-active-plan-count={
        manimEvidenceAttributes?.["data-viz-manim-animation-runtime-active-plan-count"] ?? "0"
      }
      data-viz-manim-animation-runtime-active-plan-ids={
        manimEvidenceAttributes?.["data-viz-manim-animation-runtime-active-plan-ids"] ?? "none"
      }
      data-viz-manim-animation-runtime-node-count={
        manimEvidenceAttributes?.["data-viz-manim-animation-runtime-node-count"] ?? "0"
      }
      data-viz-manim-animation-runtime-object-id={
        manimEvidenceAttributes?.["data-viz-manim-animation-runtime-object-id"] ?? "none"
      }
      data-viz-manim-animation-runtime-object-ids={
        manimEvidenceAttributes?.["data-viz-manim-animation-runtime-object-ids"] ?? "none"
      }
      data-viz-manim-animation-runtime-target-object-id={
        manimEvidenceAttributes?.["data-viz-manim-animation-runtime-target-object-id"] ?? "none"
      }
      data-viz-manim-animation-runtime-progress={
        manimEvidenceAttributes?.["data-viz-manim-animation-runtime-progress"] ?? "1.000"
      }
      data-viz-manim-animation-runtime-raw-progress-range={
        manimEvidenceAttributes?.["data-viz-manim-animation-runtime-raw-progress-range"] ?? "none"
      }
      data-viz-manim-animation-runtime-lagged-progress-range={
        manimEvidenceAttributes?.["data-viz-manim-animation-runtime-lagged-progress-range"] ?? "none"
      }
      data-viz-manim-animation-runtime-eased-progress-range={
        manimEvidenceAttributes?.["data-viz-manim-animation-runtime-eased-progress-range"] ?? "none"
      }
      data-viz-manim-animation-runtime-rate-functions={
        manimEvidenceAttributes?.["data-viz-manim-animation-runtime-rate-functions"] ?? "none"
      }
      data-viz-manim-animation-runtime-render-kind-summary={
        manimEvidenceAttributes?.["data-viz-manim-animation-runtime-render-kind-summary"] ?? "none"
      }
      data-viz-manim-animation-runtime-finite-bounding-box-count={
        manimEvidenceAttributes?.["data-viz-manim-animation-runtime-finite-bounding-box-count"] ?? "0"
      }
      data-viz-manim-animation-runtime-summary={
        manimEvidenceAttributes?.["data-viz-manim-animation-runtime-summary"] ??
        "animationRuntime:active=false:plans=0:nodes=0:kinds=none:raw=none:lagged=none:eased=none:rates=none"
      }
      data-viz-manim-transform-interpolate-bounding-box-count={
        manimEvidenceAttributes?.["data-viz-manim-transform-interpolate-bounding-box-count"] ??
        String(runtimeDiagnostics.manimTransformInterpolateBoundingBoxCount)
      }
      data-viz-manim-transform-interpolate-bounding-box-empty-count={
        manimEvidenceAttributes?.["data-viz-manim-transform-interpolate-bounding-box-empty-count"] ??
        String(runtimeDiagnostics.manimTransformInterpolateEmptyBoundingBoxCount)
      }
      data-viz-manim-transform-interpolate-bounding-box-finite-count={
        manimEvidenceAttributes?.["data-viz-manim-transform-interpolate-bounding-box-finite-count"] ??
        String(runtimeDiagnostics.manimTransformInterpolateFiniteBoundingBoxCount)
      }
      data-viz-manim-transform-interpolate-bounding-box-object-ids={
        manimEvidenceAttributes?.["data-viz-manim-transform-interpolate-bounding-box-object-ids"] ??
        runtimeDiagnostics.manimTransformInterpolateBoundingBoxObjectIds
      }
      data-viz-manim-transform-interpolate-bounding-box-summary={
        manimEvidenceAttributes?.["data-viz-manim-transform-interpolate-bounding-box-summary"] ??
        runtimeDiagnostics.manimTransformInterpolateBoundingBoxSummary
      }
      data-viz-manim-transform-interpolate-uniform-clipping-plane-count={
        manimEvidenceAttributes?.["data-viz-manim-transform-interpolate-uniform-clipping-plane-count"] ??
        String(runtimeDiagnostics.manimTransformInterpolateUniformClippingPlaneCount)
      }
      data-viz-manim-transform-interpolate-uniform-count={
        manimEvidenceAttributes?.["data-viz-manim-transform-interpolate-uniform-count"] ??
        String(runtimeDiagnostics.manimTransformInterpolateUniformCount)
      }
      data-viz-manim-transform-interpolate-uniform-object-ids={
        manimEvidenceAttributes?.["data-viz-manim-transform-interpolate-uniform-object-ids"] ??
        runtimeDiagnostics.manimTransformInterpolateUniformObjectIds
      }
      data-viz-manim-transform-interpolate-uniform-opacity-range={
        manimEvidenceAttributes?.["data-viz-manim-transform-interpolate-uniform-opacity-range"] ??
        runtimeDiagnostics.manimTransformInterpolateUniformOpacityRange
      }
      data-viz-manim-transform-interpolate-uniform-opacity-sample-count={
        manimEvidenceAttributes?.["data-viz-manim-transform-interpolate-uniform-opacity-sample-count"] ??
        String(runtimeDiagnostics.manimTransformInterpolateUniformOpacitySampleCount)
      }
      data-viz-manim-transform-interpolate-uniform-source-summary={
        manimEvidenceAttributes?.["data-viz-manim-transform-interpolate-uniform-source-summary"] ??
        runtimeDiagnostics.manimTransformInterpolateUniformSourceSummary
      }
      data-viz-manim-transform-interpolate-uniform-summary={
        manimEvidenceAttributes?.["data-viz-manim-transform-interpolate-uniform-summary"] ??
        runtimeDiagnostics.manimTransformInterpolateUniformSummary
      }
      data-viz-manim-transform-interpolate-field-arc-path-node-count={
        manimEvidenceAttributes?.["data-viz-manim-transform-interpolate-field-arc-path-node-count"] ?? "0"
      }
      data-viz-manim-transform-interpolate-field-bounding-box-node-count={
        manimEvidenceAttributes?.["data-viz-manim-transform-interpolate-field-bounding-box-node-count"] ?? "0"
      }
      data-viz-manim-transform-interpolate-field-node-count={
        manimEvidenceAttributes?.["data-viz-manim-transform-interpolate-field-node-count"] ?? "0"
      }
      data-viz-manim-transform-interpolate-field-non-point-count={
        manimEvidenceAttributes?.["data-viz-manim-transform-interpolate-field-non-point-count"] ?? "0"
      }
      data-viz-manim-transform-interpolate-field-non-point-policy={
        manimEvidenceAttributes?.["data-viz-manim-transform-interpolate-field-non-point-policy"] ??
        TRANSFORM_PATH_NON_POINT_FIELD_POLICY
      }
      data-viz-manim-transform-interpolate-field-object-ids={
        manimEvidenceAttributes?.["data-viz-manim-transform-interpolate-field-object-ids"] ?? "none"
      }
      data-viz-manim-transform-interpolate-field-path-summary={
        manimEvidenceAttributes?.["data-viz-manim-transform-interpolate-field-path-summary"] ?? "none"
      }
      data-viz-manim-transform-interpolate-field-pointlike-count={
        manimEvidenceAttributes?.["data-viz-manim-transform-interpolate-field-pointlike-count"] ?? "0"
      }
      data-viz-manim-transform-interpolate-field-pointlike-policy={
        manimEvidenceAttributes?.["data-viz-manim-transform-interpolate-field-pointlike-policy"] ??
        TRANSFORM_PATH_POINTLIKE_FIELD_POLICY
      }
      data-viz-manim-transform-interpolate-field-pointlike-summary={
        manimEvidenceAttributes?.["data-viz-manim-transform-interpolate-field-pointlike-summary"] ?? "none"
      }
      data-viz-manim-transform-interpolate-field-source-summary={
        manimEvidenceAttributes?.["data-viz-manim-transform-interpolate-field-source-summary"] ??
        MOBJECT_INTERPOLATE_DATA_SOURCE_SUMMARY
      }
      data-viz-manim-transform-interpolate-field-straight-path-node-count={
        manimEvidenceAttributes?.["data-viz-manim-transform-interpolate-field-straight-path-node-count"] ?? "0"
      }
      data-viz-manim-transform-interpolate-field-style-node-count={
        manimEvidenceAttributes?.["data-viz-manim-transform-interpolate-field-style-node-count"] ?? "0"
      }
      data-viz-manim-transform-interpolate-field-summary={
        manimEvidenceAttributes?.["data-viz-manim-transform-interpolate-field-summary"] ??
        "transform-interpolate-fields:nodes=0:pointlike=0:nonPoint=0:style=0:uniforms=0:bounds=0:paths=none:kinds=none"
      }
      data-viz-manim-transform-interpolate-field-uniform-node-count={
        manimEvidenceAttributes?.["data-viz-manim-transform-interpolate-field-uniform-node-count"] ?? "0"
      }
      data-viz-manim-transform-family-alignment-entering-count={
        manimEvidenceAttributes?.["data-viz-manim-transform-family-alignment-entering-count"] ??
        String(runtimeDiagnostics.manimTransformFamilyAlignmentEnteringCount)
      }
      data-viz-manim-transform-family-alignment-entry-count={
        manimEvidenceAttributes?.["data-viz-manim-transform-family-alignment-entry-count"] ??
        String(runtimeDiagnostics.manimTransformFamilyAlignmentEntryCount)
      }
      data-viz-manim-transform-family-alignment-exiting-count={
        manimEvidenceAttributes?.["data-viz-manim-transform-family-alignment-exiting-count"] ??
        String(runtimeDiagnostics.manimTransformFamilyAlignmentExitingCount)
      }
      data-viz-manim-transform-family-alignment-family-pair-sequence={
        manimEvidenceAttributes?.["data-viz-manim-transform-family-alignment-family-pair-sequence"] ??
        runtimeDiagnostics.manimTransformFamilyAlignmentFamilyPairSequence
      }
      data-viz-manim-transform-family-alignment-family-zip-complete-count={
        manimEvidenceAttributes?.["data-viz-manim-transform-family-alignment-family-zip-complete-count"] ??
        String(runtimeDiagnostics.manimTransformFamilyAlignmentFamilyZipCompleteCount)
      }
      data-viz-manim-transform-family-alignment-family-zip-incomplete-count={
        manimEvidenceAttributes?.["data-viz-manim-transform-family-alignment-family-zip-incomplete-count"] ??
        String(runtimeDiagnostics.manimTransformFamilyAlignmentFamilyZipIncompleteCount)
      }
      data-viz-manim-transform-family-alignment-family-zip-policy={
        manimEvidenceAttributes?.["data-viz-manim-transform-family-alignment-family-zip-policy"] ??
        runtimeDiagnostics.manimTransformFamilyAlignmentFamilyZipPolicy
      }
      data-viz-manim-transform-family-alignment-family-zip-sequence={
        manimEvidenceAttributes?.["data-viz-manim-transform-family-alignment-family-zip-sequence"] ??
        runtimeDiagnostics.manimTransformFamilyAlignmentFamilyZipSequence
      }
      data-viz-manim-transform-family-alignment-family-zip-tuple-count={
        manimEvidenceAttributes?.["data-viz-manim-transform-family-alignment-family-zip-tuple-count"] ??
        String(runtimeDiagnostics.manimTransformFamilyAlignmentFamilyZipTupleCount)
      }
      data-viz-manim-transform-family-alignment-matched-count={
        manimEvidenceAttributes?.["data-viz-manim-transform-family-alignment-matched-count"] ??
        String(runtimeDiagnostics.manimTransformFamilyAlignmentMatchedCount)
      }
      data-viz-manim-transform-family-alignment-max-depth={
        manimEvidenceAttributes?.["data-viz-manim-transform-family-alignment-max-depth"] ??
        String(runtimeDiagnostics.manimTransformFamilyAlignmentMaxDepth)
      }
      data-viz-manim-transform-family-alignment-point-count-policy={
        manimEvidenceAttributes?.["data-viz-manim-transform-family-alignment-point-count-policy"] ??
        runtimeDiagnostics.manimTransformFamilyAlignmentPointCountPolicy
      }
      data-viz-manim-transform-family-alignment-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-transform-family-alignment-source-contract"] ??
        runtimeDiagnostics.manimTransformFamilyAlignmentSourceContract
      }
      data-viz-manim-transform-family-alignment-source-root-id={
        manimEvidenceAttributes?.["data-viz-manim-transform-family-alignment-source-root-id"] ??
        runtimeDiagnostics.manimTransformFamilyAlignmentSourceRootId
      }
      data-viz-manim-transform-family-alignment-summary={
        manimEvidenceAttributes?.["data-viz-manim-transform-family-alignment-summary"] ??
        runtimeDiagnostics.manimTransformFamilyAlignmentSummary
      }
      data-viz-manim-transform-family-alignment-target-root-id={
        manimEvidenceAttributes?.["data-viz-manim-transform-family-alignment-target-root-id"] ??
        runtimeDiagnostics.manimTransformFamilyAlignmentTargetRootId
      }
      data-viz-manim-transform-family-alignment-type-mismatch-count={
        manimEvidenceAttributes?.["data-viz-manim-transform-family-alignment-type-mismatch-count"] ??
        String(runtimeDiagnostics.manimTransformFamilyAlignmentTypeMismatchCount)
      }
      data-viz-manim-transform-point-alignment-compatible-count={
        manimEvidenceAttributes?.["data-viz-manim-transform-point-alignment-compatible-count"] ??
        manimTransformPointAlignmentAttributes?.["data-viz-manim-transform-point-alignment-compatible-count"] ??
        String(runtimeDiagnostics.manimTransformPointAlignmentCompatibleCount)
      }
      data-viz-manim-transform-point-alignment-matched-count={
        manimEvidenceAttributes?.["data-viz-manim-transform-point-alignment-matched-count"] ??
        manimTransformPointAlignmentAttributes?.["data-viz-manim-transform-point-alignment-matched-count"] ??
        String(runtimeDiagnostics.manimTransformPointAlignmentMatchedCount)
      }
      data-viz-manim-transform-point-alignment-policy-summary={
        manimEvidenceAttributes?.["data-viz-manim-transform-point-alignment-policy-summary"] ??
        manimTransformPointAlignmentAttributes?.["data-viz-manim-transform-point-alignment-policy-summary"] ??
        runtimeDiagnostics.manimTransformPointAlignmentPolicySummary
      }
      data-viz-manim-transform-point-alignment-resampled-count={
        manimEvidenceAttributes?.["data-viz-manim-transform-point-alignment-resampled-count"] ??
        manimTransformPointAlignmentAttributes?.["data-viz-manim-transform-point-alignment-resampled-count"] ??
        String(runtimeDiagnostics.manimTransformPointAlignmentResampledCount)
      }
      data-viz-manim-transform-point-alignment-row-summary={
        manimEvidenceAttributes?.["data-viz-manim-transform-point-alignment-row-summary"] ??
        manimTransformPointAlignmentAttributes?.["data-viz-manim-transform-point-alignment-row-summary"] ??
        runtimeDiagnostics.manimTransformPointAlignmentRowSummary
      }
      data-viz-manim-transform-point-alignment-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-transform-point-alignment-source-contract"] ??
        manimTransformPointAlignmentAttributes?.["data-viz-manim-transform-point-alignment-source-contract"] ??
        runtimeDiagnostics.manimTransformPointAlignmentSourceContract
      }
      data-viz-manim-transform-point-alignment-source-root-id={
        manimEvidenceAttributes?.["data-viz-manim-transform-point-alignment-source-root-id"] ??
        manimTransformPointAlignmentAttributes?.["data-viz-manim-transform-point-alignment-source-root-id"] ??
        runtimeDiagnostics.manimTransformPointAlignmentSourceRootId
      }
      data-viz-manim-transform-point-alignment-summary={
        manimEvidenceAttributes?.["data-viz-manim-transform-point-alignment-summary"] ??
        manimTransformPointAlignmentAttributes?.["data-viz-manim-transform-point-alignment-summary"] ??
        runtimeDiagnostics.manimTransformPointAlignmentSummary
      }
      data-viz-manim-transform-point-alignment-target-root-id={
        manimEvidenceAttributes?.["data-viz-manim-transform-point-alignment-target-root-id"] ??
        manimTransformPointAlignmentAttributes?.["data-viz-manim-transform-point-alignment-target-root-id"] ??
        runtimeDiagnostics.manimTransformPointAlignmentTargetRootId
      }
      data-viz-manim-transform-point-alignment-total-point-count={
        manimEvidenceAttributes?.["data-viz-manim-transform-point-alignment-total-point-count"] ??
        manimTransformPointAlignmentAttributes?.["data-viz-manim-transform-point-alignment-total-point-count"] ??
        String(runtimeDiagnostics.manimTransformPointAlignmentTotalPointCount)
      }
      data-viz-manim-transform-point-alignment-vmobject-aligned-curve-count={
        manimEvidenceAttributes?.["data-viz-manim-transform-point-alignment-vmobject-aligned-curve-count"] ??
        manimTransformPointAlignmentAttributes?.["data-viz-manim-transform-point-alignment-vmobject-aligned-curve-count"] ??
        String(runtimeDiagnostics.manimTransformPointAlignmentVmobjectAlignedCurveCount)
      }
      data-viz-manim-transform-point-alignment-vmobject-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-transform-point-alignment-vmobject-source-contract"] ??
        manimTransformPointAlignmentAttributes?.["data-viz-manim-transform-point-alignment-vmobject-source-contract"] ??
        runtimeDiagnostics.manimTransformPointAlignmentVmobjectSourceContract
      }
      data-viz-manim-transform-point-alignment-vmobject-source-insert-n-curves-count={
        manimEvidenceAttributes?.["data-viz-manim-transform-point-alignment-vmobject-source-insert-n-curves-count"] ??
        manimTransformPointAlignmentAttributes?.["data-viz-manim-transform-point-alignment-vmobject-source-insert-n-curves-count"] ??
        String(runtimeDiagnostics.manimTransformPointAlignmentVmobjectSourceInsertNCurvesCount)
      }
      data-viz-manim-transform-point-alignment-vmobject-target-insert-n-curves-count={
        manimEvidenceAttributes?.["data-viz-manim-transform-point-alignment-vmobject-target-insert-n-curves-count"] ??
        manimTransformPointAlignmentAttributes?.["data-viz-manim-transform-point-alignment-vmobject-target-insert-n-curves-count"] ??
        String(runtimeDiagnostics.manimTransformPointAlignmentVmobjectTargetInsertNCurvesCount)
      }
      data-viz-manim-transform-data-lock-alignment-summary={
        manimEvidenceAttributes?.["data-viz-manim-transform-data-lock-alignment-summary"] ??
        runtimeDiagnostics.manimTransformDataLockAlignmentSummary
      }
      data-viz-manim-transform-data-lock-kind-summary={
        manimEvidenceAttributes?.["data-viz-manim-transform-data-lock-kind-summary"] ??
        runtimeDiagnostics.manimTransformDataLockKindSummary
      }
      data-viz-manim-transform-data-lock-locked-point-count={
        manimEvidenceAttributes?.["data-viz-manim-transform-data-lock-locked-point-count"] ??
        String(runtimeDiagnostics.manimTransformDataLockLockedPointCount)
      }
      data-viz-manim-transform-data-lock-moving-point-count={
        manimEvidenceAttributes?.["data-viz-manim-transform-data-lock-moving-point-count"] ??
        String(runtimeDiagnostics.manimTransformDataLockMovingPointCount)
      }
      data-viz-manim-transform-data-lock-object-ids={
        manimEvidenceAttributes?.["data-viz-manim-transform-data-lock-object-ids"] ??
        runtimeDiagnostics.manimTransformDataLockObjectIds
      }
      data-viz-manim-transform-data-lock-plan-count={
        manimEvidenceAttributes?.["data-viz-manim-transform-data-lock-plan-count"] ??
        String(runtimeDiagnostics.manimTransformDataLockPlanCount)
      }
      data-viz-manim-transform-data-lock-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-transform-data-lock-source-contract"] ??
        runtimeDiagnostics.manimTransformDataLockSourceContract
      }
      data-viz-manim-transform-data-lock-summary={
        manimEvidenceAttributes?.["data-viz-manim-transform-data-lock-summary"] ??
        runtimeDiagnostics.manimTransformDataLockSummary
      }
      data-viz-manim-transform-data-lock-target-object-ids={
        manimEvidenceAttributes?.["data-viz-manim-transform-data-lock-target-object-ids"] ??
        runtimeDiagnostics.manimTransformDataLockTargetObjectIds
      }
      data-viz-manim-transform-data-lock-total-point-count={
        manimEvidenceAttributes?.["data-viz-manim-transform-data-lock-total-point-count"] ??
        String(runtimeDiagnostics.manimTransformDataLockTotalPointCount)
      }
      data-viz-manim-transform-matching-entering-count={
        manimTransformMatchingAttributes?.["data-viz-manim-transform-matching-entering-count"] ?? "0"
      }
      data-viz-manim-transform-matching-entering-ids={
        manimTransformMatchingAttributes?.["data-viz-manim-transform-matching-entering-ids"] ?? "none"
      }
      data-viz-manim-transform-matching-exiting-count={
        manimTransformMatchingAttributes?.["data-viz-manim-transform-matching-exiting-count"] ?? "0"
      }
      data-viz-manim-transform-matching-exiting-ids={
        manimTransformMatchingAttributes?.["data-viz-manim-transform-matching-exiting-ids"] ?? "none"
      }
      data-viz-manim-transform-matching-fade-in-count={
        manimTransformMatchingAttributes?.["data-viz-manim-transform-matching-fade-in-count"] ?? "0"
      }
      data-viz-manim-transform-matching-fade-out-count={
        manimTransformMatchingAttributes?.["data-viz-manim-transform-matching-fade-out-count"] ?? "0"
      }
      data-viz-manim-transform-matching-issue-count={
        manimTransformMatchingAttributes?.["data-viz-manim-transform-matching-issue-count"] ?? "0"
      }
      data-viz-manim-transform-matching-issue-summary={
        manimTransformMatchingAttributes?.["data-viz-manim-transform-matching-issue-summary"] ?? "none"
      }
      data-viz-manim-transform-matching-key-strategies={
        manimTransformMatchingAttributes?.["data-viz-manim-transform-matching-key-strategies"] ?? "none"
      }
      data-viz-manim-transform-matching-matched-count={
        manimTransformMatchingAttributes?.["data-viz-manim-transform-matching-matched-count"] ?? "0"
      }
      data-viz-manim-transform-matching-matched-pair-ids={
        manimTransformMatchingAttributes?.["data-viz-manim-transform-matching-matched-pair-ids"] ?? "none"
      }
      data-viz-manim-transform-matching-plan-count={
        manimTransformMatchingAttributes?.["data-viz-manim-transform-matching-plan-count"] ?? "0"
      }
      data-viz-manim-transform-matching-row-count={
        manimTransformMatchingAttributes?.["data-viz-manim-transform-matching-row-count"] ?? "0"
      }
      data-viz-manim-transform-matching-signature={
        manimTransformMatchingAttributes?.["data-viz-manim-transform-matching-signature"] ?? "none"
      }
      data-viz-manim-transform-matching-source-contract={
        manimTransformMatchingAttributes?.["data-viz-manim-transform-matching-source-contract"] ??
        TRANSFORM_MATCHING_SOURCE_CONTRACT
      }
      data-viz-manim-transform-matching-summary={
        manimTransformMatchingAttributes?.["data-viz-manim-transform-matching-summary"] ??
        "transform-matching:primitive:plans=0:rows=0:matched=0:entering=0:exiting=0:keys=none"
      }
      data-viz-manim-transform-matching-transform-count={
        manimTransformMatchingAttributes?.["data-viz-manim-transform-matching-transform-count"] ?? "0"
      }
      data-viz-manim-animate-builder-changed-field-count={manimEvidenceAttributes?.["data-viz-manim-animate-builder-changed-field-count"] ?? "0"}
      data-viz-manim-animate-builder-changed-node-count={manimEvidenceAttributes?.["data-viz-manim-animate-builder-changed-node-count"] ?? "0"}
      data-viz-manim-animate-builder-changed-node-ids={manimEvidenceAttributes?.["data-viz-manim-animate-builder-changed-node-ids"] ?? "none"}
      data-viz-manim-animate-builder-first-plan-id={manimEvidenceAttributes?.["data-viz-manim-animate-builder-first-plan-id"] ?? "none"}
      data-viz-manim-animate-builder-lagged-count={manimEvidenceAttributes?.["data-viz-manim-animate-builder-lagged-count"] ?? "0"}
      data-viz-manim-animate-builder-object-ids={manimEvidenceAttributes?.["data-viz-manim-animate-builder-object-ids"] ?? "none"}
      data-viz-manim-animate-builder-operation-count={manimEvidenceAttributes?.["data-viz-manim-animate-builder-operation-count"] ?? "0"}
      data-viz-manim-animate-builder-operation-types={manimEvidenceAttributes?.["data-viz-manim-animate-builder-operation-types"] ?? "none"}
      data-viz-manim-animate-builder-path-count={manimEvidenceAttributes?.["data-viz-manim-animate-builder-path-count"] ?? "0"}
      data-viz-manim-animate-builder-plan-count={manimEvidenceAttributes?.["data-viz-manim-animate-builder-plan-count"] ?? "0"}
      data-viz-manim-animate-builder-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-animate-builder-source-contract"] ?? ANIMATION_BUILDER_SOURCE_CONTRACT
      }
      data-viz-manim-animate-builder-summary={manimEvidenceAttributes?.["data-viz-manim-animate-builder-summary"] ?? "animateBuilder:plans=0:first=none:objects=none:targets=none:ops=0:fields=0:nodes=0:duration=0.000:lagged=0:paths=0"}
      data-viz-manim-animate-builder-target-ids={manimEvidenceAttributes?.["data-viz-manim-animate-builder-target-ids"] ?? "none"}
      data-viz-manim-animate-builder-total-duration={manimEvidenceAttributes?.["data-viz-manim-animate-builder-total-duration"] ?? "0.000"}
      data-viz-manim-always-updater-count={manimEvidenceAttributes?.["data-viz-manim-always-updater-count"] ?? "0"}
      data-viz-manim-always-updater-always-method-count={manimEvidenceAttributes?.["data-viz-manim-always-updater-always-method-count"] ?? "0"}
      data-viz-manim-always-updater-always-redraw-count={manimEvidenceAttributes?.["data-viz-manim-always-updater-always-redraw-count"] ?? "0"}
      data-viz-manim-always-updater-dependency-tracker-count={manimEvidenceAttributes?.["data-viz-manim-always-updater-dependency-tracker-count"] ?? "0"}
      data-viz-manim-always-updater-dependency-tracker-ids={manimEvidenceAttributes?.["data-viz-manim-always-updater-dependency-tracker-ids"] ?? "none"}
      data-viz-manim-always-updater-factory-count={manimEvidenceAttributes?.["data-viz-manim-always-updater-factory-count"] ?? "0"}
      data-viz-manim-always-updater-missing-tracker-count={manimEvidenceAttributes?.["data-viz-manim-always-updater-missing-tracker-count"] ?? "0"}
      data-viz-manim-always-updater-object-ids={manimEvidenceAttributes?.["data-viz-manim-always-updater-object-ids"] ?? "none"}
      data-viz-manim-always-updater-operation-types={manimEvidenceAttributes?.["data-viz-manim-always-updater-operation-types"] ?? "none"}
      data-viz-manim-always-updater-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-always-updater-source-contract"] ??
        ALWAYS_UPDATER_AUTHORING_SOURCE_CONTRACT
      }
      data-viz-manim-always-updater-summary={manimEvidenceAttributes?.["data-viz-manim-always-updater-summary"] ?? "alwaysUpdater:total=0:redraw=0:method=0:objects=none:trackers=none:missing=none:factories=0:operations=none"}
      data-viz-manim-always-updater-updater-ids={manimEvidenceAttributes?.["data-viz-manim-always-updater-updater-ids"] ?? "none"}
      data-viz-manim-always-method-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-always-method-source-contract"] ??
        ALWAYS_METHOD_UPDATER_SOURCE_CONTRACT
      }
      data-viz-manim-always-method-count={manimEvidenceAttributes?.["data-viz-manim-always-method-count"] ?? "0"}
      data-viz-manim-always-method-placed-count={manimEvidenceAttributes?.["data-viz-manim-always-method-placed-count"] ?? "0"}
      data-viz-manim-always-method-missing-object-count={manimEvidenceAttributes?.["data-viz-manim-always-method-missing-object-count"] ?? "0"}
      data-viz-manim-always-method-missing-target-count={manimEvidenceAttributes?.["data-viz-manim-always-method-missing-target-count"] ?? "0"}
      data-viz-manim-always-method-dynamic-buff-count={manimEvidenceAttributes?.["data-viz-manim-always-method-dynamic-buff-count"] ?? "0"}
      data-viz-manim-always-method-updater-ids={manimEvidenceAttributes?.["data-viz-manim-always-method-updater-ids"] ?? "none"}
      data-viz-manim-always-method-object-ids={manimEvidenceAttributes?.["data-viz-manim-always-method-object-ids"] ?? "none"}
      data-viz-manim-always-method-target-object-ids={manimEvidenceAttributes?.["data-viz-manim-always-method-target-object-ids"] ?? "none"}
      data-viz-manim-always-method-operation-types={manimEvidenceAttributes?.["data-viz-manim-always-method-operation-types"] ?? "none"}
      data-viz-manim-always-method-buff-summary={manimEvidenceAttributes?.["data-viz-manim-always-method-buff-summary"] ?? "none"}
      data-viz-manim-always-method-direction-summary={manimEvidenceAttributes?.["data-viz-manim-always-method-direction-summary"] ?? "none"}
      data-viz-manim-always-method-placement-summary={manimEvidenceAttributes?.["data-viz-manim-always-method-placement-summary"] ?? "none"}
      data-viz-manim-always-method-bounding-box-summary={manimEvidenceAttributes?.["data-viz-manim-always-method-bounding-box-summary"] ?? "none"}
      data-viz-manim-always-method-max-placement-error={manimEvidenceAttributes?.["data-viz-manim-always-method-max-placement-error"] ?? "0.000"}
      data-viz-manim-always-method-summary={
        manimEvidenceAttributes?.["data-viz-manim-always-method-summary"] ??
        "alwaysMethod:updaters=0:placed=0:missingObjects=0:missingTargets=0:dynamicBuff=0:maxError=0.000:ids=none"
      }
      data-viz-manim-sub-alpha-active-plan-count={
        manimEvidenceAttributes?.["data-viz-manim-sub-alpha-active-plan-count"] ?? runtimeDiagnostics.manimSubAlphaActivePlanCount
      }
      data-viz-manim-sub-alpha-node-count={
        manimEvidenceAttributes?.["data-viz-manim-sub-alpha-node-count"] ?? runtimeDiagnostics.manimSubAlphaNodeCount
      }
      data-viz-manim-sub-alpha-staggered-node-count={
        manimEvidenceAttributes?.["data-viz-manim-sub-alpha-staggered-node-count"] ?? runtimeDiagnostics.manimSubAlphaStaggeredNodeCount
      }
      data-viz-manim-sub-alpha-leading-node-count={
        manimEvidenceAttributes?.["data-viz-manim-sub-alpha-leading-node-count"] ?? runtimeDiagnostics.manimSubAlphaLeadingNodeCount
      }
      data-viz-manim-sub-alpha-delayed-node-count={
        manimEvidenceAttributes?.["data-viz-manim-sub-alpha-delayed-node-count"] ?? runtimeDiagnostics.manimSubAlphaDelayedNodeCount
      }
      data-viz-manim-sub-alpha-zero-node-count={
        manimEvidenceAttributes?.["data-viz-manim-sub-alpha-zero-node-count"] ?? runtimeDiagnostics.manimSubAlphaZeroNodeCount
      }
      data-viz-manim-sub-alpha-partial-node-count={
        manimEvidenceAttributes?.["data-viz-manim-sub-alpha-partial-node-count"] ?? runtimeDiagnostics.manimSubAlphaPartialNodeCount
      }
      data-viz-manim-sub-alpha-complete-node-count={
        manimEvidenceAttributes?.["data-viz-manim-sub-alpha-complete-node-count"] ?? runtimeDiagnostics.manimSubAlphaCompleteNodeCount
      }
      data-viz-manim-sub-alpha-raw-min={
        manimEvidenceAttributes?.["data-viz-manim-sub-alpha-raw-min"] ?? runtimeDiagnostics.manimSubAlphaRawMin.toFixed(3)
      }
      data-viz-manim-sub-alpha-raw-max={
        manimEvidenceAttributes?.["data-viz-manim-sub-alpha-raw-max"] ?? runtimeDiagnostics.manimSubAlphaRawMax.toFixed(3)
      }
      data-viz-manim-sub-alpha-raw-range={
        manimEvidenceAttributes?.["data-viz-manim-sub-alpha-raw-range"] ?? runtimeDiagnostics.manimSubAlphaRawRange
      }
      data-viz-manim-sub-alpha-lagged-min={
        manimEvidenceAttributes?.["data-viz-manim-sub-alpha-lagged-min"] ?? runtimeDiagnostics.manimSubAlphaLaggedMin.toFixed(3)
      }
      data-viz-manim-sub-alpha-lagged-max={
        manimEvidenceAttributes?.["data-viz-manim-sub-alpha-lagged-max"] ?? runtimeDiagnostics.manimSubAlphaLaggedMax.toFixed(3)
      }
      data-viz-manim-sub-alpha-lagged-range={
        manimEvidenceAttributes?.["data-viz-manim-sub-alpha-lagged-range"] ?? runtimeDiagnostics.manimSubAlphaLaggedRange
      }
      data-viz-manim-sub-alpha-eased-min={
        manimEvidenceAttributes?.["data-viz-manim-sub-alpha-eased-min"] ?? runtimeDiagnostics.manimSubAlphaEasedMin.toFixed(3)
      }
      data-viz-manim-sub-alpha-eased-max={
        manimEvidenceAttributes?.["data-viz-manim-sub-alpha-eased-max"] ?? runtimeDiagnostics.manimSubAlphaEasedMax.toFixed(3)
      }
      data-viz-manim-sub-alpha-eased-range={
        manimEvidenceAttributes?.["data-viz-manim-sub-alpha-eased-range"] ?? runtimeDiagnostics.manimSubAlphaEasedRange
      }
      data-viz-manim-sub-alpha-node-window-summary={
        manimEvidenceAttributes?.["data-viz-manim-sub-alpha-node-window-summary"] ?? "none"
      }
      data-viz-manim-sub-alpha-family-zip-covered-node-count={
        manimEvidenceAttributes?.["data-viz-manim-sub-alpha-family-zip-covered-node-count"] ??
        runtimeDiagnostics.manimSubAlphaFamilyZipCoveredNodeCount
      }
      data-viz-manim-sub-alpha-family-zip-missing-node-count={
        manimEvidenceAttributes?.["data-viz-manim-sub-alpha-family-zip-missing-node-count"] ??
        runtimeDiagnostics.manimSubAlphaFamilyZipMissingNodeCount
      }
      data-viz-manim-sub-alpha-family-zip-policy={
        manimEvidenceAttributes?.["data-viz-manim-sub-alpha-family-zip-policy"] ??
        runtimeDiagnostics.manimSubAlphaFamilyZipPolicy
      }
      data-viz-manim-sub-alpha-family-zip-sequence={
        manimEvidenceAttributes?.["data-viz-manim-sub-alpha-family-zip-sequence"] ??
        runtimeDiagnostics.manimSubAlphaFamilyZipSequence
      }
      data-viz-manim-sub-alpha-family-zip-tuple-count={
        manimEvidenceAttributes?.["data-viz-manim-sub-alpha-family-zip-tuple-count"] ??
        runtimeDiagnostics.manimSubAlphaFamilyZipTupleCount
      }
      data-viz-manim-sub-alpha-family-zip-uncovered-object-ids={
        manimEvidenceAttributes?.["data-viz-manim-sub-alpha-family-zip-uncovered-object-ids"] ??
        runtimeDiagnostics.manimSubAlphaFamilyZipUncoveredObjectIds
      }
      data-viz-manim-sub-alpha-rate-function-ids={
        manimEvidenceAttributes?.["data-viz-manim-sub-alpha-rate-function-ids"] ?? runtimeDiagnostics.manimSubAlphaRateFunctionIds
      }
      data-viz-manim-sub-alpha-object-ids={
        manimEvidenceAttributes?.["data-viz-manim-sub-alpha-object-ids"] ?? runtimeDiagnostics.manimSubAlphaObjectIds
      }
      data-viz-manim-sub-alpha-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-sub-alpha-source-contract"] ??
        runtimeDiagnostics.manimSubAlphaSourceContract
      }
      data-viz-manim-sub-alpha-window-policy={
        manimEvidenceAttributes?.["data-viz-manim-sub-alpha-window-policy"] ??
        runtimeDiagnostics.manimSubAlphaWindowPolicy
      }
      data-viz-manim-sub-alpha-summary={
        manimEvidenceAttributes?.["data-viz-manim-sub-alpha-summary"] ?? runtimeDiagnostics.manimSubAlphaSummary
      }
      data-viz-manim-animation-composition-count={manimEvidenceAttributes?.["data-viz-manim-animation-composition-count"] ?? runtimeDiagnostics.manimAnimationCompositionCount}
      data-viz-manim-animation-composition-duration={
        manimEvidenceAttributes?.["data-viz-manim-animation-composition-duration"] ?? runtimeDiagnostics.manimAnimationCompositionDuration.toFixed(3)
      }
      data-viz-manim-animation-composition-issue-count={
        manimEvidenceAttributes?.["data-viz-manim-animation-composition-issue-count"] ?? runtimeDiagnostics.manimAnimationCompositionIssueCount
      }
      data-viz-manim-animation-composition-modes={manimEvidenceAttributes?.["data-viz-manim-animation-composition-modes"] ?? runtimeDiagnostics.manimAnimationCompositionModes}
      data-viz-manim-animation-composition-window-count={
        manimEvidenceAttributes?.["data-viz-manim-animation-composition-window-count"] ?? runtimeDiagnostics.manimAnimationCompositionWindowCount
      }
      data-viz-manim-animation-composition-active-id={
        manimEvidenceAttributes?.["data-viz-manim-animation-composition-active-id"] ?? "none"
      }
      data-viz-manim-animation-composition-active-type={
        manimEvidenceAttributes?.["data-viz-manim-animation-composition-active-type"] ?? "none"
      }
      data-viz-manim-animation-composition-active-window-count={
        manimEvidenceAttributes?.["data-viz-manim-animation-composition-active-window-count"] ?? "0"
      }
      data-viz-manim-animation-composition-active-window-ids={
        manimEvidenceAttributes?.["data-viz-manim-animation-composition-active-window-ids"] ?? "none"
      }
      data-viz-manim-animation-composition-completed-window-count={
        manimEvidenceAttributes?.["data-viz-manim-animation-composition-completed-window-count"] ?? "0"
      }
      data-viz-manim-animation-composition-completed-window-ids={
        manimEvidenceAttributes?.["data-viz-manim-animation-composition-completed-window-ids"] ?? "none"
      }
      data-viz-manim-animation-composition-frame-elapsed-seconds={
        manimEvidenceAttributes?.["data-viz-manim-animation-composition-frame-elapsed-seconds"] ?? "0.000"
      }
      data-viz-manim-animation-composition-frame-progress={
        manimEvidenceAttributes?.["data-viz-manim-animation-composition-frame-progress"] ?? "0.000"
      }
      data-viz-manim-animation-composition-frame-summary={
        manimEvidenceAttributes?.["data-viz-manim-animation-composition-frame-summary"] ??
        "animation-composition-frame:active=none:mode=none:elapsed=0.000:progress=0.000:activeWindows=0:completed=0:pending=0"
      }
      data-viz-manim-animation-composition-pending-window-count={
        manimEvidenceAttributes?.["data-viz-manim-animation-composition-pending-window-count"] ?? "0"
      }
      data-viz-manim-animation-composition-pending-window-ids={
        manimEvidenceAttributes?.["data-viz-manim-animation-composition-pending-window-ids"] ?? "none"
      }
      data-viz-manim-animation-composition-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-animation-composition-source-contract"] ??
        ANIMATION_COMPOSITION_FRAME_SOURCE_CONTRACT
      }
      data-viz-manim-animation-composition-timing-policy={
        manimEvidenceAttributes?.["data-viz-manim-animation-composition-timing-policy"] ?? "none"
      }
      data-viz-manim-animation-composition-window-summary={
        manimEvidenceAttributes?.["data-viz-manim-animation-composition-window-summary"] ?? "none"
      }
      data-viz-manim-animation-lifecycle-animating-status={
        manimAnimationLifecycleAttributes?.["data-viz-manim-animation-lifecycle-animating-status"] ?? "none"
      }
      data-viz-manim-animation-lifecycle-begin-node-count={
        manimAnimationLifecycleAttributes?.["data-viz-manim-animation-lifecycle-begin-node-count"] ?? "0"
      }
      data-viz-manim-animation-lifecycle-begin-source-policy={
        manimAnimationLifecycleAttributes?.["data-viz-manim-animation-lifecycle-begin-source-policy"] ??
        ANIMATION_LIFECYCLE_BEGIN_SOURCE_POLICY
      }
      data-viz-manim-animation-lifecycle-copied-node-count={
        manimAnimationLifecycleAttributes?.["data-viz-manim-animation-lifecycle-copied-node-count"] ?? "0"
      }
      data-viz-manim-animation-lifecycle-family-tuple-count={
        manimAnimationLifecycleAttributes?.["data-viz-manim-animation-lifecycle-family-tuple-count"] ?? "0"
      }
      data-viz-manim-animation-lifecycle-final-alpha={
        manimAnimationLifecycleAttributes?.["data-viz-manim-animation-lifecycle-final-alpha"] ?? "0.000"
      }
      data-viz-manim-animation-lifecycle-final-interpolate-count={
        manimAnimationLifecycleAttributes?.["data-viz-manim-animation-lifecycle-final-interpolate-count"] ?? "0"
      }
      data-viz-manim-animation-lifecycle-finish-animating-status={
        manimAnimationLifecycleAttributes?.["data-viz-manim-animation-lifecycle-finish-animating-status"] ?? "none"
      }
      data-viz-manim-animation-lifecycle-finish-color-role-count={
        manimAnimationLifecycleAttributes?.["data-viz-manim-animation-lifecycle-finish-color-role-count"] ?? "0"
      }
      data-viz-manim-animation-lifecycle-finish-node-count={
        manimAnimationLifecycleAttributes?.["data-viz-manim-animation-lifecycle-finish-node-count"] ?? "0"
      }
      data-viz-manim-animation-lifecycle-initial-alpha={
        manimAnimationLifecycleAttributes?.["data-viz-manim-animation-lifecycle-initial-alpha"] ?? "0.000"
      }
      data-viz-manim-animation-lifecycle-initial-interpolate-count={
        manimAnimationLifecycleAttributes?.["data-viz-manim-animation-lifecycle-initial-interpolate-count"] ?? "0"
      }
      data-viz-manim-animation-lifecycle-object-id={
        manimAnimationLifecycleAttributes?.["data-viz-manim-animation-lifecycle-object-id"] ?? "none"
      }
      data-viz-manim-animation-lifecycle-persistent-node-count={
        manimAnimationLifecycleAttributes?.["data-viz-manim-animation-lifecycle-persistent-node-count"] ?? "0"
      }
      data-viz-manim-animation-lifecycle-plan-id={
        manimAnimationLifecycleAttributes?.["data-viz-manim-animation-lifecycle-plan-id"] ?? "none"
      }
      data-viz-manim-animation-lifecycle-signature={
        manimAnimationLifecycleAttributes?.["data-viz-manim-animation-lifecycle-signature"] ?? "none"
      }
      data-viz-manim-animation-lifecycle-source-contract={
        manimAnimationLifecycleAttributes?.["data-viz-manim-animation-lifecycle-source-contract"] ??
        ANIMATION_LIFECYCLE_SOURCE_CONTRACT
      }
      data-viz-manim-animation-lifecycle-summary={
        manimAnimationLifecycleAttributes?.["data-viz-manim-animation-lifecycle-summary"] ??
        "animation-lifecycle:plan=none:object=none:target=none:familyTuples=0:begin=0:finish=0:suspended=0"
      }
      data-viz-manim-animation-lifecycle-suspended-updater-count={
        manimAnimationLifecycleAttributes?.["data-viz-manim-animation-lifecycle-suspended-updater-count"] ?? "0"
      }
      data-viz-manim-animation-lifecycle-timing-frame-count={
        manimAnimationLifecycleAttributes?.["data-viz-manim-animation-lifecycle-timing-frame-count"] ?? "0"
      }
      data-viz-manim-animation-lifecycle-timing-lag-ratio={
        manimAnimationLifecycleAttributes?.["data-viz-manim-animation-lifecycle-timing-lag-ratio"] ?? "0.000"
      }
      data-viz-manim-animation-lifecycle-timing-rate-function={
        manimAnimationLifecycleAttributes?.["data-viz-manim-animation-lifecycle-timing-rate-function"] ?? "linear"
      }
      data-viz-manim-animation-lifecycle-timing-run-time={
        manimAnimationLifecycleAttributes?.["data-viz-manim-animation-lifecycle-timing-run-time"] ?? "0.000"
      }
      data-viz-manim-animation-lifecycle-target-id={
        manimAnimationLifecycleAttributes?.["data-viz-manim-animation-lifecycle-target-id"] ?? "none"
      }
      data-viz-manim-animation-object-count={manimEvidenceAttributes?.["data-viz-manim-animation-object-count"] ?? runtimeDiagnostics.manimAnimationObjectCount}
      data-viz-manim-animation-operation-count={manimEvidenceAttributes?.["data-viz-manim-animation-operation-count"] ?? runtimeDiagnostics.manimAnimationOperationCount}
      data-viz-manim-animation-plan-count={manimEvidenceAttributes?.["data-viz-manim-animation-plan-count"] ?? runtimeDiagnostics.manimAnimationPlanCount}
      data-viz-manim-transform-begin-aligned-entry-count={
        manimTransformBeginAttributes?.["data-viz-manim-transform-begin-aligned-entry-count"] ?? "0"
      }
      data-viz-manim-transform-begin-aligned-point-pair-count={
        manimTransformBeginAttributes?.["data-viz-manim-transform-begin-aligned-point-pair-count"] ?? "0"
      }
      data-viz-manim-transform-begin-data-lock-count={manimTransformBeginAttributes?.["data-viz-manim-transform-begin-data-lock-count"] ?? "0"}
      data-viz-manim-transform-begin-data-lock-alignment-summary={
        manimTransformBeginAttributes?.["data-viz-manim-transform-begin-data-lock-alignment-summary"] ?? "none"
      }
      data-viz-manim-transform-begin-data-lock-kind-summary={
        manimTransformBeginAttributes?.["data-viz-manim-transform-begin-data-lock-kind-summary"] ?? "none"
      }
      data-viz-manim-transform-begin-data-lock-summary={
        manimTransformBeginAttributes?.["data-viz-manim-transform-begin-data-lock-summary"] ?? "none"
      }
      data-viz-manim-transform-begin-entering-count={manimTransformBeginAttributes?.["data-viz-manim-transform-begin-entering-count"] ?? "0"}
      data-viz-manim-transform-begin-exiting-count={manimTransformBeginAttributes?.["data-viz-manim-transform-begin-exiting-count"] ?? "0"}
      data-viz-manim-transform-begin-family-pair-ids={
        manimTransformBeginAttributes?.["data-viz-manim-transform-begin-family-pair-ids"] ?? "none"
      }
      data-viz-manim-transform-begin-family-pair-summary={
        manimTransformBeginAttributes?.["data-viz-manim-transform-begin-family-pair-summary"] ?? "none"
      }
      data-viz-manim-transform-begin-locked-object-ids={
        manimTransformBeginAttributes?.["data-viz-manim-transform-begin-locked-object-ids"] ?? "none"
      }
      data-viz-manim-transform-begin-locked-point-count={
        manimTransformBeginAttributes?.["data-viz-manim-transform-begin-locked-point-count"] ?? "0"
      }
      data-viz-manim-transform-begin-matched-count={manimTransformBeginAttributes?.["data-viz-manim-transform-begin-matched-count"] ?? "0"}
      data-viz-manim-transform-begin-max-depth={manimTransformBeginAttributes?.["data-viz-manim-transform-begin-max-depth"] ?? "0"}
      data-viz-manim-transform-begin-moving-object-ids={
        manimTransformBeginAttributes?.["data-viz-manim-transform-begin-moving-object-ids"] ?? "none"
      }
      data-viz-manim-transform-begin-moving-point-count={
        manimTransformBeginAttributes?.["data-viz-manim-transform-begin-moving-point-count"] ?? "0"
      }
      data-viz-manim-transform-begin-object-id={manimTransformBeginAttributes?.["data-viz-manim-transform-begin-object-id"] ?? "none"}
      data-viz-manim-transform-begin-plan-id={manimTransformBeginAttributes?.["data-viz-manim-transform-begin-plan-id"] ?? "none"}
      data-viz-manim-transform-begin-signature={manimTransformBeginAttributes?.["data-viz-manim-transform-begin-signature"] ?? "none"}
      data-viz-manim-transform-begin-source-family-ids={
        manimTransformBeginAttributes?.["data-viz-manim-transform-begin-source-family-ids"] ?? "none"
      }
      data-viz-manim-transform-begin-source-policy={
        manimTransformBeginAttributes?.["data-viz-manim-transform-begin-source-policy"] ?? TRANSFORM_BEGIN_SOURCE_POLICY
      }
      data-viz-manim-transform-begin-summary={
        manimTransformBeginAttributes?.["data-viz-manim-transform-begin-summary"] ??
        "transform-begin:plan=none:object=none:target=none:aligned=0:matched=0:pairs=0:pointPairs=0:locked=0:moving=0"
      }
      data-viz-manim-transform-begin-target-created={manimTransformBeginAttributes?.["data-viz-manim-transform-begin-target-created"] ?? "false"}
      data-viz-manim-transform-begin-target-family-ids={
        manimTransformBeginAttributes?.["data-viz-manim-transform-begin-target-family-ids"] ?? "none"
      }
      data-viz-manim-transform-begin-target-id={manimTransformBeginAttributes?.["data-viz-manim-transform-begin-target-id"] ?? "none"}
      data-viz-manim-transform-begin-total-point-count={manimTransformBeginAttributes?.["data-viz-manim-transform-begin-total-point-count"] ?? "0"}
      data-viz-manim-transform-begin-type-mismatch-count={manimTransformBeginAttributes?.["data-viz-manim-transform-begin-type-mismatch-count"] ?? "0"}
      data-viz-manim-axis-finite-tick-count={manimAxisTickAttributes?.["data-viz-manim-axis-finite-tick-count"] ?? "0"}
      data-viz-manim-axis-label-anchor-count={manimAxisTickAttributes?.["data-viz-manim-axis-label-anchor-count"] ?? "0"}
      data-viz-manim-axis-label-anchor-finite-count={
        manimAxisTickAttributes?.["data-viz-manim-axis-label-anchor-finite-count"] ?? "0"
      }
      data-viz-manim-axis-label-anchor-summary={
        manimAxisTickAttributes?.["data-viz-manim-axis-label-anchor-summary"] ??
        "axisLabelAnchors:primitive:count=0:finite=0:offset=0.000:axes=none"
      }
      data-viz-manim-axis-label-count={manimAxisTickAttributes?.["data-viz-manim-axis-label-count"] ?? "0"}
      data-viz-manim-axis-major-tick-count={manimAxisTickAttributes?.["data-viz-manim-axis-major-tick-count"] ?? "0"}
      data-viz-manim-axis-object-count={manimAxisTickAttributes?.["data-viz-manim-axis-object-count"] ?? "0"}
      data-viz-manim-axis-spacing-max-delta={manimAxisTickAttributes?.["data-viz-manim-axis-spacing-max-delta"] ?? "0.000000"}
      data-viz-manim-axis-spacing-summary={
        manimAxisTickAttributes?.["data-viz-manim-axis-spacing-summary"] ?? "axisSpacing:primitive:none:maxDelta=0.000000:major=0"
      }
      data-viz-manim-axis-summary={
        manimAxisTickAttributes?.["data-viz-manim-axis-summary"] ?? "axes:primitive:axisObjects=0:ticks=0:labels=0:finite=0"
      }
      data-viz-manim-axis-tick-count={manimAxisTickAttributes?.["data-viz-manim-axis-tick-count"] ?? "0"}
      data-viz-manim-coordinate-axis-count={manimEvidenceAttributes?.["data-viz-manim-coordinate-axis-count"] ?? "0"}
      data-viz-manim-coordinate-c2p-finite-count={manimEvidenceAttributes?.["data-viz-manim-coordinate-c2p-finite-count"] ?? "0"}
      data-viz-manim-coordinate-math-range={manimEvidenceAttributes?.["data-viz-manim-coordinate-math-range"] ?? "primitive"}
      data-viz-manim-coordinate-origin-world-point={manimEvidenceAttributes?.["data-viz-manim-coordinate-origin-world-point"] ?? "0.000,0.000,0.000"}
      data-viz-manim-coordinate-p2c-roundtrip-error={manimEvidenceAttributes?.["data-viz-manim-coordinate-p2c-roundtrip-error"] ?? "0.000000"}
      data-viz-manim-coordinate-sample-count={manimEvidenceAttributes?.["data-viz-manim-coordinate-sample-count"] ?? "0"}
      data-viz-manim-coordinate-scale={manimEvidenceAttributes?.["data-viz-manim-coordinate-scale"] ?? "primitive"}
      data-viz-manim-coordinate-summary={
        manimEvidenceAttributes?.["data-viz-manim-coordinate-summary"] ??
        "coordinateSystem:axes=0:samples=0:finite=0:roundtrip=0.000000:math=primitive:world=primitive"
      }
      data-viz-manim-coordinate-system-ready={manimEvidenceAttributes?.["data-viz-manim-coordinate-system-ready"] ?? "false"}
      data-viz-manim-coordinate-world-range={manimEvidenceAttributes?.["data-viz-manim-coordinate-world-range"] ?? "primitive"}
      data-viz-manim-coordinate-space-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-coordinate-space-source-contract"] ?? COORDINATE_SPACE_SOURCE_CONTRACT
      }
      data-viz-manim-coordinate-space-math-range={manimEvidenceAttributes?.["data-viz-manim-coordinate-space-math-range"] ?? "primitive"}
      data-viz-manim-coordinate-space-world-range={manimEvidenceAttributes?.["data-viz-manim-coordinate-space-world-range"] ?? "primitive"}
      data-viz-manim-coordinate-space-scale={manimEvidenceAttributes?.["data-viz-manim-coordinate-space-scale"] ?? "primitive"}
      data-viz-manim-coordinate-space-c2p-summary={manimEvidenceAttributes?.["data-viz-manim-coordinate-space-c2p-summary"] ?? "none"}
      data-viz-manim-coordinate-space-p2c-summary={manimEvidenceAttributes?.["data-viz-manim-coordinate-space-p2c-summary"] ?? "none"}
      data-viz-manim-coordinate-space-vector-delta={manimEvidenceAttributes?.["data-viz-manim-coordinate-space-vector-delta"] ?? "none"}
      data-viz-manim-coordinate-space-sample-count={manimEvidenceAttributes?.["data-viz-manim-coordinate-space-sample-count"] ?? "0"}
      data-viz-manim-coordinate-space-finite-sample-count={
        manimEvidenceAttributes?.["data-viz-manim-coordinate-space-finite-sample-count"] ?? "0"
      }
      data-viz-manim-coordinate-space-roundtrip-error={
        manimEvidenceAttributes?.["data-viz-manim-coordinate-space-roundtrip-error"] ?? "0.000000"
      }
      data-viz-manim-coordinate-space-curve-sample-count={
        manimEvidenceAttributes?.["data-viz-manim-coordinate-space-curve-sample-count"] ?? "0"
      }
      data-viz-manim-coordinate-space-arc-length={manimEvidenceAttributes?.["data-viz-manim-coordinate-space-arc-length"] ?? "0.000000"}
      data-viz-manim-coordinate-space-resampled-count={manimEvidenceAttributes?.["data-viz-manim-coordinate-space-resampled-count"] ?? "0"}
      data-viz-manim-coordinate-space-endpoints={manimEvidenceAttributes?.["data-viz-manim-coordinate-space-endpoints"] ?? "none"}
      data-viz-manim-coordinate-space-summary={
        manimEvidenceAttributes?.["data-viz-manim-coordinate-space-summary"] ??
        "coordinate-space:samples=0:finite=0:roundtrip=0.000000:curveSamples=0:resampled=0:arc=0.000000:scale=primitive"
      }
      data-viz-manim-surface-bounds={manimEvidenceAttributes?.["data-viz-manim-surface-bounds"] ?? "none"}
      data-viz-manim-surface-cell-count={manimEvidenceAttributes?.["data-viz-manim-surface-cell-count"] ?? "0"}
      data-viz-manim-surface-finite-normal-count={manimEvidenceAttributes?.["data-viz-manim-surface-finite-normal-count"] ?? "0"}
      data-viz-manim-surface-finite-sample-count={manimEvidenceAttributes?.["data-viz-manim-surface-finite-sample-count"] ?? "0"}
      data-viz-manim-surface-grid-summary={manimEvidenceAttributes?.["data-viz-manim-surface-grid-summary"] ?? "none"}
      data-viz-manim-surface-normal-count={manimEvidenceAttributes?.["data-viz-manim-surface-normal-count"] ?? "0"}
      data-viz-manim-surface-object-count={manimEvidenceAttributes?.["data-viz-manim-surface-object-count"] ?? "0"}
      data-viz-manim-surface-object-ids={manimEvidenceAttributes?.["data-viz-manim-surface-object-ids"] ?? "none"}
      data-viz-manim-surface-range-summary={manimEvidenceAttributes?.["data-viz-manim-surface-range-summary"] ?? "none"}
      data-viz-manim-surface-sample-count={manimEvidenceAttributes?.["data-viz-manim-surface-sample-count"] ?? "0"}
      data-viz-manim-surface-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-surface-source-contract"] ?? SURFACE_OBJECT_SOURCE_CONTRACT
      }
      data-viz-manim-surface-summary={
        manimEvidenceAttributes?.["data-viz-manim-surface-summary"] ??
        "surfaces:objects=0:samples=0:finite=0:normals=0:finiteNormals=0:cells=0:triangles=0:wireRows=0:wireColumns=0:ids=none"
      }
      data-viz-manim-surface-topology-summary={manimEvidenceAttributes?.["data-viz-manim-surface-topology-summary"] ?? "none"}
      data-viz-manim-surface-triangle-count={manimEvidenceAttributes?.["data-viz-manim-surface-triangle-count"] ?? "0"}
      data-viz-manim-surface-wireframe-column-count={manimEvidenceAttributes?.["data-viz-manim-surface-wireframe-column-count"] ?? "0"}
      data-viz-manim-surface-wireframe-row-count={manimEvidenceAttributes?.["data-viz-manim-surface-wireframe-row-count"] ?? "0"}
      data-viz-manim-tracing-tail-age-range={manimEvidenceAttributes?.["data-viz-manim-tracing-tail-age-range"] ?? "none"}
      data-viz-manim-tracing-tail-buffer-capacity={manimEvidenceAttributes?.["data-viz-manim-tracing-tail-buffer-capacity"] ?? "0"}
      data-viz-manim-tracing-tail-buffer-policy-summary={
        manimEvidenceAttributes?.["data-viz-manim-tracing-tail-buffer-policy-summary"] ?? "none"
      }
      data-viz-manim-tracing-tail-count={manimEvidenceAttributes?.["data-viz-manim-tracing-tail-count"] ?? "0"}
      data-viz-manim-tracing-tail-duration-summary={manimEvidenceAttributes?.["data-viz-manim-tracing-tail-duration-summary"] ?? "none"}
      data-viz-manim-tracing-tail-fill-ratio-summary={manimEvidenceAttributes?.["data-viz-manim-tracing-tail-fill-ratio-summary"] ?? "none"}
      data-viz-manim-tracing-tail-finite-sample-count={manimEvidenceAttributes?.["data-viz-manim-tracing-tail-finite-sample-count"] ?? "0"}
      data-viz-manim-tracing-tail-fresh-point-summary={
        manimEvidenceAttributes?.["data-viz-manim-tracing-tail-fresh-point-summary"] ?? "none"
      }
      data-viz-manim-tracing-tail-gradient-direction-summary={
        manimEvidenceAttributes?.["data-viz-manim-tracing-tail-gradient-direction-summary"] ?? "none"
      }
      data-viz-manim-tracing-tail-gradient-monotonic={
        manimEvidenceAttributes?.["data-viz-manim-tracing-tail-gradient-monotonic"] ?? "true"
      }
      data-viz-manim-tracing-tail-gradient-summary={manimEvidenceAttributes?.["data-viz-manim-tracing-tail-gradient-summary"] ?? "none"}
      data-viz-manim-tracing-tail-ids={manimEvidenceAttributes?.["data-viz-manim-tracing-tail-ids"] ?? "none"}
      data-viz-manim-tracing-tail-opacity-range={manimEvidenceAttributes?.["data-viz-manim-tracing-tail-opacity-range"] ?? "none"}
      data-viz-manim-tracing-tail-sample-cadence-summary={
        manimEvidenceAttributes?.["data-viz-manim-tracing-tail-sample-cadence-summary"] ?? "none"
      }
      data-viz-manim-tracing-tail-sample-count={manimEvidenceAttributes?.["data-viz-manim-tracing-tail-sample-count"] ?? "0"}
      data-viz-manim-tracing-tail-sample-time-order-summary={
        manimEvidenceAttributes?.["data-viz-manim-tracing-tail-sample-time-order-summary"] ?? "none"
      }
      data-viz-manim-tracing-tail-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-tracing-tail-source-contract"] ?? TRACING_TAIL_SOURCE_CONTRACT
      }
      data-viz-manim-tracing-tail-source-ids={manimEvidenceAttributes?.["data-viz-manim-tracing-tail-source-ids"] ?? "none"}
      data-viz-manim-tracing-tail-stale-point-summary={
        manimEvidenceAttributes?.["data-viz-manim-tracing-tail-stale-point-summary"] ?? "none"
      }
      data-viz-manim-tracing-tail-stroke-width-range={manimEvidenceAttributes?.["data-viz-manim-tracing-tail-stroke-width-range"] ?? "none"}
      data-viz-manim-tracing-tail-summary={
        manimEvidenceAttributes?.["data-viz-manim-tracing-tail-summary"] ??
        "tracingTail:tails=0:samples=0:finite=0:capacity=0:ids=none:sources=none:age=none:opacity=none:stroke=none"
      }
      data-viz-manim-tracing-tail-timestamp-range={
        manimEvidenceAttributes?.["data-viz-manim-tracing-tail-timestamp-range"] ?? "none"
      }
      data-viz-manim-tracing-tail-traced-point-source-summary={
        manimEvidenceAttributes?.["data-viz-manim-tracing-tail-traced-point-source-summary"] ?? "none"
      }
      data-viz-manim-playback-active-event-summary={manimEvidenceAttributes?.["data-viz-manim-playback-active-event-summary"] ?? runtimeDiagnostics.manimPlaybackActiveEventSummary}
      data-viz-manim-playback-active-play-index={manimEvidenceAttributes?.["data-viz-manim-playback-active-play-index"] ?? runtimeDiagnostics.manimPlaybackActivePlayIndex}
      data-viz-manim-playback-completed-play-count={manimEvidenceAttributes?.["data-viz-manim-playback-completed-play-count"] ?? runtimeDiagnostics.manimPlaybackCompletedPlayCount}
      data-viz-manim-playback-event-count={manimEvidenceAttributes?.["data-viz-manim-playback-event-count"] ?? runtimeDiagnostics.manimPlaybackEventCount}
      data-viz-manim-playback-lifecycle-phase={manimEvidenceAttributes?.["data-viz-manim-playback-lifecycle-phase"] ?? runtimeDiagnostics.manimPlaybackLifecyclePhase}
      data-viz-manim-playback-lifecycle-summary={manimEvidenceAttributes?.["data-viz-manim-playback-lifecycle-summary"] ?? runtimeDiagnostics.manimPlaybackLifecycleSummary}
      data-viz-manim-playback-pending-play-count={manimEvidenceAttributes?.["data-viz-manim-playback-pending-play-count"] ?? runtimeDiagnostics.manimPlaybackPendingPlayCount}
      data-viz-manim-playback-source-contract={manimEvidenceAttributes?.["data-viz-manim-playback-source-contract"] ?? SCENE_PLAYBACK_SOURCE_CONTRACT}
      data-viz-manim-playback-state={manimScene ? manimPlaybackState : "primitive"}
      data-viz-manim-playback-updates-during-active-play={
        manimEvidenceAttributes?.["data-viz-manim-playback-updates-during-active-play"] ?? String(runtimeDiagnostics.manimPlaybackUpdatesDuringActivePlay)
      }
      data-viz-manim-play-compilation-animation-count={manimEvidenceAttributes?.["data-viz-manim-play-compilation-animation-count"] ?? "0"}
      data-viz-manim-play-compilation-builder-count={manimEvidenceAttributes?.["data-viz-manim-play-compilation-builder-count"] ?? "0"}
      data-viz-manim-play-compilation-call-order={manimEvidenceAttributes?.["data-viz-manim-play-compilation-call-order"] ?? "none"}
      data-viz-manim-play-compilation-call-order-ready={manimEvidenceAttributes?.["data-viz-manim-play-compilation-call-order-ready"] ?? "false"}
      data-viz-manim-play-compilation-error-summary={manimEvidenceAttributes?.["data-viz-manim-play-compilation-error-summary"] ?? "none"}
      data-viz-manim-play-compilation-invalid-count={manimEvidenceAttributes?.["data-viz-manim-play-compilation-invalid-count"] ?? "0"}
      data-viz-manim-play-compilation-pipeline={manimEvidenceAttributes?.["data-viz-manim-play-compilation-pipeline"] ?? "none"}
      data-viz-manim-play-compilation-prepare-policy={
        manimEvidenceAttributes?.["data-viz-manim-play-compilation-prepare-policy"] ??
        SCENE_PLAY_COMPILATION_PREPARE_POLICY
      }
      data-viz-manim-play-compilation-prepared-ids={manimEvidenceAttributes?.["data-viz-manim-play-compilation-prepared-ids"] ?? "none"}
      data-viz-manim-play-compilation-proto-count={manimEvidenceAttributes?.["data-viz-manim-play-compilation-proto-count"] ?? "0"}
      data-viz-manim-play-compilation-run-time={manimEvidenceAttributes?.["data-viz-manim-play-compilation-run-time"] ?? "0.000"}
      data-viz-manim-play-compilation-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-play-compilation-source-contract"] ??
        SCENE_PLAY_COMPILATION_SOURCE_CONTRACT
      }
      data-viz-manim-play-compilation-summary={
        manimEvidenceAttributes?.["data-viz-manim-play-compilation-summary"] ??
        "playCompilation:proto=0:prepared=0:updateRate=0:run=0.000:pipeline=none"
      }
      data-viz-manim-play-compilation-update-rate-count={manimEvidenceAttributes?.["data-viz-manim-play-compilation-update-rate-count"] ?? "0"}
      data-viz-manim-play-compilation-warning-empty={manimEvidenceAttributes?.["data-viz-manim-play-compilation-warning-empty"] ?? "true"}
      data-viz-manim-play-compilation-warning-message={manimEvidenceAttributes?.["data-viz-manim-play-compilation-warning-message"] ?? "none"}
      data-viz-manim-begin-animations-added-count={manimEvidenceAttributes?.["data-viz-manim-begin-animations-added-count"] ?? "0"}
      data-viz-manim-begin-animations-added-ids={manimEvidenceAttributes?.["data-viz-manim-begin-animations-added-ids"] ?? "none"}
      data-viz-manim-begin-animations-begin-count={manimEvidenceAttributes?.["data-viz-manim-begin-animations-begin-count"] ?? "0"}
      data-viz-manim-begin-animations-count={manimEvidenceAttributes?.["data-viz-manim-begin-animations-count"] ?? "0"}
      data-viz-manim-begin-animations-lifecycle-summary={manimEvidenceAttributes?.["data-viz-manim-begin-animations-lifecycle-summary"] ?? "none"}
      data-viz-manim-begin-animations-family-count-after={manimEvidenceAttributes?.["data-viz-manim-begin-animations-family-count-after"] ?? "0"}
      data-viz-manim-begin-animations-family-count-before={manimEvidenceAttributes?.["data-viz-manim-begin-animations-family-count-before"] ?? "0"}
      data-viz-manim-begin-animations-interpolate-zero-count={manimEvidenceAttributes?.["data-viz-manim-begin-animations-interpolate-zero-count"] ?? "0"}
      data-viz-manim-begin-animations-run-time={manimEvidenceAttributes?.["data-viz-manim-begin-animations-run-time"] ?? "0.000"}
      data-viz-manim-begin-animations-scene-add-count={manimEvidenceAttributes?.["data-viz-manim-begin-animations-scene-add-count"] ?? "0"}
      data-viz-manim-begin-animations-set-animating-status-count={
        manimEvidenceAttributes?.["data-viz-manim-begin-animations-set-animating-status-count"] ?? "0"
      }
      data-viz-manim-begin-animations-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-begin-animations-source-contract"] ??
        SCENE_BEGIN_ANIMATIONS_SOURCE_CONTRACT
      }
      data-viz-manim-begin-animations-start-state-policy={
        manimEvidenceAttributes?.["data-viz-manim-begin-animations-start-state-policy"] ??
        SCENE_BEGIN_ANIMATIONS_START_STATE_POLICY
      }
      data-viz-manim-begin-animations-starting-copy-count={manimEvidenceAttributes?.["data-viz-manim-begin-animations-starting-copy-count"] ?? "0"}
      data-viz-manim-begin-animations-starting-copy-ids={manimEvidenceAttributes?.["data-viz-manim-begin-animations-starting-copy-ids"] ?? "none"}
      data-viz-manim-begin-animations-summary={
        manimEvidenceAttributes?.["data-viz-manim-begin-animations-summary"] ??
        "beginAnimations:animations=0:begin=0:added=none:suspend=0:run=0.000:families=0"
      }
      data-viz-manim-begin-animations-suspend-count={manimEvidenceAttributes?.["data-viz-manim-begin-animations-suspend-count"] ?? "0"}
      data-viz-manim-finish-animations-cleanup-count={manimEvidenceAttributes?.["data-viz-manim-finish-animations-cleanup-count"] ?? "0"}
      data-viz-manim-finish-animations-count={manimEvidenceAttributes?.["data-viz-manim-finish-animations-count"] ?? "0"}
      data-viz-manim-finish-animations-final-alpha-summary={manimEvidenceAttributes?.["data-viz-manim-finish-animations-final-alpha-summary"] ?? "none"}
      data-viz-manim-finish-animations-finish-count={manimEvidenceAttributes?.["data-viz-manim-finish-animations-finish-count"] ?? "0"}
      data-viz-manim-finish-animations-lifecycle-summary={manimEvidenceAttributes?.["data-viz-manim-finish-animations-lifecycle-summary"] ?? "none"}
      data-viz-manim-finish-animations-removed-count={manimEvidenceAttributes?.["data-viz-manim-finish-animations-removed-count"] ?? "0"}
      data-viz-manim-finish-animations-removed-ids={manimEvidenceAttributes?.["data-viz-manim-finish-animations-removed-ids"] ?? "none"}
      data-viz-manim-finish-animations-resume-count={manimEvidenceAttributes?.["data-viz-manim-finish-animations-resume-count"] ?? "0"}
      data-viz-manim-finish-animations-resume-dt-summary={manimEvidenceAttributes?.["data-viz-manim-finish-animations-resume-dt-summary"] ?? "none"}
      data-viz-manim-finish-animations-resume-ids={manimEvidenceAttributes?.["data-viz-manim-finish-animations-resume-ids"] ?? "none"}
      data-viz-manim-finish-animations-resume-policy={
        manimEvidenceAttributes?.["data-viz-manim-finish-animations-resume-policy"] ??
        SCENE_FINISH_ANIMATIONS_RESUME_POLICY
      }
      data-viz-manim-finish-animations-run-time={manimEvidenceAttributes?.["data-viz-manim-finish-animations-run-time"] ?? "0.000"}
      data-viz-manim-finish-animations-scene-update-dt={manimEvidenceAttributes?.["data-viz-manim-finish-animations-scene-update-dt"] ?? "0.000"}
      data-viz-manim-finish-animations-set-animating-status-false-count={
        manimEvidenceAttributes?.["data-viz-manim-finish-animations-set-animating-status-false-count"] ?? "0"
      }
      data-viz-manim-finish-animations-skip={manimEvidenceAttributes?.["data-viz-manim-finish-animations-skip"] ?? "true"}
      data-viz-manim-finish-animations-cleanup-policy={
        manimEvidenceAttributes?.["data-viz-manim-finish-animations-cleanup-policy"] ??
        SCENE_FINISH_ANIMATIONS_CLEANUP_POLICY
      }
      data-viz-manim-finish-animations-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-finish-animations-source-contract"] ??
        SCENE_FINISH_ANIMATIONS_SOURCE_CONTRACT
      }
      data-viz-manim-finish-animations-summary={
        manimEvidenceAttributes?.["data-viz-manim-finish-animations-summary"] ??
        "finishAnimations:animations=0:finish=0:cleanup=0:removed=none:updateDt=0.000:skip=true"
      }
      data-viz-manim-pre-play-begin-animation-count={manimEvidenceAttributes?.["data-viz-manim-pre-play-begin-animation-count"] ?? "0"}
      data-viz-manim-pre-play-constructor-forced-skip={manimEvidenceAttributes?.["data-viz-manim-pre-play-constructor-forced-skip"] ?? "false"}
      data-viz-manim-pre-play-end-scene-play={manimEvidenceAttributes?.["data-viz-manim-pre-play-end-scene-play"] ?? "none"}
      data-viz-manim-pre-play-final-skip={manimEvidenceAttributes?.["data-viz-manim-pre-play-final-skip"] ?? "true"}
      data-viz-manim-pre-play-has-window={manimEvidenceAttributes?.["data-viz-manim-pre-play-has-window"] ?? "false"}
      data-viz-manim-pre-play-presenter-hold-count={manimEvidenceAttributes?.["data-viz-manim-pre-play-presenter-hold-count"] ?? "0"}
      data-viz-manim-pre-play-processed-play-count={manimEvidenceAttributes?.["data-viz-manim-pre-play-processed-play-count"] ?? "0"}
      data-viz-manim-pre-play-skip-gate-policy={
        manimEvidenceAttributes?.["data-viz-manim-pre-play-skip-gate-policy"] ??
        SCENE_PRE_PLAY_SKIP_GATE_POLICY
      }
      data-viz-manim-pre-play-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-pre-play-source-contract"] ??
        SCENE_PRE_PLAY_SOURCE_CONTRACT
      }
      data-viz-manim-pre-play-start-gate-count={manimEvidenceAttributes?.["data-viz-manim-pre-play-start-gate-count"] ?? "0"}
      data-viz-manim-pre-play-summary={
        manimEvidenceAttributes?.["data-viz-manim-pre-play-summary"] ??
        "prePlay:plays=0:begin=0:hold=0:startGate=0:endScene=0:windowClock=0"
      }
      data-viz-manim-pre-play-truncated={manimEvidenceAttributes?.["data-viz-manim-pre-play-truncated"] ?? "false"}
      data-viz-manim-pre-play-window-clock-reset-count={manimEvidenceAttributes?.["data-viz-manim-pre-play-window-clock-reset-count"] ?? "0"}
      data-viz-manim-post-play-preview-end-animation-count={manimEvidenceAttributes?.["data-viz-manim-post-play-preview-end-animation-count"] ?? "0"}
      data-viz-manim-post-play-preview-forced-count={manimEvidenceAttributes?.["data-viz-manim-post-play-preview-forced-count"] ?? "0"}
      data-viz-manim-post-play-preview-has-window={manimEvidenceAttributes?.["data-viz-manim-post-play-preview-has-window"] ?? "false"}
      data-viz-manim-post-play-preview-num-plays-ready={
        manimEvidenceAttributes?.["data-viz-manim-post-play-preview-num-plays-ready"] ?? "false"
      }
      data-viz-manim-post-play-preview-num-plays-sequence={
        manimEvidenceAttributes?.["data-viz-manim-post-play-preview-num-plays-sequence"] ?? "none"
      }
      data-viz-manim-post-play-preview-play-count={manimEvidenceAttributes?.["data-viz-manim-post-play-preview-play-count"] ?? "0"}
      data-viz-manim-post-play-preview-policy={
        manimEvidenceAttributes?.["data-viz-manim-post-play-preview-policy"] ??
        SCENE_POST_PLAY_PREVIEW_POLICY
      }
      data-viz-manim-post-play-preview-preview={manimEvidenceAttributes?.["data-viz-manim-post-play-preview-preview"] ?? "false"}
      data-viz-manim-post-play-preview-skip={manimEvidenceAttributes?.["data-viz-manim-post-play-preview-skip"] ?? "true"}
      data-viz-manim-post-play-preview-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-post-play-preview-source-contract"] ??
        SCENE_POST_PLAY_SOURCE_CONTRACT
      }
      data-viz-manim-post-play-preview-summary={
        manimEvidenceAttributes?.["data-viz-manim-post-play-preview-summary"] ??
        "postPlayPreview:plays=0:forced=0:endAnimation=0:skip=true:preview=false:window=false"
      }
      data-viz-manim-post-cell-redraw-action={manimEvidenceAttributes?.["data-viz-manim-post-cell-redraw-action"] ?? "skip-return"}
      data-viz-manim-post-cell-redraw-checkpoint-key={manimEvidenceAttributes?.["data-viz-manim-post-cell-redraw-checkpoint-key"] ?? "none"}
      data-viz-manim-post-cell-redraw-comment-count={manimEvidenceAttributes?.["data-viz-manim-post-cell-redraw-comment-count"] ?? "0"}
      data-viz-manim-post-cell-redraw-comment-label-policy={
        manimEvidenceAttributes?.["data-viz-manim-post-cell-redraw-comment-label-policy"] ??
        SCENE_POST_CELL_COMMENT_LABEL_POLICY
      }
      data-viz-manim-post-cell-redraw-dt={manimEvidenceAttributes?.["data-viz-manim-post-cell-redraw-dt"] ?? "0.000"}
      data-viz-manim-post-cell-redraw-force-draw={manimEvidenceAttributes?.["data-viz-manim-post-cell-redraw-force-draw"] ?? "false"}
      data-viz-manim-post-cell-redraw-has-window={manimEvidenceAttributes?.["data-viz-manim-post-cell-redraw-has-window"] ?? "false"}
      data-viz-manim-post-cell-redraw-line-count={manimEvidenceAttributes?.["data-viz-manim-post-cell-redraw-line-count"] ?? "0"}
      data-viz-manim-post-cell-redraw-operation-count={manimEvidenceAttributes?.["data-viz-manim-post-cell-redraw-operation-count"] ?? "0"}
      data-viz-manim-post-cell-redraw-policy={
        manimEvidenceAttributes?.["data-viz-manim-post-cell-redraw-policy"] ??
        SCENE_POST_CELL_REDRAW_POLICY
      }
      data-viz-manim-post-cell-redraw-ready={manimEvidenceAttributes?.["data-viz-manim-post-cell-redraw-ready"] ?? "false"}
      data-viz-manim-post-cell-redraw-skip={manimEvidenceAttributes?.["data-viz-manim-post-cell-redraw-skip"] ?? "true"}
      data-viz-manim-post-cell-redraw-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-post-cell-redraw-source-contract"] ??
        SCENE_POST_CELL_REDRAW_SOURCE_CONTRACT
      }
      data-viz-manim-post-cell-redraw-source-label={manimEvidenceAttributes?.["data-viz-manim-post-cell-redraw-source-label"] ?? "none"}
      data-viz-manim-post-cell-redraw-summary={
        manimEvidenceAttributes?.["data-viz-manim-post-cell-redraw-summary"] ??
        "postCellRedraw:key=none:lines=0:ops=0:redraw=false:force=false:window=false"
      }
      data-viz-manim-shortcut-checkpoint-count={manimEvidenceAttributes?.["data-viz-manim-shortcut-checkpoint-count"] ?? "0"}
      data-viz-manim-shortcut-count={manimEvidenceAttributes?.["data-viz-manim-shortcut-count"] ?? "0"}
      data-viz-manim-shortcut-history-count={manimEvidenceAttributes?.["data-viz-manim-shortcut-history-count"] ?? "0"}
      data-viz-manim-shortcut-ids={manimEvidenceAttributes?.["data-viz-manim-shortcut-ids"] ?? "none"}
      data-viz-manim-shortcut-playback-count={manimEvidenceAttributes?.["data-viz-manim-shortcut-playback-count"] ?? "0"}
      data-viz-manim-shortcut-redraw-count={manimEvidenceAttributes?.["data-viz-manim-shortcut-redraw-count"] ?? "0"}
      data-viz-manim-shortcut-reload-ready={manimEvidenceAttributes?.["data-viz-manim-shortcut-reload-ready"] ?? "false"}
      data-viz-manim-shortcut-scene-graph-count={manimEvidenceAttributes?.["data-viz-manim-shortcut-scene-graph-count"] ?? "0"}
      data-viz-manim-shortcut-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-shortcut-source-contract"] ??
        SCENE_SHORTCUT_CATALOG_SOURCE_CONTRACT
      }
      data-viz-manim-shortcut-state-count={manimEvidenceAttributes?.["data-viz-manim-shortcut-state-count"] ?? "0"}
      data-viz-manim-shortcut-authoring-policy={
        manimEvidenceAttributes?.["data-viz-manim-shortcut-authoring-policy"] ??
        SCENE_SHORTCUT_AUTHORING_POLICY
      }
      data-viz-manim-shortcut-summary={
        manimEvidenceAttributes?.["data-viz-manim-shortcut-summary"] ??
        "shortcuts:total=0:playback=0:sceneGraph=0:state=0:history=0:checkpoint=0:redraw=0:reload=false"
      }
      data-viz-manim-reload-checkpoint-count={manimEvidenceAttributes?.["data-viz-manim-reload-checkpoint-count"] ?? "0"}
      data-viz-manim-reload-clears-snippet={manimEvidenceAttributes?.["data-viz-manim-reload-clears-snippet"] ?? "false"}
      data-viz-manim-reload-frame-after={manimEvidenceAttributes?.["data-viz-manim-reload-frame-after"] ?? "0"}
      data-viz-manim-reload-history-label={manimEvidenceAttributes?.["data-viz-manim-reload-history-label"] ?? "reload"}
      data-viz-manim-reload-ready={manimEvidenceAttributes?.["data-viz-manim-reload-ready"] ?? "false"}
      data-viz-manim-reload-reset-policy={
        manimEvidenceAttributes?.["data-viz-manim-reload-reset-policy"] ??
        SCENE_RELOAD_RESET_POLICY
      }
      data-viz-manim-reload-resets-elapsed={manimEvidenceAttributes?.["data-viz-manim-reload-resets-elapsed"] ?? "false"}
      data-viz-manim-reload-resets-frame={manimEvidenceAttributes?.["data-viz-manim-reload-resets-frame"] ?? "false"}
      data-viz-manim-reload-scene-id={manimEvidenceAttributes?.["data-viz-manim-reload-scene-id"] ?? "none"}
      data-viz-manim-reload-selected-family-id={manimEvidenceAttributes?.["data-viz-manim-reload-selected-family-id"] ?? "none"}
      data-viz-manim-reload-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-reload-source-contract"] ??
        SCENE_RELOAD_SOURCE_CONTRACT
      }
      data-viz-manim-reload-summary={
        manimEvidenceAttributes?.["data-viz-manim-reload-summary"] ??
        "reload:scene=none:family=none:selected=none:ready=false:elapsed=false:frame=false:snippet=false:checkpoints=0"
      }
      data-viz-manim-wait-control-called-emit-frame-count={manimEvidenceAttributes?.["data-viz-manim-wait-control-called-emit-frame-count"] ?? "0"}
      data-viz-manim-wait-control-called-update-frame-count={manimEvidenceAttributes?.["data-viz-manim-wait-control-called-update-frame-count"] ?? "0"}
      data-viz-manim-wait-control-description={manimEvidenceAttributes?.["data-viz-manim-wait-control-description"] ?? "none"}
      data-viz-manim-wait-control-emit-frame-statuses={manimEvidenceAttributes?.["data-viz-manim-wait-control-emit-frame-statuses"] ?? "none"}
      data-viz-manim-wait-control-effective-duration={manimEvidenceAttributes?.["data-viz-manim-wait-control-effective-duration"] ?? "0.000"}
      data-viz-manim-wait-control-emitted-frame-count={manimEvidenceAttributes?.["data-viz-manim-wait-control-emitted-frame-count"] ?? "0"}
      data-viz-manim-wait-control-emitted-time-range={
        manimEvidenceAttributes?.["data-viz-manim-wait-control-emitted-time-range"] ?? "none"
      }
      data-viz-manim-wait-control-emitted-times={manimEvidenceAttributes?.["data-viz-manim-wait-control-emitted-times"] ?? "none"}
      data-viz-manim-wait-control-fps={manimEvidenceAttributes?.["data-viz-manim-wait-control-fps"] ?? "0"}
      data-viz-manim-wait-control-frame-interval={manimEvidenceAttributes?.["data-viz-manim-wait-control-frame-interval"] ?? "0.000"}
      data-viz-manim-wait-control-frame-policy={
        manimEvidenceAttributes?.["data-viz-manim-wait-control-frame-policy"] ??
        SCENE_WAIT_CONTROL_FRAME_POLICY
      }
      data-viz-manim-wait-control-frame-operation-summary={
        manimEvidenceAttributes?.["data-viz-manim-wait-control-frame-operation-summary"] ??
        "waitFrameOps:update_frame>hold_loop:frames=0:update=0:emit=0:write=0:mobjects=0"
      }
      data-viz-manim-wait-control-increments-scene-time={
        manimEvidenceAttributes?.["data-viz-manim-wait-control-increments-scene-time"] ?? "none"
      }
      data-viz-manim-wait-control-max-time={manimEvidenceAttributes?.["data-viz-manim-wait-control-max-time"] ?? "0.000"}
      data-viz-manim-wait-control-mode={manimEvidenceAttributes?.["data-viz-manim-wait-control-mode"] ?? "fixed-duration"}
      data-viz-manim-wait-control-n-iterations={manimEvidenceAttributes?.["data-viz-manim-wait-control-n-iterations"] ?? "0"}
      data-viz-manim-wait-control-override-skip={manimEvidenceAttributes?.["data-viz-manim-wait-control-override-skip"] ?? "false"}
      data-viz-manim-wait-control-run-time={manimEvidenceAttributes?.["data-viz-manim-wait-control-run-time"] ?? "0.000"}
      data-viz-manim-wait-control-skip-animations={manimEvidenceAttributes?.["data-viz-manim-wait-control-skip-animations"] ?? "false"}
      data-viz-manim-wait-control-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-wait-control-source-contract"] ??
        SCENE_WAIT_CONTROL_SOURCE_CONTRACT
      }
      data-viz-manim-wait-control-stop-condition-id={manimEvidenceAttributes?.["data-viz-manim-wait-control-stop-condition-id"] ?? "none"}
      data-viz-manim-wait-control-stop-condition-satisfied={manimEvidenceAttributes?.["data-viz-manim-wait-control-stop-condition-satisfied"] ?? "false"}
      data-viz-manim-wait-control-summary={
        manimEvidenceAttributes?.["data-viz-manim-wait-control-summary"] ??
        "waitControl:fixed-duration:condition=none:run=0.000:effective=0.000:frames=0:overrideSkip=false:satisfied=false"
      }
      data-viz-manim-wait-control-update-frame-actions={manimEvidenceAttributes?.["data-viz-manim-wait-control-update-frame-actions"] ?? "none"}
      data-viz-manim-wait-control-update-mobject-frame-count={manimEvidenceAttributes?.["data-viz-manim-wait-control-update-mobject-frame-count"] ?? "0"}
      data-viz-manim-wait-control-update-mobject-dts={manimEvidenceAttributes?.["data-viz-manim-wait-control-update-mobject-dts"] ?? "none"}
      data-viz-manim-wait-control-update-mobject-total-dt={manimEvidenceAttributes?.["data-viz-manim-wait-control-update-mobject-total-dt"] ?? "0.000"}
      data-viz-manim-wait-control-updater-final-value={manimEvidenceAttributes?.["data-viz-manim-wait-control-updater-final-value"] ?? "0.000"}
      data-viz-manim-wait-control-updater-value-summary={
        manimEvidenceAttributes?.["data-viz-manim-wait-control-updater-value-summary"] ??
        "waitUpdater:mode=fixed-duration:frames=0:final=0.000:values=none"
      }
      data-viz-manim-wait-control-updater-values={manimEvidenceAttributes?.["data-viz-manim-wait-control-updater-values"] ?? "none"}
      data-viz-manim-wait-control-updates-mobjects-during-presenter-hold={
        manimEvidenceAttributes?.["data-viz-manim-wait-control-updates-mobjects-during-presenter-hold"] ?? "false"
      }
      data-viz-manim-wait-control-updates-mobjects-during-wait={
        manimEvidenceAttributes?.["data-viz-manim-wait-control-updates-mobjects-during-wait"] ?? "false"
      }
      data-viz-manim-wait-control-updates-mobjects-while-skipping={
        manimEvidenceAttributes?.["data-viz-manim-wait-control-updates-mobjects-while-skipping"] ?? "false"
      }
      data-viz-manim-wait-control-updates-mobjects={manimEvidenceAttributes?.["data-viz-manim-wait-control-updates-mobjects"] ?? "none"}
      data-viz-manim-wait-control-updater-policy={
        manimEvidenceAttributes?.["data-viz-manim-wait-control-updater-policy"] ??
        SCENE_WAIT_CONTROL_UPDATER_POLICY
      }
      data-viz-manim-wait-control-written-frame-count={manimEvidenceAttributes?.["data-viz-manim-wait-control-written-frame-count"] ?? "0"}
      data-viz-manim-wait-frame-stepper-active-steps={manimEvidenceAttributes?.["data-viz-manim-wait-frame-stepper-active-steps"] ?? "none"}
      data-viz-manim-wait-frame-stepper-camera-shots={manimEvidenceAttributes?.["data-viz-manim-wait-frame-stepper-camera-shots"] ?? "none"}
      data-viz-manim-wait-frame-stepper-frame-step-count={manimEvidenceAttributes?.["data-viz-manim-wait-frame-stepper-frame-step-count"] ?? "0"}
      data-viz-manim-wait-frame-stepper-mismatch-count={manimEvidenceAttributes?.["data-viz-manim-wait-frame-stepper-mismatch-count"] ?? "0"}
      data-viz-manim-wait-frame-stepper-scene-ids={manimEvidenceAttributes?.["data-viz-manim-wait-frame-stepper-scene-ids"] ?? "none"}
      data-viz-manim-wait-frame-stepper-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-wait-frame-stepper-source-contract"] ??
        SCENE_WAIT_FRAME_STEPPER_BRIDGE_SOURCE_CONTRACT
      }
      data-viz-manim-wait-frame-stepper-summary={
        manimEvidenceAttributes?.["data-viz-manim-wait-frame-stepper-summary"] ??
        "waitFrameStepperBridge:waitFrames=0:frameSteps=0:mismatches=0:times=none"
      }
      data-viz-manim-wait-frame-stepper-update-frame-actions={
        manimEvidenceAttributes?.["data-viz-manim-wait-frame-stepper-update-frame-actions"] ?? "none"
      }
      data-viz-manim-wait-frame-stepper-updater-active-counts={
        manimEvidenceAttributes?.["data-viz-manim-wait-frame-stepper-updater-active-counts"] ?? "none"
      }
      data-viz-manim-wait-frame-stepper-updater-suspended-counts={
        manimEvidenceAttributes?.["data-viz-manim-wait-frame-stepper-updater-suspended-counts"] ?? "none"
      }
      data-viz-manim-wait-frame-stepper-updater-value-after-frames={
        manimEvidenceAttributes?.["data-viz-manim-wait-frame-stepper-updater-value-after-frames"] ?? "none"
      }
      data-viz-manim-wait-frame-stepper-wait-frame-count={manimEvidenceAttributes?.["data-viz-manim-wait-frame-stepper-wait-frame-count"] ?? "0"}
      data-viz-manim-wait-frame-stepper-wait-updates-mobjects={
        manimEvidenceAttributes?.["data-viz-manim-wait-frame-stepper-wait-updates-mobjects"] ?? "none"
      }
      data-viz-manim-wait-frame-stepper-wait-times={manimEvidenceAttributes?.["data-viz-manim-wait-frame-stepper-wait-times"] ?? "none"}
      data-viz-manim-wait-frame-stepper-write-frame-flags={
        manimEvidenceAttributes?.["data-viz-manim-wait-frame-stepper-write-frame-flags"] ?? "none"
      }
      data-viz-manim-presenter-hold-duration={manimEvidenceAttributes?.["data-viz-manim-presenter-hold-duration"] ?? "0.000"}
      data-viz-manim-presenter-hold-final-hold-on-wait={manimEvidenceAttributes?.["data-viz-manim-presenter-hold-final-hold-on-wait"] ?? "false"}
      data-viz-manim-presenter-hold-frame-count={manimEvidenceAttributes?.["data-viz-manim-presenter-hold-frame-count"] ?? "0"}
      data-viz-manim-presenter-hold-ignore={manimEvidenceAttributes?.["data-viz-manim-presenter-hold-ignore"] ?? "false"}
      data-viz-manim-presenter-hold-mode={manimEvidenceAttributes?.["data-viz-manim-presenter-hold-mode"] ?? "ordinary-wait"}
      data-viz-manim-presenter-hold-note-logged={manimEvidenceAttributes?.["data-viz-manim-presenter-hold-note-logged"] ?? "false"}
      data-viz-manim-presenter-hold-presenter-mode={manimEvidenceAttributes?.["data-viz-manim-presenter-hold-presenter-mode"] ?? "false"}
      data-viz-manim-presenter-hold-release-event={manimEvidenceAttributes?.["data-viz-manim-presenter-hold-release-event"] ?? "none"}
      data-viz-manim-presenter-hold-should-use-timeline-wait={manimEvidenceAttributes?.["data-viz-manim-presenter-hold-should-use-timeline-wait"] ?? "true"}
      data-viz-manim-presenter-hold-skip-animations={manimEvidenceAttributes?.["data-viz-manim-presenter-hold-skip-animations"] ?? "false"}
      data-viz-manim-presenter-hold-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-presenter-hold-source-contract"] ?? SCENE_PRESENTER_HOLD_SOURCE_CONTRACT
      }
      data-viz-manim-presenter-hold-summary={
        manimEvidenceAttributes?.["data-viz-manim-presenter-hold-summary"] ??
        "presenterHold:mode=ordinary-wait:frames=0:duration=0.000:released=none:timelineWait=true:note=false"
      }
      data-viz-manim-skipping-window-constructor-forced-skip={manimEvidenceAttributes?.["data-viz-manim-skipping-window-constructor-forced-skip"] ?? "false"}
      data-viz-manim-skipping-window-end-at={manimEvidenceAttributes?.["data-viz-manim-skipping-window-end-at"] ?? "none"}
      data-viz-manim-skipping-window-end-scene-play={manimEvidenceAttributes?.["data-viz-manim-skipping-window-end-scene-play"] ?? "none"}
      data-viz-manim-skipping-window-final-skip={manimEvidenceAttributes?.["data-viz-manim-skipping-window-final-skip"] ?? "false"}
      data-viz-manim-skipping-window-gate-policy={
        manimEvidenceAttributes?.["data-viz-manim-skipping-window-gate-policy"] ??
        SCENE_SKIPPING_WINDOW_GATE_POLICY
      }
      data-viz-manim-skipping-window-play-count={manimEvidenceAttributes?.["data-viz-manim-skipping-window-play-count"] ?? "0"}
      data-viz-manim-skipping-window-rendered-play-count={manimEvidenceAttributes?.["data-viz-manim-skipping-window-rendered-play-count"] ?? "0"}
      data-viz-manim-skipping-window-skipped-play-count={manimEvidenceAttributes?.["data-viz-manim-skipping-window-skipped-play-count"] ?? "0"}
      data-viz-manim-skipping-window-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-skipping-window-source-contract"] ??
        SCENE_SKIPPING_WINDOW_SOURCE_CONTRACT
      }
      data-viz-manim-skipping-window-start-at={manimEvidenceAttributes?.["data-viz-manim-skipping-window-start-at"] ?? "none"}
      data-viz-manim-skipping-window-summary={
        manimEvidenceAttributes?.["data-viz-manim-skipping-window-summary"] ??
        "skippingWindow:start=none:end=none:plays=0:rendered=0:skipped=0:finalSkip=false:endScene=false"
      }
      data-viz-manim-skipping-window-truncated={manimEvidenceAttributes?.["data-viz-manim-skipping-window-truncated"] ?? "false"}
      data-viz-manim-skip-control-action-summary={manimEvidenceAttributes?.["data-viz-manim-skip-control-action-summary"] ?? "none"}
      data-viz-manim-skip-control-final-original-status={manimEvidenceAttributes?.["data-viz-manim-skip-control-final-original-status"] ?? "false"}
      data-viz-manim-skip-control-final-skip={manimEvidenceAttributes?.["data-viz-manim-skip-control-final-skip"] ?? "false"}
      data-viz-manim-skip-control-final-temp-previous={manimEvidenceAttributes?.["data-viz-manim-skip-control-final-temp-previous"] ?? "false"}
      data-viz-manim-skip-control-has-original-status={manimEvidenceAttributes?.["data-viz-manim-skip-control-has-original-status"] ?? "true"}
      data-viz-manim-skip-control-skipped-transition-count={manimEvidenceAttributes?.["data-viz-manim-skip-control-skipped-transition-count"] ?? "0"}
      data-viz-manim-skip-control-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-skip-control-source-contract"] ??
        SCENE_SKIP_CONTROL_SOURCE_CONTRACT
      }
      data-viz-manim-skip-control-state-policy={
        manimEvidenceAttributes?.["data-viz-manim-skip-control-state-policy"] ??
        SCENE_SKIP_CONTROL_STATE_POLICY
      }
      data-viz-manim-skip-control-stopped-transition-count={manimEvidenceAttributes?.["data-viz-manim-skip-control-stopped-transition-count"] ?? "0"}
      data-viz-manim-skip-control-summary={
        manimEvidenceAttributes?.["data-viz-manim-skip-control-summary"] ??
        "skipControl:transitions=0:finalSkip=false:original=false:stopped=0:actions=none"
      }
      data-viz-manim-skip-control-transition-count={manimEvidenceAttributes?.["data-viz-manim-skip-control-transition-count"] ?? "0"}
      data-viz-manim-progress-control-action-summary={manimEvidenceAttributes?.["data-viz-manim-progress-control-action-summary"] ?? "none"}
      data-viz-manim-progress-control-final-progress={manimEvidenceAttributes?.["data-viz-manim-progress-control-final-progress"] ?? "false"}
      data-viz-manim-progress-control-initial-progress={manimEvidenceAttributes?.["data-viz-manim-progress-control-initial-progress"] ?? "false"}
      data-viz-manim-progress-control-previous-progress={manimEvidenceAttributes?.["data-viz-manim-progress-control-previous-progress"] ?? "false"}
      data-viz-manim-progress-control-requested={manimEvidenceAttributes?.["data-viz-manim-progress-control-requested"] ?? "false"}
      data-viz-manim-progress-control-restored-previous={manimEvidenceAttributes?.["data-viz-manim-progress-control-restored-previous"] ?? "false"}
      data-viz-manim-progress-control-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-progress-control-source-contract"] ??
        SCENE_PROGRESS_CONTROL_SOURCE_CONTRACT
      }
      data-viz-manim-progress-control-state-policy={
        manimEvidenceAttributes?.["data-viz-manim-progress-control-state-policy"] ??
        SCENE_PROGRESS_CONTROL_STATE_POLICY
      }
      data-viz-manim-progress-control-summary={
        manimEvidenceAttributes?.["data-viz-manim-progress-control-summary"] ??
        "progressControl:requested=false:transitions=0:initial=false:final=false:restored=false:actions=none"
      }
      data-viz-manim-progress-control-transition-count={manimEvidenceAttributes?.["data-viz-manim-progress-control-transition-count"] ?? "0"}
      data-viz-manim-floor-plane={manimEvidenceAttributes?.["data-viz-manim-floor-plane"] ?? "xy"}
      data-viz-manim-floor-plane-error={manimEvidenceAttributes?.["data-viz-manim-floor-plane-error"] ?? "none"}
      data-viz-manim-floor-plane-euler-axes={manimEvidenceAttributes?.["data-viz-manim-floor-plane-euler-axes"] ?? "zxz"}
      data-viz-manim-floor-plane-raises-error={manimEvidenceAttributes?.["data-viz-manim-floor-plane-raises-error"] ?? "false"}
      data-viz-manim-floor-plane-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-floor-plane-source-contract"] ?? SCENE_FLOOR_PLANE_SOURCE_CONTRACT
      }
      data-viz-manim-floor-plane-summary={
        manimEvidenceAttributes?.["data-viz-manim-floor-plane-summary"] ?? "floorPlane:xy:euler=zxz:valid=true"
      }
      data-viz-manim-floor-plane-valid={manimEvidenceAttributes?.["data-viz-manim-floor-plane-valid"] ?? "true"}
      data-viz-manim-key-action={manimEvidenceAttributes?.["data-viz-manim-key-action"] ?? "dispatch-only"}
      data-viz-manim-key-can-redo={manimEvidenceAttributes?.["data-viz-manim-key-can-redo"] ?? "false"}
      data-viz-manim-key-can-undo={manimEvidenceAttributes?.["data-viz-manim-key-can-undo"] ?? "false"}
      data-viz-manim-key-dispatches-event={manimEvidenceAttributes?.["data-viz-manim-key-dispatches-event"] ?? "true"}
      data-viz-manim-key-event-type={manimEvidenceAttributes?.["data-viz-manim-key-event-type"] ?? "key-release"}
      data-viz-manim-key-final-hold-on-wait={manimEvidenceAttributes?.["data-viz-manim-key-final-hold-on-wait"] ?? "true"}
      data-viz-manim-key-final-quit-interaction={manimEvidenceAttributes?.["data-viz-manim-key-final-quit-interaction"] ?? "false"}
      data-viz-manim-key-key={manimEvidenceAttributes?.["data-viz-manim-key-key"] ?? "none"}
      data-viz-manim-key-plays-camera-reset={manimEvidenceAttributes?.["data-viz-manim-key-plays-camera-reset"] ?? "false"}
      data-viz-manim-key-prevents-propagation={manimEvidenceAttributes?.["data-viz-manim-key-prevents-propagation"] ?? "false"}
      data-viz-manim-key-redo-requested={manimEvidenceAttributes?.["data-viz-manim-key-redo-requested"] ?? "false"}
      data-viz-manim-key-release-event={manimEvidenceAttributes?.["data-viz-manim-key-release-event"] ?? "none"}
      data-viz-manim-key-reset-key={manimEvidenceAttributes?.["data-viz-manim-key-reset-key"] ?? "r"}
      data-viz-manim-key-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-key-source-contract"] ?? SCENE_KEY_CONTROL_SOURCE_CONTRACT
      }
      data-viz-manim-key-summary={
        manimEvidenceAttributes?.["data-viz-manim-key-summary"] ??
        "keyControl:key-release:none:action=dispatch-only:quit=false:hold=true"
      }
      data-viz-manim-key-undo-requested={manimEvidenceAttributes?.["data-viz-manim-key-undo-requested"] ?? "false"}
      data-viz-manim-pick-buff={manimEvidenceAttributes?.["data-viz-manim-pick-buff"] ?? "0"}
      data-viz-manim-pick-concept-id={manimEvidenceAttributes?.["data-viz-manim-pick-concept-id"] ?? "none"}
      data-viz-manim-pick-distance-to-center={manimEvidenceAttributes?.["data-viz-manim-pick-distance-to-center"] ?? "0.000"}
      data-viz-manim-pick-group={manimEvidenceAttributes?.["data-viz-manim-pick-group"] ?? "none"}
      data-viz-manim-pick-hit={manimEvidenceAttributes?.["data-viz-manim-pick-hit"] ?? "false"}
      data-viz-manim-pick-object-id={manimEvidenceAttributes?.["data-viz-manim-pick-object-id"] ?? "none"}
      data-viz-manim-pick-render-index={manimEvidenceAttributes?.["data-viz-manim-pick-render-index"] ?? "-1"}
      data-viz-manim-pick-search-order-index={manimEvidenceAttributes?.["data-viz-manim-pick-search-order-index"] ?? "-1"}
      data-viz-manim-pick-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-pick-source-contract"] ?? SCENE_PICKING_SOURCE_CONTRACT
      }
      data-viz-manim-pick-summary={manimEvidenceAttributes?.["data-viz-manim-pick-summary"] ?? "pick:miss"}
      data-viz-manim-pointer-button={manimEvidenceAttributes?.["data-viz-manim-pointer-button"] ?? "none"}
      data-viz-manim-pointer-buttons={manimEvidenceAttributes?.["data-viz-manim-pointer-buttons"] ?? "none"}
      data-viz-manim-pointer-control-version={
        manimEvidenceAttributes?.["data-viz-manim-pointer-control-version"] ?? "mais-manim-pointer-controls/v1"
      }
      data-viz-manim-pointer-delta-point={manimEvidenceAttributes?.["data-viz-manim-pointer-delta-point"] ?? "0.000,0.000,0.000"}
      data-viz-manim-pointer-dispatches-event={manimEvidenceAttributes?.["data-viz-manim-pointer-dispatches-event"] ?? "true"}
      data-viz-manim-pointer-event-type={manimEvidenceAttributes?.["data-viz-manim-pointer-event-type"] ?? "mouse-motion"}
      data-viz-manim-pointer-frame-action={manimEvidenceAttributes?.["data-viz-manim-pointer-frame-action"] ?? "none"}
      data-viz-manim-pointer-frame-shift={manimEvidenceAttributes?.["data-viz-manim-pointer-frame-shift"] ?? "0.000,0.000,0.000"}
      data-viz-manim-pointer-modifiers={manimEvidenceAttributes?.["data-viz-manim-pointer-modifiers"] ?? "none"}
      data-viz-manim-pointer-mouse-drag-point-updated={manimEvidenceAttributes?.["data-viz-manim-pointer-mouse-drag-point-updated"] ?? "false"}
      data-viz-manim-pointer-mouse-point-updated={manimEvidenceAttributes?.["data-viz-manim-pointer-mouse-point-updated"] ?? "true"}
      data-viz-manim-pointer-offset={manimEvidenceAttributes?.["data-viz-manim-pointer-offset"] ?? "0.000,0.000,0.000"}
      data-viz-manim-pointer-phi-delta={manimEvidenceAttributes?.["data-viz-manim-pointer-phi-delta"] ?? "0.000"}
      data-viz-manim-pointer-point={manimEvidenceAttributes?.["data-viz-manim-pointer-point"] ?? "0.000,0.000,0.000"}
      data-viz-manim-pointer-propagation-stopped={manimEvidenceAttributes?.["data-viz-manim-pointer-propagation-stopped"] ?? "false"}
      data-viz-manim-pointer-scale-about-point={manimEvidenceAttributes?.["data-viz-manim-pointer-scale-about-point"] ?? "0.000,0.000,0.000"}
      data-viz-manim-pointer-scale-factor={manimEvidenceAttributes?.["data-viz-manim-pointer-scale-factor"] ?? "1.000"}
      data-viz-manim-pointer-scroll-relative-offset={manimEvidenceAttributes?.["data-viz-manim-pointer-scroll-relative-offset"] ?? "0.000"}
      data-viz-manim-pointer-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-pointer-source-contract"] ?? SCENE_POINTER_CONTROL_SOURCE_CONTRACT
      }
      data-viz-manim-pointer-summary={
        manimEvidenceAttributes?.["data-viz-manim-pointer-summary"] ?? "pointer:mouse-motion:action=none:stopped=false:window=true"
      }
      data-viz-manim-pointer-theta-delta={manimEvidenceAttributes?.["data-viz-manim-pointer-theta-delta"] ?? "0.000"}
      data-viz-manim-pointer-window-ok={manimEvidenceAttributes?.["data-viz-manim-pointer-window-ok"] ?? "true"}
      data-viz-manim-window-calls-focus={manimEvidenceAttributes?.["data-viz-manim-window-calls-focus"] ?? "false"}
      data-viz-manim-window-event-type={manimEvidenceAttributes?.["data-viz-manim-window-event-type"] ?? "resize"}
      data-viz-manim-window-has-window={manimEvidenceAttributes?.["data-viz-manim-window-has-window"] ?? "true"}
      data-viz-manim-window-height={manimEvidenceAttributes?.["data-viz-manim-window-height"] ?? "0"}
      data-viz-manim-window-no-op={manimEvidenceAttributes?.["data-viz-manim-window-no-op"] ?? "true"}
      data-viz-manim-window-returned-early={manimEvidenceAttributes?.["data-viz-manim-window-returned-early"] ?? "false"}
      data-viz-manim-window-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-window-source-contract"] ?? SCENE_WINDOW_EVENT_SOURCE_CONTRACT
      }
      data-viz-manim-window-summary={
        manimEvidenceAttributes?.["data-viz-manim-window-summary"] ?? "windowEvent:resize:noop=true:focus=false:window=true"
      }
      data-viz-manim-window-width={manimEvidenceAttributes?.["data-viz-manim-window-width"] ?? "0"}
      data-viz-manim-sound-cue-audible-count={manimEvidenceAttributes?.["data-viz-manim-sound-cue-audible-count"] ?? "0"}
      data-viz-manim-sound-cue-count={manimEvidenceAttributes?.["data-viz-manim-sound-cue-count"] ?? "0"}
      data-viz-manim-sound-cue-gain-summary={manimEvidenceAttributes?.["data-viz-manim-sound-cue-gain-summary"] ?? "none"}
      data-viz-manim-sound-cue-includes-sound={manimEvidenceAttributes?.["data-viz-manim-sound-cue-includes-sound"] ?? "false"}
      data-viz-manim-sound-cue-issue-count={manimEvidenceAttributes?.["data-viz-manim-sound-cue-issue-count"] ?? "0"}
      data-viz-manim-sound-cue-ids={manimEvidenceAttributes?.["data-viz-manim-sound-cue-ids"] ?? "none"}
      data-viz-manim-sound-cue-row-count={manimEvidenceAttributes?.["data-viz-manim-sound-cue-row-count"] ?? "0"}
      data-viz-manim-sound-cue-scheduled-ids={manimEvidenceAttributes?.["data-viz-manim-sound-cue-scheduled-ids"] ?? "none"}
      data-viz-manim-sound-cue-scheduled-time-summary={
        manimEvidenceAttributes?.["data-viz-manim-sound-cue-scheduled-time-summary"] ?? "none"
      }
      data-viz-manim-sound-cue-skipped-count={manimEvidenceAttributes?.["data-viz-manim-sound-cue-skipped-count"] ?? "0"}
      data-viz-manim-sound-cue-sound-file-count={manimEvidenceAttributes?.["data-viz-manim-sound-cue-sound-file-count"] ?? "0"}
      data-viz-manim-sound-cue-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-sound-cue-source-contract"] ??
        SCENE_SOUND_CUE_SOURCE_CONTRACT
      }
      data-viz-manim-sound-cue-status-summary={manimEvidenceAttributes?.["data-viz-manim-sound-cue-status-summary"] ?? "none"}
      data-viz-manim-sound-cue-summary={
        manimEvidenceAttributes?.["data-viz-manim-sound-cue-summary"] ??
        "soundCues:total=0:audible=0:skipped=0:issues=0:ids=none"
      }
      data-viz-manim-sound-cue-time-offset-summary={
        manimEvidenceAttributes?.["data-viz-manim-sound-cue-time-offset-summary"] ?? "none"
      }
      data-viz-manim-interact-dt={manimEvidenceAttributes?.["data-viz-manim-interact-dt"] ?? "0.000"}
      data-viz-manim-interact-final-scene-time={
        manimEvidenceAttributes?.["data-viz-manim-interact-final-scene-time"] ?? "0.000"
      }
      data-viz-manim-interact-frame-count={manimEvidenceAttributes?.["data-viz-manim-interact-frame-count"] ?? "0"}
      data-viz-manim-interact-has-window={manimEvidenceAttributes?.["data-viz-manim-interact-has-window"] ?? "false"}
      data-viz-manim-interact-logs-tips={manimEvidenceAttributes?.["data-viz-manim-interact-logs-tips"] ?? "false"}
      data-viz-manim-interact-sets-skip-false={
        manimEvidenceAttributes?.["data-viz-manim-interact-sets-skip-false"] ?? "false"
      }
      data-viz-manim-interact-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-interact-source-contract"] ?? SCENE_INTERACT_LOOP_SOURCE_CONTRACT
      }
      data-viz-manim-interact-state-policy={
        manimEvidenceAttributes?.["data-viz-manim-interact-state-policy"] ?? SCENE_INTERACT_LOOP_STATE_POLICY
      }
      data-viz-manim-interact-summary={
        manimEvidenceAttributes?.["data-viz-manim-interact-summary"] ??
        "interactLoop:termination=no-window:frames=0:dt=0.000:skip=false"
      }
      data-viz-manim-interact-termination={
        manimEvidenceAttributes?.["data-viz-manim-interact-termination"] ?? "no-window"
      }
      data-viz-manim-interact-update-frame-actions={
        manimEvidenceAttributes?.["data-viz-manim-interact-update-frame-actions"] ?? "none"
      }
      data-viz-manim-interact-update-frame-count={
        manimEvidenceAttributes?.["data-viz-manim-interact-update-frame-count"] ?? "0"
      }
      data-viz-manim-parameter-panel-count={manimScene ? manimParameterPanelAttributes["data-viz-manim-parameter-panel-count"] : "0"}
      data-viz-manim-parameter-panel-control-count={manimScene ? manimParameterPanelAttributes["data-viz-manim-parameter-panel-control-count"] : "0"}
      data-viz-manim-parameter-panel-derived-count={manimScene ? manimParameterPanelAttributes["data-viz-manim-parameter-panel-derived-count"] : "0"}
      data-viz-manim-parameter-panel-ids={manimScene ? manimParameterPanelAttributes["data-viz-manim-parameter-panel-ids"] : "none"}
      data-viz-manim-parameter-panel-selected={manimScene ? manimParameterPanelAttributes["data-viz-manim-parameter-panel-selected"] : "none"}
      data-viz-manim-parameter-panel-summary={
        manimScene
          ? manimParameterPanelAttributes["data-viz-manim-parameter-panel-summary"]
          : "parameters=0;controls=0;derived=0;timeline=0;active=none;ids=none"
      }
      data-viz-manim-random-seed={manimEvidenceAttributes?.["data-viz-manim-random-seed"] ?? runtimeDiagnostics.manimRandomSeed}
      data-viz-manim-random-seed-algorithm={manimEvidenceAttributes?.["data-viz-manim-random-seed-algorithm"] ?? runtimeDiagnostics.manimRandomSeedAlgorithm}
      data-viz-manim-random-seed-signature={manimEvidenceAttributes?.["data-viz-manim-random-seed-signature"] ?? runtimeDiagnostics.manimRandomSeedSignature}
      data-viz-manim-scene-init-ready={manimEvidenceAttributes?.["data-viz-manim-scene-init-ready"] ?? "false"}
      data-viz-manim-scene-init-camera-ready={manimEvidenceAttributes?.["data-viz-manim-scene-init-camera-ready"] ?? "false"}
      data-viz-manim-scene-init-camera-frame-ready={manimEvidenceAttributes?.["data-viz-manim-scene-init-camera-frame-ready"] ?? "false"}
      data-viz-manim-scene-init-file-writer-ready={manimEvidenceAttributes?.["data-viz-manim-scene-init-file-writer-ready"] ?? "false"}
      data-viz-manim-scene-init-top-level-mobject-count={manimEvidenceAttributes?.["data-viz-manim-scene-init-top-level-mobject-count"] ?? "0"}
      data-viz-manim-scene-init-render-group-count={manimEvidenceAttributes?.["data-viz-manim-scene-init-render-group-count"] ?? "0"}
      data-viz-manim-scene-init-render-group-ids={manimEvidenceAttributes?.["data-viz-manim-scene-init-render-group-ids"] ?? "none"}
      data-viz-manim-scene-init-time-seconds={manimEvidenceAttributes?.["data-viz-manim-scene-init-time-seconds"] ?? "0.000"}
      data-viz-manim-scene-init-num-plays={manimEvidenceAttributes?.["data-viz-manim-scene-init-num-plays"] ?? "0"}
      data-viz-manim-scene-init-undo-count={manimEvidenceAttributes?.["data-viz-manim-scene-init-undo-count"] ?? "0"}
      data-viz-manim-scene-init-redo-count={manimEvidenceAttributes?.["data-viz-manim-scene-init-redo-count"] ?? "0"}
      data-viz-manim-scene-init-random-seed-signature={manimEvidenceAttributes?.["data-viz-manim-scene-init-random-seed-signature"] ?? "none"}
      data-viz-manim-scene-init-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-scene-init-source-contract"] ?? SCENE_INITIALIZATION_SOURCE_CONTRACT
      }
      data-viz-manim-scene-init-source-summary={
        manimEvidenceAttributes?.["data-viz-manim-scene-init-source-summary"] ??
        "Scene.__init__:camera=false:cameraFrame=false:fileWriter=false:mobjects=0:renderGroups=0:time=0.000:numPlays=0:history=0/0"
      }
      data-viz-manim-scene-init-summary={
        manimEvidenceAttributes?.["data-viz-manim-scene-init-summary"] ??
        "scene-init:primitive:ready=false:camera=none:frame=none:writer=false:topLevel=0:renderGroups=0:seed=none"
      }
      data-viz-manim-run-from-beat-checkpoint-count={
        manimScene ? manimRunFromBeatAttributes["data-viz-manim-run-from-beat-checkpoint-count"] : "0"
      }
      data-viz-manim-run-from-beat-checkpoint-invalidates-count={
        manimScene ? manimRunFromBeatAttributes["data-viz-manim-run-from-beat-checkpoint-invalidates-count"] : "0"
      }
      data-viz-manim-run-from-beat-checkpoint-invalidated-keys={
        manimScene ? manimRunFromBeatAttributes["data-viz-manim-run-from-beat-checkpoint-invalidated-keys"] : "none"
      }
      data-viz-manim-run-from-beat-checkpoint-invalidation-summary={
        manimScene
          ? manimRunFromBeatAttributes["data-viz-manim-run-from-beat-checkpoint-invalidation-summary"]
          : "checkpointInvalidation:action=missing-checkpoint:invalidates=0:invalidated=none:retained=none"
      }
      data-viz-manim-run-from-beat-checkpoint-keys={
        manimScene ? manimRunFromBeatAttributes["data-viz-manim-run-from-beat-checkpoint-keys"] : "none"
      }
      data-viz-manim-run-from-beat-checkpoint-policy={
        manimScene ? manimRunFromBeatAttributes["data-viz-manim-run-from-beat-checkpoint-policy"] : SCENE_RUN_FROM_BEAT_CHECKPOINT_POLICY
      }
      data-viz-manim-run-from-beat-checkpoint-retained-keys-after-restore={
        manimScene ? manimRunFromBeatAttributes["data-viz-manim-run-from-beat-checkpoint-retained-keys-after-restore"] : "none"
      }
      data-viz-manim-run-from-beat-checkpoint-restore-action={
        manimScene ? manimRunFromBeatAttributes["data-viz-manim-run-from-beat-checkpoint-restore-action"] : "missing-checkpoint"
      }
      data-viz-manim-run-from-beat-checkpoint-restore-key={
        manimScene ? manimRunFromBeatAttributes["data-viz-manim-run-from-beat-checkpoint-restore-key"] : "none"
      }
      data-viz-manim-run-from-beat-checkpoint-restore-mode={
        manimScene ? manimRunFromBeatAttributes["data-viz-manim-run-from-beat-checkpoint-restore-mode"] : "missing-checkpoint"
      }
      data-viz-manim-run-from-beat-checkpoint-restore-ready={
        manimScene ? manimRunFromBeatAttributes["data-viz-manim-run-from-beat-checkpoint-restore-ready"] : "false"
      }
      data-viz-manim-run-from-beat-checkpoint-summary={
        manimScene
          ? manimRunFromBeatAttributes["data-viz-manim-run-from-beat-checkpoint-summary"]
          : "checkpoint:missing-checkpoint:key=none:count=0:ready=false"
      }
      data-viz-manim-run-from-beat-composition-id={
        manimScene ? manimRunFromBeatAttributes["data-viz-manim-run-from-beat-composition-id"] : "none"
      }
      data-viz-manim-run-from-beat-composition-replay-policy={
        manimScene
          ? manimRunFromBeatAttributes["data-viz-manim-run-from-beat-composition-replay-policy"]
          : SCENE_RUN_FROM_BEAT_COMPOSITION_REPLAY_POLICY
      }
      data-viz-manim-run-from-beat-composition-replay-ready={
        manimScene ? manimRunFromBeatAttributes["data-viz-manim-run-from-beat-composition-replay-ready"] : "false"
      }
      data-viz-manim-run-from-beat-composition-replay-summary={
        manimScene
          ? manimRunFromBeatAttributes["data-viz-manim-run-from-beat-composition-replay-summary"]
          : "composition:ready=false:id=none:type=none:windows=0"
      }
      data-viz-manim-run-from-beat-composition-type={
        manimScene ? manimRunFromBeatAttributes["data-viz-manim-run-from-beat-composition-type"] : "none"
      }
      data-viz-manim-run-from-beat-composition-window-count={
        manimScene ? manimRunFromBeatAttributes["data-viz-manim-run-from-beat-composition-window-count"] : "0"
      }
      data-viz-manim-run-from-beat-composition-window-ids={
        manimScene ? manimRunFromBeatAttributes["data-viz-manim-run-from-beat-composition-window-ids"] : "none"
      }
      data-viz-manim-run-from-beat-composition-window-summary={
        manimScene ? manimRunFromBeatAttributes["data-viz-manim-run-from-beat-composition-window-summary"] : "none"
      }
      data-viz-manim-run-from-beat-elapsed-before={
        manimScene ? manimRunFromBeatAttributes["data-viz-manim-run-from-beat-elapsed-before"] : "0.000"
      }
      data-viz-manim-run-from-beat-final-elapsed={
        manimScene ? manimRunFromBeatAttributes["data-viz-manim-run-from-beat-final-elapsed"] : "0.000"
      }
      data-viz-manim-run-from-beat-index={manimScene ? manimRunFromBeatIndex : -1}
      data-viz-manim-run-from-beat-normalized-index={
        manimScene ? manimRunFromBeatAttributes["data-viz-manim-run-from-beat-normalized-index"] : "-1"
      }
      data-viz-manim-run-from-beat-prepared-count={
        manimScene ? manimRunFromBeatAttributes["data-viz-manim-run-from-beat-prepared-count"] : "0"
      }
      data-viz-manim-run-from-beat-prepared-indices={
        manimScene ? manimRunFromBeatAttributes["data-viz-manim-run-from-beat-prepared-indices"] : "none"
      }
      data-viz-manim-run-from-beat-ready={
        manimScene ? manimRunFromBeatAttributes["data-viz-manim-run-from-beat-ready"] : "false"
      }
      data-viz-manim-run-from-beat-replay-count={
        manimScene ? manimRunFromBeatAttributes["data-viz-manim-run-from-beat-replay-count"] : "0"
      }
      data-viz-manim-run-from-beat-replay-indices={
        manimScene ? manimRunFromBeatAttributes["data-viz-manim-run-from-beat-replay-indices"] : "none"
      }
      data-viz-manim-run-from-beat-replay-policy={
        manimScene ? manimRunFromBeatAttributes["data-viz-manim-run-from-beat-replay-policy"] : SCENE_RUN_FROM_BEAT_REPLAY_POLICY
      }
      data-viz-manim-run-from-beat-requested-index={
        manimScene ? manimRunFromBeatAttributes["data-viz-manim-run-from-beat-requested-index"] : "-1"
      }
      data-viz-manim-run-from-beat-source-contract={
        manimScene ? manimRunFromBeatAttributes["data-viz-manim-run-from-beat-source-contract"] : SCENE_RUN_FROM_BEAT_SOURCE_CONTRACT
      }
      data-viz-manim-run-from-beat-summary={
        manimScene
          ? manimRunFromBeatAttributes["data-viz-manim-run-from-beat-summary"]
          : "runFromBeat:ready=false:requested=-1:normalized=-1:prepared=none:replay=none:elapsed=0.000:final=0.000"
      }
      data-viz-manim-run-from-beat-total-play-count={
        manimScene ? manimRunFromBeatAttributes["data-viz-manim-run-from-beat-total-play-count"] : "0"
      }
      data-viz-manim-scene-export-ready={manimSceneExportAttributes?.["data-viz-manim-scene-export-ready"] ?? "false"}
      data-viz-manim-scene-export-signature={manimSceneExportAttributes?.["data-viz-manim-scene-export-signature"] ?? "none"}
      data-viz-manim-scene-export-object-count={manimSceneExportAttributes?.["data-viz-manim-scene-export-object-count"] ?? "0"}
      data-viz-manim-scene-export-beat-count={manimSceneExportAttributes?.["data-viz-manim-scene-export-beat-count"] ?? "0"}
      data-viz-manim-scene-export-formula-token-count={manimSceneExportAttributes?.["data-viz-manim-scene-export-formula-token-count"] ?? "0"}
      data-viz-manim-scene-export-semantic-binding-count={manimSceneExportAttributes?.["data-viz-manim-scene-export-semantic-binding-count"] ?? "0"}
      data-viz-manim-scene-export-source-contract={
        manimSceneExportAttributes?.["data-viz-manim-scene-export-source-contract"] ??
        manimEvidenceAttributes?.["data-viz-manim-scene-export-source-contract"] ??
        SCENE_EXPORT_SOURCE_CONTRACT
      }
      data-viz-manim-scene-run-ready={manimSceneRunLifecycleAttributes?.["data-viz-manim-scene-run-ready"] ?? "false"}
      data-viz-manim-scene-run-signature={manimSceneRunLifecycleAttributes?.["data-viz-manim-scene-run-signature"] ?? "none"}
      data-viz-manim-scene-run-scene-id={manimSceneRunLifecycleAttributes?.["data-viz-manim-scene-run-scene-id"] ?? "none"}
      data-viz-manim-scene-run-scene-signature={manimSceneRunLifecycleAttributes?.["data-viz-manim-scene-run-scene-signature"] ?? "none"}
      data-viz-manim-scene-run-setup-complete={manimSceneRunLifecycleAttributes?.["data-viz-manim-scene-run-setup-complete"] ?? "false"}
      data-viz-manim-scene-run-setup-actions={manimSceneRunLifecycleAttributes?.["data-viz-manim-scene-run-setup-actions"] ?? "pending"}
      data-viz-manim-scene-run-active-phase={manimSceneRunLifecycleAttributes?.["data-viz-manim-scene-run-active-phase"] ?? "primitive"}
      data-viz-manim-scene-run-active-phase-index={manimSceneRunLifecycleAttributes?.["data-viz-manim-scene-run-active-phase-index"] ?? "-1"}
      data-viz-manim-scene-run-construct-actions={manimSceneRunLifecycleAttributes?.["data-viz-manim-scene-run-construct-actions"] ?? "pending"}
      data-viz-manim-scene-run-construct-binding-count={manimSceneRunLifecycleAttributes?.["data-viz-manim-scene-run-construct-binding-count"] ?? "0"}
      data-viz-manim-scene-run-construct-complete={manimSceneRunLifecycleAttributes?.["data-viz-manim-scene-run-construct-complete"] ?? "false"}
      data-viz-manim-scene-run-construct-formula-count={manimSceneRunLifecycleAttributes?.["data-viz-manim-scene-run-construct-formula-count"] ?? "0"}
      data-viz-manim-scene-run-construct-object-count={manimSceneRunLifecycleAttributes?.["data-viz-manim-scene-run-construct-object-count"] ?? "0"}
      data-viz-manim-scene-run-phase-count={manimSceneRunLifecycleAttributes?.["data-viz-manim-scene-run-phase-count"] ?? "0"}
      data-viz-manim-scene-run-phase-status-summary={
        manimSceneRunLifecycleAttributes?.["data-viz-manim-scene-run-phase-status-summary"] ??
        "setup=pending,construct=pending,play=pending,interact=pending,tearDown=pending"
      }
      data-viz-manim-scene-run-elapsed-seconds={manimSceneRunLifecycleAttributes?.["data-viz-manim-scene-run-elapsed-seconds"] ?? "0.000"}
      data-viz-manim-scene-run-play-duration={manimSceneRunLifecycleAttributes?.["data-viz-manim-scene-run-play-duration"] ?? "0.000"}
      data-viz-manim-scene-run-total-duration={manimSceneRunLifecycleAttributes?.["data-viz-manim-scene-run-total-duration"] ?? "0.000"}
      data-viz-manim-scene-run-source-contract={manimSceneRunLifecycleAttributes?.["data-viz-manim-scene-run-source-contract"] ?? SCENE_RUN_LIFECYCLE_SOURCE_CONTRACT}
      data-viz-manim-scene-run-interactive={manimSceneRunLifecycleAttributes?.["data-viz-manim-scene-run-interactive"] ?? "false"}
      data-viz-manim-scene-run-num-plays={manimSceneRunLifecycleAttributes?.["data-viz-manim-scene-run-num-plays"] ?? "0"}
      data-viz-manim-scene-run-call-order={manimSceneRunLifecycleAttributes?.["data-viz-manim-scene-run-call-order"] ?? "none"}
      data-viz-manim-scene-run-skipped-phase-count={
        manimSceneRunLifecycleAttributes?.["data-viz-manim-scene-run-skipped-phase-count"] ?? "0"
      }
      data-viz-manim-scene-run-skipped-phase-ids={
        manimSceneRunLifecycleAttributes?.["data-viz-manim-scene-run-skipped-phase-ids"] ?? "none"
      }
      data-viz-manim-scene-run-teardown-ready={manimSceneRunLifecycleAttributes?.["data-viz-manim-scene-run-teardown-ready"] ?? "false"}
      data-viz-manim-scene-run-teardown-actions={manimSceneRunLifecycleAttributes?.["data-viz-manim-scene-run-teardown-actions"] ?? "pending"}
      data-viz-manim-scene-run-summary={
        manimSceneRunLifecycleAttributes?.["data-viz-manim-scene-run-summary"] ?? "primitive:phase=primitive:interactive=false:teardown=false"
      }
      data-viz-manim-scene-run-interact-active-phase={
        manimSceneRunInteractBridgeAttributes?.["data-viz-manim-scene-run-interact-active-phase"] ?? "primitive"
      }
      data-viz-manim-scene-run-interact-call-order={
        manimSceneRunInteractBridgeAttributes?.["data-viz-manim-scene-run-interact-call-order"] ?? "none"
      }
      data-viz-manim-scene-run-interact-calls-interact={
        manimSceneRunInteractBridgeAttributes?.["data-viz-manim-scene-run-interact-calls-interact"] ?? "false"
      }
      data-viz-manim-scene-run-interact-enabled={
        manimSceneRunInteractBridgeAttributes?.["data-viz-manim-scene-run-interact-enabled"] ?? "false"
      }
      data-viz-manim-scene-run-interact-loop-frame-count={
        manimSceneRunInteractBridgeAttributes?.["data-viz-manim-scene-run-interact-loop-frame-count"] ?? "0"
      }
      data-viz-manim-scene-run-interact-loop-has-window={
        manimSceneRunInteractBridgeAttributes?.["data-viz-manim-scene-run-interact-loop-has-window"] ?? "false"
      }
      data-viz-manim-scene-run-interact-ready-for-teardown={
        manimSceneRunInteractBridgeAttributes?.["data-viz-manim-scene-run-interact-ready-for-teardown"] ?? "false"
      }
      data-viz-manim-scene-run-interact-scene-id={
        manimSceneRunInteractBridgeAttributes?.["data-viz-manim-scene-run-interact-scene-id"] ?? "none"
      }
      data-viz-manim-scene-run-interact-source-contract={
        manimSceneRunInteractBridgeAttributes?.["data-viz-manim-scene-run-interact-source-contract"] ??
        SCENE_RUN_INTERACT_BRIDGE_SOURCE_CONTRACT
      }
      data-viz-manim-scene-run-interact-state-policy={
        manimSceneRunInteractBridgeAttributes?.["data-viz-manim-scene-run-interact-state-policy"] ??
        SCENE_INTERACT_LOOP_STATE_POLICY
      }
      data-viz-manim-scene-run-interact-status={
        manimSceneRunInteractBridgeAttributes?.["data-viz-manim-scene-run-interact-status"] ?? "waiting-for-interact"
      }
      data-viz-manim-scene-run-interact-summary={
        manimSceneRunInteractBridgeAttributes?.["data-viz-manim-scene-run-interact-summary"] ??
        "scene-run-interact:primitive:phase=primitive:termination=no-window:status=waiting-for-interact:teardown=false"
      }
      data-viz-manim-scene-run-interact-termination={
        manimSceneRunInteractBridgeAttributes?.["data-viz-manim-scene-run-interact-termination"] ?? "no-window"
      }
      data-viz-manim-scene-run-interact-update-frame-count={
        manimSceneRunInteractBridgeAttributes?.["data-viz-manim-scene-run-interact-update-frame-count"] ?? "0"
      }
      data-viz-manim-scene-run-file-writer-finish-call-order={
        manimSceneRunFileWriterFinishBridgeAttributes?.["data-viz-manim-scene-run-file-writer-finish-call-order"] ?? "none"
      }
      data-viz-manim-scene-run-file-writer-finish-combine-action={
        manimSceneRunFileWriterFinishBridgeAttributes?.["data-viz-manim-scene-run-file-writer-finish-combine-action"] ?? "skip-movie"
      }
      data-viz-manim-scene-run-file-writer-finish-concat-manifest-path={
        manimSceneRunFileWriterFinishBridgeAttributes?.["data-viz-manim-scene-run-file-writer-finish-concat-manifest-path"] ?? "none"
      }
      data-viz-manim-scene-run-file-writer-finish-final-path={
        manimSceneRunFileWriterFinishBridgeAttributes?.["data-viz-manim-scene-run-file-writer-finish-final-path"] ?? ""
      }
      data-viz-manim-scene-run-file-writer-finish-partial-count={
        manimSceneRunFileWriterFinishBridgeAttributes?.["data-viz-manim-scene-run-file-writer-finish-partial-count"] ?? "0"
      }
      data-viz-manim-scene-run-file-writer-finish-ready={
        manimSceneRunFileWriterFinishBridgeAttributes?.["data-viz-manim-scene-run-file-writer-finish-ready"] ?? "false"
      }
      data-viz-manim-scene-run-file-writer-finish-required={
        manimSceneRunFileWriterFinishBridgeAttributes?.["data-viz-manim-scene-run-file-writer-finish-required"] ?? "false"
      }
      data-viz-manim-scene-run-file-writer-finish-scene-id={
        manimSceneRunFileWriterFinishBridgeAttributes?.["data-viz-manim-scene-run-file-writer-finish-scene-id"] ?? "none"
      }
      data-viz-manim-scene-run-file-writer-finish-source-contract={
        manimSceneRunFileWriterFinishBridgeAttributes?.["data-viz-manim-scene-run-file-writer-finish-source-contract"] ??
        manimEvidenceAttributes?.["data-viz-manim-scene-run-file-writer-finish-source-contract"] ??
        SCENE_RUN_FILE_WRITER_FINISH_BRIDGE_SOURCE_CONTRACT
      }
      data-viz-manim-scene-run-file-writer-finish-status={
        manimSceneRunFileWriterFinishBridgeAttributes?.["data-viz-manim-scene-run-file-writer-finish-status"] ?? "waiting-for-tear-down"
      }
      data-viz-manim-scene-run-file-writer-finish-summary={
        manimSceneRunFileWriterFinishBridgeAttributes?.["data-viz-manim-scene-run-file-writer-finish-summary"] ??
        "scene-run-file-writer-finish:primitive:teardown=false:combine=skip-movie:status=waiting-for-tear-down:ready=false"
      }
      data-viz-manim-scene-run-file-writer-finish-teardown-actions={
        manimSceneRunFileWriterFinishBridgeAttributes?.["data-viz-manim-scene-run-file-writer-finish-teardown-actions"] ?? "pending"
      }
      data-viz-manim-scene-run-file-writer-finish-teardown-ready={
        manimSceneRunFileWriterFinishBridgeAttributes?.["data-viz-manim-scene-run-file-writer-finish-teardown-ready"] ?? "false"
      }
      data-viz-manim-scene-selector-approved-count={manimScene ? manimSceneSelectorAttributes["data-viz-manim-scene-selector-approved-count"] : "0"}
      data-viz-manim-scene-selector-count={manimScene ? manimSceneSelectorAttributes["data-viz-manim-scene-selector-count"] : "0"}
      data-viz-manim-scene-selector-family-ids={manimScene ? manimSceneSelectorAttributes["data-viz-manim-scene-selector-family-ids"] : "none"}
      data-viz-manim-scene-selector-scene-ids={manimScene ? manimSceneSelectorAttributes["data-viz-manim-scene-selector-scene-ids"] : "none"}
      data-viz-manim-scene-selector-selected-family-id={manimScene ? manimSceneSelectorAttributes["data-viz-manim-scene-selector-selected-family-id"] : "none"}
      data-viz-manim-scene-selector-selected-scene-id={manimScene ? manimSceneSelectorAttributes["data-viz-manim-scene-selector-selected-scene-id"] : "none"}
      data-viz-manim-scene-selector-summary={
        manimScene
          ? manimSceneSelectorAttributes["data-viz-manim-scene-selector-summary"]
          : "scenes=0;approved=0;selected=none;family=none;families=none;sceneIds=none"
      }
      data-viz-manim-skip-animations={manimScene && manimSkipAnimations ? "true" : "false"}
      data-viz-manim-scrub-progress={manimScrubProgress.toFixed(3)}
      data-viz-manim-smoke-hook-ready={manimSmokeHookAttributes?.["data-viz-manim-smoke-hook-ready"] ?? "false"}
      data-viz-manim-smoke-hook-signature={manimSmokeHookAttributes?.["data-viz-manim-smoke-hook-signature"] ?? "none"}
      data-viz-manim-smoke-hook-scene-id={manimSmokeHookAttributes?.["data-viz-manim-smoke-hook-scene-id"] ?? "none"}
      data-viz-manim-smoke-hook-selector-count={manimSmokeHookAttributes?.["data-viz-manim-smoke-hook-selector-count"] ?? "0"}
      data-viz-manim-smoke-hook-attribute-count={manimSmokeHookAttributes?.["data-viz-manim-smoke-hook-attribute-count"] ?? "0"}
      data-viz-manim-smoke-hook-converted-selector-count={
        manimSmokeHookAttributes?.["data-viz-manim-smoke-hook-converted-selector-count"] ?? "0"
      }
      data-viz-manim-smoke-hook-selector-conversion-summary={
        manimSmokeHookAttributes?.["data-viz-manim-smoke-hook-selector-conversion-summary"] ?? "none"
      }
      data-viz-manim-smoke-hook-json-payload-count={manimSmokeHookAttributes?.["data-viz-manim-smoke-hook-json-payload-count"] ?? "0"}
      data-viz-manim-smoke-hook-source-contract={manimSmokeHookAttributes?.["data-viz-manim-smoke-hook-source-contract"] ?? SCENE_SMOKE_HOOK_SOURCE_CONTRACT}
      data-viz-manim-smoke-hook-summary={
        manimSmokeHookAttributes?.["data-viz-manim-smoke-hook-summary"] ?? "smoke:primitive:selectors=0:attributes=0:payloads=0"
      }
      data-viz-manim-tex-cache-ready={manimTexCacheAttributes?.["data-viz-manim-tex-cache-ready"] ?? "false"}
      data-viz-manim-tex-cache-signature={manimTexCacheAttributes?.["data-viz-manim-tex-cache-signature"] ?? "none"}
      data-viz-manim-tex-cache-scene-id={manimTexCacheAttributes?.["data-viz-manim-tex-cache-scene-id"] ?? "none"}
      data-viz-manim-tex-cache-formula-count={manimTexCacheAttributes?.["data-viz-manim-tex-cache-formula-count"] ?? "0"}
      data-viz-manim-tex-cache-token-count={manimTexCacheAttributes?.["data-viz-manim-tex-cache-token-count"] ?? "0"}
      data-viz-manim-tex-cache-isolation-entry-count={manimTexCacheAttributes?.["data-viz-manim-tex-cache-isolation-entry-count"] ?? "0"}
      data-viz-manim-tex-cache-svg-morph-plan-count={manimTexCacheAttributes?.["data-viz-manim-tex-cache-svg-morph-plan-count"] ?? "0"}
      data-viz-manim-tex-cache-entry-count={manimTexCacheAttributes?.["data-viz-manim-tex-cache-entry-count"] ?? "0"}
      data-viz-manim-tex-cache-source-contract={
        manimTexCacheAttributes?.["data-viz-manim-tex-cache-source-contract"] ??
        manimEvidenceAttributes?.["data-viz-manim-tex-cache-source-contract"] ??
        TEX_CACHE_MANIFEST_SOURCE_CONTRACT
      }
      data-viz-manim-tex-cache-summary={
        manimTexCacheAttributes?.["data-viz-manim-tex-cache-summary"] ?? "tex-cache:primitive:formulas=0:tokens=0:entries=0:ready=false"
      }
      data-viz-manim-tex-compile-cache-hit-eligible-count={
        manimTexCompileAttributes?.["data-viz-manim-tex-compile-cache-hit-eligible-count"] ?? "0"
      }
      data-viz-manim-tex-compile-cache-key-count={
        manimTexCompileAttributes?.["data-viz-manim-tex-compile-cache-key-count"] ?? "0"
      }
      data-viz-manim-tex-compile-command-count={manimTexCompileAttributes?.["data-viz-manim-tex-compile-command-count"] ?? "0"}
      data-viz-manim-tex-compile-document-count={manimTexCompileAttributes?.["data-viz-manim-tex-compile-document-count"] ?? "0"}
      data-viz-manim-tex-compile-document-source-length-range={
        manimTexCompileAttributes?.["data-viz-manim-tex-compile-document-source-length-range"] ?? "none"
      }
      data-viz-manim-tex-compile-document-template-count={
        manimTexCompileAttributes?.["data-viz-manim-tex-compile-document-template-count"] ?? "0"
      }
      data-viz-manim-tex-compile-dvisvgm-count={manimTexCompileAttributes?.["data-viz-manim-tex-compile-dvisvgm-count"] ?? "0"}
      data-viz-manim-tex-compile-engine-ids={manimTexCompileAttributes?.["data-viz-manim-tex-compile-engine-ids"] ?? "none"}
      data-viz-manim-tex-compile-formula-count={manimTexCompileAttributes?.["data-viz-manim-tex-compile-formula-count"] ?? "0"}
      data-viz-manim-tex-compile-intermediate-extensions={
        manimTexCompileAttributes?.["data-viz-manim-tex-compile-intermediate-extensions"] ?? "none"
      }
      data-viz-manim-tex-compile-source-contract={
        manimTexCompileAttributes?.["data-viz-manim-tex-compile-source-contract"] ??
        manimEvidenceAttributes?.["data-viz-manim-tex-compile-source-contract"] ??
        TEX_COMPILE_PIPELINE_SOURCE_CONTRACT
      }
      data-viz-manim-tex-compile-source-summary={
        manimTexCompileAttributes?.["data-viz-manim-tex-compile-source-summary"] ??
        "latex_to_svg:documents=0:templates=0:engine=none:intermediate=none:dvisvgm=0:cache=0"
      }
      data-viz-manim-tex-compile-step-sequence={manimTexCompileAttributes?.["data-viz-manim-tex-compile-step-sequence"] ?? "none"}
      data-viz-manim-tex-compile-svg-output-count={
        manimTexCompileAttributes?.["data-viz-manim-tex-compile-svg-output-count"] ?? "0"
      }
      data-viz-manim-tex-compile-summary={
        manimTexCompileAttributes?.["data-viz-manim-tex-compile-summary"] ??
        "tex-compile:primitive:formulas=0:documents=0:commands=0:engine=none:dvisvgm=0:cache=0"
      }
      data-viz-manim-tex-color-map-scene-id={manimTexColorMapAttributes?.["data-viz-manim-tex-color-map-scene-id"] ?? "none"}
      data-viz-manim-tex-color-map-entry-count={manimTexColorMapAttributes?.["data-viz-manim-tex-color-map-entry-count"] ?? "0"}
      data-viz-manim-tex-color-map-token-count={manimTexColorMapAttributes?.["data-viz-manim-tex-color-map-token-count"] ?? "0"}
      data-viz-manim-tex-color-map-bound-token-count={manimTexColorMapAttributes?.["data-viz-manim-tex-color-map-bound-token-count"] ?? "0"}
      data-viz-manim-tex-color-map-source-contract={
        manimTexColorMapAttributes?.["data-viz-manim-tex-color-map-source-contract"] ?? TEX_COLOR_MAP_SOURCE_CONTRACT
      }
      data-viz-manim-tex-color-map-binding-source-count={
        manimTexColorMapAttributes?.["data-viz-manim-tex-color-map-binding-source-count"] ?? "0"
      }
      data-viz-manim-tex-color-map-tex-isolation-source-count={
        manimTexColorMapAttributes?.["data-viz-manim-tex-color-map-tex-isolation-source-count"] ?? "0"
      }
      data-viz-manim-tex-color-map-reference-source-count={
        manimTexColorMapAttributes?.["data-viz-manim-tex-color-map-reference-source-count"] ?? "0"
      }
      data-viz-manim-tex-color-map-source-summary={
        manimTexColorMapAttributes?.["data-viz-manim-tex-color-map-source-summary"] ??
        "binding=0:tex-isolation=0:reference=0"
      }
      data-viz-manim-tex-color-map-tex-isolated-token-count={
        manimTexColorMapAttributes?.["data-viz-manim-tex-color-map-tex-isolated-token-count"] ?? "0"
      }
      data-viz-manim-tex-color-map-tex-isolation-selector-count={
        manimTexColorMapAttributes?.["data-viz-manim-tex-color-map-tex-isolation-selector-count"] ?? "0"
      }
      data-viz-manim-tex-color-map-unmatched-token-count={
        manimTexColorMapAttributes?.["data-viz-manim-tex-color-map-unmatched-token-count"] ?? "0"
      }
      data-viz-manim-tex-color-map-unmatched-selector-count={
        manimTexColorMapAttributes?.["data-viz-manim-tex-color-map-unmatched-selector-count"] ?? "0"
      }
      data-viz-manim-tex-color-map-unmatched-selectors={
        manimTexColorMapAttributes?.["data-viz-manim-tex-color-map-unmatched-selectors"] ?? "none"
      }
      data-viz-manim-tex-color-map-role-count={manimTexColorMapAttributes?.["data-viz-manim-tex-color-map-role-count"] ?? "0"}
      data-viz-manim-tex-color-map-summary={
        manimTexColorMapAttributes?.["data-viz-manim-tex-color-map-summary"] ??
        "tex-color-map:primitive:entries=0:tokens=0:bound=0:unmatched=0:roles=none"
      }
      data-viz-manim-tex-colorized-colored-character-count={
        manimEvidenceAttributes?.["data-viz-manim-tex-colorized-colored-character-count"] ?? "0"
      }
      data-viz-manim-tex-colorized-colored-token-count={
        manimEvidenceAttributes?.["data-viz-manim-tex-colorized-colored-token-count"] ?? "0"
      }
      data-viz-manim-tex-colorized-colored-token-ids={
        manimEvidenceAttributes?.["data-viz-manim-tex-colorized-colored-token-ids"] ?? "none"
      }
      data-viz-manim-tex-colorized-coverage-ratio={
        manimEvidenceAttributes?.["data-viz-manim-tex-colorized-coverage-ratio"] ?? "0.000"
      }
      data-viz-manim-tex-colorized-coverage-summary={
        manimEvidenceAttributes?.["data-viz-manim-tex-colorized-coverage-summary"] ??
        "coverage:colored=0:source=0:ratio=0.000:order=none"
      }
      data-viz-manim-tex-colorized-formula-id={
        manimEvidenceAttributes?.["data-viz-manim-tex-colorized-formula-id"] ?? "none"
      }
      data-viz-manim-tex-colorized-interval-order-summary={
        manimEvidenceAttributes?.["data-viz-manim-tex-colorized-interval-order-summary"] ?? "none"
      }
      data-viz-manim-tex-colorized-interval-summary={
        manimEvidenceAttributes?.["data-viz-manim-tex-colorized-interval-summary"] ?? "none"
      }
      data-viz-manim-tex-colorized-role-summary={
        manimEvidenceAttributes?.["data-viz-manim-tex-colorized-role-summary"] ?? "none"
      }
      data-viz-manim-tex-colorized-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-tex-colorized-source-contract"] ?? TEX_COLORIZED_FORMULA_SOURCE_CONTRACT
      }
      data-viz-manim-tex-colorized-source-character-count={
        manimEvidenceAttributes?.["data-viz-manim-tex-colorized-source-character-count"] ?? "0"
      }
      data-viz-manim-tex-colorized-summary={
        manimEvidenceAttributes?.["data-viz-manim-tex-colorized-summary"] ??
        "tex-colorized-formula:none:tokens=0:colored=0:uncolored=0:roles=none"
      }
      data-viz-manim-tex-colorized-token-count={
        manimEvidenceAttributes?.["data-viz-manim-tex-colorized-token-count"] ?? "0"
      }
      data-viz-manim-tex-colorized-uncolored-token-count={
        manimEvidenceAttributes?.["data-viz-manim-tex-colorized-uncolored-token-count"] ?? "0"
      }
      data-viz-manim-tex-colorized-uncolored-token-ids={
        manimEvidenceAttributes?.["data-viz-manim-tex-colorized-uncolored-token-ids"] ?? "none"
      }
      data-viz-manim-tex-isolation-scene-id={manimTexIsolationAttributes?.["data-viz-manim-tex-isolation-scene-id"] ?? "none"}
      data-viz-manim-tex-isolation-formula-count={manimTexIsolationAttributes?.["data-viz-manim-tex-isolation-formula-count"] ?? "0"}
      data-viz-manim-tex-isolation-token-count={manimTexIsolationAttributes?.["data-viz-manim-tex-isolation-token-count"] ?? "0"}
      data-viz-manim-tex-isolation-isolated-token-count={
        manimTexIsolationAttributes?.["data-viz-manim-tex-isolation-isolated-token-count"] ?? "0"
      }
      data-viz-manim-tex-isolation-selector-count={manimTexIsolationAttributes?.["data-viz-manim-tex-isolation-selector-count"] ?? "0"}
      data-viz-manim-tex-isolation-selector-summary={
        manimTexIsolationAttributes?.["data-viz-manim-tex-isolation-selector-summary"] ?? "none"
      }
      data-viz-manim-tex-isolation-unmatched-selector-count={
        manimTexIsolationAttributes?.["data-viz-manim-tex-isolation-unmatched-selector-count"] ?? "0"
      }
      data-viz-manim-tex-isolation-unmatched-selectors={
        manimTexIsolationAttributes?.["data-viz-manim-tex-isolation-unmatched-selectors"] ?? "none"
      }
      data-viz-manim-tex-isolation-cache-key-count={manimTexIsolationAttributes?.["data-viz-manim-tex-isolation-cache-key-count"] ?? "0"}
      data-viz-manim-tex-isolation-occurrence-summary={
        manimTexIsolationAttributes?.["data-viz-manim-tex-isolation-occurrence-summary"] ?? "none"
      }
      data-viz-manim-tex-isolation-source-contract={
        manimTexIsolationAttributes?.["data-viz-manim-tex-isolation-source-contract"] ?? TEX_ISOLATION_SOURCE_CONTRACT
      }
      data-viz-manim-tex-isolation-summary={
        manimTexIsolationAttributes?.["data-viz-manim-tex-isolation-summary"] ??
        "tex-isolation:primitive:formulas=0:tokens=0:isolated=0:selectors=none:unmatched=0"
      }
      data-viz-manim-svg-morph-count={manimFormulaSvgMorphAttributes?.["data-viz-manim-svg-morph-count"] ?? "0"}
      data-viz-manim-svg-morph-compatible-count={manimFormulaSvgMorphAttributes?.["data-viz-manim-svg-morph-compatible-count"] ?? "0"}
      data-viz-manim-svg-morph-issue-count={manimFormulaSvgMorphAttributes?.["data-viz-manim-svg-morph-issue-count"] ?? "0"}
      data-viz-manim-svg-morph-command-count={manimFormulaSvgMorphAttributes?.["data-viz-manim-svg-morph-command-count"] ?? "0"}
      data-viz-manim-svg-morph-cache-key-count={manimFormulaSvgMorphAttributes?.["data-viz-manim-svg-morph-cache-key-count"] ?? "0"}
      data-viz-manim-svg-morph-ids={manimFormulaSvgMorphAttributes?.["data-viz-manim-svg-morph-ids"] ?? "none"}
      data-viz-manim-svg-morph-progress={manimFormulaSvgMorphAttributes?.["data-viz-manim-svg-morph-progress"] ?? "0.000"}
      data-viz-manim-svg-morph-frame-path-preview={manimFormulaSvgMorphAttributes?.["data-viz-manim-svg-morph-frame-path-preview"] ?? "none"}
      data-viz-manim-svg-morph-issue-summary={manimFormulaSvgMorphAttributes?.["data-viz-manim-svg-morph-issue-summary"] ?? "none"}
      data-viz-manim-svg-morph-source-contract={
        manimFormulaSvgMorphAttributes?.["data-viz-manim-svg-morph-source-contract"] ?? SVG_PATH_MORPH_SOURCE_CONTRACT
      }
      data-viz-manim-svg-morph-summary={
        manimFormulaSvgMorphAttributes?.["data-viz-manim-svg-morph-summary"] ??
        "svg-morph:primitive:morphs=0:compatible=0:issues=0:commands=0:progress=0.000"
      }
      data-viz-manim-svg-morph-runtime-compatible-frame-count={
        manimFormulaSvgMorphRuntimeAttributes?.["data-viz-manim-svg-morph-runtime-compatible-frame-count"] ?? "0"
      }
      data-viz-manim-svg-morph-runtime-formula-id={
        manimFormulaSvgMorphRuntimeAttributes?.["data-viz-manim-svg-morph-runtime-formula-id"] ?? "none"
      }
      data-viz-manim-svg-morph-runtime-frame-count={manimFormulaSvgMorphRuntimeAttributes?.["data-viz-manim-svg-morph-runtime-frame-count"] ?? "0"}
      data-viz-manim-svg-morph-runtime-frame-ids={manimFormulaSvgMorphRuntimeAttributes?.["data-viz-manim-svg-morph-runtime-frame-ids"] ?? "none"}
      data-viz-manim-svg-morph-runtime-frame-path-preview={
        manimFormulaSvgMorphRuntimeAttributes?.["data-viz-manim-svg-morph-runtime-frame-path-preview"] ?? "none"
      }
      data-viz-manim-svg-morph-runtime-issue-count={manimFormulaSvgMorphRuntimeAttributes?.["data-viz-manim-svg-morph-runtime-issue-count"] ?? "0"}
      data-viz-manim-svg-morph-runtime-progress={manimFormulaSvgMorphRuntimeAttributes?.["data-viz-manim-svg-morph-runtime-progress"] ?? "0.000"}
      data-viz-manim-svg-morph-runtime-scene-id={manimFormulaSvgMorphRuntimeAttributes?.["data-viz-manim-svg-morph-runtime-scene-id"] ?? "primitive"}
      data-viz-manim-svg-morph-runtime-source-contract={
        manimFormulaSvgMorphRuntimeAttributes?.["data-viz-manim-svg-morph-runtime-source-contract"] ??
        FORMULA_SVG_MORPH_RUNTIME_SOURCE_CONTRACT
      }
      data-viz-manim-svg-morph-runtime-summary={
        manimFormulaSvgMorphRuntimeAttributes?.["data-viz-manim-svg-morph-runtime-summary"] ??
        "svg-morph-runtime:primitive:formula=none:frames=0:compatible=0:issues=0:progress=0.000"
      }
      data-viz-manim-state-snapshot-ready={manimStateSnapshotAttributes?.["data-viz-manim-state-snapshot-ready"] ?? "false"}
      data-viz-manim-state-snapshot-signature={manimStateSnapshotAttributes?.["data-viz-manim-state-snapshot-signature"] ?? "none"}
      data-viz-manim-state-snapshot-scene-id={manimStateSnapshotAttributes?.["data-viz-manim-state-snapshot-scene-id"] ?? "none"}
      data-viz-manim-state-snapshot-elapsed-seconds={manimStateSnapshotAttributes?.["data-viz-manim-state-snapshot-elapsed-seconds"] ?? "0.000"}
      data-viz-manim-state-snapshot-frame-index={manimStateSnapshotAttributes?.["data-viz-manim-state-snapshot-frame-index"] ?? "0"}
      data-viz-manim-state-snapshot-active-step={manimStateSnapshotAttributes?.["data-viz-manim-state-snapshot-active-step"] ?? "none"}
      data-viz-manim-state-snapshot-camera-shot={manimStateSnapshotAttributes?.["data-viz-manim-state-snapshot-camera-shot"] ?? "default"}
      data-viz-manim-state-snapshot-checkpoint-count={manimStateSnapshotAttributes?.["data-viz-manim-state-snapshot-checkpoint-count"] ?? "0"}
      data-viz-manim-state-snapshot-history-dropped-undo-count={
        manimStateSnapshotAttributes?.["data-viz-manim-state-snapshot-history-dropped-undo-count"] ?? "0"
      }
      data-viz-manim-state-snapshot-history-max-undo-entries={
        manimStateSnapshotAttributes?.["data-viz-manim-state-snapshot-history-max-undo-entries"] ?? "0"
      }
      data-viz-manim-state-snapshot-history-revision={manimStateSnapshotAttributes?.["data-viz-manim-state-snapshot-history-revision"] ?? "0"}
      data-viz-manim-state-snapshot-object-ids={manimStateSnapshotAttributes?.["data-viz-manim-state-snapshot-object-ids"] ?? "none"}
      data-viz-manim-state-snapshot-root-ids={manimStateSnapshotAttributes?.["data-viz-manim-state-snapshot-root-ids"] ?? "none"}
      data-viz-manim-state-snapshot-family-root-ids={
        manimStateSnapshotAttributes?.["data-viz-manim-state-snapshot-family-root-ids"] ?? "none"
      }
      data-viz-manim-state-snapshot-object-identity-summary={
        manimStateSnapshotAttributes?.["data-viz-manim-state-snapshot-object-identity-summary"] ?? "objects=none;roots=none;families=none"
      }
      data-viz-manim-state-snapshot-source-contract={
        manimStateSnapshotAttributes?.["data-viz-manim-state-snapshot-source-contract"] ??
        manimEvidenceAttributes?.["data-viz-manim-state-snapshot-source-contract"] ??
        SCENE_STATE_SNAPSHOT_SOURCE_CONTRACT
      }
      data-viz-manim-state-snapshot-summary={
        manimStateSnapshotAttributes?.["data-viz-manim-state-snapshot-summary"] ?? "snapshot:primitive:none:camera=default:elapsed=0.000:checkpoints=0:history=0"
      }
      data-viz-manim-total-duration={manimTotalDuration.toFixed(3)}
      data-viz-manim-transform-step-count={manimEvidenceAttributes?.["data-viz-manim-transform-step-count"] ?? runtimeDiagnostics.manimTransformStepCount}
      data-viz-manim-transform-path-plan-count={
        manimEvidenceAttributes?.["data-viz-manim-transform-path-plan-count"] ?? runtimeDiagnostics.manimTransformPathPlanCount
      }
      data-viz-manim-transform-path-authored-count={
        manimEvidenceAttributes?.["data-viz-manim-transform-path-authored-count"] ?? runtimeDiagnostics.manimTransformPathAuthoredCount
      }
      data-viz-manim-transform-path-arc-count={
        manimEvidenceAttributes?.["data-viz-manim-transform-path-arc-count"] ?? runtimeDiagnostics.manimTransformPathArcCount
      }
      data-viz-manim-transform-path-arc-angle-range={
        manimEvidenceAttributes?.["data-viz-manim-transform-path-arc-angle-range"] ?? runtimeDiagnostics.manimTransformPathArcAngleRange
      }
      data-viz-manim-transform-path-arc-axis-summary={
        manimEvidenceAttributes?.["data-viz-manim-transform-path-arc-axis-summary"] ?? runtimeDiagnostics.manimTransformPathArcAxisSummary
      }
      data-viz-manim-transform-path-arc-midpoint-deviation-range={
        manimEvidenceAttributes?.["data-viz-manim-transform-path-arc-midpoint-deviation-range"] ??
        runtimeDiagnostics.manimTransformPathArcMidpointDeviationRange
      }
      data-viz-manim-transform-path-degenerate-arc-count={
        manimEvidenceAttributes?.["data-viz-manim-transform-path-degenerate-arc-count"] ??
        runtimeDiagnostics.manimTransformPathDegenerateArcCount
      }
      data-viz-manim-transform-path-midpoint-deviation-summary={
        manimEvidenceAttributes?.["data-viz-manim-transform-path-midpoint-deviation-summary"] ??
        runtimeDiagnostics.manimTransformPathMidpointDeviationSummary
      }
      data-viz-manim-transform-path-straight-count={
        manimEvidenceAttributes?.["data-viz-manim-transform-path-straight-count"] ?? runtimeDiagnostics.manimTransformPathStraightCount
      }
      data-viz-manim-transform-path-sample-alpha={
        manimEvidenceAttributes?.["data-viz-manim-transform-path-sample-alpha"] ??
        runtimeDiagnostics.manimTransformPathSampleAlpha.toFixed(3)
      }
      data-viz-manim-transform-path-sampled-count={
        manimEvidenceAttributes?.["data-viz-manim-transform-path-sampled-count"] ?? runtimeDiagnostics.manimTransformPathSampledCount
      }
      data-viz-manim-transform-path-sampled-midpoints={
        manimEvidenceAttributes?.["data-viz-manim-transform-path-sampled-midpoints"] ??
        runtimeDiagnostics.manimTransformPathSampledMidpoints
      }
      data-viz-manim-transform-path-object-ids={
        manimEvidenceAttributes?.["data-viz-manim-transform-path-object-ids"] ?? runtimeDiagnostics.manimTransformPathObjectIds
      }
      data-viz-manim-transform-path-pointlike-field-policy={
        manimEvidenceAttributes?.["data-viz-manim-transform-path-pointlike-field-policy"] ??
        runtimeDiagnostics.manimTransformPathPointlikeFieldPolicy
      }
      data-viz-manim-transform-path-summaries={
        manimEvidenceAttributes?.["data-viz-manim-transform-path-summaries"] ?? runtimeDiagnostics.manimTransformPathSummaries
      }
      data-viz-manim-transform-path-non-point-field-policy={
        manimEvidenceAttributes?.["data-viz-manim-transform-path-non-point-field-policy"] ??
        runtimeDiagnostics.manimTransformPathNonPointFieldPolicy
      }
      data-viz-manim-transform-path-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-transform-path-source-contract"] ??
        runtimeDiagnostics.manimTransformPathSourceContract
      }
      data-viz-manim-transform-path-summary={
        manimEvidenceAttributes?.["data-viz-manim-transform-path-summary"] ?? runtimeDiagnostics.manimTransformPathSummary
      }
      data-viz-manim-rate-function-step-count={
        manimEvidenceAttributes?.["data-viz-manim-rate-function-step-count"] ?? runtimeDiagnostics.manimRateFunctionStepCount
      }
      data-viz-manim-rate-function-linear-count={
        manimEvidenceAttributes?.["data-viz-manim-rate-function-linear-count"] ?? runtimeDiagnostics.manimRateFunctionLinearCount
      }
      data-viz-manim-rate-function-smooth-count={
        manimEvidenceAttributes?.["data-viz-manim-rate-function-smooth-count"] ?? runtimeDiagnostics.manimRateFunctionSmoothCount
      }
      data-viz-manim-rate-function-linear-duration={
        manimEvidenceAttributes?.["data-viz-manim-rate-function-linear-duration"] ?? runtimeDiagnostics.manimRateFunctionLinearDuration.toFixed(3)
      }
      data-viz-manim-rate-function-smooth-duration={
        manimEvidenceAttributes?.["data-viz-manim-rate-function-smooth-duration"] ?? runtimeDiagnostics.manimRateFunctionSmoothDuration.toFixed(3)
      }
      data-viz-manim-rate-function-ids={
        manimEvidenceAttributes?.["data-viz-manim-rate-function-ids"] ?? runtimeDiagnostics.manimRateFunctionIds
      }
      data-viz-manim-rate-function-step-types={
        manimEvidenceAttributes?.["data-viz-manim-rate-function-step-types"] ?? runtimeDiagnostics.manimRateFunctionStepTypes
      }
      data-viz-manim-rate-function-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-rate-function-source-contract"] ??
        runtimeDiagnostics.manimRateFunctionSourceContract
      }
      data-viz-manim-rate-function-alpha-policy={
        manimEvidenceAttributes?.["data-viz-manim-rate-function-alpha-policy"] ??
        runtimeDiagnostics.manimRateFunctionAlphaPolicy
      }
      data-viz-manim-rate-function-summary={
        manimEvidenceAttributes?.["data-viz-manim-rate-function-summary"] ?? runtimeDiagnostics.manimRateFunctionSummary
      }
      data-viz-manim-lag-ratio-animation-plan-count={
        manimEvidenceAttributes?.["data-viz-manim-lag-ratio-animation-plan-count"] ?? runtimeDiagnostics.manimLagRatioAnimationPlanCount
      }
      data-viz-manim-lag-ratio-composition-count={
        manimEvidenceAttributes?.["data-viz-manim-lag-ratio-composition-count"] ?? runtimeDiagnostics.manimLagRatioCompositionCount
      }
      data-viz-manim-lag-ratio-authored-count={
        manimEvidenceAttributes?.["data-viz-manim-lag-ratio-authored-count"] ?? runtimeDiagnostics.manimLagRatioAuthoredCount
      }
      data-viz-manim-lag-ratio-nonzero-count={
        manimEvidenceAttributes?.["data-viz-manim-lag-ratio-nonzero-count"] ?? runtimeDiagnostics.manimLagRatioNonZeroCount
      }
      data-viz-manim-lag-ratio-zero-count={
        manimEvidenceAttributes?.["data-viz-manim-lag-ratio-zero-count"] ?? runtimeDiagnostics.manimLagRatioZeroCount
      }
      data-viz-manim-lag-ratio-max={
        manimEvidenceAttributes?.["data-viz-manim-lag-ratio-max"] ?? runtimeDiagnostics.manimLagRatioMax.toFixed(3)
      }
      data-viz-manim-lag-ratio-object-ids={
        manimEvidenceAttributes?.["data-viz-manim-lag-ratio-object-ids"] ?? runtimeDiagnostics.manimLagRatioObjectIds
      }
      data-viz-manim-lag-ratio-composition-ids={
        manimEvidenceAttributes?.["data-viz-manim-lag-ratio-composition-ids"] ?? runtimeDiagnostics.manimLagRatioCompositionIds
      }
      data-viz-manim-lag-ratio-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-lag-ratio-source-contract"] ??
        runtimeDiagnostics.manimLagRatioSourceContract
      }
      data-viz-manim-lag-ratio-sub-alpha-policy={
        manimEvidenceAttributes?.["data-viz-manim-lag-ratio-sub-alpha-policy"] ??
        runtimeDiagnostics.manimLagRatioSubAlphaPolicy
      }
      data-viz-manim-lag-ratio-summary={
        manimEvidenceAttributes?.["data-viz-manim-lag-ratio-summary"] ?? runtimeDiagnostics.manimLagRatioSummary
      }
      data-viz-scene-pedagogical-role={sceneMetadata.pedagogicalRole}
      data-viz-scene-primitive-floor={sceneMetadata.minPrimitiveCount}
      data-viz-scene-spatial-model={sceneMetadata.spatialModel}
      data-viz-scene-variant={sceneVariant}
      data-viz-scene-id={manimEvidenceAttributes?.["data-viz-scene-id"] ?? runtimeDiagnostics.sceneId}
      data-viz-concept-id={manimEvidenceAttributes?.["data-viz-concept-id"] ?? runtimeDiagnostics.activeConceptId}
      data-viz-secondary-value={state.secondaryValue.toFixed(3)}
      data-viz-active-step={manimEvidenceAttributes?.["data-viz-active-step"] ?? runtimeDiagnostics.activeStep}
      data-viz-camera-shot={manimEvidenceAttributes?.["data-viz-camera-shot"] ?? runtimeDiagnostics.cameraShot}
      data-viz-camera-canonical-shot={manimEvidenceAttributes?.["data-viz-camera-canonical-shot"] ?? runtimeDiagnostics.cameraCanonicalShot}
      data-viz-formula-binding-anchor-count={
        manimEvidenceAttributes?.["data-viz-formula-binding-anchor-count"] ?? runtimeDiagnostics.formulaBindingAnchorCount
      }
      data-viz-formula-binding-missing-anchor-count={
        manimEvidenceAttributes?.["data-viz-formula-binding-missing-anchor-count"] ?? runtimeDiagnostics.formulaBindingMissingAnchorCount
      }
      data-viz-formula-binding-missing-anchor-token-ids={
        manimEvidenceAttributes?.["data-viz-formula-binding-missing-anchor-token-ids"] ?? runtimeDiagnostics.formulaBindingMissingAnchorTokenIds
      }
      data-viz-formula-binding-anchor-source-contract={
        manimEvidenceAttributes?.["data-viz-formula-binding-anchor-source-contract"] ?? FORMULA_BINDING_ANCHOR_SOURCE_CONTRACT
      }
      data-viz-formula-token-count={manimEvidenceAttributes?.["data-viz-formula-token-count"] ?? runtimeDiagnostics.formulaTokenCount}
      data-viz-formula-token-ids={manimEvidenceAttributes?.["data-viz-formula-token-ids"] ?? runtimeDiagnostics.formulaTokenIds}
      data-viz-manim-formula-layer-source-contract={manimEvidenceAttributes?.["data-viz-manim-formula-layer-source-contract"] ?? manimFormulaLayer?.sourceContract ?? FORMULA_LAYER_SOURCE_CONTRACT}
      data-viz-manim-formula-collision-count={manimFormulaCollisionAttributes["data-viz-manim-formula-collision-count"]}
      data-viz-manim-formula-collision-label-ids={manimFormulaCollisionAttributes["data-viz-manim-formula-collision-label-ids"]}
      data-viz-manim-formula-collision-source-contract={
        manimFormulaCollisionAttributes["data-viz-manim-formula-collision-source-contract"] ?? FORMULA_OVERLAY_COLLISION_SOURCE_CONTRACT
      }
      data-viz-manim-formula-mobile-viewport={manimFormulaCollisionAttributes["data-viz-manim-formula-mobile-viewport"]}
      data-viz-manim-formula-placement={manimFormulaCollisionAttributes["data-viz-manim-formula-placement"]}
      data-viz-manim-formula-safe-area-status={manimFormulaCollisionAttributes["data-viz-manim-formula-safe-area-status"]}
      data-viz-manim-formula-safe-area-summary={manimFormulaCollisionAttributes["data-viz-manim-formula-safe-area-summary"]}
      data-viz-manim-projected-label-count={
        manimEvidenceAttributes?.["data-viz-manim-projected-label-count"] ?? runtimeDiagnostics.manimProjectedLabelCount
      }
      data-viz-manim-projected-label-visible-count={
        manimEvidenceAttributes?.["data-viz-manim-projected-label-visible-count"] ?? runtimeDiagnostics.manimProjectedLabelVisibleCount
      }
      data-viz-manim-projected-label-hidden-count={
        manimEvidenceAttributes?.["data-viz-manim-projected-label-hidden-count"] ?? runtimeDiagnostics.manimProjectedLabelHiddenCount
      }
      data-viz-manim-projected-label-object-count={
        manimEvidenceAttributes?.["data-viz-manim-projected-label-object-count"] ?? runtimeDiagnostics.manimProjectedLabelObjectCount
      }
      data-viz-manim-projected-label-object-ids={
        manimEvidenceAttributes?.["data-viz-manim-projected-label-object-ids"] ?? runtimeDiagnostics.manimProjectedLabelObjectIds
      }
      data-viz-manim-projected-label-concept-ids={
        manimEvidenceAttributes?.["data-viz-manim-projected-label-concept-ids"] ?? runtimeDiagnostics.manimProjectedLabelConceptIds
      }
      data-viz-manim-projected-label-hidden-object-ids={
        manimEvidenceAttributes?.["data-viz-manim-projected-label-hidden-object-ids"] ?? runtimeDiagnostics.manimProjectedLabelHiddenObjectIds
      }
      data-viz-manim-projected-label-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-projected-label-source-contract"] ?? runtimeDiagnostics.manimProjectedLabelSourceContract
      }
      data-viz-manim-projected-label-summary={
        manimEvidenceAttributes?.["data-viz-manim-projected-label-summary"] ?? runtimeDiagnostics.manimProjectedLabelSummary
      }
      data-viz-manim-projected-label-text-object-count={
        manimEvidenceAttributes?.["data-viz-manim-projected-label-text-object-count"] ??
        manimProjectedLabelTextAttributes["data-viz-manim-projected-label-text-object-count"]
      }
      data-viz-manim-projected-label-text-object-ids={
        manimEvidenceAttributes?.["data-viz-manim-projected-label-text-object-ids"] ??
        manimProjectedLabelTextAttributes["data-viz-manim-projected-label-text-object-ids"]
      }
      data-viz-manim-projected-label-text-policy={
        manimEvidenceAttributes?.["data-viz-manim-projected-label-text-policy"] ??
        manimProjectedLabelTextAttributes["data-viz-manim-projected-label-text-policy"]
      }
      data-viz-manim-projected-label-text-source={
        manimEvidenceAttributes?.["data-viz-manim-projected-label-text-source"] ??
        manimProjectedLabelTextAttributes["data-viz-manim-projected-label-text-source"]
      }
      data-viz-manim-projected-label-text-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-projected-label-text-source-contract"] ??
        manimProjectedLabelTextAttributes["data-viz-manim-projected-label-text-source-contract"]
      }
      data-viz-manim-projected-label-text-summary={
        manimEvidenceAttributes?.["data-viz-manim-projected-label-text-summary"] ??
        manimProjectedLabelTextAttributes["data-viz-manim-projected-label-text-summary"]
      }
      data-viz-manim-projected-label-text-token-summary={
        manimEvidenceAttributes?.["data-viz-manim-projected-label-text-token-summary"] ??
        manimProjectedLabelTextAttributes["data-viz-manim-projected-label-text-token-summary"]
      }
      data-viz-math-object-count={manimEvidenceAttributes?.["data-viz-math-object-count"] ?? runtimeDiagnostics.mathObjectCount}
      data-viz-mobject-bounding-box-count={manimMobjectBoundingBoxAttributes?.["data-viz-mobject-bounding-box-count"] ?? "0"}
      data-viz-mobject-bounding-box-empty-count={manimMobjectBoundingBoxAttributes?.["data-viz-mobject-bounding-box-empty-count"] ?? "0"}
      data-viz-mobject-bounding-box-finite-count={manimMobjectBoundingBoxAttributes?.["data-viz-mobject-bounding-box-finite-count"] ?? "0"}
      data-viz-mobject-bounding-box-object-ids={manimMobjectBoundingBoxAttributes?.["data-viz-mobject-bounding-box-object-ids"] ?? "none"}
      data-viz-mobject-bounding-box-signature={manimMobjectBoundingBoxAttributes?.["data-viz-mobject-bounding-box-signature"] ?? "none"}
      data-viz-mobject-bounding-box-source-contract={
        manimMobjectBoundingBoxAttributes?.["data-viz-mobject-bounding-box-source-contract"] ?? MOBJECT_BOUNDING_BOX_SOURCE_CONTRACT
      }
      data-viz-mobject-bounding-box-stale-count={
        manimEvidenceAttributes?.["data-viz-mobject-bounding-box-stale-count"] ?? runtimeDiagnostics.mobjectBoundingBoxStaleCount
      }
      data-viz-mobject-bounding-box-summary={
        manimMobjectBoundingBoxAttributes?.["data-viz-mobject-bounding-box-summary"] ?? "mobject-bounds:rows=0:finite=0:empty=0:ids=none"
      }
      data-viz-mobject-copy-child-link-count={
        manimEvidenceAttributes?.["data-viz-mobject-copy-child-link-count"] ?? manimMobjectCopyPlanAttributes?.["data-viz-mobject-copy-child-link-count"] ?? "0"
      }
      data-viz-mobject-copy-clone-isolated={
        manimEvidenceAttributes?.["data-viz-mobject-copy-clone-isolated"] ?? manimMobjectCopyPlanAttributes?.["data-viz-mobject-copy-clone-isolated"] ?? "false"
      }
      data-viz-mobject-copy-clone-isolation-summary={
        manimEvidenceAttributes?.["data-viz-mobject-copy-clone-isolation-summary"] ??
        manimMobjectCopyPlanAttributes?.["data-viz-mobject-copy-clone-isolation-summary"] ??
        "cloneIsolation:isolated=false:sharedRefs=0:nodes=0"
      }
      data-viz-mobject-copy-family-count={
        manimEvidenceAttributes?.["data-viz-mobject-copy-family-count"] ?? manimMobjectCopyPlanAttributes?.["data-viz-mobject-copy-family-count"] ?? "0"
      }
      data-viz-mobject-copy-id-map-summary={
        manimEvidenceAttributes?.["data-viz-mobject-copy-id-map-summary"] ??
        manimMobjectCopyPlanAttributes?.["data-viz-mobject-copy-id-map-summary"] ??
        "none"
      }
      data-viz-mobject-copy-parent-link-count={
        manimEvidenceAttributes?.["data-viz-mobject-copy-parent-link-count"] ??
        manimMobjectCopyPlanAttributes?.["data-viz-mobject-copy-parent-link-count"] ??
        "0"
      }
      data-viz-mobject-copy-point-count={
        manimEvidenceAttributes?.["data-viz-mobject-copy-point-count"] ?? manimMobjectCopyPlanAttributes?.["data-viz-mobject-copy-point-count"] ?? "0"
      }
      data-viz-mobject-copy-render-data-count={
        manimEvidenceAttributes?.["data-viz-mobject-copy-render-data-count"] ?? manimMobjectCopyPlanAttributes?.["data-viz-mobject-copy-render-data-count"] ?? "0"
      }
      data-viz-mobject-copy-root-id={
        manimEvidenceAttributes?.["data-viz-mobject-copy-root-id"] ?? manimMobjectCopyPlanAttributes?.["data-viz-mobject-copy-root-id"] ?? "none"
      }
      data-viz-mobject-copy-signature={
        manimEvidenceAttributes?.["data-viz-mobject-copy-signature"] ?? manimMobjectCopyPlanAttributes?.["data-viz-mobject-copy-signature"] ?? "none"
      }
      data-viz-mobject-copy-shared-reference-count={
        manimEvidenceAttributes?.["data-viz-mobject-copy-shared-reference-count"] ??
        manimMobjectCopyPlanAttributes?.["data-viz-mobject-copy-shared-reference-count"] ??
        "0"
      }
      data-viz-mobject-copy-source-contract={
        manimEvidenceAttributes?.["data-viz-mobject-copy-source-contract"] ??
        manimMobjectCopyPlanAttributes?.["data-viz-mobject-copy-source-contract"] ??
        MOBJECT_COPY_SOURCE_CONTRACT
      }
      data-viz-mobject-copy-source-id={
        manimEvidenceAttributes?.["data-viz-mobject-copy-source-id"] ?? manimMobjectCopyPlanAttributes?.["data-viz-mobject-copy-source-id"] ?? "none"
      }
      data-viz-mobject-copy-summary={
        manimEvidenceAttributes?.["data-viz-mobject-copy-summary"] ??
        manimMobjectCopyPlanAttributes?.["data-viz-mobject-copy-summary"] ??
        "mobject-copy:source=none:copyRoot=none:family=0:render=0:points=0:childLinks=0"
      }
      data-viz-mobject-layout-align-target-id={
        manimEvidenceAttributes?.["data-viz-mobject-layout-align-target-id"] ??
        manimMobjectLayoutAttributes?.["data-viz-mobject-layout-align-target-id"] ??
        "none"
      }
      data-viz-mobject-layout-aligned-axes={
        manimEvidenceAttributes?.["data-viz-mobject-layout-aligned-axes"] ??
        manimMobjectLayoutAttributes?.["data-viz-mobject-layout-aligned-axes"] ??
        "none"
      }
      data-viz-mobject-layout-buff={
        manimEvidenceAttributes?.["data-viz-mobject-layout-buff"] ?? manimMobjectLayoutAttributes?.["data-viz-mobject-layout-buff"] ?? "0.000"
      }
      data-viz-mobject-layout-centering-delta={
        manimEvidenceAttributes?.["data-viz-mobject-layout-centering-delta"] ??
        manimMobjectLayoutAttributes?.["data-viz-mobject-layout-centering-delta"] ??
        "0.000,0.000,0.000"
      }
      data-viz-mobject-layout-direction={
        manimEvidenceAttributes?.["data-viz-mobject-layout-direction"] ?? manimMobjectLayoutAttributes?.["data-viz-mobject-layout-direction"] ?? "1.000,0.000,0.000"
      }
      data-viz-mobject-layout-frame-anchor={
        manimEvidenceAttributes?.["data-viz-mobject-layout-frame-anchor"] ??
        manimMobjectLayoutAttributes?.["data-viz-mobject-layout-frame-anchor"] ??
        "none"
      }
      data-viz-mobject-layout-frame-bounds={
        manimEvidenceAttributes?.["data-viz-mobject-layout-frame-bounds"] ??
        manimMobjectLayoutAttributes?.["data-viz-mobject-layout-frame-bounds"] ??
        "0.000,0.000,0.000..0.000,0.000,0.000"
      }
      data-viz-mobject-layout-frame-target={
        manimEvidenceAttributes?.["data-viz-mobject-layout-frame-target"] ??
        manimMobjectLayoutAttributes?.["data-viz-mobject-layout-frame-target"] ??
        "0.000,0.000,0.000"
      }
      data-viz-mobject-layout-group-center={
        manimEvidenceAttributes?.["data-viz-mobject-layout-group-center"] ?? manimMobjectLayoutAttributes?.["data-viz-mobject-layout-group-center"] ?? "0.000,0.000,0.000"
      }
      data-viz-mobject-layout-group-size={
        manimEvidenceAttributes?.["data-viz-mobject-layout-group-size"] ?? manimMobjectLayoutAttributes?.["data-viz-mobject-layout-group-size"] ?? "0.000,0.000,0.000"
      }
      data-viz-mobject-layout-kind={
        manimEvidenceAttributes?.["data-viz-mobject-layout-kind"] ?? manimMobjectLayoutAttributes?.["data-viz-mobject-layout-kind"] ?? "arrange"
      }
      data-viz-mobject-layout-missing-count={
        manimEvidenceAttributes?.["data-viz-mobject-layout-missing-count"] ?? manimMobjectLayoutAttributes?.["data-viz-mobject-layout-missing-count"] ?? "0"
      }
      data-viz-mobject-layout-missing-ids={
        manimEvidenceAttributes?.["data-viz-mobject-layout-missing-ids"] ?? manimMobjectLayoutAttributes?.["data-viz-mobject-layout-missing-ids"] ?? "none"
      }
      data-viz-mobject-layout-next-gap={
        manimEvidenceAttributes?.["data-viz-mobject-layout-next-gap"] ??
        manimMobjectLayoutAttributes?.["data-viz-mobject-layout-next-gap"] ??
        "0.000"
      }
      data-viz-mobject-layout-next-target-id={
        manimEvidenceAttributes?.["data-viz-mobject-layout-next-target-id"] ??
        manimMobjectLayoutAttributes?.["data-viz-mobject-layout-next-target-id"] ??
        "none"
      }
      data-viz-mobject-layout-object-count={
        manimEvidenceAttributes?.["data-viz-mobject-layout-object-count"] ?? manimMobjectLayoutAttributes?.["data-viz-mobject-layout-object-count"] ?? "0"
      }
      data-viz-mobject-layout-object-ids={
        manimEvidenceAttributes?.["data-viz-mobject-layout-object-ids"] ?? manimMobjectLayoutAttributes?.["data-viz-mobject-layout-object-ids"] ?? "none"
      }
      data-viz-mobject-layout-signature={
        manimEvidenceAttributes?.["data-viz-mobject-layout-signature"] ?? manimMobjectLayoutAttributes?.["data-viz-mobject-layout-signature"] ?? "none"
      }
      data-viz-mobject-layout-source-contract={
        manimEvidenceAttributes?.["data-viz-mobject-layout-source-contract"] ??
        manimMobjectLayoutAttributes?.["data-viz-mobject-layout-source-contract"] ??
        MOBJECT_LAYOUT_SOURCE_CONTRACT
      }
      data-viz-mobject-layout-summary={
        manimEvidenceAttributes?.["data-viz-mobject-layout-summary"] ??
        manimMobjectLayoutAttributes?.["data-viz-mobject-layout-summary"] ??
        "mobject-layout:arrange:objects=0:missing=0:buff=0.000:center=true:direction=1.000,0.000,0.000"
      }
      data-viz-mobject-layout-target-centers={
        manimEvidenceAttributes?.["data-viz-mobject-layout-target-centers"] ?? manimMobjectLayoutAttributes?.["data-viz-mobject-layout-target-centers"] ?? "none"
      }
      data-viz-mobject-render-order-all-ids={
        manimEvidenceAttributes?.["data-viz-mobject-render-order-all-ids"] ?? manimMobjectRenderOrderAttributes?.["data-viz-mobject-render-order-all-ids"] ?? "none"
      }
      data-viz-mobject-render-order-fixed-count={
        manimEvidenceAttributes?.["data-viz-mobject-render-order-fixed-count"] ?? manimMobjectRenderOrderAttributes?.["data-viz-mobject-render-order-fixed-count"] ?? "0"
      }
      data-viz-mobject-render-order-fixed-ids={
        manimEvidenceAttributes?.["data-viz-mobject-render-order-fixed-ids"] ?? manimMobjectRenderOrderAttributes?.["data-viz-mobject-render-order-fixed-ids"] ?? "none"
      }
      data-viz-mobject-render-order-foreground-count={
        manimEvidenceAttributes?.["data-viz-mobject-render-order-foreground-count"] ?? manimMobjectRenderOrderAttributes?.["data-viz-mobject-render-order-foreground-count"] ?? "0"
      }
      data-viz-mobject-render-order-foreground-ids={
        manimEvidenceAttributes?.["data-viz-mobject-render-order-foreground-ids"] ?? manimMobjectRenderOrderAttributes?.["data-viz-mobject-render-order-foreground-ids"] ?? "none"
      }
      data-viz-mobject-render-order-rendered-count={
        manimEvidenceAttributes?.["data-viz-mobject-render-order-rendered-count"] ?? manimMobjectRenderOrderAttributes?.["data-viz-mobject-render-order-rendered-count"] ?? "0"
      }
      data-viz-mobject-render-order-scene-ids={
        manimEvidenceAttributes?.["data-viz-mobject-render-order-scene-ids"] ?? manimMobjectRenderOrderAttributes?.["data-viz-mobject-render-order-scene-ids"] ?? "none"
      }
      data-viz-mobject-render-order-signature={
        manimEvidenceAttributes?.["data-viz-mobject-render-order-signature"] ?? manimMobjectRenderOrderAttributes?.["data-viz-mobject-render-order-signature"] ?? "none"
      }
      data-viz-mobject-render-order-summary={
        manimEvidenceAttributes?.["data-viz-mobject-render-order-summary"] ??
        manimMobjectRenderOrderAttributes?.["data-viz-mobject-render-order-summary"] ??
        "render-order:top=0:rendered=0:foreground=0:fixed=0"
      }
      data-viz-mobject-render-order-top-level-count={
        manimEvidenceAttributes?.["data-viz-mobject-render-order-top-level-count"] ?? manimMobjectRenderOrderAttributes?.["data-viz-mobject-render-order-top-level-count"] ?? "0"
      }
      data-viz-mobject-render-order-top-level-ids={
        manimEvidenceAttributes?.["data-viz-mobject-render-order-top-level-ids"] ?? manimMobjectRenderOrderAttributes?.["data-viz-mobject-render-order-top-level-ids"] ?? "none"
      }
      data-viz-mobject-data-changed-count={manimEvidenceAttributes?.["data-viz-mobject-data-changed-count"] ?? runtimeDiagnostics.mobjectDataChangedCount}
      data-viz-mobject-data-array-finite-point-count={manimMobjectDataAttributes?.["data-viz-mobject-data-array-finite-point-count"] ?? "0"}
      data-viz-mobject-data-array-object-ids={manimMobjectDataAttributes?.["data-viz-mobject-data-array-object-ids"] ?? "none"}
      data-viz-mobject-data-array-point-count={manimMobjectDataAttributes?.["data-viz-mobject-data-array-point-count"] ?? "0"}
      data-viz-mobject-data-array-rgba-count={manimMobjectDataAttributes?.["data-viz-mobject-data-array-rgba-count"] ?? "0"}
      data-viz-mobject-data-array-role-count={manimMobjectDataAttributes?.["data-viz-mobject-data-array-role-count"] ?? "0"}
      data-viz-mobject-data-array-row-count={manimMobjectDataAttributes?.["data-viz-mobject-data-array-row-count"] ?? "0"}
      data-viz-mobject-data-array-signature={manimMobjectDataAttributes?.["data-viz-mobject-data-array-signature"] ?? "none"}
      data-viz-mobject-data-array-source-contract={
        manimMobjectDataAttributes?.["data-viz-mobject-data-array-source-contract"] ?? MOBJECT_DATA_ARRAY_SOURCE_CONTRACT
      }
      data-viz-mobject-data-array-summary={
        manimMobjectDataAttributes?.["data-viz-mobject-data-array-summary"] ?? "mobject-data:rows=0:points=0:finite=0:rgba=0:roles=none"
      }
      data-viz-mobject-dirty-animation-owned-count={manimMobjectDirtyStateAttributes?.["data-viz-mobject-dirty-animation-owned-count"] ?? "0"}
      data-viz-mobject-dirty-bounding-box-stale-count={manimMobjectDirtyStateAttributes?.["data-viz-mobject-dirty-bounding-box-stale-count"] ?? "0"}
      data-viz-mobject-dirty-cache-status={manimMobjectDirtyStateAttributes?.["data-viz-mobject-dirty-cache-status"] ?? "primitive"}
      data-viz-mobject-dirty-data-changed-count={manimMobjectDirtyStateAttributes?.["data-viz-mobject-dirty-data-changed-count"] ?? "0"}
      data-viz-mobject-dirty-family-cache-reusable={manimMobjectDirtyStateAttributes?.["data-viz-mobject-dirty-family-cache-reusable"] ?? "false"}
      data-viz-mobject-dirty-family-changed-count={manimMobjectDirtyStateAttributes?.["data-viz-mobject-dirty-family-changed-count"] ?? "0"}
      data-viz-mobject-dirty-invalidated-count={manimMobjectDirtyStateAttributes?.["data-viz-mobject-dirty-invalidated-count"] ?? "0"}
      data-viz-mobject-dirty-invalidated-ids={manimMobjectDirtyStateAttributes?.["data-viz-mobject-dirty-invalidated-ids"] ?? "none"}
      data-viz-mobject-dirty-metadata-changed-count={manimMobjectDirtyStateAttributes?.["data-viz-mobject-dirty-metadata-changed-count"] ?? "0"}
      data-viz-mobject-dirty-recomputed-family-count={manimMobjectDirtyStateAttributes?.["data-viz-mobject-dirty-recomputed-family-count"] ?? "0"}
      data-viz-mobject-dirty-reused-family-count={manimMobjectDirtyStateAttributes?.["data-viz-mobject-dirty-reused-family-count"] ?? "0"}
      data-viz-mobject-dirty-signature={manimMobjectDirtyStateAttributes?.["data-viz-mobject-dirty-signature"] ?? "none"}
      data-viz-mobject-dirty-source-contract={
        manimMobjectDirtyStateAttributes?.["data-viz-mobject-dirty-source-contract"] ?? MOBJECT_INVALIDATION_SOURCE_CONTRACT
      }
      data-viz-mobject-dirty-summary={
        manimMobjectDirtyStateAttributes?.["data-viz-mobject-dirty-summary"] ??
        "mobject-dirty:status=primitive:invalidated=0:data=0:bbox=0:family=0:metadata=0:uniforms=0:animation=0:updater=0:unknown=0:reused=0:recomputed=0"
      }
      data-viz-mobject-dirty-unknown-count={manimMobjectDirtyStateAttributes?.["data-viz-mobject-dirty-unknown-count"] ?? "0"}
      data-viz-mobject-dirty-uniforms-changed-count={
        manimMobjectDirtyStateAttributes?.["data-viz-mobject-dirty-uniforms-changed-count"] ?? "0"
      }
      data-viz-mobject-dirty-updater-active-count={manimMobjectDirtyStateAttributes?.["data-viz-mobject-dirty-updater-active-count"] ?? "0"}
      data-viz-mobject-point-cloud-empty-family-count={
        manimMobjectPointCloudAttributes?.["data-viz-mobject-point-cloud-empty-family-count"] ?? "0"
      }
      data-viz-mobject-point-cloud-family-count={manimMobjectPointCloudAttributes?.["data-viz-mobject-point-cloud-family-count"] ?? "0"}
      data-viz-mobject-point-cloud-family-ids={manimMobjectPointCloudAttributes?.["data-viz-mobject-point-cloud-family-ids"] ?? "none"}
      data-viz-mobject-point-cloud-family-with-points-count={
        manimMobjectPointCloudAttributes?.["data-viz-mobject-point-cloud-family-with-points-count"] ?? "0"
      }
      data-viz-mobject-point-cloud-object-with-points-count={
        manimMobjectPointCloudAttributes?.["data-viz-mobject-point-cloud-object-with-points-count"] ?? "0"
      }
      data-viz-mobject-point-cloud-point-count={manimMobjectPointCloudAttributes?.["data-viz-mobject-point-cloud-point-count"] ?? "0"}
      data-viz-mobject-point-cloud-signature={manimMobjectPointCloudAttributes?.["data-viz-mobject-point-cloud-signature"] ?? "none"}
      data-viz-mobject-point-cloud-source-contract={
        manimMobjectPointCloudAttributes?.["data-viz-mobject-point-cloud-source-contract"] ?? MOBJECT_POINT_CLOUD_SOURCE_CONTRACT
      }
      data-viz-mobject-point-cloud-summary={
        manimMobjectPointCloudAttributes?.["data-viz-mobject-point-cloud-summary"] ?? "mobject-points:families=0:withPoints=0:objectsWithPoints=0:points=0:ids=none"
      }
      data-viz-mobject-point-generation-finite-point-count={
        manimEvidenceAttributes?.["data-viz-mobject-point-generation-finite-point-count"] ?? "0"
      }
      data-viz-mobject-point-generation-generated-object-count={
        manimEvidenceAttributes?.["data-viz-mobject-point-generation-generated-object-count"] ?? "0"
      }
      data-viz-mobject-point-generation-generator-kind-summary={
        manimEvidenceAttributes?.["data-viz-mobject-point-generation-generator-kind-summary"] ?? "none"
      }
      data-viz-mobject-point-generation-non-finite-point-count={
        manimEvidenceAttributes?.["data-viz-mobject-point-generation-non-finite-point-count"] ?? "0"
      }
      data-viz-mobject-point-generation-object-count={
        manimEvidenceAttributes?.["data-viz-mobject-point-generation-object-count"] ?? "0"
      }
      data-viz-mobject-point-generation-point-count={
        manimEvidenceAttributes?.["data-viz-mobject-point-generation-point-count"] ?? "0"
      }
      data-viz-mobject-point-generation-signature={
        manimEvidenceAttributes?.["data-viz-mobject-point-generation-signature"] ?? "none"
      }
      data-viz-mobject-point-generation-source-contract={
        manimEvidenceAttributes?.["data-viz-mobject-point-generation-source-contract"] ?? MOBJECT_POINT_GENERATION_SOURCE_CONTRACT
      }
      data-viz-mobject-point-generation-summary={
        manimEvidenceAttributes?.["data-viz-mobject-point-generation-summary"] ??
        "mobject-point-generation:objects=0:generated=0:points=0:finite=0:nonFinite=0:zero=none"
      }
      data-viz-mobject-point-generation-zero-point-object-count={
        manimEvidenceAttributes?.["data-viz-mobject-point-generation-zero-point-object-count"] ?? "0"
      }
      data-viz-mobject-point-generation-zero-point-object-ids={
        manimEvidenceAttributes?.["data-viz-mobject-point-generation-zero-point-object-ids"] ?? "none"
      }
      data-viz-mobject-point-transform-changed-point-count={
        manimEvidenceAttributes?.["data-viz-mobject-point-transform-changed-point-count"] ?? "0"
      }
      data-viz-mobject-point-transform-finite-transformed-point-count={
        manimEvidenceAttributes?.["data-viz-mobject-point-transform-finite-transformed-point-count"] ?? "0"
      }
      data-viz-mobject-point-transform-max-displacement={
        manimEvidenceAttributes?.["data-viz-mobject-point-transform-max-displacement"] ?? "0.000"
      }
      data-viz-mobject-point-transform-object-count={
        manimEvidenceAttributes?.["data-viz-mobject-point-transform-object-count"] ?? "0"
      }
      data-viz-mobject-point-transform-operation-count={
        manimEvidenceAttributes?.["data-viz-mobject-point-transform-operation-count"] ?? "0"
      }
      data-viz-mobject-point-transform-operation-ids={
        manimEvidenceAttributes?.["data-viz-mobject-point-transform-operation-ids"] ?? "none"
      }
      data-viz-mobject-point-transform-row-count={
        manimEvidenceAttributes?.["data-viz-mobject-point-transform-row-count"] ?? "0"
      }
      data-viz-mobject-point-transform-signature={
        manimEvidenceAttributes?.["data-viz-mobject-point-transform-signature"] ?? "none"
      }
      data-viz-mobject-point-transform-source-contract={
        manimEvidenceAttributes?.["data-viz-mobject-point-transform-source-contract"] ?? MOBJECT_POINT_TRANSFORM_SOURCE_CONTRACT
      }
      data-viz-mobject-point-transform-source-point-count={
        manimEvidenceAttributes?.["data-viz-mobject-point-transform-source-point-count"] ?? "0"
      }
      data-viz-mobject-point-transform-summary={
        manimEvidenceAttributes?.["data-viz-mobject-point-transform-summary"] ??
        "mobject-point-transform:objects=0:transformable=0:ops=0:rows=0:sourcePoints=0:transformed=0:finite=0:ids=none"
      }
      data-viz-mobject-point-transform-transformable-object-count={
        manimEvidenceAttributes?.["data-viz-mobject-point-transform-transformable-object-count"] ?? "0"
      }
      data-viz-mobject-point-transform-transformed-point-count={
        manimEvidenceAttributes?.["data-viz-mobject-point-transform-transformed-point-count"] ?? "0"
      }
      data-viz-manim-config-digest-class-summary={
        manimEvidenceAttributes?.["data-viz-manim-config-digest-class-summary"] ?? "Mobject=0;VMobject=0"
      }
      data-viz-manim-config-digest-clipping-plane-count={
        manimEvidenceAttributes?.["data-viz-manim-config-digest-clipping-plane-count"] ?? "0"
      }
      data-viz-manim-config-digest-defaulted-value-count={
        manimEvidenceAttributes?.["data-viz-manim-config-digest-defaulted-value-count"] ?? "0"
      }
      data-viz-manim-config-digest-explicit-override-count={
        manimEvidenceAttributes?.["data-viz-manim-config-digest-explicit-override-count"] ?? "0"
      }
      data-viz-manim-config-digest-fixed-in-frame-count={
        manimEvidenceAttributes?.["data-viz-manim-config-digest-fixed-in-frame-count"] ?? "0"
      }
      data-viz-manim-config-digest-object-count={
        manimEvidenceAttributes?.["data-viz-manim-config-digest-object-count"] ?? "0"
      }
      data-viz-manim-config-digest-opacity-range={
        manimEvidenceAttributes?.["data-viz-manim-config-digest-opacity-range"] ?? "0.000..0.000"
      }
      data-viz-manim-config-digest-row-summary={
        manimEvidenceAttributes?.["data-viz-manim-config-digest-row-summary"] ?? "none"
      }
      data-viz-manim-config-digest-shade-in-3d-count={
        manimEvidenceAttributes?.["data-viz-manim-config-digest-shade-in-3d-count"] ?? "0"
      }
      data-viz-manim-config-digest-signature={
        manimEvidenceAttributes?.["data-viz-manim-config-digest-signature"] ?? "none"
      }
      data-viz-manim-config-digest-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-config-digest-source-contract"] ?? MANIM_CONFIG_DIGEST_SOURCE_CONTRACT
      }
      data-viz-manim-config-digest-summary={
        manimEvidenceAttributes?.["data-viz-manim-config-digest-summary"] ??
        "config-digest:primitive:objects=0:vmobjects=0:explicit=0:defaulted=0:classes=Mobject=0;VMobject=0"
      }
      data-viz-manim-config-digest-vmobject-count={
        manimEvidenceAttributes?.["data-viz-manim-config-digest-vmobject-count"] ?? "0"
      }
      data-viz-manim-config-digest-z-index-range={
        manimEvidenceAttributes?.["data-viz-manim-config-digest-z-index-range"] ?? "0..0"
      }
      data-viz-mobject-family-cache-data-dirty-count={
        manimEvidenceAttributes?.["data-viz-mobject-family-cache-data-dirty-count"] ?? "0"
      }
      data-viz-mobject-family-cache-family-dirty-count={
        manimEvidenceAttributes?.["data-viz-mobject-family-cache-family-dirty-count"] ?? "0"
      }
      data-viz-mobject-family-cache-recomputed-count={
        manimEvidenceAttributes?.["data-viz-mobject-family-cache-recomputed-count"] ?? "0"
      }
      data-viz-mobject-family-cache-recomputed-ids={
        manimEvidenceAttributes?.["data-viz-mobject-family-cache-recomputed-ids"] ?? "none"
      }
      data-viz-mobject-family-cache-reusable={manimEvidenceAttributes?.["data-viz-mobject-family-cache-reusable"] ?? String(runtimeDiagnostics.mobjectFamilyCacheReusable)}
      data-viz-mobject-family-cache-reused-count={
        manimEvidenceAttributes?.["data-viz-mobject-family-cache-reused-count"] ?? "0"
      }
      data-viz-mobject-family-cache-reused-ids={
        manimEvidenceAttributes?.["data-viz-mobject-family-cache-reused-ids"] ?? "none"
      }
      data-viz-mobject-family-cache-source-contract={
        manimEvidenceAttributes?.["data-viz-mobject-family-cache-source-contract"] ?? MOBJECT_FAMILY_CACHE_SOURCE_CONTRACT
      }
      data-viz-mobject-family-cache-status={manimEvidenceAttributes?.["data-viz-mobject-family-cache-status"] ?? runtimeDiagnostics.mobjectFamilyCacheStatus}
      data-viz-mobject-family-cache-summary={manimEvidenceAttributes?.["data-viz-mobject-family-cache-summary"] ?? runtimeDiagnostics.mobjectFamilyCacheSummary}
      data-viz-mobject-family-changed-count={manimEvidenceAttributes?.["data-viz-mobject-family-changed-count"] ?? runtimeDiagnostics.mobjectFamilyChangedCount}
      data-viz-mobject-family-cycle-count={manimEvidenceAttributes?.["data-viz-mobject-family-cycle-count"] ?? "0"}
      data-viz-mobject-family-max-depth={manimEvidenceAttributes?.["data-viz-mobject-family-max-depth"] ?? "0"}
      data-viz-mobject-family-member-count={manimEvidenceAttributes?.["data-viz-mobject-family-member-count"] ?? runtimeDiagnostics.mobjectFamilyMemberCount}
      data-viz-mobject-family-orphan-count={manimEvidenceAttributes?.["data-viz-mobject-family-orphan-count"] ?? "0"}
      data-viz-mobject-family-root-count={manimEvidenceAttributes?.["data-viz-mobject-family-root-count"] ?? runtimeDiagnostics.mobjectFamilyRootCount}
      data-viz-mobject-family-source-contract={
        manimEvidenceAttributes?.["data-viz-mobject-family-source-contract"] ?? runtimeDiagnostics.mobjectFamilySourceContract
      }
      data-viz-mobject-animation-owned-invalidation-count={
        manimEvidenceAttributes?.["data-viz-mobject-animation-owned-invalidation-count"] ?? runtimeDiagnostics.mobjectAnimationOwnedInvalidationCount
      }
      data-viz-mobject-invalidated-ids={manimEvidenceAttributes?.["data-viz-mobject-invalidated-ids"] ?? runtimeDiagnostics.mobjectInvalidatedIds}
      data-viz-mobject-invalidation-ownership-summary={
        manimEvidenceAttributes?.["data-viz-mobject-invalidation-ownership-summary"] ?? runtimeDiagnostics.mobjectInvalidationOwnershipSummary
      }
      data-viz-mobject-invalidation-reasons={
        manimEvidenceAttributes?.["data-viz-mobject-invalidation-reasons"] ?? runtimeDiagnostics.mobjectInvalidationReasons
      }
      data-viz-mobject-invalidation-summary={manimEvidenceAttributes?.["data-viz-mobject-invalidation-summary"] ?? runtimeDiagnostics.mobjectInvalidationSummary}
      data-viz-mobject-max-depth={manimEvidenceAttributes?.["data-viz-mobject-max-depth"] ?? runtimeDiagnostics.mobjectMaxDepth}
      data-viz-mobject-metadata-changed-count={manimEvidenceAttributes?.["data-viz-mobject-metadata-changed-count"] ?? runtimeDiagnostics.mobjectMetadataChangedCount}
      data-viz-mobject-orphan-count={manimEvidenceAttributes?.["data-viz-mobject-orphan-count"] ?? runtimeDiagnostics.mobjectOrphanCount}
      data-viz-mobject-state-become-applied-count={manimMobjectStateAttributes?.["data-viz-mobject-state-become-applied-count"] ?? "0"}
      data-viz-mobject-state-become-node-count={manimMobjectStateAttributes?.["data-viz-mobject-state-become-node-count"] ?? "0"}
      data-viz-mobject-state-become-point-count={manimMobjectStateAttributes?.["data-viz-mobject-state-become-point-count"] ?? "0"}
      data-viz-mobject-state-become-ready-count={manimMobjectStateAttributes?.["data-viz-mobject-state-become-ready-count"] ?? "0"}
      data-viz-mobject-state-become-render-data-count={
        manimMobjectStateAttributes?.["data-viz-mobject-state-become-render-data-count"] ?? "0"
      }
      data-viz-mobject-state-family-root-count={manimMobjectStateAttributes?.["data-viz-mobject-state-family-root-count"] ?? "0"}
      data-viz-mobject-state-node-count={manimMobjectStateAttributes?.["data-viz-mobject-state-node-count"] ?? "0"}
      data-viz-mobject-state-restorable-count={manimMobjectStateAttributes?.["data-viz-mobject-state-restorable-count"] ?? "0"}
      data-viz-mobject-state-source-contract={
        manimMobjectStateAttributes?.["data-viz-mobject-state-source-contract"] ?? MOBJECT_STATE_SOURCE_CONTRACT
      }
      data-viz-mobject-state-restore-mismatch-count={manimMobjectStateAttributes?.["data-viz-mobject-state-restore-mismatch-count"] ?? "0"}
      data-viz-mobject-state-restore-node-count={manimMobjectStateAttributes?.["data-viz-mobject-state-restore-node-count"] ?? "0"}
      data-viz-mobject-state-restore-point-count={manimMobjectStateAttributes?.["data-viz-mobject-state-restore-point-count"] ?? "0"}
      data-viz-mobject-state-restore-ready-count={manimMobjectStateAttributes?.["data-viz-mobject-state-restore-ready-count"] ?? "0"}
      data-viz-mobject-state-restore-render-data-count={manimMobjectStateAttributes?.["data-viz-mobject-state-restore-render-data-count"] ?? "0"}
      data-viz-mobject-state-restore-source-summary={
        manimMobjectStateAttributes?.["data-viz-mobject-state-restore-source-summary"] ??
        "restore:rows=0:ready=0:mismatch=0:nodes=0:points=0:uniforms=0"
      }
      data-viz-mobject-state-restore-uniform-node-count={manimMobjectStateAttributes?.["data-viz-mobject-state-restore-uniform-node-count"] ?? "0"}
      data-viz-mobject-state-signature={manimMobjectStateAttributes?.["data-viz-mobject-state-signature"] ?? "none"}
      data-viz-mobject-state-snapshot-count={
        manimMobjectStateAttributes?.["data-viz-mobject-state-snapshot-count"] ??
        manimEvidenceAttributes?.["data-viz-mobject-state-snapshot-count"] ??
        runtimeDiagnostics.mobjectStateSnapshotCount
      }
      data-viz-mobject-state-summary={
        manimMobjectStateAttributes?.["data-viz-mobject-state-summary"] ??
        "mobject-state:snapshots=0:nodes=0:restorable=0:targetable=0:targets=0:become=0"
      }
      data-viz-mobject-state-target-count={manimMobjectStateAttributes?.["data-viz-mobject-state-target-count"] ?? "0"}
      data-viz-mobject-state-target-ids={manimMobjectStateAttributes?.["data-viz-mobject-state-target-ids"] ?? "none"}
      data-viz-mobject-state-target-node-count={manimMobjectStateAttributes?.["data-viz-mobject-state-target-node-count"] ?? "0"}
      data-viz-mobject-state-target-point-count={manimMobjectStateAttributes?.["data-viz-mobject-state-target-point-count"] ?? "0"}
      data-viz-mobject-state-target-render-data-count={
        manimMobjectStateAttributes?.["data-viz-mobject-state-target-render-data-count"] ?? "0"
      }
      data-viz-mobject-state-targetable-count={manimMobjectStateAttributes?.["data-viz-mobject-state-targetable-count"] ?? "0"}
      data-viz-mobject-state-restore-bridge-after-family-ids={
        manimMobjectStateRestoreBridgeAttributes?.["data-viz-mobject-state-restore-bridge-after-family-ids"] ?? "none"
      }
      data-viz-mobject-state-restore-bridge-after-object-ids={
        manimMobjectStateRestoreBridgeAttributes?.["data-viz-mobject-state-restore-bridge-after-object-ids"] ?? "none"
      }
      data-viz-mobject-state-restore-bridge-before-family-ids={
        manimMobjectStateRestoreBridgeAttributes?.["data-viz-mobject-state-restore-bridge-before-family-ids"] ?? "none"
      }
      data-viz-mobject-state-restore-bridge-before-object-ids={
        manimMobjectStateRestoreBridgeAttributes?.["data-viz-mobject-state-restore-bridge-before-object-ids"] ?? "none"
      }
      data-viz-mobject-state-restore-bridge-current-signature={
        manimMobjectStateRestoreBridgeAttributes?.["data-viz-mobject-state-restore-bridge-current-signature"] ?? "none"
      }
      data-viz-mobject-state-restore-bridge-family-ids={
        manimMobjectStateRestoreBridgeAttributes?.["data-viz-mobject-state-restore-bridge-family-ids"] ?? "none"
      }
      data-viz-mobject-state-restore-bridge-family-preserved={
        manimMobjectStateRestoreBridgeAttributes?.["data-viz-mobject-state-restore-bridge-family-preserved"] ?? "false"
      }
      data-viz-mobject-state-restore-bridge-identity-preserved={
        manimMobjectStateRestoreBridgeAttributes?.["data-viz-mobject-state-restore-bridge-identity-preserved"] ?? "false"
      }
      data-viz-mobject-state-restore-bridge-object-id={
        manimMobjectStateRestoreBridgeAttributes?.["data-viz-mobject-state-restore-bridge-object-id"] ?? "none"
      }
      data-viz-mobject-state-restore-bridge-restored={
        manimMobjectStateRestoreBridgeAttributes?.["data-viz-mobject-state-restore-bridge-restored"] ?? "false"
      }
      data-viz-mobject-state-restore-bridge-restored-signature={
        manimMobjectStateRestoreBridgeAttributes?.["data-viz-mobject-state-restore-bridge-restored-signature"] ?? "none"
      }
      data-viz-mobject-state-restore-bridge-restore-mismatch-count={
        manimMobjectStateRestoreBridgeAttributes?.["data-viz-mobject-state-restore-bridge-restore-mismatch-count"] ?? "0"
      }
      data-viz-mobject-state-restore-bridge-saved-node-count={
        manimMobjectStateRestoreBridgeAttributes?.["data-viz-mobject-state-restore-bridge-saved-node-count"] ?? "0"
      }
      data-viz-mobject-state-restore-bridge-saved-point-count={
        manimMobjectStateRestoreBridgeAttributes?.["data-viz-mobject-state-restore-bridge-saved-point-count"] ?? "0"
      }
      data-viz-mobject-state-restore-bridge-saved-signature={
        manimMobjectStateRestoreBridgeAttributes?.["data-viz-mobject-state-restore-bridge-saved-signature"] ?? "none"
      }
      data-viz-mobject-state-restore-bridge-source-contract={
        manimMobjectStateRestoreBridgeAttributes?.["data-viz-mobject-state-restore-bridge-source-contract"] ??
        MOBJECT_STATE_RESTORE_BRIDGE_SOURCE_CONTRACT
      }
      data-viz-mobject-state-restore-bridge-summary={
        manimMobjectStateRestoreBridgeAttributes?.["data-viz-mobject-state-restore-bridge-summary"] ??
        "mobject-state-restore:none:family=0:points=0:restored=false:mismatch=0:identity=false"
      }
      data-viz-mobject-move-to-target-after-family-ids={
        manimMobjectMoveToTargetBridgeAttributes?.["data-viz-mobject-move-to-target-after-family-ids"] ?? "none"
      }
      data-viz-mobject-move-to-target-after-signature={
        manimMobjectMoveToTargetBridgeAttributes?.["data-viz-mobject-move-to-target-after-signature"] ?? "none"
      }
      data-viz-mobject-move-to-target-applied-node-count={
        manimMobjectMoveToTargetBridgeAttributes?.["data-viz-mobject-move-to-target-applied-node-count"] ?? "0"
      }
      data-viz-mobject-move-to-target-become-applied={
        manimMobjectMoveToTargetBridgeAttributes?.["data-viz-mobject-move-to-target-become-applied"] ?? "false"
      }
      data-viz-mobject-move-to-target-family-preserved={
        manimMobjectMoveToTargetBridgeAttributes?.["data-viz-mobject-move-to-target-family-preserved"] ?? "false"
      }
      data-viz-mobject-move-to-target-identity-preserved={
        manimMobjectMoveToTargetBridgeAttributes?.["data-viz-mobject-move-to-target-identity-preserved"] ?? "false"
      }
      data-viz-mobject-move-to-target-object-id={
        manimMobjectMoveToTargetBridgeAttributes?.["data-viz-mobject-move-to-target-object-id"] ?? "none"
      }
      data-viz-mobject-move-to-target-render-state-changed={
        manimMobjectMoveToTargetBridgeAttributes?.["data-viz-mobject-move-to-target-render-state-changed"] ?? "false"
      }
      data-viz-mobject-move-to-target-source-contract={
        manimMobjectMoveToTargetBridgeAttributes?.["data-viz-mobject-move-to-target-source-contract"] ??
        MOBJECT_MOVE_TO_TARGET_BRIDGE_SOURCE_CONTRACT
      }
      data-viz-mobject-move-to-target-source-family-ids={
        manimMobjectMoveToTargetBridgeAttributes?.["data-viz-mobject-move-to-target-source-family-ids"] ?? "none"
      }
      data-viz-mobject-move-to-target-source-node-count={
        manimMobjectMoveToTargetBridgeAttributes?.["data-viz-mobject-move-to-target-source-node-count"] ?? "0"
      }
      data-viz-mobject-move-to-target-source-signature={
        manimMobjectMoveToTargetBridgeAttributes?.["data-viz-mobject-move-to-target-source-signature"] ?? "none"
      }
      data-viz-mobject-move-to-target-summary={
        manimMobjectMoveToTargetBridgeAttributes?.["data-viz-mobject-move-to-target-summary"] ??
        "mobject-move-to-target:none:target=none:nodes=0:points=0:changed=false:become=false:identity=false"
      }
      data-viz-mobject-move-to-target-target-family-ids={
        manimMobjectMoveToTargetBridgeAttributes?.["data-viz-mobject-move-to-target-target-family-ids"] ?? "none"
      }
      data-viz-mobject-move-to-target-target-generated={
        manimMobjectMoveToTargetBridgeAttributes?.["data-viz-mobject-move-to-target-target-generated"] ?? "false"
      }
      data-viz-mobject-move-to-target-target-id={
        manimMobjectMoveToTargetBridgeAttributes?.["data-viz-mobject-move-to-target-target-id"] ?? "none"
      }
      data-viz-mobject-move-to-target-target-node-count={
        manimMobjectMoveToTargetBridgeAttributes?.["data-viz-mobject-move-to-target-target-node-count"] ?? "0"
      }
      data-viz-mobject-move-to-target-target-point-count={
        manimMobjectMoveToTargetBridgeAttributes?.["data-viz-mobject-move-to-target-target-point-count"] ?? "0"
      }
      data-viz-mobject-move-to-target-target-signature={
        manimMobjectMoveToTargetBridgeAttributes?.["data-viz-mobject-move-to-target-target-signature"] ?? "none"
      }
      data-viz-mobject-targetable-count={manimEvidenceAttributes?.["data-viz-mobject-targetable-count"] ?? runtimeDiagnostics.mobjectTargetableCount}
      data-viz-mobject-anchor-empty-bounding-box-count={
        manimEvidenceAttributes?.["data-viz-mobject-anchor-empty-bounding-box-count"] ?? "0"
      }
      data-viz-mobject-anchor-finite-point-count={manimEvidenceAttributes?.["data-viz-mobject-anchor-finite-point-count"] ?? "0"}
      data-viz-mobject-anchor-name-count={manimEvidenceAttributes?.["data-viz-mobject-anchor-name-count"] ?? "0"}
      data-viz-mobject-anchor-names={manimEvidenceAttributes?.["data-viz-mobject-anchor-names"] ?? "none"}
      data-viz-mobject-anchor-object-count={manimEvidenceAttributes?.["data-viz-mobject-anchor-object-count"] ?? "0"}
      data-viz-mobject-anchor-object-ids={manimEvidenceAttributes?.["data-viz-mobject-anchor-object-ids"] ?? "none"}
      data-viz-mobject-anchor-point-count={manimEvidenceAttributes?.["data-viz-mobject-anchor-point-count"] ?? "0"}
      data-viz-mobject-anchor-source-contract={
        manimEvidenceAttributes?.["data-viz-mobject-anchor-source-contract"] ?? MOBJECT_ANCHOR_SOURCE_CONTRACT
      }
      data-viz-mobject-anchor-summary={
        manimEvidenceAttributes?.["data-viz-mobject-anchor-summary"] ??
        "mobject-anchors:objects=0:anchors=0:points=0:finite=0:empty=0:names=none:ids=none"
      }
      data-viz-mobject-clipping-plane-count={manimEvidenceAttributes?.["data-viz-mobject-clipping-plane-count"] ?? runtimeDiagnostics.mobjectClippingPlaneCount}
      data-viz-mobject-fixed-in-frame-uniform-count={
        manimEvidenceAttributes?.["data-viz-mobject-fixed-in-frame-uniform-count"] ?? runtimeDiagnostics.mobjectFixedInFrameUniformCount
      }
      data-viz-mobject-shade-in-3d-count={manimEvidenceAttributes?.["data-viz-mobject-shade-in-3d-count"] ?? runtimeDiagnostics.mobjectShadeIn3DCount}
      data-viz-mobject-transparent-count={manimEvidenceAttributes?.["data-viz-mobject-transparent-count"] ?? runtimeDiagnostics.mobjectTransparentCount}
      data-viz-mobject-uniform-count={manimEvidenceAttributes?.["data-viz-mobject-uniform-count"] ?? runtimeDiagnostics.mobjectUniformCount}
      data-viz-mobject-uniform-summary={manimEvidenceAttributes?.["data-viz-mobject-uniform-summary"] ?? runtimeDiagnostics.mobjectUniformSummary}
      data-viz-mobject-material-clipping-plane-count={
        manimEvidenceAttributes?.["data-viz-mobject-material-clipping-plane-count"] ?? "0"
      }
      data-viz-mobject-material-depth-write-enabled-count={
        manimEvidenceAttributes?.["data-viz-mobject-material-depth-write-enabled-count"] ?? "0"
      }
      data-viz-mobject-material-object-count={manimEvidenceAttributes?.["data-viz-mobject-material-object-count"] ?? "0"}
      data-viz-mobject-material-object-ids={manimEvidenceAttributes?.["data-viz-mobject-material-object-ids"] ?? "none"}
      data-viz-mobject-material-opacity-range={manimEvidenceAttributes?.["data-viz-mobject-material-opacity-range"] ?? "none"}
      data-viz-mobject-material-shade-in-3d-count={manimEvidenceAttributes?.["data-viz-mobject-material-shade-in-3d-count"] ?? "0"}
      data-viz-mobject-material-source-contract={
        manimEvidenceAttributes?.["data-viz-mobject-material-source-contract"] ??
        MOBJECT_MATERIAL_UNIFORM_SOURCE_CONTRACT
      }
      data-viz-mobject-material-summary={
        manimEvidenceAttributes?.["data-viz-mobject-material-summary"] ??
        "material-uniforms:objects=0:transparent=0:depthWrite=0:shade3d=0:clipPlanes=0:opacityRange=none:ids=none"
      }
      data-viz-mobject-material-transparent-count={manimEvidenceAttributes?.["data-viz-mobject-material-transparent-count"] ?? "0"}
      data-viz-vmobject-render-line-color-roles={manimEvidenceAttributes?.["data-viz-vmobject-render-line-color-roles"] ?? "none"}
      data-viz-vmobject-render-line-object-count={manimEvidenceAttributes?.["data-viz-vmobject-render-line-object-count"] ?? "0"}
      data-viz-vmobject-render-line-object-ids={manimEvidenceAttributes?.["data-viz-vmobject-render-line-object-ids"] ?? "none"}
      data-viz-vmobject-render-line-opacity-range={manimEvidenceAttributes?.["data-viz-vmobject-render-line-opacity-range"] ?? "none"}
      data-viz-vmobject-render-line-source-contract={
        manimEvidenceAttributes?.["data-viz-vmobject-render-line-source-contract"] ?? VMOBJECT_LINE_RENDER_SOURCE_CONTRACT
      }
      data-viz-vmobject-render-line-stroke-width-range={
        manimEvidenceAttributes?.["data-viz-vmobject-render-line-stroke-width-range"] ?? "none"
      }
      data-viz-vmobject-render-line-summary={
        manimEvidenceAttributes?.["data-viz-vmobject-render-line-summary"] ??
        "vmobject-line-render:objects=0:transparent=0:opacityRange=none:strokeWidthRange=none:roles=none:ids=none"
      }
      data-viz-vmobject-render-line-transparent-count={
        manimEvidenceAttributes?.["data-viz-vmobject-render-line-transparent-count"] ?? "0"
      }
      data-viz-vmobject-render-fill-color-roles={manimEvidenceAttributes?.["data-viz-vmobject-render-fill-color-roles"] ?? "none"}
      data-viz-vmobject-render-fill-mesh-object-count={
        manimEvidenceAttributes?.["data-viz-vmobject-render-fill-mesh-object-count"] ?? "0"
      }
      data-viz-vmobject-render-fill-mesh-object-ids={
        manimEvidenceAttributes?.["data-viz-vmobject-render-fill-mesh-object-ids"] ?? "none"
      }
      data-viz-vmobject-render-fill-object-count={manimEvidenceAttributes?.["data-viz-vmobject-render-fill-object-count"] ?? "0"}
      data-viz-vmobject-render-fill-object-ids={manimEvidenceAttributes?.["data-viz-vmobject-render-fill-object-ids"] ?? "none"}
      data-viz-vmobject-render-fill-opacity-range={
        manimEvidenceAttributes?.["data-viz-vmobject-render-fill-opacity-range"] ?? "none"
      }
      data-viz-vmobject-render-fill-source-contract={
        manimEvidenceAttributes?.["data-viz-vmobject-render-fill-source-contract"] ?? VMOBJECT_SURFACE_FILL_RENDER_SOURCE_CONTRACT
      }
      data-viz-vmobject-render-fill-summary={
        manimEvidenceAttributes?.["data-viz-vmobject-render-fill-summary"] ??
        "vmobject-surface-fill-render:objects=0:meshes=0:triangles=0:vertices=0:transparent=0:opacityRange=none:roles=none:ids=none"
      }
      data-viz-vmobject-render-fill-transparent-count={
        manimEvidenceAttributes?.["data-viz-vmobject-render-fill-transparent-count"] ?? "0"
      }
      data-viz-vmobject-render-fill-triangle-count={
        manimEvidenceAttributes?.["data-viz-vmobject-render-fill-triangle-count"] ?? "0"
      }
      data-viz-vmobject-render-fill-vertex-count={
        manimEvidenceAttributes?.["data-viz-vmobject-render-fill-vertex-count"] ?? "0"
      }
      data-viz-runtime-render-state-finite-point-count={
        manimEvidenceAttributes?.["data-viz-runtime-render-state-finite-point-count"] ?? "0"
      }
      data-viz-runtime-render-state-kind-summary={
        manimEvidenceAttributes?.["data-viz-runtime-render-state-kind-summary"] ??
        "axes=0;empty=0;point=0;polyline=0;surface=0;vector=0"
      }
      data-viz-runtime-render-state-object-count={manimEvidenceAttributes?.["data-viz-runtime-render-state-object-count"] ?? "0"}
      data-viz-runtime-render-state-object-ids={manimEvidenceAttributes?.["data-viz-runtime-render-state-object-ids"] ?? "none"}
      data-viz-runtime-render-state-point-count={manimEvidenceAttributes?.["data-viz-runtime-render-state-point-count"] ?? "0"}
      data-viz-runtime-render-state-source-contract={
        manimEvidenceAttributes?.["data-viz-runtime-render-state-source-contract"] ?? RUNTIME_RENDER_STATE_SOURCE_CONTRACT
      }
      data-viz-runtime-render-state-styled-object-count={
        manimEvidenceAttributes?.["data-viz-runtime-render-state-styled-object-count"] ?? "0"
      }
      data-viz-runtime-render-state-summary={
        manimEvidenceAttributes?.["data-viz-runtime-render-state-summary"] ??
        "runtime-render-state:objects=0:kinds=axes=0;empty=0;point=0;polyline=0;surface=0;vector=0:points=0:finite=0:zeroPoint=0:styled=0:wireframes=0:ids=none"
      }
      data-viz-runtime-render-state-wireframe-curve-count={
        manimEvidenceAttributes?.["data-viz-runtime-render-state-wireframe-curve-count"] ?? "0"
      }
      data-viz-runtime-render-state-zero-point-object-count={
        manimEvidenceAttributes?.["data-viz-runtime-render-state-zero-point-object-count"] ?? "0"
      }
      data-viz-manim-timeline-active-concept-id={
        manimEvidenceAttributes?.["data-viz-manim-timeline-active-concept-id"] ?? "none"
      }
      data-viz-manim-timeline-active-step-index={
        manimEvidenceAttributes?.["data-viz-manim-timeline-active-step-index"] ?? "-1"
      }
      data-viz-manim-timeline-active-step-type={
        manimEvidenceAttributes?.["data-viz-manim-timeline-active-step-type"] ?? "none"
      }
      data-viz-manim-timeline-camera-step-count={
        manimEvidenceAttributes?.["data-viz-manim-timeline-camera-step-count"] ?? "0"
      }
      data-viz-manim-timeline-completed-step-count={
        manimEvidenceAttributes?.["data-viz-manim-timeline-completed-step-count"] ?? "0"
      }
      data-viz-manim-timeline-elapsed-seconds={
        manimEvidenceAttributes?.["data-viz-manim-timeline-elapsed-seconds"] ?? "0.000"
      }
      data-viz-manim-timeline-focus-target-count={
        manimEvidenceAttributes?.["data-viz-manim-timeline-focus-target-count"] ?? "0"
      }
      data-viz-manim-timeline-focus-target-ids={
        manimEvidenceAttributes?.["data-viz-manim-timeline-focus-target-ids"] ?? "none"
      }
      data-viz-manim-timeline-focus-target-policy={
        manimEvidenceAttributes?.["data-viz-manim-timeline-focus-target-policy"] ?? TIMELINE_FOCUS_TARGET_POLICY
      }
      data-viz-manim-timeline-focus-target-primary-id={
        manimEvidenceAttributes?.["data-viz-manim-timeline-focus-target-primary-id"] ?? "none"
      }
      data-viz-manim-timeline-focus-target-summary={
        manimEvidenceAttributes?.["data-viz-manim-timeline-focus-target-summary"] ?? "timelineFocus:active=none:targets=0:ids=none"
      }
      data-viz-manim-timeline-pending-step-count={
        manimEvidenceAttributes?.["data-viz-manim-timeline-pending-step-count"] ?? "0"
      }
      data-viz-manim-timeline-progress={manimEvidenceAttributes?.["data-viz-manim-timeline-progress"] ?? "1.000"}
      data-viz-manim-timeline-reduced-motion={
        manimEvidenceAttributes?.["data-viz-manim-timeline-reduced-motion"] ?? "false"
      }
      data-viz-manim-timeline-skip-animations={
        manimEvidenceAttributes?.["data-viz-manim-timeline-skip-animations"] ?? "false"
      }
      data-viz-manim-timeline-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-timeline-source-contract"] ?? TIMELINE_SOURCE_CONTRACT
      }
      data-viz-manim-timeline-step-count={manimEvidenceAttributes?.["data-viz-manim-timeline-step-count"] ?? "0"}
      data-viz-manim-timeline-step-type-summary={
        manimEvidenceAttributes?.["data-viz-manim-timeline-step-type-summary"] ?? "none"
      }
      data-viz-manim-timeline-summary={
        manimEvidenceAttributes?.["data-viz-manim-timeline-summary"] ??
        "timeline:steps=0:duration=0.000:elapsed=0.000:active=none#-1:completed=0:pending=0:wait=0:camera=0:reduced=false:skip=false"
      }
      data-viz-manim-timeline-total-duration={
        manimEvidenceAttributes?.["data-viz-manim-timeline-total-duration"] ?? "0.000"
      }
      data-viz-manim-timeline-wait-step-count={
        manimEvidenceAttributes?.["data-viz-manim-timeline-wait-step-count"] ?? "0"
      }
      data-viz-mobject-uniforms-changed-count={manimEvidenceAttributes?.["data-viz-mobject-uniforms-changed-count"] ?? "0"}
      data-viz-vmobject-bezier-path-count={
        manimEvidenceAttributes?.["data-viz-vmobject-bezier-path-count"] ?? runtimeDiagnostics.vmobjectBezierPathCount
      }
      data-viz-vmobject-bezier-segment-count={
        manimEvidenceAttributes?.["data-viz-vmobject-bezier-segment-count"] ?? runtimeDiagnostics.vmobjectBezierSegmentCount
      }
      data-viz-vmobject-bezier-cubic-segment-count={
        manimEvidenceAttributes?.["data-viz-vmobject-bezier-cubic-segment-count"] ?? runtimeDiagnostics.vmobjectBezierCubicSegmentCount
      }
      data-viz-vmobject-bezier-anchor-count={
        manimEvidenceAttributes?.["data-viz-vmobject-bezier-anchor-count"] ?? runtimeDiagnostics.vmobjectBezierAnchorCount
      }
      data-viz-vmobject-bezier-handle-count={
        manimEvidenceAttributes?.["data-viz-vmobject-bezier-handle-count"] ?? runtimeDiagnostics.vmobjectBezierHandleCount
      }
      data-viz-vmobject-bezier-sample-count={
        manimEvidenceAttributes?.["data-viz-vmobject-bezier-sample-count"] ?? runtimeDiagnostics.vmobjectBezierSamplePointCount
      }
      data-viz-vmobject-bezier-source-contract={
        manimEvidenceAttributes?.["data-viz-vmobject-bezier-source-contract"] ?? VMOBJECT_BEZIER_PATH_SOURCE_CONTRACT
      }
      data-viz-vmobject-bezier-summary={
        manimEvidenceAttributes?.["data-viz-vmobject-bezier-summary"] ?? runtimeDiagnostics.vmobjectBezierSummary
      }
      data-viz-vmobject-path-builder-add-cubic-bezier-count={
        manimEvidenceAttributes?.["data-viz-vmobject-path-builder-add-cubic-bezier-count"] ?? "0"
      }
      data-viz-vmobject-path-builder-add-line-to-count={
        manimEvidenceAttributes?.["data-viz-vmobject-path-builder-add-line-to-count"] ?? "0"
      }
      data-viz-vmobject-path-builder-anchor-point-count={
        manimEvidenceAttributes?.["data-viz-vmobject-path-builder-anchor-point-count"] ?? "0"
      }
      data-viz-vmobject-path-builder-close-path-count={
        manimEvidenceAttributes?.["data-viz-vmobject-path-builder-close-path-count"] ?? "0"
      }
      data-viz-vmobject-path-builder-closed-path-count={
        manimEvidenceAttributes?.["data-viz-vmobject-path-builder-closed-path-count"] ?? "0"
      }
      data-viz-vmobject-path-builder-command-count={
        manimEvidenceAttributes?.["data-viz-vmobject-path-builder-command-count"] ?? "0"
      }
      data-viz-vmobject-path-builder-cubic-segment-count={
        manimEvidenceAttributes?.["data-viz-vmobject-path-builder-cubic-segment-count"] ?? "0"
      }
      data-viz-vmobject-path-builder-handle-point-count={
        manimEvidenceAttributes?.["data-viz-vmobject-path-builder-handle-point-count"] ?? "0"
      }
      data-viz-vmobject-path-builder-line-segment-count={
        manimEvidenceAttributes?.["data-viz-vmobject-path-builder-line-segment-count"] ?? "0"
      }
      data-viz-vmobject-path-builder-operation-summary={
        manimEvidenceAttributes?.["data-viz-vmobject-path-builder-operation-summary"] ??
        "addCubicBezierCurveTo=0;addLineTo=0;closePath=0;setPointsAsCorners=0;startNewPath=0"
      }
      data-viz-vmobject-path-builder-path-count={
        manimEvidenceAttributes?.["data-viz-vmobject-path-builder-path-count"] ?? "0"
      }
      data-viz-vmobject-path-builder-path-ids={
        manimEvidenceAttributes?.["data-viz-vmobject-path-builder-path-ids"] ?? "none"
      }
      data-viz-vmobject-path-builder-set-points-as-corners-count={
        manimEvidenceAttributes?.["data-viz-vmobject-path-builder-set-points-as-corners-count"] ?? "0"
      }
      data-viz-vmobject-path-builder-signature={
        manimEvidenceAttributes?.["data-viz-vmobject-path-builder-signature"] ?? "none"
      }
      data-viz-vmobject-path-builder-source-contract={
        manimEvidenceAttributes?.["data-viz-vmobject-path-builder-source-contract"] ?? VMOBJECT_PATH_BUILDER_SOURCE_CONTRACT
      }
      data-viz-vmobject-path-builder-start-new-path-count={
        manimEvidenceAttributes?.["data-viz-vmobject-path-builder-start-new-path-count"] ?? "0"
      }
      data-viz-vmobject-path-builder-summary={
        manimEvidenceAttributes?.["data-viz-vmobject-path-builder-summary"] ??
        "vmobject-path-builder:paths=0:commands=0:start=0:line=0:cubic=0:close=0:corners=0:segments=0:closed=0:ids=none"
      }
      data-viz-vmobject-smooth-path-anchor-point-count={
        manimEvidenceAttributes?.["data-viz-vmobject-smooth-path-anchor-point-count"] ?? "0"
      }
      data-viz-vmobject-smooth-path-change-anchor-mode-count={
        manimEvidenceAttributes?.["data-viz-vmobject-smooth-path-change-anchor-mode-count"] ?? "0"
      }
      data-viz-vmobject-smooth-path-command-count={
        manimEvidenceAttributes?.["data-viz-vmobject-smooth-path-command-count"] ?? "0"
      }
      data-viz-vmobject-smooth-path-continuity-pass-count={
        manimEvidenceAttributes?.["data-viz-vmobject-smooth-path-continuity-pass-count"] ?? "0"
      }
      data-viz-vmobject-smooth-path-count={
        manimEvidenceAttributes?.["data-viz-vmobject-smooth-path-count"] ?? "0"
      }
      data-viz-vmobject-smooth-path-cubic-segment-count={
        manimEvidenceAttributes?.["data-viz-vmobject-smooth-path-cubic-segment-count"] ?? "0"
      }
      data-viz-vmobject-smooth-path-handle-point-count={
        manimEvidenceAttributes?.["data-viz-vmobject-smooth-path-handle-point-count"] ?? "0"
      }
      data-viz-vmobject-smooth-path-ids={
        manimEvidenceAttributes?.["data-viz-vmobject-smooth-path-ids"] ?? "none"
      }
      data-viz-vmobject-smooth-path-insert-n-curves-count={
        manimEvidenceAttributes?.["data-viz-vmobject-smooth-path-insert-n-curves-count"] ?? "0"
      }
      data-viz-vmobject-smooth-path-make-smooth-count={
        manimEvidenceAttributes?.["data-viz-vmobject-smooth-path-make-smooth-count"] ?? "0"
      }
      data-viz-vmobject-smooth-path-max-handle-length={
        manimEvidenceAttributes?.["data-viz-vmobject-smooth-path-max-handle-length"] ?? "0.000"
      }
      data-viz-vmobject-smooth-path-operation-summary={
        manimEvidenceAttributes?.["data-viz-vmobject-smooth-path-operation-summary"] ??
        "setPointsSmoothly=0;makeSmooth=0;changeAnchorMode=0;insertNCurves=0"
      }
      data-viz-vmobject-smooth-path-set-points-smoothly-count={
        manimEvidenceAttributes?.["data-viz-vmobject-smooth-path-set-points-smoothly-count"] ?? "0"
      }
      data-viz-vmobject-smooth-path-signature={
        manimEvidenceAttributes?.["data-viz-vmobject-smooth-path-signature"] ?? "none"
      }
      data-viz-vmobject-smooth-path-smoothing-mode-summary={
        manimEvidenceAttributes?.["data-viz-vmobject-smooth-path-smoothing-mode-summary"] ?? "none"
      }
      data-viz-vmobject-smooth-path-source-contract={
        manimEvidenceAttributes?.["data-viz-vmobject-smooth-path-source-contract"] ?? VMOBJECT_SMOOTH_PATH_SOURCE_CONTRACT
      }
      data-viz-vmobject-smooth-path-summary={
        manimEvidenceAttributes?.["data-viz-vmobject-smooth-path-summary"] ??
        "vmobject-smooth-path:paths=0:commands=0:cubic=0:anchors=0:handles=0:continuity=0:maxHandle=0.000:ids=none"
      }
      data-viz-vmobject-fill-count={manimEvidenceAttributes?.["data-viz-vmobject-fill-count"] ?? runtimeDiagnostics.vmobjectFillCount}
      data-viz-vmobject-max-stroke-width={
        manimEvidenceAttributes?.["data-viz-vmobject-max-stroke-width"] ?? runtimeDiagnostics.vmobjectMaxStrokeWidth.toFixed(2)
      }
      data-viz-vmobject-max-anti-alias-width={
        manimEvidenceAttributes?.["data-viz-vmobject-max-anti-alias-width"] ?? runtimeDiagnostics.vmobjectMaxAntiAliasWidth.toFixed(2)
      }
      data-viz-vmobject-max-joint-angle={
        manimEvidenceAttributes?.["data-viz-vmobject-max-joint-angle"] ?? runtimeDiagnostics.vmobjectMaxJointAngleDegrees.toFixed(2)
      }
      data-viz-vmobject-base-normal-object-ids={
        manimEvidenceAttributes?.["data-viz-vmobject-base-normal-object-ids"] ?? runtimeDiagnostics.vmobjectBaseNormalObjectIds
      }
      data-viz-vmobject-min-stroke-opacity={
        manimEvidenceAttributes?.["data-viz-vmobject-min-stroke-opacity"] ?? runtimeDiagnostics.vmobjectMinStrokeOpacity.toFixed(2)
      }
      data-viz-vmobject-stroke-zoom-screen-space-count={
        manimEvidenceAttributes?.["data-viz-vmobject-stroke-zoom-screen-space-count"] ?? runtimeDiagnostics.vmobjectStrokeZoomScreenSpaceCount
      }
      data-viz-vmobject-stroke-zoom-world-space-count={
        manimEvidenceAttributes?.["data-viz-vmobject-stroke-zoom-world-space-count"] ?? runtimeDiagnostics.vmobjectStrokeZoomWorldSpaceCount
      }
      data-viz-vmobject-style-count={manimEvidenceAttributes?.["data-viz-vmobject-style-count"] ?? runtimeDiagnostics.vmobjectStyleCount}
      data-viz-vmobject-style-object-ids={manimEvidenceAttributes?.["data-viz-vmobject-style-object-ids"] ?? runtimeDiagnostics.vmobjectStyleObjectIds}
      data-viz-vmobject-style-summary={manimEvidenceAttributes?.["data-viz-vmobject-style-summary"] ?? runtimeDiagnostics.vmobjectStyleSummary}
      data-viz-vmobject-transparent-stroke-count={
        manimEvidenceAttributes?.["data-viz-vmobject-transparent-stroke-count"] ?? runtimeDiagnostics.vmobjectTransparentStrokeCount
      }
      data-viz-mobject-unknown-invalidation-count={
        manimEvidenceAttributes?.["data-viz-mobject-unknown-invalidation-count"] ?? runtimeDiagnostics.mobjectUnknownInvalidationCount
      }
      data-viz-mobject-updater-active-invalidation-count={
        manimEvidenceAttributes?.["data-viz-mobject-updater-active-invalidation-count"] ?? runtimeDiagnostics.mobjectUpdaterActiveInvalidationCount
      }
      data-viz-object-count={manimEvidenceAttributes?.["data-viz-object-count"] ?? runtimeDiagnostics.objectCount}
      data-viz-manim-ode-trajectory-count={
        manimEvidenceAttributes?.["data-viz-manim-ode-trajectory-count"] ?? runtimeDiagnostics.odeTrajectoryCount
      }
      data-viz-manim-ode-sample-count={manimEvidenceAttributes?.["data-viz-manim-ode-sample-count"] ?? runtimeDiagnostics.odeTrajectorySampleCount}
      data-viz-manim-ode-finite-sample-count={
        manimEvidenceAttributes?.["data-viz-manim-ode-finite-sample-count"] ?? runtimeDiagnostics.odeTrajectoryFiniteSampleCount
      }
      data-viz-manim-ode-bounds-summary={
        manimEvidenceAttributes?.["data-viz-manim-ode-bounds-summary"] ?? runtimeDiagnostics.odeTrajectoryBoundsSummary
      }
      data-viz-manim-ode-initial-state-summary={
        manimEvidenceAttributes?.["data-viz-manim-ode-initial-state-summary"] ?? runtimeDiagnostics.odeTrajectoryInitialStateSummary
      }
      data-viz-manim-ode-method-ids={manimEvidenceAttributes?.["data-viz-manim-ode-method-ids"] ?? runtimeDiagnostics.odeTrajectoryMethodIds}
      data-viz-manim-ode-object-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-ode-object-source-contract"] ?? ODE_TRAJECTORY_OBJECT_BRIDGE_SOURCE_CONTRACT
      }
      data-viz-manim-ode-stopped-count={
        manimEvidenceAttributes?.["data-viz-manim-ode-stopped-count"] ?? runtimeDiagnostics.odeTrajectoryStoppedCount
      }
      data-viz-manim-ode-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-ode-source-contract"] ?? ODE_TRAJECTORY_SOURCE_CONTRACT
      }
      data-viz-manim-ode-solver-contract={
        manimEvidenceAttributes?.["data-viz-manim-ode-solver-contract"] ?? runtimeDiagnostics.odeTrajectorySolverContract
      }
      data-viz-manim-ode-step-count-summary={
        manimEvidenceAttributes?.["data-viz-manim-ode-step-count-summary"] ?? runtimeDiagnostics.odeTrajectoryStepCountSummary
      }
      data-viz-manim-ode-step-size-summary={
        manimEvidenceAttributes?.["data-viz-manim-ode-step-size-summary"] ?? runtimeDiagnostics.odeTrajectoryStepSizeSummary
      }
      data-viz-manim-ode-stopped-reason-summary={
        manimEvidenceAttributes?.["data-viz-manim-ode-stopped-reason-summary"] ?? runtimeDiagnostics.odeTrajectoryStoppedReasonSummary
      }
      data-viz-manim-ode-tail-sample-count={
        manimEvidenceAttributes?.["data-viz-manim-ode-tail-sample-count"] ?? runtimeDiagnostics.odeTrajectoryTailSampleCount
      }
      data-viz-manim-ode-system-summary={
        manimEvidenceAttributes?.["data-viz-manim-ode-system-summary"] ?? runtimeDiagnostics.odeTrajectorySystemSummary
      }
      data-viz-manim-ode-time-range-summary={
        manimEvidenceAttributes?.["data-viz-manim-ode-time-range-summary"] ?? runtimeDiagnostics.odeTrajectoryTimeRangeSummary
      }
      data-viz-manim-ode-summary={manimEvidenceAttributes?.["data-viz-manim-ode-summary"] ?? runtimeDiagnostics.odeTrajectorySummary}
      data-viz-manim-vector-field-arrow-count={
        manimEvidenceAttributes?.["data-viz-manim-vector-field-arrow-count"] ?? runtimeDiagnostics.vectorFieldArrowCount
      }
      data-viz-manim-vector-field-arrow-length-range={
        manimEvidenceAttributes?.["data-viz-manim-vector-field-arrow-length-range"] ?? runtimeDiagnostics.vectorFieldArrowLengthRange
      }
      data-viz-manim-vector-field-color-band-summary={
        manimEvidenceAttributes?.["data-viz-manim-vector-field-color-band-summary"] ?? runtimeDiagnostics.vectorFieldColorBandSummary
      }
      data-viz-manim-vector-field-coordinate-mode-summary={
        manimEvidenceAttributes?.["data-viz-manim-vector-field-coordinate-mode-summary"] ?? runtimeDiagnostics.vectorFieldCoordinateModeSummary
      }
      data-viz-manim-vector-field-count={
        manimEvidenceAttributes?.["data-viz-manim-vector-field-count"] ?? runtimeDiagnostics.vectorFieldCount
      }
      data-viz-manim-vector-field-finite-arrow-length-count={
        manimEvidenceAttributes?.["data-viz-manim-vector-field-finite-arrow-length-count"] ??
        runtimeDiagnostics.vectorFieldFiniteArrowLengthCount
      }
      data-viz-manim-vector-field-finite-vector-count={
        manimEvidenceAttributes?.["data-viz-manim-vector-field-finite-vector-count"] ?? runtimeDiagnostics.vectorFieldFiniteVectorCount
      }
      data-viz-manim-vector-field-high-band-count={
        manimEvidenceAttributes?.["data-viz-manim-vector-field-high-band-count"] ?? runtimeDiagnostics.vectorFieldHighBandCount
      }
      data-viz-manim-vector-field-length-encoding-monotonic={
        manimEvidenceAttributes?.["data-viz-manim-vector-field-length-encoding-monotonic"] ??
        String(runtimeDiagnostics.vectorFieldLengthEncodingMonotonic)
      }
      data-viz-manim-vector-field-length-encoding-summary={
        manimEvidenceAttributes?.["data-viz-manim-vector-field-length-encoding-summary"] ??
        runtimeDiagnostics.vectorFieldLengthEncodingSummary
      }
      data-viz-manim-vector-field-low-band-count={
        manimEvidenceAttributes?.["data-viz-manim-vector-field-low-band-count"] ?? runtimeDiagnostics.vectorFieldLowBandCount
      }
      data-viz-manim-vector-field-max-magnitude={
        manimEvidenceAttributes?.["data-viz-manim-vector-field-max-magnitude"] ?? runtimeDiagnostics.vectorFieldMaxMagnitude.toFixed(3)
      }
      data-viz-manim-vector-field-mid-band-count={
        manimEvidenceAttributes?.["data-viz-manim-vector-field-mid-band-count"] ?? runtimeDiagnostics.vectorFieldMidBandCount
      }
      data-viz-manim-vector-field-sample-count={
        manimEvidenceAttributes?.["data-viz-manim-vector-field-sample-count"] ?? runtimeDiagnostics.vectorFieldSampleCount
      }
      data-viz-manim-vector-field-sample-grid-summary={
        manimEvidenceAttributes?.["data-viz-manim-vector-field-sample-grid-summary"] ?? runtimeDiagnostics.vectorFieldSampleGridSummary
      }
      data-viz-manim-vector-field-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-vector-field-source-contract"] ?? VECTOR_FIELD_SOURCE_CONTRACT
      }
      data-viz-manim-vector-field-summary={
        manimEvidenceAttributes?.["data-viz-manim-vector-field-summary"] ?? runtimeDiagnostics.vectorFieldSummary
      }
      data-viz-manim-vector-field-system-summary={
        manimEvidenceAttributes?.["data-viz-manim-vector-field-system-summary"] ?? runtimeDiagnostics.vectorFieldSystemSummary
      }
      data-viz-manim-vector-field-zero-band-count={
        manimEvidenceAttributes?.["data-viz-manim-vector-field-zero-band-count"] ?? runtimeDiagnostics.vectorFieldZeroBandCount
      }
      data-viz-manim-vector-field-zero-vector-count={
        manimEvidenceAttributes?.["data-viz-manim-vector-field-zero-vector-count"] ?? runtimeDiagnostics.vectorFieldZeroVectorCount
      }
      data-viz-manim-move-along-vector-field-blocked-count={
        manimEvidenceAttributes?.["data-viz-manim-move-along-vector-field-blocked-count"] ?? "0"
      }
      data-viz-manim-move-along-vector-field-coordinate-modes={
        manimEvidenceAttributes?.["data-viz-manim-move-along-vector-field-coordinate-modes"] ?? "none"
      }
      data-viz-manim-move-along-vector-field-count={manimEvidenceAttributes?.["data-viz-manim-move-along-vector-field-count"] ?? "0"}
      data-viz-manim-move-along-vector-field-delta-summary={
        manimEvidenceAttributes?.["data-viz-manim-move-along-vector-field-delta-summary"] ?? "none"
      }
      data-viz-manim-move-along-vector-field-displacement-magnitude-range={
        manimEvidenceAttributes?.["data-viz-manim-move-along-vector-field-displacement-magnitude-range"] ?? "none"
      }
      data-viz-manim-move-along-vector-field-finite-displacement-count={
        manimEvidenceAttributes?.["data-viz-manim-move-along-vector-field-finite-displacement-count"] ?? "0"
      }
      data-viz-manim-move-along-vector-field-finite-vector-count={
        manimEvidenceAttributes?.["data-viz-manim-move-along-vector-field-finite-vector-count"] ?? "0"
      }
      data-viz-manim-move-along-vector-field-ids={manimEvidenceAttributes?.["data-viz-manim-move-along-vector-field-ids"] ?? "none"}
      data-viz-manim-move-along-vector-field-moved-count={
        manimEvidenceAttributes?.["data-viz-manim-move-along-vector-field-moved-count"] ?? "0"
      }
      data-viz-manim-move-along-vector-field-object-ids={
        manimEvidenceAttributes?.["data-viz-manim-move-along-vector-field-object-ids"] ?? "none"
      }
      data-viz-manim-move-along-vector-field-speed-summary={
        manimEvidenceAttributes?.["data-viz-manim-move-along-vector-field-speed-summary"] ?? "none"
      }
      data-viz-manim-move-along-vector-field-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-move-along-vector-field-source-contract"] ??
        MOVE_ALONG_VECTOR_FIELD_SOURCE_CONTRACT
      }
      data-viz-manim-move-along-vector-field-status-summary={
        manimEvidenceAttributes?.["data-viz-manim-move-along-vector-field-status-summary"] ??
        "moved=0;missing-anchor=0;non-finite-vector=0;out-of-bounds=0"
      }
      data-viz-manim-move-along-vector-field-summary={
        manimEvidenceAttributes?.["data-viz-manim-move-along-vector-field-summary"] ??
        "moveAlongVectorField:updaters=0:moved=0:blocked=0:finiteVectors=0:finiteDisplacements=0:ids=none:objects=none:modes=none:vector=none:displacement=none"
      }
      data-viz-manim-move-along-vector-field-vector-magnitude-range={
        manimEvidenceAttributes?.["data-viz-manim-move-along-vector-field-vector-magnitude-range"] ?? "none"
      }
      data-viz-manim-stream-line-completed-line-count={
        manimEvidenceAttributes?.["data-viz-manim-stream-line-completed-line-count"] ?? runtimeDiagnostics.streamLineCompletedLineCount
      }
      data-viz-manim-stream-line-count={manimEvidenceAttributes?.["data-viz-manim-stream-line-count"] ?? runtimeDiagnostics.streamLineCount}
      data-viz-manim-stream-line-animated-window-count={
        manimEvidenceAttributes?.["data-viz-manim-stream-line-animated-window-count"] ?? runtimeDiagnostics.streamLineAnimatedWindowCount
      }
      data-viz-manim-stream-line-coordinate-mode-summary={
        manimEvidenceAttributes?.["data-viz-manim-stream-line-coordinate-mode-summary"] ?? runtimeDiagnostics.streamLineCoordinateModeSummary
      }
      data-viz-manim-stream-line-cycle-seconds-summary={
        manimEvidenceAttributes?.["data-viz-manim-stream-line-cycle-seconds-summary"] ?? runtimeDiagnostics.streamLineCycleSecondsSummary
      }
      data-viz-manim-stream-line-frame-phase-order={
        manimEvidenceAttributes?.["data-viz-manim-stream-line-frame-phase-order"] ?? runtimeDiagnostics.streamLineFramePhaseOrder
      }
      data-viz-manim-stream-line-frame-plan-segment-count={
        manimEvidenceAttributes?.["data-viz-manim-stream-line-frame-plan-segment-count"] ??
        runtimeDiagnostics.streamLineFramePlanSegmentCount
      }
      data-viz-manim-stream-line-frame-plan-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-stream-line-frame-plan-source-contract"] ??
        runtimeDiagnostics.streamLineFramePlanSourceContract
      }
      data-viz-manim-stream-line-frame-plan-visible-line-count={
        manimEvidenceAttributes?.["data-viz-manim-stream-line-frame-plan-visible-line-count"] ??
        runtimeDiagnostics.streamLineFramePlanVisibleLineCount
      }
      data-viz-manim-stream-line-frame-finite-visible-length-count={
        manimEvidenceAttributes?.["data-viz-manim-stream-line-frame-finite-visible-length-count"] ??
        runtimeDiagnostics.streamLineFrameFiniteVisibleLengthCount
      }
      data-viz-manim-stream-line-frame-visible-length-range={
        manimEvidenceAttributes?.["data-viz-manim-stream-line-frame-visible-length-range"] ??
        runtimeDiagnostics.streamLineFrameVisibleLengthRange
      }
      data-viz-manim-stream-line-frame-visible-length-summary={
        manimEvidenceAttributes?.["data-viz-manim-stream-line-frame-visible-length-summary"] ??
        runtimeDiagnostics.streamLineFrameVisibleLengthSummary
      }
      data-viz-manim-stream-line-frame-window-range-summary={
        manimEvidenceAttributes?.["data-viz-manim-stream-line-frame-window-range-summary"] ??
        runtimeDiagnostics.streamLineFrameWindowRangeSummary
      }
      data-viz-manim-stream-line-integration-step-summary={
        manimEvidenceAttributes?.["data-viz-manim-stream-line-integration-step-summary"] ?? runtimeDiagnostics.streamLineIntegrationStepSummary
      }
      data-viz-manim-stream-line-object-count={
        manimEvidenceAttributes?.["data-viz-manim-stream-line-object-count"] ?? runtimeDiagnostics.streamLineObjectCount
      }
      data-viz-manim-stream-line-phase-offset-range={
        manimEvidenceAttributes?.["data-viz-manim-stream-line-phase-offset-range"] ?? runtimeDiagnostics.streamLinePhaseOffsetRange
      }
      data-viz-manim-stream-line-point-count={
        manimEvidenceAttributes?.["data-viz-manim-stream-line-point-count"] ?? runtimeDiagnostics.streamLinePointCount
      }
      data-viz-manim-stream-line-reveal-window-summary={
        manimEvidenceAttributes?.["data-viz-manim-stream-line-reveal-window-summary"] ?? runtimeDiagnostics.streamLineRevealWindowSummary
      }
      data-viz-manim-stream-line-seed-grid-summary={
        manimEvidenceAttributes?.["data-viz-manim-stream-line-seed-grid-summary"] ?? runtimeDiagnostics.streamLineSeedGridSummary
      }
      data-viz-manim-stream-line-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-stream-line-source-contract"] ?? STREAM_LINE_SOURCE_CONTRACT
      }
      data-viz-manim-stream-line-set-count={
        manimEvidenceAttributes?.["data-viz-manim-stream-line-set-count"] ?? runtimeDiagnostics.streamLineSetCount
      }
      data-viz-manim-stream-line-stopped-line-count={
        manimEvidenceAttributes?.["data-viz-manim-stream-line-stopped-line-count"] ?? runtimeDiagnostics.streamLineStoppedLineCount
      }
      data-viz-manim-stream-line-summary={manimEvidenceAttributes?.["data-viz-manim-stream-line-summary"] ?? runtimeDiagnostics.streamLineSummary}
      data-viz-manim-stream-line-system-summary={
        manimEvidenceAttributes?.["data-viz-manim-stream-line-system-summary"] ?? runtimeDiagnostics.streamLineSystemSummary
      }
      data-viz-manim-stream-line-visible-point-count={
        manimEvidenceAttributes?.["data-viz-manim-stream-line-visible-point-count"] ?? runtimeDiagnostics.streamLineVisiblePointCount
      }
      data-viz-manim-stream-line-visible-progress-summary={
        manimEvidenceAttributes?.["data-viz-manim-stream-line-visible-progress-summary"] ??
        runtimeDiagnostics.streamLineVisibleProgressSummary
      }
      data-viz-manim-stream-line-wrapped-window-count={
        manimEvidenceAttributes?.["data-viz-manim-stream-line-wrapped-window-count"] ?? runtimeDiagnostics.streamLineWrappedWindowCount
      }
      data-viz-parameter-tracker-count={manimEvidenceAttributes?.["data-viz-parameter-tracker-count"] ?? runtimeDiagnostics.parameterTrackerCount}
      data-viz-parameter-tracker-ids={manimEvidenceAttributes?.["data-viz-parameter-tracker-ids"] ?? runtimeDiagnostics.parameterTrackerIds}
      data-viz-parameter-tracker-summary={manimEvidenceAttributes?.["data-viz-parameter-tracker-summary"] ?? runtimeDiagnostics.parameterTrackerSummary}
      data-viz-parameter-tracker-values={manimEvidenceAttributes?.["data-viz-parameter-tracker-values"] ?? runtimeDiagnostics.parameterTrackerValues}
      data-viz-reduced-motion={manimEvidenceAttributes?.["data-viz-reduced-motion"] ?? String(runtimeDiagnostics.reducedMotion)}
      data-viz-scene-fixed-in-frame-count={manimEvidenceAttributes?.["data-viz-scene-fixed-in-frame-count"] ?? runtimeDiagnostics.sceneFixedInFrameCount}
      data-viz-scene-fixed-in-frame-ids={manimEvidenceAttributes?.["data-viz-scene-fixed-in-frame-ids"] ?? runtimeDiagnostics.sceneFixedInFrameIds}
      data-viz-scene-foreground-count={manimEvidenceAttributes?.["data-viz-scene-foreground-count"] ?? runtimeDiagnostics.sceneForegroundCount}
      data-viz-scene-foreground-ids={manimEvidenceAttributes?.["data-viz-scene-foreground-ids"] ?? runtimeDiagnostics.sceneForegroundIds}
      data-viz-manim-runtime-graph-excluded-object-ids={
        manimRuntimeGraphFrameAttributes?.["data-viz-manim-runtime-graph-excluded-object-ids"] ?? "none"
      }
      data-viz-manim-runtime-graph-finite-bounding-box-count={
        manimRuntimeGraphFrameAttributes?.["data-viz-manim-runtime-graph-finite-bounding-box-count"] ?? "0"
      }
      data-viz-manim-runtime-graph-fixed-in-frame-ids={
        manimRuntimeGraphFrameAttributes?.["data-viz-manim-runtime-graph-fixed-in-frame-ids"] ?? "none"
      }
      data-viz-manim-runtime-graph-foreground-ids={manimRuntimeGraphFrameAttributes?.["data-viz-manim-runtime-graph-foreground-ids"] ?? "none"}
      data-viz-manim-runtime-graph-object-count={manimRuntimeGraphFrameAttributes?.["data-viz-manim-runtime-graph-object-count"] ?? "0"}
      data-viz-manim-runtime-graph-render-group-count={manimRuntimeGraphFrameAttributes?.["data-viz-manim-runtime-graph-render-group-count"] ?? "0"}
      data-viz-manim-runtime-graph-render-group-ids={manimRuntimeGraphFrameAttributes?.["data-viz-manim-runtime-graph-render-group-ids"] ?? "none"}
      data-viz-manim-runtime-graph-source-contract={
        manimRuntimeGraphFrameAttributes?.["data-viz-manim-runtime-graph-source-contract"] ??
        RUNTIME_SCENE_GRAPH_REFRESH_SOURCE_CONTRACT
      }
      data-viz-manim-runtime-graph-summary={
        manimRuntimeGraphFrameAttributes?.["data-viz-manim-runtime-graph-summary"] ??
        "runtime-graph:objects=0:top=none:render=none:foreground=none:fixed=none:finiteBounds=0:excluded=none"
      }
      data-viz-manim-runtime-graph-top-level-ids={manimRuntimeGraphFrameAttributes?.["data-viz-manim-runtime-graph-top-level-ids"] ?? "none"}
      data-viz-scene-membership-active-introducer-count={
        manimEvidenceAttributes?.["data-viz-scene-membership-active-introducer-count"] ?? runtimeDiagnostics.sceneMembershipActiveIntroducerCount
      }
      data-viz-scene-membership-active-introducer-ids={
        manimEvidenceAttributes?.["data-viz-scene-membership-active-introducer-ids"] ?? runtimeDiagnostics.sceneMembershipActiveIntroducerIds
      }
      data-viz-scene-membership-active-remover-count={
        manimEvidenceAttributes?.["data-viz-scene-membership-active-remover-count"] ?? runtimeDiagnostics.sceneMembershipActiveRemoverCount
      }
      data-viz-scene-membership-active-remover-ids={
        manimEvidenceAttributes?.["data-viz-scene-membership-active-remover-ids"] ?? runtimeDiagnostics.sceneMembershipActiveRemoverIds
      }
      data-viz-scene-membership-event-summary={
        manimEvidenceAttributes?.["data-viz-scene-membership-event-summary"] ?? runtimeDiagnostics.sceneMembershipEventSummary
      }
      data-viz-scene-membership-excluded-count={
        manimEvidenceAttributes?.["data-viz-scene-membership-excluded-count"] ?? runtimeDiagnostics.sceneMembershipExcludedCount
      }
      data-viz-scene-membership-excluded-ids={
        manimEvidenceAttributes?.["data-viz-scene-membership-excluded-ids"] ?? runtimeDiagnostics.sceneMembershipExcludedIds
      }
      data-viz-scene-membership-pending-introducer-count={
        manimEvidenceAttributes?.["data-viz-scene-membership-pending-introducer-count"] ?? runtimeDiagnostics.sceneMembershipPendingIntroducerCount
      }
      data-viz-scene-membership-pending-introducer-ids={
        manimEvidenceAttributes?.["data-viz-scene-membership-pending-introducer-ids"] ?? runtimeDiagnostics.sceneMembershipPendingIntroducerIds
      }
      data-viz-scene-membership-removed-count={
        manimEvidenceAttributes?.["data-viz-scene-membership-removed-count"] ?? runtimeDiagnostics.sceneMembershipRemovedCount
      }
      data-viz-scene-membership-removed-ids={
        manimEvidenceAttributes?.["data-viz-scene-membership-removed-ids"] ?? runtimeDiagnostics.sceneMembershipRemovedIds
      }
      data-viz-scene-membership-source-contract={
        manimEvidenceAttributes?.["data-viz-scene-membership-source-contract"] ??
        runtimeDiagnostics.sceneMembershipSourceContract ??
        SCENE_MEMBERSHIP_SOURCE_CONTRACT
      }
      data-viz-scene-membership-source-summary={
        manimEvidenceAttributes?.["data-viz-scene-membership-source-summary"] ?? runtimeDiagnostics.sceneMembershipSourceSummary
      }
      data-viz-scene-restructure-detached-root-count={
        manimEvidenceAttributes?.["data-viz-scene-restructure-detached-root-count"] ?? runtimeDiagnostics.sceneRestructureDetachedRootCount
      }
      data-viz-scene-restructure-detached-root-ids={
        manimEvidenceAttributes?.["data-viz-scene-restructure-detached-root-ids"] ?? runtimeDiagnostics.sceneRestructureDetachedRootIds
      }
      data-viz-scene-restructure-parent-count={
        manimEvidenceAttributes?.["data-viz-scene-restructure-parent-count"] ?? runtimeDiagnostics.sceneRestructureParentCount
      }
      data-viz-scene-restructure-parent-ids={
        manimEvidenceAttributes?.["data-viz-scene-restructure-parent-ids"] ?? runtimeDiagnostics.sceneRestructureParentIds
      }
      data-viz-scene-restructure-removed-count={
        manimEvidenceAttributes?.["data-viz-scene-restructure-removed-count"] ?? runtimeDiagnostics.sceneRestructureRemovedCount
      }
      data-viz-scene-restructure-removed-ids={
        manimEvidenceAttributes?.["data-viz-scene-restructure-removed-ids"] ?? runtimeDiagnostics.sceneRestructureRemovedIds
      }
      data-viz-scene-restructure-requested-count={
        manimEvidenceAttributes?.["data-viz-scene-restructure-requested-count"] ?? runtimeDiagnostics.sceneRestructureRequestedCount
      }
      data-viz-scene-restructure-requested-ids={
        manimEvidenceAttributes?.["data-viz-scene-restructure-requested-ids"] ?? runtimeDiagnostics.sceneRestructureRequestedIds
      }
      data-viz-scene-restructure-source-contract={
        manimEvidenceAttributes?.["data-viz-scene-restructure-source-contract"] ??
        runtimeDiagnostics.sceneRestructureSourceContract ??
        SCENE_RESTRUCTURE_SOURCE_CONTRACT
      }
      data-viz-scene-restructure-summary={
        manimEvidenceAttributes?.["data-viz-scene-restructure-summary"] ?? runtimeDiagnostics.sceneRestructureSummary
      }
      data-viz-scene-clear-mobject-after-fixed-in-frame-ids={
        manimEvidenceAttributes?.["data-viz-scene-clear-mobject-after-fixed-in-frame-ids"] ??
        runtimeDiagnostics.sceneClearMobjectAfterFixedInFrameIds
      }
      data-viz-scene-clear-mobject-after-foreground-ids={
        manimEvidenceAttributes?.["data-viz-scene-clear-mobject-after-foreground-ids"] ??
        runtimeDiagnostics.sceneClearMobjectAfterForegroundIds
      }
      data-viz-scene-clear-mobject-after-render-group-ids={
        manimEvidenceAttributes?.["data-viz-scene-clear-mobject-after-render-group-ids"] ??
        runtimeDiagnostics.sceneClearMobjectAfterRenderGroupIds
      }
      data-viz-scene-clear-mobject-after-scene-ids={
        manimEvidenceAttributes?.["data-viz-scene-clear-mobject-after-scene-ids"] ?? runtimeDiagnostics.sceneClearMobjectAfterSceneIds
      }
      data-viz-scene-clear-mobject-before-fixed-in-frame-ids={
        manimEvidenceAttributes?.["data-viz-scene-clear-mobject-before-fixed-in-frame-ids"] ??
        runtimeDiagnostics.sceneClearMobjectBeforeFixedInFrameIds
      }
      data-viz-scene-clear-mobject-before-foreground-ids={
        manimEvidenceAttributes?.["data-viz-scene-clear-mobject-before-foreground-ids"] ??
        runtimeDiagnostics.sceneClearMobjectBeforeForegroundIds
      }
      data-viz-scene-clear-mobject-before-render-group-ids={
        manimEvidenceAttributes?.["data-viz-scene-clear-mobject-before-render-group-ids"] ??
        runtimeDiagnostics.sceneClearMobjectBeforeRenderGroupIds
      }
      data-viz-scene-clear-mobject-before-scene-ids={
        manimEvidenceAttributes?.["data-viz-scene-clear-mobject-before-scene-ids"] ?? runtimeDiagnostics.sceneClearMobjectBeforeSceneIds
      }
      data-viz-scene-clear-mobject-cleared={
        manimEvidenceAttributes?.["data-viz-scene-clear-mobject-cleared"] ?? String(runtimeDiagnostics.sceneClearMobjectCleared)
      }
      data-viz-scene-clear-mobject-cleared-object-count={
        manimEvidenceAttributes?.["data-viz-scene-clear-mobject-cleared-object-count"] ??
        runtimeDiagnostics.sceneClearMobjectClearedObjectCount
      }
      data-viz-scene-clear-mobject-cleared-object-ids={
        manimEvidenceAttributes?.["data-viz-scene-clear-mobject-cleared-object-ids"] ??
        runtimeDiagnostics.sceneClearMobjectClearedObjectIds
      }
      data-viz-scene-clear-mobject-object-catalog-count={
        manimEvidenceAttributes?.["data-viz-scene-clear-mobject-object-catalog-count"] ??
        runtimeDiagnostics.sceneClearMobjectObjectCatalogCount
      }
      data-viz-scene-clear-mobject-source-contract={
        manimEvidenceAttributes?.["data-viz-scene-clear-mobject-source-contract"] ??
        runtimeDiagnostics.sceneClearMobjectSourceContract ??
        SCENE_CLEAR_MOBJECT_BRIDGE_SOURCE_CONTRACT
      }
      data-viz-scene-clear-mobject-summary={
        manimEvidenceAttributes?.["data-viz-scene-clear-mobject-summary"] ?? runtimeDiagnostics.sceneClearMobjectSummary
      }
      data-viz-scene-remove-all-except-mobject-after-fixed-in-frame-ids={
        manimEvidenceAttributes?.["data-viz-scene-remove-all-except-mobject-after-fixed-in-frame-ids"] ??
        runtimeDiagnostics.sceneRemoveAllExceptMobjectAfterFixedInFrameIds
      }
      data-viz-scene-remove-all-except-mobject-after-foreground-ids={
        manimEvidenceAttributes?.["data-viz-scene-remove-all-except-mobject-after-foreground-ids"] ??
        runtimeDiagnostics.sceneRemoveAllExceptMobjectAfterForegroundIds
      }
      data-viz-scene-remove-all-except-mobject-after-render-group-ids={
        manimEvidenceAttributes?.["data-viz-scene-remove-all-except-mobject-after-render-group-ids"] ??
        runtimeDiagnostics.sceneRemoveAllExceptMobjectAfterRenderGroupIds
      }
      data-viz-scene-remove-all-except-mobject-after-scene-ids={
        manimEvidenceAttributes?.["data-viz-scene-remove-all-except-mobject-after-scene-ids"] ??
        runtimeDiagnostics.sceneRemoveAllExceptMobjectAfterSceneIds
      }
      data-viz-scene-remove-all-except-mobject-before-fixed-in-frame-ids={
        manimEvidenceAttributes?.["data-viz-scene-remove-all-except-mobject-before-fixed-in-frame-ids"] ??
        runtimeDiagnostics.sceneRemoveAllExceptMobjectBeforeFixedInFrameIds
      }
      data-viz-scene-remove-all-except-mobject-before-foreground-ids={
        manimEvidenceAttributes?.["data-viz-scene-remove-all-except-mobject-before-foreground-ids"] ??
        runtimeDiagnostics.sceneRemoveAllExceptMobjectBeforeForegroundIds
      }
      data-viz-scene-remove-all-except-mobject-before-render-group-ids={
        manimEvidenceAttributes?.["data-viz-scene-remove-all-except-mobject-before-render-group-ids"] ??
        runtimeDiagnostics.sceneRemoveAllExceptMobjectBeforeRenderGroupIds
      }
      data-viz-scene-remove-all-except-mobject-before-scene-ids={
        manimEvidenceAttributes?.["data-viz-scene-remove-all-except-mobject-before-scene-ids"] ??
        runtimeDiagnostics.sceneRemoveAllExceptMobjectBeforeSceneIds
      }
      data-viz-scene-remove-all-except-mobject-changed={
        manimEvidenceAttributes?.["data-viz-scene-remove-all-except-mobject-changed"] ??
        String(runtimeDiagnostics.sceneRemoveAllExceptMobjectChanged)
      }
      data-viz-scene-remove-all-except-mobject-kept-count={
        manimEvidenceAttributes?.["data-viz-scene-remove-all-except-mobject-kept-count"] ??
        runtimeDiagnostics.sceneRemoveAllExceptMobjectKeptCount
      }
      data-viz-scene-remove-all-except-mobject-kept-ids={
        manimEvidenceAttributes?.["data-viz-scene-remove-all-except-mobject-kept-ids"] ??
        runtimeDiagnostics.sceneRemoveAllExceptMobjectKeptIds
      }
      data-viz-scene-remove-all-except-mobject-object-catalog-count={
        manimEvidenceAttributes?.["data-viz-scene-remove-all-except-mobject-object-catalog-count"] ??
        runtimeDiagnostics.sceneRemoveAllExceptMobjectObjectCatalogCount
      }
      data-viz-scene-remove-all-except-mobject-removed-count={
        manimEvidenceAttributes?.["data-viz-scene-remove-all-except-mobject-removed-count"] ??
        runtimeDiagnostics.sceneRemoveAllExceptMobjectRemovedCount
      }
      data-viz-scene-remove-all-except-mobject-removed-ids={
        manimEvidenceAttributes?.["data-viz-scene-remove-all-except-mobject-removed-ids"] ??
        runtimeDiagnostics.sceneRemoveAllExceptMobjectRemovedIds
      }
      data-viz-scene-remove-all-except-mobject-requested-keep-ids={
        manimEvidenceAttributes?.["data-viz-scene-remove-all-except-mobject-requested-keep-ids"] ??
        runtimeDiagnostics.sceneRemoveAllExceptMobjectRequestedKeepIds
      }
      data-viz-scene-remove-all-except-mobject-source-contract={
        manimEvidenceAttributes?.["data-viz-scene-remove-all-except-mobject-source-contract"] ??
        runtimeDiagnostics.sceneRemoveAllExceptMobjectSourceContract ??
        SCENE_REMOVE_ALL_EXCEPT_MOBJECT_BRIDGE_SOURCE_CONTRACT
      }
      data-viz-scene-remove-all-except-mobject-summary={
        manimEvidenceAttributes?.["data-viz-scene-remove-all-except-mobject-summary"] ??
        runtimeDiagnostics.sceneRemoveAllExceptMobjectSummary
      }
      data-viz-scene-bring-to-front-mobject-after-fixed-in-frame-ids={
        manimEvidenceAttributes?.["data-viz-scene-bring-to-front-mobject-after-fixed-in-frame-ids"] ??
        runtimeDiagnostics.sceneBringToFrontMobjectAfterFixedInFrameIds
      }
      data-viz-scene-bring-to-front-mobject-after-foreground-ids={
        manimEvidenceAttributes?.["data-viz-scene-bring-to-front-mobject-after-foreground-ids"] ??
        runtimeDiagnostics.sceneBringToFrontMobjectAfterForegroundIds
      }
      data-viz-scene-bring-to-front-mobject-after-render-group-ids={
        manimEvidenceAttributes?.["data-viz-scene-bring-to-front-mobject-after-render-group-ids"] ??
        runtimeDiagnostics.sceneBringToFrontMobjectAfterRenderGroupIds
      }
      data-viz-scene-bring-to-front-mobject-after-scene-ids={
        manimEvidenceAttributes?.["data-viz-scene-bring-to-front-mobject-after-scene-ids"] ??
        runtimeDiagnostics.sceneBringToFrontMobjectAfterSceneIds
      }
      data-viz-scene-bring-to-front-mobject-before-fixed-in-frame-ids={
        manimEvidenceAttributes?.["data-viz-scene-bring-to-front-mobject-before-fixed-in-frame-ids"] ??
        runtimeDiagnostics.sceneBringToFrontMobjectBeforeFixedInFrameIds
      }
      data-viz-scene-bring-to-front-mobject-before-foreground-ids={
        manimEvidenceAttributes?.["data-viz-scene-bring-to-front-mobject-before-foreground-ids"] ??
        runtimeDiagnostics.sceneBringToFrontMobjectBeforeForegroundIds
      }
      data-viz-scene-bring-to-front-mobject-before-render-group-ids={
        manimEvidenceAttributes?.["data-viz-scene-bring-to-front-mobject-before-render-group-ids"] ??
        runtimeDiagnostics.sceneBringToFrontMobjectBeforeRenderGroupIds
      }
      data-viz-scene-bring-to-front-mobject-before-scene-ids={
        manimEvidenceAttributes?.["data-viz-scene-bring-to-front-mobject-before-scene-ids"] ??
        runtimeDiagnostics.sceneBringToFrontMobjectBeforeSceneIds
      }
      data-viz-scene-bring-to-front-mobject-group={
        manimEvidenceAttributes?.["data-viz-scene-bring-to-front-mobject-group"] ??
        runtimeDiagnostics.sceneBringToFrontMobjectGroup
      }
      data-viz-scene-bring-to-front-mobject-moved={
        manimEvidenceAttributes?.["data-viz-scene-bring-to-front-mobject-moved"] ??
        String(runtimeDiagnostics.sceneBringToFrontMobjectMoved)
      }
      data-viz-scene-bring-to-front-mobject-next-index={
        manimEvidenceAttributes?.["data-viz-scene-bring-to-front-mobject-next-index"] ??
        runtimeDiagnostics.sceneBringToFrontMobjectNextIndex
      }
      data-viz-scene-bring-to-front-mobject-object-id={
        manimEvidenceAttributes?.["data-viz-scene-bring-to-front-mobject-object-id"] ??
        runtimeDiagnostics.sceneBringToFrontMobjectObjectId
      }
      data-viz-scene-bring-to-front-mobject-previous-index={
        manimEvidenceAttributes?.["data-viz-scene-bring-to-front-mobject-previous-index"] ??
        runtimeDiagnostics.sceneBringToFrontMobjectPreviousIndex
      }
      data-viz-scene-bring-to-front-mobject-source-contract={
        manimEvidenceAttributes?.["data-viz-scene-bring-to-front-mobject-source-contract"] ??
        runtimeDiagnostics.sceneBringToFrontMobjectSourceContract ??
        SCENE_BRING_TO_FRONT_MOBJECT_BRIDGE_SOURCE_CONTRACT
      }
      data-viz-scene-bring-to-front-mobject-summary={
        manimEvidenceAttributes?.["data-viz-scene-bring-to-front-mobject-summary"] ??
        runtimeDiagnostics.sceneBringToFrontMobjectSummary
      }
      data-viz-scene-send-to-back-mobject-after-fixed-in-frame-ids={
        manimEvidenceAttributes?.["data-viz-scene-send-to-back-mobject-after-fixed-in-frame-ids"] ??
        runtimeDiagnostics.sceneSendToBackMobjectAfterFixedInFrameIds
      }
      data-viz-scene-send-to-back-mobject-after-foreground-ids={
        manimEvidenceAttributes?.["data-viz-scene-send-to-back-mobject-after-foreground-ids"] ??
        runtimeDiagnostics.sceneSendToBackMobjectAfterForegroundIds
      }
      data-viz-scene-send-to-back-mobject-after-render-group-ids={
        manimEvidenceAttributes?.["data-viz-scene-send-to-back-mobject-after-render-group-ids"] ??
        runtimeDiagnostics.sceneSendToBackMobjectAfterRenderGroupIds
      }
      data-viz-scene-send-to-back-mobject-after-scene-ids={
        manimEvidenceAttributes?.["data-viz-scene-send-to-back-mobject-after-scene-ids"] ??
        runtimeDiagnostics.sceneSendToBackMobjectAfterSceneIds
      }
      data-viz-scene-send-to-back-mobject-before-fixed-in-frame-ids={
        manimEvidenceAttributes?.["data-viz-scene-send-to-back-mobject-before-fixed-in-frame-ids"] ??
        runtimeDiagnostics.sceneSendToBackMobjectBeforeFixedInFrameIds
      }
      data-viz-scene-send-to-back-mobject-before-foreground-ids={
        manimEvidenceAttributes?.["data-viz-scene-send-to-back-mobject-before-foreground-ids"] ??
        runtimeDiagnostics.sceneSendToBackMobjectBeforeForegroundIds
      }
      data-viz-scene-send-to-back-mobject-before-render-group-ids={
        manimEvidenceAttributes?.["data-viz-scene-send-to-back-mobject-before-render-group-ids"] ??
        runtimeDiagnostics.sceneSendToBackMobjectBeforeRenderGroupIds
      }
      data-viz-scene-send-to-back-mobject-before-scene-ids={
        manimEvidenceAttributes?.["data-viz-scene-send-to-back-mobject-before-scene-ids"] ??
        runtimeDiagnostics.sceneSendToBackMobjectBeforeSceneIds
      }
      data-viz-scene-send-to-back-mobject-group={
        manimEvidenceAttributes?.["data-viz-scene-send-to-back-mobject-group"] ??
        runtimeDiagnostics.sceneSendToBackMobjectGroup
      }
      data-viz-scene-send-to-back-mobject-moved={
        manimEvidenceAttributes?.["data-viz-scene-send-to-back-mobject-moved"] ??
        String(runtimeDiagnostics.sceneSendToBackMobjectMoved)
      }
      data-viz-scene-send-to-back-mobject-next-index={
        manimEvidenceAttributes?.["data-viz-scene-send-to-back-mobject-next-index"] ??
        runtimeDiagnostics.sceneSendToBackMobjectNextIndex
      }
      data-viz-scene-send-to-back-mobject-object-id={
        manimEvidenceAttributes?.["data-viz-scene-send-to-back-mobject-object-id"] ??
        runtimeDiagnostics.sceneSendToBackMobjectObjectId
      }
      data-viz-scene-send-to-back-mobject-previous-index={
        manimEvidenceAttributes?.["data-viz-scene-send-to-back-mobject-previous-index"] ??
        runtimeDiagnostics.sceneSendToBackMobjectPreviousIndex
      }
      data-viz-scene-send-to-back-mobject-source-contract={
        manimEvidenceAttributes?.["data-viz-scene-send-to-back-mobject-source-contract"] ??
        runtimeDiagnostics.sceneSendToBackMobjectSourceContract ??
        SCENE_SEND_TO_BACK_MOBJECT_BRIDGE_SOURCE_CONTRACT
      }
      data-viz-scene-send-to-back-mobject-summary={
        manimEvidenceAttributes?.["data-viz-scene-send-to-back-mobject-summary"] ??
        runtimeDiagnostics.sceneSendToBackMobjectSummary
      }
      data-viz-scene-add-mobject-after-fixed-in-frame-ids={
        manimEvidenceAttributes?.["data-viz-scene-add-mobject-after-fixed-in-frame-ids"] ??
        runtimeDiagnostics.sceneAddMobjectAfterFixedInFrameIds
      }
      data-viz-scene-add-mobject-after-foreground-ids={
        manimEvidenceAttributes?.["data-viz-scene-add-mobject-after-foreground-ids"] ??
        runtimeDiagnostics.sceneAddMobjectAfterForegroundIds
      }
      data-viz-scene-add-mobject-after-render-group-ids={
        manimEvidenceAttributes?.["data-viz-scene-add-mobject-after-render-group-ids"] ??
        runtimeDiagnostics.sceneAddMobjectAfterRenderGroupIds
      }
      data-viz-scene-add-mobject-after-scene-ids={
        manimEvidenceAttributes?.["data-viz-scene-add-mobject-after-scene-ids"] ?? runtimeDiagnostics.sceneAddMobjectAfterSceneIds
      }
      data-viz-scene-add-mobject-before-fixed-in-frame-ids={
        manimEvidenceAttributes?.["data-viz-scene-add-mobject-before-fixed-in-frame-ids"] ??
        runtimeDiagnostics.sceneAddMobjectBeforeFixedInFrameIds
      }
      data-viz-scene-add-mobject-before-foreground-ids={
        manimEvidenceAttributes?.["data-viz-scene-add-mobject-before-foreground-ids"] ??
        runtimeDiagnostics.sceneAddMobjectBeforeForegroundIds
      }
      data-viz-scene-add-mobject-before-render-group-ids={
        manimEvidenceAttributes?.["data-viz-scene-add-mobject-before-render-group-ids"] ??
        runtimeDiagnostics.sceneAddMobjectBeforeRenderGroupIds
      }
      data-viz-scene-add-mobject-before-scene-ids={
        manimEvidenceAttributes?.["data-viz-scene-add-mobject-before-scene-ids"] ?? runtimeDiagnostics.sceneAddMobjectBeforeSceneIds
      }
      data-viz-scene-add-mobject-added={
        manimEvidenceAttributes?.["data-viz-scene-add-mobject-added"] ?? String(runtimeDiagnostics.sceneAddMobjectAdded)
      }
      data-viz-scene-add-mobject-group={
        manimEvidenceAttributes?.["data-viz-scene-add-mobject-group"] ?? runtimeDiagnostics.sceneAddMobjectGroup
      }
      data-viz-scene-add-mobject-object-id={
        manimEvidenceAttributes?.["data-viz-scene-add-mobject-object-id"] ?? runtimeDiagnostics.sceneAddMobjectObjectId
      }
      data-viz-scene-add-mobject-restored-family-count={
        manimEvidenceAttributes?.["data-viz-scene-add-mobject-restored-family-count"] ??
        runtimeDiagnostics.sceneAddMobjectRestoredFamilyCount
      }
      data-viz-scene-add-mobject-restored-family-ids={
        manimEvidenceAttributes?.["data-viz-scene-add-mobject-restored-family-ids"] ??
        runtimeDiagnostics.sceneAddMobjectRestoredFamilyIds
      }
      data-viz-scene-add-mobject-source-contract={
        manimEvidenceAttributes?.["data-viz-scene-add-mobject-source-contract"] ??
        runtimeDiagnostics.sceneAddMobjectSourceContract ??
        SCENE_ADD_MOBJECT_BRIDGE_SOURCE_CONTRACT
      }
      data-viz-scene-add-mobject-summary={
        manimEvidenceAttributes?.["data-viz-scene-add-mobject-summary"] ?? runtimeDiagnostics.sceneAddMobjectSummary
      }
      data-viz-scene-replace-mobject-after-render-group-ids={
        manimEvidenceAttributes?.["data-viz-scene-replace-mobject-after-render-group-ids"] ??
        runtimeDiagnostics.sceneReplaceMobjectAfterRenderGroupIds
      }
      data-viz-scene-replace-mobject-before-render-group-ids={
        manimEvidenceAttributes?.["data-viz-scene-replace-mobject-before-render-group-ids"] ??
        runtimeDiagnostics.sceneReplaceMobjectBeforeRenderGroupIds
      }
      data-viz-scene-replace-mobject-group={
        manimEvidenceAttributes?.["data-viz-scene-replace-mobject-group"] ?? runtimeDiagnostics.sceneReplaceMobjectGroup
      }
      data-viz-scene-replace-mobject-object-id={
        manimEvidenceAttributes?.["data-viz-scene-replace-mobject-object-id"] ?? runtimeDiagnostics.sceneReplaceMobjectObjectId
      }
      data-viz-scene-replace-mobject-removed-family-ids={
        manimEvidenceAttributes?.["data-viz-scene-replace-mobject-removed-family-ids"] ??
        runtimeDiagnostics.sceneReplaceMobjectRemovedFamilyIds
      }
      data-viz-scene-replace-mobject-replaced={
        manimEvidenceAttributes?.["data-viz-scene-replace-mobject-replaced"] ?? String(runtimeDiagnostics.sceneReplaceMobjectReplaced)
      }
      data-viz-scene-replace-mobject-replacement-count={
        manimEvidenceAttributes?.["data-viz-scene-replace-mobject-replacement-count"] ??
        runtimeDiagnostics.sceneReplaceMobjectReplacementCount
      }
      data-viz-scene-replace-mobject-replacement-ids={
        manimEvidenceAttributes?.["data-viz-scene-replace-mobject-replacement-ids"] ??
        runtimeDiagnostics.sceneReplaceMobjectReplacementIds
      }
      data-viz-scene-replace-mobject-requested-replacement-ids={
        manimEvidenceAttributes?.["data-viz-scene-replace-mobject-requested-replacement-ids"] ??
        runtimeDiagnostics.sceneReplaceMobjectRequestedReplacementIds
      }
      data-viz-scene-replace-mobject-restored-replacement-family-ids={
        manimEvidenceAttributes?.["data-viz-scene-replace-mobject-restored-replacement-family-ids"] ??
        runtimeDiagnostics.sceneReplaceMobjectRestoredReplacementFamilyIds
      }
      data-viz-scene-replace-mobject-source-contract={
        manimEvidenceAttributes?.["data-viz-scene-replace-mobject-source-contract"] ??
        runtimeDiagnostics.sceneReplaceMobjectSourceContract ??
        SCENE_REPLACE_MOBJECT_BRIDGE_SOURCE_CONTRACT
      }
      data-viz-scene-replace-mobject-summary={
        manimEvidenceAttributes?.["data-viz-scene-replace-mobject-summary"] ?? runtimeDiagnostics.sceneReplaceMobjectSummary
      }
      data-viz-scene-remove-mobject-after-fixed-in-frame-ids={
        manimEvidenceAttributes?.["data-viz-scene-remove-mobject-after-fixed-in-frame-ids"] ??
        runtimeDiagnostics.sceneRemoveMobjectAfterFixedInFrameIds
      }
      data-viz-scene-remove-mobject-after-foreground-ids={
        manimEvidenceAttributes?.["data-viz-scene-remove-mobject-after-foreground-ids"] ??
        runtimeDiagnostics.sceneRemoveMobjectAfterForegroundIds
      }
      data-viz-scene-remove-mobject-after-render-group-ids={
        manimEvidenceAttributes?.["data-viz-scene-remove-mobject-after-render-group-ids"] ??
        runtimeDiagnostics.sceneRemoveMobjectAfterRenderGroupIds
      }
      data-viz-scene-remove-mobject-after-scene-ids={
        manimEvidenceAttributes?.["data-viz-scene-remove-mobject-after-scene-ids"] ??
        runtimeDiagnostics.sceneRemoveMobjectAfterSceneIds
      }
      data-viz-scene-remove-mobject-before-fixed-in-frame-ids={
        manimEvidenceAttributes?.["data-viz-scene-remove-mobject-before-fixed-in-frame-ids"] ??
        runtimeDiagnostics.sceneRemoveMobjectBeforeFixedInFrameIds
      }
      data-viz-scene-remove-mobject-before-foreground-ids={
        manimEvidenceAttributes?.["data-viz-scene-remove-mobject-before-foreground-ids"] ??
        runtimeDiagnostics.sceneRemoveMobjectBeforeForegroundIds
      }
      data-viz-scene-remove-mobject-before-render-group-ids={
        manimEvidenceAttributes?.["data-viz-scene-remove-mobject-before-render-group-ids"] ??
        runtimeDiagnostics.sceneRemoveMobjectBeforeRenderGroupIds
      }
      data-viz-scene-remove-mobject-before-scene-ids={
        manimEvidenceAttributes?.["data-viz-scene-remove-mobject-before-scene-ids"] ??
        runtimeDiagnostics.sceneRemoveMobjectBeforeSceneIds
      }
      data-viz-scene-remove-mobject-descendant-removed-ids={
        manimEvidenceAttributes?.["data-viz-scene-remove-mobject-descendant-removed-ids"] ??
        runtimeDiagnostics.sceneRemoveMobjectDescendantRemovedIds
      }
      data-viz-scene-remove-mobject-object-id={
        manimEvidenceAttributes?.["data-viz-scene-remove-mobject-object-id"] ?? runtimeDiagnostics.sceneRemoveMobjectObjectId
      }
      data-viz-scene-remove-mobject-removed={
        manimEvidenceAttributes?.["data-viz-scene-remove-mobject-removed"] ?? String(runtimeDiagnostics.sceneRemoveMobjectRemoved)
      }
      data-viz-scene-remove-mobject-removed-family-count={
        manimEvidenceAttributes?.["data-viz-scene-remove-mobject-removed-family-count"] ??
        runtimeDiagnostics.sceneRemoveMobjectRemovedFamilyCount
      }
      data-viz-scene-remove-mobject-removed-family-ids={
        manimEvidenceAttributes?.["data-viz-scene-remove-mobject-removed-family-ids"] ??
        runtimeDiagnostics.sceneRemoveMobjectRemovedFamilyIds
      }
      data-viz-scene-remove-mobject-source-contract={
        manimEvidenceAttributes?.["data-viz-scene-remove-mobject-source-contract"] ??
        runtimeDiagnostics.sceneRemoveMobjectSourceContract ??
        SCENE_REMOVE_MOBJECT_BRIDGE_SOURCE_CONTRACT
      }
      data-viz-scene-remove-mobject-summary={
        manimEvidenceAttributes?.["data-viz-scene-remove-mobject-summary"] ?? runtimeDiagnostics.sceneRemoveMobjectSummary
      }
      data-viz-scene-render-group-count={manimEvidenceAttributes?.["data-viz-scene-render-group-count"] ?? runtimeDiagnostics.sceneRenderGroupCount}
      data-viz-scene-render-group-ids={manimEvidenceAttributes?.["data-viz-scene-render-group-ids"] ?? runtimeDiagnostics.sceneRenderGroupIds}
      data-viz-scene-render-group-overlap-count={
        manimEvidenceAttributes?.["data-viz-scene-render-group-overlap-count"] ?? runtimeDiagnostics.sceneRenderGroupOverlapCount
      }
      data-viz-scene-render-group-overlap-ids={manimEvidenceAttributes?.["data-viz-scene-render-group-overlap-ids"] ?? runtimeDiagnostics.sceneRenderGroupOverlapIds}
      data-viz-manim-render-batch-count={manimEvidenceAttributes?.["data-viz-manim-render-batch-count"] ?? "0"}
      data-viz-manim-render-batch-object-count={manimEvidenceAttributes?.["data-viz-manim-render-batch-object-count"] ?? "0"}
      data-viz-manim-render-batch-ids={manimEvidenceAttributes?.["data-viz-manim-render-batch-ids"] ?? "none"}
      data-viz-manim-render-batch-skipped-count={manimEvidenceAttributes?.["data-viz-manim-render-batch-skipped-count"] ?? "0"}
      data-viz-manim-render-batch-skipped-ids={manimEvidenceAttributes?.["data-viz-manim-render-batch-skipped-ids"] ?? "none"}
      data-viz-manim-render-batch-source-contract={
        manimEvidenceAttributes?.["data-viz-manim-render-batch-source-contract"] ??
        SCENE_RENDER_BATCH_SOURCE_CONTRACT
      }
      data-viz-manim-render-batch-summary={
        manimEvidenceAttributes?.["data-viz-manim-render-batch-summary"] ??
        "renderBatches:batches=0:objects=0:skipped=0:keys=none"
      }
      data-viz-scene-renderable-count={manimEvidenceAttributes?.["data-viz-scene-renderable-count"] ?? runtimeDiagnostics.sceneRenderableCount}
      data-viz-scene-renderable-ids={manimEvidenceAttributes?.["data-viz-scene-renderable-ids"] ?? runtimeDiagnostics.sceneRenderableIds}
      data-viz-scene-top-level-mobject-count={manimEvidenceAttributes?.["data-viz-scene-top-level-mobject-count"] ?? runtimeDiagnostics.sceneTopLevelMobjectCount}
      data-viz-semantic-binding-count={manimEvidenceAttributes?.["data-viz-semantic-binding-count"] ?? runtimeDiagnostics.semanticBindingCount}
      data-viz-semantic-binding-concept-ids={manimEvidenceAttributes?.["data-viz-semantic-binding-concept-ids"] ?? runtimeDiagnostics.semanticBindingConceptIds}
      data-viz-semantic-binding-source-contract={manimEvidenceAttributes?.["data-viz-semantic-binding-source-contract"] ?? FORMULA_BINDING_SOURCE_CONTRACT}
      data-viz-state-summary={state.stateSummary}
      data-viz-template-id={state.templateId}
      data-viz-three-webgl-status={threeDCanvasWebGLContract.readyStatus}
      data-viz-tracker-count={manimEvidenceAttributes?.["data-viz-tracker-count"] ?? runtimeDiagnostics.trackerCount}
      data-viz-updater-active-count={manimEvidenceAttributes?.["data-viz-updater-active-count"] ?? runtimeDiagnostics.updaterActiveCount}
      data-viz-updater-count={manimEvidenceAttributes?.["data-viz-updater-count"] ?? runtimeDiagnostics.updaterCount}
      data-viz-updater-suspension-policy={
        manimEvidenceAttributes?.["data-viz-updater-suspension-policy"] ?? UPDATER_SUSPENSION_POLICY
      }
      data-viz-updater-suspension-source-contract={
        manimEvidenceAttributes?.["data-viz-updater-suspension-source-contract"] ?? UPDATER_SUSPENSION_SOURCE_CONTRACT
      }
      data-viz-updater-suspended-count={manimEvidenceAttributes?.["data-viz-updater-suspended-count"] ?? runtimeDiagnostics.updaterSuspendedCount}
      data-viz-manim-updater-signature-count={manimUpdaterSignatureAttributes?.["data-viz-manim-updater-signature-count"] ?? "0"}
      data-viz-manim-updater-signature-call-signatures={
        manimUpdaterSignatureAttributes?.["data-viz-manim-updater-signature-call-signatures"] ?? "none"
      }
      data-viz-manim-updater-signature-dependency-count={
        manimUpdaterSignatureAttributes?.["data-viz-manim-updater-signature-dependency-count"] ?? "0"
      }
      data-viz-manim-updater-signature-dependency-ids={
        manimUpdaterSignatureAttributes?.["data-viz-manim-updater-signature-dependency-ids"] ?? "none"
      }
      data-viz-manim-updater-signature-dt-aware-count={
        manimUpdaterSignatureAttributes?.["data-viz-manim-updater-signature-dt-aware-count"] ?? "0"
      }
      data-viz-manim-updater-signature-dt-aware-ids={
        manimUpdaterSignatureAttributes?.["data-viz-manim-updater-signature-dt-aware-ids"] ?? "none"
      }
      data-viz-manim-updater-signature-receives-dt-ids={
        manimUpdaterSignatureAttributes?.["data-viz-manim-updater-signature-receives-dt-ids"] ?? "none"
      }
      data-viz-manim-updater-signature-receives-timeline-ids={
        manimUpdaterSignatureAttributes?.["data-viz-manim-updater-signature-receives-timeline-ids"] ?? "none"
      }
      data-viz-manim-updater-signature-signature={
        manimUpdaterSignatureAttributes?.["data-viz-manim-updater-signature-signature"] ?? "none"
      }
      data-viz-manim-updater-signature-source-summary={
        manimUpdaterSignatureAttributes?.["data-viz-manim-updater-signature-source-summary"] ??
        "alwaysMethod=0;alwaysRedraw=0;objectProgress=0;vectorFieldDt=0"
      }
      data-viz-manim-updater-signature-summary={
        manimUpdaterSignatureAttributes?.["data-viz-manim-updater-signature-summary"] ??
        "updater-signature:total=0:dt=0:timeline=0:dependency=0"
      }
      data-viz-manim-updater-signature-timeline-count={
        manimUpdaterSignatureAttributes?.["data-viz-manim-updater-signature-timeline-count"] ?? "0"
      }
      data-viz-manim-updater-signature-timeline-ids={
        manimUpdaterSignatureAttributes?.["data-viz-manim-updater-signature-timeline-ids"] ?? "none"
      }
      data-viz-manim-updater-execution-active-call-sequence={
        manimUpdaterExecutionAttributes?.["data-viz-manim-updater-execution-active-call-sequence"] ?? "none"
      }
      data-viz-manim-updater-execution-active-count={manimUpdaterExecutionAttributes?.["data-viz-manim-updater-execution-active-count"] ?? "0"}
      data-viz-manim-updater-execution-dependency-count={
        manimUpdaterExecutionAttributes?.["data-viz-manim-updater-execution-dependency-count"] ?? "0"
      }
      data-viz-manim-updater-execution-dt-aware-count={
        manimUpdaterExecutionAttributes?.["data-viz-manim-updater-execution-dt-aware-count"] ?? "0"
      }
      data-viz-manim-updater-execution-family-paths={
        manimUpdaterExecutionAttributes?.["data-viz-manim-updater-execution-family-paths"] ?? "none"
      }
      data-viz-manim-updater-execution-family-traversal-object-ids={
        manimUpdaterExecutionAttributes?.["data-viz-manim-updater-execution-family-traversal-object-ids"] ?? "none"
      }
      data-viz-manim-updater-execution-family-traversal-summary={
        manimUpdaterExecutionAttributes?.["data-viz-manim-updater-execution-family-traversal-summary"] ??
        "familyTraversal:visited=0:withUpdaters=0:idle=0:order=children-first:ids=none"
      }
      data-viz-manim-updater-execution-idle-object-ids={
        manimUpdaterExecutionAttributes?.["data-viz-manim-updater-execution-idle-object-ids"] ?? "none"
      }
      data-viz-manim-updater-execution-max-depth={
        manimUpdaterExecutionAttributes?.["data-viz-manim-updater-execution-max-depth"] ?? "0"
      }
      data-viz-manim-updater-execution-object-ids={
        manimUpdaterExecutionAttributes?.["data-viz-manim-updater-execution-object-ids"] ?? "none"
      }
      data-viz-manim-updater-execution-order-summary={
        manimUpdaterExecutionAttributes?.["data-viz-manim-updater-execution-order-summary"] ?? "children-first:none"
      }
      data-viz-manim-updater-execution-phase={manimUpdaterExecutionAttributes?.["data-viz-manim-updater-execution-phase"] ?? "primitive"}
      data-viz-manim-updater-execution-recursive-order={
        manimUpdaterExecutionAttributes?.["data-viz-manim-updater-execution-recursive-order"] ?? "children-first"
      }
      data-viz-manim-updater-execution-row-count={manimUpdaterExecutionAttributes?.["data-viz-manim-updater-execution-row-count"] ?? "0"}
      data-viz-manim-updater-execution-signature={
        manimUpdaterExecutionAttributes?.["data-viz-manim-updater-execution-signature"] ?? "none"
      }
      data-viz-manim-updater-execution-source-contract={
        manimUpdaterExecutionAttributes?.["data-viz-manim-updater-execution-source-contract"] ?? MOBJECT_UPDATE_SOURCE_CONTRACT
      }
      data-viz-manim-updater-execution-summary={
        manimUpdaterExecutionAttributes?.["data-viz-manim-updater-execution-summary"] ??
        "updater-execution:phase=primitive:rows=0:updaters=0:active=0:suspended=0:dt=0:timeline=0:dependency=0"
      }
      data-viz-manim-updater-execution-suspended-count={
        manimUpdaterExecutionAttributes?.["data-viz-manim-updater-execution-suspended-count"] ?? "0"
      }
      data-viz-manim-updater-execution-timeline-count={
        manimUpdaterExecutionAttributes?.["data-viz-manim-updater-execution-timeline-count"] ?? "0"
      }
      data-viz-manim-updater-execution-updater-count={
        manimUpdaterExecutionAttributes?.["data-viz-manim-updater-execution-updater-count"] ?? "0"
      }
      data-viz-manim-value-tracker-control-count={
        manimValueTrackerAttributes?.["data-viz-manim-value-tracker-control-count"] ?? "0"
      }
      data-viz-manim-value-tracker-count={manimValueTrackerAttributes?.["data-viz-manim-value-tracker-count"] ?? "0"}
      data-viz-manim-value-tracker-hidden-mobject-ids={
        manimValueTrackerAttributes?.["data-viz-manim-value-tracker-hidden-mobject-ids"] ?? "none"
      }
      data-viz-manim-value-tracker-ids={manimValueTrackerAttributes?.["data-viz-manim-value-tracker-ids"] ?? "none"}
      data-viz-manim-value-tracker-normalized-summary={
        manimValueTrackerAttributes?.["data-viz-manim-value-tracker-normalized-summary"] ?? "none"
      }
      data-viz-manim-value-tracker-object-count={
        manimValueTrackerAttributes?.["data-viz-manim-value-tracker-object-count"] ?? "0"
      }
      data-viz-manim-value-tracker-parameter-count={
        manimValueTrackerAttributes?.["data-viz-manim-value-tracker-parameter-count"] ?? "0"
      }
      data-viz-manim-value-tracker-progress-count={
        manimValueTrackerAttributes?.["data-viz-manim-value-tracker-progress-count"] ?? "0"
      }
      data-viz-manim-value-tracker-range-summary={
        manimValueTrackerAttributes?.["data-viz-manim-value-tracker-range-summary"] ?? "none"
      }
      data-viz-manim-value-tracker-signature={manimValueTrackerAttributes?.["data-viz-manim-value-tracker-signature"] ?? "none"}
      data-viz-manim-value-tracker-source-contract={
        manimValueTrackerAttributes?.["data-viz-manim-value-tracker-source-contract"] ?? VALUE_TRACKER_SOURCE_CONTRACT
      }
      data-viz-manim-value-tracker-source-summary={
        manimValueTrackerAttributes?.["data-viz-manim-value-tracker-source-summary"] ??
        "value-tracker-source:hiddenMobjects=0:uniforms=value,normalizedValue:sources=object=0,parameter=0,timeline=0,value=0"
      }
      data-viz-manim-value-tracker-summary={
        manimValueTrackerAttributes?.["data-viz-manim-value-tracker-summary"] ??
        "value-trackers:total=0:timeline=0:parameter=0:object=0:progress=0:control=0"
      }
      data-viz-manim-value-tracker-timeline-count={
        manimValueTrackerAttributes?.["data-viz-manim-value-tracker-timeline-count"] ?? "0"
      }
      data-viz-manim-value-tracker-uniform-key-summary={
        manimValueTrackerAttributes?.["data-viz-manim-value-tracker-uniform-key-summary"] ?? "none"
      }
      data-viz-manim-value-tracker-uniform-pair-count={
        manimValueTrackerAttributes?.["data-viz-manim-value-tracker-uniform-pair-count"] ?? "0"
      }
      data-viz-manim-value-tracker-uniform-value-summary={
        manimValueTrackerAttributes?.["data-viz-manim-value-tracker-uniform-value-summary"] ?? "none"
      }
      data-viz-manim-value-tracker-value-count={
        manimValueTrackerAttributes?.["data-viz-manim-value-tracker-value-count"] ?? "0"
      }
      role="application"
      aria-label={label}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Home") {
          event.preventDefault();
          resetCameraAndTimeline();
        }
      }}
      className="relative w-full overflow-hidden rounded-[28px] border border-slate-900/10 bg-slate-950 shadow-inner shadow-cyan-500/10 outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 dark:border-white/10"
    >
      <div
        ref={surfaceRef}
        data-viz-manim-scene-frame
        className="relative aspect-[16/9] w-full overflow-hidden"
      >
        <span
          data-viz-mark
          data-viz-name="three-d-r3f-surface"
          className="pointer-events-none absolute left-2 top-2 h-2 w-2 rounded-full bg-cyan-200 opacity-10"
        />
        <Canvas
          camera={{
            fov: threeDCanvasCameraContract.defaultCamera.fov,
            near: threeDCanvasCameraContract.defaultCamera.near,
            far: threeDCanvasCameraContract.defaultCamera.far,
            position: defaultCameraPosition().toArray()
          }}
          dpr={canvasDevicePixelRatio}
          gl={canvasRendererGl}
          onCreated={({ camera, gl, scene }) => {
            scene.background = canvasTransparentBackground ? null : background;
            gl.setClearColor(background, canvasBackgroundAlpha);
            setCameraState(formatCameraState(camera));
            hasCreatedCanvasRef.current = true;
            webglCanvasRef.current = gl.domElement;
            scheduleCanvasReady();
          }}
        >
          <CanvasRenderQualityBridge
            background={background}
            backgroundAlpha={canvasBackgroundAlpha}
            onReady={scheduleCanvasReady}
            transparentBackground={canvasTransparentBackground}
          />
          <ambientLight intensity={threeDCanvasLightingContract.ambient.intensity} />
          {threeDCanvasLightingContract.directional.map((light) => (
            <directionalLight key={light.name} color={light.color} intensity={light.intensity} position={light.position} />
          ))}
          <ThreeDLabSceneRegistry
            accent={accent}
            manimElapsedSeconds={manimElapsedSeconds}
            manimRuntimeState={manimRuntimeState}
            manimScene={manimScene}
            runtime={runtime}
            state={state}
          />
          <ThreeDSceneBoundaryProbe
            stateSignature={`${state.stateSummary}|${cameraState}`}
          />
          {manimScene ? (
            <ManimRuntimeClock
              elapsedSeconds={manimElapsedSeconds}
              formulaLayerViewport={manimFormulaOverlayViewport}
              frameIndex={manimFrameIndex}
              playing={manimPlaybackState === "playing"}
              previousRuntimeStateRef={previousManimRuntimeStateRef}
              reducedMotion={manimSkipAnimations}
              scene={manimScene}
              setElapsedSeconds={setManimElapsedSeconds}
              setFrameStep={setSteppedManimFrameStep}
              setFrameIndex={setManimFrameIndex}
            />
          ) : null}
          <CameraContract
            manimCameraMode={manimScene ? manimCameraMode : null}
            manimCameraFrame={manimCameraMode === "guided" ? manimRuntimeState?.cameraDirector.frame ?? null : null}
            onCameraState={setCameraState}
            onUserExplore={manimScene ? enterExploreCameraMode : undefined}
            resetSignal={resetSignal}
          />
          <ReadySignal onReady={scheduleCanvasReady} />
        </Canvas>
        {manimScene ? (
          <MathFormulaOverlay
            activeConceptId={runtimeDiagnostics.activeConceptId}
            activeConceptIds={manimFormulaLayerActiveIds}
            projectedLabelViewport={manimFormulaOverlayViewport}
            projectedLabelViewportSource={manimFormulaOverlayViewportSource}
            runtimeState={manimRuntimeState ?? undefined}
            scene={manimScene}
          />
        ) : null}
      </div>
      {manimScene ? (
        <>
          {manimSceneInitializationEvidence ? (
            <>
              <span
                data-viz-manim-scene-init-plan
                data-viz-manim-scene-init-summary={manimSceneInitializationEvidence.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-scene-init-json
                dangerouslySetInnerHTML={{ __html: manimSceneInitializationJson ?? "" }}
              />
            </>
          ) : null}
          {manimCoordinateSystemEvidence ? (
            <>
              <span
                data-viz-manim-coordinate-system-plan
                data-viz-manim-coordinate-system-plan-summary={manimCoordinateSystemEvidence.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-coordinate-system-json
                dangerouslySetInnerHTML={{ __html: manimCoordinateSystemJson ?? "" }}
              />
            </>
          ) : null}
          {manimAxisTickPlan ? (
            <>
              <span
                data-viz-manim-axis-tick-plan
                data-viz-manim-axis-tick-plan-summary={
                  manimAxisTickAttributes?.["data-viz-manim-axis-summary"] ?? "axes:primitive:axisObjects=0:ticks=0:labels=0:finite=0"
                }
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-axis-tick-json
                dangerouslySetInnerHTML={{ __html: manimAxisTickJson }}
              />
            </>
          ) : null}
          {manimCoordinateSpaceEvidence ? (
            <>
              <span
                data-viz-manim-coordinate-space-plan
                data-viz-manim-coordinate-space-plan-summary={manimCoordinateSpaceEvidence.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-coordinate-space-json
                dangerouslySetInnerHTML={{ __html: manimCoordinateSpaceJson ?? "" }}
              />
            </>
          ) : null}
          <span
            data-viz-manim-surface-object-plan
            data-viz-manim-surface-object-plan-summary={manimSurfaceObjectEvidence.summary}
            className="sr-only"
          />
          <script
            type="application/json"
            data-viz-manim-surface-object-json
            dangerouslySetInnerHTML={{ __html: manimSurfaceObjectJson }}
          />
          <span
            data-viz-manim-ode-trajectory-plan
            data-viz-manim-ode-trajectory-plan-summary={manimOdeTrajectoryEvidence.summary}
            className="sr-only"
          />
          <script
            type="application/json"
            data-viz-manim-ode-trajectory-json
            dangerouslySetInnerHTML={{ __html: manimOdeTrajectoryJson }}
          />
          <span
            data-viz-manim-ode-trajectory-object-plan
            data-viz-manim-ode-trajectory-object-plan-summary={manimOdeTrajectoryObjectEvidence.summary}
            className="sr-only"
          />
          <script
            type="application/json"
            data-viz-manim-ode-trajectory-object-json
            dangerouslySetInnerHTML={{ __html: manimOdeTrajectoryObjectJson }}
          />
          <span
            data-viz-manim-vector-field-plan
            data-viz-manim-vector-field-plan-summary={manimVectorFieldEvidence.summary}
            className="sr-only"
          />
          <script
            type="application/json"
            data-viz-manim-vector-field-json
            dangerouslySetInnerHTML={{ __html: manimVectorFieldJson }}
          />
          {manimMoveAlongVectorFieldPayload ? (
            <>
              <span
                data-viz-manim-move-along-vector-field-plan
                data-viz-manim-move-along-vector-field-plan-summary={manimMoveAlongVectorFieldPayload.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-move-along-vector-field-json
                dangerouslySetInnerHTML={{ __html: manimMoveAlongVectorFieldJson }}
              />
            </>
          ) : null}
          <span
            data-viz-manim-stream-line-plan
            data-viz-manim-stream-line-plan-summary={manimStreamLineEvidence.summary}
            className="sr-only"
          />
          <script
            type="application/json"
            data-viz-manim-stream-line-json
            dangerouslySetInnerHTML={{ __html: manimStreamLineJson }}
          />
          {manimTimelineEvidence ? (
            <>
              <span
                data-viz-manim-timeline-plan
                data-viz-manim-timeline-plan-summary={manimTimelineEvidence.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-timeline-json
                dangerouslySetInnerHTML={{ __html: manimTimelineJson ?? "" }}
              />
            </>
          ) : null}
          {manimCurvePartialFrame ? (
            <>
              <span
                data-viz-manim-curve-partial-plan
                data-viz-manim-curve-partial-plan-summary={manimCurvePartialFrame.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-curve-partial-json
                dangerouslySetInnerHTML={{ __html: manimCurvePartialJson ?? "" }}
              />
            </>
          ) : null}
          <span
            data-viz-manim-tracing-tail-plan
            data-viz-manim-tracing-tail-plan-summary={manimTracingTailEvidence.summary}
            className="sr-only"
          />
          <script
            type="application/json"
            data-viz-manim-tracing-tail-json
            dangerouslySetInnerHTML={{ __html: manimTracingTailJson }}
          />
          {manimShowCreationEvidence ? (
            <>
              <span
                data-viz-manim-show-creation-plan
                data-viz-manim-show-creation-plan-summary={manimShowCreationEvidence.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-show-creation-json
                dangerouslySetInnerHTML={{ __html: manimShowCreationJson }}
              />
            </>
          ) : null}
          {manimDrawBorderThenFillEvidence ? (
            <>
              <span
                data-viz-manim-draw-border-fill-plan
                data-viz-manim-draw-border-fill-plan-summary={manimDrawBorderThenFillEvidence.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-draw-border-fill-json
                dangerouslySetInnerHTML={{ __html: manimDrawBorderThenFillJson }}
              />
            </>
          ) : null}
          {manimFadeGrowEvidence ? (
            <>
              <span
                data-viz-manim-fade-grow-plan
                data-viz-manim-fade-grow-plan-summary={manimFadeGrowEvidence.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-fade-grow-json
                dangerouslySetInnerHTML={{ __html: manimFadeGrowJson }}
              />
            </>
          ) : null}
          {manimIndicationPrimitivePlan ? (
            <>
              <span
                data-viz-manim-indication-plan
                data-viz-manim-indication-plan-summary={
                  manimIndicationPrimitiveAttributes?.["data-viz-manim-indication-summary"] ?? "indication:primitive:beats=0:targets=0:pulse=0:circumscribe=0:flash=0:missing=0"
                }
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-indication-json
                dangerouslySetInnerHTML={{ __html: manimIndicationPrimitiveJson }}
              />
            </>
          ) : null}
          <span
            data-viz-manim-indication-runtime-overlay-plan
            data-viz-manim-indication-runtime-overlay-plan-summary={
              manimRuntimeIndicationOverlayAttributes["data-viz-manim-indication-runtime-overlay-summary"]
            }
            className="sr-only"
          />
          <script
            type="application/json"
            data-viz-manim-indication-runtime-overlay-json
            dangerouslySetInnerHTML={{ __html: manimRuntimeIndicationOverlayJson }}
          />
          {manimTransformPathFunctionCatalog ? (
            <>
              <span
                data-viz-manim-transform-path-plan
                data-viz-manim-transform-path-plan-summary={manimTransformPathFunctionCatalog.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-transform-path-json
                dangerouslySetInnerHTML={{ __html: manimTransformPathJson ?? "" }}
              />
            </>
          ) : null}
          {manimRateFunctionCatalog ? (
            <>
              <span
                data-viz-manim-rate-function-plan
                data-viz-manim-rate-function-plan-summary={manimRateFunctionCatalog.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-rate-function-json
                dangerouslySetInnerHTML={{ __html: manimRateFunctionJson ?? "" }}
              />
            </>
          ) : null}
          {manimLagRatioCatalog ? (
            <>
              <span
                data-viz-manim-lag-ratio-plan
                data-viz-manim-lag-ratio-plan-summary={manimLagRatioCatalog.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-lag-ratio-json
                dangerouslySetInnerHTML={{ __html: manimLagRatioJson ?? "" }}
              />
            </>
          ) : null}
          {manimSubAlphaSchedule ? (
            <>
              <span
                data-viz-manim-sub-alpha-plan
                data-viz-manim-sub-alpha-plan-summary={manimSubAlphaSchedule.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-sub-alpha-json
                dangerouslySetInnerHTML={{ __html: manimSubAlphaJson ?? "" }}
              />
            </>
          ) : null}
          {manimAnimationRuntimeEvidence ? (
            <>
              <span
                data-viz-manim-animation-runtime-plan
                data-viz-manim-animation-runtime-plan-summary={manimAnimationRuntimeEvidence.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-animation-runtime-json
                dangerouslySetInnerHTML={{ __html: manimAnimationRuntimeJson ?? "" }}
              />
            </>
          ) : null}
          {manimTransformInterpolateBoundingBoxEvidence ? (
            <>
              <span
                data-viz-manim-transform-interpolate-bounding-box-plan
                data-viz-manim-transform-interpolate-bounding-box-plan-summary={
                  manimTransformInterpolateBoundingBoxEvidence.summary
                }
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-transform-interpolate-bounding-box-json
                dangerouslySetInnerHTML={{ __html: manimTransformInterpolateBoundingBoxJson ?? "" }}
              />
            </>
          ) : null}
          {manimTransformInterpolateUniformEvidence ? (
            <>
              <span
                data-viz-manim-transform-interpolate-uniform-plan
                data-viz-manim-transform-interpolate-uniform-plan-summary={manimTransformInterpolateUniformEvidence.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-transform-interpolate-uniform-json
                dangerouslySetInnerHTML={{ __html: manimTransformInterpolateUniformJson ?? "" }}
              />
            </>
          ) : null}
          {manimTransformInterpolateFieldEvidence ? (
            <>
              <span
                data-viz-manim-transform-interpolate-field-plan
                data-viz-manim-transform-interpolate-field-plan-summary={manimTransformInterpolateFieldEvidence.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-transform-interpolate-field-json
                dangerouslySetInnerHTML={{ __html: manimTransformInterpolateFieldJson ?? "" }}
              />
            </>
          ) : null}
          {manimAnimateBuilderCatalog ? (
            <>
              <span
                data-viz-manim-animate-builder-plan
                data-viz-manim-animate-builder-plan-summary={manimAnimateBuilderCatalog.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-animate-builder-json
                dangerouslySetInnerHTML={{ __html: manimAnimateBuilderJson ?? "" }}
              />
            </>
          ) : null}
          {manimAlwaysUpdaterCatalog ? (
            <>
              <span
                data-viz-manim-always-updater-plan
                data-viz-manim-always-updater-plan-summary={manimAlwaysUpdaterCatalog.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-always-updater-json
                dangerouslySetInnerHTML={{ __html: manimAlwaysUpdaterJson ?? "" }}
              />
            </>
          ) : null}
          {manimAlwaysMethodEvidence ? (
            <>
              <span
                data-viz-manim-always-method-plan
                data-viz-manim-always-method-plan-summary={manimAlwaysMethodEvidence.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-always-method-json
                dangerouslySetInnerHTML={{ __html: manimAlwaysMethodJson ?? "" }}
              />
            </>
          ) : null}
          {manimAnimationCompositionEvidence ? (
            <>
              <span
                data-viz-manim-animation-composition-plan
                data-viz-manim-animation-composition-plan-summary={manimAnimationCompositionEvidence.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-animation-composition-json
                dangerouslySetInnerHTML={{ __html: manimAnimationCompositionJson ?? "" }}
              />
            </>
          ) : null}
          {manimFrameStep ? (
            <>
              <span
                data-viz-manim-frame-stepper-capture
                data-viz-manim-frame-stepper-capture-summary={manimFrameStepAttributes?.["data-viz-manim-frame-stepper-summary"] ?? ""}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-frame-stepper-json
                dangerouslySetInnerHTML={{ __html: manimFrameStepJson ?? "" }}
              />
            </>
          ) : null}
          {manimCameraDirectorEvidence ? (
            <>
              <span
                data-viz-manim-camera-director-plan
                data-viz-manim-camera-director-plan-summary={manimCameraDirectorEvidence.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-camera-director-json
                dangerouslySetInnerHTML={{ __html: manimCameraDirectorJson ?? "" }}
              />
            </>
          ) : null}
          {manimCameraFrameUpdaterPayload ? (
            <>
              <span
                data-viz-manim-camera-updater-plan
                data-viz-manim-camera-updater-plan-summary={`camera-updater:total=${manimCameraFrameUpdaterPayload.updaterCount}:active=${manimCameraFrameUpdaterPayload.activeUpdaterCount}:ambient=${manimCameraFrameUpdaterPayload.ambientRotationDegrees.toFixed(3)}`}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-camera-updater-json
                dangerouslySetInnerHTML={{ __html: manimCameraFrameUpdaterJson }}
              />
            </>
          ) : null}
          {manimCameraFramePayload ? (
            <>
              <span
                data-viz-manim-camera-frame
                data-viz-manim-camera-frame-current-id={manimCameraFramePayload.currentFrameId}
                data-viz-manim-camera-frame-scene-id={manimCameraFramePayload.sceneId}
                data-viz-manim-camera-frame-signature={manimCameraFramePayload.signature}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-camera-frame-json
                dangerouslySetInnerHTML={{ __html: manimCameraFrameJson }}
              />
            </>
          ) : null}
          {manimSceneExport ? (
            <>
              <span
                data-viz-manim-scene-export
                data-viz-manim-scene-export-id={manimSceneExport.sceneId}
                data-viz-manim-scene-export-signature={manimSceneExport.signature}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-scene-export-json
                dangerouslySetInnerHTML={{ __html: manimSceneExport.json }}
              />
            </>
          ) : null}
          {manimSceneRunLifecycle ? (
            <>
              <span
                data-viz-manim-scene-run
                data-viz-manim-scene-run-id={manimSceneRunLifecycle.sceneId}
                data-viz-manim-scene-run-signature={manimSceneRunLifecycle.signature}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-scene-run-json
                dangerouslySetInnerHTML={{ __html: manimSceneRunLifecycleJson }}
              />
            </>
          ) : null}
          {manimSceneRunInteractBridgePlan ? (
            <>
              <span
                data-viz-manim-scene-run-interact
                data-viz-manim-scene-run-interact-summary={manimSceneRunInteractBridgePlan.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-scene-run-interact-json
                dangerouslySetInnerHTML={{ __html: manimSceneRunInteractBridgeJson }}
              />
            </>
          ) : null}
          {manimSceneRunFileWriterFinishBridgePlan ? (
            <>
              <span
                data-viz-manim-scene-run-file-writer-finish
                data-viz-manim-scene-run-file-writer-finish-summary={manimSceneRunFileWriterFinishBridgePlan.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-scene-run-file-writer-finish-json
                dangerouslySetInnerHTML={{ __html: manimSceneRunFileWriterFinishBridgePlanJson }}
              />
            </>
          ) : null}
          {manimPlaybackPlan ? (
            <>
              <span
                data-viz-manim-playback-plan
                data-viz-manim-playback-plan-summary={`playback:plays=${manimPlaybackPlan.plays.length}:duration=${manimPlaybackPlan.totalDuration.toFixed(3)}`}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-playback-json
                dangerouslySetInnerHTML={{ __html: manimPlaybackPlanJson }}
              />
            </>
          ) : null}
          {manimCapturePlan ? (
            <script
              type="application/json"
              data-viz-manim-capture-plan-json
              dangerouslySetInnerHTML={{ __html: manimCapturePlanJson }}
            />
          ) : null}
          <script
            type="application/json"
            data-viz-manim-render-quality-json
            dangerouslySetInnerHTML={{ __html: manimRenderQualityPlanJson }}
          />
          <script
            type="application/json"
            data-viz-manim-renderer-bridge-json
            dangerouslySetInnerHTML={{ __html: manimRenderQualityBridgeJson }}
          />
          {manimScene ? (
            <>
              <span
                data-viz-manim-checkpoint-store
                data-viz-manim-checkpoint-store-id={manimScene.sceneId}
                data-viz-manim-checkpoint-store-latest-state-signature={
                  manimCheckpointStoreManifest.latestStateSignature
                }
                data-viz-manim-checkpoint-store-restored-state-signature={
                  manimCheckpointStoreManifest.restoredStateSignature
                }
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-checkpoint-store-json
                dangerouslySetInnerHTML={{ __html: manimCheckpointStoreJson }}
              />
              {manimCheckpointPastePlanJson ? (
                <script
                  type="application/json"
                  data-viz-manim-checkpoint-paste-json
                  dangerouslySetInnerHTML={{ __html: manimCheckpointPastePlanJson }}
                />
              ) : null}
            </>
          ) : null}
          {manimScene ? (
            <>
              <span
                data-viz-manim-parameter-panel-plan
                data-viz-manim-parameter-panel-plan-summary={manimParameterPanelAttributes["data-viz-manim-parameter-panel-summary"]}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-parameter-panel-json
                dangerouslySetInnerHTML={{ __html: manimParameterPanelJson }}
              />
            </>
          ) : null}
          {manimScene ? (
            <>
              <span
                data-viz-manim-camera-shot-plan
                data-viz-manim-camera-shot-plan-summary={manimCameraShotAttributes["data-viz-manim-camera-shot-summary"]}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-camera-shot-json
                dangerouslySetInnerHTML={{ __html: manimCameraShotJson }}
              />
            </>
          ) : null}
          {manimScene ? (
            <>
              <span
                data-viz-manim-history
                data-viz-manim-history-id={manimScene.sceneId}
                data-viz-manim-history-current-label={manimHistoryManifest.current.label}
                data-viz-manim-history-revision={manimHistoryManifest.revision}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-history-json
                dangerouslySetInnerHTML={{ __html: manimHistoryManifestJson }}
              />
            </>
          ) : null}
          {manimScene ? (
            <>
              <span
                data-viz-manim-shortcut-catalog
                data-viz-manim-shortcut-catalog-id={manimScene.sceneId}
                data-viz-manim-shortcut-catalog-summary={manimShortcutCatalog.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-shortcut-catalog-json
                dangerouslySetInnerHTML={{ __html: manimShortcutCatalogJson }}
              />
            </>
          ) : null}
          {manimPlayCompilationPlan ? (
            <>
              <span
                data-viz-manim-play-compilation
                data-viz-manim-play-compilation-call-order={manimPlayCompilationPlan.callOrderSummary}
                data-viz-manim-play-compilation-call-order-ready={String(manimPlayCompilationPlan.callOrderReady)}
                data-viz-manim-play-compilation-summary={manimPlayCompilationPlan.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-play-compilation-json
                dangerouslySetInnerHTML={{ __html: manimPlayCompilationJson ?? "" }}
              />
            </>
          ) : null}
          {manimPrePlayControlPlan ? (
            <>
              <span
                data-viz-manim-pre-play
                data-viz-manim-pre-play-id={manimScene?.sceneId ?? "none"}
                data-viz-manim-pre-play-summary={manimPrePlayControlPlan.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-pre-play-json
                dangerouslySetInnerHTML={{ __html: manimPrePlayControlJson ?? "" }}
              />
            </>
          ) : null}
          {manimPostPlayPreviewPlan ? (
            <>
              <span
                data-viz-manim-post-play-preview
                data-viz-manim-post-play-preview-id={manimScene?.sceneId ?? "none"}
                data-viz-manim-post-play-preview-num-plays-ready={String(manimPostPlayPreviewPlan.numPlaysReady)}
                data-viz-manim-post-play-preview-num-plays-sequence={manimPostPlayPreviewPlan.numPlaysSequence}
                data-viz-manim-post-play-preview-summary={manimPostPlayPreviewPlan.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-post-play-preview-json
                dangerouslySetInnerHTML={{ __html: manimPostPlayPreviewPlanJson ?? "" }}
              />
            </>
          ) : null}
          {manimPostCellRedrawPlan ? (
            <>
              <span
                data-viz-manim-post-cell-redraw
                data-viz-manim-post-cell-redraw-id={manimScene?.sceneId ?? "none"}
                data-viz-manim-post-cell-redraw-summary={manimPostCellRedrawPlan.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-post-cell-redraw-json
                dangerouslySetInnerHTML={{ __html: manimPostCellRedrawPlanJson ?? "" }}
              />
            </>
          ) : null}
          {manimScene ? (
            <>
              <span
                data-viz-manim-reload
                data-viz-manim-reload-id={manimScene.sceneId}
                data-viz-manim-reload-summary={manimReloadPlan.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-reload-json
                dangerouslySetInnerHTML={{ __html: manimReloadPlanJson }}
              />
            </>
          ) : null}
          {manimScene ? (
            <>
              <span
                data-viz-manim-run-from-beat-plan
                data-viz-manim-run-from-beat-plan-summary={manimRunFromBeatPlan.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-run-from-beat-json
                dangerouslySetInnerHTML={{ __html: manimRunFromBeatJson }}
              />
            </>
          ) : null}
          {manimStateSnapshot ? (
            <>
              <span
                data-viz-manim-state-snapshot
                data-viz-manim-state-snapshot-id={manimStateSnapshot.sceneId}
                data-viz-manim-state-snapshot-signature={manimStateSnapshot.signature}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-state-snapshot-json
                dangerouslySetInnerHTML={{ __html: manimStateSnapshotJson }}
              />
            </>
          ) : null}
          {manimSmokeHookManifest ? (
            <>
              <span
                data-viz-manim-smoke-hook
                data-viz-manim-smoke-hook-id={manimSmokeHookManifest.sceneId}
                data-viz-manim-smoke-hook-signature={manimSmokeHookManifest.signature}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-smoke-hook-json
                dangerouslySetInnerHTML={{ __html: manimSmokeHookJson }}
              />
            </>
          ) : null}
          <span
            data-viz-manim-projected-label-plan
            data-viz-manim-projected-label-plan-summary={manimMeasuredProjectedLabelSummary.summary}
            className="sr-only"
          />
          <script
            type="application/json"
            data-viz-manim-projected-label-json
            dangerouslySetInnerHTML={{ __html: manimProjectedLabelJson }}
          />
          <span
            data-viz-manim-formula-collision-plan
            data-viz-manim-formula-collision-plan-summary={manimFormulaCollisionAttributes["data-viz-manim-formula-safe-area-summary"]}
            className="sr-only"
          />
          <script
            type="application/json"
            data-viz-manim-formula-collision-json
            dangerouslySetInnerHTML={{ __html: manimFormulaCollisionJson }}
          />
          {manimTexCacheManifest ? (
            <>
              <span
                data-viz-manim-tex-cache
                data-viz-manim-tex-cache-id={manimTexCacheManifest.sceneId}
                data-viz-manim-tex-cache-signature={manimTexCacheManifest.signature}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-tex-cache-json
                dangerouslySetInnerHTML={{ __html: manimTexCacheJson }}
              />
            </>
          ) : null}
          {manimTexCompilePipeline ? (
            <>
              <span
                data-viz-manim-tex-compile
                data-viz-manim-tex-compile-id={manimTexCompilePipeline.sceneId}
                data-viz-manim-tex-compile-signature={manimTexCompilePipeline.signature}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-tex-compile-json
                dangerouslySetInnerHTML={{ __html: manimTexCompileJson }}
              />
            </>
          ) : null}
          {manimTexColorMap ? (
            <>
              <span
                data-viz-manim-tex-color-map
                data-viz-manim-tex-color-map-id={manimTexColorMap.sceneId}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-tex-color-map-json
                dangerouslySetInnerHTML={{ __html: manimTexColorMapJson }}
              />
            </>
          ) : null}
          {manimTexIsolationEvidence ? (
            <>
              <span
                data-viz-manim-tex-isolation
                data-viz-manim-tex-isolation-id={manimTexIsolationEvidence.sceneId}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-tex-isolation-json
                dangerouslySetInnerHTML={{ __html: manimTexIsolationJson }}
              />
            </>
          ) : null}
          {manimFileWriterPlan ? (
            <>
              <span
                data-viz-manim-file-writer
                data-viz-manim-file-writer-id={manimFileWriterPlan.sceneId}
                data-viz-manim-file-writer-signature={manimFileWriterPlan.signature}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-file-writer-json
                dangerouslySetInnerHTML={{ __html: manimFileWriterPlanJson }}
              />
            </>
          ) : null}
          {manimFileWriterSegmentPlan ? (
            <>
              <span
                data-viz-manim-file-writer-segment
                data-viz-manim-file-writer-segment-summary={manimFileWriterSegmentPlan.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-file-writer-segment-json
                dangerouslySetInnerHTML={{ __html: manimFileWriterSegmentPlanJson }}
              />
            </>
          ) : null}
          {manimPlaybackFileWriterBridgePlan ? (
            <>
              <span
                data-viz-manim-playback-file-writer-bridge
                data-viz-manim-playback-file-writer-bridge-summary={manimPlaybackFileWriterBridgePlan.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-playback-file-writer-bridge-json
                dangerouslySetInnerHTML={{ __html: manimPlaybackFileWriterBridgePlanJson }}
              />
            </>
          ) : null}
          {manimFileWriterCombinePlan ? (
            <>
              <span
                data-viz-manim-file-writer-combine
                data-viz-manim-file-writer-combine-summary={manimFileWriterCombinePlan.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-file-writer-combine-json
                dangerouslySetInnerHTML={{ __html: manimFileWriterCombinePlanJson }}
              />
            </>
          ) : null}
          {manimCheckpointFileWriterBridgePlan ? (
            <>
              <span
                data-viz-manim-checkpoint-file-writer-bridge
                data-viz-manim-checkpoint-file-writer-bridge-summary={manimCheckpointFileWriterBridgePlan.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-checkpoint-file-writer-bridge-json
                dangerouslySetInnerHTML={{ __html: manimCheckpointFileWriterBridgePlanJson }}
              />
            </>
          ) : null}
          {manimSoundCuePlan ? (
            <>
              <span
                data-viz-manim-sound-cue
                data-viz-manim-sound-cue-summary={manimSoundCuePlan.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-sound-cue-json
                dangerouslySetInnerHTML={{ __html: manimSoundCueJson ?? "" }}
              />
            </>
          ) : null}
          {manimFrameAuditSummary ? (
            <script
              type="application/json"
              data-viz-manim-frame-audit-json
              dangerouslySetInnerHTML={{ __html: manimFrameAuditJson }}
            />
          ) : null}
          {manimSceneGraphSummary ? (
            <>
              <span
                data-viz-scene-graph-plan
                data-viz-scene-graph-render-group-ids={manimSceneGraphSummary.renderGroupIds}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-scene-graph-json
                dangerouslySetInnerHTML={{ __html: manimSceneGraphJson ?? "" }}
              />
            </>
          ) : null}
          {manimRenderBatchPlan ? (
            <>
              <span
                data-viz-manim-render-batch-plan
                data-viz-manim-render-batch-summary={manimRenderBatchPlan.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-render-batch-json
                dangerouslySetInnerHTML={{ __html: manimRenderBatchJson ?? "" }}
              />
            </>
          ) : null}
          {manimSceneMembershipState ? (
            <>
              <span
                data-viz-scene-membership-plan
                data-viz-scene-membership-source-summary={manimSceneMembershipState.sourceSummary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-scene-membership-json
                dangerouslySetInnerHTML={{ __html: manimSceneMembershipJson ?? "" }}
              />
            </>
          ) : null}
          {manimSceneRestructurePlan ? (
            <>
              <span
                data-viz-scene-restructure-plan
                data-viz-scene-restructure-summary={manimSceneRestructurePlan.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-scene-restructure-json
                dangerouslySetInnerHTML={{ __html: manimSceneRestructureJson ?? "" }}
              />
            </>
          ) : null}
          {manimSceneClearMobjectPlan ? (
            <>
              <span
                data-viz-scene-clear-mobject-plan
                data-viz-scene-clear-mobject-summary={manimSceneClearMobjectPlan.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-scene-clear-mobject-json
                dangerouslySetInnerHTML={{ __html: manimSceneClearMobjectJson ?? "" }}
              />
            </>
          ) : null}
          {manimSceneRemoveAllExceptMobjectPlan ? (
            <>
              <span
                data-viz-scene-remove-all-except-mobject-plan
                data-viz-scene-remove-all-except-mobject-summary={manimSceneRemoveAllExceptMobjectPlan.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-scene-remove-all-except-mobject-json
                dangerouslySetInnerHTML={{ __html: manimSceneRemoveAllExceptMobjectJson ?? "" }}
              />
            </>
          ) : null}
          {manimSceneBringToFrontMobjectPlan ? (
            <>
              <span
                data-viz-scene-bring-to-front-mobject-plan
                data-viz-scene-bring-to-front-mobject-summary={manimSceneBringToFrontMobjectPlan.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-scene-bring-to-front-mobject-json
                dangerouslySetInnerHTML={{ __html: manimSceneBringToFrontMobjectJson ?? "" }}
              />
            </>
          ) : null}
          {manimSceneSendToBackMobjectPlan ? (
            <>
              <span
                data-viz-scene-send-to-back-mobject-plan
                data-viz-scene-send-to-back-mobject-summary={manimSceneSendToBackMobjectPlan.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-scene-send-to-back-mobject-json
                dangerouslySetInnerHTML={{ __html: manimSceneSendToBackMobjectJson ?? "" }}
              />
            </>
          ) : null}
          {manimSceneAddMobjectPlan ? (
            <>
              <span
                data-viz-scene-add-mobject-plan
                data-viz-scene-add-mobject-summary={manimSceneAddMobjectPlan.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-scene-add-mobject-json
                dangerouslySetInnerHTML={{ __html: manimSceneAddMobjectJson ?? "" }}
              />
            </>
          ) : null}
          {manimSceneReplaceMobjectPlan ? (
            <>
              <span
                data-viz-scene-replace-mobject-plan
                data-viz-scene-replace-mobject-summary={manimSceneReplaceMobjectPlan.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-scene-replace-mobject-json
                dangerouslySetInnerHTML={{ __html: manimSceneReplaceMobjectJson ?? "" }}
              />
            </>
          ) : null}
          {manimSceneRemoveMobjectPlan ? (
            <>
              <span
                data-viz-scene-remove-mobject-plan
                data-viz-scene-remove-mobject-summary={manimSceneRemoveMobjectPlan.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-scene-remove-mobject-json
                dangerouslySetInnerHTML={{ __html: manimSceneRemoveMobjectJson ?? "" }}
              />
            </>
          ) : null}
          {manimBeginAnimationsPlan ? (
            <>
              <span
                data-viz-manim-begin-animations
                data-viz-manim-begin-animations-summary={manimBeginAnimationsPlan.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-begin-animations-json
                dangerouslySetInnerHTML={{ __html: manimBeginAnimationsJson ?? "" }}
              />
            </>
          ) : null}
          {manimTimeProgressionPlan ? (
            <>
              <span
                data-viz-manim-time-progression
                data-viz-manim-time-progression-summary={manimTimeProgressionPlan.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-time-progression-json
                dangerouslySetInnerHTML={{ __html: manimTimeProgressionJson ?? "" }}
              />
            </>
          ) : null}
          {manimProgressThroughAnimationsPlan ? (
            <>
              <span
                data-viz-manim-progress-through
                data-viz-manim-progress-through-summary={manimProgressThroughAnimationsPlan.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-progress-through-json
                dangerouslySetInnerHTML={{ __html: manimProgressThroughAnimationsJson ?? "" }}
              />
            </>
          ) : null}
          {manimUpdateFramePlan ? (
            <>
              <span
                data-viz-manim-update-frame
                data-viz-manim-update-frame-summary={manimUpdateFramePlan.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-update-frame-json
                dangerouslySetInnerHTML={{ __html: manimUpdateFrameJson ?? "" }}
              />
            </>
          ) : null}
          {manimSceneUpdatePolicyPayload ? (
            <>
              <span
                data-viz-manim-update-policy-plan
                data-viz-manim-update-policy-plan-summary={manimSceneUpdatePolicyPayload.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-update-policy-json
                dangerouslySetInnerHTML={{ __html: manimSceneUpdatePolicyJson }}
              />
            </>
          ) : null}
          {manimInteractLoopPlan ? (
            <>
              <span
                data-viz-manim-interact-loop
                data-viz-manim-interact-summary={manimInteractLoopPlan.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-interact-loop-json
                dangerouslySetInnerHTML={{ __html: manimInteractLoopJson ?? "" }}
              />
            </>
          ) : null}
          {manimFloorPlanePlan ? (
            <>
              <span
                data-viz-manim-floor-plane-plan
                data-viz-manim-floor-plane-summary={manimFloorPlanePlan.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-floor-plane-json
                dangerouslySetInnerHTML={{ __html: manimFloorPlaneJson ?? "" }}
              />
            </>
          ) : null}
          {manimScene ? (
            <>
              <span
                data-viz-manim-pick-result
                data-viz-manim-pick-summary={manimPickResult?.summary ?? "pick:miss"}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-pick-json
                dangerouslySetInnerHTML={{ __html: manimPickJson ?? "" }}
              />
            </>
          ) : null}
          {manimKeyControlPlan ? (
            <>
              <span
                data-viz-manim-key-control
                data-viz-manim-key-summary={manimKeyControlPlan.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-key-control-json
                dangerouslySetInnerHTML={{ __html: manimKeyControlJson ?? "" }}
              />
            </>
          ) : null}
          {manimPointerControlPlan ? (
            <>
              <span
                data-viz-manim-pointer-control
                data-viz-manim-pointer-summary={manimPointerControlPlan.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-pointer-control-json
                dangerouslySetInnerHTML={{ __html: manimPointerControlJson ?? "" }}
              />
            </>
          ) : null}
          {manimWindowEventPlan ? (
            <>
              <span
                data-viz-manim-window-event
                data-viz-manim-window-summary={manimWindowEventPlan.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-window-event-json
                dangerouslySetInnerHTML={{ __html: manimWindowEventJson ?? "" }}
              />
            </>
          ) : null}
          {manimEmitFramePlan ? (
            <>
              <span
                data-viz-manim-emit-frame
                data-viz-manim-emit-frame-summary={manimEmitFramePlan.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-emit-frame-json
                dangerouslySetInnerHTML={{ __html: manimEmitFrameJson ?? "" }}
              />
            </>
          ) : null}
          {manimWaitControlPlan ? (
            <>
              <span
                data-viz-manim-wait-control
                data-viz-manim-wait-control-summary={manimWaitControlPlan.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-wait-control-json
                dangerouslySetInnerHTML={{ __html: manimWaitControlJson ?? "" }}
              />
            </>
          ) : null}
          {manimWaitControlPlan ? (
            <>
              <span
                data-viz-manim-presenter-hold-plan
                data-viz-manim-presenter-hold-plan-summary={manimWaitControlPlan.presenterHold.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-presenter-hold-json
                dangerouslySetInnerHTML={{ __html: manimPresenterHoldJson ?? "" }}
              />
            </>
          ) : null}
          {manimSkippingWindowPlan ? (
            <>
              <span
                data-viz-manim-skipping-window
                data-viz-manim-skipping-window-summary={manimSkippingWindowPlan.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-skipping-window-json
                dangerouslySetInnerHTML={{ __html: manimSkippingWindowJson ?? "" }}
              />
            </>
          ) : null}
          {manimSkipControlPlan ? (
            <>
              <span
                data-viz-manim-skip-control
                data-viz-manim-skip-control-summary={manimSkipControlPlan.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-skip-control-json
                dangerouslySetInnerHTML={{ __html: manimSkipControlJson ?? "" }}
              />
            </>
          ) : null}
          {manimProgressControlPlan ? (
            <>
              <span
                data-viz-manim-progress-control
                data-viz-manim-progress-control-summary={manimProgressControlPlan.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-progress-control-json
                dangerouslySetInnerHTML={{ __html: manimProgressControlJson ?? "" }}
              />
            </>
          ) : null}
          {manimFinishAnimationsPlan ? (
            <>
              <span
                data-viz-manim-finish-animations
                data-viz-manim-finish-animations-summary={manimFinishAnimationsPlan.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-finish-animations-json
                dangerouslySetInnerHTML={{ __html: manimFinishAnimationsJson ?? "" }}
              />
            </>
          ) : null}
          {manimAnimationLifecyclePlan ? (
            <>
              <span
                data-viz-manim-animation-lifecycle
                data-viz-manim-animation-lifecycle-plan-id={manimAnimationLifecyclePlan.animationPlanId}
                data-viz-manim-animation-lifecycle-signature={manimAnimationLifecyclePlan.signature}
                data-viz-manim-animation-lifecycle-target-id={manimAnimationLifecyclePlan.targetObjectId}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-animation-lifecycle-json
                dangerouslySetInnerHTML={{ __html: manimAnimationLifecycleJson }}
              />
            </>
          ) : null}
          {manimTransformBeginPlan ? (
            <>
              <span
                data-viz-manim-transform-begin
                data-viz-manim-transform-begin-plan-id={manimTransformBeginPlan.animationPlanId}
                data-viz-manim-transform-begin-signature={manimTransformBeginPlan.signature}
                data-viz-manim-transform-begin-target-id={manimTransformBeginPlan.targetObjectId}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-transform-begin-json
                dangerouslySetInnerHTML={{ __html: manimTransformBeginJson }}
              />
            </>
          ) : null}
          {manimTransformMatchingPlan ? (
            <>
              <span
                data-viz-manim-transform-matching-plan
                data-viz-manim-transform-matching-plan-summary={manimTransformMatchingPlan.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-transform-matching-json
                dangerouslySetInnerHTML={{ __html: manimTransformMatchingJson }}
              />
            </>
          ) : null}
          {manimTransformFamilyAlignmentPlan ? (
            <>
              <span
                data-viz-manim-transform-family-alignment-plan
                data-viz-manim-transform-family-alignment-plan-summary={
                  manimEvidenceAttributes?.["data-viz-manim-transform-family-alignment-summary"] ?? ""
                }
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-transform-family-alignment-json
                dangerouslySetInnerHTML={{ __html: manimTransformFamilyAlignmentJson ?? "" }}
              />
            </>
          ) : null}
          {manimTransformPointAlignmentPlan ? (
            <>
              <span
                data-viz-manim-transform-point-alignment-plan
                data-viz-manim-transform-point-alignment-plan-summary={
                  manimTransformPointAlignmentAttributes?.["data-viz-manim-transform-point-alignment-summary"] ?? ""
                }
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-transform-point-alignment-json
                dangerouslySetInnerHTML={{ __html: manimTransformPointAlignmentJson ?? "" }}
              />
            </>
          ) : null}
          {manimTransformDataLockEvidence ? (
            <>
              <span
                data-viz-manim-transform-data-lock-plan
                data-viz-manim-transform-data-lock-plan-summary={manimTransformDataLockEvidence.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-transform-data-lock-json
                dangerouslySetInnerHTML={{ __html: manimTransformDataLockJson ?? "" }}
              />
            </>
          ) : null}
          {manimMobjectDataTable ? (
            <>
              <span
                data-viz-mobject-data-array
                data-viz-mobject-data-array-ids={manimMobjectDataTable.objectIds}
                data-viz-mobject-data-array-signature={manimMobjectDataTable.signature}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-mobject-data-array-json
                dangerouslySetInnerHTML={{ __html: manimMobjectDataJson }}
              />
            </>
          ) : null}
          {manimMobjectCopyPlan ? (
            <>
              <span
                data-viz-mobject-copy-plan
                data-viz-mobject-copy-plan-root-id={manimMobjectCopyPlan.copyRootId}
                data-viz-mobject-copy-plan-signature={manimMobjectCopyPlan.signature}
                data-viz-mobject-copy-plan-source-id={manimMobjectCopyPlan.sourceObjectId}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-mobject-copy-plan-json
                dangerouslySetInnerHTML={{ __html: manimMobjectCopyPlanJson }}
              />
            </>
          ) : null}
          {manimMobjectLayoutPlan ? (
            <>
              <span
                data-viz-mobject-layout
                data-viz-mobject-layout-align-target-id={"alignTargetId" in manimMobjectLayoutPlan ? manimMobjectLayoutPlan.alignTargetId : "none"}
                data-viz-mobject-layout-aligned-axes={"alignedAxes" in manimMobjectLayoutPlan ? manimMobjectLayoutPlan.alignedAxes : "none"}
                data-viz-mobject-layout-frame-anchor={manimMobjectLayoutAttributes?.["data-viz-mobject-layout-frame-anchor"] ?? "none"}
                data-viz-mobject-layout-frame-bounds={
                  manimMobjectLayoutAttributes?.["data-viz-mobject-layout-frame-bounds"] ?? "0.000,0.000,0.000..0.000,0.000,0.000"
                }
                data-viz-mobject-layout-frame-target={manimMobjectLayoutAttributes?.["data-viz-mobject-layout-frame-target"] ?? "0.000,0.000,0.000"}
                data-viz-mobject-layout-kind={manimMobjectLayoutPlan.layoutKind}
                data-viz-mobject-layout-next-gap={"gap" in manimMobjectLayoutPlan ? manimMobjectLayoutPlan.gap.toFixed(3) : "0.000"}
                data-viz-mobject-layout-next-target-id={"nextTargetId" in manimMobjectLayoutPlan ? manimMobjectLayoutPlan.nextTargetId : "none"}
                data-viz-mobject-layout-object-count={manimMobjectLayoutPlan.objectCount}
                data-viz-mobject-layout-signature={manimMobjectLayoutPlan.signature}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-mobject-layout-json
                dangerouslySetInnerHTML={{ __html: manimMobjectLayoutJson }}
              />
            </>
          ) : null}
          {manimMobjectRenderOrderPlan ? (
            <>
              <span
                data-viz-mobject-render-order
                data-viz-mobject-render-order-rendered-count={manimMobjectRenderOrderPlan.renderedObjectCount}
                data-viz-mobject-render-order-signature={manimMobjectRenderOrderPlan.signature}
                data-viz-mobject-render-order-summary={manimMobjectRenderOrderPlan.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-mobject-render-order-json
                dangerouslySetInnerHTML={{ __html: manimMobjectRenderOrderJson }}
              />
            </>
          ) : null}
          {manimMobjectUniformPayload ? (
            <>
              <span
                data-viz-mobject-uniform-plan
                data-viz-mobject-uniform-source-contract={
                  manimMobjectUniformPayload.sourceContract ?? MOBJECT_UNIFORM_SOURCE_CONTRACT
                }
                data-viz-mobject-uniform-summary={manimMobjectUniformPayload.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-mobject-uniform-json
                dangerouslySetInnerHTML={{ __html: manimMobjectUniformJson }}
              />
            </>
          ) : null}
          {manimMobjectStatePayload ? (
            <>
              <span
                data-viz-mobject-state
                data-viz-mobject-state-signature={manimMobjectStatePayload.signature}
                data-viz-mobject-state-snapshot-count={manimMobjectStatePayload.snapshotCount}
                data-viz-mobject-state-target-count={manimMobjectStatePayload.targetCount}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-mobject-state-json
                dangerouslySetInnerHTML={{ __html: manimMobjectStateJson }}
              />
            </>
          ) : null}
          {manimMobjectStateRestoreBridgePlan ? (
            <>
              <span
                data-viz-mobject-state-restore-bridge-plan
                data-viz-mobject-state-restore-bridge-object-id={manimMobjectStateRestoreBridgePlan.objectId}
                data-viz-mobject-state-restore-bridge-restored={
                  manimMobjectStateRestoreBridgePlan.restored ? "true" : "false"
                }
                data-viz-mobject-state-restore-bridge-summary={manimMobjectStateRestoreBridgePlan.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-mobject-state-restore-bridge-json
                dangerouslySetInnerHTML={{ __html: manimMobjectStateRestoreBridgeJson }}
              />
            </>
          ) : null}
          {manimMobjectMoveToTargetBridgePlan ? (
            <>
              <span
                data-viz-mobject-move-to-target-plan
                data-viz-mobject-move-to-target-object-id={manimMobjectMoveToTargetBridgePlan.objectId}
                data-viz-mobject-move-to-target-target-id={manimMobjectMoveToTargetBridgePlan.targetId}
                data-viz-mobject-move-to-target-summary={manimMobjectMoveToTargetBridgePlan.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-mobject-move-to-target-json
                dangerouslySetInnerHTML={{ __html: manimMobjectMoveToTargetBridgeJson }}
              />
            </>
          ) : null}
          {manimMobjectAnchorEvidence ? (
            <>
              <span
                data-viz-mobject-anchor-plan
                data-viz-mobject-anchor-summary={manimMobjectAnchorEvidence.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-mobject-anchor-json
                dangerouslySetInnerHTML={{ __html: manimMobjectAnchorJson }}
              />
            </>
          ) : null}
          {manimMobjectMaterialUniformEvidence ? (
            <>
              <span
                data-viz-mobject-material-plan
                data-viz-mobject-material-summary={manimMobjectMaterialUniformEvidence.summary}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-mobject-material-json
                dangerouslySetInnerHTML={{ __html: manimMobjectMaterialUniformJson }}
              />
            </>
          ) : null}
          {manimMobjectDirtyStatePayload ? (
            <>
              <span
                data-viz-mobject-dirty-state
                data-viz-mobject-dirty-state-cache-status={manimMobjectDirtyStatePayload.cacheStatus}
                data-viz-mobject-dirty-state-invalidated-count={manimMobjectDirtyStatePayload.invalidatedCount}
                data-viz-mobject-dirty-state-signature={manimMobjectDirtyStatePayload.signature}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-mobject-dirty-state-json
                dangerouslySetInnerHTML={{ __html: manimMobjectDirtyStateJson }}
              />
            </>
          ) : null}
          {manimMobjectInvalidationPlan ? (
            <>
              <span
                data-viz-mobject-invalidation-plan
                aria-label={summarizeMobjectInvalidation(manimMobjectInvalidationPlan)}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-mobject-invalidation-json
                dangerouslySetInnerHTML={{ __html: manimMobjectInvalidationJson }}
              />
            </>
          ) : null}
          {manimMobjectFamilyIndex && manimMobjectFamilySummary ? (
            <>
              <span
                data-viz-mobject-family-plan
                data-viz-mobject-family-plan-member-count={manimMobjectFamilySummary.familyMemberCount}
                data-viz-mobject-family-plan-root-count={manimMobjectFamilySummary.rootCount}
                data-viz-mobject-family-plan-summary={`family:roots=${manimMobjectFamilySummary.rootCount}:members=${manimMobjectFamilySummary.familyMemberCount}:maxDepth=${manimMobjectFamilySummary.maxDepth}:orphans=${manimMobjectFamilySummary.orphanCount}:cycles=${manimMobjectFamilySummary.cycleCount}`}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-mobject-family-json
                dangerouslySetInnerHTML={{ __html: manimMobjectFamilyJson }}
              />
            </>
          ) : null}
          {manimRuntimeGraphFrame ? (
            <>
              <span
                data-viz-manim-runtime-graph
                data-viz-manim-runtime-graph-summary={
                  manimRuntimeGraphFrameAttributes?.["data-viz-manim-runtime-graph-summary"] ??
                  "runtime-graph:objects=0:top=none:render=none:foreground=none:fixed=none:finiteBounds=0:excluded=none"
                }
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-runtime-graph-json
                dangerouslySetInnerHTML={{ __html: manimRuntimeGraphFrameJson }}
              />
            </>
          ) : null}
          {manimMobjectFamilyCachePlan ? (
            <>
              <span
                data-viz-mobject-family-cache-plan
                aria-label={summarizeMobjectFamilyCachePlan(manimMobjectFamilyCachePlan)}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-mobject-family-cache-json
                dangerouslySetInnerHTML={{ __html: manimMobjectFamilyCacheJson }}
              />
            </>
          ) : null}
          {manimMobjectPointCloudTable ? (
            <>
              <span
                data-viz-mobject-point-cloud
                data-viz-mobject-point-cloud-ids={manimMobjectPointCloudTable.familyIds}
                data-viz-mobject-point-cloud-signature={manimMobjectPointCloudTable.signature}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-mobject-point-cloud-json
                dangerouslySetInnerHTML={{ __html: manimMobjectPointCloudJson }}
              />
            </>
          ) : null}
          {manimUpdaterSignaturePlan ? (
            <>
              <span
                data-viz-manim-updater-signature
                data-viz-manim-updater-signature-count={manimUpdaterSignaturePlan.totalUpdaterCount}
                data-viz-manim-updater-signature-signature={manimUpdaterSignaturePlan.signature}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-updater-signature-json
                dangerouslySetInnerHTML={{ __html: manimUpdaterSignatureJson }}
              />
            </>
          ) : null}
          {manimUpdaterSuspensionPlan ? (
            <>
              <span
                data-viz-manim-updater-suspension-plan
                data-viz-manim-updater-suspension-phase={manimUpdaterSuspensionPlan.phase}
                data-viz-manim-updater-suspension-suspended-count={manimUpdaterSuspensionPlan.suspendedUpdaterIds.length}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-updater-suspension-json
                dangerouslySetInnerHTML={{ __html: manimUpdaterSuspensionJson }}
              />
            </>
          ) : null}
          {manimUpdaterExecutionPlan ? (
            <>
              <span
                data-viz-manim-updater-execution
                data-viz-manim-updater-execution-phase={manimUpdaterExecutionPlan.phase}
                data-viz-manim-updater-execution-signature={manimUpdaterExecutionPlan.signature}
                data-viz-manim-updater-execution-updater-count={manimUpdaterExecutionPlan.totalUpdaterCount}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-updater-execution-json
                dangerouslySetInnerHTML={{ __html: manimUpdaterExecutionJson }}
              />
            </>
          ) : null}
          {manimValueTrackerPayload ? (
            <>
              <span
                data-viz-manim-value-tracker
                data-viz-manim-value-tracker-count={manimValueTrackerPayload.totalTrackerCount}
                data-viz-manim-value-tracker-signature={manimValueTrackerPayload.signature}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-manim-value-tracker-json
                dangerouslySetInnerHTML={{ __html: manimValueTrackerJson }}
              />
            </>
          ) : null}
          {manimMobjectBoundingBoxTable ? (
            <>
              <span
                data-viz-mobject-bounding-box
                data-viz-mobject-bounding-box-ids={manimMobjectBoundingBoxTable.objectIds}
                data-viz-mobject-bounding-box-signature={manimMobjectBoundingBoxTable.signature}
                className="sr-only"
              />
              <script
                type="application/json"
                data-viz-mobject-bounding-box-json
                dangerouslySetInnerHTML={{ __html: manimMobjectBoundingBoxJson }}
              />
            </>
          ) : null}
          {manimScene.objects.map((object) => (
            <span
              key={object.id}
              data-viz-concept-id={"conceptId" in object ? object.conceptId : `${object.id}:trace`}
              data-viz-manim-mark={object.id}
              data-viz-manim-object-type={object.type}
              className="sr-only"
            />
          ))}
          <div
            data-viz-manim-control-dock
            data-viz-manim-presentation={presentation}
            data-viz-manim-authoring-controls-visible={String(showAuthoringControls)}
            className="relative z-10 flex flex-col gap-2 border-t border-white/10 bg-slate-950/88 p-2 text-[11px] font-black text-cyan-50 shadow-inner shadow-slate-950/20 sm:p-3"
          >
            <div data-viz-manim-control-row="camera" className="flex min-w-0 flex-wrap items-center gap-2">
              <button
                type="button"
                data-viz-three-reset-camera
                onClick={resetCameraAndTimeline}
                className="focus-ring rounded-xl border border-white/15 bg-white/92 px-2.5 py-1.5 text-slate-900 shadow-sm shadow-cyan-200/10 transition hover:bg-cyan-100 dark:bg-slate-900/88 dark:text-cyan-50 dark:hover:bg-slate-800"
              >
                Reset camera
              </button>
          {showAuthoringControls ? (
          <div
            data-viz-manim-camera-mode-control
            role="group"
            aria-label="MAIS Manim camera mode"
            className="flex flex-wrap items-center gap-1 rounded-2xl border border-white/15 bg-slate-950/70 p-1 text-[11px] font-black text-cyan-50 shadow-lg shadow-slate-950/20 backdrop-blur"
          >
            <button
              type="button"
              data-viz-manim-camera-mode-option="guided"
              aria-pressed={manimCameraMode === "guided"}
              onClick={() => switchManimCameraMode("guided")}
              className={`focus-ring rounded-xl px-2.5 py-1.5 transition ${
                manimCameraMode === "guided"
                  ? "bg-cyan-200 text-slate-950 shadow-sm shadow-cyan-200/20"
                  : "text-cyan-50/80 hover:bg-white/10"
              }`}
            >
              Guide
            </button>
            <button
              type="button"
              data-viz-manim-camera-mode-option="explore"
              aria-pressed={manimCameraMode === "explore"}
              onClick={() => switchManimCameraMode("explore")}
              className={`focus-ring rounded-xl px-2.5 py-1.5 transition ${
                manimCameraMode === "explore"
                  ? "bg-amber-200 text-slate-950 shadow-sm shadow-amber-200/20"
                  : "text-cyan-50/80 hover:bg-white/10"
              }`}
            >
              Explore
            </button>
            <select
              data-viz-manim-camera-shot-control
              aria-label="Jump to MAIS Manim camera shot"
              value={runtimeDiagnostics.cameraShot}
              onChange={(event) => jumpToManimCameraShot(event.currentTarget.value)}
              className="focus-ring max-w-[8.5rem] rounded-xl border border-white/10 bg-slate-950/75 px-2 py-1.5 text-cyan-50"
            >
              {manimCameraShotCatalog.map((shot) => (
                <option key={shot.shotId} value={shot.shotId}>
                  {shot.label}
                </option>
              ))}
            </select>
          </div>
          ) : null}
            </div>
            {showAuthoringControls ? (
            <div data-viz-manim-control-row="capture" className="flex min-w-0 flex-wrap items-center gap-2">
          <div
            data-viz-manim-capture-control
            role="group"
            aria-label="MAIS Manim capture"
            className="flex min-w-0 flex-wrap items-center gap-1 rounded-2xl border border-white/15 bg-slate-950/70 p-1 text-[11px] font-black text-cyan-50 shadow-lg shadow-slate-950/20 backdrop-blur"
          >
            <select
              data-viz-manim-scene-selector-control
              aria-label="Select MAIS Manim scene spec"
              value={manimSelectedSceneFamilyId}
              onChange={(event) => setManimSelectedSceneFamilyId(event.currentTarget.value as ThreeDFamilyId)}
              className="focus-ring max-w-[10rem] rounded-xl border border-white/10 bg-slate-950/75 px-2 py-1.5 text-cyan-50"
            >
              {manimSceneSelectorCatalog.map((entry) => (
                <option key={entry.familyId} value={entry.familyId}>
                  {entry.label}
                </option>
              ))}
            </select>
            <select
              data-viz-manim-render-quality-control
              aria-label="Select MAIS Manim render quality"
              value={manimRenderQualityPreset}
              onChange={(event) => setManimRenderQualityPreset(event.currentTarget.value as MathSceneRenderQualityPreset)}
              className="focus-ring max-w-[6.5rem] rounded-xl border border-white/10 bg-slate-950/75 px-2 py-1.5 text-cyan-50"
            >
              <option value="interactive">Live</option>
              <option value="hd">HD</option>
              <option value="production">1080p</option>
              <option value="fourk">4K</option>
              <option value="preview">Preview</option>
            </select>
            <label
              data-viz-manim-render-quality-transparent-control
              className="focus-within:ring-2 focus-within:ring-cyan-300 flex items-center gap-1 rounded-xl border border-white/10 bg-slate-950/75 px-2 py-1.5 text-cyan-50"
            >
              <input
                type="checkbox"
                aria-label="Use transparent MAIS Manim background"
                checked={manimRenderTransparentBackground}
                onChange={(event) => setManimRenderTransparentBackground(event.currentTarget.checked)}
                className="h-3 w-3 accent-cyan-200"
              />
              <span>Alpha</span>
            </label>
            <button
              type="button"
              data-viz-manim-capture-screenshot
              onClick={captureManimScreenshot}
              className="focus-ring rounded-xl bg-cyan-200 px-2.5 py-1.5 text-slate-950 shadow-sm shadow-cyan-200/20 transition hover:bg-cyan-100"
            >
              Shot
            </button>
            <button
              type="button"
              data-viz-manim-capture-video-plan
              onClick={planManimVideoCapture}
              className="focus-ring rounded-xl border border-white/10 bg-white/10 px-2.5 py-1.5 text-cyan-50 transition hover:bg-white/15"
            >
              Video
            </button>
          </div>
            </div>
            ) : null}
            <div data-viz-manim-control-row="playback" className="flex min-w-0 flex-wrap items-center gap-2">
          <div
            data-viz-manim-playback-control
            className="flex min-w-0 flex-1 flex-wrap items-center gap-2 rounded-2xl border border-white/15 bg-slate-950/72 p-2 text-[11px] font-black text-cyan-50 shadow-lg shadow-slate-950/20 backdrop-blur"
          >
            <button
              type="button"
              data-viz-manim-playback-toggle
              onClick={toggleManimPlayback}
              className="focus-ring rounded-xl bg-cyan-200 px-2.5 py-1.5 text-slate-950 shadow-sm shadow-cyan-200/20 transition hover:bg-cyan-100"
            >
              {manimPlaybackState === "playing" ? "Pause" : "Play"}
            </button>
            <div
              data-viz-manim-timeline-scrubber
              role="slider"
              aria-label="MAIS Manim timeline"
              aria-valuemin={0}
              aria-valuemax={1000}
              aria-valuenow={Math.round(manimScrubProgress * 1000)}
              tabIndex={0}
              onClick={scrubManimTimelineFromPointer}
              onKeyDown={scrubManimTimelineFromKeyboard}
              className="focus-ring relative h-4 min-w-0 flex-1 cursor-pointer rounded-full bg-white/15"
            >
              <span
                className="absolute left-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-cyan-300"
                style={{ width: `${Math.round(manimScrubProgress * 100)}%` }}
              />
            </div>
            <span data-viz-manim-timeline-label className="tabular-nums text-cyan-50/85">
              {manimElapsedSeconds.toFixed(1)}s / {manimTotalDuration.toFixed(1)}s
            </span>
            {showAuthoringControls ? (
            <div data-viz-manim-parameter-panel-control className="flex min-w-0 flex-wrap items-center gap-1">
              <select
                aria-label="Inspect MAIS Manim parameter"
                value={activeManimParameterId}
                onChange={(event) => setManimSelectedParameterId(event.currentTarget.value)}
                className="focus-ring max-w-[9rem] rounded-xl border border-white/10 bg-slate-950/75 px-2 py-1.5 text-cyan-50"
              >
                {manimParameterPanelCatalog.map((parameter) => (
                  <option key={parameter.id} value={parameter.id}>
                    {parameter.label}
                  </option>
                ))}
              </select>
              <span
                data-viz-manim-parameter-panel-value
                data-viz-manim-parameter-panel-role={activeManimParameter?.role ?? "none"}
                className="min-w-[4.5rem] rounded-xl border border-white/10 bg-white/10 px-2 py-1.5 text-right tabular-nums text-cyan-50/90"
              >
                {activeManimParameter ? activeManimParameter.value.toFixed(2) : "n/a"}
              </span>
            </div>
            ) : null}
            {showAuthoringControls ? (
            <div data-viz-manim-checkpoint-control className="flex min-w-0 flex-wrap items-center gap-1">
              <input
                data-viz-manim-checkpoint-paste-input
                aria-label="MAIS Manim checkpoint paste snippet"
                value={manimCheckpointPasteText}
                onChange={(event) => setManimCheckpointPasteText(event.currentTarget.value)}
                placeholder="# checkpoint"
                className="focus-ring w-[7rem] min-w-0 rounded-xl border border-white/10 bg-slate-950/75 px-2 py-1.5 text-cyan-50 placeholder:text-cyan-50/40"
              />
              <button
                type="button"
                data-viz-manim-checkpoint-paste-control
                onClick={applyManimCheckpointPastePlan}
                className="focus-ring rounded-xl border border-white/10 bg-white/10 px-2.5 py-1.5 text-cyan-50 transition hover:bg-white/15"
              >
                Paste
              </button>
              <button
                type="button"
                data-viz-manim-save-checkpoint
                onClick={saveManimCheckpoint}
                className="focus-ring rounded-xl border border-white/10 bg-white/10 px-2.5 py-1.5 text-cyan-50 transition hover:bg-white/15"
              >
                Save
              </button>
              <button
                type="button"
                data-viz-manim-restore-checkpoint
                disabled={manimCheckpointKeys.length === 0}
                onClick={restoreLatestManimCheckpoint}
                className="focus-ring rounded-xl border border-white/10 bg-white/10 px-2.5 py-1.5 text-cyan-50 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Restore {manimCheckpointKeys.length}
              </button>
            </div>
            ) : null}
            {showAuthoringControls ? (
            <div data-viz-manim-history-control className="flex min-w-0 flex-wrap items-center gap-1">
              <button
                type="button"
                data-viz-manim-undo
                disabled={!manimHistorySummary.canUndo}
                onClick={undoManimHistory}
                className="focus-ring rounded-xl border border-white/10 bg-white/10 px-2.5 py-1.5 text-cyan-50 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Undo
              </button>
              <button
                type="button"
                data-viz-manim-redo
                disabled={!manimHistorySummary.canRedo}
                onClick={redoManimHistory}
                className="focus-ring rounded-xl border border-white/10 bg-white/10 px-2.5 py-1.5 text-cyan-50 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Redo
              </button>
            </div>
            ) : null}
            {showAuthoringControls ? (
            <div data-viz-manim-authoring-control className="flex min-w-0 flex-wrap items-center gap-1">
              <select
                data-viz-manim-run-from-beat
                aria-label="Run MAIS Manim from beat"
                value={manimRunFromBeatIndex}
                onChange={(event) => runManimFromBeat(Number(event.currentTarget.value))}
                className="focus-ring max-w-[8.5rem] rounded-xl border border-white/10 bg-slate-950/75 px-2 py-1.5 text-cyan-50"
              >
                {manimPlaybackPlan?.plays.map((play) => (
                  <option key={play.playIndex} value={play.playIndex}>
                    {labelForManimBeat(play)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                data-viz-manim-show-final
                onClick={showManimFinalFrame}
                className="focus-ring rounded-xl border border-white/10 bg-white/10 px-2.5 py-1.5 text-cyan-50 transition hover:bg-white/15"
              >
                Final
              </button>
            </div>
            ) : null}
          </div>
            </div>
          </div>
        </>
      ) : (
        <div
          data-viz-three-formula
          aria-label="Scrollable three dimensional visualization formula"
          role="region"
          tabIndex={0}
          className="pointer-events-auto absolute left-3 top-3 max-w-[calc(100%-1.5rem)] overflow-x-auto overscroll-x-contain rounded-2xl border border-white/10 bg-slate-950/72 px-3.5 py-2.5 text-sm font-black leading-tight text-cyan-50 shadow-lg shadow-slate-950/20 [&_.katex]:text-[1.08em]"
        >
          <MathText text={formulaText} ariaLabel="Three dimensional visualization formula" normalizeMath={false} />
        </div>
      )}
      {!manimScene ? (
        <button
          type="button"
          data-viz-three-reset-camera
          onClick={resetCameraAndTimeline}
          className="focus-ring absolute bottom-3 right-3 rounded-2xl border border-white/15 bg-white/92 px-3 py-2 text-xs font-black text-slate-900 shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5 hover:bg-cyan-100 dark:bg-slate-900/88 dark:text-cyan-50 dark:hover:bg-slate-800"
        >
          Reset camera
        </button>
      ) : null}
    </div>
  );
}
