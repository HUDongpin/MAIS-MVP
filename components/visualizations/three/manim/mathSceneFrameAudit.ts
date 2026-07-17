import { stepMathSceneFrame } from "./mathSceneFrameStepper";
import {
  SCENE_PLAYBACK_SOURCE_CONTRACT,
  buildScenePlaybackEventStream,
  sampleScenePlaybackFrames
} from "./mathScenePlayback";
import { MOBJECT_INTERPOLATE_DATA_SOURCE_SUMMARY } from "./mathAnimationRuntime";
import { CAMERA_FRAME_SOURCE_CONTRACT } from "./mathCameraFrame";
import { buildCameraFramePayload } from "./mathCameraFramePayload";
import {
  FORMULA_LAYER_SOURCE_CONTRACT,
  buildFormulaLayerState
} from "./mathFormulaLayer";
import {
  FORMULA_SVG_MORPH_RUNTIME_SOURCE_CONTRACT,
  buildFormulaSvgMorphRuntime
} from "./mathFormulaSvgMorphRuntime";
import { buildMobjectFamilyIndex } from "./mathMobjectFamily";
import { MOVE_ALONG_VECTOR_FIELD_SOURCE_CONTRACT } from "./mathMoveAlongVectorField";
import {
  VALUE_TRACKER_SOURCE_CONTRACT,
  buildMathValueTrackerPayload
} from "./mathValueTrackerPayload";
import {
  TRANSFORM_PATH_NON_POINT_FIELD_POLICY,
  TRANSFORM_PATH_POINTLIKE_FIELD_POLICY
} from "./mathPathFunctions";
import type { MathSceneRenderQualityPlan, MathSceneRendererMode, MathSceneRenderQualityPreset } from "./mathSceneRenderQuality";
import type { ProjectionViewport } from "./mathProjectedLabels";
import type { MathSceneSpec } from "./mathSceneTypes";
import { TRANSFORM_FAMILY_ALIGNMENT_ZIP_POLICY } from "./mathTransformFamilyAlignment";
import {
  UPDATER_SUSPENSION_POLICY,
  UPDATER_SUSPENSION_SOURCE_CONTRACT,
  buildUpdaterSuspensionPlan
} from "./mathUpdaterSuspension";
import { buildMathUpdaterExecutionPlan, summarizeMathUpdaterExecutionPlan } from "./mathUpdaterExecutionPlan";
import type { MathSceneRuntimeState } from "./mathSceneRuntimeState";

export const SCENE_FRAME_AUDIT_SOURCE_CONTRACT =
  "Scene.update_frame->FrameAudit sample frames|stepper/capture/formula viewport evidence";
export const SCENE_FRAME_DIRECTOR_TRACE_SOURCE_CONTRACT =
  "Scene.update_frame director trace|CameraFrame+FormulaLayer+SVGMorph synchronized keyframes";

export type MathSceneFrameAuditFrame = {
  activeAnimationNodeCount: number;
  activeAnimationNodeProgressSummary: string;
  activeAnimationObjectId: string;
  activeAnimationPlanId: string;
  activeAnimationPlanIds: string;
  activeAnimationProgress: number;
  activeAnimationTargetObjectId: string;
  activeStep: string;
  cameraFrameActiveShotId: string;
  cameraFrameCurrentFrameId: string;
  cameraFrameFiniteMatrixEntryCount: number;
  cameraFrameFixedOverlayCount: number;
  cameraFrameFov: number;
  cameraFrameGamma: number;
  cameraFramePhi: number;
  cameraFramePosition: string;
  cameraFrameProgress: number;
  cameraFrameSourceContract: typeof CAMERA_FRAME_SOURCE_CONTRACT;
  cameraFrameTarget: string;
  cameraFrameTheta: number;
  cameraFrameUniformCenter: string;
  cameraFrameUniformSummary: string;
  cameraFrameViewInverseMaxError: number;
  cameraFrameViewInverseReady: boolean;
  cameraShot: string;
  captureHeight: number;
  captureWidth: number;
  deltaSeconds: number;
  elapsedSeconds: number;
  formulaLayerActiveObjectIds: string;
  formulaLayerActiveTokenCount: number;
  formulaLayerBoundTokenCount: number;
  formulaLayerScreenFixed: boolean;
  formulaLayerSourceContract: typeof FORMULA_LAYER_SOURCE_CONTRACT;
  formulaLayerTokenCount: number;
  formulaSvgMorphRuntimeCompatibleFrameCount: number;
  formulaSvgMorphRuntimeFormulaId: string;
  formulaSvgMorphRuntimeFrameCount: number;
  formulaSvgMorphRuntimeFrameIds: string;
  formulaSvgMorphRuntimeFramePathPreview: string;
  formulaSvgMorphRuntimeIssueCount: number;
  formulaSvgMorphRuntimeProgress: number;
  formulaSvgMorphRuntimeSourceContract: typeof FORMULA_SVG_MORPH_RUNTIME_SOURCE_CONTRACT;
  formulaMobileViewport: boolean;
  frameIndex: number;
  mobjectPointPositionSummary: string;
  moveAlongVectorFieldCount: number;
  moveAlongVectorFieldDeltaSummary: string;
  moveAlongVectorFieldDisplacementMagnitudeRange: string;
  moveAlongVectorFieldMovedCount: number;
  moveAlongVectorFieldObjectIds: string;
  moveAlongVectorFieldSourceContract: typeof MOVE_ALONG_VECTOR_FIELD_SOURCE_CONTRACT;
  moveAlongVectorFieldStatusSummary: string;
  moveAlongVectorFieldSummary: string;
  playbackLifecyclePhase: string;
  renderGroupIds: string;
  renderGroupOverlapIds: string;
  subAlphaCompleteNodeCount: number;
  subAlphaDelayedNodeCount: number;
  subAlphaEasedMax: number;
  subAlphaEasedMin: number;
  subAlphaFamilyZipCoveredNodeCount: number;
  subAlphaFamilyZipMissingNodeCount: number;
  subAlphaFamilyZipPolicy: typeof TRANSFORM_FAMILY_ALIGNMENT_ZIP_POLICY;
  subAlphaFamilyZipSequence: string;
  subAlphaFamilyZipTupleCount: number;
  subAlphaFamilyZipUncoveredObjectIds: string;
  subAlphaLaggedMax: number;
  subAlphaLaggedMin: number;
  subAlphaLeadingNodeCount: number;
  subAlphaNodeCount: number;
  subAlphaNodeWindowSummary: string;
  subAlphaObjectIds: string;
  subAlphaPartialNodeCount: number;
  subAlphaRateFunctionIds: string;
  subAlphaRawMax: number;
  subAlphaRawMin: number;
  subAlphaStaggeredNodeCount: number;
  subAlphaZeroNodeCount: number;
  transformInterpolateFieldArcPathNodeCount: number;
  transformInterpolateFieldBoundingBoxNodeCount: number;
  transformInterpolateFieldNodeCount: number;
  transformInterpolateFieldNonPointCount: number;
  transformInterpolateFieldNonPointPolicy: typeof TRANSFORM_PATH_NON_POINT_FIELD_POLICY;
  transformInterpolateFieldObjectIds: string;
  transformInterpolateFieldPathSummary: string;
  transformInterpolateFieldPointlikeCount: number;
  transformInterpolateFieldPointlikePolicy: typeof TRANSFORM_PATH_POINTLIKE_FIELD_POLICY;
  transformInterpolateFieldPointlikeSummary: string;
  transformInterpolateFieldSourceSummary: typeof MOBJECT_INTERPOLATE_DATA_SOURCE_SUMMARY;
  transformInterpolateFieldStraightPathNodeCount: number;
  transformInterpolateFieldStyleNodeCount: number;
  transformInterpolateFieldSummary: string;
  transformInterpolateFieldUniformNodeCount: number;
  trackerHiddenMobjectIds: string;
  trackerIds: string;
  trackerNormalizedValueSummary: string;
  trackerSourceContract: typeof VALUE_TRACKER_SOURCE_CONTRACT;
  trackerSourceSummary: string;
  trackerUniformValueSummary: string;
  updaterActiveCount: number;
  updaterExecutionActiveCallSequenceSummary: string;
  updaterExecutionFamilyTraversalSummary: string;
  updaterExecutionOrderSummary: string;
  updaterExecutionSummary: string;
  updaterSuspensionOwnedObjectIds: string;
  updaterSuspensionPhase: "animation" | "open";
  updaterSuspensionReasonSummary: string;
  updaterSuspensionSuspendedObjectIds: string;
  updaterSuspensionSuspendedUpdaterIds: string;
  updaterSuspendedCount: number;
};

export type MathSceneFrameAudit = {
  activeAnimationFrameCount: number;
  authoredAnimationPlanCount: number;
  expectedRenderGroupIds: string[];
  fps: number;
  frameInterval: number;
  frames: MathSceneFrameAuditFrame[];
  playLifecycleEventCount: number;
  playLifecycleEventFirstKey: string;
  playLifecycleEventLastKey: string;
  playLifecycleEventPhaseSummary: string;
  playLifecycleEventSourceContract: typeof SCENE_PLAYBACK_SOURCE_CONTRACT;
  playLifecycleEventSummary: string;
  qualityPreset: MathSceneRenderQualityPreset;
  rendererMode: MathSceneRendererMode;
  samplingMode: "full-playback" | "show-final";
  sceneId: string;
  skipAnimations: boolean;
  sourceContract: typeof SCENE_FRAME_AUDIT_SOURCE_CONTRACT;
  transformFrameCount: number;
};

