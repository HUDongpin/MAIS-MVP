/* ============================================================================
   audit-primes.mjs — numeric proof that PrimeNumbersLab's sieve is exact, that
   the picture never claims a number is prime before it has proved it, and that
   the prime hunt can never award a false CALIBRATED stamp.

   The lab's thesis, in one line:
       after sieving by every prime p with p² ≤ N, everything still standing is
       prime — surviving IS the proof.
   Everything below verifies that claim, plus every fact the lab prints.

   NOTE ON METHOD: this audit does NOT re-type the model. It slices the real
   MODEL section straight out of PrimeNumbersLab.jsx and evaluates it, so the
   functions tested here are byte-for-byte the ones that ship. A copy could
   drift; this cannot.

   Run:  node audit-primes.mjs
   Zero dependencies.
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = fs.readFileSync(path.join(HERE, 'PrimeNumbersLab.jsx'), 'utf8');

/* ---- load the SHIPPED model, not a copy of it -------------------------- */
const from = SRC.indexOf('function gcd(a, b) {');
const to = SRC.indexOf('const STEPS = [');
if (from < 0 || to < 0 || to <= from) {
  console.error('FATAL: could not locate the MODEL section in PrimeNumbersLab.jsx');
  process.exit(1);
}
const M = new Function(
  SRC.slice(from, to) +
    '\nreturn { gcd, isPrime, primesUpTo, sievePrimesFor, nextSievePrime, struckRound,' +
    ' cellKind, liveResidues, twinPairs, largestGap, gapMap, shareText, WINDOWS };'
)();

const LIMIT_MIN = 20;
const LIMIT_MAX = 120;
const W_MIN = 6;
const W_MAX = 12;

/* ---- independent reference implementations (deliberately different code) --
   A real sieve of Eratosthenes, written the ordinary way, as the oracle that
   the lab's per-cell rule is checked against. ---- */
function sieveRef(n) {
  const flag = new Array(n + 1).fill(true);
  flag[0] = false;
  if (n >= 1) flag[1] = false;
  for (let p = 2; p * p <= n; p++) if (flag[p]) for (let m = p * p; m <= n; m += p) flag[m] = false;
  return flag; // flag[k] === true  ⟺  k is prime
}
const REF = sieveRef(10000);
const isPrimeRef = (n) => n >= 0 && n <= 10000 && REF[n] === true;

function totientRef(w) {
  let c = 0;
  for (let k = 1; k <= w; k++) if (M.gcd(k, w) === 1) c++;
  return c;
}

/* ---- harness ----------------------------------------------------------- */
let checks = 0;
let fails = 0;
const failSamples = [];
function ok(cond, msg) {
  checks++;
  if (!cond) {
    fails++;
    if (failSamples.length < 20) failSamples.push(msg);
  }
}
function section(name, fn) {
  const c0 = checks;
  const f0 = fails;
  fn();
  const pad = '.'.repeat(Math.max(2, 46 - name.length));
  console.log(
    `  ${name} ${pad} ${String(checks - c0).padStart(8)} checks   ${
      fails - f0 === 0 ? 'ok' : `${fails - f0} FAILED`
    }`
  );
}

console.log('\naudit-primes.mjs — PrimeNumbersLab\n');

/* =========================================================================
   1. Primality itself
   ========================================================================= */
section('isPrime agrees with a real sieve to 10,000', () => {
  for (let n = 0; n <= 10000; n++) ok(M.isPrime(n) === isPrimeRef(n), `isPrime(${n})`);
  // the classic traps
  ok(M.isPrime(1) === false, '1 is not prime (it is the unit)');
  ok(M.isPrime(2) === true, '2 is prime');
  ok(M.isPrime(0) === false, '0 is not prime');
  ok(M.isPrime(-7) === false, 'negatives are not prime');
  ok(M.isPrime(2.5) === false, 'non-integers are not prime');
  ok(M.isPrime(9) === false, '9 = 3 × 3 is composite');
  ok(M.isPrime(91) === false, '91 = 7 × 13 is composite (the classic near-miss)');
});

/* =========================================================================
   2. Which primes must you sieve by, and when may you stop?
   ========================================================================= */
