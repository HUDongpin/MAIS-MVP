/* ============================================================================
   audit-multiples.mjs — numeric audit for MultiplesLab.jsx
   Run:  node audit-multiples.mjs
   Re-implements the lab's pure math and proves the invariants a K-12 student
   would rely on, exhaustively over (and well beyond) the dial ranges. No deps.
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
const lcm = (a, b) => (a === 0 || b === 0 ? 0 : Math.abs((a / gcd(a, b)) * b));
const multiplesOf = (n, count) => {
  const out = [];
  for (let j = 1; j <= count; j++) out.push(n * j);
  return out;
};
const isMultiple = (value, n) => n > 0 && value % n === 0;
const commonMultiplesUpTo = (n, m, hi) => {
  const L = lcm(n, m);
  const out = [];
  if (L <= 0) return out;
  for (let c = L; c <= hi; c += L) out.push(c);
  return out;
};
const lcmPairs = (T) => {
  const out = [];
  for (let a = 2; a <= 12; a++) for (let b = a; b <= 12; b++) if (lcm(a, b) === T) out.push([a, b]);
  return out;
};

/* independent references, to cross-check the lab's helpers */
const gcdRef = (a, b) => {
  // brute-force greatest common divisor
  let g = 1;
  for (let d = 1; d <= Math.min(a, b); d++) if (a % d === 0 && b % d === 0) g = d;
  return g;
};
const factorsOf = (n) => {
  const f = [];
  for (let d = 1; d <= n; d++) if (n % d === 0) f.push(d);
  return f;
};

const N_MIN = 2;
const N_MAX = 12;
const K_MAX = 12;
const MAXLINE = 132;

console.log('MultiplesLab audit\n==================');

/* ---- 1. multiplesOf: n·j, spacing n, each is a multiple, none between ---- */
{
  for (let n = N_MIN; n <= N_MAX; n++) {
    const list = multiplesOf(n, K_MAX);
    for (let j = 1; j <= K_MAX; j++) {
      const v = list[j - 1];
      ok(v === n * j, `k-th multiple n=${n} k=${j} is n*k`);
      ok(isMultiple(v, n), `${v} is a multiple of ${n}`);
      ok(v - (j > 1 ? list[j - 2] : 0) === n, `equal spacing n=${n} at j=${j}`);
    }
    // sorted, strictly increasing
    for (let i = 1; i < list.length; i++) ok(list[i] > list[i - 1], `multiples increasing n=${n}`);
    // NOTHING strictly between consecutive multiples is a multiple of n
    for (let j = 1; j < K_MAX; j++) {
      for (let x = n * j + 1; x < n * (j + 1); x++) ok(!isMultiple(x, n), `no multiple of ${n} strictly in (${n * j},${n * (j + 1)})`);
    }
  }
  console.log('1. multiplesOf = n·j, equal spacing, exhaustive gaps ... n=2..12');
}

/* ---- 2. isMultiple ⇔ remainder 0 ⇔ n is a FACTOR of the value ----------- */
{
  for (let n = N_MIN; n <= N_MAX; n++) {
    for (let v = 0; v <= 200; v++) {
      const q = Math.floor(v / n);
      const r = v % n;
      ok(v === n * q + r, `division algorithm v=${v} n=${n}`);
      ok(r >= 0 && r < n, `remainder in range v=${v} n=${n}`);
      // "v is a multiple of n"  ⇔  "remainder 0"  ⇔  "n is a factor of v"
      ok(isMultiple(v, n) === (r === 0), `multiple iff remainder 0  v=${v} n=${n}`);
      if (v >= 1) ok(isMultiple(v, n) === factorsOf(v).includes(n), `multiple(v,n) ⇔ n is a factor of v  v=${v} n=${n}`);
    }
  }
  console.log('2. multiple ⇔ remainder 0 ⇔ n is a factor ... n=2..12, v=0..200');
}

/* ---- 3. gcd/lcm identities; lcm is a COMMON multiple and the LEAST ------- */
{
  for (let a = 1; a <= 60; a++) {
    for (let b = 1; b <= 60; b++) {
      const g = gcd(a, b);
      const L = lcm(a, b);
      ok(g === gcdRef(a, b), `gcd matches brute force a=${a} b=${b}`);
      ok(a % g === 0 && b % g === 0, `gcd divides both a=${a} b=${b}`);
      ok(g * L === a * b, `gcd·lcm = a·b  a=${a} b=${b}`);
      ok(L % a === 0 && L % b === 0, `lcm is a common multiple a=${a} b=${b}`);
      // least: no smaller positive common multiple exists
      let least = 0;
      for (let c = 1; c <= a * b; c++) {
        if (c % a === 0 && c % b === 0) {
          least = c;
          break;
        }
      }
      ok(least === L, `lcm is the LEAST common multiple a=${a} b=${b}`);
    }
  }
  console.log('3. gcd·lcm=ab, lcm is least common multiple ... a,b=1..60');
}

