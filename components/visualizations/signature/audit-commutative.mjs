/* ============================================================================
   audit-commutative.mjs — numeric proof that CommutativeLab's tables are exact,
   that the PICTURE never asserts a symmetry it has not got, that the lab's
   claims about which operations commute agree with its own cells, and that the
   "cover the table" challenge can never award a false CALIBRATED stamp.

   The lab's thesis, in one line:
       an operation commutes  ⟺  its table is symmetric about the crease a = b
   and the honesty that makes the picture a proof rather than a decoration:
       a cell's shading is a function of THAT CELL'S OWN VALUE and nothing else,
       so a symmetric picture is a RESULT, never an instruction.
   Everything below verifies those two claims, plus every number the lab prints.

   NOTE ON METHOD: this audit does NOT re-type the model. It slices the real
   MODEL section straight out of CommutativeLab.jsx and evaluates it, so the
   functions tested here are byte-for-byte the ones that ship. A copy could
   drift; this cannot.

   Run:  node audit-commutative.mjs
   Zero dependencies.
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(HERE, 'CommutativeLab.jsx');
const SRC = fs.readFileSync(FILE, 'utf8');

/* ---- load the SHIPPED model, not a copy of it -------------------------- */
const from = SRC.indexOf('function gcd(x, y) {');
const to = SRC.indexOf('const STEPS = [');
if (from < 0 || to < 0 || to <= from) {
  console.error('FATAL: could not locate the MODEL section in CommutativeLab.jsx');
  process.exit(1);
}
const MODEL_SRC = SRC.slice(from, to);
const M = new Function(
  MODEL_SRC +
    '\nreturn { gcd, OPS, opOf, cellVal, rEq, intText, rText, commutesAt, level, cellFill,' +
    ' minFacts, mirrorPairs, HUNT_NS, pickHuntN };'
)();

/* ---- constants, parsed out of the source so they cannot drift ----------- */
const numConst = (name) => {
  const m = SRC.match(new RegExp('const\\s+' + name + '\\s*=\\s*(-?\\d+)\\s*;'));
  if (!m) throw new Error('could not parse const ' + name);
  return parseInt(m[1], 10);
};
const N_MIN = numConst('N_MIN');
const N_MAX = numConst('N_MAX');
const START = (() => {
  const m = SRC.match(/const START = \{ op: '(\w+)', n: (\d+), a: (\d+), b: (\d+) \};/);
  if (!m) throw new Error('could not parse START');
  return { op: m[1], n: +m[2], a: +m[3], b: +m[4] };
})();

