import type { VisualizationTemplateId } from "../visualizationTemplateIds";
import {
  threeDFamilyIds,
  type ThreeDControlState,
  type ThreeDFamilyId,
  type ThreeDRegionalPriority,
  type ThreeDSceneVariant,
  type ThreeDStateSummary
} from "./threeDSceneTypes";

export { threeDFamilyIds };

export const threeDTemplateFamilyMap: Record<VisualizationTemplateId, ThreeDFamilyId> = {
  "number-line": "three-number-line",
  "base-ten": "three-base-ten-blocks",
  "array-area": "three-array-area-blocks",
  "fraction-bar": "three-fraction-slices",
  "clock-money-data": "three-clock-money-data",
  "measurement-scale": "three-measurement-scale",
  "angle-geometry": "three-angle-geometry",
  "right-triangle-pythagorean": "three-right-triangle-pythagorean",
  "coordinate-transform": "three-coordinate-transform",
  "equation-balance": "three-equation-balance",
  "function-graph": "three-function-graph",
  "function-family": "three-function-family",
  "complex-plane": "three-complex-plane",
  "trig-unit-wave": "three-trig-unit-wave",
  "probability-simulation": "three-probability-machine",
  "statistics-distribution": "three-statistics-distribution",
  "calculus-rate-area": "three-calculus-rate-area",
  "vector-conic-3d/strategy-map": "three-vector-conic-strategy"
};

export const mainlandPepPrimaryThreeDCapsuleLabIds = [
  "pep-primary-p1-upper-shapes-position-time",
  "pep-primary-p2-upper-length-angles-observation",
  "pep-primary-p5-lower-volume-data"
] as const;

export const mainlandPepJuniorSpatialImagination3DLabIds = [
  "pep-junior-s1-upper-geometric-figures",
  "pep-junior-s1-lower-lines-coordinates",
  "pep-junior-s3-lower-inverse-similarity-trigonometry"
] as const;

const standardThreeDLabIds = new Set<string>([
  "p3-multiplication-division",
  "p4-angles",
  "p4-large-numbers",
  "p6-ratio-proportion",
  "statistics-s1",
  ...mainlandPepPrimaryThreeDCapsuleLabIds,
  "pep-junior-s1-upper-geometric-figures",
  "pep-junior-s1-lower-lines-coordinates"
]);

export const threeDFamilyOverrideByLabId: Partial<Record<string, ThreeDFamilyId>> = {
  "pep-primary-p1-upper-shapes-position-time": "three-solid-nets-folding",
  "pep-primary-p2-upper-length-angles-observation": "three-solid-nets-folding",
  "pep-primary-p5-lower-volume-data": "three-solid-nets-folding",
  "pep-junior-s1-upper-geometric-figures": "three-solid-nets-folding",
  "pep-junior-s1-lower-lines-coordinates": "three-coordinate-transform",
  "pep-junior-s3-lower-inverse-similarity-trigonometry": "three-projection-views",
  "pep-high-s4-solid-geometry-intro": "three-solid-nets-folding",
  "bnu-primary-p6-lower-cylinders-cones": "three-cross-section-slicer",
  "hjb-primary-p6-lower-cylinder-cone": "three-cross-section-slicer",
  "bnu-junior-s1-upper-spatial-figures": "three-solid-nets-folding",
  "bnu-junior-s3-upper-projection-views": "three-projection-views",
  "pep-high-s5-space-vectors": "three-space-vectors-lines-planes",
  "pep-high-s5-conics": "three-conic-sections-deep",
  "pep-high-s5-derivatives": "three-optimization-modeling",
  "us-ca-math-s6-chapter-03": "three-statistical-inference-lab",
  "capstone-hk-mainland-crosswalk-explorer": "three-curriculum-crosswalk-map",
  "pep-high-s6-exam-practice": "three-exam-strategy-capstone"
};

export const threeDSceneVariantByFamilyId: Record<ThreeDFamilyId, ThreeDSceneVariant> = {
  "three-number-line": "measurement-rail",
  "three-base-ten-blocks": "place-value-blocks",
  "three-array-area-blocks": "array-blocks",
  "three-fraction-slices": "fraction-slices",
  "three-clock-money-data": "distribution-machine",
  "three-measurement-scale": "measurement-rail",
  "three-angle-geometry": "geometry-axes",
  "three-right-triangle-pythagorean": "geometry-axes",
  "three-coordinate-transform": "geometry-axes",
  "three-equation-balance": "balance-scale",
  "three-function-graph": "function-ribbon",
  "three-function-family": "function-ribbon",
  "three-complex-plane": "function-ribbon",
  "three-trig-unit-wave": "function-ribbon",
  "three-probability-machine": "distribution-machine",
  "three-statistics-distribution": "distribution-machine",
  "three-calculus-rate-area": "function-ribbon",
  "three-vector-conic-strategy": "vector-conic-strategy",
  "three-solid-nets-folding": "solid-net-fold",
  "three-cross-section-slicer": "cross-section-slicer",
  "three-space-vectors-lines-planes": "space-vector-plane",
  "three-conic-sections-deep": "conic-section-deep",
  "three-optimization-modeling": "optimization-landscape",
  "three-projection-views": "projection-views",
  "three-statistical-inference-lab": "statistical-inference",
  "three-curriculum-crosswalk-map": "curriculum-crosswalk",
  "three-exam-strategy-capstone": "exam-strategy-capstone"
};