export type MathSceneFrameAuditSummary = {
  activeAnimationFrameCount: number;
  activeAnimationNodeProgressSummary: string;
  activeAnimationPlanIds: string[];
  animationPlanFrameSummary: string;
  authoredAnimationPlanCount: number;
  captureHeight: number;
  captureWidth: number;
  directorTraceCameraToKeyFrameCount: number;
  directorTraceFormulaFixedKeyFrameCount: number;
  directorTraceKeyFrameCount: number;
  directorTraceSourceContract: typeof SCENE_FRAME_DIRECTOR_TRACE_SOURCE_CONTRACT;
  directorTraceSummary: string;
  directorTraceSvgMorphProgressRange: string;
  directorTraceTimeline: string;
  fps: number;
  frameCount: number;
  frameDeltaSummary: string;
  frameInterval: number;
  formulaMobileFrameCount: number;
  formulaLayerActiveObjectIds: string[];
  formulaLayerActiveObjectSummary: string;
  formulaLayerActiveTokenCountRange: string;
  formulaLayerBoundTokenCountRange: string;
  formulaLayerCameraToFrameCount: number;
  formulaLayerCameraToScreenFixedFrameCount: number;
  formulaLayerFrameCount: number;
  formulaLayerScreenFixedFrameCount: number;
  formulaLayerSourceContract: typeof FORMULA_LAYER_SOURCE_CONTRACT;
  formulaLayerSummary: string;
  formulaLayerTokenCountRange: string;
  formulaSvgMorphRuntimeCompatiblePathFrameCount: number;
  formulaSvgMorphRuntimeFormulaIds: string[];
  formulaSvgMorphRuntimeFrameIds: string[];
  formulaSvgMorphRuntimeFramePathPreview: string;
  formulaSvgMorphRuntimeIssueCount: number;
  formulaSvgMorphRuntimePathFrameCount: number;
  formulaSvgMorphRuntimeProgressRange: string;
  formulaSvgMorphRuntimeSampledFrameCount: number;
  formulaSvgMorphRuntimeSourceContract: typeof FORMULA_SVG_MORPH_RUNTIME_SOURCE_CONTRACT;
  formulaSvgMorphRuntimeSummary: string;
  maxActiveAnimationProgress: number;
  maxUpdaterActiveCount: number;
  maxUpdaterSuspendedCount: number;
  minActiveAnimationProgress: number;
  mobjectPointFrameCount: number;
  mobjectPointIds: string[];
  mobjectPointPositionRangeSummary: string;
  moveAlongVectorFieldDeltaSummary: string;
  moveAlongVectorFieldDisplacementMagnitudeRangeSummary: string;
  moveAlongVectorFieldFrameCount: number;
  moveAlongVectorFieldMovedFrameCount: number;
  moveAlongVectorFieldObjectIds: string[];
  moveAlongVectorFieldSourceContract: typeof MOVE_ALONG_VECTOR_FIELD_SOURCE_CONTRACT;
  moveAlongVectorFieldStatusSummary: string;
  moveAlongVectorFieldSummary: string;
  playLifecycleEventCount: number;
  playLifecycleEventFirstKey: string;
  playLifecycleEventLastKey: string;
  playLifecycleEventPhaseSummary: string;
  playLifecycleEventSourceContract: typeof SCENE_PLAYBACK_SOURCE_CONTRACT;
  playLifecycleEventSummary: string;
  playLifecycleTraceAnimationPlanSummary: string;
  playLifecycleTraceKeyFrameCount: number;
  playLifecycleTracePhaseSummary: string;
  playLifecycleTraceSourceContract: typeof SCENE_PLAYBACK_SOURCE_CONTRACT;
  playLifecycleTraceSummary: string;
  playLifecycleTraceTimeline: string;
  playbackPhaseSummary: string;
  primaryAnimationPlanFrameSummary: string;
  primaryAnimationPlanProgressSummary: string;
  qualityPreset: MathSceneRenderQualityPreset;
  rendererMode: MathSceneRendererMode;
  expectedRenderGroupIds: string[];
  renderGroupCoverageReady: boolean;
  renderGroupMissingFrameCount: number;
  renderGroupOverlapSummary: string;
  renderGroupSummary: string;
  sampledCameraShotIds: string[];
  sampledPlaybackPhaseIds: string[];
  sampledRenderGroupIds: string[];
  samplingMode: MathSceneFrameAudit["samplingMode"];
  sampledStepIds: string[];
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
  cameraFrameSourceContract: typeof CAMERA_FRAME_SOURCE_CONTRACT;
  cameraFrameSummary: string;
  cameraFrameTargetRangeSummary: string;
  cameraFrameThetaRange: string;
  cameraFrameUniformCenterRangeSummary: string;
  cameraFrameUniformSummary: string;
  cameraFrameViewInverseMaxError: number;
  cameraFrameViewInverseReadyFrameCount: number;
  cameraShotSummary: string;
  sceneId: string;
  skipAnimations: boolean;
  sourceContract: typeof SCENE_FRAME_AUDIT_SOURCE_CONTRACT;
  stepSummary: string;
  subAlphaCompleteNodeFrameCount: number;
  subAlphaDelayedNodeFrameCount: number;
  subAlphaEasedRange: string;
  subAlphaFamilyZipCoveredNodeFrameCount: number;
  subAlphaFamilyZipMaxTupleCount: number;
  subAlphaFamilyZipMissingNodeFrameCount: number;
  subAlphaFamilyZipPolicy: typeof TRANSFORM_FAMILY_ALIGNMENT_ZIP_POLICY;
  subAlphaFamilyZipSequenceSummary: string;
  subAlphaFamilyZipUncoveredObjectIds: string[];
  subAlphaFrameCount: number;
  subAlphaLaggedRange: string;
  subAlphaLeadingNodeFrameCount: number;
  subAlphaNodeFrameCount: number;
  subAlphaNodeWindowSummary: string;
  subAlphaObjectIds: string[];
  subAlphaPartialNodeFrameCount: number;
  subAlphaRateFunctionIds: string[];
  subAlphaRawRange: string;
  subAlphaStaggeredNodeFrameCount: number;
  subAlphaSummary: string;
  subAlphaZeroNodeFrameCount: number;
  transformFrameCount: number;
  transformInterpolateFieldArcPathNodeFrameCount: number;
  transformInterpolateFieldBoundingBoxNodeFrameCount: number;
  transformInterpolateFieldFrameCount: number;
  transformInterpolateFieldNodeFrameCount: number;
  transformInterpolateFieldNonPointFrameCount: number;
  transformInterpolateFieldNonPointPolicy: typeof TRANSFORM_PATH_NON_POINT_FIELD_POLICY;
  transformInterpolateFieldObjectIds: string[];
  transformInterpolateFieldPathSummary: string;
  transformInterpolateFieldPointlikeFrameCount: number;
  transformInterpolateFieldPointlikePolicy: typeof TRANSFORM_PATH_POINTLIKE_FIELD_POLICY;
  transformInterpolateFieldPointlikeSummary: string;
  transformInterpolateFieldSourceSummary: typeof MOBJECT_INTERPOLATE_DATA_SOURCE_SUMMARY;
  transformInterpolateFieldStraightPathNodeFrameCount: number;
  transformInterpolateFieldStyleNodeFrameCount: number;
  transformInterpolateFieldSummary: string;
  transformInterpolateFieldUniformNodeFrameCount: number;
  trackerAnimateFrameCount: number;
  trackerCount: number;
  trackerFrameCount: number;
  trackerHiddenMobjectCount: number;
  trackerHiddenMobjectIds: string[];
  trackerIds: string[];
  trackerNormalizedRangeSummary: string;
  trackerSourceContract: typeof VALUE_TRACKER_SOURCE_CONTRACT;
  trackerSourceSummary: string;
  trackerSummary: string;
  trackerUniformValueRangeSummary: string;
  updaterExecutionActiveCallSequenceSummary: string;
  updaterExecutionFamilyTraversalSummary: string;
  updaterExecutionOrderSummary: string;
  updaterExecutionSummary: string;
  updaterSummary: string;
  updaterSuspensionOwnedObjectIds: string[];
  updaterSuspensionOwnedObjectSummary: string;
  updaterSuspensionCountSummary: string;
  updaterSuspensionPhaseSummary: string;
  updaterSuspensionPolicy: typeof UPDATER_SUSPENSION_POLICY;
  updaterSuspensionReasonSummary: string;
  updaterSuspensionSourceContract: typeof UPDATER_SUSPENSION_SOURCE_CONTRACT;
  updaterSuspensionSummary: string;
  updaterSuspensionSuspendedFrameCount: number;
  updaterSuspensionSuspendedObjectIds: string[];
  updaterSuspensionSuspendedObjectSummary: string;
  updaterSuspensionSuspendedUpdaterFrameCount: number;
  updaterSuspensionSuspendedUpdaterIds: string[];
  updaterSuspensionSuspendedUpdaterSummary: string;
};

export type MathSceneFrameAuditOptions = {
  fps?: number;
  formulaLayerViewport?: ProjectionViewport;
  renderQuality?: MathSceneRenderQualityPlan;
  skipAnimations?: boolean;
};

type BuildFrameResult = {
  auditFrame: MathSceneFrameAuditFrame;
  runtimeState: MathSceneRuntimeState;
};

function finite(value: number | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function auditFps(fps: number | undefined) {
  return Math.max(1, Math.floor(finite(fps, 12)));
}

function roundMillis(value: number) {
  return Math.round(value * 1000) / 1000;
}

function formatNumber(value: number) {
  return finite(value, 0).toFixed(3);
}

function formatRange(min: number, max: number) {
  return `${formatNumber(min)}..${formatNumber(max)}`;
}

function formatVec3(value: [number, number, number]) {
  return value.map(formatNumber).join(",");
}

function uniqueIdsFromCsv(values: string[]) {
  return [
    ...new Set(
      values.flatMap((value) => value.split(",").filter((id) => id && id !== "none"))
    )
  ].sort((left, right) => left.localeCompare(right));
}

function countedSummary(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values.filter((entry) => entry && entry !== "none")) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.keys()]
    .sort((left, right) => left.localeCompare(right))
    .map((value) => `${value}:${counts.get(value) ?? 0}`)
    .join(",") || "none";
}

function playbackOrderedCountedSummary(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values.filter(Boolean)) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.keys()]
    .map((value) => `${value}:${counts.get(value) ?? 0}`)
    .join(",") || "none";
}

function lifecycleEventPhaseSummary(events: ReturnType<typeof buildScenePlaybackEventStream>) {
  const counts = new Map<string, number>();
  for (const event of events) {
    counts.set(event.phase, (counts.get(event.phase) ?? 0) + 1);
  }

  return [...counts.keys()]
    .map((phase) => `${phase}:${counts.get(phase) ?? 0}`)
    .join(",") || "none";
}

function lifecycleEventSummary(
  sceneId: string,
  events: ReturnType<typeof buildScenePlaybackEventStream>,
  phaseSummary: string
) {
  const firstKey = events[0]?.eventKey ?? "none";
  const lastKey = events.at(-1)?.eventKey ?? "none";

  return [
    `playLifecycleEvents:${sceneId}`,
    `events=${events.length}`,
    `phases=${phaseSummary}`,
    `first=${firstKey}`,
    `last=${lastKey}`
  ].join(":");
}

function rangeSummaryFromFrameValues(values: string[], marker: ":value=" | ":normalized=") {
  const ranges = new Map<string, { max: number; min: number }>();

  for (const summary of values) {
    for (const entry of summary.split("|")) {
      const markerIndex = entry.lastIndexOf(marker);
      if (markerIndex < 0) continue;
      const id = entry.slice(0, markerIndex);
      const value = Number(entry.slice(markerIndex + marker.length));
      if (!id || !Number.isFinite(value)) continue;
      const range = ranges.get(id) ?? { max: Number.NEGATIVE_INFINITY, min: Number.POSITIVE_INFINITY };
      range.max = Math.max(range.max, value);
      range.min = Math.min(range.min, value);
      ranges.set(id, range);
    }
  }

  return [...ranges.keys()]
    .sort((left, right) => left.localeCompare(right))
    .map((id) => {
      const range = ranges.get(id) ?? { max: 0, min: 0 };
      return `${id}${marker}${formatRange(range.min, range.max)}`;
    })
    .join("|") || "none";
}

function trackerSourceSummaryFromFrameValues(values: string[]) {
  const sources = { object: 0, parameter: 0, timeline: 0, value: 0 };
  const seen = new Set<string>();

  for (const summary of values) {
    for (const entry of summary.split("|")) {
      const [id, source] = entry.split("=");
      if (!id || !source || seen.has(id)) continue;
      seen.add(id);
      if (source === "object" || source === "parameter" || source === "timeline" || source === "value") {
        sources[source] += 1;
      }
    }
  }

  return `object=${sources.object},parameter=${sources.parameter},timeline=${sources.timeline},value=${sources.value}`;
}

function trackerSourceSummaryForFrame(payload: ReturnType<typeof buildMathValueTrackerPayload>) {
  return payload.rows.map((row) => `${row.hiddenMobjectId}=${row.source}`).join("|") || "none";
}

function vec3RangeSummary(values: string[]) {
  const labels = ["x", "y", "z"] as const;
  const ranges = labels.map(() => ({ max: Number.NEGATIVE_INFINITY, min: Number.POSITIVE_INFINITY }));

  for (const value of values) {
    const parts = value.split(",").map(Number);
    parts.slice(0, 3).forEach((entry, index) => {
      if (!Number.isFinite(entry)) return;
      ranges[index].max = Math.max(ranges[index].max, entry);
      ranges[index].min = Math.min(ranges[index].min, entry);
    });
  }

  return labels
    .map((label, index) => {
      const range = ranges[index];
      const min = Number.isFinite(range.min) ? range.min : 0;
      const max = Number.isFinite(range.max) ? range.max : 0;
      return `${label}=${formatRange(min, max)}`;
    })
    .join(";");
}

function mobjectPointPositionSummary(runtimeState: MathSceneRuntimeState) {
  return Object.values(runtimeState.objectGraph.byId)
    .filter((node) => node.renderState.kind === "point")
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((node) => {
      if (node.renderState.kind !== "point") return "";
      return `${node.id}=${formatVec3(node.renderState.position)}`;
    })
    .filter(Boolean)
    .join("|") || "none";
}

function uniqueIdsFromPositionSummaries(values: string[]) {
  return [
    ...new Set(
      values.flatMap((value) =>
        value
          .split("|")
          .map((entry) => entry.split("=")[0] ?? "")
          .filter((id) => id && id !== "none")
      )
    )
  ].sort((left, right) => left.localeCompare(right));
}

function pointPositionRangeSummary(values: string[]) {
  const labels = ["x", "y", "z"] as const;
  const ranges = new Map<string, Array<{ max: number; min: number }>>();

  for (const value of values) {
    for (const entry of value.split("|")) {
      const [id, rawPosition] = entry.split("=");
      if (!id || id === "none" || !rawPosition) continue;
      const coordinates = rawPosition.split(",").map(Number);
      const objectRanges = ranges.get(id) ?? labels.map(() => ({
        max: Number.NEGATIVE_INFINITY,
        min: Number.POSITIVE_INFINITY
      }));
      coordinates.slice(0, 3).forEach((coordinate, index) => {
        if (!Number.isFinite(coordinate)) return;
        objectRanges[index].max = Math.max(objectRanges[index].max, coordinate);
        objectRanges[index].min = Math.min(objectRanges[index].min, coordinate);
      });
      ranges.set(id, objectRanges);
    }
  }

  return [...ranges.keys()]
    .sort((left, right) => left.localeCompare(right))
    .map((id) => {
      const objectRanges = ranges.get(id) ?? [];
      const coordinateSummary = labels.map((label, index) => {
        const range = objectRanges[index] ?? { max: 0, min: 0 };
        const min = Number.isFinite(range.min) ? range.min : 0;
        const max = Number.isFinite(range.max) ? range.max : 0;
        return `${label}=${formatRange(min, max)}`;
      });

      return `${id}:${coordinateSummary.join(";")}`;
    })
    .join("|") || "none";
}

function frameRange(
  frames: MathSceneFrameAuditFrame[],
  minSelector: (frame: MathSceneFrameAuditFrame) => number,
  maxSelector: (frame: MathSceneFrameAuditFrame) => number
) {
  if (frames.length === 0) return "0.000..0.000";

  return formatRange(
    Math.min(...frames.map((frame) => minSelector(frame))),
    Math.max(...frames.map((frame) => maxSelector(frame)))
  );
}

