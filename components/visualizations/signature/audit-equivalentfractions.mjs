/* Numeric audit for EquivalentFractionsLab — run: node audit-equivalentfractions.mjs

   Unlike the older audits in this folder, this one does NOT mirror the lab's
   model by hand. It EXTRACTS the real model source out of the .jsx and executes
   it, so the audit can never silently drift from the shipped code. (The sliced
   region is plain JS — no JSX, no React — by construction: everything from the
   parameter block down to the equation readout, plus the STEPS array.)

   What it proves, over every reachable state:
     • the k = gcd theorem: (p, q) === (gcd(p,q) · p0, gcd(p,q) · q0), so the
       k dial genuinely reads the gcd off the picture;
     • the family drawn on a ray is EXACTLY the set of lattice dots equal to the
       base — nothing on the ray is missing, nothing off it is included;
     • the twist theorem: twist === 0 <=> equal <=> collinear with the origin,
       and the wedge's shoelace area is exactly |twist| / 2 grid squares;
     • cross-multiplication agrees with an INDEPENDENT common-denominator
       oracle (lcm) over the whole table — the ordering claim is not checked
       against itself. FractionLab's audit caught a backwards cross-multiply
       inside the AUDIT this way, so the oracle here is deliberately a
       different algorithm;
     • the additive trap really is a trap: (p+n)/(q+n) is never p/q for p != q;
     • the calibration stamp is impossible to fire falsely: pct === 100 <=>
       isCalibrated, swept over every dot x every target.
   All arithmetic is exact integer; no float is ever consulted for a fact. */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, 'EquivalentFractionsLab.jsx'), 'utf8');

function slice(from, to, label) {
  const a = src.indexOf(from);
  const b = src.indexOf(to);
  if (a < 0 || b < 0 || b <= a) {
    console.error(`AUDIT SETUP FAILED: could not slice ${label}. The lab's structure moved —
fix the markers in this audit rather than letting it silently test nothing.`);
    process.exit(2);
  }
  return src.slice(a, b);
}

// the model: parameters -> formatting helpers (stops before the JSX readout)
const modelSrc = slice('const Q_MIN', '/* EDIT 5 — Equation display', 'the model');
// the lesson content: plain data
const stepsSrc = slice('const STEPS = [', '/* ============================================================================\n   COMPONENT', 'the STEPS array');

const M = new Function(
  modelSrc +
    '\n' +
    stepsSrc +
    '\n return { Q_MIN, Q_MAX, P_MIN, P_MAX, START, CALIB_START, DENOM_STEP, NUM_STEP,' +
    ' RAY_STEP, SIMPLE_STEP, TWIST_STEP, CALIB_STEP, gcd, reduce, fracEqual, twist, kMax,' +
    ' familyOf, MATCH_SCALE, matchPercent, isCalibrated, TARGETS, makeTarget, readFraction,' +
    ' decimalString, denomName, STEPS };'
)();

const {
  Q_MIN, Q_MAX, P_MIN, P_MAX, START, CALIB_START,
  DENOM_STEP, NUM_STEP, RAY_STEP, TWIST_STEP, CALIB_STEP,
  gcd, reduce, fracEqual, twist, kMax, familyOf,
  matchPercent, isCalibrated, TARGETS, makeTarget,
  readFraction, decimalString, STEPS,
} = M;

let checks = 0;
let fails = 0;
function ok(cond, msg) {
  checks++;
  if (!cond) {
    fails++;
    if (fails <= 30) console.error('FAIL:', msg);
  }
}

/* every dot on the lattice */
const DOTS = [];
for (let q = Q_MIN; q <= Q_MAX; q++) {
  for (let p = P_MIN; p <= P_MAX; p++) DOTS.push({ p, q });
}

/* --- an INDEPENDENT oracle: compare by common denominator, not by cross-
   multiplying. Different algorithm on purpose, so it can catch a backwards
   cross-multiply in either the lab or this file. Returns -1 / 0 / +1. --- */
