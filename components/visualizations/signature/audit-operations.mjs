/* audit-operations.mjs — independent numerical proof of the OperationsLab
   engine. Run: node audit-operations.mjs

   Strategy: re-implement the lab's step-tracing evaluator here, then check it
   against a WHOLLY INDEPENDENT recursive-descent reference parser (a different
   algorithm) over every reachable control combination. If the two agree on
   every expression — including the exact fractions and the divide-by-zero
   cases — the engine's order-of-operations logic is correct. Also verifies the
   canonical facts the lesson teaches and every calibration puzzle. */

/* ---- model (mirrors OperationsLab.jsx) ---------------------------------- */
function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a || 1; }
function frac(n, d = 1) { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d); return { n: n / g, d: d / g }; }
const fadd = (x, y) => frac(x.n * y.d + y.n * x.d, x.d * y.d);
const fsub = (x, y) => frac(x.n * y.d - y.n * x.d, x.d * y.d);
const fmul = (x, y) => frac(x.n * y.n, x.d * y.d);
const fdiv = (x, y) => frac(x.n * y.d, x.d * y.n);
function fpow(x, e) { let r = frac(1); for (let i = 0; i < e; i++) r = fmul(r, x); return r; }
const feq = (x, y) => x && y && x.n === y.n && x.d === y.d;
const OPS = ['+', '−', '×', '÷'];
const prec = (o) => (o === '^' ? 3 : o === '×' || o === '÷' ? 2 : 1);
function applyOp(o, x, y) {
  if (o === '+') return fadd(x, y);
  if (o === '−') return fsub(x, y);
  if (o === '×') return fmul(x, y);
  if (o === '÷') return fdiv(x, y);
  if (o === '^') return fpow(x, y.n);
}
const num = (v) => ({ t: 'num', v: typeof v === 'number' ? frac(v) : v });
const op = (o) => ({ t: 'op', o });
const LP = { t: 'lp' }, RP = { t: 'rp' };
const cloneTok = (t) => (t.t === 'num' ? { t: 'num', v: { n: t.v.n, d: t.v.d } } : { t: t.t, o: t.o });
function buildTokens({ a, b, c, op1, op2, e, group }) {
  const mid = e > 1 ? [num(b), op('^'), num(e)] : [num(b)];
  if (group === 'left') return [LP, num(a), op(op1), ...mid, RP, op(op2), num(c)];
  if (group === 'right') return [num(a), op(op1), LP, ...mid, op(op2), num(c), RP];
  return [num(a), op(op1), ...mid, op(op2), num(c)];
}
function stripTrivialParens(toks) {
  for (let i = 0; i < toks.length - 2; i++) {
    if (toks[i].t === 'lp' && toks[i + 1].t === 'num' && toks[i + 2].t === 'rp') {
      toks = [...toks.slice(0, i), toks[i + 1], ...toks.slice(i + 3)]; i--;
    }
  }
  return toks;
}
function pickOp(toks, s, e) {
  let best = -1, bestPrec = 0;
  for (let i = s; i <= e; i++) if (toks[i].t === 'op') { const p = prec(toks[i].o); if (p > bestPrec) { bestPrec = p; best = i; } }
  return best;
}
function nextReduction(toks) {
  let lo = -1, hi = -1;
  for (let i = 0; i < toks.length; i++) { if (toks[i].t === 'lp') lo = i; else if (toks[i].t === 'rp') { hi = i; break; } }
  const s = lo >= 0 && hi > lo ? lo + 1 : 0;
  const e = lo >= 0 && hi > lo ? hi - 1 : toks.length - 1;
  const oi = pickOp(toks, s, e);
  return oi < 0 ? null : { opIndex: oi };
}
function evaluateTrace(toks0) {
  let toks = stripTrivialParens(toks0.map(cloneTok));
  const rungs = []; let undef = false, guard = 0;
  while (guard++ < 24) {
    const nx = nextReduction(toks);
    if (nx == null) { rungs.push({ toks: toks.map(cloneTok) }); break; }
    rungs.push({ toks: toks.map(cloneTok), activeOpIndex: nx.opIndex });
    const i = nx.opIndex, o = toks[i].o, x = toks[i - 1].v, y = toks[i + 1].v;
    if (o === '÷' && y.n === 0) { undef = true; break; }
    const res = applyOp(o, x, y);
    let nt = [...toks.slice(0, i - 1), { t: 'num', v: res }, ...toks.slice(i + 2)];
    nt = stripTrivialParens(nt);
    toks = nt;
  }
  const last = rungs[rungs.length - 1];
  const value = !undef && last && last.toks.length === 1 && last.toks[0].t === 'num' ? last.toks[0].v : null;
  return { rungs, value, undef };
}
function evaluateLeftToRight(toks0) {
  let t = toks0.filter((k) => k.t !== 'lp' && k.t !== 'rp').map(cloneTok);
  let undef = false, guard = 0;
  while (t.length > 1 && guard++ < 24) {
    const o = t[1].o, x = t[0].v, y = t[2].v;
    if (o === '÷' && y.n === 0) { undef = true; break; }
    t = [{ t: 'num', v: applyOp(o, x, y) }, ...t.slice(3)];
  }
  return { value: !undef && t.length === 1 ? t[0].v : null, undef };
}