function directorTraceKeyFrames(frames: MathSceneFrameAuditFrame[]) {
  const keyFrames: MathSceneFrameAuditFrame[] = [];
  let previousStep = "";

  for (const frame of frames) {
    if (frame.activeStep !== previousStep) {
      keyFrames.push(frame);
      previousStep = frame.activeStep;
    }
  }

  const finalFrame = frames.at(-1);
  if (finalFrame && keyFrames.at(-1)?.frameIndex !== finalFrame.frameIndex) {
    keyFrames.push(finalFrame);
  }

  return keyFrames;
}

function directorTraceEntry(frame: MathSceneFrameAuditFrame) {
  return [
    formatNumber(frame.elapsedSeconds),
    frame.activeStep,
    `shot=${frame.cameraShot}`,
    `frame=${frame.cameraFrameCurrentFrameId}`,
    `fixed=${frame.formulaLayerScreenFixed ? "1" : "0"}`,
    `tokens=${frame.formulaLayerActiveTokenCount}/${frame.formulaLayerTokenCount}`,
    `morph=${formatNumber(frame.formulaSvgMorphRuntimeProgress)}`
  ].join(":");
}

function playLifecycleTraceKeyFrames(frames: MathSceneFrameAuditFrame[]) {
  const keyFrames: MathSceneFrameAuditFrame[] = [];
  let previousPhase = "";

  for (const frame of frames) {
    if (frame.playbackLifecyclePhase !== previousPhase) {
      keyFrames.push(frame);
      previousPhase = frame.playbackLifecyclePhase;
    }
  }

  const finalFrame = frames.at(-1);
  if (finalFrame && keyFrames.at(-1)?.frameIndex !== finalFrame.frameIndex) {
    keyFrames.push(finalFrame);
  }

  return keyFrames;
}

function playLifecycleTraceEntry(frame: MathSceneFrameAuditFrame) {
  return [
    formatNumber(frame.elapsedSeconds),
    frame.playbackLifecyclePhase,
    frame.activeStep,
    `plans=${frame.activeAnimationPlanIds}`,
    `primary=${frame.activeAnimationPlanId}`,
    `progress=${formatNumber(frame.activeAnimationProgress)}`,
    `updaters=${frame.updaterActiveCount}/${frame.updaterSuspendedCount}`
  ].join(":");
}

function stableValue(value: unknown): unknown {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) return value.map((entry) => stableValue(entry) ?? null);
  if (!value || typeof value !== "object") return value;

  const stableObject: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value).sort(([left], [right]) => left.localeCompare(right))) {
    if (entry !== undefined) stableObject[key] = stableValue(entry);
  }

  return stableObject;
}

