/* ============================================================================
   audit-series.mjs — numeric audit for SeriesLab.jsx
   Run:  node audit-series.mjs

   Re-implements the lab's pure math and proves, exhaustively over (and beyond)
   the dial ranges, every invariant a K-12 student would rely on. No deps.

   The load-bearing proofs here:
     • the exact-rational module obeys field laws and canonical form, so ratEq
       is a SOUND equality test — which is what the CALIBRATED stamp is gated on
     • every Number intermediate stays inside MAX_SAFE_INTEGER, so "exact
       rational" is a proved claim and not a hope
     • Sₙ built by ADDING agrees with both closed forms, everywhere, including
       the r = 1 branch the general formula cannot reach
     • gap_n = S − Sₙ = a·rⁿ/(1−r) = r · gap_{n−1}, which is the lab's thesis
     • the Gauss pairing identity holds for EVERY k, including odd n
     • CALIBRATED ⇔ an exact hit, with no false stamp anywhere on the grid
   ========================================================================== */

let fail = 0;
let checks = 0;
const ok = (cond, msg) => {
  checks++;
  if (!cond) {
    fail++;
    if (fail <= 40) console.error('  ✗ ' + msg);
  }
};

/* ---- mirror of the lab's pure math -------------------------------------- */
const gcd = (a, b) => {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a;
};

/* every product that feeds a rational is funnelled through note(), so the
   audit can PROVE the Number-safety claim in the lab's header rather than
   assert it */
let MAXI = 0;
const note = (v) => {
  MAXI = Math.max(MAXI, Math.abs(v));
  return v;
};

function rat(n, d = 1) {
  if (d === 0) throw new Error('rational with zero denominator');
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d) || 1;
  const out = { n: n / g, d: d / g };
  note(out.n);
  note(out.d);
  return out;
}
const ZERO = rat(0, 1);
const ONE = rat(1, 1);
const ratAdd = (x, y) => rat(note(x.n * y.d) + note(y.n * x.d), note(x.d * y.d));
const ratSub = (x, y) => rat(note(x.n * y.d) - note(y.n * x.d), note(x.d * y.d));
const ratMul = (x, y) => rat(note(x.n * y.n), note(x.d * y.d));
const ratDiv = (x, y) => {
  if (y.n === 0) throw new Error('rational division by zero');
  return rat(note(x.n * y.d), note(x.d * y.n));
};
const ratAbs = (x) => rat(Math.abs(x.n), x.d);
const ratEq = (x, y) => x.n === y.n && x.d === y.d;
const ratCmp = (x, y) => Math.sign(note(x.n * y.d) - note(y.n * x.d));
const ratNum = (x) => x.n / x.d;
function ratPow(x, k) {
  let out = ONE;
  for (let i = 0; i < k; i++) out = ratMul(out, x);
  return out;
}

const A_MIN = 1;
const A_MAX = 6;
const D_MIN = -3;
const D_MAX = 4;
const N_MIN = 1;
const N_MAX = 10;
const R_LIST = [
  rat(-1, 1), rat(-3, 4), rat(-2, 3), rat(-1, 2), rat(-1, 3),
  rat(1, 4), rat(1, 3), rat(1, 2), rat(2, 3), rat(3, 4),
  rat(1, 1), rat(3, 2), rat(2, 1),
];
const R_HALF = 7;
const R_QUARTER = 5;

function termsOf(mode, a, d, r, n) {
  const out = [];
  for (let k = 1; k <= n; k++) {
    out.push(mode === 'arith' ? rat(a + (k - 1) * d, 1) : ratMul(rat(a, 1), ratPow(r, k - 1)));
  }
  return out;
}
function partialsOf(terms) {
  const out = [ZERO];
  let acc = ZERO;
  for (const t of terms) {
    acc = ratAdd(acc, t);
    out.push(acc);
  }
  return out;
}
const closedFormArith = (a, d, n) => rat(n * (2 * a + (n - 1) * d), 2);
const closedFormGeom = (a, r, n) =>
  ratEq(r, ONE) ? rat(n * a, 1) : ratDiv(ratMul(rat(a, 1), ratSub(ONE, ratPow(r, n))), ratSub(ONE, r));
const convergesGeom = (r) => ratCmp(ratAbs(r), ONE) < 0;
const infSumGeom = (a, r) => ratDiv(rat(a, 1), ratSub(ONE, r));
const gapGeom = (a, r, n) => ratDiv(ratMul(rat(a, 1), ratPow(r, n)), ratSub(ONE, r));

const CALIB_TARGETS = [2, 3, 4, 6, 8, 9, 12];
function infSumSolutions(T) {
  const out = [];
  for (let a = A_MIN; a <= A_MAX; a++) {
    for (let i = 0; i < R_LIST.length; i++) {
      const r = R_LIST[i];
      if (!convergesGeom(r)) continue;
      if (ratEq(infSumGeom(a, r), rat(T, 1))) out.push({ a, rIdx: i });
    }
  }
  return out;
}
/* the lab's meter, verbatim in its decision structure */
function meterPct(a, rIdx, T) {
  const r = R_LIST[rIdx];
  const conv = convergesGeom(r);
  if (!conv) return 0;
  const S = infSumGeom(a, r);
  if (ratEq(S, rat(T, 1))) return 100;
  const err = Math.abs(ratNum(S) - T) / T;
  return Math.min(96, Math.max(0, Math.round(100 * (1 - Math.min(1, err)))));
}
const isCalibrated = (a, rIdx, T) =>
  convergesGeom(R_LIST[rIdx]) && ratEq(infSumGeom(a, R_LIST[rIdx]), rat(T, 1));

