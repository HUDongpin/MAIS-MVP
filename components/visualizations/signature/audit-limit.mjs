/* ============================================================================
   audit-limit.mjs — numeric + structural proof for LimitLab.jsx
   (AP on-ramp · limits as the walkers' shared destination; continuity).

   Pattern (per the sibling audits): slice-and-eval the shipped model, prove
   every stated fact — exact walker heights, the shrinking-gap law, every
   preset's verdict and failure reason, the stamp — grep-enforce the
   refusals.

   Run:  node audit-limit.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./LimitLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function LimitLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, A, WALK_MAX, CALIB_STEP, PRESETS, presetIds, gcdInt, frac,
            fracText, fracEq, heightAt, destOf, limitOf, continuityOf, makeCase, LIMIT_CHIPS,
            REASON_CHIPS, limitTruthChip, calibChecks, closeness, isCalibrated, STEPS };`
)();
const {
  A, WALK_MAX, CALIB_STEP, PRESETS, presetIds, frac, fracText, fracEq, heightAt, destOf,
  limitOf, continuityOf, makeCase, LIMIT_CHIPS, REASON_CHIPS, limitTruthChip, calibChecks,
  closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE WALKERS — exact heights and the shrinking-gap law.
   ------------------------------------------------------------------------- */
check(A === 2, 'every story happens at x = 2');
for (const id of presetIds) {
  const P = PRESETS[id];
  for (let k = 1; k <= WALK_MAX; k++) {
    const q = 10 ** k;
    for (const side of ['L', 'R']) {
      const piece = side === 'L' ? P.left : P.right;
      const h = heightAt(piece, side, q);
      /* first principles: f = m·x + b at x = A ∓ 1/q, cleared of denominators */
      const p = side === 'L' ? A * q - 1 : A * q + 1;
      const num = piece[0] * p + piece[1] * q;
      check(h.n * q === (num / gcd(num, q)) * (q / gcd(num, q)) * 0 + h.n * q && h.n / h.d === num / q, `${id} ${side} k=${k}: exact height`);
      /* the gap to the one-sided destination is |slope|/q exactly */
      const dest = destOf(piece);
      const gapNum = Math.abs(h.n * dest.d - dest.n * h.d); /* |h − dest| numerator over h.d·dest.d */
      check(gapNum * q === Math.abs(piece[0]) * h.d * dest.d, `${id} ${side} k=${k}: gap = |slope|/q exactly`);
    }
  }
}
function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}
/* the quoted heights of the smooth road: 2.9 → 2 wait — f = x+1 so at 1.9 → 2.9 */
check(fracText(heightAt(PRESETS.smooth.left, 'L', 10)) === '29/10', 'smooth L row 1: 29/10');
check(fracText(heightAt(PRESETS.smooth.right, 'R', 100)) === '301/100', 'smooth R row 2: 301/100');
check(fracText(heightAt(PRESETS.jump.left, 'L', 10)) === '1', 'jump L: the low shelf');
check(fracText(heightAt(PRESETS.jump.right, 'R', 10)) === '4', 'jump R: the high shelf');

/* ---------------------------------------------------------------------------
   3. THE VERDICTS — every preset derived, with its failure reason.
   ------------------------------------------------------------------------- */
const EXPECT = {
  smooth: { limit: '3', cont: true, reason: 'all-agree' },
  holed: { limit: '3', cont: false, reason: 'no-value' },
  defiant: { limit: '3', cont: false, reason: 'value-elsewhere' },
  jump: { limit: 'no limit', cont: false, reason: 'walkers-disagree' },
};
for (const id of presetIds) {
  const P = PRESETS[id];
  const want = EXPECT[id];
  check(limitTruthChip(P) === want.limit, `${id}: the limit is ${want.limit}`);
  const c = continuityOf(P);
  check(c.cont === want.cont && c.reason === want.reason, `${id}: continuity verdict + reason`);
}
/* the defiant dot is the star: limit 3 while f(2) = 5 */
check(fracText(PRESETS.defiant.atValue) === '5' && limitTruthChip(PRESETS.defiant) === '3', 'the defiant dot: value 5, limit 3');
/* the four presets fail in four DIFFERENT ways (one pass, three distinct failures) */
check(new Set(presetIds.map((id) => continuityOf(PRESETS[id]).reason)).size === 4, 'four distinct verdicts');
/* the reason chips cover exactly the reason space */
check(
  REASON_CHIPS.map((r) => r.id).sort().join(',') ===
    ['all-agree', 'no-value', 'value-elsewhere', 'walkers-disagree'].sort().join(','),
  'the reason chips are the reason space'
);
check(LIMIT_CHIPS.includes('3') && LIMIT_CHIPS.includes('no limit'), 'the limit chips cover the truths');
for (const id of presetIds) check(LIMIT_CHIPS.includes(limitTruthChip(PRESETS[id])), `${id}: its truth is on a chip`);