function lcm(a, b) {
  return (a / gcd(a, b)) * b;
}
function cmpByCommonDenominator(p1, q1, p2, q2) {
  const L = lcm(q1, q2);
  const n1 = p1 * (L / q1);
  const n2 = p2 * (L / q2);
  return n1 < n2 ? -1 : n1 > n2 ? 1 : 0;
}
// sanity-check the oracle itself against a few hand-computed facts before
// trusting it to judge the lab
ok(cmpByCommonDenominator(1, 2, 1, 3) === 1, 'oracle: 1/2 > 1/3');
ok(cmpByCommonDenominator(1, 3, 1, 2) === -1, 'oracle: 1/3 < 1/2');
ok(cmpByCommonDenominator(2, 4, 1, 2) === 0, 'oracle: 2/4 = 1/2');
ok(cmpByCommonDenominator(3, 4, 5, 7) === 1, 'oracle: 3/4 > 5/7');
ok(cmpByCommonDenominator(1, 12, 1, 11) === -1, 'oracle: 1/12 < 1/11');

/* ========================================================================== */
console.log('A. gcd / reduce');
for (let a = 0; a <= 24; a++) {
  for (let b = 1; b <= 24; b++) {
    const g = gcd(a, b);
    ok(g >= 1, `gcd(${a},${b}) >= 1`);
    ok(a % g === 0 && b % g === 0, `gcd(${a},${b})=${g} divides both`);
    ok(gcd(b, a) === g, `gcd symmetric at (${a},${b})`);
    // greatest: nothing larger divides both
    for (let d = g + 1; d <= Math.max(a, b); d++) {
      if (a !== 0) ok(!(a % d === 0 && b % d === 0), `no common divisor ${d} > gcd(${a},${b})`);
    }
  }
}
ok(gcd(0, 7) === 7, 'gcd(0,7) = 7 — the identity that makes p=0 fall out correctly');
ok(gcd(7, 0) === 7, 'gcd(7,0) = 7');

for (const { p, q } of DOTS) {
  const r = reduce(p, q);
  ok(r.q >= 1, `reduce(${p},${q}) has positive denominator`);
  ok(gcd(r.p, r.q) === 1, `reduce(${p},${q}) = ${r.p}/${r.q} is in lowest terms`);
  ok(fracEqual(p, q, r.p, r.q), `reduce(${p},${q}) preserves the value`);
}
ok(reduce(0, 4).p === 0 && reduce(0, 4).q === 1, 'reduce(0,4) = 0/1');

/* ========================================================================== */
console.log('B. THE k = gcd THEOREM  (the lab\'s killer detail)');
// The k dial is not independent state: k === gcd(p,q), and the dot at (q,p) is
// the g-th name on its ray. If this fails, the dial is lying.
for (const { p, q } of DOTS) {
  const g = gcd(p, q);
  const r = reduce(p, q);
  ok(g * r.p === p, `(${p}/${q}) numerator is gcd x p0: ${g}*${r.p} = ${p}`);
  ok(g * r.q === q, `(${p}/${q}) denominator is gcd x q0: ${g}*${r.q} = ${q}`);
  ok(g >= 1 && g <= kMax(r.p, r.q), `(${p}/${q}) step ${g} is within kMax ${kMax(r.p, r.q)}`);
  // the g-th member of the family IS this dot
  const fam = familyOf(r.p, r.q);
  const mine = fam[g - 1];
  ok(mine && mine.p === p && mine.q === q, `(${p}/${q}) is family member #${g}`);
  ok(mine && mine.k === g, `(${p}/${q}) family member #${g} carries k=${g}`);
  // "already simplest" <=> gcd is 1 <=> it IS the first dot
  ok((g === 1) === (r.p === p && r.q === q), `(${p}/${q}) simplest <=> gcd=1`);
}

