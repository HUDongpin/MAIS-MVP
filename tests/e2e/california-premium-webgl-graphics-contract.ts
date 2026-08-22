import { createHash } from "node:crypto";
import type { ElementHandle, Page } from "@playwright/test";
import sharp from "sharp";
import { visualizationLabCatalog, type FeaturedLabDefinition } from "../../data/visualizationLabs";
import { buildThreeDStateSummary } from "../../components/visualizations/three/threeDSceneMath";
import { threeDCanvasCameraContract } from "../../components/visualizations/three/threeDCanvasCameraContract";
import { isLivePremiumThreeDLab } from "../../components/visualizations/three/premiumThreeDLiveContract";
import { materialPropsForMobject } from "../../components/visualizations/three/manim/mathMobjectMaterialUniforms";
import { buildMathSceneSpecForThreeDFamily, isMaisManimFamily } from "../../components/visualizations/three/manim/mathSceneRegistry";
import {
  buildMathSceneRenderQualityPlan,
  MANIM_DEFAULT_BACKGROUND_COLOR
} from "../../components/visualizations/three/manim/mathSceneRenderQuality";
import { buildMathSceneRenderQualityBridgePlan } from "../../components/visualizations/three/manim/mathSceneRenderQualityBridge";
import { buildMathSceneRuntimeState } from "../../components/visualizations/three/manim/mathSceneRuntimeState";
import { stepMathSceneFrame } from "../../components/visualizations/three/manim/mathSceneFrameStepper";
import { projectWorldPointThroughCameraFrame } from "../../components/visualizations/three/manim/mathCameraFrame";
import type { MathObjectSpec, MathSceneSpec, Vec3 } from "../../components/visualizations/three/manim/mathSceneTypes";
import {
  MATH_SCENE_VISUAL_PALETTE_SOURCE_CONTRACT,
  mathSceneColorForRole,
  mathSceneVisualPalette
} from "../../components/visualizations/three/manim/mathSceneVisualPalette";
import { vmobjectLineProps } from "../../components/visualizations/three/manim/mathVMobjectRenderStyle";
import { sampleSmoothVMobjectPathFromAnchors } from "../../components/visualizations/three/manim/mathVMobjectSmoothPath";
import type { ThreeDFamilyId } from "../../components/visualizations/three/threeDSceneTypes";

export const CALIFORNIA_PREMIUM_WEBGL_GRAPHICS_SOURCE_CONTRACT =
  "catalog(enabled&&premiumLaunch)->reviewed CA family identity->MathSceneSpec IR->MathSceneRuntime palette/material->terminal Chromium pixels";
export const CALIFORNIA_PREMIUM_WEBGL_MIN_CONTRAST_RATIO = 3;

type Rgb = [number, number, number];
type AxisId = "x" | "y" | "z";

export type CaliforniaPremiumWebGlVisualPalette = {
  background: {
    alpha: number;
    color: string;
  };
  renderer: {
    toneMapped: boolean;
  };
  roles: Record<string, string>;
  axes: Record<AxisId, {
    color: string;
    lineWidth: number;
    opacity: number;
  }>;
  lines: {
    curve: { lineWidth: number; opacity: number };
    surfaceColumn: { lineWidth: number; opacity: number };
    surfaceRow: { lineWidth: number; opacity: number };
    trace: { lineWidth: number; opacity: number };
    vector: { lineWidth: number; opacity: number };
  };
};

type ReviewedObjectContract = {
  approvedGeometryDigest?: string;
  colorRole?: string;
  conceptId: string | null;
  minimumWorldArcLength?: number;
  minimumWorldExtent?: number;
  pathObjectId?: string;
  requiredProjectionStates?: readonly CaliforniaPremiumWebGlCaptureStateKey[];
  sourceObjectId?: string;
  type: MathObjectSpec["type"];
};

type ReviewedFamilyContract = {
  cameraShots: MathSceneSpec["cameraShots"];
  familyId: ThreeDFamilyId;
  objects: Record<string, ReviewedObjectContract>;
  sceneId: string;
  templateId: FeaturedLabDefinition["templateId"];
};

export const californiaPremiumWebGlReviewedContracts = {
  "us-ca-math-s4-chapter-04": {
    cameraShots: [
      { id: "overview", fov: 48, position: [3.4, 2.8, 4.1], target: [0, 0.78, 0] },
      { id: "curve-detail", fov: 44, position: [2.2, 2.15, 2.7], target: [0.2, 0.95, 0] }
    ],
    familyId: "three-function-graph",
    objects: {
      axes: {
        approvedGeometryDigest: "bef5a52f7e73482d086e6b5e9fbb3a5a9106f66a1ba73ef68eebb806a882fdde",
        conceptId: "coordinate-frame",
        minimumWorldArcLength: 14,
        minimumWorldExtent: 6,
        requiredProjectionStates: ["default", "playing", "reset", "terminal-settled"],
        type: "axis3d"
      },
      "function-curve": {
        approvedGeometryDigest: "c10f51486dcc5656c61a9dc78e9a525cb9c7eb80b20b5787d51099b9c639b97a",
        colorRole: "function",
        conceptId: "function-rule",
        minimumWorldArcLength: 5,
        minimumWorldExtent: 4.5,
        requiredProjectionStates: ["playing", "terminal-settled"],
        type: "parametricCurve"
      },
      "moving-probe": {
        colorRole: "probe",
        conceptId: "probe-point",
        pathObjectId: "function-curve",
        requiredProjectionStates: ["default", "playing", "reset", "terminal-settled"],
        type: "movingPoint"
      },
      "probe-trace": {
        colorRole: "trace",
        conceptId: null,
        requiredProjectionStates: ["playing"],
        sourceObjectId: "moving-probe",
        type: "trace"
      }
    },
    sceneId: "mais-manim-function-graph",
    templateId: "function-graph"
  },
  "us-ca-math-s5-chapter-03": {
    cameraShots: [
      { id: "overview", fov: 48, position: [3.35, 2.85, 4.05], target: [0, 0.9, 0] },
      { id: "unit-circle-link", fov: 43, position: [2.25, 2.25, 2.7], target: [-0.65, 1.05, -0.08] },
      { id: "wave-detail", fov: 42, position: [2.55, 2.15, 2.6], target: [0.65, 1.05, 0.2] }
    ],
    familyId: "three-trig-unit-wave",
    objects: {
      axes: {
        approvedGeometryDigest: "0373f2248c42cc877a05f273d6fd2f7b865dfed76c687647a8b283e8e139f809",
        conceptId: "coordinate-frame",
        minimumWorldArcLength: 14,
        minimumWorldExtent: 9,
        requiredProjectionStates: ["default", "playing", "reset", "terminal-settled"],
        type: "axis3d"
      },
      "phase-radius": {
        approvedGeometryDigest: "edcb9b7b5a4748c63addb114511a0371cde540c29b654095e8be3c0c13fb5459",
        colorRole: "probe",
        conceptId: "phase-angle",
        minimumWorldArcLength: 0.35,
        minimumWorldExtent: 0.35,
        requiredProjectionStates: ["default", "playing", "reset", "terminal-settled"],
        type: "vector"
      },
      "phase-trace": {
        colorRole: "trace",
        conceptId: null,
        requiredProjectionStates: ["playing"],
        sourceObjectId: "wave-probe",
        type: "trace"
      },
      "sine-wave": {
        approvedGeometryDigest: "2263d5702035874dab37925762f680d4dcaee39f4bb6373c1a6b8fd4c80c5760",
        colorRole: "function",
        conceptId: "sine-wave",
        minimumWorldArcLength: 3.2,
        minimumWorldExtent: 3,
        requiredProjectionStates: ["playing", "terminal-settled"],
        type: "parametricCurve"
      },
      "unit-circle": {
        approvedGeometryDigest: "bb860cbd9e146d6b4183473ac68fdeef9f0d56e6759f9a98f0138d27b5e10c3a",
        colorRole: "trace",
        conceptId: "unit-circle",
        minimumWorldArcLength: 2.3,
        minimumWorldExtent: 1,
        requiredProjectionStates: ["playing", "terminal-settled"],
        type: "parametricCurve"
      },
      "wave-probe": {
        colorRole: "probe",
        conceptId: "phase-probe",
        pathObjectId: "sine-wave",
        requiredProjectionStates: ["default", "playing", "reset", "terminal-settled"],
        type: "movingPoint"
      }
    },
    sceneId: "mais-manim-trig-unit-wave",
    templateId: "trig-unit-wave"
  }
} as const satisfies Record<string, ReviewedFamilyContract>;

export type CaliforniaPremiumWebGlRenderTarget = {
  color: string;
  contrastRatio: number;
  evidenceId: string;
  lineWidth: number | null;
  material: "line-basic" | "mesh-basic" | "mesh-standard";
  objectId: string;
  opacity: number;
  role: string;
  toneMapped: boolean;
};

export type CaliforniaPremiumWebGlScreenshotTarget = {
  color: string;
  displayColors: Rgb[];
  evidenceId: string;
  minimumConnectedPixels: number;
  minimumCorePixels: number;
  objectId: string;
  opacity: number;
  primitiveId: string;
  role: string;
};

export type CaliforniaPremiumWebGlLabContract = {
  accent: string;
  familyId: ThreeDFamilyId;
  labId: string;
  renderTargets: CaliforniaPremiumWebGlRenderTarget[];
  sceneId: string;
  screenshotTargets: CaliforniaPremiumWebGlScreenshotTarget[];
  templateId: FeaturedLabDefinition["templateId"];
};

export type CaliforniaPremiumWebGlGraphicsAudit = {
  backgroundColor: string;
  californiaLiveLabIds: string[];
  issues: string[];
  labs: CaliforniaPremiumWebGlLabContract[];
  sourceContract: typeof CALIFORNIA_PREMIUM_WEBGL_GRAPHICS_SOURCE_CONTRACT;
  visualPaletteSourceContract: typeof MATH_SCENE_VISUAL_PALETTE_SOURCE_CONTRACT;
};

type CaliforniaPremiumWebGlGraphicsAuditOptions = {
  cameraContract?: typeof threeDCanvasCameraContract;
  palette?: CaliforniaPremiumWebGlVisualPalette;
  sceneBuilder?: (lab: FeaturedLabDefinition) => MathSceneSpec | null;
};

let cachedDefaultCaliforniaPremiumWebGlGraphicsAudit: CaliforniaPremiumWebGlGraphicsAudit | null = null;

function stableValue(value: unknown): unknown {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) return value.map((entry) => stableValue(entry) ?? null);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, stableValue(entry)])
  );
}

function stableSerialize(value: unknown) {
  return JSON.stringify(stableValue(value));
}

function isCaliforniaCatalogLab(lab: FeaturedLabDefinition) {
  return lab.curriculumTrack === "US" && lab.publisher === "US_CA_MATH";
}

export function deriveCaliforniaLivePremiumWebGlLabs(
  catalog: readonly FeaturedLabDefinition[] = visualizationLabCatalog
) {
  return catalog
    .filter((lab) => isCaliforniaCatalogLab(lab) && isLivePremiumThreeDLab(lab))
    .slice()
    .sort((left, right) => left.labId.localeCompare(right.labId));
}

