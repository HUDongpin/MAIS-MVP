/* ============================================================================
   audit-substitution.mjs — numeric audit for SubstitutionLab.jsx
   Run:  node audit-substitution.mjs

   Re-implements the lab's pure math and proves, exhaustively over the full dial
   ranges, the invariants a K-12 student would rely on. No dependencies.

   The load-bearing checks:
     • the collapse K·x + C = e really is c·x + d·(a·x + b) = e  (identity in x)
     • the reported (x, y) satisfies BOTH original equations EXACTLY, in
       fraction arithmetic — the property the whole lab exists to deliver
     • the three cases are classified correctly, and the degenerate ones really
       are unsatisfiable / universally satisfied
     • the CALIBRATED stamp cannot fire on any card but the machine's
   ========================================================================== */

const MINUS = '−';
let fail = 0;
let checks = 0;
const ok = (cond, msg) => {
  checks++;
  if (!cond) {
    fail++;
    if (fail <= 25) console.error('  ✗ ' + msg);
  }
};

/* ---- mirror of the lab's pure math -------------------------------------- */
const gcd = (m, n) => {
  m = Math.abs(m);
  n = Math.abs(n);
  while (n) {
    const t = m % n;
    m = n;
    n = t;
  }
  return m || 1;
};
function frac(n, d) {
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}
const fracStr = (f) => (f.d === 1 ? fmt(f.n) : `${fmt(f.n)}/${f.d}`);
const collapse = (a, b, c, d) => ({ K: c + d * a, C: d * b });
function solveSystem(a, b, c, d, e) {
  const { K, C } = collapse(a, b, c, d);
  if (K !== 0) return { kind: 'one', K, C, x: frac(e - C, K), y: frac(a * (e - C) + b * K, K) };
  return { kind: C === e ? 'infinite' : 'none', K, C, x: null, y: null };
}
function calibError(a, b, t) {
  const me = collapse(a, b, t.c, t.d);
  const th = collapse(t.a, t.b, t.c, t.d);
  return Math.hypot(me.K - th.K, me.C - th.C) / t.d;
}
const matchPercent = (err) => Math.max(0, Math.min(100, 100 / (1 + err / 0.8)));
const MATCH_ERR = 0.05;

function fmt(n) {
  return (Object.is(n, -0) ? 0 : n).toString().replace('-', MINUS);
}
const T = (s, k) => ({ s, k: k || 'num' });
const toksPlain = (toks) => toks.map((t) => t.s).join('');

