import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  AH,
  AW,
  BAND_ONLY,
  BOTH_MAX,
  BOTH_MIN,
  BOTH_STEP,
  CLASS_SIZE,
  DRAW,
  IN_CLUB,
  LABEL_MIN_H,
  LABEL_MIN_W,
  PAD_TOP,
  PAD_X,
  PLAYS_SPORT,
  READ_ONLY_MAX,
  READ_ONLY_MIN,
  READ_ONLY_STEP,
  REEDS_NEW,
  REEDS_USED,
  SHARE_MIN_W,
  SPORT_AND_CLUB,
  SVG_H,
  SVG_W,
  TOTAL,
  areaModel,
  cardTexts,
  choose,
  chooseText,
  columnSentence,
  comparisonSentence,
  conditionalHeadline,
  counts,
  tableModel,
  figureLabel,
  independenceCheckLine,
  jointText,
  mathCheckSentences,
  ratioText,
  reedExample,
  shareText,
  stepTexts,
  tryAnswerIndex,
  tryChoices,
  trySentence,
  view,
} from "./ca-g10-ch05-conditional-probability";

const SLUG = "ca-g10-ch05-conditional-probability";
const BRIEF_STANDARDS = ["S-CP.1", "S-CP.2", "S-CP.3", "S-CP.4", "S-CP.5", "S-CP.6", "S-CP.7", "S-CP.8", "S-CP.9"];
const CONDITIONS = ["band", "reads"] as const;
/** Rough glyph widths, used only to keep SVG text inside the rectangle it labels. */
const DIGIT_12 = 7.5;
const GLYPH_10 = 6;

/** Euclid, written out here so the lesson's own gcd is never used to check itself. */
function euclid(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const r = x % y;
    x = y;
    y = r;
  }
  return x;
}

/**
 * Checks "n/d = lowest = 0.dd" without recomputing it the way the lesson does:
 * the raw fraction is read back, the lowest-terms form is verified by
 * cross-multiplication and a gcd of 1, and the decimal must round correctly.
 */
function checkRatio(text: string, n: number, d: number) {
  const parts = text.split(" ");
  assert.ok(parts.length === 3 || parts.length === 5, `unexpected ratio text "${text}"`);
  assert.equal(parts[0], `${n}/${d}`);
  const relation = parts[parts.length - 2];
  assert.equal(relation, (100 * n) % d === 0 ? "=" : "≈", `"${text}" must mark a rounded decimal with the approximation sign`);
  const decimal = Number(parts[parts.length - 1]);
  assert.ok(Number.isFinite(decimal), `"${text}" must end in a decimal`);
  assert.ok(Math.abs(decimal - n / d) <= 0.005 + 1e-12, `"${text}" must round ${n}/${d} to two places`);
  const lowest = parts.length === 5 ? parts[2] : parts[0];
  const [ln, ld] = lowest.includes("/") ? lowest.split("/").map(Number) : [Number(lowest), 1];
  assert.ok(Number.isFinite(ln) && Number.isFinite(ld) && ld > 0, `"${text}" has an unreadable lowest-terms form`);
  assert.equal(ln * d, n * ld, `${lowest} must be the same value as ${n}/${d}`);
  assert.equal(euclid(ln, ld), 1, `${lowest} must be in lowest terms`);
  if (parts.length === 3) assert.equal(euclid(n, d), 1, `${n}/${d} is not reduced, so the lowest-terms form must be shown`);
}

/**
 * The expected rendering of n/d, spelled out here so composite sentences can be
 * compared as whole strings. It is only a formatter: every fraction it is used
 * on is also put through checkRatio, which verifies the mathematics separately.
 */
function expectRatio(n: number, d: number): string {
  const g = euclid(n, d) || 1;
  const head = `${n}/${d}`;
  const lowest = d / g === 1 ? `${n / g}` : `${n / g}/${d / g}`;
  const relation = (100 * n) % d === 0 ? "=" : "≈";
  // Independent of the lesson's closed form: search the 101 candidate hundredths
  // and keep the nearest, ties going up, comparing with integer cross-products
  // only (|100n·? | never touches floating point). Rounding once, straight to two
  // places — long-dividing to three places first would double-round 25/55 to 0.46.
  let hundredths = 0;
  let bestGap = Number.POSITIVE_INFINITY;
  for (let h = 0; h <= 100; h += 1) {
    const gap = Math.abs(100 * Math.abs(n) - h * Math.abs(d)); // |n/d − h/100| × 100d
    if (gap < bestGap || (gap === bestGap && h > hundredths)) { bestGap = gap; hundredths = h; }
  }
  const decimal = `${Math.floor(hundredths / 100)}.${String(hundredths % 100).padStart(2, "0")}`;
  return head === lowest ? `${head} ${relation} ${decimal}` : `${head} = ${lowest} ${relation} ${decimal}`;
}

