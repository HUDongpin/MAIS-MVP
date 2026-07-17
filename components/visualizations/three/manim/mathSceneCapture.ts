import type { MathSceneSpec } from "./mathSceneTypes";
import type { MathSceneRenderGroups } from "./mathSceneGraph";
import { buildMathSceneRenderQualityPlan, type MathSceneRenderQualityPlan } from "./mathSceneRenderQuality";

export const SCENE_CAPTURE_SOURCE_CONTRACT =
  "Camera capture: render scene render groups through framebuffer into screenshot/video artifacts for SceneFileWriter" as const;

export type MathSceneCaptureKind = "screenshot" | "video";
export type MathSceneCaptureFramebufferStatus = "planned" | "ready" | "unavailable";
export type MathSceneCaptureTarget = "canvas" | "offscreen";
export type MathSceneCaptureStatus = "captured" | "planned" | "unavailable";

export type MathSceneCapturePlan = {
  byteCount: number;
  cameraShotId: string;
  captureVersion: "mais-manim-capture/v1";
  durationSeconds: number;
  elapsedSeconds: number;
  fps: number;
  familyId: MathSceneSpec["familyId"];
  framebufferId: string;
  framebufferStatus: MathSceneCaptureFramebufferStatus;
  frameCount: number;
  frameTimes: number[];
  height: number;
  kind: MathSceneCaptureKind;
  mimeType: "image/png" | "video/webm";
  renderGroupCount: number;
  renderGroupIds: string;
  renderGroupSummary: string;
  renderPassSummary: string;
  requestCount: number;
  captureTarget: MathSceneCaptureTarget;
  renderQualityBackgroundAlpha: number;
  renderQualityBackgroundColor: string;
  renderQualityDevicePixelRatio: number;
  renderQualityPreset: MathSceneRenderQualityPlan["preset"];
  renderQualityRendererMode: MathSceneRenderQualityPlan["rendererMode"];
  renderQualitySamplesPerPixel: number;
  renderQualityTransparentBackground: boolean;
  sceneId: string;
  sceneSignature: string;
  sourceContract: typeof SCENE_CAPTURE_SOURCE_CONTRACT;
  status: MathSceneCaptureStatus;
  summary: string;
  width: number;
};

export type MathSceneCapturePlanInput = {
  byteCount?: number;
  cameraShotId: string;
  elapsedSeconds: number;
  fps?: number;
  height?: number;
  kind: MathSceneCaptureKind;
  requestCount?: number;
  renderQuality?: MathSceneRenderQualityPlan;
  renderGroups?: MathSceneRenderGroups;
  scene: MathSceneSpec;
  sceneSignature: string;
  status?: MathSceneCaptureStatus;
  width?: number;
};

function roundMillis(value: number) {
  return Math.round(value * 1000) / 1000;
}