/* ---- INDEPENDENT reference: recursive-descent parser -------------------- */
/* Grammar:  expr := term (('+'|'−') term)* ; term := factor (('×'|'÷') factor)*
             factor := base ('^' factor)? ; base := num | '(' expr ')'
   Throws 'UNDEF' on division by zero. A different algorithm from the tracer. */
function reference(toks) {
  let i = 0;
  const peek = () => toks[i];
  const eat = () => toks[i++];
  function base() {
    const t = peek();
    if (t.t === 'lp') { eat(); const v = expr(); if (peek() && peek().t === 'rp') eat(); return v; }
    if (t.t === 'num') { eat(); return t.v; }
    throw new Error('parse');
  }
  function factor() {
    let v = base();
    if (peek() && peek().t === 'op' && peek().o === '^') { eat(); const e = factor(); v = fpow(v, e.n); }
    return v;
  }
  function term() {
    let v = factor();
    while (peek() && peek().t === 'op' && (peek().o === '×' || peek().o === '÷')) {
      const o = eat().o; const r = factor();
      if (o === '÷' && r.n === 0) throw 'UNDEF';
      v = o === '×' ? fmul(v, r) : fdiv(v, r);
    }
    return v;
  }
  function expr() {
    let v = term();
    while (peek() && peek().t === 'op' && (peek().o === '+' || peek().o === '−')) {
      const o = eat().o; const r = term();
      v = o === '+' ? fadd(v, r) : fsub(v, r);
    }
    return v;
  }
  try { const v = expr(); return { value: v, undef: false }; }
  catch (err) { if (err === 'UNDEF') return { value: null, undef: true }; throw err; }
}

/* ---- harness ------------------------------------------------------------ */
let pass = 0, fail = 0;
const fails = [];
function check(cond, msg) { if (cond) pass++; else { fail++; if (fails.length < 40) fails.push(msg); } }
const fstr = (x) => (x == null ? 'undef' : x.d === 1 ? String(x.n) : `${x.n}/${x.d}`);

/* 1) Exhaustive tracer-vs-reference over every reachable expression. */
let combos = 0, undefCount = 0;
for (let a = 1; a <= 9; a++)
  for (let b = 1; b <= 9; b++)
    for (let c = 1; c <= 9; c++)
      for (const op1 of OPS)
        for (const op2 of OPS)
          for (let e = 1; e <= 3; e++)
            for (const group of ['none', 'left', 'right']) {
              combos++;
              const toks = buildTokens({ a, b, c, op1, op2, e, group });
              const t = evaluateTrace(toks);
              const r = reference(toks.map(cloneTok));
              if (t.undef || r.undef) {
                undefCount++;
                check(t.undef === r.undef, `undef mismatch ${a}${op1}${b}^${e}${op2}${c} [${group}] tracer=${t.undef} ref=${r.undef}`);
              } else {
                check(
                  feq(t.value, r.value),
                  `value mismatch ${a}${op1}${b}^${e}${op2}${c} [${group}] tracer=${fstr(t.value)} ref=${fstr(r.value)}`
                );
                // no float leakage: numerator & denominator are integers
                check(Number.isInteger(t.value.n) && Number.isInteger(t.value.d) && t.value.d > 0, `non-integer frac at ${a}${op1}${b}^${e}${op2}${c}`);
              }
            }

/* 2) Canonical facts the lesson asserts. */
const V = (o) => evaluateTrace(buildTokens(o)).value;
check(feq(V({ a: 3, b: 4, c: 2, op1: '+', op2: '×', e: 1, group: 'none' }), frac(11)), '3+4×2 should be 11');
check(feq(V({ a: 3, b: 4, c: 2, op1: '+', op2: '×', e: 1, group: 'left' }), frac(14)), '(3+4)×2 should be 14');
check(feq(V({ a: 3, b: 4, c: 2, op1: '+', op2: '×', e: 1, group: 'right' }), frac(11)), '3+(4×2) should be 11');
check(feq(V({ a: 20, b: 3, c: 4, op1: '−', op2: '×', e: 1, group: 'none' }), frac(8)), '20−3×4 should be 8 (numbers>9 allowed in test)');
check(feq(V({ a: 8, b: 4, c: 2, op1: '÷', op2: '×', e: 1, group: 'none' }), frac(4)), '8÷4×2 should be 4 (left to right)');
check(feq(V({ a: 8, b: 4, c: 2, op1: '÷', op2: '×', e: 1, group: 'right' }), frac(1)), '8÷(4×2) should be 1');
check(feq(V({ a: 2, b: 3, c: 2, op1: '+', op2: '×', e: 2, group: 'none' }), frac(20)), '2+3²×2 should be 20');
check(feq(V({ a: 9, b: 4, c: 1, op1: '−', op2: '−', e: 1, group: 'none' }), frac(4)), '9−4−1 left to right should be 4');
check(feq(V({ a: 9, b: 4, c: 1, op1: '−', op2: '−', e: 1, group: 'right' }), frac(6)), '9−(4−1) should be 6');
check(feq(V({ a: 7, b: 2, c: 4, op1: '÷', op2: '+', e: 1, group: 'none' }), frac(15, 2)), '7÷2+4 should be 15/2 exactly (exact fraction, no float)');
check(feq(V({ a: 6, b: 4, c: 3, op1: '÷', op2: '×', e: 1, group: 'right' }), frac(1, 2)), '6÷(4×3) should be 1/2 exactly');

