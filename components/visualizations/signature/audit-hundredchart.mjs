/* ============================================================================
   audit-hundredchart.mjs — numeric + structural proof for HundredChartLab.jsx
   (K.CC.A.1 · count to 100 by ones and by tens, on the hundred chart;
    + 1.NBT.A.1 · count to 120 — added 2026-07-17, the chart grows two rows).

   Pattern (per ShapesLab / ComposingShapesLab / TeenNumbersLab):
     • SLICE the pure model out of the shipped .jsx and EVAL it, so the audit
       tests the code that ships and cannot drift from it.
     • Prove every stated fact by exhaustive integer sweep — above all the
       WORD RULE (the thing a counting lab must never get wrong) and the
       stamp gate n === target.
     • Enforce the lab's REFUSALS (no sieve, no number line, no bundling, no
       naming of numeral parts) by grepping the code below the header.

   Run:  node audit-hundredchart.mjs [path-to-jsx]
   (the optional path is for mutation-testing the audit itself)
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./HundredChartLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function HundredChartLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, GOLD, DIALS, CALIB_STEP, clampInt, ONES_W, TENS_W, wordFor, rowOf, colOf,
            isRowEnd, stepCap, canStepOne, canLeapTen, makeTarget, closeness, isCalibrated, STEPS,
            saidUpTo, afterOne, afterLeap };`
)();
const {
  DIALS, CALIB_STEP, clampInt, ONES_W, TENS_W, wordFor, rowOf, colOf,
  isRowEnd, stepCap, canStepOne, canLeapTen, makeTarget, closeness, isCalibrated, STEPS,
  saidUpTo, afterOne, afterLeap,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE WORD RULE — the one thing a counting lab must never get wrong.
   ------------------------------------------------------------------------- */
const expect = {
  1: 'one', 5: 'five', 10: 'ten', 11: 'eleven', 12: 'twelve', 13: 'thirteen',
  14: 'fourteen', 15: 'fifteen', 18: 'eighteen', 19: 'nineteen', 20: 'twenty',
  21: 'twenty-one', 29: 'twenty-nine', 30: 'thirty', 40: 'forty', 41: 'forty-one',
  50: 'fifty', 55: 'fifty-five', 60: 'sixty', 70: 'seventy', 80: 'eighty',
  90: 'ninety', 99: 'ninety-nine', 100: 'one hundred',
  // 1.NBT.A.1: the names past one hundred are the names you already have with
  // 'one hundred' in front. US school convention: NO 'and' ("one hundred one",
  // never "one hundred AND one").
  101: 'one hundred one', 109: 'one hundred nine', 110: 'one hundred ten',
  111: 'one hundred eleven', 115: 'one hundred fifteen', 119: 'one hundred nineteen',
  120: 'one hundred twenty',
};
for (const v of [101, 105, 110, 115, 120]) {
  check(!/\band\b/.test(wordFor(v)), `no "and" in "${wordFor(v)}" (US school convention)`);
}
for (const [v, w] of Object.entries(expect)) check(wordFor(Number(v)) === w, `word for ${v} is "${w}" (got "${wordFor(Number(v))}")`);
check(!wordFor(40).includes('u'), 'forty has no u');
check(!wordFor(90).includes('nint'), 'ninety spelled right');

/* uniqueness: 100 numbers, 100 different names */
{
  const seen = new Set();
  for (let v = 1; v <= 120; v++) seen.add(wordFor(v));
  check(seen.size === 120, 'every number 1–120 has its own name');
}
/* the hyphen rule: compounds 21–99 with a loose part get exactly one hyphen.
   It must SURVIVE the extension: 101–120 are 'one hundred' + a word 1–20, none
   of which is a compound, so they carry no hyphen at all. */
for (let v = 1; v <= 120; v++) {
  const hyphens = (wordFor(v).match(/-/g) || []).length;
  const wants = v > 20 && v < 100 && v % 10 !== 0 ? 1 : 0;
  check(hyphens === wants, `hyphens in ${wordFor(v)}`);
}

