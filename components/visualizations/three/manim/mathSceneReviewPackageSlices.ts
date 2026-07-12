import type { ManimReviewPackageEvidence, ManimReviewPackageId } from "./mathSceneReviewPackages";

export const MATH_SCENE_REVIEW_PACKAGE_SLICE_SOURCE_CONTRACT =
  "MAIS Manim v2 review package slices: bounded sub-package review batches derived from the deterministic A06 package matrix" as const;

export type ManimReviewPackageSliceCriterion =
  | "bounded-file-count"
  | "single-package-ownership"
  | "all-files-covered-once"
  | "focused-tests-pass"
  | "adjacent-tests-pass"
  | "type-boundary-clean";

export type ManimReviewPackageSliceStatus =
  | "blocked-pending-slice-fix"
  | "ready-for-slice-review";

export type ManimReviewPackageSliceTestPairingStatus =
  | "all-units-paired"
  | "no-direct-tests"
  | "some-units-unpaired";

export type ManimReviewPackageSliceReviewAction =
  | "inspect-untested-units-and-run-adjacent-tests"
  | "run-focused-and-adjacent-tests"
  | "run-package-suggested-tests-and-adjacent-tests";

export type ManimReviewPackageSliceConsumerGate =
  | "A06-source-review"
  | "A11-browser-regression-routing"
  | "A18-teaching-quality-routing"
  | "A22-clean-release-routing";

export type ManimReviewPackageSliceConsumerGateStatus =
  | "ready-for-slice-review"
  | "pending-browser-regression-evidence"
  | "pending-teaching-quality-review"
  | "pending-clean-release-evidence";

export type ManimReviewPackageSliceConsumerGateEvidenceRequirement =
  | "source-review-note"
  | "browser-regression-transcript"
  | "teaching-quality-decision-record"
  | "clean-release-transcript";

export type ManimReviewPackageSlice = {
  acceptanceCriteria: readonly ManimReviewPackageSliceCriterion[];
  adjacentTestCommand: string;
  anchorFileNames: string[];
  consumerGateIds: readonly ManimReviewPackageSliceConsumerGate[];
  fileCount: number;
  fileNames: string[];
  focusedTestCommand: string;
  ownerAgentIds: readonly string[];
  packageId: ManimReviewPackageId;
  pairedReviewUnitCount: number;
  pairedReviewUnitNames: string[];
  productionFileCount: number;
  reviewFocus: string;
  reviewAction: ManimReviewPackageSliceReviewAction;
  reviewUnitCount: number;
  reviewUnitNames: string[];
  sliceId: string;
  sliceIndex: number;
  sourceContract: typeof MATH_SCENE_REVIEW_PACKAGE_SLICE_SOURCE_CONTRACT;
  status: ManimReviewPackageSliceStatus;
  testPairingStatus: ManimReviewPackageSliceTestPairingStatus;
  testFileCount: number;
  title: string;
  untestedReviewUnitCount: number;
  untestedReviewUnitNames: string[];
};

export type ManimReviewPackageSliceMatrix = {
  duplicateFileNames: string[];
  fileCount: number;
  largestSliceFileCount: number;
  maxFilesPerSlice: number;
  missingFileNames: string[];
  packageCount: number;
  rows: ManimReviewPackageSlice[];
  sliceCount: number;
  sourceContract: typeof MATH_SCENE_REVIEW_PACKAGE_SLICE_SOURCE_CONTRACT;
  status: ManimReviewPackageSliceStatus;
  summary: string;
};

export type ManimReviewPackageSliceOptions = {
  maxFilesPerSlice?: number;
};

const manimDir = "components/visualizations/three/manim";
const defaultMaxFilesPerSlice = 24;

const sliceAcceptanceCriteria: readonly ManimReviewPackageSliceCriterion[] = [
  "bounded-file-count",
  "single-package-ownership",
  "all-files-covered-once",
  "focused-tests-pass",
  "adjacent-tests-pass",
  "type-boundary-clean"
];

const testPairingStatusOrder: readonly ManimReviewPackageSliceTestPairingStatus[] = [
  "all-units-paired",
  "some-units-unpaired",
  "no-direct-tests"
];