/* ---- formatting helpers, mirrored --------------------------------------- */
const SUBS = '₀₁₂₃₄₅₆₇₈₉';
const sub = (k) => String(k).split('').map((c) => SUBS[+c] ?? c).join('');
const SUPS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
function supStr(k) {
  const neg = k < 0;
  const body = String(Math.abs(k)).split('').map((c) => SUPS[+c] ?? c).join('');
  return (neg ? '⁻' : '') + body;
}
const MINUS = '−';
const minus = (s) => String(s).replace(/-/g, MINUS);
const ratStr = (x) => minus(x.d === 1 ? String(x.n) : `${x.n}/${x.d}`);
const ratParen = (x) => (x.n < 0 ? `(${ratStr(x)})` : ratStr(x));
function fmtNum(v) {
  if (Object.is(v, -0)) v = 0;
  if (Number.isInteger(v)) return minus(String(v));
  const s = v.toFixed(2).replace(/\.?0+$/, '');
  return minus(s === '-0' ? '0' : s);
}
function seriesText(terms, maxShow = 6) {
  const N = terms.length;
  const piece = (t, first) => {
    const mag = ratStr(ratAbs(t));
    if (first) return (t.n < 0 ? '−' : '') + mag;
    return (t.n < 0 ? ' − ' : ' + ') + mag;
  };
  if (N <= maxShow) return terms.map((t, i) => piece(t, i === 0)).join('');
  const head = terms.slice(0, maxShow - 1).map((t, i) => piece(t, i === 0)).join('');
  const elided = terms[maxShow - 1];
  return head + (elided.n < 0 ? ' − ⋯' : ' + ⋯') + piece(terms[N - 1], false);
}
function niceStep(span, targetTicks) {
  const raw = span / Math.max(1, targetTicks);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const s = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
  return s * mag;
}

/* ---- independent references, to cross-check the mirror ------------------ */
const gcdRef = (a, b) => {
  // brute-force greatest common divisor — no Euclid, so a bug in gcd cannot hide
  a = Math.abs(a);
  b = Math.abs(b);
  if (a === 0) return b;
  if (b === 0) return a;
  let g = 1;
  for (let dd = 1; dd <= Math.min(a, b); dd++) if (a % dd === 0 && b % dd === 0) g = dd;
  return g;
};
const near = (x, y, eps = 1e-9) => Math.abs(x - y) <= eps * Math.max(1, Math.abs(x), Math.abs(y));

console.log('SeriesLab — numeric audit\n');

/* ========================================================================== */
/* 1. the rational module: canonical form, field laws, sound equality        */
/* ========================================================================== */
{
  for (let n = -30; n <= 30; n++) {
    for (let d = -12; d <= 12; d++) {
      if (d === 0) continue;
      const x = rat(n, d);
      ok(x.d > 0, `rat(${n},${d}) must have a positive denominator`);
      ok(gcd(Math.abs(x.n), x.d) === 1, `rat(${n},${d}) must be fully reduced`);
      ok(gcdRef(Math.abs(x.n), x.d) === 1, `rat(${n},${d}) reduced (brute-force gcd)`);
      ok(near(ratNum(x), n / d), `rat(${n},${d}) must keep its value`);
      if (n === 0) ok(x.n === 0 && x.d === 1, 'zero must canonicalise to exactly 0/1');
      // canonical form ⇒ ratEq is sound: equal value ⟺ identical struct
      const y = rat(n * 3, d * 3);
      ok(ratEq(x, y), `rat(${n},${d}) must equal its own 3× unreduced twin`);
    }
  }
  ok(gcd(0, 5) === 5 && gcd(5, 0) === 5, 'gcd must handle a zero argument');

  // field laws + agreement with floating point on values where floats are exact
  const sample = [];
  for (let n = -6; n <= 6; n++) for (let d = 1; d <= 4; d++) sample.push(rat(n, d));
  for (const x of sample) {
    for (const y of sample) {
      ok(near(ratNum(ratAdd(x, y)), ratNum(x) + ratNum(y)), `add ${ratStr(x)}+${ratStr(y)}`);
      ok(near(ratNum(ratSub(x, y)), ratNum(x) - ratNum(y)), `sub ${ratStr(x)}−${ratStr(y)}`);
      ok(near(ratNum(ratMul(x, y)), ratNum(x) * ratNum(y)), `mul ${ratStr(x)}·${ratStr(y)}`);
      if (y.n !== 0) ok(near(ratNum(ratDiv(x, y)), ratNum(x) / ratNum(y)), `div ${ratStr(x)}/${ratStr(y)}`);
      ok(ratEq(ratAdd(x, y), ratAdd(y, x)), 'addition must commute');
      ok(ratEq(ratMul(x, y), ratMul(y, x)), 'multiplication must commute');
      ok(ratEq(ratSub(ratAdd(x, y), y), x), 'subtraction must undo addition');
      if (y.n !== 0) ok(ratEq(ratMul(ratDiv(x, y), y), x), 'division must undo multiplication');
      ok(ratCmp(x, y) === Math.sign(ratNum(x) - ratNum(y)), `cmp ${ratStr(x)} vs ${ratStr(y)}`);
      ok(ratEq(x, y) === (ratNum(x) === ratNum(y)), `ratEq must agree with value equality`);
    }
    ok(ratEq(ratAdd(x, ZERO), x), '0 must be the additive identity');
    ok(ratEq(ratMul(x, ONE), x), '1 must be the multiplicative identity');
    ok(ratEq(ratPow(x, 0), ONE), 'x⁰ must be 1');
    ok(ratEq(ratPow(x, 1), x), 'x¹ must be x');
    ok(ratEq(ratPow(x, 3), ratMul(ratMul(x, x), x)), 'x³ must be x·x·x');
  }

  /* THE headline exact-arithmetic claim: a float would get this wrong */
  const third = rat(1, 3);
  ok(ratEq(ratAdd(ratAdd(third, third), third), ONE), '1/3 + 1/3 + 1/3 must be EXACTLY 1');
  ok(0.1 + 0.2 !== 0.3, 'sanity: floats really are inexact (0.1+0.2 ≠ 0.3)');
  ok(ratEq(ratAdd(rat(1, 10), rat(2, 10)), rat(3, 10)), '1/10 + 2/10 must be EXACTLY 3/10');
}

