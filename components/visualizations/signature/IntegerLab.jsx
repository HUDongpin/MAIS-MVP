'use client';

/* ============================================================================
   IntegerLab — an interactive "bench" for what an INTEGER really is: the whole
   numbers, their OPPOSITES, and zero, laid out on a number line that runs BOTH
   WAYS from 0:  … −3, −2, −1, 0, 1, 2, 3, …

   Built for MAIS (math AI system, www.mais.ac), K-12.  Where NumberLab teaches
   how a single whole number is built from place value, IntegerLab teaches the
   idea that turns "counting numbers" into "integers": the number line extends
   to the LEFT of zero into the negatives, every integer has an OPPOSITE the
   same distance from 0 on the other side, ABSOLUTE VALUE is that distance, and
   integers are ORDERED by position (farther right = greater — including the
   classic trap that −5 < −2).  This is the whole of CCSS 6.NS.C.5, 6.NS.C.6,
   and 6.NS.C.7, and the foundation for signed arithmetic, coordinates, and
   algebra.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   dials that unlock one per lesson step, predict-then-check questions, and a
   calibration challenge with a live match meter.

   The signature centerpiece is the "MIRROR AT ZERO": the focal integer A is a
   filled dot on the line; its OPPOSITE is drawn as a ghost dot reflected across
   a dashed mirror line at 0, joined by an arc labelled "opposite"; and the
   ABSOLUTE VALUE is a measured bracket from 0 out to A (with the equal span to
   its opposite shown faintly), so a child SEES that −4 and +4 are mirror images
   four units from zero.  A second point B introduces comparison, and a
   real-world CONTEXT re-skin (temperature / elevation / money) shows the very
   same line modelling "below zero", "below sea level", and "in debt" — the
   6.NS.C.5 idea that a negative names the opposite direction.

   One-accent discipline: the carmine accent is A — the integer under study —
   and its readout.  Distance (absolute value) is measured in green; the
   comparison companion B is a restrained blue; the opposite is a ghosted
   carmine so it reads as "the same object, mirrored".

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/IntegerLab.jsx
     2. Import and render it:
          import IntegerLab from './IntegerLab';
          export default function Page() { return <IntegerLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (a, b, step, …).
     MODEL  — the math is pure integer arithmetic; it knows nothing of pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 3 — World window.  A symmetric integer number line from −10 to 10.  The
   symmetry is the point: zero sits dead centre so a number and its opposite are
   true mirror images.
   ------------------------------------------------------------------------- */
const VMIN = -10;
const VMAX = 10;

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  Two integer points on the line.
     A — the focal integer (the star). Dial −10…10, unlocks at step 1.
     B — a comparison companion. Dial −10…10, unlocks at step 4.
   Starting on a NEGATIVE (−4) signals the theme immediately: integers include
   the numbers to the left of zero.
   ------------------------------------------------------------------------- */
const START_A = -4;
const START_B = 2;

const CONTEXT_STEP = 5; // real-world contexts unlock here
const CALIB_STEP = 6;

/* Progressive reveal — one idea per step (values are independent of whether a
   dial is yet editable, so stepping back cleanly hides later ideas). */
const showsOpposite = (s) => s >= 2;
const showsAbs = (s) => s >= 3;
const showsB = (s) => s >= 4 && s !== CALIB_STEP; // B is hidden during the game
const showsContext = (s) => s >= CONTEXT_STEP;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Integer arithmetic is exact; there is nothing to
   approximate.  These four functions ARE the mathematics the lab teaches.
   ------------------------------------------------------------------------- */
const opposite = (a) => (a === 0 ? 0 : -a); // normalise −0 → 0
const absValue = (a) => Math.abs(a);
const relation = (a, b) => (a < b ? '<' : a > b ? '>' : '='); // ordering by position
const signWord = (a) => (a > 0 ? 'positive' : a < 0 ? 'negative' : 'zero');

/* Display a signed integer with a proper Unicode minus (U+2212) for typography.
   Computation stays numeric; only the printed glyph changes. */
const fmt = (n) => (n < 0 ? '−' + Math.abs(n) : String(n));

/* Integer → words (−10…10 is plenty for this world). */
const ONES_W = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
];
const intWord = (n) => {
  if (n === 0) return 'zero';
  const w = ONES_W[Math.abs(n)] || String(Math.abs(n));
  return (n < 0 ? 'negative ' : '') + w;
};

/* ---------------------------------------------------------------------------
   Real-world CONTEXTS.  The SAME line re-skinned: a negative is the opposite
   direction from a chosen zero.  This is the 6.NS.C.5 idea made literal.
   ------------------------------------------------------------------------- */
const CONTEXTS = [
  { id: 'plain', name: 'Plain', zero: 'zero', left: 'negative', right: 'positive', unit: '', word: (n) => `${fmt(n)}` },
  {
    id: 'temp', name: 'Temperature', zero: 'freezing, 0°', left: 'colder', right: 'warmer', unit: '°C',
    word: (n) => (n === 0 ? '0° — freezing' : `${fmt(n)}° — ${absValue(n)}° ${n < 0 ? 'below' : 'above'} freezing`),
  },
  {
    id: 'elev', name: 'Elevation', zero: 'sea level', left: 'below sea level', right: 'above sea level', unit: ' ft',
    word: (n) => (n === 0 ? 'at sea level' : `${fmt(n)} ft — ${absValue(n)} ft ${n < 0 ? 'below' : 'above'} sea level`),
  },
  {
    id: 'money', name: 'Money', zero: 'break even', left: 'in debt (owe)', right: 'saved (have)', unit: '',
    word: (n) => (n === 0 ? 'break even' : n < 0 ? `owe $${absValue(n)}` : `have $${n}`),
  },
];
const ctxById = (id) => CONTEXTS.find((c) => c.id === id) || CONTEXTS[0];

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  A CONSTRUCTION GOAL (the skill's alternative to
   curve-matching): read a CLUE that names one integer, then move A to it.  Each
   clue exercises a lesson idea — opposite, opposite-of-the-opposite, absolute
   value, ordering, and real-world sign.  The meter reads "warmth" (how close),
   with a directional hint; CALIBRATED only when A lands exactly on the target.
   ------------------------------------------------------------------------- */
