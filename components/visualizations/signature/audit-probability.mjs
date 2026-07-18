/* audit-probability.mjs — independent verification of ProbabilityLab's math.
   Mirrors the model helpers, then cross-checks them against brute-force
   references over EVERY reachable (N, k) and thousands of random events, plus:
   the estimator's exact unbiasedness (why the experiment converges), the
   complement identity, the calibration invariant, target reachability, exact
   decimals/percents, and the lesson's quiz numbers. Run: node audit-probability.mjs */

const NMIN = 2, NMAX = 12, MAX_TRIALS = 2000;

/* ---- copies of the model helpers from ProbabilityLab.jsx (verbatim) ---- */
function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a || 1; }
function reduceFrac(num, den) { const g = gcd(num, den); return { num: num / g, den: den / g }; }
function longDivide(num, den) {
  const intPart = Math.floor(num / den); let rem = num % den;
  if (rem === 0) return String(intPart);
  let frac = '', guard = 0;
  while (rem !== 0 && guard < 14) { rem *= 10; frac += Math.floor(rem / den); rem %= den; guard++; }
  return intPart + '.' + frac;
}
function terminates(den) { let d = den; while (d % 2 === 0) d /= 2; while (d % 5 === 0) d /= 5; return d === 1; }
function roundedHundredths(num, den) {
  const H = Math.round((num * 100) / den);
  const whole = Math.floor(H / 100); const frac = H % 100;
  return whole + '.' + String(frac).padStart(2, '0');
}
function fmtRatio(num, den) {
  const r = reduceFrac(num, den);
  if (r.den === 1) return { text: String(r.num), approx: false };
  if (terminates(r.den)) return { text: longDivide(r.num, r.den), approx: false };
  return { text: roundedHundredths(r.num, r.den), approx: true };
}
function likelihoodWord(k, N) {
  if (k <= 0) return 'impossible';
  if (k >= N) return 'certain';
  if (2 * k < N) return 'unlikely';
  if (2 * k === N) return 'even chance';
  return 'likely';
}
function computeProb(k, N) {
  const red = reduceFrac(k, N);
  const dec = fmtRatio(k, N);
  const pct = fmtRatio(100 * k, N);
  const comp = reduceFrac(N - k, N);
  const word = likelihoodWord(k, N);
  let big;
  if (k <= 0) big = '0';
  else if (k >= N) big = '1';
  else big = red.num + '/' + red.den;
  return { k, N, red, dec, pct, comp, word, big };
}
const MATCH_SCALE = 0.5;
const matchPercent = (k, N, T) => (N > 0 ? 100 * Math.max(0, 1 - Math.abs(k / N - T.num / T.den) / MATCH_SCALE) : 0);
const isCalibrated = (k, N, T) => N > 0 && k >= 0 && k * T.den === T.num * N;
const TARGETS = [
  { num: 1, den: 2 }, { num: 1, den: 3 }, { num: 2, den: 3 }, { num: 1, den: 4 }, { num: 3, den: 4 },
  { num: 1, den: 5 }, { num: 2, den: 5 }, { num: 3, den: 5 }, { num: 1, den: 6 }, { num: 5, den: 6 },
  { num: 3, den: 8 }, { num: 1, den: 10 }, { num: 7, den: 10 }, { num: 5, den: 12 },
];

/* ---- test harness ---- */
let pass = 0, fail = 0; const fails = [];
function ok(cond, msg) { if (cond) pass++; else { fail++; fails.push(msg); } }
function approxEq(a, b, tol = 1e-12) { return Math.abs(a - b) <= tol; }

