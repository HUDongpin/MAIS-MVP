/* ============================================================================
   audit-formula.mjs — numeric audit for FormulaLab.jsx
   Run:  node audit-formula.mjs

   Unlike a mirror-audit, this one EXTRACTS AND IMPORTS THE LAB'S REAL MODEL
   SOURCE (everything from the palette down to the JSX), so what is proven here
   is what ships — a re-implementation could be correct while the component is
   not. The model region is pure JS with no React and no JSX.

   The math is then checked against CLOSED-FORM formulas written independently,
   straight from the textbook statement, with no reference to the lab's chain
   table. If the chain table has a typo, these disagree.

   No dependencies.
   ========================================================================== */

import { readFileSync } from 'node:fs';

let fail = 0;
let checks = 0;
const ok = (cond, msg) => {
  checks++;
  if (!cond) {
    fail++;
    if (fail <= 40) console.error('  ✗ ' + msg);
  }
};
const section = (t) => console.log('\n' + t);

/* ---- extract the real model out of the component ------------------------ */
const SRC = readFileSync(new URL('./FormulaLab.jsx', import.meta.url), 'utf8');
const from = SRC.indexOf("const CURVE = '#c81e4f'");
const to = SRC.indexOf('/* Small neutral glyphs');
if (from < 0 || to < 0 || to <= from) {
  console.error('FATAL: could not locate the model region in FormulaLab.jsx');
  process.exit(1);
}
const region = SRC.slice(from, to);
ok(!/<[A-Za-z]/.test(region.replace(/\/\*[\s\S]*?\*\//g, '')), 'model region contains no JSX');
ok(!/\buseState\b|\buseRef\b/.test(region), 'model region contains no React hooks');

const moduleSrc =
  region +
  `\nexport { Q, ZERO, qAdd, qSub, qMul, qDiv, qEq, qCmp, qNum, qFromDecimal, qStr, qFull,
     qIsExactDecimal, FORMULAS, BY_ID, START_FID, START_SUBJECTS, START_VALS, applyOp,
     runForward, runBackward, solveFor, spine, rearranged, opLabel, checkLine, snapToGrid,
     TASKS, taskAnswerQ, calibScore, shownValue, STEPS, MINUS };\n`;
const M = await import('data:text/javascript;base64,' + Buffer.from(moduleSrc).toString('base64'));

const {
  Q, ZERO, qAdd, qSub, qMul, qDiv, qEq, qCmp, qFromDecimal, qStr, qIsExactDecimal,
  FORMULAS, BY_ID, START_FID, START_SUBJECTS, START_VALS, runForward, runBackward, solveFor,
  spine, rearranged, checkLine, snapToGrid, TASKS, taskAnswerQ, calibScore, shownValue,
  STEPS, MINUS,
} = M;

/* ============================================================================
   1. The rational engine itself. Everything downstream trusts it.
   ========================================================================== */
section('1. exact rational arithmetic');
{
  ok(qEq(Q(2, 4), Q(1, 2)), 'Q reduces 2/4 -> 1/2');
  ok(qEq(Q(-2, -4), Q(1, 2)), 'Q normalises a double negative');
  ok(Q(1, -2).d === 2 && Q(1, -2).n === -2 / 2, 'Q keeps the denominator positive');
  ok(qEq(Q(0, 5), ZERO) && Q(0, 5).d === 1, 'Q(0,5) reduces to 0/1');
  ok(qEq(qAdd(Q(1, 3), Q(1, 6)), Q(1, 2)), '1/3 + 1/6 = 1/2');
  ok(qEq(qSub(Q(1, 3), Q(1, 3)), ZERO), 'a − a = 0');
  ok(qEq(qMul(Q(2, 3), Q(3, 2)), Q(1)), '2/3 · 3/2 = 1');
  ok(qEq(qDiv(Q(1, 3), Q(1, 3)), Q(1)), 'a ÷ a = 1');
  ok(qCmp(Q(-1, 3), ZERO) < 0 && qCmp(Q(1, 3), ZERO) > 0 && qCmp(ZERO, ZERO) === 0, 'qCmp signs');
  let threw = false;
  try { qDiv(Q(1), ZERO); } catch { threw = true; }
  ok(threw, 'qDiv throws on a zero divisor rather than returning Infinity');

  // 0.1 + 0.2 === 0.3 exactly — the whole reason this lab is not on floats
  ok(qEq(qAdd(qFromDecimal('0.1'), qFromDecimal('0.2')), qFromDecimal('0.3')), '0.1 + 0.2 = 0.3 exactly');
  ok(0.1 + 0.2 !== 0.3, '(and in float it would not be)');

  ok(qEq(qFromDecimal('2.5'), Q(5, 2)), 'qFromDecimal 2.5');
  ok(qEq(qFromDecimal('-40'), Q(-40)), 'qFromDecimal −40');
  ok(qEq(qFromDecimal(137.5), Q(275, 2)), 'qFromDecimal accepts a number');

  ok(qStr(Q(3)) === '3', 'qStr integer');
  ok(qStr(Q(-3)) === MINUS + '3', 'qStr uses U+2212 for a negative');
  ok(qStr(Q(5, 2)) === '2.5', 'qStr 5/2 -> 2.5');
  ok(qStr(Q(1, 8)) === '0.125', 'qStr 1/8 -> 0.125');
  ok(qStr(Q(-1, 4)) === MINUS + '0.25', 'qStr −1/4 -> −0.25');
  ok(qStr(Q(9, 5)) === '1.8', 'qStr 9/5 -> 1.8 (a terminating decimal)');
  ok(qStr(Q(1, 3)) === '1/3', 'qStr 1/3 stays an exact fraction');
  ok(qStr(Q(-5, 12)) === MINUS + '5/12', 'qStr −5/12 stays an exact fraction');
  ok(!qIsExactDecimal(Q(1, 3)) && qIsExactDecimal(Q(1, 8)), 'qIsExactDecimal');
}

/* ============================================================================
   2. INDEPENDENT closed forms — written from the textbook, not from the lab.
   ========================================================================== */
const CLOSED = {
  trip: {
    d: (v) => qMul(v.r, v.t),                       // d = r · t
    r: (v) => qDiv(v.d, v.t),                       // r = d / t
    t: (v) => qDiv(v.d, v.r),                       // t = d / r
  },
  temp: {
    F: (v) => qAdd(qMul(Q(9, 5), v.C), Q(32)),      // F = 9/5 C + 32
    C: (v) => qMul(Q(5, 9), qSub(v.F, Q(32))),      // C = 5/9 (F − 32)
  },
  tri: {
    A: (v) => qDiv(qMul(v.b, v.h), Q(2)),           // A = bh/2
    b: (v) => qDiv(qMul(Q(2), v.A), v.h),           // b = 2A/h
    h: (v) => qDiv(qMul(Q(2), v.A), v.b),           // h = 2A/b
  },
  rect: {
    P: (v) => qMul(Q(2), qAdd(v.l, v.w)),           // P = 2(l + w)
    l: (v) => qSub(qDiv(v.P, Q(2)), v.w),           // l = P/2 − w
    w: (v) => qSub(qDiv(v.P, Q(2)), v.l),           // w = P/2 − l
  },
};

/* sanity-check the closed forms themselves against known physical anchors */
section('2. the closed forms agree with facts a human can check');
{
  ok(qEq(CLOSED.temp.F({ C: Q(100) }), Q(212)), 'water boils: 100 °C = 212 °F');
  ok(qEq(CLOSED.temp.F({ C: Q(0) }), Q(32)), 'water freezes: 0 °C = 32 °F');
  ok(qEq(CLOSED.temp.C({ F: Q(212) }), Q(100)), '212 °F = 100 °C');
  ok(qEq(CLOSED.temp.F({ C: Q(-40) }), Q(-40)), '−40 is the same in both scales');
  ok(qEq(CLOSED.temp.F({ C: Q(37) }), Q(493, 5)), 'body heat: 37 °C = 98.6 °F');
  ok(qEq(CLOSED.trip.d({ r: Q(60), t: Q(2) }), Q(120)), '60 mi/h for 2 h = 120 mi');
  ok(qEq(CLOSED.tri.A({ b: Q(6), h: Q(4) }), Q(12)), 'triangle 6 by 4 has area 12');
  ok(qEq(CLOSED.rect.P({ l: Q(5), w: Q(3) }), Q(16)), 'rectangle 5 by 3 has perimeter 16');
}

/* ---- helpers ------------------------------------------------------------- */
function gridOf(spec) {
  // integer arithmetic on tenths, so the grid points are exact
  const S = 10;
  const min = Math.round(spec.min * S);
  const stp = Math.round(spec.step * S);
  const steps = Math.round((spec.max - spec.min) / spec.step);
  const out = [];
  for (let k = 0; k <= steps; k++) out.push((min + k * stp) / S);
  return out;
}
const qvals = (v) => Object.fromEntries(Object.entries(v).map(([k, x]) => [k, qFromDecimal(x)]));

/* every (formula, subject, combination of the dials that are inputs) */
function* states() {
  for (const f of FORMULAS) {
    for (const subject of f.order) {
      const knowns = f.order.filter((k) => k !== subject);
      const grids = knowns.map((k) => gridOf(f.quantities[k]));
      const idx = knowns.map(() => 0);
      for (;;) {
        const vals = {};
        // the subject keeps a stale dial value; the model must never read it
        vals[subject] = f.quantities[subject].min;
        knowns.forEach((k, i) => (vals[k] = grids[i][idx[i]]));
        yield { f, subject, knowns, vals };
        let c = knowns.length - 1;
        while (c >= 0 && ++idx[c] >= grids[c].length) idx[c--] = 0;
        if (c < 0) break;
      }
    }
  }
}

/* ============================================================================
   3. Structure — the declarative table has to be well formed before any of
      its arithmetic can be trusted.
   ========================================================================== */
section('3. formula table structure');
for (const f of FORMULAS) {
  const keys = Object.keys(f.quantities);
  ok(f.order.length === keys.length && f.order.every((k) => keys.includes(k)), `${f.id}: order lists every quantity`);
  ok(keys.every((k) => k.length === 1), `${f.id}: every quantity is a single letter (the banner tokeniser needs it)`);
  ok(f.display === `${f.lhs} = ${f.rhs}`, `${f.id}: display is "lhs = rhs"`);
  ok(f.lhs in f.quantities, `${f.id}: lhs is a quantity`);
  ok(f.primary in f.quantities && f.primary !== f.lhs, `${f.id}: primary is a non-lhs quantity`);

  // the banner/check tokenisers walk the string char by char, so no stray letters
  const letters = [...f.display].filter((c) => /[A-Za-z]/.test(c));
  ok(letters.every((c) => c in f.quantities), `${f.id}: display holds no letters that are not quantities`);
  const rhsLetters = [...f.rhs].filter((c) => /[A-Za-z]/.test(c));
  ok(rhsLetters.every((c) => c in f.quantities && c !== f.lhs), `${f.id}: rhs holds only non-lhs quantity letters`);

  // every non-lhs letter must have a chain, and appear EXACTLY ONCE in the rhs
  // (the chain reading is only honest for a subject that occurs once)
  for (const k of f.order) {
    if (k === f.lhs) {
      ok(!(k in f.chain), `${f.id}: lhs has no chain of its own`);
      continue;
    }
    ok(Array.isArray(f.chain[k]) && f.chain[k].length > 0, `${f.id}: ${k} has a chain`);
    ok(rhsLetters.filter((c) => c === k).length === 1, `${f.id}: ${k} appears exactly once in the rhs`);
    for (const op of f.chain[k]) {
      ok(['mul', 'div', 'add', 'sub'].includes(op.op), `${f.id}.${k}: op kind is known`);
      ok((op.by == null) !== (op.k == null), `${f.id}.${k}: an op takes either a letter or a constant, never both`);
      if (op.by) {
        ok(op.by in f.quantities, `${f.id}.${k}: operand ${op.by} is a quantity`);
        ok(op.by !== k && op.by !== f.lhs, `${f.id}.${k}: the operand is neither the subject nor the lhs`);
        if (op.op === 'mul' || op.op === 'div') {
          const g = gridOf(f.quantities[op.by]);
          ok(g.every((v) => v !== 0), `${f.id}.${k}: the divisor ${op.by} can never be dialled to zero`);
        }
      } else {
        ok(op.k.n !== 0 || (op.op !== 'mul' && op.op !== 'div'), `${f.id}.${k}: no zero constant multiplier`);
        // a symbol override must not lie about the number it stands for
        if (op.sym) {
          const m = /^(\d+)\/(\d+)$/.exec(op.sym);
          const parsed = m ? Q(Number(m[1]), Number(m[2])) : qFromDecimal(op.sym);
          ok(qEq(parsed, op.k), `${f.id}.${k}: the symbol "${op.sym}" equals the number it uses`);
        }
      }
    }
  }

  // dial grids must be exact and land on their own max
  for (const [k, spec] of Object.entries(f.quantities)) {
    const steps = (spec.max - spec.min) / spec.step;
    ok(Math.abs(steps - Math.round(steps)) < 1e-9, `${f.id}.${k}: the range is a whole number of steps`);
    ok(spec.step > 0 && spec.min < spec.max, `${f.id}.${k}: range is sane`);
    ok(!!spec.unit && !!spec.name, `${f.id}.${k}: has a unit and a name`);
    const g = gridOf(spec);
    ok(g[g.length - 1] === spec.max, `${f.id}.${k}: the grid reaches max exactly`);
    // every grid value must survive an exact decimal parse (the model's front door)
    ok(g.every((v) => { try { qFromDecimal(v); return true; } catch { return false; } }), `${f.id}.${k}: every grid value parses exactly`);
  }
}

section('3b. the starting bench is self-consistent');
for (const f of FORMULAS) {
  const sub = START_SUBJECTS[f.id];
  ok(sub in f.quantities, `${f.id}: start subject is a quantity`);
  const v = START_VALS[f.id];
  ok(Object.keys(f.quantities).every((k) => k in v), `${f.id}: start values cover every quantity`);
  for (const [k, spec] of Object.entries(f.quantities)) {
    ok(gridOf(spec).includes(v[k]), `${f.id}: start value ${k}=${v[k]} sits on its dial grid`);
  }
  // the stored value of the default subject must be what the formula computes
  ok(qEq(solveFor(f, sub, v), qFromDecimal(v[sub])), `${f.id}: the stored ${sub} = ${v[sub]} is exactly what the formula gives`);
}
ok(START_FID === 'trip' && START_SUBJECTS.trip === 'd', 'the lab opens on d = r · t, solving for d');

/* ============================================================================
   4. THE BIG SWEEP. Every reachable state of every formula:
        a. the chain engine agrees with the independent closed form
        b. the round trip comes home exactly
        c. the substitution check is a true statement
        d. no value silently leaves exact-integer territory
   ========================================================================== */
section('4. exhaustive sweep: chain engine vs. closed form, round trip, check line');
let sweep = 0;
let worstNum = 0;
let fracSeen = 0;
let negSeen = 0;
for (const { f, subject, vals } of states()) {
  sweep++;
  const qv = qvals(vals);
  const got = solveFor(f, subject, vals);
  const want = CLOSED[f.id][subject](qv);
  ok(qEq(got, want), `${f.id}/${subject}: chain engine = closed form at ${JSON.stringify(vals)}`);

  // (b) THE ROUND TRIP — this lab's central invariant. The chain only ever
  //     reads OTHER letters as operands (asserted in section 3), so the stale
  //     dial behind the subject is never consulted.
  const lhsShouldBe = subject === f.lhs ? got : qFromDecimal(vals[f.lhs]);
  if (subject === f.lhs) {
    // evaluate mode: feed the computed lhs back through the chain in reverse
    // and it must recover the primary dial exactly.
    ok(
      qEq(runBackward(f, f.primary, got, vals), qFromDecimal(vals[f.primary])),
      `${f.id}/${subject}: undoing the evaluation recovers ${f.primary} at ${JSON.stringify(vals)}`
    );
  } else {
    // solve mode: substitute the answer forward and land back on the lhs.
    ok(
      qEq(runForward(f, subject, got, vals), lhsShouldBe),
      `${f.id}/${subject}: the round trip comes home at ${JSON.stringify(vals)}`
    );
  }

  // (c) the substitution check: put the answer back into the ORIGINAL formula
  //     (via the independent closed form for the lhs) and it must hold.
  const all = { ...qv, [subject]: got };
  ok(qEq(CLOSED[f.id][f.lhs](all), lhsShouldBe), `${f.id}/${subject}: substituting back into ${f.display} holds`);

  // (d) magnitudes stay far inside exact-integer range, so no rational silently rounds
  const mag = Math.max(Math.abs(got.n), got.d);
  if (mag > worstNum) worstNum = mag;
  ok(Number.isSafeInteger(got.n) && Number.isSafeInteger(got.d), `${f.id}/${subject}: the answer stays exact`);
  if (!qIsExactDecimal(got)) fracSeen++;
  if (qCmp(got, ZERO) <= 0) negSeen++;
}
console.log(`   swept ${sweep.toLocaleString()} states · largest integer used ${worstNum.toLocaleString()} (safe limit ${Number.MAX_SAFE_INTEGER.toLocaleString()})`);
console.log(`   ${fracSeen.toLocaleString()} states answer with a non-terminating fraction (shown exactly, e.g. 5/12)`);

/* ============================================================================
   5. The physical-sense guard. A formula always returns a number; only some of
      those numbers can be true of the world.
   ========================================================================== */
section('5. the physical-sense guard');
{
  const negBy = {};
  for (const { f, subject, vals } of states()) {
    const got = solveFor(f, subject, vals);
    if (f.quantities[subject].positive && qCmp(got, ZERO) <= 0) {
      negBy[`${f.id}/${subject}`] = (negBy[`${f.id}/${subject}`] || 0) + 1;
    }
  }
  const keys = Object.keys(negBy).sort();
  ok(
    keys.every((k) => k === 'rect/l' || k === 'rect/w'),
    'only the rectangle can be dialled into an impossible (non-positive) answer: ' + JSON.stringify(keys)
  );
  ok(keys.includes('rect/l') && keys.includes('rect/w'), 'and it IS reachable there, so the warning is exercised');
  ok(!FORMULAS.find((f) => f.id === 'temp').quantities.C.positive, 'Celsius is NOT flagged positive (−12 °C is real)');
  ok(!FORMULAS.find((f) => f.id === 'temp').quantities.F.positive, 'Fahrenheit is NOT flagged positive');
  ok(
    FORMULAS.filter((f) => f.id !== 'temp').every((f) => Object.values(f.quantities).every((q) => q.positive)),
    'every length, area, time, rate and distance IS flagged positive'
  );
  // negSeen counts non-positive answers across the sweep; temperature supplies most
  ok(negSeen > 0, 'non-positive answers occur (temperatures below zero)');
}

/* ============================================================================
   6. The rearranged formula strings — golden, hand-checked against a teacher's
      pencil. A wrong string would teach a wrong method even with right numbers.
   ========================================================================== */
section('6. the rearranged formula strings');
{
  const M_ = MINUS;
  const GOLD = {
    'trip/d': 'd = r · t',
    'trip/r': 'r = d ÷ t',
    'trip/t': 't = d ÷ r',
    'temp/F': 'F = 9/5 · C + 32',
    'temp/C': `C = (F ${M_} 32) ÷ 9/5`,
    'tri/A': 'A = (b · h) ÷ 2',
    'tri/b': 'b = A · 2 ÷ h',
    'tri/h': 'h = A · 2 ÷ b',
    'rect/P': 'P = 2 · (l + w)',
    'rect/l': `l = P ÷ 2 ${M_} w`,
    'rect/w': `w = P ÷ 2 ${M_} l`,
  };
  let n = 0;
  for (const f of FORMULAS) {
    for (const s of f.order) {
      const key = `${f.id}/${s}`;
      ok(rearranged(f, s) === GOLD[key], `${key}: rearranged reads "${GOLD[key]}" (got "${rearranged(f, s)}")`);
      n++;
    }
  }
  ok(n === Object.keys(GOLD).length, 'every subject configuration is covered by a golden string');
  // the alt forms are the closed forms, and section 4 proved those agree
  ok(BY_ID.temp.alt.C === `C = 5/9 · (F ${M_} 32)`, 'the temperature alt form is the familiar 5/9 (F − 32)');
  ok(BY_ID.tri.alt.b === 'b = 2A ÷ h' && BY_ID.tri.alt.h === 'h = 2A ÷ b', 'the triangle alt forms are 2A ÷ h and 2A ÷ b');
}

section('6b. the check line is the real substitution');
{
  const f = BY_ID.temp;
  ok(checkLine(f, 'C', { F: 68, C: 20 }) === '9/5 · (20) + 32 = 68', 'temp/C check line substitutes the answer into the original formula');
  const t = BY_ID.trip;
  ok(checkLine(t, 'r', { d: 150, r: 5, t: 3 }) === '(50) · (3) = 150', 'trip/r check line reads (50) · (3) = 150');
  ok(checkLine(t, 'd', { d: 999, r: 60, t: 2 }) === '(60) · (2) = 120', 'trip/d check line ignores the stale d dial');
}

/* ============================================================================
   7. The spine the canvas draws must be the same mathematics.
   ========================================================================== */
section('7. the drawn spine matches the model');
{
  let n = 0;
  for (const { f, subject, vals } of states()) {
    if (n++ % 37) continue; // every 37th state — the arithmetic is already swept above
    const P = spine(f, subject, vals);
    ok(P.values.length === P.chain.length + 1, `${f.id}/${subject}: one more chip than boxes`);
    const last = P.values[P.values.length - 1];
    const lhsVal = subject === f.lhs ? solveFor(f, subject, vals) : qFromDecimal(vals[f.lhs]);
    ok(qEq(last, lhsVal), `${f.id}/${subject}: the spine's last chip IS the lhs quantity`);
    const first = P.values[0];
    const firstShould = subject === f.lhs ? qFromDecimal(vals[f.primary]) : solveFor(f, subject, vals);
    ok(qEq(first, firstShould), `${f.id}/${subject}: the spine's first chip IS the chain letter`);
    ok(P.solving === (subject !== f.lhs), `${f.id}/${subject}: solving flag`);
    ok(P.letter === (subject === f.lhs ? f.primary : subject), `${f.id}/${subject}: the chain letter`);
  }
}

/* ============================================================================
   8. Snapping. Flipping the subject must never land off-grid, out of range, or
      on a zero that would make a later division explode.
   ========================================================================== */
section('8. subject flipping stays on the grid');
{
  /* Which letters are ever used as a divisor by some chain. Those — and only
     those — must never be able to hold zero. (0 °C is a perfectly good
     temperature and C divides nothing, so C's grid rightly includes it.) */
  const divisors = {};
  for (const f of FORMULAS) {
    divisors[f.id] = new Set();
    for (const chain of Object.values(f.chain)) {
      for (const op of chain) if (op.by && (op.op === 'mul' || op.op === 'div')) divisors[f.id].add(op.by);
    }
  }
  ok(divisors.trip.has('t') && divisors.trip.has('r'), 'trip: both r and t are divisors somewhere');
  ok(divisors.temp.size === 0, 'temp: no letter is ever a divisor (only the constant 9/5 is)');
  ok(divisors.tri.has('b') && divisors.tri.has('h'), 'tri: both b and h are divisors somewhere');
  ok(divisors.rect.size === 0, 'rect: no letter is ever a divisor (only the constant 2 is)');
  for (const f of FORMULAS) {
    for (const k of divisors[f.id]) {
      ok(!gridOf(f.quantities[k]).includes(0), `${f.id}.${k}: a divisor letter can never hold zero, on any dial setting`);
    }
  }

  let n = 0;
  for (const { f, subject, vals } of states()) {
    if (n++ % 11) continue;
    const got = solveFor(f, subject, vals);
    const spec = f.quantities[subject];
    const snapped = snapToGrid(got, spec);
    const g = gridOf(spec);
    ok(g.includes(snapped), `${f.id}/${subject}: snapped ${snapped} is on the grid`);
    ok(snapped >= spec.min && snapped <= spec.max, `${f.id}/${subject}: snapped ${snapped} is in range even when the answer was far outside`);
    // snapping puts the value on the grid, and a divisor's grid has no zero —
    // so flipping the subject can never leave a later division undefined.
    if (divisors[f.id].has(subject)) {
      ok(snapped !== 0, `${f.id}/${subject}: snapping a divisor letter never lands on zero`);
    }
  }
}

/* ============================================================================
   9. THE CALIBRATION GATE. The stamp must be impossible to fire falsely.
      Swept exhaustively: every task against every reachable bench state.
   ========================================================================== */
section('9. calibration tasks are well posed');
for (const [i, task] of TASKS.entries()) {
  const f = BY_ID[task.fid];
  ok(!!f, `task ${i}: formula exists`);
  ok(task.subject in f.quantities, `task ${i}: subject is a quantity of its formula`);
  const givens = Object.keys(task.given);
  ok(givens.every((k) => k in f.quantities), `task ${i}: every given is a quantity`);
  ok(!givens.includes(task.subject), `task ${i}: the answer is never handed over as a given`);
  ok(givens.length === f.order.length - 1, `task ${i}: exactly the other quantities are given`);
  for (const [k, v] of Object.entries(task.given)) {
    ok(gridOf(f.quantities[k]).includes(v), `task ${i}: given ${k}=${v} is reachable on its dial`);
  }
  // the stated answer must be what the formula actually gives — and what the
  // INDEPENDENT closed form gives.
  const vals = { ...task.given, [task.subject]: f.quantities[task.subject].min };
  const got = solveFor(f, task.subject, vals);
  ok(qEq(got, taskAnswerQ(task)), `task ${i}: the lab computes the stated answer (${qStr(got)} vs ${qStr(taskAnswerQ(task))})`);
  ok(qEq(CLOSED[task.fid][task.subject](qvals(vals)), taskAnswerQ(task)), `task ${i}: the closed form agrees with the stated answer`);
  ok(!(f.quantities[task.subject].positive && qCmp(got, ZERO) <= 0), `task ${i}: the answer is physically possible`);
  ok(typeof task.text === 'string' && task.text.length > 20 && task.text.includes('?'), `task ${i}: reads as a question`);
}
ok(new Set(TASKS.map((t) => t.fid)).size === FORMULAS.length, 'every formula in the library is used by some task');
ok(TASKS.some((t) => t.subject === BY_ID[t.fid].lhs), 'some task solves for the left-hand letter (evaluate)');
ok(TASKS.some((t) => t.subject !== BY_ID[t.fid].lhs), 'some task needs a real rearrangement');

section('9b. no task is already solved when the challenge opens');
for (const [i, task] of TASKS.entries()) {
  const s = calibScore(task, START_FID, START_SUBJECTS[START_FID], START_VALS[START_FID]);
  ok(!s.solved, `task ${i}: not pre-solved by the reset bench`);
  ok(s.pct < 100, `task ${i}: the meter does not open at 100%`);
}

section('9c. exhaustive false-stamp proof (every task × every bench state)');
{
  let n = 0;
  let stamps = 0;
  let worstUnsolvedPct = 0;
  for (const task of TASKS) {
    for (const { f, subject, vals } of states()) {
      n++;
      const s = calibScore(task, f.id, subject, vals);
      const shouldBeSolved =
        f.id === task.fid &&
        subject === task.subject &&
        Object.entries(task.given).every(([k, v]) => qEq(qFromDecimal(vals[k]), qFromDecimal(v)));
      if (s.solved !== shouldBeSolved) {
        ok(false, `stamp disagrees with the truth: task ${task.fid}/${task.subject} at ${f.id}/${subject} ${JSON.stringify(vals)}`);
      } else checks++;
      if (s.solved) {
        stamps++;
        // a stamp must always coincide with 100% and with the right answer
        if (s.pct !== 100) ok(false, 'a stamp fired below 100%');
        if (!qEq(solveFor(f, subject, vals), taskAnswerQ(task))) ok(false, 'a stamp fired on the wrong answer');
      } else {
        if (s.pct === 100) ok(false, 'the meter read 100% without a stamp');
        if (s.pct > worstUnsolvedPct) worstUnsolvedPct = s.pct;
      }
    }
  }
  console.log(`   ${n.toLocaleString()} (task × state) pairs · ${stamps} legitimate stamps · highest unsolved reading ${worstUnsolvedPct}%`);
  ok(stamps === TASKS.length, 'each task has exactly one solving bench state');
  ok(worstUnsolvedPct <= 99, 'an unsolved bench can never read 100%');
}

/* ============================================================================
   10. The lesson. Every number a step asserts is checked against the model,
       including the numbers in the WRONG answers — a distractor that is
       accidentally right would be the worst bug in the lab.
   ========================================================================== */
section('10. the lesson');
{
  ok(STEPS.length === 7, 'seven steps');
  ok(STEPS.filter((s) => s.calib).length === 1 && STEPS[STEPS.length - 1].calib, 'exactly one calibration step, and it is last');
  STEPS.forEach((s, i) => {
    ok(!!s.title && !!s.body, `step ${i}: has a title and a body`);
    if (!s.calib) {
      ok(!!s.q && Array.isArray(s.choices) && s.choices.length >= 3, `step ${i}: poses a question with choices`);
      ok(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i}: the answer indexes a real choice`);
      ok(!!s.feedback && s.feedback.length > 60, `step ${i}: the reveal lives in the feedback`);
      ok(!s.body.includes(s.choices[s.answer]), `step ${i}: the body does not give the answer away`);
    }
  });

  const trip = BY_ID.trip;
  const temp = BY_ID.temp;

  // step 0 — the units the body claims
  ok(trip.quantities.d.unit === 'mi' && trip.quantities.r.unit === 'mi/h' && trip.quantities.t.unit === 'h', 'step 0: the units are mi, mi/h, h as claimed');

  // step 1 — "60 mi/h and 2 h gives 120 mi; slide r to 70 and d becomes 140"
  ok(qEq(solveFor(trip, 'd', { d: 0, r: 60, t: 2 }), Q(120)), 'step 1: 60 · 2 = 120');
  ok(qEq(solveFor(trip, 'd', { d: 0, r: 70, t: 2 }), Q(140)), 'step 1: 70 · 2 = 140 (the stated reveal)');
  ok(qEq(qFromDecimal(START_VALS.trip.d), Q(120)) && START_VALS.trip.r === 60 && START_VALS.trip.t === 2, 'step 1: the bench really opens at 60, 2, 120');

  // step 2 — 45 · 4 = 180, and the two distractors are genuinely wrong
  ok(qEq(solveFor(trip, 'd', { d: 0, r: 45, t: 4 }), Q(180)), 'step 2: 45 · 4 = 180');
  ok(!qEq(qAdd(Q(45), Q(4)), Q(180)) && qEq(qAdd(Q(45), Q(4)), Q(49)), 'step 2: the add-instead distractor is 49, and wrong');
  ok(!qEq(qDiv(Q(45), Q(4)), Q(180)) && qStr(qDiv(Q(45), Q(4))) === '11.25', 'step 2: the divide-instead distractor is 11.25, and wrong');
  ok(gridOf(trip.quantities.r).includes(45) && gridOf(trip.quantities.t).includes(4), 'step 2: a student can actually dial r=45, t=4 to check');

  // step 3 — "one box: × t"
  ok(trip.chain.r.length === 1 && trip.chain.r[0].op === 'mul' && trip.chain.r[0].by === 't', 'step 3: the chain from r really is the single box × t');
  ok(trip.primary === 'r', 'step 3: the displayed chain starts at r as the body says');

  // step 4 — 150 ÷ 3 = 50, and the distractors
  ok(qEq(solveFor(trip, 'r', { d: 150, r: 0, t: 3 }), Q(50)), 'step 4: 150 ÷ 3 = 50');
  ok(qEq(qMul(Q(150), Q(3)), Q(450)), 'step 4: the multiply distractor is 450, as stated');
  ok(qEq(qSub(Q(150), Q(3)), Q(147)), 'step 4: the subtract distractor is 147, as stated');
  ok(qEq(qMul(Q(50), Q(3)), Q(150)), 'step 4: the feedback check 50 · 3 = 150 holds');
  ok(gridOf(trip.quantities.d).includes(150) && gridOf(trip.quantities.t).includes(3), 'step 4: d=150, t=3 are dialable');

  // step 5 — THE order question. The wrong order must really be wrong.
  const c = temp.chain.C;
  ok(c.length === 2 && c[0].op === 'mul' && c[1].op === 'add', 'step 5: the chain is × 9/5 then + 32, so the LAST op is the + 32');
  ok(qEq(solveFor(temp, 'C', { F: 212, C: 0 }), Q(100)), 'step 5: 212 °F solves to exactly 100 °C');
  const wrongOrder = qSub(qMul(Q(5, 9), Q(212)), Q(32)); // divide first, then subtract
  ok(!qEq(wrongOrder, Q(100)), 'step 5: undoing in the wrong order does NOT give 100');
  ok(Math.abs(wrongOrder.n / wrongOrder.d - 85.78) < 0.005, `step 5: the wrong order gives 85.78 as the feedback states (got ${(wrongOrder.n / wrongOrder.d).toFixed(2)})`);
  ok(Math.abs((Q(5, 9).n / Q(5, 9).d) * 212 - 117.78) < 0.005, 'step 5: the feedback\'s intermediate 5/9 · 212 = 117.78 is right');
  ok(qEq(qMul(Q(5, 9), qSub(Q(212), Q(32))), Q(100)), 'step 5: the right order gives exactly 100');
  ok(qEq(qSub(Q(212), Q(32)), Q(180)), 'step 5: the feedback\'s 212 − 32 = 180 is right');
  ok(gridOf(temp.quantities.F).includes(212), 'step 5: a student can dial F = 212 and see it');
  ok(rearranged(temp, 'C') === `C = (F ${MINUS} 32) ÷ 9/5`, 'step 5: the lab shows the method the feedback describes');
}

/* ============================================================================
   11. Display honesty — what the student reads must be what the model holds.
   ========================================================================== */
section('11. display honesty');
{
  let n = 0;
  for (const { f, subject, vals } of states()) {
    if (n++ % 53) continue;
    const got = solveFor(f, subject, vals);
    const s = qStr(got);
    ok(!s.includes('e') && !s.includes('Infinity') && !s.includes('NaN'), `${f.id}/${subject}: the answer never prints as float junk`);
    ok(!s.includes('-'), `${f.id}/${subject}: a negative prints with U+2212, never a hyphen`);
    // an exact decimal must read back as the same rational
    if (qIsExactDecimal(got)) {
      ok(qEq(qFromDecimal(s.replace(MINUS, '-')), got), `${f.id}/${subject}: the printed decimal reads back exactly`);
    } else {
      ok(/^−?\d+\/\d+$/.test(s), `${f.id}/${subject}: a non-terminating value prints as an exact fraction, not a rounding`);
    }
  }
  ok(qStr(qDiv(Q(5), Q(12))) === '5/12', 'a repeating value like 5/12 is never silently rounded');
}

/* ---- done ---------------------------------------------------------------- */
console.log(
  '\n' +
    (fail === 0
      ? `✓ all ${checks.toLocaleString()} checks pass`
      : `✗ ${fail.toLocaleString()} of ${checks.toLocaleString()} checks FAILED`)
);
process.exit(fail === 0 ? 0 : 1);
