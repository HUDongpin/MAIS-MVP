'use client';

/* ============================================================================
   ExpressionLab — an interactive "bench" for the TWO-VARIABLE linear
   expression  a·x + b·y.

   Built for MAIS (math AI system, www.mais.ac), K-12.
   House style: the interactive-math-bench standard — quadrille-paper canvas,
   dials that unlock one per lesson step, predict-then-check questions, and a
   calibration challenge with a live match meter.

   This is the two-variable SEQUEL to VariableLab (one variable + constant).
   The new idea is MULTIPLE, INDEPENDENT variables: x and y are two different
   letters standing for two different numbers, each free to change on its own.
   You evaluate the expression by substituting BOTH, and because x and y are
   unlike, their terms a·x and b·y never merge into one.

   THE SIGNATURE CENTERPIECE — the same number-line WALK as VariableLab, now in
   TWO colours. Starting at 0:
       • a CARMINE "x-jumps", each one x long   → the x-term  a·x
       • then b TEAL "y-jumps", each one y long  → the y-term  b·y
   landing on the VALUE. Drag x and only the carmine jumps resize; drag y and
   only the teal jumps resize — the two variables are independent, made visible.

   PRINCIPLED TWO-ACCENT PALETTE (a documented relaxation of the one-accent
   rule, exactly like SystemsOfEquations carmine/blue/gold or Derivative's teal
   second object): CARMINE = the variable x and its term; TEAL = the variable y
   and its term; ink = the resulting value. There is no constant term here, so
   no third colour is needed — this keeps the focus squarely on "two variables."

   DELIBERATELY DISTINCT from its siblings:
     • VariableLab is ONE variable plus a CONSTANT (a·x + b); its whole point is
       variable-term vs constant-term. ExpressionLab drops the constant and adds
       a SECOND variable — its whole point is two independent variables and
       unlike terms.
     • EquationLab solves for an unknown on a balance scale; the function labs
       graph a curve. This lab neither solves nor graphs: it evaluates.

   DROP-IN USAGE (Next.js, app router or pages router):
     import ExpressionLab from './ExpressionLab';
     export default function Page() { return <ExpressionLab />; }
   Zero dependencies. Styles scoped with styled-jsx. JS/TS agnostic.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---- palette (kept in sync with the styled-jsx tokens below) ------------- */
const CURVE = '#c81e4f'; // variable x and its term a·x
const VARY = '#0f8f86'; // variable y and its term b·y (the principled 2nd accent)
const INK = '#1c2b3a';
const INK_SOFT = '#5b6b7b';
const PAPER = '#fbfbf8';
const OK = '#1f8a5b';
const MINUS = '−';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. Four dials, unlocking one per lesson step:
     x — the first variable  (carmine star)
     y — the second variable (teal star)
     a — coefficient of x
     b — coefficient of y
   The expression they build is  E = a·x + b·y.
   ------------------------------------------------------------------------- */
const PARAMS = [
  { key: 'x', label: 'x', min: -4, max: 6, step: 1, unlock: 1, star: 'x', role: 'first variable · its own value' },
  { key: 'y', label: 'y', min: -4, max: 6, step: 1, unlock: 2, star: 'y', role: 'second variable · independent of x' },
  { key: 'a', label: 'a', min: 0, max: 3, step: 1, unlock: 3, role: 'coefficient of x · how many x’s' },
  { key: 'b', label: 'b', min: 0, max: 3, step: 1, unlock: 4, role: 'coefficient of y · how many y’s' },
];
const START = { x: 3, y: 4, a: 1, b: 1 }; // the simplest two-variable expression: x + y = 7

/* ---------------------------------------------------------------------------
   EDIT 2 — Model. Pure math, no pixels.  Substitute both, then a·x + b·y.
   ------------------------------------------------------------------------- */
function evaluate(x, y, a, b) {
  return a * x + b * y;
}

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration ("guess my rule"). A hidden machine turns each (x, y)
   into a·x + b·y. The student tunes a and b to match it. The sampled inputs
   include two linearly-independent (x, y) vectors — e.g. (0,2) and (2,0) — so
   the outputs agree everywhere IFF (a, b) equals the machine's (a*, b*). Every
   non-solution has rms ≥ 1/√8, comfortably above the stamp threshold, so there
   is never a false CALIBRATED.
   ------------------------------------------------------------------------- */
