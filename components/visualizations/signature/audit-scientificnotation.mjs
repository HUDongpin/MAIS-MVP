/* ============================================================================
   audit-scientificnotation.mjs — numeric + structural proof for
   ScientificNotationLab.jsx (8.EE.A.3–4 · the ladder of rungs).

   Pattern (per the sibling audits): slice-and-eval the shipped model, prove
   every stated fact — every plain form re-parsed by an independent parser,
   the illegal chips shown to EQUAL the truth in value while wearing outlaw
   names, every pair's ratio as a pure rung gap, every quoted number, the
   stamp — and grep-enforce the refusals.

   Run:  node audit-scientificnotation.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./ScientificNotationLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function ScientificNotationLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, WIN_SPAN, WIN_MIN, WIN_MAX, CALIB_STEP, sup, coefText,
            sciText, plainTextOf, OBJECTS, rungGap, ratioText, CASES, makeCase, sciTruth,
            sciChips, RATIO_CHIPS, ratioTruth, calibChecks, closeness, isCalibrated,
            STEPS };`
)();
const {
  WIN_SPAN, WIN_MIN, WIN_MAX, CALIB_STEP, sup, coefText, sciText, plainTextOf, OBJECTS,
  rungGap, ratioText, CASES, makeCase, sciTruth, sciChips, RATIO_CHIPS, ratioTruth,
  calibChecks, closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE AUDIT'S OWN independent parser for plain forms.
   ------------------------------------------------------------------------- */
const parsePlain = (s) => {
  const hasDot = s.includes('.');
  const digitsAll = s.replace('.', '');
  const sig = digitsAll.replace(/^0+/, '').replace(/0+$/, '');
  let n;
  if (!hasDot) {
    n = s.replace(/^0+/, '').length - 1;
  } else {
    const [intPart, fracPart] = s.split('.');
    if (intPart.replace(/^0+/, '').length > 0) {
      n = intPart.replace(/^0+/, '').length - 1;
    } else {
      const lead = fracPart.match(/^0*/)[0].length;
      n = -(lead + 1);
    }
  }
  const a10 = Number((sig + '0').slice(0, 2));
  return { a10, n };
};
const canon = (a10, n) => {
  /* canonical (a10, n) with a10 in 10..99 — for value equality checks */
  while (a10 >= 100) {
    a10 /= 10;
    n += 1;
  }
  while (a10 < 10) {
    a10 *= 10;
    n -= 1;
  }
  return { a10, n };
};

/* every plain form round-trips through the independent parser */
for (let a10 = 10; a10 < 100; a10 += 7) {
  for (let n = -9; n <= 9; n += 3) {
    const p = parsePlain(plainTextOf(a10, n));
    check(p.a10 === a10 && p.n === n, `plain round-trip a10=${a10} n=${n}`);
  }
}
check(plainTextOf(10, -10) === '0.0000000001', 'the atom, written out');
check(plainTextOf(34, 6) === '3400000', '3.4 million, written out');
check(plainTextOf(52, -4) === '0.00052', 'the small case, written out');
check(plainTextOf(90, -7) === '0.0000009', 'the single-digit small case');
check(sciText(10, -10) === '1×10⁻¹⁰', 'the atom’s notation');
check(sciText(34, 6) === '3.4×10⁶', 'the coefficient shows its tenth');
check(sciText(25, 7) === '2.5×10⁷', 'the lawful dress of 25×10⁶');
check(sup(-10) === '⁻¹⁰' && sup(21) === '²¹', 'superscripts by string construction');

/* ---------------------------------------------------------------------------
   3. THE LADDER — coefficients legal; pairs share coefficients; gaps exact.
   ------------------------------------------------------------------------- */
for (const [id, o] of Object.entries(OBJECTS)) {
  check(o.a10 >= 10 && o.a10 <= 99 && Number.isInteger(o.a10), `${id}: legal coefficient`);
  check(Number.isInteger(o.n), `${id}: integer rung`);
}
check(OBJECTS.galaxy.n - OBJECTS.atom.n === 30, 'atom to galaxy: thirty rungs');
check(rungGap('sun', 'earth') === 2, 'Sun vs Earth: two rungs');
check(rungGap('virus', 'atom') === 3, 'virus vs atom: three rungs');
check(rungGap('whale', 'human') === 1 && rungGap('ant', 'sand') === 1, 'the ×10 pairs');
check(rungGap('galaxy', 'lightyear') === 5 && rungGap('lightyear', 'solar') === 3, 'the far pairs');
for (const c of CASES) {
  check(OBJECTS[c.big].a10 === OBJECTS[c.small].a10, `${c.big}/${c.small}: same coefficient — the ratio is pure rungs`);
  check(OBJECTS[c.big].n > OBJECTS[c.small].n, `${c.big}/${c.small}: big really is bigger`);
  check(ratioText(c.big, c.small) === `×10${sup(rungGap(c.big, c.small))}`, `${c.big}/${c.small}: ratio = rung gap`);
}

