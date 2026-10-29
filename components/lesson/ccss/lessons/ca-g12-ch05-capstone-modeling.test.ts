import assert from "node:assert/strict";
import { collides, textBox } from "../labelSpacing";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  CELL,
  CONCRETE_KG_PER_M3,
  DEPTH_CM,
  FRAME_LIMIT_KG,
  GLASS_KG_PER_M2,
  H_MAX,
  H_MIN,
  LABEL_MARGIN,
  MOVES,
  PAD,
  PAD_U,
  PAD_V,
  PEG,
  STAKE_U,
  STAKE_V,
  SVG_H,
  SVG_W,
  TRUCK_KG,
  TRY_AREA,
  TRY_MATRIX,
  W_MAX,
  W_MIN,
  WIDEN,
  X_MAX,
  X_MIN,
  Y_MAX,
  Y_MIN,
  areaCaption,
  componentsBetween,
  cross,
  det,
  detCaption,
  directionDeg,
  edgeCaption,
  edgeLabelSpot,
  figureLabel,
  glassCaption,
  holds,
  lengthText,
  loadsSentence,
  magnitude,
  padExample,
  panel,
  plural,
  px,
  py,
  summaryLine,
  tryAnswerIndex,
  tryChoices,
  tryFactText,
  tryFeedback,
  verdictLine,
  edgeLabelSpots,
} from "./ca-g12-ch05-capstone-modeling";

const SLUG = "ca-g12-ch05-capstone-modeling";
const BRIEF_STANDARDS = [
  "G-MG.1", "G-MG.2", "G-MG.3",
  "N-VM.1", "N-VM.2", "N-VM.3", "N-VM.4", "N-VM.5", "N-VM.6",
  "N-VM.7", "N-VM.8", "N-VM.9", "N-VM.10", "N-VM.11", "N-VM.12",
];
/** Widest glyph in an SVG label at font-size 13, used only to keep the two arrow names inside the viewBox. */
const GLYPH_13 = 8;
/** A control value of 1 must never be printed against a plural noun anywhere in the lesson's copy. */
const BAD_PLURAL = /\b1 (?:meters|loads|square meters|cubic meters|kg per square meter)\b/;

/**
 * The image of each edge vector, written out by hand rather than by calling the
 * lesson's own `apply`, so the two calculations are genuinely independent.
 */
function expectedEdges(key: string, w: number, h: number): { au: { x: number; y: number }; av: { x: number; y: number }; determinant: number } {
  if (key === "keep") return { au: { x: w, y: 0 }, av: { x: 0, y: h }, determinant: 1 };
  if (key === "slant") return { au: { x: w, y: 0 }, av: { x: h, y: h }, determinant: 1 };
  if (key === "double") return { au: { x: 2 * w, y: 0 }, av: { x: 0, y: 2 * h }, determinant: 4 };
  if (key === "turn") return { au: { x: 0, y: w }, av: { x: -h, y: 0 }, determinant: 1 };
  if (key === "mirror") return { au: { x: w, y: 0 }, av: { x: 0, y: -h }, determinant: -1 };
  throw new Error(`unknown move ${key}`);
}

/** Direction of each arrow, in whole degrees measured counterclockwise from east. */
function expectedDirections(key: string): { u: number; v: number } {
  if (key === "keep") return { u: 0, v: 90 };
  if (key === "slant") return { u: 0, v: 45 };
  if (key === "double") return { u: 0, v: 90 };
  if (key === "turn") return { u: 90, v: 180 };
  return { u: 0, v: -90 };
}

/** The noun agreement the copy must show, spelled out here instead of calling the lesson's `plural`. */
function meterWord(n: number): string {
  return n === 1 ? "meter" : "meters";
}

/** The length phrase beside an arrow, rebuilt from the hand-written components. */
function expectedLengthText(tip: { x: number; y: number }): string {
  const exact = Math.sqrt(tip.x * tip.x + tip.y * tip.y);
  return Number.isInteger(exact) ? `${exact} m` : `about ${exact.toFixed(2)} m`;
}