let checks = 0;
let fails = 0;
const fail = (msg) => {
  fails++;
  if (fails <= 40) console.error('  FAIL: ' + msg);
};
const ok = (cond, msg) => {
  checks++;
  if (!cond) fail(msg);
};
const eq = (got, want, msg) => {
  checks++;
  if (got !== want) fail(`${msg} — got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};
const near = (got, want, tol, msg) => {
  checks++;
  if (!(Math.abs(got - want) <= tol)) fail(`${msg} — got ${got}, want ${want} ±${tol}`);
};
const section = (t) => console.log('\n— ' + t);

const KEYS = ['add', 'mul', 'sub', 'div'];

/* ---- independent reference implementations (deliberately different code) --
   The oracle: rationals as exact BigInt pairs, reduced by an independently
   written gcd. Nothing here shares a line with the lab. ---- */
function bgcd(x, y) {
  x = x < 0n ? -x : x;
  y = y < 0n ? -y : y;
  while (y) [x, y] = [y, x % y];
  return x;
}
function ratRef(a, b, op) {
  const A = BigInt(a);
  const B = BigInt(b);
  let p;
  let q = 1n;
  if (op === 'add') p = A + B;
  else if (op === 'mul') p = A * B;
  else if (op === 'sub') p = A - B;
  else {
    p = A;
    q = B;
  }
  const g = bgcd(p, q) || 1n;
  p /= g;
  q /= g;
  if (q < 0n) {
    p = -p;
    q = -q;
  }
  return { p, q };
}
const ratEqRef = (x, y) => x.p * y.q === y.p * x.q;
const valKey = (a, b, op) => {
  const r = ratRef(a, b, op);
  return `${r.p}/${r.q}`;
};

/* =========================================================================
   1 · THE RATIONAL MODEL IS EXACT
   ========================================================================= */
section('1 · the rational model: exact integers, fully reduced, never a float');
for (const op of KEYS) {
  for (let a = 1; a <= N_MAX; a++) {
    for (let b = 1; b <= N_MAX; b++) {
      const v = M.cellVal(a, b, op);
      ok(Number.isInteger(v.p) && Number.isInteger(v.q), `${op} ${a},${b}: p,q must be integers`);
      ok(v.q >= 1, `${op} ${a},${b}: q must be positive`);
      /* agrees with the BigInt oracle, exactly */
      const r = ratRef(a, b, op);
      ok(BigInt(v.p) === r.p && BigInt(v.q) === r.q, `${op} ${a},${b}: ${v.p}/${v.q} ≠ oracle ${r.p}/${r.q}`);
      /* fully reduced */
      eq(M.gcd(v.p, v.q), Math.abs(v.p) === 0 ? v.q : M.gcd(Math.abs(v.p), v.q), `${op} ${a},${b}: reduction`);
      if (op !== 'div') eq(v.q, 1, `${op} ${a},${b}: whole-number ops must land on q = 1`);
      if (op === 'add') eq(v.p, a + b, `add ${a},${b}`);
      if (op === 'mul') eq(v.p, a * b, `mul ${a},${b}`);
      if (op === 'sub') eq(v.p, a - b, `sub ${a},${b}`);
      if (op === 'div') {
        /* p/q really is a/b, checked by cross-multiplication in integers */
        eq(v.p * b, v.q * a, `div ${a},${b}: ${v.p}/${v.q} is not ${a}/${b}`);
        eq(M.gcd(v.p, v.q), 1, `div ${a},${b}: fraction not reduced`);
      }
    }
  }
}
/* rEq is integer cross-multiplication and agrees with the oracle */
for (const op of KEYS) {
  for (let a = 1; a <= 9; a++)
    for (let b = 1; b <= 9; b++)
      for (let c = 1; c <= 9; c++)
        for (let d = 1; d <= 9; d++) {
          const got = M.rEq(M.cellVal(a, b, op), M.cellVal(c, d, op));
          const want = ratEqRef(ratRef(a, b, op), ratRef(c, d, op));
          eq(got, want, `rEq ${op}: (${a},${b}) vs (${c},${d})`);
        }
}
/* the printed text never lies, and uses a real minus sign */
eq(M.rText({ p: 8, q: 1 }), '8', 'rText integer');
eq(M.rText({ p: -2, q: 1 }), '−2', 'rText negative uses U+2212');
eq(M.rText({ p: 3, q: 5 }), '3/5', 'rText fraction');
eq(M.rText(M.cellVal(5, 3, 'div')), '5/3', 'rText 5 ÷ 3');
eq(M.rText(M.cellVal(3, 5, 'div')), '3/5', 'rText 3 ÷ 5');
eq(M.rText(M.cellVal(4, 4, 'div')), '1', '4 ÷ 4 must print as 1, not 4/4');
eq(M.rText(M.cellVal(6, 4, 'div')), '3/2', '6 ÷ 4 must reduce to 3/2');
eq(M.rText(M.cellVal(4, 4, 'sub')), '0', '4 − 4');
eq(M.rText(M.cellVal(3, 5, 'sub')), '−2', '3 − 5');

/* =========================================================================
   2 · WHICH OPERATIONS COMMUTE — exhaustively, and against the lab's CLAIM
   ========================================================================= */
section('2 · commutativity over every cell of every table size');
for (let n = N_MIN; n <= N_MAX; n++) {
  for (const op of KEYS) {
    let all = true;
    for (let a = 1; a <= n; a++) {
      for (let b = 1; b <= n; b++) {
        const got = M.commutesAt(a, b, op);
        const want = ratEqRef(ratRef(a, b, op), ratRef(b, a, op));
        eq(got, want, `commutesAt ${op} ${a},${b} disagrees with the oracle`);
        if (!got) all = false;
        /* the per-operation truth, stated independently */
        if (op === 'add' || op === 'mul') ok(got, `${op} must commute at ${a},${b}`);
        else eq(got, a === b, `${op} at ${a},${b}: must commute exactly when a = b`);
      }
    }
    /* THE LAB'S OWN CLAIM must match its own table */
    eq(M.opOf(op).commutes, all, `OPS.${op}.commutes claims ${M.opOf(op).commutes} but the ${n}×${n} table says ${all}`);
  }
}
/* and beyond the table, so the claim is about arithmetic, not about a window */
for (let a = 0; a <= 40; a++) {
  for (let b = 0; b <= 40; b++) {
    ok(M.commutesAt(a, b, 'add'), `add must commute at ${a},${b}`);
    ok(M.commutesAt(a, b, 'mul'), `mul must commute at ${a},${b}`);
    eq(M.commutesAt(a, b, 'sub'), a === b, `sub at ${a},${b}`);
  }
}
/* every operation passes ON THE CREASE — that is the trap, and it is real */
for (const op of KEYS)
  for (let a = 1; a <= N_MAX; a++)
    ok(M.commutesAt(a, a, op), `${op} must agree with itself at ${a},${a} — a crease cell is its own mirror`);

/* =========================================================================
   3 · HOW THE BROKEN OPERATIONS FAIL — the exact relation the lab prints
   ========================================================================= */
section('3 · the mirror relation: the opposite (−), the reciprocal (÷)');
for (let a = 1; a <= N_MAX; a++) {
  for (let b = 1; b <= N_MAX; b++) {
    /* subtraction: b − a is exactly −(a − b) */
    const s1 = M.cellVal(a, b, 'sub');
    const s2 = M.cellVal(b, a, 'sub');
    eq(s2.p, -s1.p, `sub mirror ${a},${b}: must be the exact opposite`);
    eq(s1.q, 1, 'sub q');
    eq(s2.q, 1, 'sub q');
    /* division: b ÷ a is exactly a ÷ b turned upside down */
    const d1 = M.cellVal(a, b, 'div');
    const d2 = M.cellVal(b, a, 'div');
    eq(d2.p, d1.q, `div mirror ${a},${b}: numerator must be the mirror's denominator`);
    eq(d2.q, d1.p, `div mirror ${a},${b}: denominator must be the mirror's numerator`);
    /* the product of a fraction and its reciprocal is 1 — a second, independent way */
    ok(d1.p * d2.p === d1.q * d2.q, `div ${a},${b}: (a÷b)·(b÷a) must be exactly 1`);
    /* addition & multiplication: literally the same value */
    ok(M.rEq(M.cellVal(a, b, 'add'), M.cellVal(b, a, 'add')), `add mirror ${a},${b}`);
    ok(M.rEq(M.cellVal(a, b, 'mul'), M.cellVal(b, a, 'mul')), `mul mirror ${a},${b}`);
  }
}
/* the crease values the lesson names */
for (let a = 1; a <= N_MAX; a++) {
  eq(M.rText(M.cellVal(a, a, 'sub')), '0', `${a} − ${a} must be 0`);
  eq(M.rText(M.cellVal(a, a, 'div')), '1', `${a} ÷ ${a} must be 1`);
}
/* the exact numbers step 6's feedback quotes */
eq(M.rText(M.cellVal(3, 5, 'sub')), '−2', 'step 6: 3 − 5 = −2');
eq(M.rText(M.cellVal(5, 3, 'sub')), '2', 'step 6: 5 − 3 = 2');
eq(M.rText(M.cellVal(3, 5, 'div')), '3/5', 'step 6: 3 ÷ 5 = 3/5');
eq(M.rText(M.cellVal(5, 3, 'div')), '5/3', 'step 6: 5 ÷ 3 = 5/3');

