import assert from "node:assert/strict";
import test from "node:test";
import {
  acceptedRuntimeOptionIndexes,
  auditChinaLessonContent,
  hasAmbiguousMultiplicationX,
  hasInvalidChinaLessonPlaceholder,
  hasMalformedChinaLessonPunctuation,
  hasMathTranslationParityDifference,
  hasNumericTranslationParityDifference,
  learnerVisibleEnglishIssueCodes
} from "./audit-china-lesson-content";

test("multiplication-notation audit distinguishes a Latin x from the algebraic variable x", () => {
  [
    "16 x 32",
    "2.4x3=7.2",
    "120X80%=96",
    "1/2x3=3/2",
    "Area = base x height.",
    "面积=底x高。",
    "Use l x w.",
    "Compute 2 x n."
  ].forEach((value) => {
    assert.equal(hasAmbiguousMultiplicationX(value), true, value);
  });
  [
    "16 × 32",
    "2x + 3 = 7",
    "x = 4",
    "x-coordinate",
    "x1x2 = 6",
    "f(x) = log_a x (a > 0)",
    "Point X is at (2, 3)"
  ].forEach((value) => {
    assert.equal(hasAmbiguousMultiplicationX(value), false, value);
  });
});

test("multiple-choice audit executes the production grader on the submitted option values", () => {
  const prefixedValueKey = {
    id: "audit-fixture-prefixed-value-key",
    answer: "110°",
    acceptedAnswers: [],
    options: [
      { en: "A. 70°", zh: "A. 70°", zhHans: "A. 70°" },
      { en: "B. 110°", zh: "B. 110°", zhHans: "B. 110°" },
      { en: "C. 140°", zh: "C. 140°", zhHans: "C. 140°" }
    ]
  };
  assert.deepEqual(acceptedRuntimeOptionIndexes(prefixedValueKey, "en"), [1]);
  assert.deepEqual(acceptedRuntimeOptionIndexes(prefixedValueKey, "zh"), [1]);
  assert.deepEqual(acceptedRuntimeOptionIndexes(prefixedValueKey, "zhHans"), [1]);

  const localizedSentenceKey = {
    id: "audit-fixture-localized-sentence-key",
    answer: "小刚跳得最快，他跳了135下",
    acceptedAnswers: [],
    options: [
      {
        en: "A. Xiaogang jumped the fastest; he jumped 135 times.",
        zh: "A. 小剛跳得最快，他跳了135下",
        zhHans: "A. 小刚跳得最快，他跳了135下"
      },
      { en: "B. Xiaoli jumped 120 times.", zh: "B. 小麗跳了120下", zhHans: "B. 小丽跳了120下" },
      { en: "C. Xiaojun jumped 98 times.", zh: "C. 小軍跳了98下", zhHans: "C. 小军跳了98下" }
    ]
  };
  assert.deepEqual(acceptedRuntimeOptionIndexes(localizedSentenceKey, "en"), [0]);
  assert.deepEqual(acceptedRuntimeOptionIndexes(localizedSentenceKey, "zh"), [0]);
  assert.deepEqual(acceptedRuntimeOptionIndexes(localizedSentenceKey, "zhHans"), [0]);
});

test("placeholder detection preserves valid undefined prose but rejects authoring tokens", () => {
  assert.equal(hasInvalidChinaLessonPlaceholder("The slope of a vertical line is undefined."), false);
  assert.equal(hasInvalidChinaLessonPlaceholder("undefined"), true);
  assert.equal(hasInvalidChinaLessonPlaceholder("Use term-6700-term-5c0f here."), true);
  assert.equal(hasInvalidChinaLessonPlaceholder("TODO: replace this example"), true);
});