/* ========================================================================== */
console.log('C. the family on a ray is EXACTLY the equal dots');
// Nothing drawn gold is off the ray; nothing on the ray is left grey.
for (const base of DOTS) {
  const r = reduce(base.p, base.q);
  const fam = familyOf(r.p, r.q);
  const key = (d) => `${d.p}/${d.q}`;
  const famSet = new Set(fam.map(key));
  for (const d of DOTS) {
    const equalToBase = fracEqual(d.p, d.q, r.p, r.q);
    ok(
      equalToBase === famSet.has(key(d)),
      `dot ${key(d)} on ray of ${r.p}/${r.q}: equal=${equalToBase} but inFamily=${famSet.has(key(d))}`
    );
  }
  // every family member really is the same number, and really fits
  for (const n of fam) {
    ok(fracEqual(n.p, n.q, base.p, base.q), `family member ${key(n)} equals ${key(base)}`);
    ok(n.p <= P_MAX && n.q <= Q_MAX && n.q >= Q_MIN, `family member ${key(n)} fits the lattice`);
    ok(gcd(n.p, n.q) === n.k, `family member ${key(n)} stands on step ${n.k} = its gcd`);
    const rn = reduce(n.p, n.q);
    ok(rn.p === r.p && rn.q === r.q, `family member ${key(n)} reduces back to ${r.p}/${r.q}`);
  }
  ok(fam.length === kMax(r.p, r.q), `family size of ${r.p}/${r.q} is kMax`);
  ok(fam.length >= 1, `every number has at least one name on the grid`);
  // the next name off the end genuinely does NOT fit — kMax is exact, not shy
  const K = fam.length;
  const nextP = (K + 1) * r.p;
  const nextQ = (K + 1) * r.q;
  ok(nextP > P_MAX || nextQ > Q_MAX, `name #${K + 1} of ${r.p}/${r.q} is genuinely off-grid`);
}

/* ========================================================================== */
console.log('D. the TWIST theorem  (cross-multiplication = the wedge)');
for (const A of DOTS) {
  for (const B of DOTS) {
    const t = twist(A.p, A.q, B.p, B.q);
    const eq = fracEqual(A.p, A.q, B.p, B.q);

    // 1. zero twist <=> same number
    ok((t === 0) === eq, `twist(${A.p}/${A.q}, ${B.p}/${B.q}) = ${t} but equal=${eq}`);

    // 2. antisymmetry — swapping the dots flips the sign, not the magnitude
    ok(twist(B.p, B.q, A.p, A.q) === -t, `twist antisymmetric at ${A.p}/${A.q} vs ${B.p}/${B.q}`);

    // 3. the wedge's area really is |twist| / 2 grid squares.
    //    Shoelace for the triangle (0,0), (q1,p1), (q2,p2) in (across, up)
    //    coordinates — a genuinely different expression from the twist.
    const shoelace = Math.abs(A.q * B.p - B.q * A.p) / 2;
    ok(shoelace === Math.abs(t) / 2, `wedge area at ${A.p}/${A.q} vs ${B.p}/${B.q}`);

    // 4. zero twist <=> the wedge has collapsed
    ok((shoelace === 0) === eq, `wedge shut <=> same number at ${A.p}/${A.q} vs ${B.p}/${B.q}`);

    // 5. the SIGN orders them — judged by the INDEPENDENT oracle
    const oracle = cmpByCommonDenominator(A.p, A.q, B.p, B.q);
    ok(Math.sign(t) === oracle, `twist sign vs common-denominator oracle at ${A.p}/${A.q} vs ${B.p}/${B.q}`);
    ok((t > 0) === (oracle === 1), `twist > 0 <=> first is bigger, at ${A.p}/${A.q} vs ${B.p}/${B.q}`);
  }
}

/* ========================================================================== */
console.log('E. equivalence is by MULTIPLYING — the additive trap really traps');
for (const { p, q } of DOTS) {
  for (let n = 1; n <= 6; n++) {
    // multiplying both by n: always the same number (when it fits or not —
    // the arithmetic claim is independent of the grid)
    ok(fracEqual(n * p, n * q, p, q), `${p}/${q} = ${n * p}/${n * q} (multiply both by ${n})`);
    // adding n to both: NEVER the same number, unless p === q (where the
    // fraction is 1 and adding is harmless) — this is the step-3 trap
    if (p !== q) {
      ok(!fracEqual(p + n, q + n, p, q), `${p}/${q} != ${p + n}/${q + n} (the ADD trap)`);
    } else {
      ok(fracEqual(p + n, q + n, p, q), `${p}/${q} = ${p + n}/${q + n} only because p = q = 1`);
    }
  }
}
// and the direction of the additive error is itself lawful: adding to both
// moves a proper fraction UP toward 1 and an improper one DOWN toward 1
for (const { p, q } of DOTS) {
  if (p === q || p === 0) continue;
  const t = twist(p + 1, q + 1, p, q);
  if (p < q) ok(t > 0, `${p}/${q} < 1: adding 1 to both makes it BIGGER`);
  else ok(t < 0, `${p}/${q} > 1: adding 1 to both makes it SMALLER`);
}

