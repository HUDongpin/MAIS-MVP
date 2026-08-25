import path from "node:path";

import type {
  MathSceneExportProfileV3,
  MathScenePackageV3
} from "@/components/visualizations/three/manim/mathScenePackageV3";
import { buildScenePlaybackPlan } from "@/components/visualizations/three/manim/mathScenePlayback";
import {
  validateMathSceneVideoExportReadyResult,
  type MathSceneCompositeCaptureEvidence,
  type MathSceneVideoExportReadyResult
} from "@/components/visualizations/three/manim/mathSceneVideoExportContract";
import {
  MAIS_MANIM_MP4_MAX_DURATION_SECONDS,
  MAIS_MANIM_MP4_MAX_FRAME_COUNT,
  preflightMp4RenderWork
} from "./mp4RenderCore.mjs";

const safeIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const uriSchemePattern = /^[A-Za-z][A-Za-z0-9+.-]*:/u;

export type MaisManimMp4CliArguments = {
  audioPath: string | null;
  outputDir: string;
  packagePath: string;
  profileId: string | null;
};

export type MaisManimMp4Task = {
  audioExpectedHash: `sha256-${string}` | null;
  audioPath: string | null;
  durationSeconds: number;
  fps: number;
  frameCount: number;
  height: number;
  outputBaseName: string;
  outputDir: string;
  packagePath: string;
  profile: MathSceneExportProfileV3;
  sceneDurationSeconds: number;
  sceneId: string;
  width: number;
};

export type MaisManimMp4ArtifactNames = {
  audioHashProof: string;
  manifest: string;
  mp4: string;
  package: string;
  vtt: string;
};

export type MaisManimMp4MediaEvidence = {
  audioCodec: "aac" | null;
  audioIncluded: boolean;
  durationSeconds: number;
  formatName: string;
  frameCount: number;
  height: number;
  pixelFormat: "yuv420p";
  videoCodec: "h264";
  width: number;
};

export function parseMaisManimObservedCompositeEvidence(
  value: unknown
): MathSceneCompositeCaptureEvidence {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("MP4_COMPOSITE_EVIDENCE_REQUIRED");
  }
  const record = value as Record<string, unknown>;
  const expectedFields = ["captions", "formulaOverlay", "projectedLabels", "webgl"] as const;
  if (
    Object.keys(record).length !== expectedFields.length ||
    !expectedFields.every((field) => record[field] === true)
  ) {
    throw new Error("MP4_COMPOSITE_EVIDENCE_REQUIRED");
  }
  return {
    captions: record.captions,
    formulaOverlay: record.formulaOverlay,
    projectedLabels: record.projectedLabels,
    webgl: record.webgl
  } as MathSceneCompositeCaptureEvidence;
}

function localAbsolutePath(value: string, flag: string) {
  if (!value || value.includes("\0") || uriSchemePattern.test(value) || !path.isAbsolute(value)) {
    throw new TypeError(`${flag} must be an absolute local path.`);
  }
  return path.normalize(value);
}

