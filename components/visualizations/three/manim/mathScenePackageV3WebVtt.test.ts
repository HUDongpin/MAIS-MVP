import assert from "node:assert/strict";
import test from "node:test";
import { canonicalMathSceneBeatId, type MathSceneCaptionCue } from "./mathScenePackageV3";
import { buildMathScenePackageV3WebVtt } from "./mathScenePackageV3WebVtt";

const cues: MathSceneCaptionCue[] = [
  {
    beatId: canonicalMathSceneBeatId(0),
    beatIndex: 0,
    conceptId: "unit-circle",
    endSeconds: 1.25,
    startSeconds: 0,
    text: { en: "Build the circle.", zh: "建立單位圓。", zhHans: "建立单位圆。" }
  },
  {
    beatId: canonicalMathSceneBeatId(1),
    beatIndex: 1,
    conceptId: "sine-wave",
    endSeconds: 65.007,
    startSeconds: 61.5,
    text: { en: "Trace the height.", zh: "追蹤高度。", zhHans: "追踪高度。" }
  }
];

test("generates deterministic UTF-8 WebVTT for all three locales", () => {
  assert.equal(
    buildMathScenePackageV3WebVtt(cues, "en"),
    "WEBVTT\n\nbeat-1 unit-circle\n00:00:00.000 --> 00:00:01.250\nBuild the circle.\n\nbeat-2 sine-wave\n00:01:01.500 --> 00:01:05.007\nTrace the height.\n"
  );
  assert.match(buildMathScenePackageV3WebVtt(cues, "zh"), /建立單位圓。/);
  assert.match(buildMathScenePackageV3WebVtt(cues, "zhHans"), /建立单位圆。/);
  assert.equal(Buffer.from(buildMathScenePackageV3WebVtt(cues, "zh"), "utf8").toString("utf8"), buildMathScenePackageV3WebVtt(cues, "zh"));
});

test("rejects malformed, inverted, empty, or non-monotonic cue input", () => {
  assert.throws(
    () => buildMathScenePackageV3WebVtt([{ ...cues[0], startSeconds: 2 }], "en"),
    /caption cue time is invalid/i
  );
  assert.throws(
    () => buildMathScenePackageV3WebVtt([{ ...cues[0], text: { ...cues[0].text, en: "" } }], "en"),
    /caption text is empty/i
  );
  assert.throws(
    () => buildMathScenePackageV3WebVtt([cues[1], cues[0]], "en"),
    /caption cues are not monotonic/i
  );
  assert.throws(
    () => buildMathScenePackageV3WebVtt([{ ...cues[0], endSeconds: 0.0004 }], "en"),
    /caption cue time is invalid/i
  );
  assert.throws(
    () => buildMathScenePackageV3WebVtt([
      { ...cues[0], endSeconds: 0.0014 },
      { ...cues[1], endSeconds: 0.00149, startSeconds: 0.0014 }
    ], "en"),
    /caption cue time is invalid/i
  );
});

test("escapes WebVTT cue text injection while preserving math text", () => {
  const output = buildMathScenePackageV3WebVtt([
    { ...cues[0], text: { ...cues[0].text, en: "f(x) < y\n\nWEBVTT" } }
  ], "en");
  assert.match(output, /f\(x\) &lt; y\nWEBVTT/);
  assert.equal((output.match(/^WEBVTT$/gm) ?? []).length, 2, "payload marker stays cue text, not a second header block");
  assert.doesNotMatch(output, /\n\nWEBVTT\n/);
});

test("fails closed for unsafe milliseconds, excessive cue counts, and multiline identifiers", () => {
  const unsafeStart = Number.MAX_SAFE_INTEGER / 1_000;
  assert.throws(
    () => buildMathScenePackageV3WebVtt([{
      ...cues[0],
      endSeconds: unsafeStart + 1,
      startSeconds: unsafeStart
    }], "en"),
    /caption cue time is invalid/i
  );
  assert.throws(
    () => buildMathScenePackageV3WebVtt([{ ...cues[0], beatId: "beat-1\n00:00:00.000 --> 99:00:00.000" }], "en"),
    /caption cue identifier is invalid/i
  );
  assert.throws(
    () => buildMathScenePackageV3WebVtt([{ ...cues[0], conceptId: "unit-circle\rWEBVTT" }], "en"),
    /caption cue identifier is invalid/i
  );
  assert.throws(
    () => buildMathScenePackageV3WebVtt(Array.from({ length: 10_001 }, () => cues[0]), "en"),
    /caption cue count exceeds/i
  );
});
