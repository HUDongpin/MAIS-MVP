/* ============================================================================
   audit-expectedvalue.mjs — numeric proof for ExpectedValueLab.jsx
   (S-MD.A.1–4 · the split of the pot; fair is an equation).

   Run:  node audit-expectedvalue.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./ExpectedValueLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function ExpectedValueLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);
const cssAt = code.indexOf('<style jsx>');
const codeSansCss = cssAt > 0 ? code.slice(0, cssAt) : code;

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, CALIB_STEP, gcdOf, GAMES, potOf, nOf, evOf,
            evText, leakOf, PRICE, jackpotEv, CASES, POT_CHIPS, EV_CHIPS,
            labelOf, potTruth, evTruth, makeCase, calibChecks, closeness,
            isCalibrated, STEPS };`
)();
const {
  CALIB_STEP, GAMES, potOf, nOf, evOf, evText, leakOf, PRICE, jackpotEv, CASES,
  POT_CHIPS, EV_CHIPS, labelOf, potTruth, evTruth, makeCase, calibChecks,
  closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE SPLIT'S LAWS — pot, regroup identity, leak, fairness.
   ------------------------------------------------------------------------- */
for (const key of Object.keys(GAMES)) {
  const rows = GAMES[key].rows;
  /* brute pot and count */
  let bPot = 0;
  let bN = 0;
  for (const r of rows) {
    bPot += r.v * r.k;
    bN += r.k;
  }
  check(potOf(key) === bPot && nOf(key) === bN, `${key}: pot and count match brute sums`);
  check(bN === 10, `${key}: every posted game holds ten tickets`);
  /* every posted EV is an integer */
  const [en, ed] = evOf(key);
  check(ed === 1, `${key}: the split lands on an integer`);
  check(en * bN === bPot * 1, `${key}: EV · n = pot, exactly`);
  /* THE REGROUP IDENTITY: Σ v·(k/n) as exact fractions, term by term */
  let accN = 0;
  let accD = 1;
  for (const r of rows) {
    /* acc += v·k/n  → accN/accD + (v·k)/n */
    accN = accN * bN + r.v * r.k * accD;
    accD = accD * bN;
    const g = ((a, b) => {
      a = Math.abs(a);
      b = Math.abs(b);
      while (b) {
        const t = a % b;
        a = b;
        b = t;
      }
      return a || 1;
    })(accN, accD);
    accN /= g;
    accD /= g;
  }
  check(accN === en && accD === ed, `${key}: the regroup Σ v·(k/n) equals the split`);
  /* the plain-average foil differs whenever counts are unequal */
  const distinctVals = rows.map((r) => r.v);
  if (rows.length > 1 && new Set(rows.map((r) => r.k)).size > 1) {
    const plainSum = distinctVals.reduce((t, v) => t + v, 0);
    check(plainSum * bN !== bPot * rows.length || plainSum / rows.length === en, `${key}: the menu-average is not the split`);
  }
  /* leak against the house price */
  check(leakOf(key, PRICE) === PRICE - en, `${key}: the leak is a plain subtraction`);
}
/* the specific stories */
check(potOf('raffle') === 80 && evText('raffle') === '8' && leakOf('raffle', 10) === 2, 'the headline raffle leaks 2');
check(50 * 1 + 10 * 3 + 0 * 6 === 80, 'and its pot, by hand');
check(potOf('even') === 100 && leakOf('even', 10) === 0, 'the even split is fair, exactly');
check(potOf('jackpot') === 90 && leakOf('jackpot', 10) === 1, 'the lone jackpot leaks 1 under a 90 headline');
check(evText('jackpot') === evText('steady'), 'jackpot and steady split identically — EV is risk-blind');
check(potOf('spread2') === 100 && evText('spread2') === '10', 'the two-tier raffle is fair');
check(potOf('spread3') === 90 && evText('spread3') === '9', 'the four-and-six raffle');
/* the dial law and the fair point */
check(jackpotEv(50) === 5 && jackpotEv(90) === 9 && jackpotEv(100) === 10 && jackpotEv(110) === 11, 'EV = J/10 along the dial');
check(jackpotEv(100) === PRICE, 'the game turns fair at J = 100, exactly');
{
  let threw = false;
  try {
    jackpotEv(95);
  } catch {
    threw = true;
  }
  check(threw, 'off-grid jackpots refuse');
}
/* the plain-average nonsense quoted in step 2's note */
check((50 + 10 + 0) / 3 === 20 && 20 !== 8, 'averaging the menu gives 20, not the split 8');

