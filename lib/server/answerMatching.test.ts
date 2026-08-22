import assert from "node:assert/strict";
import test from "node:test";
import { mainlandBnuPrimaryQuestions } from "@/data/mainlandBnuPrimaryQuestions";
import { mainlandBnuJuniorQuestions } from "@/data/mainlandBnuJuniorQuestions";
import { mainlandBnuHighQuestions } from "@/data/mainlandBnuHighQuestions";
import { mainlandHjbPrimaryQuestions } from "@/data/mainlandHjbPrimaryQuestions";
import { mainlandHjbJuniorQuestions } from "@/data/mainlandHjbJuniorQuestions";
import { mainlandHjbHighQuestions } from "@/data/mainlandHjbHighQuestions";
import { mainlandPepPrimaryRagV1Questions } from "@/data/mainlandPepPrimaryQuestions";
import { mainlandPepJuniorQuestions } from "@/data/mainlandPepJuniorQuestions";
import { mainlandPepHighQuestions } from "@/data/mainlandPepHighQuestions";
import { chinaAnswerBindingContracts } from "@/data/chinaAnswerBindingContracts";
import {
  answerMatches,
  explicitQuantityAnswerDimensions,
  parseScalarAnswer,
  questionAnswerMatches
} from "./answerMatching";

const shortAnswerQuestion = (answer: string) => ({
  answer,
  accepted_answers: null,
  options: null
});

test("short-answer grading accepts English number words for numeric answers", () => {
  assert.equal(questionAnswerMatches(shortAnswerQuestion("6"), "Six"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("6 buttons"), "sIx"), true);
});

test("short-answer grading accepts phrase fractions for fraction answers", () => {
  assert.equal(questionAnswerMatches(shortAnswerQuestion("2/9"), "2 out of 9"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("2/9"), "two out of nine"), true);
});

test("short-answer grading accepts shape side unit variants", () => {
  assert.equal(questionAnswerMatches({
    answer: "4",
    accepted_answers: ["4 sides"],
    options: null
  }, "four sides"), true);
  assert.equal(questionAnswerMatches({
    answer: "4",
    accepted_answers: ["4 sides"],
    options: null
  }, "4 side"), true);
});

test("short-answer grading accepts a valid full-work equation ending in the answer", () => {
  assert.equal(questionAnswerMatches(shortAnswerQuestion("10"), "15 - 5 = 10"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("10 cards"), "15-5=10"), true);
});

test("short-answer grading extracts circled or boxed OCR final answers", () => {
  assert.equal(questionAnswerMatches(shortAnswerQuestion("13"), "17-4=\\textcircled{13}"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("13 counters"), "17-4=\\boxed{13}"), true);
});

test("short-answer grading unwraps ordinary whole-value brackets only for one scalar or quantity", () => {
  assert.equal(questionAnswerMatches(shortAnswerQuestion("42"), "(42)"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("42"), "[42]"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("42 cm"), "[42 cm]"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("42"), "{42}"), false);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("(3, 4)"), "3, 4"), false);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("(3, 4)"), "[3, 4]"), false);
});

test("real coordinate, set, and interval answers preserve their delimiter semantics", () => {
  const gradingQuestion = (questions: typeof mainlandPepPrimaryRagV1Questions, id: string) => {
    const question = questions.find((candidate) => candidate.id === id);
    assert.ok(question, `Missing real bracket-semantics regression question ${id}`);
    return {
      id: question.id,
      answer: question.answer,
      accepted_answers: question.acceptedAnswers ?? null,
      options: question.options ?? null
    };
  };
  const highGradingQuestion = (id: string) => {
    const question = mainlandHjbHighQuestions.find((candidate) => candidate.id === id);
    assert.ok(question, `Missing real bracket-semantics regression question ${id}`);
    return {
      id: question.id,
      answer: question.answer,
      accepted_answers: question.acceptedAnswers ?? null,
      options: question.options ?? null
    };
  };

  const coordinate = gradingQuestion(mainlandPepPrimaryRagV1Questions, "pep-primary-p6-u-fi-061");
  assert.equal(questionAnswerMatches(coordinate, "(2,5)"), true);
  assert.equal(questionAnswerMatches(coordinate, "[2,5]"), false);
  assert.equal(questionAnswerMatches(coordinate, "2,5"), false);

  const enumeratedSet = highGradingQuestion("hjb-high-ds-v2-s4-003");
  assert.equal(questionAnswerMatches(enumeratedSet, "{0,2}"), true);
  assert.equal(questionAnswerMatches(enumeratedSet, "(0,2)"), false);
  assert.equal(questionAnswerMatches(enumeratedSet, "[0,2]"), false);

  const closedInterval = highGradingQuestion("hjb-high-ds-v2-s4-093");
  assert.equal(questionAnswerMatches(closedInterval, "[-1,2]"), true);
  assert.equal(questionAnswerMatches(closedInterval, "(-1,2)"), false);

  const halfOpenInterval = highGradingQuestion("hjb-high-ds-v2-s4-212");
  assert.equal(questionAnswerMatches(halfOpenInterval, "[3,+∞)"), true);
  assert.equal(questionAnswerMatches(halfOpenInterval, "[3,+∞]"), false);

  assert.equal(questionAnswerMatches(shortAnswerQuestion("{-1}"), "{-1}"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("{-1}"), "(-1)"), false);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("{-1}"), "[-1]"), false);

  const singletonSolutionSet = highGradingQuestion("hjb-high-ds-v2-s4-207");
  assert.equal(questionAnswerMatches(singletonSolutionSet, "{-1}"), true);
  assert.equal(questionAnswerMatches(singletonSolutionSet, "x=-1"), true);
  assert.equal(questionAnswerMatches(singletonSolutionSet, "-1"), true);
  assert.equal(questionAnswerMatches(singletonSolutionSet, "(-1)"), false);
  assert.equal(questionAnswerMatches(singletonSolutionSet, "[-1]"), false);
});

test("simple enumerated sets accept element permutations without erasing curly braces", () => {
  const cases = [
    ["hjb-high-ds-v2-s4-002", "{1/3, 1/2, 0}"],
    ["hjb-high-ds-v2-s4-003", "{2, 0}"],
    ["hjb-high-ds-v2-s4-011", "{8, 6, 4, 2}"],
    ["hjb-high-ds-v2-s4-012", "{8, 6, 4, 2, 1}"],
    ["hjb-high-ds-v2-s4-014", "{1/3, 1/2, 0}"],
    ["hjb-high-ds-v2-s4-015", "{12, 6, 4, 3, 2, 1}"],
    ["hjb-high-ds-v2-s4-023", "{8, 6, 4, 2}"],
    ["hjb-high-ds-v2-s4-032", "{3, 2, 1}"],
    ["hjb-high-ds-v2-s4-041", "{8, 7, 1}"]
  ] as const;

  for (const [id, permutation] of cases) {
    const question = mainlandHjbHighQuestions.find((candidate) => candidate.id === id);
    assert.ok(question, `Missing real set-permutation regression question ${id}`);
    const gradingQuestion = {
      id: question.id,
      answer: question.answer,
      accepted_answers: question.acceptedAnswers ?? null,
      options: question.options ?? null
    };
    assert.equal(questionAnswerMatches(gradingQuestion, permutation), true, `${id} permutation`);
  }
});

test("circled condition labels remain structured answers rather than NFKC-concatenated scalars", () => {
  const cases = [
    {
      id: "bnu-junior-ds-v1-s2-249",
      accepted: ["①④", "①、④", "1,4"],
      rejected: ["14", "④"]
    },
    {
      id: "bnu-junior-ds-v1-s3-015",
      accepted: ["②④", "④②"],
      rejected: ["24", "②"]
    }
  ];

  for (const { id, accepted, rejected } of cases) {
    const question = mainlandBnuJuniorQuestions.find((candidate) => candidate.id === id);
    assert.ok(question, `Missing real circled-label regression question ${id}`);
    const gradingQuestion = {
      id: question.id,
      answer: question.answer,
      accepted_answers: question.acceptedAnswers ?? null,
      options: question.options ?? null
    };
    assert.equal(parseScalarAnswer(question.answer), null, `${id} must not become a bare scalar`);
    for (const answer of accepted) {
      assert.equal(questionAnswerMatches(gradingQuestion, answer), true, `${id} accepts ${answer}`);
    }
    for (const answer of rejected) {
      assert.equal(questionAnswerMatches(gradingQuestion, answer), false, `${id} rejects ${answer}`);
    }
  }
});

