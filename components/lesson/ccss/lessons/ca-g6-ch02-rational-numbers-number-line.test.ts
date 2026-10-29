import assert from "node:assert/strict";
import { collides, textBox } from "../labelSpacing";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  DEN,
  DIVE,
  DOT_R,
  GRID,
  GRID_C,
  H,
  PAD,
  Q_MAX,
  Q_MIN,
  RING_R,
  TRY_CHOICES,
  W,
  BRACKET_Y,
  LINE_Y,
  compareSentence,
  decimalLabel,
  divisionNote,
  figureLabel,
  fractionLabel,
  gcd,
  gcfNote,
  listPhrase,
  locationPhrase,
  locationSentence,
  nameChain,
  oppositeNote,
  oppositeSummary,
  orderSymbol,
  planeLabel,
  planeX,
  planeY,
  pointLabel,
  quadrantName,
  planeNote,
  quarterDecimal,
  reduce,
  sharedFactors,
  tryAnswerIndex,
  tryReason,
  value,
  workedExample,
  workedStep,
  workedSteps,
  xOf,
  axisNumberBoxes,
  P_LABEL_W,
  P_LABEL_SIZE,
} from "./ca-g6-ch02-rational-numbers-number-line";

const MINUS = "−";
const SLUG = "ca-g6-ch02-rational-numbers-number-line";
const BRIEF_STANDARDS = ["6.NS.A.1", "6.NS.B.2", "6.NS.B.3", "6.NS.B.4", "6.NS.C.5", "6.NS.C.6", "6.NS.C.7", "6.NS.C.8"];
/** Sign pair -> quadrant, written out rather than recomputed from the lesson's own branches. */
const SIGN_QUADRANT: Record<string, string> = { "+,+": "I", "-,+": "II", "-,-": "III", "+,-": "IV" };
/** The only common-factor lists two of {0..12} and 4 can produce, spelled out. */
const FACTOR_LIST: Record<string, string> = { "1": "1", "1,2": "1 and 2", "1,2,4": "1, 2 and 4" };
/** Text box assumed for the one-letter "P" label: 10 wide, 9 above the baseline, 3 below. */
const LABEL_W = 10, LABEL_UP = 9, LABEL_DOWN = 3;

/** Independent rendering of q quarters as a decimal string: whole part plus one of "", .25, .5, .75. */
function expectedQuarterLabel(q: number): string {
  const whole = Math.trunc(Math.abs(q) / DEN);
  const tail = ["", ".25", ".5", ".75"][Math.abs(q) % DEN];
  return `${q < 0 ? MINUS : ""}${whole}${tail}`;
}

/** Every k that divides both |q| and 4, by trial over every candidate up to the larger of the two. */
function expectedSharedFactors(q: number): number[] {
  const n = Math.abs(q), out: number[] = [];
  for (let k = 1; k <= Math.max(n, 4); k += 1) if (n % k === 0 && 4 % k === 0) out.push(k);
  return out;
}

