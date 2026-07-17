import type { MathSceneCapturePlan } from "./mathSceneCapture";
import type { ApprovedSceneSpecExport } from "./mathSceneExport";
import type { MathSceneSmokeHookManifest } from "./mathSceneSmokeHook";
import type { MathSceneStateSnapshot } from "./mathSceneStateSnapshot";
import type { MathSceneSpec } from "./mathSceneTypes";

export const SCENE_FILE_WRITER_SOURCE_CONTRACT =
  "SceneFileWriter: begin_animation, write_frame, finish, and persist manifest/spec/snapshot/smoke/media artifacts" as const;

export type MathSceneFileWriterArtifactKind = "manifest" | "scene-spec" | "state-snapshot" | "smoke-hook" | "media";

export type MathSceneFileWriterArtifact = {
  byteCount: number;
  fileName: string;
  frameCount: number;
  kind: MathSceneFileWriterArtifactKind;
  mimeType: "application/json" | "image/png" | "video/webm";
  signature: string;
};

export type MathSceneFileWriterPlan = {
  artifactCount: number;
  artifactFileSummary: string;
  artifactKindSummary: string;
  artifactMimeSummary: string;
  artifacts: MathSceneFileWriterArtifact[];
  byteCount: number;
  captureBackgroundAlpha: number;
  captureBackgroundColor: string;
  captureDevicePixelRatio: number;
  captureFps: number;
  captureHeight: number;
  captureKind: MathSceneCapturePlan["kind"];
  captureQualityPreset: MathSceneCapturePlan["renderQualityPreset"];
  captureRendererMode: MathSceneCapturePlan["renderQualityRendererMode"];
  captureSamplesPerPixel: number;
  captureStatus: MathSceneCapturePlan["status"];
  captureTransparentBackground: boolean;
  captureWidth: number;
  familyId: MathSceneSpec["familyId"];
  fileWriterVersion: "mais-manim-file-writer/v1";
  frameCount: number;
  frameFilePattern: string;
  jsonArtifactCount: number;
  manifestFileName: string;
  mediaArtifactCount: number;
  mediaFileName: string;
  outputSlug: string;
  ready: boolean;
  sceneId: string;
  sceneSignature: string;
  sceneSpecFileName: string;
  signature: string;
  smokeHookFileName: string;
  smokeHookSignature: string;
  sourceContract: typeof SCENE_FILE_WRITER_SOURCE_CONTRACT;
  snapshotSignature: string;
  stateSnapshotFileName: string;
  summary: string;
};

export type MathSceneFileWriterPlanInput = {
  capturePlan: MathSceneCapturePlan;
  scene: MathSceneSpec;
  sceneExport: ApprovedSceneSpecExport;
  smokeHook: MathSceneSmokeHookManifest;
  stateSnapshot: MathSceneStateSnapshot;
};

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

function hashStableJson(value: string) {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return `writer-${hash.toString(16).padStart(8, "0")}`;
}

function summarizeArtifacts(artifacts: MathSceneFileWriterArtifact[]) {
  const mimeCounts = new Map<MathSceneFileWriterArtifact["mimeType"], number>();
  for (const artifact of artifacts) {
    mimeCounts.set(artifact.mimeType, (mimeCounts.get(artifact.mimeType) ?? 0) + 1);
  }

  return {
    artifactFileSummary: artifacts.map((artifact) => artifact.fileName).join("|"),
    artifactKindSummary: artifacts.map((artifact) => artifact.kind).join("|"),
    artifactMimeSummary: Array.from(mimeCounts.entries()).map(([mimeType, count]) => `${mimeType}=${count}`).join("|"),
    jsonArtifactCount: artifacts.filter((artifact) => artifact.mimeType === "application/json").length,
    mediaArtifactCount: artifacts.filter((artifact) => artifact.kind === "media").length
  };
}

function slugSegment(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "scene";
}

function writerReady({
  capturePlan,
  scene,
  sceneExport,
  smokeHook,
  stateSnapshot
}: MathSceneFileWriterPlanInput) {
  return (
    sceneExport.approvedForRuntime &&
    sceneExport.sceneId === scene.sceneId &&
    sceneExport.familyId === scene.familyId &&
    stateSnapshot.sceneId === scene.sceneId &&
    stateSnapshot.familyId === scene.familyId &&
    stateSnapshot.sceneSignature === sceneExport.signature &&
    smokeHook.sceneId === scene.sceneId &&
    smokeHook.familyId === scene.familyId &&
    smokeHook.sceneSignature === sceneExport.signature &&
    smokeHook.snapshotSignature === stateSnapshot.signature &&
    capturePlan.sceneId === scene.sceneId &&
    capturePlan.familyId === scene.familyId &&
    capturePlan.sceneSignature === sceneExport.signature
  );
}

