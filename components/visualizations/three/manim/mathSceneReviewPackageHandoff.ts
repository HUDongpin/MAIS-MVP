import type { ManimReviewPackageEvidence, ManimReviewPackageId } from "./mathSceneReviewPackages";

export const MATH_SCENE_REVIEW_PACKAGE_HANDOFF_SOURCE_CONTRACT =
  "MAIS Manim v2 review package handoff: package-level owners, consumers, focused checks, adjacent checks, and acceptance criteria for reviewable source slices" as const;

export type ManimReviewPackageHandoffCriterion =
  | "all-files-classified"
  | "anchors-present"
  | "focused-tests-pass"
  | "adjacent-tests-pass"
  | "type-boundary-clean"
  | "downstream-consumers-listed";

export type ManimReviewPackageHandoffStatus =
  | "blocked-pending-review-package-fix"
  | "ready-for-package-review";

export type ManimReviewPackageHandoffRow = {
  acceptanceCriteria: readonly ManimReviewPackageHandoffCriterion[];
  adjacentTestCommand: string;
  anchorFileNames: string[];
  consumerAgentIds: readonly string[];
  fileCount: number;
  focusedTestCommand: string;
  ownerAgentIds: readonly string[];
  packageId: ManimReviewPackageId;
  productionFileCount: number;
  reviewStatus: ManimReviewPackageHandoffStatus;
  suggestedTestFileNames: string[];
  testFileCount: number;
  title: string;
  unclassifiedFileNames: string[];
};

export type ManimReviewPackageHandoffMatrix = {
  fileCount: number;
  packageCount: number;
  readyPackageCount: number;
  rows: ManimReviewPackageHandoffRow[];
  sourceContract: typeof MATH_SCENE_REVIEW_PACKAGE_HANDOFF_SOURCE_CONTRACT;
  status: ManimReviewPackageHandoffStatus;
  summary: string;
  unclassifiedFileCount: number;
};

const manimDir = "components/visualizations/three/manim";

const baseAcceptanceCriteria: readonly ManimReviewPackageHandoffCriterion[] = [
  "all-files-classified",
  "anchors-present",
  "focused-tests-pass",
  "adjacent-tests-pass",
  "type-boundary-clean"
];

const consumersByPackage: Record<ManimReviewPackageId, readonly string[]> = {
  animation: ["A06"],
  authoring: ["A06"],
  camera: ["A06"],
  evidence: ["A06", "A11", "A18", "A22"],
  formula: ["A06"],
  integration: ["A06", "A11", "A22"],
  mobject: ["A06"],
  scene: ["A06"]
};

function uniqueFileNames(fileNames: string[]) {
  return [...new Set(fileNames)];
}

function commandForTestFiles(fileNames: string[]) {
  const testPaths = uniqueFileNames(fileNames).map((fileName) => `${manimDir}/${fileName}`);
  return `./node_modules/.bin/tsx --test ${testPaths.join(" ")}`;
}

function adjacentTestFileNames(reviewPackage: ManimReviewPackageEvidence) {
  return uniqueFileNames([
    ...reviewPackage.suggestedTestFileNames,
    "mathSceneReviewPackages.test.ts",
    reviewPackage.id === "evidence" ? "mathSceneTeachingQuality.test.ts" : "",
    reviewPackage.id === "integration" ? "mathSceneSmokeHook.test.ts" : ""
  ].filter(Boolean));
}

function packageAcceptanceCriteria(reviewPackage: ManimReviewPackageEvidence) {
  if (["evidence", "integration"].includes(reviewPackage.id)) {
    return [...baseAcceptanceCriteria, "downstream-consumers-listed"] as const;
  }

  return baseAcceptanceCriteria;
}

function packageReady(reviewPackage: ManimReviewPackageEvidence) {
  return (
    reviewPackage.fileCount > 0 &&
    reviewPackage.anchorFileNames.length > 0 &&
    reviewPackage.suggestedTestFileNames.length > 0 &&
    reviewPackage.unclassifiedFileNames.length === 0
  );
}

