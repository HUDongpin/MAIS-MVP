import { gradeIds } from "../../data/grades";
import { isLivePremiumThreeDLab } from "./three/premiumThreeDLiveContract";
import { sceneVariantForThreeDFamily } from "./three/threeDSceneMath";
import type { ThreeDFamilyId, ThreeDSceneVariant } from "./three/threeDSceneTypes";
import { visualizationTemplateIdValues } from "./visualizationTemplateIds";
import type {
  FeaturedLabDefinition,
  GradeLabGroupDefinition,
  VisualizationCurriculumTrack,
  VisualizationModuleId,
  VisualizationTemplateId,
  VisualizationTrackFilter
} from "../../data/visualizationLabs";
import { studentVisualizationToolsPath, visualizationLabPath } from "../../lib/visualizationRoutes";
import type { GradeId, LocalizedText } from "../../types";

export type VisualizationCatalogIssueCode =
  | "duplicate-lab-id"
  | "duplicate-primary-topic"
  | "empty-catalog"
  | "empty-grade-group"
  | "group-grade-mismatch"
  | "lab-missing-from-grade-groups"
  | "missing-localized-text"
  | "unknown-grade"
  | "unsafe-lab-id";

export type VisualizationCatalogIssue = {
  code: VisualizationCatalogIssueCode;
  message: string;
  labId?: string;
  topicId?: string;
  grade?: string;
};

export type VisualizationCurriculumReviewIssueCode =
  | "focus-topic-keyword-mismatch"
  | "source-card-array-cardinality-mismatch"
  | "topic-template-keyword-mismatch";

export type VisualizationCurriculumReviewSeverity = "systemic-high" | "medium" | "review-only";

export type VisualizationCurriculumReviewIssue = {
  code: VisualizationCurriculumReviewIssueCode;
  message: string;
  severity: VisualizationCurriculumReviewSeverity;
  details?: Record<string, number | string | string[] | null | undefined>;
  grade?: string;
  labId?: string;
  sourceCardId?: string;
  topicId?: string;
};

export type VisualizationDirectEntryIssueCode =
  | "direct-entry-duplicate-href"
  | "direct-entry-grade-param-mismatch"
  | "direct-entry-lab-param-mismatch"
  | "direct-entry-non-ascii-href"
  | "direct-entry-path-mismatch"
  | "direct-entry-section-selector-mismatch"
  | "direct-entry-track-param-mismatch"
  | "direct-entry-whitespace-href";

export type VisualizationPracticeHandoffIssueCode =
  | "practice-handoff-empty-topic"
  | "practice-handoff-hash-fragment"
  | "practice-handoff-non-ascii-href"
  | "practice-handoff-path-mismatch"
  | "practice-handoff-topic-param-mismatch"
  | "practice-handoff-whitespace-href";

export type VisualizationControlSurfaceIssueCode =
  | "control-surface-empty-module-id"
  | "control-surface-empty-topic"
  | "control-surface-module-id-mismatch"
  | "control-surface-module-id-whitespace";

export type VisualizationTemplateConfigIssueCode =
  | "template-config-empty-variant"
  | "template-config-invalid-accent"
  | "template-config-missing-accent"
  | "template-config-missing-axis-label"
  | "template-config-missing-focus-text"
  | "template-config-missing-formula-text"
  | "template-config-unknown-template-id"
  | "template-config-unsafe-variant";

export type VisualizationDirectEntryIssue = {
  actual?: string | null;
  code: VisualizationDirectEntryIssueCode;
  expected?: string;
  href?: string;
  labId?: string;
  message: string;
  track?: VisualizationTrackFilter;
};

export type VisualizationPracticeHandoffIssue = {
  actual?: string | null;
  code: VisualizationPracticeHandoffIssueCode;
  expected?: string;
  href?: string;
  labId?: string;
  message: string;
  topicId?: string;
};

export type VisualizationControlSurfaceIssue = {
  actual?: string | null;
  code: VisualizationControlSurfaceIssueCode;
  expected?: string;
  labId?: string;
  message: string;
  moduleId?: string;
  topicId?: string;
};

export type VisualizationTemplateConfigIssue = {
  actual?: string | null;
  code: VisualizationTemplateConfigIssueCode;
  expected?: string;
  field?: string;
  labId?: string;
  message: string;
  templateId?: string;
};

export type VisualizationDirectEntryHealthReport = {
  checkedHrefCount: number;
  checkedLabCount: number;
  checkedTrackCount: number;
  issues: VisualizationDirectEntryIssue[];
  nonAsciiLabCount: number;
};

export type PremiumThreeDSceneVariantSmokeTarget = {
  familyId: ThreeDFamilyId;
  href: string;
  lab: FeaturedLabDefinition;
  sceneVariant: ThreeDSceneVariant;
};