function makeRiddle(prev) {
  const R = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
  const build = () => {
    const kind = R(0, 8);
    const m = R(1, 10); // a magnitude 1…10
    const s = Math.random() < 0.5 ? -1 : 1;
    const g = s * m; // a signed given number
    switch (kind) {
      case 0:
        return { t: opposite(g), clue: `the opposite of ${fmt(g)}` };
      case 1:
        return { t: g, clue: `the opposite of the opposite of ${fmt(g)}` };
      case 2:
        return { t: -m, clue: `${m} units from zero, on the negative side` };
      case 3:
        return { t: m, clue: `${m} units from zero, on the positive side` };
      case 4:
        return { t: -m, clue: `a negative integer whose absolute value is ${m}` };
      case 5:
        return { t: -m, clue: `the temperature “${m} degrees below zero”` };
      case 6:
        return { t: -m, clue: `a diver “${m} feet below sea level”` };
      default: {
        // ordering — often both negative, to rehearse the −5 < −2 trap
        let p = R(VMIN, VMAX);
        let q = R(VMIN, VMAX);
        while (p === q) q = R(VMIN, VMAX);
        if (p > q) [p, q] = [q, p]; // now p < q
        return kind === 7
          ? { t: q, clue: `the greater of ${fmt(p)} and ${fmt(q)}` }
          : { t: p, clue: `the lesser of ${fmt(p)} and ${fmt(q)}` };
      }
    }
  };
  let r;
  do {
    r = build();
  } while (prev != null && r.t === prev.t); // fresh target each time
  return r;
}

