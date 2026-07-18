/* ============================================================================
   audit-function.mjs — numeric + structural proof for FunctionLab.jsx
   (8.F.A.1, F-IF.A.1–2 · what a function IS; the one-output promise).

   Pattern (per the sibling audits): slice-and-eval the shipped model, prove
   every verdict by brute force — the staged relations, the curves' counting
   rules, the docket, the transpose twist — grep-enforce the refusals,
   prove the stamp needs verdict AND evidence.

   Run:  node audit-function.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./FunctionLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function FunctionLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, PROBE, CALIB_STEP, isFunction, guiltyInputsOf, domainOf,
            rangeOf, ysAt, RELATIONS, CURVES, DOCKET, makeCase, calibChecks, closeness,
            isCalibrated, STEPS };`
)();
const {
  PROBE, CALIB_STEP, isFunction, guiltyInputsOf, domainOf, rangeOf, ysAt, RELATIONS, CURVES,
  DOCKET, makeCase, calibChecks, closeness, isCalibrated, STEPS,
} = sandbox;

/* first-principles twin of the verdict engine */
const truthOf = (pairs) => {
  const m = new Map();
  for (const [x, y] of pairs) {
    if (!m.has(x)) m.set(x, new Set());
    m.get(x).add(y);
  }
  const guilty = [...m.entries()].filter(([, s]) => s.size > 1).map(([x]) => x).sort((a, b) => a - b);
  return { fn: guilty.length === 0, guilty };
};

/* ---------------------------------------------------------------------------
   2. THE VERDICT ENGINE — brute-forced against first principles, including
   the duplicate-arrow subtlety.
   ------------------------------------------------------------------------- */
const allTables = [
  ...Object.values(RELATIONS).map((r) => r.pairs),
  ...DOCKET.map((c) => c.pairs),
];
for (const pairs of allTables) {
  const t = truthOf(pairs);
  check(isFunction(pairs) === t.fn, `verdict agrees on ${JSON.stringify(pairs)}`);
  check(guiltyInputsOf(pairs).join(',') === t.guilty.join(','), `guilty list agrees on ${JSON.stringify(pairs)}`);
  /* every value an integer in the drawable window */
  for (const [x, y] of pairs) {
    check(Number.isInteger(x) && Number.isInteger(y), 'integer pairs only');
    check(Math.abs(x) <= 5 && Math.abs(y) <= 5, 'pairs inside the graph window');
  }
  /* every guilty input is reachable by the probe */
  for (const g of t.guilty) check(g >= PROBE.min && g <= PROBE.max, `guilty input ${g} probe-reachable`);
}
/* the duplicate arrow is one arrow: same pair twice does not convict */
check(isFunction([[1, 2], [1, 2]]) === true, 'a repeated identical pair is one arrow, not a crime');
check(isFunction([[1, 2], [1, 3]]) === false, 'a genuinely split input convicts');
/* fuzz: random tables, verdicts must always agree with first principles */
for (let trial = 0; trial < 500; trial++) {
  const pairs = [];
  const m = 3 + Math.floor(Math.random() * 5);
  for (let i = 0; i < m; i++) {
    pairs.push([Math.floor(Math.random() * 11) - 5, Math.floor(Math.random() * 11) - 5]);
  }
  const t = truthOf(pairs);
  check(isFunction(pairs) === t.fn, 'fuzz: verdict agrees');
  check(guiltyInputsOf(pairs).join(',') === t.guilty.join(','), 'fuzz: guilty list agrees');
}

/* ---------------------------------------------------------------------------
   3. THE STAGED RELATIONS — each plays its exact pedagogical part.
   ------------------------------------------------------------------------- */