function coefToks(n, lead) {
  const t = [];
  if (n < 0) t.push(T(lead ? MINUS : ` ${MINUS} `, 'op'));
  else if (!lead) t.push(T(' + ', 'op'));
  const m = Math.abs(n);
  if (m !== 1) t.push(T(String(m), 'num'));
  return t;
}
function constToks(n, lead) {
  const t = [];
  if (n < 0) t.push(T(lead ? MINUS : ` ${MINUS} `, 'op'));
  else if (!lead) t.push(T(' + ', 'op'));
  t.push(T(String(Math.abs(n)), 'num'));
  return t;
}
function cardBody(a, b) {
  const t = [];
  if (a !== 0) {
    t.push(...coefToks(a, true), T('x', 'x'));
    if (b !== 0) t.push(...constToks(b, false));
  } else {
    t.push(...constToks(b, true));
  }
  return t;
}
const cardToks = (a, b) => [T('(', 'cparen'), ...cardBody(a, b), T(')', 'cparen')];
function eq2Prefix(c, d) {
  const t = [];
  if (c !== 0) t.push(...coefToks(c, true), T('x', 'x'), T(' + ', 'op'));
  if (d !== 1) t.push(T(String(d), 'num'));
  return t;
}
const eq2Suffix = (e) => [T(' = ', 'op'), T(fmt(e), 'num')];
function distribToks(a, b, c, d, e) {
  const t = [];
  let lead = true;
  if (c !== 0) {
    t.push(...coefToks(c, lead), T('x', 'x'));
    lead = false;
  }
  const da = d * a;
  if (da !== 0) {
    t.push(...coefToks(da, lead), T('x', 'x'));
    lead = false;
  }
  const db = d * b;
  if (db !== 0 || lead) {
    t.push(...constToks(db, lead));
    lead = false;
  }
  t.push(...eq2Suffix(e));
  return t;
}
function combineToks(K, C, e) {
  const t = [];
  let lead = true;
  if (K !== 0) {
    t.push(...coefToks(K, lead), T('x', 'x'));
    lead = false;
  }
  if (C !== 0 || lead) {
    t.push(...constToks(C, lead));
    lead = false;
  }
  t.push(...eq2Suffix(e));
  return t;
}
const solveToks = (xs) => [T('x', 'x'), T(' = ', 'op'), T(xs, 'x')];
function backSubToks(a, b, xs, ys) {
  const t = [T('y', 'y'), T(' = ', 'op')];
  if (a !== 0) {
    t.push(...coefToks(a, true), T('(', 'cparen'), T(xs, 'x'), T(')', 'cparen'));
    if (b !== 0) t.push(...constToks(b, false));
  } else {
    t.push(...constToks(b, true));
  }
  t.push(T(' = ', 'op'), T(ys, 'y'));
  return t;
}
function checkToks(c, d, xs, ys, e) {
  const t = [];
  let lead = true;
  if (c !== 0) {
    t.push(...coefToks(c, lead), T('(', 'paren'), T(xs, 'x'), T(')', 'paren'));
    lead = false;
  }
  t.push(...coefToks(d, lead), T('(', 'paren'), T(ys, 'y'), T(')', 'paren'));
  t.push(...eq2Suffix(e), T('  ✓', 'ok'));
  return t;
}
const cardPlain = (a, b) => toksPlain(cardBody(a, b));
const eq2Plain = (c, d, e) => toksPlain([...eq2Prefix(c, d), T('y', 'y'), ...eq2Suffix(e)]);
const collapsePlain = (K, C, e) => toksPlain(combineToks(K, C, e));

function targetOk(t, prev, avoid) {
  if (t.a === 0) return false;
  if (t.b === 0) return false;
  if (t.c === 0) return false;
  if (t.c + t.d * t.a === 0) return false;
  if (prev && t.a === prev.a && t.b === prev.b && t.c === prev.c && t.d === prev.d && t.e === prev.e) return false;
  if (avoid && t.a === avoid.a && t.b === avoid.b) return false;
  return true;
}
const FALLBACK_TARGET = { a: 2, b: -1, c: 3, d: 2, e: 12 };
function makeTarget(prev, avoid) {
  const pick = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
  let t;
  let guard = 0;
  do {
    t = { a: pick(-3, 3), b: pick(-6, 6), c: pick(-4, 4), d: pick(1, 4), e: pick(-8, 12) };
    guard += 1;
  } while (!targetOk(t, prev, avoid) && guard < 400);
  return targetOk(t, prev, avoid) ? t : { ...FALLBACK_TARGET };
}

/* ---- exact fraction arithmetic, used ONLY by the audit to re-verify ------ */
const fint = (n) => ({ n, d: 1 });
const fadd = (p, q) => frac(p.n * q.d + q.n * p.d, p.d * q.d);
const fmul = (p, q) => frac(p.n * q.n, p.d * q.d);
const feq = (p, q) => p.n === q.n && p.d === q.d; // both canonical ⇒ structural equality is value equality

/* ---- dial ranges (must match PARAMS in the lab) ------------------------- */
const A = { min: -3, max: 3 };
const B = { min: -6, max: 6 };
const C_ = { min: -4, max: 4 };
const D = { min: 1, max: 4 };
const E = { min: -8, max: 12 };
const range = (r) => {
  const out = [];
  for (let v = r.min; v <= r.max; v++) out.push(v);
  return out;
};
const as = range(A), bs = range(B), cs = range(C_), ds = range(D), es = range(E);
const START = { a: 1, b: 3, c: 1, d: 1, e: 9 };
const VANISH = { a: 2, b: 1, c: -2, d: 1, e: 5 };