test("all 21 circled-label canonicals remain structural and multi-label answers reject digit concatenation", () => {
  const ids = [
    "bnu-primary-ds-v2-p1-081",
    "bnu-primary-ds-v2-p1-084",
    "bnu-primary-ds-v2-p1-090",
    "bnu-primary-ds-v2-p2-216",
    "bnu-junior-ds-v1-s2-237",
    "bnu-junior-ds-v1-s2-246",
    "bnu-junior-ds-v1-s2-249",
    "bnu-junior-ds-v1-s2-252",
    "bnu-junior-ds-v1-s2-263",
    "bnu-junior-ds-v1-s2-264",
    "bnu-junior-ds-v1-s3-008",
    "bnu-junior-ds-v1-s3-012",
    "bnu-junior-ds-v1-s3-015",
    "bnu-junior-ds-v1-s3-018",
    "bnu-junior-ds-v1-s3-030",
    "bnu-junior-ds-v1-s3-033",
    "bnu-junior-ds-v1-s3-039",
    "hjb-primary-ds-v1-p1-021",
    "hjb-primary-ds-v1-p1-177",
    "hjb-primary-ds-v1-p1-184",
    "hjb-junior-ds-v2-s3-062"
  ] as const;
  const byId = new Map([
    ...mainlandBnuPrimaryQuestions,
    ...mainlandBnuJuniorQuestions,
    ...mainlandHjbPrimaryQuestions,
    ...mainlandHjbJuniorQuestions
  ].map((question) => [question.id, question]));

  assert.equal(ids.length, 21);
  const legacyDigitAcceptances: string[] = [];
  for (const id of ids) {
    const question = byId.get(id);
    assert.ok(question, `Missing real circled-label question ${id}`);
    const legacyDigits = question.answer.normalize("NFKC");
    assert.match(legacyDigits, /^\d+$/u, `${id} should document the legacy NFKC digit collapse`);
    assert.equal(parseScalarAnswer(question.answer), null, `${id} canonical must remain structural`);
    const gradingQuestion = {
      id: question.id,
      answer: question.answer,
      accepted_answers: question.acceptedAnswers ?? null,
      options: question.options ?? null
    };
    assert.equal(questionAnswerMatches(gradingQuestion, question.answer), true, `${id} canonical`);
    if (Array.from(question.answer).length > 1 && questionAnswerMatches(gradingQuestion, legacyDigits)) {
      legacyDigitAcceptances.push(`${id}:${legacyDigits}`);
    }
  }
  assert.deepEqual(legacyDigitAcceptances, []);
});

test("space-separated index lists are not collapsed into one scalar", () => {
  assert.equal(parseScalarAnswer("2 3 1"), null);
  assert.equal(answerMatches("231", "2 3 1"), false);
  assert.equal(answerMatches("2,3,1", "2 3 1"), false);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("7 1/2"), "7.5"), true);
});

test("short-answer grading keeps interior grouping brackets significant", () => {
  assert.equal(questionAnswerMatches(shortAnswerQuestion("（15+5）×3"), "15+5×3"), false);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("50 - (4 × 6 + 8)"), "50 - 4 × 6 + 8"), false);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("4(a - 3) = 37"), "4a - 3 = 37"), false);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("3(x - 5) = 2(x + 7)"), "3x - 5 = 2x + 7"), false);
});

test("mixed numbers grade as whole plus fraction, not concatenated fraction", () => {
  assert.equal(questionAnswerMatches(shortAnswerQuestion("7 1/2"), "7.5"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("7 1/2"), "15/2"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("7 1/2"), "35.5"), false);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("7 1/2"), "71/2"), false);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("1 3/7"), "10/7"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("1 3/7"), "1 3/7"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("1 3/7"), "13/7"), false);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("-7 1/2"), "-7.5"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("9 3/4"), "39/4"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("9 3/4"), "9.75"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("9 3/4"), "93/4"), false);
});

test("mixed numbers with unit suffixes still parse as mixed numbers", () => {
  assert.equal(questionAnswerMatches(shortAnswerQuestion("3 1/2 cm"), "3.5"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("3 1/2 cm"), "35.5"), false);
});

test("multiple-choice grading accepts rendered TeX unit option values", () => {
  assert.equal(
    questionAnswerMatches({
      answer: "cm^3",
      accepted_answers: null,
      options: [
        { en: "cm", zh: "厘米" },
        { en: "cm^2", zh: "平方厘米" },
        { en: "cm^3", zh: "立方厘米" },
        { en: "kg", zh: "公斤" }
      ]
    }, "\\(\\text{cm}^{3}\\)"),
    true
  );

  assert.equal(
    questionAnswerMatches({
      answer: "20 cm^2",
      accepted_answers: null,
      options: [
        { en: "9 cm^2", zh: "9 平方厘米" },
        { en: "18 cm^2", zh: "18 平方厘米" },
        { en: "20 cm^2", zh: "20 平方厘米" },
        { en: "25 cm^2", zh: "25 平方厘米" }
      ]
    }, "\\(20\\,\\text{cm}^{2}\\)"),
    true
  );
});

test("multiple-choice grading equates Traditional source options with their displayed Simplified form", () => {
  const multilingualQuestion = {
    answer: "Count on or count back from the known number",
    accepted_answers: null,
    options: [
      {
        en: "Count on or count back from the known number",
        zh: "由已知數開始順數或倒數"
      },
      {
        en: "Guess from appearance only",
        zh: "只憑外觀猜測"
      }
    ]
  };

  assert.equal(questionAnswerMatches(multilingualQuestion, "由已知数开始顺数或倒数"), true);
  assert.equal(questionAnswerMatches(multilingualQuestion, "只凭外观猜测"), false);

  assert.equal(questionAnswerMatches({
    answer: "Compare digits from the largest place value",
    accepted_answers: null,
    options: [
      { en: "Compare digits from the largest place value", zh: "由最大位值開始比較數字" },
      { en: "Ignore place value", zh: "忽略位值" }
    ]
  }, "由最大数位开始比较数字"), true);

  assert.equal(questionAnswerMatches({
    answer: "Decide whether the question asks for boundary or surface",
    accepted_answers: null,
    options: [
      { en: "Decide whether the question asks for boundary or surface", zh: "先判斷題目問周界還是面積" },
      { en: "Ignore the unit", zh: "忽略單位" }
    ]
  }, "先判断题目问周长还是面积"), true);
});

test("multiple-choice grading resolves canonical letter keys and prefixed option values", () => {
  const letterKeyedQuestion = {
    answer: "B",
    accepted_answers: null,
    options: [
      { en: "A. Correct", zh: "A. 正确", zhHans: "A. 正确" },
      { en: "B. Incorrect", zh: "B. 不對", zhHans: "B. 不对" },
      { en: "C. Not sure", zh: "C. 不確定", zhHans: "C. 不确定" }
    ]
  };
  assert.equal(questionAnswerMatches(letterKeyedQuestion, "B. 不对"), true);
  assert.equal(questionAnswerMatches(letterKeyedQuestion, "A. 正确"), false);

  const valueKeyedQuestion = {
    answer: "110°",
    accepted_answers: null,
    options: [
      { en: "A. 70°", zh: "A. 70°" },
      { en: "B. 90°", zh: "B. 90°" },
      { en: "C. 110°", zh: "C. 110°" },
      { en: "D. 180°", zh: "D. 180°" }
    ]
  };
  assert.equal(questionAnswerMatches(valueKeyedQuestion, "C. 110°"), true);
  assert.equal(questionAnswerMatches(valueKeyedQuestion, "A. 70°"), false);
});

