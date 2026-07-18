/* ============================================================================
   audit-trianglebuild.mjs — numeric + geometric proof for TriangleBuildLab.jsx
   (7.G.A.2 · the constraint-kit census; the SSA swing verified against
   floating-point geometry).

   Run:  node audit-trianglebuild.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./TriangleBuildLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function TriangleBuildLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, CALIB_STEP, SSA_B, SSA_APEX, SSA_H, sssCount, sasCount,
            asaCount, ssaCount, aaaCount, censusOf, censusText, kitText, CENSUS_CHIPS,
            CASES, makeCase, truth1, truth2, calibChecks, closeness, isCalibrated,
            STEPS };`
)();
const {
  CALIB_STEP, SSA_B, SSA_APEX, SSA_H, sssCount, asaCount, ssaCount, aaaCount, censusOf,
  censusText, kitText, CENSUS_CHIPS, CASES, makeCase, truth1, truth2, calibChecks,
  closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE CENSUS LAWS.
   ------------------------------------------------------------------------- */
/* SSS: the closing test, against a brute inequality check */
for (let p = 1; p <= 10; p++)
  for (let q = p; q <= 10; q++)
    for (let r = q; r <= 12; r++) {
      const want = p + q > r ? 1 : 0; /* with p ≤ q ≤ r the only test that can fail */
      check(sssCount(p, q, r) === want, `SSS ${p},${q},${r}`);
      check(sssCount(r, p, q) === want && sssCount(q, r, p) === want, `SSS ${p},${q},${r}: order-free`);
    }
/* the exact corner geometry: the apex really is 10 away at height 6 */
check(SSA_APEX.x * SSA_APEX.x + SSA_APEX.y * SSA_APEX.y === SSA_B * SSA_B, 'the fixed side is exactly 10');
check(SSA_APEX.y === SSA_H, 'the swing’s shortest reach is the height, exactly 6');
/* SSA: the census rule against floating-point geometry, a = 1..20 */
for (let a = 1; a <= 20; a++) {
  const disc = a * a - SSA_H * SSA_H;
  let landings = 0;
  if (disc === 0) landings = 1;
  else if (disc > 0) {
    const s = Math.sqrt(disc);
    for (const xr of [SSA_APEX.x - s, SSA_APEX.x + s]) if (xr > 1e-9) landings++;
  }
  check(ssaCount(a) === landings, `SSA a=${a}: model census = geometric landings (${landings})`);
}
check(ssaCount(5) === 0 && ssaCount(6) === 1 && ssaCount(8) === 2 && ssaCount(10) === 1 && ssaCount(14) === 1, 'the SSA thresholds');
/* ASA and AAA */
check(asaCount(40, 60) === 1 && asaCount(120, 70) === 0, 'ASA: legal pins, illegal gapes');
check(aaaCount(50, 60, 70) === Infinity && aaaCount(50, 60, 80) === 0, 'AAA: the family or nothing');

/* ---------------------------------------------------------------------------
   3. QUOTED FACTS — every number in the lesson copy, recomputed.
   ------------------------------------------------------------------------- */
check(2 + 3 < 6, 'the gaping kit: 2 + 3 < 6');
check(sssCount(2, 3, 6) === 0 && sssCount(3, 4, 5) === 1, 'the two SSS verdicts');
check(50 + 60 + 70 === 180, 'the AAA kit agrees to 180');
check(/2 \+ 3 < 6/.test(STEPS[0].choices[0]), 'step 1 quotes the failing test');
check(/\(8, 6\)/.test(STEPS[3].body), 'step 4 posts the exact apex');
check(/below 6 the swing cannot reach/.test(STEPS[3].feedback), 'step 4 states the thresholds');
check(/congruence bench/.test(STEPS[1].feedback), 'the carrying test is cited');
check(/dilation bench/.test(STEPS[4].feedback), 'the similar family is ceded');

/* ---------------------------------------------------------------------------
   4. LESSON STRUCTURE — scenes pinned; answer keys tied to the model.
   ------------------------------------------------------------------------- */