test("the five moves are the matrices the lesson claims, with the determinants it claims", () => {
  assert.equal(MOVES.length, 5);
  assert.deepEqual(MOVES.map((move) => move.key), ["keep", "slant", "double", "turn", "mirror"]);
  assert.deepEqual(MOVES.map((move) => det(move.m)), [1, 1, 4, 1, -1]);
  // Written out entry by entry: identity, shear, scalar 2, quarter turn, reflection in the east line.
  assert.deepEqual(MOVES[0].m, { a: 1, b: 0, c: 0, d: 1 });
  assert.deepEqual(MOVES[1].m, { a: 1, b: 1, c: 0, d: 1 });
  assert.deepEqual(MOVES[2].m, { a: 2, b: 0, c: 0, d: 2 });
  assert.deepEqual(MOVES[3].m, { a: 0, b: -1, c: 1, d: 0 });
  assert.deepEqual(MOVES[4].m, { a: 1, b: 0, c: 0, d: -1 });
  // 1*1 - 0*0 = 1, 1*1 - 1*0 = 1, 2*2 - 0*0 = 4, 0*0 - (-1)*1 = 1, 1*(-1) - 0*0 = -1.
  assert.equal(1 * 1 - 0 * 0, 1);
  assert.equal(2 * 2 - 0 * 0, 4);
  assert.equal(0 * 0 - -1 * 1, 1);
  assert.equal(1 * -1 - 0 * 0, -1);
  assert.equal(plural(1, "meter", "meters"), "meter");
  assert.equal(plural(2, "meter", "meters"), "meters");
  assert.equal(plural(0, "load", "loads"), "loads");
});

