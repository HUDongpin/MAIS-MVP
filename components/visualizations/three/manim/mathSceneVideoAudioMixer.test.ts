import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  MATH_SCENE_VIDEO_AUDIO_ADAPTER_CONTRACT,
  buildMathSceneVideoAudioMixPlan,
  runMathSceneVideoAudioMixPlan,
  type MathSceneVideoAudioMixerAdapter,
  type MathSceneVideoLocalAudioTrack
} from "./mathSceneVideoAudioMixer";

const modulePath = "components/visualizations/three/manim/mathSceneVideoAudioMixer.ts";
const audioHash = `sha256-${"a".repeat(64)}`;

function track(overrides: Partial<MathSceneVideoLocalAudioTrack> = {}): MathSceneVideoLocalAudioTrack {
  return {
    contentHash: audioHash,
    durationSeconds: 2,
    fileName: "narration.wav",
    mimeType: "audio/wav",
    source: "local-file",
    trackId: "narration",
    ...overrides
  };
}

function builtPlan(tracks: MathSceneVideoLocalAudioTrack[], videoDurationSeconds = 3) {
  const built = buildMathSceneVideoAudioMixPlan({ tracks, videoDurationSeconds });
  assert.equal(built.ok, true, built.ok ? "" : JSON.stringify(built.error));
  assert.ok(built.ok);
  return built.plan;
}

function adapterFixture(overrides: Partial<MathSceneVideoAudioMixerAdapter<string>> = {}) {
  const calls: string[] = [];
  const adapter: MathSceneVideoAudioMixerAdapter<string> = {
    cleanup: async (handle) => {
      calls.push(`cleanup:${handle}`);
    },
    inspectMixedTrack: async (handle) => {
      calls.push(`inspect:${handle}`);
      return { durationSeconds: 3, trackCount: 1 };
    },
    openLocalTrack: async (source) => {
      calls.push(`open:${source.trackId}`);
      return "handle-1";
    },
    padSilence: async (handle, seconds) => {
      calls.push(`pad:${handle}:${seconds}`);
    },
    truncate: async (handle, targetDurationSeconds) => {
      calls.push(`truncate:${handle}:${targetDurationSeconds}`);
    },
    ...overrides
  };
  return { adapter, calls };
}

