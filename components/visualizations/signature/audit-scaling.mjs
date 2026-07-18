/* ============================================================================
   audit-scaling.mjs — numeric + structural proof for ScalingLab.jsx
   (5.NF.B.5 · multiplication as scaling — "the factor's seat decides").

   Pattern (per HundredChartLab / FractionAdditionLab):
     • SLICE the pure model out of the shipped .jsx and EVAL it.
     • Prove THE THEOREM OF THE LAB by exhaustive sweep: the seat of p/q
       against 1 agrees with the product's comparison against L for every
       L, p, q — predicting without multiplying never lies.
     • Enforce the lab's REFUSALS (no number line, no double line, no
       overlap square, no plates, no repeated growth) by grepping the code
       below the header.

   Run:  node audit-scaling.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./ScalingLab.jsx', import.meta.url));
const src = readFileSync(PATH, 'utf8');

let pass = 0;
let fail = 0;
const bad = [];
function check(cond, msg) {
  if (cond) pass++;
  else {
    fail++;
    if (bad.length < 30) bad.push(msg);
  }
}

/* ---------------------------------------------------------------------------
   1. SLICE AND EVAL the shipped model.
   ------------------------------------------------------------------------- */
const importAt = src.indexOf("import { useCallback");
const compAt = src.indexOf('export default function ScalingLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd).replace(/prefers-reduced-motion: reduce/g, 'prefers-rm');

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, GOLD, SLATE, DIALS, CALIB_STEP, clampInt, seat, callFor, scaledPair,
            productSeat, toMixed, makeTarget, closeness, isCalibrated, STEPS };`
)();
const {
  DIALS, CALIB_STEP, clampInt, seat, callFor, scaledPair,
  productSeat, toMixed, makeTarget, closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE THEOREM OF THE LAB — the seat never lies.
   For every L, p, q: comparing p/q to 1 (by p vs q) gives the SAME verdict
   as comparing the product to L (by L·p vs L·q).  This is 5.NF.B.5.a.
   ------------------------------------------------------------------------- */
for (let L = 1; L <= 12; L++)
  for (let p = 1; p <= 6; p++)
    for (let q = 1; q <= 6; q++) {
      check(seat(p, q) === (p > q ? 1 : p === q ? 0 : -1), `seat at ${p}/${q}`);
      check(productSeat(L, p, q) === seat(p, q), `THE THEOREM at L=${L}, ${p}/${q}`);
      const pair = scaledPair(L, p, q);
      check(pair.n === L * p && pair.den === q, `exact pair at L=${L}, ${p}/${q}`);
      /* stretch/shrink in exact cross products against L */
      if (p > q) check(pair.n > L * pair.den, `stretch means longer at L=${L}, ${p}/${q}`);
      if (p < q) check(pair.n < L * pair.den, `shrink means shorter at L=${L}, ${p}/${q}`);
      if (p === q) check(pair.n === L * pair.den, `n/n leaves L exactly at L=${L}, ${p}/${q}`);
    }
check(callFor(3, 2) === 'STRETCHED' && callFor(1, 2) === 'SHRUNK' && callFor(4, 4) === 'UNCHANGED', 'the three calls');
/* the flagship numbers of the lesson */
check(scaledPair(6, 3, 2).n === 18 && scaledPair(6, 3, 2).den === 2 && toMixed(18, 2).w === 9, '3/2 × 6 = 18/2 = 9');
check(scaledPair(6, 1, 2).n === 6 && toMixed(6, 2).w === 3 && toMixed(6, 2).r === 0, '1/2 × 6 = 6/2 = 3');
check(scaledPair(6, 3, 4).n === 18 && toMixed(18, 4).w === 4 && toMixed(18, 4).r === 2, '3/4 × 6 = 18/4 = 4 and 2/4');
check(seat(5, 6) === -1, '5/6 sits below the pivot');

/* the mixed reading is exact everywhere */
for (let den = 1; den <= 6; den++)
  for (let n = 0; n <= 48; n++) {
    const { w, r } = toMixed(n, den);
    check(w * den + r === n && r >= 0 && r < den, `mixed identity at ${n}/${den}`);
  }

/* ---------------------------------------------------------------------------
   3. LESSON STRUCTURE — 7 steps, one calibration (last), demos pin scenes,
   the wrong answers are the real classroom errors.
   ------------------------------------------------------------------------- */
check(STEPS.length === 7, 'seven steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
  const dm = s.demo;
  check(dm && dm.L >= 3 && dm.L <= 8 && dm.p >= 1 && dm.p <= 6 && dm.q >= 1 && dm.q <= 6, `step ${i} demo in range`);
});
check(STEPS[0].demo.p === 1 && STEPS[0].demo.q === 1, 'the lab opens on ×1');
check(/×1 resizes nothing/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 names the still point');
check(STEPS[0].choices.some((c) => /always grows/.test(c)), 'the misconception appears from the first question');
check(seat(STEPS[1].demo.p, STEPS[1].demo.q) === 1 && /Longer/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 stretches');
check(seat(STEPS[2].demo.p, STEPS[2].demo.q) === -1 && /False/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 kills the misconception');
check(STEPS[3].lens && STEPS[3].lens.noPeek === true, 'step 4 hides the product');
check(STEPS[3].demo.p === 5 && STEPS[3].demo.q === 6 && STEPS[3].demo.L === 7, 'step 4 scene is 5/6 × 7');
check(/Shorter/.test(STEPS[3].choices[STEPS[3].answer]) && /settles it|seat/i.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 calls it from the seat');
check(STEPS[4].demo.p === STEPS[4].demo.q, 'step 5 is the disguised one');
check(/Identical/.test(STEPS[4].choices[STEPS[4].answer]) && /costume|disguise/i.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 unmasks n/n');
check(seat(STEPS[5].demo.p, STEPS[5].demo.q) === -1 && /Less/.test(STEPS[5].choices[STEPS[5].answer]), 'step 6 recipe calls less');

/* dials: three; the bar opens, the factor top then bottom unlock */
check(DIALS.length === 3, 'three dials');
check(DIALS.find((d) => d.key === 'len').unlock === 0, 'the bar opens the lab');
check(DIALS.find((d) => d.key === 'top').unlock === 1 && DIALS.find((d) => d.key === 'bottom').unlock === 2, 'factor top then bottom');
check(DIALS.find((d) => d.key === 'len').min === 3 && DIALS.find((d) => d.key === 'len').max === 8, 'bar runs 3–8');

/* ---------------------------------------------------------------------------
   4. CALIBRATION — the stamp is the integer cross identity L·p === T·q; the
   meter reads 100 nowhere else; every mark is reachable; every equivalent
   name of the right factor also lands it.
   ------------------------------------------------------------------------- */
for (let i = 0; i < 3000; i++) {
  const t = makeTarget(null);
  check(t.L >= 3 && t.L <= 8, 'target bar in range');
  check(Number.isInteger(t.T) && t.T >= 1 && t.T <= 24 && t.T !== t.L, 'target mark integer, off the original');
  let recipes = 0;
  for (let p = 1; p <= 6; p++) for (let q = 1; q <= 6; q++) if (t.L * p === t.T * q) recipes++;
  check(recipes >= 1, `mark ${t.T} from bar ${t.L} is reachable`);
}
for (let L = 3; L <= 8; L++)
  for (let T = 1; T <= 24; T++) {
    if (T === L) continue;
    for (let p = 1; p <= 6; p++)
      for (let q = 1; q <= 6; q++) {
        check(isCalibrated(L, p, q, T) === (L * p === T * q), `stamp ⟺ cross identity at ${p}/${q}, L=${L}, T=${T}`);
        const m = closeness(L, p, q, T);
        check(m >= 0 && m <= 100, 'meter in range');
        check((m === 100) === (L * p === T * q), `meter 100 ⟺ landed at ${p}/${q}, L=${L}, T=${T}`);
        /* equivalent names both land: if (p,q) lands, so does (2p,2q) when in range */
        if (L * p === T * q && 2 * p <= 6 && 2 * q <= 6)
          check(isCalibrated(L, 2 * p, 2 * q, T), `the disguised name ${2 * p}/${2 * q} also lands`);
      }
    /* for a fixed bottom, walking the top toward the mark never reads worse */
    for (let q = 1; q <= 6; q++)
      for (let p = 1; p < 6; p++) {
        if (Math.abs(L * (p + 1) - T * q) <= Math.abs(L * p - T * q))
          check(closeness(L, p + 1, q, T) >= closeness(L, p, q, T), `meter monotone in p at L=${L}, T=${T}, q=${q}`);
      }
  }
for (let i = 0; i < 200; i++) {
  const t = makeTarget({ L: 6, T: 9 });
  check(!(t.L === 6 && t.T === 9), 'a new mark is genuinely new');
}

/* ---------------------------------------------------------------------------
   5. REFUSALS & RESTRAINT — grep the CODE (below the header comment).
   ------------------------------------------------------------------------- */
const forbid = [
  [/number.?line|\bhops?\b|skip.?count/i, 'no number line (MultiplesLab/AddLab)'],
  [/double number line|\bbatch|\btape\b/i, 'no ratio devices (RatioLab)'],
  [/\boverlap\b|\bcells?\b|shading/i, 'no overlap square (FractionMultiplicationLab)'],
  [/\bplates?\b|\btrays?\b|\bbricks?\b/i, 'no plates (FractionTimesWholeLab)'],
  [/\bshelf\b|\bseam\b|\brails?\b|\bjoints?\b/i, 'no shelf or rail (F1/F2 devices)'],
  [/\brods?\b|unit.?cubes?/i, 'no measuring rods (MeasurementLab)'],
  [/staircase|asymptote|compound/i, 'no repeated growth (ExponentialFunctionLab)'],
  [/\bverdict\b|fair start/i, 'no verdict pill (LengthComparisonLab device)'],
  [/simplif|\bgcd\b|lowest terms|\breduces?\b/i, 'never simplifies (EquivalentFractionsLab)'],
  [/balance|\bpans?\b/i, 'no balance (EquationLab)'],
  [/requestAnimationFrame/, 'nothing animates — the resize is a still picture'],
  [/speechSynthesis/, 'no speech engine'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);

/* structural: the bar is pinned (hidden) in the capstone */
check(/calib && dl\.key === 'len'/.test(code), 'the bar is pinned in the capstone');
/* the call is computed from the seat, never from the drawn copy */
check(/callFor\(S\.p, S\.q\)/.test(code), 'the call reads the seat');
check(/seat\(S\.p, S\.q\)/.test(code), 'the caption reads the seat');
/* the no-peek lens hides the product but not the call */
check(/S\.noPeek/.test(code) && /no peeking/.test(code), 'the no-peek lens exists');
/* the shadow of the original is drawn on the copy row */
check(/where the original ends/.test(code), 'the shadow of the original exists');
/* the gauge carries exactly the pivot and zero — no tick sequence */
check(/the factor gauge/.test(code), 'the gauge is named');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-scaling: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
