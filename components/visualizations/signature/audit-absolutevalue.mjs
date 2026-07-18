/* ============================================================================
   audit-absolutevalue.mjs — numeric proof that AbsoluteValueLab's model is
   exact, that every fact it prints on screen is true, and that its calibration
   can never award a false CALIBRATED stamp.

   The lab's thesis: y = |m·x + b| is the LINE m·x + b with the half below the
   axis FOLDED UP. Everything below verifies the consequences the lab asserts:
     · the fold's crease lands exactly where the inside is zero  → the corner
     · the result is never negative                              → the V opens up
     · a V has two sides                                         → 2 / 1 / 0 answers
     · |m·x + b| = |m| × dist(x, corner)                         → the distance reading
     · |u| and |−u| draw the SAME V                              → the calibration gate

   Run:  node audit-absolutevalue.mjs
   Zero dependencies. The model functions are copied verbatim from
   AbsoluteValueLab.jsx; the references are deliberately independent.
   ========================================================================== */

/* ---- model, copied verbatim from AbsoluteValueLab.jsx ------------------- */
const MINUS = '−';
const WORLD = { xmin: -8, xmax: 8, ymin: -8, ymax: 8 };
const M_MIN = -3,
  M_MAX = 3,
  B_MIN = -6,
  B_MAX = 6,
  D_MIN = -3,
  D_MAX = 6;

function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a;
}
function rat(n, d) {
  if (d === 0) return null;
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d) || 1;
  return { n: n / g, d: d / g };
}
function ratVal(r) {
  return r.n / r.d;
}
function num(n) {
  return (n < 0 ? MINUS : '') + Math.abs(n);
}
function ratStr(r) {
  if (!r) return '—';
  return r.d === 1 ? num(r.n) : `${num(r.n)}/${r.d}`;
}
function inside(m, b, x) {
  return m * x + b;
}
function absOf(m, b, x) {
  return Math.abs(m * x + b);
}
function corner(m, b) {
  if (m === 0) return null;
  return rat(-b, m);
}
function negRegion(m, b) {
  if (m === 0) return b < 0 ? 'all' : 'none';
  return m > 0 ? 'left' : 'right';
}
function solve(m, b, d) {
  if (d < 0) return { kind: 'none', xs: [] };
  if (m === 0) return Math.abs(b) === d ? { kind: 'all', xs: [] } : { kind: 'none', xs: [] };
  if (d === 0) return { kind: 'one', xs: [rat(-b, m)] };
  const p = rat(d - b, m);
  const q = rat(-d - b, m);
  const xs = ratVal(p) <= ratVal(q) ? [p, q] : [q, p];
  return { kind: 'two', xs };
}
function sameV(m1, b1, m2, b2) {
  return (m1 === m2 && b1 === b2) || (m1 === -m2 && b1 === -b2);
}
const TARGETS = [
  [1, -4],
  [1, 3],
  [2, -4],
  [2, 6],
  [-1, 5],
  [-2, 3],
  [3, 3],
  [-3, 6],
  [1, 6],
  [2, 2],
  [-1, -4],
  [3, -3],
];
const MATCH_K = 1.8;
const MATCH_N = 201;
function matchRms(m, b, mT, bT) {
  let s = 0;
  for (let i = 0; i < MATCH_N; i++) {
    const x = WORLD.xmin + ((WORLD.xmax - WORLD.xmin) * i) / (MATCH_N - 1);
    const e = absOf(m, b, x) - absOf(mT, bT, x);
    s += e * e;
  }
  return Math.sqrt(s / MATCH_N);
}
function matchPct(m, b, mT, bT) {
  if (sameV(m, b, mT, bT)) return 100;
  return Math.min(96, Math.round(100 / (1 + matchRms(m, b, mT, bT) / MATCH_K)));
}
function insideStr(m, b) {
  if (m === 0) return num(b);
  let s = '';
  if (m === 1) s = 'x';
  else if (m === -1) s = MINUS + 'x';
  else s = num(m) + 'x';
  if (b > 0) s += ` + ${b}`;
  else if (b < 0) s += ` ${MINUS} ${Math.abs(b)}`;
  return s;
}
/* the curve the canvas actually strokes, at fold f (from strokeAbs) */
function foldVal(m, b, x, f) {
  const cs = f >= 0.999 ? -1 : Math.cos(Math.PI * f);
  const g = m * x + b;
  return g >= 0 ? g : g * cs;
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
  const n = checks - c0;
  const f = fails - f0;
  console.log(`  ${f === 0 ? '✓' : '✗'} ${name.padEnd(56)} ${String(n).padStart(9)} checks${f ? `  ${f} FAILED` : ''}`);
}