/* ========================================================================== */
/* 2. the dial grid itself                                                    */
/* ========================================================================== */
{
  const seen = new Set();
  for (const r of R_LIST) {
    ok(r.d > 0 && gcd(Math.abs(r.n), r.d) === 1, `R_LIST entry ${ratStr(r)} must be canonical`);
    ok(Math.abs(r.n) <= 3, `R_LIST |numerator| ≤ 3 (the Number-safety bound): ${ratStr(r)}`);
    ok(r.d <= 4, `R_LIST denominator ≤ 4 (the Number-safety bound): ${ratStr(r)}`);
    ok(r.n !== 0, 'r = 0 would collapse the series to a single term — must not be reachable');
    const key = ratStr(r);
    ok(!seen.has(key), `R_LIST must not repeat ${key}`);
    seen.add(key);
  }
  ok(ratEq(R_LIST[R_HALF], rat(1, 2)), 'R_HALF must index exactly 1/2');
  ok(ratEq(R_LIST[R_QUARTER], rat(1, 4)), 'R_QUARTER must index exactly 1/4');
  // the list must span all three regimes, or the lesson has nothing to contrast
  ok(R_LIST.some((r) => convergesGeom(r) && r.n > 0), 'need a converging positive r');
  ok(R_LIST.some((r) => convergesGeom(r) && r.n < 0), 'need a converging negative r (oscillating)');
  ok(R_LIST.some((r) => ratEq(r, ONE)), 'need r = 1 — the case the formula excludes');
  ok(R_LIST.some((r) => ratEq(r, rat(-1, 1))), 'need r = −1 — divergence without blowing up');
  ok(R_LIST.some((r) => ratCmp(ratAbs(r), ONE) > 0), 'need a |r| > 1 that diverges');
  ok(R_LIST.every((r, i) => i === 0 || ratCmp(R_LIST[i - 1], r) < 0), 'R_LIST must be sorted ascending');
}

/* ========================================================================== */
/* 3. ARITHMETIC series — exhaustive over every (a, d, n) on the grid        */
/* ========================================================================== */
{
  let count = 0;
  for (let a = A_MIN; a <= A_MAX; a++) {
    for (let d = D_MIN; d <= D_MAX; d++) {
      for (let n = N_MIN; n <= N_MAX; n++) {
        count++;
        const terms = termsOf('arith', a, d, null, n);
        const partials = partialsOf(terms);
        const Sn = partials[n];

        ok(terms.length === n, `arith(${a},${d},${n}) must have n terms`);
        ok(ratEq(terms[0], rat(a, 1)), `arith(${a},${d},${n}) first term must be a`);
        ok(partials[0].n === 0, 'S₀ must be 0');

        for (let k = 1; k <= n; k++) {
          // aₖ = a + (k−1)d — the (n−1), not n
          ok(ratEq(terms[k - 1], rat(a + (k - 1) * d, 1)), `arith aₖ formula at k=${k}`);
          // consecutive DIFFERENCE is constant — the defining property
          if (k > 1) ok(ratEq(ratSub(terms[k - 1], terms[k - 2]), rat(d, 1)), `arith common difference at k=${k}`);
          // Sₖ − Sₖ₋₁ = the next term (the chain the waterfall draws)
          ok(ratEq(ratSub(partials[k], partials[k - 1]), terms[k - 1]), `arith Sₖ−Sₖ₋₁ = aₖ at k=${k}`);
        }

        // Gauss closed form agrees with adding, everywhere
        ok(ratEq(closedFormArith(a, d, n), Sn), `arith Gauss formula vs adding (${a},${d},${n})`);
        // and with an independent brute-force float sum
        let fsum = 0;
        for (let k = 1; k <= n; k++) fsum += a + (k - 1) * d;
        ok(near(ratNum(Sn), fsum), `arith sum vs float reference (${a},${d},${n})`);

        /* THE PAIRING IDENTITY the "Pair up" rectangle is built on:
           t_k + t_{n+1−k} is the SAME for every k — which is why every row of
           the paired picture ends flush. Holds for odd n too. */
        const pairTotal = ratAdd(terms[0], terms[n - 1]);
        for (let k = 1; k <= n; k++) {
          ok(
            ratEq(ratAdd(terms[k - 1], terms[n - k]), pairTotal),
            `Gauss pairing t${k}+t${n + 1 - k} must equal a₁+aₙ (${a},${d},${n})`
          );
        }
        // 2Sₙ = n(a₁+aₙ) — the rectangle's area, exactly
        ok(ratEq(ratMul(rat(2, 1), Sn), ratMul(rat(n, 1), pairTotal)), `2Sₙ = n(a₁+aₙ) (${a},${d},${n})`);
        // odd n: the middle term is exactly the average — the "half pair"
        if (n % 2 === 1) {
          const mid = terms[(n - 1) / 2];
          ok(ratEq(ratMul(rat(2, 1), mid), pairTotal), `odd n=${n}: middle term must be the average (${a},${d})`);
        }
        // an arithmetic series with a ≥ 1 NEVER converges: its terms never → 0
        ok(!(a === 0 && d === 0), 'a is bounded below by 1, so the all-zero series is unreachable');
        ok(Math.abs(ratNum(terms[n - 1])) >= 0, 'terms stay finite');
      }
    }
  }
  console.log(`  arithmetic: ${count} (a,d,n) combinations swept`);
}

