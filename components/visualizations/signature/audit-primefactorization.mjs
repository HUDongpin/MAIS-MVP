/* ============================================================================
   audit-primefactorization.mjs — a standalone numeric proof that the math in
   PrimeFactorizationLab.jsx is correct. Run:  node audit-primefactorization.mjs

   The pure functions below are copied verbatim from the lab (same source of
   truth). We check them against an independent sieve and against brute force,
   then prove the tree operations and the calibration meter behave.
   ========================================================================== */

/* ---- functions copied verbatim from PrimeFactorizationLab.jsx ------------ */
function isPrime(n) {
  if (!Number.isInteger(n) || n < 2) return false;
  if (n < 4) return true;
  if (n % 2 === 0) return false;
  for (let d = 3; d * d <= n; d += 2) if (n % d === 0) return false;
  return true;
}
function smallestPrimeFactor(n) {
  if (n % 2 === 0) return 2;
  for (let d = 3; d * d <= n; d += 2) if (n % d === 0) return d;
  return n;
}
function factorize(n) {
  const out = [];
  let m = n;
  while (m % 2 === 0) { out.push(2); m /= 2; }
  for (let d = 3; d * d <= m; d += 2) { while (m % d === 0) { out.push(d); m /= d; } }
  if (m > 1) out.push(m);
  return out;
}
function factorPairs(n) {
  const out = [];
  for (let d = 2; d * d <= n; d++) if (n % d === 0) out.push([d, n / d]);
  return out;
}
function divisorsOf(n) {
  const out = [];
  for (let d = 1; d * d <= n; d++) {
    if (n % d === 0) { out.push(d); if (d !== n / d) out.push(n / d); }
  }
  return out.sort((a, b) => a - b);
}
function groupExponents(list) {
  const out = [];
  for (const p of list) {
    const last = out[out.length - 1];
    if (last && last[0] === p) last[1] += 1;
    else out.push([p, 1]);
  }
  return out;
}
function tauFromGroups(groups) { return groups.reduce((acc, [, e]) => acc * (e + 1), 1); }

let ID = 0;
const mk = (v) => ({ id: ++ID, v, kids: null });
function leavesOf(node, acc = []) {
  if (node.kids) { leavesOf(node.kids[0], acc); leavesOf(node.kids[1], acc); }
  else acc.push(node);
  return acc;
}
function treeComplete(root) { return leavesOf(root).every((l) => isPrime(l.v)); }
function buildFactored(v) {
  const node = mk(v);
  if (!isPrime(v)) {
    const p = smallestPrimeFactor(v);
    node.kids = [buildFactored(p), buildFactored(v / p)];
  }
  return node;
}
function buildAlt(v) {
  const node = mk(v);
  if (isPrime(v)) return node;
  const pairs = factorPairs(v);
  const pair = pairs[pairs.length - 1];
  node.kids = [buildFactored(pair[0]), buildFactored(pair[1])];
  return node;
}
function splitAt(node, id, pair) {
  if (node.id === id) return { ...node, kids: [mk(pair[0]), mk(pair[1])] };
  if (!node.kids) return node;
  const a = splitAt(node.kids[0], id, pair);
  const b = splitAt(node.kids[1], id, pair);
  if (a === node.kids[0] && b === node.kids[1]) return node;
  return { ...node, kids: [a, b] };
}
function autoFinishTree(node) {
  if (!node.kids) return isPrime(node.v) ? node : buildFactored(node.v);
  return { ...node, kids: [autoFinishTree(node.kids[0]), autoFinishTree(node.kids[1])] };
}

/* the challenge pool builder copied from the lab */
const CHALLENGE_POOL = (() => {
  const pool = [];
  for (let n = 12; n <= 99; n++) {
    const w = factorize(n).length;
    if (!isPrime(n) && w >= 3 && w <= 4) pool.push(n);
  }
  return pool;
})();

/* ---- test harness -------------------------------------------------------- */
let checks = 0, fails = 0;
const bad = [];
function ok(cond, msg) {
  checks++;
  if (!cond) { fails++; if (bad.length < 40) bad.push(msg); }
}
const prod = (arr) => arr.reduce((a, b) => a * b, 1);
const eqMultiset = (a, b) => {
  if (a.length !== b.length) return false;
  const x = [...a].sort((p, q) => p - q), y = [...b].sort((p, q) => p - q);
  return x.every((v, i) => v === y[i]);
};