test("every (A, B, opposites) state is true and stays inside both viewBoxes", () => {
  assert.equal(DEN, 4);
  assert.equal(Q_MIN, -12);
  assert.equal(Q_MAX, 12);
  // Static geometry: the labels the figure always draws sit inside the number-line viewBox.
  assert.ok(BRACKET_Y - 10 > 0 && LINE_Y + 24 < H && H - 6 < H);
  // A mirror that lands on A or B must still be visible: the ring is strictly wider than the dot.
  assert.ok(RING_R > DOT_R);

  let states = 0;
  for (let a = Q_MIN; a <= Q_MAX; a += 1) {
    for (let b = Q_MIN; b <= Q_MAX; b += 1) {
      for (const showOpp of [false, true]) {
        states += 1;

        // --- number line: every drawn marker, including the mirrors, is inside the padded line
        for (const q of [a, b, -a, -b, 0, Q_MIN, Q_MAX]) {
          const x = xOf(q);
          assert.ok(x >= PAD && x <= W - PAD, `xOf(${q}) = ${x} must lie in [${PAD}, ${W - PAD}]`);
          assert.ok(x - RING_R >= 0 && x + RING_R <= W, `a ring at ${q} would spill out of the viewBox`);
        }
        // The scale is linear and 0 sits at the midpoint, so opposites mirror exactly.
        assert.equal(xOf(a) - xOf(0), ((a * (W - 2 * PAD)) / (Q_MAX - Q_MIN)));
        assert.equal((xOf(a) - xOf(0)) + (xOf(-a) - xOf(0)), 0);
        assert.equal(xOf(0), W / 2);
        // The |A| bracket label is centred between 0 and A, so it is between them.
        const mid = (xOf(0) + xOf(a)) / 2;
        assert.ok(mid >= Math.min(xOf(0), xOf(a)) && mid <= Math.max(xOf(0), xOf(a)));
        // Two rings are drawn at one place only when A and B are the same number.
        assert.equal(xOf(-a) === xOf(-b), a === b);

        // --- grid: the point, the axis segments and the "P" label are inside the grid viewBox
        // The vertical axis is the same line stood up: a step right of 0 is the mirror of a step above it.
        assert.equal(planeX(a) + planeY(a), 2 * GRID_C);
        for (const q of [a, b, 0, Q_MIN, Q_MAX]) {
          assert.ok(planeX(q) >= 0 && planeX(q) <= GRID, `planeX(${q}) out of the viewBox`);
          assert.ok(planeY(q) >= 0 && planeY(q) <= GRID, `planeY(${q}) out of the viewBox`);
        }
        const tag = pointLabel(a, b);
        const left = tag.anchor === "start" ? tag.x : tag.x - LABEL_W;
        assert.ok(left >= 0 && left + LABEL_W <= GRID, `P label spans [${left}, ${left + LABEL_W}]`);
        assert.ok(tag.y - LABEL_UP >= 0 && tag.y + LABEL_DOWN <= GRID, `P label baseline ${tag.y} out of the viewBox`);
        // The label never sits on top of the point it names.
        assert.ok(Math.abs(tag.x - planeX(a)) >= 9 || Math.abs(tag.y - planeY(b)) >= 9);

        // --- the greatest common factor is found, not asserted
        const shared = expectedSharedFactors(a);
        const g = shared[shared.length - 1];
        for (const k of shared) {
          assert.equal(Math.abs(a) % k, 0, `${k} must divide ${Math.abs(a)}`);
          assert.equal(DEN % k, 0, `${k} must divide ${DEN}`);
        }
        for (let k = g + 1; k <= Math.max(Math.abs(a), DEN); k += 1) {
          assert.ok(Math.abs(a) % k !== 0 || DEN % k !== 0, `${k} would be a bigger common factor than ${g}`);
        }
        assert.equal(g, gcd(a, DEN));
        assert.deepEqual(sharedFactors(a), shared);
        const listed = FACTOR_LIST[shared.join(",")];
        assert.ok(listed !== undefined, `unexpected common-factor list ${shared.join(",")}`);
        const expectedGcfNote =
          a === 0
            ? "0 is a multiple of every factor of 4, so the greatest factor 0 and 4 share is 4: divide the top and the bottom by 4."
            : g === 1
              ? `${Math.abs(a)} and 4 share no factor above 1, so this is already in lowest terms.`
              : `The factors ${Math.abs(a)} and 4 share are ${listed}, so the greatest is ${g}: divide the top and the bottom by ${g}.`;
        assert.equal(gcfNote(a), expectedGcfNote);

        // --- renaming: the reduced fraction is the same number, in lowest terms, divided by that factor
        const r = reduce({ num: a, den: DEN });
        assert.equal(r.num * DEN, a * r.den, `reduce(${a}/4) must still equal ${a}/4`);
        assert.ok(r.den > 0 && Number.isInteger(r.num) && Number.isInteger(r.den));
        assert.equal(gcd(r.num, r.den), 1);
        assert.equal(value(r) * DEN, a);
        assert.equal(Math.abs(r.num), Math.abs(a) / g);
        assert.equal(r.den, DEN / g);

        // --- decimals are exact for quarters, and the name chain runs raw -> lowest terms -> decimal
        const dA = expectedQuarterLabel(a);
        const dB = expectedQuarterLabel(b);
        assert.equal(quarterDecimal(a), dA);
        assert.equal(quarterDecimal(b), dB);
        assert.equal(Number(dA.replace(MINUS, "-")) * DEN, a);
        assert.equal(quarterDecimal(-a), expectedQuarterLabel(-a));
        assert.equal(quarterDecimal(Math.abs(a)), expectedQuarterLabel(Math.abs(a)));
        const rawName = `${a < 0 ? MINUS : ""}${Math.abs(a)}/4`;
        const rNum = a / g, rDen = DEN / g;
        const reducedName = `${rNum < 0 ? MINUS : ""}${Math.abs(rNum)}${rDen === 1 ? "" : `/${rDen}`}`;
        const expectedChain = [rawName, reducedName, dA].filter((n, i, all) => all.indexOf(n) === i);
        assert.deepEqual(nameChain(a), expectedChain);
        assert.ok(expectedChain.length >= 2 && expectedChain.length <= 3);
        assert.equal(expectedChain.length === 3, gcd(a, DEN) > 1 && a % DEN !== 0);

        // --- opposite and distance, including the state where A is 0
        const expectedOpposite =
          a === 0
            ? "0 is its own opposite: it is the only number that is its own mirror image, and 0 + 0 = 0."
            : `A and ${MINUS}A are the same distance from 0 on opposite sides, so A + (${MINUS}A) = 0.`;
        assert.equal(oppositeNote(a), expectedOpposite);
        assert.equal(oppositeNote(a).includes("opposite sides"), a !== 0, "0 is not on the opposite side of itself");
        assert.equal(a + -a, 0);
        assert.equal(Math.abs(-a), Math.abs(a));
        if (a !== 0) assert.equal(Math.sign(a), -Math.sign(-a));
        else assert.equal(xOf(-a), xOf(a), "0 and its opposite are the same point");
        assert.equal(oppositeSummary(a), `${MINUS}A = ${expectedQuarterLabel(-a)}, |A| = ${expectedQuarterLabel(Math.abs(a))}`);

        // --- order is read left to right
        const sym = orderSymbol(a, b);
        assert.equal(sym, a < b ? "<" : a > b ? ">" : "=");
        assert.equal(sym === "<", value({ num: a, den: DEN }) < value({ num: b, den: DEN }));
        const expectedCompare =
          a === b
            ? "A and B are the same number, so A = B."
            : a < b
              ? "A sits to the left of B, so A < B."
              : "A sits to the right of B, so A > B.";
        assert.equal(compareSentence(a, b), expectedCompare);
        if (a < b) assert.ok(xOf(a) < xOf(b), "A left of B on the drawing too");
        if (a > b) assert.ok(xOf(a) > xOf(b), "A right of B on the drawing too");

        // --- where the pair lands: the whole sentence, not just its opening
        const quadrant = a === 0 || b === 0 ? null : SIGN_QUADRANT[`${a > 0 ? "+" : "-"},${b > 0 ? "+" : "-"}`];
        assert.equal(quadrantName(a, b), quadrant);
        const expectedPhrase =
          a === 0 && b === 0
            ? "at the origin, where the two lines cross"
            : a === 0
              ? `on the vertical axis, ${b > 0 ? "above" : "below"} the origin`
              : b === 0
                ? `on the horizontal axis, ${a > 0 ? "right of" : "left of"} the origin`
                : `in Quadrant ${quadrant}`;
        assert.equal(locationPhrase(a, b), expectedPhrase);
        const expectedLocation =
          a === 0 && b === 0
            ? `P is ${expectedPhrase}: both of its coordinates are 0.`
            : a === 0 || b === 0
              ? `P is ${expectedPhrase}, because its ${a === 0 ? "first" : "second"} coordinate is 0.`
              : `P is ${expectedPhrase}, where every first coordinate is ${a > 0 ? "positive" : "negative"} and every second coordinate is ${b > 0 ? "positive" : "negative"}.`;
        assert.equal(locationSentence(a, b), expectedLocation);
        // The sign words in that sentence really are P's own signs.
        if (quadrant) {
          assert.equal(locationSentence(a, b).includes("first coordinate is positive"), a > 0);
          assert.equal(locationSentence(a, b).includes("second coordinate is positive"), b > 0);
          assert.equal(planeX(a) > planeX(0), a > 0);
          assert.equal(planeY(b) < planeY(0), b > 0);
        }

        // --- both accessible names describe this exact state, in full
        const base = `Number line from ${MINUS}3 to 3 with A at ${dA} and B at ${dB}, labelled with A's distance from 0 as ${expectedQuarterLabel(Math.abs(a))}`;
        const expectedLine = !showOpp
          ? base
          : a === b
            ? `${base}, plus one hollow ring around the shared opposite ${expectedQuarterLabel(-a)}`
            : `${base}, plus hollow rings around the opposites ${expectedQuarterLabel(-a)} and ${expectedQuarterLabel(-b)}`;
        assert.equal(figureLabel(a, b, showOpp), expectedLine);
        assert.equal(figureLabel(a, b, showOpp).includes("opposite"), showOpp);
        if (showOpp && a === b) {
          assert.ok(!figureLabel(a, b, showOpp).includes("rings"), "one ring is drawn, so only one may be named");
        }
        if (showOpp && a !== b) {
          assert.notEqual(expectedQuarterLabel(-a), expectedQuarterLabel(-b), "two named rings must be two places");
        }
        assert.equal(
          planeLabel(a, b),
          `Coordinate grid from ${MINUS}3 to 3 on both axes, with A at ${dA} on the horizontal axis, B at ${dB} on the vertical axis, and the point P at (${dA}, ${dB}) ${expectedPhrase}`
        );
      }
    }
  }
  assert.equal(states, 25 * 25 * 2);
  assert.equal(listPhrase([1]), "1");
  assert.equal(listPhrase([1, 2]), "1 and 2");
  assert.equal(listPhrase([1, 2, 4]), "1, 2 and 4");
});