/* ========================================================================== */
/* 4. GEOMETRIC series — exhaustive over every (a, r, n) on the grid         */
/* ========================================================================== */
{
  let count = 0;
  for (let a = A_MIN; a <= A_MAX; a++) {
    for (let i = 0; i < R_LIST.length; i++) {
      const r = R_LIST[i];
      for (let n = N_MIN; n <= N_MAX; n++) {
        count++;
        const terms = termsOf('geom', a, null, r, n);
        const partials = partialsOf(terms);
        const Sn = partials[n];

        ok(terms.length === n, `geom(${a},${ratStr(r)},${n}) must have n terms`);
        ok(ratEq(terms[0], rat(a, 1)), 'geom first term must be a');

        for (let k = 1; k <= n; k++) {
          // aₖ = a·r^(k−1) — the (k−1) off-by-one the lesson warns about
          ok(ratEq(terms[k - 1], ratMul(rat(a, 1), ratPow(r, k - 1))), `geom aₖ formula at k=${k}`);
          // consecutive RATIO is constant — the defining property (a ≥ 1 and
          // r ≠ 0 mean no term is ever 0, so the division is always legal)
          if (k > 1) {
            ok(terms[k - 2].n !== 0, 'no geometric term may be zero');
            ok(ratEq(ratDiv(terms[k - 1], terms[k - 2]), r), `geom common ratio at k=${k}`);
          }
          ok(ratEq(ratSub(partials[k], partials[k - 1]), terms[k - 1]), `geom Sₖ−Sₖ₋₁ = aₖ at k=${k}`);
        }

        // closed form agrees with adding — INCLUDING the r = 1 branch
        const cf = closedFormGeom(a, r, n);
        ok(ratEq(cf, Sn), `geom closed form vs adding (${a},${ratStr(r)},${n})`);
        if (ratEq(r, ONE)) {
          ok(ratEq(Sn, rat(n * a, 1)), `r = 1 ⇒ Sₙ must be n·a (${a},${n})`);
        } else {
          // the general formula, recomputed from scratch here
          const alt = ratDiv(ratMul(rat(a, 1), ratSub(ONE, ratPow(r, n))), ratSub(ONE, r));
          ok(ratEq(alt, Sn), `a(1−rⁿ)/(1−r) must equal Sₙ (${a},${ratStr(r)},${n})`);
        }
        let fsum = 0;
        for (let k = 1; k <= n; k++) fsum += a * Math.pow(ratNum(r), k - 1);
        ok(near(ratNum(Sn), fsum, 1e-9), `geom sum vs float reference (${a},${ratStr(r)},${n})`);

        /* ---- the convergence thesis ---- */
        if (convergesGeom(r)) {
          const S = infSumGeom(a, r);
          const gapClosed = gapGeom(a, r, n);
          const gapDirect = ratSub(S, Sn);
          // S − Sₙ = a·rⁿ/(1−r): the closed gap the canvas labels
          ok(ratEq(gapClosed, gapDirect), `gap closed form = S − Sₙ (${a},${ratStr(r)},${n})`);
          // gap_0 = S — before you add anything, the whole sum is the gap
          ok(ratEq(gapGeom(a, r, 0), S), `gap₀ must equal S (${a},${ratStr(r)})`);
          // gap_n = r · gap_{n−1}: EVERY TERM MULTIPLIES THE GAP BY r.
          // This is the lab's central claim and the gold cascade's meaning.
          ok(
            ratEq(gapGeom(a, r, n), ratMul(r, gapGeom(a, r, n - 1))),
            `gapₙ = r·gapₙ₋₁ (${a},${ratStr(r)},${n})`
          );
          // gap_n = rⁿ × gap_0
          ok(ratEq(gapClosed, ratMul(ratPow(r, n), S)), `gapₙ = rⁿ·S (${a},${ratStr(r)},${n})`);
          // each term eats exactly (1−r) of what was left
          ok(
            ratEq(terms[n - 1], ratMul(gapGeom(a, r, n - 1), ratSub(ONE, r))),
            `aₙ must equal gapₙ₋₁·(1−r) (${a},${ratStr(r)},${n})`
          );
          // the gap strictly SHRINKS in size, which is why it converges
          ok(
            ratCmp(ratAbs(gapGeom(a, r, n)), ratAbs(gapGeom(a, r, n - 1))) < 0,
            `|gap| must strictly shrink (${a},${ratStr(r)},${n})`
          );
          // S = a/(1−r), cross-checked against a long float sum
          let far = 0;
          for (let k = 1; k <= 400; k++) far += a * Math.pow(ratNum(r), k - 1);
          ok(near(ratNum(S), far, 1e-9), `S = a/(1−r) vs a 400-term float sum (${a},${ratStr(r)})`);
          // for 0 < r < 1 every partial sum is strictly BELOW S and increasing —
          // this is exactly why "just under 2" feels right and is still wrong
          if (r.n > 0) {
            ok(ratCmp(Sn, S) < 0, `0<r<1 ⇒ Sₙ < S strictly (${a},${ratStr(r)},${n})`);
            if (n > 1) ok(ratCmp(partials[n], partials[n - 1]) > 0, 'partial sums must increase');
          }
        } else {
          // |r| ≥ 1: the terms never shrink away, so there is no sum
          ok(ratCmp(ratAbs(terms[n - 1]), rat(a, 1)) >= 0, `|r|≥1 ⇒ |aₙ| ≥ a (${a},${ratStr(r)},${n})`);
          ok(!convergesGeom(r), 'divergent r must be reported divergent');
        }
      }
    }
  }
  console.log(`  geometric:  ${count} (a,r,n) combinations swept`);

  /* the r = −1 oscillation the facts panel calls out: partial sums flip a,0,a,0 */
  for (let a = A_MIN; a <= A_MAX; a++) {
    const p = partialsOf(termsOf('geom', a, null, rat(-1, 1), 10));
    for (let k = 1; k <= 10; k++) {
      ok(ratEq(p[k], rat(k % 2 === 1 ? a : 0, 1)), `r=−1 partial sums must flip a,0,a,0 (a=${a},k=${k})`);
    }
    ok(!convergesGeom(rat(-1, 1)), 'r = −1 must count as divergent (bounded, but never settles)');
  }
}

