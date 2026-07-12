import type { MathObjectSpec, MathSceneSpec } from "./mathSceneTypes";
import { normalizeMobjectUniforms } from "./mathMobjectUniforms";
import { buildVMobjectStyle } from "./mathVMobjectStyle";

export const MANIM_CONFIG_DIGEST_SOURCE_CONTRACT =
  "digest_config|CONFIG inheritance|explicit kwargs override class defaults" as const;

type ManimConfigClassChain = "Mobject" | "Mobject>VMobject";

export type ManimConfigDigestRow = {
  classChain: ManimConfigClassChain;
  configKeyCount: number;
  defaultedKeyCount: number;
  explicitConfigKeys: string[];
  objectId: string;
  objectType: MathObjectSpec["type"];
  resolvedClippingPlaneCount: number;
  resolvedFillOpacity: number | null;
  resolvedFixedInFrame: boolean;
  resolvedOpacity: number;
  resolvedShadeIn3D: boolean;
  resolvedStrokeOpacity: number | null;
  resolvedStrokeWidth: number | null;
  resolvedStrokeZoomBehavior: string;
  resolvedZIndex: number;
};

export type ManimConfigDigest = {
  classSummary: string;
  clippingPlaneCount: number;
  defaultedValueCount: number;
  explicitOverrideCount: number;
  familyId: MathSceneSpec["familyId"];
  fixedInFrameCount: number;
  objectCount: number;
  opacityRange: string;
  rowSummary: string;
  rows: ManimConfigDigestRow[];
  sceneId: string;
  shadeIn3DCount: number;
  signature: string;
  sourceContract: typeof MANIM_CONFIG_DIGEST_SOURCE_CONTRACT;
  summary: string;
  version: "mais-manim-config-digest/v1";
  vmobjectCount: number;
  zIndexRange: string;
};

const BASE_CONFIG_KEYS = ["clippingPlanes", "fixedInFrame", "opacity", "shadeIn3D", "zIndex"] as const;
const VMOBJECT_CONFIG_KEYS = [
  "antiAliasWidth",
  "baseNormal",
  "fillOpacity",
  "fillRole",
  "jointAngleDegrees",
  "strokeOpacity",
  "strokeRole",
  "strokeWidth",
  "strokeZoomBehavior"
] as const;

function isVMobjectSpec(object: MathObjectSpec) {
  return object.type === "parametricCurve" || object.type === "parametricSurface" || object.type === "trace" || object.type === "vector";
}

