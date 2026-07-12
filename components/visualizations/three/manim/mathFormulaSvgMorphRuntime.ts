import {
  buildFormulaSvgMorphPlan,
  interpolateSvgPathMorph,
  SVG_PATH_MORPH_SOURCE_CONTRACT,
  type FormulaSvgPathMorphSpec
} from "./mathSvgPathMorph";
import type { MathSceneSpec } from "./mathSceneTypes";

export const FORMULA_SVG_MORPH_RUNTIME_SOURCE_CONTRACT =
  "Tex/SVGMobject fixed-in-frame FormulaLayer runtime|interpolated SVG path frame" as const;

export type FormulaSvgMorphRuntimeFrame = {
  commandCount: number;
  compatible: boolean;
  formulaId: string;
  id: string;
  issueSummary: string;
  path: string;
  progress: number;
  sourceContract: typeof SVG_PATH_MORPH_SOURCE_CONTRACT;
  sourceTokenId: string;
  targetTokenId: string;
};

export type FormulaSvgMorphRuntimeState = {
  compatibleFrameCount: number;
  formulaId: string;
  frameCount: number;
  frames: FormulaSvgMorphRuntimeFrame[];
  issueCount: number;
  progress: number;
  sceneId: string;
  sourceContract: typeof FORMULA_SVG_MORPH_RUNTIME_SOURCE_CONTRACT;
  summary: string;
};

export type FormulaSvgMorphRuntimeOptions = {
  formulaId: string;
  morphs?: FormulaSvgPathMorphSpec[];
  progress?: number;
};

function finite(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, finite(value, 0)));
}

function formatNumber(value: number) {
  return value.toFixed(3);
}

function issueSummary(issues: string[]) {
  return Array.from(new Set(issues)).sort((left, right) => left.localeCompare(right)).join("|") || "none";
}

function escapedAttribute(value: string) {
  return value.replace(/</g, "\\u003c");
}

export function buildFormulaSvgMorphRuntime(
  scene: MathSceneSpec,
  options: FormulaSvgMorphRuntimeOptions
): FormulaSvgMorphRuntimeState {
  const progress = clamp01(options.progress ?? 0);
  const formula = scene.formulas.find((entry) => entry.id === options.formulaId);
  const morphs = options.morphs ?? scene.formulaSvgMorphs ?? [];
  const plan = formula
    ? buildFormulaSvgMorphPlan(formula, morphs)
    : { cacheKeys: {}, formulaId: options.formulaId, issues: [`missing-formula:${options.formulaId}`], morphs: [] };
  const frames = plan.morphs.map((morph): FormulaSvgMorphRuntimeFrame => {
    const frame = interpolateSvgPathMorph(morph, progress);

    return {
      commandCount: morph.commandCount,
      compatible: morph.compatible,
      formulaId: morph.formulaId,
      id: morph.id,
      issueSummary: issueSummary(morph.issues),
      path: frame.path,
      progress: frame.progress,
      sourceContract: SVG_PATH_MORPH_SOURCE_CONTRACT,
      sourceTokenId: morph.sourceTokenId,
      targetTokenId: morph.targetTokenId
    };
  });
  const compatibleFrameCount = frames.filter((frame) => frame.compatible).length;
  const issueCount = plan.issues.length;
  const summary = [
    `svg-morph-runtime:${scene.sceneId}`,
    `formula=${options.formulaId}`,
    `frames=${frames.length}`,
    `compatible=${compatibleFrameCount}`,
    `issues=${issueCount}`,
    `progress=${formatNumber(progress)}`
  ].join(":");

  return {
    compatibleFrameCount,
    formulaId: options.formulaId,
    frameCount: frames.length,
    frames,
    issueCount,
    progress,
    sceneId: scene.sceneId,
    sourceContract: FORMULA_SVG_MORPH_RUNTIME_SOURCE_CONTRACT,
    summary
  };
}

export function formulaSvgMorphRuntimeDataAttributes(state: FormulaSvgMorphRuntimeState) {
  const frameIds = state.frames.map((frame) => frame.id).join(",") || "none";
  const framePathPreview = state.frames[0] ? escapedAttribute(state.frames[0].path) : "none";

  return {
    "data-viz-manim-svg-morph-runtime-compatible-frame-count": String(state.compatibleFrameCount),
    "data-viz-manim-svg-morph-runtime-formula-id": state.formulaId,
    "data-viz-manim-svg-morph-runtime-frame-count": String(state.frameCount),
    "data-viz-manim-svg-morph-runtime-frame-ids": frameIds,
    "data-viz-manim-svg-morph-runtime-frame-path-preview": framePathPreview,
    "data-viz-manim-svg-morph-runtime-issue-count": String(state.issueCount),
    "data-viz-manim-svg-morph-runtime-progress": formatNumber(state.progress),
    "data-viz-manim-svg-morph-runtime-scene-id": state.sceneId,
    "data-viz-manim-svg-morph-runtime-source-contract": state.sourceContract,
    "data-viz-manim-svg-morph-runtime-summary": state.summary
  } as const;
}