/**
 * Reads the rendered multiplication-rule line back as three fractions and
 * checks the claim itself by integer cross-multiplication: (a/b)(c/d) = e/f.
 * Nothing here is borrowed from the lesson.
 */
function checkJointClaim(text: string, tag: string) {
  const match = /\((\d+)\/(\d+)\) × \((\d+)\/(\d+)\) = (\d+)\/(\d+)$/u.exec(text);
  assert.ok(match, `the joint line must end in (a/b) × (c/d) = e/f — got "${text}" (${tag})`);
  const [a, b, c, d, e, f] = match.slice(1).map(Number);
  assert.equal(a * c * f, e * b * d, `(${a}/${b}) × (${c}/${d}) is not ${e}/${f} (${tag})`);
}

/** The six phrases the lesson may use for each condition, written out as literals. */
const PHRASES = {
  band: {
    condShort: "band",
    otherShort: "reads",
    condPhrase: "are in the marching band",
    condPhraseOne: "is in the marching band",
    condNegPhrase: "are not in the marching band",
    otherPhrase: "read sheet music",
  },
  reads: {
    condShort: "reads",
    otherShort: "band",
    condPhrase: "read sheet music",
    condPhraseOne: "reads sheet music",
    condNegPhrase: "do not read sheet music",
    otherPhrase: "are in the marching band",
  },
} as const;

test("ratioText reduces, marks rounding, and keeps the raw counts visible", () => {
  checkRatio(ratioText(40, 50), 40, 50);
  assert.equal(ratioText(40, 50), "40/50 = 4/5 = 0.80");
  assert.equal(ratioText(30, 210), "30/210 = 1/7 ≈ 0.14");
  assert.equal(ratioText(7, 32), "7/32 ≈ 0.22");
  assert.equal(ratioText(30, 30), "30/30 = 1 = 1.00");
  assert.equal(shareText(50), "25%");
  assert.equal(shareText(35), "17.5%");
});

