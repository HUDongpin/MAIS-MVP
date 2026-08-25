import assert from "node:assert/strict";
import test from "node:test";
import {
  MATH_SCENE_COMPOSITE_CAPTURE_EVIDENCE_FIELDS,
  MATH_SCENE_VIDEO_EXPORT_ERROR_CODES,
  MATH_SCENE_VIDEO_EXPORT_RESULT_FIELDS,
  MATH_SCENE_VIDEO_EXPORT_STATUSES,
  serializeMathSceneVideoExportResult,
  validateMathSceneVideoExportReadyResult,
  type MathSceneVideoExportReadyResult
} from "./mathSceneVideoExportContract";

const hash = (character: string) => `sha256-${character.repeat(64)}`;

function readyResult(): MathSceneVideoExportReadyResult {
  return {
    audioContentHash: hash("a"),
    audioIncluded: true,
    byteCount: 32,
    captionFileName: "unit-wave.vtt",
    captionsVttContentHash: hash("b"),
    compositeEvidence: {
      captions: true,
      formulaOverlay: true,
      projectedLabels: true,
      webgl: true
    },
    createdAtIso: "2026-08-23T08:00:00.000Z",
    durationSeconds: 2,
    errorCode: null,
    exportId: "export-1",
    fileName: "unit-wave.webm",
    format: "webm",
    fps: 30,
    frameCount: 61,
    height: 720,
    mediaContentHash: hash("c"),
    metadataParsed: true,
    mimeType: "video/webm;codecs=vp9",
    packageContentHash: hash("d"),
    profileContentHash: hash("e"),
    profileId: "webm-720p",
    sceneId: "unit-wave",
    schemaVersion: "mais-manim-video-export-result/v1",
    status: "ready",
    width: 1280
  };
}

function errorCodes(value: unknown) {
  const validated = validateMathSceneVideoExportReadyResult(value);
  assert.equal(validated.ok, false);
  return validated.ok ? [] : validated.errors.map((error) => error.code);
}

test("publishes the complete export lifecycle without exposing a planned state", () => {
  assert.deepEqual(MATH_SCENE_VIDEO_EXPORT_STATUSES, [
    "idle",
    "preparing",
    "capturing",
    "encoding",
    "ready",
    "unsupported",
    "cancelled",
    "failed"
  ]);
  assert.equal(MATH_SCENE_VIDEO_EXPORT_STATUSES.includes("planned" as never), false);
  assert.equal(new Set(MATH_SCENE_VIDEO_EXPORT_STATUSES).size, MATH_SCENE_VIDEO_EXPORT_STATUSES.length);
});

test("keeps the shared error-code vocabulary explicit and serializable", () => {
  assert.ok(MATH_SCENE_VIDEO_EXPORT_ERROR_CODES.includes("INVALID_STATE_TRANSITION"));
  assert.ok(MATH_SCENE_VIDEO_EXPORT_ERROR_CODES.includes("STALE_EXPORT_ATTEMPT"));
  assert.ok(MATH_SCENE_VIDEO_EXPORT_ERROR_CODES.includes("CAPTURE_TIMEOUT"));
  assert.ok(MATH_SCENE_VIDEO_EXPORT_ERROR_CODES.includes("CAPTURE_ABORTED"));
  assert.ok(MATH_SCENE_VIDEO_EXPORT_ERROR_CODES.includes("VIDEO_BLOB_EMPTY"));
  assert.ok(MATH_SCENE_VIDEO_EXPORT_ERROR_CODES.includes("VIDEO_MIME_MISMATCH"));
  assert.ok(MATH_SCENE_VIDEO_EXPORT_ERROR_CODES.includes("VIDEO_METADATA_PARSE_FAILED"));
  assert.ok(MATH_SCENE_VIDEO_EXPORT_ERROR_CODES.includes("MANIFEST_HASH_MISMATCH"));
  assert.ok(MATH_SCENE_VIDEO_EXPORT_ERROR_CODES.includes("AUDIO_MIX_ABORTED"));
  assert.equal(new Set(MATH_SCENE_VIDEO_EXPORT_ERROR_CODES).size, MATH_SCENE_VIDEO_EXPORT_ERROR_CODES.length);
  assert.doesNotThrow(() => JSON.stringify(MATH_SCENE_VIDEO_EXPORT_ERROR_CODES));
});