test("every reachable plan keeps the area, the weight, and the drawing true", () => {
  assert.deepEqual([W_MIN, W_MAX, H_MIN, H_MAX], [2, 5, 1, 4]);
  assert.deepEqual([GLASS_KG_PER_M2, FRAME_LIMIT_KG], [30, 900]);
  assert.equal(SVG_W, (X_MAX - X_MIN) * CELL + 2 * PAD);
  assert.equal(SVG_H, (Y_MAX - Y_MIN) * CELL + 2 * PAD);
  assert.equal(SVG_W, 400);
  assert.equal(SVG_H, 356);

  let states = 0;
  let withinFrame = 0;
  let overFrame = 0;

  for (const move of MOVES) {
    for (let w = W_MIN; w <= W_MAX; w += 1) {
      for (let h = H_MIN; h <= H_MAX; h += 1) {
        states += 1;
        const where = `${move.key}, w=${w}, h=${h}`;
        const p = panel(w, h, move.m);
        const expect = expectedEdges(move.key, w, h);

        // The transformed edges match the hand-written image of each matrix.
        assert.deepEqual(p.au, expect.au, where);
        assert.deepEqual(p.av, expect.av, where);
        assert.equal(p.factor, expect.determinant, where);
        // The far corner is the vector sum, corner by corner.
        assert.deepEqual(p.corner, { x: expect.au.x + expect.av.x, y: expect.au.y + expect.av.y }, where);

        // Area two ways: the cross product of the drawn edges, and |det| times the untransformed area.
        const drawnArea = Math.abs(expect.au.x * expect.av.y - expect.au.y * expect.av.x);
        assert.equal(p.area, drawnArea, where);
        assert.equal(p.area, Math.abs(expect.determinant) * w * h, where);
        assert.equal(p.baseArea, w * h, where);
        assert.equal(cross(p.au, p.av), expect.au.x * expect.av.y - expect.au.y * expect.av.x, where);
        assert.ok(Number.isInteger(p.area) && p.area >= 2, where);

        // Density: 30 kg for every square meter, and the verdict is the comparison it claims.
        assert.equal(p.mass, 30 * p.area, where);
        assert.equal(p.mass, GLASS_KG_PER_M2 * p.area, where);
        assert.equal(holds(p.mass), p.mass <= 900, where);
        if (holds(p.mass)) withinFrame += 1; else overFrame += 1;
        // Only the doubling move can ever exceed the rating: the others cap out at 30 * 5 * 4 = 600 kg.
        if (move.key !== "double") assert.ok(p.mass <= 600 && holds(p.mass), where);

        // Lengths and directions printed beside each arrow.
        const dirs = expectedDirections(move.key);
        assert.equal(directionDeg(p.au), dirs.u, where);
        assert.equal(directionDeg(p.av), dirs.v, where);
        assert.ok(Math.abs(magnitude(p.au) ** 2 - (expect.au.x ** 2 + expect.au.y ** 2)) < 1e-9, where);
        for (const [tip, text] of [[p.au, lengthText(p.au)], [p.av, lengthText(p.av)]] as [{ x: number; y: number }, string][]) {
          const exact = Math.sqrt(tip.x * tip.x + tip.y * tip.y);
          if (Number.isInteger(exact)) {
            assert.equal(text, `${exact} m`, where);
          } else {
            assert.equal(text, `about ${exact.toFixed(2)} m`, where);
            assert.ok(Math.abs(Number(text.slice(6, -2)) - exact) <= 0.005 + 1e-12, `${text} must round ${exact} (${where})`);
          }
        }
        // The slanted edge is the only irrational length on the grid: |(h, h)| = h*sqrt(2).
        if (move.key === "slant") assert.ok(Math.abs(magnitude(p.av) - h * Math.SQRT2) < 1e-12, where);

        // ---- every sentence the plan prints, rebuilt from the hand-written numbers ----
        const eArea = drawnArea;
        const eFactor = expect.determinant;
        const eBase = w * h;
        const eMass = 30 * eArea;

        const captions = [
          [edgeCaption(p.au), `length ${expectedLengthText(expect.au)}, direction ${dirs.u}°`],
          [edgeCaption(p.av), `length ${expectedLengthText(expect.av)}, direction ${dirs.v}°`],
          [detCaption(p), `area factor |${eFactor}| = ${Math.abs(eFactor)}`],
          [areaCaption(p, w, h), `${Math.abs(eFactor)} × ${w} × ${h} = ${eArea} square ${meterWord(eArea)}`],
          [glassCaption(p), `${eArea} × 30 kg per square meter`],
          [verdictLine(p), `${eMass} kg is ${eMass <= 900 ? "within" : "over"} the 900 kg rating`],
          [
            summaryLine(p, w, h),
            `Before the move the panel is ${w} ${meterWord(w)} by ${h} ${meterWord(h)} and covers ${eBase} square ${meterWord(eBase)};`
            + ` after the move it covers ${eArea} square ${meterWord(eArea)}, because the determinant multiplies every area by ${Math.abs(eFactor)}.`,
          ],
          [
            figureLabel(p, move.aria),
            `Site plan on a one meter grid, ${move.aria}. The canopy is the parallelogram with corners at the origin,`
            + ` (${expect.au.x}, ${expect.au.y}), (${expect.au.x + expect.av.x}, ${expect.au.y + expect.av.y}), and (${expect.av.x}, ${expect.av.y}).`
            + ` Its area is ${eArea} square ${meterWord(eArea)}.`,
          ],
        ] as [string, string][];
        for (const [actual, wanted] of captions) {
          assert.equal(actual, wanted, where);
          // The area tile used to read "1 x 5 x 1 square meters"; no readout may print 1 against a plural.
          assert.doesNotMatch(actual, BAD_PLURAL, `"${actual}" prints 1 against a plural noun (${where})`);
        }
        // The area caption must close on a value, not trail off as a bare product.
        assert.ok(areaCaption(p, w, h).includes(`= ${eArea} square`), where);

        // Every drawn corner stays inside the padded plot box.
        for (const point of [{ x: 0, y: 0 }, p.au, p.av, p.corner]) {
          assert.ok(point.x >= X_MIN && point.x <= X_MAX, `${point.x} leaves the x window (${where})`);
          assert.ok(point.y >= Y_MIN && point.y <= Y_MAX, `${point.y} leaves the y window (${where})`);
          assert.ok(px(point.x) >= PAD - 1e-9 && px(point.x) <= SVG_W - PAD + 1e-9, `x pixel out of the viewBox (${where})`);
          assert.ok(py(point.y) >= PAD - 1e-9 && py(point.y) <= SVG_H - PAD + 1e-9, `y pixel out of the viewBox (${where})`);
        }
        // The two arrow names stay inside the viewBox, glyph width included.
        for (const spot of [edgeLabelSpot(p.au), edgeLabelSpot(p.av)]) {
          assert.ok(spot.x >= LABEL_MARGIN && spot.x <= SVG_W - LABEL_MARGIN, `label x ${spot.x} (${where})`);
          assert.ok(spot.y >= LABEL_MARGIN && spot.y <= SVG_H - LABEL_MARGIN, `label y ${spot.y} (${where})`);
          assert.ok(spot.x - GLYPH_13 >= 0 && spot.x + GLYPH_13 <= SVG_W, `label glyphs leave the viewBox (${where})`);
          assert.ok(spot.y - GLYPH_13 >= 0 && spot.y + 4 <= SVG_H, `label glyphs leave the viewBox (${where})`);
        }
      }
    }
  }

  assert.equal(states, 5 * 4 * 4, "five moves times four widths times four depths");
  assert.equal(states, 80);
  // 30 * 4 * w * h > 900 exactly when w*h > 7.5: (2,4), (3,3), (3,4), (4,2), (4,3), (4,4), (5,2), (5,3), (5,4).
  assert.equal(overFrame, 9);
  assert.equal(withinFrame, 71);
  assert.equal(overFrame + withinFrame, states);
});

