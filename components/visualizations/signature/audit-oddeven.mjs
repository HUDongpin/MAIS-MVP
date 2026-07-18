/* ============================================================================
   audit-oddeven.mjs — numeric + structural proof for OddEvenLab.jsx
   (2.OA.C.3 · odd or even by pairing; an even number as a + a).

   Pattern (per ShapesLab / TeenNumbersLab / the two K labs):
     • SLICE the pure model out of the shipped .jsx and EVAL it.
     • Prove every stated fact by exhaustive integer sweep.
     • Enforce the REFUSALS (no division vocabulary, no sieve, no array, no
       number line, no bond-fan) by grepping the code below the header.
     • Prove the CALIBRATED stamp cannot fire falsely.

   Run:  node audit-oddeven.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./OddEvenLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function OddEvenLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, TEAL, GOLD, DIALS, START_N, CALIB_STEP, clampInt, isEven, pairsOf,
            lonerOf, teamOf, equationFor, pairsLayout, teamsLayout, scatterLayout, makeN,
            pickRight, teamRight, calibChecks, closeness, isCalibrated, STEPS };`
)();
const {
  DIALS, START_N, CALIB_STEP, clampInt, isEven, pairsOf, lonerOf, teamOf, equationFor,
  pairsLayout, teamsLayout, scatterLayout, makeN, pickRight, teamRight, calibChecks,
  closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. PARITY — the definition, the conservation law, and THE FLIP.
   ------------------------------------------------------------------------- */
for (let n = 0; n <= 1000; n++) {
  check(isEven(n) === (n % 2 === 0), `parity at ${n}`);
  check(2 * pairsOf(n) + lonerOf(n) === n, `pairs conserve the count at ${n}`);
  check(lonerOf(n) === 0 || lonerOf(n) === 1, `never a second loner at ${n}`);
  check(isEven(n + 1) === !isEven(n), `one more always flips at ${n}`);
}

/* the standard's equation: N = a + a for even, N = a + a + 1 for odd — and
   the string evaluates to a true statement */
for (let n = 1; n <= 20; n++) {
  const eq = equationFor(n);
  const h = teamOf(n);
  check(eq === (isEven(n) ? `${n} = ${h} + ${h}` : `${n} = ${h} + ${h} + 1`), `equation text at ${n}`);
  const [lhs, rhs] = eq.split(' = ');
  const rhsVal = rhs.split(' + ').reduce((a, b) => a + Number(b), 0);
  check(Number(lhs) === rhsVal, `the equation is TRUE at ${n} (${eq})`);
}

/* ---------------------------------------------------------------------------
   3. THE LAYOUTS — pairs expose exactly the loner; teams are fair iff even;
   the scatter is deterministic and hides the pairing.
   ------------------------------------------------------------------------- */
for (let n = 1; n <= 20; n++) {
  const pp = pairsLayout(n);
  check(pp.length === n, `pairs layout holds everyone at ${n}`);
  check(pp.filter((p) => p.role === 'loner').length === lonerOf(n), `exactly the loner stands out at ${n}`);
  // every non-loner has a partner in its own column
  const cols = {};
  for (const p of pp) if (p.role !== 'loner') cols[p.x] = (cols[p.x] || 0) + 1;
  for (const [x, c] of Object.entries(cols)) check(c === 2, `column ${x} is a true pair at ${n}`);

  const tt = teamsLayout(n);
  check(tt.length === n, `teams layout holds everyone at ${n}`);
  const teamA = tt.filter((p) => p.role === 'a').length;
  const teamB = tt.filter((p) => p.role === 'b').length;
  check(teamA === teamB, `the two teams are equal at ${n} (the loner joins neither)`);
  check(teamA === teamOf(n), `team size is ⌊n/2⌋ at ${n}`);

  const s1 = scatterLayout(n);
  const s2 = scatterLayout(n);
  check(s1.length === n, `scatter holds everyone at ${n}`);
  check(JSON.stringify(s1) === JSON.stringify(s2), `scatter is deterministic at ${n}`);
  // no two scatter points overlap
  for (let i = 0; i < s1.length; i++)
    for (let j = i + 1; j < s1.length; j++) {
      const d2 = (s1[i].x - s1[j].x) ** 2 + (s1[i].y - s1[j].y) ** 2;
      check(d2 > 0.15, `scatter points ${i},${j} do not overlap at ${n}`);
    }
  // the scatter never accidentally draws the pairing: no vertical partner pairs
  let columnish = 0;
  for (let i = 0; i < s1.length; i++)
    for (let j = i + 1; j < s1.length; j++) {
      if (Math.abs(s1[i].x - s1[j].x) < 0.05 && Math.abs(Math.abs(s1[i].y - s1[j].y) - 1) < 0.05) columnish++;
    }
  check(columnish === 0, `scatter does not leak the pairing at ${n}`);
}

/* ---------------------------------------------------------------------------
   4. LESSON STRUCTURE — 6 steps, one calibration (last), demos pin scenes,
   ONE lesson dial (K-tier restraint), the flip step has the button.
   ------------------------------------------------------------------------- */