test("every reachable survey keeps the table, the area model, and every rendered sentence true", () => {
  assert.deepEqual([BOTH_MIN, BOTH_MAX, BOTH_STEP], [10, 40, 5]);
  assert.deepEqual([READ_ONLY_MIN, READ_ONLY_MAX, READ_ONLY_STEP], [20, 100, 10]);
  assert.equal(TOTAL, 200);
  assert.equal(BAND_ONLY, 10);
  assert.equal(SVG_W, AW + 2 * PAD_X);

  const seenCompare = new Set<string>();
  const seenIndependent = new Set<boolean>();
  let states = 0;
  for (let both = BOTH_MIN; both <= BOTH_MAX; both += BOTH_STEP) {
    for (let readOnly = READ_ONLY_MIN; readOnly <= READ_ONLY_MAX; readOnly += READ_ONLY_STEP) {
      states += 1;
      const c = counts(both, readOnly);
      const where = `both=${both}, readOnly=${readOnly}`;

      // The four cells are a partition of the 200 students, with independent arithmetic for each margin.
      const band = both + 10;
      const reads = both + readOnly;
      const union = both + 10 + readOnly;
      const neither = 200 - both - 10 - readOnly;
      assert.equal(c.bandOnly, 10);
      assert.equal(c.neither, neither, where);
      assert.ok(c.neither > 0, `the survey must never run out of students (${where})`);
      assert.equal(c.both + c.bandOnly + c.readOnly + c.neither, TOTAL, where);
      assert.equal(c.band, band, where);
      assert.equal(c.reads, reads, where);
      // Inclusion-exclusion: the union counted cell by cell equals band + reads − both.
      assert.equal(c.union, union, where);
      assert.equal(c.union, c.band + c.reads - c.both, where);
      assert.equal(c.union, TOTAL - c.neither, where);
      // The band is the smaller event in every state, which is exactly what the opening
      // paragraph claims: P(reads | band) = both/band beats P(band | reads) = both/reads.
      assert.ok(band < reads, where);
      assert.ok(both * reads > both * band, where);
      assert.ok(both / band > both / reads, where);

      // The four probability cards, rebuilt from the raw integers.
      const cards = cardTexts(c);
      assert.equal(cards.length, 4, where);
      assert.deepEqual(
        cards,
        [
          { title: "P(band)", big: expectRatio(band, 200), small: `${both} + 10 band members out of 200` },
          { title: "P(reads)", big: expectRatio(reads, 200), small: `${both} + ${readOnly} readers out of 200` },
          { title: "P(band and reads)", big: expectRatio(both, 200), small: "the one cell that is in both groups" },
          { title: "P(band or reads)", big: expectRatio(union, 200), small: `(${band} + ${reads} − ${both})/200 = ${union}/200` },
        ],
        where
      );
      for (const [n, d] of [[band, 200], [reads, 200], [both, 200], [union, 200]] as const) checkRatio(ratioText(n, d), n, d);

      // The independence test, in whole students: band × reads against both × 200.
      const product = band * reads;
      const joint = both * 200;
      const expectCompare = joint > product ? "higher" : joint < product ? "lower" : "the same";
      assert.equal(
        independenceCheckLine(c),
        `band × reads = ${band} × ${reads} = ${product}, both × 200 = ${both} × 200 = ${joint} — ${
          product === joint ? "equal, so independent" : "not equal, so not independent"
        }`,
        where
      );

      for (const condOn of CONDITIONS) {
        const v = view(c, condOn);
        const tag = `${where}, given ${condOn}`;
        const words = PHRASES[condOn];
        const condCount = condOn === "band" ? band : reads;
        const otherCount = condOn === "band" ? reads : band;
        const restTop = condOn === "band" ? readOnly : 10;
        assert.equal(v.condCount, condCount, tag);
        assert.equal(v.otherCount, otherCount, tag);
        assert.equal(v.restCount, 200 - condCount, tag);
        assert.equal(v.restTop, restTop, tag);
        assert.equal(v.condCount + v.restCount, TOTAL, tag);
        // The six phrases are literals, not whatever view() happens to return.
        assert.equal(v.condShort, words.condShort, tag);
        assert.equal(v.otherShort, words.otherShort, tag);
        assert.equal(v.condPhrase, words.condPhrase, tag);
        assert.equal(v.condPhraseOne, words.condPhraseOne, tag);
        assert.equal(v.condNegPhrase, words.condNegPhrase, tag);
        assert.equal(v.otherPhrase, words.otherPhrase, tag);

        // P(other | cond) = both/condCount against P(other) = otherCount/200, decided by
        // integer cross-multiplication written out from the raw counts.
        assert.equal(v.compare, expectCompare, tag);
        assert.equal(v.independent, product === joint, tag);
        assert.equal(v.verb, expectCompare === "higher" ? "raises" : expectCompare === "lower" ? "lowers" : "does not change", tag);
        assert.equal(v.comparePhrase, expectCompare === "the same" ? "exactly equal to" : `${expectCompare} than`, tag);
        seenCompare.add(v.compare);
        seenIndependent.add(v.independent);

        checkRatio(ratioText(c.both, condCount), c.both, condCount);
        checkRatio(ratioText(otherCount, TOTAL), otherCount, TOTAL);

        // Every sentence the panel prints, rebuilt from the raw integers and the literal phrases.
        assert.equal(conditionalHeadline(c, condOn), `P(${words.otherShort} | ${words.condShort}) = ${expectRatio(both, condCount)}`, tag);
        assert.equal(
          columnSentence(c, condOn),
          `The outlined column holds the ${condCount} students who ${words.condPhrase}; ${both} of them ${words.otherPhrase}.`,
          tag
        );
        assert.equal(
          comparisonSentence(c, condOn),
          `Without that information, P(${words.otherShort}) = ${expectRatio(otherCount, 200)}. Being told that a student ${words.condPhraseOne} ${
            expectCompare === "higher" ? "raises" : expectCompare === "lower" ? "lowers" : "does not change"
          } the probability, so the two events are ${product === joint ? "independent" : "not independent"}.`,
          tag
        );
        assert.equal(
          jointText(c, condOn),
          `P(band and reads) = P(${words.condShort}) × P(${words.otherShort} | ${words.condShort}) = (${condCount}/200) × (${both}/${condCount}) = ${both}/200`,
          tag
        );
        // ...and the multiplication-rule claim is verified as arithmetic, not as a string.
        checkJointClaim(jointText(c, condOn), tag);

        const mc = mathCheckSentences(c, condOn);
        assert.equal(
          mc.partition,
          `Every student lands in exactly one of the four cells, so band and reads are subsets of one sample space and their intersection (${both}), union (${union}), and complements are just collections of whole cells`,
          tag
        );
        assert.equal(
          mc.addition,
          `Adding the band total ${band} to the reads total ${reads} counts the ${both} students in both cells twice, which is why P(band or reads) = ${band}/200 + ${reads}/200 − ${both}/200 = ${expectRatio(union, 200)}`,
          tag
        );
        assert.equal(
          mc.conditional,
          `Conditioning discards every cell outside the given event, so P(${words.otherShort} | ${words.condShort}) = ${expectRatio(both, condCount)} is a fraction of the ${condCount} outcomes in that column rather than of all 200`,
          tag
        );
        assert.equal(
          mc.multiplication,
          `Multiplying that conditional back by P(${words.condShort}) = ${condCount}/200 returns the joint probability ${both}/200, the general multiplication rule`,
          tag
        );
        assert.equal(
          mc.independence,
          `Independence would mean P(band) × P(reads) = P(band and reads); clearing the denominators, that asks whether band × reads = both × 200, and here ${band} × ${reads} = ${product} against ${both} × 200 = ${joint}, so the events are ${
            product === joint
              ? "independent, and the conditional above matches the unconditional exactly"
              : `not independent, and the conditional above is ${expectCompare === "the same" ? "exactly equal to" : `${expectCompare} than`} the unconditional`
          }`,
          tag
        );
        assert.equal(
          mc.counting,
          "The worked example counts one event two ways — the multiplication rule, and combinations C(6, 2) = (6 × 5)/(2 × 1) = 15 and C(15, 2) = (15 × 14)/(2 × 1) = 105, where dividing by 2 × 1 removes the orders the same pair could arrive in — and both give 30/210 = 1/7 ≈ 0.14",
          tag
        );
        // The addition sentence and the union card must agree with the cell-by-cell union.
        assert.equal(band + reads - both, union, tag);

        const model = areaModel(c, condOn);
        assert.equal(model.cells.length, 4, tag);
        assert.equal(model.cells.reduce((sum, cell) => sum + cell.count, 0), TOTAL, tag);
        assert.deepEqual(
          model.cells.map((cell) => cell.count),
          [both, condCount - both, restTop, neither],
          tag
        );

        for (const cell of model.cells) {
          assert.ok(cell.count > 0, `${cell.key} must never be an empty rectangle (${tag})`);
          // Area is the cell's share of the whole: w × h = AW × AH × count / TOTAL.
          const expected = (AW * AH * cell.count) / TOTAL;
          assert.ok(Math.abs(cell.w * cell.h - expected) < 1e-6, `${cell.key} area ${cell.w * cell.h} should be ${expected} (${tag})`);
          assert.ok(cell.x >= PAD_X - 1e-9 && cell.x + cell.w <= PAD_X + AW + 1e-9, `${cell.key} leaves the model horizontally (${tag})`);
          assert.ok(cell.y >= PAD_TOP - 1e-9 && cell.y + cell.h <= PAD_TOP + AH + 1e-9, `${cell.key} leaves the model vertically (${tag})`);
          assert.equal(cell.showCount, cell.w >= LABEL_MIN_W && cell.h >= LABEL_MIN_H, tag);
          if (cell.showCount) {
            const halfText = (String(cell.count).length * DIGIT_12) / 2;
            const centerX = cell.x + cell.w / 2;
            const baseline = cell.y + cell.h / 2 + 4;
            assert.ok(centerX - halfText >= cell.x, `the count label overflows ${cell.key} on the left (${tag})`);
            assert.ok(centerX + halfText <= cell.x + cell.w, `the count label overflows ${cell.key} on the right (${tag})`);
            assert.ok(baseline - 9 >= cell.y, `the count label rides above ${cell.key} (${tag})`);
            assert.ok(baseline + 3 <= cell.y + cell.h, `the count label drops below ${cell.key} (${tag})`);
          }
        }

        // The two columns tile the model exactly, and each is as wide as its share of the students.
        assert.equal(model.columns.length, 2, tag);
        assert.equal(model.columns[0].x, PAD_X, tag);
        assert.ok(Math.abs(model.columns[0].w + model.columns[1].w - AW) < 1e-9, tag);
        assert.ok(Math.abs(model.columns[1].x - (PAD_X + model.columns[0].w)) < 1e-9, tag);
        assert.equal(model.columns[0].count + model.columns[1].count, TOTAL, tag);
        assert.equal(model.columns[0].count, condCount, tag);
        for (const col of model.columns) {
          assert.ok(Math.abs(col.w - (AW * col.count) / TOTAL) < 1e-9, tag);
          assert.equal(col.showShare, col.w >= SHARE_MIN_W, tag);
          // The percent is exact: reading it back must return the count.
          assert.equal(2 * Number(col.share.slice(0, -1)), col.count, `${col.share} must be ${col.count} out of ${TOTAL} (${tag})`);
          if (col.showShare) {
            const halfText = (col.share.length * GLYPH_10) / 2;
            assert.ok(col.centerX - halfText >= 0 && col.centerX + halfText <= SVG_W, `the share label leaves the viewBox (${tag})`);
          }
        }
        assert.ok(PAD_TOP + AH + 14 + 3 <= SVG_H, "the share labels must sit inside the viewBox");

        // The focus outline is exactly the conditioning column, stroke included.
        assert.deepEqual(model.focus, { x: PAD_X, y: PAD_TOP, w: model.columns[0].w, h: AH }, tag);
        assert.ok(model.focus.x - 1.5 >= 0 && model.focus.y - 1.5 >= 0, tag);

        // The sole description a screen-reader user gets: pinned word for word to literals.
        const expectedLabel =
          condOn === "band"
            ? `Area model of 200 students. The outlined left column holds the ${band} students who are in the marching band; its solid top part is the ${both} of them who read sheet music, so P(reads | band) is ${both} out of ${band}. The right column holds the ${200 - band} students who are not in the marching band, of whom ${readOnly} read sheet music.`
            : `Area model of 200 students. The outlined left column holds the ${reads} students who read sheet music; its solid top part is the ${both} of them who are in the marching band, so P(band | reads) is ${both} out of ${reads}. The right column holds the ${200 - reads} students who do not read sheet music, of whom 10 are in the marching band.`;
        assert.equal(figureLabel(c, condOn), expectedLabel, tag);
      }
    }
  }
  assert.equal(states, 63, "the two steppers reach 7 x 9 survey states");

  // The independence readout is live, not decoration: all three comparisons occur.
  assert.deepEqual([...seenCompare].sort(), ["higher", "lower", "the same"]);
  assert.deepEqual([...seenIndependent].sort(), [false, true]);
  // Independent state: band = 20, reads = 100, and 20 x 100 = 2000 = 10 x 200.
  assert.equal(20 * 100, 10 * 200);
  const evenState = counts(10, 90);
  assert.deepEqual([evenState.band, evenState.reads], [20, 100]);
  assert.equal(view(evenState, "band").independent, true);
  assert.equal(view(evenState, "reads").independent, true);
  assert.equal(view(evenState, "band").compare, "the same");
  assert.equal(view(evenState, "band").verb, "does not change");
  assert.equal(conditionalHeadline(evenState, "band"), "P(reads | band) = 10/20 = 1/2 = 0.50");
  // ...and P(reads) is the same 1/2: 100/200.
  assert.equal(cardTexts(evenState)[1].big, "100/200 = 1/2 = 0.50");
  // One step further and the condition lowers the probability: 20 x 110 = 2200 > 2000.
  const lowState = counts(10, 100);
  assert.deepEqual([lowState.band, lowState.reads], [20, 110]);
  assert.ok(20 * 110 > 10 * 200);
  assert.equal(view(lowState, "band").compare, "lower");
  assert.equal(view(lowState, "band").verb, "lowers");
  assert.equal(view(lowState, "reads").compare, "lower");
});

