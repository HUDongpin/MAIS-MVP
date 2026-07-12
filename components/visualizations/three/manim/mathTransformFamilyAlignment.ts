import type { MathObjectGraph, RuntimeMathObjectNode, RuntimeRenderState } from "./mathSceneRuntimeState";

export type TransformFamilyAlignmentKind = "entering" | "exiting" | "matched" | "typeMismatch";

export const TRANSFORM_FAMILY_ALIGNMENT_POINT_COUNT_POLICY = "align-point-counts-before-interpolate" as const;
export const TRANSFORM_FAMILY_ALIGNMENT_ZIP_POLICY =
  "get_all_families_zipped-pairs-mobject-starting_mobject-target_copy-families-before-interpolate" as const;
export const TRANSFORM_FAMILY_ALIGNMENT_SOURCE_CONTRACT =
  "Transform.begin -> Mobject.align_data_and_family -> Transform.get_all_families_zipped(mobject, starting_mobject, target_copy) before interpolate_mobject" as const;

export type TransformFamilyAlignmentEntry = {
  conceptId: string;
  interpolationObjectId: string;
  kind: TransformFamilyAlignmentKind;
  sourceDepth?: number;
  sourceId?: string;
  sourceRenderState?: RuntimeRenderState;
  sourceType?: RuntimeMathObjectNode["type"];
  targetDepth?: number;
  targetId?: string;
  targetRenderState?: RuntimeRenderState;
  targetType?: RuntimeMathObjectNode["type"];
};

export type TransformFamilyAlignmentPlan = {
  entries: TransformFamilyAlignmentEntry[];
  sourceRootId: string;
  targetRootId: string;
};

export type TransformFamilyAlignmentSummary = {
  enteringCount: number;
  exitingCount: number;
  matchedCount: number;
  maxDepth: number;
  typeMismatchCount: number;
};

function summarizeTransformFamilyAlignmentSource(
  plan: TransformFamilyAlignmentPlan,
  summary: TransformFamilyAlignmentSummary
) {
  return [
    `transform-family-align:source=${plan.sourceRootId}`,
    `target=${plan.targetRootId}`,
    `entries=${plan.entries.length}`,
    `matched=${summary.matchedCount}`,
    `entering=${summary.enteringCount}`,
    `exiting=${summary.exitingCount}`,
    `typeMismatch=${summary.typeMismatchCount}`,
    `maxDepth=${summary.maxDepth}`
  ].join(":");
}

function summarizeFamilyPairSequence(plan: TransformFamilyAlignmentPlan) {
  const pairs = plan.entries
    .filter((entry) => entry.kind === "matched" && entry.sourceId && entry.targetId)
    .map((entry) => `${entry.sourceId}->${entry.targetId}`);

  return pairs.join("|") || "none";
}

function familyZipRows(plan: TransformFamilyAlignmentPlan) {
  return plan.entries.map((entry) => ({
    complete: Boolean(entry.interpolationObjectId),
    mobjectId: entry.interpolationObjectId,
    startingMobjectId: entry.sourceId ?? `ghost-source:${entry.targetId ?? entry.interpolationObjectId}`,
    targetCopyObjectId: entry.targetId ?? `ghost-target:${entry.sourceId ?? entry.interpolationObjectId}`
  }));
}

function summarizeFamilyZipSequence(plan: TransformFamilyAlignmentPlan) {
  return familyZipRows(plan)
    .map((row) => `${row.mobjectId}|${row.startingMobjectId}|${row.targetCopyObjectId}`)
    .join(";") || "none";
}

function summarizeFamilyZipStats(plan: TransformFamilyAlignmentPlan) {
  const rows = familyZipRows(plan);
  const completeCount = rows.filter((row) => row.complete).length;

  return {
    completeCount,
    incompleteCount: rows.length - completeCount,
    tupleCount: rows.length
  };
}

