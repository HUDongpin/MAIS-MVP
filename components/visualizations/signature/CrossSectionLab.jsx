'use client';

/* ============================================================================
   CrossSectionLab — an interactive "bench" for CROSS-SECTIONS OF SOLIDS:
   slice a cube and read the flat shape the plane leaves behind — square,
   rectangle, triangle, and the surprise hexagon.

        the section's sides = the faces the plane crosses
        horizontal slices of a cube: congruent squares, all the way up
        the corner cut x+y+z = 2: an equilateral triangle
        the deep cut x+y+z = 3: a REGULAR HEXAGON with integer corners

   Built for MAIS (math AI system, www.mais.ac), K-12.  CCSS 7.G.A.3
   (and the on-ramp to G-GMD.B.4).  SphereLab owns the round sections
   inside a sphere; CubeLab owns the cube's own measurements.  This
   bench owns the SLICE: what a plane leaves on its way through.

   THE SIGNATURE CENTERPIECE — "THE SLICING PLANE AND THE SURPRISE HEXAGON."
     A cube of side 2, and preset planes engineered so every section
     lands on INTEGER corners.  The horizontal deck z = h gives the same
     2 × 2 square at every height.  The edge-to-edge tilt y = z gives a
     rectangle — four sides, no longer equal.  The corner cut
     x + y + z = 2 leaves an equilateral triangle.  And the deep cut
     x + y + z = 3 crosses ALL SIX faces and leaves a regular hexagon
     whose corners are (2,1,0), (1,2,0), (0,2,1), (0,1,2), (1,0,2),
     (2,0,1) — every side² exactly 2.  The rule crystallizes: one side
     of the section per face crossed, six faces at most.  The capstone
     posts a slice: rule the shape, then rule whether its sides are all
     equal — both exact, or no stamp.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • SphereLab owns the family of round sections inside a sphere; no
       round shape appears here, and the sphere is cited as the round
       counterpart.
     • CubeLab and RectangularPrismLab own volume and surface area; no
       volume is taken.
     • TriangleBuildLab owns triangle censuses; the triangle here is a
       SECTION, read off the plane, never constructed from parts.

   One-accent discipline: CARMINE is THE SECTION — the flat shape left
   behind.  GOLD is the slicing plane and its dial (the tool).  BLUE is
   the quiet cube frame.  GREEN only for correct/CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a student):
     • The section is COMPUTED, never stored: each preset plane (integer
       coefficients) is intersected with the cube's 12 edges by exact
       rational parameters, and for every posted plane the vertices land
       on integers — the audit asserts it, verifies each section's
       vertex SET against the expected list, and classifies shapes by
       exact side² arithmetic (the hexagon's six sides all square to 2;
       the squares' to 4).
     • Floats touch pixels and vertex ORDERING only (a convex polygon's
       boundary is unique, so ordering cannot change the side multiset).
     • The gem-cutter's stamp needs two exact rulings (the shape, then
       the equal-sides verdict), audited over every posted slice × chip
       pair; the truth chip is always present.
   Verified by audit-crosssection.mjs (numeric + geometric proof +
   source greps) and verify-crosssection.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/CrossSectionLab.jsx
     2. Import and render it:
          import CrossSectionLab from './CrossSectionLab';
          export default function Page() { return <CrossSectionLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the plane, the
              lesson step, the rulings).
     MODEL  — exact rational plane-edge intersection; no pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the section
const BLUE = '#3f74a6'; // the cube frame
const GOLD = '#b98718'; // the slicing plane
const INK_HEX = '#1c2b3a';

const CALIB_STEP = 5;
const SIDE = 2; /* the cube is [0,2]³ so every posted section has integer corners */

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Exact plane ∩ cube: rational parameters on 12 edges.
   A plane is {a, b, c, d} meaning a·x + b·y + c·z = d, integers.
   ------------------------------------------------------------------------- */
const CORNERS = [];
for (const x of [0, SIDE]) for (const y of [0, SIDE]) for (const z of [0, SIDE]) CORNERS.push([x, y, z]);
const EDGES = [];
for (let i = 0; i < 8; i++)
  for (let j = i + 1; j < 8; j++) {
    const diff = CORNERS[i].map((v, k) => Math.abs(v - CORNERS[j][k]));
    if (diff.filter((v) => v !== 0).length === 1) EDGES.push([CORNERS[i], CORNERS[j]]);
  }
