/* ============================================================================
   audit-roots.mjs — numeric + structural proof for RootsLab.jsx
   (8.EE.A.2 · area to side; the forgotten twin; the sign a cube keeps;
   the integer bracket).

   Pattern (per the sibling audits): slice-and-eval the shipped model, prove
   every stated fact — roots by exhaustive integer scan (the solution sets
   of x² = p and x³ = p are exactly what the model claims, over the whole
   dial space), the bracket law n² ≤ p < (n+1)², every quoted number, the
   stamp — and grep-enforce the refusals (no Math.sqrt/cbrt, no telescope,
   no completing the square, no decimals).

   Run:  node audit-roots.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./RootsLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function RootsLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, AREA_MAX, CALIB_STEP, sqrtInt, cbrtInt, bracketOf,
            solsSquare, solsCube, fmtInt, CASES, makeCase, eqText, solsTruthText,
            solsChips, bracketTruth, bracketChips, calibChecks, closeness, isCalibrated,
            STEPS };`
)();
const {
  AREA_MAX, CALIB_STEP, sqrtInt, cbrtInt, bracketOf, solsSquare, solsCube, fmtInt, CASES,
  makeCase, eqText, solsTruthText, solsChips, bracketTruth, bracketChips, calibChecks,
  closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE ROOT LAWS — by exhaustive integer scan, over the whole dial space.
   ------------------------------------------------------------------------- */
for (let p = 1; p <= AREA_MAX; p++) {
  /* the model's square root agrees with a brute scan */
  const scanSq = [];
  for (let x = -AREA_MAX; x <= AREA_MAX; x++) if (x * x === p) scanSq.push(x);
  const sols = solsSquare(p);
  if (scanSq.length === 0) {
    check(sols === null && sqrtInt(p) === null, `p=${p}: no integer side, model agrees`);
  } else {
    check(sols != null && sols.length === 2, `p=${p}: the twin pair`);
    check(new Set(sols).size === 2 && sols.every((x) => scanSq.includes(x)) && scanSq.every((x) => sols.includes(x)), `p=${p}: solutions are EXACTLY the scan`);
    check(sols[0] === sqrtInt(p) && sols[0] > 0 && sols[1] === -sols[0], `p=${p}: the symbol names the non-negative twin`);
  }
  /* the bracket law */
  const n = bracketOf(p);
  check(n * n <= p && p < (n + 1) * (n + 1), `p=${p}: n² ≤ p < (n+1)²`);
}
/* cube roots keep the sign, over positives and negatives */
for (let p = -AREA_MAX; p <= AREA_MAX; p++) {
  if (p === 0) continue;
  const scanCu = [];
  for (let x = -6; x <= 6; x++) if (x * x * x === p) scanCu.push(x);
  const sols = solsCube(p);
  if (scanCu.length === 0) check(sols === null, `p=${p}: no integer edge, model agrees`);
  else {
    check(sols != null && sols.length === 1 && sols[0] === scanCu[0], `p=${p}: exactly one cube root`);
    check(Math.sign(sols[0]) === Math.sign(p), `p=${p}: the cube kept the sign`);
  }
}

/* ---------------------------------------------------------------------------
   3. QUOTED FACTS — every number in the lesson copy, recomputed.
   ------------------------------------------------------------------------- */
check(sqrtInt(81) === 9 && sqrtInt(144) === 12 && sqrtInt(49) === 7, 'the perfect squares of the copy');
check(bracketOf(40) === 6 && 6 * 6 === 36 && 7 * 7 === 49, 'the 40 bracket: 36 < 40 < 49');
check(cbrtInt(64) === 4 && cbrtInt(-27) === -3, '∛64 = 4 and ∛(−27) = −3');
check((-3) * (-3) * (-3) === -27 && 3 * 3 * 3 === 27, 'the sign survives an odd power');
check(/9 × 9 = 81/.test(STEPS[0].body), 'step 1 quotes the defining product');
check(/6² = 36/.test(STEPS[2].body) && /7² = 49/.test(STEPS[2].body), 'step 3 quotes both squarings');
check(/4 × 4 × 4/.test(STEPS[3].body), 'step 4 quotes the stack');
check(/±√/.test(STEPS[4].feedback), 'step 5 cites the explicit ± of the formula');

/* ---------------------------------------------------------------------------
   4. LESSON STRUCTURE — scenes pinned; answer keys tied to the model.
   ------------------------------------------------------------------------- */