test("the worked example draws two reeds without replacement, checked by hand", () => {
  assert.deepEqual([REEDS_NEW, REEDS_USED, DRAW], [6, 9, 2]);
  const ex = reedExample();
  // 6 new + 9 used = 15 reeds.
  assert.equal(ex.stock, 15);
  // Step 1: P(first new) = 6/15, which is 2/5 because 6 x 5 = 15 x 2.
  assert.equal(ex.firstN, 6);
  assert.equal(ex.firstD, 15);
  assert.equal(6 * 5, 15 * 2);
  assert.equal(ratioText(ex.firstN, ex.firstD), "6/15 = 2/5 = 0.40");
  // Step 2: one new reed is gone, so 5 of the remaining 14 are new.
  assert.equal(ex.secondN, 5);
  assert.equal(ex.secondD, 14);
  // The condition really lowers the chance: 5/14 < 6/15 because 5 x 15 = 75 < 84 = 6 x 14.
  assert.ok(5 * 15 < 6 * 14);
  // Step 3: (6/15)(5/14) = 30/210, and 30 x 7 = 210, so it is exactly 1/7.
  assert.equal(ex.jointN, 30);
  assert.equal(ex.jointD, 210);
  assert.equal(ex.jointN * 7, ex.jointD);
  assert.equal(ratioText(ex.jointN, ex.jointD), "30/210 = 1/7 ≈ 0.14");
  // Step 4: C(6,2) = (6 x 5)/(2 x 1) = 15 and C(15,2) = (15 x 14)/(2 x 1) = 105, and 15 x 7 = 105.
  assert.equal(choose(6, 2), 15);
  assert.equal((6 * 5) / (2 * 1), 15);
  assert.equal(choose(15, 2), 105);
  assert.equal((15 * 14) / (2 * 1), 105);
  assert.equal(chooseText(6, 2), "(6 × 5)/(2 × 1) = 15");
  assert.equal(chooseText(15, 2), "(15 × 14)/(2 × 1) = 105");
  assert.equal(chooseText(5, 3), "(5 × 4 × 3)/(3 × 2 × 1) = 10");
  assert.equal((5 * 4 * 3) / (3 * 2 * 1), 10);
  assert.equal(ex.waysBoth, 15);
  assert.equal(ex.waysAny, 105);
  assert.equal(ex.waysBoth * 7, ex.waysAny);
  assert.equal(ex.waysBoth * ex.jointD, ex.waysAny * ex.jointN, "counting pairs and the multiplication rule agree exactly");
  // Step 5: with replacement, (6/15)^2 = 36/225 = 4/25, and 1/7 < 4/25 because 25 < 28.
  assert.equal(ex.replacedN, 36);
  assert.equal(ex.replacedD, 225);
  assert.equal(36 * 25, 225 * 4);
  assert.ok(1 * 25 < 4 * 7, "with replacement is the LARGER probability, as step 5 says");
  assert.equal(ratioText(ex.replacedN, ex.replacedD), "36/225 = 4/25 = 0.16");
  assert.equal(choose(15, 0), 1);
  assert.equal(choose(5, 5), 1);

  // Every sentence the student reads, word for word.
  const steps = stepTexts();
  assert.equal(steps.length, 5);
  assert.equal(steps[0], "The drawer holds 15 reeds and 6 of them are new, so the first reed is new with probability 6/15 = 2/5 = 0.40.");
  assert.equal(
    steps[1],
    "Nothing goes back. Once a new reed is gone, 5 of the 14 reeds still in the drawer are new, so P(second new | first new) = 5/14 ≈ 0.36. The condition changed the pool, so it changed the probability."
  );
  assert.equal(
    steps[2],
    "The multiplication rule chains them: P(both new) = P(first new) × P(second new | first new) = (6/15) × (5/14) = 30/210 = 1/7 ≈ 0.14."
  );
  assert.equal(
    steps[3],
    "Counting gives the same answer. Order does not matter, so count combinations: C(6, 2) = (6 × 5)/(2 × 1) = 15 pairs of new reeds, out of C(15, 2) = (15 × 14)/(2 × 1) = 105 equally likely pairs from all 15 reeds, so P(both new) = 15/105 = 1/7 ≈ 0.14 — the same value."
  );
  assert.equal(
    steps[4],
    "If the first reed went back in, the draws would be independent, both would be 6/15 = 2/5 = 0.40, and P(both new) = 36/225 = 4/25 = 0.16 — larger, because replacing keeps the new share at 6/15 instead of dropping it to 5/14."
  );
  // 5/14 = 0.357..., so step 2 must round to 0.36 with the approximation sign.
  checkRatio(ratioText(ex.secondN, ex.secondD), 5, 14);
  checkRatio(ratioText(ex.waysBoth, ex.waysAny), 15, 105);
});