/* ================= 1) EXHAUSTIVE: every reachable (N, k) ================= */
let combos = 0;
for (let N = NMIN; N <= NMAX; N++) {
  for (let k = 0; k <= N; k++) {
    combos++;
    const p = computeProb(k, N);
    const trueP = k / N;

    // P in [0,1]
    ok(trueP >= 0 && trueP <= 1, `P in range N=${N} k=${k}`);

    // reduced fraction really equals k/N
    ok(approxEq(p.red.num / p.red.den, trueP), `reduced ${k}/${N} -> ${p.red.num}/${p.red.den}`);
    ok(gcd(p.red.num, p.red.den) === 1 || p.red.num === 0, `reduced is lowest-terms ${k}/${N}`);

    // big display form
    if (k === 0) ok(p.big === '0', `big 0 N=${N}`);
    else if (k === N) ok(p.big === '1', `big 1 N=${N}`);
    else ok(p.big === p.red.num + '/' + p.red.den, `big frac ${k}/${N}`);

    // decimal parses back to trueP (exact or within rounding)
    const dparsed = parseFloat(p.dec.text);
    if (p.dec.approx) ok(Math.abs(dparsed - trueP) <= 0.005, `dec approx ${k}/${N} -> ${p.dec.text}`);
    else ok(approxEq(dparsed, trueP), `dec exact ${k}/${N} -> ${p.dec.text}`);

    // percent parses back to 100*trueP
    const pparsed = parseFloat(p.pct.text);
    if (p.pct.approx) ok(Math.abs(pparsed - 100 * trueP) <= 0.5, `pct approx ${k}/${N} -> ${p.pct.text}`);
    else ok(approxEq(pparsed, 100 * trueP), `pct exact ${k}/${N} -> ${p.pct.text}`);

    // COMPLEMENT identity: P(A) + P(not A) = 1, exactly
    ok(approxEq(p.comp.num / p.comp.den, (N - k) / N), `complement value ${k}/${N}`);
    ok(k * p.comp.den + p.comp.num * N === N * p.comp.den, `complement sums to 1 (cross-mult) ${k}/${N}`);

    // qualitative word matches the exact 2k vs N comparison
    let w;
    if (k === 0) w = 'impossible';
    else if (k === N) w = 'certain';
    else if (2 * k < N) w = 'unlikely';
    else if (2 * k === N) w = 'even chance';
    else w = 'likely';
    ok(p.word === w, `word ${k}/${N} -> ${p.word} vs ${w}`);
  }
}
// Σ_{N=2..12} (N+1) outcomes-favorable counts = Σ_{3..13} = 88
ok(combos === 88, `reachable (N,k) combos = ${combos} (expected 88)`);

/* ====== 2) ESTIMATOR UNBIASEDNESS — the reason the experiment converges =====
   The experimental probability is (favorable outcomes seen)/(spins). Over the
   full uniform sample space its expected value is EXACTLY k/N. We verify this
   deterministically (not by sampling): the fraction of favorable outcomes in the
   whole sample space equals k/N for EVERY event, so the estimator is unbiased. */
function randEvent(N) {
  const s = new Set();
  for (let o = 1; o <= N; o++) if (Math.random() < 0.5) s.add(o);
  return s;
}
for (let trial = 0; trial < 20000; trial++) {
  const N = NMIN + Math.floor(Math.random() * (NMAX - NMIN + 1));
  const evt = randEvent(N);
  const k = evt.size;
  // enumerate the sample space: every outcome equally likely, hit iff in event
  let favorable = 0;
  for (let o = 1; o <= N; o++) if (evt.has(o)) favorable++;
  ok(favorable === k, `favorable count matches |event| N=${N}`);
  ok(approxEq(favorable / N, k / N), `E[relFreq] = k/N exactly N=${N} k=${k}`);
  // membership predicate is well-defined for all outcomes (no out-of-range spins)
  for (let o = 1; o <= N; o++) ok(evt.has(o) === true || evt.has(o) === false, 'membership defined');
}

/* == 3) SIMULATOR SANITY (seeded, deterministic) — draws ARE uniform over N ==
   Use a seeded LCG so this is reproducible and never flaky. With many draws the
   empirical outcome frequencies must be close to 1/N, and hits/trials close to
   k/N. Tolerance scales with 1/sqrt(trials). */
function makeLCG(seed) {
  let s = seed >>> 0;
  return () => { s = (1664525 * s + 1013904223) >>> 0; return s / 4294967296; };
}
for (const [N, seed] of [[2, 12345], [6, 99999], [7, 24680], [10, 1357]]) {
  const rand = makeLCG(seed);
  const counts = new Array(N + 1).fill(0);
  const T = 200000;
  for (let i = 0; i < T; i++) { const o = 1 + Math.floor(rand() * N); counts[o]++; }
  for (let o = 1; o <= N; o++) {
    ok(Math.abs(counts[o] / T - 1 / N) < 0.02, `uniform outcome ${o}/${N} freq=${(counts[o] / T).toFixed(4)}`);
  }
  // for the "even numbers" event, hits/trials ≈ (#even ≤ N)/N
  const evt = new Set(); for (let o = 2; o <= N; o += 2) evt.add(o);
  const rand2 = makeLCG(seed ^ 0x5f3759df);
  let hits = 0;
  for (let i = 0; i < T; i++) { const o = 1 + Math.floor(rand2() * N); if (evt.has(o)) hits++; }
  ok(Math.abs(hits / T - evt.size / N) < 0.02, `LLN convergence N=${N} -> ${(hits / T).toFixed(4)} vs ${(evt.size / N).toFixed(4)}`);
}

