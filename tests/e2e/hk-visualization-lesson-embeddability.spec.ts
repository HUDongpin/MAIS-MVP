import { expect, test, type Browser, type BrowserContext, type Locator, type Page, type Request, type TestInfo } from "@playwright/test";
import { readFile } from "node:fs/promises";
import {
  isHKDedicatedLabId,
  isHKPassThroughLabId
} from "../../components/visualizations/hk/hkVisualizationLabRegistry";
import { HK_VISUALIZATION_LESSON_CONTRACTS } from "../../components/visualizations/hk/hkVisualizationLessonContracts";
import { loginAsDemoStudentApi } from "./helpers";
import {
  hkVisualizationSurfaceEvidenceIssues,
  installHkVisualizationEffectiveVisibilityInspector,
  scanHkVisualizationCollisions,
  scanHkVisualizationLayout
} from "./hk-visualization-machine-acceptance-helpers";
import {
  assertHkVisualizationLessonSourceContract,
  buildHkVisualizationLessonGradePackages,
  buildHkVisualizationLessonSourceManifest,
  hkVisualizationVisibilityBlockers,
  HK_VISUALIZATION_LESSON_EXPECTED_COUNT,
  resolveHkVisualizationLessonBrowserOptions,
  type HkVisualizationVisibilityNode,
  type HkVisualizationLessonGradePackage,
  type HkVisualizationLessonSourceRow
} from "./hk-visualization-lesson-embeddability-helpers";
import {
  describeHkVisualizationRenderOnlyWrite,
  hkVisualizationLearningEventFixture
} from "./hk-visualization-state-isolation-helpers";

const canonicalProject = "desktop-chrome";
const lessonBrowserOptions = resolveHkVisualizationLessonBrowserOptions();
const { fullBrowserRequested } = lessonBrowserOptions;
const sourceManifest = buildHkVisualizationLessonSourceManifest();
const gradePackages = buildHkVisualizationLessonGradePackages(sourceManifest);
const executedLessonPackageIds: string[] = [];
const executedLessonCellIds: string[] = [];

const lessonViewports = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 }
} as const;

type LessonViewportId = keyof typeof lessonViewports;

type LessonEmbeddabilityFailure = {
  code: string;
  details?: unknown;
  message: string;
  phase: string;
  selector?: string;
};

type LessonEmbeddabilityCellResult = {
  actualFinalUrl: string | null;
  cellId: string;
  contract: {
    activeLabExact: boolean;
    collisionCount: number;
    controlCount: number;
    dedicatedOrPassThroughRenderer: boolean;
    documentClientWidth: number | null;
    documentScrollWidth: number | null;
    lessonContentVisible: boolean;
    lessonEntryVisible: boolean;
    lessonSectionVisible: boolean;
    minimumTarget44: boolean;
    pageExitFlushObserved: boolean;
    renderOnlyNoWrite: boolean;
    resetVisibleAndActionable: boolean;
    sourceBindingExact: boolean;
    stateSummaryVisible: boolean;
    surfaceVisible: boolean;
  };
  expectedRenderer: HkVisualizationLessonSourceRow["expectedRenderer"];
  failures: LessonEmbeddabilityFailure[];
  grade: string;
  labId: string;
  lessonSlug: string;
  route: string;
  renderOnlyWriteRequests: string[];
  status: "failed" | "passed";
  viewport: { height: number; id: LessonViewportId; width: number };
};

type LessonEmbeddabilityPackageEvidence = {
  cells: LessonEmbeddabilityCellResult[];
  package: {
    duplicateCellIds: string[];
    executedCellIds: string[];
    grade: HkVisualizationLessonGradePackage["grade"];
    id: string;
    missingCellIds: string[];
    plannedCellIds: string[];
    viewportId: LessonViewportId;
  };
  run: {
    allowPartial: boolean;
    baseURL: string;
    endedAt: string;
    fullBrowserRequested: boolean;
    releaseAcceptance: boolean;
    startedAt: string;
  };
  sourceContract: HkVisualizationLessonSourceRow[];
  status: "failed" | "passed";
  summary: {
    executedCellCount: number;
    failedCellCount: number;
    missingCellCount: number;
    passedCellCount: number;
    plannedCellCount: number;
  };
};

const interactiveControlSelector = [
  "button",
  "a[href]",
  "input:not([type=hidden])",
  "select",
  "textarea",
  "[role=button]",
  "[role=slider]"
].join(",");