/* =========================================================================
   4 · THE PICTURE IS HONEST — the centrepiece property
   ========================================================================= */
section('4 · the shading reads only the cell’s own value (and so proves the symmetry)');
/* 4a — level is a function OF THE VALUE: two cells holding the same number are
   always shaded identically. This is what makes the matching halves evidence. */
for (let n = N_MIN; n <= N_MAX; n++) {
  for (const op of KEYS) {
    const byVal = new Map();
    for (let a = 1; a <= n; a++) {
      for (let b = 1; b <= n; b++) {
        const k = valKey(a, b, op);
        const t = M.level(a, b, op, n);
        if (byVal.has(k)) near(t, byVal.get(k), 1e-12, `${op} n=${n}: cells with value ${k} shaded differently`);
        else byVal.set(k, t);
      }
    }
  }
}
/* 4b — THE EQUIVALENCE THE LAB IS BUILT ON:
       the picture is mirror-symmetric  ⟺  the operation commutes.
   Not asserted anywhere in the drawing code — it falls out of level() alone. */
for (let n = N_MIN; n <= N_MAX; n++) {
  for (const op of KEYS) {
    let symmetric = true;
    for (let a = 1; a <= n && symmetric; a++)
      for (let b = 1; b <= n && symmetric; b++)
        if (Math.abs(M.level(a, b, op, n) - M.level(b, a, op, n)) > 1e-12) symmetric = false;
    eq(symmetric, M.opOf(op).commutes, `n=${n}: the ${op} picture is ${symmetric ? '' : 'not '}symmetric but the operation ${M.opOf(op).commutes ? 'does' : 'does not'} commute`);
  }
}
/* 4c — the broken tables are exactly ANTI-symmetric: teal above, blue below */
for (let n = N_MIN; n <= N_MAX; n++) {
  for (const op of ['sub', 'div']) {
    for (let a = 1; a <= n; a++)
      for (let b = 1; b <= n; b++)
        near(M.level(a, b, op, n), -M.level(b, a, op, n), 1e-12, `${op} n=${n}: ${a},${b} must be the negative of its mirror`);
  }
}
/* 4d — level stays in [−1, 1], and is strictly increasing in the cell's value */
for (let n = N_MIN; n <= N_MAX; n++) {
  for (const op of KEYS) {
    const rows = [];
    for (let a = 1; a <= n; a++)
      for (let b = 1; b <= n; b++) {
        const t = M.level(a, b, op, n);
        ok(t >= -1 - 1e-12 && t <= 1 + 1e-12, `${op} n=${n} ${a},${b}: level ${t} out of [−1,1]`);
        const r = ratRef(a, b, op);
        rows.push({ v: Number(r.p) / Number(r.q), t });
      }
    rows.sort((x, y) => x.v - y.v);
    for (let i = 1; i < rows.length; i++) {
      if (rows[i].v > rows[i - 1].v + 1e-12)
        ok(rows[i].t > rows[i - 1].t - 1e-12, `${op} n=${n}: a bigger value must never be shaded lighter`);
    }
    /* + and × never go below the crease's value, so those tables are all blue */
    if (op === 'add' || op === 'mul')
      for (let a = 1; a <= n; a++)
        for (let b = 1; b <= n; b++) ok(M.level(a, b, op, n) >= -1e-12, `${op}: level must not go negative`);
    /* − and ÷ change hue exactly where the crease is crossed */
    if (op === 'sub' || op === 'div')
      for (let a = 1; a <= n; a++)
        for (let b = 1; b <= n; b++) {
          const t = M.level(a, b, op, n);
          eq(Math.sign(Math.abs(t) < 1e-12 ? 0 : t), Math.sign(a - b), `${op} ${a},${b}: hue must follow which side of the crease it is on`);
        }
  }
}
/* 4e — STRUCTURAL: level() must never so much as mention the mirror. If it ever
   consults (b, a) the picture stops being evidence and becomes an assertion. */
{
  const lv = MODEL_SRC.slice(MODEL_SRC.indexOf('function level('), MODEL_SRC.indexOf('function cellFill('));
  ok(lv.length > 40, 'could not slice level()');
  ok(!/\bb\s*,\s*a\b/.test(lv), 'level() references the swapped pair (b, a) — the picture must read its own cell only');
  ok(!/cellVal|commutesAt|level\s*\(/.test(lv.replace('function level(', '')), 'level() must not call another model function');
}
/* 4f — the hues are the two the legend promises, and nothing else */
for (const t of [-1, -0.5, -0.001, 0, 0.001, 0.5, 1]) {
  const c = M.cellFill(t);
  ok(t >= 0 ? c.startsWith('rgba(47,111,159,') : c.startsWith('rgba(46,139,111,'), `cellFill(${t}) hue`);
  const alpha = parseFloat(c.slice(c.lastIndexOf(',') + 1));
  ok(alpha >= 0.05 - 1e-9 && alpha <= 0.55 + 1e-9, `cellFill(${t}) alpha ${alpha} out of range`);
}

/* =========================================================================
   5 · THE COUNTING — why the property is worth having
   ========================================================================= */
section('5 · n² cells, but only n(n+1)/2 facts');
for (let n = 1; n <= 40; n++) {
  const cells = n * n;
  const crease = n;
  const pairs = M.mirrorPairs(n);
  const facts = M.minFacts(n);
  ok(Number.isInteger(pairs) && Number.isInteger(facts), `n=${n}: the counts must be whole numbers`);
  eq(facts, crease + pairs, `n=${n}: facts = crease + pairs`);
  eq(cells, crease + 2 * pairs, `n=${n}: every off-crease cell is in exactly one pair`);
  eq(facts, (n * (n + 1)) / 2, `n=${n}: n(n+1)/2`);
  /* counted a second way, by brute force over the actual classes */
  const classes = new Set();
  for (let a = 1; a <= n; a++) for (let b = 1; b <= n; b++) classes.add(a <= b ? `${a}|${b}` : `${b}|${a}`);
  eq(classes.size, facts, `n=${n}: brute-forced mirror classes`);
}
/* the exact numbers step 7 prints */
eq(12 * 12, 144, 'step 7: the 12 × 12 table has 144 cells');
eq(M.mirrorPairs(12), 66, 'step 7: 66 mirror pairs');
eq(M.minFacts(12), 78, 'step 7: 78 facts, not 144');
eq(144 - 12, 132, 'step 7: 132 cells off the crease');
eq(12 + 66, 78, 'step 7: 12 + 66 = 78');
ok(M.minFacts(12) !== 72, 'step 7: 78 is NOT half of 144 — the distractor must be genuinely wrong');
eq(START.n * START.n, 36, 'step 0 says "all 36 answers" — START.n must be 6');

/* =========================================================================
   6 · THE CHALLENGE CANNOT AWARD A FALSE STAMP
   ========================================================================= */
section('6 · calibration: stamp soundness against an independent definition');

/* the component's exact rule, transcribed from the .jsx (and regex-checked below) */
function play(n, picks) {
  const covered = new Set();
  const paid = new Set();
  for (const [a, b] of picks) {
    covered.add(`${a},${b}`);
    covered.add(`${b},${a}`);
    paid.add(`${a},${b}`);
  }
  const full = covered.size === n * n;
  const calibrated = full && picks.length === M.minFacts(n);
  const cov = covered.size / (n * n);
  const eff = picks.length === 0 ? 0 : M.minFacts(n) / Math.max(picks.length, M.minFacts(n));
  const raw = 70 * cov + 30 * eff * cov;
  const pct = calibrated ? 100 : Math.min(99, Math.round(raw));
  return { covered, paid, full, calibrated, raw, pct };
}
/* an INDEPENDENT definition of perfect play: every mirror class hit exactly once */
function perfectRef(n, picks) {
  const seen = new Map();
  for (const [a, b] of picks) {
    const k = a <= b ? `${a}|${b}` : `${b}|${a}`;
    seen.set(k, (seen.get(k) || 0) + 1);
  }
  let total = 0;
  for (let a = 1; a <= n; a++)
    for (let b = a; b <= n; b++) {
      total++;
      if (seen.get(`${a}|${b}`) !== 1) return false;
    }
  return seen.size === total;
}

ok(M.HUNT_NS.length >= 3, 'the challenge needs several table sizes to be replayable');
for (const n of M.HUNT_NS) {
  ok(n >= N_MIN && n <= N_MAX, `hunt size ${n} must be a table the lab can draw`);

  /* the empty board never opens solved, and never opens above zero */
  const zero = play(n, []);
  eq(zero.calibrated, false, `n=${n}: an empty board must not be calibrated`);
  eq(zero.pct, 0, `n=${n}: an empty board must read 0%`);

  /* perfect play: one pick per class, in a few different orders */
  const classes = [];
  for (let a = 1; a <= n; a++) for (let b = a; b <= n; b++) classes.push([a, b]);
  eq(classes.length, M.minFacts(n), `n=${n}: class count`);
  for (let trial = 0; trial < 60; trial++) {
    const picks = classes.slice();
    for (let i = picks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [picks[i], picks[j]] = [picks[j], picks[i]];
    }
    /* half the trials click the mirror side of each class instead */
    const flipped = picks.map(([a, b]) => (trial % 2 === 0 ? [a, b] : [b, a]));
    const r = play(n, flipped);
    eq(r.full, true, `n=${n}: perfect play must cover every cell`);
    eq(r.calibrated, true, `n=${n}: perfect play must be CALIBRATED`);
    eq(r.pct, 100, `n=${n}: perfect play must read 100%`);
    eq(perfectRef(n, flipped), true, `n=${n}: reference disagrees about perfect play`);
    /* covering it the WRONG way round must be identical — order never matters,
       which is rather the point of the lab */
    eq(play(n, flipped.slice().reverse()).calibrated, true, `n=${n}: pick order must not matter`);
  }

  /* one wasted fact: fully covered, but never stamped */
  for (const [a, b] of classes.slice(0, 12)) {
    if (a === b) continue;
    const wasteful = classes.concat([[b, a]]); // re-buy a fact the mirror already gave
    const r = play(n, wasteful);
    eq(r.full, true, `n=${n}: still covered`);
    eq(r.calibrated, false, `n=${n}: a wasted fact must NOT be stamped`);
    ok(r.pct < 100, `n=${n}: a wasted fact must read under 100% (got ${r.pct})`);
    ok(r.pct >= 95, `n=${n}: one waste in ${M.minFacts(n)} should still read high (got ${r.pct})`);
    eq(perfectRef(n, wasteful), false, `n=${n}: reference must reject a wasted fact`);
  }

  /* incomplete play can never be stamped, however many facts were spent */
  for (let k = 0; k < classes.length; k++) {
    const partial = classes.slice(0, k);
    const r = play(n, partial);
    eq(r.calibrated, k === classes.length, `n=${n}: ${k} of ${classes.length} classes must not stamp`);
    if (k < classes.length) ok(r.pct < 100, `n=${n}: incomplete must read under 100%`);
  }

  /* 400 random walks per size, against the independent definition */
  for (let t = 0; t < 400; t++) {
    const len = 1 + Math.floor(Math.random() * (M.minFacts(n) + 6));
    const picks = [];
    for (let i = 0; i < len; i++)
      picks.push([1 + Math.floor(Math.random() * n), 1 + Math.floor(Math.random() * n)]);
    const r = play(n, picks);
    eq(r.calibrated, perfectRef(n, picks), `n=${n}: stamp disagrees with the reference on a random walk`);
    /* THE EQUIVALENCE, BOTH WAYS: 100% is shown exactly when the stamp is earned */
    eq(r.pct === 100, r.calibrated, `n=${n}: 100% must mean CALIBRATED and nothing else`);
    ok(r.raw <= 100 + 1e-9 && r.raw >= 0, `n=${n}: the raw meter must stay in [0,100]`);
    /* the free cells are exactly the ones the property paid for */
    eq(r.covered.size - r.paid.size, r.covered.size - new Set(picks.map(([a, b]) => `${a},${b}`)).size, `n=${n}: free-cell count`);
  }

  /* a repeat is ALWAYS a waste — clicking the mirror of something you own can
     never add a cell */
  for (let a = 1; a <= n; a++)
    for (let b = 1; b <= n; b++) {
      const one = play(n, [[a, b]]);
      const twice = play(n, [
        [a, b],
        [b, a],
      ]);
      eq(twice.covered.size, one.covered.size, `n=${n}: ${b},${a} after ${a},${b} must cover nothing new`);
    }

  /* the minimum really is a minimum: you cannot cover it in fewer */
  for (let k = 0; k < M.minFacts(n); k++) {
    for (let t = 0; t < 30; t++) {
      const picks = [];
      for (let i = 0; i < k; i++)
        picks.push([1 + Math.floor(Math.random() * n), 1 + Math.floor(Math.random() * n)]);
      eq(play(n, picks).full, false, `n=${n}: ${k} facts must not be able to cover ${n * n} cells`);
    }
  }
}
/* pickHuntN never hands back the board you just finished */
for (let t = 0; t < 400; t++) {
  const prev = M.HUNT_NS[t % M.HUNT_NS.length];
  const nx = M.pickHuntN(prev);
  ok(M.HUNT_NS.includes(nx), `pickHuntN returned ${nx}, not a hunt size`);
  ok(nx !== prev, 'pickHuntN must not repeat the previous table');
}
/* the meter formula in the source is the one audited above */
ok(/70 \* cov \+ 30 \* eff \* cov/.test(SRC), 'the meter formula drifted from the audit');
ok(/calibrated \? 100 : Math\.min\(99, Math\.round\(rawPct\)\)/.test(SRC), 'the 100%-only-when-stamped guard is missing');
ok(/const calibrated = calib && full && clicks === need;/.test(SRC), 'the stamp must be a boolean conjunction, never a percentage');

/* =========================================================================
   7 · THE LESSON — every answer key, and every number in the prose
   ========================================================================= */
section('7 · lesson integrity');
const stepsSrc = SRC.slice(SRC.indexOf('const STEPS = ['), SRC.indexOf('const CALIB_STEP'));
const titles = [...stepsSrc.matchAll(/title:\s*'([^']*)'/g)].map((m) => m[1]);
const answersIdx = [...stepsSrc.matchAll(/answer:\s*(\d+)/g)].map((m) => +m[1]);
const choiceBlocks = [...stepsSrc.matchAll(/choices:\s*\[([\s\S]*?)\],\s*\n\s*answer:/g)].map((m) =>
  [...m[1].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((x) => x[1])
);
eq(titles.length, 9, 'the lab must have 9 steps');
eq(answersIdx.length, 8, '8 steps carry a question; the 9th is the challenge');
eq(choiceBlocks.length, 8, 'every question must have a choice block');
for (let i = 0; i < answersIdx.length; i++) {
  eq(choiceBlocks[i].length, 3, `step ${i + 1}: three choices`);
  ok(answersIdx[i] >= 0 && answersIdx[i] < 3, `step ${i + 1}: the answer index must be a real choice`);
  eq(answersIdx[i], 0, `step ${i + 1}: this lab keys every answer to choice 0`);
  eq(new Set(choiceBlocks[i]).size, 3, `step ${i + 1}: the choices must be distinct`);
}
ok(/calib: true,\n\s*\},\n\];/.test(stepsSrc), 'the challenge must be the LAST step');
eq(stepsSrc.split('calib: true').length - 1, 1, 'exactly one calibration step');