export const threeDLaunchRegionByLabId: Partial<Record<string, ThreeDRegionalPriority>> = {
  "hjb-high-s6-三角-向量与解析几何综合": "mainland",
  "hjb-high-s6-圆锥曲线综合复习": "mainland",
  "hjb-high-s6-空间向量综合复习": "mainland",
  "hjb-high-s6-立体几何与空间向量综合": "mainland",
  "pep-high-s6-analytic-geometry-synthesis": "mainland",
  "bnu-high-s5-圆锥曲线": "mainland",
  "bnu-high-s5-数学建模活动-三": "mainland",
  "bnu-high-s5-空间向量与立体几何": "mainland",
  "hjb-high-s5-圆锥曲线": "mainland",
  "hjb-high-s5-空间向量及其应用": "mainland",
  "hjb-high-s5-空间直线与平面": "mainland",
  "hjb-high-s5-简单几何体": "mainland",
  "pep-high-s5-conics": "mainland",
  "pep-high-s5-space-vectors": "mainland",
  "bnu-high-s4-平面向量及其应用": "mainland",
  "bnu-high-s4-立体几何初步": "mainland",
  "hjb-high-s4-平面向量": "mainland",
  "pep-high-s4-plane-vectors": "mainland",
  "pep-high-s4-solid-geometry-intro": "mainland",
  "bnu-junior-s3-upper-projection-views": "mainland",
  "bnu-high-s4-复数": "mainland",
  "hjb-high-s4-复数": "mainland",
  "pep-high-s4-complex-numbers": "mainland",
  "bnu-high-s6-导数及其应用": "mainland",
  "bnu-high-s6-高三数列与导数综合复习": "mainland",
  "hjb-high-s6-函数-导数与不等式综合": "mainland",
  "hjb-high-s6-导数及其运用": "mainland",
  "pep-high-s6-derivative-synthesis": "mainland",
  "bnu-junior-s1-upper-spatial-figures": "mainland",
  "pep-high-s5-derivatives": "mainland",
  "bnu-primary-p6-lower-cylinders-cones": "mainland",
  "hjb-primary-p6-lower-cylinder-cone": "mainland",
  "bnu-high-s4-三角函数": "mainland",
  "bnu-high-s4-三角恒等变换": "mainland",
  "bnu-high-s4-数学建模活动-二": "mainland",
  "hjb-high-s4-三角": "mainland",
  "hjb-high-s4-三角函数": "mainland",
  "pep-high-s4-trigonometry": "mainland",
  "bnu-junior-s3-lower-right-triangle-trigonometry": "mainland",
  "hjb-junior-s3-upper-acute-trigonometry": "mainland",
  "us-ca-math-s6-chapter-05": "california",
  "us-ca-math-s5-chapter-03": "california",
  "us-ca-math-s2-chapter-02": "california",
  "us-ca-math-s4-chapter-04": "california",
  "us-ca-math-s6-chapter-02": "california",
  "us-ca-math-s6-chapter-04": "california",
  "us-ca-math-s5-chapter-01": "california",
  "us-ca-math-s5-chapter-02": "california",
  "us-ca-math-s3-chapter-03": "california",
  "us-ca-math-s3-chapter-02": "california",
  "us-ca-math-s4-chapter-05": "california",
  "us-ca-math-s6-chapter-03": "california",
  calculus: "hong-kong",
  "differentiation-intro": "hong-kong",
  "trigonometry-s5": "hong-kong",
  "trigonometry-basics": "hong-kong",
  "mixed-problem-solving": "hong-kong",
  "advanced-functions": "hong-kong",
  "quadratic-patterns": "hong-kong",
  functions: "hong-kong",
  "probability-s5": "hong-kong",
  "capstone-senior-function-calculus-stats-bridge": "cross-region",
  "capstone-hk-mainland-crosswalk-explorer": "cross-region",
  "capstone-junior-algebra-geometry-bridge": "cross-region",
  "capstone-primary-number-sense-bridge": "cross-region",
  "capstone-primary-measurement-proportion-bridge": "cross-region",
  "us-ar-math-g12-chapter-05-capstone-modeling": "cross-region",
  "us-ar-math-g10-chapter-04-quadratic-structure-in-geometry-contexts": "cross-region",
  "us-ar-math-g12-chapter-02-polynomial-structure-and-behavior": "cross-region",
  "us-ar-math-g12-chapter-04-function-analysis-and-rates": "cross-region",
  "pep-junior-s3-lower-inverse-similarity-trigonometry": "cross-region",
  "us-ar-math-g11-chapter-03-trigonometric-functions-and-graphs": "cross-region",
  "pep-high-s4-quadratic-inequalities": "cross-region",
  "bnu-high-s6-数列": "cross-region",
  "hjb-high-s6-数列与计数综合": "cross-region",
  "hjb-high-s6-数列综合复习": "cross-region",
  "pep-high-s6-exam-practice": "cross-region",
  "us-ar-math-g08-chapter-02-functions-and-rate-of-change": "cross-region",
  "us-fl-math-s2-chapter-02-functions-and-rate-of-change": "cross-region",
  "hjb-high-s5-数列": "cross-region"
};

