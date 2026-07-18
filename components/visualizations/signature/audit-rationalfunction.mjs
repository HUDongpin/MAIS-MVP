/* ============================================================================
   audit-rationalfunction.mjs — numeric + structural proof for
   RationalFunctionLab.jsx (A-APR.D.6–7, F-IF.C.7d · the hole and the wall).

   Pattern (per the sibling audits): slice-and-eval the shipped model, prove
   every stated fact — synthetic division against long multiplication, the
   classification of every preset, exact table rows, the exact hole
   heights, the stamp — grep-enforce the refusals.

   Run:  node audit-rationalfunction.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./RationalFunctionLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function RationalFunctionLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, PROBE_STEPS, CALIB_STEP, evalPoly, divideOut, gcdInt, frac,
            fracText, inspect, evalAtFraction, PRESETS, presetIds, makeCase, heightChips,
            calibChecks, closeness, isCalibrated, STEPS };`
)();
const {
  PROBE_STEPS, CALIB_STEP, evalPoly, divideOut, gcdInt, frac, fracText, inspect,
  evalAtFraction, PRESETS, presetIds, makeCase, heightChips, calibChecks, closeness,
  isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE MACHINERY — division and fractions against first principles.
   ------------------------------------------------------------------------- */
check(evalPoly([-1, 0, 1], 3) === 8, 'evalPoly: x²−1 at 3 is 8');
check(evalPoly([1, 1], -1) === 0, 'evalPoly: x+1 at −1 is 0');
/* divideOut is the inverse of multiplying by (x − a): fuzz */
for (let trial = 0; trial < 500; trial++) {
  const deg = 1 + Math.floor(Math.random() * 3);
  const q = Array.from({ length: deg + 1 }, () => Math.floor(Math.random() * 9) - 4);
  if (q[q.length - 1] === 0) q[q.length - 1] = 1;
  const a = Math.floor(Math.random() * 7) - 3;
  /* p = q·(x − a): p_i = q_{i-1} − a·q_i */
  const p = Array(q.length + 1).fill(0);
  for (let i = 0; i < q.length; i++) {
    p[i + 1] += q[i];
    p[i] -= a * q[i];
  }
  const back = divideOut(p, a);
  check(back != null && back.length === q.length && back.every((c, i) => c === q[i]), 'fuzz: divideOut inverts ×(x−a)');
  /* and a non-root division returns null */
  const pBad = p.slice();
  pBad[0] += 1;
  check(divideOut(pBad, a) === null, 'fuzz: a nonzero remainder refuses');
}
check(fracText(frac(-19, -10)) === '19/10', 'frac normalizes signs');
check(fracText(frac(2, -4)) === '-1/2', 'frac reduces and carries the sign up top');
check(fracText(frac(4, 2)) === '2', 'whole fractions print whole');

/* ---------------------------------------------------------------------------
   3. THE PRESETS — classification and heights, all derived and re-proved.
   ------------------------------------------------------------------------- */
const EXPECT = {
  holey: [{ a: 1, kind: 'hole', h: '2' }],
  wall: [{ a: 1, kind: 'wall', h: null }],
  combo: [
    { a: -1, kind: 'hole', h: '-1/2' },
    { a: 1, kind: 'wall', h: null },
  ],
  twin4: [{ a: 2, kind: 'hole', h: '4' }],
};
for (const id of presetIds) {
  const P = PRESETS[id];
  /* the bad list is exactly the integer roots of the denominator */
  for (const a of P.bad) check(evalPoly(P.den, a) === 0, `${id}: ${a} really is forbidden`);
  for (let a = -10; a <= 10; a++) {
    if (evalPoly(P.den, a) === 0) check(P.bad.includes(a), `${id}: no forbidden input is hidden (${a})`);
  }
  const got = inspect(P.num, P.den, P.bad);
  const want = EXPECT[id];
  check(got.length === want.length, `${id}: inspection count`);
  want.forEach((w, i) => {
    check(got[i].a === w.a && got[i].kind === w.kind, `${id}: ${w.kind} at ${w.a}`);
    if (w.kind === 'hole') check(fracText(got[i].height) === w.h, `${id}: hole height ${w.h}`);
  });
  /* holes really are removable: near the hole the function equals its twin */
  for (const r of got.filter((r) => r.kind === 'hole')) {
    const v = evalAtFraction(P.num, P.den, r.a * 10 - 1, 10); /* a − 1/10 */
    check(v !== null, `${id}: defined just beside the hole`);
  }
  /* the shipped twin, when present, is the true quotient */
  if (P.twinPoly) {
    const qn = divideOut(P.num, P.bad[0]);
    check(qn != null && qn.every((c, i) => c === P.twinPoly[i]), `${id}: the twin is the genuine quotient`);
  }
}
/* the walls really blow up: |f| beats 100 within 1/1000 of the wall */
for (const id of presetIds) {
  const P = PRESETS[id];
  for (const r of inspect(P.num, P.den, P.bad).filter((r) => r.kind === 'wall')) {
    const v = evalAtFraction(P.num, P.den, r.a * 1000 - 1, 1000);
    check(v !== null && Math.abs(v.n / v.d) > 100, `${id}: the wall at ${r.a} genuinely explodes`);
  }
}
/* the exact table rows the lesson quotes */
const row = (id, k) => {
  const P = PRESETS[id];
  const a = P.bad[P.bad.length - 1];
  const q = 10 ** k;
  return evalAtFraction(P.num, P.den, a * q - 1, q);
};
check(fracText(row('holey', 1)) === '19/10', 'holey row 1: 19/10 (≈1.9)');
check(fracText(row('holey', 2)) === '199/100', 'holey row 2: 199/100 (≈1.99)');
check(fracText(row('wall', 1)) === '-10', 'wall row 1: −10');
check(fracText(row('wall', 3)) === '-1000', 'wall row 3: −1000');

