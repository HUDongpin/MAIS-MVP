import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import chapterMeta from "@/data/generated-content/ccss-textbook-claude-v1/lessons/ca-g12-ch01-quantities-units-precision.meta.json";
import chapterSnapshot from "@/data/generated-content/ccss-textbook-claude-v1/source.json";
import {
  FUEL_HALF_ML,
  FUEL_ML,
  L_MAX,
  L_MIN,
  L_STEP,
  MAX_DECIMALS,
  MIN_BAND_HALF_PX,
  MM2_PER_M2,
  MM_PER_M,
  ORIGIN_X,
  ORIGIN_Y,
  PER_KM,
  PLACE_NAMES,
  PX_PER_M,
  READING,
  SVG_H,
  SVG_W,
  TENTH_MM,
  TICK,
  TOOLS,
  TRIP_HALF_M,
  TRIP_M,
  W_MAX,
  W_MIN,
  W_STEP,
  bandExaggeration,
  bandScaleNote,
  cmText,
  figureLabel,
  firstDoubtfulPlace,
  fixed,
  fuelExample,
  layout,
  outwardScaled,
  quantity,
  roundDiv,
  significantDigits,
  tool,
  tryAnswerIndex,
  tryChoices,
  writeDecimal,
  type QuantityKey,
  type ToolKey,
} from "./ca-g12-ch01-quantities-units-precision";

const SLUG = "ca-g12-ch01-quantities-units-precision";
const BRIEF_STANDARDS = ["N-Q.1", "N-Q.2", "N-Q.3"];
const QUANTITIES: QuantityKey[] = ["area", "perimeter"];
const TOOL_KEYS: ToolKey[] = ["tape", "laser"];
/** Generous glyph width for bold 12px digits, used only for SVG text bounds. */
const GLYPH_12 = 7.5;
/** One step at decimal place d, written out, so the lesson's step labels are checked by hand. */
const STEP_TEXT = ["1", "0.1", "0.01", "0.001", "0.0001"];

test("chapter-check metadata distinguishes a nominal area from the midpoint of its uncertainty interval", () => {
  assert.deepEqual(chapterSnapshot.practiceBySlug[SLUG], chapterMeta.practice);
  const check = chapterMeta.practice[2];
  const dimensions = check.prompt.match(/as (\d+) cm and (\d+) cm/);
  assert.ok(dimensions, "The chapter check must state both nominal lengths in centimeters.");
  const length = Number(dimensions[1]), width = Number(dimensions[2]);
  const nominal = length * width;
  const lower = (length - 0.5) * (width - 0.5), upper = (length + 0.5) * (width + 0.5);
  const model = quantity("area", length * 10, width * 10, 5);
  assert.deepEqual([model.value, model.lo, model.hi].map((mm2) => mm2 / 100), [nominal, lower, upper]);
  assert.equal(check.choices?.[check.answer], `The area is between ${lower} cm² and ${upper} cm².`);
  assert.equal((lower + upper) / 2 - nominal, 0.25);
  assert.doesNotMatch(check.explanation, new RegExp(`${nominal} cm² is (?:only )?the midpoint`));
  assert.match(check.explanation, /nominal (?:area|estimate)/);
});

test("the rounded-length chapter check asks for a perimeter upper bound", () => {
  const check = chapterMeta.practice[0];
  const readings = check.prompt.match(/length reads ([\d.]+) m and the width reads ([\d.]+) m/);
  assert.ok(readings);
  const lengthMm = Number(readings[1]) * 1000, widthMm = Number(readings[2]) * 1000;
  const upperMeters = (2 * (lengthMm + 50) + 2 * (widthMm + 50)) / 1000;
  assert.equal(check.answer, upperMeters);
  assert.equal(quantity("perimeter", lengthMm, widthMm, 50).hi / 1000, upperMeters);
  assert.match(check.prompt, /upper bound/);
  assert.doesNotMatch(check.explanation, /largest perimeter/);
});

/** Half-up rounding written independently of the lesson's integer version. */
function roundHalfUp(n: number, d: number): number {
  return Math.round(n / d);
}

/** Reads "36.07" back as the whole number 3607, insisting on the promised decimal places. */
function parseFixed(text: string, decimals: number): number {
  const [whole, frac = ""] = text.split(".");
  assert.equal(frac.length, decimals, `"${text}" must show exactly ${decimals} decimal place(s)`);
  return Number(whole) * 10 ** decimals + (decimals === 0 ? 0 : Number(frac));
}