const CALIB_INPUTS = [
  [-1, 2], [1, 1], [2, -1], [2, 3], [3, 1], [1, 3], [0, 2], [2, 0],
];
const TABLE_INPUTS = [
  [1, 1], [2, 1], [1, 2], [3, 2],
]; // solvable but non-trivial: (1,0)/(0,1) are hidden so a*,b* aren't just handed over

function ruleRms(p, t) {
  let s = 0;
  for (const [x, y] of CALIB_INPUTS) {
    const d = evaluate(x, y, p.a, p.b) - evaluate(x, y, t.a, t.b); // (Δa)x + (Δb)y
    s += d * d;
  }
  return Math.sqrt(s / CALIB_INPUTS.length);
}
const matchPercent = (rms) => Math.max(0, Math.min(100, 100 / (1 + rms / 1.0)));
const MATCH_RMS = 0.05; // exact integer match only -> CALIBRATED

function makeTarget(prev) {
  let t;
  do {
    const a = 1 + Math.floor(Math.random() * 3); // 1..3
    const b = 1 + Math.floor(Math.random() * 3); // 1..3
    t = { a, b };
  } while (
    (t.a === 1 && t.b === 1) || // never the trivial starting x + y
    (prev && t.a === prev.a && t.b === prev.b)
  );
  return t;
}

/* ---------------------------------------------------------------------------
   Formatting helpers.
   ------------------------------------------------------------------------- */
function fmt(n) {
  return (Object.is(n, -0) ? 0 : n).toString().replace('-', MINUS);
}
function coefTerm(c, v) {
  return c === 0 ? '' : c === 1 ? v : `${c}${v}`;
}

/* The symbolic expression, e.g. "2x + y", "x + 3y", "2y" (a = 0), "0". */
function exprString(a, b) {
  const xt = coefTerm(a, 'x');
  const yt = coefTerm(b, 'y');
  if (xt && yt) return `${xt} + ${yt}`;
  return xt || yt || '0';
}

/* The substitution shown out loud, e.g.  2·(4) + 3·(5) = 8 + 15 = 23  */
function substString(a, b, x, y) {
  const E = evaluate(x, y, a, b);
  const ax = a * x;
  const by = b * y;
  const termX = a === 0 ? null : a === 1 ? `(${fmt(x)})` : `${a}·(${fmt(x)})`;
  const termY = b === 0 ? null : b === 1 ? `(${fmt(y)})` : `${b}·(${fmt(y)})`;
  if (termX && termY) {
    const stage1 = `${termX} + ${termY}`;
    const stage2 = `${fmt(ax)} ${by < 0 ? MINUS : '+'} ${Math.abs(by)}`;
    return `${stage1} = ${stage2} = ${fmt(E)}`;
  }
  if (termX) return `${termX} = ${fmt(E)}`;
  if (termY) return `${termY} = ${fmt(E)}`;
  return '0 = 0';
}

/* A "nice" tick step (1, 2, 5, 10 …). */
function niceStep(raw) {
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / p;
  const n = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10;
  return n * p;
}