function parseHexColor(value: string): Rgb | null {
  const normalized = value.trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(normalized)) {
    return [
      Number.parseInt(normalized[1] + normalized[1], 16),
      Number.parseInt(normalized[2] + normalized[2], 16),
      Number.parseInt(normalized[3] + normalized[3], 16)
    ];
  }
  if (!/^#[0-9a-f]{6}$/.test(normalized)) return null;
  return [
    Number.parseInt(normalized.slice(1, 3), 16),
    Number.parseInt(normalized.slice(3, 5), 16),
    Number.parseInt(normalized.slice(5, 7), 16)
  ];
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function srgbChannelToLinear(value: number) {
  const normalized = value / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function linearChannelToSrgb(value: number) {
  const bounded = clamp01(value);
  const normalized = bounded <= 0.0031308
    ? bounded * 12.92
    : 1.055 * bounded ** (1 / 2.4) - 0.055;
  return Math.round(normalized * 255);
}

function relativeLuminance([red, green, blue]: Rgb) {
  return (
    0.2126 * srgbChannelToLinear(red) +
    0.7152 * srgbChannelToLinear(green) +
    0.0722 * srgbChannelToLinear(blue)
  );
}

export function californiaPremiumWebGlContrastRatio(left: Rgb, right: Rgb) {
  const leftLuminance = relativeLuminance(left);
  const rightLuminance = relativeLuminance(right);
  return (Math.max(leftLuminance, rightLuminance) + 0.05) /
    (Math.min(leftLuminance, rightLuminance) + 0.05);
}

function compositeSrgb(foreground: Rgb, background: Rgb, opacity: number): Rgb {
  const alpha = clamp01(opacity);
  return foreground.map((channel, index) => Math.round(
    channel * alpha + background[index] * (1 - alpha)
  )) as Rgb;
}

function compositeLinearLight(foreground: Rgb, background: Rgb, opacity: number): Rgb {
  const alpha = clamp01(opacity);
  return foreground.map((channel, index) => linearChannelToSrgb(
    srgbChannelToLinear(channel) * alpha + srgbChannelToLinear(background[index]) * (1 - alpha)
  )) as Rgb;
}

function contrastFor(color: string, opacity: number, backgroundColor: string) {
  const foreground = parseHexColor(color);
  const background = parseHexColor(backgroundColor);
  if (!foreground || !background) return null;
  return californiaPremiumWebGlContrastRatio(compositeSrgb(foreground, background, opacity), background);
}

function visualColorForRole(palette: CaliforniaPremiumWebGlVisualPalette, role: string, accent: string) {
  const color = palette.roles[role];
  if (color === "accent") return accent;
  return color ?? palette.roles.default ?? "";
}

function pushContrastIssue(
  issues: string[],
  label: string,
  color: string,
  opacity: number,
  backgroundColor: string
) {
  const ratio = contrastFor(color, opacity, backgroundColor);
  if (ratio === null) {
    issues.push(`${label}:invalid-color:${color || "missing"}`);
    return 0;
  }
  if (ratio < CALIFORNIA_PREMIUM_WEBGL_MIN_CONTRAST_RATIO) {
    issues.push(
      `${label}:contrast=${ratio.toFixed(3)}<${CALIFORNIA_PREMIUM_WEBGL_MIN_CONTRAST_RATIO.toFixed(1)}:` +
      `color=${color}:opacity=${opacity.toFixed(3)}:background=${backgroundColor}`
    );
  }
  return ratio;
}

function validateVisualPalette(
  palette: CaliforniaPremiumWebGlVisualPalette,
  issues: string[]
) {
  if (palette.background.color.toLowerCase() !== MANIM_DEFAULT_BACKGROUND_COLOR.toLowerCase()) {
    issues.push(
      `background-color-drift:${palette.background.color || "missing"}!=${MANIM_DEFAULT_BACKGROUND_COLOR}`
    );
  }
  if (palette.background.alpha !== 1) {
    issues.push(`background-alpha-drift:${String(palette.background.alpha)}!=1`);
  }
  if (!parseHexColor(palette.background.color)) {
    issues.push(`background-invalid-color:${palette.background.color || "missing"}`);
  }
  if (palette.renderer.toneMapped !== false) {
    issues.push(`renderer-tone-mapping-drift:${String(palette.renderer.toneMapped)}!=false`);
  }
  const defaultRenderQualityPlan = buildMathSceneRenderQualityPlan({
    preset: "interactive",
    rendererMode: "interactive",
    transparentBackground: false
  });
  const defaultRendererBridge = buildMathSceneRenderQualityBridgePlan(defaultRenderQualityPlan);
  if (
    defaultRenderQualityPlan.backgroundColor !== palette.background.color ||
    defaultRenderQualityPlan.backgroundAlpha !== palette.background.alpha ||
    defaultRenderQualityPlan.transparentBackground ||
    defaultRendererBridge.backgroundColor !== palette.background.color ||
    defaultRendererBridge.backgroundAlpha !== palette.background.alpha ||
    defaultRendererBridge.transparentBackground
  ) {
    issues.push(
      `manim-render-quality-background-drift:quality=${defaultRenderQualityPlan.backgroundColor}` +
      `@${defaultRenderQualityPlan.backgroundAlpha.toFixed(3)}:bridge=${defaultRendererBridge.backgroundColor}` +
      `@${defaultRendererBridge.backgroundAlpha.toFixed(3)}:palette=${palette.background.color}` +
      `@${palette.background.alpha.toFixed(3)}`
    );
  }

  for (const axisId of ["x", "y", "z"] as const) {
    const axis = palette.axes[axisId];
    if (!axis) {
      issues.push(`axis-${axisId}:missing-palette`);
      continue;
    }
    if (!Number.isFinite(axis.lineWidth) || axis.lineWidth < 2) {
      issues.push(`axis-${axisId}:line-width=${String(axis.lineWidth)}<2`);
    }
    pushContrastIssue(
      issues,
      `axis-${axisId}`,
      axis.color,
      axis.opacity,
      palette.background.color
    );
  }

  for (const [lineId, line] of Object.entries(palette.lines)) {
    if (!Number.isFinite(line.lineWidth) || line.lineWidth < 1) {
      issues.push(`${lineId}:line-width=${String(line.lineWidth)}<1`);
    }
    const role = lineId === "surfaceColumn"
      ? "surface-grid"
      : lineId === "trace"
        ? "trace"
        : lineId === "curve"
          ? "default"
          : lineId === "surfaceRow"
            ? "surface"
            : "default";
    const roleColor = palette.roles[role];
    if (roleColor && roleColor !== "accent") {
      pushContrastIssue(
        issues,
        `line-default-${lineId}`,
        roleColor,
        line.opacity,
        palette.background.color
      );
    }
  }
}

function finiteVec3(value: Vec3) {
  return value.length === 3 && value.every(Number.isFinite);
}

function worldPolylineMetrics(points: readonly Vec3[]) {
  if (points.length === 0) return { arcLength: 0, extent: 0 };
  const spans = [0, 1, 2].map((axis) => {
    const values = points.map((point) => point[axis]);
    return Math.max(...values) - Math.min(...values);
  });
  const arcLength = points.slice(1).reduce((sum, point, index) =>
    sum + Math.hypot(
      point[0] - points[index][0],
      point[1] - points[index][1],
      point[2] - points[index][2]
    ), 0);
  return { arcLength, extent: Math.hypot(...spans) };
}

function reviewedGeometryEvidence(object: MathObjectSpec) {
  if (object.type === "axis3d") {
    const checkpoints = [object.range.x, object.range.y, object.range.z]
      .map((range) => range.map((value) => rounded(value, 9)));
    const spans = [object.range.x, object.range.y, object.range.z]
      .map(([start, end]) => Math.abs(end - start));
    return {
      arcLength: spans.reduce((sum, span) => sum + span, 0),
      digest: sha256Stable({ checkpoints, sampleCount: checkpoints.length }),
      extent: Math.max(...spans)
    };
  }
  const points = object.type === "parametricCurve"
    ? object.samples
    : object.type === "vector"
      ? [object.from, object.to]
      : null;
  if (!points) return null;
  const checkpointIndices = points.length === 2
    ? [0, 1]
    : [0, Math.floor(points.length / 2), points.length - 1];
  const checkpoints = checkpointIndices.map((index) =>
    points[index].map((value) => rounded(value, 9))
  );
  const metrics = worldPolylineMetrics(points);
  return {
    arcLength: metrics.arcLength,
    digest: sha256Stable({ checkpoints, sampleCount: points.length }),
    extent: metrics.extent
  };
}

function validateObjectGeometry(object: MathObjectSpec, issues: string[], prefix: string) {
  if (object.type === "axis3d") {
    for (const axisId of ["x", "y", "z"] as const) {
      const range = object.range[axisId];
      if (!range.every(Number.isFinite) || range[0] === range[1]) {
        issues.push(`${prefix}:${object.id}:axis-${axisId}-range-invalid`);
      }
    }
    return;
  }
  if (object.type === "parametricCurve") {
    if (object.samples.length < 2 || object.samples.some((point) => !finiteVec3(point))) {
      issues.push(`${prefix}:${object.id}:curve-samples-invalid`);
    }
    return;
  }
  if (object.type === "parametricSurface") {
    if (object.samples.length < 2 || object.samples.some((row) => row.length < 2 || row.some((point) => !finiteVec3(point)))) {
      issues.push(`${prefix}:${object.id}:surface-samples-invalid`);
    }
    return;
  }
  if (object.type === "vector" && (!finiteVec3(object.from) || !finiteVec3(object.to))) {
    issues.push(`${prefix}:${object.id}:vector-points-invalid`);
  }
}

function renderTargetsForScene(options: {
  accent: string;
  issues: string[];
  labId: string;
  palette: CaliforniaPremiumWebGlVisualPalette;
  scene: MathSceneSpec;
}) {
  const { accent, issues, labId, palette, scene } = options;
  const runtimeState = buildMathSceneRuntimeState(scene, 0);
  const targets: CaliforniaPremiumWebGlRenderTarget[] = [];

  for (const object of scene.objects) {
    const runtimeObject = runtimeState.objectGraph.byId[object.id];
    if (!runtimeObject) {
      issues.push(`${labId}:${object.id}:missing-runtime-object`);
      continue;
    }
    const materialProps = materialPropsForMobject(runtimeObject.uniforms);
    if (materialProps.shadeIn3D) issues.push(`${labId}:${object.id}:shade-in-3d-not-allowed`);
    if (materialProps.clippingPlaneCount !== 0) {
      issues.push(`${labId}:${object.id}:clipping-plane-count=${materialProps.clippingPlaneCount}!=0`);
    }
    if (materialProps.opacity !== 1) {
      issues.push(`${labId}:${object.id}:material-opacity=${materialProps.opacity.toFixed(3)}!=1`);
    }
    if (runtimeObject.uniforms?.fixedInFrame) issues.push(`${labId}:${object.id}:fixed-in-frame-not-allowed`);

    if (object.type === "axis3d") {
      for (const axisId of ["x", "y", "z"] as const) {
        const axis = palette.axes[axisId];
        const opacity = axis.opacity * materialProps.opacity;
        const contrastRatio = pushContrastIssue(
          issues,
          `${labId}:axis-${axisId}`,
          axis.color,
          opacity,
          palette.background.color
        );
        targets.push({
          color: axis.color,
          contrastRatio,
          evidenceId: `${object.id}:axis-${axisId}`,
          lineWidth: axis.lineWidth,
          material: "line-basic",
          objectId: object.id,
          opacity,
          role: `axis-${axisId}`,
          toneMapped: palette.renderer.toneMapped
        });
      }
      continue;
    }

    const colorRole = "colorRole" in object ? object.colorRole : "";
    const color = visualColorForRole(palette, colorRole, accent);
    if (!colorRole || !palette.roles[colorRole]) {
      issues.push(`${labId}:${object.id}:missing-or-unregistered-color-role:${colorRole || "missing"}`);
    }

    if (object.type === "movingPoint") {
      const opacity = materialProps.opacity;
      const contrastRatio = pushContrastIssue(
        issues,
        `${labId}:${object.id}`,
        color,
        opacity,
        palette.background.color
      );
      targets.push({
        color,
        contrastRatio,
        evidenceId: object.id,
        lineWidth: null,
        material: materialProps.shadeIn3D ? "mesh-standard" : "mesh-basic",
        objectId: object.id,
        opacity,
        role: colorRole,
        toneMapped: palette.renderer.toneMapped
      });
      continue;
    }

    if (object.type !== "parametricCurve" && object.type !== "trace" && object.type !== "vector") continue;
    const defaults = object.type === "trace"
      ? palette.lines.trace
      : object.type === "vector"
        ? palette.lines.vector
        : palette.lines.curve;
    const style = runtimeObject.renderState.kind === "polyline" || runtimeObject.renderState.kind === "vector"
      ? runtimeObject.renderState.style
      : object.style;
    const lineProps = vmobjectLineProps({
      fallbackColorRole: colorRole,
      fallbackOpacity: defaults.opacity,
      fallbackStrokeWidth: defaults.lineWidth,
      materialProps,
      style
    });
    const renderedColor = visualColorForRole(palette, lineProps.colorRole, accent);
    const contrastRatio = pushContrastIssue(
      issues,
      `${labId}:${object.id}`,
      renderedColor,
      lineProps.opacity,
      palette.background.color
    );
    if (lineProps.lineWidth < 2) {
      issues.push(`${labId}:${object.id}:line-width=${lineProps.lineWidth.toFixed(3)}<2`);
    }
    targets.push({
      color: renderedColor,
      contrastRatio,
      evidenceId: object.id,
      lineWidth: lineProps.lineWidth,
      material: "line-basic",
      objectId: object.id,
      opacity: lineProps.opacity,
      role: lineProps.colorRole,
      toneMapped: palette.renderer.toneMapped
    });
  }

  return targets;
}

function screenshotTargetsForRenderTargets(
  renderTargets: CaliforniaPremiumWebGlRenderTarget[],
  backgroundColor: string
) {
  const background = parseHexColor(backgroundColor);
  if (!background) return [];
  return renderTargets.flatMap((target): CaliforniaPremiumWebGlScreenshotTarget[] => {
    const foreground = parseHexColor(target.color);
    if (!foreground || target.opacity <= 0) return [];
    const evidenceId = target.evidenceId;
    const isPoint = target.lineWidth === null;
    const isTranslucentTrace = target.role === "trace" && target.opacity < 1;
    return [{
      color: target.color,
      displayColors: [
        compositeSrgb(foreground, background, target.opacity),
        compositeLinearLight(foreground, background, target.opacity)
      ].filter((value, index, values) =>
        values.findIndex((candidate) => candidate.every((channel, channelIndex) => channel === value[channelIndex])) === index
      ),
      evidenceId,
      // A fading tracing tail is intentionally painted as many short opacity
      // bands. Demand a larger aggregate core plus a real adjacent pair;
      // requiring one six-pixel same-color component would turn that authored
      // gradient into a constant-color solid line.
      minimumConnectedPixels: isTranslucentTrace ? 2 : isPoint ? 4 : 6,
      minimumCorePixels: isTranslucentTrace ? 24 : isPoint ? 6 : 10,
      objectId: target.objectId,
      opacity: target.opacity,
      primitiveId: evidenceId.startsWith(`${target.objectId}:`)
        ? evidenceId.slice(target.objectId.length + 1)
        : target.objectId,
      role: target.role
    }];
  }).sort((left, right) => left.evidenceId.localeCompare(right.evidenceId));
}

export function buildCaliforniaPremiumWebGlSceneForLab(lab: FeaturedLabDefinition) {
  if (!lab.threeD) return null;
  const state = buildThreeDStateSummary({
    comparison: 5,
    familyId: lab.threeD.familyId,
    mode: 0,
    templateId: lab.templateId,
    value: 6
  });
  return buildMathSceneSpecForThreeDFamily({
    accent: lab.templateConfig.accent ?? "#22d3ee",
    state
  });
}

function validateCanvasCameraContract(
  cameraContract: typeof threeDCanvasCameraContract,
  issues: string[]
) {
  if (stableSerialize(cameraContract) !== stableSerialize(threeDCanvasCameraContract)) {
    issues.push("canvas-camera-contract-drift");
  }
  const camera = cameraContract.defaultCamera;
  if (!(camera.near > 0 && camera.far > camera.near && camera.fov > 0 && camera.fov < 180)) {
    issues.push("canvas-camera-clip-range-invalid");
  }
}

export function auditCaliforniaPremiumWebGlGraphicsContracts(
  catalog: readonly FeaturedLabDefinition[] = visualizationLabCatalog,
  options: CaliforniaPremiumWebGlGraphicsAuditOptions = {}
): CaliforniaPremiumWebGlGraphicsAudit {
  const isDefaultAudit = catalog === visualizationLabCatalog && Object.keys(options).length === 0;
  if (isDefaultAudit && cachedDefaultCaliforniaPremiumWebGlGraphicsAudit) {
    return structuredClone(cachedDefaultCaliforniaPremiumWebGlGraphicsAudit);
  }
  const issues: string[] = [];
  const palette = options.palette ?? mathSceneVisualPalette;
  const cameraContract = options.cameraContract ?? threeDCanvasCameraContract;
  const liveLabs = deriveCaliforniaLivePremiumWebGlLabs(catalog);
  const reviewedLabIds = Object.keys(californiaPremiumWebGlReviewedContracts).sort();
  const liveLabIds = liveLabs.map((lab) => lab.labId);

  if (stableSerialize(liveLabIds) !== stableSerialize(reviewedLabIds)) {
    issues.push(`california-live-identity-drift:derived=${liveLabIds.join(",") || "none"}:reviewed=${reviewedLabIds.join(",")}`);
  }

  validateVisualPalette(palette, issues);
  validateCanvasCameraContract(cameraContract, issues);
  const labs: CaliforniaPremiumWebGlLabContract[] = [];

  for (const lab of liveLabs) {
    const reviewed = californiaPremiumWebGlReviewedContracts[
      lab.labId as keyof typeof californiaPremiumWebGlReviewedContracts
    ];
    if (!reviewed) {
      issues.push(`${lab.labId}:missing-reviewed-family-contract`);
      continue;
    }
    if (!lab.threeD) {
      issues.push(`${lab.labId}:missing-three-d-metadata`);
      continue;
    }
    if (lab.threeD.regionalPriority !== "california") {
      issues.push(`${lab.labId}:regional-priority=${lab.threeD.regionalPriority ?? "missing"}!=california`);
    }
    if (lab.threeD.familyId !== reviewed.familyId) {
      issues.push(`${lab.labId}:family=${lab.threeD.familyId}!=${reviewed.familyId}`);
    }
    if (lab.templateId !== reviewed.templateId) {
      issues.push(`${lab.labId}:template=${lab.templateId}!=${reviewed.templateId}`);
    }
    if (!isMaisManimFamily(lab.threeD.familyId)) {
      issues.push(`${lab.labId}:family=${lab.threeD.familyId}:not-mais-manim`);
    }
    const accent = lab.templateConfig.accent ?? "";
    if (!parseHexColor(accent)) issues.push(`${lab.labId}:invalid-or-missing-accent:${accent || "missing"}`);
    const accentRatio = pushContrastIssue(
      issues,
      `${lab.labId}:function-accent`,
      accent,
      1,
      palette.background.color
    );
    if (accentRatio === 0) continue;

    const scene = options.sceneBuilder
      ? options.sceneBuilder(lab)
      : buildCaliforniaPremiumWebGlSceneForLab(lab);
    if (!scene) {
      issues.push(`${lab.labId}:missing-math-scene`);
      continue;
    }
    if (scene.familyId !== reviewed.familyId) issues.push(`${lab.labId}:scene-family=${scene.familyId}!=${reviewed.familyId}`);
    if (scene.sceneId !== reviewed.sceneId) issues.push(`${lab.labId}:scene-id=${scene.sceneId}!=${reviewed.sceneId}`);
    if (stableSerialize(scene.cameraShots) !== stableSerialize(reviewed.cameraShots)) {
      issues.push(`${lab.labId}:camera-shots-drift`);
    }
    for (const shot of scene.cameraShots) {
      if (!finiteVec3(shot.position) || !finiteVec3(shot.target) || (shot.fov !== undefined && !(shot.fov > 0 && shot.fov < 180))) {
        issues.push(`${lab.labId}:camera-shot-invalid:${shot.id}`);
      }
    }

    const actualObjectIds = scene.objects.map((object) => object.id).sort();
    const reviewedObjectIds = Object.keys(reviewed.objects).sort();
    if (stableSerialize(actualObjectIds) !== stableSerialize(reviewedObjectIds)) {
      issues.push(`${lab.labId}:scene-object-identity-drift:actual=${actualObjectIds.join(",")}:reviewed=${reviewedObjectIds.join(",")}`);
    }
    for (const [objectId, expectedObject] of Object.entries(reviewed.objects)) {
      const object = scene.objects.find((candidate) => candidate.id === objectId);
      if (!object) {
        issues.push(`${lab.labId}:${objectId}:missing-reviewed-object`);
        continue;
      }
      if (object.type !== expectedObject.type) {
        issues.push(`${lab.labId}:${objectId}:type=${object.type}!=${expectedObject.type}`);
      }
      const actualRole = "colorRole" in object ? object.colorRole : undefined;
      const expectedRole = "colorRole" in expectedObject ? expectedObject.colorRole : undefined;
      if (actualRole !== expectedRole) {
        issues.push(`${lab.labId}:${objectId}:role=${actualRole || "missing"}!=${expectedRole ?? "none"}`);
      }
      const actualConceptId = "conceptId" in object && typeof object.conceptId === "string"
        ? object.conceptId
        : null;
      if (actualConceptId !== expectedObject.conceptId) {
        issues.push(
          `${lab.labId}:${objectId}:concept-id=${actualConceptId ?? "none"}!=${expectedObject.conceptId ?? "none"}`
        );
      }
      if (expectedObject.pathObjectId !== undefined) {
        const actualPathObjectId = object.type === "movingPoint" ? object.pathObjectId : undefined;
        if (actualPathObjectId !== expectedObject.pathObjectId) {
          issues.push(
            `${lab.labId}:${objectId}:path-object-id=${actualPathObjectId ?? "none"}!=${expectedObject.pathObjectId}`
          );
        }
      }
      if (expectedObject.sourceObjectId !== undefined) {
        const actualSourceObjectId = object.type === "trace" ? object.sourceObjectId : undefined;
        if (actualSourceObjectId !== expectedObject.sourceObjectId) {
          issues.push(
            `${lab.labId}:${objectId}:source-object-id=${actualSourceObjectId ?? "none"}!=${expectedObject.sourceObjectId}`
          );
        }
      }
      const geometry = reviewedGeometryEvidence(object);
      if (expectedObject.approvedGeometryDigest !== undefined) {
        if (!geometry || geometry.digest !== expectedObject.approvedGeometryDigest) {
          issues.push(
            `${lab.labId}:${objectId}:reviewed-geometry-checkpoint-digest=` +
            `${geometry?.digest ?? "missing"}!=${expectedObject.approvedGeometryDigest}`
          );
        }
      }
      if (expectedObject.minimumWorldExtent !== undefined &&
          (!geometry || geometry.extent < expectedObject.minimumWorldExtent)) {
        issues.push(
          `${lab.labId}:${objectId}:reviewed-world-extent=${geometry?.extent.toFixed(6) ?? "missing"}` +
          `<${expectedObject.minimumWorldExtent.toFixed(6)}`
        );
      }
      if (expectedObject.minimumWorldArcLength !== undefined &&
          (!geometry || geometry.arcLength < expectedObject.minimumWorldArcLength)) {
        issues.push(
          `${lab.labId}:${objectId}:reviewed-world-arc-length=${geometry?.arcLength.toFixed(6) ?? "missing"}` +
          `<${expectedObject.minimumWorldArcLength.toFixed(6)}`
        );
      }
      validateObjectGeometry(object, issues, lab.labId);
    }

    const renderTargets = renderTargetsForScene({
      accent,
      issues,
      labId: lab.labId,
      palette,
      scene
    });
    labs.push({
      accent,
      familyId: lab.threeD.familyId,
      labId: lab.labId,
      renderTargets,
      sceneId: scene.sceneId,
      screenshotTargets: screenshotTargetsForRenderTargets(renderTargets, palette.background.color),
      templateId: lab.templateId
    });
  }

  const audit = {
    backgroundColor: palette.background.color,
    californiaLiveLabIds: liveLabIds,
    issues,
    labs,
    sourceContract: CALIFORNIA_PREMIUM_WEBGL_GRAPHICS_SOURCE_CONTRACT,
    visualPaletteSourceContract: MATH_SCENE_VISUAL_PALETTE_SOURCE_CONTRACT
  } satisfies CaliforniaPremiumWebGlGraphicsAudit;
  if (isDefaultAudit) cachedDefaultCaliforniaPremiumWebGlGraphicsAudit = audit;
  return structuredClone(audit);
}

export type CaliforniaPremiumWebGlScreenshotInput = {
  channels: 4;
  data: Uint8Array;
  height: number;
  /** Deliberately ignored: terminal evidence comes only from screenshot pixels. */
  untrustedDomAttributes?: Record<string, string>;
  width: number;
};

export type CaliforniaPremiumWebGlScreenshotTargetEvidence = {
  arcLengthBucketCount: number;
  cameraProjectionDigest: string;
  corePixelCount: number;
  endpointMatchCount: number;
  evidenceId: string;
  expectedRegion: CaliforniaPremiumWebGlExpectedRegion;
  largestConnectedCorePixelCount: number;
  matchedArcLengthBucketCount: number;
  matchedSpatialSampleCount: number;
  maximumConsecutiveMissingBuckets: number;
  objectId: string;
  offCorridorCorePixelCount: number;
  offCorridorCorePixelRatio: number;
  onPathCorePixelCount: number;
  passed: boolean;
  primitiveId: string;
  projectedGeometryDigest: string;
  projectedPointCount: number;
  requiredSpatialSampleCount: number;
  role: string;
  segmentCount: number;
  spatialCoverageRatio: number;
  topology: CaliforniaPremiumWebGlExpectedTargetContract["topology"];
};

export type CaliforniaPremiumWebGlScreenshotAudit = {
  backgroundCorePixelRatio: number;
  domSelfReportTrusted: false;
  issues: string[];
  opaquePixelRatio: number;
  targetEvidence: CaliforniaPremiumWebGlScreenshotTargetEvidence[];
};

export const CALIFORNIA_PREMIUM_WEBGL_CONTRAST_PROVIDER_VERSION = 3 as const;
export const CALIFORNIA_PREMIUM_WEBGL_CAPTURE_MAX_AGE_MS = 15_000;
export const CALIFORNIA_PREMIUM_WEBGL_TEST_TERMINAL_STATE_KEY = "terminal-settled" as const;
export const californiaPremiumWebGlProductionStateKeys = [
  "default",
  "playing",
  "reset"
] as const;

export type CaliforniaPremiumWebGlProductionStateKey =
  (typeof californiaPremiumWebGlProductionStateKeys)[number];

export type CaliforniaPremiumWebGlCaptureStateKey = CaliforniaPremiumWebGlProductionStateKey |
  typeof CALIFORNIA_PREMIUM_WEBGL_TEST_TERMINAL_STATE_KEY;

export type CaliforniaPremiumWebGlProjectedPoint = [number, number];

export type CaliforniaPremiumWebGlExpectedRegion = {
  maxX: number;
  maxY: number;
  minX: number;
  minY: number;
};

export type CaliforniaPremiumWebGlExpectedTargetContract = {
  approvedSemanticDigest: string;
  arcLengthBucketCount: number;
  cameraProjectionDigest: string;
  conceptId: string | null;
  evidenceId: string;
  expectedRegion: CaliforniaPremiumWebGlExpectedRegion;
  maximumConsecutiveMissingBuckets: number;
  maximumOffCorridorCorePixelRatio: number;
  minimumConnectedPixels: number;
  minimumCorePixels: number;
  minimumEndpointMatchCount: number;
  minimumMatchedArcLengthBucketCount: number;
  minimumOnPathCorePixels: number;
  minimumSpatialCoverageRatio: number;
  objectId: string;
  pathObjectId: string | null;
  primitiveId: string;
  projectedArcLength: number;
  projectedExtent: number;
  projectedGeometryDigest: string;
  projectedPointCount: number;
  projectedPoints: CaliforniaPremiumWebGlProjectedPoint[];
  role: string;
  segmentCount: number;
  sourceObjectId: string | null;
  topology: "line-strip" | "point" | "segment";
};

export type CaliforniaPremiumWebGlSceneProjectionContract = {
  cameraProjectionDigest: string;
  elapsedSeconds: number;
  projectionAspectRatio: number;
  renderedObjectCount: number;
  sceneObjectCount: number;
  sceneTopologyDigest: string;
  targetContract: CaliforniaPremiumWebGlExpectedTargetContract[];
};

export type CaliforniaPremiumWebGlNumberBracket = {
  after: number;
  before: number;
};

export type CaliforniaPremiumWebGlCompositorDifference = {
  changedPixelRatio: number;
  meanAbsoluteDiffRatio: number;
};

export type CaliforniaPremiumWebGlPlayingCompositorSample = {
  cameraProjectionDigest: string;
  captureEndedAtMs: number;
  captureStartedAtMs: number;
  captureToken: string;
  compositorBindingSha256: string;
  compositorChangedPixelRatioFromPrevious: number | null;
  compositorElapsedBracket: CaliforniaPremiumWebGlNumberBracket;
  compositorElapsedSeconds: number;
  compositorFrameIndexBracket: CaliforniaPremiumWebGlNumberBracket;
  compositorMeanAbsoluteDiffRatioFromPrevious: number | null;
  compositorPngByteLength: number;
  compositorPngSha256: string;
  compositorRgbaSha256: string;
  height: number;
  sceneTopologyDigest: string;
  targetContract: CaliforniaPremiumWebGlExpectedTargetContract[];
  targetEvidence: CaliforniaPremiumWebGlScreenshotTargetEvidence[];
  timelineValueBracket: CaliforniaPremiumWebGlNumberBracket;
  width: number;
};

export type CaliforniaPremiumWebGlBrowserCapture = {
  backingHeight: number;
  backingWidth: number;
  captureEndedAtMs: number;
  captureStartedAtMs: number;
  captureToken: string;
  capturedUrl: string;
  cssHeight: number;
  cssWidth: number;
  cssX: number;
  cssY: number;
  devicePixelRatio: number;
  elapsedSeconds: number;
  frameIndex: number;
  labId: string;
  pageX: number;
  pageY: number;
  playbackState: "paused" | "playing" | "scrubbing";
  pngBase64: string;
  pngByteLength: number;
  pngSha256: string;
  rendererElapsedBracket: CaliforniaPremiumWebGlNumberBracket;
  rendererFrameIndexBracket: CaliforniaPremiumWebGlNumberBracket;
  stateKey: CaliforniaPremiumWebGlCaptureStateKey;
  timelineValue: number;
  timelineValueBracket: CaliforniaPremiumWebGlNumberBracket;
};

export type CaliforniaPremiumWebGlRegisteredContrastEvidence = {
  backingHeight: number;
  backingWidth: number;
  backgroundCorePixelRatio: number;
  bitmapHeight: number;
  bitmapPngByteLength: number;
  bitmapPngSha256: string;
  bitmapRgbaSha256: string;
  bitmapWidth: number;
  captureEndedAtMs: number;
  captureStartedAtMs: number;
  captureToken: string;
  cameraProjectionDigest: string;
  capturedUrl: string;
  compositorBackgroundCorePixelRatio: number;
  compositorBindingSha256: string;
  compositorCameraProjectionDigest: string;
  compositorCaptureEndedAtMs: number;
  compositorCaptureStartedAtMs: number;
  compositorClip: { height: number; width: number; x: number; y: number };
  compositorElapsedSeconds: number;
  compositorElapsedBracket: CaliforniaPremiumWebGlNumberBracket;
  compositorFrameIndexBracket: CaliforniaPremiumWebGlNumberBracket;
  compositorIssues: string[];
  compositorOpaquePixelRatio: number;
  compositorPngByteLength: number;
  compositorPngSha256: string;
  compositorProjectionAspectRatio: number;
  compositorRenderedObjectCount: number;
  compositorRgbaSha256: string;
  compositorSceneObjectCount: number;
  compositorSceneTopologyDigest: string;
  compositorTargetContract: CaliforniaPremiumWebGlExpectedTargetContract[];
  compositorTargetEvidence: CaliforniaPremiumWebGlScreenshotTargetEvidence[];
  compositorWidth: number;
  compositorHeight: number;
  compositorTimelineValueBracket: CaliforniaPremiumWebGlNumberBracket;
  cssHeight: number;
  cssWidth: number;
  cssX: number;
  cssY: number;
  devicePixelRatio: number;
  elapsedSeconds: number;
  frameIndex: number;
  labId: string;
  opaquePixelRatio: number;
  pageX: number;
  pageY: number;
  playingCompositorSamples: CaliforniaPremiumWebGlPlayingCompositorSample[];
  playbackState: "paused" | "playing" | "scrubbing";
  projectionAspectRatio: number;
  providerVersion: typeof CALIFORNIA_PREMIUM_WEBGL_CONTRAST_PROVIDER_VERSION;
  renderedObjectCount: number;
  rendererElapsedBracket: CaliforniaPremiumWebGlNumberBracket;
  rendererFrameIndexBracket: CaliforniaPremiumWebGlNumberBracket;
  sceneObjectCount: number;
  sceneTopologyDigest: string;
  compositorResetDifference: CaliforniaPremiumWebGlCompositorDifference | null;
  sourceContract: typeof CALIFORNIA_PREMIUM_WEBGL_GRAPHICS_SOURCE_CONTRACT;
  stateKey: CaliforniaPremiumWebGlCaptureStateKey;
  targetContract: CaliforniaPremiumWebGlExpectedTargetContract[];
  targetEvidence: CaliforniaPremiumWebGlScreenshotTargetEvidence[];
  terminalIssues: string[];
  timelineValue: number;
  timelineValueBracket: CaliforniaPremiumWebGlNumberBracket;
  visualPaletteSourceContract: typeof MATH_SCENE_VISUAL_PALETTE_SOURCE_CONTRACT;
};

export type CaliforniaPremiumWebGlContrastRegistration = {
  bitmapPng: Buffer;
  compositorPng: Buffer;
  compositorScreenshot: CaliforniaPremiumWebGlScreenshotInput;
  compositorTerminal: CaliforniaPremiumWebGlScreenshotAudit;
  evidence: CaliforniaPremiumWebGlRegisteredContrastEvidence;
  playingCompositorPngs: Buffer[];
  screenshot: CaliforniaPremiumWebGlScreenshotInput;
  terminal: CaliforniaPremiumWebGlScreenshotAudit;
};

function maximumChannelDelta(left: Rgb, right: Rgb) {
  return Math.max(
    Math.abs(left[0] - right[0]),
    Math.abs(left[1] - right[1]),
    Math.abs(left[2] - right[2])
  );
}

function largestConnectedComponent(mask: Uint8Array, width: number, height: number) {
  const visited = new Uint8Array(mask.length);
  const queue = new Int32Array(mask.length);
  let largest = 0;

  for (let seed = 0; seed < mask.length; seed += 1) {
    if (!mask[seed] || visited[seed]) continue;
    let head = 0;
    let tail = 1;
    let count = 0;
    queue[0] = seed;
    visited[seed] = 1;
    while (head < tail) {
      const pixel = queue[head];
      head += 1;
      count += 1;
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      for (let yOffset = -1; yOffset <= 1; yOffset += 1) {
        for (let xOffset = -1; xOffset <= 1; xOffset += 1) {
          if (xOffset === 0 && yOffset === 0) continue;
          const nextX = x + xOffset;
          const nextY = y + yOffset;
          if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) continue;
          const next = nextY * width + nextX;
          if (!mask[next] || visited[next]) continue;
          visited[next] = 1;
          queue[tail] = next;
          tail += 1;
        }
      }
    }
    largest = Math.max(largest, count);
  }
  return largest;
}

function arcLengthBucketSamples(
  points: CaliforniaPremiumWebGlProjectedPoint[],
  bucketCount: number
) {
  if (points.length <= 1 || bucketCount <= 1) return points.slice(0, 1);
  const cumulative = [0];
  for (let index = 1; index < points.length; index += 1) {
    cumulative.push(cumulative[index - 1] + Math.hypot(
      points[index][0] - points[index - 1][0],
      points[index][1] - points[index - 1][1]
    ));
  }
  const total = cumulative.at(-1) ?? 0;
  if (total <= 1e-9) return [points[0]];
  return Array.from({ length: bucketCount }, (_, bucketIndex) => {
    const distance = total * bucketIndex / Math.max(1, bucketCount - 1);
    let segment = 1;
    while (segment < cumulative.length - 1 && cumulative[segment] < distance) segment += 1;
    const startDistance = cumulative[segment - 1];
    const segmentLength = cumulative[segment] - startDistance;
    const alpha = segmentLength <= 1e-9 ? 0 : (distance - startDistance) / segmentLength;
    return [
      rounded(points[segment - 1][0] + (points[segment][0] - points[segment - 1][0]) * alpha),
      rounded(points[segment - 1][1] + (points[segment][1] - points[segment - 1][1]) * alpha)
    ] as CaliforniaPremiumWebGlProjectedPoint;
  });
}

function paintNormalizedCorridor(
  mask: Uint8Array,
  width: number,
  height: number,
  points: CaliforniaPremiumWebGlProjectedPoint[],
  radius: number
) {
  for (const [normalizedX, normalizedY] of points) {
    const centerX = Math.round(normalizedX * (width - 1));
    const centerY = Math.round(normalizedY * (height - 1));
    for (let yOffset = -radius; yOffset <= radius; yOffset += 1) {
      for (let xOffset = -radius; xOffset <= radius; xOffset += 1) {
        if (xOffset * xOffset + yOffset * yOffset > radius * radius) continue;
        const x = centerX + xOffset;
        const y = centerY + yOffset;
        if (x < 0 || x >= width || y < 0 || y >= height) continue;
        mask[y * width + x] = 1;
      }
    }
  }
}

function maximumConsecutiveFalse(values: boolean[]) {
  let maximum = 0;
  let current = 0;
  for (const value of values) {
    current = value ? 0 : current + 1;
    maximum = Math.max(maximum, current);
  }
  return maximum;
}

export function auditCaliforniaPremiumWebGlScreenshot(
  input: CaliforniaPremiumWebGlScreenshotInput,
  lab: CaliforniaPremiumWebGlLabContract,
  backgroundColor = mathSceneVisualPalette.background.color,
  options: {
    elapsedSeconds?: number;
    stateKey?: CaliforniaPremiumWebGlCaptureStateKey;
    targetContract?: CaliforniaPremiumWebGlExpectedTargetContract[];
  } = {}
): CaliforniaPremiumWebGlScreenshotAudit {
  const issues: string[] = [];
  const pixelCount = input.width * input.height;
  const expectedByteCount = pixelCount * input.channels;
  if (input.width <= 0 || input.height <= 0 || input.data.length !== expectedByteCount) {
    issues.push(`invalid-rgba-buffer:${input.width}x${input.height}:bytes=${input.data.length}:expected=${expectedByteCount}`);
    return {
      backgroundCorePixelRatio: 0,
      domSelfReportTrusted: false,
      issues,
      opaquePixelRatio: 0,
      targetEvidence: []
    };
  }
  const background = parseHexColor(backgroundColor);
  if (!background) {
    issues.push(`invalid-background-color:${backgroundColor}`);
    return {
      backgroundCorePixelRatio: 0,
      domSelfReportTrusted: false,
      issues,
      opaquePixelRatio: 0,
      targetEvidence: []
    };
  }

  let opaquePixels = 0;
  let backgroundPixels = 0;
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const offset = pixel * input.channels;
    const color: Rgb = [input.data[offset], input.data[offset + 1], input.data[offset + 2]];
    const alpha = input.data[offset + 3];
    if (alpha >= 250) opaquePixels += 1;
    if (alpha >= 250 && maximumChannelDelta(color, background) <= 10) backgroundPixels += 1;
  }
  const opaquePixelRatio = opaquePixels / pixelCount;
  const backgroundCorePixelRatio = backgroundPixels / pixelCount;
  if (opaquePixelRatio < 0.999) issues.push(`screenshot-not-opaque:ratio=${opaquePixelRatio.toFixed(6)}`);
  if (backgroundCorePixelRatio < 0.12) {
    issues.push(`background-core-missing:ratio=${backgroundCorePixelRatio.toFixed(6)}<0.120000`);
  }

  const targetContract = options.targetContract ?? californiaPremiumWebGlExpectedTargetContractForLab(
    lab.labId,
    options.stateKey ?? CALIFORNIA_PREMIUM_WEBGL_TEST_TERMINAL_STATE_KEY,
    { elapsedSeconds: options.elapsedSeconds, height: input.height, width: input.width }
  );
  const screenshotTargetsById = new Map(lab.screenshotTargets.map((target) => [target.evidenceId, target]));
  const targetEvidence = targetContract.map((expectedTarget) => {
    const target = screenshotTargetsById.get(expectedTarget.evidenceId);
    if (!target) {
      issues.push(`${lab.labId}:${expectedTarget.evidenceId}:screenshot-target-missing`);
      return {
        arcLengthBucketCount: expectedTarget.arcLengthBucketCount,
        cameraProjectionDigest: expectedTarget.cameraProjectionDigest,
        corePixelCount: 0,
        endpointMatchCount: 0,
        evidenceId: expectedTarget.evidenceId,
        expectedRegion: expectedTarget.expectedRegion,
        largestConnectedCorePixelCount: 0,
        matchedArcLengthBucketCount: 0,
        matchedSpatialSampleCount: 0,
        maximumConsecutiveMissingBuckets: expectedTarget.arcLengthBucketCount,
        objectId: expectedTarget.objectId,
        offCorridorCorePixelCount: 0,
        offCorridorCorePixelRatio: 1,
        onPathCorePixelCount: 0,
        passed: false,
        primitiveId: expectedTarget.primitiveId,
        projectedGeometryDigest: expectedTarget.projectedGeometryDigest,
        projectedPointCount: expectedTarget.projectedPointCount,
        requiredSpatialSampleCount: expectedTarget.projectedPoints.length,
        role: expectedTarget.role,
        segmentCount: expectedTarget.segmentCount,
        spatialCoverageRatio: 0,
        topology: expectedTarget.topology
      };
    }
    const mask = new Uint8Array(pixelCount);
    let corePixelCount = 0;
    const minX = Math.max(0, Math.floor(expectedTarget.expectedRegion.minX * input.width));
    const maxX = Math.min(input.width - 1, Math.ceil(expectedTarget.expectedRegion.maxX * input.width));
    const minY = Math.max(0, Math.floor(expectedTarget.expectedRegion.minY * input.height));
    const maxY = Math.min(input.height - 1, Math.ceil(expectedTarget.expectedRegion.maxY * input.height));
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const pixel = y * input.width + x;
        const offset = pixel * input.channels;
        if (input.data[offset + 3] < 250) continue;
        const color: Rgb = [input.data[offset], input.data[offset + 1], input.data[offset + 2]];
        const closeToExpected = target.displayColors.some((expected) => maximumChannelDelta(color, expected) <= 30);
        if (!closeToExpected) continue;
        if (californiaPremiumWebGlContrastRatio(color, background) < CALIFORNIA_PREMIUM_WEBGL_MIN_CONTRAST_RATIO) continue;
        mask[pixel] = 1;
        corePixelCount += 1;
      }
    }
    const largestConnectedCorePixelCount = largestConnectedComponent(mask, input.width, input.height);
    const radius = Math.max(3, Math.ceil(Math.min(input.width, input.height) * 0.015));
    const visibleSamples = expectedTarget.projectedPoints.filter(([x, y]) => x >= 0 && x <= 1 && y >= 0 && y <= 1);
    const sampleMatchedForColors = (
      [normalizedX, normalizedY]: CaliforniaPremiumWebGlProjectedPoint,
      displayColors: readonly Rgb[]
    ) => {
      const centerX = Math.round(normalizedX * (input.width - 1));
      const centerY = Math.round(normalizedY * (input.height - 1));
      for (let yOffset = -radius; yOffset <= radius; yOffset += 1) {
        for (let xOffset = -radius; xOffset <= radius; xOffset += 1) {
          if (xOffset * xOffset + yOffset * yOffset > radius * radius) continue;
          const x = centerX + xOffset;
          const y = centerY + yOffset;
          if (x < 0 || x >= input.width || y < 0 || y >= input.height) continue;
          const pixel = y * input.width + x;
          if (displayColors === target.displayColors && mask[pixel]) return true;
          const offset = pixel * input.channels;
          if (input.data[offset + 3] < 250) continue;
          const color: Rgb = [input.data[offset], input.data[offset + 1], input.data[offset + 2]];
          if (displayColors.some((expected) => maximumChannelDelta(color, expected) <= 30) &&
              californiaPremiumWebGlContrastRatio(color, background) >= CALIFORNIA_PREMIUM_WEBGL_MIN_CONTRAST_RATIO) {
            return true;
          }
        }
      }
      return false;
    };
    const sampleMatched = (sample: CaliforniaPremiumWebGlProjectedPoint) =>
      sampleMatchedForColors(sample, target.displayColors);
    let matchedSpatialSampleCount = 0;
    const spatialSampleMatches: boolean[] = [];
    for (const sample of visibleSamples) {
      const matched = sampleMatched(sample);
      if (matched) matchedSpatialSampleCount += 1;
      spatialSampleMatches.push(matched);
    }
    const bucketSamples = arcLengthBucketSamples(visibleSamples, expectedTarget.arcLengthBucketCount);
    const bucketMatches = bucketSamples.map(sampleMatched);
    const matchedArcLengthBucketCount = bucketMatches.filter(Boolean).length;
    const maximumConsecutiveMissingBuckets = maximumConsecutiveFalse(bucketMatches);
    const endpointSamples = visibleSamples.length <= 1
      ? visibleSamples
      : [visibleSamples[0], visibleSamples.at(-1)!];
    const endpointMatchCount = endpointSamples.filter((endpoint) => {
      if (sampleMatched(endpoint)) return true;
      const endpointX = endpoint[0] * (input.width - 1);
      const endpointY = endpoint[1] * (input.height - 1);
      return targetContract.some((candidate) => {
        if (candidate.evidenceId === expectedTarget.evidenceId) return false;
        const candidateTarget = screenshotTargetsById.get(candidate.evidenceId);
        if (!candidateTarget) return false;
        const geometricallyOverlaps = candidate.projectedPoints.some(([x, y]) =>
          Math.hypot(x * (input.width - 1) - endpointX, y * (input.height - 1) - endpointY) <= radius * 2
        );
        return geometricallyOverlaps && sampleMatchedForColors(endpoint, candidateTarget.displayColors);
      });
    }).length;

    const ownCorridor = new Uint8Array(pixelCount);
    paintNormalizedCorridor(
      ownCorridor,
      input.width,
      input.height,
      visibleSamples,
      expectedTarget.topology === "point" ? radius * 2 : radius
    );
    const targetColorsOverlap = (candidateId: string) => {
      const candidate = screenshotTargetsById.get(candidateId);
      return candidate?.displayColors.some((candidateColor) =>
        target.displayColors.some((targetColor) => maximumChannelDelta(candidateColor, targetColor) <= 64)
      ) === true;
    };
    const approvedUnionCorridor = new Uint8Array(pixelCount);
    for (const approved of targetContract.filter((candidate) => targetColorsOverlap(candidate.evidenceId))) {
      paintNormalizedCorridor(
        approvedUnionCorridor,
        input.width,
        input.height,
        approved.projectedPoints,
        approved.topology === "point" ? radius * 2 : radius
      );
    }
    let globalColorCorePixelCount = 0;
    let onPathCorePixelCount = 0;
    let offCorridorCorePixelCount = 0;
    for (let pixel = 0; pixel < pixelCount; pixel += 1) {
      const offset = pixel * input.channels;
      if (input.data[offset + 3] < 250) continue;
      const color: Rgb = [input.data[offset], input.data[offset + 1], input.data[offset + 2]];
      if (!target.displayColors.some((expected) => maximumChannelDelta(color, expected) <= 30) ||
          californiaPremiumWebGlContrastRatio(color, background) < CALIFORNIA_PREMIUM_WEBGL_MIN_CONTRAST_RATIO) continue;
      globalColorCorePixelCount += 1;
      if (ownCorridor[pixel]) onPathCorePixelCount += 1;
      if (!approvedUnionCorridor[pixel]) offCorridorCorePixelCount += 1;
    }
    const offCorridorCorePixelRatio = globalColorCorePixelCount > 0
      ? offCorridorCorePixelCount / globalColorCorePixelCount
      : 1;
    const spatialCoverageRatio = visibleSamples.length > 0
      ? matchedSpatialSampleCount / visibleSamples.length
      : 0;
    const requiredSpatialSampleCount = Math.max(
      1,
      Math.ceil(visibleSamples.length * expectedTarget.minimumSpatialCoverageRatio)
    );
    const corePassed = corePixelCount >= expectedTarget.minimumCorePixels &&
      largestConnectedCorePixelCount >= expectedTarget.minimumConnectedPixels;
    const spatialPassed = visibleSamples.length > 0 && matchedSpatialSampleCount >= requiredSpatialSampleCount;
    const topologyPassed = matchedArcLengthBucketCount >= expectedTarget.minimumMatchedArcLengthBucketCount &&
      maximumConsecutiveMissingBuckets <= expectedTarget.maximumConsecutiveMissingBuckets &&
      endpointMatchCount >= expectedTarget.minimumEndpointMatchCount;
    const corridorPassed = onPathCorePixelCount >= expectedTarget.minimumOnPathCorePixels &&
      offCorridorCorePixelRatio <= expectedTarget.maximumOffCorridorCorePixelRatio;
    const passed = corePassed && spatialPassed && topologyPassed && corridorPassed;
    if (!corePassed) {
      issues.push(
        `${lab.labId}:${expectedTarget.evidenceId}:terminal-core-missing:` +
        `pixels=${corePixelCount}<${expectedTarget.minimumCorePixels}:` +
        `connected=${largestConnectedCorePixelCount}<${expectedTarget.minimumConnectedPixels}`
      );
    }
    if (!spatialPassed) {
      issues.push(
        `${lab.labId}:${expectedTarget.evidenceId}:spatial-geometry-missing:` +
        `samples=${matchedSpatialSampleCount}<${requiredSpatialSampleCount}:` +
        `coverage=${spatialCoverageRatio.toFixed(6)}<${expectedTarget.minimumSpatialCoverageRatio.toFixed(6)}:` +
        `geometry=${expectedTarget.projectedGeometryDigest}`
      );
    }
    if (!topologyPassed) {
      issues.push(
        `${lab.labId}:${expectedTarget.evidenceId}:spatial-topology-incomplete:` +
        `buckets=${matchedArcLengthBucketCount}<${expectedTarget.minimumMatchedArcLengthBucketCount}:` +
        `consecutive-misses=${maximumConsecutiveMissingBuckets}>` +
        `${expectedTarget.maximumConsecutiveMissingBuckets}:endpoints=${endpointMatchCount}` +
        `<${expectedTarget.minimumEndpointMatchCount}`
      );
    }
    if (!corridorPassed) {
      issues.push(
        `${lab.labId}:${expectedTarget.evidenceId}:off-corridor-union:` +
        `on-path=${onPathCorePixelCount}<${expectedTarget.minimumOnPathCorePixels}:` +
        `off-ratio=${offCorridorCorePixelRatio.toFixed(6)}>` +
        `${expectedTarget.maximumOffCorridorCorePixelRatio.toFixed(6)}`
      );
    }
    return {
      arcLengthBucketCount: expectedTarget.arcLengthBucketCount,
      cameraProjectionDigest: expectedTarget.cameraProjectionDigest,
      corePixelCount,
      endpointMatchCount,
      evidenceId: expectedTarget.evidenceId,
      expectedRegion: expectedTarget.expectedRegion,
      largestConnectedCorePixelCount,
      matchedArcLengthBucketCount,
      matchedSpatialSampleCount,
      maximumConsecutiveMissingBuckets,
      objectId: expectedTarget.objectId,
      offCorridorCorePixelCount,
      offCorridorCorePixelRatio,
      onPathCorePixelCount,
      passed,
      primitiveId: expectedTarget.primitiveId,
      projectedGeometryDigest: expectedTarget.projectedGeometryDigest,
      projectedPointCount: expectedTarget.projectedPointCount,
      requiredSpatialSampleCount,
      role: expectedTarget.role,
      segmentCount: expectedTarget.segmentCount,
      spatialCoverageRatio,
      topology: expectedTarget.topology
    };
  });

  const expectedEvidenceIds = new Set(targetContract.map((target) => target.evidenceId));
  const unexpectedRadius = Math.max(3, Math.ceil(Math.min(input.width, input.height) * 0.015));
  for (const unexpectedTarget of lab.screenshotTargets.filter(
    (target) => !expectedEvidenceIds.has(target.evidenceId)
  )) {
    const approvedSameColorCorridor = new Uint8Array(pixelCount);
    for (const approved of targetContract) {
      const approvedTarget = screenshotTargetsById.get(approved.evidenceId);
      const colorsOverlap = approvedTarget?.displayColors.some((approvedColor) =>
        unexpectedTarget.displayColors.some(
          (unexpectedColor) => maximumChannelDelta(approvedColor, unexpectedColor) <= 64
        )
      ) === true;
      if (!colorsOverlap) continue;
      paintNormalizedCorridor(
        approvedSameColorCorridor,
        input.width,
        input.height,
        approved.projectedPoints,
        approved.topology === "point" ? unexpectedRadius * 2 : unexpectedRadius
      );
    }
    let unexpectedOffCorridorPixels = 0;
    for (let pixel = 0; pixel < pixelCount; pixel += 1) {
      if (approvedSameColorCorridor[pixel]) continue;
      const offset = pixel * input.channels;
      if (input.data[offset + 3] < 250) continue;
      const color: Rgb = [input.data[offset], input.data[offset + 1], input.data[offset + 2]];
      if (!unexpectedTarget.displayColors.some(
        (expected) => maximumChannelDelta(color, expected) <= 30
      )) continue;
      if (californiaPremiumWebGlContrastRatio(color, background) < CALIFORNIA_PREMIUM_WEBGL_MIN_CONTRAST_RATIO) {
        continue;
      }
      unexpectedOffCorridorPixels += 1;
    }
    const unexpectedPixelLimit = Math.max(4, unexpectedTarget.minimumCorePixels - 1);
    if (unexpectedOffCorridorPixels > unexpectedPixelLimit) {
      issues.push(
        `${lab.labId}:${unexpectedTarget.evidenceId}:unexpected-state-color-off-corridor:` +
        `pixels=${unexpectedOffCorridorPixels}>${unexpectedPixelLimit}`
      );
    }
  }

  return {
    backgroundCorePixelRatio,
    domSelfReportTrusted: false,
    issues,
    opaquePixelRatio,
    targetEvidence
  };
}

