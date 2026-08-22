import assert from "node:assert/strict";
import test from "node:test";
import { MAX_ANSWER_LENGTH, MAX_CURATED_ANSWER_LENGTH } from "@/lib/answerLimits";
import { questionAnswerMatches } from "./answerMatching";

const shortAnswerQuestion = (answer: string) => ({
  answer,
  accepted_answers: null,
  options: null
});

test("short-answer grading accepts English number words for numeric answers", () => {
  assert.equal(questionAnswerMatches(shortAnswerQuestion("6"), "Six"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("6 buttons"), "sIx"), true);
});

test("short-answer grading preserves legacy hyphen and underscore word-token separators", () => {
  assert.equal(questionAnswerMatches(shortAnswerQuestion("21"), "twenty_one"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("4"), "four_sides"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("4"), "four-sides"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("2/9"), "2/9=2_cards out of 9"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("2/9"), "2/9=two_cards out of nine"), true);
});

test("phrase fractions normalize word and numeric separators without erasing arithmetic signs", () => {
  for (const selected of [
    "two_out_of_nine",
    "two-out-of-nine",
    "2_out_of_9",
    "2-out-of-9",
    "2/9=two_out_of_nine",
    "2/9=two-out-of-nine"
  ]) {
    assert.equal(questionAnswerMatches(shortAnswerQuestion("2/9"), selected), true, selected);
  }

  assert.equal(questionAnswerMatches(shortAnswerQuestion("-3/5"), "-3-out-of-5"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("-3"), "2-5=-3"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("-3"), "2-5"), false);
});

test("English number words follow units tens hundreds and and grammar", () => {
  for (const [answer, selected] of [
    ["3", "one two"],
    ["20", "ten ten"],
    ["10000", "one hundred hundred"],
    ["10100", "one hundred one hundred"],
    ["5", "and five"],
    ["5", "five and"],
    ["100", "one hundred zero"],
    ["100", "one hundred and zero"],
    ["3", "one and and two"],
    ["3", "1+2=one two"]
  ] as const) {
    assert.equal(questionAnswerMatches(shortAnswerQuestion(answer), selected), false, selected);
  }

  for (const [answer, selected] of [
    ["21", "twenty-one"],
    ["21", "twenty_one"],
    ["105", "one hundred and five"],
    ["105", "one hundred five"],
    ["105", "100+5=one hundred and five"]
  ] as const) {
    assert.equal(questionAnswerMatches(shortAnswerQuestion(answer), selected), true, selected);
  }
});

test("word-token compatibility does not erase negative numeric signs", () => {
  assert.equal(questionAnswerMatches(shortAnswerQuestion("-7"), "-7 cards"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("-3.5"), "-3 1/2 cm"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("-3"), "2-5=-3"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("7"), "-7 cards"), false);
});

test("short-answer grading accepts phrase fractions for fraction answers", () => {
  assert.equal(questionAnswerMatches(shortAnswerQuestion("2/9"), "2 out of 9"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("2/9"), "two out of nine"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("2/9"), "2/9=2 cards out of 9"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("3/5"), "3/5=3 cm out of 5"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("2/9"), "2/9=two cards out of nine"), true);
});

test("short-answer grading enforces the shared 500-character ingestion boundary", () => {
  const longestSafe = "a".repeat(500);
  const firstRejected = "a".repeat(501);

  assert.equal(questionAnswerMatches(shortAnswerQuestion(longestSafe), longestSafe), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion(firstRejected), firstRejected), false);
});

test("curated metadata has a separate bounded trust contract", () => {
  const reviewOnlyAlias = `42${" ".repeat(MAX_ANSWER_LENGTH - 1)}`;
  const longestCuratedAlias = `42${" ".repeat(MAX_CURATED_ANSWER_LENGTH - 2)}`;
  const firstInvalidAlias = `43${" ".repeat(MAX_CURATED_ANSWER_LENGTH - 1)}`;
  assert.equal(reviewOnlyAlias.length, MAX_ANSWER_LENGTH + 1);
  assert.equal(longestCuratedAlias.length, MAX_CURATED_ANSWER_LENGTH);
  assert.equal(firstInvalidAlias.length, MAX_CURATED_ANSWER_LENGTH + 1);

  assert.equal(
    questionAnswerMatches(
      { answer: "not-42", accepted_answers: [reviewOnlyAlias], options: null },
      "42"
    ),
    true
  );
  assert.equal(
    questionAnswerMatches(
      { answer: "not-42", accepted_answers: [longestCuratedAlias], options: null },
      "42"
    ),
    true
  );
  assert.equal(
    questionAnswerMatches(
      { answer: "not-43", accepted_answers: [firstInvalidAlias], options: null },
      "43"
    ),
    false
  );
  assert.equal(
    questionAnswerMatches(
      { answer: "42", accepted_answers: [firstInvalidAlias], options: null },
      "42"
    ),
    true
  );
  assert.equal(
    questionAnswerMatches(
      { answer: "not-42", accepted_answers: [reviewOnlyAlias], options: null },
      reviewOnlyAlias
    ),
    false
  );

  const reviewOnlyMixedAlias = `3 1/2 cm${" ".repeat(MAX_ANSWER_LENGTH - 7)}`;
  assert.equal(reviewOnlyMixedAlias.length, MAX_ANSWER_LENGTH + 1);
  assert.equal(
    questionAnswerMatches(
      { answer: "not-three-and-a-half", accepted_answers: [reviewOnlyMixedAlias], options: null },
      "31/2cm"
    ),
    false
  );
});