/* independent reference: a sieve of Eratosthenes */
const SIEVE_MAX = 10000;
const sieve = new Uint8Array(SIEVE_MAX + 1).fill(1);
sieve[0] = sieve[1] = 0;
for (let i = 2; i * i <= SIEVE_MAX; i++) if (sieve[i]) for (let j = i * i; j <= SIEVE_MAX; j += i) sieve[j] = 0;

/* 1) isPrime matches the sieve on every n in [0, 10000] */
for (let n = 0; n <= SIEVE_MAX; n++) ok(isPrime(n) === !!sieve[n], `isPrime(${n})`);
ok(!isPrime(1), '1 is not prime');
ok(!isPrime(0), '0 is not prime');
ok(isPrime(2) && isPrime(3) && isPrime(5) && isPrime(7), 'small primes');
ok(!isPrime(2.5), 'non-integer not prime');

/* 2) factorize: product = n, every factor prime, ascending, matches divisor τ */
for (let n = 2; n <= SIEVE_MAX; n++) {
  const f = factorize(n);
  ok(prod(f) === n, `factorize product ${n}`);
  ok(f.every((p) => isPrime(p)), `factorize all prime ${n}`);
  ok(f.every((p, i) => i === 0 || f[i - 1] <= p), `factorize ascending ${n}`);
  if (isPrime(n)) ok(f.length === 1 && f[0] === n, `prime factorize ${n}`);
  const groups = groupExponents(f);
  ok(tauFromGroups(groups) === divisorsOf(n).length, `tau ${n}`);
  // distinct primes count
  ok(groups.length === new Set(f).size, `omega ${n}`);
}

/* 3) factorPairs: complete, correct, non-trivial, unordered-once */
for (let n = 2; n <= 2000; n++) {
  const pairs = factorPairs(n);
  for (const [a, b] of pairs) {
    ok(a > 1 && b > 1, `pair >1 ${n}:${a}x${b}`);
    ok(a * b === n, `pair product ${n}:${a}x${b}`);
    ok(a <= b, `pair ordered ${n}:${a}x${b}`);
  }
  // every non-trivial divisor d (1<d<n) appears as the small side exactly for d<=sqrt(n)
  const expected = divisorsOf(n).filter((d) => d > 1 && d * d <= n).length;
  ok(pairs.length === expected, `pair count ${n}`);
  ok(isPrime(n) === (pairs.length === 0), `prime has no pair ${n}`);
}

/* 4) trees: buildFactored is complete, product-preserving, leaves == factorize */
for (let n = 2; n <= 2000; n++) {
  const t = buildFactored(n);
  const lv = leavesOf(t).map((l) => l.v);
  ok(treeComplete(t), `buildFactored complete ${n}`);
  ok(prod(lv) === n, `buildFactored product ${n}`);
  ok(eqMultiset(lv, factorize(n)), `buildFactored leaves ${n}`);
}

/* 5) UNIQUENESS (Fundamental Theorem): different split strategies -> same atoms */
let uniqueChecked = 0;
for (let n = 2; n <= 2000; n++) {
  if (isPrime(n)) continue;
  const a = leavesOf(buildFactored(n)).map((l) => l.v);
  const b = leavesOf(buildAlt(n)).map((l) => l.v);
  ok(eqMultiset(a, b), `uniqueness build vs alt ${n}`);
  ok(eqMultiset(a, factorize(n)), `uniqueness == factorize ${n}`);
  uniqueChecked++;
}

/* 6) splitAt preserves the product invariant, and any random split sequence
      terminates at the same prime multiset (order-independence) */
function randInt(k) { return Math.floor(Math.random() * k); }
let splitSeqChecked = 0;
for (let trial = 0; trial < 4000; trial++) {
  const n = 12 + randInt(988); // 12..999
  if (isPrime(n)) continue;
  let root = mk(n);
  let guard = 0;
  while (!treeComplete(root) && guard++ < 200) {
    const comps = leavesOf(root).filter((l) => !isPrime(l.v));
    const target = comps[randInt(comps.length)];
    const pairs = factorPairs(target.v);
    const pair = pairs[randInt(pairs.length)];
    // product invariant before/after this split
    const before = prod(leavesOf(root).map((l) => l.v));
    root = splitAt(root, target.id, pair);
    const after = prod(leavesOf(root).map((l) => l.v));
    ok(before === n && after === n, `split invariant ${n}`);
  }
  ok(treeComplete(root), `random splits terminate ${n}`);
  ok(eqMultiset(leavesOf(root).map((l) => l.v), factorize(n)), `random splits == factorize ${n}`);
  splitSeqChecked++;
}

