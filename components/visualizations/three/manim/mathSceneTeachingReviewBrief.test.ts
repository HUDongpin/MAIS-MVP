import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMathSceneTeachingReviewBrief,
  mathSceneTeachingReviewBriefDataAttributes,
  MATH_SCENE_TEACHING_REVIEW_BRIEF_SOURCE_CONTRACT
} from "./mathSceneTeachingReviewBrief";
import { classifyManimReviewPackage } from "./mathSceneReviewPackages";

test("A18 teaching-review brief groups every concrete case into a human signoff queue", () => {
  const brief = buildMathSceneTeachingReviewBrief();
  const queuedCaseIds = brief.reviewQueue.flatMap((section) => section.cases.map((reviewCase) => reviewCase.caseId));

  assert.equal(brief.sourceContract, MATH_SCENE_TEACHING_REVIEW_BRIEF_SOURCE_CONTRACT);
  assert.equal(brief.status, "a18-final-human-review-required");
  assert.equal(brief.a18FinalHumanReviewRequired, true);
  assert.equal(brief.caseCount, 12);
  assert.equal(brief.readyCount, 12);
  assert.equal(brief.missingEvidenceCount, 0);
  assert.deepEqual(brief.bandCounts, {
    advanced: 4,
    "middle-school": 1,
    primary: 2,
    secondary: 5
  });
  assert.deepEqual(queuedCaseIds, brief.caseIds);
  assert.ok(brief.reviewQueue.every((section) => section.cases.length > 0));
  assert.ok(brief.reviewQueue.every((section) => section.humanSignoffRequired));
});

test("A18 teaching-review brief preserves reviewer prompts and evidence per case", () => {
  const brief = buildMathSceneTeachingReviewBrief();
  const functionCase = brief.cases.find((reviewCase) => reviewCase.caseId === "function-graph-core");

  assert.equal(functionCase?.sceneId, "mais-manim-function-graph");
  assert.match(functionCase?.learningObjective ?? "", /function rule/i);
  assert.match(functionCase?.reviewerPrompt ?? "", /sweep parameter beat/i);
  assert.match(functionCase?.cognitiveLoadNote ?? "", /graph curve/i);
  assert.ok((functionCase?.semanticBindingCount ?? 0) >= 2);
  assert.ok((functionCase?.focusedBeatCount ?? 0) >= 4);
  assert.ok(brief.humanReviewChecklist.includes("curriculum-fit"));
  assert.ok(brief.humanReviewChecklist.includes("mathematical-accuracy"));
  assert.ok(brief.humanReviewChecklist.includes("cognitive-load"));
  assert.ok(brief.humanReviewChecklist.includes("interaction-timing"));
});

test("A18 teaching-review brief serializes stable gate attributes and stays in evidence package", () => {
  const brief = buildMathSceneTeachingReviewBrief();
  const attributes = mathSceneTeachingReviewBriefDataAttributes(brief);

  assert.equal(classifyManimReviewPackage("mathSceneTeachingReviewBrief.ts"), "evidence");
  assert.equal(attributes["data-viz-manim-teaching-review-brief-source-contract"], MATH_SCENE_TEACHING_REVIEW_BRIEF_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-teaching-review-brief-status"], "a18-final-human-review-required");
  assert.equal(attributes["data-viz-manim-teaching-review-brief-case-count"], "12");
  assert.equal(attributes["data-viz-manim-teaching-review-brief-ready-count"], "12");
  assert.equal(attributes["data-viz-manim-teaching-review-brief-missing-count"], "0");
  assert.match(attributes["data-viz-manim-teaching-review-brief-band-summary"], /primary=2/);
  assert.match(attributes["data-viz-manim-teaching-review-brief-summary"], /function-graph-core=ready/);
});
