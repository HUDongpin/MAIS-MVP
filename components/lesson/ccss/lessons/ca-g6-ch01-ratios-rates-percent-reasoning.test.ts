import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  ACCENT,
  BATCH_MAX,
  BATCH_MIN,
  BOT_Y,
  EXAMPLE,
  H,
  INK,
  JUICE,
  JUICE_MAX,
  JUICE_MIN,
  MARKER_R,
  MARKER_STROKE,
  PAD,
  STEPS,
  TOP_Y,
  TRY,
  TRY_ANSWER,
  W,
  WATER_MAX,
  WATER_MIN,
  choiceStyle,
  exampleSteps,
  figureState,
  fmt,
  gcd,
  isExactDecimal,
  mixed,
  percentOfWhole,
  plural,
  reduce,
  sameFraction,
  scaleRatio,
  solveExample,
  tickX,
  tryChoices,
  tryCorrectIndex,
  unitRate
} from "./ca-g6-ch01-ratios-rates-percent-reasoning";

const SLUG = "ca-g6-ch01-ratios-rates-percent-reasoning";
/** The standards listed in the chapter brief for us-ca-math-p6-chapter-01. */
const BRIEF_STANDARDS = ["6.RP.A.1", "6.RP.A.2", "6.RP.A.3"];
const source = readFileSync(path.join(process.cwd(), "components/lesson/ccss/lessons", `${SLUG}.tsx`), "utf8");

/** Brute-force greatest common divisor, independent of the lesson's Euclid recursion. */
function slowGcd(a: number, b: number) {
  let g = 1;
  for (let d = 2; d <= Math.min(a, b); d += 1) if (a % d === 0 && b % d === 0) g = d;
  return g;
}
function slowReduce(num: number, den: number) {
  const g = slowGcd(num, den);
  return { num: num / g, den: den / g };
}

/**
 * The decimal string a correct rounding of num/den to `places` digits produces,
 * computed with integers only (no call into the lesson's formatter).
 */
function decimalString(num: number, den: number, places: number) {
  const scale = 10 ** places;
  let q = Math.floor((num * scale) / den);
  if ((num * scale - q * den) * 2 >= den) q += 1;
  const whole = Math.floor(q / scale);
  const frac = String(q - whole * scale).padStart(places, "0").replace(/0+$/u, "");
  return frac.length > 0 ? `${whole}.${frac}` : String(whole);
}
/** True when that displayed decimal names the very same rational number. */
function decimalIsExact(num: number, den: number, places: number) {
  const shown = decimalString(num, den, places);
  const [w, fr = ""] = shown.split(".");
  const scaled = Number(w) * 10 ** places + Number(fr.padEnd(places, "0") || "0");
  return scaled * den === num * 10 ** places;
}
/** num/den as a whole number and a proper fraction, e.g. 100/3 -> "33 1/3". */
function mixedString(num: number, den: number) {
  const f = slowReduce(num, den);
  if (f.num % f.den === 0) return String(f.num / f.den);
  const w = Math.floor(f.num / f.den);
  return w === 0 ? `${f.num}/${f.den}` : `${w} ${f.num - w * f.den}/${f.den}`;
}
const countOf = (haystack: string, needle: string) => haystack.split(needle).length - 1;
/** Everything between `<button ` and its `</button>`, so an attribute containing `=>` is not truncated. */
const buttonChunks = (text: string) =>
  text
    .split("<button ")
    .slice(1)
    .map((chunk) => chunk.slice(0, chunk.indexOf("</button>")));

/** Number/noun agreement over every sentence the figure shows. */
function assertAgreement(text: string) {
  for (const m of text.matchAll(/(\d+(?:\.\d+)?)\s+(?:equal\s+)?(cups?|batch(?:es)?|parts?)\b/gu)) {
    const isSingularNoun = m[2] === "cup" || m[2] === "batch" || m[2] === "part";
    assert.equal(isSingularNoun, Number(m[1]) === 1, `"${m[0]}" in: ${text}`);
  }
  // A count can also govern a verb rather than a noun ("1 of them is juice"). The
  // noun sweep above cannot see that, so a=1 shipped "1 of them are juice".
  for (const m of text.matchAll(/(\d+) of them (are|is)\b/gu)) {
    assert.equal(m[2] === "is", Number(m[1]) === 1, `"${m[0]}" in: ${text}`);
  }
}