section('sieving primes = exactly those with p² ≤ N', () => {
  for (let N = 1; N <= 400; N++) {
    const sp = M.sievePrimesFor(N);
    for (const p of sp) {
      ok(isPrimeRef(p), `sievePrimesFor(${N}) contains composite ${p}`);
      ok(p * p <= N, `sievePrimesFor(${N}) contains ${p} with ${p}² > ${N}`);
    }
    for (let p = 2; p * p <= N; p++) if (isPrimeRef(p)) ok(sp.includes(p), `sievePrimesFor(${N}) missing ${p}`);
    ok(
      sp.slice().sort((x, y) => x - y).join() === sp.join(),
      `sievePrimesFor(${N}) not ascending`
    );

    const q = M.nextSievePrime(N);
    ok(isPrimeRef(q), `nextSievePrime(${N}) = ${q} is not prime`);
    ok(q * q > N, `nextSievePrime(${N}) = ${q} but ${q}² ≤ ${N}`);
    for (let p = 2; p < q; p++) if (isPrimeRef(p)) ok(p * p <= N, `${p} < ${q} yet ${p}² > ${N}`);
    ok(!sp.includes(q), `the skippable prime ${q} should not be a sieving prime for ${N}`);
    ok(sp.length === sp.filter((p) => p < q).length, `sieving primes for ${N} should all be < ${q}`);
  }
  // the exact claims the lesson text makes out loud
  ok(M.sievePrimesFor(100).join() === '2,3,5,7', 'step 4: sieve by 2,3,5,7 for N=100');
  ok(M.nextSievePrime(100) === 11, 'step 4: 11 is the first skippable prime for N=100');
  ok(11 * 11 === 121 && 121 > 100, 'step 4: 11² = 121 > 100');
  ok(M.sievePrimesFor(120).join() === '2,3,5,7', 'step 4: four rounds still suffice for N=120');
  ok(M.nextSievePrime(120) === 11 && 121 > 120, 'step 4: 11² = 121 > 120');
  // the whole dial range needs at most four rounds, and never fewer than two
  for (let N = LIMIT_MIN; N <= LIMIT_MAX; N++) {
    const m = M.sievePrimesFor(N).length;
    ok(m >= 2 && m <= 4, `N=${N} needs ${m} rounds — outside the designed 2..4`);
  }
});

/* =========================================================================
   3. struckRound — who strikes whom, and in which round
   ========================================================================= */
section('struckRound picks the smallest prime factor', () => {
  for (let N = LIMIT_MIN; N <= LIMIT_MAX; N++) {
    const sp = M.sievePrimesFor(N);
    for (let n = 1; n <= N; n++) {
      const sr = M.struckRound(n, sp);
      if (sr === 0) {
        // never struck ⇒ nothing in sp divides it except possibly itself
        for (const p of sp) ok(!(n % p === 0 && n !== p), `${n} escaped the sieve but ${p} divides it`);
        ok(n === 1 || isPrimeRef(n), `${n} escaped the sieve for N=${N} but is composite`);
      } else {
        const p = sp[sr - 1];
        ok(p !== undefined, `struckRound(${n}) = ${sr} is out of range`);
        ok(n % p === 0 && n !== p, `${n} struck in round ${sr} by ${p}, which does not divide it`);
        ok(!isPrimeRef(n), `${n} was struck for N=${N} but is prime`);
        // it really is the SMALLEST prime factor
        for (let i = 0; i < sr - 1; i++) ok(n % sp[i] !== 0, `${n} should have gone in round ${i + 1}`);
      }
    }
  }
});

/* =========================================================================
   4. THE CENTREPIECE. What the picture is allowed to claim.
      Soundness: it never calls a composite prime, at ANY round.
      Completeness: at the last round it has found every prime — the flip.
   ========================================================================= */
