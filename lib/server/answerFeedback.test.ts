import assert from "node:assert/strict";
import test from "node:test";

import { questions } from "@/data/questions";
import { localizedCorrectAnswerForFeedback } from "@/lib/server/answerFeedback";
import { gradeSeedQuestionAttempt } from "@/lib/server/answerGrading";

const cjkPattern = /[\u3400-\u9fff]/u;

test("correct-answer feedback prefers the matching localized multiple-choice option", () => {
  const displayAnswer = localizedCorrectAnswerForFeedback({
    type: "multiple-choice",
    answer: "第四象限",
    acceptedAnswers: [],
    options: [
      { en: "Quadrant I", zh: "第一象限", zhHans: "第一象限" },
      { en: "Quadrant IV", zh: "第四象限", zhHans: "第四象限" }
    ]
  });

  assert.deepEqual(displayAnswer, {
    en: "Quadrant IV",
    zh: "第四象限",
    zhHans: "第四象限"
  });
});

test("correct-answer feedback resolves canonical A-F option keys by position", () => {
  const displayAnswer = localizedCorrectAnswerForFeedback({
    type: "multiple-choice",
    answer: "B",
    acceptedAnswers: [],
    options: [
      { en: "Rectangle", zh: "長方形", zhHans: "长方形" },
      { en: "Parallelogram", zh: "平行四邊形", zhHans: "平行四边形" },
      { en: "Triangle", zh: "三角形", zhHans: "三角形" }
    ]
  });

  assert.deepEqual(displayAnswer, {
    en: "Parallelogram",
    zh: "平行四邊形",
    zhHans: "平行四边形"
  });
});

test("correct-answer feedback treats displayed literal A-F values before positional keys", () => {
  const cases = [
    {
      id: "ccss-textbook-practice-v1-functions-intro-q02",
      expected: "B"
    },
    {
      id: "ccss-textbook-practice-v1-construct-linear-function-q01",
      expected: "b"
    }
  ];

  for (const { id, expected } of cases) {
    const question = questions.find((candidate) => candidate.id === id);
    assert.ok(question, `Missing real literal-option feedback regression ${id}`);
    const displayAnswer = localizedCorrectAnswerForFeedback({
      type: question.type,
      answer: question.answer,
      acceptedAnswers: question.acceptedAnswers ?? [],
      options: question.options ?? []
    });
    assert.equal(displayAnswer?.en, expected, `${id} should display its literal correct option`);
  }
});

test("correct-answer feedback uses the static English and Traditional answer translations", () => {
  const displayAnswer = localizedCorrectAnswerForFeedback({
    type: "fill-in",
    answer: "右边",
    acceptedAnswers: [],
    options: null
  });

  assert.deepEqual(displayAnswer, {
    en: "right",
    zh: "右邊",
    zhHans: "右边"
  });
  assert.doesNotMatch(displayAnswer?.en ?? "", cjkPattern);
});

test("correct-answer feedback omits an untranslated CJK answer instead of leaking it into English", () => {
  const displayAnswer = localizedCorrectAnswerForFeedback({
    type: "short-answer",
    answer: "未收錄的正確答案",
    acceptedAnswers: [],
    options: null
  });

  assert.equal(displayAnswer, undefined);
});

test("correct-answer feedback keeps language-neutral math answers available in every UI language", () => {
  assert.deepEqual(localizedCorrectAnswerForFeedback({
    type: "fill-in",
    answer: "x = 4",
    acceptedAnswers: [],
    options: null
  }), {
    en: "x = 4",
    zh: "x = 4"
  });
});

test("free-response feedback uses an equivalent reviewed CJK unit alias", () => {
  assert.deepEqual(localizedCorrectAnswerForFeedback({
    type: "fill-in",
    answer: "39 cm",
    acceptedAnswers: ["39厘米", "39 cm"],
    options: null
  }), {
    en: "39 cm",
    zh: "39厘米",
    zhHans: "39厘米"
  });

  assert.deepEqual(localizedCorrectAnswerForFeedback({
    type: "short-answer",
    answer: "11",
    acceptedAnswers: ["11个"],
    options: null
  }), {
    en: "11",
    zh: "11個",
    zhHans: "11个"
  });

  assert.deepEqual(localizedCorrectAnswerForFeedback({
    type: "fill-in",
    answer: "48 cm^2",
    acceptedAnswers: ["48平方厘米"],
    options: null
  }), {
    en: "48 cm^2",
    zh: "48平方厘米",
    zhHans: "48平方厘米"
  });

  assert.deepEqual(localizedCorrectAnswerForFeedback({
    type: "fill-in",
    answer: "cuboid",
    acceptedAnswers: ["长方体"],
    options: null
  }), {
    en: "cuboid",
    zh: "長方體",
    zhHans: "长方体"
  });

  assert.deepEqual(localizedCorrectAnswerForFeedback({
    type: "fill-in",
    answer: "HK$4",
    acceptedAnswers: ["港幣 4 元", "4元"],
    options: null
  }), {
    en: "HK$4",
    zh: "港幣 4 元",
    zhHans: "港币 4 元"
  });
});

test("free-response feedback rejects a stale CJK alias with different math", () => {
  assert.deepEqual(localizedCorrectAnswerForFeedback({
    type: "fill-in",
    answer: "20",
    acceptedAnswers: ["4°C"],
    options: null
  }), {
    en: "20",
    zh: "20"
  });
});

test("seed grading adapter returns the same localized answer contract", () => {
  const accepted = gradeSeedQuestionAttempt("bnu-primary-ds-v1-p1-074", "left");
  const rejected = gradeSeedQuestionAttempt("bnu-primary-ds-v1-p1-074", "right");

  assert.equal(accepted?.correct, true);
  assert.equal(rejected?.correct, false);
  assert.deepEqual(rejected?.correctAnswer, {
    en: "Left",
    zh: "左邊",
    zhHans: "左边"
  });
  assert.doesNotMatch(rejected?.correctAnswer?.en ?? "", cjkPattern);
});

test("seed grading keeps shared Chinese classifiers context-specific in English feedback", () => {
  const contracts = [
    {
      id: "hjb-primary-ds-v1-p1-156",
      english: "20 stickers",
      crossContext: "20 picture cards"
    },
    {
      id: "hjb-primary-ds-v1-p2-096",
      english: "20 picture cards",
      crossContext: "20 stickers"
    }
  ] as const;

  for (const contract of contracts) {
    for (const acceptedAnswer of ["20", "20张", "20張", contract.english]) {
      assert.equal(
        gradeSeedQuestionAttempt(contract.id, acceptedAnswer)?.correct,
        true,
        `${contract.id} accepts ${acceptedAnswer}`
      );
    }
    for (const rejectedAnswer of ["20 items", contract.crossContext]) {
      assert.equal(
        gradeSeedQuestionAttempt(contract.id, rejectedAnswer)?.correct,
        false,
        `${contract.id} rejects ${rejectedAnswer}`
      );
    }
    assert.deepEqual(gradeSeedQuestionAttempt(contract.id, "wrong")?.correctAnswer, {
      en: contract.english,
      zh: "20張",
      zhHans: "20张"
    });
  }
});