test("the summary sentence names the pre-image before it names the image", () => {
  // The steppers set the panel BEFORE the move, so the sentence must say so before it quotes those numbers.
  for (const move of MOVES) {
    const p = panel(5, 4, move.m);
    const line = summaryLine(p, 5, 4);
    assert.ok(line.startsWith("Before the move the panel is 5 meters by 4 meters"), move.key);
    assert.ok(line.indexOf("Before the move") < line.indexOf("5 meters"), move.key);
    assert.ok(line.includes(`after the move it covers ${Math.abs(det(move.m)) * 20} square meters`), move.key);
  }
  // The one state where a stepper sits at its floor still reads as a singular.
  assert.ok(summaryLine(panel(2, 1, MOVES[0].m), 2, 1).includes("2 meters by 1 meter and covers 2 square meters"));
});

test("the plot window is wide enough for the widest plan and no wider than declared", () => {
  assert.deepEqual([X_MIN, X_MAX, Y_MIN, Y_MAX, CELL, PAD], [-5, 11, -5, 9, 22, 24]);
  // Extremes over the whole grid: doubling reaches (10, 8), the quarter turn reaches x = -4, the mirror reaches y = -4.
  assert.equal(px(X_MIN), PAD);
  assert.equal(px(X_MAX), SVG_W - PAD);
  assert.equal(py(Y_MIN), SVG_H - PAD);
  assert.equal(py(Y_MAX), PAD);
  assert.ok(2 * W_MAX <= X_MAX && 2 * H_MAX <= Y_MAX);
  assert.ok(-H_MAX >= X_MIN && -H_MAX >= Y_MIN);
  assert.ok(W_MAX + H_MAX <= X_MAX, "the sheared corner at (w + h, h) must fit");
});