section('cellKind: SOUND at every round, COMPLETE at the last', () => {
  for (let N = LIMIT_MIN; N <= LIMIT_MAX; N++) {
    const sp = M.sievePrimesFor(N);
    const maxRounds = sp.length;
    for (let r = 0; r <= maxRounds; r++) {
      for (let n = 1; n <= N; n++) {
        const k = M.cellKind(n, r, sp);
        ok(['unit', 'struck', 'prime', 'undecided'].includes(k), `cellKind(${n},${r}) = ${k}`);
        if (k === 'unit') ok(n === 1, `only 1 is the unit, not ${n}`);
        if (n === 1) ok(k === 'unit', `1 must always read as the unit, got ${k}`);
        // SOUNDNESS — the two claims the picture actually makes
        if (k === 'prime') ok(isPrimeRef(n), `FALSE PRIME: N=${N} r=${r} called ${n} prime`);
        if (k === 'struck') ok(!isPrimeRef(n) && n > 1, `FALSE COMPOSITE: N=${N} r=${r} struck ${n}`);
        // COMPLETENESS at the final round — the moment the grid snaps shut
        if (r === maxRounds) {
          ok(
            (k === 'prime') === isPrimeRef(n),
            `sieve complete but N=${N} n=${n} reads ${k} (prime=${isPrimeRef(n)})`
          );
          ok(k !== 'undecided', `nothing may stay undecided once the sieve is done (N=${N}, n=${n})`);
        }
      }
    }
  }
});

section('cellKind is monotone — no cell ever flip-flops', () => {
  for (let N = LIMIT_MIN; N <= LIMIT_MAX; N++) {
    const sp = M.sievePrimesFor(N);
    for (let r = 0; r < sp.length; r++) {
      for (let n = 1; n <= N; n++) {
        const a = M.cellKind(n, r, sp);
        const b = M.cellKind(n, r + 1, sp);
        if (a === 'prime') ok(b === 'prime', `${n} was prime at r=${r} but ${b} at r=${r + 1}`);
        if (a === 'struck') ok(b === 'struck', `${n} was struck at r=${r} but ${b} at r=${r + 1}`);
        if (a === 'unit') ok(b === 'unit', `1 changed kind`);
        if (b === 'undecided') ok(a === 'undecided', `${n} became undecided at r=${r + 1}`);
      }
    }
  }
});

section('round 0 proves nothing; the mid-sieve trap 9 is honest', () => {
  for (let N = LIMIT_MIN; N <= LIMIT_MAX; N++) {
    const sp = M.sievePrimesFor(N);
    for (let n = 2; n <= N; n++)
      ok(M.cellKind(n, 0, sp) === 'undecided', `before any sieving, ${n} must be undecided`);
    // the honesty case the lesson calls out by name: 9 survives round 1 and must
    // NOT be drawn as prime
    ok(M.cellKind(9, 1, sp) === 'undecided', `9 must read undecided after round 1, not prime`);
    ok(M.cellKind(9, 2, sp) === 'struck', `9 must be struck in round 2 (3 × 3)`);
    // 25 is the same trap one round later
    if (N >= 25) {
      ok(M.cellKind(25, 2, sp) === 'undecided', `25 must read undecided after round 2`);
      ok(M.cellKind(25, 3, sp) === 'struck', `25 must be struck in round 3 (5 × 5)`);
    }
    // and the smallest survivor above 3 after two rounds really is 5 (step 3's answer)
    let smallest = 0;
    for (let n = 4; n <= N && !smallest; n++) if (M.cellKind(n, 2, sp) !== 'struck') smallest = n;
    ok(smallest === 5, `after striking 2s and 3s the smallest survivor above 3 should be 5, got ${smallest}`);
  }
});

/* =========================================================================
   5. The counts the lab prints
   ========================================================================= */
