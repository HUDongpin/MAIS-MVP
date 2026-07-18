/* ============================================================================
   audit-signednumbers.mjs — numeric + structural proof for SignedNumbersLab.jsx
   (7.NS.A.2 · signed multiplication and division; the flip parity).

   Pattern (per the sibling audits): slice-and-eval the shipped model, prove
   every stated fact — the parity law over the WHOLE reachable chain space,
   the distributive certification as arithmetic, honest undo, the stamp —
   grep-enforce the refusals.

   Run:  node audit-signednumbers.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./SignedNumbersLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function SignedNumbersLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, FACTORS, M_CAP, CALIB_STEP, productOf, flipsOf, signOf,
            parityLawHolds, canPress, certification, TARGETS, makeOrder, calibChecks,
            closeness, isCalibrated, STEPS };`
)();
const {
  FACTORS, M_CAP, CALIB_STEP, productOf, flipsOf, signOf, parityLawHolds, canPress,
  certification, TARGETS, makeOrder, calibChecks, closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE PARITY LAW — exhaustive over the whole reachable chain space.
   ------------------------------------------------------------------------- */
check(FACTORS.join(',') === '2,3,-1,-2,-3', 'the factor chips');
check(certification() === true, 'the distributive certification: 0 = (−1)(1+(−1)) = −1 + (−1)(−1)');
check(-1 * -1 === 1, '(−1)(−1) = +1, in the arithmetic itself');

/* walk EVERY chain reachable under the cap (BFS over states) */
let states = [[]];
const seen = new Set(['']);
let walked = 0;
while (states.length > 0) {
  const next = [];
  for (const chain of states) {
    check(parityLawHolds(chain), `parity law at chain [${chain}]`);
    check(Number.isInteger(productOf(chain)) && productOf(chain) !== 0, `integer nonzero product at [${chain}]`);
    check(Math.abs(productOf(chain)) <= M_CAP, `cap respected at [${chain}]`);
    walked++;
    for (const f of FACTORS) {
      if (!canPress(chain, f)) continue;
      const c2 = [...chain, f];
      /* canonical key: the multiset of factors + order does not matter for
         state identity, but chains are ordered — key on the ordered chain,
         bounded by the cap so the walk terminates */
      const key = c2.join(',');
      if (!seen.has(key) && c2.length <= 7) {
        seen.add(key);
        next.push(c2);
      }
    }
  }
  states = next;
}
check(walked > 2000, `the walk genuinely covered the space (${walked} states)`);
/* undo is exact division: popping restores the previous product */
for (let trial = 0; trial < 300; trial++) {
  let chain = [];
  const history = [1];
  for (let i = 0; i < 6; i++) {
    const legal = FACTORS.filter((f) => canPress(chain, f));
    if (Math.random() < 0.3 && chain.length > 0) {
      chain = chain.slice(0, -1);
      history.pop();
      check(productOf(chain) === history[history.length - 1], 'undo restores the exact product');
    } else if (legal.length > 0) {
      const f = legal[Math.floor(Math.random() * legal.length)];
      chain = [...chain, f];
      history.push(productOf(chain));
    }
  }
}
/* the flip-twice fact and the lesson's quoted products */
check(productOf([-1, -1]) === 1 && flipsOf([-1, -1]) === 2, 'flip twice: home');
check(productOf([-2, -3]) === 6, '(−2)(−3) = +6');
check(productOf([-3, -2, 2]) === 12 && flipsOf([-3, -2, 2]) === 2, 'the division scene opens at +12 — wait: ');
check(signOf(productOf([-3, -2, 2])) === 1, 'even flips, positive');

/* ---------------------------------------------------------------------------
   3. LESSON STRUCTURE — scenes pinned; answer keys tied to the model.
   ------------------------------------------------------------------------- */
