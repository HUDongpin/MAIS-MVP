/* ============================================================================
   audit-patterns.mjs — numeric + structural proof for PatternsLab.jsx
   (4.OA.C.5, 5.OA.B.3, 3.OA.D.9 · patterns, rules, and the unstated feature).

   Pattern (per the sibling audits): slice-and-eval the shipped model, prove
   every stated fact exhaustively, grep-enforce the refusals, prove the stamp.

   Run:  node audit-patterns.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./PatternsLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function PatternsLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, LISTA, LISTB, GOLD, DIALS, MAX_CRANKS, CALIB_STEP, clampInt, term,
            rowsOf, parityAlternates, isDouble, onRay, allOnRay, makeTarget, calibChecks,
            isCalibrated, closeness, STEPS };`
)();
const {
  DIALS, MAX_CRANKS, CALIB_STEP, clampInt, term, rowsOf, parityAlternates, isDouble,
  onRay, allOnRay, makeTarget, calibChecks, isCalibrated, closeness, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE MACHINES — exact terms, and every stated feature proved.
   ------------------------------------------------------------------------- */
let termOK = true;
for (let s = 0; s <= 3; s++) for (let d = 1; d <= 8; d++) for (let i = 0; i <= 10; i++) {
  if (term(s, d, i) !== s + i * d) termOK = false;
}
check(termOK, 'term(i) = start + i·add, exact everywhere');
{
  const rows = rowsOf(1, 3, 0, 6, 4);
  check(rows.length === 5 && rows.map(([A]) => A).join(',') === '1,4,7,10,13', 'the solo list: 1, 4, 7, 10, 13');
}

/* the parity feature (4.OA.C.5's own example): adding an odd flips parity */
check(parityAlternates(1, 3, 10), 'start 1, add 3: parity alternates for ten cranks');
for (let s = 0; s <= 5; s++) {
  for (const d of [1, 3, 5]) check(parityAlternates(s, d, 10), `odd add ${d} flips parity from any start ${s}`);
  for (const d of [2, 4, 6]) check(!parityAlternates(s, d, 10), `even add ${d} never flips parity (start ${s})`);
}

/* the double feature (5.OA.B.3's own example): add-3 and add-6 from zero */
check(isDouble(rowsOf(0, 3, 0, 6, 5)), 'every B term is double its partner A (the CCSS pair)');
for (let a = 1; a <= 4; a++) check(isDouble(rowsOf(0, a, 0, 2 * a, 5)), `add-${a} vs add-${2 * a}: double throughout`);

/* the additive illusion fits the first honest row and dies at the second */
{
  const rows = rowsOf(0, 3, 0, 6, 2);
  check(rows[1][1] === rows[1][0] + 3, 'the illusion: (3, 6) fits B = A + 3');
  check(rows[2][1] !== rows[2][0] + 3, 'the illusion dies at (6, 12)');
}

/* collinearity: zero starts put every pair on the ray b·A = a·B */
let lineOK = true;
for (let a = 1; a <= 5; a++) for (let b = 1; b <= 8; b++) for (let i = 0; i <= 5; i++) {
  if (b * term(0, a, i) - a * term(0, b, i) !== 0) lineOK = false;
}
check(lineOK, 'b·A(i) − a·B(i) = 0 for every rule pair and every crank (the ray is real)');

/* ---------------------------------------------------------------------------
   3. CALIBRATION — the demand B = c·A holds for every cranked pair exactly
   when b = c·a; evidence is required; the empty table can never stamp.
   ------------------------------------------------------------------------- */
