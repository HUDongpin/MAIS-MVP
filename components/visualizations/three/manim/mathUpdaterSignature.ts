import type { MathUpdaterEntry, MathUpdaterRegistry } from "./mathUpdaterRegistry";

export type MathUpdaterExecutionMode = "dependency-redraw" | "dt-aware" | "timeline-progress";

export type MathUpdaterSignatureSource = "alwaysMethod" | "alwaysRedraw" | "objectProgress" | "vectorFieldDt";

export type MathUpdaterSignatureEntry = {
  executionMode: MathUpdaterExecutionMode;
  id: string;
  objectId: string;
  receivesDeltaSeconds: boolean;
  receivesTimelineProgress: boolean;
  source: MathUpdaterSignatureSource;
  type: MathUpdaterEntry["type"];
  updaterId?: string;
};

export type MathUpdaterSignaturePlan = {
  callSignatures: string[];
  dependencyUpdaterIds: string[];
  dtAwareUpdaterIds: string[];
  entries: MathUpdaterSignatureEntry[];
  receivesDeltaSecondsIds: string[];
  receivesTimelineProgressIds: string[];
  signature: string;
  sourceSummary: string;
  timelineUpdaterIds: string[];
  totalUpdaterCount: number;
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

  return `updater-signature-${hash.toString(16).padStart(8, "0")}`;
}

function escapedJson(value: string) {
  return value.replace(/</g, "\\u003c");
}

function updaterExecutionMode(entry: MathUpdaterEntry): MathUpdaterExecutionMode {
  if (entry.type === "move-along-vector-field") return "dt-aware";
  if (entry.type === "always-method") return "dependency-redraw";
  if (entry.type === "always-redraw") return "dependency-redraw";
  return "timeline-progress";
}

function updaterSignatureSource(entry: MathUpdaterEntry): MathUpdaterSignatureSource {
  if (entry.type === "move-along-vector-field") return "vectorFieldDt";
  if (entry.type === "always-method") return "alwaysMethod";
  if (entry.type === "always-redraw") return "alwaysRedraw";
  return "objectProgress";
}

function signatureEntry(entry: MathUpdaterEntry): MathUpdaterSignatureEntry {
  const executionMode = updaterExecutionMode(entry);

  return {
    executionMode,
    id: entry.id,
    objectId: entry.objectId,
    receivesDeltaSeconds: executionMode === "dt-aware",
    receivesTimelineProgress: executionMode === "timeline-progress",
    source: updaterSignatureSource(entry),
    type: entry.type,
    ...(entry.updaterId ? { updaterId: entry.updaterId } : {})
  };
}

function executionModePriority(mode: MathUpdaterExecutionMode) {
  if (mode === "timeline-progress") return 0;
  if (mode === "dt-aware") return 1;
  return 2;
}

function compareSignatureEntries(left: MathUpdaterSignatureEntry, right: MathUpdaterSignatureEntry) {
  const objectOrder = left.objectId.localeCompare(right.objectId);
  if (objectOrder !== 0) return objectOrder;

  const modeOrder = executionModePriority(left.executionMode) - executionModePriority(right.executionMode);
  if (modeOrder !== 0) return modeOrder;

  return left.id.localeCompare(right.id);
}

function idsForMode(entries: MathUpdaterSignatureEntry[], executionMode: MathUpdaterExecutionMode) {
  return entries
    .filter((entry) => entry.executionMode === executionMode)
    .map((entry) => entry.id)
    .sort((left, right) => left.localeCompare(right));
}

function idsReceivingDeltaSeconds(entries: MathUpdaterSignatureEntry[]) {
  return entries
    .filter((entry) => entry.receivesDeltaSeconds)
    .map((entry) => entry.id)
    .sort((left, right) => left.localeCompare(right));
}

function idsReceivingTimelineProgress(entries: MathUpdaterSignatureEntry[]) {
  return entries
    .filter((entry) => entry.receivesTimelineProgress)
    .map((entry) => entry.id)
    .sort((left, right) => left.localeCompare(right));
}