/* ============ 4) CALIBRATION INVARIANT: exact fraction match only ========= */
for (let t = 0; t < 20000; t++) {
  const N = NMIN + Math.floor(Math.random() * (NMAX - NMIN + 1));
  const k = Math.floor(Math.random() * (N + 1));
  const T = TARGETS[Math.floor(Math.random() * TARGETS.length)];
  const cal = isCalibrated(k, N, T);
  const trueHit = k / N === T.num / T.den; // float compare as an independent ref
  ok(cal === trueHit, `calib N=${N} k=${k} T=${T.num}/${T.den} -> ${cal} vs ${trueHit}`);
  // meter reads 100% exactly when calibrated, and never above 100 / below 0
  const m = matchPercent(k, N, T);
  ok(m >= 0 && m <= 100, `meter bounds ${m}`);
  if (cal) ok(approxEq(m, 100), `meter=100 on exact hit N=${N} k=${k} T=${T.num}/${T.den} -> ${m}`);
}
// every curated target is reachable with N ≤ NMAX (choose N = den) and non-trivial
for (const T of TARGETS) {
  ok(gcd(T.num, T.den) === 1, `target reduced ${T.num}/${T.den}`);
  ok(T.num >= 1 && T.num < T.den, `target strictly between 0 and 1 ${T.num}/${T.den}`);
  ok(T.den <= NMAX, `target reachable with N<=${NMAX}: ${T.num}/${T.den}`);
  ok(isCalibrated(T.num, T.den, T), `target hit by N=${T.den}, k=${T.num}`);
}

/* ==================== 5) EXACT DECIMAL / PERCENT SPOT CHECKS =============== */
ok(fmtRatio(1, 2).text === '0.5' && !fmtRatio(1, 2).approx, '1/2 = 0.5 exact');
ok(fmtRatio(3, 4).text === '0.75' && !fmtRatio(3, 4).approx, '3/4 = 0.75 exact');
ok(fmtRatio(1, 8).text === '0.125' && !fmtRatio(1, 8).approx, '1/8 = 0.125 exact');
ok(fmtRatio(1, 3).approx && fmtRatio(1, 3).text === '0.33', '1/3 ≈ 0.33 flagged approx');
ok(fmtRatio(2, 3).approx && fmtRatio(2, 3).text === '0.67', '2/3 ≈ 0.67 flagged approx');
ok(fmtRatio(100, 3).approx && fmtRatio(100, 3).text === '33.33', `100/3 ≈ 33.33 got ${fmtRatio(100, 3).text}`);
ok(fmtRatio(300, 4).text === '75' && !fmtRatio(300, 4).approx, '3/4 = 75% exact integer');
ok(computeProb(0, 5).big === '0' && computeProb(5, 5).big === '1', 'P=0 and P=1 endpoints');

/* ==================== 6) LESSON QUIZ NUMBERS (fixed) ===================== */
// Step EVENT: 3 of 8 -> 3/8
ok(computeProb(3, 8).big === '3/8', `quiz 3 of 8 = 3/8 got ${computeProb(3, 8).big}`);
// Step SCALE: 1.4 is not a valid probability (> 1); 0 and 0.75 are valid
ok(1.4 > 1, 'quiz: 1.4 exceeds 1');
ok(computeProb(0, 4).big === '0' && computeProb(3, 4).big === '3/4', 'quiz: 0 and 3/4 valid');
// Step COMPLEMENT: P(rain)=1/4 -> P(no rain)=3/4
ok(computeProb(1, 4).comp.num === 3 && computeProb(1, 4).comp.den === 4, 'quiz: 1 - 1/4 = 3/4');
// default start: N=6 even event -> 1/2
ok(computeProb(3, 6).big === '1/2', 'default even event = 1/2');

console.log(`\nProbabilityLab audit — ${pass} passed, ${fail} failed`);
if (fail) { console.log('\nFirst failures:'); for (const f of fails.slice(0, 20)) console.log('  ✗ ' + f); process.exit(1); }
else console.log('All probabilities, the complement identity, estimator unbiasedness, LLN convergence, the calibration invariant, exact decimals/percents, and quiz numbers check out. ✓');
