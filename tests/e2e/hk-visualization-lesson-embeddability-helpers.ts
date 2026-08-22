import {
  HK_VISUALIZATION_LAB_IDS,
  hkVisualizationLabRegistryKind,
  type HKVisualizationLabId,
  type HKVisualizationLabRegistryKind
} from "../../components/visualizations/hk/hkVisualizationLabRegistry";
import {
  HK_VISUALIZATION_LESSON_CONTRACTS,
  type HKVisualizationLessonContract
} from "../../components/visualizations/hk/hkVisualizationLessonContracts";
import {
  liveProductionLessonSeeds,
  type ProductionLessonBlock,
  type ProductionLessonSeed
} from "../../data/lessons";
import { topics } from "../../data/topics";
import { lessonHrefForSlug, lessonSlugForTopicId } from "../../lib/lessonLinks";
import type { GradeId, LocalizedText } from "../../types";

export const HK_VISUALIZATION_LESSON_EMBEDDABILITY_SCHEMA_VERSION =
  "hk-viz-lesson-embeddability.v1" as const;
export const HK_VISUALIZATION_LESSON_EXPECTED_COUNT = 51 as const;

type LessonGateEnvironment = Readonly<Record<string, string | undefined>>;

export type HkVisualizationLessonBrowserOptions = Readonly<{
  allowPartial: boolean;
  fullBrowserRequested: boolean;
  releaseAcceptance: boolean;
}>;

export type HkVisualizationVisibilityNode = Readonly<{
  ariaHidden: boolean;
  contentVisibility: string;
  display: string;
  hidden: boolean;
  inert: boolean;
  opacity: number | null;
  visibility: string;
}>;

/**
 * Playwright intentionally considers opacity:0 elements "visible". Learner
 * acceptance is stricter: no element or ancestor may suppress perception,
 * accessibility, or interaction through CSS, hidden, inert, or aria-hidden.
 */
export function hkVisualizationVisibilityBlockers(
  chain: readonly HkVisualizationVisibilityNode[]
) {
  const blockers: string[] = [];
  if (chain.length === 0) return ["missing-visibility-chain"];
  let effectiveOpacity = 1;
  chain.forEach((node, index) => {
    const scope = index === 0 ? "self" : `ancestor-${index}`;
    if (node.hidden) blockers.push(`${scope}:hidden`);
    if (node.inert) blockers.push(`${scope}:inert`);
    if (node.ariaHidden) blockers.push(`${scope}:aria-hidden`);
    if (node.display === "none") blockers.push(`${scope}:display-none`);
    if (node.visibility === "hidden" || node.visibility === "collapse") {
      blockers.push(`${scope}:visibility-${node.visibility}`);
    }
    if (node.contentVisibility === "hidden") blockers.push(`${scope}:content-visibility-hidden`);
    if (node.opacity === null || !Number.isFinite(node.opacity)) blockers.push(`${scope}:opacity-unreadable`);
    else {
      effectiveOpacity *= Math.min(1, Math.max(0, node.opacity));
      if (node.opacity <= 0.01) blockers.push(`${scope}:opacity-${node.opacity}`);
    }
  });
  if (effectiveOpacity <= 0.01) blockers.push(`effective-opacity-${effectiveOpacity}`);
  return blockers;
}

function strictBinaryFlag(
  name: "HK_VIZ_ALLOW_PARTIAL" | "HK_VIZ_LESSON_FULL",
  value: string | undefined,
  defaultValue: boolean
) {
  if (value === undefined) return defaultValue;
  if (value === "1") return true;
  if (value === "0") return false;
  throw new Error(`${name} must be exactly 0 or 1; received ${JSON.stringify(value)}.`);
}

/**
 * Release/default execution is the complete lesson sweep. A developer may
 * suppress the browser cells only with both explicit flags; a typo can never
 * silently turn a release gate into a partial run.
 */
export function resolveHkVisualizationLessonBrowserOptions(
  environment: LessonGateEnvironment = process.env
): HkVisualizationLessonBrowserOptions {
  const allowPartial = strictBinaryFlag(
    "HK_VIZ_ALLOW_PARTIAL",
    environment.HK_VIZ_ALLOW_PARTIAL,
    false
  );
  const fullBrowserRequested = strictBinaryFlag(
    "HK_VIZ_LESSON_FULL",
    environment.HK_VIZ_LESSON_FULL,
    true
  );

  if (!fullBrowserRequested && !allowPartial) {
    throw new Error(
      "HK Visualization lesson browser sweep is full by default. Development-only skipping "
      + "requires HK_VIZ_ALLOW_PARTIAL=1 together with explicit HK_VIZ_LESSON_FULL=0."
    );
  }

  return Object.freeze({
    allowPartial,
    fullBrowserRequested,
    releaseAcceptance: fullBrowserRequested && !allowPartial
  });
}