test("review-only curated aliases never enter scalar or BigInt parsing", () => {
  const nativeBigInt = globalThis.BigInt;
  const reviewOnlyAlias = `${"work ".repeat(101)}=0 1/2`;
  let bigintConstructionCount = 0;
  assert.ok(reviewOnlyAlias.length > MAX_ANSWER_LENGTH);
  assert.ok(reviewOnlyAlias.length <= MAX_CURATED_ANSWER_LENGTH);

  globalThis.BigInt = ((value: string | number | bigint | boolean) => {
    bigintConstructionCount += 1;
    return nativeBigInt(value);
  }) as BigIntConstructor;

  try {
    assert.equal(
      questionAnswerMatches(
        { answer: "not-one-half", accepted_answers: [reviewOnlyAlias], options: null },
        "0.5"
      ),
      false
    );
    assert.equal(bigintConstructionCount, 0);
  } finally {
    globalThis.BigInt = nativeBigInt;
  }
});

test("over-bound mixed numbers fail before constructing an oversized BigInt", () => {
  const nativeBigInt = globalThis.BigInt;
  const oversizedDigits = "9".repeat(501);
  let oversizedConstructionCount = 0;

  globalThis.BigInt = ((value: string | number | bigint | boolean) => {
    if (typeof value === "string" && value.length > 500) {
      oversizedConstructionCount += 1;
      throw new Error("oversized BigInt construction");
    }
    return nativeBigInt(value);
  }) as BigIntConstructor;

  try {
    assert.doesNotThrow(() => {
      assert.equal(
        questionAnswerMatches(shortAnswerQuestion("1"), `1=0 ${oversizedDigits}/2 cm`),
        false
      );
    });
    assert.equal(oversizedConstructionCount, 0);
  } finally {
    globalThis.BigInt = nativeBigInt;
  }
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
  assert.equal(questionAnswerMatches(shortAnswerQuestion("10 cards"), "15-5=10 cards"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("10 cards"), "15-5=ten cards"), true);
});

test("short-answer grading preserves mixed-number whitespace before compact unit suffixes", () => {
  assert.equal(questionAnswerMatches(shortAnswerQuestion("3.5"), "3+1/2=3 1/2 cm^2"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("3.5"), "3+1/2=3 1/2cm"), true);

  for (const suffix of ["cm", "cm2", "cm^2", "cm3", "cm^3", "ml", "l", "km", "km/h", "kmh", "°", "%"]) {
    for (const separator of ["", " "]) {
      const selected = `3+1/2=3 1/2${separator}${suffix}`;
      assert.equal(questionAnswerMatches(shortAnswerQuestion("3.5"), selected), true, selected);
    }
  }
});

test("short-answer grading preserves mixed-number whitespace before spaced known unit words", () => {
  for (const unit of [
    "blocks",
    "buttons",
    "cards",
    "cm",
    "counters",
    "cubes",
    "degree",
    "degrees",
    "dollars",
    "items",
    "minutes",
    "pencils",
    "shells",
    "side",
    "sides",
    "stickers",
    "tiles",
    "units"
  ]) {
    const selected = `3+1/2=3 1/2 ${unit}`;
    assert.equal(questionAnswerMatches(shortAnswerQuestion("3.5"), selected), true, selected);
  }
});

test("short-answer grading preserves negative mixed numbers before a suffix", () => {
  assert.equal(questionAnswerMatches(shortAnswerQuestion("-3.5"), "-3-1/2=-3 1/2 cm^2"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("-3.5"), "-3-1/2=-3 1/2km/h"), true);
});

test("short-answer grading validates exact scalar equations without Number cancellation drift", () => {
  for (const [answer, selected] of [
    ["0.1", "99999999999.1-99999999999=0.1"],
    ["0.1", "1000000000000.1-1000000000000=0.1"],
    ["999999999999", "999999999999/23*23=999999999999"]
  ] as const) {
    assert.equal(questionAnswerMatches(shortAnswerQuestion(answer), selected), true, selected);
  }
});