check(STEPS.length === 7, 'seven steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  check(Array.isArray(s.chain), `step ${i} scene pinned`);
  check(Array.isArray(s.chips) && s.chips.every((f) => FACTORS.includes(f)), `step ${i} chips legal`);
  check(Math.abs(productOf(s.chain)) <= M_CAP, `step ${i} scene under the cap`);
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
check(STEPS[2].chain.join(',') === '-1', 'the flip-twice step opens one flip in');
check(STEPS[4].chain.join(',') === '-3,-2,2', 'the division step opens at +12');
/* answer keys derived from the model */
check(new RegExp(`lands on −6`).test(STEPS[0].choices[STEPS[0].answer].replace(/-/g, '−')) || /−6/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key: −3 doubles to −6');
check(/^On −5/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key: everyone trades at once');
check(/^\+1 — two flips are a round trip/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key: the round trip');
check(STEPS[3].choices[STEPS[3].answer].startsWith(`+${productOf([-2, -3])}`), 'step 4 key: (−2)(−3) from the model');
check(STEPS[4].choices[STEPS[4].answer].startsWith(`+${-12 / -3}`), 'step 5 key: (−12)÷(−3) from arithmetic');
check(/^No — addition never flips/.test(STEPS[5].choices[STEPS[5].answer]), 'step 6 key: the border post');
check((-1) + (-1) === -2, 'the border fact: (−1)+(−1) = −2');
/* the presence-vs-parity misconception is offered and refuted */
check(/there are negatives in it, so it must be negative/.test(STEPS[3].choices.join('|')), 'the presence belief is offered');
check(/only their PARITY/.test(STEPS[3].feedback), '…and refuted');

/* ---------------------------------------------------------------------------
   4. CALIBRATION — land AND declare; the sign forces the parity.
   ------------------------------------------------------------------------- */
for (const t of TARGETS) {
  check(Number.isInteger(t) && t !== 0 && Math.abs(t) <= M_CAP, `target ${t} sane`);
  /* every target reachable: BFS for a chain that lands (the audit proves
     fillability, not just hopes it) */
  let frontier = [[]];
  let found = false;
  const seen2 = new Set(['1']);
  for (let depth = 0; depth < 6 && !found; depth++) {
    const next = [];
    for (const chain of frontier) {
      for (const f of FACTORS) {
        if (!canPress(chain, f)) continue;
        const c2 = [...chain, f];
        const p = productOf(c2);
        if (p === t) {
          found = true;
          /* the parity the stamp demands matches the landing chain's tally */
          check(
            isCalibrated(t, c2, t < 0 ? 'odd' : 'even'),
            `target ${t}: a landing chain + true parity stamps`
          );
          check(!isCalibrated(t, c2, t < 0 ? 'even' : 'odd'), `target ${t}: the wrong parity never stamps`);
          check(closeness(t, c2, null) === 50, `target ${t}: landing alone is half`);
          break;
        }
        if (!seen2.has(String(p))) {
          seen2.add(String(p));
          next.push(c2);
        }
      }
      if (found) break;
    }
    frontier = next;
  }
  check(found, `target ${t} is reachable`);
  /* not landed: nothing counts */
  check(calibChecks(t, [], 'odd').every((c) => c === false) || t === 1, `target ${t}: the empty chain earns nothing`);
}
check(calibChecks(null, [-2], 'odd').every((c) => c === false), 'no order, no credit');
for (let i = 0; i < 200; i++) check(TARGETS.includes(makeOrder(null)), 'orders from the target list');
for (let i = 0; i < 100; i++) check(makeOrder(12) !== 12, 'a new order is genuinely new');

/* ---------------------------------------------------------------------------
   5. REFUSALS & RESTRAINT — grep the CODE (below the header comment).
   ------------------------------------------------------------------------- */
const forbid = [
  [/mirror at zero|dashed mirror|ghost twin|mirror line/i, 'no one-dot mirror device (IntegerLab; naming its bench in a citation is allowed)'],
  [/\bhops?\b|count.on/i, 'no hops (AddLab / roadmap N2)'],
  [/\barray\b|unit squares?|\btiling\b/i, 'no array (MultiplicationLab)'],
  [/sign table|operation table|\bcrease\b/i, 'no table (CommutativeLab) — the tally replaces it'],
  [/\by-axis\b|\bgraph\b|\bfold\b/i, 'no plane, no fold (AbsoluteValueLab)'],
  [/absolute value|\|\s*a\s*\|/i, 'no absolute-value bracket (IntegerLab)'],
  [/requestAnimationFrame/, 'nothing animates — the sheet moves by press'],
  [/°|\bdegrees?\b|radian/i, 'the half-turn is never measured'],
  [/wrapping|wrap(s|ped)? (a |the |around)|unit circle/i, 'no wrapping (UnitCircleLab)'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);

/* the law must be DERIVED, never stored */
check(!/sign:\s*['"+-]/.test(code), 'no chain ships its own sign');
check(/const productOf = \(chain\) => chain\.reduce/.test(code), 'the product is computed from the chain');
check(/const flipsOf = \(chain\) => chain\.filter\(\(f\) => f < 0\)\.length/.test(code), 'the tally counts negative factors');
check(/const parityLawHolds/.test(code), 'the parity law is a checkable identity in the model');
/* addition is never enacted on the sheet */
check(!/setChain\(\(c\) => \[\.\.\.c, .*\+/.test(code), 'no additive press exists');
/* the drawing reads the same model */
check(/S\.flips % 2 === 1/.test(code), 'the sheet’s colour is the model’s parity');
check(/m \* S\.M \* k/.test(code), 'the sheet’s marks are the model’s products');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-signednumbers: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
