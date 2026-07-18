'use client';

/* ============================================================================
   VariableLab — an interactive "bench" for the most foundational idea in
   algebra: the VARIABLE. A variable is a letter that stands for a number, and
   the number it stands for can change.

   Built for MAIS (math AI system, www.mais.ac), K-12.
   House style: the interactive-math-bench standard — quadrille-paper canvas,
   one carmine accent for the mathematical object, dials that unlock one per
   lesson step, predict-then-check questions, and a calibration challenge with
   a live match meter.

   The signature centerpiece is THE WALK ON THE NUMBER LINE. An expression
   a·x + b is built up as a journey starting at 0:
       • a carmine "x-jumps", each exactly one x long   → the VARIABLE TERM a·x
       • then b small blue unit-jumps                    → the CONSTANT TERM + b
   Drag the variable x and every carmine jump resizes together, while the blue
   unit-jumps never change. That is the whole difference between a variable term
   and a constant term, made visible. The landing point is the expression's
   VALUE — the result of substituting x with its number.

   DELIBERATELY DISTINCT from its siblings:
     • EquationLab solves a·x + b = c on a balance scale (x is ONE unknown that
       levels the beam). VariableLab never sets the expression equal to a
       constant and never "solves" — x is a quantity that VARIES, and the lab is
       about evaluating/substituting the expression it builds.
     • The function labs graph y = f(x) as a continuous curve. VariableLab stays
       discrete and integer: a number-line walk, a substitution, an input→output
       rule. No curve is ever drawn.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/VariableLab.jsx
     2. Import and render it:
          import VariableLab from './VariableLab';
          export default function Page() { return <VariableLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (x, a, b, lesson step).
     MODEL  — evaluate(x,a,b) is pure math; it knows nothing about pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---- palette (kept in sync with the styled-jsx tokens below) ------------- */
const CURVE = '#c81e4f'; // the one accent = the VARIABLE and everything made of it
const INK = '#1c2b3a';
const INK_SOFT = '#5b6b7b';
const PAPER = '#fbfbf8';
const OK = '#1f8a5b';
const CONST_COL = '#2f6f9f'; // the constant term — a calm blue, never the accent
const MINUS = '−';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. Three dials, unlocking one per lesson step:
     x — the variable itself (the star). Integer values so substitution is clean.
     a — the coefficient: how many copies of x (0 lets the variable disappear).
     b — the constant term: fixed units that do NOT depend on x.
   The expression they build is  E = a·x + b.
   ------------------------------------------------------------------------- */
const PARAMS = [
  { key: 'x', label: 'x', min: -5, max: 8, step: 1, unlock: 1, star: true, role: 'the variable · its value can change' },
  { key: 'a', label: 'a', min: 0, max: 3, step: 1, unlock: 2, role: 'coefficient · how many copies of x' },
  { key: 'b', label: 'b', min: -5, max: 6, step: 1, unlock: 3, role: 'constant term · fixed units added on' },
];
const START = { x: 3, a: 1, b: 0 }; // the simplest expression of all: just x, worth 3

/* ---------------------------------------------------------------------------
   EDIT 2 — Model. Pure math, no pixels.  Substitute x, then a·x + b.
   ------------------------------------------------------------------------- */
function evaluate(x, a, b) {
  return a * x + b;
}

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration ("guess my rule"). A hidden machine turns each input x
   into a·x + b. The student tunes their own a and b to match it. Because a and
   b are integers and we sample at least two distinct inputs, the outputs match
   on every input if and only if (a, b) equals the machine's (a*, b*) exactly —
   so there is never a false CALIBRATED. The smallest possible non-zero error is
   1 (a single unit off on b), which the meter maps well below the stamp.
   ------------------------------------------------------------------------- */
const CALIB_INPUTS = [-2, -1, 0, 1, 2, 3, 4]; // where the meter compares the two rules
const TABLE_INPUTS = [1, 2, 3, 4]; // the input→output pairs the machine reveals