test("accepts only exact, parsed, non-empty ready results with complete composite evidence", () => {
  assert.deepEqual(MATH_SCENE_COMPOSITE_CAPTURE_EVIDENCE_FIELDS, [
    "captions",
    "formulaOverlay",
    "projectedLabels",
    "webgl"
  ]);
  assert.deepEqual(MATH_SCENE_VIDEO_EXPORT_RESULT_FIELDS, [
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
  ]);

  const validated = validateMathSceneVideoExportReadyResult(readyResult());
  assert.equal(validated.ok, true, validated.ok ? "" : JSON.stringify(validated.errors));
  assert.ok(validated.ok);
  assert.deepEqual(Object.keys(validated.value).sort(), [...MATH_SCENE_VIDEO_EXPORT_RESULT_FIELDS]);
  assert.deepEqual(Object.keys(validated.value.compositeEvidence).sort(), [
    ...MATH_SCENE_COMPOSITE_CAPTURE_EVIDENCE_FIELDS
  ]);
});

test("accepts a parsed MP4 result through the same public ready contract", () => {
  const mp4 = {
    ...readyResult(),
    fileName: "unit-wave.mp4",
    format: "mp4",
    mimeType: "video/mp4",
    profileId: "mp4-720p"
  };
  const validated = validateMathSceneVideoExportReadyResult(mp4);
  assert.equal(validated.ok, true, validated.ok ? "" : JSON.stringify(validated.errors));
  if (validated.ok) {
    assert.equal(validated.value.format, "mp4");
    assert.equal(validated.value.mimeType, "video/mp4");
  }
});

test("rejects empty, unparsed, incomplete, and format/MIME mismatched ready claims", () => {
  assert.ok(errorCodes({ ...readyResult(), byteCount: 0 }).includes("VIDEO_BLOB_EMPTY"));
  assert.ok(errorCodes({ ...readyResult(), metadataParsed: false }).includes("READY_RESULT_INVALID"));
  assert.ok(errorCodes({ ...readyResult(), durationSeconds: 0 }).includes("READY_RESULT_INVALID"));
  assert.ok(errorCodes({ ...readyResult(), width: 0 }).includes("READY_RESULT_INVALID"));
  assert.ok(errorCodes({ ...readyResult(), mimeType: "video/mp4" }).includes("VIDEO_MIME_MISMATCH"));
  assert.ok(errorCodes({ ...readyResult(), mimeType: "VIDEO/WEBM" }).includes("VIDEO_MIME_MISMATCH"));
  assert.ok(errorCodes({ ...readyResult(), format: "mp4" }).includes("VIDEO_MIME_MISMATCH"));
  assert.ok(errorCodes({ ...readyResult(), fileName: "unit-wave.mp4" }).includes("READY_RESULT_INVALID"));
  assert.ok(errorCodes({ ...readyResult(), errorCode: "VIDEO_BLOB_EMPTY" }).includes("READY_RESULT_INVALID"));
  assert.ok(errorCodes({ ...readyResult(), audioIncluded: false }).includes("READY_RESULT_INVALID"));
  assert.ok(errorCodes({ ...readyResult(), captionFileName: null }).includes("READY_RESULT_INVALID"));
  assert.ok(errorCodes({ ...readyResult(), mediaContentHash: "sha256-not-a-real-hash" }).includes("READY_RESULT_INVALID"));
  assert.ok(errorCodes({ ...readyResult(), frameCount: 300 }).includes("VIDEO_METADATA_MISMATCH"));
  assert.ok(errorCodes({
    ...readyResult(),
    compositeEvidence: { ...readyResult().compositeEvidence, captions: false }
  }).includes("COMPOSITE_EVIDENCE_INCOMPLETE"));
});

test("rejects unknown Blob and URL fields instead of silently serializing them", () => {
  const withBlob = { ...readyResult(), blob: new Blob(["secret"], { type: "video/webm" }) };
  const withUrl = { ...readyResult(), objectUrl: "blob:ready-result-must-not-own-this" };
  const urlAsFileName = { ...readyResult(), fileName: "blob:ready-result-must-not-own-this" };

  assert.ok(errorCodes(withBlob).includes("READY_RESULT_UNKNOWN_FIELD"));
  assert.ok(errorCodes(withUrl).includes("READY_RESULT_UNKNOWN_FIELD"));
  assert.ok(errorCodes(urlAsFileName).includes("READY_RESULT_INVALID"));
});

test("serializes ready results deterministically without Blob or URL material", () => {
  const result = readyResult();
  const serialized = serializeMathSceneVideoExportResult(result);
  const reordered = Object.fromEntries(Object.entries(result).reverse());

  assert.equal(serializeMathSceneVideoExportResult(reordered), serialized);
  assert.deepEqual(Object.keys(JSON.parse(serialized)), [...MATH_SCENE_VIDEO_EXPORT_RESULT_FIELDS]);
  assert.doesNotMatch(serialized, /blob:|objectUrl|\"blob\"|undefined|NaN|Infinity|<\/script/i);
});