test.describe("HK lesson Visualization Lab embeddability", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(
      testInfo.project.name !== canonicalProject,
      `This suite owns its browser viewports and runs only in ${canonicalProject}.`
    );
  });

  test.afterAll(async ({}, testInfo) => {
    if (testInfo.project.name !== canonicalProject || !fullBrowserRequested) return;

    const plannedPackageIds = (Object.keys(lessonViewports) as LessonViewportId[]).flatMap(
      (viewportId) => gradePackages.map(
        (gradePackage) => `hk-viz-lesson-${viewportId}-${gradePackage.grade.toLowerCase()}`
      )
    );
    const plannedCellIds = (Object.keys(lessonViewports) as LessonViewportId[]).flatMap(
      (viewportId) => gradePackages.flatMap(
        (gradePackage) => gradePackage.rows.map((row) => lessonCellId(row, viewportId))
      )
    );
    const executedPackageIdSet = new Set(executedLessonPackageIds);
    const executedCellIdSet = new Set(executedLessonCellIds);
    const duplicatePackageIds = duplicateValues(executedLessonPackageIds);
    const duplicateCellIds = duplicateValues(executedLessonCellIds);
    const unexpectedPackageIds = executedLessonPackageIds.filter(
      (packageId) => !plannedPackageIds.includes(packageId)
    );
    const unexpectedCellIds = executedLessonCellIds.filter((cellId) => !plannedCellIds.includes(cellId));

    await testInfo.attach("hk-visualization-lesson-run-execution-ledger.json", {
      body: JSON.stringify({
        releaseAcceptance: lessonBrowserOptions.releaseAcceptance,
        plannedPackageCount: plannedPackageIds.length,
        executedPackageCount: executedLessonPackageIds.length,
        uniqueExecutedPackageCount: executedPackageIdSet.size,
        missingPackageIds: plannedPackageIds.filter((packageId) => !executedPackageIdSet.has(packageId)),
        unexpectedPackageIds,
        duplicatePackageIds,
        plannedCellCount: plannedCellIds.length,
        executedCellCount: executedLessonCellIds.length,
        uniqueExecutedCellCount: executedCellIdSet.size,
        missingCellIds: plannedCellIds.filter((cellId) => !executedCellIdSet.has(cellId)),
        unexpectedCellIds,
        duplicateCellIds
      }, null, 2),
      contentType: "application/json"
    });

    expect(
      executedLessonPackageIds,
      "The LessonView run-level ledger must include all 24 viewport/grade packages; filtered, sharded, retried-only, or interrupted runs are not full acceptance evidence."
    ).toEqual(plannedPackageIds);
    expect(duplicatePackageIds, "No LessonView package may execute twice.").toEqual([]);
    expect(unexpectedPackageIds, "No unplanned LessonView package may execute.").toEqual([]);
    expect(
      executedLessonCellIds,
      "The LessonView run-level ledger must include all 102 planned route/viewport cells in order."
    ).toEqual(plannedCellIds);
    expect(duplicateCellIds, "No LessonView route/viewport cell may execute twice.").toEqual([]);
    expect(unexpectedCellIds, "No unplanned LessonView route/viewport cell may execute.").toEqual([]);
  });

  test("source manifest hard-gates one exact embedded lesson for all 51 registry ids", async ({}, testInfo) => {
    expect(sourceManifest.rows).toHaveLength(HK_VISUALIZATION_LESSON_EXPECTED_COUNT);
    expect(sourceManifest.ledger.plannedCellIds).toHaveLength(HK_VISUALIZATION_LESSON_EXPECTED_COUNT);
    expect(sourceManifest.ledger.executedCellIds).toEqual(sourceManifest.ledger.plannedCellIds);
    expect(sourceManifest.ledger.missingCellIds).toEqual([]);
    expect(sourceManifest.ledger.duplicateCellIds).toEqual([]);
    const packagedLabIds = gradePackages.flatMap(
      (gradePackage) => gradePackage.rows.map((row) => row.labId)
    );
    expect(packagedLabIds).toHaveLength(HK_VISUALIZATION_LESSON_EXPECTED_COUNT);
    expect(new Set(packagedLabIds).size).toBe(HK_VISUALIZATION_LESSON_EXPECTED_COUNT);
    expect([...packagedLabIds].sort()).toEqual(
      sourceManifest.rows.map((row) => row.labId).sort()
    );
    expect(sourceManifest.contract.quadraticRouteExact).toBe(true);
    for (const row of sourceManifest.rows) {
      expect(row.moduleId).toBe("configured-visualization-lab");
      expect(row.topicId).toBe(row.labId);
      expect(row.stateSelector).not.toBe("");
      expect(row.resetSelector).toContain('[data-viz-reset-module-id="configured-visualization-lab"]');
      expect(row.resetSelector).toContain(`[data-viz-reset-topic-id="${row.labId}"]`);
    }
    expect(sourceManifest.rows.find((row) => row.labId === "quadratic-patterns")).toMatchObject({
      lessonSlug: "quadratic-functions",
      route: "/student/lessons/quadratic-functions",
      resolvedLessonSlug: "quadratic-functions"
    });

    await testInfo.attach("hk-visualization-lesson-source-manifest.json", {
      body: JSON.stringify(sourceManifest, null, 2),
      contentType: "application/json"
    });
    await testInfo.attach("hk-visualization-lesson-grade-packages.json", {
      body: JSON.stringify({
        packages: gradePackages.map((gradePackage) => ({
          grade: gradePackage.grade,
          id: gradePackage.id,
          plannedLabIds: gradePackage.rows.map((row) => row.labId),
          plannedRoutes: gradePackage.rows.map((row) => row.route)
        })),
        schemaVersion: "hk-viz-lesson-grade-packages.v1"
      }, null, 2),
      contentType: "application/json"
    });

    // This is deliberately a hard failure while A18/A05 wiring is incomplete.
    // Missing topics, lessons, or visualization bindings are never converted to
    // skips merely so the browser sweep can appear green.
    assertHkVisualizationLessonSourceContract(sourceManifest);
  });

  test("lesson browser option resolver defaults to full and rejects partial false-passes", async () => {
    expect(resolveHkVisualizationLessonBrowserOptions({})).toEqual({
      allowPartial: false,
      fullBrowserRequested: true,
      releaseAcceptance: true
    });
    expect(resolveHkVisualizationLessonBrowserOptions({
      HK_VIZ_ALLOW_PARTIAL: "1",
      HK_VIZ_LESSON_FULL: "0"
    })).toEqual({
      allowPartial: true,
      fullBrowserRequested: false,
      releaseAcceptance: false
    });
    expect(() => resolveHkVisualizationLessonBrowserOptions({ HK_VIZ_LESSON_FULL: "0" }))
      .toThrow(/requires HK_VIZ_ALLOW_PARTIAL=1/);
    expect(() => resolveHkVisualizationLessonBrowserOptions({ HK_VIZ_ALLOW_PARTIAL: "true" }))
      .toThrow(/must be exactly 0 or 1/);
    expect(() => resolveHkVisualizationLessonBrowserOptions({ HK_VIZ_LESSON_FULL: "flase" }))
      .toThrow(/must be exactly 0 or 1/);

    expect(describeHkVisualizationRenderOnlyWrite("POST", "/api/lesson-progress", "{}")).toBeNull();
    expect(describeHkVisualizationRenderOnlyWrite("PATCH", "/api/profile", "{}")).toBeNull();
    expect(describeHkVisualizationRenderOnlyWrite("POST", "/api/learning-events", JSON.stringify({
      events: [
        hkVisualizationLearningEventFixture("page-view", 1),
        hkVisualizationLearningEventFixture("mistake-review", 2)
      ]
    }))).toBeNull();
    expect(describeHkVisualizationRenderOnlyWrite("POST", "/api/visualization-sessions", "{}"))
      .toBe("POST /api/visualization-sessions");
    expect(describeHkVisualizationRenderOnlyWrite("POST", "/api/learning-events", JSON.stringify({
      events: [
        hkVisualizationLearningEventFixture("page-view", 3),
        hkVisualizationLearningEventFixture("visualization-probe", 4)
      ]
    }))).toContain("visualization-event-types=[visualization-probe]");
    expect(describeHkVisualizationRenderOnlyWrite("POST", "/api/learning-events", JSON.stringify({
      events: [{ type: "page-view" }]
    }))).toContain("unparseable-learning-events-payload");
    expect(describeHkVisualizationRenderOnlyWrite("POST", "/api/learning-events", "{bad-json"))
      .toContain("unparseable-learning-events-payload");
    expect(describeHkVisualizationRenderOnlyWrite("POST", "/api/rewards/redeem", "{}"))
      .toBe("POST /api/rewards/redeem");
    expect(describeHkVisualizationRenderOnlyWrite("POST", "/api/gamification/award", "{}"))
      .toBe("POST /api/gamification/award");
  });

  test("visibility-chain helper rejects hidden, inert, aria-hidden, and transparent ancestors", async () => {
    const visibleNode = {
      ariaHidden: false,
      contentVisibility: "visible",
      display: "block",
      hidden: false,
      inert: false,
      opacity: 1,
      visibility: "visible"
    } satisfies HkVisualizationVisibilityNode;
    expect(hkVisualizationVisibilityBlockers([])).toEqual(["missing-visibility-chain"]);
    expect(hkVisualizationVisibilityBlockers([visibleNode, visibleNode])).toEqual([]);
    expect(hkVisualizationVisibilityBlockers([
      visibleNode,
      { ...visibleNode, opacity: 0 }
    ])).toContain("ancestor-1:opacity-0");
    expect(hkVisualizationVisibilityBlockers([
      visibleNode,
      { ...visibleNode, display: "none", hidden: true }
    ])).toEqual(expect.arrayContaining(["ancestor-1:hidden", "ancestor-1:display-none"]));
    expect(hkVisualizationVisibilityBlockers([
      { ...visibleNode, ariaHidden: true },
      { ...visibleNode, inert: true }
    ])).toEqual(expect.arrayContaining(["self:aria-hidden", "ancestor-1:inert"]));
    expect(hkVisualizationVisibilityBlockers([
      visibleNode,
      { ...visibleNode, contentVisibility: "hidden", visibility: "collapse" }
    ])).toEqual(expect.arrayContaining([
      "ancestor-1:content-visibility-hidden",
      "ancestor-1:visibility-collapse"
    ]));
    expect(hkVisualizationVisibilityBlockers([
      visibleNode,
      ...Array.from({ length: 7 }, () => ({ ...visibleNode, opacity: 0.5 }))
    ])).toContain("effective-opacity-0.0078125");
  });

  test("source guard keeps local visibility paths ancestor-aware and reuses the hardened machine scanners", async () => {
    const [lessonSource, stateSource] = await Promise.all([
      readFile("tests/e2e/hk-visualization-lesson-embeddability.spec.ts", "utf8"),
      readFile("tests/e2e/hk-visualization-state-isolation.spec.ts", "utf8")
    ]);
    const implementationMarker = ["const learnerVisible", "ThroughAncestors ="].join("");
    const parentTraversalMarker = ["cursor = cursor", ".parentElement;"].join("");
    const predicatePattern = new RegExp(
      `${implementationMarker}[\\s\\S]*?return effectiveOpacity > 0\\.01;\\s*};`,
      "g"
    );
    const predicateBlocks = lessonSource.match(predicatePattern) ?? [];
    expect(predicateBlocks).toHaveLength(2);
    const predicateTokens = [
      ["hasAttribute(", '"hidden"', ")"].join(""),
      ["hasAttribute(", '"inert"', ")"].join(""),
      ["getAttribute(", '"aria-hidden"', ")"].join(""),
      ["style.", "display === ", '"none"'].join(""),
      ["style.", "visibility === ", '"hidden"'].join(""),
      ["style.", "visibility === ", '"collapse"'].join(""),
      ["style.", "contentVisibility"].join(""),
      ["Number.parseFloat(style.", "opacity)"].join(""),
      ["let effective", "Opacity = 1;"].join(""),
      ["effective", "Opacity *= Math.min(1, Math.max(0, opacity));"].join(""),
      ["return effective", "Opacity > 0.01;"].join(""),
      parentTraversalMarker
    ];
    for (const predicateBlock of predicateBlocks) {
      for (const token of predicateTokens) expect(predicateBlock).toContain(token);
    }
    for (const sharedScannerToken of [
      "installHkVisualizationEffectiveVisibilityInspector(page)",
      "scanHkVisualizationLayout(workspace, \"lesson-embeddability\")",
      "scanHkVisualizationCollisions(workspace, \"lesson-embeddability\")",
      "hkVisualizationSurfaceEvidenceIssues(snapshot)"
    ]) {
      expect(lessonSource).toContain(sharedScannerToken);
    }

    const locatorStartMarker = ["async function expectPerceptibly", "Visible("].join("");
    const lessonEndMarker = ["async function audit", "Layout("].join("");
    const stateEndMarker = ["async function response", "Json("].join("");
    const sourceBetween = (source: string, startMarker: string, endMarker: string) => {
      const start = source.indexOf(startMarker);
      const end = source.indexOf(endMarker, start + startMarker.length);
      expect(start, `missing source marker ${startMarker}`).toBeGreaterThanOrEqual(0);
      expect(end, `missing source marker ${endMarker}`).toBeGreaterThan(start);
      return source.slice(start, end);
    };
    const locatorBlocks = [
      sourceBetween(lessonSource, locatorStartMarker, lessonEndMarker),
      sourceBetween(stateSource, locatorStartMarker, stateEndMarker)
    ];
    const locatorTokens = [
      [".toBe", "Visible("].join(""),
      ["hkVisualizationVisibility", "Blockers("].join(""),
      ["hasAttribute(", '"hidden"', ")"].join(""),
      ["hasAttribute(", '"inert"', ")"].join(""),
      ["getAttribute(", '"aria-hidden"', ")"].join(""),
      ["contentVisibility: style.", "contentVisibility"].join(""),
      ["display: style.", "display"].join(""),
      ["visibility: style.", "visibility"].join(""),
      ["Number.parseFloat(style.", "opacity)"].join(""),
      parentTraversalMarker
    ];
    for (const locatorBlock of locatorBlocks) {
      for (const token of locatorTokens) expect(locatorBlock).toContain(token);
    }

    const lessonExitFlushCall = lessonSource.indexOf(
      "await flushHkVisualizationPageExitEvents(page);"
    );
    const lessonListenerRemoval = lessonSource.indexOf(
      'page.off("request", listener);',
      lessonExitFlushCall
    );
    const renderOnlyStateBlock = sourceBetween(
      stateSource,
      'test("rendering an embedded lesson lab without interaction creates no session, visualization event, or reward"',
      "for (const lifecycleCase of exactNewTopicLifecycleCases)"
    );
    const stateExitFlushCall = renderOnlyStateBlock.indexOf(
      "await flushHkVisualizationPageExitEvents(page);"
    );
    const stateFlushLedger = renderOnlyStateBlock.indexOf(
      'executedStepIds.push("flush/pagehide");',
      stateExitFlushCall
    );
    const stateAfterSnapshot = renderOnlyStateBlock.search(
      /const after\s*=\s*await\s+readNoWriteSnapshot\(\s*page,\s*"after",\s*executedStepIds,\s*userId,\s*\);/
    );
    expect(lessonExitFlushCall, "lesson request evidence must flush page-exit telemetry").toBeGreaterThan(-1);
    expect(lessonListenerRemoval, "lesson request listener must remain attached through the exit flush")
      .toBeGreaterThan(lessonExitFlushCall);
    expect(stateExitFlushCall, "state evidence must flush page-exit telemetry").toBeGreaterThan(-1);
    expect(stateFlushLedger, "state evidence must record the completed exit flush")
      .toBeGreaterThan(stateExitFlushCall);
    expect(stateAfterSnapshot, "persistent after-snapshot must run after the exit flush")
      .toBeGreaterThan(stateFlushLedger);
  });

  for (const viewportId of Object.keys(lessonViewports) as LessonViewportId[]) {
    for (const gradePackage of gradePackages) {
      test(`${viewportId}/${gradePackage.grade} verifies every planned lesson embed`, async ({ browser }, testInfo) => {
        test.skip(
          !fullBrowserRequested,
          "Development-only partial run: HK_VIZ_ALLOW_PARTIAL=1 and HK_VIZ_LESSON_FULL=0 explicitly suppressed the browser sweep."
        );
        test.setTimeout(Math.max(150_000, 60_000 + gradePackage.rows.length * 75_000));

        const evidence = await runLessonEmbeddabilityPackage({
          baseURL: resolvedBaseURL(testInfo),
          browser,
          gradePackage,
          viewportId
        });
        await testInfo.attach(`${evidence.package.id}.json`, {
          body: JSON.stringify(evidence, null, 2),
          contentType: "application/json"
        });

        executedLessonPackageIds.push(evidence.package.id);
        executedLessonCellIds.push(...evidence.package.executedCellIds);

        expect(evidence.package.duplicateCellIds, "No lesson cell may execute twice.").toEqual([]);
        expect(evidence.package.missingCellIds, "Every planned lesson cell must execute.").toEqual([]);
        expect(evidence.package.executedCellIds, "Execution order must retain the exact package plan.")
          .toEqual(evidence.package.plannedCellIds);
        expect(evidence.summary.executedCellCount).toBe(evidence.summary.plannedCellCount);
        if (evidence.run.releaseAcceptance) {
          expect(evidence.run.allowPartial, "Release acceptance cannot carry a partial-run waiver.").toBe(false);
          expect(evidence.run.fullBrowserRequested, "Release/default acceptance must execute the full lesson sweep.").toBe(true);
        }

        if (evidence.status === "failed") {
          throw new Error(formatPackageFailure(evidence));
        }
      });
    }
  }
});