function cloneJson<TValue>(value: TValue): TValue {
  return JSON.parse(JSON.stringify(value)) as TValue;
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

function validChildIds(graph: MathObjectGraph, node: RuntimeMathObjectNode | undefined) {
  if (!node) return [];
  return node.childIds.filter((childId) => childId !== node.id && Boolean(graph.byId[childId]));
}

function entryForSourceOnly(
  sourceGraph: MathObjectGraph,
  sourceId: string,
  depth: number
): TransformFamilyAlignmentEntry[] {
  const source = sourceGraph.byId[sourceId];
  if (!source) return [];

  return [
    {
      conceptId: source.conceptId,
      interpolationObjectId: source.id,
      kind: "exiting",
      sourceDepth: depth,
      sourceId: source.id,
      sourceRenderState: cloneJson(source.renderState),
      sourceType: source.type
    },
    ...validChildIds(sourceGraph, source).flatMap((childId) => entryForSourceOnly(sourceGraph, childId, depth + 1))
  ];
}

function entryForTargetOnly(
  targetGraph: MathObjectGraph,
  targetId: string,
  depth: number
): TransformFamilyAlignmentEntry[] {
  const target = targetGraph.byId[targetId];
  if (!target) return [];

  return [
    {
      conceptId: target.conceptId,
      interpolationObjectId: target.id,
      kind: "entering",
      targetDepth: depth,
      targetId: target.id,
      targetRenderState: cloneJson(target.renderState),
      targetType: target.type
    },
    ...validChildIds(targetGraph, target).flatMap((childId) => entryForTargetOnly(targetGraph, childId, depth + 1))
  ];
}

function findMatch(
  source: RuntimeMathObjectNode,
  targetGraph: MathObjectGraph,
  targetChildIds: string[],
  matchedTargetIds: Set<string>
) {
  const candidates = targetChildIds
    .map((targetId) => targetGraph.byId[targetId])
    .filter((target): target is RuntimeMathObjectNode => Boolean(target && !matchedTargetIds.has(target.id)));

  return (
    candidates.find((target) => target.id === source.id) ??
    candidates.find((target) => target.conceptId === source.conceptId && target.type === source.type) ??
    candidates.find((target) => target.conceptId === source.conceptId)
  );
}

function alignPair(
  sourceGraph: MathObjectGraph,
  source: RuntimeMathObjectNode,
  targetGraph: MathObjectGraph,
  target: RuntimeMathObjectNode,
  depth: number
): TransformFamilyAlignmentEntry[] {
  if (source.type !== target.type) {
    return [
      {
        conceptId: source.conceptId,
        interpolationObjectId: source.id,
        kind: "typeMismatch",
        sourceDepth: depth,
        sourceId: source.id,
        sourceRenderState: cloneJson(source.renderState),
        sourceType: source.type,
        targetDepth: depth,
        targetId: target.id,
        targetRenderState: cloneJson(target.renderState),
        targetType: target.type
      }
    ];
  }

  const sourceChildIds = validChildIds(sourceGraph, source);
  const targetChildIds = validChildIds(targetGraph, target);
  const matchedTargetIds = new Set<string>();
  const childEntries = sourceChildIds.flatMap((sourceChildId) => {
    const sourceChild = sourceGraph.byId[sourceChildId];
    const targetChild = sourceChild ? findMatch(sourceChild, targetGraph, targetChildIds, matchedTargetIds) : undefined;

    if (!sourceChild) return [];
    if (!targetChild) return entryForSourceOnly(sourceGraph, sourceChild.id, depth + 1);

    matchedTargetIds.add(targetChild.id);
    return alignPair(sourceGraph, sourceChild, targetGraph, targetChild, depth + 1);
  });
  const enteringEntries = targetChildIds
    .filter((targetChildId) => !matchedTargetIds.has(targetChildId))
    .flatMap((targetChildId) => entryForTargetOnly(targetGraph, targetChildId, depth + 1));

  return [
    {
      conceptId: source.conceptId,
      interpolationObjectId: source.id,
      kind: "matched",
      sourceDepth: depth,
      sourceId: source.id,
      sourceRenderState: cloneJson(source.renderState),
      sourceType: source.type,
      targetDepth: depth,
      targetId: target.id,
      targetRenderState: cloneJson(target.renderState),
      targetType: target.type
    },
    ...childEntries,
    ...enteringEntries
  ];
}

export function buildTransformFamilyAlignment(
  sourceGraph: MathObjectGraph,
  sourceRootId: string,
  targetGraph: MathObjectGraph,
  targetRootId: string
): TransformFamilyAlignmentPlan {
  const sourceRoot = sourceGraph.byId[sourceRootId];
  const targetRoot = targetGraph.byId[targetRootId];
  let entries: TransformFamilyAlignmentEntry[] = [];

  if (sourceRoot && targetRoot) {
    entries = alignPair(sourceGraph, sourceRoot, targetGraph, targetRoot, 0);
  } else if (sourceRoot) {
    entries = entryForSourceOnly(sourceGraph, sourceRoot.id, 0);
  } else if (targetRoot) {
    entries = entryForTargetOnly(targetGraph, targetRoot.id, 0);
  }

  return {
    entries,
    sourceRootId,
    targetRootId
  };
}

export function summarizeTransformFamilyAlignment(plan: TransformFamilyAlignmentPlan): TransformFamilyAlignmentSummary {
  const depths = plan.entries.flatMap((entry) => [entry.sourceDepth, entry.targetDepth]).filter(Number.isFinite) as number[];

  return {
    enteringCount: plan.entries.filter((entry) => entry.kind === "entering").length,
    exitingCount: plan.entries.filter((entry) => entry.kind === "exiting").length,
    matchedCount: plan.entries.filter((entry) => entry.kind === "matched").length,
    maxDepth: Math.max(0, ...depths),
    typeMismatchCount: plan.entries.filter((entry) => entry.kind === "typeMismatch").length
  };
}

export function transformFamilyAlignmentDataAttributes(plan: TransformFamilyAlignmentPlan): Record<string, string> {
  const summary = summarizeTransformFamilyAlignment(plan);
  const zipStats = summarizeFamilyZipStats(plan);

  return {
    "data-viz-manim-transform-family-alignment-entering-count": String(summary.enteringCount),
    "data-viz-manim-transform-family-alignment-entry-count": String(plan.entries.length),
    "data-viz-manim-transform-family-alignment-exiting-count": String(summary.exitingCount),
    "data-viz-manim-transform-family-alignment-family-pair-sequence": summarizeFamilyPairSequence(plan),
    "data-viz-manim-transform-family-alignment-family-zip-complete-count": String(zipStats.completeCount),
    "data-viz-manim-transform-family-alignment-family-zip-incomplete-count": String(zipStats.incompleteCount),
    "data-viz-manim-transform-family-alignment-family-zip-policy": TRANSFORM_FAMILY_ALIGNMENT_ZIP_POLICY,
    "data-viz-manim-transform-family-alignment-family-zip-sequence": summarizeFamilyZipSequence(plan),
    "data-viz-manim-transform-family-alignment-family-zip-tuple-count": String(zipStats.tupleCount),
    "data-viz-manim-transform-family-alignment-matched-count": String(summary.matchedCount),
    "data-viz-manim-transform-family-alignment-max-depth": String(summary.maxDepth),
    "data-viz-manim-transform-family-alignment-point-count-policy": TRANSFORM_FAMILY_ALIGNMENT_POINT_COUNT_POLICY,
    "data-viz-manim-transform-family-alignment-source-contract": TRANSFORM_FAMILY_ALIGNMENT_SOURCE_CONTRACT,
    "data-viz-manim-transform-family-alignment-source-root-id": plan.sourceRootId,
    "data-viz-manim-transform-family-alignment-summary": summarizeTransformFamilyAlignmentSource(plan, summary),
    "data-viz-manim-transform-family-alignment-target-root-id": plan.targetRootId,
    "data-viz-manim-transform-family-alignment-type-mismatch-count": String(summary.typeMismatchCount)
  };
}

export function serializeTransformFamilyAlignmentPlan(plan: TransformFamilyAlignmentPlan) {
  return stableSerialize(plan);
}
