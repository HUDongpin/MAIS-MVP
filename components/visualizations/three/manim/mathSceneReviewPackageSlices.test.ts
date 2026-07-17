import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { buildManimReviewPackageMatrix, classifyManimReviewPackage } from "./mathSceneReviewPackages";
import {
  buildManimReviewPackageSliceMatrix,
  manimReviewPackageSliceDataAttributes,
  MATH_SCENE_REVIEW_PACKAGE_SLICE_SOURCE_CONTRACT
} from "./mathSceneReviewPackageSlices";

const manimDir = "components/visualizations/three/manim";
const maxFilesPerSlice = 24;

function currentManimFileNames() {
  return fs
    .readdirSync(manimDir)
    .filter((fileName) => [".ts", ".tsx"].includes(path.extname(fileName)))
    .sort();
}

function isReviewTestFile(fileName: string) {
  return fileName.endsWith(".test.ts") || fileName.endsWith(".test.tsx");
}

function serializedReviewFileNames(fileNames: readonly string[]) {
  return fileNames.length > 0 ? fileNames.join("|") : "none";
}

function reviewUnitName(fileName: string) {
  return fileName.replace(/\.test(?=\.(ts|tsx)$)/, "").replace(/\.(ts|tsx)$/, "");
}

function reviewUnitNames(fileNames: readonly string[]) {
  return [...new Set(fileNames.map(reviewUnitName))].sort((left, right) => left.localeCompare(right));
}

function serializedReviewUnitNames(fileNames: readonly string[]) {
  const unitNames = reviewUnitNames(fileNames);
  return unitNames.length > 0 ? unitNames.join("|") : "none";
}

function pairedReviewUnitNames(fileNames: readonly string[]) {
  const fileNamesByUnit = new Map<string, string[]>();

  for (const fileName of fileNames) {
    const unitName = reviewUnitName(fileName);
    fileNamesByUnit.set(unitName, [...(fileNamesByUnit.get(unitName) ?? []), fileName]);
  }

  return [...fileNamesByUnit.entries()]
    .filter(([, unitFileNames]) => unitFileNames.some((fileName) => isReviewTestFile(fileName)))
    .map(([unitName]) => unitName)
    .sort((left, right) => left.localeCompare(right));
}

function untestedReviewUnitNames(fileNames: readonly string[]) {
  const paired = new Set(pairedReviewUnitNames(fileNames));
  return reviewUnitNames(fileNames).filter((unitName) => !paired.has(unitName));
}

function serializedPairedReviewUnitNames(fileNames: readonly string[]) {
  const unitNames = pairedReviewUnitNames(fileNames);
  return unitNames.length > 0 ? unitNames.join("|") : "none";
}

function serializedUntestedReviewUnitNames(fileNames: readonly string[]) {
  const unitNames = untestedReviewUnitNames(fileNames);
  return unitNames.length > 0 ? unitNames.join("|") : "none";
}

function expectedTestPairingStatus(fileNames: readonly string[]) {
  const pairedUnitCount = pairedReviewUnitNames(fileNames).length;
  const untestedUnitCount = untestedReviewUnitNames(fileNames).length;

  if (pairedUnitCount === 0) {
    return "no-direct-tests";
  }

  return untestedUnitCount === 0 ? "all-units-paired" : "some-units-unpaired";
}

function expectedReviewAction(fileNames: readonly string[]) {
  const status = expectedTestPairingStatus(fileNames);

  if (status === "all-units-paired") {
    return "run-focused-and-adjacent-tests";
  }

  if (status === "some-units-unpaired") {
    return "inspect-untested-units-and-run-adjacent-tests";
  }

  return "run-package-suggested-tests-and-adjacent-tests";
}

