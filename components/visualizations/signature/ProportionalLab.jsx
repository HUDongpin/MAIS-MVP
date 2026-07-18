'use client';

/* ============================================================================
   ProportionalLab — an interactive "bench" for PROPORTIONAL RELATIONSHIPS:
   y = kx, the line bolted to the origin, and the one number k that wears
   three names.

        proportional  ⟺  y ÷ x is the SAME in every row  ⟺  y = kx
        the graph: a straight line THROUGH THE ORIGIN — zero in, zero out
        k = the unit rate = the constant of proportionality = the slope

   Built for MAIS (math AI system, www.mais.ac), K-12.  CCSS 7.RP.A.2 and
   8.EE.B.5.  RatioLab builds ratio language; LineFunctionLab will later
   serve general lines.  This bench owns the b = 0 special case — why the
   origin matters, and why one number is the entire machine.

   THE SIGNATURE CENTERPIECE — "THE ORIGIN TEST AND THE FINGERPRINT COLUMN."
     Machines that turn x into y: the lemonade stand (y = 3x), the taxi
     (y = 2x + 3), the photo print (y = x/2).  Each posts a ledger with a
     third column — y ÷ x, the fingerprint: constant exactly when the
     machine is proportional.  The taxi looks linear but fails BOTH tests
     a proportion must pass: doubling the input does not double the
     output, and zero in does not give zero out.  A k dial pivots the
     honest line around the origin it can never leave; a single point
     (4, 6) spills a hidden machine's entire rule.  The capstone posts a
     four-row ledger: rule the verdict, then rule k — or declare that no
     single k exists.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • RatioLab owns the batch tape and the double number line; neither
       appears — this bench's devices are the fingerprint column and the
       origin test.
     • LineFunctionLab owns the slope triangle and rise-over-run on
       general lines; no triangle is drawn and no rise is counted.  The
       word "slope" appears exactly once — as the third NAME of k — and
       the line bench is cited for the +b that unbolts the origin.
     • TableLab owns two-way categorical tables; this ledger is numeric
       covariation.  ScatterPlotLab and BestFitLab own statistical point
       clouds; these points are exact and collinear, never noisy.
     • FunctionLab owns the one-output promise; PercentageLab owns
       percent-of.  Neither device returns here.

   One-accent discipline: CARMINE is k AND ITS LINE — the mathematical
   object.  GOLD is the walking point and the dials (the tool).  BLUE is
   the quiet ledger numbers and plotted points.  GREEN only for
   correct/CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a student):
     • Every k and every table value is an exact fraction (halves at
       worst); y ÷ x is computed by exact cross-multiplication and
       displayed reduced.  No float a student can see.
     • The fingerprint law is proved, not asserted: the audit checks
       y/x = k for every machine with b = 0 over the whole walk, and that
       it VARIES for every machine with b ≠ 0 (adjacent rows differ).
     • The doubling test, the quoted fares (7 and 11), the (4, 6) spill
       (k = 3/2), and every ledger row in the copy are recomputed.
     • The inspector's stamp needs two exact rulings (the verdict, then
       k or "no single k"), audited over every posted machine × chip
       pair; the truth chip is always present.
   Verified by audit-proportional.mjs (numeric proof + source greps) and
   verify-proportional.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/ProportionalLab.jsx
     2. Import and render it:
          import ProportionalLab from './ProportionalLab';
          export default function Page() { return <ProportionalLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the machine, the
              walk, the k dial, the lesson step, answers, the rulings).
     MODEL  — exact fractions; no pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // k and its line
const BLUE = '#3f74a6'; // ledger numbers and plotted points
const GOLD = '#b98718'; // the walking point and the dials
const INK_HEX = '#1c2b3a';

const X_MAX = 8; // the walk dial
const CALIB_STEP = 5;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Machines y = kx + b with exact fraction arithmetic.
   ------------------------------------------------------------------------- */