const matchPercent = (a, t) => Math.max(0, Math.min(100, Math.round(100 - Math.abs(a - t) * 10)));
const isCalibrated = (a, t) => a === t;

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; the dial unlocks with the step; the
   reveal lives in `feedback`; distractors are real learner misconceptions
   ("−6 is to the right", "the opposite of −4 is −4", "|−8| = −8", "−5 > −2
   because 5 > 2", "below sea level is positive").  Next is gated on ANSWERED.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'What is an integer?',
    body:
      'An INTEGER is a whole amount and its OPPOSITE: the counting numbers 1, 2, 3, …, their ' +
      'negatives −1, −2, −3, …, and 0 in the middle. No pieces in between — fractions and decimals ' +
      'like ½ or 0.7 are not integers. The number line runs BOTH ways from 0. Right now A sits at ' +
      '−4 (read “negative four”). Step through to unlock it.',
    q: 'Which of these is an integer?',
    choices: ['−4', '2½', '0.7'],
    answer: 0,
    feedback:
      'Integers are whole amounts and their opposites: … −4, −3, −2, −1, 0, 1, 2, 3, … So −4 is an ' +
      'integer, but 2½ and 0.7 land BETWEEN the ticks, so they are not. Every integer sits exactly on ' +
      'a tick mark of the number line.',
  },
  {
    title: 'Positive, negative, and zero',
    body:
      'The SIGN tells you which DIRECTION from zero. Positive (+) means to the RIGHT of 0; negative ' +
      '(−) means to the LEFT. Zero is neither — it is the boundary between them. The A dial is live: ' +
      'drag it, or drag the dot along the line.',
    q: 'On the number line, where does −6 sit compared to 0?',
    choices: ['6 units to the LEFT of 0', '6 units to the RIGHT of 0', 'exactly at 0'],
    answer: 0,
    feedback:
      'The minus sign points LEFT: −6 is 6 units to the left of zero, so −6 is less than 0. Positive ' +
      'numbers sit to the right and are greater than 0. Zero itself is neither positive nor negative.',
  },
  {
    title: 'Opposites',
    body:
      'Every integer has an OPPOSITE: the same distance from 0, but on the other side. The opposite of ' +
      '4 is −4; the opposite of −4 is 4. Watch the ghost dot mirror A across the dashed line at 0. And ' +
      'the opposite of the opposite brings you home: −(−4) = 4.',
    q: 'What is the opposite of −4?',
    choices: ['4', '−4', '0'],
    answer: 0,
    feedback:
      'Opposite flips the sign, so the opposite of −4 is +4. They are mirror images across 0, each 4 ' +
      'units away. Taking the opposite twice, −(−4), lands back on 4. (Zero is its own opposite.)',
  },
  {
    title: 'Absolute value: distance from zero',
    body:
      'The ABSOLUTE VALUE of an integer, written |a|, is its DISTANCE from 0 — so it is never ' +
      'negative. The green bracket measures it. Because a number and its opposite are the same ' +
      'distance away, they share an absolute value: |−4| = 4 and |4| = 4.',
    q: 'What is |−8| — the absolute value of −8?',
    choices: ['8', '−8', '0'],
    answer: 0,
    feedback:
      'Absolute value is a DISTANCE, so it is always 0 or more: |−8| = 8, and |8| = 8 too. A number ' +
      'and its opposite always have the same absolute value. Only 0 has absolute value 0.',
  },
  {
    title: 'Comparing and ordering',
    body:
      'On the number line, the integer farther to the RIGHT is the GREATER one. The B dial unlocks so ' +
      'you can compare. Watch the trap with negatives: −5 is farther LEFT than −2, so −5 is actually ' +
      'the SMALLER number, even though “5 is bigger than 2”.',
    q: 'Which is greater, −5 or −2?',
    choices: ['−2', '−5', 'they are equal'],
    answer: 0,
    feedback:
      '−2 sits to the RIGHT of −5 (closer to zero), so −2 > −5. With negatives, the bigger the digits, ' +
      'the SMALLER the number — −2 is “warmer” than −5°. Position on the line, not the digit, decides ' +
      'order.',
  },
  {
    title: 'Integers in the real world',
    body:
      'The same line models many things — pick a context below. A negative just names the OPPOSITE ' +
      'direction from a chosen zero: below freezing, below sea level, money owed. Zero is the ' +
      'reference point everything is measured from.',
    q: '“A diver is 10 feet below sea level.” Which integer gives her position?',
    choices: ['−10', '10', '0'],
    answer: 0,
    feedback:
      'Below sea level is the negative direction, so −10 ft. Ten feet ABOVE would be +10 ft, and sea ' +
      'level itself is 0. Choosing where 0 is and which way is positive turns any up/down, ' +
      'gain/loss situation into integers.',
  },
  {
    title: 'Find the mystery integer',
    body:
      'Final challenge. Read the CLUE below, then move A — drag the dot or use the dial — to the ' +
      'integer it describes. The meter warms as you get close and points the way; land exactly on it ' +
      'for CALIBRATED. Press “New clue” for a fresh one.',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   EDIT 5 — Equation display.  The star integer, big and carmine, with its sign
   glyph coloured; beside it a green |a| chip, a muted opposite chip, and (once
   B is in play) a blue comparison chip.  Colour is the pedagogical link between
   symbol and picture.
   ------------------------------------------------------------------------- */
/* Styles are inlined here (not in the styled-jsx block) because these spans are
   rendered by a CHILD component; styled-jsx only scopes a component's own JSX,
   so inlining keeps the readout identical in Next.js and in any plain preview. */
const CHIP_BASE = {
  fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
  fontSize: '12.5px',
  fontWeight: 700,
  padding: '3px 8px',
  borderRadius: '999px',
  lineHeight: 1,
  whiteSpace: 'nowrap',
};
function IntegerEquation({ a, b, showOpp, showAbsChip, showCmp }) {
  return (
    <span
      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}
    >
      <span
        style={{
          fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
          fontVariantNumeric: 'tabular-nums',
          fontSize: '30px',
          fontWeight: 700,
          color: '#c81e4f',
          letterSpacing: '0.01em',
        }}
      >
        {fmt(a)}
      </span>
      {showAbsChip && (
        <span style={{ ...CHIP_BASE, color: '#2e8b6f', background: 'rgba(46,139,111,0.1)' }}>
          |{fmt(a)}| = {absValue(a)}
        </span>
      )}
      {showOpp && (
        <span style={{ ...CHIP_BASE, color: '#5b6b7b', background: 'rgba(91,107,123,0.1)' }}>
          opp {fmt(opposite(a))}
        </span>
      )}
      {showCmp && (
        <span style={{ ...CHIP_BASE, color: '#3f74a6', background: 'rgba(63,116,166,0.1)' }}>
          {fmt(a)} {relation(a, b)} {fmt(b)}
        </span>
      )}
    </span>
  );
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function IntegerLab() {
  const [a, setA] = useState(START_A);
  const [b, setB] = useState(START_B);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [riddle, setRiddle] = useState(null); // { t, clue }
  const [ctx, setCtx] = useState('plain');
  const [walking, setWalking] = useState(false);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const layoutRef = useRef(null); // number-line transform, written by draw()
  const draggingRef = useRef(null); // 'a' | 'b' | null
  const hoverRef = useRef(null); // 'a' | 'b' | null (pointer proximity)
  const walkRef = useRef(null); // animated units-from-0 during "Walk from 0"
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const aUnlocked = step >= 1;
  const bUnlocked = step >= 4;
  const showOpp = showsOpposite(step);
  const showAbs = showsAbs(step);
  const showB = showsB(step);
  const showCtx = showsContext(step);
  const C = ctxById(showCtx ? ctx : 'plain');

  // Snapshot everything the renderer / handlers need so the stable draw()
  // callback never reads stale values.
  sceneRef.current = {
    a, b, step, calib, aUnlocked, bUnlocked,
    showOpp, showAbs, showB, showCtx,
    ctx: C, walking,
  };

  const pct = riddle ? matchPercent(a, riddle.t) : 0;
  const calibrated = riddle ? isCalibrated(a, riddle.t) : false;
  const dirHint = riddle ? (a < riddle.t ? 'go higher →' : a > riddle.t ? '← go lower' : '') : '';
  sceneRef.current._cal = calib && riddle != null && calibrated;

  /* ---- integer → screen transform + full redraw from state --------------- */
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
    const g2 = canvas.getContext('2d');
    g2.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels

    /* palette (kept beside the CSS tokens) */
    const INK = '#1C2B3A';
    const INK_SOFT = '#5B6B7B';
    const CARMINE = '#C81E4F';
    const GREEN = '#2E8B6F';
    const BLUE = '#3F74A6';
    const OK = '#1F8A5B';

    const S = sceneRef.current;

    const padL = 42;
    const padR = 42;
    const yLine = Math.round(H * 0.47);
    const spanW = W - padL - padR;
    const X = (v) => padL + ((v - VMIN) / (VMAX - VMIN)) * spanW;
    const u = X(1) - X(0); // pixels per unit
    layoutRef.current = { padL, spanW, VMIN, VMAX, yLine, u };

    const rr = (x, y, w, h, rad) => {
      const t = Math.min(rad, w / 2, h / 2);
      g2.beginPath();
      g2.moveTo(x + t, y);
      g2.arcTo(x + w, y, x + w, y + h, t);
      g2.arcTo(x + w, y + h, x, y + h, t);
      g2.arcTo(x, y + h, x, y, t);
      g2.arcTo(x, y, x + w, y, t);
      g2.closePath();
    };

    g2.clearRect(0, 0, W, H);

    /* ---- sign regions: a whisper of cool (negative) / warm (positive) ------ */
    g2.fillStyle = 'rgba(63,116,166,0.05)';
    g2.fillRect(0, 0, X(0), H);
    g2.fillStyle = 'rgba(200,30,79,0.045)';
    g2.fillRect(X(0), 0, W - X(0), H);

    /* ---- quadrille paper: faint horizontal rules + integer-aligned verticals */
    g2.lineWidth = 1;
    g2.strokeStyle = 'rgba(199,216,228,0.45)';
    g2.beginPath();
    const gs = 28;
    for (let y = gs; y < H; y += gs) {
      g2.moveTo(0, Math.round(y) + 0.5);
      g2.lineTo(W, Math.round(y) + 0.5);
    }
    g2.stroke();
    g2.strokeStyle = 'rgba(199,216,228,0.7)';
    g2.beginPath();
    for (let v = VMIN; v <= VMAX; v++) {
      const x = Math.round(X(v)) + 0.5;
      g2.moveTo(x, 0);
      g2.lineTo(x, H);
    }
    g2.stroke();

    /* ---- the mirror line at zero (the fold that makes opposites) ----------- */
    g2.save();
    g2.strokeStyle = 'rgba(28,43,58,0.18)';
    g2.setLineDash([4, 5]);
    g2.lineWidth = 1.4;
    g2.beginPath();
    g2.moveTo(X(0), H * 0.06);
    g2.lineTo(X(0), H * 0.94);
    g2.stroke();
    g2.restore();

    /* ---- context caption (re-skin) ----------------------------------------- */
    if (S.showCtx && S.ctx.id !== 'plain') {
      const cap = `${S.ctx.name}:  0 = ${S.ctx.zero}   ← ${S.ctx.left}    ${S.ctx.right} →`;
      g2.save();
      g2.font = '600 11.5px ui-monospace, "SF Mono", Menlo, monospace';
      const tw = g2.measureText(cap).width;
      const bx = Math.max(8, (W - tw) / 2 - 8);
      g2.fillStyle = 'rgba(251,251,248,0.9)';
      rr(bx, 8, Math.min(W - 16, tw + 16), 22, 6);
      g2.fill();
      g2.strokeStyle = 'rgba(28,43,58,0.12)';
      g2.lineWidth = 1;
      g2.stroke();
      g2.fillStyle = INK_SOFT;
      g2.textAlign = 'left';
      g2.textBaseline = 'middle';
      g2.fillText(cap, bx + 8, 19);
      g2.restore();
    }

    /* ---- the number line: baseline with end arrows, ticks, labels ---------- */
    const xL = X(VMIN) - 12;
    const xR = X(VMAX) + 12;
    g2.strokeStyle = 'rgba(28,43,58,0.78)';
    g2.lineWidth = 2;
    g2.beginPath();
    g2.moveTo(xL, yLine + 0.5);
    g2.lineTo(xR, yLine + 0.5);
    g2.stroke();
    // arrowheads (the line goes on forever both ways)
    g2.fillStyle = 'rgba(28,43,58,0.78)';
    const arrow = (x, dir) => {
      g2.beginPath();
      g2.moveTo(x, yLine);
      g2.lineTo(x - dir * 8, yLine - 4.5);
      g2.lineTo(x - dir * 8, yLine + 4.5);
      g2.closePath();
      g2.fill();
    };
    arrow(xL, -1);
    arrow(xR, 1);

    // adaptive label density (every integer when there's room, else fewer)
    const labelStep = u >= 26 ? 1 : u >= 16 ? 2 : 5;
    const showLabel = (v) => {
      if (v === 0) return true;
      if (v % 5 === 0) return true;
      if (labelStep === 1) return true;
      if (labelStep === 2) return v % 2 === 0;
      return false;
    };
    g2.textAlign = 'center';
    g2.textBaseline = 'top';
    for (let v = VMIN; v <= VMAX; v++) {
      const x = X(v);
      const major = v % 5 === 0;
      const zero = v === 0;
      g2.strokeStyle = zero ? 'rgba(28,43,58,0.85)' : 'rgba(28,43,58,0.55)';
      g2.lineWidth = zero ? 2.4 : major ? 2 : 1;
      g2.beginPath();
      g2.moveTo(x + (major || zero ? 0 : 0.5), yLine - (zero ? 9 : major ? 8 : 5));
      g2.lineTo(x + (major || zero ? 0 : 0.5), yLine + (zero ? 9 : major ? 8 : 5));
      g2.stroke();
      if (showLabel(v)) {
        g2.font = (zero ? '700 ' : major ? '600 ' : '') + '11px ui-monospace, "SF Mono", Menlo, monospace';
        g2.fillStyle = zero ? INK : major ? INK : INK_SOFT;
        g2.fillText(fmt(v), x, yLine + 12);
      }
    }

    const A = S.a;
    const B = S.b;
    const opp = opposite(A);

    /* ---- opposite arc + ghost dot (the mirror) ----------------------------- */
    if (S.showOpp && A !== 0) {
      const xa = X(A);
      const xo = X(opp);
      const apexY = Math.max(12, H * 0.1);
      g2.save();
      g2.strokeStyle = 'rgba(200,30,79,0.5)';
      g2.setLineDash([5, 4]);
      g2.lineWidth = 1.6;
      g2.beginPath();
      g2.moveTo(xa, yLine - 12);
      g2.bezierCurveTo(xa, apexY, xo, apexY, xo, yLine - 12);
      g2.stroke();
      g2.restore();
      // "opposite" label at the arc apex
      g2.save();
      g2.fillStyle = 'rgba(200,30,79,0.82)';
      g2.font = '600 11px ui-monospace, Menlo, monospace';
      g2.textAlign = 'center';
      g2.textBaseline = 'bottom';
      g2.fillText('opposite', (xa + xo) / 2, apexY + 2);
      g2.restore();
      // ghost dot at the opposite
      g2.save();
      g2.beginPath();
      g2.arc(xo, yLine, 6.5, 0, Math.PI * 2);
      g2.fillStyle = 'rgba(200,30,79,0.12)';
      g2.fill();
      g2.strokeStyle = 'rgba(200,30,79,0.7)';
      g2.setLineDash([3, 3]);
      g2.lineWidth = 1.6;
      g2.stroke();
      g2.setLineDash([]);
      g2.fillStyle = 'rgba(200,30,79,0.85)';
      g2.font = '700 11px ui-monospace, Menlo, monospace';
      g2.textAlign = 'center';
      g2.textBaseline = 'top';
      g2.fillText(fmt(opp), xo, yLine + 26);
      g2.restore();
    } else if (S.showOpp && A === 0) {
      g2.save();
      g2.fillStyle = INK_SOFT;
      g2.font = 'italic 600 11px ui-monospace, Menlo, monospace';
      g2.textAlign = 'center';
      g2.textBaseline = 'bottom';
      g2.fillText('0 is its own opposite', X(0), Math.max(12, H * 0.1) + 2);
      g2.restore();
    }

    /* ---- absolute-value bracket (distance from 0) -------------------------- */
    if (S.showAbs) {
      const yB = yLine + 38;
      const drawBracket = (v0, v1, color, alpha, label) => {
        if (v0 === v1) return;
        const x0 = X(Math.min(v0, v1));
        const x1 = X(Math.max(v0, v1));
        g2.save();
        g2.strokeStyle = color;
        g2.globalAlpha = alpha;
        g2.lineWidth = 2;
        g2.beginPath();
        g2.moveTo(x0, yB - 5);
        g2.lineTo(x0, yB);
        g2.lineTo(x1, yB);
        g2.lineTo(x1, yB - 5);
        g2.stroke();
        if (label) {
          g2.globalAlpha = 1;
          g2.fillStyle = color;
          g2.font = '700 12px ui-monospace, Menlo, monospace';
          g2.textAlign = 'center';
          g2.textBaseline = 'top';
          g2.fillText(label, (x0 + x1) / 2, yB + 3);
        }
        g2.restore();
      };
      // faint equal span on the opposite side (shows the two distances match)
      if (S.showOpp && A !== 0) drawBracket(0, opp, GREEN, 0.28, null);
      if (A === 0) {
        g2.save();
        g2.fillStyle = GREEN;
        g2.font = '700 12px ui-monospace, Menlo, monospace';
        g2.textAlign = 'center';
        g2.textBaseline = 'top';
        g2.fillText('|0| = 0', X(0), yB + 3);
        g2.restore();
      } else {
        drawBracket(0, A, GREEN, 1, `|${fmt(A)}| = ${absValue(A)}`);
      }
    }

    /* ---- comparison companion B + order readout ---------------------------- */
    if (S.showB) {
      const xb = X(B);
      const rel = relation(A, B);
      const xa = X(A);
      // A span annotation ABOVE the value flags: a bracket over the two points
      // with an arrow toward the greater (farther-right) one, and the inequality
      // centred above it.  Sitting above the flags keeps it clear of them.
      if (A !== B) {
        const flagTop = Math.max(H * 0.14 + 6, yLine - 48);
        const yCmp = Math.max(38, flagTop - 15);
        const xLo = Math.min(xa, xb);
        const xHi = Math.max(xa, xb);
        const xg = A > B ? xa : xb; // greater point's x
        g2.save();
        g2.strokeStyle = 'rgba(63,116,166,0.6)';
        g2.lineWidth = 1.4;
        g2.setLineDash([4, 4]);
        g2.beginPath();
        g2.moveTo(xLo, yCmp + 6);
        g2.lineTo(xLo, yCmp);
        g2.lineTo(xHi, yCmp);
        g2.lineTo(xHi, yCmp + 6);
        g2.stroke();
        g2.setLineDash([]);
        // arrowhead at the greater end, pointing down toward that point
        g2.fillStyle = 'rgba(63,116,166,0.8)';
        g2.beginPath();
        g2.moveTo(xg, yCmp + 10);
        g2.lineTo(xg - 4, yCmp + 3);
        g2.lineTo(xg + 4, yCmp + 3);
        g2.closePath();
        g2.fill();
        // the inequality, centred and clamped inside the stage
        g2.fillStyle = INK_SOFT;
        g2.font = '700 12px ui-monospace, Menlo, monospace';
        g2.textAlign = 'center';
        g2.textBaseline = 'bottom';
        const label = `${fmt(A)} ${rel} ${fmt(B)}`;
        const half = g2.measureText(label).width / 2 + 2;
        const tx = Math.max(half, Math.min(W - half, (xa + xb) / 2));
        g2.fillText(label, tx, yCmp - 3);
        g2.restore();
      }
      // B dot + flag (below the line)
      const hoverB = S.showB && hoverRef.current === 'b';
      g2.save();
      g2.beginPath();
      g2.arc(xb, yLine, hoverB || draggingRef.current === 'b' ? 8 : 6.5, 0, Math.PI * 2);
      g2.fillStyle = BLUE;
      g2.fill();
      g2.strokeStyle = '#fff';
      g2.lineWidth = 1.6;
      g2.stroke();
      // flag
      const bLabel = `B  ${fmt(B)}`;
      g2.font = '700 12px ui-monospace, Menlo, monospace';
      const bw = g2.measureText(bLabel).width + 14;
      const byF = yLine + 54;
      const bx = Math.max(2, Math.min(W - bw - 2, xb - bw / 2));
      g2.fillStyle = BLUE;
      rr(bx, byF, bw, 20, 6);
      g2.fill();
      g2.fillStyle = '#fff';
      g2.textAlign = 'center';
      g2.textBaseline = 'middle';
      g2.fillText(bLabel, bx + bw / 2, byF + 10);
      g2.restore();
    }

    /* ---- the star: point A with a value flag above (on top of everything) -- */
    {
      const xa = X(A);
      const hoverA = hoverRef.current === 'a';
      const flagText = `A  ${fmt(A)}`;
      g2.save();
      g2.font = '700 13px ui-monospace, Menlo, monospace';
      const fw = g2.measureText(flagText).width + 16;
      const flagY = Math.max(H * 0.14 + 6, yLine - 48);
      const fx = Math.max(2, Math.min(W - fw - 2, xa - fw / 2));
      // stem
      g2.strokeStyle = CARMINE;
      g2.lineWidth = 1.6;
      g2.beginPath();
      g2.moveTo(xa, flagY + 22);
      g2.lineTo(xa, yLine);
      g2.stroke();
      // flag body
      g2.fillStyle = CARMINE;
      rr(fx, flagY, fw, 22, 6);
      g2.fill();
      // pointer
      g2.beginPath();
      g2.moveTo(xa, flagY + 28);
      g2.lineTo(xa - 5, flagY + 22);
      g2.lineTo(xa + 5, flagY + 22);
      g2.closePath();
      g2.fill();
      g2.fillStyle = '#fff';
      g2.textAlign = 'center';
      g2.textBaseline = 'middle';
      g2.fillText(flagText, fx + fw / 2, flagY + 11);
      // the dot
      g2.beginPath();
      g2.arc(xa, yLine, hoverA || draggingRef.current === 'a' ? 9 : 7.5, 0, Math.PI * 2);
      g2.fillStyle = CARMINE;
      g2.fill();
      g2.strokeStyle = '#fff';
      g2.lineWidth = 2;
      g2.stroke();
      g2.restore();
    }

    /* ---- walk-from-zero token (opt-in animation) --------------------------- */
    if (S.walking && walkRef.current != null) {
      const uv = walkRef.current; // signed units travelled from 0
      const xw = X(uv);
      const done = Math.min(absValue(A), Math.floor(Math.abs(uv) + 1e-9));
      // footsteps at each integer passed
      g2.save();
      g2.fillStyle = 'rgba(28,43,58,0.35)';
      const dir = A < 0 ? -1 : 1;
      for (let k = 1; k <= done; k++) {
        const xf = X(dir * k);
        g2.beginPath();
        g2.arc(xf, yLine, 3, 0, Math.PI * 2);
        g2.fill();
      }
      // the walker
      g2.beginPath();
      g2.arc(xw, yLine, 6, 0, Math.PI * 2);
      g2.fillStyle = INK;
      g2.fill();
      g2.strokeStyle = '#fff';
      g2.lineWidth = 1.5;
      g2.stroke();
      // running distance label
      g2.fillStyle = INK;
      g2.font = '700 12px ui-monospace, Menlo, monospace';
      g2.textAlign = 'center';
      g2.textBaseline = 'bottom';
      g2.fillText(`${done} ${done === 1 ? 'unit' : 'units'}`, xw, yLine - 12);
      g2.restore();
    }

    /* ---- calibrated stamp -------------------------------------------------- */
    if (S._cal) {
      g2.save();
      g2.translate(W / 2, H * 0.8);
      g2.rotate(-0.05);
      g2.fillStyle = 'rgba(31,138,91,0.10)';
      rr(-70, -16, 140, 32, 7);
      g2.fill();
      g2.strokeStyle = OK;
      g2.lineWidth = 2;
      rr(-70, -16, 140, 32, 7);
      g2.stroke();
      g2.fillStyle = OK;
      g2.font = '700 14px ui-monospace, Menlo, monospace';
      g2.textAlign = 'center';
      g2.textBaseline = 'middle';
      g2.fillText('✓ CALIBRATED', 0, 0.5);
      g2.restore();
    }
  }, []);

  /* redraw whenever the picture-affecting state changes */
  useEffect(() => {
    draw();
  }, [a, b, step, ctx, riddle, walking, draw]);

  /* redraw on resize (the canvas is fluid) */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* hand a riddle to the calibration step the first time we reach it; clear A to
     0 so it starts plainly un-matched. */
  useEffect(() => {
    if (current.calib && riddle == null) {
      setRiddle(makeRiddle(null));
      setA(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* "Walk from 0" — a token steps from 0 out to A, one unit at a time.  Time-
     based, opt-in, and respectful of reduced motion. */
  useEffect(() => {
    if (!walking) {
      walkRef.current = null;
      draw();
      return;
    }
    const dist = absValue(sceneRef.current.a);
    if (dist === 0) {
      setWalking(false);
      return;
    }
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setWalking(false);
      return;
    }
    const dir = sceneRef.current.a < 0 ? -1 : 1;
    const perStep = 260; // ms per unit
    const total = dist * perStep;
    let raf;
    let start = null;
    const loop = (now) => {
      if (start == null) start = now;
      const t = Math.min(1, (now - start) / total);
      walkRef.current = dir * dist * t;
      draw();
      if (t < 1) raf = requestAnimationFrame(loop);
      else {
        walkRef.current = dir * dist;
        draw();
        setWalking(false);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [walking, draw]);

  /* ---- interaction: drag the dots along the line ------------------------- */
  const clampInt = (v) => Math.max(VMIN, Math.min(VMAX, v));
  const vAtX = (cssX) => {
    const L = layoutRef.current;
    if (!L) return 0;
    return clampInt(Math.round(L.VMIN + ((cssX - L.padL) / L.spanW) * (L.VMAX - L.VMIN)));
  };
  const screenX = (v) => {
    const L = layoutRef.current;
    if (!L) return 0;
    return L.padL + ((v - L.VMIN) / (L.VMAX - L.VMIN)) * L.spanW;
  };

  const onPointerDown = (e) => {
    const S = sceneRef.current;
    if (!S.aUnlocked) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const dxA = Math.abs(cssX - screenX(S.a));
    const dxB = S.showB ? Math.abs(cssX - screenX(S.b)) : Infinity;
    // Grab B only when it is genuinely the closer handle; otherwise A follows
    // the pointer (click-to-place), which makes the calibration game fluid.
    const pick = dxB < dxA && dxB < 26 ? 'b' : 'a';
    draggingRef.current = pick;
    if (walking) setWalking(false);
    const v = vAtX(cssX);
    if (pick === 'a') setA(v);
    else setB(v);
    if (e.currentTarget.setPointerCapture) {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
  };
  const onPointerMove = (e) => {
    const S = sceneRef.current;
    const rect = e.currentTarget.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    if (draggingRef.current) {
      const v = vAtX(cssX);
      if (draggingRef.current === 'a' && v !== S.a) setA(v);
      else if (draggingRef.current === 'b' && v !== S.b) setB(v);
      return;
    }
    // hover: enlarge the nearest grabbable dot
    if (!S.aUnlocked) return;
    const dxA = Math.abs(cssX - screenX(S.a));
    const dxB = S.showB ? Math.abs(cssX - screenX(S.b)) : Infinity;
    let hit = null;
    if (Math.min(dxA, dxB) < 18) hit = dxB < dxA ? 'b' : 'a';
    if (hit !== hoverRef.current) {
      hoverRef.current = hit;
      draw();
    }
  };
  const endDrag = () => {
    if (draggingRef.current) draggingRef.current = null;
  };
  const onPointerLeave = () => {
    endDrag();
    if (hoverRef.current) {
      hoverRef.current = null;
      draw();
    }
  };

  /* ---- other handlers ---------------------------------------------------- */
  const choose = (idx) => {
    if (answers[step] != null) return; // lock the answer once given
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const resetPoints = () => {
    if (walking) setWalking(false);
    if (calib) setA(0);
    else {
      setA(START_A);
      setB(START_B);
    }
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* spoken description (accessibility) */
  const parts = [`The integer A is ${intWord(a)}.`];
  if (showOpp) parts.push(`Its opposite is ${intWord(opposite(a))}.`);
  if (showAbs) parts.push(`Its absolute value, the distance from zero, is ${absValue(a)}.`);
  if (showB) {
    const rw = relation(a, b) === '<' ? 'less than' : relation(a, b) === '>' ? 'greater than' : 'equal to';
    parts.push(`A is ${rw} B, which is ${intWord(b)}.`);
  }
  if (showCtx && C.id !== 'plain') parts.push(`In context, A is ${C.word(a)}.`);
  const spoken = parts.join(' ');

  return (
    <div className="ilab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Integers: Both Ways from Zero</h1>
        <p className="lede">
          An integer is a whole amount <em>and its opposite</em>: <span className="mono">… −3 −2 −1
          0 1 2 3 …</span>. Slide along the number line to explore the <em>sign</em> (which side of
          zero), <em>opposites</em> (mirror images across 0), <em>absolute value</em> (distance from
          0), and how integers are <em>ordered</em> — then read them as temperatures, elevations, and
          money.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              <IntegerEquation a={a} b={b} showOpp={showOpp} showAbsChip={showAbs} showCmp={showB} />
            </p>
            <p className="equation-sub mono">{showCtx && C.id !== 'plain' ? C.word(a) : intWord(a)}</p>
          </div>

          <div
            className="stage"
            ref={stageRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onPointerLeave={onPointerLeave}
            role="img"
            aria-label={spoken}
          >
            <canvas ref={canvasRef} />
            <span className="hint mono">
              {aUnlocked ? 'drag the dots, or use the dials' : 'unlock A to begin →'}
            </span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
            {calib && calibrated ? ' Calibrated — you found the mystery integer.' : ''}
          </p>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Sign</span>
              <span className="fact-v">
                {a === 0 ? 'zero (neither)' : signWord(a)}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Opposite</span>
              <span className="fact-v mono">{showOpp ? fmt(opposite(a)) : '—'}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Absolute value</span>
              <span className="fact-v mono">{showAbs ? `|${fmt(a)}| = ${absValue(a)}` : '—'}</span>
            </div>
            <div className="fact">
              <span className="fact-k">A compared to B</span>
              <span className="fact-v mono">{showB ? `${fmt(a)} ${relation(a, b)} ${fmt(b)}` : '—'}</span>
            </div>
          </div>

          <div className="toolbar">
            <button
              type="button"
              className={'btn ghost' + (walking ? ' on' : '')}
              onClick={() => setWalking((w) => !w)}
              disabled={!aUnlocked || a === 0}
              title="Step from 0 out to A, counting units"
            >
              {walking ? 'Walking…' : 'Walk from 0'}
            </button>
            {showCtx && (
              <div className="ctx-group" role="group" aria-label="Real-world context">
                {CONTEXTS.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    className={'chipbtn' + (ctx === c.id ? ' on' : '')}
                    aria-pressed={ctx === c.id}
                    onClick={() => setCtx(c.id)}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
            <button type="button" className="btn ghost" onClick={resetPoints}>
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
            <label className={'dial' + (aUnlocked ? '' : ' locked')}>
              <span className="dk" style={{ color: '#c81e4f' }}>
                A
              </span>
              <span className="drole">{aUnlocked ? 'the focal integer' : 'unlocks at step 2'}</span>
              <input
                type="range"
                min={VMIN}
                max={VMAX}
                step={1}
                value={a}
                disabled={!aUnlocked}
                aria-label="Integer A"
                onChange={(e) => {
                  if (walking) setWalking(false);
                  setA(parseInt(e.target.value, 10));
                }}
                style={{ accentColor: '#c81e4f' }}
              />
              <output className="dv" style={aUnlocked ? { color: '#c81e4f' } : undefined}>
                {aUnlocked ? fmt(a) : '🔒'}
              </output>
            </label>

            <label className={'dial' + (bUnlocked && !calib ? '' : ' locked')}>
              <span className="dk" style={{ color: '#3f74a6' }}>
                B
              </span>
              <span className="drole">
                {calib ? 'set aside for the challenge' : bUnlocked ? 'compare with A' : 'unlocks at step 5'}
              </span>
              <input
                type="range"
                min={VMIN}
                max={VMAX}
                step={1}
                value={b}
                disabled={!bUnlocked || calib}
                aria-label="Integer B"
                onChange={(e) => setB(parseInt(e.target.value, 10))}
                style={{ accentColor: '#3f74a6' }}
              />
              <output className="dv" style={bUnlocked && !calib ? { color: '#3f74a6' } : undefined}>
                {bUnlocked && !calib ? fmt(b) : '🔒'}
              </output>
            </label>
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

          {current.calib && riddle != null && (
            <div className="calib">
              <div className="clue-card">
                <span className="clue-k">Move A to…</span>
                <span className="clue-text">{riddle.clue}</span>
              </div>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">warmth&nbsp;{pct}%</span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono dir-hint">{dirHint || `A = ${fmt(a)}`}</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setRiddle(makeRiddle(riddle));
                  setA(0);
                }}
              >
                New clue
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
                  setRiddle(null);
                  setCtx('plain');
                  setWalking(false);
                  setA(START_A);
                  setB(START_B);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">… −3 −2 −1 0 1 2 3 …</span> &nbsp;·&nbsp; integers on the number line —
        sign, opposites, absolute value, and order (CCSS 6.NS.C.5, 6.NS.C.6, 6.NS.C.7).
      </footer>

      <style jsx>{`
        .ilab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --abs: #2e8b6f;
          --bcol: #3f74a6;
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
          max-width: 74ch;
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
          margin: 0;
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
          cursor: grab;
          background: linear-gradient(180deg, #fdfefe 0%, #f4f7f9 100%);
        }
        .stage:active {
          cursor: grabbing;
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
        /* A number line is wide but its annotations (opposite arc, brackets,
           flags) need vertical room; on a phone the 8:5 box gets too short, so
           give the stage a taller ratio there to keep everything uncrowded. */
        @media (max-width: 560px) {
          .stage {
            aspect-ratio: 6 / 5;
          }
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
          text-transform: capitalize;
        }
        .fact-v.mono {
          text-transform: none;
        }
        .toolbar {
          margin: 12px 4px 2px;
          display: flex;
          gap: 9px;
          flex-wrap: wrap;
          align-items: center;
        }
        .ctx-group {
          display: inline-flex;
          gap: 4px;
          flex-wrap: wrap;
        }
        .chipbtn {
          font: 600 12px/1 system-ui, sans-serif;
          padding: 7px 10px;
          border-radius: 999px;
          cursor: pointer;
          border: 1px solid rgba(28, 43, 58, 0.2);
          background: var(--paper);
          color: var(--ink-soft);
          transition: background 0.15s, color 0.15s, border-color 0.15s;
        }
        .chipbtn.on {
          background: var(--ink);
          border-color: var(--ink);
          color: #fff;
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
          grid-template-columns: 30px 1fr 42px;
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
          font-weight: 700;
          font-size: 18px;
        }
        .drole {
          grid-column: 2 / 4;
          font-size: 11px;
          color: var(--ink-soft);
        }
        .dial input[type='range'] {
          grid-column: 2;
          width: 100%;
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
          font-size: 17px;
          font-weight: 700;
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
        .clue-card {
          display: flex;
          flex-direction: column;
          gap: 3px;
          padding: 10px 12px;
          border: 1px solid rgba(28, 43, 58, 0.16);
          border-radius: 8px;
          background: rgba(63, 116, 166, 0.06);
        }
        .clue-k {
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .clue-text {
          font-family: var(--serif);
          font-size: 18px;
          font-weight: 600;
          color: var(--ink);
        }
        .meter {
          height: 12px;
          border-radius: 6px;
          background: rgba(28, 43, 58, 0.1);
          overflow: hidden;
        }
        .meter-fill {
          height: 100%;
          background: linear-gradient(90deg, rgba(200, 30, 79, 0.5), var(--curve));
          transition: width 0.12s ease-out;
        }
        .meter-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
        }
        .dir-hint {
          color: var(--ink-soft);
          font-size: 12.5px;
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
        :global(.ilab) :focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 2px;
          border-radius: 4px;
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