test("the Try it answer is the addition rule with the overlap subtracted once", () => {
  assert.deepEqual([CLASS_SIZE, PLAYS_SPORT, IN_CLUB, SPORT_AND_CLUB], [32, 18, 12, 7]);
  assert.ok(SPORT_AND_CLUB <= Math.min(PLAYS_SPORT, IN_CLUB), "the overlap cannot exceed either group");
  // 11 play a sport only, 5 are in a club only, 7 do both: 11 + 5 + 7 = 23 in the union, 9 in neither.
  const sportOnly = PLAYS_SPORT - SPORT_AND_CLUB;
  const clubOnly = IN_CLUB - SPORT_AND_CLUB;
  assert.deepEqual([sportOnly, clubOnly], [11, 5]);
  const union = sportOnly + clubOnly + SPORT_AND_CLUB;
  assert.equal(union, 23);
  assert.equal(union, PLAYS_SPORT + IN_CLUB - SPORT_AND_CLUB);
  assert.equal(CLASS_SIZE - union, 9);

  const choices = tryChoices();
  assert.equal(choices.length, 4);
  assert.equal(new Set(choices.map((choice) => `${choice.n}/${choice.d}`)).size, 4, "the four options are distinct");
  const answer = tryAnswerIndex();
  assert.equal(answer, 1);
  assert.equal(choices[answer].n, union);
  assert.equal(choices[answer].d, CLASS_SIZE);
  assert.equal(choices[answer].why, "correct");
  assert.equal(choices.filter((choice) => choice.why === "correct").length, 1);
  choices.forEach((choice, i) => {
    assert.equal(choice.d, CLASS_SIZE);
    assert.equal(choice.n * CLASS_SIZE === union * choice.d, i === answer, `option ${i} must ${i === answer ? "" : "not "}equal ${union}/${CLASS_SIZE}`);
    checkRatio(ratioText(choice.n, choice.d), choice.n, choice.d);
    // No option may be a giveaway: an impossible or certain probability is rejected on sight.
    assert.ok(choice.n > 0 && choice.n < choice.d, `option ${i} must be a probability strictly between 0 and 1`);
  });
  // The distractors are the three classic mistakes: no subtraction, double subtraction, and the intersection.
  assert.equal(choices[0].n, 30);
  assert.equal(choices[2].n, 16);
  assert.equal(choices[3].n, 7);
  assert.deepEqual(choices.map((choice) => ratioText(choice.n, choice.d)), [
    "30/32 = 15/16 ≈ 0.94",
    "23/32 ≈ 0.72",
    "16/32 = 1/2 = 0.50",
    "7/32 ≈ 0.22",
  ]);
  assert.equal(
    trySentence(),
    "Of the 32 students, 18 play a sport and 12 are in a club, but the 7 who do both sit in each of those counts, so P(sport or club) = (18 + 12 − 7)/32 = 23/32 ≈ 0.72."
  );
});

