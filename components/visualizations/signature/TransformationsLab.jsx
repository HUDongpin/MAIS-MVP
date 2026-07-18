'use client';

/* ============================================================================
   TransformationsLab — an interactive "bench" for the RIGID MOTIONS:
   translations, reflections and rotations as THINGS YOU DO — presses on a
   chain — with exact coordinate rules, and the inventory of what every
   move preserves.

        slide: (x, y) → (x+2, y)     flip: (x, y) → (−x, y)
        quarter-turn: (x, y) → (−y, x)
        every move keeps lengths and angles; only flips reverse the lettering

   Built for MAIS (math AI system, www.mais.ac), K-12.  A GRADE 8 lab —
   CCSS 8.G.A.1 ("verify experimentally the properties of rotations,
   reflections, and translations: lines go to lines, segments to segments
   of the same length, angles to angles of the same measure, parallel lines
   to parallel lines"), 8.G.A.3 (describe the effect of the motions on
   coordinates), and the on-ramp to 8.G.A.2 — whose DEFINITION of
   congruence is the next bench's whole story and is deliberately not
   spoken here.  8.G.A is the largest uncovered domain in this library;
   this lab opens it.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   a staged lesson that unlocks one capability per step, predict-then-check
   questions gated on ANSWERED (not correct), and a calibration challenge
   with a live meter and a CALIBRATED stamp that cannot fire falsely.

   THE SIGNATURE CENTERPIECE — "THE MOVE CHAIN, AND THE LETTERING."
     A blue FLAG — deliberately lopsided, so its facing is visible — sits
     on the grid, and its carmine IMAGE answers a chain of pressed MOVES:
     slides, flips over the two axes, quarter-turns about the origin.
     Every press is an exact integer rule stamped in the readout, and the
     PRESERVATION PANEL runs the 8.G.A.1 experiment live: the image's side
     lengths (squared, exact) always match the original's — no move can
     stretch anything — while the LETTERING (the way the flag faces) obeys
     a subtler law: slides and turns keep it, flips reverse it, and TWO
     flips bring it back.  Composition is the second act: flip across, then
     flip up-and-down, and the result is a single half-turn — moves combine
     into moves, which is the fact the congruence bench will build on.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library, and reflection
   devices are owned FIVE times over):
     • SymmetryLab owns the mirror CENSUS — reflecting a figure ONTO ITSELF
       and counting the lines that work.  Nothing here ever lands on
       itself: the image is carried to a NEW place, and the phrase is
       banned from this file.  A symmetry is a special motion; this lab
       teaches the motions, that one taught the specialness.
     • ParallelogramLab owns the half-turn about the centre M as the proof
       of the parallelogram's properties.  The half-turn appears here only
       as a COMPOSITE — the product of two flips — about the origin, of a
       figure with no properties to prove.
     • AbsoluteValueLab's fold, LogarithmLab's y = x mirror, and
       CommutativeLab's crease stay untouched: no graph is reflected, the
       mirror lines here are exactly the two AXES, and no table appears.
     • PointLab owns the ordered pair as an ADDRESS lesson.  Coordinates
       appear here as the NOTATION the standard demands for rules — no
       smear, no route arrows, no address language.
     • TranslateLab (despite the name) is about translating WORDS into
       algebra — expression trees.  No kinship: here "translation" is the
       geometric slide, and the header says so to spare the next reader
       the double-take.
     • Roadmap G3 owns the congruence DEFINITION; G4 owns dilations.  The
       words "congruent" and "similar" and every scale factor are refused
       outright — this lab moves things and takes inventory, nothing more.

   One-accent discipline: CARMINE is THE IMAGE — the moved figure, the
   chain, the rule readout.  BLUE is the pre-image (the given).  GOLD is
   the PROBE — one tracked vertex whose coordinates narrate each rule.
   GREEN is reserved for the target ghost, "correct", and CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a fourteen-year-old):
     • Every vertex is an INTEGER pair and every move is an exact integer
       map — slide (x±2, y), (x, y±2); flips (−x, y), (x, −y); quarter-turn
       (−y, x) — so every stated fact is integer arithmetic: the audit
       re-applies every chain and compares coordinates exactly.
     • Preservation is PROVED, not asserted: the multiset of squared side
       lengths is re-derived after every move in the audit, over every
       chain in an exhaustive bounded walk; the orientation (the shoelace
       sign — exact) reverses precisely when the flip count is odd, and
       that identity is checked across the same walk.
     • The base flag is certified ASYMMETRIC in the audit (no non-identity
       combination of the lab's moves maps it onto its own place), so a
       landed image determines its vertex correspondence and the capstone's
       equality test cannot be gamed.
     • The calibration stamp needs two facts at once: the image's vertex
       set equals the target's EXACTLY, and the lettering is declared
       correctly (flipped or unflipped — the target's orientation forced
       it; the declaration checks who knows that).  Audited over every
       docket target × landing and non-landing chains × both declarations.
   Verified by audit-transformations.mjs (numeric proof + source greps) and
   verify-transformations.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/TransformationsLab.jsx
     2. Import and render it:
          import TransformationsLab from './TransformationsLab';
          export default function Page() { return <TransformationsLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the move chain,
              the lesson step, answers, the order, the lettering plea).
     MODEL  — exact integer maps and invariants; it knows nothing of pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  No dials: MOVES are chips pressed into a chain,
   with an honest Undo (the SignedNumbersLab chain, grown a dimension).
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the image: the moved figure, the chain, the rule
const BLUE = '#3f74a6'; // the pre-image — the given
const GOLD = '#b98718'; // the probe vertex
const INK_HEX = '#1c2b3a';

const WIN = 9; // vertices stay within ±WIN; chips disable rather than exit
const CALIB_STEP = 6;

/* the flag: lopsided on purpose — its facing is part of the picture */
const BASE = [[1, 1], [5, 1], [5, 2], [2, 2], [2, 4], [1, 4]];

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Exact integer maps; invariants derived, never stored.
   ------------------------------------------------------------------------- */