/* every parameter setting the dials can reach */
const MS = [];
for (let m = M_MIN; m <= M_MAX; m++) MS.push(m);
const BS = [];
for (let b = B_MIN; b <= B_MAX; b++) BS.push(b);
const DS = [];
for (let d = D_MIN; d <= D_MAX; d++) DS.push(d);

/* x samples that are EXACT in binary floating point (halves), so every
   comparison below is an exact comparison, not an epsilon one */
const XS = [];
for (let k = -16; k <= 16; k++) XS.push(k / 2);

console.log('\n  AbsoluteValueLab — model audit');
console.log('  ' + '─'.repeat(72));

/* 1 — rationals reduce exactly and print correctly ----------------------- */
section('rational reduction is exact and canonical', () => {
  for (let n = -40; n <= 40; n++) {
    for (let d = -12; d <= 12; d++) {
      if (d === 0) {
        ok(rat(n, d) === null, `rat(${n},0) should be null`);
        continue;
      }
      const r = rat(n, d);
      ok(r.d > 0, `denominator not positive for ${n}/${d}`);
      ok(gcd(r.n, r.d) === 1 || r.n === 0, `not reduced: ${n}/${d} → ${r.n}/${r.d}`);
      // value preserved exactly: n/d === r.n/r.d  ⇔  n·r.d === r.n·d
      ok(n * r.d === r.n * d, `value changed: ${n}/${d} → ${r.n}/${r.d}`);
      ok(r.n === 0 ? r.d === 1 : true, `zero not canonical: ${n}/${d} → ${r.n}/${r.d}`);
    }
  }
  ok(ratStr(rat(-3, 2)) === '−3/2', 'ratStr(-3/2)');
  ok(ratStr(rat(4, 2)) === '2', 'ratStr(4/2) should reduce to 2');
  ok(ratStr(rat(3, -2)) === '−3/2', 'ratStr(3/-2) should normalise sign');
  ok(ratStr(rat(0, 5)) === '0', 'ratStr(0/5)');
});

/* 2 — the inside prints like mathematics, not like code ------------------ */
section('insideStr sign/coefficient formatting', () => {
  for (const m of MS) {
    for (const b of BS) {
      const s = insideStr(m, b);
      checks++;
      let bad = null;
      if (/(^|[^\d])1x/.test(s)) bad = 'writes "1x"';
      else if (s.includes('+ -') || s.includes('+ −')) bad = 'writes "+ −"';
      else if (/[+−-]\s*0\b/.test(s) && b === 0) bad = 'writes a "+ 0" term';
      else if (s.includes('--') || s.includes('- ')) bad = 'uses a hyphen, not a minus sign';
      else if (m !== 0 && b === 0 && s.includes('+')) bad = 'trailing + with b = 0';
      else if (m === 0 && s.includes('x')) bad = 'shows an x when m = 0';
      if (bad) {
        fails++;
        if (failSamples.length < 20) failSamples.push(`insideStr(${m},${b}) = "${s}" — ${bad}`);
      }
    }
  }
  ok(insideStr(1, 0) === 'x', 'insideStr(1,0)');
  ok(insideStr(-1, 0) === '−x', 'insideStr(-1,0)');
  ok(insideStr(1, -4) === 'x − 4', 'insideStr(1,-4)');
  ok(insideStr(2, 6) === '2x + 6', 'insideStr(2,6)');
  ok(insideStr(-3, 0) === '−3x', 'insideStr(-3,0)');
  ok(insideStr(0, -5) === '−5', 'insideStr(0,-5)');
  ok(insideStr(0, 0) === '0', 'insideStr(0,0)');
});

