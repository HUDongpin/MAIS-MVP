export const MATH_SCENE_VIDEO_EXPORT_STATUSES = [
  "idle",
  "preparing",
  "capturing",
  "encoding",
  "ready",
  "unsupported",
  "cancelled",
  "failed"
] as const;

export type MathSceneVideoExportStatus = typeof MATH_SCENE_VIDEO_EXPORT_STATUSES[number];

export const MATH_SCENE_VIDEO_EXPORT_ERROR_CODES = [
  "INVALID_STATE_TRANSITION",
  "STALE_EXPORT_ATTEMPT",
  "CAPTURE_PLAN_INVALID",
  "CAPTURE_TIMEOUT",
  "CAPTURE_ABORTED",
  "CAPTURE_WORK_LIMIT_EXCEEDED",
  "CAPTURE_CHUNK_LIMIT_EXCEEDED",
  "CANVAS_CAPTURE_STREAM_UNAVAILABLE",
  "MEDIA_RECORDER_UNAVAILABLE",
  "MEDIA_RECORDER_IS_TYPE_SUPPORTED_UNAVAILABLE",
  "MEDIA_RECORDER_MIME_UNSUPPORTED",
  "MEDIA_RECORDER_CONSTRUCTOR_FAILED",
  "MEDIA_RECORDER_START_FAILED",
  "MEDIA_RECORDER_RUNTIME_FAILED",
  "MEDIA_RECORDER_STOP_TIMEOUT",
  "CAPTURE_SURFACE_INVALID",
  "CAPTURE_FRAME_FAILED",
  "VIDEO_BLOB_EMPTY",
  "VIDEO_BLOB_TOO_LARGE",
  "VIDEO_MIME_MISMATCH",
  "VIDEO_EBML_INVALID",
  "VIDEO_METADATA_PARSE_FAILED",
  "VIDEO_METADATA_MISMATCH",
  "CAPTION_ARTIFACT_INVALID",
  "READY_RESULT_INVALID",
  "READY_RESULT_UNKNOWN_FIELD",
  "COMPOSITE_EVIDENCE_INCOMPLETE",
  "OBJECT_URL_LEASE_UNAVAILABLE",
  "OBJECT_URL_LEASE_DISPOSED",
  "MANIFEST_INVALID",
  "MANIFEST_HASH_MISMATCH",
  "AUDIO_TRACK_COUNT_INVALID",
  "AUDIO_SOURCE_INVALID",
  "AUDIO_PLAN_INVALID",
  "AUDIO_MIX_ABORTED",
  "AUDIO_MIX_FAILED",
  "AUDIO_CLEANUP_FAILED"
] as const;

export type MathSceneVideoExportErrorCode = typeof MATH_SCENE_VIDEO_EXPORT_ERROR_CODES[number];

export type MathSceneVideoExportError = {
  code: MathSceneVideoExportErrorCode;
  message: string;
  path: string;
};

export const MATH_SCENE_COMPOSITE_CAPTURE_EVIDENCE_FIELDS = [
  "captions",
  "formulaOverlay",
  "projectedLabels",
  "webgl"
] as const;

export type MathSceneCompositeCaptureEvidence = {
  captions: true;
  formulaOverlay: true;
  projectedLabels: true;
  webgl: true;
};

export type MathSceneWebmMimeType =
  | "video/webm"
  | "video/webm;codecs=vp8"
  | "video/webm;codecs=vp9";

export type MathSceneVideoExportFormat = "mp4" | "webm";
export type MathSceneVideoExportMimeType = MathSceneWebmMimeType | "video/mp4";

export const MATH_SCENE_VIDEO_EXPORT_RESULT_FIELDS = [
  "audioContentHash",
  "audioIncluded",
  "byteCount",
  "captionFileName",
  "captionsVttContentHash",
  "compositeEvidence",
  "createdAtIso",
  "durationSeconds",
  "errorCode",
  "exportId",
  "fileName",
  "format",
  "fps",
  "frameCount",
  "height",
  "mediaContentHash",
  "metadataParsed",
  "mimeType",
  "packageContentHash",
  "profileContentHash",
  "profileId",
  "sceneId",
  "schemaVersion",
  "status",
  "width"
] as const;

export type MathSceneVideoExportReadyResult = {
  audioContentHash: string | null;
  audioIncluded: boolean;
  byteCount: number;
  captionFileName: string | null;
  captionsVttContentHash: string | null;
  compositeEvidence: MathSceneCompositeCaptureEvidence;
  createdAtIso: string;
  durationSeconds: number;
  errorCode: null;
  exportId: string;
  fileName: string;
  format: MathSceneVideoExportFormat;
  fps: number;
  frameCount: number;
  height: number;
  mediaContentHash: string;
  metadataParsed: true;
  mimeType: MathSceneVideoExportMimeType;
  packageContentHash: string;
  profileContentHash: string;
  profileId: string;
  sceneId: string;
  schemaVersion: "mais-manim-video-export-result/v1";
  status: "ready";
  width: number;
};

