import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import type { MathSceneRenderQualityPlan } from "./mathSceneRenderQuality";

type RenderQualityBridgeModule = {
  MANIM_RENDER_QUALITY_BRIDGE_SOURCE_CONTRACT: string;
  buildMathSceneRenderQualityBridgePlan: (plan: MathSceneRenderQualityPlan) => {
    alpha: boolean;
    antialias: boolean;
    backgroundAlpha: number;
    backgroundColor: string;
    devicePixelRatio: number;
    glParameterSummary: string;
    preserveDrawingBuffer: boolean;
    powerPreference: "default" | "high-performance";
    preset: MathSceneRenderQualityPlan["preset"];
    rendererMode: MathSceneRenderQualityPlan["rendererMode"];
    samplesPerPixel: number;
    samplingPolicy: string;
    sourceContract: string;
    summary: string;
    transparentBackground: boolean;
  };
  renderQualityBridgeDataAttributes: (plan: ReturnType<RenderQualityBridgeModule["buildMathSceneRenderQualityBridgePlan"]>) => Record<string, string>;
  serializeMathSceneRenderQualityBridgePlan: (plan: ReturnType<RenderQualityBridgeModule["buildMathSceneRenderQualityBridgePlan"]>) => string;
};

const modulePath = "components/visualizations/three/manim/mathSceneRenderQualityBridge.ts";

async function importBridgeModule() {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should expose a pure render-quality-to-R3F bridge module");
  return await import("./mathSceneRenderQualityBridge") as RenderQualityBridgeModule;
}

test("normalizes a Manim render-quality plan into R3F/WebGL renderer options", async () => {
  const { buildMathSceneRenderQualityPlan } = await import("./mathSceneRenderQuality");
  const {
    MANIM_RENDER_QUALITY_BRIDGE_SOURCE_CONTRACT,
    buildMathSceneRenderQualityBridgePlan,
    renderQualityBridgeDataAttributes,
    serializeMathSceneRenderQualityBridgePlan
  } = await importBridgeModule();
  const quality = buildMathSceneRenderQualityPlan({
    backgroundAlpha: 0.25,
    backgroundColor: "#111827",
    preset: "production",
    rendererMode: "capture",
    transparentBackground: true
  });
  const bridge = buildMathSceneRenderQualityBridgePlan(quality);

  assert.match(MANIM_RENDER_QUALITY_BRIDGE_SOURCE_CONTRACT, /RenderQualityPlan/);
  assert.equal(bridge.sourceContract, MANIM_RENDER_QUALITY_BRIDGE_SOURCE_CONTRACT);
  assert.equal(bridge.alpha, true);
  assert.equal(bridge.antialias, true);
  assert.equal(bridge.backgroundAlpha, 0.25);
  assert.equal(bridge.backgroundColor, "#111827");
  assert.equal(bridge.devicePixelRatio, 2);
  assert.equal(bridge.preserveDrawingBuffer, true);
  assert.equal(bridge.powerPreference, "high-performance");
  assert.equal(bridge.rendererMode, "capture");
  assert.equal(bridge.samplesPerPixel, 4);
  assert.equal(bridge.samplingPolicy, "browser-msaa-antialias-hint");
  assert.equal(bridge.transparentBackground, true);
  assert.equal(
    bridge.glParameterSummary,
    "gl:alpha=true:antialias=true:preserveDrawingBuffer=true:power=high-performance:samples=4"
  );
  assert.equal(
    bridge.summary,
    "render-quality-bridge:production:capture:dpr=2.000:alpha=true:antialias=true:samples=4"
  );

  const attributes = renderQualityBridgeDataAttributes(bridge);
  assert.equal(attributes["data-viz-manim-renderer-bridge-alpha"], "true");
  assert.equal(attributes["data-viz-manim-renderer-bridge-antialias"], "true");
  assert.equal(attributes["data-viz-manim-renderer-bridge-background-alpha"], "0.250");
  assert.equal(attributes["data-viz-manim-renderer-bridge-background-color"], "#111827");
  assert.equal(attributes["data-viz-manim-renderer-bridge-dpr"], "2.000");
  assert.equal(attributes["data-viz-manim-renderer-bridge-gl-summary"], bridge.glParameterSummary);
  assert.equal(attributes["data-viz-manim-renderer-bridge-preserve-drawing-buffer"], "true");
  assert.equal(attributes["data-viz-manim-renderer-bridge-power-preference"], "high-performance");
  assert.equal(attributes["data-viz-manim-renderer-bridge-renderer-mode"], "capture");
  assert.equal(attributes["data-viz-manim-renderer-bridge-samples"], "4");
  assert.equal(attributes["data-viz-manim-renderer-bridge-sampling-policy"], "browser-msaa-antialias-hint");
  assert.equal(attributes["data-viz-manim-renderer-bridge-source-contract"], MANIM_RENDER_QUALITY_BRIDGE_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-renderer-bridge-summary"], bridge.summary);
  assert.equal(attributes["data-viz-manim-renderer-bridge-transparent"], "true");

  assert.doesNotMatch(serializeMathSceneRenderQualityBridgePlan(bridge), /undefined|NaN|Infinity|<\/script/i);
});

test("render-quality bridge stays pure and renderer independent", () => {
  assert.ok(fs.existsSync(modulePath), "render-quality bridge planning should live in a pure Manim math module");
  const source = fs.readFileSync(modulePath, "utf8");

  assert.match(source, /MANIM_RENDER_QUALITY_BRIDGE_SOURCE_CONTRACT/);
  assert.match(source, /buildMathSceneRenderQualityBridgePlan/);
  assert.match(source, /renderQualityBridgeDataAttributes/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"|MathSceneRuntime|ThreeDLabCanvas|Canvas/);
});