function handoffRow(reviewPackage: ManimReviewPackageEvidence): ManimReviewPackageHandoffRow {
  const reviewStatus = packageReady(reviewPackage)
    ? "ready-for-package-review"
    : "blocked-pending-review-package-fix";

  return {
    acceptanceCriteria: packageAcceptanceCriteria(reviewPackage),
    adjacentTestCommand: commandForTestFiles(adjacentTestFileNames(reviewPackage)),
    anchorFileNames: reviewPackage.anchorFileNames,
    consumerAgentIds: consumersByPackage[reviewPackage.id],
    fileCount: reviewPackage.fileCount,
    focusedTestCommand: commandForTestFiles(reviewPackage.suggestedTestFileNames),
    ownerAgentIds: ["A06"],
    packageId: reviewPackage.id,
    productionFileCount: reviewPackage.productionFileCount,
    reviewStatus,
    suggestedTestFileNames: reviewPackage.suggestedTestFileNames,
    testFileCount: reviewPackage.testFileCount,
    title: reviewPackage.title,
    unclassifiedFileNames: reviewPackage.unclassifiedFileNames
  };
}

export function buildManimReviewPackageHandoffMatrix(
  reviewPackages: ManimReviewPackageEvidence[]
): ManimReviewPackageHandoffMatrix {
  const rows = reviewPackages.map(handoffRow);
  const fileCount = rows.reduce((sum, row) => sum + row.fileCount, 0);
  const readyPackageCount = rows.filter((row) => row.reviewStatus === "ready-for-package-review").length;
  const unclassifiedFileCount = rows.reduce((sum, row) => sum + row.unclassifiedFileNames.length, 0);
  const status =
    readyPackageCount === rows.length && unclassifiedFileCount === 0
      ? "ready-for-package-review"
      : "blocked-pending-review-package-fix";

  return {
    fileCount,
    packageCount: rows.length,
    readyPackageCount,
    rows,
    sourceContract: MATH_SCENE_REVIEW_PACKAGE_HANDOFF_SOURCE_CONTRACT,
    status,
    summary: rows.map((row) => `${row.packageId}=${row.reviewStatus}`).join(";"),
    unclassifiedFileCount
  };
}

export function manimReviewPackageHandoffDataAttributes(matrix: ManimReviewPackageHandoffMatrix) {
  return {
    "data-viz-manim-review-handoff-criteria-manifest": matrix.rows
      .map((row) => `${row.packageId}=${row.acceptanceCriteria.join("|")}`)
      .join(";"),
    "data-viz-manim-review-handoff-owner-manifest": matrix.rows
      .map((row) => `${row.packageId}=${row.ownerAgentIds.join("|")}`)
      .join(";"),
    "data-viz-manim-review-handoff-consumer-manifest": matrix.rows
      .map((row) => `${row.packageId}=${row.consumerAgentIds.join("|")}`)
      .join(";"),
    "data-viz-manim-review-handoff-focused-test-manifest": matrix.rows
      .map((row) => `${row.packageId}=${row.focusedTestCommand}`)
      .join(";"),
    "data-viz-manim-review-handoff-adjacent-test-manifest": matrix.rows
      .map((row) => `${row.packageId}=${row.adjacentTestCommand}`)
      .join(";"),
    "data-viz-manim-review-handoff-anchor-manifest": matrix.rows
      .map((row) => `${row.packageId}=${row.anchorFileNames.join("|")}`)
      .join(";"),
    "data-viz-manim-review-handoff-suggested-test-file-manifest": matrix.rows
      .map((row) => `${row.packageId}=${row.suggestedTestFileNames.join("|")}`)
      .join(";"),
    "data-viz-manim-review-handoff-package-size-manifest": matrix.rows
      .map(
        (row) =>
          `${row.packageId}=files:${row.fileCount}|prod:${row.productionFileCount}|tests:${row.testFileCount}|unclassified:${row.unclassifiedFileNames.length}`
      )
      .join(";"),
    "data-viz-manim-review-handoff-unclassified-file-manifest": matrix.rows
      .map(
        (row) =>
          `${row.packageId}=${
            row.unclassifiedFileNames.length > 0 ? row.unclassifiedFileNames.join("|") : "none"
          }`
      )
      .join(";"),
    "data-viz-manim-review-handoff-package-count": String(matrix.packageCount),
    "data-viz-manim-review-handoff-ready-count": String(matrix.readyPackageCount),
    "data-viz-manim-review-handoff-source-contract": matrix.sourceContract,
    "data-viz-manim-review-handoff-status": matrix.status,
    "data-viz-manim-review-handoff-summary": matrix.summary,
    "data-viz-manim-review-handoff-unclassified-count": String(matrix.unclassifiedFileCount)
  } as const;
}
