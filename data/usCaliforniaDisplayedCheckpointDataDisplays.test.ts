import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QuestionFigure } from "@/components/practice/QuestionFigure";
import { dedupePracticeQuestions } from "@/lib/practiceQuestionDeduping";
import {
  normalizeQuestionDiagram,
  questionDiagramAltText,
  validateQuestionDiagram
} from "@/lib/questionFigure";
import type { LocalizedText, PublicQuestion, Question } from "@/types";
import { usCaliforniaLessonSeeds } from "./usCaliforniaLessons";
import { usCaliforniaQuestions } from "./usCaliforniaQuestions";

Object.assign(globalThis, { React });

const lessonPracticeQuestionLimit = 5;
const handwritingCapableTypes = new Set<PublicQuestion["type"]>(["fill-in", "short-answer", "graph"]);
const questionById = new Map(usCaliforniaQuestions.map((question) => [question.id, question]));

type CategoricalDataDisplay = {
  kind: "data-display";
  display: "picture-graph" | "bar-graph";
  title: LocalizedText;
  unit: LocalizedText;
  categories: Array<{ label: LocalizedText; value: number }>;
  scale?: number;
};

type LinePlotDataDisplay = {
  kind: "data-display";
  display: "line-plot";
  title: LocalizedText;
  unit: LocalizedText;
  values: number[];
  range: [number, number];
  tickInterval: number;
};

type DataDisplay = CategoricalDataDisplay | LinePlotDataDisplay;

const requiredDataDisplayIds = [
  "ccss-textbook-practice-v1-picture-graph-q01",
  "ccss-textbook-practice-v1-picture-graph-q02",
  "ccss-textbook-practice-v1-bar-graph-q01",
  "ccss-textbook-practice-v1-bar-graph-q02",
  "ccss-textbook-practice-v1-measure-line-plot-q01",
  "ccss-textbook-practice-v1-measure-line-plot-q02",
  "ccss-textbook-practice-v1-line-plot-operations-q01",
  "ccss-textbook-practice-v1-line-plot-operations-q02",
  "ccss-textbook-practice-v1-line-plot-operations-q03"
] as const;

const redTeamRepairIds = [
  "ccss-textbook-practice-v1-congruence-q01",
  "ccss-textbook-practice-v1-congruence-criteria-q02",
  "ccss-textbook-practice-v1-constraints-formulas-q01",
  "ccss-textbook-practice-v1-constraints-formulas-q02",
  "ccss-textbook-practice-v1-compare-populations-q03",
  "ccss-textbook-practice-v1-compare-fractions-q02",
  "ccss-textbook-practice-v1-arithmetic-patterns-q01",
  "ccss-textbook-practice-v1-decimal-operations-q01"
] as const;

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
  const handwritingQuestion = dedupedQuestions.find((question) => handwritingCapableTypes.has(question.type));

  if (selectedQuestions.some((question) => handwritingCapableTypes.has(question.type)) || !handwritingQuestion) {
    return selectedQuestions;
  }

  return [...selectedQuestions.slice(0, lessonPracticeQuestionLimit - 1), handwritingQuestion];
}

function reconstructedDisplayedQuestions() {
  assert.equal(usCaliforniaLessonSeeds.length, 76, "the California lesson surface should still contain 76 pages");
  const displayed = usCaliforniaLessonSeeds.flatMap((seed) => displayedQuestionsForTopic(seed.topicId));
  assert.equal(displayed.length, 380, "76 California pages should reconstruct exactly 380 displayed checkpoint slots");
  return displayed;
}

function requiredQuestion(id: string, displayedById: Map<string, Question>) {
  const question = displayedById.get(id);
  assert.ok(question, `${id} should remain in the reconstructed 380-slot display surface`);
  return question;
}

function dataDisplayFor(question: Question) {
  assert.ok(question.diagram, `${question.id} should supply a deterministic diagram`);
  const normalized = normalizeQuestionDiagram(question.diagram);
  assert.ok(normalized, `${question.id} should supply a normalizable deterministic diagram`);
  assert.equal(normalized.kind, "data-display", `${question.id} should use the data-display renderer`);
  assert.deepEqual(validateQuestionDiagram(normalized), [], `${question.id} should pass deterministic figure QA`);
  return normalized as unknown as DataDisplay;
}

