import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { californiaK5TextbookLessonSeeds } from "@/data/usCaliforniaLessons";
import { ccssTextbookLessons } from "@/data/ccssTextbookRegistry";
import { usCaliforniaQuestions } from "@/data/usCaliforniaQuestions";
import { californiaElementaryMicroLessonSpecs } from "@/data/usCaliforniaMicroLessons";
import { dedupePracticeQuestions } from "@/lib/practiceQuestionDeduping";
import AddSubtractAlgorithmLesson from "@/components/lesson/ccss/lessons/add-subtract-algorithm";
import CountOnCountBackLesson from "@/components/lesson/ccss/lessons/count-on-count-back";
import DecimalOperationsLesson from "@/components/lesson/ccss/lessons/decimal-operations";
import LinePlotOperationsLesson, {
  beakerUnit,
  cupUnit,
} from "@/components/lesson/ccss/lessons/line-plot-operations";
import MoneyLesson from "@/components/lesson/ccss/lessons/money";
import MultiplicationFluencyLesson, {
  isOneDigitMultiplicationFact,
} from "@/components/lesson/ccss/lessons/multiplication-fluency";
import ScaledGraphsLesson, {
  bookSymbolCount,
} from "@/components/lesson/ccss/lessons/scaled-graphs";
import ShapeHierarchyLesson from "@/components/lesson/ccss/lessons/shape-hierarchy";
import ShapesByAttributesLesson from "@/components/lesson/ccss/lessons/shapes-by-attributes";

// The production Next.js transform injects the JSX runtime. This focused tsx/Node
// renderer uses the repository's CommonJS test compilation, which expects the
// classic React global while loading TSX lesson modules.
Object.assign(globalThis, { React });

test("the standard algorithm exposes its current regrouping/result sentence as a compact status", () => {
  const markup = renderToStaticMarkup(React.createElement(AddSubtractAlgorithmLesson));

  assert.match(markup, /role="status" aria-live="polite" aria-atomic="true"/);
  assert.match(markup, /Result: 365 \+ 248 = 613/);
});

test("shape hierarchy discloses its trapezoid convention and announces only the selected-shape result", () => {
  const markup = renderToStaticMarkup(React.createElement(ShapeHierarchyLesson));

  assert.match(markup, /exactly one pair of parallel sides/i);
  assert.match(markup, /some math resources use an inclusive definition/i);
  assert.match(markup, /role="status" aria-live="polite" aria-atomic="true"/);
});

test("scaled book graphs keep discrete counts and count symbol names grammatically", () => {
  const markup = renderToStaticMarkup(React.createElement(ScaledGraphsLesson));

  assert.equal(bookSymbolCount(1), "1 book symbol");
  assert.equal(bookSymbolCount(2), "2 book symbols");
  assert.match(markup, /uses only whole symbols/i);
  assert.doesNotMatch(markup, /Half a symbol would mean/i);
  assert.match(markup, /aria-label="Scaled graph results"[^>]*aria-live="polite"/);
});

test("the displayed decimal checkpoint and narration cover division as well as multiplication", () => {
  const seed = californiaK5TextbookLessonSeeds.find(
    (lesson) => lesson.topicId === "us-ca-math-p5-5-nbt-decimals",
  );
  assert.ok(seed);
  assert.ok(seed.practiceQuestionIds);
  const questionsById = new Map(usCaliforniaQuestions.map((question) => [question.id, question]));
  const displayed = dedupePracticeQuestions(
    seed.practiceQuestionIds.map((id) => questionsById.get(id)).filter((question) => question !== undefined),
  ).slice(0, 5);
  const inverseOperationQuestion = displayed.find(
    (question) => question.id === "ccss-textbook-practice-v1-decimal-operations-q03",
  );

  assert.ok(inverseOperationQuestion);
  assert.match(inverseOperationQuestion.prompt.en, /×/);
  assert.match(inverseOperationQuestion.prompt.en, /÷/);
  assert.match(ccssTextbookLessons["decimal-operations"].narration, /divid/i);

  const markup = renderToStaticMarkup(React.createElement(DecimalOperationsLesson));
  assert.match(markup, /aria-label="Decimal operation result"[^>]*aria-live="polite"/);
});

