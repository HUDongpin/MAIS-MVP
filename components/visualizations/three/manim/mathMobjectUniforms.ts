import type { MathObjectGraph } from "./mathSceneRuntimeState";
import type { MathMobjectClippingPlaneSpec, MathMobjectUniformSpec, MathObjectSpec, Vec3 } from "./mathSceneTypes";

export const MOBJECT_UNIFORM_SOURCE_CONTRACT = "Mobject.uniforms|fixedInFrame|opacity|shadeIn3D|clippingPlanes";

export type RuntimeMobjectClippingPlane = {
  constant: number;
  normal: Vec3;
};

export type RuntimeMobjectUniforms = {
  clippingPlanes: RuntimeMobjectClippingPlane[];
  fixedInFrame: boolean;
  opacity: number;
  shadeIn3D: boolean;
};

export type MobjectUniformSummary = {
  clippingPlaneCount: number;
  fixedInFrameCount: number;
  minOpacity: number;
  objectCount: number;
  shadeIn3DCount: number;
  summary: string;
  transparentCount: number;
};

export type MobjectUniformPayload = MobjectUniformSummary & {
  sourceContract: typeof MOBJECT_UNIFORM_SOURCE_CONTRACT;
};

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(1, Math.max(0, value));
}

function clampProgress(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
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

function normalizeVector([x, y, z]: Vec3): Vec3 | null {
  if (![x, y, z].every(Number.isFinite)) return null;

  const length = Math.hypot(x, y, z);
  if (length === 0) return null;

  return [x / length, y / length, z / length];
}

function normalizeClippingPlane(plane: MathMobjectClippingPlaneSpec): RuntimeMobjectClippingPlane | null {
  const normal = normalizeVector(plane.normal);
  if (!normal || !Number.isFinite(plane.constant)) return null;

  return {
    constant: plane.constant,
    normal
  };
}

export function normalizeMobjectUniforms(uniforms: MathMobjectUniformSpec = {}): RuntimeMobjectUniforms {
  return {
    clippingPlanes: (uniforms.clippingPlanes ?? [])
      .map(normalizeClippingPlane)
      .filter((plane): plane is RuntimeMobjectClippingPlane => Boolean(plane)),
    fixedInFrame: uniforms.fixedInFrame === true,
    opacity: clamp01(uniforms.opacity ?? 1),
    shadeIn3D: uniforms.shadeIn3D === true
  };
}

function defaultMobjectUniforms(): RuntimeMobjectUniforms {
  return {
    clippingPlanes: [],
    fixedInFrame: false,
    opacity: 1,
    shadeIn3D: false
  };
}

function normalizeRuntimeVector(point: Vec3, fallback: Vec3): Vec3 {
  const normalized = normalizeVector(point);

  return normalized ?? fallback;
}

function interpolateMobjectClippingPlanes(
  source: RuntimeMobjectClippingPlane[],
  target: RuntimeMobjectClippingPlane[],
  progress: number
) {
  if (source.length !== target.length) {
    return progress >= 1 ? target : source;
  }

  return source.map((sourcePlane, index) => {
    const targetPlane = target[index];
    const blendedNormal: Vec3 = [
      lerp(sourcePlane.normal[0], targetPlane.normal[0], progress),
      lerp(sourcePlane.normal[1], targetPlane.normal[1], progress),
      lerp(sourcePlane.normal[2], targetPlane.normal[2], progress)
    ];

    return {
      constant: lerp(sourcePlane.constant, targetPlane.constant, progress),
      normal: normalizeRuntimeVector(blendedNormal, sourcePlane.normal)
    };
  });
}

export function interpolateMobjectUniforms(
  source: RuntimeMobjectUniforms | undefined,
  target: RuntimeMobjectUniforms | undefined,
  progress: number
): RuntimeMobjectUniforms | undefined {
  if (!source && !target) return undefined;

  const alpha = clampProgress(progress);
  const sourceUniforms = source ?? defaultMobjectUniforms();
  const targetUniforms = target ?? sourceUniforms;

  return {
    clippingPlanes: interpolateMobjectClippingPlanes(sourceUniforms.clippingPlanes, targetUniforms.clippingPlanes, alpha),
    fixedInFrame: alpha >= 1 ? targetUniforms.fixedInFrame : sourceUniforms.fixedInFrame,
    opacity: lerp(sourceUniforms.opacity, targetUniforms.opacity, alpha),
    shadeIn3D: alpha >= 1 ? targetUniforms.shadeIn3D : sourceUniforms.shadeIn3D
  };
}

export function fixedInFrameUniformObjectIds(objects: MathObjectSpec[]) {
  return objects
    .filter((object) => normalizeMobjectUniforms(object.uniforms).fixedInFrame)
    .map((object) => object.id);
}

export function summarizeMobjectUniforms(graph: MathObjectGraph): MobjectUniformSummary {
  const uniforms = Object.values(graph.byId).map((node) => normalizeMobjectUniforms(node.uniforms));
  const minOpacity = uniforms.length > 0 ? Math.min(...uniforms.map((uniform) => uniform.opacity)) : 1;
  const summary = {
    clippingPlaneCount: uniforms.reduce((total, uniform) => total + uniform.clippingPlanes.length, 0),
    fixedInFrameCount: uniforms.filter((uniform) => uniform.fixedInFrame).length,
    minOpacity,
    objectCount: uniforms.length,
    shadeIn3DCount: uniforms.filter((uniform) => uniform.shadeIn3D).length,
    transparentCount: uniforms.filter((uniform) => uniform.opacity < 1).length
  };

  return {
    ...summary,
    summary: [
      `objects=${summary.objectCount}`,
      `fixed=${summary.fixedInFrameCount}`,
      `shade3d=${summary.shadeIn3DCount}`,
      `clipPlanes=${summary.clippingPlaneCount}`,
      `transparent=${summary.transparentCount}`,
      `minOpacity=${summary.minOpacity.toFixed(3)}`
    ].join(";")
  };
}

export function buildMobjectUniformPayload(graph: MathObjectGraph): MobjectUniformPayload {
  return {
    ...summarizeMobjectUniforms(graph),
    sourceContract: MOBJECT_UNIFORM_SOURCE_CONTRACT
  };
}

export function serializeMobjectUniformPayload(payload: MobjectUniformPayload) {
  return stableSerialize(payload);
}
