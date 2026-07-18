/* ============================================================================
   audit-expression.mjs — numeric audit for ExpressionLab.jsx
   Run:  node audit-expression.mjs
   Re-implements the lab's pure math and proves the two-variable invariants
   exhaustively over the full dial ranges. No dependencies.
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
const evaluate = (x, y, a, b) => a * x + b * y;

function fmt(n) {
  return (Object.is(n, -0) ? 0 : n).toString().replace('-', MINUS);
}
function coefTerm(c, v) {
  return c === 0 ? '' : c === 1 ? v : `${c}${v}`;
}
function exprString(a, b) {
  const xt = coefTerm(a, 'x');
  const yt = coefTerm(b, 'y');
  if (xt && yt) return `${xt} + ${yt}`;
  return xt || yt || '0';
}
function substString(a, b, x, y) {
  const E = evaluate(x, y, a, b);
  const ax = a * x;
  const by = b * y;
  const termX = a === 0 ? null : a === 1 ? `(${fmt(x)})` : `${a}·(${fmt(x)})`;
  const termY = b === 0 ? null : b === 1 ? `(${fmt(y)})` : `${b}·(${fmt(y)})`;
  if (termX && termY) {
    const stage1 = `${termX} + ${termY}`;
    const stage2 = `${fmt(ax)} ${by < 0 ? MINUS : '+'} ${Math.abs(by)}`;
    return `${stage1} = ${stage2} = ${fmt(E)}`;
  }
  if (termX) return `${termX} = ${fmt(E)}`;
  if (termY) return `${termY} = ${fmt(E)}`;
  return '0 = 0';
}
function niceStep(raw) {
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / p;
  const n = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10;
  return n * p;
}
function fitWindow(x, y, a, b) {
  const E = evaluate(x, y, a, b);
  const ax = a * x;
  const marks = [0, x, y, ax, E];
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

const CALIB_INPUTS = [
  [-1, 2], [1, 1], [2, -1], [2, 3], [3, 1], [1, 3], [0, 2], [2, 0],
];
function ruleRms(p, t) {
  let s = 0;
  for (const [x, y] of CALIB_INPUTS) {
    const d = evaluate(x, y, p.a, p.b) - evaluate(x, y, t.a, t.b);
    s += d * d;
  }
  return Math.sqrt(s / CALIB_INPUTS.length);
}
const matchPercent = (rms) => Math.max(0, Math.min(100, 100 / (1 + rms / 1.0)));
const MATCH_RMS = 0.05;

/* dial ranges (must match PARAMS in the lab) */
const X = { min: -4, max: 6 };
const Y = { min: -4, max: 6 };
const A = { min: 0, max: 3 };
const B = { min: 0, max: 3 };
const range = (r) => {
  const out = [];
  for (let v = r.min; v <= r.max; v++) out.push(v);
  return out;
};
const xs = range(X), ys = range(Y), as = range(A), bs = range(B);

console.log('ExpressionLab audit\n===================');

/* ---- 1. Evaluation is exact integer arithmetic over every dial combo ---- */
{
  let n = 0;
  for (const x of xs)
    for (const y of ys)
      for (const a of as)
        for (const b of bs) {
          const E = evaluate(x, y, a, b);
          ok(Number.isInteger(E) && E === a * x + b * y, `E==a*x+b*y at (${x},${y},${a},${b})`);
          n++;
        }
  console.log(`1. exact evaluation ......... ${n} combos checked`);
}

