/* ============================================================================
   audit-unitcircle.mjs — numeric + structural proof for UnitCircleLab.jsx
   (F-TF.A.1–4 · the unit circle: wrap, land, unroll).

   Pattern (per the sibling audits): slice-and-eval the shipped model, prove
   every stated fact — the symbolic value table against the numeric truth,
   the π-fraction formatter, evenness/oddness, co-termination, the stamp —
   grep-enforce the refusals.

   Run:  node audit-unitcircle.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./UnitCircleLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function UnitCircleLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, K_STEP_UNIT, DIAL_ONE_RIM, DIAL_ALL_REALS, DOMAIN_STEP,
            CALIB_STEP, gcd, mod24, piFrac, SPECIALS, specialOf, cosOf, sinOf, coordText,
            ORDER_POOL, makeOrder, calibChecks, closeness, isCalibrated, STEPS };`
)();
const {
  K_STEP_UNIT, DIAL_ONE_RIM, DIAL_ALL_REALS, DOMAIN_STEP, CALIB_STEP, gcd, mod24, piFrac,
  SPECIALS, specialOf, cosOf, sinOf, coordText, ORDER_POOL, makeOrder, calibChecks, closeness,
  isCalibrated, STEPS,
} = sandbox;

const EPS = 1e-12;

/* ---------------------------------------------------------------------------
   2. THE VALUE TABLE — every symbolic coordinate equals the numeric truth,
   every special grid point has an entry, and nothing else does.
   ------------------------------------------------------------------------- */
check(Math.abs(K_STEP_UNIT - Math.PI / 12) < EPS, 'the dial click is π/12');
const specialKeys = Object.keys(SPECIALS).map(Number).sort((a, b) => a - b);
check(specialKeys.length === 16, 'sixteen special landings per lap');
for (const kk of specialKeys) {
  const { cos, sin } = SPECIALS[kk];
  check(Math.abs(cos.v - Math.cos((kk * Math.PI) / 12)) < EPS, `k=${kk}: symbolic cos equals numeric cos`);
  check(Math.abs(sin.v - Math.sin((kk * Math.PI) / 12)) < EPS, `k=${kk}: symbolic sin equals numeric sin`);
  /* magnitudes drawn only from the five exact values */
  for (const m of [Math.abs(cos.v), Math.abs(sin.v)]) {
    check(
      [0, 0.5, Math.SQRT1_2, Math.sqrt(3) / 2, 1].some((x) => Math.abs(x - m) < EPS),
      `k=${kk}: magnitude from the exact five`
    );
  }
}
for (let kk = 0; kk < 24; kk++) {
  const should = kk % 2 === 0 || kk % 3 === 0;
  check((SPECIALS[kk] != null) === should, `k=${kk}: special exactly when on the π/6 or π/4 grid`);
}
/* specialOf wraps: any k, any lap */
for (let kk = -48; kk <= 72; kk++) {
  const sp = specialOf(kk);
  const base = SPECIALS[mod24(kk)] || null;
  check(sp === base, `specialOf wraps correctly at k=${kk}`);
}
/* coordText: exact on specials, honest ≈ elsewhere */
check(coordText(6).exact === true && coordText(6).sin === '1', 'coordText exact at π/2');
check(coordText(1).exact === false, 'coordText approximate off the special grid');
check(/^-?0\.\d{3}$|^-?1\.000$|^0\.\d{3}$/.test(coordText(1).cos), 'approximate readout is 3 dp');

/* ---------------------------------------------------------------------------
   3. THE FORMATTER — every dial value renders as a fully reduced π-fraction.
   ------------------------------------------------------------------------- */