test("the figure's rendered numbers and sentences are true in every one of the 180 states", () => {
  let states = 0;
  for (let a = JUICE_MIN; a <= JUICE_MAX; a += 1) {
    for (let b = WATER_MIN; b <= WATER_MAX; b += 1) {
      for (let n = BATCH_MIN; n <= BATCH_MAX; n += 1) {
        states += 1;
        const s = figureState(a, b, n);
        const whole = a + b;
        const g = slowGcd(a, b);

        // --- the quantities the figure is built on ------------------------
        assert.equal(gcd(a, b), g);
        assert.deepEqual(reduce(a, b), { num: a / g, den: b / g });
        assert.deepEqual(scaleRatio(a, b, n), [a * n, b * n]);
        assert.equal(s.ja, a * n);
        assert.equal(s.wa, b * n);
        assert.equal(s.whole, whole);
        assert.deepEqual(s.simplest, { num: a / g, den: b / g });
        // the headline unit rate is a ÷ b for the ratio a : b it is shown beside
        assert.deepEqual(s.rate, slowReduce(a, b));
        assert.equal(s.rate.num * b, s.rate.den * a); // rate = a/b, by cross-multiplication
        assert.deepEqual(s.flip, slowReduce(b, a));
        assert.equal(s.flip.num * a, s.flip.den * b); // flip = b/a, the other unit rate
        // the two rates are reciprocals, so their product is exactly 1
        assert.equal(s.rate.num * s.flip.num, s.rate.den * s.flip.den);
        assert.deepEqual(s.pct, slowReduce(100 * a, whole));
        assert.equal(s.pct.num * whole, 100 * a * s.pct.den);
        assert.deepEqual(s.waterPct, slowReduce(100 * b, whole));
        assert.equal(s.waterPct.num * whole, 100 * b * s.waterPct.den);
        // the two shares add to exactly 100 per 100
        assert.equal(s.pct.num * s.waterPct.den + s.waterPct.num * s.pct.den, 100 * s.pct.den * s.waterPct.den);
        // scaling changes neither the percent nor the unit rate
        assert.deepEqual(percentOfWhole(s.ja, s.ja + s.wa), s.pct);
        assert.deepEqual(unitRate(s.wa, s.ja), s.rate);

        // --- the ratio table --------------------------------------------
        assert.deepEqual(s.rows.map((r) => r.label), ["juice (cups)", "water (cups)", "punch (cups)"]);
        assert.deepEqual(s.rows.map((r) => r.per), [a, b, whole]);
        assert.deepEqual(s.rows.map((r) => r.color), [JUICE, ACCENT, INK]);
        assert.deepEqual(s.batchCols, [1, 2, 3, 4, 5]);
        for (const row of s.rows) assert.equal(row.cells.length, STEPS);
        for (let k = 1; k <= STEPS; k += 1) {
          const juice = s.rows[0].cells[k - 1];
          const water = s.rows[1].cells[k - 1];
          const punch = s.rows[2].cells[k - 1];
          assert.equal(juice, a * k);
          assert.equal(water, b * k);
          assert.equal(punch, whole * k);
          assert.equal(punch, juice + water); // the punch column really is the two parts together
          assert.ok(juice >= 1 && water >= 1 && punch >= 2, `column ${k}: ${juice}/${water}/${punch}`);
          assert.equal(s.batchCols[k - 1], k);
        }

        // --- the double number line -------------------------------------
        // label, colour, y and tick values travel together, so the figure cannot
        // draw the juice numbers on the water line or vice versa
        assert.equal(s.lines.length, 2);
        assert.deepEqual(s.lines.map((l) => l.label), ["juice", "water"]);
        assert.deepEqual(s.lines.map((l) => l.color), [JUICE, ACCENT]);
        assert.deepEqual(s.lines.map((l) => l.y), [TOP_Y, BOT_Y]);
        assert.deepEqual(s.lines.map((l) => l.per), [a, b]);
        assert.deepEqual(s.lines.map((l) => l.ticks.length), [STEPS + 1, STEPS + 1]);
        for (let k = 0; k <= STEPS; k += 1) {
          // written out, not delegated: the k-th juice tick is k lots of a, the k-th water tick k lots of b
          let juiceTick = 0;
          let waterTick = 0;
          for (let i = 0; i < k; i += 1) {
            juiceTick += a;
            waterTick += b;
          }
          assert.equal(s.lines[0].ticks[k], juiceTick);
          assert.equal(s.lines[1].ticks[k], waterTick);
          // and each tick pair reads the same column the table shows at that batch
          if (k >= 1) {
            assert.equal(s.lines[0].ticks[k], s.rows[0].cells[k - 1]);
            assert.equal(s.lines[1].ticks[k], s.rows[1].cells[k - 1]);
          }
        }
        assert.equal(s.lines[0].ticks[0], 0);
        assert.equal(s.lines[1].ticks[0], 0);
        assert.equal(s.lines[0].ticks[n], s.ja); // the marked tick is the equivalent ratio
        assert.equal(s.lines[1].ticks[n], s.wa);
        // the accessible description announces the very numbers the marked ticks show
        assert.ok(s.svgLabel.includes(`lines up ${s.lines[0].ticks[n]} `), s.svgLabel);
        assert.ok(s.svgLabel.includes(`with ${s.lines[1].ticks[n]} `), s.svgLabel);
        assert.ok(Math.abs(s.markerX - (PAD + n * ((W - 2 * PAD) / STEPS))) < 1e-9);

        // --- the tape diagram: `whole` equal cells, the first `a` of them juice
        assert.equal(s.tapeCells.length, whole);
        for (let i = 0; i < whole; i += 1) {
          assert.equal(s.tapeCells[i].index, i);
          assert.equal(s.tapeCells[i].part, i < a ? "juice" : "water");
          assert.equal(s.tapeCells[i].color, i < a ? JUICE : ACCENT);
        }
        const juiceCells = s.tapeCells.filter((c) => c.part === "juice").length;
        const waterCells = s.tapeCells.filter((c) => c.part === "water").length;
        assert.equal(juiceCells, a);
        assert.equal(waterCells, b);
        assert.equal(juiceCells + waterCells, s.tapeCells.length);
        // equal cells, so the juice run's share of the strip is exactly the announced percent
        assert.equal(juiceCells * 100 * s.pct.den, s.pct.num * s.tapeCells.length);
        // and the cells split in the ratio the figure names
        assert.equal(juiceCells * b, waterCells * a);

        // --- displayed decimals, recomputed with integer arithmetic -------
        const rateStr = decimalString(a, b, 2), rateExact = decimalIsExact(a, b, 2);
        const flipStr = decimalString(b, a, 2), flipExact = decimalIsExact(b, a, 2);
        const pctStr = decimalString(100 * a, whole, 1), pctExact = decimalIsExact(100 * a, whole, 1);
        const waterStr = decimalString(100 * b, whole, 1), waterExact = decimalIsExact(100 * b, whole, 1);
        assert.equal(fmt(s.rate, 2), rateStr);
        assert.equal(fmt(s.flip, 2), flipStr);
        assert.equal(fmt(s.pct), pctStr);
        assert.equal(fmt(s.waterPct), waterStr);
        assert.equal(isExactDecimal(s.rate, 2), rateExact);
        assert.equal(isExactDecimal(s.flip, 2), flipExact);
        assert.equal(isExactDecimal(s.pct, 1), pctExact);
        assert.equal(isExactDecimal(s.waterPct, 1), waterExact);
        assert.equal(mixed(s.pct), mixedString(100 * a, whole));
        assert.equal(mixed(s.rate), mixedString(a, b));

        // --- the three stat cards ---------------------------------------
        const cup = a === b ? "cup" : "cups"; // either unit rate is 1 cup exactly when a === b
        const rateText = `${rateExact ? "" : "≈ "}${rateStr} ${cup} of juice per 1 cup of water`;
        const flipText = `${flipExact ? "" : "≈ "}${flipStr} ${cup} of water per 1 cup of juice`;
        const rateNote = rateExact ? "" : ` (exactly ${mixedString(a, b)})`;
        const flipNoteText = flipExact ? "" : ` (exactly ${mixedString(b, a)})`;
        const pctNote = pctExact ? "" : ` (exactly ${mixedString(100 * a, whole)} per 100)`;
        assert.deepEqual(s.cards, [
          {
            label: "Equivalent ratio",
            color: INK,
            headline: `${a * n} : ${b * n}`,
            sub: `same as ${a} : ${b}${g > 1 ? `, or ${a / g} : ${b / g}` : ""}`
          },
          {
            label: "Unit rate",
            color: ACCENT,
            headline: rateText,
            sub: `${a} ÷ ${b} ${rateExact ? "=" : "≈"} ${rateStr}${rateNote}`
          },
          {
            label: "Percent juice",
            color: JUICE,
            headline: `${pctExact ? "" : "≈ "}${pctStr}%`,
            sub: `juice is ${a} of every ${whole} cups, so ${a}/${whole} ${pctExact ? "=" : "≈"} ${pctStr}/100${pctNote}; water is ${waterExact ? "" : "≈ "}${waterStr}%`
          }
        ]);
        // a rounded headline is never shown bare, and an exact one is never hedged
        assert.equal(s.cards[1].headline.startsWith("≈"), !rateExact);
        assert.equal(s.cards[2].headline.startsWith("≈"), !pctExact);
        // the card headed "Unit rate" divides the ratio in the order the figure displays it
        assert.equal(s.cards[1].label, "Unit rate");
        assert.ok(s.cards[1].sub.startsWith(`${s.ratioText.split(" : ")[0]} ÷ ${s.ratioText.split(" : ")[1]} `), s.cards[1].sub);
        assert.ok(s.cards[1].headline.endsWith("of juice per 1 cup of water"), s.cards[1].headline);

        // --- the remaining sentences ------------------------------------
        assert.equal(s.flipNote, `Every ratio has two unit rates: ${rateText}, and, the other way round, ${flipText}.`);
        assert.equal(
          s.tapeCaption,
          `Tape diagram: one whole batch, cut into equal parts, ${a} juice and ${b} water`
        );
        assert.equal(
          s.tapeLabel,
          `Tape diagram: one batch is cut into ${whole} equal parts, ${a} juice and ${b} water, so the juice fills ${pctExact ? "" : "about "}${pctStr} percent of the strip`
        );
        // the "equal parts" the two tape sentences promise are cells that exist
        assert.equal(s.tapeCells.length, Number(/cut into (\d+) equal parts/u.exec(s.tapeLabel)?.[1]));
        assert.equal(
          s.svgLabel,
          `Double number line: the marked point at ${n} ${n === 1 ? "batch" : "batches"} lines up ${a * n} ${a * n === 1 ? "cup" : "cups"} of juice with ${b * n} ${b * n === 1 ? "cup" : "cups"} of water`
        );
        assert.equal(
          s.recipeLine,
          `${a} ${a === 1 ? "cup" : "cups"} of orange juice for every ${b} ${b === 1 ? "cup" : "cups"} of sparkling water`
        );
        assert.equal(s.ratioText, `${a} : ${b}`);

        // --- the Math check, sentence by sentence ------------------------
        assert.equal(
          s.mathCheck.ratio,
          `A ratio such as ${a} : ${b} says how two amounts go together: ${a} ${a === 1 ? "cup" : "cups"} of juice for every ${b} ${b === 1 ? "cup" : "cups"} of water (6.RP.A.1).`
        );
        assert.equal(
          s.mathCheck.equivalent,
          `Multiplying both parts by the same number of batches gives an equivalent ratio, ${a * n} : ${b * n} at ${n} ${n === 1 ? "batch" : "batches"}, which is why every column of the table and every pair of tick marks on the double number line stay in step (6.RP.A.3).`
        );
        assert.equal(
          s.mathCheck.unitRate,
          `Dividing instead of multiplying gives a unit rate, and every ratio has two of them: ${a} ÷ ${b} ${rateExact ? "=" : "≈"} ${rateStr}${rateNote} gives ${rateText}, and ${b} ÷ ${a} ${flipExact ? "=" : "≈"} ${flipStr}${flipNoteText} gives ${flipText}. For a ratio a : b the standard form is a ÷ b, the first amount per one of the second; that is the rate on the card above, and it is the form the Unit Rate lesson uses (6.RP.A.2).`
        );
        // the prose rule and the card agree: both divide first amount by second
        assert.ok(s.mathCheck.unitRate.includes(`${a} ÷ ${b} ${rateExact ? "=" : "≈"} ${rateStr}${rateNote} gives ${s.cards[1].headline}`));
        assert.equal(
          s.mathCheck.percent,
          `A percent is a rate per 100, and it measures the juice against the whole batch instead of against the water: juice is ${a} of every ${whole} cups, so out of 100 cups it is ${pctExact ? "" : "about "}${pctStr}, written ${pctExact ? "" : "about "}${pctStr}%${pctNote} (6.RP.A.3).`
        );
        assert.equal(
          s.mathCheck.tape,
          `The tape diagram makes that split visible: one batch is cut into ${whole} equal parts and ${a} of them ${a === 1 ? "is" : "are"} juice, so the juice's share of the whole strip is the percent. Scaling multiplies the part and the whole by the same factor, so that share is the same in every batch (6.RP.A.3).`
        );

        // --- grammar: no "1 cups", no "2 batch", no "1 parts" -------------
        for (const text of [
          s.recipeLine,
          s.flipNote,
          s.tapeCaption,
          s.tapeLabel,
          s.svgLabel,
          ...s.cards.flatMap((c) => [c.label, c.headline, c.sub]),
          ...Object.values(s.mathCheck)
        ]) {
          assertAgreement(text);
        }
      }
    }
  }
  assert.equal(states, (JUICE_MAX - JUICE_MIN + 1) * (WATER_MAX - WATER_MIN + 1) * (BATCH_MAX - BATCH_MIN + 1));
  assert.equal(states, 180);
  assert.equal(plural(1, "cup"), "cup");
  assert.equal(plural(2, "cup"), "cups");
  assert.equal(plural(1, "batch", "batches"), "batch");
  assert.equal(plural(5, "batch", "batches"), "batches");
});

