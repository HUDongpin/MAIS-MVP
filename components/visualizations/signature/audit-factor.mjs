/* ============================================================================
   audit-factor.mjs — numeric audit for FactorLab.jsx
   Run:  node audit-factor.mjs
   Re-implements the lab's pure math and proves the invariants a K-12 student
   would rely on, exhaustively over the full dial ranges. No dependencies.
   ========================================================================== */

let fail = 0;
let checks = 0;
const ok = (cond, msg) => {
  checks++;
  if (!cond) {
    fail++;
    console.error('  ✗ ' + msg);
  }
};

/* ---- mirror of the lab's pure math -------------------------------------- */
const factorsOf = (n) => {
  const f = [];
  for (let d = 1; d <= n; d++) if (n % d === 0) f.push(d);
  return f;
};
const isFactor = (n, d) => d >= 1 && n % d === 0;
const primeFactors = (n) => {
  const out = [];
  let m = n;
  for (let p = 2; p * p <= m; p++) {
    while (m % p === 0) {
      out.push(p);
      m /= p;
    }
  }
  if (m > 1) out.push(m);
  return out;
};
const isPrime = (n) => n > 1 && factorsOf(n).length === 2;
const isComposite = (n) => n > 1 && factorsOf(n).length > 2;
const expForm = (n) => {
  const pf = primeFactors(n);
  const map = new Map();
  for (const p of pf) map.set(p, (map.get(p) || 0) + 1);
  return [...map.entries()];
};
const factorPairs = (n) => {
  const pairs = [];
  for (let d = 1; d * d <= n; d++) if (n % d === 0) pairs.push([d, n / d]);
  return pairs;
};
const isPerfectSquare = (n) => {
  const r = Math.round(Math.sqrt(n));
  return r * r === n;
};
const smallestPrimeFactor = (m) => {
  for (let p = 2; p * p <= m; p++) if (m % p === 0) return p;
  return m;
};
const treeData = (n) => {
  if (n < 2) return [];
  const steps = [];
  let m = n;
  while (true) {
    const p = smallestPrimeFactor(m);
    if (p === m) {
      steps.push({ node: m, last: true });
      break;
    }
    steps.push({ node: m, leaf: p, rest: m / p, last: false });
    m /= p;
  }
  return steps;
};

const N_MIN = 1;
const N_MAX = 36;

/* independent trial-division prime test, to cross-check the lab's definition */
const trialPrime = (n) => {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
};

console.log('FactorLab audit\n===============');

/* ---- 1. factorsOf is exactly the set of divisors; pairs multiply to N ---- */
{
  for (let n = N_MIN; n <= N_MAX; n++) {
    const f = factorsOf(n);
    // every listed factor divides n; every non-listed number does not
    for (let d = 1; d <= n; d++) {
      const listed = f.includes(d);
      ok(listed === (n % d === 0), `factor membership n=${n} d=${d}`);
    }
    // 1 and n are always factors
    ok(f[0] === 1, `1 is a factor of ${n}`);
    ok(f[f.length - 1] === n, `${n} is a factor of itself`);
    // factors are sorted & unique
    for (let i = 1; i < f.length; i++) ok(f[i] > f[i - 1], `factors sorted/unique n=${n}`);
    // the pairing d <-> n/d covers exactly the factor set
    const fromPairs = new Set();
    for (const [a, b] of factorPairs(n)) {
      ok(a * b === n, `pair product a*b=n at n=${n} (${a},${b})`);
      ok(n % a === 0 && n % b === 0, `both members are factors n=${n} (${a},${b})`);
      fromPairs.add(a);
      fromPairs.add(b);
    }
    ok([...fromPairs].sort((x, y) => x - y).join(',') === f.join(','), `pairs cover all factors n=${n}`);
    // factor count is odd  <=>  n is a perfect square
    ok((f.length % 2 === 1) === isPerfectSquare(n), `#factors odd iff perfect square n=${n}`);
  }
  console.log('1. divisor set, pairing & √-symmetry ..... n = 1..36');
}

/* ---- 2. factor <=> remainder 0; the division sentence is exact ---------- */
{
  for (let n = N_MIN; n <= N_MAX; n++) {
    for (let d = 1; d <= N_MAX; d++) {
      const qn = Math.floor(n / d);
      const r = n % d;
      ok(n === d * qn + r, `division algorithm n=${n} d=${d}`);
      ok(r >= 0 && r < d, `remainder in range n=${n} d=${d}`);
      ok(isFactor(n, d) === (r === 0), `factor iff remainder 0 n=${n} d=${d}`);
    }
  }
  console.log('2. division algorithm & factor test ...... all (n,d) in 1..36 × 1..36');
}