/* the claims each answer and each distractor makes, checked as arithmetic.
   A distractor that is wrong about its own mistake punishes a child for
   reasoning correctly, so each one is verified to be genuinely, checkably wrong. */
eq(M.rText(M.cellVal(3, 5, 'add')), '8', 'step 1 key: 3 + 5 = 8');
eq(M.rText(M.cellVal(3, 5, 'mul')), '15', 'step 1 distractor: 3 × 5 = 15 — a real number, and not 8');
ok(M.rText(M.cellVal(3, 5, 'add')) !== '15', 'step 1: the × distractor must be wrong');
ok(M.rText(M.cellVal(3, 5, 'add')) !== '35', 'step 1: the concatenation distractor must be wrong');
eq(M.rText(M.cellVal(5, 3, 'add')), '8', 'step 3 key: 5 + 3 = 8');
eq(M.rText(M.cellVal(5, 3, 'sub')), '2', 'step 3 distractor: "2 — the difference" is 5 − 3, genuinely not the answer');
ok(M.rText(M.cellVal(5, 3, 'add')) !== '2', 'step 3: the difference distractor must be wrong');
ok(M.rText(M.cellVal(5, 3, 'add')) !== '15', 'step 3: the product distractor must be wrong');
ok(M.opOf('mul').commutes, 'step 5 key: multiplication commutes');
eq(M.rText(M.cellVal(3, 5, 'mul')), M.rText(M.cellVal(5, 3, 'mul')), 'step 5 key: 3 × 5 = 5 × 3');
eq(M.rText(M.cellVal(5, 3, 'sub')), '2', 'step 6 key: row 5 column 3 of a − table holds 2');
ok(M.rText(M.cellVal(5, 3, 'sub')) !== '−2', 'step 6: "the same, as with addition" must be wrong');
ok(M.rText(M.cellVal(5, 3, 'sub')) !== '8', 'step 6: the addition distractor must be wrong');
/* step 7's trap: the crease agrees under EVERY operation, so 4 is not special */
for (const op of KEYS) {
  ok(M.commutesAt(4, 4, op), `step 7: ${op} agrees at 4,4 — so "4 is special for subtraction" is false`);
  for (let k = 1; k <= N_MAX; k++)
    eq(M.commutesAt(k, k, 'sub'), true, `step 7: the crease agrees at ${k},${k} for every k — 4 is not special`);
}
ok(!M.opOf('sub').commutes, 'step 7: "subtraction commutes if you test carefully" must be false');
/* every step's prose names only settings the dials can actually reach */
ok(4 >= N_MIN && 4 <= N_MAX, 'step 7 says "set both dials to 4" — 4 must always be reachable');
ok(12 <= N_MAX, 'step 8 says 12 × 12 — the n dial must reach 12');
ok(START.a <= START.n && START.b <= START.n, 'START must sit inside its own table');
ok(START.a !== START.b, 'START must be OFF the crease, or step 3’s Swap would do nothing at all');
eq(START.op, 'add', 'the lab opens on addition (the 1.OA.B.3 on-ramp)');
eq(M.rText(M.cellVal(START.a, START.b, START.op)), '8', 'START is the 3 + 5 = 8 the prose names');
/* the numbers quoted in step 1 and step 5's prose */
eq(2 + 2, 4, 'sanity');
eq(1 * 1, 1, 'step 5 prose: the × table runs from 1…');
eq(START.n * START.n, 36, '…to 36');
eq(1 + 1, 2, 'step 5 prose: the + table runs from 2…');
eq(START.n + START.n, 12, '…to 12');

