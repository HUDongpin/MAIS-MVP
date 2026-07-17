import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  buildManimReviewPackageMatrix,
  classifyManimReviewPackage,
  manimReviewPackageIds
} from "./mathSceneReviewPackages";
import {
  buildManimReviewPackageHandoffMatrix,
  manimReviewPackageHandoffDataAttributes,
  MATH_SCENE_REVIEW_PACKAGE_HANDOFF_SOURCE_CONTRACT
} from "./mathSceneReviewPackageHandoff";

const manimDir = "components/visualizations/three/manim";

function currentManimFileNames() {
  return fs
    .readdirSync(manimDir)
    .filter((fileName) => [".ts", ".tsx"].includes(path.extname(fileName)))
    .sort();
}

function handoffFixture() {
  return buildManimReviewPackageHandoffMatrix(buildManimReviewPackageMatrix(currentManimFileNames()));
}

test("MAIS Manim review package handoff mirrors every source package with executable checks", () => {
  const fileNames = currentManimFileNames();
  const handoff = handoffFixture();

  assert.equal(handoff.sourceContract, MATH_SCENE_REVIEW_PACKAGE_HANDOFF_SOURCE_CONTRACT);
  assert.equal(handoff.status, "ready-for-package-review");
  assert.equal(handoff.packageCount, manimReviewPackageIds.length);
  assert.equal(handoff.readyPackageCount, manimReviewPackageIds.length);
  assert.equal(handoff.fileCount, fileNames.length);
  assert.equal(handoff.unclassifiedFileCount, 0);
  assert.deepEqual(handoff.rows.map((row) => row.packageId), manimReviewPackageIds);

  for (const row of handoff.rows) {
    assert.equal(row.reviewStatus, "ready-for-package-review");
    assert.ok(row.ownerAgentIds.includes("A06"));
    assert.ok(row.focusedTestCommand.startsWith("./node_modules/.bin/tsx --test "));
    assert.ok(row.adjacentTestCommand.startsWith("./node_modules/.bin/tsx --test "));
    assert.ok(row.acceptanceCriteria.includes("all-files-classified"));
    assert.ok(row.acceptanceCriteria.includes("focused-tests-pass"));
    assert.ok(row.acceptanceCriteria.includes("adjacent-tests-pass"));
    assert.ok(row.acceptanceCriteria.includes("type-boundary-clean"));
    assert.ok(!(row.acceptanceCriteria as readonly string[]).includes("npm-type-check-pass"));

    for (const testFileName of row.suggestedTestFileNames) {
      assert.ok(row.focusedTestCommand.includes(`${manimDir}/${testFileName}`));
    }
  }
});

test("MAIS Manim review package handoff names downstream consumer gates", () => {
  const rowsByPackage = Object.fromEntries(
    handoffFixture().rows.map((row) => [row.packageId, row])
  );

  assert.deepEqual(rowsByPackage.evidence.consumerAgentIds, ["A06", "A11", "A18", "A22"]);
  assert.deepEqual(rowsByPackage.integration.consumerAgentIds, ["A06", "A11", "A22"]);
  assert.ok(rowsByPackage.evidence.acceptanceCriteria.includes("downstream-consumers-listed"));
  assert.ok(rowsByPackage.integration.acceptanceCriteria.includes("downstream-consumers-listed"));
});

