/* ============================================================================
   audit-rectangularprism.mjs — numeric correctness audit for RectangularPrismLab.

   Unlike the earlier audits in this library, this one does NOT re-implement the
   lab's math by hand: it EXTRACTS the real pure-math section of
   RectangularPrismLab.jsx (everything from the vector helpers down to the
   component) and executes it. So these checks run the shipped code — a mirror
   cannot silently drift out of sync with the lab.

   The only mirrored pieces are the three functions that live inside draw() and
   so cannot be extracted: the camera `rotate`, and the explode `faceOrigin` /
   `faceQuad`. They are marked MIRRORED below and kept to a few lines each.

   Exhaustive over the dial range l, w, h ∈ 1..6 (all 216 boxes).

   Run:  node audit-rectangularprism.mjs
   ========================================================================== */

import { readFileSync } from 'node:fs';

let checks = 0, fails = 0;
const approx = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
function ok(cond, msg) {
  checks++;
  if (!cond) { fails++; if (fails <= 40) console.error('  ✗ ' + msg); }
}
const banner = (s) => console.log('\n' + s);

/* ---- 0. extract and run the lab's real pure math ------------------------ */
banner('0) extracting the pure-math section from RectangularPrismLab.jsx');
const SRC = readFileSync(new URL('./RectangularPrismLab.jsx', import.meta.url), 'utf8');
const aIdx = SRC.indexOf('const sub = (a, b)');
/* search for the component AFTER the math starts — the header docstring shows an
   `export default function Page()` usage example that would otherwise match first */
const bIdx = SRC.indexOf('export default function', aIdx);
ok(aIdx > 0, 'could not find the start of the pure-math section');
ok(bIdx > aIdx, 'could not find the component boundary');
const PURE = SRC.slice(aIdx, bIdx);
/* the extracted slice must be pure math: no hooks, no React, no JSX elements.
   (Matching a bare "<" would false-positive on prose like "under <60%".) */
ok(!/\buse(State|Ref|Effect|Callback)\b|React\.|<\/?[A-Za-z][\w.]*[\s/>]/.test(PURE),
  'pure section leaked React/JSX — extraction boundary is wrong');

const M = new Function(
  PURE +
    '\nreturn { sub, add, mul, dot3, norm3, boxCorners, boxFaces, EDGES, AXIS_OF_FOCUS,' +
    ' PARAMS, START, facts, simplifySqrt, radStr, rootLabel, MAXD, TARGETS, volOf, saOf,' +
    ' triplesFor, saRange, matchPercent, isCalibrated, makeTarget, STEPS, shade, accentOf,' +
    ' PAIR_LENSES, CARM };'
)();
const {
  sub, add, mul, dot3, norm3, boxCorners, boxFaces, EDGES, AXIS_OF_FOCUS, PARAMS, START,
  facts, simplifySqrt, radStr, rootLabel, MAXD, TARGETS, volOf, saOf, triplesFor, saRange,
  matchPercent, isCalibrated, makeTarget, STEPS, accentOf, PAIR_LENSES,
} = M;
ok(typeof facts === 'function' && typeof saRange === 'function', 'extraction failed');
console.log(`   extracted ${PURE.length} bytes of real lab math`);

const cross3 = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const len3 = (a) => Math.hypot(a[0], a[1], a[2]);
const BOXES = [];
for (let l = 1; l <= 6; l++) for (let w = 1; w <= 6; w++) for (let h = 1; h <= 6; h++) BOXES.push([l, w, h]);

/* MIRRORED from draw(): the camera rotation (yaw about Y, then pitch about X). */
const makeRotate = (yaw, pitch) => {
  const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  return (p) => {
    const x1 = p[0] * cyw + p[2] * syw;
    const z1 = -p[0] * syw + p[2] * cyw;
    return [x1, p[1] * cp - z1 * sp, p[1] * sp + z1 * cp];
  };
};
/* MIRRORED from draw(): the explode transform. */
const offOf = (e, l, w, h) => e * (Math.max(l, w, h) * 0.5 + 0.75);
const faceOrigin = (f, e, l, w, h) => add(f.o, mul(f.n, offOf(e, l, w, h)));
const faceQuad = (f, e, l, w, h) => {
  const O = faceOrigin(f, e, l, w, h);
  return [O, add(O, f.u), add(add(O, f.u), f.v), add(O, f.v)];
};

