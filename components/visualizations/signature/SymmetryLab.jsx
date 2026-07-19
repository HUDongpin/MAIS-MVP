'use client';

/* ============================================================================
   SymmetryLab — an interactive "bench" for LINES OF SYMMETRY: the fold line
   across which a figure lands exactly on itself — and, above all, HOW MANY
   such lines one figure has.

        a mirror line is a TEST a line passes, not a decoration —
        and the survivors can be COUNTED: the count belongs to the figure

   Built for MAIS (math AI system, www.mais.ac), K-12.  A GRADE 4 lab — CCSS
   4.G.A.3 ("Recognize a line of symmetry for a two-dimensional figure as a
   line across the figure such that the figure can be folded along the line
   into matching parts.  Identify line-symmetric figures and draw lines of
   symmetry.")  The standard asks for two verbs — RECOGNIZE one line, and
   IDENTIFY/DRAW them all — and the second verb is the one classrooms skip:
   knowing that the square has exactly FOUR mirror lines, not "some".

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   a staged lesson that unlocks one capability per step, predict-then-check
   questions gated on ANSWERED (not correct), and a calibration challenge with
   a live meter and a CALIBRATED stamp that cannot fire falsely.

   THE SIGNATURE CENTERPIECE — "THE MIRROR CENSUS."
     One figure.  One candidate mirror line, pivoting at the figure's centre
     on a dial.  The test is drawn, not asserted: the gold GHOST is the
     figure's reflection across the candidate, and either it lands exactly on
     the figure (the candidate is a TRUE mirror line — claim it, and it joins
     the census in carmine) or it visibly misses (the claim is refused).  The
     lab's owned claim is the CENSUS itself: the mirror lines of a figure can
     be counted, and the count is a property of the figure —

         parallelogram 0 · kite 1 · rectangle 2 · equilateral triangle 3
         square 4 · regular pentagon 5 · regular hexagon 6

     — seven figures realizing every count from 0 to 6 exactly once (the
     audit proves the ladder).  Two traps carry the pedagogy: the RECTANGLE'S
     DIAGONAL (the single most common wrong answer in Grade 4 — the diagonal
     halves are the same size, but same size is not the test; the folded
     corners land crooked), and the PARALLELOGRAM'S ZERO (it looks balanced,
     and it IS balanced about its centre — but that is a different symmetry,
     the one the Parallelogram bench proves — and not one fold works).

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library, and reflection
   devices are already owned FOUR times over):
     • AbsoluteValueLab owns THE FOLD as an animated device: a graph's
       below-axis half swinging up through a dihedral angle to become the V.
       This lab has no graph, no function, no animation at all — the ghost is
       a static reflection, and nothing here ever moves by itself
       (requestAnimationFrame is grep-banned).
     • LogarithmLab owns the y = x mirror and the reflected twin as the
       picture of an INVERSE FUNCTION.  No coordinate line is ever written
       here; the candidate mirror is a line ON PAPER, not a graph IN A PLANE.
     • CommutativeLab owns the operation TABLE and the crease down a = b.
       No table, no cells, and the word "crease" never appears.
     • ParallelogramLab owns the HALF-TURN about the centre — the figure
       landing on itself after a 180° turn.  Nothing in this lab turns a
       figure: the only symmetry tested here is the FOLD, and the
       parallelogram is this lab's ZERO precisely because the fold is not
       the turn.  (The kinship is acknowledged in the lesson, the device is
       refused in the code.)
     • ShapesLab owns the NAME FUNCTION (attributes → name, orientation
       ignored) and rotating a shape under a fixed name plate.  Here no shape
       is ever named FROM its attributes and nothing rotates; the names are
       mere labels, and the question is never "what is it called?" but
       always "how many mirror lines does it own?"
     • QuadraticFunctionLab owns the parabola's axis of symmetry (a graph's
       mirror); IntegerLab owns the mirror at 0 on a number line; TrapezoidLab
       mentions the isosceles trapezoid's mirror in passing.  No curve, no
       number line, no trapezoid here.
     • PointLab owns the coordinate plane.  The quadrille here is PAPER, not
       a plane: no axes, no origin, no ordered pairs, no coordinates.

   One-accent discipline: CARMINE is THE SYMMETRY — the claimed mirror lines
   and the census count.  The figure itself is quiet BLUE (the known object
   under study); the candidate line and its ghost are GOLD (the tool, the
   test in progress); GREEN is reserved for "correct" and CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a nine-year-old):
     • Every figure is a data table of SPOKES — (angle°, radius) pairs with
       INTEGER angles — and the mirror test is EXACT INTEGER ARITHMETIC:
       reflecting the direction θ across the line at angle φ gives 2φ − θ
       (mod 360), so "the ghost lands on the figure" is a multiset equality
       of integer pairs.  There is no epsilon anywhere in this file.
     • A mirror line is DERIVED, never declared: isAxis() recomputes the
       multiset test from the shipped spokes on every call, and the audit
       re-derives every figure's full axis set by brute force over all 360
       half-degree candidate lines through the centre — and proves the
       pencil-through-centre is COMPLETE (every mirror line of a bounded
       figure passes through its balance point, so the audit also recomputes
       each figure's vertex centroid and confirms it sits at the pivot).
     • The census ladder is proved, not styled: the seven counts are exactly
       {0,1,2,3,4,5,6}, the rectangle's diagonal genuinely fails, the
       square's genuinely passes, and every true axis lands on the dial's
       3° grid so the census is always completable.
     • The calibration stamp needs two facts at once: EVERY true mirror line
       claimed (claims of false lines are refused by the same isAxis gate,
       so they can never pollute the census), AND the declared count equal
       to the true count.  Audited over every figure × partial censuses ×
       every declaration 0–6.
   Verified by audit-symmetry.mjs (numeric proof + source greps) and
   verify-symmetry.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/SymmetryLab.jsx
     2. Import and render it:
          import SymmetryLab from './SymmetryLab';
          export default function Page() { return <SymmetryLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the figure, the
              mirror dial, the census, the lesson step, answers, the target).
     MODEL  — pure integer arithmetic on spokes; it knows nothing of pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  ONE dial: the candidate mirror line's tilt.  Steps of
   3° so every true mirror line of every figure is reachable exactly (the
   audit proves the coverage), and 0..177 because a mirror at φ and at φ+180
   is the same line.
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the symmetry: claimed mirror lines, the census
const BLUE = '#3f74a6'; // the figure under study
const GOLD = '#b98718'; // the candidate line and its ghost — the test
const INK_HEX = '#1c2b3a';

const DIAL = { key: 'phi', label: 'mirror line', min: 0, max: 177, step: 3, unit: '°' };
const START_PHI = 90;
const CALIB_STEP = 6;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Figures as SPOKES: (integer angle°, radius) pairs around
   the pivot.  All mirror-test arithmetic is integer and exact.
   ------------------------------------------------------------------------- */
