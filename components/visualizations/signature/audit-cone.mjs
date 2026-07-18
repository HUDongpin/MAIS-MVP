/* Numeric audit for ConeLab — verifies the geometry model, the exactness of the
   unrolled net, the renderer's lateral-normal frame, every lesson answer, and
   the calibration gate across the whole dial grid.
   Run: node audit-cone.mjs */
const PI = Math.PI;
const TAU = PI * 2;

/* mirror of the component's metrics() (ConeLab.jsx:67) */
function metrics(r, h) {
  const l = Math.hypot(r, h);
  const circumference = TAU * r;
  const base = PI * r * r;
  const lateral = PI * r * l;
  const total = base + lateral;
  const volume = (PI * r * r * h) / 3;
  const cylVolume = PI * r * r * h;
  const sectorDeg = l === 0 ? 0 : (r / l) * 360;
  return { l, circumference, base, lateral, total, volume, cylVolume, sectorDeg };
}

/* mirror of the component's calibration (ConeLab.jsx:192) */
const calibError = (u, t) => Math.hypot(u.r - t.r, u.h - t.h);
const matchPercent = (err) => Math.max(0, Math.min(100, 100 / (1 + err / 0.7)));
const MATCH_ERR = 1e-6;

let checks = 0, fails = 0;
const approx = (a, b, tol, msg) => {
  checks++;
  if (!(Math.abs(a - b) <= tol)) { fails++; console.log(`FAIL ${msg}: ${a} vs ${b} (tol ${tol})`); }
};
const ok = (cond, msg) => {
  checks++;
  if (!cond) { fails++; console.log(`FAIL ${msg}`); }
};

/* ---------------------------------------------------------------------------
   1. Geometry identities over the full dial grid (r∈[0.5,4], h∈[0.5,6.5], .5)
   ------------------------------------------------------------------------- */
for (let r = 0.5; r <= 4.0001; r += 0.5) {
  for (let h = 0.5; h <= 6.5001; h += 0.5) {
    const g = metrics(r, h);

    // slant height is the hypotenuse of the (r, h) right triangle
    approx(g.l * g.l, r * r + h * h, 1e-9, `Pythagoras l²=r²+h² r${r} h${h}`);
    ok(g.l >= r - 1e-12 && g.l >= h - 1e-12, `l is longest side r${r} h${h}`);

    // areas
    approx(g.base, PI * r * r, 1e-12, `base=πr² r${r} h${h}`);
    approx(g.lateral, PI * r * g.l, 1e-12, `lateral=πrl r${r} h${h}`);
    approx(g.total, g.base + g.lateral, 1e-12, `total=base+lateral r${r} h${h}`);
    approx(g.total, PI * r * (r + g.l), 1e-9, `total=πr(r+l) factored r${r} h${h}`);

    // volume: exactly one third of the framing cylinder — the lab's centerpiece
    approx(g.volume, (PI * r * r * h) / 3, 1e-12, `V=⅓πr²h r${r} h${h}`);
    approx(g.volume / g.cylVolume, 1 / 3, 1e-15, `V/V_cyl=⅓ exactly r${r} h${h}`);
    approx(g.volume, (g.base * h) / 3, 1e-12, `V=⅓·base·h r${r} h${h}`);
    ok(isFinite(g.volume) && g.volume > 0, `volume finite & positive r${r} h${h}`);

    /* THE NET (unroll): cutting the curved side up one generator gives a
       circular SECTOR of radius l whose arc is the base circumference 2πr.
       Central angle θ = arc/radius = 2πr/l. The sector's area must equal the
       lateral area — this is *why* lateral = πrl, and the whole surface-area
       step rests on it. */
    const thetaRad = g.circumference / g.l;      // arc / radius
    approx(g.sectorDeg, (thetaRad * 180) / PI, 1e-9, `sectorDeg=θ in degrees r${r} h${h}`);
    approx(g.sectorDeg, (r / g.l) * 360, 1e-12, `sectorDeg=360·r/l r${r} h${h}`);
    approx(0.5 * thetaRad * g.l * g.l, g.lateral, 1e-9, `sector area ½θl² = πrl r${r} h${h}`);
    approx(0.5 * g.l * g.circumference, g.lateral, 1e-9, `sector area ½·l·2πr = πrl r${r} h${h}`);
    approx(thetaRad * g.l, g.circumference, 1e-9, `sector arc = 2πr r${r} h${h}`);
    // a real cone is never a full disk nor a degenerate wedge
    ok(g.sectorDeg > 0 && g.sectorDeg < 360, `sector angle in (0°,360°) r${r} h${h}`);

    /* RENDERER: the lateral outward normal used for back-face culling and
       flat-shading is N ∝ (h·cosφ, h·sinφ, r). It must be perpendicular to the
       generator AND the rim tangent, and must point AWAY from the axis. If this
       is wrong the culling inverts and the solid renders inside-out. */
    for (const phi of [0, 0.7, 1.9, PI, 4.3, 5.8]) {
      const c = Math.cos(phi), s = Math.sin(phi);
      const N = [h * c, h * s, r];
      const generator = [-r * c, -r * s, h];   // rim point → apex
      const tangent = [-s, c, 0];              // along the rim
      const outward = [c, s, 0];               // axis → rim, horizontally
      const d = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
      approx(d(N, generator), 0, 1e-12, `N ⟂ generator r${r} h${h} φ${phi}`);
      approx(d(N, tangent), 0, 1e-12, `N ⟂ rim tangent r${r} h${h} φ${phi}`);
      ok(d(N, outward) > 0, `N points outward r${r} h${h} φ${phi}`);
    }
  }
}