function ruleRms(p, t) {
  let s = 0;
  for (const x of CALIB_INPUTS) {
    const d = evaluate(x, p.a, p.b) - evaluate(x, t.a, t.b); // (Δa)x + Δb
    s += d * d;
  }
  return Math.sqrt(s / CALIB_INPUTS.length);
}
const matchPercent = (rms) => Math.max(0, Math.min(100, 100 / (1 + rms / 0.8)));
const MATCH_RMS = 0.05; // exact integer match only -> CALIBRATED

function makeTarget(prev) {
  let t;
  do {
    const a = 1 + Math.floor(Math.random() * 3); // 1, 2, or 3 (always a real variable term)
    let b = -4 + Math.floor(Math.random() * 10); // −4 … 5
    if (b === 0) b = 5; // keep it distinct from a bare "a·x"
    t = { a, b };
  } while (
    (prev && t.a === prev.a && t.b === prev.b) ||
    (t.a === START.a && t.b === START.b)
  );
  return t;
}

/* ---------------------------------------------------------------------------
   Formatting helpers — a proper minus sign and clean coefficient rules.
   ------------------------------------------------------------------------- */
function fmt(n) {
  return (Object.is(n, -0) ? 0 : n).toString().replace('-', MINUS);
}

/* The symbolic expression, e.g. "2x + 3", "x", "3" (when a = 0), "−4". */
function exprString(a, b) {
  const coef = a === 0 ? '' : a === 1 ? 'x' : `${a}x`;
  if (coef === '') return b === 0 ? '0' : fmt(b); // pure constant, no variable
  if (b === 0) return coef;
  return `${coef} ${b > 0 ? '+' : MINUS} ${Math.abs(b)}`;
}

/* The substitution shown out loud, e.g.  2·(3) + 4 = 6 + 4 = 10  */
function substString(a, b, x) {
  const E = evaluate(x, a, b);
  if (a === 0) return `${fmt(b)} = ${fmt(E)}`; // constant expression: nothing to substitute
  const prod = a === 1 ? `(${fmt(x)})` : `${a}·(${fmt(x)})`;
  const ax = a * x;
  if (b === 0) return `${prod} = ${fmt(E)}`;
  const sign = b > 0 ? '+' : MINUS;
  return `${prod} ${sign} ${Math.abs(b)} = ${fmt(ax)} ${sign} ${Math.abs(b)} = ${fmt(E)}`;
}

/* A "nice" tick step (1, 2, 5, 10 …) so the number line always reads cleanly. */
function niceStep(raw) {
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / p;
  const n = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10;
  return n * p;
}

/* Auto-fit the number-line window to whatever the current walk needs, with a
   little padding and a minimum span so tiny expressions don't over-zoom. */