/* ---------------------------------------------------------------------------
   4. QUOTED FACTS — every number in the lesson copy, recomputed.
   ------------------------------------------------------------------------- */
check(STEPS[0].body.includes(plainTextOf(10, -10)), 'step 1 writes the atom out in full');
check(STEPS[2].body.includes(sciText(OBJECTS.sun.a10, OBJECTS.sun.n)), 'step 3 quotes the Sun');
check(STEPS[2].body.includes(sciText(OBJECTS.earth.a10, OBJECTS.earth.n)), 'step 3 quotes the Earth');
check(10 ** rungGap('sun', 'earth') === 100, 'the Sun is 100 Earths wide');
check(10 ** rungGap('virus', 'atom') === 1000, 'the virus is 1000 atoms wide');
check(/25×10⁶/.test(STEPS[3].body) && /2\.5×10⁷/.test(STEPS[3].body), 'step 4 posts the rename');
check(/thirty rungs/.test(STEPS[1].feedback) && /10³⁰/.test(STEPS[1].feedback), 'step 2 quotes the whole trip');
check(/1×10⁻⁷/.test(STEPS[4].body) && /1×10⁻¹⁰/.test(STEPS[4].body), 'step 5 posts the tiny pair');

/* ---------------------------------------------------------------------------
   5. LESSON STRUCTURE — scenes pinned; answer keys tied to the model.
   ------------------------------------------------------------------------- */
