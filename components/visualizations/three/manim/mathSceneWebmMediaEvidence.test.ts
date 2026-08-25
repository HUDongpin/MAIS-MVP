import assert from "node:assert/strict";
import test from "node:test";
import {
  verifyMathSceneWebmMediaEvidence,
  type MathSceneWebmVideoMetadataParser
} from "./mathSceneWebmMediaEvidence";

const ebmlHeader = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]);

function webm(
  payload: Uint8Array = new Uint8Array([0x42, 0x86, 0x81, 0x01]),
  type = "video/webm;codecs=vp9"
) {
  return new Blob([ebmlHeader, payload], { type });
}

function metadataParser(
  metadata: {
    audioTrackCount: number | null;
    durationSeconds: number;
    height: number;
    width: number;
  } = { audioTrackCount: null, durationSeconds: 2, height: 720, width: 1280 }
): MathSceneWebmVideoMetadataParser {
  return async () => metadata;
}

function input(overrides: Partial<Parameters<typeof verifyMathSceneWebmMediaEvidence>[0]> = {}) {
  return {
    blob: webm(),
    durationToleranceSeconds: 0.02,
    expected: {
      audioExpected: false,
      durationSeconds: 2,
      height: 720,
      mimeType: "video/webm;codecs=vp9" as const,
      width: 1280
    },
    parseVideoMetadata: metadataParser(),
    ...overrides
  };
}

test("verifies non-empty WebM bytes, actual MIME, EBML magic, and parsed metadata", async () => {
  let parserCalls = 0;
  const verified = await verifyMathSceneWebmMediaEvidence(input({
    parseVideoMetadata: async (blob) => {
      parserCalls += 1;
      assert.equal(blob.size, 8);
      return { audioTrackCount: null, durationSeconds: 2.01, height: 720, width: 1280 };
    }
  }));

  assert.equal(verified.ok, true, verified.ok ? "" : JSON.stringify(verified.error));
  assert.ok(verified.ok);
  assert.deepEqual(verified.evidence, {
    actualMimeType: "video/webm;codecs=vp9",
    audioTrackCount: null,
    byteLength: 8,
    durationSeconds: 2.01,
    ebmlMagic: "1a45dfa3",
    ebmlMagicVerified: true,
    height: 720,
    metadataParsed: true,
    schemaVersion: "mais-manim-webm-media-evidence/v1",
    width: 1280
  });
  assert.equal(parserCalls, 1);
  assert.doesNotMatch(JSON.stringify(verified.evidence), /blob:|objectUrl|\"blob\"/i);
});

test("rejects an empty Blob before calling the metadata parser", async () => {
  let parserCalls = 0;
  const result = await verifyMathSceneWebmMediaEvidence(input({
    blob: new Blob([], { type: "video/webm;codecs=vp9" }),
    parseVideoMetadata: async () => {
      parserCalls += 1;
      return { audioTrackCount: null, durationSeconds: 2, height: 720, width: 1280 };
    }
  }));

  assert.equal(result.ok, false);
  assert.ok(!result.ok);
  assert.equal(result.error.code, "VIDEO_BLOB_EMPTY");
  assert.equal(parserCalls, 0);
});

test("rejects actual MIME mismatches before parsing", async () => {
  let parserCalls = 0;
  const result = await verifyMathSceneWebmMediaEvidence(input({
    blob: webm(undefined, "video/webm;codecs=vp8"),
    parseVideoMetadata: async () => {
      parserCalls += 1;
      return { audioTrackCount: null, durationSeconds: 2, height: 720, width: 1280 };
    }
  }));

  assert.equal(result.ok, false);
  assert.ok(!result.ok);
  assert.equal(result.error.code, "VIDEO_MIME_MISMATCH");
  assert.equal(parserCalls, 0);
});

test("rejects a non-EBML payload even when it is non-empty and claims WebM MIME", async () => {
  let parserCalls = 0;
  const result = await verifyMathSceneWebmMediaEvidence(input({
    blob: new Blob([new Uint8Array([0, 1, 2, 3, 4, 5])], { type: "video/webm;codecs=vp9" }),
    parseVideoMetadata: async () => {
      parserCalls += 1;
      return { audioTrackCount: null, durationSeconds: 2, height: 720, width: 1280 };
    }
  }));

  assert.equal(result.ok, false);
  assert.ok(!result.ok);
  assert.equal(result.error.code, "VIDEO_EBML_INVALID");
  assert.equal(parserCalls, 0);
});

test("does not treat size and EBML magic as parsed metadata evidence", async () => {
  const result = await verifyMathSceneWebmMediaEvidence(input({
    parseVideoMetadata: async () => {
      throw new Error("video element could not decode");
    }
  }));

  assert.equal(result.ok, false);
  assert.ok(!result.ok);
  assert.equal(result.error.code, "VIDEO_METADATA_PARSE_FAILED");
  assert.doesNotMatch(result.error.message, /video element could not decode/);
});

test("rejects invalid or mismatched duration and dimensions from the parser", async () => {
  const invalid = await verifyMathSceneWebmMediaEvidence(input({
    parseVideoMetadata: metadataParser({ audioTrackCount: null, durationSeconds: Number.NaN, height: 720, width: 1280 })
  }));
  const durationMismatch = await verifyMathSceneWebmMediaEvidence(input({
    parseVideoMetadata: metadataParser({ audioTrackCount: null, durationSeconds: 2.5, height: 720, width: 1280 })
  }));
  const widthMismatch = await verifyMathSceneWebmMediaEvidence(input({
    parseVideoMetadata: metadataParser({ audioTrackCount: null, durationSeconds: 2, height: 720, width: 640 })
  }));
  const heightMismatch = await verifyMathSceneWebmMediaEvidence(input({
    parseVideoMetadata: metadataParser({ audioTrackCount: null, durationSeconds: 2, height: 360, width: 1280 })
  }));

  assert.equal(invalid.ok, false);
  assert.ok(!invalid.ok);
  assert.equal(invalid.error.code, "VIDEO_METADATA_PARSE_FAILED");
  for (const mismatch of [durationMismatch, widthMismatch, heightMismatch]) {
    assert.equal(mismatch.ok, false);
    assert.ok(!mismatch.ok);
    assert.equal(mismatch.error.code, "VIDEO_METADATA_MISMATCH");
  }
});

test("requires observed encoded-audio track evidence before accepting audio inclusion", async () => {
  const observed = await verifyMathSceneWebmMediaEvidence(input({
    expected: {
      ...input().expected,
      audioExpected: true
    },
    parseVideoMetadata: metadataParser({
      audioTrackCount: 1,
      durationSeconds: 2,
      height: 720,
      width: 1280
    })
  }));
  assert.equal(observed.ok, true, observed.ok ? "" : JSON.stringify(observed.error));
  assert.ok(observed.ok);
  assert.equal(observed.evidence.audioTrackCount, 1);

  for (const audioTrackCount of [null, 0, 2]) {
    const missing = await verifyMathSceneWebmMediaEvidence(input({
      expected: { ...input().expected, audioExpected: true },
      parseVideoMetadata: metadataParser({
        audioTrackCount,
        durationSeconds: 2,
        height: 720,
        width: 1280
      })
    }));
    assert.equal(missing.ok, false);
    assert.ok(!missing.ok);
    assert.equal(missing.error.code, "AUDIO_TRACK_COUNT_INVALID");
  }
});