const mod360 = (a) => ((a % 360) + 360) % 360;

/* the mirror test: reflecting direction θ across the line at angle φ gives
   2φ − θ.  A figure passes iff every reflected spoke is again a spoke. */
function isAxis(spokes, phi) {
  return spokes.every(([t, r]) =>
    spokes.some(([t2, r2]) => t2 === mod360(2 * phi - t) && r2 === r)
  );
}
/* the census, derived: every dial-reachable candidate that passes */
function axesOf(spokes) {
  const out = [];
  for (let phi = DIAL.min; phi <= DIAL.max; phi += DIAL.step) {
    if (isAxis(spokes, phi)) out.push(phi);
  }
  return out;
}

/* the figure table.  Counts are DERIVED by axesOf, never stored.  The seven
   figures realize every census count from 0 to 6 exactly once. */
const FIGS = [
  { id: 'para', label: 'parallelogram', spokes: [[25, 7], [155, 4], [205, 7], [335, 4]] },
  { id: 'kite', label: 'kite', spokes: [[90, 7], [210, 4], [270, 3], [330, 4]] },
  { id: 'rect', label: 'rectangle', spokes: [[30, 6], [150, 6], [210, 6], [330, 6]] },
  { id: 'eqtri', label: 'equilateral triangle', spokes: [[90, 6], [210, 6], [330, 6]] },
  { id: 'square', label: 'square', spokes: [[45, 6], [135, 6], [225, 6], [315, 6]] },
  { id: 'pent', label: 'regular pentagon', spokes: [[18, 6], [90, 6], [162, 6], [234, 6], [306, 6]] },
  { id: 'hex', label: 'regular hexagon', spokes: [[0, 6], [60, 6], [120, 6], [180, 6], [240, 6], [300, 6]] },
];
const figById = (id) => FIGS.find((f) => f.id === id);
const countOf = (fig) => axesOf(fig.spokes).length;

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "The axis census."  A figure is drawn from the
   ladder; the surveyor must CLAIM every mirror line it truly has and then
   DECLARE the count.  False claims are refused by the same isAxis gate that
   admits true ones, so the census can never be padded; the stamp needs the
   census COMPLETE and the declaration RIGHT.
   ------------------------------------------------------------------------- */