check(STEPS.length === 6, 'six steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  check(!!s.kit && !!s.kit.kind, `step ${i} kit valid`);
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
check(STEPS[0].kit.kind === 'SSS' && STEPS[3].kit.kind === 'SSA' && STEPS[4].kit.kind === 'AAA', 'the kit ladder');
check(!!STEPS[3].dial, 'the swing dial belongs to step 4');
/* answer keys derived from the model */
check(/^None — 2 \+ 3 < 6/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key: the gape');
check(/^Exactly one — a mirror copy counts as the same/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key: rigid');
check(/^The hinge is set/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key: SAS pins');
check(/^Two — the swing lands on the base line twice/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key: the ambiguity');
check(/^Infinitely many — angles fix the SHAPE/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key: the family');
/* the real beliefs are offered and refuted */
check(/every kit builds something/.test(STEPS[0].choices.join('|')), 'the always-buildable belief is offered');
check(/three letters always pin|kits with three parts are rigid/.test(STEPS.map((s) => (s.choices || []).join('|')).join('|')), 'the three-conditions belief is offered');

/* ---------------------------------------------------------------------------
   5. CALIBRATION — two censuses; the stamp cannot fire falsely.
   ------------------------------------------------------------------------- */
check(CASES.length >= 6, 'several posted kit pairs');
const allTruths = new Set();
for (let i = 0; i < CASES.length; i++) {
  allTruths.add(truth1(i));
  allTruths.add(truth2(i));
}
check(['0', '1', '2', 'infinitely many'].every((t) => allTruths.has(t)), 'all four census values are posted somewhere');
for (let i = 0; i < CASES.length; i++) {
  const t1 = truth1(i);
  const t2 = truth2(i);
  check(CENSUS_CHIPS.includes(t1) && CENSUS_CHIPS.includes(t2), `case ${i}: truths are chips`);
  check(t1 === censusText(censusOf(CASES[i].k1)), `case ${i}: first census from first principles`);
  check(t2 === censusText(censusOf(CASES[i].k2)), `case ${i}: second census from first principles`);
  for (const a1 of [null, ...CENSUS_CHIPS, 'bogus']) {
    for (const a2 of [null, ...CENSUS_CHIPS]) {
      const should = a1 === t1 && a2 === t2;
      check(isCalibrated(i, a1, a2) === should, `gate: case ${i} c1=${a1} c2=${a2}`);
      check([0, 50, 100].includes(closeness(i, a1, a2)), 'meter quantized');
    }
  }
  const wrong1 = CENSUS_CHIPS.find((x) => x !== t1);
  check(closeness(i, wrong1, t2) === 0, `case ${i}: kit two without kit one earns nothing`);
}
check(calibChecks(null, '1', '2').every((x) => x === false), 'no case, no credit');
for (let i = 0; i < 200; i++) {
  const k = makeCase(null);
  check(Number.isInteger(k) && k >= 0 && k < CASES.length, 'cases from the space');
}
for (let i = 0; i < 100; i++) check(makeCase(3) !== 3, 'a new case is genuinely new');

/* ---------------------------------------------------------------------------
   6. REFUSALS & RESTRAINT — grep the CODE (below the header comment).
   ------------------------------------------------------------------------- */
const forbid = [
  [/\bdrag/i, 'nothing is draggable (TriangleLab)'],
  [/angle sum|interior angles sum/i, 'no angle-sum tour (TriangleLab)'],
  [/opp\/hyp|\bSOH\b|corner fan/i, 'no quotients (TrigRatioLab; the corner is borrowed with credit)'],
  [/scale factor|center of dilation/i, 'no dilation machinery (DilationsLab; the bench is cited)'],
  [/carrying test|\balibi\b/i, 'the carrying test is cited, not re-run (CongruenceLab)'],
  [/\btags?\b|\bcoins?\b/i, 'no sibling currency'],
  [/odometer|brigade|\bslats?\b|\btrap\b/i, 'no slats or traps (IntegralLab)'],
  [/\bwalkers?\b|foothold/i, 'no walkers (LimitLab)'],
  [/mason|packing|leftover|\bmarch/i, 'no sibling machinery'],
  [/requestAnimationFrame/, 'nothing animates — the swing is a dial'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);
/* Math.sqrt appears exactly once — in the renderer, for the landing pixels */
check((code.match(/Math\.sqrt/g) || []).length === 1, 'Math.sqrt lives only in the renderer');
check(!/Math\.sqrt/.test(modelSrc), 'the model itself never square-roots');

/* verdicts must be DERIVED, never stored */
check(/const ssaCount = \(a\) => \(a < SSA_H \? 0 : a === SSA_H \? 1 : a < SSA_B \? 2 : 1\)/.test(code), 'the swing census is exact comparison');
check(/const censusOf = \(kit\) => \{/.test(code), 'one census function for every kit');
{
  const blockStart = code.indexOf('const CASES = [');
  const blockEnd = code.indexOf('];', blockStart);
  const block = code.slice(blockStart, blockEnd);
  check(!/census|answer|truth|count:/i.test(block), 'no kit ships its own census');
}
/* the drawing reads the model */
check(/censusOf\(kit2\)/.test(code) || /censusOf\(S\.kit\)/.test(code) || /ssaCount\(a\)/.test(code), 'the cards read the model');
check(/censusText\(ssaCount\(a\)\)/.test(code), 'the swing readout reads the model');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-trianglebuild: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