test("the worked example's stages, marks and halfway point are recomputed from scratch", () => {
  assert.deepEqual([DIVE.depth.num, DIVE.depth.den], [-9, 2]);
  assert.deepEqual([DIVE.stage.num, DIVE.stage.den], [3, 4]);
  const ex = workedExample();

  // Step 1: |-9/2| = 9/2, and 9 / 2 = 4.5.
  assert.deepEqual([ex.drop.num, ex.drop.den], [9, 2]);
  assert.equal(9 / 2, 4.5);
  assert.equal(decimalLabel(ex.drop), "4.5");
  assert.equal(fractionLabel(DIVE.depth), `${MINUS}9/2`);
  assert.equal(decimalLabel(DIVE.depth), `${MINUS}4.5`);

  // Step 2: 9/2 divided by 3/4 = 9/2 x 4/3 = 36/6 = 6 stages, exactly.
  assert.deepEqual([ex.reciprocal.num, ex.reciprocal.den], [4, 3]);
  assert.deepEqual([ex.product.num, ex.product.den], [9 * 4, 2 * 3]);
  assert.deepEqual([ex.product.num, ex.product.den], [36, 6]);
  assert.equal(36 / 6, 6);
  assert.deepEqual([ex.stages.num, ex.stages.den], [6, 1]);
  assert.equal(ex.count, 6);
  assert.equal(4.5 / 0.75, 6);

  // Step 3: six stages of -3/4 land on -0.75, -1.5, -2.25, -3, -3.75, -4.5.
  assert.equal(ex.marks.length, 6);
  assert.deepEqual(ex.marks.map((m) => value(m)), [-0.75, -1.5, -2.25, -3, -3.75, -4.5]);
  assert.deepEqual(ex.marks.map((m) => decimalLabel(m)), [`${MINUS}0.75`, `${MINUS}1.5`, `${MINUS}2.25`, `${MINUS}3`, `${MINUS}3.75`, `${MINUS}4.5`]);
  assert.equal(value(ex.marks[ex.marks.length - 1]), value(DIVE.depth), "the last stage lands on the stated depth");
  for (let i = 1; i < ex.marks.length; i += 1) assert.ok(value(ex.marks[i]) < value(ex.marks[i - 1]), "each stage is further left");

  // Step 4: halfway is stage 3, at -9/4 = -2.25, whose distance from 0 is half of 4.5.
  assert.equal(ex.halfCount, 3);
  assert.deepEqual([ex.halfway.num, ex.halfway.den], [-9, 4]);
  assert.equal(value(ex.halfway), -2.25);
  assert.equal(fractionLabel(ex.halfway), `${MINUS}9/4`);
  assert.equal(Math.abs(value(ex.halfway)), 4.5 / 2);
  assert.ok(value(DIVE.depth) < value(ex.halfway) && value(ex.halfway) < 0);
});