function finiteNumber(value: number | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function positiveInteger(value: number | undefined, fallback: number) {
  return Math.max(1, Math.round(finiteNumber(value, fallback)));
}

function uniqueIds(ids: string[]) {
  const seen = new Set<string>();
  return ids.filter((id) => {
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function fallbackRenderGroups(scene: MathSceneSpec): MathSceneRenderGroups {
  const fixedInFrame = uniqueIds(scene.renderGroups?.fixedInFrameObjectIds ?? []);
  const foreground = uniqueIds(scene.renderGroups?.foregroundObjectIds ?? []);
  const reservedIds = new Set([...fixedInFrame, ...foreground]);
  const sceneIds = scene.objects.map((object) => object.id).filter((id) => !reservedIds.has(id));

  return {
    all: uniqueIds([...sceneIds, ...foreground, ...fixedInFrame]),
    fixedInFrame,
    foreground,
    scene: sceneIds
  };
}

function summarizeRenderGroups(renderGroups: MathSceneRenderGroups) {
  return [
    `scene=${renderGroups.scene.length}`,
    `foreground=${renderGroups.foreground.length}`,
    `fixedInFrame=${renderGroups.fixedInFrame.length}`,
    `all=${renderGroups.all.length}`
  ].join(":");
}

function sanitizeCaptureId(value: string) {
  return value.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "default";
}

function framebufferStatusForCapture(status: MathSceneCaptureStatus): MathSceneCaptureFramebufferStatus {
  if (status === "unavailable") return "unavailable";
  if (status === "captured") return "ready";
  return "planned";
}

function renderPassSummary(target: MathSceneCaptureTarget, framebufferId: string, renderGroups: MathSceneRenderGroups, frameCount: number) {
  return [
    `capture-pass:target=${target}`,
    `framebuffer=${framebufferId}`,
    `groups=scene(${renderGroups.scene.length})>foreground(${renderGroups.foreground.length})>fixedInFrame(${renderGroups.fixedInFrame.length})`,
    `frames=${frameCount}`
  ].join(":");
}

function timelineDuration(scene: MathSceneSpec) {
  return roundMillis(scene.timeline.reduce((sum, step) => sum + finiteNumber(step.duration, 0), 0));
}

function buildVideoFrameTimes(durationSeconds: number, fps: number) {
  if (durationSeconds <= 0) return [0];

  const frameCount = Math.max(2, Math.floor(durationSeconds * fps) + 1);
  return Array.from({ length: frameCount }, (_, index) => {
    if (index === frameCount - 1) return roundMillis(durationSeconds);
    return roundMillis((durationSeconds * index) / (frameCount - 1));
  });
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

export function buildMathSceneCapturePlan({
  byteCount = 0,
  cameraShotId,
  elapsedSeconds,
  fps,
  height,
  kind,
  requestCount = 0,
  renderQuality,
  renderGroups,
  scene,
  sceneSignature,
  status = "planned",
  width
}: MathSceneCapturePlanInput): MathSceneCapturePlan {
  const safeElapsed = roundMillis(Math.max(0, finiteNumber(elapsedSeconds, 0)));
  const normalizedRenderQuality = renderQuality ?? buildMathSceneRenderQualityPlan({
    rendererMode: kind === "video" ? "capture" : "interactive"
  });
  const safeWidth = positiveInteger(width, renderQuality?.captureWidth ?? 800);
  const safeHeight = positiveInteger(height, renderQuality?.captureHeight ?? 450);
  const safeFps = positiveInteger(fps, renderQuality?.captureFps ?? (kind === "video" ? 12 : 1));
  const durationSeconds = kind === "video" ? timelineDuration(scene) : 0;
  const frameTimes = kind === "video" ? buildVideoFrameTimes(durationSeconds, safeFps) : [safeElapsed];
  const frameCount = frameTimes.length;
  const normalizedRenderGroups = renderGroups ?? fallbackRenderGroups(scene);
  const captureTarget: MathSceneCaptureTarget = normalizedRenderQuality.rendererMode === "capture" ? "offscreen" : "canvas";
  const framebufferId = [
    "fb",
    sanitizeCaptureId(scene.sceneId),
    sanitizeCaptureId(cameraShotId || "default"),
    `${safeWidth}x${safeHeight}`,
    captureTarget
  ].join("-");

  return {
    byteCount: Math.max(0, Math.round(finiteNumber(byteCount, 0))),
    cameraShotId: cameraShotId || "default",
    captureTarget,
    captureVersion: "mais-manim-capture/v1",
    durationSeconds,
    elapsedSeconds: safeElapsed,
    fps: safeFps,
    familyId: scene.familyId,
    framebufferId,
    framebufferStatus: framebufferStatusForCapture(status),
    frameCount,
    frameTimes,
    height: safeHeight,
    kind,
    mimeType: kind === "video" ? "video/webm" : "image/png",
    renderGroupCount: normalizedRenderGroups.all.length,
    renderGroupIds: normalizedRenderGroups.all.join(",") || "none",
    renderGroupSummary: summarizeRenderGroups(normalizedRenderGroups),
    renderPassSummary: renderPassSummary(captureTarget, framebufferId, normalizedRenderGroups, frameCount),
    requestCount: Math.max(0, Math.round(finiteNumber(requestCount, 0))),
    renderQualityBackgroundAlpha: normalizedRenderQuality.backgroundAlpha,
    renderQualityBackgroundColor: normalizedRenderQuality.backgroundColor,
    renderQualityDevicePixelRatio: normalizedRenderQuality.devicePixelRatio,
    renderQualityPreset: normalizedRenderQuality.preset,
    renderQualityRendererMode: normalizedRenderQuality.rendererMode,
    renderQualitySamplesPerPixel: normalizedRenderQuality.samplesPerPixel,
    renderQualityTransparentBackground: normalizedRenderQuality.transparentBackground,
    sceneId: scene.sceneId,
    sceneSignature,
    sourceContract: SCENE_CAPTURE_SOURCE_CONTRACT,
    status,
    summary: `${kind}:${scene.sceneId}:${cameraShotId || "default"}:frames=${frameCount}:status=${status}`,
    width: safeWidth
  };
}

export function capturePlanDataAttributes(plan: MathSceneCapturePlan) {
  return {
    "data-viz-manim-capture-byte-count": String(plan.byteCount),
    "data-viz-manim-capture-camera-shot": plan.cameraShotId,
    "data-viz-manim-capture-target": plan.captureTarget,
    "data-viz-manim-capture-elapsed-seconds": plan.elapsedSeconds.toFixed(3),
    "data-viz-manim-capture-framebuffer-id": plan.framebufferId,
    "data-viz-manim-capture-framebuffer-status": plan.framebufferStatus,
    "data-viz-manim-capture-fps": String(plan.fps),
    "data-viz-manim-capture-frame-count": String(plan.frameCount),
    "data-viz-manim-capture-height": String(plan.height),
    "data-viz-manim-capture-kind": plan.kind,
    "data-viz-manim-capture-quality-preset": plan.renderQualityPreset,
    "data-viz-manim-capture-renderer-mode": plan.renderQualityRendererMode,
    "data-viz-manim-capture-render-group-count": String(plan.renderGroupCount),
    "data-viz-manim-capture-render-group-ids": plan.renderGroupIds,
    "data-viz-manim-capture-render-group-summary": plan.renderGroupSummary,
    "data-viz-manim-capture-render-pass-summary": plan.renderPassSummary,
    "data-viz-manim-capture-request-count": String(plan.requestCount),
    "data-viz-manim-capture-scene-signature": plan.sceneSignature,
    "data-viz-manim-capture-source-contract": plan.sourceContract,
    "data-viz-manim-capture-status": plan.status,
    "data-viz-manim-capture-dpr": plan.renderQualityDevicePixelRatio.toFixed(3),
    "data-viz-manim-capture-samples": String(plan.renderQualitySamplesPerPixel),
    "data-viz-manim-capture-transparent": String(plan.renderQualityTransparentBackground),
    "data-viz-manim-capture-background": plan.renderQualityBackgroundColor,
    "data-viz-manim-capture-alpha": plan.renderQualityBackgroundAlpha.toFixed(3),
    "data-viz-manim-capture-width": String(plan.width)
  } as const;
}

export function serializeMathSceneCapturePlan(plan: MathSceneCapturePlan) {
  return JSON.stringify(stableValue(plan))
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