async function runLessonEmbeddabilityPackage(args: {
  baseURL: string;
  browser: Browser;
  gradePackage: HkVisualizationLessonGradePackage;
  viewportId: LessonViewportId;
}): Promise<LessonEmbeddabilityPackageEvidence> {
  const { baseURL, browser, gradePackage, viewportId } = args;
  const startedAt = new Date().toISOString();
  const plannedCellIds = gradePackage.rows.map((row) => lessonCellId(row, viewportId));
  const executedCellIds: string[] = [];
  const cells: LessonEmbeddabilityCellResult[] = [];
  let context: BrowserContext | null = null;
  let setupFailure: LessonEmbeddabilityFailure | null = null;

  try {
    context = await browser.newContext({
      baseURL,
      locale: "en-HK",
      reducedMotion: "reduce",
      viewport: lessonViewports[viewportId]
    });
    const authPage = await context.newPage();
    try {
      await loginAsDemoStudentApi(authPage);
      await verifyAuthenticatedHkStudent(authPage, baseURL);
    } finally {
      await authPage.close().catch(() => undefined);
    }

    for (const row of gradePackage.rows) {
      const cellId = lessonCellId(row, viewportId);
      executedCellIds.push(cellId);
      const page = await context.newPage();
      try {
        await installHkVisualizationEffectiveVisibilityInspector(page);
        cells.push(await runLessonEmbeddabilityCell({ page, row, viewportId }));
      } catch (error) {
        const cell = emptyCellResult(row, viewportId);
        addFailure(cell, "CELL_UNHANDLED", errorMessage(error), "cell");
        cell.status = "failed";
        cells.push(cell);
      } finally {
        await page.close().catch(() => undefined);
      }
    }
  } catch (error) {
    setupFailure = {
      code: "PACKAGE_SETUP",
      message: errorMessage(error),
      phase: "auth/setup"
    };
  } finally {
    await context?.close().catch(() => undefined);
  }

  const duplicateCellIds = duplicateValues(executedCellIds);
  const executedCellIdSet = new Set(executedCellIds);
  const missingCellIds = plannedCellIds.filter((cellId) => !executedCellIdSet.has(cellId));
  if (setupFailure) {
    for (const row of gradePackage.rows) {
      if (executedCellIdSet.has(lessonCellId(row, viewportId))) continue;
      const cell = emptyCellResult(row, viewportId);
      cell.failures.push(setupFailure);
      cells.push(cell);
    }
  }
  const failedCellCount = cells.filter((cell) => cell.status === "failed").length;
  const passedCellCount = cells.filter((cell) => cell.status === "passed").length;

  return {
    cells,
    package: {
      duplicateCellIds,
      executedCellIds,
      grade: gradePackage.grade,
      id: `hk-viz-lesson-${viewportId}-${gradePackage.grade.toLowerCase()}`,
      missingCellIds,
      plannedCellIds,
      viewportId
    },
    run: {
      allowPartial: lessonBrowserOptions.allowPartial,
      baseURL,
      endedAt: new Date().toISOString(),
      fullBrowserRequested,
      releaseAcceptance: lessonBrowserOptions.releaseAcceptance,
      startedAt
    },
    sourceContract: gradePackage.rows,
    status: failedCellCount > 0 || missingCellIds.length > 0 || duplicateCellIds.length > 0
      ? "failed"
      : "passed",
    summary: {
      executedCellCount: executedCellIds.length,
      failedCellCount,
      missingCellCount: missingCellIds.length,
      passedCellCount,
      plannedCellCount: plannedCellIds.length
    }
  };
}

