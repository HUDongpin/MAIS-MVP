import type {
  FormulaTokenSpec,
  MathObjectSpec,
  MathSceneSpec,
  MathSceneTransformMatchingKey,
  MathSceneTransformMatchingSpec
} from "./mathSceneTypes";

export const TRANSFORM_MATCHING_SOURCE_CONTRACT =
  "TransformMatchingTex/TransformMatchingShapes: match source and target parts by key, transform matches, fade entering/exiting parts" as const;

// Manim source contract: TransformMatchingTex/TransformMatchingShapes build
// ReplacementTransform rows for matched parts, while unmatched source/target
// parts become FadeOut/FadeIn rows instead of losing object identity silently.
export type TransformMatchingStatus = "entering" | "exiting" | "matched";

export type TransformMatchingPartKind = "object" | "token";

export type TransformMatchingRow = {
  animation: "fadeIn" | "fadeOut" | "transform";
  index: number;
  kind: TransformMatchingPartKind;
  matchKey: string;
  planId: string;
  sourceConceptId: string | null;
  sourceFormulaId: string | null;
  sourcePartId: string | null;
  sourceText: string | null;
  status: TransformMatchingStatus;
  targetConceptId: string | null;
  targetFormulaId: string | null;
  targetPartId: string | null;
  targetText: string | null;
};

export type TransformMatchingPlan = {
  enteringCount: number;
  enteringIds: string;
  exitingCount: number;
  exitingIds: string;
  fadeInCount: number;
  fadeOutCount: number;
  issueCount: number;
  issueSummary: string;
  keyStrategySummary: string;
  matchedCount: number;
  matchedPairIds: string;
  planCount: number;
  planVersion: "mais-manim-transform-matching/v1";
  rowCount: number;
  rows: TransformMatchingRow[];
  signature: string;
  sourceContract: typeof TRANSFORM_MATCHING_SOURCE_CONTRACT;
  summary: string;
  transformCount: number;
};

