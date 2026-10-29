import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  ARC_R,
  H,
  HALVES_MAX,
  HALVES_MIN,
  IH,
  IW,
  K_MAX,
  LONG_RUN,
  PAD_B,
  PAD_L,
  PAD_R,
  PAD_T,
  POLE_SHADOW,
  RAMP_RISE,
  RAMP_RUN,
  SQ,
  STICK_HEIGHT,
  STICK_SHADOW,
  TRIPLES,
  W,
  angleDegrees,
  figureLabel,
  fmt,
  fractionText,
  gcd,
  layout,
  ratioText,
  scaleOf,
  shadowExample,
  terminates,
  tryAnswerIndex,
  tryChoices,
  unitPx,
} from "./ca-g10-ch02-similarity-right-triangle-reasoning";

const SLUG = "ca-g10-ch02-similarity-right-triangle-reasoning";
const BRIEF_STANDARDS = [
  "G-SRT.1", "G-SRT.2", "G-SRT.3", "G-SRT.4", "G-SRT.5", "G-SRT.6",
  "G-SRT.7", "G-SRT.8", "G-SRT.9", "G-SRT.10", "G-SRT.11",
];
/** Rough glyph width at font size 11, used only to keep text labels inside the viewBox. */
const GLYPH = 7;

/** Independently tabulated truth for the three triangles the figure offers. */
const EXPECTED = [
  { a: 3, b: 4, c: 5, u: 17.333, deg: 36.86989765, sin: "3/5 = 0.6", cos: "4/5 = 0.8", tan: "3/4 = 0.75" },
  { a: 5, b: 12, c: 13, u: 8.333, deg: 22.61986495, sin: "5/13 ≈ 0.385", cos: "12/13 ≈ 0.923", tan: "5/12 ≈ 0.417" },
  { a: 8, b: 15, c: 17, u: 6.5, deg: 28.07248694, sin: "8/17 ≈ 0.471", cos: "15/17 ≈ 0.882", tan: "8/15 ≈ 0.533" },
];

test("formatting helpers are exact", () => {
  assert.equal(gcd(12, 18), 6);
  assert.equal(gcd(-8, 12), 4);
  assert.equal(gcd(7, 0), 7);
  assert.equal(fmt(3), "3");
  assert.equal(fmt(45), "45");
  assert.equal(fmt(1.5), "1.5");
  assert.equal(fmt(12.5), "12.5");
  assert.equal(fmt(0.25), "0.25");
  assert.equal(fmt(2.25), "2.25");
  assert.equal(fmt(6.25), "6.25");
  assert.equal(fmt(20.25), "20.25");
  assert.equal(fractionText(3, 5), "3/5");
  assert.equal(fractionText(6, 8), "3/4");
  assert.equal(fractionText(7, 24), "7/24");
  assert.equal(fractionText(10, 5), "2");
  assert.equal(terminates(5), true);
  assert.equal(terminates(4), true);
  assert.equal(terminates(1), true);
  assert.equal(terminates(3), false);
  assert.equal(terminates(13), false);
  assert.equal(terminates(17), false);
  assert.equal(ratioText(3, 5), "3/5 = 0.6");
  assert.equal(ratioText(6, 10), "3/5 = 0.6");
  assert.equal(ratioText(5, 13), "5/13 ≈ 0.385");
});

test("the three offered triangles really are right triangles with the tabulated angles", () => {
  assert.equal(TRIPLES.length, 3);
  TRIPLES.forEach((t, i) => {
    const e = EXPECTED[i];
    assert.deepEqual([t.a, t.b, t.c], [e.a, e.b, e.c]);
    assert.equal(t.name, `${e.a}-${e.b}-${e.c}`);
    // a² + b² = c², checked with independent arithmetic.
    assert.equal(e.a * e.a + e.b * e.b, e.c * e.c);
    assert.ok(e.a < e.b && e.b < e.c, "the hypotenuse is the longest side");
    assert.equal(gcd(gcd(e.a, e.b), e.c), 1, "each triple is primitive, so its ratios are already reduced");
    assert.ok(Math.abs(angleDegrees(t) - e.deg) < 5e-6, `angle for ${t.name}`);
    assert.ok(angleDegrees(t) > 0 && angleDegrees(t) < 45, "theta is the smaller acute angle");
    assert.equal(unitPx(t), e.u);
  });
});