test("the number formatters place the decimal point and round half up", () => {
  assert.equal(writeDecimal(3607, 2), "36.07");
  assert.equal(writeDecimal(5, 3), "0.005");
  assert.equal(writeDecimal(12, 0), "12");
  // 2.4 m is 2400 mm: one decimal keeps "2.4", two decimals must show the trailing zero.
  assert.equal(fixed(2400, MM_PER_M, 1), "2.4");
  assert.equal(fixed(2400, MM_PER_M, 2), "2.40");
  assert.equal(fixed(2350, MM_PER_M, 2), "2.35");
  assert.equal(fixed(2395, MM_PER_M, 3), "2.395");
  // 2.4 m x 1.6 m = 3 840 000 mm^2 = 3.84 m^2.
  assert.equal(2400 * 1600, 3_840_000);
  assert.equal(fixed(2400 * 1600, MM2_PER_M2, 2), "3.84");
  // Half-up, so 3.5 goes to 4 and 2.5 goes to 3.
  assert.equal(roundDiv(3_500_000, MM2_PER_M2), 4);
  assert.equal(roundDiv(2500, MM_PER_M), 3);
  assert.equal(roundDiv(2499, MM_PER_M), 2);
  // Interval ends round outward: 3.4075 down to 3.407, 3.7975 up to 3.798.
  assert.equal(2350 * 1450, 3_407_500);
  assert.equal(2450 * 1550, 3_797_500);
  assert.equal(outwardScaled(3_407_500, MM2_PER_M2, 3, "down"), 3407);
  assert.equal(outwardScaled(3_797_500, MM2_PER_M2, 3, "up"), 3798);
  assert.equal(writeDecimal(outwardScaled(3_797_500, MM2_PER_M2, 3, "up") - outwardScaled(3_407_500, MM2_PER_M2, 3, "down"), 3), "0.391");
  assert.equal(cmText(12_350), "12.35");
  assert.equal(cmText(12_300), "12.3");
  assert.equal(cmText(12_395), "12.395");
  assert.equal(cmText(12_500), "12.5");

  // Significant digits: leading zeros are placeholders, trailing decimals are real digits.
  assert.equal(significantDigits("0.7"), 1);
  assert.equal(significantDigits("2.9"), 2);
  assert.equal(significantDigits("0.72"), 2);
  assert.equal(significantDigits("7.20"), 3);
  assert.equal(significantDigits("12.80"), 4);

  // The doubt band picks a PLACE, not a count of decimals. 0.36 m^2 of doubt on a square-meter
  // scale: a 1 m^2 step is wider than the band, a 0.1 m^2 step is not, so tenths is the place.
  assert.equal(firstDoubtfulPlace(360_000, MM2_PER_M2), 1);
  assert.ok(360_000 < MM2_PER_M2 / 10 ** 0 && MM2_PER_M2 / 10 ** 1 <= 360_000);
  // Ten times finer doubt moves the place exactly one to the right, whatever the magnitude.
  assert.equal(firstDoubtfulPlace(36_000, MM2_PER_M2), 2);
  assert.equal(firstDoubtfulPlace(3_600, MM2_PER_M2), 3);
  assert.equal(firstDoubtfulPlace(400, MM_PER_M), 1);
  assert.equal(firstDoubtfulPlace(40, MM_PER_M), 2);
});