test("every marker and tick the figure draws stays inside the viewBox", () => {
  const half = MARKER_STROKE / 2;
  for (let a = JUICE_MIN; a <= JUICE_MAX; a += 1) {
    for (let b = WATER_MIN; b <= WATER_MAX; b += 1) {
      for (let n = BATCH_MIN; n <= BATCH_MAX; n += 1) {
        const s = figureState(a, b, n);
        // the marker the component actually draws, not tickX in isolation
        assert.ok(s.markerX - MARKER_R - half >= 0, `marker left edge at ${s.markerX}`);
        assert.ok(s.markerX + MARKER_R + half <= W, `marker right edge at ${s.markerX}`);
        assert.ok(s.markerX >= PAD - 1e-9 && s.markerX <= W - PAD + 1e-9, `marker off the line at ${s.markerX}`);
        // the widest tick label at this state, centred on the last tick, still fits the pad
        const drawn = s.lines.flatMap((line) => line.ticks);
        assert.equal(drawn.length, 2 * (STEPS + 1));
        const widest = Math.max(...drawn);
        assert.equal(widest, Math.max(a, b) * STEPS);
        assert.ok((String(widest).length * 8) / 2 <= PAD, `label ${widest} overflows the pad`);
        // every tick label sits on a tick that is on the line
        for (const line of s.lines) {
          assert.equal(line.y === TOP_Y || line.y === BOT_Y, true);
          line.ticks.forEach((value, k) => {
            assert.ok(Number.isInteger(value) && value >= 0, `tick ${k} of ${line.label} is ${value}`);
            assert.ok(tickX(k) >= PAD - 1e-9 && tickX(k) <= W - PAD + 1e-9);
          });
        }
      }
    }
  }
  for (let k = 0; k <= STEPS; k += 1) {
    const x = tickX(k);
    assert.ok(Math.abs(x - (PAD + k * ((W - 2 * PAD) / STEPS))) < 1e-9);
    assert.ok(x >= PAD - 1e-9 && x <= W - PAD + 1e-9, `tick ${k} at ${x}`);
  }
  assert.equal(tickX(0), PAD);
  assert.equal(tickX(STEPS), W - PAD);
  for (const y of [TOP_Y, BOT_Y]) {
    assert.ok(y - MARKER_R - half >= 0);
    assert.ok(y + 24 + 13 <= H); // tick labels sit 24px below the line at 13px
  }
  assert.ok(TOP_Y + 24 + 13 < BOT_Y - MARKER_R, "top labels must not collide with the bottom line");
});

