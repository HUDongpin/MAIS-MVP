import { expect, test, type TestInfo } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { visualizationLabCatalog } from "../../data/visualizationLabs";
import {
  aggregateHkVisualizationBrowserDependentTransitionReceipts,
  aggregateHkVisualizationBrowserPassThroughPaintedGeometryPairReceipts,
  aggregateHkVisualizationBrowserPassThroughOracleReceipts,
  aggregateHkVisualizationBrowserPassThroughResetReceipts,
  aggregateHkVisualizationBrowserP6AveragesReceipts,
  aggregateHkVisualizationBrowserP6BudgetReceipts,
  aggregateHkVisualizationBrowserScrollObservationReceipts,
  buildHkVisualizationBrowserScrollCellPlan,
  HK_VISUALIZATION_BROWSER_DEPENDENT_TRANSITION_ANNOTATION_TYPE,
  HK_VISUALIZATION_BROWSER_PASS_THROUGH_PAINTED_GEOMETRY_PAIR_ANNOTATION_TYPE,
  HK_VISUALIZATION_BROWSER_PASS_THROUGH_ORACLE_ANNOTATION_TYPE,
  HK_VISUALIZATION_BROWSER_PASS_THROUGH_RESET_ANNOTATION_TYPE,
  HK_VISUALIZATION_BROWSER_P6_AVERAGES_ANNOTATION_TYPE,
  HK_VISUALIZATION_BROWSER_P6_BUDGET_ANNOTATION_TYPE,
  HK_VISUALIZATION_BROWSER_SCROLL_ANNOTATION_TYPE,
} from "./hk-visualization-browser-chunk-adapter";
import {
  buildHkVisualizationMatrixManifest,
  buildHkVisualizationModeExerciseOrder,
  buildHkVisualizationPackages,
  formatHkVisualizationPackageFailure,
  HK_VISUALIZATION_CANONICAL_PROJECT,
  HK_VISUALIZATION_EXPECTED_FULL_CELL_COUNT,
  HK_VISUALIZATION_EXPECTED_FULL_PACKAGE_COUNT,
  HK_VISUALIZATION_EXPECTED_LAB_COUNT,
  hkVisualizationCellDeadlineMs,
  hkVisualizationContrastRatio,
  hkVisualizationEffectiveOpacity,
  hkVisualizationLocalizationIssues,
  hkVisualizationOverlapOwnerRisk,
  hkVisualizationPotentiallyTabbable,
  hkVisualizationPointerTargetIssues,
  hkVisualizationRequiredContrastRatio,
  hkVisualizationVisibilityPasses,
  resolveHkVisualizationAcceptanceOptions,
  runHkVisualizationPackage
} from "./hk-visualization-machine-acceptance-helpers";

const options = resolveHkVisualizationAcceptanceOptions(visualizationLabCatalog);
const packages = buildHkVisualizationPackages(options);
const manifest = buildHkVisualizationMatrixManifest(options);
const executedPackageIds: string[] = [];
const executedCellIds: string[] = [];