test("every reachable plot, tool and quantity keeps the figure true", () => {
  assert.deepEqual([L_MIN, L_MAX, L_STEP], [12, 40, 2]);
  assert.deepEqual([W_MIN, W_MAX, W_STEP], [6, 24, 2]);
  assert.equal(TENTH_MM, 100);
  assert.equal(MAX_DECIMALS, 3);
  assert.deepEqual(TOOLS.map((t) => [t.key, t.halfMm, t.decimals, t.edgeDecimals]), [
    ["tape", 50, 1, 2],
    ["laser", 5, 2, 3],
  ]);
  assert.deepEqual(PLACE_NAMES.slice(0, 5), ["ones", "tenths", "hundredths", "thousandths", "ten-thousandths"]);

  let states = 0;
  let gains = 0;
  let carries = 0;
  const placesSeen = new Set<string>();
  const sigFigsSeen = new Set<number>();

  for (let lengthT = L_MIN; lengthT <= L_MAX; lengthT += L_STEP) {
    for (let widthT = W_MIN; widthT <= W_MAX; widthT += W_STEP) {
      const lengthMm = lengthT * TENTH_MM;
      const widthMm = widthT * TENTH_MM;

      for (const quantityKey of QUANTITIES) {
        const perTool = TOOL_KEYS.map((key) => quantity(quantityKey, lengthMm, widthMm, tool(key).halfMm));

        for (const [index, toolKey] of TOOL_KEYS.entries()) {
          states += 1;
          const t = tool(toolKey);
          const q = perTool[index];
          const where = `${lengthT / 10} m by ${widthT / 10} m, ${toolKey}, ${quantityKey}`;
          const isArea = quantityKey === "area";

          // The quantity and its interval, recomputed from the measurements rather than reused.
          const value = isArea ? lengthMm * widthMm : 2 * lengthMm + 2 * widthMm;
          const lo = isArea ? (lengthMm - t.halfMm) * (widthMm - t.halfMm) : 2 * (lengthMm - t.halfMm) + 2 * (widthMm - t.halfMm);
          const hi = isArea ? (lengthMm + t.halfMm) * (widthMm + t.halfMm) : 2 * (lengthMm + t.halfMm) + 2 * (widthMm + t.halfMm);
          const perWhole = isArea ? MM2_PER_M2 : MM_PER_M;
          assert.equal(q.value, value, where);
          assert.equal(q.lo, lo, where);
          assert.equal(q.hi, hi, where);
          assert.equal(q.perWhole, perWhole, where);
          assert.equal(q.band, hi - lo, where);
          assert.ok(lo < value && value < hi, `the reading must sit strictly inside its interval (${where})`);
          // A perimeter's doubt is additive (4 half-divisions); an area's is not symmetric about the reading.
          if (!isArea) {
            assert.equal(hi - value, 4 * t.halfMm, where);
            assert.equal(value - lo, 4 * t.halfMm, where);
          } else {
            assert.equal(hi - value, t.halfMm * (lengthMm + widthMm) + t.halfMm ** 2, where);
            assert.equal(value - lo, t.halfMm * (lengthMm + widthMm) - t.halfMm ** 2, where);
            assert.ok(hi - value > value - lo, `the area interval leans high (${where})`);
          }

          // The printed exact value loses nothing: both quantities land on whole hundredths.
          assert.equal(q.exactDecimals, 2, where);
          const exactUnit = perWhole / 100;
          assert.equal(value % exactUnit, 0, `${q.exact} must be an exact rendering (${where})`);
          assert.equal(parseFixed(q.exact, 2) * exactUnit, value, where);

          // ---- The precision rule, stated as inequalities rather than by re-running the helper.
          // `place` is pinned by two facts: one step at `place` is no wider than the doubt band,
          // and one step at the place before it is wider than the whole band. Nothing else can
          // satisfy both, so checking them re-derives the rule independently.
          assert.ok(q.place >= 1 && q.place <= MAX_DECIMALS, `place ${q.place} must be a real decimal place (${where})`);
          const stepSub = perWhole / 10 ** q.place;
          const coarserStepSub = perWhole / 10 ** (q.place - 1);
          const finerStepSub = perWhole / 10 ** (q.place + 1);
          assert.equal(Number.isInteger(stepSub) && Number.isInteger(finerStepSub), true, where);
          assert.ok(stepSub <= hi - lo, `a ${q.step} step must fit inside the ${q.bandText} band (${where})`);
          assert.ok(hi - lo < coarserStepSub, `a ${q.coarserStep} step must be wider than the whole band (${where})`);
          assert.equal(q.placeName, PLACE_NAMES[q.place], where);
          assert.equal(q.nextPlaceName, PLACE_NAMES[q.place + 1], where);
          assert.equal(stepSub * 10, coarserStepSub, where);
          assert.equal(finerStepSub * 10, stepSub, where);
          assert.equal(q.step, STEP_TEXT[q.place], where);
          assert.equal(q.coarserStep, STEP_TEXT[q.place - 1], where);
          assert.equal(q.finerStep, STEP_TEXT[q.place + 1], where);

          // The reported number: half-up rounding of the reading to that place, written out here.
          const reportedScaled = roundHalfUp(value * 10 ** q.place, perWhole);
          const reportedSub = reportedScaled * stepSub;
          assert.equal(parseFixed(q.reported, q.place), reportedScaled, `the reported value must be ${reportedScaled} (${where})`);
          // THE invariant the sentence claims: what you write down is a value the band allows.
          assert.ok(lo < reportedSub && reportedSub < hi, `${q.reported} ${q.unit} must lie inside ${lo}..${hi} (${where})`);
          // and it never moves the answer by more than half a step, i.e. by less than half the band.
          assert.ok(Math.abs(reportedSub - value) <= stepSub / 2, where);
          assert.ok(Math.abs(reportedSub - value) * 2 < hi - lo, where);
          // Relative honesty: a rule tied to the magnitude can never throw the answer far off.
          assert.ok(Math.abs(reportedSub - value) / value < 0.1, `${q.reported} ${q.unit} is ${(100 * Math.abs(reportedSub - value)) / value}% away from ${q.exact} (${where})`);

          // Significant figures, counted from the integer rather than from the printed string.
          assert.equal(q.sigFigs, String(reportedScaled).length, `${q.reported} has ${String(reportedScaled).length} significant digits (${where})`);
          assert.ok(q.sigFigs >= 1, where);
          sigFigsSeen.add(q.sigFigs);
          placesSeen.add(`${quantityKey}/${toolKey}:${q.place}`);

          // The next digit down carries nothing: the band on its own runs through all ten of them.
          const digits = new Set<number>();
          for (let m = Math.ceil(lo / finerStepSub) * finerStepSub; m <= hi; m += finerStepSub) digits.add((m / finerStepSub) % 10);
          assert.equal(digits.size, 10, `the band must cover every ${q.nextPlaceName} digit (${where})`);

          // The printed band: it contains the true one, is tight to one last place, and — the claim
          // the sentence actually makes — contains the reported value too.
          assert.equal(q.intervalDecimals, q.place + 1, where);
          const printedLo = parseFixed(q.loText, q.intervalDecimals) * finerStepSub;
          const printedHi = parseFixed(q.hiText, q.intervalDecimals) * finerStepSub;
          assert.ok(printedLo <= lo && lo < printedLo + finerStepSub, `${q.loText} must sit just below ${lo} (${where})`);
          assert.ok(printedHi >= hi && hi > printedHi - finerStepSub, `${q.hiText} must sit just above ${hi} (${where})`);
          assert.ok(printedLo < reportedSub && reportedSub < printedHi, `${q.reported} must lie inside the PRINTED band ${q.loText}..${q.hiText} (${where})`);
          // The width the page names is the subtraction a reader can do on the two printed ends.
          const printedBand = parseFixed(q.bandText, q.intervalDecimals) * finerStepSub;
          assert.equal(printedBand, printedHi - printedLo, `${q.loText} to ${q.hiText} is not ${q.bandText} wide (${where})`);
          assert.ok(printedBand >= hi - lo, where);
          // and the two step comparisons the sentence draws hold for that printed width as well.
          assert.ok(stepSub <= printedBand && printedBand < coarserStepSub, `the printed ${q.bandText} band must still land on the ${q.placeName} place (${where})`);

          // Converting units rescales the number and nothing else.
          assert.ok(Number.isInteger(q.metric), where);
          assert.equal(isArea ? q.metric * 100 : q.metric * 10, value, `${q.metric} ${q.metricUnit} must be the same quantity (${where})`);
          assert.equal(q.metricUnit, isArea ? "cm²" : "cm");
          assert.equal(q.unit, isArea ? "m²" : "m");

          // Geometry of the drawing: nested boxes, everything inside the viewBox.
          const box = layout(lengthMm, widthMm, t.halfMm);
          const truePx = (t.halfMm / MM_PER_M) * PX_PER_M;
          // The exaggeration factor is the least whole number that lifts the band to 3.5 px.
          assert.ok(2 * box.exaggeration * t.halfMm * PX_PER_M >= MIN_BAND_HALF_PX * MM_PER_M, `the drawn band must be legible (${where})`);
          assert.ok(
            box.exaggeration === 1 || 2 * (box.exaggeration - 1) * t.halfMm * PX_PER_M < MIN_BAND_HALF_PX * MM_PER_M,
            `the band must not be exaggerated more than it has to be (${where})`
          );
          assert.equal(box.exaggeration, bandExaggeration(t.halfMm), where);
          assert.equal(box.exaggeration, toolKey === "tape" ? 1 : 10, where);
          assert.ok(Math.abs(box.bandPx - truePx * box.exaggeration) < 1e-9, where);
          assert.ok(box.bandPx >= 3.5, `a band of ${box.bandPx} px would vanish under a 2 px stroke (${where})`);
          assert.ok(Math.abs(box.measured.w - (lengthMm / MM_PER_M) * PX_PER_M) < 1e-9, where);
          assert.ok(Math.abs(box.measured.h - (widthMm / MM_PER_M) * PX_PER_M) < 1e-9, where);
          assert.equal(box.measured.x, ORIGIN_X);
          assert.equal(box.measured.y, ORIGIN_Y);
          for (const [outerBox, innerBox] of [[box.outer, box.measured], [box.measured, box.inner]] as const) {
            assert.ok(Math.abs(innerBox.x - (outerBox.x + box.bandPx)) < 1e-9, where);
            assert.ok(Math.abs(innerBox.y - (outerBox.y + box.bandPx)) < 1e-9, where);
            assert.ok(Math.abs(innerBox.w - (outerBox.w - 2 * box.bandPx)) < 1e-9, where);
            assert.ok(Math.abs(innerBox.h - (outerBox.h - 2 * box.bandPx)) < 1e-9, where);
          }
          assert.ok(box.inner.w > 0 && box.inner.h > 0, `the smallest possible plot must stay a rectangle (${where})`);
          assert.ok(box.outer.x >= 1 && box.outer.y >= 1, where);
          assert.ok(box.outer.x + box.outer.w <= SVG_W - 1, `the drawing overflows to the right (${where})`);
          assert.ok(box.outer.y + box.outer.h <= SVG_H - 1, `the drawing overflows downward (${where})`);
          // Gridlines mark whole meters and never leave the recorded rectangle.
          assert.equal(box.grid.x.length, Math.ceil(lengthT / 10) - 1, where);
          assert.equal(box.grid.y.length, Math.ceil(widthT / 10) - 1, where);
          for (const gx of box.grid.x) assert.ok(gx > box.measured.x && gx < box.measured.x + box.measured.w, where);
          for (const gy of box.grid.y) assert.ok(gy > box.measured.y && gy < box.measured.y + box.measured.h, where);
          // Both SVG labels stay inside the viewBox at their widest.
          const lengthLabel = `${fixed(lengthMm, MM_PER_M, t.decimals)} m`;
          const widthLabel = `${fixed(widthMm, MM_PER_M, t.decimals)} m`;
          assert.ok(box.lengthLabelX - (lengthLabel.length * GLYPH_12) / 2 >= 0, where);
          assert.ok(box.lengthLabelX + (lengthLabel.length * GLYPH_12) / 2 <= SVG_W, where);
          assert.ok(box.lengthLabelY + 4 <= SVG_H, where);
          assert.ok(box.lengthLabelY >= box.outer.y + box.outer.h, `the length label must clear the band (${where})`);
          assert.ok(box.widthLabelX - widthLabel.length * GLYPH_12 >= 0, where);
          assert.ok(box.widthLabelX <= box.outer.x, `the width label must clear the band (${where})`);
          assert.ok(box.widthLabelY - 8 >= 0 && box.widthLabelY + 4 <= SVG_H, where);

          // The accessible description names the reading, both extremes, the drawn scale of the
          // band, and the reported value — everything a sighted reader gets from the picture.
          const label = figureLabel(lengthMm, widthMm, t, q, box.exaggeration);
          assert.ok(label.startsWith(`Scale drawing of a plot recorded as ${lengthLabel} by ${widthLabel}`), where);
          assert.ok(label.includes(`reads to the nearest ${t.division}`), where);
          assert.ok(
            label.includes(
              `from ${fixed(lengthMm - t.halfMm, MM_PER_M, t.edgeDecimals)} m by ${fixed(widthMm - t.halfMm, MM_PER_M, t.edgeDecimals)} m up to ${fixed(lengthMm + t.halfMm, MM_PER_M, t.edgeDecimals)} m by ${fixed(widthMm + t.halfMm, MM_PER_M, t.edgeDecimals)} m`
            ),
            where
          );
          assert.ok(label.includes(bandScaleNote(box.exaggeration)), where);
          assert.equal(
            bandScaleNote(box.exaggeration),
            toolKey === "tape"
              ? "drawn at the same scale as the plot"
              : "drawn 10 times wider than the plot's scale, because at true scale this band would be thinner than the line",
            where
          );
          assert.ok(label.includes(`The ${q.noun} is highlighted: ${q.exact} ${q.unit}`), where);
          assert.ok(label.includes(`between ${q.loText} and ${q.hiText} ${q.unit} — a band ${q.bandText} ${q.unit} wide, which stops the honest answer at ${q.reported} ${q.unit}`), where);
        }

        // The finer tool narrows the band by exactly ten, which buys exactly one more digit —
        // the opposite of the old rule, which threw digits away fastest with the better tool.
        const [tape, laser] = perTool;
        assert.ok(laser.lo > tape.lo && laser.hi < tape.hi, "the laser interval must sit inside the tape interval");
        assert.equal(tape.band, 10 * laser.band, "a ten-times finer tool gives a ten-times narrower band");
        assert.equal(laser.place, tape.place + 1, "a ten-times narrower band moves the doubtful place one to the right");
        // One more place is one more significant figure, unless the coarser rounding carried into
        // a new decade (0.96 -> 1.0 keeps two), which can only ever help the finer tool.
        assert.ok(laser.sigFigs >= tape.sigFigs, "the finer tool must never report fewer significant figures");
        assert.ok(laser.sigFigs - tape.sigFigs <= 1, "one extra place cannot buy more than one extra figure");
        if (laser.sigFigs === tape.sigFigs) carries += 1; else gains += 1;
      }
    }
  }

  assert.equal(states, 15 * 10 * 2 * 2, "the grid is 15 lengths x 10 widths x 2 tools x 2 quantities");
  assert.deepEqual([...placesSeen].sort(), ["area/laser:2", "area/tape:1", "perimeter/laser:2", "perimeter/tape:1"]);
  assert.deepEqual([...sigFigsSeen].sort(), [1, 2, 3, 4], "the plot size must move the significant-figure count");
  assert.equal(gains + carries, 300, "every plot/quantity pair is compared across the two tools");
  assert.equal(carries, 2, "only 0.96 m^2 (1.2 x 0.8 and 1.6 x 0.6) rounds up into a new decade");
  assert.ok(gains > 0, "the finer tool must normally buy exactly one more significant figure");

  // States the earlier decimal-place rule got wrong, now worked through by hand.
  // 1.2 m x 1.2 m with the laser: 1195 x 1195 = 1 428 025 mm^2, 1205 x 1205 = 1 452 025 mm^2.
  const tight = quantity("area", 1200, 1200, 5);
  assert.equal(tight.value, 1_440_000);
  assert.deepEqual([tight.lo, tight.hi], [1_428_025, 1_452_025]);
  assert.equal(tight.band, 24_000); // 0.024 m^2 true, 0.025 as printed: smaller than 0.1, bigger than 0.01
  assert.equal(tight.place, 2);
  assert.equal(tight.reported, "1.44"); // and 1 428 025 < 1 440 000 < 1 452 025
  assert.equal(tight.sigFigs, 3);
  assert.deepEqual([tight.loText, tight.hiText, tight.bandText], ["1.428", "1.453", "0.025"]); // 1.453 - 1.428

  // 1.2 m x 0.6 m with the tape: 1150 x 550 = 632 500, 1250 x 650 = 812 500, band 0.18 m^2.
  const coarse = quantity("area", 1200, 600, 50);
  assert.deepEqual([coarse.value, coarse.lo, coarse.hi], [720_000, 632_500, 812_500]);
  assert.equal(coarse.band, 180_000);
  assert.equal(coarse.place, 1);
  assert.equal(coarse.reported, "0.7"); // 632 500 < 700 000 < 812 500
  assert.equal(coarse.sigFigs, 1);

  // 3.6 m x 2.2 m with the laser: 3595 x 2195 = 7 891 025, 3605 x 2205 = 7 949 025.
  const printed = quantity("area", 3600, 2200, 5);
  assert.deepEqual([printed.lo, printed.hi], [7_891_025, 7_949_025]);
  assert.deepEqual([printed.loText, printed.hiText], ["7.891", "7.950"]);
  assert.equal(printed.reported, "7.92"); // inside 7.891..7.950 as printed, and inside the true band
  assert.ok(7_891_000 < 7_920_000 && 7_920_000 < 7_950_000);

  // The two states the lesson opens on.
  const openingTape = quantity("area", 2400, 1200, 50);
  assert.equal(openingTape.value, 2_880_000); // 2400 x 1200 mm^2 = 2.88 m^2
  assert.equal(openingTape.exact, "2.88");
  assert.deepEqual([openingTape.lo, openingTape.hi], [2_702_500, 3_062_500]); // 2350 x 1150, 2450 x 1250
  assert.equal(openingTape.place, 1); // band 0.36 m^2
  assert.equal(openingTape.reported, "2.9");
  assert.equal(openingTape.metric, 28_800); // 2.88 m^2 x 10 000 = 28 800 cm^2
  const openingLaser = quantity("area", 2400, 1200, 5);
  assert.deepEqual([openingLaser.lo, openingLaser.hi], [2_862_025, 2_898_025]); // 2395 x 1195, 2405 x 1205
  assert.equal(openingLaser.place, 2); // band 0.036 m^2
  assert.equal(openingLaser.reported, "2.88");
  const openingPerimeter = quantity("perimeter", 2400, 1200, 5);
  assert.equal(openingPerimeter.value, 7200); // 2 x (2400 + 1200) mm = 7.2 m
  assert.deepEqual([openingPerimeter.lo, openingPerimeter.hi], [7180, 7220]);
  assert.equal(openingPerimeter.place, 2);
  assert.equal(openingPerimeter.reported, "7.20");
  assert.equal(openingPerimeter.sigFigs, 3);
  assert.equal(openingPerimeter.metric, 720); // 7.2 m x 100 = 720 cm
});