const gcdInt = (a, b) => (b === 0 ? Math.abs(a) : gcdInt(b, a % b));
const frac = (n, d = 1) => {
  const s = d < 0 ? -1 : 1;
  const g = gcdInt(n, d) || 1;
  return { n: (s * n) / g, d: (s * d) / g };
};
const fAdd = (a, b) => frac(a.n * b.d + b.n * a.d, a.d * b.d);
const fMul = (a, b) => frac(a.n * b.n, a.d * b.d);
const fDiv = (a, b) => frac(a.n * b.d, a.d * b.n);
const fEq = (a, b) => a.n === b.n && a.d === b.d;
const fracText = (f) => (f.d === 1 ? String(f.n) : `${f.n}/${f.d}`);
const fVal = (f) => f.n / f.d; /* pixels only — never displayed */

const MACHINES = {
  lemonade: {
    label: 'the lemonade stand',
    k: frac(3),
    b: frac(0),
    story: 'y = 3x — three dollars a cup',
  },
  taxi: {
    label: 'the taxi',
    k: frac(2),
    b: frac(3),
    story: 'y = 2x + 3 — the meter starts at 3',
  },
  print: {
    label: 'the photo print',
    k: frac(1, 2),
    b: frac(0),
    story: 'y = x/2 — half a dollar each',
  },
  mystery: {
    label: 'the mystery machine',
    k: frac(3, 2),
    b: frac(0),
    story: 'the rule is hiding — one point showing',
  },
};
const machineIds = ['lemonade', 'taxi', 'print'];

const yOf = (M, x) => fAdd(fMul(M.k, x), M.b);
const ratioOf = (M, x) => fDiv(yOf(M, x), x); /* x ≠ 0 */
const isProp = (M) => M.b.n === 0;

/* the k dial's stops (step 4 pivots an honest machine) */
const KVALS = [frac(1, 2), frac(1), frac(3, 2), frac(2), frac(3)];

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "The inspector's stamp."  A four-row ledger is
   posted; rule the verdict, then k — or that no single k exists.
   ------------------------------------------------------------------------- */
const CASES = [
  { k: frac(2), b: frac(0) },
  { k: frac(3), b: frac(0) },
  { k: frac(1, 2), b: frac(0) },
  { k: frac(3, 2), b: frac(0) },
  { k: frac(2), b: frac(3) },
  { k: frac(3), b: frac(1) },
  { k: frac(1, 2), b: frac(2) },
];
function makeCase(prev) {
  let i;
  do {
    i = Math.floor(Math.random() * CASES.length);
  } while (prev != null && i === prev);
  return i;
}
const VERDICT_CHIPS = ['proportional — through the origin', 'not proportional — it misses the origin'];
const K_CHIPS = ['k = 1/2', 'k = 3/2', 'k = 2', 'k = 3', 'no single k'];
const verdictTruth = (i) => (isProp(CASES[i]) ? VERDICT_CHIPS[0] : VERDICT_CHIPS[1]);
const kTruth = (i) => (isProp(CASES[i]) ? `k = ${fracText(CASES[i].k)}` : 'no single k');
const calibChecks = (i, verdictPick, kPick) => {
  if (i == null) return [false, false];
  const vOK = verdictPick != null && verdictPick === verdictTruth(i);
  const kOK = vOK && kPick != null && kPick === kTruth(i);
  return [vOK, kOK];
};
const closeness = (i, v, k) =>
  Math.round((100 * calibChecks(i, v, k).filter(Boolean).length) / 2);