type TransformMatchingPart = {
  conceptId: string | null;
  formulaId: string | null;
  id: string;
  kind: TransformMatchingPartKind;
  order: number;
  text: string | null;
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

function signatureFor(value: unknown) {
  const serialized = stableSerialize(value);
  let hash = 0x811c9dc5;

  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return `transform-matching-${hash.toString(16).padStart(8, "0")}`;
}

function joinIds(ids: string[]) {
  return ids.join(",") || "none";
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

function objectConceptId(object: MathObjectSpec) {
  return "conceptId" in object ? object.conceptId ?? null : null;
}

function partsFromFormula(scene: MathSceneSpec, formulaId: string, issues: string[]): TransformMatchingPart[] {
  const formula = scene.formulas.find((entry) => entry.id === formulaId);
  if (!formula) {
    issues.push(`missing-formula:${formulaId}`);
    return [];
  }

  return formula.tokens.map((token: FormulaTokenSpec, order) => ({
    conceptId: token.conceptId,
    formulaId: formula.id,
    id: token.id,
    kind: "token" as const,
    order,
    text: token.text
  }));
}

function partsFromObjects(scene: MathSceneSpec, objectIds: string[] | undefined, issues: string[]): TransformMatchingPart[] {
  return (objectIds ?? []).flatMap((objectId, order) => {
    const object = scene.objects.find((entry) => entry.id === objectId);
    if (!object) {
      issues.push(`missing-object:${objectId}`);
      return [];
    }

    return [{
      conceptId: objectConceptId(object),
      formulaId: null,
      id: object.id,
      kind: "object" as const,
      order,
      text: object.id
    }];
  });
}

function keyFor(part: TransformMatchingPart, strategy: MathSceneTransformMatchingKey) {
  if (strategy === "tokenId") return part.id;
  if (strategy === "tokenText") return part.text ?? part.id;
  return part.conceptId ?? part.id;
}

function rowForMatch(planId: string, index: number, key: string, source: TransformMatchingPart, target: TransformMatchingPart): TransformMatchingRow {
  return {
    animation: "transform",
    index,
    kind: source.kind,
    matchKey: key,
    planId,
    sourceConceptId: source.conceptId,
    sourceFormulaId: source.formulaId,
    sourcePartId: source.id,
    sourceText: source.text,
    status: "matched",
    targetConceptId: target.conceptId,
    targetFormulaId: target.formulaId,
    targetPartId: target.id,
    targetText: target.text
  };
}

function rowForExit(planId: string, index: number, key: string, source: TransformMatchingPart): TransformMatchingRow {
  return {
    animation: "fadeOut",
    index,
    kind: source.kind,
    matchKey: key,
    planId,
    sourceConceptId: source.conceptId,
    sourceFormulaId: source.formulaId,
    sourcePartId: source.id,
    sourceText: source.text,
    status: "exiting",
    targetConceptId: null,
    targetFormulaId: null,
    targetPartId: null,
    targetText: null
  };
}

function rowForEnter(planId: string, index: number, key: string, target: TransformMatchingPart): TransformMatchingRow {
  return {
    animation: "fadeIn",
    index,
    kind: target.kind,
    matchKey: key,
    planId,
    sourceConceptId: null,
    sourceFormulaId: null,
    sourcePartId: null,
    sourceText: null,
    status: "entering",
    targetConceptId: target.conceptId,
    targetFormulaId: target.formulaId,
    targetPartId: target.id,
    targetText: target.text
  };
}

function partsForSpec(scene: MathSceneSpec, spec: MathSceneTransformMatchingSpec, issues: string[]) {
  const source =
    spec.sourceFormulaId !== undefined
      ? partsFromFormula(scene, spec.sourceFormulaId, issues)
      : partsFromObjects(scene, spec.sourceObjectIds, issues);
  const target =
    spec.targetFormulaId !== undefined
      ? partsFromFormula(scene, spec.targetFormulaId, issues)
      : partsFromObjects(scene, spec.targetObjectIds, issues);

  if (source.length === 0 && target.length === 0) issues.push(`empty-transform-matching:${spec.id}`);

  return { source, target };
}

function buildRowsForSpec(scene: MathSceneSpec, spec: MathSceneTransformMatchingSpec, issues: string[], rowOffset: number) {
  const strategy = spec.key ?? "conceptId";
  const { source, target } = partsForSpec(scene, spec, issues);
  const targetBuckets = new Map<string, TransformMatchingPart[]>();
  const rows: TransformMatchingRow[] = [];
  let index = rowOffset;

  for (const targetPart of [...target].sort((left, right) => left.order - right.order)) {
    const key = keyFor(targetPart, strategy);
    targetBuckets.set(key, [...(targetBuckets.get(key) ?? []), targetPart]);
  }

  for (const sourcePart of [...source].sort((left, right) => left.order - right.order)) {
    const key = keyFor(sourcePart, strategy);
    const candidates = targetBuckets.get(key) ?? [];
    const targetPart = candidates.shift();

    if (targetPart) {
      rows.push(rowForMatch(spec.id, index, key, sourcePart, targetPart));
      targetBuckets.set(key, candidates);
    } else {
      rows.push(rowForExit(spec.id, index, key, sourcePart));
    }
    index += 1;
  }

  const remainingTargets = [...targetBuckets.entries()]
    .flatMap(([key, entries]) => entries.map((entry) => ({ entry, key })))
    .sort((left, right) => left.entry.order - right.entry.order);

  for (const { entry, key } of remainingTargets) {
    rows.push(rowForEnter(spec.id, index, key, entry));
    index += 1;
  }

  return rows;
}

export function buildTransformMatchingPlan(scene: MathSceneSpec): TransformMatchingPlan {
  const specs = scene.matchingTransforms ?? [];
  const issues: string[] = [];
  const rows = specs.flatMap((spec, specIndex) => {
    if (spec.type !== "transformMatchingTex" && spec.type !== "transformMatchingShapes") {
      issues.push(`unsupported-transform-matching:${spec.id}`);
    }
    return buildRowsForSpec(scene, spec, issues, specIndex * 1000);
  });
  const matchedRows = rows.filter((row) => row.status === "matched");
  const enteringRows = rows.filter((row) => row.status === "entering");
  const exitingRows = rows.filter((row) => row.status === "exiting");
  const keyStrategySummary = specs.map((spec) => `${spec.id}:${spec.key ?? "conceptId"}`).join(",") || "none";
  const matchedPairIds = matchedRows.map((row) => `${row.sourcePartId}->${row.targetPartId}`);
  const planWithoutSignature = {
    enteringCount: enteringRows.length,
    enteringIds: joinIds(enteringRows.map((row) => row.targetPartId ?? "")),
    exitingCount: exitingRows.length,
    exitingIds: joinIds(exitingRows.map((row) => row.sourcePartId ?? "")),
    fadeInCount: enteringRows.length,
    fadeOutCount: exitingRows.length,
    issueCount: uniqueSorted(issues).length,
    issueSummary: uniqueSorted(issues).join("|") || "none",
    keyStrategySummary,
    matchedCount: matchedRows.length,
    matchedPairIds: joinIds(matchedPairIds),
    planCount: specs.length,
    planVersion: "mais-manim-transform-matching/v1" as const,
    rowCount: rows.length,
    rows,
    sourceContract: TRANSFORM_MATCHING_SOURCE_CONTRACT,
    summary: `transform-matching:${scene.sceneId}:plans=${specs.length}:rows=${rows.length}:matched=${matchedRows.length}:entering=${enteringRows.length}:exiting=${exitingRows.length}:keys=${keyStrategySummary}`,
    transformCount: matchedRows.length
  };

  return {
    ...planWithoutSignature,
    signature: signatureFor(planWithoutSignature)
  };
}

export function transformMatchingDataAttributes(plan: TransformMatchingPlan) {
  return {
    "data-viz-manim-transform-matching-entering-count": String(plan.enteringCount),
    "data-viz-manim-transform-matching-entering-ids": plan.enteringIds,
    "data-viz-manim-transform-matching-exiting-count": String(plan.exitingCount),
    "data-viz-manim-transform-matching-exiting-ids": plan.exitingIds,
    "data-viz-manim-transform-matching-fade-in-count": String(plan.fadeInCount),
    "data-viz-manim-transform-matching-fade-out-count": String(plan.fadeOutCount),
    "data-viz-manim-transform-matching-issue-count": String(plan.issueCount),
    "data-viz-manim-transform-matching-issue-summary": plan.issueSummary,
    "data-viz-manim-transform-matching-key-strategies": plan.keyStrategySummary,
    "data-viz-manim-transform-matching-matched-count": String(plan.matchedCount),
    "data-viz-manim-transform-matching-matched-pair-ids": plan.matchedPairIds,
    "data-viz-manim-transform-matching-plan-count": String(plan.planCount),
    "data-viz-manim-transform-matching-row-count": String(plan.rowCount),
    "data-viz-manim-transform-matching-signature": plan.signature,
    "data-viz-manim-transform-matching-source-contract": plan.sourceContract,
    "data-viz-manim-transform-matching-summary": plan.summary,
    "data-viz-manim-transform-matching-transform-count": String(plan.transformCount)
  } as const;
}

export function serializeTransformMatchingPlan(plan: TransformMatchingPlan) {
  return stableSerialize(plan);
}