/* ---- 1. dials and lesson shape ----------------------------------------- */
banner('1) dials + lesson structure');
ok(PARAMS.length === 4, 'expected 4 dials');
ok(PARAMS.map((p) => p.key).join(',') === 'l,w,h,explode', 'dial keys/order wrong');
ok(PARAMS.map((p) => p.unlock).join(',') === '1,2,3,4', 'dials must unlock one per step');
for (const p of PARAMS) ok(p.min < p.max, `dial ${p.key} has an empty range`);
for (const k of ['l', 'w', 'h']) {
  const p = PARAMS.find((x) => x.key === k);
  ok(p.step === 1 && p.min === 1 && p.max === MAXD, `dial ${k} must be integer 1..${MAXD}`);
  ok(Number.isInteger(START[k]) && START[k] >= p.min && START[k] <= p.max, `START.${k} out of range`);
}
ok(STEPS.length === 8, `expected 8 steps, got ${STEPS.length}`);
ok(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
ok(STEPS[STEPS.length - 1].calib === true, 'the calibration must be the capstone');
const seenFocus = new Set();
for (const [i, s] of STEPS.entries()) {
  ok(!!s.title && !!s.focus, `step ${i} missing title/focus`);
  ok(!seenFocus.has(s.focus), `duplicate focus "${s.focus}"`);
  seenFocus.add(s.focus);
  if (s.calib) continue;
  ok(!!s.q && Array.isArray(s.choices) && s.choices.length >= 3, `step ${i} malformed question`);
  ok(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} bad answer index`);
  ok(!!s.feedback && s.feedback.length > 40, `step ${i} feedback too thin`);
}
/* every dial must be unlocked by a step that exists */
for (const p of PARAMS) ok(p.unlock < STEPS.length, `dial ${p.key} unlocks past the end`);

/* ---- 2. facts(): every formula, over all 216 boxes ---------------------- */
banner('2) facts() — areas, surface area, diagonals (all 216 boxes)');
for (const [l, w, h] of BOXES) {
  const F = facts(l, w, h);
  const tag = `${l}×${w}×${h}`;
  ok(F.lw === l * w, `${tag}: lw`);
  ok(F.lh === l * h, `${tag}: lh`);
  ok(F.wh === w * h, `${tag}: wh`);
  ok(F.surface === 2 * (l * w + l * h + w * h), `${tag}: SA formula`);
  ok(F.surface === saOf(l, w, h), `${tag}: SA disagrees with saOf`);
  ok(F.volume === l * w * h, `${tag}: volume`);
  ok(F.volume === volOf(l, w, h), `${tag}: volume disagrees with volOf`);
  ok(F.faces === 6 && F.edges === 12 && F.vertices === 8, `${tag}: face/edge/vertex counts`);
  ok(F.faces - F.edges + F.vertices === 2, `${tag}: Euler characteristic must be 2`);

  /* diagonals — integers squared, Pythagoras applied twice */
  ok(F.baseDiagSq === l * l + w * w, `${tag}: base diagonal squared`);
  ok(F.spaceDiagSq === l * l + w * w + h * h, `${tag}: space diagonal squared`);
  ok(F.spaceDiagSq === F.baseDiagSq + h * h, `${tag}: d² must equal (l²+w²) + h²`);
  ok(approx(F.baseDiag, Math.sqrt(F.baseDiagSq)), `${tag}: baseDiag value`);
  ok(approx(F.spaceDiag, Math.sqrt(F.spaceDiagSq)), `${tag}: spaceDiag value`);
  ok(Number.isInteger(F.baseDiagSq) && Number.isInteger(F.spaceDiagSq), `${tag}: squared diagonals must be integers`);

  /* the claims the lesson makes about the diagonal */
  ok(F.spaceDiag >= F.baseDiag, `${tag}: space diagonal must be ≥ the floor diagonal`);
  ok(F.spaceDiag <= l + w + h + 1e-12, `${tag}: diagonal must not exceed the edge path`);
  ok(F.spaceDiag >= Math.max(l, w, h), `${tag}: diagonal must be ≥ the longest edge`);
  /* d is genuinely the LONGEST segment in the box: check against all 28 corner pairs */
  const C = boxCorners(l / 2, h / 2, w / 2);
  let maxSep = 0;
  for (let i = 0; i < 8; i++)
    for (let j = i + 1; j < 8; j++) maxSep = Math.max(maxSep, len3(sub(C[i], C[j])));
  ok(approx(maxSep, F.spaceDiag), `${tag}: space diagonal must be the max corner separation`);
}

/* ---- 3. boxFaces() — the three congruent pairs -------------------------- */
banner('3) boxFaces() — geometry, outward normals, and the 3 congruent pairs');
for (const [l, w, h] of BOXES) {
  const F6 = boxFaces(l, w, h);
  const tag = `${l}×${w}×${h}`;
  ok(F6.length === 6, `${tag}: must have 6 faces`);

  const half = { x: l / 2, y: h / 2, z: w / 2 };
  let areaSum = 0;
  for (const f of F6) {
    /* a face is a RECTANGLE: its two edge vectors are perpendicular */
    ok(approx(dot3(f.u, f.v), 0), `${tag}/${f.key}: u must be ⟂ v (faces are rectangles)`);
    /* and both lie in the face plane, i.e. ⟂ the normal */
    ok(approx(dot3(f.u, f.n), 0), `${tag}/${f.key}: u must be ⟂ n`);
    ok(approx(dot3(f.v, f.n), 0), `${tag}/${f.key}: v must be ⟂ n`);
    /* the declared side lengths are the real ones */
    ok(approx(len3(f.u), f.a), `${tag}/${f.key}: |u| must equal a`);
    ok(approx(len3(f.v), f.b), `${tag}/${f.key}: |v| must equal b`);
    /* the normal is a unit vector */
    ok(approx(len3(f.n), 1), `${tag}/${f.key}: normal must be a unit vector`);
    /* area from the cross product agrees with a·b */
    ok(approx(len3(cross3(f.u, f.v)), f.a * f.b), `${tag}/${f.key}: area must be a×b`);
    /* the unit-square scoring is exact — uc×vc squares tile the face with none left over */
    ok(f.uc === f.a && f.vc === f.b, `${tag}/${f.key}: scoring counts must equal the side lengths`);
    ok(Number.isInteger(f.uc) && Number.isInteger(f.vc), `${tag}/${f.key}: scoring must be whole squares`);
    ok(f.uc * f.vc === f.a * f.b, `${tag}/${f.key}: unit squares must equal the area`);
    areaSum += f.a * f.b;

    /* all four corners lie exactly ON the box surface */
    const quad = faceQuad(f, 0, l, w, h);
    for (const p of quad) {
      ok(Math.abs(p[0]) <= half.x + 1e-9, `${tag}/${f.key}: corner outside in x`);
      ok(Math.abs(p[1]) <= half.y + 1e-9, `${tag}/${f.key}: corner outside in y`);
      ok(Math.abs(p[2]) <= half.z + 1e-9, `${tag}/${f.key}: corner outside in z`);
    }
    /* the outward normal really points AWAY from the centre (box centred at origin) */
    const centroid = mul(quad.reduce((s, p) => add(s, p), [0, 0, 0]), 0.25);
    ok(dot3(f.n, centroid) > 0, `${tag}/${f.key}: normal must point outward`);
  }
  /* THE CENTREPIECE IDENTITY: the six faces' areas ARE the surface area */
  ok(areaSum === facts(l, w, h).surface, `${tag}: Σ face areas must equal 2(lw+lh+wh)`);

  /* exactly three pairs, two faces each, congruent and anti-parallel */
  const byPair = {};
  for (const f of F6) (byPair[f.pair] ||= []).push(f);
  ok(Object.keys(byPair).sort().join(',') === 'lh,lw,wh', `${tag}: pair keys`);
  for (const [key, fs] of Object.entries(byPair)) {
    ok(fs.length === 2, `${tag}: pair ${key} must have exactly 2 faces`);
    const [p, q] = fs;
    /* congruent: the same rectangle */
    ok(p.a === q.a && p.b === q.b, `${tag}: pair ${key} faces must be congruent`);
    ok(p.a * p.b === q.a * q.b, `${tag}: pair ${key} areas must match`);
    /* parallel and facing opposite ways */
    ok(approx(dot3(p.n, q.n), -1), `${tag}: pair ${key} normals must be exact opposites`);
    /* separated by the remaining dimension */
    const cP = mul(faceQuad(p, 0, l, w, h).reduce((s, x) => add(s, x), [0, 0, 0]), 0.25);
    const cQ = mul(faceQuad(q, 0, l, w, h).reduce((s, x) => add(s, x), [0, 0, 0]), 0.25);
    const gap = Math.abs(dot3(sub(cP, cQ), p.n));
    const expect = key === 'lw' ? h : key === 'lh' ? w : l;
    ok(approx(gap, expect), `${tag}: pair ${key} must be ${expect} apart, got ${gap}`);
  }
  /* the pairs use the right two measurements each */
  ok(byPair.lw[0].a === l && byPair.lw[0].b === w, `${tag}: lw pair dims`);
  ok(byPair.lh[0].a === l && byPair.lh[0].b === h, `${tag}: lh pair dims`);
  ok(byPair.wh[0].a === w && byPair.wh[0].b === h, `${tag}: wh pair dims`);

  /* the 24 face corners are exactly the 8 box corners, each used 3 times */
  const tally = new Map();
  for (const f of F6) for (const p of faceQuad(f, 0, l, w, h)) {
    const k = p.map((x) => x.toFixed(6)).join('|');
    tally.set(k, (tally.get(k) || 0) + 1);
  }
  ok(tally.size === 8, `${tag}: faces must meet at exactly 8 vertices, got ${tally.size}`);
  for (const [k, n] of tally) ok(n === 3, `${tag}: vertex ${k} touched by ${n} faces, expected 3`);
}

/* ---- 4. EDGES — three groups of four ------------------------------------ */
banner('4) EDGES — 12 edges, 4 per axis, adjacency, hidden-line data');
ok(EDGES.length === 12, 'must be 12 edges');
for (const ax of ['x', 'y', 'z'])
  ok(EDGES.filter((e) => e.axis === ax).length === 4, `axis ${ax} must have 4 parallel edges`);
const edgeKeys = new Set(EDGES.map((e) => [e.a, e.b].sort((x, y) => x - y).join('-')));
ok(edgeKeys.size === 12, 'edges must be distinct');
/* every corner sits on exactly 3 edges */
const corn = new Map();
for (const e of EDGES) for (const i of [e.a, e.b]) corn.set(i, (corn.get(i) || 0) + 1);
ok(corn.size === 8, 'edges must touch all 8 corners');
for (const [i, n] of corn) ok(n === 3, `corner ${i} on ${n} edges, expected 3`);

for (const [l, w, h] of BOXES) {
  const C = boxCorners(l / 2, h / 2, w / 2);
  const F6 = boxFaces(l, w, h);
  const tag = `${l}×${w}×${h}`;
  const onFace = (f, p) => {
    /* p lies on face f iff it is on f's plane and within its extent */
    const O = f.o;
    const d = sub(p, O);
    if (!approx(dot3(d, f.n), 0)) return false;
    const su = dot3(d, norm3(f.u)), sv = dot3(d, norm3(f.v));
    return su >= -1e-9 && su <= f.a + 1e-9 && sv >= -1e-9 && sv <= f.b + 1e-9;
  };
  for (const e of EDGES) {
    const A = C[e.a], B = C[e.b];
    const d = sub(B, A);
    /* the edge is axis-aligned along the axis it claims */
    const idx = e.axis === 'x' ? 0 : e.axis === 'y' ? 1 : 2;
    for (let k = 0; k < 3; k++)
      if (k !== idx) ok(approx(d[k], 0), `${tag}: edge ${e.a}-${e.b} not aligned to ${e.axis}`);
    /* and its length is the dimension that axis carries */
    const want = e.axis === 'x' ? l : e.axis === 'y' ? h : w;
    ok(approx(len3(d), want), `${tag}: ${e.axis}-edge must be ${want} long, got ${len3(d)}`);
    /* the two named faces genuinely meet along it — this is what the
       hidden-line test relies on, so it must be exactly right */
    const fa = F6.find((f) => f.key === e.fa), fb = F6.find((f) => f.key === e.fb);
    ok(!!fa && !!fb, `${tag}: edge names an unknown face`);
    ok(onFace(fa, A) && onFace(fa, B), `${tag}: edge ${e.a}-${e.b} not on face ${e.fa}`);
    ok(onFace(fb, A) && onFace(fb, B), `${tag}: edge ${e.a}-${e.b} not on face ${e.fb}`);
    ok(e.fa !== e.fb, `${tag}: edge ${e.a}-${e.b} names one face twice`);
    /* and NO OTHER face contains it — so {fa, fb} is the complete adjacency */
    const holders = F6.filter((f) => onFace(f, A) && onFace(f, B)).map((f) => f.key).sort();
    ok(holders.join(',') === [e.fa, e.fb].sort().join(','),
      `${tag}: edge ${e.a}-${e.b} adjacency is ${holders} but declared ${[e.fa, e.fb]}`);
  }
}

/* the "4 parallel edges" highlight the lesson promises */
banner('5) AXIS_OF_FOCUS — each dimension lights exactly 4 edges');
/* NB: AXIS_OF_FOCUS has a key literally named "length", so `.length` is 'x' —
   probe the shape with Object.keys, never with .length. */
ok(!Array.isArray(AXIS_OF_FOCUS), 'AXIS_OF_FOCUS should be a map, not an array');
ok(Object.keys(AXIS_OF_FOCUS).sort().join(',') === 'height,length,width', 'AXIS_OF_FOCUS keys');
for (const [foc, ax, dim] of [['length', 'x', 'l'], ['width', 'z', 'w'], ['height', 'y', 'h']]) {
  ok(AXIS_OF_FOCUS[foc] === ax, `focus ${foc} must map to axis ${ax}`);
  ok(EDGES.filter((e) => e.axis === ax).length === 4, `focus ${foc} must light 4 edges`);
  const p = PARAMS.find((x) => x.key === dim);
  ok(!!p, `dial ${dim} missing for focus ${foc}`);
  const st = STEPS.find((s) => s.focus === foc);
  ok(!!st && STEPS.indexOf(st) === p.unlock, `step "${foc}" must be the one that unlocks dial ${dim}`);
}
/* steps that are not a dimension step must not light edges */
for (const s of STEPS) if (!['length', 'width', 'height'].includes(s.focus))
  ok(AXIS_OF_FOCUS[s.focus] === undefined, `focus ${s.focus} must not claim an axis`);

/* ---- 6. hidden-line rule: a generic view shows 3 faces and 9 edges ------- */
banner('6) hidden-line rule — 3 visible faces ⟹ 9 visible edges, 3 hidden at one corner');
let generic = 0;
for (let t = 0; t < 4000; t++) {
  const yaw = (t * 0.61803398875 * Math.PI * 2) % (Math.PI * 2);
  const pitch = -1.3 + (2.6 * ((t * 0.3819660113) % 1));
  const rot = makeRotate(yaw, pitch);
  const [l, w, h] = BOXES[t % BOXES.length];
  const F6 = boxFaces(l, w, h);
  const front = {};
  let nFront = 0;
  let degenerate = false;
  for (const f of F6) {
    const z = rot(f.n)[2];
    if (Math.abs(z) < 1e-6) degenerate = true;
    front[f.key] = z > 0;
    if (z > 0) nFront++;
  }
  if (degenerate) continue;
  generic++;
  ok(nFront === 3, `generic view must show exactly 3 faces, showed ${nFront}`);
  const vis = EDGES.filter((e) => front[e.fa] || front[e.fb]);
  ok(vis.length === 9, `generic view must show 9 edges, showed ${vis.length}`);
  /* the 3 hidden edges must all meet at a single corner — the far vertex */
  const hidden = EDGES.filter((e) => !(front[e.fa] || front[e.fb]));
  const cnt = new Map();
  for (const e of hidden) for (const i of [e.a, e.b]) cnt.set(i, (cnt.get(i) || 0) + 1);
  const shared = [...cnt.entries()].filter(([, n]) => n === 3);
  ok(hidden.length === 3 && shared.length === 1, 'the 3 hidden edges must meet at one hidden corner');
  /* each hidden edge group covers all three axes */
  ok(new Set(hidden.map((e) => e.axis)).size === 3, 'the hidden edges must span all three axes');
}
console.log(`   ${generic} generic viewing angles tested`);

/* ---- 7. the bloom: a pure translation, so area is INVARIANT -------------- */
banner('7) explode — the bloom translates faces only: shape, congruence and SA are invariant');
for (const [l, w, h] of BOXES) {
  const tag = `${l}×${w}×${h}`;
  const SA = facts(l, w, h).surface;
  const F6 = boxFaces(l, w, h);

  /* at e = 0 the 24 face corners collapse exactly onto the 8 box corners */
  const boxSet = new Set(boxCorners(l / 2, h / 2, w / 2).map((p) => p.map((x) => x.toFixed(6)).join('|')));
  for (const f of F6) for (const p of faceQuad(f, 0, l, w, h))
    ok(boxSet.has(p.map((x) => x.toFixed(6)).join('|')), `${tag}: at e=0 face corner left the box`);

  for (const e of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
    let areaSum = 0;
    for (const f of F6) {
      const q = faceQuad(f, e, l, w, h);
      /* the quad is still the same rectangle — the bloom never resizes a face */
      const u = sub(q[1], q[0]), v = sub(q[3], q[0]);
      ok(approx(len3(u), f.a), `${tag} e=${e}: |u| changed under explode`);
      ok(approx(len3(v), f.b), `${tag} e=${e}: |v| changed under explode`);
      ok(approx(dot3(u, v), 0), `${tag} e=${e}: face stopped being a rectangle`);
      areaSum += len3(cross3(u, v));
    }
    /* SURFACE AREA IS CONSERVED BY THE BLOOM — this is why the exploded view is
       an honest picture of SA (the analogue of CylinderLab's invariant arc) */
    ok(approx(areaSum, SA), `${tag} e=${e}: Σ area = ${areaSum}, expected ${SA}`);

    /* opposite faces stay parallel, congruent, and move apart symmetrically */
    const byPair = {};
    for (const f of F6) (byPair[f.pair] ||= []).push(f);
    for (const [key, fs] of Object.entries(byPair)) {
      const [p, q] = fs;
      const cP = mul(faceQuad(p, e, l, w, h).reduce((s, x) => add(s, x), [0, 0, 0]), 0.25);
      const cQ = mul(faceQuad(q, e, l, w, h).reduce((s, x) => add(s, x), [0, 0, 0]), 0.25);
      const gap = Math.abs(dot3(sub(cP, cQ), p.n));
      const base = key === 'lw' ? h : key === 'lh' ? w : l;
      ok(approx(gap, base + 2 * offOf(e, l, w, h)), `${tag} e=${e}: pair ${key} separation`);
      /* they separate along the normal ONLY — no sideways drift, so the twins
         stay lined up and visibly identical */
      const d = sub(cP, cQ);
      const along = mul(p.n, dot3(d, p.n));
      ok(approx(len3(sub(d, along)), 0), `${tag} e=${e}: pair ${key} drifted sideways`);
    }
  }
  /* the bloom is monotone: faces only ever move outward as e grows */
  let prevOff = -1;
  for (let e = 0; e <= 1.0001; e += 0.05) {
    const o = offOf(e, l, w, h);
    ok(o > prevOff - 1e-12, `${tag}: explode offset must increase with e`);
    prevOff = o;
  }
  ok(approx(offOf(0, l, w, h), 0), `${tag}: e=0 must not move any face`);
  ok(offOf(1, l, w, h) > 0.5 * Math.max(l, w, h), `${tag}: e=1 must clear the box`);
}

/* ---- 8. accentOf — the one-accent discipline, by the numbers ------------ */
banner('8) accentOf — exactly the taught faces are carmine');
const PAIR_SIZE = { lw: 2, lh: 2, wh: 2, all: 6 };
for (const [l, w, h] of BOXES.slice(0, 30)) {
  const F6 = boxFaces(l, w, h);
  for (const s of STEPS) {
    for (const sel of ['lw', 'lh', 'wh', 'all']) {
      const n = F6.filter((f) => accentOf(s.focus, sel, f)).length;
      if (s.focus === 'pairs' || s.focus === 'surface') {
        ok(n === PAIR_SIZE[sel], `focus ${s.focus}/${sel}: ${n} accented, expected ${PAIR_SIZE[sel]}`);
        if (sel !== 'all') {
          const hot = F6.filter((f) => accentOf(s.focus, sel, f));
          ok(hot.every((f) => f.pair === sel), `focus ${s.focus}/${sel}: wrong faces lit`);
          ok(hot[0].a === hot[1].a && hot[0].b === hot[1].b, `${sel}: the lit pair must be congruent`);
        }
      } else {
        ok(n === 0, `focus ${s.focus} must not fill any face carmine (accent lives on the edges)`);
      }
    }
  }
}
/* the lens buttons offer exactly the three pairs plus the whole skin */
ok(PAIR_LENSES.map((p) => p.key).join(',') === 'lw,lh,wh,all', 'lens set wrong');

/* ---- 9. simplifySqrt / radStr / rootLabel -------------------------------- */
banner('9) exact radicals — simplifySqrt over n = 1..20000');
for (let n = 1; n <= 20000; n++) {
  const { coef, rad } = simplifySqrt(n);
  ok(coef * coef * rad === n, `simplifySqrt(${n}) = ${coef}√${rad} does not reconstruct n`);
  ok(approx(coef * Math.sqrt(rad), Math.sqrt(n), 1e-9), `simplifySqrt(${n}) value mismatch`);
  /* rad must be square-free */
  let sqFree = true;
  for (let p = 2; p * p <= rad; p++) if (rad % (p * p) === 0) sqFree = false;
  ok(sqFree, `simplifySqrt(${n}) radicand ${rad} is not square-free`);
  /* the string form is a bare integer exactly when n is a perfect square */
  const isSq = Number.isInteger(Math.sqrt(n));
  ok(/^\d+$/.test(radStr(n)) === isSq, `radStr(${n}) = "${radStr(n)}" but perfect-square = ${isSq}`);
  if (isSq) ok(radStr(n) === String(Math.round(Math.sqrt(n))), `radStr(${n}) should be exact`);
}
ok(radStr(29) === '√29', 'radStr(29)');
ok(radStr(8) === '2√2', 'radStr(8)');
ok(radStr(12) === '2√3', 'radStr(12)');
ok(radStr(25) === '5', 'radStr(25)');
ok(radStr(1) === '1', 'radStr(1)');
ok(rootLabel(25) === '5', 'rootLabel of a perfect square must not show ≈');
ok(rootLabel(29).startsWith('√29 ≈ 5.385'), `rootLabel(29) = ${rootLabel(29)}`);
/* every box's diagonals render sanely */
for (const [l, w, h] of BOXES) {
  const F = facts(l, w, h);
  for (const nsq of [F.baseDiagSq, F.spaceDiagSq]) {
    const s = rootLabel(nsq);
    ok(typeof s === 'string' && s.length > 0 && !s.includes('NaN'), `rootLabel(${nsq}) = ${s}`);
    const { rad } = simplifySqrt(nsq);
    ok(s.includes('≈') === (rad !== 1), `rootLabel(${nsq}) ≈ handling`);
  }
}

/* ---- 10. calibration: the least-cardboard challenge ---------------------- */
banner('10) calibration — targets are fair, reachable, and the gate cannot fire falsely');
for (const P of TARGETS) {
  const { min, max, triples } = saRange(P);
  ok(triples.length >= 2, `target ${P}: needs ≥2 boxes in range, has ${triples.length}`);
  ok(max > min, `target ${P}: every box has SA ${min} — no real choice to make`);
  ok(Number.isFinite(min) && Number.isFinite(max), `target ${P}: SA range not finite`);
  /* every listed triple really has the target volume and fits the dials */
  for (const [a, b, c] of triples) {
    ok(volOf(a, b, c) === P, `target ${P}: triple ${a}×${b}×${c} has wrong volume`);
    ok(a <= b && b <= c, `target ${P}: triple ${a}×${b}×${c} not sorted`);
    ok(a >= 1 && c <= MAXD, `target ${P}: triple ${a}×${b}×${c} out of dial range`);
  }
  /* the minimum is actually achieved by some reachable box */
  const winners = triples.filter(([a, b, c]) => saOf(a, b, c) === min);
  ok(winners.length >= 1, `target ${P}: minimum SA ${min} unreachable`);
  /* triplesFor must find EVERY box with that volume — cross-check by brute force */
  const brute = new Set();
  for (const [l, w, h] of BOXES) if (volOf(l, w, h) === P) brute.add([l, w, h].slice().sort((x, y) => x - y).join('-'));
  const found = new Set(triples.map((t) => t.join('-')));
  ok(brute.size === found.size, `target ${P}: triplesFor found ${found.size}, brute force ${brute.size}`);
  for (const k of brute) ok(found.has(k), `target ${P}: triplesFor missed ${k}`);
  /* the thriftiest box is the most cube-like one — the moral the payoff claims */
  const spread = ([a, , c]) => c - a;
  const best = winners[0];
  for (const t of triples)
    ok(spread(best) <= spread(t), `target ${P}: winner ${best} is less cube-like than ${t}`);
}
ok(new Set(TARGETS).size === TARGETS.length, 'TARGETS has duplicates');

banner('11) the meter — exhaustive over 216 boxes × every target');
for (const P of TARGETS) {
  const { min, max } = saRange(P);
  for (const [l, w, h] of BOXES) {
    const pct = matchPercent(l, w, h, P);
    const cal = isCalibrated(l, w, h, P);
    const V = volOf(l, w, h), SA = saOf(l, w, h);
    const tag = `${l}×${w}×${h} vs ${P}`;

    ok(pct >= 0 && pct <= 100, `${tag}: meter out of range (${pct})`);
    ok(Number.isFinite(pct), `${tag}: meter not finite`);

    /* THE SAFETY PROPERTY: 100% and the stamp are the same event, and both
       require exact integer success. A false CALIBRATED is impossible. */
    ok((pct === 100) === cal, `${tag}: meter 100% and CALIBRATED must coincide`);
    ok(cal === (V === P && SA === min), `${tag}: gate is not the exact integer test`);
    if (cal) ok(V === P && SA === min, `${tag}: calibrated with V=${V}, SA=${SA}`);

    if (V !== P) {
      ok(pct < 60, `${tag}: wrong volume must stay under 60%, got ${pct}`);
      ok(!cal, `${tag}: wrong volume must never calibrate`);
    } else {
      ok(pct >= 60 - 1e-9, `${tag}: right volume must be ≥ 60%, got ${pct}`);
      if (SA === max) ok(approx(pct, 60), `${tag}: worst skin at the right volume must read 60%`);
      if (SA === min) ok(approx(pct, 100), `${tag}: best skin must read 100%`);
    }
  }
  /* strictly monotone: at the right volume, less cardboard always reads higher */
  const at = BOXES.filter(([l, w, h]) => volOf(l, w, h) === P)
    .map(([l, w, h]) => ({ sa: saOf(l, w, h), pct: matchPercent(l, w, h, P) }));
  for (const a of at) for (const b of at) {
    if (a.sa < b.sa) ok(a.pct > b.pct, `target ${P}: SA ${a.sa} must beat SA ${b.sa}`);
    if (a.sa === b.sa) ok(approx(a.pct, b.pct), `target ${P}: equal SA must read equally`);
  }
  /* the challenge always starts un-matched (it resets to 1×1×1) */
  ok(!isCalibrated(1, 1, 1, P), `target ${P}: 1×1×1 must not start calibrated`);
  ok(matchPercent(1, 1, 1, P) < 60, `target ${P}: 1×1×1 must start under 60%`);
}

/* ---- 12. makeTarget ----------------------------------------------------- */
banner('12) makeTarget — always valid, never an immediate repeat');
const realRandom = Math.random;
let seed = 987654321;
Math.random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
let prev = null;
for (let n = 0; n < 5000; n++) {
  const t = makeTarget(prev);
  ok(TARGETS.includes(t.goal), `makeTarget produced ${t.goal}, not in TARGETS`);
  if (prev) ok(t.goal !== prev.goal, `makeTarget repeated ${t.goal}`);
  prev = t;
}
Math.random = realRandom;

/* ---- 13. the lesson's own arithmetic ------------------------------------ */
banner('13) every number the lesson says out loud, recomputed from the formulas');
const D = facts(START.l, START.w, START.h); // the box the questions describe: 4 × 3 × 2
ok(START.l === 4 && START.w === 3 && START.h === 2, 'the lesson text assumes the 4×3×2 start box');
ok(D.lw === 12, 'floor area 4×3 must be 12');
ok(START.l + START.w === 7, 'the "7" distractor must be l + w');
ok(2 * (START.l + START.w) === 14, 'the "14" distractor must be the floor perimeter');
ok(D.lh === 8, 'front face 4×2 must be 8');
ok(D.wh === 6, 'side face 3×2 must be 6');
ok(D.surface === 52, `SA of 4×3×2 must be 52, got ${D.surface}`);
ok(2 * (D.lw + D.lh + D.wh) === 52, 'SA distractor arithmetic');
ok(D.lw + D.lh + D.wh === 26, 'the "26" distractor must be the un-doubled sum');
ok(D.volume === 24, 'the "24" distractor must be the volume');
ok(D.baseDiagSq === 25 && D.baseDiag === 5, 'the floor diagonal of 4×3 must be exactly 5');
ok(D.spaceDiagSq === 29, 'the space diagonal squared must be 29');
ok(radStr(29) === '√29' && approx(D.spaceDiag, 5.3851648, 1e-6), 'space diagonal must be √29 ≈ 5.385');
ok(START.l + START.w + START.h === 9, 'the "9" distractor must be l + w + h');
ok(D.spaceDiag < 9, 'the diagonal must actually be shorter than the edge path (the misconception)');
/* the correct choice string must contain the number the formula produces */
const choiceOf = (foc) => { const s = STEPS.find((x) => x.focus === foc); return s.choices[s.answer]; };
ok(choiceOf('intro') === '6', 'intro answer must be 6 faces');
ok(choiceOf('length') === '4', 'length answer must be 4 edges');
ok(choiceOf('width').includes('12'), 'width answer must be 12 square units');
ok(choiceOf('height') === 'l and h', 'height answer must be l and h');
ok(choiceOf('pairs') === '4 by 2', 'pairs answer must repeat the front face');
ok(choiceOf('surface').includes(String(D.surface)), 'surface answer must be the computed SA');
ok(choiceOf('diagonal').includes('√29'), 'diagonal answer must be √29');
/* the distractors must be wrong — no accidental duplicates of the right answer */
for (const s of STEPS) {
  if (s.calib) continue;
  ok(new Set(s.choices).size === s.choices.length, `step "${s.focus}" has duplicate choices`);
}
/* the surface step's distractors must be exactly the two named misconceptions */
const surf = STEPS.find((s) => s.focus === 'surface');
ok(surf.choices.some((c) => c.includes(String(D.volume))), 'surface step must offer the volume trap');
ok(surf.choices.some((c) => c.includes('26')), 'surface step must offer the forgot-to-double trap');

/* ---- 13b. the space-diagonal FIGURE: right triangles, and an honest picture -
   The step claims d is the longest straight line in the box. If the diagonal we
   draw happens to point at the camera it projects to a stub and the picture
   contradicts the words — so the choice of corners is a correctness matter.
   MIRRORED from draw(): the figure is PA=C[4] →PB=C[5] →PC=C[1] →PD=C[2]. */
banner('13b) the space-diagonal figure — right angles, and it must LOOK longest');
/* the default camera, read straight out of the source so it cannot drift */
const camM = SRC.match(/rotRef = useRef\(\{\s*yaw:\s*(-?[\d.]+),\s*pitch:\s*(-?[\d.]+)/);
ok(!!camM, 'could not read the default orbit out of the source');
const [defYaw, defPitch] = [parseFloat(camM[1]), parseFloat(camM[2])];
const figM = SRC.match(/const PA = C\[(\d)\], PB = C\[(\d)\], PC = C\[(\d)\], PD = C\[(\d)\]/);
ok(!!figM, 'could not read the diagonal figure corners out of the source');
const [iA, iB, iC, iD] = figM.slice(1, 5).map(Number);

for (const [l, w, h] of BOXES) {
  const C = boxCorners(l / 2, h / 2, w / 2);
  const PA = C[iA], PB = C[iB], PC = C[iC], PD = C[iD];
  const F = facts(l, w, h);
  const tag = `${l}×${w}×${h}`;
  /* the two legs really are l and w, and they meet at a right angle */
  ok(approx(len3(sub(PB, PA)), l), `${tag}: figure leg PA→PB must be l`);
  ok(approx(len3(sub(PC, PB)), w), `${tag}: figure leg PB→PC must be w`);
  ok(approx(dot3(sub(PA, PB), sub(PC, PB)), 0), `${tag}: floor triangle must be right-angled at PB`);
  /* its hypotenuse is the floor diagonal */
  ok(approx(len3(sub(PC, PA)), F.baseDiag), `${tag}: PA→PC must be √(l²+w²)`);
  /* the climb is vertical, of length h, and square to the floor diagonal */
  ok(approx(len3(sub(PD, PC)), h), `${tag}: figure climb PC→PD must be h`);
  ok(approx(dot3(sub(PA, PC), sub(PD, PC)), 0), `${tag}: upright triangle must be right-angled at PC`);
  /* and the hypotenuse of THAT is the space diagonal */
  ok(approx(len3(sub(PD, PA)), F.spaceDiag), `${tag}: PA→PD must be √(l²+w²+h²)`);
  /* Pythagoras twice, exactly */
  ok(approx(len3(sub(PC, PA)) ** 2 + h * h, len3(sub(PD, PA)) ** 2), `${tag}: d² = (l²+w²) + h²`);

  /* THE PICTURE MUST NOT LIE: at the default view the drawn diagonal has to
     project longer than every edge of the box, or the student sees a "longest
     line" that looks short. (The 0–6 diagonal fails this badly — it shows at
     ~28% of its length — which is why the figure uses 4–2.) */
  const rot = makeRotate(defYaw, defPitch);
  const flat = (p, q) => { const A = rot(p), B = rot(q); return Math.hypot(A[0] - B[0], A[1] - B[1]); };
  const dProj = flat(PA, PD);
  /* A loose sanity floor against a camera-pointing diagonal (the 0–6 choice
     shows at 0.28×). The 4–2 choice never drops below ~0.82×, and only for
     degenerate slabs like 6×1×6. The check that actually carries the lesson's
     claim is the per-edge comparison below, which holds for every box. */
  ok(dProj > 0.8 * F.spaceDiag,
    `${tag}: drawn diagonal projects at ${(dProj / F.spaceDiag).toFixed(2)}× — it points at the camera`);
  for (const e of EDGES) {
    const eProj = flat(C[e.a], C[e.b]);
    ok(dProj > eProj, `${tag}: the diagonal must LOOK longer than every edge (edge ${e.a}-${e.b})`);
  }
}

/* ---- 14. distinctness from the sibling labs ----------------------------- */
banner('14) distinctness — this lab must not re-teach VolumeLab or CubeLab');
ok(!STEPS.some((s) => s.focus === 'volume'), 'volume is VolumeLab’s centrepiece, not this lab’s');
ok(!/unfold|net/i.test(STEPS.map((s) => s.title).join(' ')), 'the net unfold is CubeLab’s centrepiece');
ok(STEPS.some((s) => s.focus === 'pairs'), 'the three congruent pairs must be a step');
ok(STEPS.some((s) => s.focus === 'surface'), 'surface area must be a step');
ok(STEPS.some((s) => s.focus === 'diagonal'), 'the space diagonal must be a step');
ok(PARAMS.some((p) => p.key === 'explode'), 'the bloom is this lab’s signature mechanic');
/* the capstone must be the least-cardboard problem, not "hit a volume" */
ok(/least|cardboard|smallest/i.test(STEPS[STEPS.length - 1].title + STEPS[STEPS.length - 1].body),
  'the capstone must be the least-cardboard challenge');

/* ---- summary ------------------------------------------------------------ */
console.log('\n' + (fails === 0
  ? `ALL GOOD — ${checks} checks passed, 0 failures.`
  : `FAILURES — ${fails} of ${checks} checks failed.`));
process.exit(fails === 0 ? 0 : 1);