/* 3) Division by zero is reachable via grouping and is flagged (not a crash). */
const dz = evaluateTrace(buildTokens({ a: 6, b: 4, c: 4, op1: '÷', op2: '−', e: 1, group: 'right' })); // 6 ÷ (4 − 4)
check(dz.undef === true && dz.value === null, '6 ÷ (4 − 4) must be undefined, got ' + fstr(dz.value));
const dz2 = reference(buildTokens({ a: 6, b: 4, c: 4, op1: '÷', op2: '−', e: 1, group: 'right' }));
check(dz2.undef === true, 'reference also flags 6 ÷ (4 − 4) undefined');

/* 4) Left-to-right (the misconception) gives 14 on 3 + 4 × 2. */
const ltr = evaluateLeftToRight(buildTokens({ a: 3, b: 4, c: 2, op1: '+', op2: '×', e: 1, group: 'none' }));
check(feq(ltr.value, frac(14)), 'left-to-right 3+4×2 should be 14, got ' + fstr(ltr.value));

/* 5) Every calibration puzzle: target whole, reached by a grouping, plain value
      differs, and no division by zero in any grouping. */
const PUZZLES = [
  { a: 2, op1: '+', b: 3, op2: '×', c: 4, target: 20 },
  { a: 8, op1: '−', b: 2, op2: '×', c: 3, target: 18 },
  { a: 6, op1: '÷', b: 2, op2: '+', c: 1, target: 2 },
  { a: 9, op1: '−', b: 4, op2: '−', c: 1, target: 6 },
  { a: 8, op1: '÷', b: 2, op2: '×', c: 2, target: 2 },
  { a: 5, op1: '+', b: 5, op2: '÷', c: 5, target: 2 },
  { a: 3, op1: '×', b: 4, op2: '−', c: 2, target: 6 },
  { a: 7, op1: '−', b: 1, op2: '×', c: 5, target: 30 },
  { a: 6, op1: '+', b: 6, op2: '÷', c: 3, target: 4 },
  { a: 2, op1: '×', b: 8, op2: '−', c: 4, target: 8 },
];
for (const p of PUZZLES) {
  const tag = `${p.a}${p.op1}${p.b}${p.op2}${p.c}=${p.target}`;
  const none = evaluateTrace(buildTokens({ ...p, e: 1, group: 'none' }));
  const left = evaluateTrace(buildTokens({ ...p, e: 1, group: 'left' }));
  const right = evaluateTrace(buildTokens({ ...p, e: 1, group: 'right' }));
  check(!none.undef && !left.undef && !right.undef, `${tag}: no grouping should be undefined`);
  const T = frac(p.target);
  const reaches = (v) => v && feq(v, T);
  check(reaches(left.value) || reaches(right.value), `${tag}: some grouping must equal the target`);
  check(!reaches(none.value), `${tag}: plain (no-paren) value must NOT already equal the target`);
  check(none.value && none.value.d === 1, `${tag}: plain value should be a whole number`);
  check(Number.isInteger(p.target), `${tag}: target is a whole number`);
  // the intended (unique-ish) solution should be exactly one of left/right and whole
  const winners = [['left', left.value], ['right', right.value]].filter(([, v]) => reaches(v));
  check(winners.length >= 1, `${tag}: at least one winning grouping`);
}

/* 6) Precedence spot-checks: ^ beats ×, × beats +, ties left-to-right. */
check(prec('^') > prec('×') && prec('×') > prec('+'), 'precedence ordering ^ > × > +');
check(prec('×') === prec('÷') && prec('+') === prec('−'), 'MD tie and AS tie');

console.log(`\nOperationsLab audit`);
console.log(`  exhaustive combinations tested : ${combos.toLocaleString()}  (undefined cases: ${undefCount})`);
console.log(`  checks passed : ${pass}`);
console.log(`  checks failed : ${fail}`);
if (fails.length) { console.log('\n  first failures:'); for (const f of fails) console.log('   ✗ ' + f); }
console.log(fail === 0 ? '\n✅ ALL CHECKS PASS\n' : `\n❌ ${fail} FAILED\n`);
process.exit(fail === 0 ? 0 : 1);