// Historical authoring/curriculum candidates. This set is intentionally not a
// student-facing live-route registry: final catalog metadata may downgrade a
// candidate after semantic review. Live static params and direct metadata are
// generated from the final catalog in premiumThreeDDirectLabs.ts.
export const premiumThreeDCandidateRegionByLabId = threeDLaunchRegionByLabId;
export const premiumThreeDCandidateLabIds = new Set(Object.keys(premiumThreeDCandidateRegionByLabId));

/** @deprecated Candidate manifest only; do not use for live URLs or static params. */
export const premiumThreeDLaunchLabIds = premiumThreeDCandidateLabIds;

const threeDRegionalCandidateAuditOrder: readonly ThreeDRegionalPriority[] = [
  "mainland",
  "california",
  "hong-kong",
  "cross-region"
];

function compareLabIds(left: string, right: string) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function selectThreeDRegionalCandidateAuditLabIds(): Record<ThreeDRegionalPriority, string> {
  const smokeTargets = {} as Record<ThreeDRegionalPriority, string>;

  for (const region of threeDRegionalCandidateAuditOrder) {
    const labId = Object.entries(threeDLaunchRegionByLabId)
      .filter(([, launchRegion]) => launchRegion === region)
      .map(([entryLabId]) => entryLabId)
      .sort(compareLabIds)[0];

    if (labId) smokeTargets[region] = labId;
  }

  return smokeTargets;
}

export type ThreeDLaunchCoverageBand = {
  max: number;
  min: number;
};

export const threeDLaunchCoverageRequirement = {
  familyCount: { min: 24, max: 28 },
  topicPageCount: { min: 80, max: 100 },
  regionalCounts: {
    mainland: { min: 35, max: 45 },
    california: { min: 10, max: 15 },
    "hong-kong": { min: 8, max: 10 }
  }
} as const;

export type ThreeDLaunchCoverageRegionalBandKey = keyof typeof threeDLaunchCoverageRequirement.regionalCounts;

export type ThreeDLaunchCoverageReport = {
  familyCount: number;
  familyCountInRange: boolean;
  overrideFamilyCount: number;
  regionalCounts: Record<ThreeDRegionalPriority, number>;
  regionalCountsInRange: Record<ThreeDLaunchCoverageRegionalBandKey, boolean>;
  requirement: typeof threeDLaunchCoverageRequirement;
  templateFamilyCount: number;
  topicPageCount: number;
  topicPageCountInRange: boolean;
  unreachableFamilyIds: ThreeDFamilyId[];
};

function inBand(value: number, band: ThreeDLaunchCoverageBand) {
  return value >= band.min && value <= band.max;
}

function isThreeDFamilyId(value: ThreeDFamilyId | undefined): value is ThreeDFamilyId {
  return Boolean(value);
}

