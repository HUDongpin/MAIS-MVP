/* ============================================================================
   audit-matrix.mjs — numeric proof for MatrixLab.jsx
   (HSN-VM.C, HSA-REI.C.8–9 · two columns and the area bill).

   Run:  node audit-matrix.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./MatrixLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function MatrixLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);
const cssAt = code.indexOf('<style jsx>');
const codeSansCss = cssAt > 0 ? code.slice(0, cssAt) : code;

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, CALIB_STEP, fmtInt, colsOf, applyM, detOf,
            verdictOf, matText, MACHINES, CASES, DET_CHIPS, VERDICT_CHIPS,
            labelOf, detTruth, verdictTruth, makeCase, calibChecks, closeness,
            isCalibrated, STEPS };`
)();
const {
  CALIB_STEP, fmtInt, colsOf, applyM, detOf, verdictOf, matText, MACHINES, CASES,
  DET_CHIPS, VERDICT_CHIPS, labelOf, detTruth, verdictTruth, makeCase, calibChecks,
  closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE MACHINE'S LAWS — columns, linearity, det = area, collapse.
   ------------------------------------------------------------------------- */
/* shoelace area of the column parallelogram (0,0), c1, c1+c2, c2 */
const shoelace = (M) => {
  const [c1, c2] = colsOf(M);
  const pts = [[0, 0], c1, [c1[0] + c2[0], c1[1] + c2[1]], c2];
  let s = 0;
  for (let i = 0; i < 4; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % 4];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s) / 2;
};
for (let a = -3; a <= 3; a++)
  for (let b = -3; b <= 3; b++)
    for (let c = -2; c <= 2; c++)
      for (let d = -2; d <= 2; d++) {
        const M = [[a, b], [c, d]];
        /* the columns really are the images of east and north */
        const [c1, c2] = colsOf(M);
        const e = applyM(M, [1, 0]);
        const n = applyM(M, [0, 1]);
        check(e[0] === c1[0] && e[1] === c1[1], `east lands on column 1 (${a},${b},${c},${d})`);
        check(n[0] === c2[0] && n[1] === c2[1], `north lands on column 2`);
        /* |det| = the shoelace area of the column parallelogram */
        check(Math.abs(detOf(M)) === shoelace(M) || (detOf(M) === 0 && shoelace(M) === 0), `|det| = area (${a},${b},${c},${d})`);
        /* linearity: M(u + v) = Mu + Mv, and recombination */
        const u = [2, -1];
        const v = [1, 3];
        const Muv = applyM(M, [u[0] + v[0], u[1] + v[1]]);
        const MuMv = [applyM(M, u)[0] + applyM(M, v)[0], applyM(M, u)[1] + applyM(M, v)[1]];
        check(Muv[0] === MuMv[0] && Muv[1] === MuMv[1], `linearity (${a},${b},${c},${d})`);
        /* recombination: M(x,y) = x·col1 + y·col2 */
        const w = applyM(M, [3, 2]);
        check(w[0] === 3 * c1[0] + 2 * c2[0] && w[1] === 3 * c1[1] + 2 * c2[1], `recombination`);
        /* collapse ⟺ parallel columns (cross of columns = det) */
        const cross = c1[0] * c2[1] - c1[1] * c2[0];
        check((detOf(M) === 0) === (cross === 0), `collapse exactly when columns parallel`);
      }
