import { buildValueTracker } from "./mathValueTracker";
import type { MathSceneParameterSpec, MathSceneSpec } from "./mathSceneTypes";

export type MathParameterPanelEntry = {
  conceptId?: string;
  id: string;
  label: string;
  max?: number;
  min?: number;
  normalizedValue: number;
  role: MathSceneParameterSpec["role"];
  value: number;
};

export type MathParameterPanelSummary = {
  activeParameterId: string;
  controlCount: number;
  derivedCount: number;
  parameterCount: number;
  parameterIds: string;
  summary: string;
  timelineCount: number;
};

export type MathParameterPanelPayload = MathParameterPanelSummary & {
  entries: MathParameterPanelEntry[];
  version: "mais-manim-parameter-panel/v1";
};

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

export function buildParameterPanelCatalog(scene: MathSceneSpec): MathParameterPanelEntry[] {
  return (scene.parameters ?? []).map((parameter) => {
    const tracker = buildValueTracker({
      conceptId: parameter.conceptId,
      id: `parameter:${parameter.id}`,
      label: parameter.label,
      max: parameter.max,
      min: parameter.min,
      role: parameter.role,
      source: "parameter",
      value: parameter.value
    });

    return {
      conceptId: tracker.conceptId,
      id: parameter.id,
      label: tracker.label ?? parameter.id,
      max: tracker.max,
      min: tracker.min,
      normalizedValue: tracker.normalizedValue,
      role: parameter.role,
      value: tracker.value
    };
  });
}

export function summarizeParameterPanelCatalog(
  catalog: MathParameterPanelEntry[],
  selectedParameterId?: string
): MathParameterPanelSummary {
  const parameterIds = catalog.map((entry) => entry.id).join(",") || "none";
  const activeParameterId = catalog.some((entry) => entry.id === selectedParameterId)
    ? selectedParameterId ?? "none"
    : catalog[0]?.id ?? "none";
  const controlCount = catalog.filter((entry) => entry.role === "control").length;
  const derivedCount = catalog.filter((entry) => entry.role === "derived").length;
  const timelineCount = catalog.filter((entry) => entry.role === "timeline").length;

  return {
    activeParameterId,
    controlCount,
    derivedCount,
    parameterCount: catalog.length,
    parameterIds,
    summary: [
      `parameters=${catalog.length}`,
      `controls=${controlCount}`,
      `derived=${derivedCount}`,
      `timeline=${timelineCount}`,
      `active=${activeParameterId}`,
      `ids=${parameterIds}`
    ].join(";"),
    timelineCount
  };
}

export function serializeParameterPanelCatalog(
  catalog: MathParameterPanelEntry[],
  selectedParameterId?: string
) {
  const summary = summarizeParameterPanelCatalog(catalog, selectedParameterId);

  return stableSerialize({
    ...summary,
    entries: catalog,
    version: "mais-manim-parameter-panel/v1"
  } satisfies MathParameterPanelPayload);
}

export function parameterPanelDataAttributes(summary: MathParameterPanelSummary) {
  return {
    "data-viz-manim-parameter-panel-count": String(summary.parameterCount),
    "data-viz-manim-parameter-panel-control-count": String(summary.controlCount),
    "data-viz-manim-parameter-panel-derived-count": String(summary.derivedCount),
    "data-viz-manim-parameter-panel-ids": summary.parameterIds,
    "data-viz-manim-parameter-panel-selected": summary.activeParameterId,
    "data-viz-manim-parameter-panel-summary": summary.summary
  } as const;
}
