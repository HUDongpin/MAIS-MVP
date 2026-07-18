/* ============================================================================
   audit-lcm.mjs — numeric proof that LCMLab's cycle model is exact and its
   calibration can never award a false CALIBRATED stamp.

   The lab's thesis: two wheels of period a and b, both starting HOME, point home
   together again exactly on the common multiples of a and b — first at LCM(a,b).
   Everything below verifies that claim and the facts printed on screen.

   Run:  node audit-lcm.mjs
   Zero dependencies. Mirrors the pure-math functions in LCMLab.jsx exactly.
   ========================================================================== */

/* ---- model, copied verbatim from LCMLab.jsx ---------------------------- */
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
function lcm(a, b) {
  if (a === 0 || b === 0) return 0;
  return (a / gcd(a, b)) * b;
}
function isHome(period, tau) {
  const turns = tau / period;
  const frac = turns - Math.floor(turns + 1e-9);
  return frac < 0.012 || frac > 0.988;
}

const TARGETS = [6, 10, 12, 15, 18, 20, 24, 30, 36, 40, 60, 72];

/* ---- independent reference implementations (deliberately different) ----- */
function gcdRef(a, b) {
  let best = 1;
  for (let d = 1; d <= Math.min(a, b); d++) if (a % d === 0 && b % d === 0) best = d;
  return best;
}
function lcmRef(a, b) {
  for (let m = 1; ; m++) if (m % a === 0 && m % b === 0) return m;
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
  const tag = fails > f0 ? 'FAIL' : 'pass';
  console.log(
    `  [${tag}] ${name.padEnd(54)} ${(checks - c0).toLocaleString()} checks` +
      (fails > f0 ? `  (${fails - f0} failed)` : '')
  );
}

console.log('\naudit-lcm.mjs — verifying the Least Common Multiple lab (cycle re-sync model)\n');

/* 1 — gcd / lcm agree with brute force ----------------------------------- */
section('gcd & lcm match brute-force references (2..60)', () => {
  for (let a = 2; a <= 60; a++) {
    for (let b = 2; b <= 60; b++) {
      ok(gcd(a, b) === gcdRef(a, b), `gcd(${a},${b})`);
      ok(lcm(a, b) === lcmRef(a, b), `lcm(${a},${b})`);
      ok(gcd(a, b) * lcm(a, b) === a * b, `gcd*lcm ≠ a*b at (${a},${b})`);
      ok(lcm(a, b) % a === 0 && lcm(a, b) % b === 0, `lcm(${a},${b}) not a common multiple`);
    }
  }
});

/* 2 — isHome fires exactly on whole turns -------------------------------- */
section('isHome(p,t) ⇔ t is a whole multiple of p', () => {
  for (let p = 2; p <= 12; p++) {
    for (let t = 0; t <= 200; t++) {
      ok(isHome(p, t) === (t % p === 0), `isHome(${p},${t}) disagrees with t%${p}===0`);
    }
  }
});

/* 3 — THE THESIS: both wheels home ⇔ t is a common multiple; first = LCM -- */
section('both wheels home ⇔ t % LCM === 0, and the FIRST is the LCM', () => {
  for (let a = 2; a <= 12; a++) {
    for (let b = 2; b <= 12; b++) {
      const L = lcm(a, b);
      let firstSync = -1;
      for (let t = 1; t <= 3 * L; t++) {
        const both = isHome(a, t) && isHome(b, t);
        // a re-sync happens exactly on the multiples of the LCM
        ok(both === (t % L === 0), `sync mismatch at t=${t} for (${a},${b})`);
        if (both && firstSync < 0) firstSync = t;
      }
      // the first re-sync IS the least common multiple
      ok(firstSync === L, `first re-sync ${firstSync} ≠ LCM ${L} for (${a},${b})`);
    }
  }
});

/* 4 — the turn counters printed under each wheel ------------------------- */
section('turns to re-sync: L/a = b/gcf and L/b = a/gcf (whole numbers)', () => {
  for (let a = 2; a <= 12; a++) {
    for (let b = 2; b <= 12; b++) {
      const g = gcd(a, b);
      const L = lcm(a, b);
      const tA = L / a;
      const tB = L / b;
      ok(Number.isInteger(tA) && Number.isInteger(tB), `non-integer turn count (${a},${b})`);
      ok(tA === b / g, `A turns ${tA} ≠ b/gcf ${b / g} for (${a},${b})`);
      ok(tB === a / g, `B turns ${tB} ≠ a/gcf ${a / g} for (${a},${b})`);
      // each wheel really is home after exactly that many turns
      ok(isHome(a, tA * a) && isHome(b, tB * b), `not home after its turns (${a},${b})`);
      ok(tA * a === L && tB * b === L, `turns×period ≠ LCM (${a},${b})`);
    }
  }
});

