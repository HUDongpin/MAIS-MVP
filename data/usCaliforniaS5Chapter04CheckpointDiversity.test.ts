import assert from "node:assert/strict";
import test from "node:test";
import { dedupePracticeQuestions } from "@/lib/practiceQuestionDeduping";
import type { PublicQuestion } from "@/types";
import { usCaliforniaLessonSeeds } from "./usCaliforniaLessons";
import { usCaliforniaQuestions } from "./usCaliforniaQuestions";
import {
  generatedCaliforniaQuestions,
  type GeneratedCaliforniaG6G12Question
} from "./usCaliforniaTopics";

const topicId = "us-ca-math-s5-chapter-04";
const displayedCheckpointIds = [
  "us-ca-g6-g12-v2-s5-c04-q01",
  "us-ca-g6-g12-v2-s5-c04-q02",
  "us-ca-g6-g12-v2-s5-c04-q03",
  "us-ca-g6-g12-v2-s5-c04-q04",
  "us-ca-g6-g12-v2-s5-c04-q05"
] as const;
const replacementIds = displayedCheckpointIds.slice(2);
const publicQuestionById = new Map(usCaliforniaQuestions.map((question) => [question.id, question]));
const handwritingCapableTypes = new Set<PublicQuestion["type"]>(["fill-in", "short-answer", "graph"]);

function generatedQuestion(id: string): GeneratedCaliforniaG6G12Question {
  const found = generatedCaliforniaQuestions.find((question) => question.id === id);
  assert.ok(found, `missing generated California question ${id}`);
  assert.equal(found.batch, "us-ca-g6-g12-v2", `${id} should remain in the G6-G12 bank`);
  return found as GeneratedCaliforniaG6G12Question;
}

function displayedQuestions() {
  const seed = usCaliforniaLessonSeeds.find((candidate) => candidate.topicId === topicId);
  assert.ok(seed, `missing California lesson seed for ${topicId}`);

  const linkedQuestions = (seed.practiceQuestionIds ?? []).map((questionId) => {
    const question = publicQuestionById.get(questionId);
    assert.ok(question, `${topicId} links missing question ${questionId}`);
    return question;
  });
  const dedupedQuestions = dedupePracticeQuestions(linkedQuestions);
  const firstFive = dedupedQuestions.slice(0, 5);

  assert.ok(
    firstFive.some((question) => handwritingCapableTypes.has(question.type)),
    "the first five already contain a handwriting-capable checkpoint, so the renderer does not replace q05"
  );
  return firstFive;
}

test("S5 chapter 04 displays five checkpoints with five distinct statistical tasks", () => {
  const displayed = displayedQuestions();
  assert.deepEqual(
    displayed.map((question) => question.id),
    displayedCheckpointIds
  );
  assert.equal(new Set(displayed.map((question) => question.prompt.en)).size, 5);

  const templates = displayedCheckpointIds.map((id) => generatedQuestion(id).generationTemplate);
  assert.deepEqual(templates, [
    "t_sse_compare",
    "t_residual_linear",
    "t_two_way_table_association",
    "t_linear_model_slope_interpretation",
    "t_correlation_causation"
  ]);
  assert.equal(new Set(templates).size, 5);
  assert.equal(templates.filter((template) => template === "t_sse_compare").length, 1);
  assert.equal(templates.filter((template) => template === "t_residual_linear").length, 1);
});

