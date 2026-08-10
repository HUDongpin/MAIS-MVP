import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { dedupePracticeQuestions } from "@/lib/practiceQuestionDeduping";
import { parseScalarAnswer, questionAnswerMatches } from "@/lib/server/answerMatching";
import type { PublicQuestion, Question } from "@/types";
import { usCaliforniaLessonSeeds } from "./usCaliforniaLessons";
import { usCaliforniaQuestions } from "./usCaliforniaQuestions";
import {
  californiaAnswerUnitAliasQuestionIds,
  californiaAnswerUnitAliases
} from "./usCaliforniaAnswerUnitAliases";

const lessonPracticeQuestionLimit = 5;
const handwritingCapableTypes = new Set<PublicQuestion["type"]>(["fill-in", "short-answer", "graph"]);
const questionById = new Map(usCaliforniaQuestions.map((question) => [question.id, question]));

function displayedQuestionsForTopic(topicId: string) {
  const seed = usCaliforniaLessonSeeds.find((candidate) => candidate.topicId === topicId);
  assert.ok(seed, `missing California lesson seed for ${topicId}`);

  const linkedQuestions = (seed.practiceQuestionIds ?? []).map((questionId) => {
    const question = questionById.get(questionId);
    assert.ok(question, `${topicId} links missing question ${questionId}`);
    return question;
  });
  const dedupedQuestions = dedupePracticeQuestions(linkedQuestions);
  const selectedQuestions = dedupedQuestions.slice(0, lessonPracticeQuestionLimit);
  const firstHandwritingQuestion = dedupedQuestions.find((question) => handwritingCapableTypes.has(question.type));

  if (
    selectedQuestions.some((question) => handwritingCapableTypes.has(question.type)) ||
    !firstHandwritingQuestion
  ) {
    return selectedQuestions;
  }

  return [...selectedQuestions.slice(0, lessonPracticeQuestionLimit - 1), firstHandwritingQuestion];
}

function gradesAsCorrect(question: Question, response: string) {
  return questionAnswerMatches({
    id: question.id,
    answer: question.answer,
    accepted_answers: question.acceptedAnswers ?? null,
    options: question.options ?? null,
    strictAnswerUnits: question.strictAnswerUnits,
    curriculumTrack: question.curriculumTrack
  }, response);
}

test("reconstructs the renderer's five-question California lesson surface", () => {
  const lessonViewSource = readFileSync(
    path.resolve(process.cwd(), "components/lesson/LessonView.tsx"),
    "utf8"
  );
  assert.match(lessonViewSource, /const lessonPracticeQuestionLimit = 5;/);
  assert.match(
    lessonViewSource,
    /const handwritingCapableQuestionTypes = new Set<PublicQuestion\["type"\]>\(\["fill-in", "short-answer", "graph"\]\);/
  );

  assert.equal(usCaliforniaLessonSeeds.length, 76);
  const displayedByTopic = usCaliforniaLessonSeeds.map((seed) => ({
    questions: displayedQuestionsForTopic(seed.topicId),
    topicId: seed.topicId
  }));

  displayedByTopic.forEach(({ questions, topicId }) => {
    assert.equal(questions.length, 5, `${topicId} should display exactly five questions`);
    assert.equal(new Set(questions.map((question) => question.id)).size, 5, `${topicId} repeats a displayed question id`);
    assert.equal(
      new Set(questions.map((question) => `${question.prompt.en}\n${question.prompt.zh}`)).size,
      5,
      `${topicId} repeats a displayed prompt`
    );
  });

  assert.equal(
    displayedByTopic.reduce((sum, topic) => sum + topic.questions.length, 0),
    380,
    "76 California pages should expose 380 displayed checkpoint slots"
  );
});