const reviewActionOrder: readonly ManimReviewPackageSliceReviewAction[] = [
  "run-focused-and-adjacent-tests",
  "inspect-untested-units-and-run-adjacent-tests",
  "run-package-suggested-tests-and-adjacent-tests"
];

const consumerGateOrder: readonly ManimReviewPackageSliceConsumerGate[] = [
  "A06-source-review",
  "A11-browser-regression-routing",
  "A18-teaching-quality-routing",
  "A22-clean-release-routing"
];

const consumerGateStatusOrder: readonly ManimReviewPackageSliceConsumerGateStatus[] = [
  "ready-for-slice-review",
  "pending-browser-regression-evidence",
  "pending-teaching-quality-review",
  "pending-clean-release-evidence"
];

const consumerGateEvidenceRequirementOrder: readonly ManimReviewPackageSliceConsumerGateEvidenceRequirement[] = [
  "source-review-note",
  "browser-regression-transcript",
  "teaching-quality-decision-record",
  "clean-release-transcript"
];

function isTestFile(fileName: string) {
  return fileName.endsWith(".test.ts") || fileName.endsWith(".test.tsx");
}

function productionFileCount(fileNames: readonly string[]) {
  return fileNames.filter((fileName) => !isTestFile(fileName)).length;
}

function sortFileNames(fileNames: readonly string[]) {
  return [...fileNames].sort((left, right) => left.localeCompare(right));
}

function uniqueFileNames(fileNames: readonly string[]) {
  return [...new Set(fileNames)];
}

function serializedFileNames(fileNames: readonly string[]) {
  return fileNames.length > 0 ? fileNames.join("|") : "none";
}

function withoutTestSuffix(fileName: string) {
  return fileName.replace(/\.test(?=\.(ts|tsx)$)/, "");
}

function reviewUnitName(fileName: string) {
  return withoutTestSuffix(fileName).replace(/\.(ts|tsx)$/, "");
}

function reviewUnitNames(fileNames: readonly string[]) {
  return sortFileNames(uniqueFileNames(fileNames.map(reviewUnitName)));
}

function fileNamesByReviewUnit(fileNames: readonly string[]) {
  const fileNamesByUnit = new Map<string, string[]>();

  for (const fileName of fileNames) {
    const unitName = reviewUnitName(fileName);
    fileNamesByUnit.set(unitName, [...(fileNamesByUnit.get(unitName) ?? []), fileName]);
  }

  return fileNamesByUnit;
}

function pairedReviewUnitNames(fileNames: readonly string[]) {
  return [...fileNamesByReviewUnit(fileNames).entries()]
    .filter(([, unitFileNames]) => unitFileNames.some(isTestFile))
    .map(([unitName]) => unitName)
    .sort((left, right) => left.localeCompare(right));
}

function untestedReviewUnitNames(fileNames: readonly string[]) {
  const paired = new Set(pairedReviewUnitNames(fileNames));
  return reviewUnitNames(fileNames).filter((unitName) => !paired.has(unitName));
}

function testPairingStatus(
  pairedReviewUnitCount: number,
  untestedReviewUnitCount: number
): ManimReviewPackageSliceTestPairingStatus {
  if (pairedReviewUnitCount === 0) {
    return "no-direct-tests";
  }

  return untestedReviewUnitCount === 0 ? "all-units-paired" : "some-units-unpaired";
}

function reviewActionForTestPairingStatus(
  pairingStatus: ManimReviewPackageSliceTestPairingStatus
): ManimReviewPackageSliceReviewAction {
  if (pairingStatus === "all-units-paired") {
    return "run-focused-and-adjacent-tests";
  }

  if (pairingStatus === "some-units-unpaired") {
    return "inspect-untested-units-and-run-adjacent-tests";
  }

  return "run-package-suggested-tests-and-adjacent-tests";
}

function consumerGateIdsForPackage(packageId: ManimReviewPackageId): readonly ManimReviewPackageSliceConsumerGate[] {
  const gateIds: ManimReviewPackageSliceConsumerGate[] = [
    "A06-source-review",
    "A11-browser-regression-routing"
  ];

  if (packageId === "evidence") {
    gateIds.push("A18-teaching-quality-routing");
  }

  gateIds.push("A22-clean-release-routing");
  return gateIds;
}

