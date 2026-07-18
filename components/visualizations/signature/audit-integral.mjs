/* ============================================================================
   audit-integral.mjs — numeric + structural proof for IntegralLab.jsx
   (AP · the integral as the trap's one survivor; the FTC as the odometer's
   speed).

   Pattern (per the sibling audits): slice-and-eval the shipped model, prove
   every stated fact — the brigade sums re-derived slat by slat in the
   audit's OWN rational arithmetic, the trap containment, the exact gap law,
   the refinement law, every quoted stop, the FTC quarter-trap, the stamp —
   and grep-enforce the refusals.

   Run:  node audit-integral.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./IntegralLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function IntegralLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, SLATS, QMAX, CALIB_STEP, B_CHOICES, gcdInt, frac, fAdd,
            fSub, fMul, fLe, fEq, fracText, fVal, PRESETS, presetIds, fAt, trueA, leftSum,
            rightSum, gapOf, xText, makeCase, areaTruth, areaChips, FORMULA_CHIPS,
            formulaTruth, calibChecks, closeness, isCalibrated, STEPS };`
)();
const {
  SLATS, QMAX, CALIB_STEP, B_CHOICES, frac, fMul, fSub, fEq, fracText, PRESETS, presetIds,
  fAt, trueA, leftSum, rightSum, gapOf, xText, makeCase, areaTruth, areaChips, FORMULA_CHIPS,
  formulaTruth, calibChecks, closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE AUDIT'S OWN rational arithmetic (independent of the lab's helpers).
   ------------------------------------------------------------------------- */
const agcd = (a, b) => {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
};
const A = (n, d = 1) => {
  const s = d < 0 ? -1 : 1;
  const g = agcd(n, d);
  return [(s * n) / g, (s * d) / g];
};
const aAdd = (x, y) => A(x[0] * y[1] + y[0] * x[1], x[1] * y[1]);
const aMul = (x, y) => A(x[0] * y[0], x[1] * y[1]);
const aSub = (x, y) => A(x[0] * y[1] - y[0] * x[1], x[1] * y[1]);
const aLt = (x, y) => x[0] * y[1] < y[0] * x[1];
const aLe = (x, y) => x[0] * y[1] <= y[0] * x[1];
const aEqF = (x, f) => x[0] === f.n && x[1] === f.d; // audit pair vs lab frac (both reduced)
const evalPoly = (P, x) => {
  /* f(x) = c0 + c1 x + c2 x², from the lab's stored coefficients */
  const c = P.c.map((f) => [f.n, f.d]);
  return aAdd(c[0], aAdd(aMul(c[1], x), aMul(c[2], aMul(x, x))));
};
/* literal slat-by-slat summation — the first-principles brigade counts */
const loopSum = (P, n, x, side) => {
  const w = aMul(x, A(1, n));
  let total = A(0);
  for (let k = 0; k < n; k++) {
    const t = aMul(x, A(side === 'L' ? k : k + 1, n));
    total = aAdd(total, aMul(evalPoly(P, t), w));
  }
  return total;
};
const trueInt = (P, x) => {
  /* ∫₀ˣ f = c0 x + c1 x²/2 + c2 x³/3, from first principles */
  const c = P.c.map((f) => [f.n, f.d]);
  return aAdd(
    aMul(c[0], x),
    aAdd(aMul(aMul(c[1], A(1, 2)), aMul(x, x)), aMul(aMul(c[2], A(1, 3)), aMul(x, aMul(x, x))))
  );
};

/* ---------------------------------------------------------------------------
   3. THE BRIGADES — closed form ≡ loop; containment; gap law; refinement.
   ------------------------------------------------------------------------- */
check(presetIds.join(',') === 'flat,ramp,bend', 'the three roads');
check(SLATS.join(',') === '4,8,16,32,64', 'the brigade dial stops');
check(QMAX === 16, 'the sweep runs 0..4 in quarters');