// Keep the runtime resolver itself in the executable contract: a role that is
// present in source IR but absent from the palette must resolve to the reviewed
// default color, and the source audit above still reports the missing role.
export function resolveCaliforniaPremiumWebGlRoleColor(role: string, accent: string) {
  return mathSceneColorForRole(role, accent);
}

function sha256Stable(value: unknown) {
  return createHash("sha256").update(stableSerialize(value)).digest("hex");
}

export function californiaPremiumWebGlCompositorBindingSha256(input: {
  captureToken: string;
  capturedUrl: string;
  clip: { height: number; width: number; x: number; y: number };
  compositorElapsedBracket: CaliforniaPremiumWebGlNumberBracket;
  compositorElapsedSeconds: number;
  compositorFrameIndexBracket: CaliforniaPremiumWebGlNumberBracket;
  compositorPngSha256: string;
  compositorRgbaSha256: string;
  stateKey: CaliforniaPremiumWebGlCaptureStateKey;
  targetContract: CaliforniaPremiumWebGlExpectedTargetContract[];
  timelineValueBracket: CaliforniaPremiumWebGlNumberBracket;
}) {
  return sha256Stable(input);
}

export function californiaPremiumWebGlPixelDifference(
  left: Uint8Array,
  right: Uint8Array,
  width: number,
  height: number
): CaliforniaPremiumWebGlCompositorDifference {
  const pixelCount = width * height;
  if (width <= 0 || height <= 0 || left.length !== pixelCount * 4 || right.length !== left.length) {
    throw new Error(`premium-webgl-pixel-difference-size:${width}x${height}:${left.length}!=${right.length}`);
  }
  let absoluteDelta = 0;
  let changedPixels = 0;
  for (let offset = 0; offset < left.length; offset += 4) {
    const redDelta = Math.abs(left[offset] - right[offset]);
    const greenDelta = Math.abs(left[offset + 1] - right[offset + 1]);
    const blueDelta = Math.abs(left[offset + 2] - right[offset + 2]);
    absoluteDelta += redDelta + greenDelta + blueDelta;
    if (Math.max(redDelta, greenDelta, blueDelta) >= 12) changedPixels += 1;
  }
  return {
    changedPixelRatio: changedPixels / pixelCount,
    meanAbsoluteDiffRatio: absoluteDelta / (pixelCount * 3 * 255)
  };
}

