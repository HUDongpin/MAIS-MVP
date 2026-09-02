import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  CPAD,
  CRANGE,
  CUNIT,
  CW,
  CH,
  GH,
  GHALF,
  GMID,
  GPAD,
  GW,
  P_MAX,
  P_MIN,
  Q_MAX,
  Q_MIN,
  R_MAX,
  R_MIN,
  SAMPLES,
  STEP,
  TRY_CHOICES,
  TRY_DEGREE,
  TRY_KNOWN,
  TRY_REAL_ZEROS,
  WE_IM,
  WE_RE,
  WE_ROOT,
  XMAX,
  XMIN,
  closureSentence,
  complexText,
  conjugate,
  conjugateSentence,
  crossingText,
  cubicText,
  cxOf,
  cyOf,
  discriminant,
  discriminantSentence,
  expand,
  expandedNote,
  factorSentence,
  factoredNote,
  formulaSentence,
  ftaSentence,
  graphLabel,
  graphSamples,
  graphSentence,
  gx,
  gyOf,
  linearFactorText,
  num,
  planeLabel,
  planeSentence,
  polyValue,
  quadraticFactorText,
  realQuadraticFromPair,
  realZeros,
  rebuildNote,
  signedAddend,
  term,
  tryAnswerIndex,
  workedExample,
  yUnit,
  zeroCountText,
  zeros,
  type Zero,
} from "./ca-g12-ch02-polynomial-structure-behavior";

const SLUG = "ca-g12-ch02-polynomial-structure-behavior";
const BRIEF_STANDARDS = [
  "A-APR.1", "A-APR.2", "A-APR.3", "A-APR.4", "A-APR.5", "A-APR.6", "A-APR.7",
  "N-CN.1", "N-CN.2", "N-CN.3", "N-CN.4", "N-CN.5", "N-CN.6", "N-CN.7", "N-CN.8", "N-CN.9",
];
const EPS = 1e-9;
/** Pixel comparisons only need to survive one division and one multiplication. */
const PIXEL_EPS = 1e-6;
/** IEEE gives −0 for products such as (−3)(0); adding 0 folds it back onto +0. */
const norm = (n: number) => n + 0;

type C = { re: number; im: number };
const cAdd = (a: C, b: C): C => ({ re: a.re + b.re, im: a.im + b.im });
const cMul = (a: C, b: C): C => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });

/** Horner evaluation of a real-coefficient polynomial at a complex point. */
function evalAt(coefficients: number[], z: C): C {
  return coefficients.reduce<C>((acc, k) => cAdd(cMul(acc, z), { re: k, im: 0 }), { re: 0, im: 0 });
}

/** Schoolbook convolution — an implementation of "multiply out" written from scratch. */
function multiplyPoly(a: number[], b: number[]): number[] {
  const out = new Array<number>(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i += 1) {
    for (let j = 0; j < b.length; j += 1) out[i + j] += a[i] * b[j];
  }
  return out;
}

/** Expand (x − z₁)(x − z₂)… over the complex numbers, highest power first. */
function fromZeros(list: C[]): C[] {
  let poly: C[] = [{ re: 1, im: 0 }];
  for (const z of list) {
    const next: C[] = Array.from({ length: poly.length + 1 }, () => ({ re: 0, im: 0 }));
    for (let i = 0; i < poly.length; i += 1) {
      next[i] = cAdd(next[i], poly[i]);
      next[i + 1] = cAdd(next[i + 1], cMul(poly[i], { re: -z.re, im: -z.im }));
    }
    poly = next;
  }
  return poly;
}