export const HK_VISUALIZATION_LESSON_SLUG_OVERRIDES = Object.freeze({
  "quadratic-patterns": "quadratic-functions"
} as const satisfies Partial<Record<HKVisualizationLabId, string>>);

const gradeOrder = [
  "P1",
  "P2",
  "P3",
  "P4",
  "P5",
  "P6",
  "S1",
  "S2",
  "S3",
  "S4",
  "S5",
  "S6",
  "UNMAPPED"
] as const;

export type HkVisualizationLessonPackageGrade = GradeId | "UNMAPPED";

export type HkVisualizationLessonRouteContract = {
  labId: HKVisualizationLabId;
  lessonSlug: string;
  route: string;
};

export type HkVisualizationLessonSourceRow = HkVisualizationLessonRouteContract & {
  bindingTopicIds: Array<string | null>;
  exactBindingCount: number;
  expectedRenderer: "dedicated" | "pass-through";
  grade: GradeId | null;
  gradeContractExact: boolean;
  manifestGrade: GradeId;
  hasExactVisualizationBinding: boolean;
  labKind: HKVisualizationLabRegistryKind;
  lessonCount: number;
  lessonDescription: LocalizedText | null;
  lessonTitle: LocalizedText | null;
  moduleId: HKVisualizationLessonContract["moduleId"];
  moduleIds: Array<string | null>;
  resetSelector: string;
  resolvedLessonSlug: string;
  slugContractExact: boolean;
  sourceIssues: string[];
  stateSelector: string;
  topicId: HKVisualizationLabId;
  topicCount: number;
  visualizationBlockCount: number;
};

export type HkVisualizationLessonSourceManifest = {
  contract: {
    catalogOnlyLabIds: HKVisualizationLabId[];
    duplicateLessonLabIds: HKVisualizationLabId[];
    duplicateRouteSlugs: string[];
    duplicateTopicLabIds: HKVisualizationLabId[];
    embeddableLabIds: HKVisualizationLabId[];
    gradeContractDriftLabIds: HKVisualizationLabId[];
    invalidBindingLabIds: HKVisualizationLabId[];
    missingLessonLabIds: HKVisualizationLabId[];
    missingTopicLabIds: HKVisualizationLabId[];
    notEmbeddableLabIds: HKVisualizationLabId[];
    quadraticRouteExact: boolean;
    legacySeniorRoutingExact: boolean;
    newS3RoutingExact: boolean;
    slugContractDriftLabIds: HKVisualizationLabId[];
  };
  generatedAt: string;
  ledger: {
    duplicateCellIds: string[];
    executedCellIds: string[];
    missingCellIds: string[];
    plannedCellIds: string[];
  };
  rows: HkVisualizationLessonSourceRow[];
  schemaVersion: typeof HK_VISUALIZATION_LESSON_EMBEDDABILITY_SCHEMA_VERSION;
  summary: {
    catalogOnlyLessonCount: number;
    embeddableLessonCount: number;
    expectedLabCount: typeof HK_VISUALIZATION_LESSON_EXPECTED_COUNT;
    lessonSourceCount: number;
    missingLessonCount: number;
    notEmbeddableCount: number;
    registryLabCount: number;
    topicSourceCount: number;
  };
};

export type HkVisualizationLessonGradePackage = {
  grade: HkVisualizationLessonPackageGrade;
  id: string;
  rows: HkVisualizationLessonSourceRow[];
};

function exactLessonSlug(labId: HKVisualizationLabId) {
  return HK_VISUALIZATION_LESSON_SLUG_OVERRIDES[labId as keyof typeof HK_VISUALIZATION_LESSON_SLUG_OVERRIDES]
    ?? labId;
}

export const HK_VISUALIZATION_LESSON_ROUTE_MAP = Object.freeze(
  Object.fromEntries(
    HK_VISUALIZATION_LAB_IDS.map((labId) => {
      const lessonSlug = exactLessonSlug(labId);
      return [
        labId,
        Object.freeze({
          labId,
          lessonSlug,
          route: lessonHrefForSlug(lessonSlug)
        })
      ];
    })
  )
) as Readonly<Record<HKVisualizationLabId, Readonly<HkVisualizationLessonRouteContract>>>;