/* ---------------------------------------------------------------------------
   3. THE CHART GEOMETRY — cell ↔ number is a bijection; the rollover set is
   exactly the row-enders.
   ------------------------------------------------------------------------- */
{
  const seen = new Set();
  for (let v = 1; v <= 120; v++) {
    const r = rowOf(v);
    const c = colOf(v);
    check(r >= 1 && r <= 12 && c >= 1 && c <= 10, `cell of ${v} on the chart`);
    check((r - 1) * 10 + c === v, `cell ↔ number bijection at ${v}`);
    seen.add(r * 100 + c);
  }
  check(seen.size === 120, 'no two numbers share a cell');
}
for (let v = 0; v <= 120; v++) check(isRowEnd(v) === (v > 0 && v % 10 === 0), `row-end ⟺ multiple of ten at ${v}`);

/* ---------------------------------------------------------------------------
   4. THE TWO SPEEDS — +1 and +10 stay on the chart (disabled, never clamped),
   and counting by tens from zero says exactly the decades.
   ------------------------------------------------------------------------- */
for (const rows of [1, 3, 10, 12]) {
  const cap = stepCap(rows);
  check(cap === rows * 10, `cap of ${rows} rows`);
  for (let v = 0; v <= 100; v++) {
    check(canStepOne(v, cap) === v + 1 <= cap, `+1 gate at ${v}/${cap}`);
    check(canLeapTen(v, cap) === v + 10 <= cap, `+10 gate at ${v}/${cap}`);
  }
}
{
  /* simulate the by-tens count of step 4: from 0, press +10 while allowed */
  const said = [];
  let v = 0;
  while (canLeapTen(v, 100)) {
    v += 10;
    said.push(v);
  }
  check(said.join(',') === '10,20,30,40,50,60,70,80,90,100', 'by tens says exactly the decades');
  check(said.length === 10, 'ten says to one hundred');
  /* and the step-5 copy's arithmetic claim: ten says instead of one hundred */
  check(100 / 10 === 10 && /ten says instead of one hundred/i.test(STEPS[4].choices[0]), 'copy number matches arithmetic');
}

/* THE SAID-SET — the lit path records what was actually said, which is the
   two-speeds thesis drawn.  By ones: solid.  By tens: one cell per row. */
{
  check(saidUpTo(0).size === 0, 'nothing said at the start');
  check(saidUpTo(27).size === 27 && saidUpTo(27).has(1) && saidUpTo(27).has(27) && !saidUpTo(27).has(28), 'riding says every number up to the count');
  let s = new Set();
  let v = 0;
  for (let i = 0; i < 10; i++) {
    s = afterLeap(s, v);
    v += 10;
  }
  check(s.size === 10, 'ten leaps say exactly ten numbers');
  for (const x of s) check(x % 10 === 0, `a leap only says a row-ender (said ${x})`);
  check(!s.has(1) && !s.has(55) && s.has(100), 'the passed-over numbers stay unsaid');
  /* by ones the same journey says all one hundred */
  let s1 = new Set();
  let v1 = 0;
  for (let i = 0; i < 100; i++) {
    s1 = afterOne(s1, v1);
    v1 += 1;
  }
  check(s1.size === 100, 'one hundred steps say one hundred numbers');
  /* the capstone's efficient road: leaps then steps, said-count = leaps+steps */
  for (let t = 21; t <= 99; t++) {
    if (t % 10 === 0) continue;
    let ss = new Set();
    let vv = 0;
    while (vv + 10 <= Math.floor(t / 10) * 10) {
      ss = afterLeap(ss, vv);
      vv += 10;
    }
    while (vv < t) {
      ss = afterOne(ss, vv);
      vv += 1;
    }
    check(vv === t, `the road lands on ${t}`);
    check(ss.size === Math.floor(t / 10) + (t % 10), `says on the road to ${t} = leaps + steps`);
    check(ss.has(t), 'the landing is said');
  }
}