test("rounded decimals are formatted and flagged correctly across every value the figure can reach", () => {
  for (let den = 1; den <= 12; den += 1) {
    for (let num = 1; num <= 600; num += 1) {
      const f = reduce(num, den);
      for (const places of [1, 2]) {
        assert.equal(fmt(f, places), decimalString(num, den, places), `${num}/${den} at ${places} places`);
        assert.equal(isExactDecimal(f, places), decimalIsExact(num, den, places), `${num}/${den} exactness`);
      }
      assert.equal(mixed(f), mixedString(num, den));
      const parts = mixed(f).split(/[ /]/u).map(Number);
      const value = parts.length === 1 ? parts[0] : parts.length === 2 ? parts[0] / parts[1] : parts[0] + parts[1] / parts[2];
      assert.ok(Math.abs(value - num / den) < 1e-12, `${mixed(f)} is not ${num}/${den}`);
    }
  }
});

test("worked example steps equal the independently computed values", () => {
  assert.deepEqual(EXAMPLE, { juice: 2, water: 3, targetJuice: 10 });
  const ex = solveExample();
  const steps = exampleSteps();
  assert.equal(steps.length, 4);
  // step 1: 10 ÷ 2 = 5 batches
  assert.equal(10 / 2, 5);
  assert.equal(ex.factor, 5);
  assert.equal(steps[0].text, "10 ÷ 2 = 5, so the bigger recipe is 5 batches of the original.");
  // step 2: 3 × 5 = 15 cups of water; 10 : 15 reduces to 2 : 3
  assert.equal(3 * 5, 15);
  assert.equal(ex.water, 15);
  assert.deepEqual(reduce(10, 15), { num: 2, den: 3 });
  assert.equal(
    steps[1].text,
    "3 × 5 = 15 cups of water. Both parts were multiplied by 5, so 10 : 15 is equivalent to 2 : 3."
  );
  // step 3: unit rate 3 ÷ 2 = 1.5, and 1.5 × 10 = 15
  assert.deepEqual(ex.rate, { num: 3, den: 2 });
  assert.equal(decimalString(3, 2, 2), "1.5");
  assert.equal(1.5 * 10, 15);
  assert.equal(isExactDecimal(ex.rate, 2), true);
  assert.equal(
    steps[2].text,
    "3 ÷ 2 = 1.5 cups of water for each cup of juice, and 1.5 × 10 = 15. Same answer."
  );
  // step 4: one batch is 2 + 3 = 5 cups; 100·2/5 = 40; after scaling 100·10/25 = 40
  assert.equal(ex.total, 5);
  assert.equal(ex.scaledTotal, 25);
  assert.equal((100 * 2) / 5, 40);
  assert.equal((100 * 10) / 25, 40);
  assert.deepEqual(ex.percent, { num: 40, den: 1 });
  assert.deepEqual(ex.scaledPercent, { num: 40, den: 1 });
  assert.equal(
    steps[3].text,
    "One batch is 2 + 3 = 5 cups, and 2/5 = 40/100, so the punch is 40% juice. After scaling, 10/25 is still 40%."
  );
  for (const step of steps) {
    assert.ok(step.title.length > 8);
    assertAgreement(step.text);
  }
});