test("plans no-audio, passthrough, silence padding, and truncation deterministically", () => {
  const noAudio = builtPlan([], 3);
  const passthrough = builtPlan([track({ durationSeconds: 3 })], 3);
  const short = builtPlan([track({ durationSeconds: 2 })], 3);
  const long = builtPlan([track({ durationSeconds: 4 })], 3);

  assert.deepEqual(noAudio, {
    adjustmentSeconds: 0,
    requiresAdapter: false,
    schemaVersion: "mais-manim-video-audio-mix-plan/v1",
    sourceTrack: null,
    sourceTrackCount: 0,
    strategy: "no-audio",
    targetDurationSeconds: 3
  });
  assert.equal(passthrough.strategy, "passthrough");
  assert.equal(passthrough.adjustmentSeconds, 0);
  assert.equal(short.strategy, "pad-silence");
  assert.equal(short.adjustmentSeconds, 1);
  assert.equal(long.strategy, "truncate");
  assert.equal(long.adjustmentSeconds, 1);
  assert.equal(short.sourceTrack?.contentHash, audioHash);
  assert.notStrictEqual(short.sourceTrack, track());
  assert.doesNotMatch(JSON.stringify(short), /blob:|objectUrl|https?:\/\//i);
});

test("rejects more than one track and every non-local source", () => {
  const multiple = buildMathSceneVideoAudioMixPlan({ tracks: [track(), track({ trackId: "second" })], videoDurationSeconds: 3 });
  const microphone = buildMathSceneVideoAudioMixPlan({
    tracks: [{ ...track(), source: "microphone" } as unknown as MathSceneVideoLocalAudioTrack],
    videoDurationSeconds: 3
  });
  const remoteName = buildMathSceneVideoAudioMixPlan({
    tracks: [track({ fileName: "https://example.test/narration.wav" })],
    videoDurationSeconds: 3
  });
  const malformedHash = buildMathSceneVideoAudioMixPlan({
    tracks: [track({ contentHash: "sha256-not-real" })],
    videoDurationSeconds: 3
  });

  assert.equal(multiple.ok, false);
  assert.ok(!multiple.ok);
  assert.equal(multiple.error.code, "AUDIO_TRACK_COUNT_INVALID");
  assert.equal(microphone.ok, false);
  assert.ok(!microphone.ok);
  assert.equal(microphone.error.code, "AUDIO_SOURCE_INVALID");
  assert.equal(remoteName.ok, false);
  assert.ok(!remoteName.ok);
  assert.equal(remoteName.error.code, "AUDIO_SOURCE_INVALID");
  assert.equal(malformedHash.ok, false);
  assert.ok(!malformedHash.ok);
  assert.equal(malformedHash.error.code, "AUDIO_SOURCE_INVALID");
});

test("runs a short local track through silence padding, inspection, and cleanup", async () => {
  const { adapter, calls } = adapterFixture();
  const result = await runMathSceneVideoAudioMixPlan({
    adapter,
    plan: builtPlan([track({ durationSeconds: 2 })], 3)
  });

  assert.equal(result.ok, true, result.ok ? "" : JSON.stringify(result.error));
  assert.ok(result.ok);
  assert.deepEqual(result.evidence, {
    cleanupCompleted: true,
    durationSeconds: 3,
    included: true,
    schemaVersion: "mais-manim-video-audio-evidence/v1",
    sourceContentHash: audioHash,
    strategy: "pad-silence",
    trackCount: 1
  });
  assert.deepEqual(calls, ["open:narration", "pad:handle-1:1", "inspect:handle-1", "cleanup:handle-1"]);
});

test("runs a long local track through truncation and cleanup", async () => {
  const { adapter, calls } = adapterFixture();
  const result = await runMathSceneVideoAudioMixPlan({
    adapter,
    plan: builtPlan([track({ durationSeconds: 4 })], 3)
  });

  assert.equal(result.ok, true);
  assert.deepEqual(calls, ["open:narration", "truncate:handle-1:3", "inspect:handle-1", "cleanup:handle-1"]);
});

test("accepts a semantically identical plan regardless of object key insertion order", async () => {
  const plan = builtPlan([track()], 3);
  const reordered = Object.fromEntries(Object.entries(plan).reverse()) as typeof plan;
  const { adapter, calls } = adapterFixture();
  const result = await runMathSceneVideoAudioMixPlan({ adapter, plan: reordered });

  assert.equal(result.ok, true, result.ok ? "" : JSON.stringify(result.error));
  assert.deepEqual(calls, ["open:narration", "pad:handle-1:1", "inspect:handle-1", "cleanup:handle-1"]);
});

test("returns no-audio evidence without touching the adapter", async () => {
  const { adapter, calls } = adapterFixture();
  const result = await runMathSceneVideoAudioMixPlan({ adapter, plan: builtPlan([], 3) });

  assert.equal(result.ok, true);
  assert.ok(result.ok);
  assert.deepEqual(result.evidence, {
    cleanupCompleted: true,
    durationSeconds: 3,
    included: false,
    schemaVersion: "mais-manim-video-audio-evidence/v1",
    sourceContentHash: null,
    strategy: "no-audio",
    trackCount: 0
  });
  assert.deepEqual(calls, []);
});

test("aborts before opening or after opening while still cleaning the local handle", async () => {
  const before = adapterFixture();
  const abortedBefore = await runMathSceneVideoAudioMixPlan({
    abortSignal: { aborted: true },
    adapter: before.adapter,
    plan: builtPlan([track()], 3)
  });
  assert.equal(abortedBefore.ok, false);
  assert.ok(!abortedBefore.ok);
  assert.equal(abortedBefore.error.code, "AUDIO_MIX_ABORTED");
  assert.deepEqual(before.calls, []);

  const abortSignal = { aborted: false };
  const after = adapterFixture({
    openLocalTrack: async (source) => {
      after.calls.push(`open:${source.trackId}`);
      abortSignal.aborted = true;
      return "handle-1";
    }
  });
  const abortedAfter = await runMathSceneVideoAudioMixPlan({
    abortSignal,
    adapter: after.adapter,
    plan: builtPlan([track()], 3)
  });
  assert.equal(abortedAfter.ok, false);
  assert.ok(!abortedAfter.ok);
  assert.equal(abortedAfter.error.code, "AUDIO_MIX_ABORTED");
  assert.deepEqual(after.calls, ["open:narration", "cleanup:handle-1"]);
});

test("cleans up after adapter failure and does not expose raw adapter errors", async () => {
  const fixture = adapterFixture({
    padSilence: async () => {
      fixture.calls.push("pad:failed");
      throw new Error("private decoder detail");
    }
  });
  const result = await runMathSceneVideoAudioMixPlan({
    adapter: fixture.adapter,
    plan: builtPlan([track()], 3)
  });

  assert.equal(result.ok, false);
  assert.ok(!result.ok);
  assert.equal(result.error.code, "AUDIO_MIX_FAILED");
  assert.doesNotMatch(result.error.message, /private decoder detail/);
  assert.deepEqual(fixture.calls, ["open:narration", "pad:failed", "cleanup:handle-1"]);
});

test("reports cleanup failure instead of claiming usable audio evidence", async () => {
  const fixture = adapterFixture({
    cleanup: async (handle) => {
      fixture.calls.push(`cleanup:${handle}`);
      throw new Error("cleanup failed");
    }
  });
  const result = await runMathSceneVideoAudioMixPlan({
    adapter: fixture.adapter,
    plan: builtPlan([track()], 3)
  });

  assert.equal(result.ok, false);
  assert.ok(!result.ok);
  assert.equal(result.error.code, "AUDIO_CLEANUP_FAILED");
  assert.equal(fixture.calls.at(-1), "cleanup:handle-1");
});

test("rejects adapter evidence with multiple tracks or wrong duration and always cleans up", async () => {
  const fixture = adapterFixture({
    inspectMixedTrack: async (handle) => {
      fixture.calls.push(`inspect:${handle}`);
      return { durationSeconds: 2, trackCount: 2 };
    }
  });
  const result = await runMathSceneVideoAudioMixPlan({
    adapter: fixture.adapter,
    plan: builtPlan([track()], 3)
  });

  assert.equal(result.ok, false);
  assert.ok(!result.ok);
  assert.equal(result.error.code, "AUDIO_MIX_FAILED");
  assert.equal(fixture.calls.at(-1), "cleanup:handle-1");
});

test("declares a local adapter boundary and contains no external-service calls", () => {
  const source = fs.readFileSync(modulePath, "utf8");
  assert.match(MATH_SCENE_VIDEO_AUDIO_ADAPTER_CONTRACT, /single local track/i);
  assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|https?:\/\//);
});