test("the worked example reports the fuel rate to the digits the instruments paid for", () => {
  assert.deepEqual([FUEL_ML, FUEL_HALF_ML, TRIP_M, TRIP_HALF_M, PER_KM], [46_000, 50, 512_000, 500, 100]);
  const ex = fuelExample();

  // 46.0 L over 512 km: 46000/512000 = 23/256 exactly, because 23 x 512000 = 256 x 46000.
  assert.equal(23 * 512_000, 256 * 46_000);
  assert.equal(ex.perKm, 0.08984375);
  assert.equal(ex.perKm.toFixed(8), "0.08984375");
  // x 100 km gives 575/64 = 8.984375 L per 100 km, exact: 8.984375 x 512000 = 4 600 000.
  assert.equal(ex.nominal, 8.984375);
  assert.equal(ex.nominal * TRIP_M, PER_KM * FUEL_ML);
  assert.equal(ex.nominal.toFixed(6), "8.984375");

  // Least fuel over the longest trip: 100 x 45950 / 512500. Most over the shortest: 100 x 46050 / 511500.
  assert.ok(Math.abs(ex.low * 512_500 - 4_595_000) < 1e-6);
  assert.ok(Math.abs(ex.high * 511_500 - 4_605_000) < 1e-6);
  assert.ok(ex.low < ex.nominal && ex.nominal < ex.high);

  // The band, as an exact fraction: 4605000/511500 - 4595000/512500 = 9 720 000 000 / 262 143 750 000.
  assert.equal(4_605_000 * 512_500 - 4_595_000 * 511_500, 9_720_000_000);
  assert.equal(511_500 * 512_500, 262_143_750_000);
  assert.ok(Math.abs(ex.band * 262_143_750_000 - 9_720_000_000) < 1);
  // A 0.1 step is wider than that band (den > 10 x num is false only if the band reaches 0.1):
  assert.ok(9_720_000_000 * 10 < 262_143_750_000, "0.1 L per 100 km is a wider step than the whole band");
  // A 0.01 step is not: 100 x num >= den.
  assert.ok(9_720_000_000 * 100 >= 262_143_750_000, "0.01 L per 100 km fits inside the band");
  assert.equal(ex.place, 2);
  assert.equal(ex.placeName, "hundredths");
  assert.deepEqual([ex.step, ex.coarserStep], ["0.01", "0.1"]);

  // So the answer stops at the hundredths place: 8.984375 rounds to 8.98, three significant figures.
  assert.equal(ex.reported, "8.98");
  assert.equal(ex.sigFigs, 3);
  // and 8.98 is a rate the two instruments actually allow.
  assert.ok(ex.low < 8.98 && 8.98 < ex.high);
  // Cross-multiplied, without trusting toFixed: 8.98 x 512500 > 4 595 000 and 8.98 x 511500 < 4 605 000.
  assert.ok(8.98 * 512_500 > 4_595_000);
  assert.ok(8.98 * 511_500 < 4_605_000);

  assert.equal(ex.low.toFixed(4), "8.9659");
  assert.equal(ex.high.toFixed(4), "9.0029");
  assert.equal(ex.band.toFixed(4), "0.0371");
  assert.deepEqual(
    [ex.fuelText, ex.fuelLoText, ex.fuelHiText, ex.tripText, ex.tripLoText, ex.tripHiText],
    ["46.0", "45.95", "46.05", "512", "511.5", "512.5"]
  );
});