/* 5 — the shortcut and the two special cases the lesson claims ----------- */
section('shortcut L = a·b ÷ GCF, plus coprime & divides cases', () => {
  for (let a = 2; a <= 12; a++) {
    for (let b = 2; b <= 12; b++) {
      const g = gcd(a, b);
      const L = lcm(a, b);
      ok(L === (a * b) / g, `shortcut fails at (${a},${b})`);
      if (g === 1) ok(L === a * b, `coprime (${a},${b}) should re-sync at a·b`);
      if (b % a === 0) ok(L === b, `a|b (${a},${b}) should re-sync at b`);
      if (a % b === 0) ok(L === a, `b|a (${a},${b}) should re-sync at a`);
    }
  }
});

/* 6 — every calibration target is reachable with a pair in 2..12 --------- */
section('every TARGET is the LCM of some pair in 2..12', () => {
  for (const T of TARGETS) {
    let sols = 0;
    for (let a = 2; a <= 12; a++) for (let b = 2; b <= 12; b++) if (lcm(a, b) === T) sols++;
    ok(sols >= 1, `target ${T} is unreachable`);
  }
});

/* 7 — the meter can NEVER fire a false CALIBRATED ------------------------ */
section('meter: pct=100 ⇔ L===target, over every pair × target', () => {
  const pctOf = (L, target) =>
    target == null
      ? 0
      : L === target
      ? 100
      : Math.min(99, Math.round((100 * Math.min(L, target)) / Math.max(L, target)));
  for (const T of TARGETS) {
    for (let a = 2; a <= 12; a++) {
      for (let b = 2; b <= 12; b++) {
        const L = lcm(a, b);
        const pct = pctOf(L, T);
        // the stamp gate is exact integer equality — no float can fake it
        ok((pct === 100) === (L === T), `pct=100 without exact hit (${a},${b})→${T}`);
        ok(Number.isInteger(pct) && pct >= 0 && pct <= 100, `pct out of range (${a},${b})→${T}`);
        if (L !== T) ok(pct <= 99, `partial pct hit 100 (${a},${b})→${T}`);
      }
    }
  }
});

/* 8 — the calibration never STARTS already solved ------------------------ */
section('calib start (a=b=2 ⇒ L=2) is below every target', () => {
  const startL = lcm(2, 2);
  ok(startL === 2, 'start LCM should be 2');
  for (const T of TARGETS) ok(startL !== T, `target ${T} equals the start LCM — starts pre-solved`);
});

/* 9 — tick slider range & notch counts stay drawable --------------------- */
section('tick range 0..L and notch counts ≤ 12 stay renderable', () => {
  for (let a = 2; a <= 12; a++) {
    for (let b = 2; b <= 12; b++) {
      const L = lcm(a, b);
      ok(L >= Math.max(a, b) && L <= 132, `LCM ${L} out of expected range (${a},${b})`);
      ok(a <= 12 && b <= 12, `notch count > 12 (${a},${b})`);
    }
  }
});

/* 10 — symmetry & self cases -------------------------------------------- */
section('symmetry lcm(a,b)=lcm(b,a) and lcm(a,a)=a', () => {
  for (let a = 2; a <= 30; a++) {
    ok(lcm(a, a) === a, `lcm(${a},${a}) ≠ ${a}`);
    for (let b = 2; b <= 30; b++) ok(lcm(a, b) === lcm(b, a), `lcm not symmetric (${a},${b})`);
  }
});

/* ---- report ------------------------------------------------------------ */
console.log('\n' + '─'.repeat(74));
console.log(
  `  TOTAL: ${checks.toLocaleString()} checks, ${fails === 0 ? 'ALL PASS ✓' : fails + ' FAILED ✗'}`
);
console.log('─'.repeat(74) + '\n');
if (fails) {
  console.log('  first failures:');
  failSamples.forEach((s) => console.log('   ·', s));
  console.log('');
  process.exit(1);
}