test("natural-language MC options ending in unit-like Chinese words remain gradable", () => {
  const cases = [
    {
      id: "hjb-primary-ds-v1-p4-211",
      questions: mainlandHjbPrimaryQuestions
    },
    {
      id: "hjb-junior-ds-v2-s3-424",
      questions: mainlandHjbJuniorQuestions
    }
  ];

  for (const { id, questions } of cases) {
    const question = questions.find((candidate) => candidate.id === id);
    assert.ok(question, `Missing real HJB matcher regression question ${id}`);
    const gradingQuestion = {
      answer: question.answer,
      accepted_answers: question.acceptedAnswers ?? null,
      options: question.options ?? null
    };
    assert.equal(questionAnswerMatches(gradingQuestion, question.answer), true, `${id} canonical answer`);

    const optionHits = (question.options ?? []).map((option) => {
      const optionText = option.zhHans ?? option.zh ?? option.en;
      return questionAnswerMatches(gradingQuestion, optionText);
    });
    assert.equal(optionHits.filter(Boolean).length, 1, `${id} must accept exactly one displayed option`);

    const correctOptionIndex = optionHits.findIndex(Boolean);
    assert.notEqual(correctOptionIndex, -1, `${id} correct option index`);
    const correctOption = question.options?.[correctOptionIndex];
    assert.ok(correctOption, `${id} correct displayed option`);
    for (const optionText of [correctOption.en, correctOption.zh, correctOption.zhHans ?? ""].filter(Boolean)) {
      assert.equal(questionAnswerMatches(gradingQuestion, optionText), true, `${id}: ${optionText}`);
    }
  }
});

test("MC equation answers retain their left-hand mathematical binding", () => {
  const cases = [
    {
      id: "bnu-junior-ds-v1-s1-439",
      questions: mainlandBnuJuniorQuestions
    },
    {
      id: "hjb-junior-ds-v2-s3-082",
      questions: mainlandHjbJuniorQuestions
    },
    {
      id: "hjb-junior-ds-v2-s3-124",
      questions: mainlandHjbJuniorQuestions
    }
  ];

  for (const { id, questions } of cases) {
    const question = questions.find((candidate) => candidate.id === id);
    assert.ok(question, `Missing real equation-binding regression question ${id}`);
    const gradingQuestion = {
      answer: question.answer,
      accepted_answers: question.acceptedAnswers ?? null,
      options: question.options ?? null
    };
    assert.equal(questionAnswerMatches(gradingQuestion, question.answer), true, `${id} canonical answer`);
    const optionHits = (question.options ?? []).map((option) =>
      questionAnswerMatches(gradingQuestion, option.zhHans ?? option.zh ?? option.en)
    );
    assert.equal(optionHits.filter(Boolean).length, 1, `${id} must accept exactly one displayed option`);
  }

  assert.equal(answerMatches("y=4", "x=4"), false);
  assert.equal(answerMatches("AC=12", "EF=12"), false);
  assert.equal(answerMatches("cosA=3/5", "sinA=3/5"), false);
  assert.equal(answerMatches("x=4", "4"), true);
  assert.equal(answerMatches("x=0.39 m", "39 cm"), true);
  assert.equal(answerMatches("15-5=10 cm", "10 cm"), true);
});

test("multi-solution MC answers are compared as complete solution sets", () => {
  const id = "pep-junior-v2-s3-k10-mc-001";
  const question = mainlandPepJuniorQuestions.find((candidate) => candidate.id === id);
  assert.ok(question, `Missing real complete-solution-set regression question ${id}`);
  const gradingQuestion = {
    answer: question.answer,
    accepted_answers: question.acceptedAnswers ?? null,
    options: question.options ?? null
  };
  assert.equal(questionAnswerMatches(gradingQuestion, question.answer), true);
  const optionHits = (question.options ?? []).map((option) =>
    questionAnswerMatches(gradingQuestion, option.zhHans ?? option.zh ?? option.en)
  );
  assert.deepEqual(optionHits, [false, false, false, true]);
});

test("bare A-F answers remain literal when an option displays that exact value", () => {
  const literalB = {
    answer: "B",
    accepted_answers: null,
    options: [
      { en: "B", zh: "B", zhHans: "B" },
      { en: "A", zh: "A", zhHans: "A" },
      { en: "same", zh: "same", zhHans: "same" },
      { en: "cannot tell", zh: "cannot tell", zhHans: "cannot tell" }
    ]
  };
  assert.equal(questionAnswerMatches(literalB, "B"), true);
  assert.equal(questionAnswerMatches(literalB, "A"), false);

  const variableB = {
    answer: "b",
    accepted_answers: null,
    options: [
      { en: "b", zh: "b", zhHans: "b" },
      { en: "m", zh: "m", zhHans: "m" },
      { en: "x", zh: "x", zhHans: "x" },
      { en: "y", zh: "y", zhHans: "y" }
    ]
  };
  assert.equal(questionAnswerMatches(variableB, "b"), true);
  assert.equal(questionAnswerMatches(variableB, "m"), false);
});

test("Unicode exponents remain mathematical exponents during grading", () => {
  assert.equal(questionAnswerMatches(shortAnswerQuestion("30x^5"), "30x⁵"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("30x^5"), "30*x^5"), false);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("30x^5"), "30x5"), false);
  assert.equal(questionAnswerMatches({
    answer: "30x^5",
    accepted_answers: ["30x⁵", "30*x^5"],
    options: null
  }, "30*x^5"), true);
  assert.equal(questionAnswerMatches({
    answer: "30x^5",
    accepted_answers: ["30x⁵", "30*x^5"],
    options: null
  }, "30x5"), false);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("cm^2"), "cm²"), true);
});

test("explicit quantities reject incompatible dimensions even when their scalars match", () => {
  assert.equal(questionAnswerMatches(shortAnswerQuestion("39 cm"), "39 km"), false);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("48 cm^2"), "48 cm^3"), false);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("5 L"), "5 mL"), false);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("92°"), "92 cm"), false);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("20 ℃"), "20 cm"), false);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("5 cards"), "5 blocks"), false);
  assert.equal(answerMatches("162 cm", "162 m²"), false);
});

test("explicit quantities accept equal same-dimension conversions only", () => {
  assert.equal(questionAnswerMatches(shortAnswerQuestion("39 cm"), "0.39 m"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("5 L"), "5000 mL"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("1 m²"), "10000 cm²"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("1 kg"), "1000 g"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("1 h"), "60 min"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("1 cm³"), "1 mL"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("160立方分米"), "160 L"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("36 km/h"), "10 m/s"), true);

  assert.equal(questionAnswerMatches(shortAnswerQuestion("39 cm"), "39 m"), false);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("5 L"), "5 mL"), false);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("1 m²"), "1 cm²"), false);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("1 kg"), "1 g"), false);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("1 h"), "1 min"), false);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("20 cm"), "twenty centimetres"), true);
});

test("Chinese per-hour speed abbreviations are parsed as speed quantities", () => {
  for (const value of ["48千米/时", "48公里/时"]) {
    assert.deepEqual(explicitQuantityAnswerDimensions(value), ["speed"], value);
    assert.equal(questionAnswerMatches(shortAnswerQuestion("48 km/h"), value), true, value);
    assert.equal(questionAnswerMatches(shortAnswerQuestion("48 km"), value), false, value);
  }
});

test("large physical quantities reject adjacent values while retaining exact conversions", () => {
  assert.equal(questionAnswerMatches(shortAnswerQuestion("1000000000 m"), "1000000001 m"), false);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("1050000000 m"), "1049999999 m"), false);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("1000000000 m"), "1000000 km"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("1050000000 m"), "1050000 km"), true);
});

test("bare numeric answers remain compatible with an explicitly unitized canonical answer", () => {
  assert.equal(questionAnswerMatches(shortAnswerQuestion("39 cm"), "39"), true);
  assert.equal(questionAnswerMatches({
    answer: "39 cm",
    accepted_answers: ["39厘米", "39"],
    options: null
  }, "39"), true);
});