test("the pad's edge vectors are the components between the surveyed stakes", () => {
  assert.deepEqual([PEG, STAKE_U, STAKE_V], [{ x: 0, y: 0 }, { x: 9, y: 2 }, { x: 11, y: 10 }]);
  // Tip minus tail, written out: (9 - 0, 2 - 0) = (9, 2) and (11 - 9, 10 - 2) = (2, 8).
  assert.equal(9 - 0, 9);
  assert.equal(2 - 0, 2);
  assert.equal(11 - 9, 2);
  assert.equal(10 - 2, 8);
  assert.deepEqual(componentsBetween(PEG, STAKE_U), { x: 9, y: 2 });
  assert.deepEqual(componentsBetween(STAKE_U, STAKE_V), { x: 2, y: 8 });
  assert.deepEqual(PAD_U, { x: 9, y: 2 });
  assert.deepEqual(PAD_V, { x: 2, y: 8 });
  // The third stake really is the far corner: peg + u + v = (0 + 9 + 2, 0 + 2 + 8) = (11, 10).
  assert.deepEqual({ x: PEG.x + PAD_U.x + PAD_V.x, y: PEG.y + PAD_U.y + PAD_V.y }, STAKE_V);
  // Subtracting in the other order flips the arrow, which is why the order in the copy matters.
  assert.deepEqual(componentsBetween(STAKE_V, STAKE_U), { x: -2, y: -8 });
});

test("the concrete pad worked example is right, step by step", () => {
  assert.deepEqual([PAD_U, PAD_V], [{ x: 9, y: 2 }, { x: 2, y: 8 }]);
  assert.deepEqual([DEPTH_CM, CONCRETE_KG_PER_M3, TRUCK_KG], [15, 2400, 8000]);
  assert.deepEqual(WIDEN, { a: 2, b: 0, c: 0, d: 1 });
  const ex = padExample();

  // Step 3: |9*8 - 2*2| = |72 - 4| = 68 square meters.
  assert.equal(9 * 8, 72);
  assert.equal(2 * 2, 4);
  assert.equal(72 - 4, 68);
  assert.equal(ex.area, 68);
  // Step 4: 68 square meters poured 0.15 m deep is 10.2 cubic meters.
  assert.equal(68 * 15, 1020);
  assert.equal(ex.volume.toFixed(1), "10.2");
  assert.ok(Math.abs(ex.volume - 10.2) < 1e-9);
  // Step 5: 10.2 * 2400 = 24480 kg, checked as 1020 * 24 to stay in whole numbers.
  assert.equal(1020 * 24, 24480);
  assert.equal(ex.mass, 24480);
  assert.ok(Number.isInteger(ex.mass));
  // Step 6: widening doubles the x components, so (9, 2) becomes (18, 2) and (2, 8) becomes (4, 8).
  assert.deepEqual(ex.wu, { x: 18, y: 2 });
  assert.deepEqual(ex.wv, { x: 4, y: 8 });
  assert.equal(ex.factor, 2);
  assert.equal(2 * 1 - 0 * 0, 2);
  // |18*8 - 2*4| = |144 - 8| = 136, which is exactly twice 68.
  assert.equal(18 * 8 - 2 * 4, 136);
  assert.equal(ex.wideArea, 136);
  assert.equal(ex.wideArea, 2 * ex.area);
  assert.equal(ex.wideVolume.toFixed(1), "20.4");
  assert.equal(136 * 15 * 24, 48960);
  assert.equal(ex.wideMass, 48960);
  assert.equal(ex.wideMass, 2 * ex.mass);
  // 6 loads carry 48000 kg and 7 carry 56000, so 7 truckloads with 960 kg on the last one.
  assert.equal(6 * 8000, 48000);
  assert.ok(48000 < 48960 && 48960 <= 7 * 8000);
  assert.equal(ex.loads, 7);
  assert.equal(ex.wideMass - (ex.loads - 1) * TRUCK_KG, 960);
  // The truckload sentence, rebuilt word for word.
  assert.equal(loadsSentence(ex), "At 8000 kg a truckload the crew books 7 loads, because 6 would leave 960 kg on the ground.");
  assert.doesNotMatch(loadsSentence(ex), BAD_PLURAL);
  // A one-load pour would have to read "1 load": the sentence agrees at that value too.
  assert.equal(
    loadsSentence({ ...ex, loads: 1, wideMass: 8000 }),
    "At 8000 kg a truckload the crew books 1 load, because 0 would leave 8000 kg on the ground."
  );
});

