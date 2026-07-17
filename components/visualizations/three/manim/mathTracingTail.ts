import { buildCurveObject, pointwiseBecomePartialCurveObject } from "./mathCurveObject";
import type { MathSceneRuntimeState } from "./mathSceneRuntimeState";
import type { MathSceneSpec, Vec3 } from "./mathSceneTypes";

export const TRACING_TAIL_SOURCE_CONTRACT =
  "TracedPath.update_path|TracingTail|recent point buffer with age-based opacity/stroke gradient";

export type TracingTailEntry = {
  point: Vec3;
  timestampSeconds: number;
};

export type TracingTailBuffer = {
  capacity: number;
  entries: TracingTailEntry[];
  id: string;
};

export type TracingTailStyle = {
  maxOpacity: number;
  maxStrokeWidth: number;
  minOpacity: number;
  minStrokeWidth: number;
};

export type TracingTailSample = TracingTailEntry & {
  ageSeconds: number;
  normalizedAge: number;
  opacity: number;
  strokeWidth: number;
};

export type TracingTailDescriptor = {
  buffer: TracingTailBuffer;
  id: string;
  points: Vec3[];
  samples: TracingTailSample[];
  style: TracingTailStyle;
};

export type TracingTailEvidenceEntry = {
  descriptor: TracingTailDescriptor;
  durationSeconds: number;
  sourceObjectId: string;
};

export type TracingTailEvidence = {
  ageRange: string;
  bufferCapacity: number;
  bufferPolicySummary: string;
  durationSummary: string;
  fillRatioSummary: string;
  finiteSampleCount: number;
  freshPointSummary: string;
  gradientDirectionSummary: string;
  gradientMonotonic: boolean;
  gradientSummary: string;
  opacityRange: string;
  sampleCount: number;
  sampleCadenceSummary: string;
  sampleTimeOrderSummary: string;
  sourceContract: typeof TRACING_TAIL_SOURCE_CONTRACT;
  sourceObjectIds: string;
  stalePointSummary: string;
  strokeWidthRange: string;
  summary: string;
  tailCount: number;
  tailIds: string;
  timestampRange: string;
  tracedPointSourceSummary: string;
  version: "mais-manim-tracing-tail/v1";
};

export type TracingTailEvidencePayload = TracingTailEvidence & {
  entries: TracingTailEvidenceEntry[];
};

export type VisibleTracingTailOptions = Partial<TracingTailStyle> & {
  durationSeconds: number;
  nowSeconds: number;
};

export type BuildTracingTailFromPointsInput = Partial<TracingTailStyle> & {
  durationSeconds: number;
  id: string;
  maxSampleCount: number;
  nowSeconds: number;
  points: Vec3[];
};

const defaultTailStyle: TracingTailStyle = {
  maxOpacity: 0.72,
  maxStrokeWidth: 3.5,
  minOpacity: 0.12,
  minStrokeWidth: 1
};
const durationBoundaryTolerance = 1e-9;