test("a bare accepted alias cannot let an explicitly wrong unit bypass the canonical unit contract", () => {
  const question = {
    answer: "39 cm",
    accepted_answers: ["39厘米", "39"],
    options: null
  };

  assert.equal(questionAnswerMatches(question, "39 km"), false);
  assert.equal(questionAnswerMatches(question, "0.39 m"), true);
  assert.equal(questionAnswerMatches(question, "39"), true);
  assert.equal(answerMatches("39 km", "39"), false);
});

test("validated final-answer equations retain quantity semantics", () => {
  assert.equal(questionAnswerMatches(shortAnswerQuestion("10 cm"), "15-5=10 cm"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("10 cm"), "15-5=10 km"), false);
  assert.equal(questionAnswerMatches({
    ...shortAnswerQuestion("39 cm"),
    answerBindings: ["x"],
    prompt: { en: "Solve for x.", zh: "求x的值。", zhHans: "求x的值。" }
  }, "x=0.39 m"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("39 cm"), "39 km cm"), false);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("10 cm"), "15-5=10 cards cm"), false);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("39 cm"), "39 cm because it looks right"), false);
});

test("bare numeric canonicals reject identifier bindings unless a question-scoped contract authorizes them", () => {
  const placeValueId = "pep-primary-p2-l-fi-158";
  const placeValueQuestion = mainlandPepPrimaryRagV1Questions.find((candidate) => candidate.id === placeValueId);
  assert.ok(placeValueQuestion, `Missing real place-value binding regression question ${placeValueId}`);
  const placeValueGradingQuestion = {
    id: placeValueQuestion.id,
    answer: placeValueQuestion.answer,
    accepted_answers: placeValueQuestion.acceptedAnswers ?? null,
    options: placeValueQuestion.options ?? null,
    prompt: placeValueQuestion.prompt
  };

  assert.equal(questionAnswerMatches(placeValueGradingQuestion, "4"), true);
  assert.equal(questionAnswerMatches(placeValueGradingQuestion, "wrong=4"), false);
  assert.equal(questionAnswerMatches(placeValueGradingQuestion, "y=4"), false);
  assert.equal(questionAnswerMatches(placeValueGradingQuestion, "x=4"), false);
  assert.equal(questionAnswerMatches(placeValueGradingQuestion, "15-11=4"), true);

  const equationId = "pep-junior-v2-s1-k02-fi-009";
  const equationQuestion = mainlandPepJuniorQuestions.find((candidate) => candidate.id === equationId);
  assert.ok(equationQuestion, `Missing real equation-binding regression question ${equationId}`);
  const equationGradingQuestion = {
    id: equationQuestion.id,
    answer: equationQuestion.answer,
    accepted_answers: equationQuestion.acceptedAnswers ?? null,
    options: equationQuestion.options ?? null,
    prompt: equationQuestion.prompt
  };

  assert.equal(questionAnswerMatches(equationGradingQuestion, "4"), true);
  assert.equal(questionAnswerMatches(equationGradingQuestion, "x=4"), true);
  assert.equal(questionAnswerMatches(equationGradingQuestion, "y=4"), false);
  assert.equal(questionAnswerMatches(equationGradingQuestion, "wrong=4"), false);
});