check(isFunction(RELATIONS.clean.pairs), 'clean: a function');
check(!isFunction(RELATIONS.crime.pairs), 'crime: not a function');
check(guiltyInputsOf(RELATIONS.crime.pairs).join(',') === '1', 'crime: input 1 is the (only) guilty one');
/* the squaring rule: a function AND many-to-one */
check(isFunction(RELATIONS.squares.pairs), 'squares: a function');
{
  const byOut = new Map();
  for (const [x, y] of RELATIONS.squares.pairs) {
    if (!byOut.has(y)) byOut.set(y, new Set());
    byOut.get(y).add(x);
  }
  check([...byOut.values()].some((s) => s.size > 1), 'squares: genuinely many-to-one (a shared output)');
  for (const [x, y] of RELATIONS.squares.pairs) check(y === x * x, 'squares: y really is x²');
}
/* the transpose: exactly the squaring rule reversed, and a criminal */
{
  const rev = RELATIONS.squares.pairs.map(([x, y]) => `${y},${x}`).sort();
  const tp = RELATIONS.transpose.pairs.map(([x, y]) => `${x},${y}`).sort();
  check(rev.join('|') === tp.join('|'), 'transpose IS the squaring rule with arrows reversed');
  check(!isFunction(RELATIONS.transpose.pairs), 'transpose: reversing many-to-one manufactures the crime');
  check(guiltyInputsOf(RELATIONS.transpose.pairs).join(',') === '1,4', 'transpose: guilty at 1 and 4');
}
/* domain and range, for the lesson's reading */
check(domainOf(RELATIONS.squares.pairs).join(', ') === '-2, -1, 0, 1, 2', 'squares: domain read off the arrows');
check(rangeOf(RELATIONS.squares.pairs).join(', ') === '0, 1, 4', 'squares: range is the SET of hit outputs');
check(ysAt(RELATIONS.transpose.pairs, 1).length === 2, 'the probe at x=1 finds two outputs on the transpose');
check(ysAt(RELATIONS.transpose.pairs, 3).length === 0, 'the probe at an unused input finds nothing');

/* ---------------------------------------------------------------------------
   4. THE CURVES — exact counting rules, verdicts derived from them.
   ------------------------------------------------------------------------- */
for (const [key, c] of Object.entries(CURVES)) {
  let guilty = [];
  for (let x = PROBE.min; x <= PROBE.max; x++) {
    const n = c.ysCountAt(x);
    check([0, 1, 2].includes(n), `${key}: count at ${x} sane`);
    if (n > 1) guilty.push(x);
  }
  check(guilty.join(',') === c.guilty.join(','), `${key}: guilty list matches the counting rule`);
  check(c.fn === (c.guilty.length === 0), `${key}: verdict flag agrees with the evidence`);
}
check(CURVES.line.fn && CURVES.parabola.fn, 'line and parabola pass');
check(!CURVES.circle.fn && !CURVES.sideways.fn, 'circle and sideways parabola fail');
/* the circle's rule IS x² against 16 */
for (let x = -6; x <= 6; x++) {
  const expect = x * x < 16 ? 2 : x * x === 16 ? 1 : 0;
  check(CURVES.circle.ysCountAt(x) === expect, `circle: exact count at x=${x}`);
}

/* ---------------------------------------------------------------------------
   5. LESSON STRUCTURE — scenes pinned; answer keys tied to the model.
   ------------------------------------------------------------------------- */