test("panel geometry, control bounds and number formatting", () => {
  assert.deepEqual([R_MIN, R_MAX, P_MIN, P_MAX, Q_MIN, Q_MAX], [-3, 3, -2, 2, 0, 3]);
  assert.deepEqual([GW, GH, GPAD, XMIN, XMAX], [300, 220, 28, -4, 4]);
  assert.equal(GMID, 110);
  assert.equal(GHALF, 82);
  assert.equal(STEP, 0.0625, "1/16 is exact in binary");
  assert.equal(SAMPLES, 128);
  assert.equal(gx(XMIN), GPAD);
  assert.equal(gx(XMAX), GW - GPAD);
  assert.equal(gx(0), GW / 2);
  assert.equal(gyOf(0, 3), GMID);

  assert.deepEqual([CW, CH, CPAD, CRANGE], [220, 220, 26, 3.5]);
  assert.equal(CUNIT, 24);
  assert.equal(cxOf(-CRANGE), CPAD);
  assert.equal(cxOf(CRANGE), CW - CPAD);
  assert.equal(cyOf(CRANGE), CPAD);
  assert.equal(cyOf(-CRANGE), CH - CPAD);
  assert.equal(cxOf(0), CW / 2);
  assert.equal(cyOf(0), CH / 2);

  assert.equal(num(4), "4");
  assert.equal(num(0), "0");
  assert.equal(num(-3), "−3");
  assert.equal(term(0, "x"), "");
  assert.equal(term(1, "x²"), " + x²");
  assert.equal(term(-1, "x"), " − x");
  assert.equal(term(-13, ""), " − 13");
  assert.equal(term(5, ""), " + 5");
  assert.equal(signedAddend(-5), "− 5");
  assert.equal(signedAddend(17), "+ 17");
  assert.equal(cubicText(-5, 17, -13), "x³ − 5x² + 17x − 13");
  assert.equal(cubicText(0, 0, 0), "x³");
  assert.equal(linearFactorText(0), "x");
  assert.equal(linearFactorText(3), "x − 3");
  assert.equal(linearFactorText(-2), "x + 2");
  assert.equal(quadraticFactorText(2, 3), "x² − 4x + 13");
  assert.equal(quadraticFactorText(0, 0), "x²");
  assert.equal(quadraticFactorText(-1, 1), "x² + 2x + 2");
  assert.equal(complexText(2, 3), "2 + 3i");
  assert.equal(complexText(2, -3), "2 − 3i");
  assert.equal(complexText(0, 1), "i");
  assert.equal(complexText(0, -1), "−i");
  assert.equal(complexText(-2, 1), "−2 + i");
  assert.equal(complexText(5, 0), "5");
  assert.equal(complexText(0, 0), "0");
  assert.equal(discriminant(0), 0);
  assert.equal(discriminant(3), -36);
});

/** Terms of a printed factor: "x \u2212 3" is two, "x" is one, "x\u00b2 + 2x + 2" is three. */
function printedTerms(text: string): number { return text.split(/ [\u2212+] /u).length; }