console.log('SubstitutionLab audit');
console.log('=====================');
console.log(
  `dial grid: a(${as.length}) × b(${bs.length}) × c(${cs.length}) × d(${ds.length}) × e(${es.length}) = ` +
    `${(as.length * bs.length * cs.length * ds.length * es.length).toLocaleString()} systems\n`
);

/* ---- 1. The collapse is an identity in x -------------------------------- */
/* c·x + d·(a·x + b) must equal K·x + C for EVERY x, not just the solution.
   Checking a linear identity at 11 distinct points is overwhelming evidence
   (2 would suffice); this is the claim the "distribute → collect" rungs make. */
{
  let n = 0;
  const probes = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];
  for (const a of as)
    for (const b of bs)
      for (const c of cs)
        for (const d of ds) {
          const { K, C } = collapse(a, b, c, d);
          for (const x of probes) {
            ok(c * x + d * (a * x + b) === K * x + C, `collapse identity a=${a} b=${b} c=${c} d=${d} x=${x}`);
            n++;
          }
        }
  console.log(`1. collapse is an identity in x .................. ${n.toLocaleString()} checks`);
}

/* ---- 2. The distribute rung equals the substitute rung ------------------- */
/* c·x + (d·a)·x + (d·b)  ===  c·x + d·(a·x + b)  for every x. This is the step
   where a student who drops the parentheses goes wrong, so it is worth proving
   the lab's own rendering of it is the honest expansion. */
{
  let n = 0;
  const probes = [-3, -1, 0, 2, 4];
  for (const a of as)
    for (const b of bs)
      for (const c of cs)
        for (const d of ds)
          for (const x of probes) {
            ok(c * x + d * a * x + d * b === c * x + d * (a * x + b), `distribute a=${a} b=${b} c=${c} d=${d} x=${x}`);
            n++;
          }
  console.log(`2. distribute rung is the honest expansion ....... ${n.toLocaleString()} checks`);
}

/* ---- 3. THE BIG ONE: the reported pair satisfies both equations exactly -- */
{
  let n = 0;
  let unique = 0, none = 0, infinite = 0;
  for (const a of as)
    for (const b of bs)
      for (const c of cs)
        for (const d of ds)
          for (const e of es) {
            const s = solveSystem(a, b, c, d, e);
            if (s.kind === 'one') {
              unique++;
              // Eq 1:  y === a·x + b
              const rhs1 = fadd(fmul(fint(a), s.x), fint(b));
              ok(feq(s.y, rhs1), `Eq1 fails a=${a} b=${b} c=${c} d=${d} e=${e}`);
              // Eq 2:  c·x + d·y === e
              const lhs2 = fadd(fmul(fint(c), s.x), fmul(fint(d), s.y));
              ok(feq(lhs2, fint(e)), `Eq2 fails a=${a} b=${b} c=${c} d=${d} e=${e}`);
              // fractions are canonical: reduced, positive denominator
              ok(gcd(s.x.n, s.x.d) === 1 && s.x.d > 0, `x not canonical a=${a} b=${b} c=${c} d=${d} e=${e}`);
              ok(gcd(s.y.n, s.y.d) === 1 && s.y.d > 0, `y not canonical a=${a} b=${b} c=${c} d=${d} e=${e}`);
              n += 4;
            } else if (s.kind === 'none') {
              none++;
              // really unsatisfiable: no x anywhere makes the collapse true
              for (const x of [-9, -4, -1, 0, 1, 3, 7, 12]) {
                ok(c * x + d * (a * x + b) !== e, `"none" but x=${x} works: a=${a} b=${b} c=${c} d=${d} e=${e}`);
                n++;
              }
            } else {
              infinite++;
              // really universal: EVERY x makes the collapse true
              for (const x of [-9, -4, -1, 0, 1, 3, 7, 12]) {
                ok(c * x + d * (a * x + b) === e, `"infinite" but x=${x} fails: a=${a} b=${b} c=${c} d=${d} e=${e}`);
                n++;
              }
            }
          }
  console.log(`3. solution pair satisfies BOTH equations exactly  ${n.toLocaleString()} checks`);
  console.log(
    `     cases: ${unique.toLocaleString()} unique · ${none.toLocaleString()} no-solution · ${infinite.toLocaleString()} infinite`
  );
  ok(unique > 0 && none > 0 && infinite > 0, 'all three cases must be reachable from the dials');
}