function consumerGateStatusForGate(
  gateId: ManimReviewPackageSliceConsumerGate
): ManimReviewPackageSliceConsumerGateStatus {
  if (gateId === "A06-source-review") {
    return "ready-for-slice-review";
  }

  if (gateId === "A11-browser-regression-routing") {
    return "pending-browser-regression-evidence";
  }

  if (gateId === "A18-teaching-quality-routing") {
    return "pending-teaching-quality-review";
  }

  return "pending-clean-release-evidence";
}

function consumerGateEvidenceRequirementForGate(
  gateId: ManimReviewPackageSliceConsumerGate
): ManimReviewPackageSliceConsumerGateEvidenceRequirement {
  if (gateId === "A06-source-review") {
    return "source-review-note";
  }

  if (gateId === "A11-browser-regression-routing") {
    return "browser-regression-transcript";
  }

  if (gateId === "A18-teaching-quality-routing") {
    return "teaching-quality-decision-record";
  }

  return "clean-release-transcript";
}

function consumerGateEvidenceIdForGate(row: ManimReviewPackageSlice, gateId: ManimReviewPackageSliceConsumerGate) {
  if (gateId === "A06-source-review") {
    return `${row.sliceId}-a06-source-review-note`;
  }

  if (gateId === "A11-browser-regression-routing") {
    return `${row.sliceId}-a11-browser-regression-transcript`;
  }

  if (gateId === "A18-teaching-quality-routing") {
    return `${row.sliceId}-a18-teaching-quality-decision-record`;
  }

  return `${row.sliceId}-a22-clean-release-transcript`;
}

function commandForTestFiles(fileNames: readonly string[]) {
  const testPaths = uniqueFileNames(fileNames).map((fileName) => `${manimDir}/${fileName}`);
  return `./node_modules/.bin/tsx --test ${testPaths.join(" ")}`;
}

function reviewUnits(fileNames: readonly string[]) {
  const unitsByBaseName = new Map<string, string[]>();

  for (const fileName of sortFileNames(fileNames)) {
    const baseName = withoutTestSuffix(fileName);
    unitsByBaseName.set(baseName, [...(unitsByBaseName.get(baseName) ?? []), fileName]);
  }

  return [...unitsByBaseName.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([baseName, unitFileNames]) => ({
      baseName,
      fileNames: sortFileNames(unitFileNames)
    }));
}

