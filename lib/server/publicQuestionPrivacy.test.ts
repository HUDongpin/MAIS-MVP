import assert from "node:assert/strict";
import test from "node:test";

import { getPublicQuestionsFromStore } from "@/lib/server/questionStore";
import { studentActivityToPublicQuestion } from "@/lib/server/userStore/studentActivityPersistence";

const privateAnswerFields = ["answer", "acceptedAnswers", "accepted_answers", "explanation", "correctAnswer"];

function assertNoAnswerLeak(question: object) {
  privateAnswerFields.forEach((field) => {
    assert.equal(field in question, false, `PublicQuestion leaked ${field}`);
  });
}

test("seed-backed PublicQuestion payloads do not expose answer material before submission", async () => {
  const questions = await getPublicQuestionsFromStore({
    curriculumProfile: { region: "MAINLAND", publisher: "MAINLAND_BNU" },
    grade: "P1"
  });

  assert.ok(questions.length > 0);
  questions.slice(0, 25).forEach(assertNoAnswerLeak);
});

test("persisted PublicQuestion projection does not expose answer material before submission", () => {
  const publicQuestion = studentActivityToPublicQuestion(
    { visualization_sessions: [] },
    {
      id: "private-answer-question",
      curriculum_track: "HK",
      grade: "S1",
      topic_id: "private-answer-topic",
      difficulty: "Low",
      type: "fill-in",
      prompt_en: "Complete the answer.",
      prompt_zh: "完成答案。",
      options: null,
      answer: "secret-answer",
      accepted_answers: ["also-secret"],
      explanation_en: "Private explanation.",
      explanation_zh: "不應預先顯示的解釋。"
    }
  );

  assertNoAnswerLeak(publicQuestion);
});