export type ThreeDSceneVariantSmokeTarget = PremiumThreeDSceneVariantSmokeTarget;

export type VisualizationPracticeHandoffHealthReport = {
  checkedHrefCount: number;
  checkedLabCount: number;
  issues: VisualizationPracticeHandoffIssue[];
  nonAsciiTopicCount: number;
};

export type VisualizationControlSurfaceHealthReport = {
  checkedLabCount: number;
  issues: VisualizationControlSurfaceIssue[];
  nonAsciiModuleIdCount: number;
  requiredSelectorCount: number;
  requiredSelectors: VisualizationControlSurfaceSelector[];
};

export type VisualizationTemplateConfigHealthReport = {
  axisLabelLabCount: number;
  checkedLabCount: number;
  checkedTemplateCount: number;
  coveredTemplateIds: VisualizationTemplateId[];
  issues: VisualizationTemplateConfigIssue[];
};

export type VisualizationSnapshotAttribute = {
  name: string;
  value: string;
};

export type VisualizationSnapshotMarkSampleOptions = {
  attributeLimit?: number;
  valueLimit?: number;
};

export type VisualizationSourceCardLike = {
  conceptIds?: readonly string[];
  curriculumTrack?: string;
  domainTags?: readonly string[];
  grade?: string;
  id?: string;
  idSuffix?: string;
  topicIds?: readonly string[];
};

export type VisualizationSourceCardAlignmentOptions = {
  labIdPrefix?: string | ((card: VisualizationSourceCardLike) => string);
};

export type VisualizationCatalogSummary = {
  byModule: Record<VisualizationModuleId, number>;
  byTemplate: Record<VisualizationTemplateId, number>;
  byTrack: Record<VisualizationCurriculumTrack, number>;
  gradeGroups: Array<{
    grade: GradeId;
    labCount: number;
  }>;
  labCount: number;
};

export type VisualizationCatalogHealthReport = {
  issues: VisualizationCatalogIssue[];
  summary: VisualizationCatalogSummary;
};