/* ---- 4. Case classification agrees with a brute-force search ------------- */
/* K = 0 ⟺ the collapse has no x left. Cross-check the label against what the
   arithmetic actually does over a dense probe, independent of the K test. */
{
  let n = 0;
  for (const a of as)
    for (const b of bs)
      for (const c of cs)
        for (const d of ds)
          for (const e of es) {
            const s = solveSystem(a, b, c, d, e);
            const f = (x) => c * x + d * (a * x + b) - e;
            const flat = f(0) === f(1) && f(1) === f(2); // no x-dependence at all
            if (s.kind === 'one') ok(!flat, `labelled unique but flat: a=${a} b=${b} c=${c} d=${d} e=${e}`);
            else {
              ok(flat, `labelled degenerate but not flat: a=${a} b=${b} c=${c} d=${d} e=${e}`);
              ok(
                (s.kind === 'infinite') === (f(0) === 0),
                `degenerate label wrong: a=${a} b=${b} c=${c} d=${d} e=${e} kind=${s.kind}`
              );
            }
            n += 2;
          }
  console.log(`4. case labels match a brute-force probe ......... ${n.toLocaleString()} checks`);
}

/* ---- 5. Rendering: no ASCII hyphen, no "+ −", no bare "1x" -------------- */
{
  let n = 0;
  const clean = (s, where) => {
    ok(!s.includes('-'), `ASCII hyphen leaked in ${where}: "${s}"`);
    ok(!s.includes('+ −') && !s.includes('+ -'), `sign collision in ${where}: "${s}"`);
    ok(!/(^|[^\d])1x/.test(s), `bare "1x" in ${where}: "${s}"`);
    ok(!/\s\s/.test(s.trim()), `double space in ${where}: "${s}"`);
    n += 4;
  };
  for (const a of as)
    for (const b of bs) {
      clean(cardPlain(a, b), `card a=${a} b=${b}`);
      clean(toksPlain(cardToks(a, b)), `cardToks a=${a} b=${b}`);
    }
  for (const c of cs)
    for (const d of ds)
      for (const e of es) clean(eq2Plain(c, d, e), `eq2 c=${c} d=${d} e=${e}`);
  for (const a of as)
    for (const b of bs)
      for (const c of cs)
        for (const d of ds)
          for (const e of [-8, 0, 5, 12]) {
            clean(toksPlain(distribToks(a, b, c, d, e)), `distrib ${a},${b},${c},${d},${e}`);
            const { K, C } = collapse(a, b, c, d);
            clean(collapsePlain(K, C, e), `collapse ${a},${b},${c},${d},${e}`);
          }
  // every rendering must be non-empty and contain an "="
  for (const a of as)
    for (const b of bs) {
      ok(cardPlain(a, b).length > 0, `empty card a=${a} b=${b}`);
      n++;
    }
  for (const c of cs)
    for (const d of ds) {
      ok(eq2Plain(c, d, 0).includes('='), `eq2 has no = : c=${c} d=${d}`);
      n++;
    }
  console.log(`5. symbolic rendering is clean ................... ${n.toLocaleString()} checks`);
}