/* ---------------------------------------------------------------------------
   2. Exact Pythagorean cases — these must be clean integers on screen
   ------------------------------------------------------------------------- */
approx(metrics(3, 4).l, 5, 1e-12, '3-4-5 → l=5');
approx(metrics(1.5, 2).l, 2.5, 1e-12, '1.5-2-2.5 → l=2.5');
approx(metrics(3, 4).lateral, 15 * PI, 1e-12, '3-4-5 lateral = 15π');
approx(metrics(3, 4).base, 9 * PI, 1e-12, '3-4-5 base = 9π');
approx(metrics(3, 4).total, 24 * PI, 1e-12, '3-4-5 total = 24π');
approx(metrics(3, 4).volume, 12 * PI, 1e-12, '3-4-5 volume = 12π');
approx(metrics(3, 4).sectorDeg, 216, 1e-12, '3-4-5 net sector = 216°');

/* the lab's default opening state (START = {r:2, h:3}) as first rendered */
const d0 = metrics(2, 3);
approx(d0.l, Math.sqrt(13), 1e-12, 'default l = √13');
approx(d0.volume, 4 * PI, 1e-12, 'default V = 4π');
approx(d0.total, PI * 2 * (2 + Math.sqrt(13)), 1e-12, 'default S = 2π(2+√13)');

/* ---------------------------------------------------------------------------
   3. Every lesson answer, verified numerically (not by eye)
   ------------------------------------------------------------------------- */
// Step "radius": double r, hold h → base area (πr²) becomes FOUR times as large
for (const [r, h] of [[1, 2], [1.5, 3], [2, 5]]) {
  approx(metrics(2 * r, h).base / metrics(r, h).base, 4, 1e-12, `double r → base ×4 (r${r})`);
}
// Step "height": double h, hold r → volume (⅓πr²h) becomes TWICE as large
for (const [r, h] of [[1, 2], [2, 1.5], [3, 3]]) {
  approx(metrics(r, 2 * h).volume / metrics(r, h).volume, 2, 1e-12, `double h → V ×2 (h${h})`);
}
// Step "slant": the question tells the student to set r=3, h=4 and read l → 5
approx(metrics(3, 4).l, 5, 1e-12, 'lesson answer: r=3,h=4 → l=5');
ok(Math.abs(metrics(3, 4).l - 7) > 1 && Math.abs(metrics(3, 4).l - Math.sqrt(7)) > 1,
  'lesson distractors l=7 and l=√7 are both wrong');
