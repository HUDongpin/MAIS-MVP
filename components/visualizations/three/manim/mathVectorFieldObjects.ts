import { mapMathPointToWorld } from "./mathCoordinateSpace";
import { resolveOdeSystem } from "./mathOdeTrajectory";
import { buildVectorFieldArrows, sampleVectorField2D, summarizeVectorField, type MathVectorFieldArrow } from "./mathVectorField";
import type { MathObjectSpec, MathSceneOdeSystemSpec, MathSceneSpec, MathSceneVectorFieldSpec, Range2, Vec3 } from "./mathSceneTypes";

export const VECTOR_FIELD_SOURCE_CONTRACT =
  "VectorField.get_vector|ArrowVectorField|sampled vector arrows from coordinate-space grid";

export type SceneVectorField = {
  arrows: MathVectorFieldArrow[];
  field: ReturnType<typeof sampleVectorField2D>;
  spec: MathSceneVectorFieldSpec;
};

export type SceneVectorFieldSummary = {
  arrowCount: number;
  arrowLengthRange: string;
  colorBandSummary: string;
  coordinateModeSummary: string;
  finiteArrowLengthCount: number;
  finiteVectorCount: number;
  highBandCount: number;
  lengthEncodingMonotonic: boolean;
  lengthEncodingSummary: string;
  lowBandCount: number;
  maxMagnitude: number;
  midBandCount: number;
  sampleCount: number;
  sampleGridSummary: string;
  sourceContract: typeof VECTOR_FIELD_SOURCE_CONTRACT;
  summary: string;
  systemSummary: string;
  vectorFieldCount: number;
  vectorFieldIds: string;
  zeroBandCount: number;
  zeroVectorCount: number;
};

export type SceneVectorFieldPayload = SceneVectorFieldSummary & {
  fields: SceneVectorField[];
  version: "mais-manim-vector-field/v1";
};

export function vectorFieldRuntimeObjectId(fieldId: string, sampleIndex: number) {
  return `${fieldId}:sample-${sampleIndex}:arrow`;
}