async function runLessonEmbeddabilityCell(args: {
  page: Page;
  row: HkVisualizationLessonSourceRow;
  viewportId: LessonViewportId;
}) {
  const { page, row, viewportId } = args;
  const result = emptyCellResult(row, viewportId);
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const renderOnlyWriteRequests: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  const onRenderOnlyRequest = (request: Request) => {
    const url = new URL(request.url());
    const descriptor = describeHkVisualizationRenderOnlyWrite(
      request.method(),
      url.pathname,
      request.postData()
    );
    if (descriptor) renderOnlyWriteRequests.push(`${descriptor}${url.search}`);
  };
  page.on("request", onRenderOnlyRequest);
  const finishWithRenderOnlyEvidence = async () => {
    result.contract.pageExitFlushObserved = await guardedCheck(
      result,
      "PAGE_EXIT_FLUSH",
      "side-effects",
      async () => {
        await flushHkVisualizationPageExitEvents(page);
      }
    );
    recordRenderOnlyWriteEvidence(page, onRenderOnlyRequest, renderOnlyWriteRequests, row, result);
    return finishCell(result, pageErrors, consoleErrors);
  };

  if (row.topicCount !== 1) {
    addFailure(
      result,
      "SOURCE_TOPIC_COUNT",
      `Expected exactly one HK topic for ${row.labId}; received ${row.topicCount}.`,
      "source"
    );
  }
  if (row.lessonCount !== 1) {
    addFailure(
      result,
      "SOURCE_LESSON_COUNT",
      `Expected exactly one lesson source for ${row.labId}; received ${row.lessonCount}.`,
      "source"
    );
  }
  if (!row.gradeContractExact || row.grade !== row.manifestGrade) {
    addFailure(
      result,
      "SOURCE_TOPIC_GRADE",
      `Expected live topic grade ${row.manifestGrade} for ${row.labId}; received ${row.grade ?? "missing"}.`,
      "source"
    );
  }
  result.contract.sourceBindingExact = row.hasExactVisualizationBinding;
  if (!row.hasExactVisualizationBinding) {
    addFailure(
      result,
      "SOURCE_LAB_BINDING",
      `${row.labId} must have exactly one configured visualization block explicitly bound to the same lab id; `
        + `blocks=${row.visualizationBlockCount}, exactBindings=${row.exactBindingCount}.`,
      "source",
      undefined,
      { bindingTopicIds: row.bindingTopicIds, moduleIds: row.moduleIds, sourceIssues: row.sourceIssues }
    );
  }

  const navigated = await guardedCheck(result, "LESSON_ROUTE", "navigation", async () => {
    const response = await page.goto(row.route, { waitUntil: "domcontentloaded", timeout: 45_000 });
    if (!response) throw new Error(`Navigation to ${row.route} returned no main-resource response.`);
    if (response.status() >= 400) throw new Error(`Navigation to ${row.route} returned HTTP ${response.status()}.`);
  });
  result.actualFinalUrl = page.url() || null;
  if (!navigated) return finishWithRenderOnlyEvidence();

  await guardedCheck(result, "FINAL_LESSON_URL", "route-contract", async () => {
    const actual = new URL(page.url());
    if (actual.pathname !== row.route || actual.search !== "" || actual.hash !== "") {
      throw new Error(
        `Expected final URL ${row.route}; received ${actual.pathname}${actual.search}${actual.hash}.`
      );
    }
  });

  const lessonContent = page.locator(
    `[data-ai-selectable="lesson-block"][data-ai-topic-id=${JSON.stringify(row.labId)}]`
  );
  result.contract.lessonContentVisible = await guardedCheck(
    result,
    "LESSON_CONTENT",
    "lesson-content",
    async () => {
      if ((await lessonContent.count()) === 0) throw new Error(`${row.labId} rendered no lesson content blocks.`);
      await expectPerceptiblyVisible(lessonContent.first(), "lesson content", 15_000);
    }
  );

  const visualizationEntry = page
    .locator('[data-tour="student-lesson-map"]')
    .getByRole("button", { name: /Interactive lab|互動實驗室|互动实验室/i });
  result.contract.lessonEntryVisible = await guardedCheck(
    result,
    "VISUALIZATION_ENTRY",
    "lesson-entry",
    async () => {
      await expect(visualizationEntry).toHaveCount(1);
      await expectPerceptiblyVisible(visualizationEntry, "Visualization Lab lesson entry", 12_000);
    }
  );

  const visualizationSection = page.locator("section#visualization");
  result.contract.lessonSectionVisible = await guardedCheck(
    result,
    "VISUALIZATION_SECTION",
    "lesson-embed",
    async () => {
      await expect(visualizationSection).toHaveCount(1);
      await expect(visualizationSection).toBeAttached({ timeout: 12_000 });
      await visualizationSection.scrollIntoViewIfNeeded({ timeout: 8_000 });
      await expectPerceptiblyVisible(visualizationSection, "Visualization Lab section", 8_000);
    }
  );
  if (!result.contract.lessonSectionVisible) return finishWithRenderOnlyEvidence();

  const activeLab = visualizationSection.locator(
    `[data-viz-active-lab-id=${JSON.stringify(row.labId)}]`
  );
  result.contract.activeLabExact = await guardedCheck(
    result,
    "ACTIVE_LAB_EXACT",
    "workspace",
    async () => {
      await expect(activeLab).toHaveCount(1);
      await expectPerceptiblyVisible(activeLab, "active Visualization Lab root", 20_000);
    }
  );
  if (!result.contract.activeLabExact) {
    await auditDocumentOverflow(page, result);
    return finishWithRenderOnlyEvidence();
  }

  // Begin with a passive observation window, then retain the request listener
  // through the remaining read-only audits. Later control checks use trial
  // clicks only, so any visualization write still belongs to render/embed.
  await page.waitForTimeout(4_200);

  const runtimeContract = HK_VISUALIZATION_LESSON_CONTRACTS[row.labId];
  result.contract.dedicatedOrPassThroughRenderer = await verifyExpectedRenderer(
    visualizationSection,
    activeLab,
    row,
    result
  );
  result.contract.surfaceVisible = await guardedCheck(result, "SURFACE_VISIBLE", "workspace", async () => {
    const surface = visualizationSection.locator(runtimeContract.selectors.surface);
    await expectUniqueVisibleInsideActiveRoot(surface, activeLab, "visualization surface", 20_000);
  });
  result.contract.stateSummaryVisible = await guardedCheck(
    result,
    "STATE_SUMMARY",
    "workspace",
    async () => {
      const state = visualizationSection.locator(row.stateSelector);
      await expectUniqueVisibleInsideActiveRoot(state, activeLab, "visualization state", 12_000);
    }
  );

  const reset = visualizationSection.locator(row.resetSelector);
  result.contract.resetVisibleAndActionable = await guardedCheck(
    result,
    "RESET_CONTROL",
    "controls",
    async () => {
      await expectUniqueVisibleInsideActiveRoot(reset, activeLab, "visualization reset", 12_000);
      await expect(reset).toBeEnabled();
      await expect(reset).toHaveAttribute("data-viz-reset-module-id", row.moduleId);
      await expect(reset).toHaveAttribute("data-viz-reset-topic-id", row.topicId);
      await reset.click({ trial: true, timeout: 5_000 });
    }
  );

  const controlAudit = await auditControlTargets(activeLab).catch((error) => ({
    controlCount: 0,
    issues: [{ code: "CONTROL_AUDIT", descriptor: "control-audit", height: 0, message: errorMessage(error), width: 0 }]
  }));
  result.contract.controlCount = controlAudit.controlCount;
  result.contract.minimumTarget44 = controlAudit.controlCount > 0
    && controlAudit.issues.every((issue) => issue.code !== "CONTROL_TARGET_44");
  if (controlAudit.controlCount === 0) {
    addFailure(result, "CONTROLS_MISSING", `${row.labId} has no visible enabled learner controls.`, "controls");
  }
  for (const issue of controlAudit.issues) {
    addFailure(
      result,
      issue.code,
      issue.message
        ?? `${issue.descriptor} has a ${issue.width.toFixed(1)}×${issue.height.toFixed(1)} pointer target; 44×44 is required.`,
      "controls",
      issue.descriptor,
      issue
    );
  }

  await auditLayout(page, activeLab, result);
  const collisionAudit = await scanTextCollisions(activeLab).catch((error) => ({
    collisions: [`collision-audit-error: ${errorMessage(error)}`],
    missingOverlapReasons: [] as string[],
    surfaceIssues: [] as Array<"HK_CANVAS_SURFACE_UNSUPPORTED" | "HK_SVG_SURFACE_MISSING">
  }));
  result.contract.collisionCount = collisionAudit.collisions.length;
  for (const missingReason of collisionAudit.missingOverlapReasons) {
    addFailure(result, "OVERLAP_EXEMPTION_REASON", missingReason, "collisions");
  }
  for (const collision of collisionAudit.collisions) {
    addFailure(result, "TEXT_COLLISION", collision, "collisions");
  }
  for (const surfaceIssue of collisionAudit.surfaceIssues) {
    addFailure(
      result,
      surfaceIssue,
      surfaceIssue === "HK_CANVAS_SURFACE_UNSUPPORTED"
        ? `${row.labId} exposes a canvas renderer; HK collision acceptance requires inspectable SVG geometry.`
        : `${row.labId} rendered no actual SVG surface.`,
      "collisions",
      "[data-viz-surface]"
    );
  }

  return finishWithRenderOnlyEvidence();
}

