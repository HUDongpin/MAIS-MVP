#!/usr/bin/env node

/**
 * Re-solves every live US-CA K-5 knowledge-point prompt, then audits the
 * student-visible English explanation against that independent solution.
 *
 * Correctness trust boundary:
 *   1. solvePrompt() receives only prompt.en and validation.deterministicCheck;
 *   2. explanation.en is read only after prompt solving succeeds;
 *   3. keyed answers, independent solutions, generation parameters, and stored
 *      computed results are never read or used as correctness sources.
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

class AuditFailure extends Error {
  constructor(code, message) {
    super(message);
    this.name = "AuditFailure";
    this.code = code;
  }
}

function fail(code, message) {
  throw new AuditFailure(code, message);
}

function visibleInvariant(condition, message) {
  if (!condition) fail("VISIBLE_PROMPT_CONTRADICTION", message);
}

function integer(raw) {
  const value = Number(raw);
  if (!Number.isSafeInteger(value)) fail("UNPARSED_PROMPT", `not a safe integer: ${raw}`);
  return value;
}

function normalize(raw) {
  if (typeof raw !== "string") return "";
  return raw
    .normalize("NFKC")
    .replace(/[−–—]/g, "-")
    .replace(/×/g, "x")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function promptBody(raw) {
  const normalized = normalize(raw);
  if (!normalized) fail("UNPARSED_PROMPT", "prompt.en is missing or empty");
  return normalized.replace(/^.*?\bcheckpoint:\s*/i, "");
}