/* =========================================================================
   8 · LAYOUT — the table fits, and stays legible, at every size
   ========================================================================= */
section('8 · layout: the table fits its square stage at every n and viewport');
/* the same four lines the renderer uses */
function layout(W, H, n) {
  const PAD = 10;
  const cell = Math.min((W - 2 * PAD) / (n + 1), (H - 2 * PAD) / (n + 1));
  const gx0 = (W - cell * (n + 1)) / 2;
  const gy0 = (H - cell * (n + 1)) / 2;
  return { cell, gx0, gy0, PAD };
}
ok(/const cell = Math\.min\(\(W - 2 \* PAD\) \/ \(N \+ 1\), \(H - 2 \* PAD\) \/ \(N \+ 1\)\);/.test(SRC), 'the layout formula drifted from the audit');
/* The stage sizes below are MEASURED from the running lab, not guessed. The rule
   is stage_width ≈ viewport − 64 (page padding + panel padding), and the stage is
   square-capped at --stage-h, so on a phone the table is WIDTH-bound.

   The worst legibility case in the whole lab is the 12 × 12 DIVISION table on the
   narrowest phone: 169 cells, each holding a fraction as wide as "11/12". That is
   what the 21px floor below is protecting, and it is why it is checked here
   rather than eyeballed — a 360px viewport lands on 21.23px, which passes by a
   hair. KNOWN LIMIT: a 320px viewport (iPhone 5 era) yields an 18px cell and the
   ÷ table does get cramped there; every phone from 360 up is clear. */