function finiteNumber(value: number | undefined, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function formatNumber(value: number, digits = 3) {
  return Number.isFinite(value) ? value.toFixed(digits) : "0.000";
}

function formatRange(values: number[], digits = 3) {
  if (values.length === 0) return `0.${"0".repeat(digits)}..0.${"0".repeat(digits)}`;
  return `${formatNumber(Math.min(...values), digits)}..${formatNumber(Math.max(...values), digits)}`;
}

function formatIntegerRange(values: number[]) {
  if (values.length === 0) return "0..0";
  return `${Math.min(...values)}..${Math.max(...values)}`;
}

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function hasOwnDefined(object: object | undefined, key: string) {
  return Boolean(object && Object.prototype.hasOwnProperty.call(object, key) && (object as Record<string, unknown>)[key] !== undefined);
}

function explicitUniformKeys(object: MathObjectSpec) {
  return BASE_CONFIG_KEYS.filter((key) => key !== "zIndex" && hasOwnDefined(object.uniforms, key));
}

function explicitStyleKeys(object: MathObjectSpec) {
  if (!isVMobjectSpec(object)) return [];
  return VMOBJECT_CONFIG_KEYS.filter((key) => hasOwnDefined(object.style, key));
}

function explicitConfigKeys(object: MathObjectSpec) {
  return uniqueSorted([
    ...explicitUniformKeys(object),
    ...(typeof object.zIndex === "number" && Number.isFinite(object.zIndex) ? ["zIndex"] : []),
    ...explicitStyleKeys(object)
  ]);
}

function classChainForObject(object: MathObjectSpec): ManimConfigClassChain {
  return isVMobjectSpec(object) ? "Mobject>VMobject" : "Mobject";
}

function buildRow(object: MathObjectSpec): ManimConfigDigestRow {
  const vmobject = isVMobjectSpec(object);
  const configKeyCount = BASE_CONFIG_KEYS.length + (vmobject ? VMOBJECT_CONFIG_KEYS.length : 0);
  const explicitKeys = explicitConfigKeys(object);
  const uniforms = normalizeMobjectUniforms(object.uniforms);
  const style = vmobject ? buildVMobjectStyle(object.style) : null;

  return {
    classChain: classChainForObject(object),
    configKeyCount,
    defaultedKeyCount: Math.max(0, configKeyCount - explicitKeys.length),
    explicitConfigKeys: explicitKeys,
    objectId: object.id,
    objectType: object.type,
    resolvedClippingPlaneCount: uniforms.clippingPlanes.length,
    resolvedFillOpacity: style?.fillOpacity ?? null,
    resolvedFixedInFrame: uniforms.fixedInFrame,
    resolvedOpacity: uniforms.opacity,
    resolvedShadeIn3D: uniforms.shadeIn3D,
    resolvedStrokeOpacity: style?.strokeOpacity ?? null,
    resolvedStrokeWidth: style?.strokeWidth ?? null,
    resolvedStrokeZoomBehavior: style?.strokeZoomBehavior ?? "none",
    resolvedZIndex: Math.round(finiteNumber(object.zIndex, 0))
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

function hashStableJson(value: string) {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return `config-digest-${hash.toString(16).padStart(8, "0")}`;
}

function rowSummary(rows: ManimConfigDigestRow[]) {
  return rows
    .map((row) => `${row.objectId}:${row.explicitConfigKeys.join(",") || "none"}`)
    .join("|") || "none";
}

function classSummary(rows: ManimConfigDigestRow[]) {
  const vmobjectCount = rows.filter((row) => row.classChain === "Mobject>VMobject").length;
  const mobjectOnlyCount = rows.length - vmobjectCount;

  return `Mobject=${mobjectOnlyCount};VMobject=${vmobjectCount}`;
}

// Manim source contract: digest_config walks CONFIG dictionaries through the
// inheritance chain, then lets explicit kwargs override inherited defaults.
// This browser port records which scene-spec values are explicit versus
// defaulted before R3F receives resolved uniforms/styles.
export function buildManimConfigDigest(scene: MathSceneSpec): ManimConfigDigest {
  const rows = scene.objects.map(buildRow);
  const vmobjectCount = rows.filter((row) => row.classChain === "Mobject>VMobject").length;
  const baseDigest = {
    classSummary: classSummary(rows),
    clippingPlaneCount: rows.reduce((total, row) => total + row.resolvedClippingPlaneCount, 0),
    defaultedValueCount: rows.reduce((total, row) => total + row.defaultedKeyCount, 0),
    explicitOverrideCount: rows.reduce((total, row) => total + row.explicitConfigKeys.length, 0),
    familyId: scene.familyId,
    fixedInFrameCount: rows.filter((row) => row.resolvedFixedInFrame).length,
    objectCount: rows.length,
    opacityRange: formatRange(rows.map((row) => row.resolvedOpacity)),
    rowSummary: rowSummary(rows),
    rows,
    sceneId: scene.sceneId,
    shadeIn3DCount: rows.filter((row) => row.resolvedShadeIn3D).length,
    version: "mais-manim-config-digest/v1" as const,
    vmobjectCount,
    zIndexRange: formatIntegerRange(rows.map((row) => row.resolvedZIndex))
  };
  const summary = [
    `config-digest:${scene.sceneId}`,
    `objects=${baseDigest.objectCount}`,
    `vmobjects=${baseDigest.vmobjectCount}`,
    `explicit=${baseDigest.explicitOverrideCount}`,
    `defaulted=${baseDigest.defaultedValueCount}`,
    `classes=${baseDigest.classSummary}`
  ].join(":");

  return {
    ...baseDigest,
    signature: hashStableJson(stableSerialize(baseDigest)),
    sourceContract: MANIM_CONFIG_DIGEST_SOURCE_CONTRACT,
    summary
  };
}

export function manimConfigDigestDataAttributes(digest: ManimConfigDigest) {
  return {
    "data-viz-manim-config-digest-class-summary": digest.classSummary,
    "data-viz-manim-config-digest-clipping-plane-count": String(digest.clippingPlaneCount),
    "data-viz-manim-config-digest-defaulted-value-count": String(digest.defaultedValueCount),
    "data-viz-manim-config-digest-explicit-override-count": String(digest.explicitOverrideCount),
    "data-viz-manim-config-digest-fixed-in-frame-count": String(digest.fixedInFrameCount),
    "data-viz-manim-config-digest-object-count": String(digest.objectCount),
    "data-viz-manim-config-digest-opacity-range": digest.opacityRange,
    "data-viz-manim-config-digest-row-summary": digest.rowSummary,
    "data-viz-manim-config-digest-shade-in-3d-count": String(digest.shadeIn3DCount),
    "data-viz-manim-config-digest-signature": digest.signature,
    "data-viz-manim-config-digest-source-contract": digest.sourceContract,
    "data-viz-manim-config-digest-summary": digest.summary,
    "data-viz-manim-config-digest-vmobject-count": String(digest.vmobjectCount),
    "data-viz-manim-config-digest-z-index-range": digest.zIndexRange
  };
}

export function serializeManimConfigDigest(digest: ManimConfigDigest) {
  return stableSerialize(digest);
}
