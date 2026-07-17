import assert from "node:assert/strict";
import test from "node:test";
import {
  buildConcreteMathSceneTeachingReviewCases,
  concreteTeachingReviewCaseIds,
  MATH_SCENE_TEACHING_REVIEW_CASE_SOURCE_CONTRACT,
  mathSceneTeachingReviewCaseDataAttributes
} from "./mathSceneTeachingReviewCases";

test("concrete MAIS Manim teaching-review cases cover representative math scene families", () => {
  const cases = buildConcreteMathSceneTeachingReviewCases();

  assert.deepEqual(cases.map((reviewCase) => reviewCase.caseId), concreteTeachingReviewCaseIds);
  assert.equal(cases.length, 12);
  assert.ok(cases.every((reviewCase) => reviewCase.sourceContract === MATH_SCENE_TEACHING_REVIEW_CASE_SOURCE_CONTRACT));
  assert.ok(cases.every((reviewCase) => reviewCase.status === "a06-confirmed-ready-for-a18-signoff"));
  assert.ok(cases.every((reviewCase) => reviewCase.a18FinalHumanReviewRequired));
  assert.ok(cases.every((reviewCase) => reviewCase.learningObjective.length > 24));
  assert.ok(cases.every((reviewCase) => reviewCase.cognitiveLoadNote.length > 24));
  assert.ok(cases.every((reviewCase) => reviewCase.semanticBindingCount >= 2));
  assert.ok(cases.every((reviewCase) => reviewCase.focusedBeatCount >= 4));
  assert.ok(cases.every((reviewCase) => reviewCase.cameraShotCount >= 2));
  assert.deepEqual(cases.flatMap((reviewCase) => reviewCase.missingTeachingEvidence), []);
});

test("concrete teaching-review case matrix keeps stable scene ids and objectives", () => {
  const cases = buildConcreteMathSceneTeachingReviewCases();
  const byId = Object.fromEntries(cases.map((reviewCase) => [reviewCase.caseId, reviewCase]));

  assert.equal(byId["function-graph-core"]?.sceneId, "mais-manim-function-graph");
  assert.match(byId["function-graph-core"]?.learningObjective ?? "", /function rule/i);
  assert.equal(byId["trig-unit-wave-core"]?.sceneId, "mais-manim-trig-unit-wave");
  assert.match(byId["trig-unit-wave-core"]?.learningObjective ?? "", /unit circle/i);
  assert.equal(byId["calculus-rate-area-core"]?.sceneId, "mais-manim-calculus-rate-area");
  assert.match(byId["calculus-rate-area-core"]?.learningObjective ?? "", /rate/i);
  assert.equal(byId["conic-section-core"]?.sceneId, "mais-manim-conic-sections-deep");
  assert.match(byId["conic-section-core"]?.learningObjective ?? "", /slice/i);
  assert.equal(byId["statistics-distribution-core"]?.sceneId, "mais-manim-statistics-distribution");
  assert.match(byId["statistics-distribution-core"]?.learningObjective ?? "", /center/i);
  assert.equal(byId["fraction-slices-core"]?.sceneId, "mais-manim-fraction-slices");
  assert.match(byId["fraction-slices-core"]?.learningObjective ?? "", /whole/i);
});

test("concrete teaching-review cases serialize gate evidence for A18/A06 reporting", () => {
  const cases = buildConcreteMathSceneTeachingReviewCases();
  const attributes = mathSceneTeachingReviewCaseDataAttributes(cases);

  assert.equal(
    attributes["data-viz-manim-teaching-review-case-source-contract"],
    MATH_SCENE_TEACHING_REVIEW_CASE_SOURCE_CONTRACT
  );
  assert.equal(attributes["data-viz-manim-teaching-review-case-count"], "12");
  assert.equal(attributes["data-viz-manim-teaching-review-case-ready-count"], "12");
  assert.equal(attributes["data-viz-manim-teaching-review-case-missing-count"], "0");
  assert.match(attributes["data-viz-manim-teaching-review-case-summary"], /function-graph-core=ready/);
  assert.match(attributes["data-viz-manim-teaching-review-case-summary"], /statistical-inference-core=ready/);
});