const P_QUARTERS = [1, 2, 3, 4, 5, 7, 8, 11, 12, 15, 16];
for (const id of presetIds) {
  const P = PRESETS[id];
  for (const p of P_QUARTERS) {
    const x = A(p, 4);
    const xf = frac(p, 4);
    const truth = trueInt(P, x);
    check(aEqF(truth, trueA(P, xf)), `${id} x=${p}/4: odometer = first-principles integral`);
    for (const n of SLATS) {
      const L = loopSum(P, n, x, 'L');
      const R = loopSum(P, n, x, 'R');
      check(aEqF(L, leftSum(P, n, xf)), `${id} n=${n} x=${p}/4: closed L = slat-by-slat L`);
      check(aEqF(R, rightSum(P, n, xf)), `${id} n=${n} x=${p}/4: closed R = slat-by-slat R`);
      /* containment: under ≤ truth ≤ over; strict when the road climbs */
      check(aLe(L, truth) && aLe(truth, R), `${id} n=${n} x=${p}/4: trap contains the truth`);
      if (id !== 'flat') check(aLt(L, truth) && aLt(truth, R), `${id} n=${n} x=${p}/4: strict trap`);
      /* the exact gap law: R − L = (f(x) − f(0)) · x / n */
      const law = aMul(aSub(evalPoly(P, x), evalPoly(P, A(0))), aMul(x, A(1, n)));
      check(aEqF(law, gapOf(P, n, xf)), `${id} n=${n} x=${p}/4: gap = (f(x)−f(0))·x/n`);
    }
    /* refinement: the under-count never retreats, the over-count never advances */
    for (let i = 0; i + 1 < SLATS.length; i++) {
      const L1 = loopSum(P, SLATS[i], x, 'L');
      const L2 = loopSum(P, SLATS[i + 1], x, 'L');
      const R1 = loopSum(P, SLATS[i], x, 'R');
      const R2 = loopSum(P, SLATS[i + 1], x, 'R');
      check(aLe(L1, L2) && aLe(R2, R1), `${id} x=${p}/4: doubling tightens the trap`);
    }
  }
}
/* the flat road: the brigades agree exactly, at every n */
for (const n of SLATS)
  for (const p of P_QUARTERS)
    check(
      fEq(leftSum(PRESETS.flat, n, frac(p, 4)), rightSum(PRESETS.flat, n, frac(p, 4))),
      `flat n=${n}: under = over`
    );

/* ---------------------------------------------------------------------------
   4. QUOTED FACTS — every number in the lesson copy, recomputed.
   ------------------------------------------------------------------------- */
check(fracText(leftSum(PRESETS.ramp, 4, frac(4))) === '6', 'ramp n=4: under-brigade counts 6');
check(fracText(rightSum(PRESETS.ramp, 4, frac(4))) === '10', 'ramp n=4: over-brigade counts 10');
check(fracText(leftSum(PRESETS.ramp, 8, frac(4))) === '7', 'ramp n=8: ledger reads 7');
check(fracText(rightSum(PRESETS.ramp, 8, frac(4))) === '9', 'ramp n=8: ledger reads 9');
for (const n of SLATS) {
  check(fEq(gapOf(PRESETS.ramp, n, frac(4)), frac(16, n)), `ramp gap law 16/n at n=${n}`);
  check(fEq(gapOf(PRESETS.bend, n, frac(4)), frac(16, n)), `bend gap law 16/n at n=${n}`);
  check(gapOf(PRESETS.flat, n, frac(4)).n === 0, `flat gap 0 at n=${n}`);
}
check(fracText(leftSum(PRESETS.bend, 4, frac(4))) === '7/2', 'bend n=4: ledger says 7/2');
check(fracText(rightSum(PRESETS.bend, 4, frac(4))) === '15/2', 'bend n=4: ledger says 15/2');
check(fracText(trueA(PRESETS.bend, frac(4))) === '16/3', 'the bend’s survivor: 16/3');
const RAMP_STOPS = { 1: '1/2', 2: '2', 3: '9/2', 4: '8' };
for (const [b, want] of Object.entries(RAMP_STOPS))
  check(fracText(trueA(PRESETS.ramp, frac(Number(b)))) === want, `ramp odometer stop A(${b}) = ${want}`);
/* the copy quotes them */
check(/counts 6, the over-brigade 10/.test(STEPS[1].body), 'step 2 quotes 6 and 10');
check(/reads 7 and 9/.test(STEPS[1].feedback), 'step 2 reveal quotes 7 and 9');
check(/exactly 16\/n/.test(STEPS[1].feedback), 'step 2 reveal quotes the gap law');
check(/7\/2 and 15\/2/.test(STEPS[2].body), 'step 3 quotes 7/2 and 15/2');
check(/exactly 16\/3/.test(STEPS[2].feedback), 'step 3 reveal quotes 16/3');
check(/A\(1\) = 1\/2/.test(STEPS[3].feedback) && /A\(3\) = 9\/2/.test(STEPS[3].feedback), 'step 4 quotes the stops');
/* the antiderivative strings mean what they say (checked at several rationals) */
const F_EXPECT = {
  flat: (x) => aMul(A(2), x),
  ramp: (x) => aMul(A(1, 2), aMul(x, x)),
  bend: (x) => aMul(A(1, 12), aMul(x, aMul(x, x))),
};
for (const id of presetIds)
  for (const p of [1, 3, 6, 9, 13]) {
    check(aEqF(F_EXPECT[id](A(p, 4)), trueA(PRESETS[id], frac(p, 4))), `${id}: FStr matches the model at x=${p}/4`);
  }