test("MAIS Manim review package handoff serializes stable smoke attributes", () => {
  const handoff = handoffFixture();
  const attributes = manimReviewPackageHandoffDataAttributes(handoff);

  assert.equal(classifyManimReviewPackage("mathSceneReviewPackageHandoff.ts"), "evidence");
  assert.equal(
    attributes["data-viz-manim-review-handoff-source-contract"],
    MATH_SCENE_REVIEW_PACKAGE_HANDOFF_SOURCE_CONTRACT
  );
  assert.equal(attributes["data-viz-manim-review-handoff-status"], "ready-for-package-review");
  assert.equal(attributes["data-viz-manim-review-handoff-package-count"], String(manimReviewPackageIds.length));
  assert.equal(attributes["data-viz-manim-review-handoff-ready-count"], String(manimReviewPackageIds.length));
  assert.equal(attributes["data-viz-manim-review-handoff-unclassified-count"], "0");
  assert.match(attributes["data-viz-manim-review-handoff-summary"], /evidence=ready-for-package-review/);
  assert.equal(
    attributes["data-viz-manim-review-handoff-criteria-manifest"],
    handoff.rows.map((row) => `${row.packageId}=${row.acceptanceCriteria.join("|")}`).join(";")
  );
  assert.equal(
    attributes["data-viz-manim-review-handoff-owner-manifest"],
    handoff.rows.map((row) => `${row.packageId}=${row.ownerAgentIds.join("|")}`).join(";")
  );
  assert.equal(
    attributes["data-viz-manim-review-handoff-consumer-manifest"],
    handoff.rows.map((row) => `${row.packageId}=${row.consumerAgentIds.join("|")}`).join(";")
  );
  assert.equal(
    attributes["data-viz-manim-review-handoff-focused-test-manifest"],
    handoff.rows.map((row) => `${row.packageId}=${row.focusedTestCommand}`).join(";")
  );
  assert.equal(
    attributes["data-viz-manim-review-handoff-adjacent-test-manifest"],
    handoff.rows.map((row) => `${row.packageId}=${row.adjacentTestCommand}`).join(";")
  );
  assert.equal(
    attributes["data-viz-manim-review-handoff-anchor-manifest"],
    handoff.rows.map((row) => `${row.packageId}=${row.anchorFileNames.join("|")}`).join(";")
  );
  assert.equal(
    attributes["data-viz-manim-review-handoff-suggested-test-file-manifest"],
    handoff.rows.map((row) => `${row.packageId}=${row.suggestedTestFileNames.join("|")}`).join(";")
  );
  assert.equal(
    attributes["data-viz-manim-review-handoff-package-size-manifest"],
    handoff.rows
      .map(
        (row) =>
          `${row.packageId}=files:${row.fileCount}|prod:${row.productionFileCount}|tests:${row.testFileCount}|unclassified:${row.unclassifiedFileNames.length}`
      )
      .join(";")
  );
  assert.equal(
    attributes["data-viz-manim-review-handoff-unclassified-file-manifest"],
    handoff.rows
      .map(
        (row) =>
          `${row.packageId}=${
            row.unclassifiedFileNames.length > 0 ? row.unclassifiedFileNames.join("|") : "none"
          }`
      )
      .join(";")
  );
  assert.match(attributes["data-viz-manim-review-handoff-criteria-manifest"], /type-boundary-clean/);
  assert.doesNotMatch(attributes["data-viz-manim-review-handoff-criteria-manifest"], /npm-type-check-pass/);
  assert.match(attributes["data-viz-manim-review-handoff-owner-manifest"], /scene=A06/);
  assert.match(attributes["data-viz-manim-review-handoff-consumer-manifest"], /evidence=A06\|A11\|A18\|A22/);
  assert.match(attributes["data-viz-manim-review-handoff-consumer-manifest"], /integration=A06\|A11\|A22/);
  assert.match(attributes["data-viz-manim-review-handoff-focused-test-manifest"], /scene=.*mathSceneRegistry\.test\.ts/);
  assert.match(attributes["data-viz-manim-review-handoff-focused-test-manifest"], /evidence=.*mathEvidenceHarness\.test\.ts/);
  assert.match(attributes["data-viz-manim-review-handoff-adjacent-test-manifest"], /evidence=.*mathSceneTeachingQuality\.test\.ts/);
  assert.match(attributes["data-viz-manim-review-handoff-adjacent-test-manifest"], /integration=.*mathSceneSmokeHook\.test\.ts/);
  assert.match(attributes["data-viz-manim-review-handoff-anchor-manifest"], /evidence=.*mathEvidenceHarness\.ts/);
  assert.match(
    attributes["data-viz-manim-review-handoff-suggested-test-file-manifest"],
    /integration=.*mathSceneSmokeHook\.test\.ts/
  );
  assert.match(
    attributes["data-viz-manim-review-handoff-package-size-manifest"],
    /evidence=files:\d+\|prod:\d+\|tests:\d+\|unclassified:0/
  );
  assert.match(attributes["data-viz-manim-review-handoff-unclassified-file-manifest"], /integration=none/);
});