let equivOK = true;
for (let a = 1; a <= 5; a++) {
  for (let b = 1; b <= 8; b++) {
    for (let c = 2; c <= 4; c++) {
      const rows = rowsOf(0, a, 0, b, 5);
      if (allOnRay(rows.slice(1), c) !== (b === c * a)) equivOK = false;
    }
  }
}
check(equivOK, 'every-pair-on-ray ⇔ b = c·a (proved over the whole dial grid)');
for (let c = 2; c <= 4; c++) {
  let wit = 0;
  for (let a = 1; a <= 5; a++) if (c * a <= 8) wit++;
  check(wit >= 2, `demand c=${c} has at least two reachable rule pairs`);
}
for (let i = 0; i < 2000; i++) {
  const c = makeTarget(null);
  if (!(c >= 2 && c <= 4)) {
    check(false, 'target out of range');
    break;
  }
}
check(true, 'every demand is 2, 3, or 4 (2000 deals)');
{
  let fresh = true;
  for (let i = 0; i < 60; i++) if (makeTarget(3) === 3) fresh = false;
  check(fresh, 'a new demand is genuinely new');
}
{
  const good = rowsOf(0, 1, 0, 2, 5);
  check(isCalibrated(good, 2, 5), 'right rules + five cranks stamps');
  check(closeness(good, 2, 5) === 100, 'meter 100 on the stamp');
  check(!isCalibrated(rowsOf(0, 1, 0, 2, 3), 2, 3), 'three cranks of evidence is not enough');
  check(closeness(rowsOf(0, 1, 0, 2, 3), 2, 3) === 50, 'thin evidence meters at 50');
  check(!isCalibrated(rowsOf(0, 1, 0, 3, 5), 2, 5), 'wrong rules refuse even with full evidence');
  check(closeness(rowsOf(0, 1, 0, 3, 5), 2, 5) === 50, 'wrong rules meter at 50');
  check(!isCalibrated(rowsOf(0, 1, 0, 2, 0), 2, 0), 'the origin alone can never stamp');
  check(closeness(rowsOf(0, 1, 0, 2, 0), 2, 0) === 0, 'no cranks, no meter');
}
check(/setN\(0\); \/\/ a new rule starts fresh lists/.test(code), 'changing a rule resets the lists — history is never rewritten');
check(clampInt(9, 1, 5) === 5 && clampInt(0, 1, 8) === 1, 'dial clamps');

/* ---------------------------------------------------------------------------
   4. LESSON STRUCTURE.
   ------------------------------------------------------------------------- */
check(STEPS.length === 6, 'six steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
check(STEPS[0].startA === 1 && !!STEPS[0].solo && STEPS[0].maxCranks === 4, 'step 0: the solo parity machine, start 1');
for (let i = 1; i < STEPS.length; i++) {
  check(STEPS[i].startA === 0 && STEPS[i].startB === 0, `step ${i} starts both machines at zero`);
}
check(!STEPS[0].graph && !STEPS[1].graph && !STEPS[2].graph, 'the grid waits until the pairs exist');
check(!!STEPS[3].graph && !!STEPS[4].graph && !!STEPS[5].graph, 'the grid arrives with step 3 and stays');
check(DIALS.length === 2 && DIALS[0].unlock < DIALS[1].unlock, 'two rule dials, unlocked one per step');
check(MAX_CRANKS === 5, 'five cranks fill the table');
check(STEPS[3].q.includes('B = A + 3') || STEPS[3].q.includes('A + 3'), 'the trap question hands the child the additive illusion');
check(STEPS[2].choices.some((c) => c.includes('(9, 18)')) && STEPS[2].choices.some((c) => c.includes('(18, 9)')), 'the order-matters foil is on the table');

/* ---------------------------------------------------------------------------
   5. REFUSALS & RESTRAINT — grep the CODE (below the header comment).
   ------------------------------------------------------------------------- */
const forbid = [
  [/sequence/i, 'nothing here is called a sequence (SequencesLab owns the object)'],
  [/term track|recursive|explicit (rule|form)|closed form/i, 'no track, no recursive/explicit translation (SequencesLab)'],
  [/skip.?count|number line/i, 'no skip-counting, no number line (MultiplesLab)'],
  [/slope|\brise\b|\brun\b|y\s*=\s*m/i, 'no slope, no rise/run, no line equation (LineFunctionLab)'],
  [/smear|collapse|quadrant|route|address/i, 'no ordered-pair anatomy (PointLab)'],
  [/bar graph|pictograph|\bpie\b/i, 'no categorical displays (GraphsLab)'],
  [/grand total|row totals?|column totals?|\bmargins\b/i, 'no two-way table machinery (TableLab)'],
  [/\bmean\b|median|\bmode\b|dot plot|fulcrum/i, 'no center statistics, no dot plot (DataLab)'],
  [/requestAnimationFrame/, 'no rAF (nothing animates)'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);

/* the owned gestures are named on the canvas */
check(/crank/i.test(code), 'the crank is the verb');
check(/the pair/i.test(code), 'the welded pair is named');
check(/the move: /.test(code), 'the repeated move is drawn and named — the reason for the ray');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-patterns: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