const CASES = [
  [0, '0'], [1, 'π/12'], [2, 'π/6'], [3, 'π/4'], [4, 'π/3'], [6, 'π/2'], [9, '3π/4'],
  [10, '5π/6'], [12, 'π'], [16, '4π/3'], [18, '3π/2'], [24, '2π'], [30, '5π/2'], [48, '4π'],
  [-6, '−π/2'], [-24, '−2π'],
];
for (const [kk, s] of CASES) check(piFrac(kk) === s, `piFrac(${kk}) = "${s}" (got "${piFrac(kk)}")`);
for (let kk = DIAL_ALL_REALS.min; kk <= DIAL_ALL_REALS.max; kk++) {
  if (kk === 0) continue;
  const m = piFrac(kk).match(/^(−?)(?:(\d+))?π(?:\/(\d+))?$/);
  check(!!m, `piFrac(${kk}) is a π-fraction (got "${piFrac(kk)}")`);
  if (m) {
    const num = m[2] ? Number(m[2]) : 1;
    const den = m[3] ? Number(m[3]) : 1;
    check(gcd(num, den) === 1, `piFrac(${kk}) fully reduced`);
    const val = ((m[1] === '−' ? -1 : 1) * num) / den;
    check(Math.abs(val - kk / 12) < EPS, `piFrac(${kk}) has the right value`);
  }
}

/* ---------------------------------------------------------------------------
   4. THE STANDARDS' FACTS — evenness/oddness, co-termination, quadrant signs.
   ------------------------------------------------------------------------- */
for (let kk = -24; kk <= 48; kk++) {
  check(Math.abs(cosOf(-kk) - cosOf(kk)) < EPS, `cos even at k=${kk}`);
  check(Math.abs(sinOf(-kk) + sinOf(kk)) < EPS, `sin odd at k=${kk}`);
  const a = specialOf(kk);
  const b = specialOf(kk + 24);
  check(a === b, `co-terminal: k=${kk} and k+24 land identically`);
}
/* symbolic evenness/oddness on the table itself */
for (const kk of specialKeys) {
  const p = SPECIALS[kk];
  const q = SPECIALS[mod24(-kk)];
  check(Math.abs(p.cos.v - q.cos.v) < EPS, `table: cos(−t) = cos t at k=${kk}`);
  check(Math.abs(p.sin.v + q.sin.v) < EPS, `table: sin(−t) = −sin t at k=${kk}`);
}
/* quadrant signs */
const signOK = (kk, cs, ss) => {
  const c = cosOf(kk);
  const s = sinOf(kk);
  return Math.sign(Math.abs(c) < EPS ? 0 : c) === cs && Math.sign(Math.abs(s) < EPS ? 0 : s) === ss;
};
for (let kk = 1; kk <= 5; kk++) check(signOK(kk, 1, 1), `Q1 signs at k=${kk}`);
for (let kk = 7; kk <= 11; kk++) check(signOK(kk, -1, 1), `Q2 signs at k=${kk}`);
for (let kk = 13; kk <= 17; kk++) check(signOK(kk, -1, -1), `Q3 signs at k=${kk}`);
for (let kk = 19; kk <= 23; kk++) check(signOK(kk, 1, -1), `Q4 signs at k=${kk}`);

/* ---------------------------------------------------------------------------
   5. LESSON STRUCTURE — the dial's range grows at the domain step; scenes
   pinned in range; answer keys tied to the model.
   ------------------------------------------------------------------------- */