function makeTarget(prevId) {
  let f;
  do {
    f = FIGS[Math.floor(Math.random() * FIGS.length)];
  } while (f.id === prevId);
  return f.id;
}
const calibChecks = (figId, claimed, declared) => {
  const axes = axesOf(figById(figId).spokes);
  const censusDone = axes.every((a) => claimed.includes(a));
  return [censusDone, declared != null && declared === axes.length];
};
const closeness = (figId, claimed, declared) =>
  Math.round((100 * calibChecks(figId, claimed, declared).filter(Boolean).length) / 2);
const isCalibrated = (figId, claimed, declared) =>
  calibChecks(figId, claimed, declared).every(Boolean);

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; the scene is pinned; the reveal lives
   in the feedback.  The distractors are the real beliefs: that the
   rectangle's diagonal is a mirror line, that "looking balanced" is the
   test, that the square has only 2.  Next is gated on ANSWERED.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'The mirror test',
    body:
      'One square, one line through its centre, and the gold ghost: the figure reflected across ' +
      'that line — what would land where, if you folded along it. Here the ghost lands EXACTLY on ' +
      'the square.',
    fig: 'square',
    lockDial: true,
    q: 'When the folded copy lands exactly on the figure, the line is called…',
    choices: ['A line of symmetry', 'A diagonal', 'An edge of the shape'],
    answer: 0,
    feedback:
      'A line of symmetry — a mirror line. It is a TEST a line passes, not a decoration: fold ' +
      'along it and the two halves match part for part. Most lines through a figure fail the ' +
      'test; the next step lets you hunt for the ones that pass.',
  },
  {
    title: 'Turn the mirror',
    body:
      'The dial is live. Turn the candidate line and watch the ghost: mostly it misses — the fold ' +
      'lands the square crooked — and at a few special tilts it clicks exactly onto the figure.',
    fig: 'square',
    q: 'Before you hunt them all down: how many mirror lines will this square turn out to have?',
    choices: ['4', '2', 'Infinitely many'],
    answer: 0,
    feedback:
      'Exactly 4: one upright, one flat (through the middles of the sides), and both diagonals. ' +
      'The dial finds them at 0°, 45°, 90° and 135°. Not "some", not "many" — a square owns ' +
      'exactly four, and that number is as much a fact about the square as its four equal sides.',
  },
  {
    title: 'The census',
    body:
      'Now you can CLAIM a line. When the ghost lands exactly, press Claim and the line joins the ' +
      'census in carmine. Claim all four of the square’s mirror lines. A miss cannot be claimed — ' +
      'try it and the lab refuses.',
    fig: 'square',
    claim: true,
    q: 'Two different mirror lines of the same figure — where do they cross each other?',
    choices: ['At the centre of the figure', 'At a corner', 'They never cross'],
    answer: 0,
    feedback:
      'At the centre. Every mirror line of a figure runs through its balance point — that is why ' +
      'the candidate line pivots there, and why your four claimed lines make a little star ' +
      'through the middle of the square.',
  },
  {
    title: 'The diagonal trap',
    body:
      'A rectangle. Set the mirror along the diagonal — corner to corner — and look hard at the ' +
      'ghost before you answer.',
    fig: 'rect',
    claim: true,
    q: 'Is the rectangle’s diagonal a line of symmetry?',
    choices: [
      'No — the folded copy lands crooked; only 2 lines work',
      'Yes — 4, just like the square',
      'Yes — any line through the centre works',
    ],
    answer: 0,
    feedback:
      'Not a mirror line. The diagonal cuts the rectangle into two halves of the same size — but ' +
      'SAME SIZE IS NOT THE TEST. Fold along the diagonal and the corners land sticking out: the ' +
      'halves do not match. A rectangle owns exactly 2 mirror lines (0° and 90°); the square ' +
      'earns its 2 extra because its sides are all equal, which is what lets the diagonal fold ' +
      'close.',
  },
  {
    title: 'The family ladder',
    body:
      'Regular figures, where every side and corner matches: the equilateral triangle, the ' +
      'regular pentagon, the regular hexagon. Census each one and watch the counts climb.',
    chips: ['eqtri', 'pent', 'hex'],
    fig: 'eqtri',
    claim: true,
    q: 'The regular pentagon — how many mirror lines?',
    choices: ['5', '4', '10'],
    answer: 0,
    feedback:
      'Exactly 5 — a regular figure with n sides owns exactly n mirror lines: triangle 3, ' +
      'square 4, pentagon 5, hexagon 6. Count the mirrors and you have counted the regularity. ' +
      'And notice the odd/even difference: the pentagon’s lines each run from a corner to the ' +
      'middle of the opposite side; the hexagon’s split half corner-to-corner, half ' +
      'side-to-side.',
  },
  {
    title: 'One and none',
    body:
      'The other end of the ladder. The kite has exactly ONE mirror line. And the parallelogram — ' +
      'hunt as long as you like — has NONE.',
    chips: ['kite', 'para'],
    fig: 'kite',
    claim: true,
    q: 'The parallelogram looks balanced. How many mirror lines does it have?',
    choices: ['0 — no fold works', '2 — the diagonals', '1 — the long middle'],
    answer: 0,
    feedback:
      'Zero. It IS balanced about its centre point — but that is a different symmetry (the ' +
      'Parallelogram bench proves that one), and balance is not folding. Every candidate line ' +
      'lands the ghost crooked, diagonals included. A figure can be symmetric in one sense and ' +
      'own not a single mirror line — that is why the census is worth taking.',
  },
  {
    title: 'The axis census',
    body:
      'A figure arrives for survey. Claim every mirror line it truly has — the lab refuses false ' +
      'claims — then declare the count. Complete census, correct declaration: CALIBRATED.',
    claim: true,
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function SymmetryLab() {
  const [figId, setFigId] = useState('square');
  const [phi, setPhi] = useState(START_PHI);
  const [claimed, setClaimed] = useState([]);
  const [claimMsg, setClaimMsg] = useState(null);
  const [declared, setDeclared] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const fig = figById(figId);
  const axes = axesOf(fig.spokes);
  const hit = isAxis(fig.spokes, phi);

  const pct = calib ? closeness(figId, claimed, declared) : 0;
  const calibrated = calib ? isCalibrated(figId, claimed, declared) : false;
  const checks = calib ? calibChecks(figId, claimed, declared) : [false, false];

  sceneRef.current = { figId, phi, claimed, hit, claimMsg, lockDial: !!current.lockDial };

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
    const F = figById(S.figId);

    ctx.clearRect(0, 0, W, H);

    /* quadrille paper — paper, not a plane: no axes, no numbers */
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

    const bandH = 52;
    const cx = W / 2;
    const cy = bandH + (H - bandH) / 2;
    const k = Math.min(W, H - bandH) / 17; // pixels per spoke unit

    const toXY = ([t, r]) => [cx + r * k * Math.cos((t * Math.PI) / 180), cy - r * k * Math.sin((t * Math.PI) / 180)];
    const tracePoly = (spokes) => {
      const pts = [...spokes].sort((a, b) => a[0] - b[0]).map(toXY);
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.closePath();
    };

    /* claimed mirror lines — the census, in carmine */
    const lineAt = (ang, style, width, dash) => {
      const L = 8.4 * k;
      const dx = Math.cos((ang * Math.PI) / 180);
      const dy = -Math.sin((ang * Math.PI) / 180);
      ctx.save();
      if (dash) ctx.setLineDash(dash);
      ctx.strokeStyle = style;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(cx - L * dx, cy - L * dy);
      ctx.lineTo(cx + L * dx, cy + L * dy);
      ctx.stroke();
      ctx.restore();
    };
    S.claimed.forEach((a) => lineAt(a, 'rgba(200,30,79,0.75)', 2));

    /* the figure — quiet blue, the known object */
    tracePoly(F.spokes);
    ctx.fillStyle = 'rgba(63,116,166,0.16)';
    ctx.fill();
    ctx.strokeStyle = BLUE;
    ctx.lineWidth = 2.4;
    ctx.stroke();

    /* the pivot — the figure's balance point, where every mirror must pass */
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, 2 * Math.PI);
    ctx.fill();

    /* the candidate line — gold, the test in progress */
    lineAt(S.phi, GOLD, 2, [7, 5]);

    /* the ghost — the reflection across the candidate.  Exact integer angles;
       only the pixels are floating point. */
    const ghost = F.spokes.map(([t, r]) => [mod360(2 * S.phi - t), r]);
    tracePoly(ghost);
    ctx.strokeStyle = 'rgba(185,135,24,0.9)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    /* the verdict band */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (S.claimMsg) {
      ctx.fillStyle = S.claimMsg.ok ? CARMINE : INK_SOFT;
      ctx.font = 'italic 600 15px system-ui, sans-serif';
      ctx.fillText(S.claimMsg.text, W / 2, bandH / 2);
    } else if (S.hit) {
      ctx.fillStyle = CARMINE;
      ctx.font = '600 16px system-ui, sans-serif';
      ctx.fillText('the ghost lands exactly — this line passes the mirror test', W / 2, bandH / 2);
    } else {
      ctx.fillStyle = INK_SOFT;
      ctx.font = 'italic 600 15px system-ui, sans-serif';
      ctx.fillText('the ghost misses — not a mirror line', W / 2, bandH / 2);
    }

    /* the census tally */
    ctx.fillStyle = CARMINE;
    ctx.font = '700 13px ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`census: ${S.claimed.length} claimed`, 14, H - 16);
    ctx.fillStyle = INK_SOFT;
    ctx.font = 'italic 12px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(F.label, W - 14, H - 16);
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
    const s = STEPS[step];
    if (s.fig) setFigId(s.fig);
    if (s.lockDial) setPhi(START_PHI);
    if (s.calib) {
      setFigId(makeTarget(null));
      setDeclared(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* a fresh figure starts a fresh census */
  useEffect(() => {
    setClaimed([]);
    setClaimMsg(null);
    setDeclared(null);
  }, [figId]);

  /* ---- interaction ------------------------------------------------------- */
  const claimLine = () => {
    if (isAxis(fig.spokes, phi)) {
      if (claimed.includes(phi)) {
        setClaimMsg({ ok: true, text: 'already in the census — find another' });
      } else {
        setClaimed((prev) => [...prev, phi]);
        setClaimMsg({ ok: true, text: 'claimed — a true mirror line joins the census' });
      }
    } else {
      setClaimMsg({ ok: false, text: 'refused — the ghost does not land, so there is nothing to claim' });
    }
  };
  useEffect(() => {
    if (claimMsg == null) return;
    const t = setTimeout(() => setClaimMsg(null), 1600);
    return () => clearTimeout(t);
  }, [claimMsg]);

  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const reset = () => {
    setClaimed([]);
    setDeclared(null);
    setPhi(START_PHI);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const spoken = calib
    ? `The axis census: surveying a ${fig.label}. ${claimed.length} mirror lines claimed. ${
        declared == null ? 'No count declared yet.' : `Declared ${declared}.`
      } ${calibrated ? 'Calibrated.' : ''}`
    : `A ${fig.label} with the candidate mirror at ${phi} degrees: ${
        hit ? 'the reflection lands exactly on the figure.' : 'the reflection misses.'
      } ${claimed.length} mirror lines claimed so far.`;

  return (
    <div className="symlab">
      <header className="head">
        <h1>Lines of Symmetry: The Mirror Census</h1>
        <p className="lede">
          A line of symmetry is a <em>test</em> a line passes — fold the figure along it and the
          halves must <em>land on each other</em>. And the lines that pass can be{' '}
          <em>counted</em>: <span className="mono">parallelogram 0 · kite 1 · rectangle 2 ·
          triangle 3 · square 4</span> — the count belongs to the figure.
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
            <div className={'dial' + (current.lockDial ? ' locked' : '')}>
              <div className="dial-head">
                <span className="dial-k">
                  {DIAL.label} {current.lockDial && <span className="lock">🔒</span>}
                </span>
                <span className="dial-v mono">
                  {phi}
                  {DIAL.unit}
                </span>
              </div>
              <input
                type="range"
                min={DIAL.min}
                max={DIAL.max}
                step={DIAL.step}
                value={phi}
                disabled={!!current.lockDial}
                onChange={(e) => setPhi(Number(e.target.value))}
                aria-label={`Candidate mirror line angle, ${phi} degrees`}
              />
            </div>
          </div>

          <div className="toolbar" role="group" aria-label="Census controls">
            {current.chips &&
              current.chips.map((id) => (
                <button
                  type="button"
                  key={id}
                  className={'chipbtn' + (figId === id ? ' active' : '')}
                  onClick={() => setFigId(id)}
                >
                  {figById(id).label}
                </button>
              ))}
            {current.claim && (
              <button type="button" className="btn claim" onClick={claimLine}>
                Claim this line
              </button>
            )}
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

          {calib && (
            <div className="calib">
              <div className="target-card">
                <span className="target-k">Under survey</span>
                <span className="target-word">{fig.label}</span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>
                    {checks[0] ? '✓' : '·'} every mirror line claimed ({claimed.length} so far)
                  </li>
                  <li className={checks[1] ? 'done' : ''}>
                    {checks[1] ? '✓' : '·'} the count declared correctly
                  </li>
                </ol>
                <div className="declare" role="group" aria-label="Declare the count">
                  {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                    <button
                      type="button"
                      key={n}
                      className={'declbtn' + (declared === n ? ' active' : '')}
                      onClick={() => setDeclared(n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <span className="target-hint mono">
                  {calibrated
                    ? 'census complete, count confirmed'
                    : checks[0]
                      ? 'census complete — now declare how many'
                      : 'turn the mirror, claim what lands'}
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
                  <span className="mono target-hint">claim · then declare</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setFigId(makeTarget(figId));
                  setDeclared(null);
                }}
              >
                New figure
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
                  setFigId('square');
                  setPhi(START_PHI);
                  setClaimed([]);
                  setDeclared(null);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">fold, test, count</span> &nbsp;·&nbsp; a line of symmetry folds a
        figure onto itself; a figure owns a countable number of them — from the parallelogram’s
        zero to the regular hexagon’s six (CCSS 4.G.A.3). Same size is not the test; landing is.
      </footer>

      <style jsx>{`
        .symlab {
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
        .dial.locked {
          opacity: 0.55;
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
        .lock {
          font-size: 11px;
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
        }
        .chipbtn {
          font: 600 12.5px/1.2 system-ui, sans-serif;
          padding: 8px 11px;
          border-radius: 8px;
          cursor: pointer;
          border: 1.5px solid rgba(28, 43, 58, 0.28);
          background: var(--paper);
          color: var(--ink);
          transition: border-color 0.15s, background 0.15s;
        }
        .chipbtn.active {
          border-color: var(--blue);
          background: rgba(63, 116, 166, 0.1);
          color: var(--blue);
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
        .btn.claim {
          border-color: var(--carmine);
          background: var(--carmine);
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
          font-size: 24px;
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
          font: 700 13px/1 var(--mono);
          width: 34px;
          height: 30px;
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
        :global(.symlab) :focus-visible {
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
