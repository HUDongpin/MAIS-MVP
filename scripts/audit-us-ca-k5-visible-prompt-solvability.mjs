#!/usr/bin/env node

/**
 * Independently re-solves every live US-CA K-5 knowledge-point question from
 * student-visible English prompt text.
 *
 * Trust boundary:
 *   - A solver receives only prompt.en and validation.deterministicCheck.
 *   - answer is read only after the solver has returned a result.
 *   - independentAnswer, explanation, parameters, computedAnswer, options, and
 *     all other hidden/supporting fields never enter the solving path.
 *
 * Any unsupported prompt, ambiguous parser match, visible contradiction, or
 * answer-key mismatch makes this gate exit non-zero.
 */

import { readFileSync } from "node:fs";

const PACK_URL = new URL(
  "../data/generated-content/us-ca-k5-knowledge-point-practice-v1/question-pack.json",
  import.meta.url
);

const EXPECTED_QUESTION_COUNT = 492;

const EXPECTED_METHODS = Object.freeze([
  "computed-addition",
  "computed-addition-equation-match",
  "computed-angle-subtraction",
  "computed-area",
  "computed-comparison",
  "computed-coordinate",
  "computed-counting",
  "computed-data-comparison",
  "computed-decimal-place-value",
  "computed-expression",
  "computed-factor-check",
  "computed-fraction-addition",
  "computed-fraction-comparison",
  "computed-fraction-equivalence",
  "computed-fraction-model",
  "computed-fraction-number-line",
  "computed-k-md-attribute-compare",
  "computed-k-md-attribute-order",
  "computed-k-md-category-compare",
  "computed-k-md-category-count",
  "computed-measurement-addition",
  "computed-measurement-subtraction",
  "computed-money-value",
  "computed-multiplication",
  "computed-perimeter",
  "computed-place-value",
  "computed-related-addition-check",
  "computed-shape-identification",
  "computed-shape-property",
  "computed-subtraction",
  "computed-subtraction-equation-match",
  "computed-teen-number",
  "computed-teen-number-missing-part",
  "computed-teen-number-model",
  "computed-time-addition",
  "computed-volume"
]);

class SolveFailure extends Error {
  constructor(code, message) {
    super(message);
    this.name = "SolveFailure";
    this.code = code;
  }
}

function fail(code, message) {
  throw new SolveFailure(code, message);
}

function visibleInvariant(condition, message) {
  if (!condition) fail("VISIBLE_INCONSISTENCY", message);
}

function asInteger(raw, label = "number") {
  const value = Number(raw);
  if (!Number.isSafeInteger(value)) {
    fail("UNPARSED", `${label} is not a safe integer: ${JSON.stringify(raw)}`);
  }
  return value;
}