test("every sentence the worked example reveals is the one the arithmetic supports", () => {
  const steps = workedSteps();
  assert.equal(steps.length, 4);
  for (const [i, step] of steps.entries()) assert.equal(step, workedStep(i));

  assert.equal(
    steps[0],
    `The gauge reads ${MINUS}9/2 m. The sign says “below the surface”; the distance is |${MINUS}9/2| = 9/2, and 9 ÷ 2 = 4.5, so the sub finishes 4.5 m down.`
  );
  assert.equal(
    steps[1],
    "Each stage is 3/4 m, so ask how many 3/4 fit inside 9/2. Divide by multiplying by the reciprocal: 9/2 ÷ 3/4 = 9/2 × 4/3 = 36/6 = 6 stages."
  );
  assert.equal(
    steps[2],
    `Mark them on the line. Every stage subtracts 3/4, giving ${MINUS}0.75, ${MINUS}1.5, ${MINUS}2.25, ${MINUS}3, ${MINUS}3.75, ${MINUS}4.5 — each depth a rational number with its own point, each one further left than the one before.`
  );
  assert.equal(
    steps[3],
    `Halfway is after 3 of the 6 stages, at ${MINUS}9/4 = ${MINUS}2.25. Distance checks it: |${MINUS}2.25| = 2.25, and 4.5 ÷ 2 = 2.25. On the line ${MINUS}4.5 < ${MINUS}2.25 < 0, so deeper really is less.`
  );
  assert.equal(
    divisionNote(),
    "Asking how many stages of 3/4 m fit inside a drop of 9/2 m is a division, and dividing by a fraction is multiplying by its reciprocal: 9/2 × 4/3 = 36/6 = 6 stages"
  );

  // The numbers those sentences quote, checked against the arithmetic rather than against the lesson.
  assert.equal(Math.abs(-9 / 2), 4.5);
  assert.equal((9 / 2) * (4 / 3), 6);
  assert.equal(6 * 0.75, 4.5);
  assert.equal(3 * -0.75, -2.25);
  assert.equal(Math.abs(-2.25), 4.5 / 2);
  assert.ok(-4.5 < -2.25 && -2.25 < 0);
});