/* ---------------------------------------------------------------------------
   5. LESSON STRUCTURE — 7 steps, one calibration (last), chart grows, demos
   pin the scenes the copy depends on, exactly ONE dial (K-tier restraint).
   The 1.NBT.A.1 extension added a step and TWO ROWS — and NOT a dial, NOT a
   mode, NOT a second representation. That is the whole point: this is a
   KINDERGARTEN lab, and the standing rule is that K-tier labs must stay
   simple. The extension is told with machinery the lab already owns (the chart
   grows, 1 -> 3 -> 10 -> 12), so it costs no new elements. The one-dial check
   below is what keeps that honest.
   ------------------------------------------------------------------------- */
check(STEPS.length === 7, 'seven steps (six, plus 1.NBT.A.1 past one hundred)');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  check([1, 3, 10, 12].includes(s.rows), `step ${i} rows sane`);
  check(Array.isArray(s.buttons) && s.buttons.length >= 1 && s.buttons.length <= 2, `step ${i} buttons ≤ 2`);
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
check(STEPS[0].rows === 1 && STEPS[1].rows === 3 && STEPS[2].rows === 10, 'the chart grows with the lesson');
/* K.CC.A.1 MUST SURVIVE: the Kindergarten steps still stop at one hundred. The
   child's first five steps are unchanged by the grade-1 extension; only the
   last two reach past 100. If this ever fails, the extension has leaked
   backwards into the K lesson. */
for (let i = 0; i <= 4; i++) check(STEPS[i].rows <= 10, `K step ${i} still stops at one hundred`);
check(STEPS[5].rows === 12 && /hundred/i.test(STEPS[5].title), 'the 1.NBT.A.1 step is where the chart grows past 100');
check(STEPS[6].rows === 12, 'the capstone reaches the whole 120 chart');
check(DIALS.length === 1, 'K-tier: exactly one dial');
check(DIALS[0].unlock === 2, 'the dial unlocks with the full chart');
check(DIALS[0].min === 0 && DIALS[0].max === 120, 'dial spans the count, now to 120');
/* THE ANCHOR MUST BE DECLARED. The picture inventory reads the header's CCSS
   line; a standard the header never names is invisible to the collision map and
   goes on reading as an open gap. An extension that nobody can see is an
   extension that gets built again as a sibling. */
check(/1\.NBT\.A\.1/.test(src), 'the header declares 1.NBT.A.1, so the picture inventory can see it');
check(/K\.CC\.A\.1/.test(src), 'and still declares its K.CC.A.1 anchor');

/* the rollover scene: step 2 opens at 27, three presses from the trap; and
   its question's wrong answers are the real errors */
check(STEPS[1].demo === 27, 'rollover step opens just below the trap');
check(/twenty-nine/i.test(STEPS[1].body), 'rollover copy names the moment');
check(/thirty/i.test(STEPS[1].choices[STEPS[1].answer]), 'rollover answer is thirty');
check(STEPS[1].choices.some((c) => /twenty-ten/i.test(c)), 'the twenty-ten error is a choice');
check(wordFor(30) === 'thirty' && wordFor(29) === 'twenty-nine', 'the model backs the card');

/* the by-tens step opens at zero with only the leap button */
check(STEPS[3].demo === 0, 'by-tens starts from zero');
check(STEPS[3].buttons.join(',') === 'ten', 'by-tens offers only the leap');
check(/fifty/i.test(STEPS[3].choices[STEPS[3].answer]) && wordFor(50) === 'fifty', 'after forty comes fifty');

/* ---------------------------------------------------------------------------
   6. CALIBRATION — the stamp is the integer identity n === target; the meter
   reads 100 nowhere else; the generator emits a target that needs both moves.
   ------------------------------------------------------------------------- */