test("the Try it answer is the half-division interval around the reading", () => {
  assert.deepEqual([READING, TICK], [12_400, 100]);
  const choices = tryChoices();
  assert.equal(choices.length, 4);
  assert.equal(new Set(choices.map((choice) => `${choice.lo}-${choice.hi}`)).size, 4, "the four intervals are distinct");

  // A reading to the nearest 0.1 cm means the board is within 0.05 cm: 12.35 cm to 12.45 cm.
  const lo = READING - TICK / 2;
  const hi = READING + TICK / 2;
  assert.deepEqual([lo, hi], [12_350, 12_450]);
  assert.equal(hi - lo, TICK);
  assert.equal((lo + hi) / 2, READING);
  assert.equal(cmText(lo), "12.35");
  assert.equal(cmText(hi), "12.45");

  const answer = tryAnswerIndex();
  assert.equal(answer, 1);
  assert.deepEqual([choices[answer].lo, choices[answer].hi], [lo, hi]);
  assert.equal(choices[answer].why, "correct");
  assert.equal(choices.filter((choice) => choice.why === "correct").length, 1);
  choices.forEach((choice, i) => {
    assert.ok(choice.lo < choice.hi, `option ${i} must be an interval`);
    assert.equal(choice.lo === lo && choice.hi === hi, i === answer, `option ${i} must ${i === answer ? "" : "not "}be 12.35 to 12.45 cm`);
  });
  // The distractors are the three classic mistakes: a whole division, the finer ruler, one-sided.
  assert.deepEqual([choices[0].lo, choices[0].hi], [12_300, 12_500]);
  assert.equal(choices[0].hi - choices[0].lo, 2 * TICK);
  assert.deepEqual([choices[2].lo, choices[2].hi], [12_395, 12_405]);
  assert.equal(choices[2].hi - choices[2].lo, TICK / 10);
  assert.deepEqual([choices[3].lo, choices[3].hi], [12_400, 12_500]);
  assert.equal((choices[3].lo + choices[3].hi) / 2, READING + TICK / 2);
});

