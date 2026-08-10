import assert from "node:assert/strict";
import test from "node:test";
import { parseScalarAnswer, questionAnswerMatches } from "./answerMatching";

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

test("strict unit grading accepts bare or compatible units and rejects the same number in a different unit", () => {
  const strictQuestion = (answer: string, acceptedAnswers: string[]) => ({
    id: "ccss-textbook-practice-v1-unit-contract-test",
    answer,
    accepted_answers: acceptedAnswers,
    options: null,
    strict_answer_units: true
  });

  const area = strictQuestion("24", ["24 square units", "24 unit squares"]);
  assert.equal(questionAnswerMatches(area, "24"), true);
  assert.equal(questionAnswerMatches(area, "24 square units"), true);
  assert.equal(questionAnswerMatches(area, "24 unit squares"), true);
  assert.equal(questionAnswerMatches(area, "24 cm3"), false);

  const volume = strictQuestion("30", ["30 cubic units", "30 unit cubes"]);
  assert.equal(questionAnswerMatches(volume, "30"), true);
  assert.equal(questionAnswerMatches(volume, "30 cubic units"), true);
  assert.equal(questionAnswerMatches(volume, "30 cm2"), false);

  const meters = strictQuestion("3000", ["3,000 meters", "3000 m"]);
  assert.equal(questionAnswerMatches(meters, "3000"), true);
  assert.equal(questionAnswerMatches(meters, "3,000 meters"), true);
  assert.equal(questionAnswerMatches(meters, "3000 km"), false);

  const speed = strictQuestion("2", ["2 mph", "2 miles per hour"]);
  assert.equal(questionAnswerMatches(speed, "2"), true);
  assert.equal(questionAnswerMatches(speed, "2 miles per hour"), true);
  assert.equal(questionAnswerMatches(speed, "2 km/h"), false);

  const minutes = strictQuestion("120", ["120 min", "120 minutes"]);
  assert.equal(questionAnswerMatches(minutes, "120"), true);
  assert.equal(questionAnswerMatches(minutes, "120 minutes"), true);
  assert.equal(questionAnswerMatches(minutes, "120 cm"), false);

  const counters = strictQuestion("5", ["5 counters"]);
  assert.equal(questionAnswerMatches(counters, "5 counter"), true);
  assert.equal(questionAnswerMatches(counters, "5 cubes"), false);

  const vertices = strictQuestion("3", ["3 corners", "3 vertices"]);
  assert.equal(questionAnswerMatches(vertices, "3 vertex"), true);
  assert.equal(questionAnswerMatches(vertices, "3 sides"), false);

  const quarterInchIntervals = strictQuestion("4", ["4 quarter-inch intervals", "4 intervals"]);
  assert.equal(questionAnswerMatches(quarterInchIntervals, "4 quarter-inch intervals"), true);
  assert.equal(questionAnswerMatches(quarterInchIntervals, "4 inches"), false);

  const unitless = strictQuestion("6", []);
  assert.equal(questionAnswerMatches(unitless, "6"), true);
  assert.equal(questionAnswerMatches(unitless, "6 degrees"), false);
  assert.equal(questionAnswerMatches(unitless, "6 dollars"), false);
});

test("scalar parsing recognizes supported compound units without conflating their keys", () => {
  assert.equal(parseScalarAnswer("1.5 cups per hour"), 1.5);
  assert.equal(parseScalarAnswer("30 m/s"), 30);
  assert.equal(parseScalarAnswer("108 km/h"), 108);
  assert.equal(parseScalarAnswer("24 square units"), 24);
  assert.equal(parseScalarAnswer("30 cubic units"), 30);
  assert.equal(parseScalarAnswer("−$0.50"), -0.5);
  assert.equal(parseScalarAnswer("3 vertices"), 3);
  assert.equal(parseScalarAnswer("4 quarter-inch intervals"), 4);
});