test("lesson source cites only brief standards and keeps its markup contract", () => {
  const source = readFileSync(path.join(process.cwd(), "components/lesson/ccss/lessons", `${SLUG}.tsx`), "utf8");
  assert.ok(source.startsWith('"use client";'));
  assert.match(source, /export default function Lesson\(\)/u);

  const cited = [...source.matchAll(/\b(?:(?:K|[1-8])\.[A-Z]{1,3}\.[A-D]\.\d+|[A-Z]-[A-Z]{1,3}\.[A-D]?\.?\d+)\b/g)].map((m) => m[0]);
  assert.ok(cited.length > 0, "the Math check must cite standards");
  for (const id of cited) assert.ok(BRIEF_STANDARDS.includes(id), `${id} is not in the chapter brief`);
  for (const must of BRIEF_STANDARDS) {
    assert.ok(cited.includes(must), `${must} must be cited`);
  }

  // The opening prose states no number at all, so no stepper position can contradict it.
  const opener = source.slice(source.indexOf('<div className="prose-lesson'), source.indexOf("<Figure caption="));
  assert.ok(opener.length > 400, "the opener slice must actually contain the two paragraphs");
  assert.doesNotMatch(opener, /\d/u, "the opening paragraphs must not pin the live survey to a fixed ratio");

  const svgTags = source.split("<svg").slice(1).map((rest) => rest.slice(0, rest.indexOf(">")));
  assert.equal(svgTags.length, 1);
  for (const tag of svgTags) {
    assert.ok(tag.includes("viewBox"), "every <svg> needs a viewBox");
    assert.ok(tag.includes('role="img"') && tag.includes("aria-label"), "every <svg> needs role=img and an aria-label");
  }

  // The conditioning toggle, the mapped Try-it option, Next step, Start over, and the stepper's decrease/increase pair.
  const buttonTags = source.split("<button").slice(1).map((rest) => rest.slice(0, rest.indexOf(">")));
  assert.equal(buttonTags.length, 6);
  for (const tag of buttonTags) assert.ok(tag.includes('type="button"'), "every <button> needs type=button");

  assert.match(source, /value=\{both\} min=\{BOTH_MIN\} max=\{BOTH_MAX\} step=\{BOTH_STEP\}/u);
  assert.match(source, /value=\{readOnly\} min=\{READ_ONLY_MIN\} max=\{READ_ONLY_MAX\} step=\{READ_ONLY_STEP\}/u);
  assert.match(source, /disabled=\{value <= min\}/u);
  assert.match(source, /disabled=\{value >= max\}/u);
  assert.match(source, /aria-label=\{`Decrease \$\{label\}`\}/u);
  assert.match(source, /aria-label=\{`Increase \$\{label\}`\}/u);
  assert.match(source, /aria-expanded=\{shown > 0\} aria-controls=\{stepsId\}/u);
  assert.match(source, /id=\{stepsId\}/u);
  assert.match(source, /aria-pressed=\{condOn === key\}/u);
  assert.match(source, /aria-pressed=\{picked === i\}/u);
  // Every claim the student reads comes from a tested builder, never from inline JSX arithmetic.
  for (const builder of [
    "{conditionalHeadline(c, condOn)}",
    "{columnSentence(c, condOn)}",
    "{comparisonSentence(c, condOn)}",
    "{jointText(c, condOn)}",
    "{independenceCheckLine(c)}",
    "{mc.partition}",
    "{mc.addition}",
    "{mc.conditional}",
    "{mc.multiplication}",
    "{mc.independence}",
    "{mc.counting}",
  ]) {
    assert.ok(source.includes(builder), `${builder} must be rendered from its tested builder`);
  }
  assert.doesNotMatch(source, /[\u3040-\u30ff\u3400-\u9fff]/u, "no CJK characters");
  assert.doesNotMatch(source, /Math\.random|fetch\(|localStorage|<form|dangerouslySetInnerHTML|next\/image/u);
});

test("the two-way table's rows and columns add up in every reachable survey", () => {
  // S-CP.4. Until this test existed the nine cells were inline JSX: three mutations
  // that broke the table's own sums (swapping a row total, a column total, and a
  // body cell) all passed the suite.
  let surveys = 0;
  for (let both = BOTH_MIN; both <= BOTH_MAX; both += BOTH_STEP) {
    for (let readOnly = READ_ONLY_MIN; readOnly <= READ_ONLY_MAX; readOnly += READ_ONLY_STEP) {
      surveys += 1;
      const c = counts(both, readOnly);
      const { rows, columns } = tableModel(c);
      const where = `both=${both}, readOnly=${readOnly}`;
      assert.equal(rows.length, 3, where);
      assert.equal(columns.length, 3, where);

      // Every row's two body cells add to its own total, and likewise every column.
      for (const row of rows) {
        assert.equal(row.cells[0] + row.cells[1], row.cells[2], `${where}: row "${row.header}" does not sum`);
      }
      for (let col = 0; col < 3; col += 1) {
        assert.equal(rows[0].cells[col] + rows[1].cells[col], rows[2].cells[col], `${where}: column ${columns[col]} does not sum`);
      }
      assert.equal(rows[2].cells[2], 200, `${where}: the grand total must be the 200 students`);

      // Each cell must be the count its header names — recomputed here, not read
      // back from the same structure.
      assert.deepEqual(rows[0].cells, [both, c.bandOnly, both + c.bandOnly], `${where}: band row`);
      assert.deepEqual(rows[1].cells, [readOnly, 200 - both - c.bandOnly - readOnly, 200 - both - c.bandOnly], `${where}: non-band row`);
      assert.deepEqual(rows[2].cells, [both + readOnly, 200 - both - readOnly, 200], `${where}: totals row`);
      for (const row of rows) for (const cell of row.cells) assert.ok(cell >= 0, `${where}: negative cell`);
    }
  }
  assert.equal(surveys, 63);
});

test("the rendered table is built from tableModel, not re-inlined", () => {
  const source = readFileSync(path.join(process.cwd(), "components/lesson/ccss/lessons", `${SLUG}.tsx`), "utf8");
  assert.match(source, /tableModel\(c\)\.rows\.map/u, "the tbody must render from the model");
  assert.equal(source.split("<td className=\"p-2 text-lg font-black\"").length - 1, 0, "no hand-placed body cells");
});