test("every one of the 140 reachable control states keeps the figure and its readouts true", () => {
  let states = 0;
  let negativeCoefficientStates = 0;

  for (let r = R_MIN; r <= R_MAX; r += 1) {
    for (let p = P_MIN; p <= P_MAX; p += 1) {
      for (let q = Q_MIN; q <= Q_MAX; q += 1) {
        states += 1;
        const where = `r=${r} p=${p} q=${q}`;

        // --- the two written forms are the same polynomial -----------------------
        const expanded = multiplyPoly([1, -r], [1, -2 * p, p * p + q * q]);
        const { b, c, d } = expand(r, p, q);
        assert.deepEqual(expanded.map(norm), [1, b, c, d].map(norm), `${where}: multiplying out`);
        // Integer, not "whole number": 89 of the 140 states print a negative coefficient.
        for (const k of [b, c, d]) assert.ok(Number.isInteger(k), `${where}: integer coefficient`);
        if ([b, c, d].some((k) => k < 0)) negativeCoefficientStates += 1;
        // The quadratic factor's discriminant straight from its own coefficients.
        const quadDisc = (-2 * p) ** 2 - 4 * (p * p + q * q);
        assert.equal(norm(quadDisc), norm(-4 * q * q), `${where}: the discriminant is −4q²`);
        assert.equal(norm(quadDisc), norm(discriminant(q)), `${where}: the printed discriminant`);
        assert.ok(quadDisc <= 0, `${where}: it is never positive`);
        for (const x of [-4, -1.5, 0, 1, 2.25, 4]) {
          assert.ok(
            Math.abs(polyValue(r, p, q, x) - (x ** 3 + b * x ** 2 + c * x + d)) < EPS,
            `${where}: factored and expanded agree at x = ${x}`
          );
        }

        // --- all three zeros really are zeros ------------------------------------
        const zs = zeros(r, p, q);
        assert.equal(zs.length, 3, `${where}: degree three, three zeros`);
        for (const z of zs) {
          const v = evalAt([1, b, c, d], z);
          assert.ok(Math.abs(v.re) < EPS && Math.abs(v.im) < EPS, `${where}: ${complexText(z.re, z.im)} is a zero`);
        }
        assert.deepEqual(zs[2], { re: zs[1].re, im: -zs[1].im }, `${where}: the pair is a conjugate pair`);

        // --- Vieta, computed from the zeros rather than from expand() -------------
        const total = zs.reduce(cAdd, { re: 0, im: 0 });
        const pairs = cAdd(cAdd(cMul(zs[0], zs[1]), cMul(zs[0], zs[2])), cMul(zs[1], zs[2]));
        const product = cMul(cMul(zs[0], zs[1]), zs[2]);
        assert.ok(Math.abs(total.im) < EPS && Math.abs(pairs.im) < EPS && Math.abs(product.im) < EPS, `${where}: real coefficients`);
        assert.equal(norm(total.re), norm(-b), `${where}: the zeros add to −b`);
        assert.equal(norm(total.re), norm(r + 2 * p), `${where}: and that sum is r + 2p`);
        assert.equal(norm(pairs.re), norm(c), `${where}: pairwise products give c`);
        assert.equal(norm(product.re), norm(-d), `${where}: the zeros multiply to −d`);
        assert.equal(norm(product.re), norm(r * (p * p + q * q)), `${where}: and that product is r(p² + q²)`);

        // --- which zeros the real graph can show, censused from the curve itself --
        // Every zero of p is an integer in [−3, 3], so the 1/16 grid (exact in binary)
        // hits all of them; this census never consults realZeros().
        const reals: number[] = [];
        for (let i = 0; i <= SAMPLES; i += 1) {
          const x = XMIN + i * STEP;
          if (polyValue(r, p, q, x) === 0) reals.push(x);
        }
        assert.ok(reals.length >= 1 && reals.length <= 2, `${where}: a cubic like this has one or two distinct real zeros`);
        assert.deepEqual(realZeros(r, p, q), reals, `${where}: the listed real zeros are the ones the curve actually has`);
        // r is always a simple crossing: p(x) = (x − r)·((x − p)² + q²) and the second factor is positive there.
        assert.ok(polyValue(r, p, q, r - 0.5) < 0 && polyValue(r, p, q, r + 0.5) > 0, `${where}: the curve crosses at r`);
        // Crossing vs touching, decided by the sign either side; zeros are integers,
        // so ±0.25 never reaches a neighbouring zero.
        const sideSigns = (z: number) => [Math.sign(polyValue(r, p, q, z - 0.25)), Math.sign(polyValue(r, p, q, z + 0.25))];
        for (const z of reals) assert.ok(sideSigns(z).every((sign) => sign !== 0), `${where}: no extra zero within a quarter of x = ${z}`);
        const crossings = reals.filter((z) => sideSigns(z)[0] !== sideSigns(z)[1]);
        const touches = reals.filter((z) => sideSigns(z)[0] === sideSigns(z)[1]);
        assert.equal(crossings.length, 1, `${where}: exactly one sign change on the whole axis`);
        // Multiplicity at p read off the expanded coefficients: p(p), p′(p), p″(p).
        const doubleAtP = p ** 3 + b * p * p + c * p + d === 0 && 3 * p * p + 2 * b * p + c === 0;
        const tripleAtP = doubleAtP && 6 * p + 2 * b === 0;

        const crossing = crossingText(r, p, q);
        assert.ok(crossing.startsWith("crosses the horizontal axis"), `${where}: ${crossing}`);
        for (const z of crossings) assert.ok(crossing.includes(`at x = ${num(z)}`), `${where}: ${crossing}`);
        for (const z of touches) assert.ok(crossing.includes(`touches it without crossing at x = ${num(z)}`), `${where}: ${crossing}`);
        assert.equal(crossing.includes("touches it without crossing"), touches.length > 0, `${where}: ${crossing}`);
        assert.equal(crossing.includes("once"), touches.length === 0, `${where}: ${crossing}`);
        assert.equal(crossing.includes("all three zeros pile up"), tripleAtP, `${where}: ${crossing}`);

        const count = zeroCountText(r, p, q);
        assert.ok(count.startsWith(`${reals.length} distinct real ${reals.length === 1 ? "zero" : "zeros"} `), `${where}: ${count}`);
        assert.equal(count.includes("one conjugate pair"), quadDisc < 0, `${where}: ${count}`);
        assert.equal(count.includes("no non-real zeros"), quadDisc === 0, `${where}: ${count}`);
        assert.equal(count.includes("counted three times"), tripleAtP, `${where}: ${count}`);
        assert.equal(count.includes("counted twice"), doubleAtP && !tripleAtP, `${where}: ${count}`);

        // --- the four card notes, which used to be untestable inline strings ------
        const notes = [factoredNote(p, q), expandedNote(), zeroCountText(r, p, q), rebuildNote(r, p, q)];
        for (const note of notes) assert.doesNotMatch(note, /whole number/u, `${where}: a coefficient here may be negative, so it is not a whole number`);
        assert.equal(expandedNote(), "multiplying polynomials gives a polynomial, and every coefficient here is an integer");
        if (quadDisc < 0) {
          assert.ok(factoredNote(p, q).includes(`discriminant ${num(quadDisc)}, so it never reaches zero on the real line`), `${where}: ${factoredNote(p, q)}`);
          for (let i = 0; i <= SAMPLES; i += 1) {
            const x = XMIN + i * STEP;
            assert.notEqual(x * x - 2 * p * x + (p * p + q * q), 0, `${where}: the quadratic factor has no real zero`);
          }
        } else {
          assert.ok(factoredNote(p, q).includes(`perfect square (${linearFactorText(p)})²`), `${where}: ${factoredNote(p, q)}`);
          for (const x of [-2.5, 0, 1.5, 3]) assert.equal(x * x - 2 * p * x + (p * p + q * q), (x - p) ** 2, `${where}: it really is (x − p)²`);
        }
        const rebuild = rebuildNote(r, p, q);
        assert.ok(rebuild.includes(`−(${num(norm(total.re))}) = ${num(b)}`), `${where}: ${rebuild}`);
        assert.ok(rebuild.includes(`the product ${num(norm(product.re))} makes the constant term −(${num(norm(product.re))}) = ${num(d)}`), `${where}: ${rebuild}`);

        // --- the Math check, sentence by sentence --------------------------------
        const check = [
          closureSentence(r, p, q), factorSentence(r), graphSentence(r, p, q), discriminantSentence(p, q),
          formulaSentence(p, q), conjugateSentence(p, q), planeSentence(q), ftaSentence(r, p, q),
        ].join(" ");
        assert.doesNotMatch(check, /whole number/u, `${where}: the Math check must not call a coefficient a whole number`);
        assert.ok(check.includes(`gives ${cubicText(b, c, d)}`), `${where}: it quotes the expanded cubic`);
        assert.ok(check.includes(`p(${num(r)}) = 0`), `${where}: it quotes the remainder`);
        assert.equal(polyValue(r, p, q, r), 0, `${where}: and that remainder really is 0`);
        assert.ok(check.includes(crossing), `${where}: it quotes the crossing sentence`);
        assert.ok(check.includes(count), `${where}: it quotes the zero count`);
        // The negative-discriminant narrative appears only where the discriminant is negative.
        assert.equal(check.includes("which is negative, so no real number is a zero of it"), quadDisc < 0, `${where}: negative-discriminant narrative`);
        assert.equal(check.includes(`returning ${complexText(p, q)} and ${complexText(p, -q)}`), quadDisc < 0, `${where}: the pair is named only when it exists`);
        assert.equal(check.includes("sitting symmetrically above and below the real axis"), quadDisc < 0, `${where}: the plane sentence`);
        // …and the double-zero narrative only where it is zero, where nothing forces the repeat.
        assert.equal(check.includes("a real double zero, not a conjugate pair"), quadDisc === 0, `${where}: double-zero narrative`);
        assert.equal(check.includes("real coefficients never force a real zero to repeat"), quadDisc === 0, `${where}: repetition is not forced`);
        assert.equal(check.includes("all three sit on the real axis itself"), quadDisc === 0, `${where}: the plane sentence`);
        assert.equal(quadDisc === 0, doubleAtP, `${where}: a zero discriminant is exactly the repeated-real-zero case`);
        // No shape word may name a factor that has a different number of printed terms.
        if (check.includes("binomial")) assert.equal(printedTerms(linearFactorText(r)), 2, `${where}: "binomial" names (${linearFactorText(r)})`);
        if (check.includes("trinomial")) assert.equal(printedTerms(quadraticFactorText(p, q)), 3, `${where}: "trinomial" names (${quadraticFactorText(p, q)})`);
        if (check.includes("monomial")) assert.equal(printedTerms(linearFactorText(r)), 1, `${where}: "monomial" names (${linearFactorText(r)})`);

        // --- the drawn curve stays inside the left panel -------------------------
        const samples = graphSamples(r, p, q);
        assert.equal(samples.length, SAMPLES + 1, `${where}: sample count`);
        const peak = samples.reduce((best, s) => Math.max(best, Math.abs(s.y)), 0);
        assert.ok(peak > 1, `${where}: the curve really does leave the axis somewhere in the window`);
        const unit = yUnit(r, p, q);

        // The vertical scale must be set by the part of the curve the copy talks
        // about — the crossings — not by the far tail of the cubic, which used to
        // flatten the interesting part onto the axis.
        const zerosOnAxis = [r, p].filter((z) => q === 0 || z === r);
        const lo = Math.min(...zerosOnAxis) - 1.5, hi = Math.max(...zerosOnAxis) + 1.5;
        const near = samples.filter((sample) => sample.x >= lo && sample.x <= hi);
        const nearPeak = (near.length ? near : samples).reduce((best, sample) => Math.max(best, Math.abs(sample.y)), 0);
        assert.equal(unit, GHALF / Math.max(nearPeak, 1), `${where}: the scale must come from the window holding the zeros`);

        // And the curve must be visibly non-flat around its zeros: at least a tenth
        // of the panel's half-height somewhere in that window.
        assert.ok(nearPeak * unit > GHALF / 10, `${where}: the curve is drawn nearly flat where the copy describes crossings`);
        for (const [i, s] of samples.entries()) {
          assert.ok(Math.abs(s.x - (XMIN + i * STEP)) < EPS, `${where}: even sampling`);
          assert.equal(norm(s.y), norm(polyValue(r, p, q, s.x)), `${where}: plotted y is p(x)`);
          const px = gx(s.x);
          const py = gyOf(s.y, unit);
          assert.ok(px >= GPAD - PIXEL_EPS && px <= GW - GPAD + PIXEL_EPS, `${where}: sample x pixel ${px}`);
          assert.ok(py >= GPAD - PIXEL_EPS && py <= GH - GPAD + PIXEL_EPS, `${where}: sample y pixel ${py}`);
          if (i > 0) assert.ok(Math.abs(s.x - samples[i - 1].x - STEP) < EPS, `${where}: the polyline has no gap`);
        }
        for (const z of reals) {
          const px = gx(z);
          assert.ok(px - 7 >= 0 && px + 7 <= GW, `${where}: the root marker is inside the viewBox`);
          assert.ok(px >= GPAD && px <= GW - GPAD, `${where}: the root marker is inside the plot`);
        }

        // --- and every zero stays inside the right panel -------------------------
        for (const z of zs) {
          const px = cxOf(z.re);
          const py = cyOf(z.im);
          assert.ok(px >= CPAD && px <= CW - CPAD, `${where}: plane x ${px}`);
          assert.ok(py >= CPAD && py <= CH - CPAD, `${where}: plane y ${py}`);
          assert.ok(px - 8 >= 0 && px + 8 <= CW && py - 8 >= 0 && py + 8 <= CH, `${where}: the marker circle fits`);
          const labelX = z.re >= 1 ? px - 10 : px + 10;
          const labelY = py - 9;
          assert.ok(labelX >= 4 && labelX <= CW - 4, `${where}: label anchor x ${labelX}`);
          assert.ok(labelY >= 4 && labelY <= CH - 4, `${where}: label anchor y ${labelY}`);
        }

        // --- the accessible labels say what is actually drawn --------------------
        const gLabel = graphLabel(r, p, q);
        assert.ok(gLabel.includes(`y = ${cubicText(b, c, d)}`), `${where}: ${gLabel}`);
        assert.ok(gLabel.includes(crossing), `${where}: ${gLabel}`);
        const cLabel = planeLabel(r, p, q);
        for (const z of zs) assert.ok(cLabel.includes(complexText(z.re, z.im)), `${where}: ${cLabel}`);
        assert.ok(
          cLabel.includes(q > 0 ? "two mirrored across it" : "all three on the horizontal real axis"),
          `${where}: ${cLabel}`
        );

        // --- printed factorisation is well formed --------------------------------
        const factored = `(${linearFactorText(r)})(${quadraticFactorText(p, q)})`;
        assert.doesNotMatch(factored, /\+ −|− −|\(\)|\+ 0\b|− 0\b/u, `${where}: ${factored}`);
        assert.doesNotMatch(cubicText(b, c, d), /\+ −|− −|\+ 0\b|− 0\b/u, `${where}: ${cubicText(b, c, d)}`);
        assert.ok(cubicText(b, c, d).startsWith("x³"), `${where}: the cubic is monic`);
        assert.ok(quadraticFactorText(p, q).startsWith("x²"), `${where}: the quadratic factor is monic`);
      }
    }
  }

  assert.equal(states, 7 * 5 * 4);
  assert.equal(states, 140);
  // 89 of the 140 states print at least one negative coefficient, so "integer" is
  // doing real work — "whole number" would be false in every one of them.
  assert.equal(negativeCoefficientStates, 89);
  // 35 states have q = 0, where the discriminant is 0 and the pair is a real double zero.
  assert.equal(7 * 5 * 1, 35);
});