check(STEPS.length === 7, 'seven steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  check(!!s.scene, `step ${i} scene pinned`);
  if (s.scene.kind === 'curve') check(!!CURVES[s.scene.rel], `step ${i} curve exists`);
  else check(!!RELATIONS[s.scene.rel], `step ${i} relation exists`);
  if (s.chips) s.chips.forEach((ck) => check(!!CURVES[ck], `step ${i} chip ${ck} exists`));
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
check(STEPS[0].scene.rel === 'clean' && STEPS[1].scene.rel === 'crime', 'promise, then crime');
check(STEPS[2].scene.rel === 'squares' && STEPS[3].scene.rel === 'transpose', 'sharing, then the reversed trap');
check(STEPS[4].chips.join(',') === 'line,parabola,circle,sideways', 'the four test curves');
/* answer keys derived from the model */
check(/exactly one arrow/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key: the definition');
check(/^No — the input 1 fires two arrows/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key: convicted by its guilty input');
check(/^Yes — each input still fires exactly ONE arrow/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key: many-to-one is legal');
check(/^Two dots at each/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key: the probe convicts the transpose');
check(/^Not a function of x/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key: the circle fails');
check(
  STEPS[5].choices[STEPS[5].answer].startsWith(`{${rangeOf(RELATIONS.squares.pairs).join(', ')}}`),
  'step 6 key: the range, from the model'
);
/* the "mostly a function" belief is offered and refuted */
check(/mostly/.test(STEPS[1].choices.join('|')), 'the "mostly" belief is offered');
check(/no "mostly"/.test(STEPS[1].feedback), '…and refuted');

/* ---------------------------------------------------------------------------
   6. CALIBRATION — verdict AND evidence; wrong evidence never stamps.
   ------------------------------------------------------------------------- */
check(DOCKET.length === 6, 'six cases in the docket');
check(DOCKET.filter((c) => isFunction(c.pairs)).length === 3, 'the docket is balanced: three of each');
/* d1 is the many-to-one function — the docket's own trap */
{
  const byOut = new Map();
  for (const [x, y] of DOCKET[0].pairs) {
    if (!byOut.has(y)) byOut.set(y, new Set());
    byOut.get(y).add(x);
  }
  check(isFunction(DOCKET[0].pairs) && [...byOut.values()].some((s) => s.size > 1), 'd1: a many-to-one function');
}
for (const kase of DOCKET) {
  const fn = isFunction(kase.pairs);
  const guilty = guiltyInputsOf(kase.pairs);
  const evidences = [null, 'none', ...domainOf(kase.pairs), 99];
  for (const v of [null, 'function', 'not']) {
    for (const e of evidences) {
      const should = fn
        ? v === 'function' && e === 'none'
        : v === 'not' && e !== null && e !== 'none' && guilty.includes(e);
      check(isCalibrated(kase, v, e) === should, `gate: ${kase.id} v=${v} e=${e}`);
      check([0, 50, 100].includes(closeness(kase, v, e)), 'meter quantized');
    }
  }
  /* right verdict, innocent input named: half credit, no stamp */
  if (!fn) {
    const innocent = domainOf(kase.pairs).find((x) => !guilty.includes(x));
    check(closeness(kase, 'not', innocent) === 50, `${kase.id}: innocent evidence earns only half`);
  }
}
check(calibChecks(null, 'function', 'none').every((c) => c === false), 'no case, no credit');
for (let i = 0; i < 200; i++) {
  const drawn = makeCase(null);
  check(DOCKET.some((c) => c.id === drawn.id), 'cases from the docket');
}
for (let i = 0; i < 100; i++) check(makeCase('d3').id !== 'd3', 'a new case is genuinely new');

/* ---------------------------------------------------------------------------
   7. REFUSALS & RESTRAINT — grep the CODE (below the header comment).
   ------------------------------------------------------------------------- */
const forbid = [
  [/amplitude|vertex form|\bslope\b|midline/i, 'no formula dials (the function-family labs)'],
  [/horizontal.line test|\binverse\b/i, 'no inverses — roadmap H15 stays untouched (LogarithmLab)'],
  [/\by\s*=\s*x\b/, 'no y = x mirror (LogarithmLab)'],
  [/balance|\bscale\b|plank/i, 'no balance device (EquationLab)'],
  [/expression tree/i, 'no expression tree (TranslateLab)'],
  [/\baddress\b|quadrant map/i, 'no address language (PointLab)'],
  [/\(x\s*−\s*h\)|radius triangle/i, 'no circle machinery (CircleLab) — the circle is a witness, not a subject'],
  [/°|\bdegrees?\b|radian/i, 'nothing is measured'],
  [/requestAnimationFrame/, 'nothing animates — the probe is dragged'],
  [/two.way table|contingency/i, 'no contingency table (TableLab)'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);

/* verdicts must be DERIVED, never stored */
check(!/fn:\s*(true|false)[\s\S]{0,40}pairs:/.test(code), 'no pair-relation ships its own verdict');
check(/const isFunction = \(pairs\) => \{/.test(code), 'the verdict is computed from the pairs');
/* the picture and the verdict share one model */
check(/guiltyInputsOf\(p\)/.test(code) || /guiltyInputsOf\(S\.pairs\)/.test(code), 'the drawing colours guilt from the same engine');
check(/ysAt\(S\.pairs, S\.probeX\)\.length/.test(code), 'the probe counts dots through the model');
check(/c\.ysCountAt\(S\.probeX\)|CURVES\[S\.curveKey\]/.test(code), 'the probe counts curve crossings through the model');
/* the CircleLab cross-citation is honored in the copy */
check(/Circle bench itself declares this in/.test(code), 'the circle counterexample cites its own bench');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-function: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
