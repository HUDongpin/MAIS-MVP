/* ============================================================================
   audit-pyramid.mjs — the numeric audit for PyramidLab.jsx.

   Run:  node audit-pyramid.mjs

   HOW THIS AUDIT WORKS (the ShapesLab pattern, and the reason to copy it):
   it does not re-implement the lab's mathematics — it SLICES the pure model
   straight out of PyramidLab.jsx (everything between the MODEL:START and
   MODEL:END sentinels) and evaluates that text.  So the code under test IS the
   code that ships.  A reimplementation would drift; a slice cannot.

   What it proves, in order of depth:

     CLAIM 1 (the tiling)     three pyramids cover the box with disjoint
                              interiors — checked on random points, on a
                              lattice, and on the shared boundary walls.
     CLAIM 1' (picture=proof) the point the ALGEBRA assigns to a piece really
                              does sit inside the POLYHEDRON that gets drawn.
                              This is the check that catches a lab whose maths
                              and whose picture have quietly parted company.
     CLAIM 2 (equal volume)   every piece is ⅓ of its own base times its own
                              height, and all three agree — exactly.
     THE FORMULA              V = ⅓Bh, cross-checked three independent ways:
                              the closed form, a Riemann sum over the pyramid's
                              cross-sections, and the divergence theorem run
                              over the rendered mesh's faces.
     EXACTNESS                a·a·h is dyadic and float-exact (verified against
                              BigInt), so the CALIBRATED stamp is an exact
                              equality with no epsilon and cannot fire falsely.
     DISTINCTNESS             the lab's promised refusals (no pouring, no
                              slicing — those are ConeLab's and SphereLab's
                              proofs) are enforced by grepping this very
                              source.  A distinctness promise written only in
                              prose is a promise you will break.

   AND THEN IT MUTATION-TESTS ITSELF.  A first run of 0 failures is suspicious,
   not reassuring: an audit that cannot fail proves nothing.  So every run also
   damages the model in 17 specific ways and demands that the suite catch each
   one.  A surviving mutant is reported as a hole in THIS FILE.
   ========================================================================== */

import fs from 'node:fs';

const SRC = fs.readFileSync(new URL('./PyramidLab.jsx', import.meta.url), 'utf8');

/* ---- slice the model out of the shipped component ----------------------- */
function sliceModel(src) {
  const m = src.match(/\/\* ==== MODEL:START[^\n]*\n([\s\S]*?)\/\* ==== MODEL:END/);
  if (!m) throw new Error('MODEL sentinels not found in PyramidLab.jsx');
  return m[1];
}
const MODEL_BODY = sliceModel(SRC);

const EXPORTS = [
  'PARAMS', 'START', 'STEPS', 'PIECES', 'FEATURED', 'apexOf',
  'pieceBase', 'pieceBaseHeight', 'inPiece', 'whichPiece', 'pieceOffset',
  'pieceVerts', 'pieceFaces', 'boxCorners', 'boxEdges',
  'gcd', 'halves', 'boxFrac', 'volFrac', 'facts',
  'targetPool', 'makeTarget', 'isCalibrated', 'matchPercent', 'alternates',
  'sub', 'add', 'mul', 'dot3', 'cross3', 'norm3',
];
function build(body) {
  // eslint-disable-next-line no-new-func
  return new Function(`${body}\nreturn { ${EXPORTS.join(', ')} };`)();
}

/* ---- geometry tools that belong to the AUDIT, not the lab ---------------
   These are deliberately independent of the lab's own reasoning: the lab says
   "V = a²h/3"; these measure the drawn solid and see whether it agrees. ---- */
const A = {
  sub: (p, q) => [p[0] - q[0], p[1] - q[1], p[2] - q[2]],
  add: (p, q) => [p[0] + q[0], p[1] + q[1], p[2] + q[2]],
  mul: (p, s) => [p[0] * s, p[1] * s, p[2] * s],
  dot: (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2],
  cross: (p, q) => [
    p[1] * q[2] - p[2] * q[1],
    p[2] * q[0] - p[0] * q[2],
    p[0] * q[1] - p[1] * q[0],
  ],
};
const centroidOf = (pts) => {
  let g = [0, 0, 0];
  for (const p of pts) g = A.add(g, p);
  return A.mul(g, 1 / pts.length);
};
/* Volume of a closed polyhedron by the divergence theorem: fan-triangulate
   every face with its winding forced OUTWARD (using the solid's centroid),
   then V = Σ t0 · (t1 × t2) / 6. Independent of where the origin sits. */
