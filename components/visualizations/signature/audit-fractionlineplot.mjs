/* ============================================================================
   audit-fractionlineplot.mjs — numeric + structural proof for
   FractionLinePlotLab.jsx (4.MD.B.4, 5.MD.B.2 · line plots in eighths).

   Pattern (per the sibling audits): slice-and-eval the shipped model, prove
   every stated fact exhaustively, grep-enforce the refusals, prove the stamp.

   Run:  node audit-fractionlineplot.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./FractionLinePlotLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function FractionLinePlotLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, GOLD, SLATE, V_MIN, V_MAX, CALIB_STEP, LESSON_DECK, clampInt, valueOf,
            deckValues, rungOf, fmtCard, ladderName, stacksOf, spanOf, nameFor, makeDeck,
            spanChoices, spanOrder, calibChecks, isCalibrated, closeness, STEPS };`
)();
const {
  V_MIN, V_MAX, CALIB_STEP, LESSON_DECK, clampInt, valueOf, deckValues, rungOf, fmtCard,
  ladderName, stacksOf, spanOf, nameFor, makeDeck, spanChoices, spanOrder, calibChecks,
  isCalibrated, closeness, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE EIGHTHS MODEL — every name converts exactly; the ladder is exact.
   ------------------------------------------------------------------------- */
let valOK = true;
for (let w = 2; w <= 3; w++) {
  for (const d of [2, 4, 8]) {
    for (let n = 0; n < d; n++) {
      const v = valueOf({ w, n, d });
      if (!Number.isInteger(v) || v !== 8 * w + (n * 8) / d) valOK = false;
    }
  }
}
check(valOK, 'value = 8w + n·(8/d), an exact integer for every legal name');

check(JSON.stringify(deckValues(LESSON_DECK)) === '[19,20,20,22,25]', 'the lesson deck: 19, 20, 20, 22, 25 eighths');
check(
  valueOf(LESSON_DECK[1]) === valueOf(LESSON_DECK[2]) &&
    (LESSON_DECK[1].n !== LESSON_DECK[2].n || LESSON_DECK[1].d !== LESSON_DECK[2].d),
  'the two 20s wear different names (2 1/2 and 2 4/8)'
);
check(fmtCard(LESSON_DECK[0]) === '2 3/8' && fmtCard(LESSON_DECK[1]) === '2 1/2' && fmtCard(LESSON_DECK[2]) === '2 4/8', 'the card faces read as the copy says');
check(fmtCard({ w: 3, n: 0, d: 8 }) === '3', 'a whole card reads bare');
check(spanOf(deckValues(LESSON_DECK)) === 6, 'the lesson span is exactly 6 eighths (3 1/8 − 2 3/8)');
check(valueOf(LESSON_DECK[1]) + valueOf(LESSON_DECK[2]) === 40 && 40 === 5 * 8, 'the two halves sum to exactly 5 (the step-4 copy)');
check(JSON.stringify(stacksOf([19, 20, 20, 22, 25])) === JSON.stringify({ 19: 1, 20: 2, 22: 1, 25: 1 }), 'the stack at 20 counts two');
{
  /* the step-3 flip error really is a different number */
  const flip = 8 * 1 + 2; // "1 2/8" in eighths
  check(flip !== 6, 'the flipped written answer (1 2/8 = 10 eighths) is provably not the span');
}

/* the ladder: rung by residue, over the whole scale */
for (let v = V_MIN; v <= V_MAX; v++) {
  const want = v % 8 === 0 ? 'whole' : v % 4 === 0 ? 'half' : v % 2 === 0 ? 'quarter' : 'eighth';
  check(rungOf(v) === want, `tick ${v} sits on the ${want} rung`);
}
check([16, 24, 32].every((v) => rungOf(v) === 'whole'), 'wholes at 2, 3, 4 exactly');

/* ladder names are rung-reading: coarser rung, coarser bottom */
check(ladderName(6) === '3/4' && ladderName(4) === '1/2' && ladderName(2) === '1/4', 'even counts of eighths wear coarser names');
check(ladderName(1) === '1/8' && ladderName(5) === '5/8', 'odd counts keep the eighths name');
check(ladderName(8) === '1' && ladderName(12) === '1 1/2' && ladderName(10) === '1 1/4', 'past a whole, the name says so');

/* nameFor: every variant of every tick converts back exactly */
let nameOK = true;
for (let v = V_MIN; v <= V_MAX; v++) {
  for (let variant = 0; variant < 3; variant++) {
    const c = nameFor(v, variant);
    if (valueOf(c) !== v) nameOK = false;
    if (!(c.d === 2 || c.d === 4 || c.d === 8) || c.n < 0 || (c.n !== 0 && c.n >= c.d)) nameOK = false;
  }
  if ([2, 4, 6].includes(v % 8)) {
    const a = nameFor(v, 0);
    const b = nameFor(v, 1);
    if (a.n === b.n && a.d === b.d) nameOK = false; // a multi-name tick must offer two
  }
}
check(nameOK, 'every name a deck can deal lands on its exact tick; multi-name ticks offer two');

/* ---------------------------------------------------------------------------
   3. CALIBRATION — the deck always carries a two-name pair and an honest
   span; the stamp needs every card true AND the span answered.
   ------------------------------------------------------------------------- */