for (let t = 21; t <= 99; t++) {
  if (t % 10 === 0) continue;
  for (let v = 0; v <= 100; v++) {
    check(isCalibrated(v, t) === (v === t), `stamp ⟺ equality at n=${v}, t=${t}`);
    const p = closeness(v, t);
    check(p >= 0 && p <= 100, 'meter in range');
    check((p === 100) === (v === t), `meter 100 ⟺ landed at n=${v}, t=${t}`);
  }
  /* monotone approach: one step closer never reads worse */
  for (let v = 0; v < t; v++) check(closeness(v + 1, t) >= closeness(v, t), `meter monotone below t=${t}`);
  /* the efficient road lands exactly: leaps then steps */
  check(Math.floor(t / 10) * 10 + (t % 10) === t, `leaps+steps reach ${t} exactly`);
}
for (let i = 0; i < 3000; i++) {
  const t = makeTarget(null);
  check(Number.isInteger(t) && t >= 21 && t <= 119, 'target on the chart, past the second row');
  check(t % 10 !== 0, 'target needs single steps (never a bare row-ender)');
  check(Math.floor(t / 10) >= 2, 'target needs at least two leaps');
}
for (let i = 0; i < 200; i++) check(makeTarget(37) !== 37, 'a new target is genuinely new');

/* ---------------------------------------------------------------------------
   7. REFUSALS & RESTRAINT — grep the CODE (below the header comment).  The
   header may ARGUE the refusals; the code may not contain them.
   ------------------------------------------------------------------------- */
const forbid = [
  [/sieve|prime|composite|str(i|u)ck|eliminat/i, 'no sieve (PrimeNumbersLab)'],
  [/\bforever\b/i, 'no "forever" (MultiplesLab owns the infinite run)'],
  [/\bhops?\b|skip.?count/i, 'no hops / skip-count line (MultiplesLab)'],
  [/number.?line/i, 'no number line (AddLab/MultiplesLab)'],
  [/bundl|\brods?\b/i, 'no bundling, no rods (TwoDigitNumberLab)'],
  [/ten.?frame/i, 'no ten-frame (CountingLab/TeenNumbersLab)'],
  [/\bdigits?\b|place.?value|tens place|ones place/i, 'never names numeral parts (NumberLab/TwoDigitNumberLab)'],
  [/cardinal|how many/i, 'no cardinality claims (CountingLab)'],
  [/percent|fraction|hundredth/i, 'cells are numbers, not parts of a whole (Decimal/Percentage/MoneyLab)'],
  [/requestAnimationFrame/, 'no rAF (K-tier restraint: nothing animates)'],
  [/backwards|revers|crossing/i, 'no teen-name anatomy (TeenNumbersLab)'],
  [/speechSynthesis/, 'no speech engine — the word is always on screen'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);

/* K-tier restraint: the toolbar holds at most three buttons (+1, +10, Start
   over), and the word is said in exactly ONE place (the say band) */
{
  const tb = code.slice(code.indexOf('className="toolbar"'), code.indexOf('</div>', code.indexOf('className="toolbar"')));
  const buttons = tb.split('<button').length - 1;
  check(buttons <= 3, `toolbar holds at most three buttons (found ${buttons})`);
}
{
  /* wordFor(S.n) may be DRAWN only once — the say band.  Other wordFor calls
     serve the target card / aria line, never a second picture of the count. */
  const draws = (code.match(/fillText\(wordFor/g) || []).length;
  check(draws === 1, `the count's word is drawn exactly once (found ${draws})`);
}
/* the capstone hides the scrub dial — counting is the only road to the cell */
check(/\{!calib &&\s*\n?\s*DIALS\.map/.test(code) || /!calib &&[\s\S]{0,40}DIALS\.map/.test(code), 'the dial is hidden in the capstone');
/* moves are gated, not clamped: the buttons disable at the edge */
check(/disabled=\{!canStepOne\(n, cap\)\}/.test(code), '+1 disables at the edge');
check(/disabled=\{!canLeapTen\(n, cap\)\}/.test(code), '+10 disables at the edge');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-hundredchart: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
