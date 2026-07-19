'use client';

/* ============================================================================
   PythagorasLab — an interactive "bench" that PROVES the Pythagorean theorem
   by rearrangement: four triangles, two squares, one identity.

        one frame of side (a + b) · four copies of the same right triangle
        packed one way, the leftover is ONE tilted square:  c²
        packed the other way, it is TWO squares:  a² + b²
        same frame − same triangles  ⇒  c² = a² + b²

   Built for MAIS (math AI system, www.mais.ac), K-12.  CCSS 8.G.B.6 —
   "explain a proof of the Pythagorean theorem."  Four shipped labs SPEND
   this identity (DistanceLab, CubeLab, RectangularPrismLab, ConeLab);
   none of them earns it.  This bench is where it is earned.

   THE SIGNATURE CENTERPIECE — "THE MASON'S TWO PACKINGS."
     A blue frame of side a + b, and four gold copies of one right
     triangle.  Packing one tucks a triangle into each corner and the
     carmine leftover is a single tilted square whose every side is the
     hypotenuse — area priced by subtraction, (a+b)² − 2ab, before anyone
     measures c.  Packing two pairs the triangles into two rectangles and
     the carmine leftover is two axis-square patches, a² and b².  The
     mason's ledger prices both leftovers as the same number, the legs
     are dials so the identity survives every choice, and the capstone
     posts a triple: rule c², then rule c — both exact, or no stamp.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • AreaLab (3-5) owns cut-and-slide for the rectangle formula; nothing
       here slides along a row — pieces are repacked whole inside a fixed
       frame, and the argument is subtraction, not dissection into strips.
     • DistanceLab owns spending a² + b² = c² on coordinates; no coordinate
       plane, no point pairs appear here.  It cites this identity; this
       bench proves it and never mentions its uses beyond one nod.
     • TriangleLab owns drag-the-vertices and the angle-sum tour; no vertex
       is draggable here and no angle is summed on stage.
     • TransformationsLab owns naming the rigid motions; the repacking is
       shown as two finished packings, never narrated as slides or turns.
     • ComposingShapesLab (K-5) owns seam-counting composition; EqualAreasLab
       owns the paper fold.  Neither device appears.
     • IntegralLab owns slats and traps; no area here is approximated —
       every count is exact integer bookkeeping.

   One-accent discipline: CARMINE is THE LEFTOVER — the squares that carry
   the identity.  GOLD is the four triangles (the tool).  BLUE is the quiet
   frame.  GREEN only for correct/CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a student):
     • Legs are integers (1–12); every stated area is an integer computed
       by integer arithmetic: frame (a+b)², triangles 2ab, leftover their
       difference, and (a+b)² − 2ab = a² + b² — the audit re-proves it over
       the whole dial space.
     • The two packings are MODELS, not pictures: integer vertex lists.
       The audit shoelace-computes every piece's area, confirms all eight
       triangles carry the side² multiset {a², b², a²+b²} (the SAME
       triangle), confirms the tilted leftover has four equal sides and
       four right corners (dot products, exactly zero), confirms the flat
       leftovers are the a- and b-squares, and confirms each packing's
       pieces sum exactly to the frame.
     • The hypotenuse is displayed as a NUMBER only when it is one: the
       capstone posts Pythagorean triples, and c is found by integer
       search — Math.sqrt appears nowhere in this file.
     • The mason's stamp needs two exact rulings (c², then c), audited
       over every posted triple × every chip pair; the truth chip is
       always present and never duplicated.
   Verified by audit-pythagoras.mjs (numeric + geometric proof + source
   greps) and verify-pythagoras.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/PythagorasLab.jsx
     2. Import and render it:
          import PythagorasLab from './PythagorasLab';
          export default function Page() { return <PythagorasLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the legs, the
              packing, the lesson step, answers, the rulings).
     MODEL  — integer vertex lists and integer areas; no pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the leftover squares — the identity
const BLUE = '#3f74a6'; // the frame
const GOLD = '#b98718'; // the four triangles
const INK_HEX = '#1c2b3a';

const LEG_MIN = 1;
const LEG_MAX = 12;
const CALIB_STEP = 5;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Integer areas; the two packings as integer vertex lists.
   ------------------------------------------------------------------------- */
const frameArea = (a, b) => (a + b) * (a + b);
const triArea4 = (a, b) => 2 * a * b; /* four triangles of ab/2 each */
const leftoverOf = (a, b) => frameArea(a, b) - triArea4(a, b);
const cSquared = (a, b) => a * a + b * b;
/* the hypotenuse as an integer, by search — only triples ever display it */
const cOf = (a, b) => {
  for (let c = 1; c <= a + b; c++) if (c * c === a * a + b * b) return c;
  return null;
};