check(PRESETS.flat.FStr === 'A(x) = 2x' && PRESETS.ramp.FStr === 'A(x) = x²/2' && PRESETS.bend.FStr === 'A(x) = x³/12', 'the three odometer strings');

/* ---------------------------------------------------------------------------
   5. THE FTC — the odometer's speed is trapped by the road, every quarter.
   ------------------------------------------------------------------------- */
for (const id of presetIds) {
  const P = PRESETS[id];
  for (let p = 1; p <= QMAX; p++) {
    const x1 = A(p - 1, 4);
    const x2 = A(p, 4);
    const rate = aMul(aSub(trueInt(P, x2), trueInt(P, x1)), A(4));
    check(
      aLe(evalPoly(P, x1), rate) && aLe(rate, evalPoly(P, x2)),
      `${id} p=${p}: f(x−¼) ≤ rate ≤ f(x)`
    );
    if (id === 'flat') check(aEqF(rate, frac(2)), `flat p=${p}: the odometer turns at exactly 2`);
  }
}
/* xText shows exact quarters, never a float artifact */
for (let p = 0; p <= QMAX; p++) check(/^\d+(\.(25|5|75))?$/.test(xText(p)), `xText(${p}) exact`);
check(xText(0) === '0' && xText(5) === '1.25' && xText(10) === '2.5' && xText(16) === '4', 'xText spot checks');

/* ---------------------------------------------------------------------------
   6. LESSON STRUCTURE — scenes pinned; answer keys tied to the model.
   ------------------------------------------------------------------------- */