test("keeps repaired displayed checkpoints determinate and lesson-aligned", () => {
  const countSequence = displayedQuestionsForTopic("us-ca-math-k-k-cc-count-sequence");
  assert.match(countSequence[2]?.prompt.en ?? "", /Start at 10.*through 100/i);

  const attributes = displayedQuestionsForTopic("us-ca-math-k-k-md-attributes-data");
  assert.match(attributes[2]?.prompt.en ?? "", /attribute used to compare how long/i);
  assert.doesNotMatch(attributes[2]?.prompt.en ?? "", /^Which of these can you measure\?/i);

  const shapeReasoning = displayedQuestionsForTopic("us-ca-math-p1-1-g-shape-reasoning");
  assert.match(shapeReasoning[1]?.prompt.en ?? "", /matching trapezoids.*long parallel sides/i);

  const coordinateGeometry = displayedQuestionsForTopic("us-ca-math-p6-chapter-04");
  assert.match(coordinateGeometry[4]?.prompt.en ?? "", /axis-aligned rectangle.*opposite corners.*horizontal width/i);

  const breakApart = displayedQuestionsForTopic(
    "us-ca-math-p1-1-l6-break-apart-subtraction-equations-to-10"
  );
  assert.equal(breakApart.length, 5);
  assert.ok(
    breakApart.every((question) => !/moved away|are left|take-away story/i.test(question.prompt.en)),
    "the displayed break-apart checkpoint should not collapse back into take-away stories"
  );
  assert.ok(
    breakApart.every((question) => /altogether|two parts|split between|two towers/i.test(question.prompt.en)),
    "every displayed break-apart item should present a whole-part-part relationship"
  );
  assert.ok(
    breakApart.some((question) => /addition equation.*checks the missing part/i.test(question.prompt.en)),
    "the displayed break-apart checkpoint should require a related-addition check"
  );

  const grade1Data = displayedQuestionsForTopic("us-ca-math-p1-1-md-measure-data");
  assert.ok(grade1Data.every((question) => !/^The graph shows/i.test(question.prompt.en)));
  const grade2Data = displayedQuestionsForTopic("us-ca-math-p2-2-md-measure-data-money-time");
  assert.ok(grade2Data.every((question) => !/^Bars show/i.test(question.prompt.en)));
});

test("accepts natural unit-bearing answers for every displayed unit canary", () => {
  const unitCanaries: Array<[string, string]> = [
    ["ccss-textbook-practice-v1-area-model-q01", "24 square units"],
    ["ccss-textbook-practice-v1-area-model-q03", "24 square unit"],
    ["ccss-textbook-practice-v1-area-count-q01", "15 square units"],
    ["ccss-textbook-practice-v1-area-count-q02", "15 unit squares"],
    ["ccss-textbook-practice-v1-line-plot-operations-q01", "1 cup"],
    ["ccss-textbook-practice-v1-line-plot-operations-q03", "1.5 cups"],
    ["ccss-textbook-practice-v1-metric-conversion-q01", "3,000 meters"],
    ["ccss-textbook-practice-v1-metric-conversion-q02", "2.5 m"],
    ["ccss-textbook-practice-v1-ratio-double-number-line-q02", "4 cups"],
    ["ccss-textbook-practice-v1-complex-unit-rates-q01", "2 mph"],
    ["ccss-textbook-practice-v1-complex-unit-rates-q02", "1.5 cups per hour"],
    ["ccss-textbook-practice-v1-units-quantities-q01", "120 min"],
    ["ccss-textbook-practice-v1-units-quantities-q03", "15,840 ft"]
  ];

  const displayedIds = new Set(
    usCaliforniaLessonSeeds.flatMap((seed) => displayedQuestionsForTopic(seed.topicId).map((question) => question.id))
  );

  unitCanaries.forEach(([questionId, response]) => {
    assert.ok(displayedIds.has(questionId), `${questionId} should remain on the displayed lesson surface`);
    const question = questionById.get(questionId);
    assert.ok(question, `missing unit canary ${questionId}`);
    assert.ok(gradesAsCorrect(question, response), `${questionId} should accept ${JSON.stringify(response)}`);
  });
});

test("accepts every declared California semantic-unit alias", () => {
  assert.ok(
    californiaAnswerUnitAliasQuestionIds.length >= 90,
    "the semantic-unit inventory should cover physical units and displayed count nouns"
  );

  californiaAnswerUnitAliasQuestionIds.forEach((questionId) => {
    const question = questionById.get(questionId);
    assert.ok(question, `semantic-unit inventory links missing question ${questionId}`);
    const aliases = californiaAnswerUnitAliases(question.id, question.answer);
    assert.ok(aliases.length >= 1, `${questionId} should declare at least one unit alias`);
    aliases.forEach((alias) => {
      assert.ok(gradesAsCorrect(question, alias), `${questionId} should accept ${JSON.stringify(alias)}`);
    });
  });
});