function chunkReviewPackage(reviewPackage: ManimReviewPackageEvidence, maxFilesPerSlice: number) {
  const chunks: string[][] = [];
  let currentChunk: string[] = [];
  let currentCount = 0;

  for (const unit of reviewUnits(reviewPackage.fileNames)) {
    const unitFileNames = unit.fileNames;
    const unitSize = unitFileNames.length;

    if (currentChunk.length > 0 && currentCount + unitSize > maxFilesPerSlice) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentCount = 0;
    }

    currentChunk.push(...unitFileNames);
    currentCount += unitSize;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

function sliceFocusedTests(fileNames: readonly string[], suggestedTestFileNames: readonly string[]) {
  const directTests = fileNames.filter(isTestFile);
  return directTests.length > 0 ? directTests : suggestedTestFileNames;
}

function sliceAdjacentTests(focusedTestFileNames: readonly string[]) {
  return uniqueFileNames([
    ...focusedTestFileNames,
    "mathSceneReviewPackageSlices.test.ts",
    "mathSceneReviewPackages.test.ts"
  ]);
}

function sliceReviewFocus(fileNames: readonly string[]) {
  return fileNames
    .slice(0, 4)
    .map((fileName) => withoutTestSuffix(fileName).replace(/\.(ts|tsx)$/, ""))
    .join(",");
}

function sliceRow(
  reviewPackage: ManimReviewPackageEvidence,
  fileNames: string[],
  index: number,
  maxFilesPerSlice: number
): ManimReviewPackageSlice {
  const sortedFileNames = sortFileNames(fileNames);
  const testFileNames = sortedFileNames.filter(isTestFile);
  const focusedTestFileNames = sliceFocusedTests(sortedFileNames, reviewPackage.suggestedTestFileNames);
  const unitNames = reviewUnitNames(sortedFileNames);
  const pairedUnitNames = pairedReviewUnitNames(sortedFileNames);
  const untestedUnitNames = untestedReviewUnitNames(sortedFileNames);
  const pairingStatus = testPairingStatus(pairedUnitNames.length, untestedUnitNames.length);
  const status =
    sortedFileNames.length > 0 && sortedFileNames.length <= maxFilesPerSlice
      ? "ready-for-slice-review"
      : "blocked-pending-slice-fix";

  return {
    acceptanceCriteria: sliceAcceptanceCriteria,
    adjacentTestCommand: commandForTestFiles(sliceAdjacentTests(focusedTestFileNames)),
    anchorFileNames: reviewPackage.anchorFileNames,
    consumerGateIds: consumerGateIdsForPackage(reviewPackage.id),
    fileCount: sortedFileNames.length,
    fileNames: sortedFileNames,
    focusedTestCommand: commandForTestFiles(focusedTestFileNames),
    ownerAgentIds: ["A06"],
    packageId: reviewPackage.id,
    pairedReviewUnitCount: pairedUnitNames.length,
    pairedReviewUnitNames: pairedUnitNames,
    productionFileCount: productionFileCount(sortedFileNames),
    reviewFocus: sliceReviewFocus(sortedFileNames),
    reviewAction: reviewActionForTestPairingStatus(pairingStatus),
    reviewUnitCount: unitNames.length,
    reviewUnitNames: unitNames,
    sliceId: `${reviewPackage.id}-slice-${String(index + 1).padStart(2, "0")}`,
    sliceIndex: index + 1,
    sourceContract: MATH_SCENE_REVIEW_PACKAGE_SLICE_SOURCE_CONTRACT,
    status,
    testPairingStatus: pairingStatus,
    testFileCount: testFileNames.length,
    title: `${reviewPackage.title} Slice ${index + 1}`,
    untestedReviewUnitCount: untestedUnitNames.length,
    untestedReviewUnitNames: untestedUnitNames
  };
}

function duplicateFileNames(fileNames: readonly string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const fileName of fileNames) {
    if (seen.has(fileName)) {
      duplicates.add(fileName);
    }
    seen.add(fileName);
  }

  return sortFileNames([...duplicates]);
}

function missingFileNames(expectedFileNames: readonly string[], actualFileNames: readonly string[]) {
  const actual = new Set(actualFileNames);
  return sortFileNames(expectedFileNames.filter((fileName) => !actual.has(fileName)));
}

function testPairingSummary(rows: readonly ManimReviewPackageSlice[]) {
  const counts = new Map<ManimReviewPackageSliceTestPairingStatus, number>(
    testPairingStatusOrder.map((status) => [status, 0])
  );

  for (const row of rows) {
    counts.set(row.testPairingStatus, (counts.get(row.testPairingStatus) ?? 0) + 1);
  }

  return testPairingStatusOrder.map((status) => `${status}=${counts.get(status) ?? 0}`).join(";");
}

function reviewActionSummary(rows: readonly ManimReviewPackageSlice[]) {
  const counts = new Map<ManimReviewPackageSliceReviewAction, number>(
    reviewActionOrder.map((action) => [action, 0])
  );

  for (const row of rows) {
    counts.set(row.reviewAction, (counts.get(row.reviewAction) ?? 0) + 1);
  }

  return reviewActionOrder.map((action) => `${action}=${counts.get(action) ?? 0}`).join(";");
}

function consumerGateSummary(rows: readonly ManimReviewPackageSlice[]) {
  const counts = new Map<ManimReviewPackageSliceConsumerGate, number>(
    consumerGateOrder.map((gateId) => [gateId, 0])
  );

  for (const row of rows) {
    for (const gateId of row.consumerGateIds) {
      counts.set(gateId, (counts.get(gateId) ?? 0) + 1);
    }
  }

  return consumerGateOrder.map((gateId) => `${gateId}=${counts.get(gateId) ?? 0}`).join(";");
}

function consumerGateStatusManifest(row: ManimReviewPackageSlice) {
  return row.consumerGateIds.map((gateId) => `${gateId}:${consumerGateStatusForGate(gateId)}`).join("|");
}

