/* ============================================================================
   audit-gcf.mjs — numeric audit for GreatestCommonFactorLab.jsx
   Run:  node audit-gcf.mjs
   Re-implements the lab's pure math and proves, exhaustively over the full dial
   ranges, every invariant a K-12 student would rely on. Zero dependencies.
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
function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}
function lcm(a, b) {
  if (a === 0 || b === 0) return 0;
  return (a / gcd(a, b)) * b;
}
const factorsOf = (n) => {
  const f = [];
  for (let d = 1; d <= n; d++) if (n % d === 0) f.push(d);
  return f;
};
const commonFactors = (a, b) => factorsOf(gcd(a, b));
const primeFactors = (n) => {
  const out = [];
  let m = n;
  for (let p = 2; p * p <= m; p++) while (m % p === 0) { out.push(p); m /= p; }
  if (m > 1) out.push(m);
  return out;
};
const expForm = (n) => {
  const map = new Map();
  for (const p of primeFactors(n)) map.set(p, (map.get(p) || 0) + 1);
  return [...map.entries()];
};
function sharedPrimes(a, b) {
  const ea = new Map(expForm(a));
  const eb = new Map(expForm(b));
  const out = [];
  for (const [p, e] of ea) {
    const m = Math.min(e, eb.get(p) || 0);
    if (m > 0) out.push([p, m]);
  }
  return out.sort((x, y) => x[0] - y[0]);
}
const isPrime = (n) => {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
};

/* ---- independent references (built differently from the lab) ------------ */
// brute-force GCD: the largest d dividing both.
function gcdBrute(a, b) {
  let g = 1;
  for (let d = 1; d <= Math.min(a, b); d++) if (a % d === 0 && b % d === 0) g = d;
  return g;
}
// brute-force common factors: intersect the two factor lists.
function commonBrute(a, b) {
  const sb = new Set(factorsOf(b));
  return factorsOf(a).filter((k) => sb.has(k));
}

/* ---- calibration mirror ------------------------------------------------- */
const N_MIN = 2;
const N_MAX = 48;
const CALIB_TARGETS = [2, 3, 4, 5, 6, 8, 9, 12];
function calibGrade(a, b, T) {
  const g = gcd(a, b);
  if (g === T) return { pct: 100, done: true };
  const dA = a % T === 0;
  const dB = b % T === 0;
  if (dA && dB) return { pct: 62, done: false };
  if (dA || dB) return { pct: 30, done: false };
  return { pct: 10, done: false };
}

/* ========================================================================= */
console.log(`Auditing GreatestCommonFactorLab over a,b ∈ [${N_MIN}, ${N_MAX}] …\n`);

const eq = (x, y) => JSON.stringify(x) === JSON.stringify(y);

/* 1) GCF correctness: Euclid == brute force, and it divides both, and nothing
      bigger does. Also the identity gcd(a,b) == product of shared primes, and
      the common-factor set == factors of the gcd == list intersection. */
for (let a = N_MIN; a <= N_MAX; a++) {
  for (let b = N_MIN; b <= N_MAX; b++) {
    const g = gcd(a, b);
    ok(g === gcdBrute(a, b), `gcd(${a},${b})=${g} != brute ${gcdBrute(a, b)}`);
    ok(a % g === 0 && b % g === 0, `gcd(${a},${b}) does not divide both`);
    // greatest: no larger common divisor
    let bigger = false;
    for (let d = g + 1; d <= Math.min(a, b); d++) if (a % d === 0 && b % d === 0) bigger = true;
    ok(!bigger, `a larger common divisor exists for (${a},${b})`);

    // shared-prime product == gcd
    let prod = 1;
    for (const [p, m] of sharedPrimes(a, b)) prod *= p ** m;
    ok(prod === g, `sharedPrimes product ${prod} != gcd ${g} for (${a},${b})`);

    // common factors == factors of gcd == intersection
    ok(eq(commonFactors(a, b), commonBrute(a, b)), `common factors mismatch (${a},${b})`);
    ok(eq(commonFactors(a, b), factorsOf(g)), `common != factors(gcd) for (${a},${b})`);

    // GCF × LCM == a × b
    ok(g * lcm(a, b) === a * b, `gcf*lcm != a*b for (${a},${b})`);

    // distributive identity: a + b == g·(a/g + b/g), and the cofactors are coprime
    ok(a + b === g * (a / g + b / g), `distributive identity fails (${a},${b})`);
    ok(gcd(a / g, b / g) === 1, `cofactors not coprime for (${a},${b})`);

    // symmetry
    ok(gcd(a, b) === gcd(b, a), `gcd not symmetric (${a},${b})`);
  }
}