function rounded(value: number, places = 6) {
  const scale = 10 ** places;
  const result = Math.round(value * scale) / scale;
  return Object.is(result, -0) ? 0 : result;
}

function sceneDurationSeconds(scene: MathSceneSpec) {
  return scene.timeline.reduce((sum, step) => sum + Math.max(0, step.duration), 0);
}

function defaultElapsedSecondsForState(scene: MathSceneSpec, stateKey: CaliforniaPremiumWebGlCaptureStateKey) {
  const duration = sceneDurationSeconds(scene);
  if (stateKey === CALIFORNIA_PREMIUM_WEBGL_TEST_TERMINAL_STATE_KEY) return duration * 0.75;
  if (stateKey === "playing") return Math.min(duration, Math.max(0.25, duration * 0.08));
  return 0;
}

function authoredObjectVisibilityWindow(
  scene: MathSceneSpec,
  objectId: string,
  reviewedObject: ReviewedObjectContract
) {
  let cursor = 0;
  for (const step of scene.timeline) {
    if (step.type === "revealCurve" && step.objectId === objectId) {
      return { endSeconds: Number.POSITIVE_INFINITY, startSeconds: rounded(cursor, 9) };
    }
    if (reviewedObject.sourceObjectId && step.type === "moveAlongPath" &&
        step.objectId === reviewedObject.sourceObjectId) {
      return {
        endSeconds: rounded(cursor + Math.max(0, step.duration), 9),
        startSeconds: rounded(cursor, 9)
      };
    }
    cursor += Math.max(0, step.duration);
  }
  return { endSeconds: Number.POSITIVE_INFINITY, startSeconds: 0 };
}

function reviewedObjectShouldProjectAt(
  scene: MathSceneSpec,
  objectId: string,
  reviewedObject: ReviewedObjectContract,
  stateKey: CaliforniaPremiumWebGlCaptureStateKey,
  elapsedSeconds: number
) {
  if (reviewedObject.requiredProjectionStates?.includes(stateKey) !== true) return false;
  const { endSeconds, startSeconds } = authoredObjectVisibilityWindow(scene, objectId, reviewedObject);
  if (startSeconds === 0 &&
      reviewedObject.type !== "parametricCurve" && reviewedObject.type !== "trace") {
    return true;
  }
  return elapsedSeconds > startSeconds && elapsedSeconds <= endSeconds;
}

function projectPoint(
  point: Vec3,
  frame: ReturnType<typeof stepMathSceneFrame>["runtimeState"]["cameraDirector"]["frame"],
  aspectRatio: number
): CaliforniaPremiumWebGlProjectedPoint | null {
  const cameraPoint = projectWorldPointThroughCameraFrame(frame, point).cameraPoint;
  const depth = -cameraPoint[2];
  const tangent = Math.tan(frame.fov * Math.PI / 360);
  if (!Number.isFinite(depth) || depth <= 1e-4 || !Number.isFinite(tangent) || tangent <= 0) return null;
  const x = (cameraPoint[0] / (depth * tangent * aspectRatio) + 1) / 2;
  const y = (1 - cameraPoint[1] / (depth * tangent)) / 2;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return [rounded(x), rounded(y)];
}

function distinctProjectedPoints(points: CaliforniaPremiumWebGlProjectedPoint[]) {
  return points.filter((point, index) => index === 0 ||
    Math.hypot(point[0] - points[index - 1][0], point[1] - points[index - 1][1]) > 1e-6);
}

function sampledProjectedPath(
  points: CaliforniaPremiumWebGlProjectedPoint[],
  topology: CaliforniaPremiumWebGlExpectedTargetContract["topology"]
) {
  if (topology === "point") return points.slice(0, 1);
  const dense: CaliforniaPremiumWebGlProjectedPoint[] = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
    const steps = Math.max(1, Math.min(24, Math.ceil(length * 72)));
    for (let step = 0; step < steps; step += 1) {
      const alpha = step / steps;
      dense.push([
        rounded(start[0] + (end[0] - start[0]) * alpha),
        rounded(start[1] + (end[1] - start[1]) * alpha)
      ]);
    }
  }
  if (points.length > 0) dense.push(points.at(-1)!);
  const visible = dense.filter(([x, y]) => x >= -0.03 && x <= 1.03 && y >= -0.03 && y <= 1.03);
  if (visible.length <= 96) return visible;
  return Array.from({ length: 96 }, (_, index) =>
    visible[Math.round(index * (visible.length - 1) / 95)]
  );
}

function projectedPathMetrics(points: CaliforniaPremiumWebGlProjectedPoint[]) {
  if (points.length === 0) return { arcLength: 0, extent: 0 };
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const arcLength = points.slice(1).reduce((sum, point, index) =>
    sum + Math.hypot(point[0] - points[index][0], point[1] - points[index][1]), 0);
  return {
    arcLength,
    extent: Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))
  };
}

function expectedRegionFor(points: CaliforniaPremiumWebGlProjectedPoint[]): CaliforniaPremiumWebGlExpectedRegion {
  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);
  const margin = 0.035;
  return {
    maxX: rounded(Math.min(1, Math.max(...xs) + margin)),
    maxY: rounded(Math.min(1, Math.max(...ys) + margin)),
    minX: rounded(Math.max(0, Math.min(...xs) - margin)),
    minY: rounded(Math.max(0, Math.min(...ys) - margin))
  };
}

function runtimeTargetPoints(
  target: CaliforniaPremiumWebGlScreenshotTarget,
  runtimeObject: ReturnType<typeof stepMathSceneFrame>["runtimeState"]["objectGraph"]["byId"][string]
) {
  const renderState = runtimeObject.renderState;
  if (renderState.kind === "axes") {
    if (target.primitiveId === "axis-x") return renderState.xAxisPoints;
    if (target.primitiveId === "axis-y") return renderState.yAxisPoints;
    if (target.primitiveId === "axis-z") return renderState.zAxisPoints;
    return [];
  }
  if (renderState.kind === "point") return [renderState.position];
  if (renderState.kind === "vector") return [renderState.from, renderState.to];
  if (renderState.kind !== "polyline") return [];
  if (runtimeObject.spec.type !== "parametricCurve") return renderState.points;
  if (renderState.points.length <= 2) return renderState.points;
  return sampleSmoothVMobjectPathFromAnchors({
    conceptId: runtimeObject.conceptId,
    id: runtimeObject.id,
    points: renderState.points
  });
}

const californiaPremiumWebGlSceneProjectionCache = new Map<
  string,
  CaliforniaPremiumWebGlSceneProjectionContract
>();

export function californiaPremiumWebGlExpectedSceneProjectionForLab(
  labId: string,
  stateKey: CaliforniaPremiumWebGlCaptureStateKey,
  options: {
    elapsedSeconds?: number;
    height?: number;
    sceneOverride?: MathSceneSpec;
    width?: number;
  } = {}
): CaliforniaPremiumWebGlSceneProjectionContract {
  const cacheKey = stableSerialize({
    elapsedSeconds: options.elapsedSeconds ?? "default",
    height: options.height ?? 112,
    labId,
    stateKey,
    width: options.width ?? 180
  });
  const cached = options.sceneOverride
    ? undefined
    : californiaPremiumWebGlSceneProjectionCache.get(cacheKey);
  if (cached) return structuredClone(cached);
  const sourceAudit = auditCaliforniaPremiumWebGlGraphicsContracts();
  if (sourceAudit.issues.length > 0) {
    throw new Error(`premium-webgl-source-contract-failed:${sourceAudit.issues.join("|")}`);
  }
  const lab = sourceAudit.labs.find((candidate) => candidate.labId === labId);
  if (!lab) throw new Error(`premium-webgl-live-lab-not-reviewed:${labId}`);
  const catalogLab = visualizationLabCatalog.find((candidate) => candidate.labId === labId);
  const scene = options.sceneOverride ??
    (catalogLab ? buildCaliforniaPremiumWebGlSceneForLab(catalogLab) : null);
  if (!scene) throw new Error(`premium-webgl-scene-unavailable:${labId}`);
  const width = options.width ?? 180;
  const height = options.height ?? 112;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error(`premium-webgl-projection-size-invalid:${width}x${height}`);
  }
  const requestedElapsedSeconds = options.elapsedSeconds ?? defaultElapsedSecondsForState(scene, stateKey);
  const frameStep = stepMathSceneFrame(scene, {
    deltaSeconds: 0,
    elapsedSeconds: requestedElapsedSeconds,
    frameIndex: Math.max(0, Math.round(requestedElapsedSeconds * 60))
  });
  const elapsedSeconds = rounded(frameStep.preciseElapsedSeconds, 6);
  const aspectRatio = width / height;
  const cameraFrame = frameStep.runtimeState.cameraDirector.frame;
  const cameraProjectionDigest = sha256Stable({
    aspectRatio: rounded(aspectRatio, 9),
    fov: cameraFrame.fov,
    frameId: cameraFrame.id,
    orientation: cameraFrame.orientation,
    position: cameraFrame.position,
    target: cameraFrame.target,
    viewMatrix: cameraFrame.viewMatrix
  });
  const reviewedFamily = (californiaPremiumWebGlReviewedContracts as
    Record<string, ReviewedFamilyContract>)[labId];
  const targetContract = lab.screenshotTargets.flatMap((target): CaliforniaPremiumWebGlExpectedTargetContract[] => {
    const reviewedObject = reviewedFamily?.objects[target.objectId];
    if (!reviewedObject) throw new Error(`premium-webgl-reviewed-object-missing:${labId}:${target.objectId}`);
    const visibilityWindow = authoredObjectVisibilityWindow(scene, target.objectId, reviewedObject);
    const projectionRequired = reviewedObjectShouldProjectAt(
      scene,
      target.objectId,
      reviewedObject,
      stateKey,
      elapsedSeconds
    );
    if (!projectionRequired) return [];
    const runtimeObject = frameStep.runtimeState.objectGraph.byId[target.objectId];
    if (!runtimeObject) {
      if (projectionRequired) throw new Error(`premium-webgl-required-projection-object-missing:${labId}:${stateKey}:${target.objectId}`);
      return [];
    }
    const topology = runtimeObject.renderState.kind === "point"
      ? "point" as const
      : runtimeObject.renderState.kind === "vector" || runtimeObject.renderState.kind === "axes"
        ? "segment" as const
        : "line-strip" as const;
    const worldPoints = runtimeTargetPoints(target, runtimeObject);
    const projected = distinctProjectedPoints(worldPoints.flatMap((point) => {
      const result = projectPoint(point, cameraFrame, aspectRatio);
      return result ? [result] : [];
    }));
    if (projected.length < (topology === "point" ? 1 : 2)) {
      if (projectionRequired) throw new Error(`premium-webgl-required-projection-empty:${labId}:${stateKey}:${target.evidenceId}`);
      return [];
    }
    const sampled = sampledProjectedPath(projected, topology);
    if (sampled.length < (topology === "point" ? 1 : 2)) {
      if (projectionRequired) throw new Error(`premium-webgl-required-projection-off-camera:${labId}:${stateKey}:${target.evidenceId}`);
      return [];
    }
    const projectedMetrics = projectedPathMetrics(sampled);
    if (topology !== "point" && (projectedMetrics.extent <= 1e-5 || projectedMetrics.arcLength <= 1e-5)) {
      if (projectionRequired) throw new Error(`premium-webgl-required-projection-degenerate:${labId}:${stateKey}:${target.evidenceId}`);
      return [];
    }
    const segmentCount = topology === "point" ? 0 : projected.length - 1;
    const approvedSemanticDigest = sha256Stable({
      approvedGeometryDigest: reviewedObject.approvedGeometryDigest ?? null,
      conceptId: reviewedObject.conceptId,
      objectId: target.objectId,
      pathObjectId: reviewedObject.pathObjectId ?? null,
      requiredProjectionStates: reviewedObject.requiredProjectionStates ?? [],
      sourceObjectId: reviewedObject.sourceObjectId ?? null,
      type: reviewedObject.type,
      visibilityWindow
    });
    const arcLengthBucketCount = topology === "point"
      ? 1
      : Math.max(8, Math.min(20, Math.ceil(projectedMetrics.arcLength * 40)));
    const projectedGeometryDigest = sha256Stable({
      evidenceId: target.evidenceId,
      objectId: target.objectId,
      primitiveId: target.primitiveId,
      projected,
      segmentCount,
      topology
    });
    return [{
      approvedSemanticDigest,
      arcLengthBucketCount,
      cameraProjectionDigest,
      conceptId: reviewedObject.conceptId,
      evidenceId: target.evidenceId,
      expectedRegion: expectedRegionFor(sampled),
      maximumConsecutiveMissingBuckets: topology === "point" ? 0 : 2,
      maximumOffCorridorCorePixelRatio: 0.12,
      minimumConnectedPixels: target.minimumConnectedPixels,
      minimumCorePixels: target.minimumCorePixels,
      minimumEndpointMatchCount: topology === "point" ? 1 : 2,
      minimumMatchedArcLengthBucketCount: topology === "point" ? 1 : Math.max(1, arcLengthBucketCount - 2),
      minimumOnPathCorePixels: target.minimumCorePixels,
      minimumSpatialCoverageRatio: target.opacity < 1 ? 0.35 : topology === "point" ? 1 : 0.55,
      objectId: target.objectId,
      pathObjectId: runtimeObject.spec.type === "movingPoint" ? runtimeObject.spec.pathObjectId : null,
      primitiveId: target.primitiveId,
      projectedArcLength: rounded(projectedMetrics.arcLength, 9),
      projectedExtent: rounded(projectedMetrics.extent, 9),
      projectedGeometryDigest,
      projectedPointCount: projected.length,
      projectedPoints: sampled,
      role: target.role,
      segmentCount,
      sourceObjectId: runtimeObject.spec.type === "trace" ? runtimeObject.spec.sourceObjectId : null,
      topology
    }];
  }).sort((left, right) => left.evidenceId.localeCompare(right.evidenceId));
  const renderedObjectCount = new Set(targetContract.map((target) => target.objectId)).size;
  const sceneTopologyDigest = sha256Stable({
    objects: scene.objects.map((object) => ({
      id: object.id,
      pathObjectId: object.type === "movingPoint" ? object.pathObjectId : undefined,
      sourceObjectId: object.type === "trace" ? object.sourceObjectId : undefined,
      type: object.type
    })),
    targets: targetContract.map((target) => ({
      evidenceId: target.evidenceId,
      objectId: target.objectId,
      primitiveId: target.primitiveId,
      projectedGeometryDigest: target.projectedGeometryDigest,
      segmentCount: target.segmentCount,
      topology: target.topology
    }))
  });
  const projection = {
    cameraProjectionDigest,
    elapsedSeconds,
    projectionAspectRatio: rounded(aspectRatio, 9),
    renderedObjectCount,
    sceneObjectCount: scene.objects.length,
    sceneTopologyDigest,
    targetContract
  } satisfies CaliforniaPremiumWebGlSceneProjectionContract;
  if (!options.sceneOverride) californiaPremiumWebGlSceneProjectionCache.set(cacheKey, projection);
  return structuredClone(projection);
}

function expectedPlaybackStateForCaptureState(stateKey: CaliforniaPremiumWebGlCaptureStateKey) {
  return stateKey === CALIFORNIA_PREMIUM_WEBGL_TEST_TERMINAL_STATE_KEY
    ? "scrubbing" as const
    : stateKey === "playing"
      ? "playing" as const
      : "paused" as const;
}

function isCaliforniaPremiumWebGlProductionStateKey(
  value: string
): value is CaliforniaPremiumWebGlProductionStateKey {
  return (californiaPremiumWebGlProductionStateKeys as readonly string[]).includes(value);
}

export function californiaPremiumWebGlExpectedTargetContractForLab(
  labId: string,
  stateKey: CaliforniaPremiumWebGlCaptureStateKey,
  options: { elapsedSeconds?: number; height?: number; width?: number } = {}
): CaliforniaPremiumWebGlExpectedTargetContract[] {
  return californiaPremiumWebGlExpectedSceneProjectionForLab(labId, stateKey, options).targetContract;
}

export type CaliforniaPremiumWebGlRetainedEvidenceAuditOptions = {
  allowTestTerminalState?: boolean;
  enforceFreshness?: boolean;
  expectedStateKey?: CaliforniaPremiumWebGlCaptureStateKey;
  nowMs?: number;
};

/**
 * Verify the compact evidence retained by the broad matrix/ledger. This is an
 * exact contract, not a "some pixels existed" check: identities, roles,
 * thresholds, source provenance, palette provenance, dimensions, hashes and
 * state/playback coupling must all match the live catalog-derived contract.
 */