test("Try it: the marked choice is the true percent and every distractor differs from it", () => {
  assert.deepEqual(TRY, { juice: 1, water: 4 });
  // 1 cup of juice in 1 + 4 = 5 cups of punch: 100 × 1 ÷ 5 = 20 per 100
  const expected = { num: (100 * 1) / 5, den: 1 };
  assert.deepEqual(expected, { num: 20, den: 1 });
  assert.deepEqual(TRY_ANSWER, expected);
  const choices = tryChoices();
  assert.equal(choices.length, 4);
  const idx = tryCorrectIndex();
  assert.ok(idx >= 0 && idx < 4);
  assert.deepEqual(choices[idx].value, expected);
  assert.equal(choices.filter((c) => sameFraction(c.value, expected)).length, 1);
  const shown = choices.map((c) => c.text);
  assert.equal(new Set(shown).size, 4);
  // distractors: part-to-part 100·1/4 = 25, water's share 100·4/5 = 80, double 2·20 = 40
  assert.deepEqual([...shown].sort(), ["20%", "25%", "40%", "80%"]);
  assert.equal(shown[idx], "20%");
  // the index the component paints green is the index of the true value, not a position
  assert.equal(idx, 1);
  assert.equal(shown.indexOf("20%"), idx);
  for (const c of choices) {
    assert.ok(c.why.length > 20);
    assert.equal(c.text, `${decimalString(c.value.num, c.value.den, 1)}%`);
  }
  // only the correct choice's explanation may open with "Yes"
  assert.equal(choices.filter((c) => c.why.startsWith("Yes.")).length, 1);
  assert.ok(choices[idx].why.startsWith("Yes."));
});