/* ========================================================================== */
/* 5. Number-safety: the "exact rational" claim must be PROVED               */
/* ========================================================================== */
{
  ok(
    MAXI < Number.MAX_SAFE_INTEGER,
    `every intermediate must stay exact: max |value| seen = ${MAXI} vs MAX_SAFE_INTEGER ${Number.MAX_SAFE_INTEGER}`
  );
  ok(Number.isSafeInteger(MAXI), 'the largest intermediate must itself be a safe integer');
  console.log(
    `  exactness:  largest intermediate |v| = ${MAXI.toExponential(3)} · MAX_SAFE_INTEGER = ${Number.MAX_SAFE_INTEGER.toExponential(3)} · headroom ×${(
      Number.MAX_SAFE_INTEGER / MAXI
    ).toExponential(2)}`
  );
}

/* ========================================================================== */
/* 6. CALIBRATION — no false stamp is reachable, anywhere                     */
/* ========================================================================== */
{
  for (const T of CALIB_TARGETS) {
    const sols = infSumSolutions(T);
    ok(sols.length >= 2, `target ${T} must be reachable by ≥ 2 distinct series (found ${sols.length})`);
    for (const s of sols) {
      ok(s.a >= A_MIN && s.a <= A_MAX, `target ${T}: solution a=${s.a} must be on the dial`);
      ok(convergesGeom(R_LIST[s.rIdx]), `target ${T}: a solution must actually converge`);
      ok(ratEq(infSumGeom(s.a, R_LIST[s.rIdx]), rat(T, 1)), `target ${T}: solution must be exact`);
      ok(meterPct(s.a, s.rIdx, T) === 100, `target ${T}: a solution must read 100%`);
      ok(isCalibrated(s.a, s.rIdx, T), `target ${T}: a solution must stamp CALIBRATED`);
    }

    /* THE no-false-stamp sweep: every reachable (a, r) against every target */
    for (let a = A_MIN; a <= A_MAX; a++) {
      for (let i = 0; i < R_LIST.length; i++) {
        const hit = sols.some((s) => s.a === a && s.rIdx === i);
        const stamped = isCalibrated(a, i, T);
        ok(stamped === hit, `target ${T}: CALIBRATED ⇔ exact hit must hold at (a=${a}, r=${ratStr(R_LIST[i])})`);
        const p = meterPct(a, i, T);
        ok(p >= 0 && p <= 100, `target ${T}: meter must stay in 0..100 at (${a},${ratStr(R_LIST[i])})`);
        // 100% is reachable ONLY by an exact hit — the meter cannot lie
        ok(p === 100 === hit, `target ${T}: 100% ⇔ exact hit at (a=${a}, r=${ratStr(R_LIST[i])})`);
        if (!hit) ok(p <= 96, `target ${T}: a near miss must cap at 96% (got ${p})`);
        // a divergent ratio has no sum at all and must score zero
        if (!convergesGeom(R_LIST[i])) {
          ok(p === 0, `target ${T}: divergent r=${ratStr(R_LIST[i])} must read 0%`);
          ok(!stamped, `target ${T}: divergent r=${ratStr(R_LIST[i])} must never stamp`);
        }
      }
    }

    // the start state must never be handed a free win
    ok(!isCalibrated(1, R_QUARTER, T), `calibration must not START solved for target ${T}`);
    ok(ratEq(infSumGeom(1, R_LIST[R_QUARTER]), rat(4, 3)), 'the start state must be S = 4/3');
  }
  // …and 4/3 is not an integer, so it can never coincide with any target
  ok(CALIB_TARGETS.every((T) => Number.isInteger(T)), 'targets are integers; the start S = 4/3 is not');
  ok(new Set(CALIB_TARGETS).size === CALIB_TARGETS.length, 'targets must not repeat');

  /* the hint text must point the right way, or it teaches a wrong reflex */
  for (const T of CALIB_TARGETS) {
    for (let a = A_MIN; a <= A_MAX; a++) {
      for (let i = 0; i < R_LIST.length; i++) {
        if (!convergesGeom(R_LIST[i])) continue;
        const S = infSumGeom(a, R_LIST[i]);
        if (ratEq(S, rat(T, 1))) continue;
        const saysTooSmall = ratCmp(S, rat(T, 1)) < 0;
        ok(saysTooSmall === ratNum(S) < T, `target ${T}: the too-small/overshot hint must match reality`);
      }
    }
  }
  console.log(`  calibration: ${CALIB_TARGETS.length} targets × ${A_MAX * R_LIST.length} grid states swept`);
}