/* ========================================================================== */
console.log('F. calibration — the stamp cannot fire falsely');
ok(TARGETS.length > 0, 'there is at least one target');
for (const t of TARGETS) {
  ok(gcd(t.p, t.q) === 1, `target ${t.p}/${t.q} is reduced`);
  ok(t.q >= 2, `target ${t.p}/${t.q} has denominator >= 2`);
  ok(t.p >= 1, `target ${t.p}/${t.q} is positive`);
  ok(t.p % t.q !== 0, `target ${t.p}/${t.q} is not a whole number`);
  ok(2 * t.p <= P_MAX && 2 * t.q <= Q_MAX, `target ${t.p}/${t.q} has >= 2 names on the grid`);
  const fam = familyOf(t.p, t.q);
  ok(fam.length >= 2, `target ${t.p}/${t.q} really has ${fam.length} >= 2 reachable names`);

  // THE START-STATE GUARANTEE: 1/1 is provably never a name for any target,
  // so the challenge never opens pre-solved.
  ok(!isCalibrated(CALIB_START.p, CALIB_START.q, t.p, t.q), `1/1 never calibrates ${t.p}/${t.q}`);
  ok(matchPercent(CALIB_START.p, CALIB_START.q, t.p, t.q) < 100, `1/1 meter < 100 for ${t.p}/${t.q}`);

  // every name on the ray calibrates — "any name counts" is literally true
  for (const n of fam) {
    ok(isCalibrated(n.p, n.q, t.p, t.q), `name ${n.p}/${n.q} calibrates target ${t.p}/${t.q}`);
    ok(matchPercent(n.p, n.q, t.p, t.q) === 100, `name ${n.p}/${n.q} reads 100% for ${t.p}/${t.q}`);
  }

  // THE NO-FALSE-STAMP PROOF: over every dot, meter 100 <=> calibrated
  for (const d of DOTS) {
    const pctv = matchPercent(d.p, d.q, t.p, t.q);
    const cal = isCalibrated(d.p, d.q, t.p, t.q);
    ok(pctv >= 0 && pctv <= 100, `meter in range at ${d.p}/${d.q} vs ${t.p}/${t.q}`);
    ok((pctv === 100) === cal, `meter 100 <=> calibrated at ${d.p}/${d.q} vs ${t.p}/${t.q}`);
    // the meter is exactly the value gap, read on the q = 1 line
    ok(
      Math.abs(Math.abs(d.p / d.q - t.p / t.q) - Math.abs(d.p * t.q - t.p * d.q) / (d.q * t.q)) < 1e-12,
      `meter's integer form equals the true value gap at ${d.p}/${d.q} vs ${t.p}/${t.q}`
    );
    // calibrated <=> zero twist against the target: the meter and the wedge
    // agree about what "same number" means
    ok(cal === (twist(d.p, d.q, t.p, t.q) === 0), `calibration agrees with the wedge at ${d.p}/${d.q}`);
  }
}
// the meter is monotone: a bigger value gap never reads higher
for (const t of TARGETS) {
  const scored = DOTS.map((d) => ({
    gap: Math.abs(d.p * t.q - t.p * d.q) / (d.q * t.q),
    pct: matchPercent(d.p, d.q, t.p, t.q),
  })).sort((a, b) => a.gap - b.gap);
  for (let i = 1; i < scored.length; i++) {
    ok(scored[i].pct <= scored[i - 1].pct + 1e-9, `meter monotone in the value gap for ${t.p}/${t.q}`);
  }
}
// makeTarget: legal, and never hands back the one you just had
{
  const legal = new Set(TARGETS.map((t) => `${t.p}/${t.q}`));
  let prev = null;
  const seen = new Set();
  for (let i = 0; i < 3000; i++) {
    const t = makeTarget(prev);
    ok(legal.has(`${t.p}/${t.q}`), `makeTarget draw ${i} is legal`);
    if (prev) ok(!(t.p === prev.p && t.q === prev.q), `makeTarget draw ${i} differs from the last`);
    seen.add(`${t.p}/${t.q}`);
    prev = t;
  }
  ok(seen.size === TARGETS.length, `makeTarget can reach all ${TARGETS.length} targets (saw ${seen.size})`);
}
// once calibrated, walking the k dial never breaks the match
for (const t of TARGETS) {
  for (const n of familyOf(t.p, t.q)) {
    const r = reduce(n.p, n.q);
    for (const m of familyOf(r.p, r.q)) {
      ok(isCalibrated(m.p, m.q, t.p, t.q), `walking k from ${n.p}/${n.q} to ${m.p}/${m.q} stays calibrated`);
    }
  }
}

