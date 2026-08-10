import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import CompareFractionsLesson from "@/components/lesson/ccss/lessons/compare-fractions-4";
import MultiplyFractionWholeLesson from "@/components/lesson/ccss/lessons/multiply-fraction-whole";
import NumberBondsLesson from "@/components/lesson/ccss/lessons/number-bonds";
import TwoStepProblemsLesson from "@/components/lesson/ccss/lessons/two-step-problems";

Object.assign(globalThis, { React });

const lessonSource = (slug: string) =>
  readFileSync(`components/lesson/ccss/lessons/${slug}.tsx`, "utf8");

function assertSourceMatches(slug: string, pattern: RegExp) {
  assert.match(lessonSource(slug), pattern, `${slug} must match ${pattern}`);
}

test("initial lesson prose keeps JSX word boundaries and substitutes the current multiplier", () => {
  const numberBonds = renderToStaticMarkup(React.createElement(NumberBondsLesson));
  const twoStep = renderToStaticMarkup(React.createElement(TwoStepProblemsLesson));
  const compareFractions = renderToStaticMarkup(React.createElement(CompareFractionsLesson));
  const multiplyFractionWhole = renderToStaticMarkup(React.createElement(MultiplyFractionWholeLesson));

  assert.doesNotMatch(numberBonds, /\dcolor-coded|example,\d/i);
  assert.doesNotMatch(twoStep, /\d(?:as about)/i);
  assert.doesNotMatch(compareFractions, /quickshortcut/i);
  assert.doesNotMatch(multiplyFractionWhole, /\(n ×/);
  assert.match(multiplyFractionWhole, /3 × 2\/5 = \(3 × 2\)\/5 = 6\/5/);
});

test("clock copy defines the mark-12 zero-minute convention", () => {
  const source = lessonSource("time-five-minutes");

  assert.match(source, /five-minute intervals clockwise from 12/i);
  assert.match(source, /12 position represents 0 minutes/i);
  assert.doesNotMatch(source, /long hand's position times 5 gives the minutes/i);
});

test("whole-number and measurement boundary states inflect singular units", () => {
  const expectations: Array<[string, RegExp]> = [
    ["count-on-count-back", /realJump === 1 \? "" : "s"/],
    ["tens-and-ones", /placeCount\(tens, "ten"\)/],
    ["compare-two-digit", /placeCount\(ta, "ten"\)/],
    ["order-and-measure", /unitCount\(sorted\[0\]\.len\)/],
    ["picture-graph", /petCount\(total\)/],
    ["shape-attributes", /rot === 1 \? "degree" : "degrees"/],
    ["word-problems-100", /b === 1 \? <>1 more book was donated\.<\/>/],
    ["add-subtract-regroup", /placeCount\(\(tO \+ bO\) % 10, "one"\)/],
    ["measure-with-ruler", /unitCount\(len, "big unit"\)/],
    ["money", /centCount\(totalCents\)[\s\S]*totalCents === 1 \? "is" : "are"/],
    ["bar-graph", /voteCount\(total\)/],
    ["two-step-problems", /penCount\(give\)/],
    ["add-subtract-algorithm", /placeCount\(renamedH, "hundred"\)/],
    ["perimeter", /squareUnitCount\(area\)/],
    ["multistep-problems", /vanCount\(vans\)/],
    ["read-compare-multidigit", /expanded\.length === 1 \? "place" : "places"/],
  ];

  expectations.forEach(([slug, pattern]) => assertSourceMatches(slug, pattern));
});

test("fraction and decimal boundary states inflect singular place-value words", () => {
  const expectations: Array<[string, RegExp]> = [
    ["decimals-fractions", /placeCount\(tenthsDigit, "tenth"\)/],
    ["compare-decimals", /placeCount\(aT, "tenth"\)/],
    ["read-compare-decimals-thousandths", /placeCount\(da\[2\], "thousandth"\)/],
    ["fraction-as-division", /wholeCount\(a\)/],
    ["divide-unit-fractions", /wholeCount\(w\)/],
  ];

  expectations.forEach(([slug, pattern]) => assertSourceMatches(slug, pattern));
});

test("remaining displayed copy uses clear grammatical benchmarks", () => {
  assertSourceMatches("volume-mass", /one-kilogram textbook/);
  assert.doesNotMatch(lessonSource("volume-mass"), /a kilogram textbook/);
});
