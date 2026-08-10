import assert from "node:assert/strict";
import test from "node:test";
import { usCaliforniaLessonSeeds } from "./usCaliforniaLessons";
import {
  usCaliforniaQuestionGenerationMetadata,
  usCaliforniaQuestions
} from "./usCaliforniaQuestions";
import { usCaliforniaTopicById } from "./usCaliforniaTopics";

const questionsById = new Map(usCaliforniaQuestions.map((question) => [question.id, question]));

function question(id: string) {
  const found = questionsById.get(id);
  assert.ok(found, `missing California checkpoint ${id}`);
  return found;
}

test("the displayed Kindergarten comparison checkpoint uses words instead of Grade 1 inequality symbols", () => {
  const comparison = question("ccss-textbook-practice-v1-compare-groups-q02");
  const displayedText = [comparison.prompt.en, ...(comparison.options ?? []).map((option) => option.en)].join(" ");

  assert.doesNotMatch(displayedText, /[<>=]/);
  assert.equal(comparison.answer, "3 is less than 8");
});

test("displayed Grade 2 array checkpoints use equal-addend equations without formal product notation", () => {
  const repeatedAddition = question("ccss-textbook-practice-v1-arrays-repeated-addition-q03");
  const rowsAndColumns = question("ccss-textbook-practice-v1-rows-and-columns-q01");
  const displayedText = [
    repeatedAddition.prompt.en,
    repeatedAddition.answer,
    repeatedAddition.explanation.en,
    ...(repeatedAddition.options ?? []).map((option) => option.en),
    rowsAndColumns.explanation.en
  ].join(" ");

  assert.doesNotMatch(displayedText, /[×*]/);
  assert.equal(repeatedAddition.answer, "12");
  assert.match(repeatedAddition.explanation.en, /4 \+ 4 \+ 4 = 12/);
  assert.match(rowsAndColumns.explanation.en, /4 \+ 4 \+ 4 = 12/);
});

test("displayed elementary geometry and fraction checkpoints state determinate mathematical relationships", () => {
  const kindergartenComposition = question("ccss-textbook-practice-v1-compose-shapes-q01");
  const grade1Composition = question("ccss-textbook-practice-v1-compose-2d-q01");
  const fractionMeaning = question("ccss-textbook-practice-v1-fractions-number-line-q01");

  assert.match(kindergartenComposition.prompt.en, /each form one half of a square.*shared slanted side/i);
  assert.equal(kindergartenComposition.answer, "square");
  assert.match(grade1Composition.prompt.en, /shares the whole top side.*centered above/i);
  assert.equal(grade1Composition.answer, "5 sides");
  assert.doesNotMatch(`${grade1Composition.prompt.en} ${grade1Composition.answer}`, /house shape/i);
  assert.match(fractionMeaning.explanation.en, /a copies of the unit fraction 1\/b/);
  assert.doesNotMatch(fractionMeaning.explanation.en, /a\/b is a copies/i);
});

test("displayed variable and population checkpoints state their model and evidence boundaries", () => {
  const pairedPatterns = question("ccss-textbook-practice-v1-two-patterns-graph-q02");
  const independentVariable = question("ccss-textbook-practice-v1-dependent-independent-q03");
  const populationComparison = question("ccss-textbook-practice-v1-compare-populations-q01");

  assert.match(pairedPatterns.prompt.en, /pattern x.*adds 1.*pattern y.*adds 2.*corresponding step/i);
  assert.match(pairedPatterns.explanation.en, /x = n.*y = 2n/i);
  assert.match(independentVariable.prompt.en, /model.*choose the input.*calculate the output/i);
  assert.match(independentVariable.explanation.en, /in this input-output model/i);
  assert.match(populationComparison.prompt.en, /sample distributions.*similar spreads/i);
  assert.match(populationComparison.explanation.en, /suggests.*relative to.*variability/i);
  assert.doesNotMatch(populationComparison.explanation.en, /=\s*real difference/i);
});

test("displayed transformation, function, inequality, and conic checkpoints include defining conditions", () => {
  const congruence = question("ccss-textbook-practice-v1-congruence-q03");
  const startingValue = question("ccss-textbook-practice-v1-compare-functions-q03");
  const inequality = question("ccss-textbook-practice-v1-graph-inequalities-q01");
  const hyperbola = question("ccss-textbook-practice-v1-conic-sections-q03");

  assert.match(congruence.prompt.en, /scale factor.*(?:≠|not equal to)\s*1/i);
  assert.equal(congruence.answer, "non-unit dilation (scaling)");
  assert.match(startingValue.prompt.en, /domain includes x = 0.*starting input is 0/i);
  assert.match(inequality.prompt.en, /linear inequality in two variables.*boundary is a line/i);
  assert.equal(hyperbola.answer, "absolute difference");
  assert.match(hyperbola.explanation.en, /absolute difference/i);
});