/* ========================================================================== */
console.log('G. display forms — exact, never a float artefact');
for (const { p, q } of DOTS) {
  const s = decimalString(p, q);
  if (s.startsWith('≈')) {
    // a repeating decimal must genuinely not terminate: q's reduced denominator
    // must have a prime factor other than 2 or 5
    let d = reduce(p, q).q;
    while (d % 2 === 0) d /= 2;
    while (d % 5 === 0) d /= 5;
    ok(d > 1, `${p}/${q} shown as approximate, so it must really repeat`);
  } else {
    // a terminating decimal must be EXACTLY the value
    const [w, frac = ''] = s.split('.');
    const num = BigInt(w) * 10n ** BigInt(frac.length) + BigInt(frac === '' ? 0 : frac);
    const den = 10n ** BigInt(frac.length);
    ok(num * BigInt(q) === BigInt(p) * den, `decimalString(${p},${q}) = ${s} is exact`);
    let d = reduce(p, q).q;
    while (d % 2 === 0) d /= 2;
    while (d % 5 === 0) d /= 5;
    ok(d === 1, `${p}/${q} shown exactly, so it must really terminate`);
  }
  // equal fractions must read as the same number, whatever their names
  const r = reduce(p, q);
  ok(decimalString(p, q) === decimalString(r.p, r.q), `${p}/${q} and ${r.p}/${r.q} print the same value`);
}
ok(decimalString(0, 4) === '0', 'decimalString(0,4) = 0');
ok(decimalString(1, 2) === '0.5', 'decimalString(1,2) = 0.5');
ok(decimalString(2, 4) === '0.5', 'decimalString(2,4) = 0.5 — same number, other name');
ok(decimalString(4, 2) === '2', 'decimalString(4,2) = 2');
ok(decimalString(1, 3).startsWith('≈'), 'decimalString(1,3) is approximate');
ok(readFraction(1, 2) === 'one half', 'readFraction(1,2)');
ok(readFraction(2, 4) === 'two fourths', 'readFraction(2,4)');
ok(readFraction(3, 4) === 'three fourths', 'readFraction(3,4)');
ok(readFraction(5, 4) === 'one and one fourth', 'readFraction(5,4)');
ok(readFraction(0, 5) === 'zero', 'readFraction(0,5)');
ok(readFraction(4, 4) === 'one', 'readFraction(4,4)');
ok(readFraction(6, 3) === 'two', 'readFraction(6,3)');

/* ========================================================================== */
console.log('H. the lesson — every claim the tutor makes is true');
ok(STEPS.length === 7, 'seven steps');
ok(STEPS[STEPS.length - 1].calib === true, 'the last step is the calibration');
STEPS.forEach((s, i) => {
  ok(!!s.title && !!s.body, `step ${i} has a title and body`);
  if (s.calib) {
    ok(!s.q, `the calibration step poses no MC question`);
  } else {
    ok(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has 3 choices`);
    ok(s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer index is in range`);
    ok(!!s.feedback, `step ${i} has feedback`);
  }
});
// the dials unlock one per step, in the lattice's own order: across, up, along
ok(DENOM_STEP === 1 && NUM_STEP === 2 && RAY_STEP === 3, 'dials unlock q -> p -> k, one per step');
ok(TWIST_STEP === 5 && CALIB_STEP === 6, 'twist then calibration');
ok(CALIB_STEP === STEPS.length - 1, 'the calibration step index matches the lesson');

// START is deliberately NOT in simplest form, so the ray reveal lands on step 2
ok(gcd(START.p, START.q) === 2, `START ${START.p}/${START.q} stands on step 2, not simplest`);
ok(reduce(START.p, START.q).p === 1 && reduce(START.p, START.q).q === 2, 'START simplifies to 1/2');