export function auditCaliforniaPremiumWebGlRetainedContrastEvidence(
  evidence: CaliforniaPremiumWebGlRegisteredContrastEvidence,
  options: CaliforniaPremiumWebGlRetainedEvidenceAuditOptions = {}
) {
  const issues: string[] = [];
  const sourceAudit = auditCaliforniaPremiumWebGlGraphicsContracts();
  issues.push(...sourceAudit.issues.map((issue) => `source:${issue}`));
  const lab = sourceAudit.labs.find((candidate) => candidate.labId === evidence.labId);

  if (evidence.providerVersion !== CALIFORNIA_PREMIUM_WEBGL_CONTRAST_PROVIDER_VERSION) {
    issues.push(`provider-version=${String(evidence.providerVersion)}!=${CALIFORNIA_PREMIUM_WEBGL_CONTRAST_PROVIDER_VERSION}`);
  }
  if (evidence.sourceContract !== CALIFORNIA_PREMIUM_WEBGL_GRAPHICS_SOURCE_CONTRACT) {
    issues.push("source-contract-mismatch");
  }
  if (evidence.visualPaletteSourceContract !== MATH_SCENE_VISUAL_PALETTE_SOURCE_CONTRACT) {
    issues.push("visual-palette-source-contract-mismatch");
  }
  if (!lab) issues.push(`live-lab-not-reviewed:${evidence.labId}`);

  const stateAllowed = isCaliforniaPremiumWebGlProductionStateKey(evidence.stateKey) ||
    (options.allowTestTerminalState === true &&
      evidence.stateKey === CALIFORNIA_PREMIUM_WEBGL_TEST_TERMINAL_STATE_KEY);
  if (!stateAllowed) issues.push(`state-key-not-allowed:${String(evidence.stateKey)}`);
  if (options.expectedStateKey && evidence.stateKey !== options.expectedStateKey) {
    issues.push(`state-key=${evidence.stateKey}!=${options.expectedStateKey}`);
  }
  if (stateAllowed && evidence.playbackState !== expectedPlaybackStateForCaptureState(evidence.stateKey)) {
    issues.push(
      `state-key-playback=${evidence.playbackState}!=${expectedPlaybackStateForCaptureState(evidence.stateKey)}`
    );
  }

  let routeLabId = "";
  try {
    routeLabId = decodeURIComponent(new URL(evidence.capturedUrl).pathname.split("/").filter(Boolean).at(-1) ?? "");
  } catch {
    issues.push("captured-url-invalid");
  }
  if (routeLabId && routeLabId !== evidence.labId) {
    issues.push(`captured-url-lab=${routeLabId}!=${evidence.labId}`);
  }

  const positiveDimensions = [
    ["backing-width", evidence.backingWidth],
    ["backing-height", evidence.backingHeight],
    ["bitmap-width", evidence.bitmapWidth],
    ["bitmap-height", evidence.bitmapHeight],
    ["css-width", evidence.cssWidth],
    ["css-height", evidence.cssHeight],
    ["device-pixel-ratio", evidence.devicePixelRatio],
    ["png-byte-length", evidence.bitmapPngByteLength],
    ["compositor-width", evidence.compositorWidth],
    ["compositor-height", evidence.compositorHeight],
    ["compositor-png-byte-length", evidence.compositorPngByteLength],
    ["projection-aspect-ratio", evidence.projectionAspectRatio],
    ["compositor-projection-aspect-ratio", evidence.compositorProjectionAspectRatio],
    ["scene-object-count", evidence.sceneObjectCount],
    ["rendered-object-count", evidence.renderedObjectCount],
    ["compositor-scene-object-count", evidence.compositorSceneObjectCount],
    ["compositor-rendered-object-count", evidence.compositorRenderedObjectCount]
  ] as const;
  for (const [label, value] of positiveDimensions) {
    if (!Number.isFinite(value) || value <= 0) issues.push(`${label}-invalid:${String(value)}`);
  }
  if (evidence.bitmapWidth !== evidence.backingWidth || evidence.bitmapHeight !== evidence.backingHeight) {
    issues.push(
      `bitmap-backing-size-mismatch:${evidence.bitmapWidth}x${evidence.bitmapHeight}` +
      `!=${evidence.backingWidth}x${evidence.backingHeight}`
    );
  }
  if (![evidence.cssX, evidence.cssY, evidence.pageX, evidence.pageY].every(Number.isFinite)) {
    issues.push("css-position-invalid");
  }
  if (!Number.isFinite(evidence.elapsedSeconds) || evidence.elapsedSeconds < 0 ||
      !Number.isInteger(evidence.frameIndex) || evidence.frameIndex < 0 ||
      !Number.isFinite(evidence.compositorElapsedSeconds) || evidence.compositorElapsedSeconds < 0) {
    issues.push("runtime-time-metadata-invalid");
  }
  const monotonicBracket = (
    bracket: CaliforniaPremiumWebGlNumberBracket,
    integer = false
  ) => Number.isFinite(bracket?.before) && Number.isFinite(bracket?.after) &&
    bracket.before >= 0 && bracket.after >= bracket.before &&
    (!integer || (Number.isInteger(bracket.before) && Number.isInteger(bracket.after)));
  if (!monotonicBracket(evidence.rendererElapsedBracket) ||
      !monotonicBracket(evidence.rendererFrameIndexBracket, true) ||
      !monotonicBracket(evidence.timelineValueBracket) ||
      !monotonicBracket(evidence.compositorElapsedBracket) ||
      !monotonicBracket(evidence.compositorFrameIndexBracket, true) ||
      !monotonicBracket(evidence.compositorTimelineValueBracket)) {
    issues.push("runtime-time-bracket-invalid");
  } else {
    if (evidence.elapsedSeconds !== evidence.rendererElapsedBracket.after ||
        evidence.frameIndex !== evidence.rendererFrameIndexBracket.after ||
        evidence.timelineValue !== evidence.timelineValueBracket.after) {
      issues.push("renderer-time-bracket-binding-mismatch");
    }
    if (evidence.compositorElapsedSeconds !== evidence.compositorElapsedBracket.before) {
      issues.push("compositor-time-must-bind-lower-fence-not-average");
    }
  }
  if (evidence.stateKey === "default" || evidence.stateKey === "reset") {
    const canonicalElapsedTolerance = 0.002;
    const canonicalTime = evidence.elapsedSeconds <= canonicalElapsedTolerance &&
      evidence.rendererElapsedBracket.before <= canonicalElapsedTolerance &&
      evidence.rendererElapsedBracket.after <= canonicalElapsedTolerance &&
      evidence.compositorElapsedBracket.before <= canonicalElapsedTolerance &&
      evidence.compositorElapsedBracket.after <= canonicalElapsedTolerance &&
      evidence.frameIndex === 0 &&
      evidence.rendererFrameIndexBracket.before === 0 && evidence.rendererFrameIndexBracket.after === 0 &&
      evidence.compositorFrameIndexBracket.before === 0 && evidence.compositorFrameIndexBracket.after === 0 &&
      evidence.timelineValue === 0 &&
      evidence.timelineValueBracket.before === 0 && evidence.timelineValueBracket.after === 0 &&
      evidence.compositorTimelineValueBracket.before === 0 &&
      evidence.compositorTimelineValueBracket.after === 0;
    if (!canonicalTime) issues.push(`${evidence.stateKey}-canonical-time`);
  }
  if (!Number.isFinite(evidence.captureStartedAtMs) || !Number.isFinite(evidence.captureEndedAtMs) ||
      evidence.captureStartedAtMs <= 0 || evidence.captureEndedAtMs < evidence.captureStartedAtMs) {
    issues.push("capture-timestamps-invalid");
  }
  if (evidence.captureEndedAtMs - evidence.captureStartedAtMs > 30_000) {
    issues.push("capture-duration-excessive");
  }
  if (!Number.isFinite(evidence.compositorCaptureStartedAtMs) ||
      !Number.isFinite(evidence.compositorCaptureEndedAtMs) ||
      evidence.compositorCaptureStartedAtMs < evidence.captureStartedAtMs ||
      evidence.compositorCaptureEndedAtMs < evidence.compositorCaptureStartedAtMs ||
      evidence.compositorCaptureEndedAtMs - evidence.compositorCaptureStartedAtMs > 30_000) {
    issues.push("compositor-capture-timestamps-invalid");
  }
  if (options.enforceFreshness === true &&
      (options.nowMs ?? Date.now()) - evidence.compositorCaptureEndedAtMs > CALIFORNIA_PREMIUM_WEBGL_CAPTURE_MAX_AGE_MS) {
    issues.push("terminal-evidence-stale");
  }
  if (!/^[0-9a-f]{32}$/.test(evidence.captureToken)) issues.push("capture-token-invalid");
  if (!/^[0-9a-f]{64}$/.test(evidence.bitmapPngSha256)) issues.push("bitmap-png-sha256-invalid");
  if (!/^[0-9a-f]{64}$/.test(evidence.bitmapRgbaSha256)) issues.push("bitmap-rgba-sha256-invalid");
  if (!/^[0-9a-f]{64}$/.test(evidence.cameraProjectionDigest)) issues.push("camera-projection-digest-invalid");
  if (!/^[0-9a-f]{64}$/.test(evidence.sceneTopologyDigest)) issues.push("scene-topology-digest-invalid");
  if (!/^[0-9a-f]{64}$/.test(evidence.compositorPngSha256)) issues.push("compositor-png-sha256-invalid");
  if (!/^[0-9a-f]{64}$/.test(evidence.compositorRgbaSha256)) issues.push("compositor-rgba-sha256-invalid");
  if (!/^[0-9a-f]{64}$/.test(evidence.compositorBindingSha256)) issues.push("compositor-binding-sha256-invalid");
  if (!/^[0-9a-f]{64}$/.test(evidence.compositorCameraProjectionDigest)) {
    issues.push("compositor-camera-projection-digest-invalid");
  }
  if (!/^[0-9a-f]{64}$/.test(evidence.compositorSceneTopologyDigest)) {
    issues.push("compositor-scene-topology-digest-invalid");
  }
  if (evidence.terminalIssues.length > 0) issues.push("terminal-audit-issues-present");
  if (!Number.isFinite(evidence.opaquePixelRatio) || evidence.opaquePixelRatio < 0.999) {
    issues.push("terminal-raster-not-opaque");
  }
  if (!Number.isFinite(evidence.backgroundCorePixelRatio) || evidence.backgroundCorePixelRatio < 0.12) {
    issues.push("terminal-background-core-missing");
  }
  if (evidence.compositorIssues.length > 0) issues.push("compositor-audit-issues-present");
  if (!Number.isFinite(evidence.compositorOpaquePixelRatio) || evidence.compositorOpaquePixelRatio < 0.999) {
    issues.push("compositor-raster-not-opaque");
  }
  if (!Number.isFinite(evidence.compositorBackgroundCorePixelRatio) ||
      evidence.compositorBackgroundCorePixelRatio < 0.12) {
    issues.push("compositor-background-core-missing");
  }
  const expectedClip = {
    x: Math.max(0, Math.floor(evidence.pageX)),
    y: Math.max(0, Math.floor(evidence.pageY)),
    width: Math.max(1, Math.ceil(evidence.pageX + evidence.cssWidth) - Math.floor(evidence.pageX)),
    height: Math.max(1, Math.ceil(evidence.pageY + evidence.cssHeight) - Math.floor(evidence.pageY))
  };
  if (stableSerialize(evidence.compositorClip) !== stableSerialize(expectedClip)) {
    issues.push("compositor-clip-mismatch");
  }
  if (Math.abs(evidence.compositorWidth - evidence.compositorClip.width) > 1 ||
      Math.abs(evidence.compositorHeight - evidence.compositorClip.height) > 1) {
    issues.push("compositor-bitmap-clip-size-mismatch");
  }

  if (lab) {
    const internalProjection = californiaPremiumWebGlExpectedSceneProjectionForLab(evidence.labId, evidence.stateKey, {
      elapsedSeconds: evidence.elapsedSeconds,
      height: evidence.bitmapHeight,
      width: evidence.bitmapWidth
    });
    const compositorProjection = californiaPremiumWebGlExpectedSceneProjectionForLab(evidence.labId, evidence.stateKey, {
      elapsedSeconds: evidence.compositorElapsedSeconds,
      height: evidence.compositorHeight,
      width: evidence.compositorWidth
    });
    if (evidence.stateKey === "default" || evidence.stateKey === "reset") {
      const canonicalInternalProjection = californiaPremiumWebGlExpectedSceneProjectionForLab(
        evidence.labId,
        evidence.stateKey,
        { elapsedSeconds: 0, height: evidence.bitmapHeight, width: evidence.bitmapWidth }
      );
      const canonicalCompositorProjection = californiaPremiumWebGlExpectedSceneProjectionForLab(
        evidence.labId,
        evidence.stateKey,
        { elapsedSeconds: 0, height: evidence.compositorHeight, width: evidence.compositorWidth }
      );
      if (evidence.cameraProjectionDigest !== canonicalInternalProjection.cameraProjectionDigest ||
          evidence.sceneTopologyDigest !== canonicalInternalProjection.sceneTopologyDigest ||
          stableSerialize(evidence.targetContract) !== stableSerialize(canonicalInternalProjection.targetContract) ||
          evidence.compositorCameraProjectionDigest !== canonicalCompositorProjection.cameraProjectionDigest ||
          evidence.compositorSceneTopologyDigest !== canonicalCompositorProjection.sceneTopologyDigest ||
          stableSerialize(evidence.compositorTargetContract) !==
            stableSerialize(canonicalCompositorProjection.targetContract)) {
        issues.push(`${evidence.stateKey}-canonical-camera-projection`);
      }
    }
    if (stableSerialize(evidence.targetContract) !== stableSerialize(internalProjection.targetContract)) {
      issues.push("target-contract-mismatch");
    }
    if (stableSerialize(evidence.compositorTargetContract) !== stableSerialize(compositorProjection.targetContract)) {
      issues.push("compositor-target-contract-mismatch");
    }
    if (evidence.cameraProjectionDigest !== internalProjection.cameraProjectionDigest ||
        evidence.projectionAspectRatio !== internalProjection.projectionAspectRatio ||
        evidence.sceneObjectCount !== internalProjection.sceneObjectCount ||
        evidence.renderedObjectCount !== internalProjection.renderedObjectCount ||
        evidence.sceneTopologyDigest !== internalProjection.sceneTopologyDigest) {
      issues.push("scene-projection-contract-mismatch");
    }
    if (evidence.compositorCameraProjectionDigest !== compositorProjection.cameraProjectionDigest ||
        evidence.compositorProjectionAspectRatio !== compositorProjection.projectionAspectRatio ||
        evidence.compositorSceneObjectCount !== compositorProjection.sceneObjectCount ||
        evidence.compositorRenderedObjectCount !== compositorProjection.renderedObjectCount ||
        evidence.compositorSceneTopologyDigest !== compositorProjection.sceneTopologyDigest) {
      issues.push("compositor-scene-projection-contract-mismatch");
    }

    const validateTargetEvidence = (
      expectedTargets: CaliforniaPremiumWebGlExpectedTargetContract[],
      actualTargets: CaliforniaPremiumWebGlScreenshotTargetEvidence[],
      prefix: string
    ) => {
      const actualById = new Map<string, CaliforniaPremiumWebGlScreenshotTargetEvidence>();
      for (const target of actualTargets) {
        if (actualById.has(target.evidenceId)) issues.push(`${prefix}-target-evidence-duplicate:${target.evidenceId}`);
        actualById.set(target.evidenceId, target);
      }
      if (actualById.size !== expectedTargets.length || actualTargets.length !== expectedTargets.length) {
        issues.push(`${prefix}-target-evidence-count=${actualTargets.length}!=${expectedTargets.length}`);
      }
      for (const expected of expectedTargets) {
        const actual = actualById.get(expected.evidenceId);
        if (!actual) {
          issues.push(`${prefix}-target-evidence-missing:${expected.evidenceId}`);
          continue;
        }
        if (actual.objectId !== expected.objectId || actual.primitiveId !== expected.primitiveId ||
            actual.role !== expected.role || actual.topology !== expected.topology ||
            actual.segmentCount !== expected.segmentCount ||
            actual.projectedPointCount !== expected.projectedPointCount ||
            actual.cameraProjectionDigest !== expected.cameraProjectionDigest ||
            actual.projectedGeometryDigest !== expected.projectedGeometryDigest ||
            stableSerialize(actual.expectedRegion) !== stableSerialize(expected.expectedRegion)) {
          issues.push(`${prefix}-target-object-or-projection-mismatch:${expected.evidenceId}`);
        }
        if (actual.corePixelCount < expected.minimumCorePixels) {
          issues.push(`${prefix}-target-core=${actual.corePixelCount}<${expected.minimumCorePixels}:${expected.evidenceId}`);
        }
        if (actual.largestConnectedCorePixelCount < expected.minimumConnectedPixels) {
          issues.push(
            `${prefix}-target-connected=${actual.largestConnectedCorePixelCount}<${expected.minimumConnectedPixels}:` +
            expected.evidenceId
          );
        }
        if (actual.largestConnectedCorePixelCount > actual.corePixelCount) {
          issues.push(`${prefix}-target-connected-exceeds-core:${expected.evidenceId}`);
        }
        if (actual.requiredSpatialSampleCount <= 0 ||
            actual.matchedSpatialSampleCount < actual.requiredSpatialSampleCount ||
            actual.spatialCoverageRatio < expected.minimumSpatialCoverageRatio) {
          issues.push(`${prefix}-target-spatial-coverage-invalid:${expected.evidenceId}`);
        }
        if (actual.arcLengthBucketCount !== expected.arcLengthBucketCount ||
            actual.matchedArcLengthBucketCount < expected.minimumMatchedArcLengthBucketCount ||
            actual.maximumConsecutiveMissingBuckets > expected.maximumConsecutiveMissingBuckets ||
            actual.endpointMatchCount < expected.minimumEndpointMatchCount) {
          issues.push(`${prefix}-target-arc-topology-coverage-invalid:${expected.evidenceId}`);
        }
        if (actual.onPathCorePixelCount < expected.minimumOnPathCorePixels ||
            actual.offCorridorCorePixelCount < 0 ||
            actual.offCorridorCorePixelRatio < 0 || actual.offCorridorCorePixelRatio > 1 ||
            actual.offCorridorCorePixelRatio > expected.maximumOffCorridorCorePixelRatio) {
          issues.push(`${prefix}-target-path-corridor-invalid:${expected.evidenceId}`);
        }
        const computedPass = actual.corePixelCount >= expected.minimumCorePixels &&
          actual.largestConnectedCorePixelCount >= expected.minimumConnectedPixels &&
          actual.matchedSpatialSampleCount >= actual.requiredSpatialSampleCount &&
          actual.spatialCoverageRatio >= expected.minimumSpatialCoverageRatio &&
          actual.arcLengthBucketCount === expected.arcLengthBucketCount &&
          actual.matchedArcLengthBucketCount >= expected.minimumMatchedArcLengthBucketCount &&
          actual.maximumConsecutiveMissingBuckets <= expected.maximumConsecutiveMissingBuckets &&
          actual.endpointMatchCount >= expected.minimumEndpointMatchCount &&
          actual.onPathCorePixelCount >= expected.minimumOnPathCorePixels &&
          actual.offCorridorCorePixelCount >= 0 &&
          actual.offCorridorCorePixelRatio >= 0 && actual.offCorridorCorePixelRatio <= 1 &&
          actual.offCorridorCorePixelRatio <= expected.maximumOffCorridorCorePixelRatio;
        if (!actual.passed || actual.passed !== computedPass) {
          issues.push(`${prefix}-target-pass-invalid:${expected.evidenceId}`);
        }
      }
    };
    validateTargetEvidence(internalProjection.targetContract, evidence.targetEvidence, "internal");
    validateTargetEvidence(compositorProjection.targetContract, evidence.compositorTargetEvidence, "compositor");

    const expectedCompositorBinding = californiaPremiumWebGlCompositorBindingSha256({
      captureToken: evidence.captureToken,
      capturedUrl: evidence.capturedUrl,
      clip: evidence.compositorClip,
      compositorElapsedBracket: evidence.compositorElapsedBracket,
      compositorElapsedSeconds: evidence.compositorElapsedSeconds,
      compositorFrameIndexBracket: evidence.compositorFrameIndexBracket,
      compositorPngSha256: evidence.compositorPngSha256,
      compositorRgbaSha256: evidence.compositorRgbaSha256,
      stateKey: evidence.stateKey,
      targetContract: evidence.compositorTargetContract,
      timelineValueBracket: evidence.compositorTimelineValueBracket
    });
    if (evidence.compositorBindingSha256 !== expectedCompositorBinding) {
      issues.push("compositor-binding-sha256-mismatch");
    }
  }

  return issues;
}