test("worked example: q(x) = x³ − 5x² + 17x − 13 splits as (x − 1)(x² − 4x + 13)", () => {
  assert.deepEqual([WE_ROOT, WE_RE, WE_IM], [1, 2, 3]);
  const we = workedExample();

  // Built by hand from the zeros 1, 2 + 3i, 2 − 3i.
  // (x − 1)(x² − 4x + 13) = x³ − 4x² + 13x − x² + 4x − 13 = x³ − 5x² + 17x − 13.
  assert.deepEqual([we.b, we.c, we.d], [-5, 17, -13]);
  assert.equal(we.cubic, "x³ − 5x² + 17x − 13");
  assert.deepEqual(multiplyPoly([1, -1], [1, -4, 13]), [1, -5, 17, -13]);

  // Step 1: q(1) = 1 − 5 + 17 − 13 = 0.
  assert.equal(1 - 5 + 17 - 13, 0);
  assert.equal(we.remainder, 0);
  assert.equal(we.remainder, 1 ** 3 + we.b * 1 ** 2 + we.c * 1 + we.d);

  // Step 3: synthetic division by x = 1 on 1, −5, 17, −13.
  // 1 · 1 + (−5) = −4;  1 · (−4) + 17 = 13;  1 · 13 + (−13) = 0.
  assert.equal(1 * 1 + -5, -4);
  assert.equal(1 * -4 + 17, 13);
  assert.equal(1 * 13 + -13, 0);
  assert.deepEqual([we.q1, we.q0, we.rest], [-4, 13, 0]);
  assert.equal(we.quotient, "x² − 4x + 13");

  // Step 4: discriminant (−4)² − 4·13 = 16 − 52 = −36, so x = (4 ± 6i)/2 = 2 ± 3i.
  assert.equal((-4) ** 2 - 4 * 13, -36);
  assert.equal(we.disc, -36);
  assert.equal(Math.sqrt(36), 6);
  assert.equal(we.re, 4 / 2);
  assert.equal(we.im, 6 / 2);
  assert.deepEqual([we.re, we.im], [2, 3]);
  assert.equal(complexText(we.re, we.im), "2 + 3i");
  assert.equal(complexText(we.re, -we.im), "2 − 3i");

  // Every claimed zero really annihilates the cubic, checked in complex arithmetic.
  for (const z of [{ re: 1, im: 0 }, { re: 2, im: 3 }, { re: 2, im: -3 }]) {
    const v = evalAt([1, we.b, we.c, we.d], z);
    assert.ok(Math.abs(v.re) < EPS && Math.abs(v.im) < EPS, `${complexText(z.re, z.im)} is a zero`);
  }
  // (2 + 3i)(2 − 3i) = 4 − 9i² = 4 + 9 = 13, and 1 + 2 + 2 = 5.
  assert.deepEqual(cMul({ re: 2, im: 3 }, { re: 2, im: -3 }), { re: 13, im: 0 });
  assert.equal(we.sum, 5);
  assert.equal(we.sum, -we.b);
  assert.equal(we.product, 13);
  assert.equal(we.product, -we.d);

  // Step 5's sentence quotes these; nothing there is a stray literal.
  assert.equal(signedAddend(we.b * WE_ROOT ** 2), "− 5");
  assert.equal(signedAddend(we.c * WE_ROOT), "+ 17");
  assert.equal(signedAddend(we.d), "− 13");
  assert.equal(linearFactorText(WE_ROOT), "x − 1");
});