function finite(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
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

function clamp01(value: number) {
  return Math.min(1, Math.max(0, finite(value, 0)));
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function sanitizePoint(point: Vec3): Vec3 {
  return [
    finite(point[0], 0),
    finite(point[1], 0),
    finite(point[2], 0)
  ];
}

function sanitizeStyle(style: Partial<TracingTailStyle>): TracingTailStyle {
  const minOpacity = clamp01(style.minOpacity ?? defaultTailStyle.minOpacity);
  const maxOpacity = clamp01(style.maxOpacity ?? defaultTailStyle.maxOpacity);
  const minStrokeWidth = Math.max(0, finite(style.minStrokeWidth ?? defaultTailStyle.minStrokeWidth, defaultTailStyle.minStrokeWidth));
  const maxStrokeWidth = Math.max(minStrokeWidth, finite(style.maxStrokeWidth ?? defaultTailStyle.maxStrokeWidth, defaultTailStyle.maxStrokeWidth));

  return {
    maxOpacity: Math.max(minOpacity, maxOpacity),
    maxStrokeWidth,
    minOpacity,
    minStrokeWidth
  };
}

function isFiniteVec3(point: Vec3) {
  return point.every(Number.isFinite);
}

function formatFixedNumber(value: number) {
  return Number.isFinite(value) ? value.toFixed(3) : "NaN";
}

function formatPoint(point: Vec3) {
  return point.map(formatFixedNumber).join(",");
}

function formatRange(values: number[]) {
  const finiteValues = values.filter(Number.isFinite);

  if (finiteValues.length === 0) return "none";

  return `${formatFixedNumber(Math.min(...finiteValues))}..${formatFixedNumber(Math.max(...finiteValues))}`;
}

function formatRatio(numerator: number, denominator: number) {
  if (denominator <= 0) return "0.000";

  return formatFixedNumber(numerator / denominator);
}

function byTime(left: TracingTailEntry, right: TracingTailEntry) {
  return left.timestampSeconds - right.timestampSeconds;
}

function pointSummary(entries: TracingTailEvidenceEntry[], selector: "first" | "last") {
  return entries
    .map((entry) => {
      const samples = entry.descriptor.samples;
      const sample = selector === "first" ? samples[0] : samples.at(-1);

      return `${entry.descriptor.id}=${sample ? formatPoint(sample.point) : "none"}`;
    })
    .join(";") || "none";
}

function sampleCadenceSummary(entries: TracingTailEvidenceEntry[]) {
  return entries
    .map((entry) => {
      const samples = entry.descriptor.samples;
      const cadence = samples
        .slice(1)
        .map((sample, index) => formatFixedNumber(sample.timestampSeconds - samples[index].timestampSeconds));

      return `${entry.descriptor.id}=${cadence.join(",") || "none"}`;
    })
    .join(";") || "none";
}

function sampleTimeOrderSummary(entries: TracingTailEvidenceEntry[]) {
  return entries
    .map((entry) => {
      const samples = entry.descriptor.samples;
      const monotonic = samples.every((sample, index) => index === 0 || sample.timestampSeconds >= samples[index - 1].timestampSeconds);

      return `${entry.descriptor.id}=${monotonic ? "monotonic" : "non-monotonic"}:${samples.length}`;
    })
    .join(";") || "none";
}

function isNondecreasing(values: number[]) {
  return values.every((value, index) => index === 0 || value >= values[index - 1] - 1e-9);
}

function freshSampleHasMaxStyle(samples: TracingTailSample[]) {
  const freshSample = samples.at(-1);
  if (!freshSample) return true;

  return (
    freshSample.opacity >= Math.max(...samples.map((sample) => sample.opacity)) - 1e-9 &&
    freshSample.strokeWidth >= Math.max(...samples.map((sample) => sample.strokeWidth)) - 1e-9
  );
}

function gradientDirectionSummary(entries: TracingTailEvidenceEntry[]) {
  return entries
    .map((entry) => {
      const samples = entry.descriptor.samples;
      const opacityDirection = isNondecreasing(samples.map((sample) => sample.opacity)) ? "nondecreasing" : "nonmonotonic";
      const strokeDirection = isNondecreasing(samples.map((sample) => sample.strokeWidth)) ? "nondecreasing" : "nonmonotonic";
      const freshStatus = samples.length === 0 ? "none" : freshSampleHasMaxStyle(samples) ? "max" : "not-max";

      return `${entry.descriptor.id}=opacity:${opacityDirection};stroke:${strokeDirection};fresh=${freshStatus}`;
    })
    .join(";") || "none";
}

function hasMonotonicTailGradients(entries: TracingTailEvidenceEntry[]) {
  return entries.every((entry) => {
    const samples = entry.descriptor.samples;

    return (
      isNondecreasing(samples.map((sample) => sample.opacity)) &&
      isNondecreasing(samples.map((sample) => sample.strokeWidth)) &&
      freshSampleHasMaxStyle(samples)
    );
  });
}

function isParametricCurveSpec(
  object: MathSceneSpec["objects"][number]
): object is Extract<MathSceneSpec["objects"][number], { type: "parametricCurve" }> {
  return object.type === "parametricCurve";
}

function isMovingPointSpec(
  object: MathSceneSpec["objects"][number]
): object is Extract<MathSceneSpec["objects"][number], { type: "movingPoint" }> {
  return object.type === "movingPoint";
}

function isTraceSpec(
  object: MathSceneSpec["objects"][number]
): object is Extract<MathSceneSpec["objects"][number], { type: "trace" }> {
  return object.type === "trace";
}

export function createTracingTailBuffer(id: string, capacity: number): TracingTailBuffer {
  return {
    capacity: Math.max(1, Math.floor(finite(capacity, 1))),
    entries: [],
    id
  };
}

export function appendTracingTailSample(buffer: TracingTailBuffer, point: Vec3, timestampSeconds: number): TracingTailBuffer {
  const entry: TracingTailEntry = {
    point: sanitizePoint(point),
    timestampSeconds: finite(timestampSeconds, 0)
  };
  const entries = [...buffer.entries, entry]
    .sort(byTime)
    .slice(-buffer.capacity);

  return {
    ...buffer,
    entries
  };
}

export function visibleTracingTailSamples(buffer: TracingTailBuffer, options: VisibleTracingTailOptions): TracingTailSample[] {
  const durationSeconds = Math.max(0, finite(options.durationSeconds, 0));
  const nowSeconds = finite(options.nowSeconds, 0);
  const style = sanitizeStyle(options);

  return buffer.entries
    .filter((entry) => {
      const ageSeconds = nowSeconds - entry.timestampSeconds;
      return ageSeconds >= -durationBoundaryTolerance && ageSeconds <= durationSeconds + durationBoundaryTolerance;
    })
    .map((entry) => {
      const ageSeconds = nowSeconds - entry.timestampSeconds;
      const normalizedAge = durationSeconds > 0 ? clamp01(ageSeconds / durationSeconds) : 0;
      const freshness = 1 - normalizedAge;

      return {
        ...entry,
        ageSeconds,
        normalizedAge,
        opacity: lerp(style.minOpacity, style.maxOpacity, freshness),
        strokeWidth: lerp(style.minStrokeWidth, style.maxStrokeWidth, freshness)
      };
    });
}

export function buildTracingTailFromPoints({
  durationSeconds,
  id,
  maxSampleCount,
  nowSeconds,
  points,
  ...styleOptions
}: BuildTracingTailFromPointsInput): TracingTailDescriptor {
  const capacity = Math.max(1, Math.floor(finite(maxSampleCount, 1)));
  const tailPoints = points.slice(-capacity);
  const style = sanitizeStyle(styleOptions);
  const denominator = Math.max(1, tailPoints.length - 1);
  const buffer = tailPoints.reduce((current, point, index) => {
    const ageSeconds = tailPoints.length <= 1
      ? 0
      : durationSeconds * (1 - index / denominator);
    return appendTracingTailSample(current, point, nowSeconds - ageSeconds);
  }, createTracingTailBuffer(id, capacity));
  const samples = visibleTracingTailSamples(buffer, {
    ...style,
    durationSeconds,
    nowSeconds
  });

  return {
    buffer,
    id,
    points: samples.map((sample) => sample.point),
    samples,
    style
  };
}

export function buildTracingTailEvidence(entries: TracingTailEvidenceEntry[]): TracingTailEvidence {
  const tailIds = entries.map((entry) => entry.descriptor.id).join(",") || "none";
  const sourceObjectIds = entries.map((entry) => entry.sourceObjectId).join(",") || "none";
  const allSamples = entries.flatMap((entry) => entry.descriptor.samples);
  const bufferCapacity = entries.reduce((sum, entry) => sum + entry.descriptor.buffer.capacity, 0);
  const bufferPolicySummary = entries
    .map((entry) => `${entry.descriptor.id}=fixed-capacity:${entry.descriptor.buffer.capacity}:last-${entry.descriptor.buffer.capacity}`)
    .join(";") || "none";
  const durationSummary = entries
    .map((entry) => `${entry.descriptor.id}=${formatFixedNumber(Math.max(0, finite(entry.durationSeconds, 0)))}s`)
    .join(";") || "none";
  const sampleCount = allSamples.length;
  const finiteSampleCount = allSamples.filter((sample) => isFiniteVec3(sample.point)).length;
  const ageRange = formatRange(allSamples.map((sample) => sample.ageSeconds));
  const timestampRange = formatRange(allSamples.map((sample) => sample.timestampSeconds));
  const opacityRange = formatRange(allSamples.map((sample) => sample.opacity));
  const strokeWidthRange = formatRange(allSamples.map((sample) => sample.strokeWidth));
  const fillRatioSummary = entries
    .map((entry) => {
      const capacity = entry.descriptor.buffer.capacity;
      const samples = entry.descriptor.samples.length;
      return `${entry.descriptor.id}=${samples}/${capacity}=${formatRatio(samples, capacity)}`;
    })
    .join(";") || "none";
  const gradientSummary = entries
    .map((entry) => {
      const opacity = formatRange(entry.descriptor.samples.map((sample) => sample.opacity));
      const stroke = formatRange(entry.descriptor.samples.map((sample) => sample.strokeWidth));
      return `${entry.descriptor.id}:opacity=${opacity}:stroke=${stroke}:fresh=max`;
    })
    .join(";") || "none";
  const monotonicGradient = hasMonotonicTailGradients(entries);
  const directionSummary = gradientDirectionSummary(entries);
  const stalePointSummary = pointSummary(entries, "first");
  const freshPointSummary = pointSummary(entries, "last");
  const cadenceSummary = sampleCadenceSummary(entries);
  const timeOrderSummary = sampleTimeOrderSummary(entries);
  const tracedPointSourceSummary = entries
    .map((entry) => `${entry.descriptor.id}<-${entry.sourceObjectId}`)
    .join(";") || "none";
  const summary = [
    `tracingTail:tails=${entries.length}`,
    `samples=${sampleCount}`,
    `finite=${finiteSampleCount}`,
    `capacity=${bufferCapacity}`,
    `ids=${tailIds}`,
    `sources=${sourceObjectIds}`,
    `age=${ageRange}`,
    `opacity=${opacityRange}`,
    `stroke=${strokeWidthRange}`
  ].join(":");

  return {
    ageRange,
    bufferCapacity,
    bufferPolicySummary,
    durationSummary,
    fillRatioSummary,
    finiteSampleCount,
    freshPointSummary,
    gradientDirectionSummary: directionSummary,
    gradientMonotonic: monotonicGradient,
    gradientSummary,
    opacityRange,
    sampleCount,
    sampleCadenceSummary: cadenceSummary,
    sampleTimeOrderSummary: timeOrderSummary,
    sourceContract: TRACING_TAIL_SOURCE_CONTRACT,
    sourceObjectIds,
    stalePointSummary,
    strokeWidthRange,
    summary,
    tailCount: entries.length,
    tailIds,
    timestampRange,
    tracedPointSourceSummary,
    version: "mais-manim-tracing-tail/v1"
  };
}

export function buildTracingTailEvidenceEntriesForScene(scene: MathSceneSpec, runtimeState: MathSceneRuntimeState): TracingTailEvidenceEntry[] {
  return scene.objects
    .filter(isTraceSpec)
    .flatMap((traceSpec) => {
      const movingPoint = scene.objects.find((object) => object.id === traceSpec.sourceObjectId);
      if (!movingPoint || !isMovingPointSpec(movingPoint)) return [];

      const curveSpec = scene.objects.find((object) => object.id === movingPoint.pathObjectId);
      if (!curveSpec || !isParametricCurveSpec(curveSpec)) return [];

      const progress = runtimeState.trackers.byId[`${movingPoint.id}:progress`]?.value ?? 1;
      const curve = buildCurveObject({
        colorRole: curveSpec.colorRole,
        conceptId: curveSpec.conceptId,
        id: curveSpec.id,
        samples: curveSpec.samples,
        style: curveSpec.style
      });
      const tracePoints = pointwiseBecomePartialCurveObject(curve, Math.max(0, progress - 0.18), progress).curve.samples;

      return [
        {
          descriptor: buildTracingTailFromPoints({
            durationSeconds: traceSpec.durationSeconds,
            id: traceSpec.id,
            maxSampleCount: 32,
            nowSeconds: runtimeState.timeline.elapsedSeconds,
            points: tracePoints
          }),
          durationSeconds: traceSpec.durationSeconds,
          sourceObjectId: traceSpec.sourceObjectId
        }
      ];
    });
}

export function buildTracingTailEvidenceForScene(scene: MathSceneSpec, runtimeState: MathSceneRuntimeState) {
  return buildTracingTailEvidence(buildTracingTailEvidenceEntriesForScene(scene, runtimeState));
}

export function serializeTracingTailEvidencePayload(entries: TracingTailEvidenceEntry[]) {
  const evidence = buildTracingTailEvidence(entries);

  return stableSerialize({
    ...evidence,
    entries
  } satisfies TracingTailEvidencePayload);
}

export function tracingTailEvidenceDataAttributes(evidence: TracingTailEvidence): Record<string, string> {
  return {
    "data-viz-manim-tracing-tail-age-range": evidence.ageRange,
    "data-viz-manim-tracing-tail-buffer-capacity": String(evidence.bufferCapacity),
    "data-viz-manim-tracing-tail-buffer-policy-summary": evidence.bufferPolicySummary,
    "data-viz-manim-tracing-tail-count": String(evidence.tailCount),
    "data-viz-manim-tracing-tail-duration-summary": evidence.durationSummary,
    "data-viz-manim-tracing-tail-fill-ratio-summary": evidence.fillRatioSummary,
    "data-viz-manim-tracing-tail-finite-sample-count": String(evidence.finiteSampleCount),
    "data-viz-manim-tracing-tail-fresh-point-summary": evidence.freshPointSummary,
    "data-viz-manim-tracing-tail-gradient-direction-summary": evidence.gradientDirectionSummary,
    "data-viz-manim-tracing-tail-gradient-monotonic": String(evidence.gradientMonotonic),
    "data-viz-manim-tracing-tail-gradient-summary": evidence.gradientSummary,
    "data-viz-manim-tracing-tail-ids": evidence.tailIds,
    "data-viz-manim-tracing-tail-opacity-range": evidence.opacityRange,
    "data-viz-manim-tracing-tail-sample-cadence-summary": evidence.sampleCadenceSummary,
    "data-viz-manim-tracing-tail-sample-count": String(evidence.sampleCount),
    "data-viz-manim-tracing-tail-sample-time-order-summary": evidence.sampleTimeOrderSummary,
    "data-viz-manim-tracing-tail-source-contract": evidence.sourceContract,
    "data-viz-manim-tracing-tail-source-ids": evidence.sourceObjectIds,
    "data-viz-manim-tracing-tail-stale-point-summary": evidence.stalePointSummary,
    "data-viz-manim-tracing-tail-stroke-width-range": evidence.strokeWidthRange,
    "data-viz-manim-tracing-tail-summary": evidence.summary,
    "data-viz-manim-tracing-tail-timestamp-range": evidence.timestampRange,
    "data-viz-manim-tracing-tail-traced-point-source-summary": evidence.tracedPointSourceSummary
  };
}