const MOVES = {
  tR: { label: 'slide → 2', rule: '(x, y) → (x+2, y)', f: ([x, y]) => [x + 2, y] },
  tL: { label: 'slide ← 2', rule: '(x, y) → (x−2, y)', f: ([x, y]) => [x - 2, y] },
  tU: { label: 'slide ↑ 2', rule: '(x, y) → (x, y+2)', f: ([x, y]) => [x, y + 2] },
  tD: { label: 'slide ↓ 2', rule: '(x, y) → (x, y−2)', f: ([x, y]) => [x, y - 2] },
  fy: { label: 'flip over the up axis', rule: '(x, y) → (−x, y)', f: ([x, y]) => [-x, y], flip: true },
  fx: { label: 'flip over the across axis', rule: '(x, y) → (x, −y)', f: ([x, y]) => [x, -y], flip: true },
  r90: { label: 'quarter-turn about O', rule: '(x, y) → (−y, x)', f: ([x, y]) => [-y, x] },
};
const MOVE_KEYS = ['tR', 'tL', 'tU', 'tD', 'fy', 'fx', 'r90'];

const applyMove = (pts, key) => pts.map(MOVES[key].f);
const applyChain = (base, chain) => chain.reduce((p, key) => applyMove(p, key), base);
const inWindow = (pts) => pts.every(([x, y]) => Math.abs(x) <= WIN && Math.abs(y) <= WIN);
const canPress = (base, chain, key) => inWindow(applyMove(applyChain(base, chain), key));

