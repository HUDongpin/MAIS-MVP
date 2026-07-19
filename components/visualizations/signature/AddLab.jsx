'use client';

/* ============================================================================
   AddLab — an interactive "bench" for ADDITION within 20,  a + b = sum.

   Built for MAIS (math AI system, www.mais.ac), K-12.  This is the youngest
   lab in the library (CCSS 1.OA / 2.OA — add within 20), so the whole design
   is pitched at a 5–7 year old learning what "+" actually does.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   dials that unlock one per lesson step, predict-then-check questions, and a
   calibration challenge with a live match meter.

   The signature centerpiece is the NUMBER LINE with "COUNT-ON" HOPS — the
   addition analogue of the line's slope triangle or the circle's radius
   triangle.  You START at 0, count out the first number a with soft-blue unit
   hops, then COUNT ON the second number b with carmine hops, and land on the
   sum.  Directly beneath, on the SAME scale, two unit-divided bars (a blue rod
   of length a joined to a carmine rod of length b) show the very same total as
   a combined length — the set / measurement model reinforcing the hop model.

   One-accent discipline, adapted for an OPERATION lab: carmine marks the thing
   being taught — the amount you ADD (b) and the RESULT you land on (the sum).
   Soft blue is the neutral quantity you START with (a), exactly as --quad is
   the neutral secondary in the function labs.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/AddLab.jsx
     2. Import and render it:
          import AddLab from './AddLab';
          export default function Page() { return <AddLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (a, b, lesson step).
     MODEL  — the math is pure integer arithmetic; it knows nothing about pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 3 — World window. A one-dimensional number line, 0 through 20 (the top
   of "sums within 20"). Everything on the canvas is placed against this scale.
   ------------------------------------------------------------------------- */
const VMIN = 0;
const VMAX = 20;

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. Two whole-number addends. Each unlocks one lesson step
   later than the last, so a child meets one idea at a time.
   ------------------------------------------------------------------------- */
const PARAMS = [
  { key: 'a', label: 'a', min: 0, max: 10, step: 1, unlock: 1, role: 'first addend · what you start with' },
  { key: 'b', label: 'b', min: 0, max: 10, step: 1, unlock: 2, role: 'second addend · what you count on' },
];
const START = { a: 2, b: 3 };

const COMMUTE_STEP = 4; // "order doesn't matter" — the Swap button is featured here
const MAKETEN_STEP = 5; // "make a ten" — the number line shows the make-ten split
const CALIB_STEP = 6;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model. Addition is exact integer arithmetic; there is nothing to
   approximate. Kept as a function anyway so the whole bench stays state→model.
   ------------------------------------------------------------------------- */