check(STEPS.length === 6, 'six steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  check(Number.isInteger(s.win) && s.win >= WIN_MIN && s.win <= WIN_MAX, `step ${i} window valid`);
  check(Array.isArray(s.focus) && s.focus.every((id) => !!OBJECTS[id]), `step ${i} focus objects exist`);
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
check(!!STEPS[1].pan && !!STEPS[2].pan && !STEPS[0].pan, 'the window unlocks at step 2');
check(!!STEPS[3].rename, 'step 4 posts the rename');
/* answer keys derived from the model */
check(/^1×10⁻¹⁰ m — a coefficient of one/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key: the honest name');
check(/^Multiplies it by 10/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key: rungs multiply');
check(/^100 — two rungs apart/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key: climb the gap');
check(/^So every number gets exactly one address/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key: one address');
check(/^The virus — 10⁻⁷ sits three rungs above/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key: less negative is higher');
/* the real beliefs are offered and refuted */
check(/Adds 10/.test(STEPS[1].choices.join('|')), 'the rungs-add belief is offered');
check(/2 — nine minus seven/.test(STEPS[2].choices.join('|')), 'the gap-as-answer belief is offered');
check(/basically zero/.test(STEPS[4].choices.join('|')), 'the all-tiny-is-zero belief is offered');

/* ---------------------------------------------------------------------------
   6. CALIBRATION — both exact rulings; the stamp cannot fire falsely.
   ------------------------------------------------------------------------- */
check(CASES.length >= 6, 'several posted cases');
for (let i = 0; i < CASES.length; i++) {
  const { a10, n } = CASES[i];
  const chips = sciChips(i);
  const sT = sciTruth(i);
  const rT = ratioTruth(i);
  check(chips.length === 4 && new Set(chips).size === 4, `case ${i}: four distinct rename chips`);
  check(chips.includes(sT), `case ${i}: the legal truth is on a chip`);
  check([...chips].sort().join('|') === chips.join('|'), `case ${i}: chips deterministically ordered`);
  check(RATIO_CHIPS.includes(rT), `case ${i}: the ratio truth is a chip`);
  /* value analysis: PARSE every chip string; the outlaw chips EQUAL the
     truth in value while wearing illegal names; the wrong-rung chip is
     exactly one rung off; only the truth is both legal and right */
  const parseSci = (s) => {
    const [coef, rest] = s.split('×10');
    const exp = Number(
      rest.split('').map((ch) => ({ '⁻': '-', '⁰': 0, '¹': 1, '²': 2, '³': 3, '⁴': 4, '⁵': 5, '⁶': 6, '⁷': 7, '⁸': 8, '⁹': 9 }[ch])).join('')
    );
    const p = parsePlain(coef);
    return { pair: canon(p.a10, p.n + exp), legal: /^[1-9](\.\d+)?$/.test(coef) };
  };
  const truthPair = { a10, n };
  const parsed = chips.map((chipS) => ({ chipS, ...parseSci(chipS) }));
  const rightAndLegal = parsed.filter((x) => x.legal && x.pair.a10 === truthPair.a10 && x.pair.n === truthPair.n);
  check(rightAndLegal.length === 1 && rightAndLegal[0].chipS === sT, `case ${i}: exactly one chip is legal AND right — the truth`);
  const outlaws = parsed.filter((x) => !x.legal);
  check(outlaws.length === 2 && outlaws.every((x) => x.pair.a10 === truthPair.a10 && x.pair.n === truthPair.n), `case ${i}: both outlaw chips equal the truth in value`);
  const wrongRung = parsed.find((x) => x.legal && x.chipS !== sT);
  check(wrongRung && wrongRung.pair.n === truthPair.n - 1 && wrongRung.pair.a10 === truthPair.a10, `case ${i}: the legal foil is exactly one rung off`);
  /* the plain posting parses back to the truth */
  const p = parsePlain(plainTextOf(a10, n));
  check(sciText(p.a10, p.n) === sT, `case ${i}: the posting names the truth`);
  for (const sp of [null, ...chips, 'bogus']) {
    for (const rp of [null, ...RATIO_CHIPS]) {
      const should = sp === sT && rp === rT;
      check(isCalibrated(i, sp, rp) === should, `gate: case ${i} sci=${sp} ratio=${rp}`);
      check([0, 50, 100].includes(closeness(i, sp, rp)), 'meter quantized');
    }
  }
  const wrongSci = chips.find((x) => x !== sT);
  check(closeness(i, wrongSci, rT) === 0, `case ${i}: the ratio without the rename earns nothing`);
}
check(calibChecks(null, '1×10⁰', '×10¹').every((x) => x === false), 'no case, no credit');
for (let i = 0; i < 200; i++) {
  const k = makeCase(null);
  check(Number.isInteger(k) && k >= 0 && k < CASES.length, 'cases from the space');
}
for (let i = 0; i < 100; i++) check(makeCase(1) !== 1, 'a new case is genuinely new');

/* ---------------------------------------------------------------------------
   7. REFUSALS & RESTRAINT — grep the CODE (below the header comment).
   ------------------------------------------------------------------------- */
const forbid = [
  [/factor train|\btiles?\b/i, 'no factor train, no tiles (ExponentRulesLab)'],
  [/place[- ]value/i, 'no place-value climbing (PowersOfTenLab)'],
  [/(?<!Math\.)\brounds?\b|\brounding\b|\brounded\b/i, 'nothing is rounded on stage (RoundingLab; Math.round in the meter helper is not copy)'],
  [/product of powers|power rule/i, 'no exponent algebra (ExponentRulesLab)'],
  [/toExponential|toPrecision|toFixed\(\d*[1-9]/, 'no float ever formats a displayed number'],
  [/odometer|brigade|\bslats?\b|\btrap\b/i, 'no slats or traps (IntegralLab)'],
  [/\bwalkers?\b|foothold/i, 'no walkers (LimitLab)'],
  [/mason|packing|leftover/i, 'no rearrangement machinery (PythagorasLab)'],
  [/requestAnimationFrame/, 'nothing animates — the window is a dial'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);

/* verdicts must be DERIVED, never stored */
check(/const rungGap = \(bigId, smallId\) => OBJECTS\[bigId\]\.n - OBJECTS\[smallId\]\.n/.test(code), 'the ratio is a rung subtraction');
check(/const plainTextOf = \(a10, n\) => \{/.test(code), 'the plain form is built, not typed');
{
  const blockStart = code.indexOf('const CASES = [');
  const blockEnd = code.indexOf('];', blockStart);
  const block = code.slice(blockStart, blockEnd);
  check(!/truth|ratio:|×10/.test(block), 'no case ships its own answers');
}
/* the drawing reads the model */
check(/sciText\(o\.a10, o\.n\)/.test(code), 'the pinned labels read the model');
check(/plainTextOf\(c\.a10, c\.n\)|plainTextOf\(CASES\[kase\]\.a10, CASES\[kase\]\.n\)/.test(code), 'the posting reads the model');
check(/sciChips\(kase\)/.test(code), 'the stamp chips come from the model');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-scientificnotation: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
