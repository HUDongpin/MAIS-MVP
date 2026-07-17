import {
  buildFormulaSvgMorphPlan,
  interpolateSvgPathMorph,
  SVG_PATH_MORPH_SOURCE_CONTRACT,
  summarizeSvgPathMorphPlan,
  type FormulaSvgPathMorphSpec
} from "./mathSvgPathMorph";
import type { MathSceneSpec } from "./mathSceneTypes";

export type FormulaSvgMorphEvidenceInput = {
  morphs?: FormulaSvgPathMorphSpec[];
  progress?: number;
};

export type FormulaSvgMorphEvidence = {
  cacheKeyCount: number;
  commandCount: number;
  compatibleMorphCount: number;
  framePathPreview: string;
  issueCount: number;
  issueSummary: string;
  morphCount: number;
  morphIds: string;
  progress: number;
  sceneId: string;
  sourceContract: typeof SVG_PATH_MORPH_SOURCE_CONTRACT;
  summary: string;
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

function escapedAttribute(value: string) {
  return value.replace(/</g, "\\u003c");
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

function issueSummary(issues: string[]) {
  return uniqueSorted(issues).join("|") || "none";
}

export function buildFormulaSvgMorphEvidence(
  scene: MathSceneSpec,
  input: FormulaSvgMorphEvidenceInput = {}
): FormulaSvgMorphEvidence {
  const progress = clamp01(input.progress ?? 0);
  const morphsFromScene = input.morphs ?? scene.formulaSvgMorphs ?? [];
  const plans = scene.formulas.map((formula) => buildFormulaSvgMorphPlan(formula, morphsFromScene));
  const morphs = plans.flatMap((plan) => plan.morphs);
  const summaries = plans.map(summarizeSvgPathMorphPlan);
  const issues = plans.flatMap((plan) => plan.issues);
  const compatibleMorphs = morphs.filter((morph) => morph.compatible);
  const firstFrame = compatibleMorphs[0] ? interpolateSvgPathMorph(compatibleMorphs[0], progress) : null;
  const commandCount = morphs.reduce((sum, morph) => sum + morph.commandCount, 0);
  const cacheKeyCount = uniqueSorted(plans.flatMap((plan) => Object.values(plan.cacheKeys))).length;
  const compatibleMorphCount = summaries.reduce((sum, summary) => sum + summary.compatibleMorphCount, 0);
  const morphCount = summaries.reduce((sum, summary) => sum + summary.morphCount, 0);
  const totalIssueCount = summaries.reduce((sum, summary) => sum + summary.issueCount, 0);
  const summary = `svg-morph:${scene.sceneId}:morphs=${morphCount}:compatible=${compatibleMorphCount}:issues=${totalIssueCount}:commands=${commandCount}:progress=${formatNumber(progress)}`;

  return {
    cacheKeyCount,
    commandCount,
    compatibleMorphCount,
    framePathPreview: firstFrame ? escapedAttribute(firstFrame.path) : "none",
    issueCount: totalIssueCount,
    issueSummary: issueSummary(issues),
    morphCount,
    morphIds: uniqueSorted(morphs.map((morph) => morph.id)).join(",") || "none",
    progress,
    sceneId: scene.sceneId,
    sourceContract: SVG_PATH_MORPH_SOURCE_CONTRACT,
    summary
  };
}

export function formulaSvgMorphEvidenceDataAttributes(evidence: FormulaSvgMorphEvidence) {
  return {
    "data-viz-manim-svg-morph-cache-key-count": String(evidence.cacheKeyCount),
    "data-viz-manim-svg-morph-command-count": String(evidence.commandCount),
    "data-viz-manim-svg-morph-compatible-count": String(evidence.compatibleMorphCount),
    "data-viz-manim-svg-morph-count": String(evidence.morphCount),
    "data-viz-manim-svg-morph-frame-path-preview": evidence.framePathPreview,
    "data-viz-manim-svg-morph-ids": evidence.morphIds,
    "data-viz-manim-svg-morph-issue-count": String(evidence.issueCount),
    "data-viz-manim-svg-morph-issue-summary": evidence.issueSummary,
    "data-viz-manim-svg-morph-progress": formatNumber(evidence.progress),
    "data-viz-manim-svg-morph-source-contract": evidence.sourceContract,
    "data-viz-manim-svg-morph-summary": evidence.summary
  } as const;
}