/* ---------------------------------------------------------------------------
   4. LESSON STRUCTURE — scenes pinned; answer keys tied to the model.
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
check(STEPS[2].preset === 'holey' && STEPS[3].preset === 'wall', 'hole first, then the wall');
/* answer keys derived from the model */
check(/^Not necessarily/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key: symptom, not diagnosis');
check(/^Nothing certain/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key: the table’s silence');
check(/^The curve approaches this point/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key: the open circle');
check(/^Blow past every bound in SIZE/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key: the wall');
check(/^Cancel the zero away/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key: the rule');
/* the step-2 copy's 1.9/1.99 matches the exact rows */
check(/1\.9, then 1\.99/.test(STEPS[1].q) && row('holey', 1).n / row('holey', 1).d === 1.9, 'the quoted 1.9 is row 1');
/* the combo's two-sided story is stated in step 5's feedback */
check(/hole, height −1\/2|hole, height -1\/2/.test(STEPS[4].feedback), 'the combo’s hole height is quoted right');

/* ---------------------------------------------------------------------------
   5. CALIBRATION — classify every bad point AND declare the height.
   ------------------------------------------------------------------------- */
for (const id of presetIds) {
  const P = PRESETS[id];
  const inspected = inspect(P.num, P.den, P.bad);
  const chips = heightChips(id);
  check(chips.length === 3 && chips.filter((c) => c.ok).length === 1, `${id}: three chips, one truth`);
  check(new Set(chips.map((c) => c.s)).size === chips.length, `${id}: chips distinct`);
  const hole = inspected.find((r) => r.kind === 'hole');
  check(chips.find((c) => c.ok).s === (hole ? fracText(hole.height) : 'no hole'), `${id}: the true chip`);
  /* every marks assignment × every chip */
  const kinds = [null, 'hole', 'wall'];
  const assign = (idx, cur, out) => {
    if (idx === P.bad.length) {
      out.push({ ...cur });
      return;
    }
    for (const k of kinds) {
      cur[P.bad[idx]] = k;
      assign(idx + 1, cur, out);
    }
  };
  const all = [];
  assign(0, {}, all);
  for (const marks of all) {
    const marksOK = inspected.every((r) => marks[r.a] === r.kind);
    for (const chip of [...chips.map((c) => c.s), null]) {
      const should = marksOK && chip === chips.find((c) => c.ok).s;
      check(isCalibrated(id, marks, chip) === should, `gate: ${id} ${JSON.stringify(marks)} chip=${chip}`);
      check([0, 50, 100].includes(closeness(id, marks, chip)), 'meter quantized');
    }
  }
}
check(calibChecks(null, {}, '2').every((x) => x === false), 'no case, no credit');
for (let i = 0; i < 200; i++) check(presetIds.includes(makeCase(null)), 'inspections from the presets');
for (let i = 0; i < 100; i++) check(makeCase('holey') !== 'holey', 'a new inspection is genuinely new');

/* ---------------------------------------------------------------------------
   6. REFUSALS & RESTRAINT — grep the CODE (below the header comment).
   ------------------------------------------------------------------------- */
const forbid = [
  [/\blimits?\b/i, 'the L-word waits for its own bench (roadmap H30)'],
  [/\bsecant\b|h → 0|derivative/i, 'no calculus machinery (DerivativeLab)'],
  [/end behavior|leading coefficient/i, 'no polynomial graphing lesson (PolynomialFunctionLab)'],
  [/vertical.line test|one output/i, 'no function-definition machinery (FunctionLab)'],
  [/vertex form|amplitude|midline/i, 'no other families’ dials'],
  [/°|radian/i, 'nothing angular (polynomial "degree" is fine)'],
  [/requestAnimationFrame/, 'nothing animates — the probe is a dial'],
  [/\bslope\b/i, 'no slope'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);

/* classifications must be DERIVED, never stored in the presets */
{
  const blockStart = code.indexOf('const PRESETS = {');
  const blockEnd = code.indexOf('};', blockStart);
  const block = code.slice(blockStart, blockEnd);
  check(!/kind:/.test(block), 'no preset ships its own classification');
  check(!/height:/.test(block), 'no preset ships its own hole height');
}
check(/function inspect\(num, den, badPoints\)/.test(code), 'classification is computed by division');
check(/function evalAtFraction\(num, den, p, q\)/.test(code), 'table rows are exact rational arithmetic');
check(/carry === 0 \? q : null/.test(code), 'division refuses a nonzero remainder');
/* the path-break discipline is inherited */
check(/Math\.abs\(Y - prevY\) > \(YMAX - YMIN\) \/ 2/.test(code), 'the curve breaks its path at the wall');
/* the hole is drawn as an OPEN circle (white fill, carmine ring) */
check(/ctx\.fillStyle = '#fff';\s*ctx\.strokeStyle = CARMINE;[\s\S]{0,200}arc\(hx, hpy, 6/.test(code), 'the hole is an open circle');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-rationalfunction: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