/* ---- 6. Specific renderings a teacher would spot-check ------------------ */
{
  const cases = [
    [cardPlain(1, 3), 'x + 3'],
    [cardPlain(2, -1), `2x ${MINUS} 1`],
    [cardPlain(-1, 0), `${MINUS}x`],
    [cardPlain(0, 5), '5'],
    [cardPlain(0, 0), '0'],
    [cardPlain(1, 0), 'x'],
    [cardPlain(-2, -6), `${MINUS}2x ${MINUS} 6`],
    [toksPlain(cardToks(1, 3)), '(x + 3)'],
    [eq2Plain(1, 1, 9), 'x + y = 9'],
    [eq2Plain(3, 2, 12), '3x + 2y = 12'],
    [eq2Plain(0, 1, 9), 'y = 9'],
    [eq2Plain(-3, 1, 4), `${MINUS}3x + y = 4`],
    [eq2Plain(-1, 4, 0), `${MINUS}x + 4y = 0`],
    [toksPlain(distribToks(1, 3, 1, 1, 9)), 'x + x + 3 = 9'],
    [toksPlain(distribToks(2, -1, 3, 2, 12)), `3x + 4x ${MINUS} 2 = 12`],
    [collapsePlain(2, 3, 9), '2x + 3 = 9'],
    [collapsePlain(7, -2, 12), `7x ${MINUS} 2 = 12`],
    [collapsePlain(0, 1, 5), '1 = 5'],
    [collapsePlain(1, 0, 6), 'x = 6'],
    [toksPlain(solveToks('3')), 'x = 3'],
    [toksPlain(backSubToks(1, 3, '3', '6')), 'y = (3) + 3 = 6'],
    [toksPlain(backSubToks(2, -1, '2', '3')), `y = 2(2) ${MINUS} 1 = 3`],
    [toksPlain(checkToks(1, 1, '3', '6', 9)), '(3) + (6) = 9  ✓'],
    [toksPlain(checkToks(3, 2, '2', '3', 12)), '3(2) + 2(3) = 12  ✓'],
    [fracStr(frac(10, 3)), '10/3'],
    [fracStr(frac(-4, 2)), `${MINUS}2`],
    [fracStr(frac(6, -4)), `${MINUS}3/2`],
  ];
  for (const [got, want] of cases) ok(got === want, `render: got "${got}" want "${want}"`);
  console.log(`6. spot-check renderings ........................ ${cases.length} checks`);
}

/* ---- 7. The START system is the clean one the lesson promises ------------ */
{
  const s = solveSystem(START.a, START.b, START.c, START.d, START.e);
  ok(s.kind === 'one', 'START must have a unique solution');
  ok(s.K === 2 && s.C === 3, `START collapse should be 2x + 3 = 9, got K=${s.K} C=${s.C}`);
  ok(s.x.d === 1 && s.x.n === 3, `START x should be 3, got ${fracStr(s.x)}`);
  ok(s.y.d === 1 && s.y.n === 6, `START y should be 6, got ${fracStr(s.y)}`);
  ok(eq2Plain(START.c, START.d, START.e) === 'x + y = 9', 'START Eq 2 should read x + y = 9');
  ok(cardPlain(START.a, START.b) === 'x + 3', 'START card should read x + 3');
  // the step-3 question hard-codes 2(x + 3) = 2x + 6 — make it reachable
  const q = collapse(1, 3, 0, 2);
  ok(q.K === 2 && q.C === 6, 'the 2(x+3) = 2x+6 question must match the model');
  console.log(`7. START and lesson copy agree with the model .... 8 checks`);
}

/* ---- 8. The "make the x's vanish" preset is in range and does vanish ---- */
{
  ok(VANISH.a >= A.min && VANISH.a <= A.max, 'VANISH.a out of dial range');
  ok(VANISH.b >= B.min && VANISH.b <= B.max, 'VANISH.b out of dial range');
  ok(VANISH.c >= C_.min && VANISH.c <= C_.max, 'VANISH.c out of dial range');
  ok(VANISH.d >= D.min && VANISH.d <= D.max, 'VANISH.d out of dial range');
  ok(VANISH.e >= E.min && VANISH.e <= E.max, 'VANISH.e out of dial range');
  const v = solveSystem(VANISH.a, VANISH.b, VANISH.c, VANISH.d, VANISH.e);
  ok(v.K === 0, `VANISH must cancel the x's, got K=${v.K}`);
  ok(v.kind === 'none', `VANISH should give "no solution", got "${v.kind}"`);
  ok(collapsePlain(v.K, v.C, VANISH.e) === '1 = 5', `VANISH collapse should read 1 = 5, got "${collapsePlain(v.K, v.C, VANISH.e)}"`);
  // the copy tells the student to nudge e to 1 and see it become true
  const v2 = solveSystem(VANISH.a, VANISH.b, VANISH.c, VANISH.d, 1);
  ok(v2.kind === 'infinite', `nudging e to 1 should give "infinite", got "${v2.kind}"`);
  ok(collapsePlain(v2.K, v2.C, 1) === '1 = 1', 'nudged collapse should read 1 = 1');
  // and the step-6 question quotes "1 = 5" — it must be exactly what fires
  console.log(`8. the vanish preset behaves as the copy claims .. 10 checks`);
}

