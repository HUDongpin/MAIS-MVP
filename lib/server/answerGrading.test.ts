import assert from "node:assert/strict";
import test from "node:test";
import { gradeSeedQuestionAttempt } from "./answerGrading";

test("California seed grading accepts the exact unit and rejects the same number with an incompatible unit", () => {
  const areaId = "ccss-textbook-practice-v1-area-model-q01";
  assert.equal(gradeSeedQuestionAttempt(areaId, "24")?.correct, true);
  assert.equal(gradeSeedQuestionAttempt(areaId, "24 square units")?.correct, true);
  assert.equal(gradeSeedQuestionAttempt(areaId, "24 cm3")?.correct, false);

  const countId =
    "us-ca-k5-knowledge-point-practice-v1-us-ca-math-p1-1-h3-cube-train-join-models-to-10-q02";
  assert.equal(gradeSeedQuestionAttempt(countId, "5 cubes")?.correct, true);
  assert.equal(gradeSeedQuestionAttempt(countId, "5 cards")?.correct, false);
});
