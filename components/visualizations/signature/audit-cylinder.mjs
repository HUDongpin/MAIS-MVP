/* Numeric audit for CylinderLab — verifies the geometry model and the exact
   arc-length conservation of the unroll map across the whole dial grid.
   Run: node audit-cylinder.mjs */
const PI = Math.PI;

function geometry(r, h) {
  return {
    baseArea: PI * r * r,
    circumference: 2 * PI * r,
    volume: PI * r * r * h,
    lateral: 2 * PI * r * h,
    total: 2 * PI * r * r + 2 * PI * r * h,
  };
}
// mirror of the component's lateralArcPoint
function lateralArcPoint(t, r, u) {
  const uu = Math.min(u, 0.9995);
  const R = r / (1 - uu);
  const phi = 2 * PI * (1 - uu);
  const beta = (t - 0.5) * phi;
  const x = R * Math.sin(beta);
  const y = -r + R - R * Math.cos(beta);
  return { x, y };
}

let checks = 0, fails = 0;
const approx = (a, b, tol, msg) => {
  checks++;
  if (!(Math.abs(a - b) <= tol)) { fails++; console.log(`FAIL ${msg}: ${a} vs ${b} (tol ${tol})`); }
};

// dial grid: r in [1,5] step .5, h in [1,8] step .5
for (let r = 1; r <= 5; r += 0.5) {
  for (let h = 1; h <= 8; h += 0.5) {
    const g = geometry(r, h);
    // basic identities
    approx(g.total, 2 * g.baseArea + g.lateral, 1e-9, `total=2·base+lateral r${r} h${h}`);
    approx(g.lateral, g.circumference * h, 1e-9, `lateral=circumference·h r${r} h${h}`);
    approx(g.volume, g.baseArea * h, 1e-9, `volume=base·h r${r} h${h}`);
    if (!isFinite(g.volume) || g.volume <= 0) { fails++; console.log(`FAIL volume finite r${r} h${h}`); }

    // arc-length conservation of the unroll: numerically integrate |dP/dt|·dt over t∈[0,1]
    // for several unroll fractions; must equal the base circumference 2πr for every u.
    for (const u of [0, 0.15, 0.4, 0.7, 0.9, 0.99]) {
      const N = 4000;
      let len = 0;
      let prev = lateralArcPoint(0, r, u);
      for (let i = 1; i <= N; i++) {
        const p = lateralArcPoint(i / N, r, u);
        len += Math.hypot(p.x - prev.x, p.y - prev.y);
        prev = p;
      }
      approx(len, 2 * PI * r, 1e-3, `arc length conserved r${r} u${u}`);
    }
    // at u=0 every arc point sits at distance r from the axis center (0,0) → a true circle
    for (let i = 0; i <= 20; i++) {
      const p = lateralArcPoint(i / 20, r, 0);
      approx(Math.hypot(p.x, p.y), r, 1e-9, `u=0 is circle radius r r${r}`);
    }
    // at u→1 the band is a straight segment of length 2πr at (nearly) constant depth
    const a = lateralArcPoint(0, r, 0.999), b = lateralArcPoint(1, r, 0.999);
    approx(Math.abs(a.x - b.x), 2 * PI * r, 2e-2, `u→1 width = 2πr r${r}`);
    approx(a.y, b.y, 1e-6, `u→1 flat (equal depth ends) r${r}`);
  }
}

// spot-check the lesson's worked example: r=2,h=5 → V=20π
approx(geometry(2, 5).volume, 20 * PI, 1e-9, 'worked example V(2,5)=20π');

console.log(`\n${checks} checks, ${fails} failures`);
process.exit(fails ? 1 : 0);