/* ---- 9. THE FALSE-STAMP PROOF ------------------------------------------- */
/* For every locked Eq 2 (c, d) and every target card (a*, b*), sweep the WHOLE
   (a, b) dial grid and assert the collapse matches iff the card is exactly the
   machine's. This is what makes CALIBRATED honest. */
{
  let n = 0;
  let falseStamps = 0;
  let missedStamps = 0;
  for (const c of cs)
    for (const d of ds)
      for (const at of as)
        for (const bt of bs) {
          const t = { a: at, b: bt, c, d, e: 0 };
          const th = collapse(at, bt, c, d);
          for (const a of as)
            for (const b of bs) {
              const me = collapse(a, b, c, d);
              const exact = a === at && b === bt;
              const matched = me.K === th.K && me.C === th.C;
              if (matched && !exact) falseStamps++;
              if (exact && !matched) missedStamps++;
              ok(matched === exact, `stamp: c=${c} d=${d} target=(${at},${bt}) tried=(${a},${b})`);
              // the meter must agree with the stamp at its extremes
              const err = calibError(a, b, t);
              ok((err < MATCH_ERR) === exact, `meter/stamp disagree: c=${c} d=${d} (${at},${bt}) vs (${a},${b})`);
              ok(Math.abs(err - Math.hypot(a - at, b - bt)) < 1e-9, `err should be dial distance: (${a},${b}) vs (${at},${bt})`);
              n += 3;
            }
        }
  ok(falseStamps === 0, `${falseStamps} FALSE stamps found`);
  ok(missedStamps === 0, `${missedStamps} MISSED stamps found`);
  console.log(`9. CALIBRATED cannot fire falsely ............... ${n.toLocaleString()} checks`);
  console.log(`     false stamps: ${falseStamps} · missed stamps: ${missedStamps}`);
}

/* ---- 10. Meter mapping is sane and monotone ----------------------------- */
{
  let n = 0;
  ok(matchPercent(0) === 100, 'exact match must read 100%');
  ok(Math.abs(matchPercent(1) - 44.44) < 0.1, `one unit off should read ~44%, got ${matchPercent(1).toFixed(1)}`);
  ok(matchPercent(2) < matchPercent(1), 'meter must fall as error grows');
  n += 3;
  let prev = 101;
  for (let err = 0; err <= 20; err += 0.25) {
    const p = matchPercent(err);
    ok(p >= 0 && p <= 100, `meter out of bounds at err=${err}: ${p}`);
    ok(p <= prev, `meter not monotone at err=${err}`);
    ok((p === 100) === (err === 0), `only an exact match may read 100%, err=${err}`);
    prev = p;
    n += 3;
  }
  console.log(`10. meter mapping is bounded and monotone ....... ${n.toLocaleString()} checks`);
}