test("the selected Try it button keeps a readable label in light and dark", () => {
  for (const isCorrect of [true, false]) {
    assert.deepEqual(choiceStyle(false, isCorrect), { borderColor: "var(--line)", color: "var(--ink-soft)" });
    const key = isCorrect ? "var(--band-upper)" : "var(--ink-faint)";
    const picked = choiceStyle(true, isCorrect);
    assert.deepEqual(picked, {
      background: `color-mix(in oklab, ${key} 18%, var(--surface))`,
      borderColor: key,
      color: "var(--ink)"
    });
    // the label rides on the theme's own ink token over a tint of the theme's own surface,
    // so it never becomes white text on a light --ink-soft panel in dark mode
    assert.equal(picked.color, "var(--ink)");
    assert.ok(String(picked.background).includes("var(--surface)"));
    assert.ok(!String(picked.background).includes("--ink-soft"));
  }
  assert.doesNotMatch(source, /background: "var\(--ink-soft\)"/u);
  assert.doesNotMatch(source, /color: "white"/u);
});

test("the lesson renders that model, names the tape diagram, and cites only brief standards", () => {
  assert.ok(source.startsWith('"use client";'));
  assert.match(source, /export default function Lesson\(\)/u);
  const body = source.slice(source.indexOf("export default function Lesson"));

  // every displayed value flows through figureState, which the grid test checks
  assert.match(body, /const s = figureState\(a, b, n\);/u);
  for (const field of [
    "s.recipeLine",
    "s.ratioText",
    "s.flipNote",
    "s.tapeCaption",
    "s.tapeLabel",
    "s.svgLabel",
    "s.batchCols.map",
    "s.rows.map",
    "s.cards.map",
    "s.lines.map",
    "s.tapeCells.map",
    "s.mathCheck.ratio",
    "s.mathCheck.equivalent",
    "s.mathCheck.unitRate",
    "s.mathCheck.percent",
    "s.mathCheck.tape"
  ]) {
    assert.equal(countOf(body, field), 1, `${field} must be rendered exactly once`);
  }
  assert.equal(countOf(body, ">{card.label}</div>"), 1);
  assert.equal(countOf(body, ">{card.headline}</div>"), 1);
  assert.equal(countOf(body, ">{card.sub}</div>"), 1);
  assert.equal(countOf(body, ">{row.label}</th>"), 1);
  assert.equal(countOf(body, ">{value}</td>"), 1);
  // the highlighted column is the marked batch, in the header and in every body row
  assert.equal(countOf(body, "style={k === n ? { background: TINT, color: ACCENT } : undefined}"), 1);
  assert.equal(countOf(body, "style={i + 1 === n ? { background: TINT, fontWeight: 800 } : undefined}"), 1);

  // the double number line: one call site, each line's ticks/colour/label taken from the same record
  assert.equal(countOf(body, "<NumberLine"), 1);
  assert.equal(
    countOf(body, "<NumberLine key={line.label} y={line.y} ticks={line.ticks} markerIndex={n} markerX={s.markerX} color={line.color} label={line.label} />"),
    1
  );
  // the 12 tick numbers are the model's values, drawn at the tick they belong to
  assert.equal(countOf(body, "{ticks.map((value, k) => ("), 1);
  assert.equal(countOf(body, 'fontFamily="var(--font-mono)">{value}</text>'), 1);
  assert.equal(countOf(body, "x={tickX(k)} y={y + 24}"), 1);
  assert.equal(countOf(body, "x1={tickX(k)} y1={y - 7} x2={tickX(k)} y2={y + 7}"), 1);
  assert.equal(countOf(body, "fontWeight={k === markerIndex ? 800 : 500}"), 1);
  assert.equal(countOf(body, "s.markerX"), 3); // the dashed connector's two ends, and the shared marker
  assert.equal(countOf(body, "markerX={s.markerX}"), 1);
  assert.equal(countOf(body, "cx={markerX}"), 1);
  assert.match(body, /r=\{MARKER_R\}/u);
  assert.match(body, /strokeWidth=\{MARKER_STROKE\}/u);

  // the tape strip draws one equal cell per part, coloured by the model
  assert.equal(countOf(body, 'className="flex-1" style={{ background: cell.color }}'), 1);
  assert.equal(countOf(body, "key={cell.index}"), 1);
  assert.match(body, /className="flex h-8 w-full gap-px [^"]*"/u);

  // the worked example reveals a prefix of the steps, in order
  assert.equal(countOf(body, "steps.slice(0, revealed).map"), 1);
  assert.equal(countOf(body, "Math.min(steps.length, k + 1)"), 1);
  assert.equal(countOf(body, "disabled={revealed >= steps.length}"), 1);

  // the Try it colouring and verdict both key off the derived correct index
  assert.equal(countOf(body, "const correct = tryCorrectIndex();"), 1);
  assert.equal(countOf(body, "style={choiceStyle(pick === i, i === correct)}"), 1);
  assert.equal(countOf(body, '{pick === correct ? "Correct." : "Not quite."}'), 1);
  assert.equal(countOf(body, "aria-pressed={pick === i}"), 1);
  assert.equal(countOf(body, "{choices[pick].why}"), 1);

  // nothing the student reads is recomputed inside the component
  for (const helper of ["fmt(", "mixed(", "approx(", "relate(", "aboutWord(", "exactNote(", "cupWord(", "percentOfWhole(", "unitRate(", "scaleRatio(", "figureLabel("]) {
    assert.ok(!body.includes(helper), `${helper} is called inside the component; displayed values must come from figureState`);
  }

  const cited = [...source.matchAll(/\b(?:K|[1-8])\.[A-Z]{1,3}\.[A-D]\.\d+\b/gu)].map((m) => m[0]);
  assert.ok(cited.length > 0, "the Math check must cite at least one standard");
  for (const id of cited) assert.ok(BRIEF_STANDARDS.includes(id), `${id} is not in the chapter brief`);
  for (const id of BRIEF_STANDARDS) assert.ok(cited.includes(id), `${id} from the brief is never cited`);
  // each cited standard is attached to the sentence that actually develops it
  const demo = figureState(2, 3, 2);
  assert.ok(demo.mathCheck.ratio.includes("(6.RP.A.1)"));
  assert.ok(demo.mathCheck.unitRate.includes("(6.RP.A.2)"));
  assert.ok(demo.mathCheck.unitRate.includes("For a ratio a : b the standard form is a ÷ b"));
  assert.ok(demo.mathCheck.equivalent.includes("(6.RP.A.3)"));
  assert.ok(demo.mathCheck.tape.includes("(6.RP.A.3)"));
  assert.ok(demo.mathCheck.percent.includes("against the whole batch instead of against the water"));
  // 2 : 3 -> the card shows 2 ÷ 3, the standard form, not its reciprocal
  assert.equal(demo.cards[1].sub, "2 ÷ 3 ≈ 0.67 (exactly 2/3)");
  assert.equal(demo.cards[1].headline, "≈ 0.67 cups of juice per 1 cup of water");
  assert.equal(demo.tapeCells.length, 5);

  const svgs = [...source.matchAll(/<svg\b[^>]*>/gu)].map((m) => m[0]);
  assert.equal(svgs.length, 1);
  for (const tag of svgs) {
    assert.match(tag, /viewBox=/u);
    assert.match(tag, /role="img"/u);
    assert.match(tag, /aria-label=\{s\.svgLabel\}/u);
  }
  // the tape diagram is an image too, and it is named in visible copy, not only in the label
  const images = [...source.matchAll(/<(?:svg|div)\b[^>]*role="img"[^>]*>/gu)].map((m) => m[0]);
  assert.equal(images.length, 2);
  for (const tag of images) assert.match(tag, /aria-label=\{s\.(?:svgLabel|tapeLabel)\}/u);
  assert.ok(images.some((tag) => tag.startsWith("<div") && tag.includes("aria-label={s.tapeLabel}")));
  assert.match(source, /Tape diagram: one whole batch, cut into equal parts/u);
  assert.match(source, /the tape diagram and the percent measure the juice against the whole batch/u);

  const buttons = [...source.matchAll(/<button\b[^>]*>/gu)].map((m) => m[0]);
  assert.ok(buttons.length >= 5, "steppers, worked example, and Try it all need buttons");
  for (const tag of buttons) assert.match(tag, /type="button"/u);

  assert.doesNotMatch(source, /[　-ヿ㐀-䶿一-鿿＀-￯]/u, "no CJK characters");
  assert.doesNotMatch(source, /Math\.random|fetch\(|localStorage|dangerouslySetInnerHTML|<form|next\/image/u);

  // the inline control bounds are the ones the grid test enumerated, and each
  // stepper drives its own state through its own setter
  const stepper = (label: string) => {
    const m = source.match(
      new RegExp(`<Stepper label="${label}" value=\\{(\\w+)\\} min=\\{(\\d+)\\} max=\\{(\\d+)\\} color=\\{(\\w+)\\} onChange=\\{(\\w+)\\} />`, "u")
    );
    assert.ok(m, `${label} stepper must declare value, inline min/max, colour and setter in that order`);
    return { value: m[1], min: Number(m[2]), max: Number(m[3]), color: m[4], setter: m[5] };
  };
  const juiceStepper = stepper("Juice per batch");
  assert.deepEqual([juiceStepper.min, juiceStepper.max], [JUICE_MIN, JUICE_MAX]);
  assert.equal(juiceStepper.value, "a");
  assert.equal(juiceStepper.setter, "setA");
  assert.equal(juiceStepper.color, "JUICE");
  const waterStepper = stepper("Water per batch");
  assert.deepEqual([waterStepper.min, waterStepper.max], [WATER_MIN, WATER_MAX]);
  assert.equal(waterStepper.value, "b");
  assert.equal(waterStepper.setter, "setB");
  assert.equal(waterStepper.color, "ACCENT");
  assert.match(body, /const \[a, setA\] = useState\(2\);/u);
  assert.match(body, /const \[b, setB\] = useState\(3\);/u);
  assert.match(body, /const \[n, setN\] = useState\(2\);/u);
  const range = source.match(/type="range" min=\{(\d+)\} max=\{(\d+)\} value=\{n\}/u);
  assert.ok(range, "the batches range input must declare inline min/max");
  assert.deepEqual([Number(range[1]), Number(range[2])], [BATCH_MIN, BATCH_MAX]);
  assert.equal(STEPS, BATCH_MAX);

  // + raises and clamps at max, − lowers and clamps at min: the glyph, the
  // handler, the disabled bound and the accessible name all agree
  const chunks = buttonChunks(body);
  const increase = chunks.filter((c) => c.includes("aria-label={`Increase ${label}`}"));
  const decrease = chunks.filter((c) => c.includes("aria-label={`Decrease ${label}`}"));
  assert.equal(increase.length, 1);
  assert.equal(decrease.length, 1);
  assert.ok(increase[0].includes("onChange(Math.min(max, value + 1))"), "+ must clamp upward at max");
  assert.ok(increase[0].includes("disabled={value >= max}"));
  assert.ok(increase[0].endsWith(">+"), "the + glyph must sit on the increase handler");
  assert.ok(decrease[0].includes("onChange(Math.max(min, value - 1))"), "− must clamp downward at min");
  assert.ok(decrease[0].includes("disabled={value <= min}"));
  assert.ok(decrease[0].endsWith(">−"), "the − glyph must sit on the decrease handler");
});