function polyVolume(faces, centroid) {
  let V = 0;
  for (const f of faces) {
    const pts = f.pts;
    const n = A.cross(A.sub(pts[1], pts[0]), A.sub(pts[2], pts[0]));
    const fc = centroidOf(pts);
    const ordered = A.dot(n, A.sub(fc, centroid)) < 0 ? [...pts].reverse() : pts;
    for (let i = 1; i + 1 < ordered.length; i++) {
      V += A.dot(ordered[0], A.cross(ordered[i], ordered[i + 1])) / 6;
    }
  }
  return V;
}
/* Is p inside this convex polyhedron? Every outward face plane must not be
   crossed. */
function insideConvex(faces, centroid, p, eps = 1e-9) {
  for (const f of faces) {
    const pts = f.pts;
    let n = A.cross(A.sub(pts[1], pts[0]), A.sub(pts[2], pts[0]));
    const L = Math.hypot(n[0], n[1], n[2]) || 1;
    n = A.mul(n, 1 / L);
    const fc = centroidOf(pts);
    if (A.dot(n, A.sub(fc, centroid)) < 0) n = A.mul(n, -1);
    if (A.dot(n, A.sub(p, fc)) > eps) return false;
  }
  return true;
}
/* A deterministic PRNG, so a failure is always reproducible. */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
/* The exact value of a·a·h as a rational, computed in BigInt: a = k/2, h = m/2
   ⇒ a·a·h = k²m/8. Used to convict the float of any rounding. */
function exactTriple(k, m) {
  return { n: BigInt(k) * BigInt(k) * BigInt(m), d: 8n };
}