/* ---- 11. The target generator only emits legal, solvable, fresh cards --- */
{
  let n = 0;
  let prev = null;
  for (let i = 0; i < 20000; i++) {
    const avoid = { a: as[i % as.length], b: bs[i % bs.length] };
    const t = makeTarget(prev, avoid);
    ok(t.a >= A.min && t.a <= A.max, `target a out of range: ${t.a}`);
    ok(t.b >= B.min && t.b <= B.max, `target b out of range: ${t.b}`);
    ok(t.c >= C_.min && t.c <= C_.max, `target c out of range: ${t.c}`);
    ok(t.d >= D.min && t.d <= D.max, `target d out of range: ${t.d}`);
    ok(t.e >= E.min && t.e <= E.max, `target e out of range: ${t.e}`);
    ok(t.a !== 0, 'target card must contain an x');
    ok(t.b !== 0, 'target card must have a constant to find');
    ok(t.c !== 0, 'target Eq 2 must be a genuine two-variable equation');
    ok(t.d >= 1, 'target d must be ≥ 1 — the uniqueness proof depends on it');
    ok(t.c + t.d * t.a !== 0, 'target collapse must keep its x');
    ok(!(t.a === avoid.a && t.b === avoid.b), 'target must not start already matched');
    if (prev) ok(!(t.a === prev.a && t.b === prev.b && t.c === prev.c && t.d === prev.d && t.e === prev.e), 'target repeated');
    // the challenge must be winnable: the machine's own card is on the dial grid
    ok(as.includes(t.a) && bs.includes(t.b), 'target card must be dial-reachable');
    const th = collapse(t.a, t.b, t.c, t.d);
    ok(th.K !== 0, 'target K must be non-zero');
    // Eq 2 as the student reads it must actually show an x term
    ok(eq2Plain(t.c, t.d, t.e).includes('x'), `locked Eq 2 shows no x: ${eq2Plain(t.c, t.d, t.e)}`);
    n += 15;
    prev = t;
  }
  console.log(`11. target generator emits legal cards .......... ${n.toLocaleString()} checks`);
  // the fallback must itself be a legal challenge, or the guard is a trapdoor
  ok(targetOk(FALLBACK_TARGET, null, null), 'FALLBACK_TARGET must be a legal challenge');
  {
    const fb = collapse(FALLBACK_TARGET.a, FALLBACK_TARGET.b, FALLBACK_TARGET.c, FALLBACK_TARGET.d);
    ok(fb.K === 7 && fb.C === -2, `FALLBACK_TARGET collapse should be K=7 C=−2, got K=${fb.K} C=${fb.C}`);
  }
}

/* ---- 12. Every target is uniquely solvable from what the student sees ---- */
/* The student sees Eq 2 and the machine's collapsed equation. That is enough
   iff a = (K* − c)/d and b = (C*)/d land back on the dial grid — i.e. the
   challenge is never unwinnable and never ambiguous. */
{
  let n = 0;
  for (const c of cs)
    for (const d of ds)
      for (const at of as)
        for (const bt of bs) {
          const th = collapse(at, bt, c, d);
          const aBack = (th.K - c) / d;
          const bBack = th.C / d;
          ok(Number.isInteger(aBack) && aBack === at, `inverting K failed: c=${c} d=${d} a*=${at}`);
          ok(Number.isInteger(bBack) && bBack === bt, `inverting C failed: d=${d} b*=${bt}`);
          n += 2;
        }
  console.log(`12. the collapse inverts to exactly one card .... ${n.toLocaleString()} checks`);
}

/* ---- 13. No dial combination can crash or produce a non-finite number --- */
{
  let n = 0;
  for (const a of as)
    for (const b of bs)
      for (const c of cs)
        for (const d of ds)
          for (const e of es) {
            const s = solveSystem(a, b, c, d, e);
            if (s.kind === 'one') {
              ok(Number.isFinite(s.x.n) && Number.isFinite(s.x.d) && s.x.d !== 0, `x not finite: ${a},${b},${c},${d},${e}`);
              ok(Number.isFinite(s.y.n) && Number.isFinite(s.y.d) && s.y.d !== 0, `y not finite: ${a},${b},${c},${d},${e}`);
              ok(Number.isSafeInteger(s.x.n) && Number.isSafeInteger(s.y.n), `overflow risk: ${a},${b},${c},${d},${e}`);
              const str = `${fracStr(s.x)}${fracStr(s.y)}`;
              ok(!str.includes('NaN') && !str.includes('Infinity'), `bad number rendered: ${a},${b},${c},${d},${e}`);
              n += 4;
            }
            ok(Number.isFinite(s.K) && Number.isFinite(s.C), `K/C not finite: ${a},${b},${c},${d},${e}`);
            n++;
          }
  console.log(`13. no dial combo produces a bad number ......... ${n.toLocaleString()} checks`);
}

/* ---- verdict ------------------------------------------------------------ */
console.log('\n' + '='.repeat(56));
console.log(`total: ${checks.toLocaleString()} checks · ${fail} failures`);
console.log(fail === 0 ? '✓ ALL PASS' : `✗ ${fail} FAILURES`);
process.exit(fail === 0 ? 0 : 1);