function normalizePrompt(raw) {
  if (typeof raw !== "string" || raw.trim() === "") {
    fail("UNPARSED", "prompt.en is missing or empty");
  }

  return raw
    .normalize("NFKC")
    .replace(/[−–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^.*?\bcheckpoint:\s*/i, "");
}

function normalizeAnswer(raw) {
  if (typeof raw !== "string" && typeof raw !== "number") return null;

  return String(raw)
    .normalize("NFKC")
    .replace(/[−–—]/g, "-")
    .replace(/×/g, "x")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function equation(left, operator, right, result) {
  return `${left} ${operator} ${right} = ${result}`;
}

function singular(word) {
  const normalized = word.toLowerCase();
  return normalized.endsWith("s") ? normalized.slice(0, -1) : normalized;
}

function requireSameNoun(...words) {
  const roots = new Set(words.map(singular));
  visibleInvariant(
    roots.size === 1,
    `visible item nouns disagree: ${words.join(", ")}`
  );
}

function pluralize(noun, count) {
  return count === 1 ? noun : `${noun}s`;
}

const WORD_NUMBERS = Object.freeze({
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20
});

function parseNumberWord(raw) {
  if (/^\d+$/.test(raw)) return asInteger(raw);
  const value = WORD_NUMBERS[raw.toLowerCase()];
  if (value === undefined) fail("UNPARSED", `unsupported number word: ${raw}`);
  return value;
}

function oneVisiblePattern(prompt, patterns) {
  const body = normalizePrompt(prompt);
  const matches = [];

  for (const pattern of patterns) {
    const match = body.match(pattern.regex);
    if (match) matches.push({ pattern, match });
  }

  if (matches.length === 0) {
    fail("UNPARSED", `no visible-prompt parser matched: ${body}`);
  }
  if (matches.length > 1) {
    fail(
      "AMBIGUOUS",
      `multiple visible-prompt parsers matched (${matches
        .map(({ pattern }) => pattern.name)
        .join(", ")}): ${body}`
    );
  }

  const { pattern, match } = matches[0];
  const expected = pattern.solve(match);
  if (typeof expected !== "string" && typeof expected !== "number") {
    fail("UNPARSED", `${pattern.name} did not produce a scalar answer`);
  }

  return { expected: String(expected), parser: pattern.name };
}

function pattern(name, regex, solve) {
  return { name, regex, solve };
}

const ADDITION_PATTERNS = [
  pattern(
    "tray-total",
    /^A tray has (\d+) red ([a-z-]+) and (\d+) blue ([a-z-]+)\. How many ([a-z-]+) are on the tray\?$/i,
    (m) => {
      requireSameNoun(m[2], m[4], m[5]);
      return asInteger(m[1]) + asInteger(m[3]);
    }
  ),
  pattern(
    "picture-groups-equation",
    /^Picture story: (\d+) red ([a-z-]+) and (\d+) blue ([a-z-]+) are together on a mat\. Which complete equation matches the picture\?$/i,
    (m) => {
      requireSameNoun(m[2], m[4]);
      const a = asInteger(m[1]);
      const b = asInteger(m[3]);
      return equation(a, "+", b, a + b);
    }
  ),
  pattern(
    "first-second-groups-equation",
    /^A picture shows (\d+) ([a-z-]+) in the first group and (\d+) in the second group\. Write a complete addition equation for the picture\.$/i,
    (m) => {
      const a = asInteger(m[1]);
      const b = asInteger(m[3]);
      return equation(a, "+", b, a + b);
    }
  ),
  pattern(
    "correct-picture-total-label",
    /^A picture shows (\d+) ([a-z-]+) beside (\d+) more ([a-z-]+)\. A label says the total is (\d+)\. Write the complete equation that corrects the label\.$/i,
    (m) => {
      requireSameNoun(m[2], m[4]);
      const a = asInteger(m[1]);
      const b = asInteger(m[3]);
      return equation(a, "+", b, a + b);
    }
  ),
  pattern(
    "blue-group-first-equation",
    /^Picture story: (\d+) red ([a-z-]+) and (\d+) blue ([a-z-]+) make one collection\. Which complete equation starts with the blue group and still matches the picture\?$/i,
    (m) => {
      requireSameNoun(m[2], m[4]);
      const red = asInteger(m[1]);
      const blue = asInteger(m[3]);
      return equation(blue, "+", red, red + blue);
    }
  ),
  pattern(
    "part-part-whole-equation",
    /^A picture shows a whole of (\d+) ([a-z-]+)\. One part has (\d+) ([a-z-]+) and the other part has (\d+)\. Write a complete addition equation that names both parts and the whole\.$/i,
    (m) => {
      requireSameNoun(m[2], m[4]);
      const whole = asInteger(m[1]);
      const a = asInteger(m[3]);
      const b = asInteger(m[5]);
      visibleInvariant(a + b === whole, `${a} + ${b} does not equal visible whole ${whole}`);
      return equation(a, "+", b, whole);
    }
  ),
  pattern(
    "cube-train-joined-total",
    /^A cube train has (\d+) red cubes?\. Snap on a section of (\d+) blue cubes?\. How many cubes are in the joined train\?$/i,
    (m) => asInteger(m[1]) + asInteger(m[2])
  ),
  pattern(
    "cube-train-missing-first-section",
    /^After (\d+) blue cubes? are snapped onto a red cube train, the train has (\d+) cubes?\. How many red cubes were in the train before the join\?$/i,
    (m) => {
      const added = asInteger(m[1]);
      const whole = asInteger(m[2]);
      visibleInvariant(whole >= added, `joined train ${whole} is shorter than added section ${added}`);
      return whole - added;
    }
  ),
  pattern(
    "cube-train-sections-equation",
    /^A cube train shows a section of (\d+) cubes? snapped to a section of (\d+) cubes?\. Write the complete addition equation represented by the train\.$/i,
    (m) => {
      const a = asInteger(m[1]);
      const b = asInteger(m[2]);
      return equation(a, "+", b, a + b);
    }
  ),
  pattern(
    "two-cube-trains-equation",
    /^A (\d+)-cube train and a (\d+)-cube train are snapped together end to end\. Which complete equation represents this action\?$/i,
    (m) => {
      const a = asInteger(m[1]);
      const b = asInteger(m[2]);
      return equation(a, "+", b, a + b);
    }
  ),
  pattern(
    "cube-train-missing-added-section",
    /^A cube train begins with (\d+) cubes? and ends with (\d+) cubes? after another section is snapped on\. How many cubes were in the section that was added\?$/i,
    (m) => {
      const start = asInteger(m[1]);
      const end = asInteger(m[2]);
      visibleInvariant(end >= start, `joined train end ${end} is smaller than start ${start}`);
      return end - start;
    }
  ),
  pattern(
    "counter-model-equation",
    /^Counter model: (\d+) red counters? are joined to (\d+) blue counters?, making (\d+) counters?\. Which complete equation matches the model\?$/i,
    (m) => {
      const a = asInteger(m[1]);
      const b = asInteger(m[2]);
      const whole = asInteger(m[3]);
      visibleInvariant(a + b === whole, `${a} + ${b} does not equal visible whole ${whole}`);
      return equation(a, "+", b, whole);
    }
  ),
  pattern(
    "counter-model-missing-sum",
    /^A counter model has (\d+) red counters? joined to (\d+) blue counters?\. Complete the matching equation: (\d+) \+ (\d+) = __\.$/i,
    (m) => {
      const red = asInteger(m[1]);
      const blue = asInteger(m[2]);
      visibleInvariant(red === asInteger(m[3]), "red group and displayed first addend disagree");
      visibleInvariant(blue === asInteger(m[4]), "blue group and displayed second addend disagree");
      return red + blue;
    }
  ),
  pattern(
    "correct-counter-model-label",
    /^A model shows (\d+) counters? joined to (\d+) more, but its label says (\d+) \+ (\d+) = (\d+)\. Write the complete equation that correctly labels the model\.$/i,
    (m) => {
      const a = asInteger(m[1]);
      const b = asInteger(m[2]);
      visibleInvariant(a === asInteger(m[3]), "model first group and label first addend disagree");
      visibleInvariant(b === asInteger(m[4]), "model second group and label second addend disagree");
      return equation(a, "+", b, a + b);
    }
  ),
  pattern(
    "equation-to-counter-description",
    /^The equation is (\d+) \+ (\d+) = (\d+)\. Which counter model description matches every number and the join action\?$/i,
    (m) => {
      const red = asInteger(m[1]);
      const blue = asInteger(m[2]);
      const whole = asInteger(m[3]);
      visibleInvariant(red + blue === whole, `${red} + ${blue} does not equal ${whole}`);
      return `${red} red ${pluralize("counter", red)} joined to ${blue} blue ${pluralize("counter", blue)} make ${whole} ${pluralize("counter", whole)}.`;
    }
  ),
  pattern(
    "equation-missing-joined-group",
    /^The equation (\d+) \+ (\d+) = (\d+) matches a counter model\. The model already shows the first group of (\d+) counters?\. How many counters must the joined group contain\?$/i,
    (m) => {
      const a = asInteger(m[1]);
      const b = asInteger(m[2]);
      const whole = asInteger(m[3]);
      const shown = asInteger(m[4]);
      visibleInvariant(a + b === whole, `${a} + ${b} does not equal ${whole}`);
      visibleInvariant(a === shown, `first addend ${a} does not equal visible first group ${shown}`);
      return b;
    }
  ),
  pattern(
    "join-story-equation",
    /^A story says (\d+) ([a-z-]+) are on a tray and (\d+) more ([a-z-]+) are added\. Which complete equation matches the join story\?$/i,
    (m) => {
      requireSameNoun(m[2], m[4]);
      const a = asInteger(m[1]);
      const b = asInteger(m[3]);
      return equation(a, "+", b, a + b);
    }
  ),
  pattern(
    "number-bond-equation",
    /^A number bond has parts (\d+) and (\d+) and whole (\d+)\. Write the complete addition equation that matches the number bond\.$/i,
    (m) => {
      const a = asInteger(m[1]);
      const b = asInteger(m[2]);
      const whole = asInteger(m[3]);
      visibleInvariant(a + b === whole, `${a} + ${b} does not equal visible whole ${whole}`);
      return equation(a, "+", b, whole);
    }
  ),
  pattern(
    "correct-join-story-operation",
    /^A join story has (\d+) objects? and then (\d+) more arrives?\. A student writes (\d+) - (\d+) = (\d+)\. Write the complete equation that uses the correct operation and result\.$/i,
    (m) => {
      const a = asInteger(m[1]);
      const b = asInteger(m[2]);
      visibleInvariant(a === asInteger(m[3]), "story start and displayed first operand disagree");
      visibleInvariant(b === asInteger(m[4]), "story added group and displayed second operand disagree");
      return equation(a, "+", b, a + b);
    }
  ),
  pattern(
    "braced-counter-model-equation",
    /^A counter model shows a group of (\d+) beside a group of (\d+), with a brace around all (\d+) counters?\. Which complete equation matches the model\?$/i,
    (m) => {
      const a = asInteger(m[1]);
      const b = asInteger(m[2]);
      const whole = asInteger(m[3]);
      visibleInvariant(a + b === whole, `${a} + ${b} does not equal visible brace total ${whole}`);
      return equation(a, "+", b, whole);
    }
  ),
  pattern(
    "number-path-equation",
    /^On a number path, start at (\d+) and make (\d+) forward steps? to land on (\d+)\. Write the complete addition equation that matches the path\.$/i,
    (m) => {
      const start = asInteger(m[1]);
      const steps = asInteger(m[2]);
      const end = asInteger(m[3]);
      visibleInvariant(start + steps === end, `${start} + ${steps} does not land on ${end}`);
      return equation(start, "+", steps, end);
    }
  )
];

const SUBTRACTION_PATTERNS = [
  pattern(
    "moved-away-remainder",
    /^There are (\d+) ([a-z-]+)\. (\d+) (?:is|are) moved away\. How many ([a-z-]+) are left\?$/i,
    (m) => {
      requireSameNoun(m[2], m[4]);
      const whole = asInteger(m[1]);
      const removed = asInteger(m[3]);
      visibleInvariant(whole >= removed, `removed ${removed} exceeds starting count ${whole}`);
      return whole - removed;
    }
  ),
  pattern(
    "crossed-out-picture-equation",
    /^Picture story: (\d+) ([a-z-]+) are shown and (\d+) are crossed out\. Write the complete subtraction equation that tells how many remain\.$/i,
    (m) => {
      const whole = asInteger(m[1]);
      const removed = asInteger(m[3]);
      visibleInvariant(whole >= removed, `crossed-out count ${removed} exceeds ${whole}`);
      return equation(whole, "-", removed, whole - removed);
    }
  ),
  pattern(
    "before-after-equation",
    /^A before-and-after picture shows (\d+) ([a-z-]+) before (\d+) ([a-z-]+) are moved away and (\d+) ([a-z-]+) afterward\. Write the complete equation for the change\.$/i,
    (m) => {
      requireSameNoun(m[2], m[4], m[6]);
      const whole = asInteger(m[1]);
      const removed = asInteger(m[3]);
      const remain = asInteger(m[5]);
      visibleInvariant(whole - removed === remain, `${whole} - ${removed} does not equal visible remainder ${remain}`);
      return equation(whole, "-", removed, remain);
    }
  ),
  pattern(
    "correct-crossed-out-caption",
    /^A picture shows (\d+) ([a-z-]+) with (\d+) crossed out, but a caption says (\d+) - (\d+) = (\d+)\. Write the complete equation that corrects the caption\.$/i,
    (m) => {
      const whole = asInteger(m[1]);
      const removed = asInteger(m[3]);
      visibleInvariant(whole === asInteger(m[4]), "picture total and caption minuend disagree");
      visibleInvariant(removed === asInteger(m[5]), "crossed-out count and caption subtrahend disagree");
      visibleInvariant(whole >= removed, `crossed-out count ${removed} exceeds ${whole}`);
      return equation(whole, "-", removed, whole - removed);
    }
  ),
  pattern(
    "direct-remainder-equation",
    /^A picture starts with (\d+) ([a-z-]+) and shows (\d+) moved away\. Of (\d+) - (\d+) = (\d+) and (\d+) - (\d+) = (\d+), write the complete equation that directly answers how many remain\.$/i,
    (m) => {
      const whole = asInteger(m[1]);
      const removed = asInteger(m[3]);
      const expected = equation(whole, "-", removed, whole - removed);
      const candidateOne = equation(asInteger(m[4]), "-", asInteger(m[5]), asInteger(m[6]));
      const candidateTwo = equation(asInteger(m[7]), "-", asInteger(m[8]), asInteger(m[9]));
      const appearances = [candidateOne, candidateTwo].filter((candidate) => candidate === expected).length;
      visibleInvariant(appearances === 1, `expected direct equation ${expected} appears ${appearances} times`);
      return expected;
    }
  ),
  pattern(
    "reconstruct-hidden-start-equation",
    /^A picture hides the starting row\. It shows (\d+) ([a-z-]+) crossed out and (\d+) ([a-z-]+) still visible\. Write the complete subtraction equation that reconstructs the original row\.$/i,
    (m) => {
      requireSameNoun(m[2], m[4]);
      const removed = asInteger(m[1]);
      const remain = asInteger(m[3]);
      return equation(removed + remain, "-", removed, remain);
    }
  ),
  pattern(
    "cube-train-unsnap-remainder",
    /^A cube train has (\d+) cubes?\. Unsnap a section of (\d+) cubes? from one end\. How many cubes remain connected\?$/i,
    (m) => {
      const whole = asInteger(m[1]);
      const removed = asInteger(m[2]);
      visibleInvariant(whole >= removed, `unsnapped section ${removed} exceeds train ${whole}`);
      return whole - removed;
    }
  ),
  pattern(
    "cube-train-missing-unsnapped-section",
    /^A (\d+)-cube train is split into a connected section of (\d+) cubes? and a section that was unsnapped\. How many cubes were in the unsnapped section\?$/i,
    (m) => {
      const whole = asInteger(m[1]);
      const connected = asInteger(m[2]);
      visibleInvariant(whole >= connected, `connected section ${connected} exceeds train ${whole}`);
      return whole - connected;
    }
  ),
  pattern(
    "cube-train-subtraction-equation",
    /^A cube train begins with (\d+) cubes?\. A section of (\d+) cubes? is unsnapped, leaving (\d+) connected\. Write the complete subtraction equation represented by the train\.$/i,
    (m) => {
      const whole = asInteger(m[1]);
      const removed = asInteger(m[2]);
      const remain = asInteger(m[3]);
      visibleInvariant(whole - removed === remain, `${whole} - ${removed} does not equal visible remainder ${remain}`);
      return equation(whole, "-", removed, remain);
    }
  ),
  pattern(
    "cube-train-reconstruct-start",
    /^After a section of (\d+) cubes? is unsnapped, a cube train has (\d+) cubes? still connected\. How many cubes were in the train before it was split\?$/i,
    (m) => asInteger(m[1]) + asInteger(m[2])
  ),
  pattern(
    "correct-student-remainder",
    /^A student unsnaps (\d+) cubes? from a (\d+)-cube train and says (\d+) cubes? remain\. What number should replace (\d+)\?$/i,
    (m) => {
      const removed = asInteger(m[1]);
      const whole = asInteger(m[2]);
      visibleInvariant(asInteger(m[3]) === asInteger(m[4]), "stated wrong remainder and replacement target disagree");
      visibleInvariant(whole >= removed, `unsnapped section ${removed} exceeds train ${whole}`);
      return whole - removed;
    }
  ),
  pattern(
    "counter-model-subtraction-equation",
    /^Counter model: (\d+) counters? are shown, (\d+) are crossed out, and (\d+) remain\. Write the complete subtraction equation that matches the model\.$/i,
    (m) => {
      const whole = asInteger(m[1]);
      const removed = asInteger(m[2]);
      const remain = asInteger(m[3]);
      visibleInvariant(whole - removed === remain, `${whole} - ${removed} does not equal visible remainder ${remain}`);
      return equation(whole, "-", removed, remain);
    }
  ),
  pattern(
    "counter-model-missing-remainder",
    /^A model for (\d+) - (\d+) = __ starts with (\d+) counters? and crosses out (\d+)\. How many counters should the uncrossed part show\?$/i,
    (m) => {
      const whole = asInteger(m[1]);
      const removed = asInteger(m[2]);
      visibleInvariant(whole === asInteger(m[3]), "equation minuend and model total disagree");
      visibleInvariant(removed === asInteger(m[4]), "equation subtrahend and crossed-out count disagree");
      return whole - removed;
    }
  ),
  pattern(
    "correct-counter-subtraction-label",
    /^A counter model shows (\d+) counters? with (\d+) crossed out, but its label says (\d+) - (\d+) = (\d+)\. Write the complete equation that correctly labels the model\.$/i,
    (m) => {
      const whole = asInteger(m[1]);
      const removed = asInteger(m[2]);
      visibleInvariant(whole === asInteger(m[3]), "model total and label minuend disagree");
      visibleInvariant(removed === asInteger(m[4]), "crossed-out count and label subtrahend disagree");
      return equation(whole, "-", removed, whole - removed);
    }
  ),
  pattern(
    "take-away-missing-crossed-out",
    /^A take-away model starts with (\d+) ([a-z-]+) and leaves (\d+) uncrossed\. The matching equation starts with (\d+) and has a remainder of (\d+)\. How many ([a-z-]+) should be crossed out\?$/i,
    (m) => {
      requireSameNoun(m[2], m[6]);
      const whole = asInteger(m[1]);
      const remain = asInteger(m[3]);
      visibleInvariant(whole === asInteger(m[4]), "model total and equation start disagree");
      visibleInvariant(remain === asInteger(m[5]), "visible uncrossed count and equation remainder disagree");
      return whole - remain;
    }
  ),
  pattern(
    "take-away-reconstruct-full-model",
    /^A model has (\d+) ([a-z-]+) crossed out and (\d+) ([a-z-]+) uncrossed\. Its matching equation subtracts (\d+) and has a remainder of (\d+)\. How many ([a-z-]+) must the full starting model contain\?$/i,
    (m) => {
      requireSameNoun(m[2], m[4], m[7]);
      const removed = asInteger(m[1]);
      const remain = asInteger(m[3]);
      visibleInvariant(removed === asInteger(m[5]), "crossed-out count and equation subtrahend disagree");
      visibleInvariant(remain === asInteger(m[6]), "uncrossed count and equation remainder disagree");
      return removed + remain;
    }
  ),
  pattern(
    "cup-and-mat-part",
    /^There are (\d+) counters altogether\. One counter is in a cup, and the rest are on a mat\. How many counters are on the mat\?$/i,
    (m) => asInteger(m[1]) - 1
  ),
  pattern(
    "two-part-tile-design",
    /^([a-z]+|\d+) tiles make two parts of a design\. One part has (\d+) tiles?\. How many tiles are in the other part\?$/i,
    (m) => parseNumberWord(m[1]) - asInteger(m[2])
  ),
  pattern(
    "two-part-button-sort",
    /^([a-z]+|\d+) buttons are sorted into two parts\. ([a-z]+|\d+) are large\. How many are small\?$/i,
    (m) => parseNumberWord(m[1]) - parseNumberWord(m[2])
  ),
  pattern(
    "two-tower-cubes",
    /^([a-z]+|\d+) cubes are used in two towers\. One tower has (\d+) cubes?\. How many cubes are in the other tower\?$/i,
    (m) => parseNumberWord(m[1]) - asInteger(m[2])
  )
];

const SHAPE_NAMES_BY_SIDE_COUNT = Object.freeze({
  3: "triangle",
  4: "quadrilateral",
  5: "pentagon",
  6: "hexagon"
});

const EQUAL_PART_NAMES = Object.freeze({
  2: "half",
  3: "third",
  4: "fourth"
});

const SHAPE_IDENTIFICATION_PATTERNS = [
  pattern(
    "triangle-description",
    /^A flat shape has 3 straight sides and 3 corners\. What shape is it\?$/i,
    () => "triangle"
  ),
  pattern(
    "square-description",
    /^A flat shape has 4 sides that are all the same length and 4 square corners\. What shape is it\?$/i,
    () => "square"
  ),
  pattern(
    "rectangle-description",
    /^A flat shape has 4 square corners with two long sides and two short sides\. What shape is it\?$/i,
    () => "rectangle"
  ),
  pattern(
    "circle-description",
    /^A flat shape is perfectly round with no straight sides and no corners\. What shape is it\?$/i,
    () => "circle"
  ),
  pattern(
    "flat-shape-side-count",
    /^A flat shape has (\d+) straight sides\. What shape is it\?$/i,
    (m) => {
      const answer = SHAPE_NAMES_BY_SIDE_COUNT[asInteger(m[1])];
      if (!answer) fail("UNPARSED", `unsupported flat-shape side count: ${m[1]}`);
      return answer;
    }
  ),
  pattern(
    "equal-part-name",
    /^A whole shape is cut into (\d+) equal parts\. What is each equal part called\?$/i,
    (m) => {
      const answer = EQUAL_PART_NAMES[asInteger(m[1])];
      if (!answer) fail("UNPARSED", `unsupported equal-part count: ${m[1]}`);
      return answer;
    }
  ),
  pattern(
    "polygon-side-count",
    /^A polygon has exactly (\d+) straight sides\. What is the name of this kind of polygon\?$/i,
    (m) => {
      const answer = SHAPE_NAMES_BY_SIDE_COUNT[asInteger(m[1])];
      if (!answer) fail("UNPARSED", `unsupported polygon side count: ${m[1]}`);
      return answer;
    }
  ),
  pattern(
    "parallel-lines-description",
    /^Two straight lines in a plane never cross and stay the same distance apart\. What are these lines called\?$/i,
    () => "parallel"
  ),
  pattern(
    "perpendicular-lines-description",
    /^Two straight lines cross to make a square corner \(a right angle\)\. What are these lines called\?$/i,
    () => "perpendicular"
  ),
  pattern(
    "right-angle-description",
    /^An angle forms a square corner and measures exactly (\d+) degrees\. What is this angle called\?$/i,
    (m) => {
      visibleInvariant(asInteger(m[1]) === 90, `a square corner must be 90 degrees, not ${m[1]}`);
      return "right angle";
    }
  ),
  pattern(
    "acute-angle-description",
    /^An angle is smaller than a right angle \(less than (\d+) degrees\)\. What is this angle called\?$/i,
    (m) => {
      visibleInvariant(asInteger(m[1]) === 90, `right-angle boundary must be 90, not ${m[1]}`);
      return "acute angle";
    }
  ),
  pattern(
    "obtuse-angle-description",
    /^An angle is larger than a right angle but smaller than a straight angle \(between (\d+) and (\d+) degrees\)\. What is this angle called\?$/i,
    (m) => {
      visibleInvariant(asInteger(m[1]) === 90, `right-angle boundary must be 90, not ${m[1]}`);
      visibleInvariant(asInteger(m[2]) === 180, `straight-angle boundary must be 180, not ${m[2]}`);
      return "obtuse angle";
    }
  ),
  pattern(
    "coordinate-plane-origin",
    /^On a coordinate plane, what is the name of the point \((-?\d+), (-?\d+)\) where the x-axis and y-axis meet\?$/i,
    (m) => {
      visibleInvariant(asInteger(m[1]) === 0 && asInteger(m[2]) === 0, `axes meet at (0, 0), not (${m[1]}, ${m[2]})`);
      return "origin";
    }
  )
];

const SOLVERS = Object.freeze({
  "computed-addition": (prompt) => oneVisiblePattern(prompt, ADDITION_PATTERNS),

  "computed-addition-equation-match": (prompt) =>
    oneVisiblePattern(prompt, [
      pattern(
        "join-story-equation-choice",
        /^Which equation matches this join story: (\d+) small cubes? and (\d+) large cubes? are put together\?$/i,
        (m) => {
          const a = asInteger(m[1]);
          const b = asInteger(m[2]);
          return equation(a, "+", b, a + b);
        }
      )
    ]),

  "computed-angle-subtraction": (prompt) =>
    oneVisiblePattern(prompt, [
      pattern(
        "right-angle-missing-angle",
        /^Two angles make a right angle\. One angle is (\d+) degrees\. What is the other angle\?$/i,
        (m) => {
          const angle = asInteger(m[1]);
          visibleInvariant(angle >= 0 && angle <= 90, `angle ${angle} cannot be part of a 90-degree sum`);
          return `${90 - angle} degrees`;
        }
      )
    ]),

  "computed-area": (prompt) =>
    oneVisiblePattern(prompt, [
      pattern(
        "rectangle-area",
        /^A rectangle is (\d+) units long and (\d+) units wide\. What is its area\?$/i,
        (m) => `${asInteger(m[1]) * asInteger(m[2])} square units`
      )
    ]),

  "computed-comparison": (prompt) =>
    oneVisiblePattern(prompt, [
      pattern(
        "larger-cardinality",
        /^One card has (\d+) dots\. Another card has (\d+) dots\. How many dots are on the card that has more\?$/i,
        (m) => {
          const a = asInteger(m[1]);
          const b = asInteger(m[2]);
          if (a === b) fail("AMBIGUOUS", `both cards have ${a} dots`);
          return Math.max(a, b);
        }
      )
    ]),

  "computed-coordinate": (prompt) =>
    oneVisiblePattern(prompt, [
      pattern(
        "origin-right-up-coordinate",
        /^A point moves (\d+) units? right from the origin and (\d+) units? up\. What ordered pair names the point\?$/i,
        (m) => `(${asInteger(m[1])}, ${asInteger(m[2])})`
      )
    ]),

  "computed-counting": (prompt) =>
    oneVisiblePattern(prompt, [
      pattern(
        "explicit-collection-count",
        /^Count the collection: (\d+) [a-z-]+ are on a mat\. How many objects are on the mat\?$/i,
        (m) => asInteger(m[1])
      )
    ]),

  "computed-data-comparison": (prompt) =>
    oneVisiblePattern(prompt, [
      pattern(
        "picture-graph-fruit-difference",
        /^A picture graph shows (\d+) apples and (\d+) oranges\. Which fruit has more, and by how many\?$/i,
        (m) => {
          const apples = asInteger(m[1]);
          const oranges = asInteger(m[2]);
          if (apples === oranges) fail("AMBIGUOUS", `apples and oranges are tied at ${apples}`);
          const difference = Math.abs(apples - oranges);
          const fruit = apples > oranges ? "apple" : "orange";
          return `${difference} more ${pluralize(fruit, difference)}`;
        }
      )
    ]),

  "computed-decimal-place-value": (prompt) =>
    oneVisiblePattern(prompt, [
      pattern(
        "ones-and-tenths-decimal",
        /^Which decimal is (\d+) ones and (\d+) tenths\?$/i,
        (m) => {
          const ones = asInteger(m[1]);
          const tenths = asInteger(m[2]);
          visibleInvariant(tenths >= 0 && tenths <= 9, `tenths digit must be 0-9, not ${tenths}`);
          return `${ones}.${tenths}`;
        }
      )
    ]),

  "computed-expression": (prompt) =>
    oneVisiblePattern(prompt, [
      pattern(
        "multiply-parenthesized-sum",
        /^Evaluate (\d+) x \((\d+) \+ (\d+)\)\.$/i,
        (m) => asInteger(m[1]) * (asInteger(m[2]) + asInteger(m[3]))
      )
    ]),

  "computed-factor-check": (prompt) =>
    oneVisiblePattern(prompt, [
      pattern(
        "integer-factor-check",
        /^Is (\d+) a factor of (\d+)\?$/i,
        (m) => {
          const factor = asInteger(m[1]);
          const value = asInteger(m[2]);
          visibleInvariant(factor !== 0, "zero cannot be used as the divisor in this factor check");
          return value % factor === 0 ? "yes" : "no";
        }
      )
    ]),

  "computed-fraction-addition": (prompt) =>
    oneVisiblePattern(prompt, [
      pattern(
        "like-denominator-fraction-addition",
        /^Add (\d+)\/(\d+) \+ (\d+)\/(\d+)\.$/i,
        (m) => {
          const a = asInteger(m[1]);
          const denominatorA = asInteger(m[2]);
          const b = asInteger(m[3]);
          const denominatorB = asInteger(m[4]);
          visibleInvariant(denominatorA > 0 && denominatorB > 0, "fraction denominator must be positive");
          visibleInvariant(
            denominatorA === denominatorB,
            `visible fractions do not have like denominators: ${denominatorA} and ${denominatorB}`
          );
          return `${a + b}/${denominatorA}`;
        }
      )
    ]),

  "computed-fraction-comparison": (prompt) =>
    oneVisiblePattern(prompt, [
      pattern(
        "greater-fraction",
        /^Which fraction is greater: (\d+)\/(\d+) or (\d+)\/(\d+)\?$/i,
        (m) => {
          const a = asInteger(m[1]);
          const b = asInteger(m[2]);
          const c = asInteger(m[3]);
          const d = asInteger(m[4]);
          visibleInvariant(b > 0 && d > 0, "fraction denominator must be positive");
          const left = a * d;
          const right = c * b;
          if (left === right) fail("AMBIGUOUS", `${a}/${b} and ${c}/${d} are equivalent`);
          return left > right ? `${a}/${b}` : `${c}/${d}`;
        }
      )
    ]),

  "computed-fraction-equivalence": (prompt) =>
    oneVisiblePattern(prompt, [
      pattern(
        "split-each-fraction-part",
        /^Name a fraction equivalent to (\d+)\/(\d+) by splitting each part into (\d+) equal pieces\.$/i,
        (m) => {
          const numerator = asInteger(m[1]);
          const denominator = asInteger(m[2]);
          const pieces = asInteger(m[3]);
          visibleInvariant(denominator > 0 && pieces > 0, "denominator and split count must be positive");
          return `${numerator * pieces}/${denominator * pieces}`;
        }
      )
    ]),

  "computed-fraction-model": (prompt) =>
    oneVisiblePattern(prompt, [
      pattern(
        "shaded-rectangle-fraction",
        /^A rectangle is split into (\d+) equal parts\. (\d+) parts? (?:is|are) shaded\. What fraction is shaded\?$/i,
        (m) => {
          const denominator = asInteger(m[1]);
          const numerator = asInteger(m[2]);
          visibleInvariant(denominator > 0, "part count must be positive");
          visibleInvariant(numerator >= 0 && numerator <= denominator, `shaded count ${numerator} exceeds ${denominator} parts`);
          return `${numerator}/${denominator}`;
        }
      )
    ]),

  "computed-fraction-number-line": (prompt) =>
    oneVisiblePattern(prompt, [
      pattern(
        "zero-to-one-number-line-fraction",
        /^A number line from 0 to 1 is split into (\d+) equal jumps\. A point is at jump (\d+)\. What fraction names the point\?$/i,
        (m) => {
          const denominator = asInteger(m[1]);
          const numerator = asInteger(m[2]);
          visibleInvariant(denominator > 0, "jump count must be positive");
          visibleInvariant(numerator >= 0 && numerator <= denominator, `jump ${numerator} lies outside 0-${denominator}`);
          return `${numerator}/${denominator}`;
        }
      )
    ]),

  "computed-k-md-attribute-compare": (prompt) =>
    oneVisiblePattern(prompt, [
      pattern(
        "longer-paper-strip",
        /^One paper strip is (\d+) cubes? long\. Another paper strip is (\d+) cubes? long\. How many cubes long is the longer strip\?$/i,
        (m) => {
          const a = asInteger(m[1]);
          const b = asInteger(m[2]);
          if (a === b) fail("AMBIGUOUS", `both paper strips are ${a} cubes long`);
          return Math.max(a, b);
        }
      )
    ]),

  "computed-k-md-attribute-order": (prompt) =>
    oneVisiblePattern(prompt, [
      pattern(
        "three-object-length-order",
        /^A ([a-z-]+) is shorter than a ([a-z-]+)\. The ([a-z-]+) is shorter than a ([a-z-]+)\. Which object is the longest\?$/i,
        (m) => {
          visibleInvariant(m[2].toLowerCase() === m[3].toLowerCase(), "middle object changes between comparisons");
          const names = [m[1], m[2], m[4]].map((value) => value.toLowerCase());
          visibleInvariant(new Set(names).size === 3, "length ordering repeats an object name");
          return names[2];
        }
      )
    ]),

  "computed-k-md-category-compare": (prompt) =>
    oneVisiblePattern(prompt, [
      pattern(
        "larger-shape-category",
        /^A class chart has (\d+) circles and (\d+) squares\. Which category has more\?$/i,
        (m) => {
          const circles = asInteger(m[1]);
          const squares = asInteger(m[2]);
          if (circles === squares) fail("AMBIGUOUS", `circles and squares are tied at ${circles}`);
          return circles > squares ? "circles" : "squares";
        }
      )
    ]),

  "computed-k-md-category-count": (prompt) =>
    oneVisiblePattern(prompt, [
      pattern(
        "square-button-count",
        /^A tray has (\d+) circle buttons and (\d+) square buttons\. How many buttons are square buttons\?$/i,
        (m) => asInteger(m[2])
      )
    ]),

  "computed-measurement-addition": (prompt) =>
    oneVisiblePattern(prompt, [
      pattern(
        "ribbon-length-total",
        /^A ribbon is (\d+) cm long\. Another ribbon is (\d+) cm long\. What is the total length\?$/i,
        (m) => `${asInteger(m[1]) + asInteger(m[2])} cm`
      )
    ]),

  "computed-measurement-subtraction": (prompt) =>
    oneVisiblePattern(prompt, [
      pattern(
        "shortened-ribbon-length",
        /^A ribbon is (\d+) cm long\. It is cut (\d+) cm shorter\. How long is it now\?$/i,
        (m) => {
          const whole = asInteger(m[1]);
          const removed = asInteger(m[2]);
          visibleInvariant(whole >= removed, `cut length ${removed} exceeds ribbon ${whole}`);
          return `${whole - removed} cm`;
        }
      )
    ]),

  "computed-money-value": (prompt) =>
    oneVisiblePattern(prompt, [
      pattern(
        "dimes-and-pennies",
        /^A coin cup has (\d+) dimes? and (\d+) pennies\. How many cents is that\?$/i,
        (m) => `${asInteger(m[1]) * 10 + asInteger(m[2])} cents`
      )
    ]),

  "computed-multiplication": (prompt) =>
    oneVisiblePattern(prompt, [
      pattern(
        "equal-bags-product",
        /^(\d+) equal bags each hold (\d+) [a-z-]+\. How many [a-z-]+ are there in all\?$/i,
        (m) => asInteger(m[1]) * asInteger(m[2])
      )
    ]),

  "computed-perimeter": (prompt) =>
    oneVisiblePattern(prompt, [
      pattern(
        "rectangle-perimeter",
        /^A rectangle is (\d+) units long and (\d+) units wide\. What is its perimeter\?$/i,
        (m) => `${2 * (asInteger(m[1]) + asInteger(m[2]))} units`
      )
    ]),

  "computed-place-value": (prompt) =>
    oneVisiblePattern(prompt, [
      pattern(
        "tens-and-ones",
        /^What number has (\d+) tens and (\d+) ones?\?$/i,
        (m) => asInteger(m[1]) * 10 + asInteger(m[2])
      ),
      pattern(
        "hundreds-tens-ones",
        /^What number has (\d+) hundreds?, (\d+) tens, and (\d+) ones?\?$/i,
        (m) => asInteger(m[1]) * 100 + asInteger(m[2]) * 10 + asInteger(m[3])
      )
    ]),

  "computed-related-addition-check": (prompt) =>
    oneVisiblePattern(prompt, [
      pattern(
        "split-total-related-addition",
        /^([a-z]+|\d+) stickers are split between two pages\. ([a-z]+|\d+) are on the first page, and the rest are on the second\. Write an addition equation that checks the missing part\.$/i,
        (m) => {
          const whole = parseNumberWord(m[1]);
          const first = parseNumberWord(m[2]);
          visibleInvariant(whole >= first, `first page ${first} exceeds total ${whole}`);
          return equation(first, "+", whole - first, whole);
        }
      )
    ]),

  "computed-shape-identification": (prompt) =>
    oneVisiblePattern(prompt, SHAPE_IDENTIFICATION_PATTERNS),

  "computed-shape-property": (prompt) =>
    oneVisiblePattern(prompt, [
      pattern(
        "named-shape-side-count",
        /^In (?:a|an) [a-z -]+, how many sides does a (square|triangle|rectangle) have\?$/i,
        (m) => ({ square: 4, triangle: 3, rectangle: 4 })[m[1].toLowerCase()]
      )
    ]),

  "computed-subtraction": (prompt) => oneVisiblePattern(prompt, SUBTRACTION_PATTERNS),

  "computed-subtraction-equation-match": (prompt) =>
    oneVisiblePattern(prompt, [
      pattern(
        "take-away-story-equation-choice",
        /^Which equation matches this take-away story: (\d+) counters are on a ten-frame and (\d+) are covered\?$/i,
        (m) => {
          const whole = asInteger(m[1]);
          const removed = asInteger(m[2]);
          visibleInvariant(whole >= removed, `covered count ${removed} exceeds ${whole}`);
          return equation(whole, "-", removed, whole - removed);
        }
      )
    ]),

  "computed-teen-number": (prompt) =>
    oneVisiblePattern(prompt, [
      pattern(
        "ten-frame-plus-more",
        /^A ten-frame shows (\d+) counters and (\d+) more counters\. What number is shown\?$/i,
        (m) => asInteger(m[1]) + asInteger(m[2])
      ),
      pattern(
        "teen-addition-blank",
        /^Fill in the number: (\d+) \+ (\d+) = __\.$/i,
        (m) => asInteger(m[1]) + asInteger(m[2])
      )
    ]),

  "computed-teen-number-missing-part": (prompt) =>
    oneVisiblePattern(prompt, [
      pattern(
        "teen-number-missing-ones",
        /^(\d+) is (\d+) and how many more ones\?$/i,
        (m) => {
          const whole = asInteger(m[1]);
          const base = asInteger(m[2]);
          visibleInvariant(whole >= base, `${whole} is smaller than base ${base}`);
          return whole - base;
        }
      )
    ]),

  "computed-teen-number-model": (prompt) =>
    oneVisiblePattern(prompt, [
      pattern(
        "teen-number-tens-ones-model",
        /^Which model shows (\d+)\?$/i,
        (m) => {
          const whole = asInteger(m[1]);
          visibleInvariant(whole >= 10 && whole <= 19, `expected a teen number, got ${whole}`);
          const ones = whole - 10;
          return `1 ten and ${ones} ${pluralize("one", ones)}`;
        }
      )
    ]),

  "computed-time-addition": (prompt) =>
    oneVisiblePattern(prompt, [
      pattern(
        "clock-hours-later",
        /^A clock shows (\d{1,2}):(\d{2})\. What time will it be (\d+) hours? later\?$/i,
        (m) => {
          const hour = asInteger(m[1]);
          const minute = asInteger(m[2]);
          const delta = asInteger(m[3]);
          visibleInvariant(hour >= 1 && hour <= 12, `clock hour must be 1-12, not ${hour}`);
          visibleInvariant(minute >= 0 && minute <= 59, `clock minute must be 00-59, not ${minute}`);
          const resultHour = ((hour - 1 + delta) % 12) + 1;
          return `${resultHour}:${String(minute).padStart(2, "0")}`;
        }
      )
    ]),

  "computed-volume": (prompt) =>
    oneVisiblePattern(prompt, [
      pattern(
        "rectangular-prism-volume",
        /^A rectangular prism is (\d+) units by (\d+) units by (\d+) units\. What is its volume\?$/i,
        (m) => `${asInteger(m[1]) * asInteger(m[2]) * asInteger(m[3])} cubic units`
      )
    ])
});

function solveVisiblePrompt(promptEn, method) {
  const solver = SOLVERS[method];
  if (!solver) fail("UNPARSED", `unsupported deterministic method: ${JSON.stringify(method)}`);
  return solver(promptEn);
}

function main() {
  let pack;
  try {
    pack = JSON.parse(readFileSync(PACK_URL, "utf8"));
  } catch (error) {
    console.error(`FAIL unable to read question pack: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  const questions = pack?.questions;
  if (!Array.isArray(questions)) {
    console.error("FAIL question-pack.json does not contain a questions array");
    process.exitCode = 1;
    return;
  }

  const errors = [];
  const seenMethods = new Map();

  const configuredMethods = Object.keys(SOLVERS).sort();
  const expectedMethods = [...EXPECTED_METHODS].sort();
  if (JSON.stringify(configuredMethods) !== JSON.stringify(expectedMethods)) {
    errors.push({
      id: "<gate-config>",
      code: "METHOD_CONFIG_MISMATCH",
      detail: `configured=${configuredMethods.join(",")} expected=${expectedMethods.join(",")}`
    });
  }

  if (questions.length !== EXPECTED_QUESTION_COUNT) {
    errors.push({
      id: "<pack>",
      code: "QUESTION_COUNT_MISMATCH",
      detail: `found ${questions.length}; expected ${EXPECTED_QUESTION_COUNT}`
    });
  }

  for (let index = 0; index < questions.length; index += 1) {
    const question = questions[index];
    const id = typeof question?.id === "string" && question.id ? question.id : `<index-${index}>`;
    const promptEn = question?.prompt?.en;
    const method = question?.validation?.deterministicCheck;

    if (typeof method === "string") {
      seenMethods.set(method, (seenMethods.get(method) ?? 0) + 1);
    }

    let solved;
    try {
      solved = solveVisiblePrompt(promptEn, method);
    } catch (error) {
      errors.push({
        id,
        code: error instanceof SolveFailure ? error.code : "SOLVER_EXCEPTION",
        detail: error.message
      });
      continue;
    }

    // Deliberate trust boundary: the key is first read only after solving from
    // prompt.en has completed. No hidden/supporting answer field is passed to a
    // parser or derivation function.
    const keyedAnswer = question.answer;
    const normalizedExpected = normalizeAnswer(solved.expected);
    const normalizedKey = normalizeAnswer(keyedAnswer);

    if (normalizedKey === null) {
      errors.push({
        id,
        code: "ANSWER_KEY_UNREADABLE",
        detail: `answer is not a string or number; visible solve produced ${JSON.stringify(solved.expected)}`
      });
      continue;
    }

    if (normalizedExpected !== normalizedKey) {
      errors.push({
        id,
        code: "ANSWER_MISMATCH",
        detail: `${solved.parser} solved ${JSON.stringify(solved.expected)} from prompt.en; answer is ${JSON.stringify(keyedAnswer)}`
      });
    }
  }

  for (const method of EXPECTED_METHODS) {
    if (!seenMethods.has(method)) {
      errors.push({
        id: "<pack>",
        code: "METHOD_NOT_COVERED",
        detail: method
      });
    }
  }

  for (const method of seenMethods.keys()) {
    if (!EXPECTED_METHODS.includes(method)) {
      errors.push({
        id: "<pack>",
        code: "UNEXPECTED_METHOD",
        detail: method
      });
    }
  }

  const unparsed = errors.filter((error) => error.code === "UNPARSED").length;
  const ambiguous = errors.filter((error) => error.code === "AMBIGUOUS").length;
  const inconsistent = errors.filter((error) =>
    [
      "VISIBLE_INCONSISTENCY",
      "ANSWER_MISMATCH",
      "ANSWER_KEY_UNREADABLE",
      "METHOD_CONFIG_MISMATCH",
      "QUESTION_COUNT_MISMATCH",
      "METHOD_NOT_COVERED",
      "UNEXPECTED_METHOD",
      "SOLVER_EXCEPTION"
    ].includes(error.code)
  ).length;
  const errorIds = [...new Set(errors.map((error) => error.id))];

  console.log("US-CA K-5 visible-prompt solvability gate");
  console.log(`questions: ${questions.length}/${EXPECTED_QUESTION_COUNT}`);
  console.log(`methods: ${seenMethods.size}/${EXPECTED_METHODS.length}`);
  console.log(`unparsed: ${unparsed}`);
  console.log(`ambiguous: ${ambiguous}`);
  console.log(`inconsistent: ${inconsistent}`);
  console.log(`error_ids: ${errorIds.length === 0 ? "none" : errorIds.join(", ")}`);

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`FAIL ${error.id} [${error.code}] ${error.detail}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("PASS: every question was independently solved from prompt.en and matched answer.");
}

main();