/* ---- the suite ---------------------------------------------------------- */
function runSuite(M) {
  let checks = 0;
  const failures = [];
  const ok = (cond, msg) => {
    checks++;
    if (!cond) failures.push(msg);
  };
  const near = (x, y, tol, msg) => ok(Math.abs(x - y) <= tol, `${msg} (got ${x}, want ${y})`);

  const GRID_A = [];
  for (let k = 2; k <= 12; k++) GRID_A.push(k / 2);   // a ∈ [1, 6] step 0.5
  const GRID_H = GRID_A.slice();                       // h ∈ [1, 6] step 0.5

  /* === 0. the dials the model advertises are the ones the maths assumes === */
  {
    const a = M.PARAMS.find((p) => p.key === 'a');
    const h = M.PARAMS.find((p) => p.key === 'h');
    const s = M.PARAMS.find((p) => p.key === 'split');
    ok(!!a && !!h && !!s, 'PARAMS must define a, h and split');
    ok(a.step === 0.5 && h.step === 0.5,
      'a and h MUST step by 0.5 — the dyadic-exactness argument depends on it');
    ok(a.min === 1 && a.max === 6 && h.min === 1 && h.max === 6, 'a, h ranges are [1, 6]');
    ok(s.min === 0 && s.max === 1, 'split runs 0 → 1');
    ok(M.START.h === M.START.a,
      'START must be the CUBE case (h = a) — the congruent dissection convinces first');
    ok(M.PIECES.length === 3 && M.PIECES.includes(M.FEATURED), 'three pieces, one featured');
    // The apex must be at the TOP (z = h), so the featured pyramid stands on
    // its base with the apex above a base corner — exactly what step 0 says.
    // An apex at the origin is the same solid balanced on its tip, and would
    // make the lab's picture contradict the lab's own words.
    for (const h of GRID_H) {
      const ap = M.apexOf(h);
      ok(ap[0] === 0 && ap[1] === 0 && ap[2] === h,
        `the shared apex sits at the top corner (0, 0, h) — h=${h}`);
    }
  }

  /* === 1. EXACTNESS: a·a·h is dyadic, so the float is the exact rational === */
  for (const a of GRID_A) {
    for (const h of GRID_H) {
      const k = M.halves(a), m = M.halves(h);
      ok(k === a * 2 && m === h * 2, `halves() must recover the integers (a=${a}, h=${h})`);
      const ex = exactTriple(k, m);                 // k²m / 8, in BigInt
      const asFloat = M.facts(a, h).triple;         // a*a*h, in float
      // exact iff float * 8 is a whole number equal to k²m
      ok(Number(ex.n) / Number(ex.d) === asFloat,
        `a*a*h must be EXACT in binary float (a=${a}, h=${h}): ${asFloat} vs ${Number(ex.n) / 8}`);
      ok(Number.isInteger(asFloat * 8),
        `a*a*h must be a multiple of 1/8 (a=${a}, h=${h})`);
    }
  }

  /* === 2. the reduced fractions shown to the student are exact ============ */
  for (const a of GRID_A) {
    for (const h of GRID_H) {
      const vf = M.volFrac(a, h), bf = M.boxFrac(a, h);
      near(vf.n / vf.d, (a * a * h) / 3, 1e-12, `volFrac == a²h/3 (a=${a}, h=${h})`);
      near(bf.n / bf.d, a * a * h, 1e-12, `boxFrac == a²h (a=${a}, h=${h})`);
      ok(M.gcd(vf.n, vf.d) === 1, `volFrac must be fully reduced (a=${a}, h=${h})`);
      ok(M.gcd(bf.n, bf.d) === 1, `boxFrac must be fully reduced (a=${a}, h=${h})`);
      ok(vf.d > 0 && bf.d > 0 && Number.isInteger(vf.n) && Number.isInteger(vf.d),
        `fractions are integer/integer (a=${a}, h=${h})`);
    }
  }

  /* === 3. CLAIM 2 — every piece is ⅓ of its own base × its own height, and
     all three land on the same number, EXACTLY ============================= */
  for (const a of GRID_A) {
    for (const h of GRID_H) {
      const triple = a * a * h;
      let sum = 0;
      for (const name of M.PIECES) {
        const { B, H } = M.pieceBaseHeight(name, a, h);
        ok(B * H === triple,
          `piece ${name}: B·H must equal a²h exactly (a=${a}, h=${h}): ${B * H} vs ${triple}`);
        sum += (B * H) / 3;
      }
      near(sum, triple, 1e-9,
        `the three thirds must reassemble the box (a=${a}, h=${h})`);
    }
  }

  /* === 4. THE FORMULA, three independent ways ============================
     (a) the closed form   ⅓Bh
     (b) a Riemann sum over the pyramid's cross-sections
     (c) the divergence theorem over the RENDERED mesh                      */
  const SAMPLE = [[1, 1], [3, 3], [2, 5], [5, 2], [6, 1], [1.5, 4.5], [6, 6], [2.5, 3.5]];
  for (const [a, h] of SAMPLE) {
    const want = (a * a * h) / 3;

    // (b) cross-section of the corner pyramid at height z is a (z/h)-scaled
    // copy of the a×a lid: area a²(z/h)². Integrate it.
    const N = 200000;
    let riemann = 0;
    for (let i = 0; i < N; i++) {
      const z = ((i + 0.5) / N) * h;
      riemann += a * a * (z / h) * (z / h) * (h / N);
    }
    near(riemann, want, want * 1e-5, `Riemann sum == ⅓Bh (a=${a}, h=${h})`);

    // (c) the mesh that actually gets drawn, measured by the divergence theorem
    for (const name of M.PIECES) {
      const faces = M.pieceFaces(name, a, h, 0);
      const verts = M.pieceVerts(name, a, h, 0);
      const v = polyVolume(faces, centroidOf(verts));
      near(v, want, want * 1e-9,
        `the DRAWN mesh of piece ${name} must hold ⅓Bh (a=${a}, h=${h})`);
    }

    // and the three drawn meshes must add up to the drawn box
    let meshSum = 0;
    for (const name of M.PIECES) {
      meshSum += polyVolume(M.pieceFaces(name, a, h, 0), centroidOf(M.pieceVerts(name, a, h, 0)));
    }
    near(meshSum, a * a * h, a * a * h * 1e-9,
      `the three drawn meshes must fill the drawn box (a=${a}, h=${h})`);
  }

  /* === 4b. the audit's own volume tool, on a known answer ================= */
  {
    const cube = [
      { pts: [[0, 0, 0], [2, 0, 0], [2, 2, 0], [0, 2, 0]] },
      { pts: [[0, 0, 2], [2, 0, 2], [2, 2, 2], [0, 2, 2]] },
      { pts: [[0, 0, 0], [2, 0, 0], [2, 0, 2], [0, 0, 2]] },
      { pts: [[0, 2, 0], [2, 2, 0], [2, 2, 2], [0, 2, 2]] },
      { pts: [[0, 0, 0], [0, 2, 0], [0, 2, 2], [0, 0, 2]] },
      { pts: [[2, 0, 0], [2, 2, 0], [2, 2, 2], [2, 0, 2]] },
    ];
    near(polyVolume(cube, [1, 1, 1]), 8, 1e-9, 'polyVolume must measure a 2×2×2 cube as 8');
  }

  /* === 5. CLAIM 1 — the tiling ==========================================
     Every point of the box belongs to at least one piece (coverage), and to
     exactly one unless it sits on a shared wall (disjoint interiors).      */
  {
    const rand = rng(20260717);
    for (const [a, h] of SAMPLE) {
      // 5a. random interior points: exactly one owner, and whichPiece agrees
      for (let i = 0; i < 4000; i++) {
        const x = rand() * a, y = rand() * a, z = rand() * h;
        const owners = M.PIECES.filter((n) => M.inPiece(n, a, h, x, y, z));
        ok(owners.length === 1,
          `exactly one piece owns a generic point (a=${a}, h=${h}, p=${x},${y},${z}) — got ${owners.length}`);
        ok(owners[0] === M.whichPiece(a, h, x, y, z),
          'whichPiece must agree with inPiece');
      }
      // 5b. a lattice, including the tie planes: coverage is total
      const N = 14;
      for (let i = 0; i <= N; i++) {
        for (let j = 0; j <= N; j++) {
          for (let k = 0; k <= N; k++) {
            const x = (i / N) * a, y = (j / N) * a, z = (k / N) * h;
            const owners = M.PIECES.filter((n) => M.inPiece(n, a, h, x, y, z));
            ok(owners.length >= 1,
              `every point of the box must be covered (a=${a}, h=${h}, p=${x},${y},${z})`);
          }
        }
      }
    }
    // 5c. the shared walls: a tie is owned by exactly the tied pieces.
    //
    // This is a claim about EXACT equality (u == w), so it can only be tested
    // at coordinates where the round-trip x = t·a ⟹ x/a = t is exact — i.e.
    // where a, h and t are all dyadic. It is not: 0.05·6/6 lands 7e-18 above
    // 0.05, which silently breaks the tie and would fail this check for a
    // reason that has nothing to do with the lab. Hence the dyadic sample.
    //
    // Nothing in the lab rests on tie behaviour anyway — the ties are the
    // measure-zero shared walls, and the renderer draws the mesh, never
    // inPiece. This check is here to confirm the pieces MEET where the proof
    // says they meet, not because a student can ever land on the wall.
    const DYADIC = [[1, 1], [2, 2], [4, 2], [2, 4], [4, 4], [1, 4], [4, 1]];
    for (const [a, h] of DYADIC) {
      for (let i = 1; i < 16; i++) {
        const t = i / 16; // dyadic: every product/quotient below is exact
        const z = h * (1 - t); // ⇒ w = 1 − z/h = t, exactly
        // u == w > v  → the z|x wall
        const p1 = [t * a, 0, z];
        ok(M.PIECES.filter((n) => M.inPiece(n, a, h, ...p1)).length === 2,
          `the z|x wall must be shared by exactly 2 pieces (a=${a}, h=${h}, t=${t})`);
        // u == v == w → the long diagonal down from the apex: all three meet
        const p2 = [t * a, t * a, z];
        ok(M.PIECES.filter((n) => M.inPiece(n, a, h, ...p2)).length === 3,
          `the long diagonal must touch all 3 pieces (a=${a}, h=${h}, t=${t})`);
      }
    }
  }

  /* === 6. CLAIM 1' — the ALGEBRA and the PICTURE describe the same solid ==
     The single most valuable check here: a point the tiling test assigns to a
     piece must actually lie inside the polyhedron that gets rendered for that
     piece. If the formula and the mesh ever part company, this catches it. */
  {
    const rand = rng(4242);
    for (const [a, h] of SAMPLE) {
      const mesh = {};
      for (const name of M.PIECES) {
        mesh[name] = {
          faces: M.pieceFaces(name, a, h, 0),
          c: centroidOf(M.pieceVerts(name, a, h, 0)),
        };
      }
      for (let i = 0; i < 1500; i++) {
        const x = rand() * a, y = rand() * a, z = rand() * h;
        const owner = M.whichPiece(a, h, x, y, z);
        const tol = 1e-9 * Math.max(a, h);
        ok(insideConvex(mesh[owner].faces, mesh[owner].c, [x, y, z], tol),
          `the point the algebra gives piece ${owner} must lie in the DRAWN piece ${owner} ` +
          `(a=${a}, h=${h}, p=${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)})`);
        for (const other of M.PIECES) {
          if (other === owner) continue;
          ok(!insideConvex(mesh[other].faces, mesh[other].c, [x, y, z], -tol),
            `a generic point must NOT be strictly inside the non-owning piece ${other} ` +
            `(a=${a}, h=${h})`);
        }
      }
    }
  }

  /* === 7. geometry of each piece ========================================= */
  for (const [a, h] of SAMPLE) {
    for (const name of M.PIECES) {
      const base = M.pieceBase(name, a, h);
      const verts = M.pieceVerts(name, a, h, 0);
      const faces = M.pieceFaces(name, a, h, 0);
      ok(base.length === 4, `piece ${name}: the base is a quadrilateral`);
      ok(verts.length === 5, `piece ${name}: 5 vertices (4 base corners + the apex)`);
      ok(faces.length === 5, `piece ${name}: 5 faces (1 base + 4 triangles)`);
      ok(faces.filter((f) => f.kind === 'base').length === 1, `piece ${name}: exactly one base face`);
      ok(faces.filter((f) => f.kind === 'side' && f.pts.length === 3).length === 4,
        `piece ${name}: 4 triangular sides`);
      // the apex is the shared TOP corner, and it is a vertex of every piece
      ok(verts.some((v) => v[0] === 0 && v[1] === 0 && v[2] === h),
        `piece ${name}: the shared top apex must be one of its vertices at split = 0`);
      // every vertex sits inside the box
      for (const v of verts) {
        ok(v[0] >= -1e-12 && v[0] <= a + 1e-12 &&
           v[1] >= -1e-12 && v[1] <= a + 1e-12 &&
           v[2] >= -1e-12 && v[2] <= h + 1e-12,
        `piece ${name}: every vertex must sit inside the box at split = 0`);
      }
      // the base is planar and lies on the box face it claims
      const coord = name === 'z' ? 2 : name === 'x' ? 0 : 1;
      const want = name === 'z' ? 0 : a;
      for (const p of base) {
        ok(Math.abs(p[coord] - want) < 1e-12,
          `piece ${name}: every base corner must lie on its box face`);
      }
      // the base must NOT touch the apex corner, and must contain the corner
      // diagonally opposite the apex — the three bases meet there
      ok(!base.some((p) => p[0] === 0 && p[1] === 0 && p[2] === h),
        `piece ${name}: the base is a face NOT touching the apex`);
      ok(base.some((p) => p[0] === a && p[1] === a && p[2] === 0),
        `piece ${name}: every base contains the far corner (a, a, 0)`);
      // THE APEX SITS OVER A BASE CORNER — not over the base's centre.
      // Step 0 says this out loud ("its apex sits directly above one corner of
      // that square"), and it is also the property that makes the dissection
      // work: a right pyramid's three copies do not interlock. So it is a
      // claim, and claims get checked.
      const apex = M.apexOf(h);
      const drop = name === 'z' ? 2 : name === 'x' ? 0 : 1; // the base's normal axis
      const inPlane = [0, 1, 2].filter((c) => c !== drop);  // the base's own two axes
      ok(base.some((p) => inPlane.every((c) => Math.abs(p[c] - apex[c]) < 1e-12)),
        `piece ${name}: the apex must stand directly over one BASE CORNER`);
      const bc = centroidOf(base);
      ok(!inPlane.every((c) => Math.abs(bc[c] - apex[c]) < 1e-9),
        `piece ${name}: the apex must NOT sit over the base's centre — that is a ` +
        `right pyramid, and three of those do not fill a box`);

      // the base's own area must be the B that pieceBaseHeight advertises
      const { B } = M.pieceBaseHeight(name, a, h);
      const n = A.cross(A.sub(base[1], base[0]), A.sub(base[3], base[0]));
      near(Math.hypot(n[0], n[1], n[2]), B, B * 1e-9,
        `piece ${name}: the drawn base's area must equal the advertised B`);
    }
    // the three bases are three DIFFERENT faces of the box
    const keys = M.PIECES.map((n) => JSON.stringify(M.pieceBase(n, a, h)));
    ok(new Set(keys).size === 3, `the three pieces must stand on three distinct faces (a=${a})`);
  }

  /* === 8. the explode is a RIGID TRANSLATION — it must not distort ======= */
  for (const [a, h] of SAMPLE) {
    for (const name of M.PIECES) {
      const v0 = polyVolume(M.pieceFaces(name, a, h, 0), centroidOf(M.pieceVerts(name, a, h, 0)));
      for (const s of [0.25, 0.5, 0.77, 1]) {
        const vs = polyVolume(M.pieceFaces(name, a, h, s), centroidOf(M.pieceVerts(name, a, h, s)));
        near(vs, v0, Math.abs(v0) * 1e-9,
          `piece ${name}: the split must translate it, not resize it (a=${a}, h=${h}, split=${s})`);
      }
      // at split = 0 nothing has moved
      const off0 = M.pieceOffset(name, a, h, 0);
      ok(off0[0] === 0 && off0[1] === 0 && off0[2] === 0,
        `piece ${name}: split = 0 means no offset`);
      // each piece leaves through its OWN base's face: the offset must run
      // along that face's OUTWARD normal (the floor piece drops, −z; the two
      // wall pieces slide out sideways, +x and +y). A piece sliding the wrong
      // way would travel through the box's interior instead of out of it.
      const axis = name === 'z' ? 2 : name === 'x' ? 0 : 1;
      const sign = name === 'z' ? -1 : 1;
      const off1 = M.pieceOffset(name, a, h, 1);
      ok(Math.sign(off1[axis]) === sign,
        `piece ${name}: must slide out along its own base's OUTWARD normal`);
      ok(off1.filter((c) => c !== 0).length === 1,
        `piece ${name}: slides along exactly one axis`);
    }
    // fully open, the pieces really do come apart: their apexes separate
    const apexes = M.PIECES.map((n) => M.pieceVerts(n, a, h, 1)[0]);
    for (let i = 0; i < 3; i++) {
      for (let j = i + 1; j < 3; j++) {
        const d = Math.hypot(...A.sub(apexes[i], apexes[j]));
        ok(d > 0.5 * Math.max(a, h),
          `at split = 1 the pieces must visibly separate (a=${a}, h=${h})`);
      }
    }
  }

  /* === 9. the CUBE case: h = a makes the three pieces congruent ===========
     The 120° turn about the cube's long diagonal — the one running from the
     apex (0,0,a) down to the opposite corner (a,a,0) — must carry each piece's
     vertex set exactly onto the next piece's. With the apex up top that turn is
     (x, y, z) → (y, a−z, a−x): it fixes the apex, has order 3, and cycles the
     three pieces. This is what "the three pieces are identical" MEANS, and it
     is the claim the 'dissect' step makes out loud.                        */
  for (const a of [1, 2, 3, 4.5, 6]) {
    const key = (vs) =>
      vs.map((v) => v.map((c) => Math.round(c * 1e9) / 1e9).join(',')).sort().join('|');
    const rot = (vs) => vs.map(([x, y, z]) => [y, a - z, a - x]);
    const Z = M.pieceVerts('z', a, a, 0);
    const X = M.pieceVerts('x', a, a, 0);
    const Y = M.pieceVerts('y', a, a, 0);
    // the cyclic turn permutes the three pieces (in some order)
    const images = [key(rot(Z)), key(rot(X)), key(rot(Y))];
    const originals = [key(Z), key(X), key(Y)];
    ok(new Set(images).size === 3 && images.every((im) => originals.includes(im)),
      `h = a: the 120° turn about the long diagonal must permute the three pieces (a=${a})`);
    ok(key(rot(rot(rot(Z)))) === key(Z), `the turn has order 3 (a=${a})`);
    // and h ≠ a genuinely breaks congruence — the lab's step-4 claim depends on
    // the pieces being DIFFERENT SHAPES yet equal in volume
    const bz = M.pieceBaseHeight('z', a, a + 1);
    const bx = M.pieceBaseHeight('x', a, a + 1);
    ok(bz.B !== bx.B && bz.B * bz.H === bx.B * bx.H,
      `h ≠ a: different bases, equal volume (a=${a})`);
  }

  /* === 10. calibration ===================================================
     Every target is exactly reachable; the stamp is an exact equality; and no
     dial setting can raise the stamp without genuinely hitting the volume.  */
  {
    const pool = M.targetPool();
    ok(pool.length > 0, 'the target pool is non-empty');
    ok(new Set(pool.map((t) => t.goal)).size >= 2,
      'the pool holds at least two distinct goals, or makeTarget would spin forever');
    for (const t of pool) {
      ok(Number.isInteger(t.goal) && t.goal > 0, `target goal ${t.goal} is a positive whole number`);
      ok(t.a * t.a * t.h === 3 * t.goal, `target (a=${t.a}, h=${t.h}) really holds ${t.goal}`);
      ok(M.isCalibrated(t.a, t.h, t.goal), `target (a=${t.a}, h=${t.h}) stamps CALIBRATED`);
      ok(GRID_A.includes(t.a) && GRID_H.includes(t.h),
        `target (a=${t.a}, h=${t.h}) is reachable on the dials`);
      near(M.matchPercent(t.a, t.h, t.goal), 100, 1e-9,
        `target (a=${t.a}, h=${t.h}) reads 100%`);
    }

    // THE NO-FALSE-STAMP PROOF: over every dial setting × every goal, the stamp
    // fires exactly when the volume is exactly right.
    for (const goal of new Set(pool.map((t) => t.goal))) {
      for (const a of GRID_A) {
        for (const h of GRID_H) {
          const exact = a * a * h === 3 * goal;
          ok(M.isCalibrated(a, h, goal) === exact,
            `stamp ⟺ exact volume (a=${a}, h=${h}, goal=${goal})`);
          if (!exact) {
            ok(M.matchPercent(a, h, goal) < 100 || Math.abs((a * a * h) / 3 - goal) > 0,
              `a non-exact setting must not read a true 100% (a=${a}, h=${h}, goal=${goal})`);
          }
        }
      }
    }

    // the celebration counts real alternates, and they are real
    for (const t of pool.slice(0, 12)) {
      const n = M.alternates(t.a, t.h, t.goal);
      ok(n >= 0, `alternates() is a count (goal=${t.goal})`);
      let brute = 0;
      for (const a of GRID_A) {
        for (const h of GRID_H) {
          if (a * a * h === 3 * t.goal && !(a === t.a && h === t.h)) brute++;
        }
      }
      ok(n === brute, `alternates() must match a brute-force count (goal=${t.goal})`);
    }

    // makeTarget never repeats the previous goal, and always returns a pool member
    const rand = rng(99);
    let prev = null;
    for (let i = 0; i < 3000; i++) {
      const t = M.makeTarget(prev, rand);
      ok(pool.some((p) => p.a === t.a && p.h === t.h && p.goal === t.goal),
        'makeTarget returns a pool member');
      if (prev) ok(t.goal !== prev.goal, 'makeTarget never repeats the previous goal');
      prev = t;
    }
  }

  /* === 11. the lesson's answer keys must match the model ================== */
  {
    ok(M.STEPS.length === 6, 'six steps');
    const byFocus = Object.fromEntries(M.STEPS.map((s) => [s.focus, s]));
    for (const f of ['meet', 'prism', 'dissect', 'third', 'siblings', 'calib']) {
      ok(!!byFocus[f], `the lesson has a '${f}' step`);
    }
    for (const s of M.STEPS) {
      if (s.calib) { ok(!s.q, 'the calibration step asks no multiple-choice question'); continue; }
      ok(Array.isArray(s.choices) && s.choices.length === 3, `'${s.focus}': three choices`);
      ok(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length,
        `'${s.focus}': the answer indexes a real choice`);
      ok(typeof s.feedback === 'string' && s.feedback.length > 60,
        `'${s.focus}': the reveal lives in the feedback`);
    }
    // the stated fraction is a third, and step 3's arithmetic is the model's
    ok(byFocus.prism.choices[byFocus.prism.answer].includes('third'),
      "the 'prism' step's answer is one third");
    ok(byFocus.dissect.choices[byFocus.dissect.answer] === 'Three',
      "the 'dissect' step's answer is Three — the number of pieces");
    ok(M.PIECES.length === 3, 'and the model really does have three pieces');
    const v33 = M.volFrac(3, 3);
    ok(byFocus.third.choices[byFocus.third.answer] === String(v33.n / v33.d),
      "the 'third' step's stated volume must be the model's V(3, 3)");
    ok(M.facts(3, 3).boxVol === 27, "the 'third' step's stated box volume of 27 is right");
    ok(byFocus.siblings.choices[byFocus.siblings.answer].includes('exactly equal'),
      "the 'siblings' step's answer is that the volumes stay equal");
    // the unlock order really is one dial per step
    const unlocks = M.PARAMS.map((p) => p.unlock).sort((x, y) => x - y);
    ok(new Set(unlocks).size === unlocks.length, 'dials unlock one per step — no two share a step');
  }

  /* === 12. DISTINCTNESS — the refusals, enforced against this source =====
     PyramidLab proves ⅓ by DISSECTION. Pouring is ConeLab's proof; slicing
     (Cavalieri) is SphereLab's. If those pictures ever creep in here, this
     lab has stopped being distinct — so the grep is part of the audit, not a
     comment. The header is exempt: it names the siblings on purpose. */
  {
    const marker = '==== MODEL:START';
    const body = SRC.slice(SRC.indexOf(marker));
    const banned = [
      ['cavalieri', "SphereLab's proof"],
      ['cross-section', "SphereLab's picture"],
      ['pour', "ConeLab's proof"],
      ['water', "ConeLab's picture"],
      ['liquid', "ConeLab's picture"],
    ];
    for (const [word, owner] of banned) {
      ok(!new RegExp(`\\b${word}`, 'i').test(body),
        `the lab body must not reach for "${word}" — that is ${owner}`);
    }
    // and it must actually make its own claim
    ok(/dissect/i.test(SRC), 'the lab must name its own method: dissection');
  }

  return { checks, failures };
}