/* the 8.G.A.1 inventory: squared side lengths, exact */
const edgeSq = (pts) =>
  pts
    .map((p, i) => {
      const q = pts[(i + 1) % pts.length];
      return (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;
    })
    .sort((a, b) => a - b);
/* the lettering: the shoelace sign — exact integers */
const orientation = (pts) => {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.sign(s);
};
const flipsOf = (chain) => chain.filter((k) => MOVES[k].flip).length;
const sameSet = (a, b) => {
  const key = (pts) => pts.map(([x, y]) => `${x},${y}`).sort().join('|');
  return key(a) === key(b);
};

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "The mover's order."  A green target placement is
   posted; press a chain that lands the image EXACTLY on it, then declare
   the lettering.  Any chain that lands is legal — moves compose.
   ------------------------------------------------------------------------- */
const DOCKET = [
  { id: 'm1', chain: ['r90', 'tR', 'tR'] },
  { id: 'm2', chain: ['fy', 'tR', 'tD'] },
  { id: 'm3', chain: ['tU', 'tR', 'tR'] },
  { id: 'm4', chain: ['fx', 'r90', 'tU', 'tR'] },
  { id: 'm5', chain: ['r90', 'r90', 'tR', 'tU'] },
];
const targetPts = (kase) => applyChain(BASE, kase.chain);
function makeCase(prevId) {
  let c;
  do {
    c = DOCKET[Math.floor(Math.random() * DOCKET.length)];
  } while (prevId && c.id === prevId);
  return c;
}
const calibChecks = (kase, chain, plea) => {
  if (!kase) return [false, false];
  const img = applyChain(BASE, chain);
  const tgt = targetPts(kase);
  const landed = sameSet(img, tgt);
  const flippedTruth = orientation(tgt) !== orientation(BASE);
  return [landed, landed && plea != null && plea === (flippedTruth ? 'flipped' : 'unflipped')];
};
const closeness = (kase, chain, plea) =>
  Math.round((100 * calibChecks(kase, chain, plea).filter(Boolean).length) / 2);
const isCalibrated = (kase, chain, plea) => calibChecks(kase, chain, plea).every(Boolean);

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; chips unlock with the steps; the
   reveal lives in the feedback.  The distractors are the real beliefs:
   that moves stretch things, that flips are just slides, that two flips
   make a bigger flip.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'The flag, and the slide',
    body:
      'A lopsided blue flag on the grid — lopsided ON PURPOSE, so you can always see which ' +
      'way it faces. Press a slide: every vertex obeys the same rule at once, and the carmine ' +
      'image is the flag, elsewhere.',
    chips: ['tR', 'tL', 'tU', 'tD'],
    chain: [],
    q: 'Press slide → 2. The gold vertex (1, 4) lands on…',
    choices: ['(3, 4) — the rule (x, y) → (x+2, y), applied to it like everyone else', '(1, 6)', '(2, 8)'],
    answer: 0,
    feedback:
      'On (3, 4): a slide adds to EVERY vertex the same amounts — that is 8.G.A.3’s whole ' +
      'content for translations, written as a rule. Nothing turned, nothing faced differently, ' +
      'nothing changed size: the flag simply lives two squares to the right now.',
  },
  {
    title: 'The flip',
    body:
      'Press the flip over the up axis: (x, y) → (−x, y). Look twice — the image is the same ' +
      'size, the same shape… and it reads BACKWARDS.',
    chips: ['fy'],
    chain: [],
    q: 'Under (x, y) → (−x, y), the vertex (4, 1) lands on…',
    choices: ['(−4, 1) — same height, mirrored across', '(4, −1)', '(−4, −1)'],
    answer: 0,
    feedback:
      '(−4, 1): the flip negates x and leaves y alone. And notice what no slide could do: the ' +
      'flag now faces the other way. Keep an eye on that facing — it is the one property in ' +
      'this lab with a story of its own.',
  },
  {
    title: 'The quarter-turn',
    body:
      'Press the quarter-turn about the origin: (x, y) → (−y, x). The whole flag pivots a ' +
      'quarter of a full turn, counterclockwise — and keeps its facing.',
    chips: ['r90'],
    chain: [],
    q: 'Under (x, y) → (−y, x), the vertex (4, 1) lands on…',
    choices: ['(−1, 4) — y’s opposite steps in front, x follows', '(1, −4)', '(−4, −1)'],
    answer: 0,
    feedback:
      '(−1, 4). The quarter-turn’s rule swaps the coordinates and negates the new first one — ' +
      'press it four times and every vertex comes home, which is exactly what “a quarter” ' +
      'promises. Unlike the flip, the lettering still reads forwards: turning is not flipping.',
  },
  {
    title: 'The inventory — what every move keeps',
    body:
      'The preservation panel is on. Chain any moves you like and watch the ledger: the ' +
      'image’s side lengths match the flag’s, every time, move after move.',
    chips: ['tR', 'tL', 'tU', 'tD', 'fy', 'fx', 'r90'],
    chain: [],
    panel: true,
    q: 'Across all these moves, which property is the odd one out — kept by some, reversed by others?',
    choices: [
      'The facing (the lettering) — slides and turns keep it; flips reverse it',
      'The side lengths — turns shrink them a little',
      'The number of vertices',
    ],
    answer: 0,
    feedback:
      'The facing. Lengths, angles, straightness, parallel sides — every move on this bench ' +
      'preserves them all (that is 8.G.A.1, verified live in the ledger). The lettering alone ' +
      'splits the moves into two families: the ones that keep it, and the flips. Tally your ' +
      'flips: odd tally, backwards flag.',
  },
  {
    title: 'Moves compose',
    body:
      'Press flip over the across axis, then flip over the up axis. Compare with pressing the ' +
      'quarter-turn twice. Two different chains — where does the flag land?',
    chips: ['fx', 'fy', 'r90'],
    chain: [],
    panel: true,
    q: 'Flip across, then flip up-and-down. The combined effect equals…',
    choices: [
      'One half-turn about the origin — and the lettering reads forwards again',
      'A bigger flip',
      'A slide',
    ],
    answer: 0,
    feedback:
      'A half-turn: (x, y) → (x, −y) → (−x, −y), which is exactly two quarter-turns. Two flips ' +
      'un-reverse the lettering — the same even/odd music as the sign of a product. Moves ' +
      'combine into moves: that closure is the engine the next geometry bench will run on.',
  },
  {
    title: 'The rules, in one place',
    body:
      'The 8.G.A.3 card: slide (x±a, y±b) · flip over the up axis (−x, y) · flip over the ' +
      'across axis (x, −y) · quarter-turn (−y, x). Chain freely and watch the probe narrate.',
    chips: ['tR', 'tL', 'tU', 'tD', 'fy', 'fx', 'r90'],
    chain: [],
    panel: true,
    q: 'Which rule is the quarter-turn about the origin?',
    choices: ['(x, y) → (−y, x)', '(x, y) → (−x, −y)', '(x, y) → (y, x)'],
    answer: 0,
    feedback:
      '(−y, x). Its square, (−y, x) applied twice, gives (−x, −y) — the half-turn — and (y, x) ' +
      'is no turn at all but a flip over a diagonal line, a move this bench deliberately does ' +
      'not own. Rules make the motions portable: no picture needed, just arithmetic.',
  },
  {
    title: 'The mover’s order',
    body:
      'A green ghost is posted — the flag’s destination. Press any chain that lands the ' +
      'carmine image EXACTLY on it, then declare the lettering: flipped, or not. (The ghost ' +
      'already decided; the declaration checks whether you can read it.)',
    chips: ['tR', 'tL', 'tU', 'tD', 'fy', 'fx', 'r90'],
    chain: [],
    panel: true,
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function TransformationsLab() {
  const [chain, setChain] = useState([]);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [kase, setKase] = useState(null);
  const [plea, setPlea] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const img = applyChain(BASE, chain);
  const flips = flipsOf(chain);

  const checks = calib ? calibChecks(kase, chain, plea) : [false, false];
  const pct = calib && kase ? closeness(kase, chain, plea) : 0;
  const calibrated = calib && kase ? isCalibrated(kase, chain, plea) : false;

  sceneRef.current = {
    img,
    flips,
    panel: !!current.panel,
    calib,
    tgt: calib && kase ? targetPts(kase) : null,
    lastRule: chain.length > 0 ? MOVES[chain[chain.length - 1]].rule : null,
  };

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

    const bandH = 58;
    const cx = W / 2;
    const cy = bandH + (H - bandH) / 2;
    const k = Math.min((W - 40) / (2 * WIN + 2), (H - bandH - 36) / (2 * WIN + 2));
    const px = (X, Y) => [cx + X * k, cy - Y * k];

    /* the grid IS the coordinate plane here (8.G.A.3 needs it) */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.55)';
    ctx.beginPath();
    for (let v = -WIN; v <= WIN; v++) {
      const [gx] = px(v, 0);
      ctx.moveTo(gx, cy - WIN * k);
      ctx.lineTo(gx, cy + WIN * k);
      const [, gy] = px(0, v);
      ctx.moveTo(cx - WIN * k, gy);
      ctx.lineTo(cx + WIN * k, gy);
    }
    ctx.stroke();
    /* axes */
    ctx.strokeStyle = 'rgba(28,43,58,0.55)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx - WIN * k, cy);
    ctx.lineTo(cx + WIN * k, cy);
    ctx.moveTo(cx, cy - WIN * k);
    ctx.lineTo(cx, cy + WIN * k);
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = INK_SOFT;
    ctx.font = '600 10px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('O', cx + 8, cy + 5);
    for (const v of [-8, -4, 4, 8]) {
      ctx.fillText(String(v), cx + v * k, cy + 5);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(v), cx - 6, cy - v * k);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
    }

    const poly = (pts, stroke, fill, width, dash) => {
      ctx.save();
      if (dash) ctx.setLineDash(dash);
      ctx.beginPath();
      pts.forEach(([X, Y], i) => {
        const [dx, dy] = px(X, Y);
        if (i === 0) ctx.moveTo(dx, dy);
        else ctx.lineTo(dx, dy);
      });
      ctx.closePath();
      if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
      }
      ctx.strokeStyle = stroke;
      ctx.lineWidth = width;
      ctx.stroke();
      ctx.restore();
    };

    /* the target ghost (capstone) */
    if (S.tgt) poly(S.tgt, '#1f8a5b', 'rgba(31,138,91,0.07)', 2, [6, 5]);

    /* the pre-image: blue, the given */
    poly(BASE, BLUE, 'rgba(63,116,166,0.13)', 2.2);
    /* the image: carmine, the object */
    poly(S.img, CARMINE, 'rgba(200,30,79,0.12)', 2.6);

    /* the probe vertex: BASE[5] = (1,4) and its image */
    {
      const [bx, by] = px(BASE[5][0], BASE[5][1]);
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.arc(bx, by, 5, 0, 2 * Math.PI);
      ctx.fill();
      const ip = S.img[5];
      const [ix, iy] = px(ip[0], ip[1]);
      ctx.beginPath();
      ctx.arc(ix, iy, 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.fillStyle = GOLD;
      ctx.font = '700 11.5px ui-monospace, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`(${ip[0]}, ${ip[1]})`, ix + 9, iy - 4);
    }

    /* ---- the readout band: rule + inventory ---- */
    ctx.textBaseline = 'middle';
    ctx.font = '700 15px ui-monospace, monospace';
    const flipped = S.flips % 2 === 1;
    const parts = [];
    if (S.lastRule) parts.push([`last move: ${S.lastRule}`, CARMINE]);
    else parts.push(['press a move — the image obeys', INK_SOFT]);
    if (S.panel) {
      parts.push(['   ·   ', INK_SOFT]);
      parts.push(['sides: kept', INK_HEX]);
      parts.push(['   ·   ', INK_SOFT]);
      parts.push([`lettering: ${flipped ? 'reversed' : 'kept'} (${S.flips} flip${S.flips === 1 ? '' : 's'})`, flipped ? CARMINE : '#1f8a5b']);
    }
    const totalW = parts.reduce((a, [s]) => a + ctx.measureText(s).width, 0);
    let xPen = Math.max(12, W / 2 - totalW / 2);
    ctx.textAlign = 'left';
    for (const [s, col] of parts) {
      ctx.fillStyle = col;
      ctx.fillText(s, xPen, bandH / 2);
      xPen += ctx.measureText(s).width;
    }
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
    setChain(STEPS[step].chain.slice());
    if (STEPS[step].calib) {
      setKase(makeCase(null));
      setPlea(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const press = (key) => {
    if (!canPress(BASE, chain, key)) return;
    setChain((c) => [...c, key]);
  };
  const undo = () => setChain((c) => c.slice(0, -1));
  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const reset = () => {
    setChain(STEPS[step].chain.slice());
    setPlea(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const spoken = calib
    ? `The mover's order: land the flag on the green ghost. Chain of ${chain.length} moves; ${flips} flips. ` +
      `Plea: ${plea ?? 'none'}. ${calibrated ? 'Calibrated.' : ''}`
    : `Chain of ${chain.length} moves (${chain.map((kk) => MOVES[kk].label).join(', ') || 'none yet'}); ` +
      `sides kept; lettering ${flips % 2 === 1 ? 'reversed' : 'kept'}.`;

  return (
    <div className="tflab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Rigid Motions: Slide, Flip, Turn</h1>
        <p className="lede">
          Moves are <em>things you do</em>: each press stamps an exact rule —{' '}
          <span className="mono">(x, y) → (x+2, y)</span>, <span className="mono">(−x, y)</span>,{' '}
          <span className="mono">(−y, x)</span> — every move keeps lengths and angles, and only
          the flips reverse the flag’s lettering.
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

          <div className="toolbar" role="group" aria-label="Moves">
            {current.chips.map((key) => (
              <button
                type="button"
                key={key}
                className={'chipbtn' + (MOVES[key].flip ? ' neg' : '')}
                disabled={!canPress(BASE, chain, key)}
                onClick={() => press(key)}
              >
                {MOVES[key].label}
              </button>
            ))}
            <button type="button" className="btn ghost" onClick={undo} disabled={chain.length === 0}>
              Undo
            </button>
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
                <span className="target-k">The order</span>
                <span className="target-word">land the flag on the ghost</span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>
                    {checks[0] ? '✓' : '·'} the image sits on the target, vertex for vertex
                  </li>
                  <li className={checks[1] ? 'done' : ''}>{checks[1] ? '✓' : '·'} the lettering declared</li>
                </ol>
                <div className="declare" role="group" aria-label="Lettering">
                  <button
                    type="button"
                    className={'declbtn' + (plea === 'unflipped' ? ' active' : '')}
                    onClick={() => setPlea('unflipped')}
                  >
                    reads forwards
                  </button>
                  <button
                    type="button"
                    className={'declbtn' + (plea === 'flipped' ? ' active' : '')}
                    onClick={() => setPlea('flipped')}
                  >
                    reads backwards
                  </button>
                </div>
                <span className="target-hint mono">
                  {calibrated
                    ? 'moved, and read correctly — any landing chain was legal'
                    : checks[0]
                      ? 'landed — now read the ghost’s facing'
                      : 'slides place it; flips and turns aim it'}
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
                  <span className="mono target-hint">land · then read</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setKase(makeCase(kase.id));
                  setChain([]);
                  setPlea(null);
                }}
              >
                Next order
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
                  setPlea(null);
                  setChain([]);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">slide · flip · turn — lengths kept, lettering tallied</span>{' '}
        &nbsp;·&nbsp; rotations, reflections and translations preserve segments, angles and
        parallel lines (CCSS 8.G.A.1), each wears an exact coordinate rule (8.G.A.3), and moves
        compose into moves — the engine the next geometry bench runs on.
      </footer>

      <style jsx>{`
        .tflab {
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
        .chipbtn.neg {
          border-color: rgba(200, 30, 79, 0.55);
          color: var(--carmine);
        }
        .chipbtn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .chipbtn:not(:disabled):hover {
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
          font: 700 12.5px/1 system-ui, sans-serif;
          padding: 8px 11px;
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
        :global(.tflab) :focus-visible {
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