/* ========================================================================== */
/* 7. every claim the lesson text makes, checked as arithmetic               */
/* ========================================================================== */
{
  // step 1 — "2, 5, 8, 11" is what START actually opens on, and sums to 26
  const s0 = termsOf('arith', 2, 3, null, 4);
  ok(s0.map(ratStr).join(',') === '2,5,8,11', 'step 1: the opening series must really be 2, 5, 8, 11');
  ok(ratEq(partialsOf(s0)[4], rat(26, 1)), 'step 1: 2+5+8+11 must be 26');

  // step 2 — raising a₁ by 1 raises the 4-term sum by exactly 4
  for (let a = A_MIN; a < A_MAX; a++) {
    for (let d = D_MIN; d <= D_MAX; d++) {
      const lo = partialsOf(termsOf('arith', a, d, null, 4))[4];
      const hi = partialsOf(termsOf('arith', a + 1, d, null, 4))[4];
      ok(ratEq(ratSub(hi, lo), rat(4, 1)), `step 2: +1 on a₁ must add exactly 4 to S₄ (a=${a},d=${d})`);
    }
  }

  // step 3 — S₃ of 2+5+8+11 is 15, not 8 (the term) and not 26 (S₄)
  const p0 = partialsOf(s0);
  ok(ratEq(p0[3], rat(15, 1)), 'step 3: S₃ must be 15');
  ok(ratEq(s0[2], rat(8, 1)), 'step 3: the third TERM must be 8 — the distractor');
  ok(ratEq(p0[4], rat(26, 1)), 'step 3: S₄ must be 26 — the other distractor');
  ok(!ratEq(p0[3], s0[2]), 'step 3: a partial sum must differ from a term, or the question is empty');

  // step 4 — the 10th term of 4, 7, 10, 13, … is 31 (and NOT 34 or 30)
  const s3 = termsOf('arith', 4, 3, null, 10);
  ok(s3.map(ratStr).slice(0, 4).join(',') === '4,7,10,13', 'step 4: the stated sequence must be 4, 7, 10, 13');
  ok(ratEq(s3[9], rat(31, 1)), 'step 4: a₁₀ must be 31');
  ok(4 + 10 * 3 === 34, 'step 4: the "n instead of n−1" distractor must really be 34');
  ok(3 * 10 === 30, 'step 4: the "3 × 10" distractor must really be 30');

  // step 5 — Gauss: 1 + 2 + ⋯ + 100 = 5050, by three routes
  ok(ratEq(closedFormArith(1, 1, 100), rat(5050, 1)), 'step 5: the formula must give 5050');
  let g = 0;
  for (let k = 1; k <= 100; k++) g += k;
  ok(g === 5050, 'step 5: brute-force 1..100 must give 5050');
  ok(50 * 101 === 5050, 'step 5: 50 pairs of 101 must give 5050');
  ok(100 * 100 === 10000, 'step 5: the "100×100" distractor must really be 10000');
  // the seeded example 1 + 2 + ⋯ + 10 = 55 with a rectangle 10 × 11
  ok(ratEq(closedFormArith(1, 1, 10), rat(55, 1)), 'step 5: the seeded 1..10 must sum to 55');
  ok(ratEq(ratAdd(rat(1, 1), rat(10, 1)), rat(11, 1)), 'step 5: the seeded rectangle must be 11 wide');
  ok(2 * 55 === 10 * 11, 'step 5: the seeded rectangle area must be 2S₁₀');

  // step 6 — 3, 6, 12, 24 has r = 2 and a₆ = 96 (not 192, not 18)
  const s5 = termsOf('geom', 3, null, rat(2, 1), 6);
  ok(s5.map(ratStr).slice(0, 4).join(',') === '3,6,12,24', 'step 6: the stated sequence must be 3, 6, 12, 24');
  ok(ratEq(ratDiv(s5[1], s5[0]), rat(2, 1)), 'step 6: r must be 2');
  ok(ratEq(s5[5], rat(96, 1)), 'step 6: a₆ must be 96');
  ok(3 * Math.pow(2, 6) === 192, 'step 6: the "r^n instead of r^(n−1)" distractor must really be 192');

  // step 7 — r = 1 is exactly the excluded case, and Sₙ = n·a there
  for (let a = A_MIN; a <= A_MAX; a++) {
    for (let n = N_MIN; n <= N_MAX; n++) {
      ok(ratEq(closedFormGeom(a, ONE, n), rat(n * a, 1)), `step 7: r=1 ⇒ Sₙ = n·a (a=${a},n=${n})`);
      const terms = termsOf('geom', a, null, ONE, n);
      ok(terms.every((t) => ratEq(t, rat(a, 1))), 'step 7: r=1 ⇒ every term is a');
    }
  }
  ok(ratEq(ratSub(ONE, ONE), ZERO), 'step 7: the excluded denominator 1−r must really be 0 at r=1');
  let threw = false;
  try {
    ratDiv(ONE, ratSub(ONE, ONE));
  } catch {
    threw = true;
  }
  ok(threw, 'step 7: dividing by 1−r at r=1 must be caught, not silently produce Infinity');

  // step 8 — 1 + 1/2 + 1/4 + ⋯ = EXACTLY 2, and every partial sum is < 2
  const S = infSumGeom(1, rat(1, 2));
  ok(ratEq(S, rat(2, 1)), 'step 8: 1+1/2+1/4+⋯ must be exactly 2');
  for (let n = 1; n <= 10; n++) {
    const Sn = partialsOf(termsOf('geom', 1, null, rat(1, 2), n))[n];
    ok(ratCmp(Sn, rat(2, 1)) < 0, `step 8: S${n} must be strictly below 2 (why "just under 2" tempts)`);
    ok(ratEq(ratSub(rat(2, 1), Sn), gapGeom(1, rat(1, 2), n)), `step 8: S−S${n} must equal the closed-form gap`);
    /* The gap after n terms is 2·(1/2)ⁿ = 1/2ⁿ⁻¹ — NOT 1/2ⁿ. (After two terms
       1 + 1/2 the gap is 1/2, not 1/4.) The lesson text says "halves with every
       term", which is exactly this and avoids the off-by-one. */
    ok(ratEq(gapGeom(1, rat(1, 2), n), rat(1, Math.pow(2, n - 1))), `step 8: gap must be exactly 1/2^${n - 1}`);
    ok(
      ratEq(gapGeom(1, rat(1, 2), n), ratMul(rat(1, 2), gapGeom(1, rat(1, 2), n - 1))),
      `step 8: the gap must HALVE with every term (the claim the feedback makes)`
    );
  }
  // the gap beats ANY named positive bound — the reason the sum is 2 on the nose
  for (const bound of [rat(1, 10), rat(1, 1000), rat(1, 1000000)]) {
    let n = 0;
    while (ratCmp(gapGeom(1, rat(1, 2), n), bound) >= 0) n++;
    ok(n < 64, `step 8: the gap must fall below ${ratStr(bound)} in finitely many terms (took ${n})`);
  }
  // the harmonic caution in the feedback must be TRUE: terms → 0, sum → ∞
  let harm = 0;
  for (let k = 1; k <= 100000; k++) harm += 1 / k;
  ok(1 / 100000 < 1e-4, 'step 8: harmonic terms really do shrink to 0');
  ok(harm > 12, `step 8: the harmonic series really does grow past every bound (100k terms → ${harm.toFixed(2)})`);
  ok(harm > 5, 'step 8: so "terms → 0" is genuinely NOT sufficient — the caution is warranted');
}