let deckOK = true;
for (let i = 0; i < 3000; i++) {
  const deck = makeDeck(null);
  const vals = deckValues(deck);
  if (deck.length !== 5) deckOK = false;
  if (!vals.every((v) => v >= V_MIN && v <= V_MAX)) deckOK = false;
  if (spanOf(vals) < 3) deckOK = false;
  /* a same-tick pair wearing two different names must exist */
  let pair = false;
  for (let a = 0; a < 5; a++) {
    for (let b = a + 1; b < 5; b++) {
      if (vals[a] === vals[b] && (deck[a].n !== deck[b].n || deck[a].d !== deck[b].d)) pair = true;
    }
  }
  if (!pair) deckOK = false;
  const ch = spanChoices(deck);
  if (new Set(ch).size !== 3 || ch.some((x) => x <= 0)) deckOK = false;
  const o = spanOrder(deck);
  if ([...o].sort().join(',') !== '0,1,2') deckOK = false;
}
check(deckOK, 'every deck: five cards on the scale, a two-name pair, span ≥ 3, honest distinct choices (3000 deals)');
{
  const d = makeDeck(null);
  let fresh = true;
  for (let i = 0; i < 60; i++) {
    if (deckValues(makeDeck(deckValues(d))).join(',') === deckValues(d).join(',')) fresh = false;
  }
  check(fresh, 'a new deck is genuinely new');
}
{
  const deck = LESSON_DECK;
  const truth = deckValues(deck);
  const slotTrue = spanOrder(deck).indexOf(0);
  check(isCalibrated(deck, truth, slotTrue), 'all cards true + the span picked stamps');
  check(closeness(deck, truth, slotTrue) === 100, 'meter 100 on the stamp');
  for (let k = 0; k < truth.length; k++) {
    const marks = truth.slice();
    marks[k] = marks[k] + 1;
    check(!isCalibrated(deck, marks, slotTrue), `card ${k} one tick off refuses`);
    check(closeness(deck, marks, slotTrue) === 50, 'a misplacement holds the meter at 50');
  }
  check(!isCalibrated(deck, truth.slice(0, 4), slotTrue), 'a missing card refuses');
  for (let s = 0; s < 3; s++) {
    if (s === slotTrue) continue;
    check(!isCalibrated(deck, truth, s), 'a wrong span refuses');
  }
  check(closeness(deck, truth, null) === 50, 'placements alone meter 50');
  check(closeness(deck, [], null) === 0, 'nothing placed, nothing metered');
}
check(/disabled=\{spanPick != null\}/.test(code), 'the span answer locks after one pick (no guess-cycling)');
check(clampInt(40, 16, 32) === 32, 'clamp sanity');

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
check(JSON.stringify(STEPS.map((s) => s.show)) === '[1,3,5,5,5,0]', 'the deal grows one idea at a time: 1, 3, 5 cards');
check(STEPS[3].lens === 'span' && STEPS[4].lens === 'pair', 'the walk lens, then the end-to-end lens');
check(STEPS[3].q.includes('3 1/8 − 2 3/8'), 'the subtraction question uses the deck’s own extremes');
check(STEPS[3].choices.some((c) => c.includes('1 2/8')), 'the flipped written subtraction is on the table');
check(STEPS[1].q.includes('2 1/2') && STEPS[1].q.includes('2 4/8'), 'the two-names trap is asked head on');

/* ---------------------------------------------------------------------------
   5. REFUSALS & RESTRAINT — grep the CODE (below the header comment).
   ------------------------------------------------------------------------- */
const forbid = [
  [/\bworms?\b|\btrays?\b|measure the next|\brulers?\b/i, 'no measuring pipeline (LinePlotLab / MeasurementLab)'],
  [/\bdots?\b/i, 'marks are X’s, never dots (DataLab)'],
  [/\bmean\b|median|\bmode\b|\branges?\b|fair.?share|fulcrum|balance/i, 'no center statistics, no fair share, not that word for the span (DataLab)'],
  [/piece shelf|\btiles?\b|foil shelf/i, 'no piece shelf (FractionAdditionLab)'],
  [/re.?cut|common denominator/i, 'nothing is re-cut (UnlikeDenominatorsLab)'],
  [/\bgcd\b|simplif|lowest terms|lattice|reduc(tion|e the)/i, 'ladder names are rung-reading, not simplification (EquivalentFractionsLab)'],
  [/tallest stack|up is how many/i, 'the Grade-2 axis trap is not re-asked (LinePlotLab)'],
  [/requestAnimationFrame/, 'no rAF (nothing animates)'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);

/* the marks are strokes; no circle is drawn anywhere on this canvas */
check((code.match(/ctx\.arc\(/g) || []).length === 0, 'no arcs: X’s and ticks only');
check((code.match(/const xOf = /g) || []).length === 1, 'one scale function places ticks, X’s, and the walk');
check(/ladder/i.test(code), 'the ladder is named on the canvas');
check(/the walk/i.test(code), 'the walk is named on the canvas');
check(/offstage/.test(code), 'the measuring is declared offstage');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-fractionlineplot: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