test("the Try it answer is the least of the four numbers", () => {
  assert.deepEqual(TRY_CHOICES.map((f) => [f.num, f.den]), [[-7, 4], [-1, 2], [-9, 4], [2, 1]]);
  // -7/4 = -1.75, -1/2 = -0.5, -9/4 = -2.25, 2/1 = 2; the least is -2.25.
  const values = [-7 / 4, -1 / 2, -9 / 4, 2 / 1];
  const labels = [`${MINUS}7/4`, `${MINUS}1/2`, `${MINUS}9/4`, "2"];
  const decimals = [`${MINUS}1.75`, `${MINUS}0.5`, `${MINUS}2.25`, "2"];
  assert.deepEqual(values, [-1.75, -0.5, -2.25, 2]);
  assert.deepEqual(TRY_CHOICES.map((f) => value(f)), values);
  assert.deepEqual(TRY_CHOICES.map((f) => fractionLabel(f)), labels);
  assert.deepEqual(TRY_CHOICES.map((f) => decimalLabel(f)), decimals);
  const answer = tryAnswerIndex();
  assert.equal(answer, 2);
  assert.equal(values[answer], Math.min(...values));
  assert.ok(values[answer] < 0, "the least of the four is negative, so the 'positive' explanation holds");
  for (const [i, v] of values.entries()) if (i !== answer) assert.ok(v > values[answer]);

  // Each explanation states the direction the numbers actually go.
  for (const i of [0, 1, 2, 3]) {
    const right = values[i] > values[answer];
    const expected: string =
      i === answer
        ? `Right. ${labels[i]} = ${decimals[i]}, the farthest left of the four, and farther left on the line means less.`
        : values[i] > 0
          ? `${labels[i]} is positive, and every positive number sits to the right of every negative number.`
          : `${labels[i]} = ${decimals[i]} sits to the ${right ? "right" : "left"} of ${decimals[answer]}, so it is the ${right ? "greater" : "lesser"} of the two.`;
    assert.equal(tryReason(i), expected);
  }
  assert.ok(tryReason(answer).startsWith("Right."));
  for (const i of [0, 1, 3]) assert.ok(!tryReason(i).startsWith("Right."));
});

