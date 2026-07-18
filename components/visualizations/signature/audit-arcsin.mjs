/* ============================================================================
   audit-arcsin.mjs — numeric proof for ArcsinLab.jsx
   (HSF-TF.B.6–7 · the roster and the spokesperson; the window's theorem).

   Run:  node audit-arcsin.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./ArcsinLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function ArcsinLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);
const cssAt = code.indexOf('<style jsx>');
const codeSansCss = cssAt > 0 ? code.slice(0, cssAt) : code;

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, CALIB_STEP, MINUS, fmtInt, fmtDeg, rosterOf,
            spokesOf, spokesFor, VALUES, CASES, ROSTER_CHIPS, SPOKES_CHIPS,
            labelOf, rosterTruth, spokesTruth, makeCase, calibChecks, closeness,
            isCalibrated, STEPS };`
)();
const {
  CALIB_STEP, MINUS, fmtDeg, rosterOf, spokesOf, spokesFor, VALUES, CASES,
  ROSTER_CHIPS, SPOKES_CHIPS, labelOf, rosterTruth, spokesTruth, makeCase,
  calibChecks, closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE TWO LAWS — the roster against float trigonometry (the one place a
      float is allowed: in the AUDIT, verifying the integer model).
   ------------------------------------------------------------------------- */
const sinDeg = (a) => Math.sin((a * Math.PI) / 180);
for (const key of Object.keys(VALUES)) {
  const b = VALUES[key].b;
  const roster = rosterOf(b);
  /* every seat genuinely shares the base angle's sine (float check, 1e-9) */
  for (const a of roster) check(Math.abs(sinDeg(a) - sinDeg(b)) < 1e-9, `${key}: seat ${a} shares the sine`);
  /* and NO unlisted integer angle in range shares it */
  for (let a = -360; a <= 360; a++) {
    const shares = Math.abs(sinDeg(a) - sinDeg(b)) < 1e-9;
    check(shares === roster.includes(a), `${key}: completeness at ${a}`);
  }
  /* seats are sorted, distinct, in range */
  check(roster.every((a, i) => i === 0 || roster[i - 1] < a), `${key}: sorted distinct`);
  check(roster.every((a) => a >= -360 && a <= 360), `${key}: in range`);
}
/* THE WINDOW'S THEOREM: for every integer base in [−90, 90], exactly one seat inside */
for (let b = -90; b <= 90; b++) {
  const inside = rosterOf(b).filter((a) => a >= -90 && a <= 90);
  check(inside.length === 1 && inside[0] === b, `window theorem at base ${b}`);
  check(spokesOf(b) === b, `the spokesperson of an inside base is itself (${b})`);
}
/* the failed window [0, 180]: value 1/2 seats twice there — as step 4 claims */
check(rosterOf(30).filter((a) => a >= 0 && a <= 180).length === 2, '[0,180] seats 30 AND 150 — it fails');
/* the round trip: spokesFor agrees with the seating chart for every dial stop */
for (let t = -90; t <= 270; t += 30) {
  const s = spokesFor(t);
  check(s >= -90 && s <= 90, `spokesFor(${t}) lands inside`);
  check(Math.abs(sinDeg(s) - sinDeg(t)) < 1e-9, `spokesFor(${t}) preserves the sine`);
  check((t >= -90 && t <= 90) === (s === t), `the round trip is free exactly inside (${t})`);
}
check(spokesFor(150) === 30, 'arcsin(sin 150°) = 30° — the quoted case');
/* the quoted rosters */
check(rosterOf(30).join(',') === '-330,-210,30,150', 'the 1/2 roster');
check(rosterOf(90).join(',') === '-270,90', 'the sine-1 roster has two seats');
check(rosterOf(0).join(',') === '-360,-180,0,180,360', 'the zero roster has five');
check(180 - 30 === 150 && 150 - 360 === -210 && 30 - 360 === -330, 'the two laws generate the quoted seats');

/* ---------------------------------------------------------------------------
   3. QUOTED FACTS.
   ------------------------------------------------------------------------- */
