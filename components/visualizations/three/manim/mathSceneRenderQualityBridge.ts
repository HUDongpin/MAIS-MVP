import type { MathSceneRendererMode, MathSceneRenderQualityPlan, MathSceneRenderQualityPreset } from "./mathSceneRenderQuality";

export const MANIM_RENDER_QUALITY_BRIDGE_SOURCE_CONTRACT =
  "RenderQualityPlan -> R3F/WebGLRenderer parameters: dpr, alpha, antialias, preserveDrawingBuffer, and browser MSAA sampling hint";

export type MathSceneRenderQualityBridgePlan = {
  alpha: boolean;
  antialias: boolean;
  backgroundAlpha: number;
  backgroundColor: string;
  devicePixelRatio: number;
  glParameterSummary: string;
  preserveDrawingBuffer: boolean;
  powerPreference: "default" | "high-performance";
  preset: MathSceneRenderQualityPreset;
  rendererMode: MathSceneRendererMode;
  samplesPerPixel: number;
  samplingPolicy: "browser-msaa-antialias-hint";
  sourceContract: typeof MANIM_RENDER_QUALITY_BRIDGE_SOURCE_CONTRACT;
  summary: string;
  transparentBackground: boolean;
};

function fixed(value: number, digits = 3) {
  return Number.isFinite(value) ? value.toFixed(digits) : "0.000";
}

function stableValue(value: unknown): unknown {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) return value.map((entry) => stableValue(entry) ?? null);
  if (!value || typeof value !== "object") return value;

  const stableObject: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value).sort(([left], [right]) => left.localeCompare(right))) {
    if (entry !== undefined) stableObject[key] = stableValue(entry);
  }

  return stableObject;
}

function stableSerialize(value: unknown) {
  return JSON.stringify(stableValue(value))
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function powerPreferenceFor(plan: MathSceneRenderQualityPlan): MathSceneRenderQualityBridgePlan["powerPreference"] {
  return plan.preset === "preview" && plan.rendererMode === "interactive" ? "default" : "high-performance";
}

function glParameterSummary(plan: Omit<MathSceneRenderQualityBridgePlan, "summary" | "glParameterSummary">) {
  return [
    `gl:alpha=${String(plan.alpha)}`,
    `antialias=${String(plan.antialias)}`,
    `preserveDrawingBuffer=${String(plan.preserveDrawingBuffer)}`,
    `power=${plan.powerPreference}`,
    `samples=${plan.samplesPerPixel}`
  ].join(":");
}

function summary(plan: Omit<MathSceneRenderQualityBridgePlan, "summary">) {
  return [
    `render-quality-bridge:${plan.preset}`,
    plan.rendererMode,
    `dpr=${fixed(plan.devicePixelRatio)}`,
    `alpha=${String(plan.alpha)}`,
    `antialias=${String(plan.antialias)}`,
    `samples=${plan.samplesPerPixel}`
  ].join(":");
}

export function buildMathSceneRenderQualityBridgePlan(plan: MathSceneRenderQualityPlan): MathSceneRenderQualityBridgePlan {
  const basePlan: Omit<MathSceneRenderQualityBridgePlan, "summary" | "glParameterSummary"> = {
    alpha: plan.transparentBackground,
    antialias: plan.antialias,
    backgroundAlpha: plan.backgroundAlpha,
    backgroundColor: plan.backgroundColor,
    devicePixelRatio: plan.devicePixelRatio,
    preserveDrawingBuffer: true,
    powerPreference: powerPreferenceFor(plan),
    preset: plan.preset,
    rendererMode: plan.rendererMode,
    samplesPerPixel: plan.samplesPerPixel,
    samplingPolicy: "browser-msaa-antialias-hint",
    sourceContract: MANIM_RENDER_QUALITY_BRIDGE_SOURCE_CONTRACT,
    transparentBackground: plan.transparentBackground
  };
  const planWithGlSummary = {
    ...basePlan,
    glParameterSummary: glParameterSummary(basePlan)
  };

  return {
    ...planWithGlSummary,
    summary: summary(planWithGlSummary)
  };
}

export function renderQualityBridgeDataAttributes(plan: MathSceneRenderQualityBridgePlan): Record<string, string> {
  return {
    "data-viz-manim-renderer-bridge-alpha": String(plan.alpha),
    "data-viz-manim-renderer-bridge-antialias": String(plan.antialias),
    "data-viz-manim-renderer-bridge-background-alpha": fixed(plan.backgroundAlpha),
    "data-viz-manim-renderer-bridge-background-color": plan.backgroundColor,
    "data-viz-manim-renderer-bridge-dpr": fixed(plan.devicePixelRatio),
    "data-viz-manim-renderer-bridge-gl-summary": plan.glParameterSummary,
    "data-viz-manim-renderer-bridge-preserve-drawing-buffer": String(plan.preserveDrawingBuffer),
    "data-viz-manim-renderer-bridge-power-preference": plan.powerPreference,
    "data-viz-manim-renderer-bridge-renderer-mode": plan.rendererMode,
    "data-viz-manim-renderer-bridge-samples": String(plan.samplesPerPixel),
    "data-viz-manim-renderer-bridge-sampling-policy": plan.samplingPolicy,
    "data-viz-manim-renderer-bridge-source-contract": plan.sourceContract,
    "data-viz-manim-renderer-bridge-summary": plan.summary,
    "data-viz-manim-renderer-bridge-transparent": String(plan.transparentBackground)
  };
}

export function serializeMathSceneRenderQualityBridgePlan(plan: MathSceneRenderQualityBridgePlan) {
  return stableSerialize(plan);
}