const testPairingStatusOrder = ["all-units-paired", "some-units-unpaired", "no-direct-tests"] as const;
const reviewActionOrder = [
  "run-focused-and-adjacent-tests",
  "inspect-untested-units-and-run-adjacent-tests",
  "run-package-suggested-tests-and-adjacent-tests"
] as const;
const consumerGateOrder = [
  "A06-source-review",
  "A11-browser-regression-routing",
  "A18-teaching-quality-routing",
  "A22-clean-release-routing"
] as const;
const consumerGateStatusOrder = [
  "ready-for-slice-review",
  "pending-browser-regression-evidence",
  "pending-teaching-quality-review",
  "pending-clean-release-evidence"
] as const;
const consumerGateEvidenceRequirementOrder = [
  "source-review-note",
  "browser-regression-transcript",
  "teaching-quality-decision-record",
  "clean-release-transcript"
] as const;

type ConsumerGateId = (typeof consumerGateOrder)[number];

type ReviewSliceFixtureRow = ReturnType<typeof sliceFixture>["rows"][number];

function testPairingSummary(rows: readonly ReviewSliceFixtureRow[]) {
  const counts = new Map<(typeof testPairingStatusOrder)[number], number>(
    testPairingStatusOrder.map((status) => [status, 0])
  );

  for (const row of rows) {
    const status = expectedTestPairingStatus(row.fileNames);
    counts.set(status, (counts.get(status) ?? 0) + 1);
  }

  return testPairingStatusOrder.map((status) => `${status}=${counts.get(status) ?? 0}`).join(";");
}

function reviewActionSummary(rows: readonly ReviewSliceFixtureRow[]) {
  const counts = new Map<(typeof reviewActionOrder)[number], number>(
    reviewActionOrder.map((action) => [action, 0])
  );

  for (const row of rows) {
    const action = expectedReviewAction(row.fileNames);
    counts.set(action, (counts.get(action) ?? 0) + 1);
  }

  return reviewActionOrder.map((action) => `${action}=${counts.get(action) ?? 0}`).join(";");
}

function expectedConsumerGateIds(slice: ReviewSliceFixtureRow) {
  const gateIds: ConsumerGateId[] = [
    "A06-source-review",
    "A11-browser-regression-routing"
  ];

  if (slice.packageId === "evidence") {
    gateIds.push("A18-teaching-quality-routing");
  }

  gateIds.push("A22-clean-release-routing");
  return gateIds;
}