test("every reachable state keeps the figure's claims true and its drawing inside the viewBox", () => {
  assert.deepEqual([W, H, PAD_L, PAD_R, PAD_T, PAD_B], [380, 220, 34, 46, 30, 34]);
  assert.equal(IW, 300);
  assert.equal(IH, 156);
  assert.deepEqual([HALVES_MIN, HALVES_MAX], [1, 6]);
  assert.equal(K_MAX, 3);
  assert.equal(scaleOf(1), 0.5);
  assert.equal(scaleOf(6), 3);

  let states = 0;
  for (let i = 0; i < TRIPLES.length; i += 1) {
    const e = EXPECTED[i];
    for (let halves = HALVES_MIN; halves <= HALVES_MAX; halves += 1) {
      states += 1;
      const k = halves / 2;
      // Independent arithmetic: halving first keeps every product an exact dyadic rational.
      const sa = (e.a * halves) / 2;
      const sb = (e.b * halves) / 2;
      const sc = (e.c * halves) / 2;
      const L = layout(i, halves);

      assert.equal(L.k, k);
      assert.equal(L.sides.a, sa);
      assert.equal(L.sides.b, sb);
      assert.equal(L.sides.c, sc);
      // The dilated triangle is still a right triangle: exact, because these are multiples of 0.25.
      assert.equal(sa * sa + sb * sb, sc * sc, `Pythagoras for ${e.a}-${e.b}-${e.c} at k=${k}`);
      // Side ratios are untouched by the scaling: cross-multiplication avoids any division.
      assert.equal(sa * e.c, sc * e.a, "opposite over hypotenuse is unchanged");
      assert.equal(sb * e.c, sc * e.b, "adjacent over hypotenuse is unchanged");
      assert.equal(sa * e.b, sb * e.a, "opposite over adjacent is unchanged");
      // Area scales by k², not by k.
      assert.equal(L.baseArea, (e.a * e.b) / 2);
      assert.equal(L.area, (sa * sb) / 2);
      assert.equal(L.area, L.baseArea * k * k);
      // Printed ratios are the base triple's, whatever the scale factor.
      assert.equal(ratioText(e.a, e.c), e.sin);
      assert.equal(ratioText(e.b, e.c), e.cos);
      assert.equal(ratioText(e.a, e.b), e.tan);

      // Pixel geometry: A is fixed, B is right of A on the baseline, C is directly above B.
      assert.equal(L.ax, PAD_L);
      assert.equal(L.ay, H - PAD_B);
      assert.equal(L.by, L.ay);
      assert.equal(L.cx, L.bx);
      assert.equal(L.u, e.u);
      assert.ok(Math.abs(L.bx - (PAD_L + sb * e.u)) < 1e-9, "B sits b·k units to the right of A");
      assert.ok(Math.abs(L.cy - (H - PAD_B - sa * e.u)) < 1e-9, "C sits a·k units above the baseline");
      assert.ok(L.bx >= PAD_L && L.bx <= W - PAD_R, `B inside the box at k=${k}`);
      assert.ok(L.cy >= PAD_T && L.cy <= H - PAD_B, `C inside the box at k=${k}`);
      assert.ok(L.ghostX >= PAD_L && L.ghostX <= W - PAD_R, "the original triangle stays in the box");
      assert.ok(L.ghostY >= PAD_T && L.ghostY <= H - PAD_B, "the original triangle stays in the box");
      assert.ok(L.rayX >= PAD_L && L.rayX <= W - PAD_R, "the dilation rays stay in the box");
      assert.ok(L.rayY >= PAD_T && L.rayY <= H - PAD_B, "the dilation rays stay in the box");
      // The right-angle marker and the angle arc fit inside the drawn triangle.
      assert.ok(L.bx - SQ > L.ax, `right-angle marker fits horizontally at k=${k}`);
      assert.ok(L.by - SQ > L.cy, `right-angle marker fits vertically at k=${k}`);
      assert.ok(sb * e.u > ARC_R, `angle arc fits along the horizontal leg at k=${k}`);
      assert.ok(sc * e.u > ARC_R, `angle arc fits along the hypotenuse at k=${k}`);
      // The arc endpoint lies on the hypotenuse ray, ARC_R from A.
      const dx = L.arcEnd.x - L.ax;
      const dy = L.ay - L.arcEnd.y;
      assert.ok(Math.abs(Math.sqrt(dx * dx + dy * dy) - ARC_R) < 1e-9, "the arc has radius ARC_R");
      assert.ok(Math.abs(dy * e.b - dx * e.a) < 1e-9, "the arc ends on the hypotenuse ray");
      assert.ok(L.arcEnd.x > 0 && L.arcEnd.x < W && L.arcEnd.y > 0 && L.arcEnd.y < H);

      // Labels: the three numbers the figure prints on the sides, all inside the viewBox.
      assert.equal(L.labels.length, 3);
      assert.deepEqual(L.labels.map((lb) => lb.text), [fmt(sb), fmt(sa), fmt(sc)]);
      for (const lb of L.labels) {
        const width = lb.text.length * GLYPH;
        const left = lb.anchor === "start" ? lb.x : lb.anchor === "end" ? lb.x - width : lb.x - width / 2;
        assert.ok(left >= 0, `label "${lb.text}" runs off the left edge at k=${k}`);
        assert.ok(left + width <= W, `label "${lb.text}" runs off the right edge at k=${k}`);
        assert.ok(lb.y - 11 >= 0 && lb.y <= H, `label "${lb.text}" leaves the viewBox vertically at k=${k}`);
      }

      const label = figureLabel(i, halves);
      assert.ok(label.includes(`${e.a}-${e.b}-${e.c} right triangle`));
      assert.ok(label.includes(`scale factor ${fmt(k)}`));
      assert.ok(label.includes(`legs ${fmt(sa)} and ${fmt(sb)}, hypotenuse ${fmt(sc)}`));
      assert.ok(label.includes(`about ${e.deg.toFixed(1)} degrees`));
    }
  }
  assert.equal(states, 18);
});