export function auditCaliforniaPremiumWebGlStateSequence(
  evidenceEntries: readonly CaliforniaPremiumWebGlRegisteredContrastEvidence[]
) {
  const issues: string[] = [];
  const byState = new Map<CaliforniaPremiumWebGlProductionStateKey, CaliforniaPremiumWebGlRegisteredContrastEvidence>();
  for (const evidence of evidenceEntries) {
    if (!isCaliforniaPremiumWebGlProductionStateKey(evidence.stateKey)) {
      issues.push(`state-sequence-key-invalid:${String(evidence.stateKey)}`);
      continue;
    }
    if (byState.has(evidence.stateKey)) issues.push(`state-sequence-duplicate:${evidence.stateKey}`);
    byState.set(evidence.stateKey, evidence);
  }
  for (const stateKey of californiaPremiumWebGlProductionStateKeys) {
    if (!byState.has(stateKey)) issues.push(`state-sequence-missing:${stateKey}`);
  }
  if (issues.length > 0) return issues;

  const defaultEvidence = byState.get("default")!;
  const playingEvidence = byState.get("playing")!;
  const resetEvidence = byState.get("reset")!;
  if (new Set(evidenceEntries.map((entry) => entry.labId)).size !== 1) {
    issues.push("state-sequence-lab-mismatch");
  }
  if (new Set(evidenceEntries.map((entry) => entry.capturedUrl)).size !== 1) {
    issues.push("state-sequence-route-mismatch");
  }
  if (defaultEvidence.playingCompositorSamples.length !== 0 ||
      resetEvidence.playingCompositorSamples.length !== 0) {
    issues.push("playing-compositor-samples-on-nonplaying-state");
  }
  const playingCompositorSamples = playingEvidence.playingCompositorSamples;
  if (playingCompositorSamples.length !== 2) {
    issues.push(`playing-compositor-sample-count=${playingCompositorSamples.length}!=2`);
    return issues;
  }
  const firstPlaying = playingCompositorSamples[0];
  const secondPlaying = playingCompositorSamples[1];
  if (firstPlaying.captureToken !== playingEvidence.captureToken ||
      firstPlaying.compositorPngSha256 !== playingEvidence.compositorPngSha256 ||
      firstPlaying.compositorRgbaSha256 !== playingEvidence.compositorRgbaSha256 ||
      firstPlaying.compositorBindingSha256 !== playingEvidence.compositorBindingSha256 ||
      stableSerialize(firstPlaying.compositorElapsedBracket) !==
        stableSerialize(playingEvidence.compositorElapsedBracket) ||
      stableSerialize(firstPlaying.compositorFrameIndexBracket) !==
        stableSerialize(playingEvidence.compositorFrameIndexBracket) ||
      stableSerialize(firstPlaying.timelineValueBracket) !==
        stableSerialize(playingEvidence.compositorTimelineValueBracket)) {
    issues.push("playing-first-compositor-sample-not-base-capture");
  }
  const sequenceTokens = [
    defaultEvidence.captureToken,
    firstPlaying.captureToken,
    secondPlaying.captureToken,
    resetEvidence.captureToken
  ];
  if (new Set(sequenceTokens).size !== sequenceTokens.length ||
      sequenceTokens.some((token) => !/^[0-9a-f]{32}$/.test(token))) {
    issues.push("state-sequence-capture-tokens-not-unique-ordered");
  }
  if (firstPlaying.captureStartedAtMs <= defaultEvidence.compositorCaptureEndedAtMs ||
      firstPlaying.captureEndedAtMs < firstPlaying.captureStartedAtMs ||
      secondPlaying.captureStartedAtMs <= firstPlaying.captureEndedAtMs ||
      secondPlaying.captureEndedAtMs < secondPlaying.captureStartedAtMs ||
      resetEvidence.compositorCaptureStartedAtMs <= secondPlaying.captureEndedAtMs) {
    issues.push("state-sequence-capture-order-invalid");
  }
  const playingBracketsMonotonic = firstPlaying.compositorElapsedBracket.before >= 0 &&
    firstPlaying.compositorElapsedBracket.after >= firstPlaying.compositorElapsedBracket.before &&
    secondPlaying.compositorElapsedBracket.before > firstPlaying.compositorElapsedBracket.after &&
    secondPlaying.compositorElapsedBracket.after >= secondPlaying.compositorElapsedBracket.before &&
    secondPlaying.compositorFrameIndexBracket.before > firstPlaying.compositorFrameIndexBracket.after &&
    secondPlaying.compositorFrameIndexBracket.after >= secondPlaying.compositorFrameIndexBracket.before &&
    secondPlaying.timelineValueBracket.before > firstPlaying.timelineValueBracket.after &&
    secondPlaying.timelineValueBracket.after >= secondPlaying.timelineValueBracket.before;
  if (!playingBracketsMonotonic) issues.push("playing-compositor-time-frame-brackets-not-monotonic");

  for (const [index, sample] of playingCompositorSamples.entries()) {
    const sampleBracketsBounded = Number.isFinite(sample.compositorElapsedBracket.before) &&
      Number.isFinite(sample.compositorElapsedBracket.after) &&
      sample.compositorElapsedBracket.before >= 0 &&
      sample.compositorElapsedBracket.after >= sample.compositorElapsedBracket.before &&
      Number.isInteger(sample.compositorFrameIndexBracket.before) &&
      Number.isInteger(sample.compositorFrameIndexBracket.after) &&
      sample.compositorFrameIndexBracket.before >= 0 &&
      sample.compositorFrameIndexBracket.after >= sample.compositorFrameIndexBracket.before &&
      Number.isFinite(sample.timelineValueBracket.before) &&
      Number.isFinite(sample.timelineValueBracket.after) &&
      sample.timelineValueBracket.before >= 0 &&
      sample.timelineValueBracket.after >= sample.timelineValueBracket.before;
    if (!sampleBracketsBounded) issues.push(`playing-compositor-${index}-brackets-unbounded`);
    if (sample.compositorElapsedSeconds !== sample.compositorElapsedBracket.before) {
      issues.push(`playing-compositor-${index}-time-is-not-lower-fence`);
    }
    if (!/^[0-9a-f]{64}$/.test(sample.compositorPngSha256) ||
        !/^[0-9a-f]{64}$/.test(sample.compositorRgbaSha256) ||
        !/^[0-9a-f]{64}$/.test(sample.compositorBindingSha256) ||
        !/^[0-9a-f]{64}$/.test(sample.cameraProjectionDigest) ||
        !/^[0-9a-f]{64}$/.test(sample.sceneTopologyDigest) ||
        sample.width <= 0 || sample.height <= 0 || sample.compositorPngByteLength <= 0 ||
        sample.targetContract.length === 0 || sample.targetEvidence.length !== sample.targetContract.length ||
        sample.targetEvidence.some((target) => !target.passed)) {
      issues.push(`playing-compositor-${index}-proof-incomplete`);
    }
    const expectedProjection = californiaPremiumWebGlExpectedSceneProjectionForLab(
      playingEvidence.labId,
      "playing",
      {
        elapsedSeconds: sample.compositorElapsedSeconds,
        height: sample.height,
        width: sample.width
      }
    );
    if (sample.cameraProjectionDigest !== expectedProjection.cameraProjectionDigest ||
        sample.sceneTopologyDigest !== expectedProjection.sceneTopologyDigest ||
        stableSerialize(sample.targetContract) !== stableSerialize(expectedProjection.targetContract)) {
      issues.push(`playing-compositor-${index}-projection-drift`);
    }
    const sampleEvidenceById = new Map(sample.targetEvidence.map((target) => [target.evidenceId, target]));
    if (sampleEvidenceById.size !== sample.targetEvidence.length ||
        sampleEvidenceById.size !== expectedProjection.targetContract.length) {
      issues.push(`playing-compositor-${index}-target-evidence-set-drift`);
    }
    for (const expectedTarget of expectedProjection.targetContract) {
      const actualTarget = sampleEvidenceById.get(expectedTarget.evidenceId);
      const targetValid = Boolean(actualTarget) &&
        actualTarget!.objectId === expectedTarget.objectId &&
        actualTarget!.primitiveId === expectedTarget.primitiveId &&
        actualTarget!.role === expectedTarget.role &&
        actualTarget!.topology === expectedTarget.topology &&
        actualTarget!.segmentCount === expectedTarget.segmentCount &&
        actualTarget!.projectedPointCount === expectedTarget.projectedPointCount &&
        actualTarget!.cameraProjectionDigest === expectedTarget.cameraProjectionDigest &&
        actualTarget!.projectedGeometryDigest === expectedTarget.projectedGeometryDigest &&
        stableSerialize(actualTarget!.expectedRegion) === stableSerialize(expectedTarget.expectedRegion) &&
        actualTarget!.corePixelCount >= expectedTarget.minimumCorePixels &&
        actualTarget!.largestConnectedCorePixelCount >= expectedTarget.minimumConnectedPixels &&
        actualTarget!.largestConnectedCorePixelCount <= actualTarget!.corePixelCount &&
        actualTarget!.requiredSpatialSampleCount > 0 &&
        actualTarget!.matchedSpatialSampleCount >= actualTarget!.requiredSpatialSampleCount &&
        actualTarget!.spatialCoverageRatio >= expectedTarget.minimumSpatialCoverageRatio &&
        actualTarget!.arcLengthBucketCount === expectedTarget.arcLengthBucketCount &&
        actualTarget!.matchedArcLengthBucketCount >= expectedTarget.minimumMatchedArcLengthBucketCount &&
        actualTarget!.maximumConsecutiveMissingBuckets <= expectedTarget.maximumConsecutiveMissingBuckets &&
        actualTarget!.endpointMatchCount >= expectedTarget.minimumEndpointMatchCount &&
        actualTarget!.onPathCorePixelCount >= expectedTarget.minimumOnPathCorePixels &&
        actualTarget!.offCorridorCorePixelCount >= 0 &&
        actualTarget!.offCorridorCorePixelRatio >= 0 && actualTarget!.offCorridorCorePixelRatio <= 1 &&
        actualTarget!.offCorridorCorePixelRatio <= expectedTarget.maximumOffCorridorCorePixelRatio &&
        actualTarget!.passed;
      if (!targetValid) {
        issues.push(`playing-compositor-${index}-target-evidence-drift:${expectedTarget.evidenceId}`);
      }
    }
    const expectedBinding = californiaPremiumWebGlCompositorBindingSha256({
      captureToken: sample.captureToken,
      capturedUrl: playingEvidence.capturedUrl,
      clip: playingEvidence.compositorClip,
      compositorElapsedBracket: sample.compositorElapsedBracket,
      compositorElapsedSeconds: sample.compositorElapsedSeconds,
      compositorFrameIndexBracket: sample.compositorFrameIndexBracket,
      compositorPngSha256: sample.compositorPngSha256,
      compositorRgbaSha256: sample.compositorRgbaSha256,
      stateKey: "playing",
      targetContract: sample.targetContract,
      timelineValueBracket: sample.timelineValueBracket
    });
    if (sample.compositorBindingSha256 !== expectedBinding) {
      issues.push(`playing-compositor-${index}-binding-drift`);
    }
    const changed = sample.compositorChangedPixelRatioFromPrevious;
    const meanDiff = sample.compositorMeanAbsoluteDiffRatioFromPrevious;
    if (changed === null || meanDiff === null || !Number.isFinite(changed) || !Number.isFinite(meanDiff) ||
        changed < 0 || meanDiff < 0 || (changed < 0.005 && meanDiff < 0.001)) {
      issues.push(`playing-compositor-${index}-static`);
    }
  }
  if (firstPlaying.compositorRgbaSha256 === defaultEvidence.compositorRgbaSha256 ||
      secondPlaying.compositorRgbaSha256 === firstPlaying.compositorRgbaSha256 ||
      secondPlaying.compositorRgbaSha256 === defaultEvidence.compositorRgbaSha256) {
    issues.push("playing-compositor-static-or-reused");
  }

  const compositorResetDifference = resetEvidence.compositorResetDifference;
  if (!compositorResetDifference || compositorResetDifference.changedPixelRatio !== 0 ||
      compositorResetDifference.meanAbsoluteDiffRatio !== 0 ||
      resetEvidence.bitmapRgbaSha256 !== defaultEvidence.bitmapRgbaSha256 ||
      resetEvidence.compositorRgbaSha256 !== defaultEvidence.compositorRgbaSha256 ||
      resetEvidence.cameraProjectionDigest !== defaultEvidence.cameraProjectionDigest ||
      resetEvidence.compositorCameraProjectionDigest !== defaultEvidence.compositorCameraProjectionDigest ||
      resetEvidence.sceneTopologyDigest !== defaultEvidence.sceneTopologyDigest ||
      resetEvidence.compositorSceneTopologyDigest !== defaultEvidence.compositorSceneTopologyDigest ||
      stableSerialize(resetEvidence.targetContract) !== stableSerialize(defaultEvidence.targetContract) ||
      stableSerialize(resetEvidence.compositorTargetContract) !==
        stableSerialize(defaultEvidence.compositorTargetContract)) {
    issues.push("compositor-reset-difference-not-canonical-default");
  }
  return issues;
}

/**
 * Browser-local bridge from an exact Canvas bitmap into the existing numeric
 * California Canvas audit. It never calls `getContext()` or `readPixels()`.
 * Capture and registration are a two-phase operation bound to the same Canvas
 * object; pending or registered evidence can never be silently overwritten.
 */