/* the posted machines */
check(detOf(MACHINES.stretch.M) === 6 && 2 * 3 === 6, 'the stretch bills 6');
check(detOf(MACHINES.shear.M) === 1 && verdictOf(MACHINES.shear.M) === 'keeps, same-handed', 'the shear bills exactly 1');
check(detOf(MACHINES.mix.M) === 3 && 2 * 2 - 1 * 1 === 3, 'the mixer bills 3');
check(shoelace(MACHINES.mix.M) === 3, 'and its parallelogram really holds 3 squares');
check(detOf(MACHINES.swap.M) === -1 && verdictOf(MACHINES.swap.M) === 'keeps, flipped', 'the hand-swap flips at cost −1');
/* the worked application */
{
  const out = applyM(MACHINES.stretch.M, [2, 1]);
  check(out[0] === 4 && out[1] === 3, 'M·(2,1) = (4,3) for the stretch');
}
/* the dial family: det = 4 − t, collapse at 4, flip past it */
for (let t = 0; t <= 6; t++) {
  const M = [[2, 1], [t, 2]];
  check(detOf(M) === 4 - t, `dial det = 4 − t at t=${t}`);
}
check(verdictOf([[2, 1], [4, 2]]) === 'collapses to a line', 'the collapse at t = 4');
check(verdictOf([[2, 1], [5, 2]]) === 'keeps, flipped', 'flipped past the crease');
/* at collapse the columns are provably parallel */
{
  const [c1, c2] = colsOf([[2, 1], [4, 2]]);
  check(c1[0] === 2 * c2[0] && c1[1] === 2 * c2[1], 'at t = 4, column 1 = 2 × column 2');
}

/* ---------------------------------------------------------------------------
   3. QUOTED FACTS.
   ------------------------------------------------------------------------- */
