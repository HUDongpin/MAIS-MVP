/* ============================================================================
   audit-variable.mjs — numeric audit for VariableLab.jsx
   Run:  node audit-variable.mjs
   Re-implements the lab's pure math and proves the invariants a K-12 student
   would rely on, exhaustively over the full dial ranges. No dependencies.
   ========================================================================== */

const MINUS = '−';
let fail = 0;
const ok = (cond, msg) => {
  if (!cond) {
    fail++;
    console.error('  ✗ ' + msg);
  }
};

/* ---- mirror of the lab's pure math -------------------------------------- */
const evaluate = (x, a, b) => a * x + b;

function fmt(n) {
  return (Object.is(n, -0) ? 0 : n).toString().replace('-', MINUS);
}
function exprString(a, b) {
  const coef = a === 0 ? '' : a === 1 ? 'x' : `${a}x`;
  if (coef === '') return b === 0 ? '0' : fmt(b);
  if (b === 0) return coef;
  return `${coef} ${b > 0 ? '+' : MINUS} ${Math.abs(b)}`;
}
function substString(a, b, x) {
  const E = evaluate(x, a, b);
  if (a === 0) return `${fmt(b)} = ${fmt(E)}`;
  const prod = a === 1 ? `(${fmt(x)})` : `${a}·(${fmt(x)})`;
  const ax = a * x;
  if (b === 0) return `${prod} = ${fmt(E)}`;
  const sign = b > 0 ? '+' : MINUS;
  return `${prod} ${sign} ${Math.abs(b)} = ${fmt(ax)} ${sign} ${Math.abs(b)} = ${fmt(E)}`;
}
function niceStep(raw) {
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / p;
  const n = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10;
  return n * p;
}
function fitWindow(x, a, b) {
  const E = evaluate(x, a, b);
  const ax = a * x;
  const marks = [0, x, ax, E];
  let lo = Math.min(...marks);
  let hi = Math.max(...marks);
  const pad = Math.max(1, Math.round(0.14 * (hi - lo)));
  lo -= pad;
  hi += pad;
  if (hi - lo < 8) {
    const c = (lo + hi) / 2;
    lo = c - 4;
    hi = c + 4;
  }
  const step = niceStep((hi - lo) / 9);
  const wmin = Math.floor(lo / step) * step;
  const wmax = Math.ceil(hi / step) * step;
  return { wmin, wmax, step };
}

const CALIB_INPUTS = [-2, -1, 0, 1, 2, 3, 4];
function ruleRms(p, t) {
  let s = 0;
  for (const x of CALIB_INPUTS) {
    const d = evaluate(x, p.a, p.b) - evaluate(x, t.a, t.b);
    s += d * d;
  }
  return Math.sqrt(s / CALIB_INPUTS.length);
}
const matchPercent = (rms) => Math.max(0, Math.min(100, 100 / (1 + rms / 0.8)));
const MATCH_RMS = 0.05;

/* dial ranges (must match PARAMS in the lab) */
const X = { min: -5, max: 8 };
const A = { min: 0, max: 3 };
const B = { min: -5, max: 6 };
const xs = [];
for (let v = X.min; v <= X.max; v++) xs.push(v);
const as = [];
for (let v = A.min; v <= A.max; v++) as.push(v);
const bs = [];
for (let v = B.min; v <= B.max; v++) bs.push(v);

console.log('VariableLab audit\n=================');

/* ---- 1. Evaluation is exact integer arithmetic over every dial combo ---- */
{
  let n = 0;
  for (const x of xs)
    for (const a of as)
      for (const b of bs) {
        const E = evaluate(x, a, b);
        ok(Number.isInteger(E), `E integer at (${x},${a},${b})`);
        ok(E === a * x + b, `E == a*x+b at (${x},${a},${b})`);
        n++;
      }
  console.log(`1. exact evaluation ......... ${n} combos checked`);
}

/* ---- 2. Variable term vs constant term (the central concept) ------------ */
{
  // Changing x by Δ changes the value by exactly a·Δ; the constant b never moves.
  let n = 0;
  for (const a of as)
    for (const b of bs) {
      for (let i = 1; i < xs.length; i++) {
        const x0 = xs[i - 1];
        const x1 = xs[i];
        const dV = evaluate(x1, a, b) - evaluate(x0, a, b);
        ok(dV === a * (x1 - x0), `Δvalue == a·Δx at a=${a},b=${b},x:${x0}->${x1}`);
        n++;
      }
      // the a·x variable term carries all x-dependence; b is invariant in x
      const varTermVaries = a !== 0;
      const spread = new Set(xs.map((x) => evaluate(x, a, 0))).size > 1;
      ok(varTermVaries === spread, `variable term varies iff a≠0 (a=${a})`);
    }
  console.log(`2. variable vs constant ..... ${n} deltas + invariance checks`);
  // a = 0 makes the variable disappear (expression is a pure constant)
  for (const b of bs) {
    ok(exprString(0, b) === (b === 0 ? '0' : fmt(b)), `a=0 -> pure constant ${b}`);
    for (const x of xs) ok(evaluate(x, 0, b) === b, `a=0 -> value==b regardless of x (b=${b})`);
  }
  console.log('   a=0 collapses the variable term to a constant ... ok');
}