test("the three replacement checkpoints are determinate, independently checked, and fully localized", () => {
  replacementIds.forEach((id) => {
    const question = generatedQuestion(id);
    assert.equal(question.type, "multiple-choice");
    assert.equal(question.options?.length, 4);
    assert.equal(question.options?.filter((option) => option.en === question.answer).length, 1);
    assert.deepEqual(question.acceptedAnswers, [question.answer]);
    assert.equal(question.independentAnswer, question.answer);
    // The field is optional at the type level since ccss-textbook-practice-v1
    // dropped its copied values; these three live in us-ca-g6-g12-v2, where a
    // genuine independent solution is still required — so assert presence too.
    assert.ok(question.independentSolution && question.independentSolution.trim().length > 30);
    assert.notEqual(question.independentSolution, question.explanation.en);
    assert.doesNotMatch(question.prompt.en, /sum of squared residuals/i);
    assert.equal(question.reviewNotes, "qa-diversified-2026-08-09-displayed-checkpoint-surface");

    (["en", "zh", "zhHans"] as const).forEach((locale) => {
      assert.ok(question.prompt[locale]?.trim(), `${id} needs a ${locale} prompt`);
      assert.ok(question.explanation[locale]?.trim(), `${id} needs a ${locale} explanation`);
      question.options?.forEach((option, index) => {
        assert.ok(option[locale]?.trim(), `${id} option ${index + 1} needs ${locale} text`);
      });
    });
    assert.notEqual(question.prompt.zh, question.prompt.en);
    assert.notEqual(question.prompt.zhHans, question.prompt.en);
    question.options?.forEach((option) => {
      assert.notEqual(option.zh, option.en);
      assert.notEqual(option.zhHans, option.en);
    });
  });
});

test("q03 uses conditional percentages to support association without a causal overclaim", () => {
  const question = generatedQuestion("us-ca-g6-g12-v2-s5-c04-q03");

  assert.deepEqual(question.standardIds, ["CA.CCSS.Math.HS.S-ID.5"]);
  assert.deepEqual(question.conceptIds, ["statistical-inference"]);
  assert.deepEqual(question.competencyTags, ["analyze association", "evaluate claims"]);
  assert.deepEqual(question.parameters, {
    group_a_prefer_online: 30,
    group_a_total: 50,
    group_b_prefer_online: 15,
    group_b_total: 50
  });
  assert.match(question.prompt.en, /30 of 50.*15 of 50.*supported by this sample/i);
  assert.match(question.answer, /associated with group in this sample/i);
  assert.match(question.explanation.en, /30\/50 = 60%.*15\/50 = 30%/i);
  assert.match(question.explanation.en, /does not by itself establish causation/i);
});

test("q04 distinguishes a fitted-line slope from its intercept and from an individual outcome", () => {
  const question = generatedQuestion("us-ca-g6-g12-v2-s5-c04-q04");

  assert.deepEqual(question.standardIds, ["CA.CCSS.Math.HS.S-ID.7"]);
  assert.deepEqual(question.conceptIds, ["statistical-inference", "rate-of-change"]);
  assert.deepEqual(question.competencyTags, ["interpret parameters", "interpret rate of change"]);
  assert.deepEqual(question.parameters, { slope: 2.5, intercept: 40 });
  assert.match(question.prompt.en, /ŷ = 2\.5x \+ 40.*slope 2\.5/i);
  assert.equal(
    question.answer,
    "For each additional study hour, the predicted test score increases by 2.5 points."
  );
  assert.match(question.explanation.en, /intercept 40.*predicted score at 0 hours/i);
  assert.match(question.explanation.en, /does not guarantee any individual student's actual change/i);
});

test("q05 interprets correlation within the evidence boundary of an observational study", () => {
  const question = generatedQuestion("us-ca-g6-g12-v2-s5-c04-q05");

  assert.deepEqual(question.standardIds, ["CA.CCSS.Math.HS.S-ID.9"]);
  assert.deepEqual(question.conceptIds, ["statistical-inference"]);
  assert.deepEqual(question.competencyTags, ["analyze association", "evaluate claims"]);
  assert.deepEqual(question.parameters, { correlation: 0.82 });
  assert.match(question.prompt.en, /observational study.*r = 0\.82/i);
  assert.match(question.answer, /positive linear association.*does not by itself establish causation/i);
  assert.match(question.explanation.en, /confounding variables.*does not prove causation/i);
});