// step 0: the dot 3 across, 1 up is 1/3
ok(STEPS[0].answer === 0 && STEPS[0].choices[0].startsWith('1/3'), 'step 0 key: 1/3');
// step 1: 2/8 < 2/4
ok(cmpByCommonDenominator(2, 8, 2, 4) === -1, 'step 1 claim: 2/8 < 2/4');
ok(STEPS[1].answer === 0 && STEPS[1].choices[0].startsWith('It got smaller'), 'step 1 key');
// step 2: 2/4 and 1/2 are the same number on different dots
ok(fracEqual(2, 4, 1, 2), 'step 2 claim: 2/4 = 1/2');
ok(!(2 === 1 && 4 === 2), 'step 2 claim: 2/4 and 1/2 are different DOTS');
ok(STEPS[2].answer === 0, 'step 2 key: same number');
// step 3: the additive trap — 2/3 is NOT 1/2, but 2/4 and 3/6 are
ok(!fracEqual(2, 3, 1, 2), 'step 3 claim: 2/3 != 1/2 (the add trap)');
ok(fracEqual(2, 4, 1, 2), 'step 3 claim: 2/4 = 1/2');
ok(fracEqual(3, 6, 1, 2), 'step 3 claim: 3/6 = 1/2');
ok(twist(2, 3, 1, 2) !== 0, 'step 3 claim: 2/3 sits OFF the ray of 1/2');
ok(STEPS[3].answer === 0 && STEPS[3].choices[0].startsWith('2/3'), 'step 3 key: 2/3 is the odd one out');
// step 4: 9/12 is step 3 of its ray, simplest form 3/4
ok(gcd(9, 12) === 3, 'step 4 claim: gcd(9,12) = 3');
ok(reduce(9, 12).p === 3 && reduce(9, 12).q === 4, 'step 4 claim: 9/12 simplifies to 3/4');
ok(familyOf(3, 4)[2].p === 9 && familyOf(3, 4)[2].q === 12, 'step 4 claim: 9/12 is the 3rd dot');
ok(STEPS[4].answer === 0 && STEPS[4].choices[0].startsWith('Step 3'), 'step 4 key: step 3, 3/4');
// step 5: twist(3/4, 5/7) = 1, positive, so 3/4 is bigger
ok(twist(3, 4, 5, 7) === 1, 'step 5 claim: 3*7 - 5*4 = 1');
ok(!fracEqual(3, 4, 5, 7), 'step 5 claim: 3/4 != 5/7');
ok(cmpByCommonDenominator(3, 4, 5, 7) === 1, 'step 5 claim: 3/4 > 5/7 (independent oracle)');
ok(Math.abs(4 * 5 - 7 * 3) / 2 === 0.5, 'step 5 claim: the wedge covers half a grid square');
ok(STEPS[5].answer === 0 && STEPS[5].choices[0].startsWith('Not equal'), 'step 5 key');
// both fractions in the step-5 question are actually reachable on the grid
ok(3 <= P_MAX && 4 <= Q_MAX && 5 <= P_MAX && 7 <= Q_MAX, 'step 5: 3/4 and 5/7 are both buildable');

/* ========================================================================== */
console.log('I. the p = 0 degenerate ray is genuinely consistent');
// 0/q are all names of zero, lying along the horizontal ray; gcd(0,q) = q makes
// the k = gcd theorem hold there too rather than needing a special case.
for (let q = Q_MIN; q <= Q_MAX; q++) {
  ok(gcd(0, q) === q, `gcd(0,${q}) = ${q}`);
  ok(reduce(0, q).p === 0 && reduce(0, q).q === 1, `0/${q} simplifies to 0/1`);
  ok(fracEqual(0, q, 0, 1), `0/${q} = 0/1`);
  ok(familyOf(0, 1)[q - 1].q === q, `0/${q} is the ${q}-th name of zero`);
  ok(twist(0, q, 0, 1) === 0, `0/${q} sits on zero's ray`);
}
ok(kMax(0, 1) === Q_MAX, 'zero has Q_MAX names on the grid');

/* ========================================================================== */
if (fails) {
  console.error(`\n${fails} FAILURE(S) out of ${checks} checks.`);
  process.exit(1);
} else {
  console.log(`\nAll ${checks.toLocaleString()} checks pass.`);
}