function fitWindow(x, a, b) {
  const E = evaluate(x, a, b);
  const ax = a * x;
  const marks = [0, x, ax, E];
  let lo = Math.min(...marks);
  let hi = Math.max(...marks);
  const pad = Math.max(1, Math.round(0.14 * (hi - lo)));
  lo -= pad;
  hi += pad;
  if (hi - lo < 8) {
    const c = (lo + hi) / 2;
    lo = c - 4;
    hi = c + 4;
  }
  const step = niceStep((hi - lo) / 9);
  const wmin = Math.floor(lo / step) * step;
  const wmax = Math.ceil(hi / step) * step;
  return { wmin, wmax, step };
}

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; the dial unlocks with its step; the
   reveal lives in `feedback` (shown after answering); the distractors are real
   student misconceptions (3x = "34", 3x = 3 + 4, add-before-multiply, the minus
   sign not belonging to the constant). Next is gated on ANSWERED, not CORRECT.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet the variable',
    body:
      'A variable is a letter that stands for a number. Here the letter is x. Right now the whole ' +
      'expression is just x, and x = 3 — so the expression is worth 3. The carmine bar under the ' +
      'line shows how far x reaches from 0, and the dot on the line marks the value.',
    q: 'What does the letter x really stand for?',
    choices: ['A number — one we are free to change', 'Just the letter x, not a number at all', 'Always the number 10'],
    answer: 0,
    feedback:
      'A variable is a symbol that holds a number. We call it a variable because that number can ' +
      'vary — we can let x be 3, then 7, then −2. It is not a decorative letter, and it has no single ' +
      'fixed value until we choose one.',
  },
  {
    title: 'A variable can vary',
    body:
      'The x dial is now live. Drag it — or click anywhere on the number line — and watch two things ' +
      'move together: the carmine x-bar and the value of the expression. Same letter, many possible ' +
      'numbers. That is exactly what makes it a variable.',
    q: 'You slide x to 7. What is the value of the expression x now?',
    choices: ['7', 'x', 'Still 3'],
    answer: 0,
    feedback:
      'When x = 7 the expression x is worth 7 — the expression takes on whatever number the variable ' +
      'currently holds. A constant like the number 5 can never move; a variable can slide to any value ' +
      'you choose.',
  },
  {
    title: 'The coefficient — how many x’s',
    body:
      'Now the a dial unlocks. Writing 2x is shorthand for x + x — two copies of the variable. The ' +
      'number in front, a, is the coefficient: it counts how many x’s you have. Watch the carmine ' +
      'jumps — there are a of them, each exactly one x long.',
    q: 'If a = 3 and x = 4, what is the value of 3x?',
    choices: ['12 — that is 4 + 4 + 4', '34 — a 3 written next to a 4', '7 — that is 3 + 4'],
    answer: 0,
    feedback:
      '3x means three copies of x, so 3 × 4 = 12. The coefficient tells you to MULTIPLY — not to write ' +
      'the digits side by side (3x is not the number “34”), and not to add the two numbers (that would ' +
      'be 3 + 4 = 7). Notice every carmine jump resizes the instant you change x: all the copies of the ' +
      'variable move together.',
  },
  {
    title: 'The constant term',
    body:
      'The b dial adds a constant — a plain number that does NOT depend on x. On the line it is a run ' +
      'of small blue unit-jumps after the carmine x-jumps. The a·x part is the variable term; the + b ' +
      'part is the constant term.',
    q: 'In the expression 2x + 5, you change x. Which part of the value changes?',
    choices: ['Only the 2x part — the + 5 stays put', 'Both the 2x and the 5 change', 'Only the 5 changes'],
    answer: 0,
    feedback:
      'Only the variable term 2x responds to x — the constant + 5 is fixed forever. That is the whole ' +
      'difference between a variable term and a constant term: watch the blue unit-jumps stay exactly ' +
      'the same length while the carmine x-jumps grow and shrink.',
  },
  {
    title: 'Evaluate by substituting',
    body:
      'To find the value of an expression you substitute — replace the letter x with its number, then ' +
      'do the arithmetic. Multiply before you add (order of operations). The substitution is written ' +
      'out live just under the expression.',
    q: 'Evaluate 2x + 3 when x = 5.',
    choices: ['13 — first 2·5 = 10, then + 3', '16 — did 2 · (5 + 3), adding too early', '28 — read “2x” as the digits 25, then + 3'],
    answer: 0,
    feedback:
      'Substitute x = 5 to get 2·(5) + 3, then follow order of operations: multiply first (2·5 = 10), ' +
      'then add 3, which gives 13. Don’t add before multiplying, and don’t glue the 2 and the 5 into ' +
      '“25.” Multiplication comes before addition.',
  },
  {
    title: 'Naming the parts',
    body:
      'Some vocabulary to lock in. An expression is built from terms. In a·x + b, the term a·x has a ' +
      'coefficient (a) multiplying a variable (x); b is the constant term. Reading an expression means ' +
      'naming these parts correctly.',
    q: 'In the expression 4x − 1, what is the coefficient of x, and what is the constant term?',
    choices: ['coefficient 4, constant −1', 'coefficient x, constant 4', 'coefficient 1, constant 4'],
    answer: 0,
    feedback:
      'The coefficient is the number multiplying the variable — here 4. The constant is the term with ' +
      'no variable — here −1, and the minus sign belongs to it. The letter x is the variable, not the ' +
      'coefficient. Word phrases translate directly too: “four times a number, less one” is 4x − 1.',
  },
  {
    title: 'Guess my rule',
    body:
      'Final challenge. A hidden machine turns each input x into an output using a secret rule a·x + b. ' +
      'You can see a few of its input→output pairs. Set your a and b so your expression matches the ' +
      'machine for every input. Drag x to probe: the grey ring is the machine’s output — your carmine ' +
      'walk should land right inside it. Match the meter to CALIBRATED, then press New machine.',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function VariableLab() {
  const [x, setX] = useState(START.x);
  const [a, setA] = useState(START.a);
  const [b, setB] = useState(START.b);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const E = evaluate(x, a, b);

  // Single source of truth snapshot for the renderer & pointer handler.
  sceneRef.current = { ...sceneRef.current, x, a, b, calib, target };

  const rms = target ? ruleRms({ a, b }, target) : Infinity;
  const pct = target ? matchPercent(rms) : 0;
  const calibrated = target ? rms < MATCH_RMS : false;

  /* ---- full redraw of the number line from state ------------------------- */
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
    ctx.clearRect(0, 0, W, H);

    const S = sceneRef.current;
    const sa = S.a, sb = S.b, sx0 = S.x;
    const val = evaluate(sx0, sa, sb);
    const ax = sa * sx0;

    const { wmin, wmax, step: gstep } = fitWindow(sx0, sa, sb);
    const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';

    const padL = 30;
    const padR = 22;
    const axisLeft = padL;
    const axisRight = W - padR;
    const baseY = Math.round(H * 0.54);
    const sx = (wx) => axisLeft + ((wx - wmin) / (wmax - wmin)) * (axisRight - axisLeft);
    // remember the transform so the pointer handler can invert clicks to world-x
    S.tx = { wmin, wmax, axisLeft, axisRight };

    /* quadrille paper: faint verticals at every integer + a few horizontals */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.55)';
    ctx.beginPath();
    for (let gx = Math.ceil(wmin); gx <= wmax; gx++) {
      const X = Math.round(sx(gx)) + 0.5;
      ctx.moveTo(X, 0);
      ctx.lineTo(X, H);
    }
    const hrows = 6;
    for (let i = 0; i <= hrows; i++) {
      const Y = Math.round((i / hrows) * H) + 0.5;
      ctx.moveTo(0, Y);
      ctx.lineTo(W, Y);
    }
    ctx.stroke();

    /* the number-line axis with an arrowhead at each end */
    const bY = Math.round(baseY) + 0.5;
    ctx.strokeStyle = 'rgba(28,43,58,0.6)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(axisLeft - 6, bY);
    ctx.lineTo(axisRight + 6, bY);
    ctx.stroke();
    const axEnd = (X, dir) => {
      ctx.beginPath();
      ctx.moveTo(X, bY);
      ctx.lineTo(X - dir * 7, bY - 4);
      ctx.moveTo(X, bY);
      ctx.lineTo(X - dir * 7, bY + 4);
      ctx.stroke();
    };
    axEnd(axisLeft - 6, -1);
    axEnd(axisRight + 6, 1);

    /* ticks + integer labels at the nice step */
    ctx.font = `11px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const tickStart = Math.ceil(wmin / gstep) * gstep;
    for (let t = tickStart; t <= wmax + 1e-9; t += gstep) {
      const X = sx(t);
      ctx.strokeStyle = 'rgba(28,43,58,0.5)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(X, bY - 4);
      ctx.lineTo(X, bY + 4);
      ctx.stroke();
      ctx.fillStyle = 'rgba(91,107,123,0.95)';
      ctx.fillText(fmt(t), X, bY + 7);
    }

    /* a "hop" — a bezier bump from X0 to X1 with an arrowhead at the landing */
    const hop = (X0, X1, peak, color, width, label) => {
      const c = peak / 0.75; // control height so the actual peak ≈ `peak`
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(X0, baseY);
      ctx.bezierCurveTo(X0, baseY - c, X1, baseY - c, X1, baseY);
      ctx.stroke();
      const dir = Math.sign(X1 - X0) || 1; // travel direction (left for negative x)
      ctx.beginPath(); // ">" arrowhead pointing the way the walk moves
      ctx.moveTo(X1, baseY);
      ctx.lineTo(X1 - dir * 6, baseY - 4);
      ctx.moveTo(X1, baseY);
      ctx.lineTo(X1 - dir * 6, baseY + 4);
      ctx.stroke();
      if (label) {
        ctx.fillStyle = color;
        ctx.font = `600 12px ${MONO}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(label, (X0 + X1) / 2, baseY - peak - 3);
      }
    };

    /* start-at-0 marker */
    ctx.strokeStyle = 'rgba(28,43,58,0.55)';
    ctx.fillStyle = PAPER;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(sx(0), baseY, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    /* THE WALK — variable term first (carmine x-jumps), then constant (blue) */
    const varPeak = Math.min(46, H * 0.3);
    const unitPeak = Math.min(20, H * 0.14);
    if (sx0 !== 0) {
      for (let i = 0; i < sa; i++) {
        hop(sx(i * sx0), sx((i + 1) * sx0), varPeak, CURVE, 2.6, 'x');
      }
    }
    if (sb !== 0) {
      const unitPx = Math.abs(sx(1) - sx(0));
      if (unitPx >= 8 && Math.abs(sb) <= 8) {
        const dir = sb > 0 ? 1 : -1;
        for (let j = 0; j < Math.abs(sb); j++) {
          hop(sx(ax + j * dir), sx(ax + (j + 1) * dir), unitPeak, CONST_COL, 2.1, null);
        }
      } else {
        // fallback (only if the units would be too cramped): one labelled bracket
        hop(sx(ax), sx(val), unitPeak, CONST_COL, 2.1, `${sb > 0 ? '+' : MINUS}${Math.abs(sb)}`);
      }
    }

    /* subtotal marker where the variable term ends (a·x), before the constant */
    if (sa > 0 && sb !== 0 && sx0 !== 0) {
      ctx.strokeStyle = CURVE;
      ctx.fillStyle = PAPER;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(sx(ax), baseY, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    /* the VALUE — the landing point, an ink dot + a boxed number above it */
    const valX = sx(val);
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(valX, baseY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PAPER;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    {
      const lab = fmt(val);
      ctx.font = `700 13px ${MONO}`;
      const tw = ctx.measureText(lab).width;
      const lx = Math.min(Math.max(valX, axisLeft + tw / 2 + 6), axisRight - tw / 2 - 6);
      const ly = baseY - 22;
      ctx.fillStyle = 'rgba(251,251,248,0.94)';
      ctx.fillRect(lx - tw / 2 - 5, ly - 2, tw + 10, 18);
      ctx.strokeStyle = 'rgba(28,43,58,0.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(lx - tw / 2 - 4.5, ly - 1.5, tw + 9, 17);
      ctx.fillStyle = INK;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(lab, lx, ly);
    }

    /* the x reference bar (carmine) — anchors "this is what x is" even at a = 0 */
    const refY = baseY + 32;
    if (sx0 !== 0) {
      ctx.strokeStyle = CURVE;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sx(0), refY);
      ctx.lineTo(sx(sx0), refY);
      ctx.stroke();
      ctx.lineCap = 'butt';
    } else {
      ctx.fillStyle = CURVE;
      ctx.beginPath();
      ctx.arc(sx(0), refY, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    {
      const lab = `x = ${fmt(sx0)}`;
      ctx.font = `600 12px ${MONO}`;
      const tw = ctx.measureText(lab).width;
      const rightEnd = Math.max(sx(0), sx(sx0));
      const lx = Math.min(rightEnd + 8, axisRight - tw);
      ctx.fillStyle = CURVE;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(lab, lx, refY);
    }

    /* calibration: the hidden machine's output as a grey dashed ghost ring */
    if (S.calib && S.target) {
      const Et = evaluate(sx0, S.target.a, S.target.b);
      ctx.strokeStyle = 'rgba(91,107,123,0.9)';
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx(Et), baseY, 8.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = `11px ${MONO}`;
      ctx.fillStyle = 'rgba(91,107,123,0.95)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('machine', sx(Et), baseY + 40);
    }
  }, []);

  /* redraw whenever the picture-affecting state changes */
  useEffect(() => {
    draw();
  }, [x, a, b, step, target, draw]);

  /* redraw on resize (the canvas is fluid) */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* hand a target to the calibration step the first time we reach it */
  useEffect(() => {
    if (current.calib && !target) setTarget(makeTarget(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---- interaction handlers ---------------------------------------------- */
  const onParam = (key, value) => {
    const v = parseInt(value, 10);
    if (key === 'x') setX(v);
    else if (key === 'a') setA(v);
    else setB(v);
  };

  // click (or tap) the number line to place the variable at the nearest integer
  const onStagePointerDown = (e) => {
    if (step < 1) return; // x isn't live until it unlocks
    const tx = sceneRef.current.tx;
    if (!tx) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const wx = tx.wmin + ((cssX - tx.axisLeft) / (tx.axisRight - tx.axisLeft)) * (tx.wmax - tx.wmin);
    const nx = Math.max(PARAMS[0].min, Math.min(PARAMS[0].max, Math.round(wx)));
    setX(nx);
  };

  const resetDials = () => {
    setX(START.x);
    setA(START.a);
    setB(START.b);
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

  const values = { x, a, b };
  const spoken =
    `The variable x equals ${fmt(x)}. The expression is ${exprString(a, b)}. ` +
    `Substituting, it evaluates to ${fmt(E)}.` +
    (calib && calibrated ? ' Calibrated — your rule matches the machine.' : '');

  return (
    <div className="vlab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>The Variable</h1>
        <p className="lede">
          A <em>variable</em> is a letter that stands for a number — and that number can{' '}
          <em>change</em>. Build the expression{' '}
          <span className="mono">a·x&nbsp;+&nbsp;b</span> one dial at a time, watch the carmine{' '}
          <em>variable term</em> resize while the blue <em>constant term</em> holds still, then
          finish by cracking a mystery input→output rule.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">{exprString(a, b)}</p>
            <p className="equation-sub mono">= {substString(a, b, x)}</p>
          </div>

          <div
            className="stage"
            ref={stageRef}
            onPointerDown={onStagePointerDown}
            role="img"
            aria-label={spoken}
          >
            <canvas ref={canvasRef} />
            <span className="hint mono">
              {step >= 1 ? 'click the line to set x' : 'the variable unlocks next step'}
            </span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
          </p>

          <div className="legend" aria-hidden="true">
            <span className="lg">
              <span className="sw" style={{ background: CURVE }} /> variable term&nbsp;
              <span className="mono">a·x</span>
            </span>
            <span className="lg">
              <span className="sw" style={{ background: CONST_COL }} /> constant term&nbsp;
              <span className="mono">+ b</span>
            </span>
            <span className="lg">
              <span className="dt" /> value
            </span>
            {calib && (
              <span className="lg">
                <span className="ring" /> machine
              </span>
            )}
          </div>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Value of expression</span>
              <span className="fact-v mono" style={{ color: INK, fontWeight: 700 }}>
                {fmt(E)}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Variable term a·x</span>
              <span className="fact-v mono" style={{ color: CURVE }}>
                {a === 0 ? '0 (no x)' : `${fmt(a * x)}`}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Coefficient a</span>
              <span className="fact-v mono">
                {fmt(a)} {a === 1 ? '· one x' : a === 0 ? '· x disappears' : `· ${a} copies of x`}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Constant term b</span>
              <span className="fact-v mono" style={{ color: CONST_COL }}>
                {fmt(b)}
              </span>
            </div>
          </div>

          <div className="toolbar">
            <button type="button" className="btn ghost" onClick={resetDials}>
              Reset dials
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
              const val = values[d.key];
              return (
                <label className={'dial' + (unlocked ? '' : ' locked') + (d.star ? ' star' : '')} key={d.key}>
                  <span className="dk">{d.label}</span>
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
                  <output className="dv">{unlocked ? fmt(val) : '🔒'}</output>
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

          {current.calib && target && (
            <div className="calib">
              <table className="io">
                <thead>
                  <tr>
                    <th>input x</th>
                    <th>machine</th>
                    <th>yours</th>
                  </tr>
                </thead>
                <tbody>
                  {TABLE_INPUTS.map((inp) => {
                    const mo = evaluate(inp, target.a, target.b);
                    const yo = evaluate(inp, a, b);
                    return (
                      <tr key={inp}>
                        <td className="mono">{fmt(inp)}</td>
                        <td className="mono">{fmt(mo)}</td>
                        <td className={'mono' + (yo === mo ? ' hit' : ' miss')}>{fmt(yo)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">match&nbsp;{pct.toFixed(0)}%</span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">rule: a·x + b, a = ?, b = ?</span>
                )}
              </div>
              <button type="button" className="btn ghost" onClick={() => setTarget(makeTarget(target))}>
                New machine
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
                  resetDials();
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">a·x + b</span> &nbsp;·&nbsp; a variable is a letter standing for a
        number; the expression is evaluated live by substitution. CCSS&nbsp;6.EE.A.2, 6.EE.B.6.
      </footer>

      <style jsx>{`
        .vlab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --const: #2f6f9f;
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
          max-width: 70ch;
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
          color: var(--curve);
          font-size: 20px;
          font-weight: 600;
          margin: 0;
        }
        .equation-sub {
          color: var(--ink-soft);
          font-size: 13px;
          margin: 0;
        }
        .stage {
          position: relative;
          width: min(100%, 640px);
          aspect-ratio: 16 / 10;
          margin: 0 auto;
          border: 1px solid var(--quad);
          border-radius: 8px;
          overflow: hidden;
          touch-action: none;
          cursor: crosshair;
          background: linear-gradient(180deg, #fdfefe 0%, #f4f7f9 100%);
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
        .legend {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 16px;
          justify-content: center;
          margin: 10px 4px 2px;
          font-size: 12px;
          color: var(--ink-soft);
        }
        .lg {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .sw {
          width: 16px;
          height: 5px;
          border-radius: 3px;
          display: inline-block;
        }
        .dt {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: var(--ink);
          display: inline-block;
        }
        .ring {
          width: 11px;
          height: 11px;
          border-radius: 50%;
          border: 2px dashed var(--ink-soft);
          display: inline-block;
        }
        .facts {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px 18px;
          margin: 12px 4px 4px;
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
          font-size: 13.5px;
          font-variant-numeric: tabular-nums;
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
          grid-template-columns: 22px 1fr 60px;
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
        .dial.star .dk {
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
        .dial.star input[type='range'] {
          accent-color: var(--curve);
        }
        .dial input[type='range']:disabled {
          cursor: not-allowed;
        }
        .dv {
          grid-column: 3;
          font-family: var(--mono);
          font-variant-numeric: tabular-nums;
          text-align: right;
          font-size: 13.5px;
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
        .io {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .io th {
          text-align: right;
          font-size: 10.5px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ink-soft);
          font-weight: 600;
          padding: 2px 8px 6px;
          border-bottom: 1px solid rgba(28, 43, 58, 0.12);
        }
        .io th:first-child {
          text-align: left;
        }
        .io td {
          text-align: right;
          padding: 4px 8px;
          font-variant-numeric: tabular-nums;
        }
        .io td:first-child {
          text-align: left;
          color: var(--ink-soft);
        }
        .io td.hit {
          color: var(--ok);
          font-weight: 700;
        }
        .io td.miss {
          color: var(--curve);
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
        :global(.vlab) :focus-visible {
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
        }
      `}</style>
    </div>
  );
}
