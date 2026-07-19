'use client';

/* ============================================================================
   LimitLab — an interactive "bench" for the LIMIT and CONTINUITY: two
   walkers approach the same input from opposite sides, and the limit is
   the destination they agree on — while the function's value AT the point
   has no vote at all.

        lim f(x) as x → 2  =  where BOTH walkers are heading
        f(2) itself — defined, missing, or defiant — is IRRELEVANT to it
        continuous at 2  ⟺  the limit exists AND equals f(2)

   Built for MAIS (math AI system, www.mais.ac), K-12.  An AP CALCULUS
   on-ramp lab — the foundation DerivativeLab has used for years without
   stating (its h → 0 is a limit), and the formal name for what
   RationalFunctionLab's table walker was careful to call only "settles
   toward".  That bench refused the L-word on purpose; this bench is where
   the word lives.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   a staged lesson that unlocks one capability per step, predict-then-check
   questions gated on ANSWERED (not correct), and a calibration challenge
   with a live meter and a CALIBRATED stamp that cannot fire falsely.

   THE SIGNATURE CENTERPIECE — "THE TWO WALKERS, AND THE DEFIANT DOT."
     Two gold walkers step toward x = 2 — one from the left, one from the
     right — on exact fractional footholds (2 ± 1/10, 1/100, 1/1000…), and
     the readout tracks the heights under their feet.  When both columns
     head to the same number, THAT NUMBER is the limit: a statement about
     the approach, never about the arrival.  The star witness is the
     DEFIANT DOT: a function equal to x + 1 everywhere except that some
     vandal has moved f(2) to 5.  Both walkers still head to 3.  The limit
     is 3.  The dot can sit wherever it likes — the limit does not consult
     it.  Then CONTINUITY arrives as bookkeeping: three questions (does
     the limit exist? does f(2) exist? are they equal?) and one word for
     three-yes: continuous.  The four presets fail and pass in all the
     instructive ways: smooth, holed, defiant, and the jump whose walkers
     never agree.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • RationalFunctionLab owns the hole-vs-wall diagnosis and the table
       that cannot tell; it deliberately never says "limit".  This bench
       inherits its walker gesture, NAMES the destination, and returns the
       favor by citing the hole as "a limit that exists at a point the
       function skipped."  No cancellation algebra returns here — the
       presets are piecewise-linear, chosen so approach values are exact.
     • DerivativeLab owns h → 0 secants and the tangent; nothing here
       differentiates, and no secant is drawn.  This bench is the ground
       that one stands on, built after it — the library's "upside down"
       debt, paid.
     • FunctionLab owns the one-output promise; the defiant dot is a legal
       function (one output at 2 — just a strange one), and the lab says
       so to prevent a false arrest.
     • IrrationalLab owns endless decimal zoom; the walkers take finitely
       many exact steps and never claim to finish — "heading to" is
       computed as the exact gap shrinking below every posted bound.

   One-accent discipline: CARMINE is THE LIMIT — the destination line and
   the verdict.  BLUE is the function (its branches and its value-dot).
   GOLD is the WALKERS — their footholds and their height columns.  GREEN
   is reserved for "correct" and CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a student):
     • Every preset is PIECEWISE LINEAR with integer coefficients, so every
       walker height at a ± 1/10^k is an EXACT fraction (integer cross-
       multiplication; the audit recomputes every quoted row).  No float
       ever decides a stated fact.
     • "Heading to L" is exact bookkeeping, not impression: for these
       linear pieces the gap |f(a ± 1/q) − L| equals |slope|/q exactly, and
       the audit verifies the gap at every dial depth and that it shrinks
       by the promised factor of 10 per step.
     • The verdicts are DERIVED: the one-sided destinations are the linear
       pieces' values AT a (computed by evaluating the piece, not stored);
       limit exists ⟺ they agree; continuous ⟺ limit exists AND f(a)
       defined AND equal — the audit re-derives all four presets' verdicts
       and the reason each discontinuous one fails.
     • The calibration stamp needs two facts at once: the LIMIT ruling
       (its exact value, or "no limit"), AND the CONTINUITY ruling with
       the right REASON (all agree / no value at 2 / value sits elsewhere /
       the walkers disagree).  Audited over every preset × every chip pair.
   Verified by audit-limit.mjs (numeric proof + source greps) and
   verify-limit.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/LimitLab.jsx
     2. Import and render it:
          import LimitLab from './LimitLab';
          export default function Page() { return <LimitLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the preset, the
              walk depth, the lesson step, answers, the rulings).
     MODEL  — exact piecewise-linear arithmetic; it knows nothing of pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  Presets by chip; the walk depth by dial.
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the limit: destination line, verdict
const BLUE = '#3f74a6'; // the function: branches and value-dot
const GOLD = '#b98718'; // the walkers
const INK_HEX = '#1c2b3a';

const A = 2; // every story happens at x = 2
const WALK_MAX = 4; // footholds: 2 ± 1/10 … 2 ± 1/10^4
const CALIB_STEP = 5;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Piecewise-linear presets; exact walker arithmetic.
   left/right: [slope, intercept] on each side of A; atValue: f(A) or null.
   ------------------------------------------------------------------------- */