test("displayed dilation checkpoint limits its size-change claim to non-unit dilations", () => {
  const similarity = question("ccss-textbook-practice-v1-similarity-q01");

  assert.match(similarity.prompt.en, /non-unit dilation changes a figure's size/i);
  assert.equal(similarity.answer, "angles");
  assert.match(similarity.explanation.en, /scale factor is not equal to 1/i);
});

test("displayed margin-of-error checkpoint states the fixed-comparison conditions", () => {
  const estimatePopulation = question("ccss-textbook-practice-v1-estimate-population-q01");

  assert.match(
    estimatePopulation.prompt.en,
    /holding the confidence level and population variability fixed.*sample size increases/i
  );
  assert.equal(estimatePopulation.answer, "decreases");
  assert.match(estimatePopulation.explanation.en, /same confidence procedure and variability/i);
});

test("displayed inverse-function checkpoint names both graphs grammatically", () => {
  const inverse = question("ccss-textbook-practice-v1-inverse-functions-q02");

  assert.equal(inverse.prompt.en, "The graph of f⁻¹ is the graph of f reflected across…");
  assert.equal(inverse.answer, "y = x");
});

test("displayed high-school formulas include their indexing, nonzero, and initial-value conditions", () => {
  const geometricSeries = question("ccss-textbook-practice-v1-geometric-series-q02");
  const conditionalProbability = question("ccss-textbook-practice-v1-conditional-probability-q01");
  const recurrence = question("ccss-textbook-practice-v1-build-functions-q01");
  const periodicModel = question("ccss-textbook-practice-v1-periodic-models-q01");

  assert.match(geometricSeries.prompt.en, /a \+ ar.*arⁿ⁻¹.*n terms.*r ≠ 1/i);
  assert.match(conditionalProbability.prompt.en, /P\(B\) > 0/);
  assert.match(recurrence.answer, /a₁ = 3.*n ≥ 2/);
  assert.match(recurrence.explanation.en, /initial value.*uniquely/i);
  assert.equal(periodicModel.answer, "|A|");
  assert.match(periodicModel.explanation.en, /absolute value/i);
});

test("displayed treatment-comparison checkpoints use grammatical and design-accurate evidence language", () => {
  const significance = question("ccss-textbook-practice-v1-compare-treatments-q02");
  const control = question("ccss-textbook-practice-v1-compare-treatments-q03");

  assert.equal(significance.answer, "larger than what chance variation would usually produce");
  assert.match(significance.explanation.en, /randomization distribution/i);
  assert.match(control.explanation.en, /baseline or comparison condition.*placebo.*standard treatment.*no treatment/i);
  assert.doesNotMatch(control.explanation.en, /^control\s*=\s*no treatment\.?$/i);
});

test("prism-volume checkpoints use perpendicular height rather than an unspecified length", () => {
  const numericPrism = question("ccss-textbook-practice-v1-area-volume-surface-q01");
  const numericPrismTwo = question("ccss-textbook-practice-v1-area-volume-surface-q02");
  const generalRule = question("ccss-textbook-practice-v1-area-volume-surface-q03");
  const displayedText = [
    numericPrism.prompt.en,
    numericPrismTwo.prompt.en,
    generalRule.prompt.en,
    generalRule.answer,
    generalRule.explanation.en
  ].join(" ");

  assert.match(numericPrism.prompt.en, /perpendicular height/i);
  assert.match(numericPrismTwo.prompt.en, /perpendicular distance between.*bases/i);
  assert.equal(generalRule.answer, "base area × perpendicular height");
  assert.doesNotMatch(displayedText, /base area.*×\s*length|its length/i);
});

test("all S6 chapter 04 generated checkpoints and runtime coverage identify the F-IF functions domain", () => {
  const topicId = "us-ca-math-s6-chapter-04";
  const chapterMetadata = Object.entries(usCaliforniaQuestionGenerationMetadata)
    .filter(([questionId]) => /^us-ca-g6-g12-v2-s6-c04-q\d+$/.test(questionId))
    .map(([, metadata]) => metadata);
  const topic = usCaliforniaTopicById.get(topicId);
  const lesson = usCaliforniaLessonSeeds.find((candidate) => candidate.topicId === topicId);
  const teacherGuide = lesson?.blocks.find((block) => block.type === "teacher-guide");

  assert.equal(chapterMetadata.length, 42);
  assert.ok(chapterMetadata.every((metadata) => metadata.standardIds.join(",") === "CA.CCSS.Math.HS.F-IF"));
  assert.ok(chapterMetadata.every((metadata) => metadata.domainTags.join(",") === "functions"));
  assert.ok(chapterMetadata.every((metadata) => !metadata.conceptIds.some((concept) => /statistics/i.test(concept))));
  assert.ok(chapterMetadata.every((metadata) => metadata.evidenceCardIds.includes("us-ca-standards-s6-hs-f-if")));
  assert.ok(chapterMetadata.every((metadata) => !metadata.evidenceCardIds.some((id) => /s-md/i.test(id))));
  assert.match(topic?.description.en ?? "", /strand for Functions/);
  assert.doesNotMatch(topic?.description.en ?? "", /Statistics/);
  assert.ok(teacherGuide?.items?.some((item) => /^F-IF\./.test(item.en)));
  assert.ok(teacherGuide?.items?.every((item) => !/^S-MD\./.test(item.en)));
});
