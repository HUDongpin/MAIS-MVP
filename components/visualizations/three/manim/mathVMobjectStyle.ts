export type VMobjectBaseNormal = [number, number, number];
export type VMobjectStrokeZoomBehavior = "screen-space" | "world-space";

export type VMobjectStyle = {
  antiAliasWidth: number;
  baseNormal: VMobjectBaseNormal;
  fillOpacity: number;
  fillRole: string;
  jointAngleDegrees: number;
  strokeZoomBehavior: VMobjectStrokeZoomBehavior;
  strokeOpacity: number;
  strokeRole: string;
  strokeWidth: number;
};

export type VMobjectStyleInput = Partial<VMobjectStyle>;

export type DrawBorderThenFillPhase = "draw-border" | "fill";

export type DrawBorderThenFillFrame = {
  drawRange: [number, number];
  phase: DrawBorderThenFillPhase;
  progress: number;
  style: VMobjectStyle;
};

const defaultVMobjectStyle: VMobjectStyle = {
  antiAliasWidth: 1,
  baseNormal: [0, 0, 1],
  fillOpacity: 0,
  fillRole: "reference",
  jointAngleDegrees: 0,
  strokeZoomBehavior: "screen-space",
  strokeOpacity: 1,
  strokeRole: "function",
  strokeWidth: 5
};

function finite(value: number | undefined, fallback: number) {
  return Number.isFinite(value) ? value as number : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function clamp01(value: number) {
  return clamp(finite(value, 0), 0, 1);
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function normalizeBaseNormal(value: VMobjectStyleInput["baseNormal"]): VMobjectBaseNormal {
  const [x, y, z] = value ?? defaultVMobjectStyle.baseNormal;
  const normal: VMobjectBaseNormal = [
    finite(x, defaultVMobjectStyle.baseNormal[0]),
    finite(y, defaultVMobjectStyle.baseNormal[1]),
    finite(z, defaultVMobjectStyle.baseNormal[2])
  ];
  const length = Math.hypot(normal[0], normal[1], normal[2]);

  if (length <= 1e-9) return [...defaultVMobjectStyle.baseNormal];

  return normal.map((component) => Number((component / length).toFixed(6))) as VMobjectBaseNormal;
}

function resolveStrokeZoomBehavior(value: VMobjectStyleInput["strokeZoomBehavior"]): VMobjectStrokeZoomBehavior {
  return value === "world-space" ? "world-space" : "screen-space";
}

export function buildVMobjectStyle(input: VMobjectStyleInput = {}): VMobjectStyle {
  return {
    antiAliasWidth: Math.max(0, finite(input.antiAliasWidth, defaultVMobjectStyle.antiAliasWidth)),
    baseNormal: normalizeBaseNormal(input.baseNormal),
    fillOpacity: clamp01(input.fillOpacity ?? defaultVMobjectStyle.fillOpacity),
    fillRole: input.fillRole ?? defaultVMobjectStyle.fillRole,
    jointAngleDegrees: finite(input.jointAngleDegrees, defaultVMobjectStyle.jointAngleDegrees),
    strokeZoomBehavior: resolveStrokeZoomBehavior(input.strokeZoomBehavior),
    strokeOpacity: clamp01(input.strokeOpacity ?? defaultVMobjectStyle.strokeOpacity),
    strokeRole: input.strokeRole ?? defaultVMobjectStyle.strokeRole,
    strokeWidth: Math.max(0, finite(input.strokeWidth, defaultVMobjectStyle.strokeWidth))
  };
}

export function interpolateVMobjectStyle(source: VMobjectStyle, target: VMobjectStyle, progress: number): VMobjectStyle {
  const alpha = clamp01(progress);

  return {
    antiAliasWidth: lerp(source.antiAliasWidth, target.antiAliasWidth, alpha),
    baseNormal: normalizeBaseNormal([
      lerp(source.baseNormal[0], target.baseNormal[0], alpha),
      lerp(source.baseNormal[1], target.baseNormal[1], alpha),
      lerp(source.baseNormal[2], target.baseNormal[2], alpha)
    ]),
    fillOpacity: lerp(source.fillOpacity, target.fillOpacity, alpha),
    fillRole: alpha >= 1 ? target.fillRole : source.fillRole,
    jointAngleDegrees: lerp(source.jointAngleDegrees, target.jointAngleDegrees, alpha),
    strokeZoomBehavior: alpha >= 1 ? target.strokeZoomBehavior : source.strokeZoomBehavior,
    strokeOpacity: lerp(source.strokeOpacity, target.strokeOpacity, alpha),
    strokeRole: alpha >= 1 ? target.strokeRole : source.strokeRole,
    strokeWidth: lerp(source.strokeWidth, target.strokeWidth, alpha)
  };
}

export function buildDrawBorderThenFillFrame(style: VMobjectStyle, progress: number): DrawBorderThenFillFrame {
  const alpha = clamp01(progress);

  if (alpha < 0.5) {
    return {
      drawRange: [0, alpha / 0.5],
      phase: "draw-border",
      progress: alpha,
      style: {
        ...style,
        fillOpacity: 0
      }
    };
  }

  const fillProgress = (alpha - 0.5) / 0.5;

  return {
    drawRange: [0, 1],
    phase: "fill",
    progress: alpha,
    style: {
      ...style,
      fillOpacity: style.fillOpacity * fillProgress
    }
  };
}

export function summarizeVMobjectStyle(style: VMobjectStyle) {
  return [
    `stroke=${style.strokeRole}:${style.strokeWidth.toFixed(2)}@${style.strokeOpacity.toFixed(2)}`,
    `fill=${style.fillRole}@${style.fillOpacity.toFixed(2)}`,
    `aa=${style.antiAliasWidth.toFixed(2)}`
  ].join(";");
}
