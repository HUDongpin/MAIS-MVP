import type { MathSceneLocalAudioMetadata } from "@/components/visualizations/three/manim/mathScenePackageV3";

export const teacherVisualizationMaximumLocalAudioBytes = 100 * 1024 * 1024;

export type TeacherVisualizationAudioProcessingTarget = {
  draftId: string;
  revision: number;
};

export function captureTeacherVisualizationAudioProcessingTarget(
  current: TeacherVisualizationAudioProcessingTarget | null,
  revisionChangingBusy: boolean
) {
  return current && !revisionChangingBusy
    ? { draftId: current.draftId, revision: current.revision }
    : null;
}

export function teacherVisualizationAudioProcessingTargetMatches(
  target: TeacherVisualizationAudioProcessingTarget | null,
  current: TeacherVisualizationAudioProcessingTarget | null
) {
  return Boolean(
    target
    && current
    && target.draftId === current.draftId
    && target.revision === current.revision
  );
}

export function classifyTeacherVisualizationMicrophoneStartError(error: unknown) {
  if (
    error instanceof DOMException
    && (error.name === "NotAllowedError" || error.name === "SecurityError")
  ) return "MICROPHONE_PERMISSION_DENIED" as const;
  return "MICROPHONE_START_FAILED" as const;
}
const audioMimeAliases: Record<string, Exclude<MathSceneLocalAudioMetadata, { source: "none" }>["mimeType"]> = {
  "audio/mp3": "audio/mpeg",
  "audio/mpeg": "audio/mpeg",
  "audio/mp4": "audio/mp4",
  "audio/ogg": "audio/ogg",
  "audio/wav": "audio/wav",
  "audio/wave": "audio/wav",
  "audio/webm": "audio/webm",
  "audio/x-wav": "audio/wav"
};

export function normalizeTeacherVisualizationAudioMimeType(value: string) {
  const base = value.toLowerCase().split(";", 1)[0]?.trim() ?? "";
  return audioMimeAliases[base] ?? null;
}

export function validateTeacherVisualizationAudioFile(file: Pick<File, "name" | "size" | "type">):
  | { ok: true; mimeType: Exclude<MathSceneLocalAudioMetadata, { source: "none" }>["mimeType"] }
  | { code: "AUDIO_EMPTY" | "AUDIO_TOO_LARGE" | "UNSUPPORTED_AUDIO_MIME"; ok: false } {
  if (!Number.isSafeInteger(file.size) || file.size <= 0) return { code: "AUDIO_EMPTY", ok: false };
  if (file.size > teacherVisualizationMaximumLocalAudioBytes) return { code: "AUDIO_TOO_LARGE", ok: false };
  const mimeType = normalizeTeacherVisualizationAudioMimeType(file.type);
  if (!mimeType) return { code: "UNSUPPORTED_AUDIO_MIME", ok: false };
  return { mimeType, ok: true };
}

export function validateTeacherVisualizationAudioDuration(durationSeconds: number):
  | { durationSeconds: number; ok: true }
  | { code: "AUDIO_DECODE_FAILED"; ok: false } {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || durationSeconds > 86_400) {
    return { code: "AUDIO_DECODE_FAILED", ok: false };
  }
  return { durationSeconds, ok: true };
}

export async function hashTeacherVisualizationAudioBlob(blob: Blob) {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `sha256-${hex}` as `sha256-${string}`;
}

export function safeTeacherVisualizationAudioFileName(name: string) {
  const baseName = name.replace(/\\/g, "/").split("/").pop()?.trim() ?? "";
  return baseName.replace(/[^\p{L}\p{N}._ -]+/gu, "-").slice(0, 128) || "narration.webm";
}