test("Try it: only the conjugate keeps the quartic's coefficients real", () => {
  assert.equal(TRY_DEGREE, 4);
  assert.deepEqual(TRY_KNOWN, { re: 2, im: -7 });
  assert.deepEqual(TRY_REAL_ZEROS, [0, 5]);
  assert.equal(TRY_CHOICES.length, 4);
  assert.equal(new Set(TRY_CHOICES.map((choice) => complexText(choice.z.re, choice.z.im))).size, 4);
  assert.equal(TRY_CHOICES.filter((choice) => choice.why === "correct").length, 1);
  assert.deepEqual(conjugate(TRY_KNOWN), { re: 2, im: 7 });
  assert.deepEqual(conjugate(conjugate(TRY_KNOWN)), TRY_KNOWN);

  const answer = tryAnswerIndex();
  assert.equal(answer, 1);
  assert.deepEqual(TRY_CHOICES[answer].z, { re: 2, im: 7 });
  assert.equal(TRY_CHOICES[answer].why, "correct");

  // Independent test of the property the question is really about: build the whole
  // degree-4 polynomial from its zeros and demand real coefficients.
  const known: Zero[] = [{ re: 0, im: 0 }, { re: 5, im: 0 }, TRY_KNOWN];
  for (const [i, choice] of TRY_CHOICES.entries()) {
    const coefficients = fromZeros([...known, choice.z]);
    assert.equal(coefficients.length, TRY_DEGREE + 1);
    const allReal = coefficients.every((k) => Math.abs(k.im) < EPS);
    assert.equal(allReal, i === answer, `the choice ${complexText(choice.z.re, choice.z.im)} keeps coefficients real only if it is the conjugate`);
  }
  // The correct quartic, by hand: x(x − 5)(x² − 4x + 53) = x⁴ − 9x³ + 73x² − 265x.
  const real = fromZeros([...known, TRY_CHOICES[answer].z]).map((k) => Math.round(k.re));
  assert.deepEqual(real, [1, -9, 73, -265, 0]);
  assert.deepEqual(multiplyPoly(multiplyPoly([1, 0], [1, -5]), [1, -4, 53]), [1, -9, 73, -265, 0]);

  // (x − (2 − 7i))(x − (2 + 7i)) = x² − 4x + 53, because 2·2 = 4 and 2² + 7² = 53.
  const guard = realQuadraticFromPair(TRY_KNOWN);
  assert.deepEqual(guard, { b: -4, c: 53 });
  assert.equal(2 * 2 + 7 * 7, 53);
  assert.equal(`x²${term(guard.b, "x")}${term(guard.c, "")}`, "x² − 4x + 53");
});