test("lesson source cites only brief standards and keeps its markup contract", () => {
  const source = readFileSync(path.join(process.cwd(), "components/lesson/ccss/lessons", `${SLUG}.tsx`), "utf8");

  const cited = [...source.matchAll(/\b(?:K|[1-8])\.[A-Z]{1,3}\.[A-D]\.\d+\b/g)].map((m) => m[0]);
  assert.ok(cited.length > 0, "the Math check must cite standards");
  for (const id of cited) assert.ok(BRIEF_STANDARDS.includes(id), `${id} is not in the chapter brief`);
  for (const must of ["6.NS.A.1", "6.NS.C.5", "6.NS.C.6", "6.NS.C.7", "6.NS.C.8", "6.NS.B.4"]) {
    assert.ok(cited.includes(must), `${must} must be cited`);
  }

  const svgTags = source.split("<svg").slice(1).map((rest) => rest.slice(0, rest.indexOf(">")));
  assert.equal(svgTags.length, 2);
  for (const tag of svgTags) {
    assert.ok(tag.includes("viewBox"), "every <svg> needs a viewBox");
    assert.ok(tag.includes('role="img"') && tag.includes("aria-label"), "every <svg> needs role=img and an aria-label");
  }

  const buttonTags = source.split("<button").slice(1).map((rest) => rest.slice(0, rest.indexOf(">")));
  assert.ok(buttonTags.length >= 6);
  for (const tag of buttonTags) assert.ok(tag.includes('type="button"'), "every <button> needs type=button");
  assert.match(source, /aria-expanded=\{shown > 0\} aria-controls=\{stepsId\}/u);
  assert.match(source, /id=\{stepsId\}/u);
  assert.match(source, /aria-pressed=\{showOpp\}/u);
  assert.match(source, /aria-pressed=\{picked === i\}/u);
  assert.match(source, /min=\{Q_MIN\} max=\{Q_MAX\}/u);
  assert.doesNotMatch(source, /[\u3040-\u30ff\u3400-\u9fff]/u, "no CJK characters");

  // The sentences the figure shows come from the tested builders, not from inline copy.
  assert.match(source, /note: oppositeNote\(a\)/u);
  assert.match(source, /main: oppositeSummary\(a\)/u);
  assert.match(source, /note: gcfNote\(a\)/u);
  assert.match(source, /const steps = workedSteps\(\);/u);
  assert.match(source, /\{oppositeNote\(a\)\}/u);
  assert.match(source, /\{divisionNote\(\)\} \(6\.NS\.A\.1\)/u);
  assert.equal(source.split("opposite sides").length - 1, 1, "the opposite-sides claim exists once, inside oppositeNote");

  // Opposite rings are drawn after the solid markers, unfilled and wider, so they are never repainted away.
  const rings = source.match(/r=\{RING_R\} fill="none"/gu) ?? [];
  assert.equal(rings.length, 2, "both opposite markers are unfilled rings");
  assert.ok(source.lastIndexOf("r={DOT_R}") < source.indexOf("r={RING_R}"), "rings must be drawn after the dots");
  assert.ok(RING_R > DOT_R);
});