function callSignatureForEntry(entry: MathUpdaterSignatureEntry) {
  if (entry.receivesDeltaSeconds) return `${entry.id}(dt)`;
  if (entry.receivesTimelineProgress) return `${entry.id}(timeline)`;
  return `${entry.id}(dependencies)`;
}

function sourceSummary(entries: MathUpdaterSignatureEntry[]) {
  const sourceCounts: Record<MathUpdaterSignatureSource, number> = {
    alwaysMethod: 0,
    alwaysRedraw: 0,
    objectProgress: 0,
    vectorFieldDt: 0
  };

  entries.forEach((entry) => {
    sourceCounts[entry.source] += 1;
  });

  return [
    `alwaysMethod=${sourceCounts.alwaysMethod}`,
    `alwaysRedraw=${sourceCounts.alwaysRedraw}`,
    `objectProgress=${sourceCounts.objectProgress}`,
    `vectorFieldDt=${sourceCounts.vectorFieldDt}`
  ].join(";");
}

function commaList(ids: string[]) {
  return ids.length > 0 ? ids.join(",") : "none";
}

function pipeList(ids: string[]) {
  return ids.length > 0 ? ids.join("|") : "none";
}

export function summarizeMathUpdaterSignaturePlan(plan: MathUpdaterSignaturePlan) {
  return `updater-signature:total=${plan.totalUpdaterCount}:dt=${plan.dtAwareUpdaterIds.length}:timeline=${plan.timelineUpdaterIds.length}:dependency=${plan.dependencyUpdaterIds.length}`;
}

export function buildMathUpdaterSignaturePlan(registry: MathUpdaterRegistry): MathUpdaterSignaturePlan {
  const entries = registry.entries
    .map(signatureEntry)
    .sort(compareSignatureEntries);
  const basePlan = {
    callSignatures: entries.map(callSignatureForEntry),
    dependencyUpdaterIds: idsForMode(entries, "dependency-redraw"),
    dtAwareUpdaterIds: idsForMode(entries, "dt-aware"),
    entries,
    receivesDeltaSecondsIds: idsReceivingDeltaSeconds(entries),
    receivesTimelineProgressIds: idsReceivingTimelineProgress(entries),
    sourceSummary: sourceSummary(entries),
    timelineUpdaterIds: idsForMode(entries, "timeline-progress"),
    totalUpdaterCount: entries.length
  };

  return {
    ...basePlan,
    signature: hashStableJson(stableSerialize(basePlan))
  };
}

export function serializeMathUpdaterSignaturePlan(plan: MathUpdaterSignaturePlan) {
  return escapedJson(stableSerialize(plan));
}

export function updaterSignatureDataAttributes(plan: MathUpdaterSignaturePlan) {
  return {
    "data-viz-manim-updater-signature-count": String(plan.totalUpdaterCount),
    "data-viz-manim-updater-signature-call-signatures": pipeList(plan.callSignatures),
    "data-viz-manim-updater-signature-dependency-count": String(plan.dependencyUpdaterIds.length),
    "data-viz-manim-updater-signature-dependency-ids": commaList(plan.dependencyUpdaterIds),
    "data-viz-manim-updater-signature-dt-aware-count": String(plan.dtAwareUpdaterIds.length),
    "data-viz-manim-updater-signature-dt-aware-ids": commaList(plan.dtAwareUpdaterIds),
    "data-viz-manim-updater-signature-receives-dt-ids": commaList(plan.receivesDeltaSecondsIds),
    "data-viz-manim-updater-signature-receives-timeline-ids": commaList(plan.receivesTimelineProgressIds),
    "data-viz-manim-updater-signature-signature": plan.signature,
    "data-viz-manim-updater-signature-source-summary": plan.sourceSummary,
    "data-viz-manim-updater-signature-summary": summarizeMathUpdaterSignaturePlan(plan),
    "data-viz-manim-updater-signature-timeline-count": String(plan.timelineUpdaterIds.length),
    "data-viz-manim-updater-signature-timeline-ids": commaList(plan.timelineUpdaterIds)
  };
}