function expectedConsumerGateStatus(gateId: ConsumerGateId) {
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

function expectedConsumerGateEvidenceRequirement(gateId: ConsumerGateId) {
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

function expectedConsumerGateEvidenceId(slice: ReviewSliceFixtureRow, gateId: ConsumerGateId) {
  if (gateId === "A06-source-review") {
    return `${slice.sliceId}-a06-source-review-note`;
  }

  if (gateId === "A11-browser-regression-routing") {
    return `${slice.sliceId}-a11-browser-regression-transcript`;
  }

  if (gateId === "A18-teaching-quality-routing") {
    return `${slice.sliceId}-a18-teaching-quality-decision-record`;
  }

  return `${slice.sliceId}-a22-clean-release-transcript`;
}

function consumerGateSummary(rows: readonly ReviewSliceFixtureRow[]) {
  const counts = new Map<(typeof consumerGateOrder)[number], number>(
    consumerGateOrder.map((gateId) => [gateId, 0])
  );

  for (const row of rows) {
    for (const gateId of expectedConsumerGateIds(row)) {
      counts.set(gateId, (counts.get(gateId) ?? 0) + 1);
    }
  }

  return consumerGateOrder.map((gateId) => `${gateId}=${counts.get(gateId) ?? 0}`).join(";");
}

function consumerGateStatusManifest(slice: ReviewSliceFixtureRow) {
  return expectedConsumerGateIds(slice)
    .map((gateId) => `${gateId}:${expectedConsumerGateStatus(gateId)}`)
    .join("|");
}

function consumerGateStatusSummary(rows: readonly ReviewSliceFixtureRow[]) {
  const counts = new Map<(typeof consumerGateStatusOrder)[number], number>(
    consumerGateStatusOrder.map((status) => [status, 0])
  );

  for (const row of rows) {
    for (const gateId of expectedConsumerGateIds(row)) {
      const status = expectedConsumerGateStatus(gateId);
      counts.set(status, (counts.get(status) ?? 0) + 1);
    }
  }

  return consumerGateStatusOrder.map((status) => `${status}=${counts.get(status) ?? 0}`).join(";");
}

function consumerGateEvidenceRequirementManifest(slice: ReviewSliceFixtureRow) {
  return expectedConsumerGateIds(slice)
    .map((gateId) => `${gateId}:${expectedConsumerGateEvidenceRequirement(gateId)}`)
    .join("|");
}

function consumerGateEvidenceRequirementSummary(rows: readonly ReviewSliceFixtureRow[]) {
  const counts = new Map<(typeof consumerGateEvidenceRequirementOrder)[number], number>(
    consumerGateEvidenceRequirementOrder.map((requirement) => [requirement, 0])
  );

  for (const row of rows) {
    for (const gateId of expectedConsumerGateIds(row)) {
      const requirement = expectedConsumerGateEvidenceRequirement(gateId);
      counts.set(requirement, (counts.get(requirement) ?? 0) + 1);
    }
  }

  return consumerGateEvidenceRequirementOrder
    .map((requirement) => `${requirement}=${counts.get(requirement) ?? 0}`)
    .join(";");
}

function consumerGateEvidenceIdManifest(slice: ReviewSliceFixtureRow) {
  return expectedConsumerGateIds(slice)
    .map((gateId) => `${gateId}:${expectedConsumerGateEvidenceId(slice, gateId)}`)
    .join("|");
}

function consumerGateEvidenceIdSummary(rows: readonly ReviewSliceFixtureRow[]) {
  const ids = rows.flatMap((row) =>
    expectedConsumerGateIds(row).map((gateId) => expectedConsumerGateEvidenceId(row, gateId))
  );
  const counts = new Map<(typeof consumerGateOrder)[number], number>(
    consumerGateOrder.map((gateId) => [gateId, 0])
  );

  for (const row of rows) {
    for (const gateId of expectedConsumerGateIds(row)) {
      counts.set(gateId, (counts.get(gateId) ?? 0) + 1);
    }
  }

  return [
    `total=${ids.length}`,
    `unique=${new Set(ids).size}`,
    ...consumerGateOrder.map((gateId) => `${gateId}=${counts.get(gateId) ?? 0}`)
  ].join(";");
}

function reviewUnitCoverageSummary(fileNames: readonly string[]) {
  return [
    `units:${reviewUnitNames(fileNames).length}`,
    `paired:${pairedReviewUnitNames(fileNames).length}`,
    `untested:${untestedReviewUnitNames(fileNames).length}`,
    `status:${expectedTestPairingStatus(fileNames)}`
  ].join("|");
}

function reviewActionDetailSummary(slice: ReviewSliceFixtureRow) {
  return [
    `action:${expectedReviewAction(slice.fileNames)}`,
    `focused:${slice.focusedTestCommand}`,
    `adjacent:${slice.adjacentTestCommand}`,
    `untested:${serializedUntestedReviewUnitNames(slice.fileNames)}`
  ].join("|");
}

function sliceFixture() {
  return buildManimReviewPackageSliceMatrix(buildManimReviewPackageMatrix(currentManimFileNames()), {
    maxFilesPerSlice
  });
}

test("MAIS Manim review package slices cover every file exactly once in bounded review batches", () => {
  const fileNames = currentManimFileNames();
  const matrix = sliceFixture();
  const slicedFileNames = matrix.rows.flatMap((slice) => slice.fileNames).sort();

  assert.equal(matrix.sourceContract, MATH_SCENE_REVIEW_PACKAGE_SLICE_SOURCE_CONTRACT);
  assert.equal(matrix.status, "ready-for-slice-review");
  assert.equal(matrix.maxFilesPerSlice, maxFilesPerSlice);
  assert.equal(matrix.fileCount, fileNames.length);
  assert.deepEqual(slicedFileNames, fileNames);
  assert.equal(matrix.duplicateFileNames.length, 0);
  assert.equal(matrix.missingFileNames.length, 0);
  assert.ok(matrix.sliceCount > matrix.packageCount);
  assert.ok(matrix.largestSliceFileCount <= maxFilesPerSlice);
  assert.ok(matrix.rows.every((slice) => slice.fileCount <= maxFilesPerSlice));
});

test("MAIS Manim review package slices preserve package ownership and useful checks", () => {
  const matrix = sliceFixture();
  const slicesByPackage = new Map<string, typeof matrix.rows>();

  for (const slice of matrix.rows) {
    slicesByPackage.set(slice.packageId, [...(slicesByPackage.get(slice.packageId) ?? []), slice]);
  }

  assert.equal(classifyManimReviewPackage("mathSceneReviewPackageSlices.ts"), "evidence");
  assert.ok((slicesByPackage.get("mobject")?.length ?? 0) >= 5);
  assert.ok((slicesByPackage.get("scene")?.length ?? 0) >= 3);
  assert.ok((slicesByPackage.get("evidence")?.length ?? 0) >= 2);

  for (const slice of matrix.rows) {
    assert.ok(slice.sliceId.startsWith(`${slice.packageId}-slice-`));
    assert.ok(slice.ownerAgentIds.includes("A06"));
    assert.ok(slice.acceptanceCriteria.includes("focused-tests-pass"));
    assert.ok(slice.acceptanceCriteria.includes("adjacent-tests-pass"));
    assert.ok(slice.acceptanceCriteria.includes("type-boundary-clean"));
    assert.ok(!(slice.acceptanceCriteria as readonly string[]).includes("npm-type-check-pass"));
    assert.ok(slice.focusedTestCommand.startsWith("./node_modules/.bin/tsx --test "));
    assert.ok(slice.adjacentTestCommand.includes("mathSceneReviewPackageSlices.test.ts"));
    assert.ok(slice.fileNames.every((fileName) => classifyManimReviewPackage(fileName) === slice.packageId));
  }
});

test("MAIS Manim review package slices route final audit evidence ID validation through the evidence gate", () => {
  const matrix = sliceFixture();
  const finalAuditEvidenceIdSlice = matrix.rows.find((slice) =>
    slice.fileNames.includes("mathSceneV2FinalAuditEvidenceId.ts")
  );

  assert.ok(finalAuditEvidenceIdSlice);
  assert.equal(finalAuditEvidenceIdSlice.packageId, "evidence");
  assert.ok(finalAuditEvidenceIdSlice.fileNames.includes("mathSceneV2FinalAuditEvidenceId.test.ts"));
  assert.ok(finalAuditEvidenceIdSlice.consumerGateIds.includes("A06-source-review"));
  assert.ok(finalAuditEvidenceIdSlice.consumerGateIds.includes("A11-browser-regression-routing"));
  assert.ok(finalAuditEvidenceIdSlice.consumerGateIds.includes("A18-teaching-quality-routing"));
  assert.ok(finalAuditEvidenceIdSlice.consumerGateIds.includes("A22-clean-release-routing"));
  assert.ok(finalAuditEvidenceIdSlice.focusedTestCommand.includes("mathSceneV2FinalAuditEvidenceId.test.ts"));
});

test("MAIS Manim review package slices serialize stable review handoff attributes", () => {
  const matrix = sliceFixture();
  const attributes = manimReviewPackageSliceDataAttributes(matrix);

  assert.equal(
    attributes["data-viz-manim-review-slice-source-contract"],
    MATH_SCENE_REVIEW_PACKAGE_SLICE_SOURCE_CONTRACT
  );
  assert.equal(attributes["data-viz-manim-review-slice-status"], "ready-for-slice-review");
  assert.equal(attributes["data-viz-manim-review-slice-max-files"], String(maxFilesPerSlice));
  assert.equal(attributes["data-viz-manim-review-slice-missing-count"], "0");
  assert.equal(attributes["data-viz-manim-review-slice-duplicate-count"], "0");
  assert.match(attributes["data-viz-manim-review-slice-summary"], /mobject=\d+/);
  assert.match(attributes["data-viz-manim-review-slice-summary"], /evidence=\d+/);
  assert.equal(
    attributes["data-viz-manim-review-slice-ids"],
    matrix.rows.map((slice) => slice.sliceId).join(",")
  );
  assert.equal(
    attributes["data-viz-manim-review-slice-file-manifest"],
    matrix.rows.map((slice) => `${slice.sliceId}=${slice.fileNames.join("|")}`).join(";")
  );
  assert.equal(
    attributes["data-viz-manim-review-slice-production-file-manifest"],
    matrix.rows
      .map(
        (slice) =>
          `${slice.sliceId}=${serializedReviewFileNames(slice.fileNames.filter((fileName) => !isReviewTestFile(fileName)))}`
      )
      .join(";")
  );
  assert.equal(
    attributes["data-viz-manim-review-slice-test-file-manifest"],
    matrix.rows
      .map(
        (slice) =>
          `${slice.sliceId}=${serializedReviewFileNames(slice.fileNames.filter((fileName) => isReviewTestFile(fileName)))}`
      )
      .join(";")
  );
  assert.equal(
    attributes["data-viz-manim-review-slice-review-unit-manifest"],
    matrix.rows.map((slice) => `${slice.sliceId}=${serializedReviewUnitNames(slice.fileNames)}`).join(";")
  );
  assert.equal(
    attributes["data-viz-manim-review-slice-review-unit-count-manifest"],
    matrix.rows.map((slice) => `${slice.sliceId}=${reviewUnitNames(slice.fileNames).length}`).join(";")
  );
  assert.equal(
    attributes["data-viz-manim-review-slice-paired-review-unit-manifest"],
    matrix.rows.map((slice) => `${slice.sliceId}=${serializedPairedReviewUnitNames(slice.fileNames)}`).join(";")
  );
  assert.equal(
    attributes["data-viz-manim-review-slice-paired-review-unit-count-manifest"],
    matrix.rows.map((slice) => `${slice.sliceId}=${pairedReviewUnitNames(slice.fileNames).length}`).join(";")
  );
  assert.equal(
    attributes["data-viz-manim-review-slice-untested-review-unit-manifest"],
    matrix.rows.map((slice) => `${slice.sliceId}=${serializedUntestedReviewUnitNames(slice.fileNames)}`).join(";")
  );
  assert.equal(
    attributes["data-viz-manim-review-slice-untested-review-unit-count-manifest"],
    matrix.rows.map((slice) => `${slice.sliceId}=${untestedReviewUnitNames(slice.fileNames).length}`).join(";")
  );
  assert.equal(
    attributes["data-viz-manim-review-slice-test-pairing-status-manifest"],
    matrix.rows.map((slice) => `${slice.sliceId}=${expectedTestPairingStatus(slice.fileNames)}`).join(";")
  );
  assert.equal(
    attributes["data-viz-manim-review-slice-test-pairing-summary"],
    testPairingSummary(matrix.rows)
  );
  assert.equal(
    attributes["data-viz-manim-review-slice-review-unit-coverage-manifest"],
    matrix.rows.map((slice) => `${slice.sliceId}=${reviewUnitCoverageSummary(slice.fileNames)}`).join(";")
  );
  assert.equal(
    attributes["data-viz-manim-review-slice-review-action-manifest"],
    matrix.rows.map((slice) => `${slice.sliceId}=${expectedReviewAction(slice.fileNames)}`).join(";")
  );
  assert.equal(
    attributes["data-viz-manim-review-slice-review-action-summary"],
    reviewActionSummary(matrix.rows)
  );
  assert.equal(
    attributes["data-viz-manim-review-slice-consumer-gate-manifest"],
    matrix.rows.map((slice) => `${slice.sliceId}=${expectedConsumerGateIds(slice).join("|")}`).join(";")
  );
  assert.equal(
    attributes["data-viz-manim-review-slice-consumer-gate-summary"],
    consumerGateSummary(matrix.rows)
  );
  assert.equal(
    attributes["data-viz-manim-review-slice-consumer-gate-status-manifest"],
    matrix.rows.map((slice) => `${slice.sliceId}=${consumerGateStatusManifest(slice)}`).join(";")
  );
  assert.equal(
    attributes["data-viz-manim-review-slice-consumer-gate-status-summary"],
    consumerGateStatusSummary(matrix.rows)
  );
  assert.equal(
    attributes["data-viz-manim-review-slice-consumer-gate-evidence-requirement-manifest"],
    matrix.rows.map((slice) => `${slice.sliceId}=${consumerGateEvidenceRequirementManifest(slice)}`).join(";")
  );
  assert.equal(
    attributes["data-viz-manim-review-slice-consumer-gate-evidence-requirement-summary"],
    consumerGateEvidenceRequirementSummary(matrix.rows)
  );
  assert.equal(
    attributes["data-viz-manim-review-slice-consumer-gate-evidence-id-manifest"],
    matrix.rows.map((slice) => `${slice.sliceId}=${consumerGateEvidenceIdManifest(slice)}`).join(";")
  );
  assert.equal(
    attributes["data-viz-manim-review-slice-consumer-gate-evidence-id-summary"],
    consumerGateEvidenceIdSummary(matrix.rows)
  );
  assert.equal(
    attributes["data-viz-manim-review-slice-review-action-detail-manifest"],
    matrix.rows.map((slice) => `${slice.sliceId}=${reviewActionDetailSummary(slice)}`).join(";")
  );
  assert.equal(
    attributes["data-viz-manim-review-slice-criteria-manifest"],
    matrix.rows.map((slice) => `${slice.sliceId}=${slice.acceptanceCriteria.join("|")}`).join(";")
  );
  assert.equal(
    attributes["data-viz-manim-review-slice-focused-test-manifest"],
    matrix.rows.map((slice) => `${slice.sliceId}=${slice.focusedTestCommand}`).join(";")
  );
  assert.equal(
    attributes["data-viz-manim-review-slice-adjacent-test-manifest"],
    matrix.rows.map((slice) => `${slice.sliceId}=${slice.adjacentTestCommand}`).join(";")
  );
  assert.equal(
    attributes["data-viz-manim-review-slice-package-manifest"],
    matrix.rows.map((slice) => `${slice.sliceId}=${slice.packageId}`).join(";")
  );
  assert.equal(
    attributes["data-viz-manim-review-slice-owner-manifest"],
    matrix.rows.map((slice) => `${slice.sliceId}=${slice.ownerAgentIds.join("|")}`).join(";")
  );
  assert.equal(
    attributes["data-viz-manim-review-slice-status-manifest"],
    matrix.rows.map((slice) => `${slice.sliceId}=${slice.status}`).join(";")
  );
  assert.equal(
    attributes["data-viz-manim-review-slice-title-manifest"],
    matrix.rows.map((slice) => `${slice.sliceId}=${slice.title}`).join(";")
  );
  assert.equal(
    attributes["data-viz-manim-review-slice-review-focus-manifest"],
    matrix.rows.map((slice) => `${slice.sliceId}=${slice.reviewFocus}`).join(";")
  );
  assert.equal(
    attributes["data-viz-manim-review-slice-size-manifest"],
    matrix.rows
      .map(
        (slice) =>
          `${slice.sliceId}=files:${slice.fileCount}|prod:${slice.productionFileCount}|tests:${slice.testFileCount}`
      )
      .join(";")
  );
  assert.equal(
    attributes["data-viz-manim-review-slice-index-manifest"],
    matrix.rows.map((slice) => `${slice.sliceId}=${slice.sliceIndex}`).join(";")
  );
  assert.equal(
    attributes["data-viz-manim-review-slice-anchor-manifest"],
    matrix.rows.map((slice) => `${slice.sliceId}=${slice.anchorFileNames.join("|")}`).join(";")
  );
  assert.equal(
    attributes["data-viz-manim-review-slice-source-contract-manifest"],
    matrix.rows.map((slice) => `${slice.sliceId}=${slice.sourceContract}`).join(";")
  );
  assert.match(
    attributes["data-viz-manim-review-slice-criteria-manifest"],
    /type-boundary-clean/
  );
  assert.doesNotMatch(
    attributes["data-viz-manim-review-slice-criteria-manifest"],
    /npm-type-check-pass/
  );
  assert.match(
    attributes["data-viz-manim-review-slice-focused-test-manifest"],
    /scene-slice-01=.*mathSceneRegistry\.test\.ts/
  );
  assert.match(
    attributes["data-viz-manim-review-slice-adjacent-test-manifest"],
    /scene-slice-01=.*mathSceneReviewPackageSlices\.test\.ts/
  );
  assert.match(
    attributes["data-viz-manim-review-slice-production-file-manifest"],
    /scene-slice-01=.*mathSceneRegistry\.ts/
  );
  assert.match(
    attributes["data-viz-manim-review-slice-test-file-manifest"],
    /scene-slice-01=.*mathSceneRegistry\.test\.ts/
  );
  assert.match(
    attributes["data-viz-manim-review-slice-review-unit-manifest"],
    /scene-slice-01=.*mathSceneRegistry/
  );
  assert.match(
    attributes["data-viz-manim-review-slice-review-unit-count-manifest"],
    /scene-slice-01=\d+/
  );
  assert.match(
    attributes["data-viz-manim-review-slice-paired-review-unit-manifest"],
    /scene-slice-01=.*mathScenePlayback/
  );
  assert.match(
    attributes["data-viz-manim-review-slice-paired-review-unit-count-manifest"],
    /scene-slice-01=\d+/
  );
  assert.match(
    attributes["data-viz-manim-review-slice-untested-review-unit-manifest"],
    /scene-slice-01=.*mathScene/
  );
  assert.match(
    attributes["data-viz-manim-review-slice-untested-review-unit-count-manifest"],
    /scene-slice-01=\d+/
  );
  assert.match(
    attributes["data-viz-manim-review-slice-test-pairing-status-manifest"],
    /scene-slice-03=some-units-unpaired/
  );
  assert.match(
    attributes["data-viz-manim-review-slice-test-pairing-summary"],
    /some-units-unpaired=\d+/
  );
  assert.match(
    attributes["data-viz-manim-review-slice-review-unit-coverage-manifest"],
    /scene-slice-03=units:\d+\|paired:\d+\|untested:\d+\|status:some-units-unpaired/
  );
  assert.match(
    attributes["data-viz-manim-review-slice-review-action-manifest"],
    /scene-slice-03=inspect-untested-units-and-run-adjacent-tests/
  );
  assert.match(
    attributes["data-viz-manim-review-slice-review-action-summary"],
    /run-focused-and-adjacent-tests=\d+/
  );
  assert.match(
    attributes["data-viz-manim-review-slice-review-action-summary"],
    /inspect-untested-units-and-run-adjacent-tests=\d+/
  );
  assert.match(
    attributes["data-viz-manim-review-slice-review-action-detail-manifest"],
    /scene-slice-03=action:inspect-untested-units-and-run-adjacent-tests\|focused:[^|]*mathSceneTimeProgression\.test\.ts[^|]*\|adjacent:[^|]*mathSceneReviewPackageSlices\.test\.ts[^|]*\|untested:mathSceneTypes/
  );
  assert.match(
    attributes["data-viz-manim-review-slice-consumer-gate-manifest"],
    /scene-slice-01=A06-source-review\|A11-browser-regression-routing\|A22-clean-release-routing/
  );
  assert.match(
    attributes["data-viz-manim-review-slice-consumer-gate-manifest"],
    /evidence-slice-01=.*A18-teaching-quality-routing/
  );
  assert.match(
    attributes["data-viz-manim-review-slice-consumer-gate-summary"],
    /A18-teaching-quality-routing=\d+/
  );
  assert.match(
    attributes["data-viz-manim-review-slice-consumer-gate-status-manifest"],
    /scene-slice-01=A06-source-review:ready-for-slice-review\|A11-browser-regression-routing:pending-browser-regression-evidence\|A22-clean-release-routing:pending-clean-release-evidence/
  );
  assert.match(
    attributes["data-viz-manim-review-slice-consumer-gate-status-manifest"],
    /evidence-slice-01=.*A18-teaching-quality-routing:pending-teaching-quality-review/
  );
  assert.match(
    attributes["data-viz-manim-review-slice-consumer-gate-status-summary"],
    /pending-browser-regression-evidence=\d+/
  );
  assert.match(
    attributes["data-viz-manim-review-slice-consumer-gate-evidence-requirement-manifest"],
    /scene-slice-01=A06-source-review:source-review-note\|A11-browser-regression-routing:browser-regression-transcript\|A22-clean-release-routing:clean-release-transcript/
  );
  assert.match(
    attributes["data-viz-manim-review-slice-consumer-gate-evidence-requirement-manifest"],
    /evidence-slice-01=.*A18-teaching-quality-routing:teaching-quality-decision-record/
  );
  assert.match(
    attributes["data-viz-manim-review-slice-consumer-gate-evidence-requirement-summary"],
    /browser-regression-transcript=\d+/
  );
  assert.match(
    attributes["data-viz-manim-review-slice-consumer-gate-evidence-id-manifest"],
    /scene-slice-01=A06-source-review:scene-slice-01-a06-source-review-note\|A11-browser-regression-routing:scene-slice-01-a11-browser-regression-transcript\|A22-clean-release-routing:scene-slice-01-a22-clean-release-transcript/
  );
  assert.match(
    attributes["data-viz-manim-review-slice-consumer-gate-evidence-id-manifest"],
    /evidence-slice-01=.*A18-teaching-quality-routing:evidence-slice-01-a18-teaching-quality-decision-record/
  );
  assert.match(
    attributes["data-viz-manim-review-slice-consumer-gate-evidence-id-summary"],
    /unique=\d+/
  );
  assert.match(attributes["data-viz-manim-review-slice-package-manifest"], /scene-slice-01=scene/);
  assert.match(attributes["data-viz-manim-review-slice-owner-manifest"], /evidence-slice-01=A06/);
  assert.match(
    attributes["data-viz-manim-review-slice-status-manifest"],
    /mobject-slice-01=ready-for-slice-review/
  );
  assert.match(attributes["data-viz-manim-review-slice-title-manifest"], /scene-slice-01=.* Slice 1/);
  assert.match(
    attributes["data-viz-manim-review-slice-review-focus-manifest"],
    /scene-slice-01=.*mathScene/
  );
  assert.match(
    attributes["data-viz-manim-review-slice-size-manifest"],
    /evidence-slice-01=files:\d+\|prod:\d+\|tests:\d+/
  );
  assert.match(attributes["data-viz-manim-review-slice-index-manifest"], /scene-slice-01=1/);
  assert.match(
    attributes["data-viz-manim-review-slice-anchor-manifest"],
    /evidence-slice-01=.*mathEvidenceHarness\.ts/
  );
  assert.match(
    attributes["data-viz-manim-review-slice-source-contract-manifest"],
    /scene-slice-01=MAIS Manim v2 review package slices/
  );
});
