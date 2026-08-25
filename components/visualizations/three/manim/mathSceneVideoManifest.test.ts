import assert from "node:assert/strict";
import test from "node:test";
import type { MathSceneVideoExportReadyResult } from "./mathSceneVideoExportContract";
import {
  MATH_SCENE_VIDEO_MANIFEST_FIELDS,
  buildMathSceneVideoManifest,
  serializeMathSceneVideoManifest,
  type MathSceneVideoManifestInput
} from "./mathSceneVideoManifest";

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

function manifestInput(): MathSceneVideoManifestInput {
  return {
    audio: {
      contentHash: hash("a"),
      durationSeconds: 2,
      fileName: "unit-wave-audio.wav",
      mimeType: "audio/wav"
    },
    captionsVtt: {
      contentHash: hash("b"),
      cueCount: 4,
      fileName: "unit-wave.vtt",
      mimeType: "text/vtt"
    },
    package: {
      contentHash: hash("d"),
      sceneId: "unit-wave",
      schemaVersion: "mais-manim-scene-package/v3"
    },
    profile: {
      contentHash: hash("e"),
      fps: 30,
      height: 720,
      id: "webm-720p",
      mimeType: "video/webm;codecs=vp9",
      width: 1280
    },
    result: readyResult()
  };
}

test("builds an exact serializable manifest when every hash and profile field agrees", () => {
  const built = buildMathSceneVideoManifest(manifestInput());
  assert.equal(built.ok, true, built.ok ? "" : JSON.stringify(built.error));
  assert.ok(built.ok);
  assert.deepEqual(MATH_SCENE_VIDEO_MANIFEST_FIELDS, [
    "audio",
    "captionsVtt",
    "package",
    "profile",
    "result",
    "schemaVersion"
  ]);
  assert.deepEqual(Object.keys(built.manifest), [...MATH_SCENE_VIDEO_MANIFEST_FIELDS]);
  assert.equal(built.manifest.schemaVersion, "mais-manim-video-manifest/v1");
  assert.deepEqual(built.manifest.result, readyResult());
  assert.notStrictEqual(built.manifest.result, manifestInput().result);

  const serialized = serializeMathSceneVideoManifest(built.manifest);
  assert.deepEqual(Object.keys(JSON.parse(serialized)), [...MATH_SCENE_VIDEO_MANIFEST_FIELDS]);
  assert.doesNotMatch(serialized, /blob:|objectUrl|https?:\/\/|\"blob\"/i);
});

test("rejects package, profile, VTT, and audio hash lies", () => {
  const lies: MathSceneVideoManifestInput[] = [
    { ...manifestInput(), package: { ...manifestInput().package, contentHash: hash("f") } },
    { ...manifestInput(), package: { ...manifestInput().package, sceneId: "other-scene" } },
    { ...manifestInput(), profile: { ...manifestInput().profile, contentHash: hash("1") } },
    { ...manifestInput(), profile: { ...manifestInput().profile, id: "other-profile" } },
    { ...manifestInput(), captionsVtt: { ...manifestInput().captionsVtt!, contentHash: hash("2") } },
    { ...manifestInput(), audio: { ...manifestInput().audio!, contentHash: hash("3") } }
  ];

  for (const lie of lies) {
    const built = buildMathSceneVideoManifest(lie);
    assert.equal(built.ok, false);
    assert.ok(!built.ok);
    assert.equal(built.error.code, "MANIFEST_HASH_MISMATCH");
  }
});

test("rejects malformed reference hashes and caption file-name lies", () => {
  const malformed = buildMathSceneVideoManifest({
    ...manifestInput(),
    package: { ...manifestInput().package, contentHash: "sha256-not-real" }
  });
  assert.equal(malformed.ok, false);
  assert.ok(!malformed.ok);
  assert.equal(malformed.error.code, "MANIFEST_INVALID");

  const wrongCaptionName = buildMathSceneVideoManifest({
    ...manifestInput(),
    captionsVtt: { ...manifestInput().captionsVtt!, fileName: "other.vtt" }
  });
  assert.equal(wrongCaptionName.ok, false);
  assert.ok(!wrongCaptionName.ok);
  assert.equal(wrongCaptionName.error.code, "MANIFEST_HASH_MISMATCH");
});

test("rejects missing or invented VTT and audio references", () => {
  const missingVtt = buildMathSceneVideoManifest({ ...manifestInput(), captionsVtt: null });
  const missingAudio = buildMathSceneVideoManifest({ ...manifestInput(), audio: null });
  const resultWithoutVtt = { ...readyResult(), captionFileName: null, captionsVttContentHash: null };
  const inventedVtt = buildMathSceneVideoManifest({ ...manifestInput(), result: resultWithoutVtt });
  const resultWithoutAudio = { ...readyResult(), audioContentHash: null, audioIncluded: false };
  const inventedAudio = buildMathSceneVideoManifest({ ...manifestInput(), result: resultWithoutAudio });

  for (const lie of [missingVtt, missingAudio, inventedVtt, inventedAudio]) {
    assert.equal(lie.ok, false);
    assert.ok(!lie.ok);
    assert.equal(lie.error.code, "MANIFEST_HASH_MISMATCH");
  }
});

test("rejects profile MIME, dimensions, and fps that disagree with parsed media", () => {
  const mismatches: MathSceneVideoManifestInput[] = [
    { ...manifestInput(), profile: { ...manifestInput().profile, mimeType: "video/webm;codecs=vp8" } },
    { ...manifestInput(), profile: { ...manifestInput().profile, width: 640 } },
    { ...manifestInput(), profile: { ...manifestInput().profile, height: 360 } },
    { ...manifestInput(), profile: { ...manifestInput().profile, fps: 24 } }
  ];

  for (const mismatch of mismatches) {
    const built = buildMathSceneVideoManifest(mismatch);
    assert.equal(built.ok, false);
    assert.ok(!built.ok);
    assert.equal(built.error.code, "MANIFEST_HASH_MISMATCH");
  }
});

test("rejects extra Blob/URL fields and URL-shaped local file names", () => {
  const rootWithUrl = {
    ...manifestInput(),
    objectUrl: "blob:manifest"
  } as unknown as MathSceneVideoManifestInput;
  const packageWithBlob = {
    ...manifestInput(),
    package: { ...manifestInput().package, blob: new Blob(["package"]) }
  } as unknown as MathSceneVideoManifestInput;
  const profileWithUrl = {
    ...manifestInput(),
    profile: { ...manifestInput().profile, objectUrl: "blob:profile" }
  } as unknown as MathSceneVideoManifestInput;
  const remoteVtt = {
    ...manifestInput(),
    captionsVtt: { ...manifestInput().captionsVtt!, fileName: "https://example.test/captions.vtt" }
  };

  for (const invalid of [rootWithUrl, packageWithBlob, profileWithUrl, remoteVtt]) {
    const built = buildMathSceneVideoManifest(invalid);
    assert.equal(built.ok, false);
    assert.ok(!built.ok);
    assert.equal(built.error.code, "MANIFEST_INVALID");
  }
});

test("accepts every declared local audio MIME with its local file extension", () => {
  const audioCases: Array<Pick<NonNullable<MathSceneVideoManifestInput["audio"]>, "fileName" | "mimeType">> = [
    { fileName: "narration.m4a", mimeType: "audio/mp4" },
    { fileName: "narration.mp3", mimeType: "audio/mpeg" },
    { fileName: "narration.ogg", mimeType: "audio/ogg" },
    { fileName: "narration.wav", mimeType: "audio/wav" },
    { fileName: "narration.webm", mimeType: "audio/webm" }
  ];

  for (const audioCase of audioCases) {
    const base = manifestInput();
    const built = buildMathSceneVideoManifest({
      ...base,
      audio: { ...base.audio!, ...audioCase }
    });
    assert.equal(built.ok, true, built.ok ? "" : JSON.stringify(built.error));
  }
});

test("supports truthful null VTT and audio references", () => {
  const noOptionalResult = {
    ...readyResult(),
    audioContentHash: null,
    audioIncluded: false,
    captionFileName: null,
    captionsVttContentHash: null
  };
  const built = buildMathSceneVideoManifest({
    ...manifestInput(),
    audio: null,
    captionsVtt: null,
    result: noOptionalResult
  });

  assert.equal(built.ok, true, built.ok ? "" : JSON.stringify(built.error));
  assert.ok(built.ok);
  assert.equal(built.manifest.audio, null);
  assert.equal(built.manifest.captionsVtt, null);
});