export type MathSceneVideoExportReadyResultValidation =
  | { ok: true; value: MathSceneVideoExportReadyResult }
  | { errors: MathSceneVideoExportError[]; ok: false };

const resultFieldSet = new Set<string>(MATH_SCENE_VIDEO_EXPORT_RESULT_FIELDS);
const compositeEvidenceFieldSet = new Set<string>(MATH_SCENE_COMPOSITE_CAPTURE_EVIDENCE_FIELDS);
const webmMimeTypes = new Set<string>([
  "video/webm",
  "video/webm;codecs=vp8",
  "video/webm;codecs=vp9"
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function addError(
  errors: MathSceneVideoExportError[],
  code: MathSceneVideoExportErrorCode,
  path: string,
  message: string
) {
  if (errors.some((error) => error.code === code && error.path === path)) return;
  errors.push({ code, message, path });
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function positiveFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function positiveInteger(value: unknown): value is number {
  return positiveFiniteNumber(value) && Number.isInteger(value);
}

function nullableHash(value: unknown): value is string | null {
  return value === null || (typeof value === "string" && /^sha256-[a-f0-9]{64}$/.test(value));
}

function contentHash(value: unknown): value is string {
  return typeof value === "string" && /^sha256-[a-f0-9]{64}$/.test(value);
}

function validIsoInstant(value: unknown): value is string {
  if (!nonEmptyString(value)) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function validMediaFileName(value: unknown, format: unknown): value is string {
  const suffix = format === "mp4" ? ".mp4" : format === "webm" ? ".webm" : null;
  return nonEmptyString(value) &&
    suffix !== null &&
    value.toLowerCase().endsWith(suffix) &&
    !/[\\/\u0000-\u001f]/.test(value) &&
    !/^[a-z][a-z0-9+.-]*:/i.test(value) &&
    value !== "." &&
    value !== "..";
}

function validCaptionFileName(value: unknown): value is string | null {
  return value === null || (
    nonEmptyString(value) &&
    value.toLowerCase().endsWith(".vtt") &&
    !/[\\/\u0000-\u001f]/.test(value) &&
    !/^[a-z][a-z0-9+.-]*:/i.test(value) &&
    value !== "." &&
    value !== ".."
  );
}

function validateCompositeEvidence(
  value: unknown,
  errors: MathSceneVideoExportError[]
): value is MathSceneCompositeCaptureEvidence {
  if (!isRecord(value)) {
    addError(errors, "COMPOSITE_EVIDENCE_INCOMPLETE", "compositeEvidence", "Composite capture evidence must be an object.");
    return false;
  }

  const exactFields = Object.keys(value).every((field) => compositeEvidenceFieldSet.has(field)) &&
    MATH_SCENE_COMPOSITE_CAPTURE_EVIDENCE_FIELDS.every((field) => Object.hasOwn(value, field));
  const allIncluded = MATH_SCENE_COMPOSITE_CAPTURE_EVIDENCE_FIELDS.every((field) => value[field] === true);
  if (!exactFields || !allIncluded) {
    addError(
      errors,
      "COMPOSITE_EVIDENCE_INCOMPLETE",
      "compositeEvidence",
      "Ready export evidence must include WebGL, formula overlay, projected labels, and captions."
    );
    return false;
  }

  return true;
}

export function validateMathSceneVideoExportReadyResult(
  value: unknown
): MathSceneVideoExportReadyResultValidation {
  const errors: MathSceneVideoExportError[] = [];
  if (!isRecord(value)) {
    return {
      errors: [{ code: "READY_RESULT_INVALID", message: "Ready export result must be a plain object.", path: "$" }],
      ok: false
    };
  }

  for (const field of Object.keys(value)) {
    if (!resultFieldSet.has(field)) {
      addError(errors, "READY_RESULT_UNKNOWN_FIELD", field, `Unknown ready export result field: ${field}.`);
    }
  }
  for (const field of MATH_SCENE_VIDEO_EXPORT_RESULT_FIELDS) {
    if (!Object.hasOwn(value, field)) {
      addError(errors, "READY_RESULT_INVALID", field, `Missing ready export result field: ${field}.`);
    }
  }

  if (value.schemaVersion !== "mais-manim-video-export-result/v1") {
    addError(errors, "READY_RESULT_INVALID", "schemaVersion", "Ready export result schema version is invalid.");
  }
  if (value.status !== "ready") {
    addError(errors, "READY_RESULT_INVALID", "status", "A ready export result must have ready status.");
  }
  if (value.format !== "webm" && value.format !== "mp4") {
    addError(errors, "READY_RESULT_INVALID", "format", "A ready result must declare webm or mp4 format.");
  }
  if (value.errorCode !== null) {
    addError(errors, "READY_RESULT_INVALID", "errorCode", "A ready result cannot contain an error code.");
  }
  for (const field of [
    "exportId",
    "fileName",
    "profileId",
    "sceneId"
  ] as const) {
    if (!nonEmptyString(value[field])) {
      addError(errors, "READY_RESULT_INVALID", field, `${field} must be a non-empty string.`);
    }
  }
  for (const field of ["mediaContentHash", "packageContentHash", "profileContentHash"] as const) {
    if (!contentHash(value[field])) {
      addError(errors, "READY_RESULT_INVALID", field, `${field} must be a sha256 content hash.`);
    }
  }
  if (!validMediaFileName(value.fileName, value.format)) {
    addError(errors, "READY_RESULT_INVALID", "fileName", "Ready export file name must be a local file whose suffix agrees with its format.");
  }
  if (!nullableHash(value.audioContentHash)) {
    addError(errors, "READY_RESULT_INVALID", "audioContentHash", "Audio content hash must be a string or null.");
  }
  if (!nullableHash(value.captionsVttContentHash)) {
    addError(errors, "READY_RESULT_INVALID", "captionsVttContentHash", "Caption VTT content hash must be a string or null.");
  }
  if (typeof value.audioIncluded !== "boolean" || value.audioIncluded !== (value.audioContentHash !== null)) {
    addError(errors, "READY_RESULT_INVALID", "audioIncluded", "Audio inclusion must agree with the audio content hash.");
  }
  if (!validCaptionFileName(value.captionFileName) || (value.captionFileName === null) !== (value.captionsVttContentHash === null)) {
    addError(errors, "READY_RESULT_INVALID", "captionFileName", "Caption file name must be a local VTT name and agree with its content hash.");
  }
  if (!positiveInteger(value.byteCount)) {
    addError(errors, "VIDEO_BLOB_EMPTY", "byteCount", "Ready WebM byte count must be a positive integer.");
  }
  if (!positiveFiniteNumber(value.durationSeconds)) {
    addError(errors, "READY_RESULT_INVALID", "durationSeconds", "Ready WebM duration must be positive.");
  }
  for (const field of ["fps", "frameCount", "height", "width"] as const) {
    if (!positiveInteger(value[field])) {
      addError(errors, "READY_RESULT_INVALID", field, `${field} must be a positive integer.`);
    }
  }
  if (value.metadataParsed !== true) {
    addError(errors, "READY_RESULT_INVALID", "metadataParsed", "Ready status requires parsed video metadata.");
  }
  const mimeMatchesFormat = value.format === "webm"
    ? typeof value.mimeType === "string" && webmMimeTypes.has(value.mimeType)
    : value.format === "mp4" && value.mimeType === "video/mp4";
  if (!mimeMatchesFormat) {
    addError(errors, "VIDEO_MIME_MISMATCH", "mimeType", "Ready export MIME type must agree with its WebM or MP4 format.");
  }
  if (
    positiveFiniteNumber(value.durationSeconds)
    && positiveInteger(value.fps)
    && positiveInteger(value.frameCount)
    && Math.abs(value.frameCount / value.fps - value.durationSeconds) > 1 / value.fps + Number.EPSILON
  ) {
    addError(
      errors,
      "VIDEO_METADATA_MISMATCH",
      "frameCount",
      "Ready export duration, fps, and frame count disagree by more than one frame."
    );
  }
  if (!validIsoInstant(value.createdAtIso)) {
    addError(errors, "READY_RESULT_INVALID", "createdAtIso", "Ready export timestamp must be a canonical ISO instant.");
  }
  validateCompositeEvidence(value.compositeEvidence, errors);

  if (errors.length > 0) return { errors, ok: false };
  return { ok: true, value: structuredClone(value) as MathSceneVideoExportReadyResult };
}

export function serializeMathSceneVideoExportResult(value: unknown) {
  const validated = validateMathSceneVideoExportReadyResult(value);
  if (!validated.ok) {
    throw new TypeError(`Invalid ready export result: ${validated.errors.map((error) => error.code).join(",")}`);
  }

  const result = validated.value;
  const ordered: Record<string, unknown> = {};
  for (const field of MATH_SCENE_VIDEO_EXPORT_RESULT_FIELDS) {
    ordered[field] = field === "compositeEvidence"
      ? Object.fromEntries(MATH_SCENE_COMPOSITE_CAPTURE_EVIDENCE_FIELDS.map((key) => [key, result.compositeEvidence[key]]))
      : result[field];
  }

  return JSON.stringify(ordered)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