function recordRenderOnlyWriteEvidence(
  page: Page,
  listener: (request: Request) => void,
  writeRequests: readonly string[],
  row: HkVisualizationLessonSourceRow,
  result: LessonEmbeddabilityCellResult
) {
  page.off("request", listener);
  result.renderOnlyWriteRequests = [...writeRequests];
  result.contract.renderOnlyNoWrite = writeRequests.length === 0;
  if (writeRequests.length > 0) {
    addFailure(
      result,
      "RENDER_ONLY_WRITE",
      `Rendering ${row.labId} without interaction issued write request(s): [${writeRequests.join(", ")}].`,
      "side-effects"
    );
  }
}

async function flushHkVisualizationPageExitEvents(page: Page) {
  if (page.isClosed()) {
    throw new Error("Cannot observe the render-only page-exit flush because the lesson page is already closed.");
  }
  const dispatched = await page.evaluate(() => {
    const pageHideEvent = typeof PageTransitionEvent === "function"
      ? new PageTransitionEvent("pagehide", { persisted: false })
      : new Event("pagehide");
    return window.dispatchEvent(pageHideEvent);
  });
  if (!dispatched) {
    throw new Error("The controlled pagehide event was cancelled before exit telemetry could be observed.");
  }
  // AppProviders sends queued exit telemetry with sendBeacon/keepalive. Keep
  // the request listener attached long enough for either transport to surface.
  await page.waitForTimeout(500);
}

async function verifyExpectedRenderer(
  visualizationSection: Locator,
  activeLab: Locator,
  row: HkVisualizationLessonSourceRow,
  result: LessonEmbeddabilityCellResult
) {
  if (isHKDedicatedLabId(row.labId)) {
    return await guardedCheck(result, "DEDICATED_RENDERER", "renderer", async () => {
      const dispatcher = visualizationSection.locator(
        `[data-hk-viz-dispatcher-lab-id=${JSON.stringify(row.labId)}]`
      );
      await expectUniqueVisibleInsideActiveRoot(dispatcher, activeLab, "HK dispatcher", 20_000);
      await expect(dispatcher).toHaveAttribute(
        "data-hk-viz-dispatcher-target",
        row.labKind === "primary-dedicated" ? "primary" : "secondary"
      );
      const model = visualizationSection.locator(
        HK_VISUALIZATION_LESSON_CONTRACTS[row.labId].selectors.model
      );
      await expectUniqueVisibleInsideActiveRoot(model, activeLab, "dedicated model", 20_000);
    });
  }

  if (isHKPassThroughLabId(row.labId)) {
    return await guardedCheck(result, "PASS_THROUGH_RENDERER", "renderer", async () => {
      await expect(activeLab.locator("[data-hk-viz-dispatcher]")).toHaveCount(0);
      const configuredModel = activeLab.locator("[data-viz-configured-model]");
      const configuredState = activeLab.locator("[data-viz-configured-state]");
      await expect(configuredModel).toHaveCount(1);
      await expectPerceptiblyVisible(configuredModel, "configured model", 20_000);
      await expect(configuredState).toHaveCount(1);
      await expectPerceptiblyVisible(configuredState, "configured state", 20_000);
    });
  }

  addFailure(
    result,
    "REGISTRY_RENDERER_KIND",
    `${row.labId} is neither a dedicated nor pass-through registry id.`,
    "renderer"
  );
  return false;
}

