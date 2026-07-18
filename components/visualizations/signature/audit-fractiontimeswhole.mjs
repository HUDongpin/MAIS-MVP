/* ============================================================================
   audit-fractiontimeswhole.mjs — numeric + structural proof for
   FractionTimesWholeLab.jsx (4.NF.B.4 · n × a/b as repeated addition of the
   unit fraction — "plates pour into the tray").

   Pattern (per HundredChartLab / FractionAdditionLab):
     • SLICE the pure model out of the shipped .jsx and EVAL it.
     • Prove every stated fact by exhaustive integer sweep — the product
       count, the tray's packing, the rename foil's EXACT no-growth, and the
       stamp gate n·a === target.
     • Enforce the lab's REFUSALS (no array, no number line, no batch tape,
       no join-shelf, no simplification) by grepping the code below the
       header.

   Run:  node audit-fractiontimeswhole.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./FractionTimesWholeLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function FractionTimesWholeLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
/* the accessibility media query is house style, not lab language */
const code = src.slice(headerEnd).replace(/prefers-reduced-motion: reduce/g, 'prefers-rm');

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, GOLD, SLATE, DIALS, CALIB_STEP, clampInt, wordFor, pieceWord, countWords,
            prodCount, toMixed, mixedWords, sameAmount, foilNum, foilDen,
            canPress, canRemove, pressMove, removeMove, makeTarget, closeness, isCalibrated, STEPS };`
)();
const {
  DIALS, CALIB_STEP, clampInt, wordFor, pieceWord, countWords,
  prodCount, toMixed, mixedWords, sameAmount, foilNum, foilDen,
  canPress, canRemove, pressMove, removeMove, makeTarget, closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. WORDS — counts to 48 and piece names, exact.
   ------------------------------------------------------------------------- */
check(wordFor(6) === 'six' && wordFor(15) === 'fifteen' && wordFor(21) === 'twenty-one', 'number words');
check(wordFor(40) === 'forty' && !wordFor(40).includes('u'), 'forty has no u');
check(wordFor(48) === 'forty-eight', 'the biggest pour has a name');
{
  const seen = new Set();
  for (let v = 0; v <= 48; v++) seen.add(wordFor(v));
  check(seen.size === 49, 'words 0–48 all distinct');
}
check(countWords(6, 5) === 'six fifths', 'six fifths');
check(countWords(1, 8) === 'one eighth', 'singular piece');
check(pieceWord(2, true) === 'halves', 'halves');

/* ---------------------------------------------------------------------------
   3. THE PRODUCT IS A COUNT — n plates of a pieces are n·a pieces.
   ------------------------------------------------------------------------- */
for (let n = 1; n <= 6; n++)
  for (let a = 1; a <= 8; a++) check(prodCount(n, a) === n * a, `product at ${n}×${a}`);
/* pressing: gates at the rails, moves by exactly one plate */
for (let n = 1; n <= 6; n++) {
  check(canPress(n) === (n < 6), `press gate at ${n}`);
  check(canRemove(n) === (n > 1), `remove gate at ${n}`);
  if (canPress(n)) check(pressMove(n) === n + 1, `press adds one plate at ${n}`);
  if (canRemove(n)) check(removeMove(n) === n - 1, `remove takes one plate at ${n}`);
}

/* ---------------------------------------------------------------------------
   4. THE TRAY PACKS WHOLES — ⌊t/b⌋ bricks and t mod b loose, exactly.
   ------------------------------------------------------------------------- */
for (let b = 2; b <= 8; b++)
  for (let t = 0; t <= 48; t++) {
    const { w, r } = toMixed(t, b);
    check(w * b + r === t && r >= 0 && r < b, `packing identity at ${t}/${b}`);
    const words = mixedWords(t, b);
    if (t < b) check(words === null, `no bricks below one whole (${t}/${b})`);
    else if (t % b === 0) check(/exactly$/.test(words), `whole-exact reading at ${t}/${b}`);
    else check(words.includes('and'), `bricks-and-loose reading at ${t}/${b}`);
  }
check(mixedWords(15, 8) === 'one whole and seven eighths', '15/8 reads right');
check(mixedWords(15, 4) === 'three wholes and three fourths', '15/4 reads right');
check(toMixed(12, 8).w === 1 && toMixed(12, 8).r === 4, 'the step-5 scene packs 1 brick + 4 loose');

/* ---------------------------------------------------------------------------
   5. THE RENAME FOIL — (n·a)/(n·b) is EXACTLY a/b: more pieces, smaller
   pieces, zero growth.  Checked by cross products and by drawn length.
   ------------------------------------------------------------------------- */
check(sameAmount(2, 5, 6, 15) === true, '6/15 is exactly 2/5');
check(sameAmount(2, 5, 3, 5) === false, 'sameAmount is not always-true');
check(sameAmount(1, 2, 2, 3) === false, 'sameAmount rejects near-misses');
for (let n = 1; n <= 6; n++)
  for (let a = 1; a <= 8; a++)
    for (let b = 2; b <= 8; b++) {
      check(foilNum(n, a) === n * a && foilDen(n, b) === n * b, `foil name at ${n},${a},${b}`);
      check(sameAmount(foilNum(n, a), foilDen(n, b), a, b), `foil is a rename at ${n},${a},${b}`);
      check(foilNum(n, a) / foilDen(n, b) === a / b, `foil length lands on one plate at ${n},${a},${b}`);
      /* and the TRUE product is n times the plate, in exact cross products */
      check(prodCount(n, a) * b === n * (a * b), `true product scales by n at ${n},${a},${b}`);
    }

/* ---------------------------------------------------------------------------
   6. LESSON STRUCTURE — 7 steps, one calibration (last), demos pin scenes,
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
  check(s.demo && s.demo.n >= 1 && s.demo.n <= 6 && s.demo.b >= 2 && s.demo.b <= 8 && s.demo.a >= 1 && s.demo.a <= s.demo.b, `step ${i} demo in range`);
});
check(STEPS[0].demo.n === 1, 'the lab opens on ONE plate');
check(prodCount(3, 2) === 6 && /6\/5/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2: 3×2/5 = 6/5');
check(STEPS[1].choices.some((c) => /6\/15/.test(c)), 'step 2 offers the rename error');
check(STEPS[1].buttons && STEPS[1].buttons.includes('press') && STEPS[1].buttons.includes('remove'), 'step 2 offers the press');
check(STEPS[2].lens && STEPS[2].lens.unit === true, 'step 3 shows the unit-piece reading');
check(/6 × 1\/5/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3: same pieces as 6 × 1/5');
check(STEPS[3].lens && STEPS[3].lens.foil === true, 'step 4 shows the foil strip');
check(/2\/5/.test(STEPS[3].choices[STEPS[3].answer]) && /not a new amount|rename/i.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 answer names the rename');
check(toMixed(15, 4).w === 3 && toMixed(15, 4).r === 3 && /3 bricks/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5: 15/4 packs 3 bricks');
check(STEPS[4].demo.n === 4 && STEPS[4].demo.a === 3 && STEPS[4].demo.b === 8, 'step 5 scene is 4 × 3/8');
check(prodCount(5, 3) === 15 && toMixed(15, 8).w === 1 && toMixed(15, 8).r === 7, 'step 6 arithmetic: 5 × 3/8 = 15/8');
check(/15\/8/.test(STEPS[5].choices[STEPS[5].answer]) && /7\/8/.test(STEPS[5].choices[STEPS[5].answer]), 'step 6 answer names both forms');
check(STEPS[5].choices.some((c) => /15\/40/.test(c)), 'step 6 offers the rename trap in context');

/* dials: three, with the documented ranges and unlock order */
check(DIALS.length === 3, 'three dials');
check(DIALS.find((d) => d.key === 'copies').min === 1 && DIALS.find((d) => d.key === 'copies').max === 6, 'copies dial 1–6');
check(DIALS.find((d) => d.key === 'size').min === 2 && DIALS.find((d) => d.key === 'size').max === 8, 'piece-size dial 2–8');
check(DIALS.find((d) => d.key === 'count').unlock === 0 && DIALS.find((d) => d.key === 'copies').unlock === 1, 'copies unlock second');

/* ---------------------------------------------------------------------------
   7. CALIBRATION — the stamp is the integer identity n·a === target.t; the
   meter reads 100 nowhere else; every order needs at least two plates and
   admits at least one recipe.
   ------------------------------------------------------------------------- */
for (let d = 3; d <= 8; d++)
  for (let t = d + 1; t <= 3 * d; t++) {
    for (let n = 1; n <= 6; n++)
      for (let a = 1; a <= d; a++) {
        const p = prodCount(n, a);
        check(isCalibrated(p, t) === (p === t), `stamp ⟺ equality at ${n}×${a} vs ${t}`);
        const m = closeness(p, t, d);
        check(m >= 0 && m <= 100, 'meter in range');
        check((m === 100) === (p === t), `meter 100 ⟺ landed at ${n}×${a} vs ${t}/${d}`);
      }
    for (let p = 0; p < t; p++) check(closeness(p + 1, t, d) >= closeness(p, t, d), `meter monotone below t=${t}`);
    for (let p = 3 * d + 12; p > t; p--) check(closeness(p - 1, t, d) >= closeness(p, t, d), `meter monotone above t=${t}`);
  }
for (let i = 0; i < 3000; i++) {
  const t = makeTarget(null);
  check(Number.isInteger(t.t) && Number.isInteger(t.d), 'order is integer');
  check(t.d >= 3 && t.d <= 8, 'order denominator 3–8');
  check(t.t >= t.d + 1 && t.t <= 3 * t.d, 'order past one whole, at most three');
  /* a single plate can never fill it (a ≤ d < t), so copies ≥ 2 are forced */
  check(t.t > t.d, 'no single plate fills the order');
  let recipes = 0;
  for (let n = 2; n <= 6; n++) for (let a = 1; a <= t.d; a++) if (n * a === t.t) recipes++;
  check(recipes >= 1, `order ${t.t}/${t.d} has a recipe`);
}
for (let i = 0; i < 200; i++) {
  const t = makeTarget({ t: 12, d: 5 });
  check(!(t.t === 12 && t.d === 5), 'a new order is genuinely new');
}

/* ---------------------------------------------------------------------------
   8. REFUSALS & RESTRAINT — grep the CODE (below the header comment).
   ------------------------------------------------------------------------- */
const forbid = [
  [/\bseam\b|\bshelf\b/i, 'no join-shelf, no seam (FractionAdditionLab owns joining)'],
  [/\barrays?\b|unit.?squares?/i, 'no array of unit squares (MultiplicationLab)'],
  [/\bbatch/i, 'no batch tape (RatioLab)'],
  [/number.?line|\bhops?\b|skip.?count/i, 'no number line, no jumps (MultiplesLab)'],
  [/\bpie\b|sector/i, 'no pie (FractionLab owns the pie echo)'],
  [/split (dial|slider)|re-?cut/i, 'no split dial (FractionLab owns equivalence)'],
  [/simplif|\bgcd\b|lowest terms|\breduces?\b/i, 'never simplifies (EquivalentFractionsLab)'],
  [/\btowers?\b/i, 'no cube towers (MeanLab)'],
  [/balance|\bpans?\b/i, 'no balance scale (EquationLab)'],
  [/requestAnimationFrame/, 'nothing animates — the pour is a still picture'],
  [/speechSynthesis/, 'no speech engine — the words are always on screen'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);

/* structural: the piece-size dial is pinned (hidden) in the capstone */
check(/calib && d\.key === 'size'/.test(code), 'the piece-size dial is hidden in the capstone');
/* pieces per plate can never exceed the piece size */
check(/d\.key === 'count' \? b : d\.max/.test(code), 'plate count dial is capped at b');
/* the press is gated by the model, not clamped */
check(/disabled=\{!canPress\(n\)\}/.test(code), 'press disables at six plates');
check(/disabled=\{!canRemove\(n\)\}/.test(code), 'remove disables at one plate');
/* the tray and the foil draw from the same model the audit just proved */
check(/toMixed\(total, S\.b\)/.test(code), 'the tray packs via toMixed');
check(/const fpw = bw \/ fd/.test(code), 'foil pieces are 1/(n·b) of the brick');
check(/S\.calib && S\.target/.test(code), 'the order outline is a capstone-only device');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-fractiontimeswhole: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