check(/−330°, −210°, 30°, 150°/.test(STEPS[0].body), 'step 1 posts the four seats');
check(/150° = 180° − 30°/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key runs the mirror law');
check(/−210° = 150° − 360°/.test(STEPS[1].feedback), 'step 2 feedback runs the lap law');
check(/30° and 150°/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key names the double seating');
check(/circle bench/.test(STEPS[1].choices[STEPS[1].answer]), 'the two-spots fact is credited');
check(/arcsin\(sin\s*150°\)/.test(STEPS[4].q.replace(/\s+/g, ' ')) || /sin 150°/.test(STEPS[4].feedback), 'step 5 poses the round trip');
check(/= 30°/.test(STEPS[4].feedback) || /30°/.test(STEPS[4].choices[STEPS[4].answer]), 'and answers it with the spokesperson');

/* ---------------------------------------------------------------------------
   4. LESSON STRUCTURE.
   ------------------------------------------------------------------------- */
check(STEPS.length === 6, 'six steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  check(!!VALUES[s.value], `step ${i} value exists`);
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
check(STEPS[0].value === 'half' && STEPS[3].value === 'root3o2' && !!STEPS[4].dial, 'the value ladder; the dial on step 5');
/* answer keys */
check(/^No — four candidates in this stretch alone/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key: ill-posed');
check(/^The mirror law/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key: the mirror');
check(/^The answer pool must be cut down/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key: the repair');
check(/^Because \[0°, 180°\] contains BOTH mirror partners/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key: why this window');
check(/^30° — arcsin returns the window’s spokesperson/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key: the round trip');
check(/arcsin undoes sine, always/.test(STEPS[4].choices.join('|')), 'the free-round-trip belief is offered');
check(/Allow functions to return several answers/.test(STEPS[2].choices.join('|')), 'the multi-output belief is offered');

/* ---------------------------------------------------------------------------
   5. CALIBRATION.
   ------------------------------------------------------------------------- */
check(CASES.length >= 6, 'several posted values');
const rostersPosted = new Set(CASES.map((_, i) => rosterTruth(i)));
const spokesPosted = new Set(CASES.map((_, i) => spokesTruth(i)));
check(ROSTER_CHIPS.every((r) => rostersPosted.has(r)), 'every roster chip is some case’s truth');
check(SPOKES_CHIPS.every((s) => spokesPosted.has(s)), 'every spokesperson chip is some case’s truth');
check(
  CASES.some((_, i) => CASES.some((_, j) => i !== j && rosterTruth(i) === rosterTruth(j) && spokesTruth(i) !== spokesTruth(j))),
  'two cases share a roster count but not a spokesperson'
);
for (let i = 0; i < CASES.length; i++) {
  const rT = rosterTruth(i);
  const sT = spokesTruth(i);
  check(ROSTER_CHIPS.includes(rT) && SPOKES_CHIPS.includes(sT), `case ${i}: truths are chips`);
  const b = VALUES[CASES[i]].b;
  /* first principles: count by brute float scan; spokesperson = the base itself */
  let brute = 0;
  for (let a = -360; a <= 360; a++) if (Math.abs(sinDeg(a) - sinDeg(b)) < 1e-9) brute++;
  check(rT === String(brute), `case ${i}: roster count by brute scan`);
  check(sT === fmtDeg(b), `case ${i}: the spokesperson is the base seat`);
  for (const rp of [null, ...ROSTER_CHIPS, 'bogus']) {
    for (const sp of [null, ...SPOKES_CHIPS]) {
      const should = rp === rT && sp === sT;
      check(isCalibrated(i, rp, sp) === should, `gate: case ${i} r=${rp} s=${sp}`);
      check([0, 50, 100].includes(closeness(i, rp, sp)), 'meter quantized');
    }
  }
  const wrongR = ROSTER_CHIPS.find((x) => x !== rT);
  check(closeness(i, wrongR, sT) === 0, `case ${i}: the spokesperson without the roster earns nothing`);
  check(labelOf(i).includes(VALUES[CASES[i]].sym), `case ${i}: label posts the value`);
}
check(calibChecks(null, '4', '30°').every((x) => x === false), 'no case, no credit');
for (let i = 0; i < 200; i++) {
  const k = makeCase(null);
  check(Number.isInteger(k) && k >= 0 && k < CASES.length, 'cases from the space');
}
for (let i = 0; i < 100; i++) check(makeCase(2) !== 2, 'a new case is genuinely new');

/* ---------------------------------------------------------------------------
   6. REFUSALS & RESTRAINT — grep the CODE (styled-jsx stripped).
   ------------------------------------------------------------------------- */
const forbid = [
  [/\bwaves?\b|crest|trough|amplitude|\bperiods?\b/i, 'no wave (SineFunctionLab; laps, not periods)'],
  [/horizontal.line test/i, 'the test rides the wave — the wave stays home'],
  [/unwrap|turning point|spinning/i, 'no tour (UnitCircleLab; cited as the circle bench)'],
  [/undo machine|y = x\b|reflect/i, 'no general inverse machinery'],
  [/budget bar|radius triangle/i, 'no budget machinery (PythagoreanIdentityLab)'],
  [/corner fan|ratio ledger|opp\/hyp/i, 'no quotient machinery (TrigRatioLab)'],
  [/census|constraint kit/i, 'no kit machinery (TriangleBuildLab)'],
  [/\btags?\b|\bcoins?\b/i, 'no sibling currency'],
  [/odometer|brigade|\bslats?\b|\btrap\b/i, 'no slats or traps (IntegralLab)'],
  [/\bwalkers?\b|foothold/i, 'no walkers (LimitLab)'],
  [/mason|\bleftover\b|\bmarch/i, 'no sibling machinery'],
  [/Math\.(sin|cos|tan|asin|acos|atan|sqrt|pow|log|exp)/, 'no float trig anywhere in the lab'],
  [/\*\*/, 'no exponent operator'],
  [/requestAnimationFrame/, 'nothing animates'],
];
for (const [re, why] of forbid) check(!re.test(codeSansCss), `REFUSAL violated: ${why}`);

/* verdicts must be DERIVED, never stored */
check(/const rosterOf = \(b\) => \{/.test(code), 'the roster is generated from the two laws');
check(/if \(inside\.length !== 1\) throw/.test(code), 'the window theorem is asserted, not assumed');
{
  const blockStart = code.indexOf('const VALUES = {');
  const blockEnd = code.indexOf('};', blockStart);
  const block = code.slice(blockStart, blockEnd);
  check(!/roster|seats|spokes|count/i.test(block), 'no value ships its own seating');
}
/* the drawing reads the model */
check(/for \(const a of S\.roster\)/.test(code), 'the seats are drawn from the model');
check(/a === S\.spokes/.test(code), 'the spokesperson is compared, not hardcoded');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-arcsin: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