function stableValue(value: unknown): unknown {
  if (typeof value === "function") return "[function]";
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

function mapPointForVectorField(point: Vec3, scene: MathSceneSpec, spec: MathSceneVectorFieldSpec): Vec3 {
  if (spec.coordinateMode !== "math") return point;

  return mapMathPointToWorld(point, scene.coordinateSpace);
}

function formatNumber(value: number) {
  return Number.isFinite(value) ? value.toFixed(3) : "NaN";
}

function formatLengthRange(lengths: number[]) {
  const finiteLengths = lengths.filter(Number.isFinite);
  if (finiteLengths.length === 0) return "none";

  return `${formatNumber(Math.min(...finiteLengths))}..${formatNumber(Math.max(...finiteLengths))}`;
}

function formatRange(range: Range2) {
  return `[${formatNumber(range[0])},${formatNumber(range[1])}]`;
}

function formatVec3(vector: Vec3) {
  return `[${vector.map(formatNumber).join(",")}]`;
}

function formatOdeSystem(system: MathSceneOdeSystemSpec) {
  if (system.type === "constantVelocity") return `constantVelocity${formatVec3(system.velocity)}`;
  if (system.type === "lorenz") {
    return `lorenz(sigma=${formatNumber(system.sigma)},rho=${formatNumber(system.rho)},beta=${formatNumber(system.beta)})`;
  }

  return `linear2d[[${system.matrix[0].map(formatNumber).join(",")}],[${system.matrix[1].map(formatNumber).join(",")}]]`;
}

function summarizeSampleGrid(spec: MathSceneVectorFieldSpec) {
  const coordinateMode = spec.coordinateMode ?? "world";

  return (
    `${spec.id}:${spec.xSteps}x${spec.ySteps}:` +
    `x=${formatRange(spec.xRange)}:y=${formatRange(spec.yRange)}:` +
    `z=${formatNumber(spec.z ?? 0)}:mode=${coordinateMode}`
  );
}

export function buildSceneVectorFields(scene: MathSceneSpec): SceneVectorField[] {
  return (scene.vectorFields ?? []).map((fieldSpec) => {
    const resolvedSystem = resolveOdeSystem(fieldSpec.system);
    const field = sampleVectorField2D({
      conceptId: fieldSpec.conceptId,
      field: (point) => resolvedSystem(point, 0),
      id: fieldSpec.id,
      xRange: fieldSpec.xRange,
      xSteps: fieldSpec.xSteps,
      yRange: fieldSpec.yRange,
      ySteps: fieldSpec.ySteps,
      z: fieldSpec.z
    });
    const arrows = buildVectorFieldArrows(field, { maxArrowLength: fieldSpec.maxArrowLength ?? 0.35 });

    return { arrows, field, spec: fieldSpec };
  });
}

export function summarizeSceneVectorFields(fields: SceneVectorField[]): SceneVectorFieldSummary {
  const fieldSummaries = fields.map(({ field }) => summarizeVectorField(field));
  const allArrows = fields.flatMap(({ arrows }) => arrows);
  const vectorFieldIds = fields.map(({ field }) => field.id).join(",") || "none";
  const sampleCount = fieldSummaries.reduce((total, summary) => total + summary.sampleCount, 0);
  const finiteVectorCount = fieldSummaries.reduce((total, summary) => total + summary.finiteVectorCount, 0);
  const zeroVectorCount = fieldSummaries.reduce((total, summary) => total + summary.zeroVectorCount, 0);
  const highBandCount = fieldSummaries.reduce((total, summary) => total + summary.highBandCount, 0);
  const midBandCount = fieldSummaries.reduce((total, summary) => total + summary.midBandCount, 0);
  const lowBandCount = fieldSummaries.reduce((total, summary) => total + summary.lowBandCount, 0);
  const zeroBandCount = fieldSummaries.reduce((total, summary) => total + summary.zeroBandCount, 0);
  const arrowCount = fields.reduce((total, field) => total + field.arrows.length, 0);
  const finiteArrowLengthCount = allArrows.filter((arrow) => Number.isFinite(arrow.length)).length;
  const arrowLengthRange = formatLengthRange(allArrows.map((arrow) => arrow.length));
  const lengthEncodingMonotonic = fields.every(({ arrows }) => {
    const sortedArrows = arrows
      .filter((arrow) => Number.isFinite(arrow.magnitude) && Number.isFinite(arrow.length))
      .sort((left, right) => left.magnitude - right.magnitude);

    return sortedArrows.every((arrow, index) => index === 0 || arrow.length + 1e-9 >= sortedArrows[index - 1].length);
  });
  const maxMagnitude = Math.max(0, ...fieldSummaries.map((summary) => summary.maxMagnitude));
  const mathCoordinateModeCount = fields.filter(({ spec }) => spec.coordinateMode === "math").length;
  const worldCoordinateModeCount = fields.length - mathCoordinateModeCount;
  const colorBandSummary = `high:${highBandCount},mid:${midBandCount},low:${lowBandCount},zero:${zeroBandCount}`;
  const coordinateModeSummary = `math=${mathCoordinateModeCount};world=${worldCoordinateModeCount}`;
  const lengthEncodingSummary =
    `lengthEncoding:arrows=${arrowCount};finite=${finiteArrowLengthCount};range=${arrowLengthRange};` +
    `monotonic=${lengthEncodingMonotonic}`;
  const sampleGridSummary = fields.map(({ spec }) => summarizeSampleGrid(spec)).join("|") || "none";
  const systemSummary = fields.map(({ spec }) => `${spec.id}:${formatOdeSystem(spec.system)}`).join("|") || "none";

  return {
    arrowCount,
    arrowLengthRange,
    colorBandSummary,
    coordinateModeSummary,
    finiteArrowLengthCount,
    finiteVectorCount,
    highBandCount,
    lengthEncodingMonotonic,
    lengthEncodingSummary,
    lowBandCount,
    maxMagnitude,
    midBandCount,
    sampleCount,
    sampleGridSummary,
    sourceContract: VECTOR_FIELD_SOURCE_CONTRACT,
    summary:
      `vectorFields=${fields.length};samples=${sampleCount};finite=${finiteVectorCount};zero=${zeroVectorCount};` +
      `bands=${colorBandSummary};` +
      `arrows=${arrowCount};max=${maxMagnitude.toFixed(3)};ids=${vectorFieldIds}`,
    systemSummary,
    vectorFieldCount: fields.length,
    vectorFieldIds,
    zeroBandCount,
    zeroVectorCount
  };
}

export function buildVectorFieldEvidenceForScene(scene: MathSceneSpec) {
  return summarizeSceneVectorFields(buildSceneVectorFields(scene));
}

export function serializeVectorFieldPayload(fields: SceneVectorField[]) {
  const evidence = summarizeSceneVectorFields(fields);

  return stableSerialize({
    ...evidence,
    fields,
    version: "mais-manim-vector-field/v1"
  } satisfies SceneVectorFieldPayload);
}

export function vectorFieldDataAttributes(summary: SceneVectorFieldSummary) {
  return {
    "data-viz-manim-vector-field-arrow-count": String(summary.arrowCount),
    "data-viz-manim-vector-field-arrow-length-range": summary.arrowLengthRange,
    "data-viz-manim-vector-field-color-band-summary": summary.colorBandSummary,
    "data-viz-manim-vector-field-coordinate-mode-summary": summary.coordinateModeSummary,
    "data-viz-manim-vector-field-count": String(summary.vectorFieldCount),
    "data-viz-manim-vector-field-finite-arrow-length-count": String(summary.finiteArrowLengthCount),
    "data-viz-manim-vector-field-finite-vector-count": String(summary.finiteVectorCount),
    "data-viz-manim-vector-field-high-band-count": String(summary.highBandCount),
    "data-viz-manim-vector-field-length-encoding-monotonic": String(summary.lengthEncodingMonotonic),
    "data-viz-manim-vector-field-length-encoding-summary": summary.lengthEncodingSummary,
    "data-viz-manim-vector-field-low-band-count": String(summary.lowBandCount),
    "data-viz-manim-vector-field-max-magnitude": summary.maxMagnitude.toFixed(3),
    "data-viz-manim-vector-field-mid-band-count": String(summary.midBandCount),
    "data-viz-manim-vector-field-sample-count": String(summary.sampleCount),
    "data-viz-manim-vector-field-sample-grid-summary": summary.sampleGridSummary,
    "data-viz-manim-vector-field-source-contract": summary.sourceContract,
    "data-viz-manim-vector-field-summary": summary.summary,
    "data-viz-manim-vector-field-system-summary": summary.systemSummary,
    "data-viz-manim-vector-field-zero-band-count": String(summary.zeroBandCount),
    "data-viz-manim-vector-field-zero-vector-count": String(summary.zeroVectorCount)
  } as const;
}

function vectorFieldArrowStyle(arrow: MathVectorFieldArrow, strokeRole: string) {
  if (arrow.colorBand === "high") return { strokeOpacity: 0.76, strokeRole, strokeWidth: 2.8 };
  if (arrow.colorBand === "mid") return { strokeOpacity: 0.62, strokeRole, strokeWidth: 2.4 };
  if (arrow.colorBand === "low") return { strokeOpacity: 0.5, strokeRole, strokeWidth: 2.15 };
  return { strokeOpacity: 0.4, strokeRole, strokeWidth: 2 };
}

export function buildVectorFieldObjectSpecs(scene: MathSceneSpec): MathObjectSpec[] {
  const authoredIds = new Set(scene.objects.map((object) => object.id));

  return buildSceneVectorFields(scene).flatMap(({ arrows, spec }): MathObjectSpec[] => {
    return arrows.flatMap((arrow, index): MathObjectSpec[] => {
      const id = vectorFieldRuntimeObjectId(spec.id, index);
      if (authoredIds.has(id)) return [];

      return [
        {
          type: "vector",
          colorRole: spec.colorRole ?? "trace",
          conceptId: spec.conceptId,
          from: mapPointForVectorField(arrow.from, scene, spec),
          id,
          style: vectorFieldArrowStyle(arrow, spec.colorRole ?? "trace"),
          to: mapPointForVectorField(arrow.to, scene, spec)
        }
      ];
    });
  });
}

export function expandSceneVectorFieldObjects(scene: MathSceneSpec): MathSceneSpec {
  const generatedObjects = buildVectorFieldObjectSpecs(scene);
  if (generatedObjects.length === 0) return scene;

  return {
    ...scene,
    diagnostics: {
      ...scene.diagnostics,
      expectedObjectCount: scene.diagnostics.expectedObjectCount + generatedObjects.length
    },
    objects: [...scene.objects, ...generatedObjects]
  };
}
