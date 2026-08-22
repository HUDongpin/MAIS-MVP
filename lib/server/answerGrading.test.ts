import assert from "node:assert/strict";
import test from "node:test";

import * as answerGrading from "@/lib/server/answerGrading";

test("question grading threads the question id into strict response contracts", () => {
  const gradeQuestionAttempt = (
    answerGrading as Record<string, unknown>
  ).gradeQuestionAttempt;
  assert.equal(typeof gradeQuestionAttempt, "function");
  if (typeof gradeQuestionAttempt !== "function") return;

  type QuestionFixture = {
    id: string;
    answer: string;
    acceptedAnswers: null;
    options: null;
    explanation: { en: string; zh: string };
  };
  const question: QuestionFixture = {
    id: "pq-p3-fractions-intro-2-v2",
    answer: "2/4",
    acceptedAnswers: null,
    options: null,
    explanation: { en: "Keep denominator 4.", zh: "保留分母 4。" }
  };
  const grade = gradeQuestionAttempt as (
    question: QuestionFixture,
    selectedAnswer: string
  ) => { correct: boolean; correctAnswer?: string };

  assert.equal(grade(question, "2/4").correct, true);
  assert.deepEqual(grade(question, "1/2"), {
    correct: false,
    explanation: question.explanation,
    correctAnswer: "2/4"
  });
});