/* ---------------------------------------------------------------------------
   3. QUOTED FACTS.
   ------------------------------------------------------------------------- */
check(/50 \+ 30 \+ 0 = 80/.test(STEPS[0].body), 'step 1 adds the pot');
check(/80 ÷ 10 = 8/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 splits it');
check(/50·\(1\/10\) \+ 10·\(3\/10\) \+ 0·\(6\/10\)/.test(STEPS[1].body), 'step 2 regroups');
check(5 + 3 + 0 === 8, 'and the regrouped terms sum');
check(/gives 20/.test(STEPS[1].note), 'the menu-average foil is quoted');
check(/−10 to \+40/.test(STEPS[2].feedback), 'step 3 posts the swing range');
check(0 - 10 === -10 && 50 - 10 === 40, 'and the swings are right');
check(/10 = 10/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 states the fairness equation');
check(/J = 100/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 solves for fair');
check(/50 leaks 5, 70 ' \+\s*'leaks 3, 90 leaks 1, 110 gushes 1/.test(STEPS[4].note) || /50 leaks 5/.test(STEPS[4].note), 'the leak ladder is quoted');
check(/chance bench/.test(STEPS[2].note), 'the convergence kinship is cited once');
check(/spread benches|spread benches’/.test(STEPS[3].note), 'risk is ceded to the spread benches');

/* ---------------------------------------------------------------------------
   4. LESSON STRUCTURE.
   ------------------------------------------------------------------------- */
check(STEPS.length === 6, 'six steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  check(!!GAMES[s.game], `step ${i} game exists`);
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
check(STEPS[0].game === 'raffle' && STEPS[3].game === 'even' && STEPS[4].game === 'jackpot' && !!STEPS[4].dial, 'the game ladder; the dial tunes the jackpot');
check(!STEPS[0].showPrice && STEPS[2].showPrice, 'the price enters at step 3');
/* answer keys */
check(/^80 ÷ 10 = 8/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key');
check(/^Nothing but the reading/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key');
check(/^The average leak per play/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key');
check(/^Yes — EV equals price/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key');
check(/^J = 100/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key');
check(/a ticket might win the top prize/.test(STEPS[0].choices.join('|')), 'the headline belief is offered');
check(/lose exactly 2 every single game/.test(STEPS[2].choices.join('|')), 'the per-game literalism is offered');

/* ---------------------------------------------------------------------------
   5. CALIBRATION.
   ------------------------------------------------------------------------- */
check(CASES.length >= 6, 'several posted strips');
const potsPosted = new Set(CASES.map((_, i) => potTruth(i)));
const evsPosted = new Set(CASES.map((_, i) => evTruth(i)));
check(POT_CHIPS.every((p) => potsPosted.has(p)), 'every pot chip is some case’s truth');
check(EV_CHIPS.every((e) => evsPosted.has(e)), 'every split chip is some case’s truth');
/* the risk-blindness pair: identical rulings from different strips */
check(
  CASES.some((_, i) => CASES.some((_, j) => i !== j && potTruth(i) === potTruth(j) && evTruth(i) === evTruth(j) && labelOf(i) !== labelOf(j))),
  'two different strips share both rulings — EV’s blindness made a case'
);
for (let i = 0; i < CASES.length; i++) {
  const pT = potTruth(i);
  const eT = evTruth(i);
  check(POT_CHIPS.includes(pT) && EV_CHIPS.includes(eT), `case ${i}: truths are chips`);
  check(Number(pT) === Number(eT) * 10, `case ${i}: split · 10 = pot`);
  for (const pp of [null, ...POT_CHIPS, 'bogus']) {
    for (const ep of [null, ...EV_CHIPS]) {
      const should = pp === pT && ep === eT;
      check(isCalibrated(i, pp, ep) === should, `gate: case ${i} p=${pp} e=${ep}`);
      check([0, 50, 100].includes(closeness(i, pp, ep)), 'meter quantized');
    }
  }
  const wrongP = POT_CHIPS.find((x) => x !== pT);
  check(closeness(i, wrongP, eT) === 0, `case ${i}: the split without the pot earns nothing`);
  check(labelOf(i) === GAMES[CASES[i]].label, `case ${i}: label posts the strip`);
}
check(calibChecks(null, '80', '8').every((x) => x === false), 'no case, no credit');
for (let i = 0; i < 200; i++) {
  const k = makeCase(null);
  check(Number.isInteger(k) && k >= 0 && k < CASES.length, 'cases from the space');
}
for (let i = 0; i < 100; i++) check(makeCase(2) !== 2, 'a new case is genuinely new');

/* ---------------------------------------------------------------------------
   6. REFUSALS & RESTRAINT — grep the CODE (styled-jsx stripped).
   ------------------------------------------------------------------------- */
const forbid = [
  [/long.run|converge|settl(es|ing) chart|simulat|\btrials?\b/i, 'no convergence (ProbabilityLab; the kinship is one citation)'],
  [/spinner|\bdice\b|\bdie\b/i, 'no chance art — tickets only'],
  [/shuffle bill|shrinking slots|\bfactorial/i, 'no counting machinery (ArrangementsLab)'],
  [/\bcrops?\b|in frame/i, 'no re-framing (ConditionalLab)'],
  [/mean-cross|sign tally/i, 'no correlation machinery (CorrelationLab)'],
  [/variance|deviation|\bMAD\b/i, 'risk is ceded, not measured (the spread benches)'],
  [/census machinery|constraint kit/i, 'no kit machinery'],
  [/\btags?\b|\bcoins?\b/i, 'no sibling currency'],
  [/odometer|brigade|\bslats?\b|\btrap\b/i, 'no slats or traps (IntegralLab)'],
  [/\bwalkers?\b|foothold/i, 'no walkers (LimitLab)'],
  [/mason|\bleftover\b|\bmarch/i, 'no sibling machinery'],
  [/Math\.(sqrt|pow|cbrt|log|exp|sin|acos)/, 'no float math'],
  [/\*\*/, 'no exponent operator'],
  [/requestAnimationFrame/, 'nothing animates'],
];
for (const [re, why] of forbid) check(!re.test(codeSansCss), `REFUSAL violated: ${why}`);

/* verdicts must be DERIVED, never stored */
check(/const potOf = \(key\) => GAMES\[key\]\.rows\.reduce/.test(code), 'the pot is summed live');
check(/const evOf = \(key\) => \{/.test(code), 'the split is divided live');
{
  const blockStart = code.indexOf('const GAMES = {');
  const blockEnd = code.indexOf('};', blockStart);
  const block = code.slice(blockStart, blockEnd);
  check(!/\bpot:|\bev:|truth|answer|split:/i.test(block), 'no game ships its own split (jackpot is a NAME)');
}
/* the drawing reads the model */
check(/S\.rows\.map\(\(r\) => `\$\{r\.v\}·\$\{r\.k\}`\)/.test(code), 'the pot terms print from the rows');
check(/S\.pot/.test(code) && /S\.evStr/.test(code), 'the split line reads the model');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-expectedvalue: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