function model(a, b) {
  return a + b;
}

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; the dial unlocks with the step; the
   reveal lives in `feedback` (shown after answering); distractors are real
   early-learner misconceptions (adding = taking away, miscounting the start,
   order changes the total, the sum is "just b"). Next is gated on ANSWERED.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet addition',
    body:
      'Addition means putting amounts together to find how many in all. We write it as ' +
      'a + b = sum. Right now a = 2 and b = 3: start on 0, hop 2, then hop 3 more, and you land ' +
      'on 5. The two bars underneath show the same thing as one combined length.',
    q: 'What does the + sign tell you to do?',
    choices: ['Put the amounts together (add)', 'Take some away (subtract)', 'Split it in half'],
    answer: 0,
    feedback: 'Plus means JOIN — combine two amounts into one total, the sum.',
  },
  {
    title: 'a — the first addend',
    body: 'Drag a — the amount you START with. Blue hops count out from 0.',
    q: 'If a = 4, where does your first number end?',
    choices: ['On 4 — four hops from 0', 'On 1', 'On 5'],
    answer: 0,
    feedback: 'Four hops from 0 land on 4. Counting always starts from 0.',
  },
  {
    title: 'b — count on',
    body: 'COUNT ON from a: the carmine hops continue where the blue bar ended.',
    q: 'To add b, how big is each carmine hop?',
    choices: ['One unit', 'b units — one giant jump', 'a units each'],
    answer: 0,
    feedback: 'One unit each, b of them. Counting on beats starting over at 0.',
  },
  {
    title: 'The sum — the total',
    body: 'The number you land on is the SUM — the two bars joined.',
    q: 'With a = 6 and b = 4, what is the sum?',
    choices: ['10', '6 — the bigger number', '2 — the difference'],
    answer: 0,
    feedback: '6 + 4 = 10. The sum counts BOTH parts together.',
  },
  {
    title: 'Order doesn’t matter',
    body:
      'Press “Swap a ↔ b” to trade the two numbers. The blue and carmine parts switch places — ' +
      'but you land on the very same sum. This is the commutative property of addition.',
    q: 'Which is true for every pair of numbers?',
    choices: ['a + b = b + a', 'a + b is always bigger than b + a', 'Only the first number counts'],
    answer: 0,
    feedback: 'a + b = b + a — always. Start big, count on the smaller number.',
  },
  {
    title: 'Make a ten',
    body: 'MAKE A TEN first: try a = 8, b = 5. Fill 8 up to 10, then 3 more.',
    q: 'Using make-a-ten, 8 + 5 becomes…',
    choices: ['8 + 2 + 3 = 10 + 3 = 13', '8 + 5 = 12', '10 + 5 = 15'],
    answer: 0,
    feedback: 'Split 5 into 2 + 3. The 2 fills the ten; 3 more makes 13.',
  },
  {
    title: 'Build the number',
    body: 'Set a and b so the bars exactly reach the grey target. Many ways work!',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration. A CONSTRUCTION GOAL (the skill's alternative to
   curve-matching): hit a target total N. This teaches number bonds — that
   many different (a, b) pairs build the same number. The meter is a plain
   integer closeness; CALIBRATED only on an exact hit.
   ------------------------------------------------------------------------- */
const matchPercent = (a, b, N) => 100 * Math.max(0, 1 - Math.abs(a + b - N) / 8);
const isCalibrated = (a, b, N) => a + b === N;

function makeTarget(prev) {
  let N;
  do {
    N = 5 + Math.floor(Math.random() * 16); // 5 … 20, all reachable with a,b in 0..10
  } while (prev != null && N === prev);
  return N;
}

/* ---------------------------------------------------------------------------
   Formatting helpers.
   ------------------------------------------------------------------------- */
const MINUS = '−';
const numToWord = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen',
  'nineteen', 'twenty',
];
const word = (n) => numToWord[n] ?? String(n);

/* EDIT 5 — Equation display. a + b = sum, colour-coded to the picture: the
   first addend in the neutral "start" blue, the added amount and the sum in
   the carmine accent. */
function AddEquation({ a, b, sum }) {
  return (
    <span className="eq">
      <span className="t-a">{a}</span>
      <span className="t-op">&nbsp;+&nbsp;</span>
      <span className="t-b">{b}</span>
      <span className="t-op">&nbsp;=&nbsp;</span>
      <span className="t-sum">{sum}</span>
    </span>
  );
}

