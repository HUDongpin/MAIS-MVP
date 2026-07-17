import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  buildManimReviewPackageMatrix,
  classifyManimReviewPackage,
  MANIM_REVIEW_PACKAGE_SOURCE_CONTRACT,
  manimReviewPackageDataAttributes,
  manimReviewPackageIds
} from "./mathSceneReviewPackages";

const manimDir = "components/visualizations/three/manim";

function currentManimFileNames() {
  return fs
    .readdirSync(manimDir)
    .filter((fileName) => [".ts", ".tsx"].includes(path.extname(fileName)))
    .sort();
}

test("MAIS Manim review packages classify every runtime file exactly once", () => {
  const fileNames = currentManimFileNames();
  const matrix = buildManimReviewPackageMatrix(fileNames);
  const packagedFileNames = matrix.flatMap((reviewPackage) => reviewPackage.fileNames).sort();

  assert.deepEqual(matrix.map((reviewPackage) => reviewPackage.id), manimReviewPackageIds);
  assert.deepEqual(packagedFileNames, fileNames);
  assert.ok(matrix.every((reviewPackage) => reviewPackage.sourceContract === MANIM_REVIEW_PACKAGE_SOURCE_CONTRACT));
  assert.ok(matrix.every((reviewPackage) => reviewPackage.fileCount > 0));
  assert.ok(matrix.every((reviewPackage) => reviewPackage.testFileCount > 0));
  assert.ok(matrix.every((reviewPackage) => reviewPackage.anchorFileNames.length >= 2));
  assert.deepEqual(matrix.flatMap((reviewPackage) => reviewPackage.unclassifiedFileNames), []);
});

test("MAIS Manim review packages keep stable anchors for reviewer handoff", () => {
  const fileNames = currentManimFileNames();
  const matrix = buildManimReviewPackageMatrix(fileNames);
  const anchorsByPackage = Object.fromEntries(
    matrix.map((reviewPackage) => [reviewPackage.id, reviewPackage.anchorFileNames])
  );

  assert.deepEqual(classifyManimReviewPackage("mathSceneRegistry.ts"), "scene");
  assert.deepEqual(classifyManimReviewPackage("mathMobjectFamily.ts"), "mobject");
  assert.deepEqual(classifyManimReviewPackage("mathAnimationBuilder.ts"), "animation");
  assert.deepEqual(classifyManimReviewPackage("mathCameraFrame.ts"), "camera");
  assert.deepEqual(classifyManimReviewPackage("mathFormulaBindings.ts"), "formula");
  assert.deepEqual(classifyManimReviewPackage("mathSceneCheckpoint.ts"), "authoring");
  assert.deepEqual(classifyManimReviewPackage("mathEvidenceHarness.ts"), "evidence");
  assert.deepEqual(classifyManimReviewPackage("MathSceneRuntime.tsx"), "integration");

  assert.deepEqual(anchorsByPackage.scene, ["mathSceneRegistry.ts", "mathSceneRuntimeState.ts", "mathTimeline.ts"]);
  assert.deepEqual(anchorsByPackage.mobject, ["mathMobjectFamily.ts", "mathMobjectState.ts", "mathVMobjectStyle.ts"]);
  assert.deepEqual(anchorsByPackage.animation, ["mathAnimationBuilder.ts", "mathAnimationRuntime.ts", "mathTransformBeginPlan.ts"]);
  assert.deepEqual(anchorsByPackage.camera, ["mathCameraDirector.ts", "mathCameraFrame.ts", "mathCameraShotAuthoring.ts"]);
  assert.deepEqual(anchorsByPackage.formula, ["mathFormulaBindings.ts", "mathFormulaLayer.ts", "mathTexCompilePipeline.ts"]);
  assert.deepEqual(anchorsByPackage.authoring, ["mathParameterPanel.ts", "mathSceneCheckpoint.ts", "mathSceneSelectorCatalog.ts"]);
  assert.deepEqual(anchorsByPackage.evidence, ["mathEvidenceHarness.ts", "mathSceneExport.ts", "mathSceneTeachingQuality.ts"]);
  assert.deepEqual(anchorsByPackage.integration, ["MathFormulaOverlay.tsx", "MathSceneRuntime.tsx", "mathSceneSmokeHook.ts"]);
});

test("MAIS Manim review package evidence serializes for reports and smoke hooks", () => {
  const matrix = buildManimReviewPackageMatrix(currentManimFileNames());
  const attributes = manimReviewPackageDataAttributes(matrix);

  assert.equal(attributes["data-viz-manim-review-package-source-contract"], MANIM_REVIEW_PACKAGE_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-review-package-count"], String(manimReviewPackageIds.length));
  assert.equal(attributes["data-viz-manim-review-package-unclassified-count"], "0");
  assert.match(attributes["data-viz-manim-review-package-summary"], /scene=\d+\/\d+/);
  assert.match(attributes["data-viz-manim-review-package-summary"], /integration=\d+\/\d+/);
});