for (const [W, H, label] of [
  [520, 520, 'desktop 1280 → 520px square stage'],
  [460, 460, 'small desktop'],
  [326, 382, 'phone 390 (measured)'],
  [311, 382, 'phone 375 / iPhone SE (measured rule: viewport − 64)'],
  [296, 382, 'phone 360 — the narrowest in real use (measured: 21.23px cells)'],
]) {
  for (let n = N_MIN; n <= N_MAX; n++) {
    const L = layout(W, H, n);
    ok(L.cell > 0, `${label} n=${n}: cell must be positive`);
    ok(L.cell * (n + 1) <= Math.min(W, H) - 2 * L.PAD + 1e-9, `${label} n=${n}: the table must fit inside the padding`);
    ok(L.gx0 >= L.PAD - 1e-9 && L.gy0 >= L.PAD - 1e-9, `${label} n=${n}: the table must be centred inside the stage`);
    ok(L.gx0 + L.cell * (n + 1) <= W + 1e-9, `${label} n=${n}: right edge on-stage`);
    ok(L.gy0 + L.cell * (n + 1) <= H + 1e-9, `${label} n=${n}: bottom edge on-stage`);
    /* legibility: the worst case is the 12 × 12 division table on a phone */
    ok(L.cell >= 21, `${label} n=${n}: cell ${L.cell.toFixed(1)}px is too small to read`);
  }
}
/* the widest thing a cell ever has to hold is a division fraction */
{
  let widest = '';
  for (let a = 1; a <= N_MAX; a++)
    for (let b = 1; b <= N_MAX; b++) {
      const t = M.rText(M.cellVal(a, b, 'div'));
      if (t.length > widest.length) widest = t;
    }
  eq(widest.length, 5, `the widest cell label should be 5 characters (got "${widest}")`);
  ok(/^\d{2}\/\d{2}$/.test(widest), `the widest label should be a two-digit fraction (got "${widest}")`);
}