async function expectUniqueVisibleInsideActiveRoot(
  locator: Locator,
  activeRoot: Locator,
  label: string,
  timeout: number
) {
  await expect(locator, `${label} must occur exactly once.`).toHaveCount(1);
  await expectPerceptiblyVisible(locator, label, timeout);
  const rootHandle = await activeRoot.elementHandle();
  if (!rootHandle) throw new Error(`Unique active root was detached while checking ${label}.`);
  const inside = await locator.evaluate(
    (element, root) => root instanceof Element && root.contains(element),
    rootHandle
  );
  if (!inside) throw new Error(`${label} is not contained by the unique active lab root.`);
}

async function expectPerceptiblyVisible(
  locator: Locator,
  label: string,
  timeout: number
) {
  await expect(locator, `${label} must have a rendered box.`).toBeVisible({ timeout });
  const evidence = await perceptibleVisibilityEvidence(locator);
  const blockers = hkVisualizationVisibilityBlockers(evidence.chain);
  if (!evidence.connected || evidence.width <= 1 || evidence.height <= 1 || blockers.length > 0) {
    throw new Error(
      `${label} is not perceptibly visible/actionable: connected=${evidence.connected}, `
      + `box=${evidence.width.toFixed(1)}×${evidence.height.toFixed(1)}, blockers=[${blockers.join(", ")}].`
    );
  }
}

async function perceptibleVisibilityEvidence(locator: Locator) {
  return await locator.evaluate((element) => {
    const chain: HkVisualizationVisibilityNode[] = [];
    let cursor: Element | null = element;
    while (cursor) {
      const style = getComputedStyle(cursor);
      const parsedOpacity = Number.parseFloat(style.opacity);
      chain.push({
        ariaHidden: cursor.getAttribute("aria-hidden")?.trim().toLowerCase() === "true",
        contentVisibility: style.contentVisibility,
        display: style.display,
        hidden: cursor.hasAttribute("hidden"),
        inert: cursor.hasAttribute("inert")
          || ("inert" in cursor && Boolean((cursor as HTMLElement).inert)),
        opacity: Number.isFinite(parsedOpacity) ? parsedOpacity : null,
        visibility: style.visibility
      });
      cursor = cursor.parentElement;
    }
    const rect = element.getBoundingClientRect();
    return {
      chain,
      connected: element.isConnected,
      height: rect.height,
      width: rect.width
    };
  });
}

async function auditDocumentOverflow(page: Page, result: LessonEmbeddabilityCellResult) {
  await guardedCheck(result, "DOCUMENT_OVERFLOW", "layout", async () => {
    const layout = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth
    }));
    result.contract.documentClientWidth = layout.clientWidth;
    result.contract.documentScrollWidth = layout.scrollWidth;
    if (layout.scrollWidth > layout.clientWidth + 2) {
      throw new Error(
        `Document scrollWidth ${layout.scrollWidth} exceeds clientWidth ${layout.clientWidth}.`
      );
    }
  });
}

async function auditLayout(
  page: Page,
  workspace: Locator,
  result: LessonEmbeddabilityCellResult
) {
  await guardedCheck(result, "LAYOUT_CONTRACT", "layout", async () => {
    const snapshot = await scanHkVisualizationLayout(workspace, "lesson-embeddability");
    result.contract.documentClientWidth = snapshot.documentClientWidth;
    result.contract.documentScrollWidth = snapshot.documentScrollWidth;
    if (snapshot.issues.length > 0) {
      throw new Error(snapshot.issues.map((issue) => `${issue.kind}: ${issue.message}`).join("\n"));
    }
    // Keep Page in the signature so callers cannot accidentally audit a
    // detached locator without the associated document.
    if (await page.isClosed()) throw new Error("Page closed before layout audit completed.");
  });
}

async function auditControlTargets(workspace: Locator) {
  const controls = workspace.locator(interactiveControlSelector);
  const issues: Array<{
    code: string;
    descriptor: string;
    height: number;
    message?: string;
    width: number;
  }> = [];
  let controlCount = 0;

  for (let index = 0; index < await controls.count(); index += 1) {
    const control = controls.nth(index);
    const visibilityEvidence = await perceptibleVisibilityEvidence(control).catch(() => null);
    if (!visibilityEvidence
      || !visibilityEvidence.connected
      || visibilityEvidence.width <= 1
      || visibilityEvidence.height <= 1
      || hkVisualizationVisibilityBlockers(visibilityEvidence.chain).length > 0) continue;
    if (!(await control.isEnabled().catch(() => false))) continue;
    controlCount += 1;
    const descriptor = await control.evaluate((element, controlIndex) => {
      const text = (element.getAttribute("aria-label") ?? element.textContent ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 70);
      return `${element.tagName.toLowerCase()}[${controlIndex}]${text ? ` "${text}"` : ""}`;
    }, index);
    try {
      await control.scrollIntoViewIfNeeded({ timeout: 4_000 });
      await control.click({ trial: true, timeout: 4_000 });
    } catch (error) {
      issues.push({
        code: "CONTROL_ACTIONABILITY",
        descriptor,
        height: 0,
        message: `${descriptor} is not actionable: ${errorMessage(error)}`,
        width: 0
      });
      continue;
    }

    const evidence = await control.evaluate((element) => {
      const selector = "button, a[href], input:not([type=hidden]), select, textarea, [role=button], [role=slider]";
      const learnerVisibleThroughAncestors = (candidate: Element) => {
        const rect = candidate.getBoundingClientRect();
        if (rect.width <= 1 || rect.height <= 1 || !candidate.isConnected) return false;
        let effectiveOpacity = 1;
        let cursor: Element | null = candidate;
        while (cursor) {
          const style = getComputedStyle(cursor);
          const opacity = Number.parseFloat(style.opacity);
          if (cursor.hasAttribute("hidden")
            || cursor.hasAttribute("inert")
            || ("inert" in cursor && Boolean((cursor as HTMLElement).inert))
            || cursor.getAttribute("aria-hidden")?.trim().toLowerCase() === "true"
            || style.display === "none"
            || style.visibility === "hidden"
            || style.visibility === "collapse"
            || style.contentVisibility === "hidden"
            || !Number.isFinite(opacity)) return false;
          effectiveOpacity *= Math.min(1, Math.max(0, opacity));
          cursor = cursor.parentElement;
        }
        return effectiveOpacity > 0.01;
      };
      const explicitTarget = element.closest("[data-viz-pointer-target]");
      const target = explicitTarget ?? element;
      const rect = target.getBoundingClientRect();
      const targetControls = explicitTarget && explicitTarget !== element
        ? Array.from(explicitTarget.querySelectorAll(selector)).filter(learnerVisibleThroughAncestors)
        : [];
      const insetX = Math.min(6, rect.width / 4);
      const insetY = Math.min(6, rect.height / 4);
      const points = [
        [rect.left + rect.width / 2, rect.top + rect.height / 2],
        [rect.left + insetX, rect.top + insetY],
        [rect.right - insetX, rect.bottom - insetY]
      ];
      const hit = points.some(([x, y]) => {
        if (x < 0 || y < 0 || x >= window.innerWidth || y >= window.innerHeight) return false;
        const top = document.elementFromPoint(x, y);
        return top === element
          || top === target
          || (top !== null && (element.contains(top) || target.contains(top)));
      });
      return {
        explicitAncestor: Boolean(explicitTarget && explicitTarget !== element),
        height: rect.height,
        hit,
        sharedControlCount: targetControls.length,
        sharedWithSelfOnly: targetControls.length === 1 && targetControls[0] === element,
        width: rect.width
      };
    });

    if (evidence.explicitAncestor && !evidence.sharedWithSelfOnly) {
      issues.push({
        code: "CONTROL_POINTER_TARGET_SHARED",
        descriptor,
        height: evidence.height,
        message: `${descriptor} uses a data-viz-pointer-target ancestor shared by ${evidence.sharedControlCount} controls.`,
        width: evidence.width
      });
    }
    if (evidence.explicitAncestor && (evidence.width > 160 || evidence.height > 96)) {
      issues.push({
        code: "CONTROL_POINTER_TARGET_BLANKET",
        descriptor,
        height: evidence.height,
        message: `${descriptor} uses an unconstrained ${evidence.width.toFixed(1)}×${evidence.height.toFixed(1)} ancestor as its pointer target.`,
        width: evidence.width
      });
    }
    if (evidence.width < 44 || evidence.height < 44) {
      issues.push({
        code: "CONTROL_TARGET_44",
        descriptor,
        height: evidence.height,
        width: evidence.width
      });
    }
    if (!evidence.hit) {
      issues.push({
        code: "CONTROL_HIT_TARGET",
        descriptor,
        height: evidence.height,
        message: `${descriptor} is covered at all sampled pointer-target points.`,
        width: evidence.width
      });
    }
  }

  return { controlCount, issues };
}

