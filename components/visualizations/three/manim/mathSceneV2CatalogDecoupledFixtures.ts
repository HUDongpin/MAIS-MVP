import type { ThreeDFamilyId } from "../threeDSceneTypes";
import { buildMathSceneTeachingInspectionTargetQueue } from "./mathSceneTeachingInspectionTargets";

export const MATH_SCENE_V2_CATALOG_DECOUPLED_FIXTURE_SOURCE_CONTRACT =
  "MAIS Manim v2 catalog-decoupled fixture helper: local rendered-review and browser-regression lab fixtures for A11/A18/A22 closure tests without live Visualization Lab catalog input" as const;

type CatalogDecoupledFixtureCurriculumTrack =
  | "HK"
  | "MAINLAND_PEP_HIGH"
  | "MAINLAND_PEP_JUNIOR"
  | "US";

type CatalogDecoupledFixtureLab = {
  curriculumTrack: CatalogDecoupledFixtureCurriculumTrack;
  grade: string;
  labId: string;
  threeD: {
    enabled: true;
    familyId: ThreeDFamilyId;
    premiumLaunch?: true;
  };
};

export const renderedReviewLabs = [
  { curriculumTrack: "HK", grade: "P1", labId: "p1-number-line", threeD: { enabled: true, familyId: "three-number-line" } },
  { curriculumTrack: "HK", grade: "P2", labId: "p2-fractions", threeD: { enabled: true, familyId: "three-fraction-slices" } },
  { curriculumTrack: "HK", grade: "P4", labId: "p4-angles", threeD: { enabled: true, familyId: "three-angle-geometry" } },
  { curriculumTrack: "HK", grade: "S3", labId: "s3-function-graph", threeD: { enabled: true, familyId: "three-function-graph" } },
  { curriculumTrack: "HK", grade: "S4", labId: "s4-function-family", threeD: { enabled: true, familyId: "three-function-family" } },
  { curriculumTrack: "HK", grade: "S4", labId: "s4-trig-wave", threeD: { enabled: true, familyId: "three-trig-unit-wave" } },
  { curriculumTrack: "HK", grade: "S6", labId: "s6-calculus-rate-area", threeD: { enabled: true, familyId: "three-calculus-rate-area" } },
  {
    curriculumTrack: "MAINLAND_PEP_HIGH",
    grade: "S5",
    labId: "pep-high-s5-conics",
    threeD: { enabled: true, familyId: "three-conic-sections-deep", premiumLaunch: true }
  },
  {
    curriculumTrack: "MAINLAND_PEP_HIGH",
    grade: "S5",
    labId: "pep-high-s5-space-vectors",
    threeD: { enabled: true, familyId: "three-space-vectors-lines-planes", premiumLaunch: true }
  },
  { curriculumTrack: "HK", grade: "S3", labId: "s3-probability-machine", threeD: { enabled: true, familyId: "three-probability-machine" } },
  { curriculumTrack: "HK", grade: "S3", labId: "s3-statistics-distribution", threeD: { enabled: true, familyId: "three-statistics-distribution" } },
  {
    curriculumTrack: "US",
    grade: "S6",
    labId: "us-ca-math-s6-chapter-03",
    threeD: { enabled: true, familyId: "three-statistical-inference-lab", premiumLaunch: true }
  }
] satisfies readonly CatalogDecoupledFixtureLab[];

export const browserRegressionLabs = [
  ...renderedReviewLabs,
  {
    curriculumTrack: "MAINLAND_PEP_JUNIOR",
    grade: "S3",
    labId: "pep-junior-s3-lower-inverse-similarity-trigonometry",
    threeD: { enabled: true, familyId: "three-projection-views", premiumLaunch: true }
  }
] satisfies readonly CatalogDecoupledFixtureLab[];

export type MathSceneV2CatalogDecoupledFixtureManifest = {
  browserFamilyIds: string[];
  browserRegressionLabCount: number;
  liveCatalogInputRequired: false;
  missingRenderedFamilyIds: string[];
  projectionViewsIncluded: boolean;
  renderedFamilyIds: string[];
  renderedReviewLabCount: number;
  sourceContract: typeof MATH_SCENE_V2_CATALOG_DECOUPLED_FIXTURE_SOURCE_CONTRACT;
  summary: string;
};

export type MathSceneV2CatalogDecoupledFixtureHandoffManifest = {
  a11BrowserLabIds: string[];
  a18RenderedReviewLabIds: string[];
  a22LiveCatalogInputPolicy: "not-required";
  ownerAgentIds: string[];
  requiredDownstreamEvidenceIds: string[];
  sourceContract: typeof MATH_SCENE_V2_CATALOG_DECOUPLED_FIXTURE_SOURCE_CONTRACT;
  summary: string;
};

const requiredDownstreamEvidenceIds = [
  "a11-browser-regression",
  "a18-rendered-teaching-review",
  "a22-clean-release-slice"
] as const;

function uniqueSorted(values: readonly (string | undefined)[]) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].sort((left, right) =>
    left.localeCompare(right)
  );
}

function fixtureLabIds(labs: readonly CatalogDecoupledFixtureLab[]) {
  return labs.map((lab) => lab.labId);
}