test("all 6,935 current bare-scalar Mainland questions use the frozen explicit binding contract rather than prompt inference", () => {
  const packs = {
    pepPrimary: mainlandPepPrimaryRagV1Questions,
    pepJunior: mainlandPepJuniorQuestions,
    pepHigh: mainlandPepHighQuestions,
    bnuPrimary: mainlandBnuPrimaryQuestions,
    bnuJunior: mainlandBnuJuniorQuestions,
    bnuHigh: mainlandBnuHighQuestions,
    hjbPrimary: mainlandHjbPrimaryQuestions,
    hjbJunior: mainlandHjbJuniorQuestions,
    hjbHigh: mainlandHjbHighQuestions
  };
  const allQuestions = Object.values(packs).flat();
  assert.equal(allQuestions.length, 17_700);

  const inScope = (question: (typeof allQuestions)[number]) =>
    question.type !== "multiple-choice" &&
    parseScalarAnswer(question.answer) !== null &&
    explicitQuantityAnswerDimensions(question.answer).length === 0;
  const scopedQuestions = allQuestions.filter(inScope);
  const contractEntries = Object.values(chinaAnswerBindingContracts).reduce((sum, bindings) => sum + bindings.length, 0);
  assert.equal(scopedQuestions.length, 6_935);
  assert.deepEqual(
    Object.fromEntries(Object.entries(packs).map(([pack, questions]) => [pack, questions.filter(inScope).length])),
    {
      pepPrimary: 309,
      pepJunior: 233,
      pepHigh: 3_180,
      bnuPrimary: 572,
      bnuJunior: 284,
      bnuHigh: 941,
      hjbPrimary: 327,
      hjbJunior: 354,
      hjbHigh: 735
    }
  );
  assert.equal(Object.keys(chinaAnswerBindingContracts).length, 945);
  assert.equal(contractEntries, 1_021);

  const scopedIds = new Set(scopedQuestions.map((question) => question.id));
  const previousStageEntrants = [
    "bnu-junior-ds-v1-s2-237",
    "bnu-junior-ds-v1-s3-039",
    "hjb-junior-ds-v2-s1-258"
  ];
  const previousStageDepartures = [
    "bnu-junior-ds-v1-s2-240",
    "bnu-junior-ds-v1-s2-248",
    "bnu-junior-ds-v1-s3-009",
    "bnu-primary-ds-v1-p4-015",
    "bnu-primary-ds-v2-p1-012",
    "bnu-primary-ds-v2-p1-135",
    "bnu-primary-ds-v1-p2-014",
    "bnu-primary-ds-v1-p2-107",
    "bnu-primary-ds-v2-p4-045",
    "bnu-primary-ds-v1-p5-062",
    "bnu-primary-ds-v2-p5-210",
    "bnu-primary-ds-v2-p5-194",
    "bnu-primary-ds-v1-p6-086",
    "bnu-primary-ds-v2-p6-042",
    "bnu-primary-ds-v2-p6-044",
    "hjb-high-ds-v2-s4-207"
  ];
  const currentStageDepartureGroups = {
    circledStructural: [
      "bnu-junior-ds-v1-s2-237",
      "bnu-junior-ds-v1-s2-246",
      "bnu-junior-ds-v1-s2-252",
      "bnu-junior-ds-v1-s2-263",
      "bnu-junior-ds-v1-s2-264",
      "bnu-junior-ds-v1-s3-008",
      "bnu-junior-ds-v1-s3-012",
      "bnu-junior-ds-v1-s3-015",
      "bnu-junior-ds-v1-s3-018",
      "bnu-junior-ds-v1-s3-030",
      "bnu-junior-ds-v1-s3-033",
      "bnu-junior-ds-v1-s3-039",
      "bnu-primary-ds-v2-p1-081",
      "bnu-primary-ds-v2-p1-084",
      "bnu-primary-ds-v2-p1-090",
      "bnu-primary-ds-v2-p2-216",
      "hjb-junior-ds-v2-s3-062",
      "hjb-primary-ds-v1-p1-021",
      "hjb-primary-ds-v1-p1-177",
      "hjb-primary-ds-v1-p1-184"
    ],
    compoundFullResponse: [
      "bnu-junior-ds-v1-s1-171",
      "bnu-junior-ds-v1-s1-482",
      "bnu-junior-ds-v1-s1-484",
      "bnu-junior-ds-v1-s2-165",
      "hjb-junior-ds-v2-s1-003",
      "hjb-junior-ds-v2-s1-015",
      "hjb-junior-ds-v2-s1-033",
      "hjb-junior-ds-v2-s1-045",
      "hjb-junior-ds-v2-s1-153",
      "hjb-junior-ds-v2-s1-156",
      "hjb-junior-ds-v2-s1-159",
      "hjb-junior-ds-v2-s1-162",
      "hjb-junior-ds-v2-s1-168",
      "hjb-junior-ds-v2-s1-174",
      "hjb-junior-ds-v2-s1-177",
      "hjb-junior-ds-v2-s1-183",
      "hjb-junior-ds-v2-s1-189",
      "hjb-junior-ds-v2-s1-192",
      "hjb-junior-ds-v2-s2-105",
      "hjb-primary-ds-v1-p5-027",
      "hjb-primary-ds-v1-p6-204"
    ],
    explicitUnit: [
      "bnu-primary-ds-v2-p5-048",
      "bnu-primary-ds-v2-p5-129"
    ],
    correctedNonScalar: [
      { id: "bnu-junior-ds-v1-s1-072", removedBinding: "x" },
      { id: "bnu-junior-ds-v1-s2-050", removedBinding: null },
      { id: "bnu-junior-ds-v1-s2-447", removedBinding: "x" }
    ],
    labeledOrdinal: ["hjb-primary-ds-v1-p4-188"]
  } as const;
  const currentStageDepartures = [
    ...currentStageDepartureGroups.circledStructural,
    ...currentStageDepartureGroups.compoundFullResponse,
    ...currentStageDepartureGroups.explicitUnit,
    ...currentStageDepartureGroups.correctedNonScalar.map(({ id }) => id),
    ...currentStageDepartureGroups.labeledOrdinal
  ];
  const currentStageArrivals = [
    "bnu-junior-ds-v1-s3-006",
    "bnu-primary-ds-v1-p6-072",
    "hjb-junior-ds-v2-s3-387"
  ];
  const lineCircleCoverageDepartures = [
    { id: "bnu-high-ds-v1-s5-003", answer: "斜率不存在；x=3" },
    { id: "bnu-high-ds-v1-s5-005", answer: "相离" }
  ] as const;
  const bnuHighFamilyCoverageBatch1Departures = [
    { id: "bnu-high-ds-v1-s4-326", answer: "共线；b=3a", reason: "compound", removedBinding: "b" },
    { id: "bnu-high-ds-v1-s5-362", answer: "1；1/2", reason: "compound", removedBinding: null },
    { id: "bnu-high-ds-v1-s5-363", answer: "42%", reason: "explicit-unit", removedBinding: null },
    {
      id: "bnu-high-ds-v1-s5-431",
      answer: "独立；P(A∩B)=40/200=0.2=P(A)P(B)=(80/200)(100/200)",
      reason: "compound",
      removedBinding: null
    },
    { id: "bnu-high-ds-v1-s6-456", answer: "a₂=3，a₃=7，a₄=15", reason: "compound", removedBinding: null }
  ] as const;
  const bnuHighFamilyCoverageBatch2ADepartures = [
    {
      id: "bnu-high-ds-v1-s4-149",
      answer: "V(t)=120-8t；0≤t≤15；15分钟",
      dimensions: ["time"],
      removedBinding: "y"
    },
    {
      id: "bnu-high-ds-v1-s4-257",
      answer: "V(t)=100-8t；44升；支持，|53-52|=1≤2",
      dimensions: [],
      removedBinding: "y"
    },
    { id: "bnu-high-ds-v1-s4-363", answer: "18米", dimensions: ["length"], removedBinding: "y" },
    {
      id: "bnu-high-ds-v1-s5-221",
      answer: "在覆盖区域内；(5-2)²+(3+1)²=25≤25",
      dimensions: [],
      removedBinding: "y"
    },
    { id: "bnu-high-ds-v1-s5-222", answer: "5千米", dimensions: ["length"], removedBinding: "y" },
    { id: "bnu-high-ds-v1-s5-077", answer: "2个；Δ=16", dimensions: [], removedBinding: null }
  ] as const;
  const bnuHighFamilyCoverageBatch2BDepartures = [
    { id: "bnu-high-ds-v1-s4-006", answer: "充分不必要", dimensions: [], removedBinding: "x" },
    { id: "bnu-high-ds-v1-s4-005", answer: "[-1,2]", dimensions: [], removedBinding: "x" },
    { id: "bnu-high-ds-v1-s4-041", answer: "奇函数；f(-x)=-f(x)", dimensions: [], removedBinding: null },
    { id: "bnu-high-ds-v1-s4-078", answer: "0<a<1", dimensions: [], removedBinding: "k" },
    {
      id: "bnu-high-ds-v1-s4-077",
      answer: "N(t)=80×2^(t/3)；N(9)=640个",
      dimensions: [],
      removedBinding: "k"
    },
    {
      id: "bnu-high-ds-v1-s4-113",
      answer: "在(0,+∞)上单调递减；f(2)>f(4)",
      dimensions: [],
      removedBinding: "m"
    },
    { id: "bnu-high-ds-v1-s4-221", answer: "Ω={HH,HT,TH,TT}；1/2", dimensions: [], removedBinding: null }
  ] as const;
  const bnuHighFamilyCoverageBatch3ADepartures = [
    { id: "bnu-high-ds-v1-s4-434", previousAnswer: "3", answer: "8-i", removedBinding: null },
    { id: "bnu-high-ds-v1-s4-435", previousAnswer: "5", answer: "3+4i", removedBinding: null },
    { id: "bnu-high-ds-v1-s4-327", previousAnswer: "26", answer: "(7,-6)", removedBinding: "b" },
    { id: "bnu-high-ds-v1-s4-398", previousAnswer: "12/13", answer: "(1-cos2x)/2", removedBinding: null }
  ] as const;
  const bnuHighFamilyCoverageBatch3ARetainedBindingRetirements = [
    { id: "bnu-high-ds-v1-s4-329", previousAnswer: "-4", answer: "5", removedBinding: "b" }
  ] as const;
  const bnuHighFamilyCoverageBatch3BDepartures = [
    {
      id: "bnu-high-ds-v1-s5-149",
      previousAnswer: "4",
      answer: "线性相关；c=a+b",
      removedBinding: "b"
    }
  ] as const;

  assert.equal(7_017 - previousStageDepartures.length + previousStageEntrants.length, 7_004);
  assert.equal(7_004 - currentStageDepartures.length + currentStageArrivals.length, 6_960);
  assert.equal(6_960 - lineCircleCoverageDepartures.length, 6_958);
  assert.equal(6_958 - bnuHighFamilyCoverageBatch1Departures.length, 6_953);
  assert.equal(6_953 - bnuHighFamilyCoverageBatch2ADepartures.length, 6_947);
  assert.equal(6_947 - bnuHighFamilyCoverageBatch2BDepartures.length, 6_940);
  assert.equal(6_940 - bnuHighFamilyCoverageBatch3ADepartures.length, 6_936);
  assert.equal(6_936 - bnuHighFamilyCoverageBatch3BDepartures.length, 6_935);
  assert.deepEqual(
    {
      circledStructural: currentStageDepartureGroups.circledStructural.length,
      compoundFullResponse: currentStageDepartureGroups.compoundFullResponse.length,
      explicitUnit: currentStageDepartureGroups.explicitUnit.length,
      correctedNonScalar: currentStageDepartureGroups.correctedNonScalar.length,
      labeledOrdinal: currentStageDepartureGroups.labeledOrdinal.length
    },
    { circledStructural: 20, compoundFullResponse: 21, explicitUnit: 2, correctedNonScalar: 3, labeledOrdinal: 1 }
  );
  assert.equal(currentStageDepartures.length, 47);
  assert.equal(new Set(currentStageDepartures).size, 47);
  assert.equal(currentStageArrivals.length, 3);
  assert.equal(new Set(currentStageArrivals).size, 3);
  assert.equal(lineCircleCoverageDepartures.length, 2);
  assert.equal(new Set(lineCircleCoverageDepartures.map(({ id }) => id)).size, 2);
  assert.equal(bnuHighFamilyCoverageBatch1Departures.length, 5);
  assert.equal(new Set(bnuHighFamilyCoverageBatch1Departures.map(({ id }) => id)).size, 5);
  assert.equal(bnuHighFamilyCoverageBatch2ADepartures.length, 6);
  assert.equal(new Set(bnuHighFamilyCoverageBatch2ADepartures.map(({ id }) => id)).size, 6);
  assert.equal(bnuHighFamilyCoverageBatch2BDepartures.length, 7);
  assert.equal(new Set(bnuHighFamilyCoverageBatch2BDepartures.map(({ id }) => id)).size, 7);
  assert.equal(bnuHighFamilyCoverageBatch3ADepartures.length, 4);
  assert.equal(new Set(bnuHighFamilyCoverageBatch3ADepartures.map(({ id }) => id)).size, 4);
  assert.equal(bnuHighFamilyCoverageBatch3ARetainedBindingRetirements.length, 1);
  assert.equal(bnuHighFamilyCoverageBatch3BDepartures.length, 1);

  const currentStageDepartureIds = new Set<string>(currentStageDepartures);
  assert.equal(
    currentStageDepartureIds.has("bnu-junior-ds-v1-s2-249"),
    false,
    "the transient NFKC fake entry was never a member of the frozen 7,004 scope"
  );
  previousStageEntrants.forEach((questionId) => {
    assert.equal(
      scopedIds.has(questionId),
      !currentStageDepartureIds.has(questionId),
      `${questionId} previous-stage entrant current disposition`
    );
    assert.equal(Object.prototype.hasOwnProperty.call(chinaAnswerBindingContracts, questionId), false);
  });
  previousStageDepartures.forEach((questionId) => {
    assert.equal(scopedIds.has(questionId), false, `${questionId} previous-stage departure`);
    assert.equal(Object.prototype.hasOwnProperty.call(chinaAnswerBindingContracts, questionId), false);
  });
  currentStageDepartures.forEach((questionId) => {
    assert.equal(scopedIds.has(questionId), false, `${questionId} current-stage departure`);
    assert.equal(Object.prototype.hasOwnProperty.call(chinaAnswerBindingContracts, questionId), false);
  });
  currentStageArrivals.forEach((questionId) => {
    assert.equal(scopedIds.has(questionId), true, `${questionId} current-stage arrival`);
    assert.equal(Object.prototype.hasOwnProperty.call(chinaAnswerBindingContracts, questionId), false);
  });
  lineCircleCoverageDepartures.forEach(({ id, answer }) => {
    const question = allQuestions.find((candidate) => candidate.id === id);
    assert.ok(question, `${id} line-circle coverage question`);
    assert.equal(question.answer, answer, `${id} reviewed structural canonical`);
    assert.equal(parseScalarAnswer(question.answer), null, `${id} must remain outside the bare-scalar scope`);
    assert.equal(scopedIds.has(id), false, `${id} line-circle coverage departure`);
    assert.equal(Object.prototype.hasOwnProperty.call(chinaAnswerBindingContracts, id), false);
  });
  bnuHighFamilyCoverageBatch1Departures.forEach(({ id, answer, reason, removedBinding }) => {
    const question = allQuestions.find((candidate) => candidate.id === id);
    assert.ok(question, `${id} BNU High family-coverage question`);
    assert.equal(question.answer, answer, `${id} reviewed family-coverage canonical`);
    if (reason === "explicit-unit") {
      assert.deepEqual(explicitQuantityAnswerDimensions(question.answer), ["percentage"]);
    } else {
      assert.equal(parseScalarAnswer(question.answer), null, `${id} complete response must not collapse to one scalar`);
    }
    assert.equal(scopedIds.has(id), false, `${id} BNU High family-coverage departure`);
    assert.equal(Object.prototype.hasOwnProperty.call(chinaAnswerBindingContracts, id), false);
    if (removedBinding) {
      assert.equal(removedBinding, "b", `${id} must record the exact retired binding`);
    }
  });
  bnuHighFamilyCoverageBatch2ADepartures.forEach(({ id, answer, dimensions, removedBinding }) => {
    const question = allQuestions.find((candidate) => candidate.id === id);
    assert.ok(question, `${id} BNU High Batch 2A family-coverage question`);
    assert.equal(question.answer, answer, `${id} reviewed Batch 2A canonical`);
    assert.equal(parseScalarAnswer(question.answer), null, `${id} must not collapse to one scalar`);
    assert.deepEqual(explicitQuantityAnswerDimensions(question.answer), [...dimensions]);
    assert.equal(scopedIds.has(id), false, `${id} Batch 2A departure`);
    assert.equal(Object.prototype.hasOwnProperty.call(chinaAnswerBindingContracts, id), false);
    if (removedBinding) assert.equal(removedBinding, "y", `${id} must record the exact retired binding`);
  });
  bnuHighFamilyCoverageBatch2BDepartures.forEach(({ id, answer, dimensions, removedBinding }) => {
    const question = allQuestions.find((candidate) => candidate.id === id);
    assert.ok(question, `${id} BNU High Batch 2B family-coverage question`);
    assert.equal(question.answer, answer, `${id} reviewed Batch 2B canonical`);
    assert.equal(parseScalarAnswer(question.answer), null, `${id} must not collapse to one scalar`);
    assert.deepEqual(explicitQuantityAnswerDimensions(question.answer), [...dimensions]);
    assert.equal(scopedIds.has(id), false, `${id} Batch 2B departure`);
    assert.equal(Object.prototype.hasOwnProperty.call(chinaAnswerBindingContracts, id), false);
    if (removedBinding) {
      assert.ok(["x", "k", "m"].includes(removedBinding), `${id} must record its exact retired binding`);
    }
  });
  bnuHighFamilyCoverageBatch3ADepartures.forEach(({ id, previousAnswer, answer, removedBinding }) => {
    const question = allQuestions.find((candidate) => candidate.id === id);
    assert.ok(question, `${id} BNU High Batch 3A family-coverage question`);
    assert.ok(parseScalarAnswer(previousAnswer) !== null, `${id} previous generated answer must document a scalar departure`);
    assert.equal(question.answer, answer, `${id} reviewed Batch 3A canonical`);
    assert.equal(parseScalarAnswer(question.answer), null, `${id} must preserve its reviewed structural answer`);
    assert.deepEqual(explicitQuantityAnswerDimensions(question.answer), []);
    assert.equal(scopedIds.has(id), false, `${id} Batch 3A departure`);
    assert.equal(Object.prototype.hasOwnProperty.call(chinaAnswerBindingContracts, id), false);
    if (removedBinding) assert.equal(removedBinding, "b", `${id} must record its exact retired binding`);
  });
  bnuHighFamilyCoverageBatch3ARetainedBindingRetirements.forEach(({ id, previousAnswer, answer, removedBinding }) => {
    const question = allQuestions.find((candidate) => candidate.id === id);
    assert.ok(question, `${id} BNU High Batch 3A retained-scalar question`);
    assert.ok(parseScalarAnswer(previousAnswer) !== null);
    assert.equal(question.answer, answer);
    assert.equal(parseScalarAnswer(question.answer), 5);
    assert.equal(scopedIds.has(id), true);
    assert.equal(removedBinding, "b");
    assert.equal(Object.prototype.hasOwnProperty.call(chinaAnswerBindingContracts, id), false);
    const payload = {
      id: question.id,
      answer: question.answer,
      accepted_answers: question.acceptedAnswers ?? null,
      options: question.options ?? null,
      prompt: question.prompt
    };
    assert.equal(questionAnswerMatches(payload, "5"), true);
    assert.equal(questionAnswerMatches(payload, "|a|=5"), true);
    assert.equal(questionAnswerMatches(payload, "a=5"), false);
    assert.equal(questionAnswerMatches(payload, "b=5"), false);
  });
  bnuHighFamilyCoverageBatch3BDepartures.forEach(({ id, previousAnswer, answer, removedBinding }) => {
    const question = allQuestions.find((candidate) => candidate.id === id);
    assert.ok(question, `${id} BNU High Batch 3B family-coverage question`);
    assert.ok(parseScalarAnswer(previousAnswer) !== null, `${id} previous generated answer must document a scalar departure`);
    assert.equal(question.answer, answer, `${id} reviewed Batch 3B canonical`);
    assert.equal(parseScalarAnswer(question.answer), null, `${id} complete response must not collapse to one scalar`);
    assert.deepEqual(explicitQuantityAnswerDimensions(question.answer), []);
    assert.equal(scopedIds.has(id), false, `${id} Batch 3B departure`);
    assert.equal(removedBinding, "b");
    assert.equal(Object.prototype.hasOwnProperty.call(chinaAnswerBindingContracts, id), false);
  });
  const exponentialGrowth = allQuestions.find((candidate) => candidate.id === "bnu-high-ds-v1-s4-077");
  assert.ok(exponentialGrowth, "s4-077 exponential-growth question");
  assert.deepEqual(
    Array.from(new Set(
      [exponentialGrowth.answer, ...(exponentialGrowth.acceptedAnswers ?? [])]
        .flatMap(explicitQuantityAnswerDimensions)
    )),
    ["count"],
    "the complete prose canonical stays structural while its stored answer family retains the count-unit contract"
  );
  const logarithmicEquation = allQuestions.find((candidate) => candidate.id === "bnu-high-ds-v1-s4-114");
  assert.ok(logarithmicEquation, "s4-114 logarithmic-equation question");
  assert.equal(scopedIds.has(logarithmicEquation.id), true);
  assert.deepEqual(
    (chinaAnswerBindingContracts as Record<string, readonly string[]>)[logarithmicEquation.id],
    ["x"]
  );
  const logarithmicPayload = {
    id: logarithmicEquation.id,
    answer: logarithmicEquation.answer,
    accepted_answers: logarithmicEquation.acceptedAnswers ?? null,
    options: logarithmicEquation.options ?? null,
    prompt: logarithmicEquation.prompt
  };
  assert.equal(questionAnswerMatches(logarithmicPayload, "9"), true);
  assert.equal(questionAnswerMatches(logarithmicPayload, "x=9"), true);
  assert.equal(questionAnswerMatches(logarithmicPayload, "m=9"), false);
  currentStageDepartureGroups.correctedNonScalar.forEach(({ id, removedBinding }) => {
    if (removedBinding) {
      assert.equal(
        Object.prototype.hasOwnProperty.call(chinaAnswerBindingContracts, id),
        false,
        `${id} must not retain its removed ${removedBinding} binding`
      );
    }
  });
  for (const questionId of Object.keys(chinaAnswerBindingContracts)) {
    assert.equal(scopedIds.has(questionId), true, `${questionId} must remain in the bare-scalar binding scope`);
  }

  for (const question of scopedQuestions) {
    const storedBindings = (question.acceptedAnswers ?? []).flatMap((answer) => {
      const normalized = answer.normalize("NFKC").trim().toLowerCase();
      if ((normalized.match(/=/gu)?.length ?? 0) !== 1) return [];
      const [left = ""] = normalized.split("=", 1);
      return /^[a-z][a-z0-9_]*(?:\([a-z][a-z0-9_]*\))?$/iu.test(left.trim())
        ? [left.trim()]
        : [];
    });
    const expectedBindings = new Set([
      ...(chinaAnswerBindingContracts[question.id as keyof typeof chinaAnswerBindingContracts] ?? []),
      ...storedBindings
    ]);
    const gradingQuestion = {
      id: question.id,
      answer: question.answer,
      accepted_answers: question.acceptedAnswers ?? null,
      options: question.options ?? null,
      prompt: question.prompt
    };
    const scalarValue = parseScalarAnswer(question.answer);
    assert.notEqual(scalarValue, null, `${question.id} must have a scalar value in this scope`);
    const arithmeticScalar = String(scalarValue);

    assert.equal(
      questionAnswerMatches(gradingQuestion, `wrong=${question.answer}`),
      false,
      `${question.id} must reject an arbitrary identifier binding`
    );
    assert.equal(
      questionAnswerMatches(gradingQuestion, `${arithmeticScalar}+0=${arithmeticScalar}`),
      true,
      `${question.id} must retain a verifiable arithmetic-work response`
    );
    assert.equal(
      questionAnswerMatches(gradingQuestion, `x=${question.answer}`),
      expectedBindings.has("x"),
      `${question.id} x binding contract`
    );
    assert.equal(
      questionAnswerMatches(gradingQuestion, `y=${question.answer}`),
      expectedBindings.has("y"),
      `${question.id} y binding contract`
    );
    for (const binding of expectedBindings) {
      assert.equal(
        questionAnswerMatches(gradingQuestion, `${binding}=${question.answer}`),
        true,
        `${question.id} explicit ${binding} binding contract`
      );
    }
  }
});