/* packing one — a triangle tucked in each corner; the leftover is the
   tilted square on the hypotenuse */
const tiltPieces = (a, b) => ({
  triangles: [
    [[0, 0], [a, 0], [0, b]],
    [[a, 0], [a + b, 0], [a + b, a]],
    [[a + b, a], [a + b, a + b], [b, a + b]],
    [[b, a + b], [0, a + b], [0, b]],
  ],
  leftovers: [[[a, 0], [a + b, a], [b, a + b], [0, b]]],
});
/* packing two — the triangles paired into two rectangles; the leftover is
   the two squares on the legs */
const packPieces = (a, b) => ({
  triangles: [
    [[a, 0], [a + b, 0], [a + b, a]],
    [[a, 0], [a + b, a], [a, a]],
    [[0, a], [a, a + b], [0, a + b]],
    [[0, a], [a, a], [a, a + b]],
  ],
  leftovers: [
    [[0, 0], [a, 0], [a, a], [0, a]],
    [[a, a], [a + b, a], [a + b, a + b], [a, a + b]],
  ],
});
const PACKINGS = {
  tilt: { label: 'the tilted square', pieces: tiltPieces },
  packs: { label: 'the two squares', pieces: packPieces },
};
const packingIds = Object.keys(PACKINGS);

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "The mason's stamp."  A triple is posted; rule the
   square on the hypotenuse, then the hypotenuse itself.
   ------------------------------------------------------------------------- */
const TRIPLES = [
  [3, 4],
  [6, 8],
  [5, 12],
  [9, 12],
  [8, 15],
];
function makeCase(prev) {
  let k;
  do {
    const t = TRIPLES[Math.floor(Math.random() * TRIPLES.length)];
    k = { a: t[0], b: t[1] };
  } while (prev && k.a === prev.a && k.b === prev.b);
  return k;
}
const dedupe4 = (cands) => {
  const seen = new Set();
  const out = [];
  for (const v of cands) {
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
    if (out.length === 4) break;
  }
  return out.sort((x, y) => x - y).map(String);
};
const cSqTruth = (k) => cSquared(k.a, k.b);
const cSqChips = (k) =>
  dedupe4([
    cSquared(k.a, k.b),
    (k.a + k.b) * (k.a + k.b),
    cSquared(k.a, k.b) - k.a * k.b,
    2 * k.a * k.b,
  ]);
const cTruth = (k) => cOf(k.a, k.b);
const cChips = (k) => {
  const c = cTruth(k);
  return dedupe4([c, k.a + k.b, k.b + 2, c + 4, k.a + k.b + 2, c - 2, c + 1]);
};
const calibChecks = (k, sqPick, cPick) => {
  if (!k) return [false, false];
  const sqOK = sqPick != null && sqPick === String(cSqTruth(k));
  const cOK = sqOK && cPick != null && cPick === String(cTruth(k));
  return [sqOK, cOK];
};
const closeness = (k, s, c) =>
  Math.round((100 * calibChecks(k, s, c).filter(Boolean).length) / 2);