export function buildMathSceneV2CatalogDecoupledFixtureManifest(): MathSceneV2CatalogDecoupledFixtureManifest {
  const renderedFamilyIds = uniqueSorted(renderedReviewLabs.map((lab) => lab.threeD.familyId));
  const browserFamilyIds = uniqueSorted(browserRegressionLabs.map((lab) => lab.threeD.familyId));
  const targetFamilyIds = uniqueSorted(
    buildMathSceneTeachingInspectionTargetQueue().targets.map((target) => target.familyId)
  );
  const missingRenderedFamilyIds = targetFamilyIds.filter((familyId) => !renderedFamilyIds.includes(familyId));
  const projectionViewsIncluded = browserFamilyIds.includes("three-projection-views");

  return {
    browserFamilyIds,
    browserRegressionLabCount: browserRegressionLabs.length,
    liveCatalogInputRequired: false,
    missingRenderedFamilyIds,
    projectionViewsIncluded,
    renderedFamilyIds,
    renderedReviewLabCount: renderedReviewLabs.length,
    sourceContract: MATH_SCENE_V2_CATALOG_DECOUPLED_FIXTURE_SOURCE_CONTRACT,
    summary: [
      "mathSceneV2CatalogDecoupledFixtures",
      `rendered=${renderedReviewLabs.length}`,
      `browser=${browserRegressionLabs.length}`,
      `projectionViews=${projectionViewsIncluded ? "included" : "missing"}`,
      "liveCatalog=not-required",
      `missingFamilies=${missingRenderedFamilyIds.join(",") || "none"}`
    ].join(":")
  };
}

export function mathSceneV2CatalogDecoupledFixtureDataAttributes(
  manifest: MathSceneV2CatalogDecoupledFixtureManifest
) {
  return {
    "data-viz-manim-v2-catalog-decoupled-fixture-browser": String(manifest.browserRegressionLabCount),
    "data-viz-manim-v2-catalog-decoupled-fixture-browser-families": manifest.browserFamilyIds.join(","),
    "data-viz-manim-v2-catalog-decoupled-fixture-live-catalog": manifest.liveCatalogInputRequired
      ? "required"
      : "not-required",
    "data-viz-manim-v2-catalog-decoupled-fixture-missing-families": manifest.missingRenderedFamilyIds.join(",") || "none",
    "data-viz-manim-v2-catalog-decoupled-fixture-projection-views": manifest.projectionViewsIncluded
      ? "included"
      : "missing",
    "data-viz-manim-v2-catalog-decoupled-fixture-rendered": String(manifest.renderedReviewLabCount),
    "data-viz-manim-v2-catalog-decoupled-fixture-rendered-families": manifest.renderedFamilyIds.join(","),
    "data-viz-manim-v2-catalog-decoupled-fixture-source-contract": manifest.sourceContract,
    "data-viz-manim-v2-catalog-decoupled-fixture-summary": manifest.summary
  } as const;
}

export function buildMathSceneV2CatalogDecoupledFixtureHandoffManifest():
  MathSceneV2CatalogDecoupledFixtureHandoffManifest {
  const ownerAgentIds = ["A11", "A18", "A22"];
  const a11BrowserLabIds = fixtureLabIds(browserRegressionLabs);
  const a18RenderedReviewLabIds = fixtureLabIds(renderedReviewLabs);

  return {
    a11BrowserLabIds,
    a18RenderedReviewLabIds,
    a22LiveCatalogInputPolicy: "not-required",
    ownerAgentIds,
    requiredDownstreamEvidenceIds: [...requiredDownstreamEvidenceIds],
    sourceContract: MATH_SCENE_V2_CATALOG_DECOUPLED_FIXTURE_SOURCE_CONTRACT,
    summary: [
      "mathSceneV2CatalogDecoupledFixtureHandoff",
      `owners=${ownerAgentIds.join(",")}`,
      `a11Labs=${a11BrowserLabIds.length}`,
      `a18Labs=${a18RenderedReviewLabIds.length}`,
      "a22LiveCatalog=not-required",
      `requiredEvidence=${requiredDownstreamEvidenceIds.join("|")}`
    ].join(":")
  };
}

export function mathSceneV2CatalogDecoupledFixtureHandoffDataAttributes(
  handoff: MathSceneV2CatalogDecoupledFixtureHandoffManifest
) {
  return {
    "data-viz-manim-v2-catalog-decoupled-handoff-a11-lab-count": String(handoff.a11BrowserLabIds.length),
    "data-viz-manim-v2-catalog-decoupled-handoff-a11-labs": handoff.a11BrowserLabIds.join(","),
    "data-viz-manim-v2-catalog-decoupled-handoff-a18-lab-count": String(handoff.a18RenderedReviewLabIds.length),
    "data-viz-manim-v2-catalog-decoupled-handoff-a18-labs": handoff.a18RenderedReviewLabIds.join(","),
    "data-viz-manim-v2-catalog-decoupled-handoff-a22-live-catalog": handoff.a22LiveCatalogInputPolicy,
    "data-viz-manim-v2-catalog-decoupled-handoff-owners": handoff.ownerAgentIds.join(","),
    "data-viz-manim-v2-catalog-decoupled-handoff-required-evidence": handoff.requiredDownstreamEvidenceIds.join("|"),
    "data-viz-manim-v2-catalog-decoupled-handoff-source-contract": handoff.sourceContract,
    "data-viz-manim-v2-catalog-decoupled-handoff-summary": handoff.summary
  } as const;
}
