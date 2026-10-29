#!/usr/bin/env -S npx tsx

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ccssTextbookLessonIds, ccssTextbookLessons } from "../data/ccssTextbookRegistry";
import { liveProductionLessonSeeds } from "../data/lessons";
import { mainlandBnuHighLessonSeeds } from "../data/mainlandBnuHighLessons";
import { mainlandBnuJuniorLessonSeeds } from "../data/mainlandBnuJuniorLessons";
import { mainlandBnuPrimaryLessonSeeds } from "../data/mainlandBnuPrimaryLessons";
import { mainlandHjbHighLessonSeeds } from "../data/mainlandHjbHighLessons";
import { mainlandHjbJuniorLessonSeeds } from "../data/mainlandHjbJuniorLessons";
import { mainlandHjbPrimaryLessonSeeds } from "../data/mainlandHjbPrimaryLessons";
import { mainlandPepHighLessonSeeds } from "../data/mainlandPepHighLessons";
import { mainlandPepJuniorLessonSeeds } from "../data/mainlandPepJuniorLessons";
import { mainlandPepPrimaryLessonSeeds } from "../data/mainlandPepPrimaryLessons";
import { questions } from "../data/questions";
import {
  getSignatureLabAssignment,
  signatureLabAssignments,
  signatureLabIds
} from "../data/signatureLabAssignments";
import { usArkansasMiddleSchoolLessonSeeds } from "../data/usArkansasMiddleSchoolLessons";
import { usCaliforniaLessonSeeds } from "../data/usCaliforniaLessons";
import { usFloridaMiddleSchoolLessonSeeds } from "../data/usFloridaMiddleSchoolLessons";
import { visualizationLabCatalog } from "../data/visualizationLabs";
import { lessonHrefForTopicId } from "../lib/lessonLinks";
import type { ProductionLessonSeed } from "../data/lessons";
import type { TextbookPublisher } from "../types";

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

type AssetReference = {
  manifest: string;
  exportName: string;
  assetPath: string;
  mediaType: "svg" | "raster" | "other";
};

// Every project gate invokes this script from the repository root. Avoid
// `import.meta` so the full-project CommonJS compilation used by component,
// visualization, and question-figure tests can include the inventory module.
const repoRoot = path.resolve(process.cwd());
const dataDir = path.join(repoRoot, "data");
const publicDir = path.join(repoRoot, "public");
const sourceRoots = ["app", "components"];
const liveAssetPrefix = /^\/(?:lesson-illustrations|question-illustrations|forum-assets)\//u;
const nonProductSourcePattern =
  /(?:^|[\\/])(?:__)?(?:tests?|fixtures?|stories|storybook|mocks?|snapshots?)(?:__)?(?:[\\/]|$)|\.(?:test|spec|stories|story|fixture|mock|snap)\.(?:ts|tsx|js|jsx)$/u;

function walkFiles(relativeRoot: string): string[] {
  const absoluteRoot = path.join(repoRoot, relativeRoot);
  return readdirSync(absoluteRoot).flatMap((entry) => {
    const absolute = path.join(absoluteRoot, entry);
    const relative = path.relative(repoRoot, absolute);
    if (statSync(absolute).isDirectory()) return walkFiles(relative);
    return [relative];
  });
}

function countMatches(source: string, pattern: RegExp) {
  return Array.from(source.matchAll(pattern)).length;
}

function mediaType(assetPath: string): AssetReference["mediaType"] {
  if (/\.svg$/iu.test(assetPath)) return "svg";
  if (/\.(?:avif|gif|jpe?g|png|webp)$/iu.test(assetPath)) return "raster";
  return "other";
}

function collectAssetPaths(node: unknown, found = new Set<string>()): Set<string> {
  if (typeof node === "string") {
    if (liveAssetPrefix.test(node)) found.add(node);
    return found;
  }
  if (Array.isArray(node)) {
    for (const item of node) collectAssetPaths(item, found);
    return found;
  }
  if (node && typeof node === "object") {
    for (const value of Object.values(node)) collectAssetPaths(value, found);
  }
  return found;
}

