'use client';

/* ============================================================================
   SubtractionLab — an interactive "bench" for whole-number SUBTRACTION,
   a − b = c,  taught within 20 for Kindergarten–Grade 1.

   Built for MAIS (math AI system, www.mais.ac), K-12.
   House style: the interactive-math-bench standard — a quadrille-paper canvas,
   ONE carmine accent for the mathematical object, dials that unlock one per
   lesson step, predict-then-check questions, and a calibration challenge with
   a live match meter.

   THE SIGNATURE CENTERPIECE — "counters that ride the number line."
   The `a` counters are placed ONE PER TICK directly above the number line, so
   the take-away set and the number-line jump are literally the SAME picture:
   taking away the rightmost `b` counters leaves `c` counters ending exactly
   over the spot where the backward jump lands. Children SEE that
        "take b away from a"  and  "start at a and count back b"
   are the same thing, and both give the difference c. The capstone idea is the
   inverse relationship  a − b = c  ⟺  c + b = a  (CCSS 1.OA.B.4), shown as a
   forward "check" arc that carries you back to where you started.

   Standards: K.OA.A.1–2 (take-away with objects), 1.OA.C.5 (relate counting to
   subtraction — count back), 1.OA.C.6 (subtract within 20), 1.OA.B.4
   (subtraction as an unknown-addend problem). Multi-digit regrouping (2.NBT) is
   a natural follow-on lab, deliberately out of scope here.

   MATH CORRECTNESS GUARANTEES (this is a K-12 product):
     • Whole numbers only; the subtrahend dial's max is clamped to the minuend,
       so you can never take away more than you have and the difference is
       always a whole number ≥ 0 (no negatives introduced before their grade).
     • Every readout is exact integer arithmetic — no floating point in the math.
     • The addition check c + b = a holds for every reachable state.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/SubtractionLab.jsx
     2. Import and render it:
          import SubtractionLab from './SubtractionLab';
          export default function Page() { return <SubtractionLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (minuend, subtrahend,
              lesson step).
     MODEL  — the math is pure integer arithmetic; it knows nothing about pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 3 — World window. A number line is one-dimensional, so the "world" is
   just the range of whole numbers on the line. Subtraction within 20.
   ------------------------------------------------------------------------- */
const N = 20; // the number line runs 0 … 20

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. Subtraction needs exactly two: the minuend (how many you
   start with) and the subtrahend (how many you take away). Each dial names the
   lesson step at which it unlocks. The subtrahend's usable max is clamped to
   the current minuend at render time (see the dial loop) — you cannot take away
   more than you have.
   ------------------------------------------------------------------------- */
const PARAMS = [
  { key: 'min', label: 'a', min: 0, max: N, step: 1, unlock: 1, role: 'minuend · how many you start with' },
  { key: 'sub', label: 'b', min: 0, max: N, step: 1, unlock: 2, role: 'subtrahend · how many you take away' },
];
const START = { min: 8, sub: 3 };

const HOPS_STEP = 3;  // "count back on the number line" — unit hops auto-appear here
const CHECK_STEP = 4; // "check by adding" — the forward inverse arc auto-appears here

/* ---------------------------------------------------------------------------
   EDIT 2 — Model. Pure integer arithmetic, no pixels.  difference c = a − b.
   Because the subtrahend is clamped to the minuend, c is always a whole
   number ≥ 0.
   ------------------------------------------------------------------------- */