function visualizationBlocks(lessons: readonly ProductionLessonSeed[]) {
  return lessons.flatMap((lesson) =>
    lesson.blocks.filter((block): block is ProductionLessonBlock & {
      type: "visualization";
    } => block.type === "visualization")
  );
}

function duplicateValues(values: readonly string[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([value]) => value)
    .sort();
}

function sourceIssuesFor(args: {
  exactBindingCount: number;
  gradeContractExact: boolean;
  labId: HKVisualizationLabId;
  lessonCount: number;
  runtimeContractIssues: readonly string[];
  slugContractExact: boolean;
  topicCount: number;
  visualizationBlockCount: number;
}) {
  const issues: string[] = [...args.runtimeContractIssues];
  if (args.topicCount === 0) issues.push("missing-topic");
  if (args.topicCount > 1) issues.push(`duplicate-topic:${args.topicCount}`);
  if (args.lessonCount === 0) issues.push("missing-lesson");
  if (args.lessonCount > 1) issues.push(`duplicate-lesson:${args.lessonCount}`);
  if (!args.gradeContractExact) issues.push("topic-grade-contract-drift");
  if (!args.slugContractExact) issues.push("lesson-slug-contract-drift");
  if (args.lessonCount === 1 && args.visualizationBlockCount === 0) issues.push("catalog-only-no-visualization-block");
  if (args.visualizationBlockCount > 1) issues.push(`duplicate-visualization-block:${args.visualizationBlockCount}`);
  if (args.lessonCount === 1 && args.exactBindingCount !== 1) {
    issues.push(`exact-lab-binding-count:${args.exactBindingCount}`);
  }
  return issues;
}

function runtimeContractIssuesFor(
  labId: HKVisualizationLabId,
  contract: HKVisualizationLessonContract
) {
  const issues: string[] = [];
  if (contract.labId !== labId) issues.push(`runtime-contract-lab-id:${contract.labId}`);
  if (contract.topicId !== labId) issues.push(`runtime-contract-topic-id:${contract.topicId}`);
  if (contract.moduleId !== "configured-visualization-lab") {
    issues.push(`runtime-contract-module-id:${contract.moduleId}`);
  }
  if (!contract.selectors.state.trim()) issues.push("runtime-contract-state-selector-empty");
  if (!contract.selectors.reset.includes('[data-viz-reset-module-id="configured-visualization-lab"]')) {
    issues.push("runtime-contract-reset-module-selector-missing");
  }
  if (!contract.selectors.reset.includes(`[data-viz-reset-topic-id="${labId}"]`)) {
    issues.push("runtime-contract-reset-topic-selector-missing");
  }
  return issues;
}

function buildSourceRow(labId: HKVisualizationLabId): HkVisualizationLessonSourceRow {
  const routeContract = HK_VISUALIZATION_LESSON_ROUTE_MAP[labId];
  const runtimeContract = HK_VISUALIZATION_LESSON_CONTRACTS[labId];
  const matchingTopics = topics.filter(
    (topic) => topic.curriculumTrack === "HK" && topic.id === labId
  );
  const matchingLessons = liveProductionLessonSeeds.filter((lesson) => lesson.topicId === labId);
  const blocks = visualizationBlocks(matchingLessons);
  const exactBindingCount = blocks.filter((block) =>
    block.visualizationConfig?.topicId === labId
    && block.visualizationConfig.moduleId === runtimeContract.moduleId
  ).length;
  const resolvedLessonSlug = lessonSlugForTopicId(labId);
  const slugContractExact = resolvedLessonSlug === routeContract.lessonSlug;
  const gradeContractExact = matchingTopics.length === 1
    && matchingTopics[0]?.grade === runtimeContract.grade;
  const sourceIssues = sourceIssuesFor({
    exactBindingCount,
    gradeContractExact,
    labId,
    lessonCount: matchingLessons.length,
    runtimeContractIssues: runtimeContractIssuesFor(labId, runtimeContract),
    slugContractExact,
    topicCount: matchingTopics.length,
    visualizationBlockCount: blocks.length
  });
  const labKind = hkVisualizationLabRegistryKind(labId);
  if (!labKind) throw new Error(`Registry kind is missing for ${labId}.`);

  return Object.freeze({
    ...routeContract,
    bindingTopicIds: blocks.map((block) => block.visualizationConfig?.topicId ?? null),
    exactBindingCount,
    expectedRenderer: labKind === "pass-through" ? "pass-through" : "dedicated",
    grade: matchingTopics[0]?.grade ?? null,
    gradeContractExact,
    hasExactVisualizationBinding:
      matchingLessons.length === 1
      && blocks.length === 1
      && exactBindingCount === 1,
    labKind,
    lessonCount: matchingLessons.length,
    lessonDescription: matchingLessons[0]?.description ?? null,
    lessonTitle: matchingLessons[0]?.title ?? null,
    manifestGrade: runtimeContract.grade,
    moduleId: runtimeContract.moduleId,
    moduleIds: blocks.map((block) => block.visualizationConfig?.moduleId ?? null),
    resetSelector: runtimeContract.selectors.reset,
    resolvedLessonSlug,
    slugContractExact,
    sourceIssues,
    stateSelector: runtimeContract.selectors.state,
    topicId: runtimeContract.topicId,
    topicCount: matchingTopics.length,
    visualizationBlockCount: blocks.length
  });
}