/* 2) Prime-factorization sanity: product of prime factors == n; each is prime;
      ascending; exponent form multiplies back. */
for (let n = N_MIN; n <= N_MAX; n++) {
  const pf = primeFactors(n);
  ok(pf.reduce((x, y) => x * y, 1) === n, `primeFactors product != n for ${n}`);
  ok(pf.every((p) => isPrime(p)), `non-prime in primeFactors(${n})`);
  ok(pf.every((p, i) => i === 0 || p >= pf[i - 1]), `primeFactors(${n}) not ascending`);
  let e = 1;
  for (const [p, k] of expForm(n)) e *= p ** k;
  ok(e === n, `expForm product != n for ${n}`);
}

/* 3) Coprime detection: gcd==1 <=> no shared prime <=> only common factor is 1. */
for (let a = N_MIN; a <= N_MAX; a++) {
  for (let b = N_MIN; b <= N_MAX; b++) {
    const cop = gcd(a, b) === 1;
    ok(cop === (sharedPrimes(a, b).length === 0), `coprime<->no-shared-prime fails (${a},${b})`);
    ok(cop === eq(commonFactors(a, b), [1]), `coprime<->common==[1] fails (${a},${b})`);
  }
}

/* 4) Calibration well-posedness:
      (a) every target is reachable by >=2 DISTINCT pairs within range;
      (b) done <=> gcd(a,b)===T EXACTLY across the full grid (no false stamp);
      (c) pct==100 iff done; pct monotone in the qualitative sense
          (neither < one-divides < both-but-not-greatest < exact). */
for (const T of CALIB_TARGETS) {
  let reach = 0;
  const seen = new Set();
  for (let a = N_MIN; a <= N_MAX; a++)
    for (let b = a; b <= N_MAX; b++)
      if (gcd(a, b) === T) {
        const key = a + ',' + b;
        if (!seen.has(key)) { seen.add(key); reach++; }
      }
  ok(reach >= 2, `target GCF ${T} reachable by fewer than 2 pairs (${reach})`);
}
for (const T of CALIB_TARGETS) {
  for (let a = N_MIN; a <= N_MAX; a++) {
    for (let b = N_MIN; b <= N_MAX; b++) {
      const gr = calibGrade(a, b, T);
      const trueHit = gcd(a, b) === T;
      ok(gr.done === trueHit, `calib done!=truth for T=${T} (${a},${b})`);
      ok((gr.pct === 100) === trueHit, `calib pct==100 != done for T=${T} (${a},${b})`);
      // the "both divide" bucket must genuinely have T as a (non-greatest) common factor
      if (!trueHit && a % T === 0 && b % T === 0) {
        ok(gcd(a, b) > T && gcd(a, b) % T === 0, `both-divide bucket wrong for T=${T} (${a},${b})`);
        ok(gr.pct === 62, `both-divide pct wrong for T=${T} (${a},${b})`);
      }
    }
  }
}

/* 5) Golden hand-checks (the values shown in the lesson copy). */
ok(gcd(12, 18) === 6, 'GCF(12,18) should be 6');
ok(eq(commonFactors(12, 18), [1, 2, 3, 6]), 'common(12,18) should be 1,2,3,6');
ok(gcd(8, 15) === 1, 'GCF(8,15) should be 1 (coprime)');
ok(lcm(12, 18) === 36, 'LCM(12,18) should be 36');
ok(eq(sharedPrimes(12, 18), [[2, 1], [3, 1]]), 'shared primes of 12,18 should be 2,3');
ok(gcd(24, 36) === 12, 'GCF(24,36) should be 12');
ok(gcd(17, 34) === 17, 'GCF(17,34) should be 17 (one divides the other)');
ok(12 + 18 === 6 * (2 + 3), 'distributive 12+18=6(2+3)');

/* ---- report ------------------------------------------------------------- */
console.log(`\n${checks.toLocaleString()} checks, ${fail} failure${fail === 1 ? '' : 's'}.`);
console.log(fail === 0 ? '✓ ALL PASS' : '✗ FAILURES ABOVE');
process.exit(fail === 0 ? 0 : 1);
