import { VALUE_TRACKER_SOURCE_CONTRACT, type MathTrackerRegistry, type MathValueTracker } from "./mathValueTracker";

export { VALUE_TRACKER_SOURCE_CONTRACT };

export type MathValueTrackerPayloadRow = {
  conceptId?: string;
  hiddenMobjectId: string;
  id: string;
  label?: string;
  max?: number;
  min?: number;
  normalizedValue: number;
  role: MathValueTracker["role"];
  source: MathValueTracker["source"];
  uniforms: {
    normalizedValue: number;
    value: number;
  };
  value: number;
};

export type MathValueTrackerPayload = {
  controlTrackerCount: number;
  hiddenMobjectIds: string[];
  normalizedValueSummary: string;
  objectTrackerCount: number;
  parameterTrackerCount: number;
  progressTrackerCount: number;
  rangeSummary: string;
  rows: MathValueTrackerPayloadRow[];
  signature: string;
  sourceContract: typeof VALUE_TRACKER_SOURCE_CONTRACT;
  sourceSummary: string;
  timelineTrackerCount: number;
  totalTrackerCount: number;
  trackerIds: string[];
  uniformKeySummary: string;
  uniformPairCount: number;
  uniformValueSummary: string;
  valueTrackerCount: number;
};

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function hashStableJson(value: string) {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return `value-tracker-${hash.toString(16).padStart(8, "0")}`;
}

function escapedJson(value: string) {
  return value.replace(/</g, "\\u003c");
}

function compareRows(left: MathValueTrackerPayloadRow, right: MathValueTrackerPayloadRow) {
  return left.id.localeCompare(right.id);
}

function payloadRow(tracker: MathValueTracker): MathValueTrackerPayloadRow {
  return {
    ...(tracker.conceptId ? { conceptId: tracker.conceptId } : {}),
    hiddenMobjectId: tracker.hiddenMobjectId,
    id: tracker.id,
    ...(tracker.label ? { label: tracker.label } : {}),
    ...(tracker.max !== undefined ? { max: tracker.max } : {}),
    ...(tracker.min !== undefined ? { min: tracker.min } : {}),
    normalizedValue: tracker.normalizedValue,
    role: tracker.role,
    source: tracker.source,
    uniforms: tracker.uniforms,
    value: tracker.value
  };
}

function trackerCount(rows: MathValueTrackerPayloadRow[], key: "role" | "source", value: MathValueTrackerPayloadRow[typeof key]) {
  return rows.filter((row) => row[key] === value).length;
}

function fixed(value: number) {
  return Number.isFinite(value) ? value.toFixed(3) : "0.000";
}

function uniformValueSummary(rows: MathValueTrackerPayloadRow[]) {
  return rows.map((row) => `${row.hiddenMobjectId}:value=${fixed(row.value)}`).join("|") || "none";
}

function uniformKeySummary(rows: MathValueTrackerPayloadRow[]) {
  return rows.map((row) => `${row.hiddenMobjectId}:uniforms=value,normalizedValue`).join("|") || "none";
}

function normalizedValueSummary(rows: MathValueTrackerPayloadRow[]) {
  return rows.map((row) => `${row.hiddenMobjectId}:normalized=${fixed(row.normalizedValue)}`).join("|") || "none";
}

function trackerRangeSummary(rows: MathValueTrackerPayloadRow[]) {
  return rows.map((row) => `${row.hiddenMobjectId}:range=${fixed(row.min ?? 0)}..${fixed(row.max ?? 0)}`).join("|") || "none";
}

function sourceSummary(rows: MathValueTrackerPayloadRow[]) {
  const objectCount = trackerCount(rows, "source", "object");
  const parameterCount = trackerCount(rows, "source", "parameter");
  const timelineCount = trackerCount(rows, "source", "timeline");
  const valueCount = trackerCount(rows, "source", "value");

  return [
    `value-tracker-source:hiddenMobjects=${rows.length}`,
    "uniforms=value,normalizedValue",
    `sources=object=${objectCount},parameter=${parameterCount},timeline=${timelineCount},value=${valueCount}`
  ].join(":");
}