test("the Try it answer is the determinant, and the distractors are the classic slips", () => {
  assert.equal(TRY_AREA, 12);
  assert.deepEqual(TRY_MATRIX, { a: 1, b: 3, c: 0, d: 1 });
  // det = 1*1 - 3*0 = 1, so a 12 square meter courtyard stays 12 square meters.
  assert.equal(1 * 1 - 3 * 0, 1);
  assert.equal(det(TRY_MATRIX), 1);
  const target = 12 * 1;
  assert.equal(target, 12);

  const choices = tryChoices();
  assert.equal(choices.length, 4);
  assert.deepEqual(choices.map((choice) => choice.area), [36, 12, 60, 24]);
  assert.equal(new Set(choices.map((choice) => choice.area)).size, 4, "the four options are distinct");
  const answer = tryAnswerIndex();
  assert.equal(answer, 1);
  assert.equal(choices[answer].area, target);
  assert.equal(choices[answer].why, "correct");
  assert.equal(choices.filter((choice) => choice.why === "correct").length, 1);
  choices.forEach((choice, i) => {
    assert.equal(choice.area === target, i === answer, `option ${i} must ${i === answer ? "" : "not "}be ${target}`);
  });
  // 36 is 12 x 3 (the corner entry), 60 is 12 x 5 (the four entries added), 24 is 12 x 2 (the diagonal added).
  assert.equal(12 * 3, 36);
  assert.equal(1 + 3 + 0 + 1, 5);
  assert.equal(12 * 5, 60);
  assert.equal(1 + 1, 2);
  assert.equal(12 * 2, 24);

  // The sentence shown after a pick, rebuilt by hand.
  const fact = "That matrix has determinant 1 x 1 - 3 x 0 = 1, so the shear slides the courtyard into a slanted shape of exactly the same size: 12 x 1 = 12 square meters.";
  assert.equal(tryFactText(), fact);
  assert.equal(tryFeedback(1), `Right. ${fact}`);
  for (const i of [0, 2, 3]) {
    assert.equal(tryFeedback(i), `Not quite — that answer ${choices[i].why}. ${fact}`);
    assert.ok(tryFeedback(i).startsWith("Not quite"), `option ${i}`);
  }
  for (const i of [0, 1, 2, 3]) assert.doesNotMatch(tryFeedback(i), BAD_PLURAL, `option ${i}`);
});