/* ---- 3. prime factorization: product of primes, unique, recombines ------ */
{
  for (let n = 2; n <= N_MAX; n++) {
    const pf = primeFactors(n);
    // product of the prime list is exactly n
    ok(pf.reduce((a, b) => a * b, 1) === n, `∏primes = n at n=${n}`);
    // every entry is genuinely prime
    for (const p of pf) ok(trialPrime(p), `prime-factor ${p} of ${n} is prime`);
    // non-decreasing (canonical order)
    for (let i = 1; i < pf.length; i++) ok(pf[i] >= pf[i - 1], `prime list ordered n=${n}`);
    // exponent form recombines to n
    const back = expForm(n).reduce((acc, [p, e]) => acc * Math.pow(p, e), 1);
    ok(back === n, `exponent form recombines n=${n}`);
    // prime  <=>  a single prime factor with multiplicity 1  <=>  trial division
    ok(isPrime(n) === trialPrime(n), `isPrime matches trial division n=${n}`);
    ok(isPrime(n) === (pf.length === 1), `prime iff one prime factor n=${n}`);
    ok(isComposite(n) === !trialPrime(n), `composite iff not prime (n>1) n=${n}`);
    // a prime's only factors are 1 and itself; a prime factors into just itself
    if (isPrime(n)) {
      ok(factorsOf(n).join(',') === `1,${n}`, `prime factor list is 1,n at n=${n}`);
      ok(pf.length === 1 && pf[0] === n, `prime tree is a single atom n=${n}`);
    }
  }
  // 1 is a unit: neither prime nor composite, exactly one factor
  ok(!isPrime(1) && !isComposite(1), '1 is neither prime nor composite');
  ok(factorsOf(1).length === 1, '1 has exactly one factor');
  ok(primeFactors(1).length === 0, '1 has an empty prime factorization');
  console.log('3. prime factorization (∏, uniqueness, tree) ... n = 2..36');
}

/* ---- 4. the factor tree reconstructs n and ends on a prime -------------- */
{
  for (let n = 2; n <= N_MAX; n++) {
    const steps = treeData(n);
    // the collected primes (each split leaf + the terminal node) multiply to n
    let prod = 1;
    steps.forEach((s) => {
      if (s.last) {
        ok(trialPrime(s.node), `tree terminal node prime n=${n}`);
        prod *= s.node;
      } else {
        ok(trialPrime(s.leaf), `tree leaf prime n=${n}`);
        ok(s.node === s.leaf * s.rest, `tree split exact n=${n} node=${s.node}`);
        prod *= s.leaf;
      }
    });
    ok(prod === n, `tree primes multiply to n=${n}`);
    ok(steps[steps.length - 1].last === true, `tree ends on a prime n=${n}`);
    // the tree's primes equal primeFactors(n) as multisets
    const treePrimes = [];
    steps.forEach((s) => (s.last ? treePrimes.push(s.node) : treePrimes.push(s.leaf)));
    ok(treePrimes.slice().sort((a, b) => a - b).join(',') === primeFactors(n).join(','), `tree = primeFactors n=${n}`);
  }
  console.log('4. factor tree reconstructs n ............ n = 2..36');
}

/* ---- 5. calibration: found completes iff every factor swept; no false stamp */
{
  const CALIB_TARGETS = [12, 16, 18, 20, 24, 28, 30, 36];
  for (const t of CALIB_TARGETS) {
    const all = factorsOf(t);
    ok(all.length >= 4, `target ${t} has a satisfying factor count (${all.length})`);
    ok(isComposite(t), `target ${t} is composite (a real hunt)`);
    ok(t >= N_MIN && t <= N_MAX, `target ${t} within N range`);

    // simulate a full sweep d = 1..t, collecting d and t/d whenever d | t
    const found = new Set();
    for (let d = 1; d <= t; d++) {
      if (isFactor(t, d)) {
        found.add(d);
        found.add(t / d);
      }
      // partial sweep must never over-claim: found ⊆ true factors at all times
      for (const g of found) ok(all.includes(g), `no phantom factor for target ${t} (${g})`);
      // CALIBRATED (found==total) only when the collected set equals the real one
      const complete = found.size === all.length;
      const reallyComplete = [...found].sort((a, b) => a - b).join(',') === all.join(',');
      ok(complete === reallyComplete, `no false stamp target ${t} at d=${d}`);
    }
    ok(found.size === all.length, `full sweep finds every factor of ${t}`);
    ok([...found].sort((a, b) => a - b).join(',') === all.join(','), `found set equals factors of ${t}`);

    // reaching √t is enough: partners fill the rest for free
    const upToRoot = new Set();
    for (let d = 1; d * d <= t; d++)
      if (isFactor(t, d)) {
        upToRoot.add(d);
        upToRoot.add(t / d);
      }
    ok(upToRoot.size === all.length, `checking up to √t suffices for ${t}`);
  }

  // makeTarget stays in the curated set and can re-roll to a different value
  const makeTarget = (prev) => {
    let t;
    do {
      t = CALIB_TARGETS[Math.floor(Math.random() * CALIB_TARGETS.length)];
    } while (t === prev && CALIB_TARGETS.length > 1);
    return t;
  };
  let prev = null;
  for (let i = 0; i < 5000; i++) {
    const t = makeTarget(prev);
    ok(CALIB_TARGETS.includes(t), `random target in curated set (got ${t})`);
    ok(t !== prev, `random target differs from previous (${t})`);
    prev = t;
  }
  console.log('5. calibration completeness & no false stamp ... 8 targets fully swept + 5000 draws');
}

console.log(`\n${checks} checks run.`);
console.log(fail === 0 ? '✓ ALL CHECKS PASSED' : `✗ ${fail} CHECK(S) FAILED`);
process.exit(fail === 0 ? 0 : 1);