check(STEPS.length === 6, 'six steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  check(['pairs', 'teams', 'scatter'].includes(s.lens), `step ${i} lens declared`);
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
  check(Number.isInteger(s.demo) && s.demo >= 1 && s.demo <= 20, `step ${i} demo pinned`);
});
check(DIALS.length === 1, 'K-tier: exactly one lesson dial');
check(DIALS[0].min === 1 && DIALS[0].max === 20, 'dial range is the standard’s (up to 20)');
check(STEPS[0].demo === START_N, 'step 1 opens on the start count');
/* the demos match their copy: step 1 even, step 2 odd, step 3 odd (flip),
   step 4 even (teams), step 5 even (ride the flip from 16) */
check(isEven(STEPS[0].demo), 'step-1 demo is even');
check(!isEven(STEPS[1].demo), 'step-2 demo is odd (the loner)');
check(!isEven(STEPS[2].demo) && !!STEPS[2].plusOne, 'step-3 demo is odd and offers one-more');
check(isEven(STEPS[3].demo) && STEPS[3].lens === 'teams', 'step-4 demo is even, teams lens');
check(STEPS[5].lens === 'scatter', 'the capstone hides the pairing');

/* ---------------------------------------------------------------------------
   5. CALIBRATION — the stamp needs the verdict AND the equation, and cannot
   fire falsely.  Exhaustive: every N × both taps + no tap × every dial a.
   ------------------------------------------------------------------------- */
for (let N = 5; N <= 20; N++) {
  const parityWord = isEven(N) ? 'even' : 'odd';
  for (const pick of [null, 'odd', 'even']) {
    for (let a = 0; a <= 10; a++) {
      const stamped = isCalibrated(pick, a, N);
      const should = pick === parityWord && 2 * a + lonerOf(N) === N;
      check(stamped === should, `stamp gate at N=${N}, pick=${pick}, a=${a}`);
      const p = closeness(pick, a, N);
      check((p === 100) === stamped, `meter 100 ⟺ stamp at N=${N}, pick=${pick}, a=${a}`);
      check([0, 50, 100].includes(p), `meter quantized at N=${N}`);
    }
  }
  // exactly one dial value completes a correct verdict
  const winners = [];
  for (let a = 0; a <= 10; a++) if (teamRight(a, N)) winners.push(a);
  check(winners.length === 1 && winners[0] === teamOf(N), `unique team size at N=${N}`);
}
for (let i = 0; i < 3000; i++) {
  const N = makeN(null);
  check(Number.isInteger(N) && N >= 5 && N <= 20, 'crowd in range');
}
{
  const seen = new Set();
  for (let i = 0; i < 500; i++) seen.add(isEven(makeN(null)));
  check(seen.has(true) && seen.has(false), 'both parities occur');
  for (let i = 0; i < 200; i++) check(makeN(9) !== 9, 'a new crowd is genuinely new');
}
check(clampInt(25, 1, 20) === 20 && clampInt(-2, 1, 20) === 1, 'dial clamps');

/* ---------------------------------------------------------------------------
   6. REFUSALS & RESTRAINT — grep the CODE (below the header comment).
   ------------------------------------------------------------------------- */
const forbid = [
  [/divid|quotient|remainder/i, 'no division vocabulary (DivisionLab)'],
  [/sieve|prime|composite|multiple/i, 'no sieve, no multiples (PrimeNumbersLab/MultiplesLab)'],
  [/\barrays?\b|unit square|area\b/i, 'no array/area model (MultiplicationLab/AreaLab)'],
  [/number.?line|\bhops?\b|skip.?count/i, 'no number line (AddLab/MultiplesLab/HundredChartLab)'],
  [/(?<!pair-)\bbonds?\b|\bfan\b|\bthe cut\b/i, 'no bond-fan, no cut (NumberBondLab; the gold pair-bond is this lab’s own)'],
  [/ten.?frame/i, 'no ten-frame (CountingLab)'],
  [/\bdigits?\b|place.?value/i, 'no numeral anatomy (NumberLab)'],
  [/requestAnimationFrame/, 'no rAF (K-tier: nothing animates)'],
  [/Math\.random\(\)[\s\S]{0,80}(pairsLayout|teamsLayout|scatterLayout)/, 'no randomness in layout'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);

/* the pair-bond is allowed by name; the NumberBond sense is not.  Verify the
   only "bond" in the code is the gold pair-bond comment/draw. */
{
  const bonds = code.match(/bonds?/gi) || [];
  const pairBonds = code.match(/pair-bonds?/gi) || [];
  check(bonds.length === pairBonds.length, 'every "bond" is a pair-bond');
}

/* K-tier restraint: toolbar ≤ 2 buttons; the equation is drawn exactly once */
{
  const tb = code.slice(code.indexOf('className="toolbar"'), code.indexOf('</div>', code.indexOf('className="toolbar"')));
  const buttons = tb.split('<button').length - 1;
  check(buttons <= 2, `toolbar holds at most two buttons (found ${buttons})`);
}
check((code.match(/equationFor\(/g) || []).length === 2, 'equation computed in one place (def + one call)');
/* the capstone's scatter must not show the verdict band prematurely */
check(/verdictShown: !calib/.test(code), 'the lesson shows the verdict; the capstone withholds it');
check(/checks\[0\] \? 'pairs' : 'scatter'/.test(code), 'pairs appear only after a correct call');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-oddeven: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