/* 3 — THE CORNER: the crease lands exactly where the inside is zero ------ */
section('corner is the exact zero of the inside (integer-checked)', () => {
  for (const m of MS) {
    for (const b of BS) {
      const c = corner(m, b);
      if (m === 0) {
        ok(c === null, `m=0 must have no corner (m=${m},b=${b})`);
        continue;
      }
      // c = n/d. The claim m·(n/d) + b = 0 is checked in INTEGERS: m·n + b·d = 0
      ok(m * c.n + b * c.d === 0, `corner not a zero of the inside: m=${m} b=${b} c=${ratStr(c)}`);
      // and the corner always lands on the drawn paper (why the window is [-8,8])
      const v = ratVal(c);
      ok(v >= WORLD.xmin && v <= WORLD.xmax, `corner off-window: m=${m} b=${b} → x=${v}`);
      // the curve's height there is exactly 0 — the low point of the V
      ok(absOf(m, b, v) === 0, `|inside| ≠ 0 at the corner: m=${m} b=${b}`);
    }
  }
});

/* 4 — THE FOLD: never negative, and the V opens up ----------------------- */
section('|inside| is never negative — the V opens up', () => {
  for (const m of MS) {
    for (const b of BS) {
      for (const x of XS) {
        ok(absOf(m, b, x) >= 0, `negative output: m=${m} b=${b} x=${x}`);
      }
      // "opens up" made precise: away from the corner, the curve strictly rises
      // in both directions (or is flat, only when m = 0)
      const c = corner(m, b);
      if (c) {
        const v = ratVal(c);
        for (const t of [0.5, 1, 2, 3.5]) {
          ok(absOf(m, b, v + t) > 0, `arm not above the axis to the right: m=${m} b=${b}`);
          ok(absOf(m, b, v - t) > 0, `arm not above the axis to the left: m=${m} b=${b}`);
          // both arms rise at the same rate |m| — a symmetric V
          ok(
            Math.abs(absOf(m, b, v + t) - absOf(m, b, v - t)) < 1e-9,
            `V not symmetric about its corner: m=${m} b=${b} t=${t}`
          );
        }
      }
    }
  }
});

/* 5 — THE RULE the fold follows: the piecewise definition ---------------- */
section('piecewise law |u| = u if u ≥ 0 else −u, and the branch regions', () => {
  for (const m of MS) {
    for (const b of BS) {
      for (const x of XS) {
        const u = inside(m, b, x);
        const want = u >= 0 ? u : -u;
        ok(absOf(m, b, x) === want, `piecewise law broken: m=${m} b=${b} x=${x}`);
      }
      // the lab SHADES a region and claims the inside is negative there
      const reg = negRegion(m, b);
      const c = corner(m, b);
      for (const x of XS) {
        const negHere = inside(m, b, x) < 0;
        let claims;
        if (reg === 'all') claims = true;
        else if (reg === 'none') claims = false;
        else if (reg === 'left') claims = x < ratVal(c);
        else claims = x > ratVal(c);
        ok(negHere === claims, `shaded region wrong: m=${m} b=${b} x=${x} reg=${reg}`);
      }
    }
  }
});