section('prime counts and the printed headline', () => {
  for (let N = LIMIT_MIN; N <= LIMIT_MAX; N++) {
    const sp = M.sievePrimesFor(N);
    const ps = M.primesUpTo(N);
    for (const p of ps) ok(isPrimeRef(p), `primesUpTo(${N}) contains composite ${p}`);
    let ref = 0;
    for (let n = 2; n <= N; n++) if (isPrimeRef(n)) ref++;
    ok(ps.length === ref, `primesUpTo(${N}).length = ${ps.length}, should be ${ref}`);
    // the headline count (drawn from cellKind) must equal the true count
    let drawn = 0;
    for (let n = 1; n <= N; n++) if (M.cellKind(n, sp.length, sp) === 'prime') drawn++;
    ok(drawn === ref, `N=${N}: grid shows ${drawn} primes, truth is ${ref}`);
    // every cell is accounted for exactly once
    let u = 0;
    let s = 0;
    let p2 = 0;
    let d = 0;
    for (let n = 1; n <= N; n++) {
      const k = M.cellKind(n, sp.length, sp);
      if (k === 'unit') u++;
      else if (k === 'struck') s++;
      else if (k === 'prime') p2++;
      else d++;
    }
    ok(u + s + p2 + d === N, `N=${N}: cells do not add up`);
    ok(u === 1 && d === 0, `N=${N}: expected exactly one unit and no undecided`);
  }
  // the numbers the lesson text says out loud
  ok(M.primesUpTo(100).length === 25, 'π(100) = 25');
  ok(M.primesUpTo(60).length === 17, 'π(60) = 17 — quoted in step 5');
  ok(M.primesUpTo(120).length === 30, 'π(120) = 30');
  ok(M.primesUpTo(30).length === 10, 'π(30) = 10');
  ok(M.primesUpTo(120).length - M.primesUpTo(60).length === 13, 'step 5: 13 primes from 61 to 120');
  ok(M.primesUpTo(10).join() === '2,3,5,7', 'the primes to 10');
});

section('shareText never lies about being exact', () => {
  for (let N = LIMIT_MIN; N <= LIMIT_MAX; N++) {
    const k = M.primesUpTo(N).length;
    const t = M.shareText(k, N);
    const exact = (100 * k) % N === 0;
    ok(t.includes(exact ? '=' : '≈'), `shareText(${k},${N}) = "${t}" used the wrong sign`);
    const m = t.match(/([\d.]+)%$/);
    ok(!!m, `shareText(${k},${N}) = "${t}" has no percent`);
    if (m) {
      const shown = parseFloat(m[1]);
      const truth = (100 * k) / N;
      if (exact) ok(shown === truth, `shareText(${k},${N}) claims exact ${shown} but truth is ${truth}`);
      // one decimal place, so the honest ≈ may be off by at most half a tenth
      // (the slack absorbs binary float dust: 31.3 − 31.25 is not exactly 0.05)
      else ok(Math.abs(shown - truth) <= 0.0501, `shareText(${k},${N}) rounded badly`);
    }
  }
  ok(M.shareText(30, 120) === '30 of 120 = 25%', 'the headline 30/120 = 25% must be exact');
});

/* =========================================================================
   6. The column lens — φ(w) of the w columns, and the 6k±1 theorem
   ========================================================================= */
section('live columns = φ(w), and dead columns really are dead', () => {
  for (let w = W_MIN; w <= W_MAX; w++) {
    const live = M.liveResidues(w);
    ok(live.length === totientRef(w), `liveResidues(${w}).length = ${live.length}, φ(${w}) = ${totientRef(w)}`);
    for (const rr of live) ok(M.gcd(rr, w) === 1, `residue ${rr} is not coprime to ${w}`);
    ok(new Set(live).size === live.length, `liveResidues(${w}) has duplicates`);
    // THE CLAIM: below row 1, a dead column can hold no prime at all
    for (let n = w + 1; n <= 2000; n++) {
      const rr = n % w;
      if (M.gcd(rr, w) !== 1) ok(!isPrimeRef(n), `${n} is prime but sits in dead column ${rr} (mod ${w})`);
    }
    // and every prime above w sits in a LIVE column
    for (let n = w + 1; n <= 2000; n++)
      if (isPrimeRef(n)) ok(live.includes(n % w), `prime ${n} is not in a live column of width ${w}`);
    // the wash starts below row 1 for a reason: dead columns DO hold primes there
    if (w === 6) ok(M.gcd(2 % 6, 6) !== 1 && isPrimeRef(2), '2 is prime and sits in a dead column of width 6');
  }
  // the headline consequence, stated in step 7
  ok(M.liveResidues(6).slice().sort((a, b) => a - b).join() === '1,5', 'width 6: live columns are 1 and 5');
  ok(M.liveResidues(10).slice().sort((a, b) => a - b).join() === '1,3,7,9', 'width 10: primes end in 1,3,7,9');
  ok(totientRef(6) === 2 && totientRef(10) === 4, 'φ(6) = 2, φ(10) = 4');
  for (let n = 5; n <= 5000; n++)
    if (isPrimeRef(n)) ok(n % 6 === 1 || n % 6 === 5, `prime ${n} is not 6k ± 1`);
  // step 7's distractor must genuinely be false: the width-6 column headed 4 is
  // not "the multiples of 4"
  ok(10 % 6 === 4 && 10 % 4 !== 0, 'the column headed 4 (mod 6) contains 10, which is not a multiple of 4');
});