async function scanTextCollisions(workspace: Locator) {
  const snapshot = await scanHkVisualizationCollisions(workspace, "lesson-embeddability");
  const missingOverlapReasons = snapshot.overlapExemptions
    .filter((exemption) => exemption.risk !== "explicit-narrow-pair")
    .map((exemption) => (
      `${exemption.owner} declares an invalid overlap exemption (${exemption.risk}; candidates=${exemption.candidateCount}, area=${exemption.areaRatio.toFixed(3)}).`
    ));
  const collisions = snapshot.issues.map((issue) => (
    `${issue.kind}: ${issue.first} overlaps ${issue.second}.`
  ));
  if (snapshot.truncated) {
    collisions.push("Collision evidence exceeded the 100-issue bound.");
  }
  return {
    collisions,
    missingOverlapReasons,
    surfaceIssues: hkVisualizationSurfaceEvidenceIssues(snapshot)
  };
}

// Retained temporarily as a source-level comparison while the shared scanner
// is exercised by the lesson gate; it is intentionally not called.
async function legacyScanTextCollisions(workspace: Locator) {
  return await workspace.evaluate((root) => {
    const tolerance = 4;
    const maxIssues = 60;
    const issues: string[] = [];
    const missingOverlapReasons: string[] = [];
    const learnerVisibleThroughAncestors = (element: Element) => {
      const rect = element.getBoundingClientRect();
      if (rect.width <= 1 || rect.height <= 1 || !element.isConnected) return false;
      let effectiveOpacity = 1;
      let cursor: Element | null = element;
      while (cursor) {
        const style = getComputedStyle(cursor);
        const opacity = Number.parseFloat(style.opacity);
        if (cursor.hasAttribute("hidden")
          || cursor.hasAttribute("inert")
          || ("inert" in cursor && Boolean((cursor as HTMLElement).inert))
          || cursor.getAttribute("aria-hidden")?.trim().toLowerCase() === "true"
          || style.display === "none"
          || style.visibility === "hidden"
          || style.visibility === "collapse"
          || style.contentVisibility === "hidden"
          || !Number.isFinite(opacity)) return false;
        effectiveOpacity *= Math.min(1, Math.max(0, opacity));
        cursor = cursor.parentElement;
      }
      return effectiveOpacity > 0.01;
    };
    const overlap = (first: DOMRect, second: DOMRect) => {
      const width = Math.min(first.right, second.right) - Math.max(first.left, second.left);
      const height = Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top);
      return width > tolerance && height > tolerance;
    };
    const controlSelector = "button, a[href], input:not([type=hidden]), select, textarea, [role=button], [role=slider]";
    const exemptionOwner = (element: Element) => element.closest("[data-viz-overlap-ok]");
    const validExemptionOwners = new Set<Element>();
    const narrowlyExempt = (first: Element, second: Element) => {
      const firstOwner = exemptionOwner(first);
      const secondOwner = exemptionOwner(second);
      if (!firstOwner || firstOwner !== secondOwner) return false;
      return validExemptionOwners.has(firstOwner);
    };
    const push = (message: string) => {
      if (issues.length < maxIssues) issues.push(message);
    };

    Array.from(root.querySelectorAll("[data-viz-overlap-ok]")).forEach((owner, index) => {
      if (!learnerVisibleThroughAncestors(owner)) return;
      const reason = owner.getAttribute("data-viz-overlap-reason")?.trim();
      const label = (owner.getAttribute("aria-label") ?? owner.textContent ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 70);
      const pairCandidates = [
        ...(owner.matches(`${controlSelector}, svg text, [data-viz-label], [data-viz-mark]`) ? [owner] : []),
        ...Array.from(owner.querySelectorAll(`${controlSelector}, svg text, [data-viz-label], [data-viz-mark]`))
      ].filter(learnerVisibleThroughAncestors);
      const controlCount = pairCandidates.filter((candidate) => candidate.matches(controlSelector)).length;
      const ownerRect = owner.getBoundingClientRect();
      const rootRect = root.getBoundingClientRect();
      const blanket = owner === root
        || pairCandidates.length !== 2
        || controlCount > 1
        || (ownerRect.width > Math.min(320, rootRect.width * 0.6)
          && ownerRect.height > Math.min(180, rootRect.height * 0.35));
      if (!reason) {
        missingOverlapReasons.push(
          `${owner.tagName.toLowerCase()}[${index}]${label ? ` "${label}"` : ""} has data-viz-overlap-ok without a nonblank data-viz-overlap-reason.`
        );
        return;
      }
      if (blanket) {
        missingOverlapReasons.push(
          `${owner.tagName.toLowerCase()}[${index}]${label ? ` "${label}"` : ""} is a blanket overlap owner (pairCandidates=${pairCandidates.length}, controls=${controlCount}).`
        );
        return;
      }
      validExemptionOwners.add(owner);
    });

    const controls = Array.from(root.querySelectorAll(controlSelector)).filter(learnerVisibleThroughAncestors);
    for (let firstIndex = 0; firstIndex < controls.length; firstIndex += 1) {
      const first = controls[firstIndex];
      for (let secondIndex = firstIndex + 1; secondIndex < controls.length; secondIndex += 1) {
        const second = controls[secondIndex];
        if (first.contains(second) || second.contains(first) || narrowlyExempt(first, second)) continue;
        if (!overlap(first.getBoundingClientRect(), second.getBoundingClientRect())) continue;
        push(`Control ${describeElement(first, firstIndex)} overlaps control ${describeElement(second, secondIndex)}.`);
      }
    }

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const text = node.textContent?.replace(/\s+/g, " ").trim();
        if (!text || !node.parentElement || !learnerVisibleThroughAncestors(node.parentElement)) return NodeFilter.FILTER_REJECT;
        if (node.parentElement.closest('[aria-hidden="true"], svg')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const fragments: Array<{ parent: Element; rect: DOMRect; text: string }> = [];
    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      const parent = node.parentElement;
      if (!parent) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const text = (node.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 70);
      for (const rect of Array.from(range.getClientRects())) {
        if (rect.width > 1 && rect.height > 1) fragments.push({ parent, rect, text });
      }
    }

    for (const fragment of fragments) {
      const containingLabel = fragment.parent.closest("label");
      for (let controlIndex = 0; controlIndex < controls.length; controlIndex += 1) {
        const control = controls[controlIndex];
        if (control.contains(fragment.parent) || fragment.parent.contains(control)) continue;
        if (containingLabel?.contains(control)) continue;
        const labels = "labels" in control
          ? Array.from((control as HTMLInputElement).labels ?? [])
          : [];
        if (containingLabel && labels.includes(containingLabel)) continue;
        if (narrowlyExempt(fragment.parent, control)) continue;
        if (!overlap(fragment.rect, control.getBoundingClientRect())) continue;
        push(`DOM text "${fragment.text}" overlaps control ${describeElement(control, controlIndex)}.`);
      }
    }

    for (let firstIndex = 0; firstIndex < fragments.length; firstIndex += 1) {
      const first = fragments[firstIndex];
      for (let secondIndex = firstIndex + 1; secondIndex < fragments.length; secondIndex += 1) {
        const second = fragments[secondIndex];
        if (first.parent === second.parent) continue;
        if (first.parent.contains(second.parent) || second.parent.contains(first.parent)) continue;
        const firstInteractive = first.parent.closest("button, a, label, output, [role=button], [role=slider]");
        const secondInteractive = second.parent.closest("button, a, label, output, [role=button], [role=slider]");
        if (firstInteractive && firstInteractive === secondInteractive) continue;
        if (narrowlyExempt(first.parent, second.parent)) continue;
        if (!overlap(first.rect, second.rect)) continue;
        push(`DOM text "${first.text}" overlaps "${second.text}".`);
      }
    }

    const labels = Array.from(root.querySelectorAll("svg text, [data-viz-label]"))
      .filter((element) => learnerVisibleThroughAncestors(element));
    for (let firstIndex = 0; firstIndex < labels.length; firstIndex += 1) {
      const first = labels[firstIndex];
      for (let secondIndex = firstIndex + 1; secondIndex < labels.length; secondIndex += 1) {
        const second = labels[secondIndex];
        if (first.contains(second) || second.contains(first) || narrowlyExempt(first, second)) continue;
        if (!overlap(first.getBoundingClientRect(), second.getBoundingClientRect())) continue;
        const firstText = (first.textContent ?? first.getAttribute("aria-label") ?? "").trim().slice(0, 70);
        const secondText = (second.textContent ?? second.getAttribute("aria-label") ?? "").trim().slice(0, 70);
        push(`SVG label "${firstText}" overlaps "${secondText}".`);
      }
    }

    const marks = Array.from(root.querySelectorAll("[data-viz-mark]"))
      .filter((element) => learnerVisibleThroughAncestors(element));
    for (let labelIndex = 0; labelIndex < labels.length; labelIndex += 1) {
      const label = labels[labelIndex];
      for (let markIndex = 0; markIndex < marks.length; markIndex += 1) {
        const mark = marks[markIndex];
        if (label.contains(mark) || mark.contains(label) || narrowlyExempt(label, mark)) continue;
        if (!overlap(label.getBoundingClientRect(), mark.getBoundingClientRect())) continue;
        push(`SVG label ${describeElement(label, labelIndex)} overlaps mark ${describeElement(mark, markIndex)}.`);
      }
    }

    return { collisions: issues, missingOverlapReasons };

    function describeElement(element: Element, index: number) {
      const text = (element.getAttribute("aria-label") ?? element.textContent ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 70);
      return `${element.tagName.toLowerCase()}[${index}]${text ? ` "${text}"` : ""}`;
    }
  });
}