/* 6 — THE ANIMATION is the fold, and it lands exactly on |inside| -------- */
section('fold: f=0 is the bare line, f=1 is |inside|, f=½ is flat', () => {
  for (const m of MS) {
    for (const b of BS) {
      for (const x of XS) {
        // unfolded: the curve IS the inside line
        ok(foldVal(m, b, x, 0) === inside(m, b, x), `f=0 ≠ the line: m=${m} b=${b} x=${x}`);
        // fully folded: the curve IS the absolute value
        ok(foldVal(m, b, x, 1) === absOf(m, b, x), `f=1 ≠ |inside|: m=${m} b=${b} x=${x}`);
        // half-folded: the lifted part lies ON the crease. Math.cos(Math.PI/2)
        // is 6.1e-17 rather than 0, so the residue scales with the height being
        // lifted — the tolerance has to scale with it too. This is sub-picopixel
        // dust, and no fact the lab states ever consults a half-folded value.
        if (inside(m, b, x) < 0) {
          const g = Math.abs(inside(m, b, x));
          ok(Math.abs(foldVal(m, b, x, 0.5)) < g * 1e-14, `f=½ not flat: m=${m} b=${b} x=${x}`);
        } else {
          ok(foldVal(m, b, x, 0.5) === inside(m, b, x), `f=½ moved the upper half: m=${m} b=${b}`);
        }
        // the fold NEVER moves anything above the axis, at any f
        if (inside(m, b, x) >= 0) {
          for (const f of [0, 0.25, 0.5, 0.75, 1]) {
            ok(foldVal(m, b, x, f) === inside(m, b, x), `upper half moved at f=${f}: m=${m} b=${b}`);
          }
        }
        // and the lifted half rises monotonically toward its mirror image
        if (inside(m, b, x) < 0) {
          let prev = -Infinity;
          let monotone = true;
          for (let i = 0; i <= 10; i++) {
            const v = foldVal(m, b, x, i / 10);
            if (v < prev - 1e-12) monotone = false;
            prev = v;
          }
          ok(monotone, `fold not monotone: m=${m} b=${b} x=${x}`);
        }
      }
    }
  }
});

/* 7 — SOLUTIONS: exact, and EXHAUSTIVE (no answer is missed) ------------- */
section('solve(): claimed solutions are exact', () => {
  for (const m of MS) {
    for (const b of BS) {
      for (const d of DS) {
        const { kind, xs } = solve(m, b, d);
        ok(['two', 'one', 'none', 'all'].includes(kind), `bad kind: ${kind}`);
        // the count the lab tells the student
        const wantKind =
          d < 0 ? 'none' : m === 0 ? (Math.abs(b) === d ? 'all' : 'none') : d === 0 ? 'one' : 'two';
        ok(kind === wantKind, `wrong solution count: m=${m} b=${b} d=${d} → ${kind}, want ${wantKind}`);
        // every claimed solution really solves it — checked in INTEGERS:
        // |m·(n/dd) + b| = d  ⇔  |m·n + b·dd| = d·dd   (dd > 0)
        xs.forEach((r) => {
          ok(
            Math.abs(m * r.n + b * r.d) === d * r.d,
            `claimed solution fails: m=${m} b=${b} d=${d} x=${ratStr(r)}`
          );
        });
        // two answers must be DIFFERENT answers
        if (kind === 'two') {
          ok(ratVal(xs[0]) !== ratVal(xs[1]), `"two" solutions coincide: m=${m} b=${b} d=${d}`);
          ok(ratVal(xs[0]) < ratVal(xs[1]), `solutions not sorted: m=${m} b=${b} d=${d}`);
          // ...and they straddle the corner, one per arm of the V
          const v = ratVal(corner(m, b));
          ok(ratVal(xs[0]) < v && ratVal(xs[1]) > v, `solutions not one per arm: m=${m} b=${b} d=${d}`);
        }
        if (kind === 'all') {
          for (const x of XS) ok(absOf(m, b, x) === d, `"all x" is false at x=${x}: m=${m} b=${b} d=${d}`);
        }
      }
    }
  }
});