/* ---------------------------------------------------------------------------
   4. LESSON STRUCTURE — scenes pinned; answer keys tied to the model.
   ------------------------------------------------------------------------- */
check(STEPS.length === 6, 'six steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  check(!!PRESETS[s.preset], `step ${i} preset exists`);
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
check(
  STEPS[0].preset === 'smooth' && STEPS[1].preset === 'holed' && STEPS[2].preset === 'defiant' && STEPS[3].preset === 'jump',
  'the preset ladder: smooth, holed, defiant, jump'
);
/* answer keys derived from the model */
check(/^The approach —/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key: about the approach');
check(/^Nothing — both walkers still head to 3/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key: the plank is irrelevant');
check(/^3 — the limit consults the approach/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key: the dot has no vote');
check(/^There is no limit/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key: disagreement ends it');
check(/^Only the smooth road/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key: one pass, three failures');
/* the value-wins belief is offered and refuted */
check(/5 — the function’s value wins/.test(STEPS[2].choices.join('|')), 'the value-wins belief is offered');
/* the RationalFunctionLab hand-off is honored */
check(/rational-function bench/.test(STEPS[1].feedback), 'the hole’s bench is cited');

/* ---------------------------------------------------------------------------
   5. CALIBRATION — the limit ruling AND the reasoned continuity ruling.
   ------------------------------------------------------------------------- */
for (const id of presetIds) {
  const truthLimit = limitTruthChip(PRESETS[id]);
  const truthReason = continuityOf(PRESETS[id]).reason;
  for (const lp of [null, ...LIMIT_CHIPS]) {
    for (const rp of [null, ...REASON_CHIPS.map((r) => r.id)]) {
      const should = lp === truthLimit && rp === truthReason;
      check(isCalibrated(id, lp, rp) === should, `gate: ${id} limit=${lp} reason=${rp}`);
      check([0, 50, 100].includes(closeness(id, lp, rp)), 'meter quantized');
    }
  }
  /* the right reason under a wrong limit ruling earns nothing */
  const wrongLimit = LIMIT_CHIPS.find((c) => c !== truthLimit);
  check(closeness(id, wrongLimit, truthReason) === 0, `${id}: reason without the limit earns nothing`);
}
check(calibChecks(null, '3', 'all-agree').every((x) => x === false), 'no case, no credit');
for (let i = 0; i < 200; i++) check(presetIds.includes(makeCase(null)), 'cases from the presets');
for (let i = 0; i < 100; i++) check(makeCase('jump') !== 'jump', 'a new case is genuinely new');

/* ---------------------------------------------------------------------------
   6. REFUSALS & RESTRAINT — grep the CODE (below the header comment).
   ------------------------------------------------------------------------- */
const forbid = [
  [/\bsecant\b|\btangent\b|slope of the curve|differentiat/i, 'no differentiation machinery (DerivativeLab; citing its bench by name is allowed)'],
  [/\bintegral\b|accumulat|Riemann/i, 'no integration (roadmap H31)'],
  [/epsilon|ε|δ|delta-epsilon/i, 'no ε–δ formalism — the walkers carry the idea'],
  [/cancel|synthetic division|numerator/i, 'no cancellation algebra (RationalFunctionLab)'],
  [/°|radian/i, 'nothing angular'],
  [/requestAnimationFrame/, 'nothing animates — the walk is a dial'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);

/* verdicts must be DERIVED, never stored */
{
  const blockStart = code.indexOf('const PRESETS = {');
  const blockEnd = code.indexOf('};', blockStart);
  const block = code.slice(blockStart, blockEnd);
  check(!/limit:/.test(block) && !/cont:/.test(block) && !/reason:/.test(block), 'no preset ships its own verdicts');
}
check(/const limitOf = \(P\) => \{/.test(code), 'the limit is derived from the pieces');
check(/const continuityOf = \(P\) => \{/.test(code), 'continuity is the three-clause derivation');
check(/const heightAt = \(piece, side, q\) => \{/.test(code), 'walker heights are exact fractions');
/* the drawing reads the model */
check(/limitOf\(S\.P\)/.test(code), 'the destination line is the model’s limit');
check(/heightAt\(S\.P\.left, 'L', qq\)|heightAt\(S\.P\.left, 'L', q\)/.test(code), 'the table rows are the model’s heights');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-limit: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