function californiaPremiumWebGlContrastProviderInit() {
  type RegisteredEvidence = CaliforniaPremiumWebGlRegisteredContrastEvidence;
  type CaptureTarget = Pick<CaliforniaPremiumWebGlExpectedTargetContract,
    "evidenceId" | "objectId" | "primitiveId" | "role">;
  type BrowserCapture = CaliforniaPremiumWebGlBrowserCapture;
  type CaptureRequest = {
    labId: string;
    stateKey: "default" | "playing" | "reset" | "terminal-settled";
    targetContract: CaptureTarget[];
  };
  type SurfaceOutcome = {
    canvas: HTMLCanvasElement;
    canvasId: number | null;
    contextKind: "2d" | "bitmaprenderer" | "unknown" | "webgl" | "webgl2";
    essential: boolean;
    hasExecutableNonTextEvidence: boolean;
    hasExecutableTextEvidence: boolean;
    unsupportedReasons: string[];
  };
  type CanvasAuditApi = {
    contrastSurfaceOutcomes(root: HTMLElement, options?: { canvasSelector?: string }): SurfaceOutcome[];
    version: number;
  };
  type CanvasMetadata = {
    backingHeight: number;
    backingWidth: number;
    capturedUrl: string;
    cssHeight: number;
    cssWidth: number;
    cssX: number;
    cssY: number;
    devicePixelRatio: number;
    elapsedSeconds: number;
    frameIndex: number;
    labId: string;
    pageX: number;
    pageY: number;
    playbackState: string | null;
    timelineValue: number;
  };
  type PendingCapture = {
    capture: BrowserCapture;
    captureEndedAtPerformanceMs: number;
    playbackRoot: HTMLElement;
    targetContract: CaptureTarget[];
  };
  type RegisteredState = PendingCapture & {
    evidence: RegisteredEvidence;
  };
  type ProviderApi = {
    cancel(canvas: HTMLCanvasElement, captureToken: string): void;
    capture(canvas: HTMLCanvasElement, request: CaptureRequest): Promise<BrowserCapture>;
    installIntoCanvasAudit(): boolean;
    register(canvas: HTMLCanvasElement, evidence: RegisteredEvidence): void;
    version: 3;
  };
  type ProviderWindow = Window & {
    __californiaCanvasTextAudit?: CanvasAuditApi;
    __californiaPremiumWebGlContrastProvider?: ProviderApi;
  };

  const providerWindow = window as ProviderWindow;
  if (providerWindow.__californiaPremiumWebGlContrastProvider?.version === 3) return;

  const providerVersion = 3;
  const maxCaptureAgeMs = 15_000;
  const sourceContract =
    "catalog(enabled&&premiumLaunch)->reviewed CA family identity->MathSceneSpec IR->MathSceneRuntime palette/material->terminal Chromium pixels";
  const paletteSourceContract =
    "MANIM_DEFAULT_BACKGROUND_COLOR->render-quality bridge/Canvas|MathSceneRuntime role/axis/line palette";
  const allowedStateKeys = new Set(["default", "playing", "reset", "terminal-settled"]);
  const pendingByCanvas = new WeakMap<HTMLCanvasElement, PendingCapture>();
  const captureInFlight = new WeakSet<HTMLCanvasElement>();
  const evidenceByCanvas = new WeakMap<HTMLCanvasElement, RegisteredState>();
  const missingProviderReason =
    "Visible WebGL visualization has no executable material/background and terminal-raster contrast provider";
  let patchedCanvasApi: CanvasAuditApi | null = null;

  function routeLabId() {
    try {
      return decodeURIComponent(location.pathname.split("/").filter(Boolean).at(-1) ?? "");
    } catch {
      return "";
    }
  }

  function playbackRootFor(canvas: HTMLCanvasElement) {
    return canvas.closest<HTMLElement>("[data-viz-manim-playback-state]");
  }

  function metadataFor(canvas: HTMLCanvasElement, playbackRoot: HTMLElement): CanvasMetadata {
    const rect = canvas.getBoundingClientRect();
    const elapsedSeconds = Number(playbackRoot.getAttribute("data-viz-manim-timeline-elapsed-seconds"));
    const frameIndex = Number(playbackRoot.getAttribute("data-viz-manim-frame-stepper-frame-index"));
    const timeline = playbackRoot.querySelector<HTMLElement>("[data-viz-manim-timeline-scrubber]");
    const timelineValue = Number(timeline?.getAttribute("aria-valuenow"));
    return {
      backingHeight: canvas.height,
      backingWidth: canvas.width,
      capturedUrl: location.href,
      cssHeight: rect.height,
      cssWidth: rect.width,
      cssX: rect.x,
      cssY: rect.y,
      devicePixelRatio: window.devicePixelRatio,
      elapsedSeconds: Number.isFinite(elapsedSeconds) && elapsedSeconds >= 0 ? elapsedSeconds : -1,
      frameIndex: Number.isInteger(frameIndex) && frameIndex >= 0 ? frameIndex : -1,
      labId: routeLabId(),
      pageX: rect.x + window.scrollX,
      pageY: rect.y + window.scrollY,
      playbackState: playbackRoot.getAttribute("data-viz-manim-playback-state"),
      timelineValue: Number.isFinite(timelineValue) && timelineValue >= 0 ? timelineValue : -1
    };
  }

  function metadataDriftReasons(left: CanvasMetadata, right: CanvasMetadata) {
    const reasons: string[] = [];
    if (left.backingWidth !== right.backingWidth || left.backingHeight !== right.backingHeight) {
      reasons.push("canvas-buffer-size-drift");
    }
    if (Math.abs(left.cssWidth - right.cssWidth) > 0.5 || Math.abs(left.cssHeight - right.cssHeight) > 0.5 ||
        Math.abs(left.cssX - right.cssX) > 0.5 || Math.abs(left.cssY - right.cssY) > 0.5) {
      reasons.push("canvas-css-geometry-drift");
    }
    if (left.devicePixelRatio !== right.devicePixelRatio) reasons.push("device-pixel-ratio-drift");
    if (Math.abs(left.pageX - right.pageX) > 0.5 || Math.abs(left.pageY - right.pageY) > 0.5) {
      reasons.push("canvas-page-geometry-drift");
    }
    if (left.capturedUrl !== right.capturedUrl) reasons.push("captured-url-drift");
    if (left.labId !== right.labId) reasons.push("route-lab-drift");
    if (left.playbackState !== right.playbackState) reasons.push("playback-state-drift");
    return reasons;
  }

  function expectedPlaybackState(stateKey: string) {
    return stateKey === "terminal-settled" ? "scrubbing" : stateKey === "playing" ? "playing" : "paused";
  }

  function normalizedTargetContract(targets: CaptureTarget[]) {
    return targets
      .map((target) => ({
        evidenceId: target.evidenceId,
        objectId: target.objectId,
        primitiveId: target.primitiveId,
        role: target.role
      }))
      .sort((left, right) => left.evidenceId.localeCompare(right.evidenceId));
  }

  function validateTargetContract(targets: CaptureTarget[]) {
    if (!Array.isArray(targets) || targets.length === 0) return ["target-contract-empty"];
    const reasons: string[] = [];
    const evidenceIds = new Set<string>();
    for (const target of targets) {
      if (!target || typeof target.evidenceId !== "string" || !target.evidenceId ||
          typeof target.objectId !== "string" || !target.objectId ||
          typeof target.primitiveId !== "string" || !target.primitiveId ||
          typeof target.role !== "string" || !target.role) {
        reasons.push("target-contract-identity-invalid");
        continue;
      }
      if (evidenceIds.has(target.evidenceId)) reasons.push(`target-contract-duplicate:${target.evidenceId}`);
      evidenceIds.add(target.evidenceId);
    }
    return reasons;
  }

  function bytesToBase64(bytes: Uint8Array) {
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(offset, Math.min(bytes.length, offset + 0x8000)));
    }
    return btoa(binary);
  }

  async function sha256Hex(buffer: ArrayBuffer) {
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", buffer));
    return [...digest].map((value) => value.toString(16).padStart(2, "0")).join("");
  }

  function randomToken() {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
  }

  function currentMetadataRejectionReasons(
    canvas: HTMLCanvasElement,
    pending: PendingCapture
  ) {
    const reasons: string[] = [];
    if (!canvas.isConnected) reasons.push("canvas-detached");
    const playbackRoot = playbackRootFor(canvas);
    if (!playbackRoot || !playbackRoot.isConnected) {
      reasons.push("playback-root-missing");
      return reasons;
    }
    if (playbackRoot !== pending.playbackRoot) reasons.push("playback-root-replaced");
    const capturedMetadata: CanvasMetadata = {
      backingHeight: pending.capture.backingHeight,
      backingWidth: pending.capture.backingWidth,
      capturedUrl: pending.capture.capturedUrl,
      cssHeight: pending.capture.cssHeight,
      cssWidth: pending.capture.cssWidth,
      cssX: pending.capture.cssX,
      cssY: pending.capture.cssY,
      devicePixelRatio: pending.capture.devicePixelRatio,
      elapsedSeconds: pending.capture.elapsedSeconds,
      frameIndex: pending.capture.frameIndex,
      labId: pending.capture.labId,
      pageX: pending.capture.pageX,
      pageY: pending.capture.pageY,
      playbackState: pending.capture.playbackState,
      timelineValue: pending.capture.timelineValue
    };
    reasons.push(...metadataDriftReasons(capturedMetadata, metadataFor(canvas, playbackRoot)));
    return reasons;
  }

  function registrationRejectionReasons(
    canvas: HTMLCanvasElement,
    registered: RegisteredState,
    outcome: SurfaceOutcome
  ) {
    const reasons = currentMetadataRejectionReasons(canvas, registered);
    const { capture, evidence, targetContract } = registered;
    if (outcome.canvas !== canvas) reasons.push("canvas-identity-mismatch");
    if (outcome.contextKind !== "webgl" && outcome.contextKind !== "webgl2") {
      reasons.push(`context=${outcome.contextKind}:not-webgl`);
    }
    if (evidence.providerVersion !== providerVersion) {
      reasons.push(`provider-version=${String(evidence.providerVersion)}!=${providerVersion}`);
    }
    if (evidence.sourceContract !== sourceContract) reasons.push("source-contract-mismatch");
    if (evidence.visualPaletteSourceContract !== paletteSourceContract) {
      reasons.push("visual-palette-source-contract-mismatch");
    }
    if (!allowedStateKeys.has(evidence.stateKey)) reasons.push(`state-key-not-allowed:${evidence.stateKey}`);
    if (evidence.stateKey !== capture.stateKey) reasons.push("state-key-capture-mismatch");
    if (evidence.playbackState !== expectedPlaybackState(evidence.stateKey)) {
      reasons.push(`state-key-playback=${evidence.playbackState}!=${expectedPlaybackState(evidence.stateKey)}`);
    }
    if (evidence.labId !== capture.labId || evidence.capturedUrl !== capture.capturedUrl) {
      reasons.push("capture-route-identity-mismatch");
    }
    if (evidence.captureToken !== capture.captureToken ||
        evidence.captureStartedAtMs !== capture.captureStartedAtMs ||
        evidence.captureEndedAtMs !== capture.captureEndedAtMs) {
      reasons.push("capture-token-or-timestamp-mismatch");
    }
    if (evidence.bitmapPngSha256 !== capture.pngSha256 ||
        evidence.bitmapPngByteLength !== capture.pngByteLength) {
      reasons.push("capture-png-identity-mismatch");
    }
    if (evidence.bitmapWidth !== capture.backingWidth || evidence.bitmapHeight !== capture.backingHeight ||
        evidence.backingWidth !== capture.backingWidth || evidence.backingHeight !== capture.backingHeight) {
      reasons.push("capture-bitmap-size-mismatch");
    }
    if (evidence.cssWidth !== capture.cssWidth || evidence.cssHeight !== capture.cssHeight ||
        evidence.cssX !== capture.cssX || evidence.cssY !== capture.cssY ||
        evidence.pageX !== capture.pageX || evidence.pageY !== capture.pageY ||
        evidence.devicePixelRatio !== capture.devicePixelRatio ||
        evidence.elapsedSeconds !== capture.elapsedSeconds || evidence.frameIndex !== capture.frameIndex ||
        evidence.timelineValue !== capture.timelineValue ||
        evidence.rendererElapsedBracket.before !== capture.rendererElapsedBracket.before ||
        evidence.rendererElapsedBracket.after !== capture.rendererElapsedBracket.after ||
        evidence.rendererFrameIndexBracket.before !== capture.rendererFrameIndexBracket.before ||
        evidence.rendererFrameIndexBracket.after !== capture.rendererFrameIndexBracket.after ||
        evidence.timelineValueBracket.before !== capture.timelineValueBracket.before ||
        evidence.timelineValueBracket.after !== capture.timelineValueBracket.after) {
      reasons.push("capture-css-metadata-mismatch");
    }
    if (performance.now() - registered.captureEndedAtPerformanceMs > maxCaptureAgeMs) {
      reasons.push("terminal-evidence-stale");
    }
    if (evidence.terminalIssues.length > 0) reasons.push("terminal-audit-issues-present");
    if (evidence.opaquePixelRatio < 0.999) reasons.push("terminal-raster-not-opaque");
    if (evidence.backgroundCorePixelRatio < 0.12) reasons.push("terminal-background-core-missing");
    if (!/^[0-9a-f]{64}$/.test(evidence.bitmapPngSha256)) reasons.push("bitmap-png-sha256-invalid");
    if (!/^[0-9a-f]{64}$/.test(evidence.bitmapRgbaSha256)) reasons.push("bitmap-rgba-sha256-invalid");
    if (!/^[0-9a-f]{64}$/.test(evidence.cameraProjectionDigest) ||
        !/^[0-9a-f]{64}$/.test(evidence.sceneTopologyDigest)) {
      reasons.push("scene-projection-digest-invalid");
    }
    if (evidence.compositorIssues.length > 0) reasons.push("compositor-audit-issues-present");
    if (evidence.compositorOpaquePixelRatio < 0.999) reasons.push("compositor-raster-not-opaque");
    if (evidence.compositorBackgroundCorePixelRatio < 0.12) reasons.push("compositor-background-core-missing");
    if (!/^[0-9a-f]{64}$/.test(evidence.compositorPngSha256) ||
        !/^[0-9a-f]{64}$/.test(evidence.compositorRgbaSha256) ||
        !/^[0-9a-f]{64}$/.test(evidence.compositorBindingSha256) ||
        !/^[0-9a-f]{64}$/.test(evidence.compositorCameraProjectionDigest) ||
        !/^[0-9a-f]{64}$/.test(evidence.compositorSceneTopologyDigest)) {
      reasons.push("compositor-digest-invalid");
    }
    if (evidence.compositorWidth <= 0 || evidence.compositorHeight <= 0 ||
        evidence.compositorPngByteLength <= 0 || evidence.compositorCaptureStartedAtMs <= 0 ||
        evidence.compositorCaptureEndedAtMs < evidence.compositorCaptureStartedAtMs) {
      reasons.push("compositor-metadata-invalid");
    }

    const allowedTargets = new Map(normalizedTargetContract(targetContract).map((target) => [target.evidenceId, target]));
    const validateRasterTargets = (
      contract: CaliforniaPremiumWebGlExpectedTargetContract[],
      rasterEvidence: CaliforniaPremiumWebGlScreenshotTargetEvidence[],
      prefix: string
    ) => {
      const contractIds = new Set<string>();
      for (const expected of contract) {
        const identity = allowedTargets.get(expected.evidenceId);
        if (!identity || identity.objectId !== expected.objectId || identity.primitiveId !== expected.primitiveId ||
            identity.role !== expected.role) {
          reasons.push(`${prefix}-target-identity-mismatch:${expected.evidenceId}`);
        }
        if (contractIds.has(expected.evidenceId)) reasons.push(`${prefix}-target-contract-duplicate:${expected.evidenceId}`);
        contractIds.add(expected.evidenceId);
        if (!/^[0-9a-f]{64}$/.test(expected.cameraProjectionDigest) ||
            !/^[0-9a-f]{64}$/.test(expected.projectedGeometryDigest) || expected.projectedPoints.length === 0) {
          reasons.push(`${prefix}-target-projection-invalid:${expected.evidenceId}`);
        }
      }
      const evidenceTargets = new Map(rasterEvidence.map((target) => [target.evidenceId, target]));
      if (contract.length === 0 || evidenceTargets.size !== contract.length || rasterEvidence.length !== contract.length) {
        reasons.push(`${prefix}-target-evidence-count-mismatch`);
      }
      for (const expected of contract) {
        const actual = evidenceTargets.get(expected.evidenceId);
        if (!actual || actual.objectId !== expected.objectId || actual.primitiveId !== expected.primitiveId ||
            actual.role !== expected.role || actual.cameraProjectionDigest !== expected.cameraProjectionDigest ||
            actual.projectedGeometryDigest !== expected.projectedGeometryDigest ||
            actual.corePixelCount < expected.minimumCorePixels ||
            actual.largestConnectedCorePixelCount < expected.minimumConnectedPixels ||
            actual.largestConnectedCorePixelCount > actual.corePixelCount ||
            actual.matchedSpatialSampleCount < actual.requiredSpatialSampleCount ||
            actual.spatialCoverageRatio < expected.minimumSpatialCoverageRatio ||
            actual.arcLengthBucketCount !== expected.arcLengthBucketCount ||
            actual.matchedArcLengthBucketCount < expected.minimumMatchedArcLengthBucketCount ||
            actual.maximumConsecutiveMissingBuckets > expected.maximumConsecutiveMissingBuckets ||
            actual.endpointMatchCount < expected.minimumEndpointMatchCount ||
            actual.onPathCorePixelCount < expected.minimumOnPathCorePixels ||
            actual.offCorridorCorePixelCount < 0 ||
            actual.offCorridorCorePixelRatio < 0 || actual.offCorridorCorePixelRatio > 1 ||
            actual.offCorridorCorePixelRatio > expected.maximumOffCorridorCorePixelRatio || !actual.passed) {
          reasons.push(`${prefix}-terminal-object-proof-missing:${expected.evidenceId}`);
        }
      }
    };
    validateRasterTargets(evidence.targetContract, evidence.targetEvidence, "internal");
    validateRasterTargets(evidence.compositorTargetContract, evidence.compositorTargetEvidence, "compositor");
    return reasons;
  }

  function installIntoCanvasAudit() {
    const canvasApi = providerWindow.__californiaCanvasTextAudit;
    if (!canvasApi || canvasApi.version !== 4) return false;
    if (patchedCanvasApi === canvasApi) return true;
    const originalContrastSurfaceOutcomes = canvasApi.contrastSurfaceOutcomes.bind(canvasApi);
    canvasApi.contrastSurfaceOutcomes = (root, options = {}) =>
      originalContrastSurfaceOutcomes(root, options).map((outcome) => {
        if (outcome.contextKind !== "webgl" && outcome.contextKind !== "webgl2") return outcome;
        const registered = evidenceByCanvas.get(outcome.canvas);
        if (!registered) return outcome;
        // Consumption is deliberately one-shot. Delete before validation so a
        // rejected or accepted proof can never be replayed.
        evidenceByCanvas.delete(outcome.canvas);
        const rejectionReasons = registrationRejectionReasons(outcome.canvas, registered, outcome);
        if (rejectionReasons.length > 0) {
          return {
            ...outcome,
            hasExecutableNonTextEvidence: false,
            unsupportedReasons: [
              ...outcome.unsupportedReasons,
              `California premium WebGL evidence rejected: ${rejectionReasons.join(",")}`
            ]
          };
        }
        return {
          ...outcome,
          hasExecutableNonTextEvidence: true,
          unsupportedReasons: outcome.unsupportedReasons.filter((reason) => reason !== missingProviderReason)
        };
      });
    patchedCanvasApi = canvasApi;
    return true;
  }

  const providerApi: ProviderApi = {
    version: 3,
    cancel(canvas, captureToken) {
      if (!(canvas instanceof HTMLCanvasElement)) throw new Error("premium-webgl-provider-canvas-required");
      const pending = pendingByCanvas.get(canvas);
      if (!pending || pending.capture.captureToken !== captureToken) {
        throw new Error("premium-webgl-matching-pending-capture-required");
      }
      pendingByCanvas.delete(canvas);
    },
    async capture(canvas, request) {
      if (!(canvas instanceof HTMLCanvasElement)) throw new Error("premium-webgl-provider-canvas-required");
      if (!installIntoCanvasAudit()) throw new Error("california-canvas-audit-v4-required");
      if (!request || !allowedStateKeys.has(request.stateKey)) {
        throw new Error(`premium-webgl-state-key-not-allowed:${request?.stateKey ?? "missing"}`);
      }
      if (captureInFlight.has(canvas)) throw new Error("premium-webgl-capture-already-in-flight");
      if (pendingByCanvas.has(canvas)) throw new Error("premium-webgl-pending-evidence-unconsumed");
      if (evidenceByCanvas.has(canvas)) throw new Error("premium-webgl-registered-evidence-unconsumed");
      const targetIssues = validateTargetContract(request.targetContract);
      if (targetIssues.length > 0) throw new Error(`premium-webgl-${targetIssues.join("|")}`);
      if (!canvas.isConnected) throw new Error("premium-webgl-canvas-detached");
      const playbackRoot = playbackRootFor(canvas);
      if (!playbackRoot || !playbackRoot.isConnected) throw new Error("premium-webgl-playback-root-required");
      const before = metadataFor(canvas, playbackRoot);
      if (before.backingWidth <= 0 || before.backingHeight <= 0 ||
          before.cssWidth <= 0 || before.cssHeight <= 0) {
        throw new Error("premium-webgl-canvas-size-invalid");
      }
      if (before.elapsedSeconds < 0 || before.frameIndex < 0) {
        throw new Error("premium-webgl-runtime-time-metadata-required");
      }
      if (before.timelineValue < 0) throw new Error("premium-webgl-timeline-value-required");
      if (before.labId !== request.labId) {
        throw new Error(`premium-webgl-route-lab=${before.labId || "missing"}!=${request.labId}`);
      }
      const playbackState = expectedPlaybackState(request.stateKey);
      if (before.playbackState !== playbackState) {
        throw new Error(`premium-webgl-state-key-playback=${before.playbackState ?? "missing"}!=${playbackState}`);
      }

      captureInFlight.add(canvas);
      try {
        const captureStartedAtMs = Date.now();
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((value) => {
            if (value) resolve(value);
            else reject(new Error("premium-webgl-canvas-to-blob-failed"));
          }, "image/png");
        });
        const pngBuffer = await blob.arrayBuffer();
        const pngBytes = new Uint8Array(pngBuffer);
        const pngSha256 = await sha256Hex(pngBuffer);
        const afterPlaybackRoot = playbackRootFor(canvas);
        if (afterPlaybackRoot !== playbackRoot || !canvas.isConnected || !playbackRoot.isConnected) {
          throw new Error("premium-webgl-canvas-or-playback-root-replaced-during-capture");
        }
        const after = metadataFor(canvas, playbackRoot);
        const driftReasons = metadataDriftReasons(before, after);
        if (driftReasons.length > 0) {
          throw new Error(`premium-webgl-capture-metadata-drift:${driftReasons.join(",")}`);
        }
        const captureEndedAtMs = Date.now();
        const capture: BrowserCapture = {
          backingHeight: before.backingHeight,
          backingWidth: before.backingWidth,
          captureEndedAtMs,
          captureStartedAtMs,
          captureToken: randomToken(),
          capturedUrl: before.capturedUrl,
          cssHeight: before.cssHeight,
          cssWidth: before.cssWidth,
          cssX: before.cssX,
          cssY: before.cssY,
          devicePixelRatio: before.devicePixelRatio,
          elapsedSeconds: after.elapsedSeconds,
          frameIndex: after.frameIndex,
          labId: before.labId,
          pageX: before.pageX,
          pageY: before.pageY,
          playbackState,
          pngBase64: bytesToBase64(pngBytes),
          pngByteLength: pngBytes.length,
          pngSha256,
          rendererElapsedBracket: { before: before.elapsedSeconds, after: after.elapsedSeconds },
          rendererFrameIndexBracket: { before: before.frameIndex, after: after.frameIndex },
          stateKey: request.stateKey,
          timelineValue: after.timelineValue,
          timelineValueBracket: { before: before.timelineValue, after: after.timelineValue }
        };
        pendingByCanvas.set(canvas, {
          capture,
          captureEndedAtPerformanceMs: performance.now(),
          playbackRoot,
          targetContract: normalizedTargetContract(request.targetContract)
        });
        return capture;
      } finally {
        captureInFlight.delete(canvas);
      }
    },
    installIntoCanvasAudit,
    register(canvas, evidence) {
      if (!(canvas instanceof HTMLCanvasElement)) throw new Error("premium-webgl-provider-canvas-required");
      if (!installIntoCanvasAudit()) throw new Error("california-canvas-audit-v4-required");
      if (evidenceByCanvas.has(canvas)) throw new Error("premium-webgl-registered-evidence-unconsumed");
      const pending = pendingByCanvas.get(canvas);
      if (!pending) throw new Error("premium-webgl-matching-pending-capture-required");
      const syntheticOutcome: SurfaceOutcome = {
        canvas,
        canvasId: null,
        contextKind: "webgl",
        essential: true,
        hasExecutableNonTextEvidence: false,
        hasExecutableTextEvidence: false,
        unsupportedReasons: []
      };
      const registered: RegisteredState = { ...pending, evidence };
      const rejectionReasons = registrationRejectionReasons(canvas, registered, syntheticOutcome)
        .filter((reason) => !reason.startsWith("context="));
      if (rejectionReasons.length > 0) {
        throw new Error(`premium-webgl-registration-rejected:${rejectionReasons.join(",")}`);
      }
      pendingByCanvas.delete(canvas);
      evidenceByCanvas.set(canvas, registered);
    }
  };

  Object.freeze(providerApi);
  Object.defineProperty(providerWindow, "__californiaPremiumWebGlContrastProvider", {
    configurable: false,
    enumerable: false,
    value: providerApi,
    writable: false
  });
  installIntoCanvasAudit();
  queueMicrotask(installIntoCanvasAudit);
  addEventListener("DOMContentLoaded", installIntoCanvasAudit, { once: true });
}

/** Install after `installCaliforniaCanvasTextAudit(page)` and before navigation. */
export async function installCaliforniaPremiumWebGlContrastProvider(page: Page) {
  const source = californiaPremiumWebGlContrastProviderInit.toString();
  await page.addInitScript({
    content: `globalThis.__name = globalThis.__name || function(target) { return target; }; (${source})();`
  });
}

type CaliforniaPremiumWebGlTestHooks = {
  beforeRegister?: (registration: CaliforniaPremiumWebGlContrastRegistration) => Promise<void> | void;
  mutateEvidenceBeforeRegister?: (
    evidence: CaliforniaPremiumWebGlRegisteredContrastEvidence
  ) => Promise<void> | void;
};

type CaliforniaPremiumWebGlCaptureAndRegisterOptions = {
  canvas: ElementHandle<HTMLCanvasElement>;
  labId: string;
};