/* =========================================================================
   7. Gaps and twins
   ========================================================================= */
section('gaps, twins, and the "only 2 and 3 are 1 apart" claim', () => {
  for (let N = LIMIT_MIN; N <= LIMIT_MAX; N++) {
    const ps = M.primesUpTo(N);
    const tw = M.twinPairs(ps);
    for (const [p, q] of tw) {
      ok(isPrimeRef(p) && isPrimeRef(q), `twin (${p},${q}) is not a pair of primes`);
      ok(q - p === 2, `twin (${p},${q}) is not 2 apart`);
      for (let m = p + 1; m < q; m++) ok(!isPrimeRef(m), `(${p},${q}) are not consecutive primes`);
    }
    // no twin pair is missed
    let ref = 0;
    for (let i = 0; i + 1 < ps.length; i++) if (ps[i + 1] - ps[i] === 2) ref++;
    ok(tw.length === ref, `twinPairs missed some for N=${N}`);

    const g = M.largestGap(ps);
    if (ps.length > 1) {
      for (let i = 0; i + 1 < ps.length; i++)
        ok(ps[i + 1] - ps[i] <= g.gap, `largestGap(${N}) = ${g.gap} is not the largest`);
      ok(g.at && g.at[1] - g.at[0] === g.gap, `largestGap(${N}) reports the wrong pair`);
      ok(isPrimeRef(g.at[0]) && isPrimeRef(g.at[1]), `largestGap(${N}) endpoints are not prime`);
    }

    const gm = M.gapMap(ps);
    for (let i = 0; i + 1 < ps.length; i++)
      ok(gm.get(ps[i]) === ps[i + 1] - ps[i], `gapMap wrong at ${ps[i]}`);
    ok(gm.get(ps[ps.length - 1]) === undefined, `the last prime must have no gap drawn`);
  }
  // step 6's answer: apart from (2,3), no two primes are 1 apart — ever
  for (let n = 3; n <= 5000; n++) ok(!(isPrimeRef(n) && isPrimeRef(n + 1)), `${n} and ${n + 1} are both prime`);
  ok(isPrimeRef(2) && isPrimeRef(3), '2 and 3 are the one pair 1 apart');
  ok(!isPrimeRef(8), 'step 6 distractor: 8 is composite');
  // the twins the lesson names
  const t120 = M.twinPairs(M.primesUpTo(120)).map(([a, b]) => `${a},${b}`);
  for (const pair of ['3,5', '5,7', '11,13', '17,19', '29,31', '41,43', '59,61', '71,73', '101,103'])
    ok(t120.includes(pair), `twin pair (${pair}) should be found up to 120`);
  ok(M.largestGap(M.primesUpTo(120)).gap === 8, 'the largest gap up to 120 is 8 (89 → 97)');
});

/* =========================================================================
   8. Euclid's proof sketch, as the lesson states it
   ========================================================================= */
section("Euclid: p₁···p_k + 1 always hides a NEW prime", () => {
  const ps = M.primesUpTo(40);
  for (let k = 1; k <= 6; k++) {
    const list = ps.slice(0, k);
    const n = list.reduce((a, b) => a * b, 1) + 1;
    for (const p of list) ok(n % p === 1, `${n} should leave remainder 1 when divided by ${p}`);
    // so every prime factor of n is outside the list
    let m = n;
    const factors = [];
    for (let d = 2; d * d <= m; d++) while (m % d === 0) (factors.push(d), (m /= d));
    if (m > 1) factors.push(m);
    for (const f of factors) {
      ok(isPrimeRef(f) || f > 10000, `${f} should be prime`);
      ok(!list.includes(f), `${f} divides ${n} but is already on the list — Euclid's step would fail`);
    }
    ok(factors.length > 0, `${n} must have a prime factor`);
  }
});

/* =========================================================================
   9. The prime hunt — no false CALIBRATED stamp is possible
   ========================================================================= */