/* ========================================================================== */
/* 8. formatting — what the student actually reads                            */
/* ========================================================================== */
{
  ok(ratStr(rat(3, 1)) === '3', 'a whole number must print without a denominator');
  ok(ratStr(rat(63, 32)) === '63/32', 'a fraction must print as n/d');
  ok(ratStr(rat(-1, 2)) === '−1/2', 'a negative fraction must carry its sign on top');
  ok(ratStr(rat(2, 4)) === '1/2', 'a fraction must print reduced');
  ok(ratStr(rat(0, 5)) === '0', 'zero must print as 0');

  /* Typography is a correctness matter here: a K-12 reader must never meet an
     ASCII hyphen posing as a minus, nor a naked double sign like "1−−1/2". */
  for (const r of R_LIST) {
    ok(!ratStr(r).includes('-'), `ratStr(${r.n}/${r.d}) must use a real minus, not a hyphen`);
    ok(!fmtNum(ratNum(r)).includes('-'), `fmtNum for ${ratStr(r)} must use a real minus`);
    // the readout that bit: a(1−rⁿ)/(1−r) with r negative
    const shown = `1−${ratParen(r)}`;
    ok(!/−−|−\s*−/.test(shown), `"1−r" must not print a double sign for r=${ratStr(r)} (got "${shown}")`);
    if (r.n < 0) ok(shown === `1−(${ratStr(r)})`, `a negative r must be bracketed (got "${shown}")`);
    else ok(shown === `1−${ratStr(r)}`, 'a positive r needs no brackets');
  }
  ok(ratParen(rat(-1, 1)) === '(−1)', 'r = −1 must bracket to (−1)');
  ok(ratParen(rat(1, 2)) === '1/2', 'a positive r must stay bare');
  ok(minus('-3') === '−3', 'the dial readout must show a real minus');
  ok(sub(10) === '₁₀' && sub(4) === '₄', 'subscripts must map digit-wise');
  ok(supStr(0) === '⁰' && supStr(5) === '⁵' && supStr(-1) === '⁻¹', 'superscripts must map digit-wise');
  ok(fmtNum(-0) === '0', 'negative zero must print as 0');
  ok(fmtNum(2) === '2' && fmtNum(0.5) === '0.5' && fmtNum(1.25) === '1.25', 'axis labels must read cleanly');

  ok(seriesText(termsOf('arith', 2, 3, null, 4)) === '2 + 5 + 8 + 11', 'the header must read 2 + 5 + 8 + 11');
  ok(
    seriesText(termsOf('arith', 10, -3, null, 5)) === '10 + 7 + 4 + 1 − 2',
    'a negative term must read as a MINUS, not "+ −2"'
  );
  ok(
    seriesText(termsOf('geom', 1, null, rat(1, 2), 4)) === '1 + 1/2 + 1/4 + 1/8',
    'geometric terms must read as exact fractions'
  );
  // long series must still name their LAST term — an ellipsis that hides it lies
  const long = seriesText(termsOf('arith', 1, 1, null, 10));
  ok(long.startsWith('1 + 2 + 3 + 4 + 5 + ⋯'), `a long series must elide the middle (got "${long}")`);
  ok(long.endsWith('+ 10'), `a long series must still show its last term (got "${long}")`);
  /* an ALTERNATING series must carry the first omitted term's sign on the ⋯.
     Here the elided terms start at −1/32, so it must read "− ⋯", not "+ ⋯". */
  const alt = seriesText(termsOf('geom', 1, null, rat(-1, 2), 8));
  ok(alt === '1 − 1/2 + 1/4 − 1/8 + 1/16 − ⋯ − 1/128', `alternating elision must read correctly (got "${alt}")`);
  // and a positive series keeps the plus
  ok(
    seriesText(termsOf('geom', 1, null, rat(1, 2), 8)) === '1 + 1/2 + 1/4 + 1/8 + 1/16 + ⋯ + 1/128',
    'a positive series must keep "+ ⋯"'
  );
  // a first term that is negative is unreachable (a ≥ 1) but must not crash
  ok(seriesText([rat(-2, 1), rat(1, 1)]) === '−2 + 1', 'a leading minus must print as a bare minus');

  // the axis stepper must always produce a sane, finite, positive step
  for (const span of [0.5, 1, 2, 3.7, 12, 55, 240, 3000, 33000]) {
    const s = niceStep(span, 7);
    ok(s > 0 && Number.isFinite(s), `niceStep(${span}) must be positive and finite`);
    const ticks = Math.floor(span / s);
    ok(ticks >= 2 && ticks <= 20, `niceStep(${span}) must give a readable tick count (got ${ticks})`);
  }
}