function escapeRegex(raw) {
  return raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compactMath(raw) {
  return normalize(raw).replace(/\s+/g, "");
}

function numberSolution(value, unit = null, required = []) {
  return { kind: "number", value: Number(value), unit, required };
}

function equationSolution(a, operator, b, result, required = []) {
  return {
    kind: "equation",
    value: `${a} ${operator} ${b} = ${result}`,
    required
  };
}

function fractionSolution(numerator, denominator, required = []) {
  return { kind: "fraction", value: `${numerator}/${denominator}`, required };
}

function textSolution(value, required = []) {
  return { kind: "text", value: normalize(value), required };
}

function semanticSolution(label, required) {
  return { kind: "semantic", value: label, required };
}

function onePattern(prompt, patterns) {
  const body = promptBody(prompt);
  const matches = [];
  for (const entry of patterns) {
    const match = body.match(entry.regex);
    if (match) matches.push({ entry, match });
  }
  if (matches.length === 0) {
    fail("UNPARSED_PROMPT", `no prompt parser matched: ${body}`);
  }
  if (matches.length > 1) {
    fail(
      "AMBIGUOUS_PROMPT",
      `multiple prompt parsers matched: ${matches.map(({ entry }) => entry.name).join(", ")}`
    );
  }
  return matches[0].entry.solve(matches[0].match);
}

function rule(name, regex, solve) {
  return { name, regex, solve };
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

function wordNumber(raw) {
  if (/^\d+$/.test(raw)) return integer(raw);
  const value = WORD_NUMBERS[raw.toLowerCase()];
  if (value === undefined) fail("UNPARSED_PROMPT", `unsupported number word: ${raw}`);
  return value;
}

function plural(noun, count) {
  return count === 1 ? noun : `${noun}s`;
}

const ADDITION_RULES = [
  rule(
    "tray-total",
    /^a tray has (\d+) red [a-z-]+ and (\d+) blue [a-z-]+\. how many [a-z-]+ are on the tray\?$/i,
    (m) => equationSolution(integer(m[1]), "+", integer(m[2]), integer(m[1]) + integer(m[2]))
  ),
  rule(
    "pictured-parts-equation",
    /^picture story: (\d+) red [a-z-]+ and (\d+) blue [a-z-]+ are together on a mat\. which complete equation matches the picture\?$/i,
    (m) => equationSolution(integer(m[1]), "+", integer(m[2]), integer(m[1]) + integer(m[2]))
  ),
  rule(
    "first-second-groups",
    /^a picture shows (\d+) [a-z-]+ in the first group and (\d+) in the second group\. write a complete addition equation for the picture\.$/i,
    (m) => equationSolution(integer(m[1]), "+", integer(m[2]), integer(m[1]) + integer(m[2]))
  ),
  rule(
    "correct-picture-label",
    /^a picture shows (\d+) [a-z-]+ beside (\d+) more [a-z-]+\. a label says the total is (\d+)\. write the complete equation that corrects the label\.$/i,
    (m) => equationSolution(integer(m[1]), "+", integer(m[2]), integer(m[1]) + integer(m[2]))
  ),
  rule(
    "blue-group-first",
    /^picture story: (\d+) red [a-z-]+ and (\d+) blue [a-z-]+ make one collection\. which complete equation starts with the blue group and still matches the picture\?$/i,
    (m) => equationSolution(integer(m[2]), "+", integer(m[1]), integer(m[1]) + integer(m[2]))
  ),
  rule(
    "part-part-whole",
    /^a picture shows a whole of (\d+) [a-z-]+\. one part has (\d+) [a-z-]+ and the other part has (\d+)\. write a complete addition equation that names both parts and the whole\.$/i,
    (m) => {
      const whole = integer(m[1]);
      const a = integer(m[2]);
      const b = integer(m[3]);
      visibleInvariant(a + b === whole, `${a} + ${b} != visible whole ${whole}`);
      return equationSolution(a, "+", b, whole);
    }
  ),
  rule(
    "joined-cube-train",
    /^a cube train has (\d+) red cubes?\. snap on a section of (\d+) blue cubes?\. how many cubes are in the joined train\?$/i,
    (m) => numberSolution(integer(m[1]) + integer(m[2]), "cube")
  ),
  rule(
    "missing-original-cube-section",
    /^after (\d+) blue cubes? are snapped onto a red cube train, the train has (\d+) cubes?\. how many red cubes were in the train before the join\?$/i,
    (m) => numberSolution(integer(m[2]) - integer(m[1]))
  ),
  rule(
    "cube-sections-equation",
    /^a cube train shows a section of (\d+) cubes? snapped to a section of (\d+) cubes?\. write the complete addition equation represented by the train\.$/i,
    (m) => equationSolution(integer(m[1]), "+", integer(m[2]), integer(m[1]) + integer(m[2]))
  ),
  rule(
    "two-cube-trains",
    /^a (\d+)-cube train and a (\d+)-cube train are snapped together end to end\. which complete equation represents this action\?$/i,
    (m) => equationSolution(integer(m[1]), "+", integer(m[2]), integer(m[1]) + integer(m[2]))
  ),
  rule(
    "missing-added-cube-section",
    /^a cube train begins with (\d+) cubes? and ends with (\d+) cubes? after another section is snapped on\. how many cubes were in the section that was added\?$/i,
    (m) => numberSolution(integer(m[2]) - integer(m[1]), "cube")
  ),
  rule(
    "counter-model-equation",
    /^counter model: (\d+) red counters? are joined to (\d+) blue counters?, making (\d+) counters?\. which complete equation matches the model\?$/i,
    (m) => {
      const a = integer(m[1]);
      const b = integer(m[2]);
      const whole = integer(m[3]);
      visibleInvariant(a + b === whole, `${a} + ${b} != visible whole ${whole}`);
      return equationSolution(a, "+", b, whole);
    }
  ),
  rule(
    "counter-model-missing-total",
    /^a counter model has (\d+) red counters? joined to (\d+) blue counters?\. complete the matching equation: (\d+) \+ (\d+) = __\.$/i,
    (m) => {
      visibleInvariant(m[1] === m[3] && m[2] === m[4], "model groups disagree with equation addends");
      return numberSolution(integer(m[1]) + integer(m[2]), null, ["missing total"]);
    }
  ),
  rule(
    "correct-counter-label",
    /^a model shows (\d+) counters? joined to (\d+) more, but its label says (\d+) \+ (\d+) = (\d+)\. write the complete equation that correctly labels the model\.$/i,
    (m) => {
      visibleInvariant(m[1] === m[3] && m[2] === m[4], "model groups disagree with label addends");
      return equationSolution(integer(m[1]), "+", integer(m[2]), integer(m[1]) + integer(m[2]));
    }
  ),
  rule(
    "equation-to-model-description",
    /^the equation is (\d+) \+ (\d+) = (\d+)\. which counter model description matches every number and the join action\?$/i,
    (m) => {
      const a = integer(m[1]);
      const b = integer(m[2]);
      const whole = integer(m[3]);
      visibleInvariant(a + b === whole, `${a} + ${b} != ${whole}`);
      return semanticSolution("counter-model-role-mapping", [
        "first addend",
        "red group",
        "second",
        "blue group",
        `${whole}`,
        "joined whole"
      ]);
    }
  ),
  rule(
    "missing-joined-group",
    /^the equation (\d+) \+ (\d+) = (\d+) matches a counter model\. the model already shows the first group of (\d+) counters?\. how many counters must the joined group contain\?$/i,
    (m) => {
      const a = integer(m[1]);
      const b = integer(m[2]);
      const whole = integer(m[3]);
      visibleInvariant(a + b === whole && a === integer(m[4]), "equation and shown first group disagree");
      return numberSolution(b, "counter", ["second addend", "joined group"]);
    }
  ),
  rule(
    "join-story",
    /^a story says (\d+) [a-z-]+ are on a tray and (\d+) more [a-z-]+ are added\. which complete equation matches the join story\?$/i,
    (m) => equationSolution(integer(m[1]), "+", integer(m[2]), integer(m[1]) + integer(m[2]))
  ),
  rule(
    "number-bond",
    /^a number bond has parts (\d+) and (\d+) and whole (\d+)\. write the complete addition equation that matches the number bond\.$/i,
    (m) => {
      const a = integer(m[1]);
      const b = integer(m[2]);
      const whole = integer(m[3]);
      visibleInvariant(a + b === whole, `${a} + ${b} != ${whole}`);
      return equationSolution(a, "+", b, whole);
    }
  ),
  rule(
    "correct-join-operation",
    /^a join story has (\d+) objects? and then (\d+) more arrives?\. a student writes (\d+) - (\d+) = (\d+)\. write the complete equation that uses the correct operation and result\.$/i,
    (m) => equationSolution(integer(m[1]), "+", integer(m[2]), integer(m[1]) + integer(m[2]), ["addition"])
  ),
  rule(
    "braced-groups",
    /^a counter model shows a group of (\d+) beside a group of (\d+), with a brace around all (\d+) counters?\. which complete equation matches the model\?$/i,
    (m) => {
      const a = integer(m[1]);
      const b = integer(m[2]);
      const whole = integer(m[3]);
      visibleInvariant(a + b === whole, `${a} + ${b} != ${whole}`);
      return equationSolution(a, "+", b, whole);
    }
  ),
  rule(
    "number-path",
    /^on a number path, start at (\d+) and make (\d+) forward steps? to land on (\d+)\. write the complete addition equation that matches the path\.$/i,
    (m) => {
      const a = integer(m[1]);
      const b = integer(m[2]);
      const end = integer(m[3]);
      visibleInvariant(a + b === end, `${a} + ${b} != ${end}`);
      return equationSolution(a, "+", b, end, ["addition"]);
    }
  )
];

const SUBTRACTION_RULES = [
  rule(
    "moved-away",
    /^there are (\d+) [a-z-]+\. (\d+) (?:is|are) moved away\. how many [a-z-]+ are left\?$/i,
    (m) => equationSolution(integer(m[1]), "-", integer(m[2]), integer(m[1]) - integer(m[2]))
  ),
  rule(
    "crossed-picture",
    /^picture story: (\d+) [a-z-]+ are shown and (\d+) are crossed out\. write the complete subtraction equation that tells how many remain\.$/i,
    (m) => equationSolution(integer(m[1]), "-", integer(m[2]), integer(m[1]) - integer(m[2]))
  ),
  rule(
    "before-after",
    /^a before-and-after picture shows (\d+) [a-z-]+ before (\d+) [a-z-]+ are moved away and (\d+) [a-z-]+ afterward\. write the complete equation for the change\.$/i,
    (m) => {
      visibleInvariant(integer(m[1]) - integer(m[2]) === integer(m[3]), "before/removed/after values disagree");
      return equationSolution(integer(m[1]), "-", integer(m[2]), integer(m[3]));
    }
  ),
  rule(
    "correct-caption",
    /^a picture shows (\d+) [a-z-]+ with (\d+) crossed out, but a caption says (\d+) - (\d+) = (\d+)\. write the complete equation that corrects the caption\.$/i,
    (m) => {
      visibleInvariant(m[1] === m[3] && m[2] === m[4], "picture and caption operands disagree");
      return equationSolution(integer(m[1]), "-", integer(m[2]), integer(m[1]) - integer(m[2]));
    }
  ),
  rule(
    "choose-direct-remainder",
    /^a picture starts with (\d+) [a-z-]+ and shows (\d+) moved away\. of (\d+) - (\d+) = (\d+) and (\d+) - (\d+) = (\d+), write the complete equation that directly answers how many remain\.$/i,
    (m) => equationSolution(integer(m[1]), "-", integer(m[2]), integer(m[1]) - integer(m[2]))
  ),
  rule(
    "reconstruct-row",
    /^a picture hides the starting row\. it shows (\d+) [a-z-]+ crossed out and (\d+) [a-z-]+ still visible\. write the complete subtraction equation that reconstructs the original row\.$/i,
    (m) => equationSolution(integer(m[1]) + integer(m[2]), "-", integer(m[1]), integer(m[2]))
  ),
  rule(
    "unsnap-remainder",
    /^a cube train has (\d+) cubes?\. unsnap a section of (\d+) cubes? from one end\. how many cubes remain connected\?$/i,
    (m) => numberSolution(integer(m[1]) - integer(m[2]), "cube")
  ),
  rule(
    "missing-unsnapped-section",
    /^a (\d+)-cube train is split into a connected section of (\d+) cubes? and a section that was unsnapped\. how many cubes were in the unsnapped section\?$/i,
    (m) => numberSolution(integer(m[1]) - integer(m[2]))
  ),
  rule(
    "cube-subtraction-equation",
    /^a cube train begins with (\d+) cubes?\. a section of (\d+) cubes? is unsnapped, leaving (\d+) connected\. write the complete subtraction equation represented by the train\.$/i,
    (m) => equationSolution(integer(m[1]), "-", integer(m[2]), integer(m[3]))
  ),
  rule(
    "reconstruct-train",
    /^after a section of (\d+) cubes? is unsnapped, a cube train has (\d+) cubes? still connected\. how many cubes were in the train before it was split\?$/i,
    (m) => numberSolution(integer(m[1]) + integer(m[2]), "cube")
  ),
  rule(
    "correct-student-remainder",
    /^a student unsnaps (\d+) cubes? from a (\d+)-cube train and says (\d+) cubes? remain\. what number should replace (\d+)\?$/i,
    (m) => {
      visibleInvariant(m[3] === m[4], "stated wrong value and replacement target disagree");
      return numberSolution(integer(m[2]) - integer(m[1]), "cube");
    }
  ),
  rule(
    "counter-model-equation",
    /^counter model: (\d+) counters? are shown, (\d+) are crossed out, and (\d+) remain\. write the complete subtraction equation that matches the model\.$/i,
    (m) => equationSolution(integer(m[1]), "-", integer(m[2]), integer(m[3]))
  ),
  rule(
    "model-missing-remainder",
    /^a model for (\d+) - (\d+) = __ starts with (\d+) counters? and crosses out (\d+)\. how many counters should the uncrossed part show\?$/i,
    (m) => numberSolution(integer(m[1]) - integer(m[2]), "counter", ["remainder"])
  ),
  rule(
    "correct-counter-label",
    /^a counter model shows (\d+) counters? with (\d+) crossed out, but its label says (\d+) - (\d+) = (\d+)\. write the complete equation that correctly labels the model\.$/i,
    (m) => equationSolution(integer(m[1]), "-", integer(m[2]), integer(m[1]) - integer(m[2]))
  ),
  rule(
    "missing-crossed-out",
    /^a take-away model starts with (\d+) [a-z-]+ and leaves (\d+) uncrossed\. the matching equation starts with (\d+) and has a remainder of (\d+)\. how many [a-z-]+ should be crossed out\?$/i,
    (m) => numberSolution(integer(m[1]) - integer(m[2]))
  ),
  rule(
    "reconstruct-full-model",
    /^a model has (\d+) [a-z-]+ crossed out and (\d+) [a-z-]+ uncrossed\. its matching equation subtracts (\d+) and has a remainder of (\d+)\. how many [a-z-]+ must the full starting model contain\?$/i,
    (m) => numberSolution(integer(m[1]) + integer(m[2]))
  ),
  rule(
    "cup-and-mat",
    /^there are (\d+) counters altogether\. one counter is in a cup, and the rest are on a mat\. how many counters are on the mat\?$/i,
    (m) => numberSolution(integer(m[1]) - 1)
  ),
  rule(
    "tile-parts",
    /^([a-z]+|\d+) tiles make two parts of a design\. one part has (\d+) tiles?\. how many tiles are in the other part\?$/i,
    (m) => numberSolution(wordNumber(m[1]) - integer(m[2]))
  ),
  rule(
    "button-parts",
    /^([a-z]+|\d+) buttons are sorted into two parts\. ([a-z]+|\d+) are large\. how many are small\?$/i,
    (m) => numberSolution(wordNumber(m[1]) - wordNumber(m[2]))
  ),
  rule(
    "cube-towers",
    /^([a-z]+|\d+) cubes are used in two towers\. one tower has (\d+) cubes?\. how many cubes are in the other tower\?$/i,
    (m) => numberSolution(wordNumber(m[1]) - integer(m[2]))
  )
];

const SHAPE_BY_SIDES = Object.freeze({ 3: "triangle", 4: "quadrilateral", 5: "pentagon", 6: "hexagon" });
const PART_NAME = Object.freeze({ 2: "half", 3: "third", 4: "fourth" });

const SOLVERS = Object.freeze({
  "computed-addition": (p) => onePattern(p, ADDITION_RULES),
  "computed-addition-equation-match": (p) =>
    onePattern(p, [
      rule("join-equation", /^which equation matches this join story: (\d+) small cubes? and (\d+) large cubes? are put together\?$/i, (m) => equationSolution(integer(m[1]), "+", integer(m[2]), integer(m[1]) + integer(m[2]), ["addition"]))
    ]),
  "computed-angle-subtraction": (p) =>
    onePattern(p, [
      rule("right-angle-part", /^two angles make a right angle\. one angle is (\d+) degrees\. what is the other angle\?$/i, (m) => {
        const angle = integer(m[1]);
        const result = 90 - angle;
        return numberSolution(result, "degree", ["right angle", "90", `90 - ${angle} = ${result}`]);
      })
    ]),
  "computed-area": (p) =>
    onePattern(p, [
      rule("rectangle-area", /^a rectangle is (\d+) units long and (\d+) units wide\. what is its area\?$/i, (m) => {
        const length = integer(m[1]);
        const width = integer(m[2]);
        return numberSolution(length * width, "square unit", ["area", "length", "width", `${length} x ${width} = ${length * width}`]);
      })
    ]),
  "computed-comparison": (p) =>
    onePattern(p, [
      rule("cardinality-comparison", /^one card has (\d+) dots\. another card has (\d+) dots\. how many dots are on the card that has more\?$/i, (m) => {
        const a = integer(m[1]);
        const b = integer(m[2]);
        visibleInvariant(a !== b, "cards are tied");
        const greater = Math.max(a, b);
        const lesser = Math.min(a, b);
        return numberSolution(greater, "dot", [`${greater} is greater than ${lesser}`, "card with more"]);
      })
    ]),
  "computed-coordinate": (p) =>
    onePattern(p, [
      rule("right-up-coordinate", /^a point moves (\d+) units? right from the origin and (\d+) units? up\. what ordered pair names the point\?$/i, (m) => textSolution(`(${integer(m[1])}, ${integer(m[2])})`, ["x-coordinate", "y-coordinate"]))
    ]),
  "computed-counting": (p) =>
    onePattern(p, [
      rule("collection-count", /^count the collection: (\d+) [a-z-]+ are on a mat\. how many objects are on the mat\?$/i, (m) => numberSolution(integer(m[1]), "object", ["count", "collection"]))
    ]),
  "computed-data-comparison": (p) =>
    onePattern(p, [
      rule("fruit-difference", /^a picture graph shows (\d+) apples and (\d+) oranges\. which fruit has more, and by how many\?$/i, (m) => {
        const apples = integer(m[1]);
        const oranges = integer(m[2]);
        visibleInvariant(apples !== oranges, "fruit counts are tied");
        const difference = Math.abs(apples - oranges);
        const fruit = apples > oranges ? "apple" : "orange";
        return textSolution(`${difference} more ${plural(fruit, difference)}`, [`${Math.max(apples, oranges)} - ${Math.min(apples, oranges)} = ${difference}`]);
      })
    ]),
  "computed-decimal-place-value": (p) =>
    onePattern(p, [
      rule("ones-tenths", /^which decimal is (\d+) ones and (\d+) tenths\?$/i, (m) => {
        const ones = integer(m[1]);
        const tenths = integer(m[2]);
        return textSolution(`${ones}.${tenths}`, [`${ones} ones`, `${tenths} tenths`]);
      })
    ]),
  "computed-expression": (p) =>
    onePattern(p, [
      rule("multiply-sum", /^evaluate (\d+) x \((\d+) \+ (\d+)\)\.$/i, (m) => {
        const factor = integer(m[1]);
        const a = integer(m[2]);
        const b = integer(m[3]);
        const inner = a + b;
        return numberSolution(factor * inner, null, ["parentheses", `${a} + ${b} = ${inner}`, `${factor} x ${inner} = ${factor * inner}`]);
      })
    ]),
  "computed-factor-check": (p) =>
    onePattern(p, [
      rule("factor-check", /^is (\d+) a factor of (\d+)\?$/i, (m) => {
        const factor = integer(m[1]);
        const value = integer(m[2]);
        visibleInvariant(factor !== 0, "zero divisor");
        return value % factor === 0
          ? semanticSolution("is-factor", [`${value}`, "divided by", `${factor}`, "no remainder"])
          : semanticSolution("is-not-factor", [`${value}`, "cannot be divided by", `${factor}`, "evenly"]);
      })
    ]),
  "computed-fraction-addition": (p) =>
    onePattern(p, [
      rule("like-denominator-addition", /^add (\d+)\/(\d+) \+ (\d+)\/(\d+)\.$/i, (m) => {
        visibleInvariant(m[2] === m[4], "fraction denominators differ");
        const a = integer(m[1]);
        const b = integer(m[3]);
        return fractionSolution(a + b, integer(m[2]), ["denominators are the same", "add numerators", `${a} + ${b} = ${a + b}`]);
      })
    ]),
  "computed-fraction-comparison": (p) =>
    onePattern(p, [
      rule("fraction-comparison", /^which fraction is greater: (\d+)\/(\d+) or (\d+)\/(\d+)\?$/i, (m) => {
        const a = integer(m[1]);
        const b = integer(m[2]);
        const c = integer(m[3]);
        const d = integer(m[4]);
        visibleInvariant(b === d, "current comparison contract requires like denominators");
        visibleInvariant(a !== c, "fractions are tied");
        return semanticSolution(a > c ? `${a}/${b}` : `${c}/${d}`, ["same denominator", "larger numerator", "greater"]);
      })
    ]),
  "computed-fraction-equivalence": (p) =>
    onePattern(p, [
      rule("split-fraction-parts", /^name a fraction equivalent to (\d+)\/(\d+) by splitting each part into (\d+) equal pieces\.$/i, (m) => {
        const numerator = integer(m[1]);
        const denominator = integer(m[2]);
        const pieces = integer(m[3]);
        return fractionSolution(numerator * pieces, denominator * pieces, ["split each part", `${numerator} x ${pieces} = ${numerator * pieces}`, `${denominator} x ${pieces} = ${denominator * pieces}`]);
      })
    ]),
  "computed-fraction-model": (p) =>
    onePattern(p, [
      rule("shaded-fraction", /^a rectangle is split into (\d+) equal parts\. (\d+) parts? (?:is|are) shaded\. what fraction is shaded\?$/i, (m) => fractionSolution(integer(m[2]), integer(m[1]), ["denominator", "numerator", "shaded"]))
    ]),
  "computed-fraction-number-line": (p) =>
    onePattern(p, [
      rule("number-line-fraction", /^a number line from 0 to 1 is split into (\d+) equal jumps\. a point is at jump (\d+)\. what fraction names the point\?$/i, (m) => fractionSolution(integer(m[2]), integer(m[1]), ["equal jumps", "from 0 to 1"]))
    ]),
  "computed-k-md-attribute-compare": (p) =>
    onePattern(p, [
      rule("longer-strip", /^one paper strip is (\d+) cubes? long\. another paper strip is (\d+) cubes? long\. how many cubes long is the longer strip\?$/i, (m) => {
        const a = integer(m[1]);
        const b = integer(m[2]);
        return numberSolution(Math.max(a, b), "cube", [`${Math.max(a, b)} cubes is longer than ${Math.min(a, b)} cubes`, "longer strip"]);
      })
    ]),
  "computed-k-md-attribute-order": (p) =>
    onePattern(p, [
      rule("object-length-order", /^a crayon is shorter than a pencil\. the pencil is shorter than a marker\. which object is the longest\?$/i, () => textSolution("marker", ["marker is longer than the pencil", "pencil is longer than the crayon"]))
    ]),
  "computed-k-md-category-compare": (p) =>
    onePattern(p, [
      rule("shape-category", /^a class chart has (\d+) circles and (\d+) squares\. which category has more\?$/i, (m) => {
        const circles = integer(m[1]);
        const squares = integer(m[2]);
        visibleInvariant(circles !== squares, "categories are tied");
        return textSolution(circles > squares ? "circles" : "squares", [`${Math.max(circles, squares)} is more than ${Math.min(circles, squares)}`, "have more"]);
      })
    ]),
  "computed-k-md-category-count": (p) =>
    onePattern(p, [
      rule("square-buttons", /^a tray has (\d+) circle buttons and (\d+) square buttons\. how many buttons are square buttons\?$/i, (m) => numberSolution(integer(m[2]), null, ["square buttons"]))
    ]),
  "computed-measurement-addition": (p) =>
    onePattern(p, [
      rule("ribbon-total", /^a ribbon is (\d+) cm long\. another ribbon is (\d+) cm long\. what is the total length\?$/i, (m) => {
        const a = integer(m[1]);
        const b = integer(m[2]);
        return numberSolution(a + b, "cm", ["add the lengths", `${a} + ${b} = ${a + b}`]);
      })
    ]),
  "computed-measurement-subtraction": (p) =>
    onePattern(p, [
      rule("ribbon-shorter", /^a ribbon is (\d+) cm long\. it is cut (\d+) cm shorter\. how long is it now\?$/i, (m) => {
        const whole = integer(m[1]);
        const cut = integer(m[2]);
        return numberSolution(whole - cut, "cm", ["subtract", "cut off", `${whole} - ${cut} = ${whole - cut}`]);
      })
    ]),
  "computed-money-value": (p) =>
    onePattern(p, [
      rule("dimes-pennies", /^a coin cup has (\d+) dimes? and (\d+) pennies\. how many cents is that\?$/i, (m) => {
        const dimes = integer(m[1]);
        const pennies = integer(m[2]);
        return numberSolution(dimes * 10 + pennies, "cent", [`${dimes} ${plural("dime", dimes)}`, `${dimes * 10} cents`, `${pennies} pennies`]);
      })
    ]),
  "computed-multiplication": (p) =>
    onePattern(p, [
      rule("equal-bags", /^(\d+) equal bags each hold (\d+) [a-z-]+\. how many [a-z-]+ are there in all\?$/i, (m) => {
        const groups = integer(m[1]);
        const each = integer(m[2]);
        return numberSolution(groups * each, null, ["equal groups", `${groups} x ${each} = ${groups * each}`]);
      })
    ]),
  "computed-perimeter": (p) =>
    onePattern(p, [
      rule("rectangle-perimeter", /^a rectangle is (\d+) units long and (\d+) units wide\. what is its perimeter\?$/i, (m) => {
        const length = integer(m[1]);
        const width = integer(m[2]);
        const result = 2 * (length + width);
        return numberSolution(result, "unit", ["perimeter", "twice", "length", "width", `2 x (${length} + ${width}) = ${result}`]);
      })
    ]),
  "computed-place-value": (p) =>
    onePattern(p, [
      rule("tens-ones", /^what number has (\d+) tens and (\d+) ones?\?$/i, (m) => {
        const tens = integer(m[1]);
        const ones = integer(m[2]);
        return numberSolution(tens * 10 + ones, null, [`${tens} tens`, `${ones} one`]);
      }),
      rule("hundreds-tens-ones", /^what number has (\d+) hundreds?, (\d+) tens, and (\d+) ones?\?$/i, (m) => {
        const hundreds = integer(m[1]);
        const tens = integer(m[2]);
        const ones = integer(m[3]);
        return numberSolution(hundreds * 100 + tens * 10 + ones, null, [`${hundreds} hundred`, `${tens} tens`, `${ones} one`]);
      })
    ]),
  "computed-related-addition-check": (p) =>
    onePattern(p, [
      rule("related-addition", /^([a-z]+|\d+) stickers are split between two pages\. ([a-z]+|\d+) are on the first page, and the rest are on the second\. write an addition equation that checks the missing part\.$/i, (m) => {
        const whole = wordNumber(m[1]);
        const first = wordNumber(m[2]);
        return equationSolution(first, "+", whole - first, whole, ["missing part", "check the whole"]);
      })
    ]),
  "computed-shape-identification": (p) =>
    onePattern(p, [
      rule("triangle", /^a flat shape has 3 straight sides and 3 corners\. what shape is it\?$/i, () => textSolution("triangle", ["3 straight sides", "3 corners"])),
      rule("square", /^a flat shape has 4 sides that are all the same length and 4 square corners\. what shape is it\?$/i, () => textSolution("square", ["same length", "4 square corners"])),
      rule("rectangle", /^a flat shape has 4 square corners with two long sides and two short sides\. what shape is it\?$/i, () => textSolution("rectangle", ["4 square corners", "two long sides", "two short sides"])),
      rule("circle", /^a flat shape is perfectly round with no straight sides and no corners\. what shape is it\?$/i, () => textSolution("circle", ["perfectly round", "no straight sides", "no corners"])),
      rule("flat-side-count", /^a flat shape has (\d+) straight sides\. what shape is it\?$/i, (m) => textSolution(SHAPE_BY_SIDES[integer(m[1])] ?? fail("UNPARSED_PROMPT", `unsupported side count ${m[1]}`), [`${m[1]} straight sides`])),
      rule("equal-parts", /^a whole shape is cut into (\d+) equal parts\. what is each equal part called\?$/i, (m) => textSolution(PART_NAME[integer(m[1])] ?? fail("UNPARSED_PROMPT", `unsupported part count ${m[1]}`), [`${m[1]} equal parts`])),
      rule("polygon", /^a polygon has exactly (\d+) straight sides\. what is the name of this kind of polygon\?$/i, (m) => textSolution(SHAPE_BY_SIDES[integer(m[1])] ?? fail("UNPARSED_PROMPT", `unsupported polygon ${m[1]}`), [`${m[1]} straight sides`])),
      rule("parallel", /^two straight lines in a plane never cross and stay the same distance apart\. what are these lines called\?$/i, () => textSolution("parallel", ["definition"])),
      rule("perpendicular", /^two straight lines cross to make a square corner \(a right angle\)\. what are these lines called\?$/i, () => textSolution("perpendicular", ["definition"])),
      rule("right-angle", /^an angle forms a square corner and measures exactly 90 degrees\. what is this angle called\?$/i, () => textSolution("right angle", ["definition"])),
      rule("acute", /^an angle is smaller than a right angle \(less than 90 degrees\)\. what is this angle called\?$/i, () => textSolution("acute angle", ["definition"])),
      rule("obtuse", /^an angle is larger than a right angle but smaller than a straight angle \(between 90 and 180 degrees\)\. what is this angle called\?$/i, () => textSolution("obtuse angle", ["definition"])),
      rule("origin", /^on a coordinate plane, what is the name of the point \(0, 0\) where the x-axis and y-axis meet\?$/i, () => textSolution("origin", ["(0, 0)", "axes meet"]))
    ]),
  "computed-shape-property": (p) =>
    onePattern(p, [
      rule("shape-sides", /^in (?:a|an) [a-z -]+, how many sides does a (square|triangle|rectangle) have\?$/i, (m) => {
        const shape = m[1].toLowerCase();
        return numberSolution(shape === "triangle" ? 3 : 4, "side", [shape]);
      })
    ]),
  "computed-subtraction": (p) => onePattern(p, SUBTRACTION_RULES),
  "computed-subtraction-equation-match": (p) =>
    onePattern(p, [
      rule("take-away-equation", /^which equation matches this take-away story: (\d+) counters are on a ten-frame and (\d+) are covered\?$/i, (m) => equationSolution(integer(m[1]), "-", integer(m[2]), integer(m[1]) - integer(m[2]), ["take-away", "removes"]))
    ]),
  "computed-teen-number": (p) =>
    onePattern(p, [
      rule("ten-frame-more", /^a ten-frame shows (\d+) counters and (\d+) more counters\. what number is shown\?$/i, (m) => {
        const ten = integer(m[1]);
        const more = integer(m[2]);
        return numberSolution(ten + more, null, [`${ten} and ${more} more`, "make"]);
      }),
      rule("teen-blank", /^fill in the number: (\d+) \+ (\d+) = __\.$/i, (m) => {
        const ten = integer(m[1]);
        const more = integer(m[2]);
        return numberSolution(ten + more, null, [`${more} more ones`, "get"]);
      })
    ]),
  "computed-teen-number-missing-part": (p) =>
    onePattern(p, [
      rule("missing-ones", /^(\d+) is (\d+) and how many more ones\?$/i, (m) => numberSolution(integer(m[1]) - integer(m[2]), null, ["more one"]))
    ]),
  "computed-teen-number-model": (p) =>
    onePattern(p, [
      rule("teen-model", /^which model shows (\d+)\?$/i, (m) => {
        const whole = integer(m[1]);
        return textSolution(`1 ten and ${whole - 10} ${plural("one", whole - 10)}`, [`${whole} is 10 plus ${whole - 10}`]);
      })
    ]),
  "computed-time-addition": (p) =>
    onePattern(p, [
      rule("hours-later", /^a clock shows (\d{1,2}):(\d{2})\. what time will it be (\d+) hours? later\?$/i, (m) => {
        const hour = integer(m[1]);
        const minute = integer(m[2]);
        const delta = integer(m[3]);
        const resultHour = ((hour - 1 + delta) % 12) + 1;
        return textSolution(`${resultHour}:${String(minute).padStart(2, "0")}`, [`${delta} ${plural("hour", delta)} after`, `${hour}:${String(minute).padStart(2, "0")}`]);
      })
    ]),
  "computed-volume": (p) =>
    onePattern(p, [
      rule("prism-volume", /^a rectangular prism is (\d+) units by (\d+) units by (\d+) units\. what is its volume\?$/i, (m) => {
        const length = integer(m[1]);
        const width = integer(m[2]);
        const height = integer(m[3]);
        const result = length * width * height;
        return numberSolution(result, "cubic unit", ["volume", "length", "width", "height", `${length} x ${width} x ${height} = ${result}`]);
      })
    ])
});

const NUMBER_TOKEN = String.raw`\d+(?:\.\d+)?`;
const PARENTHESIZED = String.raw`\(\s*${NUMBER_TOKEN}(?:\s*[+\-x×*/]\s*${NUMBER_TOKEN})+\s*\)`;
const ATOM = String.raw`(?:${NUMBER_TOKEN}|${PARENTHESIZED})`;
const EXPRESSION = String.raw`${ATOM}(?:\s*[+\-x×*/]\s*${ATOM})*`;
const EQUATION_REGEX = new RegExp(String.raw`(${EXPRESSION})\s*=\s*(${EXPRESSION})`, "gi");

function evaluateArithmetic(raw) {
  const source = normalize(raw).replace(/\s+/g, "");
  const tokens = source.match(/\d+(?:\.\d+)?|[()+\-*/x]/g) ?? [];
  if (tokens.join("") !== source) fail("UNREADABLE_EXPLANATION_EQUATION", `unsupported arithmetic expression: ${raw}`);
  let index = 0;

  function factor() {
    const token = tokens[index];
    if (token === "-") {
      index += 1;
      return -factor();
    }
    if (token === "(") {
      index += 1;
      const value = expression();
      if (tokens[index] !== ")") fail("UNREADABLE_EXPLANATION_EQUATION", `unclosed parenthesis: ${raw}`);
      index += 1;
      return value;
    }
    if (!/^\d/.test(token ?? "")) fail("UNREADABLE_EXPLANATION_EQUATION", `expected number: ${raw}`);
    index += 1;
    return Number(token);
  }

  function term() {
    let value = factor();
    while (["x", "*", "/"].includes(tokens[index])) {
      const operator = tokens[index++];
      const right = factor();
      if (operator === "/" && right === 0) fail("INCORRECT_EXPLANATION_EQUATION", `division by zero: ${raw}`);
      value = operator === "/" ? value / right : value * right;
    }
    return value;
  }

  function expression() {
    let value = term();
    while (["+", "-"].includes(tokens[index])) {
      const operator = tokens[index++];
      const right = term();
      value = operator === "+" ? value + right : value - right;
    }
    return value;
  }

  const value = expression();
  if (index !== tokens.length) fail("UNREADABLE_EXPLANATION_EQUATION", `trailing arithmetic tokens: ${raw}`);
  return value;
}

function nearlyEqual(a, b) {
  return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
}

function auditEquations(explanation) {
  const equations = [];
  for (const match of explanation.matchAll(EQUATION_REGEX)) {
    const left = evaluateArithmetic(match[1]);
    const right = evaluateArithmetic(match[2]);
    if (!nearlyEqual(left, right)) {
      fail("INCORRECT_EXPLANATION_EQUATION", `${match[1].trim()} = ${match[2].trim()} is false (${left} != ${right})`);
    }
    equations.push({ raw: match[0], left, right });
  }
  return equations;
}

function auditNumericComparisons(explanation) {
  const regex = /(?<![\d./])(\d+(?:\.\d+)?)(?!\d|\/|\.\d)(?:\s+[a-z]+)?\s+is\s+(greater|more|longer|less|shorter)\s+than\s+(\d+(?:\.\d+)?)(?!\d|\/|\.\d)/gi;
  for (const match of explanation.matchAll(regex)) {
    const left = Number(match[1]);
    const right = Number(match[3]);
    const relation = match[2].toLowerCase();
    const valid = ["greater", "more", "longer"].includes(relation) ? left > right : left < right;
    if (!valid) fail("INCORRECT_EXPLANATION_COMPARISON", `${match[0]} is false`);
  }
}

function parseFractionLiteral(numeratorRaw, denominatorRaw) {
  const numerator = Number(numeratorRaw);
  const denominator = Number(denominatorRaw);
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || denominator === 0) {
    fail(
      "UNREADABLE_EXPLANATION_COMPARISON",
      `invalid fraction ${numeratorRaw}/${denominatorRaw}`
    );
  }
  return { numerator, denominator, value: numerator / denominator };
}

function sameFractionValue(left, right) {
  return left.numerator * right.denominator === right.numerator * left.denominator;
}

function auditFractionComparisons(explanation, expectedFractionRaw) {
  const relationRegex =
    /(\d+)\s*\/\s*(\d+)\s+is\s+(greater|larger|less|smaller)\s+than\s+(\d+)\s*\/\s*(\d+)/gi;
  for (const match of explanation.matchAll(relationRegex)) {
    const left = parseFractionLiteral(match[1], match[2]);
    const right = parseFractionLiteral(match[4], match[5]);
    const relation = match[3].toLowerCase();
    const valid = ["greater", "larger"].includes(relation)
      ? left.value > right.value
      : left.value < right.value;
    if (!valid) {
      fail("INCORRECT_EXPLANATION_COMPARISON", `${match[0]} is false`);
    }
  }

  const expectedMatch = /^(\d+)\s*\/\s*(\d+)$/.exec(expectedFractionRaw);
  if (!expectedMatch) return;
  const expected = parseFractionLiteral(expectedMatch[1], expectedMatch[2]);
  const winnerRegexes = [
    /\b(\d+)\s*\/\s*(\d+)\s+is\s+(?:the\s+)?(?:greater|larger)(?:\s+fraction)?\b(?!\s+than)/gi,
    /\b(?:the\s+)?(?:greater|larger)\s+fraction\s+is\s+(\d+)\s*\/\s*(\d+)\b/gi
  ];
  for (const winnerRegex of winnerRegexes) {
    for (const match of explanation.matchAll(winnerRegex)) {
      const claimed = parseFractionLiteral(match[1], match[2]);
      if (!sameFractionValue(claimed, expected)) {
        fail(
          "INCORRECT_EXPLANATION_COMPARISON",
          `explicit greater-fraction conclusion ${match[1]}/${match[2]} conflicts with independently solved ${expectedFractionRaw}`
        );
      }
    }
  }
}

function auditSemanticExpectedClaim(solution, explanation) {
  if (/^\d+\s*\/\s*\d+$/.test(solution.value)) {
    auditFractionComparisons(explanation, solution.value);
  }
}

function containsRequired(explanation, required) {
  for (const phrase of required ?? []) {
    const normalizedPhrase = normalize(phrase);
    const present = /^\d+(?:\.\d+)?$/.test(normalizedPhrase)
      ? containsNumber(explanation, Number(normalizedPhrase))
      : explanation.includes(normalizedPhrase);
    if (!present) {
      fail("MISSING_KEY_RELATION", `explanation does not contain required relation/value ${JSON.stringify(phrase)}`);
    }
  }
}

function containsNumber(explanation, value) {
  const pattern = new RegExp(
    String.raw`(^|[^\d.])${escapeRegex(String(value))}(?!\d|\.\d)`
  );
  return pattern.test(explanation);
}

function containsUnitClaim(explanation, value, unit) {
  const unitPattern = unit === "cm" ? "cm" : `${escapeRegex(unit)}s?`;
  const separator =
    unit === "cube"
      ? "(?:\\s+|-)"
      : unit === "counter"
        ? "\\s+(?:[a-z-]+\\s+){0,2}"
        : "\\s+";
  return new RegExp(
    String.raw`(^|[^\d.])${escapeRegex(String(value))}(?!\d|\.\d)${separator}${unitPattern}\b`
  ).test(explanation);
}

function auditExpectedClaim(solution, explanation, equations) {
  containsRequired(explanation, solution.required);

  if (solution.kind === "semantic") {
    auditSemanticExpectedClaim(solution, explanation);
    return;
  }
  if (solution.kind === "equation") {
    if (!compactMath(explanation).includes(compactMath(solution.value))) {
      fail("MISSING_INDEPENDENT_SOLUTION_CLAIM", `expected equation ${solution.value} is absent`);
    }
    return;
  }
  if (solution.kind === "fraction") {
    if (!explanation.includes(normalize(solution.value))) {
      fail("MISSING_INDEPENDENT_SOLUTION_CLAIM", `expected fraction ${solution.value} is absent`);
    }
    return;
  }
  if (solution.kind === "text") {
    if (!explanation.includes(solution.value)) {
      fail("MISSING_INDEPENDENT_SOLUTION_CLAIM", `expected claim ${JSON.stringify(solution.value)} is absent`);
    }
    return;
  }
  if (solution.kind === "number") {
    const present = solution.unit
      ? containsUnitClaim(explanation, solution.value, solution.unit)
      : containsNumber(explanation, solution.value);
    const equationEvidence = equations.some(
      ({ left, right }) => nearlyEqual(left, solution.value) || nearlyEqual(right, solution.value)
    );
    const supported = solution.unit ? present : present || equationEvidence;
    if (!supported) {
      const withUnit = solution.unit ? ` ${solution.unit}` : "";
      fail("MISSING_INDEPENDENT_SOLUTION_CLAIM", `expected value ${solution.value}${withUnit} is absent`);
    }
  }
}

function solvePrompt(promptEn, method) {
  const solver = SOLVERS[method];
  if (!solver) fail("UNPARSED_PROMPT", `unsupported deterministic method ${JSON.stringify(method)}`);
  return solver(promptEn);
}

function main() {
  let pack;
  try {
    pack = JSON.parse(readFileSync(PACK_URL, "utf8"));
  } catch (error) {
    console.error(`FAIL <pack> [PACK_READ_FAILURE] ${error.message}`);
    process.exitCode = 1;
    return;
  }

  const questions = pack?.questions;
  if (!Array.isArray(questions)) {
    console.error("FAIL <pack> [MISSING_QUESTIONS] questions array is absent");
    process.exitCode = 1;
    return;
  }

  const errors = [];
  const seenMethods = new Map();
  let equationsChecked = 0;

  if (questions.length !== EXPECTED_QUESTION_COUNT) {
    errors.push({ id: "<pack>", code: "QUESTION_COUNT_MISMATCH", detail: `found ${questions.length}; expected ${EXPECTED_QUESTION_COUNT}` });
  }

  const configured = Object.keys(SOLVERS).sort();
  const expected = [...EXPECTED_METHODS].sort();
  if (JSON.stringify(configured) !== JSON.stringify(expected)) {
    errors.push({ id: "<gate-config>", code: "METHOD_CONFIG_MISMATCH", detail: `configured ${configured.length}; expected ${expected.length}` });
  }

  for (let index = 0; index < questions.length; index += 1) {
    const question = questions[index];
    const id = typeof question?.id === "string" && question.id ? question.id : `<index-${index}>`;
    const promptEn = question?.prompt?.en;
    const method = question?.validation?.deterministicCheck;
    if (typeof method === "string") seenMethods.set(method, (seenMethods.get(method) ?? 0) + 1);

    let solution;
    try {
      solution = solvePrompt(promptEn, method);
    } catch (error) {
      errors.push({ id, code: error instanceof AuditFailure ? error.code : "PROMPT_SOLVER_EXCEPTION", detail: error.message });
      continue;
    }

    // Read the explanation only after the prompt-derived solution exists.
    const explanationEn = question?.explanation?.en;
    const explanation = normalize(explanationEn);
    if (!explanation) {
      errors.push({ id, code: "MISSING_EXPLANATION_EN", detail: "explanation.en is missing or empty" });
      continue;
    }

    try {
      const equations = auditEquations(explanation);
      equationsChecked += equations.length;
      auditNumericComparisons(explanation);
      auditExpectedClaim(solution, explanation, equations);
    } catch (error) {
      errors.push({ id, code: error instanceof AuditFailure ? error.code : "EXPLANATION_AUDIT_EXCEPTION", detail: error.message });
    }
  }

  for (const method of EXPECTED_METHODS) {
    if (!seenMethods.has(method)) errors.push({ id: "<pack>", code: "METHOD_NOT_COVERED", detail: method });
  }
  for (const method of seenMethods.keys()) {
    if (!EXPECTED_METHODS.includes(method)) errors.push({ id: "<pack>", code: "UNEXPECTED_METHOD", detail: method });
  }

  const errorIds = [...new Set(errors.map(({ id }) => id))];
  console.log("US-CA K-5 visible explanation consistency gate");
  console.log(`questions: ${questions.length}/${EXPECTED_QUESTION_COUNT}`);
  console.log(`methods: ${seenMethods.size}/${EXPECTED_METHODS.length}`);
  console.log(`equations_checked: ${equationsChecked}`);
  console.log(`errors: ${errors.length}`);
  console.log(`error_ids: ${errorIds.length === 0 ? "none" : errorIds.join(", ")}`);

  if (errors.length > 0) {
    for (const error of errors) console.error(`FAIL ${error.id} [${error.code}] ${error.detail}`);
    process.exitCode = 1;
    return;
  }

  console.log("PASS: all explanations are non-empty and consistent with prompt-derived solutions.");
}

function assertSelfTest(condition, message) {
  if (!condition) throw new Error(`SELF_TEST_FAILED: ${message}`);
}

function expectAuditFailure(run, expectedCode, message) {
  try {
    run();
  } catch (error) {
    assertSelfTest(error instanceof AuditFailure, `${message}: expected AuditFailure`);
    assertSelfTest(error.code === expectedCode, `${message}: got ${error.code}`);
    return;
  }
  throw new Error(`SELF_TEST_FAILED: ${message}: expected rejection`);
}

function runSelfTests() {
  const solution = semanticSolution("5/7", ["same denominator", "larger numerator", "greater"]);
  const generic = "with the same denominator, the fraction with the larger numerator is greater.";

  auditExpectedClaim(solution, normalize(generic), []);
  auditExpectedClaim(solution, normalize(`${generic} therefore 5/7 is the greater fraction.`), []);
  auditNumericComparisons(normalize("4/5 is less than 5/6."));
  auditFractionComparisons(normalize("4/5 is less than 5/6."), "5/6");
  expectAuditFailure(
    () => auditExpectedClaim(solution, normalize(`${generic} 4/7 is greater.`), []),
    "INCORRECT_EXPLANATION_COMPARISON",
    "wrong explicit fraction winner"
  );
  expectAuditFailure(
    () => auditExpectedClaim(solution, normalize(`${generic} 4/7 is greater than 5/7.`), []),
    "INCORRECT_EXPLANATION_COMPARISON",
    "false explicit fraction relation"
  );

  console.log("PASS: K-5 explanation mutation self-tests rejected contradictory fraction claims.");
}

if (process.argv.includes("--self-test")) {
  runSelfTests();
} else {
  main();
}