export function buildHkVisualizationLessonSourceManifest(
  generatedAt = new Date().toISOString()
): HkVisualizationLessonSourceManifest {
  const rows = HK_VISUALIZATION_LAB_IDS.map(buildSourceRow);
  const plannedCellIds = rows.map((row) => `source/${row.labId}`);
  const executedCellIds = rows.map((row) => `source/${row.labId}`);
  const duplicateCellIds = duplicateValues(executedCellIds);
  const executedCellIdSet = new Set(executedCellIds);
  const missingCellIds = plannedCellIds.filter((cellId) => !executedCellIdSet.has(cellId));
  const routeSlugs = rows.map((row) => row.lessonSlug);
  const embeddableLabIds = rows
    .filter((row) => row.sourceIssues.length === 0 && row.hasExactVisualizationBinding)
    .map((row) => row.labId);
  const notEmbeddableLabIds = rows
    .filter((row) => !embeddableLabIds.includes(row.labId))
    .map((row) => row.labId);
  const catalogOnlyLabIds = rows
    .filter((row) => row.lessonCount === 1 && row.visualizationBlockCount === 0)
    .map((row) => row.labId);
  const missingLessonLabIds = rows.filter((row) => row.lessonCount === 0).map((row) => row.labId);
  const manifest: HkVisualizationLessonSourceManifest = {
    contract: {
      catalogOnlyLabIds,
      duplicateLessonLabIds: rows.filter((row) => row.lessonCount > 1).map((row) => row.labId),
      duplicateRouteSlugs: duplicateValues(routeSlugs),
      duplicateTopicLabIds: rows.filter((row) => row.topicCount > 1).map((row) => row.labId),
      embeddableLabIds,
      gradeContractDriftLabIds: rows.filter((row) => !row.gradeContractExact).map((row) => row.labId),
      invalidBindingLabIds: rows
        .filter((row) => row.lessonCount === 1 && !row.hasExactVisualizationBinding)
        .map((row) => row.labId),
      missingLessonLabIds,
      missingTopicLabIds: rows.filter((row) => row.topicCount === 0).map((row) => row.labId),
      notEmbeddableLabIds,
      quadraticRouteExact:
        HK_VISUALIZATION_LESSON_ROUTE_MAP["quadratic-patterns"].lessonSlug === "quadratic-functions"
        && rows.find((row) => row.labId === "quadratic-patterns")?.resolvedLessonSlug === "quadratic-functions",
      legacySeniorRoutingExact:
        rows.find((row) => row.labId === "quadratic-patterns")?.grade === "S4"
        && rows.find((row) => row.labId === "circles")?.grade === "S4",
      newS3RoutingExact:
        rows.find((row) => row.labId === "identities-square-patterns")?.grade === "S3"
        && rows.find((row) => row.labId === "arc-length-sector-area")?.grade === "S3",
      slugContractDriftLabIds: rows.filter((row) => !row.slugContractExact).map((row) => row.labId)
    },
    generatedAt,
    ledger: {
      duplicateCellIds,
      executedCellIds,
      missingCellIds,
      plannedCellIds
    },
    rows,
    schemaVersion: HK_VISUALIZATION_LESSON_EMBEDDABILITY_SCHEMA_VERSION,
    summary: {
      catalogOnlyLessonCount: catalogOnlyLabIds.length,
      embeddableLessonCount: embeddableLabIds.length,
      expectedLabCount: HK_VISUALIZATION_LESSON_EXPECTED_COUNT,
      lessonSourceCount: rows.filter((row) => row.lessonCount === 1).length,
      missingLessonCount: missingLessonLabIds.length,
      notEmbeddableCount: notEmbeddableLabIds.length,
      registryLabCount: rows.length,
      topicSourceCount: rows.filter((row) => row.topicCount === 1).length
    }
  };

  return manifest;
}

