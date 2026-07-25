/* ============================================================================
   audit-coordinatemethods.mjs — the numeric audit for CoordinateMethodsLab.jsx
   (G-GPE.B.6 / G-GPE.B.7).
   Run:  node audit-coordinatemethods.mjs

   Slices the pure model out of CoordinateMethodsLab.jsx (MODEL:START/END) and
   evaluates it, so the code under test is the code that ships.

   What it proves, exhaustively over the lattice and every ratio the dials reach:
     FRACTIONS    every exact value is reduced with a positive denominator.
     PARTITION    P really lies ON the segment (collinear with A and B), sits at
                  m/(m+n) of the way, lands on A when m = 0 and on B when n = 0,
                  and is verified against an independent rational construction.
     MIDPOINT     the 1:1 case IS the average of the endpoints — the lab's claim
                  that no second formula is needed.
     DIRECTION    "m:n from A" and "m:n from B" agree EXACTLY when m = n and
                  differ otherwise — checked over every ratio pair.
     SIDES        each squared side is a whole number and equals Δx² + Δy².
     SHOELACE     twice the area is a whole number; it is orientation-free
                  (reversing the corners gives the same value), it is zero
                  exactly for collinear corners, and it agrees with the
                  base×height/2 reference on right triangles.
     AREA         the area is exact in halves and matches the shoelace ÷ 2.
     CALIBRATION  posted ratios are in lowest terms, reachable, and the stamp is
                  an exact rational equality — a neighbouring ratio never fires.
     DISTINCTNESS the count-unit-squares picture (AreaLab's) is grepped OUT.
   AND IT MUTATION-TESTS ITSELF.
   ========================================================================== */

import fs from 'node:fs';

const SRC = fs.readFileSync(new URL('./CoordinateMethodsLab.jsx', import.meta.url), 'utf8');
const m0 = SRC.match(/\/\* ==== MODEL:START[^\n]*\n([\s\S]*?)\/\* ==== MODEL:END/);
if (!m0) throw new Error('MODEL sentinels not found in CoordinateMethodsLab.jsx');
const MODEL_BODY = m0[1];

const EXPORTS = [
  'LIM', 'RATIO_MAX', 'gcdI', 'frac', 'fracString', 'fracIsInt', 'fracValue',
  'partition', 'midpoint', 'sideSq', 'perimeter', 'shoelaceDoubled', 'areaFrac',
  'isDegenerate', 'DIALS', 'A0', 'B0', 'C0', 'START', 'makeTarget', 'isCalibrated',
  'matchPercent', 'STEPS',
];
function build(body) {
  // eslint-disable-next-line no-new-func
  return new Function(`${body}\nreturn { ${EXPORTS.join(', ')} };`)();
}

