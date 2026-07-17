import { normalizeMobjectUniforms, type RuntimeMobjectClippingPlane, type RuntimeMobjectUniforms } from "./mathMobjectUniforms";
import type { MathObjectGraph } from "./mathSceneRuntimeState";
import type { MathMobjectUniformSpec } from "./mathSceneTypes";

export const MOBJECT_MATERIAL_UNIFORM_SOURCE_CONTRACT =
  "Mobject.uniforms->materialPropsForMobject|opacity/depthWrite/clippingPlanes/shadeIn3D";

export type MobjectMaterialUniformInput = MathMobjectUniformSpec | RuntimeMobjectUniforms | null | undefined;

export type MobjectMaterialUniformProps = {
  clippingPlaneCount: number;
  clippingPlanes: RuntimeMobjectClippingPlane[];
  depthWrite: boolean;
  opacity: number;
  shadeIn3D: boolean;
  transparent: boolean;
};

export type MobjectMaterialUniformEvidence = {
  clippingPlaneCount: number;
  depthWriteEnabledCount: number;
  objectCount: number;
  objectIds: string;
  opacityRange: string;
  shadeIn3DCount: number;
  sourceContract: typeof MOBJECT_MATERIAL_UNIFORM_SOURCE_CONTRACT;
  summary: string;
  transparentCount: number;
};

function clamp01(value: number, fallback = 1) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}

function formatNumber(value: number) {
  return Number.isFinite(value) ? value.toFixed(3) : "none";
}

function opacityRange(opacities: number[]) {
  if (opacities.length === 0) return "none";

  return `${formatNumber(Math.min(...opacities))}..${formatNumber(Math.max(...opacities))}`;
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

export function materialPropsForMobject(uniforms?: MobjectMaterialUniformInput): MobjectMaterialUniformProps {
  const normalized = normalizeMobjectUniforms(uniforms ?? undefined);
  const transparent = normalized.opacity < 1;

  return {
    clippingPlaneCount: normalized.clippingPlanes.length,
    clippingPlanes: normalized.clippingPlanes,
    depthWrite: !transparent,
    opacity: normalized.opacity,
    shadeIn3D: normalized.shadeIn3D,
    transparent
  };
}

export function lineOpacityForMobject(baseOpacity: number, materialProps: Pick<MobjectMaterialUniformProps, "opacity">) {
  return clamp01(baseOpacity) * materialProps.opacity;
}

export function lineTransparencyForMobject(
  baseOpacity: number,
  materialProps: Pick<MobjectMaterialUniformProps, "transparent">
) {
  return materialProps.transparent || clamp01(baseOpacity) < 1;
}

export function buildMobjectMaterialUniformEvidence(objectGraph: MathObjectGraph): MobjectMaterialUniformEvidence {
  const nodes = Object.values(objectGraph.byId).sort((left, right) => left.id.localeCompare(right.id));
  const materialProps = nodes.map((node) => materialPropsForMobject(node.uniforms));
  const opacities = materialProps.map((props) => props.opacity);
  const objectIds = nodes.map((node) => node.id).join(",") || "none";
  const clippingPlaneCount = materialProps.reduce((sum, props) => sum + props.clippingPlaneCount, 0);
  const depthWriteEnabledCount = materialProps.filter((props) => props.depthWrite).length;
  const shadeIn3DCount = materialProps.filter((props) => props.shadeIn3D).length;
  const transparentCount = materialProps.filter((props) => props.transparent).length;
  const range = opacityRange(opacities);

  return {
    clippingPlaneCount,
    depthWriteEnabledCount,
    objectCount: nodes.length,
    objectIds,
    opacityRange: range,
    shadeIn3DCount,
    sourceContract: MOBJECT_MATERIAL_UNIFORM_SOURCE_CONTRACT,
    summary: `material-uniforms:objects=${nodes.length}:transparent=${transparentCount}:depthWrite=${depthWriteEnabledCount}:shade3d=${shadeIn3DCount}:clipPlanes=${clippingPlaneCount}:opacityRange=${range}:ids=${objectIds}`,
    transparentCount
  };
}

export function mobjectMaterialUniformEvidenceDataAttributes(evidence: MobjectMaterialUniformEvidence) {
  return {
    "data-viz-mobject-material-clipping-plane-count": String(evidence.clippingPlaneCount),
    "data-viz-mobject-material-depth-write-enabled-count": String(evidence.depthWriteEnabledCount),
    "data-viz-mobject-material-object-count": String(evidence.objectCount),
    "data-viz-mobject-material-object-ids": evidence.objectIds,
    "data-viz-mobject-material-opacity-range": evidence.opacityRange,
    "data-viz-mobject-material-shade-in-3d-count": String(evidence.shadeIn3DCount),
    "data-viz-mobject-material-source-contract": evidence.sourceContract,
    "data-viz-mobject-material-summary": evidence.summary,
    "data-viz-mobject-material-transparent-count": String(evidence.transparentCount)
  } as const;
}

export function serializeMobjectMaterialUniformEvidence(evidence: MobjectMaterialUniformEvidence) {
  return stableSerialize(evidence);
}
