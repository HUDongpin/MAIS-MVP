/* ============================================================================
   audit-lengthcomparison.mjs — numeric + structural proof for
   LengthComparisonLab.jsx (K.MD.A.2 · direct length comparison, no numbers).

   Pattern (per ShapesLab / ComposingShapesLab / TeenNumbersLab):
     • SLICE the pure model out of the shipped .jsx and EVAL it, so the audit
       tests the code that ships and cannot drift from it.
     • Prove every stated fact by exhaustive integer sweep.
     • Enforce the lab's REFUSALS (no ruler, no numbers, no >/</= language,
       no sibling pictures) by grepping the code below the header comment.
     • Prove the CALIBRATED stamp cannot fire falsely.

   Run:  node audit-lengthcomparison.mjs [path-to-jsx]
   (the optional path is for mutation-testing the audit itself)
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./LengthComparisonLab.jsx', import.meta.url));
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
   1. SLICE AND EVAL the shipped model: everything between the react import
   and `export default function` is pure data + pure functions by design.
   ------------------------------------------------------------------------- */
const importAt = src.indexOf("import { useCallback");
const compAt = src.indexOf('export default function LengthComparisonLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd); // everything below the header comment — greps run on THIS

const sandbox = new Function(
  `${modelSrc}
   return { RED, BLUE, SLATE, GOLD, OK, LEN_A, LEN_C, OFF_MAX, DIALS, START_LEN_B, CALIB_STEP,
            clampInt, verdictOf, tipHalves, allAligned, idxOfLongest, idxOfShortest,
            makeChallenge, calibChecks, matchPercent, isCalibrated, STEPS };`
)();
const {
  LEN_A, LEN_C, OFF_MAX, DIALS, START_LEN_B, CALIB_STEP,
  clampInt, verdictOf, tipHalves, allAligned, idxOfLongest, idxOfShortest,
  makeChallenge, calibChecks, matchPercent, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE VERDICT — an exact trichotomy with a perfect mirror.
   ------------------------------------------------------------------------- */
for (let a = 1; a <= 20; a++) {
  for (let b = 1; b <= 20; b++) {
    const v = verdictOf(a, b);
    const w = verdictOf(b, a);
    check(['longer', 'shorter', 'same'].includes(v), `verdict domain ${a},${b}`);
    check((v === 'longer') === a > b, `longer ⟺ a>b at ${a},${b}`);
    check((v === 'shorter') === a < b, `shorter ⟺ a<b at ${a},${b}`);
    check((v === 'same') === (a === b), `same ⟺ a=b at ${a},${b}`);
    check(
      (v === 'same' && w === 'same') || (v === 'longer' && w === 'shorter') || (v === 'shorter' && w === 'longer'),
      `mirror at ${a},${b}`
    );
  }
}

/* ---------------------------------------------------------------------------
   3. THE FAIRNESS GATE — a verdict may be read iff every offset is exactly 0.
   ------------------------------------------------------------------------- */
check(allAligned([0, 0, 0]) === true, 'aligned when all zero');
check(allAligned([0, 0]) === true, 'aligned pair');
for (let i = 0; i < 3; i++) {
  for (let o = 1; o <= OFF_MAX; o++) {
    const offs = [0, 0, 0];
    offs[i] = o;
    check(allAligned(offs) === false, `not aligned when strip ${i} off by ${o}`);
  }
}

/* ---------------------------------------------------------------------------
   4. THE TRAP — the shipped demo really lies.  With the step-2 scene (blue
   slid, red on the line) the blue TIP pokes past the red tip while blue is
   the SHORTER strip.  tip = 2·len + off half-steps: exact integers.
   ------------------------------------------------------------------------- */
const trapStep = STEPS[1];
check(!!trapStep.demo && trapStep.demo.lenB != null, 'trap step pins the blue length');
{
  const lb = trapStep.demo.lenB;
  const ob = trapStep.demo.offs[1];
  check(trapStep.demo.offs[0] === 0, 'trap: red stays on the line');
  check(lb < LEN_A, 'trap: blue is genuinely shorter');
  check(tipHalves(lb, ob) > tipHalves(LEN_A, 0), 'trap: the shorter strip pokes out farther');
  check(ob <= OFF_MAX, 'trap offset reachable');
}
check(tipHalves(7, 0) === 14 && tipHalves(4, 9) === 17, 'tip arithmetic spot-check');

/* ---------------------------------------------------------------------------
   5. LESSON STRUCTURE — 6 steps, one calibration (last), questions answerable,
   demos pin what the copy names, exactly ONE dial (K-tier restraint).
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
  check(s.strips === 2 || s.strips === 3, `step ${i} strip count sane`);
  check(Array.isArray(s.demo.offs) && s.demo.offs.length === 3, `step ${i} demo pins offsets`);
  s.demo.offs.forEach((o) => check(Number.isInteger(o) && o >= 0 && o <= OFF_MAX, `step ${i} demo offset integer`));
});
check(DIALS.length === 1, 'K-tier: exactly one dial');
check(DIALS[0].unlock === 3, 'the dial unlocks at the longer/shorter/same step');
check(DIALS[0].min >= 2 && DIALS[0].max <= 12, 'dial range sane');
check(START_LEN_B >= DIALS[0].min && START_LEN_B <= DIALS[0].max, 'start length in dial range');
check(STEPS[0].demo.lenB === START_LEN_B, 'step 1 opens on the start length');

/* step 5's question is TRUE AT EVERY DIAL POSITION: it asks about grey vs red,
   two fixed strips, so the child's own blue length can never falsify the card */
check(LEN_C > LEN_A, 'grey longer than red BY CONSTRUCTION');
for (let lb = DIALS[0].min; lb <= DIALS[0].max; lb++) {
  check(verdictOf(LEN_C, LEN_A) === 'longer', `step-5 truth independent of dial at lenB=${lb}`);
}

/* ---------------------------------------------------------------------------
   6. CALIBRATION — the stamp is three integer predicates ANDed, and it cannot
   fire falsely.  Exhaustive: every ordered distinct triple from the pool ×
   every pick pair × aligned and misaligned offsets.
   ------------------------------------------------------------------------- */
const pool = [4, 5, 6, 7, 8, 9, 10, 11, 12];
let combos = 0;
for (const a of pool)
  for (const b of pool)
    for (const c of pool) {
      if (a === b || b === c || a === c) continue;
      const lens = [a, b, c];
      const L = idxOfLongest(lens);
      const S = idxOfShortest(lens);
      check(lens[L] === Math.max(a, b, c), `argmax at ${lens}`);
      check(lens[S] === Math.min(a, b, c), `argmin at ${lens}`);
      const offsSets = [
        [0, 0, 0],
        [1, 0, 0],
        [0, 3, 0],
        [0, 0, OFF_MAX],
        [2, 2, 2],
      ];
      const picks = [
        [null, null],
        [L, null],
        [L, S],
        [S, L],
        [L, L === 0 ? 1 : 0],
        [(L + 1) % 3, S],
      ];
      for (const offs of offsSets)
        for (const [pl, ps] of picks) {
          const stamped = isCalibrated(offs, lens, pl, ps);
          const should = allAligned(offs) && pl === L && ps === S;
          check(stamped === should, `stamp gate at lens=${lens} offs=${offs} picks=${pl},${ps}`);
          const pct = matchPercent(offs, lens, pl, ps);
          check(pct === Math.round((100 * calibChecks(offs, lens, pl, ps).filter(Boolean).length) / 3), 'meter = checks/3');
          check((pct === 100) === stamped, `meter 100 ⟺ stamp at ${lens}`);
          combos++;
        }
    }
check(combos === 504 * 30, `exhaustive stamp sweep ran (${combos})`);

/* the generator only emits solvable, non-trivial challenges */
for (let t = 0; t < 3000; t++) {
  const ch = makeChallenge();
  check(ch.lens.length === 3 && ch.offs.length === 3, 'challenge shape');
  check(new Set(ch.lens).size === 3, 'lengths distinct (longest/shortest unique)');
  ch.lens.forEach((l) => check(Number.isInteger(l) && l >= 4 && l <= 12, 'length in range'));
  ch.offs.forEach((o) => check(Number.isInteger(o) && o >= 2 && o <= OFF_MAX, 'every strip starts OFF the line'));
}

/* clamp */
check(clampInt(99, 0, OFF_MAX) === OFF_MAX && clampInt(-4, 0, OFF_MAX) === 0, 'offset clamps');
check(clampInt(3.6, 0, 10) === 4, 'clamp rounds to integer');

/* ---------------------------------------------------------------------------
   7. REFUSALS & RESTRAINT — grep the CODE (below the header comment).  The
   header may ARGUE the refusals; the code may not contain them.
   ------------------------------------------------------------------------- */
const forbid = [
  [/ruler/i, 'no ruler (MeasurementLab)'],
  [/\btick/i, 'no tick marks (MeasurementLab)'],
  [/\bunits?\b/i, 'no units (MeasurementLab)'],
  [/measur(?!eText)/i, 'no measuring language (MeasurementLab; measureText is a canvas API)'],
  [/how much longer/i, 'no numeric difference (MeasurementLab 2.MD.B.5)'],
  [/greater|less than/i, 'no number-comparison language (ComparingLab)'],
  [/\bdigit/i, 'no digits (ComparingLab/NumberLab)'],
  [/place.?value/i, 'no place value (NumberLab)'],
  [/ten.?frame/i, 'no ten-frame (CountingLab)'],
  [/number.?line/i, 'no number line (AddLab/SubtractionLab)'],
  [/\bhops?\b/i, 'no hops (AddLab)'],
  [/requestAnimationFrame/, 'no rAF (K-tier restraint: nothing animates)'],
  [/\bSwap\b/i, 'no swap button (CommutativeLab)'],
  [/\bbins?\b/i, 'no bins (SortLab)'],
  [/[≥≤]/, 'no comparison symbols'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);

/* lengths are NEVER rendered as numbers: no fillText fed a length, no length
   interpolated into any string */
check(!/fillText\(\s*(?:String\(\s*)?(?:S\.)?len/.test(code), 'no length ever drawn as text');
check(!/\$\{\s*len/i.test(code), 'no length interpolated into a string');
check(!/\$\{\s*(?:S\.)?lens\[/i.test(code), 'no length element interpolated');

/* the verdict speaks in words, and the calibration band never reads the order
   out loud (it would answer the taps for the child) */
check(/longer/.test(code) && /shorter/.test(code) && /same length/.test(code), 'verdict words present');
{
  const defAt = code.indexOf('function orderSentence');
  const calls = code.split('orderSentence(').length - 1;
  check(defAt > 0, 'orderSentence exists');
  check(calls === 2, 'orderSentence called exactly once (lesson band only)');
  const calibBand = code.slice(code.indexOf('if (S.calib) {'), code.indexOf('} else if (!S.fair)'));
  check(!calibBand.includes('orderSentence'), 'calibration band never reads the order aloud');
}

/* K-tier restraint: toolbar holds exactly one button; only one dial renders */
{
  const tb = code.slice(code.indexOf('className="toolbar"'), code.indexOf('</div>', code.indexOf('className="toolbar"')));
  const buttons = tb.split('<button').length - 1;
  check(buttons === 1, `toolbar holds exactly one button (found ${buttons})`);
}

/* the fairness gate is wired into the DRAW (the verdict band checks S.fair)
   and into the CAPSTONE (taps refuse to register on an unfair start) */
check(/else if \(!S\.fair\)/.test(code), 'verdict band gates on fairness');
check(/if \(!sceneRef\.current\.fair\) return/.test(code), 'capstone taps gate on fairness');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-lengthcomparison: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