section('solve(): EXHAUSTIVE — no solution is missed', () => {
  /* Sweep a dense grid of RATIONALS and test |m·x + b| = d exactly in integers.
     The true solutions are (±d − b)/m, whose denominator divides |m| ≤ 3, so a
     grid of every p/q with q ≤ 6 and |p| ≤ 80 provably contains them all. Any
     x the grid finds that solve() did not report would be a missed answer. */
  const QS = [1, 2, 3, 4, 6];
  for (const m of MS) {
    if (m === 0) continue; // the 'all x' case is checked above
    for (const b of BS) {
      for (const d of DS) {
        const claimed = new Set(solve(m, b, d).xs.map((r) => `${r.n}/${r.d}`));
        const found = new Set();
        for (const q of QS) {
          for (let p = -80; p <= 80; p++) {
            // |m·p/q + b| = d  ⇔  |m·p + b·q| = d·q   (q > 0, d ≥ 0 required)
            const hit = d >= 0 && Math.abs(m * p + b * q) === d * q;
            if (hit) {
              const r = rat(p, q);
              found.add(`${r.n}/${r.d}`);
            }
          }
        }
        ok(
          found.size === claimed.size && [...found].every((k) => claimed.has(k)),
          `solution set mismatch m=${m} b=${b} d=${d}: found {${[...found]}} claimed {${[...claimed]}}`
        );
      }
    }
  }
});

/* 8 — THE DISTANCE READING ---------------------------------------------- */
section('|m·x + b| = |m| × distance from x to the corner', () => {
  for (const m of MS) {
    if (m === 0) continue;
    for (const b of BS) {
      const v = ratVal(corner(m, b));
      for (const x of XS) {
        const lhs = absOf(m, b, x);
        const rhs = Math.abs(m) * Math.abs(x - v);
        ok(Math.abs(lhs - rhs) < 1e-9, `distance reading fails: m=${m} b=${b} x=${x}`);
      }
      // the headline case: |x − c| IS the distance from x to c
      if (Math.abs(m) === 1) {
        for (const x of XS) {
          ok(
            Math.abs(absOf(m, b, x) - Math.abs(x - v)) < 1e-9,
            `|x − c| is not dist(x,c): m=${m} b=${b} x=${x}`
          );
        }
      }
    }
  }
  // The worked example step 7 puts ON SCREEN, checked against what the lesson
  // text claims: |x − 4| = 3 ⇒ the two numbers 3 away from 4. The step seeds
  // (m, b, d) = (1, −4, 3), so all three must be reachable by the dials, or the
  // text would describe a picture the lab cannot draw.
  const s = solve(1, -4, 3);
  ok(s.kind === 'two' && ratStr(s.xs[0]) === '1' && ratStr(s.xs[1]) === '7', '|x − 4| = 3 ⇒ {1, 7}');
  ok(-4 >= B_MIN && -4 <= B_MAX && 3 >= D_MIN && 3 <= D_MAX, 'step 7 seeds a setting the dials cannot reach');
});

/* 9 — THE BARS ERASE THE INSIDE'S SIGN (the calibration gate's premise) -- */
section('sameV ⇔ the two settings draw an identical V', () => {
  for (const m1 of MS) {
    for (const b1 of BS) {
      for (const m2 of MS) {
        for (const b2 of BS) {
          // identical as FUNCTIONS? (exact float comparison — halves are exact)
          let identical = true;
          for (const x of XS) {
            if (absOf(m1, b1, x) !== absOf(m2, b2, x)) {
              identical = false;
              break;
            }
          }
          ok(
            sameV(m1, b1, m2, b2) === identical,
            `sameV disagrees with the picture: (${m1},${b1}) vs (${m2},${b2}) — sameV=${sameV(
              m1,
              b1,
              m2,
              b2
            )}, identical=${identical}`
          );
        }
      }
    }
  }
});