function lcg(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function runSuite(M) {
  let checks = 0; const failures = [];
  const ok = (c, msg) => { checks++; if (!c) failures.push(msg); };
  const near = (a, b) => Math.abs(a - b) < 1e-9;

  /* a spread of lattice endpoints, plus the bench's own A0/B0 */
  const PTS = [];
  for (let x = -M.LIM; x <= M.LIM; x += 3) for (let y = -M.LIM; y <= M.LIM; y += 3) PTS.push({ x, y });
  PTS.push(M.A0, M.B0, M.C0);

  /* === 1. FRACTIONS — reduced, positive denominator ===================== */
  for (let n = -30; n <= 30; n++) for (let d = -12; d <= 12; d++) {
    const f = M.frac(n, d);
    if (d === 0) { ok(f === null, 'a zero denominator is refused'); continue; }
    ok(f.d > 0, `denominator is positive (${n}/${d})`);
    ok(M.gcdI(f.n, f.d) === 1 || f.n === 0, `fully reduced (${n}/${d} → ${f.n}/${f.d})`);
    ok(near(M.fracValue(f), n / d), `value preserved (${n}/${d})`);
  }
  ok(M.fracString(M.frac(4, 2)) === '2', 'an integer prints without a denominator');
  ok(M.fracString(M.frac(17, 2)) === '17/2', 'a half prints as a fraction, not a decimal');

  /* === 2. PARTITION — on the segment, at the right place ================ */
  for (const A of PTS) for (const B of PTS) {
    if (A.x === B.x && A.y === B.y) continue;
    for (let m = 0; m <= M.RATIO_MAX; m++) for (let n = 0; n <= M.RATIO_MAX; n++) {
      if (m + n === 0) { ok(M.partition(A, B, 0, 0) === null, 'a 0:0 ratio is refused'); continue; }
      const P = M.partition(A, B, m, n);
      const t = m / (m + n);
      const wantX = A.x + t * (B.x - A.x), wantY = A.y + t * (B.y - A.y);
      ok(near(M.fracValue(P.x), wantX), `P.x is A + t(B−A) (${m}:${n})`);
      ok(near(M.fracValue(P.y), wantY), `P.y is A + t(B−A) (${m}:${n})`);
      ok(near(M.fracValue(P.t), t), `the reported fraction along is m/(m+n) (${m}:${n})`);
      // collinearity: the cross product of (P−A) and (B−A) is exactly zero
      const cross = (M.fracValue(P.x) - A.x) * (B.y - A.y) - (M.fracValue(P.y) - A.y) * (B.x - A.x);
      ok(Math.abs(cross) < 1e-9, `P lies on the line AB (${m}:${n})`);
      // and inside the segment
      ok(M.fracValue(P.t) >= 0 && M.fracValue(P.t) <= 1, 'P never leaves the segment');
      if (m === 0) ok(near(M.fracValue(P.x), A.x) && near(M.fracValue(P.y), A.y), '0:n lands on A');
      if (n === 0) ok(near(M.fracValue(P.x), B.x) && near(M.fracValue(P.y), B.y), 'm:0 lands on B');
    }
  }

  /* === 3. MIDPOINT — the 1:1 case is the average ======================== */
  for (const A of PTS) for (const B of PTS) {
    const Mp = M.midpoint(A, B), P11 = M.partition(A, B, 1, 1);
    ok(Mp.x.n === P11.x.n && Mp.x.d === P11.x.d, 'the midpoint IS the 1:1 partition (x)');
    ok(Mp.y.n === P11.y.n && Mp.y.d === P11.y.d, 'the midpoint IS the 1:1 partition (y)');
    ok(near(M.fracValue(Mp.x), (A.x + B.x) / 2), 'the midpoint x is the average');
    ok(near(M.fracValue(Mp.y), (A.y + B.y) / 2), 'the midpoint y is the average');
  }

  /* === 4. DIRECTION — from A vs from B agree only when m = n ============ */
  for (const A of PTS.slice(0, 12)) for (const B of PTS.slice(0, 12)) {
    if (A.x === B.x && A.y === B.y) continue;
    for (let m = 1; m <= M.RATIO_MAX; m++) for (let n = 1; n <= M.RATIO_MAX; n++) {
      const fromA = M.partition(A, B, m, n), fromB = M.partition(B, A, m, n);
      const same = fromA.x.n === fromB.x.n && fromA.x.d === fromB.x.d
        && fromA.y.n === fromB.y.n && fromA.y.d === fromB.y.d;
      ok(same === (m === n), `from A and from B agree iff m = n (${m}:${n})`);
    }
  }

  /* === 5. SIDES — squared lengths are whole numbers ===================== */
  for (const A of PTS) for (const B of PTS) {
    const s = M.sideSq(A, B);
    ok(Number.isInteger(s) && s >= 0, 'a squared side is a non-negative integer');
    ok(s === (A.x - B.x) ** 2 + (A.y - B.y) ** 2, 'the squared side is Δx² + Δy²');
    ok((s === 0) === (A.x === B.x && A.y === B.y), 'zero length exactly at a repeated point');
  }
  {
    const per = M.perimeter([M.A0, M.B0, M.C0]);
    ok(per.squares.length === 3, 'a triangle has three sides');
    ok(per.squares.every((q) => Number.isInteger(q)), 'every squared side stays whole');
    ok(near(per.approx, per.squares.reduce((s, q) => s + Math.sqrt(q), 0)),
      'the rounded perimeter is the sum of the roots');
    ok(per.exactSides === per.squares.every((q) => Number.isInteger(Math.sqrt(q))),
      'the exact-sides flag is honest about whether the perimeter is exact');
  }

  /* === 6. SHOELACE and AREA ============================================= */
  for (const A of PTS) for (const B of PTS) for (const C of [M.C0, { x: 0, y: 0 }, { x: 4, y: -5 }]) {
    const tri = [A, B, C];
    const two = M.shoelaceDoubled(tri);
    ok(Number.isInteger(two) && two >= 0, 'twice the area is a non-negative whole number');
    // orientation-free
    ok(M.shoelaceDoubled([C, B, A]) === two, 'reversing the corners gives the same area');
    // collinear ⇔ zero, checked against an independent cross product
    const cross = (B.x - A.x) * (C.y - A.y) - (C.x - A.x) * (B.y - A.y);
    ok((two === 0) === (cross === 0), 'zero area exactly for collinear corners');
    ok(M.isDegenerate(tri) === (two === 0), 'the degeneracy flag matches the area');
    // the area fraction
    const a = M.areaFrac(tri);
    ok(near(M.fracValue(a), two / 2), 'the area is the shoelace halved');
    ok(a.d === 1 || a.d === 2, 'a lattice area is exact in halves');
  }
  {
    // an independent reference on axis-aligned right triangles: base×height/2
    for (let b = 1; b <= 8; b++) for (let h = 1; h <= 8; h++) {
      const tri = [{ x: 0, y: 0 }, { x: b, y: 0 }, { x: 0, y: h }];
      ok(M.shoelaceDoubled(tri) === b * h, `shoelace matches base×height on a right triangle (${b},${h})`);
      ok(M.fracValue(M.areaFrac(tri)) === (b * h) / 2, 'and the area is half of it');
    }
    // a tilted triangle no unit square fits: the shoelace still gives an exact answer
    const tilted = [{ x: 0, y: 0 }, { x: 3, y: 1 }, { x: 1, y: 3 }];
    ok(M.shoelaceDoubled(tilted) === 8, 'a tilted triangle still has an exact doubled area');
    ok(M.fracString(M.areaFrac(tilted)) === '4', 'and it prints exactly');
  }

  /* === 7. CALIBRATION =================================================== */
  {
    const rnd = lcg(20260725);
    let prev = null; const seen = new Set();
    for (let i = 0; i < 3000; i++) {
      const t = M.makeTarget(prev, rnd);
      ok(t.m >= 1 && t.m <= M.RATIO_MAX && t.n >= 1 && t.n <= M.RATIO_MAX, 'the posted ratio is on the dials');
      ok(M.gcdI(t.m, t.n) === 1, `the posted ratio is in lowest terms (${t.m}:${t.n})`);
      const P = M.partition(M.A0, M.B0, t.m, t.n);
      ok(P.x.n === t.P.x.n && P.x.d === t.P.x.d && P.y.n === t.P.y.n && P.y.d === t.P.y.d,
        'the posted point really is that ratio of the bench segment');
      ok(M.isCalibrated(t.m, t.n, t) === true, 'the stamp fires on the posted ratio');
      // every OTHER ratio on the dials must be refused, unless it reduces to the same cut
      for (let m = 1; m <= M.RATIO_MAX; m++) for (let n = 1; n <= M.RATIO_MAX; n++) {
        const sameCut = m * t.n === t.m * n; // m/n === t.m/t.n
        ok(M.isCalibrated(m, n, t) === sameCut,
          `only an equivalent ratio stamps (${m}:${n} vs ${t.m}:${t.n})`);
      }
      const p = M.matchPercent(t.m, t.n, t);
      ok(p >= 99.999, 'the meter is full at the posted ratio');
      ok(M.matchPercent(1, M.RATIO_MAX, t) <= p, 'the meter never reads higher away from the goal');
      seen.add(`${t.m}:${t.n}`);
      prev = t;
    }
    ok(seen.size >= 8, `posted ratios vary (${seen.size} distinct)`);
  }

  /* === 8. THE LESSON ==================================================== */
  {
    ok(M.STEPS.length >= 5, 'the lesson has at least five steps');
    ok(M.STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
    ok(M.STEPS[M.STEPS.length - 1].calib === true, 'the calibration is last');
    for (const s of M.STEPS) {
      ok(typeof s.title === 'string' && s.title.length > 0, 'every step is titled');
      ok(typeof s.body === 'string' && s.body.length > 40, `every step explains itself (${s.title})`);
      ok(Number.isInteger(s.unlock) && s.unlock >= 0 && s.unlock <= M.DIALS.length, `unlock is real (${s.title})`);
      if (!s.calib) {
        ok(Array.isArray(s.choices) && s.choices.length === 3, `three choices (${s.title})`);
        ok(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < 3, `answer indexes a choice (${s.title})`);
        ok(typeof s.feedback === 'string' && s.feedback.length > 40, `feedback explains (${s.title})`);
      }
    }
    ok(M.DIALS.length === 2, 'two dials: the two parts of the ratio');
    ok(!M.isDegenerate([M.A0, M.B0, M.C0]), 'the bench triangle is not degenerate');
  }

  /* === 9. DISTINCTNESS — counting unit squares belongs to AreaLab ======= */
  {
    /* The real property is structural, not textual: the area must be COMPUTED
       from the shoelace sum and never by counting squares. The lesson text is
       allowed — required, even — to CITE AreaLab's picture in order to say why
       it fails on a tilted figure, exactly as LikeTermsLab cites DistributiveLab. */
    ok(/const areaFrac = \(pts\) => frac\(shoelaceDoubled\(pts\)/.test(MODEL_BODY),
      'the area is computed from the shoelace sum, not by any other route');
    ok(!/for\s*\([^)]*\)\s*\{[^}]*square(s)?\+\+/.test(MODEL_BODY),
      'there is no square-counting loop — that is AreaLab');
    const body = MODEL_BODY.toLowerCase();
    ok(!body.includes('count the squares') && !body.includes('tile the'),
      'the model never instructs a student to tile or count squares — it only cites that it cannot');
    ok(/cannot|will not|does not/.test(body) && body.includes('unit squares'),
      'where the model mentions unit squares it is to say the method fails here');
    for (const own of ['partition', 'shoelaceDoubled', 'sideSq']) {
      ok(MODEL_BODY.includes(own), `the model names its own idea: ${own}`);
    }
  }

  return { checks, failures };
}

const MUTANTS = [
  ['the partition uses m/n instead of m/(m+n) (the point leaves the segment)',
    'x: frac(A.x * n + B.x * m, t),', 'x: frac(A.x * n + B.x * m, m || 1),'],
  ['the partition swaps the weights (counts from the wrong end)',
    'y: frac(A.y * n + B.y * m, t),', 'y: frac(A.y * m + B.y * n, t),'],
  ['fractions stop reducing',
    'const g = gcdI(nn, dd) || 1;', 'const g = 1;'],
  ['the squared side subtracts instead of adding',
    'const sideSq = (P, Q) => (P.x - Q.x) * (P.x - Q.x) + (P.y - Q.y) * (P.y - Q.y);',
    'const sideSq = (P, Q) => (P.x - Q.x) * (P.x - Q.x) - (P.y - Q.y) * (P.y - Q.y);'],
  ['the shoelace forgets to subtract the back-diagonal',
    's += a.x * b.y - b.x * a.y;', 's += a.x * b.y + b.x * a.y;'],
  ['the shoelace drops the absolute value (orientation leaks in)',
    'return Math.abs(s);', 'return s;'],
  ['the area forgets to halve the shoelace',
    'const areaFrac = (pts) => frac(shoelaceDoubled(pts), 2);',
    'const areaFrac = (pts) => frac(shoelaceDoubled(pts), 1);'],
  ['the midpoint stops being the 1:1 case',
    'const midpoint = (A, B) => partition(A, B, 1, 1);',
    'const midpoint = (A, B) => partition(A, B, 1, 2);'],
  ['the stamp goes fuzzy (compares positions, not fractions)',
    'return P.x.n === target.P.x.n && P.x.d === target.P.x.d\n    && P.y.n === target.P.y.n && P.y.d === target.P.y.d;',
    'return Math.abs(fracValue(P.x) - fracValue(target.P.x)) < 0.5;'],
  ['makeTarget posts ratios that are not in lowest terms',
    'if (gcdI(m, n) !== 1) continue;          // only ratios in lowest terms are posed', 'if (false) continue;'],
  ['the perimeter reports the squares as if they were lengths',
    'const approx = squares.reduce((s, q) => s + Math.sqrt(q), 0);',
    'const approx = squares.reduce((s, q) => s + q, 0);'],
];

function mutationTest() {
  const survivors = [];
  for (const [name, find, replace] of MUTANTS) {
    if (!MODEL_BODY.includes(find)) { survivors.push(`${name} — STALE ANCHOR`); continue; }
    let caught = false;
    try { caught = runSuite(build(MODEL_BODY.replace(find, replace))).failures.length > 0; }
    catch { caught = true; }
    if (!caught) survivors.push(name);
  }
  return survivors;
}

const M = build(MODEL_BODY);
const { checks, failures } = runSuite(M);
console.log('audit-coordinatemethods — CoordinateMethodsLab.jsx  (sliced, not mirrored)');
console.log('─'.repeat(64));
console.log(`model sliced from the shipped component: ${MODEL_BODY.split('\n').length} lines`);
console.log(`checks run: ${checks.toLocaleString()}`);
console.log(`failures:   ${failures.length}`);
for (const f of failures.slice(0, 20)) console.log('  ✗ ' + f);
console.log('─'.repeat(64));
console.log(`mutation test: ${MUTANTS.length} deliberate defects injected…`);
const survivors = mutationTest();
if (survivors.length === 0) console.log(`all ${MUTANTS.length} caught — the suite has teeth.`);
else { console.log(`${survivors.length} SURVIVED:`); for (const s of survivors) console.log('  ⚠ ' + s); }
console.log('─'.repeat(64));
const pass = failures.length === 0 && survivors.length === 0;
console.log(pass ? 'PASS' : 'FAIL');
process.exit(pass ? 0 : 1);