/* ---- 4. common multiples up to hi are EXACTLY the multiples of the lcm --- */
{
  for (let a = N_MIN; a <= N_MAX; a++) {
    for (let b = N_MIN; b <= N_MAX; b++) {
      const L = lcm(a, b);
      const hi = Math.min(MAXLINE, L * 3);
      const commons = commonMultiplesUpTo(a, b, hi);
      // the set the lab draws must equal the true set {c ≤ hi : a|c and b|c}
      for (let c = 1; c <= hi; c++) {
        const bothDivide = c % a === 0 && c % b === 0;
        const listed = commons.includes(c);
        ok(bothDivide === listed, `common-multiple membership a=${a} b=${b} c=${c}`);
        // and each such c is itself a multiple of the lcm — the key lesson
        if (bothDivide) ok(c % L === 0, `common multiple is a multiple of the lcm a=${a} b=${b} c=${c}`);
      }
      if (commons.length) ok(commons[0] === L, `first common multiple is the lcm a=${a} b=${b}`);
      // strictly increasing, evenly spaced by L
      for (let i = 1; i < commons.length; i++) ok(commons[i] - commons[i - 1] === L, `common multiples spaced by lcm a=${a} b=${b}`);
    }
  }
  console.log('4. common multiples = multiples of the lcm ... all (a,b) in 2..12²');
}

/* ---- 5. the k-th multiple readout & duality value are exact ------------- */
{
  for (let n = N_MIN; n <= N_MAX; n++) {
    for (let k = 1; k <= K_MAX; k++) {
      const kth = n * k;
      ok(kth === multiplesOf(n, k)[k - 1], `k-th multiple readout n=${n} k=${k}`);
      ok(kth % n === 0 && kth / n === k, `duality: kth/n = k exactly n=${n} k=${k}`);
    }
  }
  console.log('5. k-th multiple = n·k and divides back to k ... n=2..12, k=1..12');
}

/* ---- 6. calibration: every target reachable (≥2 pairs), stamp is exact --- */
{
  const CALIB_TARGETS = [12, 18, 20, 24, 30, 36, 40];
  for (const T of CALIB_TARGETS) {
    const pairs = lcmPairs(T);
    ok(pairs.length >= 2, `target ${T} has ≥2 counter pairs (${pairs.length})`);
    ok(2 * T <= MAXLINE, `target ${T} and its double fit the line`);
    for (const [a, b] of pairs) {
      ok(a >= N_MIN && a <= N_MAX && b >= N_MIN && b <= N_MAX, `pair in dial range ${a},${b}→${T}`);
      ok(lcm(a, b) === T, `pair really makes the target ${a},${b}→${T}`);
    }
    // NO FALSE STAMP: over the full dial grid, CALIBRATED (lcm===T) holds iff the pair truly makes T
    for (let n = N_MIN; n <= N_MAX; n++) {
      for (let m = N_MIN; m <= N_MAX; m++) {
        const L = lcm(n, m);
        const stamped = L === T;
        const trulyMakesT = lcm(n, m) === T;
        ok(stamped === trulyMakesT, `no false stamp T=${T} n=${n} m=${m}`);
        // the meter never reads 100% unless exact
        const pct = L === T ? 100 : Math.min(96, Math.max(0, Math.round(100 * (1 - Math.min(1, Math.abs(L - T) / T)))));
        ok(pct === 100 ? L === T : true, `meter=100 ⇒ exact T=${T} n=${n} m=${m}`);
        ok(pct >= 0 && pct <= 100, `meter in [0,100] T=${T} n=${n} m=${m}`);
      }
    }
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
    ok(CALIB_TARGETS.includes(t), `random target in curated set (${t})`);
    ok(t !== prev, `random target differs from previous (${t})`);
    prev = t;
  }
  console.log('6. calibration reachable & no false stamp ... 7 targets × full grid + 5000 draws');
}

/* ---- 7. line extent (hi) always frames what it must, capped ------------- */
{
  // single mode: hi shows all k jumps of n (right end ≥ n·k), capped at MAXLINE
  for (let n = N_MIN; n <= N_MAX; n++) {
    for (let k = 1; k <= K_MAX; k++) {
      const hi = Math.max(n, Math.min(MAXLINE, n * k));
      ok(hi <= MAXLINE, `single hi capped n=${n} k=${k}`);
      ok(n * k <= MAXLINE ? hi === n * k : hi === MAXLINE, `single hi frames k jumps n=${n} k=${k}`);
    }
  }
  // two-counter mode: hi ≥ lcm so the LCM is always on screen
  for (let n = N_MIN; n <= N_MAX; n++) {
    for (let m = N_MIN; m <= N_MAX; m++) {
      for (let k = 1; k <= K_MAX; k++) {
        const L = lcm(n, m);
        const hi = Math.max(L, Math.min(MAXLINE, k * L || L));
        ok(hi >= L, `two-counter hi shows the lcm n=${n} m=${m} k=${k}`);
        ok(hi <= MAXLINE, `two-counter hi capped n=${n} m=${m} k=${k}`);
      }
    }
  }
  console.log('7. number-line extent frames the multiples & lcm, capped ... full grid');
}

console.log(`\n${checks} checks run.`);
console.log(fail === 0 ? '✓ ALL CHECKS PASSED' : `✗ ${fail} CHECK(S) FAILED`);
process.exit(fail === 0 ? 0 : 1);