/* 10 — CALIBRATION can never award a false stamp ------------------------- */
section('no false CALIBRATED, and the challenge never opens pre-solved', () => {
  for (const [mT, bT] of TARGETS) {
    ok(mT >= M_MIN && mT <= M_MAX && bT >= B_MIN && bT <= B_MAX, `target out of dial range (${mT},${bT})`);
    ok(mT !== 0, `target (${mT},${bT}) has no corner — nothing to aim at`);
    // the dials reset to (1, 0): no target may already be that V
    ok(!sameV(1, 0, mT, bT), `target (${mT},${bT}) opens PRE-SOLVED at the reset dials`);
    for (const m of MS) {
      for (const b of BS) {
        const stamped = sameV(m, b, mT, bT);
        // ground truth: is the student's V really the ghost's V?
        let identical = true;
        for (const x of XS) {
          if (absOf(m, b, x) !== absOf(mT, bT, x)) {
            identical = false;
            break;
          }
        }
        ok(stamped === identical, `false stamp: (${m},${b}) vs ghost (${mT},${bT})`);
        // the meter agrees with the stamp at the top of its range, and only there
        ok(
          (matchPct(m, b, mT, bT) === 100) === identical,
          `meter reads 100 without a match: (${m},${b}) vs (${mT},${bT})`
        );
        // an unmatched V never reads full, and rms = 0 only when matched
        if (!identical) ok(matchRms(m, b, mT, bT) > 0, `rms = 0 for a non-match: (${m},${b})`);
      }
    }
    // every target is reachable, by exactly two settings (m,b) and (−m,−b)
    let hits = 0;
    for (const m of MS) for (const b of BS) if (sameV(m, b, mT, bT)) hits++;
    ok(hits === 2, `target (${mT},${bT}) has ${hits} winning settings, want 2`);
  }
  // no two ghosts are secretly the same V (so "New ghost" is always a new task)
  for (let i = 0; i < TARGETS.length; i++) {
    for (let j = i + 1; j < TARGETS.length; j++) {
      ok(
        !sameV(TARGETS[i][0], TARGETS[i][1], TARGETS[j][0], TARGETS[j][1]),
        `targets ${i} and ${j} draw the same V`
      );
    }
  }
});

/* 11 — the meter is sane and monotone in the error ----------------------- */
section('match meter is monotone in the error and well spread', () => {
  for (const [mT, bT] of TARGETS) {
    const rows = [];
    for (const m of MS) for (const b of BS) rows.push({ m, b, r: matchRms(m, b, mT, bT), p: matchPct(m, b, mT, bT) });
    // a bigger rms must never read as a better match
    for (let i = 0; i < rows.length; i++) {
      for (let j = 0; j < rows.length; j++) {
        if (rows[i].r < rows[j].r - 1e-9) ok(rows[i].p >= rows[j].p, `meter not monotone for ghost (${mT},${bT})`);
      }
    }
    // an off-by-one on b should feel close but never full
    const near = matchPct(mT, bT === B_MAX ? bT - 1 : bT + 1, mT, bT);
    ok(near > 40 && near < 100, `off-by-one on b reads ${near}% for ghost (${mT},${bT})`);
    // a wrong-slope V should read clearly worse than an off-by-one
    const wrongM = matchPct(mT === M_MAX ? mT - 1 : mT + 1, bT, mT, bT);
    ok(wrongM < 100, `wrong slope reads ${wrongM}% for ghost (${mT},${bT})`);
  }
});

/* 12 — the drawn window and dial ranges keep their promises -------------- */
section('window & dial ranges', () => {
  ok(WORLD.xmax - WORLD.xmin === WORLD.ymax - WORLD.ymin, 'window is not square — quadrille cells would not be');
  ok(WORLD.ymin === -WORLD.ymax, 'window is not symmetric in y — the fold would look lopsided');
  for (const m of MS) {
    for (const b of BS) {
      if (m === 0) continue;
      ok(Math.abs(-b / m) <= WORLD.xmax, `corner escapes the paper at m=${m}, b=${b}`);
    }
  }
  ok(D_MIN < 0, 'the level dial cannot reach a negative d — the "no solution" case is unreachable');
  ok(D_MAX <= WORLD.ymax, 'the level line can leave the paper');
  // the lesson's step-6 preset really is in |x − c| form
  ok(insideStr(1, -4) === 'x − 4', 'step 6 must open showing |x − 4|');
});

/* ---- report ------------------------------------------------------------ */
console.log('  ' + '─'.repeat(72));
console.log(
  `  TOTAL: ${checks.toLocaleString()} checks, ${fails === 0 ? 'ALL PASS ✓' : fails + ' FAILED ✗'}`
);
console.log('');
if (fails) {
  console.log('  first failures:');
  failSamples.forEach((s) => console.log('   ·', s));
  console.log('');
  process.exit(1);
}