test("the whole-number division estimate rounds 21.6 to the nearest integer", () => {
  const question = usCaliforniaQuestions.find(
    (candidate) => candidate.id === "ccss-textbook-practice-v1-divide-two-digit-q02",
  );

  assert.ok(question);
  assert.equal(question.answer, "22");
  assert.deepEqual(question.acceptedAnswers, ["22"]);
  assert.match(question.explanation.en, /21\.6 rounds to 22/i);
  assert.doesNotMatch(question.explanation.en, /about 21/i);
});

test("the circle circumference key preserves the computed decimal", () => {
  const question = usCaliforniaQuestions.find(
    (candidate) => candidate.id === "ccss-textbook-practice-v1-circle-pi-q02",
  );

  assert.ok(question);
  assert.equal(question.answer, "31.4");
  assert.deepEqual(question.acceptedAnswers, ["31.4"]);
  assert.match(question.prompt.en, /what value/i);
  assert.match(question.explanation.en, /31\.4/);
});

test("the inequality multiple-choice item has exactly one true option", () => {
  const question = usCaliforniaQuestions.find(
    (candidate) => candidate.id === "ccss-textbook-practice-v1-inequalities-q01",
  );

  assert.ok(question);
  assert.equal(question.type, "multiple-choice");
  assert.ok(question.options);
  const satisfyingOptions = question.options.filter((option) => Number(option.en) > 3);
  assert.deepEqual(satisfyingOptions.map((option) => option.en), ["5"]);
  assert.equal(question.answer, "5");
});

test("line-plot redistribution uses singular units at exactly one and exposes one live result", () => {
  assert.equal(cupUnit(8), "cup");
  assert.equal(cupUnit(7), "cups");
  assert.equal(beakerUnit(1), "beaker");
  assert.equal(beakerUnit(2), "beakers");

  const markup = renderToStaticMarkup(React.createElement(LinePlotOperationsLesson));
  assert.match(markup, /aria-label="Line-plot redistribution result"[^>]*aria-live="polite"/);
});

test("multiplication fluency labels factor-ten cells as an extension to one-digit facts", () => {
  assert.equal(isOneDigitMultiplicationFact(9, 9), true);
  assert.equal(isOneDigitMultiplicationFact(10, 9), false);

  const markup = renderToStaticMarkup(React.createElement(MultiplicationFluencyLesson));
  assert.match(markup, /10 row and column are a place-value pattern extension/i);
  assert.match(markup, /aria-label="Selected multiplication fact"[^>]*aria-live="polite"/);
});

test("the number-line lesson says counting on models addition and announces the equation result", () => {
  const markup = renderToStaticMarkup(React.createElement(CountOnCountBackLesson));

  assert.match(markup, /Counting on models addition/i);
  assert.doesNotMatch(markup, /Counting and adding are the same idea/i);
  assert.match(markup, /aria-label="Number-line equation result"[^>]*aria-live="polite"/);
});

test("the money lesson calls coins and the dollar bill denominations and announces only the total", () => {
  const markup = renderToStaticMarkup(React.createElement(MoneyLesson));

  assert.match(markup, /Add a few of each denomination/i);
  assert.doesNotMatch(markup, /Add a few of each coin/i);
  assert.match(markup, /aria-label="Money total"[^>]*aria-live="polite"/);
});

test("polygon side count names a broad family while other attributes distinguish subtypes", () => {
  const markup = renderToStaticMarkup(React.createElement(ShapesByAttributesLesson));

  assert.match(markup, /side count names its broad polygon family/i);
  assert.match(markup, /other attributes[^.]*distinguish shapes within that family/i);
  assert.doesNotMatch(markup, /that count is what names it/i);
  assert.match(markup, /aria-label="Selected polygon attributes"[^>]*aria-live="polite"/);
});

test("the break-apart micro-lesson describes cube arrangements rather than cube types", () => {
  const lesson = californiaElementaryMicroLessonSpecs.find(
    (candidate) => candidate.knowledgePointCode === "1-L.6",
  );
  assert.ok(lesson);
  const practice = lesson.independentPractice.join(" ");

  assert.match(practice, /in a tall stack/i);
  assert.match(practice, /in a flat row/i);
  assert.doesNotMatch(practice, /tall-stack cubes/i);
});
