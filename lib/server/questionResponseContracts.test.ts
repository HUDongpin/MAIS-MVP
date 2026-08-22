import assert from "node:assert/strict";
import test from "node:test";

import { productionLessonByTopicId } from "@/data/lessons";
import { questions } from "@/data/questions";
import { topics } from "@/data/topics";
import { selectLessonPracticeQuestions } from "@/lib/practiceQuestionDeduping";
import { answerMatches, questionAnswerMatches } from "@/lib/server/answerMatching";
import {
  hasStrictQuestionResponseContract,
  isRetiredQuestionId,
  questionResponseContractFor,
  retiredQuestionIds,
  strictQuestionResponseContractEntries
} from "@/lib/server/questionResponseContracts";
import type { Question } from "@/types";

function displayedHongKongQuestions() {
  return topics.filter((topic) => topic.curriculumTrack === "HK").flatMap((topic) => {
    const lesson = productionLessonByTopicId.get(topic.id);
    assert.ok(lesson, `${topic.id}: missing lesson`);
    const candidates = lesson.practiceQuestionIds?.length
      ? lesson.practiceQuestionIds.map((questionId) => {
        const question = questions.find((candidate) => candidate.id === questionId);
        assert.ok(question, `${topic.id}: missing linked question ${questionId}`);
        return question;
      })
      : questions.filter((question) => question.curriculumTrack === "HK" && question.topicId === topic.id);
    return selectLessonPracticeQuestions(candidates);
  });
}

const explicitSemanticContractIds = new Set([
  "graph-p4-decimals-number-line-v2",
  "q2-v2",
  "supp-algebra-basics-key-fact-v2",
  "q18-v2",
  "supp-polynomials-key-fact-v3",
  "supp-polynomials-guided-example-v2",
  "hk-s3-identities-square-patterns-1-v2",
  "supp-identities-square-patterns-key-fact-v2",
  "q10-v3",
  "supp-differentiation-intro-key-fact-v3",
  "supp-calculus-guided-example-v3",
  "supp-p3-multiplication-division-guided-example-v3",
  "supp-p5-volume-key-fact-v3",
  "pq-p2-length-data-1-v2",
  "supp-probability-s2-guided-example-v2",
  "graph-quadratic-patterns-axis-v2",
  "supp-p4-angles-key-fact-v2",
  "supp-p4-large-numbers-guided-example-v2",
  "graph-quadratic-patterns-roots-v2",
  "q27",
  "supp-advanced-functions-guided-example-v2",
  "supp-more-algebra-key-fact-v2",
  "supp-more-algebra-guided-example-v2",
  "supp-identities-square-patterns-guided-example",
  "graph-quadratic-patterns-y-intercept-v2"
]);