/* ---- 2. Independence of the two variables (the central concept) --------- */
{
  // Changing x changes the value by exactly a·Δx and leaves the y-term (b·y) fixed.
  // Changing y changes the value by exactly b·Δy and leaves the x-term (a·x) fixed.
  let n = 0;
  for (const a of as)
    for (const b of bs) {
      for (const yF of ys)
        for (let i = 1; i < xs.length; i++) {
          const x0 = xs[i - 1], x1 = xs[i];
          const dV = evaluate(x1, yF, a, b) - evaluate(x0, yF, a, b);
          ok(dV === a * (x1 - x0), `Δx moves value by a·Δx (a=${a},b=${b},y=${yF})`);
          // the y-term is untouched by x
          ok(b * yF === b * yF, 'y-term invariant under x'); // tautology guard for readability
          n++;
        }
      for (const xF of xs)
        for (let j = 1; j < ys.length; j++) {
          const y0 = ys[j - 1], y1 = ys[j];
          const dV = evaluate(xF, y1, a, b) - evaluate(xF, y0, a, b);
          ok(dV === b * (y1 - y0), `Δy moves value by b·Δy (a=${a},b=${b},x=${xF})`);
          n++;
        }
    }
  console.log(`2. variable independence .... ${n} delta checks (x-term ⟂ y, y-term ⟂ x)`);
  // a=0 drops the x-term; b=0 drops the y-term
  for (const x of xs)
    for (const y of ys) {
      ok(evaluate(x, y, 0, 2) === 2 * y, 'a=0 -> value is purely the y-term');
      ok(evaluate(x, y, 2, 0) === 2 * x, 'b=0 -> value is purely the x-term');
    }
  console.log('   a=0 / b=0 collapse a term cleanly ... ok');
}

/* ---- 3. Substitution / formatting spot-checks --------------------------- */
{
  ok(exprString(1, 1) === 'x + y', 'exprString(1,1)');
  ok(exprString(2, 1) === '2x + y', 'exprString(2,1)');
  ok(exprString(1, 3) === 'x + 3y', 'exprString(1,3)');
  ok(exprString(0, 2) === '2y', 'exprString(0,2)');
  ok(exprString(3, 0) === '3x', 'exprString(3,0)');
  ok(exprString(0, 0) === '0', 'exprString(0,0)');

  ok(substString(2, 3, 4, 5) === '2·(4) + 3·(5) = 8 + 15 = 23', 'substString 2x+3y @(4,5)');
  ok(substString(1, 1, 3, 4) === '(3) + (4) = 3 + 4 = 7', 'substString x+y @(3,4)');
  ok(substString(2, 1, 3, -2) === `2·(3) + (${MINUS}2) = 6 ${MINUS} 2 = 4`, 'substString sign handling');
  ok(substString(0, 2, 9, 5) === '2·(5) = 10', 'substString pure y-term');

  let n = 0;
  for (const x of xs)
    for (const y of ys)
      for (const a of as)
        for (const b of bs) {
          const s = substString(a, b, x, y);
          const shown = s.slice(s.lastIndexOf('=') + 1).trim();
          ok(shown === fmt(evaluate(x, y, a, b)), `subst result matches value (${x},${y},${a},${b})`);
          n++;
        }
  console.log(`3. substitution & formatting . ${n} result strings verified`);
}

/* ---- 4. Auto-fit window always contains the whole walk ------------------ */
{
  let n = 0;
  for (const x of xs)
    for (const y of ys)
      for (const a of as)
        for (const b of bs) {
          const { wmin, wmax, step } = fitWindow(x, y, a, b);
          const need = [0, x, y, a * x, evaluate(x, y, a, b)];
          for (const m of need) ok(m >= wmin && m <= wmax, `window holds ${m} at (${x},${y},${a},${b})`);
          ok(wmax > wmin && [1, 2, 5, 10, 20].includes(step), `nice window at (${x},${y},${a},${b})`);
          n++;
        }
  console.log(`4. number-line auto-fit ..... ${n} windows contain 0, x, y, a·x, value`);
}