section('hunt windows are well formed and winnable', () => {
  ok(Array.isArray(M.WINDOWS) && M.WINDOWS.length >= 3, 'there must be several windows');
  for (const win of M.WINDOWS) {
    ok(win.lo >= 1 && win.hi > win.lo, `window ${win.lo}–${win.hi} is malformed`);
    ok(win.hi <= 100, `window ${win.lo}–${win.hi} exceeds the CCSS 4.OA.B.4 range of 100`);
    ok(win.hi >= LIMIT_MIN && win.hi <= LIMIT_MAX, `window ${win.lo}–${win.hi} is outside the N dial range`);
    const wp = M.primesUpTo(win.hi).filter((p) => p >= win.lo);
    ok(wp.length >= 5 && wp.length <= 12, `window ${win.lo}–${win.hi} has ${wp.length} primes — bad size`);
    for (const p of wp) ok(isPrimeRef(p) && p >= win.lo && p <= win.hi, `window prime ${p} is wrong`);
    // and the window must contain composites too, or the task is trivial
    let comps = 0;
    for (let n = win.lo; n <= win.hi; n++) if (!isPrimeRef(n) && n > 1) comps++;
    ok(comps > wp.length, `window ${win.lo}–${win.hi} should be mostly composite`);
  }
});

/* This mirrors the component's onPointerDown for the hunt, exactly:
     - outside the window            → ignored
     - already found                 → ignored
     - isPrime                       → added
     - anything else (incl. 1)       → rejected, nothing added
   The stamp is `found.length === winPrimes.length`. */
function huntClick(n, win, found) {
  if (n < win.lo || n > win.hi) return found;
  if (found.includes(n)) return found;
  if (M.isPrime(n)) return found.concat(n);
  return found;
}

section('the hunt stamp is unfakeable (exhaustive + random walks)', () => {
  for (const win of M.WINDOWS) {
    const wp = M.primesUpTo(win.hi).filter((p) => p >= win.lo);
    const total = wp.length;

    // (a) EXHAUSTIVE: click every cell of the whole chart, in order. After each
    // click, found must always be a subset of the true primes, and the stamp
    // must be lit if and only if every prime really has been caught.
    let found = [];
    for (let n = 1; n <= win.hi; n++) {
      found = huntClick(n, win, found);
      for (const f of found) ok(wp.includes(f), `caught ${f}, which is not a prime of the window`);
      ok(new Set(found).size === found.length, 'the found list must never hold duplicates');
      const stamped = found.length === total;
      const trulyDone = wp.every((p) => found.includes(p));
      ok(stamped === trulyDone, `FALSE STAMP at n=${n} in ${win.lo}–${win.hi}`);
    }
    ok(found.length === total, `clicking every cell must finish ${win.lo}–${win.hi}`);
    ok(found.join() === wp.join(), 'the finished set must be exactly the window primes');

    // (b) ADVERSARIAL: click every composite and every out-of-window cell, many
    // times over. The meter must not move one step.
    let bad = [];
    for (let pass = 0; pass < 3; pass++)
      for (let n = 1; n <= win.hi + 20; n++)
        if (!M.isPrime(n) || n < win.lo || n > win.hi) {
          bad = huntClick(n, win, bad);
          ok(bad.length === 0, `a wrong click at ${n} moved the meter in ${win.lo}–${win.hi}`);
        }

    // (c) RANDOM WALKS: shuffled sequences of good, bad and repeat clicks.
    for (let trial = 0; trial < 200; trial++) {
      const seq = [];
      for (let n = 1; n <= win.hi; n++) seq.push(n, n); // every cell twice: repeats must be no-ops
      for (let i = seq.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [seq[i], seq[j]] = [seq[j], seq[i]];
      }
      let f = [];
      for (const n of seq) {
        f = huntClick(n, win, f);
        for (const x of f) ok(wp.includes(x), `random walk caught non-prime ${x}`);
        ok((f.length === total) === wp.every((p) => f.includes(p)), 'FALSE STAMP during a random walk');
        ok(f.length <= total, 'the meter overflowed past 100%');
      }
      ok(f.length === total, 'a full random walk must end calibrated');
    }

    // (d) the meter reads 0 on arrival, so the challenge is never pre-solved
    ok(huntClick(-1, win, []).length === 0, 'the board must start empty');
  }
});