async function verifyAuthenticatedHkStudent(page: Page, baseURL: string) {
  const response = await page.request.get(
    new URL("/api/auth/session-state?includeLessonEntry=false", baseURL).toString(),
    { timeout: 30_000 }
  );
  if (!response.ok()) throw new Error(`Session-state verification returned HTTP ${response.status()}.`);
  const payload = await response.json() as {
    user?: {
      curriculumProfile?: { region?: unknown };
      curriculumTrack?: unknown;
      role?: unknown;
    } | null;
  };
  if (payload.user?.role !== "student") {
    throw new Error(`Expected student role; received ${JSON.stringify(payload.user?.role)}.`);
  }
  if (payload.user.curriculumTrack !== "HK") {
    throw new Error(`Expected HK curriculumTrack; received ${JSON.stringify(payload.user.curriculumTrack)}.`);
  }
  if (payload.user.curriculumProfile?.region !== "HK") {
    throw new Error(
      `Expected HK curriculum profile region; received ${JSON.stringify(payload.user.curriculumProfile?.region)}.`
    );
  }
}

function emptyCellResult(
  row: HkVisualizationLessonSourceRow,
  viewportId: LessonViewportId
): LessonEmbeddabilityCellResult {
  return {
    actualFinalUrl: null,
    cellId: lessonCellId(row, viewportId),
    contract: {
      activeLabExact: false,
      collisionCount: 0,
      controlCount: 0,
      dedicatedOrPassThroughRenderer: false,
      documentClientWidth: null,
      documentScrollWidth: null,
      lessonContentVisible: false,
      lessonEntryVisible: false,
      lessonSectionVisible: false,
      minimumTarget44: false,
      pageExitFlushObserved: false,
      renderOnlyNoWrite: false,
      resetVisibleAndActionable: false,
      sourceBindingExact: false,
      stateSummaryVisible: false,
      surfaceVisible: false
    },
    expectedRenderer: row.expectedRenderer,
    failures: [],
    grade: row.grade ?? "UNMAPPED",
    labId: row.labId,
    lessonSlug: row.lessonSlug,
    route: row.route,
    renderOnlyWriteRequests: [],
    status: "failed",
    viewport: { id: viewportId, ...lessonViewports[viewportId] }
  };
}

function finishCell(
  result: LessonEmbeddabilityCellResult,
  pageErrors: string[],
  consoleErrors: string[]
) {
  for (const message of pageErrors) addFailure(result, "PAGE_ERROR", message, "diagnostics");
  for (const message of consoleErrors) addFailure(result, "CONSOLE_ERROR", message, "diagnostics");
  result.status = result.failures.length === 0 ? "passed" : "failed";
  return result;
}

async function guardedCheck(
  result: LessonEmbeddabilityCellResult,
  code: string,
  phase: string,
  action: () => Promise<void>
) {
  try {
    await action();
    return true;
  } catch (error) {
    addFailure(result, code, errorMessage(error), phase);
    return false;
  }
}

function addFailure(
  result: LessonEmbeddabilityCellResult,
  code: string,
  message: string,
  phase: string,
  selector?: string,
  details?: unknown
) {
  result.failures.push({ code, details, message, phase, selector });
}

function lessonCellId(row: HkVisualizationLessonSourceRow, viewportId: LessonViewportId) {
  return `${viewportId}/${row.grade ?? "UNMAPPED"}/${row.labId}/${row.lessonSlug}`;
}

function duplicateValues(values: readonly string[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].filter(([, count]) => count > 1).map(([value]) => value);
}

function formatPackageFailure(evidence: LessonEmbeddabilityPackageEvidence) {
  const failures = evidence.cells.flatMap((cell) =>
    cell.failures.map((failure) => `${cell.cellId} [${failure.code}/${failure.phase}] ${failure.message}`)
  );
  const lines = [
    `${evidence.package.id}: ${evidence.summary.passedCellCount}/${evidence.summary.plannedCellCount} passed.`,
    `planned=${evidence.package.plannedCellIds.length} executed=${evidence.package.executedCellIds.length} missing=${evidence.package.missingCellIds.length} duplicate=${evidence.package.duplicateCellIds.length}`,
    ...failures.slice(0, 30).map((failure) => `- ${failure}`)
  ];
  if (failures.length > 30) lines.push(`- ... ${failures.length - 30} additional failure(s) are in the attached JSON.`);
  return lines.join("\n");
}

function resolvedBaseURL(testInfo: TestInfo) {
  const configuredBaseURL = testInfo.project.use.baseURL;
  if (typeof configuredBaseURL === "string" && configuredBaseURL.trim()) return configuredBaseURL;
  const port = Number(process.env.PLAYWRIGHT_PORT ?? 3020);
  return process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