test.describe("HK Visualization Lab machine acceptance", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(
      testInfo.project.name !== HK_VISUALIZATION_CANONICAL_PROJECT,
      `This suite owns its viewport matrix and runs only in ${HK_VISUALIZATION_CANONICAL_PROJECT}.`
    );
  });

  test.afterAll(async ({}, testInfo) => {
    if (testInfo.project.name !== HK_VISUALIZATION_CANONICAL_PROJECT) return;

    const plannedPackageIds = manifest.plan.packageIds;
    const plannedCellIds = manifest.plan.plannedCellIds;
    const executedPackageIdSet = new Set(executedPackageIds);
    const executedCellIdSet = new Set(executedCellIds);
    const duplicatePackageIds = executedPackageIds.filter(
      (packageId, index) => executedPackageIds.indexOf(packageId) !== index
    );
    const duplicateCellIds = executedCellIds.filter(
      (cellId, index) => executedCellIds.indexOf(cellId) !== index
    );
    const unexpectedPackageIds = executedPackageIds.filter((packageId) => !plannedPackageIds.includes(packageId));
    const unexpectedCellIds = executedCellIds.filter((cellId) => !plannedCellIds.includes(cellId));
    const executionLedger = {
      matrixScope: options.matrixScope,
      plannedPackageCount: plannedPackageIds.length,
      executedPackageCount: executedPackageIds.length,
      uniqueExecutedPackageCount: executedPackageIdSet.size,
      missingPackageIds: plannedPackageIds.filter((packageId) => !executedPackageIdSet.has(packageId)),
      unexpectedPackageIds,
      duplicatePackageIds,
      plannedCellCount: plannedCellIds.length,
      executedCellCount: executedCellIds.length,
      uniqueExecutedCellCount: executedCellIdSet.size,
      missingCellIds: plannedCellIds.filter((cellId) => !executedCellIdSet.has(cellId)),
      unexpectedCellIds,
      duplicateCellIds
    };

    await testInfo.attach("hk-visualization-run-execution-ledger.json", {
      body: JSON.stringify(executionLedger, null, 2),
      contentType: "application/json"
    });

    expect(
      executedPackageIds,
      "The run-level ledger must contain every planned HK package. A grep, line filter, shard, retry-only worker, or interrupted run is not full acceptance evidence."
    ).toEqual(plannedPackageIds);
    expect(duplicatePackageIds, "The run-level ledger must not execute any package twice.").toEqual([]);
    expect(unexpectedPackageIds, "The run-level ledger must not contain unplanned packages.").toEqual([]);
    expect(
      executedCellIds,
      "The run-level ledger must contain every planned HK matrix cell in package order."
    ).toEqual(plannedCellIds);
    expect(duplicateCellIds, "The run-level ledger must not execute any matrix cell twice.").toEqual([]);
    expect(unexpectedCellIds, "The run-level ledger must not contain unplanned matrix cells.").toEqual([]);
  });

  test("matrix manifest is complete for the requested scope", async ({ browser }, testInfo) => {
    // The canonical release run uses one worker and no retries. Requesting the
    // worker-scoped browser in the first test keeps the managed Chrome process
    // observable for every subsequent per-test path receipt, including tests
    // whose own assertions are otherwise pure/static.
    expect(browser).toBeTruthy();
    const actualBaseURL = typeof testInfo.project.use.baseURL === "string"
      ? testInfo.project.use.baseURL
      : "missing-base-url";
    testInfo.annotations.push({ type: "hk-viz-base-url", description: actualBaseURL });
    expect(
      actualBaseURL,
      "Release acceptance must exercise the managed current-worktree server, never an external or reused target."
    ).toBe("http://127.0.0.1:3020");
    const allGradeCount = new Set(options.allHkLabs.map((lab) => lab.grade)).size;
    expect(
      options.allHkLabs,
      `The live HK catalog must contain exactly ${HK_VISUALIZATION_EXPECTED_LAB_COUNT} labs.`
    )
      .toHaveLength(HK_VISUALIZATION_EXPECTED_LAB_COUNT);
    expect(
      options.allHkLabs.length * 3 * 2 * 3,
      `The unfiltered full matrix must remain exactly ${HK_VISUALIZATION_EXPECTED_FULL_CELL_COUNT} cells.`
    )
      .toBe(HK_VISUALIZATION_EXPECTED_FULL_CELL_COUNT);
    expect(
      allGradeCount * 3 * 2 * 3,
      `The unfiltered full matrix must remain exactly ${HK_VISUALIZATION_EXPECTED_FULL_PACKAGE_COUNT} packages.`
    )
      .toBe(HK_VISUALIZATION_EXPECTED_FULL_PACKAGE_COUNT);
    expect(options.selectedLabs.length, "The requested HK lab selection must not be empty.").toBeGreaterThan(0);
    expect(packages).toHaveLength(options.expectedPackageCount);
    expect(packages.reduce((total, regressionPackage) => total + regressionPackage.labs.length, 0))
      .toBe(options.expectedCellCount);

    if (options.matrixScope === "full") {
      expect(options.allowPartial, "The default release matrix must not use the partial-run escape hatch.").toBe(false);
      expect(options.fullMatrixRequested).toBe(true);
      expect(options.explicitFilters).toEqual([]);
      expect(options.selectedLabs).toHaveLength(options.allHkLabs.length);
      expect(options.languages).toEqual(["en", "zh", "zh-Hans"]);
      expect(options.themes).toEqual(["light", "dark"]);
      expect(options.viewports).toEqual(["desktop", "tablet", "mobile"]);
      expect(options.expectedCellCount).toBe(HK_VISUALIZATION_EXPECTED_FULL_CELL_COUNT);
      expect(options.expectedPackageCount).toBe(HK_VISUALIZATION_EXPECTED_FULL_PACKAGE_COUNT);
    } else {
      expect(
        options.allowPartial,
        "A filtered/depth-reduced developer run must explicitly opt in with HK_VIZ_ALLOW_PARTIAL=1."
      ).toBe(true);
    }

    expect(manifest.plan.plannedCellIds).toHaveLength(options.expectedCellCount);
    expect(new Set(manifest.plan.plannedCellIds).size).toBe(options.expectedCellCount);
    expect(manifest.plan.packageIds).toHaveLength(options.expectedPackageCount);

    await testInfo.attach("hk-visualization-matrix-manifest.json", {
      body: JSON.stringify(manifest, null, 2),
      contentType: "application/json"
    });
  });

  test("false-pass guard helpers reject broad, untranslated, and non-transition evidence", () => {
    expect(hkVisualizationLocalizationIssues({
      language: "zh",
      target: "formula",
      text: "v = 12 km/h"
    })).toEqual([]);
    expect(hkVisualizationLocalizationIssues({
      language: "zh",
      target: "formula",
      text: "distance = 12 km"
    }).join(" ")).toContain("English prose");
    expect(hkVisualizationLocalizationIssues({
      language: "zh",
      target: "state",
      text: "數線：−3 + 8 = 5"
    })).toEqual([]);
    expect(hkVisualizationLocalizationIssues({
      language: "zh",
      target: "state",
      text: "数线：−3 + 8 = 5"
    }).join(" ")).toContain("Simplified Chinese");
    expect(hkVisualizationLocalizationIssues({
      language: "zh-Hans",
      target: "state",
      text: "數線：−3 + 8 = 5"
    }).join(" ")).toContain("Traditional Chinese");
    expect(hkVisualizationLocalizationIssues({
      language: "zh-Hans",
      target: "control",
      text: "Reset graph"
    })).not.toEqual([]);

    expect(hkVisualizationRequiredContrastRatio(16, 400)).toBe(4.5);
    expect(hkVisualizationRequiredContrastRatio(18.66, 700)).toBe(3);
    expect(hkVisualizationRequiredContrastRatio(24, 400)).toBe(3);
    expect(hkVisualizationEffectiveOpacity([1, 0.5, 0.4])).toBeCloseTo(0.2, 10);
    expect(hkVisualizationEffectiveOpacity([0.8, 2, -1, Number.NaN])).toBe(0);
    expect(hkVisualizationContrastRatio(
      { r: 0, g: 0, b: 0 },
      { r: 255, g: 255, b: 255 }
    )).toBeCloseTo(21, 5);

    const visibleEvidence = {
      ariaHiddenAncestor: false,
      displayNoneAncestor: false,
      effectiveOpacity: 1,
      height: 44,
      hiddenAncestor: false,
      inertAncestor: false,
      pointerEventsNone: false,
      visibilityHidden: false,
      visuallyVisible: true,
      width: 120
    };
    expect(hkVisualizationVisibilityPasses(visibleEvidence, "visual")).toBe(true);
    expect(hkVisualizationVisibilityPasses(visibleEvidence, "learner")).toBe(true);
    expect(hkVisualizationVisibilityPasses(visibleEvidence, "interactive")).toBe(true);
    expect(hkVisualizationVisibilityPasses({ ...visibleEvidence, ariaHiddenAncestor: true }, "visual")).toBe(true);
    expect(hkVisualizationVisibilityPasses({ ...visibleEvidence, ariaHiddenAncestor: true }, "learner")).toBe(false);
    expect(hkVisualizationVisibilityPasses({ ...visibleEvidence, inertAncestor: true }, "interactive")).toBe(false);
    expect(hkVisualizationVisibilityPasses({ ...visibleEvidence, hiddenAncestor: true }, "learner")).toBe(false);
    expect(hkVisualizationVisibilityPasses({ ...visibleEvidence, pointerEventsNone: true }, "learner")).toBe(true);
    expect(hkVisualizationVisibilityPasses({ ...visibleEvidence, pointerEventsNone: true }, "interactive")).toBe(false);
    const transparentEvidence = { ...visibleEvidence, effectiveOpacity: 0, visuallyVisible: false };
    expect(hkVisualizationVisibilityPasses(transparentEvidence, "visual")).toBe(false);
    expect(hkVisualizationPotentiallyTabbable(transparentEvidence, 0, false)).toBe(true);
    expect(hkVisualizationPotentiallyTabbable({ ...transparentEvidence, ariaHiddenAncestor: true }, 0, false)).toBe(true);
    expect(hkVisualizationPotentiallyTabbable({ ...transparentEvidence, inertAncestor: true }, 0, false)).toBe(false);

    const narrowOverlap = {
      areaRatio: 0.08,
      banned: false,
      candidateCount: 2,
      heightRatio: 0.2,
      reason: "Label is intentionally centered inside its own mark.",
      scope: "svg-group" as const,
      widthRatio: 0.4
    };
    expect(hkVisualizationOverlapOwnerRisk(narrowOverlap)).toBe("explicit-narrow-pair");
    expect(hkVisualizationOverlapOwnerRisk({ ...narrowOverlap, candidateCount: 1 }))
      .toBe("too-broad");
    expect(hkVisualizationOverlapOwnerRisk({ ...narrowOverlap, reason: "" })).toBe("missing-reason");
    expect(hkVisualizationOverlapOwnerRisk({ ...narrowOverlap, banned: true })).toBe("banned-owner");
    expect(hkVisualizationOverlapOwnerRisk({ ...narrowOverlap, candidateCount: 7 })).toBe("too-broad");
    expect(hkVisualizationOverlapOwnerRisk({ ...narrowOverlap, areaRatio: 0.7 })).toBe("too-broad");

    const selfPointer = {
      areaRatio: 0.01,
      associatedLabel: false,
      banned: false,
      controlCount: 1,
      explicit: true,
      heightRatio: 0.05,
      self: true,
      widthRatio: 0.05
    };
    expect(hkVisualizationPointerTargetIssues(selfPointer)).toEqual([]);
    expect(hkVisualizationPointerTargetIssues({
      ...selfPointer,
      associatedLabel: true,
      self: false
    })).toEqual([]);
    expect(hkVisualizationPointerTargetIssues({
      ...selfPointer,
      areaRatio: 0.8,
      associatedLabel: false,
      banned: true,
      controlCount: 4,
      heightRatio: 1,
      self: false,
      widthRatio: 1
    })).toEqual(expect.arrayContaining(["banned-owner", "unassociated-ancestor", "shared-controls", "too-broad"]));

    expect(buildHkVisualizationModeExerciseOrder([])).toEqual([]);
    expect(buildHkVisualizationModeExerciseOrder(["only"])).toEqual(["only"]);
    expect(buildHkVisualizationModeExerciseOrder(["first", "second", "third"]))
      .toEqual(["first", "second", "third"]);
    expect(() => buildHkVisualizationModeExerciseOrder(["first", "first"]))
      .toThrow(/duplicate mode ID/);

    const helperSource = readFileSync(
      join(process.cwd(), "tests/e2e/hk-visualization-machine-acceptance-helpers.ts"),
      "utf8"
    );
    const collisionScannerSource = readFileSync(
      join(process.cwd(), "tests/e2e/hk-visualization-collision-scanner.ts"),
      "utf8"
    );
    const scannerVisibilityExport = collisionScannerSource.match(
      /export const (effectiveVisibilityGlobalName)\s*=\s*\n?\s*"[^"]+";/
    );
    expect(
      scannerVisibilityExport,
      "The collision scanner must own one exported effective-visibility global name."
    ).not.toBeNull();
    const scannerVisibilityIdentifier = scannerVisibilityExport?.[1] ?? "";
    const collisionScannerImport = helperSource.match(
      /import\s*\{([^}]*)\}\s*from\s*"\.\/hk-visualization-collision-scanner";/
    );
    expect(
      collisionScannerImport,
      "The machine helper must import its effective-visibility global name from the collision scanner."
    ).not.toBeNull();
    expect(collisionScannerImport?.[1] ?? "").toMatch(
      new RegExp(`\\b${scannerVisibilityIdentifier}\\b`)
    );
    expect(helperSource).toMatch(
      new RegExp(`\\},\\s*${scannerVisibilityIdentifier}\\s*\\);`)
    );
    expect(helperSource).not.toMatch(/Number\(style\.opacity\s*\|\|/);
    expect(helperSource).not.toContain(".isVisible(");
    expect(helperSource).not.toContain("toBeVisible(");
  });

  for (const regressionPackage of packages) {
    test(`${regressionPackage.id} exercises every selected HK lab`, async ({ browser }, testInfo) => {
      const packageCellBudget = regressionPackage.labs.reduce(
        (total, lab) =>
          total +
          hkVisualizationCellDeadlineMs(options.interactionDepth, lab.labId) +
          5_000,
        0,
      );
      test.setTimeout(Math.max(120_000, 45_000 + packageCellBudget));
      testInfo.annotations.push(
        { type: "hk-viz-scope", description: options.matrixScope },
        { type: "hk-viz-interaction-depth", description: options.interactionDepth },
        { type: "hk-viz-package", description: regressionPackage.id }
      );

      const result = await runHkVisualizationPackage({
        baseURL: resolvedBaseURL(testInfo),
        browser,
        options,
        regressionPackage,
        runId: process.env.PLAYWRIGHT_RUN_ID ?? `hk-viz-${process.pid}`,
        testInfo
      });

      await testInfo.attach(`${sanitizeAttachmentName(regressionPackage.id)}.json`, {
        body: JSON.stringify(result, null, 2),
        contentType: "application/json"
      });

      const scrollObservationEvidence =
        aggregateHkVisualizationBrowserScrollObservationReceipts(
          result.cells.map((cell) =>
            buildHkVisualizationBrowserScrollCellPlan({
              cellId: cell.cellId,
              interactions: cell.interactions,
              stateScanLedger: cell.stateScanLedger,
            })
          ),
          result.cells.map((cell) => ({
            cellId: cell.cellId,
            scrollObservationPhasePlan: cell.scrollObservationPhasePlan,
            scrollObservationSets: cell.scrollObservationSets,
          }))
        );
      testInfo.annotations.push({
        type: HK_VISUALIZATION_BROWSER_SCROLL_ANNOTATION_TYPE,
        description: JSON.stringify(scrollObservationEvidence)
      });
      const dependentTransitionEvidence =
        aggregateHkVisualizationBrowserDependentTransitionReceipts(
          scrollObservationEvidence,
          result.cells.map((cell) => ({
            cellId: cell.cellId,
            dependentTransitionSequenceObservations:
              cell.dependentTransitionSequenceObservations,
            labId: cell.labId,
            language: cell.language,
          }))
        );
      testInfo.annotations.push({
        type: HK_VISUALIZATION_BROWSER_DEPENDENT_TRANSITION_ANNOTATION_TYPE,
        description: JSON.stringify(dependentTransitionEvidence)
      });
      const passThroughOracleEvidence =
        aggregateHkVisualizationBrowserPassThroughOracleReceipts(
          scrollObservationEvidence,
          result.cells.map((cell) => ({
            cellId: cell.cellId,
            labId: cell.labId,
            passThroughOracleObservations:
              cell.passThroughOracleObservations,
          }))
        );
      testInfo.annotations.push({
        type: HK_VISUALIZATION_BROWSER_PASS_THROUGH_ORACLE_ANNOTATION_TYPE,
        description: JSON.stringify(passThroughOracleEvidence)
      });
      const passThroughPaintedGeometryPairEvidence =
        aggregateHkVisualizationBrowserPassThroughPaintedGeometryPairReceipts(
          scrollObservationEvidence,
          passThroughOracleEvidence,
        );
      testInfo.annotations.push({
        type:
          HK_VISUALIZATION_BROWSER_PASS_THROUGH_PAINTED_GEOMETRY_PAIR_ANNOTATION_TYPE,
        description: JSON.stringify(passThroughPaintedGeometryPairEvidence)
      });
      const passThroughResetEvidence =
        aggregateHkVisualizationBrowserPassThroughResetReceipts(
          scrollObservationEvidence,
          passThroughOracleEvidence,
          result.cells.map((cell) => ({
            cellId: cell.cellId,
            labId: cell.labId,
            passThroughResetObservations:
              cell.passThroughResetObservations,
          }))
        );
      testInfo.annotations.push({
        type: HK_VISUALIZATION_BROWSER_PASS_THROUGH_RESET_ANNOTATION_TYPE,
        description: JSON.stringify(passThroughResetEvidence)
      });
      const p6AveragesEvidence =
        aggregateHkVisualizationBrowserP6AveragesReceipts(
          scrollObservationEvidence,
          result.cells.map((cell) => ({
            cellId: cell.cellId,
            labId: cell.labId,
            p6AveragesLineGraphObservations:
              cell.p6AveragesLineGraphObservations,
            stateScanLedger: {
              entries: cell.stateScanLedger.entries.map(
                ({ id, phase, reasons }) => ({ id, phase, reasons })
              ),
              executedStateIds: cell.stateScanLedger.executedStateIds,
              plannedStateIds: cell.stateScanLedger.plannedStateIds,
            },
          }))
        );
      testInfo.annotations.push({
        type: HK_VISUALIZATION_BROWSER_P6_AVERAGES_ANNOTATION_TYPE,
        description: JSON.stringify(p6AveragesEvidence)
      });
      const p6BudgetEvidence =
        aggregateHkVisualizationBrowserP6BudgetReceipts(
          scrollObservationEvidence,
          result.cells.map((cell) => ({
            cellId: cell.cellId,
            labId: cell.labId,
            p6BudgetBoundaryObservations:
              cell.p6BudgetBoundaryObservations,
            stateScanLedger: {
              entries: cell.stateScanLedger.entries.map(
                ({ id, modeId, phase, reasons }) => ({
                  id,
                  modeId,
                  phase,
                  reasons,
                })
              ),
              executedStateIds: cell.stateScanLedger.executedStateIds,
              plannedStateIds: cell.stateScanLedger.plannedStateIds,
            },
          }))
        );
      testInfo.annotations.push({
        type: HK_VISUALIZATION_BROWSER_P6_BUDGET_ANNOTATION_TYPE,
        description: JSON.stringify(p6BudgetEvidence)
      });

      executedPackageIds.push(regressionPackage.id);
      executedCellIds.push(...result.package.executedCellIds);

      expect(result.summary.plannedCellCount, "The package ledger must retain every planned cell.")
        .toBe(regressionPackage.labs.length);
      expect(result.package.duplicateCellIds, "A package must never execute a cell twice.").toEqual([]);
      expect(result.package.missingCellIds, "Every planned cell must be executed.").toEqual([]);
      expect(result.package.executedCellIds, "Executed cell IDs must exactly match the package plan.")
        .toEqual(result.package.plannedCellIds);
      expect(result.summary.executedCellCount, "Every lab in the package must produce an execution ledger entry.")
        .toBe(regressionPackage.labs.length);
      if (result.status === "failed") {
        throw new Error(formatHkVisualizationPackageFailure(result));
      }
    });
  }
});

function resolvedBaseURL(testInfo: TestInfo) {
  const configuredBaseURL = testInfo.project.use.baseURL;
  if (typeof configuredBaseURL === "string" && configuredBaseURL.trim()) return configuredBaseURL;
  const port = Number(process.env.PLAYWRIGHT_PORT ?? 3020);
  return process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;
}

function sanitizeAttachmentName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-");
}