export function assertHkVisualizationLessonSourceContract(
  manifest: HkVisualizationLessonSourceManifest
) {
  const failures: string[] = [];
  if (manifest.rows.length !== HK_VISUALIZATION_LESSON_EXPECTED_COUNT) {
    failures.push(
      `registry-count expected=${HK_VISUALIZATION_LESSON_EXPECTED_COUNT} actual=${manifest.rows.length}`
    );
  }
  if (new Set(manifest.rows.map((row) => row.labId)).size !== HK_VISUALIZATION_LESSON_EXPECTED_COUNT) {
    failures.push("registry-lab-ids-are-not-exactly-unique");
  }
  if (manifest.ledger.duplicateCellIds.length > 0) {
    failures.push(`duplicate-source-cells=[${manifest.ledger.duplicateCellIds.join(", ")}]`);
  }
  if (manifest.ledger.missingCellIds.length > 0) {
    failures.push(`missing-source-cells=[${manifest.ledger.missingCellIds.join(", ")}]`);
  }
  if (manifest.contract.duplicateRouteSlugs.length > 0) {
    failures.push(`duplicate-route-slugs=[${manifest.contract.duplicateRouteSlugs.join(", ")}]`);
  }
  if (manifest.contract.duplicateTopicLabIds.length > 0) {
    failures.push(`duplicate-topics=[${manifest.contract.duplicateTopicLabIds.join(", ")}]`);
  }
  if (manifest.contract.duplicateLessonLabIds.length > 0) {
    failures.push(`duplicate-lessons=[${manifest.contract.duplicateLessonLabIds.join(", ")}]`);
  }
  if (!manifest.contract.quadraticRouteExact) {
    failures.push("quadratic-patterns-route-must-be-/student/lessons/quadratic-functions");
  }
  if (!manifest.contract.legacySeniorRoutingExact) {
    failures.push("quadratic-patterns-and-circles-must-remain-s4");
  }
  if (!manifest.contract.newS3RoutingExact) {
    failures.push("identities-square-patterns-and-arc-length-sector-area-must-be-s3");
  }
  if (manifest.contract.gradeContractDriftLabIds.length > 0) {
    failures.push(`topic-grade-contract-drift=[${manifest.contract.gradeContractDriftLabIds.join(", ")}]`);
  }
  if (manifest.contract.slugContractDriftLabIds.length > 0) {
    failures.push(`slug-contract-drift=[${manifest.contract.slugContractDriftLabIds.join(", ")}]`);
  }
  if (manifest.contract.missingTopicLabIds.length > 0) {
    failures.push(`missing-topics=[${manifest.contract.missingTopicLabIds.join(", ")}]`);
  }
  if (manifest.contract.missingLessonLabIds.length > 0) {
    failures.push(`missing-lessons=[${manifest.contract.missingLessonLabIds.join(", ")}]`);
  }
  if (manifest.contract.catalogOnlyLabIds.length > 0) {
    failures.push(`catalog-only-lessons=[${manifest.contract.catalogOnlyLabIds.join(", ")}]`);
  }
  if (manifest.contract.invalidBindingLabIds.length > 0) {
    failures.push(`invalid-or-missing-lab-bindings=[${manifest.contract.invalidBindingLabIds.join(", ")}]`);
  }
  if (manifest.contract.notEmbeddableLabIds.length > 0) {
    failures.push(`not-embeddable=[${manifest.contract.notEmbeddableLabIds.join(", ")}]`);
  }

  if (failures.length > 0) {
    throw new Error(
      `HK Visualization lesson embeddability hard gate failed: `
      + `${manifest.summary.embeddableLessonCount}/${manifest.summary.expectedLabCount} source-ready.\n`
      + failures.map((failure) => `- ${failure}`).join("\n")
    );
  }
}

export function buildHkVisualizationLessonGradePackages(
  manifest: HkVisualizationLessonSourceManifest
): HkVisualizationLessonGradePackage[] {
  const rowsByGrade = new Map<HkVisualizationLessonPackageGrade, HkVisualizationLessonSourceRow[]>();
  for (const row of manifest.rows) {
    const grade = row.grade ?? "UNMAPPED";
    const gradeRows = rowsByGrade.get(grade) ?? [];
    gradeRows.push(row);
    rowsByGrade.set(grade, gradeRows);
  }

  return gradeOrder
    .filter((grade) => rowsByGrade.has(grade))
    .map((grade) => ({
      grade,
      id: `hk-viz-lesson-${grade.toLowerCase()}`,
      rows: [...(rowsByGrade.get(grade) ?? [])]
    }));
}