test("lesson source cites only brief standards and keeps its markup contract", () => {
  const source = readFileSync(path.join(process.cwd(), "components/lesson/ccss/lessons", `${SLUG}.tsx`), "utf8");
  assert.ok(source.startsWith('"use client";'));
  assert.match(source, /export default function Lesson\(\)/u);

  const cited = [...source.matchAll(/\b(?:(?:K|[1-8])\.[A-Z]{1,3}\.[A-D]\.\d+|[A-Z]-[A-Z]{1,3}\.[A-D]?\.?\d+)\b/g)].map((m) => m[0]);
  assert.ok(cited.length > 0, "the Math check must cite standards");
  for (const id of cited) assert.ok(BRIEF_STANDARDS.includes(id), `${id} is not in the chapter brief`);
  for (const must of ["N-VM.1", "N-VM.2", "N-VM.3", "N-VM.4", "N-VM.5", "N-VM.11", "N-VM.12", "G-MG.1", "G-MG.2", "G-MG.3"]) {
    assert.ok(cited.includes(must), `${must} must be cited`);
  }
  // N-VM.2 is "find components of a vector between two points", so the lesson must actually subtract two points.
  assert.match(source, /componentsBetween\(PEG, STAKE_U\)/u);
  assert.match(source, /componentsBetween\(STAKE_U, STAKE_V\)/u);
  assert.match(source, /The components of a vector between two points are the tip minus the tail/u);

  const svgTags = source.split("<svg").slice(1).map((rest) => rest.slice(0, rest.indexOf(">")));
  assert.equal(svgTags.length, 1);
  for (const tag of svgTags) {
    assert.ok(tag.includes("viewBox"), "every <svg> needs a viewBox");
    assert.ok(tag.includes('role="img"') && tag.includes("aria-label"), "every <svg> needs role=img and an aria-label");
  }

  // The move choices, the mapped Try-it option, Next step, Start over, and the stepper's decrease/increase pair.
  const buttonTags = source.split("<button").slice(1).map((rest) => rest.slice(0, rest.indexOf(">")));
  assert.equal(buttonTags.length, 6);
  for (const tag of buttonTags) assert.ok(tag.includes('type="button"'), "every <button> needs type=button");

  assert.match(source, /value=\{w\} min=\{W_MIN\} max=\{W_MAX\}/u);
  assert.match(source, /value=\{h\} min=\{H_MIN\} max=\{H_MAX\}/u);
  assert.match(source, /disabled=\{value <= min\}/u);
  assert.match(source, /disabled=\{value >= max\}/u);
  assert.match(source, /aria-label=\{`Decrease \$\{label\}`\}/u);
  assert.match(source, /aria-label=\{`Increase \$\{label\}`\}/u);
  assert.match(source, /aria-expanded=\{shown > 0\} aria-controls=\{stepsId\}/u);
  assert.match(source, /id=\{stepsId\}/u);
  assert.match(source, /aria-pressed=\{moveKey === option\.key\}/u);
  assert.match(source, /aria-pressed=\{picked === i\}/u);
  // The steppers set the untransformed edges, so their visible labels must say so.
  assert.match(source, /label="Edge u before the move \(m\)"/u);
  assert.match(source, /label="Edge v before the move \(m\)"/u);
  assert.doesNotMatch(source, /label="Edge [uv] \(m\)"/u);

  // Every readout the student reads is one of the builders the grid test above proves true.
  for (const call of [
    "small={edgeCaption(p.au)}",
    "small={edgeCaption(p.av)}",
    "small={detCaption(p)}",
    "small={areaCaption(p, w, h)}",
    "small={glassCaption(p)}",
    "{verdictLine(p)}",
    "{summaryLine(p, w, h)}",
    "{loadsSentence(ex)}",
    "{tryFeedback(picked)}",
  ]) {
    assert.ok(source.includes(call), `the figure must render ${call}, the string the test checks`);
  }

  assert.doesNotMatch(source, /[\u3040-\u30ff\u3400-\u9fff]/u, "no CJK characters");
  assert.doesNotMatch(source, /Math\.random|fetch\(|localStorage|<form|dangerouslySetInnerHTML|next\/image/u);
});

test("the two edge names never share a spot", () => {
  let states = 0;
  for (let w = W_MIN; w <= W_MAX; w += 1) {
    for (let h = H_MIN; h <= H_MAX; h += 1) {
      for (const move of MOVES) {
        const p = panel(w, h, move.m), spots = edgeLabelSpots(p.au, p.av);
        const where = `${w} by ${h}, ${move.key}`;
        assert.ok(spots.v.fitted, `no clear spot for the second edge name at ${where}`);
        assert.ok(!collides(spots.u.box, spots.v.box, 3), `the two edge names overlap at ${where}`);
        states += 1;
      }
    }
  }
  assert.equal(states, (W_MAX - W_MIN + 1) * (H_MAX - H_MIN + 1) * MOVES.length);
});