export function summarizeThreeDLaunchCoverage(): ThreeDLaunchCoverageReport {
  const regionalCounts: Record<ThreeDRegionalPriority, number> = {
    california: 0,
    "cross-region": 0,
    "hong-kong": 0,
    mainland: 0
  };

  for (const region of Object.values(threeDLaunchRegionByLabId)) {
    if (region) regionalCounts[region] += 1;
  }

  const templateFamilyIds = new Set(Object.values(threeDTemplateFamilyMap));
  const overrideFamilyIds = new Set(Object.values(threeDFamilyOverrideByLabId).filter(isThreeDFamilyId));
  const reachableFamilyIds = new Set<ThreeDFamilyId>([...templateFamilyIds, ...overrideFamilyIds]);
  const topicPageCount = Object.keys(threeDLaunchRegionByLabId).length;

  return {
    familyCount: threeDFamilyIds.length,
    familyCountInRange: inBand(threeDFamilyIds.length, threeDLaunchCoverageRequirement.familyCount),
    overrideFamilyCount: overrideFamilyIds.size,
    regionalCounts,
    regionalCountsInRange: {
      mainland: inBand(regionalCounts.mainland, threeDLaunchCoverageRequirement.regionalCounts.mainland),
      california: inBand(regionalCounts.california, threeDLaunchCoverageRequirement.regionalCounts.california),
      "hong-kong": inBand(regionalCounts["hong-kong"], threeDLaunchCoverageRequirement.regionalCounts["hong-kong"])
    },
    requirement: threeDLaunchCoverageRequirement,
    templateFamilyCount: templateFamilyIds.size,
    topicPageCount,
    topicPageCountInRange: inBand(topicPageCount, threeDLaunchCoverageRequirement.topicPageCount),
    unreachableFamilyIds: threeDFamilyIds.filter((familyId) => !reachableFamilyIds.has(familyId))
  };
}

export function validateThreeDLaunchCoverage(report = summarizeThreeDLaunchCoverage()) {
  const issues: string[] = [];

  if (!report.familyCountInRange) {
    issues.push(
      `Three.js family count ${report.familyCount} is outside ${threeDLaunchCoverageRequirement.familyCount.min}-${threeDLaunchCoverageRequirement.familyCount.max}.`
    );
  }

  if (!report.topicPageCountInRange) {
    issues.push(
      `Three.js topic page count ${report.topicPageCount} is outside ${threeDLaunchCoverageRequirement.topicPageCount.min}-${threeDLaunchCoverageRequirement.topicPageCount.max}.`
    );
  }

  for (const region of Object.keys(threeDLaunchCoverageRequirement.regionalCounts) as ThreeDLaunchCoverageRegionalBandKey[]) {
    if (!report.regionalCountsInRange[region]) {
      const band = threeDLaunchCoverageRequirement.regionalCounts[region];
      issues.push(`Three.js ${region} launch count ${report.regionalCounts[region]} is outside ${band.min}-${band.max}.`);
    }
  }

  if (report.unreachableFamilyIds.length > 0) {
    issues.push(`Three.js family IDs without a template or premium override: ${report.unreachableFamilyIds.join(", ")}.`);
  }

  return issues;
}

export function familyForVisualizationTemplate(templateId: VisualizationTemplateId) {
  return threeDTemplateFamilyMap[templateId];
}

export function familyForVisualizationLab(labId: string, templateId: VisualizationTemplateId) {
  return threeDFamilyOverrideByLabId[labId] ?? familyForVisualizationTemplate(templateId);
}

export function isStandardThreeDLab(labId: string) {
  return standardThreeDLabIds.has(labId);
}

export function isMainlandPepJuniorSpatialImagination3DLab(labId: string) {
  return (mainlandPepJuniorSpatialImagination3DLabIds as readonly string[]).includes(labId);
}

export function isPremiumThreeDCandidateLab(labId: string) {
  return premiumThreeDCandidateLabIds.has(labId);
}

/** @deprecated Candidate manifest only; use the final catalog live contract for student routes. */
export function isPremiumThreeDLaunchLab(labId: string) {
  return isPremiumThreeDCandidateLab(labId);
}

export function regionalPriorityForThreeDLaunchLab(labId: string) {
  return threeDLaunchRegionByLabId[labId];
}

export function sceneVariantForThreeDFamily(familyId: ThreeDFamilyId) {
  return threeDSceneVariantByFamilyId[familyId];
}

function finite(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

function familyIndex(familyId: ThreeDFamilyId) {
  return threeDFamilyIds.indexOf(familyId);
}

export function buildThreeDStateSummary({
  comparison,
  familyId,
  mode,
  templateId,
  value
}: ThreeDControlState & { familyId: ThreeDFamilyId }): ThreeDStateSummary {
  const index = familyIndex(familyId);
  const safeValue = finite(value, 1);
  const safeComparison = finite(comparison, 1);
  const safeMode = finite(mode, 0);
  const primaryValue = safeValue + index * 0.1;
  const secondaryValue = safeComparison + safeMode * 0.25;
  const depthValue = Math.max(0.4, (safeValue + safeComparison + index + 2) / 12);

  return {
    comparison: safeComparison,
    depthValue,
    familyId,
    mode: safeMode,
    primaryValue,
    secondaryValue,
    stateSummary: [
      `family=${familyId}`,
      `template=${templateId}`,
      `value=${primaryValue.toFixed(3)}`,
      `comparison=${secondaryValue.toFixed(3)}`,
      `depth=${depthValue.toFixed(3)}`
    ].join(";"),
    templateId,
    value: safeValue
  };
}