test("the worked example's numbers are recomputed independently", () => {
  assert.deepEqual([STICK_HEIGHT, STICK_SHADOW, POLE_SHADOW], [6, 8, 60]);
  const ex = shadowExample();
  // Scale factor 60 ÷ 8 = 7.5
  assert.equal(60 / 8, 7.5);
  assert.equal(ex.k, 7.5);
  // Pole height 6 × 7.5 = 45
  assert.equal(6 * 7.5, 45);
  assert.equal(ex.poleHeight, 45);
  // Stick hypotenuse: 6² + 8² = 36 + 64 = 100, √100 = 10
  assert.equal(6 * 6 + 8 * 8, 100);
  assert.equal(ex.stickLegSquares, 100);
  assert.equal(ex.stickHyp, 10);
  // Pole hypotenuse: 45² + 60² = 2025 + 3600 = 5625, √5625 = 75, and 10 × 7.5 = 75 agrees
  assert.equal(45 * 45 + 60 * 60, 5625);
  assert.equal(ex.poleLegSquares, 5625);
  assert.equal(ex.poleHyp, 75);
  assert.equal(10 * 7.5, 75);
  // The tangent of the sun's elevation is the same from either triangle
  assert.equal(6 / 8, 0.75);
  assert.equal(45 / 60, 0.75);
  assert.equal(ex.tan, 0.75);
  assert.ok(Math.abs(ex.sunAngle - 36.86989765) < 5e-6);
  assert.equal(ex.sunAngle.toFixed(1), "36.9");
  // The pole triangle is the stick triangle scaled: 6-8-10 times 7.5 is 45-60-75
  assert.equal(6 * 7.5, 45);
  assert.equal(8 * 7.5, 60);
  assert.equal(10 * 7.5, 75);
});

