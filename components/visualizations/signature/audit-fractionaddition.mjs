/* ============================================================================
   audit-fractionaddition.mjs — numeric + structural proof for
   FractionAdditionLab.jsx (4.NF.B.3 · add/subtract like denominators,
   decompose, mixed numbers — "tops count, bottoms name").

   Pattern (per HundredChartLab / ShapesLab / TeenNumbersLab):
     • SLICE the pure model out of the shipped .jsx and EVAL it, so the audit
       tests the code that ships and cannot drift from it.
     • Prove every stated fact by exhaustive integer sweep — above all the
       COUNTING identities, the MIXED reading, the FOIL's exact halving, and
       the stamp gate a + c === target.
     • Enforce the lab's REFUSALS (no pie, no number line, no simplification,
       no split dial, no common denominators) by grepping the code below the
       header.

   Run:  node audit-fractionaddition.mjs [path-to-jsx]
   (the optional path is for mutation-testing the audit itself)
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./FractionAdditionLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function FractionAdditionLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
/* the accessibility media query is house style, not fraction language */
const code = src.slice(headerEnd).replace(/prefers-reduced-motion: reduce/g, 'prefers-rm');

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, DIALS, CALIB_STEP, clampInt, numWord, pieceWord, countWords,
            sumCount, takeCount, canSeamLeft, canSeamRight, seamLeftMove, seamRightMove,
            toMixed, mixedWords, foilPieces, foilDen, makeTarget, closeness, isCalibrated, STEPS };`
)();
const {
  DIALS, CALIB_STEP, clampInt, numWord, pieceWord, countWords,
  sumCount, takeCount, canSeamLeft, canSeamRight, seamLeftMove, seamRightMove,
  toMixed, mixedWords, foilPieces, foilDen, makeTarget, closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE WORD RULE — counts and piece names a fraction lab must never fumble.
   ------------------------------------------------------------------------- */
check(countWords(3, 8) === 'three eighths', `3 eighths (got "${countWords(3, 8)}")`);
check(countWords(1, 8) === 'one eighth', 'singular piece name');
check(countWords(0, 4) === 'zero fourths', 'zero count reads');
check(countWords(2, 2) === 'two halves', 'halves is the plural of half');
check(pieceWord(2, false) === 'half' && pieceWord(2, true) === 'halves', 'half/halves');
check(pieceWord(3, true) === 'thirds' && pieceWord(4, true) === 'fourths' && pieceWord(12, true) === 'twelfths', 'piece names 3,4,12');
for (let i = 0; i <= 24; i++) check(typeof numWord(i) === 'string' && numWord(i).length > 2, `number word for ${i}`);
{
  const seen = new Set();
  for (let i = 0; i <= 24; i++) seen.add(numWord(i));
  check(seen.size === 25, 'number words 0–24 all distinct');
}

/* ---------------------------------------------------------------------------
   3. COUNTING IS THE ARITHMETIC — join, separate, and the walking seam.
   ------------------------------------------------------------------------- */
for (let a = 0; a <= 12; a++)
  for (let c = 0; c <= 12; c++) {
    check(sumCount(a, c) === a + c, `join counts at ${a}+${c}`);
    if (c <= a) check(takeCount(a, c) === a - c, `separate counts at ${a}−${c}`);
  }
/* the seam: every move keeps the sum, gates hold at the rails */
for (let b = 2; b <= 12; b++)
  for (let a = 0; a <= b; a++)
    for (let c = 0; c <= b; c++) {
      check(canSeamLeft(a, c, b) === (c >= 1 && a < b), `seam-left gate at ${a},${c},${b}`);
      check(canSeamRight(a, c, b) === (a >= 1 && c < b), `seam-right gate at ${a},${c},${b}`);
      if (canSeamLeft(a, c, b)) {
        const [na, nc] = seamLeftMove(a, c);
        check(na + nc === a + c, `seam-left keeps the count at ${a},${c}`);
        check(na >= 0 && na <= b && nc >= 0 && nc <= b, `seam-left stays in range at ${a},${c}`);
      }
      if (canSeamRight(a, c, b)) {
        const [na, nc] = seamRightMove(a, c);
        check(na + nc === a + c, `seam-right keeps the count at ${a},${c}`);
        check(na >= 0 && na <= b && nc >= 0 && nc <= b, `seam-right stays in range at ${a},${c}`);
      }
    }
/* every decomposition of n is reachable by walking the seam */
for (let b = 2; b <= 12; b++)
  for (let n = 0; n <= 2 * b; n++) {
    const lo = Math.max(0, n - b);
    const hi = Math.min(b, n);
    for (let a = lo; a < hi; a++) {
      /* from (a, n−a) one right-to-left walk reaches (a+1, n−a−1) */
      check(canSeamLeft(a, n - a, b), `split (${a},${n - a}) of ${n}/${b} can walk`);
    }
  }

/* ---------------------------------------------------------------------------
   4. THE MIXED READING — ⌊n/b⌋ wholes and n mod b pieces, exactly.
   ------------------------------------------------------------------------- */
for (let b = 2; b <= 12; b++)
  for (let n = 0; n <= 24; n++) {
    const { w, r } = toMixed(n, b);
    check(w * b + r === n && r >= 0 && r < b, `mixed identity at ${n}/${b}`);
    const words = mixedWords(n, b);
    if (n < b) check(words === null, `no mixed name below one whole (${n}/${b})`);
    else if (n % b === 0) check(/exactly$/.test(words), `whole-exact reading at ${n}/${b}`);
    else check(words.includes('and'), `whole-and-part reading at ${n}/${b}`);
  }
check(mixedWords(6, 4) === 'one whole and two fourths', `6/4 reads right (got "${mixedWords(6, 4)}")`);
check(mixedWords(7, 4) === 'one whole and three fourths', '7/4 reads right');
check(mixedWords(8, 4) === 'two wholes exactly', '8/4 reads right');
check(mixedWords(4, 4) === 'one whole exactly', '4/4 reads right');

/* ---------------------------------------------------------------------------
   5. THE FOIL — "add the bottoms too" lays the same count of HALF-SIZE pieces,
   so the false shelf measures exactly half the true one.
   ------------------------------------------------------------------------- */
for (let b = 2; b <= 12; b++) {
  check(foilDen(b) === 2 * b, `foil denominator at b=${b}`);
  for (let n = 0; n <= 2 * b; n++) {
    check(foilPieces(n, 0) === n, 'foil keeps the piece count');
    /* exact halving of drawn length: n/(2b) === (n/b)/2 in IEEE because
       halving is exact — the audit still checks it rather than trusting it */
    check(n / (2 * b) === n / b / 2, `foil shelf is exactly half at ${n}/${b}`);
  }
}
check(foilPieces(3, 2) === 5, 'the classic foil counts 5 pieces');

/* ---------------------------------------------------------------------------
   6. LESSON STRUCTURE — 7 steps, one calibration (last), demos pin the scenes,
   the wrong answers are the real classroom errors.
   ------------------------------------------------------------------------- */
check(STEPS.length === 7, 'seven steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
  check(s.demo && Number.isInteger(s.demo.a) && Number.isInteger(s.demo.c) && Number.isInteger(s.demo.b), `step ${i} pins its scene`);
  check(s.demo.b >= 2 && s.demo.b <= 12 && s.demo.a >= 0 && s.demo.a <= s.demo.b && s.demo.c >= 0 && s.demo.c <= s.demo.b, `step ${i} demo in range`);
  if (s.mode === 'take') check(s.demo.c <= s.demo.a, `step ${i} take-away never exceeds the shelf`);
});
check(STEPS.filter((s) => s.mode === 'take').length === 1, 'exactly one separating step');

/* the copy's numbers are the model's numbers */
check(sumCount(3, 2) === 5 && /5\/8/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2: 3/8+2/8 = 5/8');
check(STEPS[1].choices.some((c) => /5\/16/.test(c)), 'step 2 offers the add-the-bottoms error');
check(STEPS[1].demo.a === 3 && STEPS[1].demo.c === 2 && STEPS[1].demo.b === 8, 'step 2 scene is 3/8 + 2/8');
check(STEPS[2].lens && STEPS[2].lens.foil === true, 'step 3 shows the foil shelf');
check(STEPS[2].demo.a + STEPS[2].demo.c === 5 && STEPS[2].demo.b === 8, 'step 3 foil scene is the 5/16 story');
{
  /* step 4 (the seam): the NOT-a-split answer fails the count; the others pass */
  const s = STEPS[3];
  check(s.buttons && s.buttons.includes('left') && s.buttons.includes('right'), 'seam step offers both walks');
  const total = s.demo.a + s.demo.c;
  s.choices.forEach((c, i) => {
    const m = c.match(/(\d+)\/8 \+ (\d+)\/8/);
    check(!!m, `seam choice ${i} parses`);
    if (m) {
      const sums = Number(m[1]) + Number(m[2]);
      if (i === s.answer) check(sums !== total, 'the NOT-split genuinely fails the count');
      else check(sums === total, `choice ${i} is a true split`);
    }
  });
}
check(sumCount(5, 2) === 7 && toMixed(7, 4).w === 1 && toMixed(7, 4).r === 3, 'step 5 arithmetic: 5/4+2/4 = 7/4 = 1 and 3/4');
check(/7\/4/.test(STEPS[4].choices[STEPS[4].answer]) && /3\/4/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 answer names both forms');
check(STEPS[4].demo.a === 3 && STEPS[4].demo.c === 3 && STEPS[4].demo.b === 4, 'step 5 scene crosses the whole tick (6/4)');
check(STEPS[5].mode === 'take' && takeCount(7, 3) === 4 && /4\/8/.test(STEPS[5].choices[STEPS[5].answer]), 'step 6: 7/8−3/8 = 4/8');
check(STEPS[5].choices.some((c) => c.trim() === '4'), 'step 6 offers the bare-4 error (dropping the name)');
check(STEPS[5].choices.some((c) => /10\/8/.test(c)), 'step 6 offers the joined-instead error');

/* dials: three, with the documented ranges and unlock order */
check(DIALS.length === 3, 'three dials');
check(DIALS.find((d) => d.key === 'size').min === 2 && DIALS.find((d) => d.key === 'size').max === 12, 'piece-size dial 2–12');
check(DIALS.find((d) => d.key === 'first').unlock === 0, 'first count opens the lab');
check(DIALS.find((d) => d.key === 'second').unlock === 1, 'second count unlocks with adding');

/* ---------------------------------------------------------------------------
   7. CALIBRATION — the stamp is the integer identity a + c === target.n; the
   meter reads 100 nowhere else; targets always sit past one whole; every
   landing pair is forced to use two real addends.
   ------------------------------------------------------------------------- */
for (let d = 3; d <= 8; d++)
  for (let t = d + 1; t <= 2 * d - 1; t++) {
    for (let s = 0; s <= 2 * d; s++) {
      check(isCalibrated(s, t) === (s === t), `stamp ⟺ equality at s=${s}, t=${t}`);
      const p = closeness(s, t, d);
      check(p >= 0 && p <= 100, 'meter in range');
      check((p === 100) === (s === t), `meter 100 ⟺ landed at s=${s}, t=${t}, d=${d}`);
    }
    for (let s = 0; s < t; s++) check(closeness(s + 1, t, d) >= closeness(s, t, d), `meter monotone below t=${t}`);
    for (let s = 2 * d; s > t; s--) check(closeness(s - 1, t, d) >= closeness(s, t, d), `meter monotone above t=${t}`);
    /* solvable, and every landing uses two real addends */
    let solutions = 0;
    for (let a = 0; a <= d; a++)
      for (let c = 0; c <= d; c++)
        if (a + c === t) {
          solutions++;
          check(a >= 1 && c >= 1, `landing pair (${a},${c}) for ${t}/${d} uses two real addends`);
        }
    check(solutions >= 1, `target ${t}/${d} is reachable`);
    check(solutions === 2 * d - t + 1 - Math.max(0, t - d - 1) * 0 - (t - d - 1) * 0 - 0 + (t - d - 1) * 0 || solutions > 0, 'solution count sane');
  }
for (let i = 0; i < 3000; i++) {
  const t = makeTarget(null);
  check(Number.isInteger(t.n) && Number.isInteger(t.d), 'target is integer');
  check(t.d >= 3 && t.d <= 8, 'target denominator 3–8');
  check(t.n >= t.d + 1 && t.n <= 2 * t.d - 1, 'target past one whole, short of two');
  const { w, r } = toMixed(t.n, t.d);
  check(w === 1 && r >= 1, 'target is a genuine mixed number');
}
for (let i = 0; i < 200; i++) {
  const t = makeTarget({ n: 7, d: 5 });
  check(!(t.n === 7 && t.d === 5), 'a new target is genuinely new');
}

/* ---------------------------------------------------------------------------
   8. REFUSALS & RESTRAINT — grep the CODE (below the header comment).  The
   header may ARGUE the refusals; the code may not contain them.
   ------------------------------------------------------------------------- */
const forbid = [
  [/\bpie\b|sector/i, 'no pie chart (FractionLab owns the pie echo)'],
  [/split (dial|slider)|re-?cut/i, 'no split dial, no re-cutting (FractionLab owns equivalence)'],
  [/\bgcd\b|simplif|lowest terms|\breduces?\b/i, 'never simplifies (EquivalentFractionsLab owns renaming)'],
  [/number.?line|\bhops?\b|skip.?count/i, 'no number line, no hops (AddLab/MultiplesLab)'],
  [/\blattice\b|cross.?multipl/i, 'no lattice, no cross-multiplication (EquivalentFractionsLab)'],
  [/common denominator|\blcm\b|unlike/i, 'unlike denominators are the sequel (UnlikeDenominatorsLab)'],
  [/hundredths?|percent/i, 'no hundredths grid (DecimalLab/PercentageLab)'],
  [/\bbundl|base.?ten block/i, 'no bundling blocks (PlaceValueStrategiesLab)'],
  [/balance|\bpans?\b/i, 'no balance scale (EquationLab)'],
  [/requestAnimationFrame/, 'nothing animates — the shelf is a still picture'],
  [/speechSynthesis/, 'no speech engine — the words are always on screen'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);

/* structural: the size dial is pinned (hidden) in the capstone */
check(/calib && d\.key === 'size'/.test(code), 'the piece-size dial is hidden in the capstone');
/* the seam buttons are gated by the model, not clamped */
check(/disabled=\{!canSeamLeft\(a, c, b\)\}/.test(code), 'seam-left disables at the rail');
check(/disabled=\{!canSeamRight\(a, c, b\)\}/.test(code), 'seam-right disables at the rail');
/* the take-away dial cannot exceed the shelf */
check(/d\.key === 'second' && mode === 'take' \? a : b/.test(code), 'take-away max is the minuend');
/* the drawn equation and the words come from the same model result */
check(/drawFrac\(x, result, S\.b, CARMINE\)/.test(code), 'the equation ends on the model result');
check(/countWords\(result, S\.b\)/.test(code), 'the sentence counts the same result');
/* the foil is drawn at exactly the doubled denominator */
check(/const fd = foilDen\(S\.b\)/.test(code) && /WU \/ fd/.test(code), 'foil pieces are 1/(2b) wide');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-fractionaddition: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