function difference(a, b) {
  return a - b;
}

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration. There is no curve to RMS-match, so the capstone is a
   CONSTRUCTION goal (the skill's sanctioned alternative): reproduce a mystery
   take-away shown as a ghost START ring at A and a ghost LANDING flag at C.
   The subtrahend B = A − C is hidden — the student must set the minuend to A
   and take away just enough to land on C. That is the missing-subtrahend /
   unknown-addend problem, CCSS 1.OA.B.4.

   The meter is a simple discrete "getting warmer": err counts how far the two
   endpoints (start and landing) are from the target. Exact match → CALIBRATED.
   ------------------------------------------------------------------------- */
function calibError(a, b, t) {
  // both terms are non-negative integers; 0 iff the student reproduced A and C
  return Math.abs(a - t.A) + Math.abs(a - b - t.C);
}
const matchPercent = (err) => Math.max(0, Math.min(100, 100 / (1 + 0.5 * err)));

function makeTarget(prev) {
  let t;
  do {
    const A = 6 + Math.floor(Math.random() * 13);   // 6 … 18
    const C = Math.floor(Math.random() * (A - 1));   // 0 … A−2  (so B ≥ 2)
    t = { A, C, B: A - C };
  } while (
    (prev && t.A === prev.A && t.C === prev.C) ||
    (t.A === START.min && t.B === START.sub) // never hand back the starting fact
  );
  return t;
}

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; the dial unlocks with its step; the
   reveal lives in `feedback` (shown only after answering); distractors are real
   student misconceptions. Next is gated on ANSWERED, not on CORRECT.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet subtraction',
    body:
      'Subtraction means TAKING AWAY. We write it a − b = ?. You start with a counters, take ' +
      'b of them away, and count how many are left. Right now you have 8 counters and take 3 ' +
      'away — watch the last 3 counters get crossed out and the arrow jump back to what is left.',
    q: 'What does the minus sign “−” tell you to do?',
    choices: ['Take some away', 'Add some more', 'Start over at zero'],
    answer: 0,
    feedback:
      'The minus sign means take away. In a − b, the first number a is the MINUEND (how many you ' +
      'start with), b is the SUBTRAHEND (how many you take away), and the answer is called the ' +
      'DIFFERENCE — the amount left over.',
  },
  {
    title: 'a — how many you start with',
    body: 'The a dial is the minuend: how many counters you begin with. Drag it.',
    q: 'You take away the same amount, but start with MORE counters. The number left will be…',
    choices: ['More than before', 'Less than before', 'Exactly the same'],
    answer: 0,
    feedback: 'Start with more, take away the same — and more is left over.',
  },
  {
    title: 'b — how many you take away',
    body:
      'Now the b dial is live — the subtrahend, how many you take away. Each one you remove is one ' +
      'more step back on the number line, so a bigger b makes a longer backward jump and leaves fewer.',
    q: 'You take away MORE (make b bigger). The difference — the amount left — gets…',
    choices: ['Smaller', 'Bigger', 'Stays the same'],
    answer: 0,
    feedback:
      'Take away more and less is left, so the difference gets smaller and the jump reaches further ' +
      'back. Notice you can never set b past a: you cannot take away more counters than you have, ' +
      'so the answer never drops below zero.',
  },
  {
    title: 'Count back on the number line',
    body:
      'Here is the key picture. To subtract, START at a and COUNT BACK b steps — one hop left for ' +
      'each counter you take away. Where you land is the difference. The counters left over end ' +
      'exactly above that landing spot, because they are the very same picture.',
    q: 'Starting at a and counting back b steps on the number line is the same as…',
    choices: ['Subtracting b from a', 'Adding b to a', 'Doubling a'],
    answer: 0,
    feedback:
      'Counting back b steps IS subtracting b. Each hop removes one, so b hops remove b — and you ' +
      'land on a − b. Press “Count back” to watch the hops one at a time.',
  },
  {
    title: 'Check by adding',
    body:
      'Subtraction and addition are opposites — each one undoes the other. If a − b = c, then ' +
      'jumping FORWARD b from your answer must bring you right back to a. So c + b = a. That is ' +
      'how you check a subtraction, and it is the same three numbers as a “fact family.”',
    q: 'You worked out 9 − 4 = 5. Which addition checks that answer?',
    choices: ['5 + 4 = 9', '9 + 4 = 13', '5 + 9 = 14'],
    answer: 0,
    feedback:
      'Because 9 − 4 = 5, adding the 4 back gives 5 + 4 = 9 — you return to where you started. ' +
      'The three numbers 5, 4, and 9 form a fact family: 5 + 4 = 9, 4 + 5 = 9, 9 − 4 = 5, 9 − 5 = 4.',
  },
  {
    title: 'Calibration challenge',
    body:
      'Final challenge! A mystery take-away is shown with a faint ring on the START number and a ' +
      'little flag on the ANSWER. Set a to begin on the ring, then take away just enough to land ' +
      'your jump on the flag. Press “New target” for a fresh one.',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   Formatting helper — a proper minus sign (−) instead of a hyphen.
   ------------------------------------------------------------------------- */
const MINUS = '−';

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function SubtractionLab() {
  const [min, setMin] = useState(START.min); // minuend
  const [sub, setSub] = useState(START.sub); // subtrahend
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null);
  const [showHops, setShowHops] = useState(false);   // draw the b unit-hops (count back)
  const [showCheck, setShowCheck] = useState(false); // draw the forward +b inverse arc
  const [counting, setCounting] = useState(false);   // animating the count-back token

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const hoverRef = useRef(null); // whole number under the pointer, or null
  const tokenRef = useRef(null); // world-x of the animated count-back token, or null
  const sceneRef = useRef({});

  const a = min;
  const b = sub;
  const c = difference(a, b);
  const current = STEPS[step];
  const calib = !!current.calib;

  // Snapshot everything the renderer needs so draw() (a stable callback) and the
  // pointer / animation handlers never read stale values.
  sceneRef.current = {
    a,
    b,
    c,
    calib,
    target,
    showHops: showHops && !calib,
    showCheck: showCheck && !calib,
  };

  const err = target ? calibError(a, b, target) : Infinity;
  const pct = target ? matchPercent(err) : 0;
  const calibrated = target ? err === 0 : false;

  /* ---- full redraw from state -------------------------------------------- */
  const draw = useCallback(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;

    const W = stage.clientWidth;
    const H = stage.clientHeight;
    if (W === 0 || H === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2); // capped: crisp + fast
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels

    const S = sceneRef.current;
    const A = S.a;
    const B = S.b;
    const C = S.c;

    /* number-line geometry (in CSS pixels) */
    const padL = 34;
    const padR = 26;
    const lineY = Math.round(H * 0.60);
    const x = (n) => padL + (n / N) * (W - padL - padR);
    const u = (W - padL - padR) / N; // pixels per unit
    const counterR = Math.max(5, Math.min(9, u * 0.34));
    const counterY = Math.round(H * 0.30); // single row of counters, above the line

    const INK = '#1c2b3a';
    const INK_SOFT = '#5b6b7b';
    const CURVE = '#c81e4f';
    const PAPER = '#fbfbf8';

    ctx.clearRect(0, 0, W, H);

    /* ---- quadrille paper: faint unit grid ---- */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.7)';
    ctx.beginPath();
    for (let n = 0; n <= N; n++) {
      const X = Math.round(x(n)) + 0.5;
      ctx.moveTo(X, 0);
      ctx.lineTo(X, H);
    }
    // a couple of horizontal rules to keep the "graph paper" feel
    for (let gy = counterY; gy <= H - 8; gy += Math.max(24, u)) {
      const Y = Math.round(gy) + 0.5;
      ctx.moveTo(0, Y);
      ctx.lineTo(W, Y);
    }
    ctx.stroke();

    /* ---- benchmark guide lines at 5, 10, 15 (numbers kids anchor to) ---- */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(28,43,58,0.10)';
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    for (const g of [5, 10, 15]) {
      const X = Math.round(x(g)) + 0.5;
      ctx.moveTo(X, counterY - counterR - 8);
      ctx.lineTo(X, lineY);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    /* ---- the counters, one per tick over 1 … a ---------------------------
       Kept counters (1 … c) are carmine — they are the difference, the math
       object. Taken-away counters (c+1 … a) are neutral outlines with a slash:
       clearly "gone." As b grows, counters are removed from the RIGHT, and the
       kept run ends exactly over the landing spot c. */
    for (let n = 1; n <= A; n++) {
      const cx = x(n);
      const kept = n <= C;
      ctx.beginPath();
      ctx.arc(cx, counterY, counterR, 0, Math.PI * 2);
      if (kept) {
        ctx.fillStyle = CURVE;
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(150,18,58,0.9)';
        ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(91,107,123,0.08)';
        ctx.fill();
        ctx.lineWidth = 1.4;
        ctx.setLineDash([2, 2]);
        ctx.strokeStyle = 'rgba(91,107,123,0.75)';
        ctx.stroke();
        ctx.setLineDash([]);
        // the take-away slash
        const s = counterR * 0.72;
        ctx.beginPath();
        ctx.moveTo(cx - s, counterY + s);
        ctx.lineTo(cx + s, counterY - s);
        ctx.strokeStyle = 'rgba(91,107,123,0.85)';
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
    }

    /* ---- the number line ---- */
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(28,43,58,0.75)';
    ctx.beginPath();
    ctx.moveTo(x(0), lineY);
    ctx.lineTo(x(N) + 6, lineY);
    ctx.stroke();
    // right arrowhead (the line continues)
    ctx.beginPath();
    ctx.moveTo(x(N) + 6, lineY);
    ctx.lineTo(x(N) - 1, lineY - 4);
    ctx.lineTo(x(N) - 1, lineY + 4);
    ctx.closePath();
    ctx.fillStyle = 'rgba(28,43,58,0.75)';
    ctx.fill();

    /* ticks + labels 0 … N (benchmarks bolder). Labels thin out on narrow
       screens so digits never collide: every unit when there is room, else
       every 2, else just the 5-benchmarks — but ticks stay every 1. */
    const labelStride = u >= 22 ? 1 : u >= 14 ? 2 : 5;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let n = 0; n <= N; n++) {
      const X = x(n);
      const major = n % 5 === 0;
      ctx.strokeStyle = 'rgba(28,43,58,0.55)';
      ctx.lineWidth = major ? 1.8 : 1;
      ctx.beginPath();
      ctx.moveTo(X, lineY);
      ctx.lineTo(X, lineY + (major ? 9 : 5));
      ctx.stroke();
      if (major || n % labelStride === 0) {
        ctx.fillStyle = major ? INK : INK_SOFT;
        ctx.font = major
          ? '600 12px ui-monospace, "SF Mono", Menlo, monospace'
          : '10.5px ui-monospace, "SF Mono", Menlo, monospace';
        ctx.fillText(String(n), X, lineY + 11);
      }
    }

    /* helper: a rounded value label on a paper chip */
    const chip = (text, cx, cy, color, align) => {
      ctx.font = '600 12.5px ui-monospace, "SF Mono", Menlo, monospace';
      const tw = ctx.measureText(text).width;
      let bx = cx - tw / 2;
      if (align === 'left') bx = cx;
      else if (align === 'right') bx = cx - tw;
      ctx.fillStyle = 'rgba(251,251,248,0.92)';
      ctx.fillRect(bx - 4, cy - 1, tw + 8, 17);
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(text, bx, cy);
      ctx.textAlign = 'center';
    };

    /* helper: arrowhead at (hx,hy) pointing in direction (dx,dy) */
    const arrowHead = (hx, hy, dx, dy, color, size = 7) => {
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      const px = -uy;
      const py = ux;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(hx - ux * size + px * size * 0.6, hy - uy * size + py * size * 0.6);
      ctx.lineTo(hx - ux * size - px * size * 0.6, hy - uy * size - py * size * 0.6);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    };

    /* ---- the ghost target (calibration only): start ring at A, flag at C.
       The subtrahend is hidden — no connecting arc — so finding "how far to
       jump" is the puzzle. */
    if (S.calib && S.target) {
      const gx = x(S.target.A);
      const fx = x(S.target.C);
      // ghost start ring
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(91,107,123,0.85)';
      ctx.beginPath();
      ctx.arc(gx, lineY, 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      chip('start', gx, lineY - 24, INK_SOFT, 'center');
      // ghost landing flag
      ctx.strokeStyle = 'rgba(91,107,123,0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(fx, lineY);
      ctx.lineTo(fx, lineY - 34);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(fx, lineY - 34);
      ctx.lineTo(fx + 15, lineY - 29);
      ctx.lineTo(fx, lineY - 24);
      ctx.closePath();
      ctx.fillStyle = 'rgba(91,107,123,0.35)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(91,107,123,0.85)';
      ctx.stroke();
      chip('land here', fx, lineY - 50, INK_SOFT, 'center');
    }

    /* ---- the backward jump (THE carmine centerpiece): a − b lands on c ----
       Drawn BELOW the line so it never collides with the counters above. */
    const drawArc = (fromN, toN, depth, color, width, dash, label) => {
      const x0 = x(fromN);
      const x1 = x(toN);
      const midX = (x0 + x1) / 2;
      ctx.save();
      ctx.lineWidth = width;
      ctx.strokeStyle = color;
      ctx.setLineDash(dash || []);
      ctx.beginPath();
      ctx.moveTo(x0, lineY);
      ctx.quadraticCurveTo(midX, lineY + depth, x1, lineY);
      ctx.stroke();
      ctx.setLineDash([]);
      // arrowhead at the landing end, tangent ≈ pointing toward x1 along the line
      arrowHead(x1, lineY, x1 - midX, -depth * 0.55, color, 7.5);
      if (label) {
        chip(label, midX, lineY + depth + 2, color, 'center');
      }
      ctx.restore();
    };

    if (B > 0) {
      const span = Math.abs(x(A) - x(C));
      // cap the depth so the "− b" label under the apex always clears the
      // bottom "hover" hint, even on the widest jump (a → 0).
      const depth = Math.min(Math.max(span * 0.42, 20), H - lineY - 50);
      if (S.showHops) {
        // count-back: b individual unit hops a → a−1 → … → c
        const hopDepth = Math.min(Math.max(u * 0.7, 14), H - lineY - 22);
        for (let k = A; k > C; k--) {
          drawArc(k, k - 1, hopDepth, CURVE, 2, null, null);
        }
        chip(`count back ${B}`, (x(A) + x(C)) / 2, lineY + hopDepth + 4, CURVE, 'center');
      } else {
        drawArc(A, C, depth, CURVE, 2.6, null, `${MINUS} ${B}`);
      }
    }

    /* ---- the forward CHECK arc (inverse): c + b = a, drawn ABOVE the line.
       Neutral/ink so carmine stays reserved for subtraction. */
    if (S.showCheck && B > 0) {
      const x0 = x(C);
      const x1 = x(A);
      const midX = (x0 + x1) / 2;
      const depth = Math.min(Math.max(Math.abs(x1 - x0) * 0.4, 18), counterY - 10);
      ctx.save();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(28,43,58,0.6)';
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(x0, lineY - counterR - 4);
      ctx.quadraticCurveTo(midX, lineY - counterR - 4 - depth, x1, lineY - counterR - 4);
      ctx.stroke();
      ctx.setLineDash([]);
      arrowHead(x1, lineY - counterR - 4, x1 - midX, depth * 0.55, 'rgba(28,43,58,0.6)', 7);
      chip(`+ ${B}`, midX, lineY - counterR - 6 - depth, INK, 'center');
      ctx.restore();
    }

    /* ---- start & landing markers on the line ---- */
    // start marker at a (neutral ring)
    ctx.lineWidth = 2;
    ctx.strokeStyle = INK;
    ctx.fillStyle = PAPER;
    ctx.beginPath();
    ctx.arc(x(A), lineY, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // landing marker at c (carmine filled) — the difference
    ctx.fillStyle = CURVE;
    ctx.beginPath();
    ctx.arc(x(C), lineY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = PAPER;
    ctx.stroke();

    /* ---- the animated count-back token (opt-in) ---- */
    const tx = tokenRef.current;
    if (tx != null) {
      const X = x(tx);
      ctx.save();
      ctx.fillStyle = CURVE;
      ctx.beginPath();
      ctx.arc(X, lineY, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = PAPER;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    /* ---- hover readout: highlight the whole number under the pointer ---- */
    const hv = hoverRef.current;
    if (hv != null && hv >= 0 && hv <= N) {
      const X = x(hv);
      ctx.save();
      ctx.strokeStyle = 'rgba(28,43,58,0.3)';
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(X, counterY - counterR - 6);
      ctx.lineTo(X, lineY);
      ctx.stroke();
      ctx.setLineDash([]);
      chip(String(hv), X, lineY - 22, INK, 'center');
      ctx.restore();
    }
  }, []);

  /* redraw whenever the state that affects the picture changes */
  useEffect(() => {
    draw();
  }, [min, sub, step, target, showHops, showCheck, draw]);

  /* redraw on resize (the stage is fluid) */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* hand a fresh target to the calibration step the first time we reach it */
  useEffect(() => {
    if (current.calib && !target) setTarget(makeTarget(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* count-back hops auto-appear on their step; the forward check arc on its step */
  useEffect(() => {
    if (step === HOPS_STEP) setShowHops(true);
    if (step === CHECK_STEP) setShowCheck(true);
  }, [step]);

  /* the count-back animation — time-based (dt), opt-in, respects reduced motion */
  useEffect(() => {
    if (!counting) {
      tokenRef.current = null;
      draw();
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
    const S = sceneRef.current;
    const from = S.a;
    const to = S.c;
    if (from === to) {
      setCounting(false);
      return;
    }
    let raf;
    let start = null;
    const DURATION = Math.max(600, (from - to) * 340); // ~0.34s per hop
    const loop = (now) => {
      if (start == null) start = now;
      const t = Math.min(1, (now - start) / DURATION);
      tokenRef.current = from - t * (from - to);
      draw();
      if (t < 1) raf = requestAnimationFrame(loop);
      else {
        tokenRef.current = null;
        setCounting(false);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [counting, draw]);

  /* ---- interaction handlers ---------------------------------------------- */
  const onParam = (key, value) => {
    const v = Math.round(parseFloat(value));
    if (key === 'min') {
      setMin(v);
      if (sub > v) setSub(v); // you cannot take away more than you have
    } else {
      setSub(Math.min(v, min)); // clamp: subtrahend ≤ minuend
    }
    if (counting) setCounting(false); // any dial move ends the count-back
  };

  const onPointerMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const padL = 34;
    const padR = 26;
    const frac = (cssX - padL) / (rect.width - padL - padR);
    hoverRef.current = Math.round(Math.max(0, Math.min(N, frac * N)));
    draw();
  };
  const onPointerLeave = () => {
    hoverRef.current = null;
    draw();
  };

  const resetDials = () => {
    setMin(START.min);
    setSub(START.sub);
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
    `Subtraction. ${a} minus ${b} equals ${c}. ` +
    `Start with ${a} counter${a === 1 ? '' : 's'}, take ${b} away, ${c} left. ` +
    `Check: ${c} plus ${b} equals ${a}.`;

  return (
    <div className="slab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Subtraction — Taking Away</h1>
        <p className="lede">
          Explore whole-number subtraction,{' '}
          <span className="mono">a&nbsp;−&nbsp;b&nbsp;=&nbsp;c</span>, within&nbsp;20. Counters ride
          the number line, so <em>taking&nbsp;away</em> and <em>counting&nbsp;back</em> become the
          same picture — then finish by finding a mystery take-away and checking it with addition.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              <span className="ink">{a}</span>
              &nbsp;{MINUS}&nbsp;
              <span className="ink">{b}</span>
              &nbsp;=&nbsp;
              <span className="ans">{c}</span>
            </p>
            <p className="equation-sub mono">
              check:&nbsp;{c}&nbsp;+&nbsp;{b}&nbsp;=&nbsp;{a}
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
            <span className="hint mono">hover the line to read a number</span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
            {calib && calibrated ? ' Calibrated — you matched the mystery take-away.' : ''}
          </p>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Minuend (start)</span>
              <span className="fact-v mono">{a}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Subtrahend (take away)</span>
              <span className="fact-v mono">{b}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Difference (left)</span>
              <span className="fact-v mono ans-text">{c}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Add-back check</span>
              <span className="fact-v mono">
                {c} + {b} = {a}
              </span>
            </div>
          </div>

          <div className="toolbar">
            <button
              type="button"
              className={'btn ghost' + (counting ? ' on' : '')}
              onClick={() => {
                setShowHops(true);
                setCounting((t) => !t);
              }}
              disabled={calib || c === a}
            >
              {counting ? 'Counting…' : 'Count back'}
            </button>
            <button
              type="button"
              className={'btn ghost' + (showHops && !calib ? ' on' : '')}
              onClick={() => setShowHops((t) => !t)}
              aria-pressed={showHops && !calib}
              disabled={calib}
            >
              {showHops ? 'Hide hops' : 'Show hops'}
            </button>
            <button
              type="button"
              className={'btn ghost' + (showCheck && !calib ? ' on' : '')}
              onClick={() => setShowCheck((t) => !t)}
              aria-pressed={showCheck && !calib}
              disabled={calib}
            >
              {showCheck ? 'Hide check' : 'Show + check'}
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
              const val = { min, sub }[d.key];
              const dmax = d.key === 'sub' ? min : d.max; // subtrahend clamped to minuend
              return (
                <label className={'dial' + (unlocked ? '' : ' locked')} key={d.key}>
                  <span className="dk">{d.label}</span>
                  <span className="drole">{unlocked ? d.role : 'unlocks soon'}</span>
                  <input
                    type="range"
                    min={d.min}
                    max={dmax}
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
                {current.choices.map((ch, i) => {
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
                      {ch}
                    </button>
                  );
                })}
              </div>
              {answered && <p className="feedback">{current.feedback}</p>}
            </div>
          )}

          {current.calib && target && (
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
                    start&nbsp;{target.A}&nbsp;·&nbsp;land&nbsp;{target.C}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setTarget(makeTarget(target))}
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
                  setShowHops(false);
                  setShowCheck(false);
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
        <span className="mono">a − b = c</span> &nbsp;·&nbsp; subtraction within 20, shown as
        take-away counters over a number line. Next lab: subtraction with regrouping (2.NBT).
      </footer>

      <style jsx>{`
        .slab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
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
          font-size: 22px;
          font-weight: 600;
          margin: 0;
          letter-spacing: 0.02em;
        }
        .equation .ink {
          color: var(--ink);
        }
        .equation .ans {
          color: var(--curve);
        }
        .equation-sub {
          color: var(--ink-soft);
          font-size: 12.5px;
          margin: 0;
        }
        .stage {
          position: relative;
          width: min(100%, 640px);
          aspect-ratio: 8 / 5;
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
        .ans-text {
          color: var(--curve);
          font-weight: 700;
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
          grid-template-columns: 22px 1fr 42px;
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
          font-size: 14px;
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
        :global(.slab) :focus-visible {
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
