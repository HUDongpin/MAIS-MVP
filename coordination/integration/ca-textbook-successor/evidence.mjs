import {
  SLUGS,
  ROUTES,
  ROLES,
  LESSON_ROOT,
  OLD_ASSETS,
  topicFor,
} from "./constants.mjs";
import { need, same, digest, hash, time, unique } from "./common.mjs";
import { validateSchema } from "./schema.mjs";
export const NEGATIVES = [
  "candidate-id-drift",
  "candidate-bytes",
  "other-registry-drift",
  "stale-qa",
  "wrong-parent",
  "future-receipt",
  "unsafe-side-effects",
  "forged-finalization",
];
export function validateEvidence(
  e,
  m,
  c,
  dispositionDigest,
  historyDigest,
  releaseTime,
  evidenceTime,
) {
  validateSchema("evidence", e);
  validateSchema(e.role, e.details);
  need(
    e.sourceCommit === m.sourceCommit &&
      e.sourceTree === m.sourceTree &&
      e.checkerReleaseCommit === m.checkerReleaseCommit &&
      e.candidateDigest === digest(c),
    "CA_EVIDENCE_BINDING",
  );
  const t = time(e.reviewedAt);
  need(
    t >= releaseTime && Math.floor(t / 1000) <= Math.floor(evidenceTime / 1000),
    "CA_EVIDENCE_TIME",
  );
  const independent = ["A18", "A11", "A23"].includes(e.role);
  need(
    e.reviewer.independence ===
      (independent ? "independent-review" : "coordinator-execution"),
    "CA_INDEPENDENCE",
  );
  need(
    !independent || !m.sourceAuthors.includes(e.reviewer.sessionId),
    "CA_AUTHOR_REVIEW",
  );
  const d = e.details;
  if (e.role === "A18") {
    same(d.slugs, SLUGS, "CA_QA_SCOPE");
    need(d.checksDigest === c.checksDigest, "CA_QA_SCOPE");
  }
  if (e.role === "A05") {
    need(d.mappingsDigest === digest(c.mappings), "CA_ROUTE_SCOPE");
    same(d.routeFiles, ROUTES, "CA_ROUTE_SCOPE");
  }
  if (e.role === "A24") {
    need(
      d.assetsDigest === digest(c.assets) &&
        d.figureFileDigest ===
          digest(
            c.files.filter(
              (f) => f.path.startsWith(LESSON_ROOT) && f.path.endsWith(".tsx"),
            ),
          ),
      "CA_FIGURE_SCOPE",
    );
  }
  if (e.role === "A11") {
    unique(d.negativeCases);
    need(
      NEGATIVES.every((x) => d.negativeCases.includes(x)),
      "CA_NEGATIVE_COVERAGE",
    );
  }
  if (e.role === "A23")
    need(d.dispositionDigest === dispositionDigest, "CA_DISPOSITION_EVIDENCE");
  if (e.role === "A22") need(d.sourceTree === m.sourceTree, "CA_BUILD");
  if (e.role === "A25")
    need(
      d.sourceInventoryDigest === m.sourceInventoryDigest &&
        d.historyDigest === historyDigest,
      "CA_CUSTODY",
    );
  return e;
}
export const BASELINE_FAILURES = Object.freeze([
  "inventory coverage lessonRouteCount shrank below reviewed baseline 490: 251",
  "inventory coverage practiceFigureCount shrank below reviewed baseline 27: 26",
  "inventory coverage visualizationLabCount shrank below reviewed baseline 689: 446",
  "inventory coverage configuredVisualizationLabCount shrank below reviewed baseline 613: 367",
  "inventory coverage signatureVisualizationRouteCount shrank below reviewed baseline 76: 64",
  "inventory coverage declaredThreeDVisualizationLabCount shrank below reviewed baseline 90: 52",
  "inventory coverage effectiveThreeDVisualizationLabCount shrank below reviewed baseline 78: 52",
  "inventory coverage declaredThreeDSignatureCanvasCount shrank below reviewed baseline 12: 0",
]);
export function inventoryRowsDigest(v) {
  return hash(
    Buffer.from(
      JSON.stringify({
        assetReferences: v.liveAssetReferences,
        ccssRows: v.ccssLessons,
        labRows: v.visualizationLabs,
        practiceRows: v.practiceFigures,
        publicSvgs: v.publicSvgAssets,
        routeRows: v.lessonRoutes,
        signatureBenchRows: v.signatureBenches,
        sourceSurfaces: v.sourceSurfaces,
        standaloneRoutes: v.standaloneDiagramRoutes,
      }),
    ),
  );
}
export function validateInventoryCoverage(before, after) {
  const groups = {
    lessonRoutes: "topicId",
    ccssLessons: "lessonId",
    practiceFigures: "questionId",
    visualizationLabs: "labId",
    signatureBenches: "benchId",
    publicSvgAssets: "publicPath",
    standaloneDiagramRoutes: "id",
    sourceSurfaces: "file",
  };
  for (const report of [before, after]) {
    need(
      report?.schemaVersion === 6 &&
        report?.summary &&
        Array.isArray(report.failures),
      "CA_ASSET_INVENTORY",
    );
    need(
      report.provenance?.contract === "math-diagram-source-graph-v1" &&
        report.provenance.generator ===
          "scripts/audit-math-diagram-inventory.ts",
      "CA_INVENTORY_PROVENANCE",
    );
    same(
      report.provenance.inputRoots,
      ["app", "components", "data", "public"],
      "CA_INVENTORY_PROVENANCE",
    );
    for (const [group, key] of Object.entries(groups)) {
      need(Array.isArray(report[group]), "CA_INVENTORY_ROWS");
      unique(report[group].map((row) => row[key]));
    }
    need(Array.isArray(report.liveAssetReferences), "CA_INVENTORY_ROWS");
    need(
      report.provenance.discoveredRowDigestSha256 ===
        inventoryRowsDigest(report),
      "CA_INVENTORY_DIGEST",
    );
    need(
      report.summary.liveAssetReferenceCount ===
        report.liveAssetReferences.length &&
        report.summary.uniqueLiveAssetCount ===
          new Set(report.liveAssetReferences.map((row) => row.assetPath))
            .size &&
        report.summary.ccssLessonCount === report.ccssLessons.length,
      "CA_INVENTORY_COUNT",
    );
  }
  same(before.failures, BASELINE_FAILURES, "CA_BASELINE_FAILURE_DRIFT");
  const additions = [
    "inventory coverage liveAssetReferenceCount shrank below reviewed baseline 299: 284",
    "inventory coverage uniqueLiveAssetCount shrank below reviewed baseline 239: 224",
  ];
  same(
    after.failures,
    [...BASELINE_FAILURES, ...additions],
    "CA_BASELINE_FAILURE_DRIFT",
  );
  same(
    [
      before.summary.liveAssetReferenceCount,
      before.summary.uniqueLiveAssetCount,
      after.summary.liveAssetReferenceCount,
      after.summary.uniqueLiveAssetCount,
    ],
    [299, 239, 284, 224],
    "CA_RETIRED_ASSET_COUNT",
  );
  const retired = before.liveAssetReferences.filter((row) =>
    OLD_ASSETS.includes("public" + row.assetPath),
  );
  same(
    retired.map((row) => "public" + row.assetPath).sort(),
    [...OLD_ASSETS].sort(),
    "CA_RETIRED_ASSET_SCOPE",
  );
  same(
    after.liveAssetReferences,
    before.liveAssetReferences.filter(
      (row) => !OLD_ASSETS.includes("public" + row.assetPath),
    ),
    "CA_OTHER_ASSET_DRIFT",
  );
  for (const group of [
    "practiceFigures",
    "visualizationLabs",
    "signatureBenches",
    "publicSvgAssets",
  ])
    same(after[group], before[group], "CA_OTHER_INVENTORY_DRIFT");
  const newLessons = after.ccssLessons.filter(
    (row) => !before.ccssLessons.some((old) => old.lessonId === row.lessonId),
  );
  same(
    newLessons.map((row) => row.lessonId).sort(),
    SLUGS,
    "CA_INVENTORY_NEW_LESSONS",
  );
  for (const old of before.ccssLessons)
    same(
      after.ccssLessons.find((row) => row.lessonId === old.lessonId),
      old,
      "CA_OLD_LESSON_DRIFT",
    );
  for (const row of newLessons)
    need(
      row.sourceFile === LESSON_ROOT + "/" + row.lessonId + ".tsx" &&
        row.liveMountCount >= 1 &&
        row.inlineSvgCount >= 1 &&
        row.missingExplicitButtonTypeCount === 0 &&
        row.sideEffectSignalCount === 0,
      "CA_NEW_LESSON_INVENTORY",
    );
  const topics = SLUGS.map(topicFor);
  same(
    after.lessonRoutes.map((row) => row.topicId),
    before.lessonRoutes.map((row) => row.topicId),
    "CA_ROUTE_INVENTORY",
  );
  for (const old of before.lessonRoutes)
    if (!topics.includes(old.topicId))
      same(
        after.lessonRoutes.find((row) => row.topicId === old.topicId),
        old,
        "CA_OTHER_ROUTE_DRIFT",
      );
  for (const slug of SLUGS) {
    const row = after.lessonRoutes.find(
      (row) => row.topicId === topicFor(slug),
    );
    need(
      row?.interactiveLessonIds.includes(slug),
      "CA_PRIMARY_ROUTE_INVENTORY",
    );
  }
  for (const old of before.sourceSurfaces)
    same(
      after.sourceSurfaces.find((row) => row.file === old.file),
      old,
      "CA_OTHER_SURFACE_DRIFT",
    );
  same(
    after.sourceSurfaces
      .filter(
        (row) => !before.sourceSurfaces.some((old) => old.file === row.file),
      )
      .map((row) => row.file)
      .sort(),
    SLUGS.map((slug) => LESSON_ROOT + "/" + slug + ".tsx"),
    "CA_NEW_SURFACE_SCOPE",
  );
  same(
    after.standaloneDiagramRoutes,
    before.standaloneDiagramRoutes.map((row) =>
      row.id === "california-middle-school-textbook"
        ? { ...row, interaction: "interactive-ccss-lessons" }
        : row,
    ),
    "CA_STANDALONE_SCOPE",
  );
  return {
    baselineFailures: before.failures,
    remainingFailures: after.failures,
    globalInventoryPassed: false,
    retiredReferences: 15,
    retainedOtherReferences: 284,
    newLessons: 35,
  };
}