export function buildMathSceneFileWriterPlan(input: MathSceneFileWriterPlanInput): MathSceneFileWriterPlan {
  const {
    capturePlan,
    scene,
    sceneExport,
    smokeHook,
    stateSnapshot
  } = input;
  const outputSlug = `${slugSegment(scene.sceneId)}-${slugSegment(sceneExport.signature)}`;
  const manifestFileName = `${outputSlug}.manifest.json`;
  const sceneSpecFileName = `${outputSlug}.scene-spec.json`;
  const stateSnapshotFileName = `${outputSlug}.state-snapshot.json`;
  const smokeHookFileName = `${outputSlug}.smoke-hook.json`;
  const mediaFileName = `${outputSlug}.${capturePlan.kind === "video" ? "webm" : "png"}`;
  const frameFilePattern = `${outputSlug}.frame-%04d.png`;
  const ready = writerReady(input);
  const summary = `file-writer:${scene.sceneId}:artifacts=5:capture=${capturePlan.kind}:ready=${ready ? "true" : "false"}`;
  const artifacts: MathSceneFileWriterArtifact[] = [
    {
      byteCount: 0,
      fileName: manifestFileName,
      frameCount: 0,
      kind: "manifest",
      mimeType: "application/json",
      signature: "manifest"
    },
    {
      byteCount: sceneExport.json.length,
      fileName: sceneSpecFileName,
      frameCount: 0,
      kind: "scene-spec",
      mimeType: "application/json",
      signature: sceneExport.signature
    },
    {
      byteCount: stableSerialize(stateSnapshot).length,
      fileName: stateSnapshotFileName,
      frameCount: 0,
      kind: "state-snapshot",
      mimeType: "application/json",
      signature: stateSnapshot.signature
    },
    {
      byteCount: stableSerialize(smokeHook).length,
      fileName: smokeHookFileName,
      frameCount: 0,
      kind: "smoke-hook",
      mimeType: "application/json",
      signature: smokeHook.signature
    },
    {
      byteCount: capturePlan.byteCount,
      fileName: mediaFileName,
      frameCount: capturePlan.frameCount,
      kind: "media",
      mimeType: capturePlan.mimeType,
      signature: capturePlan.sceneSignature
    }
  ];
  const artifactSummary = summarizeArtifacts(artifacts);
  const basePlan = {
    artifactCount: artifacts.length,
    artifactFileSummary: artifactSummary.artifactFileSummary,
    artifactKindSummary: artifactSummary.artifactKindSummary,
    artifactMimeSummary: artifactSummary.artifactMimeSummary,
    artifacts,
    byteCount: capturePlan.byteCount,
    captureBackgroundAlpha: capturePlan.renderQualityBackgroundAlpha,
    captureBackgroundColor: capturePlan.renderQualityBackgroundColor,
    captureDevicePixelRatio: capturePlan.renderQualityDevicePixelRatio,
    captureFps: capturePlan.fps,
    captureHeight: capturePlan.height,
    captureKind: capturePlan.kind,
    captureQualityPreset: capturePlan.renderQualityPreset,
    captureRendererMode: capturePlan.renderQualityRendererMode,
    captureSamplesPerPixel: capturePlan.renderQualitySamplesPerPixel,
    captureStatus: capturePlan.status,
    captureTransparentBackground: capturePlan.renderQualityTransparentBackground,
    captureWidth: capturePlan.width,
    familyId: scene.familyId,
    fileWriterVersion: "mais-manim-file-writer/v1" as const,
    frameCount: capturePlan.frameCount,
    frameFilePattern,
    jsonArtifactCount: artifactSummary.jsonArtifactCount,
    manifestFileName,
    mediaArtifactCount: artifactSummary.mediaArtifactCount,
    mediaFileName,
    outputSlug,
    ready,
    sceneId: scene.sceneId,
    sceneSignature: sceneExport.signature,
    sceneSpecFileName,
    smokeHookFileName,
    smokeHookSignature: smokeHook.signature,
    sourceContract: SCENE_FILE_WRITER_SOURCE_CONTRACT,
    snapshotSignature: stateSnapshot.signature,
    stateSnapshotFileName,
    summary
  };

  return {
    ...basePlan,
    signature: hashStableJson(stableSerialize(basePlan))
  };
}

export function sceneFileWriterDataAttributes(plan: MathSceneFileWriterPlan) {
  return {
    "data-viz-manim-file-writer-artifact-file-summary": plan.artifactFileSummary,
    "data-viz-manim-file-writer-artifact-count": String(plan.artifactCount),
    "data-viz-manim-file-writer-artifact-kind-summary": plan.artifactKindSummary,
    "data-viz-manim-file-writer-artifact-mime-summary": plan.artifactMimeSummary,
    "data-viz-manim-file-writer-byte-count": String(plan.byteCount),
    "data-viz-manim-file-writer-capture-alpha": plan.captureBackgroundAlpha.toFixed(3),
    "data-viz-manim-file-writer-capture-background": plan.captureBackgroundColor,
    "data-viz-manim-file-writer-capture-dpr": plan.captureDevicePixelRatio.toFixed(3),
    "data-viz-manim-file-writer-capture-fps": String(plan.captureFps),
    "data-viz-manim-file-writer-capture-height": String(plan.captureHeight),
    "data-viz-manim-file-writer-capture-kind": plan.captureKind,
    "data-viz-manim-file-writer-capture-quality-preset": plan.captureQualityPreset,
    "data-viz-manim-file-writer-capture-renderer-mode": plan.captureRendererMode,
    "data-viz-manim-file-writer-capture-samples": String(plan.captureSamplesPerPixel),
    "data-viz-manim-file-writer-capture-status": plan.captureStatus,
    "data-viz-manim-file-writer-capture-transparent": String(plan.captureTransparentBackground),
    "data-viz-manim-file-writer-capture-width": String(plan.captureWidth),
    "data-viz-manim-file-writer-frame-count": String(plan.frameCount),
    "data-viz-manim-file-writer-json-artifact-count": String(plan.jsonArtifactCount),
    "data-viz-manim-file-writer-media-artifact-count": String(plan.mediaArtifactCount),
    "data-viz-manim-file-writer-output-slug": plan.outputSlug,
    "data-viz-manim-file-writer-ready": plan.ready ? "true" : "false",
    "data-viz-manim-file-writer-scene-id": plan.sceneId,
    "data-viz-manim-file-writer-signature": plan.signature,
    "data-viz-manim-file-writer-source-contract": plan.sourceContract,
    "data-viz-manim-file-writer-summary": plan.summary
  } as const;
}

export function serializeMathSceneFileWriterPlan(plan: MathSceneFileWriterPlan) {
  return stableSerialize(plan);
}
