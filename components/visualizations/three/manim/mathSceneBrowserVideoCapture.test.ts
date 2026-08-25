import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  MATH_SCENE_BROWSER_VIDEO_CAPTURE_SOURCE_CONTRACT,
  buildMathSceneBrowserVideoCapturePlan,
  plainTextMathForVideo
} from "./mathSceneBrowserVideoCapture";

const modulePath = "components/visualizations/three/manim/mathSceneBrowserVideoCapture.ts";

test("plans a real WebM encoder with stable dimensions, rate, bitrate, and file name", () => {
  const plan = buildMathSceneBrowserVideoCapturePlan({
    durationSeconds: 11.8,
    familyId: "three-trig-unit-wave",
    fps: 30,
    height: 720,
    sceneId: "mais-manim-trig-unit-wave",
    width: 1280
  });

  assert.equal(plan.captureVersion, "mais-manim-browser-video/v1");
  assert.equal(plan.sourceContract, MATH_SCENE_BROWSER_VIDEO_CAPTURE_SOURCE_CONTRACT);
  assert.equal(plan.width, 1280);
  assert.equal(plan.height, 720);
  assert.equal(plan.fps, 30);
  assert.equal(plan.durationSeconds, 11.8);
  assert.equal(plan.frameCount, 355);
  assert.equal(plan.videoBitsPerSecond, 8_000_000);
  assert.equal(plan.fileName, "mais-manim-trig-unit-wave.webm");
  assert.deepEqual(plan.mimeTypeCandidates, [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm"
  ]);
});

test("caps pathological video requests while retaining an exact 16:9 output", () => {
  const plan = buildMathSceneBrowserVideoCapturePlan({
    durationSeconds: Number.POSITIVE_INFINITY,
    familyId: "three-trig-unit-wave",
    fps: 240,
    height: 9999,
    sceneId: "../../unsafe scene",
    width: 9999
  });

  assert.equal(plan.width, 3840);
  assert.equal(plan.height, 2160);
  assert.equal(plan.fps, 60);
  assert.equal(plan.durationSeconds, 0);
  assert.equal(plan.videoBitsPerSecond, 40_000_000);
  assert.equal(plan.fileName, "unsafe-scene.webm");
});

test("prepares compact readable formula text for burned-in video overlays", () => {
  assert.equal(
    plainTextMathForVideo("P(t)=(\\cos t,\\sin t);\\quad Q(t)=(t,\\sin t);\\quad y=\\sin t"),
    "P(t)=(cos t, sin t);   Q(t)=(t, sin t);   y=sin t"
  );
  assert.equal(plainTextMathForVideo("P_y(t)=Q_y(t)=\\sin t"), "P_y(t)=Q_y(t)=sin t");
});

test("contains a browser encoder path instead of another plan-only Video button", () => {
  assert.ok(fs.existsSync(modulePath));
  const source = fs.readFileSync(modulePath, "utf8");

  assert.match(source, /MediaRecorder/);
  assert.match(source, /captureStream/);
  assert.match(source, /data-viz-manim-projected-label/);
  assert.match(source, /data-viz-manim-caption/);
  assert.match(source, /new Blob/);
  assert.doesNotMatch(source, /anchor\.click\(\)/);
  assert.match(source, /frameIntervalMilliseconds/);
  assert.match(source, /now - lastDrawAt >= frameIntervalMilliseconds/);
  assert.match(source, /recorderStopTimeoutMilliseconds/);
  assert.match(source, /deterministicFrameRenderer/);
  assert.match(source, /elapsedSeconds/);
  assert.match(source, /stagingCanvas/);
  assert.match(source, /publishStagedFrame/);

  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  assert.match(canvasSource, /data-viz-manim-video-download/);
  assert.match(canvasSource, /download=\{manimVideoDownload\.fileName\}/);
  assert.match(canvasSource, /manimCaptureQualityPreset/);
  assert.match(canvasSource, /const manimCaptureRenderQualityPlan = useMemo/);
  assert.match(canvasSource, /renderQuality: manimCaptureRenderQualityPlan/);
  assert.doesNotMatch(canvasSource, /setManimRenderQualityPreset\(effectiveCapturePreset\)/);
  assert.match(canvasSource, /drawTrigUnitWaveVideoFrame/);
});