function displayedQuestionDemandsStrictContract(question: Question) {
  if (explicitSemanticContractIds.has(question.id)) return true;
  if (question.type === "multiple-choice") return question.id === "q24-v2";

  const prompt = `${question.prompt.en} ${question.prompt.zh}`;
  const answer = question.answer.normalize("NFKC");
  if (/with denominator|分母為|simplest fractional form|最簡分數形式|which fraction means|哪個分數表示/i.test(prompt)) return true;
  if (/o['’]?clock|\d{1,2}:\d{2}/i.test(answer)) return true;
  if (/HK\$|\$\d|(?:\d|π)\s*(?:cm(?:\^[23])?|mL|m|km|km\/h|°C)|minutes per mark/i.test(answer)) return true;
  if (/π/.test(answer) || /°$/.test(answer)) return true;
  if (/\^[0-9]/.test(answer)) return true;
  return false;
}

function gradingQuestion(question: Question) {
  return {
    id: question.id,
    answer: question.answer,
    accepted_answers: question.acceptedAnswers ?? null,
    options: question.options ?? null
  };
}

test("every strict contract belongs to an active HK question and every displayed strict demand is registered", () => {
  const displayed = displayedHongKongQuestions();
  const displayedById = new Map(displayed.map((question) => [question.id, question]));
  const activeHongKongById = new Map(
    questions.filter((question) => question.curriculumTrack === "HK").map((question) => [question.id, question])
  );
  const registeredIds = new Set(strictQuestionResponseContractEntries().map(([questionId]) => questionId));
  const demandedIds = new Set(
    displayed.filter(displayedQuestionDemandsStrictContract).map((question) => question.id)
  );

  assert.equal(displayed.length, 255);
  assert.equal(displayedById.size, 255);
  for (const questionId of registeredIds) {
    assert.ok(activeHongKongById.has(questionId), `${questionId}: strict registry entry is stale or inactive`);
    assert.equal(isRetiredQuestionId(questionId), false, `${questionId}: retired ID must not remain in the strict registry`);
  }
  assert.deepEqual(
    [...registeredIds].filter((questionId) => displayedById.has(questionId)).sort(),
    [...demandedIds].sort()
  );
  for (const questionId of demandedIds) {
    assert.equal(hasStrictQuestionResponseContract(questionId), true, `${questionId}: strict demand fell back to generic grading`);
  }
});

test("hidden non-EASE HK questions use dimension- and semantics-aware production contracts", () => {
  const byId = new Map(questions.filter((question) => question.curriculumTrack === "HK").map((question) => [question.id, question]));
  const displayedIds = new Set(displayedHongKongQuestions().map((question) => question.id));
  const hiddenIds = [
    "supp-p4-decimals-guided-example-v2",
    "supp-p5-volume-guided-example-v2",
    "supp-p5-charts-averages-key-fact-v2",
    "supp-p5-charts-averages-guided-example-v2",
    "supp-p6-speed-guided-example-v2",
    "supp-coordinates-key-fact",
    "supp-coordinates-guided-example",
    "supp-functions-guided-example",
    "supp-coordinate-geometry-guided-example",
    "graph-quadratic-patterns-opening-v2",
    "supp-p4-angles-guided-example-v2",
    "supp-quadratic-patterns-key-fact-v2"
  ];
  for (const questionId of hiddenIds) {
    assert.ok(byId.has(questionId), `${questionId}: missing active hidden question`);
    assert.equal(displayedIds.has(questionId), false, `${questionId}: fixture unexpectedly entered the 255 displayed surface`);
    assert.equal(hasStrictQuestionResponseContract(questionId), true, `${questionId}: missing hidden strict contract`);
  }

  const assertProbes = (questionId: string, accepted: string[], rejected: string[]) => {
    const payload = gradingQuestion(byId.get(questionId)!);
    for (const value of accepted) assert.equal(questionAnswerMatches(payload, value), true, `${questionId}: ${value}`);
    for (const value of rejected) assert.equal(questionAnswerMatches(payload, value), false, `${questionId}: ${value}`);
  };

  assert.equal(hasStrictQuestionResponseContract("supp-p4-decimals-guided-example"), false);
  assertProbes(
    "supp-p4-decimals-guided-example-v2",
    ["3.4"],
    ["17/5", "34/10", "3.4 cm", "3.4 km/h"]
  );
  assertProbes("supp-p5-volume-guided-example-v2", ["30 cm^3", "30 cubic centimetres", "30 立方厘米"], ["30", "30 cm^2", "30 km"]);
  assertProbes("supp-p5-charts-averages-key-fact-v2", ["15", "15 votes", "15 票"], ["15 cm", "15 km/h"]);
  assertProbes("supp-p5-charts-averages-guided-example-v2", ["4"], ["4 cm"]);
  assertProbes("supp-p6-speed-guided-example-v2", ["18 km", "18 kilometres", "18 公里"], ["18", "18 cm", "18 km/h"]);
  assertProbes("supp-coordinates-key-fact", ["-4"], ["-4 cm", "(-4,6)"]);
  assertProbes("supp-coordinates-guided-example", ["II", "Quadrant II", "second quadrant", "第二象限"], ["I", "Quadrant III"]);
  assertProbes("supp-functions-guided-example", ["9"], ["9 cm", "9°"]);
  assertProbes("supp-coordinate-geometry-guided-example", ["5", "5 units", "5 單位"], ["5 cm", "5 km"]);
  assertProbes("graph-quadratic-patterns-opening-v2", ["downward", "opens down", "開口向下"], ["upward", "opens up"]);
  assertProbes("supp-p4-angles-guided-example-v2", ["rhombus", "a rhombus", "菱形"], ["rectangle", "square"]);
  assertProbes("supp-quadratic-patterns-key-fact-v2", ["x=-1", "the axis is x = -1", "對稱軸是 x=-1"], ["-1", "y=-1", "x=1"]);
});

test("all 255 displayed canonical answers, aliases, and correct localized MC options round-trip through production grading", () => {
  for (const question of displayedHongKongQuestions()) {
    const payload = gradingQuestion(question);
    for (const accepted of [question.answer, ...(question.acceptedAnswers ?? [])]) {
      assert.equal(questionAnswerMatches(payload, accepted), true, `${question.id}: rejected checked-in answer '${accepted}'`);
    }

    if (!question.options?.length) continue;
    const correctOptions = question.options.filter((option) =>
      answerMatches(question.answer, option.en) || answerMatches(question.answer, option.zh)
    );
    assert.equal(correctOptions.length, 1, `${question.id}: expected one correct localized option`);
    assert.equal(questionAnswerMatches(payload, correctOptions[0].en), true, `${question.id}: rejected EN correct option`);
    assert.equal(questionAnswerMatches(payload, correctOptions[0].zh), true, `${question.id}: rejected ZH correct option`);
  }
});

test("active fraction contracts preserve the representation requested by each prompt", () => {
  const byId = new Map(displayedHongKongQuestions().map((question) => [question.id, question]));
  const fixedFour = gradingQuestion(byId.get("pq-p3-fractions-intro-2-v2")!);
  assert.equal(questionAnswerMatches(fixedFour, "2/4"), true);
  assert.equal(questionAnswerMatches(fixedFour, String.raw`\frac{2}{4}`), true);
  for (const invalid of ["1/2", "3/6", "0.5", "50%", "-2/-4"]) {
    assert.equal(questionAnswerMatches(fixedFour, invalid), false, invalid);
  }

  const fixedSix = gradingQuestion(byId.get("supp-p3-fractions-intro-guided-example-v2")!);
  assert.equal(questionAnswerMatches(fixedSix, "4/6"), true);
  assert.equal(questionAnswerMatches(fixedSix, "2/3"), false);
  assert.equal(questionAnswerMatches(fixedSix, "0.6666667"), false);

  const simplest = gradingQuestion(byId.get("pq-p5-fractions-operations-2-v2")!);
  assert.equal(questionAnswerMatches(simplest, "7/12"), true);
  assert.equal(questionAnswerMatches(simplest, "14/24"), false);
  assert.equal(questionAnswerMatches(simplest, "0.583333"), false);
});

test("quantity contracts accept localized units but reject bare values, wrong dimensions, and wrong forms", () => {
  const byId = new Map(displayedHongKongQuestions().map((question) => [question.id, question]));
  const cases = [
    ["pq-p3-measurement-2-v2", "900 毫升", "900"],
    ["pq-p4-perimeter-area-1-v2", "22 厘米", "22"],
    ["supp-p4-perimeter-area-guided-example-v2", "18 平方厘米", "18"],
    ["pq-p5-volume-1-v2", "24 立方厘米", "24"],
    ["pq-p5-rates-1-v2", "$5", "5"],
    ["pq-p6-speed-1-v2", "30 公里每小時", "30"],
    ["graph-p6-speed-distance-v2", "6 公里", "6"],
    ["pq-p6-ratio-proportion-2-v2", "攝氏 24 度", "24"]
  ] as const;

  for (const [questionId, localized, bare] of cases) {
    const question = gradingQuestion(byId.get(questionId)!);
    assert.equal(questionAnswerMatches(question, localized), true, `${questionId}: localized unit`);
    assert.equal(questionAnswerMatches(question, bare), false, `${questionId}: bare value`);
  }

  const suffixSupplied = gradingQuestion(byId.get("pq-p2-length-data-1-v2")!);
  assert.equal(questionAnswerMatches(suffixSupplied, "100"), true);
  assert.equal(questionAnswerMatches(suffixSupplied, "100 cm"), true);
  assert.equal(questionAnswerMatches(suffixSupplied, "1 m"), false);

  const mixed = gradingQuestion(byId.get("supp-p2-length-data-guided-example-v2")!);
  assert.equal(questionAnswerMatches(mixed, "1米10厘米"), true);
  assert.equal(questionAnswerMatches(mixed, "1 米 10 厘米"), true);
  assert.equal(questionAnswerMatches(mixed, "110 cm"), false);
  assert.equal(questionAnswerMatches(mixed, "1.1 m"), false);
});

test("clock, angle, axis, and precision contracts retain the form required by the question", () => {
  const byId = new Map(displayedHongKongQuestions().map((question) => [question.id, question]));
  const three = gradingQuestion(byId.get("pq-p1-measurement-time-2-v2")!);
  for (const valid of ["3 o'clock", "3:00", "three o'clock", "3時", "3時正"]) {
    assert.equal(questionAnswerMatches(three, valid), true, valid);
  }
  assert.equal(questionAnswerMatches(three, "3"), false);

  const angle = gradingQuestion(byId.get("supp-circles-key-fact-v2")!);
  assert.equal(questionAnswerMatches(angle, "90°"), true);
  assert.equal(questionAnswerMatches(angle, "90 degrees"), true);
  assert.equal(questionAnswerMatches(angle, "90度"), true);
  assert.equal(questionAnswerMatches(angle, "90"), false);

  const axis = gradingQuestion(byId.get("graph-quadratic-patterns-axis-v2")!);
  assert.equal(questionAnswerMatches(axis, "x=-2"), true);
  assert.equal(questionAnswerMatches(axis, "x 等於 -2"), true);
  assert.equal(questionAnswerMatches(axis, "-2"), false);

  const precision = gradingQuestion(byId.get("supp-exam-revision-guided-example-v2")!);
  assert.equal(questionAnswerMatches(precision, "1.50 min/mark"), true);
  assert.equal(questionAnswerMatches(precision, "1.50 分鐘／分"), true);
  assert.equal(questionAnswerMatches(precision, "1.5 min/mark"), false);
  assert.equal(questionAnswerMatches(precision, "1.50"), false);
});

test("algebra contracts accept commutative order while rejecting caretless exponents and non-equivalent work", () => {
  const byId = new Map(displayedHongKongQuestions().map((question) => [question.id, question]));
  const cases = [
    ["q18-v2", "6+5x+x^2", "x2+5x+6"],
    ["supp-polynomials-guided-example-v2", "4x+x²", "x^2+5x"],
    ["supp-more-algebra-key-fact-v2", "2+a", "a+3"],
    ["supp-more-algebra-guided-example-v2", "3+b", "b+4"]
  ] as const;

  for (const [questionId, equivalent, invalid] of cases) {
    const question = gradingQuestion(byId.get(questionId)!);
    assert.equal(questionAnswerMatches(question, equivalent), true, `${questionId}: commutative equivalent`);
    assert.equal(questionAnswerMatches(question, invalid), false, `${questionId}: invalid exponent/value`);
  }

  assert.equal(
    questionAnswerMatches(gradingQuestion(byId.get("supp-identities-square-patterns-key-fact-v2")!), "2ba"),
    true
  );
  assert.equal(
    questionAnswerMatches(gradingQuestion(byId.get("supp-identities-square-patterns-guided-example")!), "(a+b)(a-b)"),
    true
  );
});

test("semantic contracts accept harmless answer order and standard interval notation", () => {
  const byId = new Map(displayedHongKongQuestions().map((question) => [question.id, question]));
  const calculusBehaviour = gradingQuestion(byId.get("supp-calculus-key-fact-v2")!);
  for (const valid of ["decreasing", "decreases", "遞減", "下降"]) {
    assert.equal(questionAnswerMatches(calculusBehaviour, valid), true, `calculus behaviour: ${valid}`);
  }
  for (const invalid of ["increasing", "x^2+C", "遞增"]) {
    assert.equal(questionAnswerMatches(calculusBehaviour, invalid), false, `calculus behaviour: ${invalid}`);
  }
  assert.equal(questionAnswerMatches(gradingQuestion(byId.get("supp-p4-angles-key-fact-v2")!), "菱形和長方形"), true);
  assert.equal(questionAnswerMatches(gradingQuestion(byId.get("supp-p4-large-numbers-guided-example-v2")!), "LCM=36; HCF=6"), true);
  assert.equal(questionAnswerMatches(gradingQuestion(byId.get("graph-quadratic-patterns-roots-v2")!), "x=3 and x=1"), true);
  assert.equal(questionAnswerMatches(gradingQuestion(byId.get("q27")!), "y stays the same and x changes sign"), true);
  assert.equal(questionAnswerMatches(gradingQuestion(byId.get("q27")!), "y changes sign"), false);
  const domain = gradingQuestion(byId.get("supp-advanced-functions-guided-example-v2")!);
  assert.equal(questionAnswerMatches(domain, "(-2,∞)"), true);
  assert.equal(questionAnswerMatches(domain, "x∈(-2,∞)"), true);
  assert.equal(questionAnswerMatches(domain, "[-2,∞)"), false);
  const orderedPair = gradingQuestion(byId.get("graph-quadratic-patterns-y-intercept-v2")!);
  assert.equal(questionAnswerMatches(orderedPair, "(0,-4)"), true);
  assert.equal(questionAnswerMatches(orderedPair, "0,-4"), false);
});

test("retired historical question IDs remain server-side tombstones", () => {
  const expectedId = "graph-p4-angles-straight-line";
  assert.ok(retiredQuestionIds instanceof Set);
  assert.equal(retiredQuestionIds.has(expectedId), true);
  assert.equal(isRetiredQuestionId(expectedId), true);
  assert.equal(isRetiredQuestionId("graph-s1-angles-straight-line"), false);
  assert.equal(questionResponseContractFor(expectedId).kind, "generic-equivalence");
});