const isCalibrated = (i, v, k) => calibChecks(i, v, k).every(Boolean);

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; the reveal lives in the feedback.
   The distractors are the real beliefs: that linear means proportional,
   that doubling always doubles, that k needs many measurements.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'One number does everything',
    body:
      'A machine that turns x into y: the lemonade stand, y = 3x. The ledger lists what ' +
      'the graph plots. Walk x with the dial — and watch the third column, y ÷ x.',
    machine: 'lemonade',
    walk: true,
    q: 'Cups cost 3, 6, 15 dollars for 1, 2, 5 cups. Eight cups cost…',
    choices: [
      '24 — one number, 3, turns any x into its y',
      '27 — prices creep upward as you buy more',
      'Unknown without more rows',
    ],
    answer: 0,
    feedback:
      'y = 3 × 8 = 24. The whole relationship is one number: three dollars per cup. ' +
      'Every ledger row says it, the third column repeats it, and the graph climbs 3 ' +
      'for every 1 — a straight line out of the origin.',
  },
  {
    title: 'The origin test',
    body:
      'A new machine: the taxi, y = 2x + 3. It also draws a straight line. Test both ' +
      'machines the proportion way: double the input.',
    machine: 'taxi',
    walk: true,
    chips: true,
    q: 'Lemonade: 2 cups → 6, 4 cups → 12. Taxi: 2 miles → 7, 4 miles → …',
    choices: [
      '11 — NOT double of 7; the taxi fails the doubling test',
      '14 — doubling the miles doubles the fare',
      '10 — the meter rounds down',
    ],
    answer: 0,
    feedback:
      'Double the miles and the fare does not double — the 3-dollar flag fee rides ' +
      'along only once. And at x = 0 the taxi already charges 3: zero in should mean ' +
      'zero out. The taxi is linear but NOT proportional — the origin test catches it.',
  },
  {
    title: 'y ÷ x, the fingerprint',
    body:
      'Read the third column of each ledger. Lemonade: 3, 3, 3, 3. Taxi: 5, 7/2, 3, ' +
      '11/4 — drifting downward.',
    machine: 'taxi',
    walk: true,
    chips: true,
    q: 'What does a CONSTANT y ÷ x column certify?',
    choices: [
      'Proportionality — one k works in every row, and the rule is y = kx',
      'That all the numbers are whole',
      'Nothing; every table has a constant column',
    ],
    answer: 0,
    feedback:
      'The constant column IS the definition: y ÷ x lands on the same k in every row ' +
      'exactly when y = kx. The taxi’s column drifts because the +3 weighs each ratio ' +
      'differently. One test, no graph needed — though the graph agrees: through the ' +
      'origin, or not.',
  },
  {
    title: 'Three names, one number',
    body:
      'Now k is yours. Pivot the line: 1/2, 1, 3/2, 2, 3. Steeper k, faster growth — ' +
      'but one point never moves.',
    machine: 'lemonade',
    walk: true,
    kDial: true,
    q: 'Why can the line never leave the origin?',
    choices: [
      'Zero in, zero out — proportionality bolts the line to (0, 0); k only chooses the tilt',
      'The graph paper happens to start there',
      'It can, once k is large enough',
    ],
    answer: 0,
    feedback:
      'The origin is the deal; k is the only knob. And that one number wears three ' +
      'names: the UNIT RATE (what one x costs), the CONSTANT OF PROPORTIONALITY (the ' +
      'fingerprint), and the SLOPE of the line. The line bench later adds the +b that ' +
      'unbolts the origin — that is a different machine.',
  },
  {
    title: 'One point is enough',
    body:
      'A proportional machine hides its rule, but any single point spills it. This line ' +
      'passes through (4, 6).',
    machine: 'mystery',
    walk: true,
    point: true,
    q: 'So k = …',
    choices: [
      '3/2 — k = y ÷ x = 6/4; the rule is y = (3/2)x',
      '2/3 — x over y',
      '6 — read y and you are done',
    ],
    answer: 0,
    feedback:
      'k = 6/4 = 3/2 exactly, and the whole machine follows. That is the practical power ' +
      'of proportionality: one clean measurement anywhere (except home) determines ' +
      'everything, because every point on the line files the same y ÷ x.',
  },
  {
    title: 'The inspector’s stamp',
    body:
      'A machine’s ledger is posted: four rows, rule hidden. Rule the verdict first — ' +
      'proportional or not. Then rule its k, or declare that no single k exists.',
    machine: 'lemonade',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function ProportionalLab() {
  const [machineId, setMachineId] = useState('lemonade');
  const [walkX, setWalkX] = useState(2);
  const [kIdx, setKIdx] = useState(4);
  const [verdictPick, setVerdictPick] = useState(null);
  const [kPick, setKPick] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [kase, setKase] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const M = calib && kase != null
    ? CASES[kase]
    : current.kDial
      ? { label: 'your machine', k: KVALS[kIdx], b: frac(0), story: `y = ${fracText(KVALS[kIdx])}x — your k` }
      : MACHINES[machineId];

  const checks = calib ? calibChecks(kase, verdictPick, kPick) : [false, false];
  const pct = calib && kase != null ? closeness(kase, verdictPick, kPick) : 0;
  const calibrated = calib && kase != null ? isCalibrated(kase, verdictPick, kPick) : false;

  sceneRef.current = { M, x: walkX, calib, point: !!current.point };

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
    const ledgerW = Math.min(238, W * 0.35);
    const plotX0 = 34;
    const plotX1 = W - ledgerW - 18;
    const plotY0 = bandH + 16;
    const plotY1 = H - 34;
    const XW = 8.6;
    const YW = 13;
    const kx = (plotX1 - plotX0) / XW;
    const ky = (plotY1 - plotY0) / YW;
    const px = (X, Y) => [plotX0 + X * kx, plotY1 - Y * ky];

    /* axes */
    ctx.strokeStyle = 'rgba(91,107,123,0.5)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(...px(0, 0));
    ctx.lineTo(...px(XW, 0));
    ctx.moveTo(...px(0, 0));
    ctx.lineTo(...px(0, YW));
    ctx.stroke();
    ctx.fillStyle = INK_SOFT;
    ctx.font = '600 10px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let v = 2; v <= 8; v += 2) ctx.fillText(String(v), px(v, 0)[0], px(0, 0)[1] + 5);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let v = 4; v <= 12; v += 4) ctx.fillText(String(v), px(0, v)[0] - 5, px(0, v)[1]);

    /* the origin, ringed — home */
    ctx.strokeStyle = CARMINE;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(px(0, 0)[0], px(0, 0)[1], 7, 0, 2 * Math.PI);
    ctx.stroke();

    const kv = fVal(S.M.k);
    const bv = fVal(S.M.b);
    if (!S.calib) {
      /* the machine's line */
      ctx.strokeStyle = CARMINE;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      const xEnd = Math.min(XW, (YW - bv) / (kv || 1e-9));
      ctx.moveTo(...px(0, bv));
      ctx.lineTo(...px(xEnd, kv * xEnd + bv));
      ctx.stroke();
      /* the walking point */
      const yv = kv * S.x + bv;
      if (yv <= YW && S.x <= XW) {
        const [wx, wy] = px(S.x, yv);
        ctx.fillStyle = GOLD;
        ctx.beginPath();
        ctx.arc(wx, wy, 6.5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
      /* the spilled point (4, 6) */
      if (S.point) {
        const [sx, sy] = px(4, 6);
        ctx.fillStyle = BLUE;
        ctx.beginPath();
        ctx.arc(sx, sy, 6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = INK_HEX;
        ctx.font = '700 11.5px ui-monospace, monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText('(4, 6)', sx + 9, sy - 3);
      }
    } else {
      /* the audit scene: four bare points, no line */
      for (let xr = 1; xr <= 4; xr++) {
        const yv = kv * xr + bv;
        const [sx, sy] = px(xr, yv);
        ctx.fillStyle = BLUE;
        ctx.beginPath();
        ctx.arc(sx, sy, 6, 0, 2 * Math.PI);
        ctx.fill();
      }
    }

    /* the ledger */
    const tx = W - ledgerW + 4;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = INK_SOFT;
    ctx.font = 'italic 600 11.5px system-ui, sans-serif';
    ctx.fillText('the ledger', tx, bandH + 8);
    ctx.font = '600 11px ui-monospace, monospace';
    ctx.fillStyle = INK_HEX;
    ctx.fillText(S.calib ? 'x      y' : 'x      y      y÷x', tx, bandH + 28);
    let rowY = bandH + 46;
    for (let xr = 1; xr <= 4; xr++) {
      const xf = frac(xr);
      const yf = yOf(S.M, xf);
      const rf = ratioOf(S.M, xf);
      ctx.fillStyle = BLUE;
      const yTxt = fracText(yf);
      ctx.fillText(`${xr}      ${yTxt}${' '.repeat(Math.max(1, 7 - yTxt.length))}${S.calib ? '' : fracText(rf)}`, tx, rowY);
      rowY += 18;
    }
    if (!S.calib) {
      ctx.fillStyle = CARMINE;
      ctx.fillText(
        isProp(S.M) ? `constant: k = ${fracText(S.M.k)}` : 'drifting — no single k',
        tx,
        rowY + 6
      );
      /* the walk readout */
      const xf = frac(S.x);
      ctx.fillStyle = GOLD;
      ctx.fillText(
        S.x === 0 ? `x = 0 → y = ${fracText(S.M.b)}` : `x = ${S.x} → y = ${fracText(yOf(S.M, xf))}`,
        tx,
        rowY + 30
      );
    }

    /* ---- the readout band ---- */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CARMINE;
    ctx.font = '700 14.5px ui-monospace, monospace';
    ctx.fillText(S.calib ? 'four rows · rule hidden' : S.M.story, W / 2, bandH / 2);
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
    setMachineId(st.machine);
    setWalkX(2);
    setKIdx(4);
    setVerdictPick(null);
    setKPick(null);
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
    setMachineId(current.machine);
    setWalkX(2);
    setKIdx(4);
    setVerdictPick(null);
    setKPick(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* accessibility — the spoken summary for screen readers */
  const spoken = calib
    ? `The stamp: a hidden four-row ledger. Verdict ${verdictPick ?? 'unruled'}; k ${kPick ?? 'unruled'}. ${calibrated ? 'Calibrated.' : ''}`
    : `${M.story}. At x = ${walkX}, y = ${fracText(yOf(M, frac(Math.max(walkX, 1))))}; ${
        isProp(M) ? `y over x is always ${fracText(M.k)}` : 'y over x drifts — not proportional'
      }.`;

  return (
    <div className="prlab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Proportional: The Line Bolted to the Origin</h1>
        <p className="lede">
          A relationship is proportional when one number does all the work:{' '}
          <span className="mono">y = kx</span>. The ledger’s <em>y ÷ x column</em> is its
          fingerprint, the graph is a line through the origin, and k answers to three
          names — unit rate, constant of proportionality, slope.
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

          {(current.walk || current.kDial) && (
            <div className="dials">
              {current.walk && (
                <div className="dial">
                  <div className="dial-head">
                    <span className="dial-k">the walk</span>
                    <span className="dial-v mono">x = {walkX}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={X_MAX}
                    step={1}
                    value={walkX}
                    onChange={(e) => setWalkX(Number(e.target.value))}
                    aria-label={`Walk, x equals ${walkX}`}
                  />
                </div>
              )}
              {current.kDial && (
                <div className="dial">
                  <div className="dial-head">
                    <span className="dial-k">the one knob</span>
                    <span className="dial-v mono">k = {fracText(KVALS[kIdx])}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={KVALS.length - 1}
                    step={1}
                    value={kIdx}
                    onChange={(e) => setKIdx(Number(e.target.value))}
                    aria-label={`k equals ${fracText(KVALS[kIdx])}`}
                  />
                </div>
              )}
            </div>
          )}

          <div className="toolbar" role="group" aria-label="Machines">
            {current.chips &&
              machineIds.map((id) => (
                <button
                  type="button"
                  key={id}
                  className={'chipbtn' + (machineId === id ? ' active' : '')}
                  onClick={() => setMachineId(id)}
                >
                  {MACHINES[id].label}
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

          {calib && kase != null && (
            <div className="calib">
              <div className="target-card">
                <span className="target-k">The posted ledger</span>
                <span className="target-word">four rows, rule hidden</span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>{checks[0] ? '✓' : '·'} the verdict, ruled</li>
                  <li className={checks[1] ? 'done' : ''}>{checks[1] ? '✓' : '·'} the k, ruled</li>
                </ol>
                <div className="declare" role="group" aria-label="Verdict ruling">
                  {VERDICT_CHIPS.map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn reason' + (verdictPick === c2 ? ' active' : '')}
                      onClick={() => setVerdictPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <div className="declare" role="group" aria-label="k ruling">
                  {K_CHIPS.map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn mono' + (kPick === c2 ? ' active' : '')}
                      onClick={() => setKPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <span className="target-hint mono">
                  {calibrated
                    ? 'both ruled, exactly — the machine is licensed'
                    : checks[0]
                      ? 'verdict ruled — now the number'
                      : 'check the fingerprint column yourself'}
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
                  <span className="mono target-hint">the verdict · then k</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setKase(makeCase(kase));
                  setVerdictPick(null);
                  setKPick(null);
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
                  setVerdictPick(null);
                  setKPick(null);
                  setMachineId('lemonade');
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">zero in, zero out · one k, three names</span> &nbsp;·&nbsp;
        proportional means y = kx: the fingerprint column is constant, the line passes
        through home, and one clean point spills the whole rule.
      </footer>

      <style jsx>{`
        .prlab {
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
        :global(.prlab) :focus-visible {
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
