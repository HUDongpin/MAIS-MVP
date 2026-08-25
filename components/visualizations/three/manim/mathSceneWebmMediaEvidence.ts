import type {
  MathSceneVideoExportError,
  MathSceneWebmMimeType
} from "./mathSceneVideoExportContract";

export type MathSceneWebmParsedVideoMetadata = {
  audioTrackCount: number | null;
  durationSeconds: number;
  height: number;
  width: number;
};

export type MathSceneWebmVideoMetadataParser = (
  blob: Blob
) => MathSceneWebmParsedVideoMetadata | Promise<MathSceneWebmParsedVideoMetadata>;

export type MathSceneWebmExpectedMedia = {
  audioExpected: boolean;
  durationSeconds: number;
  height: number;
  mimeType: MathSceneWebmMimeType;
  width: number;
};

export type MathSceneWebmMediaEvidence = {
  actualMimeType: MathSceneWebmMimeType;
  audioTrackCount: 0 | 1 | null;
  byteLength: number;
  durationSeconds: number;
  ebmlMagic: "1a45dfa3";
  ebmlMagicVerified: true;
  height: number;
  metadataParsed: true;
  schemaVersion: "mais-manim-webm-media-evidence/v1";
  width: number;
};

export type MathSceneWebmMediaEvidenceResult =
  | { evidence: MathSceneWebmMediaEvidence; ok: true }
  | { error: MathSceneVideoExportError; ok: false };

export type MathSceneWebmMediaEvidenceInput = {
  blob: Blob;
  durationToleranceSeconds?: number;
  expected: MathSceneWebmExpectedMedia;
  parseVideoMetadata: MathSceneWebmVideoMetadataParser;
};

const EBML_MAGIC = [0x1a, 0x45, 0xdf, 0xa3] as const;
const webmMimeTypes = new Set<string>([
  "video/webm",
  "video/webm;codecs=vp8",
  "video/webm;codecs=vp9"
]);

function failed(
  code: Extract<
    MathSceneVideoExportError["code"],
    | "CAPTURE_PLAN_INVALID"
    | "VIDEO_BLOB_EMPTY"
    | "VIDEO_MIME_MISMATCH"
    | "VIDEO_EBML_INVALID"
    | "VIDEO_METADATA_PARSE_FAILED"
    | "VIDEO_METADATA_MISMATCH"
    | "AUDIO_TRACK_COUNT_INVALID"
  >,
  message: string,
  path: string
): MathSceneWebmMediaEvidenceResult {
  return { error: { code, message, path }, ok: false };
}

function normalizeMimeType(value: string) {
  return value
    .toLowerCase()
    .split(";")
    .map((part) => part.trim().replace(/\s*=\s*/g, "="))
    .filter(Boolean)
    .join(";");
}

function validExpected(expected: MathSceneWebmExpectedMedia) {
  return Boolean(
    expected &&
    Number.isFinite(expected.durationSeconds) &&
    expected.durationSeconds > 0 &&
    Number.isInteger(expected.width) &&
    expected.width > 0 &&
    Number.isInteger(expected.height) &&
    expected.height > 0 &&
    typeof expected.audioExpected === "boolean" &&
    webmMimeTypes.has(normalizeMimeType(expected.mimeType))
  );
}

function validParsedMetadata(value: unknown): value is MathSceneWebmParsedVideoMetadata {
  if (!value || typeof value !== "object") return false;
  const metadata = value as Partial<MathSceneWebmParsedVideoMetadata>;
  return Boolean(
    typeof metadata.durationSeconds === "number" &&
    Number.isFinite(metadata.durationSeconds) &&
    metadata.durationSeconds > 0 &&
    Number.isInteger(metadata.width) &&
    Number(metadata.width) > 0 &&
    Number.isInteger(metadata.height) &&
    Number(metadata.height) > 0 &&
    (metadata.audioTrackCount === null || (
      typeof metadata.audioTrackCount === "number" &&
      Number.isInteger(metadata.audioTrackCount) &&
      metadata.audioTrackCount >= 0
    ))
  );
}

async function hasEbmlMagic(blob: Blob) {
  try {
    const bytes = new Uint8Array(await blob.slice(0, EBML_MAGIC.length).arrayBuffer());
    return bytes.length === EBML_MAGIC.length && EBML_MAGIC.every((byte, index) => bytes[index] === byte);
  } catch {
    return false;
  }
}

export async function verifyMathSceneWebmMediaEvidence({
  blob,
  durationToleranceSeconds = 0,
  expected,
  parseVideoMetadata
}: MathSceneWebmMediaEvidenceInput): Promise<MathSceneWebmMediaEvidenceResult> {
  if (!validExpected(expected) || !Number.isFinite(durationToleranceSeconds) || durationToleranceSeconds < 0) {
    return failed("CAPTURE_PLAN_INVALID", "Expected WebM media metadata is invalid.", "expected");
  }
  if (!(blob instanceof Blob) || blob.size <= 0) {
    return failed("VIDEO_BLOB_EMPTY", "Encoded WebM Blob must be non-empty.", "blob");
  }

  const actualMimeType = normalizeMimeType(blob.type);
  const expectedMimeType = normalizeMimeType(expected.mimeType);
  if (!webmMimeTypes.has(actualMimeType) || actualMimeType !== expectedMimeType) {
    return failed("VIDEO_MIME_MISMATCH", "Encoded WebM Blob MIME type does not match the selected profile.", "blob.type");
  }
  if (!(await hasEbmlMagic(blob))) {
    return failed("VIDEO_EBML_INVALID", "Encoded media does not begin with the EBML magic bytes required by WebM.", "blob");
  }

  let parsed: MathSceneWebmParsedVideoMetadata;
  try {
    const candidate = await parseVideoMetadata(blob);
    if (!validParsedMetadata(candidate)) {
      return failed("VIDEO_METADATA_PARSE_FAILED", "Video metadata parser returned invalid metadata.", "metadata");
    }
    parsed = candidate;
  } catch {
    return failed("VIDEO_METADATA_PARSE_FAILED", "Video metadata parsing failed safely.", "metadata");
  }

  if (
    Math.abs(parsed.durationSeconds - expected.durationSeconds) > durationToleranceSeconds ||
    parsed.width !== expected.width ||
    parsed.height !== expected.height
  ) {
    return failed(
      "VIDEO_METADATA_MISMATCH",
      "Parsed video duration or dimensions do not match the export profile.",
      "metadata"
    );
  }

  if (
    (expected.audioExpected && parsed.audioTrackCount !== 1) ||
    (!expected.audioExpected && parsed.audioTrackCount !== null && parsed.audioTrackCount !== 0)
  ) {
    return failed(
      "AUDIO_TRACK_COUNT_INVALID",
      "Parsed WebM audio-track evidence does not match the export request.",
      "metadata.audioTrackCount"
    );
  }

  return {
    evidence: {
      actualMimeType: actualMimeType as MathSceneWebmMimeType,
      audioTrackCount: parsed.audioTrackCount === 1 ? 1 : parsed.audioTrackCount === 0 ? 0 : null,
      byteLength: blob.size,
      durationSeconds: parsed.durationSeconds,
      ebmlMagic: "1a45dfa3",
      ebmlMagicVerified: true,
      height: parsed.height,
      metadataParsed: true,
      schemaVersion: "mais-manim-webm-media-evidence/v1",
      width: parsed.width
    },
    ok: true
  };
}