const isCalibrated = (k, s, c) => calibChecks(k, s, c).every(Boolean);

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; the reveal lives in the feedback.
   The distractors are the real beliefs: that area needs a ruler, that
   (a+b)² is the answer, that a proof is many lucky checks.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'One frame, four triangles',
    body:
      'A square frame of side 3 + 4 = 7, and four gold copies of one right triangle with ' +
      'legs 3 and 4. Switch between the two packings and watch the carmine space that is ' +
      'left over.',
    a: 3,
    b: 4,
    arr: 'tilt',
    toggle: true,
    q: 'Repack the four triangles. What happens to the leftover space?',
    choices: [
      'It stays 25 — the same frame minus the same four triangles, however they sit',
      'It depends on the arrangement',
      'It shrinks as the pieces spread out',
    ],
    answer: 0,
    feedback:
      'The frame holds 49 unit squares; the four triangles cover 24 of them wherever ' +
      'they lie. What remains is always 49 − 24 = 25. Hold that thought: every packing ' +
      'is a different-shaped receipt for the same leftover area.',
  },
  {
    title: 'The tilted square',
    body:
      'Tuck one triangle into each corner. The leftover is a single tilted square — and ' +
      'each of its four sides is a hypotenuse, c.',
    a: 3,
    b: 4,
    arr: 'tilt',
    toggle: false,
    q: 'What is the tilted square’s area — before anyone measures c?',
    choices: [
      '25 — it is the leftover, and the leftover is 49 − 24; so c² = 25',
      'Unknown until c is measured with a ruler',
      '28 — tilted squares hold a little extra',
    ],
    answer: 0,
    feedback:
      'c² = 25, and no ruler was involved. It really is a square: all four sides are c, ' +
      'and at each notch the triangle’s two sharp angles together make a right angle, so ' +
      'every corner closes square. The square on the hypotenuse, priced by subtraction.',
  },
  {
    title: 'The two squares',
    body:
      'Same frame, same four triangles — now paired into two rectangles. The leftover ' +
      'is two squares: one on each leg.',
    a: 3,
    b: 4,
    arr: 'packs',
    toggle: true,
    q: 'Two packings, one leftover. Conclusion?',
    choices: [
      'c² = a² + b² — both leftovers equal 49 − 24, so the hypotenuse square equals the leg squares together',
      'The squares only look equal',
      'It works for legs 3 and 4 only',
    ],
    answer: 0,
    feedback:
      'That is the whole proof. The tilted square (c²) and the pair (a² + b² = 9 + 16) ' +
      'are both the same 25, because each is the same frame minus the same triangles. ' +
      'No measuring, no approximating — one area, counted two ways.',
  },
  {
    title: 'Every pair of legs',
    body: 'The legs are yours now. Dial a and b, flip the packings, and read the ledger.',
    a: 3,
    b: 4,
    arr: 'tilt',
    toggle: true,
    dials: true,
    q: 'Set the legs to 6 and 8. The square on the hypotenuse holds…',
    choices: [
      '100 — the frame 196 minus 96 of triangle; and 36 + 64 agrees',
      '196 — the whole frame, (a + b)²',
      '48 — twice the triangle pair',
    ],
    answer: 0,
    feedback:
      'c² = 100, both ways. The tempting wrong answer is (a + b)² = 196 — it forgets the ' +
      'four triangles still standing inside the frame. The identity survives every pair ' +
      'of legs you can dial, and the ledger shows why, each time.',
  },
  {
    title: 'Why this is a proof',
    body: 'One more look at the machine — no new pieces, just the reasoning.',
    a: 5,
    b: 12,
    arr: 'packs',
    toggle: true,
    dials: true,
    q: 'What makes this a PROOF, not a lucky check?',
    choices: [
      'Same frame, same four triangles, two ways to leave space — the leftovers must match, whatever a and b are',
      'We measured c very carefully',
      'We tried many triangles and it kept working',
    ],
    answer: 0,
    feedback:
      'Nothing was measured; areas were counted. Because the argument never used the ' +
      'values of a and b, it holds for every right triangle at once. The distance bench ' +
      'and the solid benches have spent this identity for years — here it is earned.',
  },
  {
    title: 'The mason’s stamp',
    body:
      'A right triangle is posted: two legs. Rule the square on the hypotenuse, then the ' +
      'hypotenuse itself. Both exact, or no stamp.',
    a: 3,
    b: 4,
    arr: 'tilt',
    toggle: true,
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function PythagorasLab() {
  const [legA, setLegA] = useState(3);
  const [legB, setLegB] = useState(4);
  const [arr, setArr] = useState('tilt');
  const [sqPick, setSqPick] = useState(null);
  const [cPick, setCPick] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [kase, setKase] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const a = calib && kase ? kase.a : legA;
  const b = calib && kase ? kase.b : legB;

  const checks = calib ? calibChecks(kase, sqPick, cPick) : [false, false];
  const pct = calib && kase ? closeness(kase, sqPick, cPick) : 0;
  const calibrated = calib && kase ? isCalibrated(kase, sqPick, cPick) : false;

  sceneRef.current = { a, b, arr, calib };

  /* ---- full redraw from state ------------------------------------------- */
  const draw = useCallback(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    if (W === 0 || H === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const INK_SOFT = '#5b6b7b';
    const S = sceneRef.current;
    ctx.clearRect(0, 0, W, H);

    /* quadrille paper */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.5)';
    const gs = 26;
    ctx.beginPath();
    for (let x = gs; x < W; x += gs) {
      ctx.moveTo(Math.round(x) + 0.5, 0);
      ctx.lineTo(Math.round(x) + 0.5, H);
    }
    for (let y = gs; y < H; y += gs) {
      ctx.moveTo(0, Math.round(y) + 0.5);
      ctx.lineTo(W, Math.round(y) + 0.5);
    }
    ctx.stroke();

    const bandH = 50;
    const side = S.a + S.b;
    const ledgerW = S.calib ? 0 : Math.min(240, W * 0.34);
    const plotX0 = 18;
    const plotX1 = W - ledgerW - 18;
    const plotY0 = bandH + 16;
    const plotY1 = H - 20;
    const scale = Math.min((plotX1 - plotX0) / (side + 1), (plotY1 - plotY0) / (side + 1));
    const ox = plotX0 + ((plotX1 - plotX0) - side * scale) / 2;
    const oy = plotY1 - ((plotY1 - plotY0) - side * scale) / 2;
    const px = (X, Y) => [ox + X * scale, oy - Y * scale];

    const poly = (pts, fill, stroke, lw) => {
      ctx.beginPath();
      ctx.moveTo(...px(pts[0][0], pts[0][1]));
      for (let i = 1; i < pts.length; i++) ctx.lineTo(...px(pts[i][0], pts[i][1]));
      ctx.closePath();
      if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
      }
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lw;
        ctx.stroke();
      }
    };

    const { triangles, leftovers } = PACKINGS[S.arr].pieces(S.a, S.b);
    for (const L of leftovers) poly(L, 'rgba(200,30,79,0.16)', CARMINE, 2);
    for (const T of triangles) poly(T, 'rgba(185,135,24,0.32)', GOLD, 1.6);
    poly(
      [[0, 0], [side, 0], [side, side], [0, side]],
      null,
      BLUE,
      2.4
    );

    /* labels on the pieces */
    ctx.font = '700 13px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (S.arr === 'tilt') {
      const cx = (S.a + S.b) / 2;
      ctx.fillStyle = CARMINE;
      ctx.fillText('c²', ...px(cx, cx));
      ctx.fillStyle = INK_HEX;
      ctx.font = '600 11.5px ui-monospace, monospace';
      ctx.fillText('a', ...px(S.a / 2, -0.45));
      ctx.fillText('b', ...px(S.a + S.b / 2, -0.45));
      ctx.fillText('c', ...px(S.a + S.b / 2 + 0.35, S.a / 2 + 0.35));
    } else {
      ctx.fillStyle = CARMINE;
      ctx.fillText('a²', ...px(S.a / 2, S.a / 2));
      ctx.fillText('b²', ...px(S.a + S.b / 2, S.a + S.b / 2));
      ctx.fillStyle = INK_HEX;
      ctx.font = '600 11.5px ui-monospace, monospace';
      ctx.fillText('a', ...px(S.a / 2, -0.45));
      ctx.fillText('b', ...px(S.a + S.b / 2, -0.45));
    }

    /* the mason's ledger */
    if (!S.calib) {
      const tx = W - ledgerW + 4;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = INK_SOFT;
      ctx.font = 'italic 600 11.5px system-ui, sans-serif';
      ctx.fillText('the mason’s ledger', tx, bandH + 8);
      ctx.font = '600 11px ui-monospace, monospace';
      const F = frameArea(S.a, S.b);
      const T4 = triArea4(S.a, S.b);
      const L = leftoverOf(S.a, S.b);
      ctx.fillStyle = BLUE;
      ctx.fillText(`frame  (a+b)² = ${F}`, tx, bandH + 30);
      ctx.fillStyle = GOLD;
      ctx.fillText(`triangles  2ab = ${T4}`, tx, bandH + 48);
      ctx.fillStyle = INK_HEX;
      ctx.fillText(`leftover  ${F} − ${T4} = ${L}`, tx, bandH + 66);
      ctx.fillStyle = CARMINE;
      if (S.arr === 'tilt') {
        ctx.fillText(`one square: c² = ${L}`, tx, bandH + 92);
      } else {
        ctx.fillText(`two squares: ${S.a * S.a} + ${S.b * S.b} = ${L}`, tx, bandH + 92);
      }
      ctx.fillText(`c² = a² + b²`, tx, bandH + 116);
    }

    /* ---- the readout band ---- */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CARMINE;
    ctx.font = '700 14.5px ui-monospace, monospace';
    ctx.fillText(
      S.calib
        ? `legs ${S.a} and ${S.b} · price the leftover yourself`
        : `legs a = ${S.a}, b = ${S.b} · frame ${side} × ${side}`,
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
    const st = STEPS[step];
    setLegA(st.a);
    setLegB(st.b);
    setArr(st.arr);
    setSqPick(null);
    setCPick(null);
    if (st.calib) setKase(makeCase(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const reset = () => {
    setLegA(current.a);
    setLegB(current.b);
    setArr(current.arr);
    setSqPick(null);
    setCPick(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* accessibility — the spoken summary for screen readers */
  const spoken = calib
    ? `The stamp: legs ${a} and ${b}. Hypotenuse square ruled ${sqPick ?? 'nothing'}; hypotenuse ${cPick ?? 'unruled'}. ${calibrated ? 'Calibrated.' : ''}`
    : `Legs ${a} and ${b}; frame ${frameArea(a, b)}; triangles ${triArea4(a, b)}; leftover ${leftoverOf(a, b)} as ${
        arr === 'tilt' ? 'one tilted square' : `two squares, ${a * a} plus ${b * b}`
      }.`;

  return (
    <div className="pylab">
      <header className="head">
        <h1>Pythagoras: Four Triangles, Two Squares, One Identity</h1>
        <p className="lede">
          One frame, four copies of a right triangle, two ways to pack them. The leftover
          is once a tilted square (<span className="mono">c²</span>) and once two squares (
          <span className="mono">a² + b²</span>) — and it is the <em>same</em> leftover.
          That is the proof.
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

          {current.dials && (
            <div className="dials">
              <div className="dial">
                <div className="dial-head">
                  <span className="dial-k">leg a</span>
                  <span className="dial-v mono">a = {legA}</span>
                </div>
                <input
                  type="range"
                  min={LEG_MIN}
                  max={LEG_MAX}
                  step={1}
                  value={legA}
                  onChange={(e) => setLegA(Number(e.target.value))}
                  aria-label={`Leg a, ${legA}`}
                />
              </div>
              <div className="dial">
                <div className="dial-head">
                  <span className="dial-k">leg b</span>
                  <span className="dial-v mono">b = {legB}</span>
                </div>
                <input
                  type="range"
                  min={LEG_MIN}
                  max={LEG_MAX}
                  step={1}
                  value={legB}
                  onChange={(e) => setLegB(Number(e.target.value))}
                  aria-label={`Leg b, ${legB}`}
                />
              </div>
            </div>
          )}

          <div className="toolbar" role="group" aria-label="Packings">
            {current.toggle &&
              packingIds.map((id) => (
                <button
                  type="button"
                  key={id}
                  className={'chipbtn' + (arr === id ? ' active' : '')}
                  onClick={() => setArr(id)}
                >
                  {PACKINGS[id].label}
                </button>
              ))}
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
                {current.choices.map((c, i) => {
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
                      {c}
                    </button>
                  );
                })}
              </div>
              {answered && <p className="feedback">{current.feedback}</p>}
            </div>
          )}

          {calib && kase && (
            <div className="calib">
              <div className="target-card">
                <span className="target-k">The posted triangle</span>
                <span className="target-word">
                  legs {kase.a} and {kase.b}
                </span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>
                    {checks[0] ? '✓' : '·'} the hypotenuse square c², ruled
                  </li>
                  <li className={checks[1] ? 'done' : ''}>
                    {checks[1] ? '✓' : '·'} the hypotenuse c, ruled
                  </li>
                </ol>
                <div className="declare" role="group" aria-label="Hypotenuse square ruling">
                  {cSqChips(kase).map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn mono' + (sqPick === c2 ? ' active' : '')}
                      onClick={() => setSqPick(c2)}
                    >
                      c² = {c2}
                    </button>
                  ))}
                </div>
                <div className="declare" role="group" aria-label="Hypotenuse ruling">
                  {cChips(kase).map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn mono' + (cPick === c2 ? ' active' : '')}
                      onClick={() => setCPick(c2)}
                    >
                      c = {c2}
                    </button>
                  ))}
                </div>
                <span className="target-hint mono">
                  {calibrated
                    ? 'both ruled, exactly — the wall stands'
                    : checks[0]
                      ? 'c² ruled — which number squares to it?'
                      : 'price the leftover first'}
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
                  <span className="mono target-hint">the square · then its side</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setKase(makeCase(kase));
                  setSqPick(null);
                  setCPick(null);
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
                  setSqPick(null);
                  setCPick(null);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">same frame · same triangles · same leftover</span>{' '}
        &nbsp;·&nbsp; the square on the hypotenuse and the two leg squares are both the
        frame minus the four triangles — counted, never measured.
      </footer>

      <style jsx>{`
        .pylab {
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
        :global(.pylab) :focus-visible {
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