test("the Try it answer is the only choice that scales the rise by the scale factor", () => {
  assert.deepEqual([RAMP_RISE, RAMP_RUN, LONG_RUN], [7, 24, 96]);
  // Scale factor 96 ÷ 24 = 4, so the rise is 7 × 4 = 28
  assert.equal(96 / 24, 4);
  assert.equal(7 * 4, 28);
  const choices = tryChoices();
  const answer = tryAnswerIndex();
  assert.equal(choices.length, 4);
  assert.equal(answer, 1);
  assert.equal(choices[answer].value, 28);
  assert.equal(choices[answer].why, "correct");
  assert.equal(choices.filter((c) => c.why === "correct").length, 1);
  assert.equal(new Set(choices.map((c) => c.value)).size, 4, "the four choices are distinct");
  for (let i = 1; i < choices.length; i += 1) {
    assert.ok(choices[i].value > choices[i - 1].value, "choices are listed in increasing order");
  }
  // The answer keeps rise ÷ run constant: 28/96 = 7/24 by cross-multiplication.
  assert.equal(28 * 24, 7 * 96);
  // Distractors: 7 ÷ 4 = 1.75 (inverted), 7 + 72 = 79 (added), √(96² + 28²) = √10000 = 100 (the ramp itself).
  assert.equal(7 / 4, 1.75);
  assert.equal(choices[0].value, 1.75);
  assert.equal(7 + (96 - 24), 79);
  assert.equal(choices[2].value, 79);
  assert.equal(96 * 96 + 28 * 28, 10000);
  assert.equal(choices[3].value, 100);
  for (const wrong of [choices[0].value, choices[2].value, choices[3].value]) {
    assert.notEqual(wrong * 24, 7 * 96, "a distractor must not preserve the 7 : 24 ratio");
  }
});

test("lesson source cites only brief standards and keeps its markup contract", () => {
  const source = readFileSync(path.join(process.cwd(), "components/lesson/ccss/lessons", `${SLUG}.tsx`), "utf8");
  assert.ok(source.startsWith('"use client";'));
  assert.match(source, /export default function Lesson\(\)/u);

  const cited = [...source.matchAll(/\b(?:(?:K|[1-8])\.[A-Z]{1,3}\.[A-D]\.\d+|[A-Z]-[A-Z]{1,3}\.[A-D]?\.?\d+)\b/g)].map((m) => m[0]);
  assert.ok(cited.length > 0, "the Math check must cite standards");
  for (const id of cited) assert.ok(BRIEF_STANDARDS.includes(id), `${id} is not in the chapter brief`);
  for (const must of ["G-SRT.1", "G-SRT.2", "G-SRT.3", "G-SRT.5", "G-SRT.6", "G-SRT.7", "G-SRT.8", "G-SRT.9"]) {
    assert.ok(cited.includes(must), `${must} must be cited`);
  }

  const svgTags = source.split("<svg").slice(1).map((rest) => rest.slice(0, rest.indexOf(">")));
  assert.equal(svgTags.length, 1);
  for (const tag of svgTags) {
    assert.ok(tag.includes("viewBox"), "every <svg> needs a viewBox");
    assert.ok(tag.includes('role="img"') && tag.includes("aria-label"), "every <svg> needs role=img and an aria-label");
  }

  const buttonTags = source.split("<button").slice(1).map((rest) => rest.slice(0, rest.indexOf(">")));
  // Three triangle choices, four Try-it choices, Next step, Start over, and the stepper's minus/plus pair.
  assert.equal(buttonTags.length, 6);
  for (const tag of buttonTags) assert.ok(tag.includes('type="button"'), "every <button> needs type=button");

  assert.match(source, /label="Scale factor k" value=\{halves\} min=\{1\} max=\{6\}/u);
  assert.match(source, /aria-expanded=\{shown > 0\} aria-controls=\{stepsId\}/u);
  assert.match(source, /id=\{stepsId\}/u);
  assert.equal(source.split("aria-pressed=").length - 1, 2, "both mapped choice rows expose aria-pressed");
  assert.match(source, /aria-label=\{`Decrease \$\{label\}`\}/u);
  assert.match(source, /aria-label=\{`Increase \$\{label\}`\}/u);
  assert.doesNotMatch(source, /[\u3040-\u30ff\u3400-\u9fff]/u, "no CJK characters");
  assert.doesNotMatch(source, /Math\.random|fetch\(|localStorage|<form|dangerouslySetInnerHTML|next\/image/u);
  assert.doesNotMatch(source, /bg-linear-|inset-shadow-|text-shadow-|field-sizing-/u, "Tailwind 3.4 only");
});