test("special object-property question ids fail closed without inheriting binding contracts", () => {
  for (const id of ["toString", "constructor", "__proto__"]) {
    const gradingQuestion = {
      id,
      answer: "4",
      accepted_answers: null,
      options: null
    };
    assert.doesNotThrow(() => questionAnswerMatches(gradingQuestion, "x=4"), id);
    assert.equal(questionAnswerMatches(gradingQuestion, "4"), true, `${id} canonical`);
    assert.equal(questionAnswerMatches(gradingQuestion, "x=4"), false, `${id} must not inherit an x binding`);
    assert.equal(questionAnswerMatches(gradingQuestion, "wrong=4"), false, `${id} arbitrary binding`);
  }
});

test("real prompt-collision and missing-binding regressions follow explicit question contracts", () => {
  const cases = [
    { questions: mainlandPepHighQuestions, id: "pep-high-s4-fi-005", accepted: [], rejected: ["y=3", "x=3"] },
    { questions: mainlandBnuPrimaryQuestions, id: "bnu-primary-ds-v1-p5-017", accepted: [], rejected: ["x=6", "y=6"] },
    { questions: mainlandBnuJuniorQuestions, id: "bnu-junior-ds-v1-s1-186", accepted: ["a=5"], rejected: ["x=5", "y=5"] },
    { questions: mainlandHjbJuniorQuestions, id: "hjb-junior-ds-v2-s2-086", accepted: ["x=4"], rejected: ["y=4", "wrong=4"] },
    { questions: mainlandHjbHighQuestions, id: "hjb-high-ds-v2-s4-134", accepted: ["x=64"], rejected: ["y=64", "wrong=64"] }
  ] as const;

  for (const { questions, id, accepted, rejected } of cases) {
    const question = questions.find((candidate) => candidate.id === id);
    assert.ok(question, `Missing real binding regression question ${id}`);
    const gradingQuestion = {
      id: question.id,
      answer: question.answer,
      accepted_answers: question.acceptedAnswers ?? null,
      options: question.options ?? null,
      prompt: question.prompt
    };
    for (const selectedAnswer of accepted) {
      assert.equal(questionAnswerMatches(gradingQuestion, selectedAnswer), true, `${id}: ${selectedAnswer}`);
    }
    for (const selectedAnswer of rejected) {
      assert.equal(questionAnswerMatches(gradingQuestion, selectedAnswer), false, `${id}: ${selectedAnswer}`);
    }
  }
});

