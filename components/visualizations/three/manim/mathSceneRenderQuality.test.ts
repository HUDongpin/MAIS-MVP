import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

type MathSceneRenderQualityPreset = "preview" | "interactive" | "hd" | "production" | "fourk";

type MathSceneRenderQualityPlan = {
  antialias: boolean;
  aspectRatio: number;
  backgroundAlpha: number;
  backgroundColor: string;
  captureFps: number;
  captureHeight: number;
  captureWidth: number;
  devicePixelRatio: number;
  frameRate: number;
  height: number;
  pixelCount: number;
  preset: MathSceneRenderQualityPreset;
  qualityVersion: "mais-manim-render-quality/v1";
  rendererMode: "interactive" | "capture";
  samplesPerPixel: number;
  sourceContract: string;
  summary: string;
  transparentBackground: boolean;
  width: number;
};

type MathSceneRenderQualityModule = {
  MANIM_RENDER_QUALITY_SOURCE_CONTRACT: string;
  buildMathSceneRenderQualityPlan: (input?: {
    backgroundAlpha?: number;
    backgroundColor?: string;
    devicePixelRatio?: number;
    preset?: MathSceneRenderQualityPreset;
    rendererMode?: "interactive" | "capture";
    transparentBackground?: boolean;
    viewportHeight?: number;
    viewportWidth?: number;
  }) => MathSceneRenderQualityPlan;
  renderQualityDataAttributes: (plan: MathSceneRenderQualityPlan) => Record<string, string>;
  serializeMathSceneRenderQualityPlan: (plan: MathSceneRenderQualityPlan) => string;
};

const modulePath = "components/visualizations/three/manim/mathSceneRenderQuality.ts";
const expectedSourceContract =
  "Manim config quality: pixel_width, pixel_height, frame_rate, transparent background, and renderer sampling are normalized before capture";

async function importQualityModule() {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should expose a pure render quality module");
  return await import("./mathSceneRenderQuality") as MathSceneRenderQualityModule;
}

test("normalizes Manim-style quality presets for browser and capture rendering", async () => {
  const { MANIM_RENDER_QUALITY_SOURCE_CONTRACT, buildMathSceneRenderQualityPlan } = await importQualityModule();

  const production = buildMathSceneRenderQualityPlan({ preset: "production", rendererMode: "capture" });
  assert.equal(MANIM_RENDER_QUALITY_SOURCE_CONTRACT, expectedSourceContract);
  assert.equal(production.sourceContract, MANIM_RENDER_QUALITY_SOURCE_CONTRACT);
  assert.equal(production.qualityVersion, "mais-manim-render-quality/v1");
  assert.equal(production.preset, "production");
  assert.equal(production.rendererMode, "capture");
  assert.equal(production.width, 1920);
  assert.equal(production.height, 1080);
  assert.equal(production.captureWidth, 1920);
  assert.equal(production.captureHeight, 1080);
  assert.equal(production.frameRate, 60);
  assert.equal(production.captureFps, 60);
  assert.equal(production.devicePixelRatio, 2);
  assert.equal(production.samplesPerPixel, 4);
  assert.equal(production.antialias, true);
  assert.equal(production.transparentBackground, false);
  assert.equal(production.backgroundAlpha, 1);
  assert.equal(production.backgroundColor, "#020617");
  assert.equal(production.aspectRatio, 1.777778);
  assert.equal(production.pixelCount, 2073600);
  assert.equal(
    production.summary,
    "render-quality:production:1920x1080@60fps:dpr=2.000:samples=4:mode=capture:transparent=false"
  );

  const fourk = buildMathSceneRenderQualityPlan({ preset: "fourk" });
  assert.equal(fourk.width, 3840);
  assert.equal(fourk.height, 2160);
  assert.equal(fourk.captureFps, 60);
  assert.equal(fourk.pixelCount, 8294400);
});

test("uses the viewport for interactive rendering while keeping capture dimensions stable", async () => {
  const { buildMathSceneRenderQualityPlan } = await importQualityModule();
  const plan = buildMathSceneRenderQualityPlan({
    devicePixelRatio: 1.33333,
    preset: "hd",
    rendererMode: "interactive",
    viewportHeight: 512,
    viewportWidth: 910
  });

  assert.equal(plan.width, 910);
  assert.equal(plan.height, 512);
  assert.equal(plan.captureWidth, 1280);
  assert.equal(plan.captureHeight, 720);
  assert.equal(plan.frameRate, 30);
  assert.equal(plan.captureFps, 30);
  assert.equal(plan.devicePixelRatio, 1.333);
  assert.equal(plan.pixelCount, 465920);
  assert.equal(plan.aspectRatio, 1.777344);
});

test("maps transparent background settings and QA attributes deterministically", async () => {
  const {
    MANIM_RENDER_QUALITY_SOURCE_CONTRACT,
    buildMathSceneRenderQualityPlan,
    renderQualityDataAttributes,
    serializeMathSceneRenderQualityPlan
  } = await importQualityModule();
  const plan = buildMathSceneRenderQualityPlan({
    backgroundAlpha: 0.42,
    backgroundColor: "#111827",
    preset: "interactive",
    transparentBackground: true,
    viewportHeight: 360,
    viewportWidth: 640
  });

  assert.equal(plan.transparentBackground, true);
  assert.equal(plan.backgroundAlpha, 0.42);
  assert.deepEqual(renderQualityDataAttributes(plan), {
    "data-viz-manim-render-quality-alpha": "0.420",
    "data-viz-manim-render-quality-antialias": "true",
    "data-viz-manim-render-quality-background": "#111827",
    "data-viz-manim-render-quality-capture": "1280x720@30",
    "data-viz-manim-render-quality-dpr": "1.000",
    "data-viz-manim-render-quality-pixel-count": "230400",
    "data-viz-manim-render-quality-preset": "interactive",
    "data-viz-manim-render-quality-renderer-mode": "interactive",
    "data-viz-manim-render-quality-samples": "2",
    "data-viz-manim-render-quality-size": "640x360",
    "data-viz-manim-render-quality-source-contract": MANIM_RENDER_QUALITY_SOURCE_CONTRACT,
    "data-viz-manim-render-quality-summary": plan.summary,
    "data-viz-manim-render-quality-transparent": "true"
  });

  const serialized = serializeMathSceneRenderQualityPlan(plan);
  assert.equal(
    serializeMathSceneRenderQualityPlan(JSON.parse(JSON.stringify(plan)) as MathSceneRenderQualityPlan),
    serialized
  );
  assert.doesNotMatch(serialized, /undefined|NaN|Infinity|<\/script/i);
});

test("render quality source stays pure and renderer independent", () => {
  assert.ok(fs.existsSync(modulePath), "render quality planning should live in a pure Manim math module");
  const source = fs.readFileSync(modulePath, "utf8");

  assert.match(source, /MANIM_RENDER_QUALITY_SOURCE_CONTRACT/);
  assert.match(source, /buildMathSceneRenderQualityPlan/);
  assert.match(source, /renderQualityDataAttributes/);
  assert.match(source, /pixel_width/);
  assert.match(source, /frame_rate/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"|MathSceneRuntime|ThreeDLabCanvas|Canvas/);
});