export function summarizeMathValueTrackerPayload(payload: MathValueTrackerPayload) {
  return `value-trackers:total=${payload.totalTrackerCount}:timeline=${payload.timelineTrackerCount}:parameter=${payload.parameterTrackerCount}:object=${payload.objectTrackerCount}:progress=${payload.progressTrackerCount}:control=${payload.controlTrackerCount}`;
}

export function buildMathValueTrackerPayload(registry: MathTrackerRegistry): MathValueTrackerPayload {
  const rows = Object.values(registry.byId)
    .map(payloadRow)
    .sort(compareRows);
  const basePayload = {
    controlTrackerCount: trackerCount(rows, "role", "control"),
    hiddenMobjectIds: rows.map((row) => row.hiddenMobjectId),
    normalizedValueSummary: normalizedValueSummary(rows),
    objectTrackerCount: trackerCount(rows, "source", "object"),
    parameterTrackerCount: trackerCount(rows, "source", "parameter"),
    progressTrackerCount: trackerCount(rows, "role", "progress"),
    rangeSummary: trackerRangeSummary(rows),
    rows,
    sourceContract: VALUE_TRACKER_SOURCE_CONTRACT,
    sourceSummary: sourceSummary(rows),
    timelineTrackerCount: trackerCount(rows, "source", "timeline"),
    totalTrackerCount: rows.length,
    trackerIds: rows.map((row) => row.id),
    uniformKeySummary: uniformKeySummary(rows),
    uniformPairCount: rows.length,
    uniformValueSummary: uniformValueSummary(rows),
    valueTrackerCount: trackerCount(rows, "source", "value")
  };

  return {
    ...basePayload,
    signature: hashStableJson(stableSerialize(basePayload))
  };
}

export function serializeMathValueTrackerPayload(payload: MathValueTrackerPayload) {
  return escapedJson(stableSerialize(payload));
}

export function valueTrackerPayloadDataAttributes(payload: MathValueTrackerPayload) {
  return {
    "data-viz-manim-value-tracker-control-count": String(payload.controlTrackerCount),
    "data-viz-manim-value-tracker-count": String(payload.totalTrackerCount),
    "data-viz-manim-value-tracker-hidden-mobject-ids": payload.hiddenMobjectIds.length > 0 ? payload.hiddenMobjectIds.join(",") : "none",
    "data-viz-manim-value-tracker-ids": payload.trackerIds.length > 0 ? payload.trackerIds.join(",") : "none",
    "data-viz-manim-value-tracker-normalized-summary": payload.normalizedValueSummary,
    "data-viz-manim-value-tracker-object-count": String(payload.objectTrackerCount),
    "data-viz-manim-value-tracker-parameter-count": String(payload.parameterTrackerCount),
    "data-viz-manim-value-tracker-progress-count": String(payload.progressTrackerCount),
    "data-viz-manim-value-tracker-range-summary": payload.rangeSummary,
    "data-viz-manim-value-tracker-signature": payload.signature,
    "data-viz-manim-value-tracker-source-contract": payload.sourceContract,
    "data-viz-manim-value-tracker-source-summary": payload.sourceSummary,
    "data-viz-manim-value-tracker-summary": summarizeMathValueTrackerPayload(payload),
    "data-viz-manim-value-tracker-timeline-count": String(payload.timelineTrackerCount),
    "data-viz-manim-value-tracker-uniform-key-summary": payload.uniformKeySummary,
    "data-viz-manim-value-tracker-uniform-pair-count": String(payload.uniformPairCount),
    "data-viz-manim-value-tracker-uniform-value-summary": payload.uniformValueSummary,
    "data-viz-manim-value-tracker-value-count": String(payload.valueTrackerCount)
  };
}