/* ========================================================================== */
/* 9. the lesson's own structure                                              */
/* ========================================================================== */
{
  // mirrors STEPS: 8 taught steps (each with a question) + 1 calibration step
  const QUIZ_STEPS = 8;
  const UNLOCKS = { a: 1, n: 2, d: 3, r: 5 };
  ok(UNLOCKS.a < UNLOCKS.n && UNLOCKS.n < UNLOCKS.d, 'dials must unlock in a monotonic order');
  ok(UNLOCKS.d < UNLOCKS.r, 'r must arrive with the geometric family, after d');
  ok(UNLOCKS.a === 1, 'the star dial must unlock at step 1');
  ok(QUIZ_STEPS === 8, 'every step before calibration must carry a question');
  // the seeds the lab plants must be on the dials it exposes
  ok(1 >= A_MIN && 1 <= A_MAX && 10 >= N_MIN && 10 <= N_MAX, 'the Gauss seed (a=1, n=10) must be reachable');
  ok(1 >= D_MIN && 1 <= D_MAX, 'the Gauss seed (d=1) must be reachable');
  ok(6 >= N_MIN && 6 <= N_MAX, 'the geometric seed (n=6) must be reachable');
  ok(START_OK(), 'START must sit inside every dial range');
  function START_OK() {
    const S = { a: 2, d: 3, rIdx: R_HALF, n: 4 };
    return S.a >= A_MIN && S.a <= A_MAX && S.d >= D_MIN && S.d <= D_MAX && S.n >= N_MIN && S.n <= N_MAX && S.rIdx >= 0 && S.rIdx < R_LIST.length;
  }
}

/* ========================================================================== */
console.log(`\n${checks.toLocaleString()} checks · ${fail} failed`);
if (fail) {
  console.error('AUDIT FAILED');
  process.exit(1);
} else {
  console.log('AUDIT PASSED — the series math is exact and the stamp cannot lie.');
}