// the r=3,h=4 the question asks for must actually be reachable on the dials
ok(3 >= 0.5 && 3 <= 4 && (3 / 0.5) % 1 === 0, 'lesson: r=3 reachable on r dial [0.5,4] step .5');
ok(4 >= 0.5 && 4 <= 6.5 && (4 / 0.5) % 1 === 0, 'lesson: h=4 reachable on h dial [0.5,6.5] step .5');
// Step "volume": cone = ONE THIRD of the cylinder sharing its base and height
for (const [r, h] of [[1, 1], [2.5, 4], [4, 6.5]]) {
  approx(metrics(r, h).volume, metrics(r, h).cylVolume / 3, 1e-12, `cone = ⅓ cylinder (r${r} h${h})`);
}
// Step "surface": the unrolled sector's RADIUS is the slant height l (not r, not h)
for (const [r, h] of [[2, 3], [1, 5], [3.5, 0.5]]) {
  const g = metrics(r, h);
  approx(g.circumference / g.sectorDeg * 360 / TAU, g.l, 1e-9, `sector radius = l (r${r} h${h})`);
  ok(Math.abs(g.l - r) > 1e-9 || r === 0, `sector radius ≠ r, so the distractor is wrong (r${r} h${h})`);
}

/* ---------------------------------------------------------------------------
   4. Calibration gate — CALIBRATED must be provably impossible to fire falsely
   ------------------------------------------------------------------------- */
const rs = [1, 1.5, 2, 2.5, 3, 3.5];        // makeTarget's grid (ConeLab.jsx:199)
const hs = [1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

// every target is reachable on the dials — otherwise the challenge is unwinnable
for (const r of rs) {
  ok(r >= 0.5 && r <= 4 && Math.abs((r / 0.5) - Math.round(r / 0.5)) < 1e-12, `target r=${r} on the r dial`);
}
for (const h of hs) {
  ok(h >= 0.5 && h <= 6.5 && Math.abs((h / 0.5) - Math.round(h / 0.5)) < 1e-12, `target h=${h} on the h dial`);
}

// exact match → err 0 → 100% → CALIBRATED, for every target
for (const r of rs) {
  for (const h of hs) {
    const err = calibError({ r, h }, { r, h });
    approx(err, 0, 0, `exact match err=0 (r${r} h${h})`);
    approx(matchPercent(err), 100, 1e-12, `exact match reads 100% (r${r} h${h})`);
    ok(err <= MATCH_ERR, `exact match fires CALIBRATED (r${r} h${h})`);
  }
}

// the crucial one: NO non-matching dial state anywhere on the grid can fire the
// stamp. Sweep every (dial state × target) pair and require err > MATCH_ERR.
let worstMissPct = 0, nearMisses = 0;
for (let r = 0.5; r <= 4.0001; r += 0.5) {
  for (let h = 0.5; h <= 6.5001; h += 0.5) {
    for (const tr of rs) {
      for (const th of hs) {
        const same = Math.abs(r - tr) < 1e-12 && Math.abs(h - th) < 1e-12;
        if (same) continue;
        const err = calibError({ r, h }, { r: tr, h: th });
        if (err <= MATCH_ERR) { fails++; console.log(`FAIL false CALIBRATED at r${r} h${h} → t(${tr},${th})`); }
        checks++;
        const pct = matchPercent(err);
        if (pct > worstMissPct) worstMissPct = pct;
        if (err < 0.5 - 1e-12) nearMisses++;
      }
    }
  }
}
// a one-grid-step miss (err=0.5) is the closest possible wrong answer
ok(nearMisses === 0, 'no sub-grid-step misses exist (grid is the resolution floor)');
approx(worstMissPct, matchPercent(0.5), 1e-12, 'closest wrong state reads exactly 100/(1+0.5/0.7)');
ok(worstMissPct < 100, `closest wrong state stays under 100% (reads ${worstMissPct.toFixed(1)}%)`);

// meter is monotone: worse error never reads higher
let prev = Infinity;
for (const e of [0, 0.25, 0.5, 1, 1.5, 2, 3, 5]) {
  const p = matchPercent(e);
  ok(p <= prev + 1e-12, `meter monotone decreasing at err=${e}`);
  prev = p;
}
ok(matchPercent(0) === 100, 'meter tops out at 100%');
ok(matchPercent(1e9) >= 0, 'meter never goes negative');

console.log(`\nclosest wrong dial state reads ${worstMissPct.toFixed(1)}% — CALIBRATED needs err ≤ ${MATCH_ERR}`);
console.log(`${checks} checks, ${fails} failures`);
process.exit(fails ? 1 : 0);