const planeAt = (pl, p) => pl.a * p[0] + pl.b * p[1] + pl.c * p[2] - pl.d;
/* the section's vertices — exact: t = fP/(fP−fQ) is rational; here every
   posted plane lands t ∈ {0, 1/2, 1} so vertices are integers on the
   side-2 cube (the audit asserts integrality) */
const sectionOf = (pl) => {
  const found = [];
  for (const [P, Q] of EDGES) {
    const fP = planeAt(pl, P);
    const fQ = planeAt(pl, Q);
    if (fP === 0 && fQ === 0) continue; /* edge lies in the plane: skip; corners arrive via neighbors */
    if (fP * fQ > 0) continue;
    if (fP === 0 || fQ === 0) {
      const V = fP === 0 ? P : Q;
      if (!found.some((u) => u[0] === V[0] && u[1] === V[1] && u[2] === V[2])) found.push([...V]);
      continue;
    }
    /* fP and fQ straddle: t = fP/(fP − fQ); the edge varies in one axis */
    const tNum = fP;
    const tDen = fP - fQ;
    const V = P.map((v, k) => v + ((Q[k] - v) * tNum) / tDen);
    if (!found.some((u) => u[0] === V[0] && u[1] === V[1] && u[2] === V[2])) found.push(V);
  }
  return found;
};
const dist2 = (u, v) => (u[0] - v[0]) ** 2 + (u[1] - v[1]) ** 2 + (u[2] - v[2]) ** 2;
/* order the convex section's vertices around its centroid (floats: ordering
   only — the boundary of a convex polygon is unique) */
const orderSection = (verts) => {
  if (verts.length < 3) return verts;
  const c = [0, 1, 2].map((k) => verts.reduce((s, v) => s + v[k], 0) / verts.length);
  const rel = verts.map((v) => v.map((x, k) => x - c[k]));
  const n = [
    rel[0][1] * rel[1][2] - rel[0][2] * rel[1][1],
    rel[0][2] * rel[1][0] - rel[0][0] * rel[1][2],
    rel[0][0] * rel[1][1] - rel[0][1] * rel[1][0],
  ];
  const ax = rel[0];
  const cross = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const ay = cross(n, ax);
  return verts
    .map((v, i) => ({ v, ang: Math.atan2(dot(rel[i], ay), dot(rel[i], ax)) }))
    .sort((p, q) => p.ang - q.ang)
    .map((o) => o.v);
};
const sidesOf = (pl) => {
  const vs = orderSection(sectionOf(pl));
  return vs.map((v, i) => dist2(v, vs[(i + 1) % vs.length]));
};
const shapeOf = (pl) => {
  const vs = sectionOf(pl);
  if (vs.length === 3) return 'triangle';
  if (vs.length === 6) return 'hexagon';
  if (vs.length === 4) {
    const s2 = sidesOf(pl);
    return new Set(s2).size === 1 ? 'square' : 'rectangle';
  }
  return `${vs.length}-gon`;
};
const equalSided = (pl) => new Set(sidesOf(pl)).size === 1;

/* the slicing planes on the bench */
const SLICES = {
  deck: { label: 'the horizontal deck', pl: (h) => ({ a: 0, b: 0, c: 1, d: h }), dial: true },
  upright: { label: 'the upright cut x = 1', pl: () => ({ a: 1, b: 0, c: 0, d: 1 }) },
  tilt: { label: 'the edge-to-edge tilt y = z', pl: () => ({ a: 0, b: 1, c: -1, d: 0 }) },
  wall: { label: 'the diagonal wall x + y = 2', pl: () => ({ a: 1, b: 1, c: 0, d: 2 }) },
  corner: { label: 'the corner cut x + y + z = 2', pl: () => ({ a: 1, b: 1, c: 1, d: 2 }) },
  deep: { label: 'the deep cut x + y + z = 3', pl: () => ({ a: 1, b: 1, c: 1, d: 3 }) },
};

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "The gem-cutter's stamp."  A slice is posted;
   rule the shape, then the equal-sides verdict.
   ------------------------------------------------------------------------- */