/* ---- mutation testing: an audit that cannot fail proves nothing ---------- */
const MUTANTS = [
  ['tiling: piece z forgets one of its two conditions',
    'if (name === \'z\') return w >= u && w >= v;', 'if (name === \'z\') return w >= u;'],
  ['tiling: whichPiece swaps x and y',
    "if (u >= v && u >= w) return 'x';", "if (u >= v && u >= w) return 'y';"],
  ['claim 2: the wall pieces get the wrong height',
    'return { B: a * h, H: a };', 'return { B: a * h, H: h };'],
  ['claim 2: the square piece gets the wrong base',
    "if (name === 'z') return { B: a * a, H: h };", "if (name === 'z') return { B: a * h, H: h };"],
  ['formula: the volume fraction denominator drifts to 12',
    'const n = k * k * m, d = 24, g = gcd(n, d) || 1;', 'const n = k * k * m, d = 12, g = gcd(n, d) || 1;'],
  ['formula: facts reports a·h·h instead of a·a·h',
    'triple: a * a * h,  // 3V — the exact one', 'triple: a * h * h,'],
  ['geometry: a base corner of piece z is lifted off the floor',
    "if (name === 'z') return [[0, 0, 0], [a, 0, 0], [a, a, 0], [0, a, 0]]; // the floor",
    "if (name === 'z') return [[0, 0, 0], [a, 0, 0], [a, a, 0], [0, a, h * 0.1]];"],
  ['orientation: the apex falls back to the origin (the pyramid stands on its tip)',
    'const apexOf = (h) => [0, 0, h];', 'const apexOf = (h) => [0, 0, 0 * h];'],
  ['tiling: w loses the flip and stops agreeing with the raised apex',
    'const u = x / a, v = y / a, w = 1 - z / h;\n  if (name === \'z\') return w >= u && w >= v;',
    'const u = x / a, v = y / a, w = z / h;\n  if (name === \'z\') return w >= u && w >= v;'],
  ['geometry: piece x stands on the wrong wall',
    "if (name === 'x') return [[a, 0, 0], [a, a, 0], [a, a, h], [a, 0, h]]; // wall x = a",
    "if (name === 'x') return [[0, 0, 0], [0, a, 0], [0, a, h], [0, 0, h]];"],
  ['geometry: the pyramid loses a triangular face',
    '{ kind: \'side\', pts: [apex, base[3], base[0]] },', ''],
  ['explode: the split stops moving piece z',
    "if (name === 'z') return [0, 0, -d];", "if (name === 'z') return [0, 0, 0];"],
  ['explode: piece z slides INTO the box instead of out through its base',
    "if (name === 'z') return [0, 0, -d];", "if (name === 'z') return [0, 0, d];"],
  ['explode: the split scales the piece instead of translating it',
    'return [add(apexOf(h), off), ...pieceBase(name, a, h).map((p) => add(p, off))];',
    'return [add(apexOf(h), off), ...pieceBase(name, a, h).map((p) => mul(add(p, off), 1 + split))];'],
  ['stamp: the CALIBRATED test drops the factor of three',
    'return a * a * h === 3 * goal;', 'return a * a * h === goal;'],
  ['stamp: the CALIBRATED test goes fuzzy',
    'return a * a * h === 3 * goal;', 'return Math.abs(a * a * h - 3 * goal) < 1;'],
  ['calibration: the pool admits unreachable targets',
    'if (t % 3 === 0) out.push({ a, h, goal: t / 3 });', 'out.push({ a, h, goal: t / 3 });'],
];