check(/sent to \(2, 0\)/.test(STEPS[0].body) && /sent to \(0, 3\)/.test(STEPS[0].body), 'step 1 posts both columns');
check(/2·\(2, 0\) \+ 1·\(0, 3\) = \(4, 3\)/.test(STEPS[1].body), 'step 2 recombines');
check(/det = 1·1 − 1·0 = 1/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 bills the shear');
check(/det = 2·2 − 1·1 = 3/.test(STEPS[3].body), 'step 4 bills the mixer');
check(/\(2, 4\) and \(1, 2\)/.test(STEPS[4].feedback), 'step 5 names the parallel columns');
check(/errand bench/.test(STEPS[0].feedback), 'the vector bench is credited');
check(/det = −1/.test(STEPS[3].note), 'the flip cost is posted');

/* ---------------------------------------------------------------------------
   4. LESSON STRUCTURE.
   ------------------------------------------------------------------------- */
check(STEPS.length === 6, 'six steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  check(!!MACHINES[s.machine], `step ${i} machine exists`);
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
check(STEPS[0].machine === 'stretch' && STEPS[2].machine === 'shear' && !!STEPS[4].dial, 'the machine ladder; the dial bends');
/* answer keys */
check(/^Every point is built from east and north steps/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key');
check(/^\(4, 3\) — two copies/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key');
check(/^Exactly 1, unchanged/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key');
check(/^Every region’s area is multiplied by exactly 3/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key');
check(/^Collapsed the plane onto a line/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key');
check(/squashing loses area/.test(STEPS[2].choices.join('|')), 'the appearance belief is offered');
check(/0 is just small/.test(STEPS[4].choices.join('|')), 'the zero-is-small belief is offered');

/* ---------------------------------------------------------------------------
   5. CALIBRATION.
   ------------------------------------------------------------------------- */
check(CASES.length >= 6, 'several posted machines');
const detsPosted = new Set(CASES.map((_, i) => detTruth(i)));
const verdictsPosted = new Set(CASES.map((_, i) => verdictTruth(i)));
check(DET_CHIPS.every((d) => detsPosted.has(d)), 'every det chip is some case’s truth');
check(VERDICT_CHIPS.every((v) => verdictsPosted.has(v)), 'all three verdicts are posted');
/* two flips with different bills; two collapses? one collapse posted twice is fine */
check(
  CASES.some((_, i) => CASES.some((_, j) => i !== j && verdictTruth(i) === verdictTruth(j) && detTruth(i) !== detTruth(j))),
  'two cases share a verdict but not a bill'
);
for (let i = 0; i < CASES.length; i++) {
  const dT = detTruth(i);
  const vT = verdictTruth(i);
  check(DET_CHIPS.includes(dT) && VERDICT_CHIPS.includes(vT), `case ${i}: truths are chips`);
  const M = CASES[i];
  check(dT === fmtInt(M[0][0] * M[1][1] - M[0][1] * M[1][0]), `case ${i}: bill from first principles`);
  for (const dp of [null, ...DET_CHIPS, 'bogus']) {
    for (const vp of [null, ...VERDICT_CHIPS]) {
      const should = dp === dT && vp === vT;
      check(isCalibrated(i, dp, vp) === should, `gate: case ${i} d=${dp} v=${vp}`);
      check([0, 50, 100].includes(closeness(i, dp, vp)), 'meter quantized');
    }
  }
  const wrongD = DET_CHIPS.find((x) => x !== dT);
  check(closeness(i, wrongD, vT) === 0, `case ${i}: the verdict without the bill earns nothing`);
  check(labelOf(i) === matText(M), `case ${i}: label posts the machine`);
}
check(calibChecks(null, '3', 'keeps, same-handed').every((x) => x === false), 'no case, no credit');
for (let i = 0; i < 200; i++) {
  const k = makeCase(null);
  check(Number.isInteger(k) && k >= 0 && k < CASES.length, 'cases from the space');
}
for (let i = 0; i < 100; i++) check(makeCase(2) !== 2, 'a new case is genuinely new');

/* ---------------------------------------------------------------------------
   6. REFUSALS & RESTRAINT — grep the CODE (styled-jsx stripped).
   ------------------------------------------------------------------------- */
const forbid = [
  [/errand chain|shortcut arrow|tally line|tip to tail/i, 'no vector lessons (VectorLab; the bench is cited)'],
  [/elimination|substitution method|meet at a point/i, 'no system solving (SystemsOfEquationsLab)'],
  [/\brotations?\b|\bdegrees?\b|\bangles?\b/i, 'no angle machinery — columns only'],
  [/cofactor|3×3|three by three/i, 'one size, fully seen'],
  [/quarter turn|handshake/i, 'no slope machinery (PerpSlopeLab)'],
  [/\bgallery\b|promise band/i, 'no sampling machinery'],
  [/census|constraint kit/i, 'no kit machinery'],
  [/\btags?\b|\bcoins?\b/i, 'no sibling currency'],
  [/odometer|brigade|\bslats?\b|\btrap\b/i, 'no slats or traps (IntegralLab)'],
  [/\bwalkers?\b|foothold/i, 'no walkers (LimitLab)'],
  [/mason|\bleftover\b|\bmarch/i, 'no sibling machinery'],
  [/Math\.(sqrt|pow|cbrt|log|exp|acos|asin)/, 'no float math'],
  [/\*\*/, 'no exponent operator'],
  [/requestAnimationFrame/, 'nothing animates'],
];
for (const [re, why] of forbid) check(!re.test(codeSansCss), `REFUSAL violated: ${why}`);
check(!/Math\.(cos|sin|atan)/.test(modelSrc), 'no trig in the model (arrowheads live in the renderer)');

/* verdicts must be DERIVED, never stored */
check(/const detOf = \(M\) => M\[0\]\[0\] \* M\[1\]\[1\] - M\[0\]\[1\] \* M\[1\]\[0\]/.test(code), 'the bill is one line of integer arithmetic');
check(/const applyM = \(M, \[x, y\]\)/.test(code), 'application recombines live');
{
  const blockStart = code.indexOf('const CASES = [');
  const blockEnd = code.indexOf('];', blockStart);
  const block = code.slice(blockStart, blockEnd);
  check(!/det|verdict|truth|answer/i.test(block), 'no case ships its own bill');
}
/* the drawing reads the model */
check(/const quad = \[\[0, 0\], c1, \[c1\[0\] \+ c2\[0\], c1\[1\] \+ c2\[1\]\], c2\]/.test(code), 'the parallelogram is spanned by the model’s columns');
check(/fmtInt\(S\.det\)/.test(code), 'the bill line reads the model');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-matrix: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
