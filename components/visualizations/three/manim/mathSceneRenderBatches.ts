import type { MathSceneRenderGroups } from "./mathSceneGraph";
import type { MathObjectGraph, RuntimeMathObjectNode, RuntimeRenderState } from "./mathSceneRuntimeState";
import { summarizeVMobjectStyle } from "./mathVMobjectStyle";

export const SCENE_RENDER_BATCH_SOURCE_CONTRACT =
  "Scene.assemble_render_groups|render_groups replacement|adjacent batch clustering";

export type MathSceneRenderBatchGroupClass = "axes" | "point" | "vectorized";

export type MathSceneRenderBatch = {
  batchId: string;
  groupClass: MathSceneRenderBatchGroupClass;
  materialKey: string;
  objectIds: string[];
  renderStateKind: RuntimeRenderState["kind"];
  zIndex: number;
};

export type MathSceneRenderBatchPlan = {
  batchCount: number;
  batches: MathSceneRenderBatch[];
  objectCount: number;
  skippedObjectIds: string[];
  sourceContract: typeof SCENE_RENDER_BATCH_SOURCE_CONTRACT;
  summary: string;
};

export type MathSceneRenderBatchInput = {
  objectGraph: MathObjectGraph;
  renderGroups: MathSceneRenderGroups;
};

function finiteZIndex(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function renderStateStyle(renderState: RuntimeRenderState) {
  return "style" in renderState ? renderState.style : undefined;
}

function uniformKey(node: RuntimeMathObjectNode) {
  const uniforms = node.uniforms;
  if (!uniforms) return "uniforms=default";

  return [
    `opacity=${uniforms.opacity.toFixed(3)}`,
    `fixed=${uniforms.fixedInFrame ? "1" : "0"}`,
    `shade3d=${uniforms.shadeIn3D ? "1" : "0"}`,
    `clips=${uniforms.clippingPlanes.length}`
  ].join(";");
}

function materialKeyForNode(node: RuntimeMathObjectNode) {
  const style = renderStateStyle(node.renderState);
  const visualKey = style ? summarizeVMobjectStyle(style) : `role=${node.colorRole ?? "none"}`;

  return `${visualKey};${uniformKey(node)}`;
}

function groupClassForKind(kind: RuntimeRenderState["kind"]): MathSceneRenderBatchGroupClass {
  if (kind === "axes") return "axes";
  if (kind === "point") return "point";
  return "vectorized";
}

function batchKeyForNode(node: RuntimeMathObjectNode) {
  const zIndex = finiteZIndex(node.spec.zIndex);
  return [
    `kind=${node.renderState.kind}`,
    `material=${materialKeyForNode(node)}`,
    `z=${zIndex}`
  ].join("|");
}

function sanitizeBatchId(key: string) {
  return key.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}

function batchSummary(plan: Omit<MathSceneRenderBatchPlan, "summary">) {
  const keys = plan.batches
    .map((batch) => `${batch.renderStateKind}:${batch.groupClass}:z=${batch.zIndex}`)
    .join(",");

  return [
    `renderBatches:batches=${plan.batchCount}`,
    `objects=${plan.objectCount}`,
    `skipped=${plan.skippedObjectIds.length}`,
    `keys=${keys || "none"}`
  ].join(":");
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

function isRenderable(node: RuntimeMathObjectNode | undefined): node is RuntimeMathObjectNode {
  return Boolean(node && node.renderState.kind !== "empty");
}

// Manim source contract: Scene.assemble_render_groups clusters adjacent mobjects
// with the same type/shader/z_index key, then replaces the prior render_groups.
export function buildSceneRenderBatches(input: MathSceneRenderBatchInput): MathSceneRenderBatchPlan {
  const skippedObjectIds: string[] = [];
  const batches: MathSceneRenderBatch[] = [];
  let activeKey = "";

  input.renderGroups.all.forEach((objectId) => {
    const node = input.objectGraph.byId[objectId];
    if (!isRenderable(node)) {
      skippedObjectIds.push(objectId);
      activeKey = "";
      return;
    }

    const key = batchKeyForNode(node);
    const zIndex = finiteZIndex(node.spec.zIndex);
    const lastBatch = batches.at(-1);

    if (lastBatch && key === activeKey) {
      lastBatch.objectIds.push(objectId);
      return;
    }

    activeKey = key;
    batches.push({
      batchId: `batch-${batches.length}-${sanitizeBatchId(key)}`,
      groupClass: groupClassForKind(node.renderState.kind),
      materialKey: materialKeyForNode(node),
      objectIds: [objectId],
      renderStateKind: node.renderState.kind,
      zIndex
    });
  });

  const basePlan: Omit<MathSceneRenderBatchPlan, "summary"> = {
    batchCount: batches.length,
    batches,
    objectCount: batches.reduce((total, batch) => total + batch.objectIds.length, 0),
    skippedObjectIds,
    sourceContract: SCENE_RENDER_BATCH_SOURCE_CONTRACT
  };

  return {
    ...basePlan,
    summary: batchSummary(basePlan)
  };
}

export function sceneRenderBatchDataAttributes(plan: MathSceneRenderBatchPlan): Record<string, string> {
  return {
    "data-viz-manim-render-batch-count": String(plan.batchCount),
    "data-viz-manim-render-batch-object-count": String(plan.objectCount),
    "data-viz-manim-render-batch-ids": plan.batches.map((batch) => batch.batchId).join(",") || "none",
    "data-viz-manim-render-batch-skipped-count": String(plan.skippedObjectIds.length),
    "data-viz-manim-render-batch-skipped-ids": plan.skippedObjectIds.join(",") || "none",
    "data-viz-manim-render-batch-source-contract": plan.sourceContract,
    "data-viz-manim-render-batch-summary": plan.summary
  };
}

export function serializeSceneRenderBatchPlan(plan: MathSceneRenderBatchPlan) {
  return stableSerialize(plan);
}