test("temperature, currency, and count units require the same semantic unit", () => {
  assert.equal(questionAnswerMatches(shortAnswerQuestion("20 ℃"), "20 °C"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("HK$5"), "5港元"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("￥5"), "5元"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("5 cards"), "5 card"), true);

  assert.equal(questionAnswerMatches(shortAnswerQuestion("20 ℃"), "20 °F"), false);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("HK$5"), "$5"), false);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("￥5"), "HK$5"), false);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("5 cards"), "5本"), false);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("20张"), "20 cards"), false);
});

test("the canonical quantity dimension overrides an incompatible accepted alias", () => {
  const temperatureQuestion = {
    answer: "6 °C",
    accepted_answers: ["6℃", "6度", "6"],
    options: null
  };

  assert.equal(questionAnswerMatches(temperatureQuestion, "6 °C"), true);
  assert.equal(questionAnswerMatches(temperatureQuestion, "6度"), true);
  assert.equal(questionAnswerMatches(temperatureQuestion, "6"), true);
  assert.equal(questionAnswerMatches(temperatureQuestion, "6°"), false);
});

test("accepted quantities in the canonical dimension retain their own converted values", () => {
  const rangeQuestion = {
    answer: "6 cm",
    accepted_answers: ["7 cm", "8 cm", "9 cm", "10 cm", "11 cm", "12 cm"],
    options: null
  };

  assert.equal(questionAnswerMatches(rangeQuestion, "0.07 m"), true);
  assert.equal(questionAnswerMatches(rangeQuestion, "0.12 m"), true);
  assert.equal(questionAnswerMatches(rangeQuestion, "0.13 m"), false);
});

