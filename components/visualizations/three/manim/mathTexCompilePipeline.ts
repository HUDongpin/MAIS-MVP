import { buildMathTexCacheManifest, type MathTexCacheManifest } from "./mathTexCacheManifest";
import type { FormulaSpec, MathSceneSpec } from "./mathSceneTypes";

export const TEX_COMPILE_PIPELINE_SOURCE_CONTRACT =
  "latex_to_svg: standalone TeX document -> latex/xelatex -> dvisvgm SVG -> deterministic cache" as const;

export type MathTexCompileEngine = "latex" | "xelatex";

export type MathTexCompilePipelineRow = {
  cacheKey: string;
  documentPath: string;
  documentSourceLength: number;
  dvisvgmCommand: string;
  engine: MathTexCompileEngine;
  engineCommand: string;
  formulaId: string;
  intermediatePath: string;
  ready: boolean;
  stepSequence: string;
  svgPath: string;
};

export type MathTexCompilePipeline = {
  cacheHitEligibleCount: number;
  cacheKeyCount: number;
  commandCount: number;
  documentCount: number;
  documentSourceLengthRange: string;
  documentTemplateCount: number;
  dvisvgmCount: number;
  engineIds: string[];
  formulaCount: number;
  intermediateExtensions: string[];
  rows: MathTexCompilePipelineRow[];
  sceneId: string;
  signature: string;
  sourceContract: typeof TEX_COMPILE_PIPELINE_SOURCE_CONTRACT;
  sourceSummary: string;
  stepSequence: string;
  summary: string;
  svgOutputCount: number;
};

