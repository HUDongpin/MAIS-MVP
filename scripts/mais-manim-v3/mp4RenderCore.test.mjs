import assert from "node:assert/strict";
import test from "node:test";

import {
  buildExactFrameTimes,
  buildFfmpegMp4Args,
  buildFfprobeArgs,
  buildMp4CaptureRunLayout,
  captureHarnessUrl,
  expectedPngFrameName,
  isLoopbackHostname,
  normalizeMp4RenderTask,
  parseFfprobeMp4Evidence,
  preflightMp4RenderWork,
  validateCompletePngFrameSet
} from "./mp4RenderCore.mjs";

const validTask = {
  audioPath: null,
  durationSeconds: 2,
  fps: 30,
  frameCount: 60,
  height: 720,
  outputBaseName: "unit-circle-sine",
  width: 1280
};

test("normalizes an exact bounded MP4 task and rejects ambiguous frame math", () => {
  assert.deepEqual(normalizeMp4RenderTask(validTask), validTask);
  assert.throws(
    () => normalizeMp4RenderTask({ ...validTask, frameCount: 59 }),
    /frameCount must equal durationSeconds \* fps/
  );
  for (const bad of [
    { ...validTask, width: 1279 },
    { ...validTask, height: 0 },
    { ...validTask, fps: 121 },
    { ...validTask, durationSeconds: Number.NaN },
    { ...validTask, outputBaseName: "../escape" },
    { ...validTask, audioPath: "https://example.test/audio.wav" }
  ]) {
    assert.throws(() => normalizeMp4RenderTask(bad));
  }
});

test("preflights combined pixel work and conservative PNG disk pressure", () => {
  assert.deepEqual(preflightMp4RenderWork({
    frameCount: 60,
    height: 720,
    width: 1280
  }), {
    estimatedFrameDiskBytes: 221_184_000,
    ok: true,
    pixelWork: 55_296_000
  });
  assert.throws(() => preflightMp4RenderWork({
    frameCount: 20_000,
    height: 2_160,
    width: 3_840
  }), /MP4_PIXEL_WORK_LIMIT_EXCEEDED/);
  assert.throws(() => preflightMp4RenderWork({
    frameCount: 10_000,
    height: 1_080,
    width: 1_920
  }), /MP4_FRAME_DISK_ESTIMATE_LIMIT_EXCEEDED/);
  assert.throws(() => normalizeMp4RenderTask({
    ...validTask,
    durationSeconds: 10_000 / 30,
    frameCount: 10_000,
    height: 1_080,
    width: 1_920
  }), /MP4_FRAME_DISK_ESTIMATE_LIMIT_EXCEEDED/);
});

test("builds a deterministic t=0 frame schedule without an extra terminal frame", () => {
  const times = buildExactFrameTimes({ fps: 4, frameCount: 8 });
  assert.deepEqual(times, [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75]);
  assert.equal(times.length, 8);
});

test("requires the exact numbered PNG set", () => {
  assert.equal(expectedPngFrameName(0), "frame-000000.png");
  assert.equal(expectedPngFrameName(12), "frame-000012.png");
  assert.deepEqual(
    validateCompletePngFrameSet(
      ["frame-000000.png", "frame-000001.png", "notes.txt"],
      2
    ),
    { ok: true, expectedFrameCount: 2 }
  );
  assert.deepEqual(
    validateCompletePngFrameSet(["frame-000000.png", "frame-000002.png"], 3),
    {
      ok: false,
      errorCode: "MP4_FRAME_SET_INCOMPLETE",
      missingFrameNames: ["frame-000001.png"]
    }
  );
});