test("the Math check's plane sentence is true at every one of the 625 (A, B) pairs, including the degenerate ones", () => {
  let pairs = 0;
  for (let a = Q_MIN; a <= Q_MAX; a += 1) {
    for (let b = Q_MIN; b <= Q_MAX; b += 1) {
      pairs += 1;
      const note = planeNote(a, b);
      // A sign may only be claimed for a coordinate that actually has one.
      if (a === 0 || b === 0) {
        assert.doesNotMatch(note, /both signs/u, `(${a}, ${b}): 0 has no sign — "${note}"`);
      } else {
        assert.match(note, /both signs/u, `(${a}, ${b}): both coordinates are signed — "${note}"`);
      }
      // "Quadrant" may only be claimed where a quadrant exists.
      const inQuadrant = quadrantName(a, b) !== null;
      assert.equal(/lands in — here Quadrant/u.test(note), inQuadrant, `(${a}, ${b}): "${note}"`);
      if (inQuadrant) assert.ok(note.endsWith(`Quadrant ${quadrantName(a, b)}`), `(${a}, ${b}): "${note}"`);
      // The origin is on BOTH lines, not on "an" axis.
      if (a === 0 && b === 0) {
        assert.match(note, /origin itself, the one point that lies on both lines at once/u);
        assert.doesNotMatch(note, /rather than inside a quadrant/u);
      }
      // It must not contradict the state-derived readout rendered above it.
      if (quadrantName(a, b) === null) assert.doesNotMatch(note, /Quadrant [IV]+/u, `(${a}, ${b}) has no quadrant`);
    }
  }
  assert.equal(pairs, (Q_MAX - Q_MIN + 1) ** 2);
  assert.equal(pairs, 625);
});

test("the plane claim stays state-derived — it cannot be re-inlined as fixed prose", () => {
  const source = readFileSync(path.join(process.cwd(), "components/lesson/ccss/lessons", `${SLUG}.tsx`), "utf8");
  assert.match(source, /\{planeNote\(a, b\)\}/u, "the Math check must interpolate the helper");
  assert.equal(source.split("two signs deciding").length - 1, 0, "the hard-coded clause must not come back");
});

test("the point's name never lands on the plane's axis numbers", () => {
  // The label used to sit diagonally out from the point at a fixed offset, which
  // put it in the row of x-axis numbers whenever the point came near that axis.
  const axes = axisNumberBoxes();
  let states = 0;
  for (let a = Q_MIN; a <= Q_MAX; a += 1) {
    for (let b = Q_MIN; b <= Q_MAX; b += 1) {
      const spot = pointLabel(a, b);
      assert.ok(spot.fitted, `no clear spot for P at (${a}/${DEN}, ${b}/${DEN})`);
      const box = textBox(spot.x, spot.y, P_LABEL_W, { anchor: spot.anchor, fontSize: P_LABEL_SIZE });
      for (const axis of axes) assert.ok(!collides(box, axis, 2), `P sits on an axis number at (${a}/${DEN}, ${b}/${DEN})`);
      assert.ok(box.x0 >= 0 && box.x1 <= GRID && box.y0 >= 0 && box.y1 <= GRID, `P leaves the plane at (${a}/${DEN}, ${b}/${DEN})`);
      states += 1;
    }
  }
  assert.equal(states, (Q_MAX - Q_MIN + 1) ** 2);
});
