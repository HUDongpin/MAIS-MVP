export const MANIM_RENDER_QUALITY_SOURCE_CONTRACT =
  "Manim config quality: pixel_width, pixel_height, frame_rate, transparent background, and renderer sampling are normalized before capture";

export type MathSceneRenderQualityPreset = "preview" | "interactive" | "hd" | "production" | "fourk";

export type MathSceneRendererMode = "interactive" | "capture";

export type MathSceneRenderQualityPlan = {
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
  rendererMode: MathSceneRendererMode;
  samplesPerPixel: number;
  sourceContract: typeof MANIM_RENDER_QUALITY_SOURCE_CONTRACT;
  summary: string;
  transparentBackground: boolean;
  width: number;
};

export type MathSceneRenderQualityInput = {
  backgroundAlpha?: number;
  backgroundColor?: string;
  devicePixelRatio?: number;
  preset?: MathSceneRenderQualityPreset;
  rendererMode?: MathSceneRendererMode;
  transparentBackground?: boolean;
  viewportHeight?: number;
  viewportWidth?: number;
};

type RenderQualityPresetConfig = {
  captureFps: number;
  captureHeight: number;
  captureWidth: number;
  defaultDevicePixelRatio: number;
  samplesPerPixel: number;
};

const QUALITY_PRESETS: Record<MathSceneRenderQualityPreset, RenderQualityPresetConfig> = {
  fourk: {
    captureFps: 60,
    captureHeight: 2160,
    captureWidth: 3840,
    defaultDevicePixelRatio: 2,
    samplesPerPixel: 4
  },
  hd: {
    captureFps: 30,
    captureHeight: 720,
    captureWidth: 1280,
    defaultDevicePixelRatio: 1.5,
    samplesPerPixel: 2
  },
  interactive: {
    captureFps: 30,
    captureHeight: 720,
    captureWidth: 1280,
    defaultDevicePixelRatio: 1,
    samplesPerPixel: 2
  },
  preview: {
    captureFps: 15,
    captureHeight: 480,
    captureWidth: 854,
    defaultDevicePixelRatio: 1,
    samplesPerPixel: 1
  },
  production: {
    captureFps: 60,
    captureHeight: 1080,
    captureWidth: 1920,
    defaultDevicePixelRatio: 2,
    samplesPerPixel: 4
  }
};

function finiteNumber(value: number | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stablePositiveInteger(value: number | undefined, fallback: number) {
  return Math.max(1, Math.round(finiteNumber(value, fallback)));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function stableNumber(value: number, precision = 6) {
  return Number(finiteNumber(value, 0).toFixed(precision));
}

function stableDevicePixelRatio(value: number | undefined, fallback: number) {
  return stableNumber(clamp(finiteNumber(value, fallback), 0.5, 4), 3);
}

function stableColor(value: string | undefined) {
  const normalized = (value ?? "#020617").trim();
  return /^#[0-9a-f]{6}$/i.test(normalized) ? normalized : "#020617";
}

function stableAlpha(value: number | undefined, fallback: number) {
  return stableNumber(clamp(finiteNumber(value, fallback), 0, 1), 3);
}

function dimensionPairFor(input: MathSceneRenderQualityInput, preset: RenderQualityPresetConfig, rendererMode: MathSceneRendererMode) {
  if (rendererMode === "capture") {
    return {
      height: preset.captureHeight,
      width: preset.captureWidth
    };
  }

  return {
    height: stablePositiveInteger(input.viewportHeight, preset.captureHeight),
    width: stablePositiveInteger(input.viewportWidth, preset.captureWidth)
  };
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

function buildSummary(plan: Omit<MathSceneRenderQualityPlan, "summary">) {
  return [
    `render-quality:${plan.preset}`,
    `${plan.width}x${plan.height}@${plan.frameRate}fps`,
    `dpr=${plan.devicePixelRatio.toFixed(3)}`,
    `samples=${plan.samplesPerPixel}`,
    `mode=${plan.rendererMode}`,
    `transparent=${String(plan.transparentBackground)}`
  ].join(":");
}

export function buildMathSceneRenderQualityPlan(input: MathSceneRenderQualityInput = {}): MathSceneRenderQualityPlan {
  const presetName = input.preset ?? "interactive";
  const preset = QUALITY_PRESETS[presetName];
  const rendererMode = input.rendererMode ?? "interactive";
  const dimensions = dimensionPairFor(input, preset, rendererMode);
  const transparentBackground = input.transparentBackground === true;
  const backgroundAlpha = stableAlpha(input.backgroundAlpha, transparentBackground ? 0 : 1);
  const basePlan: Omit<MathSceneRenderQualityPlan, "summary"> = {
    antialias: true,
    aspectRatio: stableNumber(dimensions.width / dimensions.height),
    backgroundAlpha,
    backgroundColor: stableColor(input.backgroundColor),
    captureFps: preset.captureFps,
    captureHeight: preset.captureHeight,
    captureWidth: preset.captureWidth,
    devicePixelRatio: stableDevicePixelRatio(input.devicePixelRatio, preset.defaultDevicePixelRatio),
    frameRate: rendererMode === "capture" ? preset.captureFps : Math.min(60, preset.captureFps),
    height: dimensions.height,
    pixelCount: dimensions.width * dimensions.height,
    preset: presetName,
    qualityVersion: "mais-manim-render-quality/v1",
    rendererMode,
    samplesPerPixel: preset.samplesPerPixel,
    sourceContract: MANIM_RENDER_QUALITY_SOURCE_CONTRACT,
    transparentBackground,
    width: dimensions.width
  };

  return {
    ...basePlan,
    summary: buildSummary(basePlan)
  };
}

export function renderQualityDataAttributes(plan: MathSceneRenderQualityPlan): Record<string, string> {
  return {
    "data-viz-manim-render-quality-alpha": plan.backgroundAlpha.toFixed(3),
    "data-viz-manim-render-quality-antialias": String(plan.antialias),
    "data-viz-manim-render-quality-background": plan.backgroundColor,
    "data-viz-manim-render-quality-capture": `${plan.captureWidth}x${plan.captureHeight}@${plan.captureFps}`,
    "data-viz-manim-render-quality-dpr": plan.devicePixelRatio.toFixed(3),
    "data-viz-manim-render-quality-pixel-count": String(plan.pixelCount),
    "data-viz-manim-render-quality-preset": plan.preset,
    "data-viz-manim-render-quality-renderer-mode": plan.rendererMode,
    "data-viz-manim-render-quality-samples": String(plan.samplesPerPixel),
    "data-viz-manim-render-quality-size": `${plan.width}x${plan.height}`,
    "data-viz-manim-render-quality-source-contract": plan.sourceContract,
    "data-viz-manim-render-quality-summary": plan.summary,
    "data-viz-manim-render-quality-transparent": String(plan.transparentBackground)
  };
}

export function serializeMathSceneRenderQualityPlan(plan: MathSceneRenderQualityPlan) {
  return stableSerialize(plan);
}