/* True when the user asks for reduced motion — every animation checks this. */
const reduceMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function AddLab() {
  const [a, setA] = useState(START.a);
  const [b, setB] = useState(START.b);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null);
  const [counting, setCounting] = useState(false);
  const [showBars, setShowBars] = useState(true);
  const [burst, setBurst] = useState(0); // confetti burst id (0 = none)
  const [everCounted, setEverCounted] = useState(false); // Count-on button attention pulse

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const prevCalRef = useRef(false); // previous calibrated value, to fire the burst on the edge
  const hoverRef = useRef(null); // integer value under the pointer, or null
  const countRef = useRef(null); // during the count-on animation: how many b-hops to draw
  const sceneRef = useRef({});

  const sum = model(a, b);
  const current = STEPS[step];
  const calib = !!current.calib;

  // Snapshot everything the renderer needs so draw() (a stable callback) and the
  // pointer/animation handlers never read stale values.
  sceneRef.current = {
    a,
    b,
    sum,
    step,
    calib,
    target,
    counting,
    showBars,
    maketen: step === MAKETEN_STEP,
  };

  const pct = target != null ? matchPercent(a, b, target) : 0;
  const calibrated = target != null ? isCalibrated(a, b, target) : false;

  /* ---- number → screen transform + full redraw from state ----------------- */
  const draw = useCallback(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;

    const W = stage.clientWidth;
    const H = stage.clientHeight;
    if (W === 0 || H === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2); // capped for perf & crisp lines
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels

    /* palette (kept in one place so the drawing matches the CSS tokens) */
    const INK = '#1C2B3A';
    const INK_SOFT = '#5B6B7B';
    const PAPER = '#FBFBF8';
    const CARMINE = '#C81E4F';
    const BLUE = '#3F74A6'; // the "start" quantity a
    const BLUE_SOFT = 'rgba(63,116,166,0.16)';
    const CARM_SOFT = 'rgba(200,30,79,0.14)';
    const GOLD = '#D9982B'; // the make-a-ten fill

    /* layout bands (all derived from H so it scales) */
    const padL = 36;
    const padR = 24;
    const yLine = Math.round(H * 0.36);
    const spanW = W - padL - padR;
    const nx = (v) => padL + ((v - VMIN) / (VMAX - VMIN)) * spanW;
    const u = nx(1) - nx(0); // pixels per unit
    const hHop = Math.min(u * 0.55, 20); // capped vertical bulge of a hop
    const rodTop = Math.round(H * 0.6);
    const rodH = Math.max(26, Math.min(46, Math.round(H * 0.15)));

    const S = sceneRef.current;
    const A = S.a;
    const B = S.b;
    // During the count-on animation the loop mutates countRef and calls draw()
    // directly (no re-render), so read the ref LIVE here rather than from the
    // render-time scene snapshot, or the hops would never move.
    const animating = S.counting && countRef.current != null;
    const bShown = animating ? Math.min(B, countRef.current) : B;
    const landing = A + bShown;

    ctx.clearRect(0, 0, W, H);

    /* ---- quadrille paper: faint vertical unit gridlines --------------------- */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.7)';
    ctx.beginPath();
    for (let v = VMIN; v <= VMAX; v++) {
      const X = Math.round(nx(v)) + 0.5;
      ctx.moveTo(X, 0);
      ctx.lineTo(X, H);
    }
    ctx.stroke();

    /* ---- calibration target: a grey dashed "length to build" --------------- */
    if (S.calib && S.target != null) {
      const gy = rodTop - 16;
      ctx.save();
      ctx.strokeStyle = 'rgba(91,107,123,0.9)';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(nx(0), gy);
      ctx.lineTo(nx(S.target), gy);
      ctx.stroke();
      // end caps
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(nx(0), gy - 6);
      ctx.lineTo(nx(0), gy + 6);
      ctx.moveTo(nx(S.target), gy - 6);
      ctx.lineTo(nx(S.target), gy + 6);
      ctx.stroke();
      ctx.fillStyle = INK_SOFT;
      ctx.font = '600 12px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`build ${S.target}`, (nx(0) + nx(S.target)) / 2, gy - 8);
      ctx.restore();
    }

    /* ---- the hops (the centerpiece) ---------------------------------------- */
    // one hop from value v to v+1, an upward arc with a little arrowhead
    const drawHop = (v, color, width) => {
      const X0 = nx(v);
      const X1 = nx(v + 1);
      const cx = (X0 + X1) / 2;
      const rx = (X1 - X0) / 2;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.ellipse(cx, yLine, rx, hHop, 0, Math.PI, 2 * Math.PI); // bulges up
      ctx.stroke();
      // arrowhead landing on the tick at X1
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(X1, yLine + 1);
      ctx.lineTo(X1 - 6, yLine - 6);
      ctx.lineTo(X1 - 1, yLine - 7.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    // blue hops: counting out the first number a (0 → a)
    for (let v = 0; v < A; v++) drawHop(v, BLUE, 2.4);
    // carmine (and gold, on the make-ten step) hops: counting on b (a → a+b)
    for (let j = 0; j < bShown; j++) {
      const from = A + j;
      const to = from + 1;
      let color = CARMINE;
      if (S.maketen && A < 10 && A + B > 10 && to <= 10) color = GOLD;
      drawHop(from, color, 2.6);
    }

    /* ---- make-a-ten marker: emphasise the point 10 on its step ------------- */
    if (S.maketen && A < 10 && A + B > 10) {
      const X = nx(10);
      ctx.save();
      ctx.strokeStyle = GOLD;
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(X, yLine - hHop - 8);
      ctx.lineTo(X, rodTop + rodH + 6);
      ctx.stroke();
      ctx.restore();
    }

    /* ---- the number line: baseline, ticks, labels -------------------------- */
    ctx.strokeStyle = 'rgba(28,43,58,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(nx(VMIN), yLine + 0.5);
    ctx.lineTo(nx(VMAX), yLine + 0.5);
    ctx.stroke();

    // Label density adapts to pixels-per-unit: every integer when there is room,
    // else every 2 (skipping the numbers next to a landmark so they never crowd
    // the bold 5 / 15), else just the multiples-of-5 landmarks.
    const labelStep = u >= 20 ? 1 : u >= 13 ? 2 : 5;
    const nearMajor = (v) => {
      const r = ((v % 5) + 5) % 5;
      return r === 1 || r === 4;
    };
    const showLabel = (v) => {
      if (v % 5 === 0) return true; // landmarks (0,5,10,15,20) always
      if (labelStep === 1) return true; // room for every integer
      if (labelStep === 2) return v % 2 === 0 && !nearMajor(v); // skip 4,6,14,16 by 5/15
      return false; // narrowest: landmarks only
    };
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let v = VMIN; v <= VMAX; v++) {
      const X = nx(v);
      const major = v % 5 === 0;
      ctx.strokeStyle = 'rgba(28,43,58,0.6)';
      ctx.lineWidth = major ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(X + (major ? 0 : 0.5), yLine);
      ctx.lineTo(X + (major ? 0 : 0.5), yLine + (major ? 9 : 5));
      ctx.stroke();
      if (showLabel(v)) {
        ctx.font = (major ? '600 ' : '') + '11px ui-monospace, "SF Mono", Menlo, monospace';
        ctx.fillStyle = major ? INK : INK_SOFT;
        ctx.fillText(String(v), X, yLine + 11);
      }
    }

    /* ---- the two bars (set / length model), on the same scale -------------- */
    if (S.showBars) {
      const drawRod = (v0, v1, fill, edge, labelText) => {
        if (v1 <= v0) return;
        const x0 = nx(v0);
        const x1 = nx(v1);
        ctx.save();
        ctx.fillStyle = fill;
        ctx.fillRect(x0, rodTop, x1 - x0, rodH);
        // unit divisions
        ctx.strokeStyle = 'rgba(255,255,255,0.75)';
        ctx.lineWidth = 1;
        for (let v = v0 + 1; v < v1; v++) {
          const X = Math.round(nx(v)) + 0.5;
          ctx.beginPath();
          ctx.moveTo(X, rodTop);
          ctx.lineTo(X, rodTop + rodH);
          ctx.stroke();
        }
        // outline
        ctx.strokeStyle = edge;
        ctx.lineWidth = 1.8;
        ctx.strokeRect(x0 + 0.5, rodTop + 0.5, x1 - x0 - 1, rodH - 1);
        // centred count label
        if (labelText != null && x1 - x0 > 14) {
          ctx.fillStyle = edge;
          ctx.font = '700 15px ui-monospace, "SF Mono", Menlo, monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(labelText, (x0 + x1) / 2, rodTop + rodH / 2 + 0.5);
        }
        ctx.restore();
      };
      drawRod(0, A, BLUE_SOFT, BLUE, A > 0 ? String(A) : null);
      drawRod(A, A + B, CARM_SOFT, CARMINE, B > 0 ? String(B) : null);

      // a full "sum" brace under the joined bars
      const bx0 = nx(0);
      const bx1 = nx(A + B);
      if (A + B > 0) {
        const by = rodTop + rodH + 9;
        ctx.save();
        ctx.strokeStyle = 'rgba(28,43,58,0.5)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(bx0, by);
        ctx.lineTo(bx0, by + 5);
        ctx.lineTo(bx1, by + 5);
        ctx.lineTo(bx1, by);
        ctx.stroke();
        ctx.fillStyle = INK_SOFT;
        ctx.font = '11px ui-monospace, "SF Mono", Menlo, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(`sum = ${A + B}`, (bx0 + bx1) / 2, by + 8);
        ctx.restore();
      }
    }

    /* ---- landing dot + sum bubble on the line ------------------------------ */
    {
      const X = nx(landing);
      // dashed drop from the landing to the bars, tying the two models together
      if (S.showBars) {
        ctx.save();
        ctx.strokeStyle = 'rgba(200,30,79,0.35)';
        ctx.setLineDash([3, 4]);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(X, yLine);
        ctx.lineTo(X, rodTop);
        ctx.stroke();
        ctx.restore();
      }
      ctx.save();
      ctx.fillStyle = CARMINE;
      ctx.beginPath();
      ctx.arc(X, yLine, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = PAPER;
      ctx.lineWidth = 2;
      ctx.stroke();

      // sum pill above the landing (clamped inside the canvas); during the
      // count-on animation it shows the running total instead of the final sum.
      const pill = animating ? String(landing) : `= ${A + B}`;
      ctx.font = '700 15px ui-monospace, "SF Mono", Menlo, monospace';
      const tw = ctx.measureText(pill).width;
      let px = X;
      const half = tw / 2 + 8;
      px = Math.min(Math.max(px, padL + half), W - padR - half);
      const py = Math.max(yLine - hHop - 26, 6);
      ctx.fillStyle = CARMINE;
      const rr = 6;
      const bw = tw + 16;
      const bh = 22;
      const bxp = px - bw / 2;
      ctx.beginPath();
      ctx.moveTo(bxp + rr, py);
      ctx.arcTo(bxp + bw, py, bxp + bw, py + bh, rr);
      ctx.arcTo(bxp + bw, py + bh, bxp, py + bh, rr);
      ctx.arcTo(bxp, py + bh, bxp, py, rr);
      ctx.arcTo(bxp, py, bxp + bw, py, rr);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pill, px, py + bh / 2 + 0.5);
      ctx.restore();
    }

    /* ---- make-a-ten readout (on its step) ---------------------------------- */
    if (S.maketen && A < 10 && A + B > 10) {
      const toTen = 10 - A;
      const rest = B - toTen;
      const read = `${A} + ${toTen} = 10,  then + ${rest} = ${A + B}`;
      ctx.save();
      ctx.font = '600 12.5px ui-monospace, "SF Mono", Menlo, monospace';
      const tw = ctx.measureText(read).width;
      ctx.fillStyle = 'rgba(251,251,248,0.92)';
      ctx.fillRect(10, 10, tw + 14, 22);
      ctx.strokeStyle = 'rgba(217,152,43,0.7)';
      ctx.lineWidth = 1;
      ctx.strokeRect(10.5, 10.5, tw + 13, 21);
      ctx.fillStyle = GOLD;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(read, 17, 22);
      ctx.restore();
    }

    /* ---- hover readout: highlight the integer under the pointer ------------ */
    const hv = hoverRef.current;
    if (hv != null && !S.calib) {
      const X = nx(hv);
      ctx.save();
      ctx.strokeStyle = 'rgba(28,43,58,0.3)';
      ctx.setLineDash([2, 3]);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(X, yLine - hHop - 4);
      ctx.lineTo(X, yLine);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = INK;
      ctx.font = '600 11px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(String(hv), X, yLine - hHop - 6);
      ctx.restore();
    }
  }, []);

  /* redraw whenever the state that affects the picture changes */
  useEffect(() => {
    draw();
  }, [a, b, step, target, showBars, counting, draw]);

  /* redraw on resize (the canvas is fluid) */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* hand a target to the calibration step the first time we reach it; reset
     the addends to 0 so it starts clearly un-matched (like the cube lab). */
  useEffect(() => {
    if (current.calib && target == null) {
      setTarget(makeTarget(null));
      setA(0);
      setB(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* the count-on animation — carmine hops appear one at a time, time-based,
     opt-in, and respectful of reduced motion */
  useEffect(() => {
    if (!counting) {
      countRef.current = null;
      draw();
      return;
    }
    if (b === 0) {
      setCounting(false);
      return;
    }
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setCounting(false);
      return;
    }
    let raf;
    let start = null;
    const per = 420; // ms per hop
    const total = b * per;
    countRef.current = 0;
    const loop = (now) => {
      if (start == null) start = now;
      const t = now - start;
      countRef.current = Math.min(b, Math.floor(t / per));
      draw();
      if (t < total) raf = requestAnimationFrame(loop);
      else {
        countRef.current = null;
        setCounting(false);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [counting, b, draw]);

  /* K-motion: confetti on the moment CALIBRATED becomes true. The stamp is
     driven by isCalibrated exactly as before — this effect only decorates the
     transition and never feeds back into it. */
  useEffect(() => {
    const was = prevCalRef.current;
    prevCalRef.current = calibrated;
    if (!calibrated || was || !calib) return;
    if (reduceMotion()) return;
    setBurst(Date.now());
    const t = setTimeout(() => setBurst(0), 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calibrated]);

  /* ---- interaction handlers ---------------------------------------------- */
  const onParam = (key, value) => {
    const v = parseInt(value, 10);
    if (key === 'a') setA(v);
    else setB(v);
    if (counting) setCounting(false);
  };

  const onPointerMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const padL = 36;
    const padR = 24;
    const frac = (cssX - padL) / (rect.width - padL - padR);
    const v = Math.round(VMIN + frac * (VMAX - VMIN));
    hoverRef.current = v >= VMIN && v <= VMAX ? v : null;
    draw();
  };
  const onPointerLeave = () => {
    hoverRef.current = null;
    draw();
  };

  const swap = () => {
    setA(b);
    setB(a);
    if (counting) setCounting(false);
  };

  const resetDials = () => {
    setA(calib ? 0 : START.a);
    setB(calib ? 0 : START.b);
    if (counting) setCounting(false);
  };

  const choose = (idx) => {
    if (answers[step] != null) return; // lock the answer once given
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };

  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const spoken =
    `${word(a)} plus ${word(b)} equals ${word(sum)}. ` +
    `Start on 0, count ${word(a)}, then count on ${word(b)} more to land on ${word(sum)}.`;

  return (
    <div className="alab">
      <header className="head">
        <h1>Addition on the Number Line</h1>
        <p className="lede">
          Learn what <span className="mono">+</span> really does. Start on zero, count out the first
          number, then <em>count on</em> the second — and land on the{' '}
          <span className="mono">sum</span>. Each dial unlocks with the lesson, so you meet one idea
          at a time, and finish by building a mystery number your own way.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              <AddEquation a={a} b={b} sum={sum} />
            </p>
            <p className="equation-sub mono">
              {b} + {a} = {sum}&nbsp;&nbsp;·&nbsp;&nbsp;same total either way
            </p>
          </div>

          <div
            className="stage"
            ref={stageRef}
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
            role="img"
            aria-label={spoken}
          >
            <canvas ref={canvasRef} />
            {burst > 0 && (
              <div className="confetti" aria-hidden="true">
                {Array.from({ length: 26 }, (_, i) => (
                  <span
                    key={i}
                    style={{
                      left: `${(i * 137) % 100}%`,
                      background: ['#c81e4f', '#d9982b', '#3f74a6', '#1f8a5b'][i % 4],
                      animationDelay: `${(i % 7) * 60}ms`,
                      '--drift': `${((i * 53) % 60) - 30}px`,
                    }}
                  />
                ))}
              </div>
            )}
            <span className="hint mono">blue = start · carmine = count on</span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
            {calib && calibrated ? ` Calibrated — you built ${word(target)}.` : ''}
          </p>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">First addend a</span>
              <span className="fact-v mono blue">{a}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Second addend b</span>
              <span className="fact-v mono carm">{b}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Sum a + b</span>
              <span className="fact-v mono carm big">{sum}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Turn-around fact</span>
              <span className="fact-v mono">
                {b} + {a} = {sum}
              </span>
            </div>
          </div>

          <div className="toolbar">
            <button
              type="button"
              className={'btn ghost' + (counting ? ' on' : '') + (!everCounted && b > 0 ? ' attn' : '')}
              onClick={() => {
                setEverCounted(true);
                setCounting((c) => !c);
              }}
              disabled={b === 0}
            >
              {counting ? 'Counting…' : 'Count on'}
            </button>
            <button type="button" className="btn ghost" onClick={swap}>
              Swap a ↔ b
            </button>
            <button
              type="button"
              className={'btn ghost' + (showBars ? ' on' : '')}
              onClick={() => setShowBars((s) => !s)}
              aria-pressed={showBars}
            >
              {showBars ? 'Hide bars' : 'Show bars'}
            </button>
            <button type="button" className="btn ghost" onClick={resetDials}>
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

          <div className="dials">
            {PARAMS.map((d) => {
              const unlocked = step >= d.unlock;
              const val = { a, b }[d.key];
              return (
                <label className={'dial' + (unlocked ? '' : ' locked')} key={d.key}>
                  <span className={'dk ' + d.key}>{d.label}</span>
                  <span className="drole">{unlocked ? d.role : 'unlocks soon'}</span>
                  <input
                    type="range"
                    min={d.min}
                    max={d.max}
                    step={d.step}
                    value={val}
                    disabled={!unlocked}
                    aria-label={`Dial ${d.label} — ${d.role}`}
                    onChange={(e) => onParam(d.key, e.target.value)}
                  />
                  <output className="dv">{unlocked ? val : '🔒'}</output>
                </label>
              );
            })}
          </div>

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
                    <button
                      type="button"
                      key={i}
                      className={cls}
                      onClick={() => choose(i)}
                      disabled={chosen != null}
                    >
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

          {current.calib && target != null && (
            <div className="calib">
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">match&nbsp;{pct.toFixed(0)}%</span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">
                    build {target}: a + b = {target}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setTarget(makeTarget(target));
                  setA(0);
                  setB(0);
                }}
              >
                New target
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
                  setTarget(null);
                  setShowBars(true);
                  setA(START.a);
                  setB(START.b);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">a + b = sum</span> &nbsp;·&nbsp; addition within 20, counted on a
        number line and shown as a joined length (CCSS 1.OA / 2.OA).
      </footer>

      <style jsx>{`
        .alab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --addend: #3f74a6;
          --quad: #c7d8e4;
          --gold: #d9982b;
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
          max-width: 68ch;
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
            grid-template-columns: 1fr;
          }
        }
        .panel {
          background: #fff;
          border: 1px solid rgba(28, 43, 58, 0.15);
          border-radius: 12px;
          box-shadow: 0 1px 2px rgba(28, 43, 58, 0.05);
        }
        .stage-panel {
          padding: 14px;
        }
        .stage-head {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }
        .equation {
          font-family: var(--mono);
          font-variant-numeric: tabular-nums;
          font-size: 22px;
          font-weight: 600;
          margin: 0;
          letter-spacing: 0.01em;
        }
        .equation .t-a {
          color: var(--addend);
        }
        .equation .t-b,
        .equation .t-sum {
          color: var(--curve);
        }
        .equation .t-sum {
          font-weight: 700;
        }
        .equation .t-op {
          color: var(--ink-soft);
        }
        .equation-sub {
          color: var(--ink-soft);
          font-size: 12.5px;
          margin: 0;
        }
        .stage {
          position: relative;
          width: 100%;
          aspect-ratio: 8 / 5;
          margin: 0 auto;
          border: 1px solid var(--quad);
          border-radius: 8px;
          overflow: hidden;
          touch-action: none;
          background: linear-gradient(180deg, #fdfefe 0%, #f4f7f9 100%);
        }
        /* On narrow screens the 8:5 ratio gets too short for the stacked bands
           (hops, line, labels, bars, brace), so go taller-than-wide there. */
        @media (max-width: 560px) {
          .stage {
            aspect-ratio: 5 / 6;
          }
        }
        .stage canvas {
          display: block;
          width: 100%;
          height: 100%;
        }
        .hint {
          position: absolute;
          left: 10px;
          bottom: 9px;
          font-size: 11px;
          color: var(--ink-soft);
          background: rgba(251, 251, 248, 0.78);
          padding: 3px 7px;
          border-radius: 5px;
          pointer-events: none;
        }
        .facts {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px 18px;
          margin: 14px 4px 4px;
        }
        @media (max-width: 460px) {
          .facts {
            grid-template-columns: 1fr;
          }
        }
        .fact {
          display: flex;
          flex-direction: column;
          gap: 1px;
          padding: 6px 0;
          border-top: 1px solid rgba(28, 43, 58, 0.08);
        }
        .fact-k {
          font-size: 11px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .fact-v {
          font-size: 15px;
          font-variant-numeric: tabular-nums;
        }
        .fact-v.blue {
          color: var(--addend);
          font-weight: 700;
        }
        .fact-v.carm {
          color: var(--curve);
          font-weight: 700;
        }
        .fact-v.big {
          font-size: 19px;
        }
        .toolbar {
          margin: 12px 4px 2px;
          display: flex;
          gap: 9px;
          flex-wrap: wrap;
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
        .btn.ghost.on {
          background: var(--curve);
          border-color: var(--curve);
          color: #fff;
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
          background: var(--curve);
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
        .dials {
          display: grid;
          gap: 12px;
          margin-bottom: 6px;
        }
        .dial {
          display: grid;
          grid-template-columns: 22px 1fr 48px;
          grid-template-rows: auto auto;
          align-items: center;
          gap: 2px 10px;
        }
        .dial.locked {
          opacity: 0.5;
        }
        .dk {
          grid-row: 1 / 3;
          font-family: var(--serif);
          font-style: italic;
          font-size: 19px;
        }
        .dk.a {
          color: var(--addend);
        }
        .dk.b {
          color: var(--curve);
        }
        .drole {
          grid-column: 2 / 4;
          font-size: 11px;
          color: var(--ink-soft);
        }
        .dial input[type='range'] {
          grid-column: 2;
          width: 100%;
          accent-color: var(--ink);
          cursor: pointer;
        }
        .dial input[type='range']:disabled {
          cursor: not-allowed;
        }
        .dv {
          grid-column: 3;
          font-family: var(--mono);
          font-variant-numeric: tabular-nums;
          text-align: right;
          font-size: 15px;
          font-weight: 600;
        }
        .quiz {
          margin-top: 16px;
          padding-top: 14px;
          border-top: 1px solid rgba(28, 43, 58, 0.1);
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
          border-left: 3px solid var(--curve);
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
        .meter {
          height: 12px;
          border-radius: 6px;
          background: rgba(28, 43, 58, 0.1);
          overflow: hidden;
        }
        .meter-fill {
          height: 100%;
          background: linear-gradient(90deg, rgba(200, 30, 79, 0.55), var(--curve));
          transition: width 0.12s ease-out;
        }
        .meter-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
        }
        .target-hint {
          color: var(--ink-soft);
          font-size: 12px;
        }
        .stamp {
          font: 700 12px/1 var(--mono);
          letter-spacing: 0.16em;
          color: var(--ok);
          border: 2px solid var(--ok);
          border-radius: 6px;
          padding: 4px 8px;
          transform: rotate(-3deg);
          animation: stamp-in 0.45s cubic-bezier(0.2, 1.5, 0.4, 1);
        }
        @keyframes stamp-in {
          from {
            transform: rotate(-3deg) scale(1.9);
            opacity: 0;
          }
          to {
            transform: rotate(-3deg) scale(1);
            opacity: 1;
          }
        }
        .btn.attn {
          animation: gentle-pulse 1.7s ease-in-out infinite;
        }
        @keyframes gentle-pulse {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(217, 152, 43, 0);
          }
          50% {
            box-shadow: 0 0 0 7px rgba(217, 152, 43, 0.22);
          }
        }
        .confetti {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .confetti span {
          position: absolute;
          top: -12px;
          width: 9px;
          height: 13px;
          border-radius: 2px;
          opacity: 0;
          animation: confetti-fall 1.3s cubic-bezier(0.25, 0.4, 0.6, 1) forwards;
        }
        @keyframes confetti-fall {
          0% {
            opacity: 1;
            transform: translate(0, 0) rotate(0deg);
          }
          100% {
            opacity: 0;
            transform: translate(var(--drift, 0px), 340px) rotate(560deg);
          }
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
        :global(.alab) :focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 2px;
          border-radius: 4px;
        }
        @media (prefers-reduced-motion: reduce) {
          .btn,
          .meter-fill,
          .choice {
            transition: none;
          }
          .stamp,
          .confetti span,
          .btn.attn {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