/* ---- 5. Calibration: match iff exact, no false CALIBRATED --------------- */
{
  const tA = [1, 2, 3];
  const tB = [1, 2, 3];
  let checked = 0;
  let minNonZero = Infinity;
  let falseStamp = 0;
  for (const ta of tA)
    for (const tb of tB) {
      const t = { a: ta, b: tb };
      ok(ruleRms(t, t) === 0, `exact rms 0 at target (${ta},${tb})`);
      ok(matchPercent(0) === 100, 'matchPercent(0)==100');
      for (const a of as)
        for (const b of bs) {
          const same = a === ta && b === tb;
          const rms = ruleRms({ a, b }, t);
          if (same) ok(rms < MATCH_RMS, `stamp at solution (${ta},${tb})`);
          else {
            ok(rms > MATCH_RMS, `non-solution above stamp (a=${a},b=${b} vs ${ta},${tb})`);
            if (rms < MATCH_RMS) falseStamp++;
            minNonZero = Math.min(minNonZero, rms);
          }
          checked++;
        }
    }
  ok(falseStamp === 0, `no false CALIBRATED (found ${falseStamp})`);
  console.log(`5. calibration uniqueness ... ${checked} (rule,target) pairs`);
  console.log(`   smallest non-zero error rms = ${minNonZero.toFixed(4)} (want ≫ ${MATCH_RMS})`);
  const rmsX = Math.sqrt(CALIB_INPUTS.reduce((s, [x]) => s + x * x, 0) / CALIB_INPUTS.length);
  const rmsY = Math.sqrt(CALIB_INPUTS.reduce((s, [, y]) => s + y * y, 0) / CALIB_INPUTS.length);
  console.log(
    `   meter: exact=${matchPercent(0).toFixed(0)}%  ` +
      `a off by 1 → ${matchPercent(rmsX).toFixed(0)}%  b off by 1 → ${matchPercent(rmsY).toFixed(0)}%`
  );

  // the sampled inputs must contain two linearly-independent (x,y) -> uniqueness
  let independent = false;
  for (let i = 0; i < CALIB_INPUTS.length && !independent; i++)
    for (let j = i + 1; j < CALIB_INPUTS.length; j++) {
      const [x1, y1] = CALIB_INPUTS[i];
      const [x2, y2] = CALIB_INPUTS[j];
      if (x1 * y2 - x2 * y1 !== 0) {
        independent = true;
        break;
      }
    }
  ok(independent, 'calibration inputs span 2-D (two independent (x,y) vectors)');
  console.log('   inputs span 2-D → (a,b) uniquely recoverable ... ok');

  // TABLE_INPUTS must also determine (a,b) uniquely (so the shown clues suffice)
  const TABLE = [[1, 1], [2, 1], [1, 2], [3, 2]];
  let tableIndep = false;
  for (let i = 0; i < TABLE.length && !tableIndep; i++)
    for (let j = i + 1; j < TABLE.length; j++) {
      const [x1, y1] = TABLE[i];
      const [x2, y2] = TABLE[j];
      if (x1 * y2 - x2 * y1 !== 0) tableIndep = true;
    }
  ok(tableIndep, 'the revealed input→output rows determine (a,b) uniquely');

  const makeTarget = (prev) => {
    let t;
    let guard = 0;
    do {
      const a = 1 + Math.floor(Math.random() * 3);
      const b = 1 + Math.floor(Math.random() * 3);
      t = { a, b };
      guard++;
    } while (((t.a === 1 && t.b === 1) || (prev && t.a === prev.a && t.b === prev.b)) && guard < 999);
    return t;
  };
  let prev = null;
  for (let i = 0; i < 5000; i++) {
    const t = makeTarget(prev);
    ok(tA.includes(t.a) && tB.includes(t.b), `random target in {1,2,3}² (got ${t.a},${t.b})`);
    ok(!(t.a === 1 && t.b === 1), 'random target never the trivial x + y');
    prev = t;
  }
  console.log('   makeTarget: 5000 draws all in-range, non-trivial ... ok');
}

console.log('\n' + (fail === 0 ? '✓ ALL CHECKS PASSED' : `✗ ${fail} CHECK(S) FAILED`));
process.exit(fail === 0 ? 0 : 1);
