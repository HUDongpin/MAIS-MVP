import {
  validateMathSceneVideoExportReadyResult,
  type MathSceneVideoExportError,
  type MathSceneVideoExportReadyResult,
  type MathSceneWebmMimeType
} from "./mathSceneVideoExportContract";

export const MATH_SCENE_VIDEO_MANIFEST_FIELDS = [
  "audio",
  "captionsVtt",
  "package",
  "profile",
  "result",
  "schemaVersion"
] as const;

export type MathSceneVideoManifestAudio = {
  contentHash: string;
  durationSeconds: number;
  fileName: string;
  mimeType: "audio/mp4" | "audio/mpeg" | "audio/ogg" | "audio/wav" | "audio/webm";
};

export type MathSceneVideoManifestCaptionsVtt = {
  contentHash: string;
  cueCount: number;
  fileName: string;
  mimeType: "text/vtt";
};

export type MathSceneVideoManifestPackage = {
  contentHash: string;
  sceneId: string;
  schemaVersion: "mais-manim-scene-package/v3";
};

export type MathSceneVideoManifestProfile = {
  contentHash: string;
  fps: number;
  height: number;
  id: string;
  mimeType: MathSceneWebmMimeType;
  width: number;
};

export type MathSceneVideoManifestInput = {
  audio: MathSceneVideoManifestAudio | null;
  captionsVtt: MathSceneVideoManifestCaptionsVtt | null;
  package: MathSceneVideoManifestPackage;
  profile: MathSceneVideoManifestProfile;
  result: MathSceneVideoExportReadyResult;
};

export type MathSceneVideoManifest = MathSceneVideoManifestInput & {
  schemaVersion: "mais-manim-video-manifest/v1";
};

export type MathSceneVideoManifestBuildResult =
  | { manifest: MathSceneVideoManifest; ok: true }
  | { error: MathSceneVideoExportError; ok: false };

