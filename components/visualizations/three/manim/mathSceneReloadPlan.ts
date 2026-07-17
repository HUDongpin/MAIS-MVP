export type MathSceneReloadPlanInput = {
  checkpointCount?: number;
  elapsedSeconds?: number;
  frameIndex?: number;
  sceneId?: string | null;
  selectedFamilyId?: string | null;
  selectedSceneId?: string | null;
  snippet?: string | null;
};

export type MathSceneReloadPlan = {
  checkpointCount: number;
  clearsSnippet: boolean;
  frameIndexAfter: number;
  historyLabel: string;
  ready: boolean;
  resetPolicy: string;
  resetsElapsed: boolean;
  resetsFrame: boolean;
  sceneId: string;
  selectedFamilyId: string;
  selectedSceneId: string;
  sourceContract: string;
  summary: string;
  version: "mais-manim-reload-plan/v1";
};

export const SCENE_RELOAD_SOURCE_CONTRACT =
  "InteractiveSceneEmbed reload -> restart selected scene without mutating renderer-owned meshes";

export const SCENE_RELOAD_RESET_POLICY =
  "preserve-selected-scene-family-clear-snippet-reset-elapsed-and-frame-rebuild-checkpoints";

function cleanId(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed || "none";
}

function nonNegativeInteger(value: number | undefined) {
  return Math.max(0, Math.round(Number.isFinite(value) ? value ?? 0 : 0));
}

function positiveNumber(value: number | undefined) {
  return Number.isFinite(value) && (value ?? 0) > 0;
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

function hasSnippet(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function buildSummary(plan: Omit<MathSceneReloadPlan, "summary" | "version">) {
  return [
    `reload:scene=${plan.sceneId}`,
    `family=${plan.selectedFamilyId}`,
    `selected=${plan.selectedSceneId}`,
    `ready=${String(plan.ready)}`,
    `elapsed=${String(plan.resetsElapsed)}`,
    `frame=${String(plan.resetsFrame)}`,
    `snippet=${String(plan.clearsSnippet)}`,
    `checkpoints=${plan.checkpointCount}`
  ].join(":");
}

// Manim source contract:
// - InteractiveSceneEmbed exposes reload as an embedded authoring-shell shortcut.
// - reload restarts the selected scene instead of mutating renderer-owned meshes.
// - A browser port keeps the selected scene/family identity, clears any pasted
//   snippet, returns elapsed time and frameIndex to the start, and records the
//   checkpoint count that would be rebuilt by the authoring lifecycle.
export function buildSceneReloadPlan(input: MathSceneReloadPlanInput = {}): MathSceneReloadPlan {
  const sceneId = cleanId(input.sceneId);
  const selectedFamilyId = cleanId(input.selectedFamilyId);
  const selectedSceneId = cleanId(input.selectedSceneId);
  const ready = sceneId !== "none" && selectedFamilyId !== "none" && selectedSceneId !== "none";
  const basePlan = {
    checkpointCount: nonNegativeInteger(input.checkpointCount),
    clearsSnippet: hasSnippet(input.snippet),
    frameIndexAfter: 0,
    historyLabel: "reload",
    ready,
    resetPolicy: SCENE_RELOAD_RESET_POLICY,
    resetsElapsed: positiveNumber(input.elapsedSeconds),
    resetsFrame: positiveNumber(input.frameIndex),
    sceneId,
    selectedFamilyId,
    selectedSceneId,
    sourceContract: SCENE_RELOAD_SOURCE_CONTRACT
  };

  return {
    ...basePlan,
    summary: buildSummary(basePlan),
    version: "mais-manim-reload-plan/v1"
  };
}

export function sceneReloadPlanDataAttributes(plan: MathSceneReloadPlan): Record<string, string> {
  return {
    "data-viz-manim-reload-checkpoint-count": String(plan.checkpointCount),
    "data-viz-manim-reload-clears-snippet": String(plan.clearsSnippet),
    "data-viz-manim-reload-frame-after": String(plan.frameIndexAfter),
    "data-viz-manim-reload-history-label": plan.historyLabel,
    "data-viz-manim-reload-ready": String(plan.ready),
    "data-viz-manim-reload-reset-policy": plan.resetPolicy,
    "data-viz-manim-reload-resets-elapsed": String(plan.resetsElapsed),
    "data-viz-manim-reload-resets-frame": String(plan.resetsFrame),
    "data-viz-manim-reload-scene-id": plan.sceneId,
    "data-viz-manim-reload-selected-family-id": plan.selectedFamilyId,
    "data-viz-manim-reload-selected-scene-id": plan.selectedSceneId,
    "data-viz-manim-reload-source-contract": plan.sourceContract,
    "data-viz-manim-reload-summary": plan.summary
  };
}

export function serializeSceneReloadPlan(plan: MathSceneReloadPlan) {
  return stableSerialize(plan);
}