function consumerGateStatusSummary(rows: readonly ManimReviewPackageSlice[]) {
  const counts = new Map<ManimReviewPackageSliceConsumerGateStatus, number>(
    consumerGateStatusOrder.map((status) => [status, 0])
  );

  for (const row of rows) {
    for (const gateId of row.consumerGateIds) {
      const status = consumerGateStatusForGate(gateId);
      counts.set(status, (counts.get(status) ?? 0) + 1);
    }
  }

  return consumerGateStatusOrder.map((status) => `${status}=${counts.get(status) ?? 0}`).join(";");
}

function consumerGateEvidenceRequirementManifest(row: ManimReviewPackageSlice) {
  return row.consumerGateIds
    .map((gateId) => `${gateId}:${consumerGateEvidenceRequirementForGate(gateId)}`)
    .join("|");
}

function consumerGateEvidenceRequirementSummary(rows: readonly ManimReviewPackageSlice[]) {
  const counts = new Map<ManimReviewPackageSliceConsumerGateEvidenceRequirement, number>(
    consumerGateEvidenceRequirementOrder.map((requirement) => [requirement, 0])
  );

  for (const row of rows) {
    for (const gateId of row.consumerGateIds) {
      const requirement = consumerGateEvidenceRequirementForGate(gateId);
      counts.set(requirement, (counts.get(requirement) ?? 0) + 1);
    }
  }

  return consumerGateEvidenceRequirementOrder
    .map((requirement) => `${requirement}=${counts.get(requirement) ?? 0}`)
    .join(";");
}

function consumerGateEvidenceIdManifest(row: ManimReviewPackageSlice) {
  return row.consumerGateIds.map((gateId) => `${gateId}:${consumerGateEvidenceIdForGate(row, gateId)}`).join("|");
}

function consumerGateEvidenceIdSummary(rows: readonly ManimReviewPackageSlice[]) {
  const ids = rows.flatMap((row) =>
    row.consumerGateIds.map((gateId) => consumerGateEvidenceIdForGate(row, gateId))
  );
  const counts = new Map<ManimReviewPackageSliceConsumerGate, number>(
    consumerGateOrder.map((gateId) => [gateId, 0])
  );

  for (const row of rows) {
    for (const gateId of row.consumerGateIds) {
      counts.set(gateId, (counts.get(gateId) ?? 0) + 1);
    }
  }

  return [
    `total=${ids.length}`,
    `unique=${new Set(ids).size}`,
    ...consumerGateOrder.map((gateId) => `${gateId}=${counts.get(gateId) ?? 0}`)
  ].join(";");
}

function reviewUnitCoverageSummary(row: ManimReviewPackageSlice) {
  return [
    `units:${row.reviewUnitCount}`,
    `paired:${row.pairedReviewUnitCount}`,
    `untested:${row.untestedReviewUnitCount}`,
    `status:${row.testPairingStatus}`
  ].join("|");
}

function reviewActionDetailSummary(row: ManimReviewPackageSlice) {
  return [
    `action:${row.reviewAction}`,
    `focused:${row.focusedTestCommand}`,
    `adjacent:${row.adjacentTestCommand}`,
    `untested:${serializedFileNames(row.untestedReviewUnitNames)}`
  ].join("|");
}

export function buildManimReviewPackageSliceMatrix(
  reviewPackages: readonly ManimReviewPackageEvidence[],
  options: ManimReviewPackageSliceOptions = {}
): ManimReviewPackageSliceMatrix {
  const maxFilesPerSlice = options.maxFilesPerSlice ?? defaultMaxFilesPerSlice;
  const rows = reviewPackages.flatMap((reviewPackage) =>
    chunkReviewPackage(reviewPackage, maxFilesPerSlice).map((fileNames, index) =>
      sliceRow(reviewPackage, fileNames, index, maxFilesPerSlice)
    )
  );
  const expectedFileNames = sortFileNames(reviewPackages.flatMap((reviewPackage) => reviewPackage.fileNames));
  const actualFileNames = sortFileNames(rows.flatMap((row) => row.fileNames));
  const duplicates = duplicateFileNames(actualFileNames);
  const missing = missingFileNames(expectedFileNames, actualFileNames);
  const largestSliceFileCount = rows.reduce((max, row) => Math.max(max, row.fileCount), 0);
  const ready =
    rows.every((row) => row.status === "ready-for-slice-review") &&
    duplicates.length === 0 &&
    missing.length === 0 &&
    largestSliceFileCount <= maxFilesPerSlice;
  const sliceCountsByPackage = new Map<ManimReviewPackageId, number>();

  for (const row of rows) {
    sliceCountsByPackage.set(row.packageId, (sliceCountsByPackage.get(row.packageId) ?? 0) + 1);
  }

  return {
    duplicateFileNames: duplicates,
    fileCount: expectedFileNames.length,
    largestSliceFileCount,
    maxFilesPerSlice,
    missingFileNames: missing,
    packageCount: reviewPackages.length,
    rows,
    sliceCount: rows.length,
    sourceContract: MATH_SCENE_REVIEW_PACKAGE_SLICE_SOURCE_CONTRACT,
    status: ready ? "ready-for-slice-review" : "blocked-pending-slice-fix",
    summary: [...sliceCountsByPackage.entries()]
      .map(([packageId, sliceCount]) => `${packageId}=${sliceCount}`)
      .join(";")
  };
}