check(STEPS.length === 7, 'seven steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
check(STEPS[0].lockDial === true && STEPS[0].demo === 0, 'step 1: dial locked at t = 0');
check(STEPS[DOMAIN_STEP].allReals === true, 'the domain step opens the dial to all reals');
STEPS.forEach((s, i) => {
  const d = s.allReals ? DIAL_ALL_REALS : DIAL_ONE_RIM;
  check(Number.isInteger(s.demo) && s.demo >= d.min && s.demo <= d.max, `step ${i} demo in dial range`);
  check(i >= DOMAIN_STEP || !s.allReals, `step ${i}: one rim only before the domain step`);
  if (s.chips) s.chips.forEach((kk) => check(SPECIALS[mod24(kk)] != null, `step ${i} chip ${kk} is a special`));
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
/* answer keys derived from the model */
check(/^2π/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key: the rim is 2π');
check(/^Exactly π\/2/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key: the arc is the number');
check(
  STEPS[2].choices[STEPS[2].answer].startsWith(`(${SPECIALS[12].cos.s}, ${SPECIALS[12].sin.s})`),
  'step 3 key: P(π) from the table'
);
check(STEPS[3].choices[STEPS[3].answer].startsWith(SPECIALS[2].sin.s), 'step 4 key: sin(π/6) from the table');
check(new RegExp(`^${piFrac(12)} —`).test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key: first zero at π');
check(/^Same point/.test(STEPS[5].choices[STEPS[5].answer]), 'step 6 key: co-termination');
check(STEPS[5].demo === 30 && mod24(30) === 6, 'the domain step opens on 2π + π/2 — a lap plus a quarter');

/* ---------------------------------------------------------------------------
   6. CALIBRATION — the stamp is exactly "landed on the point", co-terminal
   wraps included; the even-cosine near-miss earns exactly half.
   ------------------------------------------------------------------------- */
for (const target of ORDER_POOL) {
  check(SPECIALS[target] != null && target !== 0, 'orders are non-trivial specials');
  for (let kk = DIAL_ALL_REALS.min; kk <= DIAL_ALL_REALS.max; kk++) {
    const should = mod24(kk) === target;
    check(isCalibrated(kk, target) === should, `stamp gate at k=${kk}, target=${target}`);
    const p = closeness(kk, target);
    check([0, 50, 100].includes(p), 'meter quantized');
    check((p === 100) === should, `meter 100 ⟺ stamp at k=${kk}/${target}`);
  }
  /* cosine is even: the mirror wrap matches x but not y (unless sin = 0) */
  const mirror = mod24(-target);
  if (SPECIALS[target].sin.v !== 0) {
    check(closeness(mirror, target) === 50, `the mirror wrap earns exactly half at target=${target}`);
    check(!isCalibrated(mirror, target), `the mirror wrap never stamps at target=${target}`);
  }
}
check(calibChecks(6, null).every((c) => c === false), 'no order, no credit');
for (let i = 0; i < 300; i++) {
  const t = makeOrder(null);
  check(ORDER_POOL.includes(t), 'orders come from the pool');
}
for (let i = 0; i < 100; i++) check(makeOrder(6) !== 6, 'a new order is genuinely new');

/* ---------------------------------------------------------------------------
   7. REFUSALS & RESTRAINT — grep the CODE (below the header comment).
   This corner is the crossroads of the trig wing; the boundaries are the lab.
   ------------------------------------------------------------------------- */
const forbid = [
  [/°|\bdegrees?\b/i, 'no degrees anywhere (AngleLab/AngleTurnLab own them)'],
  [/protractor/i, 'no protractor (AngleLab)'],
  [/\bs\s*=\s*r\b|arc length ÷|divided by the radius/i, 'no s = rθ ratio (AngleLab) — here the radius is 1'],
  [/fraction of a (full )?turn/i, 'no fraction-of-turn language (AngleTurnLab)'],
  [/\(x\s*−\s*h\)|radius triangle/i, 'no center-radius machinery (CircleLab)'],
  [/sin²|cos²|Pythagorean/i, 'the identity is a future lab’s corner — left unclaimed'],
  [/amplitude|midline|\bphase\b|A·sin|B·?x\s*\+\s*C/i, 'no transformed-wave dials (SineFunctionLab)'],
  [/\baddress\b|route arrow|quadrant map/i, 'no address language (PointLab)'],
  [/SOH|CAH|TOA|hypotenuse|opposite (side|over)|adjacent (side|over)/i, 'no right-triangle reading (roadmap H16)'],
  [/requestAnimationFrame/, 'nothing animates — the wrap is dragged, not played'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);

/* the values must be DERIVED or table-certified, never ad-hoc decimals */
check(!/0\.866|0\.707|0\.5000\d/.test(code), 'no hard-coded decimal trig values');
check(/const R2 = \{ s: '√2\/2', v: Math\.SQRT1_2 \};/.test(code), 'the table’s numeric twins come from exact constants');
check(/v: Math\.sqrt\(3\) \/ 2/.test(code), '√3/2 computed, not typed');
/* one model serves both panels: the wave trace uses the same sin */
check(/Math\.sin\(\(kk \* Math\.PI\) \/ 12\)/.test(code), 'the wave is the wrap’s own record');
/* the readout is honest about exactness */
check(/exact \? '\s*\(exact\)' : '\s*\(≈\)'/.test(code) || /c\.exact \? '   \(exact\)' : '   \(≈\)'/.test(code), 'the band marks exact vs approximate');
/* the wrong answers preserve the misconceptions verbatim */
check(/360 of something/.test(code), 'the "360 is a length" belief is offered and refuted');
check(/It depends on the size of the circle/.test(code), 'the "size matters" belief is offered and refuted');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-unitcircle: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