async function captureAndRegisterCaliforniaPremiumWebGlContrastEvidenceInternal(
  options: CaliforniaPremiumWebGlCaptureAndRegisterOptions,
  stateKey: CaliforniaPremiumWebGlCaptureStateKey,
  allowTestTerminalState: boolean,
  testHooks?: CaliforniaPremiumWebGlTestHooks
): Promise<CaliforniaPremiumWebGlContrastRegistration> {
  const stateAllowed = isCaliforniaPremiumWebGlProductionStateKey(stateKey) ||
    (allowTestTerminalState && stateKey === CALIFORNIA_PREMIUM_WEBGL_TEST_TERMINAL_STATE_KEY);
  if (!stateAllowed) throw new Error(`premium-webgl-state-key-not-allowed:${String(stateKey)}`);

  const sourceAudit = auditCaliforniaPremiumWebGlGraphicsContracts();
  if (sourceAudit.issues.length > 0) {
    throw new Error(`premium-webgl-source-contract-failed:${sourceAudit.issues.join("|")}`);
  }
  const lab = sourceAudit.labs.find((candidate) => candidate.labId === options.labId);
  if (!lab) throw new Error(`premium-webgl-live-lab-not-reviewed:${options.labId}`);
  const captureTargetContract = lab.screenshotTargets.map((target) => ({
    evidenceId: target.evidenceId,
    objectId: target.objectId,
    primitiveId: target.primitiveId,
    role: target.role
  }));

  const capture = await options.canvas.evaluate(async (element, request) => {
    type ProviderApi = {
      capture(
        canvas: HTMLCanvasElement,
        captureRequest: typeof request
      ): Promise<CaliforniaPremiumWebGlBrowserCapture>;
      version: number;
    };
    const provider = (window as Window & {
      __californiaPremiumWebGlContrastProvider?: ProviderApi;
    }).__californiaPremiumWebGlContrastProvider;
    if (!provider || provider.version !== 3) throw new Error("premium-webgl-contrast-provider-not-installed");
    return provider.capture(element, request);
  }, { labId: options.labId, stateKey, targetContract: captureTargetContract });

  let finalized = false;
  try {
  if (capture.labId !== options.labId || capture.stateKey !== stateKey ||
      capture.playbackState !== expectedPlaybackStateForCaptureState(stateKey)) {
    throw new Error("premium-webgl-browser-capture-identity-mismatch");
  }
  const bitmapPng = Buffer.from(capture.pngBase64, "base64");
  if (bitmapPng.length !== capture.pngByteLength) {
    throw new Error(`premium-webgl-png-byte-length=${bitmapPng.length}!=${capture.pngByteLength}`);
  }
  const bitmapPngSha256 = createHash("sha256").update(bitmapPng).digest("hex");
  if (bitmapPngSha256 !== capture.pngSha256) {
    throw new Error(`premium-webgl-png-sha256=${bitmapPngSha256}!=${capture.pngSha256}`);
  }
  const decoded = await sharp(bitmapPng).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (decoded.info.channels !== 4) {
    throw new Error(`premium-webgl-bitmap-channels=${decoded.info.channels}!=4`);
  }
  if (decoded.info.width !== capture.backingWidth || decoded.info.height !== capture.backingHeight) {
    throw new Error(
      `premium-webgl-bitmap-backing-size=${decoded.info.width}x${decoded.info.height}` +
      `!=${capture.backingWidth}x${capture.backingHeight}`
    );
  }
  const screenshot: CaliforniaPremiumWebGlScreenshotInput = {
    channels: 4,
    data: decoded.data,
    height: decoded.info.height,
    width: decoded.info.width
  };
  const internalProjection = californiaPremiumWebGlExpectedSceneProjectionForLab(options.labId, stateKey, {
    elapsedSeconds: capture.elapsedSeconds,
    height: decoded.info.height,
    width: decoded.info.width
  });
  const targetContract = internalProjection.targetContract;
  const terminal = auditCaliforniaPremiumWebGlScreenshot(screenshot, lab, mathSceneVisualPalette.background.color, {
    elapsedSeconds: capture.elapsedSeconds,
    stateKey,
    targetContract
  });
  if (terminal.issues.length > 0) {
    throw new Error(
      `premium-webgl-terminal-raster-contract-failed:${options.labId}:${stateKey}:` +
      terminal.issues.join("|")
    );
  }

  const readCompositorFence = () => options.canvas.evaluate((element) => {
    const playbackRoot = element.closest<HTMLElement>("[data-viz-manim-playback-state]");
    if (!playbackRoot) throw new Error("premium-webgl-playback-root-required");
    const rect = element.getBoundingClientRect();
    const elapsedSeconds = Number(playbackRoot.getAttribute("data-viz-manim-timeline-elapsed-seconds"));
    const frameIndex = Number(playbackRoot.getAttribute("data-viz-manim-frame-stepper-frame-index"));
    const timeline = playbackRoot.querySelector<HTMLElement>("[data-viz-manim-timeline-scrubber]");
    const timelineValue = Number(timeline?.getAttribute("aria-valuenow"));
    return {
      capturedUrl: location.href,
      cssHeight: rect.height,
      cssWidth: rect.width,
      cssX: rect.x,
      cssY: rect.y,
      elapsedSeconds,
      frameIndex,
      pageX: rect.x + window.scrollX,
      pageY: rect.y + window.scrollY,
      playbackState: playbackRoot.getAttribute("data-viz-manim-playback-state"),
      routeLabId: decodeURIComponent(location.pathname.split("/").filter(Boolean).at(-1) ?? ""),
      timelineValue
    };
  });
  const compositorBefore = await readCompositorFence();
  const expectedPlaybackState = expectedPlaybackStateForCaptureState(stateKey);
  if (compositorBefore.capturedUrl !== capture.capturedUrl || compositorBefore.routeLabId !== options.labId ||
      compositorBefore.playbackState !== expectedPlaybackState ||
      !Number.isFinite(compositorBefore.elapsedSeconds) || compositorBefore.elapsedSeconds < 0 ||
      !Number.isInteger(compositorBefore.frameIndex) || compositorBefore.frameIndex < 0 ||
      !Number.isFinite(compositorBefore.timelineValue) || compositorBefore.timelineValue < 0 ||
      Math.abs(compositorBefore.cssWidth - capture.cssWidth) > 0.5 ||
      Math.abs(compositorBefore.cssHeight - capture.cssHeight) > 0.5 ||
      Math.abs(compositorBefore.pageX - capture.pageX) > 0.5 ||
      Math.abs(compositorBefore.pageY - capture.pageY) > 0.5) {
    throw new Error("premium-webgl-compositor-pre-fence-mismatch");
  }
  const compositorClip = {
    x: Math.max(0, Math.floor(compositorBefore.pageX)),
    y: Math.max(0, Math.floor(compositorBefore.pageY)),
    width: Math.max(1, Math.ceil(compositorBefore.pageX + compositorBefore.cssWidth) - Math.floor(compositorBefore.pageX)),
    height: Math.max(1, Math.ceil(compositorBefore.pageY + compositorBefore.cssHeight) - Math.floor(compositorBefore.pageY))
  };
  const ownerFrame = await options.canvas.ownerFrame();
  if (!ownerFrame) throw new Error("premium-webgl-owner-frame-required");
  const page = ownerFrame.page();
  const compositorCaptureStartedAtMs = Date.now();
  const compositorPng = await page.screenshot({ clip: compositorClip, scale: "css", type: "png" });
  const compositorCaptureEndedAtMs = Date.now();
  const compositorAfter = await readCompositorFence();
  if (compositorAfter.capturedUrl !== compositorBefore.capturedUrl ||
      compositorAfter.routeLabId !== compositorBefore.routeLabId ||
      compositorAfter.playbackState !== compositorBefore.playbackState ||
      Math.abs(compositorAfter.cssWidth - compositorBefore.cssWidth) > 0.5 ||
      Math.abs(compositorAfter.cssHeight - compositorBefore.cssHeight) > 0.5 ||
      Math.abs(compositorAfter.pageX - compositorBefore.pageX) > 0.5 ||
      Math.abs(compositorAfter.pageY - compositorBefore.pageY) > 0.5 ||
      !Number.isFinite(compositorAfter.elapsedSeconds) || compositorAfter.elapsedSeconds < 0 ||
      !Number.isInteger(compositorAfter.frameIndex) || compositorAfter.frameIndex < 0 ||
      !Number.isFinite(compositorAfter.timelineValue) || compositorAfter.timelineValue < 0) {
    throw new Error("premium-webgl-compositor-post-fence-mismatch");
  }
  if (expectedPlaybackState !== "playing" &&
      (Math.abs(compositorAfter.elapsedSeconds - compositorBefore.elapsedSeconds) > 0.002 ||
        compositorAfter.frameIndex !== compositorBefore.frameIndex ||
        compositorAfter.timelineValue !== compositorBefore.timelineValue)) {
    throw new Error("premium-webgl-compositor-paused-time-drift");
  }
  const compositorElapsedBracket = {
    before: rounded(compositorBefore.elapsedSeconds, 6),
    after: rounded(compositorAfter.elapsedSeconds, 6)
  };
  const compositorFrameIndexBracket = {
    before: compositorBefore.frameIndex,
    after: compositorAfter.frameIndex
  };
  const compositorTimelineValueBracket = {
    before: compositorBefore.timelineValue,
    after: compositorAfter.timelineValue
  };
  const compositorElapsedSeconds = compositorElapsedBracket.before;
  const compositorDecoded = await sharp(compositorPng).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (compositorDecoded.info.channels !== 4 || compositorDecoded.info.width <= 0 || compositorDecoded.info.height <= 0) {
    throw new Error("premium-webgl-compositor-decode-invalid");
  }
  const cssAspectRatio = capture.cssWidth / capture.cssHeight;
  const compositorAspectRatio = compositorDecoded.info.width / compositorDecoded.info.height;
  if (Math.abs(cssAspectRatio - compositorAspectRatio) / Math.max(cssAspectRatio, compositorAspectRatio) > 0.01) {
    throw new Error(
      `premium-webgl-compositor-aspect-drift:${compositorAspectRatio.toFixed(6)}!=${cssAspectRatio.toFixed(6)}`
    );
  }
  const compositorScreenshot: CaliforniaPremiumWebGlScreenshotInput = {
    channels: 4,
    data: compositorDecoded.data,
    height: compositorDecoded.info.height,
    width: compositorDecoded.info.width
  };
  const compositorProjection = californiaPremiumWebGlExpectedSceneProjectionForLab(options.labId, stateKey, {
    elapsedSeconds: compositorElapsedSeconds,
    height: compositorDecoded.info.height,
    width: compositorDecoded.info.width
  });
  const compositorTerminal = auditCaliforniaPremiumWebGlScreenshot(
    compositorScreenshot,
    lab,
    mathSceneVisualPalette.background.color,
    {
      elapsedSeconds: compositorElapsedSeconds,
      stateKey,
      targetContract: compositorProjection.targetContract
    }
  );
  if (compositorTerminal.issues.length > 0) {
    throw new Error(
      `premium-webgl-compositor-raster-contract-failed:${options.labId}:${stateKey}:` +
      compositorTerminal.issues.join("|")
    );
  }
  const compositorPngSha256 = createHash("sha256").update(compositorPng).digest("hex");
  const compositorRgbaSha256 = createHash("sha256").update(compositorDecoded.data).digest("hex");
  const compositorBindingSha256 = californiaPremiumWebGlCompositorBindingSha256({
    captureToken: capture.captureToken,
    capturedUrl: capture.capturedUrl,
    clip: compositorClip,
    compositorElapsedBracket,
    compositorElapsedSeconds,
    compositorFrameIndexBracket,
    compositorPngSha256,
    compositorRgbaSha256,
    stateKey,
    targetContract: compositorProjection.targetContract,
    timelineValueBracket: compositorTimelineValueBracket
  });
  let playingCompositorPngs: Buffer[] = [];
  let playingCompositorSamples: CaliforniaPremiumWebGlPlayingCompositorSample[] = [];
  if (stateKey === "playing") {
    await options.canvas.evaluate(async (element, previous) => {
      const root = element.closest<HTMLElement>("[data-viz-manim-playback-state]");
      if (!root) throw new Error("premium-webgl-playing-sample-root-required");
      await new Promise<void>((resolve, reject) => {
        const startedAt = performance.now();
        const poll = () => {
          const elapsedSeconds = Number(root.getAttribute("data-viz-manim-timeline-elapsed-seconds"));
          const frameIndex = Number(root.getAttribute("data-viz-manim-frame-stepper-frame-index"));
          const timelineValue = Number(root.querySelector<HTMLElement>(
            "[data-viz-manim-timeline-scrubber]"
          )?.getAttribute("aria-valuenow"));
          if (root.getAttribute("data-viz-manim-playback-state") !== "playing") {
            reject(new Error("premium-webgl-playing-state-ended-before-second-sample"));
            return;
          }
          if (elapsedSeconds > previous.elapsedSeconds + 0.03 &&
              frameIndex > previous.frameIndex && timelineValue > previous.timelineValue) {
            resolve();
            return;
          }
          if (performance.now() - startedAt > 3_000) {
            reject(new Error("premium-webgl-playing-second-sample-timeout"));
            return;
          }
          requestAnimationFrame(poll);
        };
        requestAnimationFrame(poll);
      });
    }, {
      elapsedSeconds: compositorElapsedBracket.after,
      frameIndex: compositorFrameIndexBracket.after,
      timelineValue: compositorTimelineValueBracket.after
    });
    const secondBefore = await readCompositorFence();
    if (secondBefore.capturedUrl !== compositorBefore.capturedUrl ||
        secondBefore.routeLabId !== compositorBefore.routeLabId ||
        secondBefore.playbackState !== "playing" ||
        Math.abs(secondBefore.pageX - compositorBefore.pageX) > 0.5 ||
        Math.abs(secondBefore.pageY - compositorBefore.pageY) > 0.5 ||
        Math.abs(secondBefore.cssWidth - compositorBefore.cssWidth) > 0.5 ||
        Math.abs(secondBefore.cssHeight - compositorBefore.cssHeight) > 0.5) {
      throw new Error("premium-webgl-playing-second-sample-pre-fence-mismatch");
    }
    const secondCaptureStartedAtMs = Date.now();
    const secondPng = await page.screenshot({ clip: compositorClip, scale: "css", type: "png" });
    const secondCaptureEndedAtMs = Date.now();
    const secondAfter = await readCompositorFence();
    if (secondAfter.capturedUrl !== secondBefore.capturedUrl ||
        secondAfter.routeLabId !== secondBefore.routeLabId ||
        secondAfter.playbackState !== "playing" ||
        secondAfter.elapsedSeconds < secondBefore.elapsedSeconds ||
        secondAfter.frameIndex < secondBefore.frameIndex ||
        secondAfter.timelineValue < secondBefore.timelineValue ||
        Math.abs(secondAfter.pageX - secondBefore.pageX) > 0.5 ||
        Math.abs(secondAfter.pageY - secondBefore.pageY) > 0.5 ||
        Math.abs(secondAfter.cssWidth - secondBefore.cssWidth) > 0.5 ||
        Math.abs(secondAfter.cssHeight - secondBefore.cssHeight) > 0.5) {
      throw new Error("premium-webgl-playing-second-sample-post-fence-mismatch");
    }
    const secondElapsedBracket = {
      before: rounded(secondBefore.elapsedSeconds, 6),
      after: rounded(secondAfter.elapsedSeconds, 6)
    };
    const secondFrameIndexBracket = { before: secondBefore.frameIndex, after: secondAfter.frameIndex };
    const secondTimelineValueBracket = {
      before: secondBefore.timelineValue,
      after: secondAfter.timelineValue
    };
    const secondDecoded = await sharp(secondPng).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    if (secondDecoded.info.channels !== 4 || secondDecoded.info.width !== compositorDecoded.info.width ||
        secondDecoded.info.height !== compositorDecoded.info.height) {
      throw new Error("premium-webgl-playing-second-sample-size-drift");
    }
    const secondProjection = californiaPremiumWebGlExpectedSceneProjectionForLab(options.labId, "playing", {
      elapsedSeconds: secondElapsedBracket.before,
      height: secondDecoded.info.height,
      width: secondDecoded.info.width
    });
    const secondScreenshot: CaliforniaPremiumWebGlScreenshotInput = {
      channels: 4,
      data: secondDecoded.data,
      height: secondDecoded.info.height,
      width: secondDecoded.info.width
    };
    const secondTerminal = auditCaliforniaPremiumWebGlScreenshot(
      secondScreenshot,
      lab,
      mathSceneVisualPalette.background.color,
      {
        elapsedSeconds: secondElapsedBracket.before,
        stateKey: "playing",
        targetContract: secondProjection.targetContract
      }
    );
    if (secondTerminal.issues.length > 0) {
      throw new Error(
        `premium-webgl-playing-second-compositor-raster-contract-failed:${options.labId}:` +
        secondTerminal.issues.join("|")
      );
    }
    const secondPngSha256 = createHash("sha256").update(secondPng).digest("hex");
    const secondRgbaSha256 = createHash("sha256").update(secondDecoded.data).digest("hex");
    const secondCaptureToken = createHash("sha256")
      .update(`${capture.captureToken}:${secondCaptureStartedAtMs}:${secondPngSha256}`)
      .digest("hex")
      .slice(0, 32);
    const secondBindingSha256 = californiaPremiumWebGlCompositorBindingSha256({
      captureToken: secondCaptureToken,
      capturedUrl: capture.capturedUrl,
      clip: compositorClip,
      compositorElapsedBracket: secondElapsedBracket,
      compositorElapsedSeconds: secondElapsedBracket.before,
      compositorFrameIndexBracket: secondFrameIndexBracket,
      compositorPngSha256: secondPngSha256,
      compositorRgbaSha256: secondRgbaSha256,
      stateKey: "playing",
      targetContract: secondProjection.targetContract,
      timelineValueBracket: secondTimelineValueBracket
    });
    const secondDifference = californiaPremiumWebGlPixelDifference(
      compositorDecoded.data,
      secondDecoded.data,
      secondDecoded.info.width,
      secondDecoded.info.height
    );
    playingCompositorPngs = [compositorPng, secondPng];
    playingCompositorSamples = [
      {
        cameraProjectionDigest: compositorProjection.cameraProjectionDigest,
        captureEndedAtMs: compositorCaptureEndedAtMs,
        captureStartedAtMs: compositorCaptureStartedAtMs,
        captureToken: capture.captureToken,
        compositorBindingSha256,
        compositorChangedPixelRatioFromPrevious: null,
        compositorElapsedBracket,
        compositorElapsedSeconds,
        compositorFrameIndexBracket,
        compositorMeanAbsoluteDiffRatioFromPrevious: null,
        compositorPngByteLength: compositorPng.length,
        compositorPngSha256,
        compositorRgbaSha256,
        height: compositorDecoded.info.height,
        sceneTopologyDigest: compositorProjection.sceneTopologyDigest,
        targetContract: compositorProjection.targetContract,
        targetEvidence: compositorTerminal.targetEvidence,
        timelineValueBracket: compositorTimelineValueBracket,
        width: compositorDecoded.info.width
      },
      {
        cameraProjectionDigest: secondProjection.cameraProjectionDigest,
        captureEndedAtMs: secondCaptureEndedAtMs,
        captureStartedAtMs: secondCaptureStartedAtMs,
        captureToken: secondCaptureToken,
        compositorBindingSha256: secondBindingSha256,
        compositorChangedPixelRatioFromPrevious: secondDifference.changedPixelRatio,
        compositorElapsedBracket: secondElapsedBracket,
        compositorElapsedSeconds: secondElapsedBracket.before,
        compositorFrameIndexBracket: secondFrameIndexBracket,
        compositorMeanAbsoluteDiffRatioFromPrevious: secondDifference.meanAbsoluteDiffRatio,
        compositorPngByteLength: secondPng.length,
        compositorPngSha256: secondPngSha256,
        compositorRgbaSha256: secondRgbaSha256,
        height: secondDecoded.info.height,
        sceneTopologyDigest: secondProjection.sceneTopologyDigest,
        targetContract: secondProjection.targetContract,
        targetEvidence: secondTerminal.targetEvidence,
        timelineValueBracket: secondTimelineValueBracket,
        width: secondDecoded.info.width
      }
    ];
  }
  const evidence: CaliforniaPremiumWebGlRegisteredContrastEvidence = {
    backingHeight: capture.backingHeight,
    backingWidth: capture.backingWidth,
    backgroundCorePixelRatio: terminal.backgroundCorePixelRatio,
    bitmapHeight: decoded.info.height,
    bitmapPngByteLength: bitmapPng.length,
    bitmapPngSha256,
    bitmapRgbaSha256: createHash("sha256").update(decoded.data).digest("hex"),
    bitmapWidth: decoded.info.width,
    captureEndedAtMs: capture.captureEndedAtMs,
    captureStartedAtMs: capture.captureStartedAtMs,
    captureToken: capture.captureToken,
    cameraProjectionDigest: internalProjection.cameraProjectionDigest,
    capturedUrl: capture.capturedUrl,
    compositorBackgroundCorePixelRatio: compositorTerminal.backgroundCorePixelRatio,
    compositorBindingSha256,
    compositorCameraProjectionDigest: compositorProjection.cameraProjectionDigest,
    compositorCaptureEndedAtMs,
    compositorCaptureStartedAtMs,
    compositorClip,
    compositorElapsedBracket,
    compositorElapsedSeconds,
    compositorFrameIndexBracket,
    compositorHeight: compositorDecoded.info.height,
    compositorIssues: compositorTerminal.issues,
    compositorOpaquePixelRatio: compositorTerminal.opaquePixelRatio,
    compositorPngByteLength: compositorPng.length,
    compositorPngSha256,
    compositorProjectionAspectRatio: compositorProjection.projectionAspectRatio,
    compositorRenderedObjectCount: compositorProjection.renderedObjectCount,
    compositorRgbaSha256,
    compositorSceneObjectCount: compositorProjection.sceneObjectCount,
    compositorSceneTopologyDigest: compositorProjection.sceneTopologyDigest,
    compositorTargetContract: compositorProjection.targetContract,
    compositorTargetEvidence: compositorTerminal.targetEvidence,
    compositorTimelineValueBracket,
    compositorWidth: compositorDecoded.info.width,
    cssHeight: capture.cssHeight,
    cssWidth: capture.cssWidth,
    cssX: capture.cssX,
    cssY: capture.cssY,
    devicePixelRatio: capture.devicePixelRatio,
    elapsedSeconds: capture.elapsedSeconds,
    frameIndex: capture.frameIndex,
    labId: options.labId,
    opaquePixelRatio: terminal.opaquePixelRatio,
    pageX: capture.pageX,
    pageY: capture.pageY,
    playingCompositorSamples,
    playbackState: capture.playbackState,
    projectionAspectRatio: internalProjection.projectionAspectRatio,
    providerVersion: CALIFORNIA_PREMIUM_WEBGL_CONTRAST_PROVIDER_VERSION,
    renderedObjectCount: internalProjection.renderedObjectCount,
    rendererElapsedBracket: capture.rendererElapsedBracket,
    rendererFrameIndexBracket: capture.rendererFrameIndexBracket,
    sceneObjectCount: internalProjection.sceneObjectCount,
    sceneTopologyDigest: internalProjection.sceneTopologyDigest,
    compositorResetDifference: null,
    sourceContract: CALIFORNIA_PREMIUM_WEBGL_GRAPHICS_SOURCE_CONTRACT,
    stateKey,
    targetContract,
    targetEvidence: terminal.targetEvidence,
    terminalIssues: terminal.issues,
    timelineValue: capture.timelineValue,
    timelineValueBracket: capture.timelineValueBracket,
    visualPaletteSourceContract: MATH_SCENE_VISUAL_PALETTE_SOURCE_CONTRACT
  };
  const retainedIssues = auditCaliforniaPremiumWebGlRetainedContrastEvidence(evidence, {
    allowTestTerminalState,
    enforceFreshness: true,
    expectedStateKey: stateKey,
    nowMs: Date.now()
  });
  if (retainedIssues.length > 0) {
    throw new Error(`premium-webgl-retained-evidence-invalid:${retainedIssues.join("|")}`);
  }

  const registration = {
    bitmapPng,
    compositorPng,
    compositorScreenshot,
    compositorTerminal,
    evidence,
    playingCompositorPngs,
    screenshot,
    terminal
  };
  await testHooks?.beforeRegister?.(registration);
  await testHooks?.mutateEvidenceBeforeRegister?.(evidence);
  await options.canvas.evaluate((element, registeredEvidence) => {
    type ProviderApi = {
      register(
        canvas: HTMLCanvasElement,
        evidenceToRegister: CaliforniaPremiumWebGlRegisteredContrastEvidence
      ): void;
      version: number;
    };
    const provider = (window as Window & {
      __californiaPremiumWebGlContrastProvider?: ProviderApi;
    }).__californiaPremiumWebGlContrastProvider;
    if (!provider || provider.version !== 3) throw new Error("premium-webgl-contrast-provider-not-installed");
    provider.register(element, registeredEvidence);
  }, evidence);

  finalized = true;
  return registration;
  } catch (error) {
    if (!finalized) {
      await options.canvas.evaluate((element, captureToken) => {
        type ProviderApi = {
          cancel(canvas: HTMLCanvasElement, token: string): void;
          version: number;
        };
        const provider = (window as Window & {
          __californiaPremiumWebGlContrastProvider?: ProviderApi;
        }).__californiaPremiumWebGlContrastProvider;
        if (!provider || provider.version !== 3) return;
        try {
          provider.cancel(element, captureToken);
        } catch {
          // The original failure is the authoritative error. Cancellation is
          // best-effort only when the Canvas was replaced or already consumed.
        }
      }, capture.captureToken).catch(() => undefined);
    }
    throw error;
  }
}

/**
 * Production matrix path. Only the three reviewed learner states are accepted,
 * even if an untyped caller attempts to pass another string at runtime.
 */
export async function captureAndRegisterCaliforniaPremiumWebGlContrastEvidence(
  options: CaliforniaPremiumWebGlCaptureAndRegisterOptions & {
    stateKey: CaliforniaPremiumWebGlProductionStateKey;
  }
) {
  return captureAndRegisterCaliforniaPremiumWebGlContrastEvidenceInternal(
    options,
    options.stateKey,
    false
  );
}

/** Explicit test-only route for a deterministic settled scrub-frame contract. */
export async function captureAndRegisterCaliforniaPremiumWebGlTerminalTestEvidence(
  options: CaliforniaPremiumWebGlCaptureAndRegisterOptions & {
    testHooks?: CaliforniaPremiumWebGlTestHooks;
  }
) {
  return captureAndRegisterCaliforniaPremiumWebGlContrastEvidenceInternal(
    options,
    CALIFORNIA_PREMIUM_WEBGL_TEST_TERMINAL_STATE_KEY,
    true,
    options.testHooks
  );
}