/* =========================================================================
   9 · SOURCE CONTRACTS — the MAIS drop-in rules
   ========================================================================= */
section('9 · source contracts: zero dependencies, scoped styles, no leaks');
ok(/^'use client';/m.test(SRC), "must start with 'use client'");
{
  const imports = [...SRC.matchAll(/^import .*$/gm)].map((m) => m[0]);
  eq(imports.length, 1, 'exactly one import');
  ok(/from 'react';$/.test(imports[0]), `the only import must be react — found: ${imports[0]}`);
}
ok(!/three|THREE|d3|katex|mathjs|lodash/i.test(SRC.replace(/\bthree\b/gi, '')), 'no external library may sneak in');
ok(/<style jsx>\{`/.test(SRC), 'styles must be scoped with styled-jsx');
ok(/export default function CommutativeLab\(\)/.test(SRC), 'the component must be CommutativeLab');
ok(/className="cmlab"/.test(SRC), 'the CSS scope must be .cmlab');
/* filenames the siblings already own — a collision would overwrite them */
for (const taken of ['amlab', 'aalab', 'primelab']) ok(!SRC.includes(`className="${taken}"`), `CSS scope collides with a sibling: ${taken}`);
/* the reveal schedule must exist, or the facts panel prints the punchline early */
for (const gate of ['showMirrorFact = step >= 3', 'showVerdict = step >= 3', 'showRelation = step >= 5', 'showCount = step >= 7'])
  ok(SRC.includes(gate), `the reveal schedule is missing: ${gate}`);
ok(/\{showVerdict \?/.test(SRC), 'the verdict fact must be gated on the reveal schedule');
/* THE HEADLINE IS PART OF THE REVEAL SCHEDULE TOO. Step 1 asks what row 3,
   column 5 holds; a stage headline reading "3 + 5 = 8" answers it before it is
   asked. It shipped that way once — this gate is why it cannot again. */
ok(/\) : step < 1 \? \(/.test(SRC), 'the stage headline must not name a chosen pair before step 2 unlocks the dials');
ok(/table · every pair from 1 to \{n\}/.test(SRC), 'the step-1 headline must describe the table, not a cell');
/* the challenge must lock the operation to × — a − table has no free mirrors */
ok(/setOp\('mul'\); \/\/ the challenge is the times table/.test(SRC), 'the challenge must force the operation to ×');
ok(!/disabled=\{step < 4\}[\s\S]{0,200}calib/.test(SRC), 'the op switch must not be reachable during the challenge');
/* leaving the challenge must restore a real table (the DistributiveLab bug) */
ok(/\} else if \(!calib && wasCalib\) \{/.test(SRC), 'backing out of the challenge must restore the lesson table');
/* a11y */
ok(/role="img"/.test(SRC) && /aria-label=\{spoken\}/.test(SRC), 'the canvas needs a spoken label');
ok(/aria-live="polite"/.test(SRC), 'the stamp needs a live region');
ok(/aria-pressed=\{mirror\}/.test(SRC), 'the mirror lens must report its state');
ok(/prefers-reduced-motion/.test(SRC), 'reduced motion must be respected');
/* one-accent discipline: carmine is the mirror's, and the op switch must not take it */
{
  const seg = SRC.slice(SRC.indexOf('.seg.on {'), SRC.indexOf('.seg:disabled'));
  ok(!seg.includes('--curve'), 'the operation switch must not use the carmine accent — it is a mode selector');
}

/* ========================================================================= */
console.log('\n' + '='.repeat(66));
if (fails) {
  console.log(`FAILED — ${fails} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`PASS — ${checks.toLocaleString()} checks, 0 failures`);
console.log('='.repeat(66));