function stableSerialize(value: unknown) {
  return JSON.stringify(stableValue(value))
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function renderQualityEvidenceFor(renderQuality?: MathSceneRenderQualityPlan) {
  if (!renderQuality) return undefined;

  return {
    backgroundAlpha: renderQuality.backgroundAlpha,
    backgroundColor: renderQuality.backgroundColor,
    devicePixelRatio: renderQuality.devicePixelRatio,
    preset: renderQuality.preset,
    rendererMode: renderQuality.rendererMode,
    transparentBackground: renderQuality.transparentBackground,
    viewportHeight: renderQuality.height,
    viewportWidth: renderQuality.width
  };
}

function buildFrame(
  scene: MathSceneSpec,
  elapsedSeconds: number,
  deltaSeconds: number,
  frameIndex: number,
  formulaLayerViewport?: ProjectionViewport,
  renderQualityEvidence?: ReturnType<typeof renderQualityEvidenceFor>,
  reducedMotion = false,
  previousRuntimeState?: MathSceneRuntimeState
): BuildFrameResult {
  const startElapsedSeconds = Math.max(0, elapsedSeconds - deltaSeconds);
  const frame = stepMathSceneFrame(scene, {
    deltaSeconds,
    elapsedSeconds: startElapsedSeconds,
    formulaLayerViewport,
    frameIndex,
    previousRuntimeState,
    reducedMotion,
    renderQualityEvidence
  });
  const evidence = frame.evidence;
  const updaterSuspension = buildUpdaterSuspensionPlan({
    familyIndex: buildMobjectFamilyIndex(frame.runtimeState.objectGraph),
    scene,
    timeline: frame.runtimeState.timeline,
    updaters: frame.runtimeState.updaters
  });
  const trackerPayload = buildMathValueTrackerPayload(frame.runtimeState.trackers);
  const cameraFramePayload = buildCameraFramePayload({
    cameraDirector: frame.runtimeState.cameraDirector,
    sceneId: frame.runtimeState.sceneId
  });
  const formulaLayer = buildFormulaLayerState(scene, {
    activeConceptId: frame.runtimeState.timeline.activeConceptId
  });
  const formulaLayerTokens = formulaLayer.formulas.flatMap((formula) => formula.tokens);
  const formulaSvgMorphRuntime = buildFormulaSvgMorphRuntime(scene, {
    formulaId: scene.formulas[0]?.id ?? "none",
    progress: frame.runtimeState.timeline.easedLocalProgress
  });
  const updaterSuspensionReasonSummary =
    Object.values(updaterSuspension.reasonByUpdaterId).sort((left, right) => left.localeCompare(right)).join(",") || "none";
  const updaterExecution = buildMathUpdaterExecutionPlan(frame.runtimeState);

  return {
    runtimeState: frame.runtimeState,
    auditFrame: {
    activeAnimationNodeCount: evidence.manimActiveAnimationNodeCount,
    activeAnimationNodeProgressSummary: evidence.manimActiveAnimationNodeProgressSummary,
    activeAnimationObjectId: evidence.manimActiveAnimationObjectId,
    activeAnimationPlanId: evidence.manimActiveAnimationPlanId,
    activeAnimationPlanIds: evidence.manimActiveAnimationPlanIds,
    activeAnimationProgress: roundMillis(evidence.manimActiveAnimationProgress),
    activeAnimationTargetObjectId: evidence.manimActiveAnimationTargetObjectId,
    activeStep: evidence.activeStep,
    cameraFrameActiveShotId: cameraFramePayload.activeShotId,
    cameraFrameCurrentFrameId: cameraFramePayload.currentFrameId,
    cameraFrameFiniteMatrixEntryCount: cameraFramePayload.finiteMatrixEntryCount,
    cameraFrameFixedOverlayCount: cameraFramePayload.fixedInFrameOverlayCount,
    cameraFrameFov: roundMillis(cameraFramePayload.currentFov),
    cameraFrameGamma: roundMillis(cameraFramePayload.currentEulerAngles.gamma),
    cameraFramePhi: roundMillis(cameraFramePayload.currentEulerAngles.phi),
    cameraFramePosition: formatVec3(cameraFramePayload.currentPosition),
    cameraFrameProgress: roundMillis(cameraFramePayload.currentProgress),
    cameraFrameSourceContract: cameraFramePayload.sourceContract,
    cameraFrameTarget: formatVec3(cameraFramePayload.currentTarget),
    cameraFrameTheta: roundMillis(cameraFramePayload.currentEulerAngles.theta),
    cameraFrameUniformCenter: formatVec3(cameraFramePayload.currentUniforms.center),
    cameraFrameUniformSummary: cameraFramePayload.uniformSummary,
    cameraFrameViewInverseMaxError: cameraFramePayload.viewInverseMaxError,
    cameraFrameViewInverseReady: cameraFramePayload.viewInverseReady,
    cameraShot: evidence.cameraShot,
    captureHeight: evidence.manimCaptureHeight,
    captureWidth: evidence.manimCaptureWidth,
    deltaSeconds: roundMillis(deltaSeconds),
    elapsedSeconds: roundMillis(elapsedSeconds),
    formulaLayerActiveObjectIds: formulaLayer.activeObjectIds.join(",") || "none",
    formulaLayerActiveTokenCount: formulaLayerTokens.filter((token) => token.active).length,
    formulaLayerBoundTokenCount: formulaLayerTokens.filter((token) => token.boundObjectIds.length > 0).length,
    formulaLayerScreenFixed: formulaLayer.screenFixed,
    formulaLayerSourceContract: formulaLayer.sourceContract,
    formulaLayerTokenCount: formulaLayerTokens.length,
    formulaSvgMorphRuntimeCompatibleFrameCount: formulaSvgMorphRuntime.compatibleFrameCount,
    formulaSvgMorphRuntimeFormulaId: formulaSvgMorphRuntime.formulaId,
    formulaSvgMorphRuntimeFrameCount: formulaSvgMorphRuntime.frameCount,
    formulaSvgMorphRuntimeFrameIds: formulaSvgMorphRuntime.frames.map((runtimeFrame) => runtimeFrame.id).join(",") || "none",
    formulaSvgMorphRuntimeFramePathPreview: formulaSvgMorphRuntime.frames[0]?.path ?? "none",
    formulaSvgMorphRuntimeIssueCount: formulaSvgMorphRuntime.issueCount,
    formulaSvgMorphRuntimeProgress: roundMillis(formulaSvgMorphRuntime.progress),
    formulaSvgMorphRuntimeSourceContract: formulaSvgMorphRuntime.sourceContract,
    formulaMobileViewport: evidence.manimFormulaMobileViewport,
    frameIndex,
    mobjectPointPositionSummary: mobjectPointPositionSummary(frame.runtimeState),
    moveAlongVectorFieldCount: evidence.manimMoveAlongVectorFieldCount,
    moveAlongVectorFieldDeltaSummary: evidence.manimMoveAlongVectorFieldDeltaSummary,
    moveAlongVectorFieldDisplacementMagnitudeRange: evidence.manimMoveAlongVectorFieldDisplacementMagnitudeRange,
    moveAlongVectorFieldMovedCount: evidence.manimMoveAlongVectorFieldMovedCount,
    moveAlongVectorFieldObjectIds: evidence.manimMoveAlongVectorFieldObjectIds,
    moveAlongVectorFieldSourceContract: evidence.manimMoveAlongVectorFieldSourceContract,
    moveAlongVectorFieldStatusSummary: evidence.manimMoveAlongVectorFieldStatusSummary,
    moveAlongVectorFieldSummary: evidence.manimMoveAlongVectorFieldSummary,
    playbackLifecyclePhase: frame.capture.playbackLifecyclePhase,
    renderGroupIds: evidence.sceneRenderGroupIds,
    renderGroupOverlapIds: evidence.sceneRenderGroupOverlapIds,
    subAlphaCompleteNodeCount: evidence.manimSubAlphaCompleteNodeCount,
    subAlphaDelayedNodeCount: evidence.manimSubAlphaDelayedNodeCount,
    subAlphaEasedMax: evidence.manimSubAlphaEasedMax,
    subAlphaEasedMin: evidence.manimSubAlphaEasedMin,
    subAlphaFamilyZipCoveredNodeCount: evidence.manimSubAlphaFamilyZipCoveredNodeCount,
    subAlphaFamilyZipMissingNodeCount: evidence.manimSubAlphaFamilyZipMissingNodeCount,
    subAlphaFamilyZipPolicy: evidence.manimSubAlphaFamilyZipPolicy,
    subAlphaFamilyZipSequence: evidence.manimSubAlphaFamilyZipSequence,
    subAlphaFamilyZipTupleCount: evidence.manimSubAlphaFamilyZipTupleCount,
    subAlphaFamilyZipUncoveredObjectIds: evidence.manimSubAlphaFamilyZipUncoveredObjectIds,
    subAlphaLaggedMax: evidence.manimSubAlphaLaggedMax,
    subAlphaLaggedMin: evidence.manimSubAlphaLaggedMin,
    subAlphaLeadingNodeCount: evidence.manimSubAlphaLeadingNodeCount,
    subAlphaNodeCount: evidence.manimSubAlphaNodeCount,
    subAlphaNodeWindowSummary: evidence.manimSubAlphaNodeWindowSummary,
    subAlphaObjectIds: evidence.manimSubAlphaObjectIds,
    subAlphaPartialNodeCount: evidence.manimSubAlphaPartialNodeCount,
    subAlphaRateFunctionIds: evidence.manimSubAlphaRateFunctionIds,
    subAlphaRawMax: evidence.manimSubAlphaRawMax,
    subAlphaRawMin: evidence.manimSubAlphaRawMin,
    subAlphaStaggeredNodeCount: evidence.manimSubAlphaStaggeredNodeCount,
    subAlphaZeroNodeCount: evidence.manimSubAlphaZeroNodeCount,
    transformInterpolateFieldArcPathNodeCount: evidence.manimTransformInterpolateFieldArcPathNodeCount,
    transformInterpolateFieldBoundingBoxNodeCount: evidence.manimTransformInterpolateFieldBoundingBoxNodeCount,
    transformInterpolateFieldNodeCount: evidence.manimTransformInterpolateFieldNodeCount,
    transformInterpolateFieldNonPointCount: evidence.manimTransformInterpolateFieldNonPointCount,
    transformInterpolateFieldNonPointPolicy: evidence.manimTransformInterpolateFieldNonPointPolicy,
    transformInterpolateFieldObjectIds: evidence.manimTransformInterpolateFieldObjectIds,
    transformInterpolateFieldPathSummary: evidence.manimTransformInterpolateFieldPathSummary,
    transformInterpolateFieldPointlikeCount: evidence.manimTransformInterpolateFieldPointlikeCount,
    transformInterpolateFieldPointlikePolicy: evidence.manimTransformInterpolateFieldPointlikePolicy,
    transformInterpolateFieldPointlikeSummary: evidence.manimTransformInterpolateFieldPointlikeSummary,
    transformInterpolateFieldSourceSummary: evidence.manimTransformInterpolateFieldSourceSummary,
    transformInterpolateFieldStraightPathNodeCount: evidence.manimTransformInterpolateFieldStraightPathNodeCount,
    transformInterpolateFieldStyleNodeCount: evidence.manimTransformInterpolateFieldStyleNodeCount,
    transformInterpolateFieldSummary: evidence.manimTransformInterpolateFieldSummary,
    transformInterpolateFieldUniformNodeCount: evidence.manimTransformInterpolateFieldUniformNodeCount,
    trackerHiddenMobjectIds: trackerPayload.hiddenMobjectIds.join(",") || "none",
    trackerIds: trackerPayload.trackerIds.join(",") || "none",
    trackerNormalizedValueSummary: trackerPayload.normalizedValueSummary,
    trackerSourceContract: trackerPayload.sourceContract,
    trackerSourceSummary: trackerSourceSummaryForFrame(trackerPayload),
    trackerUniformValueSummary: trackerPayload.uniformValueSummary,
    updaterActiveCount: frame.capture.updaterActiveCount,
    updaterExecutionActiveCallSequenceSummary: updaterExecution.activeCallSequence.join(">") || "none",
    updaterExecutionFamilyTraversalSummary: updaterExecution.familyTraversalSummary,
    updaterExecutionOrderSummary: updaterExecution.orderSummary,
    updaterExecutionSummary: summarizeMathUpdaterExecutionPlan(updaterExecution),
    updaterSuspensionOwnedObjectIds: updaterSuspension.animatedObjectIds.join(",") || "none",
    updaterSuspensionPhase: updaterSuspension.phase,
    updaterSuspensionReasonSummary,
    updaterSuspensionSuspendedObjectIds: updaterSuspension.suspendedObjectIds.join(",") || "none",
    updaterSuspensionSuspendedUpdaterIds: updaterSuspension.suspendedUpdaterIds.join(",") || "none",
    updaterSuspendedCount: frame.capture.updaterSuspendedCount
    }
  };
}

export function buildMathSceneFrameAudit(
  scene: MathSceneSpec,
  options: MathSceneFrameAuditOptions = {}
): MathSceneFrameAudit {
  const fps = auditFps(options.fps ?? options.renderQuality?.captureFps);
  const skipAnimations = options.skipAnimations === true;
  const renderQualityEvidence = renderQualityEvidenceFor(options.renderQuality);
  const playbackFrames = sampleScenePlaybackFrames(scene.timeline, { fps, skipAnimations });
  const playbackEvents = buildScenePlaybackEventStream(scene.timeline, { fps });
  const playLifecycleEventPhaseSummary = lifecycleEventPhaseSummary(playbackEvents);
  const frames: MathSceneFrameAuditFrame[] = [];
  let previousRuntimeState: MathSceneRuntimeState | undefined;
  for (const frame of playbackFrames) {
    const result = buildFrame(
      scene,
      frame.elapsedSeconds,
      frame.dtSeconds,
      frame.frameIndex,
      options.formulaLayerViewport,
      renderQualityEvidence,
      skipAnimations,
      previousRuntimeState
    );
    frames.push(result.auditFrame);
    previousRuntimeState = result.runtimeState;
  }
  const activeAnimationFrameCount = frames.filter((frame) => frame.activeAnimationPlanId !== "none").length;

  return {
    activeAnimationFrameCount,
    authoredAnimationPlanCount: scene.animationPlans?.length ?? 0,
    expectedRenderGroupIds: scene.objects.map((object) => object.id),
    fps,
    frameInterval: roundMillis(1 / fps),
    frames,
    playLifecycleEventCount: playbackEvents.length,
    playLifecycleEventFirstKey: playbackEvents[0]?.eventKey ?? "none",
    playLifecycleEventLastKey: playbackEvents.at(-1)?.eventKey ?? "none",
    playLifecycleEventPhaseSummary,
    playLifecycleEventSourceContract: SCENE_PLAYBACK_SOURCE_CONTRACT,
    playLifecycleEventSummary: lifecycleEventSummary(scene.sceneId, playbackEvents, playLifecycleEventPhaseSummary),
    qualityPreset: options.renderQuality?.preset ?? "interactive",
    rendererMode: options.renderQuality?.rendererMode ?? "interactive",
    samplingMode: skipAnimations ? "show-final" : "full-playback",
    sceneId: scene.sceneId,
    skipAnimations,
    sourceContract: SCENE_FRAME_AUDIT_SOURCE_CONTRACT,
    transformFrameCount: frames.filter((frame) => frame.activeStep === "transformObject" || frame.activeStep === "animationComposition").length
  };
}

export function summarizeMathSceneFrameAudit(audit: MathSceneFrameAudit): MathSceneFrameAuditSummary {
  const activeFrames = audit.frames.filter((frame) => frame.activeAnimationPlanId !== "none");
  const cameraFrameFrames = audit.frames;
  const directorTraceFrames = directorTraceKeyFrames(audit.frames);
  const formulaLayerFrames = audit.frames;
  const formulaSvgMorphRuntimeFrames = audit.frames;
  const mobjectPointFrames = audit.frames.filter((frame) => frame.mobjectPointPositionSummary !== "none");
  const moveAlongVectorFieldFrames = audit.frames.filter((frame) => frame.moveAlongVectorFieldCount > 0);
  const playLifecycleTraceFrames = playLifecycleTraceKeyFrames(audit.frames);
  const progresses = activeFrames.map((frame) => frame.activeAnimationProgress);
  const animationPlanCounts = new Map<string, number>();
  const firstFrame = audit.frames[0];
  const cameraShotCounts = new Map<string, number>();
  const playbackPhaseCounts = new Map<string, number>();
  const primaryAnimationPlanCounts = new Map<string, number>();
  const primaryAnimationPlanProgress = new Map<string, { max: number; min: number }>();
  const renderGroupCounts = new Map<string, number>();
  const renderGroupOverlapCounts = new Map<string, number>();
  const stepCounts = new Map<string, number>();
  const subAlphaFrames = audit.frames.filter((frame) => frame.subAlphaNodeCount > 0);
  const transformInterpolateFieldFrames = audit.frames.filter((frame) => frame.transformInterpolateFieldNodeCount > 0);
  const trackerFrames = audit.frames.filter((frame) => frame.trackerIds !== "none");
  const updaterCounts = new Map<string, number>();
  let maxUpdaterActiveCount = 0;
  let maxUpdaterSuspendedCount = 0;
  for (const frame of audit.frames) {
    for (const planId of frame.activeAnimationPlanIds.split(",").filter((planId) => planId && planId !== "none")) {
      animationPlanCounts.set(planId, (animationPlanCounts.get(planId) ?? 0) + 1);
    }
    if (frame.activeAnimationPlanId !== "none") {
      primaryAnimationPlanCounts.set(frame.activeAnimationPlanId, (primaryAnimationPlanCounts.get(frame.activeAnimationPlanId) ?? 0) + 1);
      const progressRange = primaryAnimationPlanProgress.get(frame.activeAnimationPlanId) ?? { max: Number.NEGATIVE_INFINITY, min: Number.POSITIVE_INFINITY };
      progressRange.max = Math.max(progressRange.max, frame.activeAnimationProgress);
      progressRange.min = Math.min(progressRange.min, frame.activeAnimationProgress);
      primaryAnimationPlanProgress.set(frame.activeAnimationPlanId, progressRange);
    }
    cameraShotCounts.set(frame.cameraShot, (cameraShotCounts.get(frame.cameraShot) ?? 0) + 1);
    playbackPhaseCounts.set(frame.playbackLifecyclePhase, (playbackPhaseCounts.get(frame.playbackLifecyclePhase) ?? 0) + 1);
    for (const renderGroupId of frame.renderGroupIds.split(",").filter(Boolean)) {
      renderGroupCounts.set(renderGroupId, (renderGroupCounts.get(renderGroupId) ?? 0) + 1);
    }
    renderGroupOverlapCounts.set(frame.renderGroupOverlapIds || "none", (renderGroupOverlapCounts.get(frame.renderGroupOverlapIds || "none") ?? 0) + 1);
    stepCounts.set(frame.activeStep, (stepCounts.get(frame.activeStep) ?? 0) + 1);
    const updaterKey = `${frame.updaterActiveCount}/${frame.updaterSuspendedCount}`;
    updaterCounts.set(updaterKey, (updaterCounts.get(updaterKey) ?? 0) + 1);
    maxUpdaterActiveCount = Math.max(maxUpdaterActiveCount, frame.updaterActiveCount);
    maxUpdaterSuspendedCount = Math.max(maxUpdaterSuspendedCount, frame.updaterSuspendedCount);
  }
  const sampledCameraShotIds = [...cameraShotCounts.keys()];
  const sampledAnimationPlanIds = [...animationPlanCounts.keys()];
  const sampledPrimaryAnimationPlanIds = [...primaryAnimationPlanCounts.keys()];
  const sampledPlaybackPhaseIds = [...playbackPhaseCounts.keys()];
  const sampledRenderGroupIds = [...renderGroupCounts.keys()];
  const sampledRenderGroupOverlapIds = [...renderGroupOverlapCounts.keys()];
  const sampledStepIds = [...stepCounts.keys()];
  const frameDeltaSummary = countedSummary(
    audit.frames.map((frame) => frame.deltaSeconds.toFixed(3))
  );
  const mobjectPointIds = uniqueIdsFromPositionSummaries(
    mobjectPointFrames.map((frame) => frame.mobjectPointPositionSummary)
  );
  const mobjectPointPositionRangeSummary = pointPositionRangeSummary(
    mobjectPointFrames.map((frame) => frame.mobjectPointPositionSummary)
  );
  const moveAlongVectorFieldObjectIds = uniqueIdsFromCsv(
    moveAlongVectorFieldFrames.map((frame) => frame.moveAlongVectorFieldObjectIds)
  );
  const moveAlongVectorFieldDeltaSummary = countedSummary(
    moveAlongVectorFieldFrames.map((frame) => frame.moveAlongVectorFieldDeltaSummary)
  );
  const moveAlongVectorFieldDisplacementMagnitudeRangeSummary = countedSummary(
    moveAlongVectorFieldFrames.map((frame) => frame.moveAlongVectorFieldDisplacementMagnitudeRange)
  );
  const moveAlongVectorFieldStatusSummary = countedSummary(
    moveAlongVectorFieldFrames.map((frame) => frame.moveAlongVectorFieldStatusSummary)
  );
  const moveAlongVectorFieldSummary = countedSummary(
    moveAlongVectorFieldFrames.map((frame) => frame.moveAlongVectorFieldSummary)
  );
  const activeAnimationNodeProgressSummary = countedSummary(
    activeFrames.map((frame) => frame.activeAnimationNodeProgressSummary)
  );
  const renderGroupMissingFrameCount = audit.frames.filter((frame) => {
    const frameRenderGroupIds = new Set(frame.renderGroupIds.split(",").filter(Boolean));
    return audit.expectedRenderGroupIds.some((renderGroupId) => !frameRenderGroupIds.has(renderGroupId));
  }).length;
  const animationPlanFrameSummary = sampledAnimationPlanIds
    .map((planId) => `${planId}:${animationPlanCounts.get(planId) ?? 0}`)
    .join(",") || "none";
  const playbackPhaseSummary = sampledPlaybackPhaseIds
    .map((phaseId) => `${phaseId}:${playbackPhaseCounts.get(phaseId) ?? 0}`)
    .join(",") || "none";
  const formulaLayerCameraToFrames = formulaLayerFrames.filter((frame) => frame.activeStep === "cameraTo");
  const formulaLayerScreenFixedFrameCount = formulaLayerFrames.filter((frame) => frame.formulaLayerScreenFixed).length;
  const formulaLayerCameraToScreenFixedFrameCount = formulaLayerCameraToFrames.filter((frame) => frame.formulaLayerScreenFixed).length;
  const formulaLayerTokenCountRange = frameRange(formulaLayerFrames, (frame) => frame.formulaLayerTokenCount, (frame) => frame.formulaLayerTokenCount);
  const formulaLayerBoundTokenCountRange = frameRange(formulaLayerFrames, (frame) => frame.formulaLayerBoundTokenCount, (frame) => frame.formulaLayerBoundTokenCount);
  const formulaLayerActiveTokenCountRange = frameRange(formulaLayerFrames, (frame) => frame.formulaLayerActiveTokenCount, (frame) => frame.formulaLayerActiveTokenCount);
  const formulaLayerActiveObjectIds = uniqueIdsFromCsv(formulaLayerFrames.map((frame) => frame.formulaLayerActiveObjectIds));
  const formulaLayerActiveObjectSummary = countedSummary(formulaLayerFrames.map((frame) => frame.formulaLayerActiveObjectIds));
  const formulaLayerSummary = [
    `frameFormulaLayer:${audit.sceneId}`,
    `frames=${formulaLayerFrames.length}`,
    `screenFixed=${formulaLayerScreenFixedFrameCount}`,
    `cameraTo=${formulaLayerCameraToFrames.length}`,
    `cameraFixed=${formulaLayerCameraToScreenFixedFrameCount}`,
    `tokens=${formulaLayerTokenCountRange}`,
    `bound=${formulaLayerBoundTokenCountRange}`,
    `activeTokens=${formulaLayerActiveTokenCountRange}`,
    `activeObjects=${formulaLayerActiveObjectSummary}`
  ].join(":");
  const directorTraceTimeline = directorTraceFrames.map(directorTraceEntry).join("|") || "none";
  const directorTraceCameraToKeyFrameCount = directorTraceFrames.filter((frame) => frame.activeStep === "cameraTo").length;
  const directorTraceFormulaFixedKeyFrameCount = directorTraceFrames.filter((frame) => frame.formulaLayerScreenFixed).length;
  const directorTraceSvgMorphProgressRange = frameRange(
    directorTraceFrames,
    (frame) => frame.formulaSvgMorphRuntimeProgress,
    (frame) => frame.formulaSvgMorphRuntimeProgress
  );
  const directorTraceSummary = [
    `frameDirectorTrace:${audit.sceneId}`,
    `keyframes=${directorTraceFrames.length}`,
    `cameraTo=${directorTraceCameraToKeyFrameCount}`,
    `fixed=${directorTraceFormulaFixedKeyFrameCount}`,
    `morph=${directorTraceSvgMorphProgressRange}`
  ].join(":");
  const formulaSvgMorphRuntimeFormulaIds = uniqueIdsFromCsv(
    formulaSvgMorphRuntimeFrames.map((frame) => frame.formulaSvgMorphRuntimeFormulaId)
  );
  const formulaSvgMorphRuntimeFrameIds = uniqueIdsFromCsv(
    formulaSvgMorphRuntimeFrames.map((frame) => frame.formulaSvgMorphRuntimeFrameIds)
  );
  const formulaSvgMorphRuntimePathFrameCount = formulaSvgMorphRuntimeFrames.reduce(
    (sum, frame) => sum + frame.formulaSvgMorphRuntimeFrameCount,
    0
  );
  const formulaSvgMorphRuntimeCompatiblePathFrameCount = formulaSvgMorphRuntimeFrames.reduce(
    (sum, frame) => sum + frame.formulaSvgMorphRuntimeCompatibleFrameCount,
    0
  );
  const formulaSvgMorphRuntimeIssueCount = formulaSvgMorphRuntimeFrames.reduce(
    (sum, frame) => sum + frame.formulaSvgMorphRuntimeIssueCount,
    0
  );
  const formulaSvgMorphRuntimeProgressRange = frameRange(
    formulaSvgMorphRuntimeFrames,
    (frame) => frame.formulaSvgMorphRuntimeProgress,
    (frame) => frame.formulaSvgMorphRuntimeProgress
  );
  const formulaSvgMorphRuntimeFramePathPreview =
    formulaSvgMorphRuntimeFrames.find((frame) => frame.formulaSvgMorphRuntimeFramePathPreview !== "none")
      ?.formulaSvgMorphRuntimeFramePathPreview ?? "none";
  const formulaSvgMorphRuntimeSummary = [
    `frameSvgMorphRuntime:${audit.sceneId}`,
    `sampleFrames=${formulaSvgMorphRuntimeFrames.length}`,
    `pathFrames=${formulaSvgMorphRuntimePathFrameCount}`,
    `compatible=${formulaSvgMorphRuntimeCompatiblePathFrameCount}`,
    `issues=${formulaSvgMorphRuntimeIssueCount}`,
    `progress=${formulaSvgMorphRuntimeProgressRange}`,
    `ids=${formulaSvgMorphRuntimeFrameIds.join(",") || "none"}`
  ].join(":");
  const playLifecycleTraceTimeline = playLifecycleTraceFrames.map(playLifecycleTraceEntry).join("|") || "none";
  const playLifecycleTraceSummary = [
    `framePlayLifecycleTrace:${audit.sceneId}`,
    `keyframes=${playLifecycleTraceFrames.length}`,
    `phases=${playbackPhaseSummary}`,
    `plans=${animationPlanFrameSummary}`
  ].join(":");
  const subAlphaObjectIds = uniqueIdsFromCsv(subAlphaFrames.map((frame) => frame.subAlphaObjectIds));
  const subAlphaRateFunctionIds = uniqueIdsFromCsv(subAlphaFrames.map((frame) => frame.subAlphaRateFunctionIds));
  const subAlphaNodeFrameCount = subAlphaFrames.reduce((sum, frame) => sum + frame.subAlphaNodeCount, 0);
  const subAlphaStaggeredNodeFrameCount = subAlphaFrames.reduce((sum, frame) => sum + frame.subAlphaStaggeredNodeCount, 0);
  const subAlphaLeadingNodeFrameCount = subAlphaFrames.reduce((sum, frame) => sum + frame.subAlphaLeadingNodeCount, 0);
  const subAlphaDelayedNodeFrameCount = subAlphaFrames.reduce((sum, frame) => sum + frame.subAlphaDelayedNodeCount, 0);
  const subAlphaZeroNodeFrameCount = subAlphaFrames.reduce((sum, frame) => sum + frame.subAlphaZeroNodeCount, 0);
  const subAlphaPartialNodeFrameCount = subAlphaFrames.reduce((sum, frame) => sum + frame.subAlphaPartialNodeCount, 0);
  const subAlphaCompleteNodeFrameCount = subAlphaFrames.reduce((sum, frame) => sum + frame.subAlphaCompleteNodeCount, 0);
  const subAlphaFamilyZipCoveredNodeFrameCount = subAlphaFrames.reduce((sum, frame) => sum + frame.subAlphaFamilyZipCoveredNodeCount, 0);
  const subAlphaFamilyZipMissingNodeFrameCount = subAlphaFrames.reduce((sum, frame) => sum + frame.subAlphaFamilyZipMissingNodeCount, 0);
  const subAlphaFamilyZipMaxTupleCount = subAlphaFrames.reduce((max, frame) => Math.max(max, frame.subAlphaFamilyZipTupleCount), 0);
  const subAlphaFamilyZipSequenceSummary = countedSummary(subAlphaFrames.map((frame) => frame.subAlphaFamilyZipSequence));
  const subAlphaFamilyZipUncoveredObjectIds = uniqueIdsFromCsv(subAlphaFrames.map((frame) => frame.subAlphaFamilyZipUncoveredObjectIds));
  const subAlphaNodeWindowSummary = countedSummary(subAlphaFrames.map((frame) => frame.subAlphaNodeWindowSummary));
  const subAlphaRawRange = frameRange(subAlphaFrames, (frame) => frame.subAlphaRawMin, (frame) => frame.subAlphaRawMax);
  const subAlphaLaggedRange = frameRange(subAlphaFrames, (frame) => frame.subAlphaLaggedMin, (frame) => frame.subAlphaLaggedMax);
  const subAlphaEasedRange = frameRange(subAlphaFrames, (frame) => frame.subAlphaEasedMin, (frame) => frame.subAlphaEasedMax);
  const subAlphaSummary = [
    `frameSubAlpha:${audit.sceneId}`,
    `frames=${subAlphaFrames.length}`,
    `nodes=${subAlphaNodeFrameCount}`,
    `raw=${subAlphaRawRange}`,
    `lag=${subAlphaLaggedRange}`,
    `eased=${subAlphaEasedRange}`,
    `staggered=${subAlphaStaggeredNodeFrameCount}`,
    `lead=${subAlphaLeadingNodeFrameCount}`,
    `delay=${subAlphaDelayedNodeFrameCount}`,
    `zero=${subAlphaZeroNodeFrameCount}`,
    `partial=${subAlphaPartialNodeFrameCount}`,
    `complete=${subAlphaCompleteNodeFrameCount}`,
    `rates=${subAlphaRateFunctionIds.join(",") || "none"}`,
    `objects=${subAlphaObjectIds.join(",") || "none"}`
  ].join(":");
  const transformInterpolateFieldNodeFrameCount = transformInterpolateFieldFrames.reduce(
    (sum, frame) => sum + frame.transformInterpolateFieldNodeCount,
    0
  );
  const transformInterpolateFieldPointlikeFrameCount = transformInterpolateFieldFrames.reduce(
    (sum, frame) => sum + frame.transformInterpolateFieldPointlikeCount,
    0
  );
  const transformInterpolateFieldNonPointFrameCount = transformInterpolateFieldFrames.reduce(
    (sum, frame) => sum + frame.transformInterpolateFieldNonPointCount,
    0
  );
  const transformInterpolateFieldStyleNodeFrameCount = transformInterpolateFieldFrames.reduce(
    (sum, frame) => sum + frame.transformInterpolateFieldStyleNodeCount,
    0
  );
  const transformInterpolateFieldUniformNodeFrameCount = transformInterpolateFieldFrames.reduce(
    (sum, frame) => sum + frame.transformInterpolateFieldUniformNodeCount,
    0
  );
  const transformInterpolateFieldBoundingBoxNodeFrameCount = transformInterpolateFieldFrames.reduce(
    (sum, frame) => sum + frame.transformInterpolateFieldBoundingBoxNodeCount,
    0
  );
  const transformInterpolateFieldArcPathNodeFrameCount = transformInterpolateFieldFrames.reduce(
    (sum, frame) => sum + frame.transformInterpolateFieldArcPathNodeCount,
    0
  );
  const transformInterpolateFieldStraightPathNodeFrameCount = transformInterpolateFieldFrames.reduce(
    (sum, frame) => sum + frame.transformInterpolateFieldStraightPathNodeCount,
    0
  );
  const transformInterpolateFieldObjectIds = uniqueIdsFromCsv(
    transformInterpolateFieldFrames.map((frame) => frame.transformInterpolateFieldObjectIds)
  );
  const transformInterpolateFieldPathSummary = countedSummary(
    transformInterpolateFieldFrames.map((frame) => frame.transformInterpolateFieldPathSummary)
  );
  const transformInterpolateFieldPointlikeSummary = countedSummary(
    transformInterpolateFieldFrames.map((frame) => frame.transformInterpolateFieldPointlikeSummary)
  );
  const transformInterpolateFieldSummary = [
    `frameTransformInterpolateFields:${audit.sceneId}`,
    `frames=${transformInterpolateFieldFrames.length}`,
    `nodes=${transformInterpolateFieldNodeFrameCount}`,
    `pointlike=${transformInterpolateFieldPointlikeFrameCount}`,
    `nonPoint=${transformInterpolateFieldNonPointFrameCount}`,
    `style=${transformInterpolateFieldStyleNodeFrameCount}`,
    `uniforms=${transformInterpolateFieldUniformNodeFrameCount}`,
    `bounds=${transformInterpolateFieldBoundingBoxNodeFrameCount}`,
    `paths=${transformInterpolateFieldPathSummary}`,
    `kinds=${transformInterpolateFieldPointlikeSummary}`,
    `objects=${transformInterpolateFieldObjectIds.join(",") || "none"}`
  ].join(":");
  const updaterSuspensionPhaseSummary = countedSummary(audit.frames.map((frame) => frame.updaterSuspensionPhase));
  const updaterSuspensionCountSummary = countedSummary(
    audit.frames.map((frame) => `${frame.updaterActiveCount}/${frame.updaterSuspendedCount}`)
  );
  const updaterSuspensionOwnedObjectIds = uniqueIdsFromCsv(
    audit.frames.map((frame) => frame.updaterSuspensionOwnedObjectIds)
  );
  const updaterSuspensionSuspendedUpdaterIds = uniqueIdsFromCsv(
    audit.frames.map((frame) => frame.updaterSuspensionSuspendedUpdaterIds)
  );
  const updaterSuspensionSuspendedObjectIds = uniqueIdsFromCsv(
    audit.frames.map((frame) => frame.updaterSuspensionSuspendedObjectIds)
  );
  const updaterSuspensionOwnedObjectSummary = countedSummary(
    audit.frames.map((frame) => frame.updaterSuspensionOwnedObjectIds)
  );
  const updaterSuspensionSuspendedUpdaterSummary = countedSummary(
    audit.frames.map((frame) => frame.updaterSuspensionSuspendedUpdaterIds)
  );
  const updaterSuspensionSuspendedObjectSummary = countedSummary(
    audit.frames.map((frame) => frame.updaterSuspensionSuspendedObjectIds)
  );
  const updaterSuspensionReasonSummary = countedSummary(
    audit.frames.map((frame) => frame.updaterSuspensionReasonSummary)
  );
  const updaterSuspensionSuspendedFrameCount = audit.frames.filter((frame) => frame.updaterSuspendedCount > 0).length;
  const updaterSuspensionSuspendedUpdaterFrameCount = audit.frames.reduce(
    (sum, frame) => sum + frame.updaterSuspendedCount,
    0
  );
  const updaterExecutionOrderSummary = countedSummary(
    audit.frames.map((frame) => frame.updaterExecutionOrderSummary)
  );
  const updaterExecutionFamilyTraversalSummary = countedSummary(
    audit.frames.map((frame) => frame.updaterExecutionFamilyTraversalSummary)
  );
  const updaterExecutionActiveCallSequenceSummary = playbackOrderedCountedSummary(
    audit.frames.map((frame) => frame.updaterExecutionActiveCallSequenceSummary)
  );
  const updaterExecutionSummary = countedSummary(
    audit.frames.map((frame) => frame.updaterExecutionSummary)
  );
  const updaterSuspensionSummary = [
    `frameUpdaterSuspension:${audit.sceneId}`,
    `frames=${audit.frames.length}`,
    `suspendedFrames=${updaterSuspensionSuspendedFrameCount}`,
    `suspendedUpdaterFrames=${updaterSuspensionSuspendedUpdaterFrameCount}`,
    `phases=${updaterSuspensionPhaseSummary}`,
    `counts=${updaterSuspensionCountSummary}`,
    `animated=${updaterSuspensionOwnedObjectIds.join(",") || "none"}`,
    `suspended=${updaterSuspensionSuspendedUpdaterIds.join(",") || "none"}`
  ].join(":");
  const trackerIds = uniqueIdsFromCsv(trackerFrames.map((frame) => frame.trackerIds));
  const trackerHiddenMobjectIds = uniqueIdsFromCsv(trackerFrames.map((frame) => frame.trackerHiddenMobjectIds));
  const trackerUniformValueRangeSummary = rangeSummaryFromFrameValues(
    trackerFrames.map((frame) => frame.trackerUniformValueSummary),
    ":value="
  );
  const trackerNormalizedRangeSummary = rangeSummaryFromFrameValues(
    trackerFrames.map((frame) => frame.trackerNormalizedValueSummary),
    ":normalized="
  );
  const trackerSourceSummary = trackerSourceSummaryFromFrameValues(
    trackerFrames.map((frame) => frame.trackerSourceSummary)
  );
  const trackerAnimateFrameCount = audit.frames.filter((frame) => frame.activeStep === "animateTracker").length;
  const trackerSummary = [
    `frameValueTrackers:${audit.sceneId}`,
    `frames=${trackerFrames.length}`,
    `trackers=${trackerIds.length}`,
    `hidden=${trackerHiddenMobjectIds.length}`,
    `animateFrames=${trackerAnimateFrameCount}`,
    `sources=${trackerSourceSummary}`,
    `ranges=${trackerUniformValueRangeSummary}`
  ].join(":");
  const cameraFrameActiveShotIds = uniqueIdsFromCsv(cameraFrameFrames.map((frame) => frame.cameraFrameActiveShotId));
  const cameraFrameCurrentFrameIds = uniqueIdsFromCsv(cameraFrameFrames.map((frame) => frame.cameraFrameCurrentFrameId));
  const cameraFrameProgressRange = frameRange(cameraFrameFrames, (frame) => frame.cameraFrameProgress, (frame) => frame.cameraFrameProgress);
  const cameraFrameFovRange = frameRange(cameraFrameFrames, (frame) => frame.cameraFrameFov, (frame) => frame.cameraFrameFov);
  const cameraFrameThetaRange = frameRange(cameraFrameFrames, (frame) => frame.cameraFrameTheta, (frame) => frame.cameraFrameTheta);
  const cameraFramePhiRange = frameRange(cameraFrameFrames, (frame) => frame.cameraFramePhi, (frame) => frame.cameraFramePhi);
  const cameraFrameGammaRange = frameRange(cameraFrameFrames, (frame) => frame.cameraFrameGamma, (frame) => frame.cameraFrameGamma);
  const cameraFrameUniformCenterRangeSummary = vec3RangeSummary(cameraFrameFrames.map((frame) => frame.cameraFrameUniformCenter));
  const cameraFramePositionRangeSummary = vec3RangeSummary(cameraFrameFrames.map((frame) => frame.cameraFramePosition));
  const cameraFrameTargetRangeSummary = vec3RangeSummary(cameraFrameFrames.map((frame) => frame.cameraFrameTarget));
  const cameraFrameFiniteMatrixEntryFrameCount = cameraFrameFrames.reduce(
    (sum, frame) => sum + frame.cameraFrameFiniteMatrixEntryCount,
    0
  );
  const cameraFrameFixedOverlayFrameCount = cameraFrameFrames.reduce(
    (sum, frame) => sum + frame.cameraFrameFixedOverlayCount,
    0
  );
  const cameraFrameViewInverseMaxError = Math.max(0, ...cameraFrameFrames.map((frame) => frame.cameraFrameViewInverseMaxError));
  const cameraFrameViewInverseReadyFrameCount = cameraFrameFrames.filter((frame) => frame.cameraFrameViewInverseReady).length;
  const cameraFrameCameraToFrameCount = cameraFrameFrames.filter((frame) => frame.activeStep === "cameraTo").length;
  const cameraFrameUniformSummary = countedSummary(cameraFrameFrames.map((frame) => frame.cameraFrameUniformSummary));
  const cameraFrameSummary = [
    `frameCameraFrame:${audit.sceneId}`,
    `frames=${cameraFrameFrames.length}`,
    `cameraToFrames=${cameraFrameCameraToFrameCount}`,
    `active=${cameraFrameActiveShotIds.join(",") || "none"}`,
    `ids=${cameraFrameCurrentFrameIds.join(",") || "none"}`,
    `progress=${cameraFrameProgressRange}`,
    `fov=${cameraFrameFovRange}`,
    `theta=${cameraFrameThetaRange}`,
    `phi=${cameraFramePhiRange}`,
    `fixed=${cameraFrameFixedOverlayFrameCount}`,
    `finiteMatrices=${cameraFrameFiniteMatrixEntryFrameCount}`,
    `viewInverseReady=${cameraFrameViewInverseReadyFrameCount}`
  ].join(":");

  return {
    activeAnimationFrameCount: audit.activeAnimationFrameCount,
    activeAnimationNodeProgressSummary,
    activeAnimationPlanIds: [
      ...new Set(
        activeFrames.flatMap((frame) => frame.activeAnimationPlanIds.split(",").filter((planId) => planId && planId !== "none"))
      )
    ].sort((left, right) => left.localeCompare(right)),
    animationPlanFrameSummary,
    authoredAnimationPlanCount: audit.authoredAnimationPlanCount,
    captureHeight: firstFrame?.captureHeight ?? 0,
    captureWidth: firstFrame?.captureWidth ?? 0,
    directorTraceCameraToKeyFrameCount,
    directorTraceFormulaFixedKeyFrameCount,
    directorTraceKeyFrameCount: directorTraceFrames.length,
    directorTraceSourceContract: SCENE_FRAME_DIRECTOR_TRACE_SOURCE_CONTRACT,
    directorTraceSummary,
    directorTraceSvgMorphProgressRange,
    directorTraceTimeline,
    frameDeltaSummary,
    fps: audit.fps,
    frameInterval: audit.frameInterval,
    frameCount: audit.frames.length,
    formulaMobileFrameCount: audit.frames.filter((frame) => frame.formulaMobileViewport).length,
    formulaLayerActiveObjectIds,
    formulaLayerActiveObjectSummary,
    formulaLayerActiveTokenCountRange,
    formulaLayerBoundTokenCountRange,
    formulaLayerCameraToFrameCount: formulaLayerCameraToFrames.length,
    formulaLayerCameraToScreenFixedFrameCount,
    formulaLayerFrameCount: formulaLayerFrames.length,
    formulaLayerScreenFixedFrameCount,
    formulaLayerSourceContract: FORMULA_LAYER_SOURCE_CONTRACT,
    formulaLayerSummary,
    formulaLayerTokenCountRange,
    formulaSvgMorphRuntimeCompatiblePathFrameCount,
    formulaSvgMorphRuntimeFormulaIds,
    formulaSvgMorphRuntimeFrameIds,
    formulaSvgMorphRuntimeFramePathPreview,
    formulaSvgMorphRuntimeIssueCount,
    formulaSvgMorphRuntimePathFrameCount,
    formulaSvgMorphRuntimeProgressRange,
    formulaSvgMorphRuntimeSampledFrameCount: formulaSvgMorphRuntimeFrames.length,
    formulaSvgMorphRuntimeSourceContract: FORMULA_SVG_MORPH_RUNTIME_SOURCE_CONTRACT,
    formulaSvgMorphRuntimeSummary,
    maxActiveAnimationProgress: progresses.length ? Math.max(...progresses) : 1,
    maxUpdaterActiveCount,
    maxUpdaterSuspendedCount,
    minActiveAnimationProgress: progresses.length ? Math.min(...progresses) : 1,
    mobjectPointFrameCount: mobjectPointFrames.length,
    mobjectPointIds,
    mobjectPointPositionRangeSummary,
    moveAlongVectorFieldDeltaSummary,
    moveAlongVectorFieldDisplacementMagnitudeRangeSummary,
    moveAlongVectorFieldFrameCount: moveAlongVectorFieldFrames.length,
    moveAlongVectorFieldMovedFrameCount: moveAlongVectorFieldFrames.reduce(
      (sum, frame) => sum + frame.moveAlongVectorFieldMovedCount,
      0
    ),
    moveAlongVectorFieldObjectIds,
    moveAlongVectorFieldSourceContract: MOVE_ALONG_VECTOR_FIELD_SOURCE_CONTRACT,
    moveAlongVectorFieldStatusSummary,
    moveAlongVectorFieldSummary,
    playLifecycleEventCount: audit.playLifecycleEventCount,
    playLifecycleEventFirstKey: audit.playLifecycleEventFirstKey,
    playLifecycleEventLastKey: audit.playLifecycleEventLastKey,
    playLifecycleEventPhaseSummary: audit.playLifecycleEventPhaseSummary,
    playLifecycleEventSourceContract: audit.playLifecycleEventSourceContract,
    playLifecycleEventSummary: audit.playLifecycleEventSummary,
    playLifecycleTraceAnimationPlanSummary: animationPlanFrameSummary,
    playLifecycleTraceKeyFrameCount: playLifecycleTraceFrames.length,
    playLifecycleTracePhaseSummary: playbackPhaseSummary,
    playLifecycleTraceSourceContract: SCENE_PLAYBACK_SOURCE_CONTRACT,
    playLifecycleTraceSummary,
    playLifecycleTraceTimeline,
    playbackPhaseSummary,
    primaryAnimationPlanFrameSummary: sampledPrimaryAnimationPlanIds.map((planId) => `${planId}:${primaryAnimationPlanCounts.get(planId) ?? 0}`).join(",") || "none",
    primaryAnimationPlanProgressSummary: sampledPrimaryAnimationPlanIds
      .map((planId) => {
        const range = primaryAnimationPlanProgress.get(planId);
        return `${planId}:${(range?.min ?? 0).toFixed(3)}-${(range?.max ?? 0).toFixed(3)}`;
      })
      .join(",") || "none",
    qualityPreset: audit.qualityPreset,
    rendererMode: audit.rendererMode,
    expectedRenderGroupIds: audit.expectedRenderGroupIds,
    renderGroupCoverageReady: renderGroupMissingFrameCount === 0,
    renderGroupMissingFrameCount,
    renderGroupOverlapSummary: sampledRenderGroupOverlapIds.map((groupId) => `${groupId}:${renderGroupOverlapCounts.get(groupId) ?? 0}`).join(",") || "none",
    renderGroupSummary: sampledRenderGroupIds.map((groupId) => `${groupId}:${renderGroupCounts.get(groupId) ?? 0}`).join(",") || "none",
    sampledCameraShotIds,
    sampledPlaybackPhaseIds,
    sampledRenderGroupIds,
    samplingMode: audit.samplingMode,
    sampledStepIds,
    cameraFrameActiveShotIds,
    cameraFrameCameraToFrameCount,
    cameraFrameCurrentFrameIds,
    cameraFrameFiniteMatrixEntryFrameCount,
    cameraFrameFixedOverlayFrameCount,
    cameraFrameFovRange,
    cameraFrameFrameCount: cameraFrameFrames.length,
    cameraFrameGammaRange,
    cameraFramePhiRange,
    cameraFramePositionRangeSummary,
    cameraFrameProgressRange,
    cameraFrameSourceContract: CAMERA_FRAME_SOURCE_CONTRACT,
    cameraFrameSummary,
    cameraFrameTargetRangeSummary,
    cameraFrameThetaRange,
    cameraFrameUniformCenterRangeSummary,
    cameraFrameUniformSummary,
    cameraFrameViewInverseMaxError,
    cameraFrameViewInverseReadyFrameCount,
    cameraShotSummary: sampledCameraShotIds.map((shotId) => `${shotId}:${cameraShotCounts.get(shotId) ?? 0}`).join(",") || "none",
    sceneId: audit.sceneId,
    skipAnimations: audit.skipAnimations,
    sourceContract: audit.sourceContract,
    stepSummary: sampledStepIds.map((stepId) => `${stepId}:${stepCounts.get(stepId) ?? 0}`).join(",") || "none",
    subAlphaCompleteNodeFrameCount,
    subAlphaDelayedNodeFrameCount,
    subAlphaEasedRange,
    subAlphaFamilyZipCoveredNodeFrameCount,
    subAlphaFamilyZipMaxTupleCount,
    subAlphaFamilyZipMissingNodeFrameCount,
    subAlphaFamilyZipPolicy: TRANSFORM_FAMILY_ALIGNMENT_ZIP_POLICY,
    subAlphaFamilyZipSequenceSummary,
    subAlphaFamilyZipUncoveredObjectIds,
    subAlphaFrameCount: subAlphaFrames.length,
    subAlphaLaggedRange,
    subAlphaLeadingNodeFrameCount,
    subAlphaNodeFrameCount,
    subAlphaNodeWindowSummary,
    subAlphaObjectIds,
    subAlphaPartialNodeFrameCount,
    subAlphaRateFunctionIds,
    subAlphaRawRange,
    subAlphaStaggeredNodeFrameCount,
    subAlphaSummary,
    subAlphaZeroNodeFrameCount,
    transformFrameCount: audit.transformFrameCount,
    transformInterpolateFieldArcPathNodeFrameCount,
    transformInterpolateFieldBoundingBoxNodeFrameCount,
    transformInterpolateFieldFrameCount: transformInterpolateFieldFrames.length,
    transformInterpolateFieldNodeFrameCount,
    transformInterpolateFieldNonPointFrameCount,
    transformInterpolateFieldNonPointPolicy: TRANSFORM_PATH_NON_POINT_FIELD_POLICY,
    transformInterpolateFieldObjectIds,
    transformInterpolateFieldPathSummary,
    transformInterpolateFieldPointlikeFrameCount,
    transformInterpolateFieldPointlikePolicy: TRANSFORM_PATH_POINTLIKE_FIELD_POLICY,
    transformInterpolateFieldPointlikeSummary,
    transformInterpolateFieldSourceSummary: MOBJECT_INTERPOLATE_DATA_SOURCE_SUMMARY,
    transformInterpolateFieldStraightPathNodeFrameCount,
    transformInterpolateFieldStyleNodeFrameCount,
    transformInterpolateFieldSummary,
    transformInterpolateFieldUniformNodeFrameCount,
    trackerAnimateFrameCount,
    trackerCount: trackerIds.length,
    trackerFrameCount: trackerFrames.length,
    trackerHiddenMobjectCount: trackerHiddenMobjectIds.length,
    trackerHiddenMobjectIds,
    trackerIds,
    trackerNormalizedRangeSummary,
    trackerSourceContract: VALUE_TRACKER_SOURCE_CONTRACT,
    trackerSourceSummary,
    trackerSummary,
    trackerUniformValueRangeSummary,
    updaterExecutionActiveCallSequenceSummary,
    updaterExecutionFamilyTraversalSummary,
    updaterExecutionOrderSummary,
    updaterExecutionSummary,
    updaterSummary: [...updaterCounts.keys()].map((updaterKey) => `${updaterKey}:${updaterCounts.get(updaterKey) ?? 0}`).join(",") || "none",
    updaterSuspensionOwnedObjectIds,
    updaterSuspensionOwnedObjectSummary,
    updaterSuspensionCountSummary,
    updaterSuspensionPhaseSummary,
    updaterSuspensionPolicy: UPDATER_SUSPENSION_POLICY,
    updaterSuspensionReasonSummary,
    updaterSuspensionSourceContract: UPDATER_SUSPENSION_SOURCE_CONTRACT,
    updaterSuspensionSummary,
    updaterSuspensionSuspendedFrameCount,
    updaterSuspensionSuspendedObjectIds,
    updaterSuspensionSuspendedObjectSummary,
    updaterSuspensionSuspendedUpdaterFrameCount,
    updaterSuspensionSuspendedUpdaterIds,
    updaterSuspensionSuspendedUpdaterSummary
  };
}

export function frameAuditDataAttributes(summary: MathSceneFrameAuditSummary) {
  return {
    "data-viz-manim-frame-audit-active-frame-count": String(summary.activeAnimationFrameCount),
    "data-viz-manim-frame-audit-active-animation-node-progress-summary":
      summary.activeAnimationNodeProgressSummary,
    "data-viz-manim-frame-audit-active-plan-ids": summary.activeAnimationPlanIds.join(",") || "none",
    "data-viz-manim-frame-audit-animation-plan-frame-summary": summary.animationPlanFrameSummary,
    "data-viz-manim-frame-audit-authored-plan-count": String(summary.authoredAnimationPlanCount),
    "data-viz-manim-frame-audit-camera-shot-summary": summary.cameraShotSummary,
    "data-viz-manim-frame-audit-capture-height": String(summary.captureHeight),
    "data-viz-manim-frame-audit-capture-width": String(summary.captureWidth),
    "data-viz-manim-frame-audit-director-trace-camera-to-key-frame-count":
      String(summary.directorTraceCameraToKeyFrameCount),
    "data-viz-manim-frame-audit-director-trace-formula-fixed-key-frame-count":
      String(summary.directorTraceFormulaFixedKeyFrameCount),
    "data-viz-manim-frame-audit-director-trace-key-frame-count":
      String(summary.directorTraceKeyFrameCount),
    "data-viz-manim-frame-audit-director-trace-source-contract":
      summary.directorTraceSourceContract,
    "data-viz-manim-frame-audit-director-trace-summary":
      summary.directorTraceSummary,
    "data-viz-manim-frame-audit-director-trace-svg-morph-progress-range":
      summary.directorTraceSvgMorphProgressRange,
    "data-viz-manim-frame-audit-director-trace-timeline":
      summary.directorTraceTimeline,
    "data-viz-manim-frame-audit-delta-summary": summary.frameDeltaSummary,
    "data-viz-manim-frame-audit-fps": String(summary.fps),
    "data-viz-manim-frame-audit-frame-interval": summary.frameInterval.toFixed(3),
    "data-viz-manim-frame-audit-frame-count": String(summary.frameCount),
    "data-viz-manim-frame-audit-formula-mobile-frame-count": String(summary.formulaMobileFrameCount),
    "data-viz-manim-frame-audit-formula-layer-active-object-ids":
      summary.formulaLayerActiveObjectIds.join(",") || "none",
    "data-viz-manim-frame-audit-formula-layer-active-object-summary":
      summary.formulaLayerActiveObjectSummary,
    "data-viz-manim-frame-audit-formula-layer-active-token-count-range":
      summary.formulaLayerActiveTokenCountRange,
    "data-viz-manim-frame-audit-formula-layer-bound-token-count-range":
      summary.formulaLayerBoundTokenCountRange,
    "data-viz-manim-frame-audit-formula-layer-camera-to-frame-count":
      String(summary.formulaLayerCameraToFrameCount),
    "data-viz-manim-frame-audit-formula-layer-camera-to-screen-fixed-frame-count":
      String(summary.formulaLayerCameraToScreenFixedFrameCount),
    "data-viz-manim-frame-audit-formula-layer-frame-count":
      String(summary.formulaLayerFrameCount),
    "data-viz-manim-frame-audit-formula-layer-screen-fixed-frame-count":
      String(summary.formulaLayerScreenFixedFrameCount),
    "data-viz-manim-frame-audit-formula-layer-source-contract":
      summary.formulaLayerSourceContract,
    "data-viz-manim-frame-audit-formula-layer-summary":
      summary.formulaLayerSummary,
    "data-viz-manim-frame-audit-formula-layer-token-count-range":
      summary.formulaLayerTokenCountRange,
    "data-viz-manim-frame-audit-svg-morph-runtime-compatible-path-frame-count":
      String(summary.formulaSvgMorphRuntimeCompatiblePathFrameCount),
    "data-viz-manim-frame-audit-svg-morph-runtime-formula-ids":
      summary.formulaSvgMorphRuntimeFormulaIds.join(",") || "none",
    "data-viz-manim-frame-audit-svg-morph-runtime-frame-ids":
      summary.formulaSvgMorphRuntimeFrameIds.join(",") || "none",
    "data-viz-manim-frame-audit-svg-morph-runtime-frame-path-preview":
      summary.formulaSvgMorphRuntimeFramePathPreview.replace(/</g, "\\u003c"),
    "data-viz-manim-frame-audit-svg-morph-runtime-issue-count":
      String(summary.formulaSvgMorphRuntimeIssueCount),
    "data-viz-manim-frame-audit-svg-morph-runtime-path-frame-count":
      String(summary.formulaSvgMorphRuntimePathFrameCount),
    "data-viz-manim-frame-audit-svg-morph-runtime-progress-range":
      summary.formulaSvgMorphRuntimeProgressRange,
    "data-viz-manim-frame-audit-svg-morph-runtime-sampled-frame-count":
      String(summary.formulaSvgMorphRuntimeSampledFrameCount),
    "data-viz-manim-frame-audit-svg-morph-runtime-source-contract":
      summary.formulaSvgMorphRuntimeSourceContract,
    "data-viz-manim-frame-audit-svg-morph-runtime-summary":
      summary.formulaSvgMorphRuntimeSummary,
    "data-viz-manim-frame-audit-max-progress": summary.maxActiveAnimationProgress.toFixed(3),
    "data-viz-manim-frame-audit-max-updater-active-count": String(summary.maxUpdaterActiveCount),
    "data-viz-manim-frame-audit-max-updater-suspended-count": String(summary.maxUpdaterSuspendedCount),
    "data-viz-manim-frame-audit-min-progress": summary.minActiveAnimationProgress.toFixed(3),
    "data-viz-manim-frame-audit-mobject-point-frame-count":
      String(summary.mobjectPointFrameCount),
    "data-viz-manim-frame-audit-mobject-point-ids":
      summary.mobjectPointIds.join(",") || "none",
    "data-viz-manim-frame-audit-mobject-point-position-range-summary":
      summary.mobjectPointPositionRangeSummary,
    "data-viz-manim-frame-audit-move-along-vector-field-delta-summary":
      summary.moveAlongVectorFieldDeltaSummary,
    "data-viz-manim-frame-audit-move-along-vector-field-displacement-magnitude-range-summary":
      summary.moveAlongVectorFieldDisplacementMagnitudeRangeSummary,
    "data-viz-manim-frame-audit-move-along-vector-field-frame-count":
      String(summary.moveAlongVectorFieldFrameCount),
    "data-viz-manim-frame-audit-move-along-vector-field-moved-frame-count":
      String(summary.moveAlongVectorFieldMovedFrameCount),
    "data-viz-manim-frame-audit-move-along-vector-field-object-ids":
      summary.moveAlongVectorFieldObjectIds.join(",") || "none",
    "data-viz-manim-frame-audit-move-along-vector-field-source-contract":
      summary.moveAlongVectorFieldSourceContract,
    "data-viz-manim-frame-audit-move-along-vector-field-status-summary":
      summary.moveAlongVectorFieldStatusSummary,
    "data-viz-manim-frame-audit-move-along-vector-field-summary":
      summary.moveAlongVectorFieldSummary,
    "data-viz-manim-frame-audit-play-lifecycle-event-count":
      String(summary.playLifecycleEventCount),
    "data-viz-manim-frame-audit-play-lifecycle-event-first-key":
      summary.playLifecycleEventFirstKey,
    "data-viz-manim-frame-audit-play-lifecycle-event-last-key":
      summary.playLifecycleEventLastKey,
    "data-viz-manim-frame-audit-play-lifecycle-event-phase-summary":
      summary.playLifecycleEventPhaseSummary,
    "data-viz-manim-frame-audit-play-lifecycle-event-source-contract":
      summary.playLifecycleEventSourceContract,
    "data-viz-manim-frame-audit-play-lifecycle-event-summary":
      summary.playLifecycleEventSummary,
    "data-viz-manim-frame-audit-play-lifecycle-trace-animation-plan-summary":
      summary.playLifecycleTraceAnimationPlanSummary,
    "data-viz-manim-frame-audit-play-lifecycle-trace-key-frame-count":
      String(summary.playLifecycleTraceKeyFrameCount),
    "data-viz-manim-frame-audit-play-lifecycle-trace-phase-summary":
      summary.playLifecycleTracePhaseSummary,
    "data-viz-manim-frame-audit-play-lifecycle-trace-source-contract":
      summary.playLifecycleTraceSourceContract,
    "data-viz-manim-frame-audit-play-lifecycle-trace-summary":
      summary.playLifecycleTraceSummary,
    "data-viz-manim-frame-audit-play-lifecycle-trace-timeline":
      summary.playLifecycleTraceTimeline,
    "data-viz-manim-frame-audit-playback-phase-summary": summary.playbackPhaseSummary,
    "data-viz-manim-frame-audit-primary-animation-plan-frame-summary": summary.primaryAnimationPlanFrameSummary,
    "data-viz-manim-frame-audit-primary-animation-plan-progress-summary": summary.primaryAnimationPlanProgressSummary,
    "data-viz-manim-frame-audit-quality-preset": summary.qualityPreset,
    "data-viz-manim-frame-audit-renderer-mode": summary.rendererMode,
    "data-viz-manim-frame-audit-expected-render-group-ids": summary.expectedRenderGroupIds.join(",") || "none",
    "data-viz-manim-frame-audit-render-group-coverage-ready": String(summary.renderGroupCoverageReady),
    "data-viz-manim-frame-audit-render-group-missing-frame-count": String(summary.renderGroupMissingFrameCount),
    "data-viz-manim-frame-audit-render-group-overlap-summary": summary.renderGroupOverlapSummary,
    "data-viz-manim-frame-audit-render-group-summary": summary.renderGroupSummary,
    "data-viz-manim-frame-audit-sampled-camera-shot-ids": summary.sampledCameraShotIds.join(",") || "none",
    "data-viz-manim-frame-audit-sampled-playback-phase-ids": summary.sampledPlaybackPhaseIds.join(",") || "none",
    "data-viz-manim-frame-audit-sampled-render-group-ids": summary.sampledRenderGroupIds.join(",") || "none",
    "data-viz-manim-frame-audit-sampling-mode": summary.samplingMode,
    "data-viz-manim-frame-audit-sampled-step-ids": summary.sampledStepIds.join(",") || "none",
    "data-viz-manim-frame-audit-camera-frame-active-shot-ids":
      summary.cameraFrameActiveShotIds.join(",") || "none",
    "data-viz-manim-frame-audit-camera-frame-camera-to-frame-count":
      String(summary.cameraFrameCameraToFrameCount),
    "data-viz-manim-frame-audit-camera-frame-current-frame-ids":
      summary.cameraFrameCurrentFrameIds.join(",") || "none",
    "data-viz-manim-frame-audit-camera-frame-finite-matrix-entry-frame-count":
      String(summary.cameraFrameFiniteMatrixEntryFrameCount),
    "data-viz-manim-frame-audit-camera-frame-fixed-overlay-frame-count":
      String(summary.cameraFrameFixedOverlayFrameCount),
    "data-viz-manim-frame-audit-camera-frame-fov-range":
      summary.cameraFrameFovRange,
    "data-viz-manim-frame-audit-camera-frame-frame-count":
      String(summary.cameraFrameFrameCount),
    "data-viz-manim-frame-audit-camera-frame-gamma-range":
      summary.cameraFrameGammaRange,
    "data-viz-manim-frame-audit-camera-frame-phi-range":
      summary.cameraFramePhiRange,
    "data-viz-manim-frame-audit-camera-frame-position-range-summary":
      summary.cameraFramePositionRangeSummary,
    "data-viz-manim-frame-audit-camera-frame-progress-range":
      summary.cameraFrameProgressRange,
    "data-viz-manim-frame-audit-camera-frame-source-contract":
      summary.cameraFrameSourceContract,
    "data-viz-manim-frame-audit-camera-frame-summary":
      summary.cameraFrameSummary,
    "data-viz-manim-frame-audit-camera-frame-target-range-summary":
      summary.cameraFrameTargetRangeSummary,
    "data-viz-manim-frame-audit-camera-frame-theta-range":
      summary.cameraFrameThetaRange,
    "data-viz-manim-frame-audit-camera-frame-uniform-center-range-summary":
      summary.cameraFrameUniformCenterRangeSummary,
    "data-viz-manim-frame-audit-camera-frame-uniform-summary":
      summary.cameraFrameUniformSummary,
    "data-viz-manim-frame-audit-camera-frame-view-inverse-max-error":
      summary.cameraFrameViewInverseMaxError.toFixed(6),
    "data-viz-manim-frame-audit-camera-frame-view-inverse-ready-frame-count":
      String(summary.cameraFrameViewInverseReadyFrameCount),
    "data-viz-manim-frame-audit-scene-id": summary.sceneId,
    "data-viz-manim-frame-audit-skip-animations": String(summary.skipAnimations),
    "data-viz-manim-frame-audit-source-contract": summary.sourceContract,
    "data-viz-manim-frame-audit-step-summary": summary.stepSummary,
    "data-viz-manim-frame-audit-transform-interpolate-field-arc-path-node-frame-count":
      String(summary.transformInterpolateFieldArcPathNodeFrameCount),
    "data-viz-manim-frame-audit-transform-interpolate-field-bounding-box-node-frame-count":
      String(summary.transformInterpolateFieldBoundingBoxNodeFrameCount),
    "data-viz-manim-frame-audit-transform-interpolate-field-frame-count":
      String(summary.transformInterpolateFieldFrameCount),
    "data-viz-manim-frame-audit-transform-interpolate-field-node-frame-count":
      String(summary.transformInterpolateFieldNodeFrameCount),
    "data-viz-manim-frame-audit-transform-interpolate-field-non-point-frame-count":
      String(summary.transformInterpolateFieldNonPointFrameCount),
    "data-viz-manim-frame-audit-transform-interpolate-field-non-point-policy":
      summary.transformInterpolateFieldNonPointPolicy,
    "data-viz-manim-frame-audit-transform-interpolate-field-object-ids":
      summary.transformInterpolateFieldObjectIds.join(",") || "none",
    "data-viz-manim-frame-audit-transform-interpolate-field-path-summary":
      summary.transformInterpolateFieldPathSummary,
    "data-viz-manim-frame-audit-transform-interpolate-field-pointlike-frame-count":
      String(summary.transformInterpolateFieldPointlikeFrameCount),
    "data-viz-manim-frame-audit-transform-interpolate-field-pointlike-policy":
      summary.transformInterpolateFieldPointlikePolicy,
    "data-viz-manim-frame-audit-transform-interpolate-field-pointlike-summary":
      summary.transformInterpolateFieldPointlikeSummary,
    "data-viz-manim-frame-audit-transform-interpolate-field-source-summary":
      summary.transformInterpolateFieldSourceSummary,
    "data-viz-manim-frame-audit-transform-interpolate-field-straight-path-node-frame-count":
      String(summary.transformInterpolateFieldStraightPathNodeFrameCount),
    "data-viz-manim-frame-audit-transform-interpolate-field-style-node-frame-count":
      String(summary.transformInterpolateFieldStyleNodeFrameCount),
    "data-viz-manim-frame-audit-transform-interpolate-field-summary":
      summary.transformInterpolateFieldSummary,
    "data-viz-manim-frame-audit-transform-interpolate-field-uniform-node-frame-count":
      String(summary.transformInterpolateFieldUniformNodeFrameCount),
    "data-viz-manim-frame-audit-value-tracker-animate-frame-count":
      String(summary.trackerAnimateFrameCount),
    "data-viz-manim-frame-audit-value-tracker-count":
      String(summary.trackerCount),
    "data-viz-manim-frame-audit-value-tracker-frame-count":
      String(summary.trackerFrameCount),
    "data-viz-manim-frame-audit-value-tracker-hidden-mobject-count":
      String(summary.trackerHiddenMobjectCount),
    "data-viz-manim-frame-audit-value-tracker-hidden-mobject-ids":
      summary.trackerHiddenMobjectIds.join(",") || "none",
    "data-viz-manim-frame-audit-value-tracker-ids":
      summary.trackerIds.join(",") || "none",
    "data-viz-manim-frame-audit-value-tracker-normalized-range-summary":
      summary.trackerNormalizedRangeSummary,
    "data-viz-manim-frame-audit-value-tracker-source-contract":
      summary.trackerSourceContract,
    "data-viz-manim-frame-audit-value-tracker-source-summary":
      summary.trackerSourceSummary,
    "data-viz-manim-frame-audit-value-tracker-summary":
      summary.trackerSummary,
    "data-viz-manim-frame-audit-value-tracker-uniform-value-range-summary":
      summary.trackerUniformValueRangeSummary,
    "data-viz-manim-frame-audit-sub-alpha-complete-node-frame-count": String(summary.subAlphaCompleteNodeFrameCount),
    "data-viz-manim-frame-audit-sub-alpha-delayed-node-frame-count": String(summary.subAlphaDelayedNodeFrameCount),
    "data-viz-manim-frame-audit-sub-alpha-eased-range": summary.subAlphaEasedRange,
    "data-viz-manim-frame-audit-sub-alpha-family-zip-covered-node-frame-count": String(summary.subAlphaFamilyZipCoveredNodeFrameCount),
    "data-viz-manim-frame-audit-sub-alpha-family-zip-max-tuple-count": String(summary.subAlphaFamilyZipMaxTupleCount),
    "data-viz-manim-frame-audit-sub-alpha-family-zip-missing-node-frame-count": String(summary.subAlphaFamilyZipMissingNodeFrameCount),
    "data-viz-manim-frame-audit-sub-alpha-family-zip-policy": summary.subAlphaFamilyZipPolicy,
    "data-viz-manim-frame-audit-sub-alpha-family-zip-sequence-summary": summary.subAlphaFamilyZipSequenceSummary,
    "data-viz-manim-frame-audit-sub-alpha-family-zip-uncovered-object-ids": summary.subAlphaFamilyZipUncoveredObjectIds.join(",") || "none",
    "data-viz-manim-frame-audit-sub-alpha-frame-count": String(summary.subAlphaFrameCount),
    "data-viz-manim-frame-audit-sub-alpha-lagged-range": summary.subAlphaLaggedRange,
    "data-viz-manim-frame-audit-sub-alpha-leading-node-frame-count": String(summary.subAlphaLeadingNodeFrameCount),
    "data-viz-manim-frame-audit-sub-alpha-node-frame-count": String(summary.subAlphaNodeFrameCount),
    "data-viz-manim-frame-audit-sub-alpha-node-window-summary": summary.subAlphaNodeWindowSummary,
    "data-viz-manim-frame-audit-sub-alpha-object-ids": summary.subAlphaObjectIds.join(",") || "none",
    "data-viz-manim-frame-audit-sub-alpha-partial-node-frame-count": String(summary.subAlphaPartialNodeFrameCount),
    "data-viz-manim-frame-audit-sub-alpha-rate-function-ids": summary.subAlphaRateFunctionIds.join(",") || "none",
    "data-viz-manim-frame-audit-sub-alpha-raw-range": summary.subAlphaRawRange,
    "data-viz-manim-frame-audit-sub-alpha-staggered-node-frame-count": String(summary.subAlphaStaggeredNodeFrameCount),
    "data-viz-manim-frame-audit-sub-alpha-summary": summary.subAlphaSummary,
    "data-viz-manim-frame-audit-sub-alpha-zero-node-frame-count": String(summary.subAlphaZeroNodeFrameCount),
    "data-viz-manim-frame-audit-transform-frame-count": String(summary.transformFrameCount),
    "data-viz-manim-frame-audit-updater-summary": summary.updaterSummary,
    "data-viz-manim-frame-audit-updater-execution-active-call-sequence-summary":
      summary.updaterExecutionActiveCallSequenceSummary,
    "data-viz-manim-frame-audit-updater-execution-family-traversal-summary":
      summary.updaterExecutionFamilyTraversalSummary,
    "data-viz-manim-frame-audit-updater-execution-order-summary":
      summary.updaterExecutionOrderSummary,
    "data-viz-manim-frame-audit-updater-execution-summary":
      summary.updaterExecutionSummary,
    "data-viz-manim-frame-audit-updater-suspension-owned-object-ids":
      summary.updaterSuspensionOwnedObjectIds.join(",") || "none",
    "data-viz-manim-frame-audit-updater-suspension-owned-object-summary":
      summary.updaterSuspensionOwnedObjectSummary,
    "data-viz-manim-frame-audit-updater-suspension-count-summary":
      summary.updaterSuspensionCountSummary,
    "data-viz-manim-frame-audit-updater-suspension-phase-summary":
      summary.updaterSuspensionPhaseSummary,
    "data-viz-manim-frame-audit-updater-suspension-policy":
      summary.updaterSuspensionPolicy,
    "data-viz-manim-frame-audit-updater-suspension-reason-summary":
      summary.updaterSuspensionReasonSummary,
    "data-viz-manim-frame-audit-updater-suspension-source-contract":
      summary.updaterSuspensionSourceContract,
    "data-viz-manim-frame-audit-updater-suspension-suspended-frame-count":
      String(summary.updaterSuspensionSuspendedFrameCount),
    "data-viz-manim-frame-audit-updater-suspension-suspended-object-ids":
      summary.updaterSuspensionSuspendedObjectIds.join(",") || "none",
    "data-viz-manim-frame-audit-updater-suspension-suspended-object-summary":
      summary.updaterSuspensionSuspendedObjectSummary,
    "data-viz-manim-frame-audit-updater-suspension-suspended-updater-frame-count":
      String(summary.updaterSuspensionSuspendedUpdaterFrameCount),
    "data-viz-manim-frame-audit-updater-suspension-suspended-updater-ids":
      summary.updaterSuspensionSuspendedUpdaterIds.join(",") || "none",
    "data-viz-manim-frame-audit-updater-suspension-suspended-updater-summary":
      summary.updaterSuspensionSuspendedUpdaterSummary,
    "data-viz-manim-frame-audit-updater-suspension-summary":
      summary.updaterSuspensionSummary
  } as const;
}

export function serializeMathSceneFrameAuditSummary(summary: MathSceneFrameAuditSummary) {
  return stableSerialize(summary);
}