const PRESETS = {
  smooth: {
    label: 'the smooth road',
    left: [1, 1],
    right: [1, 1],
    atValue: { n: 3, d: 1 },
    story: 'f(x) = x + 1, everywhere — even at 2',
  },
  holed: {
    label: 'the missing plank',
    left: [1, 1],
    right: [1, 1],
    atValue: null,
    story: 'f(x) = x + 1, except f(2) is undefined',
  },
  defiant: {
    label: 'the defiant dot',
    left: [1, 1],
    right: [1, 1],
    atValue: { n: 5, d: 1 },
    story: 'f(x) = x + 1, except someone moved f(2) to 5',
  },
  jump: {
    label: 'the jump',
    left: [0, 1],
    right: [0, 4],
    atValue: { n: 4, d: 1 },
    story: 'f(x) = 1 below 2; f(x) = 4 from 2 onward',
  },
};
const presetIds = Object.keys(PRESETS);

const gcdInt = (a, b) => (b === 0 ? Math.abs(a) : gcdInt(b, a % b));
const frac = (n, d) => {
  const s = d < 0 ? -1 : 1;
  const g = gcdInt(n, d) || 1;
  return { n: (s * n) / g, d: (s * d) / g };
};
const fracText = (f) => (f == null ? 'undefined' : f.d === 1 ? String(f.n) : `${f.n}/${f.d}`);
const fracEq = (a, b) => a != null && b != null && a.n * b.d === b.n * a.d;

/* the walker's exact height at x = A ∓ 1/q on the given piece [m, b]:
   f = m(A ∓ 1/q) + b = (m(Aq ∓ 1) + bq)/q */
const heightAt = (piece, side, q) => {
  const [m, b] = piece;
  const p = side === 'L' ? A * q - 1 : A * q + 1;
  return frac(m * p + b * q, q);
};
/* the one-sided destination: the piece evaluated AT x = A (exact) */
const destOf = (piece) => frac(piece[0] * A + piece[1], 1);
/* the verdicts, derived */
const limitOf = (P) => {
  const L = destOf(P.left);
  const R = destOf(P.right);
  return fracEq(L, R) ? L : null;
};
const continuityOf = (P) => {
  const lim = limitOf(P);
  if (lim == null) return { cont: false, reason: 'walkers-disagree' };
  if (P.atValue == null) return { cont: false, reason: 'no-value' };
  if (!fracEq(lim, P.atValue)) return { cont: false, reason: 'value-elsewhere' };
  return { cont: true, reason: 'all-agree' };
};

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "The continuity tribunal."  A preset is posted;
   rule on the limit (its value, or none), then on continuity with the
   right reason.
   ------------------------------------------------------------------------- */