check(STEPS.length === 6, 'six steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  check(!!PRESETS[s.preset], `step ${i} preset exists`);
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
check(
  STEPS[0].preset === 'flat' && STEPS[1].preset === 'ramp' && STEPS[2].preset === 'bend',
  'the road ladder: flat, ramp, bend'
);
check(STEPS[0].slats && STEPS[1].slats && STEPS[2].slats, 'the brigade owns steps 1–3');
check(STEPS[3].odometer && STEPS[4].odometer && !STEPS[2].odometer, 'the odometer arrives at step 4');
check(!!STEPS[4].speed && !STEPS[3].speed, 'the speed readout arrives at step 5');
/* answer keys derived from the model */
check(/^Each slat has a flat top/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key: flat tops agree');
check(/^\[7, 9\]/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key: the trap halves');
check(/^The one number inside every trap/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key: the survivor');
check(/^x²\/2 — a curve/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key: the parabola');
check(/^f\(x\) — banked area grows/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key: the FTC');
/* the real beliefs are offered and refuted */
check(/Rectangles measure every region exactly/.test(STEPS[0].choices.join('|')), 'the rectangles-are-exact belief is offered');
check(/x — a straight road/.test(STEPS[3].choices.join('|')), 'the linear-growth belief is offered');
/* the DerivativeLab hand-off is honored, by name, without its devices */
check(/derivative bench/.test(STEPS[4].feedback), 'the derivative bench is cited');
check(/Fundamental Theorem/.test(STEPS[4].feedback), 'the FTC is named');

/* ---------------------------------------------------------------------------
   7. CALIBRATION — the stamp needs both exact rulings; it cannot fire falsely.
   ------------------------------------------------------------------------- */
check(B_CHOICES.join(',') === '2,3,4', 'the posted stops');
check(FORMULA_CHIPS.length === 4 && new Set(FORMULA_CHIPS).size === 4, 'four distinct formula chips');
for (const id of presetIds) check(FORMULA_CHIPS.includes(PRESETS[id].FStr), `${id}: its formula is on a chip`);
check(FORMULA_CHIPS.some((c) => !presetIds.some((id) => PRESETS[id].FStr === c)), 'a foil formula chip exists');

const parseFrac = (t) => {
  const m = t.split('/');
  return m.length === 1 ? [Number(m[0]), 1] : [Number(m[0]), Number(m[1])];
};
for (const presetId of presetIds) {
  for (const b of B_CHOICES) {
    const k = { presetId, b };
    const chips = areaChips(k);
    const truthText = fracText(areaTruth(k));
    check(chips.length === 4, `${presetId} b=${b}: four area chips`);
    check(new Set(chips).size === 4, `${presetId} b=${b}: chips distinct`);
    check(chips.includes(truthText), `${presetId} b=${b}: the truth is on a chip`);
    for (let i = 0; i + 1 < chips.length; i++) {
      const u = parseFrac(chips[i]);
      const v = parseFrac(chips[i + 1]);
      check(u[0] * v[1] < v[0] * u[1], `${presetId} b=${b}: chips sorted ascending`);
    }
    /* the truth equals the first-principles integral */
    check(aEqF(trueInt(PRESETS[presetId], A(b)), areaTruth(k)), `${presetId} b=${b}: truth = ∫`);
    /* exhaustive gate */
    const fTruth = formulaTruth(k);
    for (const ap of [null, ...chips, 'bogus']) {
      for (const fp of [null, ...FORMULA_CHIPS]) {
        const should = ap === truthText && fp === fTruth;
        check(isCalibrated(k, ap, fp) === should, `gate: ${presetId} b=${b} area=${ap} formula=${fp}`);
        check([0, 50, 100].includes(closeness(k, ap, fp)), 'meter quantized');
      }
    }
    /* the right formula under a wrong area ruling earns nothing */
    const wrongArea = chips.find((c) => c !== truthText);
    check(closeness(k, wrongArea, fTruth) === 0, `${presetId} b=${b}: formula without the area earns nothing`);
  }
}
check(calibChecks(null, '8', 'A(x) = 2x').every((x) => x === false), 'no case, no credit');
for (let i = 0; i < 200; i++) {
  const k = makeCase(null);
  check(presetIds.includes(k.presetId) && B_CHOICES.includes(k.b), 'cases from the space');
}
for (let i = 0; i < 100; i++) {
  const k = makeCase({ presetId: 'bend', b: 4 });
  check(!(k.presetId === 'bend' && k.b === 4), 'a new case is genuinely new');
}

/* ---------------------------------------------------------------------------
   8. REFUSALS & RESTRAINT — grep the CODE (below the header comment).
   ------------------------------------------------------------------------- */
const forbid = [
  [/\bsecants?\b|\btangents?\b/i, 'no secant, no tangent (DerivativeLab)'],
  [/h\s*(?:→|->)\s*0/, 'no h → 0 dial (DerivativeLab)'],
  [/\bwalkers?\b|\bfootholds?\b/i, 'no walkers, no footholds (LimitLab)'],
  [/cut-and-slide|cut and slide/i, 'no cut-and-slide (AreaLab)'],
  [/\bsectors?\b|rolling wheel/i, 'no sector comb, no wheel (PiLab)'],
  [/\bbins?\b/i, 'no bins — slats carry no data (HistogramLab)'],
  [/probabilit|\bchance\b/i, 'area is never a chance (NormalDistributionLab)'],
  [/partial sums?|waterfall/i, 'no term-bar waterfall (SeriesLab)'],
  [/slope triangle/i, 'no slope triangle (LineFunctionLab)'],
  [/requestAnimationFrame/, 'nothing animates — the sweep is a dial'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);

/* verdicts must be DERIVED, never stored */
{
  const blockStart = code.indexOf('const PRESETS = {');
  const blockEnd = code.indexOf('};', blockStart);
  const block = code.slice(blockStart, blockEnd);
  check(!/area:|truth:|left:|right:|sum/i.test(block), 'no road ships its own counts');
}
check(/const leftSum = \(P, n, x\) =>/.test(code), 'the under-brigade is a formula of the coefficients');
check(/const rightSum = \(P, n, x\) =>/.test(code), 'the over-brigade is a formula of the coefficients');
check(/const trueA = \(P, x\) =>/.test(code), 'the odometer is the exact antiderivative');
check(/const gapOf = \(P, n, x\) => fSub\(rightSum/.test(code), 'the gap is derived, not stored');
/* the drawing reads the model */
check(/leftSum\(S\.P, nn, xs\)/.test(code), 'the ledger rows are the model’s counts');
check(/trueA\(S\.P, xs\)/.test(code), 'the survivor line is the model’s integral');
check(/areaChips\(kase\)/.test(code), 'the audit chips come from the model');
check(/fracText\(areaTruth\(k\)\)/.test(code), 'the gate compares against the derived truth');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-integral: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