test("translation parity compares semantic sets, not prose order or repetition", () => {
  assert.equal(
    hasNumericTranslationParityDifference(
      "At x = 2 the graph rises before x = 2 and falls after x = 2.",
      "图像在 x = 2 前上升、之后下降。"
    ),
    false
  );
  assert.equal(hasNumericTranslationParityDifference("The area is 20 cm^2.", "面积是20平方厘米。"), false);
  assert.equal(hasNumericTranslationParityDifference("Seven balloons burst: 58-7=51.", "破了7个气球：58-7=51。"), false);
  assert.equal(hasNumericTranslationParityDifference("The remainder in 17 / 5 cannot be 7.", "17 ÷ 5 的余数不能是 7。"), false);
  assert.equal(hasNumericTranslationParityDifference("Calculate 16 x 32.", "计算16x32。"), false);
  assert.equal(hasNumericTranslationParityDifference("Put 7 balls into pairs.", "把7个球每2个分成一组。"), false);
  assert.equal(hasNumericTranslationParityDifference("February has 29 days in a leap year.", "闰年的2月有29天。"), false);
  assert.equal(hasNumericTranslationParityDifference("Grade 1 spends 2 minutes.", "一年级用2分钟。"), false);
  assert.equal(hasNumericTranslationParityDifference("Compare a 20% discount with HK$30.", "比较八折和减30元。"), false);
  assert.equal(hasNumericTranslationParityDifference("The value is -2.", "这个值是2。"), true);
  assert.equal(hasNumericTranslationParityDifference("The answer is 21.", "答案是20。"), true);

  assert.equal(
    hasMathTranslationParityDifference(
      "For \\(x \\ne 0\\), \\(x^3/x=x^2\\).",
      "\\(x^3/x=x^2\\)，其中 \\(x \\ne 0\\)。"
    ),
    false
  );
  assert.equal(
    hasMathTranslationParityDifference(
      "Find \\(P(\\text{red})=2/5\\).",
      "求 \\(P(\\text{摸到红球})=2/5\\)。"
    ),
    false
  );
  assert.equal(
    hasMathTranslationParityDifference("Area is 20 cm\\(^2\\).", "面积是20平方厘米。"),
    false
  );
  assert.equal(
    hasMathTranslationParityDifference("\\(3\\cdot2=6\\)", "\\(3\\times2=6\\)"),
    false
  );
  assert.equal(
    hasMathTranslationParityDifference("There are \\(2\\) outcomes.", "有两个结果。"),
    false
  );
  assert.equal(
    hasMathTranslationParityDifference("The answer is 107 degrees.", "答案是 \\(107^\\circ\\)。"),
    false
  );
  assert.equal(
    hasMathTranslationParityDifference("The answer is 5sqrt2.", "答案是 \\(5\\sqrt2\\)。"),
    false
  );
  assert.equal(
    hasMathTranslationParityDifference("The y-coordinate changes.", "\\(y\\) 坐标变化。"),
    false
  );
  assert.equal(
    hasMathTranslationParityDifference(
      "The dimensions are \\(4\\), \\(3\\), and \\(5\\).",
      "长、宽、高为 \\(4,3,5\\)。"
    ),
    false
  );
  assert.equal(
    hasMathTranslationParityDifference("Point \\(A(4,3,5)\\).", "点 \\(A(4,5,3)\\)。"),
    true
  );
  assert.equal(hasMathTranslationParityDifference("\\(x=2\\)", "\\(x=3\\)"), true);
  assert.equal(hasMathTranslationParityDifference("\\(x=2\\)", "x=20"), true);
});

test("punctuation audit permits mathematical ellipses but catches duplicated sentence marks", () => {
  assert.equal(hasMalformedChinaLessonPunctuation("0.333...。它等于三分之一。"), false);
  assert.equal(hasMalformedChinaLessonPunctuation("集合为 {1,2,3,...,100}。"), false);
  assert.equal(hasMalformedChinaLessonPunctuation("答案是 4。。。"), true);
  assert.equal(hasMalformedChinaLessonPunctuation("说明：：先计算。"), true);
});

test("learner-visible English audit rejects known grammar and notation regressions", () => {
  const defects = [
    ["The probability is =3/8.", "learner-visible-english-malformed-equality"],
    ["From 10:35 to 11:00 is 25 minutes.", "learner-visible-english-elapsed-grammar"],
    ["The answer is 108x¹²^5.", "learner-visible-english-mixed-exponent"],
    ["Xiaoyu jumped 8 more jumps than Xiaoqi.", "learner-visible-english-more-jumps"],
    ["5.3 is 530 of 0.01.", "learner-visible-english-decimal-digit-wording"],
    ["Draw OC⊥AB perpendicular to C.", "learner-visible-english-redundant-geometry"],
    ["If the monomial 2x^2 and 3x^2 are like terms.", "learner-visible-english-singular-monomial"],
    ["Count 130135128132130133128.", "learner-visible-english-joined-numeric-sequence"],
    ["The blocks in the 2 and 3 columns align.", "learner-visible-english-ambiguous-column-reference"],
    ["6020450 = 6,020,450; round to one decimal place.", "learner-visible-english-decimal-unit-contract"],
    ["Round to the nearest ten thousand, the approximate number is 385 ten thousand.", "learner-visible-english-unit-prompt-grammar"]
  ] as const;

  defects.forEach(([value, code]) => {
    assert.equal(learnerVisibleEnglishIssueCodes(value).includes(code), true, `${code}: ${value}`);
  });

  [
    "The probability is 3/8.",
    "Twenty-five minutes elapse from 10:35 to 11:00.",
    "The answer is 108x^12y^5.",
    "Xiaoyu made 8 more jumps than Xiaoqi.",
    "5.3 is 530 units of 0.01.",
    "Draw OC perpendicular to AB at C.",
    "If the monomials 2x^2 and 3x^2 are like terms.",
    "The values are 130, 135, 128, 132, 130, 133, and 128."
  ].forEach((value) => assert.deepEqual(learnerVisibleEnglishIssueCodes(value), [], value));
});

test("live audit has no option-key false positives and honors validated no-op Traditional translations", () => {
  const result = auditChinaLessonContent();
  assert.equal(result.scope.lessonCount, 384);
  assert.deepEqual(
    result.issues.filter((issue) => issue.code.startsWith("learner-visible-english-")),
    []
  );
  assert.deepEqual(
    result.issues.filter((issue) => issue.code === "answer-not-in-options"),
    []
  );
  assert.deepEqual(
    result.issues.filter((issue) =>
      issue.code === "malformed-punctuation" &&
      issue.topicId === "hjb-junior-s2-upper-real-numbers"
    ),
    []
  );
  assert.deepEqual(
    result.issues.filter((issue) =>
      issue.code === "zh-variant-parity" &&
      issue.topicId === "bnu-primary-p1-lower-math-play-review" &&
      issue.location === "practice[3](bnu-primary-ds-v2-p1-237).options[3].zh"
    ),
    []
  );
});