/* Auto-fit the number-line window to the whole walk (0, x, y, a·x, value). */
function fitWindow(x, y, a, b) {
  const E = evaluate(x, y, a, b);
  const ax = a * x;
  const marks = [0, x, y, ax, E];
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
   reveal lives in `feedback`; distractors are real misconceptions (letters are
   interchangeable, a coefficient multiplies both variables, (2+3)(4+5),
   2x + 3y = 5xy). Next is gated on ANSWERED, not CORRECT.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Two variables',
    body:
      'This expression has TWO letters: x and y. Each is a variable — a letter that stands for a ' +
      'number — and they are different variables, so they can hold different numbers. Right now the ' +
      'expression is just x + y, with x = 3 and y = 4, so it is worth 7. The carmine bar is x, the ' +
      'teal bar is y.',
    q: 'In the expression x + y, how many different variables are there?',
    choices: ['2 — x and y', '1 — x and y are the same letter', '0 — they are just letters'],
    answer: 0,
    feedback:
      'There are two: x and y. Different letters stand for different numbers, and each can change on ' +
      'its own. A letter always stands for a number — here two separate ones.',
  },
  {
    title: 'x — the first variable',
    body:
      'The x dial is now live (carmine). Drag it — or click the number line — and watch only the ' +
      'carmine x-jump and the value change. The y part is holding still at y = 4 for now.',
    q: 'In x + y you slide x from 3 to 5, leaving y = 4. What is the value now?',
    choices: ['9 — that is 5 + 4', '5 — just the new x', '7 — it does not change'],
    answer: 0,
    feedback:
      'Substitute the new x: 5 + 4 = 9. Only the x part moved; y stayed 4, so its teal jump did not ' +
      'change. Each variable carries its own value into the expression.',
  },
  {
    title: 'y — a second, independent variable',
    body:
      'Now the y dial unlocks (teal). x and y are independent: changing one does not touch the ' +
      'other’s term. Watch — moving y resizes only the teal jumps; the carmine x-jumps stay put.',
    q: 'In x + y you change only y. Which part of the value changes?',
    choices: ['Only the y part — the x part stays', 'Both parts change together', 'Only the x part'],
    answer: 0,
    feedback:
      'Only the y part responds to y. Because x and y are independent variables, the teal y-jumps and ' +
      'the carmine x-jumps move separately. That independence is exactly why an x-term and a y-term ' +
      'can never be merged into one.',
  },
  {
    title: 'The coefficient of x',
    body:
      'The a dial unlocks. Just like a one-variable expression, a·x means a copies of x — a carmine ' +
      'jumps, each one x long. The coefficient a multiplies its OWN variable, x.',
    q: 'If a = 2 and x = 5, what is the x-term 2x worth?',
    choices: ['10 — that is 5 + 5', '25 — the digits 2 and 5', '7 — that is 2 + 5'],
    answer: 0,
    feedback:
      '2x means 2·5 = 10 — two copies of x. The coefficient multiplies its own variable only: the 2 ' +
      'in 2x acts on x, not on y. It is not the number “25,” and not 2 + 5.',
  },
  {
    title: 'The coefficient of y',
    body:
      'The b dial unlocks, completing a·x + b·y. Now there are a carmine x-jumps and then b teal ' +
      'y-jumps. Each coefficient stays with its own variable.',
    q: 'In the expression 2x + 3y, what does the 3 multiply?',
    choices: ['y only — it makes 3y', 'x only — it makes 3x', 'both x and y'],
    answer: 0,
    feedback:
      'Each coefficient multiplies only its own variable: the 3 multiplies y (giving 3y) and the 2 ' +
      'multiplies x (giving 2x). Coefficients do not cross over to the other variable.',
  },
  {
    title: 'Evaluate — substitute both',
    body:
      'To evaluate, substitute EACH variable with its number, multiply each term, then add. Multiply ' +
      'before you add (order of operations). The full substitution is written out live below.',
    q: 'Evaluate 2x + 3y when x = 4 and y = 5.',
    choices: ['23 — 2·4 = 8 and 3·5 = 15, then 8 + 15', '45 — did (2 + 3)·(4 + 5)', '9 — added 4 + 5, ignoring the coefficients'],
    answer: 0,
    feedback:
      'Substitute both: 2·(4) + 3·(5) = 8 + 15 = 23. Do each term on its own, multiply before adding, ' +
      'and keep the x-part and y-part separate — you cannot mash them into (2 + 3)·(4 + 5).',
  },
  {
    title: 'Unlike terms won’t combine',
    body:
      'Because x and y can be different numbers, a·x and b·y are UNLIKE terms. You can only add terms ' +
      'that share the same variable, so 2x + 3y cannot be shortened to a single term — it stays as two.',
    q: 'Can the expression 2x + 3y be simplified to one single term?',
    choices: ['No — x and y are unlike; it stays 2x + 3y', 'Yes — it equals 5xy', 'Yes — it equals 5x'],
    answer: 0,
    feedback:
      'No. Only LIKE terms (same variable) can be combined. x and y are different variables, so ' +
      '2x + 3y is already in simplest form — it is not 5xy, not 5x, and not 5. On the line, the ' +
      'carmine and teal jumps are different lengths; they never merge.',
  },
  {
    title: 'Guess my rule',
    body:
      'Final challenge. A hidden machine turns each pair (x, y) into an output using a secret rule ' +
      'a·x + b·y. A few of its input→output rows are shown. Set your a and b to match it for every ' +
      'input. Drag x and y to probe — the grey ring is the machine’s output; your walk should land ' +
      'inside it. Reach CALIBRATED, then press New machine.',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function ExpressionLab() {
  const [x, setX] = useState(START.x);
  const [y, setY] = useState(START.y);
  const [a, setA] = useState(START.a);
  const [b, setB] = useState(START.b);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [target, setTarget] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const E = evaluate(x, y, a, b);

  sceneRef.current = { ...sceneRef.current, x, y, a, b, calib, target };

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

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const S = sceneRef.current;
    const sa = S.a, sb = S.b, sx0 = S.x, sy0 = S.y;
    const val = evaluate(sx0, sy0, sa, sb);
    const ax = sa * sx0;

    const { wmin, wmax, step: gstep } = fitWindow(sx0, sy0, sa, sb);
    const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';

    const padL = 30;
    const padR = 22;
    const axisLeft = padL;
    const axisRight = W - padR;
    const baseY = Math.round(H * 0.47);
    const sx = (wx) => axisLeft + ((wx - wmin) / (wmax - wmin)) * (axisRight - axisLeft);
    S.tx = { wmin, wmax, axisLeft, axisRight };

    /* quadrille paper */
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

    /* number-line axis with arrowheads */
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

    /* ticks + integer labels */
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

    /* a "hop" — bezier bump with an arrowhead at the landing */
    const hop = (X0, X1, peak, color, width, label) => {
      const c = peak / 0.75;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(X0, baseY);
      ctx.bezierCurveTo(X0, baseY - c, X1, baseY - c, X1, baseY);
      ctx.stroke();
      const dir = Math.sign(X1 - X0) || 1;
      ctx.beginPath();
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

    /* THE WALK — carmine x-jumps, then teal y-jumps */
    const xPeak = Math.min(46, H * 0.3);
    const yPeak = Math.min(34, H * 0.22);
    if (sx0 !== 0) {
      for (let i = 0; i < sa; i++) hop(sx(i * sx0), sx((i + 1) * sx0), xPeak, CURVE, 2.6, 'x');
    }
    if (sy0 !== 0) {
      for (let j = 0; j < sb; j++) hop(sx(ax + j * sy0), sx(ax + (j + 1) * sy0), yPeak, VARY, 2.4, 'y');
    }

    /* subtotal marker where the x-term ends (a·x), before the y-jumps */
    if (sa > 0 && sb > 0 && sx0 !== 0) {
      ctx.strokeStyle = CURVE;
      ctx.fillStyle = PAPER;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(sx(ax), baseY, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    /* the VALUE — landing point + boxed number above */
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

    /* the two variable reference bars: carmine x, teal y */
    const refBar = (v, ry, color, letter) => {
      if (v !== 0) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(sx(0), ry);
        ctx.lineTo(sx(v), ry);
        ctx.stroke();
        ctx.lineCap = 'butt';
      } else {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(sx(0), ry, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      const lab = `${letter} = ${fmt(v)}`;
      ctx.font = `600 12px ${MONO}`;
      const tw = ctx.measureText(lab).width;
      const rightEnd = Math.max(sx(0), sx(v));
      const lx = Math.min(rightEnd + 8, axisRight - tw);
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(lab, lx, ry);
    };
    refBar(sx0, baseY + 30, CURVE, 'x');
    refBar(sy0, baseY + 50, VARY, 'y');

    /* calibration ghost ring — the machine's output for the current (x, y) */
    if (S.calib && S.target) {
      const Et = evaluate(sx0, sy0, S.target.a, S.target.b);
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
      ctx.fillText('machine', sx(Et), baseY - Math.min(46, H * 0.3) - 6);
    }
  }, []);

  useEffect(() => {
    draw();
  }, [x, y, a, b, step, target, draw]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  useEffect(() => {
    if (current.calib && !target) setTarget(makeTarget(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---- interaction handlers ---------------------------------------------- */
  const onParam = (key, value) => {
    const v = parseInt(value, 10);
    if (key === 'x') setX(v);
    else if (key === 'y') setY(v);
    else if (key === 'a') setA(v);
    else setB(v);
  };

  // click the number line to set x (the first variable) to the nearest integer
  const onStagePointerDown = (e) => {
    if (step < 1) return;
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
    setY(START.y);
    setA(START.a);
    setB(START.b);
  };

  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };

  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const values = { x, y, a, b };
  const spoken =
    `The expression is ${exprString(a, b)}. x equals ${fmt(x)}, y equals ${fmt(y)}. ` +
    `It evaluates to ${fmt(E)}.` +
    (calib && calibrated ? ' Calibrated — your rule matches the machine.' : '');

  return (
    <div className="xlab">
      <header className="head">
        <h1>Two-Variable Expressions</h1>
        <p className="lede">
          Two letters, two numbers. Build{' '}
          <span className="mono">a·x&nbsp;+&nbsp;b·y</span> one dial at a time and watch the{' '}
          <em style={{ color: CURVE, fontStyle: 'normal', fontWeight: 600 }}>carmine x-term</em> and{' '}
          <em style={{ color: VARY, fontStyle: 'normal', fontWeight: 600 }}>teal y-term</em> move{' '}
          <em>independently</em> — then crack a mystery two-input rule.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation" style={{ color: INK }}>
              {coefTerm(a, 'x') && <span style={{ color: CURVE }}>{coefTerm(a, 'x')}</span>}
              {coefTerm(a, 'x') && coefTerm(b, 'y') && <span> + </span>}
              {coefTerm(b, 'y') && <span style={{ color: VARY }}>{coefTerm(b, 'y')}</span>}
              {!coefTerm(a, 'x') && !coefTerm(b, 'y') && <span>0</span>}
            </p>
            <p className="equation-sub mono">= {substString(a, b, x, y)}</p>
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
              {step >= 1 ? 'click the line to set x' : 'the variables unlock next'}
            </span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
          </p>

          <div className="legend" aria-hidden="true">
            <span className="lg">
              <span className="sw" style={{ background: CURVE }} /> x-term&nbsp;
              <span className="mono">a·x</span>
            </span>
            <span className="lg">
              <span className="sw" style={{ background: VARY }} /> y-term&nbsp;
              <span className="mono">b·y</span>
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
              <span className="fact-k">x-term a·x</span>
              <span className="fact-v mono" style={{ color: CURVE }}>
                {a === 0 ? '0 (no x)' : `${coefTerm(a, 'x')} = ${fmt(a * x)}`}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">y-term b·y</span>
              <span className="fact-v mono" style={{ color: VARY }}>
                {b === 0 ? '0 (no y)' : `${coefTerm(b, 'y')} = ${fmt(b * y)}`}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Variables</span>
              <span className="fact-v mono">
                x = {fmt(x)}, y = {fmt(y)}
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
                <label
                  className={'dial' + (unlocked ? '' : ' locked') + (d.star ? ' star-' + d.star : '')}
                  key={d.key}
                >
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
                    <th>x</th>
                    <th>y</th>
                    <th>machine</th>
                    <th>yours</th>
                  </tr>
                </thead>
                <tbody>
                  {TABLE_INPUTS.map(([ix, iy]) => {
                    const mo = evaluate(ix, iy, target.a, target.b);
                    const yo = evaluate(ix, iy, a, b);
                    return (
                      <tr key={`${ix},${iy}`}>
                        <td className="mono">{fmt(ix)}</td>
                        <td className="mono">{fmt(iy)}</td>
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
                  <span className="mono target-hint">rule: a·x + b·y, a = ?, b = ?</span>
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
        <span className="mono">a·x + b·y</span> &nbsp;·&nbsp; two independent variables, evaluated
        live by substituting both. CCSS&nbsp;6.EE.A.2, 6.EE.B.6.
      </footer>

      <style jsx>{`
        .xlab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --vary: #0f8f86;
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
        .dial.star-x .dk {
          color: var(--curve);
        }
        .dial.star-y .dk {
          color: var(--vary);
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
        .dial.star-x input[type='range'] {
          accent-color: var(--curve);
        }
        .dial.star-y input[type='range'] {
          accent-color: var(--vary);
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
        .io td {
          text-align: right;
          padding: 4px 8px;
          font-variant-numeric: tabular-nums;
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
        :global(.xlab) :focus-visible {
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