test("multiple-choice option resolution cannot reintroduce a bare-alias unit bypass", () => {
  const question = {
    answer: "39 cm",
    accepted_answers: ["39"],
    options: [
      { en: "39 km", zh: "39千米", zhHans: "39千米" },
      { en: "39 cm", zh: "39厘米", zhHans: "39厘米" }
    ]
  };

  assert.equal(questionAnswerMatches(question, "39 km"), false);
  assert.equal(questionAnswerMatches(question, "39 cm"), true);
});

test("compound and ordinal day answers block explicit non-time units while preserving bare aliases", () => {
  const threeDayQuestion = {
    answer: "3天",
    accepted_answers: ["3", "提前3天"],
    options: null
  };
  const sixthDayQuestion = {
    answer: "第6天",
    accepted_answers: ["6", "第六天"],
    options: null
  };

  assert.equal(questionAnswerMatches(threeDayQuestion, "3 cm"), false);
  assert.equal(questionAnswerMatches(threeDayQuestion, "3"), true);
  assert.equal(questionAnswerMatches(sixthDayQuestion, "6 cm"), false);
  assert.equal(questionAnswerMatches(sixthDayQuestion, "6"), true);
});

test("real HJB day-answer contracts reject unrelated explicit units without losing bare compatibility", () => {
  const cases = [
    { id: "hjb-primary-ds-v1-p4-072", bare: "3", wrong: "3 cm" },
    { id: "hjb-primary-ds-v1-p5-236", bare: "6", wrong: "6 cm" }
  ];

  for (const { id, bare, wrong } of cases) {
    const question = mainlandHjbPrimaryQuestions.find((candidate) => candidate.id === id);
    assert.ok(question, `Missing real HJB day regression question ${id}`);
    const gradingQuestion = {
      answer: question.answer,
      accepted_answers: question.acceptedAnswers ?? null,
      options: question.options ?? null
    };
    assert.equal(questionAnswerMatches(gradingQuestion, question.answer), true, `${id} canonical`);
    assert.equal(questionAnswerMatches(gradingQuestion, bare), true, `${id} bare alias`);
    assert.equal(questionAnswerMatches(gradingQuestion, wrong), false, `${id} incompatible explicit unit`);
  }
});

test("prompt-specified PEP primary units are represented in stored grading contracts", () => {
  const cases = [
    { id: "pep-primary-p1-l-sa-200", bare: "6", correctUnit: "6人", wrongUnit: "6 cm" },
    { id: "pep-primary-p4-l-fi-117", bare: "3.2", correctUnit: "3.2升", wrongUnit: "3.2 cm" },
    { id: "pep-primary-p5-l-sa-131", bare: "5/8", correctUnit: "5/8页", wrongUnit: "5/8 cm" }
  ];

  for (const { id, bare, correctUnit, wrongUnit } of cases) {
    const question = mainlandPepPrimaryRagV1Questions.find((candidate) => candidate.id === id);
    assert.ok(question, `Missing real PEP primary prompt-unit regression question ${id}`);
    const gradingQuestion = {
      answer: question.answer,
      accepted_answers: question.acceptedAnswers ?? null,
      options: question.options ?? null
    };
    assert.equal(questionAnswerMatches(gradingQuestion, bare), true, `${id} bare answer`);
    assert.equal(questionAnswerMatches(gradingQuestion, correctUnit), true, `${id} explicit prompt unit`);
    assert.equal(questionAnswerMatches(gradingQuestion, wrongUnit), false, `${id} incompatible explicit unit`);
  }

  const remainder = mainlandPepPrimaryRagV1Questions.find((question) => question.id === "pep-primary-p2-l-fi-103");
  assert.ok(remainder);
  const remainderQuestion = {
    answer: remainder.answer,
    accepted_answers: remainder.acceptedAnswers ?? null,
    options: remainder.options ?? null
  };
  assert.equal(questionAnswerMatches(remainderQuestion, "商6余5"), true);
  assert.equal(questionAnswerMatches(remainderQuestion, "商是6，余数是5"), true);
  assert.equal(questionAnswerMatches(remainderQuestion, "quotient 6, remainder 5"), true);
  assert.equal(questionAnswerMatches(remainderQuestion, "quotient 6, remainder 4"), false);

  const pairedBalls = mainlandPepPrimaryRagV1Questions.find((question) => question.id === "pep-primary-p2-l-fi-105");
  assert.ok(pairedBalls);
  const pairedBallsQuestion = {
    answer: pairedBalls.answer,
    accepted_answers: pairedBalls.acceptedAnswers ?? null,
    options: pairedBalls.options ?? null
  };
  assert.equal(questionAnswerMatches(pairedBallsQuestion, "3 pairs, 1 ball remaining"), true);
  assert.equal(questionAnswerMatches(pairedBallsQuestion, "3 pairs, 2 balls remaining"), false);
});

test("zero-remainder PEP primary prompts require both requested outputs", () => {
  const cases = [
    {
      id: "pep-primary-p2-l-fi-128",
      complete: ["6 R 0", "6余0", "6袋，还剩0个"],
      partial: "6",
      wrongRemainder: "6余1"
    },
    {
      id: "pep-primary-p2-l-fi-144",
      complete: ["4 R 0", "4余0", "商是4，余数是0"],
      partial: "4",
      wrongRemainder: "4余1"
    },
    {
      id: "pep-primary-p2-l-fi-150",
      complete: ["9 R 0", "9余0", "商是9，余数是0"],
      partial: "9",
      wrongRemainder: "9余1"
    }
  ];

  for (const { id, complete, partial, wrongRemainder } of cases) {
    const question = mainlandPepPrimaryRagV1Questions.find((candidate) => candidate.id === id);
    assert.ok(question, `Missing real PEP primary zero-remainder regression question ${id}`);
    const gradingQuestion = {
      answer: question.answer,
      accepted_answers: question.acceptedAnswers ?? null,
      options: question.options ?? null
    };
    for (const answer of complete) {
      assert.equal(questionAnswerMatches(gradingQuestion, answer), true, `${id} complete answer ${answer}`);
    }
    assert.equal(questionAnswerMatches(gradingQuestion, partial), false, `${id} quotient-only partial answer`);
    assert.equal(questionAnswerMatches(gradingQuestion, wrongRemainder), false, `${id} wrong remainder`);
  }
});

test("ordinary large integers use absolute equality rather than scale-relative tolerance", () => {
  assert.equal(answerMatches("1049999999", "1050000000"), false);

  const toGradingQuestion = (id: string) => {
    const question = mainlandBnuPrimaryQuestions.find((candidate) => candidate.id === id);
    assert.ok(question, `Missing real BNU primary regression question ${id}`);
    return {
      answer: question.answer,
      accepted_answers: question.acceptedAnswers ?? null,
      options: question.options ?? null
    };
  };

  const billionQuestion = toGradingQuestion("bnu-primary-ds-v2-p4-007");
  assert.equal(questionAnswerMatches(billionQuestion, "1049999999"), true);
  assert.equal(questionAnswerMatches(billionQuestion, "1050000000"), false);

  const closestQuestion = toGradingQuestion("bnu-primary-ds-v1-p4-016");
  const displayedOptions = closestQuestion.options ?? [];
  const acceptedIndexes = displayedOptions.flatMap((option, index) => {
    const value = option.zhHans ?? option.zh ?? option.en;
    return questionAnswerMatches(closestQuestion, value) ? [index] : [];
  });
  assert.deepEqual(acceptedIndexes, [1]);
  assert.equal(questionAnswerMatches(closestQuestion, "999999999"), false);
  assert.equal(questionAnswerMatches(closestQuestion, "1000000001"), true);
  assert.equal(questionAnswerMatches(closestQuestion, "1000000010"), false);
  assert.equal(questionAnswerMatches(closestQuestion, "999999990"), false);
});