test("lesson source cites only brief standards and keeps its markup contract", () => {
  const source = readFileSync(path.join(process.cwd(), "components/lesson/ccss/lessons", `${SLUG}.tsx`), "utf8");
  assert.ok(source.startsWith('"use client";'));
  assert.match(source, /export default function Lesson\(\)/u);

  const cited = [...source.matchAll(/\b(?:(?:K|[1-8])\.[A-Z]{1,3}\.[A-D]\.\d+|[A-Z]-[A-Z]{1,3}\.[A-D]?\.?\d+)\b/gu)].map((m) => m[0]);
  assert.ok(cited.length > 0, "the Math check must cite standards");
  for (const id of cited) assert.ok(BRIEF_STANDARDS.includes(id), `${id} is not in the chapter brief`);
  for (const must of ["A-APR.1", "A-APR.2", "A-APR.3", "N-CN.1", "N-CN.3", "N-CN.4", "N-CN.7", "N-CN.8", "N-CN.9"]) {
    assert.ok(cited.includes(must), `${must} must be cited`);
  }

  const svgTags = source.split("<svg").slice(1).map((rest) => rest.slice(0, rest.indexOf(">")));
  assert.equal(svgTags.length, 2);
  for (const tag of svgTags) {
    assert.ok(tag.includes("viewBox"), "every <svg> needs a viewBox");
    assert.ok(tag.includes('role="img"') && tag.includes("aria-label"), "every <svg> needs role=img and an aria-label");
  }

  // Next step, Start over, the mapped Try-it choice, and the stepper pair.
  const buttons = source.split("<button").slice(1);
  assert.equal(buttons.length, 5);
  for (const rest of buttons) assert.ok(rest.startsWith(' type="button"'), "every <button> needs type=button first");

  assert.match(source, /label="Real zero r" value=\{r\} min=\{-3\} max=\{3\}/u);
  assert.match(source, /label="Real part p" value=\{p\} min=\{-2\} max=\{2\}/u);
  assert.match(source, /label="Imaginary part q" value=\{q\} min=\{0\} max=\{3\}/u);
  assert.match(source, /aria-expanded=\{shown > 0\} aria-controls=\{stepsId\}/u);
  assert.match(source, /id=\{stepsId\}/u);
  assert.match(source, /aria-pressed=\{picked === i\}/u);
  assert.match(source, /aria-label=\{`Decrease \$\{label\}`\}/u);
  assert.match(source, /aria-label=\{`Increase \$\{label\}`\}/u);
  assert.match(source, /disabled=\{value <= min\}/u);
  assert.match(source, /disabled=\{value >= max\}/u);
  assert.doesNotMatch(source, /[\u3040-\u30ff\u3400-\u9fff]/u, "no CJK characters");
  assert.doesNotMatch(source, /Math\.random|fetch\(|localStorage|<form|dangerouslySetInnerHTML|next\/image/u);

  // The authoring contract bans internal identifiers from student-facing text.
  for (const banned of [/\bcandidates?\b/iu, /\bCodex\b/iu, /\bQA\b/u, /\bS\d{1,2}\b/u, /us-ca-math-s\d/u, /topicId/u]) {
    assert.doesNotMatch(source, banned, `the lesson must not contain ${banned}`);
  }

  // Every card note and every Math-check sentence is an exported helper the grid
  // test above exercises, not an inline string no test can see.
  for (const fragment of ["small: factoredNote(p, q)", "small: expandedNote()", "small: zeroCountText(r, p, q)", "small: rebuildNote(r, p, q)"]) {
    assert.ok(source.includes(fragment), `the cards must render ${fragment}`);
  }
  assert.doesNotMatch(source, /small: ["`]/u, "no card note may be an inline string literal");
  const mathCheck = source.slice(source.indexOf("<MathCheck"), source.indexOf("</MathCheck>"));
  for (const fragment of [
    "{closureSentence(r, p, q)} (A-APR.1)",
    "{factorSentence(r)} (A-APR.2)",
    "{graphSentence(r, p, q)} (A-APR.3)",
    "{discriminantSentence(p, q)} (N-CN.1)",
    "{formulaSentence(p, q)} (N-CN.7)",
    "{conjugateSentence(p, q)} (N-CN.3, N-CN.8)",
    "{planeSentence(q)} (N-CN.4)",
    "{ftaSentence(r, p, q)} (N-CN.9)",
  ]) {
    assert.ok(mathCheck.includes(fragment), `the Math check must render ${fragment}`);
  }
  assert.doesNotMatch(mathCheck, /[a-z]{3} [a-z]{3}/u, "the Math check body must be helper calls plus citations, with no untested inline prose");
});