section('"Reveal one" only ever reveals a real prime', () => {
  for (const win of M.WINDOWS) {
    const wp = M.primesUpTo(win.hi).filter((p) => p >= win.lo);
    let found = [];
    for (let i = 0; i < wp.length; i++) {
      const missing = wp.find((p) => !found.includes(p)); // mirrors revealOne()
      ok(missing != null, 'reveal must find a candidate while any remain');
      ok(M.isPrime(missing), `revealOne offered ${missing}, which is not prime`);
      found = found.concat(missing);
      ok((found.length === wp.length) === wp.every((p) => found.includes(p)), 'reveal broke the stamp rule');
    }
    ok(wp.find((p) => !found.includes(p)) == null, 'reveal must run out exactly when the hunt is won');
  }
});

/* =========================================================================
   10. Lesson consistency — the steps must describe the lab that shipped
   ========================================================================= */
section('lesson text matches the machine', () => {
  // step 1 opens on N = 60; the component's initial state says so
  ok(/useState\(60\)/.test(SRC), 'the lab should open at N = 60 (step 1 says "these 60 numbers")');
  ok(/const \[w, setW\] = useState\(10\)/.test(SRC), 'the lab should open on a 10-wide chart');
  ok(M.sievePrimesFor(60).length === 4, 'step 4 is titled "Four rounds is all it takes" — N=60 needs 4');
  ok(M.sievePrimesFor(60).join() === '2,3,5,7', 'step 4: the four rounds are 2, 3, 5, 7');
  // step 2's answer: exactly one even number survives its own round
  const sp60 = M.sievePrimesFor(60);
  let evensLeft = 0;
  for (let n = 2; n <= 60; n += 2) if (M.cellKind(n, 1, sp60) !== 'struck') evensLeft++;
  ok(evensLeft === 1, `after round 1 exactly one even number should stand, found ${evensLeft}`);
  ok(M.cellKind(2, 1, sp60) === 'prime', '2 must survive its own round, and be proven prime by it');
  // the dial ranges the UI advertises
  ok(/const LIMIT_MIN = 20;/.test(SRC) && /const LIMIT_MAX = 120;/.test(SRC), 'N dial is 20..120');
  ok(/const W_MIN = 6;/.test(SRC) && /const W_MAX = 12;/.test(SRC), 'w dial is 6..12');
  // every quiz answer must be a real index into its choices
  // NB: not indexOf('export default function') — the header comment's usage
  // example contains that string and would slice to nothing.
  const steps = SRC.slice(SRC.indexOf('const STEPS = ['), SRC.indexOf('export default function PrimeNumbersLab'));
  const answers = [...steps.matchAll(/answer:\s*(\d+)/g)].map((m) => +m[1]);
  ok(answers.length === 7, `expected 7 quiz answers, found ${answers.length}`);
  for (const a of answers) ok(a === 0, 'house convention: the correct choice is index 0');

  /* THE HUNT MUST NOT PRINT ITS OWN ANSWER. Every facts row that names or counts
     the primes has to be gated on !hunt, or the challenge is readable off the
     panel instead of solved. (This shipped broken once; the gate stays tested.) */
  const facts = SRC.slice(SRC.indexOf('<div className="facts">'), SRC.indexOf('<div className="toolbar">'));
  for (const spoiler of ['The primes', 'Share that are prime', 'Thinning out', 'Largest gap', 'Twin prime pairs']) {
    const at = facts.indexOf(`>${spoiler}<`);
    ok(at > 0, `facts row "${spoiler}" not found`);
    if (at > 0) {
      const gate = facts.slice(Math.max(0, at - 180), at);
      ok(/!hunt/.test(gate), `facts row "${spoiler}" is NOT gated on !hunt — it would spoil the hunt`);
    }
  }
  ok(!/\{complete \|\| hunt \? 'Primes up to N'/.test(SRC), 'the prime COUNT must not be shown during the hunt');
});

/* ---- report ------------------------------------------------------------- */
console.log(
  `\n  ${checks.toLocaleString()} checks · ${fails === 0 ? '0 failures — ALL PASS' : `${fails} FAILURES`}\n`
);
if (fails) {
  console.log('  first failures:');
  for (const s of failSamples) console.log('   ✗ ' + s);
  process.exit(1);
}