function makeCase(prevId) {
  let id;
  do {
    id = presetIds[Math.floor(Math.random() * presetIds.length)];
  } while (id === prevId);
  return id;
}
const LIMIT_CHIPS = ['3', '5', 'no limit'];
const REASON_CHIPS = [
  { id: 'all-agree', label: 'continuous — all three agree' },
  { id: 'no-value', label: 'not continuous — no value at 2' },
  { id: 'value-elsewhere', label: 'not continuous — the value sits elsewhere' },
  { id: 'walkers-disagree', label: 'not continuous — the walkers disagree' },
];
const limitTruthChip = (P) => {
  const lim = limitOf(P);
  return lim == null ? 'no limit' : fracText(lim);
};
const calibChecks = (presetId, limitPick, reasonPick) => {
  if (!presetId) return [false, false];
  const P = PRESETS[presetId];
  const limOK = limitPick != null && limitPick === limitTruthChip(P);
  const truth = continuityOf(P);
  return [limOK, limOK && reasonPick != null && reasonPick === truth.reason];
};
const closeness = (presetId, limitPick, reasonPick) =>
  Math.round((100 * calibChecks(presetId, limitPick, reasonPick).filter(Boolean).length) / 2);
const isCalibrated = (presetId, limitPick, reasonPick) =>
  calibChecks(presetId, limitPick, reasonPick).every(Boolean);

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; the reveal lives in the feedback.
   The distractors are the real beliefs: that the limit IS the value, that
   a missing point kills the limit, that one walker is enough.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'The two walkers',
    body:
      'A straight road, f(x) = x + 1, and two gold walkers stepping toward x = 2 — one from ' +
      'each side, footholds at 2 ± 1/10, 1/100, 1/1000. Deepen the walk and read their ' +
      'heights: both columns head for the same number.',
    preset: 'smooth',
    q: 'Both walkers’ heights head to 3. What is that a statement ABOUT?',
    choices: [
      'The approach — where the heights are heading as the footholds close in',
      'The arrival — what f(2) equals',
      'The walkers’ speed',
    ],
    answer: 0,
    feedback:
      'The approach. "The limit of f(x) as x approaches 2 is 3" is a claim about the JOURNEY ' +
      '— the heights get as close to 3 as anyone demands, from both sides. Here f(2) happens ' +
      'to be 3 as well, which makes the road smooth — but keep the two ideas apart. The next ' +
      'two presets pry them apart for you.',
  },
  {
    title: 'The missing plank',
    body:
      'Same road, one plank removed: f(2) is undefined — an open circle where the value ' +
      'should be. Walk again.',
    preset: 'holed',
    q: 'With f(2) undefined, what happens to the limit at 2?',
    choices: [
      'Nothing — both walkers still head to 3; the limit is 3, missing plank or not',
      'It becomes undefined too',
      'It becomes 0',
    ],
    answer: 0,
    feedback:
      'The limit is still 3. Neither walker ever stands ON 2 — footholds only APPROACH — so ' +
      'the missing plank never enters the calculation. (You have met this picture: the ' +
      'rational-function bench called it a hole and carefully said "settles toward". This ' +
      'bench finally names it: the limit exists at a point the function skipped.)',
  },
  {
    title: 'The defiant dot',
    body:
      'The vandal’s preset: f(x) = x + 1 everywhere, except someone moved f(2) up to 5. The ' +
      'blue dot sits defiantly at height 5. Walk.',
    preset: 'defiant',
    q: 'The dot sits at 5. The walkers head to 3. The limit at 2 is…',
    choices: [
      '3 — the limit consults the approach, never the dot; f(2) = 5 has no vote',
      '5 — the function’s value wins',
      '4 — split the difference',
    ],
    answer: 0,
    feedback:
      'The limit is 3, and this dot is the whole lesson: THE VALUE AT THE POINT IS IRRELEVANT ' +
      'TO THE LIMIT. (It is still a legal function — one output at 2, just a strange one; ' +
      'the function bench would acquit it.) A limit is where the neighborhood is pointing, ' +
      'not where the point is sitting. Nothing in calculus works until this sentence feels ' +
      'ordinary.',
  },
  {
    title: 'The jump — walkers can disagree',
    body:
      'A road built in two shelves: height 1 below x = 2, height 4 from 2 onward. The left ' +
      'walker strolls at 1; the right walker strolls at 4.',
    preset: 'jump',
    q: 'Left walker heads to 1, right walker to 4. The limit at 2 is…',
    choices: [
      'There is no limit — the two approaches disagree, and the limit demands one shared destination',
      '4 — the right walker wins because f(2) = 4',
      '2.5 — the average of the shelves',
    ],
    answer: 0,
    feedback:
      'No limit. Each ONE-SIDED approach is perfectly well behaved — from the left the ' +
      'heights head to 1, from the right to 4 — but "the limit" is the destination BOTH ' +
      'agree on, and here there is none. No average, no majority vote, no tiebreak by f(2): ' +
      'disagreement is simply the end of the matter.',
  },
  {
    title: 'Continuity — three questions',
    body:
      'Now the bookkeeping. CONTINUOUS AT 2 means three yeses: the limit exists; f(2) ' +
      'exists; they are equal. Flip through all four presets and score each one.',
    preset: 'smooth',
    chips: true,
    q: 'Which preset is continuous at 2 — and why do the other three fail differently?',
    choices: [
      'Only the smooth road: the plank fails “f(2) exists”, the dot fails “equal”, the jump fails “limit exists”',
      'All four — they are all mostly fine',
      'None — x = 2 is trouble everywhere',
    ],
    answer: 0,
    feedback:
      'One pass, three distinct failures — that is why the definition has three clauses. ' +
      'Continuity is the state of perfect agreement: the neighborhood points at the value, ' +
      'the value is there, and they match. Every discontinuity you will ever meet fails at ' +
      'least one clause, and NAMING the failed clause is the diagnosis.',
  },
  {
    title: 'The continuity tribunal',
    body:
      'A road is posted. First rule on the limit at 2 — its value, or “no limit”. Then rule ' +
      'on continuity, with the reason.',
    preset: 'smooth',
    chips: true,
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function LimitLab() {
  const [presetId, setPresetId] = useState('smooth');
  const [walkK, setWalkK] = useState(1);
  const [limitPick, setLimitPick] = useState(null);
  const [reasonPick, setReasonPick] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [kase, setKase] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const activeId = calib && kase ? kase : presetId;
  const P = PRESETS[activeId];

  const checks = calib ? calibChecks(activeId, limitPick, reasonPick) : [false, false];
  const pct = calib && kase ? closeness(activeId, limitPick, reasonPick) : 0;
  const calibrated = calib && kase ? isCalibrated(activeId, limitPick, reasonPick) : false;

  sceneRef.current = { P, walkK, calib };

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

    const INK = '#1c2b3a';
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

    const bandH = 54;
    const tableW = Math.min(250, W * 0.36);
    const plotX0 = 16;
    const plotX1 = W - tableW - 14;
    const plotY0 = bandH + 14;
    const plotY1 = H - 40;
    const XMIN = -1;
    const XMAX = 5;
    const YMIN = -1;
    const YMAX = 7;
    const kx = (plotX1 - plotX0) / (XMAX - XMIN);
    const ky = (plotY1 - plotY0) / (YMAX - YMIN);
    const px = (X, Y) => [plotX0 + (X - XMIN) * kx, plotY1 - (Y - YMIN) * ky];

    /* axes */
    ctx.strokeStyle = 'rgba(91,107,123,0.5)';
    ctx.lineWidth = 1.2;
    const [ox0, oy0] = px(0, 0);
    ctx.beginPath();
    ctx.moveTo(plotX0, oy0);
    ctx.lineTo(plotX1, oy0);
    ctx.moveTo(ox0, plotY0);
    ctx.lineTo(ox0, plotY1);
    ctx.stroke();
    ctx.fillStyle = INK_SOFT;
    ctx.font = '600 10px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let v = 1; v <= 4; v++) ctx.fillText(String(v), px(v, 0)[0], oy0 + 5);

    const evalPiece = (piece, X) => piece[0] * X + piece[1];

    /* the destination line, carmine dashed (when the limit exists) */
    const lim = limitOf(S.P);
    if (lim != null) {
      const Ly = lim.n / lim.d;
      const [, ly] = px(0, Ly);
      ctx.strokeStyle = 'rgba(200,30,79,0.5)';
      ctx.setLineDash([6, 5]);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(plotX0, ly);
      ctx.lineTo(plotX1, ly);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = CARMINE;
      ctx.font = '700 11.5px ui-monospace, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`the destination: ${fracText(lim)}`, plotX0 + 4, ly - 4);
    }

    /* the branches — blue, with an open circle at x = A on each side */
    ctx.strokeStyle = BLUE;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    {
      const [x1, y1] = px(XMIN, evalPiece(S.P.left, XMIN));
      const [x2, y2] = px(A, evalPiece(S.P.left, A));
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.stroke();
    ctx.beginPath();
    {
      const [x1, y1] = px(A, evalPiece(S.P.right, A));
      const [x2, y2] = px(XMAX, evalPiece(S.P.right, XMAX));
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.stroke();
    /* branch endpoints at A: open circles */
    for (const piece of [S.P.left, S.P.right]) {
      const [cx2, cy2] = px(A, evalPiece(piece, A));
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = BLUE;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(cx2, cy2, 5.5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    }
    /* the value-dot at A, filled blue (or nothing) */
    if (S.P.atValue != null) {
      const [vx, vy] = px(A, S.P.atValue.n / S.P.atValue.d);
      ctx.fillStyle = BLUE;
      ctx.beginPath();
      ctx.arc(vx, vy, 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }

    /* the walkers at the current depth */
    const q = 10 ** S.walkK;
    for (const side of ['L', 'R']) {
      const piece = side === 'L' ? S.P.left : S.P.right;
      const hx = A + (side === 'L' ? -1 : 1) / q;
      const h = heightAt(piece, side, q);
      const [wx, wy] = px(hx, h.n / h.d);
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.arc(wx, wy, 6.5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }

    /* the walker table */
    const tx = W - tableW + 6;
    ctx.fillStyle = INK_SOFT;
    ctx.font = 'italic 600 11.5px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('the walk toward x = 2', tx, bandH + 8);
    ctx.font = '600 11px ui-monospace, monospace';
    let rowY = bandH + 28;
    for (let k = 1; k <= S.walkK; k++) {
      const qq = 10 ** k;
      const hL = heightAt(S.P.left, 'L', qq);
      const hR = heightAt(S.P.right, 'R', qq);
      ctx.fillStyle = GOLD;
      ctx.fillText(`±1/${qq}`, tx, rowY);
      ctx.fillStyle = INK_HEX;
      ctx.fillText(`L: ${fracText(hL)}   R: ${fracText(hR)}`, tx + 62, rowY);
      rowY += 18;
    }
    ctx.fillStyle = CARMINE;
    ctx.fillText(
      lim != null ? `both heading to ${fracText(lim)}` : 'no shared destination',
      tx,
      rowY + 6
    );
    ctx.fillStyle = BLUE;
    ctx.fillText(`f(2) = ${fracText(S.P.atValue)}`, tx, rowY + 24);

    /* ---- the readout band ---- */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CARMINE;
    ctx.font = '700 15px ui-monospace, monospace';
    const c = continuityOf(S.P);
    ctx.fillText(
      `${S.P.story}${S.calib ? '' : c.cont ? '   ·   continuous at 2' : ''}`,
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
    setPresetId(STEPS[step].preset);
    setWalkK(1);
    setLimitPick(null);
    setReasonPick(null);
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
    setWalkK(1);
    setLimitPick(null);
    setReasonPick(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const lim = limitOf(P);
  const spoken = calib
    ? `The tribunal: ${P.story}. Limit ruled ${limitPick ?? 'nothing'}; continuity ${reasonPick ?? 'unruled'}. ${
        calibrated ? 'Calibrated.' : ''
      }`
    : `${P.story}. Walkers at depth ${walkK}: ${
        lim != null ? `both heading to ${fracText(lim)}` : 'no shared destination'
      }; f(2) = ${fracText(P.atValue)}.`;

  return (
    <div className="lmlab">
      <header className="head">
        <h1>Limits: Where the Walkers Are Heading</h1>
        <p className="lede">
          Two walkers approach <span className="mono">x = 2</span> on exact footholds; the{' '}
          <em>limit</em> is the destination both agree on — and the value at the point,
          defined, missing, or defiant, has <em>no vote</em>. Continuity is three yeses:
          limit, value, equal.
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

          <div className="dials">
            <div className="dial">
              <div className="dial-head">
                <span className="dial-k">the walk’s depth</span>
                <span className="dial-v mono">±1/{10 ** walkK}</span>
              </div>
              <input
                type="range"
                min={1}
                max={WALK_MAX}
                step={1}
                value={walkK}
                onChange={(e) => setWalkK(Number(e.target.value))}
                aria-label={`Walk depth, one over ${10 ** walkK}`}
              />
            </div>
          </div>

          <div className="toolbar" role="group" aria-label="Roads">
            {(current.chips || calib) &&
              !calib &&
              presetIds.map((id) => (
                <button
                  type="button"
                  key={id}
                  className={'chipbtn' + (presetId === id ? ' active' : '')}
                  onClick={() => setPresetId(id)}
                >
                  {PRESETS[id].label}
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
                <span className="target-k">Before the tribunal</span>
                <span className="target-word">{P.label}</span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>{checks[0] ? '✓' : '·'} the limit at 2, ruled</li>
                  <li className={checks[1] ? 'done' : ''}>
                    {checks[1] ? '✓' : '·'} continuity, ruled with the reason
                  </li>
                </ol>
                <div className="declare" role="group" aria-label="Limit ruling">
                  {LIMIT_CHIPS.map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn mono' + (limitPick === c2 ? ' active' : '')}
                      onClick={() => setLimitPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <div className="declare" role="group" aria-label="Continuity ruling">
                  {REASON_CHIPS.map((r) => (
                    <button
                      type="button"
                      key={r.id}
                      className={'declbtn reason' + (reasonPick === r.id ? ' active' : '')}
                      onClick={() => setReasonPick(r.id)}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                <span className="target-hint mono">
                  {calibrated
                    ? 'ruled, twice, with reasons — the tribunal rests'
                    : checks[0]
                      ? 'limit ruled — now the three questions'
                      : 'walk first; rule on the destination'}
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
                  <span className="mono target-hint">the limit · then continuity</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setKase(makeCase(kase));
                  setLimitPick(null);
                  setReasonPick(null);
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
                  setLimitPick(null);
                  setReasonPick(null);
                  setPresetId('smooth');
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">the approach votes · the point does not</span> &nbsp;·&nbsp; the
        limit is the destination both one-sided walks agree on; continuity at a point is the
        triple agreement — limit exists, value exists, and they match. DerivativeLab’s h → 0
        finally has a floor to stand on.
      </footer>

      <style jsx>{`
        .lmlab {
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
        :global(.lmlab) :focus-visible {
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