const localizedTextKeys = ["en", "zh"] as const;
const visualizationPracticePath = "/practice";
const unsafeLabIdPattern = /[\s?#&/]/;
const unsafeTemplateVariantPattern = /[\s?#&]/;
const safeHexColorPattern = /^#[\da-f]{6}$/i;
const safeSnapshotDataAttributePattern = /^data-viz-[a-z0-9-]+$/;
const axisLabelTemplateIds = new Set<VisualizationTemplateId>([
  "coordinate-transform",
  "function-graph",
  "function-family",
  "complex-plane",
  "trig-unit-wave",
  "probability-simulation",
  "statistics-distribution",
  "calculus-rate-area"
]);
export const visualizationControlSurfaceSelectors = [
  "data-viz-start-quest-link",
  "data-viz-track-filter-button",
  "data-viz-grade-chip",
  "data-viz-recommended-lab-link",
  "data-viz-back-to-control-panel-link",
  "data-viz-link-warning",
  "data-viz-copy-lab-link",
  "data-viz-copy-lab-link-state",
  "data-viz-copy-lab-snapshot",
  "data-viz-start-practice-link",
  "data-viz-mode-button",
  "data-viz-reset-model"
] as const;
export type VisualizationControlSurfaceSelector = (typeof visualizationControlSurfaceSelectors)[number];
const focusTopicMismatchRules: Array<{
  id: string;
  focusPattern: RegExp;
  topicPattern: RegExp;
}> = [
  {
    id: "volume",
    focusPattern: /\bstrand for volume\b/i,
    topicPattern: /\bvolume\b|\bcubic\b|\bunit cube\b|\bunit cubes\b/i
  },
  {
    id: "fractions",
    focusPattern: /\bstrand for fractions?\b|\blive pathway for fractions?\b/i,
    topicPattern: /\bfraction\b|\bfractions\b|分數|分数|\bfraction-bar\b/i
  },
  {
    id: "angles",
    focusPattern: /\bstrand for angles?\b|\blive pathway for angle measure\b/i,
    topicPattern: /\bangle\b|\bangles\b|\bangle measure\b|角|\bangle-geometry\b|\bright-triangle\b/i
  },
  {
    id: "trigonometry",
    focusPattern: /\bstrand for trigonometry\b|\blive pathway for trigonometry\b/i,
    topicPattern: /\btrig\b|\btrigonometry\b|\bsine\b|\bcosine\b|\btangent\b|三角|\btrig-unit-wave\b/i
  },
  {
    id: "function-analysis",
    focusPattern: /\bstrand for polynomial structure\b|\blive pathway for function analysis\b/i,
    topicPattern: /\bfunction\b|\bfunctions\b|\bpolynomial\b|\bquadratic\b|\bexponential\b|\blogarithmic\b|\balgebra\b|函數|函数|多項式|多项式|二次|指數|指数|對數|对数|\bfunction-family\b|\bfunction-graph\b|\bequation-balance\b/i
  }
];

const topicTemplateMismatchRules: Array<{
  allowedTemplates: readonly string[];
  id: string;
  topicPattern: RegExp;
}> = [
  {
    id: "angle-measure",
    topicPattern: /\bunknown angle\b|\bunknown angle measures?\b|\bangle measure\b|\bangle measures?\b/i,
    allowedTemplates: ["angle-geometry", "right-triangle-pythagorean", "trig-unit-wave", "vector-conic-3d/strategy-map"]
  }
];

export function isPremiumThreeDTopicPageLab(lab: FeaturedLabDefinition) {
  return isLivePremiumThreeDLab(lab);
}

export function buildPremiumThreeDTopicPagePath(lab: FeaturedLabDefinition) {
  return `${studentVisualizationToolsPath}/${encodeURIComponent(lab.labId)}`;
}

/**
 * Stable URL for the catalog/signature workspace, including premium topics.
 * Premium topics also have a canonical 3D route; callers that are already
 * showing the signature workspace must use this URL when copying or sharing
 * the current view instead of silently switching renderers.
 */
export function buildVisualizationDirectoryLabHref(
  lab: FeaturedLabDefinition,
  track: VisualizationTrackFilter = "all"
) {
  const params = new URLSearchParams();
  params.set("grade", lab.grade);
  params.set("track", track);
  params.set("lab", lab.labId);
  return `${studentVisualizationToolsPath}?${params.toString()}`;
}

function decodeUrlPathSegment(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function buildVisualizationLabHref(lab: FeaturedLabDefinition, track: VisualizationTrackFilter = "all") {
  if (isPremiumThreeDTopicPageLab(lab)) {
    const params = new URLSearchParams();
    params.set("grade", lab.grade);
    params.set("track", track);
    return `${buildPremiumThreeDTopicPagePath(lab)}?${params.toString()}`;
  }

  const params = new URLSearchParams();
  params.set("grade", lab.grade);
  params.set("track", track);
  params.set("lab", lab.labId);
  return `${visualizationLabPath}?${params.toString()}`;
}

function selectThreeDSceneVariantSmokeLabsByPredicate(
  labs: readonly FeaturedLabDefinition[],
  predicate: (lab: FeaturedLabDefinition) => boolean
): ThreeDSceneVariantSmokeTarget[] {
  const targetsByVariant = new Map<ThreeDSceneVariant, ThreeDSceneVariantSmokeTarget>();

  for (const lab of labs) {
    if (!lab.threeD?.enabled || !predicate(lab)) continue;

    const familyId = lab.threeD.familyId;
    const sceneVariant = sceneVariantForThreeDFamily(familyId);
    if (targetsByVariant.has(sceneVariant)) continue;

    targetsByVariant.set(sceneVariant, {
      familyId,
      href: buildVisualizationLabHref(lab),
      lab,
      sceneVariant
    });
  }

  return Array.from(targetsByVariant.values()).sort((a, b) => a.sceneVariant.localeCompare(b.sceneVariant));
}

export function selectThreeDSceneVariantSmokeLabs(
  labs: readonly FeaturedLabDefinition[]
): ThreeDSceneVariantSmokeTarget[] {
  return selectThreeDSceneVariantSmokeLabsByPredicate(labs, () => true);
}

export function selectPremiumThreeDSceneVariantSmokeLabs(
  labs: readonly FeaturedLabDefinition[]
): PremiumThreeDSceneVariantSmokeTarget[] {
  return selectThreeDSceneVariantSmokeLabsByPredicate(labs, isLivePremiumThreeDLab);
}

export function buildVisualizationPracticeHref(labOrTopicId: FeaturedLabDefinition | string) {
  const topicId = typeof labOrTopicId === "string" ? labOrTopicId : labOrTopicId.topicId;
  const params = new URLSearchParams();
  params.set("topicId", topicId);
  return `${visualizationPracticePath}?${params.toString()}`;
}

export function buildVisualizationSessionModuleId(lab: FeaturedLabDefinition) {
  return `${lab.analyticsSource}:${lab.labId}:${lab.topicId}`;
}

export function buildVisualizationSnapshotMarkSample(
  attributes: readonly VisualizationSnapshotAttribute[],
  options: VisualizationSnapshotMarkSampleOptions = {}
) {
  const attributeLimit = Math.max(1, options.attributeLimit ?? 18);
  const valueLimit = Math.max(8, options.valueLimit ?? 120);
  const sample: Record<string, string> = {};

  for (const attribute of attributes) {
    if (Object.keys(sample).length >= attributeLimit) break;
    if (!safeSnapshotDataAttributePattern.test(attribute.name)) continue;

    const value = String(attribute.value ?? "").replace(/\s+/g, " ").trim();
    sample[attribute.name] = value.length > valueLimit ? `${value.slice(0, valueLimit)}...` : value;
  }

  return sample;
}

export function auditVisualizationDirectEntryContract(
  labs: readonly FeaturedLabDefinition[],
  tracks: readonly VisualizationTrackFilter[] = ["all"]
): VisualizationDirectEntryHealthReport {
  const issues: VisualizationDirectEntryIssue[] = [];
  const seenHrefs = new Map<string, string>();

  labs.forEach((lab) => {
    tracks.forEach((track) => {
      const href = buildVisualizationLabHref(lab, track);
      const url = new URL(href, "https://mais.local");
      const labHrefKey = `${lab.labId} (${track})`;
      const usesTopicPage = isPremiumThreeDTopicPageLab(lab);
      const expectedPath = usesTopicPage ? buildPremiumThreeDTopicPagePath(lab) : visualizationLabPath;

      if (url.pathname !== expectedPath) {
        issues.push({
          code: "direct-entry-path-mismatch",
          expected: expectedPath,
          actual: url.pathname,
          href,
          labId: lab.labId,
          message: `Visualization Lab "${lab.labId}" direct-entry href points at "${url.pathname}" instead of "${expectedPath}".`,
          track
        });
      }

      if (url.searchParams.get("grade") !== lab.grade) {
        issues.push({
          code: "direct-entry-grade-param-mismatch",
          expected: lab.grade,
          actual: url.searchParams.get("grade"),
          href,
          labId: lab.labId,
          message: `Visualization Lab "${lab.labId}" direct-entry href does not round-trip its grade parameter.`,
          track
        });
      }

      if (url.searchParams.get("track") !== track) {
        issues.push({
          code: "direct-entry-track-param-mismatch",
          expected: track,
          actual: url.searchParams.get("track"),
          href,
          labId: lab.labId,
          message: `Visualization Lab "${lab.labId}" direct-entry href does not round-trip its track parameter.`,
          track
        });
      }

      if (usesTopicPage) {
        const pathSegment = url.pathname.startsWith(`${studentVisualizationToolsPath}/`)
          ? url.pathname.slice(`${studentVisualizationToolsPath}/`.length)
          : "";
        const pathLabId = decodeUrlPathSegment(pathSegment);

        if (pathLabId !== lab.labId) {
          issues.push({
            code: "direct-entry-lab-param-mismatch",
            expected: lab.labId,
            actual: pathLabId,
            href,
            labId: lab.labId,
            message: `Visualization Lab "${lab.labId}" direct-entry topic page path does not round-trip its lab ID.`,
            track
          });
        }

        if (url.searchParams.has("lab")) {
          issues.push({
            code: "direct-entry-lab-param-mismatch",
            expected: "path segment",
            actual: url.searchParams.get("lab"),
            href,
            labId: lab.labId,
            message: `Visualization Lab "${lab.labId}" premium topic page href should not duplicate the lab ID in query parameters.`,
            track
          });
        }
      } else if (url.searchParams.get("lab") !== lab.labId) {
        issues.push({
          code: "direct-entry-lab-param-mismatch",
          expected: lab.labId,
          actual: url.searchParams.get("lab"),
          href,
          labId: lab.labId,
          message: `Visualization Lab "${lab.labId}" direct-entry href does not round-trip its lab parameter.`,
          track
        });
      }

      if (/\s/.test(href)) {
        issues.push({
          code: "direct-entry-whitespace-href",
          href,
          labId: lab.labId,
          message: `Visualization Lab "${lab.labId}" direct-entry href contains raw whitespace.`,
          track
        });
      }

      if (/[^\x00-\x7F]/.test(href)) {
        issues.push({
          code: "direct-entry-non-ascii-href",
          href,
          labId: lab.labId,
          message: `Visualization Lab "${lab.labId}" direct-entry href contains raw non-ASCII characters instead of URL encoding.`,
          track
        });
      }

      const previousLab = seenHrefs.get(href);
      if (previousLab && previousLab !== labHrefKey) {
        issues.push({
          code: "direct-entry-duplicate-href",
          href,
          labId: lab.labId,
          message: `Visualization Lab "${labHrefKey}" shares direct-entry href with "${previousLab}".`,
          track
        });
      }
      seenHrefs.set(href, labHrefKey);
    });

    const expectedSelector = `[id=${JSON.stringify(visualizationLabSectionId(lab))}]`;
    const actualSelector = visualizationLabSectionSelector(lab);
    if (actualSelector !== expectedSelector) {
      issues.push({
        code: "direct-entry-section-selector-mismatch",
        expected: expectedSelector,
        actual: actualSelector,
        labId: lab.labId,
        message: `Visualization Lab "${lab.labId}" section selector does not match its section ID.`
      });
    }
  });

  return {
    checkedHrefCount: labs.length * tracks.length,
    checkedLabCount: labs.length,
    checkedTrackCount: tracks.length,
    issues,
    nonAsciiLabCount: labs.filter((lab) => /[^\x00-\x7F]/.test(lab.labId)).length
  };
}

export function auditVisualizationControlSurfaceContract(
  labs: readonly FeaturedLabDefinition[]
): VisualizationControlSurfaceHealthReport {
  const issues: VisualizationControlSurfaceIssue[] = [];

  labs.forEach((lab) => {
    const expectedModuleId = `${lab.analyticsSource}:${lab.labId}:${lab.topicId}`;
    const moduleId = buildVisualizationSessionModuleId(lab);

    if (!lab.topicId.trim()) {
      issues.push({
        code: "control-surface-empty-topic",
        labId: lab.labId,
        message: `Visualization Lab "${lab.labId}" cannot expose a stable control surface because its topic ID is empty.`,
        moduleId,
        topicId: lab.topicId
      });
    }

    if (!moduleId.trim()) {
      issues.push({
        code: "control-surface-empty-module-id",
        labId: lab.labId,
        message: `Visualization Lab "${lab.labId}" generated an empty Mark explored session module ID.`,
        moduleId,
        topicId: lab.topicId
      });
    }

    if (moduleId !== expectedModuleId) {
      issues.push({
        code: "control-surface-module-id-mismatch",
        expected: expectedModuleId,
        actual: moduleId,
        labId: lab.labId,
        message: `Visualization Lab "${lab.labId}" Mark explored module ID no longer matches the analytics source, lab ID, and topic ID contract.`,
        moduleId,
        topicId: lab.topicId
      });
    }

    if (/\s/.test(moduleId)) {
      issues.push({
        code: "control-surface-module-id-whitespace",
        labId: lab.labId,
        message: `Visualization Lab "${lab.labId}" Mark explored module ID contains whitespace.`,
        moduleId,
        topicId: lab.topicId
      });
    }
  });

  return {
    checkedLabCount: labs.length,
    issues,
    nonAsciiModuleIdCount: labs.filter((lab) => /[^\x00-\x7F]/.test(buildVisualizationSessionModuleId(lab))).length,
    requiredSelectorCount: visualizationControlSurfaceSelectors.length,
    requiredSelectors: [...visualizationControlSurfaceSelectors]
  };
}

export function auditVisualizationTemplateConfigContract(
  labs: readonly FeaturedLabDefinition[]
): VisualizationTemplateConfigHealthReport {
  const issues: VisualizationTemplateConfigIssue[] = [];
  const knownTemplateIds = new Set<string>(visualizationTemplateIdValues);
  const coveredTemplateIds = new Set<VisualizationTemplateId>();
  let axisLabelLabCount = 0;

  labs.forEach((lab) => {
    coveredTemplateIds.add(lab.templateId);

    if (!knownTemplateIds.has(lab.templateId)) {
      issues.push({
        actual: lab.templateId,
        code: "template-config-unknown-template-id",
        labId: lab.labId,
        message: `Visualization Lab "${lab.labId}" references template "${lab.templateId}", which is not exported in visualizationTemplateIds.`,
        templateId: lab.templateId
      });
    }

    if (!lab.templateConfig.variant.trim()) {
      issues.push({
        code: "template-config-empty-variant",
        field: "templateConfig.variant",
        labId: lab.labId,
        message: `Visualization Lab "${lab.labId}" has an empty templateConfig.variant.`,
        templateId: lab.templateId
      });
    }

    if (unsafeTemplateVariantPattern.test(lab.templateConfig.variant)) {
      issues.push({
        actual: lab.templateConfig.variant,
        code: "template-config-unsafe-variant",
        field: "templateConfig.variant",
        labId: lab.labId,
        message: `Visualization Lab "${lab.labId}" templateConfig.variant contains whitespace or URL-reserved separators.`,
        templateId: lab.templateId
      });
    }

    collectMissingLocalizedTemplateTextIssues(
      lab,
      "templateConfig.focus",
      lab.templateConfig.focus,
      "template-config-missing-focus-text",
      issues
    );

    collectMissingLocalizedTemplateTextIssues(
      lab,
      "templateConfig.formula",
      lab.templateConfig.formula,
      "template-config-missing-formula-text",
      issues
    );

    if (!lab.templateConfig.accent) {
      issues.push({
        code: "template-config-missing-accent",
        field: "templateConfig.accent",
        labId: lab.labId,
        message: `Visualization Lab "${lab.labId}" has no accent color for its configured renderer marks.`,
        templateId: lab.templateId
      });
    } else if (!safeHexColorPattern.test(lab.templateConfig.accent)) {
      issues.push({
        actual: lab.templateConfig.accent,
        code: "template-config-invalid-accent",
        expected: "#RRGGBB",
        field: "templateConfig.accent",
        labId: lab.labId,
        message: `Visualization Lab "${lab.labId}" accent "${lab.templateConfig.accent}" is not a stable #RRGGBB color.`,
        templateId: lab.templateId
      });
    }

    if (axisLabelTemplateIds.has(lab.templateId)) {
      axisLabelLabCount += 1;
      if (!lab.templateConfig.xLabel?.trim()) {
        issues.push({
          code: "template-config-missing-axis-label",
          field: "templateConfig.xLabel",
          labId: lab.labId,
          message: `Visualization Lab "${lab.labId}" uses coordinate/function axes but has no x-axis label in templateConfig.`,
          templateId: lab.templateId
        });
      }

      if (!lab.templateConfig.yLabel?.trim()) {
        issues.push({
          code: "template-config-missing-axis-label",
          field: "templateConfig.yLabel",
          labId: lab.labId,
          message: `Visualization Lab "${lab.labId}" uses coordinate/function axes but has no y-axis label in templateConfig.`,
          templateId: lab.templateId
        });
      }
    }
  });

  return {
    axisLabelLabCount,
    checkedLabCount: labs.length,
    checkedTemplateCount: visualizationTemplateIdValues.length,
    coveredTemplateIds: visualizationTemplateIdValues.filter((templateId) => coveredTemplateIds.has(templateId)) as VisualizationTemplateId[],
    issues
  };
}

export function auditVisualizationPracticeHandoffContract(
  labs: readonly FeaturedLabDefinition[]
): VisualizationPracticeHandoffHealthReport {
  const issues: VisualizationPracticeHandoffIssue[] = [];

  labs.forEach((lab) => {
    const href = buildVisualizationPracticeHref(lab);
    const url = new URL(href, "https://mais.local");

    if (!lab.topicId.trim()) {
      issues.push({
        code: "practice-handoff-empty-topic",
        href,
        labId: lab.labId,
        message: `Visualization Lab "${lab.labId}" cannot build a Practice handoff because its topic ID is empty.`,
        topicId: lab.topicId
      });
    }

    if (url.pathname !== visualizationPracticePath) {
      issues.push({
        code: "practice-handoff-path-mismatch",
        expected: visualizationPracticePath,
        actual: url.pathname,
        href,
        labId: lab.labId,
        message: `Visualization Lab "${lab.labId}" Practice handoff points at "${url.pathname}" instead of "${visualizationPracticePath}".`,
        topicId: lab.topicId
      });
    }

    if (url.searchParams.get("topicId") !== lab.topicId) {
      issues.push({
        code: "practice-handoff-topic-param-mismatch",
        expected: lab.topicId,
        actual: url.searchParams.get("topicId"),
        href,
        labId: lab.labId,
        message: `Visualization Lab "${lab.labId}" Practice handoff does not round-trip its topic ID.`,
        topicId: lab.topicId
      });
    }

    if (url.hash) {
      issues.push({
        code: "practice-handoff-hash-fragment",
        actual: url.hash,
        href,
        labId: lab.labId,
        message: `Visualization Lab "${lab.labId}" Practice handoff includes a hash fragment.`,
        topicId: lab.topicId
      });
    }

    if (/\s/.test(href)) {
      issues.push({
        code: "practice-handoff-whitespace-href",
        href,
        labId: lab.labId,
        message: `Visualization Lab "${lab.labId}" Practice handoff href contains raw whitespace.`,
        topicId: lab.topicId
      });
    }

    if (/[^\x00-\x7F]/.test(href)) {
      issues.push({
        code: "practice-handoff-non-ascii-href",
        href,
        labId: lab.labId,
        message: `Visualization Lab "${lab.labId}" Practice handoff href contains raw non-ASCII characters instead of URL encoding.`,
        topicId: lab.topicId
      });
    }
  });

  return {
    checkedHrefCount: labs.length,
    checkedLabCount: labs.length,
    issues,
    nonAsciiTopicCount: labs.filter((lab) => /[^\x00-\x7F]/.test(lab.topicId)).length
  };
}

export function visualizationLabSectionId(labOrId: FeaturedLabDefinition | string) {
  return `lab-example-${typeof labOrId === "string" ? labOrId : labOrId.labId}`;
}

export function visualizationLabSectionSelector(labOrId: FeaturedLabDefinition | string) {
  return `[id=${JSON.stringify(visualizationLabSectionId(labOrId))}]`;
}

export function summarizeVisualizationCatalog(
  labs: readonly FeaturedLabDefinition[],
  groups: readonly GradeLabGroupDefinition[]
): VisualizationCatalogSummary {
  const byModule = {} as Record<VisualizationModuleId, number>;
  const byTemplate = {} as Record<VisualizationTemplateId, number>;
  const byTrack = {} as Record<VisualizationCurriculumTrack, number>;

  labs.forEach((lab) => {
    increment(byModule, lab.moduleId);
    increment(byTemplate, lab.templateId);
    increment(byTrack, lab.curriculumTrack);
  });

  return {
    byModule,
    byTemplate,
    byTrack,
    gradeGroups: groups.map((group) => ({
      grade: group.grade,
      labCount: group.labs.length
    })),
    labCount: labs.length
  };
}

export function auditVisualizationCatalogContract(
  labs: readonly FeaturedLabDefinition[],
  groups: readonly GradeLabGroupDefinition[]
): VisualizationCatalogHealthReport {
  const issues: VisualizationCatalogIssue[] = [];
  const catalogLabIds = new Set<string>();
  const groupedLabIds = new Set<string>();
  const primaryTopicIds = new Set<string>();
  const knownGradeIds = new Set<string>(gradeIds);

  if (labs.length === 0) {
    issues.push({
      code: "empty-catalog",
      message: "Visualization Lab catalog is empty."
    });
  }

  labs.forEach((lab) => {
    if (catalogLabIds.has(lab.labId)) {
      issues.push({
        code: "duplicate-lab-id",
        labId: lab.labId,
        message: `Duplicate Visualization Lab ID: ${lab.labId}.`
      });
    }
    catalogLabIds.add(lab.labId);

    if (unsafeLabIdPattern.test(lab.labId)) {
      issues.push({
        code: "unsafe-lab-id",
        labId: lab.labId,
        message: `Visualization Lab ID "${lab.labId}" contains whitespace or URL-reserved separators.`
      });
    }

    if (!knownGradeIds.has(lab.grade)) {
      issues.push({
        code: "unknown-grade",
        grade: lab.grade,
        labId: lab.labId,
        message: `Visualization Lab "${lab.labId}" references unknown grade "${lab.grade}".`
      });
    }

    collectMissingLocalizedTextIssues(lab, issues);

    if (lab.primaryForTopic) {
      if (primaryTopicIds.has(lab.topicId)) {
        issues.push({
          code: "duplicate-primary-topic",
          labId: lab.labId,
          topicId: lab.topicId,
          message: `More than one primary Visualization Lab is mapped to topic "${lab.topicId}".`
        });
      }
      primaryTopicIds.add(lab.topicId);
    }
  });

  groups.forEach((group) => {
    if (group.labs.length === 0) {
      issues.push({
        code: "empty-grade-group",
        grade: group.grade,
        message: `Visualization grade group "${group.grade}" has no labs.`
      });
    }

    group.labs.forEach((lab) => {
      groupedLabIds.add(lab.labId);
      if (lab.grade !== group.grade) {
        issues.push({
          code: "group-grade-mismatch",
          grade: group.grade,
          labId: lab.labId,
          message: `Visualization Lab "${lab.labId}" is listed under "${group.grade}" but declares grade "${lab.grade}".`
        });
      }
    });
  });

  labs.forEach((lab) => {
    if (!groupedLabIds.has(lab.labId)) {
      issues.push({
        code: "lab-missing-from-grade-groups",
        grade: lab.grade,
        labId: lab.labId,
        message: `Visualization Lab "${lab.labId}" is in the catalog but not in any grade group.`
      });
    }
  });

  return {
    issues,
    summary: summarizeVisualizationCatalog(labs, groups)
  };
}

export function auditVisualizationCurriculumReview(
  labs: readonly FeaturedLabDefinition[]
): VisualizationCurriculumReviewIssue[] {
  const issues: VisualizationCurriculumReviewIssue[] = [];

  labs.forEach((lab) => {
    const focusText = localizedTextToSearchString(lab.templateConfig.focus);
    const topicText = [
      lab.labId,
      lab.topicId,
      localizedTextToSearchString(lab.title),
      localizedTextToSearchString(lab.category),
      lab.templateId
    ]
      .join(" ")
      .toLowerCase();
    const topicIdentityText = [
      lab.labId,
      lab.topicId,
      localizedTextToSearchString(lab.title)
    ]
      .join(" ")
      .toLowerCase();

    focusTopicMismatchRules.forEach((rule) => {
      if (!rule.focusPattern.test(focusText) || rule.topicPattern.test(topicText)) return;

      issues.push({
        code: "focus-topic-keyword-mismatch",
        labId: lab.labId,
        topicId: lab.topicId,
        grade: lab.grade,
        severity: "medium",
        message: `Visualization Lab "${lab.labId}" focus text references ${rule.id}, but the lab ID, topic ID, title, category, and template do not.`,
        details: {
          focusRule: rule.id,
          templateId: lab.templateId
        }
      });
    });

    topicTemplateMismatchRules.forEach((rule) => {
      if (!rule.topicPattern.test(topicIdentityText) || rule.allowedTemplates.includes(lab.templateId)) return;

      issues.push({
        code: "topic-template-keyword-mismatch",
        labId: lab.labId,
        topicId: lab.topicId,
        grade: lab.grade,
        severity: "medium",
        message: `Visualization Lab "${lab.labId}" topic text matches ${rule.id}, but template "${lab.templateId}" is outside the expected template family.`,
        details: {
          topicRule: rule.id,
          templateId: lab.templateId,
          allowedTemplates: [...rule.allowedTemplates]
        }
      });
    });
  });

  return issues;
}

export function auditVisualizationSourceCardAlignment(
  sourceCards: readonly VisualizationSourceCardLike[],
  options: VisualizationSourceCardAlignmentOptions = {}
): VisualizationCurriculumReviewIssue[] {
  const issues: VisualizationCurriculumReviewIssue[] = [];

  sourceCards.forEach((card) => {
    const topicIds = card.topicIds ?? [];
    const domainTags = card.domainTags ?? [];
    const conceptIds = card.conceptIds ?? [];
    const sourceCardId = card.id ?? card.idSuffix ?? `${card.curriculumTrack ?? "source"}-${card.grade ?? "unknown"}`;

    if (topicIds.length === domainTags.length && topicIds.length === conceptIds.length) return;

    const prefix = resolveLabIdPrefix(card, options.labIdPrefix);
    topicIds.forEach((rawTopicId, index) => {
      const topicId = `${prefix}${rawTopicId}`;
      issues.push({
        code: "source-card-array-cardinality-mismatch",
        sourceCardId,
        labId: topicId,
        topicId,
        grade: card.grade,
        severity: "systemic-high",
        message: `Source card "${sourceCardId}" has ${topicIds.length} topicIds, ${domainTags.length} domainTags, and ${conceptIds.length} conceptIds; generated lab "${topicId}" may inherit misaligned title, focus, or template metadata.`,
        details: {
          sourceSlot: index,
          topicIdCount: topicIds.length,
          domainTagCount: domainTags.length,
          conceptIdCount: conceptIds.length,
          sourceDomainTag: domainTags[index],
          sourceConceptId: conceptIds[index],
          hiddenExtraDomainTags: domainTags.slice(topicIds.length),
          hiddenExtraConceptIds: conceptIds.slice(topicIds.length)
        }
      });
    });
  });

  return issues;
}

function collectMissingLocalizedTextIssues(lab: FeaturedLabDefinition, issues: VisualizationCatalogIssue[]) {
  const entries: Array<[string, LocalizedText | undefined]> = [
    ["title", lab.title],
    ["description", lab.description],
    ["category", lab.category],
    ["gradeLabel", lab.gradeLabel],
    ["templateConfig.focus", lab.templateConfig.focus]
  ];

  entries.forEach(([fieldName, value]) => {
    localizedTextKeys.forEach((key) => {
      if (value?.[key]?.trim()) return;
      issues.push({
        code: "missing-localized-text",
        labId: lab.labId,
        message: `Visualization Lab "${lab.labId}" is missing ${fieldName}.${key}.`
      });
    });
  });
}

function collectMissingLocalizedTemplateTextIssues(
  lab: FeaturedLabDefinition,
  fieldName: string,
  value: LocalizedText | undefined,
  code: Extract<
    VisualizationTemplateConfigIssueCode,
    "template-config-missing-focus-text" | "template-config-missing-formula-text"
  >,
  issues: VisualizationTemplateConfigIssue[]
) {
  localizedTextKeys.forEach((key) => {
    if (value?.[key]?.trim()) return;
    issues.push({
      code,
      field: `${fieldName}.${key}`,
      labId: lab.labId,
      message: `Visualization Lab "${lab.labId}" is missing ${fieldName}.${key}.`,
      templateId: lab.templateId
    });
  });
}

function localizedTextToSearchString(value: LocalizedText | undefined) {
  return [value?.en, value?.zh, value?.zhHans].filter(Boolean).join(" ").toLowerCase();
}

function resolveLabIdPrefix(
  card: VisualizationSourceCardLike,
  labIdPrefix: VisualizationSourceCardAlignmentOptions["labIdPrefix"]
) {
  if (typeof labIdPrefix === "function") return labIdPrefix(card);
  if (typeof labIdPrefix === "string") return labIdPrefix;
  return "";
}

function increment<T extends string>(counts: Record<T, number>, key: T) {
  counts[key] = (counts[key] ?? 0) + 1;
}
