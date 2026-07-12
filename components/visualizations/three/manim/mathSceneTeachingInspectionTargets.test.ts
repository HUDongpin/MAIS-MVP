import assert from "node:assert/strict";
import test from "node:test";
import { classifyManimReviewPackage } from "./mathSceneReviewPackages";
import { buildConcreteMathSceneTeachingReviewCases } from "./mathSceneTeachingReviewCases";
import { buildMathSceneTeachingSignoffMatrix } from "./mathSceneTeachingSignoffMatrix";
import {
  buildMathSceneTeachingInspectionTargetQueue,
  mathSceneTeachingInspectionTargetDataAttributes,
  MATH_SCENE_TEACHING_INSPECTION_REQUIRED_RENDERED_SELECTORS,
  MATH_SCENE_TEACHING_INSPECTION_SOURCE_EVIDENCE_ATTRIBUTES,
  MATH_SCENE_TEACHING_INSPECTION_TARGET_SOURCE_CONTRACT
} from "./mathSceneTeachingInspectionTargets";

test("A18/A06 teaching inspection targets mirror every concrete review case", () => {
  const reviewCases = buildConcreteMathSceneTeachingReviewCases();
  const reviewCaseById = new Map(reviewCases.map((reviewCase) => [reviewCase.caseId, reviewCase]));
  const matrix = buildMathSceneTeachingSignoffMatrix();
  const expectedIds = matrix.rows.map((row) => row.caseId);
  const queue = buildMathSceneTeachingInspectionTargetQueue();

  assert.equal(queue.sourceContract, MATH_SCENE_TEACHING_INSPECTION_TARGET_SOURCE_CONTRACT);
  assert.equal(queue.status, "a18-rendered-scene-review-ready");
  assert.equal(queue.caseCount, reviewCases.length);
  assert.equal(queue.targetCount, reviewCases.length);
  assert.equal(queue.pendingA18Count, reviewCases.length);
  assert.equal(queue.readyForA18RenderedSceneReviewCount, reviewCases.length);
  assert.deepEqual(queue.targetIds, expectedIds);
  assert.deepEqual(queue.targets.map((target) => target.familyId), expectedIds.map((id) => reviewCaseById.get(id)?.familyId));
  assert.deepEqual(queue.targets.map((target) => target.sceneId), expectedIds.map((id) => reviewCaseById.get(id)?.sceneId));
  assert.ok(queue.targets.every((target) => target.a18FinalDecisionRequired));
  assert.ok(queue.targets.every((target) => target.a18SignoffStatus === "pending-a18-review"));
  assert.ok(queue.targets.every((target) => target.manualReviewStatus === "ready-for-a18-rendered-scene-review"));
});

test("A18/A06 teaching inspection targets expose rendered selectors and source evidence attributes", () => {
  const matrix = buildMathSceneTeachingSignoffMatrix();
  const queue = buildMathSceneTeachingInspectionTargetQueue();
  const functionGraphTarget = queue.targets.find((target) => target.caseId === "function-graph-core");

  assert.ok(functionGraphTarget);
  assert.equal(functionGraphTarget.inspectionSurface, "source-backed-rendered-scene");
  assert.deepEqual(functionGraphTarget.requiredCriteria, matrix.requiredCriteria);
  assert.ok(functionGraphTarget.requiredActions.includes("inspect-rendered-scene"));
  assert.ok(functionGraphTarget.requiredActions.includes("record-approve-or-revision-decision"));
  assert.deepEqual(functionGraphTarget.renderedSceneSelectors, MATH_SCENE_TEACHING_INSPECTION_REQUIRED_RENDERED_SELECTORS);
  assert.deepEqual(functionGraphTarget.sourceEvidenceAttributes, MATH_SCENE_TEACHING_INSPECTION_SOURCE_EVIDENCE_ATTRIBUTES);
  assert.ok(functionGraphTarget.renderedSceneSelectors.includes("data-viz-family-id"));
  assert.ok(functionGraphTarget.renderedSceneSelectors.includes("data-viz-scene-id"));
  assert.ok(functionGraphTarget.sourceEvidenceAttributes.includes("data-viz-manim-teaching-signoff-gate-status"));
  assert.equal(Object.hasOwn(functionGraphTarget, "href"), false);
  assert.equal(Object.hasOwn(functionGraphTarget, "routeHref"), false);
});

test("A18/A06 teaching inspection targets serialize stable queue attributes", () => {
  const queue = buildMathSceneTeachingInspectionTargetQueue();
  const attributes = mathSceneTeachingInspectionTargetDataAttributes(queue);

  assert.equal(classifyManimReviewPackage("mathSceneTeachingInspectionTargets.ts"), "evidence");
  assert.equal(
    attributes["data-viz-manim-teaching-inspection-source-contract"],
    MATH_SCENE_TEACHING_INSPECTION_TARGET_SOURCE_CONTRACT
  );
  assert.equal(attributes["data-viz-manim-teaching-inspection-status"], "a18-rendered-scene-review-ready");
  assert.equal(attributes["data-viz-manim-teaching-inspection-target-count"], "12");
  assert.equal(attributes["data-viz-manim-teaching-inspection-pending-a18-count"], "12");
  assert.match(attributes["data-viz-manim-teaching-inspection-summary"], /function-graph-core=pending-a18-review/);
  assert.match(attributes["data-viz-manim-teaching-inspection-rendered-selectors"], /data-viz-family-id/);
});