const audioFields = new Set(["contentHash", "durationSeconds", "fileName", "mimeType"]);
const captionFields = new Set(["contentHash", "cueCount", "fileName", "mimeType"]);
const inputFields = new Set(["audio", "captionsVtt", "package", "profile", "result"]);
const packageFields = new Set(["contentHash", "sceneId", "schemaVersion"]);
const profileFields = new Set(["contentHash", "fps", "height", "id", "mimeType", "width"]);
const audioMimeTypes = new Set(["audio/mp4", "audio/mpeg", "audio/ogg", "audio/wav", "audio/webm"]);
const webmMimeTypes = new Set(["video/webm", "video/webm;codecs=vp8", "video/webm;codecs=vp9"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactFields(value: Record<string, unknown>, expected: Set<string>) {
  const keys = Object.keys(value);
  return keys.length === expected.size && keys.every((key) => expected.has(key));
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function contentHash(value: unknown): value is string {
  return typeof value === "string" && /^sha256-[a-f0-9]{64}$/.test(value);
}

function positiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function positiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function safeLocalFileName(value: unknown, extension: string): value is string {
  return nonEmptyString(value) &&
    value.toLowerCase().endsWith(extension) &&
    !/[\\/\u0000-\u001f]/.test(value) &&
    !/^[a-z][a-z0-9+.-]*:/i.test(value) &&
    value !== "." &&
    value !== "..";
}

function invalid(message: string, path: string): MathSceneVideoManifestBuildResult {
  return { error: { code: "MANIFEST_INVALID", message, path }, ok: false };
}

function mismatch(message: string, path: string): MathSceneVideoManifestBuildResult {
  return { error: { code: "MANIFEST_HASH_MISMATCH", message, path }, ok: false };
}

function validPackage(value: unknown): value is MathSceneVideoManifestPackage {
  return isRecord(value) &&
    exactFields(value, packageFields) &&
    contentHash(value.contentHash) &&
    nonEmptyString(value.sceneId) &&
    value.schemaVersion === "mais-manim-scene-package/v3";
}

function validProfile(value: unknown): value is MathSceneVideoManifestProfile {
  return isRecord(value) &&
    exactFields(value, profileFields) &&
    contentHash(value.contentHash) &&
    positiveInteger(value.fps) &&
    positiveInteger(value.height) &&
    nonEmptyString(value.id) &&
    typeof value.mimeType === "string" &&
    webmMimeTypes.has(value.mimeType.toLowerCase()) &&
    positiveInteger(value.width);
}

function validCaptions(value: unknown): value is MathSceneVideoManifestCaptionsVtt {
  return isRecord(value) &&
    exactFields(value, captionFields) &&
    contentHash(value.contentHash) &&
    Number.isInteger(value.cueCount) &&
    Number(value.cueCount) >= 0 &&
    safeLocalFileName(value.fileName, ".vtt") &&
    value.mimeType === "text/vtt";
}

function validAudio(value: unknown): value is MathSceneVideoManifestAudio {
  if (!isRecord(value) ||
      !exactFields(value, audioFields) ||
      !contentHash(value.contentHash) ||
      !positiveNumber(value.durationSeconds) ||
      typeof value.mimeType !== "string" ||
      !audioMimeTypes.has(value.mimeType)) return false;

  const extensionsByMimeType: Record<MathSceneVideoManifestAudio["mimeType"], readonly string[]> = {
    "audio/mp4": [".m4a", ".mp4"],
    "audio/mpeg": [".mp3", ".mpeg"],
    "audio/ogg": [".ogg"],
    "audio/wav": [".wav"],
    "audio/webm": [".webm"]
  };
  return extensionsByMimeType[value.mimeType as MathSceneVideoManifestAudio["mimeType"]]
    .some((extension) => safeLocalFileName(value.fileName, extension));
}

export function buildMathSceneVideoManifest(
  input: MathSceneVideoManifestInput
): MathSceneVideoManifestBuildResult {
  if (!isRecord(input) || !exactFields(input, inputFields)) {
    return invalid("Video manifest input must contain exact root fields.", "$");
  }

  const validatedResult = validateMathSceneVideoExportReadyResult(input.result);
  if (!validatedResult.ok) {
    const primary = validatedResult.errors[0];
    return {
      error: primary ?? { code: "MANIFEST_INVALID", message: "Ready result is invalid.", path: "result" },
      ok: false
    };
  }
  if (!validPackage(input.package)) return invalid("Video manifest package reference is invalid.", "package");
  if (!validProfile(input.profile)) return invalid("Video manifest profile reference is invalid.", "profile");
  if (input.captionsVtt !== null && !validCaptions(input.captionsVtt)) {
    return invalid("Video manifest VTT reference is invalid.", "captionsVtt");
  }
  if (input.audio !== null && !validAudio(input.audio)) {
    return invalid("Video manifest audio reference is invalid.", "audio");
  }

  const result = validatedResult.value;
  if (result.packageContentHash !== input.package.contentHash || result.sceneId !== input.package.sceneId) {
    return mismatch("Ready result and package reference disagree.", "package.contentHash");
  }
  if (result.profileContentHash !== input.profile.contentHash || result.profileId !== input.profile.id) {
    return mismatch("Ready result and export profile reference disagree.", "profile.contentHash");
  }
  if (
    result.mimeType !== input.profile.mimeType ||
    result.width !== input.profile.width ||
    result.height !== input.profile.height ||
    result.fps !== input.profile.fps
  ) {
    return mismatch("Ready result media metadata and export profile disagree.", "profile");
  }
  if (result.captionsVttContentHash !== (input.captionsVtt?.contentHash ?? null)) {
    return mismatch("Ready result and VTT content hash disagree.", "captionsVtt.contentHash");
  }
  if (result.captionFileName !== (input.captionsVtt?.fileName ?? null)) {
    return mismatch("Ready result and VTT file name disagree.", "captionsVtt.fileName");
  }
  if (result.audioContentHash !== (input.audio?.contentHash ?? null)) {
    return mismatch("Ready result and audio content hash disagree.", "audio.contentHash");
  }
  if (result.audioIncluded !== (input.audio !== null)) {
    return mismatch("Ready result and audio inclusion disagree.", "audio");
  }

  return {
    manifest: {
      audio: input.audio ? structuredClone(input.audio) : null,
      captionsVtt: input.captionsVtt ? structuredClone(input.captionsVtt) : null,
      package: structuredClone(input.package),
      profile: structuredClone(input.profile),
      result,
      schemaVersion: "mais-manim-video-manifest/v1"
    },
    ok: true
  };
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((entry) => stableValue(entry));
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, stableValue(entry)])
  );
}

export function serializeMathSceneVideoManifest(manifest: MathSceneVideoManifest) {
  if (!isRecord(manifest) ||
      Object.keys(manifest).length !== MATH_SCENE_VIDEO_MANIFEST_FIELDS.length ||
      !Object.keys(manifest).every((key) => (MATH_SCENE_VIDEO_MANIFEST_FIELDS as readonly string[]).includes(key)) ||
      manifest.schemaVersion !== "mais-manim-video-manifest/v1") {
    throw new TypeError("Invalid video manifest.");
  }
  const rebuilt = buildMathSceneVideoManifest({
    audio: manifest.audio,
    captionsVtt: manifest.captionsVtt,
    package: manifest.package,
    profile: manifest.profile,
    result: manifest.result
  });
  if (!rebuilt.ok) throw new TypeError(`Invalid video manifest: ${rebuilt.error.code}`);

  const ordered = Object.fromEntries(
    MATH_SCENE_VIDEO_MANIFEST_FIELDS.map((field) => [field, stableValue(rebuilt.manifest[field])])
  );
  return JSON.stringify(ordered)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