export function parseMaisManimMp4CliArguments(argv: readonly string[]): MaisManimMp4CliArguments {
  const values = new Map<string, string>();
  const allowed = new Set(["--audio", "--output-dir", "--package", "--profile"]);
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index]!;
    if (!allowed.has(flag)) throw new TypeError(`unknown MP4 CLI argument: ${flag}`);
    if (values.has(flag)) throw new TypeError(`duplicate MP4 CLI argument: ${flag}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new TypeError(`${flag} requires a value.`);
    values.set(flag, value);
    index += 1;
  }
  const packageValue = values.get("--package");
  const outputValue = values.get("--output-dir");
  if (!packageValue) throw new TypeError("--package is required.");
  if (!outputValue) throw new TypeError("--output-dir is required.");
  const profileId = values.get("--profile") ?? null;
  if (profileId !== null && !safeIdPattern.test(profileId)) {
    throw new TypeError("--profile must be a bounded profile identifier.");
  }
  return {
    audioPath: values.has("--audio") ? localAbsolutePath(values.get("--audio")!, "--audio") : null,
    outputDir: localAbsolutePath(outputValue, "--output-dir"),
    packagePath: localAbsolutePath(packageValue, "--package"),
    profileId
  };
}

function mp4Profile(packageJson: MathScenePackageV3, profileId: string | null) {
  const candidates = packageJson.exportProfiles.filter(
    (profile) => profile.format === "mp4" && profile.mimeType === "video/mp4"
  );
  const profile = profileId
    ? candidates.find((candidate) => candidate.id === profileId)
    : candidates[0];
  if (!profile) throw new Error("MP4_PROFILE_NOT_FOUND");
  if (profile.transparent) throw new Error("MP4_TRANSPARENCY_UNSUPPORTED");
  if (profile.captionPolicy !== "both") {
    throw new Error("MP4_CAPTION_POLICY_UNSUPPORTED: local MP4 currently requires burn-in plus WebVTT sidecar");
  }
  return structuredClone(profile);
}

function safeArtifactSegment(value: string) {
  const normalized = value.replace(/[^A-Za-z0-9._-]+/gu, "-").replace(/^-+|-+$/gu, "");
  if (!normalized) throw new TypeError("MP4 artifact identifier is empty after sanitization.");
  return normalized.slice(0, 128);
}

export function buildMaisManimMp4ArtifactNames(
  sceneId: string,
  profileId: string
): MaisManimMp4ArtifactNames {
  const base = `${safeArtifactSegment(sceneId)}--${safeArtifactSegment(profileId)}`;
  return {
    audioHashProof: `${base}.audio-hash-proof.json`,
    manifest: `${base}.manifest.json`,
    mp4: `${base}.mp4`,
    package: `${base}.scene-package.json`,
    vtt: `${base}.vtt`
  };
}

export function resolveMaisManimMp4Task(
  packageJson: MathScenePackageV3,
  cli: MaisManimMp4CliArguments
): MaisManimMp4Task {
  const profile = mp4Profile(packageJson, cli.profileId);
  let audioPath: string | null = null;
  let audioExpectedHash: `sha256-${string}` | null = null;
  if (profile.audioPolicy === "omit") {
    if (cli.audioPath) throw new Error("MP4_AUDIO_PROFILE_OMITS_AUDIO");
  } else if (packageJson.audio.source !== "none") {
    if (!cli.audioPath) throw new Error("MP4_AUDIO_REATTACH_REQUIRED");
    audioPath = cli.audioPath;
    audioExpectedHash = packageJson.audio.contentHash;
  } else if (cli.audioPath) {
    throw new Error("MP4_AUDIO_METADATA_REQUIRED");
  }

  const sceneDurationSeconds = buildScenePlaybackPlan(packageJson.scene.timeline, {
    fps: profile.fps
  }).totalDuration;
  if (!Number.isFinite(sceneDurationSeconds) || sceneDurationSeconds <= 0) {
    throw new Error("MP4_SCENE_DURATION_INVALID");
  }
  if (sceneDurationSeconds > MAIS_MANIM_MP4_MAX_DURATION_SECONDS) {
    throw new Error("MP4_DURATION_LIMIT_EXCEEDED");
  }
  const frameCount = Math.ceil(sceneDurationSeconds * profile.fps - Number.EPSILON);
  if (!Number.isSafeInteger(frameCount) || frameCount <= 0 || frameCount > MAIS_MANIM_MP4_MAX_FRAME_COUNT) {
    throw new Error("MP4_FRAME_COUNT_INVALID");
  }
  preflightMp4RenderWork({ frameCount, height: profile.height, width: profile.width });
  const outputBaseName = `${safeArtifactSegment(packageJson.scene.sceneId)}--${safeArtifactSegment(profile.id)}`;
  return {
    audioExpectedHash,
    audioPath,
    durationSeconds: frameCount / profile.fps,
    fps: profile.fps,
    frameCount,
    height: profile.height,
    outputBaseName,
    outputDir: cli.outputDir,
    packagePath: cli.packagePath,
    profile,
    sceneDurationSeconds,
    sceneId: packageJson.scene.sceneId,
    width: profile.width
  };
}

export function buildMaisManimMp4ReadyManifest({
  artifactNames,
  byteCount,
  compositeEvidence,
  mediaEvidence,
  packageHash,
  task
}: {
  artifactNames: MaisManimMp4ArtifactNames;
  byteCount: number;
  compositeEvidence: MathSceneCompositeCaptureEvidence;
  mediaEvidence: MaisManimMp4MediaEvidence;
  packageHash: `sha256-${string}`;
  task: MaisManimMp4Task;
}) {
  if (!Number.isSafeInteger(byteCount) || byteCount <= 0) {
    throw new Error("MP4_READY_REQUIRES_NON_ZERO_MEDIA");
  }
  const observedCompositeEvidence = parseMaisManimObservedCompositeEvidence(compositeEvidence);
  if (
    mediaEvidence.videoCodec !== "h264"
    || mediaEvidence.pixelFormat !== "yuv420p"
    || mediaEvidence.frameCount !== task.frameCount
    || mediaEvidence.width !== task.width
    || mediaEvidence.height !== task.height
    || Math.abs(mediaEvidence.durationSeconds - task.durationSeconds) > 1 / task.fps
    || mediaEvidence.audioIncluded !== Boolean(task.audioPath)
    || (task.audioPath && mediaEvidence.audioCodec !== "aac")
  ) {
    throw new Error("MP4_READY_MEDIA_EVIDENCE_MISMATCH");
  }
  const artifacts = {
    manifest: artifactNames.manifest,
    mp4: artifactNames.mp4,
    package: artifactNames.package,
    vtt: artifactNames.vtt,
    ...(mediaEvidence.audioIncluded ? { audioHashProof: artifactNames.audioHashProof } : {})
  };
  return {
    artifacts,
    audioIncluded: mediaEvidence.audioIncluded,
    byteCount,
    codec: {
      audio: mediaEvidence.audioCodec,
      pixelFormat: mediaEvidence.pixelFormat,
      video: mediaEvidence.videoCodec
    },
    compositeEvidence: observedCompositeEvidence,
    durationSeconds: mediaEvidence.durationSeconds,
    format: "mp4" as const,
    fps: task.fps,
    frameCount: mediaEvidence.frameCount,
    height: mediaEvidence.height,
    mimeType: "video/mp4" as const,
    packageHash,
    profileId: task.profile.id,
    sceneId: task.sceneId,
    status: "ready" as const,
    width: mediaEvidence.width
  };
}

export function buildMaisManimMp4ReadyResult({
  artifactNames,
  audioContentHash,
  byteCount,
  compositeEvidence,
  captionsVttContentHash,
  createdAtIso,
  exportId,
  mediaContentHash,
  mediaEvidence,
  packageContentHash,
  profileContentHash,
  task
}: {
  artifactNames: MaisManimMp4ArtifactNames;
  audioContentHash: string | null;
  byteCount: number;
  compositeEvidence: MathSceneCompositeCaptureEvidence;
  captionsVttContentHash: string;
  createdAtIso: string;
  exportId: string;
  mediaContentHash: string;
  mediaEvidence: MaisManimMp4MediaEvidence;
  packageContentHash: string;
  profileContentHash: string;
  task: MaisManimMp4Task;
}): MathSceneVideoExportReadyResult {
  if (
    mediaEvidence.audioIncluded !== Boolean(task.audioPath)
    || audioContentHash !== (task.audioPath ? task.audioExpectedHash : null)
  ) {
    throw new Error("MP4_READY_RESULT_INVALID:AUDIO_EVIDENCE_MISMATCH");
  }
  const observedCompositeEvidence = parseMaisManimObservedCompositeEvidence(compositeEvidence);
  const candidate = {
    audioContentHash,
    audioIncluded: mediaEvidence.audioIncluded,
    byteCount,
    captionFileName: artifactNames.vtt,
    captionsVttContentHash,
    compositeEvidence: observedCompositeEvidence,
    createdAtIso,
    durationSeconds: mediaEvidence.durationSeconds,
    errorCode: null,
    exportId,
    fileName: artifactNames.mp4,
    format: "mp4",
    fps: task.fps,
    frameCount: mediaEvidence.frameCount,
    height: mediaEvidence.height,
    mediaContentHash,
    metadataParsed: true,
    mimeType: "video/mp4",
    packageContentHash,
    profileContentHash,
    profileId: task.profile.id,
    sceneId: task.sceneId,
    schemaVersion: "mais-manim-video-export-result/v1",
    status: "ready",
    width: mediaEvidence.width
  };
  const validated = validateMathSceneVideoExportReadyResult(candidate);
  if (!validated.ok) {
    throw new Error(`MP4_READY_RESULT_INVALID:${validated.errors.map((entry) => entry.code).join(",")}`);
  }
  return validated.value;
}