export function manimReviewPackageSliceDataAttributes(matrix: ManimReviewPackageSliceMatrix) {
  return {
    "data-viz-manim-review-slice-duplicate-count": String(matrix.duplicateFileNames.length),
    "data-viz-manim-review-slice-file-count": String(matrix.fileCount),
    "data-viz-manim-review-slice-largest-count": String(matrix.largestSliceFileCount),
    "data-viz-manim-review-slice-max-files": String(matrix.maxFilesPerSlice),
    "data-viz-manim-review-slice-missing-count": String(matrix.missingFileNames.length),
    "data-viz-manim-review-slice-package-count": String(matrix.packageCount),
    "data-viz-manim-review-slice-slice-count": String(matrix.sliceCount),
    "data-viz-manim-review-slice-ids": matrix.rows.map((row) => row.sliceId).join(","),
    "data-viz-manim-review-slice-criteria-manifest": matrix.rows
      .map((row) => `${row.sliceId}=${row.acceptanceCriteria.join("|")}`)
      .join(";"),
    "data-viz-manim-review-slice-file-manifest": matrix.rows
      .map((row) => `${row.sliceId}=${row.fileNames.join("|")}`)
      .join(";"),
    "data-viz-manim-review-slice-production-file-manifest": matrix.rows
      .map(
        (row) =>
          `${row.sliceId}=${serializedFileNames(row.fileNames.filter((fileName) => !isTestFile(fileName)))}`
      )
      .join(";"),
    "data-viz-manim-review-slice-test-file-manifest": matrix.rows
      .map(
        (row) =>
          `${row.sliceId}=${serializedFileNames(row.fileNames.filter((fileName) => isTestFile(fileName)))}`
      )
      .join(";"),
    "data-viz-manim-review-slice-review-unit-manifest": matrix.rows
      .map((row) => `${row.sliceId}=${serializedFileNames(row.reviewUnitNames)}`)
      .join(";"),
    "data-viz-manim-review-slice-review-unit-count-manifest": matrix.rows
      .map((row) => `${row.sliceId}=${row.reviewUnitCount}`)
      .join(";"),
    "data-viz-manim-review-slice-paired-review-unit-manifest": matrix.rows
      .map((row) => `${row.sliceId}=${serializedFileNames(row.pairedReviewUnitNames)}`)
      .join(";"),
    "data-viz-manim-review-slice-paired-review-unit-count-manifest": matrix.rows
      .map((row) => `${row.sliceId}=${row.pairedReviewUnitCount}`)
      .join(";"),
    "data-viz-manim-review-slice-untested-review-unit-manifest": matrix.rows
      .map((row) => `${row.sliceId}=${serializedFileNames(row.untestedReviewUnitNames)}`)
      .join(";"),
    "data-viz-manim-review-slice-untested-review-unit-count-manifest": matrix.rows
      .map((row) => `${row.sliceId}=${row.untestedReviewUnitCount}`)
      .join(";"),
    "data-viz-manim-review-slice-test-pairing-status-manifest": matrix.rows
      .map((row) => `${row.sliceId}=${row.testPairingStatus}`)
      .join(";"),
    "data-viz-manim-review-slice-review-unit-coverage-manifest": matrix.rows
      .map((row) => `${row.sliceId}=${reviewUnitCoverageSummary(row)}`)
      .join(";"),
    "data-viz-manim-review-slice-review-action-manifest": matrix.rows
      .map((row) => `${row.sliceId}=${row.reviewAction}`)
      .join(";"),
    "data-viz-manim-review-slice-consumer-gate-manifest": matrix.rows
      .map((row) => `${row.sliceId}=${row.consumerGateIds.join("|")}`)
      .join(";"),
    "data-viz-manim-review-slice-consumer-gate-status-manifest": matrix.rows
      .map((row) => `${row.sliceId}=${consumerGateStatusManifest(row)}`)
      .join(";"),
    "data-viz-manim-review-slice-consumer-gate-evidence-requirement-manifest": matrix.rows
      .map((row) => `${row.sliceId}=${consumerGateEvidenceRequirementManifest(row)}`)
      .join(";"),
    "data-viz-manim-review-slice-consumer-gate-evidence-id-manifest": matrix.rows
      .map((row) => `${row.sliceId}=${consumerGateEvidenceIdManifest(row)}`)
      .join(";"),
    "data-viz-manim-review-slice-review-action-detail-manifest": matrix.rows
      .map((row) => `${row.sliceId}=${reviewActionDetailSummary(row)}`)
      .join(";"),
    "data-viz-manim-review-slice-focused-test-manifest": matrix.rows
      .map((row) => `${row.sliceId}=${row.focusedTestCommand}`)
      .join(";"),
    "data-viz-manim-review-slice-adjacent-test-manifest": matrix.rows
      .map((row) => `${row.sliceId}=${row.adjacentTestCommand}`)
      .join(";"),
    "data-viz-manim-review-slice-package-manifest": matrix.rows
      .map((row) => `${row.sliceId}=${row.packageId}`)
      .join(";"),
    "data-viz-manim-review-slice-owner-manifest": matrix.rows
      .map((row) => `${row.sliceId}=${row.ownerAgentIds.join("|")}`)
      .join(";"),
    "data-viz-manim-review-slice-status-manifest": matrix.rows
      .map((row) => `${row.sliceId}=${row.status}`)
      .join(";"),
    "data-viz-manim-review-slice-title-manifest": matrix.rows
      .map((row) => `${row.sliceId}=${row.title}`)
      .join(";"),
    "data-viz-manim-review-slice-review-focus-manifest": matrix.rows
      .map((row) => `${row.sliceId}=${row.reviewFocus}`)
      .join(";"),
    "data-viz-manim-review-slice-size-manifest": matrix.rows
      .map(
        (row) =>
          `${row.sliceId}=files:${row.fileCount}|prod:${row.productionFileCount}|tests:${row.testFileCount}`
      )
      .join(";"),
    "data-viz-manim-review-slice-index-manifest": matrix.rows
      .map((row) => `${row.sliceId}=${row.sliceIndex}`)
      .join(";"),
    "data-viz-manim-review-slice-anchor-manifest": matrix.rows
      .map((row) => `${row.sliceId}=${row.anchorFileNames.join("|")}`)
      .join(";"),
    "data-viz-manim-review-slice-source-contract-manifest": matrix.rows
      .map((row) => `${row.sliceId}=${row.sourceContract}`)
      .join(";"),
    "data-viz-manim-review-slice-source-contract": matrix.sourceContract,
    "data-viz-manim-review-slice-status": matrix.status,
    "data-viz-manim-review-slice-consumer-gate-summary": consumerGateSummary(matrix.rows),
    "data-viz-manim-review-slice-consumer-gate-status-summary": consumerGateStatusSummary(matrix.rows),
    "data-viz-manim-review-slice-consumer-gate-evidence-requirement-summary": consumerGateEvidenceRequirementSummary(matrix.rows),
    "data-viz-manim-review-slice-consumer-gate-evidence-id-summary": consumerGateEvidenceIdSummary(matrix.rows),
    "data-viz-manim-review-slice-review-action-summary": reviewActionSummary(matrix.rows),
    "data-viz-manim-review-slice-test-pairing-summary": testPairingSummary(matrix.rows),
    "data-viz-manim-review-slice-summary": matrix.summary
  } as const;
}