const SHAPE_CHIPS = ['triangle', 'square', 'rectangle', 'hexagon'];
const EQUAL_CHIPS = ['all sides equal', 'not all sides equal'];
const CASES = ['deck', 'corner', 'deep', 'tilt', 'wall', 'upright'];
function makeCase(prev) {
  let i;
  do {
    i = Math.floor(Math.random() * CASES.length);
  } while (prev != null && i === prev);
  return i;
}
const planeOfCase = (i) => SLICES[CASES[i]].pl(1);
const shapeTruth = (i) => shapeOf(planeOfCase(i));
const equalTruth = (i) => (equalSided(planeOfCase(i)) ? EQUAL_CHIPS[0] : EQUAL_CHIPS[1]);
const calibChecks = (i, sPick, ePick) => {
  if (i == null) return [false, false];
  const sOK = sPick != null && sPick === shapeTruth(i);
  const eOK = sOK && ePick != null && ePick === equalTruth(i);
  return [sOK, eOK];
};
const closeness = (i, s, e) =>
  Math.round((100 * calibChecks(i, s, e).filter(Boolean).length) / 2);
const isCalibrated = (i, s, e) => calibChecks(i, s, e).every(Boolean);

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; the reveal lives in the feedback.
   The distractors are the real beliefs: that a cube only yields squares,
   that tilted cuts stay square, that six sides are impossible.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'The horizontal deck',
    body:
      'A cube of side 2, sliced flat at height h. Run the dial from floor to ceiling ' +
      'and read the section — the shape, the corner count, and the side² readings all ' +
      'update as the blade moves.',
    slice: 'deck',
    q: 'What does every horizontal slice leave?',
    choices: [
      'The same 2 × 2 square, at every height — flat decks copy the base',
      'Squares that shrink toward the top',
      'It depends on the height',
    ],
    answer: 0,
    feedback:
      'Congruent squares, floor to ceiling — a cube (like any prism) has no taper for ' +
      'a flat deck to notice. The sphere bench tells the round version of this story, ' +
      'where the slices DO grow and shrink. Cubes need a tilt before anything changes.',
    note:
      'Watch the side² readout while the dial moves: four readings of 4 at every ' +
      'height. When a claim survives every position of a dial, it has earned the word ' +
      'EVERY — that is what separates a checked fact from a hopeful one.',
  },
  {
    title: 'Tilt: the stretched cut',
    body:
      'Slice from a bottom edge to the opposite top edge — the plane y = z. Count the ' +
      'sides and compare them carefully before you rule; the corner count alone can ' +
      'mislead you here.',
    slice: 'tilt',
    q: 'The tilted section is…',
    choices: [
      'A rectangle, not a square — four corners, but the tilted pair of sides runs longer',
      'Still a 2 × 2 square',
      'A triangle',
    ],
    answer: 0,
    feedback:
      'Four sides still, but the cut crosses the cube diagonally, so two sides ' +
      'stretch: side² reads 4, 8, 4, 8 — a genuine rectangle. Tilting a plane buys ' +
      'length in the tilt direction and nowhere else.',
    note:
      'Why 8 and not some messier number? The stretched side runs 2 across and 2 up ' +
      'at once, and the corner arithmetic adds those squares. The section remembers ' +
      'exactly how far the plane leaned — side² does the bookkeeping.',
  },
  {
    title: 'The corner cut',
    body:
      'Slice off a corner: the plane x + y + z = 2 passes through (2,0,0), (0,2,0) ' +
      'and (0,0,2). One corner of the cube falls away on the near side of the blade.',
    slice: 'corner',
    q: 'The section is…',
    choices: [
      'An equilateral triangle — the plane crosses exactly three faces, one side each',
      'A square — cubes give squares',
      'A hexagon',
    ],
    answer: 0,
    feedback:
      'Three faces crossed, three sides left: a triangle, and an equilateral one — ' +
      'each side² reads 8, by the same arithmetic on each pair of corners. The rule is ' +
      'surfacing: the section collects one side per face the plane crosses.',
    note:
      'All three corners sit the same distance apart because the plane treats x, y ' +
      'and z with perfect fairness — swap any two axes and the cut lands on itself. ' +
      'Symmetry in the equation becomes symmetry in the section.',
  },
  {
    title: 'The surprise hexagon',
    body:
      'Push the same tilt deeper: x + y + z = 3, through the cube’s very center. ' +
      'Count again — and this time count faces, not corners, before trusting your eyes.',
    slice: 'deep',
    q: 'How many faces does this plane cross?',
    choices: [
      'All six — and the section is a regular hexagon with corners like (2,1,0)',
      'Four — planes cannot reach six faces',
      'Three, as before',
    ],
    answer: 0,
    feedback:
      'Six faces, six sides — the corners are (2,1,0), (1,2,0), (0,2,1), (0,1,2), ' +
      '(1,0,2), (2,0,1), and every side² is exactly 2: a REGULAR hexagon hiding in a ' +
      'square-cornered box. The most surprising slice in school geometry.',
    note:
      'Regular means every side equal, and this one earns it honestly. Check any ' +
      'neighboring pair of corners: each coordinate moves by at most one step, and ' +
      'side² comes out 2 again. Six sides, one shared length, zero luck.',
  },
  {
    title: 'The rule',
    body:
      'One side of the section per face crossed. A cube owns exactly six faces. Say ' +
      'the rule once more before you answer — the whole step turns on it.',
    slice: 'deep',
    q: 'Could some clever plane cut a 7-sided section from a cube?',
    choices: [
      'No — seven sides would need seven faces, and the cube has six',
      'Yes, with a curved plane',
      'Yes, through two corners at once',
    ],
    answer: 0,
    feedback:
      'Six is the ceiling, and the deep cut reaches it. The side-count rule turns ' +
      'slicing into bookkeeping: count the faces the plane visits and you have counted ' +
      'the section’s sides — before drawing anything.',
    note:
      'The rule also says what you will never see: a five-sided section needs five ' +
      'faces, so pentagons are possible, but seven-sided ones are not. Ceilings like ' +
      'this are the quiet power of counting arguments — they close doors without ' +
      'opening a single drawing.',
  },
  {
    title: 'The gem-cutter’s stamp',
    body:
      'A slice is posted. Rule the section’s shape, then rule whether all its sides ' +
      'are equal. Both exact, or no stamp. Read the side² lines off the paper first; ' +
      'the meter only reports how much of your ruling stands.',
    slice: 'deck',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function CrossSectionLab() {
  const [h, setH] = useState(1);
  const [sPick, setSPick] = useState(null);
  const [ePick, setEPick] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [kase, setKase] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const sliceId = calib && kase != null ? CASES[kase] : current.slice;
  const plane = SLICES[sliceId].pl(SLICES[sliceId].dial ? h : 1);

  const checks = calib ? calibChecks(kase, sPick, ePick) : [false, false];
  const pct = calib && kase != null ? closeness(kase, sPick, ePick) : 0;
  const calibrated = calib && kase != null ? isCalibrated(kase, sPick, ePick) : false;

  sceneRef.current = { plane, sliceId, calib };

  /* ---- full redraw from state ------------------------------------------- */
  const draw = useCallback(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const W = stage.clientWidth;
    const H2 = stage.clientHeight;
    if (W === 0 || H2 === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H2 * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const INK_SOFT = '#5b6b7b';
    const S = sceneRef.current;
    ctx.clearRect(0, 0, W, H2);

    /* quadrille paper */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.5)';
    const gs = 26;
    ctx.beginPath();
    for (let gx = gs; gx < W; gx += gs) {
      ctx.moveTo(Math.round(gx) + 0.5, 0);
      ctx.lineTo(Math.round(gx) + 0.5, H2);
    }
    for (let gy = gs; gy < H2; gy += gs) {
      ctx.moveTo(0, Math.round(gy) + 0.5);
      ctx.lineTo(W, Math.round(gy) + 0.5);
    }
    ctx.stroke();

    const bandH = 52;
    /* isometric projection (pixels only) */
    const scale = Math.min(W, H2 - bandH) / 5.4;
    const cx = W / 2;
    const cy = bandH + (H2 - bandH) / 2 + 30;
    const iso = ([x, y, z]) => [cx + (x - y) * scale * 0.866, cy + (x + y) * scale * 0.5 - z * scale];

    /* the cube frame */
    ctx.strokeStyle = BLUE;
    ctx.lineWidth = 1.6;
    for (const [P, Q] of EDGES) {
      ctx.beginPath();
      ctx.moveTo(...iso(P));
      ctx.lineTo(...iso(Q));
      ctx.stroke();
    }
    /* the section */
    const verts = orderSection(sectionOf(S.plane));
    if (verts.length >= 3) {
      ctx.fillStyle = 'rgba(200,30,79,0.22)';
      ctx.strokeStyle = CARMINE;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(...iso(verts[0]));
      for (let i = 1; i < verts.length; i++) ctx.lineTo(...iso(verts[i]));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      for (const v of verts) {
        ctx.fillStyle = CARMINE;
        ctx.beginPath();
        ctx.arc(...iso(v), 4, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
    /* the readout card */
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = INK_SOFT;
    ctx.font = 'italic 600 11.5px system-ui, sans-serif';
    ctx.fillText('the section', 22, bandH + 8);
    ctx.font = '600 11.5px ui-monospace, monospace';
    ctx.fillStyle = CARMINE;
    ctx.fillText(
      S.calib ? `${verts.length} corners · shape ?` : `${verts.length} corners · ${shapeOf(S.plane)}`,
      22,
      bandH + 28
    );
    if (!S.calib && verts.length >= 3) {
      ctx.fillStyle = INK_HEX;
      ctx.fillText(`side² readings: ${sidesOf(S.plane).join(', ')}`, 22, bandH + 46);
    }

    /* ---- the readout band ---- */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CARMINE;
    ctx.font = '700 14.5px ui-monospace, monospace';
    ctx.fillText(
      S.calib ? `posted: ${SLICES[S.sliceId].label}` : SLICES[S.sliceId].label + (SLICES[S.sliceId].dial ? ` · h = ${S.plane.d}` : ''),
      W / 2,
      bandH / 2
    );
  }, []);

  useEffect(() => {
    draw();
  });

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* every step opens on the scene its words describe */
  useEffect(() => {
    setH(1);
    setSPick(null);
    setEPick(null);
    if (STEPS[step].calib) setKase(makeCase(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const reset = () => {
    setH(1);
    setSPick(null);
    setEPick(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* accessibility — the spoken summary for screen readers */
  const spoken = calib
    ? `The stamp: ${kase != null ? SLICES[CASES[kase]].label : ''}. Shape ${sPick ?? 'unruled'}; sides ${ePick ?? 'unruled'}. ${calibrated ? 'Calibrated.' : ''}`
    : `${SLICES[sliceId].label}: the section has ${sectionOf(plane).length} corners — a ${shapeOf(plane)}.`;

  return (
    <div className="cslab">
      <header className="head">
        <h1>Cross-Sections: What the Plane Leaves Behind</h1>
        <p className="lede">
          Slice a cube and read the flat shape: one side per face crossed. Flat decks copy
          the base, tilts stretch it, corner cuts leave triangles — and the deep cut
          through the center leaves a <em>regular hexagon</em> with integer corners.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage" ref={stageRef} role="img" aria-label={spoken}>
            <canvas ref={canvasRef} />
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
          </p>

          {SLICES[sliceId].dial && !calib && (
            <div className="dials">
              <div className="dial">
                <div className="dial-head">
                  <span className="dial-k">the deck height h</span>
                  <span className="dial-v mono">{h}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={1}
                  value={h}
                  onChange={(e) => setH(Number(e.target.value))}
                  aria-label={`Height, ${h}`}
                />
              </div>
            </div>
          )}

          <div className="toolbar" role="group" aria-label="Scene">
            <button type="button" className="btn ghost" onClick={reset}>
              Reset
            </button>
          </div>
        </section>

        {/* ---------- TUTOR ---------- */}
        <aside className="panel tutor">
          <div className="progress" role="list" aria-label="Lesson progress">
            {STEPS.map((_, i) => (
              <span
                key={i}
                role="listitem"
                className={'pip' + (i === step ? ' cur' : '') + (i < step ? ' done' : '')}
                aria-current={i === step ? 'step' : undefined}
              />
            ))}
          </div>

          <p className="eyebrow small">
            Step {step + 1} of {STEPS.length}
          </p>
          <h2>{current.title}</h2>
          <p className="body">{current.body}</p>

          {hasQuestion && (
            <div className="quiz">
              <p className="q">{current.q}</p>
              <div className="choices">
                {current.choices.map((cq, i) => {
                  const chosen = answers[step];
                  const isChosen = chosen === i;
                  const isCorrect = i === current.answer;
                  let cls = 'choice';
                  if (chosen != null) {
                    if (isCorrect) cls += ' correct';
                    else if (isChosen) cls += ' wrong';
                    else cls += ' dim';
                  }
                  return (
                    <button type="button" key={i} className={cls} onClick={() => choose(i)} disabled={chosen != null}>
                      <span className="mark" aria-hidden="true">
                        {chosen != null && isCorrect ? '✓' : chosen != null && isChosen ? '✕' : ''}
                      </span>
                      {cq}
                    </button>
                  );
                })}
              </div>
              {answered && <p className="feedback">{current.feedback}</p>}
              {answered && current.note && <p className="note">{current.note}</p>}
            </div>
          )}

          {calib && kase != null && (
            <div className="calib">
              <div className="target-card">
                <span className="target-k">The posted slice</span>
                <span className="target-word">{SLICES[CASES[kase]].label}</span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>{checks[0] ? '✓' : '·'} the shape, ruled</li>
                  <li className={checks[1] ? 'done' : ''}>{checks[1] ? '✓' : '·'} the sides, judged</li>
                </ol>
                <div className="declare" role="group" aria-label="Shape ruling">
                  {SHAPE_CHIPS.map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn reason' + (sPick === c2 ? ' active' : '')}
                      onClick={() => setSPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <div className="declare" role="group" aria-label="Equal sides ruling">
                  {EQUAL_CHIPS.map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn reason' + (ePick === c2 ? ' active' : '')}
                      onClick={() => setEPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <span className="target-hint mono">
                  {calibrated
                    ? 'both ruled, exactly — a clean facet'
                    : checks[0]
                      ? 'shaped — now judge the sides'
                      : 'count the faces the plane crosses'}
                </span>
              </div>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">{checks.filter(Boolean).length}/2</span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">the shape · then the sides</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setKase(makeCase(kase));
                  setSPick(null);
                  setEPick(null);
                }}
              >
                Next case
              </button>
            </div>
          )}

          <div className="nav">
            <button type="button" className="btn ghost" onClick={goBack} disabled={step === 0}>
              ← Back
            </button>
            {step < STEPS.length - 1 ? (
              <button type="button" className="btn" onClick={goNext} disabled={!canNext}>
                {hasQuestion && !answered ? 'Answer to continue' : 'Next →'}
              </button>
            ) : (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setStep(0);
                  setAnswers({});
                  setKase(null);
                  setSPick(null);
                  setEPick(null);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">one side per face crossed · six is the ceiling</span>{' '}
        &nbsp;·&nbsp; flat decks copy, tilts stretch, corner cuts triangulate — and the
        deep cut leaves a regular hexagon in a square-cornered box.
      </footer>

      <style jsx>{`
        .cslab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --carmine: #c81e4f;
          --blue: #3f74a6;
          --gold: #b98718;
          --quad: #c7d8e4;
          --ok: #1f8a5b;
          --mono: ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace;
          --serif: 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif;
          background: var(--page);
          color: var(--ink);
          font: 16px/1.55 system-ui, -apple-system, 'Segoe UI', sans-serif;
          padding: 28px 18px 44px;
          border-radius: 16px;
          max-width: 1120px;
          margin: 0 auto;
        }
        .mono {
          font-family: var(--mono);
        }
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
        .eyebrow {
          font-size: 11px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: var(--ink-soft);
          margin: 0 0 6px;
        }
        .eyebrow.small {
          margin: 0 0 4px;
        }
        h1 {
          font-family: var(--serif);
          font-weight: 600;
          font-size: clamp(26px, 4vw, 34px);
          margin: 0 0 6px;
        }
        .lede {
          color: var(--ink-soft);
          margin: 0 0 22px;
          max-width: 72ch;
        }
        .lede em {
          font-style: italic;
          color: var(--ink);
        }
        .bench {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 340px;
          gap: 22px;
          align-items: start;
        }
        @media (max-width: 920px) {
          .bench {
            grid-template-columns: minmax(0, 1fr);
          }
        }
        .panel {
          min-width: 0;
          background: #fff;
          border: 1px solid rgba(28, 43, 58, 0.15);
          border-radius: 12px;
          box-shadow: 0 1px 2px rgba(28, 43, 58, 0.05);
        }
        .stage-panel {
          padding: 14px;
        }
        .stage {
          position: relative;
          width: 100%;
          aspect-ratio: 7 / 5;
          min-height: 400px;
          margin: 0 auto;
          border: 1px solid var(--quad);
          border-radius: 8px;
          overflow: hidden;
          touch-action: none;
          background: linear-gradient(180deg, #fdfefe 0%, #f4f7f9 100%);
        }
        .stage canvas {
          display: block;
          width: 100%;
          height: 100%;
        }
        @media (max-width: 560px) {
          .stage {
            aspect-ratio: 4 / 5;
            min-height: 380px;
          }
        }
        .dials {
          margin: 12px 4px 0;
          display: grid;
          gap: 8px;
        }
        .dial {
          padding: 8px 10px;
          border: 1px solid rgba(28, 43, 58, 0.14);
          border-radius: 8px;
          background: var(--paper);
        }
        .dial-head {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 4px;
        }
        .dial-k {
          font-size: 12.5px;
          font-weight: 600;
        }
        .dial-v {
          font-size: 13px;
          color: var(--gold);
          font-weight: 700;
        }
        .dial input[type='range'] {
          width: 100%;
          accent-color: var(--gold);
        }
        .toolbar {
          margin: 12px 4px 2px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }
        .chipbtn {
          font: 600 12px/1.2 system-ui, sans-serif;
          padding: 8px 11px;
          border-radius: 8px;
          cursor: pointer;
          border: 1.5px solid rgba(63, 116, 166, 0.55);
          background: var(--paper);
          color: var(--blue);
          transition: border-color 0.15s, background 0.15s;
        }
        .chipbtn.active {
          border-color: var(--blue);
          background: rgba(63, 116, 166, 0.1);
        }
        .chipbtn:hover {
          border-color: var(--ink);
        }
        .btn {
          font: 600 13px/1 system-ui, sans-serif;
          padding: 9px 14px;
          border-radius: 8px;
          cursor: pointer;
          border: 1px solid var(--ink);
          background: var(--ink);
          color: #fff;
          transition: background 0.15s, color 0.15s, border-color 0.15s, opacity 0.15s;
        }
        .btn.ghost {
          background: transparent;
          color: var(--ink);
        }
        .btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .btn:not(:disabled):hover {
          filter: brightness(1.08);
        }
        .tutor {
          padding: 18px 20px 20px;
        }
        .progress {
          display: flex;
          gap: 6px;
          margin-bottom: 14px;
        }
        .pip {
          height: 5px;
          flex: 1;
          border-radius: 3px;
          background: rgba(28, 43, 58, 0.14);
        }
        .pip.done {
          background: rgba(200, 30, 79, 0.45);
        }
        .pip.cur {
          background: var(--carmine);
        }
        h2 {
          font-family: var(--serif);
          font-weight: 600;
          font-size: 20px;
          margin: 0 0 10px;
          padding-bottom: 9px;
          border-bottom: 3px double rgba(200, 30, 79, 0.45);
        }
        .body {
          margin: 0 0 16px;
          font-size: 14.5px;
        }
        .quiz {
          margin-top: 4px;
          padding-top: 6px;
        }
        .q {
          font-size: 14px;
          font-weight: 600;
          margin: 0 0 10px;
        }
        .choices {
          display: grid;
          gap: 7px;
        }
        .choice {
          text-align: left;
          font: 13.5px/1.4 system-ui, sans-serif;
          padding: 9px 11px 9px 30px;
          border: 1px solid rgba(28, 43, 58, 0.2);
          border-radius: 8px;
          background: var(--paper);
          color: var(--ink);
          cursor: pointer;
          position: relative;
          transition: border-color 0.15s, background 0.15s;
        }
        .choice:not(:disabled):hover {
          border-color: var(--ink);
        }
        .choice .mark {
          position: absolute;
          left: 10px;
          font-weight: 700;
        }
        .choice.correct {
          border-color: var(--ok);
          background: rgba(31, 138, 91, 0.08);
        }
        .choice.correct .mark {
          color: var(--ok);
        }
        .choice.wrong {
          border-color: var(--ink-soft);
          background: rgba(91, 107, 123, 0.08);
        }
        .choice.wrong .mark {
          color: var(--ink-soft);
        }
        .choice.dim {
          opacity: 0.55;
        }
        .choice:disabled {
          cursor: default;
        }
        .feedback {
          margin: 12px 0 0;
          font-size: 13px;
          line-height: 1.55;
          color: var(--ink);
          background: rgba(200, 30, 79, 0.05);
          border-left: 3px solid var(--carmine);
          padding: 10px 12px;
          border-radius: 0 6px 6px 0;
        }
        .note {
          margin: 8px 0 0;
          font-size: 12.5px;
          line-height: 1.55;
          color: var(--ink-soft);
          border-left: 3px solid var(--ink-soft);
          padding: 8px 12px;
        }
        .calib {
          margin-top: 16px;
          padding-top: 14px;
          border-top: 1px solid rgba(28, 43, 58, 0.1);
          display: grid;
          gap: 10px;
        }
        .target-card {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 10px 12px;
          border: 1px solid rgba(28, 43, 58, 0.16);
          border-radius: 8px;
          background: rgba(185, 135, 24, 0.07);
        }
        .target-k {
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .target-word {
          font-family: var(--serif);
          font-size: 21px;
          font-weight: 600;
        }
        .tasks {
          margin: 0;
          padding: 0 0 0 4px;
          list-style: none;
          font-size: 13.5px;
          display: grid;
          gap: 4px;
        }
        .tasks li.done {
          color: var(--ok);
          font-weight: 600;
        }
        .declare {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .declbtn {
          font-size: 12.5px;
          font-weight: 700;
          padding: 7px 11px;
          border-radius: 6px;
          cursor: pointer;
          border: 1.5px solid rgba(28, 43, 58, 0.28);
          background: var(--paper);
          color: var(--ink);
        }
        .declbtn.reason {
          font-size: 11.5px;
          font-weight: 600;
        }
        .declbtn.active {
          border-color: var(--carmine);
          background: rgba(200, 30, 79, 0.1);
          color: var(--carmine);
        }
        .target-hint {
          color: var(--ink-soft);
          font-size: 12px;
        }
        .meter {
          height: 12px;
          border-radius: 6px;
          background: rgba(28, 43, 58, 0.1);
          overflow: hidden;
        }
        .meter-fill {
          height: 100%;
          background: linear-gradient(90deg, rgba(200, 30, 79, 0.55), var(--carmine));
          transition: width 0.12s ease-out;
        }
        .meter-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          font-size: 13px;
        }
        .stamp {
          font: 700 12px/1 var(--mono);
          letter-spacing: 0.16em;
          color: var(--ok);
          border: 2px solid var(--ok);
          border-radius: 6px;
          padding: 4px 8px;
          transform: rotate(-3deg);
          white-space: nowrap;
        }
        .nav {
          margin-top: 20px;
          display: flex;
          justify-content: space-between;
          gap: 10px;
        }
        .foot {
          margin-top: 24px;
          font-size: 12.5px;
          color: var(--ink-soft);
        }
        :global(.cslab) :focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 2px;
          border-radius: 4px;
        }
        @media (max-width: 460px) {
          .toolbar {
            gap: 6px;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .btn,
          .meter-fill,
          .choice,
          .chipbtn {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