export type MathTexCompilePipelineOptions = {
  cacheManifest?: MathTexCacheManifest;
  engine?: MathTexCompileEngine;
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

function hashStableJson(value: string) {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return `tex-compile-${hash.toString(16).padStart(8, "0")}`;
}

function standaloneDocumentSource(formula: FormulaSpec) {
  return [
    "\\documentclass[preview]{standalone}",
    "\\usepackage{amsmath,amssymb}",
    "\\begin{document}",
    formula.latex,
    "\\end{document}"
  ].join("\n");
}

function compileStepSequence(engine: MathTexCompileEngine) {
  return `standalone-document>${engine}>dvisvgm>svg-cache`;
}

function intermediateExtension(engine: MathTexCompileEngine) {
  return engine === "xelatex" ? "xdv" : "dvi";
}

function extensionForPath(path: string) {
  const extension = path.split(".").at(-1);

  return extension && extension !== path ? extension : "none";
}

function formulaSvgCacheEntry(manifest: MathTexCacheManifest, formulaId: string) {
  return manifest.entries.find((entry) => entry.formulaId === formulaId && entry.kind === "formula-svg");
}

function rowForFormula(formula: FormulaSpec, manifest: MathTexCacheManifest, engine: MathTexCompileEngine): MathTexCompilePipelineRow {
  const svgEntry = formulaSvgCacheEntry(manifest, formula.id);
  const cacheKey = svgEntry?.cacheKey ?? `tex-entry-${formula.id}`;
  const documentPath = `${cacheKey}.tex`;
  const intermediatePath = `${cacheKey}.${intermediateExtension(engine)}`;
  const svgPath = `${cacheKey}.svg`;

  return {
    cacheKey,
    documentPath,
    documentSourceLength: standaloneDocumentSource(formula).length,
    dvisvgmCommand: `dvisvgm --no-fonts --exact --output=${svgPath} ${intermediatePath}`,
    engine,
    engineCommand: `${engine} -interaction=batchmode -halt-on-error ${documentPath}`,
    formulaId: formula.id,
    intermediatePath,
    ready: svgEntry?.ready ?? false,
    stepSequence: compileStepSequence(engine),
    svgPath
  };
}

function pipeList(values: string[]) {
  return values.length > 0 ? values.join("|") : "none";
}

function commaList(values: string[]) {
  return values.length > 0 ? values.join(",") : "none";
}

function numericRange(values: number[]) {
  if (values.length === 0) return "none";

  return `${Math.min(...values)}..${Math.max(...values)}`;
}

function summarizeTexCompilePipeline(input: Omit<MathTexCompilePipeline, "signature" | "sourceSummary" | "summary">) {
  return [
    `tex-compile:${input.sceneId}`,
    `formulas=${input.formulaCount}`,
    `documents=${input.documentCount}`,
    `commands=${input.commandCount}`,
    `engine=${commaList(input.engineIds)}`,
    `dvisvgm=${input.dvisvgmCount}`,
    `cache=${input.cacheKeyCount}`
  ].join(":");
}

function summarizeTexCompileSource(input: Omit<MathTexCompilePipeline, "signature" | "sourceSummary" | "summary">) {
  return [
    "latex_to_svg",
    `documents=${input.documentCount}`,
    `templates=${input.documentTemplateCount}`,
    `engine=${commaList(input.engineIds)}`,
    `intermediate=${commaList(input.intermediateExtensions)}`,
    `dvisvgm=${input.dvisvgmCount}`,
    `cache=${input.cacheKeyCount}`
  ].join(":");
}

// Manim source contract: latex_to_svg creates a standalone LaTeX document,
// runs latex/xelatex, converts the DVI/XDV output with dvisvgm, then reuses the
// SVG through a deterministic cache. MAIS models that pipeline without shelling
// out in browser tests.
export function buildMathTexCompilePipeline(
  scene: MathSceneSpec,
  options: MathTexCompilePipelineOptions = {}
): MathTexCompilePipeline {
  const engine = options.engine ?? "latex";
  const manifest = options.cacheManifest ?? buildMathTexCacheManifest(scene);
  const rows = scene.formulas.map((formula) => rowForFormula(formula, manifest, engine));
  const engineIds = Array.from(new Set(rows.map((row) => row.engine))).sort();
  const intermediateExtensions = Array.from(new Set(rows.map((row) => extensionForPath(row.intermediatePath)))).sort();
  const stepSequences = Array.from(new Set(rows.map((row) => row.stepSequence)));
  const basePlan = {
    cacheHitEligibleCount: rows.filter((row) => row.ready).length,
    cacheKeyCount: new Set(rows.map((row) => row.cacheKey)).size,
    commandCount: rows.length * 2,
    documentCount: rows.length,
    documentSourceLengthRange: numericRange(rows.map((row) => row.documentSourceLength)),
    documentTemplateCount: rows.length,
    dvisvgmCount: rows.length,
    engineIds,
    formulaCount: scene.formulas.length,
    intermediateExtensions,
    rows,
    sceneId: scene.sceneId,
    sourceContract: TEX_COMPILE_PIPELINE_SOURCE_CONTRACT,
    stepSequence: pipeList(stepSequences),
    svgOutputCount: rows.length
  };

  return {
    ...basePlan,
    signature: hashStableJson(stableSerialize(basePlan)),
    sourceSummary: summarizeTexCompileSource(basePlan),
    summary: summarizeTexCompilePipeline(basePlan)
  };
}

export function texCompilePipelineDataAttributes(plan: MathTexCompilePipeline): Record<string, string> {
  return {
    "data-viz-manim-tex-compile-cache-hit-eligible-count": String(plan.cacheHitEligibleCount),
    "data-viz-manim-tex-compile-cache-key-count": String(plan.cacheKeyCount),
    "data-viz-manim-tex-compile-command-count": String(plan.commandCount),
    "data-viz-manim-tex-compile-document-count": String(plan.documentCount),
    "data-viz-manim-tex-compile-document-source-length-range": plan.documentSourceLengthRange,
    "data-viz-manim-tex-compile-document-template-count": String(plan.documentTemplateCount),
    "data-viz-manim-tex-compile-dvisvgm-count": String(plan.dvisvgmCount),
    "data-viz-manim-tex-compile-engine-ids": commaList(plan.engineIds),
    "data-viz-manim-tex-compile-formula-count": String(plan.formulaCount),
    "data-viz-manim-tex-compile-intermediate-extensions": commaList(plan.intermediateExtensions),
    "data-viz-manim-tex-compile-source-contract": plan.sourceContract,
    "data-viz-manim-tex-compile-source-summary": plan.sourceSummary,
    "data-viz-manim-tex-compile-step-sequence": plan.stepSequence,
    "data-viz-manim-tex-compile-svg-output-count": String(plan.svgOutputCount),
    "data-viz-manim-tex-compile-summary": plan.summary
  };
}

export function serializeMathTexCompilePipeline(plan: MathTexCompilePipeline) {
  return stableSerialize(plan);
}