test("builds H.264 yuv420p faststart args and adds AAC only for a local audio file", () => {
  const videoOnly = buildFfmpegMp4Args({
    audioPath: null,
    fps: 30,
    framePattern: "/run/frames/frame-%06d.png",
    outputPath: "/out/scene.mp4"
  });
  assert.deepEqual(videoOnly, [
    "-hide_banner", "-loglevel", "error", "-nostdin", "-y",
    "-framerate", "30", "-start_number", "0",
    "-i", "/run/frames/frame-%06d.png",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
    "-an", "/out/scene.mp4"
  ]);

  const withAudio = buildFfmpegMp4Args({
    audioPath: "/run/audio/narration.wav",
    fps: 24,
    framePattern: "/run/frames/frame-%06d.png",
    outputPath: "/out/scene.mp4"
  });
  assert.deepEqual(withAudio, [
    "-hide_banner", "-loglevel", "error", "-nostdin", "-y",
    "-framerate", "24", "-start_number", "0",
    "-i", "/run/frames/frame-%06d.png",
    "-i", "/run/audio/narration.wav",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
    "-c:a", "aac", "-b:a", "192k", "-af", "apad", "-shortest",
    "/out/scene.mp4"
  ]);
  assert.deepEqual(buildFfprobeArgs("/out/scene.mp4"), [
    "-v", "error", "-show_streams", "-show_format", "-count_frames", "-of", "json", "/out/scene.mp4"
  ]);
});

test("ffprobe evidence must prove exact H.264 dimensions, pixel format, duration and optional AAC", () => {
  const probe = JSON.stringify({
    format: { duration: "2.000000", format_name: "mov,mp4,m4a,3gp,3g2,mj2" },
    streams: [
      {
        codec_name: "h264",
        codec_type: "video",
        height: 720,
        nb_read_frames: "60",
        pix_fmt: "yuv420p",
        width: 1280
      },
      { codec_name: "aac", codec_type: "audio" }
    ]
  });
  assert.deepEqual(parseFfprobeMp4Evidence(probe, { ...validTask, audioPath: "/tmp/narration.wav" }), {
    audioCodec: "aac",
    audioIncluded: true,
    durationSeconds: 2,
    formatName: "mov,mp4,m4a,3gp,3g2,mj2",
    frameCount: 60,
    height: 720,
    pixelFormat: "yuv420p",
    videoCodec: "h264",
    width: 1280
  });
  assert.throws(
    () => parseFfprobeMp4Evidence(probe, { ...validTask, width: 1920, audioPath: "/tmp/narration.wav" }),
    /MP4_PROBE_DIMENSIONS_MISMATCH/
  );
  assert.throws(
    () => parseFfprobeMp4Evidence(probe, { ...validTask, frameCount: 61, durationSeconds: 61 / 30, audioPath: "/tmp/narration.wav" }),
    /MP4_PROBE_FRAME_COUNT_MISMATCH/
  );
  const noAudio = JSON.stringify({
    format: { duration: "2.050000", format_name: "mov,mp4,m4a,3gp,3g2,mj2" },
    streams: [{
      codec_name: "h264", codec_type: "video", height: 720,
      nb_read_frames: "60", pix_fmt: "yuv420p", width: 1280
    }]
  });
  assert.throws(
    () => parseFfprobeMp4Evidence(noAudio, validTask),
    /MP4_PROBE_DURATION_MISMATCH/
  );
});

test("capture layout stays under repo .tmp and the harness URL keeps the token out of the query", () => {
  const layout = buildMp4CaptureRunLayout("/repo", "run-123");
  assert.deepEqual(layout, {
    framesDir: "/repo/.tmp/mais-manim-v3-capture/run-123/frames",
    nextDistDir: "/repo/.tmp/mais-manim-v3-capture/run-123/next-dist",
    runRoot: "/repo/.tmp/mais-manim-v3-capture/run-123"
  });
  assert.throws(() => buildMp4CaptureRunLayout("/repo", "../escape"));
  assert.equal(isLoopbackHostname("127.0.0.1"), true);
  assert.equal(isLoopbackHostname("localhost"), true);
  assert.equal(isLoopbackHostname("0.0.0.0"), false);
  assert.equal(isLoopbackHostname("example.test"), false);
  assert.equal(
    captureHarnessUrl({ hostname: "127.0.0.1", port: 4312 }),
    "http://127.0.0.1:4312/internal/mais-manim-capture"
  );
  assert.throws(() => captureHarnessUrl({ hostname: "0.0.0.0", port: 4312 }));
});