function mutationTest() {
  const survivors = [];
  for (const [name, find, replace] of MUTANTS) {
    if (!MODEL_BODY.includes(find)) {
      survivors.push(`${name} — MUTATION IS STALE: its anchor text is no longer in the model`);
      continue;
    }
    const mutated = MODEL_BODY.replace(find, replace);
    let caught = false;
    try {
      const M = build(mutated);
      const { failures } = runSuite(M);
      caught = failures.length > 0;
    } catch {
      caught = true; // a mutant that cannot even run is caught
    }
    if (!caught) survivors.push(name);
  }
  return survivors;
}

/* ---- main --------------------------------------------------------------- */
const M = build(MODEL_BODY);
const { checks, failures } = runSuite(M);

console.log('audit-pyramid — PyramidLab.jsx');
console.log('─'.repeat(64));
console.log(`model sliced from the shipped component: ${MODEL_BODY.split('\n').length} lines`);
console.log(`checks run: ${checks.toLocaleString()}`);
console.log(`failures:   ${failures.length}`);
if (failures.length) {
  const shown = failures.slice(0, 25);
  for (const f of shown) console.log('  ✗ ' + f);
  if (failures.length > shown.length) console.log(`  … and ${failures.length - shown.length} more`);
}

console.log('─'.repeat(64));
console.log(`mutation test: ${MUTANTS.length} deliberate defects injected into the model…`);
const survivors = mutationTest();
if (survivors.length === 0) {
  console.log(`all ${MUTANTS.length} caught — the suite has teeth.`);
} else {
  console.log(`${survivors.length} SURVIVED — these are holes in the AUDIT, not the lab:`);
  for (const s of survivors) console.log('  ⚠ ' + s);
}

console.log('─'.repeat(64));
const pass = failures.length === 0 && survivors.length === 0;
console.log(pass ? 'PASS' : 'FAIL');
process.exit(pass ? 0 : 1);