async function liveAssetReferences(): Promise<AssetReference[]> {
  const manifests = readdirSync(dataDir)
    .filter((name) => name.endsWith("LessonIllustrations.ts"))
    .sort();
  const references: AssetReference[] = [];

  for (const manifest of manifests) {
    const module = await import(pathToFileURL(path.join(dataDir, manifest)).href) as Record<string, unknown>;
    const exportNames = new Set(Object.keys(module));
    for (const [exportName, value] of Object.entries(module)) {
      if (typeof value === "function" || exportName.endsWith("Withdrawal")) continue;
      if (exportName.endsWith("Drafts")) {
        const base = exportName.slice(0, -"Drafts".length);
        const liveName = `${base}s`;
        if (exportNames.has(`${base}Withdrawal`) && Array.isArray(module[liveName]) && module[liveName].length === 0) continue;
      }
      for (const assetPath of Array.from(collectAssetPaths(value)).sort()) {
        references.push({ manifest, exportName, assetPath, mediaType: mediaType(assetPath) });
      }
    }
  }

  return references.sort((first, second) =>
    `${first.manifest}\0${first.exportName}\0${first.assetPath}`.localeCompare(`${second.manifest}\0${second.exportName}\0${second.assetPath}`)
  );
}

function sourceSurfaceInventory() {
  return sourceRoots
    .flatMap(walkFiles)
    .filter((file) => /\.(?:ts|tsx|js|jsx)$/u.test(file))
    .filter((file) => !nonProductSourcePattern.test(file))
    .flatMap((file) => {
      const source = readFileSync(path.join(repoRoot, file), "utf8");
      const svgOpenTags = Array.from(source.matchAll(/<svg\b[^>]*>/gu), (match) => match[0]);
      const inlineSvgCount = svgOpenTags.length;
      const canvasCount = countMatches(source, /<canvas\b/gu);
      const htmlFigureCount = countMatches(source, /<Figure\b/gu);
      const figureScrollCount = countMatches(source, /<FigureScroll\b/gu);
      if (inlineSvgCount === 0 && canvasCount === 0 && htmlFigureCount === 0 && figureScrollCount === 0) return [];
      const semanticSvgCount = svgOpenTags.filter((tag) => /\brole\s*=\s*["'](?:img|group)["']/u.test(tag)).length;
      const svgWithViewBoxCount = svgOpenTags.filter((tag) => /\bviewBox\s*=/u.test(tag)).length;
      const semanticSvgMissingViewBoxCount = svgOpenTags.filter((tag) =>
        /\brole\s*=\s*["'](?:img|group)["']/u.test(tag) && !/\bviewBox\s*=/u.test(tag)
      ).length;
      const semanticAngleTags = Array.from(source.matchAll(/<path\b(?=[^>]*\bdata-diagram-angle-arc\b)[^>]*>/gu), (match) => match[0]);
      return [{
        file,
        inlineSvgCount,
        svgWithViewBoxCount,
        semanticSvgCount,
        semanticSvgMissingViewBoxCount,
        canvasCount,
        htmlFigureCount,
        figureScrollCount,
        semanticAngleMarkCount: semanticAngleTags.length,
        mathAngleContractCount: semanticAngleTags.filter((tag) => /\bdata-math-angle-contract\b/u.test(tag)).length
      }];
    })
    .sort((first, second) => first.file.localeCompare(second.file));
}

function lessonRoutes() {
  const publisherByTopicId = new Map<string, TextbookPublisher>();
  const registerPublisher = (publisher: TextbookPublisher, seeds: ProductionLessonSeed[]) => {
    for (const seed of seeds) publisherByTopicId.set(seed.topicId, publisher);
  };
  registerPublisher("MAINLAND_BNU", [
    ...mainlandBnuPrimaryLessonSeeds,
    ...mainlandBnuJuniorLessonSeeds,
    ...mainlandBnuHighLessonSeeds
  ]);
  registerPublisher("MAINLAND_HJB", [
    ...mainlandHjbPrimaryLessonSeeds,
    ...mainlandHjbJuniorLessonSeeds,
    ...mainlandHjbHighLessonSeeds
  ]);
  registerPublisher("MAINLAND_PEP", [
    ...mainlandPepPrimaryLessonSeeds,
    ...mainlandPepJuniorLessonSeeds,
    ...mainlandPepHighLessonSeeds
  ]);
  registerPublisher("US_AR_MATH", usArkansasMiddleSchoolLessonSeeds);
  registerPublisher("US_CA_MATH", usCaliforniaLessonSeeds);
  registerPublisher("US_FL_MATH", usFloridaMiddleSchoolLessonSeeds);

  return liveProductionLessonSeeds.map((lesson) => {
    const interactiveLessonIds = lesson.blocks.flatMap((block) =>
      block.type === "interactive-lesson" && block.interactiveLessonConfig
        ? [block.interactiveLessonConfig.ccssLessonSlug]
        : []
    );
    const visualizationIds = lesson.blocks.flatMap((block) =>
      block.visualizationConfig ? [block.visualizationConfig.topicId] : []
    );
    return {
      topicId: lesson.topicId,
      route: lessonHrefForTopicId(lesson.topicId),
      publisher: publisherByTopicId.get(lesson.topicId) ?? "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY",
      blockCount: lesson.blocks.length,
      practiceQuestionCount: lesson.practiceQuestionIds?.length ?? 0,
      interactiveLessonIds,
      visualizationIds
    };
  }).sort((first, second) => first.topicId.localeCompare(second.topicId));
}

function ccssLessons(routeRows: ReturnType<typeof lessonRoutes>) {
  const topicIdsByLesson = new Map<string, string[]>();
  for (const route of routeRows) {
    for (const lessonId of route.interactiveLessonIds) {
      const topics = topicIdsByLesson.get(lessonId) ?? [];
      topics.push(route.topicId);
      topicIdsByLesson.set(lessonId, topics);
    }
  }

  return ccssTextbookLessonIds.map((lessonId) => {
    const sourceFile = `components/lesson/ccss/lessons/${lessonId}.tsx`;
    const source = readFileSync(path.join(repoRoot, sourceFile), "utf8");
    const meta = ccssTextbookLessons[lessonId];
    const buttonOpenTags = Array.from(source.matchAll(/<button\b[\s\S]*?>/gu), (match) => match[0]);
    const buttonControlJsxCount = buttonOpenTags.length;
    const missingExplicitButtonTypeCount = buttonOpenTags.filter((tag) =>
      !/\btype\s*=\s*["']button["']/u.test(tag)
    ).length;
    const rangeControlJsxCount = countMatches(source, /<input\b[\s\S]*?\btype\s*=\s*["']range["']/gu);
    const numberControlJsxCount = countMatches(source, /<input\b[\s\S]*?\btype\s*=\s*["']number["']/gu);
    const selectControlJsxCount = countMatches(source, /<select\b/gu);
    const declaredExceptionalStatePolicies = Array.from(
      source.matchAll(/\bdata-diagram-exception-policy\s*=\s*["']([^"']+)["']/gu),
      (match) => match[1]
    );
    const pointerControlJsxCount = countMatches(source, /\bonPointer(?:Down|Move|Up|Cancel)\s*=/gu);
    const contextMenuControlJsxCount = countMatches(source, /\bonContextMenu\s*=/gu);
    const randomSourceCount = countMatches(source, /\bMath\.random\s*\(/gu);
    const formElementCount = countMatches(source, /<form\b/gu);
    const sideEffectSignalCount = countMatches(
      source,
      /\b(?:fetch|localStorage\.(?:setItem|removeItem|clear)|sessionStorage\.(?:setItem|removeItem|clear)|location\.(?:assign|replace)|router\.(?:push|replace))\s*\(/gu
    );
    return {
      lessonId,
      sourceFile,
      grade: meta.grade,
      standardIds: meta.standardIds,
      parentTopicIds: (topicIdsByLesson.get(lessonId) ?? []).sort(),
      canonicalParentTopicId: (topicIdsByLesson.get(lessonId) ?? []).sort()[0] ?? null,
      liveMountCount: (topicIdsByLesson.get(lessonId) ?? []).length,
      inlineSvgCount: countMatches(source, /<svg\b/gu),
      canvasCount: countMatches(source, /<canvas\b/gu),
      figureCount: countMatches(source, /<Figure\b/gu),
      figureScrollCount: countMatches(source, /<FigureScroll\b/gu),
      buttonControlJsxCount,
      missingExplicitButtonTypeCount,
      rangeControlJsxCount,
      numberControlJsxCount,
      selectControlJsxCount,
      pointerControlJsxCount,
      contextMenuControlJsxCount,
      randomSourceCount,
      formElementCount,
      sideEffectSignalCount,
      exceptionalStatePolicies: [
        ...(randomSourceCount > 0 ? ["seeded-random-extremes"] : []),
        ...(pointerControlJsxCount > 0 ? ["svg-pointer-inset-grid"] : []),
        ...(contextMenuControlJsxCount > 0 ? ["context-menu-and-shift-click"] : []),
        ...(rangeControlJsxCount > 0 ? ["numeric-boundary-and-quartiles"] : []),
        ...declaredExceptionalStatePolicies
      ],
      stateProtocol: "finite-visible-button-state-graph-v2" as const
    };
  });
}

function standaloneDiagramRoutes() {
  return [
    {
      id: "california-middle-school-textbook",
      route: "/student/lessons/california-middle-school-textbook",
      surfaceType: "lesson" as const,
      publisher: "US_CA_MATH" as TextbookPublisher,
      // Since 2026-09-02 the route renders the interactive CCSS lesson bodies
      // (MAIS-authored chapter openers + ported lessons), not concept bitmaps.
      interaction: "interactive-ccss-lessons" as const
    },
    {
      id: "practice-adventure-ui-preview",
      route: "/practice/adventure-ui-preview",
      surfaceType: "practice" as const,
      publisher: null,
      interaction: "static-svg" as const
    },
    {
      id: "mistake-book-question-figure",
      route: "/mistake-book",
      surfaceType: "practice" as const,
      // The stored figure used by this audit belongs to the legacy HK question
      // catalog, so the audit identity must use an HK curriculum profile.
      publisher: "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY" as TextbookPublisher,
      interaction: "stored-question-figure" as const
    },
    {
      id: "stembench-euler-demo",
      route: "/visualization-lab/stembench-euler-demo",
      surfaceType: "visualization" as const,
      publisher: null,
      interaction: "drag-svg" as const
    }
  ];
}

function practiceFigures() {
  return questions.flatMap((question) => question.diagram ? [{
    questionId: question.id,
    topicId: question.topicId,
    grade: question.grade,
    curriculumTrack: question.curriculumTrack ?? "HK",
    publisher: question.publisher ?? (question.curriculumTrack === "US_CA_MATH" ? "US_CA_MATH" : "HK_UNITED_PRIME_MIA"),
    difficulty: question.difficulty,
    questionType: question.type,
    kind: question.diagram.kind
  }] : []).sort((first, second) => first.questionId.localeCompare(second.questionId));
}

function visualizationLabs() {
  return visualizationLabCatalog.map((lab) => {
    const declaresThreeD = lab.threeD?.enabled === true;
    const effectiveRenderer = lab.moduleId === "signature-lab"
      ? "signature-canvas" as const
      : declaresThreeD
        ? "three-r3f" as const
        : "configured-svg" as const;
    return {
      labId: lab.labId,
      topicId: lab.topicId,
      grade: lab.grade,
      curriculumTrack: lab.curriculumTrack,
      publisher: lab.publisher ?? null,
      moduleId: lab.moduleId,
      templateId: lab.templateId ?? null,
      signatureBenchIds: lab.moduleId === "signature-lab"
        ? (() => {
            const assignment = getSignatureLabAssignment(lab.topicId);
            return assignment ? [assignment.primary, ...(assignment.related ?? [])] : [];
          })()
        : [],
      declaresThreeD,
      effectiveRenderer,
      rendersThreeD: effectiveRenderer === "three-r3f",
      // Backward-compatible alias for existing consumers. Its precise meaning
      // is catalog declaration, not proof that the selected live renderer is WebGL.
      usesThreeD: declaresThreeD,
      route: `/student/tools/visualizations?grade=${lab.grade}&track=${lab.curriculumTrack}&lab=${encodeURIComponent(lab.labId)}`
    };
  }).sort((first, second) => first.labId.localeCompare(second.labId));
}

function signatureBenches() {
  const topicIdsByBench = new Map<string, string[]>();
  for (const [topicId, assignment] of Object.entries(signatureLabAssignments)) {
    for (const benchId of [assignment.primary, ...(assignment.related ?? [])]) {
      const topicIds = topicIdsByBench.get(benchId) ?? [];
      topicIds.push(topicId);
      topicIdsByBench.set(benchId, topicIds);
    }
  }

  return signatureLabIds.map((benchId) => ({
    benchId,
    sourceFile: `components/visualizations/signature/${benchId}.jsx`,
    assignedTopicIds: (topicIdsByBench.get(benchId) ?? []).sort(),
    liveStatus: topicIdsByBench.has(benchId) ? "reachable" as const : "ported-unassigned" as const
  }));
}

function publicSvgAssets(assetReferences: AssetReference[]) {
  const referenceCount = new Map<string, number>();
  for (const reference of assetReferences) {
    referenceCount.set(reference.assetPath, (referenceCount.get(reference.assetPath) ?? 0) + 1);
  }
  return walkFiles("public")
    .filter((file) => /\.svg$/iu.test(file))
    .map((file) => {
      const publicPath = `/${file.slice("public/".length)}`;
      const source = readFileSync(path.join(repoRoot, file), "utf8");
      const rootTag = source.match(/<svg\b[^>]*>/u)?.[0] ?? "";
      return {
        publicPath,
        liveManifestReferenceCount: referenceCount.get(publicPath) ?? 0,
        hasViewBox: /\bviewBox\s*=/u.test(rootTag),
        hasWidth: /\bwidth\s*=/u.test(rootTag),
        hasHeight: /\bheight\s*=/u.test(rootTag)
      };
    })
    .sort((first, second) => first.publicPath.localeCompare(second.publicPath));
}

export async function buildMathDiagramInventory() {
  const routeRows = lessonRoutes();
  const ccssRows = ccssLessons(routeRows);
  const practiceRows = practiceFigures();
  const labRows = visualizationLabs();
  const signatureBenchRows = signatureBenches();
  const assetReferences = await liveAssetReferences();
  const sourceSurfaces = sourceSurfaceInventory();
  const publicSvgs = publicSvgAssets(assetReferences);
  const standaloneRoutes = standaloneDiagramRoutes();
  const discoveredRowDigestSha256 = createHash("sha256").update(JSON.stringify({
    assetReferences,
    ccssRows,
    labRows,
    practiceRows,
    publicSvgs,
    routeRows,
    signatureBenchRows,
    sourceSurfaces,
    standaloneRoutes
  })).digest("hex");

  const inventory = {
    schemaVersion: 6,
    provenance: {
      contract: "math-diagram-source-graph-v1",
      discoveredRowDigestSha256,
      generator: "scripts/audit-math-diagram-inventory.ts",
      inputRoots: ["app", "components", "data", "public"]
    },
    lessonRoutes: routeRows,
    ccssLessons: ccssRows,
    practiceFigures: practiceRows,
    visualizationLabs: labRows,
    signatureBenches: signatureBenchRows,
    liveAssetReferences: assetReferences,
    publicSvgAssets: publicSvgs,
    standaloneDiagramRoutes: standaloneRoutes,
    sourceSurfaces,
    summary: {
      lessonRouteCount: routeRows.length,
      ccssLessonCount: ccssRows.length,
      ccssLessonsWithInlineSvg: ccssRows.filter((lesson) => lesson.inlineSvgCount > 0).length,
      ccssInlineSvgCount: ccssRows.reduce((sum, lesson) => sum + lesson.inlineSvgCount, 0),
      ccssButtonModuleCount: ccssRows.filter((lesson) => lesson.buttonControlJsxCount > 0).length,
      ccssButtonJsxCount: ccssRows.reduce((sum, lesson) => sum + lesson.buttonControlJsxCount, 0),
      ccssRangeModuleCount: ccssRows.filter((lesson) => lesson.rangeControlJsxCount > 0).length,
      ccssRangeJsxCount: ccssRows.reduce((sum, lesson) => sum + lesson.rangeControlJsxCount, 0),
      ccssNumberInputCount: ccssRows.reduce((sum, lesson) => sum + lesson.numberControlJsxCount, 0),
      ccssSelectInputCount: ccssRows.reduce((sum, lesson) => sum + lesson.selectControlJsxCount, 0),
      ccssButtonAndInlineSvgModuleCount: ccssRows.filter((lesson) =>
        lesson.inlineSvgCount > 0 && lesson.buttonControlJsxCount > 0
      ).length,
      ccssButtonAndInlineSvgJsxCount: ccssRows.reduce((sum, lesson) =>
        sum + (lesson.inlineSvgCount > 0 ? lesson.buttonControlJsxCount : 0), 0
      ),
      ccssRandomControlModuleCount: ccssRows.filter((lesson) => lesson.randomSourceCount > 0).length,
      ccssPointerControlModuleCount: ccssRows.filter((lesson) => lesson.pointerControlJsxCount > 0).length,
      ccssContextMenuControlNodeCount: ccssRows.reduce((sum, lesson) => sum + lesson.contextMenuControlJsxCount, 0),
      ccssUnsafeButtonTypeCount: ccssRows.reduce((sum, lesson) => sum + lesson.missingExplicitButtonTypeCount, 0),
      ccssControlSideEffectSignalCount: ccssRows.reduce((sum, lesson) => sum + lesson.sideEffectSignalCount, 0),
      practiceFigureCount: practiceRows.length,
      visualizationLabCount: labRows.length,
      configuredVisualizationLabCount: labRows.filter((lab) => lab.moduleId === "configured-visualization-lab").length,
      signatureVisualizationRouteCount: labRows.filter((lab) => lab.moduleId === "signature-lab").length,
      declaredThreeDVisualizationLabCount: labRows.filter((lab) => lab.declaresThreeD).length,
      effectiveThreeDVisualizationLabCount: labRows.filter((lab) => lab.rendersThreeD).length,
      declaredThreeDSignatureCanvasCount: labRows.filter((lab) =>
        lab.declaresThreeD && lab.effectiveRenderer === "signature-canvas"
      ).length,
      signatureBenchCount: signatureBenchRows.length,
      reachableSignatureBenchCount: signatureBenchRows.filter((bench) => bench.liveStatus === "reachable").length,
      unassignedSignatureBenchCount: signatureBenchRows.filter((bench) => bench.liveStatus === "ported-unassigned").length,
      liveAssetReferenceCount: assetReferences.length,
      uniqueLiveAssetCount: new Set(assetReferences.map((reference) => reference.assetPath)).size,
      publicSvgCount: publicSvgs.length,
      sourceSurfaceFileCount: sourceSurfaces.length,
      htmlOnlyFigureSourceFileCount: sourceSurfaces.filter((source) =>
        source.inlineSvgCount === 0 && source.canvasCount === 0 && (source.htmlFigureCount > 0 || source.figureScrollCount > 0)
      ).length,
      inlineSvgCount: sourceSurfaces.reduce((sum, source) => sum + source.inlineSvgCount, 0),
      canvasCount: sourceSurfaces.reduce((sum, source) => sum + source.canvasCount, 0),
      htmlFigureCount: sourceSurfaces.reduce((sum, source) => sum + source.htmlFigureCount, 0),
      figureScrollCount: sourceSurfaces.reduce((sum, source) => sum + source.figureScrollCount, 0),
      semanticAngleMarkCount: sourceSurfaces.reduce((sum, source) => sum + source.semanticAngleMarkCount, 0),
      mathAngleContractCount: sourceSurfaces.reduce((sum, source) => sum + source.mathAngleContractCount, 0),
      standaloneDiagramRouteCount: standaloneRoutes.length,
      semanticSvgMissingViewBoxCount: sourceSurfaces.reduce((sum, source) => sum + source.semanticSvgMissingViewBoxCount, 0)
    }
  };

  const failures: string[] = [];
  const minimumCoverageBaselines = {
    lessonRouteCount: 490,
    ccssLessonCount: 270,
    ccssLessonsWithInlineSvg: 127,
    ccssInlineSvgCount: 132,
    ccssButtonModuleCount: 244,
    ccssButtonJsxCount: 531,
    ccssRangeModuleCount: 38,
    ccssRangeJsxCount: 40,
    practiceFigureCount: 27,
    visualizationLabCount: 689,
    configuredVisualizationLabCount: 613,
    signatureVisualizationRouteCount: 76,
    declaredThreeDVisualizationLabCount: 90,
    effectiveThreeDVisualizationLabCount: 78,
    declaredThreeDSignatureCanvasCount: 12,
    signatureBenchCount: 192,
    reachableSignatureBenchCount: 188,
    liveAssetReferenceCount: 299,
    uniqueLiveAssetCount: 239,
    publicSvgCount: 53,
    sourceSurfaceFileCount: 523,
    htmlOnlyFigureSourceFileCount: 143,
    inlineSvgCount: 302,
    canvasCount: 208,
    htmlFigureCount: 270,
    figureScrollCount: 27,
    semanticAngleMarkCount: 16,
    mathAngleContractCount: 16,
    standaloneDiagramRouteCount: 4
  } as const;
  for (const [key, minimum] of Object.entries(minimumCoverageBaselines) as Array<
    [keyof typeof inventory.summary, number]
  >) {
    const actual = inventory.summary[key];
    if (actual < minimum) {
      failures.push(`inventory coverage ${key} shrank below reviewed baseline ${minimum}: ${actual}`);
    }
  }
  const duplicate = (values: string[]) => values.find((value, index) => values.indexOf(value) !== index);
  const duplicateLesson = duplicate(routeRows.map((row) => row.topicId));
  const duplicateCcss = duplicate(ccssRows.map((row) => row.lessonId));
  const duplicateQuestion = duplicate(practiceRows.map((row) => row.questionId));
  const duplicateLab = duplicate(labRows.map((row) => row.labId));
  if (duplicateLesson) failures.push(`duplicate live lesson topicId: ${duplicateLesson}`);
  if (duplicateCcss) failures.push(`duplicate CCSS lessonId: ${duplicateCcss}`);
  if (duplicateQuestion) failures.push(`duplicate practice question diagram id: ${duplicateQuestion}`);
  if (duplicateLab) failures.push(`duplicate visualization labId: ${duplicateLab}`);
  const unassignedCcss = ccssRows.filter((row) => row.parentTopicIds.length === 0).map((row) => row.lessonId);
  if (unassignedCcss.length) failures.push(`${unassignedCcss.length} CCSS lessons have no live parent route: ${unassignedCcss.join(", ")}`);
  const missingAssets = assetReferences.filter((reference) => !existsSync(path.join(publicDir, reference.assetPath.slice(1))));
  if (missingAssets.length) failures.push(`${missingAssets.length} live illustration references are missing files`);
  const semanticSvgWithoutViewBox = sourceSurfaces.filter((source) => source.semanticSvgMissingViewBoxCount > 0);
  if (semanticSvgWithoutViewBox.length) failures.push(`${semanticSvgWithoutViewBox.length} source files have semantic SVGs without a viewBox`);
  const publicSvgWithoutViewBox = publicSvgs.filter((asset) => !asset.hasViewBox);
  if (publicSvgWithoutViewBox.length) failures.push(`${publicSvgWithoutViewBox.length} public SVG assets have no viewBox`);
  const angleContractGaps = sourceSurfaces.filter((source) => source.semanticAngleMarkCount !== source.mathAngleContractCount);
  if (angleContractGaps.length) {
    failures.push(`${angleContractGaps.length} source files have semantic angle marks without machine-readable contracts`);
  }
  const unsafeButtonModules = ccssRows.filter((row) => row.missingExplicitButtonTypeCount > 0);
  if (unsafeButtonModules.length) {
    failures.push(`${unsafeButtonModules.length} CCSS lessons have buttons without explicit type=button`);
  }
  const buttonInsideFormModules = ccssRows.filter((row) => row.buttonControlJsxCount > 0 && row.formElementCount > 0);
  if (buttonInsideFormModules.length) {
    failures.push(`${buttonInsideFormModules.length} CCSS lessons mix diagram controls with form elements`);
  }
  const sideEffectingControlModules = ccssRows.filter((row) => row.sideEffectSignalCount > 0);
  if (sideEffectingControlModules.length) {
    failures.push(`${sideEffectingControlModules.length} CCSS lessons have unapproved external state side-effect signals`);
  }
  const unclassifiedExceptionalControls = ccssRows.filter((row) =>
    (row.randomSourceCount > 0 && !row.exceptionalStatePolicies.includes("seeded-random-extremes")) ||
    (row.pointerControlJsxCount > 0 && !row.exceptionalStatePolicies.includes("svg-pointer-inset-grid")) ||
    (row.contextMenuControlJsxCount > 0 && !row.exceptionalStatePolicies.includes("context-menu-and-shift-click")) ||
    (row.rangeControlJsxCount > 0 && !row.exceptionalStatePolicies.includes("numeric-boundary-and-quartiles")) ||
    ((row.numberControlJsxCount > 0 || row.selectControlJsxCount > 0) &&
      !row.exceptionalStatePolicies.includes("metric-conversion-finite-number-and-unit-cross-product-v1"))
  );
  if (unclassifiedExceptionalControls.length) {
    failures.push(`${unclassifiedExceptionalControls.length} CCSS lessons have exceptional controls without an audit policy`);
  }
  const metricPolicyRows = ccssRows.filter((row) =>
    row.exceptionalStatePolicies.includes("metric-conversion-finite-number-and-unit-cross-product-v1")
  );
  if (metricPolicyRows.length !== 1 || metricPolicyRows[0]?.lessonId !== "metric-conversion" ||
    metricPolicyRows[0]?.numberControlJsxCount !== 1 || metricPolicyRows[0]?.selectControlJsxCount !== 2) {
    failures.push(
      "metric-conversion finite-number policy must belong to exactly one lesson with one number input and two selects"
    );
  }

  return { inventory, failures };
}

function compactSummary(summary: Record<string, number>) {
  return Object.entries(summary).map(([key, value]) => `  ${key}: ${value}`).join("\n");
}

async function main() {
  const { inventory, failures } = await buildMathDiagramInventory();
  const outputIndex = process.argv.indexOf("--output");
  const outputPath = outputIndex >= 0 ? process.argv[outputIndex + 1] : undefined;
  const serialized = `${JSON.stringify({ ...inventory, failures } satisfies JsonValue, null, 2)}\n`;
  if (outputPath) {
    const absoluteOutput = path.resolve(repoRoot, outputPath);
    mkdirSync(path.dirname(absoluteOutput), { recursive: true });
    writeFileSync(absoluteOutput, serialized, "utf8");
  }
  if (process.argv.includes("--json")) {
    process.stdout.write(serialized);
  } else {
    console.log("audit:math-diagram-inventory");
    console.log(compactSummary(inventory.summary));
    if (failures.length) {
      console.error("\nFAIL");
      for (const failure of failures) console.error(`  - ${failure}`);
    } else {
      console.log(
        `\nPASS: every live inventoried surface has a reachable owner and required source/viewBox contract; ` +
        `${inventory.summary.unassignedSignatureBenchCount} ported non-live signature benches remain intentionally unassigned`
      );
    }
  }
  process.exitCode = failures.length ? 1 : 0;
}

const invokedScript = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedScript === path.join(repoRoot, "scripts/audit-math-diagram-inventory.ts")) {
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
  });
}