check(STEPS.length === 6, 'six steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  check(Number.isInteger(s.p), `step ${i} area valid`);
  check(s.mode === 'square' || s.mode === 'cube', `step ${i} mode valid`);
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
check(STEPS[0].p === 81 && !!STEPS[0].dial, 'the machine opens on 81, dialable');
check(STEPS[2].p === 40 && !!STEPS[2].dial, 'the bracket scene opens on 40');
check(!!STEPS[1].twins && !!STEPS[4].twins, 'the twins appear at steps 2 and 5');
check(STEPS[3].mode === 'cube', 'step 4 is the cube');
/* answer keys derived from the model */
check(/^12 — because 12 × 12 = 144/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key: the forced side');
check(/^7 and −7 — squaring forgets the sign/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key: the twins');
check(/^Between 6 and 7/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key: the bracket');
check(/^Exactly one solution, −3/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key: the lone cube root');
check(/^No — the symbol √ names the non-negative root/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key: symbol vs equation');
/* the real beliefs are offered and refuted */
check(/lengths are positive|roots are positive/.test(STEPS.map((s) => (s.choices || []).join('|')).join('|')), 'the always-positive belief is offered');
check(/cannot cube to a negative/.test(STEPS[3].choices.join('|')), 'the no-negative-cubes belief is offered');
check(/Yes — root always means both/.test(STEPS[4].choices.join('|')), 'the ±-symbol belief is offered');

/* ---------------------------------------------------------------------------
   5. CALIBRATION — both exact rulings; the stamp cannot fire falsely.
   ------------------------------------------------------------------------- */
check(CASES.length >= 6, 'several posted equations');
check(CASES.some((c) => c.pow === 2) && CASES.some((c) => c.pow === 3), 'both powers are posted');
check(CASES.some((c) => c.p < 0), 'a negative cube case is posted');
for (let i = 0; i < CASES.length; i++) {
  const { pow, p, bp } = CASES[i];
  check(pow === 2 ? sqrtInt(p) != null : cbrtInt(p) != null, `case ${i}: a perfect power is posted`);
  check(sqrtInt(bp) === null, `case ${i}: the stray area is imperfect`);
  const sChips = solsChips(i);
  const bChips = bracketChips(i);
  const sT = solsTruthText(i);
  const bT = bracketTruth(i);
  check(sChips.length === 4 && new Set(sChips).size === 4, `case ${i}: four distinct solution chips`);
  check(bChips.length === 4 && new Set(bChips).size === 4, `case ${i}: four distinct bracket chips`);
  check(sChips.includes(sT), `case ${i}: the solution truth is on a chip`);
  check(bChips.includes(bT), `case ${i}: the bracket truth is on a chip`);
  /* first principles */
  if (pow === 2) check(sT.startsWith(`±${sqrtInt(p)}`), `case ${i}: the square truth carries the twin`);
  else check(sT.startsWith(`${fmtInt(cbrtInt(p))} only`), `case ${i}: the cube truth stands alone`);
  const n = bracketOf(bp);
  check(bT === `between ${n} and ${n + 1}`, `case ${i}: the bracket truth from first principles`);
  for (const sp of [null, ...sChips, 'bogus']) {
    for (const bpk of [null, ...bChips]) {
      const should = sp === sT && bpk === bT;
      check(isCalibrated(i, sp, bpk) === should, `gate: case ${i} sols=${sp} bracket=${bpk}`);
      check([0, 50, 100].includes(closeness(i, sp, bpk)), 'meter quantized');
    }
  }
  const wrongS = sChips.find((x) => x !== sT);
  check(closeness(i, wrongS, bT) === 0, `case ${i}: the bracket without the set earns nothing`);
}
check(calibChecks(null, 'x', 'y').every((x) => x === false), 'no case, no credit');
for (let i = 0; i < 200; i++) {
  const k = makeCase(null);
  check(Number.isInteger(k) && k >= 0 && k < CASES.length, 'cases from the space');
}
for (let i = 0; i < 100; i++) check(makeCase(3) !== 3, 'a new case is genuinely new');

/* ---------------------------------------------------------------------------
   6. REFUSALS & RESTRAINT — grep the CODE (below the header comment).
   ------------------------------------------------------------------------- */
const forbid = [
  [/Math\.sqrt|Math\.cbrt/, 'roots are found by integer search only'],
  [/telescope|endless|\bzoom/i, 'no telescope, no zoom (IrrationalLab)'],
  [/completing the square|discriminant/i, 'no quadratic machinery (QuadraticEquationLab)'],
  [/\bdecimals?\b/i, 'no digit past the bracket (IrrationalLab owns the digits)'],
  [/mason|packing|leftover/i, 'no rearrangement machinery (PythagorasLab)'],
  [/\bflips?\b|parity|\bsheet\b/i, 'the sign law is cited, not redrawn (SignedNumbersLab)'],
  [/odometer|brigade|\bslats?\b|\btrap\b/i, 'no slats or traps (IntegralLab)'],
  [/\bwalkers?\b|foothold/i, 'no walkers (LimitLab)'],
  [/\bmarch/i, 'no arrow marches (SignedAdditionLab)'],
  [/requestAnimationFrame/, 'nothing animates'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);

/* verdicts must be DERIVED, never stored */
check(/const sqrtInt = \(p\) => \{/.test(code) && /const cbrtInt = \(p\) => \{/.test(code), 'roots by bounded search');
check(/while \(\(n \+ 1\) \* \(n \+ 1\) <= p\) n\+\+;/.test(code), 'the bracket by integer squaring');
{
  const blockStart = code.indexOf('const CASES = [');
  const blockEnd = code.indexOf('];', blockStart);
  const block = code.slice(blockStart, blockEnd);
  check(!/root|sols|answer|truth|bracket:/i.test(block), 'no case ships its own roots');
}
/* the drawing reads the model */
check(/sqrtInt\(S\.p\) : cbrtInt\(S\.p\)/.test(code), 'the machine readout reads the model');
check(/bracketOf\(S\.p\)/.test(code), 'the bracket witnesses read the model');
check(/solsChips\(kase\)/.test(code) && /bracketChips\(kase\)/.test(code), 'the stamp chips come from the model');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-roots: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