test("rejects same-number incompatible units across the displayed California numeric surface", () => {
  const displayed = usCaliforniaLessonSeeds.flatMap((seed) => displayedQuestionsForTopic(seed.topicId));
  const scalarQuestions = displayed.filter(
    (question) => question.type !== "multiple-choice" && parseScalarAnswer(question.answer) !== null
  );
  assert.ok(scalarQuestions.length >= 150, "the unit-semantic sweep should cover the full numeric free-response surface");

  const probeSuffixes = [
    "cm",
    "minutes",
    "dollars",
    "degrees",
    "cm3",
    "square units",
    "cups",
    "cards",
    "counters",
    "pets",
    "votes",
    "outcomes",
    "lines of symmetry"
  ];
  scalarQuestions.forEach((question) => {
    assert.equal(gradesAsCorrect(question, question.answer), true, `${question.id} should retain its bare canonical answer`);
    const scalar = parseScalarAnswer(question.answer);
    assert.notEqual(scalar, null, `${question.id} should remain scalar numeric`);
    const acceptedProbeCount = probeSuffixes.filter((suffix) => gradesAsCorrect(question, `${scalar} ${suffix}`)).length;
    assert.ok(
      acceptedProbeCount <= 1,
      `${question.id} accepts ${acceptedProbeCount} mutually incompatible unit probes`
    );
  });

  const wrongUnitProbes: Array<[string, string]> = [
    ["ccss-textbook-practice-v1-order-and-measure-q01", "6 cm3"],
    ["ccss-textbook-practice-v1-estimate-compare-length-q01", "3 cm3"],
    ["ccss-textbook-practice-v1-area-model-q01", "24 cm3"],
    ["ccss-textbook-practice-v1-area-model-q03", "24 cm3"],
    ["ccss-textbook-practice-v1-area-count-q01", "15 cm3"],
    ["ccss-textbook-practice-v1-add-angles-q01", "55 cm"],
    ["ccss-textbook-practice-v1-add-angles-q02", "70 cm"],
    ["ccss-textbook-practice-v1-angles-fraction-circle-q01", "360 cm"],
    ["ccss-textbook-practice-v1-angles-fraction-circle-q02", "90 cm"],
    ["ccss-textbook-practice-v1-line-plot-operations-q01", "1 cm"],
    ["ccss-textbook-practice-v1-line-plot-operations-q03", "1.5 cm"],
    ["ccss-textbook-practice-v1-metric-conversion-q01", "3000 km"],
    ["ccss-textbook-practice-v1-metric-conversion-q02", "2.5 km"],
    ["ccss-textbook-practice-v1-ratio-double-number-line-q02", "4 cm"],
    ["ccss-textbook-practice-v1-area-triangles-q01", "12 cm"],
    ["ccss-textbook-practice-v1-area-triangles-q03", "15 cm"],
    ["ccss-textbook-practice-v1-complex-unit-rates-q01", "2 km/h"],
    ["ccss-textbook-practice-v1-complex-unit-rates-q02", "1.5 km/h"],
    ["ccss-textbook-practice-v1-percent-problems-q01", "30 cm"],
    ["ccss-textbook-practice-v1-percent-problems-q02", "46 cm"],
    ["ccss-textbook-practice-v1-multistep-rational-q01", "12 cm"],
    ["ccss-textbook-practice-v1-multistep-rational-q02", "9 cm"],
    ["ccss-textbook-practice-v1-area-volume-surface-q01", "30 cm2"],
    ["ccss-textbook-practice-v1-area-volume-surface-q02", "48 cm2"],
    ["ccss-textbook-practice-v1-construct-linear-function-q02", "17 km"],
    ["ccss-textbook-practice-v1-create-equations-q01", "17 cm"],
    ["ccss-textbook-practice-v1-circle-angles-q01", "40 cm"],
    ["ccss-textbook-practice-v1-circle-angles-q02", "90 cm"],
    ["ccss-textbook-practice-v1-inverse-trig-q02", "30 cm"],
    ["ccss-textbook-practice-v1-units-quantities-q01", "120 cm"],
    ["ccss-textbook-practice-v1-units-quantities-q03", "15840 km"],
    ["us-ca-g6-g12-v2-s6-c01-q02", "30 km/h"],
    ["ccss-textbook-practice-v1-decisions-probability-q02", "-0.5 cm"],
    ["ccss-textbook-practice-v1-expected-value-q02", "5 cm"]
  ];

  wrongUnitProbes.forEach(([questionId, response]) => {
    const question = questionById.get(questionId);
    assert.ok(question, `missing wrong-unit canary ${questionId}`);
    assert.equal(gradesAsCorrect(question, response), false, `${questionId} must reject ${JSON.stringify(response)}`);
  });
});