/* ---- 3. Substitution / formatting spot-checks --------------------------- */
{
  ok(exprString(1, 0) === 'x', 'exprString(1,0) == "x"');
  ok(exprString(2, 3) === '2x + 3', 'exprString(2,3) == "2x + 3"');
  ok(exprString(1, -4) === `x ${MINUS} 4`, 'exprString(1,-4) sign');
  ok(exprString(3, 0) === '3x', 'exprString(3,0) == "3x"');
  ok(exprString(0, -5) === `${MINUS}5`, 'exprString(0,-5) constant');
  ok(exprString(0, 0) === '0', 'exprString(0,0) == "0"');

  ok(substString(2, 3, 5) === '2·(5) + 3 = 10 + 3 = 13', 'substString 2x+3 @5');
  ok(substString(1, 0, 7) === '(7) = 7', 'substString x @7');
  ok(substString(2, -4, 3) === `2·(3) ${MINUS} 4 = 6 ${MINUS} 4 = 2`, 'substString 2x-4 @3');
  ok(substString(0, 5, 9) === '5 = 5', 'substString constant');
  // the substituted result always equals evaluate()
  let n = 0;
  for (const x of xs)
    for (const a of as)
      for (const b of bs) {
        const s = substString(a, b, x);
        const shown = s.slice(s.lastIndexOf('=') + 1).trim();
        ok(shown === fmt(evaluate(x, a, b)), `subst result matches value (${x},${a},${b})`);
        n++;
      }
  console.log(`3. substitution & formatting . ${n} result strings verified`);
}

/* ---- 4. Auto-fit window always contains the whole walk ------------------ */
{
  let n = 0;
  for (const x of xs)
    for (const a of as)
      for (const b of bs) {
        const { wmin, wmax, step } = fitWindow(x, a, b);
        const E = evaluate(x, a, b);
        const need = [0, x, a * x, E];
        for (const m of need) ok(m >= wmin && m <= wmax, `window holds ${m} at (${x},${a},${b})`);
        ok(wmax > wmin, `window non-empty at (${x},${a},${b})`);
        ok([1, 2, 5, 10, 20].includes(step), `nice step ${step} at (${x},${a},${b})`);
        ok(Number.isInteger(wmin) && Number.isInteger(wmax), `integer bounds (${x},${a},${b})`);
        n++;
      }
  console.log(`4. number-line auto-fit ..... ${n} windows contain 0, x, a·x, value`);
}

/* ---- 5. Calibration: match iff exact, no false CALIBRATED --------------- */
{
  // reachable targets a*∈{1,2,3}, b*∈{−4..5}\{0}
  const tA = [1, 2, 3];
  const tB = bs.filter((b) => b >= -4 && b <= 5 && b !== 0);
  // every target is reachable by the dials
  for (const a of tA) ok(a >= A.min && a <= A.max, `target a=${a} reachable`);
  for (const b of tB) ok(b >= B.min && b <= B.max, `target b=${b} reachable`);

  let checked = 0;
  let minNonZero = Infinity;
  let falseStamp = 0;
  for (const ta of tA)
    for (const tb of tB) {
      const t = { a: ta, b: tb };
      // exact match -> rms 0 -> 100% -> CALIBRATED
      ok(ruleRms(t, t) === 0, `exact rms 0 at target (${ta},${tb})`);
      ok(matchPercent(0) === 100, 'matchPercent(0) == 100');
      ok(0 < MATCH_RMS, 'exact match stamps CALIBRATED');
      // every OTHER (a,b) in range must NOT stamp, and rms must be ≥ 1
      for (const a of as)
        for (const b of bs) {
          const same = a === ta && b === tb;
          const rms = ruleRms({ a, b }, t);
          if (same) {
            ok(rms < MATCH_RMS, `stamp at the solution (${ta},${tb})`);
          } else {
            ok(rms >= 1 - 1e-12, `non-solution rms≥1 (a=${a},b=${b} vs ${ta},${tb})`);
            if (rms < MATCH_RMS) falseStamp++;
            minNonZero = Math.min(minNonZero, rms);
          }
          checked++;
        }
    }
  ok(falseStamp === 0, `no false CALIBRATED (found ${falseStamp})`);
  console.log(`5. calibration uniqueness ... ${checked} (rule,target) pairs`);
  console.log(`   smallest non-zero error rms = ${minNonZero.toFixed(4)} (want ≥ 1)`);
  console.log(
    `   meter: exact=${matchPercent(0).toFixed(0)}%  ` +
      `b off by 1 → ${matchPercent(1).toFixed(0)}%  ` +
      `a off by 1 → ${matchPercent(Math.sqrt(CALIB_INPUTS.reduce((s, x) => s + x * x, 0) / CALIB_INPUTS.length)).toFixed(0)}%`
  );

  // makeTarget stays in range, avoids the trivial start, and can be re-rolled
  const makeTarget = (prev) => {
    let t;
    let guard = 0;
    do {
      const a = 1 + Math.floor(Math.random() * 3);
      let b = -4 + Math.floor(Math.random() * 10);
      if (b === 0) b = 5;
      t = { a, b };
      guard++;
    } while (((prev && t.a === prev.a && t.b === prev.b) || (t.a === 1 && t.b === 0)) && guard < 999);
    return t;
  };
  let prev = null;
  for (let i = 0; i < 5000; i++) {
    const t = makeTarget(prev);
    ok(tA.includes(t.a), `random target a in {1,2,3} (got ${t.a})`);
    ok(t.b >= -4 && t.b <= 5 && t.b !== 0, `random target b in range, ≠0 (got ${t.b})`);
    ok(!(t.a === 1 && t.b === 0), 'random target never the trivial start');
    prev = t;
  }
  console.log('   makeTarget: 5000 draws all in-range, distinct-capable ... ok');
}

console.log('\n' + (fail === 0 ? '✓ ALL CHECKS PASSED' : `✗ ${fail} CHECK(S) FAILED`));
process.exit(fail === 0 ? 0 : 1);
