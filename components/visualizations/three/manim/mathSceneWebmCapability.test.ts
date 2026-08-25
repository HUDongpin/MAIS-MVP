import assert from "node:assert/strict";
import test from "node:test";
import {
  MATH_SCENE_LOCAL_MP4_FALLBACK,
  MATH_SCENE_WEBM_MIME_PREFERENCE,
  probeMathSceneWebmCapability,
  type MathSceneWebmCapabilityAdapter
} from "./mathSceneWebmCapability";

function adapter(overrides: Partial<MathSceneWebmCapabilityAdapter> = {}): MathSceneWebmCapabilityAdapter {
  return {
    canvas: {
      captureStream: () => ({ id: "probe-stream" })
    },
    mediaRecorder: {
      construct: (_stream, options) => ({ mimeType: options.mimeType }),
      isTypeSupported: () => true
    },
    releaseProbe: () => undefined,
    ...overrides
  };
}

test("probes WebM in VP9, VP8, then generic preference order", () => {
  const checked: string[] = [];
  const constructed: string[] = [];
  const released: Array<{ recorder: unknown; stream: unknown }> = [];
  const result = probeMathSceneWebmCapability({
    adapter: adapter({
      mediaRecorder: {
        construct: (stream, options) => {
          constructed.push(options.mimeType);
          return { stream };
        },
        isTypeSupported: (mimeType) => {
          checked.push(mimeType);
          return true;
        }
      },
      releaseProbe: (probe) => released.push(probe)
    }),
    fps: 30
  });

  assert.equal(result.supported, true, result.supported ? "" : JSON.stringify(result.reason));
  assert.ok(result.supported);
  assert.equal(result.mimeType, "video/webm;codecs=vp9");
  assert.deepEqual(checked, [...MATH_SCENE_WEBM_MIME_PREFERENCE]);
  assert.deepEqual(constructed, ["video/webm;codecs=vp9"]);
  assert.equal(released.length, 1);
  assert.deepEqual(result.localMp4Fallback, MATH_SCENE_LOCAL_MP4_FALLBACK);
});

test("falls through to VP8 when the preferred constructor still fails", () => {
  const constructed: string[] = [];
  const result = probeMathSceneWebmCapability({
    adapter: adapter({
      mediaRecorder: {
        construct: (_stream, options) => {
          constructed.push(options.mimeType);
          if (options.mimeType.includes("vp9")) throw new Error("browser constructor rejected VP9");
          return { mimeType: options.mimeType };
        },
        isTypeSupported: () => true
      }
    }),
    fps: 30
  });

  assert.equal(result.supported, true, result.supported ? "" : JSON.stringify(result.reason));
  assert.ok(result.supported);
  assert.equal(result.mimeType, "video/webm;codecs=vp8");
  assert.deepEqual(result.constructorFailures, ["video/webm;codecs=vp9"]);
  assert.deepEqual(constructed, ["video/webm;codecs=vp9", "video/webm;codecs=vp8"]);
});

test("selects generic WebM only after both codec-specific types are unsupported", () => {
  const constructed: string[] = [];
  const result = probeMathSceneWebmCapability({
    adapter: adapter({
      mediaRecorder: {
        construct: (_stream, options) => {
          constructed.push(options.mimeType);
          return {};
        },
        isTypeSupported: (mimeType) => mimeType === "video/webm"
      }
    }),
    fps: 24
  });

  assert.equal(result.supported, true);
  assert.ok(result.supported);
  assert.equal(result.mimeType, "video/webm");
  assert.deepEqual(constructed, ["video/webm"]);
});

test("fails safely when canvas captureStream is absent", () => {
  let mediaRecorderTouched = false;
  const result = probeMathSceneWebmCapability({
    adapter: adapter({
      canvas: {},
      mediaRecorder: {
        construct: () => {
          mediaRecorderTouched = true;
          return {};
        },
        isTypeSupported: () => {
          mediaRecorderTouched = true;
          return true;
        }
      }
    }),
    fps: 30
  });

  assert.equal(result.supported, false);
  assert.ok(!result.supported);
  assert.equal(result.reason.code, "CANVAS_CAPTURE_STREAM_UNAVAILABLE");
  assert.equal(mediaRecorderTouched, false);
  assert.deepEqual(result.localMp4Fallback, {
    format: "mp4",
    locality: "local-only",
    requiresSeparateExecutor: true
  });
});

test("fails safely when MediaRecorder or isTypeSupported is absent", () => {
  const noRecorder = probeMathSceneWebmCapability({
    adapter: adapter({ mediaRecorder: null }),
    fps: 30
  });
  const noSupportFunction = probeMathSceneWebmCapability({
    adapter: adapter({ mediaRecorder: { construct: () => ({}) } }),
    fps: 30
  });

  assert.equal(noRecorder.supported, false);
  assert.ok(!noRecorder.supported);
  assert.equal(noRecorder.reason.code, "MEDIA_RECORDER_UNAVAILABLE");
  assert.equal(noSupportFunction.supported, false);
  assert.ok(!noSupportFunction.supported);
  assert.equal(noSupportFunction.reason.code, "MEDIA_RECORDER_IS_TYPE_SUPPORTED_UNAVAILABLE");
});

test("reports MIME support and captureStream probe failures without throwing", () => {
  const noneSupported = probeMathSceneWebmCapability({
    adapter: adapter({
      mediaRecorder: {
        construct: () => ({}),
        isTypeSupported: () => false
      }
    }),
    fps: 30
  });
  const supportProbeThrows = probeMathSceneWebmCapability({
    adapter: adapter({
      mediaRecorder: {
        construct: () => ({}),
        isTypeSupported: () => {
          throw new Error("privacy mode");
        }
      }
    }),
    fps: 30
  });
  const captureThrows = probeMathSceneWebmCapability({
    adapter: adapter({
      canvas: {
        captureStream: () => {
          throw new Error("capture denied");
        }
      }
    }),
    fps: 30
  });

  assert.equal(noneSupported.supported, false);
  assert.ok(!noneSupported.supported);
  assert.equal(noneSupported.reason.code, "MEDIA_RECORDER_MIME_UNSUPPORTED");
  assert.equal(supportProbeThrows.supported, false);
  assert.ok(!supportProbeThrows.supported);
  assert.equal(supportProbeThrows.reason.code, "MEDIA_RECORDER_IS_TYPE_SUPPORTED_UNAVAILABLE");
  assert.equal(captureThrows.supported, false);
  assert.ok(!captureThrows.supported);
  assert.equal(captureThrows.reason.code, "CANVAS_CAPTURE_STREAM_UNAVAILABLE");
});

test("returns unsupported when every supported MIME constructor fails", () => {
  let releases = 0;
  const result = probeMathSceneWebmCapability({
    adapter: adapter({
      mediaRecorder: {
        construct: () => {
          throw new Error("constructor denied");
        },
        isTypeSupported: () => true
      },
      releaseProbe: () => {
        releases += 1;
      }
    }),
    fps: 30
  });

  assert.equal(result.supported, false);
  assert.ok(!result.supported);
  assert.equal(result.reason.code, "MEDIA_RECORDER_CONSTRUCTOR_FAILED");
  assert.deepEqual(result.constructorFailures, [...MATH_SCENE_WEBM_MIME_PREFERENCE]);
  assert.equal(releases, MATH_SCENE_WEBM_MIME_PREFERENCE.length);
  assert.doesNotMatch(result.reason.message, /constructor denied/);
});