test("short-answer grading fails closed for inexact or unsafe scalar equations", () => {
  assert.equal(
    questionAnswerMatches(shortAnswerQuestion("0.1000001"), "1000000000000.1-1000000000000=0.1000001"),
    false
  );
  assert.equal(
    questionAnswerMatches(shortAnswerQuestion("0.3333333333333333"), "1/3=0.3333333333333333"),
    false
  );
  assert.equal(
    questionAnswerMatches(shortAnswerQuestion("9007199254740992"), "9007199254740992+1=9007199254740992"),
    false
  );
  assert.equal(
    questionAnswerMatches(
      shortAnswerQuestion("9007199254740992"),
      "9007199254740992+1=9007199254740992 cards"
    ),
    false
  );
  assert.equal(
    questionAnswerMatches(
      shortAnswerQuestion("0.100006"),
      "99999999999.1-99999999999=0.100006 cards"
    ),
    false
  );
  assert.equal(
    questionAnswerMatches(
      shortAnswerQuestion("zero cards"),
      "9007199254740992+1-9007199254740992=zero cards"
    ),
    false
  );
});

test("short-answer grading extracts circled or boxed OCR final answers", () => {
  assert.equal(questionAnswerMatches(shortAnswerQuestion("13"), "17-4=\\textcircled{13}"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("13 counters"), "17-4=\\boxed{13}"), true);
});

test("short-answer grading unwraps only whole-value brackets", () => {
  assert.equal(questionAnswerMatches(shortAnswerQuestion("42"), "(42)"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("(3, 4)"), "3, 4"), true);
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
  assert.equal(questionAnswerMatches(shortAnswerQuestion("3 1/2 cm"), "7/2 cm"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("3 1/2 cm"), "35.5"), false);

  for (const [answer, selected] of [
    ["3 1/2 cm", "31/2cm"],
    ["3 1/2 cm", "31/2 cm"],
    ["1 3/7 cards", "13/7cards"],
    ["-3 1/2 km/h", "-31/2km/h"]
  ] as const) {
    assert.equal(questionAnswerMatches(shortAnswerQuestion(answer), selected), false, `${answer} != ${selected}`);
  }

  assert.equal(questionAnswerMatches(shortAnswerQuestion("17 cm"), "3 4/2 cm"), false);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("16 cm"), "3 2/2 cm"), false);
  assert.equal(
    questionAnswerMatches(shortAnswerQuestion("3+1/2=31/2 cm"), "3+1/2=3 1/2 cm"),
    false
  );
});

test("direct scalar grading fails closed for unsafe overflow and underflow collisions", () => {
  for (const [answer, selected] of [
    ["9007199254740992", "9007199254740993"],
    ["9007199254740992/1", "9007199254740993/1"],
    ["9007199254740992 1/2", "9007199254740993 1/2"],
    ["9007199254740991", "9007199254740990.999998"]
  ] as const) {
    assert.equal(questionAnswerMatches(shortAnswerQuestion(answer), selected), false, `${answer} != ${selected}`);
  }

  const overflowA = "9".repeat(320);
  const overflowB = "8".repeat(320);
  const tinyA = `0.${"0".repeat(400)}1`;
  const tinyB = `0.${"0".repeat(400)}2`;
  const hugeDenominator = "9".repeat(320);

  assert.equal(questionAnswerMatches(shortAnswerQuestion(`${overflowA} 1/2`), `${overflowB} 1/2`), false);
  assert.equal(questionAnswerMatches(shortAnswerQuestion(`${overflowA} out of 2`), `${overflowB} out of 2`), false);
  assert.equal(questionAnswerMatches(shortAnswerQuestion(tinyA), tinyB), false);
  assert.equal(questionAnswerMatches(shortAnswerQuestion(`1/${hugeDenominator}`), `2/${hugeDenominator}`), false);
  assert.equal(questionAnswerMatches(shortAnswerQuestion(overflowA), overflowA), true);
});

test("direct scalar grading preserves exact and documented rounded-fraction compatibility", () => {
  for (const [answer, selected] of [
    ["1/3", "0.333333"],
    ["2/6", "1/3"],
    ["3 1/2", "7/2"],
    ["2/9", "two out of nine"]
  ] as const) {
    assert.equal(questionAnswerMatches(shortAnswerQuestion(answer), selected), true, `${answer} == ${selected}`);
  }

  assert.equal(questionAnswerMatches(shortAnswerQuestion("1/2"), "0.5000009"), true);
  assert.equal(questionAnswerMatches(shortAnswerQuestion("1/2"), "0.500001"), false);
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