function categoryValue(diagram: CategoricalDataDisplay, label: string) {
  const category = diagram.categories.find((candidate) => candidate.label.en === label);
  assert.ok(category, `${diagram.title.en} should include ${label}`);
  return category.value;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

test("all nine displayed graph checkpoints render accessible answer-relevant deterministic data", () => {
  const displayed = reconstructedDisplayedQuestions();
  const displayedById = new Map(displayed.map((question) => [question.id, question]));
  assert.equal(new Set(displayed.map((question) => question.id)).size, 380, "displayed checkpoint ids should be unique");

  const diagrams = new Map<string, DataDisplay>();
  requiredDataDisplayIds.forEach((id) => {
    const question = requiredQuestion(id, displayedById);
    const diagram = dataDisplayFor(question);
    diagrams.set(id, diagram);

    assert.match(question.prompt.en, /(?:picture|bar|line) (?:graph|plot)/i, `${id} should direct the learner to the visible data display`);
    const alt = questionDiagramAltText(question.diagram!).en;
    assert.ok(alt.length >= 55, `${id} should have a meaningful accessible description, got ${JSON.stringify(alt)}`);
    assert.match(alt, /(?:picture graph|bar graph|line plot)/i, `${id} alt text should name the representation`);
    assert.match(alt, /\d/, `${id} alt text should expose the answer-relevant data values`);

    const markup = renderToStaticMarkup(React.createElement(QuestionFigure, {
      diagram: question.diagram!,
      language: "en"
    }));
    assert.match(markup, /role="img"/);
    assert.match(markup, /aria-label="[^"]{55,}"/);
    assert.match(markup, /data-question-diagram="data-display"/);
    assert.match(markup, new RegExp(`data-display="${diagram.display}"`));
    assert.match(markup, /<svg\b/, `${id} should render a visible deterministic SVG`);
  });

  const picture = diagrams.get("ccss-textbook-practice-v1-picture-graph-q01") as CategoricalDataDisplay;
  assert.equal(sum(picture.categories.map((category) => category.value)), 18);
  assert.equal(
    categoryValue(picture, "Dogs") - categoryValue(picture, "Cats"),
    Number(requiredQuestion("ccss-textbook-practice-v1-picture-graph-q02", displayedById).answer)
  );

  const bars = diagrams.get("ccss-textbook-practice-v1-bar-graph-q01") as CategoricalDataDisplay;
  assert.equal(
    categoryValue(bars, "Bananas") - categoryValue(bars, "Apples"),
    Number(requiredQuestion("ccss-textbook-practice-v1-bar-graph-q01", displayedById).answer)
  );
  assert.equal(
    sum(bars.categories.map((category) => category.value)),
    Number(requiredQuestion("ccss-textbook-practice-v1-bar-graph-q02", displayedById).answer)
  );

  const measured = diagrams.get("ccss-textbook-practice-v1-measure-line-plot-q01") as LinePlotDataDisplay;
  const measuredFrequencies = new Map<number, number>();
  measured.values.forEach((value) => measuredFrequencies.set(value, (measuredFrequencies.get(value) ?? 0) + 1));
  assert.equal(measuredFrequencies.get(1.5), 2);
  assert.equal(
    measured.values.filter((value) => value > 1.25).length,
    Number(requiredQuestion("ccss-textbook-practice-v1-measure-line-plot-q02", displayedById).answer)
  );

  const beakerAmounts = diagrams.get("ccss-textbook-practice-v1-line-plot-operations-q01") as LinePlotDataDisplay;
  assert.equal(sum(beakerAmounts.values), Number(requiredQuestion("ccss-textbook-practice-v1-line-plot-operations-q01", displayedById).answer));
  assert.equal(sum(beakerAmounts.values) / beakerAmounts.values.length, 1 / 3);
  assert.equal(requiredQuestion("ccss-textbook-practice-v1-line-plot-operations-q02", displayedById).answer, "1/3 cup");

  const redistributed = diagrams.get("ccss-textbook-practice-v1-line-plot-operations-q03") as LinePlotDataDisplay;
  assert.equal(
    sum(redistributed.values) / redistributed.values.length,
    Number(requiredQuestion("ccss-textbook-practice-v1-line-plot-operations-q03", displayedById).answer)
  );
});

test("the durable CCSS source and runtime pack keep the nine data-display specs identical", () => {
  const source = JSON.parse(readFileSync(
    path.resolve(process.cwd(), "data/generated-content/ccss-textbook-source-v1/source.json"),
    "utf8"
  )) as { practiceBySlug: Record<string, Array<{ diagram?: unknown }>> };
  const pack = JSON.parse(readFileSync(
    path.resolve(process.cwd(), "data/generated-content/ccss-textbook-practice-v1/question-pack.json"),
    "utf8"
  )) as { questions: Array<{ id: string; diagram?: unknown }> };
  const packedById = new Map(pack.questions.map((question) => [question.id, question]));

  requiredDataDisplayIds.forEach((id) => {
    const match = /^ccss-textbook-practice-v1-(.+)-q(\d+)$/.exec(id);
    assert.ok(match, `unexpected CCSS question id ${id}`);
    const [, slug, oneBasedIndex] = match;
    const sourceQuestion = source.practiceBySlug[slug]?.[Number(oneBasedIndex) - 1];
    assert.ok(sourceQuestion?.diagram, `${id} should keep its diagram in the durable source`);
    assert.deepEqual(packedById.get(id)?.diagram, sourceQuestion.diagram, `${id} generated diagram drifted from source`);
  });
});

test("the eight displayed red-team repairs remain mathematically qualified and generator-safe", () => {
  const displayedById = new Map(reconstructedDisplayedQuestions().map((question) => [question.id, question]));
  redTeamRepairIds.forEach((id) => requiredQuestion(id, displayedById));

  const congruence = requiredQuestion("ccss-textbook-practice-v1-congruence-q01", displayedById);
  const congruenceCriteria = requiredQuestion("ccss-textbook-practice-v1-congruence-criteria-q02", displayedById);
  [congruence, congruenceCriteria].forEach((question) => {
    const optionText = (question.options ?? []).map((option) => option.en).join(" | ");
    assert.match(optionText, /dilation.*(?:scale factor 2|non-unit)/i);
    assert.doesNotMatch(optionText, /(?:^|\|\s*)a dilation(?:\s*\||$)/i);
  });

  const areaFormula = requiredQuestion("ccss-textbook-practice-v1-constraints-formulas-q01", displayedById);
  const distanceFormula = requiredQuestion("ccss-textbook-practice-v1-constraints-formulas-q02", displayedById);
  assert.match(`${areaFormula.prompt.en} ${areaFormula.explanation.en}`, /b\s*(?:≠|!=)\s*0/);
  assert.match(`${distanceFormula.prompt.en} ${distanceFormula.explanation.en}`, /r\s*(?:≠|!=)\s*0/);

  const populations = requiredQuestion("ccss-textbook-practice-v1-compare-populations-q03", displayedById);
  const populationText = [
    populations.prompt.en,
    populations.answer,
    populations.explanation.en,
    ...(populations.options ?? []).map((option) => option.en)
  ].join(" ");
  assert.match(populationText, /sample/i);
  assert.match(populationText, /evidence|suggest/i);
  assert.doesNotMatch(populationText, /real difference|proves? that the populations differ/i);

  const fractions = requiredQuestion("ccss-textbook-practice-v1-compare-fractions-q02", displayedById);
  assert.match(`${fractions.prompt.en} ${fractions.explanation.en}`, /same-sized whole/i);

  const arithmetic = requiredQuestion("ccss-textbook-practice-v1-arithmetic-patterns-q01", displayedById);
  assert.match(arithmetic.explanation.en, /10\s*[×*]\s*n.*0.*ones (?:digit|place)/i);

  const decimal = requiredQuestion("ccss-textbook-practice-v1-decimal-operations-q01", displayedById);
  assert.match(decimal.explanation.en, /align.*decimal points?.*place-value columns/i);
  assert.match(decimal.explanation.en, /ones.*tenths.*hundredths/i);

  const source = JSON.parse(readFileSync(
    path.resolve(process.cwd(), "data/generated-content/ccss-textbook-source-v1/source.json"),
    "utf8"
  )) as { practiceBySlug: Record<string, Array<{ prompt: string; choices?: string[]; explanation: string }>> };
  const pack = JSON.parse(readFileSync(
    path.resolve(process.cwd(), "data/generated-content/ccss-textbook-practice-v1/question-pack.json"),
    "utf8"
  )) as { questions: Array<{ id: string; prompt: LocalizedText; options?: LocalizedText[]; explanation: LocalizedText }> };
  const packedById = new Map(pack.questions.map((question) => [question.id, question]));
  redTeamRepairIds.forEach((id) => {
    const match = /^ccss-textbook-practice-v1-(.+)-q(\d+)$/.exec(id);
    assert.ok(match);
    const sourceQuestion = source.practiceBySlug[match[1]]?.[Number(match[2]) - 1];
    const packedQuestion = packedById.get(id);
    assert.ok(sourceQuestion, `${id} should remain represented in durable source`);
    assert.ok(packedQuestion, `${id} should remain represented in the runtime pack`);
    assert.equal(packedQuestion.prompt.en, sourceQuestion.prompt, `${id} prompt should converge from source to runtime`);
    assert.deepEqual(
      packedQuestion.options?.map((option) => option.en).slice(0, sourceQuestion.choices?.length),
      sourceQuestion.choices,
      `${id} source choices should be the leading runtime choices`
    );
    assert.equal(packedQuestion.explanation.en, sourceQuestion.explanation, `${id} explanation should converge from source to runtime`);
  });
});