test("lesson source cites only brief standards and keeps its markup contract", () => {
  const source = readFileSync(path.join(process.cwd(), "components/lesson/ccss/lessons", `${SLUG}.tsx`), "utf8");
  assert.ok(source.startsWith('"use client";'));
  assert.match(source, /export default function Lesson\(\)/u);

  const cited = [...source.matchAll(/\b(?:(?:K|[1-8])\.[A-Z]{1,3}\.[A-D]\.\d+|[A-Z]-[A-Z]{1,3}\.[A-D]?\.?\d+)\b/g)].map((m) => m[0]);
  assert.ok(cited.length > 0, "the Math check must cite standards");
  for (const id of cited) assert.ok(BRIEF_STANDARDS.includes(id), `${id} is not in the chapter brief`);
  for (const must of BRIEF_STANDARDS) assert.ok(cited.includes(must), `${must} must be cited`);
  // N-Q.3 is about accuracy proportional to the measurement, so the lesson has to say so.
  assert.match(source, /significant/u, "N-Q.3 must be developed in the language of significant figures");
  assert.match(source, /Accuracy is relative, not absolute/u);

  const svgTags = source.split("<svg").slice(1).map((rest) => rest.slice(0, rest.indexOf(">")));
  assert.equal(svgTags.length, 1);
  for (const tag of svgTags) {
    assert.ok(tag.includes("viewBox"), "every <svg> needs a viewBox");
    assert.ok(tag.includes('role="img"') && tag.includes("aria-label"), "every <svg> needs role=img and an aria-label");
  }

  // The tool pair, the quantity pair, Next step, Start over, the Try it options, and the stepper.
  const buttonTags = source.split("<button").slice(1).map((rest) => rest.slice(0, rest.indexOf(">")));
  assert.equal(buttonTags.length, 7);
  for (const tag of buttonTags) assert.ok(tag.includes('type="button"'), "every <button> needs type=button");

  assert.match(source, /value=\{lengthT\} display=\{`\$\{lengthText\} m`\} min=\{L_MIN\} max=\{L_MAX\} step=\{L_STEP\}/u);
  assert.match(source, /value=\{widthT\} display=\{`\$\{widthText\} m`\} min=\{W_MIN\} max=\{W_MAX\} step=\{W_STEP\}/u);
  assert.match(source, /disabled=\{value <= min\}/u);
  assert.match(source, /disabled=\{value >= max\}/u);
  assert.match(source, /aria-label=\{`Decrease \$\{label\}`\}/u);
  assert.match(source, /aria-label=\{`Increase \$\{label\}`\}/u);
  assert.match(source, /aria-expanded=\{shown > 0\} aria-controls=\{stepsId\}/u);
  assert.match(source, /id=\{stepsId\}/u);
  assert.match(source, /aria-pressed=\{toolKey === option\.key\}/u);
  assert.match(source, /aria-pressed=\{quantityKey === key\}/u);
  assert.match(source, /aria-pressed=\{picked === i\}/u);
  // The caption is state-dependent, so it can never promise a band the reader cannot see.
  assert.match(source, /caption=\{`[^`]*\$\{bandScaleNote\(box\.exaggeration\)\}[^`]*`\}/u);
  assert.doesNotMatch(source, /[\u3040-\u30ff\u3400-\u9fff]/u, "no CJK characters");
  assert.doesNotMatch(source, /Math\.random|fetch\(|localStorage|<form|dangerouslySetInnerHTML|next\/image/u);
});

test("exactly one Try it option satisfies the stem as written", () => {
  // The stem used to ask which interval CONTAINS every possible board length, and
  // option 0 ([12.3, 12.5]) contains the true set [12.35, 12.45] just as option 1
  // does — two true answers. The stem now asks for the exact set.
  const choices = tryChoices();
  const trueLo = READING - TICK / 2;
  const trueHi = READING + TICK / 2;

  const exact = choices.filter((c) => c.lo === trueLo && c.hi === trueHi);
  assert.equal(exact.length, 1, "exactly one option is the exact set of producing lengths");
  assert.equal(choices.indexOf(exact[0]), tryAnswerIndex(), "and it is the one marked correct");

  // Containment alone is genuinely ambiguous, which is why the stem may not ask it.
  const containing = choices.filter((c) => c.lo <= trueLo && c.hi >= trueHi);
  assert.ok(containing.length > 1, "containment alone would still admit more than one option");

  const source = readFileSync(path.join(process.cwd(), "components/lesson/ccss/lessons", `${SLUG}.tsx`), "utf8");
  assert.match(source, /is exactly the set of board lengths/u, "the stem must ask for the exact set");
  assert.equal(source.split("Which interval contains every board length").length - 1, 0, "the ambiguous stem must not come back");
});