/* 7) autoFinishTree completes any partial tree to the correct factorization */
for (let trial = 0; trial < 2000; trial++) {
  const n = 12 + randInt(988);
  if (isPrime(n)) continue;
  let root = mk(n);
  // do 0..2 random partial splits
  const steps = randInt(3);
  for (let s = 0; s < steps; s++) {
    const comps = leavesOf(root).filter((l) => !isPrime(l.v));
    if (!comps.length) break;
    const target = comps[randInt(comps.length)];
    const pairs = factorPairs(target.v);
    root = splitAt(root, target.id, pairs[randInt(pairs.length)]);
  }
  const finished = autoFinishTree(root);
  ok(treeComplete(finished), `autoFinish complete ${n}`);
  ok(eqMultiset(leavesOf(finished).map((l) => l.v), factorize(n)), `autoFinish == factorize ${n}`);
}

/* 8) CALIBRATION METER: pct = 100*primeLeaves/Omega is monotonic across splits,
      strictly < 100 until complete, and exactly 100 iff every leaf is prime.
      This proves no false CALIBRATED is possible. */
let meterChecked = 0;
for (const n of CHALLENGE_POOL) {
  const Omega = factorize(n).length;
  // run many random split orders per challenge number
  for (let trial = 0; trial < 60; trial++) {
    let root = mk(n);
    let prevPct = 0;
    let guard = 0;
    while (guard++ < 200) {
      const leaves = leavesOf(root);
      const primeLeaves = leaves.filter((l) => isPrime(l.v)).length;
      const complete = leaves.every((l) => isPrime(l.v));
      const pct = Math.min(100, Math.round((100 * primeLeaves) / Math.max(1, Omega)));
      ok(pct >= prevPct, `meter monotonic ${n}`);
      ok(complete ? pct === 100 : pct < 100, `meter 100 iff done ${n} (pct=${pct})`);
      prevPct = pct;
      if (complete) break;
      const comps = leaves.filter((l) => !isPrime(l.v));
      const target = comps[randInt(comps.length)];
      const pairs = factorPairs(target.v);
      root = splitAt(root, target.id, pairs[randInt(pairs.length)]);
    }
    meterChecked++;
  }
}

/* 9) challenge pool sanity: all composite, Omega in [3,4], all in 12..99 */
ok(CHALLENGE_POOL.length > 0, 'challenge pool non-empty');
for (const n of CHALLENGE_POOL) {
  ok(!isPrime(n), `challenge composite ${n}`);
  const w = factorize(n).length;
  ok(w >= 3 && w <= 4, `challenge Omega ${n}=${w}`);
  ok(n >= 12 && n <= 99, `challenge range ${n}`);
}

/* 10) a few hand-checked, textbook facts */
ok(eqMultiset(factorize(60), [2, 2, 3, 5]), '60 = 2·2·3·5');
ok(eqMultiset(factorize(100), [2, 2, 5, 5]), '100 = 2²·5²');
ok(eqMultiset(factorize(97), [97]), '97 prime');
ok(tauFromGroups(groupExponents(factorize(12))) === 6, '12 has 6 divisors');
ok(JSON.stringify(divisorsOf(12)) === JSON.stringify([1, 2, 3, 4, 6, 12]), '12 divisors list');
ok(tauFromGroups(groupExponents(factorize(36))) === 9, '36 has 9 divisors');
ok(factorPairs(24).length === 3 && JSON.stringify(factorPairs(24)) === JSON.stringify([[2, 12], [3, 8], [4, 6]]), '24 factor pairs');

/* ---- report -------------------------------------------------------------- */
console.log(`\nPrimeFactorization audit`);
console.log(`  isPrime/factorize/τ swept n = 2 … ${SIEVE_MAX}`);
console.log(`  uniqueness (FTA) checked on ${uniqueChecked} composites`);
console.log(`  random split-order sequences: ${splitSeqChecked}`);
console.log(`  calibration-meter walks: ${meterChecked} (pool size ${CHALLENGE_POOL.length})`);
console.log(`\n  ${checks.toLocaleString()} checks, ${fails} failures`);
if (fails) { console.log('  FAILURES:'); bad.forEach((m) => console.log('   ✗ ' + m)); process.exit(1); }
else console.log('  ✓ all pass\n');
